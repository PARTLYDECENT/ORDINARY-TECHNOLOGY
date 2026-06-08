/**
 * ASYNCHRONOUS MAZE MAP MANAGER: The Backrooms (Hyper-Realistic Edition)
 * Procedural yellow-ochre fluorescent office corridors, metallic ceiling pipes,
 * real-time shadow-casting point lights, random light flickers, ambient dust motes,
 * realistic ballast hum and heartbeat synths, and a slimy flesh-textured Stalker entity.
 */

// Creepy slimy flesh textured Stalker anomaly
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

        // PBR Material: slimy, wet skin (low roughness, high reflectivity)
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

        // Head
        const headGeo = new THREE.BoxGeometry(0.2, 0.2, 0.2);
        this.head = new THREE.Mesh(headGeo, torsoMat);
        this.head.position.y = 0.45;
        this.head.castShadow = true;
        this.group.add(this.head);

        // Glowing white pinprick eyes
        const eyeGeo = new THREE.SphereGeometry(0.035, 8, 8);
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

        const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
        leftEye.position.set(-0.065, 0.45, 0.105);
        this.group.add(leftEye);

        const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
        rightEye.position.set(0.065, 0.45, 0.105);
        this.group.add(rightEye);

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

            // Upper limb segment (thin cylinder)
            const seg1 = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.015, 0.8, 6), torsoMat);
            seg1.position.y = -0.4;
            seg1.castShadow = true;
            limbRoot.add(seg1);

            // Knee joint
            const joint = new THREE.Group();
            joint.position.set(0, -0.8, 0);
            limbRoot.add(joint);

            // Lower limb segment
            const seg2 = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.01, 0.8, 6), torsoMat);
            seg2.position.y = -0.4;
            seg2.castShadow = true;
            joint.add(seg2);

            this.group.add(limbRoot);
            this.limbs.push({ root: limbRoot, joint: joint, idx });
        });

        this.group.scale.set(1.5, 1.5, 1.5);
    }

    update(time, speed) {
        // Walk animation: rotate upper limb and joint using sine waves
        this.limbs.forEach(limb => {
            const phase = time * 8.0 * speed + limb.idx * Math.PI / 2;
            const twitch = Math.sin(time * 35.0 + limb.idx * 1.5) * 0.06;

            limb.root.rotation.x = Math.sin(phase) * 0.4 + twitch;
            limb.root.rotation.z = (limb.idx % 2 === 0 ? -0.1 : 0.1) + Math.cos(phase) * 0.1;

            // Knee bending
            limb.joint.rotation.x = -Math.abs(Math.cos(phase)) * 0.8 + twitch;
        });

        // Torso bobbing and head twitching
        this.torso.position.y = Math.sin(time * 16.0) * 0.03;
        this.head.rotation.y = Math.sin(time * 25.0) * 0.1 + (Math.random() - 0.5) * 0.08;
        this.head.rotation.x = Math.cos(time * 18.0) * 0.05 + (Math.random() - 0.5) * 0.05;
    }
}

const AsynchronousMazeMapManager = (function () {

    class AsynchronousMazeMapManager {
        constructor(scene, config) {
            this.scene = scene;
            this.config = config;
            this.chunks = new Map();
            this.chunkSize = 128; // 32 cells * 4 cellSize
            this.activeChunks = new Set();
            this.viewRadius = 1;

            // Geometries
            this.wallGeometry = new THREE.BoxGeometry(4.0, 4.0, 4.0);
            this.floorGeometry = new THREE.PlaneGeometry(4.0, 4.0);
            this.ceilingGeometry = new THREE.PlaneGeometry(4.0, 4.0);

            this._initTextures();
            this._initMaterials();
            this._initDustMotes();

            // Dynamic lights pool
            this.activeLights = new Map();
            this.flickerTimer = 0.0;
            this.flickeringLightKey = null;
            this.flickerEnd = 0.0;

            // Audio System
            this.audioCtx = null;
            this.lastHeartbeat = 0;
            this.heartbeatInterval = 1.0;

            // Sanity Level
            this.sanity = 100.0;

            // Spawner/Entity tracking
            this.stalker = new Stalker();
            this.scene.add(this.stalker.group);
            this.stalker.position = new THREE.Vector3(34.0, 0, 34.0);
            this.stalker.group.position.copy(this.stalker.position);
            this.stalker.active = true;
            this.stalker.hp = 100;
            this.stalker.stunTimer = 0;
            this.stalker.lastPathTime = 0;
            this.stalker.path = [];
            this.stalker.takeDamage = (dmg) => {
                this.stalker.hp -= dmg;
                this.stalker.stunTimer = 3.0; // Stun for 3s
                this.triggerStalkerClick(); // clicking screech feedback

                // Dark/black goo splatters
                for (let i = 0; i < 15; i++) {
                    emitParticle(
                        this.stalker.position.x, 0.8, this.stalker.position.z,
                        (Math.random() - 0.5) * 6, Math.random() * 4, (Math.random() - 0.5) * 6,
                        0.05, 0.05, 0.05,
                        2.5 + Math.random() * 2, 0.4
                    );
                }
            };

            window.stalkerEntity = this.stalker;

            window.ASYNCHRONOUS_MAZE_MODE = true;
        }

        _initTextures() {
            // Wallpaper texture
            const wallCanvas = document.createElement('canvas');
            wallCanvas.width = 512; wallCanvas.height = 512;
            const wCtx = wallCanvas.getContext('2d');
            wCtx.fillStyle = '#d4c594'; // Realistic wallpaper base
            wCtx.fillRect(0, 0, 512, 512);

            // Vertical stripes - subtle and realistic
            wCtx.fillStyle = '#c5b685';
            for (let x = 0; x < 512; x += 32) {
                wCtx.fillRect(x, 0, 6, 512);
            }

            // Plaster grunge
            for (let i = 0; i < 40; i++) {
                const x = Math.random() * 512;
                const y = Math.random() * 512;
                wCtx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
                wCtx.fillRect(x, y, 2 + Math.random() * 4, 2 + Math.random() * 4);
            }

            // Damp wall stains
            for (let i = 0; i < 8; i++) {
                const cx = Math.random() * 512; const cy = Math.random() * 512;
                const r = 35 + Math.random() * 65;
                const grad = wCtx.createRadialGradient(cx, cy, 0, cx, cy, r);
                grad.addColorStop(0, 'rgba(68, 62, 38, 0.45)');
                grad.addColorStop(0.5, 'rgba(68, 62, 38, 0.15)');
                grad.addColorStop(1, 'rgba(68, 62, 38, 0)');
                wCtx.fillStyle = grad; wCtx.beginPath(); wCtx.arc(cx, cy, r, 0, Math.PI * 2); wCtx.fill();
            }

            this.wallTexture = new THREE.CanvasTexture(wallCanvas);
            this.wallTexture.wrapS = THREE.RepeatWrapping;
            this.wallTexture.wrapT = THREE.RepeatWrapping;

            // Carpet diffuse map
            const carpetCanvas = document.createElement('canvas');
            carpetCanvas.width = 512; carpetCanvas.height = 512;
            const cCtx = carpetCanvas.getContext('2d');
            cCtx.fillStyle = '#a19965';
            cCtx.fillRect(0, 0, 512, 512);
            for (let i = 0; i < 8000; i++) {
                const x = Math.random() * 512; const y = Math.random() * 512;
                cCtx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
                cCtx.fillRect(x, y, 1, 2);
            }

            // Carpet roughness map (white = dry/rough, black = wet/shiny)
            const roughCanvas = document.createElement('canvas');
            roughCanvas.width = 512; roughCanvas.height = 512;
            const rCtx = roughCanvas.getContext('2d');
            rCtx.fillStyle = '#f0f0f0'; // Default rough dry carpet
            rCtx.fillRect(0, 0, 512, 512);

            // Draw damp reflection stains
            const wetStains = [
                { cx: 120, cy: 150, r: 80 },
                { cx: 340, cy: 280, r: 120 },
                { cx: 200, cy: 400, r: 90 },
                { cx: 420, cy: 100, r: 70 }
            ];

            wetStains.forEach(s => {
                const cGrad = cCtx.createRadialGradient(s.cx, s.cy, 0, s.cx, s.cy, s.r);
                cGrad.addColorStop(0, 'rgba(54, 49, 28, 0.65)');
                cGrad.addColorStop(0.7, 'rgba(54, 49, 28, 0.2)');
                cGrad.addColorStop(1, 'rgba(54, 49, 28, 0)');
                cCtx.fillStyle = cGrad; cCtx.beginPath(); cCtx.arc(s.cx, s.cy, s.r, 0, Math.PI * 2); cCtx.fill();

                const rGrad = rCtx.createRadialGradient(s.cx, s.cy, 0, s.cx, s.cy, s.r);
                rGrad.addColorStop(0, '#0a0a0a'); // Mirror shiny center
                rGrad.addColorStop(0.7, '#999999');
                rGrad.addColorStop(1, '#f0f0f0');
                rCtx.fillStyle = rGrad; rCtx.beginPath(); rCtx.arc(s.cx, s.cy, s.r, 0, Math.PI * 2); rCtx.fill();
            });

            this.carpetTexture = new THREE.CanvasTexture(carpetCanvas);
            this.carpetTexture.wrapS = THREE.RepeatWrapping;
            this.carpetTexture.wrapT = THREE.RepeatWrapping;

            this.carpetRoughness = new THREE.CanvasTexture(roughCanvas);
            this.carpetRoughness.wrapS = THREE.RepeatWrapping;
            this.carpetRoughness.wrapT = THREE.RepeatWrapping;

            // Ceiling texture (acoustic panels)
            const ceilCanvas = document.createElement('canvas');
            ceilCanvas.width = 256; ceilCanvas.height = 256;
            const ceCtx = ceilCanvas.getContext('2d');
            ceCtx.fillStyle = '#d4ceb0'; ceCtx.fillRect(0, 0, 256, 256);
            for (let i = 0; i < 600; i++) {
                const x = Math.random() * 256; const y = Math.random() * 256;
                ceCtx.fillStyle = 'rgba(75, 68, 48, 0.12)';
                ceCtx.fillRect(x, y, 1 + Math.random() * 2, 1 + Math.random() * 2);
            }
            ceCtx.strokeStyle = '#8c866b'; ceCtx.lineWidth = 6;
            ceCtx.strokeRect(0, 0, 256, 256);

            // Ceiling metalness map (borders are metallic grid lines)
            const metalCanvas = document.createElement('canvas');
            metalCanvas.width = 256; metalCanvas.height = 256;
            const mCtx = metalCanvas.getContext('2d');
            mCtx.fillStyle = '#000000';
            mCtx.fillRect(0, 0, 256, 256);
            mCtx.strokeStyle = '#ffffff'; // White = 100% metallic grid
            mCtx.lineWidth = 6;
            mCtx.strokeRect(0, 0, 256, 256);

            this.ceilingTexture = new THREE.CanvasTexture(ceilCanvas);
            this.ceilingTexture.wrapS = THREE.RepeatWrapping;
            this.ceilingTexture.wrapT = THREE.RepeatWrapping;

            this.ceilingMetalness = new THREE.CanvasTexture(metalCanvas);
            this.ceilingMetalness.wrapS = THREE.RepeatWrapping;
            this.ceilingMetalness.wrapT = THREE.RepeatWrapping;

            // Bump map
            const bumpCanvas = document.createElement('canvas');
            bumpCanvas.width = 128; bumpCanvas.height = 128;
            const bCtx = bumpCanvas.getContext('2d');
            bCtx.fillStyle = '#808080'; bCtx.fillRect(0, 0, 128, 128);
            for (let i = 0; i < 3000; i++) {
                const x = Math.random() * 128; const y = Math.random() * 128;
                bCtx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
                bCtx.fillRect(x, y, 1, 1);
            }
            this.noiseBump = new THREE.CanvasTexture(bumpCanvas);
            this.noiseBump.wrapS = THREE.RepeatWrapping;
            this.noiseBump.wrapT = THREE.RepeatWrapping;
        }

        _initMaterials() {
            this.wallMaterial = new THREE.MeshStandardMaterial({
                map: this.wallTexture,
                bumpMap: this.noiseBump,
                bumpScale: 0.04,
                roughness: 0.8
            });

            this.floorMaterial = new THREE.MeshStandardMaterial({
                map: this.carpetTexture,
                roughnessMap: this.carpetRoughness,
                bumpMap: this.noiseBump,
                bumpScale: 0.03,
                roughness: 1.0 // Read from roughnessMap
            });

            this.ceilingMaterial = new THREE.MeshStandardMaterial({
                map: this.ceilingTexture,
                metalnessMap: this.ceilingMetalness,
                metalness: 1.0, // Read from metalnessMap
                bumpMap: this.noiseBump,
                bumpScale: 0.015,
                roughness: 0.6
            });

            this.fixtureMaterial = new THREE.MeshStandardMaterial({
                color: 0xdddddd,
                emissive: 0xfffae0,
                emissiveIntensity: 1.6,
                roughness: 0.2,
                metalness: 0.8
            });

            this.pipeMaterial = new THREE.MeshStandardMaterial({
                color: 0x666666,
                metalness: 0.9,
                roughness: 0.25
            });
        }

        _initDustMotes() {
            const particleCount = 180;
            const geo = new THREE.BufferGeometry();
            const positions = new Float32Array(particleCount * 3);
            this.dustVelocities = [];

            for (let i = 0; i < particleCount; i++) {
                positions[i * 3] = (Math.random() - 0.5) * 35;
                positions[i * 3 + 1] = Math.random() * 4.0;
                positions[i * 3 + 2] = (Math.random() - 0.5) * 35;

                this.dustVelocities.push({
                    x: (Math.random() - 0.5) * 0.15,
                    y: (Math.random() - 0.5) * 0.08,
                    z: (Math.random() - 0.5) * 0.15
                });
            }

            geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

            // Dust texture
            const canvas = document.createElement('canvas');
            canvas.width = 16; canvas.height = 16;
            const ctx = canvas.getContext('2d');
            const grad = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
            grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
            grad.addColorStop(0.3, 'rgba(255, 255, 255, 0.7)');
            grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = grad;
            ctx.beginPath(); ctx.arc(8, 8, 8, 0, Math.PI * 2); ctx.fill();
            const tex = new THREE.CanvasTexture(canvas);

            const mat = new THREE.PointsMaterial({
                color: 0xfffcf0, // Warm tint dust
                size: 0.07,
                map: tex,
                transparent: true,
                opacity: 0.35,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });

            this.dustPoints = new THREE.Points(geo, mat);
            this.scene.add(this.dustPoints);
        }

        _updateDustMotes(playerPosition, delta) {
            if (!this.dustPoints) return;

            const posAttr = this.dustPoints.geometry.attributes.position;
            const posArr = posAttr.array;

            this.dustPoints.position.copy(playerPosition);
            this.dustPoints.position.y = 0;

            for (let i = 0; i < posArr.length / 3; i++) {
                posArr[i * 3] += this.dustVelocities[i].x * delta;
                posArr[i * 3 + 1] += this.dustVelocities[i].y * delta;
                posArr[i * 3 + 2] += this.dustVelocities[i].z * delta;

                const range = 17.5;
                if (posArr[i * 3] < -range) posArr[i * 3] += range * 2;
                if (posArr[i * 3] > range) posArr[i * 3] -= range * 2;

                if (posArr[i * 3 + 1] < 0.05) posArr[i * 3 + 1] = 3.95;
                if (posArr[i * 3 + 1] > 3.95) posArr[i * 3 + 1] = 0.05;

                if (posArr[i * 3 + 2] < -range) posArr[i * 3 + 2] += range * 2;
                if (posArr[i * 3 + 2] > range) posArr[i * 3 + 2] -= range * 2;
            }

            posAttr.needsUpdate = true;
        }

        _cellHash(x, z) {
            let h = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453123;
            return h - Math.floor(h);
        }

        _isWall(cellX, cellZ) {
            if (Math.abs(cellX) <= 2 && Math.abs(cellZ) <= 2) {
                return false;
            }
            if (cellX % 2 === 0 && cellZ % 2 === 0) {
                return true;
            }
            if (cellX % 2 === 0 || cellZ % 2 === 0) {
                return this._cellHash(cellX, cellZ) < 0.6;
            }
            return false;
        }

        getCostAt(worldX, worldZ) {
            const cs = 4.0;
            const cellX = Math.floor(worldX / cs);
            const cellZ = Math.floor(worldZ / cs);
            return this._isWall(cellX, cellZ) ? 255 : 1;
        }

        _generateChunk(cx, cz) {
            const key = `${cx},${cz}`;
            const worldOffsetX = cx * this.chunkSize;
            const worldOffsetZ = cz * this.chunkSize;

            const chunkGroup = new THREE.Group();
            chunkGroup.position.set(worldOffsetX, 0, worldOffsetZ);
            this.scene.add(chunkGroup);

            let wallCount = 0;
            for (let lz = 0; lz < 32; lz++) {
                for (let lx = 0; lx < 32; lx++) {
                    const cellX = cx * 32 + lx;
                    const cellZ = cz * 32 + lz;
                    if (this._isWall(cellX, cellZ)) {
                        wallCount++;
                    }
                }
            }

            const floorCount = 1024 - wallCount;

            const wallInst = new THREE.InstancedMesh(this.wallGeometry, this.wallMaterial, wallCount);
            wallInst.castShadow = true;
            wallInst.receiveShadow = true;

            const floorInst = new THREE.InstancedMesh(this.floorGeometry, this.floorMaterial, floorCount);
            floorInst.receiveShadow = true;

            const ceilingInst = new THREE.InstancedMesh(this.ceilingGeometry, this.ceilingMaterial, floorCount);
            ceilingInst.receiveShadow = true;

            let wallIdx = 0;
            let floorIdx = 0;
            const tempMatrix = new THREE.Matrix4();
            const cs = 4.0;
            const wallH = 4.0;

            for (let lz = 0; lz < 32; lz++) {
                for (let lx = 0; lx < 32; lx++) {
                    const cellX = cx * 32 + lx;
                    const cellZ = cz * 32 + lz;
                    const posX = lx * cs + cs / 2;
                    const posZ = lz * cs + cs / 2;

                    if (this._isWall(cellX, cellZ)) {
                        tempMatrix.makeTranslation(posX, wallH / 2, posZ);
                        wallInst.setMatrixAt(wallIdx++, tempMatrix);
                    } else {
                        // Floor
                        tempMatrix.makeRotationX(-Math.PI / 2);
                        tempMatrix.setPosition(posX, 0, posZ);
                        floorInst.setMatrixAt(floorIdx, tempMatrix);

                        // Ceiling
                        tempMatrix.makeRotationX(Math.PI / 2);
                        tempMatrix.setPosition(posX, wallH, posZ);
                        ceilingInst.setMatrixAt(floorIdx, tempMatrix);

                        floorIdx++;

                        // Light Fixture
                        if (cellX % 4 === 2 && cellZ % 4 === 2) {
                            const fixture = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.06, 0.5), this.fixtureMaterial);
                            fixture.position.set(posX, wallH - 0.03, posZ);
                            fixture.castShadow = true;
                            chunkGroup.add(fixture);
                        }

                        // Pipes
                        if (this._cellHash(cellX, cellZ) > 0.90) {
                            const pipeGeo = new THREE.CylinderGeometry(0.06, 0.06, cs, 8);
                            const pipe = new THREE.Mesh(pipeGeo, this.pipeMaterial);
                            pipe.position.set(posX, wallH - 0.2, posZ);
                            if (this._cellHash(cellZ, cellX) > 0.5) {
                                pipe.rotation.z = Math.PI / 2;
                            } else {
                                pipe.rotation.x = Math.PI / 2;
                            }
                            pipe.castShadow = true;
                            chunkGroup.add(pipe);
                        }
                    }
                }
            }

            chunkGroup.add(wallInst);
            chunkGroup.add(floorInst);
            chunkGroup.add(ceilingInst);

            this.chunks.set(key, {
                group: chunkGroup,
                cx: cx,
                cz: cz
            });
        }

        _unloadChunk(key) {
            const chunk = this.chunks.get(key);
            if (chunk) {
                this.scene.remove(chunk.group);
                chunk.group.traverse(child => {
                    if (child.geometry) child.geometry.dispose();
                });
                this.chunks.delete(key);
            }
        }

        update(playerPosition, delta = 0) {
            if (!this.audioCtx) {
                this.initAudio();
            }
            if (this.audioCtx && this.audioCtx.state === 'suspended') {
                this.audioCtx.resume();
            }

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

            this._updateDynamicLights(playerPosition, delta);
            this._updateStalker(playerPosition, delta);
            this._updateSanity(playerPosition, delta);
            this._updateDustMotes(playerPosition, delta);
        }

        _updateDynamicLights(playerPosition, delta) {
            const cs = 4.0;
            const lightDistThreshold = 25.0;
            const activeLightKeys = new Set();

            const now = clock.elapsedTime;

            // Light flickering trigger logic
            if (this.flickeringLightKey === null && Math.random() < 0.004) {
                // Select a random active light key
                const keys = Array.from(this.activeLights.keys());
                if (keys.length > 0) {
                    this.flickeringLightKey = keys[Math.floor(Math.random() * keys.length)];
                    this.flickerEnd = now + 0.4 + Math.random() * 0.4;
                    // Trigger click/buzz spatial sound
                    const targetLight = this.activeLights.get(this.flickeringLightKey);
                    if (targetLight) {
                        this.triggerLightFlickerSFX(targetLight.position);
                    }
                }
            }

            for (const [key, chunk] of this.chunks) {
                const worldOffsetX = chunk.cx * this.chunkSize;
                const worldOffsetZ = chunk.cz * this.chunkSize;

                for (let lz = 0; lz < 32; lz++) {
                    for (let lx = 0; lx < 32; lx++) {
                        const cellX = chunk.cx * 32 + lx;
                        const cellZ = chunk.cz * 32 + lz;

                        if (cellX % 4 === 2 && cellZ % 4 === 2 && !this._isWall(cellX, cellZ)) {
                            const posX = worldOffsetX + lx * cs + cs / 2;
                            const posZ = worldOffsetZ + lz * cs + cs / 2;

                            const dx = posX - playerPosition.x;
                            const dz = posZ - playerPosition.z;
                            const dist = Math.sqrt(dx * dx + dz * dz);

                            if (dist < lightDistThreshold) {
                                const lightKey = `${cellX},${cellZ}`;
                                activeLightKeys.add(lightKey);

                                if (!this.activeLights.has(lightKey)) {
                                    const pointLight = new THREE.PointLight(0xffebb3, 1.2, 10.0, 1.5);
                                    pointLight.position.set(posX, 3.8, posZ);
                                    this.scene.add(pointLight);
                                    this.activeLights.set(lightKey, pointLight);
                                }
                            }
                        }
                    }
                }
            }

            // Clean up out of range lights
            for (const [lightKey, pointLight] of this.activeLights) {
                if (!activeLightKeys.has(lightKey)) {
                    this.scene.remove(pointLight);
                    pointLight.dispose();
                    this.activeLights.delete(lightKey);
                    if (this.flickeringLightKey === lightKey) {
                        this.flickeringLightKey = null;
                    }
                }
            }

            // Process lighting shadow casting (enable only on closest 3 lights for performance)
            const lightsList = Array.from(this.activeLights.values());
            lightsList.sort((a, b) => {
                const distA = a.position.distanceTo(playerPosition);
                const distB = b.position.distanceTo(playerPosition);
                return distA - distB;
            });

            lightsList.forEach((light, index) => {
                if (index < 3) {
                    light.castShadow = true;
                    light.shadow.mapSize.width = 512;
                    light.shadow.mapSize.height = 512;
                    light.shadow.bias = -0.002;
                    light.shadow.camera.near = 0.5;
                    light.shadow.camera.far = 12;
                } else {
                    light.castShadow = false;
                }
            });

            // Apply flicker intensity variations
            for (const [lightKey, pointLight] of this.activeLights) {
                if (lightKey === this.flickeringLightKey) {
                    if (now > this.flickerEnd) {
                        this.flickeringLightKey = null;
                        pointLight.intensity = 1.2;
                    } else {
                        // Sputtering intensity
                        pointLight.intensity = Math.random() < 0.25 ? 0.0 : 1.2 * Math.random();
                    }
                } else {
                    pointLight.intensity = 1.2;
                }
            }
        }

        _updateStalker(playerPosition, delta) {
            if (!this.stalker || !this.stalker.active) return;

            const now = clock.elapsedTime;
            const stalkerPos = this.stalker.position;
            const dist = stalkerPos.distanceTo(playerPosition);

            if (dist > 120.0) {
                const angle = Math.random() * Math.PI * 2;
                const spawnDist = 35.0 + Math.random() * 15.0;
                const targetX = playerPosition.x + Math.cos(angle) * spawnDist;
                const targetZ = playerPosition.z + Math.sin(angle) * spawnDist;

                const cellX = Math.floor(targetX / 4.0);
                const cellZ = Math.floor(targetZ / 4.0);
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
                this.stalker.group.position.copy(stalkerPos).addScalar((Math.random() - 0.5) * 0.08);
                return;
            }

            if (now - this.stalker.lastPathTime > 0.3) {
                this.stalker.lastPathTime = now;
                const sCellX = Math.floor(stalkerPos.x / 4.0);
                const sCellZ = Math.floor(stalkerPos.z / 4.0);
                const pCellX = Math.floor(playerPosition.x / 4.0);
                const pCellZ = Math.floor(playerPosition.z / 4.0);

                const newPath = this.findPath(sCellX, sCellZ, pCellX, pCellZ);
                if (newPath && newPath.length > 0) {
                    this.stalker.path = newPath;
                }
            }

            let speed = 3.5;
            if (this.sanity < 50) speed += 0.5;

            if (this.stalker.path && this.stalker.path.length > 0) {
                const targetCell = this.stalker.path[0];
                const targetWorldX = targetCell.x * 4.0 + 2.0;
                const targetWorldZ = targetCell.z * 4.0 + 2.0;

                const dx = targetWorldX - stalkerPos.x;
                const dz = targetWorldZ - stalkerPos.z;
                const cellDist = Math.sqrt(dx * dx + dz * dz);

                if (cellDist < 0.2) {
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
            this.stalker.update(now, 1.0);

            if (Math.random() < 0.015 && dist < 30.0) {
                this.triggerStalkerClick();
            }

            if (dist < 25.0) {
                this.heartbeatInterval = Math.max(0.35, Math.min(1.2, (dist - 4) / 21 * 0.8 + 0.4));
                if (now - this.lastHeartbeat > this.heartbeatInterval) {
                    this.lastHeartbeat = now;
                    this.triggerHeartbeat();
                }
            }

            // Damage check
            if (dist < 1.8 && window.playerHealth > 0) {
                if (!this.lastDmgTime || now - this.lastDmgTime > 0.8) {
                    this.lastDmgTime = now;
                    const dmgAmt = 25;
                    window.playerHealth = Math.max(0, window.playerHealth - dmgAmt);
                    if (player) player.health = window.playerHealth;

                    screenShakeIntensity += 2.5;
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
            if (dist < 20.0) {
                sanityDrain += 4.5 * (1.0 - dist / 20.0);
            }

            if (sanityDrain > 0) {
                this.sanity = Math.max(0, this.sanity - sanityDrain * delta);
            } else {
                this.sanity = Math.min(100, this.sanity + 1.0 * delta);
            }

            // Realistic double-vision and blur filter based on sanity / stalker proximity
            const canvas = document.querySelector('canvas');
            if (canvas) {
                let blurAmt = 0;
                if (this.sanity < 50) {
                    blurAmt += (50 - this.sanity) / 50 * 2.0; // Up to 2px blur
                }
                if (dist < 15.0 && this.stalker.stunTimer <= 0) {
                    blurAmt += (15.0 - dist) / 15.0 * 2.5; // Additional blur on proximity
                }

                if (blurAmt > 0.05) {
                    canvas.style.filter = `blur(${blurAmt.toFixed(2)}px)`;
                    // Add subtle breathing camera scale
                    const scaleFactor = 1.0 + Math.sin(clock.elapsedTime * 2.5) * 0.005 * (blurAmt / 4.0);
                    canvas.style.transform = `scale(${scaleFactor.toFixed(3)})`;
                } else {
                    canvas.style.filter = '';
                    canvas.style.transform = '';
                }
            }
        }

        initAudio() {
            if (this.audioCtx) return;
            try {
                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                this.audioCtx = ctx;

                const master = ctx.createGain();
                master.gain.value = 0.25;
                master.connect(ctx.destination);
                this.masterGain = master;

                // Realistic ballast hum: combine 60Hz and 120Hz tones with high-pitched whine
                const osc60 = ctx.createOscillator();
                osc60.type = 'sawtooth';
                osc60.frequency.value = 60;

                const osc120 = ctx.createOscillator();
                osc120.type = 'sine';
                osc120.frequency.value = 120;

                const oscWhine = ctx.createOscillator();
                oscWhine.type = 'sine';
                oscWhine.frequency.value = 4500; // 4.5kHz fluorescent coil buzz

                const lowpass = ctx.createBiquadFilter();
                lowpass.type = 'lowpass';
                lowpass.frequency.value = 180;

                const whineGain = ctx.createGain();
                whineGain.gain.value = 0.003;

                const lfo = ctx.createOscillator();
                lfo.frequency.value = 0.4;
                const lfoGain = ctx.createGain();
                lfoGain.gain.value = 0.04;

                lfo.connect(lfoGain).connect(master.gain);
                lfo.start();

                osc60.connect(lowpass).connect(master);
                osc120.connect(lowpass).connect(master);
                oscWhine.connect(whineGain).connect(master);

                osc60.start();
                osc120.start();
                oscWhine.start();

                this.humOsc = osc60;
                this.humOsc2 = osc120;
                this.whineOsc = oscWhine;
                this.lfoOsc = lfo;
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

                osc.connect(gain).connect(this.masterGain);
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

                osc.connect(gain).connect(this.masterGain);
                osc.start(t);
                osc.stop(t + 0.04);
            }
        }

        triggerLightFlickerSFX(position) {
            const ctx = this.audioCtx;
            if (!ctx || ctx.state === 'suspended') return;

            const now = ctx.currentTime;
            const count = 3 + Math.floor(Math.random() * 4);
            for (let i = 0; i < count; i++) {
                const t = now + i * 0.04;

                const osc = ctx.createOscillator();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(250 + Math.random() * 1000, t);

                const filter = ctx.createBiquadFilter();
                filter.type = 'bandpass';
                filter.frequency.setValueAtTime(800, t);
                filter.Q.setValueAtTime(4, t);

                const gain = ctx.createGain();
                gain.gain.setValueAtTime(0.035, t);
                gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.02);

                osc.connect(filter).connect(gain).connect(this.masterGain);
                osc.start(t);
                osc.stop(t + 0.02);
            }
        }

        dispose() {
            if (this.stalker) {
                this.scene.remove(this.stalker.group);
                this.stalker = null;
                window.stalkerEntity = null;
            }
            if (this.dustPoints) {
                this.scene.remove(this.dustPoints);
                this.dustPoints.geometry.dispose();
                this.dustPoints.material.dispose();
                this.dustPoints = null;
            }
            if (this.audioCtx) {
                try {
                    if (this.humOsc) this.humOsc.stop();
                    if (this.humOsc2) this.humOsc2.stop();
                    if (this.whineOsc) this.whineOsc.stop();
                    if (this.lfoOsc) this.lfoOsc.stop();
                    this.audioCtx.close();
                } catch (e) { }
                this.audioCtx = null;
            }
            for (const [key, pointLight] of this.activeLights) {
                this.scene.remove(pointLight);
                pointLight.dispose();
            }
            this.activeLights.clear();
            for (const [key, chunk] of this.chunks) {
                this.scene.remove(chunk.group);
                chunk.group.traverse(child => {
                    if (child.geometry) child.geometry.dispose();
                });
            }
            this.chunks.clear();
            const canvas = document.querySelector('canvas');
            if (canvas) {
                canvas.style.transform = '';
                canvas.style.filter = '';
            }
            window.ASYNCHRONOUS_MAZE_MODE = false;
        }
    }

    return AsynchronousMazeMapManager;
})();
