import * as THREE from 'three';

export type AnimationState = 'idle' | 'talking' | 'thinking' | 'walking' | 'working';

interface AnimationOptions {
  fadeIn?: number;
  loop?: boolean;
  timeScale?: number;
}

export class AnimationController {
  private mixer: THREE.AnimationMixer;
  private actions: Map<string, THREE.AnimationAction> = new Map();
  private currentAction: THREE.AnimationAction | null = null;
  private currentState: string = '';
  private readonly defaultFadeDuration = 0.5;

  constructor(model: THREE.Object3D, clips: Map<string, THREE.AnimationClip>) {
    this.mixer = new THREE.AnimationMixer(model);

    console.log('AnimationController: Available animations:', Array.from(clips.keys()));

    for (const [name, clip] of clips) {
      const action = this.mixer.clipAction(clip);
      action.clampWhenFinished = true;
      this.actions.set(name, action);
    }
  }

  play(stateName: string, options: AnimationOptions = {}): void {
    const action = this.actions.get(stateName);
    if (!action) {
      console.warn(`Animation "${stateName}" not found`);
      return;
    }

    if (stateName === this.currentState) {
      // Already playing this animation - skip to prevent stutter
      return;
    }

    console.log(`>>> PLAY ${stateName.toUpperCase()} <<< (was: ${this.currentState || 'none'}) @ ${Date.now()}`);

    const {
      fadeIn = this.defaultFadeDuration,
      loop = true,
      timeScale = 1.0
    } = options;

    action.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
    action.clampWhenFinished = !loop;
    action.setEffectiveTimeScale(timeScale);
    action.setEffectiveWeight(1);

    // Fade out old action, fade in new action
    if (this.currentAction && this.currentAction !== action) {
      this.currentAction.fadeOut(fadeIn);
    }

    action.reset();
    action.fadeIn(fadeIn);
    action.play();

    this.currentAction = action;
    this.currentState = stateName;
  }

  playTalking(): void {
    this.play('talk', { timeScale: 1.0 });
  }

  playThinking(): void {
    // Use idle (sitting) animation for listening/thinking
    if (this.actions.has('idle')) {
      this.play('idle', { timeScale: 0.8 });
    } else if (this.actions.has('working')) {
      this.play('working', { timeScale: 0.8 });
    }
  }

  playIdle(): void {
    console.log('playIdle: checking for idle animation, has it:', this.actions.has('idle'));
    // Use dedicated idle animation if available
    if (this.actions.has('idle')) {
      console.log('Playing idle animation');
      this.play('idle', { timeScale: 1.0 });
    } else if (this.actions.has('walk')) {
      console.log('Fallback: Playing walk animation (slow)');
      // Fallback to walk animation at very slow speed
      this.play('walk', { timeScale: 0.1 });
    } else if (this.actions.has('talk')) {
      console.log('Fallback: Playing talk animation (slow)');
      // Fallback to talk at slow speed
      this.play('talk', { timeScale: 0.2 });
    }
  }

  playWorking(): void {
    // Use working animation for desk work
    if (this.actions.has('working')) {
      this.play('working', { timeScale: 1.0 });
    } else {
      // Fallback to idle if no working animation
      this.playIdle();
    }
  }

  getCurrentState(): string {
    return this.currentState;
  }

  private mixerUpdateCount: number = 0;

  update(deltaTime: number): void {
    this.mixerUpdateCount++;
    // Log every 60 frames to check mixer is being updated
    if (this.mixerUpdateCount % 60 === 0) {
      console.log(`Mixer update #${this.mixerUpdateCount}, currentState: ${this.currentState}, delta: ${deltaTime.toFixed(4)}`);
    }
    this.mixer.update(deltaTime);
  }

  stopAll(): void {
    this.mixer.stopAllAction();
    this.currentAction = null;
    this.currentState = '';
  }
}
