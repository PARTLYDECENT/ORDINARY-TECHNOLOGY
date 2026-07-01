/**
 * GravSingularity — High-Fidelity Procedural Graviton Emitter
 * Features: Floating energy orb between prong arms, graviton lens array,
 * counter-rotating rings, particle containment, and distortion pulse.
 */
class GravSingularity extends THREE.Group {
    constructor() {
        super();
        this.name = "procedural_grav_singularity";

        // Animation states
        this.gunPitch = 0;
        this.gunZ = 0;
        this.lightIntensity = 0;
        this.orbRotSpeed = 1.0;
        this.prongSpread = 0;  // Prongs open on fire
        this.lensRotation = 0;
        this.pulseWave = 0;
        this.orbBob = 0;

        // Materials — Exotic alien tech
        this.frameMat = new THREE.MeshStandardMaterial({
            color: 0x18142a, roughness: 0.35, metalness: 0.9
        });
        this.shellMat = new THREE.MeshStandardMaterial({
            color: 0x201838, roughness: 0.3, metalness: 0.85
        });
        this.prongMat = new THREE.MeshStandardMaterial({
            color: 0x2a2040, roughness: 0.25, metalness: 0.9
        });
        this.orbMat = new THREE.MeshStandardMaterial({
            color: 0xbb66ff, emissive: 0xaa44ff, emissiveIntensity: 2.5,
            transparent: true, opacity: 0.85, roughness: 0.05, metalness: 0.9
        });
        this.orbGlowMat = new THREE.MeshStandardMaterial({
            color: 0x8833cc, emissive: 0x7722aa, emissiveIntensity: 1.0,
            transparent: true, opacity: 0.3, side: THREE.DoubleSide
        });
        this.lensMat = new THREE.MeshStandardMaterial({
            color: 0xcc88ff, emissive: 0x9944dd, emissiveIntensity: 0.6,
            transparent: true, opacity: 0.7, metalness: 0.8
        });
        this.conduitMat = new THREE.MeshStandardMaterial({
            color: 0x6633aa, emissive: 0x4422aa, emissiveIntensity: 0.5,
            roughness: 0.3, metalness: 0.8
        });
        this.gripMat = new THREE.MeshStandardMaterial({
            color: 0x0a0812, roughness: 0.9, metalness: 0.05
        });
        this.chamberMat = new THREE.MeshStandardMaterial({
            color: 0x110e20, transparent: true, opacity: 0.25, roughness: 0.05, metalness: 0.95
        });

        this.buildEmitter();
    }

    buildEmitter() {
        // === MAIN FRAME BODY ===
        const frameGroup = new THREE.Group();
        this.add(frameGroup);

        // Angular body housing
        const bodyGeo = new THREE.BoxGeometry(0.3, 0.28, 1.2);
        const body = new THREE.Mesh(bodyGeo, this.frameMat);
        body.position.set(0, 0.0, 0.2);
        body.castShadow = true;
        frameGroup.add(body);

        // Top ridge
        const topRidge = new THREE.Mesh(
            new THREE.BoxGeometry(0.16, 0.04, 1.0),
            this.shellMat
        );
        topRidge.position.set(0, 0.16, 0.2);
        frameGroup.add(topRidge);

        // Side panel details
        for (let side of [-1, 1]) {
            const panel = new THREE.Mesh(
                new THREE.BoxGeometry(0.04, 0.2, 0.8),
                this.shellMat
            );
            panel.position.set(0.17 * side, 0.0, 0.2);
            frameGroup.add(panel);

            // Conduit lines
            for (let i = 0; i < 3; i++) {
                const conduit = new THREE.Mesh(
                    new THREE.BoxGeometry(0.005, 0.14, 0.02),
                    this.conduitMat
                );
                conduit.position.set(0.19 * side, 0.0, 0.0 + i * 0.25);
                frameGroup.add(conduit);
            }
        }

        // Status LED array
        for (let i = 0; i < 3; i++) {
            const led = new THREE.Mesh(
                new THREE.BoxGeometry(0.015, 0.015, 0.015),
                new THREE.MeshBasicMaterial({ color: i < 2 ? 0xaa44ff : 0x00ff66 })
            );
            led.position.set(-0.16, 0.1, -0.1 + i * 0.08);
            frameGroup.add(led);
        }

        // === PRONG ARMS (Animated spread) ===
        this.prongLeft = new THREE.Group();
        this.prongRight = new THREE.Group();
        this.add(this.prongLeft);
        this.add(this.prongRight);

        const buildProng = (group, side) => {
            // Main arm
            const armGeo = new THREE.BoxGeometry(0.08, 0.06, 1.4);
            const arm = new THREE.Mesh(armGeo, this.prongMat);
            arm.position.set(0.1 * side, 0.06, -0.8);
            group.add(arm);

            // Tip — curved inward
            const tipGeo = new THREE.BoxGeometry(0.06, 0.08, 0.2);
            const tip = new THREE.Mesh(tipGeo, this.conduitMat);
            tip.position.set(0.06 * side, 0.06, -1.5);
            tip.rotation.z = -0.3 * side;
            group.add(tip);

            // Energy conduit along arm
            const conduit = new THREE.Mesh(
                new THREE.CylinderGeometry(0.012, 0.012, 1.2, 8),
                this.conduitMat
            );
            conduit.rotation.x = Math.PI / 2;
            conduit.position.set(0.08 * side, 0.1, -0.8);
            group.add(conduit);

            // Prong joint bolts
            for (let i = 0; i < 3; i++) {
                const bolt = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.02, 0.02, 0.03, 6),
                    this.frameMat
                );
                bolt.rotation.z = Math.PI / 2;
                bolt.position.set(0.14 * side, 0.06, -0.3 - i * 0.4);
                group.add(bolt);
            }
        };

        buildProng(this.prongLeft, -1);
        buildProng(this.prongRight, 1);

        // === CONTAINMENT CHAMBER (Transparent) ===
        const chamberGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.5, 16, 1, true);
        const chamber = new THREE.Mesh(chamberGeo, this.chamberMat);
        chamber.rotation.x = Math.PI / 2;
        chamber.position.set(0, 0.06, -1.1);
        this.add(chamber);

        // Chamber end caps
        for (let z of [-0.85, -1.35]) {
            const cap = new THREE.Mesh(
                new THREE.TorusGeometry(0.15, 0.02, 8, 24),
                this.frameMat
            );
            cap.rotation.y = Math.PI / 2;
            cap.position.set(0, 0.06, z);
            this.add(cap);
        }

        // === FLOATING ENERGY ORB ===
        this.orbGroup = new THREE.Group();
        this.orbGroup.position.set(0, 0.06, -1.1);
        this.add(this.orbGroup);

        // Core orb
        this.energyOrb = new THREE.Mesh(
            new THREE.IcosahedronGeometry(0.08, 3),
            this.orbMat.clone()
        );
        this.orbGroup.add(this.energyOrb);

        // Glow sphere (larger, transparent)
        this.glowSphere = new THREE.Mesh(
            new THREE.IcosahedronGeometry(0.13, 2),
            this.orbGlowMat.clone()
        );
        this.orbGroup.add(this.glowSphere);

        // Orb light
        this.orbLight = new THREE.PointLight(0xaa44ff, 1.2, 4);
        this.orbGroup.add(this.orbLight);

        // Orbiting micro-particles (small spheres)
        this.orbiters = [];
        for (let i = 0; i < 6; i++) {
            const orbiter = new THREE.Mesh(
                new THREE.SphereGeometry(0.012, 6, 6),
                new THREE.MeshBasicMaterial({ color: 0xcc88ff })
            );
            this.orbGroup.add(orbiter);
            this.orbiters.push({
                mesh: orbiter,
                radius: 0.12 + i * 0.01,
                speed: 2 + i * 0.5,
                phase: (i / 6) * Math.PI * 2,
                tilt: (Math.random() - 0.5) * Math.PI * 0.5
            });
        }

        // === GRAVITON LENS ARRAY (Counter-rotating rings) ===
        this.lensRings = [];
        for (let i = 0; i < 3; i++) {
            const ringGeo = new THREE.TorusGeometry(0.1 + i * 0.04, 0.008, 8, 32);
            const ring = new THREE.Mesh(ringGeo, this.lensMat.clone());
            ring.rotation.y = Math.PI / 2;
            ring.position.set(0, 0.06, -1.6);
            this.add(ring);
            this.lensRings.push({
                mesh: ring,
                speed: (i % 2 === 0 ? 1 : -1) * (1.5 + i * 0.8),
                axis: i % 2 === 0 ? 'x' : 'z'
            });
        }

        // === SKELETAL GRIP ===
        const gripGeo = new THREE.BoxGeometry(0.18, 0.75, 0.3);
        const grip = new THREE.Mesh(gripGeo, this.gripMat);
        grip.position.set(0, -0.4, 0.5);
        grip.rotation.x = Math.PI * 0.08;
        grip.castShadow = true;
        this.add(grip);

        // Grip ridges
        for (let i = 0; i < 4; i++) {
            const ridge = new THREE.Mesh(
                new THREE.BoxGeometry(0.2, 0.012, 0.28),
                this.gripMat
            );
            ridge.position.set(0, -0.2 - i * 0.1, 0.5);
            ridge.rotation.x = Math.PI * 0.08;
            this.add(ridge);
        }

        // === PARTICLE CONTAINMENT CELL (Bottom) ===
        const cellGeo = new THREE.BoxGeometry(0.12, 0.35, 0.16);
        const cell = new THREE.Mesh(cellGeo, this.shellMat);
        cell.position.set(0, -0.2, 0.0);
        this.add(cell);

        // Cell window
        const cellWindow = new THREE.Mesh(
            new THREE.BoxGeometry(0.08, 0.15, 0.02),
            new THREE.MeshStandardMaterial({
                color: 0x8844cc, emissive: 0x6622aa, emissiveIntensity: 0.5,
                transparent: true, opacity: 0.4
            })
        );
        cellWindow.position.set(0, -0.18, 0.09);
        this.add(cellWindow);

        // === STABILIZER FINS ===
        for (let side of [-1, 1]) {
            const fin = new THREE.Mesh(
                new THREE.BoxGeometry(0.02, 0.12, 0.3),
                this.frameMat
            );
            fin.position.set(0.18 * side, 0.0, 0.8);
            this.add(fin);
        }

        // === MUZZLE (Emitter tip) ===
        const emitterTip = new THREE.Mesh(
            new THREE.ConeGeometry(0.05, 0.15, 12),
            this.conduitMat
        );
        emitterTip.rotation.x = -Math.PI / 2;
        emitterTip.position.set(0, 0.06, -1.75);
        this.add(emitterTip);

        // Muzzle light
        this.muzzleLight = new THREE.PointLight(0xaa44ff, 0, 6);
        this.muzzleLight.position.set(0, 0.06, -1.85);
        this.add(this.muzzleLight);
    }

    fire() {
        this.gunPitch = 0.25;
        this.gunZ = 0.15;
        this.lightIntensity = 5.0;
        this.prongSpread = 1.0;
        this.pulseWave = 1.0;
        this.orbRotSpeed = 8.0;

        this.playProceduralShot();
    }

    playProceduralShot() {
        if (!window.audioCtx) window.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const ctx = window.audioCtx;
        if (ctx.state === 'suspended') ctx.resume();

        const t = ctx.currentTime;

        // Layer 1: Reverse suction whoosh
        const osc1 = ctx.createOscillator();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(40, t);
        osc1.frequency.exponentialRampToValueAtTime(200, t + 0.15);
        osc1.frequency.exponentialRampToValueAtTime(30, t + 0.4);
        const g1 = ctx.createGain();
        g1.gain.setValueAtTime(0.1, t);
        g1.gain.linearRampToValueAtTime(0.5, t + 0.1);
        g1.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
        osc1.connect(g1); g1.connect(ctx.destination);
        osc1.start(t); osc1.stop(t + 0.55);

        // Layer 2: Deep bass drop
        const osc2 = ctx.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(120, t + 0.1);
        osc2.frequency.exponentialRampToValueAtTime(20, t + 0.5);
        const g2 = ctx.createGain();
        g2.gain.setValueAtTime(0.6, t + 0.1);
        g2.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
        osc2.connect(g2); g2.connect(ctx.destination);
        osc2.start(t + 0.1); osc2.stop(t + 0.65);

        // Layer 3: Ethereal shimmer
        const osc3 = ctx.createOscillator();
        osc3.type = 'triangle';
        osc3.frequency.setValueAtTime(600, t);
        osc3.frequency.exponentialRampToValueAtTime(1200, t + 0.2);
        osc3.frequency.exponentialRampToValueAtTime(400, t + 0.4);
        const g3 = ctx.createGain();
        g3.gain.setValueAtTime(0.08, t);
        g3.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
        osc3.connect(g3); g3.connect(ctx.destination);
        osc3.start(t); osc3.stop(t + 0.5);
    }

    update(dt) {
        const time = Date.now() * 0.001;

        this.gunPitch += (0 - this.gunPitch) * 8 * dt;
        this.gunZ += (0 - this.gunZ) * 8 * dt;
        this.lightIntensity = Math.max(0, this.lightIntensity - 12 * dt);
        this.muzzleLight.intensity = this.lightIntensity;

        // Prong spread decay
        this.prongSpread = Math.max(0, this.prongSpread - dt * 2.0);
        this.pulseWave = Math.max(0, this.pulseWave - dt * 1.5);
        this.orbRotSpeed += (1.0 - this.orbRotSpeed) * 3 * dt;

        // Prong arm animation
        const spreadAmount = this.prongSpread * 0.08;
        this.prongLeft.position.x = -spreadAmount;
        this.prongRight.position.x = spreadAmount;
        this.prongLeft.rotation.z = this.prongSpread * 0.1;
        this.prongRight.rotation.z = -this.prongSpread * 0.1;

        // Energy orb rotation + bob
        if (this.energyOrb) {
            this.energyOrb.rotation.x += dt * this.orbRotSpeed;
            this.energyOrb.rotation.y += dt * this.orbRotSpeed * 0.7;
            this.energyOrb.rotation.z += dt * this.orbRotSpeed * 0.5;

            const basePulse = 2.0 + Math.sin(time * 3) * 0.6;
            this.energyOrb.material.emissiveIntensity = basePulse + this.pulseWave * 4.0;
            this.energyOrb.scale.setScalar(1.0 + Math.sin(time * 4) * 0.05 + this.pulseWave * 0.4);
        }

        // Glow sphere pulse
        if (this.glowSphere) {
            this.glowSphere.rotation.x -= dt * 0.5;
            this.glowSphere.rotation.y -= dt * 0.3;
            this.glowSphere.material.opacity = 0.2 + Math.sin(time * 2.5) * 0.08 + this.pulseWave * 0.3;
            this.glowSphere.scale.setScalar(1.0 + Math.sin(time * 2) * 0.05 + this.pulseWave * 0.3);
        }

        // Orb bob
        this.orbGroup.position.y = 0.06 + Math.sin(time * 2) * 0.015;

        // Orb light
        if (this.orbLight) {
            this.orbLight.intensity = 1.0 + Math.sin(time * 3) * 0.4 + this.pulseWave * 3.0;
        }

        // Orbiting micro-particles
        this.orbiters.forEach(o => {
            const angle = time * o.speed + o.phase;
            o.mesh.position.x = Math.cos(angle) * o.radius;
            o.mesh.position.y = Math.sin(angle) * o.radius * Math.cos(o.tilt);
            o.mesh.position.z = Math.sin(angle) * o.radius * Math.sin(o.tilt);
        });

        // Lens ring counter-rotation
        this.lensRings.forEach(lr => {
            if (lr.axis === 'x') {
                lr.mesh.rotation.x += dt * lr.speed * (1 + this.pulseWave * 3);
            } else {
                lr.mesh.rotation.z += dt * lr.speed * (1 + this.pulseWave * 3);
            }
        });
    }
}

window.GravSingularity = GravSingularity;
