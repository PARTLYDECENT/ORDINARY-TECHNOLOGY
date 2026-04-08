/**
 * True 3D Procedural Shotgun - Mechanical Viewmodel Component
 * Features: Realistic pump action, shell ejection, and physics.
 */
class Shotgun extends THREE.Group {
    constructor() {
        super();
        this.name = "procedural_shotgun";

        // Animation states
        this.pumpZ = 0;
        this.targetPumpZ = 0;
        this.gunPitch = 0;
        this.gunZ = 0;
        this.triggerZ = -0.3;
        this.lightIntensity = 0;
        this.isPumping = false;

        // Particle pools
        this.shells = [];

        // Materials modeled after SDF shading
        this.metalMat = new THREE.MeshStandardMaterial({ color: 0x191e26, roughness: 0.25, metalness: 0.9 });
        this.woodMat = new THREE.MeshStandardMaterial({ color: 0x471e0c, roughness: 0.6, metalness: 0.0 });
        this.polyMat = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.9, metalness: 0.0 });
        this.brassMat = new THREE.MeshStandardMaterial({ color: 0xb5943b, metalness: 0.8, roughness: 0.2 });
        this.redShellMat = new THREE.MeshStandardMaterial({ color: 0xaa1111, roughness: 0.5 }); // Red shotgun hull
        
        this.buildShotgun();
    }

    buildShotgun() {
        // --- 1. RECEIVER (Metal) ---
        this.receiverGroup = new THREE.Group();
        this.add(this.receiverGroup);

        const receiverGeo = new THREE.BoxGeometry(0.28, 0.56, 1.6);
        const receiver = new THREE.Mesh(receiverGeo, this.metalMat);
        receiver.position.set(0, 0, 0);
        receiver.castShadow = true;
        this.receiverGroup.add(receiver);

        // Loading Port Cutout (Darkened visual trick inside receiver bounds)
        const loadPort = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.6), new THREE.MeshBasicMaterial({color: 0x000000}));
        loadPort.position.set(0, -0.25, -0.2);
        this.receiverGroup.add(loadPort);

        // Ejection Port (Right side)
        const ejectPort = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.16, 0.5), new THREE.MeshBasicMaterial({color: 0x050505}));
        ejectPort.position.set(0.13, 0.1, -0.15);
        this.receiverGroup.add(ejectPort);

        // --- 2. BARREL & MAG TUBE ---
        const barrelGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.8, 16);
        const barrel = new THREE.Mesh(barrelGeo, this.metalMat);
        barrel.rotation.x = Math.PI / 2;
        barrel.position.set(0, 0.2, -2.1);
        this.receiverGroup.add(barrel);

        const magGeo = new THREE.CylinderGeometry(0.09, 0.09, 2.2, 16);
        const mag = new THREE.Mesh(magGeo, this.metalMat);
        mag.rotation.x = Math.PI / 2;
        mag.position.set(0, -0.02, -1.8);
        this.receiverGroup.add(mag);

        // Underbarrel Clamp
        const clampGeo = new THREE.BoxGeometry(0.2, 0.32, 0.2);
        const clamp = new THREE.Mesh(clampGeo, this.metalMat);
        clamp.position.set(0, 0.09, -2.6);
        this.receiverGroup.add(clamp);

        // Bead Sight
        const sightGeo = new THREE.SphereGeometry(0.025, 8, 8);
        const sight = new THREE.Mesh(sightGeo, this.brassMat);
        sight.position.set(0, 0.3, -3.4);
        this.receiverGroup.add(sight);

        // --- 3. WOODEN STOCK ---
        this.stockGroup = new THREE.Group();
        this.add(this.stockGroup);

        // Grip section
        const gripGeo = new THREE.BoxGeometry(0.15, 0.28, 0.3);
        const grip = new THREE.Mesh(gripGeo, this.woodMat);
        grip.rotation.x = Math.PI * 0.18; // Slight angle out backward
        grip.position.set(0, -0.15, 0.95);
        this.stockGroup.add(grip);

        // Rear stock section
        const rearGeo = new THREE.BoxGeometry(0.09, 0.24, 0.8);
        const rear = new THREE.Mesh(rearGeo, this.woodMat);
        rear.rotation.x = -0.05;
        rear.position.set(0, -0.05, 1.4);
        this.stockGroup.add(rear);
        
        // Stock Connector
        const conn = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.32, 0.2), this.woodMat);
        conn.position.set(0, 0.05, 0.85);
        this.stockGroup.add(conn);

        // Buttpad
        const padGeo = new THREE.BoxGeometry(0.10, 0.25, 0.04);
        const pad = new THREE.Mesh(padGeo, this.polyMat);
        pad.rotation.x = -0.05;
        pad.position.set(0, -0.09, 1.82);
        this.stockGroup.add(pad);

        // --- 4. WOODEN PUMP (Dynamic) ---
        this.pumpGroup = new THREE.Group();
        this.add(this.pumpGroup);

        const pumpGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.7, 16);
        const pump = new THREE.Mesh(pumpGeo, this.woodMat);
        pump.rotation.x = Math.PI / 2;
        pump.position.set(0, -0.02, -1.5);
        this.pumpGroup.add(pump);
        
        // --- 5. TRIGGER & GUARD ---
        const guardGeo = new THREE.BoxGeometry(0.08, 0.2, 0.3);
        const guardOuter = new THREE.Mesh(guardGeo, this.metalMat);
        guardOuter.position.set(0, -0.3, 0.2);
        this.add(guardOuter);
        // Cutout visual
        const guardInner = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.16, 0.24), new THREE.MeshBasicMaterial({color: 0x000000}));
        guardInner.position.set(0, -0.28, 0.2);
        this.add(guardInner);

        this.triggerMesh = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.16, 0.04), new THREE.MeshStandardMaterial({ color: 0x222222 }));
        this.triggerMesh.rotation.x = -0.2;
        this.triggerMesh.position.set(0, -0.25, 0.15);
        this.add(this.triggerMesh);

        // --- 6. MUZZLE GLOW ---
        this.muzzleLight = new THREE.PointLight(0xffaa00, 0, 5);
        this.muzzleLight.position.set(0, 0.2, -3.6);
        this.add(this.muzzleLight);
    }

    fire() {
        if (this.isPumping) return;
        
        this.gunPitch = 0.5; // High kick for shotgun
        this.gunZ = 0.4;
        this.triggerZ = -0.25;
        this.lightIntensity = 5.0; // Brighter flash
        
        // Wait briefly, then auto-pump
        setTimeout(() => this.triggerPumpAction(), 250);
    }

    triggerPumpAction() {
        this.isPumping = true;
        this.targetPumpZ = 0.4; // Pull pump backward
        
        // Procedural shotgun pump sound 1
        this.playPumpSound(600, 200, 0.08);

        // Eject shell mechanically exactly as the pump bottoms out
        setTimeout(() => {
            this.spawnShell();
            
            // Push pump forward
            this.targetPumpZ = 0.0;
            this.playPumpSound(800, 300, 0.08);
            
            setTimeout(() => {
                this.isPumping = false;
            }, 100);
        }, 150);
    }

    spawnShell() {
        // Shotgun shell has a brass casing and red plastic hull
        const shell = new THREE.Group();
        
        const hull = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.18, 8), this.redShellMat);
        hull.position.set(0, 0, 0);
        shell.add(hull);
        
        const brass = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.06, 8), this.brassMat);
        brass.position.set(0, -0.06, 0);
        shell.add(brass);
        
        shell.rotation.x = Math.PI / 2; // Lie flat

        // Eject out of the right ejection port
        const worldPos = new THREE.Vector3(0.2, 0.1, -0.15);
        worldPos.applyMatrix4(this.matrixWorld);
        shell.position.copy(worldPos);
        shell.rotation.set(Math.random(), Math.random(), Math.random());
        
        if (this.parent) this.parent.add(shell);
        else window.scene.add(shell);

        this.shells.push({
            mesh: shell,
            vx: (0.15 + Math.random() * 0.1) * (this.scale.x || 1) * 8, // Fast horizontal ejection
            vy: (0.1 + Math.random() * 0.1) * (this.scale.y || 1) * 5,
            vz: (0.05 + Math.random() * 0.05) * (this.scale.z || 1) * 5, // Slightly backward
            rx: Math.random() * 0.8,
            ry: Math.random() * 0.8,
            rz: Math.random() * 0.8,
            life: 2.0
        });
    }

    playPumpSound(f1, f2, dur) {
        if (!window.audioCtx) return;
        const ctx = window.audioCtx;
        if (ctx.state === 'suspended') ctx.resume();

        const t = ctx.currentTime;
        const osc = ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.setValueAtTime(f1, t);
        osc.frequency.exponentialRampToValueAtTime(f2, t + dur);
        
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.2, t + dur/2);
        gain.gain.exponentialRampToValueAtTime(0.01, t + dur);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + dur + 0.05);
    }

    update(dt) {
        // Animation Lerping
        this.pumpZ += (this.targetPumpZ - this.pumpZ) * 20 * dt;
        this.gunPitch += (0 - this.gunPitch) * 12 * dt;
        this.gunZ += (0 - this.gunZ) * 12 * dt;
        
        // Trigger resets linearly
        this.triggerZ += (-0.3 - this.triggerZ) * 15 * dt;
        this.lightIntensity = Math.max(0, this.lightIntensity - 35 * dt);

        this.pumpGroup.position.z = this.pumpZ;
        this.muzzleLight.intensity = this.lightIntensity;

        // Shell Physics
        for (let i = this.shells.length - 1; i >= 0; i--) {
            const s = this.shells[i];
            s.vy -= 9.8 * dt * 0.5; // Gravity
            s.mesh.position.x += s.vx * dt;
            s.mesh.position.y += s.vy * dt;
            s.mesh.position.z += s.vz * dt;
            s.mesh.rotation.x += s.rx;
            s.mesh.rotation.y += s.ry;
            s.mesh.rotation.z += s.rz;
            s.life -= dt;
            if (s.life <= 0) {
                if (s.mesh.parent) s.mesh.parent.remove(s.mesh);
                this.shells.splice(i, 1);
            }
        }
    }
}

window.Shotgun = Shotgun;
