/**
 * WhipTentacle — Procedural Bio-Organic WebGL Shader Appendage
 * Replaced with the high-fidelity 3D Procedural Bioweapon Tentacle raymarched fragment shader.
 * Renders seamlessly over the game world using screen-space discard transparency.
 */
class WhipTentacle extends THREE.Group {
    constructor() {
        super();
        this.name = "whip_tentacle";

        // Weapon states required for compatibility with index.html
        this.idleTime = 0;
        this.attackStartTime = -999.0;
        this.isCharging = false;
        this.chargeProgress = 0.0;
        this.whipComboType = 0;
        
        // Setup Uniforms
        this.uniforms = {
            iResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
            iTime: { value: 0.0 },
            iMouse: { value: new THREE.Vector2(window.innerWidth / 2, window.innerHeight / 2) },
            iAttackTime: { value: 999.0 }
        };

        // Screen-aligned quad vertex shader (passes vertices directly to clip space [-1, 1])
        const vsSource = `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = vec4(position, 1.0);
            }
        `;

        // Raymarching fragment shader grafted from tentacle9.html with background transparency (discard)
        const fsSource = `
            precision highp float;

            uniform vec2 iResolution;
            uniform float iTime;
            uniform vec2 iMouse;
            uniform float iAttackTime;

            varying vec2 vUv;

            // --- Math & Noise Utilities ---
            mat2 rot(float a) {
                float s = sin(a), c = cos(a);
                return mat2(c, -s, s, c);
            }

            float hash(float n) { return fract(sin(n) * 1e4); }
            float hash(vec2 p) { return fract(1e4 * sin(17.0 * p.x + p.y * 0.1) * (0.1 + abs(sin(p.y * 13.0 + p.x)))); }

            float noise(vec3 x) {
                const vec3 step = vec3(110, 241, 171);
                vec3 i = floor(x);
                vec3 f = fract(x);
                float n = dot(i, step);
                vec3 u = f * f * (3.0 - 2.0 * f);
                return mix(mix(mix( hash(n + dot(step, vec3(0, 0, 0))), hash(n + dot(step, vec3(1, 0, 0))), u.x),
                               mix( hash(n + dot(step, vec3(0, 1, 0))), hash(n + dot(step, vec3(1, 1, 0))), u.x), u.y),
                           mix(mix( hash(n + dot(step, vec3(0, 0, 1))), hash(n + dot(step, vec3(1, 0, 1))), u.x),
                               mix( hash(n + dot(step, vec3(0, 1, 1))), hash(n + dot(step, vec3(1, 1, 1))), u.x), u.y), u.z);
            }

            float fbm(vec3 p) {
                float f = 0.0;
                f += 0.5000 * noise(p); p *= 2.01;
                f += 0.2500 * noise(p); p *= 2.02;
                f += 0.1250 * noise(p); p *= 2.03;
                f += 0.0625 * noise(p);
                return f;
            }

            // Smooth minimum for blending flesh and bone materials
            vec2 smin2(vec2 a, vec2 b, float k) {
                float h = clamp(0.5 + 0.5 * (b.x - a.x) / k, 0.0, 1.0);
                float d = mix(b.x, a.x, h) - k * h * (1.0 - h);
                float m = mix(b.y, a.y, h);
                return vec2(d, m);
            }

            // --- SDF Geometry Setup ---
            // Maps world space to the curved local space of the tentacle
            vec3 getLocal(vec3 p) {
                vec3 q = p;
                
                // First Person Base anchor (bottom right, slightly forward)
                vec2 base = vec2(0.8, -1.0);
                float startZ = 0.5; 
                
                float localZ = max(0.0, q.z - startZ);
                
                // --- NON-EUCLIDEAN IDLE TWIST ---
                // Impossible twisting geometry that shifts over time
                float twist = sin(localZ * 0.4 - iTime * 0.8) * 0.5 * smoothstep(0.0, 4.0, localZ);
                q.xy *= rot(twist); 
                
                // Bend path towards screen center
                float curveX = -0.08; // Less curve, more direct/aggressive
                float curveY = 0.1;  
                
                // Organic wriggling animation
                float t = iTime * 1.5;
                // Sway peaks gently in the middle, dampens strongly towards the tip for rigidity
                float swayAmt = smoothstep(0.0, 3.0, localZ) * mix(1.0, 0.05, smoothstep(2.0, 6.5, localZ));
                float wX = sin(localZ * 0.8 - t) * 0.05 * swayAmt;
                float wY = cos(localZ * 0.7 - t * 0.8) * 0.05 * swayAmt;
                
                // --- DEVASTATING MECHANICAL WHIP ATTACK ---
                float att = iAttackTime;
                float isAttacking = step(0.0, att) * step(att, 2.0); 
                
                if (isAttacking > 0.5) {
                    // 0.0 -> 0.15: Windup (curl back tightly)
                    float windup = smoothstep(0.0, 0.15, att) * (1.0 - smoothstep(0.15, 0.25, att));
                    // 0.15 -> 0.3: Strike (snap forward/down)
                    float strike = smoothstep(0.15, 0.25, att) * (1.0 - smoothstep(0.3, 0.6, att));
                    // 0.2 -> 1.5: Flail/Vibrate (uncanny mechanical shudder)
                    float flail = smoothstep(0.2, 0.3, att) * (1.0 - smoothstep(0.3, 1.5, att));
                    
                    // Apply Windup (Tight unnatural spiral)
                    float spiral = localZ * 2.5;
                    wX += sin(spiral) * localZ * 0.4 * windup;
                    wY += cos(spiral) * localZ * 0.4 * windup;
                    q.z -= localZ * 0.3 * windup; // Compress length
                    
                    // Apply Strike (Brutal snap)
                    wY -= pow(localZ, 1.8) * 0.25 * strike; // Slam down heavily
                    wX += curveX * localZ * 3.0 * strike; // Straighten out towards center
                    q.z -= localZ * 0.5 * strike; // Extend violently forward
                    
                    // Apply Flail (High freq glitch/mechanical vibration)
                    float glitchX = sin(localZ * 40.0 - iTime * 100.0) * 0.04 * localZ * flail;
                    float glitchY = cos(localZ * 45.0 - iTime * 113.0) * 0.04 * localZ * flail;
                    wX += glitchX;
                    wY += glitchY;
                    
                    // Extra non-euclidean glitch during flail: local space stretching
                    q.xy *= rot(sin(iTime * 60.0) * 0.3 * flail);
                }
                
                // Mouse look sway (interactive)
                vec2 ms = (iMouse.xy / iResolution.xy) * 2.0 - 1.0;
                float mouseX = ms.x * swayAmt * 0.5;
                float mouseY = ms.y * swayAmt * 0.5;
                
                // Warp space
                q.x -= (base.x + localZ * curveX + wX + mouseX);
                q.y -= (base.y + localZ * curveY + wY + mouseY);
                q.z -= startZ;
                
                return q;
            }

            vec2 map(vec3 p) {
                vec3 q = getLocal(p);
                float len = 6.5; // Total length of the tentacle
                
                float h = clamp(q.z, 0.0, len);
                vec3 tq = vec3(q.x, q.y, q.z - h); // Distance to center spline
                
                // Tapered radius: MUCH skinnier base, terrifyingly sharp tip
                float r = mix(0.18, 0.03, pow(h / len, 0.7));
                
                // Muscular ridges / variance - almost removed for ultra-sleekness
                float ridges = (sin(h * 15.0) * 0.5 + 0.5) * 0.001 * smoothstep(0.0, 2.0, h);
                r -= ridges;
                
                float dBody = length(tq) - r;
                vec2 body = vec2(dBody, 1.0); // Material 1 = Blue Flesh
                
                // --- Spikes Setup ---
                // Move origin to the tip of the tentacle
                vec3 sq = q;
                sq.z -= len - 0.05; // Sink slightly into the flesh
                
                // Spike 1: Front Face (Points forward, slightly up)
                vec3 sq1 = sq;
                sq1.yz *= rot(0.25);
                sq1.y += sq1.z * sq1.z * 0.15; // Natural curved bend
                float l1 = 1.3; // Longer, more intimidating
                float dSp1 = length(vec3(sq1.x, sq1.y, sq1.z - clamp(sq1.z, 0.0, l1))) - mix(0.03, 0.001, pow(clamp(sq1.z/l1, 0.0, 1.0), 1.5));
                
                // Spike 2: Canted Right (Points forward, down, right)
                vec3 sq2 = sq;
                sq2.yz *= rot(-0.35); // tilt down
                sq2.xz *= rot(-0.6);  // splay right
                sq2.y += sq2.z * sq2.z * 0.2; // bend outwards
                float l2 = 0.95;
                float dSp2 = length(vec3(sq2.x, sq2.y, sq2.z - clamp(sq2.z, 0.0, l2))) - mix(0.025, 0.001, pow(clamp(sq2.z/l2, 0.0, 1.0), 1.5));

                // Spike 3: Canted Left (Points forward, down, left)
                vec3 sq3 = sq;
                sq3.yz *= rot(-0.35); // tilt down
                sq3.xz *= rot(0.6);   // splay left
                sq3.y += sq3.z * sq3.z * 0.2; // bend outwards
                float l3 = 0.95;
                float dSp3 = length(vec3(sq3.x, sq3.y, sq3.z - clamp(sq3.z, 0.0, l3))) - mix(0.025, 0.001, pow(clamp(sq3.z/l3, 0.0, 1.0), 1.5));
                
                // Combine Spikes
                float dSpikes = min(dSp1, min(dSp2, dSp3));
                vec2 spikes = vec2(dSpikes, 2.0); // Material 2 = White Bone
                
                // Organic biological blending using smin
                return smin2(body, spikes, 0.12);
            }

            // Add high-frequency skin bump detail only during normal calculation
            float mapBump(vec3 p) {
                vec2 res = map(p);
                if (res.y < 1.5) { // Flesh
                    // Ultra-smooth, micro-pore scale noise for realistic lighting breakdown
                    float b = fbm(p * 25.0) * 0.001 + fbm(p * 60.0) * 0.0003;
                    return res.x - b;
                } else { // Bone/Spikes
                    // Subtle striations
                    vec3 q = getLocal(p);
                    float b = sin(q.z * 40.0) * 0.002;
                    return res.x - b;
                }
            }

            vec3 calcNormal(vec3 p) {
                const vec2 k = vec2(1.0, -1.0);
                const float h = 0.001;
                return normalize(k.xyy * mapBump(p + k.xyy * h) +
                                 k.yyx * mapBump(p + k.yyx * h) +
                                 k.yxy * mapBump(p + k.yxy * h) +
                                 k.xxx * mapBump(p + k.xxx * h));
            }

            // Soft ambient occlusion
            float calcAO(vec3 pos, vec3 nor) {
                float occ = 0.0;
                float sca = 1.0;
                for(int i = 0; i < 5; i++) {
                    float h = 0.01 + 0.12 * float(i) / 4.0;
                    float d = map(pos + h * nor).x;
                    occ += (h - d) * sca;
                    sca *= 0.95;
                    if(occ > 0.35) break;
                }
                return clamp(1.0 - 3.0 * occ, 0.0, 1.0);
            }

            void main() {
                vec2 uv = (gl_FragCoord.xy - 0.5 * iResolution.xy) / iResolution.y;
                
                // Camera setup
                vec3 ro = vec3(0.0, sin(iTime * 1.5) * 0.02, 0.0); // slight breathing bob
                vec3 rd = normalize(vec3(uv, 1.0)); // 90 degree FOV
                
                // Raymarching Loop
                float t = 0.0;
                vec2 res = vec2(0.0);
                for(int i = 0; i < 150; i++) {
                    vec3 p = ro + rd * t;
                    res = map(p);
                    if(res.x < 0.001 || t > 15.0) break;
                    
                    // Reduce step size drastically during attack to prevent stepping through warped geometry
                    float stepMult = iAttackTime > 0.0 && iAttackTime < 1.5 ? 0.25 : 0.65;
                    t += res.x * stepMult; 
                }
                
                vec3 col = vec3(0.0);
                
                if(t < 15.0) {
                    // Surface Hit
                    vec3 p = ro + rd * t;
                    vec3 n = calcNormal(p);
                    vec3 v = normalize(ro - p);
                    
                    // --- Shader Profiling / Lighting ---
                    vec3 lightDir = normalize(vec3(0.8, 0.9, -0.3));
                    vec3 rimLightDir = normalize(vec3(-0.6, -0.3, 0.7));
                    
                    float dif = max(dot(n, lightDir), 0.0);
                    float rimDif = max(dot(n, rimLightDir), 0.0);
                    
                    vec3 h = normalize(lightDir + v);
                    
                    // Variable roughness/wetness for realistic skin
                    float wetness = fbm(p * 8.0) * 0.5 + 0.5;
                    float specExponent = mix(80.0, 400.0, wetness);
                    float spec = pow(max(dot(n, h), 0.0), specExponent) * (1.0 + wetness * 1.5); // Sharp, varied wet specular highlight
                    
                    float fresnel = pow(1.0 - max(dot(n, v), 0.0), 4.0);
                    
                    // Fake Subsurface Scattering (Wrap lighting)
                    float sss = max(0.0, (dot(n, lightDir) + 0.5) / 1.5);
                    sss = pow(sss, 2.0) * 0.4;
                    
                    float ao = calcAO(p, n);
                    
                    // --- Materials ---
                    vec3 qLocal = getLocal(p);
                    float zPos = clamp(qLocal.z, 0.0, 6.5);
                    float matBlend = clamp(res.y - 1.0, 0.0, 1.0); // 0 = flesh, 1 = spike
                    
                    // Base Flesh (Deep, intimidating oceanic dark blues)
                    vec3 skinBase = mix(vec3(0.01, 0.02, 0.06), vec3(0.02, 0.06, 0.12), fbm(p * 4.0));
                    
                    // Faint, slick mottling
                    float mottle = fbm(p * 15.0 - iTime * 0.1);
                    skinBase = mix(skinBase, vec3(0.05, 0.1, 0.2), smoothstep(0.6, 0.9, mottle) * 0.5); 
                    
                    // Spikes (Stained bone white/yellow)
                    vec3 spikeBase = vec3(0.85, 0.8, 0.75);
                    spikeBase *= 0.7 + 0.3 * sin(qLocal.z * 25.0); // texture
                    spikeBase = mix(spikeBase, vec3(0.1, 0.05, 0.05), smoothstep(0.8, 1.0, fbm(p * 10.0))); // Grime
                    
                    vec3 albedo = mix(skinBase, spikeBase, matBlend);
                    
                    // Apply lighting
                    vec3 diffuseLight = dif * vec3(1.0, 0.95, 0.9) + rimDif * vec3(0.2, 0.4, 0.6) * 0.6;
                    col = albedo * diffuseLight;
                    
                    // SSS injected in shadow terminator
                    vec3 sssColor = mix(vec3(0.0, 0.2, 0.5), vec3(0.3, 0.1, 0.0), matBlend); // Bio-cyan undertones
                    col += sssColor * sss * (1.0 - matBlend);
                    
                    // Add Wet Specularity and Fresnel Rim
                    col += spec * mix(vec3(0.8, 0.9, 1.0), vec3(1.0), wetness);
                    col += fresnel * mix(vec3(0.2, 0.5, 0.9), vec3(0.8, 0.8, 0.8), matBlend) * 0.9;
                    
                    // Fake Environment Reflection
                    float fakeEnv = smoothstep(0.4, 1.0, reflect(-v, n).y);
                    col += fakeEnv * vec3(0.02, 0.08, 0.15) * fresnel * wetness;
                    
                    col *= ao;
                    
                    // --- Emissive Pulsing Light ---
                    float pPhase = zPos * 2.5 - iTime * 4.0;
                    float pulseVal = sin(pPhase);
                    float bioGlow = pow(smoothstep(0.8, 1.0, pulseVal), 2.0); // Sharper, more aggressive pulse
                    
                    // Mask glow - less ribbed, more of a sweeping organic pulse
                    float pulseMask = sin(zPos * 4.0 - iTime * 0.5) * 0.5 + 0.5; 
                    bioGlow *= mix(0.3, 1.0, pulseMask);
                    
                    // Break up glow with noise for realism - like glowing veins beneath smooth skin
                    float veinGlow = fbm(p * 18.0 - iTime * 1.5);
                    bioGlow *= smoothstep(0.4, 0.8, veinGlow) * 2.5;
                    
                    // Attack color override
                    float att = iAttackTime;
                    float attackGlowPhase = smoothstep(0.0, 0.1, att) * (1.0 - smoothstep(1.0, 1.5, att));
                    
                    vec3 glowColBase = vec3(0.0, 0.6, 1.0); // Toxic cyan/blue
                    vec3 glowColAttack = vec3(1.0, 0.1, 0.0); // Devastating mechanical red
                    vec3 glowCol = mix(glowColBase, glowColAttack, attackGlowPhase) * bioGlow * 4.0;
                    
                    // Amp up the glow drastically during strike to simulate overdrive
                    glowCol += glowColAttack * 2.0 * attackGlowPhase * pow(sin(att * 50.0) * 0.5 + 0.5, 4.0);
                    
                    col += glowCol * ao * (1.0 - matBlend); // Emit only from flesh, shaded by AO
                    
                    gl_FragColor = vec4(col, 1.0);
                } else {
                    // Discard background to allow full transparency over the game world
                    discard;
                }
            }
        `;

        // Viewport-covering screen quad material
        const material = new THREE.ShaderMaterial({
            uniforms: this.uniforms,
            vertexShader: vsSource,
            fragmentShader: fsSource,
            transparent: true,
            depthWrite: false,
            depthTest: false
        });

        // Geometry spanning clip space coords
        const geometry = new THREE.PlaneGeometry(2, 2);
        const screenQuad = new THREE.Mesh(geometry, material);
        this.add(screenQuad);

        // Bind interactive mousemove tracking
        this.mouseMoveHandler = (e) => {
            this.uniforms.iMouse.value.set(e.clientX, window.innerHeight - e.clientY);
        };
        window.addEventListener('mousemove', this.mouseMoveHandler);
    }

    fire() {
        this.attackStartTime = this.idleTime;
        this.playProceduralWetSound();
    }

    playProceduralWetSound() {
        try {
            if (!window.audioCtx) {
                window.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            }
            const ctx = window.audioCtx;
            if (ctx.state === 'suspended') {
                ctx.resume();
            }

            const t = ctx.currentTime;
            const osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(320, t);
            osc.frequency.exponentialRampToValueAtTime(50, t + 0.32);
            
            const mod = ctx.createOscillator();
            mod.type = 'sawtooth';
            mod.frequency.setValueAtTime(120, t);
            
            const modGain = ctx.createGain();
            modGain.gain.setValueAtTime(90, t);

            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0.25, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

            mod.connect(modGain);
            modGain.connect(osc.frequency);
            osc.connect(gain);
            gain.connect(ctx.destination);

            mod.start();
            osc.start();
            mod.stop(t + 0.38);
            osc.stop(t + 0.38);
        } catch (e) {
            // Audio context not allowed or initialized yet
        }
    }

    update(uTime, delta, isFiring, isADS, mouseVelX, mouseVelY, grabbedZombieWorldPos) {
        this.idleTime = uTime;
        this.uniforms.iTime.value = uTime;
        this.uniforms.iResolution.value.set(window.innerWidth, window.innerHeight);

        // Trigger attack on firing input
        if (isFiring && (uTime - this.attackStartTime > 2.0 || this.attackStartTime === -999.0)) {
            this.attackStartTime = uTime;
        }

        this.uniforms.iAttackTime.value = uTime - this.attackStartTime;
    }

    // Clean up event listener when weapon is destroyed / switched out
    destroy() {
        window.removeEventListener('mousemove', this.mouseMoveHandler);
    }
}

// Global hook registration
window.WhipTentacle = WhipTentacle;
