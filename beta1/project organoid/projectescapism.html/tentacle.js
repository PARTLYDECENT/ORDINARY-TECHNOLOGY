/**
 * Ultra-Evolved WhipTentacle — Bio-Mechanical Combat Appendage
 * Features:
 * - Bio-Energy Overload Charging State: Claw jaws spin rapidly like a turbine, stinger oscillates, and shader uniforms glow white-hot.
 * - Symbiotic Auto-Swat State: Triggers rapid defensive swats to protect the player from rear/side threats.
 * - Dynamic GLSL shaders mapping Fresnel contours, plasma flow currents, and vibration offsets.
 */
class WhipTentacle extends THREE.Group {
    constructor() {
        super();
        this.name = "whip_tentacle";

        // 3 Control Points in Viewmodel Local Space
        this.p0 = new THREE.Vector3(0.3, -0.3, -0.6); // Base
        this.p1 = new THREE.Vector3(0.25, -0.15, -1.2); // Middle
        this.p2 = new THREE.Vector3(0.2, 0.1, -2.0); // Tip

        // Physics State Vectors
        this.v1 = new THREE.Vector3();
        this.v2 = new THREE.Vector3();

        // Animation States
        this.whipActive = false;
        this.whipTimer = 0;
        this.whipDuration = 0.35;
        this.whipComboType = 0; // 0 = Snap, 1 = Sweep
        
        // Charging & Overload States
        this.isCharging = false;
        this.chargeProgress = 0.0;

        // Auto-Swat State (Passive Defensive Guard)
        this.autoSwatActive = false;
        this.autoSwatTimer = 0.0;
        this.autoSwatDuration = 0.26;
        this.localSwatTarget = new THREE.Vector3();

        // Claw Jaw articulation angles
        this.clawOpenAngle = 0.25;

        this.segmentCount = 24;
        this.joints = [];
        this.connectors = [];
        this.shaderMaterials = [];

        // Dynamic GLSL Shaders
        const vertexShader = `
            varying vec3 vNormal;
            varying vec3 vViewPosition;
            varying vec2 vUv;
            
            void main() {
                vUv = uv;
                vNormal = normalize(normalMatrix * normal);
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                vViewPosition = -mvPosition.xyz;
                gl_Position = projectionMatrix * mvPosition;
            }
        `;

        const fragmentShader = `
            uniform float uTime;
            uniform float uLengthPct;
            uniform vec3 uActiveColor;
            uniform float uEmissionPulse;
            uniform float uVibration;

            varying vec3 vNormal;
            varying vec3 vViewPosition;
            varying vec2 vUv;

            void main() {
                vec3 normal = normalize(vNormal);
                vec3 viewDir = normalize(vViewPosition);

                // 1. Fresnel rim highlight
                float fresnel = pow(1.0 - max(0.0, dot(normal, viewDir)), 3.0);

                // 2. Scrolling plasma core pulses
                float speed = 16.0 + uVibration * 24.0;
                float pulse = sin(uLengthPct * 12.0 - uTime * speed) * 0.5 + 0.5;
                pulse = pow(pulse, 4.0) * (1.6 + uVibration * 1.5);

                // 3. Cybernetic scanline overlays
                float scanline = sin(vViewPosition.y * 120.0 + uTime * 4.0) * 0.12 + 0.88;

                // 4. Hexagonal coordinate glow
                float grid = sin(vUv.x * 20.0) * sin(vUv.y * 20.0);
                float gridPulse = step(0.9, grid) * 0.35;

                vec3 baseColor = vec3(0.05, 0.07, 0.10) * scanline;
                vec3 glowColor = uActiveColor * (fresnel * 1.8 + pulse + gridPulse + uEmissionPulse * 6.5);
                vec3 fleshColor = vec3(0.20, 0.02, 0.04) * (1.0 - uLengthPct) * 0.5;

                gl_FragColor = vec4(baseColor + glowColor + fleshColor, 1.0);
            }
        `;

        for (let i = 0; i < this.segmentCount; i++) {
            const pct = i / (this.segmentCount - 1);
            const rad = 0.055 * (1.0 - pct * 0.82);

            const segMat = new THREE.ShaderMaterial({
                uniforms: {
                    uTime: { value: 0.0 },
                    uLengthPct: { value: pct },
                    uActiveColor: { value: new THREE.Color(0x00f3ff) },
                    uEmissionPulse: { value: 0.0 },
                    uVibration: { value: 0.0 }
                },
                vertexShader,
                fragmentShader
            });
            this.shaderMaterials.push(segMat);

            // Joint Sphere
            const sphereMesh = new THREE.Mesh(
                new THREE.SphereGeometry(rad, 8, 8),
                segMat
            );
            this.add(sphereMesh);
            this.joints.push(sphereMesh);

            // Connecting cylinder
            if (i < this.segmentCount - 1) {
                const nextPct = (i + 1) / (this.segmentCount - 1);
                const nextRad = 0.055 * (1.0 - nextPct * 0.82);

                const taperCylGeom = new THREE.CylinderGeometry(nextRad, rad, 1.0, 8, 1);
                taperCylGeom.translate(0, 0.5, 0);

                const connMesh = new THREE.Mesh(taperCylGeom, segMat);
                this.add(connMesh);
                this.connectors.push(connMesh);
            }

            // Suction Cups
            if (i > 1 && i < this.segmentCount - 2 && i % 2 === 0) {
                const ringMesh = new THREE.Mesh(
                    new THREE.TorusGeometry(rad * 1.15, rad * 0.22, 4, 10),
                    new THREE.MeshStandardMaterial({
                        color: 0x00aaff,
                        emissive: 0x00f3ff,
                        emissiveIntensity: 2.5
                    })
                );
                ringMesh.rotation.x = Math.PI / 2;
                sphereMesh.add(ringMesh);
            }
        }

        // 3-Jaw Claw tip
        const tipJoint = this.joints[this.segmentCount - 1];
        this.clawPivots = [];
        this.clawParts = [];

        const clawGeom = new THREE.ConeGeometry(0.012, 0.08, 4);
        clawGeom.translate(0, 0.04, 0);
        clawGeom.rotateX(Math.PI / 3.5);

        const clawMat = new THREE.MeshStandardMaterial({
            color: 0x00aaff,
            emissive: 0x00f3ff,
            emissiveIntensity: 3.5,
            roughness: 0.10,
            metalness: 0.90
        });

        for (let c = 0; c < 3; c++) {
            const pivot = new THREE.Group();
            pivot.position.set(0, 0, 0.01);
            pivot.rotation.z = (c * Math.PI * 2) / 3;
            
            const mesh = new THREE.Mesh(clawGeom, clawMat);
            pivot.add(mesh);
            
            tipJoint.add(pivot);
            this.clawPivots.push(pivot);
            this.clawParts.push(mesh);
        }

        // Center needle stinger
        const stingerGeom = new THREE.ConeGeometry(0.008, 0.15, 8);
        stingerGeom.translate(0, 0.075, 0);
        stingerGeom.rotateX(Math.PI / 2);
        this.stinger = new THREE.Mesh(
            stingerGeom,
            new THREE.MeshStandardMaterial({
                color: 0x00ffff,
                emissive: 0x00d2ff,
                emissiveIntensity: 4.0
            })
        );
        tipJoint.add(this.stinger);
    }

    /**
     * Trigger a whip strike (alternates Snap and Sweep)
     */
    fire() {
        this.whipActive = true;
        this.whipTimer = 0;
        this.whipComboType = (this.whipComboType === 0) ? 1 : 0;

        if (window.AudioSynth) {
            if (this.whipComboType === 0) {
                window.AudioSynth.playClick(150, 0.08);
                window.AudioSynth.playClick(600, 0.03);
            } else {
                window.AudioSynth.playClick(100, 0.12);
                window.AudioSynth.playClick(400, 0.05);
            }
        }
    }

    /**
     * Trigger a symbiotic defensive swat at a target close to the player
     */
    fireAutoSwat(worldTarget) {
        this.autoSwatActive = true;
        this.autoSwatTimer = 0.0;
        
        // Project target coordinate into local system
        const localTarget = worldTarget.clone();
        this.worldToLocal(localTarget);
        
        // Clamp reach radius
        if (localTarget.length() > 4.5) {
            localTarget.normalize().multiplyScalar(4.5);
        }
        this.localSwatTarget.copy(localTarget);

        if (window.AudioSynth) {
            window.AudioSynth.playClick(280, 0.05);
            window.AudioSynth.playClick(500, 0.03);
        }
    }

    /**
     * Main simulation tick update
     */
    update(uTime, delta, isFiring, isADS, mouseVelX, mouseVelY, grabbedZombieWorldPos = null) {
        const dt = Math.min(0.05, delta);

        // Update shader uniforms
        this.shaderMaterials.forEach(mat => {
            mat.uniforms.uTime.value = uTime;
            // Decay emission pulses
            mat.uniforms.uEmissionPulse.value = Math.max(0.0, mat.uniforms.uEmissionPulse.value - dt * 2.2);
            
            let vib = 0.0;
            if (this.whipActive) vib = 1.0;
            else if (this.autoSwatActive) vib = 0.8;
            else if (this.isCharging) vib = 0.5 + this.chargeProgress * 1.5;
            else if (grabbedZombieWorldPos) vib = 0.4;
            mat.uniforms.uVibration.value = vib;
        });

        // Mouse look inertia forces
        const swayForceX = -mouseVelX * 0.09;
        const swayForceY = mouseVelY * 0.09;

        // Base idle positions in local space
        const idleP1 = new THREE.Vector3(0.25, -0.15 + Math.sin(uTime * 3.5) * 0.04, -1.2 + Math.cos(uTime * 2.8) * 0.03);
        const idleP2 = new THREE.Vector3(
            0.2 + Math.sin(uTime * 2.0) * 0.12, 
            0.1 + Math.cos(uTime * 1.5) * 0.12, 
            -2.0 + Math.sin(uTime * 3.2) * 0.06
        );

        // Multi-Animation State Machine
        if (this.whipActive) {
            // WHIPPING STATE
            this.whipTimer += dt;
            const progress = this.whipTimer / this.whipDuration;

            if (progress >= 1.0) {
                this.whipActive = false;
                this.whipTimer = 0;
            } else {
                let strikeAmt = 0;
                if (progress < 0.22) {
                    strikeAmt = Math.sin((progress / 0.22) * Math.PI / 2);
                } else {
                    strikeAmt = 1.0 - (progress - 0.22) / 0.78;
                }

                // White-hot plasma flash
                this.shaderMaterials.forEach(mat => {
                    mat.uniforms.uEmissionPulse.value = strikeAmt * 1.6;
                });

                if (this.whipComboType === 0) {
                    // Forward Snap
                    const targetP2 = new THREE.Vector3(0.0, 0.1, -7.5);
                    const targetP1 = new THREE.Vector3(0.12, 0.0, -3.75);
                    const jitter = Math.sin(progress * Math.PI * 12) * 0.5;

                    this.p2.lerpVectors(idleP2, targetP2, strikeAmt);
                    this.p2.x += jitter;
                    this.p2.y += Math.cos(progress * Math.PI * 8) * 0.25;

                    this.p1.lerpVectors(idleP1, targetP1, strikeAmt);
                    this.p1.y += jitter * 0.5;
                } else {
                    // Horizontal Sweep
                    const sweepX = Math.sin((progress - 0.5) * Math.PI) * 4.2;
                    const targetP2 = new THREE.Vector3(sweepX, 0.0, -5.5);
                    const targetP1 = new THREE.Vector3(sweepX * 0.5, -0.1, -2.75);

                    this.p2.lerpVectors(idleP2, targetP2, strikeAmt);
                    this.p1.lerpVectors(idleP1, targetP1, strikeAmt);
                }

                this.clawOpenAngle = -0.1; // Snap shut talons

                this.v1.set(0, 0, 0);
                this.v2.set(0, 0, 0);
            }
        } else if (this.autoSwatActive) {
            // PASSIVE DEFENISVE AUTO-SWAT
            this.autoSwatTimer += dt;
            const progress = this.autoSwatTimer / this.autoSwatDuration;

            if (progress >= 1.0) {
                this.autoSwatActive = false;
                this.autoSwatTimer = 0.0;
            } else {
                // Quick thrust to target and return
                const strikeAmt = Math.sin(progress * Math.PI);
                this.p2.lerpVectors(idleP2, this.localSwatTarget, strikeAmt);
                this.p1.lerpVectors(idleP1, new THREE.Vector3().addVectors(this.p0, this.localSwatTarget).multiplyScalar(0.5), strikeAmt);
                
                this.clawOpenAngle = -0.15; // Clench shut claws on strike
                
                this.shaderMaterials.forEach(mat => {
                    mat.uniforms.uEmissionPulse.value = strikeAmt * 1.2;
                });
            }
            this.v1.set(0, 0, 0);
            this.v2.set(0, 0, 0);
        } else if (this.isCharging && grabbedZombieWorldPos) {
            // CHARGING OVERLOAD STATE
            const localZombie = grabbedZombieWorldPos.clone();
            this.worldToLocal(localZombie);

            if (localZombie.length() > 8.0) {
                localZombie.normalize().multiplyScalar(8.0);
            }

            this.p2.copy(localZombie);

            // Extreme vibration ripple based on charge progress
            const chargeVib = 0.07 * this.chargeProgress * Math.sin(uTime * 64.0);
            this.p2.x += chargeVib;
            this.p2.y += chargeVib;

            const targetP1 = new THREE.Vector3().addVectors(this.p0, this.p2).multiplyScalar(0.5);
            targetP1.y += 0.25 + chargeVib * 0.5;
            this.p1.lerp(targetP1, 15 * dt);

            // Jaws form a wide open charging turbine shape
            this.clawOpenAngle = 0.45;

            // Pulse shader emission intensity to maximum
            this.shaderMaterials.forEach(mat => {
                mat.uniforms.uEmissionPulse.value = this.chargeProgress * 2.8;
            });

            this.v1.set(0, 0, 0);
            this.v2.set(0, 0, 0);
        } else if (grabbedZombieWorldPos) {
            // GRABBED / CONSTRICTION STATE
            const localZombie = grabbedZombieWorldPos.clone();
            this.worldToLocal(localZombie);

            if (localZombie.length() > 8.0) {
                localZombie.normalize().multiplyScalar(8.0);
            }

            this.p2.copy(localZombie);

            const vibAmt = 0.025 * Math.sin(uTime * 32.0);
            this.p2.x += vibAmt;
            this.p2.y += vibAmt;

            const targetP1 = new THREE.Vector3().addVectors(this.p0, this.p2).multiplyScalar(0.5);
            targetP1.y += 0.25;
            this.p1.lerp(targetP1, 12 * dt);

            this.clawOpenAngle = -0.05;

            this.v1.set(0, 0, 0);
            this.v2.set(0, 0, 0);
        } else if (isADS) {
            // Aim/Reach grab scanner state
            const targetP2 = new THREE.Vector3(0.08, -0.05, -4.5);
            const targetP1 = new THREE.Vector3(0.15, -0.1, -2.25);

            const f1 = new THREE.Vector3().subVectors(targetP1, this.p1).multiplyScalar(22);
            const f2 = new THREE.Vector3().subVectors(targetP2, this.p2).multiplyScalar(22);

            this.v1.addScaledVector(f1, dt);
            this.v2.addScaledVector(f2, dt);

            this.v1.multiplyScalar(Math.max(0, 1 - 7 * dt));
            this.v2.multiplyScalar(Math.max(0, 1 - 7 * dt));

            this.p1.addScaledVector(this.v1, dt);
            this.p2.addScaledVector(this.v2, dt);

            this.clawOpenAngle = 0.65;
        } else {
            // IDLE SCANNING / Passive twitchy state
            const scanTwitchX = Math.sin(uTime * 1.5) * Math.cos(uTime * 4.0) > 0.65 ? Math.sin(uTime * 12.0) * 0.15 : 0.0;
            const scanTwitchY = Math.cos(uTime * 2.0) * Math.sin(uTime * 3.5) > 0.65 ? Math.cos(uTime * 10.0) * 0.10 : 0.0;

            const targetP1 = idleP1.clone();
            targetP1.x += scanTwitchX * 0.5;
            targetP1.y += scanTwitchY * 0.5;

            const targetP2 = idleP2.clone();
            targetP2.x += scanTwitchX;
            targetP2.y += scanTwitchY;

            const kSpring = 24.0;
            const kDamping = 5.5;

            const f1 = new THREE.Vector3().subVectors(targetP1, this.p1).multiplyScalar(kSpring);
            const f2 = new THREE.Vector3().subVectors(targetP2, this.p2).multiplyScalar(kSpring * 0.78);

            f1.x += swayForceX * 10;
            f1.y += swayForceY * 10;

            f2.x += swayForceX * 22;
            f2.y += swayForceY * 22;

            this.v1.addScaledVector(f1, dt);
            this.v2.addScaledVector(f2, dt);

            this.v1.multiplyScalar(Math.max(0, 1 - kDamping * dt));
            this.v2.multiplyScalar(Math.max(0, 1 - kDamping * dt));

            this.p1.addScaledVector(this.v1, dt);
            this.p2.addScaledVector(this.v2, dt);

            this.clawOpenAngle = 0.25;
        }

        // 1. Position joints along Bezier Spline
        for (let i = 0; i < this.segmentCount; i++) {
            const pct = i / (this.segmentCount - 1);
            const t1 = 1.0 - pct;

            const pos = new THREE.Vector3()
                .copy(this.p0)
                .multiplyScalar(t1 * t1)
                .addScaledVector(this.p1, 2.0 * t1 * pct)
                .addScaledVector(this.p2, pct * pct);

            this.joints[i].position.copy(pos);
        }

        // 2. Orient and stretch connectors between joints
        for (let i = 0; i < this.segmentCount - 1; i++) {
            const pCurrent = this.joints[i].position;
            const pNext = this.joints[i + 1].position;

            const dir = new THREE.Vector3().subVectors(pNext, pCurrent);
            const len = dir.length();

            if (len > 0.0001) {
                dir.normalize();
                this.connectors[i].position.copy(pCurrent);

                const alignAxis = new THREE.Vector3(0, 1, 0);
                const quaternion = new THREE.Quaternion().setFromUnitVectors(alignAxis, dir);
                this.connectors[i].quaternion.copy(quaternion);
                this.connectors[i].scale.set(1.0, len, 1.0);
            }
        }

        // 3. Update Claw Pivot rotations
        this.clawPivots.forEach((pivot, c) => {
            // In charging state: Spin claw pivots rapidly around Z axis like an energy turbine!
            if (this.isCharging && grabbedZombieWorldPos) {
                pivot.rotation.z = (c * Math.PI * 2) / 3 + uTime * 35.0 * this.chargeProgress;
            } else {
                // Restore default Z angle spacing
                pivot.rotation.z = (c * Math.PI * 2) / 3;
            }
            pivot.rotation.x = this.clawOpenAngle;
        });

        // 4. Align tip block to face direction of travel
        const pLast = this.joints[this.segmentCount - 1].position;
        const pPrev = this.joints[this.segmentCount - 2].position;
        const stingerDir = new THREE.Vector3().subVectors(pLast, pPrev);
        
        if (stingerDir.lengthSq() > 0.0001) {
            stingerDir.normalize();
            const alignAxis = new THREE.Vector3(0, 1, 0);
            const quaternion = new THREE.Quaternion().setFromUnitVectors(alignAxis, stingerDir);
            this.joints[this.segmentCount - 1].quaternion.copy(quaternion);
        }
    }
}
