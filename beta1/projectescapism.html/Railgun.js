/**
 * Railgun — High-Fidelity Procedural Electromagnetic Accelerator
 * Features: Dual-rail barrel, capacitor coil charge-up, energy discharge,
 * heat sink fins, glowing power core, and procedural audio.
 */
class Railgun extends THREE.Group {
    constructor() {
        super();
        this.name = "procedural_railgun";

        // Animation states
        this.chargeLevel = 0;
        this.gunPitch = 0;
        this.gunZ = 0;
        this.lightIntensity = 0;
        this.coilPulse = 0;
        this.discharged = false;
        this.dischargeTimer = 0;

        // Materials — Sci-fi gunmetal + energy accents
        this.frameMat = new THREE.MeshStandardMaterial({
            color: 0x1a2030, roughness: 0.3, metalness: 0.9
        });
        this.panelMat = new THREE.MeshStandardMaterial({
            color: 0x0e1520, roughness: 0.4, metalness: 0.85
        });
        this.railMat = new THREE.MeshStandardMaterial({
            color: 0x667788, roughness: 0.15, metalness: 0.95
        });
        this.coilMat = new THREE.MeshStandardMaterial({
            color: 0x44ffff, emissive: 0x44ffff, emissiveIntensity: 0.6,
            roughness: 0.2, metalness: 0.8, transparent: true, opacity: 0.9
        });
        this.coreMat = new THREE.MeshStandardMaterial({
            color: 0x00ffff, emissive: 0x00ccff, emissiveIntensity: 1.2,
            roughness: 0.1, metalness: 0.9
        });
        this.ventMat = new THREE.MeshStandardMaterial({
            color: 0x334455, roughness: 0.5, metalness: 0.7
        });
        this.gripMat = new THREE.MeshStandardMaterial({
            color: 0x0a0a0a, roughness: 0.9, metalness: 0.05
        });
        this.lensMat = new THREE.MeshStandardMaterial({
            color: 0x003355, transparent: true, opacity: 0.4, roughness: 0.05, metalness: 0.95
        });

        this.buildRailgun();
    }

    buildRailgun() {
        // === MAIN HOUSING ===
        const housingGroup = new THREE.Group();
        this.add(housingGroup);

        // Angular receiver body
        const bodyGeo = new THREE.BoxGeometry(0.32, 0.3, 1.8);
        const body = new THREE.Mesh(bodyGeo, this.frameMat);
        body.position.set(0, 0.15, 0);
        body.castShadow = true;
        housingGroup.add(body);

        // Top panel with beveled look
        const topPanel = new THREE.Mesh(
            new THREE.BoxGeometry(0.28, 0.04, 1.6),
            this.panelMat
        );
        topPanel.position.set(0, 0.32, 0);
        housingGroup.add(topPanel);

        // Side panels (angular cuts)
        for (let side of [-1, 1]) {
            const sidePanel = new THREE.Mesh(
                new THREE.BoxGeometry(0.04, 0.22, 1.4),
                this.panelMat
            );
            sidePanel.position.set(0.18 * side, 0.15, 0);
            housingGroup.add(sidePanel);

            // Panel line details
            for (let i = 0; i < 4; i++) {
                const line = new THREE.Mesh(
                    new THREE.BoxGeometry(0.005, 0.18, 0.02),
                    new THREE.MeshBasicMaterial({ color: 0x334455 })
                );
                line.position.set(0.2 * side, 0.15, -0.4 + i * 0.3);
                housingGroup.add(line);
            }
        }

        // === DUAL RAIL BARREL ===
        this.railGroup = new THREE.Group();
        this.add(this.railGroup);

        // Upper rail
        const upperRailGeo = new THREE.BoxGeometry(0.06, 0.06, 2.4);
        const upperRail = new THREE.Mesh(upperRailGeo, this.railMat);
        upperRail.position.set(0, 0.28, -2.0);
        this.railGroup.add(upperRail);

        // Lower rail
        const lowerRail = new THREE.Mesh(upperRailGeo, this.railMat);
        lowerRail.position.set(0, 0.02, -2.0);
        this.railGroup.add(lowerRail);

        // Rail spacers
        for (let i = 0; i < 6; i++) {
            const spacer = new THREE.Mesh(
                new THREE.BoxGeometry(0.08, 0.04, 0.04),
                this.frameMat
            );
            spacer.position.set(0, 0.15, -1.0 - i * 0.35);
            this.railGroup.add(spacer);
        }

        // === CAPACITOR COILS (Animated glow) ===
        this.coils = [];
        for (let i = 0; i < 8; i++) {
            const coilGeo = new THREE.TorusGeometry(0.14, 0.015, 8, 24);
            const coilMat = this.coilMat.clone();
            const coil = new THREE.Mesh(coilGeo, coilMat);
            coil.rotation.y = Math.PI / 2;
            coil.position.set(0, 0.15, -0.8 - i * 0.28);
            this.railGroup.add(coil);
            this.coils.push({ mesh: coil, mat: coilMat, phase: i * 0.3 });
        }

        // === ENERGY CONDUIT SPINE ===
        const spineGeo = new THREE.CylinderGeometry(0.025, 0.025, 1.8, 8);
        const spine = new THREE.Mesh(spineGeo, this.coreMat);
        spine.rotation.x = Math.PI / 2;
        spine.position.set(0, 0.15, -1.7);
        this.railGroup.add(spine);

        // === POWER CORE (Visible glowing chamber) ===
        this.coreGroup = new THREE.Group();
        this.add(this.coreGroup);

        // Core housing (transparent window)
        const coreWindowGeo = new THREE.BoxGeometry(0.18, 0.16, 0.3);
        const coreWindow = new THREE.Mesh(coreWindowGeo, new THREE.MeshStandardMaterial({
            color: 0x112233, transparent: true, opacity: 0.25, roughness: 0.05, metalness: 0.9
        }));
        coreWindow.position.set(0, 0.15, 0.4);
        this.coreGroup.add(coreWindow);

        // Inner energy orb
        this.energyOrb = new THREE.Mesh(
            new THREE.IcosahedronGeometry(0.06, 2),
            new THREE.MeshStandardMaterial({
                color: 0x00ffff, emissive: 0x00ccff, emissiveIntensity: 2.5,
                transparent: true, opacity: 0.85
            })
        );
        this.energyOrb.position.set(0, 0.15, 0.4);
        this.coreGroup.add(this.energyOrb);

        // Core glow light
        this.coreLight = new THREE.PointLight(0x44ffff, 0.8, 3);
        this.coreLight.position.set(0, 0.15, 0.4);
        this.coreGroup.add(this.coreLight);

        // === HEAT SINK FINS ===
        for (let i = 0; i < 6; i++) {
            const fin = new THREE.Mesh(
                new THREE.BoxGeometry(0.35, 0.02, 0.06),
                this.ventMat
            );
            fin.position.set(0, 0.34, -0.3 - i * 0.15);
            this.add(fin);
        }

        // === SCOPE / OPTIC MOUNT ===
        const scopeBase = new THREE.Mesh(
            new THREE.BoxGeometry(0.12, 0.06, 0.3),
            this.frameMat
        );
        scopeBase.position.set(0, 0.36, 0.1);
        this.add(scopeBase);

        // Scope tube
        const scopeTube = new THREE.Mesh(
            new THREE.CylinderGeometry(0.06, 0.06, 0.4, 12),
            this.frameMat
        );
        scopeTube.rotation.x = Math.PI / 2;
        scopeTube.position.set(0, 0.42, 0.1);
        this.add(scopeTube);

        // Scope lens (front)
        const scopeLens = new THREE.Mesh(
            new THREE.CircleGeometry(0.055, 16),
            this.lensMat
        );
        scopeLens.position.set(0, 0.42, -0.1);
        this.add(scopeLens);

        // === GRIP ===
        const gripGeo = new THREE.BoxGeometry(0.2, 0.8, 0.36);
        const grip = new THREE.Mesh(gripGeo, this.gripMat);
        grip.position.set(0, -0.4, 0.6);
        grip.rotation.x = Math.PI * 0.1;
        grip.castShadow = true;
        this.add(grip);

        // Grip ridges
        for (let i = 0; i < 5; i++) {
            const ridge = new THREE.Mesh(
                new THREE.BoxGeometry(0.22, 0.012, 0.34),
                this.gripMat
            );
            ridge.position.set(0, -0.15 - i * 0.1, 0.6);
            ridge.rotation.x = Math.PI * 0.1;
            this.add(ridge);
        }

        // === POWER CELL (bottom rear) ===
        const cellGeo = new THREE.BoxGeometry(0.14, 0.5, 0.2);
        const cell = new THREE.Mesh(cellGeo, this.panelMat);
        cell.position.set(0, -0.3, 0.0);
        this.add(cell);

        // Cell indicator LED
        const cellLed = new THREE.Mesh(
            new THREE.BoxGeometry(0.02, 0.04, 0.02),
            new THREE.MeshBasicMaterial({ color: 0x00ff88 })
        );
        cellLed.position.set(0.08, -0.15, 0.0);
        this.add(cellLed);

        // === STOCK (Minimal skeletal) ===
        const stockBar = new THREE.Mesh(
            new THREE.BoxGeometry(0.06, 0.06, 0.7),
            this.frameMat
        );
        stockBar.position.set(0, 0.15, 1.2);
        this.add(stockBar);

        const buttPlate = new THREE.Mesh(
            new THREE.BoxGeometry(0.16, 0.2, 0.04),
            this.gripMat
        );
        buttPlate.position.set(0, 0.15, 1.56);
        this.add(buttPlate);

        // === MUZZLE EMITTER ===
        const emitterRing = new THREE.Mesh(
            new THREE.TorusGeometry(0.1, 0.02, 8, 24),
            this.coreMat
        );
        emitterRing.rotation.y = Math.PI / 2;
        emitterRing.position.set(0, 0.15, -3.2);
        this.add(emitterRing);

        // Muzzle light
        this.muzzleLight = new THREE.PointLight(0x44ffff, 0, 8);
        this.muzzleLight.position.set(0, 0.15, -3.3);
        this.add(this.muzzleLight);
    }

    fire() {
        this.gunPitch = 0.4;
        this.gunZ = 0.3;
        this.lightIntensity = 6.0;
        this.discharged = true;
        this.dischargeTimer = 0.4;
        this.coilPulse = 1.0;

        this.playProceduralShot();
    }

    playProceduralShot() {
        if (!window.audioCtx) window.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const ctx = window.audioCtx;
        if (ctx.state === 'suspended') ctx.resume();

        const t = ctx.currentTime;

        // Layer 1: Deep electromagnetic thrum
        const osc1 = ctx.createOscillator();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(60, t);
        osc1.frequency.exponentialRampToValueAtTime(30, t + 0.3);
        const g1 = ctx.createGain();
        g1.gain.setValueAtTime(0.5, t);
        g1.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
        osc1.connect(g1); g1.connect(ctx.destination);
        osc1.start(t); osc1.stop(t + 0.4);

        // Layer 2: Sharp crack
        const osc2 = ctx.createOscillator();
        osc2.type = 'sawtooth';
        osc2.frequency.setValueAtTime(1200, t);
        osc2.frequency.exponentialRampToValueAtTime(100, t + 0.05);
        const g2 = ctx.createGain();
        g2.gain.setValueAtTime(0.4, t);
        g2.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
        osc2.connect(g2); g2.connect(ctx.destination);
        osc2.start(t); osc2.stop(t + 0.1);

        // Layer 3: Electrical buzz
        const osc3 = ctx.createOscillator();
        osc3.type = 'square';
        osc3.frequency.setValueAtTime(400, t);
        osc3.frequency.setValueAtTime(500, t + 0.05);
        osc3.frequency.exponentialRampToValueAtTime(200, t + 0.2);
        const g3 = ctx.createGain();
        g3.gain.setValueAtTime(0.15, t);
        g3.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
        osc3.connect(g3); g3.connect(ctx.destination);
        osc3.start(t); osc3.stop(t + 0.3);
    }

    update(dt) {
        const time = Date.now() * 0.001;

        this.gunPitch += (0 - this.gunPitch) * 10 * dt;
        this.gunZ += (0 - this.gunZ) * 10 * dt;
        this.lightIntensity = Math.max(0, this.lightIntensity - 20 * dt);
        this.muzzleLight.intensity = this.lightIntensity;

        if (this.discharged) {
            this.dischargeTimer -= dt;
            if (this.dischargeTimer <= 0) this.discharged = false;
        }

        this.coilPulse = Math.max(0, this.coilPulse - dt * 2.5);

        // Coil animations — sequential pulse wave
        this.coils.forEach((c, idx) => {
            const basePulse = 0.4 + Math.sin(time * 3 + c.phase) * 0.2;
            const firePulse = this.coilPulse * Math.max(0, 1 - Math.abs(idx - (1 - this.coilPulse) * 8) * 0.3);
            c.mat.emissiveIntensity = basePulse + firePulse * 2.0;
            c.mat.opacity = 0.6 + firePulse * 0.4;
            c.mesh.scale.setScalar(1.0 + firePulse * 0.15);
        });

        // Energy orb rotation + pulse
        if (this.energyOrb) {
            this.energyOrb.rotation.x += dt * 2;
            this.energyOrb.rotation.y += dt * 1.5;
            const orbPulse = 1.8 + Math.sin(time * 4) * 0.8;
            this.energyOrb.material.emissiveIntensity = orbPulse + this.coilPulse * 3.0;
            this.energyOrb.scale.setScalar(1.0 + Math.sin(time * 5) * 0.05 + this.coilPulse * 0.3);
        }

        // Core light pulse
        if (this.coreLight) {
            this.coreLight.intensity = 0.6 + Math.sin(time * 3) * 0.3 + this.coilPulse * 2.0;
        }
    }
}

window.Railgun = Railgun;
