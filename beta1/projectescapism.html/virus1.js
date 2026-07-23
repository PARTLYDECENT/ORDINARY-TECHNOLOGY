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
        // Drone synth completely disabled — user requested no background humming/noise!
        this.audioActive = false;
    }

    playInteractionSound(pitch = 500, dur = 0.15) {
        // Disabled along with synth engine
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
