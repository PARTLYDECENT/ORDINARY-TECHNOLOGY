// ObjectiveTutorial.js - Level 0: Calibrate Cognitive Link
class ObjectiveTutorial {
    constructor(scene, player, camera, onComplete) {
        this.scene = scene;
        this.player = player;
        this.camera = camera;
        this.onComplete = onComplete;
        this.active = true;
        this.marker = null;
        this.targetZombieIdx = -1;

        this.init();
    }

    init() {
        if (window.NeuralConsole) {
            window.NeuralConsole.clear();
            window.NeuralConsole.log("SYSTEMS ONLINE. COGNITIVE LINK: SYNAPSE CALIBRATION...", 'sys');
            window.NeuralConsole.log("TUTORIAL: ELIMINATE THE DESIGNATED VECTOR.", 'res');
        }
        this.marker = this.createMarker("TARGET VECTOR");
    }

    createMarker(name) {
        const div = document.createElement('div');
        div.className = 'obj-marker';
        div.style.position = 'absolute';
        div.style.pointerEvents = 'none';
        div.style.transform = 'translate(-50%, -50%)';
        div.style.color = '#ff9900'; // Amber/Orange warning color
        div.style.fontFamily = 'monospace';
        div.style.fontSize = '10px';
        div.style.display = 'flex';
        div.style.flexDirection = 'column';
        div.style.alignItems = 'center';
        div.style.textShadow = '0 0 5px #ff9900';
        div.style.zIndex = '9999';

        div.innerHTML = `
            <div class="marker-arrow" style="font-size: 20px; margin-bottom: 2px; display: none; text-shadow: 0 0 8px #ff9900; transition: transform 0.1s ease;">➤</div>
            <div class="marker-panel" style="display: flex; flex-direction: column; align-items: center; transition: all 0.2s ease;">
                <div style="font-size: 22px; margin-bottom: 2px; animation: heartbeat 1s infinite alternate;">▼</div>
                <div style="background: rgba(15, 8, 0, 0.9); padding: 4px 10px; border: 1px solid #ff9900; border-radius: 2px; letter-spacing: 1px; font-weight: bold; white-space: nowrap;">
                    <span style="opacity: 0.7; font-size: 8px; display: block; margin-bottom: 2px; color: #ff9900;">TUTORIAL</span>
                    ${name.toUpperCase()}
                </div>
            </div>
            <div class="marker-dist" style="font-size: 10px; margin-top: 4px; font-weight: bold; color: #fff; text-shadow: 0 0 5px #ff9900;">0m</div>
            <style>
                @keyframes heartbeat {
                    from { transform: scale(1); filter: brightness(1); }
                    to { transform: scale(1.15); filter: brightness(1.4); }
                }
            </style>
        `;
        document.body.appendChild(div);
        return div;
    }

    update(delta, elapsedTime, activeCamera) {
        if (!this.active) return;
        const camera = activeCamera || this.camera;

        // Check if campaignTutorial is done
        if (window.campaignTutorial && window.campaignTutorial.isFinished) {
            this.complete();
            return;
        }

        // Find the active shambler zombie in the global pools
        let found = false;
        const spawnedZombies = (window.getSpawnedZombies ? window.getSpawnedZombies() : 0);
        const zState = window.zState;
        const zPosX = window.zPosX;
        const zPosZ = window.zPosZ;

        for (let i = 0; i < spawnedZombies; i++) {
            if (zState && zState[i] !== 0) {
                this.targetZombieIdx = i;
                found = true;
                break;
            }
        }

        if (found && this.targetZombieIdx !== -1 && zPosX && zPosZ) {
            const zH = window.TerrainGen ? window.TerrainGen.getHeight(zPosX[this.targetZombieIdx], zPosZ[this.targetZombieIdx]) : 1.0;
            const pos = new THREE.Vector3(zPosX[this.targetZombieIdx], zH + 2.2, zPosZ[this.targetZombieIdx]);
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
            // Target not found/spawned yet
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
            window.NeuralConsole.log("LINK CALIBRATION COMPLETE.", 'sys');
            window.NeuralConsole.log("INITIALIZING COMBAT INSTRUCTIONS...", 'res');
        }

        setTimeout(() => {
            this.onComplete();
        }, 1500);
    }
}
