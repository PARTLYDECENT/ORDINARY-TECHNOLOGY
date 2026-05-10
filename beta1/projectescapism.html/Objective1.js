// Objective1.js - "Hydrogen Scoop Assembly"
class Objective1 {
    constructor(scene, player, camera, spawnNodes, onComplete) {
        this.scene = scene;
        this.player = player;
        this.camera = camera;
        this.spawnNodes = spawnNodes;
        this.onComplete = onComplete;
        this.parts = []; // { mesh, collected, name, pos }
        this.active = true;
        this.partsCollected = 0;

        this.init();
    }

    init() {
        // Define 3 tech parts to find
        const partNames = ["Fuel Cell", "Ionizer", "Scoop Core"];
        
        // Use the hive nodes as reference points
        // Fixed offsets to ensure they are FAR from the hives
        const offsets = [
            { x: 50, z: 0 },   // Hive 1 offset
            { x: -50, z: 0 },  // Hive 2 offset
            { x: 0, z: 50 }    // Hive 3 offset
        ];

        for (let i = 0; i < 3; i++) {
            const node = this.spawnNodes[i % this.spawnNodes.length];
            const offset = offsets[i % offsets.length];
            const px = node.x + offset.x;
            const pz = node.z + offset.z;
            
            let py = 1.0;
            if (window.TerrainGen) {
                py = window.TerrainGen.getMeshHeight(px, pz);
            }

            const pos = new THREE.Vector3(px, py + 1.5, pz);
            const mesh = this.createPartMesh(partNames[i]);
            mesh.position.copy(pos);
            this.scene.add(mesh);

            this.parts.push({
                mesh: mesh,
                collected: false,
                name: partNames[i],
                pos: pos,
                marker: this.createMarker(partNames[i])
            });

            if (window.NeuralConsole) {
                window.NeuralConsole.log(`DEPLOYED: ${partNames[i]} at [${Math.round(px)}, ${Math.round(pz)}]`, 'res');
            }
        }
        
        if (window.NeuralConsole) {
            window.NeuralConsole.log("OBJ_INIT: HYDROGEN_SCOOP_ASSEMBLY_REQUIRED.", 'sys');
            window.NeuralConsole.log("DATA: 3_PARTS_SCATTERED_IN_LOCAL_SECTOR.", 'res');
        }
    }

    getRandomPosition(minDist, maxDist) {
        // Get random direction
        const angle = Math.random() * Math.PI * 2;
        const dist = minDist + Math.random() * (maxDist - minDist);
        const x = this.player.position.x + Math.cos(angle) * dist;
        const z = this.player.position.z + Math.sin(angle) * dist;
        
        // Get height from TerrainGen if available, else default
        let y = 1.0;
        if (window.TerrainGen) {
            y = window.TerrainGen.getMeshHeight(x, z);
        }
        
        return { x, y, z };
    }

    createPartMesh(name) {
        const group = new THREE.Group();
        
        // High-tech core
        const coreGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
        const coreMat = new THREE.MeshStandardMaterial({ 
            color: 0x00ffff, 
            emissive: 0x00ffff, 
            emissiveIntensity: 2,
            metalness: 1,
            roughness: 0
        });
        const core = new THREE.Mesh(coreGeo, coreMat);
        group.add(core);

        // Floating rings
        for (let i = 0; i < 2; i++) {
            const ringGeo = new THREE.TorusGeometry(0.4 + i * 0.15, 0.02, 8, 24);
            const ringMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.6 });
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.rotation.x = Math.PI / 2;
            ring.userData.rotSpeed = 0.5 + i * 0.5;
            group.add(ring);
        }

        // Add a point light
        const light = new THREE.PointLight(0x00ffff, 1, 5);
        group.add(light);
        
        return group;
    }

    createMarker(name) {
        const div = document.createElement('div');
        div.className = 'obj-marker';
        div.style.position = 'absolute';
        div.style.pointerEvents = 'none';
        div.style.transform = 'translate(-50%, -50%)';
        div.style.color = '#00ffff';
        div.style.fontFamily = 'monospace';
        div.style.fontSize = '10px';
        div.style.display = 'flex';
        div.style.flexDirection = 'column';
        div.style.alignItems = 'center';
        div.style.textShadow = '0 0 5px #00ffff';
        div.style.zIndex = '9999';

        div.innerHTML = `
            <div style="font-size: 20px; margin-bottom: 2px; animation: pulse 1s infinite alternate;">⬢</div>
            <div style="background: rgba(0, 20, 30, 0.9); padding: 4px 10px; border: 1px solid #00ffff; border-radius: 2px; letter-spacing: 1px; font-weight: bold; white-space: nowrap;">
                <span style="opacity: 0.7; font-size: 8px; display: block; margin-bottom: 2px;">COMPONENT</span>
                ${name.toUpperCase()}
            </div>
            <div class="marker-dist" style="font-size: 10px; margin-top: 4px; font-weight: bold; color: #fff; text-shadow: 0 0 5px #00ffff;">0m</div>
            <style>
                @keyframes pulse {
                    from { transform: scale(1); filter: brightness(1); }
                    to { transform: scale(1.2); filter: brightness(1.5); }
                }
            </style>
        `;
        document.body.appendChild(div);
        return div;
    }

    update(delta, elapsedTime) {
        if (!this.active) return;

        this.parts.forEach(part => {
            if (part.collected) {
                part.marker.style.display = 'none';
                return;
            }

            // Animate mesh
            part.mesh.rotation.y += delta * 1.5;
            part.mesh.position.y = part.pos.y + Math.sin(elapsedTime * 2) * 0.2;
            
            part.mesh.children.forEach(child => {
                if (child.userData.rotSpeed) {
                    child.rotation.y += delta * child.userData.rotSpeed;
                    child.rotation.z += delta * child.userData.rotSpeed * 0.5;
                }
            });

            // Distance check for collection
            const dist = this.player.position.distanceTo(part.pos);
            
            // Update UI Marker
            const vec = part.pos.clone().project(this.camera);
            if (vec.z > 1) {
                part.marker.style.display = 'none';
            } else {
                part.marker.style.display = 'flex';
                const x = (vec.x * 0.5 + 0.5) * window.innerWidth;
                const y = (-vec.y * 0.5 + 0.5) * window.innerHeight;
                part.marker.style.left = `${x}px`;
                part.marker.style.top = `${y}px`;
                part.marker.querySelector('.marker-dist').textContent = `${Math.round(dist)}m`;
            }

            // Collect
            if (dist < 3.0) {
                this.collectPart(part);
            }
        });
    }

    collectPart(part) {
        part.collected = true;
        this.partsCollected++;
        this.scene.remove(part.mesh);
        part.marker.remove();

        if (window.NeuralConsole) {
            window.NeuralConsole.log(`DATA_AQUIRED: [${part.name.toUpperCase()}]. UPLOADING_TO_BUFFER...`, 'res');
        }

        // Collection effects
        if (window.emitParticle) {
            for (let i = 0; i < 20; i++) {
                window.emitParticle(
                    part.pos.x, part.pos.y, part.pos.z,
                    (Math.random() - 0.5) * 10, Math.random() * 8, (Math.random() - 0.5) * 10,
                    0, 1, 1, 3, 0.5
                );
            }
        }

        if (this.partsCollected >= 3) {
            this.complete();
        }
    }

    complete() {
        this.active = false;
        if (window.NeuralConsole) {
            window.NeuralConsole.log("OBJ_COMPLETED: HYDROGEN_SCOOP_BUILT.", 'sys');
            window.NeuralConsole.log("UPGRADE: REGEN_PROTOCOL_ACTIVE. BIO_RECOVERY_ENGAGED.", 'res');
        }
        
        // Upgrade effects
        window.isHydrogenScoopBuilt = true;
        this.onComplete();
    }
}
