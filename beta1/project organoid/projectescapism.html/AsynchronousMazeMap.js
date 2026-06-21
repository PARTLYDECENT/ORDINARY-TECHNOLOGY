/**
 * ASYNCHRONOUS MAZE MAP MANAGER: Raymarched Backrooms (Hyper-Realistic Non-Euclidean SDF Raymarching)
 * Rendered behind all 3D weapons, HUD, hands, and the 3D Stalker using screen-space quad.
 */

// Creepy slimy flesh textured Stalker anomaly
class Stalker {
    constructor() {
        this.group = new THREE.Group();

        // Custom canvas texture for creepy organic flesh/skin
        const fleshCanvas = document.createElement('canvas');
        fleshCanvas.width = 256; fleshCanvas.height = 256;
        const ctx = fleshCanvas.getContext('2d');
        ctx.fillStyle = '#3a2020'; // Base fleshy red/brown
        ctx.fillRect(0, 0, 256, 256);

        // Vein networks
        ctx.strokeStyle = '#5a1515';
        ctx.lineWidth = 2;
        for (let i = 0; i < 20; i++) {
            ctx.beginPath();
            ctx.moveTo(Math.random() * 256, Math.random() * 256);
            for (let j = 0; j < 4; j++) {
                ctx.lineTo(Math.random() * 256, Math.random() * 256);
            }
            ctx.stroke();
        }

        // Necrotic green-brown decaying patches
        for (let i = 0; i < 10; i++) {
            ctx.fillStyle = Math.random() > 0.5 ? '#171a0c' : '#221515';
            ctx.beginPath();
            ctx.arc(Math.random() * 256, Math.random() * 256, 8 + Math.random() * 16, 0, Math.PI * 2);
            ctx.fill();
        }

        const fleshTex = new THREE.CanvasTexture(fleshCanvas);

        // PBR Material: slimy, wet skin (low roughness, high reflectivity)
        const torsoMat = new THREE.MeshStandardMaterial({
            map: fleshTex,
            roughness: 0.15,
            metalness: 0.05
        });

        // Torso
        const torsoGeo = new THREE.BoxGeometry(0.3, 0.6, 0.25);
        this.torso = new THREE.Mesh(torsoGeo, torsoMat);
        this.torso.castShadow = true;
        this.torso.receiveShadow = true;
        this.group.add(this.torso);

        // Holographic cyber-glitch wireframe overlay on torso
        const wireMat = new THREE.MeshBasicMaterial({
            color: 0x00f3ff,
            wireframe: true,
            transparent: true,
            opacity: 0.45
        });
        this.torsoWire = new THREE.Mesh(torsoGeo, wireMat);
        this.group.add(this.torsoWire);

        // Glowing red organic core inside chest
        const coreMat = new THREE.MeshBasicMaterial({ color: 0xff3300 });
        this.heart = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), coreMat);
        this.heart.position.set(0, 0.1, 0.05);
        this.group.add(this.heart);

        // Head
        const headGeo = new THREE.BoxGeometry(0.2, 0.2, 0.2);
        this.head = new THREE.Mesh(headGeo, torsoMat);
        this.head.position.y = 0.45;
        this.head.castShadow = true;
        this.group.add(this.head);

        // Glowing red pinprick eyes
        const eyeGeo = new THREE.SphereGeometry(0.035, 8, 8);
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });

        this.leftEye = new THREE.Mesh(eyeGeo, eyeMat);
        this.leftEye.position.set(-0.065, 0.45, 0.105);
        this.group.add(this.leftEye);

        this.rightEye = new THREE.Mesh(eyeGeo, eyeMat);
        this.rightEye.position.set(0.065, 0.45, 0.105);
        this.group.add(this.rightEye);

        // Spindly, insectoid limbs (4 limbs)
        this.limbs = [];
        const limbParams = [
            { x: -0.15, z: 0.1, rotY: 0 },
            { x: 0.15, z: 0.1, rotY: 0 },
            { x: -0.15, z: -0.1, rotY: 0 },
            { x: 0.15, z: -0.1, rotY: 0 }
        ];

        limbParams.forEach((p, idx) => {
            const limbRoot = new THREE.Group();
            limbRoot.position.set(p.x, 0.1, p.z);

            // Upper limb segment (thin cylinder)
            const seg1 = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.015, 0.8, 6), torsoMat);
            seg1.position.y = -0.4;
            seg1.castShadow = true;
            limbRoot.add(seg1);

            // Knee joint
            const joint = new THREE.Group();
            joint.position.set(0, -0.8, 0);
            limbRoot.add(joint);

            // Lower limb segment
            const seg2 = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.01, 0.8, 6), torsoMat);
            seg2.position.y = -0.4;
            seg2.castShadow = true;
            joint.add(seg2);

            this.group.add(limbRoot);
            this.limbs.push({ root: limbRoot, joint: joint, idx });
        });

        this.group.scale.set(1.5, 1.5, 1.5);
    }

    update(time, speed) {
        // Walk animation: rotate upper limb and joint using sine waves
        this.limbs.forEach(limb => {
            const phase = time * 8.0 * speed + limb.idx * Math.PI / 2;
            const twitch = Math.sin(time * 35.0 + limb.idx * 1.5) * 0.06;

            limb.root.rotation.x = Math.sin(phase) * 0.4 + twitch;
            limb.root.rotation.z = (limb.idx % 2 === 0 ? -0.1 : 0.1) + Math.cos(phase) * 0.1;

            // Knee bending
            limb.joint.rotation.x = -Math.abs(Math.cos(phase)) * 0.8 + twitch;
        });

        // Torso bobbing and head twitching
        this.torso.position.y = Math.sin(time * 16.0) * 0.03;
        this.head.rotation.y = Math.sin(time * 25.0) * 0.1 + (Math.random() - 0.5) * 0.08;
        this.head.rotation.x = Math.cos(time * 18.0) * 0.05 + (Math.random() - 0.5) * 0.05;

        // Animate bioluminescent heart and cyber overlay
        if (this.heart) {
            this.heart.material.color.setRGB(1.0, 0.1 + Math.sin(time * 6.0) * 0.08, 0.0);
            this.heart.scale.setScalar(1.0 + Math.sin(time * 6.0) * 0.15);
        }
        if (this.leftEye && this.rightEye) {
            const eyeGlow = 1.0 + Math.sin(time * 10.0) * 0.35;
            this.leftEye.scale.setScalar(eyeGlow);
            this.rightEye.scale.setScalar(eyeGlow);
        }
        if (this.torsoWire) {
            this.torsoWire.material.opacity = 0.2 + Math.sin(time * 7.5) * 0.18;
            this.torsoWire.rotation.y = Math.sin(time * 1.5) * 0.08;
        }
    }
}

const AsynchronousMazeMapManager = (function () {

    // --- MATH & NOISE ---
    function hash21(x, z) {
        let dot = x * 12.9898 + z * 78.233;
        let p = dot - Math.floor(dot);
        p += (x * 12.9898 + z * 78.233 + 34.56);
        let val = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
        return val - Math.floor(val);
    }

    function sdBox(px, pz, bx, bz) {
        let dx = Math.abs(px) - bx;
        let dz = Math.abs(pz) - bz;
        return Math.sqrt(Math.max(dx, 0)**2 + Math.max(dz, 0)**2) + Math.min(Math.max(dx, dz), 0);
    }

    function checkCollision(x, z) {
        const spacing = 6.0;
        let idX = Math.floor((x + spacing*0.5) / spacing);
        let idZ = Math.floor((z + spacing*0.5) / spacing);
        let qx = ((x + spacing*0.5) % spacing + spacing) % spacing - spacing*0.5;
        let qz = ((z + spacing*0.5) % spacing + spacing) % spacing - spacing*0.5;

        let h = hash21(idX, idZ);
        let d = 1000.0;
        if (h < 0.25) {
            d = sdBox(qx, qz, 1.6, 1.6); 
        } else if (h < 0.6) {
            let h2 = hash21(idX + 0.5, idZ);
            if (h2 > 0.5) d = sdBox(qx, qz, 3.2, 0.6); 
            else d = sdBox(qx, qz, 0.6, 3.2); 
        }
        return d > 0.2; 
    }

    class AsynchronousMazeMapManager {
        constructor(scene, config) {
            this.scene = scene;
            this.config = config;
            this.cellSize = 6.0;

            window.ASYNCHRONOUS_MAZE_MODE = true;

            // Audio Setup
            this.audioCtx = null;
            this.lastHeartbeat = 0;
            this.heartbeatInterval = 1.0;
            this.sanity = 100.0;

            this._initAudio();
            const resumeAudio = () => {
                if (this.audioCtx && this.audioCtx.state === 'suspended') {
                    this.audioCtx.resume();
                }
            };
            window.addEventListener('click', resumeAudio, { once: true });
            window.addEventListener('keydown', resumeAudio, { once: true });

            // Initialize Background Raymarched Quad
            this._initShaderQuad();

            // Spawner/Entity tracking (chases player in 3D through Backrooms)
            this.stalker = new Stalker();
            this.scene.add(this.stalker.group);
            this.stalker.position = new THREE.Vector3(34.0, 0, 34.0);
            this.stalker.group.position.copy(this.stalker.position);
            this.stalker.active = true;
            this.stalker.hp = 100;
            this.stalker.stunTimer = 0;
            this.stalker.lastPathTime = 0;
            this.stalker.path = [];
            this.stalker.takeDamage = (dmg) => {
                this.stalker.hp -= dmg;
                this.stalker.stunTimer = 3.0; // Stun for 3s
                this.triggerStalkerClick(); // clicking screech feedback

                // Dark/black organic goo splatters
                if (typeof emitParticle === 'function') {
                    for (let i = 0; i < 15; i++) {
                        emitParticle(
                            this.stalker.position.x, 0.8, this.stalker.position.z,
                            (Math.random() - 0.5) * 6, Math.random() * 4, (Math.random() - 0.5) * 6,
                            0.05, 0.05, 0.05,
                            2.5 + Math.random() * 2, 0.4
                        );
                    }
                }
            };

            window.stalkerEntity = this.stalker;
        }

        _initShaderQuad() {
            const fsSource = `#version 300 es
            precision highp float;

            in vec2 vUV;
            out vec4 fragColor;

            uniform vec2 u_resolution;
            uniform float u_time;
            uniform vec3 u_cameraPos;
            uniform vec3 u_cameraDir;
            uniform vec3 u_cameraRight;
            uniform vec3 u_cameraUp;

            #define MAX_STEPS 180
            #define MAX_DIST 60.0
            #define SURF_DIST 0.003

            // --- MATH & NOISE ---
            float hash21(vec2 p) {
                p = fract(p * vec2(12.9898, 78.233));
                p += dot(p, p + 34.56);
                return fract(p.x * p.y);
            }

            float noise(vec2 p) {
                vec2 i = floor(p);
                vec2 f = fract(p);
                vec2 u = f * f * (3.0 - 2.0 * f);
                return mix(mix(hash21(i + vec2(0.0,0.0)), hash21(i + vec2(1.0,0.0)), u.x),
                           mix(hash21(i + vec2(0.0,1.0)), hash21(i + vec2(1.0,1.0)), u.x), u.y);
            }

            float fbm(vec2 p) {
                float v = 0.0;
                float a = 0.5;
                mat2 rot = mat2(0.866, -0.5, 0.5, 0.866);
                for (int i = 0; i < 5; i++) {
                    v += a * noise(p);
                    p = rot * p * 2.0;
                    a *= 0.5;
                }
                return v;
            }

            float sdBox(vec3 p, vec3 b) {
                vec3 q = abs(p) - b;
                return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
            }

            float smin(float a, float b, float k) {
                float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
                return mix(b, a, h) - k * h * (1.0 - h);
            }

            // --- ARCHITECTURE ---
            vec2 map(vec3 p) {
                // Structural Baselines
                float floorDist = p.y + 1.2; 
                
                // Grid Setup
                float spacing = 6.0;
                vec2 id = floor((p.xz + spacing*0.5) / spacing);
                vec3 q = p;
                q.xz = mod(p.xz + spacing*0.5, spacing) - spacing*0.5;

                // CEILING LOGIC: The "Void" Panels
                // Create a drop-ceiling grid
                float ceilDist = 2.0 - p.y;
                vec2 ceilId = floor(p.xz * 0.5); // Smaller grid for ceiling tiles
                float tileHash = hash21(ceilId);
                
                // 5% chance for a ceiling tile to be completely missing, revealing the void
                if (tileHash < 0.05) {
                    // Create an upward shaft/hole
                    vec2 localTile = fract(p.xz * 0.5) - 0.5;
                    float holeDist = max(abs(localTile.x), abs(localTile.y)) - 0.45;
                    
                    // Extrude ceiling upwards if inside the hole
                    if(holeDist < 0.0) {
                        ceilDist = 10.0 - p.y; // Pitch black void above
                    } else {
                        // Edges of the broken tile
                        ceilDist = min(ceilDist, (2.0 - p.y) + holeDist); 
                    }
                }

                // WALL/PILLAR LOGIC
                float h = hash21(id);
                float wallDist = MAX_DIST;
                float mat = 0.0; // 0:None, 1:Wallpaper, 2:Carpet, 3:Ceiling, 4:Light, 5:Puddle

                if (h < 0.25) {
                    // Claustrophobic brutalist pillars
                    wallDist = sdBox(q, vec3(1.4, 3.0, 1.4));
                    wallDist -= 0.1; // Smooth
                    mat = 1.0; 
                } else if (h < 0.6) {
                    // Directional walls
                    float h2 = hash21(id + 0.5);
                    if (h2 > 0.5) {
                        wallDist = sdBox(q, vec3(3.0, 3.0, 0.4)); // Thick walls
                    } else {
                        wallDist = sdBox(q, vec3(0.4, 3.0, 3.0));
                    }
                    
                    // Anomalous doorways
                    if (hash21(id + 0.8) > 0.3) {
                        float doorWidth = mix(0.8, 1.5, hash21(id+0.1)); // Random width doors
                        float door = sdBox(q - vec3(0.0, -1.0, 0.0), vec3(doorWidth, 1.8, doorWidth));
                        wallDist = max(wallDist, -door);
                    }
                    mat = 1.0;
                }

                // Fluorescent Lights
                float lightDist = sdBox(q - vec3(0.0, 1.95, 0.0), vec3(0.8, 0.1, 0.4));
                
                // CSG Melt (Walls melt into floor like a disease)
                float d = smin(floorDist, wallDist, 0.25); 
                
                d = min(d, ceilDist);
                d = min(d, lightDist);

                if (d == floorDist) mat = 2.0;       
                else if (d == wallDist) mat = 1.0;   
                else if (d == ceilDist) mat = 3.0;   
                else if (d == lightDist) mat = 4.0;  

                // Puddle Masking on Floor
                if (mat == 2.0) {
                    float puddleMask = smoothstep(0.4, 0.7, fbm(p.xz * 1.5));
                    // Sink the puddle slightly into the floor
                    if (puddleMask > 0.0 && p.y < -1.18) {
                        mat = 5.0; // Puddle material
                    }
                }

                if(abs(d - smin(floorDist, wallDist, 0.25)) < 0.001 && p.y < -0.5) mat = 1.0;

                return vec2(d, mat);
            }

            vec2 rayMarch(vec3 ro, vec3 rd) {
                float dO = 0.0;
                float mat = 0.0;
                for (int i = 0; i < MAX_STEPS; i++) {
                    vec3 p = ro + rd * dO;
                    
                    // DEEP WARP: Domain curving. Space bends downwards slightly.
                    p.y -= dot(p.xz - ro.xz, p.xz - ro.xz) * 0.0015; 

                    vec2 dS = map(p);
                    dO += dS.x * 0.75; // Slower march step to handle extreme warps safely
                    mat = dS.y;
                    
                    if (dO > MAX_DIST || abs(dS.x) < SURF_DIST) break;
                }
                return vec2(dO, mat);
            }

            vec3 getNormal(vec3 p, float mat) {
                vec2 e = vec2(0.005, 0.0);
                vec3 n = normalize(vec3(
                    map(p + e.xyy).x - map(p - e.xyy).x,
                    map(p + e.yxy).x - map(p - e.yxy).x,
                    map(p + e.yyx).x - map(p - e.yyx).x
                ));

                // Material-specific micro-displacement
                if (mat == 2.0) { // Carpet
                    n.x += fbm(p.xz * 30.0) * 0.2;
                    n.z += fbm(p.xz * 30.0 + 12.34) * 0.2;
                    n = normalize(n);
                } else if (mat == 5.0) { // Puddles
                    // Water is mostly flat, slight rippling from hum vibration
                    n.x += sin(p.x * 50.0 + u_time * 2.0) * 0.005;
                    n.z += cos(p.z * 50.0 + u_time * 2.0) * 0.005;
                    n = normalize(n);
                } else if (mat == 1.0) { // Wallpaper
                    n.x += noise(p.xy * 15.0) * 0.03;
                    n.z += noise(p.zy * 15.0) * 0.03;
                    n = normalize(n);
                } else if (mat == 3.0) { // Ceiling
                    float pores = smoothstep(0.4, 0.6, noise(p.xz * 80.0));
                    n.y -= pores * 0.15;
                    n = normalize(n);
                }
                return n;
            }

            float calcSoftShadow(vec3 ro, vec3 rd, float mint, float maxt, float k) {
                float res = 1.0;
                float t = mint;
                for(int i = 0; i < 32; i++) {
                    float h = map(ro + rd * t).x;
                    if(h < 0.001) return 0.0;
                    res = min(res, k * h / t);
                    t += clamp(h, 0.02, 0.25);
                    if(t > maxt) break;
                }
                return clamp(res, 0.0, 1.0);
            }

            float calcAO(vec3 pos, vec3 nor) {
                float occ = 0.0;
                float sca = 1.0;
                for(int i = 0; i < 5; i++) {
                    float h = 0.01 + 0.15 * float(i) / 4.0;
                    float d = map(pos + h * nor).x;
                    occ += (h - d) * sca;
                    sca *= 0.95;
                }
                return clamp(1.0 - 2.0 * occ, 0.0, 1.0);
            }

            vec3 render(vec3 ro, vec3 rd) {
                vec2 trace = rayMarch(ro, rd);
                float d = trace.x;
                float mat = trace.y;

                vec3 col = vec3(0.005, 0.005, 0.005); // Void background

                if (d < MAX_DIST) {
                    vec3 p = ro + rd * d;
                    vec3 p_curved = p; 
                    p_curved.y -= dot(p.xz - ro.xz, p.xz - ro.xz) * 0.0015;
                    vec3 n = getNormal(p_curved, mat);

                    vec3 albedo = vec3(0.0);
                    float roughness = 1.0;
                    float metallic = 0.0;

                    // Puddle logic pre-calculation
                    float puddleDepth = 0.0;
                    if(mat == 5.0) puddleDepth = smoothstep(0.4, 0.7, fbm(p.xz * 1.5));

                    if (mat == 1.0) { // Wallpaper
                        vec3 baseColor = vec3(0.85, 0.75, 0.40);
                        vec2 st = p.xz + p.y;
                        vec2 warpedSt = st + fbm(st * 2.5) * 1.5;
                        float stain = smoothstep(0.3, 0.8, fbm(warpedSt * 1.8));
                        float stripes = fract(p.x * 5.0 + p.z * 5.0);
                        stripes = smoothstep(0.0, 0.1, stripes) * smoothstep(1.0, 0.9, stripes);
                        albedo = mix(baseColor * (0.9 + 0.1*stripes), vec3(0.3, 0.25, 0.15), stain * 0.7);
                        
                        // Creeping Mold at the bottom
                        float mold = smoothstep(-1.0, -1.2, p.y) * fbm(p.xz * 5.0);
                        albedo = mix(albedo, vec3(0.05, 0.08, 0.02), mold);
                        
                        roughness = mix(0.8, 0.9, mold);
                        
                    } else if (mat == 2.0) { // Carpet
                        vec3 carpetBase = vec3(0.65, 0.55, 0.25);
                        float dirt = fbm(p.xz * 4.0);
                        albedo = mix(carpetBase, vec3(0.15, 0.15, 0.1), dirt * 0.6);
                        roughness = 0.6;
                        
                    } else if (mat == 5.0) { // Puddle
                        albedo = vec3(0.1, 0.09, 0.05); // Dark murky water
                        roughness = 0.02; // Highly reflective
                        metallic = 0.5;
                        
                    } else if (mat == 3.0) { // Ceiling
                        albedo = vec3(0.75, 0.75, 0.70);
                        float gridX = smoothstep(0.0, 0.03, abs(fract(p.x * 0.5) - 0.5));
                        float gridZ = smoothstep(0.0, 0.03, abs(fract(p.z * 0.5) - 0.5));
                        albedo *= min(gridX, gridZ);
                        
                        // Water stains on ceiling
                        float leak = smoothstep(0.5, 0.8, fbm(p.xz * 2.0));
                        albedo = mix(albedo, vec3(0.4, 0.35, 0.2), leak * 0.8);
                        roughness = 0.9;
                        
                    } else if (mat == 4.0) { // Light
                        albedo = vec3(1.0, 1.0, 0.9);
                        roughness = 1.0;
                    }

                    // Lighting calculation
                    float spacing = 6.0;
                    vec2 cellId = floor((p.xz + spacing*0.5) / spacing);
                    vec3 lightPos = vec3(cellId.x * spacing, 1.8, cellId.y * spacing);
                    vec2 camCellId = floor((ro.xz + spacing*0.5) / spacing);
                    vec3 lightPos2 = vec3(camCellId.x * spacing, 1.8, camCellId.y * spacing);

                    vec3 l = normalize(lightPos - p);
                    vec3 l2 = normalize(lightPos2 - p);
                    
                    float distToLight = length(lightPos - p);
                    float atten = 1.0 / (1.0 + 0.1 * distToLight + 0.08 * distToLight * distToLight);
                    float distToLight2 = length(lightPos2 - p);
                    float atten2 = 1.0 / (1.0 + 0.2 * distToLight2 + 0.15 * distToLight2 * distToLight2);

                    float dif = max(dot(n, l), 0.0);
                    float dif2 = max(dot(n, l2), 0.0);
                    
                    vec3 viewDir = normalize(ro - p);
                    vec3 halfVec = normalize(l + viewDir);
                    float spec = pow(max(dot(n, halfVec), 0.0), mix(10.0, 200.0, 1.0 - roughness));
                    spec *= dif; 

                    // Fake Reflection for Puddles
                    if (mat == 5.0) {
                        vec3 ref = reflect(-viewDir, n);
                        float ceilHit = max(dot(ref, vec3(0,-1,0)), 0.0);
                        spec += pow(ceilHit, 15.0) * atten * 2.0; // Mirror the light above
                    }

                    float shadow = 1.0;
                    if(mat != 4.0 && p.y < 1.8) { 
                        shadow = calcSoftShadow(p, l, 0.05, distToLight, 12.0);
                    }

                    float ao = calcAO(p, n);
                    vec3 ambient = albedo * 0.03 * ao;
                    vec3 lightColor = vec3(1.0, 0.95, 0.8); // Sickly yellow
                    
                    // Failing Light Logic
                    float flicker = 1.0;
                    float faultHash = hash21(cellId);
                    if(faultHash < 0.15) {
                        // Dying ballast flicker
                        flicker = step(0.5, noise(vec2(u_time * mix(10.0, 50.0, faultHash), cellId.x)));
                        lightColor = mix(lightColor, vec3(0.5, 0.2, 0.1), 1.0 - flicker); // Brownish when off
                    }

                    vec3 finalLight = ambient;
                    if(mat == 4.0) {
                        finalLight += albedo * flicker * 2.5; 
                    } else {
                        finalLight += albedo * dif * lightColor * atten * shadow * flicker;
                        finalLight += albedo * dif2 * lightColor * atten2 * 0.3 * ao; 
                        finalLight += vec3(1.0) * spec * lightColor * atten * shadow * flicker;
                    }

                    col = finalLight;

                    // Oppressive distance fog
                    float fogDensity = 0.07;
                    float fogFactor = exp(-d * fogDensity);
                    vec3 fogColor = vec3(0.05, 0.06, 0.03); 
                    col = mix(fogColor, col, clamp(fogFactor, 0.0, 1.0));
                }

                return col;
            }

            void main() {
                vec2 uv = vUV;
                
                // Lens Distortion (Barrel)
                vec2 centeredUV = uv * 2.0 - 1.0;
                float radius = length(centeredUV);
                float distortion = 1.0 + radius * radius * 0.05; // Bend outwards
                vec2 distortedUV = centeredUV * distortion;
                distortedUV.x *= u_resolution.x / u_resolution.y;

                vec3 ro = u_cameraPos;
                vec3 rd = normalize(distortedUV.x * u_cameraRight + distortedUV.y * u_cameraUp + 1.1 * u_cameraDir); 

                vec3 col = render(ro, rd);

                // Vignette
                col *= 1.0 - 0.4 * dot(centeredUV, centeredUV);

                // Film Grain
                float grain = fract(sin(dot(vUV + u_time*0.1, vec2(12.9898, 78.233))) * 43758.5453);
                col -= grain * 0.06;

                // CRT Scanlines (Subtle security camera effect)
                col *= 1.0 - 0.03 * sin(vUV.y * u_resolution.y * 2.5);

                // ACES Tone Mapping
                col = (col*(2.51*col+0.03))/(col*(2.43*col+0.59)+0.14);
                
                fragColor = vec4(col, 1.0);
            }`;

            const geometry = new THREE.PlaneGeometry(2, 2);
            this.material = new THREE.RawShaderMaterial({
                glslVersion: THREE.GLSL3,
                uniforms: {
                    u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
                    u_time: { value: 0 },
                    u_cameraPos: { value: new THREE.Vector3() },
                    u_cameraDir: { value: new THREE.Vector3(0, 0, -1) },
                    u_cameraRight: { value: new THREE.Vector3(1, 0, 0) },
                    u_cameraUp: { value: new THREE.Vector3(0, 1, 0) }
                },
                vertexShader: `#version 300 es
                in vec3 position;
                out vec2 vUV;
                void main() {
                    vUV = position.xy * 0.5 + 0.5;
                    gl_Position = vec4(position.xy, 0.0, 1.0);
                }`,
                fragmentShader: fsSource,
                depthWrite: false,
                depthTest: false
            });

            this.quad = new THREE.Mesh(geometry, this.material);
            this.quad.renderOrder = -1000;
        }

        update(playerPosition, delta = 0, activeCamera) {
            if (!activeCamera) return;

            // Dynamically mount/re-mount the screen-space quad to the active camera if parent changes
            if (this.quad.parent !== activeCamera) {
                activeCamera.add(this.quad);
                this.quad.position.set(0, 0, -1.05); // position just inside camera near plane
            }

            const now = clock ? clock.elapsedTime : (performance.now() * 0.001);

            // Update Shader Uniforms from camera orientation
            const matrix = activeCamera.matrixWorld;
            const right = new THREE.Vector3();
            const up = new THREE.Vector3();
            const dir = new THREE.Vector3();

            right.setFromMatrixColumn(matrix, 0);
            up.setFromMatrixColumn(matrix, 1);
            dir.setFromMatrixColumn(matrix, 2).multiplyScalar(-1); // camera forward is -z

            this.material.uniforms.u_time.value = now;
            this.material.uniforms.u_resolution.value.set(window.innerWidth, window.innerHeight);
            this.material.uniforms.u_cameraPos.value.copy(activeCamera.position);
            this.material.uniforms.u_cameraDir.value.copy(dir);
            this.material.uniforms.u_cameraRight.value.copy(right);
            this.material.uniforms.u_cameraUp.value.copy(up);

            this._updateStalker(playerPosition, delta);
            this._updateSanity(playerPosition, delta);
        }

        _isWall(cellX, cellZ) {
            const x = cellX * this.cellSize;
            const z = cellZ * this.cellSize;
            return !checkCollision(x, z);
        }

        getCostAt(worldX, worldZ) {
            return checkCollision(worldX, worldZ) ? 1 : 255;
        }

        _updateStalker(playerPosition, delta) {
            if (!this.stalker || !this.stalker.active) return;

            const now = clock ? clock.elapsedTime : (performance.now() * 0.001);
            const stalkerPos = this.stalker.position;
            const dist = stalkerPos.distanceTo(playerPosition);

            if (dist > 120.0) {
                const angle = Math.random() * Math.PI * 2;
                const spawnDist = 35.0 + Math.random() * 15.0;
                const targetX = playerPosition.x + Math.cos(angle) * spawnDist;
                const targetZ = playerPosition.z + Math.sin(angle) * spawnDist;

                const cellX = Math.floor(targetX / this.cellSize);
                const cellZ = Math.floor(targetZ / this.cellSize);
                if (!this._isWall(cellX, cellZ)) {
                    this.stalker.position.set(targetX, 0, targetZ);
                    this.stalker.group.position.copy(this.stalker.position);
                    this.stalker.path = [];
                }
                return;
            }

            if (this.stalker.stunTimer > 0) {
                this.stalker.stunTimer -= delta;
                this.stalker.update(now, 0.0);
                this.stalker.group.position.copy(stalkerPos).addScalar((Math.random() - 0.5) * 0.08);
                return;
            }

            if (now - this.stalker.lastPathTime > 0.3) {
                this.stalker.lastPathTime = now;
                const sCellX = Math.floor(stalkerPos.x / this.cellSize);
                const sCellZ = Math.floor(stalkerPos.z / this.cellSize);
                const pCellX = Math.floor(playerPosition.x / this.cellSize);
                const pCellZ = Math.floor(playerPosition.z / this.cellSize);

                const newPath = this.findPath(sCellX, sCellZ, pCellX, pCellZ);
                if (newPath && newPath.length > 0) {
                    this.stalker.path = newPath;
                }
            }

            let speed = 3.5;
            if (this.sanity < 50) speed += 0.5;

            if (this.stalker.path && this.stalker.path.length > 0) {
                const targetCell = this.stalker.path[0];
                const targetWorldX = targetCell.x * this.cellSize + this.cellSize / 2;
                const targetWorldZ = targetCell.z * this.cellSize + this.cellSize / 2;

                const dx = targetWorldX - stalkerPos.x;
                const dz = targetWorldZ - stalkerPos.z;
                const cellDist = Math.sqrt(dx * dx + dz * dz);

                if (cellDist < 0.2) {
                    this.stalker.path.shift();
                } else {
                    const moveDist = speed * delta;
                    const ratio = Math.min(1.0, moveDist / cellDist);
                    stalkerPos.x += dx * ratio;
                    stalkerPos.z += dz * ratio;
                }
            } else {
                const dx = playerPosition.x - stalkerPos.x;
                const dz = playerPosition.z - stalkerPos.z;
                const angle = Math.atan2(dz, dx);
                stalkerPos.x += Math.cos(angle) * speed * delta;
                stalkerPos.z += Math.sin(angle) * speed * delta;
            }

            const faceDx = playerPosition.x - stalkerPos.x;
            const faceDz = playerPosition.z - stalkerPos.z;
            this.stalker.group.rotation.y = Math.atan2(faceDx, faceDz);

            this.stalker.group.position.copy(stalkerPos);
            this.stalker.update(now, 1.0);

            if (Math.random() < 0.015 && dist < 30.0) {
                this.triggerStalkerClick();
            }

            if (dist < 25.0) {
                this.heartbeatInterval = Math.max(0.35, Math.min(1.2, (dist - 4) / 21 * 0.8 + 0.4));
                if (now - this.lastHeartbeat > this.heartbeatInterval) {
                    this.lastHeartbeat = now;
                    this.triggerHeartbeat();
                }
            }

            // Damage check
            if (dist < 1.8 && window.playerHealth > 0) {
                if (!this.lastDmgTime || now - this.lastDmgTime > 0.8) {
                    this.lastDmgTime = now;
                    const dmgAmt = 25;
                    window.playerHealth = Math.max(0, window.playerHealth - dmgAmt);
                    if (window.player) window.player.health = window.playerHealth;

                    if (typeof screenShakeIntensity !== 'undefined') {
                        screenShakeIntensity += 2.5;
                    }
                    if (window.SFX && typeof window.SFX.triggerHurt === 'function') {
                        window.SFX.triggerHurt();
                    }
                    this.triggerStalkerClick();
                }
            }
        }

        findPath(startX, startZ, endX, endZ) {
            const queue = [{ x: startX, z: startZ, path: [] }];
            const visited = new Set();
            visited.add(`${startX},${startZ}`);

            let steps = 0;
            while (queue.length > 0 && steps < 300) {
                steps++;
                const curr = queue.shift();
                if (curr.x === endX && curr.z === endZ) {
                    return curr.path.concat([{ x: curr.x, z: curr.z }]);
                }

                const neighbors = [
                    { x: curr.x + 1, z: curr.z },
                    { x: curr.x - 1, z: curr.z },
                    { x: curr.x, z: curr.z + 1 },
                    { x: curr.x, z: curr.z - 1 }
                ];

                for (let n of neighbors) {
                    const key = `${n.x},${n.z}`;
                    const dx = Math.abs(n.x - endX);
                    const dz = Math.abs(n.z - endZ);

                    if (dx < 18 && dz < 18 && !visited.has(key) && !this._isWall(n.x, n.z)) {
                        visited.add(key);
                        queue.push({ x: n.x, z: n.z, path: curr.path.concat([{ x: curr.x, z: curr.z }]) });
                    }
                }
            }
            return null;
        }

        _updateSanity(playerPosition, delta) {
            const stalkerPos = this.stalker.position;
            const dist = stalkerPos.distanceTo(playerPosition);

            let isDark = false;
            if (window.flashLight && !window.flashLight.visible) {
                isDark = true;
            }

            let sanityDrain = 0;
            if (isDark) {
                sanityDrain += 1.5;
            }
            if (dist < 20.0) {
                sanityDrain += 4.5 * (1.0 - dist / 20.0);
            }

            if (sanityDrain > 0) {
                this.sanity = Math.max(0, this.sanity - sanityDrain * delta);
            } else {
                this.sanity = Math.min(100, this.sanity + 1.0 * delta);
            }

            // Apply double-vision blur filter based on sanity
            const canvas = document.querySelector('canvas:not(#glcanvas)');
            if (canvas) {
                let blurAmt = 0;
                if (this.sanity < 50) {
                    blurAmt += (50 - this.sanity) / 50 * 2.0; // Up to 2px blur
                }
                if (dist < 15.0 && this.stalker.stunTimer <= 0) {
                    blurAmt += (15.0 - dist) / 15.0 * 2.5; 
                }

                if (blurAmt > 0.05) {
                    canvas.style.filter = `blur(${blurAmt.toFixed(2)}px)`;
                    const now = clock ? clock.elapsedTime : (performance.now() * 0.001);
                    const scaleFactor = 1.0 + Math.sin(now * 2.5) * 0.005 * (blurAmt / 4.0);
                    canvas.style.transform = `scale(${scaleFactor.toFixed(3)})`;
                } else {
                    canvas.style.filter = '';
                    canvas.style.transform = '';
                }
            }
        }

        _initAudio() {
            if (this.audioCtx) return;
            try {
                this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                
                const masterGain = this.audioCtx.createGain();
                masterGain.gain.value = 0.25;
                masterGain.connect(this.audioCtx.destination);

                // 1. Mains AC Hum (60Hz Sine)
                const humOsc = this.audioCtx.createOscillator();
                humOsc.type = 'sine';
                humOsc.frequency.value = 60;
                const humGain = this.audioCtx.createGain();
                humGain.gain.value = 0.6;
                humOsc.connect(humGain).connect(masterGain);
                humOsc.start();

                // 2. Ballast Buzz (120Hz Sawtooth through Lowpass)
                const buzzOsc = this.audioCtx.createOscillator();
                buzzOsc.type = 'sawtooth';
                buzzOsc.frequency.value = 120;
                const buzzFilter = this.audioCtx.createBiquadFilter();
                buzzFilter.type = 'lowpass';
                buzzFilter.frequency.value = 400;
                const buzzGain = this.audioCtx.createGain();
                buzzGain.gain.value = 0.15;
                
                const lfo = this.audioCtx.createOscillator();
                lfo.type = 'sine';
                lfo.frequency.value = 0.5; // Slow breathing cycle
                const lfoGain = this.audioCtx.createGain();
                lfoGain.gain.value = 0.05;
                lfo.connect(lfoGain).connect(buzzGain.gain);
                lfo.start();

                buzzOsc.connect(buzzFilter).connect(buzzGain).connect(masterGain);
                buzzOsc.start();

                // 3. Room Tone / HVAC (Brown Noise)
                const bufferSize = this.audioCtx.sampleRate * 2;
                const noiseBuffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
                const output = noiseBuffer.getChannelData(0);
                let lastOut = 0;
                for (let i = 0; i < bufferSize; i++) {
                    let white = Math.random() * 2 - 1;
                    output[i] = (lastOut + (0.02 * white)) / 1.02; // Brown noise approximation
                    lastOut = output[i];
                    output[i] *= 3.5; 
                }
                const noiseSrc = this.audioCtx.createBufferSource();
                noiseSrc.buffer = noiseBuffer;
                noiseSrc.loop = true;
                
                const noiseFilter = this.audioCtx.createBiquadFilter();
                noiseFilter.type = 'lowpass';
                noiseFilter.frequency.value = 800; // Muffled distant air
                
                const noiseGain = this.audioCtx.createGain();
                noiseGain.gain.value = 0.4;
                
                noiseSrc.connect(noiseFilter).connect(noiseGain).connect(masterGain);
                noiseSrc.start();

                this.audioNodes = [humOsc, buzzOsc, lfo, noiseSrc];
            } catch (e) {
                console.warn("Backrooms audio failed to initialize:", e);
            }
        }

        triggerHeartbeat() {
            const ctx = this.audioCtx;
            if (!ctx || ctx.state === 'suspended') return;

            const playThump = (time) => {
                const osc = ctx.createOscillator();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(65, time);
                osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.25);

                const gain = ctx.createGain();
                gain.gain.setValueAtTime(0.35, time);
                gain.gain.exponentialRampToValueAtTime(0.01, time + 0.25);

                osc.connect(gain).connect(this.audioCtx.destination);
                osc.start(time);
                osc.stop(time + 0.25);
            };

            const now = ctx.currentTime;
            playThump(now);
            playThump(now + 0.25);
        }

        triggerStalkerClick() {
            const ctx = this.audioCtx;
            if (!ctx || ctx.state === 'suspended') return;

            const now = ctx.currentTime;
            for (let i = 0; i < 5 + Math.random() * 6; i++) {
                const t = now + i * 0.05;
                const osc = ctx.createOscillator();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(800 + Math.random() * 2000, t);
                osc.frequency.exponentialRampToValueAtTime(100, t + 0.04);

                const gain = ctx.createGain();
                gain.gain.setValueAtTime(0.08, t);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

                osc.connect(gain).connect(this.audioCtx.destination);
                osc.start(t);
                osc.stop(t + 0.04);
            }
        }

        dispose() {
            window.ASYNCHRONOUS_MAZE_MODE = false;

            if (this.quad) {
                if (this.quad.parent) {
                    this.quad.parent.remove(this.quad);
                }
                this.quad.geometry.dispose();
                this.quad.material.dispose();
            }

            if (this.stalker) {
                this.scene.remove(this.stalker.group);
                this.stalker = null;
                window.stalkerEntity = null;
            }

            if (this.audioNodes) {
                this.audioNodes.forEach(node => {
                    try { node.stop(); } catch(e) {}
                });
            }
            if (this.audioCtx) {
                try { this.audioCtx.close(); } catch(e) {}
            }

            const canvas = document.querySelector('canvas:not(#glcanvas)');
            if (canvas) {
                canvas.style.transform = '';
                canvas.style.filter = '';
            }
        }
    }

    return AsynchronousMazeMapManager;
})();
