/**
 * SolarFlare — Biomorphic Procedural Point-Cloud/SDF Matrix Energy Launcher (Gamma Ray Burst)
 * Redesigned from mechanical meshes to a singular color-shifting fluid point-cloud matrix.
 */
class SolarFlare extends THREE.Group {
    constructor() {
        super();
        this.name = "procedural_solar_flare";

        // State variables
        this.time = 0;
        this.recoil = 0;
        this.firePulse = 0;

        this.INSTANCE_COUNT = 1200;
        this.particles = [];
        this.smoothPositions = [];
        this.dummy = new THREE.Object3D();
        this.colorObj = new THREE.Color();

        this.buildFlare();
    }

    buildFlare() {
        // 1. Setup InstancedMesh using small Dodecahedrons for high-fidelity cybernetic SDF feel
        const geometry = new THREE.DodecahedronGeometry(0.015, 0);
        
        // PBR Material with emissive capability that scales with instance colors
        const material = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.15,
            metalness: 0.95,
            emissive: 0xffffff,
            emissiveIntensity: 1.5,
            transparent: false,
            wireframe: false
        });

        this.instancedMesh = new THREE.InstancedMesh(geometry, material, this.INSTANCE_COUNT);
        this.instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        this.add(this.instancedMesh);

        // 2. Pre-calculate targets for different functional sections of the Gamma Ray gun
        const barrelCount = 400;     // Front cylinder representing electromagnetic acceleration barrel
        const receiverCount = 400;   // Central power core block
        const stockCount = 250;      // Rear recoil absorption stock
        const gripCount = 150;       // Lower control grip

        for (let i = 0; i < this.INSTANCE_COUNT; i++) {
            let basePos = new THREE.Vector3();
            let partId = 0; // 0=barrel, 1=receiver, 2=stock, 3=grip

            if (i < barrelCount) {
                // Barrel: Cylinder centered along Z (extending forward to Z = -2.0)
                const theta = Math.random() * Math.PI * 2;
                const r = Math.sqrt(Math.random()) * 0.075;
                const z = -2.0 + Math.random() * 2.1;
                basePos.set(r * Math.cos(theta), 0.1 + r * Math.sin(theta), z);
                partId = 0;
            } else if (i < barrelCount + receiverCount) {
                // Receiver: Chunky central frame
                const x = (Math.random() - 0.5) * 0.18;
                const y = 0.05 + (Math.random() - 0.5) * 0.22;
                const z = 0.1 + (Math.random() - 0.5) * 0.8;
                basePos.set(x, y, z);
                partId = 1;
            } else if (i < barrelCount + receiverCount + stockCount) {
                // Stock: Sleek stabilizer plate
                const x = (Math.random() - 0.5) * 0.1;
                const y = 0.05 + (Math.random() - 0.5) * 0.16;
                const z = 0.9 + (Math.random() - 0.5) * 0.6;
                basePos.set(x, y, z);
                partId = 2;
            } else {
                // Grip: Ergonometric control link
                const x = (Math.random() - 0.5) * 0.08;
                const y = -0.22 + (Math.random() - 0.5) * 0.3;
                const z = 0.4 + (Math.random() - 0.5) * 0.1 - y * 0.22; // angled backward
                basePos.set(x, y, z);
                partId = 3;
            }

            this.particles.push({
                basePos: basePos,
                partId: partId,
                offset: Math.random() * Math.PI * 2,
                speed: 1.0 + Math.random() * 2.0,
                scaleOffset: Math.random()
            });

            this.smoothPositions.push(new THREE.Vector3().copy(basePos));
        }
    }

    fire(isADS = false) {
        // Energize recoil states
        this.recoil = 0.65;
        this.firePulse = 1.0;

        // Slow down time globally for 1.5 seconds!
        window.gammaRayTimeSlowTimer = 1.5;

        // Play the punchy energetic sub-bass blast sound
        this.playProceduralShot();
    }

    playProceduralShot() {
        if (!window.audioCtx) window.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const ctx = window.audioCtx;
        if (ctx.state === 'suspended') ctx.resume();

        const t = ctx.currentTime;

        // Layer 1: High frequency pitch drop (electromagnetic whine)
        const osc1 = ctx.createOscillator();
        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(2200, t);
        osc1.frequency.exponentialRampToValueAtTime(80, t + 0.35);
        const g1 = ctx.createGain();
        g1.gain.setValueAtTime(0.35, t);
        g1.gain.exponentialRampToValueAtTime(0.001, t + 0.38);
        osc1.connect(g1); g1.connect(ctx.destination);
        osc1.start(t); osc1.stop(t + 0.4);

        // Layer 2: Massive Sub-bass impact thud
        const osc2 = ctx.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(110, t);
        osc2.frequency.exponentialRampToValueAtTime(25, t + 0.55);
        const g2 = ctx.createGain();
        g2.gain.setValueAtTime(0.75, t);
        g2.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
        osc2.connect(g2); g2.connect(ctx.destination);
        osc2.start(t); osc2.stop(t + 0.65);
    }

    update(dt) {
        this.time += dt;

        // Decay recoil and firing pulse
        this.recoil = Math.max(0, this.recoil - dt * 5.0);
        this.firePulse = Math.max(0, this.firePulse - dt * 2.5);

        for (let i = 0; i < this.INSTANCE_COUNT; i++) {
            const p = this.particles[i];
            let targetPos = new THREE.Vector3().copy(p.basePos);

            // Apply recoil kickback & structural displacement
            if (this.recoil > 0.01) {
                if (p.partId === 0) {
                    // Barrel ripples and expands outwards
                    targetPos.z += this.recoil * 0.16;
                    targetPos.x += (Math.random() - 0.5) * this.recoil * 0.06;
                    targetPos.y += (Math.random() - 0.5) * this.recoil * 0.06;
                } else {
                    targetPos.z += this.recoil * 0.06;
                }
            }

            // Procedural fluid-wave matrix warping (wobble along the length of the rifle)
            const waveSpeed = 6.0;
            const waveFreq = 5.0;
            const waveIntensity = 0.008 + this.firePulse * 0.024;
            const wave = Math.sin(this.time * waveSpeed + p.basePos.z * waveFreq) * waveIntensity;
            
            targetPos.x += wave * Math.cos(p.offset);
            targetPos.y += wave * Math.sin(p.offset);

            // Smoothly interpolate positions to prevent pixel jitter or snaps
            const lerpFactor = Math.min(1.0, dt * 18.0);
            this.smoothPositions[i].lerp(targetPos, lerpFactor);
            this.dummy.position.copy(this.smoothPositions[i]);

            // Gentle continuous orbital spin for nodes
            this.dummy.rotation.x = this.time * 0.4 + p.offset;
            this.dummy.rotation.y = this.time * 0.35 + p.offset * 0.5;

            // Fluid scale changes
            let scale = 0.65 + Math.sin(this.time * 3.5 + p.scaleOffset * Math.PI * 2) * 0.08;
            if (this.firePulse > 0.01) {
                scale += this.firePulse * 0.4;
            }
            this.dummy.scale.set(scale, scale, scale);

            this.dummy.updateMatrix();
            this.instancedMesh.setMatrixAt(i, this.dummy.matrix);

            // Solid color-changing, ever-changing and fluid matrix!
            // Cycles hue over time with spatial wave offsets flowing forward
            const hue = (this.time * 0.14 - p.basePos.z * 0.08) % 1.0;
            let lightness = 0.52;
            if (this.firePulse > 0.01) {
                // Intense white-hot cosmic discharge flash
                lightness = Math.min(0.96, 0.52 + this.firePulse * 0.44);
            }
            this.colorObj.setHSL(hue, 1.0, lightness);
            this.instancedMesh.setColorAt(i, this.colorObj);
        }

        this.instancedMesh.instanceMatrix.needsUpdate = true;
        if (this.instancedMesh.instanceColor) {
            this.instancedMesh.instanceColor.needsUpdate = true;
        }
    }
}

window.SolarFlare = SolarFlare;
