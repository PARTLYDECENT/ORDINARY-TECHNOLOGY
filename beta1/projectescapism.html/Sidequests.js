// Sidequests.js - Optional sidequests for campaign levels

class SidequestForest {
    constructor(scene, player, camera, onComplete) {
        this.scene = scene;
        this.player = player;
        this.camera = camera;
        this.onComplete = onComplete;
        this.active = true;
        this.name = "Secure Comms Relay";
        this.countStr = "APPROACH RELAY";
        
        // Random position, far enough from player starting at (0,0)
        this.position = new THREE.Vector3(25, 0, -35);
        if (window.TerrainGen) {
            this.position.y = window.TerrainGen.getMeshHeight(this.position.x, this.position.z);
        }
        
        this.group = null;
        this.marker = null;
        
        // State
        this.isInteracted = false;
        this.timer = 30.0; // 30 seconds defense timer
        this.spawnTimer = 0.0;
        this.completed = false;

        this.init();
    }

    init() {
        this.group = new THREE.Group();
        this.group.position.copy(this.position);

        // Terminal Console mesh (a box)
        const boxGeo = new THREE.BoxGeometry(2.0, 2.5, 1.5);
        const boxMat = new THREE.MeshStandardMaterial({
            color: 0x444444,
            roughness: 0.5,
            metalness: 0.8
        });
        const consoleMesh = new THREE.Mesh(boxGeo, boxMat);
        consoleMesh.position.y = 1.25;
        this.group.add(consoleMesh);

        // Blinking amber screens / lights
        const screenGeo = new THREE.PlaneGeometry(1.6, 1.0);
        this.screenMat = new THREE.MeshBasicMaterial({
            color: 0xffaa00,
            transparent: true,
            opacity: 0.8
        });
        const screen = new THREE.Mesh(screenGeo, this.screenMat);
        screen.position.set(0, 1.6, 0.76);
        this.group.add(screen);

        // Vertical amber beam to make it visible
        const beamGeo = new THREE.CylinderGeometry(0.2, 0.6, 150, 12, 1, true);
        beamGeo.translate(0, 75, 0);
        this.beamMat = new THREE.MeshBasicMaterial({
            color: 0xffaa00,
            transparent: true,
            opacity: 0.2,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        const beam = new THREE.Mesh(beamGeo, this.beamMat);
        this.group.add(beam);

        // Point light
        this.light = new THREE.PointLight(0xffaa00, 2.0, 15);
        this.light.position.set(0, 2.5, 0);
        this.group.add(this.light);

        this.scene.add(this.group);

        this.marker = this.createMarker("COMMS RELAY");
    }

    createMarker(text) {
        const div = document.createElement('div');
        div.className = 'obj-marker';
        div.style.position = 'absolute';
        div.style.pointerEvents = 'none';
        div.style.transform = 'translate(-50%, -50%)';
        div.style.color = '#ffaa00';
        div.style.fontFamily = 'monospace';
        div.style.fontSize = '10px';
        div.style.display = 'flex';
        div.style.flexDirection = 'column';
        div.style.alignItems = 'center';
        div.style.textShadow = '0 0 5px #ffaa00';
        div.style.zIndex = '9998';

        div.innerHTML = `
            <div class="marker-arrow" style="font-size: 20px; margin-bottom: 2px; display: none; text-shadow: 0 0 8px #ffaa00; transition: transform 0.1s ease;">➤</div>
            <div class="marker-panel" style="display: flex; flex-direction: column; align-items: center; transition: all 0.2s ease;">
                <div style="font-size: 16px; margin-bottom: 2px; animation: blink 1s infinite alternate;">◈</div>
                <div style="background: rgba(20, 10, 0, 0.95); padding: 4px 8px; border: 1px solid #ffaa00; border-radius: 2px; letter-spacing: 1px; font-weight: bold; white-space: nowrap;">
                    <span style="opacity: 0.7; font-size: 7px; display: block; margin-bottom: 2px; color: #ffaa00;">SECONDARY</span>
                    ${text}
                </div>
            </div>
            <div class="marker-dist" style="font-size: 10px; margin-top: 4px; font-weight: bold; color: #fff; text-shadow: 0 0 5px #ffaa00;">0m</div>
            <style>
                @keyframes blink {
                    from { opacity: 0.4; }
                    to { opacity: 1.0; }
                }
            </style>
        `;
        document.body.appendChild(div);
        return div;
    }

    update(delta, elapsedTime, activeCamera) {
        if (!this.active) return;
        const camera = activeCamera || this.camera;

        // Animate blinking screen and beam
        if (this.screenMat) {
            this.screenMat.opacity = 0.5 + Math.sin(elapsedTime * (this.isInteracted ? 12 : 3)) * 0.3;
        }

        const dist = this.player.position.distanceTo(this.position);

        // Interact prompt or start
        if (!this.isInteracted && dist < 4.0) {
            this.isInteracted = true;
            if (window.NeuralConsole) {
                window.NeuralConsole.log("[COMMS RELAY]: ESTABLISHING CONNECTIVITY. DEPLOYING DEFENSIVE BARRIER...", 'sys');
                window.NeuralConsole.log("[WARNING]: INCOMING THREAT VECTOR ENROUTE.", 'err');
            }
            // Spawn an extra wave of zombies near the console
            if (window.spawnZombie) {
                for(let i = 0; i < 4; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const zX = this.position.x + Math.cos(angle) * 15;
                    const zZ = this.position.z + Math.sin(angle) * 15;
                    window.spawnZombie(zX, zZ, Math.random() > 0.5 ? 1 : 0);
                }
            }
        }

        if (this.isInteracted && !this.completed) {
            if (dist > 15.0) {
                // Out of range
                this.countStr = "OUT OF RANGE";
            } else {
                this.timer = Math.max(0, this.timer - delta);
                this.countStr = `UPLOADING... ${Math.ceil(this.timer)}s`;

                // Periodically spawn aggressive zombies during defense
                this.spawnTimer += delta;
                if (this.spawnTimer > 6.0) {
                    this.spawnTimer = 0.0;
                    if (window.spawnZombie) {
                        const angle = Math.random() * Math.PI * 2;
                        const zX = this.position.x + Math.cos(angle) * 18;
                        const zZ = this.position.z + Math.sin(angle) * 18;
                        window.spawnZombie(zX, zZ, 0);
                    }
                }

                if (this.timer <= 0) {
                    this.complete();
                }
            }
        } else if (!this.completed) {
            this.countStr = `${Math.round(dist)}m TO RELAY`;
        }

        // Screen-edge clamping marker code
        if (this.marker) {
            const camPos = this.position.clone().applyMatrix4(camera.matrixWorldInverse);
            const isBehind = camPos.z > 0;
            
            let vec = this.position.clone().project(camera);
            if (isBehind) {
                vec.x = -vec.x;
                vec.y = -vec.y;
            }
            
            const borderMargin = 0.08;
            const limitX = 1.0 - borderMargin;
            const limitY = 1.0 - borderMargin;
            
            const isOffscreen = isBehind || vec.x < -limitX || vec.x > limitX || vec.y < -limitY || vec.y > limitY;
            
            let x = 0, y = 0, arrowAngle = 0;
            
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
            
            this.marker.style.display = this.completed ? 'none' : 'flex';
            if (this.marker.style.display !== 'none') {
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
                    if (arrow) arrow.style.display = 'none';
                    if (panel) {
                        panel.style.transform = 'none';
                        panel.style.opacity = '1';
                    }
                }
            }
        }
    }

    complete() {
        this.completed = true;
        this.countStr = "SECURED";

        if (this.marker) {
            this.marker.remove();
            this.marker = null;
        }

        // Spawn reward
        if (typeof window.spawnWeaponDrop === 'function') {
            window.spawnWeaponDrop('railgun', true); // spawns nearby
            // Move the drop to the relay's position
            const drop = window.weaponDrops[window.weaponDrops.length - 1];
            if (drop && drop.mesh) {
                drop.mesh.position.copy(this.position);
                drop.mesh.position.y += 0.4;
            }
        }

        // Success particles
        if (window.emitParticle) {
            for (let i = 0; i < 30; i++) {
                const angle = Math.random() * Math.PI * 2;
                const sp = 2 + Math.random() * 4;
                window.emitParticle(
                    this.position.x, this.position.y + 2, this.position.z,
                    Math.cos(angle) * sp, 2 + Math.random() * 3, Math.sin(angle) * sp,
                    1.0, 0.7, 0.0,
                    6.0, 0.6
                );
            }
        }

        if (window.NeuralConsole) {
            window.NeuralConsole.log("[TRANSMISSION DETECTED]: S.O.S. FROM ORBITAL STRETCH. LINK SECURED.", 'sys');
            window.NeuralConsole.log("[REWARD]: VOLT RAILGUN ACQUIRED AT RELAY STATION.", 'res');
        }

        if (this.onComplete) this.onComplete();
    }

    dispose() {
        this.active = false;
        if (this.marker) {
            this.marker.remove();
            this.marker = null;
        }
        if (this.group) {
            this.scene.remove(this.group);
            this.group = null;
        }
    }
}


class SidequestDesert {
    constructor(scene, player, camera, onComplete) {
        this.scene = scene;
        this.player = player;
        this.camera = camera;
        this.onComplete = onComplete;
        this.active = true;
        this.name = "Collect Spore Pods";
        this.countStr = "0/3 SPORES";
        this.completed = false;

        this.pods = [];
        this.init();
    }

    init() {
        // Spawn 3 pods at preset positions
        const spawnPoints = [
            new THREE.Vector3(40, 0, 10),
            new THREE.Vector3(-30, 0, 45),
            new THREE.Vector3(15, 0, -50)
        ];

        spawnPoints.forEach((pos, idx) => {
            if (window.TerrainGen) {
                pos.y = window.TerrainGen.getHeight(pos.x, pos.z);
            }

            const podGroup = new THREE.Group();
            podGroup.position.copy(pos);

            // Spore capsule model
            const capGeo = new THREE.CylinderGeometry(0.5, 0.5, 1.6, 8);
            const capMat = new THREE.MeshStandardMaterial({
                color: 0x00ff66,
                roughness: 0.1,
                metalness: 0.9
            });
            const cap = new THREE.Mesh(capGeo, capMat);
            cap.position.y = 0.8;
            podGroup.add(cap);

            // Glowing light and beam
            const light = new THREE.PointLight(0x00ff66, 2.0, 10);
            light.position.y = 1.6;
            podGroup.add(light);

            const beamGeo = new THREE.CylinderGeometry(0.1, 0.4, 200, 12, 1, true);
            beamGeo.translate(0, 100, 0);
            const beamMat = new THREE.MeshBasicMaterial({
                color: 0x00ff66,
                transparent: true,
                opacity: 0.25,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });
            const beam = new THREE.Mesh(beamGeo, beamMat);
            podGroup.add(beam);

            this.scene.add(podGroup);

            this.pods.push({
                position: pos,
                group: podGroup,
                collected: false,
                marker: this.createPodMarker(pos, `SPORE_${idx + 1}`)
            });
        });

        if (window.NeuralConsole) {
            window.NeuralConsole.log("[SPORE PROTOCOL]: 3 ANOMALOUS BIO-SAMPLES LOCALIZED IN EXPANSE.", 'sys');
        }
    }

    createPodMarker(pos, name) {
        const div = document.createElement('div');
        div.className = 'obj-marker';
        div.style.position = 'absolute';
        div.style.pointerEvents = 'none';
        div.style.transform = 'translate(-50%, -50%)';
        div.style.color = '#00ff66';
        div.style.fontFamily = 'monospace';
        div.style.fontSize = '9px';
        div.style.display = 'flex';
        div.style.flexDirection = 'column';
        div.style.alignItems = 'center';
        div.style.textShadow = '0 0 5px #00ff66';
        div.style.zIndex = '9998';

        div.innerHTML = `
            <div class="marker-arrow" style="font-size: 20px; margin-bottom: 2px; display: none; text-shadow: 0 0 8px #00ff66; transition: transform 0.1s ease;">➤</div>
            <div class="marker-panel" style="display: flex; flex-direction: column; align-items: center; transition: all 0.2s ease;">
                <div style="font-size: 16px; margin-bottom: 2px; animation: blink 1s infinite alternate;">⬡</div>
                <div style="background: rgba(0, 20, 10, 0.95); padding: 3px 6px; border: 1px solid #00ff66; border-radius: 2px; letter-spacing: 1px; font-weight: bold; white-space: nowrap;">
                    <span style="opacity: 0.7; font-size: 7px; display: block; margin-bottom: 2px; color: #00ff66;">SPECIMEN</span>
                    ${name}
                </div>
            </div>
            <div class="marker-dist" style="font-size: 10px; margin-top: 4px; font-weight: bold; color: #fff; text-shadow: 0 0 5px #00ff66;">0m</div>
        `;
        document.body.appendChild(div);
        return div;
    }

    update(delta, elapsedTime, activeCamera) {
        if (!this.active || this.completed) return;
        const camera = activeCamera || this.camera;

        let activeCount = 0;

        this.pods.forEach(pod => {
            if (pod.collected) return;
            activeCount++;

            // Rotation
            pod.group.rotation.y += delta * 1.5;
            pod.group.position.y = Math.sin(elapsedTime * 3.0 + pod.position.x) * 0.1;

            const dist = this.player.position.distanceTo(pod.position);

            // Proximity collect
            if (dist < 3.0) {
                pod.collected = true;
                this.scene.remove(pod.group);
                if (pod.marker) {
                    pod.marker.remove();
                    pod.marker = null;
                }
                
                // Collection feedback particles
                if (window.emitParticle) {
                    for (let p = 0; p < 15; p++) {
                        window.emitParticle(
                            pod.position.x, pod.position.y + 0.8, pod.position.z,
                            (Math.random() - 0.5) * 5, Math.random() * 4 + 1, (Math.random() - 0.5) * 5,
                            0.0, 1.0, 0.4,
                            5.0, 0.5
                        );
                    }
                }
                
                if (window.NeuralConsole) {
                    window.NeuralConsole.log(`[HARVEST]: SPECIMEN SECURED. UPLOADING MOLECULAR MAP.`, 'sys');
                }
                return;
            }

            // Screen marker update
            if (pod.marker) {
                const camPos = pod.position.clone().applyMatrix4(camera.matrixWorldInverse);
                const isBehind = camPos.z > 0;
                
                let vec = pod.position.clone().project(camera);
                if (isBehind) {
                    vec.x = -vec.x;
                    vec.y = -vec.y;
                }
                
                const borderMargin = 0.08;
                const limitX = 1.0 - borderMargin;
                const limitY = 1.0 - borderMargin;
                
                const isOffscreen = isBehind || vec.x < -limitX || vec.x > limitX || vec.y < -limitY || vec.y > limitY;
                
                let x = 0, y = 0, arrowAngle = 0;
                
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
                
                pod.marker.style.left = `${x}px`;
                pod.marker.style.top = `${y}px`;
                pod.marker.querySelector('.marker-dist').textContent = `${Math.round(dist)}m`;
                
                const arrow = pod.marker.querySelector('.marker-arrow');
                const panel = pod.marker.querySelector('.marker-panel');
                
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
                    if (arrow) arrow.style.display = 'none';
                    if (panel) {
                        panel.style.transform = 'none';
                        panel.style.opacity = '1';
                    }
                }
            }
        });

        const collectedCount = 3 - activeCount;
        this.countStr = `${collectedCount}/3 SPORES`;

        if (activeCount === 0) {
            this.complete();
        }
    }

    complete() {
        this.completed = true;
        this.countStr = "HARVESTED";

        // Permanent Speed Multiplier boost (25%) for rest of level
        if (this.player) {
            this.player.speedMultiplier = (this.player.speedMultiplier || 1.0) * 1.25;
            if (window.CONFIG) {
                window.CONFIG.playerSpeed *= 1.25;
            }
        }

        if (window.NeuralConsole) {
            window.NeuralConsole.log("[BIO-SENSE]: ANOMALOUS SPORES COLLECTED. NEURAL OVERCLOCK INITIATED.", 'res');
            window.NeuralConsole.log("[OVERCLOCK]: MOVEMENT SPEED PERMANENTLY BOOSTED +25%.", 'sys');
        }

        if (this.onComplete) this.onComplete();
    }

    dispose() {
        this.active = false;
        this.pods.forEach(pod => {
            if (pod.marker) {
                pod.marker.remove();
            }
            if (pod.group) {
                this.scene.remove(pod.group);
            }
        });
        this.pods = [];
    }
}


class SidequestMaze {
    constructor(scene, player, camera, onComplete) {
        this.scene = scene;
        this.player = player;
        this.camera = camera;
        this.onComplete = onComplete;
        this.active = true;
        this.name = "Decrypt Laptop";
        this.countStr = "LOCATE LAPTOP";
        this.completed = false;

        this.position = new THREE.Vector3();
        this.group = null;
        this.marker = null;
        this.isInteracted = false;
        this.timer = 10.0; // 10 seconds decryption

        this.init();
    }

    init() {
        // Find a valid cell in the maze far from player
        let cellX = 8, cellZ = 12;
        
        if (window.mapManager && typeof window.mapManager._isWall === 'function') {
            const spacing = window.mapManager.cellSize || 4.0;
            // Let's search from (10, 10) downwards to find an open cell
            for (let z = 14; z >= 4; z--) {
                for (let x = 14; x >= 4; x--) {
                    if (!window.mapManager._isWall(x, z) && (x*x + z*z > 50)) {
                        cellX = x;
                        cellZ = z;
                        break;
                    }
                }
            }
        }

        const spacing = window.mapManager && window.mapManager.cellSize ? window.mapManager.cellSize : 4.0;
        this.position.set(cellX * spacing + spacing / 2, 0.4, cellZ * spacing + spacing / 2);

        this.group = new THREE.Group();
        this.group.position.copy(this.position);

        // Laptop base
        const baseGeo = new THREE.BoxGeometry(1.2, 0.1, 0.9);
        const baseMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.9 });
        const base = new THREE.Mesh(baseGeo, baseMat);
        this.group.add(base);

        // Screen
        const scrGeo = new THREE.BoxGeometry(1.2, 0.8, 0.1);
        this.scrMat = new THREE.MeshBasicMaterial({ color: 0x00aaff, transparent: true, opacity: 0.8 });
        const scr = new THREE.Mesh(scrGeo, this.scrMat);
        scr.position.set(0, 0.4, -0.3);
        scr.rotation.x = -0.3; // tilted screen
        this.group.add(scr);

        // Light
        this.light = new THREE.PointLight(0x00aaff, 3.0, 15);
        this.light.position.y = 1.0;
        this.group.add(this.light);

        this.scene.add(this.group);

        this.marker = this.createMarker("RESEARCHER LAPTOP");
    }

    createMarker(text) {
        const div = document.createElement('div');
        div.className = 'obj-marker';
        div.style.position = 'absolute';
        div.style.pointerEvents = 'none';
        div.style.transform = 'translate(-50%, -50%)';
        div.style.color = '#00aaff';
        div.style.fontFamily = 'monospace';
        div.style.fontSize = '9px';
        div.style.display = 'flex';
        div.style.flexDirection = 'column';
        div.style.alignItems = 'center';
        div.style.textShadow = '0 0 5px #00aaff';
        div.style.zIndex = '9998';

        div.innerHTML = `
            <div class="marker-arrow" style="font-size: 20px; margin-bottom: 2px; display: none; text-shadow: 0 0 8px #00aaff; transition: transform 0.1s ease;">➤</div>
            <div class="marker-panel" style="display: flex; flex-direction: column; align-items: center; transition: all 0.2s ease;">
                <div style="font-size: 16px; margin-bottom: 2px; animation: blink 1.2s infinite alternate;">💻</div>
                <div style="background: rgba(0, 10, 20, 0.95); padding: 3px 6px; border: 1px solid #00aaff; border-radius: 2px; letter-spacing: 1px; font-weight: bold; white-space: nowrap;">
                    <span style="opacity: 0.7; font-size: 7px; display: block; margin-bottom: 2px; color: #00aaff;">ARCHIVE</span>
                    ${text}
                </div>
            </div>
            <div class="marker-dist" style="font-size: 10px; margin-top: 4px; font-weight: bold; color: #fff; text-shadow: 0 0 5px #00aaff;">0m</div>
        `;
        document.body.appendChild(div);
        return div;
    }

    update(delta, elapsedTime, activeCamera) {
        if (!this.active) return;
        const camera = activeCamera || this.camera;

        const dist = this.player.position.distanceTo(this.position);

        if (!this.isInteracted && dist < 3.5) {
            this.isInteracted = true;
            if (window.NeuralConsole) {
                window.NeuralConsole.log("[ARCHIVE DETECTED]: EXTRACTING LAB COGNITIVE RECORD LOGS...", 'sys');
            }
        }

        if (this.isInteracted && !this.completed) {
            this.timer = Math.max(0, this.timer - delta);
            this.countStr = `DECRYPTING... ${Math.ceil((1.0 - this.timer/10.0)*100)}%`;

            if (this.scrMat) {
                this.scrMat.color.setHex(Math.sin(elapsedTime * 20.0) > 0.0 ? 0xffbb00 : 0x00f3ff);
            }

            if (this.timer <= 0) {
                this.complete();
            }
        } else if (!this.completed) {
            this.countStr = `${Math.round(dist)}m TO LAPTOP`;
        }

        // Screen marker rendering
        if (this.marker) {
            const camPos = this.position.clone().applyMatrix4(camera.matrixWorldInverse);
            const isBehind = camPos.z > 0;
            
            let vec = this.position.clone().project(camera);
            if (isBehind) {
                vec.x = -vec.x;
                vec.y = -vec.y;
            }
            
            const borderMargin = 0.08;
            const limitX = 1.0 - borderMargin;
            const limitY = 1.0 - borderMargin;
            
            const isOffscreen = isBehind || vec.x < -limitX || vec.x > limitX || vec.y < -limitY || vec.y > limitY;
            
            let x = 0, y = 0, arrowAngle = 0;
            
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
            
            this.marker.style.display = this.completed ? 'none' : 'flex';
            if (this.marker.style.display !== 'none') {
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
                    if (arrow) arrow.style.display = 'none';
                    if (panel) {
                        panel.style.transform = 'none';
                        panel.style.opacity = '1';
                    }
                }
            }
        }
    }

    complete() {
        this.completed = true;
        this.countStr = "DECRYPTED";

        if (this.marker) {
            this.marker.remove();
            this.marker = null;
        }

        // Highlight/show direction to exit portal on screen
        if (window.currentObjective && window.currentObjective instanceof ObjectiveMaze) {
            // Keep the exit portal marker visible through walls forever
            const mazeObj = window.currentObjective;
            if (mazeObj.marker) {
                mazeObj.marker.style.opacity = '1.0';
                mazeObj.marker.style.color = '#ff00ff'; // change to hot magenta
                mazeObj.marker.style.textShadow = '0 0 10px #ff00ff';
                const pnl = mazeObj.marker.querySelector('.marker-panel');
                if (pnl) pnl.style.border = '2px solid #ff00ff';
            }
        }

        if (window.NeuralConsole) {
            window.NeuralConsole.log("[DECRYPTED]: ENCRYPTION KEY EXTRACTED. RIFT SIGNAL DE-NOISED.", 'res');
            window.NeuralConsole.log("[MAP INTEGRITY]: PORTAL POSITION DE-SHROUDED. SCAN COMPLETED.", 'sys');
        }

        if (this.onComplete) this.onComplete();
    }

    dispose() {
        this.active = false;
        if (this.marker) {
            this.marker.remove();
            this.marker = null;
        }
        if (this.group) {
            this.scene.remove(this.group);
            this.group = null;
        }
    }
}


class SidequestEndgame {
    constructor(scene, player, camera, onComplete) {
        this.scene = scene;
        this.player = player;
        this.camera = camera;
        this.onComplete = onComplete;
        this.active = true;
        this.name = "Shatter Anchors";
        this.countStr = "2/2 ANCHORS";
        this.completed = false;

        this.anchors = [];
        this.beams = [];
        this.init();
    }

    init() {
        // Spawn 2 reality anchors at corners of the endgame glass map
        const points = [
            new THREE.Vector3(25, 2.5, 25),
            new THREE.Vector3(-25, 2.5, -25)
        ];

        points.forEach((pos, idx) => {
            const anchorGroup = new THREE.Group();
            anchorGroup.position.copy(pos);

            // Purple crystal mesh
            const octGeo = new THREE.OctahedronGeometry(1.5, 0);
            const octMat = new THREE.MeshStandardMaterial({
                color: 0xcc00ff,
                roughness: 0.05,
                metalness: 0.95,
                emissive: 0x660099,
                emissiveIntensity: 1.5
            });
            const crystal = new THREE.Mesh(octGeo, octMat);
            anchorGroup.add(crystal);

            // Glow point light
            const light = new THREE.PointLight(0xcc00ff, 3.0, 15);
            anchorGroup.add(light);

            this.scene.add(anchorGroup);

            this.anchors.push({
                position: pos,
                group: anchorGroup,
                hp: 150,
                maxHp: 150,
                destroyed: false,
                marker: this.createAnchorMarker(pos, `ANCHOR_${idx + 1}`)
            });

            // Create visual line beam to boss location (boss starts at (0, 0, 0))
            const beamMat = new THREE.LineBasicMaterial({ color: 0xcc00ff, linewidth: 2 });
            const pointsArr = [pos, new THREE.Vector3(0, 2.0, 0)];
            const beamGeo = new THREE.BufferGeometry().setFromPoints(pointsArr);
            const beamLine = new THREE.Line(beamGeo, beamMat);
            this.scene.add(beamLine);
            this.beams.push(beamLine);
        });

        // Set healing multiplier or flag in window
        window.hatmanHealingActive = true;

        if (window.NeuralConsole) {
            window.NeuralConsole.log("[REALITY WARP]: 2 VOID ANCHORS DETECTED. ENEMY INTEGRITY HEALING ACTIVATED.", 'err');
        }
    }

    createAnchorMarker(pos, name) {
        const div = document.createElement('div');
        div.className = 'obj-marker';
        div.style.position = 'absolute';
        div.style.pointerEvents = 'none';
        div.style.transform = 'translate(-50%, -50%)';
        div.style.color = '#cc00ff';
        div.style.fontFamily = 'monospace';
        div.style.fontSize = '9px';
        div.style.display = 'flex';
        div.style.flexDirection = 'column';
        div.style.alignItems = 'center';
        div.style.textShadow = '0 0 5px #cc00ff';
        div.style.zIndex = '9998';

        div.innerHTML = `
            <div class="marker-arrow" style="font-size: 20px; margin-bottom: 2px; display: none; text-shadow: 0 0 8px #cc00ff; transition: transform 0.1s ease;">➤</div>
            <div class="marker-panel" style="display: flex; flex-direction: column; align-items: center; transition: all 0.2s ease;">
                <div style="font-size: 16px; margin-bottom: 2px; animation: pulse 0.8s infinite alternate;">⧫</div>
                <div style="background: rgba(15, 0, 20, 0.95); padding: 3px 6px; border: 1px solid #cc00ff; border-radius: 2px; letter-spacing: 1px; font-weight: bold; white-space: nowrap;">
                    <span style="opacity: 0.7; font-size: 7px; display: block; margin-bottom: 2px; color: #cc00ff;">SHIELD LINK</span>
                    ${name}
                </div>
            </div>
            <div class="marker-dist" style="font-size: 10px; margin-top: 4px; font-weight: bold; color: #fff; text-shadow: 0 0 5px #cc00ff;">0m</div>
        `;
        document.body.appendChild(div);
        return div;
    }

    update(delta, elapsedTime, activeCamera) {
        if (!this.active || this.completed) return;
        const camera = activeCamera || this.camera;

        let aliveCount = 0;

        // Dynamic healing particle burst on Boss if he is active and healing
        if (window.hatmanHealingActive && window.hatmanBoss && Math.random() < 0.15 && window.emitParticle) {
            const bPos = window.hatmanBoss.position || new THREE.Vector3(0, 0, 0);
            window.emitParticle(
                bPos.x + (Math.random() - 0.5) * 4,
                bPos.y + Math.random() * 3,
                bPos.z + (Math.random() - 0.5) * 4,
                0, Math.random() * 2 + 1, 0,
                0.8, 0.0, 1.0, // purple/green health feedback particles
                6.0, 0.7
            );
            // Regenerate Boss health
            window.hatmanBoss.health = Math.min(window.hatmanBoss.maxHealth || 3000, (window.hatmanBoss.health || 0) + delta * 40.0);
            
            // Sync with actual HTML health bar
            const pct = Math.max(0, (window.hatmanBoss.health / window.hatmanBoss.maxHealth) * 100);
            const bar = document.getElementById('boss-health-bar');
            const percentText = document.getElementById('boss-health-percent');
            if (bar) bar.style.width = `${pct}%`;
            if (percentText) percentText.innerText = `${Math.round(pct)}%`;
        }

        this.anchors.forEach((anchor, idx) => {
            if (anchor.destroyed) return;
            aliveCount++;

            // Rotate crystal
            anchor.group.rotation.y += delta * 2.0;
            anchor.group.rotation.x += delta * 0.8;
            anchor.group.position.y = anchor.position.y + Math.sin(elapsedTime * 4.0 + idx) * 0.15;

            const dist = this.player.position.distanceTo(anchor.position);

            // Bullet hit registration
            if (window.bullets && window.bullets.length) {
                window.bullets.forEach(b => {
                    if (b.mesh && b.mesh.position.distanceTo(anchor.group.position) < 2.5) {
                        // HIT!
                        anchor.hp -= 20.0; // standard bullet damage to anchor
                        b.mesh.position.set(9999, 9999, 9999); // remove bullet
                        
                        // Hit indicator
                        if (window.emitParticle) {
                            for (let p = 0; p < 8; p++) {
                                window.emitParticle(
                                    b.mesh.position.x, b.mesh.position.y, b.mesh.position.z,
                                    (Math.random() - 0.5) * 6, Math.random() * 6, (Math.random() - 0.5) * 6,
                                    0.8, 0.0, 1.0,
                                    4.0, 0.4
                                );
                            }
                        }
                    }
                });
            }

            if (anchor.hp <= 0) {
                this.destroyAnchor(anchor, idx);
                return;
            }

            // Update beam coordinates dynamically to boss's current position
            if (this.beams[idx] && window.hatmanBoss) {
                const bPos = window.hatmanBoss.position;
                const posAttr = this.beams[idx].geometry.attributes.position;
                if (posAttr) {
                    posAttr.setXYZ(1, bPos.x, bPos.y + 2.0, bPos.z);
                    posAttr.needsUpdate = true;
                }
            }

            // Screen marker update
            if (anchor.marker) {
                const camPos = anchor.position.clone().applyMatrix4(camera.matrixWorldInverse);
                const isBehind = camPos.z > 0;
                
                let vec = anchor.position.clone().project(camera);
                if (isBehind) {
                    vec.x = -vec.x;
                    vec.y = -vec.y;
                }
                
                const borderMargin = 0.08;
                const limitX = 1.0 - borderMargin;
                const limitY = 1.0 - borderMargin;
                
                const isOffscreen = isBehind || vec.x < -limitX || vec.x > limitX || vec.y < -limitY || vec.y > limitY;
                
                let x = 0, y = 0, arrowAngle = 0;
                
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
                
                anchor.marker.style.left = `${x}px`;
                anchor.marker.style.top = `${y}px`;
                anchor.marker.querySelector('.marker-dist').textContent = `${Math.round(dist)}m`;
                
                const arrow = anchor.marker.querySelector('.marker-arrow');
                const panel = anchor.marker.querySelector('.marker-panel');
                
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
                    if (arrow) arrow.style.display = 'none';
                    if (panel) {
                        panel.style.transform = 'none';
                        panel.style.opacity = '1';
                    }
                }
            }
        });

        this.countStr = `${aliveCount}/2 ANCHORS`;

        if (aliveCount === 0) {
            this.complete();
        }
    }

    destroyAnchor(anchor, idx) {
        anchor.destroyed = true;
        this.scene.remove(anchor.group);
        if (anchor.marker) {
            anchor.marker.remove();
            anchor.marker = null;
        }

        // Remove beam line
        if (this.beams[idx]) {
            this.scene.remove(this.beams[idx]);
            this.beams[idx] = null;
        }

        // Shatter particles
        if (window.emitParticle) {
            for (let p = 0; p < 25; p++) {
                window.emitParticle(
                    anchor.position.x, anchor.position.y, anchor.position.z,
                    (Math.random() - 0.5) * 8, Math.random() * 6, (Math.random() - 0.5) * 8,
                    0.8, 0.0, 1.0,
                    8.0, 0.7
                );
            }
        }

        if (window.NeuralConsole) {
            window.NeuralConsole.log(`[ANCHOR SHATTERED]: ANCHOR_${idx + 1} DECONSTRUCTED. LOGGED ENCRYPTION FAIL.`, 'err');
        }
    }

    complete() {
        this.completed = true;
        this.countStr = "SHATTERED";
        window.hatmanHealingActive = false;

        // Stun Hatman Boss if active
        if (window.hatmanBoss) {
            window.hatmanBoss.isStunned = true;
            window.hatmanBoss.stunTimer = 6.0;
            
            // Slow down or pause Hatman boss movement speed
            const originalUpdate = window.hatmanBoss.update;
            window.hatmanBoss.update = function(playerPos, delta, activeCamera = null) {
                // Reduce delta to slow down boss updates during stun
                originalUpdate.call(window.hatmanBoss, playerPos, delta * 0.1, activeCamera);
            };
            
            setTimeout(() => {
                if (window.hatmanBoss) {
                    window.hatmanBoss.update = originalUpdate; // restore speed
                }
            }, 6000);

            if (window.emitParticle) {
                const bPos = window.hatmanBoss.position;
                for (let p = 0; p < 50; p++) {
                    window.emitParticle(
                        bPos.x, bPos.y + 1, bPos.z,
                        (Math.random() - 0.5) * 12, Math.random() * 8, (Math.random() - 0.5) * 12,
                        1.0, 0.9, 0.0,
                        8.0, 0.85
                    );
                }
            }
        }

        if (window.NeuralConsole) {
            window.NeuralConsole.log("[REALITY BOUND]: ANCHORS SHATTERED. ANOMALY REGEN DEACTIVATED.", 'res');
            window.NeuralConsole.log("[STUN WARNING]: BOSS SIGNAL FLICKERING. ENGAGE ATTACK PROTOCOL.", 'sys');
        }

        if (this.onComplete) this.onComplete();
    }

    dispose() {
        this.active = false;
        this.anchors.forEach(a => {
            if (a.marker) a.marker.remove();
            if (a.group) this.scene.remove(a.group);
        });
        this.beams.forEach(b => {
            if (b) this.scene.remove(b);
        });
        this.anchors = [];
        this.beams = [];
        window.hatmanHealingActive = false;
    }
}

window.SidequestForest = SidequestForest;
window.SidequestDesert = SidequestDesert;
window.SidequestMaze = SidequestMaze;
window.SidequestEndgame = SidequestEndgame;
