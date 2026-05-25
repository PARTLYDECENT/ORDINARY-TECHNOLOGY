class ToxicWater {
    constructor(scene) {
        this.scene = scene;
        
        const waterGeo = new THREE.PlaneBufferGeometry(2400, 2400, 256, 256);
        const textureLoader = new THREE.TextureLoader();
        const waterTex = textureLoader.load('assets/water_texture.png');
        waterTex.wrapS = THREE.RepeatWrapping;
        waterTex.wrapT = THREE.RepeatWrapping;
        waterTex.encoding = THREE.sRGBEncoding; // Critical for PBR pipeline

        const waterMat = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uPlayerPos: { value: new THREE.Vector3() },
                uColorDeep: { value: new THREE.Color(0x0f1410) },
                uColorMid: { value: new THREE.Color(0x242a22) },
                uColorGlow: { value: new THREE.Color(0x4a5f3f) },
                uFogColor: { value: new THREE.Color(0x020204) },
                uFogDensity: { value: 0.035 },
                uWaterTexture: { value: waterTex }
            },
            vertexShader: `
                varying vec2 vUv;
                varying vec3 vWorldPos;
                varying float vWaveHeight;
                varying vec3 vNormal;
                uniform float uTime;
                
                // Noise for thick boiling bubbles
                float hash(vec2 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164).xy)) * 43758.5453); }
                float noise(vec2 x) {
                    vec2 i = floor(x);
                    vec2 f = fract(x);
                    float a = hash(i);
                    float b = hash(i + vec2(1.0, 0.0));
                    float c = hash(i + vec2(0.0, 1.0));
                    float d = hash(i + vec2(1.0, 1.0));
                    vec2 u = f * f * (3.0 - 2.0 * f);
                    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
                }

                // Gerstner Wave implementation for realistic fluid motion
                vec3 GerstnerWave(vec4 wave, vec3 p, inout vec3 tangent, inout vec3 binormal) {
                    float steepness = wave.z;
                    float wavelength = wave.w;
                    float k = 2.0 * 3.14159 / wavelength;
                    float c = sqrt(9.8 / k);
                    vec2 d = normalize(wave.xy);
                    float f = k * (dot(d, p.xz) - c * uTime * 0.5);
                    float a = steepness / k;
                    
                    tangent += vec3(
                        -d.x * d.x * (steepness * sin(f)),
                        d.x * (steepness * cos(f)),
                        -d.x * d.y * (steepness * sin(f))
                    );
                    binormal += vec3(
                        -d.x * d.y * (steepness * sin(f)),
                        d.y * (steepness * cos(f)),
                        -d.y * d.y * (steepness * sin(f))
                    );
                    return vec3(
                        d.x * (a * cos(f)),
                        a * sin(f),
                        d.y * (a * cos(f))
                    );
                }

                void main() {
                    vUv = uv;
                    vec4 worldPos = modelMatrix * vec4(position, 1.0);
                    vec3 gridPoint = worldPos.xyz;
                    vec3 tangent = vec3(1.0, 0.0, 0.0);
                    vec3 binormal = vec3(0.0, 0.0, 1.0);
                    vec3 p = gridPoint;
                    
                    // Wave 1: direction(1, 0.5), steepness 0.2, wavelength 20.0
                    p += GerstnerWave(vec4(1.0, 0.5, 0.2, 20.0), gridPoint, tangent, binormal);
                    // Wave 2: direction(0.2, 1.0), steepness 0.15, wavelength 15.0
                    p += GerstnerWave(vec4(0.2, 1.0, 0.15, 15.0), gridPoint, tangent, binormal);
                    // Wave 3: direction(-0.5, -0.2), steepness 0.1, wavelength 10.0
                    p += GerstnerWave(vec4(-0.5, -0.2, 0.1, 10.0), gridPoint, tangent, binormal);
                    
                    // Boiling bubbles - localized displacement
                    float bubbleNoise = noise(worldPos.xz * 0.4 - uTime * 0.6);
                    float bubbles = pow(bubbleNoise, 4.0) * 1.5;
                    p.y += bubbles;
                    
                    vNormal = normalize(cross(binormal, tangent));
                    vWaveHeight = p.y - gridPoint.y;
                    vWorldPos = p;
                    gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
                }
            `,
            fragmentShader: `
                varying vec2 vUv;
                varying vec3 vWorldPos;
                varying float vWaveHeight;
                varying vec3 vNormal;
                uniform float uTime;
                uniform vec3 uPlayerPos;
                uniform vec3 uColorDeep;
                uniform vec3 uColorMid;
                uniform vec3 uFogColor;
                uniform float uFogDensity;
                uniform sampler2D uWaterTexture;

                float hash(vec2 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164).xy)) * 43758.5453); }
                
                float voronoi(vec2 x) {
                    vec2 n = floor(x);
                    vec2 f = fract(x);
                    float m = 8.0;
                    for(int j=-1; j<=1; j++)
                    for(int i=-1; i<=1; i++) {
                        vec2 g = vec2(float(i),float(j));
                        vec2 o = vec2(hash(n + g));
                        vec2 r = g + o - f;
                        float d = dot(r,r);
                        if(d < m) m = d;
                    }
                    return sqrt(m);
                }

                void main() {
                    // Micro-turbulence
                    vec2 uv1 = vWorldPos.xz * 0.1 + uTime * 0.05;
                    vec2 uv2 = vWorldPos.xz * 0.05 - uTime * 0.03;
                    
                    float v1 = voronoi(uv1);
                    float v2 = voronoi(uv2 + v1 * 0.5);
                    
                    // Realistic Depth Absorption (Beer-Lambert law approximation)
                    // Deep water absorbs red rapidly, then green, leaving deep blue
                    float depth = abs(vWaveHeight) * 3.0 + 1.0;
                    vec3 extinction = vec3(0.9, 0.4, 0.1); // Absorb red and green
                    vec3 transmittance = exp(-extinction * depth);
                    
                    // Texture overlay with UV scrolling based on world position
                    vec2 texUv = vWorldPos.xz * 0.02 + uTime * 0.01;
                    vec2 texUv2 = vWorldPos.xz * 0.03 - uTime * 0.015;
                    vec4 texColor1 = texture2D(uWaterTexture, texUv);
                    vec4 texColor2 = texture2D(uWaterTexture, texUv2);
                    vec3 baseTexColor = mix(texColor1.rgb, texColor2.rgb, 0.5);
                    
                    // Base realistic deep sea colors mixed with texture
                    vec3 deepWater = vec3(0.01, 0.05, 0.15) + baseTexColor * 0.4; // Deep ocean blue
                    vec3 shallowWater = vec3(0.05, 0.25, 0.35) + baseTexColor * 0.6; // Shallow tropical teal
                    
                    vec3 col = mix(deepWater, shallowWater, transmittance);
                    
                    // Add subtle foam at crests (vWaveHeight > 0.4)
                    float foam = smoothstep(0.4, 0.8, vWaveHeight) * smoothstep(0.4, 0.8, v1);
                    col = mix(col, vec3(0.8, 0.9, 0.95), foam);
                    
                    vec3 viewDir = normalize(cameraPosition - vWorldPos);
                    
                    // Subsurface scattering (sunlight penetrating wave crests)
                    float sss = smoothstep(0.2, 0.8, vWaveHeight) * 0.5;
                    col += shallowWater * sss;
                    
                    // True Normal mapped reflections and specular
                    vec3 n = normalize(vNormal + vec3(v1 - 0.5, 0.0, v2 - 0.5) * 0.15);
                    
                    // Realistic water Fresnel (IOR = 1.33)
                    float f0 = 0.02;
                    float cosTheta = max(0.0, dot(n, viewDir));
                    float fresnel = f0 + (1.0 - f0) * pow(1.0 - cosTheta, 5.0);
                    
                    vec3 lightDir = normalize(vec3(0.5, 1.0, -0.2));
                    vec3 halfDir = normalize(lightDir + viewDir);
                    
                    // Sun Specular Highlight
                    float spec = pow(max(0.0, dot(n, halfDir)), 128.0) * 2.0; // Tight specular
                    col += vec3(1.0, 0.95, 0.9) * spec * (1.0 - foam); // No specular on foam
                    
                    // Environment Reflection approximation (Sky)
                    vec3 skyReflect = vec3(0.15, 0.35, 0.65); // Realistic sky blue
                    col += skyReflect * fresnel;
                    
                    // Fog
                    float dist = length(cameraPosition - vWorldPos);
                    float fogFactor = 1.0 - exp(-dist * uFogDensity);
                    col = mix(col, uFogColor, fogFactor);
                    
                    // Dynamic opacity based on viewing angle
                    float alpha = mix(0.7, 1.0, fresnel);
                    gl_FragColor = vec4(col, alpha);
                }
            `,
            transparent: true
        });

        this.mesh = new THREE.Mesh(waterGeo, waterMat);
        this.mesh.rotation.x = -Math.PI / 2;
        this.mesh.position.y = -2.0; // Water hazard level
        this.scene.add(this.mesh);
        
        this.waterMat = waterMat;

        // --- ARGON BUBBLE SYSTEM ---
        this.BUBBLE_COUNT = 1500;
        this.bubbleIndex = 0;
        
        this.bubblePositions = new Float32Array(this.BUBBLE_COUNT * 3);
        this.bubbleLifetimes = new Float32Array(this.BUBBLE_COUNT);
        this.bubbleOffsets = new Float32Array(this.BUBBLE_COUNT); // For randomized wobble
        
        for (let i = 0; i < this.BUBBLE_COUNT; i++) {
            this.bubblePositions[i * 3 + 1] = -100; // Hide initially
            this.bubbleOffsets[i] = Math.random() * Math.PI * 2;
        }

        const bubbleGeo = new THREE.BufferGeometry();
        bubbleGeo.setAttribute('position', new THREE.BufferAttribute(this.bubblePositions, 3));
        
        const bubbleMat = new THREE.ShaderMaterial({
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            uniforms: {
                uColor: { value: new THREE.Color(0x00e5ff) }, // Bright argon cyan/blue
            },
            vertexShader: `
                void main() {
                    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
                    // Scale bubbles based on height/distance
                    gl_PointSize = (180.0 + position.y * 15.0) / -mvPos.z; 
                    gl_Position = projectionMatrix * mvPos;
                }
            `,
            fragmentShader: `
                uniform vec3 uColor;
                void main() {
                    float dist = length(gl_PointCoord - vec2(0.5));
                    if (dist > 0.5) discard;
                    
                    // Bubble rim
                    float rim = smoothstep(0.5, 0.4, dist) - smoothstep(0.45, 0.35, dist);
                    // Core highlight
                    float core = smoothstep(0.15, 0.0, dist) * 0.6;
                    
                    float alpha = rim + core;
                    gl_FragColor = vec4(uColor, alpha * 0.85);
                }
            `
        });

        this.bubblesMesh = new THREE.Points(bubbleGeo, bubbleMat);
        this.bubblesMesh.frustumCulled = false; // FIX: Prevent invisible bubbles when geometry starts offscreen
        this.scene.add(this.bubblesMesh);

        // Define random purge vents, keeping some close to center (0,0) so they are seen early
        this.NUM_VENTS = 50; // Increased vent count
        this.vents = [];
        for (let i = 0; i < this.NUM_VENTS; i++) {
            // Bias half the vents to be closer to the origin
            let spread = (i < 20) ? 200 : 800; 
            this.vents.push({
                x: (Math.random() - 0.5) * spread,
                z: (Math.random() - 0.5) * spread,
                radius: 4.0 + Math.random() * 8.0, // Size of vent cluster
                rate: 1 + Math.floor(Math.random() * 4) // Bubbles per frame
            });
        }
    }

    update(uTime, playerPos) {
        if (this.waterMat) {
            this.waterMat.uniforms.uTime.value = uTime;
            if (playerPos) {
                this.waterMat.uniforms.uPlayerPos.value.copy(playerPos);
            }
        }

        // --- ARGON BUBBLES UPDATE ---
        if (this.bubblesMesh) {
            const posAttr = this.bubblesMesh.geometry.attributes.position;
            const positions = posAttr.array;
            
            // Spawn new bubbles at vents
            for (let v = 0; v < this.vents.length; v++) {
                const vent = this.vents[v];
                // Only spawn if active (pulsing vent effect)
                if (Math.random() > 0.3) {
                    for(let i=0; i<vent.rate; i++) {
                        const bIdx = this.bubbleIndex % this.BUBBLE_COUNT;
                        
                        // Spawn at vent with some spread
                        const angle = Math.random() * Math.PI * 2;
                        const r = Math.random() * vent.radius;
                        positions[bIdx * 3] = vent.x + Math.cos(angle) * r;
                        positions[bIdx * 3 + 1] = -6.0 - Math.random() * 2.0; // Deep below water
                        positions[bIdx * 3 + 2] = vent.z + Math.sin(angle) * r;
                        
                        this.bubbleLifetimes[bIdx] = 1.0;
                        this.bubbleIndex++;
                    }
                }
            }
            
            // Update all active bubbles
            for (let i = 0; i < this.BUBBLE_COUNT; i++) {
                if (this.bubbleLifetimes[i] > 0) {
                    // Rise up
                    positions[i * 3 + 1] += 0.06 + Math.random() * 0.04;
                    
                    // Wobble side to side
                    positions[i * 3] += Math.sin(uTime * 3.0 + this.bubbleOffsets[i]) * 0.03;
                    positions[i * 3 + 2] += Math.cos(uTime * 2.5 + this.bubbleOffsets[i]) * 0.03;
                    
                    // Pop at surface
                    if (positions[i * 3 + 1] > -1.95) { // Water surface is at -2.0
                        this.bubbleLifetimes[i] = 0;
                        positions[i * 3 + 1] = -100; // Hide
                    }
                }
            }
            
            posAttr.needsUpdate = true;
        }
    }
}

window.ToxicWater = ToxicWater;
