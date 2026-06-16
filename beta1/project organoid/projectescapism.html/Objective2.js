// Objective2.js - "Synaptic Severance"
class Objective2 {
    constructor(scene, player, camera, spawnNodes, onComplete) {
        this.scene = scene;
        this.player = player;
        this.camera = camera;
        this.spawnNodes = spawnNodes;
        this.onComplete = onComplete;
        this.targets = [];
        this.active = true;
        this.hivesDestroyedCount = 0;

        this.init();
    }

    init() {
        // Select 2 active nodes as targets for this objective
        const activeNodes = this.spawnNodes.filter(n => n.active);
        
        // Take up to 2
        const selection = activeNodes.slice(0, 2);
        
        selection.forEach((node, idx) => {
            // Add a giant glowing red vertical beacon to the target hive mesh!
            let beacon = null;
            if (node.mesh) {
                const beamGeo = new THREE.CylinderGeometry(0.2, 0.7, 200, 16, 1, true);
                beamGeo.translate(0, 100, 0);
                const beamMat = new THREE.MeshBasicMaterial({
                    color: 0xff3300,
                    transparent: true,
                    opacity: 0.35,
                    blending: THREE.AdditiveBlending,
                    side: THREE.DoubleSide,
                    depthWrite: false
                });
                beacon = new THREE.Mesh(beamGeo, beamMat);
                node.mesh.add(beacon);
            }

            this.targets.push({
                node: node,
                beacon: beacon,
                marker: this.createMarker(`HIVE_NODE_${idx + 1}`)
            });
        });

        if (window.NeuralConsole) {
            window.NeuralConsole.log("OBJ_INIT: SYNAPTIC_SEVERANCE_REQUIRED.", 'sys');
            window.NeuralConsole.log(`DATA: ${this.targets.length}_HIVE_NODES_DESIGNATED_FOR_PURGE.`, 'res');
        }
    }

    createMarker(name) {
        const div = document.createElement('div');
        div.className = 'obj-marker';
        div.style.position = 'absolute';
        div.style.pointerEvents = 'none';
        div.style.transform = 'translate(-50%, -50%)';
        div.style.color = '#ff3300'; // Scary red
        div.style.fontFamily = 'monospace';
        div.style.fontSize = '10px';
        div.style.display = 'flex';
        div.style.flexDirection = 'column';
        div.style.alignItems = 'center';
        div.style.textShadow = '0 0 5px #ff3300';
        div.style.zIndex = '9999';

        div.innerHTML = `
            <div class="marker-arrow" style="font-size: 20px; margin-bottom: 2px; display: none; text-shadow: 0 0 8px #ff3300; transition: transform 0.1s ease;">➤</div>
            <div class="marker-panel" style="display: flex; flex-direction: column; align-items: center; transition: all 0.2s ease;">
                <div style="font-size: 24px; margin-bottom: 2px;">▼</div>
                <div style="background: rgba(0,0,0,0.85); padding: 4px 10px; border: 1px solid #ff3300; border-radius: 2px; letter-spacing: 1px; font-weight: bold; white-space: nowrap;">
                    <span style="opacity: 0.7; font-size: 8px; display: block; margin-bottom: 2px; color: #ff3300;">HIVE NODE TARGET</span>
                    ${name.toUpperCase()}
                </div>
            </div>
            <div class="marker-dist" style="font-size: 10px; margin-top: 4px; font-weight: bold; color: #fff; text-shadow: 0 0 5px #ff3300;">0m</div>
        `;
        document.body.appendChild(div);
        return div;
    }

    update(delta, elapsedTime, activeCamera) {
        if (!this.active) return;
        const camera = activeCamera || this.camera;

        let allDestroyed = true;
        let currentDestroyedCount = 0;

        this.targets.forEach(target => {
            if (!target.node.active) {
                target.marker.style.display = 'none';
                if (target.beacon && target.node.mesh) {
                    target.node.mesh.remove(target.beacon);
                    target.beacon = null;
                }
                currentDestroyedCount++;
                return;
            }
            
            allDestroyed = false;

            const pos = new THREE.Vector3(target.node.x, 2, target.node.z);
            const dist = this.player.position.distanceTo(pos);
            
            // Screen-edge clamping and pointer rotation math
            const camPos = pos.clone().applyMatrix4(camera.matrixWorldInverse);
            const isBehind = camPos.z > 0;
            
            let vec = pos.clone().project(camera);
            if (isBehind) {
                vec.x = -vec.x;
                vec.y = -vec.y;
            }
            
            const borderMargin = 0.08; // 8% margin from the edge
            const limitX = 1.0 - borderMargin;
            const limitY = 1.0 - borderMargin;
            
            const isOffscreen = isBehind || vec.x < -limitX || vec.x > limitX || vec.y < -limitY || vec.y > limitY;
            
            let x = 0;
            let y = 0;
            let arrowAngle = 0;
            
            if (isOffscreen) {
                // Determine clamp scale
                const scaleX = Math.abs(limitX / (vec.x || 0.0001));
                const scaleY = Math.abs(limitY / (vec.y || 0.0001));
                const scale = Math.min(scaleX, scaleY);
                
                const clampedX = vec.x * scale;
                const clampedY = vec.y * scale;
                
                x = (clampedX * 0.5 + 0.5) * window.innerWidth;
                y = (-clampedY * 0.5 + 0.5) * window.innerHeight;
                
                // Angle pointing outwards from screen center
                arrowAngle = Math.atan2(-clampedY, clampedX);
            } else {
                x = (vec.x * 0.5 + 0.5) * window.innerWidth;
                y = (-vec.y * 0.5 + 0.5) * window.innerHeight;
            }
            
            // Update UI Marker styling
            target.marker.style.display = 'flex';
            target.marker.style.left = `${x}px`;
            target.marker.style.top = `${y}px`;
            target.marker.querySelector('.marker-dist').textContent = `${Math.round(dist)}m`;
            
            const arrow = target.marker.querySelector('.marker-arrow');
            const panel = target.marker.querySelector('.marker-panel');
            
            if (isOffscreen) {
                target.marker.classList.add('offscreen');
                if (arrow) {
                    arrow.style.display = 'block';
                    arrow.style.transform = `rotate(${arrowAngle}rad)`;
                }
                if (panel) {
                    panel.style.transform = 'scale(0.8)';
                    panel.style.opacity = '0.8';
                }
            } else {
                target.marker.classList.remove('offscreen');
                if (arrow) {
                    arrow.style.display = 'none';
                }
                if (panel) {
                    // Pulsate marker when onscreen
                    const s = 1.0 + Math.sin(elapsedTime * 5) * 0.1;
                    panel.style.transform = `scale(${s})`;
                    panel.style.opacity = '1';
                }
            }
        });

        if (allDestroyed && this.targets.length > 0) {
            this.complete();
        }
    }

    complete() {
        this.active = false;
        this.targets.forEach(t => {
            t.marker.remove();
            if (t.beacon && t.node.mesh) {
                t.node.mesh.remove(t.beacon);
            }
        });
        
        if (window.NeuralConsole) {
            window.NeuralConsole.log("OBJ_COMPLETED: SECTOR_STABILIZED.", 'sys');
            window.NeuralConsole.log("MEM_PURGE: THREAT_LEVEL_REDUCED. DATA_STREAM_CLEAN.", 'res');
        }
        
        this.onComplete();
    }
}
