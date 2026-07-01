// ObjectiveDesolation.js - Level 2: Synaptic Cleansing in Desolation
class ObjectiveDesolation {
    constructor(scene, player, camera, spawnNodes, onComplete) {
        this.scene = scene;
        this.player = player;
        this.camera = camera;
        this.spawnNodes = spawnNodes;
        this.onComplete = onComplete;
        this.active = true;
        this.marker = null;
        this.beacon = null;
        this.nestNode = null;

        this.init();
    }

    init() {
        // Find the single nest spawned on the Desolation map
        if (this.spawnNodes && this.spawnNodes.length > 0) {
            this.nestNode = this.spawnNodes[0];
        }

        if (this.nestNode) {
            // Add a giant glowing red vertical beacon to the nest mesh
            if (this.nestNode.mesh) {
                const beamGeo = new THREE.CylinderGeometry(0.25, 0.8, 200, 16, 1, true);
                beamGeo.translate(0, 100, 0);
                const beamMat = new THREE.MeshBasicMaterial({
                    color: 0xff3300,
                    transparent: true,
                    opacity: 0.4,
                    blending: THREE.AdditiveBlending,
                    side: THREE.DoubleSide,
                    depthWrite: false
                });
                this.beacon = new THREE.Mesh(beamGeo, beamMat);
                this.nestNode.mesh.add(this.beacon);
            }
            this.marker = this.createMarker("DESOLATION NEST");
        }

        if (window.NeuralConsole) {
            window.NeuralConsole.clear();
            window.NeuralConsole.log("DESOLATION PROTOCOL: EXTREME THREAT VORTEX DETECTED.", 'sys');
            window.NeuralConsole.log("OBJECTIVE: PURGE THE CENTRAL SWARM NEST NODE.", 'res');
        }
    }

    createMarker(name) {
        const div = document.createElement('div');
        div.className = 'obj-marker';
        div.style.position = 'absolute';
        div.style.pointerEvents = 'none';
        div.style.transform = 'translate(-50%, -50%)';
        div.style.color = '#ff1100'; // Pure crimson warning color
        div.style.fontFamily = 'monospace';
        div.style.fontSize = '10px';
        div.style.display = 'flex';
        div.style.flexDirection = 'column';
        div.style.alignItems = 'center';
        div.style.textShadow = '0 0 5px #ff1100';
        div.style.zIndex = '9999';

        div.innerHTML = `
            <div class="marker-arrow" style="font-size: 20px; margin-bottom: 2px; display: none; text-shadow: 0 0 8px #ff1100; transition: transform 0.1s ease;">➤</div>
            <div class="marker-panel" style="display: flex; flex-direction: column; align-items: center; transition: all 0.2s ease;">
                <div style="font-size: 24px; margin-bottom: 2px;">▼</div>
                <div style="background: rgba(10, 0, 0, 0.95); padding: 4px 10px; border: 1px solid #ff1100; border-radius: 2px; letter-spacing: 1px; font-weight: bold; white-space: nowrap;">
                    <span style="opacity: 0.7; font-size: 8px; display: block; margin-bottom: 2px; color: #ff1100;">TARGET DETECTED</span>
                    ${name.toUpperCase()}
                </div>
            </div>
            <div class="marker-dist" style="font-size: 10px; margin-top: 4px; font-weight: bold; color: #fff; text-shadow: 0 0 5px #ff1100;">0m</div>
        `;
        document.body.appendChild(div);
        return div;
    }

    update(delta, elapsedTime, activeCamera) {
        if (!this.active) return;
        const camera = activeCamera || this.camera;

        if (!this.nestNode) return;

        // Check if nest is destroyed
        if (!this.nestNode.active || this.nestNode.hp <= 0) {
            this.complete();
            return;
        }

        const pos = new THREE.Vector3(this.nestNode.x, 2, this.nestNode.z);
        const dist = this.player.position.distanceTo(pos);

        // Screen-edge clamping and pointer rotation math
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
                const s = 1.0 + Math.sin(elapsedTime * 5) * 0.1;
                panel.style.transform = `scale(${s})`;
                panel.style.opacity = '1';
            }
        }
    }

    complete() {
        this.active = false;
        if (this.marker) {
            this.marker.remove();
            this.marker = null;
        }
        if (this.beacon && this.nestNode && this.nestNode.mesh) {
            this.nestNode.mesh.remove(this.beacon);
            this.beacon = null;
        }

        if (window.NeuralConsole) {
            window.NeuralConsole.log("DESOLATION NEST PURGED. DETECTING INTENSE STRUCTURAL FOLD...", 'sys');
        }

        setTimeout(() => {
            this.onComplete();
        }, 1500);
    }
}
