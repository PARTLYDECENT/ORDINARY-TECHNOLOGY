/**
 * EASTER EGG — "THE PRESENCE"
 * A random SDF biomass horror event that hijacks the HUD.
 * Uses the same WebGL overlay pipeline as SDFGUI but with its own
 * horrific warping shader. Triggers randomly, lasts a few seconds,
 * then dissolves away like it was never there.
 */

class EasterEgg {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.active = false;
        this.timer = 0;
        this.duration = 0;
        this.cooldown = 0;
        this.triggered = false;
        this.phase = 0; // 0 = dormant, 1 = emerging, 2 = full presence, 3 = dissolving

        // Minimum time before first possible trigger (60-180s of gameplay)
        this.minFirstTrigger = 60 + Math.random() * 120;
        this.totalElapsed = 0;

        // Ortho camera for screen-space overlay
        this.camera = new THREE.OrthographicCamera(
            -width / 2, width / 2,
            height / 2, -height / 2,
            0.1, 10
        );
        this.camera.position.z = 1;
        this.scene = new THREE.Scene();

        this._buildShader();

        const geo = new THREE.PlaneGeometry(width, height);
        this.mesh = new THREE.Mesh(geo, this.material);
        this.scene.add(this.mesh);
    }

    _buildShader() {
        const vert = `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `;

        const frag = `
            uniform vec2 uResolution;
            uniform float uTime;
            uniform float uPresence;   // 0.0 = invisible, 1.0 = full horror
            uniform float uPhase;      // 0-3 phase indicator
            uniform float uSeed;       // random seed per trigger

            varying vec2 vUv;

            // --- Noise Primitives ---
            float hash12(vec2 p) {
                vec3 p3 = fract(vec3(p.xyx) * .1031);
                p3 += dot(p3, p3.yzx + 33.33);
                return fract((p3.x + p3.y) * p3.z);
            }

            float hash11(float p) {
                p = fract(p * .1031);
                p *= p + 33.33;
                p *= p + p;
                return fract(p);
            }

            float noise(vec2 p) {
                vec2 i = floor(p);
                vec2 f = fract(p);
                vec2 u = f * f * (3.0 - 2.0 * f);
                return mix(
                    mix(hash12(i + vec2(0.0, 0.0)), hash12(i + vec2(1.0, 0.0)), u.x),
                    mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), u.x),
                    u.y
                );
            }

            float fbm(vec2 x) {
                float v = 0.0;
                float a = 0.5;
                vec2 shift = vec2(100.0);
                mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
                for (int i = 0; i < 6; ++i) {
                    v += a * noise(x);
                    x = rot * x * 2.0 + shift;
                    a *= 0.5;
                }
                return v;
            }

            float sdCircle(vec2 p, float r) {
                return length(p) - r;
            }

            float smin(float a, float b, float k) {
                float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
                return mix(b, a, h) - k * h * (1.0 - h);
            }

            // --- Warped Biomass SDF ---
            float biomass(vec2 p, float t) {
                // Central pulsating mass
                float pulse = sin(t * 3.0) * 0.3 + 1.0;
                float core = sdCircle(p, 80.0 * pulse * uPresence);

                // Noise warp the entire coordinate space
                vec2 warped = p;
                warped += vec2(
                    fbm(p * 0.01 + t * 2.0 + uSeed) - 0.5,
                    fbm(p * 0.01 - t * 1.5 + uSeed + 50.0) - 0.5
                ) * 120.0 * uPresence;

                // Organic deformation
                float deform = fbm(warped * 0.02 + t) * 60.0;
                core += deform;

                // Satellite blobs that orbit and merge
                for (int i = 0; i < 5; i++) {
                    float fi = float(i);
                    float angle = t * (0.5 + fi * 0.3) + fi * 1.2566 + uSeed;
                    float dist = (60.0 + sin(t * 2.0 + fi) * 30.0) * uPresence;
                    vec2 blobPos = vec2(cos(angle), sin(angle)) * dist;
                    float blobR = 20.0 + fbm(vec2(t + fi, uSeed)) * 15.0;
                    float blob = sdCircle(p - blobPos, blobR * uPresence);
                    core = smin(core, blob, 30.0);
                }

                return core;
            }

            // --- Vein/Tendril System ---
            float veins(vec2 p, float t) {
                float d = 1000.0;
                for (int i = 0; i < 8; i++) {
                    float fi = float(i);
                    float angle = fi * 0.7854 + uSeed; // PI/4 spacing
                    vec2 dir = vec2(cos(angle), sin(angle));

                    // Undulating tendril path
                    vec2 start = vec2(0.0);
                    float len = (150.0 + sin(t * 1.5 + fi) * 50.0) * uPresence;
                    vec2 end = dir * len;

                    // Warp the tendril with noise
                    vec2 mid = (start + end) * 0.5;
                    mid += vec2(sin(t * 3.0 + fi), cos(t * 2.5 + fi)) * 30.0;

                    // Approximate curved capsule with two segments
                    vec2 pa1 = p - start;
                    vec2 ba1 = mid - start;
                    float h1 = clamp(dot(pa1, ba1) / dot(ba1, ba1), 0.0, 1.0);
                    float d1 = length(pa1 - ba1 * h1) - (2.0 + sin(t * 5.0 + fi) * 1.0);

                    vec2 pa2 = p - mid;
                    vec2 ba2 = end - mid;
                    float h2 = clamp(dot(pa2, ba2) / dot(ba2, ba2), 0.0, 1.0);
                    float d2 = length(pa2 - ba2 * h2) - (1.5 + cos(t * 4.0 + fi) * 0.5);

                    float tendril = min(d1, d2);
                    // Add noise thickening
                    tendril += fbm(p * 0.05 + t + fi) * 5.0;
                    d = min(d, tendril);
                }
                return d;
            }

            // --- The Eye ---
            float theEye(vec2 p, float t) {
                // Outer eye shape (elliptical)
                vec2 ep = p;
                ep.x *= 0.6; // Stretch horizontally
                float outer = sdCircle(ep, 25.0 * uPresence);

                // Iris
                float iris = sdCircle(p, 12.0 * uPresence);

                // Pupil that tracks / dilates
                float pupilSize = 5.0 + sin(t * 8.0) * 2.0;
                vec2 pupilOffset = vec2(sin(t * 1.5), cos(t * 2.0)) * 4.0;
                float pupil = sdCircle(p - pupilOffset, pupilSize * uPresence);

                return pupil;
            }

            // --- Dripping Effect ---
            float drips(vec2 p, float t) {
                float d = 1000.0;
                for (int i = 0; i < 6; i++) {
                    float fi = float(i);
                    float x = (hash11(fi + uSeed) - 0.5) * uResolution.x * 0.6;
                    float dropSpeed = 80.0 + hash11(fi + uSeed + 10.0) * 120.0;
                    float y = mod(t * dropSpeed + hash11(fi + uSeed + 20.0) * 500.0, uResolution.y) - uResolution.y * 0.5;
                    y = -y; // Drip downward
                    
                    // Elongated drop shape
                    vec2 dp = p - vec2(x, y);
                    dp.y *= 0.3; // Stretch vertically
                    float drop = sdCircle(dp, 4.0 + sin(t * 3.0 + fi) * 2.0);
                    
                    // Trail above the drop
                    vec2 tp = p - vec2(x, y + 20.0);
                    tp.x *= 2.0;
                    float trail = sdCircle(tp, 2.0);
                    
                    d = smin(d, min(drop, trail), 8.0);
                }
                return d * (1.0 / uPresence);
            }

            void main() {
                if (uPresence < 0.001) {
                    gl_FragColor = vec4(0.0);
                    return;
                }

                vec2 px = (vUv - 0.5) * uResolution;
                vec3 finalColor = vec3(0.0);
                float alpha = 0.0;
                float t = uTime;

                // === SCREEN WARP (distort everything) ===
                vec2 warpedUv = vUv;
                float warpStrength = uPresence * 0.03;
                warpedUv += vec2(
                    sin(vUv.y * 20.0 + t * 5.0) * warpStrength,
                    cos(vUv.x * 15.0 + t * 4.0) * warpStrength
                );
                vec2 wpx = (warpedUv - 0.5) * uResolution;

                // === 1. BIOMASS CORE ===
                float dMass = biomass(wpx, t);
                float massGlow = 1.0 - smoothstep(0.0, 25.0, dMass);
                float massCore = 1.0 - smoothstep(0.0, 3.0, dMass);

                if (massGlow > 0.0) {
                    // Shifting color from deep purple/red to sickly green
                    float colorShift = fbm(wpx * 0.01 + t * 0.5);
                    vec3 c1 = vec3(0.3, 0.0, 0.15); // Dark crimson
                    vec3 c2 = vec3(0.0, 0.4, 0.1);  // Toxic green
                    vec3 c3 = vec3(0.5, 0.0, 0.5);  // Purple
                    vec3 massColor = mix(c1, c2, colorShift);
                    massColor = mix(massColor, c3, sin(t * 2.0) * 0.5 + 0.5);
                    massColor += massCore * vec3(0.8, 0.2, 0.1); // Hot core

                    // Internal texture
                    float tex = fbm(wpx * 0.03 + t * 2.0) * 0.4;
                    massColor += tex * vec3(0.1, 0.3, 0.0);

                    finalColor = massColor;
                    alpha = massGlow * uPresence;
                }

                // === 2. VEIN TENDRILS ===
                float dVeins = veins(wpx, t);
                float veinGlow = 1.0 - smoothstep(0.0, 8.0, dVeins);
                float veinCore = 1.0 - smoothstep(0.0, 1.5, dVeins);

                if (veinGlow > 0.0) {
                    // Pulsing blood color
                    float pulse = sin(t * 6.0 - length(wpx) * 0.05) * 0.5 + 0.5;
                    vec3 veinColor = mix(vec3(0.15, 0.0, 0.0), vec3(0.6, 0.0, 0.05), pulse);
                    veinColor += veinCore * vec3(0.9, 0.1, 0.0); // Bright arterial core

                    finalColor = mix(finalColor, veinColor, veinGlow * uPresence);
                    alpha = max(alpha, veinGlow * uPresence * 0.9);
                }

                // === 3. THE EYE (appears in phase 2) ===
                if (uPhase >= 1.5) {
                    float eyePresence = smoothstep(1.5, 2.0, uPhase);
                    float dEye = theEye(wpx, t);

                    // Outer eye glow
                    vec2 eyeP = wpx;
                    eyeP.x *= 0.6;
                    float outerEye = sdCircle(eyeP, 25.0 * uPresence);
                    float eyeGlow = 1.0 - smoothstep(0.0, 15.0, outerEye);
                    float irisGlow = 1.0 - smoothstep(0.0, 5.0, sdCircle(wpx, 12.0 * uPresence));
                    float pupilGlow = 1.0 - smoothstep(0.0, 2.0, dEye);

                    if (eyeGlow > 0.0) {
                        vec3 eyeColor = mix(vec3(0.1, 0.0, 0.0), vec3(0.8, 0.6, 0.0), irisGlow); // Dark red -> amber iris
                        eyeColor = mix(eyeColor, vec3(0.0), pupilGlow); // Black pupil
                        eyeColor += vec3(0.3, 0.0, 0.0) * (1.0 - irisGlow) * eyeGlow; // Red sclera

                        finalColor = mix(finalColor, eyeColor, eyeGlow * eyePresence * uPresence);
                        alpha = max(alpha, eyeGlow * eyePresence * uPresence);
                    }
                }

                // === 4. DRIPPING RESIDUE ===
                float dDrip = drips(wpx, t);
                float dripGlow = 1.0 - smoothstep(0.0, 6.0, dDrip);
                if (dripGlow > 0.0) {
                    vec3 dripColor = vec3(0.1, 0.2, 0.0) + fbm(wpx * 0.05 + t) * vec3(0.05, 0.1, 0.0);
                    finalColor = mix(finalColor, dripColor, dripGlow * uPresence * 0.7);
                    alpha = max(alpha, dripGlow * uPresence * 0.7);
                }

                // === 5. SCREEN EDGE CREEP ===
                // Darkness/tendrils creeping in from screen edges
                float edgeDist = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
                float edgeCreep = 1.0 - smoothstep(0.0, 0.15 + 0.1 * sin(t * 2.0), edgeDist);
                edgeCreep *= uPresence;
                // Add noise to make it organic
                edgeCreep *= 0.5 + 0.5 * fbm(vUv * 10.0 + t * 2.0);
                if (edgeCreep > 0.0) {
                    finalColor = mix(finalColor, vec3(0.05, 0.0, 0.0), edgeCreep);
                    alpha = max(alpha, edgeCreep * 0.8);
                }

                // === 6. CHROMATIC ABERRATION HORROR ===
                float caStrength = uPresence * 0.008 * (1.0 + sin(t * 10.0) * 0.5);
                if (alpha > 0.1) {
                    finalColor.r += fbm(vUv * 30.0 + t * 3.0) * caStrength * 40.0;
                    finalColor.b += fbm(vUv * 25.0 - t * 2.0) * caStrength * 30.0;
                }

                // === FINAL SCANLINE HORROR ===
                float scanline = sin(vUv.y * uResolution.y * 1.5 + t * 30.0) * 0.5 + 0.5;
                alpha *= 0.9 + scanline * 0.1;

                gl_FragColor = vec4(finalColor, alpha);
            }
        `;

        this.material = new THREE.ShaderMaterial({
            vertexShader: vert,
            fragmentShader: frag,
            uniforms: {
                uResolution: { value: new THREE.Vector2(this.width, this.height) },
                uTime: { value: 0.0 },
                uPresence: { value: 0.0 },
                uPhase: { value: 0.0 },
                uSeed: { value: Math.random() * 100.0 }
            },
            transparent: true,
            depthTest: false,
            depthWrite: false
        });
    }

    /**
     * Called every frame from the main animate() loop.
     * @param {THREE.WebGLRenderer} renderer
     * @param {number} delta - frame delta in seconds
     * @param {number} time  - total elapsed time
     */
    update(renderer, delta, time) {
        this.totalElapsed += delta;

        // Don't trigger before the minimum warmup period
        if (this.totalElapsed < this.minFirstTrigger) return;

        // Cooldown between events
        if (this.cooldown > 0) {
            this.cooldown -= delta;
            return;
        }

        // --- Dormant: randomly decide to trigger ---
        if (!this.active) {
            // ~0.3% chance per frame (~once every ~5-8 minutes at 60fps)
            if (Math.random() < 0.0003) {
                this._trigger();
            }
            return;
        }

        // --- Active event ---
        this.timer += delta;
        const t = this.timer;
        const dur = this.duration;

        // Phase transitions
        if (t < dur * 0.15) {
            // Phase 1: Emerging (0% to 15% of duration)
            this.phase = 1;
            this.material.uniforms.uPresence.value = smoothstep(0, dur * 0.15, t);
        } else if (t < dur * 0.7) {
            // Phase 2: Full Presence (15% to 70%)
            this.phase = 2;
            this.material.uniforms.uPresence.value = 1.0;
        } else if (t < dur) {
            // Phase 3: Dissolving (70% to 100%)
            this.phase = 3;
            this.material.uniforms.uPresence.value = 1.0 - smoothstep(dur * 0.7, dur, t);
        } else {
            // Done
            this._deactivate();
            return;
        }

        this.material.uniforms.uTime.value = time;
        this.material.uniforms.uPhase.value = this.phase;

        // Render the horror overlay
        const autoClear = renderer.autoClear;
        renderer.autoClear = false;
        renderer.clearDepth();
        renderer.render(this.scene, this.camera);
        renderer.autoClear = autoClear;
    }

    _trigger() {
        this.active = true;
        this.timer = 0;
        this.duration = 3.0 + Math.random() * 4.0; // 3-7 seconds of horror
        this.material.uniforms.uSeed.value = Math.random() * 100.0;
        this.material.uniforms.uPresence.value = 0.0;
        this.phase = 1;
        console.log('%c[THE PRESENCE] ...something stirs...', 'color: #ff0000; font-weight: bold; text-shadow: 0 0 10px red');
    }

    _deactivate() {
        this.active = false;
        this.material.uniforms.uPresence.value = 0.0;
        this.phase = 0;
        // Cooldown: 2-6 minutes before it can happen again
        this.cooldown = 120 + Math.random() * 240;
    }

    resize(w, h) {
        this.width = w;
        this.height = h;

        this.camera.left = -w / 2;
        this.camera.right = w / 2;
        this.camera.top = h / 2;
        this.camera.bottom = -h / 2;
        this.camera.updateProjectionMatrix();

        this.mesh.geometry.dispose();
        this.mesh.geometry = new THREE.PlaneGeometry(w, h);
        this.material.uniforms.uResolution.value.set(w, h);
    }
}

// Utility
function smoothstep(edge0, edge1, x) {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
}

window.EasterEgg = EasterEgg;
