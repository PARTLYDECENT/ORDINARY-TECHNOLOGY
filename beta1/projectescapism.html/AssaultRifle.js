/**
 * AssaultRifle — High-Fidelity Procedural M4/SCAR-Style Rifle
 * Features: Sleek skinnier chassis, physical guide rails containing the side action,
 * hollow upper receiver with ejection port, rotating multi-lug bolt locking action,
 * reciprocating tactical side charging handle, multi-rail system, collapsible stock,
 * barrel heat, and procedural audio.
 */
class AssaultRifle extends THREE.Group {
    constructor() {
        super();
        this.name = "procedural_assault_rifle";

        // Recoil & physical animation states
        this.boltZ = 0;
        this.gunPitch = 0;
        this.gunZ = 0;
        this.gunX = 0;
        this.triggerRot = 0;
        this.lightIntensity = 0;
        this.chargingHandleZ = 0;
        this.dustCoverRot = 0;
        this.flashScale = 0;
        this.heatLevel = 0;
        this.shotCount = 0;

        // Particle pools
        this.shells = [];
        this.smokeParticles = [];
        this._recoilTarget = { pitch: 0, z: 0, x: 0 };
        this._recoilVel = { pitch: 0, z: 0, x: 0 };

        // Materials — Tactical milspec finish
        this.receiverMat = new THREE.MeshStandardMaterial({
            color: 0x181c22, roughness: 0.4, metalness: 0.8
        });
        this.railMat = new THREE.MeshStandardMaterial({
            color: 0x20252d, roughness: 0.5, metalness: 0.7
        });
        this.barrelMat = new THREE.MeshStandardMaterial({
            color: 0x22262d, roughness: 0.35, metalness: 0.9
        });
        this.polyMat = new THREE.MeshStandardMaterial({
            color: 0x0c0d0f, roughness: 0.8, metalness: 0.1
        });
        this.magMat = new THREE.MeshStandardMaterial({
            color: 0x12151a, roughness: 0.45, metalness: 0.6
        });
        this.brassMat = new THREE.MeshStandardMaterial({
            color: 0xbfa34e, metalness: 0.9, roughness: 0.15
        });
        this.chromeMat = new THREE.MeshStandardMaterial({
            color: 0xe0e6ed, metalness: 1.0, roughness: 0.05
        });
        this.accentMat = new THREE.MeshStandardMaterial({
            color: 0x00aaff, emissive: 0x00aaff, emissiveIntensity: 0.4, roughness: 0.3, metalness: 0.9
        });
        this.sightDotMat = new THREE.MeshBasicMaterial({ color: 0x00ff44 });

        this.hasFired = false;
        this.buildRifle();
    }

    buildRifle() {
        // === SOLID RECOIL GROUP ===
        // The entire gun chassis is inside this group so it recoils realistically as a single solid unit!
        this.recoilGroup = new THREE.Group();
        this.add(this.recoilGroup);

        // === UPPER RECEIVER (Sleek skinnier hollow design) ===
        this.upperGroup = new THREE.Group();
        this.recoilGroup.add(this.upperGroup);

        // Left Side Wall (Solid, sleek thickness)
        const leftWall = new THREE.Mesh(
            new THREE.BoxGeometry(0.02, 0.20, 1.5),
            this.receiverMat
        );
        leftWall.position.set(-0.06, 0.2, -0.1);
        leftWall.castShadow = true;
        this.upperGroup.add(leftWall);

        // Top Wall (Rail Base)
        const topWall = new THREE.Mesh(
            new THREE.BoxGeometry(0.14, 0.03, 1.5),
            this.receiverMat
        );
        topWall.position.set(0, 0.29, -0.1);
        this.upperGroup.add(topWall);

        // Bottom Wall (Lower interface)
        const bottomWall = new THREE.Mesh(
            new THREE.BoxGeometry(0.14, 0.03, 1.5),
            this.receiverMat
        );
        bottomWall.position.set(0, 0.11, -0.1);
        this.upperGroup.add(bottomWall);

        // Right Rear Wall (after ejection port)
        const rightRearWall = new THREE.Mesh(
            new THREE.BoxGeometry(0.02, 0.15, 0.6),
            this.receiverMat
        );
        rightRearWall.position.set(0.06, 0.2, 0.35);
        this.upperGroup.add(rightRearWall);

        // Right Front Wall (before ejection port)
        const rightFrontWall = new THREE.Mesh(
            new THREE.BoxGeometry(0.02, 0.15, 0.5),
            this.receiverMat
        );
        rightFrontWall.position.set(0.06, 0.2, -0.6);
        this.upperGroup.add(rightFrontWall);

        // --- PHYSICAL GUIDE RAILS ON THE LEFT RECEIVER BODY ---
        // These horizontal bars "contain" the reciprocating side charging handle
        const upperGuideRail = new THREE.Mesh(
            new THREE.BoxGeometry(0.015, 0.01, 0.7),
            this.railMat
        );
        upperGuideRail.position.set(-0.07, 0.24, 0.0);
        this.upperGroup.add(upperGuideRail);

        const lowerGuideRail = new THREE.Mesh(
            new THREE.BoxGeometry(0.015, 0.01, 0.7),
            this.railMat
        );
        lowerGuideRail.position.set(-0.07, 0.18, 0.0);
        this.upperGroup.add(lowerGuideRail);

        // Flat top rail (Sleeker Picatinny)
        const topRail = new THREE.Mesh(
            new THREE.BoxGeometry(0.10, 0.03, 1.4),
            this.railMat
        );
        topRail.position.set(0, 0.32, -0.15);
        this.upperGroup.add(topRail);

        // Top Rail Picatinny Notches
        for (let i = 0; i < 18; i++) {
            const tooth = new THREE.Mesh(
                new THREE.BoxGeometry(0.11, 0.01, 0.015),
                this.railMat
            );
            tooth.position.set(0, 0.335, -0.8 + i * 0.075);
            this.upperGroup.add(tooth);
        }

        // Ejection Port Cover Hinge Group (downward/outward flip)
        this.dustCoverHinge = new THREE.Group();
        this.dustCoverHinge.position.set(0.07, 0.12, -0.15); // hinge at bottom edge of ejection port
        this.upperGroup.add(this.dustCoverHinge);

        this.dustCover = new THREE.Mesh(
            new THREE.BoxGeometry(0.01, 0.08, 0.38),
            this.receiverMat
        );
        this.dustCover.position.set(0, 0.04, 0); // offset so it pivots along bottom edge
        this.dustCoverHinge.add(this.dustCover);

        // Forward Assist Knob
        const fwdAssist = new THREE.Mesh(
            new THREE.CylinderGeometry(0.02, 0.02, 0.05, 8),
            this.receiverMat
        );
        fwdAssist.rotation.z = Math.PI / 2;
        fwdAssist.position.set(0.09, 0.22, 0.25);
        this.upperGroup.add(fwdAssist);

        // === BOLT CARRIER GROUP (Sleek cylindrical design, guided inside upper) ===
        this.boltGroup = new THREE.Group();
        this.boltGroup.position.set(0, 0.2, 0);
        this.upperGroup.add(this.boltGroup);

        // Sleek skinnier bolt carrier cylinder
        const boltCarrier = new THREE.Mesh(
            new THREE.CylinderGeometry(0.035, 0.035, 0.45, 12),
            this.chromeMat
        );
        boltCarrier.rotation.x = Math.PI / 2;
        boltCarrier.position.set(0, 0, 0.05);
        this.boltGroup.add(boltCarrier);

        // Bolt Gas Key (top detail)
        const gasKey = new THREE.Mesh(
            new THREE.BoxGeometry(0.015, 0.02, 0.12),
            this.receiverMat
        );
        gasKey.position.set(0, 0.045, -0.05);
        this.boltGroup.add(gasKey);

        // Reciprocating Tactical Side Charging Handle (Left side, rides within horizontal guide rails!)
        const handleRod = new THREE.Mesh(
            new THREE.CylinderGeometry(0.008, 0.008, 0.08, 8),
            this.receiverMat
        );
        handleRod.rotation.z = Math.PI / 2;
        handleRod.position.set(-0.06, 0.01, 0.0);
        this.boltGroup.add(handleRod);

        const handleKnob = new THREE.Mesh(
            new THREE.CylinderGeometry(0.015, 0.012, 0.04, 8),
            this.polyMat
        );
        handleKnob.rotation.z = Math.PI / 2;
        handleKnob.position.set(-0.1, 0.01, 0.0);
        this.boltGroup.add(handleKnob);

        // Bolt head / locking lugs (front mechanism)
        this.boltHeadMesh = new THREE.Group();
        this.boltHeadMesh.position.set(0, 0, -0.18);
        this.boltGroup.add(this.boltHeadMesh);

        const boltFace = new THREE.Mesh(
            new THREE.CylinderGeometry(0.03, 0.03, 0.05, 8),
            this.chromeMat
        );
        boltFace.rotation.x = Math.PI / 2;
        this.boltHeadMesh.add(boltFace);

        // Detailed locking lugs (like a 7-lug gear)
        for (let i = 0; i < 7; i++) {
            const lug = new THREE.Mesh(
                new THREE.BoxGeometry(0.01, 0.008, 0.04),
                this.chromeMat
            );
            lug.position.set(
                Math.sin(i * Math.PI * 2 / 7) * 0.033,
                Math.cos(i * Math.PI * 2 / 7) * 0.033,
                0
            );
            lug.rotation.z = -i * Math.PI * 2 / 7;
            this.boltHeadMesh.add(lug);
        }

        // === BARREL ASSEMBLY (Skinnier, realistic proportions) ===
        const barrel = new THREE.Mesh(
            new THREE.CylinderGeometry(0.022, 0.022, 2.6, 16),
            this.barrelMat
        );
        barrel.rotation.x = Math.PI / 2;
        barrel.position.set(0, 0.2, -2.1);
        barrel.castShadow = true;
        this.recoilGroup.add(barrel);

        // Gas tube
        const gasTube = new THREE.Mesh(
            new THREE.CylinderGeometry(0.006, 0.006, 1.4, 8),
            this.barrelMat
        );
        gasTube.rotation.x = Math.PI / 2;
        gasTube.position.set(0, 0.25, -1.4);
        this.recoilGroup.add(gasTube);

        // Gas block / front sight base
        const gasBlock = new THREE.Mesh(
            new THREE.BoxGeometry(0.06, 0.10, 0.06),
            this.receiverMat
        );
        gasBlock.position.set(0, 0.24, -2.2);
        this.recoilGroup.add(gasBlock);

        // Front sight post
        const fSightPost = new THREE.Mesh(
            new THREE.BoxGeometry(0.015, 0.08, 0.015),
            this.receiverMat
        );
        fSightPost.position.set(0, 0.32, -2.2);
        this.recoilGroup.add(fSightPost);

        // Muzzle brake / flash hider
        const muzzle = new THREE.Mesh(
            new THREE.CylinderGeometry(0.03, 0.028, 0.14, 12),
            this.barrelMat
        );
        muzzle.rotation.x = Math.PI / 2;
        muzzle.position.set(0, 0.2, -3.5);
        this.recoilGroup.add(muzzle);

        // Muzzle brake slots
        for (let i = 0; i < 4; i++) {
            const slot = new THREE.Mesh(
                new THREE.BoxGeometry(0.04, 0.008, 0.02),
                new THREE.MeshBasicMaterial({ color: 0x000000 })
            );
            slot.position.set(0, 0.2 + (i < 2 ? 0.02 : -0.02), -3.42 - i * 0.03);
            slot.rotation.z = (i % 2) * Math.PI / 2;
            this.recoilGroup.add(slot);
        }

        // === HANDGUARD / RAIL SYSTEM (Sleek and skinnier) ===
        const handguardGroup = new THREE.Group();
        this.recoilGroup.add(handguardGroup);

        // Main handguard tube
        const hg = new THREE.Mesh(
            new THREE.BoxGeometry(0.16, 0.18, 1.4),
            this.railMat
        );
        hg.position.set(0, 0.16, -1.55);
        handguardGroup.add(hg);

        // Side rails (left & right)
        for (let side of [-1, 1]) {
            const sideRail = new THREE.Mesh(
                new THREE.BoxGeometry(0.02, 0.04, 1.3),
                this.railMat
            );
            sideRail.position.set(0.09 * side, 0.16, -1.55);
            handguardGroup.add(sideRail);

            // Side Picatinny Teeth Notches
            for (let i = 0; i < 15; i++) {
                const tooth = new THREE.Mesh(
                    new THREE.BoxGeometry(0.01, 0.05, 0.015),
                    this.railMat
                );
                tooth.position.set(0.10 * side, 0.16, -2.1 + i * 0.08);
                tooth.rotation.z = Math.PI / 2;
                handguardGroup.add(tooth);
            }
        }

        // Bottom rail
        const bottomRail = new THREE.Mesh(
            new THREE.BoxGeometry(0.08, 0.02, 1.3),
            this.railMat
        );
        bottomRail.position.set(0, 0.06, -1.55);
        handguardGroup.add(bottomRail);

        // Bottom Picatinny Teeth Notches
        for (let i = 0; i < 15; i++) {
            const tooth = new THREE.Mesh(
                new THREE.BoxGeometry(0.09, 0.01, 0.015),
                this.railMat
            );
            tooth.position.set(0, 0.045, -2.1 + i * 0.08);
            handguardGroup.add(tooth);
        }

        // Ventilation cutouts
        for (let i = 0; i < 5; i++) {
            for (let side of [-1, 1]) {
                const vent = new THREE.Mesh(
                    new THREE.BoxGeometry(0.03, 0.05, 0.08),
                    new THREE.MeshBasicMaterial({ color: 0x050505 })
                );
                vent.position.set(0.08 * side, 0.16, -1.0 - i * 0.25);
                handguardGroup.add(vent);
            }
        }

        // === LOWER RECEIVER (Sleek skinnier profile) ===
        const lowerGroup = new THREE.Group();
        this.recoilGroup.add(lowerGroup);

        const lower = new THREE.Mesh(
            new THREE.BoxGeometry(0.14, 0.14, 0.9),
            this.receiverMat
        );
        lower.position.set(0, 0.02, 0.15);
        lower.castShadow = true;
        lowerGroup.add(lower);

        // Magazine well flare
        const magWell = new THREE.Mesh(
            new THREE.BoxGeometry(0.12, 0.04, 0.3),
            this.receiverMat
        );
        magWell.position.set(0, -0.06, 0.0);
        lowerGroup.add(magWell);

        // Trigger guard
        const guardOuter = new THREE.Mesh(
            new THREE.BoxGeometry(0.04, 0.16, 0.22),
            this.receiverMat
        );
        guardOuter.position.set(0, -0.12, 0.18);
        lowerGroup.add(guardOuter);

        const guardInner = new THREE.Mesh(
            new THREE.BoxGeometry(0.045, 0.12, 0.18),
            new THREE.MeshBasicMaterial({ color: 0x000000 })
        );
        guardInner.position.set(0, -0.11, 0.18);
        lowerGroup.add(guardInner);

        // Trigger
        this.triggerMesh = new THREE.Mesh(
            new THREE.BoxGeometry(0.015, 0.08, 0.02),
            new THREE.MeshStandardMaterial({ color: 0x111111 })
        );
        this.triggerMesh.position.set(0, -0.09, 0.15);
        lowerGroup.add(this.triggerMesh);

        // Selector switch
        const selector = new THREE.Mesh(
            new THREE.CylinderGeometry(0.015, 0.015, 0.03, 8),
            this.receiverMat
        );
        selector.rotation.z = Math.PI / 2;
        selector.position.set(-0.08, 0.06, 0.3);
        lowerGroup.add(selector);

        // Mag release button
        const magRelease = new THREE.Mesh(
            new THREE.BoxGeometry(0.02, 0.04, 0.02),
            this.receiverMat
        );
        magRelease.position.set(0.08, 0.0, 0.05);
        lowerGroup.add(magRelease);

        // === PISTOL GRIP (Sleeker and skinnier) ===
        const grip = new THREE.Mesh(
            new THREE.BoxGeometry(0.12, 0.9, 0.25),
            this.polyMat
        );
        grip.position.set(0, -0.55, 0.42);
        grip.rotation.x = Math.PI * 0.12;
        grip.castShadow = true;
        this.recoilGroup.add(grip);

        // Grip texture ridges
        for (let i = 0; i < 6; i++) {
            const ridge = new THREE.Mesh(
                new THREE.BoxGeometry(0.13, 0.015, 0.23),
                this.polyMat
            );
            ridge.position.set(0, -0.3 - i * 0.1, 0.42);
            ridge.rotation.x = Math.PI * 0.12;
            this.recoilGroup.add(ridge);
        }

        // Grip bottom cap
        const gripCap = new THREE.Mesh(
            new THREE.BoxGeometry(0.10, 0.03, 0.2),
            this.receiverMat
        );
        gripCap.position.set(0, -1.0, 0.52);
        gripCap.rotation.x = Math.PI * 0.12;
        this.recoilGroup.add(gripCap);

        // === MAGAZINE (Proportionally skinnier) ===
        this.magGroup = new THREE.Group();
        this.recoilGroup.add(this.magGroup);

        const magBody = new THREE.Mesh(
            new THREE.BoxGeometry(0.08, 0.9, 0.22),
            this.magMat
        );
        magBody.position.set(0, -0.55, 0.0);
        magBody.rotation.x = Math.PI * 0.02;
        this.magGroup.add(magBody);

        // Mag floor plate
        const magFloor = new THREE.Mesh(
            new THREE.BoxGeometry(0.09, 0.03, 0.24),
            this.receiverMat
        );
        magFloor.position.set(0, -1.0, 0.0);
        this.magGroup.add(magFloor);

        // Mag witness holes
        for (let i = 0; i < 3; i++) {
            const hole = new THREE.Mesh(
                new THREE.BoxGeometry(0.01, 0.03, 0.03),
                new THREE.MeshBasicMaterial({ color: 0x000000 })
            );
            hole.position.set(-0.05, -0.3 - i * 0.2, 0.0);
            this.magGroup.add(hole);
        }

        // === COLLAPSIBLE STOCK (Sleeker and skinnier) ===
        const stockGroup = new THREE.Group();
        this.recoilGroup.add(stockGroup);

        // Buffer tube
        const buffer = new THREE.Mesh(
            new THREE.CylinderGeometry(0.035, 0.035, 1.0, 12),
            this.receiverMat
        );
        buffer.rotation.x = Math.PI / 2;
        buffer.position.set(0, 0.18, 1.1);
        stockGroup.add(buffer);

        // Stock body
        const stockBody = new THREE.Mesh(
            new THREE.BoxGeometry(0.1, 0.2, 0.45),
            this.polyMat
        );
        stockBody.position.set(0, 0.16, 1.4);
        stockGroup.add(stockBody);

        // Buttpad (rubber)
        const buttpad = new THREE.Mesh(
            new THREE.BoxGeometry(0.09, 0.18, 0.03),
            new THREE.MeshStandardMaterial({ color: 0x1d1e22, roughness: 0.95 })
        );
        buttpad.position.set(0, 0.16, 1.63);
        stockGroup.add(buttpad);

        // Cheek weld riser
        const cheekWeld = new THREE.Mesh(
            new THREE.BoxGeometry(0.08, 0.04, 0.28),
            this.polyMat
        );
        cheekWeld.position.set(0, 0.28, 1.35);
        stockGroup.add(cheekWeld);

        // QD sling mount
        const slingMount = new THREE.Mesh(
            new THREE.TorusGeometry(0.02, 0.005, 8, 16),
            this.receiverMat
        );
        slingMount.position.set(-0.06, 0.1, 1.55);
        stockGroup.add(slingMount);

        // === HOLOGRAPHIC SIGHT REMOVED TO MAKE ROOM FOR THE SUPER-EXOTIC CUSTOM SHADER HOLOSIGHT ===

        // === MUZZLE LIGHT ===
        this.muzzleLight = new THREE.PointLight(0xffaa44, 0, 8);
        this.muzzleLight.position.set(0, 0.2, -3.6);
        this.recoilGroup.add(this.muzzleLight);

        // === MUZZLE FLASH MESH ===
        this.flashGroup = new THREE.Group();
        this.flashGroup.position.set(0, 0.2, -3.6);
        this.recoilGroup.add(this.flashGroup);
        const flashMat = new THREE.MeshBasicMaterial({ color: 0xffcc44, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false });
        const flashCoreMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1, depthWrite: false });
        
        // Central cone
        const coneGeo = new THREE.ConeGeometry(0.05, 0.5, 6);
        const cone = new THREE.Mesh(coneGeo, flashMat);
        cone.rotation.x = Math.PI / 2;
        cone.position.z = -0.25;
        this.flashGroup.add(cone);
        
        // Core glow sphere
        const coreGeo = new THREE.SphereGeometry(0.04, 8, 8);
        this.flashCore = new THREE.Mesh(coreGeo, flashCoreMat);
        this.flashGroup.add(this.flashCore);
        
        // Side petals (star pattern)
        for (let i = 0; i < 4; i++) {
            const petal = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.3), flashMat);
            petal.rotation.z = i * Math.PI / 4;
            petal.rotation.y = Math.PI / 2;
            petal.position.z = -0.1;
            this.flashGroup.add(petal);
        }
        this.flashGroup.visible = false;
        this.flashMat = flashMat;
        this.flashCoreMat = flashCoreMat;

        // === BARREL HEAT MATERIAL REF ===
        this.barrelMesh = barrel;
        this.barrelOrigColor = new THREE.Color(0x22262d);

        // === ACCENT STRIP (Blue LED on handguard) ===
        const ledStrip = new THREE.Mesh(
            new THREE.BoxGeometry(0.01, 0.01, 1.0),
            this.accentMat
        );
        ledStrip.position.set(0.095, 0.0, -1.55);
        this.recoilGroup.add(ledStrip);
    }

    fire(isADS) {
        this.shotCount++;
        // Progressive recoil - kicks harder the longer you hold fire
        const burstMult = Math.min(1.8, 1.0 + this.shotCount * 0.04);

        if (isADS) {
            // ADS: Minimal mechanical animation — rock-solid aim, no visual jolt
            this.boltZ = 0.07; // Subtle bolt reciprocation (barely visible)
            // Zero out chassis recoil impulses completely
            this._recoilTarget.pitch = 0;
            this._recoilTarget.z = 0;
            this._recoilTarget.x = 0;
            this._recoilVel.pitch = 0;
            this._recoilVel.z = 0;
            this._recoilVel.x = 0;
        } else {
            // Hipfire: Full mechanical recoil
            this.boltZ = 0.35;
            this._recoilTarget.pitch = (0.12 + Math.random() * 0.06) * burstMult;
            this._recoilTarget.z = (0.08 + Math.random() * 0.04) * burstMult;
            this._recoilTarget.x = (Math.random() - 0.5) * 0.04 * burstMult;
            this._recoilVel.pitch = 8;
            this._recoilVel.z = 6;
            this._recoilVel.x = 3;
        }
        
        this.triggerRot = 0.25;
        this.lightIntensity = isADS ? 1.5 : 3.5;
        this.flashScale = isADS ? (0.4 + Math.random() * 0.2) : (1.0 + Math.random() * 0.4);
        this.heatLevel = Math.min(1.0, this.heatLevel + 0.06);

        if (!this.hasFired) {
            this.hasFired = true;
            this.dustCoverRot = -Math.PI * 0.65; // open downward/outward hinged cover
        }

        // Show muzzle flash with random rotation
        this.flashGroup.visible = true;
        this.flashGroup.rotation.z = Math.random() * Math.PI * 2;
        this.flashGroup.scale.setScalar(this.flashScale);

        // Skip shell/smoke spawning in ADS to eliminate rightward visual jolt
        if (!isADS) {
            this.spawnShell();
            this.spawnEjectionSmoke();
        }
        this.playProceduralShot();
    }

    spawnShell() {
        const shellGeo = new THREE.CylinderGeometry(0.012, 0.01, 0.08, 8);
        const shell = new THREE.Mesh(shellGeo, this.brassMat);
        shell.castShadow = true;

        // Spawns from the center of our new hollow ejection port on the right side
        const worldPos = new THREE.Vector3(0.08, 0.20, -0.15);
        worldPos.applyMatrix4(this.recoilGroup.matrixWorld);
        shell.position.copy(worldPos);
        shell.rotation.set(Math.random() * 6.28, Math.random() * 6.28, Math.random() * 6.28);

        const target = this.parent || window.scene;
        if (target) target.add(shell);

        // Eject outward (right) and slightly upward/backward
        const rightDir = new THREE.Vector3(1, 0, 0).applyQuaternion(this.getWorldQuaternion(new THREE.Quaternion()));
        const upDir = new THREE.Vector3(0, 1, 0).applyQuaternion(this.getWorldQuaternion(new THREE.Quaternion()));
        const ejectSpeed = 3.5 + Math.random() * 2;
        const upSpeed = 2.0 + Math.random() * 1.5;

        this.shells.push({
            mesh: shell,
            vx: rightDir.x * ejectSpeed + upDir.x * upSpeed,
            vy: rightDir.y * ejectSpeed + upDir.y * upSpeed + 1.2,
            vz: rightDir.z * ejectSpeed + upDir.z * upSpeed,
            rx: (Math.random() - 0.5) * 15,
            ry: (Math.random() - 0.5) * 15,
            rz: (Math.random() - 0.5) * 15,
            life: 2.0,
            bounced: false,
            bouncesLeft: 2
        });
    }

    spawnEjectionSmoke() {
        const target = this.parent || window.scene;
        if (!target) return;
        const smokeMat = new THREE.MeshBasicMaterial({ color: 0x888888, transparent: true, opacity: 0.3, depthWrite: false });
        for (let i = 0; i < 3; i++) {
            const smoke = new THREE.Mesh(new THREE.SphereGeometry(0.01 + Math.random() * 0.02, 4, 4), smokeMat.clone());
            const wp = new THREE.Vector3(0.08, 0.20, -0.15);
            wp.applyMatrix4(this.recoilGroup.matrixWorld);
            smoke.position.copy(wp);
            target.add(smoke);
            this.smokeParticles.push({
                mesh: smoke,
                vx: (Math.random() - 0.3) * 0.5,
                vy: 0.3 + Math.random() * 0.4,
                vz: (Math.random() - 0.5) * 0.3,
                life: 0.5 + Math.random() * 0.3
            });
        }
    }

    _playShellClink() {
        if (!window.audioCtx) return;
        const ctx = window.audioCtx;
        const t = ctx.currentTime;
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.setValueAtTime(3000 + Math.random() * 3000, t);
        o.frequency.exponentialRampToValueAtTime(800, t + 0.03);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.04, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
        o.connect(g).connect(ctx.destination);
        o.start(t); o.stop(t + 0.06);
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

        // Layer 3: Noise burst (powder explosion)
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

        // Layer 4: Bolt carrier snap click
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
        // Spring-damped recoil system applied to the ENTIRE recoil chassis group!
        const springK = 120, damp = 12;
        this._recoilVel.pitch += (-this.gunPitch * springK - this._recoilVel.pitch * damp) * dt;
        this._recoilVel.z += (-this.gunZ * springK - this._recoilVel.z * damp) * dt;
        this._recoilVel.x += (-this.gunX * springK - this._recoilVel.x * damp) * dt;
        this.gunPitch += this._recoilVel.pitch * dt + this._recoilTarget.pitch;
        this.gunZ += this._recoilVel.z * dt + this._recoilTarget.z;
        this.gunX += this._recoilVel.x * dt + this._recoilTarget.x;
        this._recoilTarget.pitch *= 0.85;
        this._recoilTarget.z *= 0.85;
        this._recoilTarget.x *= 0.85;

        // Recoil base values are processed for logic, but we no longer slide/pivot the gun chassis
        // to keep it rock-solid and firmly locked in the player's hands. Only the bolt carrier cycles!

        // Bolt carrier group reciprocation inside receiver
        this.boltZ += (0 - this.boltZ) * 30 * dt;
        this.boltGroup.position.z = this.boltZ;

        // DEFINED Rotary Lock Action:
        // As bolt begins to slide back (from 0 to 0.05 z-travel), rotate bolt head to unlock (45 degrees)
        if (this.boltZ < 0.05) {
            this.boltHeadMesh.rotation.z = (this.boltZ / 0.05) * (Math.PI / 4);
        } else {
            this.boltHeadMesh.rotation.z = Math.PI / 4;
        }

        // Trigger return animation
        this.triggerRot += (0 - this.triggerRot) * 25 * dt;
        this.triggerMesh.rotation.x = this.triggerRot;

        // Muzzle light intensity decay
        this.lightIntensity = Math.max(0, this.lightIntensity - 50 * dt);
        this.muzzleLight.intensity = this.lightIntensity;

        // Muzzle flash mesh fade
        this.flashScale *= 0.7;
        if (this.flashScale < 0.05) {
            this.flashGroup.visible = false;
        } else {
            this.flashGroup.scale.setScalar(this.flashScale);
            this.flashMat.opacity = this.flashScale;
            this.flashCoreMat.opacity = Math.min(1, this.flashScale * 2);
        }

        // Dust cover hinge downward pivot
        if (this.hasFired) {
            this.dustCoverHinge.rotation.z += (this.dustCoverRot - this.dustCoverHinge.rotation.z) * 10 * dt;
        }

        // Barrel heat glow visual cooling
        this.heatLevel = Math.max(0, this.heatLevel - 0.008 * dt);
        if (this.barrelMesh) {
            const h = this.heatLevel;
            const heatColor = this.barrelOrigColor.clone().lerp(new THREE.Color(0.6, 0.15, 0.0), h * 0.4);
            this.barrelMat.color.copy(heatColor);
            this.barrelMat.emissive.setRGB(h * 0.3, h * 0.05, 0);
            this.barrelMat.emissiveIntensity = h;
        }

        // Reset progressive recoil burst factor when not firing
        this.shotCount = Math.max(0, this.shotCount - 3 * dt);

        // Ambient LED strip pulse on handguard
        if (this.accentMat) {
            this.accentMat.emissiveIntensity = 0.3 + Math.sin(Date.now() * 0.005) * 0.15;
        }

        // Shell physics with double floor bounces and sound trigger
        for (let i = this.shells.length - 1; i >= 0; i--) {
            const s = this.shells[i];
            s.vy -= 9.8 * dt;
            s.mesh.position.x += s.vx * dt;
            s.mesh.position.y += s.vy * dt;
            s.mesh.position.z += s.vz * dt;
            s.mesh.rotation.x += s.rx * dt;
            s.mesh.rotation.y += s.ry * dt;
            s.mesh.rotation.z += s.rz * dt;
            
            // Floor bounce simulation
            if (s.mesh.position.y < 0.05 && s.bouncesLeft > 0) {
                s.mesh.position.y = 0.05;
                s.vy = Math.abs(s.vy) * 0.3;
                s.vx *= 0.5;
                s.vz *= 0.5;
                s.rx *= 0.4; s.ry *= 0.4; s.rz *= 0.4;
                s.bouncesLeft--;
                this._playShellClink();
            }
            
            s.life -= dt;
            // Smooth transparency fade-out before disposal
            if (s.life < 0.3) {
                s.mesh.material.opacity = s.life / 0.3;
                s.mesh.material.transparent = true;
            }
            if (s.life <= 0) {
                if (s.mesh.parent) s.mesh.parent.remove(s.mesh);
                s.mesh.geometry.dispose();
                this.shells.splice(i, 1);
            }
        }

        // Gas/smoke venting particles from ejection port
        for (let i = this.smokeParticles.length - 1; i >= 0; i--) {
            const sp = this.smokeParticles[i];
            sp.mesh.position.x += sp.vx * dt;
            sp.mesh.position.y += sp.vy * dt;
            sp.mesh.position.z += sp.vz * dt;
            sp.mesh.scale.multiplyScalar(1 + 2 * dt);
            sp.life -= dt;
            sp.mesh.material.opacity = Math.max(0, sp.life * 0.6);
            if (sp.life <= 0) {
                if (sp.mesh.parent) sp.mesh.parent.remove(sp.mesh);
                sp.mesh.geometry.dispose();
                sp.mesh.material.dispose();
                this.smokeParticles.splice(i, 1);
            }
        }
    }
}

window.AssaultRifle = AssaultRifle;
