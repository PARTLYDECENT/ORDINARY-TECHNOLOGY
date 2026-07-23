// ObjectiveEndgame.js - Level 4/Endgame: Defeat Zombie Hatman Final Boss
class ObjectiveEndgame {
    constructor(scene, player, camera, onComplete) {
        this.scene = scene;
        this.player = player;
        this.camera = camera;
        this.onComplete = onComplete;
        this.active = true;
        
        this.marker = null;
        this.bossInstance = null;

        // Anomaly Phases
        this.phase1Triggered = false;
        this.phase2Triggered = false;
        this.shardsActive = false;
        this.voidShards = []; // { mesh, pos, health, marker }
        
        this.shadeSpawnTimer = 0;

        this.init();
    }

    init() {
        if (window.hatmanBoss) {
            this.bossInstance = window.hatmanBoss;
        }

        this.marker = this.createMarker("HATMAN");

        if (window.NeuralConsole) {
            window.NeuralConsole.clear();
            window.NeuralConsole.log("FINAL ANOMALY LOCKED. NO SLIPSPACE TRANSITIONS REMAINING.", 'sys');
            window.NeuralConsole.log("OBJECTIVE: DEFEAT ZOMBIE HATMAN.", 'err');
        }
    }

    createMarker(name) {
        const div = document.createElement('div');
        div.className = 'obj-marker';
        div.style.position = 'absolute';
        div.style.pointerEvents = 'none';
        div.style.transform = 'translate(-50%, -50%)';
        div.style.color = '#ff0033'; // Neon red boss marker
        div.style.fontFamily = 'monospace';
        div.style.fontSize = '14px';
        div.style.display = 'flex';
        div.style.flexDirection = 'column';
        div.style.alignItems = 'center';
        div.style.textShadow = '0 0 8px #ff0033';
        div.style.zIndex = '9999';

        div.innerHTML = `
            <div class="marker-arrow" style="font-size: 26px; margin-bottom: 2px; display: none; text-shadow: 0 0 10px #ff0033; transition: transform 0.1s ease;">➤</div>
            <div class="marker-panel" style="display: flex; flex-direction: column; align-items: center; transition: all 0.2s ease;">
                <div style="font-size: 28px; margin-bottom: 2px; animation: bossPulse 0.8s infinite alternate;">☣</div>
                <div style="background: rgba(20, 0, 0, 0.95); padding: 8px 16px; border: 2px solid #ff0033; border-radius: 4px; letter-spacing: 1px; font-weight: bold; white-space: nowrap; box-shadow: 0 0 12px #ff0033, inset 0 0 8px rgba(255, 0, 51, 0.25);">
                    <span style="opacity: 0.7; font-size: 10px; display: block; margin-bottom: 3px; color: #ff0033; letter-spacing: 2px;">ANOMALY ANCHOR</span>
                    <span class="boss-name">${name.toUpperCase()}</span>
                    <span class="boss-status" style="display: block; font-size: 10px; color: #ff3344; margin-top: 4px;">ACTIVE</span>
                </div>
            </div>
            <div class="marker-dist" style="font-size: 11px; margin-top: 4px; font-weight: bold; color: #fff; text-shadow: 0 0 5px #ff0033;">0m</div>
            <style>
                @keyframes bossPulse {
                    from { transform: scale(1); filter: brightness(1); }
                    to { transform: scale(1.15); filter: brightness(1.5); }
                }
            </style>
        `;
        document.body.appendChild(div);
        return div;
    }

    createShardMarker(pos, name) {
        const div = document.createElement('div');
        div.className = 'obj-marker shard-marker';
        div.style.position = 'absolute';
        div.style.pointerEvents = 'none';
        div.style.transform = 'translate(-50%, -50%)';
        div.style.color = '#ff00ff'; // Neon magenta
        div.style.fontFamily = 'monospace';
        div.style.fontSize = '11px';
        div.style.display = 'flex';
        div.style.flexDirection = 'column';
        div.style.alignItems = 'center';
        div.style.textShadow = '0 0 5px #ff00ff';
        div.style.zIndex = '9998';

        div.innerHTML = `
            <div class="marker-panel" style="background: rgba(20, 0, 20, 0.9); padding: 4px 8px; border: 1px solid #ff00ff; border-radius: 2px; font-weight: bold; white-space: nowrap;">
                ◈ ${name.toUpperCase()} ◈
            </div>
            <div class="marker-dist" style="font-size: 9px; margin-top: 2px; color: #fff;">0m</div>
        `;
        document.body.appendChild(div);
        return { div, pos };
    }

    getHUDData() {
        if (!this.bossInstance) {
            return { name: "COGNITIVE ANOMALY PURGE", count: "INITIALIZING", progress: 0 };
        }

        const hp = Math.max(0, this.bossInstance.health);
        const maxHp = this.bossInstance.maxHealth || 4500;
        const pct = Math.round((hp / maxHp) * 100);

        if (this.shardsActive) {
            const aliveShards = this.voidShards.filter(s => s.marker !== null).length;
            return {
                name: "COGNITIVE ANOMALY PURGE",
                count: `DESTROY VOID SHARDS: ${3 - aliveShards}/3 ACTIVE`,
                progress: 0.5
            };
        }

        return {
            name: "COGNITIVE ANOMALY PURGE",
            count: `PURGE BOSS: ${pct}% HEALTH`,
            progress: (maxHp - hp) / maxHp
        };
    }

    update(delta, elapsedTime, activeCamera) {
        if (!this.active) return;
        const camera = activeCamera || this.camera;

        if (!this.bossInstance && window.hatmanBoss) {
            this.bossInstance = window.hatmanBoss;
        }

        // Check if boss is dead/disposed
        if (this.bossInstance && (!this.bossInstance.isEnabled || this.bossInstance.health <= 0)) {
            this.complete();
            return;
        }

        if (!this.bossInstance && elapsedTime > 3.0) {
            this.complete();
            return;
        }

        if (this.bossInstance) {
            const hp = this.bossInstance.health;
            const maxHp = this.bossInstance.maxHealth || 4500;
            const pct = hp / maxHp;

            // Trigger Phase 1 (60% HP) or Phase 2 (30% HP)
            const shouldTriggerP1 = pct <= 0.60 && !this.phase1Triggered;
            const shouldTriggerP2 = pct <= 0.30 && !this.phase2Triggered;

            if ((shouldTriggerP1 || shouldTriggerP2) && !this.shardsActive) {
                if (shouldTriggerP1) this.phase1Triggered = true;
                else this.phase2Triggered = true;

                this.shardsActive = true;
                
                // Hide Hatman Boss (warp underground)
                this.bossInstance.homePosition.set(0, -999, 0);
                if (this.bossInstance.npcVolume) this.bossInstance.npcVolume.visible = false;
                if (this.bossInstance.indicatorBox) this.bossInstance.indicatorBox.visible = false;
                if (this.bossInstance.bossLight) this.bossInstance.bossLight.intensity = 0;

                // Spawn 3 Void Shards in a triangle surrounding the center pedestal
                const radius = 24.0;
                const shardPositions = [
                    new THREE.Vector3(radius, 2.0, 0.0),
                    new THREE.Vector3(-radius * 0.5, 2.0, radius * 0.866),
                    new THREE.Vector3(-radius * 0.5, 2.0, -radius * 0.866)
                ];

                this.voidShards = [];
                shardPositions.forEach((pos, idx) => {
                    const shardMesh = this.createShardMesh();
                    shardMesh.position.copy(pos);
                    this.scene.add(shardMesh);

                    const shardObj = {
                        mesh: shardMesh,
                        velocity: new THREE.Vector3(),
                        isHeld: false,
                        health: 60,
                        type: 'crate', // Register as physics object to take damage
                        pos: pos.clone(),
                        marker: this.createShardMarker(pos, `VOID SHARD ${idx + 1}`)
                    };
                    if (!window.physicsCrates) window.physicsCrates = [];
                    window.physicsCrates.push(shardObj);
                    this.voidShards.push(shardObj);
                });

                if (window.NeuralConsole) {
                    window.NeuralConsole.log("ANOMALY THREAT ALERT: DETECTING REALITY SHEAR INTRUSION.", 'err');
                    window.NeuralConsole.log("BOSS STABILIZED IN VOID SUB-SPACE. VOID SHARDS GENERATED. BREAK SHARDS.", 'err');
                }
                const statusEl = this.marker.querySelector('.boss-status');
                if (statusEl) {
                    statusEl.textContent = 'VOID PHASE ACTIVE - DESTROY SHARDS';
                    statusEl.style.color = '#ff00ff';
                }
            }

            // If Void Shards are active, process them
            if (this.shardsActive) {
                let aliveCount = 0;
                this.voidShards.forEach(s => {
                    const isBroken = s.health <= 0 || !window.physicsCrates.includes(s);
                    if (isBroken) {
                        if (s.marker) {
                            s.marker.div.remove();
                            s.marker = null;
                        }
                        if (s.mesh) {
                            this.scene.remove(s.mesh);
                            s.mesh = null;
                        }
                    } else {
                        aliveCount++;
                        if (s.mesh) {
                            s.mesh.rotation.y += delta * 2.5;
                            s.mesh.position.y = s.pos.y + Math.sin(elapsedTime * 4 + s.pos.x) * 0.15;
                        }
                        this.updateHTMLMarker(s.marker.div, s.pos, camera);
                    }
                });

                // Spawn Shade duplicate runner waves
                this.shadeSpawnTimer += delta;
                if (this.shadeSpawnTimer > 6.0) {
                    this.shadeSpawnTimer = 0;
                    this.spawnShadeRunner();
                }

                if (aliveCount === 0) {
                    // Shards cleared! Bring Boss back
                    this.shardsActive = false;
                    this.bossInstance.homePosition.set(0, -1.55, 0);
                    if (this.bossInstance.npcVolume) this.bossInstance.npcVolume.visible = true;
                    if (this.bossInstance.indicatorBox) this.bossInstance.indicatorBox.visible = true;
                    if (this.bossInstance.bossLight) this.bossInstance.bossLight.intensity = 4.0;

                    if (window.NeuralConsole) {
                        window.NeuralConsole.log("VOID CONDUITS TERMINATED. BOSS SHIFTED BACK TO REALITY.", 'sys');
                    }
                    const statusEl = this.marker.querySelector('.boss-status');
                    if (statusEl) {
                        statusEl.textContent = 'VULNERABLE - DEFACING CORE';
                        statusEl.style.color = '#ff0033';
                    }
                }
            }

            // Update main boss marker position
            if (!this.shardsActive) {
                const pos = new THREE.Vector3(this.bossInstance.position.x, this.bossInstance.position.y + 1.2, this.bossInstance.position.z);
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
                        panel.style.transform = 'none';
                        panel.style.opacity = '1';
                    }
                }
            } else {
                this.marker.style.display = 'none';
            }
        } else {
            this.marker.style.display = 'none';
        }
    }

    createShardMesh() {
        const group = new THREE.Group();
        const coreGeo = new THREE.OctahedronGeometry(1.2, 0);
        const coreMat = new THREE.MeshStandardMaterial({
            color: 0xff00ff,
            emissive: 0x770077,
            emissiveIntensity: 2.2,
            metalness: 0.9,
            roughness: 0.1
        });
        const core = new THREE.Mesh(coreGeo, coreMat);
        group.add(core);

        const ringGeo = new THREE.TorusGeometry(1.8, 0.08, 6, 24);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0xff00ff, transparent: true, opacity: 0.8 });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2;
        group.add(ring);

        const light = new THREE.PointLight(0xff00ff, 4.0, 12);
        group.add(light);
        return group;
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

    spawnShadeRunner() {
        if (window.spawnZombie) {
            // Spawn 2 runner mutants from the center of the arena
            window.spawnZombie(0, 0, 3);
            window.spawnZombie(0, 0, 3);
        }
    }

    complete() {
        this.active = false;
        if (this.marker) {
            this.marker.remove();
            this.marker = null;
        }
        this.voidShards.forEach(s => {
            if (s.marker) s.marker.div.remove();
            if (s.mesh) this.scene.remove(s.mesh);
        });

        if (window.NeuralConsole) {
            window.NeuralConsole.log("ANOMALY DISINTEGRATED. INITIATING NEURAL TERMINATION.", 'res');
        }

        this.triggerVictorySequence();
        this.onComplete();
    }

    triggerVictorySequence() {
        const overlay = document.createElement('div');
        overlay.id = 'victory-overlay';
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100vw';
        overlay.style.height = '100vh';
        overlay.style.backgroundColor = '#000';
        overlay.style.color = '#00ff66';
        overlay.style.display = 'flex';
        overlay.style.flexDirection = 'column';
        overlay.style.justifyContent = 'center';
        overlay.style.alignItems = 'center';
        overlay.style.zIndex = '999999';
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity 3.0s ease';
        overlay.style.fontFamily = 'monospace';
        overlay.style.textAlign = 'center';

        overlay.innerHTML = `
            <h1 style="font-size: 32px; letter-spacing: 4px; margin-bottom: 20px; text-shadow: 0 0 10px #00ff66;">COGNITIVE THREAD STABILIZED</h1>
            <p style="font-size: 14px; color: #88ff88; margin-bottom: 40px; letter-spacing: 2px;">PROJECT ESCAPISM: SUCCESSFUL EXTRACTION</p>
            <div style="font-size: 11px; color: #66cc66; line-height: 2; letter-spacing: 1px; max-width: 600px;">
                [NEURAL LINK: SAFELY SEVERED]<br>
                [COGNITIVE LAYER: RESETTING...]<br>
                [GAMEPLAY STATS: SAVED TO LOCAL FILE BUFFER]<br>
                THANK YOU FOR PLAYING THE SIMULATION.
            </div>
        `;
        document.body.appendChild(overlay);

        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(600, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(80, audioCtx.currentTime + 3.0);
            gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.001, audioCtx.currentTime + 3.0);
            osc.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + 3.0);
        } catch (e) {}

        setTimeout(() => {
            overlay.style.opacity = '1';
        }, 100);

        setTimeout(() => {
            window.location.reload();
        }, 8000);
    }
}
window.ObjectiveEndgame = ObjectiveEndgame;
