/**
 * AETHER MECH BOSS - NEXUS PRIME (Model-SDF.Mechanical)
 * Crafted as a fully raymarched mechanical behemoth that reigns over the Spire Roof Summit.
 * Incorporates:
 * - 3D Spur Sun Gear & Planet Pinions
 * - Helical Threaded columns
 * - Slider-Crank linkage vertical pistons
 * - Emissive glowing core
 * - Custom neon cyan & violet HUD
 */

const aetherRaymarchingVertexShader = `
    varying vec3 vWorldPosition;
    varying vec3 vLocalPosition;
    void main() {
        vLocalPosition = position;
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
    }
`;

const aetherRaymarchingFragmentShader = `
    uniform float uTime;
    uniform float uBobOffset;
    uniform vec3 uNPCOffset; // Boss world center coordinates
    uniform float uRotationY; // Y-axis rotation to face the player
    uniform int uState; // 0=SPIN_CHARGE, 1=PISTON_SLAM, 2=HELIOTROPE_SHIELD
    uniform vec3 uCoreColor;
    uniform mat4 projectionMatrix;
    varying vec3 vWorldPosition;
    varying vec3 vLocalPosition;

    // Polynomial smooth minimum
    float smin(float a, float b, float k) {
        float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
        return mix(b, a, h) - k * h * (1.0 - h);
    }

    // SDF Primitives
    float sdSphere(vec3 p, float s) {
        return length(p) - s;
    }

    float sdCylinder(vec3 p, float h, float r) {
        vec2 d = abs(vec2(length(p.xz), p.y)) - vec2(r, h);
        return min(max(d.x, d.y), 0.0) + length(max(d, 0.0));
    }

    float sdTorus(vec3 p, vec2 t) {
        vec2 q = vec2(length(p.xz) - t.x, p.y);
        return length(q) - t.y;
    }

    float sdCapsule(vec3 p, vec3 a, vec3 b, float r) {
        vec3 pa = p - a, ba = b - a;
        float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
        return length(pa - ba * h) - r;
    }

    // 3D Spur Gear Profile (extruding a radial wave)
    float sdGear3D(vec3 p, float r, float t_size, float n, float thickness, float angleOffset) {
        float angle = atan(p.z, p.x) + angleOffset;
        float radius = length(p.xz);
        float d2D = radius - r - t_size * sin(n * angle);
        float dY = abs(p.y) - thickness;
        return max(d2D, dY);
    }

    // Helical Threaded Column (azimuth wrapping triangle waves)
    float sdHelicalBolt(vec3 p, float r, float pitch, float depth, float height) {
        float dist = length(p.xz) - r;
        float azimuth = atan(p.z, p.x);
        float tri = abs(fract(p.y * pitch - azimuth / 6.283185) - 0.5);
        float d = dist - tri * depth;
        float dY = abs(p.y) - height;
        // Conservative step scaling for thread deformation (Lipschitz constant bound)
        return max(d * 0.707, dY);
    }

    // Pulsing Octahedron
    float sdOctahedron(vec3 p, float s) {
        p = abs(p);
        float m = p.x + p.y + p.z - s;
        vec3 q;
        if (3.0 * p.x < p.x + p.y + p.z) q = p;
        else if (3.0 * p.y < p.x + p.y + p.z) q = p.yzx;
        else if (3.0 * p.z < p.x + p.y + p.z) q = p.zxy;
        else return m * 0.57735027;
        float k = clamp(0.5 * (q.z - q.y + s), 0.0, s);
        return length(vec3(q.x, q.y - s + k, q.z - k));
    }

    // Main SDF Map
    float map(vec3 p, out int matId) {
        // Local coordinates relative to boss center (bobbing applied)
        vec3 hp = p - vec3(uNPCOffset.x, uBobOffset, uNPCOffset.z);

        // Rotate local coordinate space around Y-axis to face the player
        float cosY = cos(uRotationY);
        float sinY = sin(uRotationY);
        vec3 rp = hp;
        rp.x = hp.x * cosY - hp.z * sinY;
        rp.z = hp.x * sinY + hp.z * cosY;

        // 1. Central Sun Gear
        float sunSpeed = (uState == 0) ? 6.0 : ((uState == 2) ? 0.8 : 2.0);
        float dSunGear = sdGear3D(rp, 2.0, 0.25, 16.0, 0.45, uTime * sunSpeed);

        // 2. Planet Pinions (x3) revolving around sun gear
        float pAng0 = uTime * (sunSpeed * 0.25);
        float pAng1 = pAng0 + 2.094395;
        float pAng2 = pAng0 + 4.188790;
        vec3 c0 = vec3(cos(pAng0), 0.0, sin(pAng0)) * 3.4;
        vec3 c1 = vec3(cos(pAng1), 0.0, sin(pAng1)) * 3.4;
        vec3 c2 = vec3(cos(pAng2), 0.0, sin(pAng2)) * 3.4;
        
        // Pinions counter-rotate to mesh
        float pinSpeed = -uTime * (sunSpeed * 2.0) - pAng0;
        float dPlanet0 = sdGear3D(rp - c0, 1.0, 0.16, 8.0, 0.35, pinSpeed);
        float dPlanet1 = sdGear3D(rp - c1, 1.0, 0.16, 8.0, 0.35, pinSpeed);
        float dPlanet2 = sdGear3D(rp - c2, 1.0, 0.16, 8.0, 0.35, pinSpeed);
        float dPlanets = min(dPlanet0, min(dPlanet1, dPlanet2));

        // 3. Piston Sleeves (Skins) & Reciprocating Shafts (Linkages)
        vec3 pc0 = vec3(-3.2, 0.0, -3.2);
        vec3 pc1 = vec3(3.2, 0.0, -3.2);
        vec3 pc2 = vec3(3.2, 0.0, 3.2);
        vec3 pc3 = vec3(-3.2, 0.0, 3.2);

        float dSleeve0 = max(sdCylinder(rp - pc0, 1.2, 0.8), -sdCylinder(rp - pc0, 1.3, 0.62));
        float dSleeve1 = max(sdCylinder(rp - pc1, 1.2, 0.8), -sdCylinder(rp - pc1, 1.3, 0.62));
        float dSleeve2 = max(sdCylinder(rp - pc2, 1.2, 0.8), -sdCylinder(rp - pc2, 1.3, 0.62));
        float dSleeve3 = max(sdCylinder(rp - pc3, 1.2, 0.8), -sdCylinder(rp - pc3, 1.3, 0.62));
        float dSleeves = min(min(dSleeve0, dSleeve1), min(dSleeve2, dSleeve3));

        // Piston oscillation
        float pistonSpeed = (uState == 1) ? 7.5 : 3.0;
        float yOff0 = sin(uTime * pistonSpeed) * 1.2;
        float yOff1 = sin(uTime * pistonSpeed + 1.5708) * 1.2;
        float yOff2 = sin(uTime * pistonSpeed + 3.1416) * 1.2;
        float yOff3 = sin(uTime * pistonSpeed + 4.7124) * 1.2;

        float dShaft0 = sdCylinder(rp - pc0 - vec3(0.0, yOff0, 0.0), 1.0, 0.52);
        float dShaft1 = sdCylinder(rp - pc1 - vec3(0.0, yOff1, 0.0), 1.0, 0.52);
        float dShaft2 = sdCylinder(rp - pc2 - vec3(0.0, yOff2, 0.0), 1.0, 0.52);
        float dShaft3 = sdCylinder(rp - pc3 - vec3(0.0, yOff3, 0.0), 1.0, 0.52);
        float dShafts = min(min(dShaft0, dShaft1), min(dShaft2, dShaft3));

        // 4. Connecting Linkage Rods
        float dArm0 = sdCapsule(rp, pc0 + vec3(0.0, yOff0, 0.0), vec3(0.0, 0.0, 0.0), 0.16);
        float dArm1 = sdCapsule(rp, pc1 + vec3(0.0, yOff1, 0.0), vec3(0.0, 0.0, 0.0), 0.16);
        float dArm2 = sdCapsule(rp, pc2 + vec3(0.0, yOff2, 0.0), vec3(0.0, 0.0, 0.0), 0.16);
        float dArm3 = sdCapsule(rp, pc3 + vec3(0.0, yOff3, 0.0), vec3(0.0, 0.0, 0.0), 0.16);
        float dArms = min(min(dArm0, dArm1), min(dArm2, dArm3));

        // 5. Helical Threaded Columns (Left and Right)
        vec3 bCol0 = vec3(-5.5, 0.0, 0.0);
        vec3 bCol1 = vec3(5.5, 0.0, 0.0);
        
        // Rotate columns around their Y-axis
        vec3 rpCol0 = rp - bCol0;
        vec3 rpCol1 = rp - bCol1;
        float cRot = uTime * 2.5;
        float cCos = cos(cRot);
        float cSin = sin(cRot);
        vec3 rCol0 = vec3(rpCol0.x * cCos - rpCol0.z * cSin, rpCol0.y, rpCol0.x * cSin + rpCol0.z * cCos);
        vec3 rCol1 = vec3(rpCol1.x * cCos - rpCol1.z * cSin, rpCol1.y, rpCol1.x * cSin + rpCol1.z * cCos);
        
        float dBolt0 = sdHelicalBolt(rCol0, 0.8, 3.5, 0.16, 3.6);
        float dBolt1 = sdHelicalBolt(rCol1, 0.8, 3.5, 0.16, 3.6);
        float dBolts = min(dBolt0, dBolt1);

        // 6. Outer Torus Frame
        float dTorusFrame = sdTorus(rp, vec2(5.5, 0.35));

        // 7. Central Power Core (Pulsing Energy weakpoint)
        float pFreq = (uState == 0) ? 14.0 : 7.0;
        float pulse = 1.0 + 0.18 * sin(uTime * pFreq);
        float dCore = sdOctahedron(rp, 1.25 * pulse);

        // Merge all mechanical pieces
        float dMetal = min(dSunGear, min(dPlanets, min(dSleeves, dTorusFrame)));
        float dPistons = min(dShafts, dArms);
        float dTotal = min(dMetal, min(dPistons, dBolts));

        matId = 2; // machined metal chassis
        if (dTotal == dBolts) {
            matId = 4; // helical columns
        } else if (dTotal == dPistons) {
            matId = 3; // golden pistons
        }

        // Smooth merge core slightly
        if (dCore < dTotal) {
            dTotal = dCore;
            matId = 1; // glowing core
        }

        return dTotal;
    }

    // Normal estimator
    vec3 getNormal(vec3 p) {
        int tempMat;
        float d = map(p, tempMat);
        vec2 e = vec2(0.003, 0.0);
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

        const int MAX_STEPS = 85;
        const float SURF_DIST = 0.002;
        const float MAX_DIST = 25.0;

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
        vec3 L = normalize(vec3(4.0, 7.0, 5.0));
        vec3 V = -rd;

        vec3 finalColor = vec3(0.0);
        float fresnel = pow(1.0 - max(dot(N, V), 0.0), 4.0);

        // Core local coords for procedural patterns
        vec3 hp = hitPoint - vec3(uNPCOffset.x, uBobOffset, uNPCOffset.z);

        if (matId == 1) {
            // Emissive Cyan/Violet Core
            float pulse = 0.8 + 0.2 * sin(uTime * 10.0);
            finalColor = uCoreColor * pulse * 3.2;
            finalColor += vec3(1.0, 1.0, 1.0) * pow(max(dot(N, V), 0.0), 8.0) * 1.5;
        } else if (matId == 2) {
            // Machined Dark Steel Chassis
            vec3 baseColor = mix(vec3(0.04, 0.05, 0.08), vec3(0.12, 0.14, 0.18), N.y * 0.5 + 0.5);
            float diffuse = max(dot(N, L), 0.0) * 0.45 + 0.05;
            
            // Specular reflection
            vec3 R_vec = reflect(-L, N);
            float spec = pow(max(dot(R_vec, V), 0.0), 16.0) * 0.5;

            // Cybernetic Grid Line Overlay
            float wire = 0.0;
            wire += smoothstep(0.96, 0.998, cos(hp.x * 4.0));
            wire += smoothstep(0.96, 0.998, sin(hp.y * 4.0));
            wire += smoothstep(0.96, 0.998, cos(hp.z * 4.0));
            vec3 wireColor = uCoreColor * 1.8;

            finalColor = baseColor * (diffuse + spec) + mix(vec3(0.0), wireColor, clamp(wire * 0.8, 0.0, 1.0));
            finalColor += uCoreColor * fresnel * 0.6; // Rim glow
        } else if (matId == 3) {
            // Golden Piston Rods
            vec3 baseColor = vec3(0.65, 0.48, 0.15); // rich bronze/gold
            float diffuse = max(dot(N, L), 0.0) * 0.6;
            vec3 R_vec = reflect(-L, N);
            float spec = pow(max(dot(R_vec, V), 0.0), 32.0) * 0.8;
            finalColor = baseColor * (diffuse + 0.1) + spec * vec3(1.0, 0.9, 0.6);
            finalColor += vec3(0.8, 0.5, 0.2) * fresnel * 0.4;
        } else if (matId == 4) {
            // Helical Columns (Emissive threads)
            vec3 baseColor = vec3(0.08, 0.08, 0.12);
            float diffuse = max(dot(N, L), 0.0) * 0.4;
            // Highlight the helical grooves with violet light
            float threadGlow = smoothstep(0.3, 0.7, fract(hp.y * 3.5 - atan(hp.z, hp.x) / 6.28));
            vec3 emitColor = vec3(0.6, 0.1, 0.9) * threadGlow * 2.0;

            finalColor = baseColor * (diffuse + 0.05) + emitColor;
            finalColor += vec3(0.5, 0.05, 0.8) * fresnel * 0.5;
        }

        // Flawless Z-depth Sorting
        vec4 projPos = projectionMatrix * viewMatrix * vec4(hitPoint, 1.0);
        gl_FragDepth = (projPos.z / projPos.w) * 0.5 + 0.5;

        gl_FragColor = vec4(finalColor, 1.0);
    }
`;

class AetherMechBoss {
    constructor(scene, config = {}) {
        this.scene = scene;
        this.config = config;
        this.isEnabled = true;

        // Boss Health Stats
        this.maxHealth = 8000;
        this.health = this.maxHealth;

        // Position: centers around Room 12 flat roof (Y = 532.05)
        this.homePosition = new THREE.Vector3(0, 532.05, 0);
        this.position = new THREE.Vector3(0, 532.05 + 5.0, 0); // starts suspended

        // Kinematics (spring suspension bobbing)
        this.bossY = 532.05 + 5.0;
        this.bossVy = 0.0;
        this.bossMass = 180.0; // heavy mechanical chassis
        this.springK = 45.0;

        this.npcOffset = new THREE.Vector3(0, 0, 0);
        this.rotationY = 0.0; // tracks player look angle

        this.time = 0.0;

        // Boss Combat States (Looping)
        this.state = 'SPIN_CHARGE'; // Initial state
        this.stateTimer = 0.0;
        this.stateDurations = {
            SPIN_CHARGE: 6.0,       // Center gears accelerate, pulses rapidly, glows orange/red
            PISTON_SLAM: 6.0,       // Pistons stroke aggressively, causes flame sparks
            HELIOTROPE_SHIELD: 5.0  // Gears stop, raises defense field (reduced damage)
        };

        // UI & Mesh Group Setup
        this.group = new THREE.Group();
        this.group.name = "AetherMechBossInstance";

        this._buildShaders();
        this._buildMaterials();
        this._buildRaymarchedNPC();

        // Add to scene
        this.scene.add(this.group);
        this.group.position.copy(this.homePosition);

        this._createBossHealthBar();

        if (window.NeuralConsole) {
            window.NeuralConsole.log("[AETHER EMERGENCY]: NEXUS PRIME orbital defense mech materialized at Spire Summit! Combat sequence initiated.", 'err');
            window.NeuralConsole.beep(660, 0.25);
            window.NeuralConsole.beep(880, 0.25);
        }
    }

    _buildShaders() {
        this.raymarchVert = aetherRaymarchingVertexShader;
        this.raymarchFrag = aetherRaymarchingFragmentShader;
    }

    _buildMaterials() {
        this.npcMaterial = new THREE.ShaderMaterial({
            vertexShader: this.raymarchVert,
            fragmentShader: this.raymarchFrag,
            uniforms: {
                uTime: { value: 0.0 },
                uBobOffset: { value: 532.05 + 5.0 },
                uNPCOffset: { value: new THREE.Vector3() },
                uRotationY: { value: 0.0 },
                uState: { value: 0 },
                uCoreColor: { value: new THREE.Color(0.0, 0.9, 1.0) }, // Cyan standard
                projectionMatrix: { value: new THREE.Matrix4() },
                viewMatrix: { value: new THREE.Matrix4() }
            },
            transparent: true,
            depthWrite: true,
            depthTest: true,
            side: THREE.DoubleSide
        });
    }

    _buildRaymarchedNPC() {
        // Enclosing proxy volume box for the raymarching ray intersection
        const proxyVolumeGeometry = new THREE.BoxGeometry(16.0, 16.0, 16.0);
        this.npcVolume = new THREE.Mesh(proxyVolumeGeometry, this.npcMaterial);
        
        // Offset visual center above the homePosition ground
        this.npcVolume.position.set(0, 5.0, 0);
        this.group.add(this.npcVolume);

        // Core dynamic point lights
        this.bossLight = new THREE.PointLight(0x00ffcc, 5.0, 24.0);
        this.bossLight.position.set(0, 5.0, 0);
        this.group.add(this.bossLight);

        this.pulseLight = new THREE.PointLight(0xaa00ff, 3.0, 15.0);
        this.pulseLight.position.set(0, 5.0, 0);
        this.group.add(this.pulseLight);
    }

    _createBossHealthBar() {
        // Remove existing one if it somehow exists
        const existing = document.getElementById('aether-boss-health-container');
        if (existing) existing.remove();

        const ui = document.createElement('div');
        ui.id = 'aether-boss-health-container';
        ui.className = 'fixed top-8 left-1/2 -translate-x-1/2 w-[390px] bg-slate-950/80 border border-cyan-950/60 backdrop-blur-md px-4 py-2 rounded-sm z-[999] flex flex-col gap-1 select-none pointer-events-none transition-opacity duration-500';
        ui.innerHTML = `
            <div class="flex justify-between items-center text-[10px] tracking-[0.22em] font-bold">
                <span class="text-cyan-400 font-mono"><i class="fa-solid fa-microchip animate-pulse text-[8px] mr-1"></i> AETHER_MECH // NEXUS PRIME</span>
                <span id="aether-boss-health-percent" class="text-slate-400 font-mono">100%</span>
            </div>
            <div class="h-2 w-full bg-slate-900 border border-slate-800/80 rounded-sm overflow-hidden p-[1px]">
                <div id="aether-boss-health-bar" class="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-sm transition-all duration-300" style="width: 100%;"></div>
            </div>
            <div class="text-[9px] text-slate-500 font-mono uppercase text-right tracking-wider flex justify-between" id="aether-boss-health-status-container">
                <span id="aether-boss-health-hp" class="text-cyan-600/80">8000 / 8000 HP</span>
                <span id="aether-boss-health-status">STATUS: SPIN_CHARGE</span>
            </div>
        `;
        document.body.appendChild(ui);
    }

    takeDamage(amount) {
        if (!this.isEnabled) return;
        
        const isShielded = (this.state === 'HELIOTROPE_SHIELD');
        // Reduce damage by 60% if shielded
        const dmgTaken = Math.round(isShielded ? amount * 0.40 : amount);
        this.health = Math.max(0, this.health - dmgTaken);

        // Flash damage indicators
        if (window.spawnDamageNumber) {
            window.spawnDamageNumber(
                this.position.x + (Math.random() - 0.5) * 2.0, 
                this.position.y + 2.5, 
                this.position.z + (Math.random() - 0.5) * 2.0, 
                isShielded ? `${dmgTaken} (RESIST)` : dmgTaken, 
                isShielded
            );
        }

        // Spawn dynamic spark particles
        if (typeof emitParticle === 'function') {
            const sparkCount = isShielded ? 20 : 12;
            for (let s = 0; s < sparkCount; s++) {
                if (isShielded) {
                    // Magenta/Indigo deflect sparks
                    emitParticle(
                        this.position.x, this.position.y, this.position.z,
                        (Math.random() - 0.5) * 14, Math.random() * 8 + 3, (Math.random() - 0.5) * 14,
                        0.7, 0.1, 1.0, 42.0 + Math.random() * 15.0, 0.55
                    );
                } else {
                    // Bright Cyan/Electric blue sparks
                    emitParticle(
                        this.position.x, this.position.y, this.position.z,
                        (Math.random() - 0.5) * 11, Math.random() * 7 + 2, (Math.random() - 0.5) * 11,
                        0.0, 0.9, 1.0, 30.0 + Math.random() * 10.0, 0.4
                    );
                }
            }
        }

        // Play alert blip if hits are heavy
        if (window.SFX && typeof window.SFX.triggerUI === 'function' && Math.random() > 0.7) {
            window.SFX.triggerUI();
        }

        const pct = Math.max(0, (this.health / this.maxHealth) * 100);
        const bar = document.getElementById('aether-boss-health-bar');
        const percentText = document.getElementById('aether-boss-health-percent');
        const hpText = document.getElementById('aether-boss-health-hp');
        if (bar) bar.style.width = `${pct}%`;
        if (percentText) percentText.innerText = `${Math.round(pct)}%`;
        if (hpText) hpText.innerText = `${this.health} / ${this.maxHealth} HP`;

        if (this.health <= 0) {
            this._triggerDeath();
        }
    }

    _triggerDeath() {
        this.isEnabled = false;

        if (window.NeuralConsole) {
            window.NeuralConsole.log("[VOID STRIKE]: NEXUS PRIME system core ruptured! Triggering critical containment breach.", 'res');
            window.NeuralConsole.beep(330, 0.4);
            window.NeuralConsole.beep(220, 0.6);
        }

        if (window.SFX && typeof window.SFX.triggerExplosion === 'function') {
            window.SFX.triggerExplosion();
        }
        if (window.setTotalKillsCount && window.getTotalKillsCount) {
            window.setTotalKillsCount(window.getTotalKillsCount() + 300); // Big bonus
        }

        // Final spectacular explosion cascade
        if (typeof emitParticle === 'function') {
            for (let p = 0; p < 250; p++) {
                emitParticle(
                    this.position.x + (Math.random() - 0.5) * 4,
                    this.position.y + (Math.random() - 0.5) * 2,
                    this.position.z + (Math.random() - 0.5) * 4,
                    (Math.random() - 0.5) * 32,
                    Math.random() * 24 + 6,
                    (Math.random() - 0.5) * 32,
                    0.0, 1.0, 0.8, 55.0 + Math.random() * 30.0, 3.0
                );
            }
        }

        this.dispose();
    }

    update(playerPos, delta, activeCamera = null) {
        if (!this.isEnabled) return;
        this.time += delta;
        this.camera = activeCamera || this.camera;

        // 1. Boss State Machine Updates
        this.stateTimer += delta;
        const duration = this.stateDurations[this.state];
        
        if (this.stateTimer >= duration) {
            this.stateTimer = 0.0;
            if (this.state === 'SPIN_CHARGE') {
                this.state = 'PISTON_SLAM';
                if (window.NeuralConsole) {
                    window.NeuralConsole.log("[AETHER WARNING]: NEXUS PRIME entering PISTON OVERDRIVE. Shockwave slam threat detected!", 'warn');
                    window.NeuralConsole.beep(440, 0.15);
                }
            } else if (this.state === 'PISTON_SLAM') {
                this.state = 'HELIOTROPE_SHIELD';
                if (window.NeuralConsole) {
                    window.NeuralConsole.log("[AETHER WARNING]: NEXUS PRIME shielding initialized! Defensive matrix absorbing 60% incoming damage.", 'sys');
                    window.NeuralConsole.beep(550, 0.2);
                }
            } else {
                this.state = 'SPIN_CHARGE';
                if (window.NeuralConsole) {
                    window.NeuralConsole.log("[AETHER WARNING]: NEXUS PRIME energy core spin charge cycle active. Glowing core exposed!", 'err');
                    window.NeuralConsole.beep(660, 0.15);
                }
            }
        }

        // State behavior & visuals
        const barStat = document.getElementById('aether-boss-health-status');
        if (barStat) barStat.innerText = `STATUS: ${this.state}`;

        if (this.state === 'SPIN_CHARGE') {
            this.targetAltitude = 532.05 + 6.5 + 1.2 * Math.sin(this.time * 2.2);
            this.npcMaterial.uniforms.uCoreColor.value.setRGB(1.0, 0.35, 0.0); // Orange charging core
            this.bossLight.color.setHex(0xff5500);
            this.bossLight.intensity = 6.0 + 3.0 * Math.sin(this.time * 12.0);
 
            // Orbit the player from a distance of 18 units, shifting slowly
            const orbitSpeed = 0.45;
            const targetX = playerPos.x + 18.0 * Math.cos(this.time * orbitSpeed);
            const targetZ = playerPos.z + 18.0 * Math.sin(this.time * orbitSpeed);
            this.homePosition.lerp(new THREE.Vector3(targetX, 532.05, targetZ), delta * 2.5);
 
            // Charge sparks
            if (typeof emitParticle === 'function' && Math.random() > 0.45) {
                emitParticle(
                    this.position.x + (Math.random() - 0.5) * 3,
                    this.position.y + (Math.random() - 0.5) * 3,
                    this.position.z + (Math.random() - 0.5) * 3,
                    (Math.random() - 0.5) * 4, -2.0, (Math.random() - 0.5) * 4,
                    1.0, 0.4, 0.0, 16.0, 0.4
                );
            }
 
        } else if (this.state === 'PISTON_SLAM') {
            this.targetAltitude = 532.05 + 4.5 + 0.5 * Math.sin(this.time * 6.0);
            this.npcMaterial.uniforms.uCoreColor.value.setRGB(0.0, 1.0, 0.85); // Teal sparks
            this.bossLight.color.setHex(0x00ffaa);
            this.bossLight.intensity = 4.5;
 
            // Chases the player directly!
            this.homePosition.lerp(new THREE.Vector3(playerPos.x, 532.05, playerPos.z), delta * 3.2);
 
            // Spawn slam contact hazard sparks if close to player
            const dx = playerPos.x - this.position.x;
            const dz = playerPos.z - this.position.z;
            const horizontalDist = Math.sqrt(dx * dx + dz * dz);
            
            if (horizontalDist < 6.0 && typeof window.takeDamage === 'function') {
                // Slam damage tick!
                window.takeDamage(1);
            }
 
            if (typeof emitParticle === 'function' && Math.random() > 0.3) {
                emitParticle(
                    this.position.x + (Math.random() - 0.5) * 4,
                    this.position.y - 3.0,
                    this.position.z + (Math.random() - 0.5) * 4,
                    (Math.random() - 0.5) * 12, 1.0, (Math.random() - 0.5) * 12,
                    0.0, 0.9, 0.9, 14.0, 0.35
                );
            }
 
        } else if (this.state === 'HELIOTROPE_SHIELD') {
            this.targetAltitude = 532.05 + 8.0 + 0.3 * Math.sin(this.time * 0.8);
            this.npcMaterial.uniforms.uCoreColor.value.setRGB(0.7, 0.0, 1.0); // Deep violet defensive shield
            this.bossLight.color.setHex(0x9900ff);
            this.bossLight.intensity = 5.0;
 
            // Slowly retreats to Spire Roof center (0, 0)
            this.homePosition.lerp(new THREE.Vector3(0, 532.05, 0), delta * 1.5);
 
            // Shield particles surrounding the torus ring
            if (typeof emitParticle === 'function' && Math.random() > 0.2) {
                const sAng = Math.random() * Math.PI * 2;
                const r = 5.5;
                emitParticle(
                    this.position.x + r * Math.cos(sAng),
                    this.position.y + (Math.random() - 0.5) * 1.0,
                    this.position.z + r * Math.sin(sAng),
                    (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2,
                    0.7, 0.05, 1.0, 18.0, 0.5
                );
            }
        }
 
        // Limit boss movement within Nacht Spire Roof boundaries (radius 24 from summit center)
        const dSqSum = this.homePosition.x * this.homePosition.x + this.homePosition.z * this.homePosition.z;
        if (dSqSum > 576.0) { // 24^2
            const d = Math.sqrt(dSqSum);
            this.homePosition.x = (this.homePosition.x / d) * 24.0;
            this.homePosition.z = (this.homePosition.z / d) * 24.0;
        }

        // 2. Kinematics Spring Bobbing
        const forceY = (this.targetAltitude - this.bossY) * this.springK;
        const accelY = forceY / this.bossMass;
        this.bossVy += accelY * delta;
        this.bossVy *= 0.95; // damping
        this.bossY += this.bossVy * delta;

        // Apply visual Y heights
        this.npcVolume.position.set(this.npcOffset.x, this.bossY - this.homePosition.y, this.npcOffset.z);

        this.position.set(
            this.homePosition.x + this.npcOffset.x,
            this.bossY,
            this.homePosition.z + this.npcOffset.z
        );

        this.group.position.copy(this.homePosition);

        // 3. Track player look yaw angle
        const dy = playerPos.z - this.position.z;
        const dx = playerPos.x - this.position.x;
        // Calculate look rotation around Y
        this.rotationY = Math.atan2(dx, dy);

        // 4. Update Shader Uniforms
        this.npcMaterial.uniforms.uTime.value = this.time;
        this.npcMaterial.uniforms.uBobOffset.value = this.bossY;
        this.npcMaterial.uniforms.uNPCOffset.value.copy(this.position);
        this.npcMaterial.uniforms.uRotationY.value = this.rotationY;
        this.npcMaterial.uniforms.uState.value = (this.state === 'SPIN_CHARGE') ? 0 : ((this.state === 'PISTON_SLAM') ? 1 : 2);
    }

    dispose() {
        this.isEnabled = false;
        
        // Remove mesh from scene
        if (this.group) {
            this.scene.remove(this.group);
        }

        // Clean up UI Health Bar
        const ui = document.getElementById('aether-boss-health-container');
        if (ui) ui.remove();

        // Clear global window references
        if (window.aetherMechBoss === this) {
            window.aetherMechBoss = null;
        }
    }
}

window.AetherMechBoss = AetherMechBoss;
