// ObjectiveTutorial.js - Level 0: Calibrate Cognitive Link
class ObjectiveTutorial {
    constructor(scene, player, camera, onComplete) {
        this.scene = scene;
        this.player = player;
        this.camera = camera;
        this.onComplete = onComplete;
        this.active = true;
        
        // Calibration Phases:
        // 1: Locomotion Synchronization (Move to coordinates)
        // 2: Weapons Calibrations (Destroy holographic crate)
        // 3: Threat Neutralization (Destroy designated zombie shambler)
        this.phase = 1;
        this.phaseTimer = 0;

        // Phase 1: Beacon
        this.beaconMesh = null;
        this.beaconPos = new THREE.Vector3(10, 1, 10);

        // Phase 2: Crate
        this.crateObj = null;
        this.cratePos = new THREE.Vector3(15, 1, -12);

        // Phase 3: Zombie
        this.targetZombieIdx = -1;

        this.marker = null;

        this.init();
    }

    init() {
        if (window.NeuralConsole) {
            window.NeuralConsole.clear();
            window.NeuralConsole.log("SYSTEMS ONLINE. COGNITIVE LINK: CALIBRATION PROCESS INITIATED...", 'sys');
            window.NeuralConsole.log("TUTORIAL PHASE 1: STAND IN LOCOMOTION SYNC ZONE.", 'res');
        }

        // Setup Phase 1: Spawn visual beacon ring
        this.createBeacon();
        this.marker = this.createMarker("LOCOMOTION BEACON", '#00e5ff');
    }

    createBeacon() {
        this.beaconMesh = new THREE.Group();
        this.beaconMesh.position.copy(this.beaconPos);

        // Rotating cylinder/ring
        const ringGeo = new THREE.TorusGeometry(1.5, 0.15, 8, 24);
        const ringMat = new THREE.MeshBasicMaterial({ 
            color: 0x00e5ff, 
            transparent: true, 
            opacity: 0.8,
            blending: THREE.AdditiveBlending 
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2;
        this.beaconMesh.add(ring);

        // Light beam
        const beamGeo = new THREE.CylinderGeometry(0.5, 0.5, 15, 16, 1, true);
        beamGeo.translate(0, 7.5, 0);
        const beamMat = new THREE.MeshBasicMaterial({
            color: 0x00e5ff,
            transparent: true,
            opacity: 0.25,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide,
            depthWrite: false
        });
        const beam = new THREE.Mesh(beamGeo, beamMat);
        this.beaconMesh.add(beam);

        // Point Light
        const light = new THREE.PointLight(0x00e5ff, 3, 10);
        this.beaconMesh.add(light);

        this.scene.add(this.beaconMesh);
    }

    createCrate() {
        const group = new THREE.Group();
        group.position.copy(this.cratePos);

        const boxGeo = new THREE.BoxGeometry(1.5, 1.5, 1.5);
        const boxMat = new THREE.MeshStandardMaterial({
            color: 0xffaa00,
            emissive: 0xffaa00,
            emissiveIntensity: 0.8,
            metalness: 0.9,
            roughness: 0.1
        });
        const box = new THREE.Mesh(boxGeo, boxMat);
        group.add(box);

        const light = new THREE.PointLight(0xffaa00, 3, 8);
        group.add(light);

        this.scene.add(group);

        this.crateObj = {
            mesh: group,
            velocity: new THREE.Vector3(),
            isHeld: false,
            health: 30, // Easy to destroy
            type: 'crate'
        };
        if (!window.physicsCrates) window.physicsCrates = [];
        window.physicsCrates.push(this.crateObj);
    }

    createMarker(name, colorHex) {
        const div = document.createElement('div');
        div.className = 'obj-marker';
        div.style.position = 'absolute';
        div.style.pointerEvents = 'none';
        div.style.transform = 'translate(-50%, -50%)';
        div.style.color = colorHex;
        div.style.fontFamily = 'monospace';
        div.style.fontSize = '14px';
        div.style.display = 'flex';
        div.style.flexDirection = 'column';
        div.style.alignItems = 'center';
        div.style.textShadow = `0 0 8px ${colorHex}`;
        div.style.zIndex = '9999';

        div.innerHTML = `
            <div class="marker-arrow" style="font-size: 26px; margin-bottom: 2px; display: none; text-shadow: 0 0 10px ${colorHex}; transition: transform 0.1s ease;">➤</div>
            <div class="marker-panel" style="display: flex; flex-direction: column; align-items: center; transition: all 0.2s ease;">
                <div style="font-size: 28px; margin-bottom: 2px; animation: heartbeat 1s infinite alternate;">▼</div>
                <div style="background: rgba(0, 10, 15, 0.95); padding: 8px 16px; border: 2px solid ${colorHex}; border-radius: 4px; letter-spacing: 1px; font-weight: bold; white-space: nowrap; box-shadow: 0 0 12px ${colorHex}, inset 0 0 8px rgba(0, 229, 255, 0.2);">
                    <span style="opacity: 0.7; font-size: 10px; display: block; margin-bottom: 3px; color: ${colorHex}; letter-spacing: 2px;">TUTORIAL SYSTEM</span>
                    ${name.toUpperCase()}
                </div>
            </div>
            <div class="marker-dist" style="font-size: 11px; margin-top: 4px; font-weight: bold; color: #fff; text-shadow: 0 0 5px ${colorHex};">0m</div>
            <style>
                @keyframes heartbeat {
                    from { transform: scale(1); filter: brightness(1); }
                    to { transform: scale(1.15); filter: brightness(1.4); }
                }
            </style>
        `;
        document.body.appendChild(div);
        return div;
    }

    getHUDData() {
        if (this.phase === 1) {
            return {
                name: "COGNITIVE LINK: LOCOMOTION SYNC",
                count: "WALK TO SYNC COORDINATES",
                progress: 0.1
            };
        } else if (this.phase === 2) {
            return {
                name: "COGNITIVE LINK: WEAPONS GRID",
                count: "DESTROY CALIBRATION TARGET",
                progress: 0.5
            };
        } else {
            return {
                name: "COGNITIVE LINK: COMBAT READINESS",
                count: "ELIMINATE THE DESIGNATED VECTOR",
                progress: 0.8
            };
        }
    }

    update(delta, elapsedTime, activeCamera) {
        if (!this.active) return;
        const camera = activeCamera || this.camera;

        let targetPos = null;
        let nameStr = "TARGET";
        let colorHex = "#00e5ff";

        if (this.phase === 1) {
            // Locomotion Phase: check proximity to beaconPos
            targetPos = this.beaconPos;
            nameStr = "LOCOMOTION BEACON";
            colorHex = "#00e5ff";

            if (this.beaconMesh) {
                this.beaconMesh.children[0].rotation.z += delta * 1.5;
            }

            const dist = this.player.position.distanceTo(this.beaconPos);
            if (dist < 3.0) {
                // Transition to Phase 2
                this.phase = 2;
                if (this.beaconMesh) {
                    this.scene.remove(this.beaconMesh);
                    this.beaconMesh = null;
                }
                if (this.marker) {
                    this.marker.remove();
                }
                
                this.createCrate();
                this.marker = this.createMarker("WEAPONS TARGET", "#ffaa00");

                if (window.NeuralConsole) {
                    window.NeuralConsole.log("LOCOMOTION SYNCHRONIZED. LINK CALIBRATION 35% SECURED.", 'sys');
                    window.NeuralConsole.log("TUTORIAL PHASE 2: DETECTING HOLOGRAPHIC TARGET CONTAINER. FIRE SHOTGUN/PISTOL TO BREAK.", 'res');
                }
                if (window.SFX && typeof window.SFX.triggerUIConfirm === 'function') {
                    window.SFX.triggerUIConfirm();
                }
                return;
            }
        } 
        else if (this.phase === 2) {
            // Weapons Phase: check if crate is destroyed
            targetPos = this.cratePos;
            nameStr = "WEAPONS TARGET";
            colorHex = "#ffaa00";

            // If crateObj is no longer in physicsCrates list or has <= 0 health
            const isBroken = this.crateObj.health <= 0 || !window.physicsCrates.includes(this.crateObj);
            if (isBroken) {
                this.phase = 3;
                if (this.marker) {
                    this.marker.remove();
                }

                // Initialize Shambler spawn via campaignTutorial
                if (window.campaignTutorial) {
                    window.campaignTutorial.state = 1; // trigger zombie spawn
                    window.campaignTutorial.timer = 0;
                } else {
                    // Fallback zombie spawn if campaignTutorial doesn't exist
                    if (window.spawnZombie) {
                        window.spawnZombie(this.player.position.x + 12, this.player.position.z + 12, 0);
                    }
                }

                this.marker = this.createMarker("THREAT VECTOR", "#ff1100");

                if (window.NeuralConsole) {
                    window.NeuralConsole.log("WEAPONS GRID STABILIZED. LINK CALIBRATION 65% SECURED.", 'sys');
                    window.NeuralConsole.log("TUTORIAL PHASE 3: BIOMECHANICAL SHAMBLER INFESTATION DETECTED nearby. TARGET ELIMINATION REQUIRED.", 'err');
                }
                if (window.SFX && typeof window.SFX.triggerUIConfirm === 'function') {
                    window.SFX.triggerUIConfirm();
                }
                return;
            }
        } 
        else if (this.phase === 3) {
            // Zombie Phase: Find shambler
            colorHex = "#ff1100";
            nameStr = "THREAT VECTOR";
            
            let found = false;
            const spawnedZombies = (window.getSpawnedZombies ? window.getSpawnedZombies() : 0);
            const zState = window.zState;
            const zPosX = window.zPosX;
            const zPosZ = window.zPosZ;

            for (let i = 0; i < spawnedZombies; i++) {
                if (zState && zState[i] !== 0) {
                    this.targetZombieIdx = i;
                    found = true;
                    break;
                }
            }

            if (found && this.targetZombieIdx !== -1 && zPosX && zPosZ) {
                const zH = window.TerrainGen ? window.TerrainGen.getHeight(zPosX[this.targetZombieIdx], zPosZ[this.targetZombieIdx]) : 1.0;
                targetPos = new THREE.Vector3(zPosX[this.targetZombieIdx], zH + 2.2, zPosZ[this.targetZombieIdx]);
            } else {
                // Shambler killed! Complete.
                this.complete();
                return;
            }
        }

        if (targetPos) {
            const dist = this.player.position.distanceTo(targetPos);

            // Screen-edge clamping and pointer rotation math
            const camPos = targetPos.clone().applyMatrix4(camera.matrixWorldInverse);
            const isBehind = camPos.z > 0;
            
            let vec = targetPos.clone().project(camera);
            if (isBehind) {
                vec.x = -vec.x;
                vec.y = -vec.y;
            }
            
            const borderMargin = 0.08;
            const limitX = 1.0 - borderMargin;
            const limitY = 1.0 - borderMargin;
            
            const isOffscreen = isBehind || vec.x < -limitX || vec.x > limitX || vec.y < -limitY || vec.y > limitY;
            
            let x = 0;
            let y = 0;
            let arrowAngle = 0;
            
            if (isOffscreen) {
                const scaleX = Math.abs(limitX / (vec.x || 0.0001));
                const scaleY = Math.abs(limitY / (vec.y || 0.0001));
                const scale = Math.min(scaleX, scaleY);
                
                const clampedX = vec.x * scale;
                const clampedY = vec.y * scale;
                
                x = (clampedX * 0.5 + 0.5) * window.innerWidth;
                y = (-clampedY * 0.5 + 0.5) * window.innerHeight;
                arrowAngle = Math.atan2(-clampedY, clampedX);
            } else {
                x = (vec.x * 0.5 + 0.5) * window.innerWidth;
                y = (-vec.y * 0.5 + 0.5) * window.innerHeight;
            }
            
            this.marker.style.display = 'flex';
            this.marker.style.left = `${x}px`;
            this.marker.style.top = `${y}px`;
            this.marker.querySelector('.marker-dist').textContent = `${Math.round(dist)}m`;
            
            const arrow = this.marker.querySelector('.marker-arrow');
            const panel = this.marker.querySelector('.marker-panel');
            
            if (isOffscreen) {
                if (arrow) {
                    arrow.style.display = 'block';
                    arrow.style.transform = `rotate(${arrowAngle}rad)`;
                }
                if (panel) {
                    panel.style.transform = 'scale(0.8)';
                    panel.style.opacity = '0.8';
                }
            } else {
                if (arrow) {
                    arrow.style.display = 'none';
                }
                if (panel) {
                    panel.style.transform = 'none';
                    panel.style.opacity = '1';
                }
            }
        } else {
            this.marker.style.display = 'none';
        }
    }

    complete() {
        this.active = false;
        if (this.marker) {
            this.marker.remove();
            this.marker = null;
        }

        if (window.NeuralConsole) {
            window.NeuralConsole.log("LINK CALIBRATION 100% COMPLETE. ALL COMBAT SYSTEM TESTS SECURED.", 'sys');
            window.NeuralConsole.log("SYNCHRONIZING INCOMING SECTOR PROTOCOL...", 'res');
        }

        setTimeout(() => {
            this.onComplete();
        }, 1500);
    }
}
