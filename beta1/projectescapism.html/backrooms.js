/**
 * BACKROOMS BUILDER: Procedural Concentric Multi-Biome Asset Manager for Level 3
 * Generates Level 0 (Lobby), Level 1 (Warehouse), Level 2 (Maintenance Tunnels),
 * Level 3 (Electrical Station), and Level 4 (Abandoned Offices).
 * Implements 10x spaced out geometries, wallpaper variations, and horror audio synthesis.
 */

// --- MATH & NOISE HELPERS ---
function hash21(x, z) {
    let val = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
    return val - Math.floor(val);
}

const BackroomsBuilder = {
    scene: null,
    geometries: {},
    materials: {},
    textures: {},
    shadowHallucinations: [], // active shadow silhouettes
    sfxTimer: 0,
    blinkingLeds: [], // tracking server LEDs for animation

    getBiome: function (idX, idZ) {
        const dist = Math.sqrt(idX * idX + idZ * idZ);
        if (dist <= 15) return 0; // Level 0: The Lobby
        if (dist <= 30) return 1; // Level 1: Habitable Zone (Industrial)
        if (dist <= 45) return 2; // Level 2: Pipe Dreams (Tunnels)
        if (dist <= 60) return 3; // Level 3: Electrical Station
        return 4;                 // Level 4: Abandoned Offices
    },

    init: function (scene) {
        this.scene = scene;
        this.sfxTimer = 8 + Math.random() * 10;
        this.shadowHallucinations.length = 0;
        this.blinkingLeds.length = 0;

        // Reusable Geometries scaled 10x (spacing is 60.0, height is 6.0)
        this.geometries.pillar = new THREE.BoxGeometry(32.0, 6.0, 32.0);
        this.geometries.wallX = new THREE.BoxGeometry(60.0, 6.0, 12.0);
        this.geometries.wallZ = new THREE.BoxGeometry(12.0, 6.0, 60.0);

        this.geometries.floor = new THREE.PlaneGeometry(60.0, 60.0);
        this.geometries.ceil = new THREE.PlaneGeometry(60.0, 60.0);
        this.geometries.lightCasing = new THREE.BoxGeometry(16.0, 0.4, 8.0);
        this.geometries.puddle = new THREE.PlaneGeometry(24.0, 24.0);

        // Decor geometries
        this.geometries.pipeLong = new THREE.CylinderGeometry(1.2, 1.2, 60.0, 8);
        this.geometries.pipeLong.rotateX(Math.PI / 2); // align along Z
        this.geometries.server = new THREE.BoxGeometry(14.0, 5.0, 12.0);
        this.geometries.led = new THREE.BoxGeometry(0.8, 0.5, 0.8);

        this.geometries.deskTop = new THREE.BoxGeometry(22.0, 0.8, 14.0);
        this.geometries.deskLeg = new THREE.CylinderGeometry(0.5, 0.5, 1.8, 8);

        this.geometries.shadowQuad = new THREE.PlaneGeometry(10.0, 22.0);

        // Generate Procedural Textures
        this._initTextures();

        // Create Materials
        this._initMaterials();
    },

    _initTextures: function () {
        const loader = new THREE.TextureLoader();

        // --- LEVEL 0: Lobby Wallpaper (3 variations!) ---
        this.textures.wallL0_var1 = loader.load('assets/backrooms_wallpaper.png');
        this.textures.wallL0_var2 = loader.load('assets/backrooms_wallpaper2.png');
        this.textures.wallL0_var3 = loader.load('assets/backrooms_wallpaper3.png');
        this.textures.floorL0 = loader.load('assets/backrooms_carpet.png');
        this.textures.ceilL0 = loader.load('assets/backrooms_ceiling.png');

        // --- LEVEL 1: Industrial Concrete ---
        this.textures.wallL1 = loader.load('assets/forest_ground.png');
        this.textures.floorL1 = loader.load('assets/toxic_ground.png');
        this.textures.ceilL1 = loader.load('assets/black_sand.png');

        // --- LEVEL 2: Grimy Moldy Concrete (Maintenance Tunnels) ---
        this.textures.wallL2 = loader.load('assets/wasteland_ground.png');
        this.textures.floorL2 = loader.load('assets/black_sand.png');
        this.textures.ceilL2 = loader.load('assets/toxic_ground.png');

        // --- LEVEL 3: Electrical Station ---
        this.textures.wallL3 = loader.load('assets/tactical_texture.png');
        this.textures.floorL3 = loader.load('assets/black_sand.png');
        this.textures.ceilL3 = loader.load('assets/water_texture.png');

        // --- LEVEL 4: Abandoned Offices ---
        this.textures.wallL4 = loader.load('assets/black_sand.png');
        this.textures.floorL4 = loader.load('assets/tactical_texture.png');
        this.textures.ceilL4 = loader.load('assets/forest_ground.png');

        // --- COMMON ---
        this.textures.puddle = loader.load('assets/water_texture.png');

        // --- SHADOW SILHOUETTE ---
        const cs = document.createElement('canvas'); cs.width = 128; cs.height = 256;
        const ctxs = cs.getContext('2d');
        ctxs.fillStyle = 'rgba(0,0,0,0)'; ctxs.fillRect(0, 0, 128, 256);
        const gr = ctxs.createRadialGradient(64, 128, 5, 64, 128, 60);
        gr.addColorStop(0, 'rgba(0, 0, 0, 0.95)');
        gr.addColorStop(0.5, 'rgba(5, 5, 5, 0.7)');
        gr.addColorStop(1, 'rgba(0, 0, 0, 0.0)');
        ctxs.fillStyle = gr;
        ctxs.beginPath(); ctxs.arc(64, 40, 20, 0, Math.PI * 2); ctxs.fill();
        ctxs.beginPath();
        ctxs.moveTo(64, 60);
        ctxs.bezierCurveTo(30, 80, 25, 200, 40, 240);
        ctxs.lineTo(88, 240);
        ctxs.bezierCurveTo(103, 200, 98, 80, 64, 60);
        ctxs.fill();
        this.textures.shadowSil = new THREE.CanvasTexture(cs);

        // Wrapping setup for 10x larger hallways (increased repeat to keep texture details sharp)
        const wallTextures = [
            this.textures.wallL0_var1, this.textures.wallL0_var2, this.textures.wallL0_var3,
            this.textures.wallL1, this.textures.wallL2, this.textures.wallL3, this.textures.wallL4
        ];
        wallTextures.forEach(t => {
            if (t) {
                t.wrapS = t.wrapT = THREE.RepeatWrapping;
                t.repeat.set(10, 2); // repeats 10x horizontally, 2x vertically
            }
        });

        const floorCeilTextures = [
            this.textures.floorL0, this.textures.ceilL0,
            this.textures.floorL1, this.textures.ceilL1,
            this.textures.floorL2, this.textures.ceilL2,
            this.textures.floorL3, this.textures.ceilL3,
            this.textures.floorL4, this.textures.ceilL4,
            this.textures.puddle
        ];
        floorCeilTextures.forEach(t => {
            if (t) {
                t.wrapS = t.wrapT = THREE.RepeatWrapping;
                t.repeat.set(8, 8); // repeats 8x8 over floor/ceiling
            }
        });
    },

    _initMaterials: function () {
        // --- LEVEL 0 (Lobby) ---
        this.materials.wallL0_var1 = new THREE.MeshStandardMaterial({ map: this.textures.wallL0_var1, roughness: 0.8, metalness: 0.02 });
        this.materials.wallL0_var2 = new THREE.MeshStandardMaterial({ map: this.textures.wallL0_var2, roughness: 0.8, metalness: 0.02 });
        this.materials.wallL0_var3 = new THREE.MeshStandardMaterial({ map: this.textures.wallL0_var3, roughness: 0.8, metalness: 0.02 });
        this.materials.floorL0 = new THREE.MeshStandardMaterial({ map: this.textures.floorL0, roughness: 0.9, metalness: 0.0 });
        this.materials.ceilL0 = new THREE.MeshStandardMaterial({ map: this.textures.ceilL0, roughness: 0.85, metalness: 0.0 });

        // --- LEVEL 1 (Industrial Warehouse) ---
        this.materials.wallL1 = new THREE.MeshStandardMaterial({ map: this.textures.wallL1, color: 0x4f4f54, roughness: 0.75, metalness: 0.1 });
        this.materials.floorL1 = new THREE.MeshStandardMaterial({ map: this.textures.floorL1, color: 0x222224, roughness: 0.45, metalness: 0.2 });
        this.materials.ceilL1 = new THREE.MeshStandardMaterial({ map: this.textures.ceilL1, color: 0x151518, roughness: 0.6, metalness: 0.75 });
        this.materials.pipeSteel = new THREE.MeshStandardMaterial({ color: 0x5a5b61, roughness: 0.25, metalness: 0.9 });
        this.materials.pipeCaution = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.5, metalness: 0.2 });

        // --- LEVEL 2 (Maintenance Tunnels) ---
        this.materials.wallL2 = new THREE.MeshStandardMaterial({ map: this.textures.wallL2, color: 0x2e2e2a, roughness: 0.9, metalness: 0.05 });
        this.materials.floorL2 = new THREE.MeshStandardMaterial({ map: this.textures.floorL2, color: 0x1b1b1c, roughness: 0.8, metalness: 0.0 });
        this.materials.ceilL2 = new THREE.MeshStandardMaterial({ map: this.textures.ceilL2, color: 0x121214, roughness: 0.75, metalness: 0.6 });

        // --- LEVEL 3 (Electrical Station) ---
        this.materials.wallL3 = new THREE.MeshStandardMaterial({ map: this.textures.wallL3, color: 0x55585d, roughness: 0.35, metalness: 0.8 });
        this.materials.floorL3 = new THREE.MeshStandardMaterial({ map: this.textures.floorL3, color: 0x2c2e30, roughness: 0.4, metalness: 0.85 });
        this.materials.ceilL3 = new THREE.MeshStandardMaterial({ map: this.textures.ceilL3, color: 0x0a0a0c, roughness: 0.8, metalness: 0.3 });
        this.materials.serverCasing = new THREE.MeshStandardMaterial({ color: 0x1c1e21, roughness: 0.3, metalness: 0.85 });
        this.materials.ledGreen = new THREE.MeshBasicMaterial({ color: 0x00ff33 });
        this.materials.ledBlue = new THREE.MeshBasicMaterial({ color: 0x0066ff });

        // --- LEVEL 4 (Abandoned Offices) ---
        this.materials.wallL4 = new THREE.MeshStandardMaterial({ map: this.textures.wallL4, color: 0xdadada, roughness: 0.9, metalness: 0.0 });
        this.materials.floorL4 = new THREE.MeshStandardMaterial({ map: this.textures.floorL4, color: 0x1e2c3b, roughness: 0.9, metalness: 0.0 });
        this.materials.ceilL4 = new THREE.MeshStandardMaterial({ map: this.textures.ceilL4, color: 0xf5f5f5, roughness: 0.85, metalness: 0.0 });
        this.materials.deskWood = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.7, metalness: 0.0 });
        this.materials.deskMetal = new THREE.MeshStandardMaterial({ color: 0x2e3033, roughness: 0.45, metalness: 0.8 });

        // --- COMMON MATERIALS ---
        this.materials.lightDiffuser = new THREE.MeshBasicMaterial({ color: 0xfffebb });
        this.materials.lightDiffuserOff = new THREE.MeshStandardMaterial({ color: 0x4f4d45, roughness: 0.7, metalness: 0.1 });
        this.materials.lightCasing = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.5, metalness: 0.8 });
        this.materials.puddle = new THREE.MeshStandardMaterial({ map: this.textures.puddle, color: 0x18120a, roughness: 0.02, metalness: 0.3, transparent: true, opacity: 0.75 });

        this.materials.shadowHallucination = new THREE.MeshBasicMaterial({
            map: this.textures.shadowSil,
            transparent: true,
            opacity: 0.85,
            depthWrite: false,
            side: THREE.DoubleSide
        });
    },

    generateCell: function (idX, idZ, chunkGroup, resources) {
        const b = this.getBiome(idX, idZ);
        
        const cellSize = 60.0;
        const lx = ((idX % 10) + 10) % 10;
        const lz = ((idZ % 10) + 10) % 10;
        const wx = lx * cellSize + cellSize * 0.5;
        const wz = lz * cellSize + cellSize * 0.5;
        const worldX = wx + chunkGroup.position.x;
        const worldZ = wz + chunkGroup.position.z;

        // --- 1. FLOOR & CEILING SPAWNING ---
        let floorMat = this.materials.floorL0;
        let ceilMat = this.materials.ceilL0;
        let wallMat = this.materials.wallL0_var1;

        if (b === 0) {
            // Apply wallpaper variation based on coordinate hash
            const varHash = hash21(idX + 0.1, idZ + 0.1);
            if (varHash < 0.33) wallMat = this.materials.wallL0_var2;
            else if (varHash < 0.66) wallMat = this.materials.wallL0_var3;
        } else if (b === 1) {
            floorMat = this.materials.floorL1;
            ceilMat = this.materials.ceilL1;
            wallMat = this.materials.wallL1;
        } else if (b === 2) {
            floorMat = this.materials.floorL2;
            ceilMat = this.materials.ceilL2;
            wallMat = this.materials.wallL2;
        } else if (b === 3) {
            floorMat = this.materials.floorL3;
            ceilMat = this.materials.ceilL3;
            wallMat = this.materials.wallL3;
        } else if (b === 4) {
            floorMat = this.materials.floorL4;
            ceilMat = this.materials.ceilL4;
            wallMat = this.materials.wallL4;
        }

        const floor = new THREE.Mesh(this.geometries.floor, floorMat);
        floor.position.set(wx, 0.0, wz);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        chunkGroup.add(floor);

        const ceil = new THREE.Mesh(this.geometries.ceil, ceilMat);
        ceil.position.set(wx, 6.0, wz);
        ceil.rotation.x = Math.PI / 2;
        ceil.receiveShadow = true;
        chunkGroup.add(ceil);

        // --- 2. CEILING LIGHT FIXTURE (Scaled for larger rooms) ---
        if (b !== 4) {
            const lightC = new THREE.Mesh(this.geometries.lightCasing, this.materials.lightCasing);
            lightC.position.set(wx, 5.98, wz);
            chunkGroup.add(lightC);

            const diffuser = new THREE.Mesh(this.geometries.lightCasing, this.materials.lightDiffuser);
            diffuser.scale.set(0.95, 0.5, 0.95);
            diffuser.position.set(wx, 5.94, wz);
            chunkGroup.add(diffuser);

            resources.lightFixtures.push({
                pos: new THREE.Vector3(worldX, 5.0, worldZ),
                mesh: diffuser,
                idX: idX,
                idZ: idZ,
                biome: b
            });
        }

        // --- 3. STRUCTURES (WALLS, PILLARS) ---
        const h = hash21(idX, idZ);

        // Spawn protection: do not spawn any walls or pillars in the 3x3 cells around spawn
        if (Math.abs(idX) <= 1 && Math.abs(idZ) <= 1) {
            this._spawnBiomeProps(b, wx, wz, h, chunkGroup);
            return;
        }

        if (h < 0.25) {
            // Pillar (32.0 x 32.0 units)
            const pillar = new THREE.Mesh(this.geometries.pillar, wallMat);
            pillar.position.set(wx, 3.0, wz);
            pillar.castShadow = true;
            pillar.receiveShadow = true;
            chunkGroup.add(pillar);
        } else if (h < 0.6) {
            const h2 = hash21(idX + 0.5, idZ);

            if (h2 > 0.5) {
                // Wall along X (60.0 length x 12.0 thickness)
                const wall = new THREE.Mesh(this.geometries.wallX, wallMat);
                wall.position.set(wx, 3.0, wz);
                wall.castShadow = true;
                wall.receiveShadow = true;
                chunkGroup.add(wall);
            } else {
                // Wall along Z (12.0 thickness x 60.0 length)
                const wall = new THREE.Mesh(this.geometries.wallZ, wallMat);
                wall.position.set(wx, 3.0, wz);
                wall.castShadow = true;
                wall.receiveShadow = true;
                chunkGroup.add(wall);
            }
        } else {
            // Open Cell - Spawn Biome-Specific Props/Decals
            this._spawnBiomeProps(b, wx, wz, h, chunkGroup);
        }
    },

    _spawnBiomeProps: function (biome, wx, wz, h, chunkGroup) {
        // Floor Puddle
        if (h > 0.9 && (biome === 0 || biome === 1 || biome === 2)) {
            const puddle = new THREE.Mesh(this.geometries.puddle, this.materials.puddle);
            puddle.position.set(wx, 0.01, wz);
            puddle.rotation.x = -Math.PI / 2;
            chunkGroup.add(puddle);
        }

        if (biome === 1) {
            // LEVEL 1: Steel pipes running along the ceiling
            if (h > 0.7) {
                const pipe = new THREE.Mesh(this.geometries.pipeLong, this.materials.pipeSteel);
                pipe.position.set(wx, 5.2, wz);
                chunkGroup.add(pipe);
            }
        } else if (biome === 2) {
            // LEVEL 2: Dense warning pipes + steam leaks
            if (h > 0.6) {
                const pipe = new THREE.Mesh(this.geometries.pipeLong, this.materials.pipeCaution);
                pipe.position.set(wx, 5.2, wz);
                chunkGroup.add(pipe);

                const pipeCross = new THREE.Mesh(this.geometries.pipeLong, this.materials.pipeSteel);
                pipeCross.rotation.y = Math.PI / 2;
                pipeCross.position.set(wx, 5.4, wz);
                chunkGroup.add(pipeCross);
            }
        } else if (biome === 3) {
            // LEVEL 3: Server racks with blinking indicator LEDs (Scaled up)
            const server = new THREE.Mesh(this.geometries.server, this.materials.serverCasing);
            server.position.set(wx, 2.5, wz);
            server.castShadow = true;
            server.receiveShadow = true;
            chunkGroup.add(server);

            for (let yOffset = 0.8; yOffset <= 4.2; yOffset += 0.8) {
                const isGreen = Math.random() > 0.5;
                const led = new THREE.Mesh(
                    this.geometries.led, 
                    isGreen ? this.materials.ledGreen : this.materials.ledBlue
                );
                // Position on front panel of server rack (depth is 12, so front is at wz + 6.05)
                led.position.set(wx - 5.0 + Math.random() * 2.0, yOffset, wz + 6.05);
                chunkGroup.add(led);

                this.blinkingLeds.push({
                    mesh: led,
                    baseColor: isGreen ? new THREE.Color(0x00ff33) : new THREE.Color(0x0066ff),
                    rate: 3 + Math.random() * 8,
                    offset: Math.random() * Math.PI
                });
            }
        } else if (biome === 4) {
            // LEVEL 4: Office furniture (cubicle desk - Scaled up)
            const desk = new THREE.Group();
            desk.position.set(wx, 0.0, wz);

            const top = new THREE.Mesh(this.geometries.deskTop, this.materials.deskWood);
            top.position.y = 1.8;
            top.castShadow = true;
            top.receiveShadow = true;
            desk.add(top);

            const offsets = [
                { x: -10.0, z: -6.0 },
                { x: 10.0, z: -6.0 },
                { x: -10.0, z: 6.0 },
                { x: 10.0, z: 6.0 }
            ];
            offsets.forEach(o => {
                const leg = new THREE.Mesh(this.geometries.deskLeg, this.materials.deskMetal);
                leg.position.set(o.x, 0.9, o.z);
                leg.castShadow = true;
                desk.add(leg);
            });

            desk.rotation.y = h * Math.PI * 2;
            chunkGroup.add(desk);
        }

        // --- 4. SHADOW HALLUCINATION SPAWNER ---
        if ((biome === 2 || biome === 4) && h > 0.85 && h < 0.9) {
            const shadow = new THREE.Mesh(this.geometries.shadowQuad, this.materials.shadowHallucination);
            shadow.position.set(wx + (Math.random() - 0.5) * 15.0, 2.2, wz + (Math.random() - 0.5) * 15.0);
            this.scene.add(shadow);
            this.shadowHallucinations.push(shadow);
        }
    },

    update: function (playerPosition, delta, activeCamera, audioCtx) {
        // 1. Animate Server Indicator LEDs (Level 3)
        const time = (performance.now() * 0.001);
        this.blinkingLeds.forEach(led => {
            const pulse = Math.sin(time * led.rate + led.offset) > 0.0 ? 1.0 : 0.15;
            led.mesh.material.color.copy(led.baseColor).multiplyScalar(pulse);
        });

        // 2. Update Shadow Hallucinations (Level 2 & 4)
        const flashLightOn = window.flashLight && window.flashLight.visible;
        
        for (let i = this.shadowHallucinations.length - 1; i >= 0; i--) {
            const shadow = this.shadowHallucinations[i];
            shadow.quaternion.copy(activeCamera.quaternion);
            shadow.rotation.x = 0;
            shadow.rotation.z = 0;

            const dist = playerPosition.distanceTo(shadow.position);

            if (dist > 350.0) {
                this.scene.remove(shadow);
                this.shadowHallucinations.splice(i, 1);
                continue;
            }

            let shouldFade = false;

            if (flashLightOn && dist < 120.0) {
                const camDir = new THREE.Vector3(0, 0, -1).applyQuaternion(activeCamera.quaternion).normalize();
                const toShadow = shadow.position.clone().sub(activeCamera.position).normalize();
                const angle = camDir.angleTo(toShadow);

                if (angle < 0.32) {
                    shouldFade = true;
                }
            }

            if (dist < 20.0) {
                shouldFade = true;
            }

            if (shouldFade) {
                shadow.material.opacity -= delta * 1.8;
                shadow.position.y -= delta * 3.0;

                if (shadow.material.opacity > 0.8 && shadow.material.opacity < 0.85) {
                    this._playStaticHiss(audioCtx);
                }

                if (shadow.material.opacity <= 0.0) {
                    this.scene.remove(shadow);
                    this.shadowHallucinations.splice(i, 1);
                }
            }
        }

        // 3. Ambient Audio Horror Engine Synthesizer
        this.sfxTimer -= delta;
        if (this.sfxTimer <= 0) {
            this.sfxTimer = 14 + Math.random() * 15;
            this._triggerHorrorSound(audioCtx, playerPosition);
        }
    },

    _playStaticHiss: function (audioCtx) {
        if (!audioCtx || audioCtx.state === 'suspended') return;
        try {
            const now = audioCtx.currentTime;
            const bufferSize = audioCtx.sampleRate * 0.35;
            const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1) * 0.06;
            }
            const noise = audioCtx.createBufferSource();
            noise.buffer = buffer;

            const filter = audioCtx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(3200, now);
            filter.Q.setValueAtTime(4, now);

            noise.connect(filter).connect(audioCtx.destination);
            noise.start(now);
        } catch (e) {}
    },

    _triggerHorrorSound: function (audioCtx, playerPos) {
        if (!audioCtx || audioCtx.state === 'suspended') return;
        try {
            const b = this.getBiome(playerPos.x / 60.0, playerPos.z / 60.0);
            const now = audioCtx.currentTime;
            
            if (b === 0) {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(100, now);
                osc.frequency.exponentialRampToValueAtTime(15, now + 1.2);
                gain.gain.setValueAtTime(0.4, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

                const filter = audioCtx.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(80, now);

                osc.connect(filter).connect(gain).connect(audioCtx.destination);
                osc.start(now);
                osc.stop(now + 1.2);
            } else if (b === 1 || b === 2) {
                const bufferSize = audioCtx.sampleRate * 2.0; 
                const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
                const data = buffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

                const noise = audioCtx.createBufferSource();
                noise.buffer = buffer;

                const filter = audioCtx.createBiquadFilter();
                filter.type = 'bandpass';
                filter.frequency.setValueAtTime(450, now);
                filter.frequency.linearRampToValueAtTime(180, now + 2.0);

                const gain = audioCtx.createGain();
                gain.gain.setValueAtTime(0.001, now);
                gain.gain.linearRampToValueAtTime(0.2, now + 0.3);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 2.0);

                noise.connect(filter).connect(gain).connect(audioCtx.destination);
                noise.start(now);
                noise.stop(now + 2.0);
            } else if (b === 3) {
                for (let i = 0; i < 4; i++) {
                    const t = now + i * 0.08;
                    const osc = audioCtx.createOscillator();
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(800 + Math.random() * 600, t);
                    const gain = audioCtx.createGain();
                    gain.gain.setValueAtTime(0.12, t);
                    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

                    const filter = audioCtx.createBiquadFilter();
                    filter.type = 'highpass';
                    filter.frequency.setValueAtTime(1200, t);

                    osc.connect(filter).connect(gain).connect(audioCtx.destination);
                    osc.start(t);
                    osc.stop(t + 0.06);
                }
            } else {
                const osc = audioCtx.createOscillator();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(45, now);
                osc.frequency.linearRampToValueAtTime(38, now + 1.8);

                const filter = audioCtx.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(45, now);

                const gain = audioCtx.createGain();
                gain.gain.setValueAtTime(0.001, now);
                gain.gain.linearRampToValueAtTime(0.6, now + 0.9);
                gain.gain.linearRampToValueAtTime(0.001, now + 1.8);

                osc.connect(filter).connect(gain).connect(audioCtx.destination);
                osc.start(now);
                osc.stop(now + 1.8);
            }
        } catch (e) {}
    },

    dispose: function () {
        this.shadowHallucinations.forEach(s => {
            if (s.parent) this.scene.remove(s);
        });
        this.shadowHallucinations.length = 0;
        this.blinkingLeds.length = 0;

        for (const k in this.textures) {
            if (this.textures[k]) this.textures[k].dispose();
        }
        this.textures = {};

        for (const k in this.geometries) {
            if (this.geometries[k]) this.geometries[k].dispose();
        }
        this.geometries = {};

        for (const k in this.materials) {
            if (this.materials[k]) this.materials[k].dispose();
        }
        this.materials = {};
    }
};

window.BackroomsBuilder = BackroomsBuilder;
