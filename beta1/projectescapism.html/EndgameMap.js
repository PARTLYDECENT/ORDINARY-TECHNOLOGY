/**
 * ENDGAME MAP MANAGER: Cosmic Void Glass Plane
 * An empty flat black obsidian mirror plane with no structures, no trees, no hazards.
 * Under an epic gothic sci-fi starry skybox.
 */

const EndgameMapManager = (function () {

    class EndgameMapManager {
        constructor(scene, config) {
            this.scene = scene;
            this.config = config;
            this.chunks = new Map();
            this.chunkSize = config.gridSize * config.cellSize; // e.g. 128 units
            this.activeChunks = new Set();
            this.viewRadius = 1; // Number of chunks around the player to keep active
            this.animatableObjects = [];
        }

        update(playerPosition, delta = 0, activeCamera = null) {
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
        }

        getCostAt(worldX, worldZ) {
            // Completely empty plane, no obstacles! All coordinates are passable (cost = 1)
            return 1;
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

            // No structures, no trees, no rocks, no hazards.
            // Just scatter occasional ammo drops in the open void space for survival gameplay.
            let ammoCount = 0;
            for (let i = 0; i < numCells; i++) {
                const lx = i % this.config.gridSize;
                const lz = Math.floor(i / this.config.gridSize);
                const wx = lx * this.config.cellSize + worldOffsetX;
                const wz = lz * this.config.cellSize + worldOffsetZ;

                const rand = Math.random();
                if (rand < 0.005 && ammoCount < 6) {
                    this._spawnAmmoDrop(wx, wz, key);
                    ammoCount++;
                }
            }

            this.chunks.set(key, {
                group: chunkGroup,
                costField: costField
            });
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

            // Endgame is perfectly flat at y = 0
            const gh = 0.0;

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

    return EndgameMapManager;
})();
