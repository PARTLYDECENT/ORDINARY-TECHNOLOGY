/**
 * PROJECT ESCAPISM — HIGH-FIDELITY Cyber Stark Intro System
 * Stark black background, glowing white falling genetic rain.
 * Perspective projected 3D wireframe animations (DNA strand and Hantavirus sphere).
 * Web Audio synthesised hum/drone and data click sound effects.
 * Authoritative deep voice TTS briefing narration.
 */

(function () {
    // Inject Custom Styles for the premium Stark Cyber Intro
    const styles = `
        @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap');

        #tutorial-intro {
            font-family: 'Share Tech Mono', monospace !important;
            background: #000000 !important;
            color: #ffffff !important;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            z-index: 999999 !important;
            box-sizing: border-box;
            padding: 0 !important;
        }

        #intro-canvas {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 1;
        }

        .intro-overlay-container {
            position: relative;
            z-index: 10;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: space-between;
            width: 90%;
            max-width: 800px;
            height: 85vh;
            pointer-events: none;
            box-sizing: border-box;
            padding: 20px 0;
        }

        .briefing-box {
            background: rgba(0, 0, 0, 0.75);
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 4px;
            padding: 30px;
            width: 100%;
            box-sizing: border-box;
            pointer-events: auto;
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            display: flex;
            flex-direction: column;
            gap: 12px;
            margin-top: auto;
            margin-bottom: auto;
            box-shadow: 0 15px 40px rgba(0, 0, 0, 0.9);
        }

        .briefing-subtitle {
            font-size: 0.75rem;
            color: rgba(255, 255, 255, 0.5);
            letter-spacing: 4px;
            text-transform: uppercase;
            font-weight: bold;
        }

        .briefing-title {
            font-size: 1.4rem;
            font-weight: 700;
            color: #ffffff;
            letter-spacing: 2px;
            text-transform: uppercase;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            padding-bottom: 8px;
        }

        .briefing-text {
            font-size: 1.05rem;
            line-height: 1.6;
            color: rgba(255, 255, 255, 0.95);
            min-height: 100px;
            word-wrap: break-word;
        }

        .spec-grid {
            margin-top: 10px;
            display: grid;
            grid-template-columns: 1fr;
            gap: 8px;
            border-top: 1px dotted rgba(255, 255, 255, 0.2);
            padding-top: 12px;
        }

        .spec-row {
            display: flex;
            justify-content: space-between;
            font-size: 0.8rem;
        }

        .spec-label {
            color: rgba(255, 255, 255, 0.5);
            letter-spacing: 1px;
            text-transform: uppercase;
        }

        .spec-value {
            color: #ffffff;
            font-weight: bold;
        }

        /* Controls footer */
        .controls-row {
            width: 100%;
            display: flex;
            justify-content: space-between;
            align-items: center;
            pointer-events: auto;
            background: rgba(0, 0, 0, 0.7);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 4px;
            padding: 15px 25px;
            box-sizing: border-box;
        }

        .progress-dots {
            display: flex;
            gap: 10px;
        }

        .dot {
            width: 8px;
            height: 8px;
            border: 1px solid rgba(255, 255, 255, 0.4);
            background: transparent;
            border-radius: 50%;
            cursor: pointer;
            transition: all 0.25s ease;
        }

        .dot.active {
            background: #ffffff;
            border-color: #ffffff;
            box-shadow: 0 0 8px #ffffff;
        }

        .cyber-btn {
            background: transparent;
            border: 1px solid rgba(255, 255, 255, 0.2);
            color: rgba(255, 255, 255, 0.85);
            padding: 8px 18px;
            border-radius: 2px;
            font-size: 0.8rem;
            font-family: inherit;
            font-weight: 600;
            letter-spacing: 2px;
            cursor: pointer;
            text-transform: uppercase;
            transition: all 0.2s ease;
        }

        .cyber-btn:hover:not(:disabled) {
            background: rgba(255, 255, 255, 0.08);
            border-color: #ffffff;
            color: #ffffff;
            box-shadow: 0 0 10px rgba(255, 255, 255, 0.15);
        }

        .cyber-btn:disabled {
            opacity: 0.25;
            cursor: not-allowed;
        }

        .cyber-btn.deploy {
            border-color: #ffffff;
            color: #ffffff;
            font-weight: bold;
            box-shadow: 0 0 8px rgba(255, 255, 255, 0.1);
        }
    `;

    // Audio synthesizer helper (programmatic Web Audio sound effects)
    const AudioSynth = {
        ctx: null,
        droneOsc: null,
        modOsc: null,
        droneGain: null,
        pulseInterval: null,

        init() {
            if (this.ctx) return;
            try {
                this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            } catch (e) {
                console.warn("[Synth] Could not init AudioContext:", e);
            }
        },

        // Short clicky sound for typewriter effect
        playClick(freq = 1100, duration = 0.01) {
            this.init();
            if (!this.ctx) return;
            try {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

                gain.gain.setValueAtTime(0.012, this.ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

                osc.connect(gain);
                gain.connect(this.ctx.destination);

                osc.start();
                osc.stop(this.ctx.currentTime + duration);
            } catch (e) {}
        },

        // Sweep whoosh for slide transitions
        playTransitionSweep() {
            this.init();
            if (!this.ctx) return;
            try {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc.type = 'triangle';
                osc.frequency.setValueAtTime(140, this.ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(550, this.ctx.currentTime + 0.3);

                gain.gain.setValueAtTime(0.001, this.ctx.currentTime);
                gain.gain.linearRampToValueAtTime(0.05, this.ctx.currentTime + 0.08);
                gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.35);

                osc.connect(gain);
                gain.connect(this.ctx.destination);

                osc.start();
                osc.stop(this.ctx.currentTime + 0.35);
            } catch (e) {}
        },

        // Low frequency alarm/warning hum
        playWarningSweep() {
            this.init();
            if (!this.ctx) return;
            try {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(65, this.ctx.currentTime);
                osc.frequency.linearRampToValueAtTime(120, this.ctx.currentTime + 0.2);
                osc.frequency.linearRampToValueAtTime(65, this.ctx.currentTime + 0.4);

                const filter = this.ctx.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(200, this.ctx.currentTime);

                gain.gain.setValueAtTime(0.001, this.ctx.currentTime);
                gain.gain.linearRampToValueAtTime(0.035, this.ctx.currentTime + 0.08);
                gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.45);

                osc.connect(filter);
                filter.connect(gain);
                gain.connect(this.ctx.destination);

                osc.start();
                osc.stop(this.ctx.currentTime + 0.45);
            } catch (e) {}
        },

        // High pitch chord chime on skip/completion
        playSuccessChime() {
            this.init();
            if (!this.ctx) return;
            try {
                const now = this.ctx.currentTime;
                const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
                notes.forEach((freq, idx) => {
                    const osc = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();

                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(freq, now + idx * 0.08);

                    gain.gain.setValueAtTime(0.0001, now + idx * 0.08);
                    gain.gain.linearRampToValueAtTime(0.025, now + idx * 0.08 + 0.02);
                    gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 0.35);

                    osc.connect(gain);
                    gain.connect(this.ctx.destination);

                    osc.start(now + idx * 0.08);
                    osc.stop(now + idx * 0.08 + 0.35);
                });
            } catch (e) {}
        },

        startDrone() {
            this.init();
            if (!this.ctx) return;
            try {
                const t = this.ctx.currentTime;
                
                this.droneOsc = this.ctx.createOscillator();
                this.droneOsc.type = 'sine';
                this.droneOsc.frequency.setValueAtTime(55, t);
                
                this.modOsc = this.ctx.createOscillator();
                this.modOsc.type = 'sine';
                this.modOsc.frequency.setValueAtTime(0.25, t);
                
                this.droneGain = this.ctx.createGain();
                this.droneGain.gain.setValueAtTime(0.06, t);
                
                const modGain = this.ctx.createGain();
                modGain.gain.setValueAtTime(0.02, t);
                this.modOsc.connect(modGain);
                modGain.connect(this.droneGain.gain);
                
                const filter = this.ctx.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(110, t);
                
                this.droneOsc.connect(filter);
                filter.connect(this.droneGain);
                this.droneGain.connect(this.ctx.destination);
                
                this.droneOsc.start();
                this.modOsc.start();

                this.pulseInterval = setInterval(() => {
                    if (!this.ctx) return;
                    this.playClick(1300, 0.1);
                }, 4000);
            } catch (e) {}
        },

        stopDrone() {
            try {
                if (this.droneOsc) {
                    this.droneOsc.stop();
                    this.droneOsc.disconnect();
                }
                if (this.modOsc) {
                    this.modOsc.stop();
                    this.modOsc.disconnect();
                }
                if (this.droneGain) {
                    this.droneGain.disconnect();
                }
                if (this.pulseInterval) {
                    clearInterval(this.pulseInterval);
                }
            } catch (e) {}
        }
    };

    // Digital Code Rain Character streams
    const RainStream = {
        x: 0,
        y: 0,
        speed: 0,
        chars: [],
        init(x) {
            this.x = x;
            this.y = Math.random() * -800;
            this.speed = 1.5 + Math.random() * 4;
            this.chars = [];
            const length = 6 + Math.floor(Math.random() * 14);
            const alphabet = 'ACGT01☣️🧬';
            for (let i = 0; i < length; i++) {
                this.chars.push(alphabet[Math.floor(Math.random() * alphabet.length)]);
            }
        },
        update(height) {
            this.y += this.speed;
            if (this.y > height + 200) {
                this.init(this.x);
            }
            if (Math.random() < 0.04) {
                const alphabet = 'ACGT01☣️🧬';
                const idx = Math.floor(Math.random() * this.chars.length);
                this.chars[idx] = alphabet[Math.floor(Math.random() * alphabet.length)];
            }
        },
        draw(ctx) {
            ctx.font = '15px "Share Tech Mono", monospace';
            for (let i = 0; i < this.chars.length; i++) {
                const charY = this.y - (i * 20);
                if (charY < 0) continue;
                
                const alpha = (1 - (i / this.chars.length)) * 0.12;
                if (i === 0) {
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
                    ctx.shadowColor = '#ffffff';
                    ctx.shadowBlur = 3;
                } else {
                    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
                    ctx.shadowBlur = 0;
                }
                ctx.fillText(this.chars[i], this.x, charY);
            }
            ctx.shadowBlur = 0;
        }
    };

    // Rotating 3D Perspective DNA Wireframe
    const WireframeDNA = {
        rotation: 0,
        draw(ctx, width, height, scaleFactor) {
            this.rotation += 0.015;
            
            const centerX = width / 2;
            const centerY = height / 2.8; // positioned slightly above text box
            const rMax = 70 * scaleFactor;
            const length = 200 * scaleFactor;
            const numNodes = 24;
            
            ctx.shadowColor = '#ffffff';
            ctx.shadowBlur = 6 * scaleFactor;
            
            const projectedA = [];
            const projectedB = [];
            
            for (let i = 0; i < numNodes; i++) {
                const pct = i / (numNodes - 1);
                const yOffset = (pct - 0.5) * length;
                const angle = pct * Math.PI * 3.5 + this.rotation;
                
                const xA = Math.cos(angle) * rMax;
                const zA = Math.sin(angle) * rMax;
                
                const xB = -xA;
                const zB = -zA;
                
                const scaleA = 220 / (220 + zA);
                const scaleB = 220 / (220 + zB);
                
                const pxA = centerX + xA * scaleA;
                const pyA = centerY + yOffset;
                
                const pxB = centerX + xB * scaleB;
                const pyB = centerY + yOffset;
                
                projectedA.push({ x: pxA, y: pyA, z: zA });
                projectedB.push({ x: pxB, y: pyB, z: zB });
                
                if (i % 2 === 0) {
                    ctx.beginPath();
                    ctx.moveTo(pxA, pyA);
                    ctx.lineTo(pxB, pyB);
                    const alpha = 0.16 * (1.0 - (zA + zB) / (2 * rMax)) * scaleFactor;
                    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
                    ctx.lineWidth = 1.0;
                    ctx.stroke();
                }
            }
            
            // Draw backbone strand A
            ctx.beginPath();
            for (let i = 0; i < numNodes; i++) {
                if (i === 0) ctx.moveTo(projectedA[i].x, projectedA[i].y);
                else ctx.lineTo(projectedA[i].x, projectedA[i].y);
            }
            ctx.strokeStyle = `rgba(255, 255, 255, ${0.4 * scaleFactor})`;
            ctx.lineWidth = 1.2;
            ctx.stroke();
            
            // Draw backbone strand B
            ctx.beginPath();
            for (let i = 0; i < numNodes; i++) {
                if (i === 0) ctx.moveTo(projectedB[i].x, projectedB[i].y);
                else ctx.lineTo(projectedB[i].x, projectedB[i].y);
            }
            ctx.strokeStyle = `rgba(255, 255, 255, ${0.4 * scaleFactor})`;
            ctx.lineWidth = 1.2;
            ctx.stroke();
            
            // Draw base nodes
            for (let i = 0; i < numNodes; i++) {
                ctx.fillStyle = '#ffffff';
                
                ctx.beginPath();
                const radA = (projectedA[i].z < 0 ? 3.5 : 1.8) * scaleFactor;
                ctx.arc(projectedA[i].x, projectedA[i].y, radA, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.beginPath();
                const radB = (projectedB[i].z < 0 ? 3.5 : 1.8) * scaleFactor;
                ctx.arc(projectedB[i].x, projectedB[i].y, radB, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.shadowBlur = 0;
        }
    };

    // Rotating 3D Perspective Sphere representing Hantavirus containment sphere
    const WireframeSphere = {
        rotationX: 0,
        rotationY: 0,
        draw(ctx, width, height, scaleFactor) {
            this.rotationX += 0.008;
            this.rotationY += 0.012;
            
            const centerX = width / 2;
            const centerY = height / 2.8;
            const radius = 80 * scaleFactor;
            
            ctx.shadowColor = '#ffffff';
            ctx.shadowBlur = 8 * scaleFactor;
            
            const rings = 10;
            const segments = 16;
            
            // Draw Latitude rings
            for (let i = 1; i < rings; i++) {
                const phi = (i / rings) * Math.PI;
                ctx.beginPath();
                for (let j = 0; j <= segments; j++) {
                    const theta = (j / segments) * Math.PI * 2;
                    
                    const x = radius * Math.sin(phi) * Math.cos(theta);
                    const y = radius * Math.cos(phi);
                    const z = radius * Math.sin(phi) * Math.sin(theta);
                    
                    // Rotate X
                    const ry1 = y * Math.cos(this.rotationX) - z * Math.sin(this.rotationX);
                    const rz1 = y * Math.sin(this.rotationX) + z * Math.cos(this.rotationX);
                    
                    // Rotate Y
                    const rx2 = x * Math.cos(this.rotationY) + rz1 * Math.sin(this.rotationY);
                    const rz2 = -x * Math.sin(this.rotationY) + rz1 * Math.cos(this.rotationY);
                    
                    const scale = 250 / (250 + rz2);
                    const px = centerX + rx2 * scale;
                    const py = centerY + ry1 * scale;
                    
                    if (j === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                }
                ctx.strokeStyle = `rgba(255, 255, 255, ${0.25 * scaleFactor})`;
                ctx.lineWidth = 0.8;
                ctx.stroke();
            }

            // Draw Longitude segments
            for (let j = 0; j < segments; j++) {
                const theta = (j / segments) * Math.PI * 2;
                ctx.beginPath();
                for (let i = 0; i <= rings; i++) {
                    const phi = (i / rings) * Math.PI;
                    
                    const x = radius * Math.sin(phi) * Math.cos(theta);
                    const y = radius * Math.cos(phi);
                    const z = radius * Math.sin(phi) * Math.sin(theta);
                    
                    const ry1 = y * Math.cos(this.rotationX) - z * Math.sin(this.rotationX);
                    const rz1 = y * Math.sin(this.rotationX) + z * Math.cos(this.rotationX);
                    
                    const rx2 = x * Math.cos(this.rotationY) + rz1 * Math.sin(this.rotationY);
                    const rz2 = -x * Math.sin(this.rotationY) + rz1 * Math.cos(this.rotationY);
                    
                    const scale = 250 / (250 + rz2);
                    const px = centerX + rx2 * scale;
                    const py = centerY + ry1 * scale;
                    
                    if (i === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                }
                ctx.strokeStyle = `rgba(255, 255, 255, ${0.25 * scaleFactor})`;
                ctx.lineWidth = 0.8;
                ctx.stroke();
            }

            // Draw spinning containment ring around virus
            ctx.beginPath();
            const ringRadius = radius * 1.35;
            for (let j = 0; j <= 36; j++) {
                const theta = (j / 36) * Math.PI * 2;
                const x = ringRadius * Math.cos(theta);
                const y = 0;
                const z = ringRadius * Math.sin(theta);
                
                const ry1 = y * Math.cos(this.rotationX * 1.5) - z * Math.sin(this.rotationX * 1.5);
                const rz1 = y * Math.sin(this.rotationX * 1.5) + z * Math.cos(this.rotationX * 1.5);
                
                const rx2 = x * Math.cos(this.rotationY * 1.5) + rz1 * Math.sin(this.rotationY * 1.5);
                const rz2 = -x * Math.sin(this.rotationY * 1.5) + rz1 * Math.cos(this.rotationY * 1.5);
                
                const scale = 250 / (250 + rz2);
                const px = centerX + rx2 * scale;
                const py = centerY + ry1 * scale;
                
                if (j === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.strokeStyle = `rgba(255, 255, 255, ${0.55 * scaleFactor})`;
            ctx.lineWidth = 1.2;
            ctx.stroke();
            
            ctx.shadowBlur = 0;
        }
    };

    if (window.addEventListener) {
        window.addEventListener('DOMContentLoaded', initIntroSystem);
    } else {
        initIntroSystem();
    }

    function initIntroSystem() {
        const styleSheet = document.createElement("style");
        styleSheet.innerText = styles;
        document.head.appendChild(styleSheet);

        if (!window.TutorialManager) return;

        const baseSpeak = window.TutorialManager.speak;

        const slidesData = [
            {
                title: "SYSTEM INITIALIZATION",
                subtitle: "DIRECTIVE 01 // ORBITAL DEPLOYMENT",
                text: "ATTENTION OPERATOR: Chassis Model T-1997 is fully initialized. Sector Delta has been compromised by rapid, highly-aggressive bio-organic signatures. Threat level is marked as EXTINCTION. Calibrating tactical feeds now. Prepare for high-intensity defensive sweeps.",
                specs: [
                    { label: "TACTICAL_UNIT", val: "CHASSIS #1997 TITAN COGNITIVE PLATFORM" },
                    { label: "SECTOR_ID", val: "DELTA QUANTUM LAYER // FOREST" },
                    { label: "THREAT_RATING", val: "OMNIPRESENT MUTATION CRITICAL" },
                    { label: "DEFENSE_PROTOCOL", val: "FULL ARSENAL FORCE AUTHORIZED" }
                ]
            },
            {
                title: "HYDROGEN SCOOP ASSEMBLY",
                subtitle: "OBJECTIVE 01 // CRITICAL INTEGRATION",
                text: "MISSION MANDATE: You are deployed without active shields. To survive, you MUST gather three scattered components: the Fuel Cell, the Ionizer, and the Scoop Core. Beacons of cyan light project into the sky at their exact locations. Once fully assembled, the Hydrogen Scoop will establish active health regeneration (REGEN_PROTOCOL), providing constant bio-recovery (+10 HP/sec) to your chassis.",
                specs: [
                    { label: "PRIMARY_UPGRADE", val: "HYDROGEN SCOOP TACTICAL MATRIX" },
                    { label: "REQUIRED_TECH", val: "Fuel Cell (x1) // Ionizer (x1) // Scoop Core (x1)" },
                    { label: "PASSIVE_EFFECT", val: "+10 HP/SEC ACTIVE REGENERATION (MAX HP: 200)" },
                    { label: "LOCATION_PROJ", val: "EXTREME CYAN LIGHT BEACONS (VISIBLE WORLDWIDE)" }
                ]
            },
            {
                title: "PURGE SWARM HIVES",
                subtitle: "OBJECTIVE 02 // SWARM EXCLUSION",
                text: "WARNING // MUTATION DETECTED: Assembling the Hydrogen Scoop triggers a defensive retaliation. Three massive, writhing bio-organic Swarm Hives will activate nearby. These nests act as swarm focal points, spawning endless waves of Shamblers, Pukers, and Throwers. Hives are heavily armored (500 HP each). You must hunt down and neutralize all Hive Nodes to cleanse the quadrant.",
                specs: [
                    { label: "TARGET_SIG", val: "NEST NODE BIOLOGICAL ORBS (3 SCATTERED ACTIVE)" },
                    { label: "HIVE_INTEGRITY", val: "500 UNITS LAYERED BIOLOGICAL ARMOR" },
                    { label: "DEFENDER_SPAWN", val: "MUTANTS & SHAMBLERS GENERATED CONSTANTLY" },
                    { label: "TACTICAL_RESPONSE", val: "PURGE NESTS SWIFTLY TO PREVENT SWARM SATURATION" }
                ]
            },
            {
                title: "SLIPSPACE TRANSITION",
                subtitle: "TRANSITION // CONTINUE TO LEVEL 2",
                text: "SECURE & FOLD: Purging the final Swarm Hive Node triggers a massive energetic shear. Orbital command will lock onto your beacon coordinates, activating the slipspace drive. The fold protocol will warp your chassis into Level 2: Desolation—a hostile, endless flat desert under a majestic, glowing star cloud. All unlocked chassis upgrades, specs, and weapons carry forward. Awaiting final extraction link.",
                specs: [
                    { label: "WARP_DESTINATION", val: "COGNITIVE LAYER 02 // DESOLATION MAP" },
                    { label: "ENVIRONMENT_SIG", val: "EXPANSIVE SAND DUNES // ULTRA-HOT DECREE" },
                    { label: "GEAR_CARRYOVER", val: "ALL UNLOCKED ARSENAL, UPGRADES, & HEALTH RETAINED" },
                    { label: "CONTINUUM_PROTOCOL", val: "INFINITE MUTANT CLEARANCE & HIGH CHASSIS SCORES" }
                ]
            }
        ];

        let activeSlideIdx = 0;
        let isWritingText = false;
        let typingTimeout = null;
        let animId = null;
        let streams = [];

        function resizeCanvas() {
            const canvas = document.getElementById('intro-canvas');
            if (canvas) {
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
            }
        }

        window.TutorialManager.start = function (onComplete) {
            this.onComplete = onComplete;
            activeSlideIdx = 0;

            this.initAudio();
            AudioSynth.startDrone();

            const introPanel = document.getElementById('tutorial-intro');
            if (!introPanel) {
                console.error("[Intro] Critical error: tutorial-intro element missing!");
                if (this.onComplete) this.onComplete();
                return;
            }

            introPanel.style.display = 'flex';
            introPanel.style.opacity = '1';
            introPanel.style.padding = '0';

            introPanel.innerHTML = `
                <canvas id="intro-canvas"></canvas>
                
                <!-- Skip Button -->
                <button class="cyber-btn" id="intro-skip-btn" style="position: absolute; top: 30px; right: 30px; z-index: 100; pointer-events: auto;">
                    Skip Neural Link
                </button>

                <div class="intro-overlay-container">
                    <div class="briefing-box">
                        <div class="briefing-subtitle" id="briefing-subtitle-content"></div>
                        <div class="briefing-title" id="briefing-title-content"></div>
                        <div class="briefing-text" id="briefing-text-content"></div>
                        <div class="spec-grid" id="briefing-spec-grid"></div>
                    </div>

                    <div class="controls-row">
                        <div class="progress-dots" id="intro-progress-dots"></div>
                        <div style="display: flex; gap: 15px;">
                            <button class="cyber-btn" id="intro-prev-btn" disabled>PREV</button>
                            <button class="cyber-btn" id="intro-next-btn">NEXT</button>
                        </div>
                    </div>
                </div>
            `;

            const canvas = document.getElementById('intro-canvas');
            const ctx = canvas.getContext('2d');
            window.addEventListener('resize', resizeCanvas);
            resizeCanvas();

            // Set up digital code rain columns
            streams = [];
            const colWidth = 22;
            const numStreams = Math.ceil(window.innerWidth / colWidth);
            for (let i = 0; i < numStreams; i++) {
                const s = Object.create(RainStream);
                s.init(i * colWidth);
                streams.push(s);
            }

            // Animation render loop
            const loop = () => {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                streams.forEach(s => {
                    s.update(canvas.height);
                    s.draw(ctx);
                });

                // Wireframe visuals (DNA for briefings 1-3, Hantavirus sphere for final briefing)
                const wireframeScale = 1.0 + Math.sin(Date.now() * 0.0018) * 0.04;
                if (activeSlideIdx === 3) {
                    WireframeSphere.draw(ctx, canvas.width, canvas.height, wireframeScale);
                } else {
                    WireframeDNA.draw(ctx, canvas.width, canvas.height, wireframeScale);
                }

                animId = requestAnimationFrame(loop);
            };
            loop();

            // Progress dots setup
            const dotsContainer = document.getElementById('intro-progress-dots');
            dotsContainer.innerHTML = '';
            slidesData.forEach((_, idx) => {
                const dot = document.createElement('div');
                dot.className = `dot ${idx === 0 ? 'active' : ''}`;
                dot.onclick = () => {
                    if (isWritingText) skipTypingCurrentSlide();
                    goToSlide(idx);
                };
                dotsContainer.appendChild(dot);
            });

            // Button controls handlers
            document.getElementById('intro-prev-btn').onclick = () => {
                if (isWritingText) { skipTypingCurrentSlide(); return; }
                goToSlide(activeSlideIdx - 1);
            };
            document.getElementById('intro-next-btn').onclick = () => {
                if (isWritingText) { skipTypingCurrentSlide(); return; }
                goToSlide(activeSlideIdx + 1);
            };
            document.getElementById('intro-skip-btn').onclick = (e) => {
                e.stopPropagation();
                AudioSynth.playSuccessChime();
                finishIntro();
            };

            window.addEventListener('keydown', handleIntroKeydown);
            renderSlide(0);
        };

        function finishIntro() {
            window.removeEventListener('keydown', handleIntroKeydown);
            window.removeEventListener('resize', resizeCanvas);
            if (animId) cancelAnimationFrame(animId);

            AudioSynth.stopDrone();
            try {
                window.speechSynthesis.cancel();
            } catch (e) {}

            const introPanel = document.getElementById('tutorial-intro');
            if (introPanel) {
                introPanel.style.opacity = '0';
                introPanel.style.transition = 'opacity 0.6s ease-out';
                setTimeout(() => {
                    introPanel.style.display = 'none';
                    if (window.TutorialManager.onComplete) {
                        const cb = window.TutorialManager.onComplete;
                        window.TutorialManager.onComplete = null;
                        cb();
                    }
                    if (window.SFX && typeof window.SFX.startBGM === 'function') {
                        SFX.startBGM();
                    }
                }, 600);
            }
        }

        function goToSlide(idx) {
            if (idx < 0 || idx >= slidesData.length) return;
            
            if (idx === 2) {
                AudioSynth.playWarningSweep();
            } else {
                AudioSynth.playTransitionSweep();
            }

            activeSlideIdx = idx;
            renderSlide(idx);
        }

        function handleIntroKeydown(e) {
            if (e.key === 'ArrowRight' || e.code === 'Space' || e.code === 'Enter') {
                e.preventDefault();
                if (isWritingText) {
                    skipTypingCurrentSlide();
                } else {
                    if (activeSlideIdx === slidesData.length - 1) {
                        AudioSynth.playSuccessChime();
                        finishIntro();
                    } else {
                        goToSlide(activeSlideIdx + 1);
                    }
                }
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                if (isWritingText) {
                    skipTypingCurrentSlide();
                } else {
                    goToSlide(activeSlideIdx - 1);
                }
            } else if (e.key === 'Escape') {
                e.preventDefault();
                AudioSynth.playSuccessChime();
                finishIntro();
            }
        }

        function skipTypingCurrentSlide() {
            clearTimeout(typingTimeout);
            isWritingText = false;
            const slide = slidesData[activeSlideIdx];
            document.getElementById('briefing-text-content').innerHTML = slide.text;
            renderSpecs(slide.specs);
        }

        function typeTextEffect(text, specs) {
            clearTimeout(typingTimeout);
            isWritingText = true;
            const targetEl = document.getElementById('briefing-text-content');
            targetEl.innerHTML = '';
            
            let charIndex = 0;
            const typeChar = () => {
                if (charIndex < text.length) {
                    targetEl.innerHTML += text.charAt(charIndex);
                    if (charIndex % 2 === 0) {
                        AudioSynth.playClick(900 + (charIndex % 6) * 70, 0.008);
                    }
                    charIndex++;
                    typingTimeout = setTimeout(typeChar, 16);
                } else {
                    isWritingText = false;
                    renderSpecs(specs);
                }
            };
            typeChar();
        }

        function renderSpecs(specs) {
            const specGrid = document.getElementById('briefing-spec-grid');
            specGrid.innerHTML = '';
            specs.forEach(s => {
                const row = document.createElement('div');
                row.className = 'spec-row';
                row.innerHTML = `
                    <span class="spec-label">${s.label}</span>
                    <span class="spec-value">${s.val}</span>
                `;
                specGrid.appendChild(row);
            });
        }

        function renderSlide(idx) {
            const slide = slidesData[idx];
            const isLast = idx === slidesData.length - 1;

            document.getElementById('briefing-subtitle-content').textContent = slide.subtitle;
            document.getElementById('briefing-title-content').textContent = slide.title;

            typeTextEffect(slide.text, slide.specs);
            
            if (baseSpeak && typeof baseSpeak === 'function') {
                try {
                    baseSpeak.call(window.TutorialManager, slide.text);
                } catch (e) {
                    console.warn("Speech failed:", e);
                }
            }

            document.getElementById('intro-prev-btn').disabled = idx === 0;
            
            const nextBtn = document.getElementById('intro-next-btn');
            if (isLast) {
                nextBtn.innerHTML = 'DEPLOY CHASSIS >>';
                nextBtn.className = 'cyber-btn deploy';
                nextBtn.onclick = (e) => {
                    e.stopPropagation();
                    AudioSynth.playSuccessChime();
                    finishIntro();
                };
            } else {
                nextBtn.innerHTML = 'NEXT >';
                nextBtn.className = 'cyber-btn';
                nextBtn.onclick = (e) => {
                    e.stopPropagation();
                    if (isWritingText) { skipTypingCurrentSlide(); return; }
                    goToSlide(activeSlideIdx + 1);
                };
            }

            const dots = document.querySelectorAll('#intro-progress-dots .dot');
            dots.forEach((dot, dotIdx) => {
                if (dotIdx === idx) dot.classList.add('active');
                else dot.classList.remove('active');
            });
        }
    }
})();
