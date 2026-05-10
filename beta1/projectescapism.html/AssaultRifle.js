/**
 * AssaultRifle — High-Fidelity Procedural M4/SCAR-Style Rifle
 * Features: Bolt carrier cycling, brass shell ejection, muzzle brake,
 * rail system, collapsible stock, magazine, and procedural audio.
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
        this.dustCoverRot = 0; // Dust cover opens on first fire

        // Particle pools
        this.shells = [];

        // Materials — Tactical milspec finish
        this.receiverMat = new THREE.MeshStandardMaterial({
            color: 0x1a1f28, roughness: 0.35, metalness: 0.85
        });
        this.railMat = new THREE.MeshStandardMaterial({
            color: 0x222831, roughness: 0.5, metalness: 0.7
        });
        this.barrelMat = new THREE.MeshStandardMaterial({
            color: 0x2d3440, roughness: 0.2, metalness: 0.95
        });
        this.polyMat = new THREE.MeshStandardMaterial({
            color: 0x0a0a0a, roughness: 0.85, metalness: 0.05
        });
        this.magMat = new THREE.MeshStandardMaterial({
            color: 0x14181e, roughness: 0.4, metalness: 0.6
        });
        this.brassMat = new THREE.MeshStandardMaterial({
            color: 0xb5943b, metalness: 0.85, roughness: 0.15
        });
        this.accentMat = new THREE.MeshStandardMaterial({
            color: 0x00aaff, emissive: 0x00aaff, emissiveIntensity: 0.4, roughness: 0.3, metalness: 0.9
        });
        this.sightDotMat = new THREE.MeshBasicMaterial({ color: 0x00ff44 });

        this.hasFired = false;
        this.buildRifle();
    }

    buildRifle() {
        // === UPPER RECEIVER ===
        this.upperGroup = new THREE.Group();
        this.add(this.upperGroup);

        // Main upper receiver body
        const upperGeo = new THREE.BoxGeometry(0.28, 0.26, 1.5);
        const upper = new THREE.Mesh(upperGeo, this.receiverMat);
        upper.position.set(0, 0.2, -0.1);
        upper.castShadow = true;
        this.upperGroup.add(upper);

        // Flat top rail (Picatinny)
        const topRailGeo = new THREE.BoxGeometry(0.22, 0.04, 1.4);
        const topRail = new THREE.Mesh(topRailGeo, this.railMat);
        topRail.position.set(0, 0.35, -0.15);
        this.upperGroup.add(topRail);

        // Rail teeth (Picatinny notches)
        for (let i = 0; i < 18; i++) {
            const tooth = new THREE.Mesh(
                new THREE.BoxGeometry(0.23, 0.015, 0.02),
                this.railMat
            );
            tooth.position.set(0, 0.365, -0.8 + i * 0.075);
            this.upperGroup.add(tooth);
        }

        // Ejection port cover (opens on fire)
        this.dustCover = new THREE.Mesh(
            new THREE.BoxGeometry(0.06, 0.12, 0.28),
            this.receiverMat
        );
        this.dustCover.position.set(0.155, 0.22, -0.05);
        this.upperGroup.add(this.dustCover);

        // Forward assist knob
        const fwdAssist = new THREE.Mesh(
            new THREE.CylinderGeometry(0.03, 0.03, 0.06, 8),
            this.receiverMat
        );
        fwdAssist.rotation.z = Math.PI / 2;
        fwdAssist.position.set(0.17, 0.28, 0.2);
        this.upperGroup.add(fwdAssist);

        // === BOLT CARRIER GROUP (Animated) ===
        this.boltGroup = new THREE.Group();
        this.upperGroup.add(this.boltGroup);

        const boltGeo = new THREE.BoxGeometry(0.14, 0.1, 0.6);
        const bolt = new THREE.Mesh(boltGeo, this.barrelMat);
        bolt.position.set(0, 0.2, 0.1);
        this.boltGroup.add(bolt);

        // Charging handle
        this.chHandle = new THREE.Mesh(
            new THREE.BoxGeometry(0.18, 0.04, 0.08),
            this.receiverMat
        );
        this.chHandle.position.set(0, 0.3, 0.55);
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

        // Gas block / front sight base
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

        // Muzzle brake / flash hider
        const muzzleGeo = new THREE.CylinderGeometry(0.06, 0.055, 0.18, 12);
        const muzzle = new THREE.Mesh(muzzleGeo, this.barrelMat);
        muzzle.rotation.x = Math.PI / 2;
        muzzle.position.set(0, 0.22, -3.5);
        this.add(muzzle);

        // Muzzle brake slots
        for (let i = 0; i < 4; i++) {
            const slot = new THREE.Mesh(
                new THREE.BoxGeometry(0.08, 0.015, 0.03),
                new THREE.MeshBasicMaterial({ color: 0x000000 })
            );
            slot.position.set(0, 0.22 + (i < 2 ? 0.04 : -0.04), -3.42 - i * 0.04);
            slot.rotation.z = (i % 2) * Math.PI / 2;
            this.add(slot);
        }

        // === HANDGUARD / RAIL SYSTEM ===
        const handguardGroup = new THREE.Group();
        this.add(handguardGroup);

        // Main handguard tube
        const hgGeo = new THREE.BoxGeometry(0.3, 0.28, 1.4);
        const hg = new THREE.Mesh(hgGeo, this.railMat);
        hg.position.set(0, 0.16, -1.55);
        handguardGroup.add(hg);

        // Side rails (left & right)
        for (let side of [-1, 1]) {
            const sideRail = new THREE.Mesh(
                new THREE.BoxGeometry(0.04, 0.06, 1.3),
                this.railMat
            );
            sideRail.position.set(0.17 * side, 0.16, -1.55);
            handguardGroup.add(sideRail);
        }

        // Bottom rail
        const bottomRail = new THREE.Mesh(
            new THREE.BoxGeometry(0.12, 0.04, 1.3),
            this.railMat
        );
        bottomRail.position.set(0, 0.0, -1.55);
        handguardGroup.add(bottomRail);

        // Ventilation cutouts
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
            new THREE.MeshStandardMaterial({ color: 0x111111 })
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

        // === PISTOL GRIP ===
        const gripGeo = new THREE.BoxGeometry(0.22, 0.9, 0.4);
        const grip = new THREE.Mesh(gripGeo, this.polyMat);
        grip.position.set(0, -0.55, 0.42);
        grip.rotation.x = Math.PI * 0.12;
        grip.castShadow = true;
        this.add(grip);

        // Grip texture ridges
        for (let i = 0; i < 6; i++) {
            const ridge = new THREE.Mesh(
                new THREE.BoxGeometry(0.24, 0.015, 0.38),
                this.polyMat
            );
            ridge.position.set(0, -0.3 - i * 0.1, 0.42);
            ridge.rotation.x = Math.PI * 0.12;
            this.add(ridge);
        }

        // Grip bottom cap
        const gripCap = new THREE.Mesh(
            new THREE.BoxGeometry(0.18, 0.04, 0.3),
            this.receiverMat
        );
        gripCap.position.set(0, -1.0, 0.52);
        gripCap.rotation.x = Math.PI * 0.12;
        this.add(gripCap);

        // === MAGAZINE ===
        this.magGroup = new THREE.Group();
        this.add(this.magGroup);

        const magBodyGeo = new THREE.BoxGeometry(0.16, 0.9, 0.3);
        const magBody = new THREE.Mesh(magBodyGeo, this.magMat);
        magBody.position.set(0, -0.55, 0.0);
        magBody.rotation.x = Math.PI * 0.02; // Slight curve
        this.magGroup.add(magBody);

        // Mag floor plate
        const magFloor = new THREE.Mesh(
            new THREE.BoxGeometry(0.17, 0.03, 0.32),
            this.receiverMat
        );
        magFloor.position.set(0, -1.0, 0.0);
        this.magGroup.add(magFloor);

        // Mag witness holes
        for (let i = 0; i < 3; i++) {
            const hole = new THREE.Mesh(
                new THREE.BoxGeometry(0.02, 0.04, 0.05),
                new THREE.MeshBasicMaterial({ color: 0x000000 })
            );
            hole.position.set(-0.09, -0.3 - i * 0.2, 0.0);
            this.magGroup.add(hole);
        }

        // === COLLAPSIBLE STOCK ===
        const stockGroup = new THREE.Group();
        this.add(stockGroup);

        // Buffer tube
        const bufferGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.0, 12);
        const buffer = new THREE.Mesh(bufferGeo, this.receiverMat);
        buffer.rotation.x = Math.PI / 2;
        buffer.position.set(0, 0.18, 1.1);
        stockGroup.add(buffer);

        // Stock body
        const stockBodyGeo = new THREE.BoxGeometry(0.2, 0.28, 0.5);
        const stockBody = new THREE.Mesh(stockBodyGeo, this.polyMat);
        stockBody.position.set(0, 0.16, 1.4);
        stockGroup.add(stockBody);

        // Buttpad (rubber)
        const buttpad = new THREE.Mesh(
            new THREE.BoxGeometry(0.18, 0.26, 0.04),
            new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.95 })
        );
        buttpad.position.set(0, 0.16, 1.66);
        stockGroup.add(buttpad);

        // Cheek weld riser
        const cheekWeld = new THREE.Mesh(
            new THREE.BoxGeometry(0.16, 0.06, 0.3),
            this.polyMat
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

        // === OPTIC ACCENT ===
        // Small holographic sight
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

        // Reticle dot
        const reticle = new THREE.Mesh(
            new THREE.SphereGeometry(0.008, 8, 8),
            this.sightDotMat
        );
        reticle.position.set(0, 0.48, -0.15);
        this.add(reticle);

        // === MUZZLE LIGHT ===
        this.muzzleLight = new THREE.PointLight(0x00aaff, 0, 6);
        this.muzzleLight.position.set(0, 0.22, -3.6);
        this.add(this.muzzleLight);

        // === ACCENT STRIP (Blue LED on handguard) ===
        const ledStrip = new THREE.Mesh(
            new THREE.BoxGeometry(0.02, 0.02, 1.0),
            this.accentMat
        );
        ledStrip.position.set(0.16, 0.0, -1.55);
        this.add(ledStrip);
    }

    fire() {
        this.boltZ = 0.35;
        this.gunPitch = 0.15;
        this.gunZ = 0.12;
        this.triggerRot = 0.2;
        this.lightIntensity = 2.5;

        if (!this.hasFired) {
            this.hasFired = true;
            this.dustCoverRot = -Math.PI / 2; // Open dust cover permanently
        }

        this.spawnShell();
        this.playProceduralShot();
    }

    spawnShell() {
        const shellGeo = new THREE.CylinderGeometry(0.025, 0.02, 0.14, 8);
        const shell = new THREE.Mesh(shellGeo, this.brassMat);

        const worldPos = new THREE.Vector3(0.2, 0.3, 0.05);
        worldPos.applyMatrix4(this.matrixWorld);
        shell.position.copy(worldPos);
        shell.rotation.set(Math.random(), Math.random(), Math.random());

        if (this.parent) this.parent.add(shell);
        else if (window.scene) window.scene.add(shell);

        this.shells.push({
            mesh: shell,
            vx: (0.12 + Math.random() * 0.08) * 6,
            vy: (0.15 + Math.random() * 0.12) * 5,
            vz: (Math.random() - 0.5) * 0.5,
            rx: Math.random() * 0.6,
            ry: Math.random() * 0.6,
            rz: Math.random() * 0.6,
            life: 1.2
        });
    }

    playProceduralShot() {
        if (!window.audioCtx) window.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const ctx = window.audioCtx;
        if (ctx.state === 'suspended') ctx.resume();

        const t = ctx.currentTime;

        // Layer 1: Tight supersonic crack (very fast attack/decay for full-auto clarity)
        const osc1 = ctx.createOscillator();
        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(2200, t);
        osc1.frequency.exponentialRampToValueAtTime(120, t + 0.018);
        const g1 = ctx.createGain();
        g1.gain.setValueAtTime(0.28, t);
        g1.gain.exponentialRampToValueAtTime(0.001, t + 0.035);
        osc1.connect(g1); g1.connect(ctx.destination);
        osc1.start(t); osc1.stop(t + 0.05);

        // Layer 2: Sub-bass punch (short, punchy)
        const osc2 = ctx.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(80, t);
        osc2.frequency.exponentialRampToValueAtTime(35, t + 0.06);
        const g2 = ctx.createGain();
        g2.gain.setValueAtTime(0.3, t);
        g2.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
        osc2.connect(g2); g2.connect(ctx.destination);
        osc2.start(t); osc2.stop(t + 0.08);

        // Layer 3: Noise burst (powder crack — bandpassed)
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

        // Layer 4: Bolt carrier return click (delayed metallic ping)
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
        // Bolt carrier return
        this.boltZ += (0 - this.boltZ) * 25 * dt;
        this.gunPitch += (0 - this.gunPitch) * 18 * dt;
        this.gunZ += (0 - this.gunZ) * 18 * dt;
        this.triggerRot += (0 - this.triggerRot) * 20 * dt;
        this.lightIntensity = Math.max(0, this.lightIntensity - 40 * dt);

        this.boltGroup.position.z = this.boltZ;
        this.triggerMesh.rotation.x = this.triggerRot;
        this.muzzleLight.intensity = this.lightIntensity;

        // Dust cover animation
        if (this.hasFired) {
            this.dustCover.rotation.x += (this.dustCoverRot - this.dustCover.rotation.x) * 10 * dt;
        }

        // LED pulse on accent strip
        if (this.accentMat) {
            this.accentMat.emissiveIntensity = 0.3 + Math.sin(Date.now() * 0.005) * 0.15;
        }

        // Shell physics
        for (let i = this.shells.length - 1; i >= 0; i--) {
            const s = this.shells[i];
            s.vy -= 9.8 * dt * 0.5;
            s.mesh.position.x += s.vx * dt;
            s.mesh.position.y += s.vy * dt;
            s.mesh.position.z += s.vz * dt;
            s.mesh.rotation.x += s.rx;
            s.mesh.rotation.y += s.ry;
            s.mesh.rotation.z += s.rz;
            s.life -= dt;
            if (s.life <= 0) {
                if (s.mesh.parent) s.mesh.parent.remove(s.mesh);
                this.shells.splice(i, 1);
            }
        }
    }
}

window.AssaultRifle = AssaultRifle;
