/**
 * SkyboxJungle - Procedural kinetic blocky skybox for the Jungle World
 * Features:
 * 1. Emerald-green glowing aurora waves shifting horizontally.
 * 2. Drifting pixel-art voxel cosmic gas clouds powered by FBM noise.
 * 3. Revolving blocky Minecraft-style square Sun and Moon.
 * 4. Blinking neon stardust.
 * 5. Silicon Motherboard RAM transition: morphs into a neon green matrix wireframe with scrolling hexadecimal code and a spinning CPU microchip sun!
 */

class SkyboxJungle {
    constructor(scene) {
        this.scene = scene;
        this.time = 0;

        // Giant sphere to surround the environment
        const geo = new THREE.SphereGeometry(4000, 64, 64);
        
        const mat = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uBiomeShift: { value: 0.0 }, // 0.0 (Jungle) to 2.0 (RAM Motherboard)
                cameraPosition: { value: new THREE.Vector3() }
            },
            vertexShader: `
                varying vec3 vWorldPosition;
                void main() {
                    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                    vWorldPosition = worldPosition.xyz;
                    gl_Position = projectionMatrix * viewMatrix * worldPosition;
                }
            `,
            side: THREE.BackSide,
            depthWrite: false,
            depthTest: false,
            fragmentShader: `
                uniform float uTime;
                uniform float uBiomeShift;
                varying vec3 vWorldPosition;

                // Simple pseudo-random hash
                float hash(vec3 p) {
                    p = fract(p * 0.3183099 + 0.1);
                    p *= 17.0;
                    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
                }

                float noise3D(vec3 x) {
                    vec3 i = floor(x);
                    vec3 f = fract(x);
                    f = f * f * (3.0 - 2.0 * f);
                    return mix(mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
                                   mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
                               mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
                                   mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
                }

                float fbm(vec3 p) {
                    float f = 0.0;
                    float amp = 0.5;
                    for (int i = 0; i < 4; i++) {
                        f += amp * noise3D(p);
                        p *= 2.05;
                        amp *= 0.5;
                    }
                    return f;
                }

                void main() {
                    vec3 viewDir = normalize(vWorldPosition - cameraPosition);

                    // --- BASE BIOME SKY BACKGROUND ---
                    float zenithAngle = max(0.0, viewDir.y);
                    vec3 jungleZenith = vec3(0.01, 0.08, 0.06);   // Darkest forest green
                    vec3 jungleHorizon = vec3(0.02, 0.22, 0.12);  // Bright emerald horizon
                    vec3 skyColor = mix(jungleHorizon, jungleZenith, pow(zenithAngle, 0.8));

                    // State 2: RAM Motherboard morph
                    float ramAmt = clamp(uBiomeShift - 1.0, 0.0, 1.0);
                    if (ramAmt > 0.0) {
                        vec3 ramZenith = vec3(0.0, 0.01, 0.02);   // deep space digital black
                        vec3 ramHorizon = vec3(0.0, 0.06, 0.04);  // subtle silicon cyan glow
                        vec3 ramBase = mix(ramHorizon, ramZenith, pow(zenithAngle, 0.8));
                        
                        // Cyber wireframe coordinate grid
                        float gridX = step(0.97, fract(viewDir.x * 12.0 + uTime * 0.1));
                        float gridZ = step(0.97, fract(viewDir.z * 12.0 - uTime * 0.1));
                        vec3 wireframe = vec3(0.0, 0.75, 0.38) * max(gridX, gridZ) * smoothstep(0.0, 0.5, viewDir.y);
                        
                        // Scrolling Matrix hexadecimal stardust columns
                        float streamCol = floor(viewDir.x * 48.0) / 48.0;
                        float streamSpeed = hash(vec3(streamCol, 0.0, 0.0)) * 2.0 + 1.0;
                        float streamY = fract(viewDir.y * 3.0 + uTime * 0.4 * streamSpeed);
                        float streamMask = step(0.94, hash(floor(viewDir * 40.0) / 40.0));
                        vec3 matrixLogs = vec3(0.0, 0.98, 0.44) * step(0.92, streamY) * streamMask;

                        vec3 cyberSky = ramBase + wireframe + matrixLogs;
                        skyColor = mix(skyColor, cyberSky, ramAmt);
                    }

                    // --- 1. SHIFTING EMERALD AURORAS (suppressed in RAM phase) ---
                    float auroraPattern = sin(viewDir.x * 5.0 + uTime * 1.2) * cos(viewDir.z * 5.0 - uTime * 0.8);
                    vec3 auroraColor = mix(vec3(0.04, 0.78, 0.42), vec3(0.58, 0.04, 0.85), sin(viewDir.y * 4.0 + uTime * 0.7) * 0.5 + 0.5);
                    float auroraIntensity = smoothstep(0.12, 0.75, viewDir.y) * pow(max(0.0, auroraPattern * 0.5 + 0.5), 2.5) * 1.5;
                    skyColor += auroraColor * auroraIntensity * (1.0 - ramAmt);

                    // --- 2. REVOLVING BLOCKY SUN / SPINNING MICROCHIP ---
                    vec3 sunDir = normalize(vec3(cos(uTime * 0.06), sin(uTime * 0.06), 0.28));
                    vec3 tangentU = normalize(cross(sunDir, vec3(0.0, 1.0, 0.0)));
                    vec3 tangentV = cross(tangentU, sunDir);
                    
                    float uVal = dot(viewDir, tangentU);
                    float vVal = dot(viewDir, tangentV);
                    float sunDot = dot(viewDir, sunDir);

                    // Snap to blocky sky coordinates
                    float pxU = floor(uVal * 80.0) / 80.0;
                    float pxV = floor(vVal * 80.0) / 80.0;

                    if (sunDot > 0.985 && abs(pxU) < 0.045 && abs(pxV) < 0.045) {
                        if (ramAmt > 0.5) {
                            // SPINNING CPU MICROCHIP SUN!
                            float rotAngle = uTime * 1.5;
                            float ru = pxU * cos(rotAngle) - pxV * sin(rotAngle);
                            float rv = pxU * sin(rotAngle) + pxV * cos(rotAngle);
                            
                            // Draws a metallic gray square silicon wafer with golden core
                            if (max(abs(ru), abs(rv)) < 0.02) {
                                skyColor = vec3(0.98, 0.82, 0.12) * 4.0; // Glowing gold bus core
                            } else {
                                skyColor = vec3(0.38, 0.40, 0.42) * 3.0; // Carbon dark wafer
                            }
                        } else {
                            // Glowing golden voxel sun
                            skyColor = mix(skyColor, vec3(1.0, 0.85, 0.24) * 5.0, 1.0 - step(0.04, max(abs(pxU), abs(pxV))));
                        }
                    }
                    
                    // Voxel sun halo rays
                    float halo = step(0.965, sunDot) * 1.2;
                    skyColor += mix(vec3(1.0, 0.65, 0.12), vec3(0.0, 0.98, 0.75), ramAmt) * halo * 0.28;

                    // --- 3. DRIFTING PIXELATED COSMIC CLOUDS (suppressed in RAM phase) ---
                    vec3 blockyCloudPos = floor((viewDir * 3.5 + vec3(uTime * 0.015, 0.0, uTime * 0.02)) * 16.0) / 16.0;
                    float cloudDensity = fbm(blockyCloudPos);
                    cloudDensity = smoothstep(0.48, 0.72, cloudDensity);
                    vec3 cloudCol = mix(vec3(0.02, 0.28, 0.18), vec3(0.38, 0.06, 0.52), sin(uTime * 0.35 + viewDir.x * 2.0) * 0.5 + 0.5);
                    skyColor = mix(skyColor, cloudCol * 1.8, cloudDensity * 0.78 * (1.0 - ramAmt));

                    // --- 4. TWINKLING NEON STARDUST ---
                    float starNoise = hash(floor(viewDir * 400.0) / 400.0);
                    float starMask = smoothstep(0.9982, 1.0, starNoise);
                    float twinkle = sin(uTime * 3.5 + starNoise * 15.0) * 0.5 + 0.5;
                    vec3 starColor = mix(vec3(0.2, 0.95, 0.6), vec3(0.1, 0.85, 0.95), starNoise);
                    skyColor += starColor * starMask * twinkle * 1.4 * (1.0 - smoothstep(0.1, 0.4, sunDir.y));

                    gl_FragColor = vec4(skyColor, 1.0);
                }
            `
        });

        this.mesh = new THREE.Mesh(geo, mat);
        this.mesh.renderOrder = -100;
        this.mesh.frustumCulled = false;

        this.scene.add(this.mesh);
        console.log('[SkyboxJungle] Procedural Kinetic Voxel Skybox Initialized');
    }

    update(dt, activeCamera) {
        this.time += dt;

        if (this.mesh && this.mesh.material.uniforms) {
            this.mesh.material.uniforms.uTime.value = this.time;
            
            // Sync current Biome Morphing shift from window global state!
            if (typeof window.JUNGLE_BIOME_SHIFT === 'number') {
                this.mesh.material.uniforms.uBiomeShift.value = window.JUNGLE_BIOME_SHIFT;
            }

            if (activeCamera) {
                this.mesh.position.copy(activeCamera.position);
                this.mesh.material.uniforms.cameraPosition.value.copy(activeCamera.position);
            }
        }
    }

    renderBackground() {}
    resize() {}

    dispose() {
        this.scene.remove(this.mesh);
        if (this.mesh.geometry) this.mesh.geometry.dispose();
        if (this.mesh.material) this.mesh.material.dispose();
        console.log('[SkyboxJungle] Disposed successfully');
    }
}

window.SkyboxJungle = SkyboxJungle;
