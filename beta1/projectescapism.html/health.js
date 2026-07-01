/**
 * ULTIMATE CYBERNETIC VISOR HUD SYSTEM — health.js
 * Professional-grade, highly-responsive sci-fi helmet overlay featuring:
 *  1. Left-Wing Tactical HUD:
 *     - Tactical Threat Radar: Rotates and renders red zombie blips relative to player position/heading.
 *     - Spinning Reactor Core: Interacts with heartbeat rings.
 *     - Nanite Injector Tubes: 3 vertical glass canisters indicating active injection status.
 *  2. Center-Wing Vitalling HUD:
 *     - Dual Segmented Status Rails: Nanite Integrity (HP) & Plasma Shield.
 *     - ECG Synaptic Heartrate Monitor: Rhythmic sinus wave reacting to health, BPM & flatlining.
 *     - Scrolling Diagnostics Log Feed: Chronological scrolling terminal updates.
 *     - Combo Streak & Combat Rating: Floating multiplier display reflecting rapid combat kills.
 *  3. Right-Wing Weaponry & Status HUD:
 *     - Weapon Telemetry Console: Shows equipped weapon name, status, and ammo capacity dynamically.
 *     - Graphical Ammunition Matrix: Grid representation of bullets that deplete/reload.
 *     - Cognitive Buff Indicators: Lights up active perk chips (REGEN, ADRENALINE, SHIELD_BOOST).
 *     - Neural Oscilloscope: Equalizer wave reflecting synaptical frequency noise.
 *     - Environmental Hazards Scanner: Tailored biome analysis metrics based on map ID.
 *  4. Advanced Screen Visual Filters:
 *     - Sliding Visor Compass: sliding degree tape at the top center of viewport.
 *     - Hazard warning overlays and blood veins at low HP.
 *     - Visor Grid: Curvature guidelines, horizontal scanline noise, and screen tearing.
 */

class HealthSystem {
    constructor() {
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'health-canvas';
        this.canvas.style.cssText = `
            position: fixed; bottom: 0; left: 0;
            width: 100%; height: 100%;
            pointer-events: none; z-index: 95;
        `;
        document.body.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');

        // Main health & shield parameters
        this.health = 200;
        this.maxHealth = 200;
        this.displayHealth = 200;
        this.barH = 12;
        
        this.shield = 100;
        this.maxShield = 100;
        this.displayShield = 100;

        // Visual animation & shake
        this.time = 0;
        this.damageFlashAlpha = 0;
        this.healFlashAlpha = 0;
        this.shieldFlashAlpha = 0;
        this.shakeX = 0;
        this.shakeY = 0;
        this.glitchIntensity = 0;
        this.glitchTimer = 0;
        this.glitchText = "";

        // Simulated biometrics
        this.coreTemp = 36.6;
        this.synapseLoad = 45.2;
        this.cellIntegrity = 99.8;

        // Combo system
        this.comboCount = 0;
        this.comboTimer = 0;
        this.lastTotalKills = 0;
        this.comboRank = "STABLE";

        // Weapon ammo grid anim
        this.lastAmmo = 0;
        this.ammoPulseAlpha = 0;

        // Injectors
        this.injectors = [
            { level: 1.0, activeTimer: 0 },
            { level: 1.0, activeTimer: 0 },
            { level: 1.0, activeTimer: 0 }
        ];

        // Heartbeat waves
        this.heartbeatRings = [];
        this.lastHeartbeatTime = 0;

        // Trace vectors
        this.particles = [];
        this.bloodVeins = [];
        this.systemLogs = [
            { text: "NEURAL_BRIDGE STABLE", color: "#00ffcc", time: 0 },
            { text: "VISOR_HUD_EXPANSION COMPLETE", color: "#00b5ff", time: 0 }
        ];

        // ECG parameters
        this.ecgPoints = Array(80).fill(0);
        this.ecgTimer = 0;

        // Threat radar
        this.radarSweepAngle = 0;
        this.detectedBlips = [];
        this.proximityAlert = false;
        this.proximityAngle = 0;

        // Initialize creeping edge veins
        for (let i = 0; i < 16; i++) {
            this.bloodVeins.push({
                side: i < 8 ? 'left' : 'right',
                startY: Math.random(),
                length: 0.12 + Math.random() * 0.2,
                width: 1 + Math.random() * 2,
                curve: (Math.random() - 0.5) * 0.08,
                speed: 0.7 + Math.random() * 1.3,
                phase: Math.random() * Math.PI * 2
            });
        }

        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.w = this.canvas.width;
        this.h = this.canvas.height;
    }

    addLog(text, color = "#e0e8f0") {
        this.systemLogs.push({ text: `[${new Date().toLocaleTimeString().split(' ')[0]}] ${text}`, color, time: this.time });
        if (this.systemLogs.length > 5) {
            this.systemLogs.shift();
        }
    }

    update(newHealth, maxHealth, delta, time) {
        this.time = time;
        this.maxHealth = maxHealth || this.maxHealth;

        // Read Shield Level
        if (window.playerShield !== undefined) {
            this.shield = window.playerShield;
            this.maxShield = window.playerMaxShield || 100;
        } else {
            if (newHealth < this.health) {
                this.shield = Math.max(0, this.shield - (this.health - newHealth) * 1.3);
            } else {
                this.shield = Math.min(this.maxShield, this.shield + delta * 6.5);
            }
        }

        // Weapon Ammo Flashing on shooting
        if (window.inventory && window.currentWeaponIdx !== undefined) {
            const activeWeapon = window.inventory[window.currentWeaponIdx];
            if (activeWeapon && activeWeapon.ammo !== undefined) {
                if (activeWeapon.ammo < this.lastAmmo) {
                    this.ammoPulseAlpha = 1.0;
                }
                this.lastAmmo = activeWeapon.ammo;
            }
        }
        this.ammoPulseAlpha = Math.max(0, this.ammoPulseAlpha - delta * 4.0);

        // Kills Combo Tracker
        const currentKills = (window.getTotalKillsCount ? window.getTotalKillsCount() : 0);
        if (currentKills > this.lastTotalKills) {
            const diff = currentKills - this.lastTotalKills;
            this.comboCount += diff;
            this.comboTimer = 4.5;

            if (this.comboCount >= 10) this.comboRank = "GODLIKE";
            else if (this.comboCount >= 7) this.comboRank = "UNSTOPPABLE";
            else if (this.comboCount >= 5) this.comboRank = "DOMINATING";
            else if (this.comboCount >= 3) this.comboRank = "RAMPAGE";
            else this.comboRank = "FURY";

            this.addLog(`STREAK: COMBO x${this.comboCount} [${this.comboRank}]`, "#ffd700");
            
            // Spawn sparks
            for (let i = 0; i < 5; i++) {
                this.particles.push({
                    x: this.w / 2 - 150 + Math.random() * 300,
                    y: this.h - 55,
                    vx: (Math.random() - 0.5) * 4,
                    vy: -2 - Math.random() * 2,
                    life: 0.6 + Math.random() * 0.4,
                    maxLife: 0.6 + Math.random() * 0.4,
                    size: 2 + Math.random() * 3,
                    type: 'heal'
                });
            }
        }
        this.lastTotalKills = currentKills;

        if (this.comboTimer > 0) {
            this.comboTimer -= delta;
            if (this.comboTimer <= 0) {
                this.comboCount = 0;
                this.comboRank = "STABLE";
            }
        }

        // Damage/Heal Shifts
        if (newHealth < this.health) {
            const dmg = this.health - newHealth;
            this.damageFlashAlpha = Math.min(1.0, dmg / (this.maxHealth * 0.15));
            this.glitchIntensity = Math.min(1.0, this.glitchIntensity + 0.5);
            this.shakeX = (Math.random() - 0.5) * 12;
            this.shakeY = (Math.random() - 0.5) * 9;
            this.addLog(`ALERT: IMPACT DETECTED -${Math.ceil(dmg)}`, "#ff2a3b");

            this.coreTemp += dmg * 0.08;
            this.synapseLoad = Math.min(100, this.synapseLoad + dmg * 0.5);
            this.cellIntegrity = Math.max(0, this.cellIntegrity - dmg * 0.2);

            const codes = ["CRIT_BREACH", "HEM_LEAK_WARN", "SYS_INTEGRITY_COMPROMISED", "NANITE_LINE_ERR", "SYNAPSE_TREMOR"];
            this.glitchText = codes[Math.floor(Math.random() * codes.length)];
            this.glitchTimer = 0.6;

            const emptyIdx = Math.floor(Math.random() * 3);
            this.injectors[emptyIdx].level = 0.0;
            this.injectors[emptyIdx].activeTimer = 1.0;

            const count = Math.min(15, Math.floor(dmg / 1.5));
            for (let i = 0; i < count; i++) {
                this.particles.push({
                    x: this.w / 2 - 150 + 300 * (newHealth / this.maxHealth) + (Math.random() - 0.5) * 15,
                    y: this.h - 50,
                    vx: (Math.random() - 0.3) * 7,
                    vy: -2 - Math.random() * 4,
                    life: 0.5 + Math.random() * 0.5,
                    maxLife: 0.5 + Math.random() * 0.5,
                    size: 2 + Math.random() * 3,
                    type: 'damage'
                });
            }
        } else if (newHealth > this.health) {
            const heal = newHealth - this.health;
            this.healFlashAlpha = 0.8;
            this.addLog(`RECOVERY: NANITE INJECTION +${Math.ceil(heal)}`, "#00ffaa");

            this.coreTemp = Math.max(36.6, this.coreTemp - heal * 0.05);
            this.synapseLoad = Math.max(20, this.synapseLoad - heal * 0.3);
            this.cellIntegrity = Math.min(100, this.cellIntegrity + heal * 0.4);

            for (const inj of this.injectors) {
                if (inj.level < 0.9) {
                    inj.level = 0.0;
                    inj.activeTimer = 1.5; 
                }
            }

            for (let i = 0; i < 10; i++) {
                this.particles.push({
                    x: this.w / 2 - 150 + 300 * (this.health / this.maxHealth) + (Math.random() - 0.5) * 20,
                    y: this.h - 50,
                    vx: (Math.random() - 0.5) * 3,
                    vy: -1 - Math.random() * 3,
                    life: 0.6 + Math.random() * 0.4,
                    maxLife: 0.6 + Math.random() * 0.4,
                    size: 2 + Math.random() * 2,
                    type: 'heal'
                });
            }
        }

        // Shield hit confirmation
        if (this.shield < this.prevShield) {
            this.shieldFlashAlpha = 0.6;
            this.addLog(`DEFLECTOR: KINETIC ABSORB`, "#00b7ff");
            for (let i = 0; i < 6; i++) {
                this.particles.push({
                    x: this.w / 2 - 150 + 300 * (this.shield / this.maxShield) + (Math.random() - 0.5) * 15,
                    y: this.h - 63,
                    vx: (Math.random() - 0.5) * 6,
                    vy: -1 - Math.random() * 2,
                    life: 0.4 + Math.random() * 0.4,
                    maxLife: 0.4 + Math.random() * 0.4,
                    size: 2.5 + Math.random() * 2,
                    type: 'shield'
                });
            }
        }

        this.prevHealth = this.health;
        this.health = newHealth;
        this.prevShield = this.shield;

        // Smooth Lerps
        this.displayHealth += (this.health - this.displayHealth) * Math.min(1, delta * 6.0);
        this.displayShield += (this.shield - this.displayShield) * Math.min(1, delta * 8.0);

        if (Math.abs(this.displayHealth - this.health) < 0.1) this.displayHealth = this.health;
        if (Math.abs(this.displayShield - this.shield) < 0.1) this.displayShield = this.shield;

        // Core noise
        this.coreTemp += (Math.random() - 0.5) * 0.05;
        this.synapseLoad = Math.max(10, Math.min(100, this.synapseLoad + (Math.random() - 0.5) * 0.2));

        // Decays & Tremors
        this.damageFlashAlpha = Math.max(0, this.damageFlashAlpha - delta * 2.5);
        this.healFlashAlpha = Math.max(0, this.healFlashAlpha - delta * 1.8);
        this.shieldFlashAlpha = Math.max(0, this.shieldFlashAlpha - delta * 2.2);
        this.glitchIntensity = Math.max(0, this.glitchIntensity - delta * 2.0);
        if (this.glitchTimer > 0) this.glitchTimer -= delta;

        this.shakeX *= 0.85;
        this.shakeY *= 0.85;

        // Cartridges
        for (const inj of this.injectors) {
            if (inj.activeTimer > 0) {
                inj.activeTimer -= delta;
                inj.level = Math.min(1.0, inj.level + delta * 2.0);
            }
        }

        // Heartbeats
        const hpPct = this.health / this.maxHealth;
        let bpm = 60;
        if (hpPct > 0) {
            bpm = hpPct < 0.3 ? 140 + (1 - hpPct/0.3)*50 : (hpPct < 0.7 ? 85 : 60);
        } else {
            bpm = 0;
        }

        if (bpm > 0) {
            const beatInterval = 60 / bpm;
            if (time - this.lastHeartbeatTime >= beatInterval) {
                this.lastHeartbeatTime = time;
                this.heartbeatRings.push({ radius: 10, alpha: 0.8, maxRadius: 65 });
            }
        }

        // Ring updates
        for (let i = this.heartbeatRings.length - 1; i >= 0; i--) {
            const ring = this.heartbeatRings[i];
            ring.radius += delta * 110;
            ring.alpha = 1.0 - (ring.radius / ring.maxRadius);
            if (ring.radius >= ring.maxRadius || ring.alpha <= 0) {
                this.heartbeatRings.splice(i, 1);
            }
        }

        this._updateECG(delta, bpm);
        this._updateThreatRadar(delta);

        // Particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            if (p.type === 'damage') {
                p.vy += 7 * delta;
            } else if (p.type === 'heal') {
                p.vy -= 1 * delta;
            } else {
                p.vx += (Math.random() - 0.5) * 1.5;
            }
            p.life -= delta;
            if (p.life <= 0) this.particles.splice(i, 1);
        }

        this.render();
    }

    _updateECG(delta, bpm) {
        this.ecgTimer += delta * (bpm / 60) * 8.5;
        let val = 0;
        if (bpm > 0) {
            const phase = this.ecgTimer % (Math.PI * 2);
            if (phase < 0.4) {
                val = Math.sin((phase / 0.4) * Math.PI) * 0.15;
            } else if (phase >= 0.5 && phase < 0.6) {
                val = -((phase - 0.5) / 0.1) * 0.25;
            } else if (phase >= 0.6 && phase < 0.72) {
                val = Math.sin(((phase - 0.6) / 0.12) * Math.PI) * 1.45;
            } else if (phase >= 0.72 && phase < 0.85) {
                val = -0.45 + Math.sin(((phase - 0.72) / 0.13) * Math.PI) * 0.45;
            } else if (phase >= 1.0 && phase < 1.4) {
                val = Math.sin(((phase - 1.0) / 0.4) * Math.PI) * 0.28;
            }

            const hpPct = this.health / this.maxHealth;
            if (hpPct < 0.3) {
                val += (Math.random() - 0.5) * 0.35 * (1 - hpPct / 0.3);
            }
        } else {
            val = (Math.random() - 0.5) * 0.02;
        }

        this.ecgPoints.push(val);
        if (this.ecgPoints.length > 80) this.ecgPoints.shift();
    }

    _updateThreatRadar(delta) {
        this.radarSweepAngle = (this.radarSweepAngle + delta * 2.5) % (Math.PI * 2);

        for (let i = this.detectedBlips.length - 1; i >= 0; i--) {
            const blip = this.detectedBlips[i];
            blip.life -= delta * 1.2;
            if (blip.life <= 0) {
                this.detectedBlips.splice(i, 1);
            }
        }

        this.proximityAlert = false;
        let closestDist = Infinity;
        let closestAngle = 0;

        if (window.zPosX && window.zPosZ && window.zState && window.player && window.getSpawnedZombies) {
            const spawnedZombies = window.getSpawnedZombies();
            const px = window.player.position.x;
            const pz = window.player.position.z;

            const playerRot = window.player.rotation ? window.player.rotation.y : 0;

            for (let i = 0; i < spawnedZombies; i++) {
                if (window.zState[i] === 0) continue; 

                const zx = window.zPosX[i];
                const zz = window.zPosZ[i];

                const dx = zx - px;
                const dz = zz - pz;
                const dist = Math.sqrt(dx * dx + dz * dz);

                if (dist < closestDist) {
                    closestDist = dist;
                    closestAngle = Math.atan2(dx, dz) - playerRot;
                }

                const radarRange = 40.0; 
                if (dist < radarRange) {
                    let angle = Math.atan2(dx, -dz) - playerRot;
                    angle = (angle + Math.PI * 2) % (Math.PI * 2);

                    const sweepDiff = Math.abs(this.radarSweepAngle - angle);
                    if (sweepDiff < 0.1 || sweepDiff > Math.PI * 2 - 0.1) {
                        let existing = this.detectedBlips.find(b => b.id === i);
                        if (existing) {
                            existing.life = 1.0;
                            existing.angle = angle;
                            existing.distPct = dist / radarRange;
                        } else {
                            this.detectedBlips.push({
                                id: i,
                                angle: angle,
                                distPct: dist / radarRange,
                                life: 1.0
                            });
                        }
                    }
                }
            }
        }

        if (closestDist < 6.0) {
            this.proximityAlert = true;
            this.proximityAngle = closestAngle;
        }
    }

    render() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.w, this.h);

        const hpPct = Math.max(0, this.health / this.maxHealth);
        const displayHpPct = Math.max(0, this.displayHealth / this.maxHealth);
        const shPct = Math.max(0, this.shield / this.maxShield);
        const displayShPct = Math.max(0, this.displayShield / this.maxShield);

        ctx.save();
        ctx.translate(this.shakeX, this.shakeY);

        if (this.glitchIntensity > 0.05) {
            this._applyGlitchTearing();
        }

        // Visor grid
        this._renderVisorGrid();

        // Compass tape
        this._renderCompass();

        // Screen bezel warning flash
        if (hpPct < 0.20 && hpPct > 0) {
            this._renderHazardBorder(hpPct);
        }

        // Creeping veins
        if (hpPct < 0.25 && hpPct > 0) {
            this._renderBloodVeins(hpPct);
        }

        // Center coordinates
        const cx = this.w / 2;
        const cy = this.h - 50;

        // 1. LEFT-WING TACTICAL HUB
        this._renderThreatRadar(40, this.h - 135);
        this._renderReactorCore(170, this.h - 90, hpPct);
        this._renderInjectors(245, this.h - 105);

        // 2. CENTER-WING VITALLING HUD
        // this._renderECGGraph(cx - 150, this.h - 95, 300, hpPct);
        this._renderDiagnosticsFeed(cx - 200, this.h - 30);
        
        // Health bar
        this._renderBar(
            cx - 200, cy - 3, 400, 24, 
            hpPct, displayHpPct, 
            'rgba(15, 20, 25, 0.9)', 
            null, 
            null, 
            this.damageFlashAlpha, 
            'INTEGRITY'
        );

        // Shield bar
        this._renderBar(
            cx - 200, cy - 24, 400, 15, 
            shPct, displayShPct, 
            'rgba(0, 75, 180, 0.15)', 
            'rgba(0, 200, 255, 0.4)', 
            'rgba(0, 255, 255, 0.8)', 
            this.shieldFlashAlpha, 
            'SHIELD'
        );

        // Combo indicator
        if (this.comboCount > 0) {
            this._renderComboOverlay(cx, this.h - 110);
        }

        // Proximity alert warn
        if (this.proximityAlert && Math.floor(this.time * 8) % 2 === 0) {
            this._renderProximityAlert(this.w / 2, this.h / 2 - 120);
        }

        // 3. RIGHT-WING WEAPONRY & STATUS HUD
        this._renderBiometricsPanel(this.w - 410, this.h - 115);
        this._renderBuffNodes(this.w - 410, this.h - 45);
        // this._renderOscilloscope(this.w - 240, this.h - 50, 120);
        this._renderWeaponConsole(this.w - 190, this.h - 115);

        // Telemetry glitch text
        if (this.glitchTimer > 0 && Math.random() < 0.7) {
            this._renderGlitchWarning(cx, this.h - 120);
        }

        this._renderParticles();

        ctx.restore();
    }

    _applyGlitchTearing() {
        const ctx = this.ctx;
        if (Math.random() < this.glitchIntensity * 0.5) {
            const shift = (Math.random() - 0.5) * 12 * this.glitchIntensity;
            ctx.translate(shift, 0);
        }
    }

    _renderVisorGrid() {
        const ctx = this.ctx;
        ctx.strokeStyle = 'rgba(0, 255, 200, 0.015)';
        ctx.lineWidth = 1;

        const cornerSize = 40;
        const padding = 25;

        // Corner guides
        ctx.beginPath();
        ctx.moveTo(padding + cornerSize, padding);
        ctx.arcTo(padding, padding, padding, padding + cornerSize, cornerSize);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(this.w - padding - cornerSize, padding);
        ctx.arcTo(this.w - padding, padding, this.w - padding, padding + cornerSize, cornerSize);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(padding + cornerSize, this.h - padding);
        ctx.arcTo(padding, this.h - padding, padding, this.h - padding - cornerSize, cornerSize);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(this.w - padding - cornerSize, this.h - padding);
        ctx.arcTo(this.w - padding, this.h - padding, this.w - padding, this.h - padding - cornerSize, cornerSize);
        ctx.stroke();
    }

    _renderCompass() {
        const ctx = this.ctx;
        const compassW = 360;
        const compassH = 26;
        const cx = this.w / 2;
        const cy = 30;

        ctx.save();
        ctx.fillStyle = 'rgba(5, 8, 12, 0.5)';
        ctx.fillRect(cx - compassW / 2, cy, compassW, compassH);
        ctx.strokeStyle = 'rgba(0, 255, 200, 0.15)';
        ctx.strokeRect(cx - compassW / 2, cy, compassW, compassH);

        const playerRot = (window.player && window.player.rotation) ? window.player.rotation.y : 0;
        let headingDeg = Math.round(((-playerRot * 180 / Math.PI) % 360 + 360) % 360);

        ctx.fillStyle = '#00ffcc';
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx - 6, cy - 6);
        ctx.lineTo(cx + 6, cy - 6);
        ctx.closePath();
        ctx.fill();

        ctx.font = 'bold 15px "Share Tech Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        let headingDir = "N";
        if (headingDeg >= 338.5 || headingDeg < 22.5) headingDir = "N";
        else if (headingDeg >= 22.5 && headingDeg < 67.5) headingDir = "NE";
        else if (headingDeg >= 67.5 && headingDeg < 112.5) headingDir = "E";
        else if (headingDeg >= 112.5 && headingDeg < 157.5) headingDir = "SE";
        else if (headingDeg >= 157.5 && headingDeg < 202.5) headingDir = "S";
        else if (headingDeg >= 202.5 && headingDeg < 247.5) headingDir = "SW";
        else if (headingDeg >= 247.5 && headingDeg < 292.5) headingDir = "W";
        else headingDir = "NW";

        ctx.fillText(`${headingDeg}° ${headingDir}`, cx, cy + compassH + 6);

        ctx.beginPath();
        ctx.strokeStyle = 'rgba(0, 255, 200, 0.4)';
        ctx.font = 'bold 12px "Share Tech Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const tickSpacing = 3.0; 
        const startDeg = headingDeg - (compassW / 2) / tickSpacing;

        ctx.rect(cx - compassW / 2, cy, compassW, compassH);
        ctx.clip(); 

        for (let d = Math.floor(startDeg); d <= startDeg + compassW / tickSpacing; d++) {
            const normalizedDeg = (d % 360 + 360) % 360;
            const tx = cx + (d - headingDeg) * tickSpacing;

            if (normalizedDeg % 30 === 0) {
                ctx.moveTo(tx, cy);
                ctx.lineTo(tx, cy + 12);
                
                let dirLabel = normalizedDeg.toString();
                if (normalizedDeg === 0) dirLabel = "N";
                else if (normalizedDeg === 90) dirLabel = "E";
                else if (normalizedDeg === 180) dirLabel = "S";
                else if (normalizedDeg === 270) dirLabel = "W";

                ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                ctx.fillText(dirLabel, tx, cy + 18);
            } else if (normalizedDeg % 10 === 0) {
                ctx.moveTo(tx, cy);
                ctx.lineTo(tx, cy + 6);
            }
        }
        ctx.stroke();
        ctx.restore();
    }

    _renderComboOverlay(x, y) {
        const ctx = this.ctx;
        ctx.save();
        ctx.translate(x, y);

        const timerPct = Math.max(0, this.comboTimer / 4.5);
        const scale = 1.0 + timerPct * 0.12;
        ctx.scale(scale, scale);

        ctx.font = 'bold 28px "Share Tech Mono", monospace';
        ctx.fillStyle = '#ffcc00';
        ctx.shadowColor = '#ffaa00';
        ctx.shadowBlur = 8;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`COMBO x${this.comboCount}`, 0, -8);
        
        ctx.font = 'bold 15px "Share Tech Mono", monospace';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`STREAK STATUS: ${this.comboRank}`, 0, 15);
        ctx.shadowBlur = 0;

        ctx.strokeStyle = 'rgba(255, 200, 0, 0.15)';
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.arc(0, 26, 12, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = '#ffd700';
        ctx.beginPath();
        ctx.arc(0, 26, 12, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * timerPct));
        ctx.stroke();

        ctx.restore();
    }

    _renderHazardBorder(hpPct) {
        const ctx = this.ctx;
        const pulse = 0.35 + Math.sin(this.time * 9) * 0.2;
        ctx.strokeStyle = `rgba(220, 20, 20, ${pulse})`;
        ctx.lineWidth = 14;
        ctx.strokeRect(7, 7, this.w - 14, this.h - 14);

        ctx.fillStyle = `rgba(220, 20, 20, ${pulse * 0.75})`;
        ctx.font = 'bold 12px "Share Tech Mono", monospace';
        ctx.fillText("/// ALARM: BIO-LINK COMPROMISED ///", 24, 30);
        ctx.fillText("/// WARNING: CHASSIS CORROSION ///", this.w - 280, this.h - 24);
    }

    _renderReactorCore(cx, cy, hpPct) {
        const ctx = this.ctx;
        const radius = 22;

        ctx.save();
        ctx.translate(cx, cy);

        const pulseScale = 1.0 + (this.heartbeatRings.length > 0 ? (1.0 - (this.heartbeatRings[0].radius / 65)) * 0.08 : 0);
        ctx.scale(pulseScale, pulseScale);

        let color = "#00ffa0";
        let shadow = "rgba(0, 255, 160, 0.4)";
        if (hpPct < 0.3) {
            color = "#ff1f3b";
            shadow = `rgba(255, 30, 60, ${0.4 + Math.sin(this.time * 15) * 0.3})`;
        } else if (hpPct < 0.6) {
            color = "#ff9900";
            shadow = "rgba(255, 150, 0, 0.4)";
        }

        for (const ring of this.heartbeatRings) {
            ctx.strokeStyle = color;
            ctx.globalAlpha = ring.alpha;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(0, 0, ring.radius, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.globalAlpha = 1.0;

        ctx.shadowColor = color;
        ctx.shadowBlur = 12;
        ctx.fillStyle = shadow;
        ctx.beginPath();
        ctx.arc(0, 0, radius - 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;

        ctx.save();
        ctx.rotate(this.time * 2.2);
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.setLineDash([6, 15]);
        ctx.stroke();
        ctx.restore();

        ctx.save();
        ctx.rotate(-this.time * 1.2);
        ctx.beginPath();
        ctx.arc(0, 0, radius - 4, 0, Math.PI * 2);
        ctx.setLineDash([20, 25]);
        ctx.stroke();
        ctx.restore();

        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(0, 0, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    _renderInjectors(x, y) {
        const ctx = this.ctx;
        const w = 12;
        const h = 38;
        const gap = 8;

        ctx.font = 'bold 13px "Share Tech Mono", monospace';
        ctx.fillStyle = 'rgba(0, 255, 200, 0.4)';
        ctx.fillText("INJ", x, y - 8);

        for (let i = 0; i < 3; i++) {
            const ix = x + i * (w + gap);
            const inj = this.injectors[i];

            ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
            ctx.lineWidth = 1.2;
            ctx.strokeRect(ix, y, w, h);

            if (inj.level > 0.01) {
                const fillH = (h - 2) * inj.level;
                const fillY = y + h - 1 - fillH;
                const grad = ctx.createLinearGradient(ix, fillY, ix + w, y + h);
                
                if (inj.activeTimer > 0) {
                    grad.addColorStop(0, '#ffffff');
                    grad.addColorStop(1, '#00ffaa');
                } else {
                    grad.addColorStop(0, '#00ffcc');
                    grad.addColorStop(1, '#009977');
                }

                ctx.fillStyle = grad;
                ctx.fillRect(ix + 1.5, fillY, w - 3, fillH);
            }

            ctx.fillStyle = 'rgba(100, 110, 120, 0.6)';
            ctx.fillRect(ix + 3, y - 2, w - 6, 2);
            ctx.fillRect(ix + 3, y + h, w - 6, 2);
        }
    }

    _renderBiometricsPanel(x, y) {
        const ctx = this.ctx;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.font = 'bold 15px "Share Tech Mono", monospace';

        ctx.fillStyle = 'rgba(5, 8, 12, 0.7)';
        ctx.fillRect(x, y, 230, 60);
        ctx.strokeStyle = 'rgba(0, 255, 200, 0.1)';
        ctx.strokeRect(x, y, 230, 60);

        const activeMapId = (window.GAME_START_CONFIG && window.GAME_START_CONFIG.mapId) || 'forest';
        let envVal = "ATMOSPHERE: HIGH SPORES";
        let envMetric = "Spore: 62.4%";
        if (activeMapId === 'desert') {
            envVal = "SURFACE: THERMAL ARID";
            envMetric = "Heat: 44.5°C";
        } else if (activeMapId === 'abyss') {
            envVal = "PRESSURE: DEEP OCEANIC";
            envMetric = "Press: 12.8 bar";
        } else if (activeMapId === 'endgame') {
            envVal = "REALITY: SPACE CORROSION";
            envMetric = "Rad: 4.8 mSv/h";
        }

        ctx.fillStyle = 'rgba(0, 255, 200, 0.6)';
        ctx.fillText(envVal, x + 8, y + 8);

        ctx.fillStyle = '#e0e8f0';
        ctx.fillText(`CORE TEMP:  ${this.coreTemp.toFixed(1)}°C`, x + 8, y + 25);
        ctx.fillText(envMetric, x + 8, y + 42);
    }

    _renderBuffNodes(x, y) {
        const ctx = this.ctx;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold 13px "Share Tech Mono", monospace';

        const buffs = [
            { label: "REGEN", active: window.isHydrogenScoopBuilt || false, col: "#00ffa0" },
            { label: "ADRNL", active: (this.health / this.maxHealth < 0.3) && (this.health > 0), col: "#ffaa00" },
            { label: "S_BOOST", active: this.shield > 80, col: "#00aaff" }
        ];

        for (let i = 0; i < buffs.length; i++) {
            const b = buffs[i];
            const bx = x + i * 75;

            ctx.beginPath();
            ctx.arc(bx + 5, y, 4.5, 0, Math.PI * 2);
            if (b.active) {
                ctx.fillStyle = b.col;
                ctx.shadowColor = b.col;
                ctx.shadowBlur = 6;
                ctx.fill();
                ctx.shadowBlur = 0;
            } else {
                ctx.fillStyle = "rgba(40, 50, 60, 0.8)";
                ctx.fill();
            }

            ctx.fillStyle = b.active ? "#ffffff" : "rgba(120, 130, 140, 0.5)";
            ctx.fillText(b.label, bx + 14, y);
        }
    }

    _renderECGGraph(x, y, w, hpPct) {
        const ctx = this.ctx;
        const h = 30;

        ctx.fillStyle = 'rgba(0, 8, 12, 0.55)';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = 'rgba(0, 255, 180, 0.08)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, w, h);

        ctx.strokeStyle = 'rgba(0, 255, 180, 0.03)';
        ctx.beginPath();
        for (let i = 1; i < 4; i++) {
            const gy = y + (h / 4) * i;
            ctx.moveTo(x, gy);
            ctx.lineTo(x + w, gy);
        }
        for (let i = 1; i < 8; i++) {
            const gx = x + (w / 8) * i;
            ctx.moveTo(gx, y);
            ctx.lineTo(gx, y + h);
        }
        ctx.stroke();

        ctx.beginPath();
        const step = w / (this.ecgPoints.length - 1);
        ctx.lineWidth = hpPct < 0.3 ? 1.8 : 1.2;

        let strokeCol = "rgba(0, 255, 180, 0.85)";
        if (hpPct < 0.3) {
            strokeCol = `rgba(255, 20, 50, ${0.75 + Math.sin(this.time * 18) * 0.25})`;
        } else if (hpPct < 0.6) {
            strokeCol = "rgba(255, 150, 0, 0.85)";
        }
        ctx.strokeStyle = strokeCol;

        for (let i = 0; i < this.ecgPoints.length; i++) {
            const px = x + i * step;
            const py = y + (h / 2) - (this.ecgPoints[i] * (h / 2.7));
            if (i === 0) {
                ctx.moveTo(px, py);
            } else {
                ctx.lineTo(px, py);
            }
        }
        ctx.stroke();

        ctx.fillStyle = hpPct < 0.3 ? "#ff3344" : "#00ffcc";
        ctx.font = '7px "Share Tech Mono", monospace';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
        const hr = hpPct <= 0 ? 0 : (hpPct < 0.3 ? Math.floor(140 + (1 - hpPct/0.3)*50) : 60);
        ctx.fillText(`HR: ${hr} BPM`, x + w - 4, y + 3);
    }

    _renderDiagnosticsFeed(x, y) {
        const ctx = this.ctx;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.font = 'bold 14px "Share Tech Mono", monospace';

        for (let i = 0; i < this.systemLogs.length; i++) {
            const log = this.systemLogs[i];
            const opacity = Math.max(0.25, 1.0 - (this.systemLogs.length - 1 - i) * 0.22);
            ctx.fillStyle = log.color;
            ctx.globalAlpha = opacity;
            ctx.fillText(log.text, x, y + i * 16.0);
        }
        ctx.globalAlpha = 1.0;
    }

    _renderWeaponConsole(x, y) {
        const ctx = this.ctx;
        const w = 170;
        const h = 85;

        ctx.save();
        ctx.translate(x, y);

        // Frame
        ctx.fillStyle = 'rgba(5, 8, 12, 0.7)';
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = 'rgba(0, 255, 200, 0.1)';
        ctx.strokeRect(0, 0, w, h);

        let weaponName = "NONE";
        let ammoCount = "0";
        let maxAmmo = "0";
        let isMelee = false;

        // Fetch weapon data from inventory
        if (window.inventory && window.currentWeaponIdx !== undefined) {
            const activeWeapon = window.inventory[window.currentWeaponIdx];
            if (activeWeapon) {
                weaponName = activeWeapon.name || "UNKNOWN";
                ammoCount = activeWeapon.ammo === Infinity ? "∞" : activeWeapon.ammo.toString();
                maxAmmo = activeWeapon.maxAmmo === Infinity ? "∞" : (activeWeapon.maxAmmo || "0").toString();
                isMelee = activeWeapon.isMelee || false;
            }
        }

        // Header Title
        ctx.fillStyle = 'rgba(0, 255, 200, 0.6)';
        ctx.font = 'bold 12px "Share Tech Mono", monospace';
        ctx.fillText("WEAPONRY SYSTEM", 8, 8);

        // Weapon Name
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 15px "Share Tech Mono", monospace';
        ctx.fillText(weaponName.toUpperCase(), 8, 22);

        // Ammo numeric readout
        ctx.fillStyle = ammoCount === "0" ? "#ff1133" : "#00ffcc";
        ctx.font = 'bold 32px "Share Tech Mono", monospace';
        ctx.fillText(ammoCount, 8, 48);

        // Max capacity
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.font = 'bold 14px "Share Tech Mono", monospace';
        ctx.fillText(`/ ${maxAmmo}`, 80, 48);

        // Graphical Ammo Grid Visualizer
        const gridX = 8;
        const gridY = 64;
        const gridRows = 2;
        const gridCols = 10;
        const cellW = 14;
        const cellH = 8;
        const cellGap = 2;

        // Bullet calculation pct
        let ammoPct = 1.0;
        if (!isMelee && ammoCount !== "∞" && maxAmmo !== "∞") {
            ammoPct = parseFloat(ammoCount) / parseFloat(maxAmmo);
        }

        ctx.save();
        // Shoot ripple flash color adjustment
        if (this.ammoPulseAlpha > 0.01) {
            ctx.fillStyle = `rgba(255, 255, 255, ${this.ammoPulseAlpha})`;
            ctx.fillRect(0, 0, w, h);
        }
        ctx.restore();

        for (let r = 0; r < gridRows; r++) {
            for (let c = 0; c < gridCols; c++) {
                const cx = gridX + c * (cellW + cellGap);
                const cy = gridY + r * (cellH + cellGap);

                const cellIdx = r * gridCols + c;
                const activeLimit = Math.floor(gridRows * gridCols * ammoPct);

                if (isMelee) {
                    // Melee weapon has infinite charged state look
                    ctx.fillStyle = '#00ffcc';
                } else if (ammoCount === "0") {
                    ctx.fillStyle = 'rgba(255, 0, 0, 0.05)';
                } else if (cellIdx < activeLimit) {
                    ctx.fillStyle = '#00ffcc';
                } else {
                    ctx.fillStyle = 'rgba(0, 255, 200, 0.05)'; // Empty slot
                }
                ctx.fillRect(cx, cy, cellW, cellH);
            }
        }

        ctx.restore();
    }

    _renderBar(bx, by, bw, bh, pct, displayPct, bgFill, borderCol, glowCol, flashAlpha, label) {
        const ctx = this.ctx;

        // Ensure all numeric values are finite to prevent CanvasRenderingContext2D API errors
        bx = Number.isFinite(bx) ? bx : 0;
        by = Number.isFinite(by) ? by : 0;
        bw = Number.isFinite(bw) ? bw : 100;
        bh = Number.isFinite(bh) ? bh : 10;
        pct = Number.isFinite(pct) ? pct : 0;
        displayPct = Number.isFinite(displayPct) ? displayPct : 0;

        ctx.fillStyle = bgFill;
        this._roundRect(ctx, bx - 1.5, by - 1.5, bw + 3, bh + 3, 2.5);
        ctx.fill();

        ctx.strokeStyle = borderCol || (pct > 0.6 ? 'rgba(0, 220, 255, 0.35)' : pct > 0.3 ? 'rgba(255, 170, 0, 0.4)' : 'rgba(255, 40, 40, 0.55)');
        ctx.lineWidth = 1;
        this._roundRect(ctx, bx - 1.5, by - 1.5, bw + 3, bh + 3, 2.5);
        ctx.stroke();

        if (displayPct > pct + 0.005) {
            ctx.fillStyle = label === 'SHIELD' ? 'rgba(0, 100, 255, 0.35)' : 'rgba(220, 30, 30, 0.45)';
            this._roundRect(ctx, bx, by, bw * displayPct, bh, 1.5);
            ctx.fill();
        }

        if (pct > 0) {
            const fillW = bw * pct;
            const grad = ctx.createLinearGradient(bx, by, bx + fillW, by + bh);

            if (label === 'SHIELD') {
                grad.addColorStop(0, '#0055ff');
                grad.addColorStop(0.5, '#00bbff');
                grad.addColorStop(1, '#66e0ff');
            } else {
                if (pct > 0.6) {
                    grad.addColorStop(0, '#00d570');
                    grad.addColorStop(0.5, '#00a3a0');
                    grad.addColorStop(1, '#008cff');
                } else if (pct > 0.3) {
                    grad.addColorStop(0, '#ff8800');
                    grad.addColorStop(0.5, '#ff5500');
                    grad.addColorStop(1, '#ff2200');
                } else {
                    const pulse = 0.7 + Math.sin(this.time * 15) * 0.3;
                    grad.addColorStop(0, `rgba(245, 20, 20, ${pulse})`);
                    grad.addColorStop(1, `rgba(130, 0, 0, ${pulse})`);
                }
            }

            ctx.fillStyle = grad;
            this._roundRect(ctx, bx, by, fillW, bh, 1.5);
            ctx.fill();

            const sweep = ((this.time * 85) % (fillW + 50)) - 20;
            if (sweep > 0 && sweep < fillW) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
                ctx.fillRect(bx + sweep, by, 12, bh);
            }
        }

        const segments = label === 'SHIELD' ? 12 : 10;
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 1;
        for (let i = 1; i < segments; i++) {
            const sx = bx + (bw / segments) * i;
            ctx.beginPath();
            ctx.moveTo(sx, by);
            ctx.lineTo(sx, by + bh);
            ctx.stroke();
        }

        if (flashAlpha > 0.01) {
            ctx.fillStyle = label === 'SHIELD' ? `rgba(100, 200, 255, ${flashAlpha * 0.75})` : `rgba(255, 255, 255, ${flashAlpha * 0.75})`;
            this._roundRect(ctx, bx, by, bw * pct, bh, 1.5);
            ctx.fill();
        }

        ctx.font = 'bold 16px "Share Tech Mono", monospace';
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'left';

        if (label === 'SHIELD') {
            ctx.fillStyle = '#00aaff';
            ctx.fillText(`SHIELD: ${Math.round(this.shield)}`, bx, by - 12);
        } else {
            ctx.fillStyle = pct > 0.6 ? '#00ffa0' : pct > 0.3 ? '#ffaa00' : '#ff3344';
            ctx.fillText(`INTEGRITY: ${Math.round(this.health)}`, bx + 10, by + bh / 2 + 1);
        }
    }

    _renderGlitchWarning(x, y) {
        const ctx = this.ctx;
        ctx.save();
        ctx.font = 'bold 24px "Share Tech Mono", monospace';
        ctx.fillStyle = `rgba(255, 15, 30, ${0.45 + Math.sin(this.time * 20) * 0.4})`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const rx = x + (Math.random() - 0.5) * 6;
        const ry = y + (Math.random() - 0.5) * 3;
        ctx.fillText(`◈ ALERT: ${this.glitchText} ◈`, rx, ry);
        ctx.restore();
    }

    _renderBloodVeins(hpPct) {
        const ctx = this.ctx;
        const intensity = 1.0 - (hpPct / 0.25);

        for (const vein of this.bloodVeins) {
            const pulse = (0.2 + Math.sin(this.time * vein.speed + vein.phase) * 0.2) * intensity;
            if (pulse < 0.01) continue;

            ctx.beginPath();
            ctx.strokeStyle = `rgba(165, 5, 10, ${pulse * 1.1})`;
            ctx.lineWidth = vein.width * intensity * 1.5;
            ctx.lineCap = 'round';

            const startX = vein.side === 'left' ? 0 : this.w;
            const dir = vein.side === 'left' ? 1 : -1;
            const sy = vein.startY * this.h;
            const len = vein.length * this.w;

            ctx.moveTo(startX, sy);
            ctx.bezierCurveTo(
                startX + dir * len * 0.35, sy + vein.curve * this.h,
                startX + dir * len * 0.7, sy + vein.curve * this.h * 1.8,
                startX + dir * len, sy + vein.curve * this.h * 1.3
            );
            ctx.stroke();

            ctx.shadowColor = `rgba(220, 0, 0, ${pulse * 0.65})`;
            ctx.shadowBlur = 12;
            ctx.stroke();
            ctx.shadowBlur = 0;
        }
    }

    _renderParticles() {
        const ctx = this.ctx;
        for (const p of this.particles) {
            const alpha = Math.max(0, p.life / p.maxLife);
            ctx.beginPath();
            if (p.type === 'damage') {
                ctx.fillStyle = `rgba(255, ${Math.floor(45 * alpha)}, ${Math.floor(25 * alpha)}, ${alpha})`;
                ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
            } else if (p.type === 'shield') {
                ctx.fillStyle = `rgba(${Math.floor(90 * alpha)}, ${Math.floor(190 * alpha)}, 255, ${alpha})`;
                ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
            } else {
                ctx.fillStyle = `rgba(255, ${Math.floor(215 * alpha)}, ${Math.floor(0 * alpha)}, ${alpha})`;
                ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
            }
            ctx.fill();
        }
    }

    _roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.arcTo(x + w, y, x + w, y + r, r);
        ctx.lineTo(x + w, y + h - r);
        ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
        ctx.lineTo(x + r, y + h);
        ctx.arcTo(x, y + h, x, y + h - r, r);
        ctx.lineTo(x, y + r);
        ctx.arcTo(x, y, x + r, y, r);
        ctx.closePath();
    }

    _renderThreatRadar(x, y) {
        const ctx = this.ctx;
        const radius = 32;

        ctx.save();
        ctx.translate(x + radius, y + radius);

        ctx.fillStyle = 'rgba(5, 8, 12, 0.8)';
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(0, 255, 200, 0.15)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.strokeStyle = 'rgba(0, 255, 200, 0.05)';
        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.66, 0, Math.PI * 2);
        ctx.arc(0, 0, radius * 0.33, 0, Math.PI * 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(-radius, 0); ctx.lineTo(radius, 0);
        ctx.moveTo(0, -radius); ctx.lineTo(0, radius);
        ctx.stroke();

        const sx = Math.cos(this.radarSweepAngle - Math.PI/2) * radius;
        const sy = Math.sin(this.radarSweepAngle - Math.PI/2) * radius;
        ctx.strokeStyle = 'rgba(0, 255, 200, 0.6)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(sx, sy);
        ctx.stroke();

        ctx.fillStyle = 'rgba(0, 255, 200, 0.02)';
        ctx.beginPath();
        ctx.moveTo(0,0);
        ctx.arc(0, 0, radius, this.radarSweepAngle - Math.PI/2 - 0.4, this.radarSweepAngle - Math.PI/2);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#00ffa0';
        ctx.beginPath();
        ctx.moveTo(0, -4);
        ctx.lineTo(-3, 3);
        ctx.lineTo(3, 3);
        ctx.closePath();
        ctx.fill();

        for (const blip of this.detectedBlips) {
            const angleRad = blip.angle - Math.PI/2;
            const bx = Math.cos(angleRad) * radius * blip.distPct;
            const by = Math.sin(angleRad) * radius * blip.distPct;

            ctx.fillStyle = `rgba(255, 30, 60, ${blip.life})`;
            ctx.shadowColor = 'rgba(255, 30, 60, 0.8)';
            ctx.shadowBlur = 5 * blip.life;

            ctx.beginPath();
            ctx.arc(bx, by, 2.5 * blip.life, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        }

        ctx.font = 'bold 13px "Share Tech Mono", monospace';
        ctx.fillStyle = 'rgba(0, 255, 200, 0.5)';
        ctx.textAlign = 'center';
        ctx.fillText("TACTICAL THREAT", 0, radius + 16);

        ctx.restore();
    }

    _renderOscilloscope(x, y, w) {
        const ctx = this.ctx;
        const h = 14;

        ctx.save();
        ctx.translate(x, y);

        ctx.fillStyle = 'rgba(5, 8, 12, 0.5)';
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = 'rgba(0, 255, 200, 0.08)';
        ctx.strokeRect(0, 0, w, h);

        ctx.beginPath();
        ctx.strokeStyle = '#00ffaa';
        ctx.lineWidth = 1;

        const hpPct = this.health / this.maxHealth;
        const amplitude = hpPct < 0.3 ? 6 : 3;
        const speed = hpPct < 0.3 ? 30 : 15;

        for (let i = 0; i < w; i += 2) {
            const wave1 = Math.sin(i * 0.12 + this.time * speed) * amplitude;
            const wave2 = Math.cos(i * 0.08 - this.time * (speed * 0.5)) * (amplitude * 0.4);
            const py = (h / 2) + wave1 + wave2;

            if (i === 0) {
                ctx.moveTo(i, py);
            } else {
                ctx.lineTo(i, py);
            }
        }
        ctx.stroke();

        ctx.font = 'bold 12px "Share Tech Mono", monospace';
        ctx.fillStyle = 'rgba(0, 255, 200, 0.4)';
        ctx.fillText("SYNAPSE OSCILLOSCOPE", 0, h + 13);

        ctx.restore();
    }

    _renderProximityAlert(x, y) {
        const ctx = this.ctx;
        ctx.save();
        ctx.translate(x, y);

        ctx.font = 'bold 18px "Share Tech Mono", monospace';
        ctx.fillStyle = '#ff1133';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.shadowColor = '#ff1133';
        ctx.shadowBlur = 10;
        ctx.fillText("⚠️ WARNING: HOSTILE PROXIMITY ALERT ⚠️", 0, 0);

        ctx.font = '12px "Share Tech Mono", monospace';
        ctx.fillStyle = '#ffffff';
        ctx.fillText("BREACH IN CELLULAR RADIUS", 0, 20);
        ctx.shadowBlur = 0;

        ctx.restore();
    }

    destroy() {
        if (this.canvas.parentElement) {
            this.canvas.parentElement.removeChild(this.canvas);
        }
    }
}

window.HealthSystem = HealthSystem;
