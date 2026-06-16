/**
 * gore.js - Squelchy Organic Viscera & Raymarched Exotic Guts System
 * Morphing intestinal loops, yellow-white adipose layers, fibrous biological strands,
 * and high-gloss wet specular highlighting for hyper-detailed gore.
 */

class GoreSystem {
    constructor(scene) {
        this.scene = scene;
        this.gibs = [];
        this.splatters = [];
        this.sdfBlobs = [];
        
        // --- Standard Physical Gibs Config (Viscous Meaty Obsidian) ---
        this.fleshMat = new THREE.MeshStandardMaterial({
            color: 0x3d0202, 
            roughness: 0.10,
            metalness: 0.05,
            emissive: 0x1d0100
        });

        this.splatMat = new THREE.MeshStandardMaterial({
            color: 0x1e0100, 
            transparent: true,
            opacity: 0.88,
            depthWrite: false,
            polygonOffset: true,
            polygonOffsetFactor: -4
        });

        this.gibGeos = [
            new THREE.IcosahedronGeometry(0.11, 0), 
            new THREE.BoxGeometry(0.07, 0.20, 0.07),  
            new THREE.SphereGeometry(0.09, 4, 4)      
        ];

        // --- Shared Bounding Plane for Raymarched exotic guts ---
        this.blobGeo = new THREE.PlaneGeometry(1.4, 1.4);

        // --- GLSL Raymarching Shader Specifications ---
        this.vertexShader = `
            varying vec2 vUv;
            uniform float uFlatOnGround;

            void main() {
                vUv = uv;
                if (uFlatOnGround > 0.5) {
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                } else {
                    float scaleX = length(vec3(modelMatrix[0][0], modelMatrix[0][1], modelMatrix[0][2]));
                    float scaleY = length(vec3(modelMatrix[1][0], modelMatrix[1][1], modelMatrix[1][2]));
                    vec4 mvPosition = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
                    mvPosition.xyz += vec3(position.x * scaleX, position.y * scaleY, 0.0);
                    gl_Position = projectionMatrix * mvPosition;
                }
            }
        `;

        this.fragmentShader = `
            varying vec2 vUv;
            uniform float uTime;
            uniform float uProgress;
            uniform float uSeed;
            uniform float uBlobType;

            mat2 rot(float a) {
                float s = sin(a), c = cos(a);
                return mat2(c, -s, s, c);
            }

            float smin(float a, float b, float k) {
                float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
                return mix(b, a, h) - k * h * (1.0 - h);
            }

            float sdCapsule(vec3 p, vec3 a, vec3 b, float r) {
                vec3 pa = p - a, ba = b - a;
                float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
                return length(pa - ba * h) - r;
            }

            float sdTorus(vec3 p, vec2 t) {
                vec2 q = vec2(length(p.xz) - t.x, p.y);
                return length(q) - t.y;
            }

            vec2 map(vec3 p, float progress, float seed, float type) {
                float t = uTime * 6.5 + seed;

                // 1. Twist space organically to simulate visceral squelch and wiggle
                float twistVal = sin(p.y * 6.0 + t) * 0.16 * (1.0 - progress);
                p.xz *= rot(twistVal);

                // --- SHAPE A: Sinuous Intestinal Tract Loop (Torus segment + wave) ---
                vec3 tp = p - vec3(0.0, 0.06, 0.0);
                tp.x += sin(tp.y * 9.0 + t * 0.6) * 0.06 * (1.0 - progress);
                float torusOuterRad = mix(0.24, 0.32, progress);
                float torusInnerRad = mix(0.08, 0.04, progress);
                float gutsLoop = sdTorus(tp.yxz, vec2(torusOuterRad, torusInnerRad));

                // --- SHAPE B: Bubbling Organ Lobes (Metaballs) ---
                float r1 = mix(0.20, 0.05, progress);
                float r2 = mix(0.16, 0.04, progress);
                
                vec3 c1, c2;
                if (type < 0.5) {
                    // Melting / sliding viscera
                    float drip = progress * 1.3;
                    c1 = vec3(0.04 * sin(t), 0.12 - drip * 0.5, 0.0);
                    c2 = vec3(-0.05 * cos(t * 1.1), -0.06 - drip * 0.9, 0.06);
                    p.y *= mix(1.0, 2.4, progress);
                    p.xz *= mix(1.0, 1.7, progress);
                } else {
                    // Splitting / Bursting organs
                    float explode = progress * 2.4;
                    c1 = vec3(0.0, 0.06, 0.0) + vec3(sin(seed)*0.16, cos(seed)*0.16, 0.0) * explode;
                    c2 = vec3(0.0, -0.06, 0.0) + vec3(-sin(seed)*0.16, -cos(seed)*0.16, 0.0) * explode;
                    r1 *= mix(1.0, 1.4, progress);
                    r2 *= mix(1.0, 1.2, progress);
                }

                float lobe1 = length(p - c1) - r1;
                float lobe2 = length(p - c2) - r2;
                float lobes = smin(lobe1, lobe2, 0.12);

                // --- SHAPE C: Fibrous Strands (Visceral ligaments stretching) ---
                float strandY = p.y;
                float strandX = sin(strandY * 14.0 + t) * 0.03 * (1.0 - progress);
                float fibrousStrand = sdCapsule(p - vec3(strandX, 0.0, 0.0), vec3(0.0, -0.38, 0.0), vec3(0.0, 0.38, 0.0), mix(0.038, 0.005, progress));

                // Blending biological shapes organically
                float d = smin(gutsLoop, lobes, mix(0.1, 0.18, progress));
                d = smin(d, fibrousStrand, 0.08);

                // Dynamic squelching noise
                float squelch = sin(p.x * 22.0 + t) * cos(p.y * 18.0 - t) * sin(p.z * 20.0) * mix(0.016, 0.001, progress);
                d += squelch;

                if (type < 0.5) {
                    // Puddle pooling flat plane
                    float puddleY = -0.45;
                    float puddle = p.y - puddleY;
                    d = smin(d, puddle, mix(0.12, 0.44, progress));
                } else {
                    float cellBubble = sin(p.x * 32.0 + seed) * sin(p.y * 28.0) * sin(p.z * 30.0) * 0.018 * (1.0 - progress);
                    d += cellBubble;
                }

                // Materials: 
                // 1.0 = Raw Meaty Crimson
                // 2.0 = Yellow-White Adipose / Intestinal Fat
                // 3.0 = Glowing Molten Core
                float mat = 1.0;
                
                float stripe = sin(p.y * 36.0) * cos(p.x * 36.0);
                if (d == gutsLoop && stripe > 0.28 && progress < 0.5) {
                    mat = 2.0; // Adipose
                }

                float coreRadius = mix(0.09, 0.015, progress);
                if (length(p - c1) < coreRadius || length(p - c2) < coreRadius * 0.8) {
                    mat = 3.0; // Emissive core
                }

                return vec2(d, mat);
            }

            void main() {
                vec2 p = vUv * 2.0 - 1.0;
                vec3 ro = vec3(0.0, 0.0, 1.8);
                vec3 rd = normalize(vec3(p, -1.2));

                float t = 0.0, tmax = 4.5;
                vec2 res = vec2(-1.0);
                bool hit = false;

                for (int i = 0; i < 48; i++) {
                    vec3 pos = ro + rd * t;
                    res = map(pos, uProgress, uSeed, uBlobType);
                    if (res.x < 0.001) {
                        hit = true;
                        break;
                    }
                    if (t > tmax) break;
                    t += res.x * 0.50; // step safety factor
                }

                if (!hit) discard;

                vec3 pos = ro + rd * t;
                vec2 eps = vec2(0.002, 0.0);
                vec3 nor = normalize(vec3(
                    map(pos + eps.xyy, uProgress, uSeed, uBlobType).x - map(pos - eps.xyy, uProgress, uSeed, uBlobType).x,
                    map(pos + eps.yxy, uProgress, uSeed, uBlobType).x - map(pos - eps.yxy, uProgress, uSeed, uBlobType).x,
                    map(pos + eps.yyx, uProgress, uSeed, uBlobType).x - map(pos - eps.yyx, uProgress, uSeed, uBlobType).x
                ));

                // VISCERAL EXOTIC COLORS
                vec3 deepMeatyCrimson = vec3(0.42, 0.01, 0.01);
                vec3 adiposeFat = vec3(0.86, 0.82, 0.65); // greasy yellow-white intestinal fat
                vec3 moltenLava = vec3(1.0, 0.35, 0.0);
                vec3 charredCrust = vec3(0.06, 0.05, 0.05);

                float cool = uProgress;
                vec3 fleshCol = deepMeatyCrimson;

                if (res.y > 1.5 && res.y < 2.5) {
                    // Adipose / Fat cools into dark grayish fat
                    fleshCol = mix(adiposeFat, vec3(0.35, 0.32, 0.28), cool * 0.90);
                } else if (res.y > 2.5) {
                    // Superheated magma veins
                    float corePulse = 1.8 + 1.4 * sin(uTime * 20.0 + uSeed * 12.0);
                    fleshCol = mix(moltenLava * corePulse, charredCrust, cool * 0.99);
                } else {
                    // Standard muscle tissue cools to charred black
                    fleshCol = mix(deepMeatyCrimson, charredCrust, cool * 0.88);
                }

                // Squelchy wave flares
                float boil = sin(pos.y * 36.0 + uTime * 15.0) * cos(pos.x * 32.0 - uTime * 10.0);
                if (boil > 0.65 && uProgress < 0.70) {
                    fleshCol = mix(fleshCol, vec3(1.0, 0.40, 0.0) * 1.8, 0.80 * (1.0 - cool));
                }

                vec3 col = fleshCol;

                // Multi-light shading
                vec3 keyLight = normalize(vec3(0.5, 1.0, 0.8));
                float dif = clamp(dot(nor, keyLight), 0.1, 1.0);
                col *= dif;

                // Wet visceral gloss highlight (extremely high-sheen greasy highlight)
                vec3 halfV = normalize(keyLight - rd);
                float spec = pow(max(0.0, dot(nor, halfV)), 32.0) * 0.78 * (1.0 - cool * 0.65);
                col += vec3(0.95, 0.95, 0.90) * spec;

                float alpha = 1.0;
                if (uProgress > 0.5) {
                    alpha = (1.0 - uProgress) / 0.5;
                }

                gl_FragColor = vec4(col, alpha);
            }
        `;
    }

    spawnGoreGribs(x, y, z, type = 'normal') {
        this.spawnDeath(new THREE.Vector3(x, y, z), type);
    }

    spawnDeath(pos, type = 'normal') {
        const isGoliath = type === 'goliath' || type === 'thrower';
        const gibCount = isGoliath ? 18 : 8;
        const blobCount = isGoliath ? 7 : 4;

        // 1. Standard Physical Debris chunks
        for (let i = 0; i < gibCount; i++) {
            const geo = this.gibGeos[Math.floor(Math.random() * this.gibGeos.length)];
            const gib = new THREE.Mesh(geo, this.fleshMat);
            
            gib.position.copy(pos);
            gib.position.y += 0.3 + Math.random() * 0.8;
            
            const angle = Math.random() * Math.PI * 2;
            const force = 3.5 + Math.random() * 6.5;
            
            this.gibs.push({
                mesh: gib,
                velocity: new THREE.Vector3(
                    Math.cos(angle) * force * (Math.random() * 0.4 + 0.6),
                    4.0 + Math.random() * 8.0,
                    Math.sin(angle) * force * (Math.random() * 0.4 + 0.6)
                ),
                rotation: new THREE.Vector3(
                    Math.random() * 0.25,
                    Math.random() * 0.25,
                    Math.random() * 0.25
                ),
                life: 2.0 + Math.random() * 1.5,
                onGround: false
            });
            
            this.scene.add(gib);
        }

        // 3. Exotic Raymarched "Blood & Guts" Blobs
        for (let i = 0; i < blobCount; i++) {
            const blobSeed = Math.random() * 100.0;
            const blobType = 1.0; // Keep all blobs as 3D volumetric flying viscera
            
            const mat = new THREE.ShaderMaterial({
                uniforms: {
                    uTime: { value: Math.random() * 10.0 },
                    uProgress: { value: 0.0 },
                    uSeed: { value: blobSeed },
                    uBlobType: { value: blobType },
                    uFlatOnGround: { value: 0.0 }
                },
                vertexShader: this.vertexShader,
                fragmentShader: this.fragmentShader,
                transparent: true,
                depthWrite: false,
                depthTest: true
            });

            const blob = new THREE.Mesh(this.blobGeo, mat);
            blob.position.copy(pos);
            blob.position.y += 0.2 + Math.random() * 0.8;

            const angle = Math.random() * Math.PI * 2;
            const hForce = 3.5 + Math.random() * 4.5;
            
            const blobScale = isGoliath ? 0.95 + Math.random() * 0.55 : 0.65 + Math.random() * 0.45;
            blob.scale.setScalar(blobScale);

            this.sdfBlobs.push({
                mesh: blob,
                material: mat,
                position: blob.position.clone(),
                velocity: new THREE.Vector3(
                    Math.cos(angle) * hForce,
                    4.5 + Math.random() * 5.5,
                    Math.sin(angle) * hForce
                ),
                onGround: false,
                progress: 0.0,
                type: blobType,
                lifeTime: 1.8 + Math.random() * 1.0,
                scale: blobScale
            });

            this.scene.add(blob);
        }
    }

    update(dt) {
        // --- Standard Physical Gibs ---
        for (let i = this.gibs.length - 1; i >= 0; i--) {
            const g = this.gibs[i];
            g.life -= dt;

            if (g.life <= 0) {
                this.scene.remove(g.mesh);
                this.gibs.splice(i, 1);
                continue;
            }

            if (!g.onGround) {
                g.velocity.y -= 22 * dt;
                g.mesh.position.addScaledVector(g.velocity, dt);
                
                g.mesh.rotation.x += g.rotation.x;
                g.mesh.rotation.y += g.rotation.y;
                g.mesh.rotation.z += g.rotation.z;

                const terrainH = window.TerrainGen ? window.TerrainGen.getHeight(g.mesh.position.x, g.mesh.position.z) : 0;
                if (g.mesh.position.y <= terrainH + 0.05) {
                    g.mesh.position.y = terrainH + 0.05;
                    g.onGround = true;
                    g.mesh.scale.y *= 0.35;
                    g.mesh.scale.x *= 1.3;
                    g.mesh.scale.z *= 1.3;
                }
            }

            if (g.life < 0.8) {
                g.mesh.scale.multiplyScalar(0.92);
            }
        }

        // --- Exotic Raymarched Guts & Blobs ---
        for (let i = this.sdfBlobs.length - 1; i >= 0; i--) {
            const b = this.sdfBlobs[i];
            
            b.progress += dt / b.lifeTime;

            if (b.progress >= 1.0) {
                this.scene.remove(b.mesh);
                b.material.dispose();
                this.sdfBlobs.splice(i, 1);
                continue;
            }

            b.material.uniforms.uProgress.value = b.progress;
            b.material.uniforms.uTime.value += dt;

            if (!b.onGround) {
                b.velocity.y -= 15.0 * dt;
                b.position.addScaledVector(b.velocity, dt);

                const terrainH = window.TerrainGen ? window.TerrainGen.getHeight(b.position.x, b.position.z) : 0;
                if (b.position.y <= terrainH + 0.05) {
                    b.position.y = terrainH + 0.05;
                    b.onGround = true;
                    b.velocity.set(0, 0, 0);
                }
            }

            b.mesh.position.copy(b.position);

            // Dissolve smoothly by scaling down to zero as age progresses
            b.mesh.scale.setScalar(b.scale * (1.0 - b.progress));
        }
    }
}

window.GoreSystem = GoreSystem;
