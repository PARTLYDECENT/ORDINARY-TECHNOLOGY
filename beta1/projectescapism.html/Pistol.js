/**
 * Procedural MAC-10 Viewmodel Component - Hyper-Premium Geometric & Material Refinements
 * Grafts the High-Fidelity procedural MAC-10 model as a clean, high-performance,
 * procedural Three.js mesh for the Pistol slot in the game.
 * Features:
 * - Straddling rear peep sight and hooded front sight spanning receiver top slot gap.
 * - Glowing competition fiber-optic tube insert inside front hooded post.
 * - Slimmed-down, perpendicular (90-degree) pistol grip and magazine dimensions.
 * - Flared tactical gold magwell collar and matching magazine floor plates.
 * - Curved golden skeletonized match trigger with circular speed cutouts.
 * - Stamped manufacturer metal identification plate and gold "S" / "F" selector letters.
 * - Anodized Oil-Slick Iridescence custom shader material for all steel/receiver parts.
 * - Dynamic Thermal Heat glow custom shader material for the barrel and muzzle compensator block.
 * - Programmatic physical stippling micro-cylinder grids on polymer grip panels (CSG stippling).
 * - Hyper-detailed multi-segmented mechanical bolt assembly (stepped face, extractor claw, firing pin).
 * - 15Hz submachine gun procedural audio layer and tumbling shell physics.
 */
class Pistol extends THREE.Group {
    constructor() {
        super();
        this.name = "procedural_mac10";

        // Animation states (Open-bolt resting state: bolt held backward at 0.24!)
        this.boltZ = 0.24;
        this.gunPitch = 0;
        this.gunZ = 0;
        this.triggerZ = -0.12; // Start trigger position
        this.lightIntensity = 0;
        this.flashScale = 0;
        this.strapSwing = 0;
        this.heat = 0.0; // Dynamic thermal heat level

        // Particle pools
        this.shells = [];
        this.smokeParticles = [];

        // Generate procedural twill carbon fiber weave texture
        const carbonTex = this.createCarbonFiberTexture();

        // Custom Shaders & Premium Materials
        this.initShadersAndMaterials(carbonTex);

        this.hasFired = false;
        this.buildMac10();
    }

    createCarbonFiberTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = '#1e2124';
        ctx.fillRect(0, 0, 64, 64);
        
        // Draw diagonal carbon weave pattern
        ctx.fillStyle = '#0f1012';
        for (let y = 0; y < 64; y += 4) {
            for (let x = 0; x < 64; x += 4) {
                if (((x + y) / 4) % 2 === 0) {
                    ctx.fillRect(x, y, 4, 2);
                } else {
                    ctx.fillRect(x, y + 2, 4, 2);
                }
            }
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(12, 12);
        return texture;
    }

    initShadersAndMaterials(carbonTex) {
        // 1. Anodized oil-slick iridescence receiver material
        this.receiverMat = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uColorSteel: { value: new THREE.Color(0x131518) }
            },
            vertexShader: `
                varying vec3 vNormal;
                varying vec3 vPosition;
                varying vec3 vModelPos;
                void main() {
                    vNormal = normalize(normalMatrix * normal);
                    vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
                    vModelPos = position;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform float uTime;
                uniform vec3 uColorSteel;
                varying vec3 vNormal;
                varying vec3 vPosition;
                varying vec3 vModelPos;

                float hash(vec2 p) {
                    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
                }

                float noise(vec2 p) {
                    vec2 i = floor(p);
                    vec2 p2 = fract(p);
                    vec2 u = p2*p2*(3.0-2.0*p2);
                    return mix(mix(hash(i + vec2(0.0,0.0)), hash(i + vec2(1.0,0.0)), u.x),
                               mix(hash(i + vec2(0.0,1.0)), hash(i + vec2(1.0,1.0)), u.x), u.y);
                }

                void main() {
                    vec3 normal = normalize(vNormal);
                    vec3 lightDir = normalize(vec3(4.0, 8.0, 4.0) - vPosition);
                    vec3 viewDir = normalize(-vPosition);
                    
                    float diff = max(0.18, dot(normal, lightDir));
                    vec3 halfVec = normalize(lightDir + viewDir);
                    float spec = pow(max(0.0, dot(normal, halfVec)), 24.0);
                    
                    // Brushed steel micro-texture scratches
                    float scratch = noise(vModelPos.xz * 180.0) * 0.05;
                    
                    // Fresnel iridescent color sweep (anodized titanium look)
                    float fresnel = pow(1.0 - max(0.0, dot(normal, viewDir)), 2.2);
                    
                    vec3 iridColor = vec3(
                        0.55 + 0.45 * sin(fresnel * 4.5 + 0.0),
                        0.35 + 0.45 * sin(fresnel * 4.5 + 1.8),
                        0.60 + 0.40 * sin(fresnel * 4.5 + 3.6)
                    );
                    
                    vec3 baseCol = (uColorSteel + vec3(scratch)) * diff;
                    vec3 specCol = vec3(1.3) * spec * (0.85 + 0.15 * iridColor);
                    vec3 sheenCol = iridColor * fresnel * 0.26;
                    
                    gl_FragColor = vec4(baseCol + specCol + sheenCol, 1.0);
                }
            `
        });

        // 2. Dynamic Barrel Heat Shader Material
        this.barrelHeatMat = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uHeat: { value: 0 },
                uColorSteel: { value: new THREE.Color(0x3d444e) },
                uColorHeat: { value: new THREE.Color(0xff3300) }
            },
            vertexShader: `
                varying vec3 vNormal;
                varying vec3 vPosition;
                varying vec3 vModelPos;
                void main() {
                    vNormal = normalize(normalMatrix * normal);
                    vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
                    vModelPos = position;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform float uTime;
                uniform float uHeat;
                uniform vec3 uColorSteel;
                uniform vec3 uColorHeat;
                varying vec3 vNormal;
                varying vec3 vPosition;
                varying vec3 vModelPos;
                void main() {
                    vec3 normal = normalize(vNormal);
                    vec3 lightDir = normalize(vec3(5.0, 10.0, 5.0) - vPosition);
                    vec3 viewDir = normalize(-vPosition);
                    
                    float diff = max(0.2, dot(normal, lightDir));
                    vec3 reflectDir = reflect(-lightDir, normal);
                    float spec = pow(max(0.0, dot(viewDir, reflectDir)), 16.0) * 0.4;
                    
                    vec3 baseCol = uColorSteel * diff + vec3(spec);
                    
                    // Heat glow gradient along local barrel length (Y axis of cylinder)
                    float heatGlow = uHeat * smoothstep(0.3, 1.0, 1.0 - (vModelPos.y + 0.225) / 0.45);
                    
                    // Pulse thermal intensity
                    float pulse = 0.85 + 0.15 * sin(uTime * 30.0);
                    vec3 thermalCol = uColorHeat * heatGlow * 3.0 * pulse;
                    
                    vec3 finalCol = baseCol + thermalCol;
                    gl_FragColor = vec4(finalCol, 1.0);
                }
            `
        });

        // 3. Compensator Heat Shader Material
        this.compHeatMat = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uHeat: { value: 0 },
                uColorSteel: { value: new THREE.Color(0x3d444e) },
                uColorHeat: { value: new THREE.Color(0xff4400) }
            },
            vertexShader: this.barrelHeatMat.vertexShader,
            fragmentShader: `
                uniform float uTime;
                uniform float uHeat;
                uniform vec3 uColorSteel;
                uniform vec3 uColorHeat;
                varying vec3 vNormal;
                varying vec3 vPosition;
                varying vec3 vModelPos;
                void main() {
                    vec3 normal = normalize(vNormal);
                    vec3 lightDir = normalize(vec3(5.0, 10.0, 5.0) - vPosition);
                    vec3 viewDir = normalize(-vPosition);
                    
                    float diff = max(0.2, dot(normal, lightDir));
                    vec3 reflectDir = reflect(-lightDir, normal);
                    float spec = pow(max(0.0, dot(viewDir, reflectDir)), 16.0) * 0.4;
                    
                    vec3 baseCol = uColorSteel * diff + vec3(spec);
                    
                    // Glow thermal intensity over compensator block
                    float heatGlow = uHeat * 0.95;
                    float pulse = 0.85 + 0.15 * sin(uTime * 45.0);
                    vec3 thermalCol = uColorHeat * heatGlow * 2.5 * pulse;
                    
                    vec3 finalCol = baseCol + thermalCol;
                    gl_FragColor = vec4(finalCol, 1.0);
                }
            `
        });

        // 4. Grip / Polymer Material with carbon fibers
        this.polyMat = new THREE.MeshStandardMaterial({
            color: 0x111316,
            roughness: 0.55,
            metalness: 0.3,
            bumpMap: carbonTex,
            bumpScale: 0.008
        });

        // 5. Shared Standard Materials
        this.steelMat = new THREE.MeshStandardMaterial({
            color: 0x3d444e,
            roughness: 0.3,
            metalness: 0.88
        });
        this.brassMat = new THREE.MeshStandardMaterial({
            color: 0xd4af37,
            metalness: 0.9,
            roughness: 0.15
        });
        this.chromeMat = new THREE.MeshStandardMaterial({
            color: 0xe5e9f0,
            metalness: 0.95,
            roughness: 0.08
        });
        this.goldMat = new THREE.MeshStandardMaterial({
            color: 0xf3ca40,
            metalness: 0.92,
            roughness: 0.18
        });
        this.dotMat = new THREE.MeshBasicMaterial({ color: 0x00ffaa });
    }

    buildMac10() {
        // === MAIN SOLID CHASSIS ===
        this.chassisGroup = new THREE.Group();
        this.add(this.chassisGroup);

        // === UPPER RECEIVER (Hollow design with ejection port & top slot) ===
        this.upperGroup = new THREE.Group();
        this.chassisGroup.add(this.upperGroup);

        // Left wall
        const leftWall = new THREE.Mesh(
            new THREE.BoxGeometry(0.02, 0.18, 1.0),
            this.receiverMat
        );
        leftWall.position.set(-0.07, 0.15, -0.2);
        leftWall.castShadow = true;
        this.upperGroup.add(leftWall);

        // Top plate (with center slot cut)
        const topPlateL = new THREE.Mesh(
            new THREE.BoxGeometry(0.06, 0.02, 1.0),
            this.receiverMat
        );
        topPlateL.position.set(-0.04, 0.24, -0.2);
        this.upperGroup.add(topPlateL);

        const topPlateR = new THREE.Mesh(
            new THREE.BoxGeometry(0.06, 0.02, 1.0),
            this.receiverMat
        );
        topPlateR.position.set(0.04, 0.24, -0.2);
        this.upperGroup.add(topPlateR);

        // Bottom plate
        const bottomPlate = new THREE.Mesh(
            new THREE.BoxGeometry(0.16, 0.02, 1.0),
            this.receiverMat
        );
        bottomPlate.position.set(0, 0.06, -0.2);
        this.upperGroup.add(bottomPlate);

        // Right rear wall (after ejection port)
        const rightRear = new THREE.Mesh(
            new THREE.BoxGeometry(0.02, 0.16, 0.35),
            this.receiverMat
        );
        rightRear.position.set(0.07, 0.15, 0.125);
        this.upperGroup.add(rightRear);

        // Right front wall (before ejection port)
        const rightFront = new THREE.Mesh(
            new THREE.BoxGeometry(0.02, 0.16, 0.35),
            this.receiverMat
        );
        rightFront.position.set(0.07, 0.15, -0.525);
        this.upperGroup.add(rightFront);

        // === PREMIUM STRADDLING HOODED FRONT SIGHT ===
        const fSightGroup = new THREE.Group();
        fSightGroup.position.set(0, 0.24, -0.65); // Anchored cleanly on the top receiver edge
        this.upperGroup.add(fSightGroup);

        // Straddling bases (resting securely on both left & right receiver walls)
        const fBaseL = new THREE.Mesh(
            new THREE.BoxGeometry(0.015, 0.06, 0.04),
            this.receiverMat
        );
        fBaseL.position.set(-0.065, 0.03, 0);

        const fBaseR = new THREE.Mesh(
            new THREE.BoxGeometry(0.015, 0.06, 0.04),
            this.receiverMat
        );
        fBaseR.position.set(0.065, 0.03, 0);
        fSightGroup.add(fBaseL, fBaseR);

        // Beautiful steel arching/circular protective hood
        const fHood = new THREE.Mesh(
            new THREE.TorusGeometry(0.04, 0.008, 6, 16),
            this.receiverMat
        );
        fHood.position.set(0, 0.09, 0);
        fSightGroup.add(fHood);

        // Vertical sights post
        const fPost = new THREE.Mesh(
            new THREE.BoxGeometry(0.006, 0.03, 0.006),
            this.steelMat
        );
        fPost.position.set(0, 0.065, 0);
        fSightGroup.add(fPost);

        // Glowing fiber optic horizontal indicator inside the hood
        const fFiber = new THREE.Mesh(
            new THREE.CylinderGeometry(0.004, 0.004, 0.02, 6),
            this.dotMat
        );
        fFiber.rotation.x = Math.PI / 2;
        fFiber.position.set(0, 0.085, 0);
        fSightGroup.add(fFiber);


        // === PREMIUM STRADDLING REAR PEEP SIGHT ===
        const rSightGroup = new THREE.Group();
        rSightGroup.position.set(0, 0.24, 0.28); // Anchored on rear top receiver edge
        this.upperGroup.add(rSightGroup);

        // Straddling mounting legs (firmly supporting sight across top slot)
        const rLegL = new THREE.Mesh(
            new THREE.BoxGeometry(0.015, 0.08, 0.04),
            this.receiverMat
        );
        rLegL.position.set(-0.065, 0.04, 0);

        const rLegR = new THREE.Mesh(
            new THREE.BoxGeometry(0.015, 0.08, 0.04),
            this.receiverMat
        );
        rLegR.position.set(0.065, 0.04, 0);
        rSightGroup.add(rLegL, rLegR);

        // Transverse bridge bar spanning the gap
        const rBridge = new THREE.Mesh(
            new THREE.BoxGeometry(0.145, 0.02, 0.03),
            this.receiverMat
        );
        rBridge.position.set(0, 0.08, 0);
        rSightGroup.add(rBridge);

        // Gold windage dial details on sides
        const windL = new THREE.Mesh(
            new THREE.CylinderGeometry(0.01, 0.01, 0.02, 8),
            this.goldMat
        );
        windL.rotation.z = Math.PI / 2;
        windL.position.set(-0.08, 0.08, 0);

        const windR = new THREE.Mesh(
            new THREE.CylinderGeometry(0.01, 0.01, 0.02, 8),
            this.goldMat
        );
        windR.rotation.z = Math.PI / 2;
        windR.position.set(0.08, 0.08, 0);
        rSightGroup.add(windL, windR);

        // Rear peep aperture dial (camera-facing peep ring)
        const rAperture = new THREE.Mesh(
            new THREE.TorusGeometry(0.02, 0.006, 6, 12),
            this.receiverMat
        );
        rAperture.position.set(0, 0.115, 0);
        rSightGroup.add(rAperture);


        // === LOWER RECEIVER ===
        this.lowerGroup = new THREE.Group();
        this.chassisGroup.add(this.lowerGroup);

        const lowerBody = new THREE.Mesh(
            new THREE.BoxGeometry(0.15, 0.1, 0.9),
            this.receiverMat
        );
        lowerBody.position.set(0, 0.0, -0.15);
        lowerBody.castShadow = true;
        this.lowerGroup.add(lowerBody);

        // Stock mount block (rear)
        const stockMount = new THREE.Mesh(
            new THREE.BoxGeometry(0.10, 0.08, 0.05),
            this.receiverMat
        );
        stockMount.position.set(0, 0.0, 0.325);
        this.lowerGroup.add(stockMount);

        // Selector Switch (Left side)
        const selector = new THREE.Mesh(
            new THREE.CylinderGeometry(0.012, 0.012, 0.03, 8),
            this.steelMat
        );
        selector.rotation.z = Math.PI / 2;
        selector.position.set(-0.085, 0.0, -0.3);
        this.lowerGroup.add(selector);

        // S & F selector text indicators (Safe/Fire gold stamps next to switch)
        const labelS = new THREE.Group();
        labelS.position.set(-0.086, 0.05, -0.32);
        this.lowerGroup.add(labelS);
        for (let yVal of [-0.01, 0.0, 0.01]) {
            const bar = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.003, 0.015), this.goldMat);
            bar.position.y = yVal;
            labelS.add(bar);
        }
        const barL = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.005, 0.003), this.goldMat);
        barL.position.set(0, 0.005, -0.006);
        const barR = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.005, 0.003), this.goldMat);
        barR.position.set(0, -0.005, 0.006);
        labelS.add(barL, barR);

        const labelF = new THREE.Group();
        labelF.position.set(-0.086, 0.05, -0.28);
        this.lowerGroup.add(labelF);
        const fSpine = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.02, 0.003), this.goldMat);
        fSpine.position.z = -0.006;
        labelF.add(fSpine);
        const fBarT = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.003, 0.015), this.goldMat);
        fBarT.position.set(0, 0.01, 0);
        const fBarM = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.003, 0.01), this.goldMat);
        fBarM.position.set(0, 0.0, -0.002);
        labelF.add(fBarT, fBarM);

        // Safety slide switch (Underneath front)
        const safety = new THREE.Mesh(
            new THREE.BoxGeometry(0.03, 0.015, 0.06),
            this.polyMat
        );
        safety.position.set(0.04, -0.06, -0.4);
        this.lowerGroup.add(safety);

        // Trigger Guard Loop
        const tGuard = new THREE.Mesh(
            new THREE.BoxGeometry(0.03, 0.16, 0.26),
            this.receiverMat
        );
        tGuard.position.set(0, -0.12, -0.12);
        this.lowerGroup.add(tGuard);

        const tGuardInner = new THREE.Mesh(
            new THREE.BoxGeometry(0.035, 0.12, 0.22),
            new THREE.MeshBasicMaterial({ color: 0x000000 })
        );
        tGuardInner.position.set(0, -0.11, -0.12);
        this.lowerGroup.add(tGuardInner);

        // Curved Skeletonized Golden Match Trigger Group
        this.triggerGroup = new THREE.Group();
        this.triggerGroup.position.set(0, -0.06, -0.12);
        this.lowerGroup.add(this.triggerGroup);

        this.triggerMesh = new THREE.Mesh(
            new THREE.BoxGeometry(0.012, 0.07, 0.015),
            this.goldMat
        );
        this.triggerMesh.position.set(0, -0.02, 0.02);
        this.triggerMesh.rotation.x = -0.15;
        this.triggerGroup.add(this.triggerMesh);

        for (let i = 0; i < 3; i++) {
            const speedCut = new THREE.Mesh(
                new THREE.CylinderGeometry(0.0035, 0.0035, 0.02, 6),
                this.receiverMat
            );
            speedCut.rotation.z = Math.PI / 2;
            speedCut.position.set(0, -0.01 - i * 0.016, 0.02);
            this.triggerGroup.add(speedCut);
        }

        // === ERGONOMIC GRIP (Resized and Perpendicular!) ===
        const gripGroup = new THREE.Group();
        gripGroup.position.set(0, -0.38, 0.12);
        gripGroup.rotation.x = 0; // Perpendicular to receiver body!
        this.chassisGroup.add(gripGroup);

        const gripMain = new THREE.Mesh(
            new THREE.BoxGeometry(0.08, 0.65, 0.16),
            this.polyMat
        );
        gripGroup.add(gripMain);

        // Ergonomic backstrap bulge
        const backstrap = new THREE.Mesh(
            new THREE.CylinderGeometry(0.024, 0.024, 0.55, 12),
            this.polyMat
        );
        backstrap.position.set(0, 0.0, 0.08);
        gripGroup.add(backstrap);

        // Grip texture ridges
        for (let i = 0; i < 9; i++) {
            const ridge = new THREE.Mesh(
                new THREE.BoxGeometry(0.084, 0.015, 0.02),
                this.polyMat
            );
            ridge.position.set(0, -0.22 + i * 0.055, -0.08);
            gripGroup.add(ridge);
        }

        // Procedurally generate physical CSG stippling grid on the slimmed-down grip sides
        const stippleGeo = new THREE.CylinderGeometry(0.003, 0.003, 0.012, 6);
        stippleGeo.rotateZ(Math.PI / 2);

        for (let side of [-1, 1]) {
            for (let row = 0; row < 13; row++) {
                const yPos = -0.24 + row * 0.04;
                const colsCount = (row % 2 === 0) ? 6 : 5;
                const colStart = (row % 2 === 0) ? -0.055 : -0.044;
                
                for (let col = 0; col < colsCount; col++) {
                    const zPos = colStart + col * 0.022;
                    
                    if (yPos > -0.29 && yPos < 0.29 && zPos > -0.075 && zPos < 0.075) {
                        const bump = new THREE.Mesh(stippleGeo, this.polyMat);
                        bump.position.set(0.041 * side, yPos, zPos);
                        gripGroup.add(bump);
                    }
                }
            }
        }

        // Mag release catch (Bottom rear of grip)
        const magCatch = new THREE.Mesh(
            new THREE.BoxGeometry(0.04, 0.06, 0.03),
            this.steelMat
        );
        magCatch.position.set(0, -0.33, 0.08);
        gripGroup.add(magCatch);

        // Flared Tactical Gold Magwell Ring
        const magwellBase = new THREE.Mesh(
            new THREE.BoxGeometry(0.096, 0.03, 0.176),
            this.goldMat
        );
        magwellBase.position.set(0, -0.325, 0.0);
        gripGroup.add(magwellBase);

        const magwellSlot = new THREE.Mesh(
            new THREE.BoxGeometry(0.064, 0.032, 0.114),
            new THREE.MeshBasicMaterial({ color: 0x050505 })
        );
        magwellSlot.position.set(0, -0.326, 0.0);
        gripGroup.add(magwellSlot);

        // === SLEEKER MAGAZINE ===
        this.magGroup = new THREE.Group();
        this.magGroup.position.set(0, -0.58, 0.12);
        this.magGroup.rotation.x = 0; // Perpendicular!
        this.chassisGroup.add(this.magGroup);

        const magBody = new THREE.Mesh(
            new THREE.BoxGeometry(0.06, 0.8, 0.11),
            this.receiverMat
        );
        this.magGroup.add(magBody);

        // Mag vertical ribs
        for (let i = 0; i < 7; i++) {
            const rib = new THREE.Mesh(
                new THREE.BoxGeometry(0.066, 0.012, 0.116),
                this.receiverMat
            );
            rib.position.set(0, -0.26 + i * 0.09, 0.0);
            this.magGroup.add(rib);
        }

        // Mag floor plate
        const magFloor = new THREE.Mesh(
            new THREE.BoxGeometry(0.072, 0.016, 0.126),
            this.steelMat
        );
        magFloor.position.set(0, -0.408, 0.0);
        this.magGroup.add(magFloor);

        // === BARREL ===
        const barrel = new THREE.Mesh(
            new THREE.CylinderGeometry(0.04, 0.04, 0.45, 12),
            this.barrelHeatMat
        );
        barrel.rotation.x = Math.PI / 2;
        barrel.position.set(0, 0.15, -0.85);
        barrel.castShadow = true;
        this.chassisGroup.add(barrel);

        // Base Collar
        const collar = new THREE.Mesh(
            new THREE.CylinderGeometry(0.05, 0.05, 0.1, 12),
            this.receiverMat
        );
        collar.rotation.x = Math.PI / 2;
        collar.position.set(0, 0.15, -0.68);
        this.chassisGroup.add(collar);

        // === TACTICAL MUZZLE COMPENSATOR (With thermal heat vents) ===
        const compensatorGroup = new THREE.Group();
        compensatorGroup.position.set(0, 0.15, -1.1);
        this.chassisGroup.add(compensatorGroup);

        // Compensator main block
        const compBlock = new THREE.Mesh(
            new THREE.BoxGeometry(0.08, 0.08, 0.18),
            this.compHeatMat
        );
        compBlock.castShadow = true;
        compensatorGroup.add(compBlock);

        // Aggressive venting ports (Gold interior detailing)
        for (let side of [-1, 1]) {
            // Horizontal vents on left & right sides
            for (let zOffset of [-0.04, 0.04]) {
                const port = new THREE.Mesh(
                    new THREE.BoxGeometry(0.01, 0.03, 0.03),
                    this.goldMat
                );
                port.position.set(0.041 * side, 0, zOffset);
                compensatorGroup.add(port);
            }
            // Vertical vents on top
            for (let zOffset of [-0.04, 0.04]) {
                const port = new THREE.Mesh(
                    new THREE.BoxGeometry(0.03, 0.01, 0.03),
                    this.goldMat
                );
                port.position.set(0, 0.041, zOffset);
                compensatorGroup.add(port);
            }
        }

        // Front opening hole
        const compHole = new THREE.Mesh(
            new THREE.CylinderGeometry(0.025, 0.025, 0.01, 8),
            new THREE.MeshBasicMaterial({ color: 0x050505 })
        );
        compHole.rotation.x = Math.PI / 2;
        compHole.position.set(0, 0, -0.091);
        compensatorGroup.add(compHole);

        // === FRONT STRAP HANGER (Loop swing on recoil!) ===
        this.hangerGroup = new THREE.Group();
        this.hangerGroup.position.set(0, 0.15, -0.825);
        this.chassisGroup.add(this.hangerGroup);

        const clampCollar = new THREE.Mesh(
            new THREE.TorusGeometry(0.05, 0.01, 6, 16),
            this.steelMat
        );
        clampCollar.rotation.y = Math.PI / 2;
        this.hangerGroup.add(clampCollar);

        const stalk = new THREE.Mesh(
            new THREE.BoxGeometry(0.02, 0.06, 0.02),
            this.steelMat
        );
        stalk.position.set(0, -0.06, 0);
        this.hangerGroup.add(stalk);

        // Swinging ring anchor
        this.hangerRing = new THREE.Group();
        this.hangerRing.position.set(0, -0.09, 0);
        this.hangerGroup.add(this.hangerRing);

        const ring = new THREE.Mesh(
            new THREE.TorusGeometry(0.035, 0.008, 6, 12),
            this.steelMat
        );
        this.hangerRing.add(ring);

        // Strap fabric tab
        const strapFabric = new THREE.Mesh(
            new THREE.BoxGeometry(0.01, 0.15, 0.06),
            new THREE.MeshStandardMaterial({ color: 0x2d322b, roughness: 0.9 })
        );
        strapFabric.position.set(0, -0.08, 0);
        this.hangerRing.add(strapFabric);

        // === FOLDED WIRE STOCK (Tactical wrap-around) ===
        const stockGroup = new THREE.Group();
        this.chassisGroup.add(stockGroup);

        // Side rails (collapsed along receiver sides)
        for (let side of [-1, 1]) {
            const sideWire = new THREE.Mesh(
                new THREE.CylinderGeometry(0.012, 0.012, 0.7, 8),
                this.steelMat
            );
            sideWire.rotation.x = Math.PI / 2;
            sideWire.position.set(0.09 * side, 0.02, -0.025);
            stockGroup.add(sideWire);
        }

        // Hinge pins
        const hingePin = new THREE.Mesh(
            new THREE.CylinderGeometry(0.02, 0.02, 0.2, 8),
            this.steelMat
        );
        hingePin.rotation.z = Math.PI / 2;
        hingePin.position.set(0, 0.0, 0.32);
        stockGroup.add(hingePin);

        // Shoulder butt loop (folded under receiver body)
        const shoulderLoop = new THREE.Mesh(
            new THREE.TorusGeometry(0.07, 0.012, 6, 12),
            this.steelMat
        );
        shoulderLoop.position.set(0, -0.08, -0.2);
        stockGroup.add(shoulderLoop);

        // === MANUFACTURER IDENTIFICATION PLATE ===
        const idPlate = new THREE.Mesh(
            new THREE.BoxGeometry(0.002, 0.06, 0.22),
            this.chromeMat
        );
        idPlate.position.set(0.071, 0.15, -0.45);
        this.upperGroup.add(idPlate);

        const plateBorder = new THREE.Mesh(
            new THREE.BoxGeometry(0.003, 0.064, 0.224),
            this.goldMat
        );
        plateBorder.position.set(0.07, 0.15, -0.45);
        this.upperGroup.add(plateBorder);

        for (let i = 0; i < 2; i++) {
            const textLine = new THREE.Mesh(
                new THREE.BoxGeometry(0.003, 0.006, 0.15),
                this.goldMat
            );
            textLine.position.set(0.072, 0.16 - i * 0.016, -0.45);
            this.upperGroup.add(textLine);
        }

        // === RECIPROCATING BOLT GROUP (Cocking action rides inside upper) ===
        this.boltGroup = new THREE.Group();
        this.boltGroup.position.set(0, 0.15, 0);
        this.upperGroup.add(this.boltGroup);

        // === HIGHLY GEOMETRICALLY COMPLEX BOLT ASSEMBLY ===
        // 1. Lower Carrier Base (Stepped Block)
        const carrierBase = new THREE.Mesh(
            new THREE.BoxGeometry(0.11, 0.02, 0.45),
            this.chromeMat
        );
        carrierBase.position.set(0, -0.025, -0.2);
        this.boltGroup.add(carrierBase);

        // 2. Stepped Upper Carrier Block (Beveled details)
        const carrierTop = new THREE.Mesh(
            new THREE.BoxGeometry(0.08, 0.05, 0.35),
            this.chromeMat
        );
        carrierTop.position.set(0, 0.01, -0.15);
        this.boltGroup.add(carrierTop);

        // 3. Breech Face Cup (Front circular locking face)
        const boltFace = new THREE.Mesh(
            new THREE.CylinderGeometry(0.036, 0.036, 0.08, 12),
            this.steelMat
        );
        boltFace.rotation.x = Math.PI / 2;
        boltFace.position.set(0, -0.01, -0.44);
        this.boltGroup.add(boltFace);

        // Recessed breech pocket (inside the bolt face)
        const breechPocket = new THREE.Mesh(
            new THREE.CylinderGeometry(0.022, 0.022, 0.01, 10),
            new THREE.MeshBasicMaterial({ color: 0x070708 })
        );
        breechPocket.rotation.x = Math.PI / 2;
        breechPocket.position.set(0, -0.01, -0.481);
        this.boltGroup.add(breechPocket);

        // 4. Detailed Extractor Claw (Golden pivot hook)
        const extractorClaw = new THREE.Mesh(
            new THREE.BoxGeometry(0.015, 0.015, 0.07),
            this.goldMat
        );
        extractorClaw.position.set(0.045, -0.01, -0.41);
        extractorClaw.rotation.y = 0.1;
        this.boltGroup.add(extractorClaw);

        // Extractor Pivot Pin (Gold hex)
        const extractorPin = new THREE.Mesh(
            new THREE.CylinderGeometry(0.006, 0.006, 0.02, 6),
            this.goldMat
        );
        extractorPin.rotation.x = Math.PI / 2;
        extractorPin.position.set(0.045, 0.005, -0.4);
        this.boltGroup.add(extractorPin);

        // Extractor spring detail
        const extractorSpring = new THREE.Mesh(
            new THREE.CylinderGeometry(0.005, 0.005, 0.012, 6),
            this.steelMat
        );
        extractorSpring.position.set(0.035, -0.01, -0.38);
        this.boltGroup.add(extractorSpring);

        // 5. Charging Handle Shoe (Flat connector plate)
        const handleShoe = new THREE.Mesh(
            new THREE.BoxGeometry(0.038, 0.01, 0.06),
            this.steelMat
        );
        handleShoe.position.set(0, 0.04, -0.25);
        this.boltGroup.add(handleShoe);

        // 6. Cylindrical Charging Handle
        const handleStem = new THREE.Mesh(
            new THREE.CylinderGeometry(0.014, 0.014, 0.08, 12),
            this.steelMat
        );
        handleStem.position.set(0, 0.085, -0.25);
        
        // Gold knurled head on the handle
        const handleKnurl = new THREE.Mesh(
            new THREE.CylinderGeometry(0.018, 0.018, 0.02, 10),
            this.goldMat
        );
        handleKnurl.position.set(0, 0.125, -0.25);
        this.boltGroup.add(handleStem, handleKnurl);

        // 7. Weight reduction slots (Side indentations)
        for (let side of [-1, 1]) {
            const slot = new THREE.Mesh(
                new THREE.BoxGeometry(0.006, 0.03, 0.15),
                this.steelMat
            );
            slot.position.set(0.041 * side, 0.01, -0.15);
            this.boltGroup.add(slot);
        }

        // Visible internal gold casing inside chamber when bolt slides back
        this.casingShow = new THREE.Mesh(
            new THREE.CylinderGeometry(0.035, 0.035, 0.1, 8),
            this.brassMat
        );
        this.casingShow.rotation.x = Math.PI / 2;
        this.casingShow.position.set(0.02, 0.15, -0.1);
        this.upperGroup.add(this.casingShow);

        // === DYNAMIC RECIPROCATING SPRING GROUP ===
        this.springGroup = new THREE.Group();
        this.springGroup.position.set(0, 0.19, 0.0);
        this.chassisGroup.add(this.springGroup);

        // Guide rod inside the slot
        const guideRod = new THREE.Mesh(
            new THREE.CylinderGeometry(0.006, 0.006, 0.52, 6),
            this.chromeMat
        );
        guideRod.rotation.x = Math.PI / 2;
        guideRod.position.set(0, 0, 0.06);
        this.springGroup.add(guideRod);

        // Spring coils (represented as 12 thin Torus geometries)
        this.springCoils = [];
        const coilGeo = new THREE.TorusGeometry(0.016, 0.003, 4, 10);
        for (let i = 0; i < 12; i++) {
            const coil = new THREE.Mesh(coilGeo, this.steelMat);
            coil.rotation.y = Math.PI / 2;
            this.springGroup.add(coil);
            this.springCoils.push(coil);
        }

        // === VOLUMETRIC MUZZLE FLASH ===
        this.flashGroup = new THREE.Group();
        this.flashGroup.position.set(0, 0.15, -1.24); // Aligned with compensator tip
        this.chassisGroup.add(this.flashGroup);

        const flashMat = new THREE.MeshBasicMaterial({
            color: 0xff8833, transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide
        });
        const flashCoreMat = new THREE.MeshBasicMaterial({
            color: 0xffffff, transparent: true, opacity: 1, depthWrite: false
        });

        // 6-star volumetric points
        for (let i = 0; i < 6; i++) {
            const petal = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.28, 4), flashMat);
            petal.position.set(
                Math.sin(i * Math.PI / 3) * 0.08,
                Math.cos(i * Math.PI / 3) * 0.08,
                -0.12
            );
            petal.rotation.z = -i * Math.PI / 3;
            petal.rotation.x = Math.PI / 2;
            this.flashGroup.add(petal);
        }

        const flashCore = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), flashCoreMat);
        this.flashGroup.add(flashCore);
        this.flashGroup.visible = false;
        this.flashMat = flashMat;
        this.flashCoreMat = flashCoreMat;

        // Point light glow
        this.muzzleLight = new THREE.PointLight(0xff7722, 0, 6);
        this.muzzleLight.position.set(0, 0.15, -1.35);
        this.chassisGroup.add(this.muzzleLight);
    }

    fire() {
        // Open-bolt firing: bolt slams forward to 0.0 to fire and chamber!
        this.boltZ = 0.0;
        this.triggerZ = -0.08; // Slams back to pull trigger!
        this.lightIntensity = 3.2;
        this.flashScale = 1.0 + Math.random() * 0.45;
        this.strapSwing = 0.45; // loop pops backward

        // Heat spikes when fired
        this.heat = Math.min(1.0, this.heat + 0.28);

        // Show flash
        this.flashGroup.visible = true;
        this.flashGroup.rotation.z = Math.random() * Math.PI * 2;
        this.flashGroup.scale.setScalar(this.flashScale);

        // Eject shell and play 15Hz submachine gun audio crack
        this.spawnShell();
        this.spawnEjectionSmoke();
        this.playProceduralShot();
    }

    spawnShell() {
        // High fidelity brass cartridge with groove detail
        const shell = new THREE.Group();
        
        const bodyGeo = new THREE.CylinderGeometry(0.014, 0.014, 0.05, 8);
        const rimGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.01, 8);
        const bodyMesh = new THREE.Mesh(bodyGeo, this.brassMat);
        const rimMesh = new THREE.Mesh(rimGeo, this.brassMat);
        bodyMesh.position.y = 0.007;
        rimMesh.position.y = -0.024;
        shell.add(bodyMesh, rimMesh);
        
        shell.castShadow = true;

        // Spawns perfectly from our hollow ejection port on the right side
        const worldPos = new THREE.Vector3(0.08, 0.15, -0.2);
        worldPos.applyMatrix4(this.chassisGroup.matrixWorld);
        shell.position.copy(worldPos);
        shell.rotation.set(Math.random() * 6.28, Math.random() * 6.28, Math.random() * 6.28);

        const target = this.parent || window.scene;
        if (target) target.add(shell);

        // Eject out right and up
        const rightDir = new THREE.Vector3(1, 0, 0).applyQuaternion(this.getWorldQuaternion(new THREE.Quaternion()));
        const upDir = new THREE.Vector3(0, 1, 0).applyQuaternion(this.getWorldQuaternion(new THREE.Quaternion()));
        const ejectSpeed = 4.2 + Math.random() * 1.8;
        const upSpeed = 1.8 + Math.random() * 1.2;

        this.shells.push({
            mesh: shell,
            vx: rightDir.x * ejectSpeed + upDir.x * upSpeed,
            vy: rightDir.y * ejectSpeed + upDir.y * upSpeed + 1.5,
            vz: rightDir.z * ejectSpeed + upDir.z * upSpeed,
            rx: (Math.random() - 0.5) * 18,
            ry: (Math.random() - 0.5) * 18,
            rz: (Math.random() - 0.5) * 18,
            life: 1.8,
            bouncesLeft: 2
        });
    }

    spawnEjectionSmoke() {
        const target = this.parent || window.scene;
        if (!target) return;
        const smokeMat = new THREE.MeshBasicMaterial({ color: 0xaaaaaa, transparent: true, opacity: 0.28, depthWrite: false });
        for (let i = 0; i < 2; i++) {
            const smoke = new THREE.Mesh(new THREE.SphereGeometry(0.008 + Math.random() * 0.015, 4, 4), smokeMat.clone());
            const wp = new THREE.Vector3(0.08, 0.15, -0.2);
            wp.applyMatrix4(this.chassisGroup.matrixWorld);
            smoke.position.copy(wp);
            target.add(smoke);
            this.smokeParticles.push({
                mesh: smoke,
                vx: (Math.random() - 0.3) * 0.4,
                vy: 0.2 + Math.random() * 0.3,
                vz: (Math.random() - 0.5) * 0.2,
                life: 0.4 + Math.random() * 0.2
            });
        }
    }

    _playShellClink() {
        if (!window.audioCtx) return;
        const ctx = window.audioCtx;
        const t = ctx.currentTime;
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.setValueAtTime(3200 + Math.random() * 2000, t);
        o.frequency.exponentialRampToValueAtTime(900, t + 0.025);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.03, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
        o.connect(g).connect(ctx.destination);
        o.start(t); o.stop(t + 0.05);
    }

    playProceduralShot() {
        if (!window.audioCtx) window.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const ctx = window.audioCtx;
        if (ctx.state === 'suspended') ctx.resume();

        const t = ctx.currentTime;

        // Layer 1: MAC-10 high frequency signature snap
        const osc1 = ctx.createOscillator();
        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(2600, t);
        osc1.frequency.exponentialRampToValueAtTime(280, t + 0.015);
        const g1 = ctx.createGain();
        g1.gain.setValueAtTime(0.24, t);
        g1.gain.exponentialRampToValueAtTime(0.001, t + 0.028);
        osc1.connect(g1); g1.connect(ctx.destination);
        osc1.start(t); osc1.stop(t + 0.04);

        // Layer 2: Fast hollow pop thump
        const osc2 = ctx.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(105, t);
        osc2.frequency.exponentialRampToValueAtTime(45, t + 0.04);
        const g2 = ctx.createGain();
        g2.gain.setValueAtTime(0.26, t);
        g2.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
        osc2.connect(g2); g2.connect(ctx.destination);
        osc2.start(t); osc2.stop(t + 0.06);

        // Layer 3: Noise powder explosion burst
        const bufLen = ctx.sampleRate * 0.025;
        const noiseBuf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
        const data = noiseBuf.getChannelData(0);
        for (let i = 0; i < bufLen; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufLen * 0.12));
        const noise = ctx.createBufferSource();
        noise.buffer = noiseBuf;
        const nGain = ctx.createGain();
        nGain.gain.setValueAtTime(0.14, t);
        nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.025);
        const nFilter = ctx.createBiquadFilter();
        nFilter.type = 'bandpass';
        nFilter.frequency.value = 3800;
        nFilter.Q.value = 0.5;
        noise.connect(nFilter);
        nFilter.connect(nGain);
        nGain.connect(ctx.destination);
        noise.start(t); noise.stop(t + 0.035);
    }

    update(dt) {
        // Bolt carrier group reciprocation (blows back to the open resting state of 0.24)
        this.boltZ += (0.24 - this.boltZ) * 32 * dt;
        this.boltGroup.position.z = this.boltZ;

        // Hide internal casing when bolt is fully closed to simulate chambered state
        if (this.casingShow) {
            this.casingShow.visible = (this.boltZ > 0.04);
        }

        // Reciprocating recoil spring coil compression/expansion
        if (this.springCoils) {
            const springStart = this.boltZ - 0.02;
            const springEnd = 0.32;
            const springSpan = springEnd - springStart;
            for (let i = 0; i < this.springCoils.length; i++) {
                const ratio = i / (this.springCoils.length - 1);
                this.springCoils[i].position.z = springStart + ratio * springSpan;
                this.springCoils[i].rotation.x = this.boltZ * 4.0 + ratio * Math.PI * 0.2;
            }
        }

        // Decay thermal heat
        this.heat = Math.max(0.0, this.heat - 1.2 * dt);

        // Update shader uniforms
        if (this.barrelHeatMat && this.barrelHeatMat.uniforms) {
            this.barrelHeatMat.uniforms.uHeat.value = this.heat;
            this.barrelHeatMat.uniforms.uTime.value = (this.barrelHeatMat.uniforms.uTime.value || 0) + dt;
        }
        if (this.compHeatMat && this.compHeatMat.uniforms) {
            this.compHeatMat.uniforms.uHeat.value = this.heat;
            this.compHeatMat.uniforms.uTime.value = (this.compHeatMat.uniforms.uTime.value || 0) + dt;
        }
        if (this.receiverMat && this.receiverMat.uniforms) {
            this.receiverMat.uniforms.uTime.value = (this.receiverMat.uniforms.uTime.value || 0) + dt;
        }

        // Trigger return animation
        this.triggerZ += (-0.12 - this.triggerZ) * 20 * dt;
        this.triggerGroup.position.z = this.triggerZ;

        // Front loop strap hanger swing recoil physics
        this.strapSwing += (0 - this.strapSwing) * 8 * dt;
        this.hangerRing.rotation.x = -this.strapSwing * Math.PI * 0.5;

        // Muzzle light intensity decay
        this.lightIntensity = Math.max(0, this.lightIntensity - 60 * dt);
        this.muzzleLight.intensity = this.lightIntensity;

        // Muzzle flash mesh fade
        this.flashScale *= 0.65;
        if (this.flashScale < 0.05) {
            this.flashGroup.visible = false;
        } else {
            this.flashGroup.scale.setScalar(this.flashScale);
            this.flashMat.opacity = this.flashScale;
            this.flashCoreMat.opacity = Math.min(1, this.flashScale * 2);
        }

        // Casing physical floor bounce & audio clink triggers
        for (let i = this.shells.length - 1; i >= 0; i--) {
            const s = this.shells[i];
            s.vy -= 9.8 * dt;
            s.mesh.position.x += s.vx * dt;
            s.mesh.position.y += s.vy * dt;
            s.mesh.position.z += s.vz * dt;
            s.mesh.rotation.x += s.rx * dt;
            s.mesh.rotation.y += s.ry * dt;
            s.mesh.rotation.z += s.rz * dt;
            
            if (s.mesh.position.y < 0.05 && s.bouncesLeft > 0) {
                s.mesh.position.y = 0.05;
                s.vy = Math.abs(s.vy) * 0.28;
                s.vx *= 0.45;
                s.vz *= 0.45;
                s.rx *= 0.35; s.ry *= 0.35; s.rz *= 0.35;
                s.bouncesLeft--;
                this._playShellClink();
            }
            
            s.life -= dt;
            if (s.life < 0.3) {
                s.mesh.traverse((child) => {
                    if (child.material) {
                        child.material.opacity = s.life / 0.3;
                        child.material.transparent = true;
                    }
                });
            }
            if (s.life <= 0) {
                if (s.mesh.parent) s.mesh.parent.remove(s.mesh);
                s.mesh.traverse((child) => {
                    if (child.geometry) child.geometry.dispose();
                });
                this.shells.splice(i, 1);
            }
        }

        // Smoke particles venting from port
        for (let i = this.smokeParticles.length - 1; i >= 0; i--) {
            const sp = this.smokeParticles[i];
            sp.mesh.position.x += sp.vx * dt;
            sp.mesh.position.y += sp.vy * dt;
            sp.mesh.position.z += sp.vz * dt;
            sp.mesh.scale.multiplyScalar(1 + 1.8 * dt);
            sp.life -= dt;
            sp.mesh.material.opacity = Math.max(0, sp.life * 0.5);
            if (sp.life <= 0) {
                if (sp.mesh.parent) sp.mesh.parent.remove(sp.mesh);
                sp.mesh.geometry.dispose();
                sp.mesh.material.dispose();
                this.smokeParticles.splice(i, 1);
            }
        }
    }
}

window.Pistol = Pistol;
