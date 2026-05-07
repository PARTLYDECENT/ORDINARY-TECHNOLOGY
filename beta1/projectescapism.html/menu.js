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
        { id: 'survival', name: 'SURVIVAL', desc: 'Infinite waves. No extraction. Survive.', difficulty: 'ENDLESS', color: '#ffffff', fog: 0x110000 }
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
        { title: 'CHASSIS #1997', content: 'Hybrid machine-human combat platform. Humanity\'s last asset.' },
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

        // Kill the shader background
        if (window.MenuBG) { window.MenuBG.stop(); window.MenuBG = null; }

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
                const startY = this.height * 0.18;
                for (let i = 0; i < this.mapData.length; i++) {
                    const cy = startY + 60 + i * 50;
                    if (e.clientX > startX && e.clientX < startX + 400 && e.clientY > cy - 15 && e.clientY < cy + 25) {
                        this.selectedMap = i;
                        this.triggerDeploy('survival');
                        return;
                    }
                }
            } else if (this.subMenuActive === 'mods') {
                const startX = this.width * 0.08;
                const startY = this.height * 0.18;
                for (let i = 0; i < this.modData.length; i++) {
                    const cy = startY + 60 + i * 50;
                    if (e.clientX > startX && e.clientX < startX + 400 && e.clientY > cy - 15 && e.clientY < cy + 25) {
                        this.selectedMod = i;
                        return;
                    }
                }
            }

            const backBtnX = this.width / 2;
            const backBtnY = this.height - 60;
            if (Math.abs(e.clientX - backBtnX) < 100 && Math.abs(e.clientY - backBtnY) < 25) {
                this.subMenuActive = null;
                this.subMenuFade = 0;
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
            if (e.key === 'Escape' || e.key === 'Backspace') { this.subMenuActive = null; this.subMenuFade = 0; }
            return;
        }
        if (e.key === 'ArrowUp' || e.key === 'w') this.selectedIndex = (this.selectedIndex - 1 + this.menuItems.length) % this.menuItems.length;
        else if (e.key === 'ArrowDown' || e.key === 's') this.selectedIndex = (this.selectedIndex + 1) % this.menuItems.length;
        else if (e.key === 'Enter' || e.key === ' ') this.selectItem(this.selectedIndex);
    },

    selectItem: function (index) {
        const item = this.menuItems[index];
        this.selectedIndex = index;
        if (window.SFX) window.SFX.triggerUI();
        switch (item.action) {
            case 'start': this.triggerDeploy('campaign'); break;
            case 'maps': this.subMenuActive = 'maps'; this.subMenuFade = 0; break;
            case 'mods': this.subMenuActive = 'mods'; this.subMenuFade = 0; break;
            case 'arsenal': this.subMenuActive = 'arsenal'; this.subMenuFade = 0; break;
            case 'dossier': this.subMenuActive = 'dossier'; this.subMenuFade = 0; break;
            case 'logs': this.subMenuActive = 'logs'; this.subMenuFade = 0; break;
            case 'settings': this.subMenuActive = 'settings'; this.subMenuFade = 0; break;
        }
    },

    triggerDeploy: function (mode = 'campaign') {
        this.deployMode = mode;
        this.fadeOut = true;
        this.fadeOutAlpha = 0;
        if (window.SFX) window.SFX.startBGM();
    },

    stop: function () {
        this.active = false;
        if (window.MenuBG) window.MenuBG.stop();
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

        this.updateHover();
        this.draw();
        requestAnimationFrame(() => this.animate());
    },

    updateHover: function () {
        if (this.subMenuActive) { this.hoveredItem = -1; return; }
        const menuX = this.width / 2;
        const menuStartY = this.height * 0.38;
        const itemH = 48;
        let newHover = -1;
        for (let i = 0; i < this.menuItems.length; i++) {
            const itemY = menuStartY + i * itemH;
            if (this.mouseX > menuX - 150 && this.mouseX < menuX + 150 &&
                this.mouseY > itemY - 10 && this.mouseY < itemY + itemH - 10) {
                newHover = i;
            }
        }
        if (newHover !== -1 && newHover !== this.hoveredItem && window.SFX) window.SFX.triggerUI();
        this.hoveredItem = newHover;
    },

    draw: function () {
        const ctx = this.ctx;
        const w = this.width;
        const h = this.height;

        // Pure black
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, w, h);

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

        // Fade out
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

        // Title
        const s = this.logoScale;
        ctx.font = `300 ${Math.floor(14 * s)}px "Courier New", monospace`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillText('PROJECT', w / 2, h * 0.2);

        ctx.font = `300 ${Math.floor(48 * s)}px "Courier New", monospace`;
        ctx.fillStyle = '#ffffff';
        ctx.fillText('ESCAPISM', w / 2, h * 0.2 + 50 * s);

        // Thin line
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

            const isHovered = this.hoveredItem === i;
            const isSelected = this.selectedIndex === i;

            ctx.globalAlpha = itemAlpha;

            if (isHovered || isSelected) {
                ctx.font = '16px "Courier New", monospace';
                ctx.fillStyle = '#ffffff';
            } else {
                ctx.font = '14px "Courier New", monospace';
                ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
            }

            ctx.fillText(item.label, w / 2, y + 20);
        }

        ctx.restore();
    },

    drawSubMenu: function (ctx, w, h) {
        ctx.save();
        ctx.globalAlpha = this.subMenuFade;

        // Black bg
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, w, h);

        if (this.subMenuActive === 'arsenal') this.drawArsenalMenu(ctx, w, h);
        else if (this.subMenuActive === 'dossier') this.drawDossierMenu(ctx, w, h);
        else if (this.subMenuActive === 'settings') this.drawSettingsMenu(ctx, w, h);
        else if (this.subMenuActive === 'maps') this.drawMapsMenu(ctx, w, h);
        else if (this.subMenuActive === 'mods') this.drawModsMenu(ctx, w, h);
        else if (this.subMenuActive === 'logs') this.drawLogsMenu(ctx, w, h);

        // Back
        ctx.font = '12px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillText('[ ESC ]', w / 2, h - 60);

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

        settings.forEach((s) => {
            ctx.font = '12px "Courier New", monospace';
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            ctx.fillText(s.label, x, y);
            ctx.fillStyle = '#ffffff';
            ctx.fillText(s.value, x + 200, y);
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

    // Utility
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
