/**
 * PROJECT ESCAPISM — VOID MENU
 * Eerily minimal. White text. Black void. Nothing else.
 */

const MainMenu = {
    canvas: null,
    ctx: null,
    width: 0,
    height: 0,
    time: 0,
    active: true,
    selectedIndex: 0,
    mouseX: 0,
    mouseY: 0,
    hoveredItem: -1,
    logoScale: 0,
    logoTargetScale: 1,
    menuItemsVisible: false,
    menuFadeIn: 0,
    subMenuActive: null,
    subMenuFade: 0,
    settingsState: { volume: 80, quality: 2, fov: 70, sensitivity: 50 },
    settingsIndex: 0,
    itemStates: [],
    fadeOut: false,
    fadeOutAlpha: 0,
    onStart: null,

    menuItems: [
        { label: 'CAMPAIGN', action: 'start' },
        { label: 'MAPS', action: 'maps' },
        { label: 'CHASSIS', action: 'mods' },
        { label: 'ARSENAL', action: 'arsenal' },
        { label: 'DOSSIER', action: 'dossier' },
        { label: 'LOGS', action: 'logs' },
        { label: 'SETTINGS', action: 'settings' },
    ],

    mapData: [
        { id: 'survival', name: 'SURVIVAL', desc: 'Infinite waves. No extraction. Survive.', difficulty: 'ENDLESS', color: '#ffffff', fog: 0x110000 },
        { id: 'desert', name: 'DESOLATION', desc: 'Vast flat desert. Nowhere to hide.', difficulty: 'EXTREME', color: '#d4a800', fog: 0x221a11 },
        { id: 'endgame', name: 'ENDGAME', desc: 'The final cosmic void. A flat empty glass plane under a majestic nebula.', difficulty: 'APOCALYPSE', color: '#a020f0', fog: 0x050010 },
        { id: 'abyss', name: 'WATER WORLD', desc: 'Procedural floating wooden rafts on an endless waving blue ocean. Watch your step!', difficulty: 'TROPICAL', color: '#0284c7', fog: 0x030d1a },
        { id: 'jungle', name: 'JUNGLE EXPANSE', desc: 'Dense infinite voxel jungle. Blocky stepped cliffs, canopies and water.', difficulty: 'DENSE VOXEL', color: '#10b981', fog: 0x051d0f },
        { id: 'asynchronousmaze1', name: 'ASYNCHRONOUS MAZE', desc: 'The Backrooms. A yellow-ochre fluorescent labyrinth. Escape the stalker.', difficulty: 'UNSTABLE', color: '#d1cc9e', fog: 0x242416 },
        { id: 'nacht', name: 'OUTPOST NACHT', desc: 'A ruined military outpost in the dark fog. Buy weapons, open doors, repair barricades, and survive the endless horde.', difficulty: 'CLASSIC ZOMBIES', color: '#7f1d1d', fog: 0x050505 }
    ],
    selectedMap: 0,

    modData: [
        { id: 'overdrive', name: 'HYDRAULIC OVERDRIVE', desc: '+25% speed. Reduced stability.', icon: '', color: '#ffffff' },
        { id: 'plating', name: 'TACTICAL PLATING', desc: '+50% integrity. -15% speed.', icon: '', color: '#ffffff' },
        { id: 'neural', name: 'NEURAL LINK V2', desc: 'Faster swap. -30% bloom.', icon: '', color: '#ffffff' },
    ],
    selectedMod: 0,

    missionLogs: [
        { id: '1996-01', status: 'FAILURE', chassis: '#1996', result: 'Destroyed in Sector B.', date: '2026-04-01' },
        { id: '1997-01', status: 'SUCCESS', chassis: '#1997', result: '2 Nodes neutralized.', date: '2026-04-03' },
        { id: '1995-12', status: 'MIA', chassis: '#1995', result: 'Signal lost. Sublevel 9.', date: '2026-03-30' },
        { id: '1997-02', status: 'ACTIVE', chassis: '#1997', result: 'Awaiting deployment.', date: 'PRESENT' },
    ],

    arsenalData: [
        { name: 'SERVICE PISTOL', type: 'SIDEARM', damage: 20, fireRate: '4 RPS', spread: 'MINIMAL', pellets: 1, ammo: '∞', desc: 'Standard sidearm. Unlimited ammo.', color: '#ffffff' },
        { name: 'TACTICAL SHOTGUN', type: 'CQC', damage: '15×6', fireRate: '1.2 RPS', spread: 'WIDE', pellets: 6, ammo: '20', desc: 'Close-quarters. Six pellets per pull.', color: '#ffffff' },
        { name: 'ASSAULT RIFLE', type: 'PRIMARY', damage: 12, fireRate: '12.5 RPS', spread: 'MODERATE', pellets: 1, ammo: '90', desc: 'Automatic. Medium range.', color: '#ffffff' },
    ],

    dossierEntries: [
        { title: 'THE INFECTION', content: 'Origin unknown. Converts organic matter in 47 seconds. Destroy all Hive Nodes.' },
        { title: 'CHASSIS #1997', content: "Hybrid machine-human combat platform. Humanity's last asset." },
        { title: 'THE HORDE', content: 'Shamblers. Pukers. Throwers. Coordinated by the Hive.' },
        { title: 'OPERATION: SURVIVE', content: 'Kill the horde. Destroy the nodes. They regenerate in 45 seconds.' },
        { title: 'MAYA ENGINE', content: 'Neural Processing Architecture v1.4. 2,500 entities. 60 FPS.' },
    ],

    loreStrings: [
        'CHASSIS #1997 — SPECIAL UNIT 76 — STATUS: DORMANT',
        'MAYA_ENGINE V1.4 // NEURAL LINK CALIBRATING...',
        'THREAT LEVEL: EXTINCTION',
        'OPERATION: SURVIVE',
    ],
    loreIndex: 0,
    loreTimer: 0,
    loreVisible: 0,

    init: function () {
        this.canvas = document.getElementById('menu-canvas');
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');

        // Start the shader background if not already active
        if (window.MenuBG && !window.MenuBG.active) {
            window.MenuBG.init('main-menu');
        }

        // Initialize transition states for menu items
        this.itemStates = this.menuItems.map(() => ({ xOffset: 0, alpha: 0.35 }));
        this.settingsIndex = 0;

        // Start menu music
        this.menuMusic = new Audio('assets/MUSIC/menu.mp3');
        this.menuMusic.loop = true;
        this.menuMusic.volume = 0.3 * (this.settingsState.volume / 100);
        this.menuMusic.play().catch(e => console.warn('[Menu Music] Autoplay blocked:', e));

        this.resize();
        window.addEventListener('resize', () => this.resize());
        window.addEventListener('mousemove', (e) => { this.mouseX = e.clientX; this.mouseY = e.clientY; });
        window.addEventListener('click', (e) => this.handleClick(e));
        window.addEventListener('keydown', (e) => this.handleKey(e));

        setTimeout(() => { this.logoTargetScale = 1; }, 200);
        setTimeout(() => { this.menuItemsVisible = true; }, 600);

        this.animate();
    },

    resize: function () {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
    },

    handleClick: function (e) {
        if (!this.active || this.fadeOut) return;

        if (this.subMenuActive) {
            if (this.subMenuActive === 'maps') {
                const startX = this.width * 0.08;
                for (let i = 0; i < this.mapData.length; i++) {
                    const cy = this.height * 0.1 + 45 + i * 50;
                    if (e.clientX > startX && e.clientX < startX + 400 && e.clientY > cy - 15 && e.clientY < cy + 25) {
                        this.selectedMap = i;
                        this.triggerDeploy('campaign');
                        return;
                    }
                }
            } else if (this.subMenuActive === 'mods') {
                const startX = this.width * 0.08;
                for (let i = 0; i < this.modData.length; i++) {
                    const cy = this.height * 0.1 + 45 + i * 50;
                    if (e.clientX > startX && e.clientX < startX + 400 && e.clientY > cy - 15 && e.clientY < cy + 25) {
                        this.selectedMod = i;
                        return;
                    }
                }
            } else if (this.subMenuActive === 'settings') {
                const startX = this.width * 0.08;
                const startY = this.height * 0.1 + 85;
                const rowHeight = 40;
                for (let i = 0; i < 4; i++) {
                    const rowY = startY + i * rowHeight;
                    if (e.clientY > rowY - 15 && e.clientY < rowY + 15) {
                        if (e.clientX > startX + 190 && e.clientX < startX + 225) {
                            this.adjustSetting(i, -1);
                            return;
                        }
                        if (e.clientX > startX + 265 && e.clientX < startX + 300) {
                            this.adjustSetting(i, 1);
                            return;
                        }
                    }
                }
            } else if (this.subMenuActive === 'dossier') {
                if (this.dossierBtnBounds) {
                    const b = this.dossierBtnBounds;
                    if (e.clientX > b.x && e.clientX < b.x + b.w && e.clientY > b.y && e.clientY < b.y + b.h) {
                        if (window.SFX) window.SFX.triggerUIConfirm ? window.SFX.triggerUIConfirm() : window.SFX.triggerUI();
                        this.openDNALab();
                        return;
                    }
                }
            }

            const backBtnX = this.width / 2;
            const backBtnY = this.height - 60;
            if (Math.abs(e.clientX - backBtnX) < 100 && Math.abs(e.clientY - backBtnY) < 25) {
                this.subMenuActive = null;
                this.subMenuFade = 0;
                if (window.SFX) window.SFX.triggerUI();
                return;
            }
            return;
        }

        const menuX = this.width / 2;
        const menuStartY = this.height * 0.38;
        const itemH = 48;

        for (let i = 0; i < this.menuItems.length; i++) {
            const itemY = menuStartY + i * itemH;
            if (e.clientX > menuX - 150 && e.clientX < menuX + 150 &&
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
                if (window.SFX) window.SFX.triggerUI();
                return; 
            }
            
            if (this.subMenuActive === 'maps') {
                if (e.key === 'ArrowUp' || e.key === 'w') {
                    this.selectedMap = (this.selectedMap - 1 + this.mapData.length) % this.mapData.length;
                    if (window.SFX) window.SFX.triggerUI();
                } else if (e.key === 'ArrowDown' || e.key === 's') {
                    this.selectedMap = (this.selectedMap + 1) % this.mapData.length;
                    if (window.SFX) window.SFX.triggerUI();
                } else if (e.key === 'Enter' || e.key === ' ') {
                    this.triggerDeploy('campaign');
                }
            } else if (this.subMenuActive === 'mods') {
                if (e.key === 'ArrowUp' || e.key === 'w') {
                    this.selectedMod = (this.selectedMod - 1 + this.modData.length) % this.modData.length;
                    if (window.SFX) window.SFX.triggerUI();
                } else if (e.key === 'ArrowDown' || e.key === 's') {
                    this.selectedMod = (this.selectedMod + 1) % this.modData.length;
                    if (window.SFX) window.SFX.triggerUI();
                }
            } else if (this.subMenuActive === 'settings') {
                if (e.key === 'ArrowUp' || e.key === 'w') {
                    this.settingsIndex = (this.settingsIndex - 1 + 4) % 4;
                    if (window.SFX) window.SFX.triggerUI();
                } else if (e.key === 'ArrowDown' || e.key === 's') {
                    this.settingsIndex = (this.settingsIndex + 1) % 4;
                    if (window.SFX) window.SFX.triggerUI();
                } else if (e.key === 'ArrowLeft' || e.key === 'a') {
                    this.adjustSetting(this.settingsIndex, -1);
                } else if (e.key === 'ArrowRight' || e.key === 'd') {
                    this.adjustSetting(this.settingsIndex, 1);
                }
            }
            return;
        }
        
        if (e.key === 'ArrowUp' || e.key === 'w') {
            this.selectedIndex = (this.selectedIndex - 1 + this.menuItems.length) % this.menuItems.length;
            if (window.SFX) window.SFX.triggerUI();
        } else if (e.key === 'ArrowDown' || e.key === 's') {
            this.selectedIndex = (this.selectedIndex + 1) % this.menuItems.length;
            if (window.SFX) window.SFX.triggerUI();
        } else if (e.key === 'Enter' || e.key === ' ') {
            this.selectItem(this.selectedIndex);
        }
    },

    adjustSetting: function (index, dir) {
        if (window.SFX) window.SFX.triggerUI();
        if (index === 0) { // Volume
            this.settingsState.volume = Math.max(0, Math.min(100, this.settingsState.volume + dir * 10));
            if (window.SFX) window.SFX.setMasterVolume(this.settingsState.volume / 100);
            if (this.menuMusic) this.menuMusic.volume = 0.3 * (this.settingsState.volume / 100);
        } else if (index === 1) { // Quality
            this.settingsState.quality = Math.max(0, Math.min(3, this.settingsState.quality + dir));
        } else if (index === 2) { // FOV
            this.settingsState.fov = Math.max(50, Math.min(110, this.settingsState.fov + dir * 5));
            window.baseGameFOV = this.settingsState.fov;
        } else if (index === 3) { // Sensitivity
            this.settingsState.sensitivity = Math.max(10, Math.min(100, this.settingsState.sensitivity + dir * 10));
            window.pauseSettings = window.pauseSettings || {};
            window.pauseSettings.mouseSensitivity = this.settingsState.sensitivity / 100;
        }
    },

    selectItem: function (index) {
        const item = this.menuItems[index];
        this.selectedIndex = index;
        if (window.SFX) window.SFX.triggerUIConfirm ? window.SFX.triggerUIConfirm() : window.SFX.triggerUI();
        switch (item.action) {
            case 'start': this.triggerDeploy('campaign'); break;
            case 'maps': this.subMenuActive = 'maps'; this.subMenuFade = 0; break;
            case 'mods': this.subMenuActive = 'mods'; this.subMenuFade = 0; break;
            case 'arsenal': this.subMenuActive = 'arsenal'; this.subMenuFade = 0; break;
            case 'dossier': this.subMenuActive = 'dossier'; this.subMenuFade = 0; break;
            case 'logs': this.subMenuActive = 'logs'; this.subMenuFade = 0; break;
            case 'settings': this.subMenuActive = 'settings'; this.subMenuFade = 0; this.settingsIndex = 0; break;
        }
    },

    triggerDeploy: function (mode = 'campaign') {
        this.deployMode = mode;
        this.fadeOut = true;
        this.fadeOutAlpha = 0;
        if (this.menuMusic) {
            this.menuMusic.pause();
            this.menuMusic.currentTime = 0;
            this.menuMusic = null;
        }
    },

    openDNALab: function () {
        this.active = false;
        const menuEl = document.getElementById('main-menu');
        if (menuEl) menuEl.style.display = 'none';
        
        if (window.MenuBG) {
            window.MenuBG.stop();
        }
        
        if (window.RotaryDNALab) {
            window.RotaryDNALab.init(() => {
                const menuEl = document.getElementById('main-menu');
                if (menuEl) menuEl.style.display = 'block';
                this.active = true;
                if (window.MenuBG) {
                    window.MenuBG.init('main-menu');
                }
                this.animate();
            });
        } else {
            console.error("RotaryDNALab not loaded!");
            this.active = true;
            if (menuEl) menuEl.style.display = 'block';
        }
    },

    stop: function () {
        this.active = false;
        if (window.MenuBG) window.MenuBG.stop();
        if (this.menuMusic) {
            this.menuMusic.pause();
            this.menuMusic.currentTime = 0;
            this.menuMusic = null;
        }
        const menuEl = document.getElementById('main-menu');
        if (menuEl) menuEl.style.display = 'none';
        const borderEl = document.getElementById('cinematic-border');
        if (borderEl) borderEl.style.display = 'none';
    },

    animate: function () {
        if (!this.active) return;
        this.time += 0.016;
        this.loreTimer += 0.016;

        if (this.loreTimer > 5.0) {
            this.loreTimer = 0;
            this.loreIndex = (this.loreIndex + 1) % this.loreStrings.length;
            this.loreVisible = 0;
        }
        this.loreVisible = Math.min(1, this.loreVisible + 0.02);

        this.logoScale += (this.logoTargetScale - this.logoScale) * 0.06;
        if (this.menuItemsVisible) this.menuFadeIn = Math.min(1, this.menuFadeIn + 0.02);
        if (this.subMenuActive) this.subMenuFade = Math.min(1, this.subMenuFade + 0.06);

        if (this.fadeOut) {
            this.fadeOutAlpha += 0.015;
            if (this.fadeOutAlpha >= 1.0) {
                this.stop();
                if (this.onStart) this.onStart();
                return;
            }
        }

        // Smooth transition logic for menu items
        if (this.itemStates && this.itemStates.length > 0) {
            for (let i = 0; i < this.menuItems.length; i++) {
                const isHovered = this.hoveredItem === i;
                const isSelected = this.selectedIndex === i;
                const state = this.itemStates[i];
                if (state) {
                    const targetX = (isHovered || isSelected) ? 12 : 0;
                    const targetAlpha = (isHovered || isSelected) ? 1.0 : 0.35;
                    state.xOffset += (targetX - state.xOffset) * 0.15;
                    state.alpha += (targetAlpha - state.alpha) * 0.15;
                }
            }
        }

        this.updateHover();
        this.draw();
        requestAnimationFrame(() => this.animate());
    },

    updateHover: function () {
        let cursorStyle = 'default';
        
        if (this.subMenuActive) {
            this.hoveredItem = -1;
            
            // Check back button hover
            const backBtnX = this.width / 2;
            const backBtnY = this.height - 60;
            if (Math.abs(this.mouseX - backBtnX) < 100 && Math.abs(this.mouseY - backBtnY) < 25) {
                cursorStyle = 'pointer';
            }
            
            // Check sub-menu item hover
            if (this.subMenuActive === 'maps') {
                const startX = this.width * 0.08;
                for (let i = 0; i < this.mapData.length; i++) {
                    const cy = this.height * 0.1 + 45 + i * 50;
                    if (this.mouseX > startX && this.mouseX < startX + 400 && this.mouseY > cy - 15 && this.mouseY < cy + 25) {
                        cursorStyle = 'pointer';
                    }
                }
            } else if (this.subMenuActive === 'mods') {
                const startX = this.width * 0.08;
                for (let i = 0; i < this.modData.length; i++) {
                    const cy = this.height * 0.1 + 45 + i * 50;
                    if (this.mouseX > startX && this.mouseX < startX + 400 && this.mouseY > cy - 15 && this.mouseY < cy + 25) {
                        cursorStyle = 'pointer';
                    }
                }
            } else if (this.subMenuActive === 'settings') {
                const startX = this.width * 0.08;
                const startY = this.height * 0.1 + 85;
                const rowHeight = 40;
                for (let i = 0; i < 4; i++) {
                    const rowY = startY + i * rowHeight;
                    if (this.mouseY > rowY - 15 && this.mouseY < rowY + 15) {
                        if (this.mouseX > startX + 190 && this.mouseX < startX + 300) {
                            cursorStyle = 'pointer';
                        }
                    }
                }
            } else if (this.subMenuActive === 'dossier') {
                if (this.dossierBtnBounds) {
                    const b = this.dossierBtnBounds;
                    if (this.mouseX > b.x && this.mouseX < b.x + b.w && this.mouseY > b.y && this.mouseY < b.y + b.h) {
                        cursorStyle = 'pointer';
                    }
                }
            }
        } else {
            const menuX = this.width / 2;
            const menuStartY = this.height * 0.38;
            const itemH = 48;
            let newHover = -1;
            for (let i = 0; i < this.menuItems.length; i++) {
                const itemY = menuStartY + i * itemH;
                if (this.mouseX > menuX - 150 && this.mouseX < menuX + 150 &&
                    this.mouseY > itemY - 10 && this.mouseY < itemY + itemH - 10) {
                    newHover = i;
                    cursorStyle = 'pointer';
                }
            }
            if (newHover !== -1 && newHover !== this.hoveredItem && window.SFX) window.SFX.triggerUI();
            this.hoveredItem = newHover;
        }
        
        if (this.canvas) this.canvas.style.cursor = cursorStyle;
    },

    draw: function () {
        const ctx = this.ctx;
        const w = this.width;
        const h = this.height;

        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, w, h);

        // Scanlines overlay (Subtle grid decal removed for endless black void aesthetic)
        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.01)';
        for (let y = 0; y < h; y += 4) {
            ctx.fillRect(0, y, w, 1);
        }
        ctx.restore();

        if (this.subMenuActive) {
            this.drawSubMenu(ctx, w, h);
        } else {
            this.drawTitle(ctx, w, h);
            this.drawMenuItems(ctx, w, h);
        }

        // Bottom lore
        if (!this.subMenuActive) {
            ctx.save();
            ctx.globalAlpha = this.loreVisible * 0.25;
            ctx.font = '11px "Courier New", monospace';
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            const lore = this.loreStrings[this.loreIndex];
            const chars = Math.floor(lore.length * Math.min(1, this.loreTimer * 1.2));
            ctx.fillText(lore.substring(0, chars), w / 2, h - 40);
            ctx.restore();
        }

        // Fade out transition
        if (this.fadeOut) {
            ctx.fillStyle = `rgba(0, 0, 0, ${this.fadeOutAlpha})`;
            ctx.fillRect(0, 0, w, h);
            if (this.fadeOutAlpha > 0.3) {
                ctx.save();
                ctx.globalAlpha = Math.min(1, (this.fadeOutAlpha - 0.3) * 3);
                ctx.font = '16px "Courier New", monospace';
                ctx.fillStyle = '#ffffff';
                ctx.textAlign = 'center';
                ctx.fillText('DEPLOYING...', w / 2, h / 2);
                ctx.restore();
            }
        }
    },

    drawTitle: function (ctx, w, h) {
        if (this.logoScale < 0.01) return;
        ctx.save();
        ctx.globalAlpha = Math.min(1, this.logoScale * 2);
        ctx.textAlign = 'center';

        const s = this.logoScale;
        
        // Subtle glitch chromatic aberration reflection effect
        const isGlitch = Math.random() < 0.015;
        const glitchOffset = isGlitch ? (Math.random() - 0.5) * 6 : 0;

        ctx.font = `300 ${Math.floor(14 * s)}px "Courier New", monospace`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillText('PROJECT', w / 2, h * 0.2);

        if (isGlitch) {
            ctx.font = `300 ${Math.floor(48 * s)}px "Courier New", monospace`;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
            ctx.fillText('ESCAPISM', w / 2 + glitchOffset, h * 0.2 + 50 * s);
        }

        ctx.font = `300 ${Math.floor(48 * s)}px "Courier New", monospace`;
        ctx.fillStyle = '#ffffff';
        ctx.fillText('ESCAPISM', w / 2, h * 0.2 + 50 * s);

        // Thin split segment line
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.fillRect(w / 2 - 80 * s, h * 0.2 + 60 * s, 160 * s, 1);

        ctx.restore();
    },

    drawMenuItems: function (ctx, w, h) {
        if (!this.menuItemsVisible) return;
        ctx.save();
        ctx.textAlign = 'center';

        const menuStartY = h * 0.38;
        const itemH = 48;

        for (let i = 0; i < this.menuItems.length; i++) {
            const item = this.menuItems[i];
            const y = menuStartY + i * itemH;
            const delay = i * 0.1;
            const itemAlpha = Math.min(1, Math.max(0, (this.menuFadeIn - delay) * 5));
            if (itemAlpha <= 0) continue;

            const state = this.itemStates[i];
            if (!state) continue;

            ctx.globalAlpha = itemAlpha * state.alpha;
            ctx.font = '14px "Courier New", monospace';
            ctx.fillStyle = '#ffffff';

            if (state.xOffset > 1) {
                ctx.save();
                ctx.fillStyle = `rgba(255, 255, 255, ${state.alpha * 0.35})`;
                ctx.fillText('◈', w / 2 - 80 - state.xOffset, y + 20);
                ctx.restore();
            }

            ctx.fillText(item.label, w / 2 + state.xOffset, y + 20);
        }

        ctx.restore();
    },

    drawSubMenu: function (ctx, w, h) {
        ctx.save();
        ctx.globalAlpha = this.subMenuFade;

        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, w, h);

        if (this.subMenuActive === 'arsenal') this.drawArsenalMenu(ctx, w, h);
        else if (this.subMenuActive === 'dossier') this.drawDossierMenu(ctx, w, h);
        else if (this.subMenuActive === 'settings') this.drawSettingsMenu(ctx, w, h);
        else if (this.subMenuActive === 'maps') this.drawMapsMenu(ctx, w, h);
        else if (this.subMenuActive === 'mods') this.drawModsMenu(ctx, w, h);
        else if (this.subMenuActive === 'logs') this.drawLogsMenu(ctx, w, h);

        // Back action button indicator
        ctx.font = '12px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        
        // Highlight ESC button on hover
        const backBtnX = w / 2;
        const backBtnY = h - 60;
        if (Math.abs(this.mouseX - backBtnX) < 100 && Math.abs(this.mouseY - backBtnY) < 25) {
            ctx.fillStyle = '#ffffff';
        }
        ctx.fillText('[ ESC ]', backBtnX, backBtnY);

        ctx.restore();
    },

    drawArsenalMenu: function (ctx, w, h) {
        const x = w * 0.08;
        let y = h * 0.1;
        ctx.textAlign = 'left';
        ctx.font = '24px "Courier New", monospace';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('ARSENAL', x, y);

        y += 15;
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.fillRect(x, y, 120, 1);
        y += 30;

        this.arsenalData.forEach((weapon) => {
            ctx.font = '14px "Courier New", monospace';
            ctx.fillStyle = '#ffffff';
            ctx.fillText(weapon.name, x, y);
            ctx.font = '11px "Courier New", monospace';
            ctx.fillStyle = 'rgba(255,255,255,0.35)';
            ctx.fillText(`${weapon.type}  DMG:${weapon.damage}  ROF:${weapon.fireRate}  AMMO:${weapon.ammo}`, x, y + 18);
            ctx.fillText(weapon.desc, x, y + 34);
            y += 65;
        });
    },

    drawDossierMenu: function (ctx, w, h) {
        const x = w * 0.08;
        let y = h * 0.1;
        ctx.textAlign = 'left';
        ctx.font = '24px "Courier New", monospace';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('DOSSIER', x, y);

        y += 15;
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.fillRect(x, y, 120, 1);
        y += 30;

        this.dossierEntries.forEach((entry) => {
            ctx.font = '13px "Courier New", monospace';
            ctx.fillStyle = '#ffffff';
            ctx.fillText(entry.title, x, y);
            ctx.font = '11px "Courier New", monospace';
            ctx.fillStyle = 'rgba(255,255,255,0.35)';
            this.wrapText(ctx, entry.content, x, y + 18, w * 0.7, 16);
            y += 55;
        });

        // Add clickable button "LONG TERM TEST TRIALS"
        const btnX = x;
        const btnY = y + 15;
        const btnW = 280;
        const btnH = 38;
        
        ctx.save();
        // Check hover
        const isHovered = (this.mouseX > btnX && this.mouseX < btnX + btnW && this.mouseY > btnY && this.mouseY < btnY + btnH);
        
        ctx.strokeStyle = isHovered ? '#00ffcc' : 'rgba(255, 255, 255, 0.2)';
        ctx.fillStyle = isHovered ? 'rgba(0, 255, 200, 0.08)' : 'rgba(0, 0, 0, 0.3)';
        ctx.lineWidth = 1;
        
        // Draw button background and border
        ctx.fillRect(btnX, btnY, btnW, btnH);
        ctx.strokeRect(btnX, btnY, btnW, btnH);
        
        // Draw text
        ctx.font = '11px "Courier New", monospace';
        ctx.fillStyle = isHovered ? '#00ffcc' : '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText('LONG TERM TEST TRIALS', btnX + btnW / 2, btnY + btnH / 2 + 4);
        
        // Technical decorative corners for cyber-retro feel
        if (isHovered) {
            ctx.fillStyle = '#00ffcc';
            ctx.fillRect(btnX - 2, btnY - 2, 6, 2);
            ctx.fillRect(btnX - 2, btnY - 2, 2, 6);
            ctx.fillRect(btnX + btnW - 4, btnY - 2, 6, 2);
            ctx.fillRect(btnX + btnW, btnY - 2, 2, 6);
            ctx.fillRect(btnX - 2, btnY + btnH, 6, 2);
            ctx.fillRect(btnX - 2, btnY + btnH - 4, 2, 6);
            ctx.fillRect(btnX + btnW - 4, btnY + btnH, 6, 2);
            ctx.fillRect(btnX + btnW, btnY + btnH - 4, 2, 6);
        }
        
        ctx.restore();
        
        // Store bounds for click detection
        this.dossierBtnBounds = { x: btnX, y: btnY, w: btnW, h: btnH };
    },

    drawSettingsMenu: function (ctx, w, h) {
        const x = w * 0.08;
        let y = h * 0.1;
        ctx.textAlign = 'left';
        ctx.font = '24px "Courier New", monospace';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('SETTINGS', x, y);

        y += 15;
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.fillRect(x, y, 120, 1);
        y += 40;

        const settings = [
            { label: 'VOLUME', value: this.settingsState.volume + '%' },
            { label: 'QUALITY', value: ['LOW', 'MEDIUM', 'HIGH', 'ULTRA'][this.settingsState.quality] },
            { label: 'FOV', value: this.settingsState.fov + '°' },
            { label: 'SENSITIVITY', value: this.settingsState.sensitivity + '%' },
        ];

        this.settingsIndex = this.settingsIndex || 0;

        settings.forEach((s, i) => {
            const isSelected = this.settingsIndex === i;
            
            if (isSelected) {
                ctx.fillStyle = '#ffffff';
                ctx.font = '12px "Courier New", monospace';
                ctx.fillText('◈', x - 15, y);
            }

            ctx.font = '12px "Courier New", monospace';
            ctx.fillStyle = isSelected ? '#ffffff' : 'rgba(255,255,255,0.4)';
            ctx.fillText(s.label, x, y);
            
            // Draw Interactive arrows
            ctx.fillStyle = isSelected ? '#ffffff' : 'rgba(255,255,255,0.3)';
            ctx.fillText('<', x + 195, y);
            
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.fillText(s.value, x + 240, y);
            
            ctx.textAlign = 'left';
            ctx.fillStyle = isSelected ? '#ffffff' : 'rgba(255,255,255,0.3)';
            ctx.fillText('>', x + 280, y);
            
            y += 40;
        });
    },

    drawMapsMenu: function (ctx, w, h) {
        const x = w * 0.08;
        let y = h * 0.1;
        ctx.textAlign = 'left';
        ctx.font = '24px "Courier New", monospace';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('MAPS', x, y);

        y += 15;
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.fillRect(x, y, 120, 1);
        y += 30;

        this.mapData.forEach((map, i) => {
            const isSelected = this.selectedMap === i;
            ctx.font = '14px "Courier New", monospace';
            ctx.fillStyle = isSelected ? '#ffffff' : 'rgba(255,255,255,0.4)';
            ctx.fillText((isSelected ? '> ' : '  ') + map.name, x, y);
            ctx.font = '11px "Courier New", monospace';
            ctx.fillStyle = 'rgba(255,255,255,0.25)';
            ctx.fillText(map.difficulty + ' — ' + map.desc, x + 20, y + 18);
            y += 50;
        });
    },

    drawModsMenu: function (ctx, w, h) {
        const x = w * 0.08;
        let y = h * 0.1;
        ctx.textAlign = 'left';
        ctx.font = '24px "Courier New", monospace';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('CHASSIS', x, y);

        y += 15;
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.fillRect(x, y, 120, 1);
        y += 30;

        this.modData.forEach((mod, i) => {
            const isSelected = this.selectedMod === i;
            ctx.font = '14px "Courier New", monospace';
            ctx.fillStyle = isSelected ? '#ffffff' : 'rgba(255,255,255,0.4)';
            ctx.fillText((isSelected ? '> ' : '  ') + mod.name, x, y);
            ctx.font = '11px "Courier New", monospace';
            ctx.fillStyle = 'rgba(255,255,255,0.25)';
            ctx.fillText(mod.desc, x + 20, y + 18);
            y += 50;
        });
    },

    drawLogsMenu: function (ctx, w, h) {
        const x = w * 0.08;
        let y = h * 0.1;
        ctx.textAlign = 'left';
        ctx.font = '24px "Courier New", monospace';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('LOGS', x, y);

        y += 15;
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.fillRect(x, y, 120, 1);
        y += 30;

        this.missionLogs.forEach((log) => {
            ctx.font = '12px "Courier New", monospace';
            ctx.fillStyle = '#ffffff';
            ctx.fillText(`${log.id}  ${log.status}  ${log.chassis}`, x, y);
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.fillText(`${log.result}  ${log.date}`, x, y + 16);
            y += 42;
        });
    },

    wrapText: function (ctx, text, x, y, maxWidth, lineHeight) {
        const words = text.split(' ');
        let line = '';
        let lineY = y;
        for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            if (ctx.measureText(testLine).width > maxWidth && n > 0) {
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
