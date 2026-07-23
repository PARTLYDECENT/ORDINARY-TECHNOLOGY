// Objective1.js - "Hydrogen Scoop Assembly"
class Objective1 {
    constructor(scene, player, camera, spawnNodes, onComplete) {
        this.scene = scene;
        this.player = player;
        this.camera = camera;
        this.spawnNodes = spawnNodes;
        this.onComplete = onComplete;
        this.parts = []; // { mesh, collected, name, pos, syncProgress, guardSpawned, marker }
        this.active = true;
        this.partsCollected = 0;

        this.init();
    }

    init() {
        // Define 3 tech parts to find
        const partNames = ["Fuel Cell", "Ionizer", "Scoop Core"];
        
        for (let i = 0; i < 3; i++) {
            // Get random position far from the player (60 to 150 units away)
            const posData = this.getRandomPosition(60, 150);
            const pos = new THREE.Vector3(posData.x, posData.y + 1.5, posData.z);
            
            const mesh = this.createPartMesh(partNames[i]);
            mesh.position.copy(pos);
            this.scene.add(mesh);

            this.parts.push({
                mesh: mesh,
                collected: false,
                name: partNames[i],
                pos: pos,
                syncProgress: 0.0,
                guardSpawned: false,
                marker: this.createMarker(partNames[i])
            });

            if (window.NeuralConsole) {
                window.NeuralConsole.log(`DEPLOYED: ${partNames[i]} at [${Math.round(posData.x)}, ${Math.round(posData.z)}]`, 'res');
            }
        }
        
        if (window.NeuralConsole) {
            window.NeuralConsole.log("OBJ_INIT: HYDROGEN_SCOOP_ASSEMBLY_REQUIRED.", 'sys');
            window.NeuralConsole.log("DATA: 3_PARTS_SCATTERED_IN_LOCAL_SECTOR. SYNC ZONE CAPTURE MANDATORY.", 'res');
        }
    }

    getRandomPosition(minDist, maxDist) {
        let x = 0, z = 0;
        let isValid = false;
        let attempts = 0;

        while (!isValid && attempts < 50) {
            const angle = Math.random() * Math.PI * 2;
            const dist = minDist + Math.random() * (maxDist - minDist);
            x = this.player.position.x + Math.cos(angle) * dist;
            z = this.player.position.z + Math.sin(angle) * dist;

            isValid = true;
            for (let node of this.spawnNodes) {
                const dx = x - node.x;
                const dz = z - node.z;
                if (Math.sqrt(dx*dx + dz*dz) < 40) {
                    isValid = false;
                    break;
                }
            }
            attempts++;
        }
        
        let y = 1.0;
        if (window.TerrainGen) {
            y = window.TerrainGen.getMeshHeight(x, z);
        }
        
        return { x, y, z };
    }

    createPartMesh(name) {
        const group = new THREE.Group();
        
        // High-tech core
        const coreGeo = new THREE.BoxGeometry(0.6, 0.6, 0.6);
        const coreMat = new THREE.MeshStandardMaterial({ 
            color: 0x00ffff, 
            emissive: 0x00ffff, 
            emissiveIntensity: 2.2,
            metalness: 1,
            roughness: 0
        });
        const core = new THREE.Mesh(coreGeo, coreMat);
        group.add(core);

        // Floating rings
        for (let i = 0; i < 2; i++) {
            const ringGeo = new THREE.TorusGeometry(0.5 + i * 0.2, 0.03, 8, 24);
            const ringMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.7 });
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.rotation.x = Math.PI / 2;
            ring.userData.rotSpeed = 0.6 + i * 0.6;
            group.add(ring);
        }

        // Giant vertical beacon beam
        const beamGeo = new THREE.CylinderGeometry(0.15, 0.4, 200, 16, 1, true);
        beamGeo.translate(0, 100, 0);
        const beamMat = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.4,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide,
            depthWrite: false
        });
        const beam = new THREE.Mesh(beamGeo, beamMat);
        group.add(beam);

        // Glowing core aura
        const auraGeo = new THREE.SphereGeometry(1.6, 16, 16);
        const auraMat = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.22,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        const aura = new THREE.Mesh(auraGeo, auraMat);
        group.add(aura);

        // 3D Floating Downward Arrow pointer
        const arrowGeo = new THREE.ConeGeometry(0.4, 1.0, 4);
        arrowGeo.rotateX(Math.PI);
        arrowGeo.translate(0, 2.5, 0);
        const arrowMat = new THREE.MeshStandardMaterial({
            color: 0x00ffff,
            emissive: 0x00ffff,
            emissiveIntensity: 1.8,
            metalness: 0.8,
            roughness: 0.2
        });
        const arrow = new THREE.Mesh(arrowGeo, arrowMat);
        arrow.userData.isArrow = true;
        group.add(arrow);

        const light = new THREE.PointLight(0x00ffff, 3.5, 10);
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
        div.style.fontSize = '14px';
        div.style.display = 'flex';
        div.style.flexDirection = 'column';
        div.style.alignItems = 'center';
        div.style.textShadow = '0 0 8px #00ffff';
        div.style.zIndex = '9999';

        div.innerHTML = `
            <div class="marker-arrow" style="font-size: 26px; margin-bottom: 2px; display: none; text-shadow: 0 0 10px #00ffff; transition: transform 0.1s ease;">➤</div>
            <div class="marker-panel" style="display: flex; flex-direction: column; align-items: center; transition: all 0.2s ease;">
                <div style="font-size: 28px; margin-bottom: 2px; animation: pulse 1s infinite alternate;">⬢</div>
                <div style="background: rgba(0, 15, 25, 0.95); padding: 8px 16px; border: 2px solid #00ffff; border-radius: 4px; letter-spacing: 1px; font-weight: bold; white-space: nowrap; box-shadow: 0 0 12px #00ffff, inset 0 0 8px rgba(0, 229, 255, 0.2);">
                    <span style="opacity: 0.7; font-size: 10px; display: block; margin-bottom: 3px; color: #00ffff; letter-spacing: 2px;">COMPONENT</span>
                    <span class="part-name">${name.toUpperCase()}</span>
                    <span class="part-status" style="display: block; font-size: 10px; color: #00ffaa; margin-top: 4px;">SECURE ZONE</span>
                </div>
            </div>
            <div class="marker-dist" style="font-size: 11px; margin-top: 4px; font-weight: bold; color: #fff; text-shadow: 0 0 5px #00ffff;">0m</div>
            <style>
                @keyframes pulse {
                    from { transform: scale(1); filter: brightness(1); }
                    to { transform: scale(1.15); filter: brightness(1.4); }
                }
            </style>
        `;
        document.body.appendChild(div);
        return div;
    }

    getHUDData() {
        // Find if player is currently syncing a part
        let syncingPart = this.parts.find(p => !p.collected && this.player.position.distanceTo(p.pos) < 4.5);
        if (syncingPart) {
            const pct = Math.round(syncingPart.syncProgress * 100);
            return {
                name: "HYDROGEN SCOOP ASSEMBLY",
                count: `SYNCING [${syncingPart.name.toUpperCase()}]: ${pct}%`,
                progress: (this.partsCollected + syncingPart.syncProgress) / 3
            };
        }

        return {
            name: "HYDROGEN SCOOP ASSEMBLY",
            count: `${this.partsCollected}/3 COMPONENTS SECURED`,
            progress: this.partsCollected / 3
        };
    }

    update(delta, elapsedTime, activeCamera) {
        if (!this.active) return;
        const camera = activeCamera || this.camera;

        this.parts.forEach(part => {
            if (part.collected) {
                part.marker.style.display = 'none';
                return;
            }

            // Animate mesh
            part.mesh.rotation.y += delta * 1.5;
            part.mesh.position.y = part.pos.y + Math.sin(elapsedTime * 2) * 0.25;
            
            part.mesh.children.forEach(child => {
                if (child.userData.rotSpeed) {
                    child.rotation.y += delta * child.userData.rotSpeed;
                    child.rotation.z += delta * child.userData.rotSpeed * 0.5;
                }
                if (child.userData.isArrow) {
                    child.rotation.y += delta * 2.0;
                }
            });

            // Distance check for field capture
            const dist = this.player.position.distanceTo(part.pos);
            const statusEl = part.marker.querySelector('.part-status');

            if (dist < 4.5) {
                // Stand in range to capture
                part.syncProgress = Math.min(1.0, part.syncProgress + delta / 4.0); // 4 seconds total
                
                // Spawn wave once per part
                if (!part.guardSpawned) {
                    part.guardSpawned = true;
                    this.spawnGuardWave(part.pos);
                }

                if (statusEl) {
                    const pct = Math.round(part.syncProgress * 100);
                    statusEl.textContent = `SYNC: ${pct}%`;
                    statusEl.style.color = '#00ffff';
                }

                // Warp sparks around player/part
                if (Math.random() < 0.2 && window.emitParticle) {
                    window.emitParticle(
                        part.pos.x + (Math.random() - 0.5) * 4,
                        part.pos.y + Math.random() * 2,
                        part.pos.z + (Math.random() - 0.5) * 4,
                        0, 2, 0,
                        0.0, 1.0, 1.0,
                        4, 0.3
                    );
                }

                if (part.syncProgress >= 1.0) {
                    this.collectPart(part);
                    return;
                }
            } else {
                // Decay progress slowly if outside range
                part.syncProgress = Math.max(0.0, part.syncProgress - delta / 6.0);
                if (statusEl) {
                    if (part.syncProgress > 0) {
                        const pct = Math.round(part.syncProgress * 100);
                        statusEl.textContent = `DECAY: ${pct}%`;
                        statusEl.style.color = '#ff3300';
                    } else {
                        statusEl.textContent = `STAND HERE`;
                        statusEl.style.color = '#00ffaa';
                    }
                }
            }
            
            // Screen-edge clamping and pointer rotation math
            const camPos = part.pos.clone().applyMatrix4(camera.matrixWorldInverse);
            const isBehind = camPos.z > 0;
            
            let vec = part.pos.clone().project(camera);
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
            
            part.marker.style.display = 'flex';
            part.marker.style.left = `${x}px`;
            part.marker.style.top = `${y}px`;
            part.marker.querySelector('.marker-dist').textContent = `${Math.round(dist)}m`;
            
            const arrow = part.marker.querySelector('.marker-arrow');
            const panel = part.marker.querySelector('.marker-panel');
            
            if (isOffscreen) {
                part.marker.classList.add('offscreen');
                if (arrow) {
                    arrow.style.display = 'block';
                    arrow.style.transform = `rotate(${arrowAngle}rad)`;
                }
                if (panel) {
                    panel.style.transform = 'scale(0.8)';
                    panel.style.opacity = '0.8';
                }
            } else {
                part.marker.classList.remove('offscreen');
                if (arrow) {
                    arrow.style.display = 'none';
                }
                if (panel) {
                    panel.style.transform = 'none';
                    panel.style.opacity = '1';
                }
            }
        });
    }

    spawnGuardWave(pos) {
        if (window.NeuralConsole) {
            window.NeuralConsole.log("WARNING: LOCALIZED BIO-CONTAINMENT FAILURE. HOSTILES CONVERGING.", 'err');
        }
        
        // Spawn 3 normal shamblers and 1 mutant runner nearby
        if (window.spawnZombie) {
            for (let i = 0; i < 3; i++) {
                const ox = (Math.random() - 0.5) * 15;
                const oz = (Math.random() - 0.5) * 15;
                window.spawnZombie(pos.x + ox, pos.z + oz, 0); // Normal
            }
            // Spawn 1 fast Mutant
            window.spawnZombie(pos.x + 10, pos.z - 10, 3);
        }
    }

    collectPart(part) {
        part.collected = true;
        this.partsCollected++;
        this.scene.remove(part.mesh);
        part.marker.remove();

        if (window.NeuralConsole) {
            window.NeuralConsole.log(`DATA_AQUIRED: [${part.name.toUpperCase()}]. SECURE COMPONENT SECURED.`, 'res');
        }

        if (window.emitParticle) {
            for (let i = 0; i < 30; i++) {
                window.emitParticle(
                    part.pos.x, part.pos.y, part.pos.z,
                    (Math.random() - 0.5) * 12, Math.random() * 10, (Math.random() - 0.5) * 12,
                    0, 1, 1, 4, 0.6
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
        
        window.isHydrogenScoopBuilt = true;
        this.onComplete();
    }
}
