import * as THREE from 'three';

interface WhiteboardConfig {
  // 3D corners of the whiteboard (in world space)
  topLeft: THREE.Vector3;
  topRight: THREE.Vector3;
  bottomRight: THREE.Vector3;
  bottomLeft: THREE.Vector3;
  // Canvas resolution
  width: number;
  height: number;
}

export class Whiteboard {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private texture: THREE.CanvasTexture;
  private mesh: THREE.Mesh;
  private config: WhiteboardConfig;

  // Content state
  private lines: { text: string; color: string; size: number; y: number }[] = [];
  private currentY: number = 60;

  constructor(scene: THREE.Scene, config?: Partial<WhiteboardConfig>) {
    // Default config based on picked coordinates
    // Corner 1: bottom-left (low Y, more negative Z)
    // Corner 2: top-left (high Y, more negative Z)
    // Corner 3: top-right (high Y, less negative Z)
    // Corner 4: bottom-right (low Y, less negative Z)
    this.config = {
      topLeft: new THREE.Vector3(5.225, 16.281, -8.129),
      topRight: new THREE.Vector3(5.225, 16.285, -4.987),
      bottomRight: new THREE.Vector3(5.225, 14.577, -4.974),
      bottomLeft: new THREE.Vector3(5.235, 14.586, -8.127),
      width: 1024,
      height: 512,
      ...config
    };

    // Create offscreen canvas
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.config.width;
    this.canvas.height = this.config.height;

    const ctx = this.canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D canvas context');
    }
    this.ctx = ctx;

    // Create THREE.js texture from canvas
    this.texture = new THREE.CanvasTexture(this.canvas);

    // Initialize with white background (after texture is created)
    this.clear();

    // The whiteboard is on a wall at X ~5.225
    // Width spans Z axis: -8.13 to -4.97 = ~3.14 units
    // Height spans Y axis: 14.58 to 16.28 = ~1.7 units
    const boardWidth = Math.abs(this.config.topRight.z - this.config.topLeft.z);
    const boardHeight = Math.abs(this.config.topLeft.y - this.config.bottomLeft.y);

    // Create plane geometry (width along Z, height along Y)
    const geometry = new THREE.PlaneGeometry(boardWidth, boardHeight);

    // Create material with the canvas texture
    const material = new THREE.MeshBasicMaterial({
      map: this.texture,
      side: THREE.DoubleSide
    });

    this.mesh = new THREE.Mesh(geometry, material);

    // Position at center of whiteboard
    const centerX = 5.225;
    const centerY = (this.config.topLeft.y + this.config.bottomLeft.y) / 2;
    const centerZ = (this.config.topLeft.z + this.config.topRight.z) / 2;
    this.mesh.position.set(centerX, centerY, centerZ);

    // Rotate to face -X direction (into the room)
    this.mesh.rotation.y = -Math.PI / 2;

    scene.add(this.mesh);
    console.log('Whiteboard created at', this.mesh.position, 'size:', boardWidth.toFixed(2), 'x', boardHeight.toFixed(2));
  }

  clear(): void {
    // White background
    this.ctx.fillStyle = '#f5f5f0';
    this.ctx.fillRect(0, 0, this.config.width, this.config.height);

    // Draw border
    this.ctx.strokeStyle = '#111';
    this.ctx.lineWidth = 4;
    this.ctx.strokeRect(2, 2, this.config.width - 4, this.config.height - 4);

    // Draw title
    this.ctx.fillStyle = '#000';
    this.ctx.font = 'bold 48px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('CRISIS PLAN', this.config.width / 2, 55);

    // Draw line under title
    this.ctx.strokeStyle = '#333';
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.moveTo(50, 75);
    this.ctx.lineTo(this.config.width - 50, 75);
    this.ctx.stroke();

    this.lines = [];
    this.currentY = 110;
    this.texture.needsUpdate = true;
  }

  // Write a line of text
  writeLine(text: string, color: string = '#000', size: number = 32): void {
    this.ctx.fillStyle = color;
    this.ctx.font = `bold ${size}px Arial`;
    this.ctx.textAlign = 'left';
    this.ctx.fillText(text, 30, this.currentY);

    this.lines.push({ text, color, size, y: this.currentY });
    this.currentY += size + 10;

    // Scroll if needed
    if (this.currentY > this.config.height - 30) {
      this.redrawWithScroll();
    }

    this.texture.needsUpdate = true;
  }

  // Write a bullet point
  writeBullet(text: string, color: string = '#000'): void {
    this.writeLine(`• ${text}`, color, 30);
  }

  // Write a header
  writeHeader(text: string, color: string = '#8b0000'): void {
    this.currentY += 15; // Extra spacing before header
    this.ctx.fillStyle = color;
    this.ctx.font = 'bold 36px Arial';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(text, 30, this.currentY);

    this.lines.push({ text, color, size: 36, y: this.currentY });
    this.currentY += 50;
    this.texture.needsUpdate = true;
  }

  // Cross out a line (strikethrough)
  crossOut(lineIndex: number): void {
    if (lineIndex < 0 || lineIndex >= this.lines.length) return;

    const line = this.lines[lineIndex];
    this.ctx.strokeStyle = '#c00';
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();

    const textWidth = this.ctx.measureText(line.text).width;
    this.ctx.moveTo(25, line.y - line.size / 3);
    this.ctx.lineTo(35 + textWidth, line.y - line.size / 3);
    this.ctx.stroke();

    this.texture.needsUpdate = true;
  }

  // Draw a box around important text
  highlight(lineIndex: number, color: string = '#ff0'): void {
    if (lineIndex < 0 || lineIndex >= this.lines.length) return;

    const line = this.lines[lineIndex];
    this.ctx.font = `${line.size}px Arial`;
    const textWidth = this.ctx.measureText(line.text).width;

    this.ctx.fillStyle = color;
    this.ctx.globalAlpha = 0.3;
    this.ctx.fillRect(25, line.y - line.size, textWidth + 15, line.size + 8);
    this.ctx.globalAlpha = 1.0;

    this.texture.needsUpdate = true;
  }

  // Add a checkmark next to a line
  checkmark(lineIndex: number): void {
    if (lineIndex < 0 || lineIndex >= this.lines.length) return;

    const line = this.lines[lineIndex];
    this.ctx.fillStyle = '#0a0';
    this.ctx.font = 'bold 28px Arial';
    this.ctx.fillText('✓', 8, line.y);

    this.texture.needsUpdate = true;
  }

  // Draw connecting arrow between two Y positions
  drawArrow(fromY: number, toY: number): void {
    const x = this.config.width - 40;

    this.ctx.strokeStyle = '#00f';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(x, fromY);
    this.ctx.lineTo(x, toY - 10);
    this.ctx.stroke();

    // Arrow head
    this.ctx.beginPath();
    this.ctx.moveTo(x - 5, toY - 15);
    this.ctx.lineTo(x, toY - 5);
    this.ctx.lineTo(x + 5, toY - 15);
    this.ctx.stroke();

    this.texture.needsUpdate = true;
  }

  // Redraw with scroll effect when content overflows
  private redrawWithScroll(): void {
    // Shift everything up
    const scrollAmount = 60;
    this.lines = this.lines.map(l => ({ ...l, y: l.y - scrollAmount }));
    this.lines = this.lines.filter(l => l.y > 60);

    // Redraw
    this.ctx.fillStyle = '#f8f8f8';
    this.ctx.fillRect(0, 60, this.config.width, this.config.height - 60);

    for (const line of this.lines) {
      this.ctx.fillStyle = line.color;
      this.ctx.font = `${line.size}px Arial`;
      this.ctx.textAlign = 'left';
      this.ctx.fillText(line.text, 30, line.y);
    }

    this.currentY -= scrollAmount;
  }

  // Get the current line count
  getLineCount(): number {
    return this.lines.length;
  }

  // Programmatic update for AI-driven content
  async updateFromAI(action: WhiteboardAction): Promise<void> {
    switch (action.type) {
      case 'clear':
        this.clear();
        break;
      case 'header':
        this.writeHeader(action.text!, action.color);
        break;
      case 'line':
        this.writeLine(action.text!, action.color, action.size);
        break;
      case 'bullet':
        this.writeBullet(action.text!, action.color);
        break;
      case 'crossout':
        this.crossOut(action.lineIndex!);
        break;
      case 'highlight':
        this.highlight(action.lineIndex!, action.color);
        break;
      case 'checkmark':
        this.checkmark(action.lineIndex!);
        break;
    }
  }

  // Get the mesh for scene manipulation
  getMesh(): THREE.Mesh {
    return this.mesh;
  }
}

export interface WhiteboardAction {
  type: 'clear' | 'header' | 'line' | 'bullet' | 'crossout' | 'highlight' | 'checkmark';
  text?: string;
  color?: string;
  size?: number;
  lineIndex?: number;
}
