
import * as THREE from 'three';
import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';

console.log("Spatial Web Controller: Loaded");

// Globals
let worker;
let is3DMode = false;
let webglCanvas;
let cssRenderer, cssScene, dummyCamera;
let workerInitialized = false;

// Initialization
export function initSpatialWeb() {
    console.log("Initializing Spatial Web Controller...");

    // 1. Setup CSS3D Scene (Main Thread Only)
    cssScene = new THREE.Scene();

    // 2. Setup Dummy Camera (synced from worker)
    const fov = 75;
    dummyCamera = new THREE.PerspectiveCamera(fov, window.innerWidth / window.innerHeight, 1, 15000);

    // 3. Create Canvases & Worker
    setupRenderersAndWorker();

    // 4. Setup Input Listeners
    setupInputForwarding();

    // 5. Events
    window.addEventListener('resize', onWindowResize);
}

function setupRenderersAndWorker() {
    // A. WebGL Canvas (Visuals)
    webglCanvas = document.createElement('canvas');
    webglCanvas.style.position = 'fixed';
    webglCanvas.style.top = '0';
    webglCanvas.style.left = '0';
    webglCanvas.style.width = '100%';
    webglCanvas.style.height = '100%';
    webglCanvas.style.zIndex = '-2';
    webglCanvas.style.pointerEvents = 'none';
    webglCanvas.style.display = 'none'; // Hidden by default
    document.body.appendChild(webglCanvas);

    // B. CSS3D Renderer (DOM Content)
    cssRenderer = new CSS3DRenderer();
    cssRenderer.setSize(window.innerWidth, window.innerHeight);
    cssRenderer.domElement.style.position = 'fixed';
    cssRenderer.domElement.style.top = '0';
    cssRenderer.domElement.style.left = '0';
    cssRenderer.domElement.style.zIndex = '-1';
    cssRenderer.domElement.style.pointerEvents = 'none';
    cssRenderer.domElement.style.display = 'none'; // Hidden by default
    document.body.appendChild(cssRenderer.domElement);

    // C. Initialize Worker
    worker = new Worker(new URL('./spatial-worker.js', import.meta.url), { type: 'module' });

    worker.onmessage = handleWorkerMessage;

    // D. Transfer Control
    const offscreen = webglCanvas.transferControlToOffscreen();

    worker.postMessage({
        type: 'init',
        payload: {
            canvas: offscreen,
            width: window.innerWidth,
            height: window.innerHeight,
            pixelRatio: window.devicePixelRatio,
            fov: 75
        }
    }, [offscreen]);

    workerInitialized = true;
}

function handleWorkerMessage(e) {
    const { type, payload } = e.data;

    if (type === 'camera_sync') {
        // Sync Dummy Camera for CSS3D
        dummyCamera.matrix.fromArray(payload.matrix);
        dummyCamera.matrix.decompose(dummyCamera.position, dummyCamera.quaternion, dummyCamera.scale);

        // Render CSS3D (Only when 3D mode is active)
        if (is3DMode) {
            cssRenderer.render(cssScene, dummyCamera);

            // Update HUD
            const hudCoords = document.getElementById('hud-coords');
            if (hudCoords) {
                const p = dummyCamera.position;
                hudCoords.innerText = `X: ${Math.round(p.x)} Y: ${Math.round(p.y)} Z: ${Math.round(p.z)}`;
            }
        }
    }
}

// Input Handling
function setupInputForwarding() {
    // Keyboard
    document.addEventListener('keydown', (e) => {
        if (!is3DMode) return;
        if (['KeyW', 'KeyS', 'KeyA', 'KeyD', 'KeyE'].includes(e.code)) {
            if (e.code === 'KeyE') { exit3DMode(); return; }
            worker.postMessage({ type: 'input_key', payload: { code: e.code, isDown: true } });
        }
    });

    document.addEventListener('keyup', (e) => {
        if (!is3DMode) return;
        if (['KeyW', 'KeyS', 'KeyA', 'KeyD'].includes(e.code)) {
            worker.postMessage({ type: 'input_key', payload: { code: e.code, isDown: false } });
        }
    });

    // Mouse (Pointer Lock)
    document.addEventListener('mousemove', (e) => {
        if (!is3DMode || document.pointerLockElement !== document.body) return;
        worker.postMessage({
            type: 'input_move',
            payload: { movementX: e.movementX, movementY: e.movementY }
        });
    });

    document.addEventListener('mousedown', () => {
        if (is3DMode && document.pointerLockElement !== document.body) {
            document.body.requestPointerLock();
        }
    });
}

// Mode Switching
export function transformTo3D() {
    is3DMode = true;
    window.dispatchEvent(new CustomEvent('spatial-web-3d-active'));

    // Show canvases
    webglCanvas.style.display = 'block';
    cssRenderer.domElement.style.display = 'block';

    // UI
    createOverlays();
    if (!cssScene.getObjectByName("appPlanesGroup")) createAppPlanes();

    const overlay = document.getElementById('instructions-overlay');
    const hud = document.getElementById('hud-display');
    if (overlay) { overlay.style.display = 'block'; setTimeout(() => overlay.style.display = 'none', 5000); }
    if (hud) hud.style.display = 'block';

    // Lock Pointer
    document.body.requestPointerLock();

    // Start Worker Loop? (Worker runs loop by default after init, maybe add explicit start/stop later for perf)
}

export function exit3DMode() {
    is3DMode = false;
    window.dispatchEvent(new CustomEvent('spatial-web-3d-inactive'));

    // Hide canvases
    webglCanvas.style.display = 'none';
    cssRenderer.domElement.style.display = 'none';

    // UI
    const overlay = document.getElementById('instructions-overlay');
    const hud = document.getElementById('hud-display');
    if (overlay) overlay.style.display = 'none';
    if (hud) hud.style.display = 'none';

    document.exitPointerLock();
}

function onWindowResize() {
    if (!workerInitialized) return;
    worker.postMessage({
        type: 'resize',
        payload: { width: window.innerWidth, height: window.innerHeight }
    });
    cssRenderer.setSize(window.innerWidth, window.innerHeight);
    dummyCamera.aspect = window.innerWidth / window.innerHeight;
    dummyCamera.updateProjectionMatrix();
}

// Helpers (UI Content)
function createOverlays() {
    if (document.getElementById('instructions-overlay')) return;

    // ... Copy of overlay creation code ...
    const overlay = document.createElement('div');
    overlay.id = 'instructions-overlay';
    // (Styles same as before)
    overlay.style.position = 'fixed'; overlay.style.top = '50%'; overlay.style.left = '50%';
    overlay.style.transform = 'translate(-50%, -50%)'; overlay.style.color = 'white';
    overlay.style.backgroundColor = 'rgba(0,0,0,0.8)'; overlay.style.padding = '30px';
    overlay.style.borderRadius = '15px'; overlay.style.fontFamily = 'Space Grotesk, sans-serif';
    overlay.style.textAlign = 'center'; overlay.style.zIndex = '10001';
    overlay.style.pointerEvents = 'none'; overlay.style.display = 'none'; overlay.style.border = '1px solid var(--tertiary)';
    overlay.innerHTML = `<h2 style="color:var(--tertiary); margin-bottom:15px;">3D MODE ACTIVE (WORKER ACCELERATED)</h2><p><b>WASD</b> MOVE | <b>MOUSE</b> LOOK | <b>E</b> EXIT</p>`;
    document.body.appendChild(overlay);

    const hud = document.createElement('div');
    hud.id = 'hud-display';
    hud.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:500;display:none;";
    hud.innerHTML = `
        <div style="position: absolute; top: 40px; left: 40px; border-left: 2px solid var(--tertiary); padding-left: 20px; font-family: monospace; filter: drop-shadow(0 0 10px var(--tertiary));">
            <div style="color: var(--tertiary); font-weight: bold; letter-spacing: 3px; font-size: 18px;">SCANNER ACTIVE//</div>
            <div id="hud-coords" style="font-size: 11px; margin-top: 5px; opacity: 0.7; color: rgba(255,255,255,0.6);">X: 0 Y: 0 Z: 0</div>
        </div>
        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 60px; height: 60px; border: 1px solid rgba(255,107,63,0.3); border-radius: 50%;">
            <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 4px; height: 4px; background: var(--tertiary); border-radius: 50%;"></div>
        </div>
    `;
    document.body.appendChild(hud);
}

function createAppPlanes() {
    const group = new THREE.Group();
    group.name = "appPlanesGroup";
    const apps = [
        { name: "Music", url: "liquidMusic.html", color: "#D16847" },
        { name: "Video", url: "videoPlayer.html", color: "#E89B6A" },
        { name: "AI", url: "ai.html", color: "#FF6B3F" },
        { name: "Game", url: "game.html", color: "#306d3f" },
        { name: "Forum", url: "forum.html", color: "#4A4A52" },
        { name: "Settings", url: "settings.html", color: "#B8865C" }
    ];
    const w = 800, h = 600, gap = 400;
    const startX = -((apps.length * (w + gap)) / 2) + (w / 2);

    apps.forEach((app, i) => {
        const div = document.createElement('div');
        div.style.width = w + 'px'; div.style.height = h + 'px';
        div.style.backgroundColor = 'rgba(0,0,0,0.85)';
        div.style.border = `2px solid ${app.color}`;
        div.style.borderRadius = '12px'; div.style.overflow = 'hidden';
        div.style.boxShadow = `0 0 30px ${app.color}`;

        const header = document.createElement('div');
        header.innerText = app.name;
        header.style.backgroundColor = app.color;
        header.style.color = 'white'; header.style.padding = '12px';
        header.style.fontFamily = 'Space Grotesk, sans-serif'; header.style.fontWeight = 'bold';
        header.style.textAlign = 'center'; header.style.textTransform = 'uppercase';
        header.style.letterSpacing = '3px';
        div.appendChild(header);

        const iframe = document.createElement('iframe');
        iframe.src = app.url; iframe.style.width = '100%'; iframe.style.height = 'calc(100% - 48px)';
        iframe.style.border = 'none'; iframe.style.backgroundColor = 'transparent';
        div.appendChild(iframe);

        const object = new CSS3DObject(div);
        object.position.set(startX + (i * (w + gap)), 0, -1500);
        group.add(object);
    });
    cssScene.add(group);
}

window.SpatialWeb = {
    init: initSpatialWeb,
    transform: transformTo3D,
    exit: exit3DMode,
    get3DMode: () => is3DMode
};
