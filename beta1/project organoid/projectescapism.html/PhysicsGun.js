/**
 * Procedural Physics Gravity Gun Component - Hyper-Premium Electromagnetic Manipulator
 * Procedurally designs a futuristic gravity manipulator weapon in Three.js.
 * Features:
 * - Rotating front emitter rings (concentric rings that spin dynamically).
 * - Glowing induction coils pulsing with cyan/blue energy.
 * - Back-mounted holographic display screen displaying simulated reactor power.
 * - Glowing status indicator LEDs.
 * - Dynamic cooling vent exhaust rings.
 */
class PhysicsGun extends THREE.Group {
    constructor() {
        super();
        this.name = "procedural_physics_gravity_gun";

        // Animation states
        this.ringRotationOuter = 0;
        this.ringRotationMiddle = 0;
        this.ringRotationInner = 0;
        this.triggerZ = -0.05;
        this.glowIntensity = 1.0;
        this.fireAnim = 0;

        // Custom materials
        this.initMaterials();
        this.buildGravityGun();
    }

    initMaterials() {
        // High-tech graphite metal
        this.chassisMat = new THREE.MeshStandardMaterial({
            color: 0x181a1f,
            roughness: 0.35,
            metalness: 0.9
        });

        // Matte black polymer grip
        this.polymerMat = new THREE.MeshStandardMaterial({
            color: 0x0c0d0e,
            roughness: 0.6,
            metalness: 0.2
        });

        // Glowing electromagnetic elements
        this.glowMat = new THREE.MeshStandardMaterial({
            color: 0x00f3ff,
            emissive: 0x00a8ff,
            emissiveIntensity: 3.0,
            roughness: 0.1,
            metalness: 0.9,
            transparent: true
        });

        // Bright Core glow
        this.coreMat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true
        });

        // Shiny brass connectors
        this.goldMat = new THREE.MeshStandardMaterial({
            color: 0xf3ca40,
            roughness: 0.2,
            metalness: 0.9
        });

        // Chrome accents
        this.chromeMat = new THREE.MeshStandardMaterial({
            color: 0xdde2eb,
            roughness: 0.1,
            metalness: 0.95
        });

        // Holographic green readout
        this.screenMat = new THREE.MeshBasicMaterial({
            color: 0x00ffaa
        });
    }

    buildGravityGun() {
        // --- MAIN RECEIVER ---
        const receiver = new THREE.Mesh(
            new THREE.BoxGeometry(0.16, 0.18, 0.8),
            this.chassisMat
        );
        receiver.position.set(0, 0, 0);
        receiver.castShadow = true;
        this.add(receiver);

        // --- UPPER STABILIZER BAR ---
        const stabilizer = new THREE.Mesh(
            new THREE.BoxGeometry(0.06, 0.04, 0.75),
            this.chromeMat
        );
        stabilizer.position.set(0, 0.11, -0.05);
        this.add(stabilizer);

        // --- EXHAUST VENTS / HEAT SINKS ---
        for (let i = 0; i < 4; i++) {
            const zPos = 0.2 - i * 0.15;
            const vent = new THREE.Mesh(
                new THREE.BoxGeometry(0.18, 0.14, 0.04),
                this.polymerMat
            );
            vent.position.set(0, 0.02, zPos);
            this.add(vent);

            const ventGlow = new THREE.Mesh(
                new THREE.BoxGeometry(0.182, 0.08, 0.01),
                this.glowMat
            );
            ventGlow.position.set(0, 0.02, zPos);
            this.add(ventGlow);
        }

        // --- GLOWING ENERGY CHAMBER (CENTER BARREL) ---
        const chamberOuter = new THREE.Mesh(
            new THREE.CylinderGeometry(0.07, 0.07, 0.5, 12, 1, true),
            this.chassisMat
        );
        chamberOuter.rotation.x = Math.PI / 2;
        chamberOuter.position.set(0, 0, -0.55);
        this.add(chamberOuter);

        // Inner glowing core
        this.energyCore = new THREE.Mesh(
            new THREE.CylinderGeometry(0.045, 0.045, 0.48, 16),
            this.glowMat
        );
        this.energyCore.rotation.x = Math.PI / 2;
        this.energyCore.position.set(0, 0, -0.55);
        this.add(this.energyCore);

        // Protective longitudinal bars surrounding core
        for (let a = 0; a < 4; a++) {
            const angle = (a / 4) * Math.PI * 2;
            const radius = 0.08;
            const bar = new THREE.Mesh(
                new THREE.CylinderGeometry(0.008, 0.008, 0.52, 6),
                this.chromeMat
            );
            bar.rotation.x = Math.PI / 2;
            bar.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, -0.55);
            this.add(bar);
        }

        // --- TRIPLE ROTATING EMITTER RINGS (FRONT MUZZLE) ---
        this.emitterGroup = new THREE.Group();
        this.emitterGroup.position.set(0, 0, -0.82);
        this.add(this.emitterGroup);

        // Outer Ring
        this.ringOuter = new THREE.Mesh(
            new THREE.TorusGeometry(0.11, 0.012, 8, 24),
            this.chassisMat
        );
        this.ringOuter.position.set(0, 0, 0.0);
        this.emitterGroup.add(this.ringOuter);

        // Outer Ring Spikes
        for (let j = 0; j < 3; j++) {
            const ang = (j / 3) * Math.PI * 2;
            const spike = new THREE.Mesh(
                new THREE.BoxGeometry(0.02, 0.04, 0.02),
                this.goldMat
            );
            spike.position.set(Math.cos(ang) * 0.12, Math.sin(ang) * 0.12, 0);
            spike.rotation.z = ang;
            this.ringOuter.add(spike);
        }

        // Middle Ring
        this.ringMiddle = new THREE.Mesh(
            new THREE.TorusGeometry(0.08, 0.01, 8, 20),
            this.chromeMat
        );
        this.ringMiddle.position.set(0, 0, -0.04);
        this.emitterGroup.add(this.ringMiddle);

        // Inner Ring
        this.ringInner = new THREE.Mesh(
            new THREE.TorusGeometry(0.05, 0.008, 8, 16),
            this.glowMat
        );
        this.ringInner.position.set(0, 0, -0.08);
        this.emitterGroup.add(this.ringInner);

        // Central emitter lens
        const lens = new THREE.Mesh(
            new THREE.CylinderGeometry(0.03, 0.03, 0.02, 12),
            this.coreMat
        );
        lens.rotation.x = Math.PI / 2;
        lens.position.set(0, 0, -0.09);
        this.emitterGroup.add(lens);

        // --- BACK SCREEN DISPLAY ---
        const screenBezel = new THREE.Mesh(
            new THREE.BoxGeometry(0.12, 0.10, 0.02),
            this.polymerMat
        );
        screenBezel.position.set(0, 0.04, 0.4);
        this.add(screenBezel);

        const screen = new THREE.Mesh(
            new THREE.PlaneGeometry(0.10, 0.08),
            this.screenMat
        );
        screen.position.set(0, 0.04, 0.411);
        this.add(screen);

        // Simulated bar segments on screen (Holographic details)
        const screenBarGroup = new THREE.Group();
        screenBarGroup.position.set(0, 0.04, 0.412);
        this.add(screenBarGroup);

        for (let s = 0; s < 4; s++) {
            const bar = new THREE.Mesh(
                new THREE.BoxGeometry(0.016, 0.04, 0.002),
                new THREE.MeshBasicMaterial({ color: 0x003311 })
            );
            bar.position.set(-0.03 + s * 0.02, -0.01, 0);
            screenBarGroup.add(bar);
        }

        // --- DYNAMIC STATUS LEDS ---
        this.statusLED = new THREE.Mesh(
            new THREE.SphereGeometry(0.008, 8, 8),
            new THREE.MeshBasicMaterial({ color: 0x00ffaa })
        );
        this.statusLED.position.set(-0.05, 0.07, 0.405);
        this.add(this.statusLED);

        // --- PISTOL GRIP & TRIGGER ---
        const grip = new THREE.Mesh(
            new THREE.BoxGeometry(0.06, 0.32, 0.08),
            this.polymerMat
        );
        grip.position.set(0, -0.19, 0.12);
        grip.rotation.x = 0.25; // Ergonomic forward tilt
        this.add(grip);

        // Guard
        const guard = new THREE.Mesh(
            new THREE.BoxGeometry(0.02, 0.12, 0.15),
            this.chassisMat
        );
        guard.position.set(0, -0.11, -0.06);
        this.add(guard);

        // Trigger
        this.triggerGroup = new THREE.Group();
        this.triggerGroup.position.set(0, -0.08, -0.05);
        this.add(this.triggerGroup);

        const triggerMesh = new THREE.Mesh(
            new THREE.BoxGeometry(0.01, 0.04, 0.015),
            this.chromeMat
        );
        triggerMesh.position.set(0, -0.01, 0.01);
        this.triggerGroup.add(triggerMesh);
    }

    fire() {
        this.fireAnim = 1.0;
        this.triggerZ = 0.01;
        this.glowIntensity = 5.0;
    }

    update(dt) {
        // Rotate the muzzle rings in opposite directions at different speeds
        this.ringRotationOuter += 1.2 * dt;
        this.ringRotationMiddle -= 2.0 * dt;
        this.ringRotationInner += 3.5 * dt;

        this.ringOuter.rotation.z = this.ringRotationOuter;
        this.ringMiddle.rotation.z = this.ringRotationMiddle;
        this.ringInner.rotation.z = this.ringRotationInner;

        // Reset trigger animation
        this.triggerZ += (-0.05 - this.triggerZ) * 16 * dt;
        this.triggerGroup.position.z = this.triggerZ;

        // Decaying fire animation
        this.fireAnim = Math.max(0.0, this.fireAnim - 6 * dt);
        
        // Emitter ring recoil pulse
        this.emitterGroup.position.z = -0.82 + this.fireAnim * 0.05;

        // Pulse the main electromagnetic core glow
        this.glowIntensity += (1.0 - this.glowIntensity) * 4 * dt;
        const currentGlow = this.glowIntensity + Math.sin(Date.now() * 0.015) * 0.2;
        this.glowMat.emissiveIntensity = currentGlow * 3.0;

        // Flash status LED when active/firing
        if (this.fireAnim > 0.05) {
            this.statusLED.material.color.setHex(0xff0055);
        } else {
            this.statusLED.material.color.setHex(0x00ffaa);
        }
    }
}
