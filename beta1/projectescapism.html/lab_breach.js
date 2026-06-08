/**
 * PROJECT ESCAPISM — ROTARY DNA LAB SECURITY BREACH CONTROLLER
 * Coordinates terrifying anomaly events: specter jump-scares, motor control inversion, and screen bleeding graphics.
 */

const LabBreach = {
    lab: null,
    specterMesh: null,
    bloodOverlay: null,
    isControlsInverted: false,
    nextAnomalyCheck: 0,

    init: function (labInstance) {
        this.lab = labInstance;
        this.isControlsInverted = false;
        this.nextAnomalyCheck = Date.now() + 5000;

        // 1. Create a bleeding canvas border overlay (dripping blood aesthetic)
        this.bloodOverlay = document.createElement('div');
        this.bloodOverlay.id = 'depth-blood-overlay';
        this.bloodOverlay.style.position = 'absolute';
        this.bloodOverlay.style.top = '0';
        this.bloodOverlay.style.left = '0';
        this.bloodOverlay.style.width = '100%';
        this.bloodOverlay.style.height = '100%';
        this.bloodOverlay.style.pointerEvents = 'none';
        this.bloodOverlay.style.zIndex = '9998';
        this.bloodOverlay.style.boxShadow = 'inset 0 0 100px rgba(0,0,0,1)';
        this.bloodOverlay.style.border = '0px solid rgba(239, 68, 68, 0)';
        this.bloodOverlay.style.transition = 'all 0.5s ease-in-out';
        
        const container = document.getElementById('dna-lab-viewport-container');
        if (container) {
            container.appendChild(this.bloodOverlay);
        }

        // Inject Bleeding/Dripping Scanline Keyframes
        if (!document.getElementById('blood-drip-styles')) {
            const style = document.createElement('style');
            style.id = 'blood-drip-styles';
            style.innerHTML = `
                @keyframes blood-drip-left {
                    0% { height: 0vh; }
                    50% { height: 75vh; }
                    100% { height: 100vh; opacity: 0; }
                }
                .dripping-blood {
                    box-shadow: inset 0 0 80px rgba(239, 68, 68, 0.45) !important;
                    border: 1px solid rgba(239, 68, 68, 0.6) !important;
                }
            `;
            document.head.appendChild(style);
        }
    },

    update: function (depth) {
        if (!this.lab) return;

        // 1. Controls Inversion & Blood border at extreme depth
        if (depth > 3000) {
            if (!this.isControlsInverted) {
                this.isControlsInverted = true;
                this.bloodOverlay.classList.add('dripping-blood');
                
                // Alert HUD of motor failure
                const motorAlert = document.getElementById('hud-val-state');
                if (motorAlert) {
                    motorAlert.innerText = 'MOTOR FAIL // CONTROL INVERT';
                    motorAlert.className = 'font-red';
                }
                if (window.SFX) window.SFX.triggerScream(0.6);
            }
        } else {
            if (this.isControlsInverted) {
                this.isControlsInverted = false;
                this.bloodOverlay.classList.remove('dripping-blood');
            }
        }

        // 2. Random Distorted Whispers inside logs at deep levels
        if (depth > 2500 && Date.now() > this.nextAnomalyCheck) {
            this.nextAnomalyCheck = Date.now() + 12000 + Math.random() * 8000;
            this.triggerRandomGlitchMessage();
        }
    },

    triggerSpecterFlash: function () {
        if (!this.lab || !this.lab.scene) return;

        // Create glowing wireframe screaming skull
        const points = [];
        // Crown/Skull Outline
        points.push(new THREE.Vector3(-0.6, 0.8, 0), new THREE.Vector3(0.6, 0.8, 0));
        points.push(new THREE.Vector3(0.6, 0.8, 0), new THREE.Vector3(0.8, 0.4, 0));
        points.push(new THREE.Vector3(0.8, 0.4, 0), new THREE.Vector3(0.8, -0.1, 0));
        points.push(new THREE.Vector3(0.8, -0.1, 0), new THREE.Vector3(0.4, -0.3, 0));
        // Jaw
        points.push(new THREE.Vector3(0.4, -0.3, 0), new THREE.Vector3(0.3, -0.8, 0));
        points.push(new THREE.Vector3(0.3, -0.8, 0), new THREE.Vector3(-0.3, -0.8, 0));
        points.push(new THREE.Vector3(-0.3, -0.8, 0), new THREE.Vector3(-0.4, -0.3, 0));
        points.push(new THREE.Vector3(-0.4, -0.3, 0), new THREE.Vector3(-0.8, -0.1, 0));
        points.push(new THREE.Vector3(-0.8, -0.1, 0), new THREE.Vector3(-0.8, 0.4, 0));
        points.push(new THREE.Vector3(-0.8, 0.4, 0), new THREE.Vector3(-0.6, 0.8, 0));
        // Sockets
        points.push(new THREE.Vector3(-0.4, 0.3, 0), new THREE.Vector3(-0.1, 0.3, 0));
        points.push(new THREE.Vector3(-0.1, 0.3, 0), new THREE.Vector3(-0.25, 0.05, 0));
        points.push(new THREE.Vector3(-0.25, 0.05, 0), new THREE.Vector3(-0.4, 0.3, 0));

        points.push(new THREE.Vector3(0.4, 0.3, 0), new THREE.Vector3(0.1, 0.3, 0));
        points.push(new THREE.Vector3(0.1, 0.3, 0), new THREE.Vector3(0.25, 0.05, 0));
        points.push(new THREE.Vector3(0.25, 0.05, 0), new THREE.Vector3(0.4, 0.3, 0));
        // Nose
        points.push(new THREE.Vector3(0, 0, 0), new THREE.Vector3(-0.1, -0.2, 0));
        points.push(new THREE.Vector3(-0.1, -0.2, 0), new THREE.Vector3(0.1, -0.2, 0));
        points.push(new THREE.Vector3(0.1, -0.2, 0), new THREE.Vector3(0, 0, 0));
        // Teeth
        points.push(new THREE.Vector3(-0.2, -0.4, 0), new THREE.Vector3(-0.2, -0.7, 0));
        points.push(new THREE.Vector3(0, -0.4, 0), new THREE.Vector3(0, -0.7, 0));
        points.push(new THREE.Vector3(0.2, -0.4, 0), new THREE.Vector3(0.2, -0.7, 0));
        points.push(new THREE.Vector3(-0.3, -0.4, 0), new THREE.Vector3(0.3, -0.4, 0));
        points.push(new THREE.Vector3(-0.3, -0.7, 0), new THREE.Vector3(0.3, -0.7, 0));

        const geom = new THREE.BufferGeometry().setFromPoints(points);
        const mat = new THREE.LineBasicMaterial({
            color: 0xef4444,
            transparent: true,
            opacity: 1.0,
            linewidth: 4
        });

        this.specterMesh = new THREE.LineSegments(geom, mat);
        // Position skull directly behind DNA at z = -2.0
        this.specterMesh.position.set(0, 0, -2.5);
        this.specterMesh.scale.set(4.5, 4.5, 4.5);
        this.lab.scene.add(this.specterMesh);

        // Scream SFX trigger
        if (window.SFX) window.SFX.triggerScream(1.6);

        // Flash Inverted Color Filter in CSS
        const container = document.getElementById('dna-lab-canvas-container');
        if (container) {
            container.style.filter = 'invert(1) hue-rotate(180deg) contrast(2) scale(1.08)';
        }

        // Remove skull & restore screen after 220ms
        setTimeout(() => {
            if (this.specterMesh) {
                this.lab.scene.remove(this.specterMesh);
                this.specterMesh.geometry.dispose();
                this.specterMesh.material.dispose();
                this.specterMesh = null;
            }
            if (container) {
                container.style.filter = 'none';
            }
        }, 220);
    },

    triggerRandomGlitchMessage: function () {
        const logs = document.querySelectorAll('.lore-log');
        if (logs.length === 0) return;

        const scareWhispers = [
            "THE LOWER YOU GO, THE MORE WE BREATHE.",
            "DO NOT FIGHT THE STEERAGE. IT HAS ALWAYS BEEN COMPLETED.",
            "WE WATCH THROUGH THE SPECTRAL CHANNELS.",
            "YOUR SKIN IS MERELY A CONTAINER.",
            "THE ENTROPY GROWS STRONGER IN THE DARK VOID."
        ];

        const logIndex = Math.floor(Math.random() * logs.length);
        const selectedLog = logs[logIndex];
        const randomWhisper = scareWhispers[Math.floor(Math.random() * scareWhispers.length)];

        // Glitch header & body text
        const header = selectedLog.querySelector('.lore-log-header');
        if (header) {
            header.innerText = "WARNING // SYSTEM HIJACK";
            header.style.color = '#ef4444';
        }
        
        selectedLog.style.borderColor = 'rgba(239,68,68,0.4)';
        selectedLog.style.background = 'rgba(40,5,5,0.7)';

        const textNode = selectedLog.childNodes[2] || selectedLog.lastChild;
        if (textNode) {
            textNode.textContent = " " + randomWhisper;
        }

        // Short glitch tremor
        const container = document.getElementById('dna-lab-canvas-container');
        if (container) {
            container.classList.add('lab-glitched');
            setTimeout(() => container.classList.remove('lab-glitched'), 300);
        }
    },

    destroy: function () {
        if (this.specterMesh && this.lab && this.lab.scene) {
            this.lab.scene.remove(this.specterMesh);
            this.specterMesh.geometry.dispose();
            this.specterMesh.material.dispose();
        }
        if (this.bloodOverlay && this.bloodOverlay.parentNode) {
            this.bloodOverlay.parentNode.removeChild(this.bloodOverlay);
        }
        this.specterMesh = null;
        this.bloodOverlay = null;
        this.lab = null;
    }
};

window.LabBreach = LabBreach;
