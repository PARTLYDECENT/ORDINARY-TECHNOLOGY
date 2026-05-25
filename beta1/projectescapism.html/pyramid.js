/**
 * pyramid.js - High-Fidelity Cyber-Brutalist Pyramid Builder
 * Spawns a massive obsidian monument that builds block-by-block in real-time as zombies are killed.
 * Features parabolic glowing trail projectiles, elastic scaling materialization,
 * intense neon edge outlines, and glowing particle shockwaves.
 */

(function () {

    class PyramidBlock {
        constructor(worldX, worldY, worldZ, scene) {
            this.worldPos = new THREE.Vector3(worldX, worldY, worldZ);
            this.scene = scene;
            this.mesh = null;
            this.edgesLine = null;
            this.group = new THREE.Group();
            this.group.position.copy(this.worldPos);
            this.group.scale.set(0.001, 0.001, 0.001); // Start collapsed for build animation
            
            this.scaleTarget = 1.0;
            this.scaleCurrent = 0.001;
            this.pulseIntensity = 1.0;

            const size = 1.58; // Cubes fit perfectly side-by-side with tiny bevel gap
            const boxGeo = new THREE.BoxGeometry(size, size, size);

            // Dark Obsidian Cyber-Stone with Emissive Gold Accents
            const blockMat = new THREE.MeshStandardMaterial({
                color: 0x14141c,
                roughness: 0.2,
                metalness: 0.9,
                emissive: 0xff6600, // Rich warm neon glow
                emissiveIntensity: 0.2
            });

            this.mesh = new THREE.Mesh(boxGeo, blockMat);
            this.mesh.castShadow = true;
            this.mesh.receiveShadow = true;
            this.group.add(this.mesh);

            // Glowing Neon Wireframe Outline around each block's edges
            const edgesGeo = new THREE.EdgesGeometry(boxGeo);
            const lineMat = new THREE.LineBasicMaterial({
                color: 0xffaa00,
                linewidth: 2,
                transparent: true,
                opacity: 0.8
            });
            this.edgesLine = new THREE.LineSegments(edgesGeo, lineMat);
            this.group.add(this.edgesLine);

            this.scene.add(this.group);
        }

        update(delta, time) {
            // Elastic/spring scale-in animation
            if (this.scaleCurrent < this.scaleTarget) {
                this.scaleCurrent += (this.scaleTarget - this.scaleCurrent) * delta * 7.5;
                if (this.scaleCurrent > 0.99) this.scaleCurrent = this.scaleTarget;
                this.group.scale.setScalar(this.scaleCurrent);
            }

            // Breathing glowing aura on the block
            const pulse = 0.2 + 0.18 * Math.sin(time * 3.0 + this.worldPos.x * 0.15 + this.worldPos.z * 0.15);
            if (this.mesh && this.mesh.material) {
                this.mesh.material.emissiveIntensity = pulse * this.pulseIntensity;
            }
            if (this.edgesLine && this.edgesLine.material) {
                this.edgesLine.material.opacity = 0.5 + 0.5 * Math.sin(time * 4.0);
            }

            // Decay high pulse intensity back to normal
            if (this.pulseIntensity > 1.0) {
                this.pulseIntensity -= delta * 3.5;
                if (this.pulseIntensity < 1.0) this.pulseIntensity = 1.0;
            }
        }

        triggerBuildFlash() {
            this.pulseIntensity = 6.0; // Blinding arrival flash
        }

        dispose() {
            if (this.mesh) {
                this.mesh.geometry.dispose();
                this.mesh.material.dispose();
            }
            if (this.edgesLine) {
                this.edgesLine.geometry.dispose();
                this.edgesLine.material.dispose();
            }
            this.scene.remove(this.group);
        }
    }

    class BuildingProjectile {
        constructor(startPos, endPos, scene, onArrival) {
            this.startPos = startPos.clone();
            this.endPos = endPos.clone();
            this.currentPos = startPos.clone();
            this.scene = scene;
            this.onArrival = onArrival;
            this.progress = 0.0;
            this.speed = 1.8; // Reaches in ~0.55s

            // Glowing plasma sphere flying to build the block
            const geo = new THREE.SphereGeometry(0.35, 8, 8);
            const mat = new THREE.MeshBasicMaterial({
                color: 0xff8800,
                transparent: true,
                opacity: 0.95
            });
            this.mesh = new THREE.Mesh(geo, mat);
            this.mesh.position.copy(this.startPos);
            this.scene.add(this.mesh);
        }

        update(delta) {
            this.progress += delta * this.speed;
            if (this.progress >= 1.0) {
                this.progress = 1.0;
            }

            const t = this.progress;
            
            // Quadratic Bezier arc flight path
            this.currentPos.lerpVectors(this.startPos, this.endPos, t);
            const arcHeight = 7.0;
            const heightOffset = Math.sin(t * Math.PI) * arcHeight;
            this.mesh.position.copy(this.currentPos);
            this.mesh.position.y += heightOffset;

            // Emit glowing cyber trails
            if (Math.random() < 0.55 && window.emitParticle) {
                window.emitParticle(
                    this.mesh.position.x, this.mesh.position.y, this.mesh.position.z,
                    (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3 + 2, (Math.random() - 0.5) * 3,
                    1.0, 0.5, 0.0, 6, 0.35
                );
            }

            if (this.progress >= 1.0) {
                this.dispose();
                if (this.onArrival) this.onArrival();
                return true;
            }
            return false;
        }

        dispose() {
            this.mesh.geometry.dispose();
            this.mesh.material.dispose();
            this.scene.remove(this.mesh);
        }
    }

    class PyramidManager {
        constructor() {
            this.scene = null;
            this.blocks = [];
            this.projectiles = [];
            this.blockCount = 0;
            this.centerX = 0;
            this.centerZ = -45; // Placed perfectly in front of starting player spawn (0,0,0)
            this.baseHeight = 0;
            this.blockSize = 1.6;
            this.blockCoords = [];
            this.isInitialized = false;

            this._generateSequence();
        }

        // Pre-calculates outer-in concentric building pattern per layer
        _generateSequence() {
            this.blockCoords = [];
            const B = 15; // 15x15 massive base!
            
            for (let layer = 0; layer < 8; layer++) {
                const size = B - 2 * layer;
                if (size < 1) break;
                
                const half = Math.floor(size / 2);
                const layerCoords = [];

                for (let lx = -half; lx <= half; lx++) {
                    for (let lz = -half; lz <= half; lz++) {
                        layerCoords.push({ lx, layer, lz });
                    }
                }

                // Sort coords by distance from center descending to build outer frame first
                layerCoords.sort((a, b) => {
                    const distA = a.lx * a.lx + a.lz * a.lz;
                    const distB = b.lx * b.lx + b.lz * b.lz;
                    return distB - distA;
                });

                this.blockCoords.push(...layerCoords);
            }
        }

        init(scene) {
            this.reset();
            this.scene = scene;
            
            // Ground monument baseline on sand dune elevation
            if (window.TerrainGen) {
                this.baseHeight = window.TerrainGen.getHeight(this.centerX, this.centerZ);
            } else {
                this.baseHeight = 0;
            }

            this.isInitialized = true;
            console.log(`[PyramidManager] Initialized base height: ${this.baseHeight}`);
        }

        reset() {
            this.blocks.forEach(b => b.dispose());
            this.blocks = [];
            this.projectiles.forEach(p => p.dispose());
            this.projectiles = [];
            this.blockCount = 0;
        }

        registerKill(x, y, z) {
            if (!this.isInitialized || !this.scene) return;

            const nextIdx = this.blockCount;
            this.blockCount++;

            // If primary pyramid is completely built, start building a twin next to it!
            let activeCenterX = this.centerX;
            let activeCenterZ = this.centerZ;
            let currentBlockIdx = nextIdx;

            const maxBlocks = this.blockCoords.length;
            if (nextIdx >= maxBlocks) {
                const pyramidNum = Math.floor(nextIdx / maxBlocks);
                currentBlockIdx = nextIdx % maxBlocks;
                // Shift twin pyramids along X axis
                activeCenterX = this.centerX + pyramidNum * 26.0 * (pyramidNum % 2 === 0 ? 1 : -1);
            }

            const coord = this.blockCoords[currentBlockIdx];
            const targetX = activeCenterX + coord.lx * this.blockSize;
            const targetY = this.baseHeight + coord.layer * this.blockSize + this.blockSize * 0.5;
            const targetZ = activeCenterZ + coord.lz * this.blockSize;

            const zombiePos = new THREE.Vector3(x, y, z);
            const targetPos = new THREE.Vector3(targetX, targetY, targetZ);

            // Spawn glowing build projectile
            const proj = new BuildingProjectile(zombiePos, targetPos, this.scene, () => {
                this._placeBlock(targetX, targetY, targetZ);
            });
            this.projectiles.push(proj);
        }

        _placeBlock(x, y, z) {
            const block = new PyramidBlock(x, y, z, this.scene);
            block.triggerBuildFlash();
            this.blocks.push(block);

            // 1. Cyberpunk neon spark burst on placement
            if (window.emitParticle) {
                for (let i = 0; i < 20; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const spd = 3.0 + Math.random() * 8.0;
                    window.emitParticle(
                        x, y, z,
                        Math.cos(angle) * spd, 3.0 + Math.random() * 6.0, Math.sin(angle) * spd,
                        1.0, 0.65, 0.0, 10, 0.45
                    );
                }
            }

            // 2. High-Tech Synth Materialization SFX
            if (window.SFX) {
                window.SFX.play('CYC_1', { volume: 0.35, pitch: 1.4 + Math.random() * 0.4 });
            }
        }

        update(delta, time) {
            if (!this.isInitialized) return;

            // Update build projectiles
            for (let i = this.projectiles.length - 1; i >= 0; i--) {
                const arrived = this.projectiles[i].update(delta);
                if (arrived) {
                    this.projectiles.splice(i, 1);
                }
            }

            // Update blocks (breathing pulse and scale-in)
            this.blocks.forEach(b => b.update(delta, time));
        }
    }

    // Expose as global singleton
    window.PyramidManager = new PyramidManager();

})();
