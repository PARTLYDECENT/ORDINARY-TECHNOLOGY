// facilities.js
// High-tech sci-fi outposts layout logic and advanced InstancedMesh materials

const FacilityGen = {
    wallGeo: null, wallMat: null,
    floorGeo: null, floorMat: null,
    pillarGeo: null, pillarMat: null,
    sdfBunkerGeo: null, sdfBunkerMat: null,

    init: function (config) {
        // --- SDF BUNKER SHADER MATERIAL ---
        this.sdfBunkerGeo = new THREE.BoxGeometry(14, 6, 10);
        this.sdfBunkerGeo.translate(0, 3, 0); // Translate so base is at y=0

        this.sdfBunkerMat = new THREE.RawShaderMaterial({
            glslVersion: THREE.GLSL3,
            side: THREE.DoubleSide,
            uniforms: {
                uTime: { value: 0 },
                cameraPosition: { value: new THREE.Vector3() },
                projectionMatrix: { value: new THREE.Matrix4() },
                viewMatrix: { value: new THREE.Matrix4() },
                modelMatrix: { value: new THREE.Matrix4() }
            },
            vertexShader: `
                precision highp float;
                in vec3 position;
                in mat4 instanceMatrix;

                uniform mat4 modelMatrix;
                uniform mat4 viewMatrix;
                uniform mat4 projectionMatrix;
                uniform vec3 cameraPosition;

                out vec3 vLocalPos;
                out vec3 vCameraPosLocal;
                out mat4 vInstanceMatrix;

                void main() {
                    vLocalPos = position;
                    vInstanceMatrix = instanceMatrix;
                    
                    mat4 modelInstance = modelMatrix * instanceMatrix;
                    vec4 worldPos = modelInstance * vec4(position, 1.0);

                    // Inverse of modelInstance to get camera in local space
                    mat4 invModelInstance = inverse(modelInstance);
                    vCameraPosLocal = (invModelInstance * vec4(cameraPosition, 1.0)).xyz;

                    gl_Position = projectionMatrix * viewMatrix * worldPos;
                }
            `,
            fragmentShader: `
                precision highp float;

                uniform float uTime;
                uniform mat4 modelMatrix;
                uniform mat4 viewMatrix;
                uniform mat4 projectionMatrix;
                
                in vec3 vLocalPos;
                in vec3 vCameraPosLocal;
                in mat4 vInstanceMatrix;

                out vec4 pc_fragColor;
                
                #define MAX_STEPS 150
                #define MAX_DIST 80.0
                #define SURF_DIST 0.005

                mat2 rot(float a) {
                    float s = sin(a), c = cos(a);
                    return mat2(c, -s, s, c);
                }

                float hash(vec3 p) {
                    p = fract(p * 0.3183099 + 0.1);
                    p *= 17.0;
                    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
                }

                float noise(vec3 x) {
                    vec3 i = floor(x);
                    vec3 f = fract(x);
                    f = f * f * (3.0 - 2.0 * f);
                    return mix(mix(mix( hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
                                   mix( hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
                               mix(mix( hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
                                   mix( hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
                }

                float fbm(vec3 p) {
                    float f = 0.0;
                    float amp = 0.5;
                    for(int i = 0; i < 3; i++) {
                        f += amp * noise(p);
                        p *= 2.01;
                        amp *= 0.5;
                    }
                    return f;
                }
                
                float sdBox(vec3 p, vec3 b) {
                    vec3 q = abs(p) - b;
                    return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
                }

                vec2 map(vec3 p) {
                    float mat_id = 1.0; 
                    vec3 bp = p;
                    bp.y -= 2.0; 
                    float bunker = sdBox(bp, vec3(6.0, 2.0, 4.0));
                    
                    vec3 rp = p;
                    rp.y -= 4.25;
                    float roof = sdBox(rp, vec3(6.5, 0.25, 4.5));
                    bunker = min(bunker, roof);

                    vec3 buttressP = bp;
                    buttressP.x = abs(buttressP.x) - 6.0; 
                    buttressP.y -= 0.5;
                    buttressP.xy *= rot(0.5); 
                    float buttress = sdBox(buttressP, vec3(1.0, 4.0, 3.0));
                    bunker = min(bunker, buttress); 

                    vec3 ep = p;
                    ep.y -= 1.0;
                    ep.z -= 4.0; 
                    float doorway = sdBox(ep, vec3(1.5, 1.0, 2.0));
                    bunker = max(bunker, -doorway); 

                    vec3 hp = p;
                    hp.y -= 1.0;
                    hp.z -= 3.0;
                    float hallway = sdBox(hp, vec3(1.2, 0.9, 2.0));
                    bunker = max(bunker, -hallway); 
                    
                    vec3 vp = p;
                    vp.xz = abs(vp.xz) - 3.5; 
                    vp.y -= 4.5;
                    float vents = sdBox(vp, vec3(0.8, 1.0, 0.8));
                    bunker = min(bunker, vents);

                    vec3 cp = bp;
                    cp.xz = abs(cp.xz) - 5.0;
                    cp.xz *= rot(3.14159 * 0.25); 
                    float slices = sdBox(cp, vec3(2.0, 3.0, 2.0));
                    bunker = max(bunker, -slices); 

                    float damage = fbm(p * 2.0) * 0.15;
                    bunker -= damage; 

                    float d = bunker; 
                    if (d == bunker && p.y > 0.0 && p.y < 0.5 && abs(p.z) < 4.5) {
                        mat_id = 2.0; 
                    }
                    return vec2(d, mat_id);
                }

                vec3 getNormal(vec3 p) {
                    vec2 e = vec2(0.01, 0.0);
                    float d = map(p).x;
                    vec3 n = vec3(
                        d - map(p - e.xyy).x,
                        d - map(p - e.yxy).x,
                        d - map(p - e.yyx).x
                    );
                    return normalize(n);
                }

                float calcAO(vec3 p, vec3 n) {
                    float occ = 0.0;
                    float sca = 1.0;
                    for(int i = 0; i < 5; i++) {
                        float h = 0.01 + 0.12 * float(i) / 4.0;
                        float d = map(p + h * n).x;
                        occ += (h - d) * sca;
                        sca *= 0.95;
                    }
                    return clamp(1.0 - 1.5 * occ, 0.0, 1.0);
                }

                float calcShadow(vec3 ro, vec3 rd) {
                    float res = 1.0;
                    float t = 0.1; 
                    for(int i = 0; i < 40; i++) {
                        float h = map(ro + rd * t).x;
                        res = min(res, 8.0 * h / t); 
                        t += clamp(h, 0.02, 0.5);
                        if(res < 0.001 || t > 20.0) break;
                    }
                    return clamp(res, 0.0, 1.0);
                }
                
                vec3 getMaterialColor(vec3 p, vec3 n, float mat_id) {
                    vec3 w = abs(n);
                    w /= (w.x + w.y + w.z); 
                    float nX = noise(vec3(p.yz * 3.0, 0.0));
                    float nY = noise(vec3(p.xz * 3.0, 0.0));
                    float nZ = noise(vec3(p.xy * 3.0, 0.0));
                    float baseNoise = nX * w.x + nY * w.y + nZ * w.z;
                    float dirt = fbm(p * 0.5);
                    vec3 concreteDark = vec3(0.2, 0.21, 0.22);
                    vec3 concreteLight = vec3(0.35, 0.35, 0.37);
                    vec3 color = mix(concreteDark, concreteLight, baseNoise);
                    color *= mix(1.0, 0.5, smoothstep(0.3, 0.8, dirt));
                    if (mat_id == 2.0) {
                        float stripe = fract((p.x + p.y + p.z) * 2.0);
                        if (stripe > 0.5) color = vec3(0.6, 0.5, 0.1); 
                        else color = vec3(0.1, 0.1, 0.1);
                        color *= mix(1.0, 0.3, dirt); 
                    }
                    return color;
                }

                vec2 boxIntersect(vec3 ro, vec3 rd, vec3 extents) {
                    vec3 tMin = (-extents - ro) / rd;
                    vec3 tMax = (extents - ro) / rd;
                    vec3 t1 = min(tMin, tMax);
                    vec3 t2 = max(tMin, tMax);
                    float tNear = max(max(t1.x, t1.y), t1.z);
                    float tFar = min(min(t2.x, t2.y), t2.z);
                    return vec2(tNear, tFar);
                }

                void main() {
                    vec3 ro = vCameraPosLocal;
                    vec3 rd = normalize(vLocalPos - vCameraPosLocal);
                    
                    vec3 extents = vec3(7.0, 3.0, 5.0);
                    vec3 boxCenter = vec3(0.0, 3.0, 0.0);
                    vec2 tBox = boxIntersect(ro - boxCenter, rd, extents);
                    if (tBox.x > tBox.y || tBox.y < 0.0) discard;
                    
                    float t = max(0.0, tBox.x);
                    float tEnd = tBox.y;
                    bool hit = false;
                    float mat_id = 0.0;
                    
                    for(int i=0; i<MAX_STEPS; i++) {
                        vec3 p = ro + rd * t;
                        vec2 dS = map(p);
                        if(dS.x < SURF_DIST) {
                            hit = true;
                            mat_id = dS.y;
                            break;
                        }
                        t += dS.x * 0.7; 
                        if(t > tEnd) break;
                    }
                    
                    if(!hit) discard;
                    
                    vec3 p = ro + rd * t;
                    vec3 n = getNormal(p);
                    vec3 albedo = getMaterialColor(p, n, mat_id);
                    
                    vec3 lightDir = normalize(vec3(0.8, 0.6, 0.5));
                    float dif = max(dot(n, lightDir), 0.0);
                    float shadow = calcShadow(p + n * 0.01, lightDir);
                    float ao = calcAO(p, n);
                    
                    float skyDif = clamp(0.5 + 0.5 * dot(n, vec3(0.0, 1.0, 0.0)), 0.0, 1.0);
                    vec3 ambient = skyDif * vec3(0.08, 0.1, 0.15) * ao; 
                    
                    vec3 viewDir = normalize(vCameraPosLocal - p);
                    vec3 halfDir = normalize(lightDir + viewDir);
                    float spec = pow(max(dot(n, halfDir), 0.0), 32.0) * 0.2 * ao;
                    
                    vec3 col = albedo * (dif * shadow * vec3(1.0, 0.9, 0.8) + ambient) + spec * shadow * vec3(1.0, 0.9, 0.8);
                    
                    pc_fragColor = vec4(col, 1.0);
                    
                    // Depth Calculation
                    vec4 worldHitPos = modelMatrix * vInstanceMatrix * vec4(p, 1.0);
                    vec4 clipPos = projectionMatrix * viewMatrix * worldHitPos;
                    gl_FragDepth = (clipPos.z / clipPos.w) * 0.5 + 0.5;
                }
            `
        });
        // Solid Concrete Bunker Walls
        this.wallGeo = new THREE.BoxGeometry(config.cellSize, config.cellSize * 0.9, config.cellSize);
        this.wallMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.9, metalness: 0.1 });
        this.wallMat.onBeforeCompile = (shader) => {
            shader.uniforms.uTime = { value: 0 };
            this.wallMat.userData.shader = shader;
            shader.vertexShader = shader.vertexShader.replace(
                `#include <common>`,
                `#include <common>
                varying vec3 vWorldPosOut;
                varying vec3 vLocalPosOut;
                `
            );
            shader.vertexShader = shader.vertexShader.replace(
                `#include <begin_vertex>`,
                `#include <begin_vertex>
                vLocalPosOut = position;
                `
            );
            shader.vertexShader = shader.vertexShader.replace(
                `#include <worldpos_vertex>`,
                `#include <worldpos_vertex>
                vWorldPosOut = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
                `
            );
            shader.fragmentShader = shader.fragmentShader.replace(
                `#include <common>`,
                `#include <common>
                uniform float uTime;
                varying vec3 vWorldPosOut;
                varying vec3 vLocalPosOut;
                float snoise(vec3 v) { return fract(sin(dot(v, vec3(12.9898, 78.233, 45.164))) * 43758.5453); }
                `
            );
            shader.fragmentShader = shader.fragmentShader.replace(
                `#include <color_fragment>`,
                `#include <color_fragment>
                float n = snoise(vWorldPosOut * 4.0);
                diffuseColor.rgb *= 0.8 + n * 0.4;
                // Gritty concrete noise and subtle leaks
                float leak = smoothstep(0.7, 1.0, snoise(vec3(vWorldPosOut.xz * 0.5, vWorldPosOut.y * 0.1)));
                diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.15, 0.15, 0.18), leak * 0.3);
                `
            );
            shader.fragmentShader = shader.fragmentShader.replace(
                `#include <emissivemap_fragment>`,
                `#include <emissivemap_fragment>
                // Faint orange caution lights instead of cyan neon
                float light = step(0.95, sin(vLocalPosOut.y * 5.0 + vLocalPosOut.x * 2.0));
                totalEmissiveRadiance = vec3(1.0, 0.4, 0.0) * light * 0.5;
                `
            );
            shader.fragmentShader = shader.fragmentShader.replace(
                `#include <normal_fragment_maps>`,
                `#include <normal_fragment_maps>
                vec2 bp = vWorldPosOut.xz * 5.0 + vWorldPosOut.y * 5.0;
                float h1 = snoise(vec3(bp, vWorldPosOut.y));
                float h2 = snoise(vec3(bp + vec2(0.1, 0.0), vWorldPosOut.y));
                float h3 = snoise(vec3(bp + vec2(0.0, 0.1), vWorldPosOut.y));
                vec3 detailNormal = normalize(vec3(h1 - h2, 1.0, h1 - h3));
                normal = normalize(normal + detailNormal * 0.6);
                `
            );
            shader.fragmentShader = shader.fragmentShader.replace(
                `#include <roughnessmap_fragment>`,
                `#include <roughnessmap_fragment>
                float leakR = smoothstep(0.7, 1.0, snoise(vec3(vWorldPosOut.xz * 0.5, vWorldPosOut.y * 0.1)));
                roughnessFactor = mix(0.9, 0.3, leakR); // Leaks are wet/glossy
                `
            );
        };

        // High-Tech Hex Floor
        this.floorGeo = new THREE.PlaneGeometry(config.cellSize, config.cellSize);
        this.floorGeo.rotateX(-Math.PI / 2);
        this.floorGeo.translate(0, 0.05, 0); // slightly above dirt
        this.floorMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.3, metalness: 0.7, emissive: 0x00ffff, emissiveIntensity: 0.0 });
        this.floorMat.onBeforeCompile = (shader) => {
            shader.uniforms.uTime = { value: 0 };
            this.floorMat.userData.shader = shader;
            shader.vertexShader = shader.vertexShader.replace(
                `#include <common>`,
                `#include <common>
                varying vec3 vWorldPosOut;
                varying vec3 vLocalPosOut;
                `
            );
            shader.vertexShader = shader.vertexShader.replace(
                `#include <begin_vertex>`,
                `#include <begin_vertex>
                vLocalPosOut = position;
                `
            );
            shader.vertexShader = shader.vertexShader.replace(
                `#include <worldpos_vertex>`,
                `#include <worldpos_vertex>
                vWorldPosOut = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
                `
            );
            shader.fragmentShader = shader.fragmentShader.replace(
                `#include <common>`,
                `#include <common>
                uniform float uTime;
                varying vec3 vWorldPosOut;
                varying vec3 vLocalPosOut;
                
                // Hexagon distance function
                float hexDist(vec2 p) {
                    p = abs(p);
                    float c = dot(p, normalize(vec2(1.0, 1.73)));
                    return max(c, p.x);
                }
                `
            );
            shader.fragmentShader = shader.fragmentShader.replace(
                `#include <color_fragment>`,
                `#include <color_fragment>
                vec2 gridCenter = floor(vWorldPosOut.xz * 1.5) + 0.5;
                vec2 hp = (vWorldPosOut.xz * 1.5) - gridCenter;
                float dist = hexDist(hp);
                float border = smoothstep(0.45, 0.5, dist);
                diffuseColor.rgb = mix(vec3(0.1, 0.15, 0.2), vec3(0.02, 0.05, 0.08), border);
                `
            );
            shader.fragmentShader = shader.fragmentShader.replace(
                `#include <emissivemap_fragment>`,
                `#include <emissivemap_fragment>
                float hp2 = hexDist( (vWorldPosOut.xz * 1.5) - (floor(vWorldPosOut.xz * 1.5) + 0.5) );
                float hborder = smoothstep(0.45, 0.5, hp2);
                float pulse = 0.5; // Static for performance
                totalEmissiveRadiance = vec3(0.0, 0.3, 0.8) * hborder * pulse * 1.2;
                `
            );
            shader.fragmentShader = shader.fragmentShader.replace(
                `#include <normal_fragment_maps>`,
                `#include <normal_fragment_maps>
                vec2 gridCenterN = floor(vWorldPosOut.xz * 1.5) + 0.5;
                vec2 hpN = (vWorldPosOut.xz * 1.5) - gridCenterN;
                float distN = hexDist(hpN);
                float borderN = smoothstep(0.4, 0.5, distN);
                // Create a bevel effect on the hexagons
                vec3 hexNormal = vec3(hpN.x * borderN, 1.0, hpN.y * borderN);
                normal = normalize(normal + hexNormal * 0.5);
                `
            );
            shader.fragmentShader = shader.fragmentShader.replace(
                `#include <roughnessmap_fragment>`,
                `#include <roughnessmap_fragment>
                vec2 gridCenterR = floor(vWorldPosOut.xz * 1.5) + 0.5;
                vec2 hpR = (vWorldPosOut.xz * 1.5) - gridCenterR;
                float distR = hexDist(hpR);
                float borderR = smoothstep(0.45, 0.5, distR);
                roughnessFactor = mix(0.3, 0.8, borderR); // Borders are rougher
                `
            );
        };
        // Pillars for corners and supports
        this.pillarGeo = new THREE.CylinderGeometry(config.cellSize * 0.25, config.cellSize * 0.35, config.cellSize * 1.8, 8);
        this.pillarGeo.translate(0, config.cellSize * 0.9, 0); // anchor to bottom
        this.pillarMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5, metalness: 0.9, emissive: 0xff8800, emissiveIntensity: 0.0 });
        this.pillarMat.onBeforeCompile = (shader) => {
            shader.uniforms.uTime = { value: 0 };
            this.pillarMat.userData.shader = shader;
            shader.vertexShader = shader.vertexShader.replace(
                `#include <common>`,
                `#include <common>
                 varying vec3 vLocalPosOut;
                `
            );
            shader.vertexShader = shader.vertexShader.replace(
                `#include <begin_vertex>`,
                `#include <begin_vertex>
                vLocalPosOut = position;
                `
            );
            shader.fragmentShader = shader.fragmentShader.replace(
                `#include <common>`,
                `#include <common>
                 uniform float uTime;
                 varying vec3 vLocalPosOut;
                `
            );
            shader.fragmentShader = shader.fragmentShader.replace(
                `#include <emissivemap_fragment>`,
                `#include <emissivemap_fragment>
                float orangePulse = 0.0; // Static for performance
                totalEmissiveRadiance = vec3(1.0, 0.5, 0.0) * orangePulse * 3.0;
                `
            );
        };

        // Industrial Pipes - Enhanced "Brilliant Orange Brop"
        this.pipeGeo = new THREE.CylinderGeometry(0.16, 0.16, 1.0, 8);
        this.pipeMat = new THREE.MeshStandardMaterial({ 
            color: 0xff4400, 
            roughness: 0.2, 
            metalness: 0.8,
            emissive: 0xff3300,
            emissiveIntensity: 3.5
        });
        this.pipeMat.onBeforeCompile = (shader) => {
            shader.uniforms.uTime = { value: 0 };
            this.pipeMat.userData.shader = shader;
            shader.vertexShader = shader.vertexShader.replace(`#include <common>`, `#include <common>\nvarying vec3 vWorldPos;`);
            shader.vertexShader = shader.vertexShader.replace(`#include <worldpos_vertex>`, `#include <worldpos_vertex>\nvWorldPos = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;`);
            shader.fragmentShader = shader.fragmentShader.replace(`#include <common>`, `#include <common>\nuniform float uTime;\nvarying vec3 vWorldPos;`);
            shader.fragmentShader = shader.fragmentShader.replace(`#include <color_fragment>`, `#include <color_fragment>\nfloat stripe = step(0.85, fract(vWorldPos.x * 0.5 + vWorldPos.z * 0.5 + vWorldPos.y * 0.5));\ndiffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.05, 0.05, 0.08), stripe * 0.8);`);
            shader.fragmentShader = shader.fragmentShader.replace(
                `#include <emissivemap_fragment>`,
                `#include <emissivemap_fragment>
                float pulse = sin(uTime * 5.0 + (vWorldPos.x + vWorldPos.z + vWorldPos.y) * 0.5) * 0.5 + 0.5;
                totalEmissiveRadiance *= 0.6 + pulse * 1.5;
                `
            );
        };

        // Industrial Girders
        this.girderGeo = new THREE.BoxGeometry(config.cellSize, 0.15, 0.15);
        this.girderMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.3, metalness: 0.9, emissive: 0xff4400, emissiveIntensity: 0.0 });
        this.girderMat.onBeforeCompile = (shader) => {
            shader.uniforms.uTime = { value: 0 };
            this.girderMat.userData.shader = shader;
        };

        // Low Barriers / Fences
        this.lowWallGeo = new THREE.BoxGeometry(config.cellSize, config.cellSize * 0.5, 0.15);
        this.lowWallMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7, metalness: 0.3 });

        // Steam Vents
        this.steamGeo = new THREE.CylinderGeometry(0.02, 0.6, 2.5, 8, 4, true);
        this.steamGeo.translate(0, 1.25, 0);
        this.steamMat = new THREE.ShaderMaterial({
            uniforms: { uTime: { value: 0 } },
            vertexShader: `
                varying vec2 vUv;
                varying float vY;
                uniform float uTime;
                void main() {
                    vUv = uv;
                    vY = position.y;
                    vec3 pos = position;
                    float offset = sin(uTime * 3.0 + vY * 2.0) * 0.15 * (vY / 2.5);
                    pos.x += offset;
                    pos.z += cos(uTime * 2.5 + vY * 1.5) * 0.1 * (vY / 2.5);
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                }
            `,
            fragmentShader: `
                varying vec2 vUv;
                varying float vY;
                uniform float uTime;
                float noise(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
                void main() {
                    float fade = smoothstep(0.0, 0.8, vY) * smoothstep(2.5, 1.2, vY);
                    float n = noise(vUv * 5.0 + vec2(0.0, uTime * 1.2));
                    gl_FragColor = vec4(0.9, 0.95, 1.0, fade * (0.2 + n * 0.3));
                }
            `,
            transparent: true,
            depthWrite: false,
            side: THREE.DoubleSide
        });
    },

    update: function (delta, camera) {
        if (this.sdfBunkerMat) {
            this.sdfBunkerMat.uniforms.uTime.value += delta;
            if (camera) {
                this.sdfBunkerMat.uniforms.cameraPosition.value.copy(camera.position);
                this.sdfBunkerMat.uniforms.projectionMatrix.value.copy(camera.projectionMatrix);
                this.sdfBunkerMat.uniforms.viewMatrix.value.copy(camera.matrixWorldInverse);
            }
        }
        if (this.wallMat && this.wallMat.userData && this.wallMat.userData.shader) {
            this.wallMat.userData.shader.uniforms.uTime.value += delta;
        }
        if (this.floorMat && this.floorMat.userData && this.floorMat.userData.shader) {
            this.floorMat.userData.shader.uniforms.uTime.value += delta;
        }
        if (this.pillarMat && this.pillarMat.userData && this.pillarMat.userData.shader) {
            this.pillarMat.userData.shader.uniforms.uTime.value += delta;
        }
        if (this.girderMat && this.girderMat.userData && this.girderMat.userData.shader) {
            this.girderMat.userData.shader.uniforms.uTime.value += delta;
        }
        if (this.pipeMat && this.pipeMat.userData && this.pipeMat.userData.shader) {
            this.pipeMat.userData.shader.uniforms.uTime.value += delta;
        }
        if (this.steamMat) {
            this.steamMat.uniforms.uTime.value += delta;
        }
    }
};
