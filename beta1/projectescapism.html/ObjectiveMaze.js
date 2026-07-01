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
        this.targetPos = new THREE.Vector3(40, 1.8, 40); // Fallback position

        this.init();
    }

    init() {
        // Dynamically find an open cell (not a wall) that is guaranteed reachable from (0,0) via BFS
        let cellX = 14;
        let cellZ = 14;
        
        if (window.mapManager && typeof window.mapManager._isWall === 'function') {
            const queue = [{ x: 0, z: 0, dist: 0 }];
            const visited = new Set(["0,0"]);
            const candidates = [];

            // Perform Breadth-First Search to locate reachable coordinates
            while (queue.length > 0) {
                const curr = queue.shift();
                
                // If it is far enough from start (between 14 and 28 cells away), save it as a candidate
                const distFromStart = Math.sqrt(curr.x * curr.x + curr.z * curr.z);
                if (distFromStart >= 14 && distFromStart <= 28) {
                    candidates.push(curr);
                }

                // Limit BFS search radius to keep it fast and localized
                if (curr.dist < 32) {
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

            if (candidates.length > 0) {
                // Sort by distance and pick from the furthest 25% of candidates to maximize maze exploration
                candidates.sort((a, b) => b.dist - a.dist);
                const selectIndex = Math.floor(Math.random() * Math.max(1, Math.floor(candidates.length * 0.25)));
                cellX = candidates[selectIndex].x;
                cellZ = candidates[selectIndex].z;
            }
        }

        // Cell center world position (dynamic cell spacing)
        const spacing = window.mapManager && window.mapManager.cellSize ? window.mapManager.cellSize : 4.0;
        this.targetPos.set(cellX * spacing + spacing / 2, 1.8, cellZ * spacing + spacing / 2);

        // Create Rift Group
        this.riftGroup = new THREE.Group();
        this.riftGroup.position.copy(this.targetPos);

        // Core Glowing Sphere
        const coreGeo = new THREE.SphereGeometry(0.5, 32, 32);
        const coreMat = new THREE.MeshBasicMaterial({ 
            color: 0x00f3ff,
            transparent: true,
            opacity: 0.95
        });
        const core = new THREE.Mesh(coreGeo, coreMat);
        this.riftGroup.add(core);

        // Gyroscope Outer rotating rings
        const ringGeo1 = new THREE.TorusGeometry(1.0, 0.04, 8, 32);
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

        const ringGeo2 = new THREE.TorusGeometry(1.25, 0.03, 8, 32);
        const ringMat2 = new THREE.MeshStandardMaterial({
            color: 0xff00b7, // Magenta inner ring
            emissive: 0xaa0077,
            roughness: 0.1,
            metalness: 0.9,
            side: THREE.DoubleSide
        });
        this.ring2 = new THREE.Mesh(ringGeo2, ringMat2);
        this.ring2.rotation.y = Math.PI / 4;
        this.riftGroup.add(this.ring2);

        // Vertical sky beacon
        const beaconGeo = new THREE.CylinderGeometry(0.15, 0.5, 200, 16, 1, true);
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

        // Dynamic Blue light
        const light = new THREE.PointLight(0x00ffff, 4.0, 15);
        this.riftGroup.add(light);

        this.scene.add(this.riftGroup);

        this.marker = this.createMarker("DIMENSIONAL RIFT");

        if (window.NeuralConsole) {
            window.NeuralConsole.clear();
            window.NeuralConsole.log("MAZE SIGNAL DECAY: UNSTABLE GEOMETRY DETECTED.", 'sys');
            window.NeuralConsole.log("OBJECTIVE: LOCATE THE DIMENSIONAL RIFT TO ESCAPE.", 'res');
        }
    }

    createMarker(name) {
        const div = document.createElement('div');
        div.className = 'obj-marker';
        div.style.position = 'absolute';
        div.style.pointerEvents = 'none';
        div.style.transform = 'translate(-50%, -50%)';
        div.style.color = '#00aaff'; // Cyber blue/cyan
        div.style.fontFamily = 'monospace';
        div.style.fontSize = '10px';
        div.style.display = 'flex';
        div.style.flexDirection = 'column';
        div.style.alignItems = 'center';
        div.style.textShadow = '0 0 5px #00aaff';
        div.style.zIndex = '9999';

        div.innerHTML = `
            <div class="marker-arrow" style="font-size: 20px; margin-bottom: 2px; display: none; text-shadow: 0 0 8px #00aaff; transition: transform 0.1s ease;">➤</div>
            <div class="marker-panel" style="display: flex; flex-direction: column; align-items: center; transition: all 0.2s ease;">
                <div style="font-size: 20px; margin-bottom: 2px; animation: glowPulse 1.2s infinite alternate;">⏣</div>
                <div style="background: rgba(0, 10, 20, 0.95); padding: 4px 10px; border: 1px solid #00aaff; border-radius: 2px; letter-spacing: 1px; font-weight: bold; white-space: nowrap;">
                    <span style="opacity: 0.7; font-size: 8px; display: block; margin-bottom: 2px; color: #00aaff;">EXIT PORTAL</span>
                    ${name.toUpperCase()}
                </div>
            </div>
            <div class="marker-dist" style="font-size: 10px; margin-top: 4px; font-weight: bold; color: #fff; text-shadow: 0 0 5px #00aaff;">0m</div>
            <style>
                @keyframes glowPulse {
                    from { transform: scale(1); filter: brightness(1); }
                    to { transform: scale(1.2); filter: brightness(1.6); }
                }
            </style>
        `;
        document.body.appendChild(div);
        return div;
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

        // Particle swirl around rift
        if (Math.random() < 0.35 && window.emitParticle) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 0.5 + Math.random() * 1.0;
            emitParticle(
                this.targetPos.x + Math.cos(angle) * dist,
                this.targetPos.y + (Math.random() - 0.5) * 1.0,
                this.targetPos.z + Math.sin(angle) * dist,
                -Math.cos(angle) * 1.5,
                (Math.random() - 0.5) * 0.5,
                -Math.sin(angle) * 1.5,
                0.0, 0.95, 1.0, // cyan particles swirling in
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

        // Proximity detection for exit (2.2 units)
        if (dist < 2.2) {
            this.complete();
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

        if (window.NeuralConsole) {
            window.NeuralConsole.log("RIFT STABILIZED. DISPATCHING ESCAPE CAPTURE PROTOCOL...", 'sys');
        }

        this.onComplete();
    }
}
