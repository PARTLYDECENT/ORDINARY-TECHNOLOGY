/**
 * OTSF HOLOGRAPHIC ROLLING BANNER
 * Triple-layered holographic strip with DNA helix animation, prismatic refraction,
 * scanline interference, and scrolling OTSF corporate branding.
 * Renders as a screen-space WebGL overlay using the same pipeline as SDFGUI.
 */

class HoloBanner {
    constructor(width, height) {
        this.width = width;
        this.height = height;

        // Banner geometry dimensions (screen-space)
        this.bannerHeight = 38; // px tall
        this.bannerY = 0.92;   // normalized Y position (near bottom)

        // Ortho overlay camera
        this.camera = new THREE.OrthographicCamera(
            -width / 2, width / 2,
            height / 2, -height / 2,
            0.1, 10
        );
        this.camera.position.z = 1;
        this.scene = new THREE.Scene();

        // --- Canvas for OTSF text ---
        this.textCanvas = document.createElement('canvas');
        this.textCanvas.width = 2048;
        this.textCanvas.height = 64;
        this.textCtx = this.textCanvas.getContext('2d');

        this.textTexture = new THREE.CanvasTexture(this.textCanvas);
        this.textTexture.wrapS = THREE.RepeatWrapping;
        this.textTexture.wrapT = THREE.ClampToEdgeWrapping;
        this.textTexture.minFilter = THREE.LinearFilter;
        this.textTexture.magFilter = THREE.LinearFilter;

        this._renderBrandingText();
        this._buildShader();

        // Full-screen quad (shader handles masking to banner strip)
        const geo = new THREE.PlaneGeometry(width, height);
        this.mesh = new THREE.Mesh(geo, this.material);
        this.scene.add(this.mesh);
    }

    _renderBrandingText() {
        const ctx = this.textCtx;
        const w = this.textCanvas.width;
        const h = this.textCanvas.height;

        ctx.clearRect(0, 0, w, h);

        // The scrolling message (Resident Evil / Biohazard style)
        const msg = [
            '◆ CAUTION: BIOLOGICAL HAZARD DETECTED ◆',
            '◆ CONTAINMENT BREACH IN SECTOR 7 ◆',
            '◆ SUBJECT: ORGANOID-ALPHA // MUTATION RATE: 42% ◆',
            '◆ UMBRELLA RESEARCH DIVISION — CLASSIFIED ◆',
            '◆ WARNING: NEURAL DEGRADATION IMMINENT ◆',
            '◆ PROTOCOL: STERILIZATION ACTIVE ◆',
            '◆ ANALYSIS: T-VIRUS VARIANT DETECTED ◆',
            '◆ PROPERTY OF OTSF BIO-WEAPONS DIVISION ◆',
        ].join('   ');

        // Render text repeating across the wide canvas
        ctx.font = 'bold 28px "Courier New", monospace';
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'left';

        // Measure full message
        const measured = ctx.measureText(msg);
        const msgW = measured.width;

        // Fill canvas with repeated text
        ctx.fillStyle = '#ffffff';
        let x = 0;
        while (x < w + msgW) {
            ctx.fillText(msg, x, h / 2);
            x += msgW + 60;
        }

        this.textTexture.needsUpdate = true;
        this._textRepeatWidth = msgW + 60; // For scroll speed calc
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
            uniform sampler2D uTextTex;
            uniform float uBannerY;     
            uniform float uBannerH;     
            uniform float uScrollSpeed; 

            varying vec2 vUv;

            float hash12(vec2 p) {
                vec3 p3 = fract(vec3(p.xyx) * .1031);
                p3 += dot(p3, p3.yzx + 33.33);
                return fract((p3.x + p3.y) * p3.z);
            }

            float noise(vec2 p) {
                vec2 i = floor(p);
                vec2 f = fract(p);
                vec2 u = f * f * (3.0 - 2.0 * f);
                return mix(
                    mix(hash12(i), hash12(i + vec2(1.0, 0.0)), u.x),
                    mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), u.x),
                    u.y
                );
            }

            float fbm(vec2 x) {
                float v = 0.0; float a = 0.5;
                mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
                for (int i = 0; i < 5; ++i) {
                    v += a * noise(x);
                    x = rot * x * 2.0 + vec2(100.0);
                    a *= 0.5;
                }
                return v;
            }

            // --- DNA FLOW 1: Stable Double Helix ---
            vec2 dnaFlowStable(vec2 p, float t) {
                float d = 1000.0;
                float bestDepth = 0.5;
                float PI = 3.14159265;
                float radius = 22.0; // Increased for wrap
                float twist = 0.04;
                float rot = t * 2.5;

                for (int i = 0; i < 2; i++) {
                    float phase = float(i) * PI;
                    float angle = p.x * twist + rot + phase;
                    float y = cos(angle) * radius;
                    float z = sin(angle);
                    float dist = abs(p.y - y) - (2.5 + z * 1.0);
                    if (dist < d) { d = dist; bestDepth = z * 0.5 + 0.5; }
                }

                // Rungs
                float rungSpacing = 36.0;
                float rx = mod(p.x + t * 40.0, rungSpacing) - rungSpacing * 0.5;
                if (abs(rx) < 1.8) {
                    float a0 = p.x * twist + rot;
                    float y0 = cos(a0) * radius;
                    float y1 = cos(a0 + PI) * radius;
                    if (p.y > min(y0, y1) && p.y < max(y0, y1)) {
                        float rd = abs(rx) - 1.0;
                        if (rd < d) { d = rd; bestDepth = 0.5; }
                    }
                }
                return vec2(d, bestDepth);
            }

            // --- DNA FLOW 2: Mutated Multi-Strand Vortex ---
            vec2 dnaFlowMutant(vec2 p, float t) {
                float d = 1000.0;
                float bestDepth = 0.5;
                float PI = 3.14159265;
                
                for (int i = 0; i < 4; i++) {
                    float phase = float(i) * (PI * 0.5);
                    float twist = 0.07 + sin(t * 0.4) * 0.02;
                    float radius = 24.0 + sin(p.x * 0.02 + t) * 6.0; // Increased
                    float angle = p.x * twist + t * 4.5 + phase;
                    
                    float y = cos(angle) * radius;
                    float z = sin(angle);
                    y += noise(vec2(p.x * 0.1, t)) * 8.0;
                    
                    float dist = abs(p.y - y) - (2.0 + z * 0.8);
                    if (dist < d) { d = dist; bestDepth = z * 0.5 + 0.5; }
                }
                return vec2(d, bestDepth);
            }

            // --- DNA FLOW 3: Decaying / Dissolving Strands ---
            vec2 dnaFlowDecay(vec2 p, float t) {
                float d = 1000.0;
                float bestDepth = 0.5;
                float PI = 3.14159265;
                
                float twist = 0.035;
                float rot = t * 1.8;
                float radius = 20.0; // Increased

                for (int i = 0; i < 2; i++) {
                    float phase = float(i) * PI;
                    float angle = p.x * twist + rot + phase;
                    float y = cos(angle) * radius;
                    float z = sin(angle);
                    
                    float dissolve = noise(vec2(p.x * 0.04, t * 2.2));
                    if (dissolve > 0.55) {
                        float dist = length(vec2(p.x, p.y - y)) - (2.5 + z * 1.5);
                        float chunk = sin(p.x * 0.15 + t * 6.0);
                        if (chunk > 0.0) {
                            if (dist < d) { d = dist; bestDepth = z * 0.5 + 0.5; }
                        }
                    } else {
                        float dist = abs(p.y - y) - (2.5 + z * 0.8);
                        if (dist < d) { d = dist; bestDepth = z * 0.5 + 0.5; }
                    }
                }
                return vec2(d, bestDepth);
            }

            void main() {
                vec2 px = (vUv - 0.5) * uResolution;
                float t = uTime;

                // --- Banner mask ---
                float bannerCenterY = (uBannerY - 0.5) * uResolution.y;
                float halfH = uBannerH * 0.5;
                float distFromBanner = abs(px.y - bannerCenterY) - halfH;

                float bannerMask = 1.0 - smoothstep(-2.0, 2.0, distFromBanner);
                if (bannerMask < 0.001) { discard; }

                float localY = (px.y - bannerCenterY + halfH) / (halfH * 2.0);
                float localX = vUv.x;

                // --- DNA Coordinates (Wrapping around banner height) ---
                // We increase the radius so it goes "outside" the banner strip visually
                vec2 dnaP = vec2(px.x, (localY - 0.5) * uBannerH * 2.2); 

                // --- DNA Transitions ---
                float cycle = mod(t * 0.1, 3.0);
                vec2 dna;
                if (cycle < 1.0) {
                    dna = mix(dnaFlowStable(dnaP, t), dnaFlowMutant(dnaP, t), smoothstep(0.8, 1.0, cycle));
                } else if (cycle < 2.0) {
                    dna = mix(dnaFlowMutant(dnaP, t), dnaFlowDecay(dnaP, t), smoothstep(1.8, 2.0, cycle));
                } else {
                    dna = mix(dnaFlowDecay(dnaP, t), dnaFlowStable(dnaP, t), smoothstep(2.8, 3.0, cycle));
                }

                float dDna = dna.x;
                float depth = dna.y; // 0 (back) to 1 (front)

                // ==============================
                // LAYERED RENDERING (3D WRAP)
                // ==============================
                
                // 1. Base substrate (The Black Strip)
                vec3 finalColor = vec3(0.002, 0.0, 0.0);
                float alpha = bannerMask * 0.95;
                
                // Subtle scanlines
                finalColor += sin(localY * 120.0 + t * 5.0) * 0.015;

                // 2. DNA BACK STRANDS (Depth < 0.5)
                float backGlow = (1.0 - smoothstep(0.0, 12.0, dDna)) * step(depth, 0.5);
                if (backGlow > 0.0) {
                    vec3 backCol = mix(vec3(0.3, 0.0, 0.0), vec3(0.8, 0.2, 0.1), depth * 2.0);
                    // Dimmer and more blurred for back
                    finalColor = mix(finalColor, backCol, backGlow * 0.4);
                }

                // 3. TEXT LAYER (In the middle of the "wrap")
                vec2 textUv = vec2(fract(localX + t * uScrollSpeed), localY);
                vec4 textSample = texture2D(uTextTex, textUv);
                if (textSample.a > 0.05) {
                    vec3 txtCol = mix(vec3(0.7, 0.0, 0.0), vec3(1.0, 0.95, 0.95), textSample.a);
                    // Add glitch
                    if (hash12(vec2(t, floor(localY * 15.0))) > 0.98) {
                        txtCol = vec3(1.0, 1.0, 1.0);
                        textUv.x += 0.01;
                    }
                    finalColor = mix(finalColor, txtCol, textSample.a * 0.9);
                    alpha = max(alpha, bannerMask * textSample.a);
                }

                // 4. DNA FRONT STRANDS (Depth >= 0.5)
                float frontGlow = (1.0 - smoothstep(0.0, 8.0, dDna)) * step(0.5, depth);
                float frontCore = (1.0 - smoothstep(0.0, 1.8, dDna)) * step(0.5, depth);
                if (frontGlow > 0.0) {
                    vec3 frontCol = mix(vec3(0.8, 0.1, 0.0), vec3(1.0, 0.4, 0.2), (depth - 0.5) * 2.0);
                    frontCol = mix(frontCol, vec3(1.0, 1.0, 0.9), frontCore);
                    
                    // Brighter and sharper for front
                    finalColor = mix(finalColor, frontCol, frontGlow * 0.9);
                    alpha = max(alpha, bannerMask * frontGlow);
                }

                // 5. EDGE POLISH
                float edge = smoothstep(halfH - 1.0, halfH, abs(px.y - bannerCenterY));
                finalColor = mix(finalColor, vec3(1.0, 0.0, 0.0), edge * 0.5 * bannerMask);

                gl_FragColor = vec4(finalColor, alpha);
            }
        `;

        this.material = new THREE.ShaderMaterial({
            vertexShader: vert,
            fragmentShader: frag,
            uniforms: {
                uResolution: { value: new THREE.Vector2(this.width, this.height) },
                uTime: { value: 0.0 },
                uTextTex: { value: this.textTexture },
                uBannerY: { value: this.bannerY },
                uBannerH: { value: this.bannerHeight },
                uScrollSpeed: { value: 0.04 } // text scroll rate
            },
            transparent: true,
            depthTest: false,
            depthWrite: false
        });
    }

    render(renderer, delta, time) {
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

        this.mesh.geometry.dispose();
        this.mesh.geometry = new THREE.PlaneGeometry(w, h);
        this.material.uniforms.uResolution.value.set(w, h);
    }
}

window.HoloBanner = HoloBanner;
