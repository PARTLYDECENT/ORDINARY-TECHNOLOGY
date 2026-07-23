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

        // Retaliation States
        this.retaliationTriggered = false;
        this.nestShield = null;
        this.guardianDefeated = false;
        this.guardianMarker = null;

        this.init();
    }

    init() {
        if (this.spawnNodes && this.spawnNodes.length > 0) {
            this.nestNode = this.spawnNodes[0];
        }

        if (this.nestNode) {
            this.nestNode.isShielded = false; // Initialize shield flag

            // Giant glowing red vertical beacon
            if (this.nestNode.mesh) {
                const beamGeo = new THREE.CylinderGeometry(0.35, 1.0, 200, 16, 1, true);
                beamGeo.translate(0, 100, 0);
                const beamMat = new THREE.MeshBasicMaterial({
                    color: 0xff1100,
                    transparent: true,
                    opacity: 0.5,
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
            window.NeuralConsole.log("DESOLATION PROTOCOL: EXTREME THREAT SWARM NEST DETECTED.", 'sys');
            window.NeuralConsole.log("OBJECTIVE: PURGE THE CENTRAL SWARM NEST NODE.", 'res');
        }
    }

    createMarker(name) {
        const div = document.createElement('div');
        div.className = 'obj-marker';
        div.style.position = 'absolute';
        div.style.pointerEvents = 'none';
        div.style.transform = 'translate(-50%, -50%)';
        div.style.color = '#ff1100'; // Crimson neon red
        div.style.fontFamily = 'monospace';
        div.style.fontSize = '14px';
        div.style.display = 'flex';
        div.style.flexDirection = 'column';
        div.style.alignItems = 'center';
        div.style.textShadow = '0 0 8px #ff1100';
        div.style.zIndex = '9999';

        div.innerHTML = `
            <div class="marker-arrow" style="font-size: 26px; margin-bottom: 2px; display: none; text-shadow: 0 0 10px #ff1100; transition: transform 0.1s ease;">➤</div>
            <div class="marker-panel" style="display: flex; flex-direction: column; align-items: center; transition: all 0.2s ease;">
                <div style="font-size: 28px; margin-bottom: 2px;">▼</div>
                <div style="background: rgba(15, 0, 0, 0.95); padding: 8px 16px; border: 2px solid #ff1100; border-radius: 4px; letter-spacing: 1px; font-weight: bold; white-space: nowrap; box-shadow: 0 0 12px #ff1100, inset 0 0 8px rgba(255, 17, 0, 0.25);">
                    <span style="opacity: 0.7; font-size: 10px; display: block; margin-bottom: 3px; color: #ff1100; letter-spacing: 2px;">NEST TARGET</span>
                    <span class="nest-name">${name.toUpperCase()}</span>
                    <span class="nest-status" style="display: block; font-size: 10px; color: #ff3333; margin-top: 4px;">ACTIVE</span>
                </div>
            </div>
            <div class="marker-dist" style="font-size: 11px; margin-top: 4px; font-weight: bold; color: #fff; text-shadow: 0 0 5px #ff1100;">0m</div>
        `;
        document.body.appendChild(div);
        return div;
    }

    createGuardianMarker(pos, name) {
        const div = document.createElement('div');
        div.className = 'obj-marker guardian-marker';
        div.style.position = 'absolute';
        div.style.pointerEvents = 'none';
        div.style.transform = 'translate(-50%, -50%)';
        div.style.color = '#ffaa00'; // Orange
        div.style.fontFamily = 'monospace';
        div.style.fontSize = '12px';
        div.style.display = 'flex';
        div.style.flexDirection = 'column';
        div.style.alignItems = 'center';
        div.style.textShadow = '0 0 6px #ffaa00';
        div.style.zIndex = '9998';

        div.innerHTML = `
            <div class="marker-panel" style="background: rgba(20, 10, 0, 0.92); padding: 6px 12px; border: 1px solid #ffaa00; border-radius: 3px; font-weight: bold; white-space: nowrap; box-shadow: 0 0 8px #ffaa00;">
                ⚠ ${name.toUpperCase()} ⚠
            </div>
            <div class="marker-dist" style="font-size: 10px; margin-top: 3px; color: #fff;">0m</div>
        `;
        document.body.appendChild(div);
        return { div, pos };
    }

    getHUDData() {
        if (!this.nestNode) {
            return { name: "COGNITIVE NEST PURGE", count: "INITIALIZING", progress: 0 };
        }

        const hp = Math.max(0, this.nestNode.hp);
        const maxHp = this.nestNode.maxHP || 500;
        const pct = Math.round((hp / maxHp) * 100);

        if (this.retaliationTriggered && !this.guardianDefeated) {
            return {
                name: "SYNAPTIC CLEANSING",
                count: `NEST SHIELDED: DEFEAT GUARDIAN (${pct}%)`,
                progress: 0.5
            };
        }

        return {
            name: "SYNAPTIC CLEANSING",
            count: `DESTROY NEST: ${pct}% INTEGRITY`,
            progress: (maxHp - hp) / maxHp
        };
    }

    update(delta, elapsedTime, activeCamera) {
        if (!this.active) return;
        const camera = activeCamera || this.camera;

        if (!this.nestNode) return;

        // Check if Nest is destroyed
        if (!this.nestNode.active || this.nestNode.hp <= 0) {
            this.complete();
            return;
        }

        // Monitor Nest Health for Retaliation Trigger
        if (this.nestNode.hp < 250 && !this.retaliationTriggered) {
            this.retaliationTriggered = true;
            this.nestNode.isShielded = true; // Make Nest immune to damage

            // Visual shield overlay
            const shieldGeo = new THREE.SphereGeometry(14, 16, 16);
            const shieldMat = new THREE.MeshBasicMaterial({
                color: 0x00aaff,
                transparent: true,
                opacity: 0.22,
                wireframe: true,
                blending: THREE.AdditiveBlending
            });
            this.nestShield = new THREE.Mesh(shieldGeo, shieldMat);
            this.nestShield.position.copy(this.nestNode.mesh.position);
            this.scene.add(this.nestShield);

            // Spawn Mecha-Zombie boss
            const spawnPos = new THREE.Vector3(
                this.nestNode.x + 12,
                (window.TerrainGen ? window.TerrainGen.getHeight(this.nestNode.x + 12, this.nestNode.z + 12) : 1.0),
                this.nestNode.z + 12
            );

            if (typeof window.MechaZombieBoss !== 'undefined') {
                if (window.mechaZombieBoss) window.mechaZombieBoss.dispose();
                window.mechaZombieBoss = new MechaZombieBoss(this.scene);
                window.mechaZombieBoss.homePosition.copy(spawnPos);
                window.mechaZombieBoss.position.copy(spawnPos);
                window.mechaZombieBoss.bossY = spawnPos.y + 2.0;

                this.guardianMarker = this.createGuardianMarker(window.mechaZombieBoss.position, "NEST GUARDIAN");
            }

            if (window.NeuralConsole) {
                window.NeuralConsole.log("NEST THREAT EVENT: DIRECTIVE RETALIATION ACTIVE.", 'err');
                window.NeuralConsole.log("SWARM NEST SHIELD ENGAGED. DETECTING TITAN GUARDIAN BIO-MECH.", 'err');
            }
            const statusEl = this.marker.querySelector('.nest-status');
            if (statusEl) {
                statusEl.textContent = 'SHIELD ACTIVE - DEFEAT GUARDIAN';
                statusEl.style.color = '#00aaff';
            }
        }

        // Monitor Guardian State
        if (this.retaliationTriggered && !this.guardianDefeated) {
            // Animate shield mesh rotating
            if (this.nestShield) {
                this.nestShield.rotation.y += delta * 0.4;
                this.nestShield.rotation.x += delta * 0.2;
            }

            const isGuardianDead = !window.mechaZombieBoss || !window.mechaZombieBoss.isEnabled || window.mechaZombieBoss.health <= 0;
            if (isGuardianDead) {
                this.guardianDefeated = true;
                this.nestNode.isShielded = false; // Drop shield!
                if (this.nestShield) {
                    this.scene.remove(this.nestShield);
                    this.nestShield = null;
                }
                if (this.guardianMarker) {
                    this.guardianMarker.div.remove();
                    this.guardianMarker = null;
                }
                const statusEl = this.marker.querySelector('.nest-status');
                if (statusEl) {
                    statusEl.textContent = 'VULNERABLE - PURGE NEST';
                    statusEl.style.color = '#ff1100';
                }
                if (window.NeuralConsole) {
                    window.NeuralConsole.log("NEST GUARDIAN NEUTRALIZED. SWARM NEST SHIELD TERMINATED.", 'sys');
                }
            } else {
                // Update Guardian Marker positioning
                if (this.guardianMarker && window.mechaZombieBoss) {
                    this.updateHTMLMarker(this.guardianMarker.div, window.mechaZombieBoss.position, camera);
                }
            }
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
                const s = 1.0 + Math.sin(elapsedTime * 5) * 0.08;
                panel.style.transform = `scale(${s})`;
                panel.style.opacity = '1';
            }
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
        if (this.beacon && this.nestNode && this.nestNode.mesh) {
            this.nestNode.mesh.remove(this.beacon);
            this.beacon = null;
        }
        if (this.nestShield) {
            this.scene.remove(this.nestShield);
            this.nestShield = null;
        }
        if (this.guardianMarker) {
            this.guardianMarker.div.remove();
            this.guardianMarker = null;
        }

        if (window.NeuralConsole) {
            window.NeuralConsole.log("DESOLATION NEST PURGED. DETECTING STRUCTURAL FOLD SIGNAL...", 'sys');
        }

        setTimeout(() => {
            this.onComplete();
        }, 1500);
    }
}
// Export to window
window.ObjectiveDesolation = ObjectiveDesolation;
