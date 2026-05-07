/**
 * Plasma Sword — High-Fidelity Procedural Melee Weapon (OUTSTANDING VERSION)
 * Features: 
 * - Dynamic Ribbon Trail: Real-time procedural geometry tracking the blade's path.
 * - Plasma Core Discharge: Animated core that vents energy during slashes.
 * - Multi-layered Edge Glow: Fresnel-like glow effects on the blade edges.
 * - Faceted Crystal Guard: Industrial guard with embedded energy focus crystals.
 * - Procedural Motion Blur: Enhanced with ribbon geometry.
 */
class Sword extends THREE.Group {
    constructor() {
        super();
        this.name = "procedural_plasma_sword";

        // Animation states
        this.slashAngle = 0;      
        this.swingPhase = 0;      
        this.swingTimer = 0;
        this.idleTime = 0;
        this.edgePulse = 0;
        this.dischargeIntensity = 0;

        // Ribbon Trail Data
        this.trailPoints = [];
        this.maxTrailPoints = 12;
        this.trailGeometry = new THREE.PlaneGeometry(1, 1, 1, this.maxTrailPoints - 1);
        this.trailMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ffaa,
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        this.trailMesh = new THREE.Mesh(this.trailGeometry, this.trailMaterial);
        this.trailMesh.frustumCulled = false;

        // Materials
        this.bladeMat = new THREE.MeshStandardMaterial({
            color: 0x0a1520, roughness: 0.05, metalness: 0.98
        });
        this.edgeMat = new THREE.MeshStandardMaterial({
            color: 0x00ffaa, emissive: 0x00ff88, emissiveIntensity: 3.0,
            roughness: 0.1, metalness: 0.9
        });
        this.guardMat = new THREE.MeshStandardMaterial({
            color: 0x1a1a1a, roughness: 0.2, metalness: 0.9
        });
        this.gripMat = new THREE.MeshStandardMaterial({
            color: 0x050505, roughness: 0.8, metalness: 0.1
        });
        this.crystalMat = new THREE.MeshStandardMaterial({
            color: 0x00ffff, emissive: 0x0088ff, emissiveIntensity: 2.0,
            transparent: true, opacity: 0.9, roughness: 0.1, metalness: 0.8
        });
        this.plasmaCoreMat = new THREE.MeshStandardMaterial({
            color: 0x00ffaa, emissive: 0x00ffcc, emissiveIntensity: 5.0,
            transparent: true, opacity: 0.8
        });

        this.buildSword();
        // Initialize trail points
        const tipPos = new THREE.Vector3();
        const basePos = new THREE.Vector3();
        this.tipMarker.getWorldPosition(tipPos);
        this.baseMarker.getWorldPosition(basePos);
        for(let i=0; i<this.maxTrailPoints; i++) {
            this.trailPoints.push({ tip: tipPos.clone(), base: basePos.clone() });
        }
    }

    buildSword() {
        // Root pivot for slash rotation
        this.bladeRoot = new THREE.Group();
        this.add(this.bladeRoot);

        // Add ribbon trail to the scene (outside the root so it doesn't rotate with it)
        this.add(this.trailMesh);

        // === BLADE ===
        const bladeGeo = new THREE.BoxGeometry(0.08, 0.04, 3.2);
        const bladeVerts = bladeGeo.attributes.position;
        for (let i = 0; i < bladeVerts.count; i++) {
            const z = bladeVerts.getZ(i);
            if (z < -1.2) {
                const taper = 1.0 - Math.abs(z + 1.2) / 0.4;
                bladeVerts.setX(i, bladeVerts.getX(i) * Math.max(0.05, taper));
                bladeVerts.setY(i, bladeVerts.getY(i) * Math.max(0.2, taper));
            }
        }
        bladeGeo.computeVertexNormals();

        const blade = new THREE.Mesh(bladeGeo, this.bladeMat);
        blade.position.set(0, 0, -2.0);
        blade.castShadow = true;
        this.bladeRoot.add(blade);

        // Multi-layered energy edge
        for (let side of [-1, 1]) {
            const edgeGeo = new THREE.BoxGeometry(0.006, 0.07, 3.1);
            const edge = new THREE.Mesh(edgeGeo, this.edgeMat.clone());
            edge.position.set(0.042 * side, 0, -2.05);
            this.bladeRoot.add(edge);

            // Outer glow layer
            const glowGeo = new THREE.BoxGeometry(0.012, 0.1, 3.2);
            const glow = new THREE.Mesh(glowGeo, new THREE.MeshBasicMaterial({
                color: 0x00ffaa, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending
            }));
            glow.position.set(0.045 * side, 0, -2.05);
            this.bladeRoot.add(glow);
        }

        // === PLASMA CORE ===
        this.coreGroup = new THREE.Group();
        this.bladeRoot.add(this.coreGroup);
        
        const coreGeo = new THREE.BoxGeometry(0.02, 0.015, 2.8);
        this.corePlasma = new THREE.Mesh(coreGeo, this.plasmaCoreMat.clone());
        this.corePlasma.position.set(0, 0, -2.0);
        this.coreGroup.add(this.corePlasma);

        // Core vent details
        for (let i = 0; i < 6; i++) {
            const vent = new THREE.Mesh(
                new THREE.BoxGeometry(0.1, 0.06, 0.05),
                this.guardMat
            );
            vent.position.set(0, 0, -0.8 - i * 0.4);
            this.bladeRoot.add(vent);
        }

        // === INDUSTRIAL GUARD ===
        const guardRoot = new THREE.Group();
        guardRoot.position.set(0, 0, -0.35);
        this.bladeRoot.add(guardRoot);

        const guardBase = new THREE.Mesh(
            new THREE.BoxGeometry(0.45, 0.12, 0.15),
            this.guardMat
        );
        guardRoot.add(guardBase);

        // Energy Focus Crystals
        for (let side of [-1, 1]) {
            const crystal = new THREE.Mesh(
                new THREE.OctahedronGeometry(0.06, 0),
                this.crystalMat.clone()
            );
            crystal.position.set(0.2 * side, 0, 0);
            crystal.rotation.x = Math.PI / 4;
            guardRoot.add(crystal);
            
            const crystalLight = new THREE.PointLight(0x00ffff, 0.5, 1);
            crystalLight.position.set(0.2 * side, 0, 0.1);
            guardRoot.add(crystalLight);
        }

        // Industrial quillons
        for (let side of [-1, 1]) {
            const quillon = new THREE.Mesh(
                new THREE.BoxGeometry(0.06, 0.25, 0.1),
                this.guardMat
            );
            quillon.position.set(0.26 * side, 0.05, 0);
            quillon.rotation.z = side * 0.4;
            guardRoot.add(quillon);
        }

        // === REFINED GRIP ===
        const gripGeo = new THREE.CylinderGeometry(0.045, 0.05, 1.0, 16);
        const grip = new THREE.Mesh(gripGeo, this.gripMat);
        grip.rotation.x = Math.PI / 2;
        grip.position.set(0, 0, 0.2);
        this.bladeRoot.add(grip);

        // Grip texture (carbon fiber look via small rings)
        for (let i = 0; i < 20; i++) {
            const ring = new THREE.Mesh(
                new THREE.TorusGeometry(0.052, 0.005, 6, 16),
                this.guardMat
            );
            ring.rotation.y = Math.PI / 2;
            ring.position.set(0, 0, -0.2 + i * 0.04);
            this.bladeRoot.add(ring);
        }

        // === POMMEL ASSEMBLY ===
        const pommelRoot = new THREE.Group();
        pommelRoot.position.set(0, 0, 0.75);
        this.bladeRoot.add(pommelRoot);

        const pommelCasing = new THREE.Mesh(
            new THREE.CylinderGeometry(0.07, 0.05, 0.15, 8),
            this.guardMat
        );
        pommelCasing.rotation.x = Math.PI / 2;
        pommelRoot.add(pommelCasing);

        this.pommelCrystal = new THREE.Mesh(
            new THREE.OctahedronGeometry(0.06, 0),
            this.crystalMat.clone()
        );
        this.pommelCrystal.position.set(0, 0, 0.1);
        pommelRoot.add(this.pommelCrystal);

        // Lights
        this.bladeLight = new THREE.PointLight(0x00ffaa, 1.0, 5);
        this.bladeLight.position.set(0, 0, -2);
        this.bladeRoot.add(this.bladeLight);

        // Tip marker for trail
        this.tipMarker = new THREE.Object3D();
        this.tipMarker.position.set(0, 0, -3.6);
        this.bladeRoot.add(this.tipMarker);
        
        this.baseMarker = new THREE.Object3D();
        this.baseMarker.position.set(0, 0, -0.4);
        this.bladeRoot.add(this.baseMarker);
    }

    fire() {
        this.swingPhase = 1;
        this.swingTimer = 0;
        this.edgePulse = 1.0;
        this.dischargeIntensity = 1.0;
        this.playProceduralSlash();
    }

    playProceduralSlash() {
        if (!window.audioCtx) window.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const ctx = window.audioCtx;
        if (ctx.state === 'suspended') ctx.resume();

        const t = ctx.currentTime;
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(1500, t);
        osc.frequency.exponentialRampToValueAtTime(300, t + 0.2);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(); osc.stop(t + 0.3);
    }

    update(dt) {
        this.idleTime += dt;

        // === SWING LOGIC ===
        if (this.swingPhase > 0) {
            this.swingTimer += dt;
            if (this.swingTimer < 0.15) {
                const p = this.swingTimer / 0.15;
                this.slashAngle = -2.2 * (1 - Math.pow(1 - p, 3));
            } else if (this.swingTimer < 0.4) {
                const p = (this.swingTimer - 0.15) / 0.25;
                this.slashAngle = -2.2 * (1 - p * p);
            } else {
                this.swingPhase = 0;
                this.slashAngle = 0;
            }
        }

        this.bladeRoot.rotation.x = this.slashAngle * 0.8;
        this.bladeRoot.rotation.z = this.slashAngle * 0.4;

        if (this.swingPhase === 0) {
            this.bladeRoot.rotation.x += Math.sin(this.idleTime * 2) * 0.02;
            this.bladeRoot.position.y = Math.cos(this.idleTime * 1.5) * 0.01;
        }

        // === RIBBON TRAIL UPDATE ===
        const tipPos = new THREE.Vector3();
        const basePos = new THREE.Vector3();
        this.tipMarker.getWorldPosition(tipPos);
        this.baseMarker.getWorldPosition(basePos);

        // Store world positions
        this.trailPoints.unshift({ tip: tipPos.clone(), base: basePos.clone() });
        if (this.trailPoints.length > this.maxTrailPoints) this.trailPoints.pop();

        // Update trail geometry
        const positions = this.trailGeometry.attributes.position;
        for (let i = 0; i < this.maxTrailPoints; i++) {
            const point = this.trailPoints[i] || this.trailPoints[this.trailPoints.length - 1];
            if (point) {
                // Convert stored world position to current local space
                const localTip = point.tip.clone();
                const localBase = point.base.clone();
                this.worldToLocal(localTip);
                this.worldToLocal(localBase);

                positions.setXYZ(i * 2, localBase.x, localBase.y, localBase.z);
                positions.setXYZ(i * 2 + 1, localTip.x, localTip.y, localTip.z);
            }
        }
        positions.needsUpdate = true;
        this.trailMaterial.opacity = this.swingPhase > 0 ? 0.7 : Math.max(0, this.trailMaterial.opacity - dt * 5);

        // === VISUAL PULSE ===
        this.edgePulse = Math.max(0, this.edgePulse - dt * 2);
        this.dischargeIntensity = Math.max(0, this.dischargeIntensity - dt * 3);
        
        const glow = 2.0 + Math.sin(this.idleTime * 5) * 1.0 + this.edgePulse * 5.0;
        this.bladeLight.intensity = 1.0 + this.edgePulse * 8.0;
        this.corePlasma.material.emissiveIntensity = 4.0 + this.dischargeIntensity * 10.0;
        this.corePlasma.scale.set(
            1.0 + this.dischargeIntensity * 0.5,
            1.0 + this.dischargeIntensity * 0.5,
            1.0
        );

        this.bladeRoot.children.forEach(child => {
            if (child.material && child.material.emissive && child.material.name !== "plasma") {
                child.material.emissiveIntensity = glow;
            }
        });

        this.pommelCrystal.rotation.y += dt * 3;
        this.pommelCrystal.material.emissiveIntensity = 2.0 + Math.sin(this.idleTime * 4) * 1.0;
    }
}

window.Sword = Sword;
