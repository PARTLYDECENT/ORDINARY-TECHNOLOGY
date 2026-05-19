/**
 * AssaultRifle — Upgraded High-Fidelity Procedural M4/SCAR-Style Tactical Rifle
 * Features: Dual-tone FDE polymer & anodized black metal styling, hollow receiver chamber
 * with golden dummy round, reciprocating side bolt handle, physical ground-bouncing
 * shell ejection, smoke particles, and Web Audio spatialised casing impact SFX.
 */
class AssaultRifle extends THREE.Group {
    constructor() {
        super();
        this.name = "procedural_assault_rifle";

        // Animation states
        this.boltZ = 0;
        this.gunPitch = 0;
        this.gunZ = 0;
        this.triggerRot = 0;
        this.lightIntensity = 0;
        this.chargingHandleZ = 0;
        this.dustCoverRot = 0; 

        // Particle pools
        this.shells = [];

        // --- MATERIA DESIGN SYSTEM MATERIALS ---
        // Anodized gunmetal/black receiver
        this.receiverMat = new THREE.MeshStandardMaterial({
            color: 0x141619, roughness: 0.3, metalness: 0.85
        });
        // Picatinny rails and heatguards
        this.railMat = new THREE.MeshStandardMaterial({
            color: 0x1c1f24, roughness: 0.45, metalness: 0.75
        });
        // Parkerized heavy steel barrel
        this.barrelMat = new THREE.MeshStandardMaterial({
            color: 0x22262d, roughness: 0.4, metalness: 0.9
        });
        // Flat Dark Earth (FDE) tactical polymer accents
        this.fdeMat = new THREE.MeshStandardMaterial({
            color: 0x7d6c55, roughness: 0.8, metalness: 0.05
        });
        // Durable black polymer
        this.polyMat = new THREE.MeshStandardMaterial({
            color: 0x090a0d, roughness: 0.75, metalness: 0.1
        });
        // Polished chrome bolt carrier group
        this.boltMat = new THREE.MeshStandardMaterial({
            color: 0xeef2f6, roughness: 0.08, metalness: 0.98
        });
        // Polished gold cartridge brass
        this.bulletMat = new THREE.MeshStandardMaterial({
            color: 0xd4af37, metalness: 0.9, roughness: 0.15
        });
        // Tactical blue LED accent
        this.accentMat = new THREE.MeshStandardMaterial({
            color: 0x00aaff, emissive: 0x00aaff, emissiveIntensity: 0.4, roughness: 0.3, metalness: 0.9
        });
        this.sightDotMat = new THREE.MeshBasicMaterial({ color: 0x00ff44 });

        this.hasFired = false;
        this.buildRifle();
    }

    buildRifle() {
        // === UPPER RECEIVER ASSEMBLY ===
        this.upperGroup = new THREE.Group();
        this.add(this.upperGroup);

        // Main upper receiver body
        const upperGeo = new THREE.BoxGeometry(0.28, 0.26, 1.5);
        const upper = new THREE.Mesh(upperGeo, this.receiverMat);
        upper.position.set(0, 0.2, -0.1);
        upper.castShadow = true;
        this.upperGroup.add(upper);

        // Receiver side details (layered metal look)
        const leftPlate = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.18, 1.3), this.receiverMat);
        leftPlate.position.set(-0.145, 0.2, -0.1);
        this.upperGroup.add(leftPlate);

        // Hollow Chamber Cavity Box (Behind ejection port)
        const chamberCav = new THREE.Mesh(
            new THREE.BoxGeometry(0.16, 0.14, 0.45),
            new THREE.MeshStandardMaterial({ color: 0x070707, roughness: 0.95, metalness: 0.0 })
        );
        chamberCav.position.set(0.06, 0.2, 0.05);
        this.upperGroup.add(chamberCav);

        // Chambered Golden dummy round (visible when bolt is retracted)
        this.chamberRound = new THREE.Mesh(
            new THREE.CylinderGeometry(0.026, 0.026, 0.16, 8),
            this.bulletMat
        );
        this.chamberRound.rotation.x = Math.PI / 2;
        this.chamberRound.position.set(0.06, 0.2, 0.02);
        this.upperGroup.add(this.chamberRound);

        // Flat top Picatinny rail
        const topRailGeo = new THREE.BoxGeometry(0.22, 0.04, 1.4);
        const topRail = new THREE.Mesh(topRailGeo, this.railMat);
        topRail.position.set(0, 0.35, -0.15);
        this.upperGroup.add(topRail);

        // Rail teeth notches
        for (let i = 0; i < 18; i++) {
            const tooth = new THREE.Mesh(
                new THREE.BoxGeometry(0.23, 0.015, 0.02),
                this.railMat
            );
            tooth.position.set(0, 0.365, -0.8 + i * 0.075);
            this.upperGroup.add(tooth);
        }

        // FDE Polymer ejection port dust cover (opens on first fire)
        this.dustCover = new THREE.Mesh(
            new THREE.BoxGeometry(0.02, 0.1, 0.32),
            this.fdeMat
        );
        this.dustCover.position.set(0.145, 0.22, -0.05);
        this.upperGroup.add(this.dustCover);

        // Forward assist knob
        const fwdAssist = new THREE.Mesh(
            new THREE.CylinderGeometry(0.03, 0.03, 0.06, 8),
            this.receiverMat
        );
        fwdAssist.rotation.z = Math.PI / 2;
        fwdAssist.position.set(0.17, 0.28, 0.2);
        this.upperGroup.add(fwdAssist);

        // === BOLT CARRIER GROUP (Chrome & Reciprocating Charging Handle) ===
        this.boltGroup = new THREE.Group();
        this.upperGroup.add(this.boltGroup);

        // Chrome bolt body
        const boltGeo = new THREE.BoxGeometry(0.14, 0.1, 0.58);
        const bolt = new THREE.Mesh(boltGeo, this.boltMat);
        bolt.position.set(0.05, 0.2, 0.1);
        this.boltGroup.add(bolt);

        // Reciprocating bolt handle (protrudes from ejection port)
        const chHandleGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.16, 8);
        this.chHandle = new THREE.Mesh(chHandleGeo, this.receiverMat);
        this.chHandle.rotation.z = Math.PI / 2;
        this.chHandle.position.set(0.18, 0.22, 0.2);
        this.boltGroup.add(this.chHandle);

        // === BARREL ASSEMBLY ===
        const barrelGeo = new THREE.CylinderGeometry(0.045, 0.045, 2.6, 16);
        const barrel = new THREE.Mesh(barrelGeo, this.barrelMat);
        barrel.rotation.x = Math.PI / 2;
        barrel.position.set(0, 0.22, -2.1);
        barrel.castShadow = true;
        this.add(barrel);

        // Gas tube
        const gasTubeGeo = new THREE.CylinderGeometry(0.012, 0.012, 1.4, 8);
        const gasTube = new THREE.Mesh(gasTubeGeo, this.barrelMat);
        gasTube.rotation.x = Math.PI / 2;
        gasTube.position.set(0, 0.32, -1.4);
        this.add(gasTube);

        // Gas block
        const gasBlock = new THREE.Mesh(
            new THREE.BoxGeometry(0.12, 0.18, 0.08),
            this.receiverMat
        );
        gasBlock.position.set(0, 0.3, -2.2);
        this.add(gasBlock);

        // Front sight post
        const fSightPost = new THREE.Mesh(
            new THREE.BoxGeometry(0.02, 0.14, 0.02),
            this.receiverMat
        );
        fSightPost.position.set(0, 0.44, -2.2);
        this.add(fSightPost);

        // Tactical muzzle brake with porting holes
        const muzzleGeo = new THREE.CylinderGeometry(0.06, 0.055, 0.2, 12);
        const muzzle = new THREE.Mesh(muzzleGeo, this.barrelMat);
        muzzle.rotation.x = Math.PI / 2;
        muzzle.position.set(0, 0.22, -3.5);
        this.add(muzzle);

        // Muzzle brake gas slots
        for (let i = 0; i < 4; i++) {
            const slot = new THREE.Mesh(
                new THREE.BoxGeometry(0.08, 0.015, 0.03),
                new THREE.MeshBasicMaterial({ color: 0x000000 })
            );
            slot.position.set(0, 0.22 + (i < 2 ? 0.04 : -0.04), -3.42 - i * 0.04);
            slot.rotation.z = (i % 2) * Math.PI / 2;
            this.add(slot);
        }

        // === HANDGUARD / RAIL SYSTEM (FDE Polymer & Anodized Rails) ===
        const handguardGroup = new THREE.Group();
        this.add(handguardGroup);

        // Main tactical handguard tube
        const hgGeo = new THREE.BoxGeometry(0.3, 0.28, 1.4);
        const hg = new THREE.Mesh(hgGeo, this.fdeMat);
        hg.position.set(0, 0.16, -1.55);
        handguardGroup.add(hg);

        // Picatinny rails (left & right)
        for (let side of [-1, 1]) {
            const sideRail = new THREE.Mesh(
                new THREE.BoxGeometry(0.04, 0.06, 1.3),
                this.railMat
            );
            sideRail.position.set(0.17 * side, 0.16, -1.55);
            handguardGroup.add(sideRail);
        }

        // Bottom Picatinny rail
        const bottomRail = new THREE.Mesh(
            new THREE.BoxGeometry(0.12, 0.04, 1.3),
            this.railMat
        );
        bottomRail.position.set(0, 0.0, -1.55);
        handguardGroup.add(bottomRail);

        // Handguard ventilation slots
        for (let i = 0; i < 5; i++) {
            for (let side of [-1, 1]) {
                const vent = new THREE.Mesh(
                    new THREE.BoxGeometry(0.05, 0.08, 0.12),
                    new THREE.MeshBasicMaterial({ color: 0x050505 })
                );
                vent.position.set(0.15 * side, 0.16, -1.0 - i * 0.25);
                handguardGroup.add(vent);
            }
        }

        // PEQ-15 Tactical Laser Box (Mounted on top rail)
        const peqBox = new THREE.Mesh(
            new THREE.BoxGeometry(0.12, 0.08, 0.24),
            this.fdeMat
        );
        peqBox.position.set(0, 0.41, -1.1);
        this.add(peqBox);

        const peqLens = new THREE.Mesh(
            new THREE.CylinderGeometry(0.02, 0.02, 0.02, 8),
            new THREE.MeshBasicMaterial({ color: 0x00aaff })
        );
        peqLens.rotation.x = Math.PI / 2;
        peqLens.position.set(0.03, 0.41, -1.22);
        this.add(peqLens);

        // Angled Tactical Foregrip (Bottom rail)
        const foregripGeo = new THREE.BoxGeometry(0.1, 0.24, 0.18);
        const foregrip = new THREE.Mesh(foregripGeo, this.fdeMat);
        foregrip.position.set(0, -0.15, -1.4);
        foregrip.rotation.x = -Math.PI * 0.12;
        this.add(foregrip);

        // === LOWER RECEIVER ===
        const lowerGroup = new THREE.Group();
        this.add(lowerGroup);

        const lowerGeo = new THREE.BoxGeometry(0.26, 0.18, 0.9);
        const lower = new THREE.Mesh(lowerGeo, this.receiverMat);
        lower.position.set(0, 0.02, 0.15);
        lower.castShadow = true;
        lowerGroup.add(lower);

        // Magazine well flare
        const magWellGeo = new THREE.BoxGeometry(0.22, 0.06, 0.3);
        const magWell = new THREE.Mesh(magWellGeo, this.receiverMat);
        magWell.position.set(0, -0.07, 0.0);
        lowerGroup.add(magWell);

        // Trigger guard
        const guardOuter = new THREE.Mesh(
            new THREE.BoxGeometry(0.06, 0.22, 0.28),
            this.receiverMat
        );
        guardOuter.position.set(0, -0.15, 0.18);
        lowerGroup.add(guardOuter);

        const guardInner = new THREE.Mesh(
            new THREE.BoxGeometry(0.07, 0.16, 0.22),
            new THREE.MeshBasicMaterial({ color: 0x000000 })
        );
        guardInner.position.set(0, -0.13, 0.18);
        lowerGroup.add(guardInner);

        // Trigger
        this.triggerMesh = new THREE.Mesh(
            new THREE.BoxGeometry(0.03, 0.12, 0.03),
            new THREE.MeshStandardMaterial({ color: 0x0b0c0e })
        );
        this.triggerMesh.position.set(0, -0.1, 0.15);
        lowerGroup.add(this.triggerMesh);

        // Selector switch
        const selector = new THREE.Mesh(
            new THREE.CylinderGeometry(0.025, 0.025, 0.04, 8),
            this.receiverMat
        );
        selector.rotation.z = Math.PI / 2;
        selector.position.set(-0.15, 0.06, 0.3);
        lowerGroup.add(selector);

        // Mag release button
        const magRelease = new THREE.Mesh(
            new THREE.BoxGeometry(0.04, 0.06, 0.04),
            this.receiverMat
        );
        magRelease.position.set(0.14, 0.0, 0.05);
        lowerGroup.add(magRelease);

        // === PISTOL GRIP (FDE Polymer) ===
        const gripGeo = new THREE.BoxGeometry(0.22, 0.9, 0.4);
        const grip = new THREE.Mesh(gripGeo, this.fdeMat);
        grip.position.set(0, -0.55, 0.42);
        grip.rotation.x = Math.PI * 0.12;
        grip.castShadow = true;
        this.add(grip);

        // Grip ridges
        for (let i = 0; i < 6; i++) {
            const ridge = new THREE.Mesh(
                new THREE.BoxGeometry(0.24, 0.015, 0.38),
                this.fdeMat
            );
            ridge.position.set(0, -0.3 - i * 0.1, 0.42);
            ridge.rotation.x = Math.PI * 0.12;
            this.add(ridge);
        }

        // Grip cap
        const gripCap = new THREE.Mesh(
            new THREE.BoxGeometry(0.18, 0.04, 0.3),
            this.receiverMat
        );
        gripCap.position.set(0, -1.0, 0.52);
        gripCap.rotation.x = Math.PI * 0.12;
        this.add(gripCap);

        // === MAGAZINE (FDE Polymer PMAG Style) ===
        this.magGroup = new THREE.Group();
        this.add(this.magGroup);

        const magBodyGeo = new THREE.BoxGeometry(0.16, 0.9, 0.3);
        const magBody = new THREE.Mesh(magBodyGeo, this.fdeMat);
        magBody.position.set(0, -0.55, 0.0);
        magBody.rotation.x = Math.PI * 0.02;
        this.magGroup.add(magBody);

        // Black floor plate
        const magFloor = new THREE.Mesh(
            new THREE.BoxGeometry(0.17, 0.03, 0.32),
            this.receiverMat
        );
        magFloor.position.set(0, -1.0, 0.0);
        this.magGroup.add(magFloor);

        // Bullets visible inside mag witness slots
        for (let i = 0; i < 3; i++) {
            const bulletInMag = new THREE.Mesh(
                new THREE.CylinderGeometry(0.015, 0.015, 0.05, 8),
                this.bulletMat
            );
            bulletInMag.rotation.x = Math.PI / 2;
            bulletInMag.position.set(-0.065, -0.35 - i * 0.2, 0.0);
            this.magGroup.add(bulletInMag);
        }

        // === COLLAPSIBLE STOCK (FDE Stock on Black Buffer Tube) ===
        const stockGroup = new THREE.Group();
        this.add(stockGroup);

        // Black metal buffer tube
        const bufferGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.0, 12);
        const buffer = new THREE.Mesh(bufferGeo, this.receiverMat);
        buffer.rotation.x = Math.PI / 2;
        buffer.position.set(0, 0.18, 1.1);
        stockGroup.add(buffer);

        // FDE stock body
        const stockBodyGeo = new THREE.BoxGeometry(0.2, 0.28, 0.5);
        const stockBody = new THREE.Mesh(stockBodyGeo, this.fdeMat);
        stockBody.position.set(0, 0.16, 1.4);
        stockGroup.add(stockBody);

        // Black rubber buttpad
        const buttpad = new THREE.Mesh(
            new THREE.BoxGeometry(0.18, 0.26, 0.04),
            new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.95 })
        );
        buttpad.position.set(0, 0.16, 1.66);
        stockGroup.add(buttpad);

        // FDE cheek riser
        const cheekWeld = new THREE.Mesh(
            new THREE.BoxGeometry(0.16, 0.06, 0.3),
            this.fdeMat
        );
        cheekWeld.position.set(0, 0.32, 1.35);
        stockGroup.add(cheekWeld);

        // QD sling mount
        const slingMount = new THREE.Mesh(
            new THREE.TorusGeometry(0.03, 0.008, 8, 16),
            this.receiverMat
        );
        slingMount.position.set(-0.12, 0.1, 1.55);
        stockGroup.add(slingMount);

        // === OPTIC ASSEMBLY ===
        const sightBase = new THREE.Mesh(
            new THREE.BoxGeometry(0.18, 0.1, 0.18),
            this.receiverMat
        );
        sightBase.position.set(0, 0.4, -0.15);
        this.add(sightBase);

        const sightWindow = new THREE.Mesh(
            new THREE.BoxGeometry(0.14, 0.14, 0.12),
            new THREE.MeshStandardMaterial({
                color: 0x112233, transparent: true, opacity: 0.3, roughness: 0.1, metalness: 0.9
            })
        );
        sightWindow.position.set(0, 0.48, -0.15);
        this.add(sightWindow);

        // Aim Reticle
        const reticle = new THREE.Mesh(
            new THREE.SphereGeometry(0.008, 8, 8),
            this.sightDotMat
        );
        reticle.position.set(0, 0.48, -0.15);
        this.add(reticle);

        // === MUZZLE DYNAMIC POINTLIGHT ===
        this.muzzleLight = new THREE.PointLight(0x00aaff, 0, 6);
        this.muzzleLight.position.set(0, 0.22, -3.6);
        this.add(this.muzzleLight);

        // === BLUE LED STRIP ===
        const ledStrip = new THREE.Mesh(
            new THREE.BoxGeometry(0.02, 0.02, 1.0),
            this.accentMat
        );
        ledStrip.position.set(0.16, 0.0, -1.55);
        this.add(ledStrip);
    }

    fire() {
        // High-speed visual action values
        this.boltZ = 0.48; // bolt slams back exposing gold dummy cartridge
        this.gunPitch = 0.22; // Snappy visual muzzle climb
        this.gunZ = 0.16; // Mechanical gun receiver recoil back
        this.triggerRot = 0.25;
        this.lightIntensity = 3.0;

        if (!this.hasFired) {
            this.hasFired = true;
            this.dustCoverRot = -Math.PI * 0.55; // Open dust cover smoothly past 90 degrees
        }

        // Spawn physical ground-bouncing shell
        this.spawnShell();
        
        // Spawn a warm-grey mechanical smoke puff from the opening Ejection Port
        this.spawnPortSmoke();

        // Synth Web Audio firing shot
        this.playProceduralShot();
    }

    spawnPortSmoke() {
        if (typeof window.emitParticle !== 'function') return;

        // Calculate ejection port position in world space
        const portPos = new THREE.Vector3(0.16, 0.22, -0.05);
        portPos.applyMatrix4(this.matrixWorld);

        // Eject warm gunpowder gas sideways/upward
        const rightDir = new THREE.Vector3(1, 0.15, -0.2).applyQuaternion(this.quaternion).normalize();
        for (let i = 0; i < 2; i++) {
            window.emitParticle(
                portPos.x, portPos.y, portPos.z,
                rightDir.x * (1.2 + Math.random()) + (Math.random() - 0.5) * 0.2,
                rightDir.y * 1.2 + 0.4 + Math.random() * 0.4,
                rightDir.z * (1.2 + Math.random()) + (Math.random() - 0.5) * 0.2,
                0.32, 0.29, 0.27, // warm grey gas
                5 + Math.random() * 3, // size
                0.3 + Math.random() * 0.2 // life
            );
        }
    }

    spawnShell() {
        const shellGeo = new THREE.CylinderGeometry(0.025, 0.02, 0.14, 8);
        const shell = new THREE.Mesh(shellGeo, this.brassMat);

        // Ejection port starting coordinates
        const worldPos = new THREE.Vector3(0.16, 0.22, -0.05);
        worldPos.applyMatrix4(this.matrixWorld);
        shell.position.copy(worldPos);
        shell.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);

        // Find the absolute Scene root node so the shell is isolated from player movement
        let rootScene = window.scene;
        if (!rootScene && this.parent) {
            let curr = this.parent;
            while (curr.parent) {
                curr = curr.parent;
            }
            if (curr.type === "Scene") rootScene = curr;
        }

        if (rootScene) {
            rootScene.add(shell);
        } else if (this.parent) {
            this.parent.add(shell);
        }

        // Calculate ejection velocity relative to current weapon orientation
        const rightDir = new THREE.Vector3(1, 0, 0).applyQuaternion(this.quaternion).normalize();
        const upDir = new THREE.Vector3(0, 1, 0).applyQuaternion(this.quaternion).normalize();
        const fwdDir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.quaternion).normalize();

        const speedRight = 4.2 + Math.random() * 1.8;
        const speedUp = 2.4 + Math.random() * 1.2;
        const speedFwd = -1.0 + (Math.random() - 0.5) * 0.5; // slight backward inertia

        const vx = rightDir.x * speedRight + upDir.x * speedUp + fwdDir.x * speedFwd;
        const vy = rightDir.y * speedRight + upDir.y * speedUp + fwdDir.y * speedFwd;
        const vz = rightDir.z * speedRight + upDir.z * speedUp + fwdDir.z * speedFwd;

        this.shells.push({
            mesh: shell,
            vx: vx,
            vy: vy,
            vz: vz,
            rx: (Math.random() - 0.5) * 22,
            ry: (Math.random() - 0.5) * 22,
            rz: (Math.random() - 0.5) * 22,
            life: 1.4 // Casing lingers a bit longer to roll
        });
    }

    playCasingClink(pos) {
        try {
            if (!window.audioCtx) window.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const ctx = window.audioCtx;
            if (ctx.state === 'suspended') ctx.resume();

            // Spatialised volume check relative to active camera
            let volume = 0.22;
            if (window.camera) {
                const dist = pos.distanceTo(window.camera.position);
                volume = Math.max(0.01, 0.22 * (1.0 - Math.min(dist / 18.0, 1.0)));
            }

            const t = ctx.currentTime;
            const osc1 = ctx.createOscillator();
            const osc2 = ctx.createOscillator();
            const gainNode = ctx.createGain();

            // High metallic ringing resonance
            osc1.type = 'triangle';
            osc1.frequency.setValueAtTime(2600 + Math.random() * 400, t);

            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(3400 + Math.random() * 400, t);

            gainNode.gain.setValueAtTime(volume, t);
            gainNode.gain.exponentialRampToValueAtTime(0.001, t + 0.07 + Math.random() * 0.05);

            const filter = ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(3000, t);
            filter.Q.setValueAtTime(2.2, t);

            osc1.connect(filter);
            osc2.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(ctx.destination);

            osc1.start(t); osc1.stop(t + 0.16);
            osc2.start(t); osc2.stop(t + 0.16);
        } catch (e) {
            // Audio execution safe fallback
        }
    }

    playProceduralShot() {
        if (!window.audioCtx) window.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const ctx = window.audioCtx;
        if (ctx.state === 'suspended') ctx.resume();

        const t = ctx.currentTime;

        // Layer 1: Supersonic crack
        const osc1 = ctx.createOscillator();
        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(2200, t);
        osc1.frequency.exponentialRampToValueAtTime(120, t + 0.018);
        const g1 = ctx.createGain();
        g1.gain.setValueAtTime(0.28, t);
        g1.gain.exponentialRampToValueAtTime(0.001, t + 0.035);
        osc1.connect(g1); g1.connect(ctx.destination);
        osc1.start(t); osc1.stop(t + 0.05);

        // Layer 2: Sub-bass punch
        const osc2 = ctx.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(80, t);
        osc2.frequency.exponentialRampToValueAtTime(35, t + 0.06);
        const g2 = ctx.createGain();
        g2.gain.setValueAtTime(0.3, t);
        g2.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
        osc2.connect(g2); g2.connect(ctx.destination);
        osc2.start(t); osc2.stop(t + 0.08);

        // Layer 3: Noise powder burst
        const bufLen = ctx.sampleRate * 0.03;
        const noiseBuf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
        const data = noiseBuf.getChannelData(0);
        for (let i = 0; i < bufLen; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufLen * 0.12));
        const noise = ctx.createBufferSource();
        noise.buffer = noiseBuf;
        const nGain = ctx.createGain();
        nGain.gain.setValueAtTime(0.18, t);
        nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
        const nFilter = ctx.createBiquadFilter();
        nFilter.type = 'bandpass';
        nFilter.frequency.value = 3500;
        nFilter.Q.value = 0.6;
        noise.connect(nFilter);
        nFilter.connect(nGain);
        nGain.connect(ctx.destination);
        noise.start(t); noise.stop(t + 0.04);

        // Layer 4: Metal reciprocating bolt return click
        const bolt = ctx.createOscillator();
        bolt.type = 'square';
        bolt.frequency.setValueAtTime(1200, t + 0.04);
        bolt.frequency.exponentialRampToValueAtTime(400, t + 0.055);
        const bGain = ctx.createGain();
        bGain.gain.setValueAtTime(0.06, t + 0.04);
        bGain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
        bolt.connect(bGain); bGain.connect(ctx.destination);
        bolt.start(t + 0.04); bolt.stop(t + 0.07);
    }

    update(dt) {
        // Reciprocating mechanical action returns
        this.boltZ += (0 - this.boltZ) * 26 * dt;
        this.gunPitch += (0 - this.gunPitch) * 20 * dt;
        this.gunZ += (0 - this.gunZ) * 20 * dt;
        this.triggerRot += (0 - this.triggerRot) * 22 * dt;
        this.lightIntensity = Math.max(0, this.lightIntensity - 45 * dt);

        this.boltGroup.position.z = this.boltZ;
        this.triggerMesh.rotation.x = this.triggerRot;
        this.muzzleLight.intensity = this.lightIntensity;

        // Dust cover spring open animation
        if (this.hasFired) {
            this.dustCover.rotation.x += (this.dustCoverRot - this.dustCover.rotation.x) * 12 * dt;
        }

        // Blue LED indicator pulse
        if (this.accentMat) {
            this.accentMat.emissiveIntensity = 0.3 + Math.sin(Date.now() * 0.005) * 0.15;
        }

        // Realistic 3D ground-bouncing shell physics simulation
        for (let i = this.shells.length - 1; i >= 0; i--) {
            const s = this.shells[i];
            
            // Apply real-world gravity
            s.vy -= 9.81 * dt;
            
            s.mesh.position.x += s.vx * dt;
            s.mesh.position.y += s.vy * dt;
            s.mesh.position.z += s.vz * dt;
            
            s.mesh.rotation.x += s.rx * dt;
            s.mesh.rotation.y += s.ry * dt;
            s.mesh.rotation.z += s.rz * dt;

            // Spawn wispy hot gunpowder smoke trails from casing in flight
            if (s.life > 0.9 && typeof window.emitParticle === 'function' && Math.random() < 0.28) {
                window.emitParticle(
                    s.mesh.position.x, s.mesh.position.y, s.mesh.position.z,
                    (Math.random() - 0.5) * 0.1, 0.3 + Math.random() * 0.2, (Math.random() - 0.5) * 0.1,
                    0.55, 0.55, 0.55, // light grey wispy smoke
                    1.2 + Math.random() * 1.2,
                    0.25 + Math.random() * 0.2
                );
            }

            // High-fidelity terrain collision tracking
            let groundY = -2.0; 
            if (window.TerrainGen && typeof window.TerrainGen.getHeight === 'function') {
                groundY = window.TerrainGen.getHeight(s.mesh.position.x, s.mesh.position.z);
            }

            if (s.mesh.position.y <= groundY) {
                s.mesh.position.y = groundY;
                
                // If the impact has high speed, bounce!
                if (s.vy < -0.6) {
                    s.vy = -s.vy * 0.48; // Bouncing coefficient of restitution
                    s.vx *= 0.55;        // Ground friction dampening
                    s.vz *= 0.55;
                    
                    // Trigger spin tumble variation on collision
                    s.rx = (Math.random() - 0.5) * 12;
                    s.ry = (Math.random() - 0.5) * 12;
                    s.rz = (Math.random() - 0.5) * 12;

                    // Play spatialized metallic clink
                    this.playCasingClink(s.mesh.position);
                } else {
                    // Slide and roll to a clean halt
                    s.vy = 0;
                    s.vx *= 0.85 * (1 - dt * 6);
                    s.vz *= 0.85 * (1 - dt * 6);
                    s.rx *= 0.8 * (1 - dt * 6);
                    s.ry *= 0.8 * (1 - dt * 6);
                    s.rz *= 0.8 * (1 - dt * 6);
                }
            }

            s.life -= dt;
            if (s.life <= 0) {
                if (s.mesh.parent) s.mesh.parent.remove(s.mesh);
                this.shells.splice(i, 1);
            }
        }
    }
}

window.AssaultRifle = AssaultRifle;
