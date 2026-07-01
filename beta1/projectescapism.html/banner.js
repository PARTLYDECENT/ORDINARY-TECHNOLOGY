/**
 * CYBERNETIC DATA-STREAM BANNER
 * Sleek holographic strip with cyan wireframe DNA helix, hex-grid backdrop,
 * data corruption glitch effects, and scrolling cybernetic branding.
 */

class HoloBanner {
    constructor(width, height) {
        this.width = width;
        this.height = height;

        this.bannerHeight = 38;
        this.bannerY = 0.92;

        this.camera = new THREE.OrthographicCamera(
            -width / 2, width / 2,
            height / 2, -height / 2,
            0.1, 10
        );
        this.camera.position.z = 1;
        this.scene = new THREE.Scene();

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

        const geo = new THREE.PlaneGeometry(width, height);
        this.mesh = new THREE.Mesh(geo, this.material);
        this.scene.add(this.mesh);
    }

    _renderBrandingText() {
        const ctx = this.textCtx;
        const w = this.textCanvas.width;
        const h = this.textCanvas.height;

        ctx.clearRect(0, 0, w, h);

        const msg = [
            '◈ NEURAL_LINK: ACTIVE ◈',
            '◈ CHASSIS_INTEGRITY: MONITORING ◈',
            '◈ THREAT_LEVEL: CRITICAL ◈',
            '◈ BIO-HAZARD CONTAINMENT: BREACHED ◈',
            '◈ SECTOR_7: COMPROMISED ◈',
            '◈ ORGANOID_ALPHA // MUTATION: 42% ◈',
            '◈ STERILIZATION_PROTOCOL: STANDBY ◈',
            '◈ OTSF_DIVISION: CLASSIFIED ◈',
        ].join('   ');

        ctx.font = 'bold 24px "Courier New", monospace';
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'left';

        const measured = ctx.measureText(msg);
        const msgW = measured.width;

        ctx.fillStyle = '#ffffff';
        let x = 0;
        while (x < w + msgW) {
            ctx.fillText(msg, x, h / 2);
            x += msgW + 60;
        }

        this.textTexture.needsUpdate = true;
        this._textRepeatWidth = msgW + 60;
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
                vec2 i = floor(p); vec2 f = fract(p);
                vec2 u = f*f*(3.0-2.0*f);
                return mix(mix(hash12(i),hash12(i+vec2(1,0)),u.x),
                           mix(hash12(i+vec2(0,1)),hash12(i+vec2(1,1)),u.x),u.y);
            }

            // Hex grid pattern
            float hexGrid(vec2 p, float scale) {
                p *= scale;
                vec2 h = vec2(1.0, 1.732);
                vec2 a = mod(p, h) - h * 0.5;
                vec2 b = mod(p - h * 0.5, h) - h * 0.5;
                float da = length(a);
                float db = length(b);
                return min(da, db);
            }

            // DNA double helix (simplified wireframe)
            float sdDNAWire(vec3 p, float twist, float phase, float radius) {
                float angle = p.x * twist + phase;
                vec2 pRot = mat2(cos(angle),sin(angle),-sin(angle),cos(angle)) * p.yz;
                return length(pRot - vec2(radius, 0.0)) - 0.8;
            }
            float sdDNARungs(vec3 p, float twist, float radius, float spacing) {
                float rx = mod(p.x, spacing) - spacing * 0.5;
                float xRung = p.x - rx;
                float angle = xRung * twist;
                vec3 dir = vec3(0.0, cos(angle), sin(angle));
                vec3 c = vec3(xRung, 0.0, 0.0);
                float t = clamp(dot(p - c, dir), -radius, radius);
                vec3 closest = c + t * dir;
                return length(p - closest) - 0.4;
            }

            float mapDNA(vec3 p, float t) {
                float twist = 0.04;
                float radius = 12.0;
                vec3 sp = p + vec3(t * 35.0, 0.0, 0.0);

                float s1 = sdDNAWire(sp, twist, t * 1.5, radius);
                float s2 = sdDNAWire(sp, twist, t * 1.5 + 3.14159, radius);
                float rungs = sdDNARungs(sp, twist, radius, 24.0);
                return min(min(s1, s2), rungs);
            }

            vec3 calcNormal(vec3 p, float t) {
                vec2 eps = vec2(0.15, 0.0);
                return normalize(vec3(
                    mapDNA(p+eps.xyy,t)-mapDNA(p-eps.xyy,t),
                    mapDNA(p+eps.yxy,t)-mapDNA(p-eps.yxy,t),
                    mapDNA(p+eps.yyx,t)-mapDNA(p-eps.yyx,t)
                ));
            }

            void main() {
                vec2 px = (vUv - 0.5) * uResolution;
                float t = uTime;

                // Banner mask
                float bannerCenterY = (uBannerY - 0.5) * uResolution.y;
                float halfH = uBannerH * 0.5;
                float distFromBanner = abs(px.y - bannerCenterY) - halfH;
                float bannerMask = 1.0 - smoothstep(-2.0, 1.0, distFromBanner);
                if (bannerMask < 0.001) { discard; }

                float localY = (px.y - bannerCenterY + halfH) / (halfH * 2.0);
                float localX = vUv.x;

                // === Background: dark with hex grid ===
                float hex = hexGrid(px * 0.3 + vec2(t * 5.0, 0.0), 0.15);
                float hexPattern = smoothstep(0.35, 0.32, hex);
                vec3 bgCol = vec3(0.005, 0.015, 0.025);
                bgCol += vec3(0.0, 0.04, 0.06) * hexPattern;

                // Horizontal scan lines
                float scanline = step(0.95, fract(px.y * 0.3 + t * 0.5));
                bgCol += vec3(0.0, 0.08, 0.1) * scanline * 0.3;

                vec3 finalColor = bgCol;
                float alpha = bannerMask * 0.88;

                // === DNA Raymarching (cyan wireframe) ===
                vec3 ro = vec3(px.x, px.y - bannerCenterY, -25.0);
                vec3 rd = vec3(0.0, 0.0, 1.0);
                float td = 0.0;
                float minDist = 100.0;
                int hit = 0;
                vec3 p;

                for(int i = 0; i < 24; i++) {
                    p = ro + rd * td;
                    float d = mapDNA(p, t);
                    minDist = min(minDist, d);
                    if (d < 0.1) { hit = 1; break; }
                    td += d * 0.85;
                    if (td > 50.0) break;
                }

                if (hit == 1) {
                    vec3 N = calcNormal(p, t);
                    vec3 L = normalize(vec3(0.5, 0.8, -1.0));
                    vec3 V = vec3(0.0, 0.0, -1.0);
                    vec3 H = normalize(L + V);

                    float diff = max(0.0, dot(N, L));
                    float spec = pow(max(0.0, dot(N, H)), 32.0);
                    float rim = pow(1.0 - max(0.0, dot(N, V)), 3.0);

                    // Cyan-white holographic coloring
                    vec3 dnaCol = mix(vec3(0.0, 0.3, 0.5), vec3(0.0, 0.9, 1.0), diff);
                    dnaCol += vec3(0.8, 0.95, 1.0) * spec * 0.6;
                    dnaCol += vec3(0.0, 0.6, 0.8) * rim * 0.4;

                    // Wireframe edge highlight
                    float wireEdge = 1.0 - smoothstep(0.0, 0.5, abs(mapDNA(p, t)));
                    dnaCol += vec3(0.0, 1.0, 1.0) * wireEdge * 0.3;

                    float dnaAlpha = td < 25.0 ? 0.85 : 0.4;
                    finalColor = mix(finalColor, dnaCol, dnaAlpha);
                    alpha = max(alpha, bannerMask * dnaAlpha);
                } else if (minDist < 12.0) {
                    // Proximity glow
                    float glow = 1.0 - smoothstep(0.0, 12.0, minDist);
                    finalColor += vec3(0.0, 0.15, 0.25) * glow * 0.4;
                }

                // === Scrolling text ===
                vec2 textUv = vec2(fract(localX + t * uScrollSpeed), localY);
                float abAmt = 0.006;
                vec4 rCol = texture2D(uTextTex, vec2(fract(textUv.x + abAmt), textUv.y));
                vec4 gCol = texture2D(uTextTex, textUv);
                vec4 bCol = texture2D(uTextTex, vec2(fract(textUv.x - abAmt), textUv.y));

                float textAlpha = max(max(rCol.a, gCol.a), bCol.a);
                if (textAlpha > 0.05) {
                    vec3 txtCol = vec3(rCol.a * 0.7, gCol.a, bCol.a * 0.9);
                    txtCol = mix(txtCol * vec3(0.0, 0.8, 1.0), vec3(0.85, 0.95, 1.0), textAlpha * 0.6);

                    // Occasional white flash glitch
                    if (hash12(vec2(t * 2.0, floor(localY * 20.0))) > 0.98) {
                        txtCol = vec3(1.0);
                    }

                    finalColor = mix(finalColor, txtCol, textAlpha * 0.75);
                    alpha = max(alpha, bannerMask * textAlpha * 0.85);
                }

                // === Data corruption glitch ===
                float glitchLine = step(0.97, hash12(vec2(floor(t * 3.0), floor(px.y * 0.5))));
                if (glitchLine > 0.0) {
                    float shift = (hash12(vec2(t, px.y)) - 0.5) * 30.0;
                    vec3 glitchCol = vec3(0.0, 1.0, 1.0) * hash12(vec2(px.x + shift, t));
                    finalColor = mix(finalColor, glitchCol, 0.4);
                }

                // === Edge borders (sharp cyan lines) ===
                float edge = smoothstep(halfH - 1.0, halfH, abs(px.y - bannerCenterY));
                finalColor = mix(finalColor, vec3(0.0, 0.8, 1.0), edge * 0.7 * bannerMask);

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
                uScrollSpeed: { value: 0.04 }
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
