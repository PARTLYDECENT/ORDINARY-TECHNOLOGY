/**
 * TitanPlayer - Ported Procedural Titan (V3.1) from Babylon.js to Three.js
 * Features: Procedural hierarchy, IK-ready structure, and custom animations.
 */
class TitanPlayer extends THREE.Group {
    constructor(scene, options = {}) {
        super();
        this.name = "titan_player_root";
        this.scene = scene;

        // Settings & State
        this.health = 100;
        this.maxHealth = 100;
        this.isDead = false;
        this.t = Math.random() * 100;

        this.limbHealth = {
            head: 20, torso: 100,
            leftArm: 30, rightArm: 30,
            leftLeg: 40, rightLeg: 40
        };
        this.missingLimbs = {
            leftArm: false, rightArm: false,
            leftLeg: false, rightLeg: false
        };

        this.walkTime = 0;
        this.walkBlend = 0; // Smooth transition
        this.aimPitch = 0;
        this.recoil = 0;
        this.recoilLeft = 0;
        this.recoilRight = 0;
        this._lastFiredRight = false;
        this.fireCooldown = 0;

        this.leftWeaponMesh = null;
        this.rightWeaponMesh = null;

        // Ability System
        this.abilityType = options.abilityType || "dash"; // "dash", "shield", "scan"
        this.abilityCooldown = 0;
        this.abilityMaxCooldown = 10; // 10s base
        this.abilityActiveTime = 0;
        this.isDashing = false;
        this.isShielded = false;
        this.dashDir = new THREE.Vector3();

        this.setupMaterials();
        this.buildGeometry();

        // Add to scene
        this.scene.add(this);

        // Scale to match zombie height (~1.7-1.8 units)
        this.scale.setScalar(0.19);
    }

    setupMaterials() {
        // --- ENHANCED HAZMAT ARMOR SHADER (PBR-LAYERED REALISM) ---
        this.armorMat = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uHealthPct: { value: 1.0 },
                uDamagePulse: { value: 0.0 },
                uColorYellow: { value: new THREE.Color(0xffcc00) },
                uColorBlack: { value: new THREE.Color(0x111111) },
                uColorPulse: { value: new THREE.Color(0xff2200) }
            },
            vertexShader: `
                varying vec3 vNormal;
                varying vec3 vModelPos;
                varying vec3 vViewPos;
                varying vec2 vUv;
                varying vec3 vWorldNormal;
                
                void main() {
                    vUv = uv;
                    vNormal = normalize(normalMatrix * normal);
                    vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
                    vModelPos = position;
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    vViewPos = -mvPosition.xyz;
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                varying vec3 vNormal;
                varying vec3 vModelPos;
                varying vec3 vViewPos;
                varying vec2 vUv;
                varying vec3 vWorldNormal;
                
                uniform float uTime;
                uniform float uHealthPct;
                uniform float uDamagePulse;
                uniform vec3 uColorYellow;
                uniform vec3 uColorBlack;
                uniform vec3 uColorPulse;

                float hash12(vec2 p) {
                    vec3 p3 = fract(vec3(p.xyx) * .1031);
                    p3 += dot(p3, p3.yzx + 33.33);
                    return fract((p3.x + p3.y) * p3.z);
                }
                float hash13(vec3 p3) {
                    p3 = fract(p3 * .1031);
                    p3 += dot(p3, p3.zyx + 31.32);
                    return fract((p3.x + p3.y) * p3.z);
                }
                float noise(in vec2 p) {
                    vec2 i = floor(p); vec2 f = fract(p);
                    vec2 u = f*f*(3.0-2.0*f);
                    return mix(mix(hash12(i+vec2(0,0)),hash12(i+vec2(1,0)),u.x),
                               mix(hash12(i+vec2(0,1)),hash12(i+vec2(1,1)),u.x),u.y);
                }
                float fbm(vec2 x) {
                    float v = 0.0; float a = 0.5;
                    mat2 rot = mat2(cos(0.5),sin(0.5),-sin(0.5),cos(0.5));
                    for (int i = 0; i < 5; ++i) { v += a*noise(x); x = rot*x*2.0+vec2(100.0); a *= 0.5; }
                    return v;
                }
                float smin(float a, float b, float k) {
                    float h = clamp(0.5+0.5*(b-a)/k,0.0,1.0);
                    return mix(b,a,h)-k*h*(1.0-h);
                }

                // Panel seam lines — sharp dark grooves along grid edges
                float panelSeams(vec3 p) {
                    vec3 g = abs(fract(p * 1.2) - 0.5);
                    float seamX = smoothstep(0.02, 0.0, g.x) * smoothstep(0.48, 0.35, g.y);
                    float seamY = smoothstep(0.02, 0.0, g.y) * smoothstep(0.48, 0.35, g.x);
                    float seamZ = smoothstep(0.02, 0.0, g.z) * smoothstep(0.48, 0.35, g.y);
                    return max(seamX, max(seamY, seamZ)) * 0.7;
                }

                // Micro-scratches — directional linear marks
                float scratches(vec3 p) {
                    float s1 = noise(p.xy * 40.0 + vec2(3.7, 1.2));
                    float s2 = noise(p.yz * 35.0 + vec2(7.1, 2.8));
                    float scratch = smoothstep(0.55, 0.58, s1) * 0.4 + smoothstep(0.57, 0.60, s2) * 0.3;
                    return scratch;
                }

                // Dirt/grime in crevices — AO-like darkening
                float dirtLayer(vec3 p, vec3 n) {
                    float cavity = 1.0 - max(0.0, n.y) * 0.5; // More dirt on downward/side faces
                    float grime = fbm(p.xz * 3.0 + p.y * 2.0) * cavity;
                    return smoothstep(0.3, 0.7, grime) * 0.35;
                }

                void main() {
                    vec3 n = normalize(vNormal);
                    vec3 viewDir = normalize(vViewPos);
                    
                    // --- SYNAPTIC PATTERN (preserved) ---
                    float neuralT = uTime * (0.5 + (1.0 - uHealthPct) * 2.0);
                    float pattern = fbm(vModelPos.xy * 2.0 + neuralT * 0.2);
                    pattern = smin(pattern, fbm(vModelPos.yz * 1.5 - neuralT * 0.1), 0.5);
                    
                    // Hazard stripes with soft decal edges
                    float stripe = fract((vModelPos.x + vModelPos.y + vModelPos.z) * 1.5 - uTime * 0.1);
                    float stripeMask = smoothstep(0.46, 0.54, stripe); // Soft edge instead of hard step
                    
                    float bioMask = smoothstep(0.4, 0.6, pattern + (1.0 - uHealthPct) * 0.3);
                    vec3 baseCol = mix(uColorYellow, uColorBlack, stripeMask);
                    
                    // Bruising at low health
                    vec3 bruiseCol = mix(vec3(0.1, 0.0, 0.05), vec3(0.4, 0.0, 0.1), pattern);
                    baseCol = mix(baseCol, bruiseCol, bioMask * (1.0 - uHealthPct));

                    // --- PANEL SEAM LINES ---
                    float seams = panelSeams(vModelPos);
                    baseCol *= (1.0 - seams); // Dark inset grooves

                    // --- SCRATCHES & WEAR ---
                    float scratchVal = scratches(vModelPos);
                    vec3 scratchHighlight = mix(baseCol, vec3(0.7, 0.65, 0.55), scratchVal);
                    baseCol = mix(baseCol, scratchHighlight, 0.6);

                    // --- DIRT/GRIME ACCUMULATION ---
                    float dirt = dirtLayer(vModelPos, vWorldNormal);
                    baseCol = mix(baseCol, vec3(0.06, 0.04, 0.03), dirt);

                    // --- DAMAGE MELTING ---
                    float damageEffect = uDamagePulse * fbm(vModelPos.xz * 10.0 + uTime * 20.0);
                    baseCol = mix(baseCol, uColorPulse, damageEffect);

                    // --- PBR-STYLE LIGHTING ---
                    vec3 l = normalize(vec3(0.5, 1.0, 0.5));
                    float diff = max(0.15, dot(n, l));
                    
                    // Specular highlight (Blinn-Phong)
                    vec3 halfDir = normalize(l + viewDir);
                    float spec = pow(max(0.0, dot(n, halfDir)), 64.0);
                    float wetness = 0.3 + scratchVal * 0.5; // Scratches catch more specular
                    vec3 specColor = vec3(0.9, 0.85, 0.7) * spec * wetness;

                    // Fresnel edge glow
                    float fresnel = pow(1.0 - max(0.0, dot(n, viewDir)), 3.5);
                    vec3 glowColor = mix(uColorYellow, uColorPulse, 1.0 - uHealthPct);
                    
                    // Rim light — subtle environmental bounce
                    float rimLight = pow(1.0 - max(0.0, dot(n, viewDir)), 5.0);
                    vec3 rimCol = vec3(0.15, 0.2, 0.3) * rimLight;

                    vec3 finalCol = baseCol * diff + specColor + glowColor * fresnel * 0.6 + rimCol;
                    
                    // Reconstruction flicker
                    float flicker = step(0.98, hash12(vec2(uTime, 0.0)));
                    finalCol += flicker * 0.15 * (1.0 - uHealthPct);
                    
                    gl_FragColor = vec4(finalCol, 1.0);
                }
            `
        });

        this.frameMat = new THREE.MeshStandardMaterial({
            color: 0x050505, metalness: 0.9, roughness: 0.8
        });
        this.accentMat = new THREE.MeshStandardMaterial({
            color: 0x333333, metalness: 0.9, roughness: 0.2
        });
        this.energyMat = new THREE.MeshStandardMaterial({
            color: 0x000000,
            emissive: new THREE.Color(0.0, 0.6, 1.0),
            emissiveIntensity: 3.5
        });

        // 3D DNA Helix Swirl Materials (Glowing Bio-Tech Aesthetics)
        this.strandAMat = new THREE.MeshStandardMaterial({
            color: 0xff3300,
            emissive: new THREE.Color(1.0, 0.1, 0.0),
            emissiveIntensity: 3.0,
            transparent: true,
            opacity: 0.9
        });
        this.strandBMat = new THREE.MeshStandardMaterial({
            color: 0xcc00ff,
            emissive: new THREE.Color(0.66, 0.0, 1.0),
            emissiveIntensity: 3.0,
            transparent: true,
            opacity: 0.9
        });
        this.rungMat = new THREE.MeshStandardMaterial({
            color: 0xffaa00,
            emissive: new THREE.Color(1.0, 0.4, 0.0),
            emissiveIntensity: 2.0,
            transparent: true,
            opacity: 0.85
        });

        // Modular attachments materials
        this.pistonSleeveMat = new THREE.MeshStandardMaterial({ color: 0x1a1c1e, metalness: 0.9, roughness: 0.4 });
        this.pistonRodMat = new THREE.MeshStandardMaterial({ color: 0xe0e4e8, metalness: 0.95, roughness: 0.05 });
        this.exhaustMat = new THREE.MeshStandardMaterial({
            color: 0x00d5ff, emissive: new THREE.Color(0.0, 0.66, 1.0), emissiveIntensity: 4.5,
            transparent: true, opacity: 0.8, side: THREE.DoubleSide
        });
        this.sensorLensMat = new THREE.MeshStandardMaterial({
            color: 0xff0055, emissive: new THREE.Color(1.0, 0.0, 0.22), emissiveIntensity: 3.5
        });
        this.launcherMat = new THREE.MeshStandardMaterial({ color: 0x1f2226, metalness: 0.8, roughness: 0.5 });
    }

    buildGeometry() {
        const armorMat = this.armorMat;
        const frameMat = this.frameMat;
        const accentMat = this.accentMat;
        const energyMat = this.energyMat;

        // Shared detail materials
        const hydraulicMat = new THREE.MeshStandardMaterial({ color: 0x444c55, metalness: 0.95, roughness: 0.15 });
        const rubberSealMat = new THREE.MeshStandardMaterial({ color: 0x080808, metalness: 0.0, roughness: 0.95 });
        const cableDetailMat = new THREE.MeshStandardMaterial({ color: 0x111820, metalness: 0.4, roughness: 0.6 });
        const edgeBevelMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.85, roughness: 0.3 });
        this.statusLEDs = [];

        // --- ROOT OFFSET ---
        // In Babylon it was droidRoot.position.y = 6.6;
        // We'll use a droidRoot group inside the root.
        const droidRoot = new THREE.Group();
        droidRoot.position.y = 6.6;
        this.add(droidRoot);
        this.droidRoot = droidRoot;

        // --- TORSO ---
        // Note: Babylon CSG is missing, so we'll approximate the "angular/cut" look 
        // with merged boxes/cylinders for a high-fidelity tactical look.
        this.torso = new THREE.Group();
        droidRoot.add(this.torso);

        const torsoBase = new THREE.Mesh(new THREE.BoxGeometry(2.0, 2.4, 1.4), frameMat);
        this.torso.add(torsoBase);

        const shell = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.6, 1.5), armorMat);
        this.torso.add(shell);

        // --- MODULAR BACKPACK & THRUSTER SYSTEMS ---
        this.backpackModule = new THREE.Group();
        this.backpackModule.position.set(0, 0.4, -0.9);
        this.torso.add(this.backpackModule);

        // Backpack Main Chassis
        const packChassis = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.8, 0.6), accentMat);
        this.backpackModule.add(packChassis);

        // --- BACKPACK COOLANT FANS ---
        const fanGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.05, 8);
        fanGeo.rotateX(Math.PI / 2); // Align flat facing backward

        this.fanL = new THREE.Mesh(fanGeo, frameMat);
        this.fanL.position.set(-0.35, 0.4, -0.32);
        this.backpackModule.add(this.fanL);

        this.fanR = this.fanL.clone();
        this.fanR.position.x = 0.35;
        this.backpackModule.add(this.fanR);

        // Add fan blades details
        const bladeGeo = new THREE.BoxGeometry(0.24, 0.04, 0.02);
        for (let b = 0; b < 4; b++) {
            const bladeL = new THREE.Mesh(bladeGeo, accentMat);
            bladeL.rotation.z = (Math.PI / 4) * b;
            bladeL.position.z = 0.03;
            this.fanL.add(bladeL);

            const bladeR = bladeL.clone();
            this.fanR.add(bladeR);
        }

        // Secondary Bio-Reactor Tank
        const bioTank = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 1.2, 16), this.pistonSleeveMat);
        bioTank.position.set(0, 0, 0.2);
        this.backpackModule.add(bioTank);

        const bioTankGlass = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.9, 16), this.rungMat);
        bioTankGlass.position.set(0, 0, 0.22);
        this.backpackModule.add(bioTankGlass);

        // Thruster Nozzles
        const nozzleGeo = new THREE.CylinderGeometry(0.15, 0.22, 0.4, 12);
        nozzleGeo.rotateX(Math.PI / 2); // Point backward along -Z

        this.thrusterL = new THREE.Mesh(nozzleGeo, frameMat);
        this.thrusterL.position.set(-0.6, -0.5, -0.2);
        this.backpackModule.add(this.thrusterL);

        this.thrusterR = this.thrusterL.clone();
        this.thrusterR.position.x = 0.6;
        this.backpackModule.add(this.thrusterR);

        // --- INSTANCED EXHAUST PARTICLES (PORTED FROM SDF MANIPULATOR ARM TECH) ---
        const thrusterDodecaGeo = new THREE.DodecahedronGeometry(0.045, 0);
        this.instancedThrusters = new THREE.InstancedMesh(thrusterDodecaGeo, this.exhaustMat, 300);
        this.instancedThrusters.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        this.backpackModule.add(this.instancedThrusters);

        this.exhaustParticles = [];
        for (let i = 0; i < 300; i++) {
            const isRight = i >= 150;
            this.exhaustParticles.push({
                isRight: isRight,
                age: Math.random(),
                speed: 0.7 + Math.random() * 0.9,
                offset: Math.random() * Math.PI * 2,
                radialAngle: Math.random() * Math.PI * 2,
                maxRadius: 0.12 + Math.random() * 0.14
            });
        }

        // --- CHEST CORE: SWIRLING INSTANCED ENERGY CORE (PORTED FROM SDF MANIPULATOR ARM TECH) ---
        this.chestCore = new THREE.Group();
        this.chestCore.position.set(0, 0.2, 0.75);
        this.torso.add(this.chestCore);

        const coreDodecaGeo = new THREE.DodecahedronGeometry(0.038, 0);
        this.instancedCore = new THREE.InstancedMesh(coreDodecaGeo, energyMat, 180);
        this.instancedCore.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        this.chestCore.add(this.instancedCore);

        this.coreParticles = [];
        for (let i = 0; i < 180; i++) {
            this.coreParticles.push({
                radius: 0.16 + Math.random() * 0.32,
                speed: 1.2 + Math.random() * 2.2,
                phi: Math.random() * Math.PI * 2,
                theta: Math.random() * Math.PI,
                scaleOffset: 0.35 + Math.random() * 0.65,
                offset: Math.random() * Math.PI * 2
            });
        }

        // Chest Light — sinister red glow casting real light (softened)
        this.chestLight = new THREE.PointLight(0xff2200, 0.4, 3.5);
        this.chestCore.add(this.chestLight);

        // --- 3D DNA HELIX SWIRL (DYNAMIC BIO-TECTONIC AESTHETICS) ---
        this.dnaGroup = new THREE.Group();
        this.chestCore.add(this.dnaGroup);

        this.dnaBeadsA = [];
        this.dnaBeadsB = [];
        this.dnaRungs = [];

        const numSteps = 16;
        const helixRadius = 0.68;
        const zStart = -0.28;
        const zEnd = 0.28;
        const totalTurns = 2.5 * Math.PI * 2; // 2.5 turns

        this.dnaBeadGeo = new THREE.SphereGeometry(0.045, 8, 8);
        this.dnaRungGeo = new THREE.CylinderGeometry(0.012, 0.012, 1, 8);
        this.dnaRungGeo.rotateZ(Math.PI / 2); // Orient along X-axis

        for (let i = 0; i < numSteps; i++) {
            const t = i / (numSteps - 1);
            const z = zStart + t * (zEnd - zStart);
            const angle = t * totalTurns;

            // Strand A position
            const xA = helixRadius * Math.cos(angle);
            const yA = helixRadius * Math.sin(angle);

            // Strand B position (180 deg phase shift)
            const xB = helixRadius * Math.cos(angle + Math.PI);
            const yB = helixRadius * Math.sin(angle + Math.PI);

            // Create Bead A
            const beadA = new THREE.Mesh(this.dnaBeadGeo, this.strandAMat);
            beadA.position.set(xA, yA, z);
            this.dnaGroup.add(beadA);
            this.dnaBeadsA.push(beadA);

            // Create Bead B
            const beadB = new THREE.Mesh(this.dnaBeadGeo, this.strandBMat);
            beadB.position.set(xB, yB, z);
            this.dnaGroup.add(beadB);
            this.dnaBeadsB.push(beadB);

            // Create Rung
            const rung = new THREE.Mesh(this.dnaRungGeo, this.rungMat);
            rung.position.set(0, 0, z);
            rung.rotation.z = angle;
            rung.scale.set(helixRadius * 2, 1, 1);
            this.dnaGroup.add(rung);
            this.dnaRungs.push(rung);
        }

        // Vents (enhanced with grille slats)
        for (let i = 0; i < 5; i++) {
            const vent = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.1, 0.3), accentMat);
            vent.position.set(0, 0.8 - (i * 0.25), -0.8);
            vent.rotation.x = 0.2;
            this.torso.add(vent);
            // Grille slat detail inside each vent
            for (let s = 0; s < 4; s++) {
                const slat = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.08, 0.22), frameMat);
                slat.position.set(-0.45 + s * 0.3, 0.8 - (i * 0.25), -0.82);
                slat.rotation.x = 0.3;
                this.torso.add(slat);
            }
        }

        // Torso armor edge bevels
        const bevelGeo = new THREE.BoxGeometry(0.06, 2.7, 0.06);
        for (let side of [-1, 1]) {
            const bevel = new THREE.Mesh(bevelGeo, edgeBevelMat);
            bevel.position.set(1.22 * side, 0, 0.74);
            this.torso.add(bevel);
        }
        const topBevel = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.06, 0.06), edgeBevelMat);
        topBevel.position.set(0, 1.32, 0.74);
        this.torso.add(topBevel);

        // Volumetric glow ring around chest core
        const glowRingGeo = new THREE.TorusGeometry(0.62, 0.04, 8, 32);
        this.chestGlowRing = new THREE.Mesh(glowRingGeo, new THREE.MeshStandardMaterial({
            color: 0x00aaff, emissive: 0x0066cc, emissiveIntensity: 2.5,
            transparent: true, opacity: 0.6
        }));
        this.chestGlowRing.rotation.x = Math.PI / 2;
        this.chestCore.add(this.chestGlowRing);

        // Spine
        this.spineRoot = new THREE.Group();
        droidRoot.add(this.spineRoot);
        for (let i = 0; i < 3; i++) {
            const vertGroup = new THREE.Group();
            vertGroup.position.y = -1.2 - (i * 0.45);
            this.spineRoot.add(vertGroup);
            vertGroup.name = "vert_" + i;

            const vert = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.4, 16), frameMat);
            vert.rotation.z = Math.PI / 2;
            vertGroup.add(vert);

            const vertArmor = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.3, 0.8), accentMat);
            vertArmor.position.set(0, 0, 0.1);
            vertGroup.add(vertArmor);

            // Hydraulic lines between vertebrae
            for (let side of [-1, 1]) {
                const hydLine = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.04, 0.04, 0.42, 8), hydraulicMat
                );
                hydLine.position.set(0.3 * side, -0.22, -0.25);
                vertGroup.add(hydLine);
            }
        }

        // Pelvis
        this.pelvis = new THREE.Group();
        this.pelvis.position.y = -2.6;
        droidRoot.add(this.pelvis);

        const pelvisCore = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.8, 1.2), frameMat);
        this.pelvis.add(pelvisCore);

        const skirtL = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.0, 1.4), armorMat);
        skirtL.position.set(-0.9, 0, 0); skirtL.rotation.z = -0.2;
        this.pelvis.add(skirtL);

        const skirtR = skirtL.clone();
        skirtR.position.x = 0.9; skirtR.rotation.z = 0.2;
        this.pelvis.add(skirtR);

        const skirtF = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.8, 0.3), armorMat);
        skirtF.position.set(0, -0.2, 0.7); skirtF.rotation.x = 0.2;
        this.pelvis.add(skirtF);

        // Head
        this.headRoot = new THREE.Group();
        this.headRoot.position.set(0, 1.6, 0.2);
        this.torso.add(this.headRoot);

        const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.8, 16), frameMat);
        neck.position.y = -0.2;
        this.headRoot.add(neck);

        const headBase = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.0, 1.6), armorMat);
        headBase.position.y = 0.5;
        this.headRoot.add(headBase);

        const visorGlowGeo = new THREE.CylinderGeometry(0.65, 0.65, 0.3, 32, 1, false, 0, 0.6 * Math.PI);
        visorGlowGeo.rotateY(-Math.PI / 2);
        visorGlowGeo.rotateZ(Math.PI / 2);
        const visorGlow = new THREE.Mesh(visorGlowGeo, energyMat);
        visorGlow.position.set(0, 0.6, 0.65);
        this.headRoot.add(visorGlow);

        const earL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.6, 0.6), accentMat);
        earL.position.set(-0.85, 0.5, -0.2);
        this.headRoot.add(earL);
        const earR = earL.clone(); earR.position.x = 0.85;
        this.headRoot.add(earR);

        // --- MODULAR HEAD ACCESSORY: Aux Tracking Sensor Pod ---
        this.auxSensorModule = new THREE.Group();
        this.auxSensorModule.position.set(0.88, 0.8, 0.1);
        this.headRoot.add(this.auxSensorModule);

        // Mounting bracket arm
        const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.12, 0.12), accentMat);
        bracket.position.set(-0.1, 0, 0);
        this.auxSensorModule.add(bracket);

        // Sensor head
        const sensorHeadGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.3, 12);
        this.sensorHeadMesh = new THREE.Mesh(sensorHeadGeo, this.launcherMat);
        this.sensorHeadMesh.position.set(0.08, 0, 0);
        this.auxSensorModule.add(this.sensorHeadMesh);

        // Glowing red target optics lens
        const sensorLensGeo = new THREE.SphereGeometry(0.07, 8, 8);
        this.sensorLensMesh = new THREE.Mesh(sensorLensGeo, this.sensorLensMat);
        this.sensorLensMesh.position.set(0.08, 0, 0.14);
        this.auxSensorModule.add(this.sensorLensMesh);

        // Legs & Arms builders
        this._createLeg = (isRight) => {
            const sign = isRight ? 1 : -1;
            const root = new THREE.Group();
            root.position.set(1.0 * sign, 0, 0);
            this.pelvis.add(root);

            const hip = new THREE.Group();
            root.add(hip);
            const hipMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.8, 16), frameMat);
            hipMesh.rotation.z = Math.PI / 2;
            hip.add(hipMesh);

            const thighFrame = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 2.0, 16), frameMat);
            thighFrame.position.y = -1.0;
            hip.add(thighFrame);

            const thighArmorF = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.8, 0.4), armorMat);
            thighArmorF.position.set(0, -1.0, 0.3); thighArmorF.rotation.x = 0.05;
            hip.add(thighArmorF);

            const knee = new THREE.Group();
            knee.position.y = -2.0;
            hip.add(knee);
            const kneeMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.9, 16), accentMat);
            kneeMesh.rotation.z = Math.PI / 2;
            knee.add(kneeMesh);

            const calfFrame = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 2.0, 16), frameMat);
            calfFrame.position.y = -1.0;
            knee.add(calfFrame);

            const ankle = new THREE.Group();
            ankle.position.y = -2.0;
            knee.add(ankle);
            const ankleJoint = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 16), frameMat);
            ankle.add(ankleJoint);

            const footBase = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.4, 1.2), armorMat);
            footBase.position.set(0, -0.2, 0.2);
            ankle.add(footBase);

            // --- MODULAR HYDRAULIC CALF PISTONS ---
            const pistonUpperMount = new THREE.Group();
            pistonUpperMount.position.set(0.0, -0.3, -0.3);
            knee.add(pistonUpperMount);

            const pistonLowerMount = new THREE.Group();
            pistonLowerMount.position.set(0.0, -0.05, -0.3);
            ankle.add(pistonLowerMount);

            const sleeveGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.8, 8);
            sleeveGeo.rotateX(Math.PI / 2); // Orient along Z-axis
            sleeveGeo.translate(0, 0, 0.4); // Pivot at the mount point
            const sleeve = new THREE.Mesh(sleeveGeo, this.pistonSleeveMat);
            pistonUpperMount.add(sleeve);

            const rodGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.8, 8);
            rodGeo.rotateX(Math.PI / 2); // Orient along Z-axis
            rodGeo.translate(0, 0, 0.4); // Pivot at the mount point
            const rod = new THREE.Mesh(rodGeo, this.pistonRodMat);
            pistonLowerMount.add(rod);

            return { root, hip, knee, ankle, pistonUpperMount, pistonLowerMount, sleeve, rod };
        };
        this._createArm = (isRight) => {
            const sign = isRight ? 1 : -1;
            const root = new THREE.Group();
            root.position.set(1.5 * sign, 1.0, 0);
            this.torso.add(root);

            const shoulder = new THREE.Group();
            root.add(shoulder);
            const shoulderJoint = new THREE.Mesh(new THREE.SphereGeometry(0.45, 16, 16), frameMat);
            shoulder.add(shoulderJoint);

            for (let i = 0; i < 3; i++) {
                const pauldron = new THREE.Mesh(new THREE.SphereGeometry(0.6 + (i * 0.05), 16, 16, 0, Math.PI * 2, 0, Math.PI / 2), armorMat);
                pauldron.rotation.z = (Math.PI / 12) * sign * i;
                pauldron.position.set(0.1 * sign * i, 0.1 - (i * 0.05), 0);
                shoulder.add(pauldron);
            }

            // Status LED on shoulder pauldron
            const shoulderLED = new THREE.Mesh(
                new THREE.SphereGeometry(0.06, 8, 8),
                new THREE.MeshBasicMaterial({ color: 0x00ff44 })
            );
            shoulderLED.position.set(0.2 * sign, 0.55, 0.3);
            shoulder.add(shoulderLED);
            this.statusLEDs.push(shoulderLED);

            // --- MODULAR SHOULDER LAUNCHER POD ---
            const launcherPod = new THREE.Group();
            launcherPod.position.set(0, 0.65, 0.1);
            shoulder.add(launcherPod);

            const launcherBox = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.35, 0.5), this.launcherMat);
            launcherPod.add(launcherBox);

            // Launcher tubes (3 tubes in a row)
            for (let t = 0; t < 3; t++) {
                const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.25, 8), frameMat);
                tube.rotateX(Math.PI / 2); // Point forward along Z
                tube.position.set(-0.14 + t * 0.14, 0, 0.18);
                launcherPod.add(tube);
            }

            const bicepFrame = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 1.6, 16), frameMat);
            bicepFrame.position.y = -0.8;
            shoulder.add(bicepFrame);

            // Cable bundles running shoulder to elbow
            for (let c = 0; c < 2; c++) {
                const cable = new THREE.Mesh(
                     new THREE.CylinderGeometry(0.03, 0.03, 1.5, 6), cableDetailMat
                );
                cable.position.set(0.12 * sign + c * 0.06 * sign, -0.8, -0.12);
                shoulder.add(cable);
            }

            const elbow = new THREE.Group();
            elbow.position.y = -1.6;
            shoulder.add(elbow);
            const elbowJoint = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.7, 16), accentMat);
            elbowJoint.rotation.z = Math.PI / 2;
            elbow.add(elbowJoint);

            // Rubber gasket seal at elbow joint
            const elbowSeal = new THREE.Mesh(
                new THREE.TorusGeometry(0.32, 0.03, 8, 16), rubberSealMat
            );
            elbowSeal.rotation.x = Math.PI / 2;
            elbow.add(elbowSeal);

            // Forearm status LED
            const forearmLED = new THREE.Mesh(
                new THREE.SphereGeometry(0.04, 8, 8),
                new THREE.MeshBasicMaterial({ color: 0x00ff44 })
            );
            forearmLED.position.set(0.15 * sign, -0.8, 0.15);
            elbow.add(forearmLED);
            this.statusLEDs.push(forearmLED);

            // Forearm energy shield projection (Melee block shield)
            const shieldProjGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.1, 16, 1, true);
            shieldProjGeo.rotateX(Math.PI / 2);
            const wristShield = new THREE.Mesh(shieldProjGeo, new THREE.MeshStandardMaterial({
                color: 0x00ff88, emissive: new THREE.Color(0.0, 0.73, 0.33), emissiveIntensity: 2.0,
                transparent: true, opacity: 0.0, side: THREE.DoubleSide
            }));
            wristShield.position.set(0, -0.4, 0);
            wristShield.visible = false;
            elbow.add(wristShield);

            const hand = new THREE.Group();
            hand.position.y = -1.7;
            elbow.add(hand);
            const palm = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 16), frameMat);
            hand.add(palm);

            // Wrist seal ring
            const wristSeal = new THREE.Mesh(
                new THREE.TorusGeometry(0.22, 0.035, 8, 16), rubberSealMat
            );
            wristSeal.rotation.x = Math.PI / 2;
            wristSeal.position.y = 0.15;
            hand.add(wristSeal);
            return { root, shoulder, elbow, hand, launcherPod, wristShield };
        };

        this.rightLeg = this._createLeg(true);
        this.leftLeg = this._createLeg(false);
        this.rightArm = this._createArm(true);
        this.leftArm = this._createArm(false);

        // Initial Pose
        this.rightLeg.hip.rotation.x = 0.15; this.rightLeg.knee.rotation.x = -0.3; this.rightLeg.ankle.rotation.x = 0.15;
        this.leftLeg.hip.rotation.x = 0.15; this.leftLeg.knee.rotation.x = -0.3; this.leftLeg.ankle.rotation.x = 0.15;
        this.rightArm.shoulder.rotation.z = 0.25; this.rightArm.shoulder.rotation.x = 0.1; this.rightArm.elbow.rotation.x = -0.4;
        this.leftArm.shoulder.rotation.z = -0.25; this.leftArm.shoulder.rotation.x = 0.1; this.leftArm.elbow.rotation.x = -0.4;

        // --- INSTANCED NEURAL ARMOR VEINS (PORTED FROM SDF MANIPULATOR ARM TECH) ---
        const veinDodecaGeo = new THREE.DodecahedronGeometry(0.028, 0);
        this.instancedVeins = new THREE.InstancedMesh(veinDodecaGeo, energyMat, 240);
        this.instancedVeins.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        this.add(this.instancedVeins);

        this.veinSegments = [
            this.leftLeg.hip,
            this.leftLeg.knee,
            this.rightLeg.hip,
            this.rightLeg.knee,
            this.leftArm.shoulder,
            this.leftArm.elbow,
            this.rightArm.shoulder,
            this.rightArm.elbow
        ];
    }

    update(dt) {
        if (this.isDead) return;
        this.t += dt;

        // Check if melee weapon is currently active
        let isMeleeActive = false;
        if (window.inventory && window.currentWeaponIdx !== undefined) {
            const activeW = window.inventory[window.currentWeaponIdx];
            if (activeW && activeW.isMelee) {
                isMeleeActive = true;
            }
        }

        // Update Shader Time & Health State
        if (this.armorMat && this.armorMat.uniforms) {
            this.armorMat.uniforms.uTime.value = this.t;
            this.armorMat.uniforms.uHealthPct.value = this.health / this.maxHealth;

            // Damage pulse decay
            if (this.armorMat.uniforms.uDamagePulse.value > 0) {
                this.armorMat.uniforms.uDamagePulse.value *= Math.pow(0.01, dt * 2.0);
            }
        }

        // --- STATUS LED COLOR (health-reactive) ---
        const hPct = this.health / this.maxHealth;
        const ledColor = hPct > 0.6 ? 0x00ff44 : (hPct > 0.3 ? 0xffaa00 : 0xff2200);
        if (this.statusLEDs) {
            const ledBrightness = 0.7 + Math.sin(this.t * 4.0) * 0.3;
            this.statusLEDs.forEach(led => {
                led.material.color.setHex(ledColor);
                led.scale.setScalar(ledBrightness);
            });
        }

        // --- CHEST GLOW RING PULSE ---
        if (this.chestGlowRing) {
            const glowPulse = 1.5 + Math.sin(this.t * 3.0) * 1.0 + (1.0 - hPct) * 2.0;
            this.chestGlowRing.material.emissiveIntensity = glowPulse;
            this.chestGlowRing.material.opacity = 0.4 + Math.sin(this.t * 2.5) * 0.15;
        }

        // --- BREATHING ANIMATION ---
        if (this.torso) {
            const breathCycle = Math.sin(this.t * 1.9) * 0.008; // ~0.3Hz
            this.torso.scale.set(1.0 - breathCycle * 0.5, 1.0 + breathCycle, 1.0 - breathCycle * 0.5);
        }

        // --- ANIMATING HYDRAULIC CALF PISTONS ---
        const updatePiston = (leg) => {
            if (!leg || !leg.pistonUpperMount || !leg.pistonLowerMount || !leg.sleeve || !leg.rod) return;
            const pUpper = new THREE.Vector3();
            const pLower = new THREE.Vector3();
            leg.pistonUpperMount.getWorldPosition(pUpper);
            leg.pistonLowerMount.getWorldPosition(pLower);

            leg.sleeve.lookAt(pLower);
            leg.rod.lookAt(pUpper);
        };
        updatePiston(this.leftLeg);
        updatePiston(this.rightLeg);

        // --- ANIMATING HEAD SENSOR SCANNING ---
        if (this.sensorHeadMesh) {
            this.sensorHeadMesh.rotation.y = Math.sin(this.t * 3.2) * 0.6;
        }

        // --- UPDATE INSTANCED FLOWING THRUSTER PARTICLES (PORTED FROM SDF MANIPULATOR ARM TECH) ---
        if (this.instancedThrusters && this.exhaustParticles) {
            const dummy = new THREE.Object3D();
            const colorObj = new THREE.Color();
            const maxLen = this.isDashing ? 3.2 : 1.2;

            for (let i = 0; i < 300; i++) {
                const p = this.exhaustParticles[i];
                p.age += dt * p.speed * (this.isDashing ? 1.5 : 1.0);
                if (p.age > 1.0) {
                    p.age = 0.0;
                    p.radialAngle = Math.random() * Math.PI * 2;
                }

                // Determine start position based on nozzle
                const startX = p.isRight ? 0.6 : -0.6;
                const startY = -0.5;
                const startZ = -0.2;

                // Expand outward radially along age (forming a cone)
                const coneRad = p.age * p.maxRadius * (this.isDashing ? 1.4 : 0.9);
                const localX = startX + Math.cos(p.radialAngle) * coneRad;
                const localY = startY + Math.sin(p.radialAngle) * coneRad;
                const localZ = startZ - p.age * maxLen;

                dummy.position.set(localX, localY, localZ);

                // Rotate individual nodes slightly for visual variance
                dummy.rotation.set(
                    this.t * p.speed + p.offset,
                    this.t * p.speed * 0.9 + p.offset,
                    0
                );

                // Scale shrinks as particle ages
                const scale = (1.0 - p.age) * (this.isDashing ? 1.5 : 0.8) * (0.8 + Math.sin(this.t * 12.0 + p.offset) * 0.2);
                dummy.scale.setScalar(scale);
                dummy.updateMatrix();
                this.instancedThrusters.setMatrixAt(i, dummy.matrix);

                // Color gradient transition (white hot cyan -> deep cyan -> fading indigo/purple)
                if (p.age < 0.2) {
                    colorObj.setHSL(0.52 + Math.sin(this.t * 3) * 0.03, 0.9, 0.9); // White hot cyan
                } else if (p.age < 0.65) {
                    colorObj.setHSL(0.52, 0.95, 0.55); // Intense cyan
                } else {
                    colorObj.setHSL(0.62, 0.85, 0.35 * (1.0 - p.age) / 0.35); // Fade to purple/indigo
                }
                this.instancedThrusters.setColorAt(i, colorObj);
            }
            this.instancedThrusters.instanceMatrix.needsUpdate = true;
            if (this.instancedThrusters.instanceColor) {
                this.instancedThrusters.instanceColor.needsUpdate = true;
            }
        }

        // --- UPDATE SWIRLING INSTANCED REACTOR CORE (PORTED FROM SDF MANIPULATOR ARM TECH) ---
        if (this.instancedCore && this.coreParticles) {
            const dummy = new THREE.Object3D();
            const colorObj = new THREE.Color();
            const isMelee = isMeleeActive;

            for (let i = 0; i < 180; i++) {
                const p = this.coreParticles[i];
                // Rotate sphere angles
                p.phi += dt * p.speed * (isMelee ? 2.2 : 1.0);
                p.theta += dt * (p.speed * 0.2) * Math.sin(this.t * 0.5);

                // Swirl mathematical projection (adding dynamic noise breathing)
                const breathFactor = 1.0 + Math.sin(this.t * 4.5 + p.offset) * 0.08;
                const r = p.radius * breathFactor;
                const localX = r * Math.sin(p.theta) * Math.cos(p.phi);
                const localY = r * Math.sin(p.theta) * Math.sin(p.phi);
                const localZ = r * Math.cos(p.theta);

                dummy.position.set(localX, localY, localZ);
                dummy.rotation.set(
                    p.phi * 0.5,
                    p.theta * 0.5,
                    this.t * p.scaleOffset
                );

                // Scale pulse
                const pulseScale = p.scaleOffset * (0.85 + Math.sin(this.t * 3.5 + p.offset) * 0.15) * (isMelee ? 1.35 : 0.9);
                dummy.scale.setScalar(pulseScale);
                dummy.updateMatrix();
                this.instancedCore.setMatrixAt(i, dummy.matrix);

                // Synaptic glowing colors: Outer shell changes color based on health,
                // Inner core veins glow super bright white-hot cyan
                const isVein = p.radius < 0.23;
                if (isVein) {
                    const veinPulse = 0.5 + Math.sin(this.t * 8.0 + p.offset) * 0.5;
                    colorObj.setHSL(0.52, 0.95, 0.65 + veinPulse * 0.35); // White hot cyan nerve line
                } else {
                    // Blend outer shell from cyan (healthy) to green (healing) to orange/red (low health)
                    const healthPct = this.health / this.maxHealth;
                    if (healthPct > 0.6) {
                        // Cyan to teal
                        colorObj.setHSL(0.52 + (1.0 - healthPct) * 0.1, 0.9, 0.45 + Math.sin(this.t * 2.0 + p.offset) * 0.1);
                    } else if (healthPct > 0.3) {
                        // Yellow/orange
                        colorObj.setHSL(0.08 + (healthPct - 0.3) * 0.1, 0.9, 0.45);
                    } else {
                        // Flashing red
                        const redFlash = 0.4 + Math.sin(this.t * 12.0) * 0.4;
                        colorObj.setHSL(0.0, 0.95, 0.2 + redFlash);
                    }
                }
                this.instancedCore.setColorAt(i, colorObj);
            }
            this.instancedCore.instanceMatrix.needsUpdate = true;
            if (this.instancedCore.instanceColor) {
                this.instancedCore.instanceColor.needsUpdate = true;
            }
        }

        // --- UPDATE INSTANCED NEURAL ARMOR VEINS (PORTED FROM SDF MANIPULATOR ARM TECH) ---
        if (this.instancedVeins && this.veinSegments) {
            const dummy = new THREE.Object3D();
            const colorObj = new THREE.Color();
            const tempWPos = new THREE.Vector3();

            for (let i = 0; i < 240; i++) {
                const segIdx = Math.floor(i / 30);
                const subIdx = i % 30;
                const parentGroup = this.veinSegments[segIdx];
                if (!parentGroup) continue;

                const len = segIdx < 4 ? 2.0 : (segIdx % 2 === 0 ? 1.6 : 1.4);
                // Interpolate along the bone Y-axis
                const tSegment = subIdx / 29;
                const localY = -tSegment * len;

                // Slightly offset position outwards so it sits on the armor surface/frame
                const localX = Math.sin(subIdx * 1.5) * 0.16 + (segIdx % 2 === 0 ? 0.22 : 0.16);
                const localZ = Math.cos(subIdx * 1.5) * 0.16;

                tempWPos.set(localX, localY, localZ);
                parentGroup.localToWorld(tempWPos);
                this.worldToLocal(tempWPos);

                dummy.position.copy(tempWPos);
                dummy.rotation.set(0, 0, 0);

                // Small node size
                const wave = Math.sin(this.t * 6.0 - tSegment * Math.PI * 4.0);
                const scale = 0.5 + wave * 0.25;
                dummy.scale.setScalar(scale);
                dummy.updateMatrix();
                this.instancedVeins.setMatrixAt(i, dummy.matrix);

                // Cyber green/cyan flow color
                colorObj.setHSL(0.50 + wave * 0.04, 0.95, 0.4 + wave * 0.2);
                this.instancedVeins.setColorAt(i, colorObj);
            }
            this.instancedVeins.instanceMatrix.needsUpdate = true;
            if (this.instancedVeins.instanceColor) {
                this.instancedVeins.instanceColor.needsUpdate = true;
            }
        }

        // --- WEAPON CATEGORY MORPHING & SHIELD ACTIVATION ---

        // Morph pauldrons/launchers and forearm shields
        const morphArm = (arm, isMelee) => {
            if (!arm) return;
            if (isMelee) {
                // Retract/fold down shoulder rocket pods
                if (arm.launcherPod) {
                    arm.launcherPod.rotation.x += (Math.PI / 3 - arm.launcherPod.rotation.x) * Math.min(1, dt * 6.0);
                }
                // Activate forearm projection shield
                if (arm.wristShield) {
                    arm.wristShield.visible = true;
                    arm.wristShield.material.opacity += (0.45 - arm.wristShield.material.opacity) * Math.min(1, dt * 8.0);
                    // Pulsate forearm shield
                    const pScale = 1.0 + Math.sin(this.t * 12.0) * 0.08;
                    arm.wristShield.scale.set(pScale, 1.0, pScale);
                }
            } else {
                // Extend rocket pods forward
                if (arm.launcherPod) {
                    arm.launcherPod.rotation.x += (-Math.PI / 12 - arm.launcherPod.rotation.x) * Math.min(1, dt * 6.0);
                }
                // Fade out forearm projection shield
                if (arm.wristShield) {
                    arm.wristShield.material.opacity += (0.0 - arm.wristShield.material.opacity) * Math.min(1, dt * 8.0);
                    if (arm.wristShield.material.opacity < 0.01) {
                        arm.wristShield.visible = false;
                    }
                }
            }
        };
        morphArm(this.leftArm, isMeleeActive);
        morphArm(this.rightArm, isMeleeActive);

        // --- SPINNING BACKPACK COOLING FANS ---
        if (this.fanL && this.fanR) {
            const fanSpeed = isMeleeActive ? 3.0 : 12.0 + (this.recoil * 15.0);
            this.fanL.rotation.y += fanSpeed * dt;
            this.fanR.rotation.y -= fanSpeed * dt;
        }

        // --- EMERGENCY COOLANT STEAM VENTING ---
        if (hPct < 0.40 && Math.random() < 0.25) {
            if (typeof emitParticle === 'function') {
                const wPosL = new THREE.Vector3();
                const wPosR = new THREE.Vector3();
                if (this.thrusterL && this.thrusterR) {
                    this.thrusterL.getWorldPosition(wPosL);
                    this.thrusterR.getWorldPosition(wPosR);

                    // Vent steam particles
                    emitParticle(wPosL.x, wPosL.y, wPosL.z,
                        (Math.random() - 0.5) * 1.0, 0.5 + Math.random() * 0.8, -1.0 - Math.random() * 0.5,
                        0.4, 0.4, 0.45, 1, 0.5);
                    emitParticle(wPosR.x, wPosR.y, wPosR.z,
                        (Math.random() - 0.5) * 1.0, 0.5 + Math.random() * 0.8, -1.0 - Math.random() * 0.5,
                        0.4, 0.4, 0.45, 1, 0.5);
                }
            }
        }

        // Ability Cooldown & Active Durations
        if (this.abilityCooldown > 0) this.abilityCooldown -= dt;
        if (this.abilityActiveTime > 0) {
            this.abilityActiveTime -= dt;
            if (this.abilityActiveTime <= 0) {
                this.isDashing = false;
                this.isShielded = false;
                if (this.shieldMesh) this.shieldMesh.visible = false;
            }
        }

        // Apply Dashing Force
        if (this.isDashing) {
            this.position.addScaledVector(this.dashDir, 45 * dt);
            // Spawn dash particles
            if (typeof emitParticle === 'function') {
                emitParticle(this.position.x, this.position.y + 0.5, this.position.z,
                    (Math.random() - 0.5) * 2, Math.random(), (Math.random() - 0.5) * 2,
                    0.1, 0.6, 1.0, 3, 0.2);
            }
        }

        // --- UPDATE INSTANCED BIOMORPHIC SHIELD BUBBLE (PORTED FROM SDF MANIPULATOR ARM TECH) ---
        if (this.isShielded && this.instancedShield && this.shieldParticles) {
            const dummy = new THREE.Object3D();
            const colorObj = new THREE.Color();
            
            // Check damage pulse for forcefield ripple
            const damagePulse = this.armorMat && this.armorMat.uniforms ? this.armorMat.uniforms.uDamagePulse.value : 0.0;

            for (let i = 0; i < 320; i++) {
                const p = this.shieldParticles[i];
                p.phi += dt * p.speed * 0.6; // Swirl around sphere

                // Base radius with breathing pulse
                const pulseRadius = 1.55 + Math.sin(this.t * 4.0 + p.offset) * 0.08;
                // Deform radius if hit (vibrates the shell)
                const deform = damagePulse * 0.22 * Math.sin(this.t * 28.0 + p.offset);
                const r = (pulseRadius + deform) * p.radiusOffset;

                const localX = r * Math.sin(p.theta) * Math.cos(p.phi);
                const localY = r * Math.sin(p.theta) * Math.sin(p.phi);
                const localZ = r * Math.cos(p.theta);

                dummy.position.set(localX, localY, localZ);
                dummy.rotation.set(
                    p.phi * 0.4,
                    p.theta * 0.4,
                    this.t * 0.5
                );

                // Shrink and flicker particle scale near boundaries
                const scaleFactor = 0.85 + Math.sin(this.t * 6.0 + p.offset) * 0.15;
                dummy.scale.setScalar(scaleFactor);
                dummy.updateMatrix();
                this.instancedShield.setMatrixAt(i, dummy.matrix);

                // Emissive color flash: cyber blue/cyan with synapse white-hot ripples when damaged
                const flash = Math.sin(this.t * 8.0 + p.offset) * 0.3;
                if (damagePulse > 0.1) {
                    colorObj.setHSL(0.55, 0.95, 0.5 + damagePulse * 0.45); // Flash white-cyan
                } else {
                    colorObj.setHSL(0.56 + flash * 0.04, 0.95, 0.45 + flash * 0.15); // Pulsing cyber blue
                }
                this.instancedShield.setColorAt(i, colorObj);
            }
            this.instancedShield.instanceMatrix.needsUpdate = true;
            if (this.instancedShield.instanceColor) {
                this.instancedShield.instanceColor.needsUpdate = true;
            }
        }

        this.animateNPC(dt);

        // --- LOW-HEALTH ARMOR PLATE TREMORS & SAGGING ---
        if (hPct < 0.35 && hPct > 0) {
            const tremorIntensity = (1.0 - hPct / 0.35) * 0.08;
            const noiseX = (Math.random() - 0.5) * tremorIntensity;
            const noiseY = (Math.random() - 0.5) * tremorIntensity;
            const noiseZ = (Math.random() - 0.5) * tremorIntensity;

            // Apply tremor to shoulders
            if (this.leftArm && this.leftArm.shoulder) {
                this.leftArm.shoulder.rotation.x += noiseX;
                this.leftArm.shoulder.rotation.y += noiseY;
                this.leftArm.shoulder.rotation.z += noiseZ;
            }
            if (this.rightArm && this.rightArm.shoulder) {
                this.rightArm.shoulder.rotation.x += noiseY;
                this.rightArm.shoulder.rotation.y += noiseZ;
                this.rightArm.shoulder.rotation.z += noiseX;
            }
            // Torso compromise sag
            if (this.torso) {
                this.torso.rotation.x += tremorIntensity * 0.5; // Sag forward
                this.torso.rotation.z += noiseZ * 0.3;          // Shiver
            }
        }

        // Pulse energy & Link to Health
        if (this.energyMat) {
            const healthFactor = this.health / this.maxHealth;
            const pulseSpeed = 5.0 + (1.0 - healthFactor) * 10.0; // Faster pulse when low health
            const intensityBase = 2.0 + (1.0 - healthFactor) * 4.0;

            this.energyMat.emissiveIntensity = intensityBase + Math.sin(this.t * pulseSpeed) * (1.5 + (1.0 - healthFactor) * 2.0);

            if (this.chestLight) {
                this.chestLight.intensity = this.energyMat.emissiveIntensity * 0.03;
                // Shift light color from blue to red as health drops
                this.chestLight.color.setRGB(1.0 - healthFactor, healthFactor * 0.6, healthFactor);
            }

            // Animate 3D DNA Helix (Rotation & dynamic physical/emissive wave)
            if (this.dnaGroup) {
                // Continuous rotation of the helix
                this.dnaGroup.rotation.z += dt * 2.5;

                // Wave propagation speed increases as health drops
                const waveSpeed = 6.0 + (1.0 - healthFactor) * 12.0;

                // Synchronized global emissive pulse
                const pulse = Math.sin(this.t * pulseSpeed);
                if (this.strandAMat) this.strandAMat.emissiveIntensity = 3.0 + pulse * 1.5;
                if (this.strandBMat) this.strandBMat.emissiveIntensity = 3.0 + pulse * 1.5;
                if (this.rungMat) this.rungMat.emissiveIntensity = 2.0 + pulse * 1.0;

                // Individual scale/wave animation along Z
                const helixRadius = 0.68;
                for (let i = 0; i < this.dnaBeadsA.length; i++) {
                    const beadA = this.dnaBeadsA[i];
                    const beadB = this.dnaBeadsB[i];
                    const rung = this.dnaRungs[i];

                    const zOffset = beadA.position.z * 12.0;
                    const waveVal = Math.sin(this.t * waveSpeed + zOffset);
                    const scaleFactor = 1.0 + 0.3 * waveVal;

                    beadA.scale.setScalar(scaleFactor);
                    beadB.scale.setScalar(scaleFactor);

                    // Rung scale connects the pulsing beads seamlessly
                    rung.scale.set(helixRadius * 2 * (1.0 + 0.08 * waveVal), scaleFactor * 0.8, scaleFactor * 0.8);
                }
            }
        }

        if (this.recoil > 0) this.recoil *= Math.pow(0.0001, dt);
        if (this.recoilLeft > 0) this.recoilLeft *= Math.pow(0.0001, dt);
        if (this.recoilRight > 0) this.recoilRight *= Math.pow(0.0001, dt);
    }

    setFPSMode(enabled) {
        if (this.headRoot) this.headRoot.visible = !enabled;
    }

    fire() {
        this.recoil = 0.5;
        this._lastFiredRight = !this._lastFiredRight;
    }

    animateNPC(dt) {
        const wSpeed = 3.5;
        const wT = this.walkTime * wSpeed;
        const iT = this.t;

        const wBounce = Math.cos(wT * 2);
        const rHip = Math.sin(wT); const rSwing = Math.max(0, Math.cos(wT));
        const lHip = Math.sin(wT + Math.PI); const lSwing = Math.max(0, Math.cos(wT + Math.PI));
        const iBounce = Math.sin(this.t * 2);

        // Root Y Swagger (6.6 is base)
        const rootWalkY = 6.6 + wBounce * 0.18;
        const rootIdleY = 6.6;
        this.droidRoot.position.y = THREE.MathUtils.lerp(rootIdleY, rootWalkY, this.walkBlend);

        // Pelvis & Spine
        if (this.pelvis) {
            this.pelvis.rotation.y = THREE.MathUtils.lerp(0, Math.sin(wT) * 0.22, this.walkBlend);
            this.pelvis.rotation.z = THREE.MathUtils.lerp(0, -Math.cos(wT) * 0.08, this.walkBlend);
        }

        this.spineRoot.children.forEach((vertGroup, index) => {
            const walkVertY = -Math.sin(wT) * 0.08 * (index + 1);
            const walkVertX = -wBounce * 0.03 * (index + 1);
            vertGroup.rotation.y = THREE.MathUtils.lerp(0, walkVertY, this.walkBlend);
            vertGroup.rotation.x = THREE.MathUtils.lerp(-iBounce * 0.01 * (index + 1), walkVertX, this.walkBlend);
        });

        // Torso & Head
        const walkTorsoX = 0.1 - wBounce * 0.05;
        const walkTorsoY = -Math.sin(wT) * 0.15;
        const idleTorsoX = 0.1 - iBounce * 0.02;
        const idleTorsoY = -Math.sin(iT) * 0.05;

        this.torso.rotation.x = THREE.MathUtils.lerp(idleTorsoX + this.aimPitch, walkTorsoX + this.aimPitch, this.walkBlend);
        this.torso.rotation.y = THREE.MathUtils.lerp(idleTorsoY, walkTorsoY, this.walkBlend);
        this.torso.position.y = THREE.MathUtils.lerp(iBounce * 0.05, 0, this.walkBlend);

        this.headRoot.rotation.x = THREE.MathUtils.lerp(iBounce * 0.05 + this.aimPitch, wBounce * 0.05 + this.aimPitch, this.walkBlend);
        this.headRoot.rotation.y = THREE.MathUtils.lerp(Math.sin(iT) * 0.1, Math.sin(wT) * 0.1, this.walkBlend);

        // Legs
        const lerpLegs = (leg, hipVal, swingVal) => {
            const walkHip = 0.15 + hipVal * 0.65;
            const walkKnee = -0.3 + swingVal * 1.1;
            const walkAnkle = 0.15 - (walkHip - 0.15) - (walkKnee + 0.3) + (swingVal * 0.2);
            leg.hip.rotation.x = THREE.MathUtils.lerp(0.15, walkHip, this.walkBlend);
            leg.knee.rotation.x = THREE.MathUtils.lerp(-0.3, walkKnee, this.walkBlend);
            leg.ankle.rotation.x = THREE.MathUtils.lerp(0.15, walkAnkle, this.walkBlend);
        };
        lerpLegs(this.rightLeg, rHip, rSwing);
        lerpLegs(this.leftLeg, lHip, lSwing);

        // Arms
        const currentAimOffset = this.walkBlend > 0.1 ? -0.3 : -0.5; // Raise arms if moving/aiming
        const lerpArms = (arm, hipVal, isRight) => {
            const sign = isRight ? 1 : -1;
            const walkS_X = 0.1 - hipVal * 0.5;
            const walkS_Z = (0.25 * sign) + Math.cos(wT) * 0.05 * sign;
            const walkE_X = -0.4 - Math.max(0, hipVal) * 0.4;

            let armRecoil = (isRight === this._lastFiredRight) ? this.recoil : 0;
            let specificRecoil = isRight ? this.recoilRight : this.recoilLeft;
            let totalRecoil = armRecoil + specificRecoil;

            arm.shoulder.rotation.x = THREE.MathUtils.lerp(0.1 + currentAimOffset, walkS_X + currentAimOffset, this.walkBlend) - totalRecoil + (this.switchArmOffset || 0);
            arm.shoulder.rotation.z = THREE.MathUtils.lerp(0.25 * sign, walkS_Z, this.walkBlend);
            arm.elbow.rotation.x = THREE.MathUtils.lerp(-0.4, walkE_X, this.walkBlend) - totalRecoil + (this.switchArmOffset || 0);
        };
        lerpArms(this.rightArm, rHip, true);
        lerpArms(this.leftArm, lHip, false);
    }

    takeDamage(amount, region = "torso") {
        if (this.isDead) return;
        this.health -= amount;

        // Trigger surface mutation pulse
        if (this.armorMat && this.armorMat.uniforms) {
            this.armorMat.uniforms.uDamagePulse.value = 1.0;
        }

        if (this.limbHealth[region] !== undefined) {
            this.limbHealth[region] -= amount;
            if (this.limbHealth[region] <= 0 && !this.missingLimbs[region]) {
                this.checkLimbDestruction(region);
            }
        }

        if (this.health <= 0) this.die();
    }

    checkLimbDestruction(region) {
        if (region === "leftArm" || region === "rightArm") {
            this.missingLimbs[region] = true;
            this.detachLimb(region === "leftArm" ? this.leftArm : this.rightArm);
        }
    }

    detachLimb(limb) {
        if (!limb || !limb.root) return;

        const limbRoot = limb.root;
        const worldPos = new THREE.Vector3();
        limbRoot.getWorldPosition(worldPos);

        // Sparks using project's emitParticle
        for (let i = 0; i < 20; i++) {
            if (typeof emitParticle === 'function') {
                emitParticle(
                    worldPos.x, worldPos.y, worldPos.z,
                    (Math.random() - 0.5) * 10, Math.random() * 10, (Math.random() - 0.5) * 10,
                    1.0, 0.8, 0, 3, 0.5
                );
            }
        }

        // Detach the limb from hierarchy
        this.scene.attach(limbRoot); // Move to world scene

        // Physics fall
        let velocityY = 2;
        const animateFall = () => {
            if (limbRoot.position.y > 0) {
                velocityY -= 9.8 * 0.016;
                limbRoot.position.y += velocityY * 0.016;
                limbRoot.rotation.x += 0.1;
                requestAnimationFrame(animateFall);
            } else {
                limbRoot.position.y = 0;
            }
        };
        animateFall();

        // Cleanup
        setTimeout(() => {
            if (limbRoot.parent) limbRoot.parent.remove(limbRoot);
        }, 10000);
    }

    die() {
        if (this.isDead) return;
        this.isDead = true;
        if (window.SFX) window.SFX.triggerPlayerDie();
        this.isDashing = false;
        this.isShielded = false;
        if (this.shieldMesh) this.shieldMesh.visible = false;

        // Basic collapse animation
        if (typeof TWEEN !== 'undefined') {
            new TWEEN.Tween(this.rotation)
                .to({ x: -Math.PI / 2 }, 1000)
                .easing(TWEEN.Easing.Bounce.Out)
                .start();
        } else {
            this.rotation.x = -Math.PI / 2;
        }
    }

    activateAbility() {
        if (this.abilityCooldown > 0 || this.isDead) return false;

        switch (this.abilityType) {
            case "dash":
                this.isDashing = true;
                this.abilityActiveTime = 0.25;
                this.abilityCooldown = 6.0;
                // Dash in the direction the titan is facing
                this.dashDir.set(0, 0, 1).applyQuaternion(this.quaternion);
                break;

            case "shield":
                this.isShielded = true;
                this.abilityActiveTime = 4.0;
                this.abilityCooldown = 15.0;
                if (!this.shieldMesh) this.createShield();
                this.shieldMesh.visible = true;
                break;

            case "scan":
                this.abilityCooldown = 12.0;
                if (window.triggerNeuralScan) window.triggerNeuralScan();
                break;
        }

        return true;
    }

    createShield() {
        this.shieldMesh = new THREE.Group();
        this.shieldMesh.position.set(0, 1.0, 0);
        this.add(this.shieldMesh);

        const shieldDodecaGeo = new THREE.DodecahedronGeometry(0.065, 0);
        const shieldMat = new THREE.MeshStandardMaterial({
            color: 0x00aaff,
            emissive: new THREE.Color(0.0, 0.66, 1.0),
            emissiveIntensity: 3.5,
            transparent: true,
            opacity: 0.85
        });

        this.instancedShield = new THREE.InstancedMesh(shieldDodecaGeo, shieldMat, 320);
        this.instancedShield.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        this.shieldMesh.add(this.instancedShield);

        this.shieldParticles = [];
        for (let i = 0; i < 320; i++) {
            const phi = Math.random() * Math.PI * 2;
            const theta = Math.acos((Math.random() * 2) - 1); // uniform spherical distribution
            this.shieldParticles.push({
                phi: phi,
                theta: theta,
                speed: 0.8 + Math.random() * 1.6,
                offset: Math.random() * Math.PI * 2,
                radiusOffset: 0.9 + Math.random() * 0.2
            });
        }
    }

    dispose() {
        this.scene.remove(this);
        if (this.armorMat) this.armorMat.dispose();
        if (this.frameMat) this.frameMat.dispose();
        if (this.accentMat) this.accentMat.dispose();
        if (this.energyMat) this.energyMat.dispose();

        // Dispose of DNA Helix materials and geometries explicitly to prevent WebGL leaks
        if (this.strandAMat) this.strandAMat.dispose();
        if (this.strandBMat) this.strandBMat.dispose();
        if (this.rungMat) this.rungMat.dispose();
        if (this.dnaBeadGeo) this.dnaBeadGeo.dispose();
        if (this.dnaRungGeo) this.dnaRungGeo.dispose();

        // Dispose of modular attachment materials
        if (this.pistonSleeveMat) this.pistonSleeveMat.dispose();
        if (this.pistonRodMat) this.pistonRodMat.dispose();
        if (this.exhaustMat) this.exhaustMat.dispose();
        if (this.sensorLensMat) this.sensorLensMat.dispose();
        if (this.launcherMat) this.launcherMat.dispose();
        if (this.instancedCore) this.instancedCore.dispose();
        if (this.instancedThrusters) this.instancedThrusters.dispose();
        if (this.instancedShield) this.instancedShield.dispose();
        if (this.instancedVeins) this.instancedVeins.dispose();

        this.traverse(obj => {
            if (obj.isMesh) {
                if (obj.geometry) obj.geometry.dispose();
                if (obj.material) {
                    if (Array.isArray(obj.material)) {
                        obj.material.forEach(m => m.dispose());
                    } else {
                        obj.material.dispose();
                    }
                }
            }
            if (obj.isLight) obj.dispose();
        });
    }
}

// Global reference for index.html
window.TitanPlayer = TitanPlayer;
// Global reference for index.html
window.TitanPlayer = TitanPlayer;
