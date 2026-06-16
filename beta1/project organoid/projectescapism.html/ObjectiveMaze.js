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
        // Dynamically find an open cell (not a wall) in the maze at a distance of 14-25 cells (56-100 units)
        let cellX = 14;
        let cellZ = 14;
        
        if (window.mapManager && typeof window.mapManager._isWall === 'function') {
            let found = false;
            // Scan in expanding circles to find an open cell
            for (let r = 15; r < 28; r++) {
                for (let theta = 0; theta < Math.PI * 2; theta += Math.PI / 12) {
                    const cx = Math.round(Math.cos(theta) * r);
                    const cz = Math.round(Math.sin(theta) * r);
                    if (!window.mapManager._isWall(cx, cz)) {
                        cellX = cx;
                        cellZ = cz;
                        found = true;
                        break;
                    }
                }
                if (found) break;
            }
        }

        // Cell center world position (4.0 units per cell)
        this.targetPos.set(cellX * 4.0 + 2.0, 1.8, cellZ * 4.0 + 2.0);

        // Create Rift Group
        this.riftGroup = new THREE.Group();
        this.riftGroup.position.copy(this.targetPos);

        // Core Glowing Sphere
        const coreGeo = new THREE.SphereGeometry(0.4, 16, 16);
        const coreMat = new THREE.MeshBasicMaterial({ 
            color: 0x00aaff,
            transparent: true,
            opacity: 0.95
        });
        const core = new THREE.Mesh(coreGeo, coreMat);
        this.riftGroup.add(core);

        // Outer rotating ring
        const ringGeo = new THREE.TorusGeometry(0.9, 0.04, 8, 24);
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide
        });
        this.ring = new THREE.Mesh(ringGeo, ringMat);
        this.ring.rotation.x = Math.PI / 2;
        this.riftGroup.add(this.ring);

        // Vertical sky beacon
        const beaconGeo = new THREE.CylinderGeometry(0.1, 0.4, 200, 16, 1, true);
        beaconGeo.translate(0, 100, 0);
        const beaconMat = new THREE.MeshBasicMaterial({
            color: 0x00aaff,
            transparent: true,
            opacity: 0.25,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide,
            depthWrite: false
        });
        const beacon = new THREE.Mesh(beaconGeo, beaconMat);
        this.riftGroup.add(beacon);

        // Dynamic Blue light
        const light = new THREE.PointLight(0x00ffff, 3.0, 12);
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
        if (this.ring) {
            this.ring.rotation.x += delta * 1.5;
            this.ring.rotation.y += delta * 0.8;
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
