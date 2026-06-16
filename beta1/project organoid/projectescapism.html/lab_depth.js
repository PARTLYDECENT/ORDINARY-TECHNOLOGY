/**
 * PROJECT ESCAPISM — ROTARY DNA LAB DEPTH ENGINE
 * Manages abyssal lighting, shadow vignettes, and audio distortion based on laboratory trial depth.
 */

const LabDepth = {
    lab: null,
    depth: 100,
    targetDepth: 100,
    vignetteOverlay: null,
    lastWhisperTime: 0,
    lastScareDepth: 0,

    init: function (labInstance) {
        this.lab = labInstance;
        this.depth = 100;
        this.targetDepth = 100;
        this.lastWhisperTime = 0;
        this.lastScareDepth = 100;

        // Create a full-screen CSS vignette overlay to darken the screen at high depths
        this.vignetteOverlay = document.createElement('div');
        this.vignetteOverlay.id = 'depth-vignette-overlay';
        this.vignetteOverlay.style.position = 'absolute';
        this.vignetteOverlay.style.top = '0';
        this.vignetteOverlay.style.left = '0';
        this.vignetteOverlay.style.width = '100%';
        this.vignetteOverlay.style.height = '100%';
        this.vignetteOverlay.style.pointerEvents = 'none';
        this.vignetteOverlay.style.zIndex = '9999';
        this.vignetteOverlay.style.transition = 'background 0.3s ease';
        
        // Initial light gradient
        this.updateVignette(0);

        const container = document.getElementById('dna-lab-viewport-container');
        if (container) {
            container.appendChild(this.vignetteOverlay);
        }
    },

    update: function (dt) {
        if (!this.lab || !this.lab.scene) return;

        // Smoothly interpolate depth
        this.depth += (this.targetDepth - this.depth) * 0.05;

        // Display updated depth value
        const display = document.getElementById('val-depth-display');
        if (display) {
            display.innerText = Math.floor(this.depth) + ' m';
            if (this.depth > 4000) {
                display.className = 'font-red';
            } else if (this.depth > 1500) {
                display.className = 'font-yellow';
            } else {
                display.className = 'font-green';
            }
        }

        // Calculate depth ratio (0.0 to 1.0)
        const ratio = (this.depth - 100) / 6566; // max 6666m

        // 1. Darken Ambient & Directional Lights in Three.js
        this.lab.scene.traverse((obj) => {
            if (obj.isAmbientLight) {
                // Dim ambient light to near pitch black
                obj.color.setRGB(
                    (0.02 * (1.0 - ratio)), 
                    (0.08 * (1.0 - ratio)), 
                    (0.06 * (1.0 - ratio))
                );
            }
            if (obj.isDirectionalLight) {
                // Dim directional lights and shift color to deep blood crimson
                const intensity = (1.4 * (1.0 - ratio));
                obj.intensity = Math.max(0.1, intensity);
                obj.color.lerp(new THREE.Color(0x3a0000), 0.02);
            }
        });

        // 2. Increase Fog Density
        if (this.lab.scene.fog) {
            this.lab.scene.fog.density = 0.05 + ratio * 0.22;
            this.lab.scene.fog.color.lerp(new THREE.Color(0x010001), 0.02); // fade fog to absolute black void
        }

        // 3. Constrict the full-screen radial dark vignette
        this.updateVignette(ratio);

        // 4. Trigger Scary Audio Whispers & Screams periodically at high depth
        if (this.depth > 1500) {
            const timeSinceLast = Date.now() - this.lastWhisperTime;
            const whisperCooldown = Math.max(4000, 15000 - ratio * 11000); // gets more frequent as you go deeper
            
            if (timeSinceLast > whisperCooldown) {
                this.lastWhisperTime = Date.now();
                if (window.SFX) {
                    if (this.depth > 4000 && Math.random() < 0.35) {
                        window.SFX.triggerScream(0.7 + Math.random() * 0.5); // terrifying throat shriek
                    } else {
                        window.SFX.triggerUIConfirm(); // low synth echo
                    }
                }
            }
        }

        // 5. Jump-Scare Specter Flash trigger at milestone depths
        if (this.depth > 2000 && this.lastScareDepth < 2000) {
            this.lastScareDepth = 2000;
            if (window.LabBreach) window.LabBreach.triggerSpecterFlash();
        }
        if (this.depth > 4000 && this.lastScareDepth < 4000) {
            this.lastScareDepth = 4000;
            if (window.LabBreach) window.LabBreach.triggerSpecterFlash();
        }
        if (this.depth > 6000 && this.lastScareDepth < 6000) {
            this.lastScareDepth = 6000;
            if (window.LabBreach) window.LabBreach.triggerSpecterFlash();
        }

        // Reset scare milestones if they scroll back up
        if (this.targetDepth < 1000) {
            this.lastScareDepth = 100;
        }
    },

    updateVignette: function (ratio) {
        if (!this.vignetteOverlay) return;
        
        // Inner radius gets smaller (vignette constricts) as you go deeper
        const innerRadius = Math.max(10, 80 - ratio * 75);
        const outerRadius = Math.max(30, 110 - ratio * 80);
        
        // Vignette color turns from a soft shadow into an oppressive reddish-black abyss
        const alpha = Math.min(0.98, 0.4 + ratio * 0.58);
        
        this.vignetteOverlay.style.background = `radial-gradient(circle, rgba(0,0,0,0) ${innerRadius}%, rgba(2, 0, 1, ${alpha}) ${outerRadius}%)`;
    },

    setDepth: function (val) {
        this.targetDepth = val;
    },

    destroy: function () {
        if (this.vignetteOverlay && this.vignetteOverlay.parentNode) {
            this.vignetteOverlay.parentNode.removeChild(this.vignetteOverlay);
        }
        this.vignetteOverlay = null;
        this.lab = null;
    }
};

window.LabDepth = LabDepth;
