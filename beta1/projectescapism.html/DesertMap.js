/**
 * DESERT MAP MANAGER: Vast Flat Desert Plane with Brutalist Fortresses
 * A scorching, desolate expanse — no rocks, debris, bones, or dead bushes.
 * Only grand brutalist sci-fi fortresses towering in the golden haze.
 */

const DesertMapManager = (function () {

    class DesertMapManager {
        constructor(scene, config) {
            this.scene = scene;
            this.config = config;
            this.chunks = new Map();
            this.chunkSize = config.gridSize * config.cellSize;
            this.activeChunks = new Set();
            this.viewRadius = 1;

            // Override terrain to be nearly flat for desert
            this._origGetHeight = TerrainGen.getHeight.bind(TerrainGen);

            // === SCI-FI FORTRESS MATERIALS ===
            this.wallMat = new THREE.MeshStandardMaterial({
                color: 0x3d3d45, roughness: 0.65, metalness: 0.85
            });
            this.trimMat = new THREE.MeshStandardMaterial({
                color: 0x1f1f24, roughness: 0.5, metalness: 0.9
            });
            this.glowMat = new THREE.MeshStandardMaterial({
                color: 0xffaa00, emissive: 0xff5500, emissiveIntensity: 4.0
            });

            this.animatableObjects = [];
        }

        // Desert terrain now has sand dunes
        _getDesertHeight(x, z) {
            return TerrainGen.getHeight(x, z);
        }

        update(playerPosition, delta = 0) {
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

            // Cleanup distant chunks
            for (const key of this.activeChunks) {
                if (!currentActive.has(key)) {
                    this._unloadChunk(key);
                }
            }
            this.activeChunks = currentActive;

            // Update active animatable objects (like procedural spires)
            for (let i = this.animatableObjects.length - 1; i >= 0; i--) {
                const obj = this.animatableObjects[i];
                if (obj.parent === null || obj.parent.parent === null) {
                    if (typeof obj.dispose === 'function') {
                        obj.dispose();
                    }
                    this.animatableObjects.splice(i, 1);
                    continue;
                }
                if (obj.update) {
                    obj.update(delta, playerPosition);
                }
            }
        }

        getCostAt(worldX, worldZ) {
            const cx = Math.floor(worldX / this.chunkSize);
            const cz = Math.floor(worldZ / this.chunkSize);
            const key = `${cx},${cz}`;
            const chunk = this.chunks.get(key);
            if (!chunk) return 1;

            const lx = Math.floor((worldX - cx * this.chunkSize) / this.config.cellSize);
            const lz = Math.floor((worldZ - cz * this.chunkSize) / this.config.cellSize);

            if (lx < 0 || lx >= this.config.gridSize || lz < 0 || lz >= this.config.gridSize) return 1;

            return chunk.costField[lz * this.config.gridSize + lx];
        }

        _createFortress(lx, lz, chunkGroup, costField, i) {
            const fortress = new THREE.Group();
            // position inside chunk
            const x = lx * this.config.cellSize + this.config.cellSize * 0.5;
            const z = lz * this.config.cellSize + this.config.cellSize * 0.5;

            // Ground the fortress perfectly on the undulating dune surface
            const worldX = x + chunkGroup.position.x;
            const worldZ = z + chunkGroup.position.z;
            const h = TerrainGen.getHeight(worldX, worldZ);

            fortress.position.set(x, h, z);

            // Random rotation for variety
            fortress.rotation.y = Math.floor(Math.random() * 4) * (Math.PI / 2); // 90 degree increments for brutalist alignment

            // 1. MAIN PLATED BASE
            const baseWidth = 12 + Math.random() * 6;
            const baseHeight = 7 + Math.random() * 5;
            const baseDepth = 12 + Math.random() * 6;

            const baseGeo = new THREE.BoxGeometry(baseWidth, baseHeight, baseDepth);
            const baseMesh = new THREE.Mesh(baseGeo, this.wallMat);
            baseMesh.position.y = baseHeight / 2;
            baseMesh.castShadow = true;
            baseMesh.receiveShadow = true;
            fortress.add(baseMesh);

            // 2. UPPER OBSERVATION TOWER
            const towerWidth = baseWidth * 0.6;
            const towerHeight = 9 + Math.random() * 7;
            const towerDepth = baseDepth * 0.6;
            const towerGeo = new THREE.BoxGeometry(towerWidth, towerHeight, towerDepth);
            const towerMesh = new THREE.Mesh(towerGeo, this.wallMat);
            towerMesh.position.y = baseHeight + towerHeight / 2;
            towerMesh.castShadow = true;
            towerMesh.receiveShadow = true;
            fortress.add(towerMesh);

            // 3. SCI-FI ENERGY CELL / WINDOW BAND (between base and tower)
            const bandHeight = 0.6;
            const bandGeo = new THREE.BoxGeometry(towerWidth + 0.1, bandHeight, towerDepth + 0.1);
            const bandMesh = new THREE.Mesh(bandGeo, this.glowMat);
            bandMesh.position.y = baseHeight + 0.3;
            fortress.add(bandMesh);

            // 4. VERTICAL GLOWING STRIP DETAILS
            for (let side of [-1, 1]) {
                const stripGeo = new THREE.BoxGeometry(0.3, baseHeight * 0.8, baseDepth + 0.05);
                const stripMesh = new THREE.Mesh(stripGeo, this.glowMat);
                stripMesh.position.set(side * (baseWidth / 2), baseHeight / 2, 0);
                fortress.add(stripMesh);

                const stripGeo2 = new THREE.BoxGeometry(baseWidth + 0.05, baseHeight * 0.8, 0.3);
                const stripMesh2 = new THREE.Mesh(stripGeo2, this.glowMat);
                stripMesh2.position.set(0, baseHeight / 2, side * (baseDepth / 2));
                fortress.add(stripMesh2);
            }

            // 5. DEFENSIVE SHIELD WALL / BUTTRESSES
            for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 2) {
                const buttress = new THREE.Group();
                buttress.rotation.y = angle;

                const bGeo = new THREE.BoxGeometry(2.5, baseHeight * 0.65, 4.5);
                const bMesh = new THREE.Mesh(bGeo, this.trimMat);
                bMesh.position.set(0, (baseHeight * 0.65) / 2, baseDepth / 2 + 1.2);
                bMesh.castShadow = true;
                bMesh.receiveShadow = true;
                buttress.add(bMesh);

                // Angle cut detail on buttress
                const bTipGeo = new THREE.CylinderGeometry(0, 1.6, 2.2, 4);
                const bTip = new THREE.Mesh(bTipGeo, this.wallMat);
                bTip.rotation.y = Math.PI / 4;
                bTip.position.set(0, baseHeight * 0.65 + 1.1, baseDepth / 2 + 1.2);
                buttress.add(bTip);

                fortress.add(buttress);
            }

            // 6. SCI-FI COMMUNICATIONS ANTENNA ON TOP
            const antennaRoot = new THREE.Group();
            antennaRoot.position.set(0, baseHeight + towerHeight, 0);

            const mastGeo = new THREE.CylinderGeometry(0.12, 0.25, 6, 8);
            const mast = new THREE.Mesh(mastGeo, this.trimMat);
            mast.position.y = 3;
            mast.castShadow = true;
            antennaRoot.add(mast);

            // Glowing antenna beacon light
            const beaconGeo = new THREE.SphereGeometry(0.3, 8, 8);
            const beacon = new THREE.Mesh(beaconGeo, this.glowMat);
            beacon.position.y = 6.0;
            antennaRoot.add(beacon);

            // Radar dish
            const dishGeo = new THREE.CylinderGeometry(1.4, 0.1, 0.5, 16);
            const dish = new THREE.Mesh(dishGeo, this.wallMat);
            dish.position.set(0, 4.0, 0.6);
            dish.rotation.x = 0.5; // Tilted
            antennaRoot.add(dish);

            fortress.add(antennaRoot);

            // Add to chunk
            chunkGroup.add(fortress);

            // Mark the costField to be completely impassable
            // We block out a grid around this cell in costField
            const rCells = 2; // radius of blocked cells
            const midX = lx;
            const midZ = lz;
            for (let dx = -rCells; dx <= rCells; dx++) {
                for (let dz = -rCells; dz <= rCells; dz++) {
                    const targetX = midX + dx;
                    const targetZ = midZ + dz;
                    if (targetX >= 0 && targetX < this.config.gridSize && targetZ >= 0 && targetZ < this.config.gridSize) {
                        costField[targetZ * this.config.gridSize + targetX] = 255;
                    }
                }
            }
        }

        _generateChunk(cx, cz) {
            const key = `${cx},${cz}`;
            const worldOffsetX = cx * this.chunkSize;
            const worldOffsetZ = cz * this.chunkSize;

            const numCells = this.config.gridSize * this.config.gridSize;
            const costField = new Uint8Array(numCells).fill(1);

            const chunkGroup = new THREE.Group();
            chunkGroup.position.set(worldOffsetX, 0, worldOffsetZ);
            this.scene.add(chunkGroup);

            let ammoCount = 0;

            // Scatter 2 massive advanced fortresses per chunk, but none on the starting chunk (0,0) to keep spawn clear!
            const targetFortresses = 0;
            const chosenCells = [];

            if (targetFortresses > 0) {
                // Pick cells that are not too close to the borders to avoid clipping chunk edges
                const minCell = 8;
                const maxCell = this.config.gridSize - 8;

                for (let f = 0; f < targetFortresses; f++) {
                    const lx = Math.floor(minCell + Math.random() * (maxCell - minCell));
                    const lz = Math.floor(minCell + Math.random() * (maxCell - minCell));
                    // Ensure distinct coordinates
                    if (!chosenCells.some(c => c.lx === lx && c.lz === lz)) {
                        chosenCells.push({ lx, lz });
                    } else {
                        f--; // retry
                    }
                }
            }

            for (let i = 0; i < numCells; i++) {
                const lx = i % this.config.gridSize;
                const lz = Math.floor(i / this.config.gridSize);
                const wx = lx * this.config.cellSize + worldOffsetX;
                const wz = lz * this.config.cellSize + worldOffsetZ;

                const isFortressCell = chosenCells.some(c => c.lx === lx && c.lz === lz);
                if (isFortressCell) {
                    this._createFortress(lx, lz, chunkGroup, costField, i);
                }

                // Scatter ammo drops in open spaces
                const rand = Math.random();
                if (rand < 0.005 && ammoCount < 6 && !isFortressCell) {
                    this._spawnAmmoDrop(wx, wz, key);
                    ammoCount++;
                }
            }

            // Spawn 3-4 procedural 4D spires per chunk to distort the horizon (disabled in desolation)
            if (window.ProceduralSpire) {
                const numSpires = 0;
                for (let s = 0; s < numSpires; s++) {
                    const lx = 4 + Math.random() * (this.config.gridSize - 8);
                    const lz = 4 + Math.random() * (this.config.gridSize - 8);

                    // Ensure not right on top of a fortress
                    const isNearFortress = chosenCells.some(c => Math.abs(c.lx - lx) < 6 && Math.abs(c.lz - lz) < 6);
                    if (isNearFortress) continue;

                    const wx = lx * this.config.cellSize + worldOffsetX;
                    const wz = lz * this.config.cellSize + worldOffsetZ;

                    // Avoid placing right at starting spawn location
                    if (cx === 0 && cz === 0 && Math.sqrt(wx * wx + wz * wz) < 18.0) {
                        continue;
                    }

                    // Ground the spire perfectly on sand dune height
                    const h = TerrainGen.getHeight(wx, wz);

                    const scale = 0.8 + Math.random() * 0.7;
                    const height = 24.0 + Math.random() * 16.0;

                    const spire = new window.ProceduralSpire({
                        scale: scale,
                        height: height
                    });

                    // Position high up in the sky as suspended floating stalactites
                    const skyHeight = h + 45.0 + Math.random() * 15.0;
                    spire.position.set(lx * this.config.cellSize, skyHeight, lz * this.config.cellSize);

                    // Splay/fan out the spires and flip them upside down!
                    spire.rotation.x = (Math.random() - 0.5) * 0.45;
                    spire.rotation.z = Math.PI + (Math.random() - 0.5) * 0.45;
                    spire.rotation.y = Math.random() * Math.PI * 2;

                    chunkGroup.add(spire);
                    this.animatableObjects.push(spire);
                }
            }

            this.chunks.set(key, {
                group: chunkGroup,
                costField: costField
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
                this.chunks.delete(key);

                // Cleanup ammo drops from this chunk
                if (window.weaponDrops) {
                    for (let i = window.weaponDrops.length - 1; i >= 0; i--) {
                        const drop = window.weaponDrops[i];
                        if (drop.chunkKey === key) {
                            this.scene.remove(drop.mesh);
                            window.weaponDrops.splice(i, 1);
                        }
                    }
                }
            }
        }

        _spawnAmmoDrop(x, z, chunkKey) {
            if (typeof Shotgun === 'undefined') return;

            const gh = this._getDesertHeight(x, z);

            const dropMesh = new Shotgun();
            dropMesh.scale.set(0.6, 0.6, 0.6);
            if (dropMesh.muzzleLight) dropMesh.remove(dropMesh.muzzleLight);

            dropMesh.position.set(x, gh + 0.4, z);
            dropMesh.rotation.set(0.2, Math.random() * Math.PI * 2, 0.1);

            this.scene.add(dropMesh);
            if (window.weaponDrops) {
                window.weaponDrops.push({
                    mesh: dropMesh,
                    type: Math.random() > 0.5 ? 'shotgun' : 'ar',
                    chunkKey: chunkKey
                });
            }
        }
    }

    return DesertMapManager;
})();
