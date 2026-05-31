/**
 * EXTERNAL HORDE SYSTEM (V2.1) — ENDGAME ONLY
 * =============================================
 * A menacing, unreachable ring of zombie silhouettes orbiting far out
 * on the endgame void plane (70+ units away). Purely atmospheric dread.
 *
 * Periodically, one random sentinel detaches from the ring and CHARGES
 * the player at high speed. It is completely INVULNERABLE — cannot be
 * killed by any weapon. On reaching melee range it deals damage, emits
 * a burst of particles, then dissolves and respawns back to the ring.
 *
 * GPU-light: single InstancedMesh of 48 figures, no extra draw calls.
 */

const ExternalHorde = (function () {

    const SENTINEL_COUNT = 48;
    const ORBIT_RADIUS   = 70.0;   // Far enough that player can never reach them
    const ORBIT_SPEED    = 0.04;   // Slow menacing crawl around the perimeter
    const CHARGE_SPEED   = 14.0;   // Sprint speed when charging (units/sec)
    const CHARGE_INTERVAL_MIN = 8.0;
    const CHARGE_INTERVAL_MAX = 15.0;
    const MELEE_RANGE    = 1.8;
    const HIT_DAMAGE     = 18;
    const RESPAWN_DELAY  = 4.0;    // Seconds dissolved before reforming in the ring

    class ExternalHorde {
        constructor() {
            this.scene = null;
            this.hordeMesh = null;
            this.initialized = false;
            this.time = 0;
            this.nextChargeTimer = 0;
            this.initAttempts = 0;

            // Per-sentinel state
            this.sentinels = [];
        }

        init(scene) {
            try {
                if (!scene) {
                    console.warn('[External Horde] init() called with null scene — skipping.');
                    return;
                }
                this.scene = scene;
                this.initialized = false;
                this.hordeMesh = null;
                this.sentinels = [];
                this.time = 0;
                this.initAttempts = 0;
                this.nextChargeTimer = CHARGE_INTERVAL_MIN + Math.random() * (CHARGE_INTERVAL_MAX - CHARGE_INTERVAL_MIN);
                console.log('[External Horde] init() complete. Waiting for lazy init on endgame map...');
            } catch (e) {
                console.error('[External Horde] init() FAILED:', e);
            }
        }

        _isEndgame() {
            return (window.GAME_START_CONFIG &&
                    window.GAME_START_CONFIG.mode === 'survival' &&
                    window.GAME_START_CONFIG.mapId === 'endgame');
        }

        _lazyInit() {
            if (this.initialized) return true;

            // Only activate on endgame map
            if (!this._isEndgame()) {
                return false;
            }

            // Check if zombie meshes are available yet
            if (!window.zombieMeshes || !window.zombieMeshes.normal) {
                this.initAttempts++;
                // Log every 60 attempts (~1 second at 60fps) to avoid spam
                if (this.initAttempts % 60 === 0) {
                    console.warn('[External Horde] Waiting for window.zombieMeshes... attempt', this.initAttempts);
                }
                return false;
            }

            try {
                // Verify the base material has the expected uniforms
                const baseMat = window.zombieMeshes.normal.material;
                if (!baseMat) {
                    console.error('[External Horde] zombieMeshes.normal.material is null — cannot clone.');
                    return false;
                }

                const hordeMat = baseMat.clone();

                // Safely push holographic/glitch uniforms
                if (hordeMat.uniforms) {
                    if (hordeMat.uniforms.uHoloMorph) {
                        hordeMat.uniforms.uHoloMorph.value = 0.85;
                    }
                    if (hordeMat.uniforms.uHoloGlitches) {
                        hordeMat.uniforms.uHoloGlitches.value = 0.55;
                    }
                }

                const baseGeo = window.zombieMeshes.normal.geometry;
                if (!baseGeo) {
                    console.error('[External Horde] zombieMeshes.normal.geometry is null — cannot clone.');
                    return false;
                }
                const hordeGeo = baseGeo.clone();

                this.hordeMesh = new THREE.InstancedMesh(hordeGeo, hordeMat, SENTINEL_COUNT);
                this.hordeMesh.frustumCulled = false; // Always render — they're the skyline dread
                this.scene.add(this.hordeMesh);

                // Seed sentinel data
                for (let i = 0; i < SENTINEL_COUNT; i++) {
                    const baseAngle = (i / SENTINEL_COUNT) * Math.PI * 2;
                    this.sentinels.push({
                        id: i,
                        baseAngle: baseAngle,
                        posX: 0,
                        posZ: 0,
                        state: 'idle',     // 'idle' | 'charging' | 'dissolved'
                        chargeT: 0,
                        dissolveT: 0,
                        scale: 1.05 + Math.random() * 0.2
                    });
                }

                // Initialize all instance matrices to zero scale (hidden) until first update positions them
                const zeroMatrix = new THREE.Matrix4().makeScale(0, 0, 0);
                for (let i = 0; i < SENTINEL_COUNT; i++) {
                    this.hordeMesh.setMatrixAt(i, zeroMatrix);
                }
                this.hordeMesh.instanceMatrix.needsUpdate = true;

                this.initialized = true;
                console.log('[External Horde] ✓ Distant perimeter ring initialized — ' + SENTINEL_COUNT + ' sentinels at radius ' + ORBIT_RADIUS);
                return true;

            } catch (e) {
                console.error('[External Horde] _lazyInit() FAILED:', e);
                return false;
            }
        }

        update(playerPosition, delta) {
            // Guard: no-op if not on endgame or meshes not ready yet
            if (!this._lazyInit()) return;

            try {
                // Guard: validate playerPosition
                if (!playerPosition || typeof playerPosition.x !== 'number') {
                    console.warn('[External Horde] Invalid playerPosition — skipping frame.');
                    return;
                }

                // Clamp delta to prevent physics explosion on tab-switch
                delta = Math.min(delta, 0.1);

                this.time += delta;

                const isCrimson = !!(window.RealityPhaseShifter && window.RealityPhaseShifter.activeDimension === 1);

                // Update material time uniform for shader animation
                if (this.hordeMesh && this.hordeMesh.material && this.hordeMesh.material.uniforms) {
                    const u = this.hordeMesh.material.uniforms;
                    if (u.uTime) u.uTime.value = this.time;
                    if (u.uHoloGlitches) u.uHoloGlitches.value = isCrimson ? 0.9 : 0.55;
                }

                // --- CHARGE TIMER: periodically pick an idle sentinel to attack ---
                this.nextChargeTimer -= delta;
                if (this.nextChargeTimer <= 0) {
                    const idle = this.sentinels.filter(s => s.state === 'idle');
                    if (idle.length > 0) {
                        const chosen = idle[Math.floor(Math.random() * idle.length)];
                        chosen.state = 'charging';
                        chosen.chargeT = 0;

                        // Console warning
                        if (window.NeuralConsole && window.NeuralConsole.log) {
                            window.NeuralConsole.log('0xDEAD: PERIMETER_BREACH — HOSTILE INBOUND. WEAPONS INEFFECTIVE.', 'err');
                        }
                    }
                    this.nextChargeTimer = CHARGE_INTERVAL_MIN + Math.random() * (CHARGE_INTERVAL_MAX - CHARGE_INTERVAL_MIN);
                }

                // --- UPDATE ALL SENTINELS ---
                const tempMatrix = new THREE.Matrix4();
                const tempPos    = new THREE.Vector3();
                const tempRot    = new THREE.Matrix4();
                const tempScale  = new THREE.Vector3();
                const tempQuat   = new THREE.Quaternion();

                // Slow orbital drift
                const orbitalOffset = this.time * ORBIT_SPEED;

                for (const s of this.sentinels) {

                    if (s.state === 'idle') {
                        // --- IDLE: orbit the player at ORBIT_RADIUS ---
                        const angle = s.baseAngle + orbitalOffset;
                        s.posX = playerPosition.x + Math.cos(angle) * ORBIT_RADIUS;
                        s.posZ = playerPosition.z + Math.sin(angle) * ORBIT_RADIUS;

                        // Menacing bob
                        const bob = 0.06 * Math.sin(this.time * 2.0 + s.id * 0.7);
                        // Slight lateral sway
                        const sway = 0.1 * Math.sin(this.time * 3.5 + s.id * 1.3);

                        tempPos.set(s.posX, bob, s.posZ);

                        // Face inward at the player
                        const faceAngle = Math.atan2(playerPosition.x - s.posX, playerPosition.z - s.posZ);
                        tempRot.makeRotationY(faceAngle + sway);

                        // Breathing scale pulse
                        const breath = s.scale * (0.95 + 0.1 * Math.sin(this.time * 1.8 + s.id));
                        tempScale.setScalar(breath);

                        tempQuat.setFromRotationMatrix(tempRot);
                        tempMatrix.compose(tempPos, tempQuat, tempScale);
                        this.hordeMesh.setMatrixAt(s.id, tempMatrix);

                    } else if (s.state === 'charging') {
                        // --- CHARGING: sprint directly at the player, invulnerable ---
                        s.chargeT += delta;

                        const dx = playerPosition.x - s.posX;
                        const dz = playerPosition.z - s.posZ;
                        const dist = Math.sqrt(dx * dx + dz * dz);

                        if (dist > 0.01) { // Avoid division by zero
                            const speed = isCrimson ? CHARGE_SPEED * 1.6 : CHARGE_SPEED;
                            const step = speed * delta;

                            if (dist > MELEE_RANGE) {
                                s.posX += (dx / dist) * step;
                                s.posZ += (dz / dist) * step;
                            }
                        }

                        // Face player
                        const faceAngle = Math.atan2(playerPosition.x - s.posX, playerPosition.z - s.posZ);

                        // Aggressive running bob
                        const chargeBob = 0.4 * Math.abs(Math.sin(s.chargeT * 10.0));

                        tempPos.set(s.posX, chargeBob, s.posZ);
                        tempRot.makeRotationY(faceAngle);
                        tempScale.setScalar(s.scale * 1.2); // Swell up when charging
                        tempQuat.setFromRotationMatrix(tempRot);
                        tempMatrix.compose(tempPos, tempQuat, tempScale);
                        this.hordeMesh.setMatrixAt(s.id, tempMatrix);

                        // --- MELEE HIT: damage player, dissolve sentinel ---
                        if (dist < MELEE_RANGE) {
                            s.state = 'dissolved';
                            s.dissolveT = RESPAWN_DELAY;

                            // Deal damage safely
                            try {
                                if (window.playerHealth !== undefined) {
                                    const dmg = isCrimson ? HIT_DAMAGE * 2 : HIT_DAMAGE;
                                    window.playerHealth = Math.max(0, window.playerHealth - dmg);
                                    if (window.player && typeof window.player.takeDamage === 'function') {
                                        window.player.takeDamage(dmg);
                                    }
                                    if (window.SFX && window.SFX.triggerPlayerDie) {
                                        window.SFX.triggerPlayerDie();
                                    }
                                }
                            } catch (dmgErr) {
                                console.warn('[External Horde] Damage application error:', dmgErr);
                            }

                            // Impact particle burst
                            try {
                                if (typeof emitParticle === 'function') {
                                    for (let p = 0; p < 14; p++) {
                                        emitParticle(
                                            s.posX, 1.2, s.posZ,
                                            (Math.random() - 0.5) * 5, Math.random() * 4 + 1.0, (Math.random() - 0.5) * 5,
                                            isCrimson ? 1.0 : 0.5, 0.0, isCrimson ? 0.1 : 0.9,
                                            10, 0.4
                                        );
                                    }
                                }
                            } catch (partErr) {
                                console.warn('[External Horde] Particle emission error:', partErr);
                            }

                            // Neural console feedback
                            if (window.NeuralConsole && window.NeuralConsole.log) {
                                window.NeuralConsole.log('0xDEAD: IMPACT. PERIMETER ENTITY DISSOLVED.', 'warn');
                            }
                        }

                        // Safety timeout — if a charger takes > 15s, dissolve it
                        if (s.chargeT > 15.0) {
                            s.state = 'dissolved';
                            s.dissolveT = RESPAWN_DELAY;
                        }

                    } else if (s.state === 'dissolved') {
                        // --- DISSOLVED: invisible, counting down to respawn ---
                        s.dissolveT -= delta;
                        if (s.dissolveT <= 0) {
                            s.state = 'idle';
                        }
                        // Scale to zero — invisible
                        tempMatrix.makeScale(0, 0, 0);
                        this.hordeMesh.setMatrixAt(s.id, tempMatrix);
                    }
                }

                this.hordeMesh.instanceMatrix.needsUpdate = true;

            } catch (e) {
                console.error('[External Horde] update() CRITICAL ERROR:', e);
            }
        }

        /**
         * Cleanup on scene teardown
         */
        dispose() {
            try {
                if (this.hordeMesh) {
                    this.scene.remove(this.hordeMesh);
                    if (this.hordeMesh.geometry) this.hordeMesh.geometry.dispose();
                    if (this.hordeMesh.material) this.hordeMesh.material.dispose();
                    this.hordeMesh = null;
                }
                this.sentinels = [];
                this.initialized = false;
                console.log('[External Horde] Disposed successfully.');
            } catch (e) {
                console.error('[External Horde] dispose() error:', e);
            }
        }
    }

    return new ExternalHorde();
})();

window.ExternalHorde = ExternalHorde;
