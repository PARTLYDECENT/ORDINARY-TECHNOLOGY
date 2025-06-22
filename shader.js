// Enhanced Shader.js - Advanced WebGL Background Animation System
// Wrap everything in an Immediately Invoked Function Expression (IIFE)
// to avoid polluting the global scope unnecessarily, except for `window.updateShader`.
(function() {
    "use strict"; // Enable strict mode

    // --- WebGL Setup and Shader Logic ---
    // --- Enhanced version with 50 phases and advanced effects ---

    const webglCanvas = document.getElementById('webglCanvas');
    let gl = null; // Keep gl scoped within this IIFE
    let shaderProgram = null;
    let positionBuffer = null;
    let uniformLocations = {};

    if (!webglCanvas) {
        console.error("WebGL Canvas element with id 'webglCanvas' not found!");
        return; // Stop script execution if canvas isn't found
    }

    try {
        webglCanvas.width = window.innerWidth;
        webglCanvas.height = window.innerHeight;
        // Try to get webgl2, fall back to webgl1
        gl = webglCanvas.getContext('webgl2') ||
             webglCanvas.getContext('webgl') ||
             webglCanvas.getContext('experimental-webgl');

        if (!gl) {
            throw new Error("WebGL not supported or context creation failed.");
        }

        if (gl instanceof WebGL2RenderingContext) {
            console.log("WebGL2 Context Initialized.");
        } else {
            console.log("WebGL1 Context Initialized. Note: Shader uses GLSL 3.00 ES features.");
        }
    } catch (e) {
        console.error("WebGL Initialization Error:", e);
        // Fallback: Provide a static background color if WebGL fails
        if (document.body) document.body.style.backgroundColor = '#050511';
        return; // Stop script execution
    }

    // --- Enhanced Shader Sources ---
    // Vertex Shader (GLSL 3.00 ES)
    const vertexShaderSource = `#version 300 es
        precision highp float; // Precision needed in VS for GLSL 300 es
        in vec4 a_position;
        void main() {
            gl_Position = a_position; // Pass position through
        }
    `;

    // Fragment Shader (GLSL 3.00 ES - 50 Phases with Advanced Effects)
    const fragmentShaderSource = `#version 300 es
        precision highp float; // Precision qualifier required in fragment shaders

        // Uniforms: Inputs from JavaScript
        uniform float u_time;
        uniform vec2 u_resolution;
        uniform float u_mouse_x;
        uniform float u_mouse_y;
        uniform float u_intensity;

        // Output variable: Replaces gl_FragColor
        out vec4 outColor;

        // --- Enhanced Constants ---
        const float PI = 3.14159265359;
        const float TWO_PI = 6.28318530718;
        const float HALF_PI = 1.57079632679;
        const int FBM_OCTAVES = 6; // Increased for more detail
        const int MAX_RAYMARCH_STEPS = 64; // Increased for better quality
        const float MAX_RAYMARCH_DIST = 15.0;
        const int MANDELBROT_ITER = 60; // Increased iterations
        const float TOTAL_PHASES_F = 50.0; // <<< UPDATED TO 50 PHASES
        const float GOLDEN_RATIO = 1.618033988749;
        const float SQRT2 = 1.414213562373;
        const float SQRT3 = 1.732050807569;

        // --- Enhanced Helper Functions ---
        float rand(vec2 co) { 
            return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453); 
        }
        
        float rand(float n) { 
            return fract(sin(n) * 43758.5453123); 
        }
        
        float hash(float n) { 
            return fract(sin(n) * 43758.5453); 
        }
        
        float hash21(vec2 p) {
            return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
        }
        
        vec2 hash22(vec2 p) {
            p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
            return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
        }
        
        float noise(vec2 p) { 
            vec2 i = floor(p), f = fract(p); 
            f = f * f * (3.0 - 2.0 * f); 
            float n = i.x + i.y * 57.0; 
            return mix(mix(hash(n), hash(n + 1.0), f.x), 
                      mix(hash(n + 57.0), hash(n + 58.0), f.x), f.y); 
        }
        
        float smoothNoise(vec2 p) {
            vec2 i = floor(p);
            vec2 f = fract(p);
            f = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
            float a = hash21(i);
            float b = hash21(i + vec2(1.0, 0.0));
            float c = hash21(i + vec2(0.0, 1.0));
            float d = hash21(i + vec2(1.0, 1.0));
            return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
        }
        
        float fbm(vec2 p) { 
            float s = 0.0, a = 0.7, f = 1.0; 
            for(int i = 0; i < FBM_OCTAVES; i++) { 
                s += noise(p * f) * a; 
                a *= 0.5; 
                f *= 2.0; 
            } 
            return s; 
        }
        
        float ridgedFbm(vec2 p) {
            float s = 0.0, a = 0.7, f = 1.0;
            for(int i = 0; i < FBM_OCTAVES; i++) {
                float n = abs(noise(p * f));
                n = 1.0 - n;
                n = n * n;
                s += n * a;
                a *= 0.5;
                f *= 2.0;
            }
            return s;
        }
        
        float turbulence(vec2 p) {
            float s = 0.0, a = 0.7, f = 1.0;
            for(int i = 0; i < FBM_OCTAVES; i++) {
                s += abs(noise(p * f)) * a;
                a *= 0.5;
                f *= 2.0;
            }
            return s;
        }
        
        // Simplex noise functions
        vec3 mod289(vec3 x) { 
            return x - floor(x * (1.0 / 289.0)) * 289.0; 
        }
        
        vec4 mod289(vec4 x) { 
            return x - floor(x * (1.0 / 289.0)) * 289.0; 
        }
        
        vec4 permute(vec4 x) { 
            return mod289(((x * 34.0) + 1.0) * x); 
        }
        
        vec4 taylorInvSqrt(vec4 r) { 
            return 1.79284291400159 - 0.85373472095314 * r; 
        }
        
        float snoise(vec3 v) { 
            const vec2 C = vec2(1.0/6.0, 1.0/3.0); 
            const vec4 D = vec4(0.0, 0.5, 1.0, 2.0); 
            vec3 i = floor(v + dot(v, C.yyy)); 
            vec3 x0 = v - i + dot(i, C.xxx); 
            vec3 g = step(x0.yzx, x0.xyz); 
            vec3 l = 1.0 - g; 
            vec3 i1 = min(g.xyz, l.zxy); 
            vec3 i2 = max(g.xyz, l.zxy); 
            vec3 x1 = x0 - i1 + C.xxx; 
            vec3 x2 = x0 - i2 + C.yyy; 
            vec3 x3 = x0 - D.yyy; 
            i = mod289(i); 
            vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0)); 
            float n_ = 1.0/7.0; 
            vec3 ns = n_ * D.wyz - D.xzx; 
            vec4 j = p - 49.0 * floor(p * ns.z * ns.z); 
            vec4 x_ = floor(j * ns.z); 
            vec4 y_ = floor(j - 7.0 * x_); 
            vec4 x = x_ * ns.x + ns.yyyy; 
            vec4 y = y_ * ns.x + ns.yyyy; 
            vec4 h = 1.0 - abs(x) - abs(y); 
            vec4 b0 = vec4(x.xy, y.xy); 
            vec4 b1 = vec4(x.zw, y.zw); 
            vec4 s0 = floor(b0) * 2.0 + 1.0; 
            vec4 s1 = floor(b1) * 2.0 + 1.0; 
            vec4 sh = -step(h, vec4(0.0)); 
            vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy; 
            vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww; 
            vec3 p0 = vec3(a0.xy, h.x); 
            vec3 p1 = vec3(a0.zw, h.y); 
            vec3 p2 = vec3(a1.xy, h.z); 
            vec3 p3 = vec3(a1.zw, h.w); 
            vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3))); 
            p0 *= norm.x; 
            p1 *= norm.y; 
            p2 *= norm.z; 
            p3 *= norm.w; 
            vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0); 
            m = m * m; 
            return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3))); 
        }
        
        float snoise(vec2 v) { 
            return snoise(vec3(v, 0.0)); 
        }
        
        // Enhanced rotation and transformation functions
        mat2 rotate2D(float a) { 
            return mat2(cos(a), -sin(a), sin(a), cos(a)); 
        }
        
        mat3 rotateX(float a) {
            float c = cos(a), s = sin(a);
            return mat3(1.0, 0.0, 0.0, 0.0, c, -s, 0.0, s, c);
        }
        
        mat3 rotateY(float a) {
            float c = cos(a), s = sin(a);
            return mat3(c, 0.0, s, 0.0, 1.0, 0.0, -s, 0.0, c);
        }
        
        mat3 rotateZ(float a) {
            float c = cos(a), s = sin(a);
            return mat3(c, -s, 0.0, s, c, 0.0, 0.0, 0.0, 1.0);
        }
        
        // Enhanced pattern functions
        float worley(vec2 p) { 
            float md = 10.0; 
            vec2 g = floor(p); 
            for(int x = -1; x <= 1; x++) { 
                for(int y = -1; y <= 1; y++) { 
                    vec2 n = g + vec2(float(x), float(y)); 
                    vec2 pt = vec2(rand(n), rand(n + vec2(7.3, 3.7))); 
                    pt = 0.5 + 0.5 * sin(u_time * 0.3 + TWO_PI * pt); 
                    vec2 fp = n + pt; 
                    md = min(md, length(p - fp)); 
                } 
            } 
            return md; 
        }
        
        float worleyF2MinusF1(vec2 p) {
            float f1 = 10.0, f2 = 10.0;
            vec2 g = floor(p);
            for(int x = -1; x <= 1; x++) {
                for(int y = -1; y <= 1; y++) {
                    vec2 n = g + vec2(float(x), float(y));
                    vec2 pt = vec2(rand(n), rand(n + vec2(7.3, 3.7)));
                    pt = 0.5 + 0.5 * sin(u_time * 0.3 + TWO_PI * pt);
                    vec2 fp = n + pt;
                    float d = length(p - fp);
                    if(d < f1) {
                        f2 = f1;
                        f1 = d;
                    } else if(d < f2) {
                        f2 = d;
                    }
                }
            }
            return f2 - f1;
        }
        
        float truchetPattern(vec2 uv, float s) { 
            uv *= s; 
            vec2 ip = floor(uv), fp = fract(uv); 
            float r = rand(ip), t = floor(r * 2.0), d; 
            if(t == 0.0) {
                d = abs(fp.x + fp.y - 1.0) / sqrt(2.0);
            } else {
                d = abs(fp.x - fp.y) / sqrt(2.0);
            } 
            return smoothstep(0.04, 0.06, abs(d - 0.5)); 
        }
        
        float hexPattern(vec2 uv, float scale) {
            uv *= scale;
            vec2 r = vec2(1.0, SQRT3);
            vec2 h = r * 0.5;
            vec2 a = mod(uv, r) - h;
            vec2 b = mod(uv - h, r) - h;
            vec2 gv = length(a) < length(b) ? a : b;
            return length(gv);
        }
        
        float trianglePattern(vec2 uv, float scale) {
            uv *= scale;
            uv.y *= SQRT3;
            vec2 grid = abs(fract(uv) - 0.5);
            return min(grid.x, grid.y);
        }
        
        // Distance functions for raymarching
        float sdSphere(vec3 p, float s) { 
            return length(p) - s; 
        }
        
        float sdBox(vec3 p, vec3 b) {
            vec3 q = abs(p) - b;
            return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
        }
        
        float sdTorus(vec3 p, vec2 t) {
            vec2 q = vec2(length(p.xz) - t.x, p.y);
            return length(q) - t.y;
        }
        
        float sdCylinder(vec3 p, float h, float r) {
            vec2 d = abs(vec2(length(p.xz), p.y)) - vec2(r, h);
            return min(max(d.x, d.y), 0.0) + length(max(d, 0.0));
        }
        
        float sdPlane(vec3 p, vec3 n, float h) { 
            return dot(p, n) + h; 
        }
        
        float opUnion(float d1, float d2) {
            return min(d1, d2);
        }
        
        float opSubtraction(float d1, float d2) {
            return max(-d1, d2);
        }
        
        float opIntersection(float d1, float d2) {
            return max(d1, d2);
        }
        
        float opSmoothUnion(float d1, float d2, float k) {
            float h = clamp(0.5 + 0.5 * (d2 - d1) / k, 0.0, 1.0);
            return mix(d2, d1, h) - k * h * (1.0 - h);
        }
        
        // Enhanced color palette
        vec3 colPrimary = vec3(106.0/255.0, 0.0, 1.0); // Purple/Blue
        vec3 colSecondary = vec3(0.0, 1.0, 204.0/255.0); // Cyan
        vec3 colTertiary = vec3(0.0, 184.0/255.0, 212.0/255.0); // Turquoise
        vec3 colGreen = vec3(0.1, 0.8, 0.4); // Vibrant Green
        vec3 colGold = vec3(0.9, 0.7, 0.1); // Gold/Yellow
        vec3 colStrangeGreen = vec3(0.1, 0.4, 0.2); // Darker Green
        vec3 colDeepRed = vec3(0.6, 0.0, 0.15); // Maroon
        vec3 colWhite = vec3(1.0); // White
        vec3 colOrange = vec3(1.0, 0.5, 0.0); // Orange
        vec3 colPink = vec3(1.0, 0.4, 0.7); // Pink
        vec3 colSkyBlue = vec3(0.5, 0.7, 1.0); // Light Blue
        vec3 colLimeGreen = vec3(0.7, 1.0, 0.0); // Lime Green
        vec3 colDarkGrey = vec3(0.2, 0.2, 0.2); // Dark Grey
        vec3 colElectricBlue = vec3(0.2, 0.6, 1.0); // Electric Blue
        vec3 colSoftPurple = vec3(0.6, 0.4, 0.8); // Soft Purple
        
        // New enhanced colors
        vec3 colNeonGreen = vec3(0.0, 1.0, 0.0); // Neon Green
        vec3 colMagenta = vec3(1.0, 0.0, 1.0); // Magenta
        vec3 colYellow = vec3(1.0, 1.0, 0.0); // Yellow
        vec3 colCrimson = vec3(0.86, 0.08, 0.24); // Crimson
        vec3 colIndigo = vec3(0.29, 0.0, 0.51); // Indigo
        vec3 colTeal = vec3(0.0, 0.5, 0.5); // Teal
        vec3 colCoral = vec3(1.0, 0.5, 0.31); // Coral
        vec3 colLavender = vec3(0.9, 0.9, 0.98); // Lavender
        vec3 colMint = vec3(0.6, 1.0, 0.6); // Mint
        vec3 colRose = vec3(1.0, 0.0, 0.5); // Rose
        vec3 colAqua = vec3(0.0, 1.0, 1.0); // Aqua
        vec3 colViolet = vec3(0.93, 0.51, 0.93); // Violet
        vec3 colChartreuse = vec3(0.5, 1.0, 0.0); // Chartreuse
        vec3 colSalmon = vec3(1.0, 0.63, 0.48); // Salmon
        vec3 colTurquoise = vec3(0.25, 0.88, 0.82); // Turquoise
        
        vec3 colBackground = vec3(5.0/255.0, 5.0/255.0, 17.0/255.0); // Dark Background
        
        // Enhanced color functions
        vec3 getColorForCA(vec2 uv, float t) { 
            float n = fbm(uv * 4.0 + t * 0.15); 
            return mix(colPrimary, colTertiary, n); 
        }
        
        vec3 hue2rgb(float h) {
            h = fract(h);
            return clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
        }
        
        vec3 hsv2rgb(vec3 c) {
            vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
            vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
            return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
        }
        
        vec3 rgb2hsv(vec3 c) {
            vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
            vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
            vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
            float d = q.x - min(q.w, q.y);
            float e = 1.0e-10;
            return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
        }
        
        // Enhanced lighting functions
        vec3 calculateNormal(vec3 p, float(*sdf)(vec3)) {
            const vec2 eps = vec2(0.001, 0.0);
            return normalize(vec3(
                sdf(p + eps.xyy) - sdf(p - eps.xyy),
                sdf(p + eps.yxy) - sdf(p - eps.yxy),
                sdf(p + eps.yyx) - sdf(p - eps.yyx)
            ));
        }
        
        float calculateAO(vec3 p, vec3 n, float(*sdf)(vec3)) {
            float ao = 0.0;
            float sca = 1.0;
            for(int i = 0; i < 5; i++) {
                float h = 0.01 + 0.12 * float(i) / 4.0;
                float d = sdf(p + h * n);
                ao += -(d - h) * sca;
                sca *= 0.95;
            }
            return clamp(1.0 - 3.0 * ao, 0.0, 1.0);
        }
        
        // --- Main Shader Logic ---
        void main() {
            // Normalized device coordinates, aspect corrected, origin center
            vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / min(u_resolution.y, u_resolution.x);
            // Original UV coordinates (0 to 1)
            vec2 originalUV = gl_FragCoord.xy / u_resolution.xy;
            
            // Mouse interaction
            vec2 mouse = vec2(u_mouse_x, u_mouse_y);
            
            float time_warp = u_time * 0.08; // Slightly slower phase transitions
            float phase = mod(time_warp, TOTAL_PHASES_F);
            float phaseProgress = fract(phase); // Progress within current phase
            int phaseIndex = int(floor(phase)); // Current phase index (0-49)
            
            vec3 color = colBackground; // Start with background
            
            // --- Enhanced Phase Implementations ---
            
            // Phase 0: Enhanced Perspective Grid with Depth
            if (phaseIndex == 0) {
                float wf = 0.1 + 0.05 * sin(u_time * 0.2);
                wf = max(0.001, wf);
                float z = 0.1 / max(0.01, 0.1 - uv.y * wf + 0.02 * fbm(uv + u_time * 0.05));
                z = clamp(z, 0.1, 15.0);
                vec2 warp = uv * z;
                vec2 grid = abs(fract(warp * vec2(5.0, 3.0) + u_time * 0.1) - 0.5);
                float line = smoothstep(0.04, 0.05, min(grid.x, grid.y)) * 0.6;
                float df = fract(z * 0.1 + u_time * 0.15);
                vec3 bc = mix(mix(colPrimary, colTertiary, sin(u_time * 0.1) * 0.5 + 0.5), 
                             colSecondary, sin(length(warp) * 0.5 - u_time * 0.5) * 0.5 + 0.5);
                color = mix(bc * 0.15, bc, line * df * 1.5);
                // Add depth fog
                color *= 1.0 - smoothstep(5.0, 15.0, z);
            }
            
            // Phase 1: Enhanced Ripple Effect with Multiple Frequencies
            else if (phaseIndex == 1) {
                float d = length(uv);
                float r1 = sin(d * 18.0 - u_time * 2.5) * 0.5 + 0.5;
                float r2 = sin(d * 35.0 - u_time * 4.0) * 0.3 + 0.3;
                float r = r1 * r2;
                r *= smoothstep(1.8, 0.4, d);
                float w = sin(uv.y * 25.0 + u_time * 1.2) * 0.04;
                vec2 wu = uv + vec2(w, sin(uv.x * 15.0 + u_time * 0.8) * 0.03);
                float n = fbm(wu * 3.5 + u_time * 0.25);
                vec3 bc = mix(mix(colSecondary, colTertiary, r), 
                             mix(colGreen, colGold, n), 0.5 + 0.5 * sin(u_time * 0.6 + d * 2.0));
                color = mix(bc * 0.2, bc, r * 0.8 + n * 0.6);
                // Add chromatic aberration
                float ca = 0.01 * sin(u_time * 2.0);
                color.r = mix(bc * 0.2, bc, (r + ca) * 0.8 + n * 0.6).r;
                color.b = mix(bc * 0.2, bc, (r - ca) * 0.8 + n * 0.6).b;
            }
            
            // Phase 2: Enhanced Hexagonal Grid with Glow
            else if (phaseIndex == 2) {
                float hexDist = hexPattern(uv, 8.0 + 4.0 * sin(u_time * 0.3));
                float hexEdge = smoothstep(0.4, 0.45, hexDist);
                float hexGlow = exp(-hexDist * 10.0);
                float pulse = sin(u_time * 3.5) * 0.5 + 0.5;
                float ds = fbm(uv * 2.5 + vec2(u_time * 0.15, 0.0));
                vec3 baseC = mix(colTertiary, colNeonGreen, ds);
                vec3 glowC = mix(colSecondary, colPrimary, pulse);
                color = mix(baseC * 0.1, glowC, hexEdge * pulse * 1.5);
                color += glowC * hexGlow * 0.3;
                // Add scanlines
                float scanline = sin(originalUV.y * u_resolution.y * 0.5) * 0.04;
                color += scanline * glowC;
            }
            
            // Phase 3: Enhanced Spiral Galaxy
            else if (phaseIndex == 3) {
                float a = atan(uv.y, uv.x);
                float rd = length(uv);
                a += 0.1 * fbm(uv * 0.5 + u_time * 0.05);
                float sa = a * 6.0 + rd * 8.0 - u_time * 2.2;
                float s = smoothstep(-0.2, 0.2, sin(sa));
                float rdd = rd + sin(a * 10.0 + u_time * 0.3) * 0.08;
                float b = fract(rdd * 6.0 - u_time * 0.6);
                b = smoothstep(0.0, 0.1, b) * smoothstep(0.8, 0.5, b);
                float t = fbm(vec2(rdd * 6.0, a * 3.0) + u_time * 0.15);
                vec3 dc = mix(colPrimary, colDeepRed, sin(rdd * 12.0) * 0.5 + 0.5);
                vec3 bc = mix(colGold, colSecondary, cos(a * 4.0) * 0.5 + 0.5);
                color = mix(dc * 0.5, bc, b + t * 0.4);
                color += bc * s * 0.3;
                // Add stellar dust
                float dust = turbulence(uv * 20.0 + u_time * 0.1) * 0.1;
                color += colWhite * dust * smoothstep(0.5, 1.5, rd);
            }
            
            // Phase 4: Enhanced Cellular Automata
            else if (phaseIndex == 4) {
                vec2 cu = uv * mix(3.0, 5.0, phaseProgress);
                float n = fbm(cu + u_time * 0.2);
                float c = 0.0;
                for(float x = -1.0; x <= 1.0; x += 1.0) {
                    for(float y = -1.0; y <= 1.0; y += 1.0) {
                        vec2 nb = vec2(x, y);
                        vec2 cc = floor(cu) + nb;
                        vec2 pt = cc + 0.5 + sin(u_time * 0.1 + cc) * 0.3;
                        c += smoothstep(0.4, 0.38, length(cu - pt));
                    }
                }
                c = clamp(c, 0.0, 1.0);
                vec3 cellC = mix(colStrangeGreen, colPrimary, n);
                cellC = mix(cellC, colDeepRed, smoothstep(0.6, 0.8, n));
                color = mix(colBackground * 0.5, cellC, c * 1.2);
                color += fbm(uv * 15.0 + u_time * 0.5) * 0.05;
                // Add cell borders
                vec2 cellBorder = abs(fract(cu) - 0.5);
                float border = smoothstep(0.02, 0.03, min(cellBorder.x, cellBorder.y));
                color = mix(colWhite * 0.5, color, border);
            }
            
            // Phase 5: Enhanced Digital Glitch
            else if (phaseIndex == 5) {
                float t = phaseProgress;
                vec2 bu = floor(originalUV * mix(20.0, 60.0, sin(u_time * 2.0) * 0.5 + 0.5)) / 
                         mix(20.0, 60.0, sin(u_time * 2.0) * 0.5 + 0.5);
                float bn = fbm(bu * 5.0 + u_time * 0.5);
                color = mix(colPrimary, colSecondary, bn);
                float tl = sin(originalUV.y * 10.0 + u_time * 5.0) * 0.5 + 0.5;
                float ta = smoothstep(0.8, 0.85, tl);
                float ofs = ta * (rand(vec2(floor(u_time * 2.0), floor(originalUV.y * 10.0))) - 0.5) * 0.1;
                vec2 tu = uv + vec2(ofs * t, 0.0);
                float tn = fbm(tu * 4.0 + u_time * 0.3);
                color = mix(color, mix(colTertiary, colDeepRed, tn), ta);
                float cao = (0.005 + 0.01 * abs(sin(u_time * 3.0))) * t;
                vec3 cR = getColorForCA(uv + vec2(cao, 0.0), u_time);
                vec3 cB = getColorForCA(uv - vec2(cao * 0.5, cao * 0.8), u_time);
                color = vec3(cR.r, color.g, cB.b);
                color += (rand(originalUV + fract(u_time * 10.0)) - 0.5) * 0.15 * t;
                // Add digital artifacts
                if(rand(vec2(floor(u_time * 30.0), floor(originalUV.y * 100.0))) > 0.95) {
                    color = mix(color, colMagenta, 0.8);
                }
            }
            
            // Phase 6: Enhanced Plasma Field
            else if (phaseIndex == 6) {
                vec2 p = uv * 2.0;
                float i = fbm(p + u_time * 0.3);
                float r = abs(snoise(vec3(p * 1.5, u_time * 0.5)));
                r = pow(1.0 - r, 4.0);
                vec3 fc = mix(colPrimary, colTertiary, smoothstep(0.0, 1.0, i));
                color = mix(colBackground * 0.4, fc, r * 1.5);
                color *= 1.0 - smoothstep(0.8, 1.5, length(uv));
                // Add plasma tendrils
                float tendril = ridgedFbm(p * 3.0 + u_time * 0.2);
                color += colElectricBlue * tendril * 0.3;
            }
            
            // Phase 7: Enhanced Voronoi Cells
            else if (phaseIndex == 7) {
                vec2 p = uv * 3.0 + vec2(u_time * 0.1, u_time * 0.2);
                float d = worley(p);
                float d2 = worleyF2MinusF1(p);
                float e = 1.0 - smoothstep(0.0, 0.05, d);
                float c = smoothstep(0.0, 0.4, d);
                vec3 cc = mix(colStrangeGreen, colGold, c * 1.2);
                color = mix(cc * 0.3, colWhite, e);
                // Add cell structure
                color += colTeal * d2 * 0.5;
            }
            
            // Phase 8: Enhanced Polar Transformation
            else if (phaseIndex == 8) {
                vec2 p = rotate2D(u_time * 0.4) * uv;
                float a = atan(p.y, p.x);
                float rd = length(p);
                float t = fbm(vec2(1.0 / (rd + 0.1), a * 2.0) + u_time * 0.2);
                float r = sin(rd * 20.0 - u_time * 3.0) * 0.5 + 0.5;
                vec3 tc = mix(colSecondary, colPink, smoothstep(0.0, 1.0, t));
                color = tc * (smoothstep(0.0, 0.8, t) + r * 0.5) * 0.8;
                // Add radial lines
                float radialLines = smoothstep(0.98, 1.0, abs(sin(a * 12.0)));
                color += colWhite * radialLines * 0.3;
            }
            
            // Phase 9: Enhanced Truchet Tiles
            else if (phaseIndex == 9) {
                float s = mix(4.0, 8.0, sin(u_time * 0.5) * 0.5 + 0.5);
                float p = truchetPattern(uv, s);
                vec2 us = uv * s;
                float bn = noise(floor(us) + u_time * 0.1);
                vec3 tc = mix(colPrimary, colTertiary, bn);
                color = mix(tc * 0.2, colWhite * 0.9, p);
                // Add tile variations
                float tileVar = trianglePattern(uv, s * 0.5);
                color += colCoral * tileVar * 0.2;
            }
            
            // Phase 10: Enhanced Interference Pattern
            else if (phaseIndex == 10) {
                float v = sin(uv.x * 3.0 + u_time * 0.8) + 
                         sin(uv.y * 4.0 - u_time * 0.5 + sin(uv.x * 3.0 + u_time * 0.8) * 0.5) + 
                         sin(uv.x * uv.y * 2.0 + u_time) + 
                         sin(sqrt(pow(uv.x + 0.5 * sin(u_time / 5.0), 2.0) + 
                                 pow(uv.y + 0.5 * cos(u_time / 3.0), 2.0)) * 5.0 + u_time);
                v *= 0.5;
                vec3 pc1 = mix(colDeepRed, colOrange, sin(u_time * 0.2) * 0.5 + 0.5);
                vec3 pc2 = mix(colPrimary, colSecondary, cos(u_time * 0.3) * 0.5 + 0.5);
                color = mix(pc1, pc2, smoothstep(-0.8, 0.8, v));
                // Add harmonic overtones
                float harmonic = sin(uv.x * 6.0 + u_time * 1.6) * sin(uv.y * 8.0 - u_time * 1.0) * 0.1;
                color += colYellow * harmonic;
            }
            
            // Phase 11: Enhanced Matrix Rain
            else if (phaseIndex == 11) {
                vec2 gu = originalUV * vec2(80.0, 60.0);
                vec2 c = floor(gu);
                float sp = rand(c.x) * 3.0 + 1.0;
                float ss = rand(c.x) * 10.0;
                float sps = fract(ss - u_time * sp * 0.1);
                float cy = originalUV.y;
                float tl = 0.15 + rand(c.x) * 0.1;
                float ci = smoothstep(sps, sps + 0.01, cy) * (1.0 - smoothstep(sps + 0.01, sps + tl, cy));
                float cv = rand(c + floor((ss - u_time * sp * 0.1) * 10.0));
                vec3 rc = mix(colStrangeGreen * 0.5, colGreen * 1.5, step(0.5, cv));
                color = mix(colBackground, rc, ci);
                // Add leading character glow
                float leadGlow = smoothstep(sps - 0.02, sps, cy) * smoothstep(sps + 0.02, sps, cy);
                color += colNeonGreen * leadGlow * 2.0;
            }
            
            // Phase 12: Enhanced Mandelbrot Zoom
            else if (phaseIndex == 12) {
                float z = 0.5 + pow(mod(u_time * 0.05, 5.0) + 1.0, 2.0);
                vec2 c = uv * 1.5 / z - vec2(0.7, 0.0);
                vec2 zz = vec2(0.0);
                int it = 0;
                for(int i = 0; i < MANDELBROT_ITER; i++) {
                    zz = vec2(zz.x * zz.x - zz.y * zz.y, 2.0 * zz.x * zz.y) + c;
                    if(dot(zz, zz) > 4.0) break;
                    it++;
                }
                float m = clamp(float(it) / float(MANDELBROT_ITER), 0.0, 1.0);
                m = pow(m, 0.5);
                color = mix(colBackground, mix(colPrimary, colGold, m), smoothstep(0.0, 0.1, m));
                if(it == MANDELBROT_ITER) color = colBackground * 0.5;
                // Add escape time coloring
                if(it < MANDELBROT_ITER) {
                    float smooth_it = float(it) + 1.0 - log2(log2(dot(zz, zz)));
                    vec3 escapeColor = hsv2rgb(vec3(smooth_it * 0.1, 0.8, 1.0));
                    color = mix(color, escapeColor, 0.7);
                }
            }
            
            // Phase 13: Enhanced Distorted Grid
            else if (phaseIndex == 13) {
                vec2 d = vec2(snoise(vec3(uv * 2.0, u_time * 0.3)), 
                             snoise(vec3(uv * 2.0 + 10.0, u_time * 0.35))) * 0.15;
                vec2 du = uv + d;
                vec2 g = abs(fract(du * 6.0) - 0.5);
                float l = smoothstep(0.03, 0.04, min(g.x, g.y));
                float n = fbm(du * 3.0 + u_time * 0.1);
                vec3 gc = mix(colTertiary, colPink, n);
                color = mix(colBackground * 0.5, gc, l * 1.2);
                // Add distortion visualization
                float distVis = length(d) * 10.0;
                color += colIndigo * distVis;
            }
            
            // Phase 14: Enhanced Terrain Lighting
            else if (phaseIndex == 14) {
                float h = snoise(vec3(uv * 1.5, u_time * 0.2));
                float f = snoise(vec3(uv * 3.0 + h * 0.3, u_time * 0.4));
                float la = 0.785;
                float l = clamp(0.5 + h * 0.5 * cos(atan(uv.y, uv.x) - la), 0.2, 1.0);
                vec3 tc = mix(colGreen * 0.8, colGold * 0.6, h * 0.5 + 0.5);
                vec3 wc = mix(colPrimary * 0.7, colTertiary * 0.9, f * 0.5 + 0.5);
                color = mix(wc, tc * l, smoothstep(-0.1, 0.1, h)) * 0.8;
                // Add atmospheric perspective
                float atmosphere = smoothstep(-0.5, 0.5, h);
                color = mix(color, colSkyBlue * 0.3, atmosphere * 0.2);
            }
            
            // Phase 15: Enhanced Fractal Iteration
            else if (phaseIndex == 15) {
                vec2 p = abs(uv) * 0.8;
                float s = 1.5 + 0.5 * sin(u_time * 0.4);
                for(int i = 0; i < 4; i++) {
                    p = abs(p * s - 1.0);
                    if(dot(p, p) > 20.0) break;
                }
                float r = sin(length(p) * 0.2 * 10.0 + u_time);
                color = mix(colSecondary, colPrimary, smoothstep(-0.5, 0.5, r));
                // Add iteration coloring
                float iterColor = length(p) * 0.1;
                color += hsv2rgb(vec3(iterColor, 0.7, 0.5)) * 0.3;
            }
            
            // Phase 16: Enhanced Multi-layer Voronoi
            else if (phaseIndex == 16) {
                vec2 p = uv * 2.5;
                float d1 = worley(p);
                float d2 = worley(p + vec2(5.2, 1.3));
                float c = pow(1.0 - smoothstep(0.0, 0.1, d1), 2.0) + 
                         pow(1.0 - smoothstep(0.0, 0.05, d2), 2.0) * 0.5;
                c = clamp(c, 0.0, 1.0);
                float g = fbm(p * 10.0 + u_time * 0.1);
                vec3 cc = mix(colWhite * 0.8, colTertiary, g);
                color = mix(colBackground * 0.8, cc, c);
                // Add secondary pattern
                float d3 = worley(p * 0.5 + u_time * 0.05);
                color += colCrimson * (1.0 - d3) * 0.2;
            }
            
            // Phase 17: Enhanced Scanline Interference
            else if (phaseIndex == 17) {
                float i = 0.5 + 0.5 * noise(vec2(u_time * 1.5, originalUV.y * 5.0));
                float fs = floor(u_time * 15.0) + floor(originalUV.y * 10.0);
                float f = rand(fs);
                i *= smoothstep(0.2, 0.8, f);
                vec3 bc = mix(colPrimary, colSecondary, noise(uv * 3.0 + u_time * 0.2));
                float sy = fract(originalUV.y * u_resolution.y * 0.5);
                float se = smoothstep(0.4, 0.5, sy) * (1.0 - smoothstep(0.5, 0.6, sy));
                color = mix(bc * 0.5, vec3(0.0), se * i * 1.5);
                color += (rand(originalUV + u_time) - 0.5) * 0.1 * i;
                // Add horizontal sync issues
                float hsync = step(0.98, rand(vec2(floor(u_time * 60.0), floor(originalUV.y * 200.0))));
                color = mix(color, colMagenta, hsync * 0.5);
            }
            
            // Phase 18: Enhanced 3D Raymarching Scene
            else if (phaseIndex == 18) {
                vec3 ro = vec3(0.0, 0.0, -3.0 + sin(u_time * 0.3));
                vec3 rd = normalize(vec3(uv, 1.0));
                vec3 col = colBackground;
                float t = 0.0;
                
                for(int i = 0; i < MAX_RAYMARCH_STEPS; i++) {
                    vec3 p = ro + rd * t;
                    vec3 sc = vec3(0.0, sin(u_time * 0.8) * 0.5 - 0.2, 0.0);
                    float ds = sdSphere(p - sc, 0.5);
                    float dt = sdTorus(p - vec3(1.0, 0.0, 0.0), vec2(0.8, 0.2));
                    float db = sdBox(p - vec3(-1.0, 0.0, 0.0), vec3(0.3));
                    float dp = sdPlane(p, vec3(0.0, 1.0, 0.0), 1.0);
                    
                    float d = opUnion(opUnion(opUnion(ds, dt), db), dp);
                    
                    if(d < 0.001 * t) {
                        vec3 hc, n;
                        if(dp < min(min(ds, dt), db)) {
                            hc = colGreen * 0.8;
                            n = vec3(0.0, 1.0, 0.0);
                        } else if(ds < min(dt, db)) {
                            hc = colPrimary;
                            vec2 eps = vec2(0.001, 0.0);
                            n = normalize(vec3(
                                sdSphere(p + eps.xyy - sc, 0.5) - sdSphere(p - eps.xyy - sc, 0.5),
                                sdSphere(p + eps.yxy - sc, 0.5) - sdSphere(p - eps.yxy - sc, 0.5),
                                sdSphere(p + eps.yyx - sc, 0.5) - sdSphere(p - eps.yyx - sc, 0.5)
                            ));
                        } else if(dt < db) {
                            hc = colGold;
                            n = vec3(0.0, 1.0, 0.0); // Simplified normal
                        } else {
                            hc = colCoral;
                            n = vec3(0.0, 1.0, 0.0); // Simplified normal
                        }
                        
                        float l = max(0.2, dot(n, normalize(vec3(-0.7, 0.7, -0.5))));
                        col = hc * l;
                        break;
                    }
                    t += d;
                    if(t > MAX_RAYMARCH_DIST) break;
                }
                color = col;
            }
            
            // Phase 19: Enhanced Particle System
            else if (phaseIndex == 19) {
                float rd = length(uv);
                float s = 0.0;
                for(float i = 0.0; i < 15.0; i++) {
                    float seed = i * 13.37;
                    float st = u_time * (0.5 + rand(seed)) * 1.5 + rand(seed + 1.0) * 10.0;
                    float sd = fract(st) * 3.0;
                    float sa = rand(seed + 2.0) * TWO_PI + u_time * rand(seed + 3.0) * 0.05;
                    vec2 sp = vec2(cos(sa), sin(sa)) * sd;
                    float ds = length(uv - sp);
                    float sl = 0.02 + sd * 0.1;
                    float si = smoothstep(sl, 0.0, ds) * (1.0 - smoothstep(1.0, 1.5, sd));
                    s += si;
                }
                vec3 sc = mix(colWhite, colSecondary, clamp(rd * 0.5, 0.0, 1.0));
                color = mix(colBackground, sc, clamp(s, 0.0, 1.0));
                // Add particle trails
                for(float i = 0.0; i < 5.0; i++) {
                    float seed = i * 7.13;
                    float st = u_time * (0.3 + rand(seed)) * 1.0 + rand(seed + 1.0) * 5.0;
                    float sd = fract(st) * 2.0;
                    float sa = rand(seed + 2.0) * TWO_PI + u_time * rand(seed + 3.0) * 0.03;
                    vec2 sp = vec2(cos(sa), sin(sa)) * sd;
                    vec2 trail = sp - vec2(cos(sa), sin(sa)) * (sd - 0.1);
                    float trailDist = length(uv - trail);
                    float trailIntensity = smoothstep(0.05, 0.0, trailDist) * 0.3;
                    color += colElectricBlue * trailIntensity;
                }
            }
            
            // Phase 20: Pulsing Grid with Dynamic Scale
            else if (phaseIndex == 20) {
                vec2 gv = abs(fract(uv * (10.0 + 5.0 * sin(u_time * 0.5))) - 0.5);
                float gridLine = smoothstep(0.02, 0.03, min(gv.x, gv.y));
                vec3 gridColor = mix(colTertiary, colElectricBlue, sin(u_time * 0.8) * 0.5 + 0.5);
                color = mix(colBackground, gridColor, gridLine * 1.5);
                // Add pulse effect
                float pulse = sin(u_time * 2.0) * 0.5 + 0.5;
                color *= 0.5 + pulse * 0.5;
            }
            
            // Phase 21: Radial Noise with Color Cycling
            else if (phaseIndex == 21) {
                float rd = length(uv);
                float n = fbm(uv * 5.0 + u_time * 0.2);
                vec3 noiseColor = mix(colPrimary, colSoftPurple, n);
                color = mix(colBackground, noiseColor, smoothstep(0.0, 1.0, rd * 0.8) * (n * 0.5 + 0.5));
                // Add radial gradient
                float radial = 1.0 - smoothstep(0.0, 1.5, rd);
                color *= radial;
            }
            
            // Phase 22: Circular Wave Interference
            else if (phaseIndex == 22) {
                float wave1 = sin(length(uv) * 20.0 - u_time * 4.0) * 0.5 + 0.5;
                float wave2 = sin(length(uv - vec2(0.3, 0.0)) * 15.0 - u_time * 3.0) * 0.5 + 0.5;
                float wave = wave1 * wave2;
                vec3 waveColor = mix(colSecondary, colLimeGreen, wave);
                color = mix(colBackground, waveColor, smoothstep(0.0, 0.8, wave));
            }
            
            // Phase 23: Animated Horizontal Bars
            else if (phaseIndex == 23) {
                float bars = sin(uv.y * 20.0 + u_time * 3.0) * 0.5 + 0.5;
                vec3 barColor = mix(colPrimary, colTertiary, bars);
                color = mix(colBackground, barColor, smoothstep(0.3, 0.7, bars));
                // Add bar movement
                float movement = sin(u_time * 1.5) * 0.1;
                bars = sin((uv.y + movement) * 20.0 + u_time * 3.0) * 0.5 + 0.5;
                color += colYellow * bars * 0.2;
            }
            
            // Phase 24: Diagonal Streaming Lines
            else if (phaseIndex == 24) {
                vec2 d_uv = uv;
                d_uv.x += d_uv.y * 0.5 + u_time * 0.2;
                float lines = fract(d_uv.x * 8.0) * 2.0 - 1.0;
                lines = smoothstep(0.9, 1.0, abs(lines));
                vec3 lineColor = mix(colGold, colOrange, sin(u_time * 0.7) * 0.5 + 0.5);
                color = mix(colBackground, lineColor, lines);
                // Add secondary diagonal
                d_uv.x -= d_uv.y * 0.3 + u_time * 0.15;
                float lines2 = fract(d_uv.x * 12.0) * 2.0 - 1.0;
                lines2 = smoothstep(0.95, 1.0, abs(lines2));
                color += colCrimson * lines2 * 0.3;
            }
            
            // Phase 25: Static Gradient Test
            else if (phaseIndex == 25) {
                // ordinary - A simple static gradient for testing
                color = mix(colBackground, colDarkGrey, length(uv) * 0.5);
                // Add some subtle animation
                float subtle = sin(u_time * 0.1) * 0.1 + 0.9;
                color *= subtle;
            }
            
            // Phase 26: Dynamic Cellular Automata
            else if (phaseIndex == 26) {
                float cellScale = mix(15.0, 30.0, sin(u_time * 0.4) * 0.5 + 0.5);
                vec2 cu = floor(originalUV * cellScale) / cellScale;
                float cellState = rand(cu + floor(u_time * 5.0));
                vec3 cellColor = mix(colPrimary, colTertiary, cellState);
                color = mix(colBackground * 0.8, cellColor, smoothstep(0.3, 0.7, cellState));
                // Add neighbor influence
                float neighbors = 0.0;
                for(float x = -1.0; x <= 1.0; x++) {
                    for(float y = -1.0; y <= 1.0; y++) {
                        if(x == 0.0 && y == 0.0) continue;
                        vec2 neighborPos = cu + vec2(x, y) / cellScale;
                        neighbors += rand(neighborPos + floor(u_time * 5.0));
                    }
                }
                neighbors /= 8.0;
                color = mix(color, colNeonGreen, neighbors * 0.2);
            }
            
            // Phase 27: Swirling Noise Vortex
            else if (phaseIndex == 27) {
                vec2 p = rotate2D(u_time * 0.5) * uv * (2.0 + 1.0 * cos(u_time * 0.3));
                float n = snoise(vec3(p, u_time * 0.1));
                vec3 noiseColor = mix(colDeepRed, colOrange, smoothstep(-0.5, 0.5, n));
                color = mix(colBackground * 0.7, noiseColor, (n * 0.5 + 0.5) * 1.2);
                // Add vortex center
                float vortexDist = length(uv);
                float vortex = 1.0 / (vortexDist * 10.0 + 1.0);
                color += colWhite * vortex * 0.5;
            }
            
            // Phase 28: Concentric Pulsating Circles
            else if (phaseIndex == 28) {
                float rd = length(uv);
                float pulse = sin((rd - u_time * 0.6) * 15.0) * 0.5 + 0.5;
                pulse = smoothstep(0.8, 1.0, pulse);
                vec3 circleColor = mix(colWhite, colSkyBlue, sin(u_time * 1.0) * 0.5 + 0.5);
                color = mix(colBackground, circleColor, pulse);
                // Add multiple frequencies
                float pulse2 = sin((rd - u_time * 0.4) * 25.0) * 0.3 + 0.3;
                pulse2 = smoothstep(0.9, 1.0, pulse2);
                color += colAqua * pulse2 * 0.5;
            }
            
            // Phase 29: Fractal Tree Branches
            else if (phaseIndex == 29) {
                vec2 p = uv * 3.0;
                float tree = 0.0;
                float scale = 1.0;
                for(int i = 0; i < 5; i++) {
                    p = abs(p) - 0.5;
                    p = rotate2D(sin(u_time * 0.1 + float(i)) * 0.5) * p;
                    tree += exp(-length(p) * scale) / scale;
                    scale *= 2.0;
                }
                vec3 treeColor = mix(colStrangeGreen, colGold, tree);
                color = mix(colBackground, treeColor, clamp(tree, 0.0, 1.0));
            }
            
            // Phase 30: Liquid Metal Effect
            else if (phaseIndex == 30) {
                vec2 p = uv * 2.0 + u_time * 0.1;
                float metal = ridgedFbm(p) * turbulence(p * 2.0);
                vec3 metalColor = mix(colDarkGrey, colWhite, metal);
                color = mix(colBackground, metalColor, smoothstep(0.3, 0.8, metal));
                // Add metallic highlights
                float highlight = pow(metal, 3.0);
                color += colElectricBlue * highlight * 0.5;
            }
            
            // Phase 31: Kaleidoscope Pattern
            else if (phaseIndex == 31) {
                float a = atan(uv.y, uv.x);
                float r = length(uv);
                a = mod(a, PI / 3.0);
                if(a > PI / 6.0) a = PI / 3.0 - a;
                vec2 kp = vec2(cos(a), sin(a)) * r;
                float pattern = fbm(kp * 5.0 + u_time * 0.2);
                vec3 kaleidoColor = hsv2rgb(vec3(pattern + u_time * 0.1, 0.8, 1.0));
                color = mix(colBackground, kaleidoColor, smoothstep(0.2, 0.8, pattern));
            }
            
            // Phase 32: Electric Lightning
            else if (phaseIndex == 32) {
                vec2 p = uv * 3.0;
                float lightning = 0.0;
                for(int i = 0; i < 3; i++) {
                    float branch = abs(sin(p.x * 2.0 + sin(p.y * 3.0 + u_time * 2.0) + float(i)));
                    branch = pow(1.0 - branch, 8.0);
                    lightning += branch;
                }
                vec3 lightningColor = mix(colElectricBlue, colWhite, lightning);
                color = mix(colBackground, lightningColor, lightning);
                // Add electric glow
                float glow = exp(-length(uv) * 2.0) * sin(u_time * 10.0) * 0.5 + 0.5;
                color += colAqua * glow * 0.3;
            }
            
            // Phase 33: Crystalline Structure
            else if (phaseIndex == 33) {
                vec2 p = uv * 4.0;
                float crystal = 0.0;
                for(int i = 0; i < 6; i++) {
                    float angle = float(i) * PI / 3.0;
                    vec2 dir = vec2(cos(angle), sin(angle));
                    float dist = abs(dot(p, dir));
                    crystal += smoothstep(0.1, 0.0, abs(dist - 1.0));
                }
                vec3 crystalColor = mix(colTeal, colLavender, crystal);
                color = mix(colBackground, crystalColor, crystal);
            }
            
            // Phase 34: Plasma Tendrils
            else if (phaseIndex == 34) {
                vec2 p = uv * 2.0;
                float plasma1 = sin(p.x + u_time) + sin(p.y + u_time * 1.3);
                float plasma2 = sin(sqrt(p.x * p.x + p.y * p.y) + u_time * 0.7);
                float plasma = (plasma1 + plasma2) * 0.5;
                vec3 plasmaColor = hsv2rgb(vec3(plasma * 0.1 + u_time * 0.05, 0.9, 1.0));
                color = mix(colBackground, plasmaColor, smoothstep(-0.5, 0.5, plasma));
            }
            
            // Phase 35: Geometric Morphing
            else if (phaseIndex == 35) {
                vec2 p = uv * 2.0;
                float morph = sin(u_time * 0.5) * 0.5 + 0.5;
                float shape1 = length(p) - 0.5; // Circle
                float shape2 = max(abs(p.x), abs(p.y)) - 0.5; // Square
                float shape = mix(shape1, shape2, morph);
                float edge = smoothstep(0.02, 0.0, abs(shape));
                vec3 shapeColor = mix(colMagenta, colYellow, morph);
                color = mix(colBackground, shapeColor, edge);
            }
            
            // Phase 36: Quantum Foam
            else if (phaseIndex == 36) {
                vec2 p = uv * 10.0;
                float foam = 0.0;
                for(int i = 0; i < 4; i++) {
                    foam += abs(snoise(vec3(p, u_time * 0.5 + float(i)))) / pow(2.0, float(i));
                    p *= 2.0;
                }
                vec3 foamColor = mix(colIndigo, colViolet, foam);
                color = mix(colBackground, foamColor, smoothstep(0.3, 0.7, foam));
            }
            
            // Phase 37: Spiral Galaxy Arms
            else if (phaseIndex == 37) {
                float a = atan(uv.y, uv.x);
                float r = length(uv);
                float spiral = sin(a * 3.0 - r * 10.0 + u_time * 2.0);
                spiral = smoothstep(0.0, 0.3, spiral) * smoothstep(1.5, 0.5, r);
                vec3 galaxyColor = mix(colDeepRed, colGold, spiral);
                color = mix(colBackground, galaxyColor, spiral);
                // Add star field
                float stars = smoothstep(0.98, 1.0, rand(floor(uv * 50.0)));
                color += colWhite * stars * 0.5;
            }
            
            // Phase 38: Holographic Interference
            else if (phaseIndex == 38) {
                vec2 p = uv * 5.0;
                float holo1 = sin(p.x * 10.0 + u_time * 3.0);
                float holo2 = sin(p.y * 8.0 + u_time * 2.5);
                float interference = holo1 * holo2;
                vec3 holoColor = mix(colCyan, colMagenta, interference * 0.5 + 0.5);
                color = mix(colBackground, holoColor, abs(interference) * 0.8);
            }
            
            // Phase 39: Flowing Rivers
            else if (phaseIndex == 39) {
                vec2 p = uv * 3.0;
                float flow = fbm(p + vec2(u_time * 0.1, 0.0));
                p.y += flow * 0.5;
                float river = smoothstep(0.1, 0.0, abs(sin(p.y * 3.0)));
                vec3 riverColor = mix(colTeal, colAqua, flow);
                color = mix(colBackground, riverColor, river);
            }
            
            // Phase 40: Neon Circuit Board
            else if (phaseIndex == 40) {
                vec2 p = uv * 8.0;
                vec2 grid = abs(fract(p) - 0.5);
                float circuit = smoothstep(0.05, 0.0, min(grid.x, grid.y));
                float nodes = smoothstep(0.1, 0.0, length(fract(p) - 0.5));
                vec3 circuitColor = mix(colNeonGreen, colElectricBlue, circuit);
                color = mix(colBackground, circuitColor, circuit);
                color += colWhite * nodes;
            }
            
            // Phase 41: Cosmic Web
            else if (phaseIndex == 41) {
                vec2 p = uv * 4.0;
                float web = 0.0;
                for(int i = 0; i < 3; i++) {
                    vec2 offset = vec2(sin(u_time * 0.3 + float(i)), cos(u_time * 0.4 + float(i))) * 2.0;
                    float strand = 1.0 / (length(p - offset) * 5.0 + 1.0);
                    web += strand;
                }
                vec3 webColor = mix(colIndigo, colViolet, web);
                color = mix(colBackground, webColor, clamp(web, 0.0, 1.0));
            }
            
            // Phase 42: Prismatic Refraction
            else if (phaseIndex == 42) {
                vec2 p = uv * 2.0;
                float prism = length(p);
                vec3 refraction;
                refraction.r = sin(prism * 10.0 + u_time * 2.0) * 0.5 + 0.5;
                refraction.g = sin(prism * 10.0 + u_time * 2.0 + 2.0) * 0.5 + 0.5;
                refraction.b = sin(prism * 10.0 + u_time * 2.0 + 4.0) * 0.5 + 0.5;
                color = mix(colBackground, refraction, smoothstep(1.5, 0.5, prism));
            }
            
            // Phase 43: Magnetic Field Lines
            else if (phaseIndex == 43) {
                vec2 p = uv * 3.0;
                float field = 0.0;
                vec2 pole1 = vec2(-1.0, 0.0);
                vec2 pole2 = vec2(1.0, 0.0);
                vec2 field1 = normalize(p - pole1);
                vec2 field2 = normalize(p - pole2);
                float line = abs(sin((field1.x + field2.x) * 10.0 + u_time));
                line = smoothstep(0.9, 1.0, line);
                vec3 fieldColor = mix(colElectricBlue, colMagenta, line);
                color = mix(colBackground, fieldColor, line);
            }
            
            // Phase 44: Quantum Tunneling
            else if (phaseIndex == 44) {
                vec2 p = uv * 4.0;
                float tunnel = sin(length(p) * 5.0 - u_time * 3.0);
                tunnel = smoothstep(0.0, 0.5, tunnel) * smoothstep(2.0, 1.0, length(p));
                vec3 tunnelColor = hsv2rgb(vec3(tunnel * 0.2 + u_time * 0.1, 0.8, 1.0));
                color = mix(colBackground, tunnelColor, tunnel);
            }
            
            // Phase 45: Fractal Flames
            else if (phaseIndex == 45) {
                vec2 p = uv * 2.0;
                float flame = 0.0;
                for(int i = 0; i < 4; i++) {
                    p = abs(p) - 0.3;
                    p = rotate2D(sin(u_time * 0.2 + float(i)) * 0.5) * p;
                    flame += 1.0 / (length(p) * 5.0 + 1.0);
                }
                vec3 flameColor = mix(colDeepRed, colYellow, flame);
                color = mix(colBackground, flameColor, clamp(flame, 0.0, 1.0));
            }
            
            // Phase 46: Digital Rain Matrix
            else if (phaseIndex == 46) {
                vec2 p = originalUV * vec2(40.0, 20.0);
                vec2 cell = floor(p);
                float rain = fract(sin(dot(cell, vec2(12.9898, 78.233))) * 43758.5453);
                rain = step(0.95, rain) * smoothstep(0.0, 1.0, fract(p.y + u_time * 2.0));
                vec3 rainColor = mix(colNeonGreen, colWhite, rain);
                color = mix(colBackground, rainColor, rain);
            }
            
            // Phase 47: Hypnotic Spiral
            else if (phaseIndex == 47) {
                float a = atan(uv.y, uv.x);
                float r = length(uv);
                float spiral = sin(a * 8.0 + r * 20.0 - u_time * 4.0);
                spiral = smoothstep(0.0, 0.5, spiral);
                vec3 spiralColor = hsv2rgb(vec3(a / TWO_PI + u_time * 0.1, 0.8, 1.0));
                color = mix(colBackground, spiralColor, spiral);
            }
            
            // Phase 48: Crystalline Growth
            else if (phaseIndex == 48) {
                vec2 p = uv * 3.0;
                float growth = fbm(p + u_time * 0.1);
                growth = smoothstep(0.3, 0.7, growth);
                float crystal = hexPattern(p, 5.0);
                crystal = smoothstep(0.3, 0.0, crystal);
                vec3 crystalColor = mix(colTeal, colLavender, growth);
                color = mix(colBackground, crystalColor, crystal * growth);
            }
            
            // Phase 49: Final Synthesis - Combining Multiple Effects
            else if (phaseIndex == 49) {
                // Combine multiple previous effects for a grand finale
                vec2 p = uv * 2.0;
                
                // Plasma base
                float plasma = sin(p.x + u_time) + sin(p.y + u_time * 1.3);
                
                // Fractal overlay
                vec2 fp = abs(p) * 0.8;
                for(int i = 0; i < 3; i++) {
                    fp = abs(fp * 1.5 - 1.0);
                }
                float fractal = sin(length(fp) * 10.0 + u_time);
                
                // Particle system
                float particles = 0.0;
                for(float i = 0.0; i < 8.0; i++) {
                    float seed = i * 7.13;
                    float st = u_time * (0.5 + rand(seed)) + rand(seed + 1.0) * 10.0;
                    float sd = fract(st) * 2.0;
                    float sa = rand(seed + 2.0) * TWO_PI + u_time * 0.1;
                    vec2 sp = vec2(cos(sa), sin(sa)) * sd;
                    float ds = length(uv - sp);
                    particles += smoothstep(0.05, 0.0, ds);
                }
                
                // Combine all effects
                vec3 plasmaColor = hsv2rgb(vec3(plasma * 0.1 + u_time * 0.05, 0.8, 1.0));
                vec3 fractalColor = mix(colPrimary, colSecondary, fractal * 0.5 + 0.5);
                vec3 particleColor = colWhite;
                
                color = mix(colBackground, plasmaColor, smoothstep(-1.0, 1.0, plasma) * 0.6);
                color = mix(color, fractalColor, smoothstep(-0.5, 0.5, fractal) * 0.4);
                color += particleColor * particles * 0.8;
                
                // Final enhancement
                color *= 1.0 + sin(u_time * 2.0) * 0.2;
            }
            
            // Apply global effects
            
            // Vignette effect
            float vignette = 1.0 - smoothstep(0.7, 1.4, length(uv));
            color *= vignette;
            
            // Subtle film grain
            float grain = (rand(originalUV + fract(u_time * 60.0)) - 0.5) * 0.03;
            color += grain;
            
            // Intensity modulation
            color *= u_intensity;
            
            // Ensure color is in valid range
            color = clamp(color, 0.0, 1.0);
            
            outColor = vec4(color, 1.0);
        }
    `;

    // --- Shader Compilation and Program Setup ---
    function createShader(gl, type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('Shader compilation error:', gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        
        return shader;
    }

    function createProgram(gl, vertexShader, fragmentShader) {
        const program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error('Program linking error:', gl.getProgramInfoLog(program));
            gl.deleteProgram(program);
            return null;
        }
        
        return program;
    }

    // Create shaders and program
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    
    if (!vertexShader || !fragmentShader) {
        console.error('Failed to create shaders');
        return;
    }
    
    shaderProgram = createProgram(gl, vertexShader, fragmentShader);
    
    if (!shaderProgram) {
        console.error('Failed to create shader program');
        return;
    }

    // Get uniform locations
    uniformLocations = {
        u_time: gl.getUniformLocation(shaderProgram, 'u_time'),
        u_resolution: gl.getUniformLocation(shaderProgram, 'u_resolution'),
        u_mouse_x: gl.getUniformLocation(shaderProgram, 'u_mouse_x'),
        u_mouse_y: gl.getUniformLocation(shaderProgram, 'u_mouse_y'),
        u_intensity: gl.getUniformLocation(shaderProgram, 'u_intensity')
    };

    // Create position buffer for full-screen quad
    positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    
    const positions = [
        -1.0, -1.0,
         1.0, -1.0,
        -1.0,  1.0,
        -1.0,  1.0,
         1.0, -1.0,
         1.0,  1.0,
    ];
    
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    // Get attribute location
    const positionAttributeLocation = gl.getAttribLocation(shaderProgram, 'a_position');

    // Mouse tracking
    let mouseX = 0.0;
    let mouseY = 0.0;
    let intensity = 1.0;

    webglCanvas.addEventListener('mousemove', (event) => {
        const rect = webglCanvas.getBoundingClientRect();
        mouseX = (event.clientX - rect.left) / rect.width;
        mouseY = 1.0 - (event.clientY - rect.top) / rect.height; // Flip Y coordinate
    });

    // Render function
    function render(time) {
        time *= 0.001; // Convert to seconds

        // Resize canvas if needed
        if (webglCanvas.width !== window.innerWidth || webglCanvas.height !== window.innerHeight) {
            webglCanvas.width = window.innerWidth;
            webglCanvas.height = window.innerHeight;
            gl.viewport(0, 0, webglCanvas.width, webglCanvas.height);
        }

        // Clear canvas
        gl.clearColor(0.02, 0.02, 0.067, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        // Use shader program
        gl.useProgram(shaderProgram);

        // Set uniforms
        gl.uniform1f(uniformLocations.u_time, time);
        gl.uniform2f(uniformLocations.u_resolution, webglCanvas.width, webglCanvas.height);
        gl.uniform1f(uniformLocations.u_mouse_x, mouseX);
        gl.uniform1f(uniformLocations.u_mouse_y, mouseY);
        gl.uniform1f(uniformLocations.u_intensity, intensity);

        // Bind position buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.enableVertexAttribArray(positionAttributeLocation);
        gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

        // Draw
        gl.drawArrays(gl.TRIANGLES, 0, 6);

        requestAnimationFrame(render);
    }

    // Start rendering
    requestAnimationFrame(render);

    // Expose update function to global scope
    window.updateShader = function(newIntensity) {
        if (typeof newIntensity === 'number') {
            intensity = Math.max(0.0, Math.min(2.0, newIntensity));
        }
    };

    console.log('Enhanced Shader System Initialized with 50 phases');

})();

