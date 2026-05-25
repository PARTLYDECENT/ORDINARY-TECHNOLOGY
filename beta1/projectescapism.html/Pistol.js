/**
 * Procedural MAC-10 Viewmodel Component
 * Grafts the High-Fidelity raymarching MAC-10 model as a clean, high-performance,
 * procedural Three.js mesh for the Pistol slot in the game.
 * Features: Top cocking handle slot action, hollow upper receiver with side ejection port,
 * swinging front strap loop hanger, folded wire stock, magazine ribbing, volumetric muzzle flash,
 * 15Hz submachine gun procedural audio layer, and bouncing brass shell physics.
 */
class Pistol extends THREE.Group {
    constructor() {
        super();
        this.name = "procedural_mac10";

        // Animation states (Open-bolt resting state: bolt held backward at 0.24!)
        this.boltZ = 0.24;
        this.gunPitch = 0;
        this.gunZ = 0;
        this.triggerZ = -0.22;
        this.lightIntensity = 0;
        this.flashScale = 0;
        this.strapSwing = 0;

        // Particle pools
        this.shells = [];
        this.smokeParticles = [];

        // Materials
        this.receiverMat = new THREE.MeshStandardMaterial({
            color: 0x141619, roughness: 0.75, metalness: 0.6
        });
        this.steelMat = new THREE.MeshStandardMaterial({
            color: 0x3d444e, roughness: 0.35, metalness: 0.85
        });
        this.polyMat = new THREE.MeshStandardMaterial({
            color: 0x0a0b0d, roughness: 0.85, metalness: 0.1
        });
        this.brassMat = new THREE.MeshStandardMaterial({
            color: 0xbfa34e, metalness: 0.9, roughness: 0.15
        });
        this.chromeMat = new THREE.MeshStandardMaterial({
            color: 0xd8dee9, metalness: 0.95, roughness: 0.1
        });
        this.dotMat = new THREE.MeshBasicMaterial({ color: 0x00ff00 });

        this.hasFired = false;
        this.buildMac10();
    }

    buildMac10() {
        // === MAIN SOLID CHASSIS ===
        this.chassisGroup = new THREE.Group();
        this.add(this.chassisGroup);

        // === UPPER RECEIVER (Hollow design with ejection port & top slot) ===
        this.upperGroup = new THREE.Group();
        this.chassisGroup.add(this.upperGroup);

        // Left wall
        const leftWall = new THREE.Mesh(
            new THREE.BoxGeometry(0.02, 0.18, 1.0),
            this.receiverMat
        );
        leftWall.position.set(-0.07, 0.15, -0.2);
        leftWall.castShadow = true;
        this.upperGroup.add(leftWall);

        // Top plate (with center slot cut)
        const topPlateL = new THREE.Mesh(
            new THREE.BoxGeometry(0.06, 0.02, 1.0),
            this.receiverMat
        );
        topPlateL.position.set(-0.04, 0.24, -0.2);
        this.upperGroup.add(topPlateL);

        const topPlateR = new THREE.Mesh(
            new THREE.BoxGeometry(0.06, 0.02, 1.0),
            this.receiverMat
        );
        topPlateR.position.set(0.04, 0.24, -0.2);
        this.upperGroup.add(topPlateR);

        // Bottom plate
        const bottomPlate = new THREE.Mesh(
            new THREE.BoxGeometry(0.16, 0.02, 1.0),
            this.receiverMat
        );
        bottomPlate.position.set(0, 0.06, -0.2);
        this.upperGroup.add(bottomPlate);

        // Right rear wall (after ejection port)
        const rightRear = new THREE.Mesh(
            new THREE.BoxGeometry(0.02, 0.16, 0.35),
            this.receiverMat
        );
        rightRear.position.set(0.07, 0.15, 0.125);
        this.upperGroup.add(rightRear);

        // Right front wall (before ejection port)
        const rightFront = new THREE.Mesh(
            new THREE.BoxGeometry(0.02, 0.16, 0.35),
            this.receiverMat
        );
        rightFront.position.set(0.07, 0.15, -0.525);
        this.upperGroup.add(rightFront);

        // === FRONT SIGHT ===
        const fSightBase = new THREE.Mesh(
            new THREE.BoxGeometry(0.04, 0.06, 0.04),
            this.receiverMat
        );
        fSightBase.position.set(0, 0.26, -0.65);
        this.upperGroup.add(fSightBase);

        const fSightRing = new THREE.Mesh(
            new THREE.TorusGeometry(0.03, 0.008, 6, 12),
            this.receiverMat
        );
        fSightRing.position.set(0, 0.29, -0.65);
        this.upperGroup.add(fSightRing);

        // === REAR SIGHT (Peep sight block) ===
        const rSight = new THREE.Mesh(
            new THREE.BoxGeometry(0.08, 0.08, 0.02),
            this.receiverMat
        );
        rSight.position.set(0, 0.28, 0.28);
        this.upperGroup.add(rSight);

        // === LOWER RECEIVER ===
        this.lowerGroup = new THREE.Group();
        this.chassisGroup.add(this.lowerGroup);

        const lowerBody = new THREE.Mesh(
            new THREE.BoxGeometry(0.15, 0.1, 0.9),
            this.receiverMat
        );
        lowerBody.position.set(0, 0.0, -0.15);
        lowerBody.castShadow = true;
        this.lowerGroup.add(lowerBody);

        // Stock mount block (rear)
        const stockMount = new THREE.Mesh(
            new THREE.BoxGeometry(0.10, 0.08, 0.05),
            this.receiverMat
        );
        stockMount.position.set(0, 0.0, 0.325);
        this.lowerGroup.add(stockMount);

        // Selector Switch (Left side)
        const selector = new THREE.Mesh(
            new THREE.CylinderGeometry(0.012, 0.012, 0.03, 8),
            this.steelMat
        );
        selector.rotation.z = Math.PI / 2;
        selector.position.set(-0.085, 0.0, -0.3);
        this.lowerGroup.add(selector);

        // Safety slide switch (Underneath front)
        const safety = new THREE.Mesh(
            new THREE.BoxGeometry(0.03, 0.015, 0.06),
            this.polyMat
        );
        safety.position.set(0.04, -0.06, -0.4);
        this.lowerGroup.add(safety);

        // Trigger Guard Loop
        const tGuard = new THREE.Mesh(
            new THREE.BoxGeometry(0.03, 0.16, 0.26),
            this.receiverMat
        );
        tGuard.position.set(0, -0.12, -0.12);
        this.lowerGroup.add(tGuard);

        const tGuardInner = new THREE.Mesh(
            new THREE.BoxGeometry(0.035, 0.12, 0.22),
            new THREE.MeshBasicMaterial({ color: 0x000000 })
        );
        tGuardInner.position.set(0, -0.11, -0.12);
        this.lowerGroup.add(tGuardInner);

        // Trigger capsule
        this.triggerMesh = new THREE.Mesh(
            new THREE.BoxGeometry(0.015, 0.08, 0.02),
            this.steelMat
        );
        this.triggerMesh.position.set(0, -0.08, -0.1);
        this.lowerGroup.add(this.triggerMesh);

        // === ERGONOMIC GRIP (Polymer + texturing) ===
        const gripGroup = new THREE.Group();
        gripGroup.position.set(0, -0.45, 0.2);
        gripGroup.rotation.x = Math.PI * 0.1;
        this.chassisGroup.add(gripGroup);

        const gripMain = new THREE.Mesh(
            new THREE.BoxGeometry(0.13, 0.7, 0.22),
            this.polyMat
        );
        gripGroup.add(gripMain);

        // Ergonomic backstrap bulge
        const backstrap = new THREE.Mesh(
            new THREE.CylinderGeometry(0.04, 0.04, 0.6, 12),
            this.polyMat
        );
        backstrap.position.set(0, 0.0, 0.11);
        gripGroup.add(backstrap);

        // Grip texture ridges
        for (let i = 0; i < 9; i++) {
            const ridge = new THREE.Mesh(
                new THREE.BoxGeometry(0.14, 0.015, 0.23),
                this.polyMat
            );
            ridge.position.set(0, -0.25 + i * 0.06, 0.01);
            gripGroup.add(ridge);
        }

        // Mag release catch (Bottom rear of grip)
        const magCatch = new THREE.Mesh(
            new THREE.BoxGeometry(0.06, 0.08, 0.04),
            this.steelMat
        );
        magCatch.position.set(0, -0.36, 0.11);
        gripGroup.add(magCatch);

        // === MAGAZINE (Ribbed military aesthetic) ===
        this.magGroup = new THREE.Group();
        this.magGroup.position.set(0, -0.65, 0.1);
        this.magGroup.rotation.x = Math.PI * 0.1;
        this.chassisGroup.add(this.magGroup);

        const magBody = new THREE.Mesh(
            new THREE.BoxGeometry(0.1, 0.9, 0.15),
            this.receiverMat
        );
        this.magGroup.add(magBody);

        // Mag vertical ribs
        for (let i = 0; i < 7; i++) {
            const rib = new THREE.Mesh(
                new THREE.BoxGeometry(0.11, 0.015, 0.16),
                this.receiverMat
            );
            rib.position.set(0, -0.3 + i * 0.1, 0.0);
            this.magGroup.add(rib);
        }

        // Mag floor plate
        const magFloor = new THREE.Mesh(
            new THREE.BoxGeometry(0.115, 0.02, 0.17),
            this.steelMat
        );
        magFloor.position.set(0, -0.46, 0.0);
        this.magGroup.add(magFloor);

        // === BARREL & THREAD PROTECTOR ===
        const barrel = new THREE.Mesh(
            new THREE.CylinderGeometry(0.04, 0.04, 0.45, 12),
            this.steelMat
        );
        barrel.rotation.x = Math.PI / 2;
        barrel.position.set(0, 0.15, -0.85);
        barrel.castShadow = true;
        this.chassisGroup.add(barrel);

        // Base Collar
        const collar = new THREE.Mesh(
            new THREE.CylinderGeometry(0.05, 0.05, 0.1, 12),
            this.steelMat
        );
        collar.rotation.x = Math.PI / 2;
        collar.position.set(0, 0.15, -0.68);
        this.chassisGroup.add(collar);

        // Thread Protector (Knurled Tip)
        const protector = new THREE.Mesh(
            new THREE.CylinderGeometry(0.045, 0.045, 0.12, 12),
            this.steelMat
        );
        protector.rotation.x = Math.PI / 2;
        protector.position.set(0, 0.15, -1.05);
        this.chassisGroup.add(protector);

        // === FRONT STRAP HANGER (Loop swing on recoil!) ===
        this.hangerGroup = new THREE.Group();
        this.hangerGroup.position.set(0, 0.15, -0.825);
        this.chassisGroup.add(this.hangerGroup);

        const clampCollar = new THREE.Mesh(
            new THREE.TorusGeometry(0.05, 0.01, 6, 16),
            this.steelMat
        );
        clampCollar.rotation.y = Math.PI / 2;
        this.hangerGroup.add(clampCollar);

        const stalk = new THREE.Mesh(
            new THREE.BoxGeometry(0.02, 0.06, 0.02),
            this.steelMat
        );
        stalk.position.set(0, -0.06, 0);
        this.hangerGroup.add(stalk);

        // Swinging ring anchor
        this.hangerRing = new THREE.Group();
        this.hangerRing.position.set(0, -0.09, 0);
        this.hangerGroup.add(this.hangerRing);

        const ring = new THREE.Mesh(
            new THREE.TorusGeometry(0.035, 0.008, 6, 12),
            this.steelMat
        );
        this.hangerRing.add(ring);

        // Strap fabric tab
        const strapFabric = new THREE.Mesh(
            new THREE.BoxGeometry(0.01, 0.15, 0.06),
            new THREE.MeshStandardMaterial({ color: 0x2d322b, roughness: 0.9 })
        );
        strapFabric.position.set(0, -0.08, 0);
        this.hangerRing.add(strapFabric);

        // === FOLDED WIRE STOCK (Tactical wrap-around) ===
        const stockGroup = new THREE.Group();
        this.chassisGroup.add(stockGroup);

        // Side rails (collapsed along receiver sides)
        for (let side of [-1, 1]) {
            const sideWire = new THREE.Mesh(
                new THREE.CylinderGeometry(0.012, 0.012, 0.7, 8),
                this.steelMat
            );
            sideWire.rotation.x = Math.PI / 2;
            sideWire.position.set(0.09 * side, 0.02, -0.025);
            stockGroup.add(sideWire);
        }

        // Hinge pins
        const hingePin = new THREE.Mesh(
            new THREE.CylinderGeometry(0.02, 0.02, 0.2, 8),
            this.steelMat
        );
        hingePin.rotation.z = Math.PI / 2;
        hingePin.position.set(0, 0.0, 0.32);
        stockGroup.add(hingePin);

        // Shoulder butt loop (folded under receiver body)
        const shoulderLoop = new THREE.Mesh(
            new THREE.TorusGeometry(0.07, 0.012, 6, 12),
            this.steelMat
        );
        shoulderLoop.position.set(0, -0.08, -0.2);
        stockGroup.add(shoulderLoop);

        // === RECIPROCATING BOLT GROUP (Cocking action rides inside upper) ===
        this.boltGroup = new THREE.Group();
        this.boltGroup.position.set(0, 0.15, 0);
        this.upperGroup.add(this.boltGroup);

        // Heavy bolt carrier block
        const boltBody = new THREE.Mesh(
            new THREE.BoxGeometry(0.12, 0.07, 0.45),
            this.chromeMat
        );
        boltBody.position.set(0, 0, -0.2);
        this.boltGroup.add(boltBody);

        // Top Cylindrical Cocking Handle (sticks out of center top slot!)
        const cockingHandle = new THREE.Mesh(
            new THREE.CylinderGeometry(0.022, 0.022, 0.08, 12),
            this.steelMat
        );
        cockingHandle.position.set(0, 0.07, -0.25);
        // Add diamond grip details
        const details = new THREE.Mesh(
            new THREE.CylinderGeometry(0.024, 0.024, 0.02, 8),
            this.polyMat
        );
        details.position.set(0, 0.1, -0.25);
        this.boltGroup.add(cockingHandle, details);

        // Extractor pin details
        const extractor = new THREE.Mesh(
            new THREE.BoxGeometry(0.015, 0.015, 0.06),
            this.receiverMat
        );
        extractor.position.set(0.055, 0.01, -0.1);
        this.boltGroup.add(extractor);

        // Visible internal gold casing inside chamber when bolt slides back
        this.casingShow = new THREE.Mesh(
            new THREE.CylinderGeometry(0.035, 0.035, 0.1, 8),
            this.brassMat
        );
        this.casingShow.rotation.x = Math.PI / 2;
        this.casingShow.position.set(0.02, 0.15, -0.1);
        this.upperGroup.add(this.casingShow);

        // === VOLUMETRIC MUZZLE FLASH ===
        this.flashGroup = new THREE.Group();
        this.flashGroup.position.set(0, 0.15, -1.15);
        this.chassisGroup.add(this.flashGroup);

        const flashMat = new THREE.MeshBasicMaterial({
            color: 0xff8833, transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide
        });
        const flashCoreMat = new THREE.MeshBasicMaterial({
            color: 0xffffff, transparent: true, opacity: 1, depthWrite: false
        });

        // 6-star volumetric points
        for (let i = 0; i < 6; i++) {
            const petal = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.28, 4), flashMat);
            petal.position.set(
                Math.sin(i * Math.PI / 3) * 0.08,
                Math.cos(i * Math.PI / 3) * 0.08,
                -0.12
            );
            petal.rotation.z = -i * Math.PI / 3;
            petal.rotation.x = Math.PI / 2;
            this.flashGroup.add(petal);
        }

        const flashCore = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), flashCoreMat);
        this.flashGroup.add(flashCore);
        this.flashGroup.visible = false;
        this.flashMat = flashMat;
        this.flashCoreMat = flashCoreMat;

        // Point light glow
        this.muzzleLight = new THREE.PointLight(0xff7722, 0, 6);
        this.muzzleLight.position.set(0, 0.15, -1.25);
        this.chassisGroup.add(this.muzzleLight);
    }

    fire() {
        // Open-bolt firing: bolt slams forward to 0.0 to fire and chamber!
        this.boltZ = 0.0;
        this.triggerZ = -0.20;
        this.lightIntensity = 3.2;
        this.flashScale = 1.0 + Math.random() * 0.45;
        this.strapSwing = 0.45; // loop pops backward

        // Show flash
        this.flashGroup.visible = true;
        this.flashGroup.rotation.z = Math.random() * Math.PI * 2;
        this.flashGroup.scale.setScalar(this.flashScale);

        // Eject shell and play 15Hz submachine gun audio crack
        this.spawnShell();
        this.spawnEjectionSmoke();
        this.playProceduralShot();
    }

    spawnShell() {
        const shellGeo = new THREE.CylinderGeometry(0.014, 0.012, 0.065, 8);
        const shell = new THREE.Mesh(shellGeo, this.brassMat);
        shell.castShadow = true;

        // Spawns perfectly from our new hollow ejection port on the right side
        const worldPos = new THREE.Vector3(0.08, 0.15, -0.2);
        worldPos.applyMatrix4(this.chassisGroup.matrixWorld);
        shell.position.copy(worldPos);
        shell.rotation.set(Math.random() * 6.28, Math.random() * 6.28, Math.random() * 6.28);

        const target = this.parent || window.scene;
        if (target) target.add(shell);

        // Eject out right and up
        const rightDir = new THREE.Vector3(1, 0, 0).applyQuaternion(this.getWorldQuaternion(new THREE.Quaternion()));
        const upDir = new THREE.Vector3(0, 1, 0).applyQuaternion(this.getWorldQuaternion(new THREE.Quaternion()));
        const ejectSpeed = 4.2 + Math.random() * 1.8;
        const upSpeed = 1.8 + Math.random() * 1.2;

        this.shells.push({
            mesh: shell,
            vx: rightDir.x * ejectSpeed + upDir.x * upSpeed,
            vy: rightDir.y * ejectSpeed + upDir.y * upSpeed + 1.5,
            vz: rightDir.z * ejectSpeed + upDir.z * upSpeed,
            rx: (Math.random() - 0.5) * 18,
            ry: (Math.random() - 0.5) * 18,
            rz: (Math.random() - 0.5) * 18,
            life: 1.8,
            bouncesLeft: 2
        });
    }

    spawnEjectionSmoke() {
        const target = this.parent || window.scene;
        if (!target) return;
        const smokeMat = new THREE.MeshBasicMaterial({ color: 0x999999, transparent: true, opacity: 0.25, depthWrite: false });
        for (let i = 0; i < 2; i++) {
            const smoke = new THREE.Mesh(new THREE.SphereGeometry(0.008 + Math.random() * 0.015, 4, 4), smokeMat.clone());
            const wp = new THREE.Vector3(0.08, 0.15, -0.2);
            wp.applyMatrix4(this.chassisGroup.matrixWorld);
            smoke.position.copy(wp);
            target.add(smoke);
            this.smokeParticles.push({
                mesh: smoke,
                vx: (Math.random() - 0.3) * 0.4,
                vy: 0.2 + Math.random() * 0.3,
                vz: (Math.random() - 0.5) * 0.2,
                life: 0.4 + Math.random() * 0.2
            });
        }
    }

    _playShellClink() {
        if (!window.audioCtx) return;
        const ctx = window.audioCtx;
        const t = ctx.currentTime;
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.setValueAtTime(3200 + Math.random() * 2000, t);
        o.frequency.exponentialRampToValueAtTime(900, t + 0.025);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.03, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
        o.connect(g).connect(ctx.destination);
        o.start(t); o.stop(t + 0.05);
    }

    playProceduralShot() {
        if (!window.audioCtx) window.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const ctx = window.audioCtx;
        if (ctx.state === 'suspended') ctx.resume();

        const t = ctx.currentTime;

        // Layer 1: MAC-10 high frequency signature snap
        const osc1 = ctx.createOscillator();
        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(2600, t);
        osc1.frequency.exponentialRampToValueAtTime(280, t + 0.015);
        const g1 = ctx.createGain();
        g1.gain.setValueAtTime(0.24, t);
        g1.gain.exponentialRampToValueAtTime(0.001, t + 0.028);
        osc1.connect(g1); g1.connect(ctx.destination);
        osc1.start(t); osc1.stop(t + 0.04);

        // Layer 2: Fast hollow pop thump
        const osc2 = ctx.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(105, t);
        osc2.frequency.exponentialRampToValueAtTime(45, t + 0.04);
        const g2 = ctx.createGain();
        g2.gain.setValueAtTime(0.26, t);
        g2.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
        osc2.connect(g2); g2.connect(ctx.destination);
        osc2.start(t); osc2.stop(t + 0.06);

        // Layer 3: Noise powder explosion burst
        const bufLen = ctx.sampleRate * 0.025;
        const noiseBuf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
        const data = noiseBuf.getChannelData(0);
        for (let i = 0; i < bufLen; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufLen * 0.12));
        const noise = ctx.createBufferSource();
        noise.buffer = noiseBuf;
        const nGain = ctx.createGain();
        nGain.gain.setValueAtTime(0.14, t);
        nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.025);
        const nFilter = ctx.createBiquadFilter();
        nFilter.type = 'bandpass';
        nFilter.frequency.value = 3800;
        nFilter.Q.value = 0.5;
        noise.connect(nFilter);
        nFilter.connect(nGain);
        nGain.connect(ctx.destination);
        noise.start(t); noise.stop(t + 0.035);
    }

    update(dt) {
        // Bolt carrier group reciprocation (blows back to the open resting state of 0.24)
        this.boltZ += (0.24 - this.boltZ) * 32 * dt;
        this.boltGroup.position.z = this.boltZ;

        // Hide internal casing when bolt is fully closed to simulate chambered state
        if (this.casingShow) {
            this.casingShow.visible = (this.boltZ > 0.04);
        }

        // Trigger return animation
        this.triggerZ += (-0.22 - this.triggerZ) * 20 * dt;
        this.triggerMesh.position.z = this.triggerZ;

        // Front loop strap hanger swing recoil physics
        this.strapSwing += (0 - this.strapSwing) * 8 * dt;
        this.hangerRing.rotation.x = -this.strapSwing * Math.PI * 0.5;

        // Muzzle light intensity decay
        this.lightIntensity = Math.max(0, this.lightIntensity - 60 * dt);
        this.muzzleLight.intensity = this.lightIntensity;

        // Muzzle flash mesh fade
        this.flashScale *= 0.65;
        if (this.flashScale < 0.05) {
            this.flashGroup.visible = false;
        } else {
            this.flashGroup.scale.setScalar(this.flashScale);
            this.flashMat.opacity = this.flashScale;
            this.flashCoreMat.opacity = Math.min(1, this.flashScale * 2);
        }

        // Casing physical floor bounce & audio clink triggers
        for (let i = this.shells.length - 1; i >= 0; i--) {
            const s = this.shells[i];
            s.vy -= 9.8 * dt;
            s.mesh.position.x += s.vx * dt;
            s.mesh.position.y += s.vy * dt;
            s.mesh.position.z += s.vz * dt;
            s.mesh.rotation.x += s.rx * dt;
            s.mesh.rotation.y += s.ry * dt;
            s.mesh.rotation.z += s.rz * dt;
            
            if (s.mesh.position.y < 0.05 && s.bouncesLeft > 0) {
                s.mesh.position.y = 0.05;
                s.vy = Math.abs(s.vy) * 0.28;
                s.vx *= 0.45;
                s.vz *= 0.45;
                s.rx *= 0.35; s.ry *= 0.35; s.rz *= 0.35;
                s.bouncesLeft--;
                this._playShellClink();
            }
            
            s.life -= dt;
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

        // Smoke particles venting from port
        for (let i = this.smokeParticles.length - 1; i >= 0; i--) {
            const sp = this.smokeParticles[i];
            sp.mesh.position.x += sp.vx * dt;
            sp.mesh.position.y += sp.vy * dt;
            sp.mesh.position.z += sp.vz * dt;
            sp.mesh.scale.multiplyScalar(1 + 1.8 * dt);
            sp.life -= dt;
            sp.mesh.material.opacity = Math.max(0, sp.life * 0.5);
            if (sp.life <= 0) {
                if (sp.mesh.parent) sp.mesh.parent.remove(sp.mesh);
                sp.mesh.geometry.dispose();
                sp.mesh.material.dispose();
                this.smokeParticles.splice(i, 1);
            }
        }
    }
}

window.Pistol = Pistol;
