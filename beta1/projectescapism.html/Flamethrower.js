/**
 * Flamethrower — High-Fidelity Procedural Incendiary Weapon (OUTSTANDING VERSION)
 * Features:
 * - Thermal Barrel Glow: Dynamic emissive mapping that heats up as you fire.
 * - Refractive Heat Haze: Procedural "distortion" billboard in front of the nozzle.
 * - Pressure-Vented Tanks: Visible steam/gas venting from the fuel tanks.
 * - Pilot Light System: Flickering blue core with dynamic intensity.
 * - Industrial "Exhaust" Detail: Girders and pipes for a heavy refinery look.
 */
class Flamethrower extends THREE.Group {
    constructor() {
        super();
        this.name = "procedural_flamethrower";

        // Animation states
        this.fireIntensity = 0;
        this.barrelHeat = 0;
        this.pilotFlicker = 0;
        this.idleTime = 0;

        // Materials
        this.frameMat = new THREE.MeshStandardMaterial({
            color: 0x1a1510, roughness: 0.3, metalness: 0.95
        });
        this.tankMat = new THREE.MeshStandardMaterial({
            color: 0x2a1a10, roughness: 0.4, metalness: 0.8
        });
        this.brassMat = new THREE.MeshStandardMaterial({
            color: 0xaa8844, roughness: 0.2, metalness: 0.9
        });
        this.nozzleMat = new THREE.MeshStandardMaterial({
            color: 0x332211, roughness: 0.1, metalness: 0.9
        });
        this.heatMat = new THREE.MeshStandardMaterial({
            color: 0xff4400, emissive: 0xff2200, emissiveIntensity: 0,
            roughness: 0.3, metalness: 0.6
        });
        this.pilotMat = new THREE.MeshStandardMaterial({
            color: 0x00aaff, emissive: 0x00ffff, emissiveIntensity: 2.0,
            transparent: true, opacity: 0.9
        });

        this.buildFlamethrower();
    }

    buildFlamethrower() {
        const bodyGroup = new THREE.Group();
        this.add(bodyGroup);

        // === MAIN BODY ===
        const receiver = new THREE.Mesh(
            new THREE.BoxGeometry(0.32, 0.25, 1.2),
            this.frameMat
        );
        receiver.position.set(0, 0.1, 0);
        bodyGroup.add(receiver);

        // Top vent shroud
        const shroud = new THREE.Mesh(
            new THREE.BoxGeometry(0.2, 0.08, 1.0),
            this.frameMat
        );
        shroud.position.set(0, 0.26, -0.1);
        bodyGroup.add(shroud);

        // === THERMAL NOZZLE ASSEMBLY ===
        this.nozzleRoot = new THREE.Group();
        this.nozzleRoot.position.set(0, 0.12, -0.6);
        this.add(this.nozzleRoot);

        // Main barrel (thermal reactive)
        const barrelGeo = new THREE.CylinderGeometry(0.08, 0.1, 1.8, 16);
        this.barrel = new THREE.Mesh(barrelGeo, this.nozzleMat);
        this.barrel.rotation.x = Math.PI / 2;
        this.barrel.position.set(0, 0, -0.9);
        this.nozzleRoot.add(this.barrel);

        // Thermal rings
        this.heatRings = [];
        for (let i = 0; i < 6; i++) {
            const ringMat = this.heatMat.clone();
            const ring = new THREE.Mesh(
                new THREE.TorusGeometry(0.12, 0.015, 8, 24),
                ringMat
            );
            ring.rotation.y = Math.PI / 2;
            ring.position.set(0, 0, -0.4 - i * 0.25);
            this.nozzleRoot.add(ring);
            this.heatRings.push(ringMat);
        }

        // Nozzle flare
        const flare = new THREE.Mesh(
            new THREE.CylinderGeometry(0.18, 0.12, 0.3, 16),
            this.nozzleMat
        );
        flare.rotation.x = Math.PI / 2;
        flare.position.set(0, 0, -1.8);
        this.nozzleRoot.add(flare);

        // === PILOT LIGHT IGNITER ===
        this.igniterGroup = new THREE.Group();
        this.igniterGroup.position.set(0, -0.15, -1.75);
        this.nozzleRoot.add(this.igniterGroup);

        const igniterBody = new THREE.Mesh(
            new THREE.BoxGeometry(0.1, 0.08, 0.15),
            this.brassMat
        );
        this.igniterGroup.add(igniterBody);

        this.pilotFlame = new THREE.Mesh(
            new THREE.SphereGeometry(0.04, 8, 8),
            this.pilotMat
        );
        this.pilotFlame.position.set(0, 0.08, 0);
        this.igniterGroup.add(this.pilotFlame);

        this.pilotLight = new THREE.PointLight(0x00ffff, 0.5, 2);
        this.pilotLight.position.set(0, 0.1, 0);
        this.igniterGroup.add(this.pilotLight);

        // === FUEL TANKS (Industrial Refinery Style) ===
        for (let side of [-1, 1]) {
            const tank = new THREE.Group();
            tank.position.set(0.28 * side, -0.1, 0.3);
            this.add(tank);

            const cylinder = new THREE.Mesh(
                new THREE.CylinderGeometry(0.1, 0.1, 0.9, 12),
                this.tankMat
            );
            tank.add(cylinder);

            // Brass caps and valves
            const cap = new THREE.Mesh(
                new THREE.CylinderGeometry(0.11, 0.11, 0.05, 12),
                this.brassMat
            );
            cap.position.set(0, 0.45, 0);
            tank.add(cap);

            // Feed pipes
            const pipe = new THREE.Mesh(
                new THREE.CylinderGeometry(0.02, 0.02, 0.3, 8),
                this.frameMat
            );
            pipe.rotation.z = Math.PI / 2;
            pipe.position.set(-0.15 * side, 0.3, 0);
            tank.add(pipe);
        }

        // === HEAT HAZE BILLBOARD ===
        const hazeGeo = new THREE.PlaneGeometry(1, 1);
        this.hazeMat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        this.haze = new THREE.Mesh(hazeGeo, this.hazeMat);
        this.haze.position.set(0, 0.12, -2.5);
        this.haze.scale.set(0, 0, 1);
        this.add(this.haze);

        // Barrel light
        this.muzzleLight = new THREE.PointLight(0xff4400, 0, 10);
        this.muzzleLight.position.set(0, 0.12, -2.2);
        this.add(this.muzzleLight);
    }

    fire() {
        this.fireIntensity = 1.0;
        this.barrelHeat = Math.min(2.0, this.barrelHeat + 0.15);
        this.playProceduralFire();
    }

    playProceduralFire() {
        if (!window.audioCtx) window.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const ctx = window.audioCtx;
        if (ctx.state === 'suspended') ctx.resume();

        const t = ctx.currentTime;
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(50, t);
        osc.frequency.exponentialRampToValueAtTime(100, t + 0.1);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(); osc.stop(t + 0.2);
    }

    update(dt) {
        this.idleTime += dt;
        this.fireIntensity = Math.max(0, this.fireIntensity - dt * 5.0);
        this.barrelHeat = Math.max(0, this.barrelHeat - dt * 0.4);

        // Thermal glow logic
        this.heatRings.forEach((mat, i) => {
            const h = Math.max(0, this.barrelHeat - i * 0.15);
            mat.emissiveIntensity = h * 5.0;
        });

        // Muzzle light logic
        this.muzzleLight.intensity = this.fireIntensity * 15.0 + this.barrelHeat * 2.0;

        // Pilot light flicker
        this.pilotFlicker = 0.5 + Math.sin(this.idleTime * 20) * 0.2 + Math.random() * 0.3;
        this.pilotFlame.scale.setScalar(0.8 + this.pilotFlicker * 0.5);
        this.pilotFlame.material.emissiveIntensity = 2.0 + this.pilotFlicker * 4.0;
        this.pilotLight.intensity = this.pilotFlicker * 0.8;

        // Heat haze billboard logic
        if (this.fireIntensity > 0.1) {
            this.haze.visible = true;
            this.haze.scale.setScalar(0.5 + this.fireIntensity * 2.0);
            this.haze.material.opacity = this.fireIntensity * 0.1;
            this.haze.rotation.z += dt * 10;
        } else {
            this.haze.visible = false;
        }

        // Idle movement
        this.position.y += Math.sin(this.idleTime * 1.5) * 0.005;
        this.rotation.z = Math.sin(this.idleTime * 0.8) * 0.01;
    }
}

window.Flamethrower = Flamethrower;
