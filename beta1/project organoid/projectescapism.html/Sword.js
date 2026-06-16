/**
 * Knightly Longsword — Real Steel Melee Weapon (IMMENSELY EVOLVED)
 * Features:
 * - Tapered steel double-edged blade with fuller (blood groove).
 * - Curved guard/quillons with flory tips and golden brass bands.
 * - Brown leather-wrapped grip with gold brass cross-wrapping wires.
 * - Scent-stopper steel pommel with polished cap.
 * - Silver-white wind motion slash trail.
 * - Dynamic Sun Glints: Shiny diamond reflection flares sliding along the blade edges.
 * - Air Friction Spark Spray: Emits gold/orange iron filings sparks backwards during swings.
 * - Base guard stance (angled naturally in hand, not pointing straight like a gun).
 */
class Sword extends THREE.Group {
    constructor() {
        super();
        this.name = "evolved_steel_longsword";

        // Animation states
        this.slashAngle = 0;      
        this.swingPhase = 0;      
        this.swingTimer = 0;
        this.idleTime = 0;
        this.trailOpacity = 0;

        // Ribbon Trail Data
        this.trailPoints = [];
        this.maxTrailPoints = 14;
        this.trailGeometry = new THREE.PlaneGeometry(1, 1, 1, this.maxTrailPoints - 1);
        
        // Polished Silver Sweep Trail Shader
        this.trailMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                opacity: { value: 0.0 }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform float time;
                uniform float opacity;
                varying vec2 vUv;
                void main() {
                    float fade = pow(vUv.y, 1.8);
                    float widthGlow = sin(vUv.x * 3.14159);
                    
                    // Polished steel blade reflection colors
                    vec3 colorSilver = vec3(0.85, 0.90, 0.96);
                    vec3 colorWhite = vec3(1.0, 1.0, 1.0);
                    vec3 finalColor = mix(colorSilver, colorWhite, fade);
                    
                    // High-velocity wind streak
                    float streak = step(0.94, fract(vUv.y * 3.0 - time * 14.0)) * 0.15;
                    
                    gl_FragColor = vec4(finalColor + streak, fade * widthGlow * opacity * 0.65);
                }
            `,
            transparent: true,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        
        this.trailMesh = new THREE.Mesh(this.trailGeometry, this.trailMaterial);
        this.trailMesh.frustumCulled = false;

        // Materials
        this.steelMat = new THREE.MeshStandardMaterial({
            color: 0xc8d0d6,
            roughness: 0.14,
            metalness: 0.96
        });
        this.darkSteelMat = new THREE.MeshStandardMaterial({
            color: 0x484c50,
            roughness: 0.25,
            metalness: 0.85
        });
        this.brassMat = new THREE.MeshStandardMaterial({
            color: 0xd4af37, // Engraved gold/brass details
            roughness: 0.18,
            metalness: 0.95
        });
        this.leatherGripMat = new THREE.MeshStandardMaterial({
            color: 0x3d2114, // Rich brown leather
            roughness: 0.8,
            metalness: 0.05
        });
        this.leatherWrapMat = new THREE.MeshStandardMaterial({
            color: 0x1f100a, // Darker wrap details
            roughness: 0.85,
            metalness: 0.0
        });

        this.glints = [];

        this.buildSword();

        // Initialize trail points
        const tipPos = new THREE.Vector3();
        const basePos = new THREE.Vector3();
        this.tipMarker.getWorldPosition(tipPos);
        this.baseMarker.getWorldPosition(basePos);
        for (let i = 0; i < this.maxTrailPoints; i++) {
            this.trailPoints.push({ tip: tipPos.clone(), base: basePos.clone() });
        }
    }

    buildSword() {
        // Root pivot for slash and guard positioning
        this.bladeRoot = new THREE.Group();
        this.add(this.bladeRoot);
        this.add(this.trailMesh);

        // === BLADE ===
        // Polished tapered steel double-edged blade
        const bladeGeo = new THREE.BoxGeometry(0.14, 0.016, 3.1);
        const pos = bladeGeo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            const z = pos.getZ(i); // Z runs from -1.55 to 1.55
            // Taper towards the tip (Z is negative)
            if (z < 0) {
                const t = (1.55 + z) / 1.55; // 0 at tip, 1 at guard
                pos.setX(i, pos.getX(i) * Math.max(0.1, t));
                pos.setY(i, pos.getY(i) * Math.max(0.3, t));
            }
        }
        bladeGeo.computeVertexNormals();
        const blade = new THREE.Mesh(bladeGeo, this.steelMat);
        blade.position.set(0, 0, -1.95);
        blade.castShadow = true;
        blade.receiveShadow = true;
        this.bladeRoot.add(blade);

        // Fuller (Blood Groove) - Recessed dark steel center strip
        const fullerGeo = new THREE.BoxGeometry(0.024, 0.018, 2.3);
        const fuller = new THREE.Mesh(fullerGeo, this.darkSteelMat);
        fuller.position.set(0, 0, -1.75);
        this.bladeRoot.add(fuller);

        // === CROSSGUARD ===
        // Sleek curved steel crossguard
        const guardCenter = new THREE.Mesh(
            new THREE.BoxGeometry(0.16, 0.06, 0.08),
            this.steelMat
        );
        guardCenter.position.set(0, 0, -0.38);
        this.bladeRoot.add(guardCenter);

        for (let side of [-1, 1]) {
            const quillonGeo = new THREE.CylinderGeometry(0.025, 0.012, 0.4, 10);
            const quillon = new THREE.Mesh(quillonGeo, this.steelMat);
            quillon.rotation.z = Math.PI / 2 + (side * 0.12); // Curved forward
            quillon.position.set(0.24 * side, 0, -0.40);
            this.bladeRoot.add(quillon);
            
            // Flory tips at guard ends
            const guardTip = new THREE.Mesh(new THREE.SphereGeometry(0.026, 8, 8), this.steelMat);
            guardTip.position.set(0.44 * side, 0, -0.42);
            this.bladeRoot.add(guardTip);

            // Brass accent bands on crossguard base
            const band = new THREE.Mesh(new THREE.TorusGeometry(0.027, 0.005, 6, 12), this.brassMat);
            band.rotation.y = Math.PI / 2;
            band.position.set(0.12 * side, 0, -0.39);
            this.bladeRoot.add(band);
        }

        // === GRIP ===
        // Leather-wrapped grip
        const gripGeo = new THREE.CylinderGeometry(0.038, 0.042, 0.75, 12);
        const grip = new THREE.Mesh(gripGeo, this.leatherGripMat);
        grip.rotation.x = Math.PI / 2;
        grip.position.set(0, 0, 0.05);
        this.bladeRoot.add(grip);
        
        // Leather wrapping rings
        for (let i = 0; i < 9; i++) {
            const ring = new THREE.Mesh(
                new THREE.TorusGeometry(0.043, 0.005, 6, 12),
                this.leatherWrapMat
            );
            ring.rotation.x = Math.PI / 2;
            ring.position.set(0, 0, -0.28 + i * 0.075);
            this.bladeRoot.add(ring);
        }

        // Gold brass cross-wrapping wires on hilt grip
        for (let i = 0; i < 8; i++) {
            const wire = new THREE.Mesh(
                new THREE.TorusGeometry(0.042, 0.003, 4, 16),
                this.brassMat
            );
            wire.rotation.x = Math.PI / 2 + 0.12;
            wire.position.set(0, 0, -0.24 + i * 0.082);
            this.bladeRoot.add(wire);
        }

        // === POMMEL ===
        // Solid steel scent-stopper pommel
        const pommelGeo = new THREE.CylinderGeometry(0.03, 0.058, 0.16, 8);
        const pommel = new THREE.Mesh(pommelGeo, this.steelMat);
        pommel.rotation.x = Math.PI / 2;
        pommel.position.set(0, 0, 0.52);
        this.bladeRoot.add(pommel);
        
        const pommelCap = new THREE.Mesh(new THREE.SphereGeometry(0.058, 8, 8), this.steelMat);
        pommelCap.position.set(0, 0, 0.62);
        this.bladeRoot.add(pommelCap);

        // Brass accent ring at pommel connection
        const pommelBrass = new THREE.Mesh(new THREE.TorusGeometry(0.038, 0.004, 6, 12), this.brassMat);
        pommelBrass.rotation.x = Math.PI / 2;
        pommelBrass.position.set(0, 0, 0.44);
        this.bladeRoot.add(pommelBrass);

        // === SUN GLINTS ===
        // Diamond reflection flares sliding along the blade edges
        for (let i = 0; i < 2; i++) {
            const glint = new THREE.Mesh(
                new THREE.OctahedronGeometry(0.015, 0),
                new THREE.MeshBasicMaterial({
                    color: 0xffffff,
                    transparent: true,
                    opacity: 0.8,
                    blending: THREE.AdditiveBlending
                })
            );
            this.bladeRoot.add(glint);
            this.glints.push(glint);
        }

        // Tip markers for trail tracking
        this.tipMarker = new THREE.Object3D();
        this.tipMarker.position.set(0, 0, -3.5);
        this.bladeRoot.add(this.tipMarker);
        
        this.baseMarker = new THREE.Object3D();
        this.baseMarker.position.set(0, 0, -0.4);
        this.bladeRoot.add(this.baseMarker);
    }

    fire() {
        this.swingPhase = 1;
        this.swingTimer = 0;
        this.playSlashSound();
    }

    playSlashSound() {
        if (!window.audioCtx) window.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const ctx = window.audioCtx;
        if (ctx.state === 'suspended') ctx.resume();

        const t = ctx.currentTime;
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(800, t);
        osc.frequency.exponentialRampToValueAtTime(180, t + 0.18);
        
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.18, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(t + 0.25);
    }

    update(dt, isADS = false) {
        this.idleTime += dt;

        if (this.blockAlpha === undefined) this.blockAlpha = 0;

        // Transition blockAlpha smoothly based on isADS state
        if (isADS && this.swingPhase === 0) {
            this.blockAlpha = Math.min(1.0, this.blockAlpha + dt * 12.0);
        } else {
            this.blockAlpha = Math.max(0.0, this.blockAlpha - dt * 12.0);
        }

        // Base Guard stance offsets: Pointing slightly up/right, tilted naturally
        const baseRx = -0.55; 
        const baseRy = -0.35; 
        const baseRz = -0.50;

        // Block stance offsets: Diagonally guarding the face
        const blockRx = -1.15;
        const blockRy = 0.40;
        const blockRz = -1.25;

        const blockX = -0.08;
        const blockY = 0.06;
        const blockZ = 0.08;

        // === SWING ANIMATION ===
        if (this.swingPhase > 0) {
            this.swingTimer += dt;
            if (this.swingTimer < 0.12) {
                const p = this.swingTimer / 0.12;
                this.slashAngle = -2.5 * (1 - Math.pow(1 - p, 3));
            } else if (this.swingTimer < 0.35) {
                const p = (this.swingTimer - 0.12) / 0.23;
                this.slashAngle = -2.5 * (1 - p * p);
            } else {
                this.swingPhase = 0;
                this.slashAngle = 0;
            }

            // Animate swing arc starting from guard stance
            this.bladeRoot.rotation.x = baseRx + this.slashAngle * 1.1;
            this.bladeRoot.rotation.y = baseRy + this.slashAngle * 0.4;
            this.bladeRoot.rotation.z = baseRz - this.slashAngle * 0.8;
            this.bladeRoot.position.set(0, 0, 0);

            // === EMIT AIR FRICTION SPARKS ===
            if (typeof window.emitParticle === 'function') {
                const tipWorld = new THREE.Vector3();
                this.tipMarker.getWorldPosition(tipWorld);
                const baseWorld = new THREE.Vector3();
                this.baseMarker.getWorldPosition(baseWorld);

                for (let s = 0; s < 3; s++) {
                    const ratio = Math.random();
                    const sparkPos = new THREE.Vector3().lerpVectors(baseWorld, tipWorld, ratio);

                    const swingVel = new THREE.Vector3(
                        (Math.random() - 0.5) * 1.5,
                        (Math.random() - 0.5) * 1.5 - 0.8,
                        1.5 + Math.random() * 3.5
                    );
                    swingVel.applyQuaternion(this.getWorldQuaternion(new THREE.Quaternion()));

                    window.emitParticle(
                        sparkPos.x, sparkPos.y, sparkPos.z,
                        swingVel.x, swingVel.y, swingVel.z,
                        1.0, 0.65 + Math.random() * 0.25, 0.15, // Golden sparks
                        12 + Math.random() * 8,
                        0.2 + Math.random() * 0.25
                    );
                }
            }
        } else {
            // Lerp between Guard stance and Block stance
            const t = this.blockAlpha;
            
            const targetRx = THREE.MathUtils.lerp(baseRx, blockRx, t);
            const targetRy = THREE.MathUtils.lerp(baseRy, blockRy, t);
            const targetRz = THREE.MathUtils.lerp(baseRz, blockRz, t);

            const targetX = THREE.MathUtils.lerp(0.0, blockX, t);
            const targetY = THREE.MathUtils.lerp(0.0, blockY, t);
            const targetZ = THREE.MathUtils.lerp(0.0, blockZ, t);

            // Idle breathing sway in the guard position
            const swayX = Math.sin(this.idleTime * 2.2) * 0.02 * (1.0 - t);
            const swayZ = Math.cos(this.idleTime * 1.8) * 0.015 * (1.0 - t);

            this.bladeRoot.rotation.x = targetRx + swayX;
            this.bladeRoot.rotation.y = targetRy;
            this.bladeRoot.rotation.z = targetRz + swayZ;

            this.bladeRoot.position.set(targetX, targetY, targetZ);
        }

        // === SLIDING SUN GLINTS ===
        this.glints.forEach((glint, idx) => {
            const slideRatio = (Math.sin(this.idleTime * 1.6 + idx * Math.PI) + 1.0) / 2.0; // 0 to 1
            const localZ = -0.5 - slideRatio * 2.5;
            const side = idx === 0 ? 1 : -1;
            glint.position.set(0.075 * side, 0, localZ);

            const pulse = 0.5 + Math.sin(this.idleTime * 14.0 + idx * 6.0) * 0.5;
            glint.scale.set(pulse, pulse * 1.4, pulse);
        });

        // === RIBBON TRAIL GEOMETRY UPDATE ===
        const tipPos = new THREE.Vector3();
        const basePos = new THREE.Vector3();
        this.tipMarker.getWorldPosition(tipPos);
        this.baseMarker.getWorldPosition(basePos);

        this.trailPoints.unshift({ tip: tipPos.clone(), base: basePos.clone() });
        if (this.trailPoints.length > this.maxTrailPoints) this.trailPoints.pop();

        const positions = this.trailGeometry.attributes.position;
        for (let i = 0; i < this.maxTrailPoints; i++) {
            const point = this.trailPoints[i] || this.trailPoints[this.trailPoints.length - 1];
            if (point) {
                const localTip = point.tip.clone();
                const localBase = point.base.clone();
                this.worldToLocal(localTip);
                this.worldToLocal(localBase);

                positions.setXYZ(i * 2, localBase.x, localBase.y, localBase.z);
                positions.setXYZ(i * 2 + 1, localTip.x, localTip.y, localTip.z);
            }
        }
        positions.needsUpdate = true;

        if (this.trailMaterial.uniforms) {
            this.trailMaterial.uniforms.time.value = this.idleTime;
            this.trailMaterial.uniforms.opacity.value = this.swingPhase > 0 ? 0.80 : Math.max(0.0, this.trailMaterial.uniforms.opacity.value - dt * 4.5);
        }
    }
}

window.Sword = Sword;
