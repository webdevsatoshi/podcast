import * as THREE from 'three';

export interface MoltbookPost {
  votes: number;
  username: string;
  timestamp: string;
  title: string;
  content: string;
  comments: number;
  community?: string;
}

interface MoltbookScreenConfig {
  // 3D positioning
  position: THREE.Vector3;
  rotation: number;
  // Canvas resolution
  width?: number;
  height?: number;
  // Physical size in 3D space
  screenWidth?: number;
  screenHeight?: number;
}

export class MoltbookScreen {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private texture: THREE.CanvasTexture;
  private mesh: THREE.Mesh;
  private config: Required<MoltbookScreenConfig>;
  private logoImage: HTMLImageElement | null = null;

  constructor(scene: THREE.Scene, config: MoltbookScreenConfig) {
    this.config = {
      position: config.position,
      rotation: config.rotation,
      width: config.width || 800,
      height: config.height || 600,
      screenWidth: config.screenWidth || 2,
      screenHeight: config.screenHeight || 1.5
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

    // Create plane geometry
    const geometry = new THREE.PlaneGeometry(
      this.config.screenWidth,
      this.config.screenHeight
    );

    // Create material with the canvas texture
    const material = new THREE.MeshBasicMaterial({
      map: this.texture,
      side: THREE.DoubleSide
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.copy(this.config.position);
    this.mesh.rotation.y = this.config.rotation;

    scene.add(this.mesh);

    // Load logo image
    this.logoImage = new Image();
    this.logoImage.src = '/moltbook.png';
    this.logoImage.onload = () => {
      console.log('Moltbook logo loaded');
      this.drawEmpty(); // Redraw with logo
    };

    // Draw initial loading state
    this.drawEmpty();

    console.log('MoltbookScreen created at', this.mesh.position);
  }

  drawPost(post: MoltbookPost): void {
    const ctx = this.ctx;
    const w = this.config.width;
    const h = this.config.height;

    // Dark Reddit-like background
    ctx.fillStyle = '#0a0a0b';
    ctx.fillRect(0, 0, w, h);

    // Header bar (red)
    ctx.fillStyle = '#5a0a0e';
    ctx.fillRect(0, 0, w, 60);

    // Logo image + title
    let textX = 25;
    if (this.logoImage && this.logoImage.complete) {
      const logoHeight = 36;
      const logoWidth = (this.logoImage.width / this.logoImage.height) * logoHeight;
      ctx.drawImage(this.logoImage, 15, 12, logoWidth, logoHeight);
      textX = 15 + logoWidth + 8;
    }
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('moltbook', textX, 40);

    // Community tag
    ctx.fillStyle = '#dddddd';
    ctx.font = '18px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(`m/${post.community || 'general'}`, w - 25, 40);

    // Vote section (left side)
    const voteX = 40;
    ctx.fillStyle = '#5a0a0e';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('\u25B2', voteX, 110); // Up arrow

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px Arial';
    ctx.fillText(this.formatNumber(post.votes), voteX, 145);

    // Username and timestamp
    const contentX = 90;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#4fbcff';
    ctx.font = '16px Arial';
    ctx.fillText(`u/${post.username}`, contentX, 100);

    ctx.fillStyle = '#818384';
    ctx.font = '14px Arial';
    ctx.fillText(post.timestamp, contentX + ctx.measureText(`u/${post.username}`).width + 15, 100);

    // Title
    ctx.fillStyle = '#d7dadc';
    ctx.font = 'bold 24px Arial';
    const titleY = 140;
    this.wrapText(post.title, contentX, titleY, w - contentX - 30, 32);

    // Horizontal divider
    const dividerY = this.getWrappedTextHeight(post.title, w - contentX - 30, 32) + titleY + 20;
    ctx.strokeStyle = '#343536';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(contentX, dividerY);
    ctx.lineTo(w - 30, dividerY);
    ctx.stroke();

    // Content preview
    ctx.fillStyle = '#9a9a9a';
    ctx.font = '18px Arial';
    const contentY = dividerY + 30;
    this.wrapText(post.content, contentX, contentY, w - contentX - 30, 26, 6); // Max 6 lines

    // Bottom bar - comments
    ctx.fillStyle = '#818384';
    ctx.font = '16px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`\uD83D\uDCAC ${this.formatNumber(post.comments)} comments`, contentX, h - 30);

    // Update texture
    this.texture.needsUpdate = true;
  }

  private drawEmpty(): void {
    const ctx = this.ctx;
    const w = this.config.width;
    const h = this.config.height;

    // Dark background
    ctx.fillStyle = '#0a0a0b';
    ctx.fillRect(0, 0, w, h);

    // Header bar (red)
    ctx.fillStyle = '#5a0a0e';
    ctx.fillRect(0, 0, w, 60);

    // Logo image + title
    let textX = 25;
    if (this.logoImage && this.logoImage.complete) {
      const logoHeight = 36;
      const logoWidth = (this.logoImage.width / this.logoImage.height) * logoHeight;
      ctx.drawImage(this.logoImage, 15, 12, logoWidth, logoHeight);
      textX = 15 + logoWidth + 8;
    }
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('moltbook', textX, 40);

    // Loading message
    ctx.fillStyle = '#666666';
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Loading posts...', w / 2, h / 2);

    this.texture.needsUpdate = true;
  }

  drawError(message: string): void {
    const ctx = this.ctx;
    const w = this.config.width;
    const h = this.config.height;

    // Dark background
    ctx.fillStyle = '#0a0a0b';
    ctx.fillRect(0, 0, w, h);

    // Header bar (darker for error)
    ctx.fillStyle = '#8b0000';
    ctx.fillRect(0, 0, w, 60);

    // Logo image + title
    let textX = 25;
    if (this.logoImage && this.logoImage.complete) {
      const logoHeight = 36;
      const logoWidth = (this.logoImage.width / this.logoImage.height) * logoHeight;
      ctx.drawImage(this.logoImage, 15, 12, logoWidth, logoHeight);
      textX = 15 + logoWidth + 8;
    }
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('moltbook', textX, 40);

    // Error message
    ctx.fillStyle = '#ff4444';
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(message, w / 2, h / 2);

    this.texture.needsUpdate = true;
  }

  private wrapText(
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number,
    maxLines: number = 10
  ): void {
    const words = text.split(' ');
    let line = '';
    let currentY = y;
    let lineCount = 0;

    for (const word of words) {
      const testLine = line + word + ' ';
      const metrics = this.ctx.measureText(testLine);

      if (metrics.width > maxWidth && line !== '') {
        this.ctx.fillText(line.trim(), x, currentY);
        line = word + ' ';
        currentY += lineHeight;
        lineCount++;

        if (lineCount >= maxLines) {
          // Add ellipsis if truncated
          this.ctx.fillText('...', x, currentY);
          return;
        }
      } else {
        line = testLine;
      }
    }

    if (line.trim()) {
      this.ctx.fillText(line.trim(), x, currentY);
    }
  }

  private getWrappedTextHeight(text: string, maxWidth: number, lineHeight: number): number {
    const words = text.split(' ');
    let line = '';
    let lines = 1;

    for (const word of words) {
      const testLine = line + word + ' ';
      const metrics = this.ctx.measureText(testLine);

      if (metrics.width > maxWidth && line !== '') {
        line = word + ' ';
        lines++;
      } else {
        line = testLine;
      }
    }

    return lines * lineHeight;
  }

  private formatNumber(num: number): string {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
  }

  getMesh(): THREE.Mesh {
    return this.mesh;
  }

  setPosition(position: THREE.Vector3): void {
    this.mesh.position.copy(position);
  }

  setRotation(rotation: number): void {
    this.mesh.rotation.y = rotation;
  }
}
