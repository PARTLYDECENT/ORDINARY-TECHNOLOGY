/**
 * PaintSystem.js - Cyberpunk Neon Paint Splatter & Decal Engine
 * Allows the player to spray glowing paint decals onto walls, floors, and obstacles.
 */
class PaintSystem {
    constructor(scene) {
        this.scene = scene;
        this.decals = [];
        this.maxDecals = 100; // performance ceiling
        this.colors = [
            { hex: 0xff0055, name: 'Neon Pink' },
            { hex: 0x39ff14, name: 'Acid Green' },
            { hex: 0x00f3ff, name: 'Plasma Cyan' },
            { hex: 0xffaa00, name: 'Solar Gold' },
            { hex: 0xaa44ff, name: 'Void Magenta' }
        ];
        this.currentColorIdx = 2; // Default Cyan
        this.isActive = false;

        // Pre-generate splatter canvas textures
        this.splatterTextures = this.generateSplatterTextures();
    }

    generateSplatterTextures() {
        const textures = [];
        for (let t = 0; t < 3; t++) {
            const canvas = document.createElement('canvas');
            canvas.width = 128;
            canvas.height = 128;
            const ctx = canvas.getContext('2d');

            ctx.fillStyle = 'rgba(0, 0, 0, 0)';
            ctx.fillRect(0, 0, 128, 128);

            // Draw organic splatter shape
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(64, 64, 25 + Math.random() * 10, 0, Math.PI * 2);
            ctx.fill();

            // Spawn radial splatter drops
            const dropCount = 8 + Math.floor(Math.random() * 8);
            for (let d = 0; d < dropCount; d++) {
                const angle = Math.random() * Math.PI * 2;
                const dist = 30 + Math.random() * 25;
                const radius = 3 + Math.random() * 6;
                const dx = 64 + Math.cos(angle) * dist;
                const dy = 64 + Math.sin(angle) * dist;

                ctx.beginPath();
                ctx.arc(dx, dy, radius, 0, Math.PI * 2);
                ctx.fill();

                // Draw connector tail
                ctx.beginPath();
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = radius * 0.4;
                ctx.moveTo(64, 64);
                ctx.quadraticCurveTo(
                    64 + Math.cos(angle) * dist * 0.5,
                    64 + Math.sin(angle) * dist * 0.5,
                    dx, dy
                );
                ctx.stroke();
            }

            const tex = new THREE.CanvasTexture(canvas);
            textures.push(tex);
        }
        return textures;
    }

    toggle() {
        this.isActive = !this.isActive;
        if (window.NeuralConsole) {
            window.NeuralConsole.log(`[DECAL_SYSTEM]: PAINT MODE ${this.isActive ? 'ENABLED' : 'DISABLED'}`, 'sys');
        }
        const crosshair = document.getElementById('crosshair');
        if (crosshair) {
            if (this.isActive) {
                crosshair.style.borderColor = '#' + this.colors[this.currentColorIdx].hex.toString(16).padStart(6, '0');
            } else {
                crosshair.style.borderColor = '';
            }
        }
        if (window.AudioSynth) {
            window.AudioSynth.playClick(this.isActive ? 600 : 300, 0.1);
        }
        return this.isActive;
    }

    cycleColor() {
        this.currentColorIdx = (this.currentColorIdx + 1) % this.colors.length;
        const color = this.colors[this.currentColorIdx];
        if (window.NeuralConsole) {
            window.NeuralConsole.log(`[DECAL_SYSTEM]: CYCLE COLOR -> ${color.name.toUpperCase()}`, 'res');
        }
        const crosshair = document.getElementById('crosshair');
        if (crosshair && this.isActive) {
            crosshair.style.borderColor = '#' + color.hex.toString(16).padStart(6, '0');
        }
        if (window.AudioSynth) {
            window.AudioSynth.playClick(400 + this.currentColorIdx * 60, 0.08);
        }
    }

    spray(raycaster) {
        if (!this.isActive) return;

        // Perform raycast check against scene meshes
        const intersects = raycaster.intersectObjects(this.scene.children, true);
        if (intersects.length === 0) return;

        // Find first valid hit
        const hit = intersects.find(intersect => {
            // Avoid intersecting with player, items, or already existing decals
            const name = intersect.object.name || '';
            if (name.includes('decal') || name.includes('player') || name.includes('weapon') || name.includes('Aegis')) return false;
            return true;
        });

        if (!hit) return;

        const point = hit.point;
        const normal = hit.face.normal.clone().applyQuaternion(hit.object.quaternion);

        // Spawn a splatter decal
        const size = 0.6 + Math.random() * 0.8;
        const geo = new THREE.PlaneGeometry(size, size);
        
        const color = this.colors[this.currentColorIdx];
        const tex = this.splatterTextures[Math.floor(Math.random() * this.splatterTextures.length)];

        const mat = new THREE.MeshStandardMaterial({
            color: color.hex,
            emissive: color.hex,
            emissiveIntensity: 1.5,
            alphaMap: tex,
            transparent: true,
            depthWrite: false, // Prevent z-fighting
            roughness: 0.5,
            metalness: 0.1
        });

        const decalMesh = new THREE.Mesh(geo, mat);
        decalMesh.name = 'paint_decal';
        
        // Offset slightly along normal to prevent z-fighting
        decalMesh.position.copy(point).addScaledVector(normal, 0.015);
        
        // Align to face normal
        decalMesh.lookAt(decalMesh.position.clone().add(normal));

        // Add to scene and tracking list
        this.scene.add(decalMesh);
        this.decals.push(decalMesh);

        // Emit paint mist particles
        for (let i = 0; i < 8; i++) {
            const vel = normal.clone().add(new THREE.Vector3(
                (Math.random() - 0.5) * 0.6,
                (Math.random() - 0.5) * 0.6,
                (Math.random() - 0.5) * 0.6
            )).normalize().multiplyScalar(2.0 + Math.random() * 3.0);
            
            const r = ((color.hex >> 16) & 255) / 255;
            const g = ((color.hex >> 8) & 255) / 255;
            const b = (color.hex & 255) / 255;

            emitParticle(
                point.x, point.y, point.z,
                vel.x, vel.y, vel.z,
                r, g, b,
                3 + Math.random() * 3,
                0.2
            );
        }

        // Culling oldest decals
        if (this.decals.length > this.maxDecals) {
            const old = this.decals.shift();
            this.scene.remove(old);
        }

        if (window.AudioSynth) {
            window.AudioSynth.playClick(800 + Math.random() * 200, 0.04);
        }
    }
}
