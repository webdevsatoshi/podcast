import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

export interface CharacterData {
  model: THREE.Group;
  clips: Map<string, THREE.AnimationClip>;
}

export class CharacterLoader {
  private loader: FBXLoader;

  constructor() {
    this.loader = new FBXLoader();
  }

  async loadWithAnimations(
    modelPath: string,
    animationPaths: Record<string, string>
  ): Promise<CharacterData> {
    // Load base model
    const model = await this.loadFBX(modelPath);

    // Normalize scale - Mixamo models are often quite large
    const box = new THREE.Box3().setFromObject(model);
    const height = box.max.y - box.min.y;
    const targetHeight = 1.8; // 1.8 meters tall
    const scale = targetHeight / height;
    model.scale.setScalar(scale);

    // Setup materials for better rendering
    model.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        // Improve material appearance
        if (mesh.material) {
          const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          for (const mat of materials) {
            if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshPhongMaterial) {
              mat.needsUpdate = true;
            }
          }
        }
      }
    });

    // Extract animations from separate files
    const clips = new Map<string, THREE.AnimationClip>();

    // If base model has an animation, use it as a fallback
    if (model.animations.length > 0) {
      clips.set('base', model.animations[0]);
    }

    // Load each animation file
    for (const [name, path] of Object.entries(animationPaths)) {
      try {
        const animFBX = await this.loadFBX(path);
        if (animFBX.animations.length > 0) {
          clips.set(name, animFBX.animations[0]);
          console.log(`Loaded animation "${name}" from ${path}`);
        }
      } catch (error) {
        console.warn(`Failed to load animation "${name}" from ${path}:`, error);
      }
    }

    return { model, clips };
  }

  private loadFBX(path: string): Promise<THREE.Group> {
    return new Promise((resolve, reject) => {
      this.loader.load(
        path,
        (fbx) => resolve(fbx),
        (progress) => {
          if (progress.total > 0) {
            console.log(`Loading ${path}: ${(progress.loaded / progress.total * 100).toFixed(1)}%`);
          }
        },
        (error) => reject(error)
      );
    });
  }
}
