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
            this.chunkSize = config.gridSize * config.cellSize;
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

            // --- SHARED GEOMETRIES ---
            this.raftGeo = this._createRaftGeometry();
            this.barrelGeo = this._createBarrelGeometry();
            this.bridgeGeo = this._createBridgeGeometry();

            // --- ENDLESS OCEAN PLANE ---
            this._initOceanMesh();

            // --- SEA SPRAY PARTICLE SYSTEM ---
            this._initSeaSpray();
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
            // Gorgeous animated waving blue ocean shader
            const mat = new THREE.MeshStandardMaterial({
                color: 0x082f49, roughness: 0.15, metalness: 0.85,
                transparent: true, opacity: 0.95
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
                        return sin(p.x * 0.15 + uTime * speed) * cos(p.y * 0.18 + uTime * speed * 0.8) * 0.25;
                    }`
                );
                shader.vertexShader = shader.vertexShader.replace(
                    `#include <begin_vertex>`,
                    `#include <begin_vertex>
                    vec4 wp = modelMatrix * vec4(position, 1.0);
                    vWorldPos = wp.xyz;
                    transformed.y += wave(wp.xz, 1.5) + wave(wp.xz * 2.5 + 3.0, 2.2) * 0.3;`
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
                    // Ocean sparkles and foam lines
                    float foam = smoothstep(0.45, 0.55, sin(vWorldPos.x * 1.5 + uTime) * cos(vWorldPos.z * 1.2 - uTime * 0.8));
                    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.7, 0.9, 1.0), foam * 0.35);
                    // Specular sunlight sparkle
                    float sparkle = smoothstep(0.985, 1.0, sin(vWorldPos.x * 12.0 + uTime * 3.0) * cos(vWorldPos.z * 10.0 - uTime * 2.5));
                    diffuseColor.rgb += vec3(1.0, 1.0, 1.0) * sparkle * 0.6;`
                );
            };
            return mat;
        }

        // ===================== GEOMETRY FACTORIES =====================

        _createRaftGeometry() {
            // A gorgeous composite wooden deck geometry: composed of multiple parallel planks
            const parts = [];
            const plankW = 0.45;
            const gap = 0.05;
            const plankCount = 9; // ~4.5 units width total
            
            for (let i = 0; i < plankCount; i++) {
                const offsetZ = (i - (plankCount - 1) / 2) * (plankW + gap);
                // Individual wooden plank
                const plank = new THREE.BoxGeometry(4.5, 0.15, plankW);
                plank.translate(0, 0.075, offsetZ);
                parts.push(plank);
            }

            // Cross-supports underneath the planks
            const beam1 = new THREE.BoxGeometry(0.18, 0.25, 4.4);
            beam1.translate(1.8, -0.125, 0);
            parts.push(beam1);

            const beam2 = beam1.clone();
            beam2.translate(-3.6, 0, 0);
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
            // Simple robust wooden log bridge
            const parts = [];
            const log1 = new THREE.CylinderGeometry(0.16, 0.16, 2.0, 8);
            log1.rotateX(Math.PI / 2);
            log1.translate(0.2, 0.08, 0);
            parts.push(log1);

            const log2 = log1.clone();
            log2.translate(-0.4, 0, 0);
            parts.push(log2);

            // Wooden planks across the logs
            const stepCount = 5;
            for (let i = 0; i < stepCount; i++) {
                const offZ = (i - (stepCount - 1) / 2) * 0.45;
                const step = new THREE.BoxGeometry(0.8, 0.06, 0.25);
                step.translate(0, 0.2, offZ);
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

            // Update shader uniform times
            [this.woodMat, this.barrelMat, this.oceanMat].forEach(m => {
                if (m && m.userData && m.userData.shader && m.userData.shader.uniforms.uTime) {
                    m.userData.shader.uniforms.uTime.value = this.time;
                }
            });
            if (this.sprayMat) {
                this.sprayMat.uniforms.uTime.value = this.time;
            }
        }

        getCostAt(worldX, worldZ) {
            // Zombies prefer staying on wooden platforms. Open water is heavily penalized
            const h = this.getMeshHeight(worldX, worldZ);
            return h > -2.0 ? 1 : 25;
        }

        getMeshHeight(x, z) {
            const cs = this.config.cellSize;
            const cx = Math.floor(x / cs);
            const cz = Math.floor(z / cs);

            // Starting platform at (0, 0) always valid
            const isRaft = (cx === 0 && cz === 0) || (getRaftHash(cx, cz) < 0.35);
            const centerX = (cx + 0.5) * cs;
            const centerZ = (cz + 0.5) * cs;
            const raftHalf = 2.25;

            // 1. Check if inside Raft Cell deck boundaries
            if (isRaft) {
                if (Math.abs(x - centerX) <= raftHalf && Math.abs(z - centerZ) <= raftHalf) {
                    return 0.2; // Raft Deck Height
                }
            }

            // 2. Check connected horizontal bridges to (cx + 1, cz)
            const raftRight = getRaftHash(cx + 1, cz) < 0.35;
            if (isRaft && raftRight) {
                const nextCenterX = (cx + 1.5) * cs;
                if (x >= centerX && x <= nextCenterX && Math.abs(z - centerZ) <= 0.85) {
                    return 0.2;
                }
            }

            // Check connected horizontal bridge from (cx - 1, cz)
            const raftLeft = (cx - 1 === 0 && cz === 0) || (getRaftHash(cx - 1, cz) < 0.35);
            if (raftLeft && isRaft) {
                const prevCenterX = (cx - 0.5) * cs;
                if (x >= prevCenterX && x <= centerX && Math.abs(z - centerZ) <= 0.85) {
                    return 0.2;
                }
            }

            // 3. Check connected vertical bridges to (cx, cz + 1)
            const raftDown = getRaftHash(cx, cz + 1) < 0.35;
            if (isRaft && raftDown) {
                const nextCenterZ = (cz + 1.5) * cs;
                if (z >= centerZ && z <= nextCenterZ && Math.abs(x - centerX) <= 0.85) {
                    return 0.2;
                }
            }

            // Check connected vertical bridge from (cx, cz - 1)
            const raftUp = (cx === 0 && cz - 1 === 0) || (getRaftHash(cx, cz - 1) < 0.35);
            if (raftUp && isRaft) {
                const prevCenterZ = (cz - 0.5) * cs;
                if (z >= prevCenterZ && z <= centerZ && Math.abs(x - centerX) <= 0.85) {
                    return 0.2;
                }
            }

            return -8.0; // Ocean Water
        }

        _generateChunk(cx, cz) {
            const key = `${cx},${cz}`;
            const ox = cx * this.chunkSize;
            const oz = cz * this.chunkSize;
            const cs = this.config.cellSize;
            const gs = this.config.gridSize;

            const chunkGroup = new THREE.Group();
            chunkGroup.position.set(ox, 0, oz);
            this.scene.add(chunkGroup);

            const dummy = new THREE.Object3D();

            // Maximum possible instances per chunk to allocate InstancedMeshes safely
            const rafts = new THREE.InstancedMesh(this.raftGeo, this.woodMat, gs * gs);
            const barrels = new THREE.InstancedMesh(this.barrelGeo, this.barrelMat, gs * gs * 4);
            const bridges = new THREE.InstancedMesh(this.bridgeGeo, this.bridgeMat, gs * gs * 2);

            [rafts, barrels, bridges].forEach(m => {
                m.castShadow = true;
                m.receiveShadow = true;
            });

            let rCount = 0, bCount = 0, brCount = 0;

            for (let i = 0; i < gs * gs; i++) {
                const lx = (i % gs) * cs;
                const lz = Math.floor(i / gs) * cs;

                // Map coordinates
                const wX = ox + lx;
                const wZ = oz + lz;

                const cellX = Math.floor(wX / cs);
                const cellZ = Math.floor(wZ / cs);

                const isRaft = (cellX === 0 && cellZ === 0) || (getRaftHash(cellX, cellZ) < 0.35);

                if (isRaft) {
                    // Spawn Raft Deck platform
                    dummy.position.set(lx + cs/2, 0, lz + cs/2);
                    dummy.scale.set(1, 1, 1);
                    dummy.rotation.set(0, 0, 0);
                    dummy.updateMatrix();
                    rafts.setMatrixAt(rCount++, dummy.matrix);

                    // Spawn floatation supporting barrels under the 4 corners of the raft
                    const offset = 2.0;
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

                    // Check horizontal connection to neighbor (cx + 1) for Bridge walkway spawn
                    const nextRaftRight = getRaftHash(cellX + 1, cellZ) < 0.35;
                    if (nextRaftRight) {
                        dummy.position.set(lx + cs, 0, lz + cs/2);
                        dummy.rotation.set(0, Math.PI / 2, 0); // Align across X axis
                        dummy.scale.set(1.0, 1.0, (cs - 4.5) / 2.0); // scale bridges dynamically
                        dummy.updateMatrix();
                        bridges.setMatrixAt(brCount++, dummy.matrix);
                    }

                    // Check vertical connection to neighbor (cz + 1) for Bridge walkway spawn
                    const nextRaftDown = getRaftHash(cellX, cellZ + 1) < 0.35;
                    if (nextRaftDown) {
                        dummy.position.set(lx + cs/2, 0, lz + cs);
                        dummy.rotation.set(0, 0, 0); // Align across Z axis
                        dummy.scale.set(1.0, 1.0, (cs - 4.5) / 2.0);
                        dummy.updateMatrix();
                        bridges.setMatrixAt(brCount++, dummy.matrix);
                    }
                }
            }

            // Update InstancedMesh counts for performance
            rafts.count = rCount;
            barrels.count = bCount;
            bridges.count = brCount;

            if (rCount > 0) chunkGroup.add(rafts);
            if (bCount > 0) chunkGroup.add(barrels);
            if (brCount > 0) chunkGroup.add(bridges);

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
    }

    return AbyssMapManager;
})();
