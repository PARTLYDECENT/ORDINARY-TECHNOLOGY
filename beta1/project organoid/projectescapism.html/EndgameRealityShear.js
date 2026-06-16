/**
 * ENDGAME REALITY PHASE-SHEARING SYSTEM (V2.0)
 * A highly innovative multi-dimensional arena gameplay mode.
 * Shifts reality dynamically between:
 * - Dimension 0 (The Violet Void): Deep purple stardust atmosphere.
 * - Dimension 1 (The Crimson Void): Hyper-speed crimson rage void (speed buffs for player and zombies).
 * Intercepts matrices on the main thread and renders opposite-dimension zombies as hovering glowing quantum embers.
 *
 * ADVANCED BESPOKE ADDITIONS:
 * - Spatial Shatter Debris: 30 flat diamond glass shards blast out in all directions on portal shift.
 * - Viewmodel High-Frequency Jitter: Represents extreme dimension friction.
 */

const RealityPhaseShifter = (function () {

    class RealityPhaseShifter {
        constructor() {
            this.activeDimension = 0; // 0 = Violet Void, 1 = Crimson Void
            this.time = 0;
            
            this.scene = null;
            this.dirLight = null;
            this.ambientLight = null;

            this.shatterDome = null;
            this.shatterTimer = 0;
            this.flashEl = null;

            this.ghostPool = [];
            this.maxGhosts = 120;

            // Premium Spatial Debris Particle Pool
            this.shardPool = [];
            this.maxShards = 30;
        }

        init(scene, dirLight, ambientLight) {
            this.scene = scene;
            this.dirLight = dirLight;
            this.ambientLight = ambientLight;

            // 1. Initialize global zombie dimension tracker array
            window.zombieDimensions = new Uint8Array(256);
            for (let i = 0; i < 256; i++) {
                window.zombieDimensions[i] = Math.random() > 0.5 ? 0 : 1;
            }

            // 2. Set Initial Violet Void ambient lighting & fog
            if (scene) {
                scene.fog = new THREE.FogExp2(0x0c001a, 0.015);
            }
            if (ambientLight) {
                ambientLight.color.setHex(0x150825);
                ambientLight.intensity = 0.5; // Make the dark ambient pops visible
            }
            if (dirLight) {
                dirLight.color.setHex(0x6020a0);
                dirLight.intensity = 0.8;
            }

            // 3. Bind Keyboard "Q" Listener for Reality Phase Shatter
            window.removeEventListener('keydown', this._handleKey);
            this._handleKey = (e) => {
                if (e.key.toLowerCase() === 'q') {
                    // Check if player is alive
                    if (window.playerHealth && window.playerHealth > 0) {
                        this.phaseShift();
                    }
                }
            };
            window.addEventListener('keydown', this._handleKey);

            // 4. Create visual Reality Shatter Dome mesh
            const domeGeo = new THREE.SphereGeometry(1.0, 32, 16);
            const domeMat = new THREE.MeshBasicMaterial({
                color: 0xff3300,
                transparent: true,
                opacity: 0.0,
                side: THREE.DoubleSide,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });
            this.shatterDome = new THREE.Mesh(domeGeo, domeMat);
            this.shatterDome.visible = false;
            scene.add(this.shatterDome);

            // 5. Create low-overhead Translucent Quantum Embers Ghost Pool
            const sphereGeo = new THREE.SphereGeometry(0.16, 8, 8);
            this.ghostPool = [];
            for (let i = 0; i < this.maxGhosts; i++) {
                const mat = new THREE.MeshBasicMaterial({
                    color: 0xff3300,
                    transparent: true,
                    opacity: 0.78,
                    blending: THREE.AdditiveBlending
                });
                const mesh = new THREE.Mesh(sphereGeo, mat);
                mesh.visible = false;
                scene.add(mesh);
                this.ghostPool.push(mesh);
            }

            // 6. Premium Spatial Shatter Debris (Flat Glass Shards) Pool
            const shardGeo = new THREE.ConeGeometry(0.18, 0.45, 4);
            shardGeo.rotateX(Math.PI / 2); // Rotate flat
            shardGeo.scale(1.0, 0.08, 1.0); // Flatten to a thin shard
            this.shardPool = [];
            for (let i = 0; i < this.maxShards; i++) {
                const mat = new THREE.MeshBasicMaterial({
                    color: 0x00ffff,
                    transparent: true,
                    opacity: 0.0,
                    side: THREE.DoubleSide,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false
                });
                const mesh = new THREE.Mesh(shardGeo, mat);
                mesh.visible = false;
                scene.add(mesh);
                this.shardPool.push({
                    mesh: mesh,
                    vel: new THREE.Vector3(),
                    rotVel: new THREE.Vector3(),
                    life: 0,
                    maxLife: 1.4
                });
            }

            // 7. Dynamically build full-screen visual flash element
            this.flashEl = document.getElementById('reality-shear-flash');
            if (!this.flashEl) {
                this.flashEl = document.createElement('div');
                this.flashEl.id = 'reality-shear-flash';
                this.flashEl.style.position = 'fixed';
                this.flashEl.style.top = '0';
                this.flashEl.style.left = '0';
                this.flashEl.style.width = '100vw';
                this.flashEl.style.height = '100vh';
                this.flashEl.style.pointerEvents = 'none';
                this.flashEl.style.zIndex = '99999';
                this.flashEl.style.opacity = '0';
                document.body.appendChild(this.flashEl);
            }

            // Append small controls HUD reminder in screen corner
            let hudTip = document.getElementById('reality-shear-tip');
            if (!hudTip) {
                hudTip = document.createElement('div');
                hudTip.id = 'reality-shear-tip';
                hudTip.style.position = 'fixed';
                hudTip.style.bottom = '95px';
                hudTip.style.right = '20px';
                hudTip.style.fontFamily = "'Outfit', sans-serif";
                hudTip.style.fontSize = '12px';
                hudTip.style.color = '#aa88ff';
                hudTip.style.textShadow = '0 0 5px rgba(170,136,255,0.8)';
                hudTip.style.letterSpacing = '1px';
                hudTip.style.background = 'rgba(10, 0, 20, 0.75)';
                hudTip.style.padding = '8px 12px';
                hudTip.style.borderRadius = '5px';
                hudTip.style.border = '1px solid #5522aa';
                hudTip.style.pointerEvents = 'none';
                hudTip.innerHTML = `[Q] REALITY PHASE-SHIFT <br><span id="rs-status" style="color:#00ffaa;font-weight:bold;">ACTIVE PLANE: VIOLET VOID</span>`;
                document.body.appendChild(hudTip);
            }
        }

        phaseShift() {
            this.activeDimension = this.activeDimension === 0 ? 1 : 0;

            // Trigger beautiful full-screen flash transition
            if (this.flashEl) {
                this.flashEl.style.transition = 'none';
                this.flashEl.style.opacity = '0.75';
                this.flashEl.style.backgroundColor = this.activeDimension === 0 ? '#9900ff' : '#ff2200';
                this.flashEl.offsetHeight; // Force DOM reflow
                this.flashEl.style.transition = 'opacity 0.45s ease-out';
                this.flashEl.style.opacity = '0';
            }

            // Synthesize bass drop portal shift sound effect procedurally on Web Audio API
            this.playProceduralSound();

            // Set visual dome color and activate expansion
            this.shatterTimer = 0.45;
            if (this.shatterDome) {
                this.shatterDome.material.color.setHex(this.activeDimension === 0 ? 0xaa00ff : 0xff3300);
            }

            // Swap atmospheric fog, directional and ambient lights
            if (this.scene && this.scene.fog) {
                this.scene.fog.color.setHex(this.activeDimension === 0 ? 0x0c001a : 0x1f0202);
            }
            if (this.ambientLight) {
                this.ambientLight.color.setHex(this.activeDimension === 0 ? 0x150825 : 0x250606);
            }
            if (this.dirLight) {
                this.dirLight.color.setHex(this.activeDimension === 0 ? 0x6020a0 : 0xa01515);
            }

            // Update UI hud status
            const statusLabel = document.getElementById('rs-status');
            if (statusLabel) {
                if (this.activeDimension === 0) {
                    statusLabel.textContent = "ACTIVE PLANE: VIOLET VOID";
                    statusLabel.style.color = "#00ffaa";
                } else {
                    statusLabel.textContent = "ACTIVE PLANE: CRIMSON RAGE (HYPER SPEED)";
                    statusLabel.style.color = "#ff3300";
                }
            }

            // Sync players speed multiplier
            if (window.player) {
                window.player.speedMultiplier = this.activeDimension === 1 ? 1.35 : 1.0;
            }

            // Spawn 30 flying Spatial Shatter Debris shards centered on player
            const pPos = window.player ? window.player.position : new THREE.Vector3();
            const shardColor = this.activeDimension === 0 ? 0xaa00ff : 0xff3300;
            
            this.shardPool.forEach((shard, idx) => {
                shard.mesh.position.set(
                    pPos.x + (Math.random() - 0.5) * 0.4,
                    pPos.y + 1.2 + (Math.random() - 0.5) * 0.4,
                    pPos.z + (Math.random() - 0.5) * 0.4
                );
                
                const angle = (idx / this.shardPool.length) * Math.PI * 2 + Math.random() * 0.6;
                const speed = 7.0 + Math.random() * 9.0;
                shard.vel.set(
                    Math.cos(angle) * speed,
                    (Math.random() - 0.2) * 5.5, // Pop up slightly
                    Math.sin(angle) * speed
                );
                
                shard.rotVel.set(
                    (Math.random() - 0.5) * 14,
                    (Math.random() - 0.5) * 14,
                    (Math.random() - 0.5) * 14
                );
                
                shard.mesh.material.color.setHex(shardColor);
                shard.mesh.material.opacity = 0.85;
                shard.mesh.scale.setScalar(0.4 + Math.random() * 0.8);
                shard.mesh.visible = true;
                shard.life = shard.maxLife;
            });

            // Trigger giant expanding floor shockwave
            if (window.mapManager && typeof window.mapManager.spawnGiantPortalShockwave === 'function') {
                window.mapManager.spawnGiantPortalShockwave(pPos.x, pPos.z, shardColor);
            }

            console.log('[Reality Shear] Shifted active dimension to', this.activeDimension);
        }

        update(playerPosition, delta) {
            this.time += delta;

            // 1. Update Reality Shatter visual expanding dome
            if (this.shatterTimer > 0) {
                this.shatterTimer -= delta;
                const pct = 1.0 - (this.shatterTimer / 0.45);
                const scale = pct * 45.0; // Expand up to 45 units range
                if (this.shatterDome) {
                    this.shatterDome.position.copy(playerPosition);
                    this.shatterDome.scale.setScalar(scale);
                    this.shatterDome.material.opacity = (1.0 - pct) * 0.75;
                    this.shatterDome.visible = true;
                }
            } else {
                if (this.shatterDome) this.shatterDome.visible = false;
            }

            // 2. Animate and update Spatial Shatter Debris shards
            this.shardPool.forEach(shard => {
                if (shard.life > 0) {
                    shard.life -= delta;
                    
                    // Physical translation
                    shard.mesh.position.addScaledVector(shard.vel, delta);
                    
                    // Rotational tumbling
                    shard.mesh.rotation.x += shard.rotVel.x * delta;
                    shard.mesh.rotation.y += shard.rotVel.y * delta;
                    shard.mesh.rotation.z += shard.rotVel.z * delta;
                    
                    // Exponential drag deceleration
                    shard.vel.multiplyScalar(Math.exp(-2.2 * delta));
                    
                    const pct = shard.life / shard.maxLife;
                    shard.mesh.material.opacity = pct * 0.85;
                    shard.mesh.scale.setScalar((0.4 + Math.random() * 0.8) * pct);
                    
                    if (shard.life <= 0) {
                        shard.mesh.visible = false;
                    }
                }
            });
        }

        /**
         * INTERCEPT AND POST-PROCESS ZOMBIE INSTANCE MATRICES
         * Loops through the matrices set by the CPU Horde AI worker.
         * For ghosts: shifts them underground (Y = -100.0) to make them visually vanish,
         * and spawns hovering neon translucent Quantum Embers at their real coordinates.
         */
        postProcessZombieMatrices(data) {
            const spawnedZombies = (window.getSpawnedZombies ? window.getSpawnedZombies() : 0);
            const zPosX = window.zPosX;
            const zPosZ = window.zPosZ;
            const zState = window.zState;
            const zType = window.zType;

            let curN = 0, curP = 0, curT = 0, curM = 0;
            let activeGhostCount = 0;

            for (let i = 0; i < spawnedZombies; i++) {
                if (zState[i] === 0) continue; // Skip inactive/dead

                const type = zType[i];
                const isGhost = (window.zombieDimensions && window.zombieDimensions[i] !== this.activeDimension);

                let offset = -1;
                let array = null;

                if (type === 0) { offset = curN * 16; array = data.normalMatrixArray; curN++; }
                else if (type === 1) { offset = curP * 16; array = data.pukerMatrixArray; curP++; }
                else if (type === 2) { offset = curT * 16; array = data.throwerMatrixArray; curT++; }
                else if (type === 3) { offset = curM * 16; array = data.mutantMatrixArray; curM++; }

                if (offset !== -1 && array) {
                    if (isGhost) {
                        // 1. Hide active mesh visually by sliding Y underground
                        array[offset + 13] = -100.0;

                        // 2. Draw hovering Quantum Ember
                        if (activeGhostCount < this.ghostPool.length) {
                            const orb = this.ghostPool[activeGhostCount];
                            const zx = zPosX[i];
                            const zz = zPosZ[i];
                            const bob = 0.12 * Math.sin(this.time * 4.0 + i);

                            orb.position.set(zx, 1.0 + bob, zz);
                            // Glow color matches the ghost's home dimension
                            orb.material.color.setHex(window.zombieDimensions[i] === 0 ? 0x9900ff : 0xff3300);
                            orb.visible = true;
                            activeGhostCount++;
                        }
                    }
                }
            }

            // Hide the rest of the ghost sphere pool
            for (let k = activeGhostCount; k < this.ghostPool.length; k++) {
                this.ghostPool[k].visible = false;
            }
        }

        playProceduralSound() {
            try {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                if (!AudioContext) return;
                const ctx = new AudioContext();

                // Synth Bass sweep portal oscillator
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(160, ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(38, ctx.currentTime + 0.45);

                gain.gain.setValueAtTime(0.35, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.45);

                osc.start();
                osc.stop(ctx.currentTime + 0.45);
            } catch (e) {
                console.warn('[Web Audio portal SFX blocked by gesture or not supported]');
            }
        }
    }

    return new RealityPhaseShifter();
})();

window.RealityPhaseShifter = RealityPhaseShifter;
