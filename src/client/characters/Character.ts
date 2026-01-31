import * as THREE from 'three';
import { AnimationController } from './AnimationController';
import { MovementController, MovementConfig, Location } from './MovementController';

export class Character {
  public model: THREE.Group;
  public name: string;
  private animController: AnimationController;
  private movementController: MovementController | null = null;

  constructor(
    model: THREE.Group,
    clips: Map<string, THREE.AnimationClip>,
    name: string = 'Character'
  ) {
    this.model = model;
    this.name = name;
    this.animController = new AnimationController(model, clips);
  }

  setupMovement(config: MovementConfig): void {
    this.movementController = new MovementController(this.model, config, this.name);

    // Wire up animation changes for walking
    this.movementController.onStartWalk(() => {
      this.playWalking();
    });

    // Note: onStopWalk removed - arrival animation handled by onArrive callback
  }

  setPosition(x: number, y: number, z: number): void {
    this.model.position.set(x, y, z);
  }

  setRotation(x: number, y: number, z: number): void {
    this.model.rotation.set(x, y, z);
  }

  lookAt(target: THREE.Vector3): void {
    // Only rotate on Y axis to look at target
    const direction = new THREE.Vector3();
    direction.subVectors(target, this.model.position);
    const angle = Math.atan2(direction.x, direction.z);
    this.model.rotation.y = angle;
  }

  // Movement methods
  goToWorkStation(onArrive?: () => void): void {
    if (this.movementController) {
      this.movementController.moveTo(
        this.movementController.getWorkStation(),
        onArrive
      );
    }
  }

  goToMeetingSpot(onArrive?: () => void): void {
    if (this.movementController) {
      const meetingSpot = this.movementController.getMeetingSpot();
      if (meetingSpot) {
        this.movementController.moveTo(meetingSpot, onArrive);
      }
    }
  }

  goToLocation(location: Location, onArrive?: () => void): void {
    this.movementController?.moveTo(location, onArrive);
  }

  isMoving(): boolean {
    return this.movementController?.isMoving() ?? false;
  }

  isAtWorkStation(): boolean {
    return this.movementController?.isAtWorkStation() ?? false;
  }

  isAtMeetingSpot(): boolean {
    return this.movementController?.isAtMeetingSpot() ?? false;
  }

  // Animation methods
  playTalking(): void {
    this.animController.playTalking();
  }

  playThinking(): void {
    this.animController.playThinking();
  }

  playIdle(): void {
    console.log(`${this.name} playIdle() called`);
    this.animController.playIdle();
  }

  playWorking(): void {
    this.animController.playWorking();
  }

  playWalking(): void {
    console.log(`${this.name} playWalking() called`);
    this.animController.play('walk', { timeScale: 1.0 });
  }

  playAnimation(name: string, options?: { timeScale?: number }): void {
    this.animController.play(name, options);
  }

  update(deltaTime: number): void {
    this.animController.update(deltaTime);
    this.movementController?.update(deltaTime);
  }

  getPosition(): THREE.Vector3 {
    return this.model.position.clone();
  }

  getMovementController(): MovementController | null {
    return this.movementController;
  }
}
