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

        this.init();
    }

    init() {
        // Find the Hatman Boss instance
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
        div.style.color = '#ff0033'; // Scary neon-red boss marker
        div.style.fontFamily = 'monospace';
        div.style.fontSize = '10px';
        div.style.display = 'flex';
        div.style.flexDirection = 'column';
        div.style.alignItems = 'center';
        div.style.textShadow = '0 0 5px #ff0033';
        div.style.zIndex = '9999';

        div.innerHTML = `
            <div class="marker-arrow" style="font-size: 20px; margin-bottom: 2px; display: none; text-shadow: 0 0 8px #ff0033; transition: transform 0.1s ease;">➤</div>
            <div class="marker-panel" style="display: flex; flex-direction: column; align-items: center; transition: all 0.2s ease;">
                <div style="font-size: 24px; margin-bottom: 2px; animation: bossPulse 0.8s infinite alternate;">☣</div>
                <div style="background: rgba(20, 0, 0, 0.95); padding: 4px 10px; border: 1px solid #ff0033; border-radius: 2px; letter-spacing: 1px; font-weight: bold; white-space: nowrap;">
                    <span style="opacity: 0.7; font-size: 8px; display: block; margin-bottom: 2px; color: #ff0033;">ANOMALY ANCHOR</span>
                    ${name.toUpperCase()}
                </div>
            </div>
            <div class="marker-dist" style="font-size: 10px; margin-top: 4px; font-weight: bold; color: #fff; text-shadow: 0 0 5px #ff0033;">0m</div>
            <style>
                @keyframes bossPulse {
                    from { transform: scale(1); filter: brightness(1); }
                    to { transform: scale(1.25); filter: brightness(1.7); }
                }
            </style>
        `;
        document.body.appendChild(div);
        return div;
    }

    update(delta, elapsedTime, activeCamera) {
        if (!this.active) return;
        const camera = activeCamera || this.camera;

        // Try to find boss if not found yet
        if (!this.bossInstance && window.hatmanBoss) {
            this.bossInstance = window.hatmanBoss;
        }

        // Check if boss is dead/disposed
        if (this.bossInstance && (!this.bossInstance.isEnabled || this.bossInstance.health <= 0)) {
            this.complete();
            return;
        }

        // If boss instance is null, but we initialized, it was disposed/killed
        if (!this.bossInstance && elapsedTime > 3.0) {
            this.complete();
            return;
        }

        if (this.bossInstance) {
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
    }

    complete() {
        this.active = false;
        if (this.marker) {
            this.marker.remove();
            this.marker = null;
        }

        if (window.NeuralConsole) {
            window.NeuralConsole.log("ANOMALY DISINTEGRATED. INITIATING NEURAL TERMINATION.", 'res');
        }

        // Show cinematic end screen
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

        // Synth ending warp sound
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

        // Fade in
        setTimeout(() => {
            overlay.style.opacity = '1';
        }, 100);

        // Return to main menu (reload page) after 8 seconds
        setTimeout(() => {
            window.location.reload();
        }, 8000);
    }
}
