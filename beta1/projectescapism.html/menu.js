/**
 * PROJECT ESCAPISM — AAA MAIN MENU ENGINE
 * Full cinematic main menu with 3D background, particle systems,
 * glitch typography, and lore-integrated UI.
 */

const MainMenu = {
    canvas: null,
    ctx: null,
    width: 0,
    height: 0,
    time: 0,
    active: true,
    particles: [],
    glitchTimer: 0,
    glitchActive: false,
    glitchDuration: 0,
    selectedIndex: 0,
    mouseX: 0,
    mouseY: 0,
    hoveredItem: -1,
    scanlineOffset: 0,
    titleParticles: [],
    ambientParticles: [],
    dataStreams: [],
    hexGrid: [],
    logoScale: 0,
    logoTargetScale: 1,
    menuItemsVisible: false,
    menuFadeIn: 0,
    loreIndex: 0,
    loreTimer: 0,
    loreVisible: 0,
    subMenuActive: null, // null, 'arsenal', 'dossier', 'settings'
    subMenuFade: 0,
    settingsState: { volume: 80, quality: 2, fov: 70, sensitivity: 50 },
    fadeOut: false,
    fadeOutAlpha: 0,
    onStart: null, // callback when player clicks DEPLOY

    // --- LORE STRINGS (references to game elements) ---
    loreStrings: [
        'CHASSIS #1997 — SPECIAL UNIT 76 — STATUS: DORMANT',
        'MAYA_ENGINE V1.4 // NEURAL LINK CALIBRATING...',
        'HIVE NODE NETWORK: 2 ACTIVE SIGNATURES DETECTED',
        'THREAT LEVEL: EXTINCTION // RECOMMENDED: IMMEDIATE DEPLOYMENT',
        'INFECTION VECTOR: UNKNOWN // ORIGIN: SUBLEVEL 9',
        'ARSENAL STATUS: SERVICE PISTOL LOADED // TACTICAL SHOTGUN — LOCKED',
        'TERRAIN SCAN: FOREST / TOXIC / WASTELAND BIOMES MAPPED',
        'FLOW FIELD PATHFINDING: 2,500 HOSTILE SIGNATURES IN RANGE',
        'OPERATION: SURVIVE // OBJECTIVE: DESTROY ALL HIVE NODES',
        'TITANIUM REACTANT CORE — INTEGRITY: 100% — PULSE NOMINAL',
        'PUKER CLASS DETECTED — BIOLOGICAL HAZARD RATING: EXTREME',
        'THROWER CLASS DETECTED — KINETIC THREAT RATING: SEVERE',
        'SPAWN NODE ALPHA: LAT 45.0 / LON 0.0 — ACTIVE',
        'VISOR HUD: TACTICAL OVERLAY ONLINE — WEAPONS FREE',
        'WARNING: ATMOSPHERIC CONTAMINATION EXCEEDS SAFE LIMITS',
    ],

    menuItems: [
        { label: 'CAMPAIGN', sub: '[ STORY MISSIONS ]', icon: '▶', action: 'start' },
        { label: 'MAPS', sub: '[ SECTOR SELECTION ]', icon: '◈', action: 'maps' },
        { label: 'CHASSIS', sub: '[ TACTICAL MODS ]', icon: '◆', action: 'mods' },
        { label: 'ARSENAL', sub: '[ WEAPON MANIFEST ]', icon: '◈', action: 'arsenal' },
        { label: 'DOSSIER', sub: '[ MISSION BRIEFING ]', icon: '◈', action: 'dossier' },
        { label: 'LOGS', sub: '[ MISSION RECORDS ]', icon: '◈', action: 'logs' },
        { label: 'SETTINGS', sub: '[ SYSTEM CONFIG ]', icon: '⚙', action: 'settings' },
    ],

    mapData: [
        { id: 'survival', name: 'SECTOR: SURVIVAL', desc: 'Infinite waves of the horde. No extraction point. Objective: Survive as long as your chassis holds together.', difficulty: 'ENDLESS', color: '#ef4444', fog: 0x110000 }
    ],

    selectedMap: 0,

    modData: [
        { id: 'overdrive', name: 'HYDRAULIC OVERDRIVE', desc: 'Increases movement speed by 25%. Reduces recoil stability.', icon: '⚡', color: '#00aaff' },
        { id: 'plating', name: 'TACTICAL PLATING', desc: 'Increases chassis integrity by 50%. Reduces movement speed by 15%.', icon: '🛡', color: '#ffd700' },
        { id: 'neural', name: 'NEURAL LINK v2', desc: 'Faster weapon swapping and 30% reduction in weapon bloom.', icon: '🧠', color: '#ef4444' },
    ],

    selectedMod: 0,

    missionLogs: [
        { id: '1996-01', status: 'FAILURE', chassis: '#1996', result: 'Destroyed in Sector B. Neural link severed.', date: '2026-04-01' },
        { id: '1997-01', status: 'SUCCESS', chassis: '#1997', result: 'Sector A cleared. 2 Hive Nodes neutralized.', date: '2026-04-03' },
        { id: '1995-12', status: 'MIA', chassis: '#1995', result: 'Signal lost in Facility Deeps. Last seen: Sublevel 9.', date: '2026-03-30' },
        { id: '1997-02', status: 'ACTIVE', chassis: '#1997', result: 'Awaiting deployment to next priority sector.', date: 'PRESENT' },
    ],

    // Arsenal data — references to in-game weapons
    arsenalData: [
        {
            name: 'SERVICE PISTOL', type: 'SIDEARM', damage: 20, fireRate: '4 RPS',
            spread: 'MINIMAL', pellets: 1, ammo: '∞',
            desc: 'Standard-issue kinetic sidearm. Unlimited ammunition reserves. Reliable at all ranges. The last line of defense when all else fails.',
            color: '#ffaa00'
        },
        {
            name: 'TACTICAL SHOTGUN', type: 'CQC SPECIAL', damage: '15×6', fireRate: '1.2 RPS',
            spread: 'WIDE CONE', pellets: 6, ammo: '20 SHELLS',
            desc: 'Close-quarters devastation. Six pellets per trigger pull create a wall of kinetic death. Ideal for horde suppression in tight corridors.',
            color: '#ff3333'
        },
        {
            name: 'ASSAULT RIFLE', type: 'PRIMARY', damage: 12, fireRate: '12.5 RPS',
            spread: 'MODERATE', pellets: 1, ammo: '90 ROUNDS',
            desc: 'High-velocity automatic rifle. Sustained fire tears through multiple targets. Essential for medium-range horde elimination.',
            color: '#00aaff'
        }
    ],

    // Dossier/lore data
    dossierEntries: [
        {
            title: 'THE INFECTION',
            content: 'Origin unknown. First contact: Sublevel 9 of Facility Prometheus. The viral agent converts organic matter into weaponized biomass within 47 seconds of exposure. No known cure. Two Hive Nodes sustain the infection\'s neural network — destroy them all to sever the swarm\'s coordination.'
        },
        {
            title: 'THE TITAN — CHASSIS #1997',
            content: 'You are Special Unit 76. A hybrid machine-human combat platform designated "The Titan." Your bio-armor features a reactant core that pulses with thermal energy, heavy pauldrons, gauntlets, and greaves engineered for maximum survivability. Your visor provides tactical HUD overlays. You are humanity\'s last deployed asset.'
        },
        {
            title: 'THE HORDE',
            content: 'Three confirmed mutant classes. SHAMBLERS: Basic infantry — slow but relentless, capable of charging and lunging. PUKERS: Bloated abominations that circle at range and expel corrosive bile. THROWERS: Asymmetrical powerhouses with massive crushing arms that hurl debris from distance. All are coordinated by the Hive Node network.'
        },
        {
            title: 'OPERATION: SURVIVE',
            content: 'Your mission is simple: survive. Kill the horde. Destroy the Hive Nodes. Each node destroyed weakens the swarm\'s spawn rate — but they regenerate after 45 seconds. Weapon crates are airdropped every 60 seconds. Switch between isometric overview [default] and first-person [V] as tactical needs dictate.'
        },
        {
            title: 'THE MAYA ENGINE',
            content: 'All combat systems run on the MAYA Neural Processing Architecture v1.4. Flow field pathfinding coordinates up to 2,500 hostile entities simultaneously. Spatial hashing enables real-time collision resolution. GPU particle systems render ballistic tracers, muzzle flash, and gore effects at 60+ FPS. This is war at the edge of computation.'
        }
    ],

    init: function () {
        this.canvas = document.getElementById('menu-canvas');
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });

        this.resize();
        window.addEventListener('resize', () => this.resize());
        window.addEventListener('mousemove', (e) => {
            this.mouseX = e.clientX;
            this.mouseY = e.clientY;
        });
        window.addEventListener('click', (e) => this.handleClick(e));
        window.addEventListener('keydown', (e) => this.handleKey(e));

        this.initParticles();
        this.initDataStreams();
        this.initHexGrid();

        // Stagger menu reveal
        setTimeout(() => { this.logoTargetScale = 1; }, 300);
        setTimeout(() => { this.menuItemsVisible = true; }, 1200);

        this.animate();
    },

    resize: function () {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
    },

    initParticles: function () {
        // Floating ember/spore particles
        for (let i = 0; i < 120; i++) {
            this.ambientParticles.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                vx: (Math.random() - 0.5) * 0.3,
                vy: -0.2 - Math.random() * 0.8,
                size: 1 + Math.random() * 3,
                alpha: 0.1 + Math.random() * 0.5,
                hue: Math.random() < 0.7 ? 0 : (Math.random() < 0.5 ? 120 : 30), // red, green, or amber
                life: Math.random() * 100,
                maxLife: 60 + Math.random() * 120
            });
        }
    },

    initDataStreams: function () {
        // Vertical data rain columns
        for (let i = 0; i < 25; i++) {
            this.dataStreams.push({
                x: Math.random() * this.width,
                chars: [],
                speed: 1 + Math.random() * 3,
                length: 8 + Math.floor(Math.random() * 20),
                timer: Math.random() * 5,
                alpha: 0.03 + Math.random() * 0.06
            });
        }
    },

    initHexGrid: function () {
        const hexSize = 60;
        const rows = Math.ceil(this.height / (hexSize * 1.5)) + 2;
        const cols = Math.ceil(this.width / (hexSize * Math.sqrt(3))) + 2;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const offsetX = (r % 2) * hexSize * Math.sqrt(3) / 2;
                this.hexGrid.push({
                    x: c * hexSize * Math.sqrt(3) + offsetX,
                    y: r * hexSize * 1.5,
                    size: hexSize / 2,
                    pulse: Math.random() * Math.PI * 2,
                    active: Math.random() < 0.08
                });
            }
        }
    },

    handleClick: function (e) {
        if (!this.active || this.fadeOut) return;

        // Check sub-menu back button
        if (this.subMenuActive) {
            // Check for item selection within sub-menus (Maps, Mods)
            if (this.subMenuActive === 'maps') {
                const mapStartX = this.width * 0.08;
                const mapStartY = this.height * 0.08;
                const cardW = 340;
                const cardH = 200;
                for (let i = 0; i < this.mapData.length; i++) {
                    const cx = mapStartX;
                    const cy = mapStartY + 60 + i * (cardH + 20);
                    if (e.clientX > cx && e.clientX < cx + cardW && e.clientY > cy && e.clientY < cy + cardH) {
                        this.selectedMap = i;
                        this.triggerDeploy('survival');
                        return;
                    }
                }
            } else if (this.subMenuActive === 'mods') {
                const modStartX = this.width * 0.08;
                const modStartY = this.height * 0.08;
                const itemH = 100;
                for (let i = 0; i < this.modData.length; i++) {
                    const my = modStartY + 60 + i * (itemH + 20);
                    if (e.clientX > modStartX && e.clientX < modStartX + 500 && e.clientY > my && e.clientY < my + itemH) {
                        this.selectedMod = i;
                        return;
                    }
                }
            }

            const backBtnX = this.width / 2;
            const backBtnY = this.height - 80;
            if (Math.abs(e.clientX - backBtnX) < 150 && Math.abs(e.clientY - backBtnY) < 40) {
                this.subMenuActive = null;
                this.subMenuFade = 0;
                return;
            }
            return;
        }

        // Check menu item clicks
        const menuStartY = this.height * 0.48;
        const itemH = 72;
        const menuX = this.width * 0.08;

        for (let i = 0; i < this.menuItems.length; i++) {
            const itemY = menuStartY + i * itemH;
            if (e.clientX > menuX - 10 && e.clientX < menuX + 400 &&
                e.clientY > itemY - 10 && e.clientY < itemY + itemH - 10) {
                this.selectItem(i);
                return;
            }
        }
    },

    handleKey: function (e) {
        if (!this.active || this.fadeOut) return;

        if (this.subMenuActive) {
            if (e.key === 'Escape' || e.key === 'Backspace') {
                this.subMenuActive = null;
                this.subMenuFade = 0;
            }
            return;
        }

        if (e.key === 'ArrowUp' || e.key === 'w') {
            this.selectedIndex = (this.selectedIndex - 1 + this.menuItems.length) % this.menuItems.length;
        } else if (e.key === 'ArrowDown' || e.key === 's') {
            this.selectedIndex = (this.selectedIndex + 1) % this.menuItems.length;
        } else if (e.key === 'Enter' || e.key === ' ') {
            this.selectItem(this.selectedIndex);
        }
    },

    selectItem: function (index) {
        const item = this.menuItems[index];
        this.selectedIndex = index;
        if (window.SFX) window.SFX.triggerUI();

        switch (item.action) {
            case 'start':
                this.triggerDeploy('campaign');
                break;
            case 'maps':
                this.subMenuActive = 'maps';
                this.subMenuFade = 0;
                break;
            case 'mods':
                this.subMenuActive = 'mods';
                this.subMenuFade = 0;
                break;
            case 'arsenal':
                this.subMenuActive = 'arsenal';
                this.subMenuFade = 0;
                break;
            case 'dossier':
                this.subMenuActive = 'dossier';
                this.subMenuFade = 0;
                break;
            case 'logs':
                this.subMenuActive = 'logs';
                this.subMenuFade = 0;
                break;
            case 'settings':
                this.subMenuActive = 'settings';
                this.subMenuFade = 0;
                break;
        }
    },

    triggerDeploy: function (mode = 'campaign') {
        this.deployMode = mode;
        this.fadeOut = true;
        this.fadeOutAlpha = 0;
        // Glitch burst on deploy
        this.glitchActive = true;
        this.glitchDuration = 0.8;
        this.glitchTimer = 0;

        if (window.SFX) window.SFX.startBGM();
    },

    stop: function () {
        this.active = false;
        if (window.MenuBG) window.MenuBG.stop();
        const menuEl = document.getElementById('main-menu');
        if (menuEl) menuEl.style.display = 'none';

        // Hide the cinematic border so it doesn't carry into the game world
        const borderEl = document.getElementById('cinematic-border');
        if (borderEl) borderEl.style.display = 'none';
    },

    // --- DRAWING ---
    animate: function () {
        if (!this.active) return;
        this.time += 0.016;
        this.loreTimer += 0.016;

        // Glitch timer
        if (!this.glitchActive && Math.random() < 0.003) {
            this.glitchActive = true;
            this.glitchDuration = 0.05 + Math.random() * 0.15;
            this.glitchTimer = 0;
        }
        if (this.glitchActive) {
            this.glitchTimer += 0.016;
            if (this.glitchTimer > this.glitchDuration) this.glitchActive = false;
        }

        // Lore cycling
        if (this.loreTimer > 4.0) {
            this.loreTimer = 0;
            this.loreIndex = (this.loreIndex + 1) % this.loreStrings.length;
            this.loreVisible = 0;
        }
        this.loreVisible = Math.min(1, this.loreVisible + 0.02);

        // Logo animation
        this.logoScale += (this.logoTargetScale - this.logoScale) * 0.04;

        // Menu fade
        if (this.menuItemsVisible) {
            this.menuFadeIn = Math.min(1, this.menuFadeIn + 0.015);
        }

        // Sub-menu fade
        if (this.subMenuActive) {
            this.subMenuFade = Math.min(1, this.subMenuFade + 0.04);
        }

        // Fade out
        if (this.fadeOut) {
            this.fadeOutAlpha += 0.012;
            if (this.fadeOutAlpha >= 1.0) {
                this.stop();
                if (this.onStart) this.onStart();
                return;
            }
        }

        // Update hover detection
        this.updateHover();

        // Update particles
        this.updateParticles();

        // Draw
        this.draw();

        requestAnimationFrame(() => this.animate());
    },

    updateHover: function () {
        if (this.subMenuActive) { this.hoveredItem = -1; return; }
        const menuStartY = this.height * 0.48;
        const itemH = 72;
        const menuX = this.width * 0.08;

        let newHover = -1;
        for (let i = 0; i < this.menuItems.length; i++) {
            const itemY = menuStartY + i * itemH;
            if (this.mouseX > menuX - 10 && this.mouseX < menuX + 400 &&
                this.mouseY > itemY - 10 && this.mouseY < itemY + itemH - 10) {
                newHover = i;
            }
        }

        if (newHover !== -1 && newHover !== this.hoveredItem) {
            if (window.SFX) window.SFX.triggerUI();
        }
        this.hoveredItem = newHover;
    },

    updateParticles: function () {
        this.ambientParticles.forEach(p => {
            p.x += p.vx + Math.sin(this.time + p.life) * 0.15;
            p.y += p.vy;
            p.life += 0.016;

            if (p.y < -10 || p.life > p.maxLife) {
                p.x = Math.random() * this.width;
                p.y = this.height + 10;
                p.life = 0;
                p.alpha = 0.1 + Math.random() * 0.5;
            }
        });

        this.dataStreams.forEach(s => {
            s.timer += 0.016 * s.speed;
        });
    },

    draw: function () {
        const ctx = this.ctx;
        const w = this.width;
        const h = this.height;

        // Background (Clear for shader bg)
        ctx.clearRect(0, 0, w, h);

        // Hex grid (Disabled: Using performant shader grid in bg.js)
        // this.drawHexGrid(ctx, w, h);

        // Data streams
        this.drawDataStreams(ctx, w, h);

        // Radial gradient atmosphere
        const grad = ctx.createRadialGradient(w * 0.15, h * 0.35, 0, w * 0.15, h * 0.35, w * 0.7);
        grad.addColorStop(0, 'rgba(180, 60, 20, 0.06)');
        grad.addColorStop(0.5, 'rgba(20, 80, 40, 0.03)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // Ambient particles
        this.drawAmbientParticles(ctx);

        // Vignette
        const vig = ctx.createRadialGradient(w / 2, h / 2, h * 0.2, w / 2, h / 2, h * 0.9);
        vig.addColorStop(0, 'rgba(0,0,0,0)');
        vig.addColorStop(1, 'rgba(0,0,0,0.7)');
        ctx.fillStyle = vig;
        ctx.fillRect(0, 0, w, h);

        // Main content
        if (this.subMenuActive) {
            this.drawSubMenu(ctx, w, h);
        } else {
            this.drawTitle(ctx, w, h);
            this.drawMenuItems(ctx, w, h);
        }

        // Lore ticker (bottom)
        this.drawLoreTicker(ctx, w, h);

        // HUD frame corners
        this.drawHUDFrame(ctx, w, h);

        // Version / engine stamp
        this.drawEngineStamp(ctx, w, h);

        // Scanlines
        this.drawScanlines(ctx, w, h);

        // Glitch
        if (this.glitchActive) {
            this.drawGlitch(ctx, w, h);
        }

        // Fade out
        if (this.fadeOut) {
            ctx.fillStyle = `rgba(0, 0, 0, ${this.fadeOutAlpha})`;
            ctx.fillRect(0, 0, w, h);

            if (this.fadeOutAlpha > 0.3) {
                ctx.save();
                ctx.globalAlpha = Math.min(1, (this.fadeOutAlpha - 0.3) * 3);
                ctx.font = 'bold 18px "Courier New", monospace';
                ctx.fillStyle = '#ef4444';
                ctx.textAlign = 'center';
                ctx.fillText('DEPLOYING CHASSIS #1997...', w / 2, h / 2);
                ctx.font = '12px "Courier New", monospace';
                ctx.fillStyle = '#666';
                ctx.fillText('MAYA_ENGINE V1.4 // INITIALIZING COMBAT SYSTEMS', w / 2, h / 2 + 30);
                ctx.restore();
            }
        }
    },

    drawHexGrid: function (ctx, w, h) {
        ctx.save();
        this.hexGrid.forEach(hex => {
            const dist = Math.sqrt(
                Math.pow(hex.x - this.mouseX, 2) +
                Math.pow(hex.y - this.mouseY, 2)
            );
            const proximity = Math.max(0, 1 - dist / 300);
            const pulse = Math.sin(this.time * 1.5 + hex.pulse) * 0.5 + 0.5;
            const alpha = 0.015 + proximity * 0.08 + (hex.active ? pulse * 0.05 : 0);

            ctx.beginPath();
            for (let a = 0; a < 6; a++) {
                const angle = (Math.PI / 3) * a - Math.PI / 6;
                const px = hex.x + hex.size * Math.cos(angle);
                const py = hex.y + hex.size * Math.sin(angle);
                if (a === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();

            if (hex.active) {
                ctx.fillStyle = `rgba(0, 255, 68, ${alpha * 0.3})`;
                ctx.fill();
            }
            ctx.strokeStyle = `rgba(0, 255, 68, ${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
        });
        ctx.restore();
    },

    drawDataStreams: function (ctx, w, h) {
        ctx.save();
        const chars = '01アイウエオカキクケコ█▓▒░ABCDEF';
        this.dataStreams.forEach(s => {
            const baseY = (s.timer * 30) % (h + 300) - 150;
            ctx.font = '10px "Courier New", monospace';
            for (let i = 0; i < s.length; i++) {
                const y = baseY + i * 14;
                if (y < -20 || y > h + 20) continue;
                const fade = i === 0 ? 1 : Math.max(0.2, 1 - i / s.length);
                ctx.fillStyle = `rgba(0, 255, 68, ${s.alpha * fade})`;
                const ch = chars[Math.floor(Math.random() * chars.length)];
                ctx.fillText(ch, s.x, y);
            }
        });
        ctx.restore();
    },

    drawAmbientParticles: function (ctx) {
        ctx.save();
        this.ambientParticles.forEach(p => {
            const lifeRatio = 1 - (p.life / p.maxLife);
            const alpha = p.alpha * lifeRatio;
            if (p.hue === 0) {
                ctx.fillStyle = `rgba(255, 80, 30, ${alpha})`;
            } else if (p.hue === 120) {
                ctx.fillStyle = `rgba(57, 255, 20, ${alpha})`;
            } else {
                ctx.fillStyle = `rgba(255, 180, 40, ${alpha})`;
            }
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();

            // Glow
            if (p.size > 2) {
                const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 4);
                if (p.hue === 0) {
                    g.addColorStop(0, `rgba(255, 80, 30, ${alpha * 0.2})`);
                } else if (p.hue === 120) {
                    g.addColorStop(0, `rgba(57, 255, 20, ${alpha * 0.2})`);
                } else {
                    g.addColorStop(0, `rgba(255, 180, 40, ${alpha * 0.2})`);
                }
                g.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = g;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * 4, 0, Math.PI * 2);
                ctx.fill();
            }
        });
        ctx.restore();
    },

    drawTitle: function (ctx, w, h) {
        if (this.logoScale < 0.01) return;
        ctx.save();

        const titleX = w * 0.08;
        const titleY = h * 0.18;

        ctx.globalAlpha = Math.min(1, this.logoScale * 2);

        // Subtitle above
        ctx.font = '600 11px "Courier New", monospace';
        ctx.fillStyle = 'rgba(0, 255, 68, 0.5)';
        ctx.letterSpacing = '6px';
        ctx.textAlign = 'left';
        ctx.fillText('MAYA_ENGINE V1.4 // COMBAT SIMULATION', titleX + 2, titleY - 28);

        // Main title — "PROJECT"
        const scale = this.logoScale;
        ctx.font = `900 ${Math.floor(72 * scale)}px "Impact", "Arial Black", sans-serif`;

        // Title glow
        ctx.shadowColor = 'rgba(239, 68, 68, 0.6)';
        ctx.shadowBlur = 30;
        ctx.fillStyle = '#ef4444';
        ctx.fillText('PROJECT', titleX, titleY + 10);
        ctx.shadowBlur = 0;

        // "ESCAPISM" — larger, bolder
        ctx.font = `900 ${Math.floor(96 * scale)}px "Impact", "Arial Black", sans-serif`;
        ctx.shadowColor = 'rgba(255, 200, 50, 0.3)';
        ctx.shadowBlur = 25;

        // Gradient fill
        const titleGrad = ctx.createLinearGradient(titleX, titleY + 30, titleX + 500, titleY + 120);
        titleGrad.addColorStop(0, '#ffffff');
        titleGrad.addColorStop(0.3, '#ffd700');
        titleGrad.addColorStop(0.7, '#ef4444');
        titleGrad.addColorStop(1, '#ff6600');
        ctx.fillStyle = titleGrad;
        ctx.fillText('ESCAPISM', titleX, titleY + 100);
        ctx.shadowBlur = 0;

        // Underline bar
        const barWidth = 380 * scale;
        const barGrad = ctx.createLinearGradient(titleX, 0, titleX + barWidth, 0);
        barGrad.addColorStop(0, '#ef4444');
        barGrad.addColorStop(0.5, '#ff8800');
        barGrad.addColorStop(1, 'rgba(255, 136, 0, 0)');
        ctx.fillStyle = barGrad;
        ctx.fillRect(titleX, titleY + 115, barWidth, 3);

        // Tagline
        ctx.font = '600 13px "Courier New", monospace';
        ctx.fillStyle = 'rgba(148, 163, 184, 0.7)';
        ctx.fillText('OPERATION: SURVIVE — CHASSIS #1997 — SPECIAL UNIT 76', titleX, titleY + 145);

        ctx.restore();
    },

    drawMenuItems: function (ctx, w, h) {
        if (!this.menuItemsVisible) return;
        ctx.save();

        const menuX = w * 0.08;
        const menuStartY = h * 0.48;
        const itemH = 72;

        for (let i = 0; i < this.menuItems.length; i++) {
            const item = this.menuItems[i];
            const y = menuStartY + i * itemH;
            const delay = i * 0.15;
            const itemAlpha = Math.min(1, Math.max(0, (this.menuFadeIn - delay) * 4));
            if (itemAlpha <= 0) continue;

            const isHovered = this.hoveredItem === i;
            const isSelected = this.selectedIndex === i;

            ctx.globalAlpha = itemAlpha;

            // Selection / hover indicator
            if (isHovered || isSelected) {
                // Glow bar behind
                const barGrad = ctx.createLinearGradient(menuX - 20, 0, menuX + 350, 0);
                if (item.action === 'start') {
                    barGrad.addColorStop(0, 'rgba(239, 68, 68, 0.15)');
                    barGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');
                } else {
                    barGrad.addColorStop(0, 'rgba(0, 255, 68, 0.08)');
                    barGrad.addColorStop(1, 'rgba(0, 255, 68, 0)');
                }
                ctx.fillStyle = barGrad;
                ctx.fillRect(menuX - 20, y - 5, 370, itemH - 10);

                // Left accent bar
                ctx.fillStyle = item.action === 'start' ? '#ef4444' : '#39ff14';
                ctx.fillRect(menuX - 20, y - 5, 3, itemH - 10);

                // Animated arrow
                const arrowPulse = Math.sin(this.time * 6) * 3;
                ctx.font = 'bold 16px "Courier New", monospace';
                ctx.fillStyle = item.action === 'start' ? '#ef4444' : '#39ff14';
                ctx.fillText('►', menuX - 15 + arrowPulse, y + 28);
            }

            // Icon
            ctx.font = '18px "Courier New", monospace';
            ctx.fillStyle = isHovered || isSelected ?
                (item.action === 'start' ? '#ef4444' : '#39ff14') :
                'rgba(148, 163, 184, 0.5)';
            ctx.fillText(item.icon, menuX + 5, y + 28);

            // Label
            ctx.font = `bold ${isHovered || isSelected ? 28 : 24}px "Impact", "Arial Black", sans-serif`;
            ctx.fillStyle = isHovered || isSelected ?
                (item.action === 'start' ? '#ffffff' : '#e2e8f0') :
                'rgba(226, 232, 240, 0.6)';

            if (isHovered || isSelected) {
                ctx.shadowColor = item.action === 'start' ? 'rgba(239, 68, 68, 0.5)' : 'rgba(0, 255, 68, 0.3)';
                ctx.shadowBlur = 10;
            }

            ctx.fillText(item.label, menuX + 35, y + 30);
            ctx.shadowBlur = 0;

            // Sub-label
            ctx.font = '10px "Courier New", monospace';
            ctx.fillStyle = isHovered || isSelected ?
                'rgba(148, 163, 184, 0.8)' :
                'rgba(148, 163, 184, 0.3)';
            ctx.fillText(item.sub, menuX + 37, y + 48);
        }

        ctx.restore();
    },

    drawSubMenu: function (ctx, w, h) {
        ctx.save();
        ctx.globalAlpha = this.subMenuFade;

        // Darken background
        ctx.fillStyle = 'rgba(3, 7, 6, 0.85)';
        ctx.fillRect(0, 0, w, h);

        if (this.subMenuActive === 'arsenal') {
            this.drawArsenalMenu(ctx, w, h);
        } else if (this.subMenuActive === 'dossier') {
            this.drawDossierMenu(ctx, w, h);
        } else if (this.subMenuActive === 'settings') {
            this.drawSettingsMenu(ctx, w, h);
        } else if (this.subMenuActive === 'maps') {
            this.drawMapsMenu(ctx, w, h);
        } else if (this.subMenuActive === 'mods') {
            this.drawModsMenu(ctx, w, h);
        } else if (this.subMenuActive === 'logs') {
            this.drawLogsMenu(ctx, w, h);
        }

        // Back button
        const backY = h - 80;
        ctx.font = 'bold 14px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(148, 163, 184, 0.6)';
        ctx.fillText('[ ESC / CLICK TO RETURN ]', w / 2, backY);

        ctx.restore();
    },

    drawArsenalMenu: function (ctx, w, h) {
        const startX = w * 0.08;
        let y = h * 0.08;

        // Title
        ctx.font = 'bold 42px "Impact", "Arial Black", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillStyle = '#ef4444';
        ctx.shadowColor = 'rgba(239, 68, 68, 0.5)';
        ctx.shadowBlur = 20;
        ctx.fillText('ARSENAL MANIFEST', startX, y);
        ctx.shadowBlur = 0;

        ctx.font = '11px "Courier New", monospace';
        ctx.fillStyle = 'rgba(148, 163, 184, 0.5)';
        ctx.fillText('AVAILABLE WEAPONS SYSTEMS — CHASSIS #1997 LOADOUT', startX, y + 22);

        y += 60;

        // Weapon cards
        const cardW = Math.min(340, (w - startX * 2 - 40) / 3);
        this.arsenalData.forEach((weapon, i) => {
            const cx = startX + i * (cardW + 20);
            const cy = y;
            const cardH = h * 0.55;

            // Card background
            const cardGrad = ctx.createLinearGradient(cx, cy, cx, cy + cardH);
            cardGrad.addColorStop(0, 'rgba(15, 23, 42, 0.8)');
            cardGrad.addColorStop(1, 'rgba(15, 23, 42, 0.4)');
            ctx.fillStyle = cardGrad;
            ctx.fillRect(cx, cy, cardW, cardH);

            // Border
            ctx.strokeStyle = weapon.color;
            ctx.lineWidth = 1;
            ctx.strokeRect(cx, cy, cardW, cardH);

            // Top accent
            ctx.fillStyle = weapon.color;
            ctx.fillRect(cx, cy, cardW, 3);

            // Type badge
            ctx.font = '9px "Courier New", monospace';
            ctx.fillStyle = weapon.color;
            ctx.fillText(weapon.type, cx + 12, cy + 22);

            // Name
            ctx.font = 'bold 22px "Impact", "Arial Black", sans-serif';
            ctx.fillStyle = '#e2e8f0';
            ctx.fillText(weapon.name, cx + 12, cy + 50);

            // Stats
            const statY = cy + 80;
            ctx.font = '10px "Courier New", monospace';
            const stats = [
                ['DAMAGE', weapon.damage],
                ['FIRE RATE', weapon.fireRate],
                ['SPREAD', weapon.spread],
                ['PELLETS', weapon.pellets],
                ['AMMO', weapon.ammo]
            ];
            stats.forEach((s, si) => {
                ctx.fillStyle = 'rgba(148, 163, 184, 0.5)';
                ctx.fillText(s[0], cx + 12, statY + si * 22);
                ctx.fillStyle = weapon.color;
                ctx.fillText(String(s[1]), cx + 12 + 100, statY + si * 22);
            });

            // Description
            ctx.font = '11px "Courier New", monospace';
            ctx.fillStyle = 'rgba(148, 163, 184, 0.6)';
            this.wrapText(ctx, weapon.desc, cx + 12, statY + 130, cardW - 24, 16);
        });
    },

    drawDossierMenu: function (ctx, w, h) {
        const startX = w * 0.08;
        let y = h * 0.08;

        // Title
        ctx.font = 'bold 42px "Impact", "Arial Black", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillStyle = '#39ff14';
        ctx.shadowColor = 'rgba(57, 255, 20, 0.5)';
        ctx.shadowBlur = 20;
        ctx.fillText('MISSION DOSSIER', startX, y);
        ctx.shadowBlur = 0;

        ctx.font = '11px "Courier New", monospace';
        ctx.fillStyle = 'rgba(148, 163, 184, 0.5)';
        ctx.fillText('CLASSIFIED — CLEARANCE LEVEL: OMEGA — EYES ONLY', startX, y + 22);

        y += 55;

        const entryW = Math.min(w - startX * 2, 900);
        const entryH = (h - y - 100) / this.dossierEntries.length - 8;

        this.dossierEntries.forEach((entry, i) => {
            const ey = y + i * (entryH + 8);

            // Entry background
            ctx.fillStyle = 'rgba(15, 23, 42, 0.6)';
            ctx.fillRect(startX, ey, entryW, entryH);

            // Left accent
            const accentColor = ['#ef4444', '#ffd700', '#39ff14', '#00aaff', '#ff8800'][i];
            ctx.fillStyle = accentColor;
            ctx.fillRect(startX, ey, 3, entryH);

            // Entry number
            ctx.font = 'bold 10px "Courier New", monospace';
            ctx.fillStyle = accentColor;
            ctx.fillText(`FILE ${String(i + 1).padStart(2, '0')}`, startX + 14, ey + 18);

            // Title
            ctx.font = 'bold 18px "Impact", "Arial Black", sans-serif';
            ctx.fillStyle = '#e2e8f0';
            ctx.fillText(entry.title, startX + 14, ey + 38);

            // Content
            ctx.font = '11px "Courier New", monospace';
            ctx.fillStyle = 'rgba(148, 163, 184, 0.7)';
            this.wrapText(ctx, entry.content, startX + 14, ey + 55, entryW - 28, 14);
        });
    },

    drawSettingsMenu: function (ctx, w, h) {
        const startX = w * 0.08;
        let y = h * 0.08;

        // Title
        ctx.font = 'bold 42px "Impact", "Arial Black", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillStyle = '#ffaa00';
        ctx.shadowColor = 'rgba(255, 170, 0, 0.5)';
        ctx.shadowBlur = 20;
        ctx.fillText('SYSTEM CONFIGURATION', startX, y);
        ctx.shadowBlur = 0;

        ctx.font = '11px "Courier New", monospace';
        ctx.fillStyle = 'rgba(148, 163, 184, 0.5)';
        ctx.fillText('CHASSIS #1997 — SYSTEM PARAMETERS', startX, y + 22);

        y += 70;

        const settings = [
            { label: 'MASTER VOLUME', value: this.settingsState.volume, unit: '%', key: 'volume' },
            { label: 'RENDER QUALITY', value: ['LOW', 'MEDIUM', 'HIGH', 'ULTRA'][this.settingsState.quality], key: 'quality' },
            { label: 'FIELD OF VIEW', value: this.settingsState.fov, unit: '°', key: 'fov' },
            { label: 'MOUSE SENSITIVITY', value: this.settingsState.sensitivity, unit: '%', key: 'sensitivity' },
        ];

        const sliderW = Math.min(500, w * 0.4);
        settings.forEach((s, i) => {
            const sy = y + i * 85;

            // Label
            ctx.font = 'bold 14px "Courier New", monospace';
            ctx.fillStyle = 'rgba(226, 232, 240, 0.8)';
            ctx.fillText(s.label, startX, sy);

            // Value
            ctx.fillStyle = '#ffaa00';
            const valText = typeof s.value === 'number' ? s.value + (s.unit || '') : s.value;
            ctx.fillText(valText, startX + sliderW + 20, sy);

            // Slider track
            ctx.fillStyle = 'rgba(51, 65, 85, 0.6)';
            ctx.fillRect(startX, sy + 15, sliderW, 6);

            // Slider fill
            let fillRatio;
            if (s.key === 'quality') fillRatio = this.settingsState.quality / 3;
            else if (s.key === 'fov') fillRatio = (this.settingsState.fov - 50) / 70;
            else fillRatio = s.value / 100;

            const fillGrad = ctx.createLinearGradient(startX, 0, startX + sliderW * fillRatio, 0);
            fillGrad.addColorStop(0, '#ffaa00');
            fillGrad.addColorStop(1, '#ef4444');
            ctx.fillStyle = fillGrad;
            ctx.fillRect(startX, sy + 15, sliderW * fillRatio, 6);

            // Slider knob
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(startX + sliderW * fillRatio, sy + 18, 8, 0, Math.PI * 2);
            ctx.fill();
        });

        // Note
        ctx.fillText('[1][2][3] to swap weapons. [ESC] to pause. Destroy all 2 Hive Nodes to weaken the swarm.', startX, y + 36);
    },

    drawMapsMenu: function (ctx, w, h) {
        const startX = w * 0.08;
        let y = h * 0.08;

        ctx.font = 'bold 42px "Impact", "Arial Black", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillStyle = '#39ff14';
        ctx.shadowColor = 'rgba(57, 255, 20, 0.5)';
        ctx.shadowBlur = 20;
        ctx.fillText('SECTOR SELECTION', startX, y);
        ctx.shadowBlur = 0;

        ctx.font = '11px "Courier New", monospace';
        ctx.fillStyle = 'rgba(148, 163, 184, 0.5)';
        ctx.fillText('DIRECTIVE: SELECT TARGET NODE // OPERATION: SURVIVE', startX, y + 22);

        const cardW = 340;
        const cardH = 200;
        this.mapData.forEach((map, i) => {
            const cx = startX;
            const cy = y + 60 + i * (cardH + 20);
            const isSelected = this.selectedMap === i;

            // Card background
            ctx.fillStyle = isSelected ? 'rgba(57, 255, 20, 0.1)' : 'rgba(15, 23, 42, 0.6)';
            ctx.fillRect(cx, cy, cardW, cardH);

            // Border
            ctx.strokeStyle = isSelected ? map.color : 'rgba(56, 189, 248, 0.2)';
            ctx.lineWidth = isSelected ? 2 : 1;
            ctx.strokeRect(cx, cy, cardW, cardH);

            if (isSelected) {
                ctx.fillStyle = map.color;
                ctx.fillRect(cx, cy, 4, cardH);
                ctx.font = 'bold 10px "Courier New", monospace';
                ctx.fillText('▶ SELECTED TARGET', cx + 12, cy + 18);
            }

            ctx.font = 'bold 20px "Impact", "Arial Black", sans-serif';
            ctx.fillStyle = '#e2e8f0';
            ctx.fillText(map.name, cx + 12, cy + 45);

            ctx.font = 'bold 10px "Courier New", monospace';
            ctx.fillStyle = map.color;
            ctx.fillText(`DIFFICULTY: ${map.difficulty}`, cx + 12, cy + 65);

            ctx.font = '11px "Courier New", monospace';
            ctx.fillStyle = 'rgba(148, 163, 184, 0.8)';
            this.wrapText(ctx, map.desc, cx + 12, cy + 90, cardW - 24, 16);

            // Visual scanline preview box
            const previewX = cx + cardW - 100;
            const previewY = cy + 20;
            ctx.strokeStyle = 'rgba(255,255,255,0.1)';
            ctx.strokeRect(previewX, previewY, 80, 80);
            ctx.fillStyle = map.fog;
            ctx.globalAlpha = 0.3;
            ctx.fillRect(previewX, previewY, 80, 80);
            ctx.globalAlpha = 1.0;
        });
    },

    drawMapsPreview: function (ctx, x, y, size, map) {
        // Reserved for future procedural biome preview
    },

    drawModsMenu: function (ctx, w, h) {
        const startX = w * 0.08;
        let y = h * 0.08;

        ctx.font = 'bold 42px "Impact", "Arial Black", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillStyle = '#00aaff';
        ctx.shadowColor = 'rgba(0, 170, 255, 0.5)';
        ctx.shadowBlur = 20;
        ctx.fillText('CHASSIS MODIFICATIONS', startX, y);
        ctx.shadowBlur = 0;

        ctx.font = '11px "Courier New", monospace';
        ctx.fillStyle = 'rgba(148, 163, 184, 0.5)';
        ctx.fillText('UNIT: SPECIAL UNIT 76 // HARDWARE OPTIMIZATION', startX, y + 22);

        const itemH = 100;
        this.modData.forEach((mod, i) => {
            const my = y + 60 + i * (itemH + 20);
            const isSelected = this.selectedMod === i;

            ctx.fillStyle = isSelected ? 'rgba(0, 170, 255, 0.1)' : 'rgba(15, 23, 42, 0.6)';
            ctx.fillRect(startX, my, 500, itemH);
            ctx.strokeStyle = isSelected ? mod.color : 'rgba(255,255,255,0.1)';
            ctx.lineWidth = isSelected ? 2 : 1;
            ctx.strokeRect(startX, my, 500, itemH);

            ctx.font = '24px "Courier New", monospace';
            ctx.fillStyle = mod.color;
            ctx.fillText(mod.icon, startX + 15, my + 45);

            ctx.font = 'bold 18px "Impact", "Arial Black", sans-serif';
            ctx.fillStyle = '#e2e8f0';
            ctx.fillText(mod.name, startX + 60, my + 40);

            ctx.font = '11px "Courier New", monospace';
            ctx.fillStyle = 'rgba(148, 163, 184, 0.7)';
            this.wrapText(ctx, mod.desc, startX + 60, my + 60, 420, 16);

            if (isSelected) {
                ctx.fillStyle = mod.color;
                ctx.fillRect(startX, my, 4, itemH);
            }
        });
    },

    drawLogsMenu: function (ctx, w, h) {
        const startX = w * 0.08;
        let y = h * 0.08;

        ctx.font = 'bold 42px "Impact", "Arial Black", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillStyle = '#ffd700';
        ctx.shadowColor = 'rgba(255, 215, 0, 0.5)';
        ctx.shadowBlur = 20;
        ctx.fillText('MISSION RECORDS', startX, y);
        ctx.shadowBlur = 0;

        ctx.font = '11px "Courier New", monospace';
        ctx.fillStyle = 'rgba(148, 163, 184, 0.5)';
        ctx.fillText('CHRONO-STATUS: ARCHIVED OPERATIONS // ENCRYPTION: OMEGA', startX, y + 22);

        y += 70;
        ctx.font = 'bold 10px "Courier New", monospace';
        ctx.fillStyle = 'rgba(148, 163, 184, 0.4)';
        ctx.fillText('ID', startX, y);
        ctx.fillText('STATUS', startX + 100, y);
        ctx.fillText('CHASSIS', startX + 220, y);
        ctx.fillText('RESULT', startX + 320, y);
        ctx.fillText('DATE', startX + 650, y);

        y += 20;
        this.missionLogs.forEach((log, i) => {
            const ly = y + i * 40;
            ctx.fillStyle = 'rgba(15, 23, 42, 0.4)';
            ctx.fillRect(startX - 10, ly - 15, w * 0.8, 30);

            ctx.font = '11px "Courier New", monospace';
            ctx.fillStyle = '#e2e8f0';
            ctx.fillText(log.id, startX, ly + 5);

            const statusColor = log.status === 'SUCCESS' ? '#39ff14' : (log.status === 'FAILURE' ? '#ef4444' : '#ffd700');
            ctx.fillStyle = statusColor;
            ctx.fillText(log.status, startX + 100, ly + 5);

            ctx.fillStyle = '#e2e8f0';
            ctx.fillText(log.chassis, startX + 220, ly + 5);
            ctx.fillText(log.result, startX + 320, ly + 5);
            ctx.fillText(log.date, startX + 650, ly + 5);
        });
    },

    drawLoreTicker: function (ctx, w, h) {
        ctx.save();
        const tickerY = h - 30;

        // Background bar
        ctx.fillStyle = 'rgba(15, 23, 42, 0.6)';
        ctx.fillRect(0, tickerY - 10, w, 28);

        // Top line
        ctx.fillStyle = 'rgba(0, 255, 68, 0.15)';
        ctx.fillRect(0, tickerY - 10, w, 1);

        // Lore text
        const loreText = this.loreStrings[this.loreIndex];
        ctx.font = '11px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.globalAlpha = this.loreVisible * 0.7;
        ctx.fillStyle = '#39ff14';

        // Typewriter effect
        const visibleChars = Math.floor(loreText.length * Math.min(1, this.loreTimer * 1.5));
        const displayText = loreText.substring(0, visibleChars);
        ctx.fillText(displayText + (visibleChars < loreText.length ? '█' : ''), w / 2, tickerY + 6);

        ctx.restore();
    },

    drawHUDFrame: function (ctx, w, h) {
        ctx.save();
        const cornerSize = 40;
        ctx.strokeStyle = 'rgba(0, 255, 68, 0.2)';
        ctx.lineWidth = 1.5;

        // Top-left
        ctx.beginPath();
        ctx.moveTo(15, 15 + cornerSize); ctx.lineTo(15, 15); ctx.lineTo(15 + cornerSize, 15);
        ctx.stroke();

        // Top-right
        ctx.beginPath();
        ctx.moveTo(w - 15 - cornerSize, 15); ctx.lineTo(w - 15, 15); ctx.lineTo(w - 15, 15 + cornerSize);
        ctx.stroke();

        // Bottom-left
        ctx.beginPath();
        ctx.moveTo(15, h - 15 - cornerSize); ctx.lineTo(15, h - 15); ctx.lineTo(15 + cornerSize, h - 15);
        ctx.stroke();

        // Bottom-right
        ctx.beginPath();
        ctx.moveTo(w - 15 - cornerSize, h - 15); ctx.lineTo(w - 15, h - 15); ctx.lineTo(w - 15, h - 15 - cornerSize);
        ctx.stroke();

        // Top bar decorations
        ctx.fillStyle = 'rgba(0, 255, 68, 0.1)';
        ctx.fillRect(60, 15, 2, 8);
        ctx.fillRect(66, 15, 2, 8);
        ctx.fillRect(72, 15, 2, 8);

        ctx.fillRect(w - 72, 15, 2, 8);
        ctx.fillRect(w - 66, 15, 2, 8);
        ctx.fillRect(w - 60, 15, 2, 8);

        ctx.restore();
    },

    drawEngineStamp: function (ctx, w, h) {
        ctx.save();
        ctx.font = '9px "Courier New", monospace';
        ctx.textAlign = 'right';
        ctx.fillStyle = 'rgba(148, 163, 184, 0.2)';
        ctx.fillText('MAYA_ENGINE V1.4', w - 25, h - 50);
        ctx.fillText('PROJECT ENTROPY / ORGANOID', w - 25, h - 38);

        ctx.textAlign = 'left';
        ctx.fillText('SYS.NOMINAL', 25, h - 50);

        const pulse = Math.sin(this.time * 2) * 0.5 + 0.5;
        ctx.fillStyle = `rgba(0, 255, 68, ${0.2 + pulse * 0.3})`;
        ctx.beginPath();
        ctx.arc(25 + 88, h - 53, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    },

    drawScanlines: function (ctx, w, h) {
        ctx.save();
        ctx.globalAlpha = 0.03;
        for (let y = 0; y < h; y += 3) {
            ctx.fillStyle = '#000';
            ctx.fillRect(0, y, w, 1);
        }

        // Moving scan line
        this.scanlineOffset = (this.scanlineOffset + 1.5) % h;
        ctx.globalAlpha = 0.04;
        const scanGrad = ctx.createLinearGradient(0, this.scanlineOffset - 40, 0, this.scanlineOffset + 40);
        scanGrad.addColorStop(0, 'rgba(0, 255, 68, 0)');
        scanGrad.addColorStop(0.5, 'rgba(0, 255, 68, 0.3)');
        scanGrad.addColorStop(1, 'rgba(0, 255, 68, 0)');
        ctx.fillStyle = scanGrad;
        ctx.fillRect(0, this.scanlineOffset - 40, w, 80);

        ctx.restore();
    },

    drawGlitch: function (ctx, w, h) {
        ctx.save();

        // RGB shift
        const shiftX = (Math.random() - 0.5) * 15;
        const shiftY = (Math.random() - 0.5) * 8;

        // Slice some bands
        const slices = 3 + Math.floor(Math.random() * 5);
        for (let i = 0; i < slices; i++) {
            const sliceY = Math.random() * h;
            const sliceH = 2 + Math.random() * 30;
            const shift = (Math.random() - 0.5) * 40;

            try {
                const imageData = ctx.getImageData(0, Math.floor(sliceY), w, Math.floor(sliceH));
                ctx.putImageData(imageData, shift, Math.floor(sliceY));
            } catch (e) { /* security restrictions */ }
        }

        // Color overlay flash
        if (Math.random() < 0.3) {
            ctx.globalAlpha = 0.08;
            ctx.fillStyle = Math.random() < 0.5 ? '#ff0000' : '#00ff44';
            ctx.fillRect(0, 0, w, h);
        }

        // Random noise blocks
        for (let i = 0; i < 8; i++) {
            ctx.fillStyle = `rgba(${Math.random() < 0.5 ? '0, 255, 68' : '239, 68, 68'}, ${0.1 + Math.random() * 0.2})`;
            ctx.fillRect(
                Math.random() * w,
                Math.random() * h,
                Math.random() * 100,
                2 + Math.random() * 6
            );
        }

        ctx.restore();
    },

    // Utility: word wrap
    wrapText: function (ctx, text, x, y, maxWidth, lineHeight) {
        const words = text.split(' ');
        let line = '';
        let lineY = y;

        for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            const metrics = ctx.measureText(testLine);
            if (metrics.width > maxWidth && n > 0) {
                ctx.fillText(line, x, lineY);
                line = words[n] + ' ';
                lineY += lineHeight;
            } else {
                line = testLine;
            }
        }
        ctx.fillText(line, x, lineY);
    }
};
