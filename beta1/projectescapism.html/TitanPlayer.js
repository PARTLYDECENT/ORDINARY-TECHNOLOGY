/**
 * TitanPlayer - Ported Procedural Titan (V3.1) from Babylon.js to Three.js
 * Features: Procedural hierarchy, IK-ready structure, and custom animations.
 */
class TitanPlayer extends THREE.Group {
    constructor(scene, options = {}) {
        super();
        this.name = "titan_player_root";
        this.scene = scene;

        // Settings & State
        this.health = 100;
        this.maxHealth = 100;
        this.isDead = false;
        this.t = Math.random() * 100;

        this.limbHealth = {
            head: 20, torso: 100,
            leftArm: 30, rightArm: 30,
            leftLeg: 40, rightLeg: 40
        };
        this.missingLimbs = {
            leftArm: false, rightArm: false,
            leftLeg: false, rightLeg: false
        };

        this.walkTime = 0;
        this.walkBlend = 0; // Smooth transition
        this.aimPitch = 0;
        this.recoil = 0;
        this.recoilLeft = 0;
        this.recoilRight = 0;
        this._lastFiredRight = false;
        this.fireCooldown = 0;

        this.leftWeaponMesh = null;
        this.rightWeaponMesh = null;

        // Ability System
        this.abilityType = options.abilityType || "dash"; // "dash", "shield", "scan"
        this.abilityCooldown = 0;
        this.abilityMaxCooldown = 10; // 10s base
        this.abilityActiveTime = 0;
        this.isDashing = false;
        this.isShielded = false;
        this.dashDir = new THREE.Vector3();

        this.setupMaterials();
        this.buildGeometry();

        // Add to scene
        this.scene.add(this);

        // Scale to match zombie height (~1.7-1.8 units)
        this.scale.setScalar(0.19);
    }

    setupMaterials() {
        // --- HAZMAT WARNING SHADER (ARMOR) ---
        this.armorMat = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uColorYellow: { value: new THREE.Color(0xffcc00) },
                uColorBlack: { value: new THREE.Color(0x111111) },
                uLightPos: { value: new THREE.Vector3(5, 10, 5) }
            },
            vertexShader: `
                varying vec3 vNormal;
                varying vec3 vModelPos;
                varying vec3 vViewPos;
                void main() {
                    vNormal = normalize(normalMatrix * normal);
                    vModelPos = position;
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    vViewPos = -mvPosition.xyz;
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                varying vec3 vNormal;
                varying vec3 vModelPos;
                varying vec3 vViewPos;
                uniform float uTime;
                uniform vec3 uColorYellow;
                uniform vec3 uColorBlack;

                void main() {
                    // --- STRIPE PATTERN ---
                    // Diagonal stripes based on local X+Y coordinates
                    float stripe = fract((vModelPos.x + vModelPos.y + vModelPos.z) * 1.5 - uTime * 0.5);
                    float mask = step(0.5, stripe);
                    vec3 baseCol = mix(uColorYellow, uColorBlack, mask);

                    // --- LIGHTING (SIMPLE PHONG-ISH) ---
                    vec3 n = normalize(vNormal);
                    vec3 l = normalize(vec3(0.5, 1.0, 0.5));
                    float diff = max(0.2, dot(n, l));
                    
                    // --- PULSING ENERGY ---
                    float pulse = 0.5 + 0.5 * sin(uTime * 3.0);
                    vec3 emissive = vec3(1.0, 0.4, 0.0) * pulse * 0.3;
                    
                    // --- EDGE GLOW / FRESNEL ---
                    float fresnel = 1.0 - max(0.0, dot(n, normalize(vViewPos)));
                    fresnel = pow(fresnel, 3.0);
                    
                    vec3 finalCol = baseCol * diff + emissive + (uColorYellow * fresnel * 0.5);
                    
                    gl_FragColor = vec4(finalCol, 1.0);
                }
            `
        });

        this.frameMat = new THREE.MeshStandardMaterial({
            color: 0x050505, metalness: 0.9, roughness: 0.8
        });
        this.accentMat = new THREE.MeshStandardMaterial({
            color: 0x333333, metalness: 0.9, roughness: 0.2
        });
        this.energyMat = new THREE.MeshStandardMaterial({
            color: 0x000000,
            emissive: new THREE.Color(0.0, 0.6, 1.0),
            emissiveIntensity: 3.5
        });
    }

    buildGeometry() {
        const armorMat = this.armorMat;
        const frameMat = this.frameMat;
        const accentMat = this.accentMat;
        const energyMat = this.energyMat;

        // --- ROOT OFFSET ---
        // In Babylon it was droidRoot.position.y = 6.6;
        // We'll use a droidRoot group inside the root.
        const droidRoot = new THREE.Group();
        droidRoot.position.y = 6.6;
        this.add(droidRoot);
        this.droidRoot = droidRoot;

        // --- TORSO ---
        // Note: Babylon CSG is missing, so we'll approximate the "angular/cut" look 
        // with merged boxes/cylinders for a high-fidelity tactical look.
        this.torso = new THREE.Group();
        droidRoot.add(this.torso);

        const torsoBase = new THREE.Mesh(new THREE.BoxGeometry(2.0, 2.4, 1.4), frameMat);
        this.torso.add(torsoBase);

        const shell = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.6, 1.5), armorMat);
        this.torso.add(shell);

        // Chest Core (Cylinder in Babylon)
        const chestCoreGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.5, 32);
        chestCoreGeo.rotateX(Math.PI / 2);
        this.chestCore = new THREE.Mesh(chestCoreGeo, energyMat);
        this.chestCore.position.set(0, 0.2, 0.75);
        this.torso.add(this.chestCore);

        // Chest Light — sinister red glow casting real light
        this.chestLight = new THREE.PointLight(0xff2200, 1.5, 6);
        this.chestCore.add(this.chestLight);

        // Vents
        for (let i = 0; i < 5; i++) {
            const vent = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.1, 0.3), accentMat);
            vent.position.set(0, 0.8 - (i * 0.25), -0.8);
            vent.rotation.x = 0.2;
            this.torso.add(vent);
        }

        // Spine
        this.spineRoot = new THREE.Group();
        droidRoot.add(this.spineRoot);
        for (let i = 0; i < 3; i++) {
            const vertGroup = new THREE.Group();
            vertGroup.position.y = -1.2 - (i * 0.45);
            this.spineRoot.add(vertGroup);
            vertGroup.name = "vert_" + i;

            const vert = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.4, 16), frameMat);
            vert.rotation.z = Math.PI / 2;
            vertGroup.add(vert);

            const vertArmor = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.3, 0.8), accentMat);
            vertArmor.position.set(0, 0, 0.1);
            vertGroup.add(vertArmor);
        }

        // Pelvis
        this.pelvis = new THREE.Group();
        this.pelvis.position.y = -2.6;
        droidRoot.add(this.pelvis);

        const pelvisCore = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.8, 1.2), frameMat);
        this.pelvis.add(pelvisCore);

        const skirtL = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.0, 1.4), armorMat);
        skirtL.position.set(-0.9, 0, 0); skirtL.rotation.z = -0.2;
        this.pelvis.add(skirtL);

        const skirtR = skirtL.clone();
        skirtR.position.x = 0.9; skirtR.rotation.z = 0.2;
        this.pelvis.add(skirtR);

        const skirtF = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.8, 0.3), armorMat);
        skirtF.position.set(0, -0.2, 0.7); skirtF.rotation.x = 0.2;
        this.pelvis.add(skirtF);

        // Head
        this.headRoot = new THREE.Group();
        this.headRoot.position.set(0, 1.6, 0.2);
        this.torso.add(this.headRoot);

        const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.8, 16), frameMat);
        neck.position.y = -0.2;
        this.headRoot.add(neck);

        const headBase = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.0, 1.6), armorMat);
        headBase.position.y = 0.5;
        this.headRoot.add(headBase);

        const visorGlowGeo = new THREE.CylinderGeometry(0.65, 0.65, 0.3, 32, 1, false, 0, 0.6 * Math.PI);
        visorGlowGeo.rotateY(-Math.PI / 2);
        visorGlowGeo.rotateZ(Math.PI / 2);
        const visorGlow = new THREE.Mesh(visorGlowGeo, energyMat);
        visorGlow.position.set(0, 0.6, 0.65);
        this.headRoot.add(visorGlow);

        const earL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.6, 0.6), accentMat);
        earL.position.set(-0.85, 0.5, -0.2);
        this.headRoot.add(earL);
        const earR = earL.clone(); earR.position.x = 0.85;
        this.headRoot.add(earR);

        // Legs & Arms builders
        this._createLeg = (isRight) => {
            const sign = isRight ? 1 : -1;
            const root = new THREE.Group();
            root.position.set(1.0 * sign, 0, 0);
            this.pelvis.add(root);

            const hip = new THREE.Group();
            root.add(hip);
            const hipMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.8, 16), frameMat);
            hipMesh.rotation.z = Math.PI / 2;
            hip.add(hipMesh);

            const thighFrame = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 2.0, 16), frameMat);
            thighFrame.position.y = -1.0;
            hip.add(thighFrame);

            const thighArmorF = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.8, 0.4), armorMat);
            thighArmorF.position.set(0, -1.0, 0.3); thighArmorF.rotation.x = 0.05;
            hip.add(thighArmorF);

            const knee = new THREE.Group();
            knee.position.y = -2.0;
            hip.add(knee);
            const kneeMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.9, 16), accentMat);
            kneeMesh.rotation.z = Math.PI / 2;
            knee.add(kneeMesh);

            const calfFrame = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 2.0, 16), frameMat);
            calfFrame.position.y = -1.0;
            knee.add(calfFrame);

            const ankle = new THREE.Group();
            ankle.position.y = -2.0;
            knee.add(ankle);
            const ankleJoint = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 16), frameMat);
            ankle.add(ankleJoint);

            const footBase = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.4, 1.2), armorMat);
            footBase.position.set(0, -0.2, 0.2);
            ankle.add(footBase);

            return { root, hip, knee, ankle };
        };

        this._createArm = (isRight) => {
            const sign = isRight ? 1 : -1;
            const root = new THREE.Group();
            root.position.set(1.5 * sign, 1.0, 0);
            this.torso.add(root);

            const shoulder = new THREE.Group();
            root.add(shoulder);
            const shoulderJoint = new THREE.Mesh(new THREE.SphereGeometry(0.45, 16, 16), frameMat);
            shoulder.add(shoulderJoint);

            for (let i = 0; i < 3; i++) {
                const pauldron = new THREE.Mesh(new THREE.SphereGeometry(0.6 + (i * 0.05), 16, 16, 0, Math.PI * 2, 0, Math.PI / 2), armorMat);
                pauldron.rotation.z = (Math.PI / 12) * sign * i;
                pauldron.position.set(0.1 * sign * i, 0.1 - (i * 0.05), 0);
                shoulder.add(pauldron);
            }

            const bicepFrame = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 1.6, 16), frameMat);
            bicepFrame.position.y = -0.8;
            shoulder.add(bicepFrame);

            const elbow = new THREE.Group();
            elbow.position.y = -1.6;
            shoulder.add(elbow);
            const elbowJoint = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.7, 16), accentMat);
            elbowJoint.rotation.z = Math.PI / 2;
            elbow.add(elbowJoint);

            const hand = new THREE.Group();
            hand.position.y = -1.7;
            elbow.add(hand);
            const palm = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 16), frameMat);
            hand.add(palm);

            return { root, shoulder, elbow, hand };
        };

        this.rightLeg = this._createLeg(true);
        this.leftLeg = this._createLeg(false);
        this.rightArm = this._createArm(true);
        this.leftArm = this._createArm(false);

        // Initial Pose
        this.rightLeg.hip.rotation.x = 0.15; this.rightLeg.knee.rotation.x = -0.3; this.rightLeg.ankle.rotation.x = 0.15;
        this.leftLeg.hip.rotation.x = 0.15; this.leftLeg.knee.rotation.x = -0.3; this.leftLeg.ankle.rotation.x = 0.15;
        this.rightArm.shoulder.rotation.z = 0.25; this.rightArm.shoulder.rotation.x = 0.1; this.rightArm.elbow.rotation.x = -0.4;
        this.leftArm.shoulder.rotation.z = -0.25; this.leftArm.shoulder.rotation.x = 0.1; this.leftArm.elbow.rotation.x = -0.4;
    }

    update(dt) {
        if (this.isDead) return;
        this.t += dt;

        // Update Shader Time
        if (this.armorMat && this.armorMat.uniforms) {
            this.armorMat.uniforms.uTime.value = this.t;
        }

        // Ability Cooldown & Active Durations
        if (this.abilityCooldown > 0) this.abilityCooldown -= dt;
        if (this.abilityActiveTime > 0) {
            this.abilityActiveTime -= dt;
            if (this.abilityActiveTime <= 0) {
                this.isDashing = false;
                this.isShielded = false;
                if (this.shieldMesh) this.shieldMesh.visible = false;
            }
        }

        // Apply Dashing Force
        if (this.isDashing) {
            this.position.addScaledVector(this.dashDir, 45 * dt);
            // Spawn dash particles
            if (typeof emitParticle === 'function') {
                emitParticle(this.position.x, this.position.y + 0.5, this.position.z,
                    (Math.random() - 0.5) * 2, Math.random(), (Math.random() - 0.5) * 2,
                    0.1, 0.6, 1.0, 3, 0.2);
            }
        }

        // Shield Mesh Follow & Pulse
        if (this.isShielded && this.shieldMesh) {
            this.shieldMesh.rotation.y += dt * 2;
            const pulse = 1.0 + Math.sin(this.t * 5) * 0.5;
            this.shieldMesh.material.emissiveIntensity = pulse;
            this.shieldMesh.material.opacity = 0.2 + pulse * 0.1;
        }

        this.animateNPC(dt);

        // Pulse energy
        if (this.energyMat) {
            const pulseSpeed = 5;
            this.energyMat.emissiveIntensity = 3.0 + Math.sin(this.t * pulseSpeed) * 1.5;
            if (this.chestLight) {
                this.chestLight.intensity = this.energyMat.emissiveIntensity * 0.4;
            }
        }

        if (this.recoil > 0) this.recoil *= Math.pow(0.0001, dt);
        if (this.recoilLeft > 0) this.recoilLeft *= Math.pow(0.0001, dt);
        if (this.recoilRight > 0) this.recoilRight *= Math.pow(0.0001, dt);
    }

    setFPSMode(enabled) {
        if (this.headRoot) this.headRoot.visible = !enabled;
    }

    fire() {
        this.recoil = 0.5;
        this._lastFiredRight = !this._lastFiredRight;
    }

    animateNPC(dt) {
        const wSpeed = 3.5;
        const wT = this.walkTime * wSpeed;
        const iT = this.t;

        const wBounce = Math.cos(wT * 2);
        const rHip = Math.sin(wT); const rSwing = Math.max(0, Math.cos(wT));
        const lHip = Math.sin(wT + Math.PI); const lSwing = Math.max(0, Math.cos(wT + Math.PI));
        const iBounce = Math.sin(this.t * 2);

        // Root Y Swagger (6.6 is base)
        const rootWalkY = 6.6 + wBounce * 0.18;
        const rootIdleY = 6.6;
        this.droidRoot.position.y = THREE.MathUtils.lerp(rootIdleY, rootWalkY, this.walkBlend);

        // Pelvis & Spine
        if (this.pelvis) {
            this.pelvis.rotation.y = THREE.MathUtils.lerp(0, Math.sin(wT) * 0.22, this.walkBlend);
            this.pelvis.rotation.z = THREE.MathUtils.lerp(0, -Math.cos(wT) * 0.08, this.walkBlend);
        }

        this.spineRoot.children.forEach((vertGroup, index) => {
            const walkVertY = -Math.sin(wT) * 0.08 * (index + 1);
            const walkVertX = -wBounce * 0.03 * (index + 1);
            vertGroup.rotation.y = THREE.MathUtils.lerp(0, walkVertY, this.walkBlend);
            vertGroup.rotation.x = THREE.MathUtils.lerp(-iBounce * 0.01 * (index + 1), walkVertX, this.walkBlend);
        });

        // Torso & Head
        const walkTorsoX = 0.1 - wBounce * 0.05;
        const walkTorsoY = -Math.sin(wT) * 0.15;
        const idleTorsoX = 0.1 - iBounce * 0.02;
        const idleTorsoY = -Math.sin(iT) * 0.05;

        this.torso.rotation.x = THREE.MathUtils.lerp(idleTorsoX + this.aimPitch, walkTorsoX + this.aimPitch, this.walkBlend);
        this.torso.rotation.y = THREE.MathUtils.lerp(idleTorsoY, walkTorsoY, this.walkBlend);
        this.torso.position.y = THREE.MathUtils.lerp(iBounce * 0.05, 0, this.walkBlend);

        this.headRoot.rotation.x = THREE.MathUtils.lerp(iBounce * 0.05 + this.aimPitch, wBounce * 0.05 + this.aimPitch, this.walkBlend);
        this.headRoot.rotation.y = THREE.MathUtils.lerp(Math.sin(iT) * 0.1, Math.sin(wT) * 0.1, this.walkBlend);

        // Legs
        const lerpLegs = (leg, hipVal, swingVal) => {
            const walkHip = 0.15 + hipVal * 0.65;
            const walkKnee = -0.3 + swingVal * 1.1;
            const walkAnkle = 0.15 - (walkHip - 0.15) - (walkKnee + 0.3) + (swingVal * 0.2);
            leg.hip.rotation.x = THREE.MathUtils.lerp(0.15, walkHip, this.walkBlend);
            leg.knee.rotation.x = THREE.MathUtils.lerp(-0.3, walkKnee, this.walkBlend);
            leg.ankle.rotation.x = THREE.MathUtils.lerp(0.15, walkAnkle, this.walkBlend);
        };
        lerpLegs(this.rightLeg, rHip, rSwing);
        lerpLegs(this.leftLeg, lHip, lSwing);

        // Arms
        const currentAimOffset = this.walkBlend > 0.1 ? -0.3 : -0.5; // Raise arms if moving/aiming
        const lerpArms = (arm, hipVal, isRight) => {
            const sign = isRight ? 1 : -1;
            const walkS_X = 0.1 - hipVal * 0.5;
            const walkS_Z = (0.25 * sign) + Math.cos(wT) * 0.05 * sign;
            const walkE_X = -0.4 - Math.max(0, hipVal) * 0.4;

            let armRecoil = (isRight === this._lastFiredRight) ? this.recoil : 0;
            let specificRecoil = isRight ? this.recoilRight : this.recoilLeft;
            let totalRecoil = armRecoil + specificRecoil;

            arm.shoulder.rotation.x = THREE.MathUtils.lerp(0.1 + currentAimOffset, walkS_X + currentAimOffset, this.walkBlend) - totalRecoil;
            arm.shoulder.rotation.z = THREE.MathUtils.lerp(0.25 * sign, walkS_Z, this.walkBlend);
            arm.elbow.rotation.x = THREE.MathUtils.lerp(-0.4, walkE_X, this.walkBlend) - totalRecoil;
        };
        lerpArms(this.rightArm, rHip, true);
        lerpArms(this.leftArm, lHip, false);
    }

    takeDamage(amount, region = "torso") {
        if (this.isDead) return;
        this.health -= amount;
        if (this.limbHealth[region] !== undefined) {
            this.limbHealth[region] -= amount;
            if (this.limbHealth[region] <= 0 && !this.missingLimbs[region]) {
                this.checkLimbDestruction(region);
            }
        }

        if (this.health <= 0) this.die();
    }

    checkLimbDestruction(region) {
        if (region === "leftArm" || region === "rightArm") {
            this.missingLimbs[region] = true;
            this.detachLimb(region === "leftArm" ? this.leftArm : this.rightArm);
        }
    }

    detachLimb(limb) {
        if (!limb || !limb.root) return;

        const limbRoot = limb.root;
        const worldPos = new THREE.Vector3();
        limbRoot.getWorldPosition(worldPos);

        // Sparks using project's emitParticle
        for (let i = 0; i < 20; i++) {
            if (typeof emitParticle === 'function') {
                emitParticle(
                    worldPos.x, worldPos.y, worldPos.z,
                    (Math.random() - 0.5) * 10, Math.random() * 10, (Math.random() - 0.5) * 10,
                    1.0, 0.8, 0, 3, 0.5
                );
            }
        }

        // Detach the limb from hierarchy
        this.scene.attach(limbRoot); // Move to world scene

        // Physics fall
        let velocityY = 2;
        const animateFall = () => {
            if (limbRoot.position.y > 0) {
                velocityY -= 9.8 * 0.016;
                limbRoot.position.y += velocityY * 0.016;
                limbRoot.rotation.x += 0.1;
                requestAnimationFrame(animateFall);
            } else {
                limbRoot.position.y = 0;
            }
        };
        animateFall();

        // Cleanup
        setTimeout(() => {
            if (limbRoot.parent) limbRoot.parent.remove(limbRoot);
        }, 10000);
    }

    die() {
        if (this.isDead) return;
        this.isDead = true;
        if (window.SFX) window.SFX.triggerPlayerDie();
        this.isDashing = false;
        this.isShielded = false;
        if (this.shieldMesh) this.shieldMesh.visible = false;

        // Basic collapse animation
        if (typeof TWEEN !== 'undefined') {
            new TWEEN.Tween(this.rotation)
                .to({ x: -Math.PI / 2 }, 1000)
                .easing(TWEEN.Easing.Bounce.Out)
                .start();
        } else {
            this.rotation.x = -Math.PI / 2;
        }
    }

    activateAbility() {
        if (this.abilityCooldown > 0 || this.isDead) return false;

        switch (this.abilityType) {
            case "dash":
                this.isDashing = true;
                this.abilityActiveTime = 0.25;
                this.abilityCooldown = 6.0;
                // Dash in the direction the titan is facing
                this.dashDir.set(0, 0, 1).applyQuaternion(this.quaternion);
                break;

            case "shield":
                this.isShielded = true;
                this.abilityActiveTime = 4.0;
                this.abilityCooldown = 15.0;
                if (!this.shieldMesh) this.createShield();
                this.shieldMesh.visible = true;
                break;

            case "scan":
                this.abilityCooldown = 12.0;
                if (window.triggerNeuralScan) window.triggerNeuralScan();
                break;
        }

        return true;
    }

    createShield() {
        const geo = new THREE.IcosahedronGeometry(1.5, 2);
        const mat = new THREE.MeshStandardMaterial({
            color: 0x00aaff,
            transparent: true,
            opacity: 0.3,
            emissive: 0x00aaff,
            emissiveIntensity: 2.0,
            side: THREE.DoubleSide
        });
        this.shieldMesh = new THREE.Mesh(geo, mat);
        this.shieldMesh.position.set(0, 1.0, 0);
        this.add(this.shieldMesh);
    }
}

// Global reference for index.html
window.TitanPlayer = TitanPlayer;
