/**
 * SciFiSkybox - Realistic Atmospheric Procedural Sky Dome
 */

class BackroomsSkybox {
    constructor(scene) {
        this.scene = scene;
        this.time = 0;

        // Use a large sphere to enclose the scene
        const geo = new THREE.SphereGeometry(4000, 64, 64);
        
        const mat = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uSunPos: { value: new THREE.Vector3(0.0, 0.2, -1.0).normalize() },
                uRayleigh: { value: 2.0 },
                uMie: { value: 0.005 },
                uMieDirectionalG: { value: 0.8 },
                cameraPosition: { value: new THREE.Vector3() },
                uIsDesert: { value: (window.GAME_START_CONFIG && window.GAME_START_CONFIG.mapId === 'desert') ? 1.0 : 0.0 }
            },
            vertexShader: `
                varying vec3 vWorldPosition;
                void main() {
                    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                    vWorldPosition = worldPosition.xyz;
                    gl_Position = projectionMatrix * viewMatrix * worldPosition;
                }
            `,
            fragmentShader: `
                uniform float uTime;
                uniform vec3 uSunPos;
                uniform float uIsDesert;
                varying vec3 vWorldPosition;

                // Simple 3D Noise for stars/clouds
                float hash(vec3 p) {
                    p = fract(p * 0.3183099 + 0.1);
                    p *= 17.0;
                    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
                }

                float noise(vec3 x) {
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
                    for (int i = 0; i < 5; i++) {
                        f += amp * noise(p);
                        p *= 2.02;
                        amp *= 0.5;
                    }
                    return f;
                }

                void main() {
                    vec3 viewDir = normalize(vWorldPosition - cameraPosition);
                    vec3 sunDir = normalize(uSunPos);

                    // Global Heat Shimmer (Scorching Mirage) along the horizon boundary in the desert
                    if (uIsDesert > 0.5 && viewDir.y < 0.18) {
                        float shimmerFactor = (0.18 - viewDir.y) / 0.18; // Strongest at horizon line
                        float warpX = sin(viewDir.z * 150.0 + uTime * 15.0) * cos(viewDir.x * 120.0 - uTime * 8.0) * 0.0035 * shimmerFactor;
                        float warpY = cos(viewDir.x * 150.0 - uTime * 12.0) * sin(viewDir.z * 120.0 + uTime * 9.0) * 0.0025 * shimmerFactor;
                        viewDir.x += warpX;
                        viewDir.y += warpY;
                        viewDir = normalize(viewDir);
                    }

                    // Atmosphere base color (Hyper-realistic Rayleigh/Mie approximation)
                    float zenithAngle = max(0.0, viewDir.y);
                    vec3 zenithColor = mix(vec3(0.15, 0.35, 0.65), vec3(0.95, 0.40, 0.10), uIsDesert);
                    vec3 horizonColor = mix(vec3(0.75, 0.85, 0.95), vec3(1.0, 0.70, 0.25), uIsDesert);

                    vec3 skyColor = mix(horizonColor, zenithColor, pow(zenithAngle, 0.7));

                    // Sun glow / Mie scattering - upgraded to blindingly bright and glaring in the desert
                    float sunDot = max(0.0, dot(viewDir, sunDir));
                    float sunSize = mix(256.0, 48.0, uIsDesert); // white hot core
                    float sunGlow = pow(sunDot, sunSize) * mix(10.0, 65.0, uIsDesert);
                    float sunHalo = pow(sunDot, mix(32.0, 6.0, uIsDesert)) * mix(1.5, 12.0, uIsDesert);
                    
                    // Rotating sunburst godrays/shafts
                    float rays = 0.0;
                    if (uIsDesert > 0.5) {
                        float angle = atan(viewDir.y - sunDir.y, length(viewDir.xz - sunDir.xz));
                        float rayPattern = sin(angle * 12.0 + uTime * 0.12) * cos(angle * 7.0 - uTime * 0.06) * 0.5 + 0.5;
                        rays = rayPattern * pow(sunDot, 10.0) * 5.5;
                    }
                    
                    skyColor += vec3(1.0, 0.95, 0.8) * (sunGlow + sunHalo + rays);

                    // Procedural Stars (only visible when looking away from sun/horizon, simulating daylight/twilight)
                    float starNoise = hash(viewDir * 500.0);
                    float starMask = smoothstep(0.998, 1.0, starNoise);
                    float starVisibility = 1.0 - smoothstep(-0.2, 0.1, sunDir.y); // Stars appear when sun sets
                    float twinkle = sin(uTime * 3.0 + starNoise * 10.0) * 0.5 + 0.5;
                    skyColor += vec3(1.0) * starMask * twinkle * starVisibility;

                    // Procedural Volumetric Clouds (Realistic Stratus/Cumulus)
                    vec3 cloudPos = viewDir * 2.0 + vec3(uTime * 0.005, 0.0, uTime * 0.01);
                    float cloudDensity = fbm(cloudPos * 2.5);
                    cloudDensity = smoothstep(0.45, 0.85, cloudDensity);
                    vec3 cloudColor = mix(vec3(0.95, 0.95, 1.0), vec3(1.0, 0.80, 0.60), uIsDesert);
                    
                    // Edge lighting on clouds from sun
                    float cloudShadow = fbm(cloudPos * 2.5 + sunDir * 0.05);
                    vec3 litCloudColor = mix(cloudColor * 0.6, vec3(1.0, 0.95, 0.9), smoothstep(0.4, 0.8, cloudShadow));
                    
                    // Attenuate cloud lighting near horizon
                    litCloudColor *= mix(vec3(0.9, 0.6, 0.5), vec3(1.0), smoothstep(0.0, 0.3, viewDir.y));

                    skyColor = mix(skyColor, litCloudColor, cloudDensity * 0.9);

                    // Tone mapping and Gamma handled by main renderer ACES Filmic + sRGB
                    gl_FragColor = vec4(skyColor, 1.0);
                }
            `,
            side: THREE.BackSide,
            depthWrite: false,
            depthTest: false
        });

        this.mesh = new THREE.Mesh(geo, mat);
        this.mesh.renderOrder = -100; // Render first behind everything
        this.mesh.frustumCulled = false;

        this.scene.add(this.mesh);
        console.log('[Skybox] Realistic Procedural Sky Dome Initialized');
    }

    update(dt, activeCamera) {
        this.time += dt;

        if (this.mesh && this.mesh.material.uniforms) {
            this.mesh.material.uniforms.uTime.value = this.time;
            if (activeCamera) {
                this.mesh.position.copy(activeCamera.position);
                this.mesh.material.uniforms.cameraPosition.value.copy(activeCamera.position);
            }
        }
    }

    renderBackground() {}
    resize() {}
}

window.BackroomsSkybox = BackroomsSkybox;

