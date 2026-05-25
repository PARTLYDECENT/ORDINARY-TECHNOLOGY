// virus1.js - Premium Tech Stack for the Holographic Hantavirus simulation
// Manages multi-shaders, camera aberration glitches, and Hantavirus metrics.
// Plays procedural crawling SFX and leaves trailing fleshy/bloody footprints.

class VirusSimulation {
    constructor() {
        this.activeBossIndex = -1;
        this.morphProgress = 0.0;
        this.systemCorruption = 0.0;
        this.vascularLeakage = 0.0;
        this.pulmonaryCongestion = 0.0;
        this.glitchTimer = 0.0;
        this.initialized = true;

        // --- Web Audio Synthesizer Engine ---
        this.audioCtx = null;
        this.droneOsc1 = null;
        this.droneOsc2 = null;
        this.droneFilter = null;
        this.synthOsc = null;
        this.synthGain = null;
        this.audioActive = false;

        this.bloodSpawnTimer = 0.0;
        
        console.log("☣️ Hantavirus Simulation Glitch Engine Initialized (HUD Suppressed).");
    }

    initSynth() {
        if (this.audioCtx) return;
        try {
            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            
            this.droneFilter = this.audioCtx.createBiquadFilter();
            this.droneFilter.type = "lowpass";
            this.droneFilter.frequency.setValueAtTime(140, this.audioCtx.currentTime);
            this.droneFilter.Q.setValueAtTime(5.0, this.audioCtx.currentTime);

            this.droneOsc1 = this.audioCtx.createOscillator();
            this.droneOsc1.type = "triangle";
            this.droneOsc1.frequency.setValueAtTime(55, this.audioCtx.currentTime);
            
            this.droneOsc2 = this.audioCtx.createOscillator();
            this.droneOsc2.type = "sawtooth";
            this.droneOsc2.frequency.setValueAtTime(55.5, this.audioCtx.currentTime);

            const droneGain = this.audioCtx.createGain();
            droneGain.gain.setValueAtTime(0.2, this.audioCtx.currentTime);

            this.droneOsc1.connect(this.droneFilter);
            this.droneOsc2.connect(this.droneFilter);
            this.droneFilter.connect(droneGain);
            droneGain.connect(this.audioCtx.destination);

            this.synthOsc = this.audioCtx.createOscillator();
            this.synthOsc.type = "sine";
            this.synthOsc.frequency.setValueAtTime(440, this.audioCtx.currentTime);

            this.synthGain = this.audioCtx.createGain();
            this.synthGain.gain.setValueAtTime(0, this.audioCtx.currentTime);

            const synthFilter = this.audioCtx.createBiquadFilter();
            synthFilter.type = "bandpass";
            synthFilter.frequency.setValueAtTime(800, this.audioCtx.currentTime);
            synthFilter.Q.setValueAtTime(12.0, this.audioCtx.currentTime);

            this.synthOsc.connect(synthFilter);
            synthFilter.connect(this.synthGain);
            this.synthGain.connect(this.audioCtx.destination);

            this.droneOsc1.start();
            this.droneOsc2.start();
            this.synthOsc.start();

            this.audioActive = true;

            // Modulate drone frequency continuously with walk cycle speed
            setInterval(() => {
                if (!this.audioActive) return;
                const walkFreqMod = Math.sin(Date.now() * 0.006) * 15.0;
                const currentCutoff = 130 + walkFreqMod + this.morphProgress * 120;
                this.droneFilter.frequency.setTargetAtTime(currentCutoff, this.audioCtx.currentTime, 0.1);
                this.droneOsc1.frequency.setTargetAtTime(55 + this.morphProgress * 5.0, this.audioCtx.currentTime, 0.2);
            }, 80);

        } catch(e) {
            console.warn("Web Audio initialization skipped: ", e);
        }
    }

    playInteractionSound(pitch = 500, dur = 0.15) {
        if (!this.audioCtx || !this.audioActive) return;
        const now = this.audioCtx.currentTime;
        this.synthOsc.frequency.setValueAtTime(pitch, now);
        this.synthOsc.frequency.exponentialRampToValueAtTime(pitch * 0.2, now + dur);
        this.synthGain.gain.setValueAtTime(0.2, now);
        this.synthGain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    }

    update(activeIdx, morphProgress, deltaTime, elapsedTime) {
        this.activeBossIndex = activeIdx;
        this.morphProgress = morphProgress;

        if (this.activeBossIndex >= 0 && this.morphProgress > 0.01) {
            // Auto initialize synthesizer on boss morphing
            if (!this.audioActive) {
                this.initSynth();
            }

            // Compute dynamic Hantavirus simulation parameters
            this.systemCorruption = this.morphProgress;
            this.vascularLeakage = 0.4 + Math.sin(elapsedTime * 6.5) * 0.15 + this.morphProgress * 0.45;
            this.pulmonaryCongestion = 0.55 + Math.cos(elapsedTime * 4.8) * 0.18 + this.morphProgress * 0.27;

            // Play procedural clicking/crawling sounds on walk steps
            if (this.audioActive && Math.random() < 0.12) {
                this.playInteractionSound(180 + Math.random() * 320, 0.08);
            }

            // --- BLOOD TRAIL FOOTPRINTS / DRIPS SPAWNING ---
            // Periodically spawn bloody meat chunks and fluid pools as the phage boss walks
            this.bloodSpawnTimer += deltaTime;
            if (this.bloodSpawnTimer > 0.22) {
                this.bloodSpawnTimer = 0.0;
                
                // Get boss position from global arrays on main thread
                if (window.zPosX && window.zPosZ && window.zPosX[this.activeBossIndex] !== undefined) {
                    const bx = window.zPosX[this.activeBossIndex];
                    const bz = window.zPosZ[this.activeBossIndex];
                    const by = window.TerrainGen ? window.TerrainGen.getMeshHeight(bx, bz) + 0.1 : 0.2;

                    // Spawn visceral debris chunks at boss feet
                    if (window.goreSystem) {
                        window.goreSystem.spawnGoreGribs(
                            bx + (Math.random() - 0.5) * 1.5,
                            by,
                            bz + (Math.random() - 0.5) * 1.5,
                            'goliath'
                        );
                    }
                }
            }
        }
    }

    // Returns a dynamic aberration factor for screen chromatic aberration / camera glitching
    getGlitchFactor(elapsedTime) {
        if (this.activeBossIndex < 0 || this.morphProgress < 0.02) return 0.0;
        // High glitch intensity during active morph transition phase
        const morphIntensity = Math.sin(this.morphProgress * Math.PI) * 0.8;
        const steadyGlitch = 0.15 + Math.sin(elapsedTime * 22.0) * Math.cos(elapsedTime * 17.5) * 0.1;
        
        this.glitchTimer += 0.016;
        let randomSpike = 0.0;
        if (Math.random() > 0.97) {
            randomSpike = Math.random() * 0.85; // Massive random simulator dropouts
        }

        return (morphIntensity + steadyGlitch * this.morphProgress + randomSpike) * 0.75;
    }
}

// Attach globally
window.VirusSimulation = new VirusSimulation();
