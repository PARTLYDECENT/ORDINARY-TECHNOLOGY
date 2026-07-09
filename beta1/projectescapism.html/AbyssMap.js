/**
 * WATER WORLD / ABYSS MAP MANAGER: Procedural Floating Rafts & Endless Ocean
 * Features:
 * 1. Endless waving blue ocean surface with dynamic specular reflections and foam.
 * 2. Stable coordinate-based procedural wooden rafts layout grid.
 * 3. Instanced wood plank decks, floating corner barrels, and connected log bridges.
 * 4. Hybrid walking-to-swimming physics boundary integration (deck Y=0.2, ocean Y=-8.0).
 * 5. Sea spray and mist ambient particles field.
 * 6. Dynamic path-finding cost mapping (zombies prefer rafts but can swim).
 */

const AbyssMapManager = (function () {

    // Stable 2D integer hash for deterministic procedural grid generation
    function getRaftHash(cx, cz) {
        let h = Math.sin(cx * 12.9898 + cz * 78.233) * 43758.5453123;
        return h - Math.floor(h);
    }

    class AbyssMapManager {
        constructor(scene, config) {
            this.scene = scene;
            this.config = config;
            this.chunks = new Map();
            
            // Custom high-quality layout parameters to prevent overlaps and make slots vast!
            this.cellSize = 12.0; 
            this.gridSize = 12;
            this.chunkSize = this.gridSize * this.cellSize; 

            this.activeChunks = new Set();
            this.viewRadius = 1;
            this.time = 0;

            // Mark global mode
            window.ABYSS_MODE = true;

            // --- SHARED MATERIALS ---
            this.woodMat = this._createWoodMaterial();
            this.barrelMat = this._createBarrelMaterial();
            this.bridgeMat = this._createBridgeMaterial();
            this.oceanMat = this._createOceanMaterial();
            this.oilRigMat = new THREE.MeshStandardMaterial({ color: 0x222f3e, roughness: 0.5, metalness: 0.85 });
            this.warningMat = new THREE.MeshStandardMaterial({ color: 0xe67e22, roughness: 0.6, metalness: 0.2 });
            this.beaconMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });

            // --- SHARED GEOMETRIES ---
            this.raftGeo = this._createRaftGeometry();
            this.barrelGeo = this._createBarrelGeometry();
            this.bridgeGeo = this._createBridgeGeometry();

            // --- ENDLESS OCEAN PLANE ---
            this._initOceanMesh();

            // --- SEA SPRAY PARTICLE SYSTEM ---
            this._initSeaSpray();

            // --- BIOLUMINESCENT SPORES SYSTEM ---
            this._initBioluminescentSpores();

            // --- SKY VIDEO PLANE ---
            this._initSkyVideo();

            // --- PROCEDURAL WHALES ---
            this._initWhales();
        }

        // ===================== MATERIAL FACTORIES =====================

        _createWoodMaterial() {
            // Weathered wooden deck material
            const mat = new THREE.MeshStandardMaterial({
                color: 0x5c4033, roughness: 0.9, metalness: 0.1
            });
            mat.onBeforeCompile = (shader) => {
                shader.uniforms.uTime = { value: 0 };
                mat.userData.shader = shader;
                shader.vertexShader = shader.vertexShader.replace(
                    `#include <common>`,
                    `#include <common>
                    varying vec3 vLocalPos;
                    varying vec3 vWorldPos;`
                );
                shader.vertexShader = shader.vertexShader.replace(
                    `#include <begin_vertex>`,
                    `#include <begin_vertex>
                    vLocalPos = position;`
                );
                shader.vertexShader = shader.vertexShader.replace(
                    `#include <worldpos_vertex>`,
                    `#include <worldpos_vertex>
                    vWorldPos = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;`
                );
                shader.fragmentShader = shader.fragmentShader.replace(
                    `#include <common>`,
                    `#include <common>
                    varying vec3 vLocalPos;
                    varying vec3 vWorldPos;
                    uniform float uTime;
                    float snoise(vec2 v) {
                        return fract(sin(dot(v, vec2(12.9898, 78.233))) * 43758.5453);
                    }`
                );
                shader.fragmentShader = shader.fragmentShader.replace(
                    `#include <color_fragment>`,
                    `#include <color_fragment>
                    // Wood grain texture procedurally
                    float grain = snoise(vLocalPos.xz * vec2(25.0, 1.0));
                    float moss = smoothstep(0.4, 0.8, snoise(vWorldPos.xz * 0.1)) * step(vWorldPos.y, 0.15);
                    vec3 woodCol = mix(vec3(0.24, 0.16, 0.10), vec3(0.38, 0.26, 0.18), grain);
                    // Add wet mossy splatters at water level
                    woodCol = mix(woodCol, vec3(0.12, 0.22, 0.12), moss * 0.7);
                    diffuseColor.rgb = woodCol;`
                );
            };
            return mat;
        }

        _createBarrelMaterial() {
            // Bright industrial plastic or metal flotation barrels
            const mat = new THREE.MeshStandardMaterial({
                color: 0x0ea5e9, roughness: 0.3, metalness: 0.6
            });
            mat.onBeforeCompile = (shader) => {
                shader.uniforms.uTime = { value: 0 };
                mat.userData.shader = shader;
                shader.vertexShader = shader.vertexShader.replace(
                    `#include <common>`,
                    `#include <common>
                    varying vec3 vWorldPos;`
                );
                shader.vertexShader = shader.vertexShader.replace(
                    `#include <worldpos_vertex>`,
                    `#include <worldpos_vertex>
                    vWorldPos = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;`
                );
                shader.fragmentShader = shader.fragmentShader.replace(
                    `#include <common>`,
                    `#include <common>
                    varying vec3 vWorldPos;
                    uniform float uTime;
                    float snoise(vec2 v) { return fract(sin(dot(v, vec2(12.9898, 78.233))) * 43758.5453); }`
                );
                shader.fragmentShader = shader.fragmentShader.replace(
                    `#include <color_fragment>`,
                    `#include <color_fragment>
                    // Rust and grime on the floating barrels
                    float rust = smoothstep(0.65, 0.85, snoise(vWorldPos.xz * 2.0));
                    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.45, 0.25, 0.1), rust);`
                );
            };
            return mat;
        }

        _createBridgeMaterial() {
            // Weathered rustic log bridges material
            return new THREE.MeshStandardMaterial({
                color: 0x4a3b32, roughness: 0.95, metalness: 0.05
            });
        }

        _createOceanMaterial() {
            // Dark realistic ocean blue water material with oily, nasty abyssal properties
            const mat = new THREE.MeshStandardMaterial({
                color: 0x01050f, roughness: 0.08, metalness: 0.5,
                transparent: true, opacity: 0.92
            });
            mat.onBeforeCompile = (shader) => {
                shader.uniforms.uTime = { value: 0 };
                mat.userData.shader = shader;
                shader.vertexShader = shader.vertexShader.replace(
                    `#include <common>`,
                    `#include <common>
                    uniform float uTime;
                    varying vec3 vWorldPos;
                    float wave(vec2 p, float speed) {
                        float t = uTime * speed;
                        float w = 0.0;
                        // Advanced multi-octave choppy waves (sharp crests)
                        w += (1.0 - abs(sin(p.x * 0.06 + p.y * 0.04 + t * 0.6))) * 1.2;
                        w += (1.0 - abs(sin(-p.x * 0.14 + p.y * 0.10 - t * 1.1))) * 0.6;
                        w += (1.0 - abs(sin(p.x * 0.28 - p.y * 0.20 + t * 2.0))) * 0.25;
                        return w;
                    }`
                );
                shader.vertexShader = shader.vertexShader.replace(
                    `#include <begin_vertex>`,
                    `#include <begin_vertex>
                    vec4 wp = modelMatrix * vec4(position, 1.0);
                    vWorldPos = wp.xyz;
                    // Displace along Z (local out-of-plane, which becomes world Y height after rotation)
                    transformed.z += wave(wp.xz, 1.0) - 1.0;`
                );
                shader.fragmentShader = shader.fragmentShader.replace(
                    `#include <common>`,
                    `#include <common>
                    varying vec3 vWorldPos;
                    uniform float uTime;`
                );
                shader.fragmentShader = shader.fragmentShader.replace(
                    `#include <color_fragment>`,
                    `#include <color_fragment>
                    float t = uTime;
                    vec2 p = vWorldPos.xz * 0.04;
                    
                    // Advanced multi-octave choppy waves for detailed coloring
                    float w = 0.0;
                    w += (1.0 - abs(sin(p.x * 1.5 + p.y * 0.9 + t * 0.85))) * 0.5;
                    w += (1.0 - abs(sin(-p.x * 3.5 + p.y * 2.4 - t * 1.4))) * 0.25;
                    w += (1.0 - abs(sin(p.x * 7.0 - p.y * 5.2 + t * 2.3))) * 0.12;
                    w += (1.0 - abs(sin(-p.x * 14.0 - p.y * 10.8 - t * 4.2))) * 0.06;
                    
                    // Foam crests for a stormy, nasty vibe!
                    float foam = smoothstep(0.72, 0.95, w);
                    
                    // Ominous, dark, nasty color palette
                    vec3 deepAbyss = vec3(0.001, 0.004, 0.012);
                    vec3 stormyNavy = vec3(0.008, 0.024, 0.055);
                    vec3 foamColor = vec3(0.015, 0.065, 0.11);
                    
                    vec3 oceanCol = mix(deepAbyss, stormyNavy, w);
                    oceanCol = mix(oceanCol, foamColor, foam);
                    
                    diffuseColor.rgb = oceanCol;`
                );
            };
            return mat;
        }

        // ===================== GEOMETRY FACTORIES =====================

        _createRaftGeometry() {
            // A scaled-up composite wooden deck geometry: ~10.3 units total width
            const parts = [];
            const plankW = 0.7;
            const gap = 0.1;
            const plankCount = 13;
            const raftWidth = 10.3;
            
            for (let i = 0; i < plankCount; i++) {
                const offsetZ = (i - (plankCount - 1) / 2) * (plankW + gap);
                const plank = new THREE.BoxGeometry(raftWidth, 0.15, plankW);
                plank.translate(0, 0.075, offsetZ);
                parts.push(plank);
            }

            // Cross-supports underneath the planks
            const beam1 = new THREE.BoxGeometry(0.25, 0.25, raftWidth - 0.2);
            beam1.translate(raftWidth / 2 - 0.5, -0.125, 0);
            parts.push(beam1);

            const beam2 = beam1.clone();
            beam2.translate(-(raftWidth - 1.0), 0, 0);
            parts.push(beam2);

            // Merge into a single performant geometry
            if (THREE.BufferGeometryUtils && THREE.BufferGeometryUtils.mergeBufferGeometries) {
                const sanitized = parts.map(p => p.index ? p.toNonIndexed() : p.clone());
                return THREE.BufferGeometryUtils.mergeBufferGeometries(sanitized);
            } else {
                return parts[0];
            }
        }

        _createBarrelGeometry() {
            // Flotation cylinder barrel
            const geo = new THREE.CylinderGeometry(0.35, 0.35, 0.9, 10);
            geo.rotateZ(Math.PI / 2); // Lay flat in water
            geo.translate(0, -0.45, 0); // floats slightly submerged
            return geo;
        }

        _createBridgeGeometry() {
            // Curved, snaking rustic rope bridge!
            const parts = [];
            
            // Segment the supporting logs into overlapping curved pieces to form a snaking path
            const segments = 12;
            const length = 2.0; 
            
            for (let i = 0; i <= segments; i++) {
                const z = (i / segments) * length - (length / 2.0); // -1.0 to 1.0
                
                // Snaking curve horizontal offset (beautiful rustic snake look)
                const snakeX = Math.sin(z * Math.PI * 1.5) * 0.24;
                
                // Left log segment
                const logL = new THREE.CylinderGeometry(0.15, 0.15, length / segments + 0.06, 8);
                logL.rotateX(Math.PI / 2);
                logL.translate(-0.22 + snakeX, 0.08, z);
                parts.push(logL);

                // Right log segment
                const logR = new THREE.CylinderGeometry(0.15, 0.15, length / segments + 0.06, 8);
                logR.rotateX(Math.PI / 2);
                logR.translate(0.22 + snakeX, 0.08, z);
                parts.push(logR);
            }

            // Planks across the curved logs
            const stepCount = 10;
            for (let i = 0; i < stepCount; i++) {
                const z = (i / (stepCount - 1)) * 1.8 - 0.9; // -0.9 to 0.9
                
                // Same snaking curve offset
                const snakeX = Math.sin(z * Math.PI * 1.5) * 0.24;
                
                const step = new THREE.BoxGeometry(0.85, 0.06, 0.16);
                // Slight random rotation on each plank to make it look rustic and hand-made
                const randomRotY = Math.sin(i * 15.7) * 0.12; 
                step.rotateY(randomRotY);
                step.translate(snakeX, 0.2, z);
                parts.push(step);
            }

            if (THREE.BufferGeometryUtils && THREE.BufferGeometryUtils.mergeBufferGeometries) {
                const sanitized = parts.map(p => p.index ? p.toNonIndexed() : p.clone());
                return THREE.BufferGeometryUtils.mergeBufferGeometries(sanitized);
            } else {
                return parts[0];
            }
        }

        // ===================== OCEAN & SPRAY =====================

        _initOceanMesh() {
            // Large flat ocean plane following the player for endless water rendering
            const oceanGeo = new THREE.PlaneBufferGeometry(180, 180, 32, 32);
            this.oceanMesh = new THREE.Mesh(oceanGeo, this.oceanMat);
            this.oceanMesh.rotation.x = -Math.PI / 2;
            this.oceanMesh.position.set(0, -0.15, 0); // perfectly aligned under raft deck heights
            this.oceanMesh.receiveShadow = true;
            this.scene.add(this.oceanMesh);
        }

        _initBioluminescentSpores() {
            // Physical floating bioluminescent spore bubbles
            this.sporeCount = 50;
            const geo = new THREE.SphereGeometry(0.12, 5, 5);
            // Neon glowing emissive toxic green material
            this.sporeMat = new THREE.MeshBasicMaterial({
                color: 0x39ff14,
                transparent: true,
                opacity: 0.85
            });
            this.sporesMesh = new THREE.InstancedMesh(geo, this.sporeMat, this.sporeCount);
            
            // Randomly position spores in a local grid around player
            this.sporeData = [];
            const dummy = new THREE.Object3D();
            
            for (let i = 0; i < this.sporeCount; i++) {
                const rx = (Math.random() - 0.5) * 60.0;
                const rz = (Math.random() - 0.5) * 60.0;
                const ry = -0.5 + Math.random() * 0.4; // float near the water surface
                const speed = 1.2 + Math.random() * 1.8;
                const phase = Math.random() * Math.PI * 2;
                
                this.sporeData.push({ rx, ry, rz, speed, phase });
                
                dummy.position.set(rx, ry, rz);
                dummy.updateMatrix();
                this.sporesMesh.setMatrixAt(i, dummy.matrix);
            }
            this.scene.add(this.sporesMesh);
        }

        _initSeaSpray() {
            // Ambient sea spray particle mist rising from water gaps
            const COUNT = 600;
            const positions = new Float32Array(COUNT * 3);
            for (let i = 0; i < COUNT; i++) {
                positions[i * 3] = (Math.random() - 0.5) * 80;
                positions[i * 3 + 1] = Math.random() * 8 - 4;
                positions[i * 3 + 2] = (Math.random() - 0.5) * 80;
            }
            const geo = new THREE.BufferGeometry();
            geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

            this.sprayMat = new THREE.ShaderMaterial({
                transparent: true,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                uniforms: {
                    uTime: { value: 0 },
                    uColor: { value: new THREE.Color(0xb2f5ea) }
                },
                vertexShader: `
                    uniform float uTime;
                    varying float vOpacity;
                    void main() {
                        vec3 pos = position;
                        float speed = 0.5 + fract(sin(position.x) * 43758.5) * 0.8;
                        
                        // Particle drift
                        pos.y = -2.0 + mod(pos.y + 2.0 + uTime * speed, 8.0);
                        pos.x += sin(uTime * 0.4 + position.y) * 0.3;
                        pos.z += cos(uTime * 0.3 + position.x) * 0.3;

                        vec4 mv = modelViewMatrix * vec4(pos, 1.0);
                        gl_PointSize = (90.0 / -mv.z);
                        gl_Position = projectionMatrix * mv;

                        float edgeFade = smoothstep(-2.0, 0.0, pos.y) * (1.0 - smoothstep(4.0, 6.0, pos.y));
                        vOpacity = 0.35 * edgeFade;
                    }
                `,
                fragmentShader: `
                    uniform vec3 uColor;
                    varying float vOpacity;
                    void main() {
                        float d = length(gl_PointCoord - vec2(0.5));
                        if (d > 0.5) discard;
                        gl_FragColor = vec4(uColor, smoothstep(0.5, 0.0, d) * vOpacity);
                    }
                `
            });

            this.spray = new THREE.Points(geo, this.sprayMat);
            this.spray.frustumCulled = false;
            this.scene.add(this.spray);
        }

        _initSkyVideo() {
            this.videoObject = new THREE.Object3D();
            this.videoObject.position.set(0, 12, -30);
            this.videoObject.rotation.set(0.31, 0, 0);
            this.scene.add(this.videoObject);

            this.youtubeIframe = document.createElement('iframe');
            this.youtubeIframe.id = 'youtube-sky-plane';
            this.youtubeIframe.src = 'https://www.youtube.com/embed/vY3a_Umly0s?autoplay=1&mute=1&controls=0&loop=1&playlist=vY3a_Umly0s&enablejsapi=1';
            this.youtubeIframe.style.position = 'fixed';
            this.youtubeIframe.style.border = 'none';
            this.youtubeIframe.style.pointerEvents = 'none';
            this.youtubeIframe.style.transformOrigin = '50% 50%';
            this.youtubeIframe.style.zIndex = '5';
            this.youtubeIframe.style.display = 'none';
            document.body.appendChild(this.youtubeIframe);
        }

        _updateSkyVideo(camera) {
            if (!this.youtubeIframe || !camera || !this.videoObject) return;

            // Instantly update camera matrices to avoid 1-frame latency/following effect
            camera.updateMatrixWorld();
            camera.matrixWorldInverse.copy(camera.matrixWorld).invert();

            // Set video plane position attached to the starting raft center (6, 0, 6)
            const startRaftX = 6.0;
            const startRaftZ = 6.0;
            const t = this.time || 0;
            const raftBob = Math.sin(startRaftX * 0.08 + t * 1.2) * Math.cos(startRaftZ * 0.10 - t * 1.08) * 0.3;
            
            this.videoObject.position.set(startRaftX, 12.0 + raftBob, startRaftZ - 24.0);
            this.videoObject.rotation.set(0.31, 0, 0);
            this.videoObject.updateMatrixWorld();

            // Project the 3D center of the plane to screen space
            const center = new THREE.Vector3();
            this.videoObject.getWorldPosition(center);
            
            // Check if center is behind camera (Three.js camera looks down negative Z)
            const tempV = center.clone();
            tempV.applyMatrix4(camera.matrixWorldInverse);
            if (tempV.z >= -2.0) {
                this.youtubeIframe.style.display = 'none';
                return;
            }

            const width = window.innerWidth;
            const height = window.innerHeight;
            const widthHalf = width / 2;
            const heightHalf = height / 2;

            // Calculate exact screen position of center
            const projected = center.clone().project(camera);
            const x = (projected.x * widthHalf) + widthHalf;
            const y = -(projected.y * heightHalf) + heightHalf;

            // Distance-based sizing math (100% stable, immune to perspective divide anomalies)
            const distance = camera.position.distanceTo(center);
            const fovRad = (camera.fov * Math.PI) / 180;
            const cameraCSSDistance = height / (2 * Math.tan(fovRad / 2));
            
            const planeWidth = 32.0;
            const iframeW = 640;
            const iframeH = 360;

            const screenWidth = (planeWidth * cameraCSSDistance) / distance;
            const screenHeight = screenWidth * (iframeH / iframeW);

            // Calculate rotation angle in screen space using the plane's right direction vector
            const rightVec = new THREE.Vector3(1, 0, 0).applyQuaternion(this.videoObject.quaternion);
            const rightCam = rightVec.clone().transformDirection(camera.matrixWorldInverse);
            const angle = Math.atan2(-rightCam.y, rightCam.x);

            // Hide if size is too small or if center goes far offscreen (bounding check)
            if (screenWidth < 1 || x < -screenWidth || x > width + screenWidth || y < -screenHeight || y > height + screenHeight) {
                this.youtubeIframe.style.display = 'none';
                return;
            }

            this.youtubeIframe.style.display = 'block';
            this.youtubeIframe.style.width = `${screenWidth.toFixed(2)}px`;
            this.youtubeIframe.style.height = `${screenHeight.toFixed(2)}px`;
            this.youtubeIframe.style.left = `${(x - screenWidth/2).toFixed(2)}px`;
            this.youtubeIframe.style.top = `${(y - screenHeight/2).toFixed(2)}px`;
            this.youtubeIframe.style.transform = `rotate(${angle.toFixed(4)}rad)`;
        }

        // ===================== CHUNK GENERATION =====================

        update(playerPosition, delta = 0, activeCamera = null) {
            this.time += delta;

            const px = Math.floor(playerPosition.x / this.chunkSize);
            const pz = Math.floor(playerPosition.z / this.chunkSize);
            const currentActive = new Set();

            for (let x = px - this.viewRadius; x <= px + this.viewRadius; x++) {
                for (let z = pz - this.viewRadius; z <= pz + this.viewRadius; z++) {
                    const key = `${x},${z}`;
                    currentActive.add(key);
                    if (!this.chunks.has(key)) {
                        this._generateChunk(x, z);
                    }
                }
            }

            for (const key of this.activeChunks) {
                if (!currentActive.has(key)) this._unloadChunk(key);
            }
            this.activeChunks = currentActive;

            // Move the infinite ocean mesh & spray particles to follow player coordinates
            if (this.oceanMesh) {
                this.oceanMesh.position.x = playerPosition.x;
                this.oceanMesh.position.z = playerPosition.z;
            }
            if (this.spray) {
                this.spray.position.x = playerPosition.x;
                this.spray.position.z = playerPosition.z;
            }

            // Sway and bob all active rafts and barrels on the waves
            const dummy = new THREE.Object3D();
            const cs = this.cellSize;
            const gs = this.gridSize;
            
            for (const [key, chunkGroup] of this.chunks) {
                const [cx, cz] = key.split(',').map(Number);
                const ox = cx * this.chunkSize;
                const oz = cz * this.chunkSize;
                
                let raftsMesh = null;
                let barrelsMesh = null;
                
                chunkGroup.traverse(c => {
                    if (c instanceof THREE.InstancedMesh) {
                        if (c.geometry === this.raftGeo) raftsMesh = c;
                        else if (c.geometry === this.barrelGeo) barrelsMesh = c;
                    }
                });
                
                if (raftsMesh && barrelsMesh) {
                    let rCount = 0;
                    let bCount = 0;
                    
                    for (let i = 0; i < gs * gs; i++) {
                        const lx = (i % gs) * cs;
                        const lz = Math.floor(i / gs) * cs;
                        const wX = ox + lx;
                        const wZ = oz + lz;
                        
                        const cellX = Math.floor(wX / cs);
                        const cellZ = Math.floor(wZ / cs);
                        
                        const isRaft = (cellX === 0 && cellZ === 0) || (getRaftHash(cellX, cellZ) < 0.26);
                        
                        if (isRaft) {
                            const centerX = wX + cs/2;
                            const centerZ = wZ + cs/2;
                            
                            const isSubmerged = (cellX !== 0 || cellZ !== 0) && (getRaftHash(cellX, cellZ) < 0.12);
                            const baseOffset = isSubmerged ? -0.65 : 0.0;
                            const sizeScale = isSubmerged ? 1.25 : 1.0;
                            
                            // Multi-octave wave height calculation matching shader
                            const getJSWave = (xVal, zVal, tVal) => {
                                const w1_1 = Math.sin(xVal * 0.08 + tVal * 1.2) * Math.cos(zVal * 0.10 - tVal * 1.08) * 0.45;
                                const w1_2 = Math.sin(xVal * 0.20 - tVal * 1.68) * Math.cos(zVal * 0.22 + tVal * 1.32) * 0.18;
                                const wave1 = w1_1 + w1_2;

                                const px2 = xVal * 2.0 + 2.0;
                                const pz2 = zVal * 2.0;
                                const w2_1 = Math.sin(px2 * 0.08 + tVal * 1.6) * Math.cos(pz2 * 0.10 - tVal * 1.44) * 0.45;
                                const w2_2 = Math.sin(px2 * 0.20 - tVal * 2.24) * Math.cos(pz2 * 0.22 + tVal * 1.76) * 0.18;
                                const wave2 = w2_1 + w2_2;

                                return wave1 + wave2 * 0.3;
                            };

                            const waveHeight = getJSWave(centerX, centerZ, this.time);
                            
                            const eps = 0.1;
                            const waveHeightX = getJSWave(centerX + eps, centerZ, this.time);
                            const waveHeightZ = getJSWave(centerX, centerZ + eps, this.time);
                            
                            const slopeX = (waveHeightX - waveHeight) / eps;
                            const slopeZ = (waveHeightZ - waveHeight) / eps;
                            
                            dummy.position.set(lx + cs/2, waveHeight + baseOffset, lz + cs/2);
                            dummy.rotation.set(slopeZ * 0.25, 0, -slopeX * 0.25);
                            dummy.scale.set(sizeScale, 1, sizeScale);
                            dummy.updateMatrix();
                            raftsMesh.setMatrixAt(rCount++, dummy.matrix);
                            
                            const offset = 4.5 * sizeScale;
                            const corners = [
                                [cs/2 - offset, cs/2 - offset],
                                [cs/2 - offset, cs/2 + offset],
                                [cs/2 + offset, cs/2 - offset],
                                [cs/2 + offset, cs/2 + offset]
                            ];
                            
                            for (const c of corners) {
                                dummy.position.set(lx + c[0], waveHeight + baseOffset, lz + c[1]);
                                dummy.rotation.set(slopeZ * 0.25, getRaftHash(cellX, cellZ) * Math.PI * 2, -slopeX * 0.25);
                                dummy.scale.set(sizeScale, 1.0, sizeScale);
                                dummy.updateMatrix();
                                barrelsMesh.setMatrixAt(bCount++, dummy.matrix);
                            }
                        }
                    }
                    raftsMesh.instanceMatrix.needsUpdate = true;
                    barrelsMesh.instanceMatrix.needsUpdate = true;
                }
            }

            // Update shader uniform times
            [this.woodMat, this.barrelMat, this.oceanMat].forEach(m => {
                if (m && m.userData && m.userData.shader && m.userData.shader.uniforms.uTime) {
                    m.userData.shader.uniforms.uTime.value = this.time;
                }
            });
            if (this.sprayMat) {
                this.sprayMat.uniforms.uTime.value = this.time;
            }

            // Animate bioluminescent spores following the player
            if (this.sporesMesh) {
                const dummy = new THREE.Object3D();
                for (let i = 0; i < this.sporeCount; i++) {
                    const data = this.sporeData[i];
                    // Keep spores locally wrapped around player
                    let wx = playerPosition.x + data.rx;
                    let wz = playerPosition.z + data.rz;
                    
                    // Bob vertically along with the violent sludge waves
                    const waveHeight = Math.sin(wx * 0.12 + this.time * 1.8) * Math.cos(wz * 0.15 - this.time * 2.0) * 0.4;
                    const wy = -0.15 + waveHeight + Math.sin(this.time * data.speed + data.phase) * 0.18;
                    
                    dummy.position.set(wx, wy, wz);
                    dummy.scale.setScalar(0.75 + Math.sin(this.time * data.speed * 2.0 + data.phase) * 0.25); // pulsing effect
                    dummy.updateMatrix();
                    this.sporesMesh.setMatrixAt(i, dummy.matrix);
                }
                this.sporesMesh.instanceMatrix.needsUpdate = true;
            }

            if (activeCamera) {
                this._updateSkyVideo(activeCamera);
                this._updateWhales(activeCamera, delta);

                // Blink beacons inside active chunks
                const blink = Math.sin(this.time * 6.0) > 0.0;
                for (const chunkGroup of this.chunks.values()) {
                    if (chunkGroup.userData && chunkGroup.userData.beacons) {
                        for (const b of chunkGroup.userData.beacons) {
                            b.mesh.material.color.setHex(blink ? 0xff0000 : 0x330000);
                            b.light.intensity = blink ? 1.5 : 0.0;
                        }
                    }
                }
            }
        }

        getCostAt(worldX, worldZ) {
            // Zombies prefer staying on wooden platforms. Open water is heavily penalized
            const h = this.getMeshHeight(worldX, worldZ);
            return h > -2.0 ? 1 : 25;
        }

        getMeshHeight(x, z) {
            const cs = this.cellSize;
            const cx = Math.floor(x / cs);
            const cz = Math.floor(z / cs);

            const isOilRig = (cx === 3 && cz === 3) ||
                             (cx === -3 && cz === -3) ||
                             (cx === 5 && cz === -2) ||
                             (cx === -5 && cz === 4) ||
                             (cx === 0 && cz === 6);
            if (isOilRig) {
                const centerX = (cx + 0.5) * cs;
                const centerZ = (cz + 0.5) * cs;
                
                // Platform collision
                if (Math.abs(x - centerX) <= 4.0 && Math.abs(z - centerZ) <= 4.0) {
                    return 8.0;
                }
                // South ramp collision
                if (Math.abs(x - centerX) <= 1.0 && z > centerZ + 4.0 && z <= centerZ + 10.0) {
                    const t = (z - (centerZ + 4.0)) / 6.0;
                    return THREE.MathUtils.lerp(8.0, 0.25, THREE.MathUtils.clamp(t, 0.0, 1.0));
                }
            }

            const hash = getRaftHash(cx, cz);
            // Starting platform at (0, 0) always valid
            const isRaft = !isOilRig && ((cx === 0 && cz === 0) || (hash < 0.05));
            const isSubmerged = isRaft && (cx !== 0 || cz !== 0) && (hash < 0.025);
            
            const centerX = (cx + 0.5) * cs;
            const centerZ = (cz + 0.5) * cs;
            const raftHalf = isSubmerged ? 6.44 : 5.15; // Submerged platforms are scaled up 1.25x
            const baseHeight = isSubmerged ? -0.45 : 0.2; // Submerged platforms sit lower

            // Check if inside Raft Cell deck boundaries
            if (isRaft) {
                if (Math.abs(x - centerX) <= raftHalf && Math.abs(z - centerZ) <= raftHalf) {
                    const t = this.time || 0;
                    
                    // Multi-octave wave height calculation matching shader
                    const w1_1 = Math.sin(centerX * 0.08 + t * 1.2) * Math.cos(centerZ * 0.10 - t * 1.08) * 0.45;
                    const w1_2 = Math.sin(centerX * 0.20 - t * 1.68) * Math.cos(centerZ * 0.22 + t * 1.32) * 0.18;
                    const wave1 = w1_1 + w1_2;

                    const px2 = centerX * 2.0 + 2.0;
                    const pz2 = centerZ * 2.0;
                    const w2_1 = Math.sin(px2 * 0.08 + t * 1.6) * Math.cos(pz2 * 0.10 - t * 1.44) * 0.45;
                    const w2_2 = Math.sin(px2 * 0.20 - t * 2.24) * Math.cos(pz2 * 0.22 + t * 1.76) * 0.18;
                    const wave2 = w2_1 + w2_2;

                    const waveHeight = wave1 + wave2 * 0.3;
                    return baseHeight + waveHeight;
                }
            }

            return -8.0; // Ocean Water
        }

        _generateChunk(cx, cz) {
            const key = `${cx},${cz}`;
            const ox = cx * this.chunkSize;
            const oz = cz * this.chunkSize;
            const cs = this.cellSize;
            const gs = this.gridSize;

            const chunkGroup = new THREE.Group();
            chunkGroup.position.set(ox, 0, oz);
            this.scene.add(chunkGroup);

            const dummy = new THREE.Object3D();

            // Maximum possible instances per chunk to allocate InstancedMeshes safely
            const rafts = new THREE.InstancedMesh(this.raftGeo, this.woodMat, gs * gs);
            const barrels = new THREE.InstancedMesh(this.barrelGeo, this.barrelMat, gs * gs * 4);

            [rafts, barrels].forEach(m => {
                m.castShadow = true;
                m.receiveShadow = true;
            });

            let rCount = 0, bCount = 0;

            for (let i = 0; i < gs * gs; i++) {
                const lx = (i % gs) * cs;
                const lz = Math.floor(i / gs) * cs;

                // Map coordinates
                const wX = ox + lx;
                const wZ = oz + lz;

                const cellX = Math.floor(wX / cs);
                const cellZ = Math.floor(wZ / cs);

                const isOilRig = (cellX === 3 && cellZ === 3) ||
                                 (cellX === -3 && cellZ === -3) ||
                                 (cellX === 5 && cellZ === -2) ||
                                 (cellX === -5 && cellZ === 4) ||
                                 (cellX === 0 && cellZ === 6);
                const hash = getRaftHash(cellX, cellZ);
                const isRaft = !isOilRig && ((cellX === 0 && cellZ === 0) || (hash < 0.05));

                if (isOilRig) {
                    this._spawnOilRig(chunkGroup, lx, lz, cellX, cellZ);
                } else if (isRaft) {
                    // Spawn Raft Deck platform
                    dummy.position.set(lx + cs/2, 0, lz + cs/2);
                    dummy.scale.set(1, 1, 1);
                    dummy.rotation.set(0, 0, 0);
                    dummy.updateMatrix();
                    rafts.setMatrixAt(rCount++, dummy.matrix);

                    // Spawn floatation supporting barrels under the 4 corners of the raft (offset scaled for larger rafts)
                    const offset = 4.5;
                    const corners = [
                        [cs/2 - offset, cs/2 - offset],
                        [cs/2 - offset, cs/2 + offset],
                        [cs/2 + offset, cs/2 - offset],
                        [cs/2 + offset, cs/2 + offset]
                    ];
                    
                    for (const c of corners) {
                        dummy.position.set(lx + c[0], 0, lz + c[1]);
                        // Floatation rotation alignment
                        dummy.rotation.set(0, getRaftHash(cellX, cellZ) * Math.PI * 2, 0);
                        dummy.scale.set(1.0, 1.0, 1.0);
                        dummy.updateMatrix();
                        barrels.setMatrixAt(bCount++, dummy.matrix);
                    }
                }
            }

            // Update InstancedMesh counts for performance
            rafts.count = rCount;
            barrels.count = bCount;

            if (rCount > 0) chunkGroup.add(rafts);
            if (bCount > 0) chunkGroup.add(barrels);

            this.chunks.set(key, chunkGroup);
        }

        _unloadChunk(key) {
            const chunk = this.chunks.get(key);
            if (chunk) {
                this.scene.remove(chunk);
                // Traverse and dispose geometries and materials
                chunk.traverse(c => {
                    if (c.geometry) c.geometry.dispose();
                });
                this.chunks.delete(key);
            }
        }

        dispose() {
            if (this.whale1) {
                this.scene.remove(this.whale1);
                if (this.whale1.geometry) this.whale1.geometry.dispose();
                if (this.whaleMat1) this.whaleMat1.dispose();
                this.whale1 = null;
            }
            if (this.whale2) {
                this.scene.remove(this.whale2);
                if (this.whaleMat2) this.whaleMat2.dispose();
                this.whale2 = null;
            }
            if (this.audioEngine) {
                if (this.audioEngine.ctx) {
                    this.audioEngine.ctx.close().catch(() => {});
                }
                this.audioEngine = null;
            }

            if (this.videoObject) {
                this.scene.remove(this.videoObject);
                this.videoObject = null;
            }
            if (this.youtubeIframe) {
                this.youtubeIframe.remove();
                this.youtubeIframe = null;
            }

            // Remove endless ocean, spray, and spores from scene
            if (this.oceanMesh) this.scene.remove(this.oceanMesh);
            if (this.spray) this.scene.remove(this.spray);
            if (this.sporesMesh) this.scene.remove(this.sporesMesh);
            
            // Dispose geometries
            if (this.oceanMesh && this.oceanMesh.geometry) this.oceanMesh.geometry.dispose();
            if (this.spray && this.spray.geometry) this.spray.geometry.dispose();
            if (this.sporesMesh && this.sporesMesh.geometry) this.sporesMesh.geometry.dispose();
            
            [this.woodMat, this.barrelMat, this.bridgeMat, this.oceanMat, this.sprayMat, this.sporeMat].forEach(m => {
                if (m) m.dispose();
            });

            // Unload all chunks
            for (const key of this.chunks.keys()) {
                this._unloadChunk(key);
            }
            this.chunks.clear();
            this.activeChunks.clear();
            
            window.ABYSS_MODE = false;
        }
        _initWhales() {
            // Setup Whale Audio Engine
            this.audioEngine = new WhaleAudioEngine();
            this.lastAutoSingTime = 0;

            const unlockAudio = () => {
                let vol = 80;
                if (window.MainMenu && window.MainMenu.settingsState) {
                    vol = window.MainMenu.settingsState.volume;
                }
                if (this.audioEngine) {
                    this.audioEngine.masterVolume = 0.3 * (vol / 100);
                    this.audioEngine.setMute(false);
                }
                window.removeEventListener('click', unlockAudio);
                window.removeEventListener('keydown', unlockAudio);
            };
            window.addEventListener('click', unlockAudio);
            window.addEventListener('keydown', unlockAudio);

            // Bounding box geometry for the raymarched volume
            const boxGeo = new THREE.BoxGeometry(5.0, 4.0, 8.0);

            // Create materials
            this.whaleMat1 = this._createWhaleMaterial(0); // Humpback
            this.whaleMat2 = this._createWhaleMaterial(2); // Ghost

            // Create meshes
            this.whale1 = new THREE.Mesh(boxGeo, this.whaleMat1);
            this.whale1.scale.set(5.0, 5.0, 5.0);

            this.whale2 = new THREE.Mesh(boxGeo, this.whaleMat2);
            this.whale2.scale.set(5.0, 5.0, 5.0);

            this.scene.add(this.whale1);
            this.scene.add(this.whale2);
        }

        _updateWhales(camera, delta) {
            if (!this.whale1 || !this.whale2 || !camera) return;

            // 1. Whale 1 (Humpback) path animation: circles at radius 75.0, depth -4.5 (down 2 units, 5x bigger)
            const angle1 = this.time * 0.035;
            const w1X = Math.cos(angle1) * 75.0;
            const w1Z = Math.sin(angle1) * 75.0;
            const w1Y = -4.5 + Math.sin(this.time * 0.15) * 2.5;
            this.whale1.position.set(w1X, w1Y, w1Z);

            // Point in travel direction
            const nextAngle1 = angle1 + 0.02;
            const targetLook1 = new THREE.Vector3(
                Math.cos(nextAngle1) * 75.0,
                -4.5 + Math.sin((this.time + 0.02 / 0.035) * 0.15) * 2.5,
                Math.sin(nextAngle1) * 75.0
            );
            this.whale1.lookAt(targetLook1);

            // 2. Whale 2 (Ghost) path animation: circles at radius 130.0, depth -6.0 (down 2 units, 5x bigger)
            const angle2 = -this.time * 0.02 + Math.PI; // swims in opposite direction
            const w2X = Math.cos(angle2) * 130.0;
            const w2Z = Math.sin(angle2) * 130.0;
            const w2Y = -6.0 + Math.cos(this.time * 0.10) * 2.0;
            this.whale2.position.set(w2X, w2Y, w2Z);

            const nextAngle2 = angle2 - 0.02;
            const targetLook2 = new THREE.Vector3(
                Math.cos(nextAngle2) * 130.0,
                -6.0 + Math.cos((this.time + 0.02 / 0.02) * 0.10) * 2.0,
                Math.sin(nextAngle2) * 130.0
            );
            this.whale2.lookAt(targetLook2);

            // Update uniforms
            const updateUniforms = (mesh, mat) => {
                mat.uniforms.u_time.value = this.time;
                mat.uniforms.u_cameraPos.value.copy(camera.position);

                const localCam = camera.position.clone();
                mesh.worldToLocal(localCam);
                mat.uniforms.u_localCameraPos.value.copy(localCam);
            };

            updateUniforms(this.whale1, this.whaleMat1);
            updateUniforms(this.whale2, this.whaleMat2);

            // 3. Audio & Sonar pings triggers (every 11 seconds)
            if (this.time - this.lastAutoSingTime > 11.0) {
                this.lastAutoSingTime = this.time + Math.random() * 2.0;

                // Trigger sonar visual ripple on the humpback whale snout
                this.whaleMat1.uniforms.u_sonarTime.value = this.time;

                if (this.audioEngine && !this.audioEngine.muted) {
                    this.audioEngine.playSonarPing();
                    setTimeout(() => {
                        if (this.audioEngine) this.audioEngine.playWhaleSong();
                    }, 400);
                }
            }
        }

        _spawnOilRig(chunkGroup, lx, lz, cellX, cellZ) {
            const cs = this.cellSize;
            const cx = lx + cs / 2;
            const cz = lz + cs / 2;

            const rigGroup = new THREE.Group();
            rigGroup.position.set(cx, 0, cz);
            chunkGroup.add(rigGroup);

            // 1. Platform Deck (Y = 8.0, thickness = 0.6)
            const deck = new THREE.Mesh(new THREE.BoxGeometry(8.0, 0.6, 8.0), this.oilRigMat);
            deck.position.set(0, 7.7, 0);
            deck.castShadow = true;
            deck.receiveShadow = true;
            rigGroup.add(deck);

            // 2. Four Support Pillars extending down into the abyss
            const pillarGeo = new THREE.CylinderGeometry(0.35, 0.35, 35.0, 8);
            const offsets = [
                [-3.5, -3.5],
                [-3.5, 3.5],
                [3.5, -3.5],
                [3.5, 3.5]
            ];
            for (const offset of offsets) {
                const pillar = new THREE.Mesh(pillarGeo, this.oilRigMat);
                pillar.position.set(offset[0], -9.5, offset[1]);
                pillar.castShadow = true;
                pillar.receiveShadow = true;
                rigGroup.add(pillar);
            }

            // 3. Warning Railings around the platform edges (except South where the ramp is)
            const railingGeoH = new THREE.BoxGeometry(8.0, 0.1, 0.1);
            const railingGeoV = new THREE.BoxGeometry(0.1, 1.0, 0.1);

            // North Railing
            const railNorth = new THREE.Mesh(railingGeoH, this.warningMat);
            railNorth.position.set(0, 8.5, -3.9);
            rigGroup.add(railNorth);

            // East Railing
            const railEast = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 8.0), this.warningMat);
            railEast.position.set(3.9, 8.5, 0);
            rigGroup.add(railEast);

            // West Railing
            const railWest = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 8.0), this.warningMat);
            railWest.position.set(-3.9, 8.5, 0);
            rigGroup.add(railWest);

            // South Railings (split to leave center open for the ramp)
            const railSouthL = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.1, 0.1), this.warningMat);
            railSouthL.position.set(-2.5, 8.5, 3.9);
            rigGroup.add(railSouthL);

            const railSouthR = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.1, 0.1), this.warningMat);
            railSouthR.position.set(2.5, 8.5, 3.9);
            rigGroup.add(railSouthR);

            // Vertical posts for railings
            const postPositions = [
                [-3.9, -3.9], [3.9, -3.9],
                [-3.9, 3.9], [3.9, 3.9],
                [-3.9, 0], [3.9, 0],
                [-1.0, 3.9], [1.0, 3.9]
            ];
            for (const pos of postPositions) {
                const post = new THREE.Mesh(railingGeoV, this.warningMat);
                post.position.set(pos[0], 8.0, pos[1]);
                rigGroup.add(post);
            }

            // 4. Drill Derrick Tower (Lattice Structure)
            const derrickGroup = new THREE.Group();
            derrickGroup.position.set(-2.0, 8.0, -2.0); // offset to a corner
            rigGroup.add(derrickGroup);

            // Derrick legs (slanted pyramid)
            const dLegGeo = new THREE.CylinderGeometry(0.08, 0.12, 7.0, 4);
            const dLegOffsets = [
                [-1.0, -1.0],
                [-1.0, 1.0],
                [1.0, -1.0],
                [1.0, 1.0]
            ];
            for (const offset of dLegOffsets) {
                const leg = new THREE.Mesh(dLegGeo, this.oilRigMat);
                leg.position.set(offset[0] * 0.7, 3.5, offset[1] * 0.7);
                // Slant inwards
                leg.rotation.x = -offset[1] * 0.08;
                leg.rotation.z = offset[0] * 0.08;
                derrickGroup.add(leg);
            }

            // Blinking beacon light at the top of the derrick
            const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), this.beaconMat);
            beacon.position.set(0, 7.0, 0);
            derrickGroup.add(beacon);

            const beaconLight = new THREE.PointLight(0xff0000, 1.5, 12.0);
            beaconLight.position.set(0, 7.0, 0);
            derrickGroup.add(beaconLight);

            // Store beacon references in chunkGroup.userData for memory-safe blinking
            if (!chunkGroup.userData) chunkGroup.userData = {};
            if (!chunkGroup.userData.beacons) chunkGroup.userData.beacons = [];
            chunkGroup.userData.beacons.push({ mesh: beacon, light: beaconLight });

            // 5. South Connecting Ramp
            const ramp = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.15, 9.8), this.oilRigMat);
            ramp.position.set(0, 4.125, 7.0);
            ramp.rotation.x = 0.91;
            ramp.castShadow = true;
            ramp.receiveShadow = true;
            rigGroup.add(ramp);
        }

        _createWhaleMaterial(presetIndex) {
            const preset = [
                {
                    presetId: 0.0,
                    colorUpper: new THREE.Color(0x162330),
                    colorLower: new THREE.Color(0xebeef0),
                    swimSpeed: 1.5,
                    swimAmp: 0.38,
                    finLen: 1.15,
                    bodyWidth: 0.72,
                    fogDensity: 0.015,
                    waterColor: new THREE.Color(0x011526),
                    glowColor: new THREE.Color(0x64dfdf)
                },
                {},
                {
                    presetId: 2.0,
                    colorUpper: new THREE.Color(0x030814),
                    colorLower: new THREE.Color(0x000000),
                    swimSpeed: 1.0,
                    swimAmp: 0.45,
                    finLen: 1.35,
                    bodyWidth: 0.65,
                    fogDensity: 0.015,
                    waterColor: new THREE.Color(0x000208),
                    glowColor: new THREE.Color(0x00ffcc)
                }
            ][presetIndex];

            const vertexShader = `
                varying vec3 vLocalPos;
                varying vec3 vWorldPos;
                varying vec3 vRayDir;
                uniform vec3 u_cameraPos;
                
                void main() {
                    vLocalPos = position;
                    vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
                    vRayDir = vWorldPos - u_cameraPos;
                    gl_Position = projectionMatrix * viewMatrix * vec4(vWorldPos, 1.0);
                }
            `;

            const fragmentShader = `
                precision highp float;
                varying vec3 vLocalPos;
                varying vec3 vWorldPos;
                varying vec3 vRayDir;

                uniform mat4 modelMatrix;

                uniform float u_time;
                uniform vec3 u_cameraPos;
                uniform vec3 u_localCameraPos;

                uniform float u_preset; 
                uniform vec3 u_colorUpper;
                uniform vec3 u_colorLower;
                uniform vec3 u_glowColor;
                
                uniform float u_swimSpeed;
                uniform float u_swimAmp;
                uniform float u_finLength;
                uniform float u_bodyWidth;
                uniform float u_fogDensity;
                uniform vec3 u_waterColor;

                uniform float u_sonarTime;

                vec3 rotateX(vec3 p, float a) {
                    float s = sin(a), c = cos(a);
                    return vec3(p.x, c*p.y - s*p.z, s*p.y + c*p.z);
                }
                vec3 rotateY(vec3 p, float a) {
                    float s = sin(a), c = cos(a);
                    return vec3(c*p.x + s*p.z, p.y, -s*p.x + c*p.z);
                }
                vec3 rotateZ(vec3 p, float a) {
                    float s = sin(a), c = cos(a);
                    return vec3(c*p.x - s*p.y, s*p.x + c*p.y, p.z);
                }

                float smin(float a, float b, float k) {
                    float h = max(k - abs(a - b), 0.0) / k;
                    return min(a, b) - h * h * h * k * (1.0 / 6.0);
                }

                float sdEllipsoid(vec3 p, vec3 r) {
                    float k0 = length(p/r);
                    float k1 = length(p/(r*r));
                    return k0*(k0-1.0)/k1;
                }

                float sdCapsule(vec3 p, vec3 a, vec3 b, float r) {
                    vec3 pa = p - a, ba = b - a;
                    float h = clamp(dot(pa,ba)/dot(ba,ba), 0.0, 1.0);
                    return length(pa - ba*h) - r;
                }

                float hash(vec3 p) {
                    p = fract(p * 0.3183099 + vec3(0.1, 0.1, 0.1));
                    p *= 17.0;
                    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
                }

                float noise(vec3 x) {
                    vec3 i = floor(x);
                    vec3 f = fract(x);
                    f = f*f*(3.0-2.0*f);
                    return mix(mix(mix(hash(i+vec3(0,0,0)), hash(i+vec3(1,0,0)),f.x),
                                   mix(hash(i+vec3(0,1,0)), hash(i+vec3(1,1,0)),f.x),f.y),
                               mix(mix(hash(i+vec3(0,0,1)), hash(i+vec3(1,0,1)),f.x),
                                   mix(hash(i+vec3(0,1,1)), hash(i+vec3(1,1,1)),f.x),f.y),f.z);
                }

                float map(vec3 p) {
                    vec3 localP = p;

                    float swimCycle = u_time * u_swimSpeed;
                    float bendMask = smoothstep(0.5, -2.5, p.z);
                    float tailWagY = sin(swimCycle + p.z * 1.5) * u_swimAmp * bendMask;
                    float bodyResponseY = sin(swimCycle + p.z * 0.5) * (u_swimAmp * 0.18) * (1.0 - bendMask);
                    
                    p.y -= (tailWagY + bodyResponseY);

                    // Snout / rostrum bumps
                    float snoutBumps = 0.0;
                    if (p.z > 0.6 && p.z < 2.0 && p.y > 0.0) {
                        float bumpMask = smoothstep(0.6, 1.0, p.z) * smoothstep(2.0, 1.5, p.z) * smoothstep(0.5, 0.25, abs(p.x));
                        snoutBumps = sin(p.z * 18.0) * cos(p.x * 12.0) * 0.012 * bumpMask;
                    }

                    // Ventral grooves
                    float bellyGrooves = 0.0;
                    if (p.z > -0.8 && p.z < 1.4 && p.y < -0.05) {
                        float grooveMask = smoothstep(-0.8, -0.4, p.z) * smoothstep(1.4, 1.0, p.z) * smoothstep(0.65, 0.25, abs(p.x));
                        bellyGrooves = cos(p.x * 32.0) * 0.014 * grooveMask;
                    }

                    vec3 bodyScale = vec3(u_bodyWidth, u_bodyWidth * 0.9, 1.95);
                    float dBody = sdEllipsoid(p - vec3(0.0, 0.0, 0.2), bodyScale);

                    dBody -= snoutBumps;
                    dBody -= bellyGrooves;

                    float dJaw = sdEllipsoid(p - vec3(0.0, -0.28, 0.9), vec3(u_bodyWidth * 0.85, u_bodyWidth * 0.45, 1.1));
                    float dHead = smin(dBody, dJaw, 0.2);

                    float dTail = sdCapsule(p, vec3(0.0, 0.0, -0.5), vec3(0.0, -0.08, -2.5), 0.1);
                    float dTailStrap = sdEllipsoid(p - vec3(0.0, -0.05, -1.5), vec3(0.24, 0.45, 1.1));
                    dTail = smin(dTail, dTailStrap, 0.32);

                    vec3 pFluke = p - vec3(0.0, -0.15, -2.45);
                    pFluke.x = abs(pFluke.x);
                    pFluke.z -= pFluke.x * 0.35;
                    float dFluke = sdEllipsoid(pFluke - vec3(0.55, 0.0, -0.08), vec3(0.7, 0.032, 0.26));

                    vec3 pFin = p;
                    pFin.x = abs(pFin.x);
                    pFin -= vec3(u_bodyWidth * 0.88, -0.16, 0.5);

                    float finFlap = sin(swimCycle + 1.2) * 0.16 * u_swimAmp;
                    pFin = rotateZ(pFin, -0.48 + finFlap);
                    pFin = rotateY(pFin, 0.58);
                    pFin = rotateX(pFin, 0.08);
                    float dFin = sdEllipsoid(pFin, vec3(u_finLength, 0.038, 0.24));

                    vec3 pDorsal = p - vec3(0.0, u_bodyWidth * 0.8, -0.85);
                    pDorsal = rotateX(pDorsal, -0.42);
                    float dDorsal = sdEllipsoid(pDorsal, vec3(0.08, 0.25, 0.24));

                    float d = smin(dHead, dTail, 0.35);
                    d = smin(d, dFluke, 0.18);
                    d = smin(d, dFin, 0.24);
                    d = smin(d, dDorsal, 0.15);

                    return d;
                }

                vec3 getNormal(vec3 pos) {
                    vec2 e = vec2(0.002, 0.0);
                    return normalize(vec3(
                        map(pos + e.xyy) - map(pos - e.xyy),
                        map(pos + e.yxy) - map(pos - e.yxy),
                        map(pos + e.yyx) - map(pos - e.yyx)
                    ));
                }

                float getAO(vec3 p, vec3 n) {
                    float occ = 0.0;
                    float sca = 1.0;
                    for (int i = 0; i < 5; i++) {
                        float hr = 0.01 + 0.12 * float(i) / 4.0;
                        vec3 aopos = n * hr + p;
                        float dd = map(aopos);
                        occ += -(dd - hr) * sca;
                        sca *= 0.95;
                    }
                    return clamp(1.0 - 3.2 * occ, 0.0, 1.0);
                }

                struct Material {
                    vec3 albedo;
                    float roughness;
                    float metallic;
                    vec3 emissive;
                };

                Material getMaterial(vec3 p, vec3 localP, vec3 n, vec3 rd) {
                    Material mat;
                    mat.roughness = 0.35;
                    mat.metallic = 0.04;
                    mat.emissive = vec3(0.0);

                    float pat = noise(localP * 5.0) * 0.45 + noise(localP * 12.0) * 0.1;

                    if (u_preset < 0.5) {
                        // Humpback
                        float bellyBlend = smoothstep(-0.25, -0.1, localP.y - localP.z * 0.08);
                        vec3 col = mix(u_colorLower, u_colorUpper, bellyBlend);
                        
                        float flipperMask = smoothstep(0.68, 1.1, abs(localP.x)) * smoothstep(0.0, -0.45, localP.y);
                        float tailFlukeMask = smoothstep(-1.3, -2.4, localP.z) * smoothstep(0.0, -0.35, localP.y);
                        float mottle = noise(localP * 4.5) * noise(localP * 10.0);
                        float whitePattern = smoothstep(0.15, 0.42, mottle) * (flipperMask + tailFlukeMask);
                        
                        mat.albedo = mix(col, vec3(0.9, 0.92, 0.96), clamp(whitePattern, 0.0, 1.0));
                        mat.roughness = mix(0.2, 0.45, pat);
                    }
                    else {
                        // Ghost
                        mat.albedo = u_colorUpper * 0.08;
                        mat.roughness = 0.1;
                        mat.metallic = 0.85;
                        
                        float lines = sin(localP.z * 10.0 - u_time * 2.8) * cos(localP.y * 10.0) * cos(localP.x * 10.0);
                        float lineGlow = smoothstep(0.85, 1.0, lines);
                        
                        float grid = abs(sin(localP.z * 12.0)) * abs(sin(localP.y * 12.0)) * abs(sin(localP.x * 12.0));
                        float gridGlow = smoothstep(0.7, 0.95, grid);
                        
                        float fresnel = pow(1.0 - max(0.0, dot(n, -rd)), 3.2);
                        mat.emissive = u_glowColor * (lineGlow * 1.6 + gridGlow * 0.55 + fresnel * 0.7);
                    }
                    
                    return mat;
                }

                vec3 getCaustics(vec3 p, vec3 n) {
                    vec2 uv = p.xz * 1.6;
                    uv.x += u_time * 0.14;
                    uv.y -= u_time * 0.08;
                    
                    float c1 = sin(uv.x + sin(uv.y)) * cos(uv.y + sin(uv.x));
                    c1 = pow(max(0.0, c1), 4.0);
                    
                    vec2 uv2 = p.xz * 2.5;
                    uv2.x -= u_time * 0.18;
                    uv2.y += u_time * 0.12;
                    float c2 = sin(uv2.x + sin(uv2.y)) * cos(uv2.y + sin(uv2.x));
                    c2 = pow(max(0.0, c2), 4.0);

                    float c = (c1 + c2) * 0.5 * 1.8;
                    c *= smoothstep(-3.0, 2.5, p.y);
                    c *= smoothstep(0.0, 0.75, n.y);
                    
                    return vec3(0.35, 0.72, 0.95) * c;
                }

                float getSunShafts(vec3 p, vec3 lightDir) {
                    vec3 proj = p - dot(p, lightDir) * lightDir;
                    float shafts = sin(proj.x * 1.3 + u_time * 0.25) * cos(proj.z * 1.3 - u_time * 0.16);
                    shafts += sin(proj.x * 2.6 - u_time * 0.45) * cos(proj.z * 1.8 + u_time * 0.35) * 0.55;
                    shafts = max(0.0, shafts);
                    shafts *= smoothstep(-4.0, 2.0, p.y);
                    return shafts * 0.65;
                }

                vec3 applyFog(vec3 col, float dist, vec3 rd, vec3 lightDir) {
                    vec3 fogCol = mix(vec3(0.002, 0.02, 0.08), u_waterColor * 0.9, smoothstep(-4.0, 2.5, rd.y));
                    float sunGlow = max(0.0, dot(rd, lightDir));
                    fogCol += vec3(0.08, 0.22, 0.28) * pow(sunGlow, 4.5);
                    float fogFactor = 1.0 - exp(-dist * u_fogDensity);
                    return mix(col, fogCol, clamp(fogFactor, 0.0, 1.0));
                }

                void main() {
                    vec3 ro = u_localCameraPos;
                    if (abs(u_localCameraPos.x) > 2.5 || abs(u_localCameraPos.y) > 2.0 || abs(u_localCameraPos.z) > 4.0) {
                        ro = vLocalPos;
                    }
                    vec3 rd = normalize(vLocalPos - u_localCameraPos);
                    vec3 lightDir = normalize(vec3(0.4, 0.85, 0.3));
                    
                    float t = 0.0;
                    float tMax = 12.0;
                    float d = 0.0;
                    int hit = 0;
                    vec3 p = ro;
                    
                    for (int i = 0; i < 40; i++) {
                        p = ro + rd * t;
                        if (abs(p.x) > 2.6 || abs(p.y) > 2.1 || abs(p.z) > 4.1) {
                            break;
                        }
                        d = map(p);
                        if (d < 0.002) {
                            hit = 1;
                            break;
                        }
                        t += d * 0.85;
                        if (t > tMax) break;
                    }
                    
                    if (hit == 0) {
                        discard;
                    }
                    
                    vec3 n = getNormal(p);
                    
                    float swimCycle = u_time * u_swimSpeed;
                    float bendMask = smoothstep(0.5, -2.5, p.z);
                    float tailWagY = sin(swimCycle + p.z * 1.5) * u_swimAmp * bendMask;
                    float bodyResponseY = sin(swimCycle + p.z * 0.5) * (u_swimAmp * 0.18) * (1.0 - bendMask);
                    vec3 localP = p;
                    localP.y -= (tailWagY + bodyResponseY);

                    Material mat = getMaterial(p, localP, n, rd);
                    float diffuse = max(0.0, dot(n, lightDir));
                    float bounce = max(0.0, dot(n, vec3(0.0, -1.0, 0.0))) * 0.15;
                    
                    vec3 halfDir = normalize(lightDir - rd);
                    float spec = pow(max(0.0, dot(n, halfDir)), 22.0) * (1.0 - mat.roughness);
                    float ao = getAO(p, n);
                    
                    vec3 worldPos = (modelMatrix * vec4(p, 1.0)).xyz;
                    vec3 caustics = getCaustics(worldPos, n);
                    
                    vec3 lighting = vec3(diffuse + bounce) * vec3(0.85, 0.92, 0.98);
                    lighting += spec * vec3(0.6, 0.88, 1.0) * 0.8;
                    lighting += caustics;
                    lighting *= ao;
                    
                    vec3 col = mat.albedo * lighting + mat.emissive;
                    
                    if (u_sonarTime > 0.0) {
                        float dt = u_time - u_sonarTime;
                        if (dt > 0.0 && dt < 4.0) {
                            float waveSpeed = 2.4;
                            float waveFront = dt * waveSpeed;
                            float distToSnout = length(localP - vec3(0.0, -0.05, 1.35));
                            float dWave = abs(distToSnout - waveFront);
                            float ripple = smoothstep(0.3, 0.0, dWave) * sin(dWave * 30.0) * smoothstep(4.0, 0.0, dt);
                            col += u_glowColor * max(0.0, ripple) * 1.5 * ao;
                        }
                    }
                    
                    float worldDist = length(vWorldPos - u_cameraPos);
                    col = applyFog(col, worldDist, vRayDir, lightDir);
                    
                    col = pow(col, vec3(0.92));
                    col = clamp(col, 0.0, 1.0);
                    
                    gl_FragColor = vec4(col, 1.0);
                }
            `;

            return new THREE.ShaderMaterial({
                vertexShader: vertexShader,
                fragmentShader: fragmentShader,
                uniforms: {
                    u_time: { value: 0 },
                    u_cameraPos: { value: new THREE.Vector3() },
                    u_localCameraPos: { value: new THREE.Vector3() },
                    u_preset: { value: preset.presetId },
                    u_colorUpper: { value: preset.colorUpper },
                    u_colorLower: { value: preset.colorLower },
                    u_glowColor: { value: preset.glowColor },
                    u_swimSpeed: { value: preset.swimSpeed },
                    u_swimAmp: { value: preset.swimAmp },
                    u_finLength: { value: preset.finLen },
                    u_bodyWidth: { value: preset.bodyWidth },
                    u_fogDensity: { value: preset.fogDensity },
                    u_waterColor: { value: preset.waterColor },
                    u_sonarTime: { value: -10.0 }
                },
                transparent: true,
                depthWrite: true,
                depthTest: true
            });
        }
    }

    class WhaleAudioEngine {
        constructor() {
            this.ctx = null;
            this.ambientOsc = null;
            this.ambientFilter = null;
            this.volumeNode = null;
            this.masterVolume = 0.3;
            this.muted = true;
            
            this.delayNode = null;
            this.feedbackNode = null;
        }
        
        init() {
            if (this.ctx) return;
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
            
            // Master Gain
            this.volumeNode = this.ctx.createGain();
            this.volumeNode.gain.setValueAtTime(this.muted ? 0 : this.masterVolume, this.ctx.currentTime);
            this.volumeNode.connect(this.ctx.destination);
            
            // Underwater reverberation loop
            this.delayNode = this.ctx.createDelay(3.0);
            this.delayNode.delayTime.setValueAtTime(0.75, this.ctx.currentTime);
            this.feedbackNode = this.ctx.createGain();
            this.feedbackNode.gain.setValueAtTime(0.65, this.ctx.currentTime);
            
            this.delayNode.connect(this.feedbackNode);
            this.feedbackNode.connect(this.delayNode);
            this.delayNode.connect(this.volumeNode);
            
            this.startAmbientHum();
        }
        
        setMute(isMuted) {
            this.muted = isMuted;
            if (!this.ctx) {
                this.init();
            }
            if (this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
            if (this.volumeNode) {
                this.volumeNode.gain.linearRampToValueAtTime(isMuted ? 0 : this.masterVolume, this.ctx.currentTime + 0.25);
            }
        }
        
        startAmbientHum() {
            const osc = this.ctx.createOscillator();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(48.99, this.ctx.currentTime); // G1 note (very deep)
            
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(75, this.ctx.currentTime);
            filter.Q.setValueAtTime(6.0, this.ctx.currentTime);
            
            const lfo = this.ctx.createOscillator();
            lfo.type = 'sine';
            lfo.frequency.setValueAtTime(0.09, this.ctx.currentTime); 
            
            const lfoGain = this.ctx.createGain();
            lfoGain.gain.setValueAtTime(28, this.ctx.currentTime);
            
            lfo.connect(lfoGain);
            lfoGain.connect(filter.frequency);
            
            const gainNode = this.ctx.createGain();
            gainNode.gain.setValueAtTime(0.12, this.ctx.currentTime); 
            
            osc.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(this.volumeNode);
            
            osc.start();
            lfo.start();
            
            this.ambientOsc = osc;
            this.ambientFilter = filter;
        }
        
        playSonarPing() {
            if (!this.ctx) this.init();
            if (this.ctx.state === 'suspended') this.ctx.resume();
            
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const oscGain = this.ctx.createGain();
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(1050, now);
            osc.frequency.exponentialRampToValueAtTime(180, now + 0.38);
            
            oscGain.gain.setValueAtTime(0.3, now);
            oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
            
            osc.connect(oscGain);
            oscGain.connect(this.volumeNode);
            oscGain.connect(this.delayNode);
            
            osc.start();
            osc.stop(now + 0.45);
        }
        
        playWhaleSong() {
            if (!this.ctx) this.init();
            if (this.ctx.state === 'suspended') this.ctx.resume();
            
            const now = this.ctx.currentTime;
            const pitches = [110.0, 130.81, 146.83, 164.81, 196.00, 220.00, 246.94, 293.66, 329.63];
            const parts = 3 + Math.floor(Math.random() * 3);
            let scheduleTime = 0;
            
            for (let i = 0; i < parts; i++) {
                const startHz = pitches[Math.floor(Math.random() * pitches.length)];
                const endHz = startHz * (0.75 + Math.random() * 0.5);
                const length = 0.9 + Math.random() * 1.4;
                
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                const filter = this.ctx.createBiquadFilter();
                
                osc.type = Math.random() > 0.5 ? 'triangle' : 'sine';
                osc.frequency.setValueAtTime(startHz, now + scheduleTime);
                osc.frequency.exponentialRampToValueAtTime(endHz, now + scheduleTime + length);
                
                const vibrato = this.ctx.createOscillator();
                const vibGain = this.ctx.createGain();
                vibrato.type = 'sine';
                vibrato.frequency.setValueAtTime(3.8 + Math.random() * 2.5, now + scheduleTime);
                vibGain.gain.setValueAtTime(startHz * 0.04, now + scheduleTime);
                
                vibrato.connect(vibGain);
                vibGain.connect(osc.frequency);
                
                filter.type = 'bandpass';
                filter.frequency.setValueAtTime(startHz * 1.4, now + scheduleTime);
                filter.frequency.exponentialRampToValueAtTime(endHz * 1.4, now + scheduleTime + length);
                filter.Q.setValueAtTime(5, now + scheduleTime);
                
                gain.gain.setValueAtTime(0, now + scheduleTime);
                gain.gain.linearRampToValueAtTime(0.35, now + scheduleTime + 0.18);
                gain.gain.exponentialRampToValueAtTime(0.001, now + scheduleTime + length);
                
                osc.connect(filter);
                filter.connect(gain);
                gain.connect(this.volumeNode);
                gain.connect(this.delayNode);
                
                vibrato.start(now + scheduleTime);
                osc.start(now + scheduleTime);
                vibrato.stop(now + scheduleTime + length);
                osc.stop(now + scheduleTime + length);
                
                scheduleTime += length * 0.8;
            }
        }
    }

    return AbyssMapManager;
})();
