// ObjectiveMaze.js - Level 3: Escape the Asynchronous Maze
class ObjectiveMaze {
    constructor(scene, player, camera, onComplete) {
        this.scene = scene;
        this.player = player;
        this.camera = camera;
        this.onComplete = onComplete;
        this.active = true;
        
        this.riftGroup = null;
        this.marker = null;
        this.targetPos = new THREE.Vector3(40, 3.0, 40); // Fallback position

        // Stability Anchors
        this.anchors = []; // { mesh, pos, health, type, marker }
        this.anchorsDestroyed = 0;
        this.riftLocked = true;

        this.init();
    }

    init() {
        let cellX = 14, cellZ = 14;
        let a1X = 8, a1Z = 8;
        let a2X = 5, a2Z = 12;
        
        if (window.mapManager && typeof window.mapManager._isWall === 'function') {
            const queue = [{ x: 0, z: 0, dist: 0 }];
            const visited = new Set(["0,0"]);
            const candidates = [];

            while (queue.length > 0) {
                const curr = queue.shift();
                const distFromStart = Math.sqrt(curr.x * curr.x + curr.z * curr.z);
                if (distFromStart >= 40 && distFromStart <= 78) {
                    candidates.push(curr);
                }

                if (curr.dist < 85) {
                    const neighbors = [
                        { x: curr.x + 1, z: curr.z },
                        { x: curr.x - 1, z: curr.z },
                        { x: curr.x, z: curr.z + 1 },
                        { x: curr.x, z: curr.z - 1 }
                    ];
                    for (const n of neighbors) {
                        const key = `${n.x},${n.z}`;
                        if (!visited.has(key) && !window.mapManager._isWall(n.x, n.z)) {
                            visited.add(key);
                            queue.push({ x: n.x, z: n.z, dist: curr.dist + 1 });
                        }
                    }
                }
            }

            if (candidates.length > 3) {
                candidates.sort((a, b) => b.dist - a.dist);
                
                // Exit Rift
                const idxExit = 0;
                cellX = candidates[idxExit].x;
                cellZ = candidates[idxExit].z;

                // Anchor 1 (midway)
                const idxA1 = Math.floor(candidates.length * 0.4);
                a1X = candidates[idxA1].x;
                a1Z = candidates[idxA1].z;

                // Anchor 2 (closer to start)
                const idxA2 = Math.floor(candidates.length * 0.7);
                a2X = candidates[idxA2].x;
                a2Z = candidates[idxA2].z;
            }
        }

        const spacing = window.mapManager && window.mapManager.cellSize ? window.mapManager.cellSize : 4.0;
        this.targetPos.set(cellX * spacing + spacing / 2, 3.0, cellZ * spacing + spacing / 2);

        // 1. Create Rift Exit visual group (enveloped in red energy shield when locked)
        this.riftGroup = new THREE.Group();
        this.riftGroup.position.copy(this.targetPos);

        const coreGeo = new THREE.SphereGeometry(3.0, 32, 32);
        const coreMat = new THREE.MeshBasicMaterial({ 
            color: 0x00f3ff,
            transparent: true,
            opacity: 0.95
        });
        const core = new THREE.Mesh(coreGeo, coreMat);
        this.riftGroup.add(core);

        // Gyroscope rings
        const ringGeo1 = new THREE.TorusGeometry(6.0, 0.25, 8, 32);
        const ringMat1 = new THREE.MeshStandardMaterial({
            color: 0x00f3ff,
            emissive: 0x00aaff,
            roughness: 0.1,
            metalness: 0.9,
            side: THREE.DoubleSide
        });
        this.ring1 = new THREE.Mesh(ringGeo1, ringMat1);
        this.ring1.rotation.x = Math.PI / 2;
        this.riftGroup.add(this.ring1);

        const ringGeo2 = new THREE.TorusGeometry(7.5, 0.2, 8, 32);
        const ringMat2 = new THREE.MeshStandardMaterial({
            color: 0xff00b7,
            emissive: 0xaa0077,
            roughness: 0.1,
            metalness: 0.9,
            side: THREE.DoubleSide
        });
        this.ring2 = new THREE.Mesh(ringGeo2, ringMat2);
        this.ring2.rotation.y = Math.PI / 4;
        this.riftGroup.add(this.ring2);

        // Vertical shield beam
        const beaconGeo = new THREE.CylinderGeometry(1.0, 3.0, 200, 16, 1, true);
        beaconGeo.translate(0, 100, 0);
        const beaconMat = new THREE.MeshBasicMaterial({
            color: 0x00f3ff,
            transparent: true,
            opacity: 0.28,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide,
            depthWrite: false
        });
        const beacon = new THREE.Mesh(beaconGeo, beaconMat);
        this.riftGroup.add(beacon);

        // Red locking shield grid around rift exit
        const lockGeo = new THREE.SphereGeometry(9.0, 16, 16);
        const lockMat = new THREE.MeshBasicMaterial({
            color: 0xff3300,
            transparent: true,
            opacity: 0.25,
            wireframe: true,
            blending: THREE.AdditiveBlending
        });
        this.lockShield = new THREE.Mesh(lockGeo, lockMat);
        this.riftGroup.add(this.lockShield);

        const light = new THREE.PointLight(0x00ffff, 6.0, 45);
        this.riftGroup.add(light);
        this.scene.add(this.riftGroup);

        this.marker = this.createMarker("DIMENSIONAL RIFT");

        // 2. Spawn 2 Stability Anchors
        const anchorPositions = [
            new THREE.Vector3(a1X * spacing + spacing / 2, 2.0, a1Z * spacing + spacing / 2),
            new THREE.Vector3(a2X * spacing + spacing / 2, 2.0, a2Z * spacing + spacing / 2)
        ];

        anchorPositions.forEach((pos, idx) => {
            const anchorMesh = this.createAnchorMesh();
            anchorMesh.position.copy(pos);
            this.scene.add(anchorMesh);

            const anchorObj = {
                mesh: anchorMesh,
                velocity: new THREE.Vector3(),
                isHeld: false,
                health: 50,
                type: 'crate',
                pos: pos.clone(),
                marker: this.createAnchorMarker(pos, `ANCHOR ${idx + 1}`)
            };
            if (!window.physicsCrates) window.physicsCrates = [];
            window.physicsCrates.push(anchorObj);
            this.anchors.push(anchorObj);
        });

        if (window.NeuralConsole) {
            window.NeuralConsole.clear();
            window.NeuralConsole.log("MAZE SIGNAL DECAY: GEOMETRIC INSTABILITY REGISTERED.", 'sys');
            window.NeuralConsole.log("OBJECTIVE: DESTRUCT 2 STABILITY ANCHORS TO SECURE THE RIFT TRANSITION.", 'res');
        }
    }

    createAnchorMesh() {
        const group = new THREE.Group();
        const boxGeo = new THREE.BoxGeometry(1.2, 1.2, 1.2);
        const boxMat = new THREE.MeshStandardMaterial({
            color: 0xaa00ff,
            emissive: 0x7700cc,
            emissiveIntensity: 2.0,
            metalness: 0.8,
            roughness: 0.2
        });
        const box = new THREE.Mesh(boxGeo, boxMat);
        group.add(box);

        const ringGeo = new THREE.TorusGeometry(1.5, 0.08, 6, 16);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0xaa00ff, transparent: true, opacity: 0.8 });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        group.add(ring);

        const light = new THREE.PointLight(0xaa00ff, 4.0, 10);
        group.add(light);
        return group;
    }

    createMarker(name) {
        const div = document.createElement('div');
        div.className = 'obj-marker';
        div.style.position = 'absolute';
        div.style.pointerEvents = 'none';
        div.style.transform = 'translate(-50%, -50%)';
        div.style.color = '#00aaff'; // Cyber blue/cyan
        div.style.fontFamily = 'monospace';
        div.style.fontSize = '14px';
        div.style.display = 'flex';
        div.style.flexDirection = 'column';
        div.style.alignItems = 'center';
        div.style.textShadow = '0 0 8px #00aaff';
        div.style.zIndex = '9999';

        div.innerHTML = `
            <div class="marker-arrow" style="font-size: 26px; margin-bottom: 2px; display: none; text-shadow: 0 0 10px #00aaff; transition: transform 0.1s ease;">➤</div>
            <div class="marker-panel" style="display: flex; flex-direction: column; align-items: center; transition: all 0.2s ease;">
                <div style="font-size: 28px; margin-bottom: 2px; animation: glowPulse 1.2s infinite alternate;">⏣</div>
                <div style="background: rgba(0, 10, 20, 0.95); padding: 8px 16px; border: 2px solid #00aaff; border-radius: 4px; letter-spacing: 1px; font-weight: bold; white-space: nowrap; box-shadow: 0 0 12px #00aaff, inset 0 0 8px rgba(0, 170, 255, 0.25);">
                    <span style="opacity: 0.7; font-size: 10px; display: block; margin-bottom: 3px; color: #00aaff; letter-spacing: 2px;">EXIT PORTAL</span>
                    <span class="rift-name">${name.toUpperCase()}</span>
                    <span class="rift-status" style="display: block; font-size: 10px; color: #ff3300; margin-top: 4px;">LOCKED - STABILIZE RIFT</span>
                </div>
            </div>
            <div class="marker-dist" style="font-size: 11px; margin-top: 4px; font-weight: bold; color: #fff; text-shadow: 0 0 5px #00aaff;">0m</div>
            <style>
                @keyframes glowPulse {
                    from { transform: scale(1); filter: brightness(1); }
                    to { transform: scale(1.15); filter: brightness(1.5); }
                }
            </style>
        `;
        document.body.appendChild(div);
        return div;
    }

    createAnchorMarker(pos, name) {
        const div = document.createElement('div');
        div.className = 'obj-marker anchor-marker';
        div.style.position = 'absolute';
        div.style.pointerEvents = 'none';
        div.style.transform = 'translate(-50%, -50%)';
        div.style.color = '#aa00ff';
        div.style.fontFamily = 'monospace';
        div.style.fontSize = '11px';
        div.style.display = 'flex';
        div.style.flexDirection = 'column';
        div.style.alignItems = 'center';
        div.style.textShadow = '0 0 5px #aa00ff';
        div.style.zIndex = '9998';

        div.innerHTML = `
            <div class="marker-panel" style="background: rgba(10, 0, 20, 0.9); padding: 4px 8px; border: 1px solid #aa00ff; border-radius: 2px; font-weight: bold; white-space: nowrap;">
                ◈ ${name.toUpperCase()} ◈
            </div>
            <div class="marker-dist" style="font-size: 9px; margin-top: 2px; color: #fff;">0m</div>
        `;
        document.body.appendChild(div);
        return { div, pos };
    }

    getHUDData() {
        if (this.riftLocked) {
            return {
                name: "ESCAPE ASYNCHRONOUS MAZE",
                count: `SECURE MAZE ANCHORS: ${this.anchorsDestroyed}/2`,
                progress: (this.anchorsDestroyed / 2) * 0.7
            };
        }
        const dist = this.player.position.distanceTo(this.targetPos);
        return {
            name: "ESCAPE ASYNCHRONOUS MAZE",
            count: `ENTER PORTAL: ${Math.round(dist)}m`,
            progress: 0.7 + Math.max(0, Math.min(0.3, 1.0 - (dist / 120.0))) * 0.3
        };
    }

    update(delta, elapsedTime, activeCamera) {
        if (!this.active) return;
        const camera = activeCamera || this.camera;

        // Animate Rift Visuals
        if (this.riftGroup) {
            this.riftGroup.position.y = this.targetPos.y + Math.sin(elapsedTime * 2.5) * 0.15;
        }
        if (this.ring1) {
            this.ring1.rotation.x += delta * 1.5;
            this.ring1.rotation.y += delta * 0.8;
        }
        if (this.ring2) {
            this.ring2.rotation.y -= delta * 1.8;
            this.ring2.rotation.z += delta * 1.2;
        }
        if (this.lockShield) {
            this.lockShield.rotation.y -= delta * 0.3;
        }

        // Monitor Stability Anchors
        let destroyed = 0;
        this.anchors.forEach(a => {
            const isBroken = a.health <= 0 || !window.physicsCrates.includes(a);
            if (isBroken) {
                destroyed++;
                if (a.marker) {
                    a.marker.div.remove();
                    a.marker = null;
                }
                if (a.mesh) {
                    this.scene.remove(a.mesh);
                    a.mesh = null;
                }
            } else {
                if (a.mesh) {
                    a.mesh.rotation.y += delta * 1.5;
                    a.mesh.children[1].rotation.x += delta * 2.0;
                }
                this.updateHTMLMarker(a.marker.div, a.pos, camera);
            }
        });

        this.anchorsDestroyed = destroyed;

        if (this.anchorsDestroyed >= 2 && this.riftLocked) {
            this.riftLocked = false;
            if (this.lockShield) {
                this.riftGroup.remove(this.lockShield);
                this.lockShield = null;
            }
            const statusEl = this.marker.querySelector('.rift-status');
            if (statusEl) {
                statusEl.textContent = 'VULNERABLE - ENTER NOW';
                statusEl.style.color = '#00ffaa';
            }
            if (window.NeuralConsole) {
                window.NeuralConsole.log("GEOMETRIC ANCHORS DESTROYED. DIMENSIONAL RIFT IS STABILIZED.", 'sys');
            }
        }

        // Particle swirl around rift exit
        if (!this.riftLocked && Math.random() < 0.35 && window.emitParticle) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 0.5 + Math.random() * 1.0;
            emitParticle(
                this.targetPos.x + Math.cos(angle) * dist,
                this.targetPos.y + (Math.random() - 0.5) * 1.0,
                this.targetPos.z + Math.sin(angle) * dist,
                -Math.cos(angle) * 1.5,
                (Math.random() - 0.5) * 0.5,
                -Math.sin(angle) * 1.5,
                0.0, 0.95, 1.0,
                5.0, 0.4
            );
        }

        const dist = this.player.position.distanceTo(this.targetPos);

        // Screen-edge clamping and pointer rotation math
        const camPos = this.targetPos.clone().applyMatrix4(camera.matrixWorldInverse);
        const isBehind = camPos.z > 0;
        
        let vec = this.targetPos.clone().project(camera);
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

        // Proximity detection for exit (only when unlocked!)
        if (dist < 8.0 && !this.riftLocked) {
            this.complete();
        }
    }

    updateHTMLMarker(div, pos, camera) {
        const dist = this.player.position.distanceTo(pos);
        const camPos = pos.clone().applyMatrix4(camera.matrixWorldInverse);
        const isBehind = camPos.z > 0;
        
        let vec = pos.clone().project(camera);
        if (isBehind) {
            vec.x = -vec.x;
            vec.y = -vec.y;
        }

        const borderMargin = 0.08;
        const limitX = 1.0 - borderMargin;
        const limitY = 1.0 - borderMargin;
        
        const isOffscreen = isBehind || vec.x < -limitX || vec.x > limitX || vec.y < -limitY || vec.y > limitY;
        
        if (isOffscreen) {
            div.style.display = 'none';
        } else {
            const x = (vec.x * 0.5 + 0.5) * window.innerWidth;
            const y = (-vec.y * 0.5 + 0.5) * window.innerHeight;
            div.style.display = 'flex';
            div.style.left = `${x}px`;
            div.style.top = `${y}px`;
            div.querySelector('.marker-dist').textContent = `${Math.round(dist)}m`;
        }
    }

    complete() {
        this.active = false;
        if (this.marker) {
            this.marker.remove();
            this.marker = null;
        }
        if (this.riftGroup) {
            this.scene.remove(this.riftGroup);
            this.riftGroup = null;
        }
        this.anchors.forEach(a => {
            if (a.marker) a.marker.div.remove();
            if (a.mesh) this.scene.remove(a.mesh);
        });

        if (window.NeuralConsole) {
            window.NeuralConsole.log("RIFT UNLOCKED. DISPATCHING ESCAPE PROTOCOL...", 'sys');
        }

        this.onComplete();
    }
}
window.ObjectiveMaze = ObjectiveMaze;
