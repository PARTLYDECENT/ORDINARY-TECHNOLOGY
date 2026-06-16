/**
 * AEGIS SENTINEL DRONE (Model-V5.Holographic)
 * Evolved from rigid machine into a fully wireframe, shifting, morphing, and distorting 
 * digital lifeform companion that supports and chats with the Operator.
 * 
 * Features:
 * - 100% Shifting Wireframe Matrix: Nested core, outer shell, horizontal/vertical wing rings, and weapon prisms
 * - GPU Vertex Noise Shaders: Morphing, wiggling, and wave deforming shape patterns
 * - Color-Coded State Telemetry: Cyan (idle), Purple (scan/combat), Emerald-Green (healing), White-Hot (shield dome)
 * - Dynamic Support Abilities:
 *    1. Nanite Healing Arc: Fires green restorative energy beams healing +15 HP (25s Cooldown)
 *    2. Tactical Supply Drops: Materializes AmmoCan or HealthPack at player's feet in combat (35s Cooldown)
 *    3. Scan Vulnerability Debuff: Amplifies player weapon damage against scanned threat by +50% extra
 * - NeuralConsole Personality Chatter: Logs supportive, tactical dialogues synced with physical avatar vibrations!
 */

class AegisSentinel {
    constructor(scene, playerRef, cameraRef) {
        this.scene = scene;
        this.player = playerRef;
        this.camera = cameraRef;
        this.time = 0;

        // Determine whether Aegis should spawn in the current map/mode
        // Enabled in survival mode, endgame map, and abyss map
        const cfg = window.GAME_START_CONFIG;
        const isSurvival = cfg && (cfg.mode === 'survival' || cfg.mapId === 'desert');
        const isEndgame = cfg && cfg.mapId === 'endgame';
        const isAbyss = cfg && cfg.mapId === 'abyss';
        this.isEnabled = !!(isSurvival || isEndgame || isAbyss);

        // Core Configuration
        this.config = {
            hoverOffset: new THREE.Vector3(2.6, 9.0, 1.3), // Hover above the player
            followSmooth: 4.8,
            rotationSmooth: 6.5,
            scanRadius: 20.0,
            attackCooldown: 1.3, // Lightning discharge frequency
            damagePerHit: 2.5,   // Shock damage
        };

        // State Machine
        this.group = new THREE.Group();
        this.group.name = "AegisSentinelDrone";
        
        this.velocity = new THREE.Vector3();
        this.targetPos = new THREE.Vector3();
        this.attackCooldownTimer = 0;
        this.currentTargetIdx = -1;
        this.shockArcActive = false;
        this.shockArcTimer = 0;
        
        // Shield dome state
        this.isShieldActive = false;
        this.shieldDuration = 5.0;
        this.shieldCooldown = 20.0;
        this.shieldCooldownTimer = 0.0;

        // New Support Evolved State variables
        this.healCooldownTimer = 10.0; // Initial delay to give breathing room
        this.healActiveTimer = 0.0;
        this.isHealingActive = false;
        this.dropCooldownTimer = 15.0; // Initial drop delay
        this.dialogueTimer = 4.0;       // Speak shortly after spawn
        this.chatterAmplitude = 0.0;   // Physical dialogue ripples
        this.targetLastHP = 0;
        this.lastScannedTargetIdx = -1;

        // Dialogue corpus
        this.dialogues = {
            idle: [
                "[AEGIS]: Scanning local sector telemetry. Hold steady, Operator!",
                "[AEGIS]: System diagnostics: 100% operational. It is a privilege to stand by your side.",
                "[AEGIS]: Area telemetry: nominal. You are doing a phenomenal job navigating this zone, partner.",
                "[AEGIS]: Analyzing mineral sedimentation. I am actively tracking local supply grids.",
                "[AEGIS]: I'm right beside you, operator. Let's secure this sector!"
            ],
            combat: [
                "[AEGIS]: Hostile signature acquired! Sweeping targeted weakness grids!",
                "[AEGIS]: Weakness vectors calculated. Shoot my scanned target for +50% extra damage!",
                "[AEGIS]: Shock arc grid online! Stand clear of secondary electrical discharges!"
            ],
            heal: [
                "[AEGIS]: Minor chassis breach detected! Initiating micro-nanite recovery stream!",
                "[AEGIS]: Injecting soothing nanite mesh! System integrity restored."
            ],
            drop: [
                "[AEGIS]: Matter replication complete! Materializing vital field ammo at your feet!",
                "[AEGIS]: Replicating weapon clip supplies. Keep those firearms blazing!"
            ],
            shield: [
                "[AEGIS]: CRITICAL HULL INTEGRITY RISK! Deploying Aegis Vector Shield Dome! Stay inside the matrix!",
                "[AEGIS]: Core output: 200%! Defense vector shield online! I've got you covered!"
            ]
        };

        // Build Evolved Shaders & Mesh Hierarchies
        this._buildShaders();
        this._buildMaterials();
        this._buildCore();
        this._buildWings();
        this._buildTurrets();
        this._buildScanner();
        this._buildThruster();
        this._buildShieldMesh();

        // Initial Position
        if (this.player) {
            this.group.position.copy(this.player.position).add(this.config.hoverOffset);
        }
        
        this.scene.add(this.group);

        if (!this.isEnabled) {
            this.group.visible = false;
            if (this.light) this.light.intensity = 0;
        } else {
            // Welcoming Dialogue
            setTimeout(() => {
                this.speak("[AEGIS]: Hello, partner! Neural integration complete. Aegis holographic tactical support online. Let's survive this!", 'res');
            }, 1200);
        }
    }

    _buildShaders() {
        // High-end procedural organic morphing vertex shader
        this.vertexShader = `
            uniform float uTime;
            uniform float uDistortion;
            uniform float uDistortionSpeed;
            uniform float uChatterAmplitude;
            varying vec3 vNormal;
            varying vec3 vPosition;
            varying float vDisplacement;

            // Layered harmonic mathematical noise for organic morphing
            float organicNoise(vec3 p, float t) {
                float w1 = sin(p.x * 3.5 + t) * cos(p.y * 3.5 + t) * sin(p.z * 3.5 + t);
                float w2 = sin(p.y * 7.2 - t * 1.5) * cos(p.z * 7.2 + t * 1.25) * sin(p.x * 7.2 - t);
                float w3 = sin(p.z * 13.0 + t * 2.3) * cos(p.x * 13.0 - t * 1.9) * sin(p.y * 13.0 + t);
                return w1 * 0.5 + w2 * 0.3 + w3 * 0.2;
            }

            void main() {
                vNormal = normalize(normalMatrix * normal);
                vec3 pos = position;
                
                // Shift, morph, and distort vertex coordinate
                float noiseVal = organicNoise(pos, uTime * uDistortionSpeed);
                float displacement = noiseVal * (uDistortion + uChatterAmplitude * 0.9);
                vDisplacement = displacement;
                
                vec3 displacedPos = pos + normalize(pos) * displacement;
                vPosition = displacedPos;
                
                vec4 mvPosition = modelViewMatrix * vec4(displacedPos, 1.0);
                gl_Position = projectionMatrix * mvPosition;
            }
        `;

        // Holographic flickering wireframe fragment shader
        this.fragmentShader = `
            uniform vec3 uStateColor;
            uniform float uTime;
            varying vec3 vNormal;
            varying vec3 vPosition;
            varying float vDisplacement;

            void main() {
                // Fresnel glowing aura outline
                vec3 viewDir = vec3(0.0, 0.0, 1.0);
                float fresnel = pow(1.0 - max(0.0, dot(vNormal, viewDir)), 2.8);
                
                // Mix color based on displacement ripple
                vec3 finalColor = uStateColor + vec3(0.12, 0.38, 0.65) * vDisplacement;
                
                // High-frequency electronic scanline flicker
                float flicker = 0.93 + 0.07 * sin(uTime * 70.0);
                
                gl_FragColor = vec4(finalColor * flicker, 0.70 + fresnel * 0.30);
            }
        `;
    }

    _buildMaterials() {
        // Uniform groups to share/distribute controls
        this.coreUniforms = {
            uTime: { value: 0 },
            uDistortion: { value: 0.12 },
            uDistortionSpeed: { value: 1.8 },
            uChatterAmplitude: { value: 0.0 },
            uStateColor: { value: new THREE.Color(0x00d2ff) }
        };

        this.shellUniforms = {
            uTime: { value: 0 },
            uDistortion: { value: 0.28 }, // Higher morph scale
            uDistortionSpeed: { value: 2.2 },
            uChatterAmplitude: { value: 0.0 },
            uStateColor: { value: new THREE.Color(0x00d2ff) }
        };

        // Create advanced shader materials with wireframe: true
        this.coreMat = new THREE.ShaderMaterial({
            uniforms: this.coreUniforms,
            vertexShader: this.vertexShader,
            fragmentShader: this.fragmentShader,
            wireframe: true,
            transparent: true,
            depthWrite: false,
            side: THREE.DoubleSide
        });

        this.shellMat = new THREE.ShaderMaterial({
            uniforms: this.shellUniforms,
            vertexShader: this.vertexShader,
            fragmentShader: this.fragmentShader,
            wireframe: true,
            transparent: true,
            depthWrite: false,
            side: THREE.DoubleSide
        });

        // Scan scanner cone material
        this.scanConeMat = new THREE.MeshStandardMaterial({
            color: 0xaa00ff,
            emissive: 0x660099,
            emissiveIntensity: 2.5,
            wireframe: true,
            transparent: true,
            opacity: 0.28,
            side: THREE.DoubleSide
        });
    }

    _buildCore() {
        // Nested core: inner matrix and outer shifting shell
        const coreGeo = new THREE.IcosahedronGeometry(0.3, 2);
        this.coreMesh = new THREE.Mesh(coreGeo, this.coreMat);
        this.group.add(this.coreMesh);

        const shellGeo = new THREE.IcosahedronGeometry(0.55, 1);
        this.shellMesh = new THREE.Mesh(shellGeo, this.shellMat);
        this.group.add(this.shellMesh);

        // Core dynamic point light casting starlight
        this.light = new THREE.PointLight(0x00d2ff, 2.5, 12);
        this.group.add(this.light);
    }

    _buildWings() {
        // Wing rings: concentric wireframe toruses rotating asynchronously
        this.wings = [];
        const ringGeo = new THREE.TorusGeometry(0.72, 0.022, 8, 32);

        this.wingL = new THREE.Mesh(ringGeo, this.coreMat);
        this.wingR = new THREE.Mesh(ringGeo, this.shellMat);

        this.wingL.rotation.y = Math.PI / 2;
        this.wingR.rotation.x = Math.PI / 2;

        this.group.add(this.wingL);
        this.group.add(this.wingR);

        this.wings.push(this.wingL, this.wingR);
    }

    _buildTurrets() {
        // Weapon Focus points: floating wireframe octahedrons on either side
        this.turretGroup = new THREE.Group();
        this.turretGroup.position.set(0, -0.4, 0);

        const octaGeo = new THREE.OctahedronGeometry(0.14, 0);

        this.prismL = new THREE.Mesh(octaGeo, this.coreMat);
        this.prismL.position.set(-0.55, 0, 0);

        this.prismR = new THREE.Mesh(octaGeo, this.shellMat);
        this.prismR.position.set(0.55, 0, 0);

        this.turretGroup.add(this.prismL);
        this.turretGroup.add(this.prismR);
        this.group.add(this.turretGroup);
    }

    _buildScanner() {
        // Sweep cone representing scanning laser visual sector
        const coneGeo = new THREE.CylinderGeometry(0.02, 1.4, 8.0, 16, 4, true);
        coneGeo.translate(0, -4.0, 0); // Rotate around core focal point
        
        this.scanConeMesh = new THREE.Mesh(coneGeo, this.scanConeMat);
        this.group.add(this.scanConeMesh);
    }

    _buildThruster() {
        // Morphing thruster exhaust jet cone
        const exhGeo = new THREE.ConeGeometry(0.12, 0.45, 8, 2, true);
        exhGeo.rotateX(Math.PI / 2);
        
        this.exhaust = new THREE.Mesh(exhGeo, this.coreMat);
        this.exhaust.position.set(0, 0, -0.5);
        this.group.add(this.exhaust);
    }

    _buildShieldMesh() {
        // Shifting shield dome geometry
        const shieldGeo = new THREE.SphereGeometry(1.68, 20, 20);
        
        // Translucent morphing shield dome wireframe
        this.shieldMat = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uDistortion: { value: 0.15 },
                uDistortionSpeed: { value: 4.0 },
                uChatterAmplitude: { value: 0.0 },
                uStateColor: { value: new THREE.Color(0xaae8ff) }
            },
            vertexShader: this.vertexShader,
            fragmentShader: this.fragmentShader,
            wireframe: true,
            transparent: true,
            depthWrite: false,
            side: THREE.DoubleSide
        });

        this.shieldMesh = new THREE.Mesh(shieldGeo, this.shieldMat);
        this.shieldMesh.visible = false;
    }

    /**
     * Synthesize procedural sci-fi audio beeps using HTML5 Web Audio API
     */
    _playDroneBeep(type) {
        if (!window.audioCtx) return;
        try {
            const ctx = window.audioCtx;
            if (ctx.state === 'suspended') ctx.resume();
            
            const t = ctx.currentTime;
            
            if (type === 'fire') {
                // High-tech plasma discharge zap
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sawtooth';
                
                osc.frequency.setValueAtTime(1500, t);
                osc.frequency.exponentialRampToValueAtTime(150, t + 0.11);
                
                gain.gain.setValueAtTime(0.06, t);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.11);
                
                const filter = ctx.createBiquadFilter();
                filter.type = 'highpass';
                filter.frequency.setValueAtTime(350, t);
                
                osc.connect(filter);
                filter.connect(gain);
                gain.connect(ctx.destination);
                
                osc.start(t);
                osc.stop(t + 0.13);
            } else if (type === 'shield_up') {
                // Forcefield rising charge sweep
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                
                osc.frequency.setValueAtTime(120, t);
                osc.frequency.exponentialRampToValueAtTime(1200, t + 0.4);
                
                gain.gain.setValueAtTime(0.01, t);
                gain.gain.linearRampToValueAtTime(0.1, t + 0.12);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
                
                osc.connect(gain);
                gain.connect(ctx.destination);
                
                osc.start(t);
                osc.stop(t + 0.5);
            } else if (type === 'chirp') {
                // Friendly high-pitched computer trill
                const osc1 = ctx.createOscillator();
                const osc2 = ctx.createOscillator();
                const gain = ctx.createGain();
                
                osc1.type = 'sine';
                osc2.type = 'triangle';
                
                osc1.frequency.setValueAtTime(850, t);
                osc1.frequency.linearRampToValueAtTime(1650, t + 0.08);
                osc1.frequency.exponentialRampToValueAtTime(1050, t + 0.16);
                
                osc2.frequency.setValueAtTime(450, t);
                osc2.frequency.linearRampToValueAtTime(1250, t + 0.12);
                
                gain.gain.setValueAtTime(0.03, t);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
                
                osc1.connect(gain);
                osc2.connect(gain);
                gain.connect(ctx.destination);
                
                osc1.start(t);
                osc2.start(t);
                osc1.stop(t + 0.2);
                osc2.stop(t + 0.2);
            } else if (type === 'heal') {
                // Soothing clean electronic chime
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                
                osc.frequency.setValueAtTime(440, t);
                osc.frequency.exponentialRampToValueAtTime(1300, t + 0.35);
                
                gain.gain.setValueAtTime(0.07, t);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.38);
                
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(t);
                osc.stop(t + 0.4);
            }
        } catch (e) {
            console.warn("Aegis Audio synth failed:", e);
        }
    }

    /**
     * Rebuild and render the crackling cyan lightning bolt shock weapon
     */
    _renderShockArc(startPos, endPos) {
        if (this.shockLine) {
            this.scene.remove(this.shockLine);
            this.shockLine.geometry.dispose();
        }

        const points = [];
        const distance = startPos.distanceTo(endPos);
        const segments = Math.max(6, Math.floor(distance * 1.6));
        
        points.push(startPos.clone());
        
        const dir = new THREE.Vector3().subVectors(endPos, startPos).normalize();
        const lateralX = new THREE.Vector3(-dir.z, 0, dir.x).normalize();
        const lateralY = new THREE.Vector3(0, 1, 0).cross(dir).normalize();

        // Subdivide with perpendicular random jitter (crackling bolt shape)
        for (let i = 1; i < segments; i++) {
            const t = i / segments;
            const pt = new THREE.Vector3().lerpVectors(startPos, endPos, t);
            
            const jitterScale = Math.sin(t * Math.PI) * 0.42;
            const jx = (Math.random() - 0.5) * jitterScale;
            const jy = (Math.random() - 0.5) * jitterScale;
            const jz = (Math.random() - 0.5) * jitterScale;
            
            pt.addScaledVector(lateralX, jx);
            pt.addScaledVector(lateralY, jy);
            pt.y += jz;
            
            points.push(pt);
        }
        
        points.push(endPos.clone());

        const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
        const lineMat = new THREE.LineBasicMaterial({
            color: 0xff00d2, // Magenta combat lightning arc
            transparent: true,
            opacity: 0.85 + Math.random() * 0.15
        });
        
        this.shockLine = new THREE.Line(lineGeo, lineMat);
        this.scene.add(this.shockLine);
    }

    _clearShockArc() {
        if (this.shockLine) {
            this.scene.remove(this.shockLine);
            this.shockLine.geometry.dispose();
            this.shockLine = null;
        }
        this.shockArcActive = false;
    }

    /**
     * Soothing flow energy healing nanite stream
     */
    _renderHealingArc(startPos, endPos) {
        if (this.healLine) {
            this.scene.remove(this.healLine);
            this.healLine.geometry.dispose();
        }

        const points = [];
        const distance = startPos.distanceTo(endPos);
        const segments = Math.max(6, Math.floor(distance * 1.5));
        
        points.push(startPos.clone());
        
        const dir = new THREE.Vector3().subVectors(endPos, startPos).normalize();
        const lateralX = new THREE.Vector3(-dir.z, 0, dir.x).normalize();
        const lateralY = new THREE.Vector3(0, 1, 0).cross(dir).normalize();

        for (let i = 1; i < segments; i++) {
            const t = i / segments;
            const pt = new THREE.Vector3().lerpVectors(startPos, endPos, t);
            
            const jitterScale = Math.sin(t * Math.PI) * 0.22;
            const jx = (Math.random() - 0.5) * jitterScale;
            const jy = (Math.random() - 0.5) * jitterScale;
            
            pt.addScaledVector(lateralX, jx);
            pt.addScaledVector(lateralY, jy);
            
            points.push(pt);
        }
        
        points.push(endPos.clone());

        const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
        const lineMat = new THREE.LineBasicMaterial({
            color: 0x00ff66, // Emerald-green healing nanite flow
            transparent: true,
            opacity: 0.75 + Math.random() * 0.25
        });
        
        this.healLine = new THREE.Line(lineGeo, lineMat);
        this.scene.add(this.healLine);
    }

    _clearHealingArc() {
        if (this.healLine) {
            this.scene.remove(this.healLine);
            this.healLine.geometry.dispose();
            this.healLine = null;
        }
        this.isHealingActive = false;
    }

    /**
     * Neural Console dialogue transmitter (triggers vibration effects)
     */
    speak(text, type = 'res') {
        if (window.NeuralConsole && typeof window.NeuralConsole.log === 'function') {
            window.NeuralConsole.log(text, type);
        }
        this._playDroneBeep('chirp');
        // High-frequency physical avatar vibration!
        this.chatterAmplitude = 0.65;
    }

    /**
     * Active combat AI: Scan threat, shoot shock lightning, trigger debuffs!
     */
    _updateCombat(delta, time) {
        if (!this.player) return;

        // Target scanning debuff hook
        if (this.currentTargetIdx !== -1) {
            const targetIdx = this.currentTargetIdx;
            if (window.zState && window.zState[targetIdx] === 1 && window.zHP) {
                
                // Target index changed
                if (this.lastScannedTargetIdx !== targetIdx) {
                    this.lastScannedTargetIdx = targetIdx;
                    this.targetLastHP = window.zHP[targetIdx];
                    
                    this.speak(`[AEGIS]: Target vulnerability analyzed at [INDEX_${targetIdx}]. Shoot now for +50% damage!`, 'warn');
                }

                // Detect health drop on debuffed target
                let currentHP = window.zHP[targetIdx];
                if (currentHP < this.targetLastHP) {
                    let diff = this.targetLastHP - currentHP;
                    
                    // Deduct +50% extra vulnerability damage tick!
                    let extraDmg = Math.max(1, Math.round(diff * 0.5));
                    
                    window.zHP[targetIdx] = Math.max(0, currentHP - extraDmg);
                    this.targetLastHP = window.zHP[targetIdx];
                    
                    // Trigger floating yellow floater numbers
                    if (typeof window.spawnDamageNumber === 'function') {
                        window.spawnDamageNumber(
                            window.zPosX[targetIdx],
                            1.2 + (window.TerrainGen ? window.TerrainGen.getHeight(window.zPosX[targetIdx], window.zPosZ[targetIdx]) : 0.0),
                            window.zPosZ[targetIdx],
                            extraDmg,
                            window.zHP[targetIdx] <= 0
                        );
                    }

                    // Scan spark particles
                    if (typeof window.emitParticle === 'function') {
                        for (let p = 0; p < 8; p++) {
                            window.emitParticle(
                                window.zPosX[targetIdx],
                                0.8 + (window.TerrainGen ? window.TerrainGen.getHeight(window.zPosX[targetIdx], window.zPosZ[targetIdx]) : 0.0),
                                window.zPosZ[targetIdx],
                                (Math.random() - 0.5) * 6,
                                2.0 + Math.random() * 3,
                                (Math.random() - 0.5) * 6,
                                0.9, 0.8, 0.1, // Yellow sparks
                                9, 0.4
                            );
                        }
                    }

                    // Check debuff confirmed kill
                    if (window.zHP[targetIdx] <= 0 && window.zState[targetIdx] === 1) {
                        window.zState[targetIdx] = 0;
                        if (window.setActiveZombiesCount) {
                            window.setActiveZombiesCount(window.getActiveZombiesCount() - 1);
                        }
                        if (window.setTotalKillsCount) {
                            window.setTotalKillsCount(window.getTotalKillsCount() + 1);
                        }
                        if (window.PyramidManager) {
                            window.PyramidManager.registerKill(window.zPosX[targetIdx], 1.0, window.zPosZ[targetIdx]);
                        }
                        if (window.goreSystem) {
                            const zTypeLabel = window.zType[targetIdx] === 0 ? 'normal' : (window.zType[targetIdx] === 1 ? 'puker' : 'thrower');
                            window.goreSystem.spawnGoreGribs(window.zPosX[targetIdx], 1.2, window.zPosZ[targetIdx], zTypeLabel);
                        }
                        if (window.SFX && typeof window.SFX.triggerZombieDie === 'function') {
                            window.SFX.triggerZombieDie();
                        }
                    }
                } else {
                    this.targetLastHP = currentHP;
                }
            } else {
                this.lastScannedTargetIdx = -1;
            }
        } else {
            this.lastScannedTargetIdx = -1;
        }

        // Progress attack cooldowns
        if (this.attackCooldownTimer > 0) {
            this.attackCooldownTimer -= delta;
        }

        // Clean active shock lines
        if (this.shockArcActive) {
            this.shockArcTimer -= delta;
            if (this.shockArcTimer <= 0) {
                this._clearShockArc();
            } else if (this.currentTargetIdx !== -1) {
                const targetIdx = this.currentTargetIdx;
                if (window.zState && window.zState[targetIdx] === 1) {
                    const startPos = new THREE.Vector3();
                    this.prismL.getWorldPosition(startPos);
                    
                    const endPos = new THREE.Vector3(
                        window.zPosX[targetIdx],
                        0.7 + (window.TerrainGen ? window.TerrainGen.getHeight(window.zPosX[targetIdx], window.zPosZ[targetIdx]) : 0.0),
                        window.zPosZ[targetIdx]
                    );
                    
                    this._renderShockArc(startPos, endPos);
                    
                    if (Math.random() < 0.4 && typeof window.emitParticle === 'function') {
                        window.emitParticle(
                            endPos.x + (Math.random() - 0.5) * 0.3,
                            endPos.y + (Math.random() - 0.5) * 0.4,
                            endPos.z + (Math.random() - 0.5) * 0.3,
                            (Math.random() - 0.5) * 3, Math.random() * 4, (Math.random() - 0.5) * 3,
                            1.0, 0.0, 0.8, // Purple shock particles
                            10, 0.3
                        );
                    }
                } else {
                    this._clearShockArc();
                }
            }
        }

        // Search for nearest threat
        if (this.attackCooldownTimer <= 0 && !this.shockArcActive) {
            const spawnedZombies = window.getSpawnedZombies ? window.getSpawnedZombies() : 0;
            let closestDistSq = this.config.scanRadius * this.config.scanRadius;
            let closestIdx = -1;

            const dronePos = this.group.position;

            for (let z = 0; z < spawnedZombies; z++) {
                if (window.zState && window.zState[z] === 1) {
                    const zx = window.zPosX[z];
                    const zz = window.zPosZ[z];
                    const dx = zx - dronePos.x;
                    const dz = zz - dronePos.z;
                    const distSq = dx * dx + dz * dz;

                    if (distSq < closestDistSq) {
                        closestDistSq = distSq;
                        closestIdx = z;
                    }
                }
            }

            // Fire shock arcs
            if (closestIdx !== -1) {
                this.currentTargetIdx = closestIdx;
                this.attackCooldownTimer = this.config.attackCooldown;
                this.shockArcActive = true;
                this.shockArcTimer = 0.22;

                const zx = window.zPosX[closestIdx];
                const zz = window.zPosZ[closestIdx];
                
                const startPos = new THREE.Vector3();
                this.prismL.getWorldPosition(startPos);
                
                const endPos = new THREE.Vector3(
                    zx,
                    0.7 + (window.TerrainGen ? window.TerrainGen.getHeight(zx, zz) : 0.0),
                    zz
                );

                this._playDroneBeep('fire');
                this._renderShockArc(startPos, endPos);

                if (window.zHP) {
                    const oldHP = window.zHP[closestIdx];
                    const nextHP = Math.max(0, oldHP - this.config.damagePerHit);
                    window.zHP[closestIdx] = nextHP;

                    if (typeof window.showHitmarker === 'function') {
                        window.showHitmarker(nextHP <= 0);
                    }
                    if (typeof window.spawnDamageNumber === 'function') {
                        window.spawnDamageNumber(zx, endPos.y, zz, this.config.damagePerHit, nextHP <= 0);
                    }

                    if (nextHP <= 0) {
                        window.zState[closestIdx] = 0;
                        if (window.setActiveZombiesCount) {
                            window.setActiveZombiesCount(window.getActiveZombiesCount() - 1);
                        }
                        if (window.setTotalKillsCount) {
                            window.setTotalKillsCount(window.getTotalKillsCount() + 1);
                        }
                        if (window.PyramidManager) {
                            window.PyramidManager.registerKill(zx, 1.0, zz);
                        }
                        if (window.goreSystem) {
                            const zTypeLabel = window.zType[closestIdx] === 0 ? 'normal' : (window.zType[closestIdx] === 1 ? 'puker' : 'thrower');
                            window.goreSystem.spawnGoreGribs(zx, 1.2, zz, zTypeLabel);
                        }
                        if (window.SFX && typeof window.SFX.triggerZombieDie === 'function') {
                            window.SFX.triggerZombieDie();
                        }
                    }
                }
            }
        }
    }

    /**
     * Soothing heals and tactical matter replication drops
     */
    _updateHealAndDrops(delta, time) {
        if (!this.player) return;

        // 1. Nanite Healing Arc Checks
        if (this.healCooldownTimer > 0) {
            this.healCooldownTimer -= delta;
        }

        const hpVal = window.playerHealth !== undefined ? window.playerHealth : 200;
        const maxHpVal = window.CONFIG?.playerHealth || 200;

        if (hpVal < maxHpVal && this.healCooldownTimer <= 0 && !this.isHealingActive && !this.isShieldActive) {
            this.isHealingActive = true;
            this.healActiveTimer = 0.4; // active duration
            this.healCooldownTimer = 10.0 + Math.random() * 15.0; // Random cooldown between 10 and 25 seconds

            // Add random health points between 10 and 25
            const healAmt = 10 + Math.floor(Math.random() * 16);
            window.playerHealth = Math.min(maxHpVal, hpVal + healAmt);
            this.player.health = window.playerHealth;

            // Spawn floating health numbers
            if (typeof window.spawnDamageNumber === 'function') {
                window.spawnDamageNumber(
                    this.player.position.x,
                    this.player.position.y + 1.2,
                    this.player.position.z,
                    healAmt,
                    false
                );
            }

            this._playDroneBeep('heal');

            // Dialogue log
            const rIdx = Math.floor(Math.random() * this.dialogues.heal.length);
            this.speak(this.dialogues.heal[rIdx], 'res');
        }

        if (this.isHealingActive) {
            this.healActiveTimer -= delta;
            if (this.healActiveTimer <= 0) {
                this._clearHealingArc();
            } else {
                const startPos = new THREE.Vector3();
                this.coreMesh.getWorldPosition(startPos);
                
                const endPos = this.player.position.clone();
                endPos.y += 0.8;
                this._renderHealingArc(startPos, endPos);
                
                // Spawn green nanite sparkles around player
                if (Math.random() < 0.5 && typeof window.emitParticle === 'function') {
                    window.emitParticle(
                        endPos.x + (Math.random() - 0.5) * 1.5,
                        endPos.y + (Math.random() - 0.5) * 1.5,
                        endPos.z + (Math.random() - 0.5) * 1.5,
                        (Math.random() - 0.5) * 2,
                        0.5 + Math.random() * 2,
                        (Math.random() - 0.5) * 2,
                        0.0, 1.0, 0.4, // Nanite green
                        7, 0.45
                    );
                }
            }
        }

        // 2. Supply Replicator Drops
        if (this.dropCooldownTimer > 0) {
            this.dropCooldownTimer -= delta;
        }

        const spawnedZombies = window.getSpawnedZombies ? window.getSpawnedZombies() : 0;
        let anyActiveZombies = false;
        for (let z = 0; z < spawnedZombies; z++) {
            if (window.zState && window.zState[z] === 1) {
                anyActiveZombies = true;
                break;
            }
        }

        if (anyActiveZombies && this.dropCooldownTimer <= 0) {
            this.dropCooldownTimer = 35.0; // 35 seconds reload

            const type = Math.random() < 0.65 ? 'ammo' : 'health';
            let dropMesh = type === 'health' ? new window.HealthPack() : new window.AmmoCan();

            const angle = Math.random() * Math.PI * 2;
            const dist = 1.8 + Math.random() * 1.5;
            const dropX = this.player.position.x + Math.cos(angle) * dist;
            const dropZ = this.player.position.z + Math.sin(angle) * dist;
            const dropY = window.TerrainGen ? window.TerrainGen.getHeight(dropX, dropZ) : 0.0;

            dropMesh.position.set(dropX, dropY + 0.4, dropZ);
            dropMesh.rotation.set(0.2, Math.random() * Math.PI * 2, 0.1);

            this.scene.add(dropMesh);
            if (window.weaponDrops) {
                window.weaponDrops.push({ mesh: dropMesh, type: type });
            }

            // Replicate particles
            for (let i = 0; i < 15; i++) {
                if (typeof window.emitParticle === 'function') {
                    window.emitParticle(
                        dropX + (Math.random() - 0.5) * 0.5,
                        dropY + 0.1 + Math.random() * 0.5,
                        dropZ + (Math.random() - 0.5) * 0.5,
                        (Math.random() - 0.5) * 3,
                        1.0 + Math.random() * 3,
                        (Math.random() - 0.5) * 3,
                        0.2, 0.9, 0.45, // Emerald replicator matrix
                        8, 0.55
                    );
                }
            }

            const rIdx = Math.floor(Math.random() * this.dialogues.drop.length);
            this.speak(this.dialogues.drop[rIdx], 'sys');
        }
    }

    /**
     * Emergency Forcefield dome checks: Protect player when <35% HP
     */
    _updateShield(delta, time) {
        if (!this.player) return;

        if (this.shieldCooldownTimer > 0) {
            this.shieldCooldownTimer -= delta;
        }

        // Attach shield dome to player group
        if (!this.shieldMesh.parent && this.player) {
            this.shieldMesh.scale.setScalar(5.26);
            this.player.add(this.shieldMesh);
        }

        const hpVal = window.playerHealth !== undefined ? window.playerHealth : 200;
        const maxHpVal = window.CONFIG?.playerHealth || 200;
        const hpPct = hpVal / maxHpVal;

        if (hpPct < 0.35 && !this.isShieldActive && this.shieldCooldownTimer <= 0) {
            this.isShieldActive = true;
            this.shieldActiveTimer = this.shieldDuration;
            this.shieldMesh.visible = true;
            
            this._playDroneBeep('shield_up');
            
            // Dialogue
            const rIdx = Math.floor(Math.random() * this.dialogues.shield.length);
            this.speak(this.dialogues.shield[rIdx], 'err');
        }

        // Update active shield dome visuals
        if (this.isShieldActive) {
            this.shieldActiveTimer -= delta;
            
            this.shieldMesh.rotation.y += delta * 1.5;
            this.shieldMesh.rotation.x = Math.sin(time * 2.2) * 0.12;

            if (this.shieldMat.uniforms) {
                this.shieldMat.uniforms.uTime.value = time;
                this.shieldMat.uniforms.uChatterAmplitude.value = this.chatterAmplitude;
            }

            if (Math.random() < 0.25 && typeof window.emitParticle === 'function') {
                const angle = Math.random() * Math.PI * 2;
                const px = this.player.position.x + Math.cos(angle) * 1.65;
                const pz = this.player.position.z + Math.sin(angle) * 1.65;
                window.emitParticle(
                    px, 0.4 + Math.random() * 1.5, pz,
                    (Math.random() - 0.5) * 0.5, 0.8 + Math.random(), (Math.random() - 0.5) * 0.5,
                    0.0, 0.8, 1.0,
                    6, 0.35
                );
            }

            if (this.shieldActiveTimer <= 0) {
                this.isShieldActive = false;
                this.shieldMesh.visible = false;
                this.shieldCooldownTimer = this.shieldCooldown;
                
                this.speak("[AEGIS]: Emergency vector shield collapsed! Recharging matrix grids.", 'sys');
            }
        }
    }

    /**
     * Periodic scheduler for dialogue tip chatter logs
     */
    _updateChatter(delta, time) {
        if (this.dialogueTimer > 0) {
            this.dialogueTimer -= delta;
        } else {
            // Next dialogue trigger interval
            this.dialogueTimer = 18.0 + Math.random() * 10.0;

            let category = 'idle';
            if (this.isShieldActive) {
                category = 'shield';
            } else if (this.currentTargetIdx !== -1 && window.zState && window.zState[this.currentTargetIdx] === 1) {
                category = 'combat';
            }

            const pool = this.dialogues[category];
            const rIdx = Math.floor(Math.random() * pool.length);
            this.speak(pool[rIdx], category === 'shield' ? 'err' : (category === 'combat' ? 'warn' : 'res'));
        }

        // Dampen chatter vibration amplitude
        if (this.chatterAmplitude > 0.0) {
            this.chatterAmplitude *= Math.pow(0.01, delta * 1.6);
            if (this.chatterAmplitude < 0.01) this.chatterAmplitude = 0.0;
        }
    }

    /**
     * Primary game loop update callback
     */
    update(delta, time) {
        if (!this.isEnabled || !this.player) return;
        this.time = time;

        // Update shader material uniforms
        if (this.coreUniforms && this.shellUniforms) {
            this.coreUniforms.uTime.value = time;
            this.coreUniforms.uChatterAmplitude.value = this.chatterAmplitude;
            
            this.shellUniforms.uTime.value = time;
            this.shellUniforms.uChatterAmplitude.value = this.chatterAmplitude;

            // Interpolate base color states
            let targetColor = new THREE.Color(0x00d2ff); // idle cyan
            if (this.isShieldActive) {
                targetColor = new THREE.Color(0xaae8ff); // shield white-hot cyan
            } else if (this.isHealingActive) {
                targetColor = new THREE.Color(0x00ff66); // heal green
            } else if (this.currentTargetIdx !== -1 && window.zState && window.zState[this.currentTargetIdx] === 1) {
                targetColor = new THREE.Color(0xff00d2); // combat purple
            }

            this.coreUniforms.uStateColor.value.lerp(targetColor, delta * 4.0);
            this.shellUniforms.uStateColor.value.lerp(targetColor, delta * 4.0);
            this.light.color.copy(this.coreUniforms.uStateColor.value);
        }

        // --- 1. Compute dynamic slot position next to player ---
        const playerForward = new THREE.Vector3(0, 0, -1);
        playerForward.applyQuaternion(this.player.quaternion);
        
        const lateralDir = new THREE.Vector3(-playerForward.z, 0, playerForward.x).normalize();

        this.targetPos.copy(this.player.position);
        this.targetPos.addScaledVector(playerForward, -this.config.hoverOffset.z);
        this.targetPos.addScaledVector(lateralDir, this.config.hoverOffset.x);
        this.targetPos.y += this.config.hoverOffset.y;

        // Shifting weave/bobbing vector motions
        const hoverBobY = Math.sin(time * 3.0) * 0.26;
        const hoverBobXZ = Math.cos(time * 1.6) * 0.18;
        
        this.targetPos.y += hoverBobY;
        this.targetPos.addScaledVector(lateralDir, hoverBobXZ);

        // --- 2. Smoothly move drone chassis using LERP ---
        this.group.position.lerp(this.targetPos, this.config.followSmooth * delta);

        // --- 3. Rotate drone to track player looking direction or targeted threat ---
        let lookTargetPos = null;
        
        if (this.currentTargetIdx !== -1 && window.zState && window.zState[this.currentTargetIdx] === 1) {
            const targetIdx = this.currentTargetIdx;
            lookTargetPos = new THREE.Vector3(
                window.zPosX[targetIdx],
                0.7 + (window.TerrainGen ? window.TerrainGen.getHeight(window.zPosX[targetIdx], window.zPosZ[targetIdx]) : 0.0),
                window.zPosZ[targetIdx]
            );
        } else {
            lookTargetPos = this.player.position.clone().addScaledVector(playerForward, 12);
        }

        if (lookTargetPos) {
            const dir = new THREE.Vector3().subVectors(lookTargetPos, this.group.position).normalize();
            
            // Aim turret weapon prisms toward target
            this.prismL.lookAt(lookTargetPos);
            this.prismR.lookAt(lookTargetPos);

            // Rotate chassis
            const targetQuat = new THREE.Quaternion();
            const lookMatrix = new THREE.Matrix4().lookAt(
                this.group.position,
                this.group.position.clone().add(new THREE.Vector3(dir.x, 0, dir.z)),
                new THREE.Vector3(0, 1, 0)
            );
            targetQuat.setFromRotationMatrix(lookMatrix);
            this.group.quaternion.slerp(targetQuat, this.config.rotationSmooth * delta);
        }

        // --- 4. Morphing wireframe animations ---
        // Asymmetric rotation of concentric horizontal/vertical rings
        this.wingL.rotation.y += delta * 1.8;
        this.wingL.rotation.z -= delta * 0.9;
        
        this.wingR.rotation.x += delta * 1.4;
        this.wingR.rotation.z += delta * 1.1;

        // Weapon prisms scaling and wobbling during targeting
        if (this.currentTargetIdx !== -1) {
            const combatScale = 1.0 + Math.sin(time * 15.0) * 0.25;
            this.prismL.scale.setScalar(combatScale);
            this.prismR.scale.setScalar(combatScale);
            this.prismL.rotation.y += delta * 4.0;
            this.prismR.rotation.y -= delta * 4.0;
        } else {
            this.prismL.scale.setScalar(1.0);
            this.prismR.scale.setScalar(1.0);
            this.prismL.rotation.y += delta * 1.2;
            this.prismR.rotation.y -= delta * 1.2;
        }

        // Thruster exhaust particles
        if (Math.random() < 0.35 && typeof window.emitParticle === 'function') {
            const nozzleWorldPos = new THREE.Vector3();
            this.exhaust.getWorldPosition(nozzleWorldPos);
            
            const backDir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.group.quaternion);
            window.emitParticle(
                nozzleWorldPos.x, nozzleWorldPos.y, nozzleWorldPos.z,
                backDir.x * 2.2 + (Math.random() - 0.5) * 0.5,
                backDir.y * 1.1 + (Math.random() - 0.5) * 0.5,
                backDir.z * 2.2 + (Math.random() - 0.5) * 0.5,
                this.coreUniforms.uStateColor.value.r,
                this.coreUniforms.uStateColor.value.g,
                this.coreUniforms.uStateColor.value.b,
                6, 0.26
            );
        }

        // --- 5. Scanning laser visuals (rotates and sweep terrain) ---
        this.scanConeMesh.rotation.y += delta * 2.0;
        const laserAngle = time * 2.2;
        const scanHeight = Math.sin(time * 3.5) * 0.12;
        this.scanConeMesh.scale.set(1.0 + Math.sin(laserAngle) * 0.12, 1.0, 1.0 + Math.cos(laserAngle) * 0.12);

        // Map scan grid color
        if (this.scanConeMesh.material) {
            this.scanConeMesh.material.color.copy(this.coreUniforms.uStateColor.value);
            this.scanConeMesh.material.emissive.copy(this.coreUniforms.uStateColor.value);
        }

        // --- 6. Update support AI, shield, heals & dialogs ---
        this._updateCombat(delta, time);
        this._updateShield(delta, time);
        this._updateHealAndDrops(delta, time);
        this._updateChatter(delta, time);
    }

    /**
     * Wipe all objects cleanly from scene to prevent memory leakage
     */
    dispose() {
        this._clearShockArc();
        this._clearHealingArc();
        
        this.scene.remove(this.group);
        if (this.shieldMesh.parent) {
            this.shieldMesh.parent.remove(this.shieldMesh);
        }
        
        // Dispose geometries
        this.coreMesh.geometry.dispose();
        this.shellMesh.geometry.dispose();
        this.wingL.geometry.dispose();
        this.wingR.geometry.dispose();
        this.prismL.geometry.dispose();
        this.prismR.geometry.dispose();
        this.exhaust.geometry.dispose();
        this.scanConeMesh.geometry.dispose();
        this.shieldMesh.geometry.dispose();

        // Dispose materials
        this.coreMat.dispose();
        this.shellMat.dispose();
        this.scanConeMat.dispose();
        this.shieldMat.dispose();
        
        this.light.dispose();
        console.log("[Aegis Sentinel] Tactical Drone offline (disposed).");
    }
}

window.AegisSentinel = AegisSentinel;
