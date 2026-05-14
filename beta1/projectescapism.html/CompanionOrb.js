/**
 * COMPANION ORB — "THE WATCHER"
 * A grotesque tentacle mass that stalks the player from a distance.
 * One sinew tether connects to the camera — you can never escape it.
 * GPU-animated tentacles using vertex shader, Fibonacci sphere distribution.
 * Can be used later to interact with the environment.
 */

class CompanionOrb {
    constructor(scene, playerRef, cameraRef, hivesRef) {
        this.scene = scene;
        this.player = playerRef;
        this.camera = cameraRef;
        this.hives = hivesRef || [];
        this.time = 0;

        // Behavior config
        this.followDistance = 18.0;   // Lurks far behind — barely visible in darkness
        this.hoverHeight = 15.0;     // Higher up for overview
        this.followSmooth = 1.2;     // Faster response to hive switching
        this.bobAmount = 1.2;        // More pronounced heaving
        this.bobSpeed = 0.4;         // Slower breathing
        this.orbitDrift = 8.0;       // Much wider orbit around hives

        // Orb config — grotesque proportions
        this.config = {
            tentacleCount: 24,
            orbSize: 1.0,
            tentacleLength: 5.0,
            tentacleThickness: 0.07,
            wriggleAmount: 2.5,
            wriggleSpeed: 4.0,
            segments: 32,
            radialSegments: 6
        };

        // State
        this.targetPos = new THREE.Vector3();
        this.velocity = new THREE.Vector3();

        this._buildGroup();
        this._buildOrbMesh();
        this._buildTentacleMaterial();
        this._buildTentacles();
        this._buildTether();
        this._buildPointLight();

        // Initial position behind player
        if (this.player) {
            this.group.position.copy(this.player.position);
            this.group.position.y += this.hoverHeight;
            this.group.position.z += this.followDistance;
        }

        this.scene.add(this.group);
    }

    _buildGroup() {
        this.group = new THREE.Group();
        this.group.name = 'CompanionOrb';
    }

    _buildOrbMesh() {
        // Core sphere — dark, fleshy, pulsating mass
        const orbGeo = new THREE.IcosahedronGeometry(this.config.orbSize, 2); // Lower detail = more jagged
        const orbMat = new THREE.MeshStandardMaterial({
            color: 0x1a0505,
            emissive: 0x330000,
            emissiveIntensity: 0.4,
            metalness: 0.6,
            roughness: 0.8,
            transparent: true,
            opacity: 0.92
        });
        this.orbMesh = new THREE.Mesh(orbGeo, orbMat);
        this.group.add(this.orbMesh);

        // Wireframe shell — barbed, sickly
        const shellGeo = new THREE.IcosahedronGeometry(this.config.orbSize * 1.3, 1);
        const shellMat = new THREE.MeshBasicMaterial({
            color: 0x440000,
            wireframe: true,
            transparent: true,
            opacity: 0.2
        });
        this.shellMesh = new THREE.Mesh(shellGeo, shellMat);
        this.group.add(this.shellMesh);

        // Inner "eye" glow sphere
        const eyeGeo = new THREE.SphereGeometry(this.config.orbSize * 0.35, 16, 16);
        const eyeMat = new THREE.MeshBasicMaterial({
            color: 0xff1100,
            transparent: true,
            opacity: 0.6
        });
        this.eyeMesh = new THREE.Mesh(eyeGeo, eyeMat);
        this.group.add(this.eyeMesh);
    }

    _buildTentacleMaterial() {
        const vertShader = `
            uniform float time;
            uniform float wriggleSpeed;
            uniform float wriggleAmount;
            uniform float phaseOffset;

            varying vec2 vUv;
            varying vec3 vNormal;
            varying vec3 vViewPosition;
            varying float vDistance;

            void main() {
                vUv = uv;
                vNormal = normalize(normalMatrix * normal);

                vec3 transformed = position;

                // Progress along tentacle (0 at base, 1 at tip)
                float progress = uv.x;

                // Multi-frequency wriggle for organic motion
                float ripple  = sin(time * wriggleSpeed + progress * 5.0 + phaseOffset) * wriggleAmount * progress;
                float ripple2 = cos(time * wriggleSpeed * 0.7 + progress * 3.0 + phaseOffset * 1.3) * wriggleAmount * progress;
                float ripple3 = sin(time * wriggleSpeed * 1.5 + progress * 8.0 + phaseOffset * 0.7) * wriggleAmount * progress * 0.3;

                transformed.x += ripple + ripple3;
                transformed.y += ripple2;

                vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
                vViewPosition = -mvPosition.xyz;
                vDistance = progress;

                gl_Position = projectionMatrix * mvPosition;
            }
        `;

        const fragShader = `
            uniform float time;
            uniform vec3 colorStart;
            uniform vec3 colorEnd;
            uniform vec3 accentColor;
            uniform float energyLevel;
            uniform float pulseSpeed;
            uniform float opacity;

            varying vec2 vUv;
            varying vec3 vNormal;
            varying vec3 vViewPosition;
            varying float vDistance;

            void main() {
                // Multi-layered energy bands
                float p1 = fract(vDistance * 3.0 - time * pulseSpeed);
                float p2 = fract(vDistance * 10.0 - time * pulseSpeed * 2.0);

                // Base color gradient
                vec3 baseColor = mix(colorStart, colorEnd, vDistance);

                // Energy pulses (sharp bands)
                float pulses = step(0.8, p1) * energyLevel;
                float microPulses = step(0.95, p2) * energyLevel * 0.5;

                vec3 color = mix(baseColor, accentColor, pulses + microPulses);

                // Rim lighting (Fresnel)
                vec3 normal = normalize(vNormal);
                vec3 viewDir = normalize(vViewPosition);
                float fresnel = pow(1.0 - abs(dot(normal, viewDir)), 3.0);
                color += accentColor * fresnel * energyLevel;

                // Ambient occlusion at base
                color *= smoothstep(0.0, 0.2, vDistance) * 0.8 + 0.2;

                // Fade at tips
                float tipFade = 1.0 - smoothstep(0.8, 1.0, vDistance);
                float finalOpacity = opacity * tipFade;

                gl_FragColor = vec4(color, finalOpacity);
            }
        `;

        this.tentacleUniforms = {
            time: { value: 0.0 },
            wriggleSpeed: { value: this.config.wriggleSpeed },
            wriggleAmount: { value: this.config.wriggleAmount },
            phaseOffset: { value: 0.0 },
            colorStart: { value: new THREE.Color(0x0a0000) },   // Near-black blood
            colorEnd: { value: new THREE.Color(0x660011) },     // Dark crimson
            accentColor: { value: new THREE.Color(0xff2200) },  // Angry red pulse
            energyLevel: { value: 1.3 },
            pulseSpeed: { value: 2.0 },
            opacity: { value: 0.8 }
        };

        this.tentacleMat = new THREE.ShaderMaterial({
            vertexShader: vertShader,
            fragmentShader: fragShader,
            uniforms: this.tentacleUniforms,
            transparent: true,
            side: THREE.DoubleSide,
            depthWrite: false
        });
    }

    _buildTentacles() {
        this.tentacles = [];
        const cfg = this.config;

        // Base cylinder geometry (oriented along Z, UV remapped)
        const baseGeo = new THREE.CylinderGeometry(
            cfg.tentacleThickness,
            cfg.tentacleThickness * 0.15,
            cfg.tentacleLength,
            cfg.radialSegments,
            cfg.segments,
            true
        );
        baseGeo.rotateX(Math.PI / 2);
        baseGeo.translate(0, 0, cfg.tentacleLength / 2);

        // Remap UVs: x = length progress, y = radial
        const uvs = baseGeo.attributes.uv.array;
        for (let i = 0; i < uvs.length; i += 2) {
            const temp = uvs[i];
            uvs[i] = uvs[i + 1];
            uvs[i + 1] = temp;
        }

        // Fibonacci sphere distribution
        for (let i = 0; i < cfg.tentacleCount; i++) {
            const phi = Math.acos(-1 + (2 * i) / cfg.tentacleCount);
            const theta = Math.sqrt(cfg.tentacleCount * Math.PI) * phi;

            // Per-tentacle material clone with unique phase offset
            const mat = this.tentacleMat.clone();
            mat.uniforms = THREE.UniformsUtils.clone(this.tentacleUniforms);
            mat.uniforms.phaseOffset.value = Math.random() * Math.PI * 2;

            const mesh = new THREE.Mesh(baseGeo, mat);

            mesh.rotation.set(phi, theta, 0);
            mesh.position.set(
                Math.sin(phi) * Math.cos(theta) * cfg.orbSize * 0.5,
                Math.sin(phi) * Math.sin(theta) * cfg.orbSize * 0.5,
                Math.cos(phi) * cfg.orbSize * 0.5
            );

            this.group.add(mesh);
            this.tentacles.push({ mesh, mat });
        }
    }

    _buildTether() {
        // The sinew tether — a fleshy dark cord connecting to the camera
        this.tetherPoints = [];
        const numPoints = 16; // More points for longer distance
        for (let i = 0; i < numPoints; i++) {
            this.tetherPoints.push(new THREE.Vector3(0, 0, 0));
        }
        this.tetherCurve = new THREE.CatmullRomCurve3(this.tetherPoints);

        const tetherGeo = new THREE.TubeGeometry(this.tetherCurve, 48, 0.04, 6, false);
        const tetherMat = new THREE.MeshStandardMaterial({
            color: 0x1a0505,
            emissive: 0x220000,
            emissiveIntensity: 0.5,
            transparent: true,
            opacity: 0.45,
            metalness: 0.1,
            roughness: 0.9
        });

        this.tetherMesh = new THREE.Mesh(tetherGeo, tetherMat);
        this.scene.add(this.tetherMesh);
    }

    _buildPointLight() {
        // Dim, sinister blood-red glow
        this.light = new THREE.PointLight(0x440000, 0.8, 12);
        this.group.add(this.light);
    }

    /**
     * Main update loop — call every frame.
     * @param {number} delta
     * @param {number} time
     */
    update(delta, time) {
        if (!this.player) return;
        this.time = time;

        // --- 1. Compute follow target ---
        // Find active hive to observe
        let activeHive = null;
        if (this.hives && this.hives.length > 0) {
            // Find nearest active hive, or just the first active one
            activeHive = this.hives.find(h => h.active);
            
            // If we have a player, maybe find the one closest to player?
            if (this.player) {
                let minDist = Infinity;
                this.hives.forEach(h => {
                    if (h.active) {
                        const d = this.player.position.distanceTo(new THREE.Vector3(h.x, 0, h.z));
                        if (d < minDist) {
                            minDist = d;
                            activeHive = h;
                        }
                    }
                });
            }
        }

        if (activeHive) {
            // Orbit the hive
            const orbitSpeed = 0.2;
            const orbitX = Math.sin(time * orbitSpeed) * this.orbitDrift;
            const orbitZ = Math.cos(time * orbitSpeed) * this.orbitDrift;
            
            this.targetPos.set(activeHive.x + orbitX, activeHive.mesh.position.y + this.hoverHeight, activeHive.z + orbitZ);
            this.targetPos.y += Math.sin(time * this.bobSpeed) * this.bobAmount;
        } else if (this.player) {
            // Fallback: stay behind player if no active hives
            const playerForward = new THREE.Vector3(0, 0, -1);
            playerForward.applyQuaternion(this.player.quaternion);
            const lateralDir = new THREE.Vector3(-playerForward.z, 0, playerForward.x).normalize();

            this.targetPos.copy(this.player.position);
            this.targetPos.addScaledVector(playerForward, -this.followDistance);
            this.targetPos.y += this.hoverHeight + Math.sin(time * this.bobSpeed) * this.bobAmount;
            this.targetPos.addScaledVector(lateralDir, Math.sin(time * 0.7) * 2.0);
        }

        // --- 2. Smooth follow (sluggish, menacing) ---
        this.group.position.lerp(this.targetPos, this.followSmooth * delta);

        // --- 3. Slowly track the objective (predatory observation) ---
        let lookTarget;
        if (activeHive) {
            lookTarget = new THREE.Vector3(activeHive.x, activeHive.mesh.position.y, activeHive.z);
        } else if (this.player) {
            lookTarget = this.player.position.clone();
            lookTarget.y += 1.0;
        }

        if (lookTarget) {
            const dir = lookTarget.sub(this.group.position).normalize();
            const targetQuat = new THREE.Quaternion();
            const lookMatrix = new THREE.Matrix4().lookAt(
                this.group.position,
                this.group.position.clone().add(dir),
                new THREE.Vector3(0, 1, 0)
            );
            targetQuat.setFromRotationMatrix(lookMatrix);
            this.group.quaternion.slerp(targetQuat, 0.8 * delta); // Very slow, deliberate tracking
        }

        // --- 4. Unsettling orb rotation ---
        this.orbMesh.rotation.y += delta * 0.3;
        this.orbMesh.rotation.x = Math.sin(time * 0.4) * 0.15;
        this.orbMesh.rotation.z = Math.cos(time * 0.3) * 0.1;
        this.shellMesh.rotation.y -= delta * 0.5;
        this.shellMesh.rotation.z += delta * 0.4;
        this.shellMesh.rotation.x = Math.sin(time * 0.6) * 0.2;

        // Eye pulses and flickers
        const eyeFlicker = Math.random() > 0.98 ? 0.1 : 0.6;
        this.eyeMesh.material.opacity = eyeFlicker + Math.sin(time * 4.0) * 0.2;

        // --- 5. Sickly pulsing light ---
        this.light.intensity = 0.5 + Math.sin(time * 1.5) * 0.3;
        // Occasional brightness spike
        if (Math.random() > 0.995) this.light.intensity = 2.0;

        // --- 6. Update tentacle uniforms ---
        for (let i = 0; i < this.tentacles.length; i++) {
            this.tentacles[i].mat.uniforms.time.value = time;
        }

        // --- 7. Update tether to camera ---
        this._updateTether(delta, time);

        // --- 8. Emissive pulse on core ---
        const pulse = Math.sin(time * 1.5) * 0.5 + 0.5;
        this.orbMesh.material.emissiveIntensity = 0.2 + pulse * 0.3;
    }

    _updateTether(delta, time) {
        if (!this.camera) return;

        const orbWorldPos = new THREE.Vector3();
        this.group.getWorldPosition(orbWorldPos);

        const camWorldPos = new THREE.Vector3();
        this.camera.getWorldPosition(camWorldPos);

        // Compute intermediate control points for longer, sagging sinew
        const numPoints = this.tetherPoints.length;
        for (let i = 0; i < numPoints; i++) {
            const t = i / (numPoints - 1);

            // Linear interpolation base
            const base = new THREE.Vector3().lerpVectors(orbWorldPos, camWorldPos, t);

            // Heavier sag for longer distance
            const sag = Math.sin(t * Math.PI) * 3.0;
            base.y -= sag;

            // More aggressive wriggle — sinew twitching
            base.x += Math.sin(time * 3.0 + t * 8.0) * 0.3 * Math.sin(t * Math.PI);
            base.z += Math.cos(time * 2.5 + t * 6.0) * 0.25 * Math.sin(t * Math.PI);
            base.y += Math.sin(time * 4.0 + t * 10.0) * 0.1 * Math.sin(t * Math.PI);

            this.tetherPoints[i].copy(base);
        }

        // Rebuild curve and geometry
        this.tetherCurve = new THREE.CatmullRomCurve3(this.tetherPoints);

        const oldGeo = this.tetherMesh.geometry;
        this.tetherMesh.geometry = new THREE.TubeGeometry(this.tetherCurve, 48, 0.035, 6, false);
        oldGeo.dispose();
    }

    /**
     * Get the orb's world position (for environment interaction later).
     */
    getWorldPosition() {
        const pos = new THREE.Vector3();
        this.group.getWorldPosition(pos);
        return pos;
    }

    /**
     * Dispose all resources.
     */
    dispose() {
        this.scene.remove(this.group);
        this.scene.remove(this.tetherMesh);
        this.tentacles.forEach(t => {
            t.mesh.geometry.dispose();
            t.mat.dispose();
        });
        this.orbMesh.geometry.dispose();
        this.orbMesh.material.dispose();
        this.shellMesh.geometry.dispose();
        this.shellMesh.material.dispose();
        this.eyeMesh.geometry.dispose();
        this.eyeMesh.material.dispose();
        this.tetherMesh.geometry.dispose();
        this.tetherMesh.material.dispose();
        this.light.dispose();
    }
}

window.CompanionOrb = CompanionOrb;
