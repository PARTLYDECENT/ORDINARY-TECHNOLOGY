/**
 * MAP MANAGER: Chunk-based Open World System
 * LEGACY FILE (Reverted to static trees)
 */

const MapManager = (function () {
    // Shared harmonic noise function for biomes (mirrored in GLSL)
    function getBiomeNoise(x, z) {
        let n = Math.sin(x * 0.005) * 0.5 + 0.5;
        n += Math.sin(z * 0.005) * 0.5 + 0.5;
        n += Math.sin((x + z) * 0.002) * 0.5 + 0.5;
        return n / 3.0; // returns ~0.0 to 1.0 continuously
    }

    function getBiomeAt(x, z) {
        const n = getBiomeNoise(x * 1.5, z * 1.5);
        return n < 0.5 ? 'toxic' : 'wasteland';
    }

    class MapManager {
        constructor(scene, config) {
            this.scene = scene;
            this.config = config;
            this.chunks = new Map();
            this.chunkSize = config.gridSize * config.cellSize; // e.g. 128 units
            this.activeChunks = new Set();
            this.viewRadius = 1; // Number of chunks around the player to keep active

            FacilityGen.init(config);

            this.treeGeo = ModelFactory.getTreeGeo();
            this.treeMat = new THREE.MeshStandardMaterial({ color: 0x443a32, roughness: 0.9 });
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
                float n = snoise(vWorldPosOut * 4.0);
                // Weathered, desaturated bark texture
                diffuseColor.rgb = mix(vec3(0.22, 0.15, 0.1), vec3(0.1, 0.08, 0.05), n);
                diffuseColor.rgb *= 0.7 + n * 0.6;
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

            [sdfBunkers, pillars, trees, debris, barrels].forEach(m => {
                m.castShadow = true; m.receiveShadow = true;
            });

            let sdfCount = 0, pCount = 0, tCount = 0, dCount = 0, brlCount = 0;
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

            // 2. Structured Industrial Infrastructure: SUBSTATIONS & LONG RUNS
            const isHub = (cx % 4 === 0 && cz % 4 === 0);
            const isPipeX = (cz % 4 === 0);
            const isPipeZ = (cx % 4 === 0);

            if (isHub) {
                for (let i = 0; i < 4; i++) {
                    const hx = 16 + (i % 2) * 32;
                    const hz = 16 + Math.floor(i / 2) * 32;
                    const wx = hx * this.config.cellSize + worldOffsetX;
                    const wz = hz * this.config.cellSize + worldOffsetZ;
                    const gh = TerrainGen.getMeshHeight(wx, wz);
                    dummy.position.set(hx * this.config.cellSize, gh, hz * this.config.cellSize);
                    dummy.scale.set(1.5, 4.0, 1.5);
                    dummy.updateMatrix();
                    pillars.setMatrixAt(pCount++, dummy.matrix);
                    for (let j = 0; j < 4; j++) {
                        const ang = (j / 4) * Math.PI * 2;
                        dummy.position.set(hx * this.config.cellSize + Math.sin(ang) * 4, gh, hz * this.config.cellSize + Math.cos(ang) * 4);
                        dummy.scale.set(2, 6, 2);
                        dummy.updateMatrix();
                        trees.setMatrixAt(tCount++, dummy.matrix); // Reusing trees as industrial pillars/pipes if needed, or just skip
                    }
                }
            }

            // Continuous Pipeline
            if (isPipeX || isPipeZ) {
                const pipeHeight = 4.0;
                const segments = Math.floor(this.chunkSize / 2.0);
                for (let s = 0; s < segments; s++) {
                    let px = isPipeX ? s * 2.0 : this.chunkSize / 2;
                    let pz = isPipeZ ? s * 2.0 : this.chunkSize / 2;
                    const terrainH = TerrainGen.getMeshHeight(px + worldOffsetX, pz + worldOffsetZ);
                    dummy.position.set(px, terrainH + pipeHeight, pz);
                    dummy.rotation.set(0, 0, 0);
                    if (isPipeX) dummy.rotation.z = Math.PI / 2;
                    else dummy.rotation.x = Math.PI / 2;
                    dummy.scale.set(3.0, 2.1, 3.0);
                    dummy.updateMatrix();
                    // In map.js, we don't have separate pipe mesh in the original snippet? 
                    // Wait, let me check map.js children.
                    // It has trees, debris, barrels. 
                    // I'll skip adding pipes to map.js if they weren't there, or just add them.
                    // Actually, let's just stick to SurvivalMap.js for the complex stuff.
                }
            }
            }

            sdfBunkers.count = sdfCount; pillars.count = pCount; trees.count = tCount; dCount = dCount; barrels.count = brlCount;

            chunkGroup.add(sdfBunkers); chunkGroup.add(pillars); chunkGroup.add(trees); chunkGroup.add(debris); chunkGroup.add(barrels);

            this.chunks.set(key, {
                group: chunkGroup,
                costField: costField,
                sdfBunkers: sdfBunkers, pillars: pillars, trees: trees, debris: debris, barrels: barrels,
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

    return MapManager;
})();
