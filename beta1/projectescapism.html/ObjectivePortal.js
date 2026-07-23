// ObjectivePortal.js - Campaign Level transition portals
class ObjectivePortal {
    constructor(scene, player, camera, position, onEnter, name = "Slipspace Portal", color = 0x00f3ff) {
        this.scene = scene;
        this.player = player;
        this.camera = camera;
        this.position = position.clone();
        this.onEnter = onEnter;
        this.name = name;
        this.color = color;
        this.active = true;
        this.portalGroup = null;
        this.marker = null;

        // Charging sequence
        this.chargeProgress = 0.0;
        this.ambushSpawned = false;

        this.init();
    }

    init() {
        this.portalGroup = new THREE.Group();
        this.portalGroup.position.copy(this.position);

        // Core Glowing Sphere
        const coreGeo = new THREE.SphereGeometry(2.5, 32, 32);
        const coreMat = new THREE.MeshBasicMaterial({ 
            color: this.color,
            transparent: true,
            opacity: 0.9
        });
        const core = new THREE.Mesh(coreGeo, coreMat);
        this.portalGroup.add(core);

        // Rotating rings
        const ringGeo1 = new THREE.TorusGeometry(4.5, 0.2, 8, 32);
        const ringMat1 = new THREE.MeshStandardMaterial({
            color: this.color,
            emissive: this.color,
            roughness: 0.1,
            metalness: 0.9,
            side: THREE.DoubleSide
        });
        this.ring1 = new THREE.Mesh(ringGeo1, ringMat1);
        this.ring1.rotation.x = Math.PI / 2;
        this.portalGroup.add(this.ring1);

        const secondaryColor = this.color === 0xff3300 ? 0xff00ff : 0xffaa00;
        const ringGeo2 = new THREE.TorusGeometry(5.5, 0.15, 8, 32);
        const ringMat2 = new THREE.MeshStandardMaterial({
            color: secondaryColor,
            emissive: secondaryColor,
            roughness: 0.1,
            metalness: 0.9,
            side: THREE.DoubleSide
        });
        this.ring2 = new THREE.Mesh(ringGeo2, ringMat2);
        this.ring2.rotation.y = Math.PI / 4;
        this.portalGroup.add(this.ring2);

        // Sky beacon
        const beamGeo = new THREE.CylinderGeometry(0.5, 2.0, 200, 16, 1, true);
        beamGeo.translate(0, 100, 0);
        const beamMat = new THREE.MeshBasicMaterial({
            color: this.color,
            transparent: true,
            opacity: 0.3,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide,
            depthWrite: false
        });
        const beam = new THREE.Mesh(beamGeo, beamMat);
        this.portalGroup.add(beam);

        // Point light
        const light = new THREE.PointLight(this.color, 4.0, 30);
        this.portalGroup.add(light);

        this.scene.add(this.portalGroup);

        this.marker = this.createMarker();

        if (window.NeuralConsole) {
            window.NeuralConsole.log(`PORTAL DETECTED: [${this.name.toUpperCase()}] ACTIVE at [${Math.round(this.position.x)}, ${Math.round(this.position.z)}]`, 'sys');
        }
    }

    createMarker() {
        const hexColor = "#" + this.color.toString(16).padStart(6, '0');
        const div = document.createElement('div');
        div.className = 'obj-marker';
        div.style.position = 'absolute';
        div.style.pointerEvents = 'none';
        div.style.transform = 'translate(-50%, -50%)';
        div.style.color = hexColor;
        div.style.fontFamily = 'monospace';
        div.style.fontSize = '14px';
        div.style.display = 'flex';
        div.style.flexDirection = 'column';
        div.style.alignItems = 'center';
        div.style.textShadow = `0 0 8px ${hexColor}`;
        div.style.zIndex = '9999';

        div.innerHTML = `
            <div class="marker-arrow" style="font-size: 26px; margin-bottom: 2px; display: none; text-shadow: 0 0 10px ${hexColor}; transition: transform 0.1s ease;">➤</div>
            <div class="marker-panel" style="display: flex; flex-direction: column; align-items: center; transition: all 0.2s ease;">
                <div style="font-size: 28px; margin-bottom: 2px; animation: glowPulse 1.2s infinite alternate;">⏣</div>
                <div style="background: rgba(0, 10, 20, 0.95); padding: 8px 16px; border: 2px solid ${hexColor}; border-radius: 4px; letter-spacing: 1px; font-weight: bold; white-space: nowrap; box-shadow: 0 0 12px ${hexColor}, inset 0 0 8px rgba(0, 243, 255, 0.25);">
                    <span style="opacity: 0.7; font-size: 10px; display: block; margin-bottom: 3px; color: ${hexColor}; letter-spacing: 2px;">SLIPSPACE PORTAL</span>
                    <span class="portal-name">${this.name.toUpperCase()}</span>
                    <span class="portal-status" style="display: block; font-size: 10px; color: #00ffaa; margin-top: 4px;">SECURE ZONE</span>
                </div>
            </div>
            <div class="marker-dist" style="font-size: 11px; margin-top: 4px; font-weight: bold; color: #fff; text-shadow: 0 0 5px ${hexColor};">0m</div>
            <style>
                @keyframes glowPulse {
                    from { transform: scale(1); filter: brightness(1); }
                    to { transform: scale(1.15); filter: brightness(1.5); }
                }
            </style>
        `;
        document.body.appendChild(div);
        return div;
    }

    getHUDData() {
        if (this.chargeProgress > 0) {
            const pct = Math.round(this.chargeProgress * 100);
            return {
                name: "SLIPSPACE PORTAL",
                count: `WARP ENGINE CHARGING: ${pct}%`,
                progress: this.chargeProgress
            };
        }
        const dist = this.player.position.distanceTo(this.position);
        return {
            name: "SLIPSPACE PORTAL",
            count: `ENTER PORTAL ZONE: ${Math.round(dist)}m`,
            progress: 0.1
        };
    }

    update(delta, elapsedTime, activeCamera) {
        if (!this.active) return;
        const camera = activeCamera || this.camera;

        // Animate visual components
        if (this.portalGroup) {
            this.portalGroup.position.y = this.position.y + Math.sin(elapsedTime * 2.5) * 0.12;
        }
        if (this.ring1) {
            this.ring1.rotation.x += delta * 1.4;
            this.ring1.rotation.y += delta * 0.7;
        }
        if (this.ring2) {
            this.ring2.rotation.y -= delta * 1.6;
            this.ring2.rotation.z += delta * 1.1;
        }

        // Swirl particles around portal
        if (Math.random() < 0.4 && window.emitParticle) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 0.5 + Math.random() * 1.5;
            const colorComponents = new THREE.Color(this.color);
            window.emitParticle(
                this.position.x + Math.cos(angle) * dist,
                this.position.y + (Math.random() - 0.5) * 1.5,
                this.position.z + Math.sin(angle) * dist,
                -Math.cos(angle) * 1.8,
                (Math.random() - 0.5) * 0.6,
                -Math.sin(angle) * 1.8,
                colorComponents.r, colorComponents.g, colorComponents.b,
                5.0, 0.45
            );
        }

        const dist = this.player.position.distanceTo(this.position);
        const statusEl = this.marker ? this.marker.querySelector('.portal-status') : null;

        if (dist < 4.5) {
            // Charging!
            this.chargeProgress = Math.min(1.0, this.chargeProgress + delta / 6.0); // 6 seconds to charge
            
            // Spawn ambush wave once
            if (!this.ambushSpawned) {
                this.ambushSpawned = true;
                this.spawnAmbushWave();
            }

            if (statusEl) {
                const pct = Math.round(this.chargeProgress * 100);
                statusEl.textContent = `CHARGING: ${pct}%`;
                statusEl.style.color = '#00ffff';
            }

            // Warp sparks
            if (Math.random() < 0.25 && window.emitParticle) {
                const col = new THREE.Color(this.color);
                window.emitParticle(
                    this.player.position.x + (Math.random() - 0.5) * 3.0,
                    this.player.position.y + Math.random() * 2.0,
                    this.player.position.z + (Math.random() - 0.5) * 3.0,
                    0, 3, 0,
                    col.r, col.g, col.b,
                    4, 0.25
                );
            }

            if (this.chargeProgress >= 1.0) {
                this.complete();
                return;
            }
        } else {
            // Decay progress outside range
            this.chargeProgress = Math.max(0.0, this.chargeProgress - delta / 8.0);
            if (statusEl) {
                if (this.chargeProgress > 0) {
                    const pct = Math.round(this.chargeProgress * 100);
                    statusEl.textContent = `DECAYING: ${pct}%`;
                    statusEl.style.color = '#ff3300';
                } else {
                    statusEl.textContent = `STAND HERE`;
                    statusEl.style.color = '#00ffaa';
                }
            }
        }

        // Screen-edge clamping and pointer rotation math
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
        
        if (this.marker) {
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
        }
    }

    spawnAmbushWave() {
        if (window.NeuralConsole) {
            window.NeuralConsole.log("WARNING: SLIPSPACE INITIALIZATION INTERRUPTED. INBOUND WAVE DETECTED.", 'err');
        }
        // Spawn 4 fast runner mutants from offsets
        if (window.spawnZombie) {
            const offsets = [
                { x: 12, z: 12 },
                { x: -12, z: 12 },
                { x: 12, z: -12 },
                { x: -12, z: -12 }
            ];
            offsets.forEach(offset => {
                window.spawnZombie(this.position.x + offset.x, this.position.z + offset.z, 3); // Spawn mutant
            });
        }
    }

    complete() {
        this.active = false;
        this.dispose();
        if (this.onEnter) {
            this.onEnter();
        }
    }

    dispose() {
        this.active = false;
        if (this.marker) {
            this.marker.remove();
            this.marker = null;
        }
        if (this.portalGroup) {
            this.scene.remove(this.portalGroup);
            this.portalGroup = null;
        }
    }
}
window.ObjectivePortal = ObjectivePortal;
