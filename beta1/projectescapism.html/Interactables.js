// Interactables.js - Shot-triggered explosive cells and hackable defense turrets

class ExplosiveCell {
    constructor(scene, position) {
        this.scene = scene;
        this.position = position.clone();
        if (window.TerrainGen) {
            this.position.y = window.TerrainGen.getHeight(this.position.x, this.position.z);
        }
        this.active = true;
        this.destroyed = false;
        
        this.group = null;
        this.marker = null;
        
        this.init();
    }

    init() {
        this.group = new THREE.Group();
        this.group.position.copy(this.position);

        // Cylinder body
        const cylGeo = new THREE.CylinderGeometry(0.7, 0.7, 1.8, 12);
        const cylMat = new THREE.MeshStandardMaterial({
            color: 0xff4400,
            roughness: 0.4,
            metalness: 0.8
        });
        const mesh = new THREE.Mesh(cylGeo, cylMat);
        mesh.position.y = 0.9;
        this.group.add(mesh);

        // Warning bands / hazard ring
        const ringGeo = new THREE.CylinderGeometry(0.72, 0.72, 0.25, 12);
        this.ringMat = new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.9 });
        const warningRing = new THREE.Mesh(ringGeo, this.ringMat);
        warningRing.position.y = 0.9;
        this.group.add(warningRing);

        // Orange warning point light
        this.light = new THREE.PointLight(0xff5500, 1.5, 8.0);
        this.light.position.y = 1.8;
        this.group.add(this.light);

        this.scene.add(this.group);
        
        this.marker = this.createMarker("EXPLOSIVE CELL");
    }

    createMarker(text) {
        const div = document.createElement('div');
        div.className = 'obj-marker';
        div.style.position = 'absolute';
        div.style.pointerEvents = 'none';
        div.style.transform = 'translate(-50%, -50%)';
        div.style.color = '#ff5500';
        div.style.fontFamily = 'monospace';
        div.style.fontSize = '8px';
        div.style.zIndex = '9998';

        div.innerHTML = `
            <div style="background: rgba(20, 5, 0, 0.9); padding: 2px 4px; border: 1px solid #ff5500; border-radius: 2px; font-weight: bold; white-space: nowrap;">
                ⚠ ${text}
            </div>
        `;
        document.body.appendChild(div);
        return div;
    }

    update(delta, elapsedTime, camera) {
        if (!this.active || this.destroyed) return;

        // Animate glowing hazard ring
        if (this.ringMat) {
            this.ringMat.opacity = 0.6 + Math.sin(elapsedTime * 6.0) * 0.4;
        }

        // Project marker
        if (this.marker && camera) {
            const camPos = this.position.clone().applyMatrix4(camera.matrixWorldInverse);
            const isBehind = camPos.z > 0;
            
            let vec = this.position.clone().project(camera);
            if (isBehind) {
                vec.x = -vec.x;
                vec.y = -vec.y;
            }
            
            const borderMargin = 0.08;
            const limitX = 1.0 - borderMargin;
            const limitY = 1.0 - borderMargin;
            const isOffscreen = isBehind || vec.x < -limitX || vec.x > limitX || vec.y < -limitY || vec.y > limitY;
            
            this.marker.style.display = isOffscreen ? 'none' : 'block';
            if (!isOffscreen) {
                const x = (vec.x * 0.5 + 0.5) * window.innerWidth;
                const y = (-vec.y * 0.5 + 0.5) * window.innerHeight - 35; // slightly above cell
                this.marker.style.left = `${x}px`;
                this.marker.style.top = `${y}px`;
            }
        }
    }

    explode() {
        if (this.destroyed) return;
        this.destroyed = true;
        this.active = false;

        this.scene.remove(this.group);
        if (this.marker) {
            this.marker.remove();
            this.marker = null;
        }

        // Play SFX
        if (window.SFX && typeof window.SFX.triggerExplosion === 'function') {
            window.SFX.triggerExplosion();
        }

        // Fire explosion visual ring
        const expRingGeo = new THREE.RingGeometry(0.1, 12, 32);
        const expRingMat = new THREE.MeshBasicMaterial({
            color: 0xff7700,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending
        });
        const expRing = new THREE.Mesh(expRingGeo, expRingMat);
        expRing.position.copy(this.position);
        expRing.position.y += 0.2;
        expRing.rotation.x = Math.PI / 2;
        this.scene.add(expRing);

        // Animate expansion and fade out of explosion ring
        let age = 0;
        const explosionAnim = () => {
            age += 0.05;
            expRing.scale.set(1 + age * 18, 1 + age * 18, 1);
            expRingMat.opacity = Math.max(0, 0.9 - age * 1.5);
            if (expRingMat.opacity > 0) {
                requestAnimationFrame(explosionAnim);
            } else {
                this.scene.remove(expRing);
                expRingGeo.dispose();
                expRingMat.dispose();
            }
        };
        explosionAnim();

        // Spawn fire particles
        if (window.emitParticle) {
            for (let i = 0; i < 40; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 4 + Math.random() * 8;
                window.emitParticle(
                    this.position.x, this.position.y + 0.5, this.position.z,
                    Math.cos(angle) * speed, 3 + Math.random() * 5, Math.sin(angle) * speed,
                    1.0, 0.3 + Math.random() * 0.4, 0.0,
                    15.0, 1.2
                );
            }
        }

        // Damage and knock back nearby zombies
        if (window.zState) {
            const range = 12.0;
            const maxZ = window.CONFIG ? window.CONFIG.maxZombies : 100;
            for (let i = 0; i < maxZ; i++) {
                if (window.zState[i] === 1) {
                    const zx = window.zPosX[i], zz = window.zPosZ[i];
                    const dx = zx - this.position.x, dz = zz - this.position.z;
                    const dSq = dx * dx + dz * dz;
                    if (dSq < range * range) {
                        const dist = Math.sqrt(dSq) || 0.1;
                        
                        // Push back vector (apply velocity to zombie)
                        const force = (1.0 - dist / range) * 12.0;
                        if (window.zVelX) {
                            window.zVelX[i] += (dx / dist) * force;
                            window.zVelZ[i] += (dz / dist) * force;
                        } else {
                            window.zPosX[i] += (dx / dist) * force * 0.2;
                            window.zPosZ[i] += (dz / dist) * force * 0.2;
                        }

                        // Apply damage
                        const dmg = Math.round((1.0 - dist / range) * 350);
                        if (typeof window.damageZombieAt === 'function') {
                            window.damageZombieAt(i, dmg);
                        }
                    }
                }
            }
        }

        // Damage Hatman boss if nearby
        if (window.hatmanBoss && window.hatmanBoss.isEnabled) {
            const hDist = this.position.distanceTo(window.hatmanBoss.position);
            if (hDist < 12.0) {
                const dmg = Math.round((1.0 - hDist / 12.0) * 300);
                window.hatmanBoss.takeDamage(dmg);
            }
        }
    }

    dispose() {
        this.active = false;
        if (this.marker) {
            this.marker.remove();
            this.marker = null;
        }
        if (this.group) {
            this.scene.remove(this.group);
            this.group = null;
        }
    }
}


class DefenseTurret {
    constructor(scene, player, position) {
        this.scene = scene;
        this.player = player;
        this.position = position.clone();
        if (window.TerrainGen) {
            this.position.y = window.TerrainGen.getHeight(this.position.x, this.position.z);
        }
        this.active = true;
        
        // Turret States:
        // 'inactive' = Needs hack
        // 'active' = Hacked, scanning and shooting zombies
        this.state = 'inactive';
        this.hackTimer = 0.0;
        this.shootTimer = 0.0;
        
        this.group = null;
        this.turretHead = null;
        this.marker = null;
        this.scannerLight = null;

        this.init();
    }

    init() {
        this.group = new THREE.Group();
        this.group.position.copy(this.position);

        // Pedestal base stand
        const baseGeo = new THREE.CylinderGeometry(0.4, 0.6, 1.4, 8);
        const baseMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.9 });
        const base = new THREE.Mesh(baseGeo, baseMat);
        base.position.y = 0.7;
        this.group.add(base);

        // Swiveling Turret Head
        this.turretHead = new THREE.Group();
        this.turretHead.position.set(0, 1.4, 0);

        const headGeo = new THREE.BoxGeometry(0.8, 0.6, 1.0);
        const headMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.8 });
        const headMesh = new THREE.Mesh(headGeo, headMat);
        this.turretHead.add(headMesh);

        // Barrels
        const barrelGeo = new THREE.CylinderGeometry(0.1, 0.1, 1.0, 8);
        barrelGeo.rotateX(Math.PI / 2);
        const barrelMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.9 });
        
        const leftBarrel = new THREE.Mesh(barrelGeo, barrelMat);
        leftBarrel.position.set(-0.25, 0, 0.6);
        const rightBarrel = new THREE.Mesh(barrelGeo, barrelMat);
        rightBarrel.position.set(0.25, 0, 0.6);
        this.turretHead.add(leftBarrel);
        this.turretHead.add(rightBarrel);

        // Red/Cyan Scanner light
        this.scannerLight = new THREE.PointLight(0xff0000, 2.0, 10.0);
        this.scannerLight.position.set(0, 0.3, 0.6);
        this.turretHead.add(this.scannerLight);

        this.group.add(this.turretHead);
        this.scene.add(this.group);

        this.marker = this.createMarker("HACK INTERFACE");
    }

    createMarker(text) {
        const div = document.createElement('div');
        div.className = 'obj-marker';
        div.style.position = 'absolute';
        div.style.pointerEvents = 'none';
        div.style.transform = 'translate(-50%, -50%)';
        div.style.color = '#ff0033';
        div.style.fontFamily = 'monospace';
        div.style.fontSize = '9px';
        div.style.zIndex = '9998';

        div.innerHTML = `
            <div class="marker-panel" style="background: rgba(15, 0, 5, 0.95); padding: 3px 6px; border: 1px solid #ff0033; border-radius: 2px; font-weight: bold; text-shadow: 0 0 5px #ff0033; white-space: nowrap;">
                ◈ ${text}
            </div>
            <div class="interact-tip" style="font-size: 8px; color: #aaa; margin-top: 2px; text-align: center;">[E] TO HACK</div>
        `;
        document.body.appendChild(div);
        return div;
    }

    update(delta, elapsedTime, camera) {
        if (!this.active) return;

        const distToPlayer = this.player.position.distanceTo(this.position);

        if (this.state === 'inactive') {
            // Rotates scanning back and forth
            this.turretHead.rotation.y = Math.sin(elapsedTime * 1.5) * 0.8;
            
            // Pulse red scanning light
            if (this.scannerLight) {
                this.scannerLight.color.setHex(0xff0000);
                this.scannerLight.intensity = 1.5 + Math.sin(elapsedTime * 8.0) * 0.5;
            }

            // Proximity interaction panel
            if (this.marker) {
                const tip = this.marker.querySelector('.interact-tip');
                if (tip) {
                    tip.style.display = distToPlayer < 4.0 ? 'block' : 'none';
                    if (distToPlayer < 4.0) {
                        tip.textContent = "PRESS [E] TO HACK";
                        tip.style.color = "#00e5ff";
                        tip.style.animation = "blink 0.5s infinite alternate";
                    }
                }
            }
        } else if (this.state === 'active') {
            this.hackTimer -= delta;

            if (this.scannerLight) {
                this.scannerLight.color.setHex(0x00e5ff); // Cyan active status
                this.scannerLight.intensity = 2.0 + Math.sin(elapsedTime * 15.0) * 0.5;
            }

            // Find closest zombie within range 30
            let targetIdx = -1;
            let closestDistSq = 900.0; // 30 units squared

            if (window.zState) {
                const maxZ = window.CONFIG ? window.CONFIG.maxZombies : 100;
                for (let i = 0; i < maxZ; i++) {
                    if (window.zState[i] === 1) {
                        const dx = window.zPosX[i] - this.position.x;
                        const dz = window.zPosZ[i] - this.position.z;
                        const dSq = dx * dx + dz * dz;
                        if (dSq < closestDistSq) {
                            closestDistSq = dSq;
                            targetIdx = i;
                        }
                    }
                }
            }

            // Shoot target if found
            if (targetIdx !== -1) {
                const tx = window.zPosX[targetIdx];
                const tz = window.zPosZ[targetIdx];
                const ty = window.TerrainGen ? window.TerrainGen.getHeight(tx, tz) + 1.0 : 1.0;
                const targetWorldPos = new THREE.Vector3(tx, ty, tz);

                // Swivel turret head to look at target
                const headWorldPos = new THREE.Vector3();
                this.turretHead.getWorldPosition(headWorldPos);
                
                const targetLocalPos = targetWorldPos.clone().sub(headWorldPos);
                // Rotate head to face target
                const targetAngle = Math.atan2(targetLocalPos.x, targetLocalPos.z);
                this.turretHead.rotation.y = targetAngle;

                // Shooting timer (every 0.25 seconds)
                this.shootTimer += delta;
                if (this.shootTimer >= 0.25) {
                    this.shootTimer = 0.0;
                    this.fireWeapon(targetWorldPos, targetIdx);
                }
            } else {
                // Return to idle sweep search
                this.turretHead.rotation.y = Math.sin(elapsedTime * 3.0) * 0.8;
            }

            if (this.hackTimer <= 0) {
                this.state = 'inactive';
                if (window.NeuralConsole) {
                    window.NeuralConsole.log("[TURRET SYSTEM]: SECURITY BLOCK REACTIVATED. SYSTEM OFFLINE.", 'err');
                }
                if (this.marker) {
                    this.marker.style.color = '#ff0033';
                    const panel = this.marker.querySelector('.marker-panel');
                    if (panel) {
                        panel.style.borderColor = '#ff0033';
                        panel.textContent = "◈ HACK INTERFACE";
                    }
                }
            }
        }

        // Project marker
        if (this.marker && camera) {
            const camPos = this.position.clone().applyMatrix4(camera.matrixWorldInverse);
            const isBehind = camPos.z > 0;
            
            let vec = this.position.clone().project(camera);
            if (isBehind) {
                vec.x = -vec.x;
                vec.y = -vec.y;
            }
            
            const borderMargin = 0.08;
            const limitX = 1.0 - borderMargin;
            const limitY = 1.0 - borderMargin;
            const isOffscreen = isBehind || vec.x < -limitX || vec.x > limitX || vec.y < -limitY || vec.y > limitY;
            
            this.marker.style.display = isOffscreen ? 'none' : 'flex';
            this.marker.style.flexDirection = 'column';
            this.marker.style.alignItems = 'center';
            if (!isOffscreen) {
                const x = (vec.x * 0.5 + 0.5) * window.innerWidth;
                const y = (-vec.y * 0.5 + 0.5) * window.innerHeight - 60; // slightly above turret
                this.marker.style.left = `${x}px`;
                this.marker.style.top = `${y}px`;
            }
        }
    }

    hack() {
        if (this.state === 'active') return;
        this.state = 'active';
        this.hackTimer = 25.0; // active for 25s
        
        if (window.NeuralConsole) {
            window.NeuralConsole.log("[TURRET SECURED]: AUTO-TARGETING SENSOR ACTIVE. SECURING RADIUS...", 'sys');
        }

        // Change marker visuals
        if (this.marker) {
            this.marker.style.color = '#00e5ff';
            const panel = this.marker.querySelector('.marker-panel');
            if (panel) {
                panel.style.borderColor = '#00e5ff';
                panel.textContent = "◈ TURRET SECURED";
            }
            const tip = this.marker.querySelector('.interact-tip');
            if (tip) tip.style.display = 'none';
        }
    }

    fireWeapon(targetPos, targetIdx) {
        // Play SFX
        if (window.SFX && typeof window.SFX.triggerPistol === 'function') {
            window.SFX.triggerPistol();
        }

        // Muzzle particles
        if (window.emitParticle) {
            const headWorld = new THREE.Vector3();
            this.turretHead.getWorldPosition(headWorld);
            // Left/Right barrel muzzle positions
            const offset = new THREE.Vector3(Math.random() > 0.5 ? 0.25 : -0.25, 0, 1.0);
            offset.applyQuaternion(this.turretHead.quaternion);
            const muzzlePos = headWorld.clone().add(offset);

            // Spawn muzzle flash
            window.emitParticle(
                muzzlePos.x, muzzlePos.y, muzzlePos.z,
                (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2,
                0.0, 0.9, 1.0, // cyan muzzle flash
                12.0, 0.15
            );

            // Laser tracer lines
            const laserMat = new THREE.LineBasicMaterial({ color: 0x00ffff, linewidth: 2 });
            const points = [muzzlePos, targetPos];
            const laserGeo = new THREE.BufferGeometry().setFromPoints(points);
            const line = new THREE.Line(laserGeo, laserMat);
            this.scene.add(line);
            
            setTimeout(() => {
                this.scene.remove(line);
                laserGeo.dispose();
                laserMat.dispose();
            }, 60);

            // Damage Zombie
            const dmg = 45;
            if (typeof window.damageZombieAt === 'function') {
                window.damageZombieAt(targetIdx, dmg);
            }
        }
    }

    dispose() {
        this.active = false;
        if (this.marker) {
            this.marker.remove();
            this.marker = null;
        }
        if (this.group) {
            this.scene.remove(this.group);
            this.group = null;
        }
    }
}


class InteractableManager {
    constructor(scene, player) {
        this.scene = scene;
        this.player = player;
        this.cells = [];
        this.turrets = [];
        
        this.init();
    }

    init() {
        const currentMapId = (window.GAME_START_CONFIG && window.GAME_START_CONFIG.mapId) || 'forest';

        // 1. Forest Level Spawns
        if (currentMapId === 'forest' || currentMapId === 'survival') {
            const cellPoints = [
                new THREE.Vector3(15, 0, 15),
                new THREE.Vector3(-20, 0, -25),
                new THREE.Vector3(30, 0, -10),
                new THREE.Vector3(-10, 0, 35)
            ];
            cellPoints.forEach(pos => {
                this.cells.push(new ExplosiveCell(this.scene, pos));
            });

            const turretPoints = [
                new THREE.Vector3(5, 0, -15),
                new THREE.Vector3(-15, 0, 5)
            ];
            turretPoints.forEach(pos => {
                this.turrets.push(new DefenseTurret(this.scene, this.player, pos));
            });
        }
        // 2. Desert Level Spawns
        else if (currentMapId === 'desert') {
            const cellPoints = [
                new THREE.Vector3(20, 0, 30),
                new THREE.Vector3(-30, 0, -10),
                new THREE.Vector3(10, 0, -40),
                new THREE.Vector3(-25, 0, 35)
            ];
            cellPoints.forEach(pos => {
                this.cells.push(new ExplosiveCell(this.scene, pos));
            });

            const turretPoints = [
                new THREE.Vector3(0, 0, 20),
                new THREE.Vector3(15, 0, -15)
            ];
            turretPoints.forEach(pos => {
                this.turrets.push(new DefenseTurret(this.scene, this.player, pos));
            });
        }
        // 3. Asynchronous Maze Spawns (place dynamically in open cells)
        else if (currentMapId === 'asynchronousmaze1') {
            const spacing = window.mapManager && window.mapManager.cellSize ? window.mapManager.cellSize : 4.0;
            let cellsSpawned = 0;
            let turretsSpawned = 0;

            if (window.mapManager && typeof window.mapManager._isWall === 'function') {
                for (let z = 2; z < 14; z += 3) {
                    for (let x = 2; x < 14; x += 3) {
                        if (!window.mapManager._isWall(x, z)) {
                            const pos = new THREE.Vector3(x * spacing + spacing/2, 0.4, z * spacing + spacing/2);
                            if (cellsSpawned < 4 && Math.random() > 0.3) {
                                this.cells.push(new ExplosiveCell(this.scene, pos));
                                cellsSpawned++;
                            } else if (turretsSpawned < 2 && Math.random() > 0.4) {
                                this.turrets.push(new DefenseTurret(this.scene, this.player, pos));
                                turretsSpawned++;
                            }
                        }
                    }
                }
            }
        }
    }

    update(delta, elapsedTime) {
        const camera = window.activeCamera || window.cameraFPS;
        this.cells.forEach(cell => cell.update(delta, elapsedTime, camera));
        this.turrets.forEach(turret => turret.update(delta, elapsedTime, camera));
    }

    dispose() {
        this.cells.forEach(cell => cell.dispose());
        this.turrets.forEach(turret => turret.dispose());
        this.cells = [];
        this.turrets = [];
    }
}

window.InteractableManager = InteractableManager;
window.ExplosiveCell = ExplosiveCell;
window.DefenseTurret = DefenseTurret;
