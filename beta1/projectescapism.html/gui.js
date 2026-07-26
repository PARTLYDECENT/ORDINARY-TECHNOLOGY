/**
 * CYBERNETIC NEURAL-LINK HUD SYSTEM
 * Hardened sci-fi HUD with blood-dripping health vial, hex reticle crosshair,
 * segmented objective rail, and clean monospace data-feed text overlay.
 */

class SDFGUI {
    constructor(width, height) {
        this.width = width;
        this.height = height;

        this.camera = new THREE.OrthographicCamera(
            -width / 2, width / 2,
            height / 2, -height / 2,
            0.1, 10
        );
        this.camera.position.z = 1;
        this.scene = new THREE.Scene();

        this.canvas = document.createElement('canvas');
        this.canvas.width = width;
        this.canvas.height = height;
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });

        this.textTexture = new THREE.CanvasTexture(this.canvas);
        this.textTexture.minFilter = THREE.LinearFilter;
        this.textTexture.magFilter = THREE.LinearFilter;
        this.textTexture.needsUpdate = true;

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
            nodesActive: '2 / 2',
            sidequestName: '',
            sidequestCount: '',
            kineticCooldown: 0
        };
        this.lastStateStr = '';

        this.setupShader();

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
            uniform float uCrosshairScale;
            uniform vec3 uCrossColorOverride;

            varying vec2 vUv;

            // --- Noise ---
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
            float fbm(vec2 x) {
                float v=0.0, a=0.5;
                mat2 rot=mat2(cos(0.5),sin(0.5),-sin(0.5),cos(0.5));
                for(int i=0;i<4;++i){v+=a*noise(x);x=rot*x*2.0+vec2(100.0);a*=0.5;}
                return v;
            }

            // --- SDF Primitives ---
            float sdBox(vec2 p, vec2 b) {
                vec2 d=abs(p)-b; return length(max(d,0.0))+min(max(d.x,d.y),0.0);
            }
            float sdCircle(vec2 p, float r) { return length(p)-r; }
            float sdHexagon(vec2 p, float r) {
                const vec3 k=vec3(-0.866025404,0.5,0.577350269);
                p=abs(p); p-=2.0*min(dot(k.xy,p),0.0)*k.xy;
                p-=vec2(clamp(p.x,-k.z*r,k.z*r),r);
                return length(p)*sign(p.y);
            }
            float sdSegment(vec2 p, vec2 a, vec2 b) {
                vec2 pa=p-a,ba=b-a;
                float h=clamp(dot(pa,ba)/dot(ba,ba),0.0,1.0);
                return length(pa-ba*h);
            }
            float sdCapsule(vec2 p, vec2 a, vec2 b, float r) {
                return sdSegment(p, a, b) - r;
            }
            float smin(float a, float b, float k) {
                float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
                return mix(b, a, h) - k * h * (1.0 - h);
            }
            float sdEquilateralTriangle(in vec2 p, in float r) {
                const float k = sqrt(3.0);
                p.x = abs(p.x) - r;
                p.y = p.y + r/k;
                if( p.x+k*p.y>0.0 ) p = vec2(p.x-k*p.y,-k*p.x-p.y)/2.0;
                p.x -= clamp( p.x, -2.0*r, 0.0 );
                return -length(p)*sign(p.y);
            }
            float sdGrowingSegment(vec2 p, vec2 a, vec2 b, float growth) {
                vec2 pa = p - a, ba = b - a;
                float h = clamp(dot(pa,ba)/dot(ba,ba), 0.0, 1.0);
                if (h > growth) {
                    vec2 tip = a + ba * growth;
                    return length(p - tip);
                }
                return length(pa - ba*h);
            }

            // --- Green Heart Crosshair ---
            float sdHeart(vec2 p) {
                p.x = abs(p.x);
                if( p.y + p.x > 1.0 )
                    return sqrt(dot(p - vec2(0.25, 0.75), p - vec2(0.25, 0.75))) - 0.353553;
                return sqrt(min(dot(p - vec2(0.0, 1.0), p - vec2(0.0, 1.0)),
                                dot(p - 0.5 * max(p.x + p.y, 0.0), p - 0.5 * max(p.x + p.y, 0.0)))) * sign(p.x - p.y);
            }

            float organicCrosshair(vec2 p) {
                vec2 hp = (p + vec2(0.0, 6.5)) / 15.0;
                float dH = sdHeart(hp) * 15.0;
                float centerDot = sdCircle(p, 1.2);
                float heartOutline = abs(dH) - 1.2;
                return min(heartOutline, centerDot);
            }

            vec3 getCrosshairColor(float tTime) {
                return vec3(0.0, 1.0, 0.45); // Vibrant Green
            }

            vec4 renderCrosshair(vec2 px) {
                vec3 col = vec3(0.0);
                float alpha = 0.0;

                vec2 hp = (px + vec2(0.0, 6.5)) / 15.0;
                float dHeart = sdHeart(hp) * 15.0;
                float centerDot = sdCircle(px, 1.2);

                float heartOutline = abs(dHeart) - 1.2;
                float heartShape = min(heartOutline, centerDot);

                float crossGlow = 1.0 - smoothstep(0.0, 8.0, max(0.0, dHeart));
                float strokeEdge = 1.0 - smoothstep(0.0, 1.5, heartShape);
                float fillGlow = 1.0 - smoothstep(-10.0, 0.0, dHeart);

                if (crossGlow > 0.0 || strokeEdge > 0.0) {
                    vec3 crossColor = vec3(0.0, 1.0, 0.45);
                    if (length(uCrossColorOverride) > 0.0) {
                        crossColor = uCrossColorOverride;
                    }
                    vec3 finalColor = crossColor * (0.35 * fillGlow + 0.25 * crossGlow);
                    finalColor = mix(finalColor, crossColor, strokeEdge);
                    
                    float dotEdge = 1.0 - smoothstep(0.0, 1.2, centerDot);
                    finalColor = mix(finalColor, vec3(1.0), dotEdge);

                    col = finalColor;
                    alpha = clamp(strokeEdge * 0.95 + fillGlow * 0.35 + dotEdge, 0.0, 1.0);
                }

                return vec4(col, alpha);
            }

            // === SEGMENTED OBJECTIVE RAIL ===
            vec4 renderObjectiveRail(vec2 px) {
                vec2 railCenter = vec2(0.0, uResolution.y * 0.46);
                vec2 p = px - railCenter;

                vec3 col = vec3(0.0);
                float alpha = 0.0;

                // Rail frame
                float rail = sdBox(p, vec2(120.0, 4.0)) - 1.0;
                float railEdge = 1.0 - smoothstep(0.0, 2.0, abs(rail));

                // Segments (5 segments)
                float segW = 44.0;
                float segGap = 4.0;
                float totalW = 5.0 * segW + 4.0 * segGap;
                float startX = -totalW * 0.5;

                for(int i = 0; i < 5; i++) {
                    float fi = float(i);
                    float sx = startX + fi * (segW + segGap) + segW * 0.5;
                    float seg = sdBox(p - vec2(sx, 0.0), vec2(segW * 0.5 - 1.0, 3.0));

                    float pct = fi / 4.0;
                    bool filled = uObjPct >= pct + 0.05;
                    bool isActive = uObjPct >= pct - 0.05 && uObjPct < pct + 0.25;

                    float segGlow = 1.0 - smoothstep(0.0, 1.5, seg);
                    if (segGlow > 0.0) {
                        vec3 segCol;
                        if (filled) {
                            segCol = vec3(0.0, 0.8, 1.0);
                        } else if (isActive) {
                            float pulse = sin(uTime * 4.0) * 0.3 + 0.7;
                            segCol = vec3(0.0, 0.5, 0.7) * pulse;
                        } else {
                            segCol = vec3(0.05, 0.08, 0.1);
                        }
                        col += segCol * segGlow;
                        alpha = max(alpha, segGlow * 0.85);
                    }
                }

                col += vec3(0.0, 0.6, 0.8) * railEdge * 0.4;
                alpha = max(alpha, railEdge * 0.3);

                return vec4(col, alpha);
            }

            // === HITMARKER ===
            vec4 renderHitmarker(vec2 px) {
                if (uHitmarker <= 0.0) return vec4(0.0);

                vec3 col = vec3(0.0);
                float alpha = 0.0;

                // X-shaped hit confirmation
                float s = 0.7071;
                mat2 rot = mat2(s,-s,s,s);
                vec2 rp = rot * px;

                float arms = min(
                    sdSegment(rp, vec2(-12.0, 0.0), vec2(12.0, 0.0)),
                    sdSegment(rp, vec2(0.0, -12.0), vec2(0.0, 12.0))
                );

                float scale = 0.5 + uHitmarker * 0.5;
                float armGlow = 1.0 - smoothstep(0.0, 2.0 * scale, arms);

                if (armGlow > 0.0) {
                    vec3 hitCol = mix(vec3(1.0, 0.2, 0.0), vec3(1.0, 1.0, 1.0), uHitmarker);
                    col = hitCol * armGlow;
                    alpha = armGlow * uHitmarker;
                }

                return vec4(col, alpha);
            }

            void main() {
                vec2 px = (vUv - 0.5) * uResolution;
                vec3 finalColor = vec3(0.0);
                float alpha = 0.0;

                // 1. Text overlay with subtle scanline
                vec2 textUv = vUv;
                float scanline = sin(vUv.y * uResolution.y * 1.5 + uTime * 2.0) * 0.02;
                textUv.y += scanline * 0.001;

                // Glitch on damage
                float glitchAmt = uHitmarker * 0.01;
                textUv.x += (hash12(vec2(uTime * 10.0, floor(vUv.y * 50.0))) - 0.5) * glitchAmt;

                vec4 textData = texture2D(uTextTex, textUv);
                if (textData.a > 0.0) {
                    vec3 textColor = textData.rgb;
                    // Subtle chromatic aberration
                    float rOff = texture2D(uTextTex, textUv + vec2(0.0008, 0.0)).a;
                    float bOff = texture2D(uTextTex, textUv - vec2(0.0008, 0.0)).a;
                    textColor.r += rOff * 0.15;
                    textColor.b += bOff * 0.15;
                    finalColor = textColor;
                    alpha = textData.a;
                }

                // 3. Crosshair
                vec4 ch = renderCrosshair(px / (uCrosshairScale > 0.0 ? uCrosshairScale : 1.0));
                if (ch.a > 0.0) {
                    finalColor = mix(finalColor, ch.rgb, ch.a);
                    alpha = max(alpha, ch.a);
                }

                // 4. Objective Rail
                vec4 obj = renderObjectiveRail(px);
                if (obj.a > 0.0) {
                    finalColor = mix(finalColor, obj.rgb, obj.a);
                    alpha = max(alpha, obj.a);
                }

                // 5. Hitmarker
                vec4 hm = renderHitmarker(px);
                if (hm.a > 0.0) {
                    finalColor = mix(finalColor, hm.rgb, hm.a);
                    alpha = max(alpha, hm.a);
                }

                // Scanline overlay on everything (subdued for cleanliness)
                float scan = 1.0 - smoothstep(0.0, 0.5, abs(fract(px.y * 0.5) - 0.5)) * 0.02;
                finalColor *= scan;

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
                uObjPct: { value: 0.0 },
                uCrosshairScale: { value: 1.0 },
                uCrossColorOverride: { value: new THREE.Vector3(0, 0, 0) }
            },
            transparent: true,
            depthTest: false,
            depthWrite: false
        });
    }

    updateText() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.width, this.height);

        const fMain = 'bold 24px "Courier New", monospace';
        const fSmall = 'bold 19px "Courier New", monospace';
        const fLarge = 'bold 48px "Courier New", monospace';
        const fLabel = 'bold 13px "Courier New", monospace';

        const cyan = '#00e5ff';
        const dimCyan = '#00808a';
        const white = '#e0e8f0';
        const red = '#ff3344';
        const amber = '#ffaa00';



        // --- TOP CENTER: Objective ---
        ctx.textAlign = 'center';
        ctx.fillStyle = cyan;
        ctx.font = fMain;
        ctx.fillText(`◈ ${this.state.objectiveName}`, this.width / 2, 24);
        ctx.font = fSmall;
        ctx.fillStyle = dimCyan;
        ctx.fillText(this.state.objectiveCount, this.width / 2, 54);

        // --- TOP RIGHT: Credits (Nacht Mode) ---
        if (window.NACHT_MODE) {
            ctx.textAlign = 'right';
            ctx.textBaseline = 'top';
            ctx.font = fLabel;
            ctx.fillStyle = dimCyan;
            ctx.fillText('NEURAL_CREDITS ◈', this.width - 20, 14);
            ctx.font = 'bold 22px "Courier New", monospace';
            ctx.fillStyle = amber;
            const _bal = (window.moneyWeb && typeof window.moneyWeb.getBalance === 'function') ? window.moneyWeb.getBalance() : (window.zombiePoints || 10000);
            ctx.fillText(`${_bal} CR`, this.width - 20, 36);
        }

        // --- BOTTOM RIGHT: Ammo & Weapon ---
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        ctx.fillStyle = dimCyan;
        ctx.font = fLabel;
        ctx.fillText('ARMAMENT_STATUS ◈', this.width - 20, this.height - 100);

        ctx.fillStyle = white;
        ctx.font = fSmall;
        ctx.fillText(`[ ${this.state.weaponName.toUpperCase()} ]`, this.width - 20, this.height - 78);

        ctx.fillStyle = cyan;
        ctx.font = fLarge;
        ctx.fillText(this.state.ammo, this.width - 20, this.height - 24);

        // --- BOTTOM LEFT: Cyber-Shockwave Cooldown ---
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        ctx.font = fLabel;
        ctx.fillStyle = dimCyan;
        ctx.fillText('◈ TACTICAL_DRIVE', 20, this.height - 100);

        ctx.font = fSmall;
        const cooldown = this.state.kineticCooldown;
        if (cooldown > 0) {
            ctx.fillStyle = red;
            ctx.fillText(`KINETIC BLAST: CHARGING [ ${Math.ceil(cooldown)}s ]`, 20, this.height - 78);
        } else {
            ctx.fillStyle = '#00ffaa'; // Cyan/Green ready color
            ctx.fillText('KINETIC BLAST: READY [F]', 20, this.height - 78);
        }



        // --- TOP LEFT: Sidequest ---
        if (this.state.sidequestName) {
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';

            ctx.font = fLabel;
            ctx.fillStyle = '#ffaa00'; // Amber sidequest title
            ctx.fillText('◈ OPTIONAL SIDEQUEST', 20, 14);

            ctx.font = fSmall;
            ctx.fillStyle = white;
            ctx.fillText(this.state.sidequestName.toUpperCase(), 20, 36);

            ctx.fillStyle = dimCyan;
            ctx.fillText(this.state.sidequestCount || '', 20, 58);
        }

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
            this.material.uniforms.uHitmarker.value = newState.hitmarker;
        }
    }

    render(renderer, delta, time) {
        if (this.material.uniforms.uHitmarker.value > 0) {
            this.material.uniforms.uHitmarker.value = Math.max(0, this.material.uniforms.uHitmarker.value - delta * 2.0);
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
