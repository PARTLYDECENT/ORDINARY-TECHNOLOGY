
import * as THREE from 'three';
import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as YUKA from 'yuka';

console.log("Spatial Web Module Loaded");

// Configuration
const config = {
    fov: 75,
    cameraZ: 1000
};

// Global Variables
let scene, cssScene, camera, renderer, cssRenderer, controls;
let entityManager, time;

// Initialization
export function initSpatialWeb() {
    console.log("Initializing Spatial Web...");

    // 1. Setup Scenes
    scene = new THREE.Scene();
    cssScene = new THREE.Scene();

    // 2. Setup Camera
    // Calculate FOV/Distance to match 1:1 pixel scale at Z=0
    // vFOV = 2 * atan( (height / 2) / distance )
    // distance = (height / 2) / tan( vFOV / 2 )
    const fov = config.fov;
    const distance = (window.innerHeight / 2) / Math.tan((fov * Math.PI / 180) / 2);
    config.cameraZ = distance;

    camera = new THREE.PerspectiveCamera(fov, window.innerWidth / window.innerHeight, 1, 10000);
    camera.position.set(0, 0, distance);

    // 3. Setup Renderers
    setupRenderers();

    // 4. Create CSS3D Object from DOM
    createCSS3DPage();

    // 5. Setup Controls (FPS Style)
    // PointerLockControls attaches to the document body usually for locking
    controls = new PointerLockControls(camera, document.body);

    // Add unlock listener - cursor is unlocked but still in 3D mode
    controls.addEventListener('unlock', () => {
        console.log("Controls unlocked - click anywhere to re-lock for FPS movement");
    });

    // 6. Lights (for WebGL scene)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(10, 10, 10);
    scene.add(directionalLight);

    // 7. Event Listeners
    window.addEventListener('resize', onWindowResize);

    // 8. Start Loop
    time = new YUKA.Time();
    animate();

    // 9. Add Trigger Button (Temporary for testing)
    addTriggerButton();

    // 10. Setup Agents
    setupAgents();

    // 11. Setup Navigation
    setupNavigation();
}

// Navigation State
const moveState = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    speed: 40 // Increased speed for FPS feel
};

function setupNavigation() {
    document.addEventListener('keydown', (event) => {
        if (!is3DMode) return; // Only handle in 3D mode

        const handled = ['KeyW', 'KeyS', 'KeyA', 'KeyD', 'KeyE'].includes(event.code);

        switch (event.code) {
            case 'KeyW': moveState.forward = true; break;
            case 'KeyS': moveState.backward = true; break;
            case 'KeyA': moveState.left = true; break;
            case 'KeyD': moveState.right = true; break;
            case 'KeyE':
                exit3DMode(); // Quick exit with E key
                break;
        }

        // Prevent other handlers from getting WASD/E keys in 3D mode
        if (handled) {
            event.stopPropagation();
            event.preventDefault();
        }
    }, true); // Use capture phase to get events first

    document.addEventListener('keyup', (event) => {
        if (!is3DMode) return; // Only handle in 3D mode

        const handled = ['KeyW', 'KeyS', 'KeyA', 'KeyD'].includes(event.code);

        switch (event.code) {
            case 'KeyW': moveState.forward = false; break;
            case 'KeyS': moveState.backward = false; break;
            case 'KeyA': moveState.left = false; break;
            case 'KeyD': moveState.right = false; break;
        }

        // Prevent other handlers from getting WASD keys in 3D mode
        if (handled) {
            event.stopPropagation();
            event.preventDefault();
        }
    }, true); // Use capture phase
}

function updateCameraMovement(delta) {
    // Only move if controls are locked (FPS mode active)
    if (!controls.isLocked) return;

    const actualSpeed = moveState.speed * (delta * 60); // Normalize for frame rate roughly

    if (moveState.forward) controls.moveForward(actualSpeed);
    if (moveState.backward) controls.moveForward(-actualSpeed);
    if (moveState.right) controls.moveRight(actualSpeed);
    if (moveState.left) controls.moveRight(-actualSpeed);
}

function setupAgents() {
    entityManager = new YUKA.EntityManager();

    // Create fewer ships (3-5 instead of 10)
    const shipCount = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < shipCount; i++) {
        createAgent();
    }
}

function createAgent() {
    const loader = new GLTFLoader();

    // Random Position in 3D space
    const x = (Math.random() - 0.5) * window.innerWidth;
    const y = (Math.random() - 0.5) * window.innerHeight;
    const z = (Math.random() - 0.5) * 1000; // Random depth for 3D effect

    loader.load(
        'assets/models/ship1.glb',
        (gltf) => {
            const mesh = gltf.scene;

            // Scale and setup the model
            mesh.scale.set(20, 20, 20); // Adjust scale as needed
            mesh.matrixAutoUpdate = false; // Yuka handles the matrix
            scene.add(mesh);

            // Create Vehicle (AI)
            const vehicle = new YUKA.Vehicle();
            vehicle.setRenderComponent(mesh, sync);
            vehicle.position.set(x, y, z); // Full 3D position

            // Add Behaviors
            const wanderBehavior = new YUKA.WanderBehavior();
            wanderBehavior.radius = 50;
            wanderBehavior.distance = 100;
            wanderBehavior.jitter = 50;
            vehicle.steering.add(wanderBehavior);

            vehicle.maxSpeed = 150;
            entityManager.add(vehicle);

            console.log(`🚀 Ship agent spawned at (${x.toFixed(0)}, ${y.toFixed(0)}, ${z.toFixed(0)})!`);
        },
        (progress) => {
            // Loading progress (optional)
        },
        (error) => {
            console.error('Error loading ship model:', error);
            // Fallback to simple geometry if model fails to load
            createFallbackAgent(x, y, z);
        }
    );
}

function createFallbackAgent(x, y, z) {
    // Fallback if GLB fails to load
    const geometry = new THREE.ConeGeometry(10, 30, 8);
    geometry.rotateX(Math.PI / 2);
    const material = new THREE.MeshNormalMaterial();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.matrixAutoUpdate = false;
    scene.add(mesh);

    const vehicle = new YUKA.Vehicle();
    vehicle.setRenderComponent(mesh, sync);
    vehicle.position.set(x, y, z);

    const wanderBehavior = new YUKA.WanderBehavior();
    wanderBehavior.radius = 50;
    wanderBehavior.distance = 100;
    wanderBehavior.jitter = 50;
    vehicle.steering.add(wanderBehavior);

    vehicle.maxSpeed = 150;
    entityManager.add(vehicle);
}

function sync(entity, renderComponent) {
    renderComponent.matrix.copy(entity.worldMatrix);
}

function createCSS3DPage() {
    const container = document.getElementById('css3d-container');
    if (!container) {
        console.error("CSS3D Container not found!");
        return;
    }

    // Create CSS3D Object
    const pageObject = new CSS3DObject(container);
    pageObject.position.set(0, 0, 0);
    cssScene.add(pageObject);

    // We need to ensure the container has dimensions
    container.style.width = window.innerWidth + 'px';
    container.style.height = window.innerHeight + 'px';
    // Actually, for a scrolling site, we might need to handle height differently.
    // But for "laying it down", usually we want the whole scrollable area to be the object.
    // However, CSS3DObject usually takes the element as is.
    // If the element is 100% width/height of body, it matches.
}

function setupRenderers() {
    // WebGL Renderer (Background)
    // We might need to reuse the existing canvas or create a new one.
    // For now, let's create a new one to ensure compatibility with the hybrid stack.
    // The existing 'webglCanvas' in index.html might conflict if we are not careful.
    // Strategy: We will use a new canvas for the 3D world background.

    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.domElement.style.position = 'fixed';
    renderer.domElement.style.top = '0';
    renderer.domElement.style.left = '0';
    renderer.domElement.style.zIndex = '-2'; // Behind everything
    document.body.appendChild(renderer.domElement);

    // CSS3D Renderer (DOM Content)
    cssRenderer = new CSS3DRenderer();
    cssRenderer.setSize(window.innerWidth, window.innerHeight);
    cssRenderer.domElement.style.position = 'fixed';
    cssRenderer.domElement.style.top = '0';
    cssRenderer.domElement.style.left = '0';
    cssRenderer.domElement.style.zIndex = '-1'; // Behind the actual DOM if we want to click through?
    // Wait, CSS3DRenderer transforms the element. The element itself becomes the view.
    // The original DOM element is moved by CSS3 transforms.
    // So we don't need a separate canvas for it, the renderer *manages* the container.
    // But we need to append the renderer's domElement to the body.
    document.body.appendChild(cssRenderer.domElement);
}

function addTriggerButton() {
    const btn = document.createElement('button');
    btn.innerText = "ENTER 3D MODE";
    btn.style.position = 'fixed';
    btn.style.bottom = '20px';
    btn.style.right = '20px';
    btn.style.zIndex = '10000';
    btn.style.padding = '15px 30px';
    btn.style.background = 'var(--primary, orange)';
    btn.style.color = 'white';
    btn.style.border = 'none';
    btn.style.borderRadius = '5px';
    btn.style.cursor = 'pointer';
    btn.style.fontFamily = 'Space Grotesk, sans-serif';
    btn.style.fontWeight = 'bold';

    btn.addEventListener('click', toggle3DMode);
    document.body.appendChild(btn);

    // Create Instruction Overlay
    const overlay = document.createElement('div');
    overlay.id = 'instructions-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = '50%';
    overlay.style.left = '50%';
    overlay.style.transform = 'translate(-50%, -50%)';
    overlay.style.color = 'white';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    overlay.style.padding = '20px';
    overlay.style.borderRadius = '10px';
    overlay.style.fontFamily = 'Space Grotesk, sans-serif';
    overlay.style.textAlign = 'center';
    overlay.style.zIndex = '10001'; // Above button
    overlay.style.pointerEvents = 'none'; // Let clicks pass through if needed
    overlay.style.display = 'none';
    overlay.innerHTML = `
        <h2>3D MODE ACTIVE</h2>
        <p><b>WASD</b> to Move | <b>MOUSE</b> to Look</p>
        <p><b>ESC</b> to Unlock Cursor (Click to Re-lock)</p>
        <p><b>E</b> or Click Button to Exit 3D Mode</p>
    `;
    document.body.appendChild(overlay);
}

let is3DMode = false;

function toggle3DMode() {
    if (is3DMode) {
        exit3DMode();
    } else {
        transformTo3D();
    }
}

export function transformTo3D() {
    console.log("Transforming to 3D...");
    is3DMode = true;

    // Update Button - keep it visible
    const btn = document.querySelector('button');
    if (btn) {
        btn.innerText = "EXIT 3D MODE";
    }

    // Show Instructions
    const overlay = document.getElementById('instructions-overlay');
    if (overlay) {
        overlay.style.display = 'block';
        setTimeout(() => {
            overlay.style.display = 'none';
        }, 5000); // Hide after 5 seconds
    }

    // Lock controls immediately
    controls.lock();

    // Animate Camera to a starting position if needed, 
    // but PointerLock usually takes over immediately.
    // Let's just set a good starting position slightly above the plane.
    camera.position.set(0, 500, 1000);
    camera.lookAt(0, 0, 0);

    // Add a floor grid for reference if not already added
    if (!scene.getObjectByName("gridHelper")) {
        const gridHelper = new THREE.GridHelper(5000, 50);
        gridHelper.name = "gridHelper";
        scene.add(gridHelper);
    }
}

export function exit3DMode() {
    console.log("Exiting 3D Mode...");
    is3DMode = false;

    // Reset all movement states to prevent stuck keys
    moveState.forward = false;
    moveState.backward = false;
    moveState.left = false;
    moveState.right = false;

    // Update Button
    const btn = document.querySelector('button');
    if (btn) {
        btn.innerText = "ENTER 3D MODE";
    }

    // Hide Instructions
    const overlay = document.getElementById('instructions-overlay');
    if (overlay) overlay.style.display = 'none';

    // Unlock controls
    controls.unlock();

    // Reset Camera to 2D view
    camera.position.set(0, 0, config.cameraZ);
    camera.rotation.set(0, 0, 0);
    camera.lookAt(0, 0, 0);

    // Remove grid helper
    const gridHelper = scene.getObjectByName("gridHelper");
    if (gridHelper) {
        scene.remove(gridHelper);
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
    cssRenderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);

    const delta = time.update().getDelta();

    if (entityManager) entityManager.update(delta);

    updateCameraMovement(delta);

    // PointerLockControls doesn't need an update call

    // Render
    renderer.render(scene, camera);
    cssRenderer.render(cssScene, camera);
}

// Expose to global scope for debugging or external triggers
window.SpatialWeb = {
    init: initSpatialWeb,
    transform: transformTo3D,
    exit: exit3DMode,
    scene: scene,
    camera: camera,
    entityManager: entityManager
};
