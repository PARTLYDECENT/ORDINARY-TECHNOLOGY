/**
 * SDFManipulatorArm — Advanced Biomorphic Neural Point-Cloud Appendage
 * Formed from 1500 dynamic Dodecahedrons using instanced CPU raymarching SDF.
 * Features: 
 * - Forearm: Twist radius/ulna skeletal double-bones + 4 breathing segmented transverse armor ribs.
 * - Fingers: High-fidelity sequential 3-joint kinematics (Knuckles, PIP joint, DIP joint).
 * - Hologram: Unfolds and LERPs smoothly into a spinning Hexagonal Energy Shield Matrix in ADS.
 * - Abilities: Real-time muscle ripple recoil shockwaves, weapon-adaptive color-morphing HSL states.
 * - Polish: Weapon-switch calibration burst flash, wrist shield pointlight glow, holographic jitter, 
 *           and biomorphic low-health distress speed up.
 */
class SDFManipulatorArm extends THREE.Group {
    constructor() {
        super();
        
        // 1. Setup InstancedMesh with Dodecahedrons
        this.INSTANCE_COUNT = 1500;
        const geometry = new THREE.DodecahedronGeometry(0.011, 0);
        
        // Premium brushed-chrome PBR material with emissive capability
        const material = new THREE.MeshStandardMaterial({
            color: 0xc8d0dc,
            roughness: 0.18,
            metalness: 0.95,
            emissive: 0x112233,
            emissiveIntensity: 0.3,
            transparent: false,
            wireframe: false
        });
 
        this.instancedMesh = new THREE.InstancedMesh(geometry, material, this.INSTANCE_COUNT);
        this.instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        this.add(this.instancedMesh);

        // 1b. Setup InstancedMesh for geometric spark particles (glowing floating octahedrons)
        const sparkGeo = new THREE.OctahedronGeometry(0.006, 0);
        const sparkMat = new THREE.MeshStandardMaterial({
            color: 0x00ffff,
            roughness: 0.1,
            metalness: 0.9,
            emissive: 0x00ffff,
            emissiveIntensity: 4.0,
            transparent: true,
            opacity: 0.95,
            blending: THREE.AdditiveBlending
        });
        this.sparksCount = 120;
        this.sparksMesh = new THREE.InstancedMesh(sparkGeo, sparkMat, this.sparksCount);
        this.sparksMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        if (this.sparksMesh.instanceColor) {
            this.sparksMesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
        }
        this.add(this.sparksMesh);

        // Pre-allocate spark particle pool
        this.sparks = [];
        for (let i = 0; i < this.sparksCount; i++) {
            this.sparks.push({
                active: false,
                position: new THREE.Vector3(),
                velocity: new THREE.Vector3(),
                scale: 0.0,
                startScale: 1.0,
                life: 0.0,
                maxLife: 1.0,
                color: new THREE.Color(),
                rot: new THREE.Vector3(),
                rotSpeed: new THREE.Vector3()
            });
        }
 
        // 2. Pre-calculate targets for Forearm, Wrist, 3 Fingers, and Hologram
        this.particles = [];
        this.dummy = new THREE.Object3D();
        this.colorObj = new THREE.Color();
        this.smoothPositions = [];
        
        const armCount = 600;
        const wristCount = 150;
        const fingerCount = 150; // per finger (450 total)
        
        // Ability and Polish state transitions
        this.shieldTransition = 0.0;
        this.recoilShockwave = 0.0;
        this.calibrationPulse = 0.0;
        this.damageRipple = 0.0;
        this.currentWeaponId = "";

        // Dynamic shield / switch pointlight
        this.shieldLight = new THREE.PointLight(0x00ffff, 0, 4.0);
        this.shieldLight.position.set(0, 0.23, 0.05);
        this.add(this.shieldLight);
        
        const randCyl = (radius, length) => {
            const theta = Math.random() * Math.PI * 2;
            const r = Math.sqrt(Math.random()) * radius;
            const y = (Math.random() - 0.5) * length;
            return new THREE.Vector3(r * Math.cos(theta), y, r * Math.sin(theta));
        };
        
        const randSphere = (radius) => {
            const u = Math.random();
            const v = Math.random();
            const theta = u * 2.0 * Math.PI;
            const phi = Math.acos(2.0 * v - 1.0);
            const r = Math.cbrt(Math.random()) * radius;
            const sinPhi = Math.sin(phi);
            return new THREE.Vector3(r * sinPhi * Math.cos(theta), r * sinPhi * Math.sin(theta), r * Math.cos(phi));
        };
 
        for (let i = 0; i < this.INSTANCE_COUNT; i++) {
            let basePos = new THREE.Vector3();
            let partId = 0; // 0=arm, 1=wrist, 2=thumb, 3=index, 4=middle, 5=hologram
            let subPart = 0; // Forearm: 1=Radius bone, 2=Ulna bone, 3=Armor ribs

            if (i < armCount) {
                partId = 0;
                if (i < 150) {
                    // Radius Bone (Shaft 1)
                    subPart = 1;
                    const y = (Math.random() - 0.5) * 0.6 - 0.15;
                    const theta = Math.random() * Math.PI * 2;
                    const r = Math.sqrt(Math.random()) * 0.008;
                    const twist = y * 1.5;
                    basePos.set(-0.015 + r * Math.cos(theta + twist), y, r * Math.sin(theta + twist));
                } else if (i < 300) {
                    // Ulna Bone (Shaft 2)
                    subPart = 2;
                    const y = (Math.random() - 0.5) * 0.6 - 0.15;
                    const theta = Math.random() * Math.PI * 2;
                    const r = Math.sqrt(Math.random()) * 0.008;
                    const twist = y * 1.5 + Math.PI;
                    basePos.set(0.015 + r * Math.cos(theta + twist), y, r * Math.sin(theta + twist));
                } else {
                    // Armor Ribs (4 bands)
                    subPart = 3;
                    const ribIdx = Math.floor((i - 300) / 75);
                    const ribYVals = [-0.38, -0.22, -0.06, 0.10];
                    const ribY = ribYVals[ribIdx];
                    const angle = ((i - 300) % 75 / 75) * Math.PI * 2 + Math.random() * 0.1;
                    basePos.set(Math.cos(angle) * 0.046, ribY + (Math.random() - 0.5) * 0.01, Math.sin(angle) * 0.038);
                }
            } else if (i < armCount + wristCount) {
                // Wrist core
                basePos = randSphere(0.045);
                basePos.y += 0.18;
                partId = 1;
            } else if (i < armCount + wristCount + fingerCount * 3) {
                // Fingers (shift base Y to start at 0.0 for cleaner joint logic)
                const fingerIdx = Math.floor((i - armCount - wristCount) / fingerCount);
                basePos = randCyl(0.010, 0.22);
                basePos.y += 0.11; // base pos runs in [0.0, 0.22]
                partId = 2 + fingerIdx;
            } else {
                // Hologram particles
                const holoIdx = i - (armCount + wristCount + fingerCount * 3);
                if (holoIdx < 100) {
                    // Outer Ring
                    const angle = (holoIdx / 100) * Math.PI * 2;
                    basePos.set(Math.cos(angle) * 0.065, 0.22, Math.sin(angle) * 0.065);
                } else if (holoIdx < 200) {
                    // Inner Ring
                    const angle = ((holoIdx - 100) / 100) * Math.PI * 2;
                    basePos.set(Math.cos(angle) * 0.052, 0.24, Math.sin(angle) * 0.052);
                } else {
                    // Floating Status Orb
                    basePos = randSphere(0.018);
                    basePos.y += 0.23;
                }
                partId = 5;
            }

            this.particles.push({
                basePos: basePos,
                partId: partId,
                subPart: subPart,
                offset: Math.random() * Math.PI * 2,
                speed: 0.6 + Math.random() * 1.4,
                scaleOffset: Math.random()
            });
            
            this.smoothPositions.push(new THREE.Vector3().copy(basePos));
        }
        
        this._cachedThumbTarget = new THREE.Vector3();
        this._cachedIndexTarget = new THREE.Vector3();
        this._cachedMiddleTarget = new THREE.Vector3();
        this._hasValidAnchors = false;

        this.exploration = {
            thumb: {
                currentOffset: new THREE.Vector3(),
                targetOffset: new THREE.Vector3(),
                wiggleOffset: new THREE.Vector3(),
                timer: 0,
                state: 'grip',
                tapTimer: 0,
                tapSpeed: 0,
                tapAmplitude: new THREE.Vector3(),
                isDetached: false,
                sourceOffset: new THREE.Vector3(),
                destOffset: new THREE.Vector3(),
                detachmentProgress: 0,
                detachmentSpeed: 1.0,
                liftDirection: new THREE.Vector3(0.08, 0.03, 0.0)
            },
            index: {
                currentOffset: new THREE.Vector3(),
                targetOffset: new THREE.Vector3(),
                wiggleOffset: new THREE.Vector3(),
                timer: 0,
                state: 'grip',
                tapTimer: 0,
                tapSpeed: 0,
                tapAmplitude: new THREE.Vector3(),
                isDetached: false,
                sourceOffset: new THREE.Vector3(),
                destOffset: new THREE.Vector3(),
                detachmentProgress: 0,
                detachmentSpeed: 1.0,
                liftDirection: new THREE.Vector3(-0.08, 0.03, 0.0)
            },
            middle: {
                currentOffset: new THREE.Vector3(),
                targetOffset: new THREE.Vector3(),
                wiggleOffset: new THREE.Vector3(),
                timer: 0,
                state: 'grip',
                tapTimer: 0,
                tapSpeed: 0,
                tapAmplitude: new THREE.Vector3(),
                isDetached: false,
                sourceOffset: new THREE.Vector3(),
                destOffset: new THREE.Vector3(),
                detachmentProgress: 0,
                detachmentSpeed: 1.0,
                liftDirection: new THREE.Vector3(-0.08, -0.03, 0.0)
            }
        };
    }

    spawnSpark(pos, vel, color, life, scale = 1.0) {
        const spark = this.sparks.find(s => !s.active);
        if (spark) {
            spark.active = true;
            spark.position.copy(pos);
            spark.velocity.copy(vel);
            spark.scale = scale;
            spark.startScale = scale;
            spark.life = life;
            spark.maxLife = life;
            spark.color.copy(color);
            spark.rot.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
            spark.rotSpeed.set(
                (Math.random() - 0.5) * 12.0,
                (Math.random() - 0.5) * 12.0,
                (Math.random() - 0.5) * 12.0
            );
        }
    }

    triggerShieldDeflect(damageAmount) {
        this.damageRipple = 1.0;
        
        // Spawn bright deflection sparks at the outer shield bounds
        for (let k = 0; k < 15; k++) {
            const angle = Math.random() * Math.PI * 2;
            const r = 0.065 + Math.random() * 0.04;
            const startPos = new THREE.Vector3(
                Math.cos(angle) * r,
                0.23 + (Math.random() - 0.5) * 0.02,
                Math.sin(angle) * r
            );
            const vel = new THREE.Vector3(
                Math.cos(angle) * (0.15 + Math.random() * 0.25),
                0.04 + Math.random() * 0.08,
                Math.sin(angle) * (0.15 + Math.random() * 0.25)
            );
            this.spawnSpark(
                startPos, 
                vel, 
                new THREE.Color(0x00ffff).lerp(new THREE.Color(0xffffff), Math.random() * 0.6), 
                0.4 + Math.random() * 0.4, 
                0.8 + Math.random() * 0.6
            );
        }

        // Web Audio Synth Shield Deflection Zap
        const audioCtx = window.audioCtx || (window.SFX && window.SFX.audioCtx);
        if (audioCtx) {
            try {
                if (audioCtx.state === 'suspended') audioCtx.resume();
                const t = audioCtx.currentTime;
                
                const osc = audioCtx.createOscillator();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(580, t);
                osc.frequency.exponentialRampToValueAtTime(120, t + 0.28);
                
                const filter = audioCtx.createBiquadFilter();
                filter.type = 'bandpass';
                filter.frequency.setValueAtTime(950, t);
                filter.frequency.exponentialRampToValueAtTime(280, t + 0.22);
                filter.Q.value = 6.0;
                
                const gainNode = audioCtx.createGain();
                const masterVol = (window.SFX && window.SFX.masterVolume !== undefined) ? window.SFX.masterVolume : 0.8;
                gainNode.gain.setValueAtTime(0.32 * masterVol, t);
                gainNode.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
                
                osc.connect(filter);
                filter.connect(gainNode);
                gainNode.connect(audioCtx.destination);
                
                osc.start(t);
                osc.stop(t + 0.32);
            } catch (e) {
                console.warn("Shield deflection audio synth error:", e);
            }
        }
    }

    update(uTime, delta, isFiring, isADS, isMoving = false) {
        // Find equipped weapon config to adapt visual styles
        let activeWeapon = null;
        if (window.inventory && window.currentWeaponIdx !== undefined) {
            activeWeapon = window.inventory[window.currentWeaponIdx];
        }
        const wId = activeWeapon ? activeWeapon.id : 'pistol';

        // 1. Ability and Polish transitions
        if (isADS) {
            this.shieldTransition = Math.min(1.0, this.shieldTransition + delta * 4.5);
        } else {
            this.shieldTransition = Math.max(0.0, this.shieldTransition - delta * 3.5);
        }

        if (isFiring) {
            this.recoilShockwave = 1.0;
        } else {
            this.recoilShockwave = Math.max(0.0, this.recoilShockwave - delta * 2.2);
        }

        this.damageRipple = Math.max(0.0, this.damageRipple - delta * 3.0);

        // 2. ADAPTIVE WEAPON THEME PROFILE
        let armTheme = {
            hue: 0.52,          // default cyber cyan
            sat: 0.95,
            light: 0.45,
            pulseSpeed: 7.0,
            sparkColor: new THREE.Color(0x00ffff),
            vibeFreq: 30.0,
            vibeAmp: 0.0008
        };

        if (wId === 'railgun') {
            armTheme.hue = 0.54 + Math.sin(uTime * 3.0) * 0.06;
            armTheme.sat = 0.95;
            armTheme.light = 0.42;
            armTheme.pulseSpeed = 12.0;
            armTheme.sparkColor = new THREE.Color(0x44ffff).lerp(new THREE.Color(0xaa00ff), Math.random() * 0.4);
            armTheme.vibeFreq = 48.0;
            armTheme.vibeAmp = 0.0016;
        } else if (wId === 'flame') {
            armTheme.hue = 0.05 + Math.sin(uTime * 1.5) * 0.03;
            armTheme.sat = 1.0;
            armTheme.light = 0.40;
            armTheme.pulseSpeed = 5.0;
            armTheme.sparkColor = new THREE.Color(0xff6600).lerp(new THREE.Color(0xffaa00), Math.random() * 0.3);
            armTheme.vibeFreq = 20.0;
            armTheme.vibeAmp = 0.001;
        } else if (wId === 'flare') {
            armTheme.hue = (uTime * 0.45) % 1.0; // HSL shifting cosmic colors
            armTheme.sat = 0.95;
            armTheme.light = 0.48;
            armTheme.pulseSpeed = 9.0;
            armTheme.sparkColor = new THREE.Color().setHSL((uTime * 0.45 + 0.2) % 1.0, 1.0, 0.6);
            armTheme.vibeFreq = 35.0;
            armTheme.vibeAmp = 0.0012;
        } else if (wId === 'singular') {
            armTheme.hue = 0.76;
            armTheme.sat = 1.0;
            armTheme.light = 0.38;
            armTheme.pulseSpeed = 8.0;
            armTheme.sparkColor = new THREE.Color(0x9900ff);
            armTheme.vibeFreq = 25.0;
            armTheme.vibeAmp = 0.0006;
        } else if (wId === 'sword') {
            armTheme.hue = 0.58;
            armTheme.sat = 0.15;
            armTheme.light = 0.60;
            armTheme.pulseSpeed = 2.0;
            armTheme.sparkColor = new THREE.Color(0xcccccc);
            armTheme.vibeFreq = 10.0;
            armTheme.vibeAmp = 0.0003;
        } else {
            armTheme.hue = 0.08;
            armTheme.sat = 0.85;
            armTheme.light = 0.42;
            armTheme.pulseSpeed = 6.0;
            armTheme.sparkColor = new THREE.Color(0xffaa00);
            armTheme.vibeFreq = 30.0;
            armTheme.vibeAmp = 0.0008;
        }

        // Weapon Switch Calibration Detection
        if (this.currentWeaponId !== wId) {
            this.currentWeaponId = wId;
            this.calibrationPulse = 1.0;
            
            // Spawn high-density connection sparks from wrist core
            for (let k = 0; k < 20; k++) {
                const vel = new THREE.Vector3(
                    (Math.random() - 0.5) * 0.15,
                    0.05 + Math.random() * 0.18,
                    (Math.random() - 0.5) * 0.15
                );
                const startPos = new THREE.Vector3(0, 0.18, 0);
                this.spawnSpark(startPos, vel, armTheme.sparkColor, 0.4 + Math.random() * 0.3, 0.7 + Math.random() * 0.5);
            }

            // Web Audio Synth Neural Switch Handshake
            const audioCtx = window.audioCtx || (window.SFX && window.SFX.audioCtx);
            if (audioCtx) {
                try {
                    if (audioCtx.state === 'suspended') audioCtx.resume();
                    const t = audioCtx.currentTime;
                    
                    const osc1 = audioCtx.createOscillator();
                    osc1.type = 'triangle';
                    osc1.frequency.setValueAtTime(80, t);
                    osc1.frequency.linearRampToValueAtTime(320, t + 0.35);
                    
                    const gain1 = audioCtx.createGain();
                    const masterVol = (window.SFX && window.SFX.masterVolume !== undefined) ? window.SFX.masterVolume : 0.8;
                    gain1.gain.setValueAtTime(0.001, t);
                    gain1.gain.linearRampToValueAtTime(0.18 * masterVol, t + 0.1);
                    gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.38);
                    
                    osc1.connect(gain1);
                    gain1.connect(audioCtx.destination);
                    osc1.start(t);
                    osc1.stop(t + 0.4);
                    
                    const osc2 = audioCtx.createOscillator();
                    osc2.type = 'sine';
                    osc2.frequency.setValueAtTime(950, t + 0.22);
                    osc2.frequency.setValueAtTime(1400, t + 0.28);
                    
                    const gain2 = audioCtx.createGain();
                    gain2.gain.setValueAtTime(0.001, t + 0.22);
                    gain2.gain.linearRampToValueAtTime(0.12 * masterVol, t + 0.24);
                    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
                    
                    osc2.connect(gain2);
                    gain2.connect(audioCtx.destination);
                    osc2.start(t + 0.22);
                    osc2.stop(t + 0.5);
                } catch (e) {
                    console.warn("Handshake audio synthesis error:", e);
                }
            }
        }
        this.calibrationPulse = Math.max(0.0, this.calibrationPulse - delta * 1.5);

        // Biomorphic Health Sync
        let healthRatio = 1.0;
        if (window.playerHealth !== undefined) {
            const maxHP = (window.CONFIG && window.CONFIG.playerHealth) ? window.CONFIG.playerHealth : 300;
            healthRatio = Math.max(0.0, Math.min(1.0, window.playerHealth / maxHP));
        }

        // Low health distress state override (Rapid distressed crimson red heartbeat)
        if (healthRatio < 0.35) {
            const distressedPulse = 0.5 + Math.sin(uTime * 18.0) * 0.5;
            armTheme.hue = 0.0;
            armTheme.sat = 1.0;
            armTheme.light = 0.35 + distressedPulse * 0.2;
            armTheme.pulseSpeed = 16.0;
            armTheme.vibeFreq = 65.0;
            armTheme.vibeAmp = 0.0022;
            armTheme.sparkColor = new THREE.Color(0xff0000).lerp(new THREE.Color(0x220000), Math.random() * 0.25);
        }

        const pulse = Math.sin(uTime * 3.5) * 0.06 + 0.94;
        const gripTightness = isFiring ? 1.0 : (isADS ? 0.75 : 0.2);
        
        if (this._prevGrip === undefined) this._prevGrip = gripTightness;
        const gripDelta = Math.abs(gripTightness - this._prevGrip);
        this._gripGlow = (this._gripGlow || 0) + gripDelta * 3.0;
        this._gripGlow *= Math.pow(0.02, delta);
        this._prevGrip = gripTightness;

        if (this._fireHeat === undefined) this._fireHeat = 0;
        if (isFiring) {
            this._fireHeat = Math.min(1.0, this._fireHeat + delta * 2.5);
        } else {
            this._fireHeat *= Math.pow(0.1, delta);
        }
        
        const thumbRot = new THREE.Euler(0.1, 0, -0.7 - gripTightness * 0.4);
        const thumbPos = new THREE.Vector3(0.04, 0.22, 0.02);
        
        const indexRot = new THREE.Euler(0.65 + gripTightness * 0.55, 0.08, 0.06);
        const indexPos = new THREE.Vector3(-0.035, 0.24, 0.03);
        
        const middleRot = new THREE.Euler(0.75 + gripTightness * 0.65, -0.08, -0.06);
        const middlePos = new THREE.Vector3(-0.035, 0.24, -0.03);
        
        const fingersList = ['thumb', 'index', 'middle'];
        fingersList.forEach(f => {
            const exp = this.exploration[f];
            if (isFiring) {
                exp.state = 'grip';
                exp.isDetached = false;
                exp.detachmentProgress = 1.0;
                exp.targetOffset.set(0, 0, 0);
                exp.wiggleOffset.set(0, 0, 0);
                exp.currentOffset.lerp(exp.targetOffset, delta * 25.0);
            } else {
                exp.timer -= delta;
                
                if (exp.timer <= 0 && exp.state !== 'detach_transition' && !isADS) {
                    exp.timer = 3.0 + Math.random() * 4.0;
                    
                    const chooseDetach = Math.random() < 0.6;
                    if (chooseDetach) {
                        exp.state = 'detach_transition';
                        exp.isDetached = true;
                        exp.sourceOffset.copy(exp.currentOffset);
                        exp.detachmentProgress = 0;
                        exp.detachmentSpeed = 1.0 / (0.5 + Math.random() * 0.7);
                        
                        if (f === 'thumb') {
                            exp.destOffset.set(
                                (Math.random() - 0.5) * 0.015,
                                (Math.random() - 0.5) * 0.035,
                                (Math.random() - 0.5) * 0.05
                            );
                        } else if (f === 'index') {
                            exp.destOffset.set(
                                (Math.random() - 0.5) * 0.02,
                                0.01 + Math.random() * 0.045,
                                -0.09 + (Math.random() - 0.5) * 0.05
                            );
                        } else {
                            exp.destOffset.set(
                                (Math.random() - 0.5) * 0.015,
                                -0.05 + (Math.random() - 0.5) * 0.03,
                                (Math.random() - 0.5) * 0.03
                            );
                        }

                        // Detach Sparks
                        const startPos = f === 'thumb' ? this._cachedThumbTarget : (f === 'index' ? this._cachedIndexTarget : this._cachedMiddleTarget);
                        for (let k = 0; k < 5; k++) {
                            const vel = new THREE.Vector3().copy(exp.liftDirection)
                                .multiplyScalar(0.25 + Math.random() * 0.3)
                                .add(new THREE.Vector3(
                                    (Math.random() - 0.5) * 0.12,
                                    (Math.random() - 0.5) * 0.12,
                                    (Math.random() - 0.5) * 0.12
                                ));
                            this.spawnSpark(startPos, vel, armTheme.sparkColor, 0.6 + Math.random() * 0.5, 0.8 + Math.random() * 0.6);
                        }
                    } else {
                        const randState = Math.random();
                        if (randState < 0.45) {
                            exp.state = 'grip';
                            exp.targetOffset.set(0, 0, 0);
                        } else {
                            exp.state = 'wander';
                            if (f === 'thumb') {
                                exp.targetOffset.set(
                                    (Math.random() - 0.5) * 0.012,
                                    (Math.random() - 0.5) * 0.03,
                                    (Math.random() - 0.5) * 0.04
                                );
                            } else if (f === 'index') {
                                exp.targetOffset.set(
                                    (Math.random() - 0.5) * 0.015,
                                    0.01 + Math.random() * 0.035,
                                    -0.07 + (Math.random() - 0.5) * 0.04
                                );
                            } else {
                                exp.targetOffset.set(
                                    (Math.random() - 0.5) * 0.012,
                                    -0.035 + (Math.random() - 0.5) * 0.025,
                                    (Math.random() - 0.5) * 0.02
                                );
                            }
                        }
                    }
                }

                if (isADS && exp.state === 'detach_transition') {
                    exp.state = 'grip';
                    exp.isDetached = false;
                    exp.targetOffset.set(0, 0, 0);
                }

                if (exp.state === 'detach_transition') {
                    exp.detachmentProgress += delta * exp.detachmentSpeed;
                    if (exp.detachmentProgress >= 1.0) {
                        exp.detachmentProgress = 1.0;
                        exp.currentOffset.copy(exp.destOffset);
                        exp.targetOffset.copy(exp.destOffset);
                        exp.wiggleOffset.set(0, 0, 0);
                        exp.isDetached = false;
                        
                        // Landing Sparks
                        const landPos = f === 'thumb' ? this._cachedThumbTarget : (f === 'index' ? this._cachedIndexTarget : this._cachedMiddleTarget);
                        for (let k = 0; k < 8; k++) {
                            const vel = new THREE.Vector3(
                                (Math.random() - 0.5) * 0.22,
                                (Math.random() - 0.5) * 0.22,
                                (Math.random() - 0.5) * 0.22
                            );
                            this.spawnSpark(landPos, vel, armTheme.sparkColor, 0.7 + Math.random() * 0.5, 0.9 + Math.random() * 0.7);
                        }

                        if (Math.random() < 0.4) {
                            exp.state = 'tap';
                            exp.tapTimer = 0.6 + Math.random() * 1.2;
                            exp.tapSpeed = 10.0 + Math.random() * 14.0;
                            if (f === 'index') {
                                exp.tapAmplitude.set(-0.012 - Math.random() * 0.008, 0.0, 0.0);
                            } else if (f === 'middle') {
                                exp.tapAmplitude.set(0.0, 0.0, 0.007);
                            } else {
                                exp.tapAmplitude.set(0.0, 0.007, 0.0);
                            }
                        } else {
                            exp.state = 'wander';
                        }
                    } else {
                        const t = exp.detachmentProgress;
                        const easedT = THREE.MathUtils.smoothstep(t, 0, 1);
                        exp.currentOffset.lerpVectors(exp.sourceOffset, exp.destOffset, easedT);
                        
                        const liftHeight = Math.sin(t * Math.PI);
                        exp.wiggleOffset.copy(exp.liftDirection).multiplyScalar(liftHeight);

                        exp.wiggleOffset.x += Math.sin(uTime * 14.0 + (f === 'thumb' ? 0 : f === 'index' ? 2 : 4)) * 0.004 * liftHeight;
                        exp.wiggleOffset.y += Math.cos(uTime * 11.0 + (f === 'thumb' ? 1 : f === 'index' ? 3 : 5)) * 0.004 * liftHeight;
                        exp.wiggleOffset.z += Math.sin(uTime * 17.0 + (f === 'thumb' ? 2 : f === 'index' ? 4 : 6)) * 0.004 * liftHeight;

                        if (Math.random() < 0.25) {
                            const vel = new THREE.Vector3(
                                (Math.random() - 0.5) * 0.04,
                                (Math.random() - 0.5) * 0.04,
                                (Math.random() - 0.5) * 0.04
                            );
                            const trailPos = f === 'thumb' ? this._cachedThumbTarget : (f === 'index' ? this._cachedIndexTarget : this._cachedMiddleTarget);
                            this.spawnSpark(trailPos, vel, armTheme.sparkColor, 0.5 + Math.random() * 0.3, 0.6 + Math.random() * 0.5);
                        }
                    }
                } else {
                    const slideSpeed = isMoving ? 6.0 : 3.5;
                    exp.currentOffset.lerp(exp.targetOffset, delta * slideSpeed);
                    
                    if (exp.state === 'tap') {
                        exp.tapTimer -= delta;
                        if (exp.tapTimer <= 0) {
                            exp.state = 'grip';
                            exp.targetOffset.set(0, 0, 0);
                        } else {
                            const tapVal = Math.max(0, Math.sin(uTime * exp.tapSpeed));
                            exp.wiggleOffset.copy(exp.tapAmplitude).multiplyScalar(tapVal);
                        }
                    } else {
                        exp.wiggleOffset.lerp(new THREE.Vector3(0,0,0), delta * 6.0);
                    }
                }
            }
        });

        // EVALUATE INVISIBLE IK ANCHORS
        this._hasValidAnchors = false;
        if (window.activeWeaponMesh && window.activeWeaponMesh.gripAnchors) {
            try {
                window.activeWeaponMesh.updateMatrix();
                window.activeWeaponMesh.gripAnchors.thumb.updateMatrix();
                window.activeWeaponMesh.gripAnchors.index.updateMatrix();
                window.activeWeaponMesh.gripAnchors.middle.updateMatrix();
                this.updateMatrix();

                const invManip = new THREE.Matrix4().copy(this.matrix).invert();
                const mWeapon = window.activeWeaponMesh.matrix;

                const thumbExpl = this.exploration.thumb.currentOffset.clone().add(this.exploration.thumb.wiggleOffset);
                const indexExpl = this.exploration.index.currentOffset.clone().add(this.exploration.index.wiggleOffset);
                const middleExpl = this.exploration.middle.currentOffset.clone().add(this.exploration.middle.wiggleOffset);

                if (isMoving) {
                    const walkSway = Math.sin(uTime * 8.0) * 0.005;
                    thumbExpl.z += walkSway;
                    indexExpl.z += walkSway * 0.5;
                    middleExpl.z += walkSway * 0.8;
                }

                if (isADS) {
                    thumbExpl.multiplyScalar(0.12);
                    indexExpl.multiplyScalar(0.12);
                    middleExpl.multiplyScalar(0.12);
                }

                const mThumb = new THREE.Matrix4().copy(invManip).multiply(mWeapon).multiply(window.activeWeaponMesh.gripAnchors.thumb.matrix);
                this._cachedThumbTarget.copy(thumbExpl).applyMatrix4(mThumb);

                const mIndex = new THREE.Matrix4().copy(invManip).multiply(mWeapon).multiply(window.activeWeaponMesh.gripAnchors.index.matrix);
                this._cachedIndexTarget.copy(indexExpl).applyMatrix4(mIndex);

                const mMiddle = new THREE.Matrix4().copy(invManip).multiply(mWeapon).multiply(window.activeWeaponMesh.gripAnchors.middle.matrix);
                this._cachedMiddleTarget.copy(middleExpl).applyMatrix4(mMiddle);
                
                this._hasValidAnchors = true;
            } catch (e) {
                console.error("Manipulator IK tracking error:", e);
                this._hasValidAnchors = false;
            }
        }

        // Firing Sparks
        if (isFiring && this._hasValidAnchors && Math.random() < 0.20) {
            const vel = new THREE.Vector3(
                -0.18 - Math.random() * 0.22,
                (Math.random() - 0.5) * 0.15,
                -0.12 - Math.random() * 0.22
            );
            this.spawnSpark(this._cachedIndexTarget, vel, armTheme.sparkColor.clone().lerp(new THREE.Color(0xffffff), Math.random() * 0.4), 0.4 + Math.random() * 0.4, 0.8 + Math.random() * 0.6);
            
            if (Math.random() < 0.35) {
                const thumbVel = new THREE.Vector3((Math.random() - 0.5) * 0.12, (Math.random() - 0.5) * 0.12, (Math.random() - 0.5) * 0.12);
                this.spawnSpark(this._cachedThumbTarget, thumbVel, armTheme.sparkColor, 0.3 + Math.random() * 0.3, 0.6 + Math.random() * 0.4);
            }
        }
        
        // Wrist sparks
        if (Math.random() < 0.025) {
            const wristPos = new THREE.Vector3(
                (Math.random() - 0.5) * 0.03,
                0.18 + (Math.random() - 0.5) * 0.03,
                (Math.random() - 0.5) * 0.03
            );
            const vel = new THREE.Vector3(
                (Math.random() - 0.5) * 0.015,
                0.035 + Math.random() * 0.035,
                (Math.random() - 0.5) * 0.015
            );
            this.spawnSpark(wristPos, vel, armTheme.sparkColor, 1.1 + Math.random() * 0.6, 0.4 + Math.random() * 0.4);
        }

        // Spawn holographic drifting energy sparks
        if (Math.random() < 0.045 && this.instancedMesh.visible !== false) {
            const angle = Math.random() * Math.PI * 2;
            const localSparkPos = new THREE.Vector3(Math.cos(angle) * 0.06, 0.23, Math.sin(angle) * 0.06);
            const vel = new THREE.Vector3(
                (Math.random() - 0.5) * 0.05,
                0.04 + Math.random() * 0.05,
                (Math.random() - 0.5) * 0.05
            );
            this.spawnSpark(localSparkPos, vel, armTheme.sparkColor, 0.6 + Math.random() * 0.5, 0.5 + Math.random() * 0.3);
        }

        const smoothLerp = Math.min(1.0, delta * (12.0 + gripTightness * 18.0));

        // Joint folding kinematic helper
        const rotateJoint = (vector, pivotY, angleX, angleZ = 0) => {
            vector.y -= pivotY;
            if (angleX !== 0) {
                const cosX = Math.cos(angleX);
                const sinX = Math.sin(angleX);
                const newY = vector.y * cosX - vector.z * sinX;
                const newZ = vector.y * sinX + vector.z * cosX;
                vector.y = newY;
                vector.z = newZ;
            }
            if (angleZ !== 0) {
                const cosZ = Math.cos(angleZ);
                const sinZ = Math.sin(angleZ);
                const newX = vector.x * cosZ - vector.y * sinZ;
                const newY = vector.x * sinZ + vector.y * cosZ;
                vector.x = newX;
                vector.y = newY;
            }
            vector.y += pivotY;
        };

        const getSkeletalFingerBend = (pos, partId, grip) => {
            const bendPos = pos.clone();
            const isThumb = (partId === 2);
            
            const kAngle = isThumb ? (0.2 + grip * 0.3) : (0.35 + grip * 0.65);
            const mAngle = isThumb ? (0.3 + grip * 0.4) : (0.55 + grip * 0.85);
            const tAngle = isThumb ? (0.2 + grip * 0.3) : (0.45 + grip * 0.65);

            if (isThumb) {
                if (bendPos.y > 0.0) {
                    rotateJoint(bendPos, 0.0, kAngle * 0.35, -kAngle * 0.75);
                }
                if (bendPos.y > 0.07) {
                    rotateJoint(bendPos, 0.07, mAngle * 0.45, -mAngle * 0.65);
                }
                if (bendPos.y > 0.14) {
                    rotateJoint(bendPos, 0.14, tAngle * 0.35, -tAngle * 0.55);
                }
            } else {
                if (bendPos.y > 0.0) {
                    rotateJoint(bendPos, 0.0, kAngle, 0.0);
                }
                if (bendPos.y > 0.07) {
                    rotateJoint(bendPos, 0.07, mAngle, 0.0);
                }
                if (bendPos.y > 0.14) {
                    rotateJoint(bendPos, 0.14, tAngle, 0.0);
                }
            }
            return bendPos;
        };

        // 3. PARSE PARTICLE DISPLACEMENTS & TARGETS
        for (let i = 0; i < this.INSTANCE_COUNT; i++) {
            const p = this.particles[i];
            let targetPos = new THREE.Vector3().copy(p.basePos);
            
            if (p.partId === 0) {
                // Forearm Radius/Ulna bones and armor ribs
                targetPos.x *= pulse;
                targetPos.z *= pulse;
                
                // Segmented Armor Ribs expand/contract organically like respirator breathing
                if (p.subPart === 3) {
                    const breathSpeed = (healthRatio < 0.35) ? 14.0 : 3.0;
                    const breathAmp = (healthRatio < 0.35) ? 0.08 : 0.04;
                    const breath = 1.0 + Math.sin(uTime * breathSpeed + p.basePos.y * 5.0) * breathAmp;
                    targetPos.x *= breath;
                    targetPos.z *= breath;
                }
            } else if (p.partId === 1) {
                // Wrist
            } else if (p.partId >= 2 && p.partId < 5) {
                // Fingers sequential joints
                if (p.partId === 2) {
                    targetPos = getSkeletalFingerBend(p.basePos, p.partId, gripTightness);
                    targetPos.applyEuler(thumbRot);
                    targetPos.add(thumbPos);
                    
                    if (this._hasValidAnchors) {
                        const tipWeight = THREE.MathUtils.smoothstep(p.basePos.y, 0.04, 0.22);
                        targetPos.lerp(this._cachedThumbTarget, tipWeight * 0.85);
                    }
                } else if (p.partId === 3) {
                    targetPos = getSkeletalFingerBend(p.basePos, p.partId, gripTightness);
                    targetPos.applyEuler(indexRot);
                    targetPos.add(indexPos);
                    
                    if (this._hasValidAnchors) {
                        const tipWeight = THREE.MathUtils.smoothstep(p.basePos.y, 0.04, 0.22);
                        targetPos.lerp(this._cachedIndexTarget, tipWeight * 0.85);
                    }
                } else if (p.partId === 4) {
                    targetPos = getSkeletalFingerBend(p.basePos, p.partId, gripTightness);
                    targetPos.applyEuler(middleRot);
                    targetPos.add(middlePos);
                    
                    if (this._hasValidAnchors) {
                        const tipWeight = THREE.MathUtils.smoothstep(p.basePos.y, 0.04, 0.22);
                        targetPos.lerp(this._cachedMiddleTarget, tipWeight * 0.85);
                    }
                }
            } else if (p.partId === 5) {
                // Hologram / Shield Matrix Transition
                const holoIdx = i - (600 + 150 + 450);
                
                // Ring HUD Coordinates
                const posRings = new THREE.Vector3();
                if (holoIdx < 100) {
                    const angle = (holoIdx / 100) * Math.PI * 2 + uTime * 2.0;
                    const radius = 0.065;
                    let rx = Math.cos(angle) * radius;
                    let ry = 0.22 + Math.sin(uTime * 4.0 + p.offset) * 0.003;
                    let rz = Math.sin(angle) * radius;
                    
                    const cosT = Math.cos(0.2);
                    const sinT = Math.sin(0.2);
                    const newY = ry * cosT - rz * sinT;
                    const newZ = ry * sinT + rz * cosT;
                    posRings.set(rx, newY, newZ);
                } else if (holoIdx < 200) {
                    const angle = -((holoIdx - 100) / 100) * Math.PI * 2 - uTime * 2.5;
                    const radius = 0.052;
                    let rx = Math.cos(angle) * radius;
                    let ry = 0.24 + Math.cos(uTime * 4.0 + p.offset) * 0.003;
                    let rz = Math.sin(angle) * radius;
                    
                    const cosT = Math.cos(-0.2);
                    const sinT = Math.sin(-0.2);
                    const newX = rx * cosT - ry * sinT;
                    const newY = rx * sinT + ry * cosT;
                    posRings.set(newX, newY, rz);
                } else {
                    const center = new THREE.Vector3(0, 0.23, 0);
                    const rel = p.basePos.clone().sub(new THREE.Vector3(0, 0.23, 0));
                    const orbPulse = 1.0 + Math.sin(uTime * 6.0 + p.offset) * 0.25;
                    posRings.copy(center).addScaledVector(rel, orbPulse);
                }

                // Shield Matrix & Interactive HUD Coordinates
                const posShield = new THREE.Vector3();
                if (holoIdx < 100) {
                    // Outer Hexagonal Shield Ring (100 particles)
                    const angle = (holoIdx / 100) * Math.PI * 2 + uTime * 1.5;
                    const radius = 0.085;
                    const sides = 6.0;
                    const rDistortion = 1.0 + Math.sin(angle * sides) * 0.04;
                    let radialPulse = radius * rDistortion * (1.0 + Math.sin(uTime * 8.0) * 0.03);
                    
                    if (this.damageRipple > 0.01) {
                        const wave = Math.sin(radius * 90.0 - uTime * 40.0) * 0.012 * this.damageRipple;
                        radialPulse += wave;
                    }

                    posShield.set(
                        Math.cos(angle) * radialPulse,
                        0.22 + Math.sin(uTime * 6.0 + p.offset) * 0.001,
                        Math.sin(angle) * radialPulse
                    );
                } else if (holoIdx < 160) {
                    // Inner Hexagonal Shield Ring (60 particles)
                    const angle = -((holoIdx - 100) / 60) * Math.PI * 2 - uTime * 2.0;
                    const radius = 0.062;
                    const sides = 6.0;
                    const rDistortion = 1.0 + Math.sin(angle * sides) * 0.04;
                    let radialPulse = radius * rDistortion * (1.0 + Math.sin(uTime * 8.0) * 0.03);
                    
                    if (this.damageRipple > 0.01) {
                        const wave = Math.sin(radius * 90.0 - uTime * 40.0) * 0.012 * this.damageRipple;
                        radialPulse += wave;
                    }

                    posShield.set(
                        Math.cos(angle) * radialPulse,
                        0.24 + Math.cos(uTime * 6.0 + p.offset) * 0.001,
                        Math.sin(angle) * radialPulse
                    );
                } else if (holoIdx < 220) {
                    // Ammo Dial HUD (60 particles)
                    const subIdx = holoIdx - 160;
                    const arcAngle = (subIdx / 60) * Math.PI * 1.5 - Math.PI * 0.75;
                    const ammoRadius = 0.040;
                    posShield.set(
                        Math.cos(arcAngle) * ammoRadius,
                        0.23 + Math.sin(uTime * 4.0 + p.offset) * 0.001,
                        Math.sin(arcAngle) * ammoRadius
                    );
                } else {
                    // Biometric EKG HUD (80 particles)
                    const subIdx = holoIdx - 220;
                    const x = -0.035 + 0.07 * (subIdx / 80);
                    
                    let phase = (uTime * (healthRatio < 0.35 ? 14.0 : 4.0) - x * 120.0) % (Math.PI * 2.0);
                    if (phase < 0.0) phase += Math.PI * 2.0;
                    
                    let wave = 0.0;
                    if (phase > 1.0 && phase < 1.6) {
                        wave += Math.sin((phase - 1.0) / 0.6 * Math.PI) * 0.15;
                    }
                    if (phase > 2.0 && phase < 2.5) {
                        const qrsT = (phase - 2.0) / 0.5;
                        if (qrsT < 0.2) {
                            wave -= qrsT / 0.2 * 0.2;
                        } else if (qrsT < 0.6) {
                            wave += (qrsT - 0.2) / 0.4 * 1.2;
                        } else if (qrsT < 0.8) {
                            wave -= (qrsT - 0.6) / 0.2 * 1.4;
                        } else {
                            wave += (qrsT - 0.8) / 0.2 * 0.4;
                        }
                    }
                    if (phase > 3.2 && phase < 4.2) {
                        wave += Math.sin((phase - 3.2) / 1.0 * Math.PI) * 0.3;
                    }
                    
                    const hScale = healthRatio < 0.35 ? 1.8 : 1.0;
                    let yVal = wave * hScale * 0.010;
                    
                    if (healthRatio < 0.35 && Math.random() < 0.12) {
                        yVal += (Math.random() - 0.5) * 0.005;
                    }
                    
                    posShield.set(x, 0.23 + yVal, 0.015);
                }

                targetPos.lerpVectors(posRings, posShield, this.shieldTransition);
            }

            // Singularity Gravitational Pull Warping
            if (wId === 'singular' && (p.partId === 0 || p.partId === 1)) {
                const palmCenter = new THREE.Vector3(0, 0.18, 0);
                const pullDir = palmCenter.clone().sub(targetPos);
                const pullStrength = (p.partId === 1) ? 0.35 : 0.15;
                targetPos.addScaledVector(pullDir, pullStrength * (0.6 + Math.sin(uTime * 5.0 + p.offset) * 0.4));
            }

            // 4. BIOMASS RECOIL RIPPLE EFFECT (Wave propagation)
            if (this.recoilShockwave > 0.01 && p.partId < 5) {
                const normY = (targetPos.y + 0.45) / 0.85;
                const wavePhase = normY * 15.0 - uTime * 40.0;
                const rippleScale = Math.sin(wavePhase) * 0.22 * this.recoilShockwave * (1.0 - normY * 0.5);
                targetPos.x += targetPos.x * rippleScale;
                targetPos.z += targetPos.z * rippleScale;
            }
 
            // Organic micro-noise adapted to weapon vibration profile
            const wobble = Math.sin(uTime * p.speed + p.offset);
            targetPos.x += wobble * armTheme.vibeAmp;
            targetPos.y += Math.cos(uTime * p.speed * 1.1 + p.offset) * armTheme.vibeAmp;
            targetPos.z += Math.sin(uTime * p.speed * 0.9 + p.offset) * armTheme.vibeAmp;
  
            this.smoothPositions[i].lerp(targetPos, smoothLerp);
            this.dummy.position.copy(this.smoothPositions[i]);
            
            this.dummy.rotation.x = uTime * 0.4 + p.offset;
            this.dummy.rotation.y = uTime * 0.35 + p.offset * 0.7;
            
            // Scaler breathing
            let scale = 0.65 + Math.sin(uTime * 2.5 + p.scaleOffset * Math.PI * 2) * 0.08;
            
            if (this.calibrationPulse > 0.01) {
                const waveFrontY = -0.45 + (1.0 - this.calibrationPulse) * 0.82;
                const dist = Math.abs(targetPos.y - waveFrontY);
                if (dist < 0.08) {
                    const intensity = (1.0 - dist / 0.08) * this.calibrationPulse;
                    scale += intensity * 0.3;
                }
            }

            if (p.partId === 5) {
                scale = 0.32 + Math.sin(uTime * 4.0 + p.offset) * 0.08;
                
                const holoIdx = i - (600 + 150 + 450);
                if (holoIdx >= 160 && holoIdx < 220 && this.shieldTransition > 0.1) {
                    const subIdx = holoIdx - 160;
                    let chargeRatio = 0.0;
                    if (window.activeWeaponMesh && window.activeWeaponMesh.chargeLevel !== undefined) {
                        chargeRatio = window.activeWeaponMesh.chargeLevel;
                    } else {
                        chargeRatio = 0.45 + Math.sin(uTime * 2.5) * 0.15;
                    }
                    if ((subIdx / 60.0) > chargeRatio) {
                        scale *= 0.18;
                    }
                }
                
                if (Math.random() < 0.02) {
                    this.dummy.position.x += (Math.random() - 0.5) * 0.006;
                    this.dummy.position.y += (Math.random() - 0.5) * 0.006;
                    this.dummy.position.z += (Math.random() - 0.5) * 0.006;
                    scale *= 0.15;
                }
            }
  
            if (p.partId >= 2 && p.partId < 5 && this._fireHeat > 0.05) {
                scale += this._fireHeat * 0.15 * (0.7 + Math.sin(uTime * 12.0 + p.offset * 3.0) * 0.3);
                this.dummy.position.x += Math.sin(uTime * 20.0 + p.offset) * this._fireHeat * 0.002;
                this.dummy.position.z += Math.cos(uTime * 18.0 + p.offset) * this._fireHeat * 0.002;
            }
  
            this.dummy.scale.set(scale, scale, scale);
            this.dummy.updateMatrix();
            this.instancedMesh.setMatrixAt(i, this.dummy.matrix);
 
            // 5. REACTIVE BIOMORPHIC COLOR BLENDING
            if (p.partId === 0) {
                // Forearm
                if (p.subPart === 1 || p.subPart === 2) {
                    const bonePulse = 0.5 + Math.sin(uTime * armTheme.pulseSpeed * 1.2 - p.basePos.y * 22.0) * 0.5;
                    this.colorObj.setHSL(armTheme.hue, armTheme.sat, 0.45 + bonePulse * 0.45);
                } else {
                    const ribRatio = 0.5 + Math.sin(uTime * 2.0 + p.offset * 0.1) * 0.5;
                    this.colorObj.setHSL(armTheme.hue, armTheme.sat * 0.15, armTheme.light * 0.35 + ribRatio * 0.05);
                }
            } else if (p.partId === 1) {
                // Wrist joint core
                const wRatio = 0.8 + Math.sin(uTime * 5.0) * 0.2;
                const articulationBoost = Math.min(1.0, this._gripGlow * 2.2);
                this.colorObj.setHSL(armTheme.hue, armTheme.sat, armTheme.light + wRatio * 0.15 + articulationBoost * 0.25);
            } else if (p.partId === 5) {
                // Hologram rings / shield matrix / HUD
                const holoIdx = i - (600 + 150 + 450);
                if (isFiring) {
                    this.colorObj.setHSL(0.02, 1.0, 0.65);
                } else if (isADS || this.shieldTransition > 0.1) {
                    if (holoIdx >= 220) {
                        // Biometric EKG line: color matches health state
                        if (healthRatio > 0.6) {
                            this.colorObj.setHSL(0.35, 1.0, 0.6);
                        } else if (healthRatio > 0.35) {
                            this.colorObj.setHSL(0.12, 1.0, 0.55);
                        } else {
                            const flash = 0.4 + Math.sin(uTime * 15.0) * 0.4;
                            this.colorObj.setHSL(0.0, 1.0, 0.4 + flash * 0.2);
                        }
                    } else if (holoIdx >= 160 && holoIdx < 220) {
                        // Ammo Dial: Cyan, tip is white-hot
                        const subIdx = holoIdx - 160;
                        let chargeRatio = 0.0;
                        if (window.activeWeaponMesh && window.activeWeaponMesh.chargeLevel !== undefined) {
                            chargeRatio = window.activeWeaponMesh.chargeLevel;
                        } else {
                            chargeRatio = 0.45 + Math.sin(uTime * 2.5) * 0.15;
                        }
                        const distToTip = Math.abs((subIdx / 60.0) - chargeRatio);
                        if (distToTip < 0.05) {
                            this.colorObj.setRGB(1.0, 1.0, 1.0);
                        } else {
                            this.colorObj.setHSL(0.52, 1.0, 0.6);
                        }
                    } else {
                        // Shield Hexagons: Purple/Violet
                        this.colorObj.setHSL(0.78, 1.0, 0.55);
                    }
                } else if (isMoving) {
                    this.colorObj.setHSL(0.52, 0.95, 0.55);
                } else {
                    this.colorObj.setHSL(armTheme.hue, armTheme.sat, 0.50 + Math.sin(uTime * 5.0 + p.offset) * 0.15);
                }
                
                if (this.damageRipple > 0.01 && holoIdx < 160) {
                    this.colorObj.lerp(new THREE.Color(0xffffff), this.damageRipple * 0.95);
                }
            } else {
                // Fingers sequential joints
                const fingerKey = p.partId === 2 ? 'thumb' : (p.partId === 3 ? 'index' : 'middle');
                const exp = this.exploration[fingerKey];
                
                if (isFiring) {
                    const firePhase = 0.5 + Math.sin(uTime * 14.0 + p.offset) * 0.5;
                    const heatHue = 0.02 + firePhase * 0.03 + this._fireHeat * 0.06;
                    const heatLightness = 0.52 + firePhase * 0.18 + this._fireHeat * 0.22;
                    this.colorObj.setHSL(heatHue, 1.0 - this._fireHeat * 0.4, Math.min(0.95, heatLightness));
                } else if (exp.state === 'detach_transition') {
                    const detPhase = 0.5 + Math.sin(uTime * 10.0 + p.basePos.y * 15.0) * 0.5;
                    this.colorObj.setHSL(0.88 + detPhase * 0.04, 0.95, 0.45 + detPhase * 0.25);
                } else {
                    const gRatio = 0.5 + Math.sin(uTime * 3.5 + p.basePos.y * 12.0) * 0.5;
                    this.colorObj.setHSL(armTheme.hue, armTheme.sat, armTheme.light + gRatio * 0.12);
                }
            }

            // Apply Neural Switch Calibration wave flash (overrides and ripples to white-hot along Y-axis)
            if (this.calibrationPulse > 0.01) {
                const waveFrontY = -0.45 + (1.0 - this.calibrationPulse) * 0.82;
                const dist = Math.abs(this.smoothPositions[i].y - waveFrontY);
                if (dist < 0.12) {
                    const intensity = (1.0 - dist / 0.12) * this.calibrationPulse;
                    this.colorObj.lerp(new THREE.Color(0xffffff), intensity * 0.98);
                }
            }

            this.instancedMesh.setColorAt(i, this.colorObj);
        }
 
        // 6. SPARKS SIMULATION
        const dummySpark = new THREE.Object3D();
        for (let i = 0; i < this.sparksCount; i++) {
            const s = this.sparks[i];
            if (s.active) {
                s.life -= delta;
                if (s.life <= 0) {
                    s.active = false;
                    dummySpark.position.set(0, -9999, 0);
                    dummySpark.scale.set(0, 0, 0);
                    dummySpark.updateMatrix();
                    this.sparksMesh.setMatrixAt(i, dummySpark.matrix);
                } else {
                    s.position.addScaledVector(s.velocity, delta);
                    s.velocity.multiplyScalar(Math.pow(0.88, delta * 60.0));
                    s.rot.addScaledVector(s.rotSpeed, delta);
                    
                    const ratio = s.life / s.maxLife;
                    const curScale = s.startScale * ratio;
                    
                    dummySpark.position.copy(s.position);
                    dummySpark.rotation.set(s.rot.x, s.rot.y, s.rot.z);
                    dummySpark.scale.set(curScale, curScale, curScale);
                    dummySpark.updateMatrix();
                    this.sparksMesh.setMatrixAt(i, dummySpark.matrix);
                    this.sparksMesh.setColorAt(i, s.color);
                }
            } else {
                dummySpark.position.set(0, -9999, 0);
                dummySpark.scale.set(0, 0, 0);
                dummySpark.updateMatrix();
                this.sparksMesh.setMatrixAt(i, dummySpark.matrix);
            }
        }

        // Update shield pointlight intensity & color profile
        if (this.shieldLight) {
            this.shieldLight.color.copy(armTheme.sparkColor);
            this.shieldLight.intensity = this.shieldTransition * 2.5 + this.calibrationPulse * 3.0;
        }

        this.instancedMesh.instanceMatrix.needsUpdate = true;
        if (this.instancedMesh.instanceColor) {
            this.instancedMesh.instanceColor.needsUpdate = true;
        }

        this.sparksMesh.instanceMatrix.needsUpdate = true;
        if (this.sparksMesh.instanceColor) {
            this.sparksMesh.instanceColor.needsUpdate = true;
        }
    }
}

window.SDFManipulatorArm = SDFManipulatorArm;
