/**
 * WebGL SDF GUI System
 * Replaces HTML/CSS UI with a fast, scalable Signed Distance Field shader and CanvasText overlay.
 */

class SDFGUI {
    constructor(width, height) {
        this.width = width;
        this.height = height;

        // Create Orthographic Camera
        this.camera = new THREE.OrthographicCamera(
            -width / 2, width / 2,
            height / 2, -height / 2,
            0.1, 10
        );
        this.camera.position.z = 1;

        this.scene = new THREE.Scene();

        // Canvas for Text Rendering
        this.canvas = document.createElement('canvas');
        this.canvas.width = width;
        this.canvas.height = height;
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });

        this.textTexture = new THREE.CanvasTexture(this.canvas);
        this.textTexture.minFilter = THREE.LinearFilter;
        this.textTexture.magFilter = THREE.LinearFilter;
        this.textTexture.needsUpdate = true;

        // UI State
        this.state = {
            health: 100,
            maxHealth: 100,
            ammo: '∞',
            weaponName: 'Service Pistol',
            kills: 0,
            zombies: 0,
            objectiveName: 'INITIALIZING...',
            objectiveProgress: 0,
            objectiveCount: '0/0',
            hitmarkerTimer: 0.0,
            nodesActive: '2 / 2'
        };
        this.lastStateStr = '';

        this.setupShader();

        // Full screen quad
        const geo = new THREE.PlaneGeometry(width, height);
        this.mesh = new THREE.Mesh(geo, this.material);
        this.scene.add(this.mesh);

        this.updateText();
    }

    setupShader() {
        const vert = `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `;

        const frag = `
            uniform sampler2D uTextTex;
            uniform vec2 uResolution;
            uniform float uHealthPct;
            uniform float uHitmarker;
            uniform float uTime;
            uniform float uObjPct;

            varying vec2 vUv;

            // --- Noise & SDF Primitives ---
            float hash12(vec2 p) {
                vec3 p3  = fract(vec3(p.xyx) * .1031);
                p3 += dot(p3, p3.yzx + 33.33);
                return fract((p3.x + p3.y) * p3.z);
            }

            float noise(in vec2 p) {
                vec2 i = floor(p);
                vec2 f = fract(p);
                vec2 u = f*f*(3.0-2.0*f);
                return mix( mix( hash12( i + vec2(0.0,0.0) ), 
                                 hash12( i + vec2(1.0,0.0) ), u.x),
                            mix( hash12( i + vec2(0.0,1.0) ), 
                                 hash12( i + vec2(1.0,1.0) ), u.x), u.y);
            }

            float fbm(vec2 x) {
                float v = 0.0;
                float a = 0.5;
                vec2 shift = vec2(100.0);
                mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
                for (int i = 0; i < 4; ++i) {
                    v += a * noise(x);
                    x = rot * x * 2.0 + shift;
                    a *= 0.5;
                }
                return v;
            }

            float smin(float a, float b, float k) {
                float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
                return mix(b, a, h) - k * h * (1.0 - h);
            }

            float sdCircle(vec2 p, float r) {
                return length(p) - r;
            }

            float sdCapsule(vec2 p, vec2 a, vec2 b, float r) {
                vec2 pa = p - a, ba = b - a;
                float h = clamp( dot(pa,ba)/dot(ba,ba), 0.0, 1.0 );
                return length( pa - ba*h ) - r;
            }

            // --- 5-Form Morphing Crosshair (Tactical/Biological) ---
            float sdBox(vec2 p, vec2 b) {
                vec2 d = abs(p)-b;
                return length(max(d,0.0)) + min(max(d.x,d.y),0.0);
            }
            float sdEquilateralTriangle(in vec2 p, in float r) {
                const float k = sqrt(3.0);
                p.x = abs(p.x) - r;
                p.y = p.y + r/k;
                if( p.x+k*p.y>0.0 ) p = vec2(p.x-k*p.y,-k*p.x-p.y)/2.0;
                p.x -= clamp( p.x, -2.0*r, 0.0 );
                return -length(p)*sign(p.y);
            }

            float crosshairForms(vec2 p) {
                float cycle = 39.0;
                float t = mod(uTime, cycle);
                float state = floor(t / (cycle / 5.0));
                float progress = fract(t / (cycle / 5.0));
                progress = smoothstep(0.0, 1.0, progress);

                // Form 0: Classic Cross (+)
                float d0 = min(sdBox(p, vec2(12.0, 1.2)), sdBox(p, vec2(1.2, 12.0)));
                
                // Form 1: Tactical X (x)
                vec2 p1 = p * mat2(0.707, -0.707, 0.707, 0.707);
                float d1 = min(sdBox(p1, vec2(10.0, 1.5)), sdBox(p1, vec2(1.5, 10.0)));
                
                // Form 2: Bio-Diamond (v)
                float d2 = abs(length(p) - 8.0) - 1.0;
                d2 = max(d2, -sdBox(p, vec2(4.0))); // hollow
                
                // Form 3: Triple-Blade / Biohazard
                float d3 = 100.0;
                for(int i=0; i<3; i++) {
                    float ang = float(i) * 2.094; // 120 deg
                    vec2 tp = p * mat2(cos(ang), sin(ang), -sin(ang), cos(ang));
                    d3 = min(d3, sdCapsule(tp, vec2(4.0, 0.0), vec2(14.0, 0.0), 1.0));
                }
                
                // Form 4: Hex-Grid Focus
                float d4 = abs(max(abs(p.x)*0.866 + p.y*0.5, abs(p.y)) - 10.0) - 1.2;

                float res = 0.0;
                if (state == 0.0) res = mix(d0, d1, progress);
                else if (state == 1.0) res = mix(d1, d2, progress);
                else if (state == 2.0) res = mix(d2, d3, progress);
                else if (state == 3.0) res = mix(d3, d4, progress);
                else res = mix(d4, d0, progress);

                // Frantic micro-vibrations
                res += fbm(p * 0.5 + uTime * 10.0) * 1.5;
                return res;
            }

            float organicCrosshair(vec2 p) {
                float d = crosshairForms(p);
                float inner = sdCircle(p, 1.5 + sin(uTime * 12.0) * 0.8);
                return smin(d, inner, 3.0);
            }

            // --- Fluid Health Bar (Organic Sacs + Reconstruction) ---
            float fluidHealthBar(vec2 p) {
                float d = 100.0;
                float totalWidth = 200.0;
                float startX = -totalWidth * 0.5;
                
                // Cellular reconstruction noise
                float reconNoise = fbm(p * 0.2 + uTime * 3.0) * 3.0;
                
                for(int i = 0; i < 8; i++) {
                    float fi = float(i);
                    float pct = fi / 7.0;
                    vec2 pos = vec2(startX + pct * totalWidth, 0.0);
                    
                    // Wobble positions & aggressive knitting
                    pos.y += sin(uTime * 1.5 + fi) * 4.0;
                    pos.x += cos(uTime * 2.0 + fi * 1.5) * 2.0;
                    
                    float r = 8.0 + sin(uTime * 2.0 + fi * 2.0) * 2.0;
                    
                    if (uHealthPct >= pct - 0.1) {
                        float dist = sdCircle(p - pos, r);
                        d = smin(d, dist, 15.0); // Melt sacs together
                    }
                }
                
                // Apply reconstruction noise to the SDF edge
                d += reconNoise * smoothstep(5.0, 0.0, d);
                return d;
            }

            // --- Fluid Objective Bar (Energy Nodes + Reassembly) ---
            float fluidObjectiveBar(vec2 p) {
                float d = 100.0;
                float totalWidth = 150.0;
                float startX = -totalWidth * 0.5;
                
                // Digital/organic reconstruction artifacts
                float reconNoise = fbm(vec2(p.x * 0.3, p.y * 0.1) - uTime * 4.0) * 4.0;
                
                for(int i = 0; i < 5; i++) {
                    float fi = float(i);
                    float pct = fi / 4.0;
                    vec2 pos = vec2(startX + pct * totalWidth, 0.0);
                    
                    // Frantic reassembly motion
                    pos.y += cos(uTime * 3.0 + fi) * (3.0 + sin(uTime * 5.0 + fi) * 2.0);
                    pos.x += sin(uTime * 4.0 - fi) * 2.0;
                    
                    float r = 6.0 + fbm(vec2(uTime * 1.5, fi)) * 4.0;
                    
                    if (uObjPct >= pct - 0.1) {
                        float dist = sdCircle(p - pos, r);
                        d = smin(d, dist, 12.0);
                    }
                }
                
                d += reconNoise * smoothstep(6.0, 0.0, d);
                return d;
            }

            void main() {
                vec2 px = (vUv - 0.5) * uResolution;
                vec3 finalColor = vec3(0.0);
                float alpha = 0.0;

                // --- 1. Super Wild Dripping & Reconstruction Text Overlay ---
                vec2 textUv = vUv;
                
                // Reconstruction Glitch Wave (scans down)
                float scanline = fract(vUv.y * 10.0 - uTime * 0.5);
                float glitch = step(0.9, scanline) * step(0.95, hash12(vec2(uTime, vUv.y * 50.0)));
                textUv.x += glitch * 0.03 * sin(uTime * 20.0);
                
                // Super Wild Downward Drip
                // Use a sharper noise curve for distinct droplets melting down
                vec2 dripDomain = vUv * vec2(12.0, 2.0) - vec2(0.0, uTime * 1.5);
                float dripNoise = fbm(dripDomain);
                float dripMask = smoothstep(0.6, 0.8, dripNoise);
                // Make the drip pulsing and more extreme
                float dripAmount = dripMask * 0.04 * (sin(uTime * 2.0 + vUv.x * 30.0) * 0.5 + 0.5);
                textUv.y += dripAmount;

                // Occasional "reconstruction" tearing where text breaks into noise blocks
                float tear = step(0.98, hash12(vec2(floor(uTime * 8.0), floor(vUv.y * 40.0))));
                textUv.x += tear * (hash12(vec2(uTime, vUv.y)) - 0.5) * 0.05;

                vec4 textData = texture2D(uTextTex, textUv);
                
                // Chromatic aberration / bio-glow for text
                vec4 textR = texture2D(uTextTex, textUv + vec2(0.001, 0.0));
                vec4 textB = texture2D(uTextTex, textUv - vec2(0.001, 0.0));
                
                if (textData.a > 0.0 || textR.a > 0.0 || textB.a > 0.0) {
                    vec3 textColor = textData.rgb;
                    textColor.r += textR.a * 0.5;
                    textColor.b += textB.a * 0.5;
                    
                    // Give text a bio-luminescent tint depending on brightness
                    textColor = mix(textColor, vec3(0.2, 0.9, 0.6), 0.2);
                    
                    finalColor = textColor;
                    alpha = max(max(textData.a, textR.a * 0.5), textB.a * 0.5);
                }

                // --- 2. Morphing Crosshair ---
                float dCross = organicCrosshair(px);
                float crossGlow = 1.0 - smoothstep(0.0, 10.0, dCross);
                float crossCore = 1.0 - smoothstep(0.0, 1.5, dCross);
                
                if (crossGlow > 0.0) {
                    // Toxic green/cyan
                    vec3 crossColor = mix(vec3(0.0, 0.4, 0.3), vec3(0.2, 1.0, 0.8), crossCore);
                    finalColor = mix(finalColor, crossColor, crossGlow * 0.85);
                    alpha = max(alpha, crossGlow * 0.85);
                }

                // --- 3. Fluid Health Bar (Bottom Center) ---
                vec2 hbPos = vec2(px.x, px.y + uResolution.y * 0.45);
                float dHb = fluidHealthBar(hbPos);
                
                float hbGlow = 1.0 - smoothstep(0.0, 12.0, dHb);
                float hbCore = 1.0 - smoothstep(0.0, 2.0, dHb);

                if (hbGlow > 0.0) {
                    // Pulsing fleshy red/purple
                    vec3 fleshColor = mix(vec3(0.4, 0.0, 0.2), vec3(1.0, 0.1, 0.3), hbCore);
                    fleshColor += fbm(px * 0.05 + uTime) * vec3(0.3, 0.0, 0.1); // fleshy texture
                    
                    if (uHealthPct < 0.3) {
                        fleshColor = mix(fleshColor, vec3(1.0, 0.0, 0.0), sin(uTime * 15.0) * 0.5 + 0.5);
                    }
                    
                    finalColor = mix(finalColor, fleshColor, hbGlow * 0.9);
                    alpha = max(alpha, hbGlow * 0.9);
                }

                // --- 4. Fluid Objective Bar (Top Center) ---
                vec2 obPos = vec2(px.x, px.y - uResolution.y * 0.45 + 20.0);
                float dOb = fluidObjectiveBar(obPos);
                
                float obGlow = 1.0 - smoothstep(0.0, 10.0, dOb);
                float obCore = 1.0 - smoothstep(0.0, 2.0, dOb);

                if (obGlow > 0.0) {
                    // Bio-luminescent blue
                    vec3 objColor = mix(vec3(0.0, 0.3, 0.6), vec3(0.0, 0.8, 1.0), obCore);
                    objColor += fbm(px * 0.08 - uTime) * vec3(0.0, 0.2, 0.3);
                    finalColor = mix(finalColor, objColor, obGlow * 0.9);
                    alpha = max(alpha, obGlow * 0.9);
                }

                // --- 5. Hitmarker (Violent Organic Splatter & Reconstitution) ---
                if (uHitmarker > 0.0) {
                    float s = 0.7071;
                    mat2 rot = mat2(s, -s, s, s);
                    vec2 rp = rot * px;
                    
                    float hmArms = min(
                        sdCapsule(rp, vec2(-15.0, 0.0), vec2(15.0, 0.0), 1.5),
                        sdCapsule(rp, vec2(0.0, -15.0), vec2(0.0, 15.0), 1.5)
                    );
                    
                    // Violent splatter noise that morphs over time
                    float splatPhase = 1.0 - uHitmarker; // 0.0 to 1.0
                    float splatRadius = fbm(px * 0.15 - uTime * 5.0) * (10.0 * splatPhase + 2.0);
                    hmArms += splatRadius;
                    
                    // Add secondary droplets
                    float droplets = sdCircle(rp - vec2(sin(uTime * 10.0) * 10.0, cos(uTime * 12.0) * 10.0), 2.0 * uHitmarker);
                    hmArms = smin(hmArms, droplets, 5.0);

                    float hitAlpha = 1.0 - smoothstep(0.0, 3.0 + 5.0 * splatPhase, hmArms);
                    if (hitAlpha > 0.0) {
                        // Color shifts from bright yellow/white to deep bloody red
                        vec3 hitColor = mix(vec3(0.5, 0.0, 0.0), vec3(1.0, 1.0, 0.2), uHitmarker);
                        finalColor = mix(finalColor, hitColor, hitAlpha);
                        alpha = max(alpha, hitAlpha * uHitmarker);
                    }
                }

                gl_FragColor = vec4(finalColor, alpha);
            }
        `;

        this.material = new THREE.ShaderMaterial({
            vertexShader: vert,
            fragmentShader: frag,
            uniforms: {
                uTextTex: { value: this.textTexture },
                uResolution: { value: new THREE.Vector2(this.width, this.height) },
                uHealthPct: { value: 1.0 },
                uHitmarker: { value: 0.0 },
                uTime: { value: 0.0 },
                uObjPct: { value: 0.0 }
            },
            transparent: true,
            depthTest: false,
            depthWrite: false
        });
    }

    updateText() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.width, this.height);

        // Fonts
        const fMain = 'bold 16px "Inter", "Courier New", monospace';
        const fSmall = 'bold 12px "Inter", "Courier New", monospace';
        const fLarge = 'bold 36px "Inter", "Courier New", monospace';

        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';

        // Top Left Stats
        ctx.font = fSmall;
        ctx.fillStyle = '#ff6b6b';
        ctx.fillText(`KILLS: ${this.state.kills}`, 20, 20);

        ctx.fillStyle = '#a8a8a8';
        ctx.fillText(`ZOMBIES: ${this.state.zombies}`, 20, 40);

        ctx.fillStyle = '#4ade80';
        ctx.fillText(`NODES: ${this.state.nodesActive}`, 20, 60);

        // Top Center Objective
        ctx.textAlign = 'center';
        ctx.fillStyle = '#22d3ee';
        ctx.font = fMain;
        ctx.fillText(`OBJ: ${this.state.objectiveName}`, this.width / 2, 20);
        ctx.font = fSmall;
        ctx.fillText(this.state.objectiveCount, this.width / 2, 45);

        // Bottom Right Ammo & Weapon
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        ctx.fillStyle = '#cbd5e1';
        ctx.font = fSmall;
        ctx.fillText(this.state.weaponName.toUpperCase(), this.width - 20, this.height - 60);

        ctx.fillStyle = '#38bdf8';
        ctx.font = fLarge;
        ctx.fillText(this.state.ammo, this.width - 20, this.height - 20);

        // Bottom Left Health Text
        ctx.textAlign = 'left';
        ctx.fillStyle = this.state.health < 30 ? '#ef4444' : '#4ade80';
        ctx.font = fMain;
        ctx.fillText(`HP: ${Math.round(this.state.health)}`, 20, this.height - 30);

        this.textTexture.needsUpdate = true;
    }

    update(newState) {
        let changed = false;
        for (const key in newState) {
            if (this.state[key] !== newState[key]) {
                this.state[key] = newState[key];
                changed = true;
            }
        }

        if (changed) {
            this.updateText();
            this.material.uniforms.uHealthPct.value = Math.max(0, this.state.health / this.state.maxHealth);
            this.material.uniforms.uObjPct.value = this.state.objectiveProgress;
        }

        if (newState.hitmarker !== undefined) {
            this.material.uniforms.uHitmarker.value = newState.hitmarker; // 1.0 to trigger
        }
    }

    render(renderer, delta, time) {
        if (this.material.uniforms.uHitmarker.value > 0) {
            this.material.uniforms.uHitmarker.value = Math.max(0, this.material.uniforms.uHitmarker.value - delta * 2.0); // Fade out in 0.5s
        }
        this.material.uniforms.uTime.value = time;

        const autoClear = renderer.autoClear;
        renderer.autoClear = false;
        renderer.clearDepth();
        renderer.render(this.scene, this.camera);
        renderer.autoClear = autoClear;
    }

    resize(w, h) {
        this.width = w;
        this.height = h;

        this.camera.left = -w / 2;
        this.camera.right = w / 2;
        this.camera.top = h / 2;
        this.camera.bottom = -h / 2;
        this.camera.updateProjectionMatrix();

        this.canvas.width = w;
        this.canvas.height = h;

        this.mesh.geometry.dispose();
        this.mesh.geometry = new THREE.PlaneGeometry(w, h);

        this.material.uniforms.uResolution.value.set(w, h);
        this.updateText();
    }
}

window.SDFGUI = SDFGUI;
