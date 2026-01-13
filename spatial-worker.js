
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { TentacleOrb } from './tentacle_orb_three.js';
import * as YUKA from 'yuka';

console.log("Spatial Worker: Loaded");

// Globals
let scene, camera, renderer, composer;
let entityManager, time;
let entities = [];
let nebula, warpFlash;
let shards = [];
let gridCreatures = [];
let infiniteGrid;
let config = { fov: 75, cameraZ: 1000 };

// Navigation State (Mirrored from Main)
const moveState = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    speed: 60
};

// Camera State
const cameraState = {
    yaw: 0,
    pitch: 0
};

// Messaging Loop
self.onmessage = function (e) {
    const type = e.data.type;
    const payload = e.data.payload;

    if (type === 'init') {
        init(payload);
    } else if (type === 'resize') {
        handleResize(payload);
    } else if (type === 'input_key') {
        handleKey(payload);
    } else if (type === 'input_move') {
        handleMove(payload);
    } else if (type === 'start') {
        // Start loop
    } else if (type === 'stop') {
        // Stop loop (optional, we might just keep running or pause)
    }
};

function init({ canvas, width, height, pixelRatio, fov }) {
    console.log("Spatial Worker: Initializing...");

    config.fov = fov;

    // 1. Setup Scene
    scene = new THREE.Scene();

    // 2. Setup Camera
    camera = new THREE.PerspectiveCamera(fov, width / height, 1, 15000);
    const distance = (height / 2) / Math.tan((fov * Math.PI / 180) / 2);
    config.cameraZ = distance;
    camera.position.set(0, 800, 1500); // Start High
    camera.lookAt(0, 0, 0);

    // Init Camera Euler for custom control
    const euler = new THREE.Euler(0, 0, 0, 'YXZ');
    euler.setFromQuaternion(camera.quaternion);
    cameraState.yaw = euler.y;
    cameraState.pitch = euler.x;

    // 3. Setup Renderer (WebGL)
    renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    renderer.setSize(width, height, false); // false = don't set style
    renderer.setPixelRatio(pixelRatio);

    // Composer
    const renderScene = new RenderPass(scene, camera);
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(width, height), 1.5, 0.4, 0.85);
    bloomPass.threshold = 0.15; bloomPass.strength = 1.4; bloomPass.radius = 0.6;
    composer = new EffectComposer(renderer);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);

    // 4. Lights
    scene.fog = new THREE.FogExp2(0x050511, 0.00015);
    scene.add(new THREE.AmbientLight(0xffffff, 0.2));
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.5);
    hemiLight.position.set(0, 1000, 0);
    scene.add(hemiLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(500, 1000, 500);
    scene.add(dirLight);

    // 5. Environment
    setupAgents();
    loadMap();
    createStarfield();
    createNebula();
    createAsteroidField();
    createDataShards();
    setupWarpEffect();
    createInfiniteGrid();
    createGridCreatures();

    // 6. Time & Loop
    time = new YUKA.Time();
    animate();
}

function handleResize({ width, height }) {
    if (!camera || !renderer) return;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    if (composer) composer.setSize(width, height);
}

function handleKey({ code, isDown }) {
    switch (code) {
        case 'KeyW': moveState.forward = isDown; break;
        case 'KeyS': moveState.backward = isDown; break;
        case 'KeyA': moveState.left = isDown; break;
        case 'KeyD': moveState.right = isDown; break;
    }
}

function handleMove({ movementX, movementY }) {
    if (!camera) return;

    const sensitivity = 0.002;
    cameraState.yaw -= movementX * sensitivity;
    cameraState.pitch -= movementY * sensitivity;

    // Clamp pitch
    cameraState.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, cameraState.pitch));

    camera.quaternion.setFromEuler(new THREE.Euler(cameraState.pitch, cameraState.yaw, 0, 'YXZ'));
}


function animate() {
    requestAnimationFrame(animate);

    if (!renderer) return;

    const delta = time.update().getDelta();
    const elapsedTime = time.elapsedTime;

    // Logic Updates
    if (entityManager) entityManager.update(delta);
    entities.forEach(e => e.update(delta));
    if (nebula && nebula.material.uniforms) nebula.material.uniforms.time.value = elapsedTime;
    if (infiniteGrid && infiniteGrid.material.uniforms) infiniteGrid.material.uniforms.time.value = elapsedTime;

    updateGridCreatures(delta);
    updateCameraMovement(delta); // Updates Position

    // Render
    if (composer) composer.render();

    // Sync Camera to Main
    // We send the matrix elements as a typed array for speed
    self.postMessage({
        type: 'camera_sync',
        payload: {
            matrix: camera.matrixWorld.elements,
            position: camera.position,
            rotation: camera.rotation // optional debug
        }
    });
}

function updateCameraMovement(delta) {
    const actualSpeed = moveState.speed * (delta * 60);
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    forward.y = 0; forward.normalize();
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    right.y = 0; right.normalize();

    if (moveState.forward) camera.position.add(forward.multiplyScalar(actualSpeed));
    if (moveState.backward) camera.position.add(forward.multiplyScalar(-actualSpeed));
    if (moveState.right) camera.position.add(right.multiplyScalar(actualSpeed));
    if (moveState.left) camera.position.add(right.multiplyScalar(-actualSpeed));
}

// --- Content Creation Functions (Copied & Adapted) ---

function setupAgents() {
    entityManager = new YUKA.EntityManager();
    for (let i = 0; i < 5; i++) {
        const x = (Math.random() - 0.5) * 8000;
        const y = (Math.random() - 0.5) * 4000;
        const z = (Math.random() - 0.5) * 8000;

        const orb = new TentacleOrb(scene, new THREE.Vector3(x, y, z), {
            orbSize: 15 + Math.random() * 30,
            length: 80 + Math.random() * 150,
            energyLevel: 0.8 + Math.random()
        });

        const vehicle = new YUKA.Vehicle();
        vehicle.setRenderComponent(orb.group, (entity, component) => component.matrix.copy(entity.worldMatrix));
        vehicle.position.set(x, y, z);

        const wanderBehavior = new YUKA.WanderBehavior();
        wanderBehavior.radius = 300; wanderBehavior.distance = 500; wanderBehavior.jitter = 150;
        vehicle.steering.add(wanderBehavior);
        vehicle.maxSpeed = 250;

        entityManager.add(vehicle);
        entities.push(orb);
    }
}

function loadMap() {
    const loader = new GLTFLoader();
    loader.load('map.glb', (gltf) => {
        const map = gltf.scene;
        map.scale.set(100, 100, 100);
        map.position.set(0, -500, 0);
        scene.add(map);
    }, undefined, (e) => console.log("Map load error (expected if no map)", e));
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
        side: THREE.BackSide, transparent: true,
        uniforms: { time: { value: 0 }, color1: { value: new THREE.Color(0x7a0b2f) }, color2: { value: new THREE.Color(0x050511) } },
        vertexShader: `varying vec3 vPosition; void main() { vPosition = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: `uniform float time; uniform vec3 color1; uniform vec3 color2; varying vec3 vPosition; float noise(vec3 p) { return fract(sin(dot(p, vec3(12.9, 78.2, 45.1))) * 43758.5); } void main() { float n = noise(vPosition * 0.0005 + time * 0.02); gl_FragColor = vec4(mix(color1, color2, n * 0.5 + 0.5), 0.35); }`
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

function createInfiniteGrid() {
    const geometry = new THREE.PlaneGeometry(2, 2, 1, 1);
    const material = new THREE.ShaderMaterial({
        side: THREE.DoubleSide, transparent: true,
        uniforms: { time: { value: 0 }, gridScale: { value: 100 }, gridThickness: { value: 1.5 }, gridColor: { value: new THREE.Color(0xD16847) }, fadeDistance: { value: 5000 }, pulseSpeed: { value: 0.5 } },
        vertexShader: `varying vec3 vWorldPosition; void main() { vec4 worldPosition = modelMatrix * vec4(position, 1.0); vWorldPosition = worldPosition.xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: `uniform float time; uniform float gridScale; uniform float gridThickness; uniform vec3 gridColor; uniform float fadeDistance; uniform float pulseSpeed; varying vec3 vWorldPosition; void main() { vec2 coord = vWorldPosition.xz / gridScale; vec2 grid = abs(fract(coord - 0.5) - 0.5) / fwidth(coord); float line = min(grid.x, grid.y); float gridStrength = 1.0 - min(line / gridThickness, 1.0); float dist = length(vWorldPosition.xz); float fade = 1.0 - smoothstep(fadeDistance * 0.5, fadeDistance, dist); float pulse = sin(time * pulseSpeed + coord.x * 0.5 + coord.y * 0.5) * 0.3 + 0.7; vec3 color = gridColor * pulse; float alpha = gridStrength * fade * 0.6; gl_FragColor = vec4(color, alpha); }`
    });
    infiniteGrid = new THREE.Mesh(geometry, material);
    infiniteGrid.rotation.x = -Math.PI / 2;
    infiniteGrid.scale.set(100000, 100000, 1);
    infiniteGrid.position.y = -50;
    scene.add(infiniteGrid);
}

function createGridCreatures() {
    const creatureCount = 8;
    for (let i = 0; i < creatureCount; i++) {
        const x = (Math.random() - 0.5) * 1500;
        const z = (Math.random() - 0.5) * 1500;
        createGridCreature(x, z);
    }
}

function createGridCreature(x, z) {
    const creature = { position: new THREE.Vector3(x, -50, z), phase: Math.random() * Math.PI * 2, evolutionStage: 0, evolutionTimer: 0, evolutionDuration: 8 + Math.random() * 7, segments: [], core: null, targetHeight: 0, currentHeight: 0 };
    const coreGeo = new THREE.OctahedronGeometry(40, 0);
    const coreMat = new THREE.MeshStandardMaterial({ color: 0xFF6B3F, emissive: 0xFF6B3F, emissiveIntensity: 3, transparent: true, opacity: 0.5, roughness: 0.2, metalness: 0.8 });
    creature.core = new THREE.Mesh(coreGeo, coreMat);
    creature.core.position.copy(creature.position);
    scene.add(creature.core);

    for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const segmentGeo = new THREE.BoxGeometry(10, 4, 120);
        const segmentMat = new THREE.MeshStandardMaterial({ color: 0xD16847, emissive: 0xD16847, emissiveIntensity: 2, transparent: true, opacity: 0.3 });
        const segment = new THREE.Mesh(segmentGeo, segmentMat);
        segment.userData = { angle, baseLength: 120, currentLength: 60 };
        scene.add(segment);
        creature.segments.push(segment);
    }
    gridCreatures.push(creature);
}

function updateGridCreatures(delta) {
    gridCreatures.forEach(creature => {
        creature.evolutionTimer += delta;
        const evolutionProgress = Math.min(creature.evolutionTimer / creature.evolutionDuration, 1);
        if (evolutionProgress < 0.3) { creature.evolutionStage = 1; creature.targetHeight = 100 * (evolutionProgress / 0.3); creature.core.material.opacity = evolutionProgress / 0.3; }
        else if (evolutionProgress < 0.6) { creature.evolutionStage = 2; const segmentProgress = (evolutionProgress - 0.3) / 0.3; creature.segments.forEach((seg, i) => { seg.userData.currentLength = seg.userData.baseLength * segmentProgress; seg.material.opacity = segmentProgress; }); }
        else if (evolutionProgress < 1.0) { creature.evolutionStage = 3; creature.targetHeight = 100 + Math.sin(time.elapsedTime * 2 + creature.phase) * 50; }
        else { const dissolve = (evolutionProgress - 1) * 2; creature.core.material.opacity = Math.max(0, 1 - dissolve); creature.segments.forEach(seg => seg.material.opacity = Math.max(0, 1 - dissolve)); if (dissolve > 1) { creature.position.x = (Math.random() - 0.5) * 3000; creature.position.z = (Math.random() - 0.5) * 3000; creature.evolutionTimer = 0; creature.currentHeight = 0; } }
        creature.currentHeight += (creature.targetHeight - creature.currentHeight) * delta * 2;
        creature.core.position.y = creature.position.y + creature.currentHeight;
        creature.core.rotation.y += delta * 2;
        creature.core.rotation.x = Math.sin(time.elapsedTime + creature.phase) * 0.3;
        creature.segments.forEach((seg, i) => { const angle = seg.userData.angle + time.elapsedTime * 0.5; const radius = seg.userData.currentLength / 2; const height = creature.currentHeight + Math.sin(time.elapsedTime * 3 + i) * 20; seg.position.set(creature.position.x + Math.cos(angle) * radius, creature.position.y + height, creature.position.z + Math.sin(angle) * radius); seg.rotation.y = angle; seg.rotation.z = Math.sin(time.elapsedTime * 2 + i) * 0.2; const pulse = Math.sin(time.elapsedTime * 4 + i) * 0.5 + 1.5; seg.material.emissiveIntensity = pulse; });
    });
}
