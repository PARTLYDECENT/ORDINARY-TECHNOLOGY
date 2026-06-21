/**
 * TentacleArm — Procedural Bio-Organic Cluster Appendage (IMMENSELY EVOLVED)
 * Features:
 * - Cluster Tendrils: 1 massive primary central tentacle flanked by 2 smaller companion tentacles writhing out of phase.
 * - Central Eyeball Socket: A wet, biological blinking eye at the base that tracks the target and dilates during strikes.
 * - Slime Spit Projectiles: Firing launches high-velocity green bio-slime spits that arc and create flat glowing splash decals on the ground.
 * - Advanced Flesh Materials: Wet translucent bio-luminescent suction cups, undulating back fins, and pulsing flesh.
 * - Bio-Slime Drips: Viscous tear-shaped drips falling from segments under gravity.
 */
class TentacleArm extends THREE.Group {
    constructor(isBlue = false) {
        super();
        this.name = "evolved_procedural_tentacle_arm";
        this.isBlue = isBlue;

        // Animation states
        this.idleTime = 0;
        this.grabPhase = 0;         
        this.grabExtend = 0;        
        this.absorbPulse = 0;       
        this.slimeTimer = 0;
        this.drips = [];
        this.spits = [];
        this.splashes = []; // Flat ground splashes

        // Charging & Overload States (required for manipulator compatibility)
        this.isCharging = false;
        this.chargeProgress = 0.0;
        this.whipComboType = 0;

        // Materials (Redesigned for slender blue tentacle with white prongs)
        this.fleshMat = new THREE.MeshStandardMaterial({
            color: 0x0044cc, 
            emissive: 0x001144, 
            emissiveIntensity: 1.0,
            roughness: 0.1, 
            metalness: 0.8,
            transparent: true, 
            opacity: 0.88
        });
        this.companionFleshMat = this.fleshMat; // Fallback
        this.suckerMat = new THREE.MeshStandardMaterial({
            color: 0x00f3ff, 
            emissive: 0x00a8e8, 
            emissiveIntensity: 2.2,
            transparent: true, 
            opacity: 0.95
        });
        this.glowMat = new THREE.MeshStandardMaterial({
            color: 0x00ffff, 
            emissive: 0x0088cc, 
            emissiveIntensity: 3.5,
            transparent: true, 
            opacity: 0.85
        });
        this.baseMat = new THREE.MeshStandardMaterial({
            color: 0x0a1c3a, 
            roughness: 0.2, 
            metalness: 0.8
        });
        this.finMat = new THREE.MeshStandardMaterial({
            color: 0x0088ff, 
            emissive: 0x0044aa, 
            emissiveIntensity: 1.8,
            transparent: true, 
            opacity: 0.65, 
            roughness: 0.05, 
            metalness: 0.2,
            side: THREE.DoubleSide
        });
        this.slimeMat = new THREE.MeshStandardMaterial({
            color: 0x00f3ff, 
            emissive: 0x00a8e8, 
            emissiveIntensity: 3.0,
            transparent: true, 
            opacity: 0.9, 
            roughness: 0.05, 
            metalness: 0.1
        });
        this.prongMat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0xffffff,
            emissiveIntensity: 3.5,
            roughness: 0.1,
            metalness: 0.1
        });
        
        // Eyeball materials
        this.scleraMat = new THREE.MeshStandardMaterial({
            color: 0xddddff, 
            roughness: 0.05, 
            metalness: 0.1
        });
        this.irisMat = new THREE.MeshStandardMaterial({
            color: 0x00f3ff, 
            emissive: 0x0088cc, 
            emissiveIntensity: 4.0, 
            roughness: 0.1
        });

        this.segments = [];
        this.suckers = [];
        this.veins = [];
        this.fins = [];
        this.claws = [];

        this.leftSegments = [];
        this.rightSegments = [];

        this.buildTentacleSystem();
    }

    buildTentacleSystem() {
        this.baseRoot = new THREE.Group();
        this.add(this.baseRoot);

        // 1. Organic Base Collar
        const collar = new THREE.Mesh(
            new THREE.CylinderGeometry(0.20, 0.25, 0.22, 16),
            this.baseMat
        );
        collar.rotation.x = Math.PI / 2;
        this.baseRoot.add(collar);

        // 2. Central Eyeball Socket
        const eyeSocket = new THREE.Mesh(
            new THREE.SphereGeometry(0.12, 12, 12),
            this.baseMat
        );
        eyeSocket.position.set(0, 0.12, -0.04);
        this.baseRoot.add(eyeSocket);

        const eyeSclera = new THREE.Mesh(
            new THREE.SphereGeometry(0.09, 12, 12),
            this.scleraMat
        );
        eyeSclera.position.set(0, 0.12, -0.06);
        this.baseRoot.add(eyeSclera);
        this.eyeball = eyeSclera;

        const eyeIris = new THREE.Mesh(
            new THREE.CylinderGeometry(0.038, 0.038, 0.01, 16),
            this.irisMat
        );
        eyeIris.rotation.x = Math.PI / 2;
        eyeIris.position.set(0, 0.12, -0.145);
        this.baseRoot.add(eyeIris);
        this.iris = eyeIris;

        // 3. Main Central Tentacle (14 segments, slender and sleek)
        const SEG_COUNT = 14;
        const SEG_LEN = 0.25;
        let parent = this.baseRoot;

        for (let i = 0; i < SEG_COUNT; i++) {
            const segGroup = new THREE.Group();
            segGroup.position.set(0, 0, -SEG_LEN);
            
            // Slender and sleek taper
            const taper = Math.pow(1.0 - (i / SEG_COUNT), 1.4);
            const radius = 0.08 * taper + 0.012;

            const segMesh = new THREE.Mesh(
                new THREE.CylinderGeometry(radius * 0.9, radius, SEG_LEN, 12),
                this.fleshMat
            );
            segMesh.rotation.x = Math.PI / 2;
            segMesh.position.set(0, 0, -SEG_LEN / 2);
            segGroup.add(segMesh);

            // Undulating Membrane Fin
            const finGeo = new THREE.BoxGeometry(0.003, radius * 1.8, SEG_LEN);
            const fin = new THREE.Mesh(finGeo, this.finMat);
            fin.position.set(0, radius * 0.9, -SEG_LEN / 2);
            segGroup.add(fin);
            this.fins.push(fin);

            // Peristaltic Vein Detail (Blue Pulse)
            if (i % 2 === 0) {
                const veinMatInstance = this.glowMat.clone();
                const vein = new THREE.Mesh(
                    new THREE.TorusGeometry(radius * 1.05, 0.007, 6, 12),
                    veinMatInstance
                );
                vein.rotation.y = Math.PI / 2;
                vein.position.set(0, 0, -SEG_LEN / 2);
                segGroup.add(vein);
                this.veins.push({ mesh: vein, mat: veinMatInstance, baseRadius: radius * 1.05, index: i });
            }

            // Suckers
            if (i > 1 && i % 2 === 0) {
                const suckerMatInstance = this.suckerMat.clone();
                const sucker = new THREE.Mesh(
                    new THREE.CylinderGeometry(radius * 0.45, radius * 0.55, 0.02, 8),
                    suckerMatInstance
                );
                sucker.position.set(0, -radius, -SEG_LEN / 2);
                sucker.rotation.x = Math.PI / 2;
                segGroup.add(sucker);
                this.suckers.push({ mesh: sucker, mat: suckerMatInstance, baseScale: 1.0, index: i });
            }

            parent.add(segGroup);
            this.segments.push(segGroup);
            parent = segGroup;
        }

        // Bio-Glow Core tip
        this.tipMatInstance = this.glowMat.clone();
        this.tip = new THREE.Mesh(
            new THREE.SphereGeometry(0.035, 10, 10),
            this.tipMatInstance
        );
        parent.add(this.tip);

        // Grasping organic prongs (3 small spikey white prongs at the end)
        for (let c = 0; c < 3; c++) {
            const clawGroup = new THREE.Group();
            const angle = (c / 3) * Math.PI * 2;
            clawGroup.rotation.z = angle;
            
            // Slender white spike prong
            const prongGeo = new THREE.ConeGeometry(0.008, 0.12, 6);
            prongGeo.translate(0, 0.06, 0);
            prongGeo.rotateX(Math.PI / 2 + 0.35); // Pointing forward/outward

            const prongMesh = new THREE.Mesh(
                prongGeo,
                this.prongMat
            );
            prongMesh.position.set(0, 0.02, -0.02);
            clawGroup.add(prongMesh);
            
            parent.add(clawGroup);
            this.claws.push(prongMesh);
        }

        this.tipLight = new THREE.PointLight(0x00a8ff, 1.2, 5);
        parent.add(this.tipLight);

        // Companion Side Tentacles: REMOVED for singular design
        this.leftSegments = [];
        this.rightSegments = [];
    }

    buildCompanionTentacle(offsetX, offsetY, offsetZ, list, angleZ) {
        // Disabled for singular design
    }

    fire() {
        this.grabPhase = 1;
        this.absorbPulse = 1.0;
        this.playProceduralWetSound();

        // Spew multiple slime spit projectiles forward!
        const tipWorldPos = new THREE.Vector3();
        this.tip.getWorldPosition(tipWorldPos);

        const targetDir = new THREE.Vector3(0, 0, -1);
        targetDir.applyQuaternion(this.getWorldQuaternion(new THREE.Quaternion()));

        for (let i = 0; i < 4; i++) {
            const spreadX = (Math.random() - 0.5) * 0.15;
            const spreadY = (Math.random() - 0.5) * 0.12 - 0.05;
            const spreadZ = (Math.random() - 0.5) * 0.15;

            const speed = 25.0 + Math.random() * 8.0;
            const spitVel = new THREE.Vector3(
                (targetDir.x + spreadX) * speed,
                (targetDir.y + spreadY) * speed * 0.4 + 2.5,
                (targetDir.z + spreadZ) * speed
            );
            this.spawnSlimeSpit(tipWorldPos, spitVel);
        }
    }

    playProceduralWetSound() {
        if (!window.audioCtx) window.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const ctx = window.audioCtx;
        if (ctx.state === 'suspended') ctx.resume();

        const t = ctx.currentTime;
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(350, t);
        osc.frequency.exponentialRampToValueAtTime(60, t + 0.28);
        
        const mod = ctx.createOscillator();
        mod.type = 'sawtooth';
        mod.frequency.setValueAtTime(140, t);
        
        const modGain = ctx.createGain();
        modGain.gain.setValueAtTime(80, t);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.20, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.32);

        mod.connect(modGain);
        modGain.connect(osc.frequency);
        osc.connect(gain);
        gain.connect(ctx.destination);

        mod.start();
        osc.start();
        mod.stop(t + 0.35);
        osc.stop(t + 0.35);
    }

    spawnSlimeDrip(pos, velocity) {
        const slimeMesh = new THREE.Mesh(
            new THREE.SphereGeometry(0.015, 6, 6),
            this.slimeMat
        );
        slimeMesh.position.copy(pos);
        if (this.parent) this.parent.add(slimeMesh);
        else window.scene.add(slimeMesh);

        this.drips.push({
            mesh: slimeMesh,
            velocity: velocity,
            life: 1.8,
            initialScaleY: 1.0
        });
    }

    spawnSlimeSpit(pos, velocity) {
        const spitMesh = new THREE.Mesh(
            new THREE.SphereGeometry(0.045, 8, 8),
            this.slimeMat
        );
        spitMesh.position.copy(pos);
        if (this.parent) this.parent.add(spitMesh);
        else window.scene.add(spitMesh);

        this.spits.push({
            mesh: spitMesh,
            velocity: velocity,
            life: 2.0
        });
    }

    spawnSplashDecal(pos) {
        // Flat ground puddle decal on the ground
        const splashGeo = new THREE.RingGeometry(0.01, 0.26, 12);
        const splashMat = new THREE.MeshBasicMaterial({
            color: this.isBlue ? 0x00f3ff : 0x00ff55,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });
        const splashMesh = new THREE.Mesh(splashGeo, splashMat);
        splashMesh.rotation.x = Math.PI / 2; // Flat on ground
        splashMesh.position.copy(pos);
        splashMesh.position.y += 0.01; // Avoid Z-fighting

        if (this.parent) this.parent.add(splashMesh);
        else window.scene.add(splashMesh);

        this.splashes.push({
            mesh: splashMesh,
            mat: splashMat,
            life: 1.5,
            maxLife: 1.5
        });
    }    update(a1, a2, a3, a4, a5, a6, a7) {
        let uTime, dt, isFiring, isADS, mouseVelX, mouseVelY, grabbedZombieWorldPos;
        if (typeof a2 === 'boolean' || a2 === undefined) {
            // update(dt, isADS) signature (from non-manipulator update path)
            dt = a1;
            isADS = a2 || false;
            uTime = this.idleTime + dt; // synthesize uTime
            isFiring = false;
            mouseVelX = 0;
            mouseVelY = 0;
            grabbedZombieWorldPos = null;
        } else {
            // update(uTime, delta, isFiring, isADS, mouseVelX, mouseVelY, grabbedZombieWorldPos) signature
            uTime = a1;
            dt = a2;
            isFiring = a3;
            isADS = a4;
            mouseVelX = a5 || 0;
            mouseVelY = a6 || 0;
            grabbedZombieWorldPos = a7 || null;
        }

        this.idleTime = uTime;
        this.absorbPulse = Math.max(0, this.absorbPulse - dt * 2.0);

        if (this.adsAlpha === undefined) this.adsAlpha = 0;
        if (isADS) {
            this.adsAlpha = Math.min(1.0, this.adsAlpha + dt * 10.0);
        } else {
            this.adsAlpha = Math.max(0.0, this.adsAlpha - dt * 10.0);
        }

        const t = this.adsAlpha;

        // Bending logic if zombie is grabbed
        let targetRotX = 0;
        let targetRotY = 0;
        if (grabbedZombieWorldPos) {
            try {
                const localZombie = grabbedZombieWorldPos.clone();
                this.worldToLocal(localZombie);
                
                // Calculate angle to local zombie
                const angleY = Math.atan2(localZombie.x, -localZombie.z); // Yaw
                const distXZ = Math.sqrt(localZombie.x * localZombie.x + localZombie.z * localZombie.z);
                const angleX = Math.atan2(localZombie.y, distXZ); // Pitch
                
                // Distribute the rotation along the segments
                targetRotX = angleX / this.segments.length;
                targetRotY = angleY / this.segments.length;
            } catch (err) {
                console.error("Tentacle targeting error:", err);
            }
        }

        // A. Primary Tentacle undulating writhing movement
        this.segments.forEach((seg, i) => {
            const freqX = 2.5;
            const freqY = 1.2;
            const phase = i * 0.38;
            
            // Reduce writhing when focusing (ADS)
            const noiseX = Math.sin(this.idleTime * freqX + phase) * 0.07 + Math.sin(this.idleTime * 0.8 + phase) * 0.08;
            const noiseY = Math.cos(this.idleTime * freqY + phase) * 0.07 + Math.cos(this.idleTime * 1.1 + phase) * 0.08;

            if (grabbedZombieWorldPos) {
                // Blend noise with target rotation to bend towards the zombie!
                // Extreme vibration ripple if charging
                const vib = this.isCharging ? 0.04 * this.chargeProgress * Math.sin(this.idleTime * 60) : 0;
                seg.rotation.x = THREE.MathUtils.lerp(seg.rotation.x, targetRotX + noiseX * 0.2 + vib, dt * 10.0);
                seg.rotation.y = THREE.MathUtils.lerp(seg.rotation.y, targetRotY + noiseY * 0.2 + vib, dt * 10.0);
            } else {
                seg.rotation.x = noiseX * (1.0 - this.grabExtend) * (1.0 - t * 0.75);
                seg.rotation.y = noiseY * (1.0 - this.grabExtend) * (1.0 - t * 0.75);
            }
        });

        // B. Companion Tentacles writhing out-of-phase (Flanking movement)
        this.leftSegments.forEach((seg, i) => {
            const phase = i * 0.45;
            seg.rotation.x = Math.sin(this.idleTime * 3.4 + phase + 1.5) * 0.12 * (1.0 - t * 0.75);
            seg.rotation.y = Math.cos(this.idleTime * 2.2 + phase - 0.8) * 0.10 * (1.0 - t * 0.75);
        });

        this.rightSegments.forEach((seg, i) => {
            const phase = i * 0.45;
            seg.rotation.x = Math.cos(this.idleTime * 3.1 + phase - 1.2) * 0.12 * (1.0 - t * 0.75);
            seg.rotation.y = Math.sin(this.idleTime * 2.5 + phase + 0.4) * 0.10 * (1.0 - t * 0.75);
        });

        // C. Central eyeball target tracking and dilation
        if (this.eyeball && this.iris) {
            // Track pupil dilation (dilates menacingly when ready to grab)
            const dilation = 1.0 + Math.sin(this.idleTime * 8.0) * 0.12 + this.absorbPulse * 0.9 + t * 0.6;
            this.iris.scale.set(dilation, 1.0, dilation);

            // Change eye to deep neon blue/purple when aiming
            if (t > 0.05) {
                this.iris.material.color.setHex(0x3300ff);
                this.iris.material.emissive.setHex(0x2200cc);
                this.iris.material.emissiveIntensity = 3.0 + t * 4.0;
            } else {
                this.iris.material.color.setHex(0x00f3ff);
                this.iris.material.emissive.setHex(0x0088cc);
                this.iris.material.emissiveIntensity = 3.0;
            }

            // Eyeball twitching look
            if (Math.sin(this.idleTime * 2.5) > 0.92) {
                this.eyeball.rotation.x = (Math.random() - 0.5) * 0.15;
                this.eyeball.rotation.y = (Math.random() - 0.5) * 0.15;
                this.iris.position.x = this.eyeball.rotation.y * 0.2;
                this.iris.position.y = 0.12 - this.eyeball.rotation.x * 0.2;
            }
        }

        // D. Membrane fin wave animation
        this.fins.forEach((fin, i) => {
            const wave = Math.sin(this.idleTime * 8.0 - i * 0.45) * 0.35;
            fin.rotation.z = wave;
        });

        // E. Peristaltic wave pumping animation along the veins (pumps faster and brighter when aiming!)
        this.veins.forEach((veinObj) => {
            const waveSpeed = 9.0 + t * 13.0; // Rapid biological vibration
            const wave = Math.sin(this.idleTime * waveSpeed - veinObj.index * 0.6) * 0.5 + 0.5;
            const pulseGlow = (1.5 + wave * 3.0) + this.absorbPulse * 10.0 + t * 4.0;
            veinObj.mat.emissiveIntensity = pulseGlow;
            
            const dynamicScale = 1.0 + wave * 0.14 + this.absorbPulse * 0.4 + t * 0.15;
            veinObj.mesh.scale.set(dynamicScale, dynamicScale, 1.0);
        });

        // F. Sucker pulsation and sizing
        this.suckers.forEach((suckerObj) => {
            const wave = Math.sin(this.idleTime * 6.0 + suckerObj.index * 0.4) * 0.3 + 0.7;
            const glow = 1.0 + wave * 1.8 + this.absorbPulse * 7.0 + t * 2.5;
            suckerObj.mat.emissiveIntensity = glow;

            const scaleFactor = 1.0 + wave * 0.12 + this.absorbPulse * 0.55 + t * 0.2;
            suckerObj.mesh.scale.set(scaleFactor, scaleFactor, scaleFactor);
        });

        // G. Dynamic claw grasping logic (flares wide when aiming/blocking)
        this.claws.forEach((claw, idx) => {
            let targetCurl = 0.35 + Math.sin(this.idleTime * 4.5 + idx) * 0.12;
            if (this.absorbPulse > 0.65) {
                targetCurl = -0.22; // Flare open
            } else if (this.absorbPulse > 0.0) {
                targetCurl = 1.05; // Clench shut
            } else if (t > 0.05) {
                targetCurl = THREE.MathUtils.lerp(targetCurl, -0.35, t); // Flare wide ready to lock onto prey
            }
            claw.rotation.x += (targetCurl - claw.rotation.x) * 14.0 * dt;
        });

        // H. Glowing organic tip
        if (this.tip) {
            const tipGlow = 2.0 + Math.sin(this.idleTime * 6.0) * 1.2 + this.absorbPulse * 15.0 + t * 6.0;
            this.tipMatInstance.emissiveIntensity = tipGlow;
            this.tipLight.intensity = tipGlow * 0.45;
            this.tip.scale.setScalar(1.0 + Math.sin(this.idleTime * 14.0) * 0.06 + this.absorbPulse * 0.45 + t * 0.2);
        }

        // I. Slime drip spawner
        this.slimeTimer += dt;
        if (this.slimeTimer > 0.20) {
            this.slimeTimer = 0;
            if (this.segments.length > 0) {
                const randIdx = Math.floor(Math.random() * this.segments.length);
                const dripOrigin = new THREE.Vector3();
                this.segments[randIdx].getWorldPosition(dripOrigin);
                dripOrigin.y -= 0.06;

                const dripVel = new THREE.Vector3(
                    (Math.random() - 0.5) * 0.4,
                    -1.5 - Math.random() * 1.2,
                    (Math.random() - 0.5) * 0.4
                );
                this.spawnSlimeDrip(dripOrigin, dripVel);
            }
        }

        // J. Drip Physics Update
        for (let i = this.drips.length - 1; i >= 0; i--) {
            const drip = this.drips[i];
            drip.velocity.y -= 9.8 * dt;
            
            drip.mesh.position.addScaledVector(drip.velocity, dt);

            const speed = Math.abs(drip.velocity.y);
            drip.mesh.scale.set(Math.max(0.18, 1.0 - speed * 0.16), 1.0 + speed * 0.45, Math.max(0.18, 1.0 - speed * 0.16));

            drip.life -= dt;
            if (drip.life <= 0) {
                if (drip.mesh.parent) drip.mesh.parent.remove(drip.mesh);
                this.drips.splice(i, 1);
            }
        }

        // K. Slime Spit Projectiles Physics & Ground Splashes
        for (let i = this.spits.length - 1; i >= 0; i--) {
            const spit = this.spits[i];
            spit.velocity.y -= 7.5 * dt; // Gravity arc
            spit.mesh.position.addScaledVector(spit.velocity, dt);

            let groundY = -99;
            if (window.TerrainGen && typeof window.TerrainGen.getMeshHeight === 'function') {
                groundY = window.TerrainGen.getMeshHeight(spit.mesh.position.x, spit.mesh.position.z);
            }

            spit.life -= dt;
            const hitGround = spit.mesh.position.y <= groundY + 0.08;

            if (spit.life <= 0 || hitGround) {
                if (hitGround) {
                    this.spawnSplashDecal(new THREE.Vector3(spit.mesh.position.x, groundY + 0.01, spit.mesh.position.z));
                }
                if (spit.mesh.parent) spit.mesh.parent.remove(spit.mesh);
                this.spits.splice(i, 1);
            }
        }

        // L. Decal fading updates
        for (let i = this.splashes.length - 1; i >= 0; i--) {
            const splash = this.splashes[i];
            splash.life -= dt;
            
            const pct = splash.life / splash.maxLife;
            splash.mesh.scale.setScalar(2.0 - pct); // Expand outward as it fades
            splash.mat.opacity = pct * 0.85;

            if (splash.life <= 0) {
                if (splash.mesh.parent) splash.mesh.parent.remove(splash.mesh);
                this.splashes.splice(i, 1);
            }
        }

        // M. Absorb body pulse scaling
        if (this.absorbPulse > 0.05) {
            this.scale.setScalar(1.0 + Math.sin(this.idleTime * 25.0) * 0.07 * this.absorbPulse);
        } else {
            this.scale.setScalar(1.0);
        }
    }
}

window.TentacleArm = TentacleArm;
