/**
 * MAP MANAGER: Chunk-based Open World System
 */

const CampaignMapManager = (function () {
    // Shared harmonic noise function for biomes (mirrored in GLSL)
    function getBiomeNoise(x, z) {
        let n = Math.sin(x * 0.005) * 0.5 + 0.5;
        n += Math.sin(z * 0.005) * 0.5 + 0.5;
        n += Math.sin((x + z) * 0.002) * 0.5 + 0.5;
        return n / 3.0; // returns ~0.0 to 1.0 continuously
    }

    function getBiomeAt(x, z) {
        if (window.GAME_START_CONFIG && window.GAME_START_CONFIG.mapId) {
            if (window.GAME_START_CONFIG.mapId === 'forest') return 'forest';
            if (window.GAME_START_CONFIG.mapId === 'toxic') return 'toxic';
            if (window.GAME_START_CONFIG.mapId === 'facility') return 'wasteland';
        }

        const n = getBiomeNoise(x, z);
        if (n < 0.38) return 'toxic';       // Sickly neon/gray
        if (n > 0.62) return 'wasteland';   // Scorched sand/rock
        return 'forest';                    // Green dirt/grass
    }

    class CampaignMapManager {
        constructor(scene, config) {
            this.scene = scene;
            this.config = config;
            this.chunks = new Map();
            this.chunkSize = config.gridSize * config.cellSize; // e.g. 128 units
            this.activeChunks = new Set();
            this.viewRadius = 1; // Number of chunks around the player to keep active

            FacilityGen.init(config);

            this.treeGeo = ModelFactory.getTreeGeo();
            this.treeMat = new THREE.MeshStandardMaterial({ color: 0x2d5a27, roughness: 0.9 });
            this.treeMat.onBeforeCompile = (shader) => {
                shader.uniforms.uTime = { value: 0 };
                this.treeMat.userData.shader = shader;

                shader.vertexShader = shader.vertexShader.replace(
                    `#include <common>`,
                    `#include <common>
                uniform float uTime;
                varying vec3 vWorldPosOut;
                varying vec3 vLocalPosOut;
                `
                );
                shader.vertexShader = shader.vertexShader.replace(
                    `#include <begin_vertex>`,
                    `#include <begin_vertex>
                vLocalPosOut = position;
                float sway = smoothstep(0.0, 2.0, position.y);
                float swayAmount = sin(uTime * 1.5 + (instanceMatrix[3][0]) * 0.2) * 0.2;
                transformed.x += sway * swayAmount;
                transformed.z += sway * swayAmount * 0.5;
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
                varying vec3 vWorldPosOut;
                varying vec3 vLocalPosOut;
                float snoise(vec3 v) { return fract(sin(dot(v, vec3(12.9898, 78.233, 45.164))) * 43758.5453); }
                `
                );
                shader.fragmentShader = shader.fragmentShader.replace(
                    `#include <color_fragment>`,
                    `#include <color_fragment>
                float n = snoise(vWorldPosOut * 3.0);
                if (vLocalPosOut.y > 0.8) {
                    diffuseColor.rgb *= 0.6 + n * 0.5; // Foliage texture
                } else {
                    diffuseColor.rgb = mix(vec3(0.2, 0.12, 0.05), vec3(0.15, 0.1, 0.05), n); // Bark texture
                }
                `
                );
            };

            // Environmental Detailing (Procedural Debris)
            this.debrisGeo = ObjectFactory.getDebrisGeo();
            this.debrisMat = ObjectFactory.getScrapMat();
            this.barrelGeo = ObjectFactory.getBarrelGeo();
            this.barrelMat = ObjectFactory.getBarrelMat();
            this.fireGeo = ObjectFactory.getFireGeo();
            this.fireMat = ObjectFactory.getFireMat();

            this.animatableObjects = []; // To store fires for shader updates
        }

        update(playerPosition, delta = 0) {
            const px = Math.floor(playerPosition.x / this.chunkSize);
            const pz = Math.floor(playerPosition.z / this.chunkSize);

            const currentActive = new Set();

            // Update shaders for animatable objects (e.g. Fires)
            this.animatableObjects.forEach(obj => {
                if (obj.material.userData && obj.material.userData.shader) {
                    if (obj.material.userData.shader.uniforms.uTime) {
                        obj.material.userData.shader.uniforms.uTime.value += delta;
                    }
                }
            });

            const sharedMats = [this.treeMat, this.debrisMat, this.barrelMat];
            sharedMats.forEach(mat => {
                if (mat && mat.userData && mat.userData.shader && mat.userData.shader.uniforms.uTime) {
                    mat.userData.shader.uniforms.uTime.value += delta;
                }
            });

            for (let x = px - this.viewRadius; x <= px + this.viewRadius; x++) {
                for (let z = pz - this.viewRadius; z <= pz + this.viewRadius; z++) {
                    const key = `${x},${z}`;
                    currentActive.add(key);
                    if (!this.chunks.has(key)) {
                        this._generateChunk(x, z);
                    }
                }
            }

            // Cleanup distant chunks
            for (const key of this.activeChunks) {
                if (!currentActive.has(key)) {
                    this._unloadChunk(key);
                }
            }
            this.activeChunks = currentActive;
        }

        getCostAt(worldX, worldZ) {
            const cx = Math.floor(worldX / this.chunkSize);
            const cz = Math.floor(worldZ / this.chunkSize);
            const key = `${cx},${cz}`;
            const chunk = this.chunks.get(key);
            if (!chunk) return 1; // Default floor cost

            const lx = Math.floor((worldX - cx * this.chunkSize) / this.config.cellSize);
            const lz = Math.floor((worldZ - cz * this.chunkSize) / this.config.cellSize);

            if (lx < 0 || lx >= this.config.gridSize || lz < 0 || lz >= this.config.gridSize) return 1;

            return chunk.costField[lz * this.config.gridSize + lx];
        }

        _generateChunk(cx, cz) {
            const key = `${cx},${cz}`;
            const worldOffsetX = cx * this.chunkSize;
            const worldOffsetZ = cz * this.chunkSize;

            const chunkBiome = getBiomeAt(worldOffsetX + this.chunkSize / 2, worldOffsetZ + this.chunkSize / 2);

            const numCells = this.config.gridSize * this.config.gridSize;
            const costField = new Uint8Array(numCells).fill(1);

            const chunkGroup = new THREE.Group();
            chunkGroup.position.set(worldOffsetX, 0, worldOffsetZ);
            this.scene.add(chunkGroup);

            const sdfBunkers = new THREE.InstancedMesh(FacilityGen.sdfBunkerGeo, FacilityGen.sdfBunkerMat, 2);
            const pillars = new THREE.InstancedMesh(FacilityGen.pillarGeo, FacilityGen.pillarMat, 1000);
            const trees = new THREE.InstancedMesh(this.treeGeo, this.treeMat, 150);
            const debris = new THREE.InstancedMesh(this.debrisGeo, this.debrisMat, 200);
            const barrels = new THREE.InstancedMesh(this.barrelGeo, this.barrelMat, 50);
            const pipes = new THREE.InstancedMesh(FacilityGen.pipeGeo, FacilityGen.pipeMat, 800);
            const steam = new THREE.InstancedMesh(FacilityGen.steamGeo, FacilityGen.steamMat, 150);

            [sdfBunkers, pillars, trees, debris, barrels, pipes, steam].forEach(m => {
                m.castShadow = true; m.receiveShadow = true;
            });

            let sdfCount = 0, pCount = 0, tCount = 0, dCount = 0, brlCount = 0, pipeCount = 0, steamCount = 0;
            const dummy = new THREE.Object3D();

            // 1. Procedural SDF Bunker Generation
            for(let i=0; i<2; i++) { // 2 bunkers per chunk
                const bx = Math.floor(Math.random() * (this.config.gridSize - 16)) + 8;
                const bz = Math.floor(Math.random() * (this.config.gridSize - 16)) + 8;

                const wx = bx * this.config.cellSize + worldOffsetX;
                const wz = bz * this.config.cellSize + worldOffsetZ;
                const gh = TerrainGen.getMeshHeight(wx, wz);

                dummy.position.set(bx * this.config.cellSize, gh, bz * this.config.cellSize);
                dummy.rotation.set(0, Math.random() > 0.5 ? 0 : Math.PI / 2, 0); 
                dummy.scale.set(1, 1, 1);
                dummy.updateMatrix();
                sdfBunkers.setMatrixAt(sdfCount++, dummy.matrix);

                const bw = 7, bh = 5;
                for(let x = bx - bw; x <= bx + bw; x++) {
                    for(let z = bz - bh; z <= bz + bh; z++) {
                        if (x >= 0 && x < this.config.gridSize && z >= 0 && z < this.config.gridSize) {
                            this._setCost(costField, x, z, 255);
                        }
                    }
                }
            }

            // Fill Layers
            for (let i = 0; i < numCells; i++) {
                const lx = i % this.config.gridSize;
                const lz = Math.floor(i / this.config.gridSize);

            if (costField[i] !== 255) {
                    const rand = Math.random();
                    let pTree = 0.02, pBarrel = 0.00375;

                    if (chunkBiome === 'wasteland') {
                        pTree = 0.0025; // very rare dead trees
                        pBarrel = 0.00625;
                    } else if (chunkBiome === 'toxic') {
                        pTree = 0.005;
                        pBarrel = 0.0125; // halved industrial debris
                    }

                    if (rand < pTree && tCount < 150) { // Trees
                        const tx = lx * this.config.cellSize + this.config.cellSize / 2 + worldOffsetX;
                        const tz = lz * this.config.cellSize + this.config.cellSize / 2 + worldOffsetZ;
                        const gh = TerrainGen.getMeshHeight(tx, tz);
                        dummy.position.set(lx * this.config.cellSize + this.config.cellSize / 2, gh, lz * this.config.cellSize + this.config.cellSize / 2);
                        dummy.rotation.y = Math.random() * Math.PI * 2;
                        const s = 0.8 + Math.random() * 0.4;
                        dummy.scale.set(s * 2, s * 4, s * 2);
                        dummy.updateMatrix();
                        trees.setMatrixAt(tCount++, dummy.matrix);
                        costField[i] = 10;
                    } else if (rand < pTree + pBarrel && brlCount < 50) { // Barrels
                        const bx = lx * this.config.cellSize + 1;
                        const bz = lz * this.config.cellSize + 1;
                        const gh = TerrainGen.getHeight(bx + worldOffsetX, bz + worldOffsetZ);
                        dummy.position.set(bx, gh + 0.4, bz);
                        dummy.rotation.set(0, Math.random() * 6.28, 0);
                        if (Math.random() < 0.2) dummy.rotation.x = 1.57; // Tipped over
                        dummy.scale.setScalar(0.9 + Math.random() * 0.2);
                        dummy.updateMatrix();
                        barrels.setMatrixAt(brlCount++, dummy.matrix);
                        costField[i] = 50;
                    }
                }
            }

            // 2. Continuous Industrial Pipe Network (Hazard Orange)
            for (let i = 0; i < 8; i++) {
                const startX = Math.random() * this.chunkSize;
                const startZ = Math.random() * this.chunkSize;
                const dir = Math.random() > 0.5 ? 'x' : 'z';
                const length = 20 + Math.floor(Math.random() * 30);
                const pipeHeightOffset = 1.5 + Math.random() * 3.5;
                const pipeSpacing = 1.0; 

                // Sample terrain once at start to keep pipe perfectly level
                const baseTerrainH = TerrainGen.getMeshHeight(startX + worldOffsetX, startZ + worldOffsetZ);

                for (let l = 0; l < length; l++) {
                    if (pipeCount >= 800) break;
                    const px = dir === 'x' ? startX + l * pipeSpacing : startX;
                    const pz = dir === 'z' ? startZ + l * pipeSpacing : startZ;

                    if (px < 0 || px >= this.chunkSize || pz < 0 || pz >= this.chunkSize) continue;

                    dummy.position.set(px, baseTerrainH + pipeHeightOffset, pz);

                    // Orientation
                    dummy.rotation.set(0, 0, 0);
                    if (dir === 'x') {
                        dummy.rotation.z = Math.PI / 2;
                    } else {
                        dummy.rotation.x = Math.PI / 2;
                    }

                    dummy.scale.set(1.05, 1.05, 1.05); // Ensure overlap for continuity
                    dummy.updateMatrix();
                    pipes.setMatrixAt(pipeCount++, dummy.matrix);

                    // Add Pipe Supports (Pillars) reaching to the ground
                    if (l % 10 === 0 && pCount < 1000) {
                        const currentTerrainH = TerrainGen.getMeshHeight(px + worldOffsetX, pz + worldOffsetZ);
                        const pHeight = (baseTerrainH + pipeHeightOffset) - currentTerrainH;
                        if (pHeight > 0.1) {
                            dummy.position.set(px, currentTerrainH, pz);
                            dummy.rotation.set(0, 0, 0);
                            dummy.scale.set(0.12, pHeight / (this.config.cellSize * 1.8), 0.12);
                            dummy.updateMatrix();
                            pillars.setMatrixAt(pCount++, dummy.matrix);
                        }
                    }

                    // Random Steam Emission
                    if (Math.random() < 0.03 && steamCount < 150) {
                        dummy.position.set(px, baseTerrainH + pipeHeightOffset, pz);
                        dummy.rotation.set(0, Math.random() * Math.PI * 2, 0);
                        dummy.scale.setScalar(0.5 + Math.random() * 0.7);
                        dummy.updateMatrix();
                        steam.setMatrixAt(steamCount++, dummy.matrix);
                    }
                }
            }

            sdfBunkers.count = sdfCount; pillars.count = pCount; trees.count = tCount; debris.count = dCount; barrels.count = brlCount;
            pipes.count = pipeCount; steam.count = steamCount;

            chunkGroup.add(sdfBunkers); chunkGroup.add(pillars); chunkGroup.add(trees); chunkGroup.add(debris); chunkGroup.add(barrels);
            chunkGroup.add(pipes); chunkGroup.add(steam);

            this.chunks.set(key, {
                group: chunkGroup,
                costField: costField,
                sdfBunkers: sdfBunkers, pillars: pillars, trees: trees, debris: debris, barrels: barrels,
                pipes: pipes, steam: steam
            });
        }
        _setCost(field, x, z, cost) {
            if (x < 0 || x >= this.config.gridSize || z < 0 || z >= this.config.gridSize) return;
            field[z * this.config.gridSize + x] = cost;
        }

        _unloadChunk(key) {
            const chunk = this.chunks.get(key);
            if (chunk) {
                this.scene.remove(chunk.group);

                // Cleanup animatable objects belonging to this chunk
                this.animatableObjects = this.animatableObjects.filter(obj => {
                    return !chunk.group.children.includes(obj);
                });

                // InstancedMeshes and their matrices are garbage collected
                // Associated geometries/materials are global (FacilityGen, ModelFactory) and should not be disposed here
                this.chunks.delete(key);
            }
        }
    }

    // Minimal BSP Node for MapManager (extracted from index.html)
    class BSPNode {
        constructor(x, z, w, h) {
            this.x = x; this.z = z; this.w = w; this.h = h;
            this.leftChild = null; this.rightChild = null;
        }
        split() {
            if (this.leftChild || this.rightChild) return false;
            let splitH = Math.random() > 0.5;
            if (this.w > this.h && this.w / this.h >= 1.25) splitH = false;
            else if (this.h > this.w && this.h / this.w >= 1.25) splitH = true;
            let max = (splitH ? this.h : this.w) - 6;
            if (max <= 6) return false;
            const splitPos = Math.floor(Math.random() * (max - 6)) + 3;
            if (splitH) {
                this.leftChild = new BSPNode(this.x, this.z, this.w, splitPos);
                this.rightChild = new BSPNode(this.x, this.z + splitPos, this.w, this.h - splitPos);
            } else {
                this.leftChild = new BSPNode(this.x, this.z, splitPos, this.h);
                this.rightChild = new BSPNode(this.x + splitPos, this.z, this.w - splitPos, this.h);
            }
            return true;
        }
    }

    window.getBiomeAt = getBiomeAt;
    return CampaignMapManager;
})();
