/**
 * AncientKeystone.js - 3D Alien Relic & Holographic Alignment Puzzle
 * Spawns an interactive monolith. Interacting opens a concentric-ring alignment puzzle.
 */
class AncientKeystone extends THREE.Group {
    constructor() {
        super();
        this.name = "ancient_keystone_monolith";
        this.isSolved = false;

        // Visual components
        this.initVisuals();
    }

    initVisuals() {
        const stoneMat = new THREE.MeshStandardMaterial({
            color: 0x2e2f30,
            roughness: 0.8,
            metalness: 0.1
        });

        const goldMat = new THREE.MeshStandardMaterial({
            color: 0xd4af37,
            roughness: 0.25,
            metalness: 0.95
        });

        const coreGlowMat = new THREE.MeshStandardMaterial({
            color: 0xff3300,
            emissive: 0xff2200,
            emissiveIntensity: 3.0,
            roughness: 0.1,
            metalness: 0.9
        });

        // 1. Base Monolith pedestal
        const base = new THREE.Mesh(
            new THREE.CylinderGeometry(0.8, 1.2, 0.6, 6),
            stoneMat
        );
        base.position.set(0, 0.3, 0);
        this.add(base);

        const pillar = new THREE.Mesh(
            new THREE.BoxGeometry(0.5, 2.0, 0.5),
            stoneMat
        );
        pillar.position.set(0, 1.5, 0);
        this.add(pillar);

        // 2. Glowing Power Core
        this.core = new THREE.Mesh(
            new THREE.SphereGeometry(0.18, 16, 16),
            coreGlowMat
        );
        this.core.position.set(0, 1.8, 0);
        this.add(this.core);

        // 3. Three gold concentric rings surrounding the core
        this.ring1 = new THREE.Mesh(
            new THREE.TorusGeometry(0.35, 0.025, 8, 24),
            goldMat
        );
        this.ring1.position.set(0, 1.8, 0);
        this.ring1.rotation.x = Math.PI / 2;
        this.add(this.ring1);

        this.ring2 = new THREE.Mesh(
            new THREE.TorusGeometry(0.26, 0.02, 8, 20),
            goldMat
        );
        this.ring2.position.set(0, 1.8, 0);
        this.ring2.rotation.y = Math.PI / 2;
        this.add(this.ring2);

        this.ring3 = new THREE.Mesh(
            new THREE.TorusGeometry(0.18, 0.015, 8, 16),
            goldMat
        );
        this.ring3.position.set(0, 1.8, 0);
        this.ring3.rotation.z = Math.PI / 2;
        this.add(this.ring3);
    }

    update(dt) {
        // Slow idle rotation of concentric rings
        if (!this.isSolved) {
            this.ring1.rotation.z += 0.25 * dt;
            this.ring2.rotation.x += 0.4 * dt;
            this.ring3.rotation.y += 0.65 * dt;

            // Pulse core glow
            const glow = 2.0 + Math.sin(Date.now() * 0.005) * 1.0;
            this.core.material.emissiveIntensity = glow;
        } else {
            // Fades core glow on solve
            this.core.material.color.setHex(0x00ffcc);
            this.core.material.emissive.setHex(0x00ffaa);
            this.core.material.emissiveIntensity = 1.0;

            // Align rings neatly
            this.ring1.rotation.set(0, 0, 0);
            this.ring2.rotation.set(0, 0, 0);
            this.ring3.rotation.set(0, 0, 0);
        }
    }

    triggerPuzzle(onSolveCallback) {
        if (this.isSolved) return;

        // Open full-screen holographic alignment overlay
        const container = document.createElement('div');
        container.id = 'keystone-puzzle-overlay';
        container.style.position = 'fixed';
        container.style.inset = '0';
        container.style.backgroundColor = 'rgba(5, 12, 20, 0.92)';
        container.style.zIndex = '99999';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.alignItems = 'center';
        container.style.justifyContent = 'center';
        container.style.fontFamily = "'Courier New', Courier, monospace";
        container.style.color = '#00ffcc';
        container.style.userSelect = 'none';

        // Background grid effect
        container.innerHTML = `
            <div style="position: absolute; inset:0; background: linear-gradient(rgba(18,16,16,0) 50%, rgba(0,0,0,0.1) 50%), linear-gradient(90deg, rgba(255,0,0,0.02), rgba(0,255,0,0.01), rgba(0,0,255,0.02)); background-size: 100% 4px, 4px 100%; pointer-events:none; z-index: 1;"></div>
            <div class="glow-box" style="border: 1px solid #00ffcc; padding: 24px; background: rgba(0,20,30,0.7); border-radius: 4px; display:flex; flex-direction:column; align-items:center; box-shadow: 0 0 40px rgba(0,255,200,0.2); position:relative; z-index: 2;">
                <h1 style="font-size: 1.5rem; letter-spacing: 4px; margin: 0 0 10px 0; text-transform: uppercase; font-weight: bold; text-shadow: 0 0 10px #00ffcc;">COPLANAR ALIGNMENT TERMINAL</h1>
                <div style="font-size: 0.8rem; color: #88ffdd; margin-bottom: 20px; text-transform: uppercase; letter-spacing: 2px;">NOTCH SYNCHRONIZATION REQUIRED</div>
                
                <canvas id="keystone-puzzle-canvas" width="400" height="400" style="background: rgba(0,10,15,0.8); border: 1px solid #005544; border-radius: 50%;"></canvas>
                
                <div style="margin-top: 20px; font-size: 0.75rem; text-align: center; line-height: 1.6; color: #66ccaa;">
                    [TAB]: Switch Active Ring &nbsp;&nbsp;|&nbsp;&nbsp; [A/D] or [←/→]: Rotate Ring<br>
                    <span id="puzzle-warning-txt" style="color: #ffaa00; font-weight:bold; text-transform:uppercase;">SYNCHRONIZE ALL THREE NOTCHES AT 12 O'CLOCK</span>
                </div>
                
                <div style="margin-top: 15px; display: flex; gap: 15px;">
                    <div id="puzzle-timer" style="font-size: 1.2rem; font-weight:bold; color:#ff3300; text-shadow: 0 0 10px #ff3300;">20.0s</div>
                    <button id="puzzle-abort-btn" style="background: transparent; border: 1px solid #ff3333; color:#ff5555; padding: 4px 12px; font-family: inherit; font-size: 0.8rem; cursor:pointer; border-radius: 2px;">ABORT</button>
                </div>
            </div>
        `;
        document.body.appendChild(container);

        const canvas = document.getElementById('keystone-puzzle-canvas');
        const ctx = canvas.getContext('2d');

        // Puzzle state variables
        let selectedRing = 0; // 0=Outer, 1=Middle, 2=Inner
        let angles = [
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2
        ];
        let selfSpeeds = [
            (Math.random() - 0.5) * 0.4,
            (Math.random() - 0.5) * 0.5,
            (Math.random() - 0.5) * 0.6
        ];
        let timeRemaining = 20.0;
        let isOvertime = false;
        let pAnimId = null;

        // Keys mapping
        const pKeys = { a: false, d: false, left: false, right: false };

        const onKeyDown = (e) => {
            if (e.key === 'Tab') {
                selectedRing = (selectedRing + 1) % 3;
                if (window.AudioSynth) window.AudioSynth.playClick(400 - selectedRing * 50, 0.05);
                e.preventDefault();
            }
            if (e.key.toLowerCase() === 'a' || e.key === 'ArrowLeft') pKeys.a = true;
            if (e.key.toLowerCase() === 'd' || e.key === 'ArrowRight') pKeys.d = true;
        };

        const onKeyUp = (e) => {
            if (e.key.toLowerCase() === 'a' || e.key === 'ArrowLeft') pKeys.a = false;
            if (e.key.toLowerCase() === 'd' || e.key === 'ArrowRight') pKeys.d = false;
        };

        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);

        // Abort handler
        const abortBtn = document.getElementById('puzzle-abort-btn');
        abortBtn.onclick = () => {
            cleanup();
            if (window.AudioSynth) window.AudioSynth.playClick(200, 0.15);
        };

        const cleanup = () => {
            cancelAnimationFrame(pAnimId);
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keyup', onKeyUp);
            container.remove();
            // Resume game updates by unpausing
            if (window.togglePause && window.isPaused) {
                window.togglePause();
            }
        };

        // Render Loop
        let lastT = Date.now();
        const render = () => {
            const now = Date.now();
            const dt = (now - lastT) / 1000.0;
            lastT = now;

            // Timer update
            timeRemaining -= dt;
            if (timeRemaining <= 0) {
                timeRemaining = 0;
                if (!isOvertime) {
                    isOvertime = true;
                    // Speed up the rings rotation automatically (the penalty!)
                    selfSpeeds = selfSpeeds.map(s => s * 4.0);
                    const warnTxt = document.getElementById('puzzle-warning-txt');
                    if (warnTxt) warnTxt.style.color = '#ff3333';
                    if (warnTxt) warnTxt.textContent = "GRAVITATIONAL INSTABILITY DETECTED - SPEED INCREASING";
                }
            }

            const timerEl = document.getElementById('puzzle-timer');
            if (timerEl) {
                timerEl.textContent = timeRemaining.toFixed(1) + 's';
                if (isOvertime) {
                    timerEl.style.color = Math.floor(now * 0.01) % 2 === 0 ? '#ff0000' : '#ffffff';
                }
            }

            // Apply manual rotation to active ring
            let rotateVal = 0;
            if (pKeys.a) rotateVal -= 1.8 * dt;
            if (pKeys.d) rotateVal += 1.8 * dt;
            angles[selectedRing] += rotateVal;

            // Apply self rotation (constant drifting)
            for (let i = 0; i < 3; i++) {
                angles[i] += selfSpeeds[i] * dt;
            }

            // Draw holographic rings
            ctx.clearRect(0, 0, 400, 400);

            // Draw center node core
            ctx.beginPath();
            ctx.arc(200, 200, 15, 0, Math.PI * 2);
            ctx.fillStyle = isOvertime ? '#ff3300' : '#00ffcc';
            ctx.shadowBlur = 15;
            ctx.shadowColor = ctx.fillStyle;
            ctx.fill();
            ctx.shadowBlur = 0;

            // Draw 12 o'clock target line
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(0,255,200,0.3)';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.moveTo(200, 50);
            ctx.lineTo(200, 200);
            ctx.stroke();
            ctx.setLineDash([]);

            // Draw rings
            const radii = [140, 100, 60];
            for (let r = 0; r < 3; r++) {
                const radius = radii[r];
                const angle = angles[r];
                const isSel = (r === selectedRing);

                // Ring base
                ctx.beginPath();
                ctx.arc(200, 200, radius, 0, Math.PI * 2);
                ctx.strokeStyle = isSel ? '#00ffcc' : 'rgba(0, 255, 200, 0.2)';
                ctx.lineWidth = isSel ? 3.0 : 1.5;
                ctx.shadowBlur = isSel ? 10 : 0;
                ctx.shadowColor = '#00ffcc';
                ctx.stroke();
                ctx.shadowBlur = 0;

                // Notch indicator
                const notchX = 200 + Math.cos(angle - Math.PI/2) * radius;
                const notchY = 200 + Math.sin(angle - Math.PI/2) * radius;

                ctx.beginPath();
                ctx.arc(notchX, notchY, isSel ? 8 : 5, 0, Math.PI * 2);
                ctx.fillStyle = isSel ? '#ffffff' : '#00ffcc';
                ctx.shadowBlur = isSel ? 12 : 3;
                ctx.shadowColor = ctx.fillStyle;
                ctx.fill();
                ctx.shadowBlur = 0;

                // Add arrow pointing outward
                ctx.beginPath();
                ctx.strokeStyle = ctx.fillStyle;
                ctx.lineWidth = 2;
                ctx.moveTo(notchX, notchY);
                ctx.lineTo(
                    200 + Math.cos(angle - Math.PI/2) * (radius + 15),
                    200 + Math.sin(angle - Math.PI/2) * (radius + 15)
                );
                ctx.stroke();
            }

            // Check if solved
            // All angles relative to 12 o'clock (0 angle) must be aligned within tolerance
            const aligned = angles.every(angle => {
                // normalize angle to [-Math.PI, Math.PI]
                const normAngle = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
                const diff = Math.min(normAngle, Math.PI * 2 - normAngle);
                return diff < 0.08; // small tolerance window (~4.5 degrees)
            });

            if (aligned) {
                // Success!
                this.isSolved = true;
                if (window.AudioSynth) {
                    window.AudioSynth.playClick(600, 0.1);
                    window.AudioSynth.playClick(900, 0.15);
                }
                if (window.NeuralConsole) {
                    window.NeuralConsole.log("[COPLANAR_SYNCHRONIZER]: ALIGNMENT VERIFIED. TRANSMITTING SYSTEM PAYLOAD.", 'res');
                }
                
                // Solve reward triggers
                if (onSolveCallback) onSolveCallback();

                cleanup();
            } else {
                pAnimId = requestAnimationFrame(render);
            }
        };

        // Pause current game update thread
        if (window.togglePause && !window.isPaused) {
            window.togglePause();
        }

        pAnimId = requestAnimationFrame(render);
    }
}
