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

        // The scrolling message
        const msg = [
            'OTSF ORDINARY TECHNOLOGY SPACE FORCE',
            '◆',
            'CHASSIS #1997 — COMBAT DEPLOYMENT ACTIVE',
            '◆',
            'PROPERTY OF OTSF ARMAMENTS DIVISION',
            '◆',
            'NEURAL UPLINK SYNCHRONIZED',
            '◆',
            'HOSTILE CONTAINMENT PROTOCOL ENGAGED',
            '◆',
            'OTSF — BEYOND THE FRONTIER',
            '◆',
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
            uniform float uBannerY;     // normalized Y center
            uniform float uBannerH;     // banner height in px
            uniform float uScrollSpeed; // text scroll

            varying vec2 vUv;

            // --- Noise ---
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

            // --- 3D Rotating DNA Double Helix ---
            // Returns vec2: x = SDF distance, y = depth (0=front, 1=back) for shading
            vec2 dnaHelix3D(vec2 p, float t) {
                float d = 1000.0;
                float bestDepth = 0.5;

                float PI = 3.14159265;
                float helixRadius = 10.0;
                float twistFreq = 0.06;    // How tight the twist is
                float rotSpeed = 2.5;      // Rotation speed around the axis
                float scrollSpeed = 80.0;  // Horizontal scroll of the helix

                // Two backbone strands with 3D projection
                for (int strand = 0; strand < 2; strand++) {
                    float strandPhase = float(strand) * PI;

                    // For each column of pixels, compute the 3D strand position
                    float angle = (p.x + t * scrollSpeed) * twistFreq + t * rotSpeed + strandPhase;

                    // 3D cylinder coordinates projected to 2D
                    float strandY = cos(angle) * helixRadius;  // Y on screen
                    float strandZ = sin(angle);                // Z depth (-1 to 1)

                    // Strand thickness varies with depth (closer = thicker)
                    float thickness = 1.8 + strandZ * 0.6;
                    float dist = abs(p.y - strandY) - thickness;

                    if (dist < d) {
                        d = dist;
                        bestDepth = strandZ * 0.5 + 0.5; // normalize to 0-1
                    }
                }

                // Rungs (base pairs) connecting the two strands
                float rungSpacing = 30.0;
                float rungX = mod(p.x + t * scrollSpeed, rungSpacing) - rungSpacing * 0.5;

                if (abs(rungX) < 1.2) {
                    // Get both strand Y positions at this x
                    float angle0 = (p.x + t * scrollSpeed) * twistFreq + t * rotSpeed;
                    float y0 = cos(angle0) * helixRadius;
                    float z0 = sin(angle0);
                    float y1 = cos(angle0 + PI) * helixRadius;
                    float z1 = sin(angle0 + PI);

                    float minRY = min(y0, y1);
                    float maxRY = max(y0, y1);

                    if (p.y > minRY && p.y < maxRY) {
                        float rungDist = abs(rungX) - 0.6;
                        // Depth of rung = average of two strands
                        float rungDepth = (z0 + z1) * 0.25 + 0.5;
                        if (rungDist < d) {
                            d = rungDist;
                            bestDepth = rungDepth;
                        }
                    }

                    // Nucleotide blobs at connection points
                    float blobDist0 = length(vec2(rungX, p.y - y0)) - 2.5;
                    float blobDist1 = length(vec2(rungX, p.y - y1)) - 2.5;
                    if (blobDist0 < d) { d = blobDist0; bestDepth = z0 * 0.5 + 0.5; }
                    if (blobDist1 < d) { d = blobDist1; bestDepth = z1 * 0.5 + 0.5; }
                }

                return vec2(d, bestDepth);
            }

            // --- Holographic Prismatic Color ---
            vec3 prismatic(float t, float offset) {
                return vec3(
                    sin(t * 2.0 + offset) * 0.5 + 0.5,
                    sin(t * 2.0 + offset + 2.094) * 0.5 + 0.5,
                    sin(t * 2.0 + offset + 4.189) * 0.5 + 0.5
                );
            }

            void main() {
                vec2 px = (vUv - 0.5) * uResolution;
                float t = uTime;

                // --- Banner mask ---
                float bannerCenterY = (uBannerY - 0.5) * uResolution.y;
                float halfH = uBannerH * 0.5;
                float distFromBanner = abs(px.y - bannerCenterY) - halfH;

                // Soft edge
                float bannerMask = 1.0 - smoothstep(-2.0, 3.0, distFromBanner);
                if (bannerMask < 0.001) {
                    gl_FragColor = vec4(0.0);
                    return;
                }

                // Local banner UV (0-1 within the banner strip)
                float localY = (px.y - bannerCenterY + halfH) / (halfH * 2.0);
                float localX = vUv.x;

                vec3 finalColor = vec3(0.0);
                float alpha = 0.0;

                // ==============================
                // LAYER 1: Base Holographic Panel
                // ==============================
                {
                    // Deep dark substrate with subtle blue tint
                    vec3 base = vec3(0.0, 0.02, 0.06);

                    // Moving interference pattern
                    float interference = sin(px.x * 0.1 + t * 4.0) * sin(px.y * 0.3 + t * 2.0);
                    interference *= 0.15;
                    base += vec3(0.0, 0.05, 0.1) * (interference + 0.15);

                    // Holographic noise texture
                    float n = fbm(vec2(px.x * 0.01 + t * 0.5, localY * 5.0 + t * 0.3));
                    base += vec3(0.0, 0.03, 0.08) * n;

                    // Faint horizontal scanlines
                    float scan = sin(localY * uBannerH * 3.14159 * 2.0 + t * 15.0) * 0.5 + 0.5;
                    base += vec3(0.0, 0.01, 0.03) * scan * 0.3;

                    finalColor = base;
                    alpha = bannerMask * 0.85;
                }

                // ==============================
                // LAYER 2: Prismatic Hologram Mid
                // ==============================
                {
                    // Prismatic rainbow shimmer that shifts with angle/time
                    float prismAngle = localX * 20.0 + localY * 5.0 + t * 1.5;
                    vec3 prism = prismatic(prismAngle, px.x * 0.005);
                    prism *= 0.12;

                    // Fresnel-like edge brightening
                    float edgeBright = pow(1.0 - abs(localY - 0.5) * 2.0, 0.5);
                    prism *= edgeBright;

                    // Moving light streak (like hologram card tilt)
                    float streak = exp(-pow((localX - fract(t * 0.15)) * 8.0, 2.0));
                    prism += prismatic(t * 3.0 + px.x * 0.01, 0.0) * streak * 0.3;

                    finalColor += prism;
                }

                // ==============================
                // LAYER 3: 3D Rotating DNA Helix
                // ==============================
                {
                    vec2 dnaP = vec2(px.x, (localY - 0.5) * uBannerH);
                    vec2 dnaResult = dnaHelix3D(dnaP, t);
                    float dDna = dnaResult.x;
                    float depth = dnaResult.y; // 0=back, 1=front

                    float dnaGlow = 1.0 - smoothstep(0.0, 6.0, dDna);
                    float dnaCore = 1.0 - smoothstep(0.0, 1.0, dDna);

                    if (dnaGlow > 0.0) {
                        // Depth-based shading: front strands are bright, back are dim
                        float depthShade = 0.3 + 0.7 * depth;

                        // Orange palette: dark amber -> hot orange -> bright yellow core
                        vec3 dnaBase = mix(
                            vec3(0.4, 0.15, 0.0),   // Dark amber (back)
                            vec3(1.0, 0.5, 0.0),    // Bright orange (front)
                            depth
                        );
                        vec3 dnaHot = mix(
                            dnaBase,
                            vec3(1.0, 0.9, 0.3),    // Yellow-white hot core
                            dnaCore
                        );
                        dnaHot *= depthShade;

                        // Warm prismatic refraction (orange/gold spectrum)
                        float prismShift = sin(t * 3.0 + dnaP.x * 0.02) * 0.5 + 0.5;
                        dnaHot += vec3(0.2, 0.08, 0.0) * prismShift * dnaGlow;

                        // Ember particle glow on front-facing strands
                        if (depth > 0.6) {
                            float ember = fbm(dnaP * 0.1 + t * 5.0);
                            dnaHot += vec3(0.3, 0.1, 0.0) * ember * dnaCore;
                        }

                        finalColor = mix(finalColor, dnaHot, dnaGlow * 0.7);
                        alpha = max(alpha, bannerMask * (0.85 + dnaGlow * 0.15));
                    }
                }

                // ==============================
                // SCROLLING OTSF TEXT
                // ==============================
                {
                    // Scroll UV
                    vec2 textUv = vec2(
                        fract(localX + t * uScrollSpeed),
                        localY
                    );

                    vec4 textSample = texture2D(uTextTex, textUv);

                    if (textSample.a > 0.0) {
                        // Holographic text coloring — cyan core with white hot center
                        vec3 textColor = mix(
                            vec3(0.0, 0.6, 0.8),
                            vec3(0.9, 1.0, 1.0),
                            textSample.a * 0.8
                        );

                        // Chromatic split on text
                        float rShift = texture2D(uTextTex, textUv + vec2(0.002, 0.0)).a;
                        float bShift = texture2D(uTextTex, textUv - vec2(0.002, 0.0)).a;
                        textColor.r += rShift * 0.15;
                        textColor.b += bShift * 0.15;

                        // Glitch flicker
                        float glitch = step(0.97, hash12(vec2(floor(t * 12.0), floor(textUv.y * 20.0))));
                        textColor += glitch * vec3(0.5, 0.0, 0.3);

                        finalColor = mix(finalColor, textColor, textSample.a * 0.9);
                        alpha = max(alpha, bannerMask * textSample.a * 0.95);
                    }
                }

                // ==============================
                // EDGE GLOW + BORDER LINES
                // ==============================
                {
                    // Top and bottom bright border lines
                    float topLine = 1.0 - smoothstep(0.0, 2.0, abs(distFromBanner + halfH * 2.0 - 1.0));
                    float botLine = 1.0 - smoothstep(0.0, 2.0, abs(distFromBanner + 1.0));

                    // Use the actual banner edge
                    float edgeTop = 1.0 - smoothstep(-1.5, 0.5, distFromBanner + 0.5);
                    float edgeBot = 1.0 - smoothstep(-1.5, 0.5, -distFromBanner - halfH * 2.0 + 0.5);

                    // Combine as bright cyan lines at banner edges
                    float borderIntensity = smoothstep(halfH - 2.0, halfH, abs(px.y - bannerCenterY));
                    borderIntensity *= bannerMask;

                    if (borderIntensity > 0.0) {
                        vec3 borderColor = vec3(0.0, 0.8, 1.0);
                        // Pulsing
                        borderColor *= 0.6 + 0.4 * sin(t * 4.0 + px.x * 0.05);
                        finalColor = mix(finalColor, borderColor, borderIntensity * 0.8);
                        alpha = max(alpha, borderIntensity * 0.9);
                    }
                }

                // ==============================
                // FINAL COMPOSITING
                // ==============================

                // Subtle overall scanline grain
                float globalScan = sin(vUv.y * uResolution.y * 2.0 + t * 20.0) * 0.5 + 0.5;
                finalColor *= 0.95 + globalScan * 0.05;

                // Holographic flicker (rare full-strip flash)
                float flicker = step(0.995, hash12(vec2(floor(t * 20.0), 42.0)));
                finalColor += flicker * vec3(0.1, 0.2, 0.3);

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
