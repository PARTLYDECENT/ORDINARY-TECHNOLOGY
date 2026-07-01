/**
 * spires.js - Over-Evolved Hanging Stalactite Spires & Sky Weather Systems
 * Flipped upside down, suspended in the sky, splayed outwards, and surrounded by 
 * circular glowing particles. Featuring erratic movements and saturated blood-red shaders.
 */

(function () {

    function createCircularGlowTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 16;
        canvas.height = 16;
        const ctx = canvas.getContext('2d');
        const grad = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
        grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
        grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 16, 16);
        const texture = new THREE.CanvasTexture(canvas);
        return texture;
    }

    const circleMap = createCircularGlowTexture();

    class ProceduralSpire extends THREE.Group {
        constructor(config = {}) {
            super();

            this.scaleMultiplier = config.scale || 1.0;
            this.baseHeight = config.height || 35.0;
            this.radiusBottom = (config.radiusBottom || 2.2) * this.scaleMultiplier;
            this.radiusTop = (config.radiusTop || 0.6) * this.scaleMultiplier;

            // Erratic instance-specific variables
            this.time = Math.random() * 100.0;
            this.erraticSeed = Math.random() * 100.0;
            this.erraticSpeed = 1.2 + Math.random() * 1.8;
            
            this.lightningTimer = 0;
            this.lightningActive = false;

            // 3-second lifespan configuration with smooth fade-in and fade-out
            this.age = 0.0;
            this.maxLifetime = 3.0;
            this.fadeDuration = 1.0;
            this.fadeFactor = 0.0; // Start at 0.0 for smooth fade-in

            this._buildSpire();
            this._buildWeatherParticles();
            this._buildPlasmaRings();
            this._buildLightning();
            this._buildLight();
        }

        _buildSpire() {
            const geo = new THREE.CylinderGeometry(
                this.radiusTop,
                this.radiusBottom,
                this.baseHeight,
                8,        // Jagged octagonal crystal base
                128,      // Ultra-high vertex density for smooth snaking
                false
            );
            geo.translate(0, this.baseHeight / 2, 0); // Ground the pivot point

            // Custom attribute for stable local positioning
            const positions = geo.attributes.position.array;
            const localPos = new Float32Array(positions.length);
            for (let i = 0; i < positions.length; i++) {
                localPos[i] = positions[i];
            }
            geo.setAttribute('aLocalPos', new THREE.BufferAttribute(localPos, 3));

            // Saturated Volcanic Orangish Blood-Red Material
            const mat = new THREE.ShaderMaterial({
                uniforms: {
                    uTime: { value: 0.0 },
                    uSunPos: { value: new THREE.Vector3(0.0, 0.2, -1.0).normalize() },
                    uHeight: { value: this.baseHeight },
                    uWarpStrength: { value: 1.1 },
                    uWarpFreq: { value: 1.3 },
                    uRefractionStrength: { value: 0.48 },
                    uChromaticShift: { value: 0.15 },
                    uPulseSpeed: { value: 3.8 },
                    uErraticSeed: { value: this.erraticSeed },
                    uErraticSpeed: { value: this.erraticSpeed },
                    uOpacity: { value: 0.0 } // Added uOpacity uniform
                },
                vertexShader: `
                    uniform float uTime;
                    uniform float uHeight;
                    uniform float uWarpStrength;
                    uniform float uWarpFreq;
                    uniform float uErraticSeed;
                    uniform float uErraticSpeed;

                    attribute vec3 aLocalPos;

                    varying vec3 vLocalPos;
                    varying vec3 vWorldPos;
                    varying vec3 vNormalWorld;

                    mat2 rot(float a) {
                        float s = sin(a), c = cos(a);
                        return mat2(c, -s, s, c);
                    }

                    void main() {
                        vLocalPos = aLocalPos;
                        
                        vec3 transformed = position;
                        
                        // 1. Violent helical twist along the crystal axis
                        float twist = transformed.y * 0.15 * uWarpFreq + uTime * 1.5;
                        transformed.xz = rot(twist) * transformed.xz;
                        
                        // 2. Twitchy, highly erratic space-bending displacement waves
                        float speedMul = uErraticSpeed;
                        float waveX = sin(transformed.y * 0.12 * uWarpFreq + uTime * 2.8 * speedMul + uErraticSeed) * 
                                      cos(transformed.y * 0.06 * uWarpFreq - uTime * 1.5 * speedMul - uErraticSeed * 1.6) * 1.5;
                        float waveZ = cos(transformed.y * 0.12 * uWarpFreq - uTime * 2.4 * speedMul - uErraticSeed * 0.8) * 
                                      sin(transformed.y * 0.06 * uWarpFreq + uTime * 1.8 * speedMul + uErraticSeed * 2.2) * 1.5;
                        
                        transformed.x += waveX * uWarpStrength * 4.8;
                        transformed.z += waveZ * uWarpStrength * 4.8;
                        
                        // 3. Dynamic breath pulsation
                        float pulse = 1.0 + 0.18 * sin(uTime * 4.0 + transformed.y * 0.25);
                        transformed.xz *= pulse;

                        vec4 worldPos = modelMatrix * vec4(transformed, 1.0);
                        vWorldPos = worldPos.xyz;
                        
                        vNormalWorld = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
                        
                        gl_Position = projectionMatrix * viewMatrix * worldPos;
                    }
                `,
                fragmentShader: `
                    uniform float uTime;
                    uniform float uOpacity; // Added uOpacity uniform
                    uniform vec3 uSunPos;
                    uniform float uRefractionStrength;
                    uniform float uChromaticShift;
                    uniform float uPulseSpeed;

                    varying vec3 vLocalPos;
                    varying vec3 vWorldPos;
                    varying vec3 vNormalWorld;

                    // Procedural skybox recreation for self-contained, optimized grav-lensing
                    vec3 getProceduralSkyColor(vec3 rd, vec3 sd) {
                        float zenithAngle = max(0.0, rd.y);
                        
                        // Terrifying saturated blood-red sky zenith
                        vec3 zenithColor = vec3(0.85, 0.02, 0.01);
                        vec3 horizonColor = vec3(1.0, 0.22, 0.0);
                        vec3 skyColor = mix(horizonColor, zenithColor, pow(zenithAngle, 0.6));

                        // Intense sun flare
                        float sunDot = max(0.0, dot(rd, sd));
                        float sunGlow = pow(sunDot, 64.0) * 60.0;
                        float sunHalo = pow(sunDot, 8.0) * 10.0;
                        
                        skyColor += vec3(1.0, 0.80, 0.4) * (sunGlow + sunHalo);
                        return skyColor;
                    }

                    void main() {
                        vec3 rd = normalize(vWorldPos - cameraPosition);
                        vec3 sd = normalize(uSunPos);
                        vec3 normalW = normalize(vNormalWorld);

                        // localized thermal wave distortion
                        vec3 waveDistort = normalW * uRefractionStrength;
                        waveDistort.x += sin(vWorldPos.y * 0.45 + uTime * 3.5) * 0.10;
                        waveDistort.z += cos(vWorldPos.y * 0.35 - uTime * 2.8) * 0.10;

                        // chromatic aberration splits
                        vec3 rdR = normalize(rd + waveDistort * (1.0 + uChromaticShift));
                        vec3 rdG = normalize(rd + waveDistort);
                        vec3 rdB = normalize(rd + waveDistort * (1.0 - uChromaticShift));

                        float skyR = getProceduralSkyColor(rdR, sd).r;
                        float skyG = getProceduralSkyColor(rdG, sd).g;
                        float skyB = getProceduralSkyColor(rdB, sd).b;
                        vec3 refractedBackground = vec3(skyR, skyG, skyB);

                        // Glowing high-contrast sci-fi runic circuit scans
                        float waveGrid = sin(vLocalPos.y * 1.0 + uTime * uPulseSpeed) * sin(atan(vLocalPos.z, vLocalPos.x) * 5.0) * 0.5 + 0.5;
                        float circuitPattern = step(0.82, pow(waveGrid, 3.0));

                        // Intense orangish blood-red core
                        float corePulse = sin(uTime * 5.0 + vLocalPos.y * 0.3) * 0.5 + 0.5;
                        float plasma = sin(vLocalPos.y * 2.5 - uTime * 8.0) * cos(atan(vLocalPos.z, vLocalPos.x) * 6.0 + uTime * 5.0);
                        vec3 coreColor = mix(vec3(0.9, 0.02, 0.0), vec3(1.0, 0.38, 0.0), smoothstep(-0.6, 0.6, plasma));
                        coreColor *= (corePulse * 6.0 + 3.5);

                        vec3 finalColor = mix(refractedBackground, coreColor, circuitPattern * 0.80);

                        // Procedural electric cracks
                        float cracks = sin(vLocalPos.y * 6.0 + uTime * 2.5) * cos(vLocalPos.x * 5.0 - uTime * 1.8);
                        if (cracks > 0.84) {
                            finalColor += vec3(1.0, 0.20, 0.0) * 4.0;
                        }

                        // Volcanic blood-red rim lighting
                        float rim = pow(1.0 - max(0.0, dot(normalW, -rd)), 3.0);
                        finalColor += vec3(1.0, 0.15, 0.0) * rim * 3.5;

                        // Increased opacity to make them look more solid/fleshy
                        gl_FragColor = vec4(finalColor, 0.98 * uOpacity);
                    }
                `,
                transparent: true,
                side: THREE.DoubleSide,
                depthWrite: true,
                depthTest: true
            });

            this.spireMesh = new THREE.Mesh(geo, mat);
            this.add(this.spireMesh);
        }

        /**
         * Swirling volcanic vortex particles - Soft circular glows
         */
        _buildWeatherParticles() {
            const count = 180;
            const geo = new THREE.BufferGeometry();
            
            const positions = new Float32Array(count * 3);
            const colors = new Float32Array(count * 3);
            
            this.particleData = [];

            const colorLavaA = new THREE.Color(0xff1100); // deep blood red
            const colorLavaB = new THREE.Color(0xff7700); // superheated orange

            for (let i = 0; i < count; i++) {
                const y = Math.random() * this.baseHeight;
                const angle = Math.random() * Math.PI * 2;
                const radius = 2.0 + Math.random() * 4.5;
                
                const px = Math.cos(angle) * radius;
                const pz = Math.sin(angle) * radius;
                
                positions[i * 3] = px;
                positions[i * 3 + 1] = y;
                positions[i * 3 + 2] = pz;

                const col = new THREE.Color().lerpColors(colorLavaA, colorLavaB, Math.random());
                colors[i * 3] = col.r;
                colors[i * 3 + 1] = col.g;
                colors[i * 3 + 2] = col.b;

                this.particleData.push({
                    angle: angle,
                    radius: radius,
                    y: y,
                    speed: 2.2 + Math.random() * 4.5,       // Swirl speed
                    upSpeed: 4.0 + Math.random() * 6.5,     // Rise speed
                    swayOffset: Math.random() * 100.0
                });
            }

            geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

            const pMat = new THREE.PointsMaterial({
                size: 1.1 * this.scaleMultiplier,
                vertexColors: true,
                transparent: true,
                opacity: 0.90,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                map: circleMap // Use circular soft glow texture!
            });

            this.particles = new THREE.Points(geo, pMat);
            
            // Particles are child of the group, so they inherit rotation
            this.add(this.particles);
        }

        /**
         * Expanding shockwave ionization plasma rings
         */
        _buildPlasmaRings() {
            this.rings = [];
            const ringCount = 3;

            const ringMat = new THREE.ShaderMaterial({
                uniforms: {
                    uTime: { value: 0 },
                    uColor: { value: new THREE.Color(0xff2200) },
                    uRingProgress: { value: 0 },
                    uOpacity: { value: 0.0 } // Added uOpacity uniform
                },
                vertexShader: `
                    varying vec2 vUv;
                    void main() {
                        vUv = uv;
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    }
                `,
                fragmentShader: `
                    varying vec2 vUv;
                    uniform vec3 uColor;
                    uniform float uRingProgress;
                    uniform float uTime;
                    uniform float uOpacity; // Added uOpacity uniform

                    void main() {
                        vec2 uv = vUv - 0.5;
                        float dist = length(uv) * 2.0;

                        // Ring shape
                        float rWidth = 0.08;
                        float ringVal = smoothstep(uRingProgress - rWidth, uRingProgress, dist) * 
                                       smoothstep(uRingProgress + rWidth, uRingProgress, dist);

                        // Edge glow pulsing
                        float pulse = 0.5 + 0.5 * sin(uTime * 12.0);
                        vec3 finalCol = uColor * (ringVal * 3.0 * (1.0 - uRingProgress) * (0.8 + 0.2 * pulse));
                        
                        float alpha = ringVal * (1.0 - uRingProgress) * 0.95 * uOpacity;
                        if (alpha < 0.01) discard;

                        gl_FragColor = vec4(finalCol, alpha);
                    }
                `,
                transparent: true,
                depthWrite: false,
                blending: THREE.AdditiveBlending,
                side: THREE.DoubleSide
            });

            const ringGeo = new THREE.PlaneGeometry(12.0, 12.0);

            for (let i = 0; i < ringCount; i++) {
                const mesh = new THREE.Mesh(ringGeo, ringMat.clone());
                mesh.rotation.x = -Math.PI / 2; // Lay flat
                mesh.position.y = (this.baseHeight / ringCount) * i;
                
                this.add(mesh);
                this.rings.push({
                    mesh: mesh,
                    progress: i / ringCount, // Offset start progress
                    speed: 0.35 + Math.random() * 0.15,
                    baseY: mesh.position.y
                });
            }
        }

        /**
         * Violent ionization weather lightning line segment
         */
        _buildLightning() {
            const points = [];
            const segments = 6;
            for (let i = 0; i <= segments; i++) {
                points.push(new THREE.Vector3(0, 0, 0));
            }
            
            const geo = new THREE.BufferGeometry().setFromPoints(points);
            const mat = new THREE.LineBasicMaterial({
                color: 0xff4411, // Blood-red lightning
                transparent: true,
                opacity: 0.0,
                blending: THREE.AdditiveBlending,
                linewidth: 2
            });

            this.lightning = new THREE.Line(geo, mat);
            this.add(this.lightning);
        }

        _buildLight() {
            // Intense blood-red dynamic light
            this.pointLight = new THREE.PointLight(0xff1100, 3.5, 45.0, 1.5);
            this.pointLight.position.set(0, 2.0, 0);
            this.add(this.pointLight);
        }

        /**
         * Update physics, trajectories, lightning flashes, and expand shockwaves
         */
        update(delta, playerPosition) {
            this.time += delta;
            this.age += delta;

            // Calculate fade factor: smooth fade-in for 0.5s, fully visible for 2.5s, then fade out over 1.0s
            if (this.age < 0.5) {
                this.fadeFactor = this.age / 0.5;
            } else if (this.age < this.maxLifetime) {
                this.fadeFactor = 1.0;
            } else {
                const fadeProgress = (this.age - this.maxLifetime) / this.fadeDuration;
                this.fadeFactor = Math.max(0.0, 1.0 - fadeProgress);
            }

            // Shrink the spire group during fade-out for a collapsing/dissolving effect
            const currentScale = this.scaleMultiplier * this.fadeFactor;
            this.scale.set(currentScale, currentScale, currentScale);

            // Once fully faded out, detach from parent to trigger cleanup & disposal
            if (this.fadeFactor <= 0.0) {
                if (this.parent) {
                    this.parent.remove(this);
                }
                return;
            }

            // 1. Spire Mesh Bending Uniform Updates
            if (this.spireMesh && this.spireMesh.material.uniforms) {
                const uniforms = this.spireMesh.material.uniforms;
                uniforms.uTime.value = this.time;
                uniforms.uOpacity.value = this.fadeFactor; // Apply fade factor

                // Sync sun direction dynamically
                if (window.skyboxManager && window.skyboxManager.mesh && window.skyboxManager.mesh.material.uniforms) {
                    uniforms.uSunPos.value.copy(window.skyboxManager.mesh.material.uniforms.uSunPos.value);
                }
            }

            // 2. Swirling Weather Particles Physics
            if (this.particles) {
                this.particles.material.opacity = 0.90 * this.fadeFactor; // Apply fade factor
                const posAttr = this.particles.geometry.attributes.position;
                const positions = posAttr.array;
                
                const uWarpStrength = 1.1;
                const uWarpFreq = 1.3;
                const speedMul = this.erraticSpeed;

                for (let i = 0; i < this.particleData.length; i++) {
                    const p = this.particleData[i];
                    
                    p.y += p.upSpeed * delta;
                    if (p.y > this.baseHeight) {
                        p.y = 0;
                        p.radius = 2.0 + Math.random() * 4.5;
                        p.angle = Math.random() * Math.PI * 2;
                    }

                    p.angle += p.speed * delta;

                    // Calculate spire's actual shader-warped center coordinates
                    const waveX = Math.sin(p.y * 0.12 * uWarpFreq + this.time * 2.8 * speedMul + this.erraticSeed) * 
                                  Math.cos(p.y * 0.06 * uWarpFreq - this.time * 1.5 * speedMul - this.erraticSeed * 1.6) * 1.5;
                    const waveZ = Math.cos(p.y * 0.12 * uWarpFreq - this.time * 2.4 * speedMul - this.erraticSeed * 0.8) * 
                                  Math.sin(p.y * 0.06 * uWarpFreq + this.time * 1.8 * speedMul + this.erraticSeed * 2.2) * 1.5;
                    
                    const spireCenterX = waveX * uWarpStrength * 4.8;
                    const spireCenterZ = waveZ * uWarpStrength * 4.8;

                    positions[i * 3] = spireCenterX + Math.cos(p.angle) * p.radius;
                    positions[i * 3 + 1] = p.y;
                    positions[i * 3 + 2] = spireCenterZ + Math.sin(p.angle) * p.radius;
                }

                posAttr.needsUpdate = true;
            }

            // 3. Shockwave Plasma Rings Expansions
            this.rings.forEach(ring => {
                ring.progress += ring.speed * delta;
                if (ring.progress > 1.0) {
                    ring.progress = 0.0;
                }

                // Update material uniforms
                ring.mesh.material.uniforms.uRingProgress.value = ring.progress;
                ring.mesh.material.uniforms.uTime.value = this.time;
                ring.mesh.material.uniforms.uOpacity.value = this.fadeFactor; // Apply fade

                const y = ring.baseY;
                const uWarpStrength = 1.1;
                const uWarpFreq = 1.3;
                const speedMul = this.erraticSpeed;

                const waveX = Math.sin(y * 0.12 * uWarpFreq + this.time * 2.8 * speedMul + this.erraticSeed) * 
                              Math.cos(y * 0.06 * uWarpFreq - this.time * 1.5 * speedMul - this.erraticSeed * 1.6) * 1.5;
                const waveZ = Math.cos(y * 0.12 * uWarpFreq - this.time * 2.4 * speedMul - this.erraticSeed * 0.8) * 
                              Math.sin(y * 0.06 * uWarpFreq + this.time * 1.8 * speedMul + this.erraticSeed * 2.2) * 1.5;
                
                ring.mesh.position.x = waveX * uWarpStrength * 4.8;
                ring.mesh.position.z = waveZ * uWarpStrength * 4.8;
                
                const ringScale = this.scaleMultiplier * (1.2 + 0.15 * Math.sin(this.time * 6.0 + ring.baseY));
                ring.mesh.scale.set(ringScale, ringScale, ringScale);
            });

            // 4. Volcanic Ionization Lightning crackles
            this.lightningTimer -= delta;
            if (this.lightningTimer <= 0) {
                if (this.lightningActive) {
                    this.lightningActive = false;
                    this.lightning.material.opacity = 0.0;
                    this.lightningTimer = 1.5 + Math.random() * 4.0;
                } else {
                    this.lightningActive = true;
                    this.lightning.material.opacity = (0.85 + Math.random() * 0.15) * this.fadeFactor; // Apply fade factor
                    this.lightningTimer = 0.08 + Math.random() * 0.12;

                    const pointsAttr = this.lightning.geometry.attributes.position;
                    const pointsArr = pointsAttr.array;
                    
                    const segments = 6;
                    const uWarpStrength = 1.1;
                    const uWarpFreq = 1.3;
                    const speedMul = this.erraticSpeed;

                    for (let j = segments; j >= 0; j--) {
                        const h = (this.baseHeight / segments) * j;
                        
                        const waveX = Math.sin(h * 0.12 * uWarpFreq + this.time * 2.8 * speedMul + this.erraticSeed) * 
                                      Math.cos(h * 0.06 * uWarpFreq - this.time * 1.5 * speedMul - this.erraticSeed * 1.6) * 1.5;
                        const waveZ = Math.cos(h * 0.12 * uWarpFreq - this.time * 2.4 * speedMul - this.erraticSeed * 0.8) * 
                                      Math.sin(h * 0.06 * uWarpFreq + this.time * 1.8 * speedMul + this.erraticSeed * 2.2) * 1.5;
                        const warpedCoreX = waveX * uWarpStrength * 4.8;
                        const warpedCoreZ = waveZ * uWarpStrength * 4.8;

                        const jitterX = j === segments ? 0 : (Math.random() - 0.5) * 1.8;
                        const jitterZ = j === segments ? 0 : (Math.random() - 0.5) * 1.8;

                        // Because the spire is flipped by Math.PI, local coords are matching
                        pointsArr[j * 3] = warpedCoreX + jitterX;
                        pointsArr[j * 3 + 1] = h;
                        pointsArr[j * 3 + 2] = warpedCoreZ + jitterZ;
                    }
                    pointsAttr.needsUpdate = true;
                }
            }

            // 5. Pulsing dynamic light intensity
            if (this.pointLight) {
                const baseIntensity = 3.5 + 1.2 * Math.sin(this.time * 8.0);
                const lightningBoost = this.lightningActive ? 7.0 : 0.0;
                this.pointLight.intensity = (baseIntensity + lightningBoost) * this.scaleMultiplier * this.fadeFactor; // Apply fade factor
            }
        }

        dispose() {
            if (this.spireMesh) {
                this.spireMesh.geometry.dispose();
                this.spireMesh.material.dispose();
            }
            if (this.particles) {
                this.particles.geometry.dispose();
                this.particles.material.dispose();
            }
            this.rings.forEach(ring => {
                ring.mesh.geometry.dispose();
                ring.mesh.material.dispose();
            });
            if (this.lightning) {
                this.lightning.geometry.dispose();
                this.lightning.material.dispose();
            }
            if (this.pointLight) {
                this.pointLight.dispose();
            }
        }
    }

    window.ProceduralSpire = ProceduralSpire;

})();
