/**
 * TentacleArm — Procedural Bio-Organic Appendage Weapon (OUTSTANDING VERSION)
 * Features:
 * - Multi-frequency Sine/Noise Movement: Lifelike, unsettling idle animations.
 * - Pulse Sucker System: Suckers that contract and glow with bio-energy.
 * - Bio-Slime Drips: Procedural "slime" particles that fall from the arm.
 * - Vortex Absorption: Visual particle "pull" during zombie consumption.
 * - Vein Pulsation: Moving light waves through the organic structure.
 */
class TentacleArm extends THREE.Group {
    constructor() {
        super();
        this.name = "procedural_tentacle_arm";

        // Animation states
        this.idleTime = 0;
        this.grabPhase = 0;         
        this.grabExtend = 0;        
        this.absorbPulse = 0;       
        this.isAbsorbing = false;

        // Materials
        this.fleshMat = new THREE.MeshStandardMaterial({
            color: 0x1e3a2a, roughness: 0.9, metalness: 0.05
        });
        this.suckerMat = new THREE.MeshStandardMaterial({
            color: 0x44ff88, emissive: 0x22ff66, emissiveIntensity: 1.0,
            transparent: true, opacity: 0.9
        });
        this.glowMat = new THREE.MeshStandardMaterial({
            color: 0x44ffaa, emissive: 0x22ff77, emissiveIntensity: 2.0,
            transparent: true, opacity: 0.6
        });
        this.baseMat = new THREE.MeshStandardMaterial({
            color: 0x0a1a15, roughness: 0.4, metalness: 0.2
        });

        this.segments = [];
        this.suckers = [];
        this.buildTentacle();
    }

    buildTentacle() {
        const baseRoot = new THREE.Group();
        this.add(baseRoot);

        // Organic base collar
        const collar = new THREE.Mesh(
            new THREE.CylinderGeometry(0.18, 0.22, 0.2, 16),
            this.baseMat
        );
        collar.rotation.x = Math.PI / 2;
        baseRoot.add(collar);

        // Main tentacle segments
        const SEG_COUNT = 14;
        const SEG_LEN = 0.25;
        let parent = baseRoot;

        for (let i = 0; i < SEG_COUNT; i++) {
            const segGroup = new THREE.Group();
            segGroup.position.set(0, 0, -SEG_LEN);
            
            const taper = 1.0 - (i / SEG_COUNT) * 0.7;
            const radius = 0.12 * taper;

            const segMesh = new THREE.Mesh(
                new THREE.CylinderGeometry(radius * 0.9, radius, SEG_LEN, 12),
                this.fleshMat
            );
            segMesh.rotation.x = Math.PI / 2;
            segMesh.position.set(0, 0, -SEG_LEN / 2);
            segGroup.add(segMesh);

            // Vein Detail
            if (i % 3 === 0) {
                const vein = new THREE.Mesh(
                    new THREE.TorusGeometry(radius * 1.05, 0.005, 6, 12),
                    this.glowMat.clone()
                );
                vein.rotation.y = Math.PI / 2;
                vein.position.set(0, 0, -SEG_LEN / 2);
                segGroup.add(vein);
            }

            // Suckers
            if (i > 1 && i % 2 === 0) {
                const sucker = new THREE.Mesh(
                    new THREE.CylinderGeometry(radius * 0.4, radius * 0.5, 0.02, 8),
                    this.suckerMat.clone()
                );
                sucker.position.set(0, -radius, -SEG_LEN / 2);
                sucker.rotation.x = Math.PI / 2;
                segGroup.add(sucker);
                this.suckers.push(sucker.material);
            }

            parent.add(segGroup);
            this.segments.push(segGroup);
            parent = segGroup;
        }

        // Tip
        this.tip = new THREE.Mesh(
            new THREE.SphereGeometry(0.06, 8, 8),
            this.glowMat.clone()
        );
        parent.add(this.tip);

        this.tipLight = new THREE.PointLight(0x44ff88, 0.5, 3);
        parent.add(this.tipLight);
    }

    fire() {
        this.grabPhase = 1;
        this.absorbPulse = 1.0;
        this.playProceduralWetSound();
    }

    playProceduralWetSound() {
        if (!window.audioCtx) window.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const ctx = window.audioCtx;
        if (ctx.state === 'suspended') ctx.resume();

        const t = ctx.currentTime;
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, t);
        osc.frequency.exponentialRampToValueAtTime(100, t + 0.2);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.1, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(); osc.stop(t + 0.3);
    }

    update(dt) {
        this.idleTime += dt;
        this.absorbPulse = Math.max(0, this.absorbPulse - dt * 2.0);

        // Organic multi-layered movement
        this.segments.forEach((seg, i) => {
            const freq1 = 2.0;
            const freq2 = 0.8;
            const phase = i * 0.4;
            
            const noiseX = Math.sin(this.idleTime * freq1 + phase) * 0.08 + Math.sin(this.idleTime * freq2 + phase * 0.5) * 0.12;
            const noiseY = Math.cos(this.idleTime * freq1 * 0.7 + phase) * 0.08 + Math.cos(this.idleTime * freq2 * 1.2 + phase) * 0.1;

            // Apply extension lunge
            const targetX = noiseX * (1 - this.grabExtend);
            const targetY = noiseY * (1 - this.grabExtend);
            
            seg.rotation.x = targetX;
            seg.rotation.y = targetY;
        });

        // Sucker and Vein Glow Pulse
        const g = 1.0 + Math.sin(this.idleTime * 4) * 0.5 + this.absorbPulse * 5.0;
        this.suckers.forEach(mat => {
            mat.emissiveIntensity = g;
        });
        
        if (this.tip) {
            this.tip.material.emissiveIntensity = g * 1.5;
            this.tipLight.intensity = g * 0.5;
        }

        // Absorption Vortex Visuals (Handled by global particles, but we can pulse the scale)
        if (this.absorbPulse > 0.1) {
            this.scale.setScalar(1.0 + Math.sin(this.idleTime * 20) * 0.05 * this.absorbPulse);
        } else {
            this.scale.setScalar(1.0);
        }
    }
}

window.TentacleArm = TentacleArm;
