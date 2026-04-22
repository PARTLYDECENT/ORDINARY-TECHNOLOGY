/**
 * systems.js
 * Core engine logic, game state, and input handling with post-processing.
 */

// --- CONSTANTS ---
const GAME_SPEED = 60.0;
const BOUNDS = 12;

// --- STATE ---
let gameState = 'menu';
let score = 0;
let health = 100;
let gameTime = 0;
let lastShootTime = 0;
let isInvulnerable = false;
let invulnerabilityTimer = 0;
let enemySpawnTimer = 0;
let warpAmount = 0.2; // Base warp

const entities = {
    lasers: [],
    enemies: []
};

const keys = { w: false, a: false, s: false, d: false, space: false };
let targetPos = { x: 0, y: 0 };
let isPointerDown = false;

// --- THREE.JS GLOBALS ---
let renderer, scene, camera, clock;
let bgScene, bgCamera, sdfUniforms;
let playerShip, particles;

// Post-processing
let renderTarget, postScene, postCamera, postUniforms;

// --- SHARED GEOMETRY/MATERIALS ---
const laserGeo = new THREE.CylinderGeometry(0.05, 0.05, 3, 8);
laserGeo.rotateX(Math.PI / 2);
const laserMat = new THREE.MeshBasicMaterial({ color: 0x00aaff });

const asteroidMat = new THREE.MeshStandardMaterial({ 
    color: 0x333333, 
    roughness: 0.8, 
    metalness: 0.2,
    emissive: 0x111111
});
const wireMat = new THREE.LineBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.2 });

function initSystems() {
    const canvas = document.getElementById('gameCanvas');
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.autoClear = false;

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 5; // Pull back slightly
    clock = new THREE.Clock();

    // World Setup
    setupWorldEnvironment(scene);
    particles = new ParticleSystem(scene);

    // Background SDF setup
    bgScene = new THREE.Scene();
    bgCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    sdfUniforms = {
        iTime: { value: 0 },
        iResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        shipPos: { value: new THREE.Vector2(0, 0) },
        warpFactor: { value: 0.2 }
    };
    const sdfMaterial = new THREE.ShaderMaterial({
        vertexShader: SDF_VERTEX_SHADER,
        fragmentShader: SDF_FRAGMENT_SHADER,
        uniforms: sdfUniforms,
        depthWrite: false
    });
    const bgQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), sdfMaterial);
    bgScene.add(bgQuad);

    // Ship Setup
    playerShip = createPlayerShip(scene);

    // POST-PROCESSING SETUP
    renderTarget = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight);
    postScene = new THREE.Scene();
    postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    postUniforms = {
        tDiffuse: { value: renderTarget.texture },
        iTime: { value: 0 },
        iResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        amount: { value: 0.5 }
    };
    const postMat = new THREE.ShaderMaterial({
        vertexShader: SDF_VERTEX_SHADER,
        fragmentShader: POST_PROCESS_FRAGMENT_SHADER,
        uniforms: postUniforms,
        depthWrite: false
    });
    const postQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), postMat);
    postScene.add(postQuad);

    // Event Listeners
    setupInputListeners();
    window.addEventListener('resize', onWindowResize);

    updateHUD();
    animate();
}

function setupInputListeners() {
    window.addEventListener('keydown', (e) => {
        const k = e.key.toLowerCase();
        if (k === 'w' || e.key === 'ArrowUp') keys.w = true;
        if (k === 'a' || e.key === 'ArrowLeft') keys.a = true;
        if (k === 's' || e.key === 'ArrowDown') keys.s = true;
        if (k === 'd' || e.key === 'ArrowRight') keys.d = true;
        if (k === ' ') { keys.space = true; fireLaser(); }
    });

    window.addEventListener('keyup', (e) => {
        const k = e.key.toLowerCase();
        if (k === 'w' || e.key === 'ArrowUp') keys.w = false;
        if (k === 'a' || e.key === 'ArrowLeft') keys.a = false;
        if (k === 's' || e.key === 'ArrowDown') keys.s = false;
        if (k === 'd' || e.key === 'ArrowRight') keys.d = false;
        if (k === ' ') keys.space = false;
    });

    window.addEventListener('pointerdown', (e) => {
        if(e.target.tagName === 'BUTTON') return;
        isPointerDown = true;
        updatePointerPos(e);
    });
    
    window.addEventListener('pointerup', () => isPointerDown = false);
    window.addEventListener('pointermove', (e) => { if (isPointerDown) updatePointerPos(e); });
}

function updatePointerPos(e) {
    const nx = (e.clientX / window.innerWidth) * 2 - 1;
    const ny = -(e.clientY / window.innerHeight) * 2 + 1;
    targetPos.x = nx * BOUNDS;
    targetPos.y = ny * BOUNDS;
}

function onWindowResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    renderTarget.setSize(w, h);
    sdfUniforms.iResolution.value.set(w, h);
    postUniforms.iResolution.value.set(w, h);
}

function fireLaser() {
    if (gameState !== 'playing') return;
    if (gameTime - lastShootTime < 0.15) return;
    
    lastShootTime = gameTime;
    
    // Get Cannon Pods from Ship Metadata
    const pods = playerShip.group.userData.pods || [];
    
    pods.forEach(pod => {
        // Create Laser
        const laser = new THREE.Mesh(laserGeo, laserMat);
        const worldPos = new THREE.Vector3();
        pod.getWorldPosition(worldPos);
        laser.position.copy(worldPos);
        laser.position.z -= 1.0; // Offset forward
        scene.add(laser);
        entities.lasers.push({ mesh: laser, active: true });

        // --- MUZZLE FLASH ---
        const muzzlePoint = pod.userData.muzzle;
        if (muzzlePoint) {
            const flashGeo = new THREE.SphereGeometry(0.3, 8, 8);
            const flashMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.8 });
            const flash = new THREE.Mesh(flashGeo, flashMat);
            muzzlePoint.add(flash);
            
            const flashLight = new THREE.PointLight(0x00ffff, 5.0, 5);
            muzzlePoint.add(flashLight);

            // Animate and remove
            gsap.to(flash.scale, { x: 2, y: 2, z: 0.5, duration: 0.1, onComplete: () => muzzlePoint.remove(flash) });
            gsap.to(flashMat, { opacity: 0, duration: 0.1 });
            gsap.to(flashLight, { intensity: 0, duration: 0.1, onComplete: () => muzzlePoint.remove(flashLight) });
        }
    });

    playerShip.group.position.z += 0.25; // Recoil
    // Brief flare when firing
    postUniforms.amount.value = 1.2;
}

function spawnEnemy() {
    const geo = new THREE.IcosahedronGeometry(1.8, 1);
    const pos = geo.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i);
        v.normalize().multiplyScalar(1.5 + Math.random() * 0.8);
        pos.setXYZ(i, v.x, v.y, v.z);
    }
    geo.computeVertexNormals();

    const enemy = new THREE.Mesh(geo, asteroidMat);
    const edges = new THREE.EdgesGeometry(geo);
    enemy.add(new THREE.LineSegments(edges, wireMat));

    const angle = Math.random() * Math.PI * 2;
    const radius = 5 + Math.random() * 15;
    enemy.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, -300);
    
    enemy.userData = {
        rotX: (Math.random() - 0.5) * 3,
        rotY: (Math.random() - 0.5) * 3,
        rotZ: (Math.random() - 0.5) * 3
    };
    
    scene.add(enemy);
    entities.enemies.push({ mesh: enemy, active: true });
}

function spawnSpeedStreaks() {
    // Atmospheric speed lines
    const x = (Math.random() - 0.5) * 60;
    const y = (Math.random() - 0.5) * 60;
    const streakPos = new THREE.Vector3(x, y, -200);
    // Cyan or White streak
    const color = Math.random() > 0.5 ? 0x00ffff : 0xffffff;
    particles.spawn(streakPos, color, 1, 5.0, 2.0, 0.1, 0.2);
}

function updateGame(delta) {
    if (gameState === 'paused') {
        // AUTOPILOT IDLE MOVEMENT
        gameTime += delta * 0.5;
        sdfUniforms.iTime.value = gameTime;
        postUniforms.iTime.value = gameTime;
        
        // Gentle ship bobbing in cockpit view
        playerShip.group.position.y += Math.sin(gameTime * 2.0) * 0.005;
        playerShip.group.rotation.z += Math.cos(gameTime * 1.5) * 0.002;
        
        particles.update(delta);
        return; 
    }

    gameTime += delta;

    const speed = 18; // Slightly faster
    if (keys.w) targetPos.y += speed * delta;
    if (keys.s) targetPos.y -= speed * delta;
    if (keys.a) targetPos.x -= speed * delta;
    if (keys.d) targetPos.x += speed * delta;

    targetPos.x = Math.max(-BOUNDS, Math.min(BOUNDS, targetPos.x));
    targetPos.y = Math.max(-BOUNDS, Math.min(BOUNDS, targetPos.y));

    updateShipTransform(playerShip.group, targetPos, delta, BOUNDS);

    if (keys.space) fireLaser();

    // Spawn streaks relative to warpAmount
    if (Math.random() < 0.3 + warpAmount) {
        spawnSpeedStreaks();
    }

    // Engine Particles (Denser & Variegated)
    const trailPos = playerShip.group.position.clone();
    trailPos.z += 2.0;
    
    // Main dual thrusters
    const colors = [0x00aaff, 0x00ffff, 0xff00ff];
    [-0.4, 0.4].forEach(offX => {
        particles.spawn(
            new THREE.Vector3(trailPos.x + offX, trailPos.y - 0.1, trailPos.z), 
            colors[Math.floor(Math.random() * colors.length)], 
            5, 0.8, 0.5, 0.2, 0.8
        );
    });

    // Uniform Updates
    sdfUniforms.iTime.value = gameTime;
    sdfUniforms.shipPos.value.set(playerShip.group.position.x, playerShip.group.position.y);
    
    // Scale warp with score
    warpAmount = 0.2 + (score * 0.00002);
    sdfUniforms.warpFactor.value = warpAmount;
    
    // Decay post-processing intensity
    postUniforms.amount.value += (0.4 - postUniforms.amount.value) * 5 * delta;
    postUniforms.iTime.value = gameTime;

    // Update Lasers
    entities.lasers.forEach(laser => {
        if (!laser.active) return;
        laser.mesh.position.z -= 180 * delta;
        if (laser.mesh.position.z < -350) {
            laser.active = false;
            scene.remove(laser.mesh);
        }
    });

    // Enemies
    enemySpawnTimer -= delta;
    if (enemySpawnTimer <= 0) {
        spawnEnemy();
        enemySpawnTimer = Math.max(0.15, 0.7 - (score * 0.0001)); 
    }

    if (isInvulnerable) {
        invulnerabilityTimer -= delta;
        playerShip.group.visible = Math.floor(gameTime * 25) % 2 === 0;
        if (invulnerabilityTimer <= 0) {
            isInvulnerable = false;
            playerShip.group.visible = true;
            if (playerShip.hullMat) playerShip.hullMat.emissive.setHex(0x001122);
            if (playerShip.energyMat) playerShip.energyMat.emissive.setHex(0x0088ff);
        }
    }

    entities.enemies.forEach(enemyObj => {
        if (!enemyObj.active) return;
        const enemy = enemyObj.mesh;
        const enemySpeed = GAME_SPEED + (score * 0.015);
        enemy.position.z += enemySpeed * delta;
        
        enemy.rotation.x += enemy.userData.rotX * delta;
        enemy.rotation.y += enemy.userData.rotY * delta;
        enemy.rotation.z += enemy.userData.rotZ * delta;

        // Laser collisions
        entities.lasers.forEach(laserObj => {
            if (!laserObj.active || !enemyObj.active) return;
            if (enemy.position.distanceTo(laserObj.mesh.position) < 3.0) {
                enemyObj.active = false;
                laserObj.active = false;
                scene.remove(enemy);
                scene.remove(laserObj.mesh);
                particles.spawn(enemy.position, 0x00ffff, 80, 2.0, 1.2);
                score += 100;
                updateHUD();
                postUniforms.amount.value = 0.8; // Pulse on hit
            }
        });

        // Ship collisions
        if (!isInvulnerable && enemyObj.active) {
            if (enemy.position.distanceTo(playerShip.group.position) < 4.0) {
                enemyObj.active = false;
                scene.remove(enemy);
                particles.spawn(playerShip.group.position, 0xffaa00, 150, 3.0, 2.0);
                health -= 20;
                updateHUD();
                
                isInvulnerable = true;
                invulnerabilityTimer = 1.2;
                
                // SHIELD PULSE FEEDBACK
                if (playerShip.hullMat) {
                    playerShip.hullMat.emissive.setHex(0xff0000);
                    playerShip.hullMat.emissiveIntensity = 2.0;
                    gsap.to(playerShip.hullMat.emissive, { r: 0, g: 0.1, b: 0.2, duration: 1.0 });
                }
                
                postUniforms.amount.value = 2.0; // Heavy glitch on damage

                if (health <= 0) gameOver();
            }
        }

        if (enemy.position.z > 30) {
            enemyObj.active = false;
            scene.remove(enemy);
        }
    });

    entities.lasers = entities.lasers.filter(l => l.active);
    entities.enemies = entities.enemies.filter(e => e.active);
    score += 15 * delta;
    updateHUD();
    particles.update(delta);
}

function animate() {
    requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(), 0.1);

    if (gameState === 'playing') {
        updateGame(delta);
    } else if (gameState === 'paused') {
        updateGame(delta); // Autopilot logic handled inside
    } else {
        gameTime += delta * 0.2;
        sdfUniforms.iTime.value = gameTime;
        postUniforms.iTime.value = gameTime;
        playerShip.group.rotation.y = Math.sin(gameTime) * 0.2;
        playerShip.group.rotation.x = Math.cos(gameTime * 0.8) * 0.1;
        particles.update(delta);
    }

    // MULTI-PASS RENDERING
    renderer.setRenderTarget(renderTarget);
    renderer.clear();
    renderer.render(bgScene, bgCamera);
    renderer.clearDepth();
    renderer.render(scene, camera);

    renderer.setRenderTarget(null);
    renderer.clear();
    renderer.render(postScene, postCamera);
}

function updateHUD() {
    document.getElementById('scoreText').innerText = Math.floor(score).toString();
    const warpDisplay = (1.0 + (score * 0.00002)).toFixed(2);
    const warpEl = document.getElementById('warpText');
    if(warpEl) warpEl.innerText = warpDisplay + "x";
    
    const hb = document.getElementById('healthBar');
    if(hb) {
        hb.style.width = Math.max(0, health) + '%';
        if(health < 40) {
            hb.className = "h-full bg-red-600 shadow-[0_0_20px_red] w-full transition-all duration-300";
        } else {
            hb.className = "h-full bg-gradient-to-r from-cyan-400 via-magenta-500 to-purple-600 w-full transition-all duration-300";
        }
    }
}

function startGame() {
    resetGame();
    gameState = 'playing';
    document.getElementById('startScreen').classList.add('hidden');
    document.getElementById('gameOverScreen').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');
}

function resetGame() {
    score = 0; health = 100; gameTime = 0; targetPos = { x: 0, y: 0 };
    isInvulnerable = false;
    if (playerShip.hullMat) playerShip.hullMat.emissive.setHex(0x001122);
    if (playerShip.energyMat) playerShip.energyMat.emissive.setHex(0x0088ff);
    playerShip.group.visible = true;
    entities.lasers.forEach(l => scene.remove(l.mesh));
    entities.enemies.forEach(e => scene.remove(e.mesh));
    entities.lasers = []; entities.enemies = [];
    particles.activeCount = 0;
    playerShip.group.position.set(0, 0, -10);
    playerShip.group.rotation.set(0,0,0);
    updateHUD();
}

function gameOver() {
    gameState = 'gameover';
    document.getElementById('hud').classList.add('hidden');
    document.getElementById('gameOverScreen').classList.remove('hidden');
    document.getElementById('finalScoreText').innerText = Math.floor(score).toString();
    particles.spawn(playerShip.group.position, 0xff0000, 500, 5.0, 3.0);
    playerShip.group.visible = false;
    postUniforms.amount.value = 3.0; // Max distortion on death
}

// Global Exports
window.startGame = startGame;
window.initSystems = initSystems;
