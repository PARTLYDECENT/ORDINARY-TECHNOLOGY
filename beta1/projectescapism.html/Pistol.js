/**
 * True 3D Procedural Handgun - Mechanical Viewmodel Component
 * Features: Slide blowback, muzzle flash light, and physical shell ejection.
 */
class Pistol extends THREE.Group {
    constructor() {
        super();
        this.name = "procedural_pistol";

        // Animation states
        this.slideZ = 0;
        this.gunPitch = 0;
        this.gunZ = 0;
        this.triggerZ = -0.35;
        this.lightIntensity = 0;

        // Particle pools
        this.shells = [];
        this.tracers = [];

        // Materials
        this.polyMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8, metalness: 0.2 });
        this.metalMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4, metalness: 0.7 });
        this.barrelMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.3, metalness: 0.9 });
        this.brassMat = new THREE.MeshStandardMaterial({ color: 0xb5943b, metalness: 0.8, roughness: 0.2 });
        this.dotMat = new THREE.MeshBasicMaterial({ color: 0x00ff00 });

        this.buildPistol();
    }

    buildPistol() {
        // --- A. Lower Frame & Grip ---
        const frameGroup = new THREE.Group();
        this.add(frameGroup);

        const gripGeo = new THREE.BoxGeometry(0.3, 1.2, 0.5);
        const grip = new THREE.Mesh(gripGeo, this.polyMat);
        grip.position.set(0, -0.6, 0.2);
        grip.rotation.x = Math.PI * 0.1;
        grip.castShadow = true;
        frameGroup.add(grip);

        const receiverGeo = new THREE.BoxGeometry(0.32, 0.25, 1.6);
        const receiver = new THREE.Mesh(receiverGeo, this.polyMat);
        receiver.position.set(0, 0.1, -0.2);
        receiver.castShadow = true;
        frameGroup.add(receiver);

        const gBottom = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, 0.4), this.polyMat);
        gBottom.position.set(0, -0.3, -0.4);
        const gFront = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.4, 0.05), this.polyMat);
        gFront.position.set(0, -0.1, -0.575);
        frameGroup.add(gBottom, gFront);

        this.triggerMesh = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.2, 0.05), new THREE.MeshStandardMaterial({ color: 0x111111 }));
        this.triggerMesh.position.set(0, -0.1, -0.35);
        frameGroup.add(this.triggerMesh);

        const barrelGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.6, 16);
        const barrel = new THREE.Mesh(barrelGeo, this.barrelMat);
        barrel.rotation.x = Math.PI / 2;
        barrel.position.set(0, 0.35, -0.2);
        frameGroup.add(barrel);

        // --- B. Upper Slide (Blowback) ---
        this.slideGroup = new THREE.Group();
        this.add(this.slideGroup);

        const slideTop = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.08, 1.6), this.metalMat);
        slideTop.position.set(0, 0.5, -0.2);
        this.slideGroup.add(slideTop);

        const slideLeft = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.25, 1.6), this.metalMat);
        slideLeft.position.set(-0.145, 0.35, -0.2);
        this.slideGroup.add(slideLeft);

        const slideRightFront = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.25, 0.8), this.metalMat);
        slideRightFront.position.set(0.145, 0.35, -0.6);
        this.slideGroup.add(slideRightFront);

        const slideRightBack = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.25, 0.5), this.metalMat);
        slideRightBack.position.set(0.145, 0.35, 0.35);
        this.slideGroup.add(slideRightBack);

        // Lights / Sights
        const rearSight = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.08, 0.1), new THREE.MeshStandardMaterial({ color: 0x111111 }));
        rearSight.position.set(0, 0.55, 0.5);
        this.slideGroup.add(rearSight);

        const frontSight = rearSight.clone();
        frontSight.scale.set(0.3, 1, 1);
        frontSight.position.set(0, 0.55, -0.9);
        this.slideGroup.add(frontSight);

        // Muzzle Glow Point
        this.muzzleLight = new THREE.PointLight(0xffaa00, 0, 5);
        this.muzzleLight.position.set(0, 0.35, -1.2);
        this.add(this.muzzleLight);
    }

    fire() {
        this.slideZ = 0.5;
        this.gunPitch = 0.3;
        this.gunZ = 0.2;
        this.triggerZ = -0.32;
        this.lightIntensity = 3.0;

        // Eject Shell
        this.spawnShell();
        
        // Procedural Audio (Optional layering)
        this.playProceduralShot();
    }

    spawnShell() {
        const shellGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.15, 8);
        const shell = new THREE.Mesh(shellGeo, this.brassMat);
        
        // World positioning from ejection port
        const worldPos = new THREE.Vector3(0.2, 0.4, 0.1);
        worldPos.applyMatrix4(this.matrixWorld);
        shell.position.copy(worldPos);
        shell.rotation.set(Math.random(), Math.random(), Math.random());
        
        if (this.parent) this.parent.add(shell); // Eject into parent (hand/scene)
        else window.scene.add(shell);

        this.shells.push({
            mesh: shell,
            vx: (0.1 + Math.random() * 0.1) * (this.scale.x || 1) * 5,
            vy: (0.15 + Math.random() * 0.1) * (this.scale.y || 1) * 5,
            vz: (Math.random() * 0.05) * (this.scale.z || 1),
            rx: Math.random() * 0.5,
            ry: Math.random() * 0.5,
            rz: Math.random() * 0.5,
            life: 1.5
        });
    }

    playProceduralShot() {
        if (!window.audioCtx) window.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const ctx = window.audioCtx;
        if (ctx.state === 'suspended') ctx.resume();

        const t = ctx.currentTime;
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(120, t);
        osc.frequency.exponentialRampToValueAtTime(40, t + 0.1);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.5, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.2);
    }

    update(dt) {
        // Animation Lerping
        this.slideZ += (0 - this.slideZ) * 20 * dt;
        this.gunPitch += (0 - this.gunPitch) * 15 * dt;
        this.gunZ += (0 - this.gunZ) * 15 * dt;
        this.triggerZ += (-0.35 - this.triggerZ) * 20 * dt;
        this.lightIntensity = Math.max(0, this.lightIntensity - 30 * dt);

        this.slideGroup.position.z = this.slideZ;
        this.triggerMesh.position.z = this.triggerZ;
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
            s.life -= dt;
            if (s.life <= 0) {
                if (s.mesh.parent) s.mesh.parent.remove(s.mesh);
                this.shells.splice(i, 1);
            }
        }
    }
}

window.Pistol = Pistol;
