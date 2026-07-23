/**
 * MECHA-ZOMBIE BOSS - PROTO-TYPHON (Model-SDF.MechaZombie)
 * A second zombie robot variant featuring:
 * - Spinning sawblade gear-arm
 * - Horizontal reciprocating piston ribcage (Breathing engine cage)
 * - Helical neck screw
 * - Exhaust backpack venting toxic steam
 * - Toxic green/rust styling HUD
 */

const mechaRaymarchingVertexShader = `
    varying vec3 vWorldPosition;
    varying vec3 vLocalPosition;
    void main() {
        vLocalPosition = position;
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
    }
`;

const mechaRaymarchingFragmentShader = `
    uniform float uTime;
    uniform float uBobOffset;
    uniform vec3 uNPCOffset; // Boss world center position
    uniform float uRotationY; // Y-rotation to face player
    uniform int uState; // 0=SAW_CHARGE, 1=VENT_EXHAUST, 2=RECHARGE
    uniform vec3 uToxicColor;
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

    // Horizontal cylinder (oriented along X axis)
    float sdCylinderX(vec3 p, float h, float r) {
        vec2 d = abs(vec2(length(p.yz), p.x)) - vec2(r, h);
        return min(max(d.x, d.y), 0.0) + length(max(d, 0.0));
    }

    // Horizontal cylinder (oriented along Z axis)
    float sdCylinderZ(vec3 p, float h, float r) {
        vec2 d = abs(vec2(length(p.xy), p.z)) - vec2(r, h);
        return min(max(d.x, d.y), 0.0) + length(max(d, 0.0));
    }

    float sdEllipsoid(vec3 p, vec3 r) {
        float k0 = length(p/r);
        float k1 = length(p/(r*r));
        return k0*(k0-1.0)/k1;
    }

    float sdCapsule(vec3 p, vec3 a, vec3 b, float r) {
        vec3 pa = p - a, ba = b - a;
        float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
        return length(pa - ba * h) - r;
    }

    // 3D Spur Gear profile for Sawblade
    float sdGear3D(vec3 p, float r, float t_size, float n, float thickness, float angleOffset) {
        float angle = atan(p.z, p.y) + angleOffset; // Saw spins on YZ plane
        float radius = length(p.yz);
        float d2D = radius - r - t_size * sin(n * angle);
        float dX = abs(p.x) - thickness;
        return max(d2D, dX);
    }

    // Helical Neck Screw
    float sdHelicalBolt(vec3 p, float r, float pitch, float depth, float height) {
        float dist = length(p.xz) - r;
        float azimuth = atan(p.z, p.x);
        float tri = abs(fract(p.y * pitch - azimuth / 6.283185) - 0.5);
        float d = dist - tri * depth;
        float dY = abs(p.y) - height;
        return max(d * 0.707, dY);
    }

    // Main map
    float map(vec3 p, out int matId) {
        // Local coordinates relative to boss center
        vec3 hp = p - vec3(uNPCOffset.x, uBobOffset, uNPCOffset.z);

        // Rotate coordinate space around Y-axis to face the player
        float cosY = cos(uRotationY);
        float sinY = sin(uRotationY);
        vec3 rp = hp;
        rp.x = hp.x * cosY - hp.z * sinY;
        rp.z = hp.x * sinY + hp.z * cosY;

        // 1. Hunched Torso and Spine
        float dBackpack = sdCylinder(rp - vec3(0.0, 0.4, -0.9), 1.0, 0.35);
        float dTorsoHull = sdEllipsoid(rp - vec3(0.0, 0.4, -0.2), vec3(1.0, 0.9, 1.1));
        float dSpine = sdCapsule(rp, vec3(0.0, -0.7, -0.4), vec3(0.0, 0.9, -0.6), 0.22);
        float dTorso = smin(dTorsoHull, dSpine, 0.15);
        dTorso = smin(dTorso, dBackpack, 0.08);

        // 2. Helical Neck Screw
        vec3 rpNeck = rp - vec3(0.0, 1.3, 0.1);
        // Neck screw spins around Y
        float neckSpin = uTime * ((uState == 2) ? 8.0 : 3.0);
        float nCos = cos(neckSpin);
        float nSin = sin(neckSpin);
        vec3 rNeck = vec3(rpNeck.x * nCos - rpNeck.z * nSin, rpNeck.y, rpNeck.x * nSin + rpNeck.z * nCos);
        float dNeck = sdHelicalBolt(rNeck, 0.32, 5.0, 0.08, 0.4);

        // 3. Decayed Cybernetic Head
        vec3 pHead = rp - vec3(0.0, 2.0, 0.3);
        float dSkull = sdSphere(pHead, 0.52);
        
        // Searing bio-eyes
        float dEyeL = sdSphere(pHead - vec3(0.18, 0.12, 0.45), 0.06);
        float dEyeR = sdSphere(pHead - vec3(-0.18, 0.12, 0.45), 0.06);
        float dEyes = min(dEyeL, dEyeR);
        
        float dHead = smin(dSkull, dNeck, 0.06);

        // 4. Chainsaw Gear-Arm (Right Arm)
        float sawSpeed = (uState == 0) ? 14.0 : 4.0;
        vec3 pSaw = rp - vec3(1.6, -0.2, 0.5);
        // Saw gear rotates on YZ plane (around X axis)
        float dSawblade = sdGear3D(pSaw, 1.2, 0.18, 14.0, 0.08, uTime * sawSpeed);
        float dArmR_upper = sdCapsule(rp, vec3(0.9, 0.9, -0.1), vec3(1.3, 0.3, 0.2), 0.14);
        float dArmR_lower = sdCapsule(rp, vec3(1.3, 0.3, 0.2), vec3(1.6, -0.2, 0.5), 0.11);
        float dArmR = smin(dArmR_upper, dArmR_lower, 0.04);
        dArmR = smin(dArmR, dSawblade, 0.02);

        // 5. Robotic Skeletal Arm (Left Arm)
        float dArmL_upper = sdCapsule(rp, vec3(-0.9, 0.9, -0.1), vec3(-1.4, 0.1, 0.2), 0.12);
        float dArmL_lower = sdCapsule(rp, vec3(-1.4, 0.1, 0.2), vec3(-1.2, -0.6, 0.6), 0.09);
        float dClaw = sdCapsule(rp, vec3(-1.2, -0.6, 0.6), vec3(-1.4, -1.1, 0.8), 0.045);
        float dArmL = smin(dArmL_upper, dArmL_lower, 0.04);
        dArmL = smin(dArmL, dClaw, 0.02);

        // 6. Reciprocating Piston Ribcage (Horizontal slider-cranks on chest)
        float strokeSpeed = (uState == 1) ? 8.0 : 3.5;
        float strokeL = 0.58 + 0.22 * sin(uTime * strokeSpeed);
        float strokeR = 0.58 + 0.22 * sin(uTime * strokeSpeed + 3.1416);
        
        // Rib 1 (Y = 0.6)
        float dSleeveL1 = sdCylinderX(rp - vec3(-0.4, 0.6, 0.2), 0.35, 0.12);
        float dShaftL1 = sdCylinderX(rp - vec3(-strokeL, 0.6, 0.2), 0.45, 0.075);
        
        float dSleeveR1 = sdCylinderX(rp - vec3(0.4, 0.6, 0.2), 0.35, 0.12);
        float dShaftR1 = sdCylinderX(rp - vec3(strokeR, 0.6, 0.2), 0.45, 0.075);

        // Rib 2 (Y = 0.3)
        float dSleeveL2 = sdCylinderX(rp - vec3(-0.4, 0.3, 0.2), 0.35, 0.12);
        float dShaftL2 = sdCylinderX(rp - vec3(-strokeR, 0.3, 0.2), 0.45, 0.075);
        
        float dSleeveR2 = sdCylinderX(rp - vec3(0.4, 0.3, 0.2), 0.35, 0.12);
        float dShaftR2 = sdCylinderX(rp - vec3(strokeL, 0.3, 0.2), 0.45, 0.075);

        // Rib 3 (Y = 0.0)
        float dSleeveL3 = sdCylinderX(rp - vec3(-0.4, 0.0, 0.2), 0.35, 0.12);
        float dShaftL3 = sdCylinderX(rp - vec3(-strokeL, 0.0, 0.2), 0.45, 0.075);
        
        float dSleeveR3 = sdCylinderX(rp - vec3(0.4, 0.0, 0.2), 0.35, 0.12);
        float dShaftR3 = sdCylinderX(rp - vec3(strokeR, 0.0, 0.2), 0.45, 0.075);

        float dRibs = min(min(min(dSleeveL1, dShaftL1), min(dSleeveR1, dShaftR1)),
                          min(min(dSleeveL2, dShaftL2), min(dSleeveR2, dShaftR2)));
        dRibs = min(dRibs, min(min(dSleeveL3, dShaftL3), min(dSleeveR3, dShaftR3)));

        // 7. Exposed Battery core (pulsing inside ribcage)
        float corePulse = 1.0 + 0.15 * sin(uTime * 8.0);
        float dCore = sdSphere(rp - vec3(0.0, 0.32, 0.25), 0.35 * corePulse);

        // Combine all pieces
        float dMetal = min(dTorso, min(dArmR, dArmL));
        float dPistons = dRibs;
        float dTotal = min(dMetal, min(dPistons, dHead));

        matId = 2; // rusted steel chassis
        if (dTotal == dHead) {
            matId = 2;
        } else if (dTotal == dPistons) {
            matId = 3; // chrome pistons
        }

        // Sawblade gets polished chrome material
        if (dSawblade < dTotal + 0.01) {
            dTotal = min(dTotal, dSawblade);
            matId = 3;
        }

        // Helical neck screw gets glowing copper/amber material
        if (dNeck < dTotal + 0.01) {
            dTotal = min(dTotal, dNeck);
            matId = 4;
        }

        // Core / Eyes get glowing toxic green material
        float dGlows = min(dCore, dEyes);
        if (dGlows < dTotal) {
            dTotal = dGlows;
            matId = 1; // toxic green glow
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
        vec3 L = normalize(vec3(5.0, 8.0, 3.0));
        vec3 V = -rd;

        vec3 finalColor = vec3(0.0);
        float fresnel = pow(1.0 - max(dot(N, V), 0.0), 3.5);

        // Core local coords for procedural patterns
        vec3 hp = hitPoint - vec3(uNPCOffset.x, uBobOffset, uNPCOffset.z);

        if (matId == 1) {
            // Emissive Toxic Green Core/Eyes
            float pulse = 0.75 + 0.25 * sin(uTime * 12.0);
            finalColor = uToxicColor * pulse * 3.5;
            finalColor += vec3(0.9, 1.0, 0.8) * pow(max(dot(N, V), 0.0), 12.0) * 1.5;
        } else if (matId == 2) {
            // Rusted Steel/Carbon Fiber hunched body
            vec3 baseColor = mix(vec3(0.08, 0.04, 0.02), vec3(0.15, 0.12, 0.1), N.y * 0.5 + 0.5); // rust base
            float diffuse = max(dot(N, L), 0.0) * 0.5 + 0.05;
            
            vec3 R_vec = reflect(-L, N);
            float spec = pow(max(dot(R_vec, V), 0.0), 8.0) * 0.25;

            // Cybernetic grid lines (glowing dark green)
            float wire = 0.0;
            wire += smoothstep(0.95, 0.998, sin(hp.y * 5.0));
            wire += smoothstep(0.95, 0.998, cos(atan(hp.z, hp.x) * 6.0));
            vec3 wireColor = vec3(0.02, 0.45, 0.08) * 1.2;

            finalColor = baseColor * (diffuse + spec) + mix(vec3(0.0), wireColor, clamp(wire * 0.7, 0.0, 1.0));
            finalColor += vec3(0.08, 0.5, 0.05) * fresnel * 0.4;
        } else if (matId == 3) {
            // Polished Chrome sawblade & piston shafts
            vec3 baseColor = vec3(0.25, 0.28, 0.32);
            float diffuse = max(dot(N, L), 0.0) * 0.35 + 0.05;
            vec3 R_vec = reflect(-L, N);
            float spec = pow(max(dot(R_vec, V), 0.0), 48.0) * 1.4; // super high specular
            finalColor = baseColor * (diffuse + 0.08) + spec * vec3(0.85, 1.0, 0.9);
            finalColor += vec3(0.2, 0.7, 0.4) * fresnel * 0.3;
        } else if (matId == 4) {
            // Glowing Copper Neck Bolt
            vec3 baseColor = vec3(0.48, 0.25, 0.08);
            float diffuse = max(dot(N, L), 0.0) * 0.5;
            float boltGlow = smoothstep(0.4, 0.8, sin(hp.y * 12.0 - uTime * 6.0));
            vec3 emitColor = vec3(1.0, 0.5, 0.0) * boltGlow * 1.8;
            finalColor = baseColor * (diffuse + 0.1) + emitColor;
            finalColor += vec3(0.8, 0.4, 0.0) * fresnel * 0.3;
        }

        // Flawless Z-depth sorting
        vec4 projPos = projectionMatrix * viewMatrix * vec4(hitPoint, 1.0);
        gl_FragDepth = (projPos.z / projPos.w) * 0.5 + 0.5;

        gl_FragColor = vec4(finalColor, 1.0);
    }
`;

class MechaZombieBoss {
    constructor(scene, config = {}) {
        this.scene = scene;
        this.config = config;
        this.isEnabled = true;

        // Boss Health Stats
        this.maxHealth = 6000;
        this.health = this.maxHealth;

        // Position tracking
        this.homePosition = new THREE.Vector3(0, 0.05, 0);
        this.position = new THREE.Vector3(0, 2.05, 0);

        this.bossY = 2.05;
        this.bossVy = 0.0;
        this.bossMass = 140.0;
        this.springK = 40.0;

        this.npcOffset = new THREE.Vector3(0, 0, 0);
        this.rotationY = 0.0;

        this.time = 0.0;

        // States
        this.state = 'SAW_CHARGE';
        this.stateTimer = 0.0;
        this.stateDurations = {
            SAW_CHARGE: 6.0,      // Chainsaw active, charges player
            VENT_EXHAUST: 5.0,    // Vents green smoke particles, proximity hazard
            RECHARGE: 5.0         // Neck spins, shield active, reduced damage
        };

        // UI & Mesh Group Setup
        this.group = new THREE.Group();
        this.group.name = "MechaZombieBossInstance";

        this._buildShaders();
        this._buildMaterials();
        this._buildRaymarchedNPC();

        // Add to scene
        this.scene.add(this.group);
        this.group.position.copy(this.homePosition);

        this._createBossHealthBar();

        if (window.NeuralConsole) {
            window.NeuralConsole.log("[MECHA OUTBREAK]: PROTO-TYPHON cybernetic zombie robot deployed! Engage defensive protocols.", 'warn');
            window.NeuralConsole.beep(520, 0.3);
            window.NeuralConsole.beep(330, 0.4);
        }
    }

    _buildShaders() {
        this.raymarchVert = mechaRaymarchingVertexShader;
        this.raymarchFrag = mechaRaymarchingFragmentShader;
    }

    _buildMaterials() {
        this.npcMaterial = new THREE.ShaderMaterial({
            vertexShader: this.raymarchVert,
            fragmentShader: this.raymarchFrag,
            uniforms: {
                uTime: { value: 0.0 },
                uBobOffset: { value: 2.05 },
                uNPCOffset: { value: new THREE.Vector3() },
                uRotationY: { value: 0.0 },
                uState: { value: 0 },
                uToxicColor: { value: new THREE.Color(0.2, 1.0, 0.0) }, // Lime toxic green
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
        // Enclosing volume box for zombie robot shape (4x4x6 bounding area)
        const proxyVolumeGeometry = new THREE.BoxGeometry(6.0, 7.5, 6.0);
        this.npcVolume = new THREE.Mesh(proxyVolumeGeometry, this.npcMaterial);
        
        // Offset visual center above the home position
        this.npcVolume.position.set(0, 1.25, 0);
        this.group.add(this.npcVolume);

        // Toxic green point lights
        this.bossLight = new THREE.PointLight(0x33ff00, 4.0, 18.0);
        this.bossLight.position.set(0, 1.25, 0);
        this.group.add(this.bossLight);
    }

    _createBossHealthBar() {
        const existing = document.getElementById('mecha-boss-health-container');
        if (existing) existing.remove();

        const ui = document.createElement('div');
        ui.id = 'mecha-boss-health-container';
        ui.className = 'fixed top-[88px] left-1/2 -translate-x-1/2 w-[390px] bg-slate-950/80 border border-green-950/60 backdrop-blur-md px-4 py-2 rounded-sm z-[999] flex flex-col gap-1 select-none pointer-events-none transition-opacity duration-500';
        ui.innerHTML = `
            <div class="flex justify-between items-center text-[10px] tracking-[0.22em] font-bold">
                <span class="text-green-400 font-mono"><i class="fa-solid fa-industry animate-pulse text-[8px] mr-1"></i> MECHA_ZOMBIE // PROTO-TYPHON</span>
                <span id="mecha-boss-health-percent" class="text-slate-400 font-mono">100%</span>
            </div>
            <div class="h-2 w-full bg-slate-900 border border-slate-800/80 rounded-sm overflow-hidden p-[1px]">
                <div id="mecha-boss-health-bar" class="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-sm transition-all duration-300" style="width: 100%;"></div>
            </div>
            <div class="text-[9px] text-slate-500 font-mono uppercase text-right tracking-wider flex justify-between" id="mecha-boss-health-status-container">
                <span id="mecha-boss-health-hp" class="text-green-600/80">6000 / 6000 HP</span>
                <span id="mecha-boss-health-status">STATUS: SAW_CHARGE</span>
            </div>
        `;
        document.body.appendChild(ui);
    }

    takeDamage(amount) {
        if (!this.isEnabled) return;
        
        const isShielded = (this.state === 'RECHARGE');
        const dmgTaken = Math.round(isShielded ? amount * 0.40 : amount);
        this.health = Math.max(0, this.health - dmgTaken);

        // Flash damage numbers
        if (window.spawnDamageNumber) {
            window.spawnDamageNumber(
                this.position.x + (Math.random() - 0.5) * 1.5, 
                this.position.y + 2.0, 
                this.position.z + (Math.random() - 0.5) * 1.5, 
                isShielded ? `${dmgTaken} (BLOCK)` : dmgTaken, 
                isShielded
            );
        }

        // Spawn bright green spark particles
        if (typeof emitParticle === 'function') {
            const sparkCount = isShielded ? 18 : 10;
            for (let s = 0; s < sparkCount; s++) {
                emitParticle(
                    this.position.x, this.position.y + 0.8, this.position.z,
                    (Math.random() - 0.5) * 12, Math.random() * 6 + 2, (Math.random() - 0.5) * 12,
                    0.2, 1.0, 0.0, 28.0 + Math.random() * 10.0, 0.45
                );
            }
        }

        const pct = Math.max(0, (this.health / this.maxHealth) * 100);
        const bar = document.getElementById('mecha-boss-health-bar');
        const percentText = document.getElementById('mecha-boss-health-percent');
        const hpText = document.getElementById('mecha-boss-health-hp');
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
            window.NeuralConsole.log("[VOID STRIKE]: PROTO-TYPHON containment breach completed. System offline.", 'res');
            window.NeuralConsole.beep(220, 0.5);
        }

        if (window.SFX && typeof window.SFX.triggerExplosion === 'function') {
            window.SFX.triggerExplosion();
        }

        // Final green explosion cascade
        if (typeof emitParticle === 'function') {
            for (let p = 0; p < 200; p++) {
                emitParticle(
                    this.position.x + (Math.random() - 0.5) * 2,
                    this.position.y + 0.8,
                    this.position.z + (Math.random() - 0.5) * 2,
                    (Math.random() - 0.5) * 24,
                    Math.random() * 16 + 4,
                    (Math.random() - 0.5) * 24,
                    0.4, 1.0, 0.1, 48.0 + Math.random() * 20.0, 2.5
                );
            }
        }

        this.dispose();
    }

    update(playerPos, delta, activeCamera = null) {
        if (!this.isEnabled) return;
        this.time += delta;
        this.camera = activeCamera || this.camera;

        // 1. State Machine
        this.stateTimer += delta;
        const duration = this.stateDurations[this.state];
        
        if (this.stateTimer >= duration) {
            this.stateTimer = 0.0;
            if (this.state === 'SAW_CHARGE') {
                this.state = 'VENT_EXHAUST';
                if (window.NeuralConsole) {
                    window.NeuralConsole.log("[MECHA ALERT]: PROTO-TYPHON venting toxic steam! Stand back.", 'warn');
                    window.NeuralConsole.beep(330, 0.15);
                }
            } else if (this.state === 'VENT_EXHAUST') {
                this.state = 'RECHARGE';
                if (window.NeuralConsole) {
                    window.NeuralConsole.log("[MECHA ALERT]: PROTO-TYPHON head core recharge initiated. Shield active.", 'sys');
                }
            } else {
                this.state = 'SAW_CHARGE';
                if (window.NeuralConsole) {
                    window.NeuralConsole.log("[MECHA ALERT]: PROTO-TYPHON sawblade arm overdrive activated. Rushing player!", 'err');
                    window.NeuralConsole.beep(600, 0.2);
                }
            }
        }

        // State behavior
        const barStat = document.getElementById('mecha-boss-health-status');
        if (barStat) barStat.innerText = `STATUS: ${this.state}`;

        if (this.state === 'SAW_CHARGE') {
            this.targetAltitude = this.homePosition.y + 1.25 + 0.3 * Math.sin(this.time * 4.0);
            this.npcMaterial.uniforms.uToxicColor.value.setRGB(1.0, 0.6, 0.0); // Orange saw sparks
            this.bossLight.color.setHex(0xffaa00);

            // Chases player quickly
            this.homePosition.lerp(new THREE.Vector3(playerPos.x, this.homePosition.y, playerPos.z), delta * 3.5);

            // Chainsaw damage contact check
            const dx = playerPos.x - this.position.x;
            const dz = playerPos.z - this.position.z;
            if (Math.sqrt(dx * dx + dz * dz) < 3.2 && typeof window.takeDamage === 'function') {
                window.takeDamage(1.5);
            }

            // Saw contact sparks
            if (typeof emitParticle === 'function' && Math.random() > 0.4) {
                emitParticle(
                    this.position.x + 1.2 * Math.sin(this.rotationY),
                    this.position.y - 0.5,
                    this.position.z + 1.2 * Math.cos(this.rotationY),
                    (Math.random() - 0.5) * 8, 1.0, (Math.random() - 0.5) * 8,
                    1.0, 0.6, 0.1, 15.0, 0.3
                );
            }

        } else if (this.state === 'VENT_EXHAUST') {
            this.targetAltitude = this.homePosition.y + 1.0 + 0.1 * Math.sin(this.time * 2.5);
            this.npcMaterial.uniforms.uToxicColor.value.setRGB(0.2, 1.0, 0.0); // Toxic lime green
            this.bossLight.color.setHex(0x33ff00);

            // Chases player slowly, vents toxic steam
            this.homePosition.lerp(new THREE.Vector3(playerPos.x, this.homePosition.y, playerPos.z), delta * 1.5);

            // Proximity toxicity check
            const dx = playerPos.x - this.position.x;
            const dz = playerPos.z - this.position.z;
            if (Math.sqrt(dx * dx + dz * dz) < 5.0 && typeof window.takeDamage === 'function') {
                window.takeDamage(1);
            }

            // Vent steam particles
            if (typeof emitParticle === 'function') {
                // Steam venting from backpack
                emitParticle(
                    this.position.x - 0.8 * Math.sin(this.rotationY),
                    this.position.y + 1.5,
                    this.position.z - 0.8 * Math.cos(this.rotationY),
                    (Math.random() - 0.5) * 4 - 3.0 * Math.sin(this.rotationY),
                    2.0 + Math.random() * 3.0,
                    (Math.random() - 0.5) * 4 - 3.0 * Math.cos(this.rotationY),
                    0.3, 0.9, 0.1, 16.0, 0.6
                );
            }

        } else if (this.state === 'RECHARGE') {
            this.targetAltitude = this.homePosition.y + 1.8 + 0.15 * Math.sin(this.time * 1.2);
            this.npcMaterial.uniforms.uToxicColor.value.setRGB(0.0, 0.7, 1.0); // Cyan recharge glow
            this.bossLight.color.setHex(0x00ccff);

            // Retreats away from player
            const retreatDir = this.position.clone().sub(playerPos).normalize();
            const targetX = this.position.x + retreatDir.x * 6.0;
            const targetZ = this.position.z + retreatDir.z * 6.0;
            this.homePosition.lerp(new THREE.Vector3(targetX, this.homePosition.y, targetZ), delta * 2.0);

            // Recharge energy arcs
            if (typeof emitParticle === 'function' && Math.random() > 0.3) {
                emitParticle(
                    this.position.x + (Math.random() - 0.5) * 2.0,
                    this.position.y + 1.8,
                    this.position.z + (Math.random() - 0.5) * 2.0,
                    (Math.random() - 0.5) * 2, -1.0, (Math.random() - 0.5) * 2,
                    0.0, 0.8, 1.0, 14.0, 0.45
                );
            }
        }

        // Limit boss to general arena range (radius 75, or 37.5 on Nacht)
        const limit = window.NACHT_MODE ? 37.5 : 75.0;
        const dSqSum = this.homePosition.x * this.homePosition.x + this.homePosition.z * this.homePosition.z;
        if (dSqSum > limit * limit) {
            const d = Math.sqrt(dSqSum);
            this.homePosition.x = (this.homePosition.x / d) * limit;
            this.homePosition.z = (this.homePosition.z / d) * limit;
        }

        // Keep altitude on floor matching maps (especially Nacht vertical layers)
        if (window.NACHT_MODE && window.NachtSafeRooms) {
            let bestRoom = null;
            let minDistY = Infinity;
            for (let i = 0; i < window.NachtSafeRooms.length; i++) {
                const room = window.NachtSafeRooms[i];
                if (this.homePosition.x >= room.minX && this.homePosition.x <= room.maxX &&
                    this.homePosition.z >= room.minZ && this.homePosition.z <= room.maxZ) {
                    const distY = Math.abs((room.minY + room.maxY) / 2.0 - playerPos.y);
                    if (distY < minDistY) {
                        minDistY = distY;
                        bestRoom = room;
                    }
                }
            }
            if (bestRoom) {
                this.homePosition.y = bestRoom.minY + 0.05;
            }
        }

        // 2. Spring Bobbing
        const forceY = (this.targetAltitude - this.bossY) * this.springK;
        const accelY = forceY / this.bossMass;
        this.bossVy += accelY * delta;
        this.bossVy *= 0.94;
        this.bossY += this.bossVy * delta;

        // Apply heights
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
        this.rotationY = Math.atan2(dx, dy);

        // 4. Update Shader Uniforms
        this.npcMaterial.uniforms.uTime.value = this.time;
        this.npcMaterial.uniforms.uBobOffset.value = this.bossY;
        this.npcMaterial.uniforms.uNPCOffset.value.copy(this.position);
        this.npcMaterial.uniforms.uRotationY.value = this.rotationY;
        this.npcMaterial.uniforms.uState.value = (this.state === 'SAW_CHARGE') ? 0 : ((this.state === 'VENT_EXHAUST') ? 1 : 2);
    }

    dispose() {
        this.isEnabled = false;
        
        if (this.group) {
            this.scene.remove(this.group);
        }

        const ui = document.getElementById('mecha-boss-health-container');
        if (ui) ui.remove();

        if (window.mechaZombieBoss === this) {
            window.mechaZombieBoss = null;
        }
    }
}

window.MechaZombieBoss = MechaZombieBoss;
