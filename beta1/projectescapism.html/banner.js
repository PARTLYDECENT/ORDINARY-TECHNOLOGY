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

            // --- 3D SDF DNA HELIX ---
            float sdDNASingle(vec3 p, float twist, float phase, float radius, float rStrand) {
                float angle = p.x * twist + phase;
                vec2 pRot = mat2(cos(angle), sin(angle), -sin(angle), cos(angle)) * p.yz;
                return length(pRot - vec2(radius, 0.0)) - rStrand;
            }

            float sdDNARungs(vec3 p, float twist, float radius, float rungSpacing, float rRung) {
                float rx = mod(p.x, rungSpacing) - rungSpacing * 0.5;
                float xRung = p.x - rx;
                float angle = xRung * twist;
                vec3 dir = vec3(0.0, cos(angle), sin(angle));
                vec3 c = vec3(xRung, 0.0, 0.0);
                float t = clamp(dot(p - c, dir), -radius, radius);
                vec3 closest = c + t * dir;
                return length(p - closest) - rRung;
            }

            // Stable double helix
            float mapDNAStable(vec3 p, float t) {
                float rot = t * 1.5;
                float twist = 0.035;
                float radius = 13.0;
                float rStrand = 1.8;
                float rRung = 0.6;
                float rungSpacing = 28.0;

                vec3 sp = p + vec3(t * 30.0, 0.0, 0.0);
                float s1 = sdDNASingle(sp, twist, rot, radius, rStrand);
                float s2 = sdDNASingle(sp, twist, rot + 3.14159265, radius, rStrand);
                float rungs = sdDNARungs(sp, twist, radius, rungSpacing, rRung);
                
                return min(min(s1, s2), rungs);
            }

            // Mutated 4-strand vortex
            float mapDNAMutant(vec3 p, float t) {
                float rot = t * 2.8;
                float twist = 0.05 + sin(t * 0.5) * 0.015;
                float radius = 15.0 + sin(p.x * 0.02 + t * 2.0) * 3.5;
                float rStrand = 1.5;
                float rRung = 0.5;
                float rungSpacing = 18.0;

                vec3 sp = p + vec3(t * 40.0, 0.0, 0.0);
                sp.y += sin(sp.x * 0.025 + t * 3.0) * 5.0;
                sp.z += cos(sp.x * 0.020 + t * 2.5) * 4.0;

                float s1 = sdDNASingle(sp, twist, rot, radius, rStrand);
                float s2 = sdDNASingle(sp, twist, rot + 1.570796, radius, rStrand);
                float s3 = sdDNASingle(sp, twist, rot + 3.141592, radius, rStrand);
                float s4 = sdDNASingle(sp, twist, rot + 4.712388, radius, rStrand);
                
                float rungs1 = sdDNARungs(sp, twist, radius, rungSpacing, rRung);
                float rungs2 = sdDNARungs(sp + vec3(rungSpacing * 0.5, 0.0, 0.0), twist, radius, rungSpacing, rRung);

                return min(min(min(min(s1, s2), s3), s4), min(rungs1, rungs2));
            }

            // Decaying / dissolving strands
            float mapDNADecay(vec3 p, float t) {
                float rot = t * 1.0;
                float twist = 0.035;
                float radius = 12.0;
                float rStrand = 1.8;
                float rRung = 0.6;
                float rungSpacing = 32.0;

                vec3 sp = p + vec3(t * 20.0, 0.0, 0.0);
                float s1 = sdDNASingle(sp, twist, rot, radius, rStrand);
                float s2 = sdDNASingle(sp, twist, rot + 3.14159265, radius, rStrand);
                float rungs = sdDNARungs(sp, twist, radius, rungSpacing, rRung);
                
                float d = min(min(s1, s2), rungs);

                float dissolve = noise(sp.xy * 0.025 + t * 1.2);
                if (dissolve > 0.5) {
                    d += (dissolve - 0.5) * 20.0;
                }
                
                d += noise(sp.xz * 0.4 + t * 6.0) * 0.4;
                return d;
            }

            float mapDNA(vec3 p, float t, float cycle) {
                float dStable = mapDNAStable(p, t);
                float dMutant = mapDNAMutant(p, t);
                float dDecay = mapDNADecay(p, t);

                if (cycle < 1.0) {
                    return mix(dStable, dMutant, smoothstep(0.8, 1.0, cycle));
                } else if (cycle < 2.0) {
                    return mix(dMutant, dDecay, smoothstep(1.8, 2.0, cycle));
                } else {
                    return mix(dDecay, dStable, smoothstep(2.8, 3.0, cycle));
                }
            }

            vec3 calcNormal(vec3 p, float t, float cycle) {
                vec2 eps = vec2(0.1, 0.0);
                return normalize(vec3(
                    mapDNA(p + eps.xyy, t, cycle) - mapDNA(p - eps.xyy, t, cycle),
                    mapDNA(p + eps.yxy, t, cycle) - mapDNA(p - eps.yxy, t, cycle),
                    mapDNA(p + eps.yyx, t, cycle) - mapDNA(p - eps.yyx, t, cycle)
                ));
            }

            void main() {
                vec2 px = (vUv - 0.5) * uResolution;
                float t = uTime;

                // --- Curved Visor Warping ---
                float radius = uResolution.x * 1.5;
                float angle = px.x / radius;
                
                float visorZ = radius * (cos(angle) - 1.0);
                float visorX = radius * sin(angle);
                float visorY = px.y - visorZ * 0.06;

                // --- Banner mask ---
                float bannerCenterY = (uBannerY - 0.5) * uResolution.y;
                float halfH = uBannerH * 0.5;
                float distFromBanner = abs(visorY - bannerCenterY) - halfH;

                float bannerMask = 1.0 - smoothstep(-2.0, 2.0, distFromBanner);
                if (bannerMask < 0.001) { discard; }

                float localY = (visorY - bannerCenterY + halfH) / (halfH * 2.0);
                float localX = vUv.x;

                float cycle = mod(t * 0.1, 3.0);

                // --- 3D DNA Raymarching ---
                vec3 ro = vec3(visorX, visorY - bannerCenterY, visorZ - 25.0);
                vec3 rd = vec3(0.0, 0.0, 1.0);
                
                float td = 0.0;
                float maxD = 55.0;
                float d = 0.0;
                vec3 p;
                int hit = 0;
                float minDist = 1000.0;

                for(int i = 0; i < 28; i++) {
                    p = ro + rd * td;
                    
                    vec3 bentP = p;
                    float theta = bentP.x / radius;
                    bentP.z -= radius * (cos(theta) - 1.0);
                    
                    d = mapDNA(bentP, t, cycle);
                    minDist = min(minDist, d);
                    
                    if (d < 0.05) {
                        hit = 1;
                        break;
                    }
                    td += d * 0.85;
                    if (td > maxD) break;
                }

                // --- Render Layers ---
                vec3 finalColor = vec3(0.002, 0.0, 0.0);
                float alpha = bannerMask * 0.95;
                
                finalColor += sin(visorY * 3.0 + t * 4.0) * 0.008;
                finalColor += sin(visorY * 120.0 - t * 2.0) * 0.012;

                // Glass specular diagonal sweeping reflection
                vec2 visorNormal = vec2(sin(angle), cos(angle));
                vec3 lightDir = normalize(vec3(0.5, 0.8, -1.0));
                vec3 viewDir = vec3(0.0, 0.0, -1.0);
                vec3 cylNormal = vec3(visorNormal.x, 0.0, visorNormal.y);
                
                float refSweep = sin(px.x * 0.0025 - px.y * 0.004 + t * 0.6) * 0.5 + 0.5;
                float glassSpec = pow(max(0.0, dot(cylNormal, normalize(lightDir + viewDir))), 40.0) * refSweep;
                finalColor += vec3(0.8, 0.85, 1.0) * glassSpec * 0.25;

                // 2. DNA BACK STRANDS (td > 25.0)
                if (hit == 1 && td > 25.0) {
                    vec3 bentP = p;
                    float theta = bentP.x / radius;
                    bentP.z -= radius * (cos(theta) - 1.0);
                    
                    vec3 N = calcNormal(bentP, t, cycle);
                    float diff = max(0.0, dot(N, lightDir));
                    float depthFade = smoothstep(55.0, 25.0, td);
                    
                    vec3 backCol = mix(vec3(0.25, 0.0, 0.02), vec3(0.7, 0.1, 0.08), diff);
                    finalColor = mix(finalColor, backCol, depthFade * 0.5);
                }

                // 3. TEXT LAYER (Cylindrical Refraction & Chromatic Aberration)
                float refractAmt = 0.04 * sin(angle);
                vec2 textUv = vec2(fract(localX + t * uScrollSpeed + refractAmt), localY);
                
                float abAmt = 0.008 * sin(angle);
                vec4 rCol = texture2D(uTextTex, vec2(fract(textUv.x + abAmt), textUv.y));
                vec4 gCol = texture2D(uTextTex, vec2(fract(textUv.x),         textUv.y));
                vec4 bCol = texture2D(uTextTex, vec2(fract(textUv.x - abAmt), textUv.y));
                
                float textAlpha = max(max(rCol.a, gCol.a), bCol.a);
                if (textAlpha > 0.05) {
                    vec3 txtCol = vec3(rCol.a, gCol.a, bCol.a);
                    txtCol = mix(txtCol * vec3(0.8, 0.1, 0.1), vec3(1.0, 0.95, 0.95), textAlpha);
                    
                    if (hash12(vec2(t * 1.5, floor(localY * 18.0))) > 0.98) {
                        txtCol = vec3(1.0, 1.0, 1.0);
                    }
                    
                    finalColor = mix(finalColor, txtCol, textAlpha * 0.85);
                    alpha = max(alpha, bannerMask * textAlpha);
                }

                // 4. DNA FRONT STRANDS (td <= 25.0)
                if (hit == 1 && td <= 25.0) {
                    vec3 bentP = p;
                    float theta = bentP.x / radius;
                    bentP.z -= radius * (cos(theta) - 1.0);
                    
                    vec3 N = calcNormal(bentP, t, cycle);
                    vec3 H = normalize(lightDir + viewDir);
                    float diff = max(0.0, dot(N, lightDir));
                    float spec = pow(max(0.0, dot(N, H)), 24.0);
                    float rim = pow(1.0 - max(0.0, dot(N, viewDir)), 3.5);
                    
                    vec3 frontCol = mix(vec3(0.65, 0.05, 0.0), vec3(1.0, 0.35, 0.15), diff);
                    frontCol += vec3(1.0, 0.9, 0.85) * spec * 0.7;
                    frontCol += vec3(1.0, 0.15, 0.3) * rim * 0.55;
                    frontCol += vec3(1.0, 0.8, 0.4) * (sin(bentP.x * 0.08 - t * 5.0) * 0.15 + 0.15);
                    
                    float frontAlpha = 0.92;
                    finalColor = mix(finalColor, frontCol, frontAlpha);
                    alpha = max(alpha, bannerMask * frontAlpha);
                } else if (hit == 0) {
                    float glowIntensity = 1.0 - smoothstep(0.0, 15.0, minDist);
                    if (glowIntensity > 0.0) {
                        vec3 glowCol = vec3(0.45, 0.02, 0.05) * glowIntensity * 0.35;
                        finalColor += glowCol;
                        alpha = max(alpha, bannerMask * glowIntensity * 0.3);
                    }
                }

                // 5. EDGE POLISH (curved border)
                float edge = smoothstep(halfH - 1.5, halfH, abs(visorY - bannerCenterY));
                finalColor = mix(finalColor, vec3(1.0, 0.1, 0.1), edge * 0.65 * bannerMask);

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
