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
            nodesActive: '2 / 2'
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

            // --- Morphing Crosshair Helpers ---
            float crosshairForms(vec2 p) {
                float cycle = 56.0;
                float t = mod(uTime * 1.5, cycle);
                float state = floor(t / (cycle / 8.0));
                float progress = fract(t / (cycle / 8.0));
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

                // Form 5: 12-sided Dodecagon Reticle (dodecadhedron)
                float maxD5 = -100.0;
                for(int i=0; i<6; i++) {
                    float a = float(i) * 0.523598; // PI / 6
                    float dPlane = abs(p.x * cos(a) + p.y * sin(a)) - 9.5;
                    maxD5 = max(maxD5, dPlane);
                }
                float d5 = abs(maxD5) - 1.2;

                // Form 6: Glitch Reticle (Horizontal Offset Analog Tearing)
                float glitchOffset = sin(p.y * 3.0 + uTime * 45.0) * cos(p.y * 12.0 - uTime * 30.0) * 4.0;
                if (sin(uTime * 15.0) <= 0.0) {
                    glitchOffset = 0.0;
                }
                vec2 pGlitch = p + vec2(glitchOffset, 0.0);
                float d6 = abs(sdBox(pGlitch, vec2(11.0, 11.0))) - 0.8;
                float d6_lines = min(sdBox(pGlitch - vec2(0.0, 5.0), vec2(13.0, 0.5)), sdBox(pGlitch + vec2(0.0, 5.0), vec2(13.0, 0.5)));
                d6 = min(d6, d6_lines);

                // Form 7: Cybermatic Quad-Aperture (Concentric Cyber Rings)
                float ring1 = abs(length(p) - 11.0) - 0.8;
                float ring2 = abs(length(p) - 6.0) - 0.5;
                float ticks = min(sdBox(p, vec2(15.0, 0.8)), sdBox(p, vec2(0.8, 15.0)));
                float d7 = min(max(ring1, -ticks), ring2);

                float res = 0.0;
                if (state == 0.0) res = mix(d0, d1, progress);
                else if (state == 1.0) res = mix(d1, d2, progress);
                else if (state == 2.0) res = mix(d2, d3, progress);
                else if (state == 3.0) res = mix(d3, d4, progress);
                else if (state == 4.0) res = mix(d4, d5, progress);
                else if (state == 5.0) res = mix(d5, d6, progress);
                else if (state == 6.0) res = mix(d6, d7, progress);
                else res = mix(d7, d0, progress);

                // Frantic micro-vibrations
                res += fbm(p * 0.5 + uTime * 10.0) * 1.5;
                return res;
            }

            float organicCrosshair(vec2 p) {
                float d = crosshairForms(p);
                float inner = sdCircle(p, 1.5 + sin(uTime * 12.0) * 0.8);
                return smin(d, inner, 3.0);
            }

            // === CYBERNETIC HEALTH VIAL ===
            // Vertical vial on the left side with blood fill + dripping
            float vialFrame(vec2 p) {
                // Main vial body (tall rounded rect)
                float body = sdBox(p, vec2(14.0, 70.0)) - 3.0;
                // Top cap hex
                float cap = sdHexagon(p - vec2(0.0, 76.0), 16.0);
                // Bottom cap hex
                float bot = sdHexagon(p + vec2(0.0, 76.0), 16.0);
                return min(body, min(cap, bot));
            }

            vec4 renderHealthVial(vec2 px) {
                // Position: left side, vertically centered
                vec2 vialCenter = vec2(-uResolution.x * 0.44, 0.0);
                vec2 p = px - vialCenter;

                float frame = vialFrame(p);
                float innerBody = sdBox(p, vec2(11.0, 67.0)) - 2.0;

                vec3 col = vec3(0.0);
                float alpha = 0.0;

                // Frame glow (cybernetic framing that changes color based on integrity)
                float frameGlow = 1.0 - smoothstep(0.0, 4.0, abs(frame));
                if (frameGlow > 0.0) {
                    float circuit = sin(p.y * 0.8 + uTime * 2.0) * 0.5 + 0.5;
                    
                    vec3 frameCol;
                    if (uHealthPct > 0.6) {
                        frameCol = mix(vec3(0.0, 0.6, 0.8), vec3(0.0, 1.0, 1.0), circuit * frameGlow);
                    } else if (uHealthPct > 0.3) {
                        frameCol = mix(vec3(0.8, 0.4, 0.0), vec3(1.0, 0.7, 0.0), circuit * frameGlow);
                    } else {
                        float warningPulse = sin(uTime * 10.0) * 0.3 + 0.7;
                        frameCol = mix(vec3(0.6, 0.0, 0.0), vec3(1.0, 0.1, 0.1), circuit * frameGlow) * warningPulse;
                    }

                    // Corner node glow
                    float cornerDist = min(min(
                        sdCircle(p - vec2(-14.0, 70.0), 3.0),
                        sdCircle(p - vec2(14.0, 70.0), 3.0)),
                        min(sdCircle(p - vec2(-14.0, -70.0), 3.0),
                        sdCircle(p - vec2(14.0, -70.0), 3.0)));
                    float cornerGlow = 1.0 - smoothstep(0.0, 5.0, cornerDist);
                    
                    vec3 nodeCol = uHealthPct > 0.6 ? vec3(0.0, 0.8, 1.0) : (uHealthPct > 0.3 ? vec3(1.0, 0.6, 0.0) : vec3(1.0, 0.1, 0.1));
                    frameCol += nodeCol * cornerGlow * 0.6;

                    col = frameCol;
                    alpha = frameGlow * 0.9;
                }

                // Inner fluid fill
                if (innerBody < 0.0) {
                    // Fill level (bottom to top)
                    float fillY = -67.0 + 134.0 * uHealthPct;
                    float meniscus = sin(p.x * 0.3 + uTime * 3.0) * 2.0;
                    float fillMask = smoothstep(fillY + meniscus + 1.0, fillY + meniscus - 1.0, p.y);

                    // Background (empty vial - dark with grid)
                    float grid = step(0.9, fract(p.y * 0.1)) + step(0.9, fract(p.x * 0.15));
                    vec3 emptyCol = vec3(0.01, 0.03, 0.04) + grid * 0.02;

                    // Blood fluid color (rich deep red to bright oxygenated scarlet, pulsing)
                    float pulseSpeed = 5.0 - uHealthPct * 4.0;
                    float bloodPulse = sin(uTime * pulseSpeed) * 0.15 + 0.85;
                    vec3 deepBlood = vec3(0.4, 0.005, 0.005);
                    vec3 brightBlood = vec3(0.9, 0.015, 0.015);
                    
                    vec3 fluidCol = mix(deepBlood, brightBlood, fbm(p * 0.07 + uTime * 0.8) * bloodPulse);

                    // Surface tension wobble at meniscus (glowing top edge)
                    float surfaceDist = abs(p.y - fillY - meniscus);
                    float surfaceGlow = 1.0 - smoothstep(0.0, 4.0, surfaceDist);
                    fluidCol += surfaceGlow * vec3(0.4, 0.02, 0.02) * bloodPulse;

                    // Internal bubbles
                    for(int i = 0; i < 3; i++) {
                        float fi = float(i);
                        float bx = sin(uTime * (1.0 + fi * 0.3) + fi * 2.0) * 6.0;
                        float by = mod(uTime * (8.0 + fi * 3.0) + fi * 40.0, 134.0) - 67.0;
                        float bubble = sdCircle(p - vec2(bx, by), 1.5 + fi * 0.5);
                        float bubbleGlow = 1.0 - smoothstep(0.0, 2.5, bubble);
                        if (by < fillY) fluidCol += bubbleGlow * vec3(0.2, 0.01, 0.01);
                    }

                    col = mix(emptyCol, fluidCol, fillMask);
                    alpha = max(alpha, 0.92);
                }

                // Tick marks on vial
                for(int i = 1; i <= 4; i++) {
                    float ty = -67.0 + float(i) * 26.8;
                    float tick = sdSegment(p, vec2(-13.0, ty), vec2(-9.0, ty));
                    float tickGlow = 1.0 - smoothstep(0.0, 1.0, tick);
                    if (innerBody < 0.0) {
                        vec3 tickCol = uHealthPct > 0.6 ? vec3(0.0, 0.5, 0.6) : (uHealthPct > 0.3 ? vec3(0.6, 0.4, 0.0) : vec3(0.6, 0.0, 0.0));
                        col += tickCol * tickGlow * 0.4;
                        alpha = max(alpha, tickGlow * 0.3);
                    }
                }

                // === GLOBAL BLOOD DRIP PARTICLES (Rendered below and outside the vial) ===
                float dripIntensity = 1.0 - uHealthPct;
                if (dripIntensity > 0.05) {
                    for(int i = 0; i < 6; i++) {
                        float fi = float(i);
                        float seed = hash12(vec2(fi, 42.13));
                        
                        // X offset from bottom of the vial
                        float dx = (seed - 0.5) * 20.0;
                        
                        // Falling speed
                        float speed = 70.0 + seed * 50.0;
                        
                        // Y start position is the bottom cap of the vial (~ -76.0)
                        float cycleLength = 150.0 + seed * 100.0;
                        float dy = -76.0 - mod(uTime * speed + fi * 35.0, cycleLength);
                        
                        // Drip head position
                        vec2 headPos = vec2(dx, dy);
                        
                        // Trail segment from vial bottom to head
                        float trail = sdSegment(p, vec2(dx, -76.0), headPos) - (1.0 + dripIntensity * 0.8);
                        // Droplet head
                        float head = sdCircle(p - headPos, 2.0 + dripIntensity * 1.5);
                        float dropD = min(trail, head);
                        
                        // Wavy side motion as it falls
                        float sway = sin(p.y * 0.08 + uTime * 2.5) * 1.2 * (1.0 - smoothstep(-76.0, -300.0, p.y));
                        dropD += sway * 0.3;
                        
                        // Fade out near bottom of screen or cycle end
                        float age = mod(uTime * speed + fi * 35.0, cycleLength) / cycleLength;
                        float fade = smoothstep(1.0, 0.85, age) * (1.0 - smoothstep(-76.0, -400.0, p.y));
                        
                        float dropAlpha = (1.0 - smoothstep(0.0, 2.0, dropD)) * dripIntensity * fade;
                        if (dropAlpha > 0.0) {
                            vec3 bloodCol = mix(vec3(0.5, 0.0, 0.0), vec3(0.9, 0.01, 0.01), dripIntensity);
                            col = mix(col, bloodCol, dropAlpha * 0.95);
                            alpha = max(alpha, dropAlpha * 0.95);
                        }
                    }
                }

                return vec4(col, alpha);
            }

            // === SELF-ASSEMBLING CIRCUITRY FRAME ===
            vec4 renderCircuitFrame(vec2 px) {
                vec2 halfRes = uResolution * 0.5;
                vec2 absPx = abs(px);
                float margin = 12.0;
                vec2 borderLimit = halfRes - margin;

                vec3 col = vec3(0.0);
                float alpha = 0.0;

                // Timings for sequential self-assembly (grown over 5 seconds)
                float t = uTime * 1.5; // speed multiplier
                
                // Main track segment timings
                float g1 = clamp(t, 0.0, 1.0); // Top-center to corner start
                float g2 = clamp((t - 1.0) * 3.0, 0.0, 1.0); // Chamfer
                float g3 = clamp((t - 1.3) * 1.2, 0.0, 1.0); // Side vertical

                // Segment lengths & distances
                float seg1 = sdGrowingSegment(absPx, vec2(0.0, borderLimit.y), vec2(borderLimit.x - 40.0, borderLimit.y), g1);
                float seg2 = sdGrowingSegment(absPx, vec2(borderLimit.x - 40.0, borderLimit.y), vec2(borderLimit.x, borderLimit.y - 40.0), g2);
                float seg3 = sdGrowingSegment(absPx, vec2(borderLimit.x, borderLimit.y - 40.0), vec2(borderLimit.x, 0.0), g3);

                // Double rail track (offset by 3.5 pixels)
                float offset = 3.5;
                float seg1_b = sdGrowingSegment(absPx, vec2(0.0, borderLimit.y - offset), vec2(borderLimit.x - 40.0 + offset, borderLimit.y - offset), g1);
                float seg2_b = sdGrowingSegment(absPx, vec2(borderLimit.x - 40.0 + offset, borderLimit.y - offset), vec2(borderLimit.x - offset, borderLimit.y - 40.0 + offset), g2);
                float seg3_b = sdGrowingSegment(absPx, vec2(borderLimit.x - offset, borderLimit.y - 40.0 + offset), vec2(borderLimit.x - offset, 0.0), g3);

                // Combined main border SDF
                float borderDist = min(min(seg1, seg2), seg3) - 0.7;
                float borderDist_b = min(min(seg1_b, seg2_b), seg3_b) - 0.5;

                // Branches (grow after corner chamfer starts to assemble)
                float gBranch1 = clamp((t - 1.8) * 1.5, 0.0, 1.0);
                float gBranch2 = clamp((t - 2.2) * 1.5, 0.0, 1.0);

                // Branch 1: Top-right side branching inward at 45 deg, then horizontal
                vec2 b1_start = vec2(borderLimit.x - 80.0, borderLimit.y - offset);
                vec2 b1_mid = b1_start + vec2(-25.0, -25.0);
                vec2 b1_end = b1_mid + vec2(-30.0, 0.0);
                float br1_a = sdGrowingSegment(absPx, b1_start, b1_mid, gBranch1);
                float br1_b = sdGrowingSegment(absPx, b1_mid, b1_end, gBranch2);
                float branch1 = min(br1_a, br1_b) - 0.5;

                // Branch 2: Right side branching inward, then vertical
                vec2 b2_start = vec2(borderLimit.x - offset, borderLimit.y - 90.0);
                vec2 b2_mid = b2_start + vec2(-25.0, -25.0);
                vec2 b2_end = b2_mid + vec2(0.0, -35.0);
                float br2_a = sdGrowingSegment(absPx, b2_start, b2_mid, gBranch1);
                float br2_b = sdGrowingSegment(absPx, b2_mid, b2_end, gBranch2);
                float branch2 = min(br2_a, br2_b) - 0.5;

                // Vias/Donut pads at ends of branches (appear when branches complete)
                float pad1Val = sdCircle(absPx - b1_end, 3.2);
                float pad1Inner = sdCircle(absPx - b1_end, 1.0);
                float pad1 = max(pad1Val, -pad1Inner);

                float pad2Val = sdCircle(absPx - b2_end, 3.2);
                float pad2Inner = sdCircle(absPx - b2_end, 1.0);
                float pad2 = max(pad2Val, -pad2Inner);

                // Mini chip near the corner
                vec2 chipCenter = borderLimit - vec2(70.0, 70.0);
                float chipBody = sdBox(absPx - chipCenter, vec2(8.0, 8.0));
                
                // Chip pins
                float pins = 100.0;
                for(int i = 0; i < 3; i++) {
                    float offsetPin = float(i) * 5.0 - 5.0;
                    pins = min(pins, sdSegment(absPx, chipCenter + vec2(offsetPin, 8.0), chipCenter + vec2(offsetPin, 11.0)));
                    pins = min(pins, sdSegment(absPx, chipCenter + vec2(offsetPin, -8.0), chipCenter + vec2(offsetPin, -11.0)));
                    pins = min(pins, sdSegment(absPx, chipCenter + vec2(8.0, offsetPin), chipCenter + vec2(11.0, offsetPin)));
                    pins = min(pins, sdSegment(absPx, chipCenter + vec2(-8.0, offsetPin), chipCenter + vec2(-11.0, offsetPin)));
                }

                // Show chip elements after main frame is mostly assembled
                float chipAppear = smoothstep(2.5, 3.5, t);
                chipBody -= 0.5;
                pins -= 0.4;

                // Combine all geometries
                float circuit = min(borderDist, borderDist_b);
                circuit = min(circuit, min(branch1, branch2));
                
                // Render tracks and branches
                float circuitGlow = 1.0 - smoothstep(0.0, 2.5, circuit);
                float circuitCore = 1.0 - smoothstep(0.0, 0.8, circuit);

                // Render donut pads
                float padGlow = 1.0 - smoothstep(0.0, 1.0, min(pad1, pad2));
                
                // Render microchips
                float chipGlow = 1.0 - smoothstep(0.0, 1.0, chipBody);
                float pinsGlow = 1.0 - smoothstep(0.0, 0.8, pins);

                // Flickering startup effect
                float startupFlicker = mix(1.0, sin(uTime * 50.0) * 0.15 + 0.85, 1.0 - smoothstep(3.5, 4.2, uTime));
                startupFlicker = max(startupFlicker, 0.0);

                // Cyan circuit glow
                vec3 circuitColor = vec3(0.0, 0.8, 1.0);
                col += circuitColor * circuitGlow * 0.4 * startupFlicker;
                col += vec3(1.0) * circuitCore * 0.7 * startupFlicker;

                // Branch ends pads (orange tint for realistic gold finish!)
                col = mix(col, vec3(1.0, 0.6, 0.1), padGlow * 0.8 * gBranch2 * startupFlicker);

                // Microchips (dark core with cyan border)
                if (chipAppear > 0.05) {
                    float chipOutline = abs(chipBody) - 0.3;
                    float chipOutlineGlow = 1.0 - smoothstep(0.0, 1.2, chipOutline);
                    col += vec3(0.0, 0.5, 0.7) * chipOutlineGlow * 0.5 * chipAppear * startupFlicker;
                    col += vec3(0.0, 0.8, 1.0) * pinsGlow * 0.7 * chipAppear * startupFlicker;
                }

                // --- DATA PACKET PULSES ---
                // Moving particles along the main frame tracks
                float L1 = borderLimit.x - 40.0;
                float L2 = 56.57;
                float L3 = borderLimit.y - 40.0;
                float totalLength = L1 + L2 + L3;
                float cycleLength = totalLength + 200.0;
                float pulsePos = mod(uTime * 250.0, cycleLength);
                
                vec2 packetPos = vec2(-1.0);
                if (pulsePos < L1) {
                    packetPos = vec2(pulsePos, borderLimit.y);
                } else if (pulsePos < L1 + L2) {
                    float tSegment = (pulsePos - L1) / L2;
                    packetPos = mix(vec2(L1, borderLimit.y), vec2(borderLimit.x, borderLimit.y - 40.0), tSegment);
                } else if (pulsePos < L1 + L2 + L3) {
                    float tSegment = (pulsePos - L1 - L2) / L3;
                    packetPos = mix(vec2(borderLimit.x, borderLimit.y - 40.0), vec2(borderLimit.x, 0.0), tSegment);
                }

                if (packetPos.x >= 0.0 && g3 > 0.9) {
                    float packetDist = sdCircle(absPx - packetPos, 2.0);
                    float packetGlow = 1.0 - smoothstep(0.0, 3.5, packetDist);
                    col += vec3(1.0, 1.0, 1.0) * packetGlow * startupFlicker;
                }

                alpha = max(max(circuitGlow * 0.5, padGlow * 0.8 * gBranch2), max(chipGlow * 0.6 * chipAppear, pinsGlow * 0.7 * chipAppear));
                alpha = max(alpha, borderDist < 0.0 ? 0.9 : 0.0);
                
                return vec4(col, alpha);
            }

            // === ORGANIC MORPHING CROSSHAIR ===
            vec3 getCrosshairColor(float tTime) {
                float cycle = 56.0;
                float t = mod(tTime * 1.5, cycle);
                float state = floor(t / (cycle / 8.0));
                float progress = fract(t / (cycle / 8.0));
                progress = smoothstep(0.0, 1.0, progress);

                vec3 colCurrent = vec3(0.0, 1.0, 0.4); // State 0: Green
                if (state == 1.0) colCurrent = vec3(1.0, 0.45, 0.0); // State 1: Orange
                else if (state == 2.0) colCurrent = vec3(0.0, 0.6, 1.0); // State 2: Blue
                else if (state == 3.0) colCurrent = vec3(1.0, 0.45, 0.0); // State 3: Orange
                else if (state == 4.0) colCurrent = vec3(0.0, 0.6, 1.0); // State 4: Blue
                else if (state == 5.0) colCurrent = vec3(0.0, 1.0, 0.4); // State 5: Green
                else if (state == 6.0) colCurrent = vec3(1.0, 0.45, 0.0); // State 6: Orange
                else if (state == 7.0) colCurrent = vec3(0.0, 0.6, 1.0); // State 7: Blue

                vec3 colNext = vec3(0.0, 1.0, 0.4); // Next: Green
                float nextState = mod(state + 1.0, 8.0);
                if (nextState == 1.0) colNext = vec3(1.0, 0.45, 0.0);
                else if (nextState == 2.0) colNext = vec3(0.0, 0.6, 1.0);
                else if (nextState == 3.0) colNext = vec3(1.0, 0.45, 0.0);
                else if (nextState == 4.0) colNext = vec3(0.0, 0.6, 1.0);
                else if (nextState == 5.0) colNext = vec3(0.0, 1.0, 0.4);
                else if (nextState == 6.0) colNext = vec3(1.0, 0.45, 0.0);
                else if (nextState == 7.0) colNext = vec3(0.0, 0.6, 1.0);

                return mix(colCurrent, colNext, progress);
            }

            vec4 renderCrosshair(vec2 px) {
                vec3 col = vec3(0.0);
                float alpha = 0.0;

                float dCross = organicCrosshair(px);
                float crossGlow = 1.0 - smoothstep(0.0, 10.0, dCross);
                float crossCore = 1.0 - smoothstep(0.0, 1.5, dCross);

                if (crossGlow > 0.0) {
                    vec3 crossColor = getCrosshairColor(uTime);
                    if (length(uCrossColorOverride) > 0.0) {
                        crossColor = uCrossColorOverride;
                    }
                    vec3 finalColor = mix(crossColor * 0.75, vec3(1.0), crossCore * 0.65);
                    col = finalColor * crossGlow * 0.95;
                    alpha = crossGlow * 0.95;
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

                // 2. Health Vial (removed per request)
                /*
                vec4 vial = renderHealthVial(px);
                if (vial.a > 0.0) {
                    finalColor = mix(finalColor, vial.rgb, vial.a);
                    alpha = max(alpha, vial.a);
                }
                */

                // Self-assembling Circuit Frame
                vec4 circuit = renderCircuitFrame(px);
                if (circuit.a > 0.0) {
                    finalColor = mix(finalColor, circuit.rgb, circuit.a);
                    alpha = max(alpha, circuit.a);
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

                // Scanline overlay on everything
                float scan = 1.0 - smoothstep(0.0, 0.5, abs(fract(px.y * 0.5) - 0.5)) * 0.06;
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

        const fMain = 'bold 14px "Courier New", monospace';
        const fSmall = 'bold 11px "Courier New", monospace';
        const fLarge = 'bold 32px "Courier New", monospace';
        const fLabel = '10px "Courier New", monospace';

        const cyan = '#00e5ff';
        const dimCyan = '#00808a';
        const white = '#e0e8f0';
        const red = '#ff3344';
        const amber = '#ffaa00';

        // --- TOP LEFT: Kill / Zombie / Nodes ---
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';

        ctx.font = fLabel;
        ctx.fillStyle = dimCyan;
        ctx.fillText('◈ COMBAT_DATA', 20, 14);

        ctx.font = fMain;
        ctx.fillStyle = red;
        ctx.fillText(`[ KILLS: ${this.state.kills} ]`, 20, 32);

        ctx.fillStyle = white;
        ctx.font = fSmall;
        ctx.fillText(`HOSTILES: ${this.state.zombies}`, 20, 54);

        ctx.fillStyle = cyan;
        ctx.fillText(`NODES: ${this.state.nodesActive}`, 20, 70);

        // --- TOP CENTER: Objective ---
        ctx.textAlign = 'center';
        ctx.fillStyle = cyan;
        ctx.font = fMain;
        ctx.fillText(`◈ ${this.state.objectiveName}`, this.width / 2, 14);
        ctx.font = fSmall;
        ctx.fillStyle = dimCyan;
        ctx.fillText(this.state.objectiveCount, this.width / 2, 36);

        // --- BOTTOM RIGHT: Ammo & Weapon ---
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        ctx.fillStyle = dimCyan;
        ctx.font = fLabel;
        ctx.fillText('ARMAMENT_STATUS ◈', this.width - 20, this.height - 72);

        ctx.fillStyle = white;
        ctx.font = fSmall;
        ctx.fillText(`[ ${this.state.weaponName.toUpperCase()} ]`, this.width - 20, this.height - 56);

        ctx.fillStyle = cyan;
        ctx.font = fLarge;
        ctx.fillText(this.state.ammo, this.width - 20, this.height - 18);

        // --- LEFT SIDE: Health % next to vial (removed per request) ---
        /*
        const hpPct = Math.round((this.state.health / this.state.maxHealth) * 100);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold 18px "Courier New", monospace';
        ctx.fillStyle = hpPct > 60 ? '#00ff66' : (hpPct > 30 ? amber : red);
        ctx.fillText(`${hpPct}%`, this.width * 0.08, this.height * 0.5);

        ctx.font = fLabel;
        ctx.fillStyle = dimCyan;
        ctx.fillText('INTEGRITY', this.width * 0.08, this.height * 0.5 + 16);
        */

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
