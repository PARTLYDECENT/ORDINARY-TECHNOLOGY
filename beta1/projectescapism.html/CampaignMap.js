/**
 * MAP MANAGER: Chunk-based Open World System
 */

const CampaignMapManager = (function() {
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
            
            shader.vertexShader = `
                uniform float uTime;
                varying vec3 vWorldPosOut;
                varying vec3 vLocalPosOut;
            ` + shader.vertexShader;
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
            shader.fragmentShader = `
                varying vec3 vWorldPosOut;
                varying vec3 vLocalPosOut;
                float snoise(vec3 v) { return fract(sin(dot(v, vec3(12.9898, 78.233, 45.164))) * 43758.5453); }
            ` + shader.fragmentShader;
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
        this.rockGeo = ObjectFactory.getRockGeo();
        this.rockMat = ObjectFactory.getRockMat();
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

        const sharedMats = [this.treeMat, this.rockMat, this.debrisMat, this.barrelMat];
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

        const walls = new THREE.InstancedMesh(FacilityGen.wallGeo, FacilityGen.wallMat, 2000); 
        const floors = new THREE.InstancedMesh(FacilityGen.floorGeo, FacilityGen.floorMat, 2000); 
        const pillars = new THREE.InstancedMesh(FacilityGen.pillarGeo, FacilityGen.pillarMat, 1000); 
        const trees = new THREE.InstancedMesh(this.treeGeo, this.treeMat, 300);
        const rocks = new THREE.InstancedMesh(this.rockGeo, this.rockMat, 400);
        const debris = new THREE.InstancedMesh(this.debrisGeo, this.debrisMat, 200);
        const barrels = new THREE.InstancedMesh(this.barrelGeo, this.barrelMat, 100);

        [walls, floors, pillars, trees, rocks, debris, barrels].forEach(m => {
            m.castShadow = true; m.receiveShadow = true;
        });
        
        let wCount = 0, fCount = 0, pCount = 0, tCount = 0, rCount = 0, dCount = 0, brlCount = 0;
        const dummy = new THREE.Object3D();

        // 1. Procedural Building Generation (BSP)
        const roots = [];
        for(let i=0; i<4; i++) { // Fewer roots per chunk
            const bw = 8 + Math.floor(Math.random() * 8);
            const bh = 8 + Math.floor(Math.random() * 8);
            const bx = Math.floor(Math.random() * (this.config.gridSize - bw - 2)) + 1;
            const bz = Math.floor(Math.random() * (this.config.gridSize - bh - 2)) + 1;
            
            const root = new BSPNode(bx, bz, bw, bh);
            const leaves = [root];
            let toSplit = true;
            while(toSplit) {
                toSplit = false;
                for(let j=leaves.length-1; j>=0; j--) {
                    if(leaves[j].split()) {
                        leaves.splice(j, 1, leaves[j].leftChild, leaves[j].rightChild);
                        toSplit = true;
                    }
                }
            }
            
            leaves.forEach(leaf => {
                // Instanced Facility Floors inside the BSP Leaf Boundary
                for(let x=leaf.x + 1; x < leaf.x + leaf.w - 1; x++) {
                    for(let z=leaf.z + 1; z < leaf.z + leaf.h - 1; z++) {
                        const gh = (window.TerrainGen && typeof TerrainGen.getMeshHeight === 'function') 
                            ? TerrainGen.getMeshHeight(x * this.config.cellSize + this.config.cellSize/2 + worldOffsetX, z * this.config.cellSize + this.config.cellSize/2 + worldOffsetZ)
                            : 0;
                        dummy.position.set(x * this.config.cellSize + this.config.cellSize/2, gh, z * this.config.cellSize + this.config.cellSize/2);
                        dummy.scale.setScalar(1);
                        dummy.rotation.set(0, 0, 0);
                        dummy.updateMatrix();
                        floors.setMatrixAt(fCount++, dummy.matrix);
                    }
                }
                
                // Track corners for pillars
                const corners = [
                    {x: leaf.x, z: leaf.z},
                    {x: leaf.x + leaf.w - 1, z: leaf.z},
                    {x: leaf.x, z: leaf.z + leaf.h - 1},
                    {x: leaf.x + leaf.w - 1, z: leaf.z + leaf.h - 1}
                ];
                corners.forEach(c => {
                    const wx = c.x * this.config.cellSize + this.config.cellSize/2 + worldOffsetX;
                    const wz = c.z * this.config.cellSize + this.config.cellSize/2 + worldOffsetZ;
                    const gh = (window.TerrainGen && typeof TerrainGen.getMeshHeight === 'function') ? TerrainGen.getMeshHeight(wx, wz) : 0;
                    dummy.position.set(c.x * this.config.cellSize + this.config.cellSize/2, gh, c.z * this.config.cellSize + this.config.cellSize/2);
                    dummy.scale.set(1, 1, 1);
                    dummy.updateMatrix();
                    pillars.setMatrixAt(pCount++, dummy.matrix);
                });

                // Set Cost Boundaries for Pathfinding & Walls
                for(let x=leaf.x; x < leaf.x + leaf.w; x++) {
                    this._setCost(costField, x, leaf.z, 255);
                    this._setCost(costField, x, leaf.z + leaf.h - 1, 255);
                }
                for(let z=leaf.z; z < leaf.z + leaf.h; z++) {
                    this._setCost(costField, leaf.x, z, 255);
                    this._setCost(costField, leaf.x + leaf.w - 1, z, 255);
                }
            });
        }

        // Fill Layers
        for(let i=0; i<numCells; i++) {
            const lx = i % this.config.gridSize;
            const lz = Math.floor(i / this.config.gridSize);
            
            if(costField[i] === 255) {
                // Sci-Fi Walls
                const wx = lx * this.config.cellSize + this.config.cellSize/2 + worldOffsetX;
                const wz = lz * this.config.cellSize + this.config.cellSize/2 + worldOffsetZ;
                const gh = (window.TerrainGen && typeof TerrainGen.getMeshHeight === 'function') ? TerrainGen.getMeshHeight(wx, wz) : 0;
                dummy.position.set(lx * this.config.cellSize + this.config.cellSize/2, gh + this.config.cellSize/2, lz * this.config.cellSize + this.config.cellSize/2);
                dummy.scale.set(1, 1, 1);
                dummy.updateMatrix();
                walls.setMatrixAt(wCount++, dummy.matrix);
                
                // Debris logic: more debris near outposts
                if (Math.random() < 0.15 && wCount < 500) {
                    const dx = lx * this.config.cellSize + (Math.random()-0.5)*3;
                    const dz = lz * this.config.cellSize + (Math.random()-0.5)*3;
                    const dgh = (window.TerrainGen && typeof TerrainGen.getMeshHeight === 'function') ? TerrainGen.getMeshHeight(dx + worldOffsetX, dz + worldOffsetZ) : 0;
                    dummy.position.set(dx, dgh + 0.05, dz);
                    dummy.rotation.set(Math.random()*0.4, Math.random()*6.28, Math.random()*0.4);
                    dummy.scale.setScalar(0.5 + Math.random()*0.5);
                    dummy.updateMatrix();
                    debris.setMatrixAt(dCount++, dummy.matrix);
                }
            } else {
                const rand = Math.random();
                let pTree = 0.04, pRock = 0.07, pBarrel = 0.015, pFire = 0.003;
                
                if (chunkBiome === 'wasteland') {
                    pTree = 0.005; // very rare dead trees
                    pRock = 0.15;  // very dense rocks
                    pBarrel = 0.025; 
                    pFire = 0.008;  // more fires
                } else if (chunkBiome === 'toxic') {
                    pTree = 0.01; 
                    pRock = 0.05;
                    pBarrel = 0.05; // high industrial debris
                    pFire = 0.006;
                }
                
                if (rand < pTree && tCount < 300) { // Trees
                    const tx = lx * this.config.cellSize + this.config.cellSize/2 + worldOffsetX;
                    const tz = lz * this.config.cellSize + this.config.cellSize/2 + worldOffsetZ;
                    const gh = (window.TerrainGen && typeof TerrainGen.getMeshHeight === 'function') ? TerrainGen.getMeshHeight(tx, tz) : 0;
                    dummy.position.set(lx * this.config.cellSize + this.config.cellSize/2, gh, lz * this.config.cellSize + this.config.cellSize/2);
                    dummy.rotation.y = Math.random() * Math.PI * 2;
                    dummy.scale.setScalar(0.8 + Math.random() * 0.4);
                    dummy.updateMatrix();
                    trees.setMatrixAt(tCount++, dummy.matrix);
                    costField[i] = 10;
                } else if (rand < pTree + pRock && rCount < 400) { // Rocks
                    const rx = lx * this.config.cellSize + Math.random()*2;
                    const rz = lz * this.config.cellSize + Math.random()*2;
                    const gh = (window.TerrainGen && typeof TerrainGen.getMeshHeight === 'function') ? TerrainGen.getMeshHeight(rx + worldOffsetX, rz + worldOffsetZ) : 0;
                    dummy.position.set(rx, gh, rz);
                    dummy.rotation.set(Math.random()*0.2, Math.random()*6.28, Math.random()*0.2);
                    dummy.scale.setScalar(0.4 + Math.random()*(chunkBiome === 'wasteland' ? 1.5 : 0.8)); // bigger rocks in wasteland
                    dummy.updateMatrix();
                    rocks.setMatrixAt(rCount++, dummy.matrix);
                } else if (rand < pTree + pRock + pBarrel && brlCount < 100) { // Barrels
                    const bx = lx * this.config.cellSize + 1;
                    const bz = lz * this.config.cellSize + 1;
                    const gh = (window.TerrainGen && typeof TerrainGen.getHeight === 'function') ? TerrainGen.getHeight(bx + worldOffsetX, bz + worldOffsetZ) : 0;
                    dummy.position.set(bx, gh + 0.4, bz);
                    dummy.rotation.set(0, Math.random()*6.28, 0);
                    if (Math.random() < 0.2) dummy.rotation.x = 1.57; // Tipped over
                    dummy.scale.setScalar(0.9 + Math.random()*0.2);
                    dummy.updateMatrix();
                    barrels.setMatrixAt(brlCount++, dummy.matrix);
                    costField[i] = 50;
                } else if (rand < pTree + pRock + pBarrel + pFire) {
                    const fx = lx * this.config.cellSize + 1;
                    const fz = lz * this.config.cellSize + 1;
                    const gh = (window.TerrainGen && typeof TerrainGen.getHeight === 'function') ? TerrainGen.getHeight(fx + worldOffsetX, fz + worldOffsetZ) : 0;
                    if (chunkBiome === 'toxic' && Math.random() > 0.4) {
                        const puke = new THREE.Mesh(ObjectFactory.getPukePuddleGeo(), ObjectFactory.getPukeMat());
                        puke.position.set(fx, gh + 0.05, fz);
                        puke.scale.setScalar(1.0 + Math.random()*1.5);
                        chunkGroup.add(puke);
                    } else {
                        const fire = new THREE.Mesh(this.fireGeo, this.fireMat.clone());
                        fire.position.set(fx, gh, fz);
                        fire.scale.setScalar(0.8 + Math.random()*0.5);
                        chunkGroup.add(fire);
                        this.animatableObjects.push(fire);
                    }
                }
            }
        }

        walls.count = wCount; floors.count = fCount; pillars.count = pCount; trees.count = tCount; rocks.count = rCount; debris.count = dCount; barrels.count = brlCount;
        chunkGroup.add(walls); chunkGroup.add(floors); chunkGroup.add(pillars); chunkGroup.add(trees); chunkGroup.add(rocks); chunkGroup.add(debris); chunkGroup.add(barrels);

        this.chunks.set(key, {
            group: chunkGroup,
            costField: costField,
            walls: walls, floors: floors, pillars: pillars, trees: trees, rocks: rocks, debris: debris, barrels: barrels
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
                const isChild = chunk.group.children.includes(obj);
                if (isChild) {
                    if (obj.geometry) obj.geometry.dispose();
                    if (obj.material) {
                        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
                        else obj.material.dispose();
                    }
                }
                return !isChild;
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
