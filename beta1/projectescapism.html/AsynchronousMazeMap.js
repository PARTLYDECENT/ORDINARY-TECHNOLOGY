/**
 * ASYNCHRONOUS MAZE MAP MANAGER: Procedural 3D Mesh-Based Backrooms Map
 * Integrates with BackroomsBuilder for concentric multi-biome rendering, dynamic lights, and SFX.
 * Dimensions spaced out 10x for wide, cavernous halls.
 */

// Creepy slimy flesh textured Stalker anomaly (Scaled up to a giant spider/insectoid)
class Stalker {
    constructor() {
        this.group = new THREE.Group();

        // Custom canvas texture for creepy organic flesh/skin
        const fleshCanvas = document.createElement('canvas');
        fleshCanvas.width = 256; fleshCanvas.height = 256;
        const ctx = fleshCanvas.getContext('2d');
        ctx.fillStyle = '#3a2020'; // Base fleshy red/brown
        ctx.fillRect(0, 0, 256, 256);

        // Vein networks
        ctx.strokeStyle = '#5a1515';
        ctx.lineWidth = 2;
        for (let i = 0; i < 20; i++) {
            ctx.beginPath();
            ctx.moveTo(Math.random() * 256, Math.random() * 256);
            for (let j = 0; j < 4; j++) {
                ctx.lineTo(Math.random() * 256, Math.random() * 256);
            }
            ctx.stroke();
        }

        // Necrotic green-brown decaying patches
        for (let i = 0; i < 10; i++) {
            ctx.fillStyle = Math.random() > 0.5 ? '#171a0c' : '#221515';
            ctx.beginPath();
            ctx.arc(Math.random() * 256, Math.random() * 256, 8 + Math.random() * 16, 0, Math.PI * 2);
            ctx.fill();
        }

        const fleshTex = new THREE.CanvasTexture(fleshCanvas);

        const torsoMat = new THREE.MeshStandardMaterial({
            map: fleshTex,
            roughness: 0.15,
            metalness: 0.05
        });

        // Torso
        const torsoGeo = new THREE.BoxGeometry(0.3, 0.6, 0.25);
        this.torso = new THREE.Mesh(torsoGeo, torsoMat);
        this.torso.castShadow = true;
        this.torso.receiveShadow = true;
        this.group.add(this.torso);

        // Holographic cyber-glitch wireframe overlay on torso
        const wireMat = new THREE.MeshBasicMaterial({
            color: 0x00f3ff,
            wireframe: true,
            transparent: true,
            opacity: 0.45
        });
        this.torsoWire = new THREE.Mesh(torsoGeo, wireMat);
        this.group.add(this.torsoWire);

        // Glowing red organic core inside chest
        const coreMat = new THREE.MeshBasicMaterial({ color: 0xff3300 });
        this.heart = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), coreMat);
        this.heart.position.set(0, 0.1, 0.05);
        this.group.add(this.heart);

        // Head
        const headGeo = new THREE.BoxGeometry(0.2, 0.2, 0.2);
        this.head = new THREE.Mesh(headGeo, torsoMat);
        this.head.position.y = 0.45;
        this.head.castShadow = true;
        this.group.add(this.head);

        // Glowing red pinprick eyes
        const eyeGeo = new THREE.SphereGeometry(0.035, 8, 8);
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });

        this.leftEye = new THREE.Mesh(eyeGeo, eyeMat);
        this.leftEye.position.set(-0.065, 0.45, 0.105);
        this.group.add(this.leftEye);

        this.rightEye = new THREE.Mesh(eyeGeo, eyeMat);
        this.rightEye.position.set(0.065, 0.45, 0.105);
        this.group.add(this.rightEye);

        // Spindly, insectoid limbs (4 limbs)
        this.limbs = [];
        const limbParams = [
            { x: -0.15, z: 0.1, rotY: 0 },
            { x: 0.15, z: 0.1, rotY: 0 },
            { x: -0.15, z: -0.1, rotY: 0 },
            { x: 0.15, z: -0.1, rotY: 0 }
        ];

        limbParams.forEach((p, idx) => {
            const limbRoot = new THREE.Group();
            limbRoot.position.set(p.x, 0.1, p.z);

            const seg1 = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.015, 0.8, 6), torsoMat);
            seg1.position.y = -0.4;
            seg1.castShadow = true;
            limbRoot.add(seg1);

            const joint = new THREE.Group();
            joint.position.set(0, -0.8, 0);
            limbRoot.add(joint);

            const seg2 = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.01, 0.8, 6), torsoMat);
            seg2.position.y = -0.4;
            seg2.castShadow = true;
            joint.add(seg2);

            this.group.add(limbRoot);
            this.limbs.push({ root: limbRoot, joint: joint, idx });
        });

        // Scaled to a massive giant (7.5x scale) to match the spaced out hallways!
        this.group.scale.set(7.5, 7.5, 7.5);
    }

    update(time, speed) {
        this.limbs.forEach(limb => {
            const phase = time * 8.0 * speed + limb.idx * Math.PI / 2;
            const twitch = Math.sin(time * 35.0 + limb.idx * 1.5) * 0.06;

            limb.root.rotation.x = Math.sin(phase) * 0.4 + twitch;
            limb.root.rotation.z = (limb.idx % 2 === 0 ? -0.1 : 0.1) + Math.cos(phase) * 0.1;
            limb.joint.rotation.x = -Math.abs(Math.cos(phase)) * 0.8 + twitch;
        });

        this.torso.position.y = Math.sin(time * 16.0) * 0.03;
        this.head.rotation.y = Math.sin(time * 25.0) * 0.1 + (Math.random() - 0.5) * 0.08;
        this.head.rotation.x = Math.cos(time * 18.0) * 0.05 + (Math.random() - 0.5) * 0.05;

        if (this.heart) {
            this.heart.material.color.setRGB(1.0, 0.1 + Math.sin(time * 6.0) * 0.08, 0.0);
            this.heart.scale.setScalar(1.0 + Math.sin(time * 6.0) * 0.15);
        }
        if (this.leftEye && this.rightEye) {
            const eyeGlow = 1.0 + Math.sin(time * 10.0) * 0.35;
            this.leftEye.scale.setScalar(eyeGlow);
            this.rightEye.scale.setScalar(eyeGlow);
        }
        if (this.torsoWire) {
            this.torsoWire.material.opacity = 0.2 + Math.sin(time * 7.5) * 0.18;
            this.torsoWire.rotation.y = Math.sin(time * 1.5) * 0.08;
        }
    }
}

const AsynchronousMazeMapManager = (function () {

    // --- MATH & NOISE ---
    function hash21(x, z) {
        let val = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
        return val - Math.floor(val);
    }

    function sdBox(px, pz, bx, bz) {
        let dx = Math.abs(px) - bx;
        let dz = Math.abs(pz) - bz;
        return Math.sqrt(Math.max(dx, 0)**2 + Math.max(dz, 0)**2) + Math.min(Math.max(dx, dz), 0);
    }

    // Spaced out 10x (60.0 units spacing, 32x32 pillars, 12x60 walls)
    function checkCollision(x, z) {
        const spacing = 60.0;
        let idX = Math.floor((x + spacing*0.5) / spacing);
        let idZ = Math.floor((z + spacing*0.5) / spacing);

        // Spawn protection: keep 3x3 cells around player spawn clear of obstacles
        if (Math.abs(idX) <= 1 && Math.abs(idZ) <= 1) {
            return true;
        }

        let qx = ((x + spacing*0.5) % spacing + spacing) % spacing - spacing*0.5;
        let qz = ((z + spacing*0.5) % spacing + spacing) % spacing - spacing*0.5;

        let h = hash21(idX, idZ);
        let d = 1000.0;
        if (h < 0.25) {
            d = sdBox(qx, qz, 16.0, 16.0); // 32x32 pillar
        } else if (h < 0.6) {
            let h2 = hash21(idX + 0.5, idZ);
            if (h2 > 0.5) d = sdBox(qx, qz, 30.0, 6.0); // 60x12 wall
            else d = sdBox(qx, qz, 6.0, 30.0); // 12x60 wall
        }
        return d > 2.0; // Player collision radius
    }

    class AsynchronousMazeMapManager {
        constructor(scene, config) {
            this.scene = scene;
            this.config = config;
            this.cellSize = 60.0; // 10x spaced out cells (was 6.0)
            this.chunkSize = 10 * this.cellSize; // 600.0 units chunk
            this.chunks = new Map();
            this.activeChunks = new Set();
            this.viewRadius = 1;

            window.ASYNCHRONOUS_MAZE_MODE = true;

            // Speed up player walk velocity inside these cavernous hallways
            if (window.player) {
                window.player.speedMultiplier = 3.8;
            }

            // Audio Setup
            this.audioCtx = null;
            this.lastHeartbeat = 0;
            this.heartbeatInterval = 1.0;
            this.sanity = 100.0;

            this._initAudio();
            const resumeAudio = () => {
                if (this.audioCtx && this.audioCtx.state === 'suspended') {
                    this.audioCtx.resume();
                }
            };
            window.addEventListener('click', resumeAudio, { once: true });
            window.addEventListener('keydown', resumeAudio, { once: true });

            // Initialize visual resources using BackroomsBuilder
            if (window.BackroomsBuilder) {
                window.BackroomsBuilder.init(this.scene);
            }

            // Allocate PointLight pool (increased range to 35.0 to fill the wider halls)
            this.lightPool = [];
            for (let i = 0; i < 6; i++) {
                const light = new THREE.PointLight(0xfffcaa, 0.0, 35.0);
                this.scene.add(light);
                this.lightPool.push(light);
            }

            // Spawner/Entity tracking (chases player in 3D through Backrooms)
            this.stalker = new Stalker();
            this.scene.add(this.stalker.group);
            this.stalker.position = new THREE.Vector3(120.0, 0, 120.0); // Spawn further out
            this.stalker.group.position.copy(this.stalker.position);
            this.stalker.active = true;
            this.stalker.hp = 100;
            this.stalker.stunTimer = 0;
            this.stalker.lastPathTime = 0;
            this.stalker.path = [];
            this.stalker.takeDamage = (dmg) => {
                this.stalker.hp -= dmg;
                this.stalker.stunTimer = 3.0; // Stun for 3s
                this.triggerStalkerClick();

                if (typeof emitParticle === 'function') {
                    for (let i = 0; i < 25; i++) {
                        emitParticle(
                            this.stalker.position.x, 2.5, this.stalker.position.z,
                            (Math.random() - 0.5) * 20, 4 + Math.random() * 10, (Math.random() - 0.5) * 20,
                            0.05, 0.05, 0.05,
                            6.0 + Math.random() * 4, 0.6
                        );
                    }
                }
            };

            window.stalkerEntity = this.stalker;
        }

        _generateChunk(cx, cz) {
            const key = `${cx},${cz}`;
            const chunkGroup = new THREE.Group();
            chunkGroup.position.set(cx * this.chunkSize, 0, cz * this.chunkSize);
            this.scene.add(chunkGroup);

            const lightFixtures = [];

            // Loop 10x10 cells in this chunk
            for (let lx = 0; lx < 10; lx++) {
                for (let lz = 0; lz < 10; lz++) {
                    const idX = cx * 10 + lx;
                    const idZ = cz * 10 + lz;

                    if (window.BackroomsBuilder) {
                        window.BackroomsBuilder.generateCell(idX, idZ, chunkGroup, {
                            lightFixtures: lightFixtures
                        });
                    }
                }
            }

            this.chunks.set(key, {
                group: chunkGroup,
                lightFixtures: lightFixtures
            });
        }

        _unloadChunk(key) {
            const chunk = this.chunks.get(key);
            if (chunk) {
                this.scene.remove(chunk.group);
                this.chunks.delete(key);
            }
        }

        update(playerPosition, delta = 0, activeCamera) {
            if (!activeCamera) return;

            // 1. Chunk Loading and Unloading
            const px = Math.floor(playerPosition.x / this.chunkSize);
            const pz = Math.floor(playerPosition.z / this.chunkSize);

            const currentActive = new Set();

            for (let x = px - this.viewRadius; x <= px + this.viewRadius; x++) {
                for (let z = pz - this.viewRadius; z <= pz + this.viewRadius; z++) {
                    const key = `${x},${z}`;
                    currentActive.add(key);
                    if (!this.chunks.has(key)) {
                        this._generateChunk(x, z);
                    }
                }
            }

            for (const key of this.activeChunks) {
                if (!currentActive.has(key)) {
                    this._unloadChunk(key);
                }
            }
            this.activeChunks = currentActive;

            // 2. Light Pooling (move pool to closest 6 fixtures and set biome colors/intensity)
            const lightPositions = [];
            for (const key of this.activeChunks) {
                const chunk = this.chunks.get(key);
                if (chunk && chunk.lightFixtures) {
                    chunk.lightFixtures.forEach(fixture => {
                        lightPositions.push(fixture);
                    });
                }
            }

            lightPositions.sort((a, b) => {
                const distA = a.pos.distanceTo(playerPosition);
                const distB = b.pos.distanceTo(playerPosition);
                return distA - distB;
            });

            const maxLights = Math.min(this.lightPool.length, lightPositions.length);
            for (let i = 0; i < this.lightPool.length; i++) {
                const light = this.lightPool[i];
                if (i < maxLights) {
                    const fixture = lightPositions[i];
                    light.position.copy(fixture.pos);
                    light.position.y = 5.0; // ceiling is at 6.0, shine down from 5.0

                    // Set light color and base intensity based on biome
                    let baseColor = 0xfffcaa; // Biome 0: yellow
                    let baseIntensity = 1.25;
                    let range = 35.0;
                    let canFlicker = true;

                    if (fixture.biome === 1) {
                        baseColor = 0xe0e8ff; // Biome 1: cool white
                        baseIntensity = 0.85;
                        range = 28.0;
                    } else if (fixture.biome === 2) {
                        baseColor = 0xff2222; // Biome 2: warning red
                        baseIntensity = 0.65;
                        range = 24.0;
                    } else if (fixture.biome === 3) {
                        baseColor = 0x00ffcc; // Biome 3: server cyan/green
                        baseIntensity = 0.45;
                        range = 18.0;
                        canFlicker = false; // stable servers
                    }

                    light.color.setHex(baseColor);
                    light.distance = range;

                    // Faulty light flicker effect
                    const faultHash = hash21(fixture.idX, fixture.idZ);
                    if (canFlicker && faultHash < 0.20) {
                        const now = (performance.now() * 0.001);
                        const flicker = Math.sin(now * (10.0 * (1.0 - faultHash) + 50.0 * faultHash)) > 0.25 ? 1.0 : 0.05;
                        light.intensity = flicker * baseIntensity;
                        light.visible = true;
                        
                        if (window.BackroomsBuilder) {
                            fixture.mesh.material = (flicker > 0.5) 
                                ? window.BackroomsBuilder.materials.lightDiffuser 
                                : window.BackroomsBuilder.materials.lightDiffuserOff;
                        }
                    } else {
                        light.intensity = baseIntensity;
                        light.visible = true;
                        if (window.BackroomsBuilder) {
                            fixture.mesh.material = window.BackroomsBuilder.materials.lightDiffuser;
                        }
                    }
                } else {
                    light.visible = false;
                    light.intensity = 0;
                }
            }

            // 3. Update Blinking, SFX synth, and Shadow Hallucinations in BackroomsBuilder
            if (window.BackroomsBuilder) {
                window.BackroomsBuilder.update(playerPosition, delta, activeCamera, this.audioCtx);
            }

            // 4. Update Stalker Entity
            this._updateStalker(playerPosition, delta);

            // 5. Update Sanity Logic
            this._updateSanity(playerPosition, delta);
        }

        _isWall(cellX, cellZ) {
            const x = cellX * this.cellSize;
            const z = cellZ * this.cellSize;
            return !checkCollision(x, z);
        }

        getCostAt(worldX, worldZ) {
            return checkCollision(worldX, worldZ) ? 1 : 255;
        }

        _updateStalker(playerPosition, delta) {
            if (!this.stalker || !this.stalker.active) return;

            const now = clock ? clock.elapsedTime : (performance.now() * 0.001);
            const stalkerPos = this.stalker.position;
            const dist = stalkerPos.distanceTo(playerPosition);

            // Scale spawn resets for 10x larger hallways
            if (dist > 800.0) {
                const angle = Math.random() * Math.PI * 2;
                const spawnDist = 200.0 + Math.random() * 100.0;
                const targetX = playerPosition.x + Math.cos(angle) * spawnDist;
                const targetZ = playerPosition.z + Math.sin(angle) * spawnDist;

                const cellX = Math.floor(targetX / this.cellSize);
                const cellZ = Math.floor(targetZ / this.cellSize);
                if (!this._isWall(cellX, cellZ)) {
                    this.stalker.position.set(targetX, 0, targetZ);
                    this.stalker.group.position.copy(this.stalker.position);
                    this.stalker.path = [];
                }
                return;
            }

            if (this.stalker.stunTimer > 0) {
                this.stalker.stunTimer -= delta;
                this.stalker.update(now, 0.0);
                this.stalker.group.position.copy(stalkerPos).addScalar((Math.random() - 0.5) * 0.8);
                return;
            }

            if (now - this.stalker.lastPathTime > 0.3) {
                this.stalker.lastPathTime = now;
                const sCellX = Math.floor(stalkerPos.x / this.cellSize);
                const sCellZ = Math.floor(stalkerPos.z / this.cellSize);
                const pCellX = Math.floor(playerPosition.x / this.cellSize);
                const pCellZ = Math.floor(playerPosition.z / this.cellSize);

                const newPath = this.findPath(sCellX, sCellZ, pCellX, pCellZ);
                if (newPath && newPath.length > 0) {
                    this.stalker.path = newPath;
                }
            }

            // Stalker speed is scaled up (running speed 22.0 base)
            let speed = 22.0;
            if (window.BackroomsBuilder) {
                const pCellX = Math.floor(playerPosition.x / this.cellSize);
                const pCellZ = Math.floor(playerPosition.z / this.cellSize);
                const b = window.BackroomsBuilder.getBiome(pCellX, pCellZ);
                
                if (b === 1) speed += 4.0;
                else if (b === 2) speed += 8.0;
                else if (b === 3) speed += 12.0;
                else if (b === 4) speed += 18.0; // Level 4: Extremely fast charging monster
            }

            if (this.sanity < 50) speed += 3.0;

            if (this.stalker.path && this.stalker.path.length > 0) {
                const targetCell = this.stalker.path[0];
                const targetWorldX = targetCell.x * this.cellSize + this.cellSize / 2;
                const targetWorldZ = targetCell.z * this.cellSize + this.cellSize / 2;

                const dx = targetWorldX - stalkerPos.x;
                const dz = targetWorldZ - stalkerPos.z;
                const cellDist = Math.sqrt(dx * dx + dz * dz);

                if (cellDist < 2.0) { // scaled check target distance
                    this.stalker.path.shift();
                } else {
                    const moveDist = speed * delta;
                    const ratio = Math.min(1.0, moveDist / cellDist);
                    stalkerPos.x += dx * ratio;
                    stalkerPos.z += dz * ratio;
                }
            } else {
                const dx = playerPosition.x - stalkerPos.x;
                const dz = playerPosition.z - stalkerPos.z;
                const angle = Math.atan2(dz, dx);
                stalkerPos.x += Math.cos(angle) * speed * delta;
                stalkerPos.z += Math.sin(angle) * speed * delta;
            }

            const faceDx = playerPosition.x - stalkerPos.x;
            const faceDz = playerPosition.z - stalkerPos.z;
            this.stalker.group.rotation.y = Math.atan2(faceDx, faceDz);

            this.stalker.group.position.copy(stalkerPos);
            this.stalker.group.position.y = 0.0;
            this.stalker.update(now, 1.0);

            if (Math.random() < 0.015 && dist < 200.0) {
                this.triggerStalkerClick();
            }

            // Hearbeats trigger when stalker is within 200 units
            if (dist < 200.0) {
                this.heartbeatInterval = Math.max(0.35, Math.min(1.2, (dist - 20) / 180 * 0.8 + 0.4));
                if (now - this.lastHeartbeat > this.heartbeatInterval) {
                    this.lastHeartbeat = now;
                    this.triggerHeartbeat();
                }
            }

            // Damage range increased to 12.0 due to stalker's giant mesh scale
            if (dist < 12.0 && window.playerHealth > 0) {
                if (!this.lastDmgTime || now - this.lastDmgTime > 0.8) {
                    this.lastDmgTime = now;
                    const dmgAmt = 25;
                    window.playerHealth = Math.max(0, window.playerHealth - dmgAmt);
                    if (window.player) window.player.health = window.playerHealth;

                    if (typeof screenShakeIntensity !== 'undefined') {
                        screenShakeIntensity += 2.5;
                    }
                    if (window.SFX && typeof window.SFX.triggerHurt === 'function') {
                        window.SFX.triggerHurt();
                    }
                    this.triggerStalkerClick();
                }
            }
        }

        findPath(startX, startZ, endX, endZ) {
            const queue = [{ x: startX, z: startZ, path: [] }];
            const visited = new Set();
            visited.add(`${startX},${startZ}`);

            let steps = 0;
            while (queue.length > 0 && steps < 300) {
                steps++;
                const curr = queue.shift();
                if (curr.x === endX && curr.z === endZ) {
                    return curr.path.concat([{ x: curr.x, z: curr.z }]);
                }

                const neighbors = [
                    { x: curr.x + 1, z: curr.z },
                    { x: curr.x - 1, z: curr.z },
                    { x: curr.x, z: curr.z + 1 },
                    { x: curr.x, z: curr.z - 1 }
                ];

                for (let n of neighbors) {
                    const key = `${n.x},${n.z}`;
                    const dx = Math.abs(n.x - endX);
                    const dz = Math.abs(n.z - endZ);

                    if (dx < 18 && dz < 18 && !visited.has(key) && !this._isWall(n.x, n.z)) {
                        visited.add(key);
                        queue.push({ x: n.x, z: n.z, path: curr.path.concat([{ x: curr.x, z: curr.z }]) });
                    }
                }
            }
            return null;
        }

        _updateSanity(playerPosition, delta) {
            const stalkerPos = this.stalker.position;
            const dist = stalkerPos.distanceTo(playerPosition);

            let isDark = false;
            if (window.flashLight && !window.flashLight.visible) {
                isDark = true;
            }

            let sanityDrain = 0;
            if (isDark) {
                sanityDrain += 1.5;
            }
            if (dist < 150.0) { // Sanity drain distance scaled to 150
                sanityDrain += 4.5 * (1.0 - dist / 150.0);
            }

            if (sanityDrain > 0) {
                this.sanity = Math.max(0, this.sanity - sanityDrain * delta);
            } else {
                this.sanity = Math.min(100, this.sanity + 1.0 * delta);
            }

            const canvas = document.querySelector('canvas:not(#glcanvas)');
            if (canvas) {
                let blurAmt = 0;
                if (this.sanity < 50) {
                    blurAmt += (50 - this.sanity) / 50 * 2.0;
                }
                if (dist < 120.0 && this.stalker.stunTimer <= 0) {
                    blurAmt += (120.0 - dist) / 120.0 * 2.5; 
                }

                if (blurAmt > 0.05) {
                    canvas.style.filter = `blur(${blurAmt.toFixed(2)}px)`;
                    const now = clock ? clock.elapsedTime : (performance.now() * 0.001);
                    const scaleFactor = 1.0 + Math.sin(now * 2.5) * 0.005 * (blurAmt / 4.0);
                    canvas.style.transform = `scale(${scaleFactor.toFixed(3)})`;
                } else {
                    canvas.style.filter = '';
                    canvas.style.transform = '';
                }
            }
        }

        _initAudio() {
            if (this.audioCtx) return;
            try {
                this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                
                const masterGain = this.audioCtx.createGain();
                masterGain.gain.value = 0.25;
                masterGain.connect(this.audioCtx.destination);

                const humOsc = this.audioCtx.createOscillator();
                humOsc.type = 'sine';
                humOsc.frequency.value = 60;
                const humGain = this.audioCtx.createGain();
                humGain.gain.value = 0.6;
                humOsc.connect(humGain).connect(masterGain);
                humOsc.start();

                const buzzOsc = this.audioCtx.createOscillator();
                buzzOsc.type = 'sawtooth';
                buzzOsc.frequency.value = 120;
                const buzzFilter = this.audioCtx.createBiquadFilter();
                buzzFilter.type = 'lowpass';
                buzzFilter.frequency.value = 400;
                const buzzGain = this.audioCtx.createGain();
                buzzGain.gain.value = 0.15;
                
                const lfo = this.audioCtx.createOscillator();
                lfo.type = 'sine';
                lfo.frequency.value = 0.5;
                const lfoGain = this.audioCtx.createGain();
                lfoGain.gain.value = 0.05;
                lfo.connect(lfoGain).connect(buzzGain.gain);
                lfo.start();

                buzzOsc.connect(buzzFilter).connect(buzzGain).connect(masterGain);
                buzzOsc.start();

                const bufferSize = this.audioCtx.sampleRate * 2;
                const noiseBuffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
                const output = noiseBuffer.getChannelData(0);
                let lastOut = 0;
                for (let i = 0; i < bufferSize; i++) {
                    let white = Math.random() * 2 - 1;
                    output[i] = (lastOut + (0.02 * white)) / 1.02;
                    lastOut = output[i];
                    output[i] *= 3.5; 
                }
                const noiseSrc = this.audioCtx.createBufferSource();
                noiseSrc.buffer = noiseBuffer;
                noiseSrc.loop = true;
                
                const noiseFilter = this.audioCtx.createBiquadFilter();
                noiseFilter.type = 'lowpass';
                noiseFilter.frequency.value = 800;
                
                const noiseGain = this.audioCtx.createGain();
                noiseGain.gain.value = 0.4;
                
                noiseSrc.connect(noiseFilter).connect(noiseGain).connect(masterGain);
                noiseSrc.start();

                this.audioNodes = [humOsc, buzzOsc, lfo, noiseSrc];
            } catch (e) {
                console.warn("Backrooms audio failed to initialize:", e);
            }
        }

        triggerHeartbeat() {
            const ctx = this.audioCtx;
            if (!ctx || ctx.state === 'suspended') return;

            const playThump = (time) => {
                const osc = ctx.createOscillator();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(65, time);
                osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.25);

                const gain = ctx.createGain();
                gain.gain.setValueAtTime(0.35, time);
                gain.gain.exponentialRampToValueAtTime(0.01, time + 0.25);

                osc.connect(gain).connect(this.audioCtx.destination);
                osc.start(time);
                osc.stop(time + 0.25);
            };

            const now = ctx.currentTime;
            playThump(now);
            playThump(now + 0.25);
        }

        triggerStalkerClick() {
            const ctx = this.audioCtx;
            if (!ctx || ctx.state === 'suspended') return;

            const now = ctx.currentTime;
            for (let i = 0; i < 5 + Math.random() * 6; i++) {
                const t = now + i * 0.05;
                const osc = ctx.createOscillator();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(800 + Math.random() * 2000, t);
                osc.frequency.exponentialRampToValueAtTime(100, t + 0.04);

                const gain = ctx.createGain();
                gain.gain.setValueAtTime(0.08, t);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

                osc.connect(gain).connect(this.audioCtx.destination);
                osc.start(t);
                osc.stop(t + 0.04);
            }
        }

        dispose() {
            window.ASYNCHRONOUS_MAZE_MODE = false;

            // Reset player walk speed multiplier back to normal
            if (window.player) {
                window.player.speedMultiplier = 1.0;
            }

            // Unload all chunks
            for (const key of this.chunks.keys()) {
                this._unloadChunk(key);
            }
            this.chunks.clear();

            if (this.lightPool) {
                this.lightPool.forEach(light => {
                    this.scene.remove(light);
                });
                this.lightPool = [];
            }

            if (window.BackroomsBuilder) {
                window.BackroomsBuilder.dispose();
            }

            if (this.stalker) {
                this.scene.remove(this.stalker.group);
                this.stalker = null;
                window.stalkerEntity = null;
            }

            if (this.audioNodes) {
                this.audioNodes.forEach(node => {
                    try { node.stop(); } catch(e) {}
                });
            }
            if (this.audioCtx) {
                try { this.audioCtx.close(); } catch(e) {}
            }

            const canvas = document.querySelector('canvas:not(#glcanvas)');
            if (canvas) {
                canvas.style.transform = '';
                canvas.style.filter = '';
            }
        }
    }

    return AsynchronousMazeMapManager;
})();
