import * as THREE from 'three';
import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as YUKA from 'yuka';

console.log("Spatial Web Module Loaded");

// Configuration
const config = {
    debug: true,
    cameraZ: 1000,
    fov: 75
};

// Global State
let scene, cssScene;
let camera;
let renderer, cssRenderer;
let controls;
let entityManager;
let time;

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

    // 5. Setup Controls
    controls = new OrbitControls(camera, cssRenderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enabled = false; // Disabled initially (2D mode)
    controls.screenSpacePanning = false;

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
}

function setupAgents() {
    entityManager = new YUKA.EntityManager();

    // Create a few agents
    for (let i = 0; i < 10; i++) {
        createAgent();
    }
}

function createAgent() {
    // 1. Create Mesh
    const geometry = new THREE.ConeGeometry(10, 30, 8);
    geometry.rotateX(Math.PI / 2); // Point forward
    const material = new THREE.MeshNormalMaterial();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.matrixAutoUpdate = false; // Yuka handles the matrix
    scene.add(mesh);

    // 2. Create Vehicle (AI)
    const vehicle = new YUKA.Vehicle();
    vehicle.setRenderComponent(mesh, sync);

    // Random Position on the page
    const x = (Math.random() - 0.5) * window.innerWidth;
    const y = (Math.random() - 0.5) * window.innerHeight;
    vehicle.position.set(x, y, 0); // Z=0 is the page plane

    // 3. Add Behaviors
    const wanderBehavior = new YUKA.WanderBehavior();
    wanderBehavior.radius = 50;
    wanderBehavior.distance = 100;
    wanderBehavior.jitter = 50;
    vehicle.steering.add(wanderBehavior);

    // Keep them on the screen (simple bounds)
    // Actually, let's just let them wander for now. 
    // Ideally we'd add a bounding box behavior or obstacle avoidance.

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

    btn.addEventListener('click', transformTo3D);
    document.body.appendChild(btn);
}

export function transformTo3D() {
    console.log("Transforming to 3D...");

    // 1. Enable Controls
    controls.enabled = true;

    // 2. Animate Camera
    // We want to move the camera up and back, and look down.
    // Or just rotate the camera.
    // Let's move the camera to a nice perspective view.

    const targetPos = { x: 0, y: 1000, z: 1500 };
    const startPos = camera.position.clone();

    // Simple interpolation (replace with GSAP if available, but using vanilla for now)
    const duration = 2000; // ms
    const startTime = Date.now();

    function updateCamera() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3); // Cubic ease out

        camera.position.x = startPos.x + (targetPos.x - startPos.x) * ease;
        camera.position.y = startPos.y + (targetPos.y - startPos.y) * ease;
        camera.position.z = startPos.z + (targetPos.z - startPos.z) * ease;

        camera.lookAt(0, 0, 0);

        if (progress < 1) {
            requestAnimationFrame(updateCamera);
        } else {
            // Add a floor grid for reference
            const gridHelper = new THREE.GridHelper(5000, 50);
            scene.add(gridHelper);
        }
    }

    updateCamera();
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
    if (controls) controls.update();

    // Render
    renderer.render(scene, camera);
    cssRenderer.render(cssScene, camera);
}

// Expose to global scope for debugging or external triggers
window.SpatialWeb = {
    init: initSpatialWeb,
    transform: transformTo3D,
    scene: scene,
    camera: camera,
    entityManager: entityManager
};
