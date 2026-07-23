/**
 * ZOMBIE HATMAN FINAL BOSS (Model-V6.Raymarched)
 * Crafted as a fully raymarched, three-dimensional digital menace that reigns over 
 * the Endgame Obsidian Void Plane.
 * 
 * Features:
 * - 100% Raymarched Body: Custom vertex/fragment shaders rendering Broad Torso, Decaying Core, and Fedora Hat.
 * - SPH Viscous Fluid Lake: Volcanic molten blood particles simulating shear-thickening non-Newtonian flow.
 * - Multi-State Machine: Combines ATTACK (lunging smash), HIDE (withdrawal & shadow), and SCOUR (lateral sway search).
 * - Cybernetic Boss HUD: Neon-red floating health bar syncing real-time boss condition to the UI.
 * - Interactive Combat: Takes standard weapon damage, reacts with damage floats, and deals proximity hazard ticks.
 */

// Global helper wrappers for math inside SPH physics
const sin = Math.sin;
const cos = Math.cos;
const mix = (val1, val2, pct) => val1 * (1.0 - pct) + val2 * pct;

const raymarchingVertexShader = `
    varying vec3 vWorldPosition;
    varying vec3 vLocalPosition;
    void main() {
        vLocalPosition = position;
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
    }
`;

const raymarchingFragmentShader = `
    uniform float uTime;
    uniform float uBobOffset;
    uniform vec3 uNPCOffset; // Total XZ tracking position
    uniform vec3 uEyesColor;
    uniform vec3 uBodyColor;
    uniform int uState; // 0=ATTACK, 1=HIDE, 2=SCOUR
    uniform vec3 uLeftArmElbow;
    uniform vec3 uLeftArmWrist;
    uniform vec3 uRightArmElbow;
    uniform vec3 uRightArmWrist;
    uniform mat4 projectionMatrix;
    varying vec3 vWorldPosition;
    varying vec3 vLocalPosition;

    // Polynomial smooth minimum for organic body blending
    float smin(float a, float b, float k) {
        float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
        return mix(b, a, h) - k * h * (1.0 - h);
    }

    // SDF Primitives
    float sdSphere(vec3 p, float s) {
        return length(p) - s;
    }

    float sdEllipsoid(vec3 p, vec3 r) {
        float k0 = length(p / r);
        float k1 = length(p / (r * r));
        return k0 * (k0 - 1.0) / k1;
    }

    float sdCapsule(vec3 p, vec3 a, vec3 b, float r) {
        vec3 pa = p - a, ba = b - a;
        float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
        return length(pa - ba * h) - r;
    }

    float sdCylinder(vec3 p, float h, float r) {
        vec2 d = abs(vec2(length(p.xz), p.y)) - vec2(r, h);
        return min(max(d.x, d.y), 0.0) + length(max(d, 0.0));
    }

    // Main SDF Map defining the sharded, wireframe Zombie Hatman
    float map(vec3 p, out int matId) {
        // Apply bobbing and lateral scouring motion
        vec3 hp = p - vec3(uNPCOffset.x, uBobOffset, uNPCOffset.z);

        // 1. STREAMLINED MUSCULAR TORSO (Broad shoulders, flat chest plate)
        float dShoulderL = sdSphere(hp - vec3(-0.38, 0.65, 0.0), 0.11);
        float dShoulderR = sdSphere(hp - vec3(0.38, 0.65, 0.0), 0.11);
        float dShoulders = min(dShoulderL, dShoulderR);

        vec3 chestP = hp - vec3(0.0, 0.52, 0.05);
        float dChestPlate = sdEllipsoid(chestP, vec3(0.32, 0.22, 0.16));

        vec3 abdP = hp - vec3(0.0, 0.15, 0.0);
        float waistTaper = clamp(1.0 - 0.75 * (abdP.y / 0.35), 0.62, 1.25);
        abdP.xz /= waistTaper;
        float dAbdomen = sdCylinder(abdP, 0.35, 0.19) * waistTaper;

        float dTorso = smin(dAbdomen, dChestPlate, 0.15);
        dTorso = smin(dTorso, dShoulders, 0.12);

        // PROCEDURAL ANESTHETIC CARVING (Abs and rib groves)
        if (hp.y > -0.2 && hp.y < 0.65) {
            float abGroove = 0.016 * cos(hp.y * 18.0) * smoothstep(0.24, 0.0, abs(hp.x));
            float ribGroove = 0.012 * sin(hp.y * 14.0 - abs(hp.x) * 6.0) * smoothstep(0.12, 0.36, abs(hp.x));
            dTorso += (abGroove + ribGroove) * clamp(1.0 - hp.z * 1.8, 0.0, 1.0);
        }

        // PROCEDURAL SHARDED & BROKEN BOTTOM
        // Carve sharp, crystalline gaps into the bottom of his torso/coat
        if (hp.y < 0.2) {
            // Jagged sharded modifier
            float shardCut = 0.15 * max(cos(hp.x * 22.0) * sin(hp.z * 22.0), 0.0) * (0.2 - hp.y);
            dTorso += shardCut;
        }

        // 2. HEAD & NECK
        float dHead = sdSphere(hp - vec3(0.0, 1.02, 0.0), 0.21);

        // 3. FEDORA HAT
        float dBrim = sdCylinder(hp - vec3(0.0, 1.15, 0.0), 0.012, 0.62);
        vec3 crownP = hp - vec3(0.0, 1.26, 0.0);
        float crownTaper = clamp(1.0 - 0.18 * clamp(crownP.y / 0.12, -1.0, 1.0), 0.3, 1.7);
        crownP.xz /= crownTaper;
        float dCrown = sdCylinder(crownP, 0.12, 0.26) * crownTaper;
        float dHat = min(dBrim, dCrown);

        // 4. THREE-SEGMENT ARTICULATED ARMS (Shoulder -> Elbow -> Wrist)
        // Left arm segments
        vec3 sL = vec3(-0.38, 0.65, 0.0);
        float dUpperArmL = sdCapsule(hp, sL, uLeftArmElbow, 0.065);
        float dLowerArmL = sdCapsule(hp, uLeftArmElbow, uLeftArmWrist, 0.048);
        float dArmL = smin(dUpperArmL, dLowerArmL, 0.05);

        // Right arm segments
        vec3 sR = vec3(0.38, 0.65, 0.0);
        float dUpperArmR = sdCapsule(hp, sR, uRightArmElbow, 0.065);
        float dLowerArmR = sdCapsule(hp, uRightArmElbow, uRightArmWrist, 0.048);
        float dArmR = smin(dUpperArmR, dLowerArmR, 0.05);

        // Organic blend of all body pieces
        float dBody = smin(dTorso, dHead, 0.12);
        dBody = smin(dBody, dArmL, 0.08);
        dBody = smin(dBody, dArmR, 0.08);

        float dTotal = min(dBody, dHat);

        if (dTotal == dHat) {
            matId = 2; // Hat
        } else {
            matId = 1; // Body
        }

        // 5. SEARING RED EYES
        vec3 eyeLP = hp - vec3(-0.075, 1.04, 0.16);
        float dEyeL = sdSphere(eyeLP, 0.026);
        vec3 eyeRP = hp - vec3(0.075, 1.04, 0.16);
        float dEyeR = sdSphere(eyeRP, 0.026);
        float dEyes = min(dEyeL, dEyeR);

        if (dEyes < dTotal) {
            dTotal = dEyes;
            matId = 3; // Eyes
        }

        return dTotal;
    }

    // Normal estimator
    vec3 getNormal(vec3 p) {
        int tempMat;
        float d = map(p, tempMat);
        vec2 e = vec2(0.002, 0.0);
        vec3 n = d - vec3(
            map(p - e.xyy, tempMat),
            map(p - e.yxy, tempMat),
            map(p - e.yyx, tempMat)
        );
        return normalize(n);
    }

    void main() {
        vec3 ro = cameraPosition;
        vec3 rd = normalize(vWorldPosition - cameraPosition);

        const int MAX_STEPS = 76;
        const float SURF_DIST = 0.0015;
        const float MAX_DIST = 20.0;

        float t = 0.0;
        int matId = -1;
        vec3 hitPoint;
        bool hit = false;

        for (int i = 0; i < MAX_STEPS; i++) {
            hitPoint = ro + rd * t;
            int tempMat;
            float d = map(hitPoint, tempMat);
            if (d < SURF_DIST) {
                hit = true;
                matId = tempMat;
                break;
            }
            t += d;
            if (t > MAX_DIST) break;
        }

        if (!hit) {
            discard;
        }

        vec3 N = getNormal(hitPoint);
        vec3 L = normalize(vec3(3.0, 5.0, 4.0));
        vec3 V = -rd;

        vec3 finalColor = vec3(0.0);

        // Local coordinate projection for procedural wireframes
        vec3 hp = hitPoint - vec3(uNPCOffset.x, uBobOffset, uNPCOffset.z);

        // RED WIREFRAME LINES (Rings and longitudinal contours)
        float wire = 0.0;
        
        // Horizontal ring contours
        wire += smoothstep(0.95, 0.995, cos(hp.y * 62.0));
        
        // Vertical angular slice contours
        float angle = atan(hp.z, hp.x);
        wire += smoothstep(0.95, 0.995, cos(angle * 12.0));

        // Restrict wireframe highlights primarily to the torso and limbs
        wire *= smoothstep(-0.4, 0.1, hp.y) * 1.5;

        // Fresnel effect
        float fresnel = pow(1.0 - max(dot(N, V), 0.0), 3.5);

        if (matId == 1) {
            // Dark Grey/Black decaying flesh body
            vec3 baseColor = mix(uBodyColor, vec3(0.08, 0.08, 0.12), N.y * 0.5 + 0.5);
            vec3 wireColor = vec3(0.9, 0.05, 0.05) * 2.5; // Burning searing red wire lines

            float diffuse = max(dot(N, L), 0.0) * 0.35 + 0.05;
            finalColor = baseColor * diffuse + mix(vec3(0.0), wireColor, clamp(wire, 0.0, 1.0));
            finalColor += vec3(0.8, 0.1, 0.1) * fresnel * 0.8; // Ethereal red rim glow
        } else if (matId == 2) {
            // Reflective Glossy Black Fedora
            vec3 baseColor = vec3(0.01, 0.01, 0.015);
            float diffuse = max(dot(N, L), 0.0) * 0.4;
            vec3 R_vec = reflect(-L, N);
            float spec = pow(max(dot(R_vec, V), 0.0), 32.0) * 0.6;
            finalColor = baseColor * (diffuse + 0.08) + spec * vec3(1.0, 0.2, 0.2);
            finalColor += vec3(0.6, 0.1, 0.1) * fresnel * 0.3;
        } else if (matId == 3) {
            // Emissive Red Eyes
            float pulse = 0.75 + 0.25 * sin(uTime * 12.0);
            finalColor = uEyesColor * pulse * 3.5;
        }

        // Write depth back to depth buffer for flawless particle integration
        vec4 projPos = projectionMatrix * viewMatrix * vec4(hitPoint, 1.0);
        gl_FragDepth = (projPos.z / projPos.w) * 0.5 + 0.5;

        gl_FragColor = vec4(finalColor, 1.0);
    }
`;

const particleVertexShader = `
    attribute float aStress;
    attribute float aType; // 0 = Lake, 1 = Jet/Thruster
    varying vec3 vColor;
    varying float vStress;
    varying float vType;

    void main() {
        vStress = aStress;
        vType = aType;

        vec3 greyRest = vec3(0.12, 0.12, 0.16);
        vec3 jetRed = vec3(0.95, 0.02, 0.08); // Jet streams glow searing red

        vec3 baseColor = mix(greyRest, jetRed, aType);
        vec3 eruptColor = vec3(1.0, 0.25, 0.0); // Liquid solidifies into molten amber/red

        float stressNorm = clamp(aStress * 0.35, 0.0, 1.0);
        vColor = mix(baseColor, eruptColor, stressNorm);

        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;

        float size = mix(11.0, 15.0, aType);
        gl_PointSize = ((size + stressNorm * 7.0) / -mvPosition.z);
    }
`;

const particleFragmentShader = `
    varying vec3 vColor;
    varying float vStress;
    varying float vType;

    void main() {
        vec2 center = gl_PointCoord - vec2(0.5);
        float dist = length(center);
        if (dist > 0.5) discard;

        float alpha = smoothstep(0.5, 0.08, dist);

        // Molten hot core interpolation under stress
        vec3 colorGlow = mix(vColor, vec3(1.0, 0.9, 0.8), smoothstep(0.2, 0.0, dist) * vStress * 0.25);

        gl_FragColor = vec4(colorGlow, alpha * mix(0.75, 0.95, vType));
    }
`;

class Hatman {
    constructor(scene, config = {}) {
        this.scene = scene;
        this.config = config;
        this.isEnabled = true;

        // Health System
        this.maxHealth = 4500;
        this.health = this.maxHealth;

        // Positions: home base is desolation map flat center y = -1.55
        this.homePosition = new THREE.Vector3(0, -1.55, 0);
        this.position = new THREE.Vector3(0, 1.0, 0); // visual world pos tracking

        // Real-time kinematic variables (Damped spring)
        this.hatmanY = 1.0;
        this.hatmanVy = 0.0;
        this.hatmanMass = 120.0; // Slow, heavy zombie mass
        this.springK = 35.0;

        this.npcOffset = new THREE.Vector3(0, 0, 0);
        this.npcVelocity = new THREE.Vector3(0, 0, 0);

        this.time = 0.0;
        this.lastDmgLogTime = 0;

        // State Machine Configuration (Loop: HOVER_STILL -> PARRY_BLOCK -> STRIKE_SWEEP)
        this.state = 'HOVER_STILL'; // Starts hovering still at 20 units
        this.stateTimer = 0.0;
        this.hoverAngle = Math.random() * Math.PI * 2;
        this.stateDurations = {
            HOVER_STILL: 5.0,  // Stays completely still at 20 units
            PARRY_BLOCK: 4.0,  // Invulnerable parry posture at 14 units with crossed arms
            STRIKE_SWEEP: 5.0  // Swoops in to 5 units to strike, then sways out
        };

        // SPH Physics Settings
        this.sphConfig = {
            etaBase: 0.25,
            etaThickening: 25.0, // High non-newtonian resistance
            kCohesion: 2.8,      // Tight molecular bond
            jetVelocity: 5.0,    // Pelvic thruster speed during lunge/attack
            activeStress: 0.0
        };

        // Joint outputs for raymarching 3-point arms
        this.joints = {
            leftElbow: new THREE.Vector3(),
            leftWrist: new THREE.Vector3(),
            rightElbow: new THREE.Vector3(),
            rightWrist: new THREE.Vector3()
        };

        // UI & Core Setup
        this.group = new THREE.Group();
        this.group.name = "ZombieHatmanFinalBoss";

        this._buildShaders();
        this._buildMaterials();
        this._buildRaymarchedNPC();
        this._buildFluidParticles();
        this._buildArena();

        // Add main group to the scene at the obsidian center floor
        this.scene.add(this.group);
        this.group.position.copy(this.homePosition);

        if (!this.config.isCameo) {
            this._createBossHealthBar();
            if (window.NeuralConsole) {
                window.NeuralConsole.log("[VOID THREAT]: ZOMBIE HATMAN materialized in desolation sector! Combat sequence initialized.", 'err');
            }
        }
    }

    _buildShaders() {
        this.raymarchVert = raymarchingVertexShader;
        this.raymarchFrag = raymarchingFragmentShader;
        this.particleVert = particleVertexShader;
        this.particleFrag = particleFragmentShader;
    }

    _buildMaterials() {
        this.npcMaterial = new THREE.ShaderMaterial({
            vertexShader: this.raymarchVert,
            fragmentShader: this.raymarchFrag,
            uniforms: {
                uTime: { value: 0.0 },
                uBobOffset: { value: 1.0 },
                uNPCOffset: { value: new THREE.Vector3() },
                uState: { value: 0 },
                uEyesColor: { value: new THREE.Color(1.0, 0.0, 0.0) },
                uBodyColor: { value: new THREE.Color(0.015, 0.015, 0.02) },
                uLeftArmElbow: { value: new THREE.Vector3() },
                uLeftArmWrist: { value: new THREE.Vector3() },
                uRightArmElbow: { value: new THREE.Vector3() },
                uRightArmWrist: { value: new THREE.Vector3() },
                projectionMatrix: { value: new THREE.Matrix4() },
                viewMatrix: { value: new THREE.Matrix4() }
            },
            transparent: true,
            depthWrite: true,
            depthTest: true,
            side: THREE.DoubleSide
        });

        this.obsidianMat = new THREE.MeshStandardMaterial({
            color: 0x050308,
            roughness: 0.1,
            metalness: 0.95
        });

        this.goldCoreMat = new THREE.MeshBasicMaterial({
            color: 0xffaa00,
            transparent: true,
            opacity: 0.95
        });
    }

    _buildRaymarchedNPC() {
        // Proxy geometry volume that encapsulates the raymarched boss bounding dimensions
        const proxyVolumeGeometry = new THREE.BoxGeometry(4.8, 6.8, 4.8);
        this.npcVolume = new THREE.Mesh(proxyVolumeGeometry, this.npcMaterial);
        
        // Offset volume to center on pedestal float height
        this.npcVolume.position.set(0, 1.25, 0);
        this.group.add(this.npcVolume);

        // Vibrant neon yellow indicator box floating exactly 2 units above the head/hat center (local Y = 3.25)
        const indicatorGeo = new THREE.BoxGeometry(0.24, 0.24, 0.24);
        const indicatorMat = new THREE.MeshBasicMaterial({
            color: 0xffdd00, // tactical neon yellow
            transparent: true,
            opacity: 0.9
        });
        this.indicatorBox = new THREE.Mesh(indicatorGeo, indicatorMat);
        this.indicatorBox.position.set(0, 3.25, 0); // floats 2 units above the head (top of hat is 1.25)
        this.group.add(this.indicatorBox);

        // Inner glowing yellow core details for indicator
        const indicatorCoreGeo = new THREE.OctahedronGeometry(0.12, 0);
        const indicatorCoreMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const indicatorCore = new THREE.Mesh(indicatorCoreGeo, indicatorCoreMat);
        this.indicatorBox.add(indicatorCore);

        // Dynamic boss light that travels directly with him
        this.bossLight = new THREE.PointLight(0xff0033, 4.0, 16.0);
        this.bossLight.position.set(0, 1.25, 0);
        this.group.add(this.bossLight);
    }

    _buildFluidParticles() {
        this.particleCount = 1200;
        this.thrusterCount = 350; // Pelvic thruster flame allocations
        
        this.particlePositions = new Float32Array(this.particleCount * 3);
        this.particleVelocities = new Float32Array(this.particleCount * 3);
        this.particleForces = new Float32Array(this.particleCount * 3);
        this.particleStress = new Float32Array(this.particleCount);
        this.particleType = new Float32Array(this.particleCount); // 0 = Lake, 1 = Thruster Jet

        const R_lake = 4.4;
        for (let i = 0; i < this.particleCount; i++) {
            const isThrust = (i < this.thrusterCount);
            this.particleType[i] = isThrust ? 1.0 : 0.0;

            if (isThrust) {
                // local pelvic offsets
                this.particlePositions[i * 3]     = (Math.random() - 0.5) * 0.22;
                this.particlePositions[i * 3 + 1] = this.hatmanY - 0.4 + (Math.random() - 0.5) * 0.1;
                this.particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 0.22;

                this.particleVelocities[i * 3]     = (Math.random() - 0.5) * 0.5;
                this.particleVelocities[i * 3 + 1] = -this.sphConfig.jetVelocity;
                this.particleVelocities[i * 3 + 2] = (Math.random() - 0.5) * 0.5;
            } else {
                const r = Math.sqrt(Math.random()) * R_lake;
                const theta = Math.random() * Math.PI * 2;
                
                this.particlePositions[i * 3]     = Math.cos(theta) * r;
                this.particlePositions[i * 3 + 1] = -1.45 + Math.random() * 0.85;
                this.particlePositions[i * 3 + 2] = Math.sin(theta) * r;

                this.particleVelocities[i * 3]     = 0;
                this.particleVelocities[i * 3 + 1] = 0;
                this.particleVelocities[i * 3 + 2] = 0;
            }
        }

        this.fluidGeometry = new THREE.BufferGeometry();
        this.posAttribute = new THREE.BufferAttribute(this.particlePositions, 3);
        this.stressAttribute = new THREE.BufferAttribute(this.particleStress, 1);
        this.typeAttribute = new THREE.BufferAttribute(this.particleType, 1);
        
        this.fluidGeometry.setAttribute('position', this.posAttribute);
        this.fluidGeometry.setAttribute('aStress', this.stressAttribute);
        this.fluidGeometry.setAttribute('aType', this.typeAttribute);

        this.fluidMaterial = new THREE.ShaderMaterial({
            vertexShader: this.particleVert,
            fragmentShader: this.particleFrag,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });

        this.fluidPoints = new THREE.Points(this.fluidGeometry, this.fluidMaterial);
        this.group.add(this.fluidPoints);

        // Spatial Grid buckets for quick neighbors Hash updates
        this.gridWidth = 18;
        this.gridHeight = 18;
        this.gridSize = 10.0;
        this.gridHeader = new Int32Array(this.gridWidth * this.gridHeight);
        this.gridNext = new Int32Array(this.particleCount);
    }

    _buildArena() {
        // Red spot key light centered inside containment matrix
        this.redKeyLight = new THREE.PointLight(0xff0020, 2.5, 12);
        this.redKeyLight.position.set(0, 3, 0);
        this.group.add(this.redKeyLight);

        if (this.config.isCameo) return; // Skip pedestal base and core structures for cameos

        // Gold and Obsidian Pedestal Base
        const ringGeo = new THREE.RingGeometry(4.75, 4.9, 64);
        const ringMat = new THREE.MeshBasicMaterial({ 
            color: 0x990808, 
            side: THREE.DoubleSide, 
            transparent: true, 
            opacity: 0.15 
        });
        const containerRing = new THREE.Mesh(ringGeo, ringMat);
        containerRing.rotation.x = Math.PI / 2;
        containerRing.position.y = -1.48;
        this.group.add(containerRing);

        // Hexagonal Pedestal
        const baseGeo = new THREE.CylinderGeometry(1.6, 2.0, 1.2, 6);
        this.pedestal = new THREE.Mesh(baseGeo, this.obsidianMat);
        this.pedestal.position.set(0, -0.9, 0); // local offset above floor
        this.group.add(this.pedestal);

        // Sleeve base details
        const sleeveLowerGeo = new THREE.CylinderGeometry(1.2, 1.2, 0.8, 6);
        this.lowerSleeve = new THREE.Mesh(sleeveLowerGeo, this.obsidianMat);
        this.lowerSleeve.position.set(0, 0.5, 0);
        this.group.add(this.lowerSleeve);

        // Golden crystal Core
        const coreGeo = new THREE.OctahedronGeometry(0.38, 0);
        this.core = new THREE.Mesh(coreGeo, this.goldCoreMat);
        this.core.position.set(0, 1.5, 0);
        this.group.add(this.core);
    }

    _createBossHealthBar() {
        if (document.getElementById('boss-health-container')) return;

        const ui = document.createElement('div');
        ui.id = 'boss-health-container';
        ui.className = 'fixed top-8 left-1/2 -translate-x-1/2 w-[380px] bg-slate-950/90 border border-slate-800/80 backdrop-blur-md px-4 py-2 rounded-md z-[999] flex flex-col gap-1 select-none pointer-events-none transition-opacity duration-500';
        ui.innerHTML = `
            <div class="flex justify-between items-center text-[10px] tracking-[0.2em] font-bold">
                <span class="text-red-500 font-mono"><i class="fa-solid fa-radiation animate-spin text-[8px] mr-1"></i> COGNITIVE_BOSS // HATMAN</span>
                <span id="boss-health-percent" class="text-slate-400 font-mono">100%</span>
            </div>
            <div class="h-2 w-full bg-slate-900 border border-slate-800/80 rounded-sm overflow-hidden p-[1px]">
                <div id="boss-health-bar" class="h-full bg-red-600 rounded-sm transition-all duration-300" style="width: 100%;"></div>
            </div>
            <div class="text-[9px] text-slate-500 font-mono uppercase text-right tracking-wider" id="boss-health-status">
                STATUS: ENCOUNTER_ENGAGED
            </div>
        `;
        document.body.appendChild(ui);
    }

    takeDamage(amount) {
        if (!this.isEnabled) return;
        
        const isParrying = (this.state === 'PARRY_BLOCK');
        const dmgTaken = isParrying ? 0 : amount;
        this.health = Math.max(0, this.health - dmgTaken);

        // Flash visual color state briefly
        if (window.spawnDamageNumber) {
            window.spawnDamageNumber(
                this.position.x + (Math.random() - 0.5) * 1.5, 
                // Floating exactly 2 units above the head center!
                this.position.y + 2.0, 
                this.position.z + (Math.random() - 0.5) * 1.5, 
                isParrying ? "PARRY" : dmgTaken, 
                isParrying
            );
        }

        // Spawn bright impact sparks
        if (typeof emitParticle === 'function') {
            const sparkCount = isParrying ? 25 : 15;
            for (let s = 0; s < sparkCount; s++) {
                if (isParrying) {
                    // Dazzling, massive cyan/blue/white deflect flares
                    emitParticle(
                        this.position.x, this.position.y + 0.8, this.position.z,
                        (Math.random() - 0.5) * 12, Math.random() * 6 + 3, (Math.random() - 0.5) * 12,
                        0.1, 0.9, 1.0, 36.0 + Math.random() * 18.0, 0.45
                    );
                } else {
                    // Massive, glowing red/orange lava burst flares
                    emitParticle(
                        this.position.x, this.position.y + 0.8, this.position.z,
                        (Math.random() - 0.5) * 9, Math.random() * 5 + 2, (Math.random() - 0.5) * 9,
                        1.0, 0.2 + 0.4 * Math.random(), 0.0, 26.0 + Math.random() * 12.0, 0.35
                    );
                }
            }
        }

        const pct = Math.max(0, (this.health / this.maxHealth) * 100);
        const bar = document.getElementById('boss-health-bar');
        const percentText = document.getElementById('boss-health-percent');
        if (bar) bar.style.width = `${pct}%`;
        if (percentText) percentText.innerText = `${Math.round(pct)}%`;

        if (this.health <= 0) {
            this._triggerDeath();
        }
    }

    _triggerDeath() {
        if (window.NeuralConsole) {
            window.NeuralConsole.log("[VOID RESOLVED]: COGNITIVE BOSS neutralized. Disintegrating neural thread.", 'res');
        }

        // Explosion sound & final score
        if (window.SFX && typeof window.SFX.triggerExplosion === 'function') {
            window.SFX.triggerExplosion();
        }
        if (window.setTotalKillsCount && window.getTotalKillsCount) {
            window.setTotalKillsCount(window.getTotalKillsCount() + 150); // Massive score bump
        }

        // Volcanic particle explosion cascade
        if (typeof emitParticle === 'function') {
            for (let p = 0; p < 200; p++) {
                emitParticle(
                    this.position.x + (Math.random() - 0.5) * 2, this.position.y + 0.8, this.position.z + (Math.random() - 0.5) * 2,
                    (Math.random() - 0.5) * 24, Math.random() * 18 + 5, (Math.random() - 0.5) * 24,
                    1.0, 0.15 + 0.85 * Math.random(), 0.0, 48.0 + Math.random() * 25.0, 2.5
                );
            }
        }

        // Destroy
        this.dispose();
    }

    update(playerPos, delta, activeCamera = null) {
        if (!this.isEnabled) return;
        this.time += delta;
        this.camera = activeCamera || this.camera;

        // 1. Core State Machine Updates
        this.stateTimer += delta;
        const duration = this.stateDurations[this.state];
        
        if (this.stateTimer >= duration) {
            this.stateTimer = 0.0;
            if (this.state === 'HOVER_STILL') {
                this.state = 'PARRY_BLOCK';
                this.hoverAngle = Math.random() * Math.PI * 2; // randomized angle for parry stance
                if (window.NeuralConsole) {
                    window.NeuralConsole.log("[VOID THREAT]: COGNITIVE_BOSS has entered defensive PARRY stance! Crossed-arm damage absorption shield active.", 'warn');
                }
            } else if (this.state === 'PARRY_BLOCK') {
                this.state = 'STRIKE_SWEEP';
                if (window.NeuralConsole) {
                    window.NeuralConsole.log("[VOID THREAT]: COGNITIVE_BOSS has triggered high-velocity STRIKE SWEEP! Evade strike!", 'err');
                }
            } else {
                this.state = 'HOVER_STILL';
                this.hoverAngle = Math.random() * Math.PI * 2; // randomized retreat angle
                if (window.NeuralConsole) {
                    window.NeuralConsole.log("[VOID THREAT]: COGNITIVE_BOSS disengages, retreats, and enters 20-unit HOVER STANDSTILL.", 'sys');
                }
            }
        }

        const barStat = document.getElementById('boss-health-status');

        // State parameters
        if (this.state === 'STRIKE_SWEEP') {
            this.targetAltitude = 2.4 + 0.8 * sin(this.time * 4.0);
            this.sphConfig.jetVelocity = 7.5; 
            this.npcOffset.set(0, 0, 0);
            if (barStat) barStat.innerText = "STATUS: STRIKE_SWEEP";

            // Slower, majestic orbital rotation orbiting you at a clean distance
            const attackSpeed = 1.2; 
            // Lunges smoothly from 20.0 units starting distance down to 5.0 units minimum distance (never right up on you!)
            const strikeDist = 12.5 + 7.5 * cos(this.time * 2.2); 
            const targetX = playerPos.x + strikeDist * cos(this.hoverAngle || (this.time * attackSpeed));
            const targetZ = playerPos.z + strikeDist * sin(this.hoverAngle || (this.time * attackSpeed));
            this.homePosition.lerp(new THREE.Vector3(targetX, -1.55, targetZ), delta * 2.0); // smooth, controlled lerp tracking

            // Majestic, rhythmic arm joint IK swipes
            const swingL = sin(this.time * 6.0) * 0.4;
            const swingR = cos(this.time * 6.0) * 0.4;
            this.computeArmJoints(-0.38, 0.65, -0.2, -0.65, 0.4 + swingL, 0.38, 0.65, 0.2, -0.65, 0.4 + swingR);

        } else if (this.state === 'HOVER_STILL') {
            this.targetAltitude = 5.2 + 0.6 * sin(this.time * 1.5);
            this.sphConfig.jetVelocity = 0.0; 
            this.npcOffset.set(0, 0, 0);
            if (barStat) barStat.innerText = "STATUS: COGNITIVE_STANDSTILL";

            // Stays completely still at 20 units away, just breathing/bobbing organic suspension
            const distance = 20.0;
            if (this.hoverAngle === undefined) this.hoverAngle = Math.random() * Math.PI * 2;
            const targetX = playerPos.x + distance * cos(this.hoverAngle);
            const targetZ = playerPos.z + distance * sin(this.hoverAngle);
            this.homePosition.lerp(new THREE.Vector3(targetX, -1.55, targetZ), delta * 1.4);

            // Sluggish arms droop
            this.computeArmJoints(-0.38, 0.65, -0.05, -0.55, 0.02, 0.38, 0.65, 0.05, -0.55, 0.02);

        } else if (this.state === 'PARRY_BLOCK') {
            this.targetAltitude = 3.8 + 0.4 * cos(this.time * 2.0);
            this.sphConfig.jetVelocity = 3.0;
            if (barStat) barStat.innerText = "STATUS: PARRY_DEFLECT_MODE";

            // Parry block posture at 14.0 units
            const distance = 14.0;
            if (this.hoverAngle === undefined) this.hoverAngle = Math.random() * Math.PI * 2;
            // Slowly rotate by 0.25 rad/sec during parry
            this.hoverAngle += delta * 0.25;
            const targetX = playerPos.x + distance * cos(this.hoverAngle);
            const targetZ = playerPos.z + distance * sin(this.hoverAngle);
            this.homePosition.lerp(new THREE.Vector3(targetX, -1.55, targetZ), delta * 1.8);

            // Cross wrists and elbows tightly in front of chest to create a defensive block!
            this.computeArmJoints(-0.15, 0.45, -0.22, -0.05, 0.25, 0.15, 0.45, -0.22, -0.05, 0.25);
        }

        // Limit boss to desolation boundary range (60 units in Desolation, 450 units in massive Endgame)
        const isEndgame = window.GAME_START_CONFIG && window.GAME_START_CONFIG.mapId === 'endgame';
        const limitRange = isEndgame ? 450.0 : 60.0;
        const arenaDistSq = this.homePosition.x * this.homePosition.x + this.homePosition.z * this.homePosition.z;
        if (arenaDistSq > (limitRange * limitRange)) {
            const dist = Math.sqrt(arenaDistSq);
            this.homePosition.x = (this.homePosition.x / dist) * limitRange;
            this.homePosition.z = (this.homePosition.z / dist) * limitRange;
        }

        // 2. Kinematics Spring Bobbing Updates
        const npcSpringForceY = (this.targetAltitude - this.hatmanY) * this.springK;
        const npcAccelY = npcSpringForceY / this.hatmanMass;
        this.hatmanVy += npcAccelY * delta;
        this.hatmanVy *= 0.94;
        this.hatmanY += this.hatmanVy * delta;

        // Apply clamping (safely elevated above floor grid)
        this.hatmanY = Math.max(1.5, Math.min(8.5, this.hatmanY));

        // Update total visual tracking positions (world coords)
        // Align the proxy volume box exactly with the active center of the shape
        this.npcVolume.position.set(this.npcOffset.x, this.hatmanY + 0.6, this.npcOffset.z);

        this.position.set(
            this.homePosition.x + this.npcOffset.x,
            this.homePosition.y + this.hatmanY + 1.25, // Height adjustment
            this.homePosition.z + this.npcOffset.z
        );

        this.group.position.copy(this.homePosition);

        // 3. SPH Viscous Fluid Particle Physics Step (evaluated in local group space)
        this.stepPhysics(delta);

        // 4. Update Shader Material Uniforms
        this.npcMaterial.uniforms.uTime.value = this.time;
        this.npcMaterial.uniforms.uBobOffset.value = this.homePosition.y + this.hatmanY;
        this.npcMaterial.uniforms.uNPCOffset.value.set(
            this.homePosition.x + this.npcOffset.x,
            0.0,
            this.homePosition.z + this.npcOffset.z
        );
        this.npcMaterial.uniforms.uState.value = (this.state === 'STRIKE_SWEEP') ? 0 : (this.state === 'HOVER_STILL' ? 1 : 2);

        // Emissive light pulsing based on states
        if (this.state === 'HOVER_STILL') {
            this.npcMaterial.uniforms.uEyesColor.value.setRGB(0.08, 0.0, 0.0);
            this.redKeyLight.intensity = mix(this.redKeyLight.intensity, 0.15, 0.05);
            if (this.bossLight) {
                this.bossLight.color.setHex(0xff0033);
                this.bossLight.intensity = mix(this.bossLight.intensity, 1.8, 0.08);
            }
        } else if (this.state === 'STRIKE_SWEEP') {
            this.npcMaterial.uniforms.uEyesColor.value.setRGB(1.5, 0.0, 0.0);
            this.redKeyLight.intensity = mix(this.redKeyLight.intensity, 4.0, 0.12);
            if (this.bossLight) {
                this.bossLight.color.setHex(0xff1100);
                this.bossLight.intensity = mix(this.bossLight.intensity, 5.8, 0.15);
            }
        } else { // PARRY_BLOCK
            this.npcMaterial.uniforms.uEyesColor.value.setRGB(0.1, 0.8, 1.0); // Glows light cyan during parry!
            this.redKeyLight.intensity = mix(this.redKeyLight.intensity, 3.0, 0.1);
            if (this.bossLight) {
                this.bossLight.color.setHex(0x00d8ff);
                this.bossLight.intensity = mix(this.bossLight.intensity, 4.8, 0.12);
            }
        }

        // Animate the floating neon yellow indicator box
        if (this.indicatorBox) {
            this.indicatorBox.rotation.y += delta * 2.8;
            this.indicatorBox.rotation.x += delta * 1.4;
            // Float vertically 2 units above the head (head top is 1.25, so base height is 3.25)
            this.indicatorBox.position.y = 3.25 + 0.15 * Math.sin(this.time * 3.5);
        }

        // Segment arm kinematics
        this.npcMaterial.uniforms.uLeftArmElbow.value.copy(this.joints.leftElbow);
        this.npcMaterial.uniforms.uLeftArmWrist.value.copy(this.joints.leftWrist);
        this.npcMaterial.uniforms.uRightArmElbow.value.copy(this.joints.rightElbow);
        this.npcMaterial.uniforms.uRightArmWrist.value.copy(this.joints.rightWrist);

        // Copy active camera projection & matrices for raymarching depth testing
        if (this.camera) {
            this.npcMaterial.uniforms.projectionMatrix.value.copy(this.camera.projectionMatrix);
            this.npcMaterial.uniforms.viewMatrix.value.copy(this.camera.matrixWorldInverse);
        }

        this.posAttribute.needsUpdate = true;
        this.stressAttribute.needsUpdate = true;

        // Pedestal animations and collision checks (skip for cameos)
        if (!this.config.isCameo) {
            if (this.pedestal) this.pedestal.rotation.y += delta * 0.25;
            if (this.lowerSleeve) this.lowerSleeve.rotation.y -= delta * 0.4;
            if (this.core) {
                this.core.rotation.x += delta * 1.5;
                this.core.rotation.z += delta * 0.8;
            }
            // 5. Interactive Proximity Damage Checks on player
            this.checkPlayerCollisions(playerPos, delta);
        }
    }

    checkPlayerCollisions(playerPos, delta) {
        // Direct boss body collision
        const dx = playerPos.x - this.position.x;
        const dz = playerPos.z - this.position.z;
        const distSq = dx * dx + dz * dz;

        // Deduct playerHealth on lunge/strike proximity
        if (distSq < 6.2) { // standing within ~2.5 units of visual threat
            let damage = delta * 16.0; // extremely painful tick damage
            
            // Shield dampener reduction check
            if (window.aegisSentinel && window.aegisSentinel.isShieldActive) {
                damage *= 0.5; // aegis vector shield blocks 50% damage
            }

            window.playerHealth = Math.max(0, window.playerHealth - damage);

            if (this.time - this.lastDmgLogTime > 2.0 && window.NeuralConsole) {
                window.NeuralConsole.log("[VOID HAZARD]: Critical chassis rupture! Vector collision with COGNITIVE_BOSS.", 'err');
                this.lastDmgLogTime = this.time;
            }
        }

        // Molten Blood SPH fluid lake hazard checks
        const ldx = playerPos.x - this.homePosition.x;
        const ldz = playerPos.z - this.homePosition.z;
        const lDistSq = ldx * ldx + ldz * ldz;

        // standing inside fluid matrix container (radius 4.7 units) on floor
        if (lDistSq < 22.0 && playerPos.y < -1.0) {
            let poolDmg = delta * 6.5;

            if (window.aegisSentinel && window.aegisSentinel.isShieldActive) {
                poolDmg *= 0.5;
            }

            window.playerHealth = Math.max(0, window.playerHealth - poolDmg);

            // Spawns digital sparks at players feet
            if (Math.random() < 0.25 && typeof emitParticle === 'function') {
                emitParticle(
                    playerPos.x, playerPos.y + 0.1, playerPos.z,
                    (Math.random() - 0.5) * 4, 3.5, (Math.random() - 0.5) * 4,
                    1.0, 0.1, 0.0, 6, 0.2
                );
            }

            if (this.time - this.lastDmgLogTime > 4.5 && window.NeuralConsole) {
                window.NeuralConsole.log("[VOID HAZARD]: Molecular corrosion! SPH molten liquid contact.", 'warn');
                this.lastDmgLogTime = this.time;
            }
        }
    }

    computeArmJoints(sLx, sLy, eLxOffset, eLyOffset, eLzOffset, sRx, sRy, eRxOffset, eRyOffset, eRzOffset) {
        // Procedural kinematics for the 3-point joint arms
        this.joints.leftElbow.set(sLx + eLxOffset, sLy + eLyOffset, eLzOffset);
        this.joints.leftWrist.set(this.joints.leftElbow.x + 0.05, this.joints.leftElbow.y - 0.45, this.joints.leftElbow.z + 0.12);

        this.joints.rightElbow.set(sRx + eRxOffset, sRy + eRyOffset, eRzOffset);
        this.joints.rightWrist.set(this.joints.rightElbow.x - 0.05, this.joints.rightElbow.y - 0.45, this.joints.rightElbow.z + 0.12);
    }

    stepPhysics(dt) {
        this.particleForces.fill(0.0);
        this.particleStress.fill(0.0);

        const N = this.particleCount;
        const pos = this.particlePositions;
        const vel = this.particleVelocities;
        const forces = this.particleForces;
        const stress = this.particleStress;

        // Recycles downwards jet thruster exhaust particles
        for (let i = 0; i < this.thrusterCount; i++) {
            const idx = i * 3;
            const dist2DSq = (pos[idx] - this.npcOffset.x) * (pos[idx] - this.npcOffset.x) + 
                             (pos[idx + 2] - this.npcOffset.z) * (pos[idx + 2] - this.npcOffset.z);

            if (pos[idx + 1] <= -1.42 || dist2DSq > 22.0) {
                pos[idx]     = this.npcOffset.x + (Math.random() - 0.5) * 0.22;
                pos[idx + 1] = this.hatmanY - 0.38 + (Math.random() - 0.5) * 0.08;
                pos[idx + 2] = this.npcOffset.z + (Math.random() - 0.5) * 0.22;

                vel[idx]     = (Math.random() - 0.5) * 0.5;
                vel[idx + 1] = -this.sphConfig.jetVelocity - Math.random() * 1.5;
                vel[idx + 2] = (Math.random() - 0.5) * 0.5;
            }
        }

        // Spatial grid bucket Hash table allocations
        this.gridHeader.fill(-1);
        const gridW = this.gridWidth;
        const gridH = this.gridHeight;
        const halfGrid = this.gridSize * 0.5;

        for (let i = 0; i < N; i++) {
            const gx = Math.floor(((pos[i * 3] + halfGrid) / this.gridSize) * gridW);
            const gz = Math.floor(((pos[i * 3 + 2] + halfGrid) / this.gridSize) * gridH);
            
            if (gx >= 0 && gx < gridW && gz >= 0 && gz < gridH) {
                const cellIdx = gx + gz * gridW;
                this.gridNext[i] = this.gridHeader[cellIdx];
                this.gridHeader[cellIdx] = i;
            } else {
                this.gridNext[i] = -1;
            }
        }

        // Evaluates SPH molecular pressure & non-newtonian viscosity
        const R_interact = 0.44;
        const R2 = R_interact * R_interact;
        const kPress = 38.0;

        const kCohesion = this.sphConfig.kCohesion;
        const etaBase = this.sphConfig.etaBase;
        const etaThickening = this.sphConfig.etaThickening;

        for (let i = 0; i < N; i++) {
            const xi = pos[i * 3];
            const yi = pos[i * 3 + 1];
            const zi = pos[i * 3 + 2];

            const vxi = vel[i * 3];
            const vyi = vel[i * 3 + 1];
            const vzi = vel[i * 3 + 2];

            const gx = Math.floor(((xi + halfGrid) / this.gridSize) * gridW);
            const gz = Math.floor(((zi + halfGrid) / this.gridSize) * gridH);

            for (let dgx = -1; dgx <= 1; dgx++) {
                for (let dgz = -1; dgz <= 1; dgz++) {
                    const cx = gx + dgx;
                    const cz = gz + dgz;
                    
                    if (cx >= 0 && cx < gridW && cz >= 0 && cz < gridH) {
                        const cellIdx = cx + cz * gridW;
                        let j = this.gridHeader[cellIdx];
                        
                        while (j !== -1) {
                            if (j > i) {
                                const dx = xi - pos[j * 3];
                                const dy = yi - pos[j * 3 + 1];
                                const dz = zi - pos[j * 3 + 2];
                                const distSq = dx * dx + dy * dy + dz * dz;

                                if (distSq < R2 && distSq > 0.0001) {
                                    const dist = Math.sqrt(distSq);
                                    const nx = dx / dist;
                                    const ny = dy / dist;
                                    const nz = dz / dist;

                                    const dvx = vxi - vel[j * 3];
                                    const dvy = vyi - vel[j * 3 + 1];
                                    const dvz = vzi - vel[j * 3 + 2];

                                    const vr = dvx * nx + dvy * ny + dvz * nz;

                                    const r_dist = R_interact - dist;
                                    const fRepulsion = kPress * r_dist * r_dist;

                                    let fViscosity = 0.0;
                                    let localShearStress = 0.0;

                                    if (this.state !== 'HIDE' && vr < 0.0) {
                                        localShearStress = Math.abs(vr);
                                        const dynamicViscosity = etaBase + etaThickening * localShearStress * localShearStress;
                                        fViscosity = -dynamicViscosity * vr;
                                    } else {
                                        fViscosity = -etaBase * vr;
                                    }

                                    const fCohesive = -kCohesion * r_dist;
                                    const totalRadialForce = fRepulsion + fViscosity + fCohesive;

                                    forces[i * 3]     += totalRadialForce * nx;
                                    forces[i * 3 + 1] += totalRadialForce * ny;
                                    forces[i * 3 + 2] += totalRadialForce * nz;

                                    forces[j * 3]     -= totalRadialForce * nx;
                                    forces[j * 3 + 1] -= totalRadialForce * ny;
                                    forces[j * 3 + 2] -= totalRadialForce * nz;

                                    stress[i] += localShearStress;
                                    stress[j] += localShearStress;
                                }
                            }
                            j = this.gridNext[j];
                        }
                    }
                }
            }
        }

        // Gravity boundaries & container containment walls
        const gravity = -9.81;
        const boundaryRad = 4.7;
        const boundaryRadSq = boundaryRad * boundaryRad;
        const floorHeight = -1.45;
        const hRadius = 1.05;
        const hRadiusSq = hRadius * hRadius;

        let sumStress = 0.0;

        const npcX = this.npcOffset.x;
        const npcY = this.hatmanY;
        const npcZ = this.npcOffset.z;
        const npcVy = this.hatmanVy;

        for (let i = 0; i < N; i++) {
            const idx = i * 3;
            
            forces[idx + 1] += gravity * 0.85;

            // Interaction with moving broad Hatman torso
            const hdx = pos[idx] - npcX;
            const hdy = pos[idx + 1] - npcY;
            const hdz = pos[idx + 2] - npcZ;
            const hDistSq = hdx * hdx + hdy * hdy + hdz * hdz;

            if (hDistSq < hRadiusSq) {
                const hDist = Math.sqrt(hDistSq);
                const hnx = hdx / hDist;
                const hny = hdy / hDist;
                const hnz = hdz / hDist;

                const h_dvx = vel[idx];
                const h_dvy = vel[idx + 1] - npcVy;
                const h_dvz = vel[idx + 2];
                const h_vr = h_dvx * hnx + h_dvy * hny + h_dvz * hnz;

                const depth = hRadius - hDist;
                const fRepel = 75.0 * depth;

                let fVisc = 0.0;
                if (h_vr < 0.0) {
                    const entityStress = Math.abs(h_vr);
                    const entityViscosity = 1.0 + 38.0 * entityStress * entityStress;
                    fVisc = -entityViscosity * h_vr;
                    stress[i] += entityStress * 1.5;
                }

                const totalCouplingForce = fRepel + fVisc;

                forces[idx]     += totalCouplingForce * hnx;
                forces[idx + 1] += totalCouplingForce * hny;
                forces[idx + 2] += totalCouplingForce * hnz;
            }

            // Solid Floor collision
            if (pos[idx + 1] < floorHeight) {
                pos[idx + 1] = floorHeight;
                vel[idx + 1] = -vel[idx + 1] * 0.1;
                vel[idx]     *= 0.85;
                vel[idx + 2] *= 0.85;
            }

            // Boundary containment cylinder
            const dist2DSq = pos[idx] * pos[idx] + pos[idx + 2] * pos[idx + 2];
            if (dist2DSq > boundaryRadSq) {
                const dist2D = Math.sqrt(dist2DSq);
                const bx = pos[idx] / dist2D;
                const bz = pos[idx + 2] / dist2D;

                pos[idx]     = bx * boundaryRad;
                pos[idx + 2] = bz * boundaryRad;

                const projVel = vel[idx] * bx + vel[idx + 2] * bz;
                if (projVel > 0) {
                    vel[idx]     -= 1.2 * projVel * bx;
                    vel[idx + 2] -= 1.2 * projVel * bz;
                }
            }

            // integration steps
            vel[idx]     += forces[idx] * dt;
            vel[idx + 1] += forces[idx + 1] * dt;
            vel[idx + 2] += forces[idx + 2] * dt;

            const viscousDrag = mix(0.985, 0.992, this.particleType[i]);
            vel[idx]     *= viscousDrag;
            vel[idx + 1] *= viscousDrag;
            vel[idx + 2] *= viscousDrag;

            pos[idx]     += vel[idx] * dt;
            pos[idx + 1] += vel[idx + 1] * dt;
            pos[idx + 2] += vel[idx + 2] * dt;

            sumStress += stress[i];
        }

        const meanStress = sumStress / N;
        this.sphConfig.activeStress = mix(this.sphConfig.activeStress, meanStress, 0.15);
    }

    dispose() {
        this.isEnabled = false;

        // Clean UI Elements
        const ui = document.getElementById('boss-health-container');
        if (ui && ui.parentNode) {
            ui.parentNode.removeChild(ui);
        }

        // Clean up geometries
        this.scene.remove(this.group);
        this.npcVolume.geometry.dispose();
        this.fluidPoints.geometry.dispose();
        this.pedestal.geometry.dispose();
        this.lowerSleeve.geometry.dispose();
        this.core.geometry.dispose();

        // Clean up materials
        this.npcMaterial.dispose();
        this.obsidianMat.dispose();
        this.goldCoreMat.dispose();
        this.fluidMaterial.dispose();
        
        if (this.redKeyLight) {
            this.redKeyLight.dispose();
        }

        if (window.hatmanBoss === this) {
            window.hatmanBoss = null;
        }

        console.log("[Aegis Boss] Hatman cleaned up from scene.");
    }
}

// Attach globally
window.Hatman = Hatman;
