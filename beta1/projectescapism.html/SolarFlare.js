/**
 * SolarFlare — High-Fidelity Procedural Heavy Energy Launcher
 * Features: Wide bell muzzle, thermal core chamber, heat vent animation,
 * fuel canister, charge-up glow cycle, and procedural audio.
 */
class SolarFlare extends THREE.Group {
    constructor() {
        super();
        this.name = "procedural_solar_flare";

        // Animation states
        this.gunPitch = 0;
        this.gunZ = 0;
        this.lightIntensity = 0;
        this.coreHeat = 0;  // 0-1: charge up on fire
        this.ventAngle = 0; // Heat vent flap opening
        this.muzzleRingPulse = 0;

        // Materials — Industrial heavy weapon
        this.frameMat = new THREE.MeshStandardMaterial({
            color: 0x1e1810, roughness: 0.4, metalness: 0.85
        });
        this.heavyMat = new THREE.MeshStandardMaterial({
            color: 0x2a2018, roughness: 0.35, metalness: 0.9
        });
        this.ventMat = new THREE.MeshStandardMaterial({
            color: 0x333028, roughness: 0.5, metalness: 0.7
        });
        this.heatMat = new THREE.MeshStandardMaterial({
            color: 0xff6600, emissive: 0xff4400, emissiveIntensity: 0.8,
            roughness: 0.3, metalness: 0.6
        });
        this.coreMat = new THREE.MeshStandardMaterial({
            color: 0xffaa44, emissive: 0xff6600, emissiveIntensity: 1.5,
            transparent: true, opacity: 0.9
        });
        this.canisterMat = new THREE.MeshStandardMaterial({
            color: 0x882200, roughness: 0.3, metalness: 0.7
        });
        this.gripMat = new THREE.MeshStandardMaterial({
            color: 0x0a0a08, roughness: 0.9, metalness: 0.05
        });
        this.warningMat = new THREE.MeshBasicMaterial({ color: 0xff3300 });
        this.indicatorMat = new THREE.MeshBasicMaterial({ color: 0x00ff44 });

        this.buildFlare();
    }

    buildFlare() {
        // === MAIN RECEIVER (Bulky industrial) ===
        const receiverGroup = new THREE.Group();
        this.add(receiverGroup);

        // Body - wide and chunky
        const bodyGeo = new THREE.BoxGeometry(0.4, 0.38, 1.6);
        const body = new THREE.Mesh(bodyGeo, this.frameMat);
        body.position.set(0, 0.1, 0);
        body.castShadow = true;
        receiverGroup.add(body);

        // Top shroud
        const topShroud = new THREE.Mesh(
            new THREE.BoxGeometry(0.36, 0.06, 1.4),
            this.heavyMat
        );
        topShroud.position.set(0, 0.32, 0);
        receiverGroup.add(topShroud);

        // Side armor plates
        for (let side of [-1, 1]) {
            const plate = new THREE.Mesh(
                new THREE.BoxGeometry(0.04, 0.3, 1.2),
                this.heavyMat
            );
            plate.position.set(0.22 * side, 0.1, 0);
            receiverGroup.add(plate);

            // Rivets
            for (let i = 0; i < 4; i++) {
                const rivet = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.015, 0.015, 0.02, 6),
                    this.ventMat
                );
                rivet.rotation.z = Math.PI / 2;
                rivet.position.set(0.24 * side, 0.2, -0.3 + i * 0.25);
                receiverGroup.add(rivet);
            }
        }

        // === THERMAL CORE CHAMBER (Visible glowing) ===
        this.coreGroup = new THREE.Group();
        this.add(this.coreGroup);

        // Chamber housing (transparent window)
        const chamberGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.4, 16);
        const chamberWindow = new THREE.Mesh(chamberGeo, new THREE.MeshStandardMaterial({
            color: 0x221100, transparent: true, opacity: 0.3, roughness: 0.1, metalness: 0.8
        }));
        chamberWindow.rotation.x = Math.PI / 2;
        chamberWindow.position.set(0, 0.1, -0.2);
        this.coreGroup.add(chamberWindow);

        // Inner core (plasma cylinder)
        this.coreInner = new THREE.Mesh(
            new THREE.CylinderGeometry(0.08, 0.08, 0.35, 12),
            this.coreMat.clone()
        );
        this.coreInner.rotation.x = Math.PI / 2;
        this.coreInner.position.set(0, 0.1, -0.2);
        this.coreGroup.add(this.coreInner);

        // Core glow light
        this.coreLight = new THREE.PointLight(0xff6600, 1.0, 3);
        this.coreLight.position.set(0, 0.1, -0.2);
        this.coreGroup.add(this.coreLight);

        // === HEAT VENT SYSTEM ===
        this.ventFlaps = [];
        for (let i = 0; i < 4; i++) {
            const flapGroup = new THREE.Group();
            const angle = (i / 4) * Math.PI * 2;

            const flap = new THREE.Mesh(
                new THREE.BoxGeometry(0.12, 0.03, 0.18),
                this.ventMat
            );
            flap.position.set(0, 0.06, 0);
            flapGroup.add(flap);

            const x = Math.cos(angle) * 0.2;
            const y = 0.1 + Math.sin(angle) * 0.2;
            flapGroup.position.set(x, y, 0.3);
            flapGroup.rotation.z = angle;
            this.add(flapGroup);
            this.ventFlaps.push(flapGroup);
        }

        // Heat warning strips
        for (let side of [-1, 1]) {
            const strip = new THREE.Mesh(
                new THREE.BoxGeometry(0.005, 0.04, 0.3),
                this.warningMat
            );
            strip.position.set(0.21 * side, -0.05, -0.2);
            this.add(strip);
        }

        // === BARREL ASSEMBLY ===
        // Main barrel
        const barrelGeo = new THREE.CylinderGeometry(0.08, 0.1, 2.0, 16);
        const barrel = new THREE.Mesh(barrelGeo, this.heavyMat);
        barrel.rotation.x = Math.PI / 2;
        barrel.position.set(0, 0.12, -1.8);
        barrel.castShadow = true;
        this.add(barrel);

        // Barrel heat rings
        this.heatRings = [];
        for (let i = 0; i < 6; i++) {
            const ringMat = this.heatMat.clone();
            const ring = new THREE.Mesh(
                new THREE.TorusGeometry(0.12, 0.015, 8, 20),
                ringMat
            );
            ring.rotation.y = Math.PI / 2;
            ring.position.set(0, 0.12, -1.0 - i * 0.25);
            this.add(ring);
            this.heatRings.push({ mesh: ring, mat: ringMat });
        }

        // === WIDE BELL MUZZLE ===
        const bellGeo = new THREE.CylinderGeometry(0.18, 0.12, 0.3, 16);
        const bell = new THREE.Mesh(bellGeo, this.heavyMat);
        bell.rotation.x = Math.PI / 2;
        bell.position.set(0, 0.12, -2.9);
        this.add(bell);

        // Muzzle ring (pulse on fire)
        this.muzzleRing = new THREE.Mesh(
            new THREE.TorusGeometry(0.17, 0.02, 8, 24),
            new THREE.MeshStandardMaterial({
                color: 0xff6600, emissive: 0xff4400, emissiveIntensity: 0.5,
                transparent: true, opacity: 0.7
            })
        );
        this.muzzleRing.rotation.y = Math.PI / 2;
        this.muzzleRing.position.set(0, 0.12, -3.06);
        this.add(this.muzzleRing);

        // Muzzle interior glow
        const muzzleInner = new THREE.Mesh(
            new THREE.CircleGeometry(0.14, 16),
            new THREE.MeshStandardMaterial({
                color: 0xff4400, emissive: 0xff2200, emissiveIntensity: 0.8,
                transparent: true, opacity: 0.4
            })
        );
        muzzleInner.position.set(0, 0.12, -3.05);
        this.add(muzzleInner);

        // === FUEL CANISTER (Side-mounted) ===
        const canisterGroup = new THREE.Group();
        this.add(canisterGroup);

        const canBody = new THREE.Mesh(
            new THREE.CylinderGeometry(0.07, 0.07, 0.6, 12),
            this.canisterMat
        );
        canBody.position.set(-0.3, 0.0, 0.2);
        canisterGroup.add(canBody);

        // Canister cap
        const canCap = new THREE.Mesh(
            new THREE.CylinderGeometry(0.08, 0.08, 0.04, 12),
            this.frameMat
        );
        canCap.position.set(-0.3, 0.32, 0.2);
        canisterGroup.add(canCap);

        // Feed line from canister to receiver
        const feedLine = new THREE.Mesh(
            new THREE.CylinderGeometry(0.015, 0.015, 0.2, 8),
            this.ventMat
        );
        feedLine.rotation.z = Math.PI / 2;
        feedLine.position.set(-0.2, 0.15, 0.2);
        canisterGroup.add(feedLine);

        // Canister level indicator
        const levelIndicator = new THREE.Mesh(
            new THREE.BoxGeometry(0.015, 0.3, 0.015),
            this.indicatorMat
        );
        levelIndicator.position.set(-0.22, 0.1, 0.2);
        canisterGroup.add(levelIndicator);

        // === GRIP ===
        const gripGeo = new THREE.BoxGeometry(0.24, 0.85, 0.4);
        const grip = new THREE.Mesh(gripGeo, this.gripMat);
        grip.position.set(0, -0.5, 0.55);
        grip.rotation.x = Math.PI * 0.1;
        grip.castShadow = true;
        this.add(grip);

        // Grip texture
        for (let i = 0; i < 5; i++) {
            const tex = new THREE.Mesh(
                new THREE.BoxGeometry(0.26, 0.015, 0.38),
                this.gripMat
            );
            tex.position.set(0, -0.25 - i * 0.1, 0.55);
            tex.rotation.x = Math.PI * 0.1;
            this.add(tex);
        }

        // === REINFORCED STOCK ===
        const stockGroup = new THREE.Group();
        this.add(stockGroup);

        const stockMain = new THREE.Mesh(
            new THREE.BoxGeometry(0.22, 0.26, 0.8),
            this.frameMat
        );
        stockMain.position.set(0, 0.1, 1.2);
        stockGroup.add(stockMain);

        // Shoulder pad
        const padGeo = new THREE.BoxGeometry(0.2, 0.24, 0.05);
        const pad = new THREE.Mesh(padGeo, this.gripMat);
        pad.position.set(0, 0.1, 1.62);
        stockGroup.add(pad);

        // Stock vent
        const stockVent = new THREE.Mesh(
            new THREE.BoxGeometry(0.16, 0.08, 0.3),
            new THREE.MeshBasicMaterial({ color: 0x050505 })
        );
        stockVent.position.set(0, 0.22, 1.2);
        stockGroup.add(stockVent);

        // === FOREGRIP ===
        const foreGrip = new THREE.Mesh(
            new THREE.BoxGeometry(0.14, 0.4, 0.2),
            this.gripMat
        );
        foreGrip.position.set(0, -0.25, -0.8);
        this.add(foreGrip);

        // === MUZZLE LIGHT ===
        this.muzzleLight = new THREE.PointLight(0xff6600, 0, 8);
        this.muzzleLight.position.set(0, 0.12, -3.1);
        this.add(this.muzzleLight);
    }

    fire() {
        this.gunPitch = 0.55;
        this.gunZ = 0.4;
        this.lightIntensity = 8.0;
        this.coreHeat = 1.0;
        this.muzzleRingPulse = 1.0;

        this.playProceduralShot();
    }

    playProceduralShot() {
        if (!window.audioCtx) window.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const ctx = window.audioCtx;
        if (ctx.state === 'suspended') ctx.resume();

        const t = ctx.currentTime;

        // Layer 1: Whine build-up
        const osc1 = ctx.createOscillator();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(800, t);
        osc1.frequency.exponentialRampToValueAtTime(2000, t + 0.08);
        osc1.frequency.exponentialRampToValueAtTime(100, t + 0.15);
        const g1 = ctx.createGain();
        g1.gain.setValueAtTime(0.3, t);
        g1.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        osc1.connect(g1); g1.connect(ctx.destination);
        osc1.start(t); osc1.stop(t + 0.25);

        // Layer 2: Explosive thud
        const osc2 = ctx.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(80, t + 0.05);
        osc2.frequency.exponentialRampToValueAtTime(20, t + 0.3);
        const g2 = ctx.createGain();
        g2.gain.setValueAtTime(0.6, t + 0.05);
        g2.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
        osc2.connect(g2); g2.connect(ctx.destination);
        osc2.start(t + 0.05); osc2.stop(t + 0.45);
    }

    update(dt) {
        const time = Date.now() * 0.001;

        this.gunPitch += (0 - this.gunPitch) * 8 * dt;
        this.gunZ += (0 - this.gunZ) * 8 * dt;
        this.lightIntensity = Math.max(0, this.lightIntensity - 15 * dt);
        this.muzzleLight.intensity = this.lightIntensity;

        // Core heat dissipation
        this.coreHeat = Math.max(0, this.coreHeat - dt * 0.8);
        this.muzzleRingPulse = Math.max(0, this.muzzleRingPulse - dt * 2.0);

        // Core glow
        if (this.coreInner) {
            const baseGlow = 1.0 + Math.sin(time * 3) * 0.4;
            this.coreInner.material.emissiveIntensity = baseGlow + this.coreHeat * 4.0;
            this.coreInner.material.opacity = 0.6 + this.coreHeat * 0.4;
        }
        if (this.coreLight) {
            this.coreLight.intensity = 0.8 + Math.sin(time * 3) * 0.3 + this.coreHeat * 3.0;
        }

        // Heat vent flaps
        const targetVent = this.coreHeat > 0.3 ? Math.PI * 0.15 : 0;
        this.ventFlaps.forEach((flap, i) => {
            const currentRot = flap.children[0].rotation.x;
            flap.children[0].rotation.x += (targetVent - currentRot) * 5 * dt;
        });

        // Heat rings glow with core
        this.heatRings.forEach((r, i) => {
            const heatWave = Math.max(0, this.coreHeat - i * 0.1);
            r.mat.emissiveIntensity = 0.3 + heatWave * 2.0 + Math.sin(time * 2 + i) * 0.15;
        });

        // Muzzle ring pulse
        if (this.muzzleRing) {
            this.muzzleRing.material.emissiveIntensity = 0.3 + this.muzzleRingPulse * 3.0;
            this.muzzleRing.scale.setScalar(1.0 + this.muzzleRingPulse * 0.2);
        }
    }
}

window.SolarFlare = SolarFlare;
