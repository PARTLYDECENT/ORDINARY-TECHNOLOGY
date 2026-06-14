// cheatsheet.js - The ultimate unhinged cheat and mod engine for Project Escapism.
(function() {
    console.log("0x00FF82: CHEATSHEET_MODS_READY. PRESS BACKTICK (`) OR INSERT TO TOGGLE.");

    // State Variables
    window.cheatGodMode = false;
    window.cheatInfAmmo = false;
    window.cheatRapidFire = false;
    window.cheatInstakill = false;
    window.cheatNoclip = false;
    window.cheatFreeze = false;
    window.cheatSuperSpeed = false;
    window.cheatLowGravity = false;
    window.cheatSuperJump = false;
    window.cheatFly = false;
    window.cheatZeroRecoil = false;
    window.cheatZeroSpread = false;
    window.cheatSuperFlashlight = false;
    window.cheatNoFog = false;
    window.cheatDisco = false;
    window.cheatOneHP = false;
    window.cheatSlowMo = false;
    window.cheatGiantPlayer = false;
    window.cheatMiniPlayer = false;
    window.cheatZombieScale = 'none'; // 'none', 'giant', 'mini'
    window.cheatZombieSpeed = 'none'; // 'none', 'fast', 'slow'
    window.cheatESP = false;
    window.cheatAimbot = false;
    window.cheatBulletStorm = false;
    window.cheatWireframe = false;
    window.activeDroneFleet = [];

    // Original Game Backups
    let originalGetCostAt = null;
    let originalZombieSpeed = null;
    let originalWeaponStats = null;
    let originalRecoilCfg = null;
    let originalFogDensity = null;
    let originalFlashlightParams = null;

    // Web Audio chirp sound effects
    function synthSound(freq, type = 'square', dur = 0.15) {
        if (!window.audioCtx) return;
        try {
            const ctx = window.audioCtx;
            if (ctx.state === 'suspended') ctx.resume();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, ctx.currentTime);
            gain.gain.setValueAtTime(0.04, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + dur);
        } catch (e) {}
    }

    function updateUIState(btnId, isActive) {
        const el = document.getElementById(btnId);
        if (!el) return;
        const titleSpan = el.querySelector('.title');
        if (titleSpan) {
            const baseText = titleSpan.textContent.replace(/\[\s*(ON|OFF)\s*\]/gi, '').trim();
            titleSpan.textContent = `${baseText} [ ${isActive ? 'ON' : 'OFF'} ]`;
        }
        if (isActive) {
            el.classList.add('bg-red-500/20', 'border-red-500/80', 'text-red-300');
            el.classList.remove('bg-white/5', 'border-white/10', 'text-white/60');
        } else {
            el.classList.remove('bg-red-500/20', 'border-red-500/80', 'text-red-300');
            el.classList.add('bg-white/5', 'border-white/10', 'text-white/60');
        }
    }

    // Backup original configuration values once variables are loaded
    function backupOriginals() {
        if (window.inventory && !originalWeaponStats) {
            originalWeaponStats = window.inventory.map(w => ({
                id: w.id,
                damage: w.damage,
                fireRate: w.fireRate,
                spread: w.spread,
                automatic: w.automatic,
                pellets: w.pellets
            }));
        }
        if (window.recoilCfg && !originalRecoilCfg) {
            originalRecoilCfg = {};
            for (const key in window.recoilCfg) {
                originalRecoilCfg[key] = { ...window.recoilCfg[key] };
            }
        }
        if (window.flashLight && !originalFlashlightParams) {
            originalFlashlightParams = {
                intensity: window.flashLight.intensity,
                distance: window.flashLight.distance,
                angle: window.flashLight.angle,
                colorHex: window.flashLight.color.getHex()
            };
        }
        if (window.scene && window.scene.fog && originalFogDensity === null) {
            originalFogDensity = window.scene.fog.density;
        }
    }

    // Toggle Functions
    window.toggleCheatGodMode = function() {
        window.cheatGodMode = !window.cheatGodMode;
        synthSound(window.cheatGodMode ? 880 : 440, 'triangle');
        updateUIState('btn-godmode', window.cheatGodMode);
        if (window.NeuralConsole) {
            window.NeuralConsole.log(`[MOD]: GOD MODE ${window.cheatGodMode ? 'ENABLED' : 'DISABLED'}`, window.cheatGodMode ? 'warn' : 'sys');
        }
        if (window.toggleGodMode && window.godMode !== window.cheatGodMode) {
            window.toggleGodMode();
        }
    };

    window.toggleCheatInfAmmo = function() {
        window.cheatInfAmmo = !window.cheatInfAmmo;
        synthSound(window.cheatInfAmmo ? 1200 : 600, 'sine');
        updateUIState('btn-infammo', window.cheatInfAmmo);
        if (window.NeuralConsole) {
            window.NeuralConsole.log(`[MOD]: ENDLESS AMMO MATRIX ${window.cheatInfAmmo ? 'ON' : 'OFF'}`, 'sys');
        }
    };

    window.toggleCheatRapidFire = function() {
        window.cheatRapidFire = !window.cheatRapidFire;
        synthSound(window.cheatRapidFire ? 1500 : 750, 'sawtooth');
        updateUIState('btn-rapidfire', window.cheatRapidFire);
        if (window.NeuralConsole) {
            window.NeuralConsole.log(`[MOD]: RAPID FIRE MATRIX ${window.cheatRapidFire ? 'ENGAGED' : 'DISENGAGED'}`, 'warn');
        }
        backupOriginals();
        if (window.inventory && originalWeaponStats) {
            window.inventory.forEach(w => {
                const orig = originalWeaponStats.find(o => o.id === w.id);
                if (orig) {
                    w.fireRate = window.cheatRapidFire ? 0.02 : orig.fireRate;
                    w.automatic = window.cheatRapidFire ? true : orig.automatic;
                }
            });
        }
    };

    window.toggleCheatInstakill = function() {
        window.cheatInstakill = !window.cheatInstakill;
        synthSound(window.cheatInstakill ? 1800 : 900, 'square');
        updateUIState('btn-instakill', window.cheatInstakill);
        if (window.NeuralConsole) {
            window.NeuralConsole.log(`[MOD]: INSTA-KILL OVERRIDE ${window.cheatInstakill ? 'ACTIVE' : 'DEACTIVATED'}`, 'warn');
        }
        backupOriginals();
        if (window.inventory && originalWeaponStats) {
            window.inventory.forEach(w => {
                const orig = originalWeaponStats.find(o => o.id === w.id);
                if (orig) {
                    w.damage = window.cheatInstakill ? 99999 : orig.damage;
                }
            });
        }
    };

    window.toggleCheatNoclip = function() {
        window.cheatNoclip = !window.cheatNoclip;
        synthSound(window.cheatNoclip ? 1000 : 500, 'triangle');
        updateUIState('btn-noclip', window.cheatNoclip);
        if (window.cheatNoclip) {
            if (window.mapManager) {
                originalGetCostAt = window.mapManager.getCostAt;
                window.mapManager.getCostAt = function() { return 1; };
            }
        } else {
            if (window.mapManager && originalGetCostAt) {
                window.mapManager.getCostAt = originalGetCostAt;
            }
        }
        if (window.NeuralConsole) {
            window.NeuralConsole.log(`[MOD]: NOCLIP GHOST MODE ${window.cheatNoclip ? 'ENABLED' : 'DISABLED'}`, 'sys');
        }
    };

    window.toggleCheatFreeze = function() {
        window.cheatFreeze = !window.cheatFreeze;
        synthSound(window.cheatFreeze ? 600 : 800, 'sine');
        updateUIState('btn-freeze', window.cheatFreeze);
        if (window.cheatFreeze) {
            if (window.CONFIG) {
                originalZombieSpeed = window.CONFIG.zombieSpeed;
                window.CONFIG.zombieSpeed = 0;
            }
        } else {
            if (window.CONFIG && originalZombieSpeed !== null) {
                window.CONFIG.zombieSpeed = originalZombieSpeed;
            }
        }
        if (window.NeuralConsole) {
            window.NeuralConsole.log(`[MOD]: CHRONOS TIME FREEZE ${window.cheatFreeze ? 'ACTIVE' : 'DEACTIVATED'}`, 'sys');
        }
    };

    window.toggleSuperSpeed = function() {
        if (!window.player) return;
        window.cheatSuperSpeed = !window.cheatSuperSpeed;
        synthSound(window.cheatSuperSpeed ? 1400 : 700, 'triangle');
        window.player.speedMultiplier = window.cheatSuperSpeed ? 3.5 : 1.0;
        updateUIState('btn-speed', window.cheatSuperSpeed);
        if (window.NeuralConsole) {
            window.NeuralConsole.log(`[MOD]: MOVEMENT SPEED MULTIPLIER: ${window.cheatSuperSpeed ? 'x3.5' : 'x1.0'}`, 'res');
        }
    };

    window.toggleLowGravity = function() {
        window.cheatLowGravity = !window.cheatLowGravity;
        synthSound(window.cheatLowGravity ? 600 : 1200, 'triangle');
        if (window.CONFIG) {
            window.CONFIG.gravity = window.cheatLowGravity ? 5.0 : 25.0;
            updateUIState('btn-gravity', window.cheatLowGravity);
            if (window.NeuralConsole) {
                window.NeuralConsole.log(`[MOD]: GRAVITATIONAL CONSTANT: ${window.CONFIG.gravity} m/s^2`, 'sys');
            }
        }
    };

    window.toggleCheatSuperJump = function() {
        window.cheatSuperJump = !window.cheatSuperJump;
        synthSound(window.cheatSuperJump ? 900 : 450, 'triangle');
        updateUIState('btn-superjump', window.cheatSuperJump);
        if (window.NeuralConsole) {
            window.NeuralConsole.log(`[MOD]: SUPER JUMP BOOST ${window.cheatSuperJump ? 'ENGAGED' : 'DISENGAGED'}`, 'sys');
        }
    };

    window.toggleCheatFly = function() {
        window.cheatFly = !window.cheatFly;
        synthSound(window.cheatFly ? 1000 : 500, 'triangle');
        updateUIState('btn-fly', window.cheatFly);
        if (window.NeuralConsole) {
            window.NeuralConsole.log(`[MOD]: FLY MODE / INFINITE JUMP ${window.cheatFly ? 'ENABLED' : 'DISABLED'}`, 'sys');
        }
    };

    window.toggleCheatZeroRecoil = function() {
        window.cheatZeroRecoil = !window.cheatZeroRecoil;
        synthSound(window.cheatZeroRecoil ? 1100 : 550, 'sine');
        updateUIState('btn-zerorecoil', window.cheatZeroRecoil);
        if (window.NeuralConsole) {
            window.NeuralConsole.log(`[MOD]: ZERO RECOIL MATRIX ${window.cheatZeroRecoil ? 'ACTIVE' : 'DEACTIVATED'}`, 'sys');
        }
        backupOriginals();
        if (window.recoilCfg && originalRecoilCfg) {
            for (const key in window.recoilCfg) {
                if (window.cheatZeroRecoil) {
                    window.recoilCfg[key].pitchKick = 0.0;
                    window.recoilCfg[key].yawDrift = 0.0;
                    window.recoilCfg[key].zPush = 0.0;
                } else {
                    window.recoilCfg[key].pitchKick = originalRecoilCfg[key].pitchKick;
                    window.recoilCfg[key].yawDrift = originalRecoilCfg[key].yawDrift;
                    window.recoilCfg[key].zPush = originalRecoilCfg[key].zPush;
                }
            }
        }
    };

    window.toggleCheatZeroSpread = function() {
        window.cheatZeroSpread = !window.cheatZeroSpread;
        synthSound(window.cheatZeroSpread ? 1200 : 600, 'sine');
        updateUIState('btn-zerospread', window.cheatZeroSpread);
        if (window.NeuralConsole) {
            window.NeuralConsole.log(`[MOD]: Perfect Laser Accuracy ${window.cheatZeroSpread ? 'LOCKED' : 'RELEASED'}`, 'sys');
        }
        backupOriginals();
        if (window.inventory && originalWeaponStats) {
            window.inventory.forEach(w => {
                const orig = originalWeaponStats.find(o => o.id === w.id);
                if (orig) {
                    w.spread = window.cheatZeroSpread ? 0.0 : orig.spread;
                }
            });
        }
    };

    window.toggleCheatSuperFlashlight = function() {
        window.cheatSuperFlashlight = !window.cheatSuperFlashlight;
        synthSound(window.cheatSuperFlashlight ? 1300 : 650, 'triangle');
        updateUIState('btn-superflashlight', window.cheatSuperFlashlight);
        if (window.NeuralConsole) {
            window.NeuralConsole.log(`[MOD]: SPOTLIGHT OVERCHARGE ${window.cheatSuperFlashlight ? 'ACTIVE' : 'DEACTIVATED'}`, 'sys');
        }
        backupOriginals();
        if (window.flashLight && originalFlashlightParams) {
            if (window.cheatSuperFlashlight) {
                window.flashLight.intensity = 50.0;
                window.flashLight.distance = 250;
                window.flashLight.angle = Math.PI / 2.0;
                window.flashLight.color.setHex(0xffffff);
            } else {
                window.flashLight.intensity = originalFlashlightParams.intensity;
                window.flashLight.distance = originalFlashlightParams.distance;
                window.flashLight.angle = originalFlashlightParams.angle;
                window.flashLight.color.setHex(originalFlashlightParams.colorHex);
            }
        }
    };

    window.toggleCheatNoFog = function() {
        window.cheatNoFog = !window.cheatNoFog;
        synthSound(window.cheatNoFog ? 1400 : 700, 'sine');
        updateUIState('btn-nofog', window.cheatNoFog);
        if (window.NeuralConsole) {
            window.NeuralConsole.log(`[MOD]: FOG MATRIX DENSITY ${window.cheatNoFog ? 'MUTED (CLEAR)' : 'NORMAL'}`, 'sys');
        }
        backupOriginals();
        if (window.scene && window.scene.fog && originalFogDensity !== null) {
            window.scene.fog.density = window.cheatNoFog ? 0.0 : originalFogDensity;
        }
    };

    window.toggleCheatDisco = function() {
        window.cheatDisco = !window.cheatDisco;
        synthSound(window.cheatDisco ? 1500 : 750, 'sawtooth');
        updateUIState('btn-disco', window.cheatDisco);
        if (window.NeuralConsole) {
            window.NeuralConsole.log(`[MOD]: DISCO PARTY OVERRIDE ${window.cheatDisco ? 'INITIALIZED' : 'ABORTED'}`, 'warn');
        }
        if (!window.cheatDisco && window.scene && window.scene.fog) {
            window.scene.fog.color.setHex(0x06060b);
        }
    };

    window.toggleCheatOneHP = function() {
        window.cheatOneHP = !window.cheatOneHP;
        synthSound(window.cheatOneHP ? 700 : 350, 'square');
        updateUIState('btn-onehp', window.cheatOneHP);
        if (window.NeuralConsole) {
            window.NeuralConsole.log(`[MOD]: SWARM INTEGRITY LOCK (1-HP) ${window.cheatOneHP ? 'ACTIVE' : 'DEACTIVATED'}`, 'warn');
        }
    };

    window.toggleCheatSlowMo = function() {
        window.cheatSlowMo = !window.cheatSlowMo;
        synthSound(window.cheatSlowMo ? 500 : 1000, 'sine');
        updateUIState('btn-slowmo', window.cheatSlowMo);
        if (window.NeuralConsole) {
            window.NeuralConsole.log(`[MOD]: TEMPORAL TIME SLOWDOWN (20%) ${window.cheatSlowMo ? 'ACTIVE' : 'DEACTIVATED'}`, 'sys');
        }
    };

    window.toggleCheatGiantPlayer = function() {
        window.cheatGiantPlayer = !window.cheatGiantPlayer;
        if (window.cheatGiantPlayer) {
            window.cheatMiniPlayer = false;
            updateUIState('btn-miniplayer', false);
        }
        synthSound(window.cheatGiantPlayer ? 1100 : 550, 'triangle');
        updateUIState('btn-giantplayer', window.cheatGiantPlayer);
        if (window.player) {
            window.player.scale.setScalar(window.cheatGiantPlayer ? 0.25 : 0.11);
        }
        if (window.NeuralConsole) {
            window.NeuralConsole.log(`[MOD]: OPERATOR CHASSIS SCALE: ${window.cheatGiantPlayer ? 'GIANT (2.3x)' : 'NORMAL'}`, 'sys');
        }
    };

    window.toggleCheatMiniPlayer = function() {
        window.cheatMiniPlayer = !window.cheatMiniPlayer;
        if (window.cheatMiniPlayer) {
            window.cheatGiantPlayer = false;
            updateUIState('btn-giantplayer', false);
        }
        synthSound(window.cheatMiniPlayer ? 600 : 1200, 'triangle');
        updateUIState('btn-miniplayer', window.cheatMiniPlayer);
        if (window.player) {
            window.player.scale.setScalar(window.cheatMiniPlayer ? 0.05 : 0.11);
        }
        if (window.NeuralConsole) {
            window.NeuralConsole.log(`[MOD]: OPERATOR CHASSIS SCALE: ${window.cheatMiniPlayer ? 'MINI (0.4x)' : 'NORMAL'}`, 'sys');
        }
    };

    window.setZombieScale = function(scaleType) {
        window.cheatZombieScale = scaleType;
        synthSound(800, 'triangle');
        const scales = ['btn-zscale-none', 'btn-zscale-giant', 'btn-zscale-mini'];
        scales.forEach(s => {
            const el = document.getElementById(s);
            if (el) {
                if (s === `btn-zscale-${scaleType}`) {
                    el.classList.add('bg-red-500/20', 'border-red-500/80', 'text-red-300');
                    el.classList.remove('bg-white/5', 'border-white/10', 'text-white/60');
                } else {
                    el.classList.remove('bg-red-500/20', 'border-red-500/80', 'text-red-300');
                    el.classList.add('bg-white/5', 'border-white/10', 'text-white/60');
                }
            }
        });

        if (window.zombieMeshes) {
            const val = scaleType === 'giant' ? 2.5 : (scaleType === 'mini' ? 0.4 : 1.0);
            ['normal', 'puker', 'thrower', 'mutant'].forEach(type => {
                if (window.zombieMeshes[type]) {
                    window.zombieMeshes[type].scale.set(val, val, val);
                }
            });
        }
        if (window.NeuralConsole) {
            window.NeuralConsole.log(`[MOD]: SWARM RENDER SCALE FACTOR: ${scaleType.toUpperCase()}`, 'sys');
        }
    };

    // --- NEW CHEAT FUNCTIONS ---

    window.toggleCheatESP = function() {
        window.cheatESP = !window.cheatESP;
        synthSound(window.cheatESP ? 900 : 450, 'sine');
        updateUIState('btn-esp', window.cheatESP);
        if (window.zombieMeshes) {
            ['normal', 'puker', 'thrower', 'mutant'].forEach(type => {
                if (window.zombieMeshes[type]) {
                    window.zombieMeshes[type].material.depthTest = !window.cheatESP;
                    window.zombieMeshes[type].material.needsUpdate = true;
                }
            });
        }
        if (window.NeuralConsole) {
            window.NeuralConsole.log(`[MOD]: SCANNER ESP OVERLAY ${window.cheatESP ? 'ACTIVE' : 'DEACTIVATED'}`, 'sys');
        }
    };

    window.toggleCheatAimbot = function() {
        window.cheatAimbot = !window.cheatAimbot;
        synthSound(window.cheatAimbot ? 1000 : 500, 'sine');
        updateUIState('btn-aimbot', window.cheatAimbot);
        if (window.NeuralConsole) {
            window.NeuralConsole.log(`[MOD]: AUTO-AIM CORRECTION ${window.cheatAimbot ? 'ENGAGED' : 'DISENGAGED'}`, 'sys');
        }
    };

    window.toggleCheatBulletStorm = function() {
        window.cheatBulletStorm = !window.cheatBulletStorm;
        synthSound(window.cheatBulletStorm ? 1500 : 750, 'sawtooth');
        updateUIState('btn-bulletstorm', window.cheatBulletStorm);
        if (window.NeuralConsole) {
            window.NeuralConsole.log(`[MOD]: BULLET STORM AMMUNITION REPLICATOR ${window.cheatBulletStorm ? 'ENGAGED (x10 PELLETS)' : 'DISENGAGED'}`, 'warn');
        }
        backupOriginals();
        if (window.inventory && originalWeaponStats) {
            window.inventory.forEach(w => {
                const orig = originalWeaponStats.find(o => o.id === w.id);
                if (orig) {
                    w.pellets = window.cheatBulletStorm ? (orig.pellets * 10) : orig.pellets;
                }
            });
        }
    };

    window.blinkTeleport = function() {
        if (!window.player || !window.cameraFPS) return;
        synthSound(1600, 'sine', 0.2);
        const dir = new THREE.Vector3(0, 0, -1);
        dir.applyQuaternion(window.cameraFPS.quaternion);
        // Teleport 10m forward in look direction
        window.player.position.addScaledVector(dir, 10.0);
        window._nachtResetVelocity = true;
        if (window.NeuralConsole) {
            window.NeuralConsole.log(`[PORTAL]: QUANTUM SPACE-TIME BLINK (+10M)`, 'res');
        }
    };

    window.toggleCheatWireframe = function() {
        window.cheatWireframe = !window.cheatWireframe;
        synthSound(window.cheatWireframe ? 1000 : 500, 'triangle');
        updateUIState('btn-wireframe', window.cheatWireframe);
        if (window.scene) {
            window.scene.traverse(node => {
                if (node.isMesh && node.material) {
                    if (Array.isArray(node.material)) {
                        node.material.forEach(m => m.wireframe = window.cheatWireframe);
                    } else {
                        node.material.wireframe = window.cheatWireframe;
                    }
                }
            });
        }
        if (window.NeuralConsole) {
            window.NeuralConsole.log(`[MOD]: WIREFRAME STRUCTURAL DETECTOR ${window.cheatWireframe ? 'ACTIVE' : 'DEACTIVATED'}`, 'sys');
        }
    };

    window.setZombieSpeedMultiplier = function(speedType) {
        window.cheatZombieSpeed = speedType;
        synthSound(750, 'triangle');
        const speedBtns = ['btn-zspeed-normal', 'btn-zspeed-fast', 'btn-zspeed-slow'];
        speedBtns.forEach(s => {
            const el = document.getElementById(s);
            if (el) {
                if (s === `btn-zspeed-${speedType}`) {
                    el.classList.add('bg-red-500/20', 'border-red-500/80', 'text-red-300');
                    el.classList.remove('bg-white/5', 'border-white/10', 'text-white/60');
                } else {
                    el.classList.remove('bg-red-500/20', 'border-red-500/80', 'text-red-300');
                    el.classList.add('bg-white/5', 'border-white/10', 'text-white/60');
                }
            }
        });

        backupOriginals();
        if (window.CONFIG) {
            if (originalZombieSpeed === null) {
                originalZombieSpeed = window.CONFIG.zombieSpeed || 1.8;
            }
            const mul = speedType === 'fast' ? 3.0 : (speedType === 'slow' ? 0.2 : 1.0);
            window.CONFIG.zombieSpeed = originalZombieSpeed * mul;
        }
        if (window.NeuralConsole) {
            window.NeuralConsole.log(`[MOD]: SWARM VELOCITY CALIBRATION SET TO: ${speedType.toUpperCase()}`, 'sys');
        }
    };

    // --- EXISTING GAME LOGIC WRAPPERS ---

    window.executeNuke = function() {
        if (!window.zState || !window.zHP) return;
        synthSound(300, 'sawtooth', 0.5);
        let count = 0;
        for (let i = 0; i < window.zState.length; i++) {
            if (window.zState[i] === 1) {
                window.zHP[i] = 0;
                window.zState[i] = 0;
                count++;
                if (window.goreSystem && typeof window.goreSystem.spawnGoreGribs === 'function') {
                    window.goreSystem.spawnGoreGribs(window.zPosX[i], 1.2, window.zPosZ[i], 'normal');
                }
            }
        }
        if (window.setActiveZombiesCount) window.setActiveZombiesCount(0);
        
        const flash = document.createElement('div');
        flash.style.position = 'fixed';
        flash.style.top = '0'; flash.style.left = '0';
        flash.style.width = '100vw'; flash.style.height = '100vh';
        flash.style.background = 'rgba(255, 255, 255, 0.9)';
        flash.style.zIndex = '99999';
        flash.style.pointerEvents = 'none';
        flash.style.transition = 'opacity 0.6s ease-out';
        document.body.appendChild(flash);
        setTimeout(() => {
            flash.style.opacity = '0';
            setTimeout(() => flash.remove(), 600);
        }, 50);

        if (window.SFX && typeof window.SFX.triggerExplosion === 'function') {
            window.SFX.triggerExplosion();
        }
        if (window.NeuralConsole) {
            window.NeuralConsole.log(`[MOD]: ERADICATED ${count} SHAMBLERS. SECTOR_CLEANSED.`, 'warn');
        }
    };

    window.injectCredits = function() {
        synthSound(987, 'triangle');
        window.zombiePoints = (window.zombiePoints || 0) + 50000;
        if (window.moneyWeb && typeof window.moneyWeb.add === 'function') {
            window.moneyWeb.add(50000);
        }
        if (window.NeuralConsole) {
            window.NeuralConsole.log(`[MOD]: INJECTED +50,000 CREDITS INTO DATA STREAM.`, 'res');
        }
    };

    window.spawnMechaZombieBoss = function() {
        if (!window.scene || !window.player || !window.MechaZombieBoss) return;
        synthSound(600, 'sawtooth');
        if (window.mechaZombieBoss) {
            window.mechaZombieBoss.dispose();
        }
        window.mechaZombieBoss = new window.MechaZombieBoss(window.scene);
        const angle = Math.random() * Math.PI * 2;
        const dist = 6.0;
        const sx = window.player.position.x + Math.cos(angle) * dist;
        const sz = window.player.position.z + Math.sin(angle) * dist;
        window.mechaZombieBoss.homePosition.set(sx, window.player.position.y + 0.05, sz);
        window.mechaZombieBoss.position.set(sx, window.player.position.y + 2.05, sz);
        window.mechaZombieBoss.group.position.copy(window.mechaZombieBoss.homePosition);
        if (window.NeuralConsole) {
            window.NeuralConsole.log(`[MOD]: DEPLOYED MECHA-ZOMBIE BOSS (PROTO-TYPHON) NEAR OPERATOR.`, 'warn');
        }
    };

    window.spawnCheatedHorde = function(count, type = -1) {
        if (!window.spawnZombie || !window.player) return;
        synthSound(400, 'square');
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 5.0 + Math.random() * 12.0;
            const sx = window.player.position.x + Math.cos(angle) * dist;
            const sz = window.player.position.z + Math.sin(angle) * dist;
            window.spawnZombie(sx, sz, type);
        }
        if (window.NeuralConsole) {
            window.NeuralConsole.log(`[MOD]: CONJURED ${count} SHAMBLERS AROUND OPERATOR.`, 'warn');
        }
    };

    window.teleportToNachtRoom = function(roomNum) {
        if (!window.player) return;
        synthSound(1300, 'triangle');
        const rooms = {
            1: { x: 0, y: 0.05, z: 12, name: "Room 1 (Spawn Station)" },
            2: { x: 0, y: 0.05, z: -12, name: "Room 2 (Power Grid Vault)" },
            3: { x: 0, y: 18.05, z: 12, name: "Room 3 (Comms Control Deck)" },
            4: { x: 0, y: 18.05, z: -12, name: "Room 4 (Logistics Supply Bay)" },
            5: { x: 0, y: 36.05, z: 0, name: "Room 5 (Roof Apex Penthouse)" },
            6: { x: 0, y: 54.05, z: 12, name: "Room 6 (Armory Bunker)" },
            7: { x: 0, y: 54.05, z: -12, name: "Room 7 (Bio-Lab Chamber)" },
            8: { x: 0, y: 72.05, z: 12, name: "Room 8 (Reactor Core)" },
            9: { x: 0, y: 72.05, z: -12, name: "Room 9 (War Room)" },
            10: { x: 0, y: 90.05, z: 12, name: "Room 10 (Observatory Spire)" },
            11: { x: 0, y: 90.05, z: -12, name: "Room 11 (Aether Research Lab)" },
            12: { x: 0, y: 108.05, z: 0, name: "Spire Roof (Top Summit)" }
        };
        const coord = rooms[roomNum];
        if (coord) {
            window.player.position.set(coord.x, coord.y, coord.z);
            window._nachtResetVelocity = true;
            if (window.NeuralConsole) {
                window.NeuralConsole.log(`[PORTAL]: TELEPORTED TO ${coord.name.toUpperCase()}`, 'res');
            }
        }
    };

    window.spawnDroneFleet = function(count) {
        if (!window.scene || !window.player || !window.cameraFPS || !window.AegisSentinel) return;
        synthSound(1100, 'triangle', 0.3);
        for (let i = 0; i < count; i++) {
            const drone = new window.AegisSentinel(window.scene, window.player, window.cameraFPS);
            drone.config.hoverOffset.set(
                (Math.random() - 0.5) * 12.0,
                5.0 + Math.random() * 6.0,
                (Math.random() - 0.5) * 12.0
            );
            drone.config.attackCooldown = 0.4;
            drone.config.damagePerHit = 8.5;
            drone.isEnabled = true;
            drone.group.visible = true;
            window.activeDroneFleet.push(drone);
        }
        if (window.NeuralConsole) {
            window.NeuralConsole.log(`[MOD]: MATERIALIZED ${count} AEGIS SENTINEL DRONES.`, 'sys');
        }
    };

    // Inject GUI directly into the pause menu
    function injectPauseMenuCheats() {
        const cheatsPanel = document.querySelector('.tab-panel[data-panel="cheats"]');
        const modsPanel = document.querySelector('.tab-panel[data-panel="mods"]');

        if (cheatsPanel) {
            cheatsPanel.innerHTML = `
                <div class="text-[10px] text-white/50 mb-2 font-bold uppercase tracking-wider text-[#ffaa00]">Tactical Bridge Overrides</div>
                <div class="grid grid-cols-2 gap-2 text-xs mb-4">
                    <button id="btn-godmode" onclick="toggleCheatGodMode()" class="cyber-btn text-left flex flex-col gap-1 py-1.5 px-3 bg-white/5 border border-white/10 rounded-sm">
                        <span class="title">GOD MODE [ OFF ]</span>
                        <span class="desc">Invulnerability. HP locked to 9999.</span>
                    </button>
                    <button id="btn-infammo" onclick="toggleCheatInfAmmo()" class="cyber-btn text-left flex flex-col gap-1 py-1.5 px-3 bg-white/5 border border-white/10 rounded-sm">
                        <span class="title">INFINITE AMMO [ OFF ]</span>
                        <span class="desc">No reload. Infinite magazines.</span>
                    </button>
                    <button id="btn-rapidfire" onclick="toggleCheatRapidFire()" class="cyber-btn text-left flex flex-col gap-1 py-1.5 px-3 bg-white/5 border border-white/10 rounded-sm">
                        <span class="title">RAPID FIRE [ OFF ]</span>
                        <span class="desc">Supercharged weapon output.</span>
                    </button>
                    <button id="btn-instakill" onclick="toggleCheatInstakill()" class="cyber-btn text-left flex flex-col gap-1 py-1.5 px-3 bg-white/5 border border-white/10 rounded-sm">
                        <span class="title">INSTA-KILL [ OFF ]</span>
                        <span class="desc">One shot kills all threats.</span>
                    </button>
                    <button id="btn-noclip" onclick="toggleCheatNoclip()" class="cyber-btn text-left flex flex-col gap-1 py-1.5 px-3 bg-white/5 border border-white/10 rounded-sm">
                        <span class="title">NOCLIP GHOST [ OFF ]</span>
                        <span class="desc">Fly freely. Pass through structural walls.</span>
                    </button>
                    <button id="btn-speed" onclick="toggleSuperSpeed()" class="cyber-btn text-left flex flex-col gap-1 py-1.5 px-3 bg-white/5 border border-white/10 rounded-sm">
                        <span class="title">SUPER SPEED [ OFF ]</span>
                        <span class="desc">x3.5 movement speed multiplier.</span>
                    </button>
                    <button id="btn-gravity" onclick="toggleLowGravity()" class="cyber-btn text-left flex flex-col gap-1 py-1.5 px-3 bg-white/5 border border-white/10 rounded-sm">
                        <span class="title">MOON GRAVITY [ OFF ]</span>
                        <span class="desc">Low atmospheric drag gravity.</span>
                    </button>
                    <button id="btn-superjump" onclick="toggleCheatSuperJump()" class="cyber-btn text-left flex flex-col gap-1 py-1.5 px-3 bg-white/5 border border-white/10 rounded-sm">
                        <span class="title">SUPER JUMP [ OFF ]</span>
                        <span class="desc">x2.5 upward jump height multiplier.</span>
                    </button>
                    <button id="btn-fly" onclick="toggleCheatFly()" class="cyber-btn text-left flex flex-col gap-1 py-1.5 px-3 bg-white/5 border border-white/10 rounded-sm">
                        <span class="title">FLY & GLIDE [ OFF ]</span>
                        <span class="desc">Hold Space to glide up infinitely.</span>
                    </button>
                    <button id="btn-zerorecoil" onclick="toggleCheatZeroRecoil()" class="cyber-btn text-left flex flex-col gap-1 py-1.5 px-3 bg-white/5 border border-white/10 rounded-sm">
                        <span class="title">ZERO RECOIL [ OFF ]</span>
                        <span class="desc">Lock gun kickback to absolute zero.</span>
                    </button>
                    <button id="btn-zerospread" onclick="toggleCheatZeroSpread()" class="cyber-btn text-left flex flex-col gap-1 py-1.5 px-3 bg-white/5 border border-white/10 rounded-sm">
                        <span class="title">LASER SPREAD [ OFF ]</span>
                        <span class="desc">100% pinpoint bullet accuracy.</span>
                    </button>
                    <button id="btn-esp" onclick="toggleCheatESP()" class="cyber-btn text-left flex flex-col gap-1 py-1.5 px-3 bg-white/5 border border-white/10 rounded-sm">
                        <span class="title">ESP WALLHACK [ OFF ]</span>
                        <span class="desc">Render hostiles through structural walls.</span>
                    </button>
                    <button id="btn-aimbot" onclick="toggleCheatAimbot()" class="cyber-btn text-left flex flex-col gap-1 py-1.5 px-3 bg-white/5 border border-white/10 rounded-sm">
                        <span class="title">SOFT AIMBOT [ OFF ]</span>
                        <span class="desc">Soft angle target locking onto nearest shambler.</span>
                    </button>
                    <button id="btn-bulletstorm" onclick="toggleCheatBulletStorm()" class="cyber-btn text-left flex flex-col gap-1 py-1.5 px-3 bg-white/5 border border-white/10 rounded-sm">
                        <span class="title">BULLET STORM [ OFF ]</span>
                        <span class="desc">Shoot 10x bullet pellet counts simultaneously.</span>
                    </button>
                    <button onclick="window.blinkTeleport()" class="cyber-btn text-left flex flex-col gap-1 py-1.5 px-3 bg-white/5 border border-white/10 rounded-sm col-span-2">
                        <span class="title">⚡ BLINK TELEPORT [ ACTIVATE ]</span>
                        <span class="desc">Teleport 10m forward in look direction. Hotkey: [ V ]</span>
                    </button>
                </div>
                <div class="text-[10px] text-white/50 mb-2 font-bold uppercase tracking-wider text-[#00ffcc] border-t border-white/10 pt-3">Teleportation Portals (Nacht Rooms)</div>
                <div class="grid grid-cols-4 gap-2 text-[10px]">
                    <button onclick="teleportToNachtRoom(1)" class="cyber-btn py-1 px-2 bg-white/5 border border-white/10 rounded-sm font-bold text-center">Room 1</button>
                    <button onclick="teleportToNachtRoom(2)" class="cyber-btn py-1 px-2 bg-white/5 border border-white/10 rounded-sm font-bold text-center">Room 2</button>
                    <button onclick="teleportToNachtRoom(3)" class="cyber-btn py-1 px-2 bg-white/5 border border-white/10 rounded-sm font-bold text-center">Room 3</button>
                    <button onclick="teleportToNachtRoom(4)" class="cyber-btn py-1 px-2 bg-white/5 border border-white/10 rounded-sm font-bold text-center">Room 4</button>
                    <button onclick="teleportToNachtRoom(5)" class="cyber-btn py-1 px-2 bg-white/5 border border-white/10 rounded-sm font-bold text-center">Room 5</button>
                    <button onclick="teleportToNachtRoom(6)" class="cyber-btn py-1 px-2 bg-white/5 border border-white/10 rounded-sm font-bold text-center">Room 6</button>
                    <button onclick="teleportToNachtRoom(7)" class="cyber-btn py-1 px-2 bg-white/5 border border-white/10 rounded-sm font-bold text-center">Room 7</button>
                    <button onclick="teleportToNachtRoom(8)" class="cyber-btn py-1 px-2 bg-white/5 border border-white/10 rounded-sm font-bold text-center">Room 8</button>
                    <button onclick="teleportToNachtRoom(9)" class="cyber-btn py-1 px-2 bg-white/5 border border-white/10 rounded-sm font-bold text-center">Room 9</button>
                    <button onclick="teleportToNachtRoom(10)" class="cyber-btn py-1 px-2 bg-white/5 border border-white/10 rounded-sm font-bold text-center">Room 10</button>
                    <button onclick="teleportToNachtRoom(11)" class="cyber-btn py-1 px-2 bg-white/5 border border-white/10 rounded-sm font-bold text-center">Room 11</button>
                    <button onclick="teleportToNachtRoom(12)" class="cyber-btn py-1 px-2 bg-[rgba(0,255,200,0.1)] border border-[#00ffcc]/30 text-[#00ffcc] rounded-sm font-bold text-center">Spire Roof</button>
                </div>
            `;
        }

        if (modsPanel) {
            modsPanel.innerHTML = `
                <div class="text-[10px] text-white/50 mb-2 font-bold uppercase tracking-wider text-[#ff3333]">Simulation Integrity Modifiers</div>
                <div class="grid grid-cols-2 gap-2 text-xs mb-4">
                    <button onclick="executeNuke()" class="cyber-btn text-left flex flex-col gap-1 py-1.5 px-3 bg-red-950/20 border border-red-500/30 text-red-300 rounded-sm font-bold">
                        <span class="title">☣ EXECUTE MASS PURGE (NUKE)</span>
                        <span class="desc">Vaporize all active shamblers instantly.</span>
                    </button>
                    <button id="btn-freeze" onclick="toggleCheatFreeze()" class="cyber-btn text-left flex flex-col gap-1 py-1.5 px-3 bg-white/5 border border-white/10 rounded-sm">
                        <span class="title">CHRONOS TIME FREEZE [ OFF ]</span>
                        <span class="desc">Freeze shamblers in time. Player moves normally.</span>
                    </button>
                    <button onclick="injectCredits()" class="cyber-btn text-left flex flex-col gap-1 py-1.5 px-3 bg-white/5 border border-white/10 rounded-sm font-bold">
                        <span class="title">INJECT 50,000 CREDITS</span>
                        <span class="desc">Adds credits to points registries.</span>
                    </button>
                    <button onclick="spawnDroneFleet(5)" class="cyber-btn text-left flex flex-col gap-1 py-1.5 px-3 bg-white/5 border border-white/10 rounded-sm font-bold">
                        <span class="title">REPLICATE AEGIS SQUAD (x5)</span>
                        <span class="desc">Materialize 5 defender drones.</span>
                    </button>
                    <button onclick="spawnDroneFleet(15)" class="cyber-btn text-left flex flex-col gap-1 py-1.5 px-3 bg-white/5 border border-white/10 rounded-sm font-bold">
                        <span class="title">REPLICATE AEGIS FLEET (x15)</span>
                        <span class="desc">Materialize 15 defender drones.</span>
                    </button>
                    <button id="btn-superflashlight" onclick="toggleCheatSuperFlashlight()" class="cyber-btn text-left flex flex-col gap-1 py-1.5 px-3 bg-white/5 border border-white/10 rounded-sm">
                        <span class="title">SUPER FLASHLIGHT [ OFF ]</span>
                        <span class="desc">Crank intensity to 50x and open angle.</span>
                    </button>
                    <button id="btn-nofog" onclick="toggleCheatNoFog()" class="cyber-btn text-left flex flex-col gap-1 py-1.5 px-3 bg-white/5 border border-white/10 rounded-sm">
                        <span class="title">CLEAR FOG [ OFF ]</span>
                        <span class="desc">Clear dark atmospheric fog completely.</span>
                    </button>
                    <button id="btn-disco" onclick="toggleCheatDisco()" class="cyber-btn text-left flex flex-col gap-1 py-1.5 px-3 bg-white/5 border border-white/10 rounded-sm">
                        <span class="title">DISCO STROBE MODE [ OFF ]</span>
                        <span class="desc">Cycle skybox/fog colors dynamically.</span>
                    </button>
                    <button id="btn-slowmo" onclick="toggleCheatSlowMo()" class="cyber-btn text-left flex flex-col gap-1 py-1.5 px-3 bg-white/5 border border-white/10 rounded-sm">
                        <span class="title">SLOW MOTION [ OFF ]</span>
                        <span class="desc">Temporal Bullet Time dilation (0.2x speed).</span>
                    </button>
                    <button id="btn-onehp" onclick="toggleCheatOneHP()" class="cyber-btn text-left flex flex-col gap-1 py-1.5 px-3 bg-white/5 border border-white/10 rounded-sm">
                        <span class="title">1-HP ZOMBIE SWARM [ OFF ]</span>
                        <span class="desc">Forces zombie HP metrics directly to 1.</span>
                    </button>
                    <button id="btn-wireframe" onclick="toggleCheatWireframe()" class="cyber-btn text-left flex flex-col gap-1 py-1.5 px-3 bg-white/5 border border-white/10 rounded-sm">
                        <span class="title">WIREFRAME ESP [ OFF ]</span>
                        <span class="desc">Enable vector structural grid mode.</span>
                    </button>
                    <button id="btn-giantplayer" onclick="toggleCheatGiantPlayer()" class="cyber-btn text-left flex flex-col gap-1 py-1.5 px-3 bg-white/5 border border-white/10 rounded-sm">
                        <span class="title">GIANT OPERATOR [ OFF ]</span>
                        <span class="desc">Scale player chassis to 2.3x scale.</span>
                    </button>
                    <button id="btn-miniplayer" onclick="toggleCheatMiniPlayer()" class="cyber-btn text-left flex flex-col gap-1 py-1.5 px-3 bg-white/5 border border-white/10 rounded-sm col-span-2">
                        <span class="title">MINI OPERATOR [ OFF ]</span>
                        <span class="desc">Scale player chassis down to 0.4x scale.</span>
                    </button>
                </div>
                <div class="text-[10px] text-white/50 mb-2 font-bold uppercase tracking-wider text-[#ff6600] border-t border-white/10 pt-3">Hostile Speed Calibration (Zombie Speed)</div>
                <div class="grid grid-cols-3 gap-2 mb-4 text-xs">
                    <button id="btn-zspeed-normal" onclick="setZombieSpeedMultiplier('normal')" class="cyber-btn font-bold py-1.5 px-2 bg-red-500/20 border border-red-500/80 text-red-300 text-center rounded-sm">Default Speed</button>
                    <button id="btn-zspeed-fast" onclick="setZombieSpeedMultiplier('fast')" class="cyber-btn font-bold py-1.5 px-2 bg-white/5 border border-white/10 text-white/60 text-center rounded-sm">Turbo Shamblers</button>
                    <button id="btn-zspeed-slow" onclick="setZombieSpeedMultiplier('slow')" class="cyber-btn font-bold py-1.5 px-2 bg-white/5 border border-white/10 text-white/60 text-center rounded-sm">Decelerated Swarm</button>
                </div>
                <div class="text-[10px] text-white/50 mb-2 font-bold uppercase tracking-wider text-[#ff8800] border-t border-white/10 pt-3">Hostile Size Modifiers (Zombie Scaling)</div>
                <div class="grid grid-cols-3 gap-2 mb-4 text-xs">
                    <button id="btn-zscale-none" onclick="setZombieScale('none')" class="cyber-btn font-bold py-1.5 px-2 bg-red-500/20 border border-red-500/80 text-red-300 text-center rounded-sm">Default Scale</button>
                    <button id="btn-zscale-giant" onclick="setZombieScale('giant')" class="cyber-btn font-bold py-1.5 px-2 bg-white/5 border border-white/10 text-white/60 text-center rounded-sm">Giant Shamblers</button>
                    <button id="btn-zscale-mini" onclick="setZombieScale('mini')" class="cyber-btn font-bold py-1.5 px-2 bg-white/5 border border-white/10 text-white/60 text-center rounded-sm">Tiny Shamblers</button>
                </div>
                <div class="text-[10px] text-white/50 mb-2 font-bold uppercase tracking-wider text-[#bb55ff] border-t border-white/10 pt-3">Swarm Conjuring Controls (Spawner)</div>
                <div class="grid grid-cols-2 gap-2 text-xs">
                    <button onclick="spawnCheatedHorde(10, 0)" class="cyber-btn py-1.5 px-3 bg-white/5 border border-white/10 rounded-sm font-bold text-left">Spawn 10 Normal Zombies</button>
                    <button onclick="spawnCheatedHorde(10, 1)" class="cyber-btn py-1.5 px-3 bg-white/5 border border-white/10 rounded-sm font-bold text-left">Spawn 10 Slime Pukers</button>
                    <button onclick="spawnCheatedHorde(10, 2)" class="cyber-btn py-1.5 px-3 bg-white/5 border border-white/10 rounded-sm font-bold text-left">Spawn 10 Boulder Throwers</button>
                    <button onclick="spawnCheatedHorde(1, 3)" class="cyber-btn py-1.5 px-3 bg-[rgba(170,0,255,0.1)] border border-[#aa00ff]/30 text-[#bb55ff] rounded-sm font-bold text-left">Spawn Nightmare Boss</button>
                    <button onclick="window.spawnMechaZombieBoss()" class="cyber-btn py-1.5 px-3 bg-[rgba(0,255,100,0.1)] border border-[#00ff64]/30 text-[#00ff64] rounded-sm font-bold text-left col-span-2">Spawn Mecha-Zombie Boss</button>
                </div>
            `;
        }

        // Add custom styles for compact layout inside the tabs
        const style = document.createElement('style');
        style.innerHTML = `
            #pause-overlay #pause-tab-panels .tab-panel {
                height: 100% !important;
                overflow-y: auto !important;
                padding-right: 6px !important;
            }
            #pause-overlay #pause-tab-panels .cyber-btn {
                padding: 6px 10px !important;
                font-size: 0.7rem !important;
                border-radius: 4px !important;
                line-height: 1.15 !important;
                height: auto !important;
                width: 100% !important;
                box-sizing: border-box !important;
                display: flex !important;
                flex-direction: column !important;
                gap: 1px !important;
            }
            #pause-overlay #pause-tab-panels .cyber-btn span.title {
                display: block !important;
                font-weight: bold !important;
            }
            #pause-overlay #pause-tab-panels .cyber-btn span.desc {
                display: block !important;
                font-weight: normal !important;
                font-size: 8px !important;
                opacity: 0.45 !important;
            }
            #pause-overlay #pause-tab-panels .tab-panel::-webkit-scrollbar {
                width: 4px;
            }
            #pause-overlay #pause-tab-panels .tab-panel::-webkit-scrollbar-track {
                background: rgba(255, 255, 255, 0.01);
            }
            #pause-overlay #pause-tab-panels .tab-panel::-webkit-scrollbar-thumb {
                background: rgba(255, 255, 255, 0.15);
                border-radius: 2px;
            }
            #pause-overlay #pause-tab-panels .tab-panel::-webkit-scrollbar-thumb:hover {
                background: rgba(255, 255, 255, 0.3);
            }
        `;
        document.head.appendChild(style);

        // Sync initial UI states
        updateUIState('btn-godmode', window.cheatGodMode);
        updateUIState('btn-infammo', window.cheatInfAmmo);
        updateUIState('btn-rapidfire', window.cheatRapidFire);
        updateUIState('btn-instakill', window.cheatInstakill);
        updateUIState('btn-noclip', window.cheatNoclip);
        updateUIState('btn-speed', window.cheatSuperSpeed);
        updateUIState('btn-gravity', window.cheatLowGravity);
        updateUIState('btn-superjump', window.cheatSuperJump);
        updateUIState('btn-fly', window.cheatFly);
        updateUIState('btn-zerorecoil', window.cheatZeroRecoil);
        updateUIState('btn-zerospread', window.cheatZeroSpread);
        updateUIState('btn-superflashlight', window.cheatSuperFlashlight);
        updateUIState('btn-nofog', window.cheatNoFog);
        updateUIState('btn-disco', window.cheatDisco);
        updateUIState('btn-onehp', window.cheatOneHP);
        updateUIState('btn-slowmo', window.cheatSlowMo);
        updateUIState('btn-giantplayer', window.cheatGiantPlayer);
        updateUIState('btn-miniplayer', window.cheatMiniPlayer);
        updateUIState('btn-esp', window.cheatESP);
        updateUIState('btn-aimbot', window.cheatAimbot);
        updateUIState('btn-bulletstorm', window.cheatBulletStorm);
        updateUIState('btn-wireframe', window.cheatWireframe);
        setZombieScale(window.cheatZombieScale);
        setZombieSpeedMultiplier(window.cheatZombieSpeed);
    }

    // Keyboard trigger listener
    window.addEventListener('keydown', function(e) {
        if (e.code === 'Backquote' || e.code === 'Insert') {
            e.preventDefault();
            if (typeof togglePause === 'function') {
                if (!window.isPaused) {
                    togglePause();
                }
                if (typeof switchPauseTab === 'function') {
                    switchPauseTab('cheats');
                }
            }
        }
        if (e.code === 'KeyV') {
            if (!window.isPaused && window.player) {
                e.preventDefault();
                window.blinkTeleport();
            }
        }
    });

    // Soft-lock Aimbot function
    function runAimbot() {
        if (!window.cheatAimbot || !window.player || !window.zState) return;

        let nearestIdx = -1;
        let nearestDist = Infinity;
        const px = window.player.position.x;
        const pz = window.player.position.z;
        const py = window.player.position.y;

        for (let i = 0; i < window.zState.length; i++) {
            if (window.zState[i] === 1 && window.zHP[i] > 0) {
                const dx = window.zPosX[i] - px;
                const dz = window.zPosZ[i] - pz;
                const dist = Math.sqrt(dx * dx + dz * dz);
                if (dist < nearestDist) {
                    nearestDist = dist;
                    nearestIdx = i;
                }
            }
        }

        if (nearestIdx !== -1) {
            const targetX = window.zPosX[nearestIdx];
            const targetZ = window.zPosZ[nearestIdx];
            const targetY = 1.0; // Chest level target Y

            const dx = targetX - px;
            const dz = targetZ - pz;
            const dy = targetY - (py + 1.6); // Camera eye height approximation

            const targetYaw = Math.atan2(-dx, -dz);
            const horizontalDist = Math.sqrt(dx * dx + dz * dz);
            const targetPitch = Math.atan2(dy, horizontalDist);

            const lerpSpeed = 0.12; // Smooth camera track speed
            window.player.rotation.y = THREE.MathUtils.lerp(window.player.rotation.y, targetYaw, lerpSpeed);
            if (window.playerPitch !== undefined) {
                window.playerPitch = THREE.MathUtils.lerp(window.playerPitch, targetPitch, lerpSpeed);
            }
        }
    }

    // Main frame loop check (called from window.animate)
    function onCheatFrameUpdate() {
        backupOriginals();

        // Run Aimbot targeting
        runAimbot();

        // Synchronize UI states continuously in case they change elsewhere
        if (document.getElementById('btn-godmode')) {
            updateUIState('btn-godmode', window.cheatGodMode || window.godMode);
            updateUIState('btn-infammo', window.cheatInfAmmo);
            updateUIState('btn-rapidfire', window.cheatRapidFire);
            updateUIState('btn-instakill', window.cheatInstakill);
            updateUIState('btn-noclip', window.cheatNoclip);
            updateUIState('btn-speed', window.cheatSuperSpeed);
            updateUIState('btn-gravity', window.cheatLowGravity);
            updateUIState('btn-superjump', window.cheatSuperJump);
            updateUIState('btn-fly', window.cheatFly);
            updateUIState('btn-zerorecoil', window.cheatZeroRecoil);
            updateUIState('btn-zerospread', window.cheatZeroSpread);
            updateUIState('btn-superflashlight', window.cheatSuperFlashlight);
            updateUIState('btn-nofog', window.cheatNoFog);
            updateUIState('btn-disco', window.cheatDisco);
            updateUIState('btn-onehp', window.cheatOneHP);
            updateUIState('btn-slowmo', window.cheatSlowMo);
            updateUIState('btn-giantplayer', window.cheatGiantPlayer);
            updateUIState('btn-miniplayer', window.cheatMiniPlayer);
            updateUIState('btn-esp', window.cheatESP);
            updateUIState('btn-aimbot', window.cheatAimbot);
            updateUIState('btn-bulletstorm', window.cheatBulletStorm);
            updateUIState('btn-wireframe', window.cheatWireframe);
        }

        // 1. God Mode lock
        if (window.cheatGodMode || window.godMode) {
            window.playerHealth = 9999;
            if (window.player) {
                window.player.health = 9999;
            }
        }

        // 2. Infinite Ammo refresh
        if (window.cheatInfAmmo && window.inventory) {
            window.inventory.forEach(w => {
                w.ammo = w.maxAmmo || 999;
                if (w.clipSize !== undefined) w.clip = w.clipSize;
            });
            if (window.updateWeaponUI) window.updateWeaponUI();
        }

        // 3. One-HP Swarm forcing
        if (window.cheatOneHP && window.zHP && window.zState) {
            for (let i = 0; i < window.zHP.length; i++) {
                if (window.zState[i] === 1 && window.zHP[i] > 1) {
                    window.zHP[i] = 1;
                }
            }
        }

        // 4. Disco color cycling strobe effect
        if (window.cheatDisco && window.scene) {
            const h = (performance.now() * 0.001 * 0.5) % 1.0;
            const col = new THREE.Color().setHSL(h, 0.8, 0.5);
            if (window.scene.fog) {
                window.scene.fog.color.copy(col);
            }
        }

        // 5. Zero Spread locked to 0
        if (window.cheatZeroSpread && window.currentSpread !== undefined) {
            window.currentSpread = 0.0;
        }

        // 6. Physics helpers (Super Jump & Fly)
        if (window.keys && window.player && window.velocityY !== undefined) {
            if (window.cheatFly && window.keys.space) {
                window.velocityY = 8.0;
                window.isGrounded = false;
            } else if (window.cheatSuperJump && window.keys.space && window.isGrounded) {
                window.velocityY = 22.5;
                window.isGrounded = false;
            }
        }

        // 7. Update spawned cheat drones
        if (window.activeDroneFleet && window.activeDroneFleet.length) {
            const delta = window.lastDelta || 0.016;
            const uTime = performance.now() * 0.001;
            for (let i = window.activeDroneFleet.length - 1; i >= 0; i--) {
                const drone = window.activeDroneFleet[i];
                if (!window.scene || !window.scene.children.includes(drone.group)) {
                    window.activeDroneFleet.splice(i, 1);
                    continue;
                }
                drone.update(delta, uTime);
            }
        }
    }

    // Continuous Frame update hook
    setInterval(onCheatFrameUpdate, 16);

    // Initialize GUI when DOM ready
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        injectPauseMenuCheats();
    } else {
        window.addEventListener('DOMContentLoaded', injectPauseMenuCheats);
    }
})();
