import * as THREE from 'three';

export interface Location {
  name: string;
  position: THREE.Vector3;
  rotation: number; // Y rotation in radians
}

export interface MovementConfig {
  workStation: Location;
  meetingSpot?: Location; // Optional - can use goToLocation instead
  walkSpeed: number; // units per second
  rotationSpeed: number; // radians per second
}

type MovementState = 'idle' | 'walking' | 'arriving';

export class MovementController {
  private model: THREE.Object3D;
  private config: MovementConfig;
  private name: string;
  private currentTarget: Location | null = null;
  private state: MovementState = 'idle';
  private onArriveCallback: (() => void) | null = null;
  private onStartWalkCallback: (() => void) | null = null;
  private onStopWalkCallback: (() => void) | null = null;
  private lastArrivedLocation: string | null = null; // Prevents re-triggering movement to same spot

  constructor(model: THREE.Object3D, config: MovementConfig, name: string = 'Unknown') {
    this.model = model;
    this.config = config;
    this.name = name;

    // Start at work station
    this.teleportTo(config.workStation);
  }

  teleportTo(location: Location): void {
    this.model.position.copy(location.position);
    this.model.rotation.y = location.rotation;
    this.currentTarget = null;
    this.state = 'idle';
  }

  goToWorkStation(): void {
    this.moveTo(this.config.workStation);
  }

  goToMeetingSpot(): void {
    if (this.config.meetingSpot) {
      this.moveTo(this.config.meetingSpot);
    }
  }

  moveTo(location: Location, onArrive?: () => void): void {
    // Don't restart if already walking to same location
    if (this.state === 'walking' && this.currentTarget?.name === location.name) {
      console.log(`Already walking to ${location.name}, ignoring duplicate moveTo`);
      return;
    }

    // Don't move if we just arrived at this location
    if (this.state === 'idle' && this.lastArrivedLocation === location.name) {
      console.log(`Already at ${location.name}, ignoring moveTo`);
      return;
    }

    // Calculate distance to target
    const currentPos = this.model.position;
    const targetPos = location.position;
    const distance = new THREE.Vector3().subVectors(targetPos, currentPos).setY(0).length();

    console.log(`[${this.name}] moveTo called: ${location.name}`);
    console.log(`[${this.name}]   Current pos: (${currentPos.x.toFixed(2)}, ${currentPos.y.toFixed(2)}, ${currentPos.z.toFixed(2)})`);
    console.log(`[${this.name}]   Target pos: (${targetPos.x.toFixed(2)}, ${targetPos.y.toFixed(2)}, ${targetPos.z.toFixed(2)})`);
    console.log(`[${this.name}]   Distance: ${distance.toFixed(2)} units, threshold: 0.5 units`);

    // Check if already at destination
    if (distance < 0.5) {
      console.log(`  Already at destination! Calling arrive directly.`);
      // Clone position to prevent reference issues
      this.currentTarget = {
        name: location.name,
        position: location.position.clone(),
        rotation: location.rotation
      };
      this.onArriveCallback = onArrive || null;
      this.arrive();
      return;
    }

    // Clone position to prevent reference issues
    this.currentTarget = {
      name: location.name,
      position: location.position.clone(),
      rotation: location.rotation
    };
    this.state = 'walking';
    this.lastArrivedLocation = null; // Clear arrival lock when starting new movement
    this.onArriveCallback = onArrive || null;

    if (this.onStartWalkCallback) {
      this.onStartWalkCallback();
    }
  }

  onStartWalk(callback: () => void): void {
    this.onStartWalkCallback = callback;
  }

  onStopWalk(callback: () => void): void {
    this.onStopWalkCallback = callback;
  }

  isMoving(): boolean {
    return this.state === 'walking';
  }

  isAtWorkStation(): boolean {
    const dist = this.model.position.distanceTo(this.config.workStation.position);
    return dist < 0.3;
  }

  isAtMeetingSpot(): boolean {
    if (!this.config.meetingSpot) return false;
    const dist = this.model.position.distanceTo(this.config.meetingSpot.position);
    return dist < 0.3;
  }

  private updateFrameCount: number = 0;

  update(deltaTime: number): void {
    if (this.state !== 'walking' || !this.currentTarget) {
      return;
    }

    const targetPos = this.currentTarget.position;
    const currentPos = this.model.position;

    // Calculate direction to target
    const direction = new THREE.Vector3()
      .subVectors(targetPos, currentPos)
      .setY(0); // Keep movement on the ground plane

    const distance = direction.length();

    // Debug: Log every 30 frames while walking
    this.updateFrameCount++;
    if (this.updateFrameCount % 30 === 0) {
      console.log(`[${this.name}] Walking frame ${this.updateFrameCount}: dist=${distance.toFixed(2)}, pos=(${currentPos.x.toFixed(2)},${currentPos.z.toFixed(2)}) -> (${targetPos.x.toFixed(2)},${targetPos.z.toFixed(2)})`);
    }

    // Check if we've arrived (use larger threshold to prevent overshoot oscillation)
    if (distance < 0.5) {
      console.log(`[${this.name}] Arrived! Final distance: ${distance.toFixed(2)}`);
      this.updateFrameCount = 0;
      this.arrive();
      return;
    }

    // Normalize direction
    direction.normalize();

    // Calculate target rotation (face movement direction)
    const targetRotation = Math.atan2(direction.x, direction.z);

    // Smoothly rotate towards movement direction
    let currentRotation = this.model.rotation.y;
    let rotationDiff = targetRotation - currentRotation;

    // Normalize rotation difference to [-PI, PI]
    while (rotationDiff > Math.PI) rotationDiff -= Math.PI * 2;
    while (rotationDiff < -Math.PI) rotationDiff += Math.PI * 2;

    const rotationStep = this.config.rotationSpeed * deltaTime;
    if (Math.abs(rotationDiff) > rotationStep) {
      this.model.rotation.y += Math.sign(rotationDiff) * rotationStep;
    } else {
      this.model.rotation.y = targetRotation;
    }

    // Move towards target
    const moveDistance = Math.min(this.config.walkSpeed * deltaTime, distance);
    this.model.position.add(direction.multiplyScalar(moveDistance));
  }

  private arrive(): void {
    if (!this.currentTarget) return;

    const locationName = this.currentTarget.name;
    console.log(`[${this.name}] arrive() called at ${locationName}, setting state to idle`);

    // Snap to final position and rotation
    this.model.position.copy(this.currentTarget.position);

    // Start rotating to final position
    const targetRotation = this.currentTarget.rotation;
    this.model.rotation.y = targetRotation;

    this.state = 'idle';
    this.lastArrivedLocation = locationName; // Lock this location to prevent re-triggering
    this.currentTarget = null;

    if (this.onStopWalkCallback) {
      this.onStopWalkCallback();
    }

    if (this.onArriveCallback) {
      const callback = this.onArriveCallback;
      this.onArriveCallback = null; // Clear before calling to prevent any recursion
      callback();
    }
  }

  getCurrentPosition(): THREE.Vector3 {
    return this.model.position.clone();
  }

  getWorkStation(): Location {
    return this.config.workStation;
  }

  getMeetingSpot(): Location | undefined {
    return this.config.meetingSpot;
  }
}
