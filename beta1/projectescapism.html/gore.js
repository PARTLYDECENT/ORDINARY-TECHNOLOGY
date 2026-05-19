/**
 * gore.js - Procedural Biological Destruction System
 * Handles gibs, splatters, and visceral death effects.
 */

class GoreSystem {
    constructor(scene) {
        this.scene = scene;
        this.gibs = [];
        this.splatters = [];
        
        // Shared Materials
        this.fleshMat = new THREE.MeshStandardMaterial({
            color: 0x660000,
            roughness: 0.2,
            metalness: 0.1,
            emissive: 0x220000
        });

        this.splatMat = new THREE.MeshStandardMaterial({
            color: 0x440000,
            transparent: true,
            opacity: 0.8,
            depthWrite: false,
            polygonOffset: true,
            polygonOffsetFactor: -4
        });

        // Procedural Geometries
        this.gibGeos = [
            new THREE.IcosahedronGeometry(0.12, 0), // Chunk
            new THREE.BoxGeometry(0.08, 0.2, 0.08),  // Bone/Tube
            new THREE.SphereGeometry(0.1, 4, 4)      // Soft tissue
        ];
    }

    spawnDeath(pos, type = 'normal') {
        const gibCount = type === 'goliath' ? 24 : 12;
        const splatterSize = type === 'goliath' ? 4.5 : 2.5;

        // 1. Spawn Gibs (Physical fragments)
        for (let i = 0; i < gibCount; i++) {
            const geo = this.gibGeos[Math.floor(Math.random() * this.gibGeos.length)];
            const gib = new THREE.Mesh(geo, this.fleshMat);
            
            gib.position.copy(pos);
            gib.position.y += 0.5 + Math.random();
            
            const angle = Math.random() * Math.PI * 2;
            const force = 4 + Math.random() * 8;
            
            this.gibs.push({
                mesh: gib,
                velocity: new THREE.Vector3(
                    Math.cos(angle) * force * (Math.random() * 0.5 + 0.5),
                    5 + Math.random() * 10,
                    Math.sin(angle) * force * (Math.random() * 0.5 + 0.5)
                ),
                rotation: new THREE.Vector3(
                    Math.random() * 0.2,
                    Math.random() * 0.2,
                    Math.random() * 0.2
                ),
                life: 3.0 + Math.random() * 2.0,
                onGround: false
            });
            
            this.scene.add(gib);
        }

        // 2. Spawn Splatter (Ground decal)
        const splatGeo = new THREE.PlaneGeometry(splatterSize, splatterSize);
        const splat = new THREE.Mesh(splatGeo, this.splatMat.clone());
        splat.rotation.x = -Math.PI / 2;
        splat.position.copy(pos);
        splat.position.y = (window.TerrainGen ? window.TerrainGen.getHeight(pos.x, pos.z) : 0) + 0.02;
        splat.rotation.z = Math.random() * Math.PI * 2;
        
        this.splatters.push({
            mesh: splat,
            life: 8.0,
            maxLife: 8.0
        });
        
        this.scene.add(splat);
    }

    update(dt) {
        // Update Gibs
        for (let i = this.gibs.length - 1; i >= 0; i--) {
            const g = this.gibs[i];
            g.life -= dt;

            if (g.life <= 0) {
                this.scene.remove(g.mesh);
                this.gibs.splice(i, 1);
                continue;
            }

            if (!g.onGround) {
                // Apply Gravity
                g.velocity.y -= 25 * dt;
                g.mesh.position.addScaledVector(g.velocity, dt);
                
                g.mesh.rotation.x += g.rotation.x;
                g.mesh.rotation.y += g.rotation.y;
                g.mesh.rotation.z += g.rotation.z;

                // Terrain Collision
                const terrainH = window.TerrainGen ? window.TerrainGen.getHeight(g.mesh.position.x, g.mesh.position.z) : 0;
                if (g.mesh.position.y <= terrainH + 0.05) {
                    g.mesh.position.y = terrainH + 0.05;
                    g.onGround = true;
                    // Squash slightly
                    g.mesh.scale.y *= 0.4;
                    g.mesh.scale.x *= 1.2;
                    g.mesh.scale.z *= 1.2;
                }
            }

            // Fade out
            if (g.life < 1.0) {
                g.mesh.scale.multiplyScalar(0.95);
            }
        }

        // Update Splatters
        for (let i = this.splatters.length - 1; i >= 0; i--) {
            const s = this.splatters[i];
            s.life -= dt;

            if (s.life <= 0) {
                this.scene.remove(s.mesh);
                this.splatters.splice(i, 1);
                continue;
            }

            // Fade out
            if (s.life < 2.0) {
                s.mesh.material.opacity = s.life / 2.0;
            }
        }
    }
}

window.GoreSystem = GoreSystem;
