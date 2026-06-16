/**
 * Dynamic SDF Manipulator Grab & Physical Weapon Drop Animation
 * Clones the advanced SDFManipulatorArm directly, styling it as a gorgeous glowing
 * cyan biometric point-cloud hand made of full, true, visible faceted crystal dodecahedrons (0.015 units).
 * Implements a 3-finger hydraulic horror choke gripping the zombie's chest/torso.
 * Restores the highly approved turn 2 positions (hand Y-offset at -1.1, zombie relative offset at -3.3)
 * to keep both hand and zombie perfectly framed, floating high above the ground terrain map.
 * Holds the zombie 100% rock-solid still and stationary in mid-air as a rigid hydraulic steel vice clamp,
 * while spraying dense streams of physical gravity-influenced ballistic blood droplets from fingertips.
 * Zombie billboard mesh is animated to physically compress and squeeze on the X/Z axes by 55%
 * and stretch vertically on the Y-axis as it is strangled, before exploding into visceral gore!
 */
(function() {
    class PhysicalWeaponDrop {
        constructor(scene, weaponId, startPos, startRot, isLeftHand) {
            this.scene = scene;
            this.mesh = WeaponModelFactory.getMesh(weaponId);
            this.mesh.scale.set(0.6, 0.6, 0.6);
            
            // Spawn slightly offset to look natural
            const lateralOffset = isLeftHand ? -0.2 : 0.2;
            this.pos = startPos.clone().add(new THREE.Vector3(lateralOffset, 0, 0));
            this.mesh.position.copy(this.pos);
            
            // Safe copy of rotation to prevent Quaternion type conversion warnings
            if (startRot && startRot.isQuaternion) {
                this.mesh.quaternion.copy(startRot);
            } else if (startRot && startRot.isEuler) {
                this.mesh.rotation.copy(startRot);
            } else {
                this.mesh.rotation.set(0, Math.random() * Math.PI * 2, 0);
            }
            
            // Apply upward and outward arc forces
            this.vel = new THREE.Vector3(
                (Math.random() - 0.5) * 1.5 + (isLeftHand ? -1.0 : 1.0),
                2.5 + Math.random() * 2.0,
                -1.5 - Math.random() * 1.5
            );
            
            // Random high-speed tumble
            this.spin = new THREE.Vector3(
                3.0 + Math.random() * 4.0,
                5.0 + Math.random() * 6.0,
                2.0 + Math.random() * 4.0
            );
            
            this.scene.add(this.mesh);
            this.timer = 0;
            this.grounded = false;
            this.fadeDuration = 1.2;
            this.removeQueued = false;
        }

        update(delta) {
            this.timer += delta;
            
            if (!this.grounded) {
                this.vel.y -= 9.8 * delta;
                this.pos.addScaledVector(this.vel, delta);
                this.mesh.rotation.x += this.spin.x * delta;
                this.mesh.rotation.y += this.spin.y * delta;
                this.mesh.rotation.z += this.spin.z * delta;
                
                const terrainH = typeof TerrainGen !== 'undefined' ? TerrainGen.getHeight(this.pos.x, this.pos.z) : 0;
                if (this.pos.y <= terrainH + 0.1) {
                    this.pos.y = terrainH + 0.1;
                    this.grounded = true;
                    this.vel.set(0, 0, 0);
                    this.spin.set(0, 0, 0);
                    this.mesh.rotation.set(0.15, Math.random() * Math.PI * 2, 0.08);
                    
                    // Trigger landing dust particles
                    for (let d = 0; d < 8; d++) {
                        if (typeof emitParticle === 'function') {
                            emitParticle(
                                this.pos.x, this.pos.y, this.pos.z,
                                (Math.random() - 0.5) * 1.5, 0.5 + Math.random() * 1.0, (Math.random() - 0.5) * 1.5,
                                0.6, 0.6, 0.6, 12, 0.5 + Math.random() * 0.4
                            );
                        }
                    }
                }
                this.mesh.position.copy(this.pos);
            } else {
                const progress = Math.max(0, 1 - (this.timer - 1.5) / this.fadeDuration);
                if (this.timer > 1.5) {
                    const scale = 0.6 * progress;
                    this.mesh.scale.set(scale, scale, scale);
                    if (progress <= 0.01) {
                        this.removeQueued = true;
                    }
                }
            }
        }

        destroy() {
            this.scene.remove(this.mesh);
            this.mesh.traverse(child => {
                if (child.isMesh) {
                    child.geometry.dispose();
                    if (Array.isArray(child.material)) {
                        child.material.forEach(m => m.dispose());
                    } else if (child.material) {
                        child.material.dispose();
                    }
                }
            });
        }
    }

    class GrabAnimationManager {
        constructor() {
            this.state = 'idle'; // idle, launch, hold, crush, retract
            this.timer = 0;
            this.cooldown = 10.0;
            this.cooldownTimer = 0;
            
            this.targetZombieIdx = -1;
            this.zombieOriginalPos = new THREE.Vector3();
            this.targetWorldPos = new THREE.Vector3();
            this.startWorldPos = new THREE.Vector3();
            
            this.activeDrops = [];
            this.manipulator = null; // Cloned SDFManipulatorArm
            
            // projected grip lasers
            this.gripLinesMesh = null;
            
            // Animation phase durations
            this.durations = {
                launch: 0.6,
                hold: 4.5,
                crush: 0.15,
                retract: 0.7
            };
            
            // Sound effects helper
            this.playSFX = (name) => {
                if (typeof SFX === 'undefined' || !SFX) return;
                try {
                    if (name === 'error' || name === 'confirm') {
                        if (typeof SFX.triggerUI === 'function') SFX.triggerUI();
                    } else if (name === 'ability') {
                        if (typeof SFX.triggerAbility === 'function') SFX.triggerAbility();
                    } else if (name === 'zombieDie') {
                        if (typeof SFX.triggerZombieDie === 'function') SFX.triggerZombieDie();
                    }
                } catch (e) {
                    console.warn("GrabAnimationManager SFX error:", e);
                }
            };
        }

        overrideManipulatorUpdate(armInstance) {
            // Apply glowing transparent point-cloud styling with full chunky dodecahedrons
            const newGeo = new THREE.DodecahedronGeometry(0.015, 0); // chunky, highly visible crystal facets!
            armInstance.instancedMesh.geometry.dispose();
            armInstance.instancedMesh.geometry = newGeo;
            
            const newMat = new THREE.MeshBasicMaterial({
                color: 0x00f0ff,
                transparent: true,
                opacity: 0.85,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });
            armInstance.instancedMesh.material.dispose();
            armInstance.instancedMesh.material = newMat;

            // High-fidelity Inverse Kinematics binder targeting stabilized camera-space targets!
            armInstance.update = function(uTime, delta, isFiring, isADS) {
                const pulse = Math.sin(uTime * 3.5) * 0.06 + 0.94;
                const gripTightness = 1.0; // Fully clamped during hold
                
                const thumbRot = new THREE.Euler(0.1, 0, -0.7 - gripTightness * 0.4);
                const thumbPos = new THREE.Vector3(0.04, 0.22, 0.02);
                
                const indexRot = new THREE.Euler(0.65 + gripTightness * 0.55, 0.08, 0.06);
                const indexPos = new THREE.Vector3(-0.035, 0.24, 0.03);
                
                const middleRot = new THREE.Euler(0.75 + gripTightness * 0.65, -0.08, -0.06);
                const middlePos = new THREE.Vector3(-0.035, 0.24, -0.03);
                
                this._hasValidAnchors = false;
                if (this.customTargets) {
                    this._cachedThumbTarget.copy(this.customTargets[0]); // left rib clamp
                    this._cachedIndexTarget.copy(this.customTargets[1]); // chest center clamp
                    this._cachedMiddleTarget.copy(this.customTargets[2]); // right rib clamp
                    
                    this.worldToLocal(this._cachedThumbTarget);
                    this.worldToLocal(this._cachedIndexTarget);
                    this.worldToLocal(this._cachedMiddleTarget);
                    this._hasValidAnchors = true;
                }

                // Smooth interpolation speed
                const smoothLerp = Math.min(1.0, delta * 30.0);

                for (let i = 0; i < this.INSTANCE_COUNT; i++) {
                    const p = this.particles[i];
                    let targetPos = new THREE.Vector3().copy(p.basePos);
                    
                    if (p.partId === 0) {
                        // Forearm
                        targetPos.x *= pulse;
                        targetPos.z *= pulse;
                    } else if (p.partId >= 2) {
                        const curlAmount = Math.max(0, p.basePos.y - 0.04); 
                        const bend = curlAmount * curlAmount * 6.5; 
                        
                        if (p.partId === 2) {
                            // Thumb
                            targetPos.z += bend * (0.6 + gripTightness * 0.8);
                            targetPos.applyEuler(thumbRot);
                            targetPos.add(thumbPos);
                            if (this._hasValidAnchors) {
                                const tipWeight = THREE.MathUtils.smoothstep(p.basePos.y, 0.04, 0.22);
                                targetPos.lerp(this._cachedThumbTarget, tipWeight * 0.85);
                            }
                        } else if (p.partId === 3) {
                            // Index
                            targetPos.z -= bend * (1.1 + gripTightness * 1.6);
                            targetPos.applyEuler(indexRot);
                            targetPos.add(indexPos);
                            if (this._hasValidAnchors) {
                                const tipWeight = THREE.MathUtils.smoothstep(p.basePos.y, 0.04, 0.22);
                                targetPos.lerp(this._cachedIndexTarget, tipWeight * 0.85);
                            }
                        } else if (p.partId === 4) {
                            // Middle
                            targetPos.z -= bend * (1.1 + gripTightness * 1.6);
                            targetPos.applyEuler(middleRot);
                            targetPos.add(middlePos);
                            if (this._hasValidAnchors) {
                                const tipWeight = THREE.MathUtils.smoothstep(p.basePos.y, 0.04, 0.22);
                                targetPos.lerp(this._cachedMiddleTarget, tipWeight * 0.85);
                            }
                        }
                    }

                    // Subtle organic micro-noise
                    const wobble = Math.sin(uTime * p.speed + p.offset);
                    targetPos.x += wobble * 0.0008;
                    targetPos.y += Math.cos(uTime * p.speed * 1.1 + p.offset) * 0.0008;
                    targetPos.z += Math.sin(uTime * p.speed * 0.9 + p.offset) * 0.0008;

                    this.smoothPositions[i].lerp(targetPos, smoothLerp);
                    this.dummy.position.copy(this.smoothPositions[i]);
                    
                    // Stabilize particle orientations to prevent local node spinning/twisting
                    this.dummy.rotation.set(0, 0, 0);
                    
                    // Increased particle scale to make crystal dodecahedrons fully premium and visible
                    let scale = 1.15 + Math.sin(uTime * 2.5 + p.scaleOffset * Math.PI * 2) * 0.15;
                    this.dummy.scale.set(scale, scale, scale);
                    
                    this.dummy.updateMatrix();
                    this.instancedMesh.setMatrixAt(i, this.dummy.matrix);

                    // Glowing synaptic HSL gradients
                    if (p.partId === 0) {
                        const distFromCenter = Math.sqrt(p.basePos.x * p.basePos.x + p.basePos.z * p.basePos.z);
                        const isVein = distFromCenter < 0.012;
                        if (isVein) {
                            const veinPulse = 0.5 + Math.sin(uTime * 6.0 + p.basePos.y * 15.0) * 0.5;
                            this.colorObj.setHSL(0.52, 0.9, 0.75 + veinPulse * 0.2); // White-hot cyan veins
                        } else {
                            this.colorObj.setHSL(0.54, 0.9, 0.55); // glowing cyan arm casing
                        }
                    } else if (p.partId === 1) {
                        const wRatio = 0.8 + Math.sin(uTime * 5.0) * 0.2;
                        this.colorObj.setHSL(0.52, 0.85, 0.40 + wRatio * 0.15); // joint blue
                    } else {
                        const gRatio = 0.5 + Math.sin(uTime * 4.0 + p.basePos.y * 10) * 0.5;
                        this.colorObj.setHSL(0.48 + gRatio * 0.12, 0.80, 0.35 + gRatio * 0.12); // pulsing fingertips
                    }
                    this.instancedMesh.setColorAt(i, this.colorObj);
                }

                this.instancedMesh.instanceMatrix.needsUpdate = true;
                if (this.instancedMesh.instanceColor) {
                    this.instancedMesh.instanceColor.needsUpdate = true;
                }
            };
        }

        trigger() {
            if (this.state !== 'idle') return;
            if (this.cooldownTimer > 0) {
                if (typeof NeuralConsole !== 'undefined') {
                    NeuralConsole.log(`ERROR: GRAB_INTERFACE_COOLDOWN [${Math.ceil(this.cooldownTimer)}s REMAINING].`, 'sys');
                }
                this.playSFX('error');
                return;
            }

            if (!player) return;

            if (typeof NeuralConsole !== 'undefined') {
                NeuralConsole.log("TACTICAL_APPENDAGE: SEEKING ACTIVE SWARM BIO-SIGNATURES...", "res");
            }

            // Find target zombie
            let targetIdx = -1;
            let activeIndices = [];
            for (let i = 0; i < spawnedZombies; i++) {
                if (zState[i] === 1) {
                    activeIndices.push(i);
                }
            }

            if (activeIndices.length > 0) {
                targetIdx = activeIndices[Math.floor(Math.random() * activeIndices.length)];
            } else if (typeof spawnZombie === 'function') {
                const spawnOffset = new THREE.Vector3(0, 0, 7.5).applyQuaternion(player.quaternion);
                const spawnX = player.position.x + spawnOffset.x;
                const spawnZ = player.position.z + spawnOffset.z;
                spawnZombie(spawnX, spawnZ, 0);
                targetIdx = spawnedZombies - 1;
                if (typeof NeuralConsole !== 'undefined') {
                    NeuralConsole.log("BIO-AURA: SWARM BIO-SIGNATURE SYNTHESIZED.", "res");
                }
            }

            if (targetIdx === -1) {
                if (typeof NeuralConsole !== 'undefined') {
                    NeuralConsole.log("CRITICAL_ERROR: NO_ZOMBIE_CHASSIS_AVOIDABLE.", "sys");
                }
                this.playSFX('error');
                return;
            }

            this.targetZombieIdx = targetIdx;
            zState[targetIdx] = 3;
            this.cooldownTimer = this.cooldown;
            
            const zh = typeof TerrainGen !== 'undefined' ? TerrainGen.getHeight(zPosX[targetIdx], zPosZ[targetIdx]) : 0;
            this.zombieOriginalPos.set(zPosX[targetIdx], zh + 1.2, zPosZ[targetIdx]);
            this.targetWorldPos.copy(this.zombieOriginalPos);
            
            if (isFPSMode && typeof cameraFPS !== 'undefined') {
                const camOffset = new THREE.Vector3(0.4, -1.1, -0.6).applyQuaternion(cameraFPS.quaternion);
                this.startWorldPos.copy(cameraFPS.position).add(camOffset);
            } else {
                this.startWorldPos.copy(player.position).add(new THREE.Vector3(0, 1.2, 0));
            }
            
            this.playSFX('ability');
            this.playSFX('confirm');
            
            if (typeof NeuralConsole !== 'undefined') {
                NeuralConsole.log(`TARGET_LOCKED: SUB-DERMAL GRIP ENGAGED [INDEX_${targetIdx}]. PROJECTING CLAW...`, "res");
            }

            this.togglePlayerWeapons(false);
            this.spawnFallingWeapons();

            // Instantiate SDFManipulatorArm clone
            if (typeof SDFManipulatorArm !== 'undefined') {
                this.manipulator = new SDFManipulatorArm();
                this.overrideManipulatorUpdate(this.manipulator);
                this.manipulator.position.copy(this.startWorldPos);
                this.manipulator.lookAt(this.targetWorldPos);
                this.manipulator.rotateX(-Math.PI / 2);
                this.manipulator.scale.set(0.01, 0.01, 0.01);
                scene.add(this.manipulator);
            }

            // Create 3-finger synaptic laser segments
            const lineMaterial = new THREE.LineBasicMaterial({
                color: 0x00f0ff,
                transparent: true,
                opacity: 0.8,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });
            const lineGeometry = new THREE.BufferGeometry();
            const linePositions = new Float32Array(3 * 2 * 3); // 3 high-intensity choke lasers
            lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
            this.gripLinesMesh = new THREE.LineSegments(lineGeometry, lineMaterial);
            this.gripLinesMesh.frustumCulled = false;
            this.gripLinesMesh.visible = false;
            scene.add(this.gripLinesMesh);

            this.state = 'launch';
            this.timer = 0;
            this.screamPlayed = false;
        }

        spawnFallingWeapons() {
            const activeWeapon = inventory[currentWeaponIdx];
            if (!activeWeapon) return;

            let startPos = player.position.clone().add(new THREE.Vector3(0, 1.3, 0));
            let startRot = player.quaternion.clone();

            if (isFPSMode && typeof cameraFPS !== 'undefined') {
                startPos.copy(cameraFPS.position).add(new THREE.Vector3(0, -0.4, -0.4).applyQuaternion(cameraFPS.quaternion));
                startRot.copy(cameraFPS.quaternion);
                
                const drop = new PhysicalWeaponDrop(scene, activeWeapon.id, startPos, startRot, false);
                this.activeDrops.push(drop);
            } else {
                let lHandPos = new THREE.Vector3();
                let rHandPos = new THREE.Vector3();
                
                if (player.leftArm && player.leftArm.hand) player.leftArm.hand.getWorldPosition(lHandPos);
                else lHandPos.copy(player.position).add(new THREE.Vector3(-0.4, 1.2, 0));
                
                if (player.rightArm && player.rightArm.hand) player.rightArm.hand.getWorldPosition(rHandPos);
                else rHandPos.copy(player.position).add(new THREE.Vector3(0.4, 1.2, 0));

                const dropL = new PhysicalWeaponDrop(scene, activeWeapon.id, lHandPos, player.rotation, true);
                const dropR = new PhysicalWeaponDrop(scene, activeWeapon.id, rHandPos, player.rotation, false);
                this.activeDrops.push(dropL, dropR);
            }
        }

        togglePlayerWeapons(visible) {
            if (player) {
                if (player.leftWeaponMesh) player.leftWeaponMesh.visible = visible;
                if (player.rightWeaponMesh) player.rightWeaponMesh.visible = visible;
            }
            if (typeof fpsViewmodel !== 'undefined' && fpsViewmodel) {
                if (fpsViewmodel.weaponMesh) fpsViewmodel.weaponMesh.visible = visible;
                if (fpsViewmodel.manipulator) fpsViewmodel.manipulator.visible = visible;
            }
        }

        update(delta) {
            const uTime = typeof clock !== 'undefined' ? clock.getElapsedTime() : Date.now() * 0.001;

            if (this.cooldownTimer > 0) {
                this.cooldownTimer = Math.max(0, this.cooldownTimer - delta);
            }

            for (let i = this.activeDrops.length - 1; i >= 0; i--) {
                const drop = this.activeDrops[i];
                drop.update(delta);
                if (drop.removeQueued) {
                    drop.destroy();
                    this.activeDrops.splice(i, 1);
                }
            }

            if (this.state === 'idle') return;

            this.timer += delta;

            switch(this.state) {
                case 'launch':
                    this.updateLaunch(delta, uTime);
                    break;
                case 'hold':
                    this.updateHold(delta, uTime);
                    break;
                case 'crush':
                    this.updateCrush(delta, uTime);
                    break;
                case 'retract':
                    this.updateRetract(delta, uTime);
                    break;
            }
            
            this.syncGrabbedZombiePos();
        }

        updateLaunch(delta, uTime) {
            const duration = this.durations.launch;
            let t = this.timer / duration;
            if (t > 1.0) t = 1.0;
            
            const easeT = 1 - Math.pow(1 - t, 3);
            
            if (isFPSMode && typeof cameraFPS !== 'undefined') {
                const camOffset = new THREE.Vector3(0.4, -1.1, -0.6).applyQuaternion(cameraFPS.quaternion);
                this.startWorldPos.copy(cameraFPS.position).add(camOffset);
            } else {
                this.startWorldPos.copy(player.position).add(new THREE.Vector3(0, 1.2, 0));
            }
            
            // Offset launch destination exactly -0.36 units backwards along look direction
            const lookDir = new THREE.Vector3();
            if (isFPSMode && typeof cameraFPS !== 'undefined') {
                lookDir.set(0, 0, -1).applyQuaternion(cameraFPS.quaternion).normalize();
            } else {
                lookDir.subVectors(this.targetWorldPos, player.position).normalize();
                lookDir.y = 0;
                lookDir.normalize();
            }
            const targetOffsetPos = this.targetWorldPos.clone().addScaledVector(lookDir, -0.36);

            if (this.manipulator) {
                this.manipulator.position.lerpVectors(this.startWorldPos, targetOffsetPos, easeT);
                this.manipulator.lookAt(this.targetWorldPos);
                this.manipulator.rotateX(-Math.PI / 2);
                
                const launchScale = easeT * (isFPSMode ? 0.85 : 1.4);
                this.manipulator.scale.set(launchScale, launchScale, launchScale);
                
                this.manipulator.update(uTime, delta, false, false);
            }

            if (t >= 1.0) {
                this.state = 'hold';
                this.timer = 0;
                if (typeof NeuralConsole !== 'undefined') {
                    NeuralConsole.log("BIOMASS_INTERFACE: GRABBED! SECURING TARGET...", "res");
                }
            }
        }

        updateHold(delta, uTime) {
            const duration = this.durations.hold;
            let t = this.timer / duration;
            if (t > 1.0) t = 1.0;
            
            const dragDuration = 1.2;
            const dragTimer = this.timer;
            
            let targetHoldPos = new THREE.Vector3();
            if (isFPSMode && typeof cameraFPS !== 'undefined') {
                const frontOffset = new THREE.Vector3(0.0, -1.1, -8.0).applyQuaternion(cameraFPS.quaternion);
                targetHoldPos.copy(cameraFPS.position).add(frontOffset);
            } else {
                const holdOffset = new THREE.Vector3(0, 1.2, 2.0).applyQuaternion(player.quaternion);
                targetHoldPos.copy(player.position).add(holdOffset);
            }
            
            let handPos = new THREE.Vector3();
            if (dragTimer < dragDuration) {
                const dragT = dragTimer / dragDuration;
                const easeDrag = 1 - Math.pow(1 - dragT, 2);
                handPos.lerpVectors(this.zombieOriginalPos, targetHoldPos, easeDrag);
            } else {
                handPos.copy(targetHoldPos);
            }
            
            // Struggle wiggles removed! Zombie and hand held 100% rigid and stable.
            const holdScale = isFPSMode ? 0.85 : 1.4;

            // Rigged Offset: Position the hand -0.36 units backwards along the view vector so that the
            // natural fingertip length rests perfectly on the rib/chest targets without stretching!
            if (this.manipulator) {
                const lookDir = new THREE.Vector3();
                if (isFPSMode && typeof cameraFPS !== 'undefined') {
                    lookDir.set(0, 0, -1).applyQuaternion(cameraFPS.quaternion).normalize();
                } else {
                    lookDir.subVectors(handPos, player.position).normalize();
                    lookDir.y = 0;
                    lookDir.normalize();
                }
                const manipPos = handPos.clone().addScaledVector(lookDir, -0.36);
                this.manipulator.position.copy(manipPos);
                
                // Align facing forward
                if (isFPSMode && typeof cameraFPS !== 'undefined') {
                    const targetFace = new THREE.Vector3().copy(cameraFPS.position).add(new THREE.Vector3(0, 0, -10).applyQuaternion(cameraFPS.quaternion));
                    this.manipulator.lookAt(targetFace);
                } else {
                    const targetFace = new THREE.Vector3().copy(player.position).add(new THREE.Vector3(0, 0, 10).applyQuaternion(player.quaternion));
                    this.manipulator.lookAt(targetFace);
                }
                this.manipulator.rotateX(-Math.PI / 2);
                this.manipulator.scale.set(holdScale, holdScale, holdScale);
            }
            
            // Update zombie coordinates
            const zi = this.targetZombieIdx;
            if (zState[zi] === 3) {
                zPosX[zi] = handPos.x;
                zPosZ[zi] = handPos.z;
            }

            // Zombie Y relative to hand offset is -1.6 (lifts legs high, keeps torso aligned)
            const zombieOriginY = handPos.y - 1.6;

            // Chest/Torso targets centered around local Y height 1.30 to 1.75
            const localOffsets = [
                new THREE.Vector3(-0.12, 1.30, 0.0), // thumb target (left rib cage clamp)
                new THREE.Vector3(0.0, 1.75, 0.0),   // index target (chest center clamp)
                new THREE.Vector3(0.12, 1.30, 0.0)   // middle target (right rib cage clamp)
            ];

            const targetType = zType[zi];
            const zScale = targetType === 3 ? 1.35 : 1.0;

            // Stable Camera-Space projection to keep fingers locked, removing all zombie world rotation spin
            const camRight = new THREE.Vector3();
            const camUp = new THREE.Vector3();
            if (isFPSMode && typeof cameraFPS !== 'undefined') {
                camRight.set(1, 0, 0).applyQuaternion(cameraFPS.quaternion).normalize();
                camUp.set(0, 1, 0).applyQuaternion(cameraFPS.quaternion).normalize();
            } else {
                camRight.set(1, 0, 0).applyQuaternion(player.quaternion).normalize();
                camUp.set(0, 1, 0);
            }

            const worldControlPoints = localOffsets.map(local => {
                const wPoint = handPos.clone();
                // Vertical relative offset from hand center (local.y relative to hand Y-center 1.6)
                const relativeY = (local.y - 1.6) * zScale;
                const relativeX = local.x * zScale;
                
                // Completely solid and stable finger targets
                wPoint.addScaledVector(camRight, relativeX);
                wPoint.addScaledVector(camUp, relativeY);
                return wPoint;
            });

            // Update manipulator fingertips using its own local IK anchors!
            if (this.manipulator) {
                this.manipulator.customTargets = worldControlPoints;
                this.manipulator.update(uTime, delta, false, false);
            }

            // Retrieve the physical fingertip locations (Thumb, Index, Middle) to draw lasers
            const worldFingerTips = [];
            if (this.manipulator) {
                const quat = new THREE.Quaternion();
                this.manipulator.getWorldQuaternion(quat);
                
                // Track three fingers of the SDF manipulator arm
                const fingerDefs = [
                    { base: new THREE.Vector3(0.04, 0.22, 0.02), dir: new THREE.Vector3(0, 1, 0), len: 0.18 },  // thumb (part 2)
                    { base: new THREE.Vector3(-0.035, 0.24, 0.03), dir: new THREE.Vector3(0, 1, 0), len: 0.22 }, // index (part 3)
                    { base: new THREE.Vector3(-0.035, 0.24, -0.03), dir: new THREE.Vector3(0, 1, 0), len: 0.22 } // middle (part 4)
                ];

                const manipPos = this.manipulator.position;
                fingerDefs.forEach(fDef => {
                    const tipLocal = fDef.base.clone().addScaledVector(fDef.dir, fDef.len);
                    worldFingerTips.push(tipLocal.multiplyScalar(holdScale).applyQuaternion(quat).add(manipPos));
                });
            }

            // Update 3 Laser line positions
            if (this.gripLinesMesh && worldFingerTips.length >= 3) {
                const posAttr = this.gripLinesMesh.geometry.attributes.position;
                const arr = posAttr.array;
                for (let i = 0; i < 3; i++) {
                    const tip = worldFingerTips[i];
                    const ctrl = worldControlPoints[i];
                    
                    arr[i*6] = tip.x;
                    arr[i*6+1] = tip.y;
                    arr[i*6+2] = tip.z;
                    
                    arr[i*6+3] = ctrl.x;
                    arr[i*6+4] = ctrl.y;
                    arr[i*6+5] = ctrl.z;
                }
                posAttr.needsUpdate = true;
                this.gripLinesMesh.visible = true;
            }

            // Trigger synthesized throat-screech scream exactly when squeeze begins at 1.5s
            if (this.timer > 1.5 && !this.screamPlayed) {
                this.screamPlayed = true;
                if (window.SFX && typeof window.SFX.triggerScream === 'function') {
                    window.SFX.triggerScream(3.0); // 3.0 seconds duration, perfectly matching the squeeze phase!
                }
            }

            // --- PHYSICAL BALLISTIC FLUID BLOOD JET SYSTEM ---
            // Spray small, distinct, high-pressure blood droplets arcing under gravity (no haze!)
            // Only spray blood once the squeeze actually begins after 1.5s!
            if (this.timer > 1.5 && Math.random() < 0.85) {
                const numDrops = 2 + Math.floor(Math.random() * 3);
                for (let d = 0; d < numDrops; d++) {
                    const pIdx = Math.floor(Math.random() * 3);
                    const bleedPos = worldControlPoints[pIdx];
                    if (bleedPos && typeof emitParticle === 'function') {
                        // High-velocity jetting forward away from player
                        const sprayDir = new THREE.Vector3();
                        if (isFPSMode && typeof cameraFPS !== 'undefined') {
                            sprayDir.set(0, 0, -1).applyQuaternion(cameraFPS.quaternion).normalize();
                        } else {
                            sprayDir.subVectors(bleedPos, player.position).normalize();
                        }
                        
                        // Add wide lateral splashing spray angle
                        const lateralAngle = Math.random() * Math.PI * 2;
                        const lateralSpeed = 1.5 + Math.random() * 2.8;
                        const vx = sprayDir.x * 2.2 + Math.cos(lateralAngle) * lateralSpeed;
                        const vy = sprayDir.y * 1.5 + 3.0 + Math.random() * 3.5; // strong upward jet
                        const vz = sprayDir.z * 2.2 + Math.sin(lateralAngle) * lateralSpeed;
                        
                        // vivid physical crimson blood
                        const r = 0.82 + Math.random() * 0.18;
                        const g = 0.01;
                        const b = 0.02;
                        
                        const pSize = 4 + Math.floor(Math.random() * 4); // discrete droplet sizes
                        const life = 0.8 + Math.random() * 0.8;
                        
                        emitParticle(
                            bleedPos.x, bleedPos.y, bleedPos.z,
                            vx, vy, vz,
                            r, g, b,
                            pSize, life
                        );
                    }
                }
            }

            if (t >= 1.0) {
                this.state = 'crush';
                this.timer = 0;
            }
        }

        updateCrush(delta, uTime) {
            const zi = this.targetZombieIdx;
            
            if (zState[zi] === 3) {
                if (typeof NeuralConsole !== 'undefined') {
                    NeuralConsole.log("BIOMASS_INTERFACE: TARGET CORE CRUSHED. ABSORBING.", "res");
                }
                
                zHP[zi] = 0;
                zState[zi] = 0;
                
                if (typeof activeZombies !== 'undefined') activeZombies--;
                totalKills++;
                
                if (window.PyramidManager) {
                    window.PyramidManager.registerKill(zPosX[zi], 1.2, zPosZ[zi]);
                }
                
                if (window.goreSystem) {
                    const zTypeLabel = zType[zi] === 0 ? 'normal' : (zType[zi] === 1 ? 'puker' : (zType[zi] === 2 ? 'thrower' : 'mutant'));
                    window.goreSystem.spawnGoreGribs(zPosX[zi], 1.2, zPosZ[zi], zTypeLabel);
                }
                
                this.playSFX('zombieDie');
                
                const expPos = this.manipulator ? this.manipulator.position.clone() : player.position;
                for (let k = 0; k < 60; k++) {
                    if (typeof emitParticle === 'function') {
                        // High-velocity, gravity-affected visceral red blood splatters
                        const vx = (Math.random() - 0.5) * 8.0;
                        const vy = (Math.random() - 0.5) * 5.0 + 4.5;
                        const vz = (Math.random() - 0.5) * 8.0;
                        const r = 0.82 + Math.random() * 0.18;
                        const g = 0.01;
                        const b = 0.02;
                        const pSize = 7 + Math.floor(Math.random() * 8);
                        
                        emitParticle(
                            expPos.x, expPos.y, expPos.z,
                            vx, vy, vz,
                            r, g, b,
                            pSize, 0.8 + Math.random() * 0.8
                        );
                    }
                }
            }
            
            if (this.gripLinesMesh) this.gripLinesMesh.visible = false;
            this.state = 'retract';
            this.timer = 0;
        }

        updateRetract(delta, uTime) {
            const duration = this.durations.retract;
            let t = this.timer / duration;
            if (t > 1.0) t = 1.0;
            
            const easeT = Math.pow(t, 2);
            
            if (isFPSMode && typeof cameraFPS !== 'undefined') {
                const camOffset = new THREE.Vector3(0.4, -1.1, -0.6).applyQuaternion(cameraFPS.quaternion);
                this.startWorldPos.copy(cameraFPS.position).add(camOffset);
            } else {
                this.startWorldPos.copy(player.position).add(new THREE.Vector3(0, 1.2, 0));
            }
            
            let holdFrontPos = new THREE.Vector3();
            if (isFPSMode && typeof cameraFPS !== 'undefined') {
                const frontOffset = new THREE.Vector3(0.0, -1.1, -8.0).applyQuaternion(cameraFPS.quaternion);
                holdFrontPos.copy(cameraFPS.position).add(frontOffset);
            } else {
                const holdOffset = new THREE.Vector3(0, 1.2, 2.0).applyQuaternion(player.quaternion);
                holdFrontPos.copy(player.position).add(holdOffset);
            }
            
            const lookDir = new THREE.Vector3();
            if (isFPSMode && typeof cameraFPS !== 'undefined') {
                lookDir.set(0, 0, -1).applyQuaternion(cameraFPS.quaternion).normalize();
            } else {
                lookDir.subVectors(holdFrontPos, player.position).normalize();
                lookDir.y = 0;
                lookDir.normalize();
            }
            const holdOffsetPos = holdFrontPos.clone().addScaledVector(lookDir, -0.36);

            if (this.manipulator) {
                this.manipulator.position.lerpVectors(holdOffsetPos, this.startWorldPos, easeT);
                this.manipulator.lookAt(this.startWorldPos);
                this.manipulator.rotateX(-Math.PI / 2);
                
                const baseScale = isFPSMode ? 0.85 : 1.4;
                const scale = (1 - easeT) * baseScale;
                this.manipulator.scale.set(scale, scale, scale);
                
                this.manipulator.update(uTime, delta, false, false);
            }

            if (t >= 1.0) {
                if (this.manipulator) {
                    scene.remove(this.manipulator);
                    this.manipulator.traverse(child => {
                        if (child.isMesh) {
                            child.geometry.dispose();
                            child.material.dispose();
                        }
                    });
                    this.manipulator = null;
                }
                
                if (this.gripLinesMesh) {
                    scene.remove(this.gripLinesMesh);
                    this.gripLinesMesh.geometry.dispose();
                    this.gripLinesMesh.material.dispose();
                    this.gripLinesMesh = null;
                }

                this.togglePlayerWeapons(true);
                
                playerHealth = Math.min(playerHealth + 40, (window.CONFIG && window.CONFIG.playerHealth) || 200);
                if (player) player.health = playerHealth;
                
                if (typeof NeuralConsole !== 'undefined') {
                    NeuralConsole.log("BIOMASS_SYNAPSE_ABSORBED: CORE_SYSTEM_REPAIRED [+40 HP].", "res");
                }
                
                this.playSFX('confirm');
                
                this.state = 'idle';
            }
        }

        syncGrabbedZombiePos() {
            if (this.state === 'idle' || this.targetZombieIdx === -1) return;
            
            const zi = this.targetZombieIdx;
            const handPos = this.manipulator ? this.manipulator.position : this.targetWorldPos;
            
            // 1. Force position coordinates to match hand in global array
            zPosX[zi] = handPos.x;
            zPosZ[zi] = handPos.z;
            
            // Mathematically offset zombie downwards by exactly 1.6 units to pull feet high above terrain map floor
            const targetY = handPos.y - 1.6; 
            
            // 2. Find packed index in InstancedMesh arrays (sync perfectly with translator worker)
            const targetType = zType[zi];
            let packedIdx = 0;
            for (let j = 0; j < zi; j++) {
                if (zState[j] !== 0 && zType[j] === targetType) {
                    packedIdx++;
                }
            }
            
            // Get correct mesh
            let instMesh = null;
            if (targetType === 0) instMesh = zombieMeshes.normal;
            else if (targetType === 1) instMesh = zombieMeshes.puker;
            else if (targetType === 2) instMesh = zombieMeshes.thrower;
            else if (targetType === 3) instMesh = zombieMeshes.mutant;
            
            if (instMesh && instMesh.instanceMatrix) {
                const array = instMesh.instanceMatrix.array;
                const offset = packedIdx * 16;
                if (offset + 15 < array.length) {
                    // Update translation components
                    array[offset + 12] = handPos.x;
                    array[offset + 13] = targetY; // Position chest/torso in hand palm!
                    array[offset + 14] = handPos.z;
                    
                    const cosY = Math.cos(zRotY[zi]);
                    const sinY = Math.sin(zRotY[zi]);
                    const zScale = targetType === 3 ? 1.35 : 1.0;
                    
                    // Visceral squeeze compression animatory sequence (squeezes X/Z by up to 55%)
                    let squeeze = 1.0;
                    let stretchY = 1.0;
                    if (this.state === 'hold') {
                        if (this.timer > 1.5) {
                            // Delay squeeze until after drag completes! Squeezes over the remaining 3.0s
                            const squeezeProgress = Math.min(1.0, (this.timer - 1.5) / 3.0);
                            squeeze = 1.0 - squeezeProgress * 0.55;
                            // Struggles and stretches vertically once squeezed
                            stretchY = (1.0 + Math.sin((this.timer - 1.5) * 40.0) * 0.05 * squeezeProgress) * zScale;
                        } else {
                            squeeze = 1.0;
                            stretchY = zScale;
                        }
                    } else if (this.state === 'crush') {
                        squeeze = 0.3;
                        stretchY = 1.4 * zScale;
                    } else {
                        squeeze = 1.0;
                        stretchY = zScale;
                    }
                    
                    const scaleX = cosY * squeeze * zScale;
                    const scaleZ = cosY * squeeze * zScale;
                    
                    // Zombie held 100% still and rigid relative to the hand position (no struggle wiggles)
                    // Apply deformation and translation matrix directly to the InstancedMesh
                    array[offset] = scaleX;
                    array[offset + 1] = 0;
                    array[offset + 2] = -sinY * squeeze * zScale;
                    
                    array[offset + 4] = 0;
                    array[offset + 5] = stretchY;
                    array[offset + 6] = 0;
                    
                    array[offset + 8] = sinY * squeeze * zScale;
                    array[offset + 9] = 0;
                    array[offset + 10] = scaleZ;
                    
                    instMesh.instanceMatrix.needsUpdate = true;
                }
            }
        }
    }

    // Expose globally
    window.GrabAnimationManager = new GrabAnimationManager();

    // Hook '0'
    window.addEventListener('keydown', (e) => {
        if (e.key === '0') {
            if (typeof isPaused !== 'undefined' && isPaused) return;
            if (window.escapismCutscene) return;
            window.GrabAnimationManager.trigger();
        }
    });

    console.log("TACTICAL_APPENDAGE: Modular Grab SDF Manipulator Arm System Sync Complete.");
})();
