
import * as THREE from 'three';
import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { TentacleOrb } from './tentacle_orb_three.js';
import * as YUKA from 'yuka';

console.log("Spatial Web Module Loaded");

// Configuration
const config = {
    fov: 75,
    cameraZ: 1000
};

// Global Variables
let scene, cssScene, camera, renderer, cssRenderer, controls;
let entityManager, time, composer;
let entities = [];
let nebula, warpFlash;
let shards = [];
let gridCreatures = [];
let infiniteGrid;

// Initialization
export function initSpatialWeb() {
    console.log("Initializing Spatial Web... v2 (NO BUTTON)");

    // 1. Setup Scenes
    scene = new THREE.Scene();
    cssScene = new THREE.Scene();

    // 2. Setup Camera
    const fov = config.fov;
    const distance = (window.innerHeight / 2) / Math.tan((fov * Math.PI / 180) / 2);
    config.cameraZ = distance;

    camera = new THREE.PerspectiveCamera(fov, window.innerWidth / window.innerHeight, 1, 15000);
    camera.position.set(0, 0, distance);

    // 3. Setup Renderers
    setupRenderers();

    // 4. Create CSS3D Object from DOM
    // createCSS3DPage(); // DISABLED: fixes scroll blocking on load

    // 5. Setup Controls (FPS Style)
    controls = new PointerLockControls(camera, document.body);

    controls.addEventListener('unlock', () => {
        console.log("Controls unlocked");
    });

    // 6. Lights & Atmosphere
    scene.fog = new THREE.FogExp2(0x050511, 0.00015);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.5);
    hemiLight.position.set(0, 1000, 0);
    scene.add(hemiLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    directionalLight.position.set(500, 1000, 500);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // 7. Event Listeners
    window.addEventListener('resize', onWindowResize);

    // 8. Start Loop - DISABLED by default to save performance for main shader
    time = new YUKA.Time();
    // animate(); // Only start when needed
    console.log("Spatial Web Initialized - Standby Mode");

    // 9. UI Components (Lazy Loaded in transformTo3D)
    // addTriggerButton(); // REMOVED to prevent ghost latching

    // 10. Environment & Content
    setupAgents();
    setupNavigation();
    loadMap();
    createStarfield();
    createNebula();
    createAsteroidField();
    createDataShards();
    setupWarpEffect();
    setupAudio();
    createInfiniteGrid();
    createGridCreatures();
}

// ... existing state code ...

let animationFrameId = null;

export function transformTo3D() {
    is3DMode = true;

    // Lazy load overlays only when needed
    createOverlays();
    createCSS3DPage(); // Transform content to 3D now

    const overlay = document.getElementById('instructions-overlay');
    const hud = document.getElementById('hud-display');
    if (overlay) { overlay.style.display = 'block'; setTimeout(() => overlay.style.display = 'none', 5000); }
    if (hud) hud.style.display = 'block';

    controls.lock();
    triggerWarp();
    if (window.Tone && Tone.context.state !== 'running') {
        Tone.start();
        const synth = new Tone.NoiseSynth({ noise: { type: "pink" }, envelope: { sustain: 0.1 } }).toDestination();
        synth.triggerAttackRelease("4n");
    }
    camera.position.set(0, 800, 1500);
    camera.lookAt(0, 0, 0);
    // Infinite grid is always present, no need to add
    if (!cssScene.getObjectByName("appPlanesGroup")) createAppPlanes();

    // Start Animation Loop if not running
    if (!animationFrameId) {
        animate();
    }
}

export function exit3DMode() {
    is3DMode = false;
    moveState.forward = moveState.backward = moveState.left = moveState.right = false;
    // Button is disabled, no need to update text
    const overlay = document.getElementById('instructions-overlay');
    const hud = document.getElementById('hud-display');
    if (overlay) overlay.style.display = 'none';
    if (hud) hud.style.display = 'none';

    // Ensure pointer lock is fully released
    if (controls.isLocked) {
        controls.unlock();
    }

    // Restore scrolling capability
    document.body.style.overflowY = 'auto';

    camera.position.set(0, 0, config.cameraZ);
    camera.rotation.set(0, 0, 0); camera.lookAt(0, 0, 0);

    // Stop Animation Loop to save resources
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }

    // Clear renderer to transparent so main shader shows through
    if (renderer) {
        renderer.clear();
        renderer.domElement.style.display = 'none'; // Hide canvas
    }
    if (cssRenderer) {
        cssRenderer.domElement.style.display = 'none';
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight); cssRenderer.setSize(window.innerWidth, window.innerHeight);
    if (composer) composer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    if (!is3DMode) {
        animationFrameId = null;
        return;
    }

    // Ensure visible
    if (renderer && renderer.domElement.style.display === 'none') renderer.domElement.style.display = 'block';
    if (cssRenderer && cssRenderer.domElement.style.display === 'none') cssRenderer.domElement.style.display = 'block';

    animationFrameId = requestAnimationFrame(animate);
    const delta = time.update().getDelta();
    if (entityManager) entityManager.update(delta);
    entities.forEach(e => e.update(delta));
    if (nebula && nebula.material.uniforms) nebula.material.uniforms.time.value = time.elapsedTime;
    if (infiniteGrid && infiniteGrid.material.uniforms) infiniteGrid.material.uniforms.time.value = time.elapsedTime;
    updateGridCreatures(delta);
    updateCameraMovement(delta);

    if (is3DMode) {
        const hudCoords = document.getElementById('hud-coords');
        const hudStatus = document.getElementById('hud-status');
        if (hudCoords) hudCoords.innerText = `X: ${Math.round(camera.position.x)} Y: ${Math.round(camera.position.y)} Z: ${Math.round(camera.position.z)}`;

        let found = false;
        shards.forEach(s => {
            s.rotation.y += delta; s.position.y = s.userData.originalY + Math.sin(time.elapsedTime * 1.5) * 15;
            if (camera.position.distanceTo(s.position) < 300) {
                if (hudStatus) { hudStatus.innerText = `[!] ${s.userData.message}`; hudStatus.style.color = 'var(--tertiary)'; }
                found = true;
            }
        });
        if (!found && hudStatus) { hudStatus.innerText = "SCANNING FOR LIFEFORMS..."; hudStatus.style.color = 'white'; }
    }

    if (composer) composer.render(); else renderer.render(scene, camera);
    cssRenderer.render(cssScene, camera);
}


window.SpatialWeb = { 
    init: initSpatialWeb, 
    transform: transformTo3D, 
    exit: exit3DMode, 
    scene, 
    camera, 
    entityManager,
    get3DMode: () => is3DMode 
};
