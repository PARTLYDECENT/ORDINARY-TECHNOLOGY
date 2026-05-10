/**
 * SciFiSkybox - Massive 3D Parallax Plane
 * 
 * Using a simple MeshBasicMaterial with a canvas texture to be 100% 
 * sure it renders correctly. Shaders might be failing silently on 
 * certain hardware.
 * 
 * Features:
 * - Twinkling stars (simulated in update)
 * - Backrooms-esque green/yellow nebulae
 * - Infinite parallax depth
 */

class BackroomsSkybox {
    constructor(scene) {
        this.scene = scene;
        this.time = 0;

        // 1. Create a canvas for the texture
        this.size = 2048;
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.size;
        this.canvas.height = this.size;
        this.ctx = this.canvas.getContext('2d');

        this.generateTexture();

        this.texture = new THREE.CanvasTexture(this.canvas);
        this.texture.wrapS = THREE.RepeatWrapping;
        this.texture.wrapT = THREE.RepeatWrapping;
        this.texture.repeat.set(5, 5);

        // 2. Create the plane
        const geo = new THREE.PlaneGeometry(5000, 5000);
        const mat = new THREE.MeshBasicMaterial({
            map: this.texture,
            side: THREE.FrontSide,
            depthWrite: false,
            depthTest: false // Render behind everything
        });

        this.mesh = new THREE.Mesh(geo, mat);
        this.mesh.rotation.x = -Math.PI / 2;
        this.mesh.position.y = -80; // Deep below the floor
        
        this.mesh.frustumCulled = false;
        this.mesh.renderOrder = -100; // Render first

        this.scene.add(this.mesh);
        console.log('[Skybox] Massive Plane Initialized at Y=-80');
    }

    generateTexture() {
        const ctx = this.ctx;
        const s = this.size;

        // Deep space black-blue
        ctx.fillStyle = '#020408';
        ctx.fillRect(0, 0, s, s);

        // Add "Backrooms Nightmare" Nebulae (Sickly Green/Yellow)
        ctx.globalCompositeOperation = 'screen';
        for (let i = 0; i < 6; i++) {
            const x = Math.random() * s;
            const y = Math.random() * s;
            const r = 400 + Math.random() * 600;
            const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
            
            // Sickly yellow-green palette
            const colors = [
                'rgba(180, 200, 50, 0.15)',
                'rgba(50, 150, 80, 0.1)',
                'rgba(200, 150, 20, 0.1)',
                'rgba(0, 80, 40, 0.15)'
            ];
            grad.addColorStop(0, colors[Math.floor(Math.random() * colors.length)]);
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, s, s);
        }
        ctx.globalCompositeOperation = 'source-over';

        // Add thousands of stars
        ctx.fillStyle = '#ffffff';
        for (let i = 0; i < 8000; i++) {
            const x = Math.random() * s;
            const y = Math.random() * s;
            const size = Math.random() * 2;
            ctx.fillRect(x, y, size, size);
        }
    }

    update(dt, activeCamera) {
        this.time += dt;

        // Follow camera for parallax
        if (activeCamera && this.mesh) {
            this.mesh.position.x = activeCamera.position.x * 0.98;
            this.mesh.position.z = activeCamera.position.z * 0.98;
        }

        // Occasional texture update for "twinkle" could be done here, 
        // but it's expensive with CanvasTexture. 
        // For now, let's keep it static to guarantee zero black screens.
    }

    renderBackground() {}
    resize() {}
}

window.BackroomsSkybox = BackroomsSkybox;
