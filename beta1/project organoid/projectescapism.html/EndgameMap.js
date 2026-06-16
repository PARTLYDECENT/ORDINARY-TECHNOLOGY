/**
 * ENDGAME MAP MANAGER: Cosmic Void Glass Plane
 * A highly advanced, interactive, cyber-gothic obsidian mirror plane.
 * Featuring:
 * 1. Cosmic Echo Ripples: Entity footsteps emit expanding holographic light shockwaves.
 * 2. Quantum Basalt Monoliths: Bobbing, rotating basalt obelisks with weapon-reactive core crystals.
 * 3. Dimensional Spatial Rifts: Active weapon-cooling zones that zap nearby zombies with disintegrating lightning.
 */

const EndgameMapManager = (function () {

    class EndgameMapManager {
        constructor(scene, config) {
            this.scene = scene;
            this.config = config;
            this.chunks = new Map();
            this.chunkSize = config.gridSize * config.cellSize; // e.g. 128 units
            this.activeChunks = new Set();
            this.viewRadius = 1; // Number of chunks around the player to keep active
            
            // Interactive bespoke objects
            this.echoRipples = [];
            this.monoliths = [];
            this.rifts = [];
            
            this.time = 0;
            this.playerRippleTimer = 0;
            this.lastPlayerPos = null;

            // Shared geometries & materials for peak GPU performance
            this.rippleGeo = new THREE.RingGeometry(0.8, 1.0, 32);
            this.obsidianMat = new THREE.MeshStandardMaterial({
                color: 0x050308,
                roughness: 0.1,
                metalness: 0.95
            });
            this.goldCoreMat = new THREE.MeshBasicMaterial({
                color: 0xffaa00,
                transparent: true,
                opacity: 0.95
            });
            this.lightningMaterial = new THREE.LineBasicMaterial({
                color: 0x00ffdd,
                linewidth: 3
            });
            this.coolingBeamMaterial = new THREE.LineBasicMaterial({
                color: 0x00ff88,
                linewidth: 4
            });

            // Invulnerable Threat Swarm parameters
            this.threatSwarm = [];
            this.maxThreatCount = 240;
            this.threatMesh = null;
            this.threatInitialized = false;
            this.nextChargeTimer = 6.0; // Randomly send one charging sentry every 6-12 seconds

            // Final Boss: Hatman initialization
            if (window.Hatman) {
                window.hatmanBoss = new window.Hatman(this.scene, this.config);
            }
        }

        update(playerPosition, delta = 0, activeCamera = null) {
            this.time += delta;

            // Update Final Boss
            if (window.hatmanBoss) {
                window.hatmanBoss.update(playerPosition, delta, activeCamera);
            }

            // 1. Chunk Management
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

            // Cleanup distant chunks
            for (const key of this.activeChunks) {
                if (!currentActive.has(key)) {
                    this._unloadChunk(key);
                }
            }
            this.activeChunks = currentActive;

            // 2. Animate and Update Bespoke Features
            this._updateEchoRipples(playerPosition, delta);
            this._updateQuantumMonoliths(playerPosition, delta);
            this._updateSpatialRifts(playerPosition, delta);
            this._updateThreatSwarm(playerPosition, delta);
        }

        getCostAt(worldX, worldZ) {
            // Completely empty plane, no physical static blocks! All coordinates are passable (cost = 1)
            return 1;
        }

        _generateChunk(cx, cz) {
            const key = `${cx},${cz}`;
            const worldOffsetX = cx * this.chunkSize;
            const worldOffsetZ = cz * this.chunkSize;

            const numCells = this.config.gridSize * this.config.gridSize;
            const costField = new Uint8Array(numCells).fill(1);

            const chunkGroup = new THREE.Group();
            chunkGroup.position.set(worldOffsetX, 0, worldOffsetZ);
            this.scene.add(chunkGroup);

            // Procedurally spawn Quantum Basalt Monoliths
            const monolithCount = 2;
            for (let m = 0; m < monolithCount; m++) {
                this._spawnBasaltMonolith(cx, cz, chunkGroup, key);
            }

            // Procedurally spawn Dimensional Spatial Rift
            this._spawnSpatialRift(cx, cz, chunkGroup, key);

            // Scatter occasional ammo and weapon drops in the void
            let ammoCount = 0;
            for (let i = 0; i < numCells; i++) {
                const lx = i % this.config.gridSize;
                const lz = Math.floor(i / this.config.gridSize);
                const wx = lx * this.config.cellSize + worldOffsetX;
                const wz = lz * this.config.cellSize + worldOffsetZ;

                const rand = Math.random();
                if (rand < 0.004 && ammoCount < 5) {
                    this._spawnAmmoDrop(wx, wz, key);
                    ammoCount++;
                }
            }

            this.chunks.set(key, {
                group: chunkGroup,
                costField: costField
            });
        }

        _unloadChunk(key) {
            const chunk = this.chunks.get(key);
            if (chunk) {
                this.scene.remove(chunk.group);
                this.chunks.delete(key);

                // Cleanup ammo drops from this chunk
                if (window.weaponDrops) {
                    for (let i = window.weaponDrops.length - 1; i >= 0; i--) {
                        const drop = window.weaponDrops[i];
                        if (drop.chunkKey === key) {
                            this.scene.remove(drop.mesh);
                            window.weaponDrops.splice(i, 1);
                        }
                    }
                }

                // Cleanup Monolith references
                for (let i = this.monoliths.length - 1; i >= 0; i--) {
                    const m = this.monoliths[i];
                    if (m.chunkKey === key) {
                        m.core.material.dispose();
                        this.monoliths.splice(i, 1);
                    }
                }

                // Cleanup Rift references and dynamic beams
                for (let i = this.rifts.length - 1; i >= 0; i--) {
                    const r = this.rifts[i];
                    if (r.chunkKey === key) {
                        if (r.lightning) {
                            this.scene.remove(r.lightning);
                            r.lightning.geometry.dispose();
                        }
                        if (r.beam) {
                            this.scene.remove(r.beam);
                            r.beam.geometry.dispose();
                        }
                        this.rifts.splice(i, 1);
                    }
                }
            }
        }

        // =====================================================================
        // BESPOKE FEATURE GENERATORS
        // =====================================================================

        _spawnBasaltMonolith(cx, cz, chunkGroup, chunkKey) {
            // Position randomly within chunk group boundaries
            const lx = Math.random() * (this.chunkSize - 30) + 15;
            const lz = Math.random() * (this.chunkSize - 30) + 15;

            const monoGroup = new THREE.Group();
            monoGroup.position.set(lx, 0, lz);

            // 1. Hexagonal Pedestal Base
            const baseGeo = new THREE.CylinderGeometry(1.6, 2.0, 1.2, 6);
            const pedestal = new THREE.Mesh(baseGeo, this.obsidianMat);
            pedestal.position.set(0, 0.6, 0);
            pedestal.castShadow = true;
            pedestal.receiveShadow = true;
            monoGroup.add(pedestal);

            // 2. Floating Lower Hex Sleeve
            const sleeveLowerGeo = new THREE.CylinderGeometry(1.2, 1.2, 0.8, 6);
            const lowerSleeve = new THREE.Mesh(sleeveLowerGeo, this.obsidianMat);
            lowerSleeve.position.set(0, 2.0, 0);
            lowerSleeve.castShadow = true;
            lowerSleeve.receiveShadow = true;
            monoGroup.add(lowerSleeve);

            // 3. Floating Upper Hex Sleeve
            const sleeveUpperGeo = new THREE.CylinderGeometry(1.0, 1.0, 0.8, 6);
            const upperSleeve = new THREE.Mesh(sleeveUpperGeo, this.obsidianMat);
            upperSleeve.position.set(0, 4.0, 0);
            upperSleeve.castShadow = true;
            upperSleeve.receiveShadow = true;
            monoGroup.add(upperSleeve);

            // 4. Hexagonal Crown Ring
            const crownGeo = new THREE.CylinderGeometry(0.6, 1.2, 0.8, 6);
            const crown = new THREE.Mesh(crownGeo, this.obsidianMat);
            crown.position.set(0, 5.4, 0);
            crown.castShadow = true;
            crown.receiveShadow = true;
            monoGroup.add(crown);

            // 5. Golden Quantum Octahedral Core
            const coreGeo = new THREE.OctahedronGeometry(0.38, 0);
            const coreMatInstance = this.goldCoreMat.clone(); // Separate material for independent flares
            const core = new THREE.Mesh(coreGeo, coreMatInstance);
            core.position.set(0, 3.1, 0);
            monoGroup.add(core);

            // Add subtle ambient spotlight upwards
            const coreLight = new THREE.PointLight(0xff9900, 0.8, 6);
            coreLight.position.set(0, 3.1, 0);
            monoGroup.add(coreLight);

            chunkGroup.add(monoGroup);

            this.monoliths.push({
                group: monoGroup,
                lowerSleeve: lowerSleeve,
                upperSleeve: upperSleeve,
                crown: crown,
                core: core,
                light: coreLight,
                chunkKey: chunkKey,
                baseY: { lower: 2.0, upper: 4.0, crown: 5.4, core: 3.1 },
                rotSpeed: (Math.random() * 0.4 + 0.3) * (Math.random() > 0.5 ? 1 : -1),
                flareTimer: 0
            });
        }

        _spawnSpatialRift(cx, cz, chunkGroup, chunkKey) {
            const lx = Math.random() * (this.chunkSize - 40) + 20;
            const lz = Math.random() * (this.chunkSize - 40) + 20;

            const riftGroup = new THREE.Group();
            riftGroup.position.set(lx, 1.8, lz);

            // 1. Dark Void Sphere Core
            const coreGeo = new THREE.SphereGeometry(0.3, 16, 16);
            const coreMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
            const core = new THREE.Mesh(coreGeo, coreMat);
            riftGroup.add(core);

            // 2. Concentric Energy Rings
            const ringMat = new THREE.MeshBasicMaterial({
                color: 0x00ffff,
                transparent: true,
                opacity: 0.75,
                side: THREE.DoubleSide
            });

            const ring1 = new THREE.Mesh(new THREE.TorusGeometry(0.65, 0.025, 6, 24), ringMat);
            const ring2 = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.025, 6, 24), ringMat);
            const ring3 = new THREE.Mesh(new THREE.TorusGeometry(1.45, 0.025, 6, 24), ringMat);

            riftGroup.add(ring1);
            riftGroup.add(ring2);
            riftGroup.add(ring3);

            // Dynamic purple point light
            const light = new THREE.PointLight(0x00ffff, 1.5, 12);
            riftGroup.add(light);

            chunkGroup.add(riftGroup);

            this.rifts.push({
                group: riftGroup,
                rings: [ring1, ring2, ring3],
                light: light,
                chunkKey: chunkKey,
                worldX: lx + cx * this.chunkSize,
                worldZ: lz + cz * this.chunkSize,
                lightning: null,
                beam: null
            });
        }

        _spawnRipple(x, z, hexColor) {
            const ripMat = new THREE.MeshBasicMaterial({
                color: hexColor,
                transparent: true,
                opacity: 0.8,
                side: THREE.DoubleSide
            });
            const ripMesh = new THREE.Mesh(this.rippleGeo, ripMat);
            ripMesh.rotation.x = -Math.PI / 2;
            ripMesh.position.set(x, 0.02, z); // Offsets slightly above flat ground (y=0) to prevent z-fighting

            this.scene.add(ripMesh);

            this.echoRipples.push({
                mesh: ripMesh,
                age: 0,
                maxAge: 1.2,
                startScale: 0.1,
                endScale: 5.0
            });
        }

        spawnGiantPortalShockwave(x, z, hexColor) {
            const ripMat = new THREE.MeshBasicMaterial({
                color: hexColor,
                transparent: true,
                opacity: 0.95,
                side: THREE.DoubleSide,
                blending: THREE.AdditiveBlending
            });
            const ripMesh = new THREE.Mesh(this.rippleGeo, ripMat);
            ripMesh.rotation.x = -Math.PI / 2;
            ripMesh.position.set(x, 0.04, z); // Slightly higher Y to avoid normal footsteps z-fighting

            this.scene.add(ripMesh);

            this.echoRipples.push({
                mesh: ripMesh,
                age: 0,
                maxAge: 2.2, // longer duration for giant shockwave
                startScale: 0.1,
                endScale: 55.0 // expand out to 55 units!
            });
        }

        _spawnAmmoDrop(x, z, chunkKey) {
            if (typeof Shotgun === 'undefined') return;

            const gh = 0.0;
            const dropMesh = new Shotgun();
            dropMesh.scale.set(0.6, 0.6, 0.6);
            if (dropMesh.muzzleLight) dropMesh.remove(dropMesh.muzzleLight);

            dropMesh.position.set(x, gh + 0.4, z);
            dropMesh.rotation.set(0.2, Math.random() * Math.PI * 2, 0.1);

            this.scene.add(dropMesh);
            if (window.weaponDrops) {
                window.weaponDrops.push({
                    mesh: dropMesh,
                    type: Math.random() > 0.5 ? 'shotgun' : 'ar',
                    chunkKey: chunkKey
                });
            }
        }

        // =====================================================================
        // BESPOKE RUNTIME UPDATES
        // =====================================================================

        _updateEchoRipples(playerPosition, delta) {
            // 1. Player Footstep Spawning
            if (!this.lastPlayerPos) {
                this.lastPlayerPos = playerPosition.clone();
            }
            const distMoved = playerPosition.distanceTo(this.lastPlayerPos);
            this.lastPlayerPos.copy(playerPosition);

            if (distMoved > 0.05) {
                this.playerRippleTimer += delta;
                if (this.playerRippleTimer > 0.25) {
                    this.playerRippleTimer = 0;
                    this._spawnRipple(playerPosition.x, playerPosition.z, 0x9900ff); // Neon Violet Echo Wave
                }
            }

            // 2. Active Zombie Footstep Spawning (procedural organic dispersion)
            const zPosX = window.zPosX;
            const zPosZ = window.zPosZ;
            const zState = window.zState;
            const spawnedZombies = (window.getSpawnedZombies ? window.getSpawnedZombies() : 0);

            for (let zi = 0; zi < spawnedZombies; zi++) {
                if (zState[zi] === 0) continue;
                if (Math.random() < 0.008) { // Spawns organically per entity step
                    this._spawnRipple(zPosX[zi], zPosZ[zi], 0xff2200); // Glowing Reddish-Orange Echo
                }
            }

            // 3. Update & scale active ripples
            for (let i = this.echoRipples.length - 1; i >= 0; i--) {
                const rip = this.echoRipples[i];
                rip.age += delta;
                const pct = rip.age / rip.maxAge;
                if (pct >= 1.0) {
                    this.scene.remove(rip.mesh);
                    rip.mesh.geometry.dispose();
                    rip.mesh.material.dispose();
                    this.echoRipples.splice(i, 1);
                } else {
                    const scale = rip.startScale + (rip.endScale - rip.startScale) * pct;
                    rip.mesh.scale.set(scale, scale, 1.0);
                    rip.mesh.material.opacity = (1.0 - pct) * 0.75;
                }
            }
        }

        _updateQuantumMonoliths(playerPosition, delta) {
            // Check if player is discharging a firearm to trigger kinetic resonance flares
            const playerFired = (window.muzzleFlashLight && window.muzzleFlashLight.intensity > 0.0);

            for (const m of this.monoliths) {
                // Bobbing and counter-rotation animations
                m.lowerSleeve.rotation.y += m.rotSpeed * delta;
                m.upperSleeve.rotation.y -= m.rotSpeed * 1.4 * delta;
                m.crown.position.y = m.baseY.crown + 0.14 * Math.sin(this.time * 2.2);

                m.core.rotation.x += delta * 1.6;
                m.core.rotation.y += delta * 1.1;

                const baseScale = 1.0 + 0.12 * Math.sin(this.time * 4.0);

                if (playerFired) {
                    const worldMonoX = m.group.position.x + m.group.parent.position.x;
                    const worldMonoZ = m.group.position.z + m.group.parent.position.z;
                    const dx = playerPosition.x - worldMonoX;
                    const dz = playerPosition.z - worldMonoZ;
                    const distSq = dx * dx + dz * dz;

                    if (distSq < 1600.0) { // Kinetic discharge resonance range (40 units)
                        m.flareTimer = 0.5; // Flare active for 0.5s
                    }
                }

                // Smoothly lerp glowing core size & intensity depending on kinetic resonance
                if (m.flareTimer > 0) {
                    m.flareTimer -= delta;
                    const flareVal = Math.sin(m.flareTimer * Math.PI) * 1.5;
                    m.core.scale.setScalar(baseScale * (1.0 + flareVal));
                    m.core.material.color.setHex(0xff3300); // Flare hot magma red-orange
                    m.light.color.setHex(0xff3300);
                    m.light.intensity = 2.5;

                    // Emit rising embers from the monolith core crystal!
                    if (Math.random() < 0.22 && typeof emitParticle === 'function') {
                        const worldMonoX = m.group.position.x + m.group.parent.position.x;
                        const worldMonoZ = m.group.position.z + m.group.parent.position.z;
                        emitParticle(
                            worldMonoX + (Math.random() - 0.5) * 0.5,
                            4.5 + (Math.random() - 0.5) * 0.5, // Core height is around 4.5
                            worldMonoZ + (Math.random() - 0.5) * 0.5,
                            (Math.random() - 0.5) * 0.4,
                            2.5 + Math.random() * 2.0, // Upward drifting velocity
                            (Math.random() - 0.5) * 0.4,
                            1.0, 0.25, 0.0, // Volcanic orange-red rising ember
                            18, 0.55 // Longer particle life
                        );
                    }
                } else {
                    m.core.scale.setScalar(baseScale);
                    m.core.material.color.setHex(0xffbb00); // Calm golden-amber
                    m.light.color.setHex(0xffbb00);
                    m.light.intensity = 0.8;
                }
            }
        }

        _updateSpatialRifts(playerPosition, delta) {
            const zPosX = window.zPosX;
            const zPosZ = window.zPosZ;
            const zState = window.zState;
            const zHP = window.zHP;
            const spawnedZombies = (window.getSpawnedZombies ? window.getSpawnedZombies() : 0);

            const isCrimson = (window.RealityPhaseShifter && window.RealityPhaseShifter.activeDimension === 1);

            // Dynamically shift colors based on active dimension
            const activeColor = isCrimson ? 0xff4400 : 0x00ffff;
            const lightningColor = isCrimson ? 0xff2200 : 0x00ffdd;
            
            // Set shared materials
            this.coolingBeamMaterial.color.setHex(activeColor);
            this.lightningMaterial.color.setHex(lightningColor);
            
            // Update rifts
            for (const r of this.rifts) {
                // Update ring material colors
                if (r.rings && r.rings[0]) {
                    r.rings[0].material.color.setHex(activeColor);
                }
                r.light.color.setHex(activeColor);

                // 1. Counter-Rotate Concentric Dimensional Rings
                r.rings[0].rotation.x += delta * 1.2;
                r.rings[1].rotation.y -= delta * 1.5;
                r.rings[2].rotation.z += delta * 0.9;

                // Pulsate rift light
                r.light.intensity = 1.5 + 0.5 * Math.sin(this.time * 3.5);

                // 2. Weapon Supercooling Proximity Interaction
                const pdx = playerPosition.x - r.worldX;
                const pdz = playerPosition.z - r.worldZ;
                const pDistSq = pdx * pdx + pdz * pdz;

                if (pDistSq < 16.0) { // Standing within 4 units of rift core
                    // Supercool player weapon instantly!
                    if (window.activeWeaponMesh && window.activeWeaponMesh.heat !== undefined) {
                        window.activeWeaponMesh.heat = 0.0;
                    }

                    // Create/draw weapon-cooling cyan/orange plasma link beam
                    if (!r.beam) {
                        const points = [];
                        for (let i = 0; i <= 10; i++) points.push(new THREE.Vector3());
                        const beamGeo = new THREE.BufferGeometry().setFromPoints(points);
                        r.beam = new THREE.Line(beamGeo, this.coolingBeamMaterial);
                        this.scene.add(r.beam);
                    }

                    const riftPos = new THREE.Vector3(r.worldX, 1.8, r.worldZ);
                    const playerPos = new THREE.Vector3(playerPosition.x, 1.0, playerPosition.z);
                    const positions = r.beam.geometry.attributes.position.array;

                    for (let i = 0; i <= 10; i++) {
                        const ratio = i / 10;
                        const pt = new THREE.Vector3().lerpVectors(riftPos, playerPos, ratio);
                        if (i > 0 && i < 10) {
                            pt.x += (Math.random() - 0.5) * 0.12;
                            pt.y += (Math.random() - 0.5) * 0.12;
                            pt.z += (Math.random() - 0.5) * 0.12;
                        }
                        positions[i * 3] = pt.x;
                        positions[i * 3 + 1] = pt.y;
                        positions[i * 3 + 2] = pt.z;
                    }
                    r.beam.geometry.attributes.position.needsUpdate = true;
                    r.beam.visible = true;
                } else {
                    if (r.beam) r.beam.visible = false;
                }

                // 3. Volatile Gravitational Singularity checks in Crimson Void
                if (isCrimson) {
                    // Pull all solid (Crimson-active) zombies within 12 units directly into core!
                    for (let zi = 0; zi < spawnedZombies; zi++) {
                        if (zState[zi] === 0) continue;
                        if (window.zombieDimensions && window.zombieDimensions[zi] !== 1) continue; // Must be Crimson-active

                        const zdx = zPosX[zi] - r.worldX;
                        const zdz = zPosZ[zi] - r.worldZ;
                        const zDistSq = zdx * zdx + zdz * zdz;
                        if (zDistSq < 144.0) { // 12 units
                            const dist = Math.sqrt(zDistSq);
                            // Stronger pull closer to core
                            const pullStrength = (1.0 - dist / 12.0) * delta * 15.0;
                            if (dist > 0.1) {
                                zPosX[zi] -= (zdx / dist) * pullStrength;
                                zPosZ[zi] -= (zdz / dist) * pullStrength;
                            }
                        }
                    }

                    // Dynamic swirling volcanic singularity vortex particle ring!
                    if (typeof emitParticle === 'function') {
                        const swirlRadius = 1.0 + Math.random() * 3.5;
                        const angle = this.time * 6.0 + Math.random() * Math.PI;
                        const sx = r.worldX + Math.cos(angle) * swirlRadius;
                        const sz = r.worldZ + Math.sin(angle) * swirlRadius;
                        // Velocity spiraling inward and upward
                        const vx = -Math.cos(angle) * 3.0 - Math.sin(angle) * 1.5;
                        const vz = -Math.sin(angle) * 3.0 + Math.cos(angle) * 1.5;
                        const vy = 1.5 + Math.random() * 2.0;

                        emitParticle(
                            sx, 0.05, sz,
                            vx, vy, vz,
                            1.0, 0.15 + Math.random() * 0.2, 0.0, // Lava red-orange color
                            14, 0.4
                        );
                    }
                }

                // 4. Spatial Disintegration Lightning Interaction
                let closestZombieIdx = -1;
                let closestDistSq = 36.0; // Attack range: 6 units

                for (let zi = 0; zi < spawnedZombies; zi++) {
                    if (zState[zi] === 0) continue;
                    // Only shock zombies that are in the active dimension!
                    if (window.zombieDimensions && window.zombieDimensions[zi] !== (isCrimson ? 1 : 0)) continue;

                    const zdx = zPosX[zi] - r.worldX;
                    const zdz = zPosZ[zi] - r.worldZ;
                    const zDistSq = zdx * zdx + zdz * zdz;

                    if (zDistSq < closestDistSq) {
                        closestDistSq = zDistSq;
                        closestZombieIdx = zi;
                    }
                }

                if (closestZombieIdx !== -1) {
                    // Deal heavy tick damage to the close zombie
                    const targetHP = zHP[closestZombieIdx];
                    // Crimson Singularities deal DOUBLE tick damage!
                    const tickDmg = isCrimson ? 180.0 : 90.0;
                    const nextHP = Math.max(0, targetHP - delta * tickDmg);
                    zHP[closestZombieIdx] = nextHP;

                    // If killed by rift, disintegrate
                    if (nextHP <= 0) {
                        zState[closestZombieIdx] = 0;
                        if (window.setActiveZombiesCount) {
                            window.setActiveZombiesCount(window.getActiveZombiesCount() - 1);
                        }
                        if (window.setTotalKillsCount) {
                            window.setTotalKillsCount(window.getTotalKillsCount() + 1);
                        }
                        if (window.PyramidManager) {
                            window.PyramidManager.registerKill(zPosX[closestZombieIdx], 1.0, zPosZ[closestZombieIdx]);
                        }
                        if (window.goreSystem) {
                            const zType = window.zType;
                            const zTypeLabel = zType[closestZombieIdx] === 0 ? 'normal' : (zType[closestZombieIdx] === 1 ? 'puker' : (zType[closestZombieIdx] === 2 ? 'thrower' : 'developed'));
                            window.goreSystem.spawnGoreGribs(zPosX[closestZombieIdx], 1.2, zPosZ[closestZombieIdx], zTypeLabel);
                        }
                        if (typeof SFX !== 'undefined' && SFX.triggerZombieDie) {
                            SFX.triggerZombieDie();
                        }
                    }

                    // Create/update crackling neon-lightning shock beam
                    if (!r.lightning) {
                        const lPoints = [];
                        for (let i = 0; i <= 8; i++) lPoints.push(new THREE.Vector3());
                        const lGeo = new THREE.BufferGeometry().setFromPoints(lPoints);
                        r.lightning = new THREE.Line(lGeo, this.lightningMaterial);
                        this.scene.add(r.lightning);
                    }

                    const riftCenter = new THREE.Vector3(r.worldX, 1.8, r.worldZ);
                    const targetPos = new THREE.Vector3(zPosX[closestZombieIdx], 1.0, zPosZ[closestZombieIdx]);
                    const lPositions = r.lightning.geometry.attributes.position.array;

                    for (let i = 0; i <= 8; i++) {
                        const ratio = i / 8;
                        const pt = new THREE.Vector3().lerpVectors(riftCenter, targetPos, ratio);
                        if (i > 0 && i < 8) {
                            pt.x += (Math.random() - 0.5) * 0.35;
                            pt.y += (Math.random() - 0.5) * 0.35;
                            pt.z += (Math.random() - 0.5) * 0.35;
                        }
                        lPositions[i * 3] = pt.x;
                        lPositions[i * 3 + 1] = pt.y;
                        lPositions[i * 3 + 2] = pt.z;
                    }
                    r.lightning.geometry.attributes.position.needsUpdate = true;
                    r.lightning.visible = true;

                    // Emit beautiful electrical sparks at target feet (red/orange in Crimson, cyan in Violet)
                    if (Math.random() < 0.25 && typeof emitParticle === 'function') {
                        const pr = isCrimson ? 1.0 : 0.0;
                        const pg = isCrimson ? 0.35 : 0.8;
                        const pb = isCrimson ? 0.0 : 1.0;
                        emitParticle(
                            zPosX[closestZombieIdx] + (Math.random() - 0.5) * 0.4,
                            1.0 + Math.random() * 0.5,
                            zPosZ[closestZombieIdx] + (Math.random() - 0.5) * 0.4,
                            (Math.random() - 0.5) * 1.5,
                            3.0 + Math.random() * 2.0,
                            (Math.random() - 0.5) * 1.5,
                            pr, pg, pb,
                            12, 0.2
                        );
                    }
                } else {
                    if (r.lightning) r.lightning.visible = false;
                }
            }
        }

        _initThreatSwarm() {
            if (!window.zombieMeshes || !window.zombieMeshes.normal) return;

            // Clone normal zombie's shader material to make them glow even more menacingly!
            const baseMat = window.zombieMeshes.normal.material;
            const threatMat = baseMat.clone();
            
            // Re-use vertical offset geometry
            const threatGeo = window.zombieMeshes.normal.geometry.clone();

            this.threatMesh = new THREE.InstancedMesh(threatGeo, threatMat, this.maxThreatCount);
            this.scene.add(this.threatMesh);

            // Seed Threat Swarm Ring positions around active rifts
            let tIdx = 0;
            for (const r of this.rifts) {
                const ringCount = 60; // 60 Invulnerable Threat Sentinels per rift!
                const radius = 18.5 + Math.random() * 2.0;

                for (let i = 0; i < ringCount; i++) {
                    if (tIdx >= this.maxThreatCount) break;

                    const angle = (i / ringCount) * Math.PI * 2;
                    const tx = r.worldX + Math.cos(angle) * radius;
                    const tz = r.worldZ + Math.sin(angle) * radius;

                    // Form a matrix facing the rift center
                    const matrix = new THREE.Matrix4();
                    const position = new THREE.Vector3(tx, 0.0, tz);
                    
                    // Facing inward
                    const rotation = new THREE.Matrix4().makeRotationY(angle + Math.PI);
                    const scale = new THREE.Vector3(1.0, 1.0, 1.0);
                    matrix.compose(position, new THREE.Quaternion().setFromRotationMatrix(rotation), scale);

                    this.threatMesh.setMatrixAt(tIdx, matrix);

                    // Add custom instance attribute data
                    this.threatSwarm.push({
                        id: tIdx,
                        riftX: r.worldX,
                        riftZ: r.worldZ,
                        homeX: tx,
                        homeZ: tz,
                        posX: tx,
                        posZ: tz,
                        angle: angle,
                        scale: 1.1 + Math.random() * 0.2, // slightly larger
                        isCharging: false,
                        chargeT: 0.0,
                        respawnT: 0.0
                    });

                    tIdx++;
                }
            }

            // Zero out rest of instance matrices if any
            const zeroMatrix = new THREE.Matrix4().makeScale(0, 0, 0);
            for (let i = tIdx; i < this.maxThreatCount; i++) {
                this.threatMesh.setMatrixAt(i, zeroMatrix);
            }

            this.threatMesh.instanceMatrix.needsUpdate = true;
            this.threatInitialized = true;
            console.log('[Endgame Map] Invulnerable Threat Swarm initialized with sentinels:', tIdx);
        }

        _updateThreatSwarm(playerPosition, delta) {
            if (!this.threatInitialized) {
                this._initThreatSwarm();
                return;
            }

            const isCrimson = (window.RealityPhaseShifter && window.RealityPhaseShifter.activeDimension === 1);
            
            // Randomly detach a threat sentinel to charge the player
            this.nextChargeTimer -= delta;
            if (this.nextChargeTimer <= 0) {
                // Spawn a new charger from the idle sentinels
                const idleSentinels = this.threatSwarm.filter(s => !s.isCharging && s.respawnT <= 0);
                if (idleSentinels.length > 0) {
                    const chosen = idleSentinels[Math.floor(Math.random() * idleSentinels.length)];
                    chosen.isCharging = true;
                    chosen.chargeT = 0.0;
                    chosen.posX = chosen.homeX;
                    chosen.posZ = chosen.homeZ;
                }
                this.nextChargeTimer = 7.0 + Math.random() * 6.0; // Charge every 7-13 seconds
            }

            // Loop and animate all sentinels
            const tempMatrix = new THREE.Matrix4();
            const tempPos = new THREE.Vector3();
            const tempRot = new THREE.Matrix4();
            const tempScale = new THREE.Vector3();
            const tempQuat = new THREE.Quaternion();

            this.threatSwarm.forEach(s => {
                if (s.isCharging) {
                    s.chargeT += delta;
                    
                    // Move directly towards player
                    const dx = playerPosition.x - s.posX;
                    const dz = playerPosition.z - s.posZ;
                    const dist = Math.sqrt(dx * dx + dz * dz);

                    // Hyper-speed rage sprint: 12 units/sec (double inside Crimson Void!)
                    const sprintSpeed = isCrimson ? 22.0 : 12.0;
                    const step = sprintSpeed * delta;

                    if (dist > 1.2) {
                        s.posX += (dx / dist) * step;
                        s.posZ += (dz / dist) * step;
                    }

                    // Face directly at the player
                    const angleToPlayer = Math.atan2(playerPosition.x - s.posX, playerPosition.z - s.posZ);
                    
                    // Fast violent running bob
                    const chargeBob = 0.35 * Math.abs(Math.sin(s.chargeT * 9.0));
                    
                    tempPos.set(s.posX, chargeBob, s.posZ);
                    tempRot.makeRotationY(angleToPlayer);
                    tempScale.setScalar(s.scale * 1.15); // slightly larger when charging
                    tempQuat.setFromRotationMatrix(tempRot);
                    tempMatrix.compose(tempPos, tempQuat, tempScale);
                    this.threatMesh.setMatrixAt(s.id, tempMatrix);

                    // Check proximity to trigger a devastating, invulnerable impact
                    if (dist < 1.6) {
                        s.isCharging = false;
                        s.respawnT = 3.0; // Dissolved for 3 seconds before returning
                        
                        // Apply player damage!
                        if (window.playerHealth && window.player && typeof window.player.takeDamage === 'function') {
                            const activeDmg = isCrimson ? 28 : 14;
                            window.playerHealth = Math.max(0, window.playerHealth - activeDmg);
                            window.player.takeDamage(activeDmg);
                            if (window.SFX && window.SFX.triggerPlayerDie) window.SFX.triggerPlayerDie();
                        }

                        // Trigger red/purple explosion particles
                        if (typeof emitParticle === 'function') {
                            for (let p = 0; p < 18; p++) {
                                emitParticle(
                                    s.posX, 1.2, s.posZ,
                                    (Math.random() - 0.5) * 6, Math.random() * 5 + 1.0, (Math.random() - 0.5) * 6,
                                    isCrimson ? 1.0 : 0.6, 0.0, isCrimson ? 0.05 : 0.8,
                                    10, 0.45
                                );
                            }
                        }
                    }
                } else if (s.respawnT > 0) {
                    s.respawnT -= delta;
                    if (s.respawnT <= 0) {
                        s.posX = s.homeX;
                        s.posZ = s.homeZ;
                    }
                    
                    // Fully dissolved scale=0 matrix
                    tempMatrix.makeScale(0, 0, 0);
                    this.threatMesh.setMatrixAt(s.id, tempMatrix);
                } else {
                    // Regular idle bobbing and swaying sentinel standing in the ring
                    const idleBob = 0.08 * Math.sin(this.time * 2.2 + s.id);
                    
                    tempPos.set(s.homeX, idleBob, s.homeZ);
                    tempRot.makeRotationY(s.angle + Math.PI); // Facing inward
                    
                    // Emphasize scale pulse based on distance to player
                    const pdx = playerPosition.x - s.homeX;
                    const pdz = playerPosition.z - s.homeZ;
                    const pDist = Math.sqrt(pdx * pdx + pdz * pdz);
                    const alertMul = pDist < 7.0 ? 1.25 : 1.0;
                    
                    tempScale.setScalar(s.scale * alertMul);
                    tempQuat.setFromRotationMatrix(tempRot);
                    tempMatrix.compose(tempPos, tempQuat, tempScale);
                    this.threatMesh.setMatrixAt(s.id, tempMatrix);
                }
            });

            this.threatMesh.instanceMatrix.needsUpdate = true;
        }

        dispose() {
            if (window.hatmanBoss) {
                window.hatmanBoss.dispose();
                window.hatmanBoss = null;
            }

            if (this.threatMesh) {
                this.scene.remove(this.threatMesh);
                this.threatMesh.geometry.dispose();
                this.threatMesh.material.dispose();
            }

            for (const rip of this.echoRipples) {
                this.scene.remove(rip.mesh);
                rip.mesh.geometry.dispose();
                rip.mesh.material.dispose();
            }
            this.echoRipples = [];

            for (const key of this.chunks.keys()) {
                this._unloadChunk(key);
            }
            this.chunks.clear();
        }
    }

    return EndgameMapManager;
})();
