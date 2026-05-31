// terrain.js
// Modularized Terrain Generation with High-Tech FBM Noise and Derivative Normals

const TerrainGen = {
    mesh: null,
    mat: null,

    // JS Port of the GLSL Noise for CPU-side height sampling
    _mod289: (x) => x - Math.floor(x * (1.0 / 289.0)) * 289.0,
    _permute: function (x) { return this._mod289(((x * 34.0) + 1.0) * x); },

    _snoise: function (x, y) {
        const C = [0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439];
        let i = Math.floor(x + (x + y) * C[1]);
        let j = Math.floor(y + (x + y) * C[1]);
        let x0 = x - i + (i + j) * C[0];
        let y0 = y - j + (i + j) * C[0];
        let i1 = x0 > y0 ? 1 : 0;
        let j1 = x0 > y0 ? 0 : 1;
        let x1 = x0 - i1 + C[0];
        let y1 = y0 - j1 + C[0];
        let x2 = x0 - 1.0 + 2.0 * C[0];
        let y2 = y0 - 1.0 + 2.0 * C[0];
        i = this._mod289(i); j = this._mod289(j);
        let p = this._permute(this._permute(j + Math.pow(0, j1) + Math.pow(1, 1)) + i + Math.pow(0, i1) + Math.pow(1, 1));
        // Actually, let's use a simpler but deterministic JS noise for the CPU height
        // to avoid huge performance hits in the main loop, while keeping it 'close enough'
        // or worth the cost for perfect grounding.

        // Re-implementing the exact GLSL logic is complex due to vec3 operations.
        // Let's use a standard robust 2D Simplex port.
        return this.__snoise(x, y);
    },

    _glsl_mod289: function (x) { return x - Math.floor(x * (1.0 / 289.0)) * 289.0; },
    _glsl_permute: function (x) { return this._glsl_mod289(((x * 34.0) + 1.0) * x); },
    // Exact port of GLSL snoise
    __snoise: function (v_x, v_y) {
        let C0 = 0.211324865405187, C1 = 0.366025403784439, C2 = -0.577350269189626, C3 = 0.024390243902439;

        let d_v_Cyy = v_x * C1 + v_y * C1;
        let i_x = Math.floor(v_x + d_v_Cyy);
        let i_y = Math.floor(v_y + d_v_Cyy);

        let d_i_Cxx = i_x * C0 + i_y * C0;
        let x0_x = v_x - i_x + d_i_Cxx;
        let x0_y = v_y - i_y + d_i_Cxx;

        let i1_x = (x0_x > x0_y) ? 1.0 : 0.0;
        let i1_y = (x0_x > x0_y) ? 0.0 : 1.0;

        let x12_x = x0_x + C0 - i1_x;
        let x12_y = x0_y + C0 - i1_y;
        let x12_z = x0_x + C2;
        let x12_w = x0_y + C2;

        i_x = this._glsl_mod289(i_x);
        i_y = this._glsl_mod289(i_y);

        let py0 = this._glsl_permute(i_y + 0.0);
        let py1 = this._glsl_permute(i_y + i1_y);
        let py2 = this._glsl_permute(i_y + 1.0);

        let px0 = this._glsl_permute(py0 + i_x + 0.0);
        let px1 = this._glsl_permute(py1 + i_x + i1_x);
        let px2 = this._glsl_permute(py2 + i_x + 1.0);

        let m0 = Math.max(0.5 - (x0_x * x0_x + x0_y * x0_y), 0.0);
        let m1 = Math.max(0.5 - (x12_x * x12_x + x12_y * x12_y), 0.0);
        let m2 = Math.max(0.5 - (x12_z * x12_z + x12_w * x12_w), 0.0);

        m0 = m0 * m0; m0 = m0 * m0;
        m1 = m1 * m1; m1 = m1 * m1;
        m2 = m2 * m2; m2 = m2 * m2;

        let f0 = px0 * C3; f0 = f0 - Math.floor(f0);
        let f1 = px1 * C3; f1 = f1 - Math.floor(f1);
        let f2 = px2 * C3; f2 = f2 - Math.floor(f2);

        let x__x = 2.0 * f0 - 1.0;
        let x__y = 2.0 * f1 - 1.0;
        let x__z = 2.0 * f2 - 1.0;

        let h_x = Math.abs(x__x) - 0.5;
        let h_y = Math.abs(x__y) - 0.5;
        let h_z = Math.abs(x__z) - 0.5;

        let ox_x = Math.floor(x__x + 0.5);
        let ox_y = Math.floor(x__y + 0.5);
        let ox_z = Math.floor(x__z + 0.5);

        let a0_x = x__x - ox_x;
        let a0_y = x__y - ox_y;
        let a0_z = x__z - ox_z;

        m0 *= 1.79284291400159 - 0.85373472095314 * (a0_x * a0_x + h_x * h_x);
        m1 *= 1.79284291400159 - 0.85373472095314 * (a0_y * a0_y + h_y * h_y);
        m2 *= 1.79284291400159 - 0.85373472095314 * (a0_z * a0_z + h_z * h_z);

        return 130.0 * (
            m0 * (a0_x * x0_x + h_x * x0_y) +
            m1 * (a0_y * x12_x + h_y * x12_y) +
            m2 * (a0_z * x12_z + h_z * x12_w)
        );
    },

    getDesertDuneHeight: function (x, z) {
        let waveX = Math.sin(x * 0.007 + Math.sin(z * 0.003) * 2.0);
        let duneHeight = Math.pow(Math.abs(waveX * 0.5 + 0.5), 1.6) * 11.0 - 2.5;
        let waveY = Math.cos(z * 0.005 + Math.cos(x * 0.004) * 1.5);
        duneHeight += waveY * 2.5;
        let ripple = this.__snoise(x * 0.08, z * 0.08) * 0.4;
        return duneHeight + ripple;
    },

    getHeight: function (x, z) {
        if (window.GAME_START_CONFIG && window.GAME_START_CONFIG.mapId === 'desert') {
            return this.getDesertDuneHeight(x, z);
        }
        if (window.GAME_START_CONFIG && (window.GAME_START_CONFIG.mapId === 'facility' || window.GAME_START_CONFIG.mapId === 'endgame')) {
            return 0.0; // Flat empty plane
        }
        if (window.GAME_START_CONFIG && window.GAME_START_CONFIG.mapId === 'abyss') {
            return -8.0; // Deep seafloor
        }

        // Match the FBM and Magnitude in GLSL EXACTLY
        let v = 0.0;
        let a = 0.5;
        let px = x * 0.005;
        let py = z * 0.005;

        const c = Math.cos(0.5);
        const s = Math.sin(0.5);

        for (let i = 0; i < 6; i++) {
            v += a * this.__snoise(px, py);
            let nx = (c * px - s * py) * 2.0 + 100.0;
            let ny = (s * px + c * py) * 2.0 + 100.0;
            px = nx;
            py = ny;
            a *= 0.5;
        }

        const base = Math.sign(v) * Math.pow(Math.abs(v), 1.2) * 20.0;
        const detail = this.__snoise(x * 0.03, z * 0.03) * 2.5;
        return base + detail;
    },

    // Calculates the actual linear height on the triangle face to prevent clipping/sinking
    getMeshHeight: function (x, z) {
        if (window.ABYSS_MODE) {
            const getRaftHash = (cx, cz) => {
                let h = Math.sin(cx * 12.9898 + cz * 78.233) * 43758.5453123;
                return h - Math.floor(h);
            };
            const cs = 6.25;
            const cx = Math.floor(x / cs);
            const cz = Math.floor(z / cs);
            const isRaft = (cx === 0 && cz === 0) || (getRaftHash(cx, cz) < 0.35);
            const centerX = (cx + 0.5) * cs;
            const centerZ = (cz + 0.5) * cs;
            const raftHalf = 2.25;

            if (isRaft) {
                if (Math.abs(x - centerX) <= raftHalf && Math.abs(z - centerZ) <= raftHalf) {
                    return 0.2;
                }
            }

            const raftRight = getRaftHash(cx + 1, cz) < 0.35;
            if (isRaft && raftRight) {
                const nextCenterX = (cx + 1.5) * cs;
                if (x >= centerX && x <= nextCenterX && Math.abs(z - centerZ) <= 0.85) {
                    return 0.2;
                }
            }

            const raftLeft = (cx - 1 === 0 && cz === 0) || (getRaftHash(cx - 1, cz) < 0.35);
            if (raftLeft && isRaft) {
                const prevCenterX = (cx - 0.5) * cs;
                if (x >= prevCenterX && x <= centerX && Math.abs(z - centerZ) <= 0.85) {
                    return 0.2;
                }
            }

            const raftDown = getRaftHash(cx, cz + 1) < 0.35;
            if (isRaft && raftDown) {
                const nextCenterZ = (cz + 1.5) * cs;
                if (z >= centerZ && z <= nextCenterZ && Math.abs(x - centerX) <= 0.85) {
                    return 0.2;
                }
            }

            const raftUp = (cx === 0 && cz - 1 === 0) || (getRaftHash(cx, cz - 1) < 0.35);
            if (raftUp && isRaft) {
                const prevCenterZ = (cz - 0.5) * cs;
                if (z >= prevCenterZ && z <= centerZ && Math.abs(x - centerX) <= 0.85) {
                    return 0.2;
                }
            }
            return -8.0; // Water level
        }
        const s = 6.25; // Grid spacing in segments
        const x0 = Math.floor(x / s) * s;
        const z0 = Math.floor(z / s) * s;
        const x1 = x0 + s;
        const z1 = z0 + s;

        const h00 = this.getHeight(x0, z0);
        const h10 = this.getHeight(x1, z0);
        const h01 = this.getHeight(x0, z1);
        const h11 = this.getHeight(x1, z1);

        const u = (x - x0) / s;
        const v = (z - z0) / s;

        // Match standard PlaneGeometry triangle layout: two triangles per quad
        // Triangle 1: (0,0), (0,1), (1,1) or (0,0), (1,0), (1,1)?
        // In Three.js PlaneGeometry, quad (i, j) is split into:
        // [i, j+1, i+1] and [i+1, j+1, i+1, j] ... actually it depends on version.
        // For our purposes, a simple diagonal split works:
        if (u + v < 1) {
            // Triangle 1: h00, h10, h01
            return h00 + u * (h10 - h00) + v * (h01 - h00);
        } else {
            // Triangle 2: h11, h10, h01
            return h11 + (1 - u) * (h01 - h11) + (1 - v) * (h10 - h11);
        }
    },

    getMesh: function () {
        if (this.mesh) return this.mesh;

        const terrainGeo = new THREE.PlaneBufferGeometry(2400, 2400, 384, 384);
        const terrainMat = new THREE.MeshStandardMaterial({
            color: 0x888888,
            roughness: 0.9,
            metalness: 0.1
        });

        const glslFBM = `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289v2(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    vec2 i = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289v2(i);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m; m = m*m;
    vec3 x_ = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x_) - 0.5;
    vec3 ox = floor(x_ + 0.5);
    vec3 a0 = x_ - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
    vec3 g;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
}

float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    vec2 shift = vec2(100.0);
    mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
    for (int i = 0; i < 6; ++i) {
        v += a * snoise(p);
        p = rot * p * 2.0 + shift;
        a *= 0.5;
    }
    return v;
}

uniform int uMapType;
float getBiomeNoise(vec2 pos) {
    if (uMapType == 1) return 0.0; // Toxic
    if (uMapType == 2) return 0.0; // Toxic
    if (uMapType == 3) return 1.0; // Wasteland
    if (uMapType == 4) return 1.0; // Desert
    
    // Higher frequency for more randomization
    float n = snoise(pos * 0.0012) * 0.5 + 0.5; 
    n += snoise(pos * 0.004) * 0.3;            
    return clamp(n, 0.0, 1.0);
}

float getTerrainHeight(vec2 pos) {
    if (uMapType == 3 || uMapType == 5) {
        // Facility and Endgame is flat
        return 0.0;
    }
    if (uMapType == 4) {
        // Blending rolling sand dunes mathematically
        float waveX = sin(pos.x * 0.007 + sin(pos.y * 0.003) * 2.0);
        float duneHeight = pow(abs(waveX * 0.5 + 0.5), 1.6) * 11.0 - 2.5;
        float waveY = cos(pos.y * 0.005 + cos(pos.x * 0.004) * 1.5);
        duneHeight += waveY * 2.5;
        float ripple = snoise(pos * 0.08) * 0.4;
        return duneHeight + ripple;
    }
    
    float b = fbm(pos * 0.005);
    float base = sign(b) * pow(abs(b), 1.2) * 20.0;
    float detail = snoise(pos * 0.03) * 2.5;
    return base + detail;
}
`;

        const loader = new THREE.TextureLoader();
        const texToxic = loader.load('assets/toxic_ground.png');
        const texForest = loader.load('assets/forest_ground.png');
        const texWaste = loader.load('assets/black_sand.png');

        [texToxic, texForest, texWaste].forEach(t => {
            t.wrapS = t.wrapT = THREE.RepeatWrapping;
            t.minFilter = THREE.LinearMipmapLinearFilter;
            t.magFilter = THREE.LinearFilter;
        });

        terrainMat.onBeforeCompile = (shader) => {
            shader.uniforms.uTime = { value: 0 };
            shader.uniforms.uPlayerPos = { value: new THREE.Vector2(0, 0) };
            shader.uniforms.texToxic = { value: texToxic };
            shader.uniforms.texForest = { value: texForest };
            shader.uniforms.texWaste = { value: texWaste };
            shader.uniforms.uMapType = { value: 0 };

            shader.vertexShader = glslFBM + `
                varying vec2 vWorldPosRaw;
                varying float vDistToCam;
                varying float vHeight;
            ` + shader.vertexShader;

            shader.vertexShader = shader.vertexShader.replace(
                `#include <beginnormal_vertex>`,
                `#include <beginnormal_vertex>
                 vec4 wPos = modelMatrix * vec4(position, 1.0);
                 vec2 p = wPos.xz;
                 float eps = 0.5;
                 float hL = getTerrainHeight(p + vec2(-eps, 0.0));
                 float hR = getTerrainHeight(p + vec2(eps, 0.0));
                 float hD = getTerrainHeight(p + vec2(0.0, -eps));
                 float hU = getTerrainHeight(p + vec2(0.0, eps));
                 objectNormal = normalize(vec3(hL - hR, hD - hU, 2.0 * eps));
                `
            );

            shader.vertexShader = shader.vertexShader.replace(
                `#include <begin_vertex>`,
                `#include <begin_vertex>
                 vWorldPosRaw = (modelMatrix * vec4(position, 1.0)).xz;
                 vHeight = getTerrainHeight(vWorldPosRaw);
                 transformed.z += vHeight;
                `
            );

            shader.vertexShader = shader.vertexShader.replace(
                `#include <worldpos_vertex>`,
                `#include <worldpos_vertex>
                 vDistToCam = length(worldPosition.xyz - cameraPosition.xyz);`
            );

            shader.fragmentShader = glslFBM + `
                uniform float uTime;
                uniform vec2 uPlayerPos;
                uniform sampler2D texToxic;
                uniform sampler2D texForest;
                uniform sampler2D texWaste;
                varying vec2 vWorldPosRaw;
                varying float vDistToCam;
                varying float vHeight;

                vec4 hash4( vec2 p ) { return fract(sin(vec4( 1.0+dot(p,vec2(127.1,311.7)), 2.0+dot(p,vec2(127.1,311.7)), 3.0+dot(p,vec2(127.1,311.7)), 4.0+dot(p,vec2(127.1,311.7))))*43758.5453123); }

                vec3 textureNoTile( sampler2D tex, vec2 x ) {
                    vec2 p = floor(x);
                    vec2 f = fract(x);
                    vec3 va = vec3(0.0);
                    float w1 = 0.0;
                    for( int j=-1; j<=1; j++ )
                    for( int i=-1; i<=1; i++ ) {
                        vec2 g = vec2(float(i),float(j));
                        vec4 o = hash4( p + g );
                        vec2 ruv = x + o.zw;
                        // Use textureGrad to avoid mipmap artifacts in loops
                        vec3 col = textureGrad( tex, ruv, dFdx(x), dFdy(x) ).xyz;
                        float d = length(g-f+o.xy);
                        float w = exp2(-16.0*d*d);
                        va += col*w;
                        w1 += w;
                    }
                    return va/w1;
                }
            ` + shader.fragmentShader;

            shader.fragmentShader = shader.fragmentShader.replace(
                `#include <map_fragment>`,
                `#include <map_fragment>
                if (uMapType == 5) {
                    // Draw a premium cyber-gothic black reflective obsidian glass floor
                    vec2 gridUv = fract(vWorldPosRaw * 0.1);
                    float gridX = smoothstep(0.015, 0.0, abs(gridUv.x - 0.5));
                    float gridY = smoothstep(0.015, 0.0, abs(gridUv.y - 0.5));
                    float grid = max(gridX, gridY);
                    
                    // Dark glossy purple base with neon purple grid lines pulsing
                    vec3 baseCol = vec3(0.02, 0.005, 0.04);
                    vec3 gridCol = vec3(0.65, 0.1, 0.95) * (0.8 + 0.2 * sin(uTime * 2.5));
                    
                    // Add subtle floor star sparkles
                    float floorStars = fract(sin(dot(floor(vWorldPosRaw * 1.5), vec2(12.9898, 78.233))) * 43758.5453);
                    float sparkle = smoothstep(0.9985, 1.0, floorStars) * (0.5 + 0.5 * sin(uTime * 3.0 + floorStars * 15.0));
                    
                    diffuseColor.rgb = baseCol + gridCol * grid + vec3(1.0) * sparkle;
                    // No standard diffuse terrain blending
                } else {
                    float biomen = getBiomeNoise(vWorldPosRaw);
                    vec2 uv = vWorldPosRaw * 3.0;
                    
                    vec3 colToxic = textureNoTile(texToxic, uv);
                    vec3 colForest = textureNoTile(texForest, uv);
                    vec3 colWaste = textureNoTile(texWaste, uv);
                    
                    // Mute and normalize colors to realistic albedos (darker, less saturated)
                    colToxic = mix(colToxic, vec3(0.1, 0.12, 0.08), 0.7); // Muddy marsh
                    colForest = mix(colForest, vec3(0.08, 0.1, 0.06), 0.7); // Dark forest loam
                    colWaste = mix(colWaste, vec3(0.12, 0.11, 0.1), 0.8); // Dry dirt/sand
                    
                    float slope = 1.0 - vNormal.y; 
                    float cliff = smoothstep(0.3, 0.6, slope);
                    
                    vec3 groundCol;
                    // Realistic biome blending
                    float blend = smoothstep(0.3, 0.7, biomen);
                    groundCol = mix(colToxic, colWaste, blend);
                    
                    // Add localized patches for variety
                    float patches = snoise(vWorldPosRaw * 0.02);
                    groundCol = mix(groundCol, colWaste * 0.8, smoothstep(0.5, 0.8, patches));
                    
                    // Realistic rock cliff blending
                    vec3 rockCol = vec3(0.15, 0.15, 0.16) * textureNoTile(texWaste, uv * 0.5);
                    groundCol = mix(groundCol, rockCol, cliff);
                    
                    // Ambient occlusion / cavity effect from world height and noise
                    float macroAO = smoothstep(-15.0, 30.0, vHeight);
                    float microAO = smoothstep(0.0, 1.0, snoise(vWorldPosRaw * 0.5) * 0.5 + 0.5);
                    groundCol *= 0.5 + 0.5 * macroAO * microAO;
                    
                    // Void Holes
                    float voidMask = snoise(vWorldPosRaw * 0.002);
                    if (voidMask < -0.5) discard; 

                    diffuseColor.rgb = groundCol;
                }
                `
            );
            
            // --- PBR Enhancements ---
            shader.fragmentShader = shader.fragmentShader.replace(
                `#include <roughnessmap_fragment>`,
                `#include <roughnessmap_fragment>
                float r_biome = getBiomeNoise(vWorldPosRaw);
                float r_slope = 1.0 - vNormal.y;
                float r_cliff = smoothstep(0.3, 0.6, r_slope);
                
                // Dirt and rock are very rough in real life
                float targetRoughness = mix(0.7, 0.95, smoothstep(0.4, 0.6, r_biome)); 
                targetRoughness = mix(targetRoughness, 0.85, r_cliff);
                
                roughnessFactor = targetRoughness;
                if (uMapType == 5) roughnessFactor = 0.08;
                `
            );
            
            shader.fragmentShader = shader.fragmentShader.replace(
                `#include <normal_fragment_maps>`,
                `#include <normal_fragment_maps>
                // Procedural bump mapping for high-frequency detail
                vec2 bp = vWorldPosRaw * 2.0;
                float h1 = snoise(bp);
                float h2 = snoise(bp + vec2(0.1, 0.0));
                float h3 = snoise(bp + vec2(0.0, 0.1));
                
                vec3 detailNormal = normalize(vec3(h1 - h2, 0.5, h1 - h3));
                
                // Blend with existing normal if not the glass endgame plane
                if (uMapType != 5) {
                    normal = normalize(normal + detailNormal * 0.4);
                }
                `
            );

            terrainMat.userData.shader = shader;
        };

        this.mat = terrainMat;
        const terrain = new THREE.Mesh(terrainGeo, terrainMat);
        terrain.rotation.x = -Math.PI / 2;
        terrain.receiveShadow = true;
        this.mesh = terrain;
        return terrain;
    },

    follow: function (playerPosition) {
        if (!this.mesh) return;
        const snap = 6.25;
        this.mesh.position.x = Math.floor(playerPosition.x / snap) * snap;
        this.mesh.position.z = Math.floor(playerPosition.z / snap) * snap;
        if (this.mat && this.mat.userData && this.mat.userData.shader) {
            this.mat.userData.shader.uniforms.uPlayerPos.value.set(playerPosition.x, playerPosition.z);
        }
    },

    update: function (delta) {
        if (this.mat && this.mat.userData && this.mat.userData.shader) {
            if (this.mat.userData.shader.uniforms.uTime) {
                this.mat.userData.shader.uniforms.uTime.value += delta;
            }
            if (this.mat.userData.shader.uniforms.uMapType && window.GAME_START_CONFIG) {
                let mt = 0;
                if (window.GAME_START_CONFIG.mapId === 'forest') mt = 1;
                else if (window.GAME_START_CONFIG.mapId === 'toxic') mt = 2;
                else if (window.GAME_START_CONFIG.mapId === 'facility') mt = 3;
                else if (window.GAME_START_CONFIG.mapId === 'desert') mt = 4; // Flat desert
                else if (window.GAME_START_CONFIG.mapId === 'endgame') mt = 5; // Flat obsidian void
                this.mat.userData.shader.uniforms.uMapType.value = mt;
            }
        }
    }
};

window.TerrainGen = TerrainGen;

