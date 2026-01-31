import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Character } from '../characters/Character';

export class SceneManager {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public controls: OrbitControls;
  private clock: THREE.Clock;
  private characters: Character[] = [];
  private animationId: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);
    this.clock = new THREE.Clock();

    // Renderer with shadows
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true
    });
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 2.0;

    // Elevated camera showing both characters
    this.camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    // Position camera to see the room and characters
    // Adjusted for the larger hologra office
    this.camera.position.set(0, 4, 10);
    this.camera.lookAt(0, 1.2, 0);

    // Add orbit controls for navigation
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.target.set(0, 1.2, 0);

    // Mouse button configuration:
    // Left click: Rotate
    // Right click: Pan
    // Middle click (or Ctrl+Left): Pan
    this.controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.PAN,
      RIGHT: THREE.MOUSE.PAN
    };

    // Enable Ctrl+Left click for panning (same as middle mouse)
    this.controls.screenSpacePanning = true;

    this.controls.update();

    this.setupResizeHandler();
    this.setupKeyboardControls();
  }

  private setupKeyboardControls(): void {
    const moveSpeed = 0.5;
    const keys: Record<string, boolean> = {};

    window.addEventListener('keydown', (e) => {
      // Skip if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      keys[e.key.toLowerCase()] = true;

      // WASD movement (only when Shift is held to avoid conflicts)
      if (e.shiftKey) {
        const forward = new THREE.Vector3();
        const right = new THREE.Vector3();

        // Get camera direction (ignoring Y)
        this.camera.getWorldDirection(forward);
        forward.y = 0;
        forward.normalize();

        // Get right direction
        right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

        let moved = false;

        if (keys['w']) {
          this.camera.position.addScaledVector(forward, moveSpeed);
          this.controls.target.addScaledVector(forward, moveSpeed);
          moved = true;
        }
        if (keys['s']) {
          this.camera.position.addScaledVector(forward, -moveSpeed);
          this.controls.target.addScaledVector(forward, -moveSpeed);
          moved = true;
        }
        if (keys['a']) {
          this.camera.position.addScaledVector(right, -moveSpeed);
          this.controls.target.addScaledVector(right, -moveSpeed);
          moved = true;
        }
        if (keys['d']) {
          this.camera.position.addScaledVector(right, moveSpeed);
          this.controls.target.addScaledVector(right, moveSpeed);
          moved = true;
        }
        if (keys['q']) {
          this.camera.position.y -= moveSpeed;
          this.controls.target.y -= moveSpeed;
          moved = true;
        }
        if (keys['e']) {
          this.camera.position.y += moveSpeed;
          this.controls.target.y += moveSpeed;
          moved = true;
        }

        if (moved) {
          e.preventDefault();
          this.controls.update();
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      keys[e.key.toLowerCase()] = false;
    });
  }

  private setupResizeHandler(): void {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  addCharacter(character: Character): void {
    this.characters.push(character);
    this.scene.add(character.model);
  }

  addToScene(object: THREE.Object3D): void {
    this.scene.add(object);
  }

  // Smoothly move camera to a new position
  moveCameraTo(position: THREE.Vector3, lookAt: THREE.Vector3, duration: number = 1500): void {
    const startPosition = this.camera.position.clone();
    const startTarget = this.controls.target.clone();
    const startTime = performance.now();

    const animateCamera = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease in-out
      const eased = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;

      this.camera.position.lerpVectors(startPosition, position, eased);
      this.controls.target.lerpVectors(startTarget, lookAt, eased);
      this.controls.update();

      if (progress < 1) {
        requestAnimationFrame(animateCamera);
      }
    };

    animateCamera();
  }

  animate(): void {
    this.animationId = requestAnimationFrame(() => this.animate());
    const delta = this.clock.getDelta();

    // Update controls
    this.controls.update();

    // Update all character animations
    for (const character of this.characters) {
      character.update(delta);
    }

    this.renderer.render(this.scene, this.camera);
  }

  stop(): void {
    cancelAnimationFrame(this.animationId);
  }
}
