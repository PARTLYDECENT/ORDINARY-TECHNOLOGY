
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

    // 8. Start Loop
    time = new YUKA.Time();
    animate();

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

// Navigation State
const moveState = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    speed: 60
};

function setupNavigation() {
    document.addEventListener('keydown', (event) => {
        if (!is3DMode) return;

        const handled = ['KeyW', 'KeyS', 'KeyA', 'KeyD', 'KeyE'].includes(event.code);

        if (handled) {
            event.stopPropagation();
            event.preventDefault();
        }

        switch (event.code) {
            case 'KeyW': moveState.forward = true; break;
            case 'KeyS': moveState.backward = true; break;
            case 'KeyA': moveState.left = true; break;
            case 'KeyD': moveState.right = true; break;
            case 'KeyE': exit3DMode(); break;
        }
    }, false);

    document.addEventListener('keyup', (event) => {
        if (!is3DMode) return;

        const handled = ['KeyW', 'KeyS', 'KeyA', 'KeyD'].includes(event.code);

        if (handled) {
            event.stopPropagation();
            event.preventDefault();
        }

        switch (event.code) {
            case 'KeyW': moveState.forward = false; break;
            case 'KeyS': moveState.backward = false; break;
            case 'KeyA': moveState.left = false; break;
            case 'KeyD': moveState.right = false; break;
        }
    }, false);
}

function updateCameraMovement(delta) {
    if (!controls.isLocked) return;
    const actualSpeed = moveState.speed * (delta * 60);
    if (moveState.forward) controls.moveForward(actualSpeed);
    if (moveState.backward) controls.moveForward(-actualSpeed);
    if (moveState.right) controls.moveRight(actualSpeed);
    if (moveState.left) controls.moveRight(-actualSpeed);
}

function setupAgents() {
    entityManager = new YUKA.EntityManager();
    const count = 5;
    for (let i = 0; i < count; i++) {
        createAgent();
    }
}

function createAgent() {
    const x = (Math.random() - 0.5) * 8000;
    const y = (Math.random() - 0.5) * 4000;
    const z = (Math.random() - 0.5) * 8000;

    const orb = new TentacleOrb(scene, new THREE.Vector3(x, y, z), {
        orbSize: 15 + Math.random() * 30,
        length: 80 + Math.random() * 150,
        energyLevel: 0.8 + Math.random()
    });

    const vehicle = new YUKA.Vehicle();
    vehicle.setRenderComponent(orb.group, sync);
    vehicle.position.set(x, y, z);

    const wanderBehavior = new YUKA.WanderBehavior();
    wanderBehavior.radius = 300;
    wanderBehavior.distance = 500;
    wanderBehavior.jitter = 150;
    vehicle.steering.add(wanderBehavior);

    vehicle.maxSpeed = 250;
    entityManager.add(vehicle);
    entities.push(orb);
}

function loadMap() {
    const loader = new GLTFLoader();
    loader.load('map.glb', (gltf) => {
        const map = gltf.scene;
        map.scale.set(100, 100, 100);
        map.position.set(0, -500, 0);
        map.traverse((node) => {
            if (node.isMesh) {
                node.receiveShadow = true;
                if (node.material) {
                    node.material.roughness = 0.8;
                }
            }
        });
        scene.add(map);
    }, undefined, (e) => console.error(e));
}

function createStarfield() {
    const vertices = [];
    for (let i = 0; i < 6000; i++) {
        vertices.push(THREE.MathUtils.randFloatSpread(15000), THREE.MathUtils.randFloatSpread(15000), THREE.MathUtils.randFloatSpread(15000));
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    const material = new THREE.PointsMaterial({ color: 0xffffff, size: 4, sizeAttenuation: true, transparent: true, opacity: 0.8 });
    scene.add(new THREE.Points(geometry, material));
}

function createNebula() {
    const geometry = new THREE.SphereGeometry(9000, 32, 32);
    const material = new THREE.ShaderMaterial({
        side: THREE.BackSide,
        transparent: true,
        uniforms: { time: { value: 0 }, color1: { value: new THREE.Color(0x7a0b2f) }, color2: { value: new THREE.Color(0x050511) } },
        vertexShader: `
            varying vec3 vPosition;
            void main() {
                vPosition = position;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform float time;
            uniform vec3 color1;
            uniform vec3 color2;
            varying vec3 vPosition;
            float noise(vec3 p) { return fract(sin(dot(p, vec3(12.9, 78.2, 45.1))) * 43758.5); }
            void main() {
                float n = noise(vPosition * 0.0005 + time * 0.02);
                gl_FragColor = vec4(mix(color1, color2, n * 0.5 + 0.5), 0.35);
            }
        `
    });
    nebula = new THREE.Mesh(geometry, material);
    scene.add(nebula);
}

function createAsteroidField() {
    const geo = new THREE.IcosahedronGeometry(1, 0);
    const mat = new THREE.MeshStandardMaterial({ color: 0x4A4A52, roughness: 0.9 });
    for (let i = 0; i < 80; i++) {
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(THREE.MathUtils.randFloatSpread(12000), THREE.MathUtils.randFloatSpread(6000), THREE.MathUtils.randFloatSpread(12000));
        const s = 30 + Math.random() * 100;
        mesh.scale.set(s, s, s);
        mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
        scene.add(mesh);
    }
}

function createDataShards() {
    const shardData = [
        { text: "FRAGMENT_01: ORDINARY_CORE_ONLINE", pos: [600, 150, -600] },
        { text: "FRAGMENT_02: UNCERTAINTY_DETECTED", pos: [-1000, 300, 500] },
        { text: "FRAGMENT_03: BUILDING_THE_FUTURE", pos: [300, -50, 1500] }
    ];
    const geo = new THREE.OctahedronGeometry(40, 0);
    const mat = new THREE.MeshStandardMaterial({ color: 0x00ccff, emissive: 0x00ccff, emissiveIntensity: 3, transparent: true, opacity: 0.9 });
    shardData.forEach(data => {
        const shard = new THREE.Mesh(geo, mat);
        shard.position.set(...data.pos);
        shard.userData = { message: data.text, originalY: data.pos[1] };
        scene.add(shard);
        shards.push(shard);
    });
}

function setupWarpEffect() {
    const geo = new THREE.PlaneGeometry(2, 2);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthTest: false });
    warpFlash = new THREE.Mesh(geo, mat);
    warpFlash.position.z = -0.1;
    camera.add(warpFlash);
}

function setupAudio() { }

function createInfiniteGrid() {
    const geometry = new THREE.PlaneGeometry(2, 2, 1, 1);
    const material = new THREE.ShaderMaterial({
        side: THREE.DoubleSide,
        transparent: true,
        uniforms: {
            time: { value: 0 },
            gridScale: { value: 100 },
            gridThickness: { value: 1.5 },
            gridColor: { value: new THREE.Color(0xD16847) },
            fadeDistance: { value: 5000 },
            pulseSpeed: { value: 0.5 }
        },
        vertexShader: `
            varying vec3 vWorldPosition;
            void main() {
                vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                vWorldPosition = worldPosition.xyz;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform float time;
            uniform float gridScale;
            uniform float gridThickness;
            uniform vec3 gridColor;
            uniform float fadeDistance;
            uniform float pulseSpeed;
            varying vec3 vWorldPosition;

            void main() {
                vec2 coord = vWorldPosition.xz / gridScale;
                vec2 grid = abs(fract(coord - 0.5) - 0.5) / fwidth(coord);
                float line = min(grid.x, grid.y);
                float gridStrength = 1.0 - min(line / gridThickness, 1.0);
                
                // Distance fade
                float dist = length(vWorldPosition.xz);
                float fade = 1.0 - smoothstep(fadeDistance * 0.5, fadeDistance, dist);
                
                // Pulsing energy through grid
                float pulse = sin(time * pulseSpeed + coord.x * 0.5 + coord.y * 0.5) * 0.3 + 0.7;
                
                vec3 color = gridColor * pulse;
                float alpha = gridStrength * fade * 0.6;
                
                gl_FragColor = vec4(color, alpha);
            }
        `
    });

    infiniteGrid = new THREE.Mesh(geometry, material);
    infiniteGrid.rotation.x = -Math.PI / 2;
    infiniteGrid.scale.set(100000, 100000, 1);
    infiniteGrid.position.y = -50;
    infiniteGrid.name = "infiniteGrid";
    scene.add(infiniteGrid);
}

function createGridCreatures() {
    console.log("🧬 createGridCreatures() called");
    try {
        const creatureCount = 8;
        for (let i = 0; i < creatureCount; i++) {
            const x = (Math.random() - 0.5) * 1500;
            const z = (Math.random() - 0.5) * 1500;
            createGridCreature(x, z);
        }
        console.log(`🧬 Created ${creatureCount} grid creatures`);
    } catch (e) {
        console.error("❌ Error creating grid creatures:", e);
    }
}

function createGridCreature(x, z) {
    try {
        const creature = {
            position: new THREE.Vector3(x, -50, z),
            phase: Math.random() * Math.PI * 2,
            evolutionStage: 0,
            evolutionTimer: 0,
            evolutionDuration: 8 + Math.random() * 7,
            segments: [],
            core: null,
            targetHeight: 0,
            currentHeight: 0
        };

        // Core crystal - START VISIBLE for debugging
        const coreGeo = new THREE.OctahedronGeometry(40, 0);
        const coreMat = new THREE.MeshStandardMaterial({
            color: 0xFF6B3F,
            emissive: 0xFF6B3F,
            emissiveIntensity: 3,
            transparent: true,
            opacity: 0.5, // START VISIBLE
            roughness: 0.2,
            metalness: 0.8
        });
        creature.core = new THREE.Mesh(coreGeo, coreMat);
        creature.core.position.copy(creature.position);
        scene.add(creature.core);

        // Grid segments - START VISIBLE
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const segmentGeo = new THREE.BoxGeometry(10, 4, 120);
            const segmentMat = new THREE.MeshStandardMaterial({
                color: 0xD16847,
                emissive: 0xD16847,
                emissiveIntensity: 2,
                transparent: true,
                opacity: 0.3 // START VISIBLE
            });
            const segment = new THREE.Mesh(segmentGeo, segmentMat);
            segment.userData = { angle, baseLength: 120, currentLength: 60 }; // START EXTENDED
            scene.add(segment);
            creature.segments.push(segment);
        }

        gridCreatures.push(creature);
        console.log(`🧬 Grid creature spawned at (${x.toFixed(0)}, ${z.toFixed(0)})`);
    } catch (e) {
        console.error("❌ Error in createGridCreature:", e);
    }
}

function updateGridCreatures(delta) {
    gridCreatures.forEach(creature => {
        creature.evolutionTimer += delta;
        const evolutionProgress = Math.min(creature.evolutionTimer / creature.evolutionDuration, 1);

        // Evolution stages
        if (evolutionProgress < 0.3) {
            // Stage 1: Emergence - core rises from grid
            creature.evolutionStage = 1;
            creature.targetHeight = 100 * (evolutionProgress / 0.3);
            creature.core.material.opacity = evolutionProgress / 0.3;
        } else if (evolutionProgress < 0.6) {
            // Stage 2: Grid segments extend outward
            creature.evolutionStage = 2;
            const segmentProgress = (evolutionProgress - 0.3) / 0.3;
            creature.segments.forEach((seg, i) => {
                seg.userData.currentLength = seg.userData.baseLength * segmentProgress;
                seg.material.opacity = segmentProgress;
            });
        } else if (evolutionProgress < 1.0) {
            // Stage 3: Full form - rotation and pulsing
            creature.evolutionStage = 3;
            creature.targetHeight = 100 + Math.sin(time.elapsedTime * 2 + creature.phase) * 50;
        } else {
            // Stage 4: Transcendence - dissolve and respawn
            const dissolve = (evolutionProgress - 1) * 2;
            creature.core.material.opacity = Math.max(0, 1 - dissolve);
            creature.segments.forEach(seg => seg.material.opacity = Math.max(0, 1 - dissolve));

            if (dissolve > 1) {
                // Respawn at new location
                creature.position.x = (Math.random() - 0.5) * 3000;
                creature.position.z = (Math.random() - 0.5) * 3000;
                creature.evolutionTimer = 0;
                creature.currentHeight = 0;
            }
        }

        // Smooth height transition
        creature.currentHeight += (creature.targetHeight - creature.currentHeight) * delta * 2;
        creature.core.position.y = creature.position.y + creature.currentHeight;
        creature.core.rotation.y += delta * 2;
        creature.core.rotation.x = Math.sin(time.elapsedTime + creature.phase) * 0.3;

        // Update segments
        creature.segments.forEach((seg, i) => {
            const angle = seg.userData.angle + time.elapsedTime * 0.5;
            const radius = seg.userData.currentLength / 2;
            const height = creature.currentHeight + Math.sin(time.elapsedTime * 3 + i) * 20;

            seg.position.set(
                creature.position.x + Math.cos(angle) * radius,
                creature.position.y + height,
                creature.position.z + Math.sin(angle) * radius
            );
            seg.rotation.y = angle;
            seg.rotation.z = Math.sin(time.elapsedTime * 2 + i) * 0.2;

            // Pulsing emissive
            const pulse = Math.sin(time.elapsedTime * 4 + i) * 0.5 + 1.5;
            seg.material.emissiveIntensity = pulse;
        });
    });
}

function triggerWarp() {
    if (!warpFlash) return;
    warpFlash.material.opacity = 1;
    let fade = setInterval(() => {
        warpFlash.material.opacity -= 0.08;
        if (warpFlash.material.opacity <= 0) {
            warpFlash.material.opacity = 0;
            clearInterval(fade);
        }
    }, 20);
}

function sync(entity, renderComponent) {
    renderComponent.matrix.copy(entity.worldMatrix);
}

function createCSS3DPage() {
    const container = document.getElementById('css3d-container');
    if (!container) return;
    const pageObject = new CSS3DObject(container);
    pageObject.position.set(0, 0, 0);
    cssScene.add(pageObject);
    container.style.width = window.innerWidth + 'px';
    container.style.height = window.innerHeight + 'px';
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

function setupRenderers() {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.domElement.style.position = 'fixed';
    renderer.domElement.style.top = '0';
    renderer.domElement.style.left = '0';
    renderer.domElement.style.zIndex = '-2';
    renderer.domElement.style.pointerEvents = 'none'; // Don't block scrolling
    document.body.appendChild(renderer.domElement);

    const renderScene = new RenderPass(scene, camera);
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
    bloomPass.threshold = 0.15; bloomPass.strength = 1.4; bloomPass.radius = 0.6;
    composer = new EffectComposer(renderer);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);

    cssRenderer = new CSS3DRenderer();
    cssRenderer.setSize(window.innerWidth, window.innerHeight);
    cssRenderer.domElement.style.position = 'fixed';
    cssRenderer.domElement.style.top = '0';
    cssRenderer.domElement.style.left = '0';
    cssRenderer.domElement.style.zIndex = '-1';
    cssRenderer.domElement.style.pointerEvents = 'none'; // Don't block scrolling
    document.body.appendChild(cssRenderer.domElement);
}

// REMOVED FUNCTION: addTriggerButton (This was causing the ghost latching)

function createOverlays() {
    if (document.getElementById('instructions-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'instructions-overlay';
    overlay.style.position = 'fixed'; overlay.style.top = '50%'; overlay.style.left = '50%';
    overlay.style.transform = 'translate(-50%, -50%)'; overlay.style.color = 'white';
    overlay.style.backgroundColor = 'rgba(0,0,0,0.8)'; overlay.style.padding = '30px';
    overlay.style.borderRadius = '15px'; overlay.style.fontFamily = 'Space Grotesk, sans-serif';
    overlay.style.textAlign = 'center'; overlay.style.zIndex = '10001';
    overlay.style.pointerEvents = 'none'; overlay.style.display = 'none'; overlay.style.border = '1px solid var(--tertiary)';
    overlay.innerHTML = `
        <h2 style="color:var(--tertiary); margin-bottom:15px;">3D MODE ACTIVE</h2>
        <p style="margin-bottom:10px;"><b>WASD</b> TO MOVE | <b>MOUSE</b> TO LOOK</p>
        <p style="margin-bottom:10px;"><b>ESC</b> TO UNLOCK CURSOR</p>
        <p><b>E</b> TO EXIT</p>
    `;
    document.body.appendChild(overlay);

    const hud = document.createElement('div');
    hud.id = 'hud-display';
    hud.style.position = 'fixed'; hud.style.top = '0'; hud.style.left = '0';
    hud.style.width = '100%'; hud.style.height = '100%';
    hud.style.pointerEvents = 'none'; // Critical: prevent blocking
    hud.style.zIndex = '500'; hud.style.display = 'none';
    hud.innerHTML = `
        <div style="position: absolute; top: 40px; left: 40px; border-left: 2px solid var(--tertiary); padding-left: 20px; font-family: monospace; filter: drop-shadow(0 0 10px var(--tertiary)); pointer-events: none;">
            <div style="color: var(--tertiary); font-weight: bold; letter-spacing: 3px; font-size: 18px;">SCANNER ACTIVE//</div>
            <div id="hud-status" style="font-size: 14px; margin-top: 8px; opacity: 0.9; color: white;">INITIALIZING...</div>
            <div id="hud-coords" style="font-size: 11px; margin-top: 5px; opacity: 0.7; color: rgba(255,255,255,0.6);">X: 0 Y: 0 Z: 0</div>
        </div>
        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 60px; height: 60px; border: 1px solid rgba(255,107,63,0.3); border-radius: 50%; pointer-events: none;">
            <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 4px; height: 4px; background: var(--tertiary); border-radius: 50%; pointer-events: none;"></div>
        </div>
    `;
    document.body.appendChild(hud);
}

let is3DMode = false;
function toggle3DMode() { if (is3DMode) exit3DMode(); else transformTo3D(); }

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
    // Infinite grid remains
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight); cssRenderer.setSize(window.innerWidth, window.innerHeight);
    if (composer) composer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
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

window.SpatialWeb = { init: initSpatialWeb, transform: transformTo3D, exit: exit3DMode, scene, camera, entityManager };
