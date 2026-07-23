// Objective2.js - "Synaptic Severance"
class Objective2 {
    constructor(scene, player, camera, spawnNodes, onComplete) {
        this.scene = scene;
        this.player = player;
        this.camera = camera;
        this.spawnNodes = spawnNodes;
        this.onComplete = onComplete;
        this.targets = []; // { node, shieldMesh, capacitors: [], marker }
        this.active = true;

        this.init();
    }

    init() {
        const activeNodes = this.spawnNodes.filter(n => n.active);
        // Take up to 2 nodes as targets
        const selection = activeNodes.slice(0, 2);
        
        selection.forEach((node, idx) => {
            node.isShielded = true; // Shield flag for bullet collision checks

            // 1. Create a visual shield mesh around the Hive Node
            const shieldGeo = new THREE.SphereGeometry(6, 16, 16);
            const shieldMat = new THREE.MeshBasicMaterial({
                color: 0xff3300,
                transparent: true,
                opacity: 0.22,
                wireframe: true,
                blending: THREE.AdditiveBlending
            });
            const shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
            shieldMesh.position.set(node.x, 2, node.z);
            this.scene.add(shieldMesh);

            // 2. Spawn 2 organic Bio-Capacitors around the Hive Node (8-12m away)
            const capacitors = [];
            for (let c = 0; c < 2; c++) {
                const angle = (c * Math.PI) + (Math.random() - 0.5) * 0.5;
                const dist = 9.0 + Math.random() * 2.0;
                const capX = node.x + Math.cos(angle) * dist;
                const capZ = node.z + Math.sin(angle) * dist;
                let capY = 1.0;
                if (window.TerrainGen) {
                    capY = window.TerrainGen.getHeight(capX, capZ) + 1.0;
                }

                const capMesh = this.createCapacitorMesh();
                capMesh.position.set(capX, capY, capZ);
                this.scene.add(capMesh);

                const capObj = {
                    mesh: capMesh,
                    velocity: new THREE.Vector3(),
                    isHeld: false,
                    health: 45, // Easy but takes 2-3 AR shots
                    type: 'crate', // Registers as damageable crate in engine
                    pos: new THREE.Vector3(capX, capY, capZ),
                    marker: this.createCapacitorMarker(new THREE.Vector3(capX, capY, capZ), `CAPACITOR ${idx+1}-${c+1}`)
                };
                if (!window.physicsCrates) window.physicsCrates = [];
                window.physicsCrates.push(capObj);
                capacitors.push(capObj);
            }

            // Giant glowing red vertical beacon to the target hive mesh
            let beacon = null;
            if (node.mesh) {
                const beamGeo = new THREE.CylinderGeometry(0.3, 0.9, 200, 16, 1, true);
                beamGeo.translate(0, 100, 0);
                const beamMat = new THREE.MeshBasicMaterial({
                    color: 0xff3300,
                    transparent: true,
                    opacity: 0.45,
                    blending: THREE.AdditiveBlending,
                    side: THREE.DoubleSide,
                    depthWrite: false
                });
                beacon = new THREE.Mesh(beamGeo, beamMat);
                node.mesh.add(beacon);
            }

            this.targets.push({
                node: node,
                shieldMesh: shieldMesh,
                capacitors: capacitors,
                beacon: beacon,
                marker: this.createMarker(`HIVE_NODE_${idx + 1}`)
            });
        });

        if (window.NeuralConsole) {
            window.NeuralConsole.log("OBJ_INIT: SYNAPTIC_SEVERANCE_REQUIRED.", 'sys');
            window.NeuralConsole.log(`DATA: ${this.targets.length}_HIVE_NODES_DESIGNATED. WAR WARNING: SHIELD CORES INTACT.`, 'res');
        }
    }

    createCapacitorMesh() {
        const group = new THREE.Group();
        const sphereGeo = new THREE.SphereGeometry(0.8, 12, 12);
        const sphereMat = new THREE.MeshStandardMaterial({
            color: 0xff0055,
            emissive: 0xff0022,
            emissiveIntensity: 1.8,
            metalness: 0.8,
            roughness: 0.2
        });
        const sphere = new THREE.Mesh(sphereGeo, sphereMat);
        group.add(sphere);

        // Orbiting rings
        const ringGeo = new THREE.TorusGeometry(1.0, 0.05, 6, 16);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0xff0055, transparent: true, opacity: 0.7 });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2;
        group.add(ring);

        const light = new THREE.PointLight(0xff0055, 3.0, 8);
        group.add(light);
        return group;
    }

    createMarker(name) {
        const div = document.createElement('div');
        div.className = 'obj-marker';
        div.style.position = 'absolute';
        div.style.pointerEvents = 'none';
        div.style.transform = 'translate(-50%, -50%)';
        div.style.color = '#ff3300'; // Pure crimson warning color
        div.style.fontFamily = 'monospace';
        div.style.fontSize = '14px';
        div.style.display = 'flex';
        div.style.flexDirection = 'column';
        div.style.alignItems = 'center';
        div.style.textShadow = '0 0 8px #ff3300';
        div.style.zIndex = '9999';

        div.innerHTML = `
            <div class="marker-arrow" style="font-size: 26px; margin-bottom: 2px; display: none; text-shadow: 0 0 10px #ff3300; transition: transform 0.1s ease;">➤</div>
            <div class="marker-panel" style="display: flex; flex-direction: column; align-items: center; transition: all 0.2s ease;">
                <div style="font-size: 28px; margin-bottom: 2px;">▼</div>
                <div style="background: rgba(15, 0, 0, 0.95); padding: 8px 16px; border: 2px solid #ff3300; border-radius: 4px; letter-spacing: 1px; font-weight: bold; white-space: nowrap; box-shadow: 0 0 12px #ff3300, inset 0 0 8px rgba(255, 51, 0, 0.25);">
                    <span style="opacity: 0.7; font-size: 10px; display: block; margin-bottom: 3px; color: #ff3300; letter-spacing: 2px;">HIVE NODE</span>
                    <span class="node-name">${name.toUpperCase()}</span>
                    <span class="node-status" style="display: block; font-size: 10px; color: #ff0055; margin-top: 4px;">SHIELDED</span>
                </div>
            </div>
            <div class="marker-dist" style="font-size: 11px; margin-top: 4px; font-weight: bold; color: #fff; text-shadow: 0 0 5px #ff3300;">0m</div>
        `;
        document.body.appendChild(div);
        return div;
    }

    createCapacitorMarker(pos, name) {
        const div = document.createElement('div');
        div.className = 'obj-marker capacitor-marker';
        div.style.position = 'absolute';
        div.style.pointerEvents = 'none';
        div.style.transform = 'translate(-50%, -50%)';
        div.style.color = '#ff0055';
        div.style.fontFamily = 'monospace';
        div.style.fontSize = '11px';
        div.style.display = 'flex';
        div.style.flexDirection = 'column';
        div.style.alignItems = 'center';
        div.style.textShadow = '0 0 5px #ff0055';
        div.style.zIndex = '9998';

        div.innerHTML = `
            <div class="marker-panel" style="background: rgba(10, 0, 5, 0.9); padding: 4px 8px; border: 1px solid #ff0055; border-radius: 2px; font-weight: bold; white-space: nowrap;">
                ◈ ${name.toUpperCase()} ◈
            </div>
            <div class="marker-dist" style="font-size: 9px; margin-top: 2px; color: #fff;">0m</div>
        `;
        document.body.appendChild(div);
        return { div, pos };
    }

    getHUDData() {
        let totalCaps = 0;
        let destroyedCaps = 0;
        this.targets.forEach(t => {
            t.capacitors.forEach(c => {
                totalCaps++;
                const isBroken = c.health <= 0 || !window.physicsCrates.includes(c);
                if (isBroken) destroyedCaps++;
            });
        });

        if (destroyedCaps < totalCaps) {
            return {
                name: "SYNAPTIC SEVERANCE",
                count: `DESTROY SHIELD CAPACITORS: ${destroyedCaps}/${totalCaps}`,
                progress: (destroyedCaps / totalCaps) * 0.5
            };
        }

        const totalNodes = this.targets.length;
        const destroyedNodes = this.targets.filter(t => !t.node.active).length;

        return {
            name: "SYNAPTIC SEVERANCE",
            count: `DESTROY HIVE NODES: ${destroyedNodes}/${totalNodes}`,
            progress: 0.5 + (destroyedNodes / totalNodes) * 0.5
        };
    }

    update(delta, elapsedTime, activeCamera) {
        if (!this.active) return;
        const camera = activeCamera || this.camera;

        let allDestroyed = true;

        this.targets.forEach(target => {
            if (!target.node.active) {
                target.marker.style.display = 'none';
                if (target.beacon && target.node.mesh) {
                    target.node.mesh.remove(target.beacon);
                    target.beacon = null;
                }
                if (target.shieldMesh) {
                    this.scene.remove(target.shieldMesh);
                    target.shieldMesh = null;
                }
                return;
            }
            
            allDestroyed = false;

            // 1. Monitor Shield Capacitors
            let aliveCaps = 0;
            target.capacitors.forEach(c => {
                const isBroken = c.health <= 0 || !window.physicsCrates.includes(c);
                if (isBroken) {
                    if (c.marker) {
                        c.marker.div.remove();
                        c.marker = null;
                    }
                    if (c.mesh) {
                        this.scene.remove(c.mesh);
                        c.mesh = null;
                    }
                } else {
                    aliveCaps++;
                    // Animate Capacitor mesh
                    if (c.mesh) {
                        c.mesh.rotation.y += delta * 2.0;
                        c.mesh.rotation.x += delta * 1.0;
                        c.mesh.position.y = c.pos.y + Math.sin(elapsedTime * 4 + c.pos.x) * 0.1;
                    }
                    // Update Capacitor HTML Marker
                    this.updateHTMLMarker(c.marker.div, c.pos, camera);
                }
            });

            if (aliveCaps === 0 && target.node.isShielded) {
                target.node.isShielded = false; // Drop shield!
                if (target.shieldMesh) {
                    this.scene.remove(target.shieldMesh);
                    target.shieldMesh = null;
                }
                const statusEl = target.marker.querySelector('.node-status');
                if (statusEl) {
                    statusEl.textContent = 'VULNERABLE';
                    statusEl.style.color = '#00ffaa';
                }
                if (window.NeuralConsole) {
                    window.NeuralConsole.log("SHIELD CORES DISSIPATED. HIVE NODE INTEGRITY VULNERABLE.", 'sys');
                }
            }

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
                    const s = 1.0 + Math.sin(elapsedTime * 5) * 0.08;
                    panel.style.transform = `scale(${s})`;
                    panel.style.opacity = '1';
                }
            }
        });

        if (allDestroyed && this.targets.length > 0) {
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
        this.targets.forEach(t => {
            if (t.marker) t.marker.remove();
            if (t.beacon && t.node.mesh) {
                t.node.mesh.remove(t.beacon);
            }
            t.capacitors.forEach(c => {
                if (c.marker) c.marker.div.remove();
                if (c.mesh) this.scene.remove(c.mesh);
            });
        });
        
        if (window.NeuralConsole) {
            window.NeuralConsole.log("OBJ_COMPLETED: SECTOR_STABILIZED.", 'sys');
            window.NeuralConsole.log("MEM_PURGE: THREAT_LEVEL_REDUCED. DATA_STREAM_CLEAN.", 'res');
        }
        
        this.onComplete();
    }
}
