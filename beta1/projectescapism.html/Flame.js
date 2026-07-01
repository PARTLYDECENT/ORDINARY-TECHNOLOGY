/**
 * FlameStream — Outstanding Procedural Fire Stream with Spikey GPU Shaders & Ground Pooling
 * Features:
 * - Part 1: Control Point Gas Spline & Pilot Ribbon Core (high pressure stream).
 * - Part 2: Custom GPU Vertex/Fragment Shaders displacing vertices along normals to form "Spikey Balls".
 * - Part 3: Volumetric ground pooling, flattening spheres on contact to form spreading liquid fire pools.
 * - Part 4: Longer travel time and 250 high-density pooled fire particles.
 */
class FlameStream {
    constructor(scene) {
        this.scene = scene;
        this.controlPoints = [];
        this.numControlPoints = 8;
        
        for (let i = 0; i < this.numControlPoints; i++) {
            this.controlPoints.push(new THREE.Vector3());
        }

        // Part 1: Gas Ribbon Core representing the high-pressure fuel jet
        this.ribbonGeo = new THREE.PlaneGeometry(1, 1, 1, this.numControlPoints - 1);
        this.ribbonMat = new THREE.MeshBasicMaterial({
            color: 0x00f0ff,
            transparent: true,
            opacity: 0.0,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        this.ribbonMesh = new THREE.Mesh(this.ribbonGeo, this.ribbonMat);
        this.ribbonMesh.frustumCulled = false;
        this.scene.add(this.ribbonMesh);

        // Part 2: Custom Animated Fire Shader with Vertex Normal Spiking
        this.fireShaderMat = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uAgeRatio: { value: 1.0 },
                uColorWhite: { value: new THREE.Color(0xffffff) },
                uColorOrange: { value: new THREE.Color(0xff9900) },
                uColorRed: { value: new THREE.Color(0xdd2200) },
                uColorSmoke: { value: new THREE.Color(0x181615) }
            },
            vertexShader: `
                uniform float uTime;
                uniform float uAgeRatio;
                varying vec3 vNormal;
                varying vec3 vPosition;
                varying vec3 vViewPosition;

                // Hash function for pseudo-random spikes
                float hash(vec3 p) {
                    return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453123);
                }

                void main() {
                    vNormal = normalize(normalMatrix * normal);
                    vPosition = position;
                    
                    // Create sharp procedural point spikes along vertex normals
                    float spikeFreq = 18.0;
                    float wave = sin(position.x * spikeFreq + uTime * 20.0) * 
                                 cos(position.y * spikeFreq + uTime * 18.0) * 
                                 sin(position.z * spikeFreq + uTime * 22.0);
                    
                    // Add noise to make spikes jagged and organic
                    float noise = hash(position + vec3(0.0, uTime * 0.1, 0.0)) * 0.35;
                    float finalSpike = (wave + noise) * 0.22 * clamp(uAgeRatio * 1.5, 0.0, 1.0);

                    vec3 displaced = position + normal * finalSpike;
                    vec4 mvPosition = modelViewMatrix * vec4(displaced, 1.0);
                    vViewPosition = -mvPosition.xyz;
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                uniform float uTime;
                uniform float uAgeRatio;
                uniform vec3 uColorWhite;
                uniform vec3 uColorOrange;
                uniform vec3 uColorRed;
                uniform vec3 uColorSmoke;
                varying vec3 vNormal;
                varying vec3 vPosition;
                varying vec3 vViewPosition;

                void main() {
                    // Scrolling flame turbulence
                    float noise = sin(vPosition.x * 6.0 + uTime * 12.0) * 
                                  cos(vPosition.y * 6.0 - uTime * 10.0) * 
                                  sin(vPosition.z * 6.0 + uTime * 14.0);
                    
                    // Smooth radial falloff + noise
                    float dist = length(vPosition);
                    float fireIntensity = clamp((1.0 - dist) * 1.5 + noise * 0.35, 0.0, 1.0);
                    
                    // Trilinear Color Interpolation based on age & radial intensity
                    vec3 finalColor;
                    float factor = fireIntensity * uAgeRatio;

                    if (factor > 0.65) {
                        finalColor = mix(uColorOrange, uColorWhite, (factor - 0.65) / 0.35);
                    } else if (factor > 0.22) {
                        finalColor = mix(uColorRed, uColorOrange, (factor - 0.22) / 0.43);
                    } else {
                        finalColor = mix(uColorSmoke, uColorRed, factor / 0.22);
                    }

                    // Fresnel rim fade for soft volumetric cloud feel
                    vec3 normal = normalize(vNormal);
                    vec3 viewDir = normalize(vViewPosition);
                    float fresnel = pow(1.0 - abs(dot(normal, viewDir)), 2.0);
                    
                    // Set opacity based on age and falloff
                    float alpha = fireIntensity * uAgeRatio * (0.3 + 0.7 * fresnel);

                    gl_FragColor = vec4(finalColor, alpha);
                }
            `,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });

        // Part 3: Pre-allocated Volumetric Fluid Particles Pool
        this.maxFluidParticles = 250;
        this.fluidPool = [];
        this.fluidGeo = new THREE.IcosahedronGeometry(0.38, 2); // Cheap but vertex-dense for gorgeous spikes
        
        for (let i = 0; i < this.maxFluidParticles; i++) {
            const mat = this.fireShaderMat.clone();
            const mesh = new THREE.Mesh(this.fluidGeo, mat);
            mesh.visible = false;
            this.scene.add(mesh);
            
            this.fluidPool.push({
                mesh: mesh,
                mat: mat,
                pos: new THREE.Vector3(),
                vel: new THREE.Vector3(),
                life: 0,
                maxLife: 1.0,
                active: false,
                isPooling: false,
                poolScale: 1.0
            });
        }

        // Part 4: Pre-allocated Crackling Sparks Pool
        this.maxSparks = 100;
        this.sparksPool = [];
        this.sparkGeoMesh = new THREE.BoxGeometry(0.045, 0.045, 0.045);
        
        for (let i = 0; i < this.maxSparks; i++) {
            const mat = new THREE.MeshBasicMaterial({
                color: 0xffdd44,
                transparent: true,
                opacity: 0.0,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });
            const mesh = new THREE.Mesh(this.sparkGeoMesh, mat);
            mesh.visible = false;
            this.scene.add(mesh);
            
            this.sparksPool.push({
                mesh: mesh,
                mat: mat,
                pos: new THREE.Vector3(),
                vel: new THREE.Vector3(),
                life: 0,
                maxLife: 0.4,
                active: false
            });
        }
    }
    
    emit(origin, dir, playerVel) {
        this.ribbonMat.opacity = 0.75;

        // Spawn fluid particles (increased amount for steadier dense stream)
        for (let i = 0; i < 4; i++) {
            const p = this.getFreeFluidParticle();
            if (p) {
                p.active = true;
                p.mesh.visible = true;
                // Extended travel time: 1.3s to 1.7s
                p.life = 1.3 + Math.random() * 0.4;
                p.maxLife = p.life;
                p.pos.copy(origin);
                p.isPooling = false;
                p.poolScale = 1.0;
                
                const spreadX = (Math.random() - 0.5) * 0.16;
                const spreadY = (Math.random() - 0.5) * 0.12;
                const spreadZ = (Math.random() - 0.5) * 0.16;
                
                // Steadier continuous velocity vector
                const speed = 15 + Math.random() * 7;
                p.vel.set(
                    (dir.x + spreadX) * speed + playerVel.x * 0.5,
                    (dir.y + spreadY) * speed * 0.28 + 1.8 + playerVel.y * 0.3,
                    (dir.z + spreadZ) * speed + playerVel.z * 0.5
                );
            }
        }

        // Spawn crackling sparks
        for (let i = 0; i < 3; i++) {
            const s = this.getFreeSparkParticle();
            if (s) {
                s.active = true;
                s.mesh.visible = true;
                s.life = 0.22 + Math.random() * 0.25;
                s.maxLife = s.life;
                s.pos.copy(origin).addScaledVector(dir, 0.1 + Math.random() * 0.6);
                
                const sideDir = new THREE.Vector3(
                    (Math.random() - 0.5) * 1.8,
                    (Math.random() - 0.5) * 1.4,
                    (Math.random() - 0.5) * 1.8
                ).addScaledVector(dir, 1.3).normalize();
                
                const speed = 7 + Math.random() * 11;
                s.vel.copy(sideDir).multiplyScalar(speed);
            }
        }
    }

    getFreeFluidParticle() {
        return this.fluidPool.find(p => !p.active);
    }

    getFreeSparkParticle() {
        return this.sparksPool.find(s => !s.active);
    }
    
    update(dt, muzzleOrigin, muzzleDir) {
        const timeVal = Date.now() * 0.001;

        this.ribbonMat.opacity = Math.max(0.0, this.ribbonMat.opacity - dt * 2.8);

        // A. Dynamic control point path propagation
        this.controlPoints[0].copy(muzzleOrigin);
        for (let i = 1; i < this.numControlPoints; i++) {
            const prev = this.controlPoints[i - 1];
            const target = prev.clone().addScaledVector(muzzleDir, 0.52);
            
            // Buoyancy arcing
            target.y += i * 0.04;
            const time = Date.now() * 0.007;
            target.x += Math.sin(time + i) * 0.02;
            target.z += Math.cos(time + i) * 0.02;
            
            this.controlPoints[i].lerp(target, 15 * dt);
        }

        // B. Update core ribbon
        const posAttr = this.ribbonGeo.attributes.position;
        const upVec = new THREE.Vector3(0, 1, 0);
        for (let i = 0; i < this.numControlPoints; i++) {
            const pt = this.controlPoints[i];
            const width = 0.05 * (1.0 + i * 0.35);
            const offset = upVec.clone().cross(muzzleDir).normalize().multiplyScalar(width);
            
            posAttr.setXYZ(i * 2, pt.x - offset.x, pt.y - offset.y, pt.z - offset.z);
            posAttr.setXYZ(i * 2 + 1, pt.x + offset.x, pt.y + offset.y, pt.z + offset.z);
        }
        posAttr.needsUpdate = true;

        // C. Update Fluid Core particles (Shader-based Spikey Balls & Ground Pooling)
        this.fluidPool.forEach(p => {
            if (!p.active) return;
            
            p.life -= dt;
            if (p.life <= 0) {
                p.active = false;
                p.mesh.visible = false;
                return;
            }

            p.pos.addScaledVector(p.vel, dt);

            // Ground height collision query
            let groundY = -99;
            if (window.TerrainGen && typeof window.TerrainGen.getMeshHeight === 'function') {
                groundY = window.TerrainGen.getMeshHeight(p.pos.x, p.pos.z);
            }

            // Real-time ground pooling mechanic
            if (p.pos.y <= groundY + 0.15) {
                p.pos.y = groundY + 0.06; // Snug right on ground
                p.isPooling = true;
                p.vel.y = 0;
                // Fluid spreading friction
                p.vel.multiplyScalar(0.91); 
                p.poolScale += dt * 3.5; // Rapidly expand outwards to pool
            } else {
                // Flying fluid mechanics: arcing gravity + turbulence
                p.vel.y -= 3.8 * dt; // Droop arcing over distance
                p.vel.x += Math.sin(p.life * 14 + p.mesh.id) * 1.8 * dt;
                p.vel.z += Math.cos(p.life * 14 + p.mesh.id) * 1.8 * dt;
                p.vel.multiplyScalar(0.96);
            }

            p.mesh.position.copy(p.pos);

            const ageRatio = p.life / p.maxLife;
            
            // Dynamic scale handling
            if (p.isPooling) {
                // Flatten the sphere to look like a liquid puddle
                const spread = 1.6 + p.poolScale;
                p.mesh.scale.set(spread, 0.15, spread);
            } else {
                // Normal sphere growth
                const currentSize = THREE.MathUtils.lerp(1.9, 0.15, ageRatio);
                p.mesh.scale.setScalar(currentSize);
            }

            // Update custom ShaderMaterial uniforms
            p.mat.uniforms.uTime.value = timeVal + p.mesh.id * 0.1;
            p.mat.uniforms.uAgeRatio.value = ageRatio;

            // Smoke blending shift
            if (ageRatio < 0.22 && !p.isPooling) {
                p.mat.blending = THREE.NormalBlending;
            } else {
                p.mat.blending = THREE.AdditiveBlending;
            }
        });

        // D. Update Crackling Spark particles
        this.sparksPool.forEach(s => {
            if (!s.active) return;
            
            s.life -= dt;
            if (s.life <= 0) {
                s.active = false;
                s.mesh.visible = false;
                return;
            }

            s.pos.addScaledVector(s.vel, dt);
            s.vel.y -= 4.8 * dt;
            s.vel.multiplyScalar(0.94);
            
            s.mesh.position.copy(s.pos);
            
            const ageRatio = s.life / s.maxLife;
            s.mesh.scale.setScalar(ageRatio * (1.0 + Math.sin(s.life * 60) * 0.3));
            s.mat.opacity = ageRatio * (Math.random() < 0.2 ? 0.35 : 0.9);
            s.mat.color.lerpColors(new THREE.Color(0xff4400), new THREE.Color(0xffffff), ageRatio);
        });
    }

    destroy() {
        this.scene.remove(this.ribbonMesh);
        this.fluidPool.forEach(p => this.scene.remove(p.mesh));
        this.sparksPool.forEach(s => this.scene.remove(s.mesh));
    }
}

window.FlameStream = FlameStream;

window.zombieOnFireTimer = new Float32Array(2500);

window.updateZombieFireState = function(delta) {
    const zState = window.zState;
    const zHP = window.zHP;
    const zPosX = window.zPosX;
    const zPosZ = window.zPosZ;
    const zType = window.zType;
    
    if (!zState || !zHP || !zPosX || !zPosZ) return;

    for (let i = 0; i < zState.length; i++) {
        if (zState[i] === 0) {
            window.zombieOnFireTimer[i] = 0;
            continue;
        }

        if (window.zombieOnFireTimer[i] > 0) {
            window.zombieOnFireTimer[i] -= delta;
            
            // Deal powerful damage over time!
            const prevHP = zHP[i];
            const damage = 8 * delta;
            
            if (zHP[i] > damage) {
                zHP[i] = Math.round(zHP[i] - damage);
            } else {
                zHP[i] = 0;
            }

            // Spawn dynamic fire sparks on top of the burning zombie
            if (Math.random() < 0.22) {
                if (typeof window.emitParticle === 'function') {
                    window.emitParticle(
                        zPosX[i] + (Math.random() - 0.5) * 0.4,
                        0.4 + Math.random() * 1.5,
                        zPosZ[i] + (Math.random() - 0.5) * 0.4,
                        (Math.random() - 0.5) * 1.5,
                        2.2 + Math.random() * 2.0,
                        (Math.random() - 0.5) * 1.5,
                        1.0, 0.15 + Math.random() * 0.45, 0.01,
                        8 + Math.random() * 5,
                        0.4 + Math.random() * 0.4
                    );
                }
            }

            // Handle death from fire tick
            if (zHP[i] <= 0 && prevHP > 0) {
                zState[i] = 0;
                
                if (typeof window.setActiveZombiesCount === 'function') {
                    window.setActiveZombiesCount(window.getActiveZombiesCount() - 1);
                }
                
                if (typeof window.setTotalKillsCount === 'function') {
                    const newKills = window.getTotalKillsCount() + 1;
                    window.setTotalKillsCount(newKills);
                    
                    if (newKills % 10 === 0 && typeof window.triggerZombieFireball === 'function') {
                        window.triggerZombieFireball(zPosX[i], 1.0, zPosZ[i]);
                    }
                }

                if (window.PyramidManager && typeof window.PyramidManager.registerKill === 'function') {
                    window.PyramidManager.registerKill(zPosX[i], 1.0, zPosZ[i]);
                }

                if (window.goreSystem && typeof window.goreSystem.spawnGoreGribs === 'function') {
                    const zTypeLabel = zType[i] === 0 ? 'normal' : (zType[i] === 1 ? 'puker' : 'thrower');
                    window.goreSystem.spawnGoreGribs(zPosX[i], 1.2, zPosZ[i], zTypeLabel);
                }

                if (window.SFX && typeof window.SFX.triggerZombieDie === 'function') {
                    window.SFX.triggerZombieDie();
                }
            }
        }
    }
};
