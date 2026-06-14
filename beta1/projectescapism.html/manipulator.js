
/**
 * SDFManipulatorArm — Advanced Biomorphic Neural Point-Cloud Appendage
 * Formed from 1500 dynamic Dodecahedrons using instanced CPU raymarching SDF.
 * Features: High-fidelity biomorphic synaptic glow colors, precise physical gripping
 * kinematics, dynamic weapon scaling, pulsing bio-luminescence, organic static noise,
 * and high-fidelity Inverse Kinematics (IK) finger tip binding to invisible gun anchors.
 */
class SDFManipulatorArm extends THREE.Group {
    constructor() {
        super();
        
        // 1. Setup InstancedMesh with Dodecahedrons
        this.INSTANCE_COUNT = 1500;
        const geometry = new THREE.DodecahedronGeometry(0.011, 0); // slightly larger dodecahedron nodes
        
        // Premium brushed-chrome PBR material with emissive capability
        const material = new THREE.MeshStandardMaterial({
            color: 0xc8d0dc,
            roughness: 0.18,
            metalness: 0.95,
            emissive: 0x112233,
            emissiveIntensity: 0.3,
            transparent: false,
            wireframe: false
        });
 
        this.instancedMesh = new THREE.InstancedMesh(geometry, material, this.INSTANCE_COUNT);
        this.instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        this.add(this.instancedMesh);

        // 1b. Setup InstancedMesh for BADAS geometric spark particles (glowing floating octahedrons)
        const sparkGeo = new THREE.OctahedronGeometry(0.006, 0); // sharp badass diamonds
        const sparkMat = new THREE.MeshStandardMaterial({
            color: 0x00ffff,
            roughness: 0.1,
            metalness: 0.9,
            emissive: 0x00ffff,
            emissiveIntensity: 4.0,
            transparent: true,
            opacity: 0.95,
            blending: THREE.AdditiveBlending // highly glowing energy
        });
        this.sparksCount = 120;
        this.sparksMesh = new THREE.InstancedMesh(sparkGeo, sparkMat, this.sparksCount);
        this.sparksMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        if (this.sparksMesh.instanceColor) {
            this.sparksMesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
        }
        this.add(this.sparksMesh);

        // Pre-allocate spark particle pool
        this.sparks = [];
        for (let i = 0; i < this.sparksCount; i++) {
            this.sparks.push({
                active: false,
                position: new THREE.Vector3(),
                velocity: new THREE.Vector3(),
                scale: 0.0,
                startScale: 1.0,
                life: 0.0,
                maxLife: 1.0,
                color: new THREE.Color(),
                rot: new THREE.Vector3(),
                rotSpeed: new THREE.Vector3()
            });
        }
 
        // 2. Pre-calculate targets for Forearm, Wrist, 3 Fingers
        this.particles = [];
        this.dummy = new THREE.Object3D();
        this.colorObj = new THREE.Color();
        
        // Smooth position buffers for each particle (prevents jitter/whipping)
        this.smoothPositions = [];
        
        const armCount = 700;
        const wristCount = 200;
        const fingerCount = 200; // per finger
        
        const randCyl = (radius, length) => {
            const theta = Math.random() * Math.PI * 2;
            const r = Math.sqrt(Math.random()) * radius;
            const y = (Math.random() - 0.5) * length;
            return new THREE.Vector3(r * Math.cos(theta), y, r * Math.sin(theta));
        };
        
        const randSphere = (radius) => {
            const u = Math.random();
            const v = Math.random();
            const theta = u * 2.0 * Math.PI;
            const phi = Math.acos(2.0 * v - 1.0);
            const r = Math.cbrt(Math.random()) * radius;
            const sinPhi = Math.sin(phi);
            return new THREE.Vector3(r * sinPhi * Math.cos(theta), r * sinPhi * Math.sin(theta), r * Math.cos(phi));
        };
 
        for (let i = 0; i < this.INSTANCE_COUNT; i++) {
            let basePos = new THREE.Vector3();
            let partId = 0; // 0=arm, 1=wrist, 2=thumb, 3=index, 4=middle
 
            if (i < armCount) {
                // Forearm
                basePos = randCyl(0.04, 0.6);
                basePos.y -= 0.15; // Shift back
                partId = 0;
            } else if (i < armCount + wristCount) {
                // Wrist core
                basePos = randSphere(0.045);
                basePos.y += 0.18; // Shift to end of forearm
                partId = 1;
            } else {
                // Fingers
                const fingerIdx = Math.floor((i - armCount - wristCount) / fingerCount);
                basePos = randCyl(0.010, 0.22); // slender finger segments
                basePos.y += 0.08;
                partId = 2 + fingerIdx;
            }
 
            this.particles.push({
                basePos: basePos,
                partId: partId,
                offset: Math.random() * Math.PI * 2,
                speed: 0.6 + Math.random() * 1.4,
                scaleOffset: Math.random()
            });
            
            // Initialize smooth position buffer to base position
            this.smoothPositions.push(new THREE.Vector3().copy(basePos));
        }
        
        // Cache for reusable vectors to avoid GC pressure
        this._cachedThumbTarget = new THREE.Vector3();
        this._cachedIndexTarget = new THREE.Vector3();
        this._cachedMiddleTarget = new THREE.Vector3();
        this._hasValidAnchors = false;

        // Smart tactile exploration states for each finger
        this.exploration = {
            thumb: {
                currentOffset: new THREE.Vector3(),
                targetOffset: new THREE.Vector3(),
                wiggleOffset: new THREE.Vector3(),
                timer: 0,
                state: 'grip', // 'grip', 'wander', 'tap', 'detach_transition'
                tapTimer: 0,
                tapSpeed: 0,
                tapAmplitude: new THREE.Vector3(),

                // Detachment animation properties
                isDetached: false,
                sourceOffset: new THREE.Vector3(),
                destOffset: new THREE.Vector3(),
                detachmentProgress: 0,
                detachmentSpeed: 1.0,
                liftDirection: new THREE.Vector3(0.08, 0.03, 0.0) // thumb moves right and slightly up
            },
            index: {
                currentOffset: new THREE.Vector3(),
                targetOffset: new THREE.Vector3(),
                wiggleOffset: new THREE.Vector3(),
                timer: 0,
                state: 'grip',
                tapTimer: 0,
                tapSpeed: 0,
                tapAmplitude: new THREE.Vector3(),

                // Detachment animation properties
                isDetached: false,
                sourceOffset: new THREE.Vector3(),
                destOffset: new THREE.Vector3(),
                detachmentProgress: 0,
                detachmentSpeed: 1.0,
                liftDirection: new THREE.Vector3(-0.08, 0.03, 0.0) // index moves left and slightly up
            },
            middle: {
                currentOffset: new THREE.Vector3(),
                targetOffset: new THREE.Vector3(),
                wiggleOffset: new THREE.Vector3(),
                timer: 0,
                state: 'grip',
                tapTimer: 0,
                tapSpeed: 0,
                tapAmplitude: new THREE.Vector3(),

                // Detachment animation properties
                isDetached: false,
                sourceOffset: new THREE.Vector3(),
                destOffset: new THREE.Vector3(),
                detachmentProgress: 0,
                detachmentSpeed: 1.0,
                liftDirection: new THREE.Vector3(-0.08, -0.03, 0.0) // middle moves left and slightly down
            }
        };
    }

    spawnSpark(pos, vel, color, life, scale = 1.0) {
        // Find first inactive spark in pool
        const spark = this.sparks.find(s => !s.active);
        if (spark) {
            spark.active = true;
            spark.position.copy(pos);
            spark.velocity.copy(vel);
            spark.scale = scale;
            spark.startScale = scale;
            spark.life = life;
            spark.maxLife = life;
            spark.color.copy(color);
            spark.rot.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
            spark.rotSpeed.set(
                (Math.random() - 0.5) * 12.0,
                (Math.random() - 0.5) * 12.0,
                (Math.random() - 0.5) * 12.0
            );
        }
    }
    // Kinematics and SDF evaluation in JS
    update(uTime, delta, isFiring, isADS, isMoving = false) {
        // Animation variables
        const pulse = Math.sin(uTime * 3.5) * 0.06 + 0.94;
        const gripTightness = isFiring ? 1.0 : (isADS ? 0.75 : 0.2);
        
        // Track grip changes for articulation glow
        if (this._prevGrip === undefined) this._prevGrip = gripTightness;
        const gripDelta = Math.abs(gripTightness - this._prevGrip);
        this._gripGlow = (this._gripGlow || 0) + gripDelta * 3.0;
        this._gripGlow *= Math.pow(0.02, delta); // Decay
        this._prevGrip = gripTightness;

        // Track sustained fire for heat shimmer
        if (this._fireHeat === undefined) this._fireHeat = 0;
        if (isFiring) {
            this._fireHeat = Math.min(1.0, this._fireHeat + delta * 2.5);
        } else {
            this._fireHeat *= Math.pow(0.1, delta);
        }
        
        // TIGHT PHYSICAL GRIPPING COORDINATES (Fallback kinematic base)
        const thumbRot = new THREE.Euler(0.1, 0, -0.7 - gripTightness * 0.4);
        const thumbPos = new THREE.Vector3(0.04, 0.22, 0.02);
        
        const indexRot = new THREE.Euler(0.65 + gripTightness * 0.55, 0.08, 0.06);
        const indexPos = new THREE.Vector3(-0.035, 0.24, 0.03);
        
        const middleRot = new THREE.Euler(0.75 + gripTightness * 0.65, -0.08, -0.06);
        const middlePos = new THREE.Vector3(-0.035, 0.24, -0.03);
        
        // Update exploration offsets for each finger
        const fingers = ['thumb', 'index', 'middle'];
        fingers.forEach(f => {
            const exp = this.exploration[f];
            if (isFiring) {
                // Force back to grip instantly
                exp.state = 'grip';
                exp.isDetached = false;
                exp.detachmentProgress = 1.0;
                exp.targetOffset.set(0, 0, 0);
                exp.wiggleOffset.set(0, 0, 0);
                exp.currentOffset.lerp(exp.targetOffset, delta * 25.0);
            } else {
                exp.timer -= delta;
                
                // If the timer expires and we aren't already detaching or aiming down sights, trigger a detachment animation!
                if (exp.timer <= 0 && exp.state !== 'detach_transition' && !isADS) {
                    exp.timer = 3.0 + Math.random() * 4.0; // Stay at landing site or keep wandering for 3-7s before detaching again
                    
                    const chooseDetach = Math.random() < 0.6; // 60% chance to detach and fly to a new connection point
                    if (chooseDetach) {
                        exp.state = 'detach_transition';
                        exp.isDetached = true;
                        exp.sourceOffset.copy(exp.currentOffset);
                        exp.detachmentProgress = 0;
                        exp.detachmentSpeed = 1.0 / (0.5 + Math.random() * 0.7); // takes 0.5 to 1.2s
                        
                        // Select a new connection point (destOffset) in local coordinates relative to anchor
                        if (f === 'thumb') {
                            exp.destOffset.set(
                                (Math.random() - 0.5) * 0.015,
                                (Math.random() - 0.5) * 0.035,
                                (Math.random() - 0.5) * 0.05
                            );
                        } else if (f === 'index') {
                            exp.destOffset.set(
                                (Math.random() - 0.5) * 0.02,
                                0.01 + Math.random() * 0.045,
                                -0.09 + (Math.random() - 0.5) * 0.05
                            );
                        } else {
                            exp.destOffset.set(
                                (Math.random() - 0.5) * 0.015,
                                -0.05 + (Math.random() - 0.5) * 0.03,
                                (Math.random() - 0.5) * 0.03
                            );
                        }

                        // SPAWN DETACH SPARKS
                        const startPos = f === 'thumb' ? this._cachedThumbTarget : (f === 'index' ? this._cachedIndexTarget : this._cachedMiddleTarget);
                        for (let k = 0; k < 5; k++) {
                            const vel = new THREE.Vector3().copy(exp.liftDirection)
                                .multiplyScalar(0.25 + Math.random() * 0.3)
                                .add(new THREE.Vector3(
                                    (Math.random() - 0.5) * 0.12,
                                    (Math.random() - 0.5) * 0.12,
                                    (Math.random() - 0.5) * 0.12
                                ));
                            this.spawnSpark(startPos, vel, new THREE.Color(0xff00d0), 0.6 + Math.random() * 0.5, 0.8 + Math.random() * 0.6);
                        }
                    } else {
                        // Regular state change (grip or wander without detaching)
                        const randState = Math.random();
                        if (randState < 0.45) {
                            exp.state = 'grip';
                            exp.targetOffset.set(0, 0, 0);
                        } else {
                            exp.state = 'wander';
                            if (f === 'thumb') {
                                exp.targetOffset.set(
                                    (Math.random() - 0.5) * 0.012,
                                    (Math.random() - 0.5) * 0.03,
                                    (Math.random() - 0.5) * 0.04
                                );
                            } else if (f === 'index') {
                                exp.targetOffset.set(
                                    (Math.random() - 0.5) * 0.015,
                                    0.01 + Math.random() * 0.035,
                                    -0.07 + (Math.random() - 0.5) * 0.04
                                );
                            } else {
                                exp.targetOffset.set(
                                    (Math.random() - 0.5) * 0.012,
                                    -0.035 + (Math.random() - 0.5) * 0.025,
                                    (Math.random() - 0.5) * 0.02
                                );
                            }
                        }
                    }
                }

                // ADS overrides detachment instantly
                if (isADS && exp.state === 'detach_transition') {
                    exp.state = 'grip';
                    exp.isDetached = false;
                    exp.targetOffset.set(0, 0, 0);
                }

                // Process the detachment-transition animation
                if (exp.state === 'detach_transition') {
                    exp.detachmentProgress += delta * exp.detachmentSpeed;
                    if (exp.detachmentProgress >= 1.0) {
                        exp.detachmentProgress = 1.0;
                        exp.currentOffset.copy(exp.destOffset);
                        exp.targetOffset.copy(exp.destOffset);
                        exp.wiggleOffset.set(0, 0, 0);
                        exp.isDetached = false;
                        
                        // SPAWN LANDING SPARKS
                        const landPos = f === 'thumb' ? this._cachedThumbTarget : (f === 'index' ? this._cachedIndexTarget : this._cachedMiddleTarget);
                        for (let k = 0; k < 8; k++) {
                            const vel = new THREE.Vector3(
                                (Math.random() - 0.5) * 0.22,
                                (Math.random() - 0.5) * 0.22,
                                (Math.random() - 0.5) * 0.22
                            );
                            this.spawnSpark(landPos, vel, new THREE.Color(0x00ffd0), 0.7 + Math.random() * 0.5, 0.9 + Math.random() * 0.7);
                        }

                        // Roll state upon landing
                        if (Math.random() < 0.4) {
                            exp.state = 'tap';
                            exp.tapTimer = 0.6 + Math.random() * 1.2;
                            exp.tapSpeed = 10.0 + Math.random() * 14.0;
                            if (f === 'index') {
                                exp.tapAmplitude.set(-0.012 - Math.random() * 0.008, 0.0, 0.0);
                            } else if (f === 'middle') {
                                exp.tapAmplitude.set(0.0, 0.0, 0.007);
                            } else {
                                exp.tapAmplitude.set(0.0, 0.007, 0.0);
                            }
                        } else {
                            exp.state = 'wander'; // Slide around at new connection point
                        }
                    } else {
                        const t = exp.detachmentProgress;
                        const easedT = THREE.MathUtils.smoothstep(t, 0, 1);
                        exp.currentOffset.lerpVectors(exp.sourceOffset, exp.destOffset, easedT);
                        
                        // Lift curve: parabolic lift off
                        const liftHeight = Math.sin(t * Math.PI);
                        exp.wiggleOffset.copy(exp.liftDirection).multiplyScalar(liftHeight);

                        // Organic writhing search noise while floating in the air
                        exp.wiggleOffset.x += Math.sin(uTime * 14.0 + (f === 'thumb' ? 0 : f === 'index' ? 2 : 4)) * 0.004 * liftHeight;
                        exp.wiggleOffset.y += Math.cos(uTime * 11.0 + (f === 'thumb' ? 1 : f === 'index' ? 3 : 5)) * 0.004 * liftHeight;
                        exp.wiggleOffset.z += Math.sin(uTime * 17.0 + (f === 'thumb' ? 2 : f === 'index' ? 4 : 6)) * 0.004 * liftHeight;

                        // SPAWN TRAIL SPARKS
                        if (Math.random() < 0.25) {
                            const vel = new THREE.Vector3(
                                (Math.random() - 0.5) * 0.04,
                                (Math.random() - 0.5) * 0.04,
                                (Math.random() - 0.5) * 0.04
                            );
                            const trailPos = f === 'thumb' ? this._cachedThumbTarget : (f === 'index' ? this._cachedIndexTarget : this._cachedMiddleTarget);
                            this.spawnSpark(trailPos, vel, new THREE.Color(0x00ff88), 0.5 + Math.random() * 0.3, 0.6 + Math.random() * 0.5);
                        }
                    }
                } else {
                    // Regular sliding/lerping
                    const slideSpeed = isMoving ? 6.0 : 3.5;
                    exp.currentOffset.lerp(exp.targetOffset, delta * slideSpeed);
                    
                    // Update tap wiggles
                    if (exp.state === 'tap') {
                        exp.tapTimer -= delta;
                        if (exp.tapTimer <= 0) {
                            exp.state = 'grip';
                            exp.targetOffset.set(0, 0, 0);
                        } else {
                            const tapVal = Math.max(0, Math.sin(uTime * exp.tapSpeed));
                            exp.wiggleOffset.copy(exp.tapAmplitude).multiplyScalar(tapVal);
                        }
                    } else {
                        exp.wiggleOffset.lerp(new THREE.Vector3(0,0,0), delta * 6.0);
                    }
                }
            }
        });

        // EVALUATE INVISIBLE IK ANCHORS ON DYNAMIC ACTIVE WEAPON
        this._hasValidAnchors = false;
 
        if (window.activeWeaponMesh && window.activeWeaponMesh.gripAnchors) {
            try {
                // Ensure local matrices are updated
                window.activeWeaponMesh.updateMatrix();
                window.activeWeaponMesh.gripAnchors.thumb.updateMatrix();
                window.activeWeaponMesh.gripAnchors.index.updateMatrix();
                window.activeWeaponMesh.gripAnchors.middle.updateMatrix();
                this.updateMatrix();

                // Compute relative matrices from anchor local space to manipulator local space
                const invManip = new THREE.Matrix4().copy(this.matrix).invert();
                const mWeapon = window.activeWeaponMesh.matrix;

                // For each anchor, get the exploration offset and transform to manipulator space
                const thumbExpl = this.exploration.thumb.currentOffset.clone().add(this.exploration.thumb.wiggleOffset);
                const indexExpl = this.exploration.index.currentOffset.clone().add(this.exploration.index.wiggleOffset);
                const middleExpl = this.exploration.middle.currentOffset.clone().add(this.exploration.middle.wiggleOffset);

                // Add physical movement sway to targets if player is moving
                if (isMoving) {
                    const walkSway = Math.sin(uTime * 8.0) * 0.005;
                    thumbExpl.z += walkSway;
                    indexExpl.z += walkSway * 0.5;
                    middleExpl.z += walkSway * 0.8;
                }

                // If aiming down sights, dramatically reduce exploration offsets for rock-solid aiming
                if (isADS) {
                    thumbExpl.multiplyScalar(0.12);
                    indexExpl.multiplyScalar(0.12);
                    middleExpl.multiplyScalar(0.12);
                }

                // Transform targets
                const mThumb = new THREE.Matrix4().copy(invManip).multiply(mWeapon).multiply(window.activeWeaponMesh.gripAnchors.thumb.matrix);
                this._cachedThumbTarget.copy(thumbExpl).applyMatrix4(mThumb);

                const mIndex = new THREE.Matrix4().copy(invManip).multiply(mWeapon).multiply(window.activeWeaponMesh.gripAnchors.index.matrix);
                this._cachedIndexTarget.copy(indexExpl).applyMatrix4(mIndex);

                const mMiddle = new THREE.Matrix4().copy(invManip).multiply(mWeapon).multiply(window.activeWeaponMesh.gripAnchors.middle.matrix);
                this._cachedMiddleTarget.copy(middleExpl).applyMatrix4(mMiddle);
                
                this._hasValidAnchors = true;
            } catch (e) {
                console.error("Manipulator IK tracking error:", e);
                this._hasValidAnchors = false;
            }
        }

        // SPAWN THERMAL DISCHARGE SPARKS ON FIRING
        if (isFiring && this._hasValidAnchors && Math.random() < 0.20) {
            const vel = new THREE.Vector3(
                -0.18 - Math.random() * 0.22,
                (Math.random() - 0.5) * 0.15,
                -0.12 - Math.random() * 0.22
            );
            this.spawnSpark(this._cachedIndexTarget, vel, new THREE.Color(0xff3300).lerp(new THREE.Color(0xffffff), Math.random() * 0.5), 0.4 + Math.random() * 0.4, 0.8 + Math.random() * 0.6);
            
            if (Math.random() < 0.35) {
                const thumbVel = new THREE.Vector3((Math.random() - 0.5) * 0.12, (Math.random() - 0.5) * 0.12, (Math.random() - 0.5) * 0.12);
                this.spawnSpark(this._cachedThumbTarget, thumbVel, new THREE.Color(0xff6600), 0.3 + Math.random() * 0.3, 0.6 + Math.random() * 0.4);
            }
        }
        
        // SPAWN WRIST SYNAPTIC DISCHARGE SPARKS
        if (Math.random() < 0.022) {
            const wristPos = new THREE.Vector3(
                (Math.random() - 0.5) * 0.03,
                0.18 + (Math.random() - 0.5) * 0.03,
                (Math.random() - 0.5) * 0.03
            );
            const vel = new THREE.Vector3(
                (Math.random() - 0.5) * 0.015,
                0.035 + Math.random() * 0.035, // rise up
                (Math.random() - 0.5) * 0.015
            );
            this.spawnSpark(wristPos, vel, new THREE.Color(0x00aaff), 1.1 + Math.random() * 0.6, 0.4 + Math.random() * 0.4);
        }

        // Smooth interpolation speed — tighter grip = faster tracking
        const smoothLerp = Math.min(1.0, delta * (12.0 + gripTightness * 18.0));

        for (let i = 0; i < this.INSTANCE_COUNT; i++) {
            const p = this.particles[i];
            let targetPos = new THREE.Vector3().copy(p.basePos);
            
            // Apply SDF transforms
            if (p.partId === 0) {
                // Forearm
                targetPos.x *= pulse;
                targetPos.z *= pulse;
            } else if (p.partId === 1) {
                // Wrist
            } else if (p.partId >= 2) {
                // Parabolic curl for high-fidelity wrapping
                const curlAmount = Math.max(0, p.basePos.y - 0.04); 
                const bend = curlAmount * curlAmount * 6.5; 
                
                if (p.partId === 2) {
                    // Thumb
                    targetPos.z += bend * (0.6 + gripTightness * 0.8);
                    targetPos.applyEuler(thumbRot);
                    targetPos.add(thumbPos);
                    
                    // Bind thumb tip organically to active gun's invisible thumb anchor
                    if (this._hasValidAnchors) {
                        const tipWeight = THREE.MathUtils.smoothstep(p.basePos.y, 0.04, 0.22);
                        targetPos.lerp(this._cachedThumbTarget, tipWeight * 0.85);
                    }
                } else if (p.partId === 3) {
                    // Index
                    targetPos.z -= bend * (1.1 + gripTightness * 1.6);
                    targetPos.applyEuler(indexRot);
                    targetPos.add(indexPos);
                    
                    // Bind index tip organically to active gun's invisible index anchor (trigger guard)
                    if (this._hasValidAnchors) {
                        const tipWeight = THREE.MathUtils.smoothstep(p.basePos.y, 0.04, 0.22);
                        targetPos.lerp(this._cachedIndexTarget, tipWeight * 0.85);
                    }
                } else if (p.partId === 4) {
                    // Middle
                    targetPos.z -= bend * (1.1 + gripTightness * 1.6);
                    targetPos.applyEuler(middleRot);
                    targetPos.add(middlePos);
                    
                    // Bind middle tip organically to active gun's invisible middle anchor
                    if (this._hasValidAnchors) {
                        const tipWeight = THREE.MathUtils.smoothstep(p.basePos.y, 0.04, 0.22);
                        targetPos.lerp(this._cachedMiddleTarget, tipWeight * 0.85);
                    }
                }
            }
 
            // Subtle organic micro-noise (very small, no flicker)
            const wobble = Math.sin(uTime * p.speed + p.offset);
            targetPos.x += wobble * 0.0008;
            targetPos.y += Math.cos(uTime * p.speed * 1.1 + p.offset) * 0.0008;
            targetPos.z += Math.sin(uTime * p.speed * 0.9 + p.offset) * 0.0008;
 
            // Smooth position interpolation — prevents whipping/lag jitter!
            this.smoothPositions[i].lerp(targetPos, smoothLerp);
            this.dummy.position.copy(this.smoothPositions[i]);
            
            // Slow gentle spin for individual nodes (no erratic rotation)
            this.dummy.rotation.x = uTime * 0.4 + p.offset;
            this.dummy.rotation.y = uTime * 0.35 + p.offset * 0.7;
            
            // Smooth breathing scale — NO random static pops
            let scale = 0.65 + Math.sin(uTime * 2.5 + p.scaleOffset * Math.PI * 2) * 0.08;
 
            // --- HEAT SHIMMER: fingers expand/distort during sustained fire ---
            if (p.partId >= 2 && this._fireHeat > 0.05) {
                scale += this._fireHeat * 0.15 * (0.7 + Math.sin(uTime * 12.0 + p.offset * 3.0) * 0.3);
                // Add micro-displacement from heat
                this.dummy.position.x += Math.sin(uTime * 20.0 + p.offset) * this._fireHeat * 0.002;
                this.dummy.position.z += Math.cos(uTime * 18.0 + p.offset) * this._fireHeat * 0.002;
            }
 
            this.dummy.scale.set(scale, scale, scale);
 
            this.dummy.updateMatrix();
            this.instancedMesh.setMatrixAt(i, this.dummy.matrix);
 
            // PREMIUM REACTIVE BIOMORPHIC COLOR GRADIENTS
            if (p.partId === 0) {
                // Forearm: titanium-grey steel base with moving neural vein pulses
                const fRatio = 0.5 + Math.sin(uTime * 2.5 + p.offset * 0.2) * 0.5;
                const distFromCenter = Math.sqrt(p.basePos.x * p.basePos.x + p.basePos.z * p.basePos.z);
                const isVein = distFromCenter < 0.015; // Inner core particles form the nerve line
                if (isVein) {
                    const veinPulse = 0.5 + Math.sin(uTime * 7.0 - p.basePos.y * 18.0) * 0.5; // moving wave along Y axis!
                    if (isADS) {
                        this.colorObj.setHSL(0.74, 0.95, 0.40 + veinPulse * 0.35); // electric purple pulse
                    } else {
                        this.colorObj.setHSL(0.52, 0.95, 0.45 + veinPulse * 0.35); // cyber cyan pulse
                    }
                } else {
                    if (isADS) {
                        this.colorObj.setHSL(0.76, 0.25, 0.22 + fRatio * 0.06); // purple steel reflection
                    } else {
                        this.colorObj.setHSL(0.58 + fRatio * 0.04, 0.32, 0.26 + fRatio * 0.06); // brushed titanium gray
                    }
                }
            } else if (p.partId === 1) {
                // Wrist: Synaptic joint core (glowing cyber cyan / violet)
                const wRatio = 0.8 + Math.sin(uTime * 5.0) * 0.2;
                const articulationBoost = Math.min(1.0, this._gripGlow * 2.2);
                if (isADS) {
                    this.colorObj.setHSL(0.74, 0.95, 0.45 + wRatio * 0.15 + articulationBoost * 0.25); // electric violet
                } else {
                    this.colorObj.setHSL(
                        0.52 - articulationBoost * 0.08,
                        0.90,
                        0.45 + wRatio * 0.15 + articulationBoost * 0.25
                    ); // cyber cyan joint
                }
            } else {
                // Fingers: Bio-luminescent nervous paths responding to state
                const fingerKey = p.partId === 2 ? 'thumb' : (p.partId === 3 ? 'index' : 'middle');
                const exp = this.exploration[fingerKey];
                
                if (isFiring) {
                    // Hot magma orange to white-hot neural spike on firing!
                    const firePhase = 0.5 + Math.sin(uTime * 14.0 + p.offset) * 0.5;
                    const heatHue = 0.02 + firePhase * 0.03 + this._fireHeat * 0.06;
                    const heatLightness = 0.52 + firePhase * 0.18 + this._fireHeat * 0.22;
                    this.colorObj.setHSL(heatHue, 1.0 - this._fireHeat * 0.4, Math.min(0.95, heatLightness));
                } else if (exp.state === 'detach_transition') {
                    // Glowing electric plasma magenta while detaching/crawling!
                    const detPhase = 0.5 + Math.sin(uTime * 10.0 + p.basePos.y * 15.0) * 0.5;
                    this.colorObj.setHSL(0.88 + detPhase * 0.04, 0.95, 0.45 + detPhase * 0.25);
                } else if (isADS) {
                    // Focused electric violet energy channels
                    const adsPhase = 0.5 + Math.sin(uTime * 4.0 + p.basePos.y * 12.0) * 0.5;
                    this.colorObj.setHSL(0.72 + adsPhase * 0.06, 0.90, 0.38 + adsPhase * 0.15);
                } else {
                    // Bio-cyan to toxic green pulsing gradient at rest
                    const gRatio = 0.5 + Math.sin(uTime * 3.5 + p.basePos.y * 12.0) * 0.5;
                    this.colorObj.setHSL(0.46 + gRatio * 0.14, 0.85, 0.36 + gRatio * 0.14);
                }
            }
            this.instancedMesh.setColorAt(i, this.colorObj);
        }
 
        // Update Spark Particles simulation
        const dummySpark = new THREE.Object3D();
        for (let i = 0; i < this.sparksCount; i++) {
            const s = this.sparks[i];
            if (s.active) {
                s.life -= delta;
                if (s.life <= 0) {
                    s.active = false;
                    dummySpark.position.set(0, -9999, 0); // Hide
                    dummySpark.scale.set(0, 0, 0);
                    dummySpark.updateMatrix();
                    this.sparksMesh.setMatrixAt(i, dummySpark.matrix);
                } else {
                    // Apply velocity and drag slowing
                    s.position.addScaledVector(s.velocity, delta);
                    s.velocity.multiplyScalar(Math.pow(0.88, delta * 60.0));
                    
                    // Rotate
                    s.rot.addScaledVector(s.rotSpeed, delta);
                    
                    // Fade out scale
                    const ratio = s.life / s.maxLife;
                    const curScale = s.startScale * ratio;
                    
                    dummySpark.position.copy(s.position);
                    dummySpark.rotation.set(s.rot.x, s.rot.y, s.rot.z);
                    dummySpark.scale.set(curScale, curScale, curScale);
                    dummySpark.updateMatrix();
                    this.sparksMesh.setMatrixAt(i, dummySpark.matrix);
                    this.sparksMesh.setColorAt(i, s.color);
                }
            } else {
                dummySpark.position.set(0, -9999, 0);
                dummySpark.scale.set(0, 0, 0);
                dummySpark.updateMatrix();
                this.sparksMesh.setMatrixAt(i, dummySpark.matrix);
            }
        }

        this.instancedMesh.instanceMatrix.needsUpdate = true;
        if (this.instancedMesh.instanceColor) {
            this.instancedMesh.instanceColor.needsUpdate = true;
        }

        this.sparksMesh.instanceMatrix.needsUpdate = true;
        if (this.sparksMesh.instanceColor) {
            this.sparksMesh.instanceColor.needsUpdate = true;
        }
    }
}

window.SDFManipulatorArm = SDFManipulatorArm;
