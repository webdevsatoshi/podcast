import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class EnvironmentLoader {
  private gltfLoader: GLTFLoader;

  constructor() {
    this.gltfLoader = new GLTFLoader();
  }

  createSimpleRoom(scene: THREE.Scene): void {
    // Floor
    const floorGeometry = new THREE.PlaneGeometry(20, 20);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x2a2a3e,
      roughness: 0.8,
      metalness: 0.2
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Back wall
    const wallGeometry = new THREE.PlaneGeometry(20, 10);
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1a2e,
      roughness: 0.9,
      metalness: 0.1
    });
    const backWall = new THREE.Mesh(wallGeometry, wallMaterial);
    backWall.position.set(0, 5, -5);
    backWall.receiveShadow = true;
    scene.add(backWall);

    // Side walls
    const leftWall = new THREE.Mesh(wallGeometry, wallMaterial);
    leftWall.position.set(-10, 5, 0);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.receiveShadow = true;
    scene.add(leftWall);

    const rightWall = new THREE.Mesh(wallGeometry, wallMaterial);
    rightWall.position.set(10, 5, 0);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.receiveShadow = true;
    scene.add(rightWall);

    // Add a subtle grid pattern on floor
    const gridHelper = new THREE.GridHelper(20, 40, 0x444466, 0x333355);
    gridHelper.position.y = 0.01;
    scene.add(gridHelper);
  }

  async loadGLBEnvironment(scene: THREE.Scene, path: string): Promise<THREE.Group> {
    return new Promise((resolve, reject) => {
      this.gltfLoader.load(
        path,
        (gltf) => {
          const model = gltf.scene;

          // Log the model structure to help with positioning
          console.log('Loaded environment model:', model);

          // Get bounding box to understand scale
          const box = new THREE.Box3().setFromObject(model);
          const size = box.getSize(new THREE.Vector3());
          const center = box.getCenter(new THREE.Vector3());
          console.log('Environment size:', size);
          console.log('Environment center:', center);

          model.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });

          scene.add(model);
          resolve(model);
        },
        (progress) => {
          if (progress.total > 0) {
            console.log('Loading environment:', (progress.loaded / progress.total * 100).toFixed(1) + '%');
          }
        },
        (error) => {
          console.error('Error loading environment:', error);
          reject(error);
        }
      );
    });
  }
}
