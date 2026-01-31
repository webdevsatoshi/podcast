import * as THREE from 'three';
import { SceneManager } from './scene/SceneManager';
import { LightingManager } from './scene/LightingManager';
import { EnvironmentLoader } from './scene/EnvironmentLoader';
import { CharacterLoader } from './characters/CharacterLoader';
import { Character } from './characters/Character';
import { UIOverlay } from './ui/UIOverlay';
import { MovementConfig } from './characters/MovementController';
import { Whiteboard } from './ui/Whiteboard';
import { MoltbookScreen } from './ui/MoltbookScreen';
import { MoltbookManager } from './moltbook/MoltbookManager';

// Define locations in the scene - adjusted for podcast.glb room
const LOCATIONS = {
  // Boss's seat - turned ~20 degrees right
  bossWorkStation: {
    name: 'Boss Seat',
    position: new THREE.Vector3(2.47, 0.29, -1.07),
    rotation: -Math.PI / 2 + Math.PI / 9 // ~20 degrees right
  },
  // Girl's seat - turned ~20 degrees left (opposite of boss)
  girlWorkStation: {
    name: 'Aria Seat',
    position: new THREE.Vector3(0.26, 0.29, -1.46),
    rotation: Math.PI / 2 - Math.PI / 9 // ~20 degrees left
  }
};

// Camera angles for the podcast room
const CAMERA_ANGLES = {
  // Close-up angle 1
  angle1: {
    position: new THREE.Vector3(1.06, 1.68, 1.42),
    lookAt: new THREE.Vector3(1.48, 1.15, -1.22)
  },
  // Close-up angle 2
  angle2: {
    position: new THREE.Vector3(2.24, 1.91, 1.04),
    lookAt: new THREE.Vector3(1.41, 0.73, -1.53)
  },
  // Wide angle
  angle3: {
    position: new THREE.Vector3(1.57, 1.78, 2.53),
    lookAt: new THREE.Vector3(1.49, 1.47, -0.18)
  },
  // Left side view
  angle4: {
    position: new THREE.Vector3(-0.84, 0.93, 2.04),
    lookAt: new THREE.Vector3(1.48, 1.15, -1.22)
  },
  // Right side view
  angle5: {
    position: new THREE.Vector3(3.41, 1.03, 2.29),
    lookAt: new THREE.Vector3(1.48, 1.15, -1.22)
  },
  // Far wide shot
  angle6: {
    position: new THREE.Vector3(-0.31, 1.86, 5.37),
    lookAt: new THREE.Vector3(1.48, 1.15, -1.22)
  }
};

// Default working camera (use angle1)
const WORKING_CAMERA = CAMERA_ANGLES.angle1;

// Meeting area for podcast set - use the main camera angles
const MEETING_AREAS = [
  {
    name: 'Podcast Set',
    spot1: { position: new THREE.Vector3(2.47, 0.29, -1.07), rotation: -Math.PI / 2 + Math.PI / 9 },  // Boss seat
    spot2: { position: new THREE.Vector3(0.26, 0.29, -1.46), rotation: Math.PI / 2 - Math.PI / 9 },   // Girl seat
    // Use angle1 as the starting camera for podcast
    camera: { position: new THREE.Vector3(1.06, 1.68, 1.42), lookAt: new THREE.Vector3(1.48, 1.15, -1.22) }
  }
];

async function main(): Promise<void> {
  const canvas = document.getElementById('canvas') as HTMLCanvasElement;
  const ui = new UIOverlay();

  ui.showLoading('Initializing scene...');

  // Initialize scene
  const sceneManager = new SceneManager(canvas);
  new LightingManager(sceneManager.scene);

  // Production mode - dev tools disabled

  // Load the CyberpunkOffice environment
  const envLoader = new EnvironmentLoader();
  ui.showLoading('Loading environment...');

  // Whiteboard instance (created after environment loads)
  let whiteboard: Whiteboard | null = null;
  let moltbookScreen: MoltbookScreen | null = null;
  const moltbookManager = new MoltbookManager();

  try {
    const environment = await envLoader.loadGLBEnvironment(
      sceneManager.scene,
      '/models/podcast.glb'
    );
    // Adjust environment position/scale if needed
    environment.position.set(0, 0, 0);
    console.log('Hologra Office loaded successfully');

    // Debug: Log bounding box info and auto-position camera
    const box = new THREE.Box3().setFromObject(environment);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    console.log('Hologra Office model - Size:', size, 'Center:', center);

    // Auto-position camera to see the model
    const maxDim = Math.max(size.x, size.y, size.z);
    const cameraDistance = maxDim * 1.5;
    sceneManager.camera.position.set(
      center.x + cameraDistance,
      center.y + cameraDistance * 0.5,
      center.z + cameraDistance
    );
    sceneManager.controls.target.copy(center);
    sceneManager.controls.update();
    console.log('Camera auto-positioned to view model');

    // Make environment accessible globally for debugging
    (window as any).environment = environment;

    // Clean up the loaded model
    // 1. Log all objects to see what's there
    console.log('--- Model objects ---');
    environment.traverse((object: THREE.Object3D) => {
      console.log(object.type, object.name);
    });

    // 2. Fix materials and remove unwanted objects
    environment.traverse((object: THREE.Object3D) => {
      // Remove by name if it contains "sphere"
      if (object.name.toLowerCase().includes('sphere')) {
        console.log('Removing sphere:', object.name);
        object.removeFromParent();
      }

      const mesh = object as THREE.Mesh;
      if (mesh.isMesh && mesh.material) {
        // Handle both single materials and material arrays
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

        for (const mat of materials) {
          const stdMat = mat as THREE.MeshStandardMaterial;

          // Make all materials double-sided so walls/floors visible from inside
          stdMat.side = THREE.DoubleSide;

          // Remove by color (pink/magenta)
          if (stdMat.color) {
            const color = stdMat.color;
            if (color.r > 0.9 && color.g < 0.5 && color.b > 0.9) {
              console.log('Removing pink object:', object.name);
              object.removeFromParent();
            }
          }

          // Reduce emissive intensity if too bright
          if (stdMat.emissive && stdMat.emissiveIntensity > 0.1) {
            stdMat.emissiveIntensity = 0.1;
          }
        }
      }
    });

    // 3. Lighting setup
    // Renderer settings
    sceneManager.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    sceneManager.renderer.toneMappingExposure = 1.0;
    sceneManager.renderer.outputColorSpace = THREE.SRGBColorSpace;

    // Set a dark background
    sceneManager.scene.background = new THREE.Color(0x1a1a1a);

    // Add good lighting for the room - brighter overall
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    sceneManager.scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.5);
    keyLight.position.set(5, 10, 5);
    keyLight.castShadow = true;
    sceneManager.scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.8);
    fillLight.position.set(-5, 5, -5);
    sceneManager.scene.add(fillLight);

    // Soft point light for warmth
    const warmLight = new THREE.PointLight(0xffaa66, 0.8, 20);
    warmLight.position.set(0, 3, 0);
    sceneManager.scene.add(warmLight);

    // Extra lights around the podcast set
    const frontLight = new THREE.PointLight(0xffffff, 0.6, 15);
    frontLight.position.set(1.3, 2, 2);
    sceneManager.scene.add(frontLight);

    const leftLight = new THREE.PointLight(0xffffff, 0.5, 10);
    leftLight.position.set(-1, 1.5, -1);
    sceneManager.scene.add(leftLight);

    const rightLight = new THREE.PointLight(0xffffff, 0.5, 10);
    rightLight.position.set(3.5, 1.5, -1);
    sceneManager.scene.add(rightLight);


    // Create whiteboard on the wall
    whiteboard = new Whiteboard(sceneManager.scene);

    // Demo: Add some initial content
    whiteboard.writeHeader('SITUATION');
    whiteboard.writeBullet('$2.3M owed to Viktor');
    whiteboard.writeBullet('72 hours remaining');
    whiteboard.writeBullet('$12,847 in bank');

    // Make whiteboard accessible globally for testing
    (window as any).whiteboard = whiteboard;

  } catch (error) {
    console.warn('Failed to load Hologra Office, using simple room:', error);
    envLoader.createSimpleRoom(sceneManager.scene);
  }

  // Create moltbook screen AFTER environment try/catch so it always runs
  console.log('Creating MoltbookScreen...');
  moltbookScreen = new MoltbookScreen(sceneManager.scene, {
    position: new THREE.Vector3(1.6, 1.5, -2.2),  // Lowered slightly
    rotation: 0,  // Facing forward (+Z direction)
    width: 800,
    height: 600,
    screenWidth: 2.47,   // 20% smaller (3.09 * 0.8)
    screenHeight: 1.66   // 20% smaller (2.08 * 0.8)
  });
  console.log('MoltbookScreen created successfully');

  // Setup moltbook manager
  moltbookManager.onNewPost((post) => {
    console.log('Moltbook: New post received -', post.title);
    moltbookScreen?.drawPost(post);
  });
  moltbookManager.start();

  // Make accessible globally for testing
  (window as any).moltbookScreen = moltbookScreen;
  (window as any).moltbookManager = moltbookManager;

  ui.showLoading('Loading characters...');

  // Load characters
  const charLoader = new CharacterLoader();

  try {
    // Load boss character
    const bossData = await charLoader.loadWithAnimations('/models/boss.fbx', {
      talk: '/models/boss_sit_talk.fbx',      // Sitting talk animation
      argue: '/models/boss_argue.fbx',
      walk: '/models/boss_walk.fbx',
      working: '/models/boss_sit.fbx',        // Sitting idle
      idle: '/models/boss_sit.fbx'            // Sitting idle
    });

    const boss = new Character(bossData.model, bossData.clips, 'Marcus');

    // Setup boss movement
    const bossMovementConfig: MovementConfig = {
      workStation: LOCATIONS.bossWorkStation,
      walkSpeed: 1.5, // units per second
      rotationSpeed: 3.0 // radians per second
    };
    boss.setupMovement(bossMovementConfig);
    sceneManager.addCharacter(boss);

    ui.showLoading('Loading second character...');

    // Load girl character - use girl.fbx as base model
    const girlData = await charLoader.loadWithAnimations('/models/girl.fbx', {
      talk: '/models/girl_sit_talk.fbx',      // Sitting talk animation
      argue: '/models/girl_argue.fbx',
      walk: '/models/girl_walk.fbx',
      working: '/models/girl_sit.fbx',        // Sitting idle
      idle: '/models/girl_sit.fbx'            // Sitting idle
    });

    const girl = new Character(girlData.model, girlData.clips, 'Aria');

    // Setup girl movement
    const girlMovementConfig: MovementConfig = {
      workStation: LOCATIONS.girlWorkStation,
      walkSpeed: 1.8, // slightly faster
      rotationSpeed: 3.5
    };
    girl.setupMovement(girlMovementConfig);
    sceneManager.addCharacter(girl);

    // Set characters in UI for animation control
    ui.setCharacters(boss, girl);
    ui.setSceneManager(sceneManager);
    ui.setMeetingAreas(MEETING_AREAS);
    if (whiteboard) {
      ui.setWhiteboard(whiteboard);
    }
    if (moltbookScreen) {
      ui.setMoltbookScreen(moltbookScreen);
    }

    // Start at work stations with working animations
    boss.playWorking();
    girl.playWorking();

    // Move camera to working position
    sceneManager.moveCameraTo(WORKING_CAMERA.position, WORKING_CAMERA.lookAt, 1000);

    ui.hideLoading();
    console.log('3D Debate Room initialized successfully!');

    // Production mode - auto start conversation after short delay
    setTimeout(() => {
      ui.autoStart();
    }, 1500);

    // Auto camera rotation every 30 seconds
    const cameraAngles = [
      CAMERA_ANGLES.angle1,
      CAMERA_ANGLES.angle2,
      CAMERA_ANGLES.angle3,
      CAMERA_ANGLES.angle4,
      CAMERA_ANGLES.angle5,
      CAMERA_ANGLES.angle6
    ];
    let currentAngleIndex = 0;

    setInterval(() => {
      currentAngleIndex = (currentAngleIndex + 1) % cameraAngles.length;
      const angle = cameraAngles[currentAngleIndex];
      sceneManager.moveCameraTo(angle.position, angle.lookAt, 2000);
      console.log('[Camera] Rotated to angle', currentAngleIndex + 1);
    }, 30000); // 30 seconds

  } catch (error) {
    console.error('Error loading characters:', error);
    ui.showLoading('Error loading models. Check console for details.');

    // Create placeholder cubes if models fail to load
    createPlaceholderCharacters(sceneManager, ui);
  }

  // Add simple brown floor square
  const floorGeo = new THREE.PlaneGeometry(20, 20);
  const floorMat = new THREE.MeshBasicMaterial({ color: 0x5C4033, side: THREE.DoubleSide });
  const floorMesh = new THREE.Mesh(floorGeo, floorMat);
  floorMesh.rotation.x = -Math.PI / 2;
  floorMesh.position.y = 0.02;
  sceneManager.scene.add(floorMesh);
  console.log('Simple brown floor added');

  // Start render loop
  sceneManager.animate();
}

function createPlaceholderCharacters(sceneManager: SceneManager, ui: UIOverlay): void {
  import('three').then((THREE) => {
    // Create placeholder cubes
    const geometry = new THREE.BoxGeometry(0.5, 1.8, 0.3);

    const bossMaterial = new THREE.MeshStandardMaterial({ color: 0x4a9eff });
    const bossMesh = new THREE.Mesh(geometry, bossMaterial);
    bossMesh.position.set(-1.5, 0.9, 0);
    bossMesh.castShadow = true;
    sceneManager.addToScene(bossMesh);

    const girlMaterial = new THREE.MeshStandardMaterial({ color: 0xff6b4a });
    const girlMesh = new THREE.Mesh(geometry, girlMaterial);
    girlMesh.position.set(1.5, 0.9, 0);
    girlMesh.castShadow = true;
    sceneManager.addToScene(girlMesh);

    // Create mock characters with no animations for UI
    const mockClips = new Map();
    const bossGroup = new THREE.Group();
    bossGroup.add(bossMesh.clone());
    const boss = new Character(bossGroup, mockClips, 'Marcus');

    const girlGroup = new THREE.Group();
    girlGroup.add(girlMesh.clone());
    const girl = new Character(girlGroup, mockClips, 'Aria');

    ui.setCharacters(boss, girl);
    ui.hideLoading();

    console.log('Using placeholder characters - FBX models not found');
  });
}

// Run the app
main().catch(console.error);
