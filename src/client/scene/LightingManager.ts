import * as THREE from 'three';

export class LightingManager {
  private lights: THREE.Light[] = [];

  constructor(scene: THREE.Scene) {
    this.setupLights(scene);
  }

  private setupLights(scene: THREE.Scene): void {
    // Minimal lighting - let the model's own lighting/materials show

    // Very dim ambient light
    const ambient = new THREE.AmbientLight(0xffffff, 0.1);
    scene.add(ambient);
    this.lights.push(ambient);

    // Single soft directional light
    const keyLight = new THREE.DirectionalLight(0xffffff, 0.2);
    keyLight.position.set(5, 10, 5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    scene.add(keyLight);
    this.lights.push(keyLight);
  }

  setIntensity(factor: number): void {
    for (const light of this.lights) {
      if (light instanceof THREE.DirectionalLight || light instanceof THREE.PointLight) {
        light.intensity *= factor;
      }
    }
  }
}
