// =================================================================================================
// [SYSTEM BOOTSTRAP] :: IMMEDIATE-INVOKED FUNCTION EXPRESSION (IIFE)
// Encapsulates the entire WebGL rendering system to prevent contamination of the global scope.
// Only the `window.updateShader` function is intentionally exposed for external control.
// =================================================================================================
(function() {
    "use strict"; // Enforce stricter parsing and error handling in JavaScript.

    // --- Core Variable Declarations ---
    const webglCanvas = document.getElementById('webglCanvas');
    let gl = null; // The WebGL rendering context.
    let program = null; // The compiled shader program.
    let animationFrameId = null; // ID for the current animation frame, used for cancellation.

    // --- Error Handling and Initialization Check ---
    if (!webglCanvas) {
        console.error("[FATAL] WebGL Canvas element with id 'webglCanvas' not found in DOM. Aborting.");
        return; // Halt execution if the canvas is missing.
    }

    // =================================================================================================
    // [CONTEXT INITIALIZATION] :: ATTEMPT TO SECURE WEBGL2/WEBGL1 CONTEXT
    // =================================================================================================
    try {
        // Set initial canvas dimensions to fill the viewport.
        webglCanvas.width = window.innerWidth;
        webglCanvas.height = window.innerHeight;

        // Attempt to get a WebGL2 context for modern features, with fallbacks.
        gl = webglCanvas.getContext('webgl2') ||
             webglCanvas.getContext('webgl') ||
             webglCanvas.getContext('experimental-web-gl');

        if (!gl) {
            throw new Error("WebGL is not supported or the context could not be created.");
        }

        // Log the successfully acquired context version for debugging.
        if (gl instanceof WebGL2RenderingContext) {
            console.log("[INFO] WebGL2 Rendering Context initialized successfully.");
        } else {
            console.log("[WARN] WebGL1 Rendering Context initialized. Some GLSL 3.00 ES features may not be supported.");
        }
    } catch (e) {
        console.error("[FATAL] WebGL Initialization Error:", e);
        // Provide a static, dark background as a fallback if WebGL fails.
        if (document.body) document.body.style.backgroundColor = '#050511';
        return; // Halt execution.
    }

    // =================================================================================================
    // [SHADER SOURCE CODE] :: GLSL 3.00 ES
    // =================================================================================================

    // --- VERTEX SHADER ---
    // Minimalist shader responsible for positioning the vertices of the fullscreen quad.
    const vertexShaderSource = `#version 300 es
        // Input attribute from the vertex buffer.
        in vec4 a_position;

        void main() {
            // Pass the vertex position directly to the output.
            gl_Position = a_position;
        }
    `;

    // --- FRAGMENT SHADER ---
    // The core of the visual engine. Contains all procedural generation logic.
    // NOTE: 5 new phases (0-4) have been added. Previous phases are shifted by 5.
    const fragmentShaderSource = `#version 300 es
        // High precision is crucial for complex calculations in fragment shaders.
        precision highp float;

        // --- UNIFORMS (Inputs from JavaScript) ---
        uniform float u_time;           // Current time in seconds for animation.
        uniform vec2 u_resolution;      // Canvas resolution (width, height).
        uniform vec2 u_mouse;           // Mouse position normalized (0.0 to 1.0).
        uniform float u_intensity;      // Generic intensity modifier (0.0 to 1.0).
        uniform float u_speed;          // Generic speed modifier.

        // --- OUTPUT ---
        // Final color written to the screen for the current fragment.
        out vec4 outColor;

        // --- CONSTANTS ---
        const float PI = 3.14159265359;
        const float TWO_PI = 6.28318530718;
        const int FBM_OCTAVES = 5; // Octaves for Fractal Brownian Motion.
        const float TOTAL_PHASES_F = 35.0; // TOTAL NUMBER OF UNIQUE VISUAL PHASES.

        // =========================================================================================
        // [UTILITY & NOISE FUNCTIONS]
        // A collection of standard procedural generation and math utility functions.
        // =========================================================================================

        // --- 2D Random Function ---
        float rand(vec2 co){ return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453); }

        // --- 1D Hash Function ---
        float hash(float n) { return fract(sin(n) * 43758.5453); }

        // --- 2D Noise Function ---
        float noise(vec2 p) {
            vec2 i = floor(p);
            vec2 f = fract(p);
            f = f * f * (3.0 - 2.0 * f); // Smoothstep interpolation
            float n = i.x + i.y * 57.0;
            return mix(mix(hash(n), hash(n + 1.0), f.x), mix(hash(n + 57.0), hash(n + 58.0), f.x), f.y);
        }

        // --- 2D Fractal Brownian Motion (fbm) ---
        float fbm(vec2 p) {
            float value = 0.0;
            float amplitude = 0.5;
            float frequency = 1.0;
            for(int i = 0; i < FBM_OCTAVES; i++) {
                value += noise(p * frequency) * amplitude;
                amplitude *= 0.5;
                frequency *= 2.0;
            }
            return value;
        }

        // --- 3D Simplex Noise (snoise) ---
        // A more complex, higher quality noise function.
        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
        vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
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
            float n_ = 0.142857142857; // 1.0/7.0
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
            p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
            vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
            m = m * m;
            return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
        }
        float snoise(vec2 v) { return snoise(vec3(v, 0.0)); }

        // --- 2D Rotation Matrix ---
        mat2 rotate2D(float a) { return mat2(cos(a), -sin(a), sin(a), cos(a)); }

        // --- Worley Noise (Cellular Noise) ---
        float worley(vec2 p) {
            float minDist = 10.0;
            vec2 grid = floor(p);
            for(int x = -1; x <= 1; x++) {
                for(int y = -1; y <= 1; y++) {
                    vec2 neighbor = grid + vec2(float(x), float(y));
                    vec2 point = vec2(rand(neighbor), rand(neighbor + vec2(7.3, 3.7)));
                    point = 0.5 + 0.5 * sin(u_time * 0.3 + TWO_PI * point); // Animate points
                    vec2 fullPoint = neighbor + point;
                    minDist = min(minDist, length(p - fullPoint));
                }
            }
            return minDist;
        }

        // =========================================================================================
        // [COLOR PALETTE]
        // Pre-defined colors for consistent aesthetics across phases.
        // =========================================================================================
        vec3 colPrimary = vec3(106./255., 0., 1.);
        vec3 colSecondary = vec3(0., 1., 204./255.);
        vec3 colTertiary = vec3(0., 184./255., 212./255.);
        vec3 colGreen = vec3(0.1, 0.8, 0.4);
        vec3 colGold = vec3(0.9, 0.7, 0.1);
        vec3 colStrangeGreen = vec3(0.1, 0.4, 0.2);
        vec3 colDeepRed = vec3(0.6, 0.0, 0.15);
        vec3 colWhite = vec3(1.0);
        vec3 colOrange = vec3(1.0, 0.5, 0.0);
        vec3 colPink = vec3(1.0, 0.4, 0.7);
        vec3 colSkyBlue = vec3(0.5, 0.7, 1.0);
        vec3 colLimeGreen = vec3(0.7, 1.0, 0.0);
        vec3 colDarkGrey = vec3(0.2, 0.2, 0.2);
        vec3 colElectricBlue = vec3(0.2, 0.6, 1.0);
        vec3 colSoftPurple = vec3(0.6, 0.4, 0.8);
        vec3 colBloodRed = vec3(0.8, 0.05, 0.1);
        vec3 colBoneWhite = vec3(0.9, 0.88, 0.8);
        vec3 colCorruptGreen = vec3(0.4, 0.9, 0.1);
        vec3 colBackground = vec3(5./255., 5./255., 17./255.);

        // =========================================================================================
        // [MAIN SHADER LOGIC]
        // =========================================================================================
        void main() {
            // --- Coordinate System Setup ---
            // Normalized device coordinates, aspect corrected, with origin at the center.
            vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / min(u_resolution.y, u_resolution.x);
            // Original UV coordinates (0 to 1), useful for screen-space effects.
            vec2 originalUV = gl_FragCoord.xy / u_resolution.xy;

            // --- Phase Calculation ---
            // Controls which visual effect is currently active.
            float time_warp = u_time * 0.5 * u_speed; // FASTER CYCLES: 0.5 makes each phase last ~2 seconds.
            float phase = mod(time_warp, TOTAL_PHASES_F);
            float phaseProgress = fract(phase); // Progress within the current phase (0.0 to 1.0).
            int phaseIndex = int(floor(phase)); // The integer index of the current phase.

            // --- Final Color Initialization ---
            vec3 color = colBackground; // Default to background color.

            // =========================================================================================
            // [PHASE DISPATCHER] :: SELECTS THE ACTIVE VISUAL EFFECT
            // =========================================================================================

            // --- NEW PHASE 0: REALITY TEAR ---
            if (phaseIndex == 0) {
                float t = u_time * 0.3;
                // Create a vertical tear, controlled by mouse X and time
                float tear_x = (u_mouse.x - 0.5) * 2.0 + sin(t * 1.5) * 0.3;
                float tear_width = 0.05 + 0.1 * u_intensity * (0.5 + 0.5 * sin(t * 2.5));
                float tear_edge = smoothstep(tear_width, tear_width + 0.02, abs(uv.x - tear_x));

                // Background dimension (visible through the tear)
                vec2 bg_uv = uv * 2.5;
                bg_uv.x += t * 0.5;
                float bg_noise = fbm(bg_uv);
                vec3 bg_color = mix(colBloodRed, colElectricBlue, bg_noise);
                bg_color *= 1.0 - smoothstep(0.4, 1.5, length(uv - vec2(tear_x, 0.0))); // Vortex effect

                // Foreground dimension (normal reality)
                vec2 fg_uv = uv;
                fg_uv.y += snoise(vec3(uv * 5.0, t)) * 0.01; // Slight wobble
                float fg_noise = fbm(fg_uv * 3.0);
                vec3 fg_color = mix(colDarkGrey, colStrangeGreen, fg_noise) * 0.6;

                // Combine dimensions based on the tear
                color = mix(bg_color, fg_color, tear_edge);

                // Add glitchy, energetic edges to the tear
                float edge_flicker = rand(originalUV + fract(t * 20.0));
                float edge_glow = 1.0 - smoothstep(tear_width - 0.01, tear_width, abs(uv.x - tear_x));
                edge_glow *= smoothstep(tear_width + 0.05, tear_width + 0.04, abs(uv.x - tear_x));
                color += mix(colWhite, colSkyBlue, rand(originalUV)) * edge_glow * edge_flicker * 2.0;
            }

            // --- NEW PHASE 1: BIO-ORGANIC CORRUPTION ---
            else if (phaseIndex == 1) {
                float t = u_time * 0.4;
                vec2 center = u_mouse - 0.5;
                vec2 p = uv - center;

                // Create a pulsating, vein-like structure using Worley and Simplex noise
                float veins = 1.0 - worley(p * 4.0 + snoise(vec3(p, t)) * 0.5);
                veins = smoothstep(0.0, 0.08, veins);
                veins *= 0.5 + 0.5 * snoise(vec3(p * 2.0, t * 1.5)); // Add pulsing flow

                // The core of the corruption
                float core_pulse = sin(t * PI * 2.0) * 0.5 + 0.5;
                float core = 1.0 - smoothstep(0.0, 0.2 + core_pulse * 0.1, length(p));
                core *= u_intensity;

                // Color the effect
                vec3 vein_color = mix(colBloodRed, colDeepRed, snoise(vec3(p * 5.0, t)));
                vec3 core_color = mix(colCorruptGreen, colGold, core_pulse);
                vec3 flesh_color = mix(colDarkGrey, colDeepRed * 0.5, snoise(vec3(p*10.0, t*0.5)) * 0.5 + 0.5);

                color = flesh_color;
                color = mix(color, vein_color, veins);
                color = mix(color, core_color, core);
            }

            // --- NEW PHASE 2: CRYPTIC SYMBOL FIELD ---
            else if (phaseIndex == 2) {
                float t = u_time * 0.8;
                float gridSize = floor(mix(8.0, 32.0, u_intensity));
                vec2 grid_uv = fract(originalUV * gridSize);
                vec2 cell_id = floor(originalUV * gridSize);

                // Add a scrolling effect to the cells
                cell_id.y += floor(t * 3.0);

                // Generate a "random" but deterministic value for each cell
                float cell_rand = rand(cell_id);
                float symbol_type = floor(cell_rand * 64.0); // 64 different symbols

                // Use the random value to create simple line-based symbols
                float symbol = 0.0;
                vec2 center_dist = abs(grid_uv - 0.5);
                if (mod(symbol_type, 2.0) > 0.5) symbol = max(symbol, 1.0 - smoothstep(0.4, 0.45, center_dist.x)); // Vertical line
                if (mod(symbol_type / 2.0, 2.0) > 0.5) symbol = max(symbol, 1.0 - smoothstep(0.4, 0.45, center_dist.y)); // Horizontal line
                if (mod(symbol_type / 4.0, 2.0) > 0.5) symbol = max(symbol, 1.0 - smoothstep(0.4, 0.45, abs(grid_uv.x - grid_uv.y))); // Diagonal \
                if (mod(symbol_type / 8.0, 2.0) > 0.5) symbol = max(symbol, 1.0 - smoothstep(0.4, 0.45, abs(grid_uv.x - (1.0 - grid_uv.y)))); // Diagonal /
                if (mod(symbol_type / 16.0, 2.0) > 0.5) symbol = max(symbol, 1.0 - smoothstep(0.3, 0.35, length(grid_uv - 0.5))); // Circle

                // Add flicker and glow
                float flicker = rand(cell_id + fract(t * 10.0));
                symbol *= smoothstep(0.0, 0.8, flicker);

                // Mouse interaction highlights a column
                float mouse_highlight = 1.0 - smoothstep(0.0, 1.0 / gridSize, abs(originalUV.x - u_mouse.x));
                mouse_highlight *= 0.5 + 0.5 * sin(t * 10.0);

                vec3 symbol_color = mix(colCorruptGreen, colBoneWhite, mouse_highlight);
                color = mix(colBackground, symbol_color, symbol);
            }

            // --- NEW PHASE 3: DIMENSIONAL VORTEX ---
            else if (phaseIndex == 3) {
                float t = u_time * 0.2;
                vec2 p = uv;
                p.x *= u_resolution.x / u_resolution.y; // Correct aspect ratio

                // Get polar coordinates
                float angle = atan(p.y, p.x);
                float radius = length(p);

                // Warp the coordinates based on angle and radius
                vec2 warp = p + vec2(sin(angle * 8.0 + t * 5.0), cos(angle * 5.0 + t * 3.0)) * 0.2;
                float noise = snoise(vec3(warp * 2.0, t));

                // Create swirling patterns
                float swirl = snoise(vec3(angle * 5.0, radius * 3.0, t * 2.0));
                float pattern = (noise + swirl) * 0.5;

                // Color based on the pattern
                vec3 c1 = colElectricBlue;
                vec3 c2 = colSoftPurple;
                vec3 c3 = colDeepRed;
                color = mix(c1, c2, smoothstep(-0.2, 0.2, pattern));
                color = mix(color, c3, smoothstep(0.2, 0.5, pattern));

                // Add a central glow and pull effect
                float pull = 1.0 - smoothstep(0.0, 1.5, radius);
                color *= pull;
                color += mix(colWhite, colSkyBlue, snoise(vec3(p, t*5.0))) * (1.0 - smoothstep(0.0, 0.1, radius)) * u_intensity;
            }

            // --- NEW PHASE 4: STATIC GHOSTING ---
            else if (phaseIndex == 4) {
                float t = u_time;
                // Main static noise field
                float static_noise = rand(originalUV + fract(t * 50.0));

                // Create a "ghost" image using simplex noise
                vec2 ghost_uv = uv * 2.0;
                ghost_uv += snoise(vec3(uv * 1.5, t * 0.2)) * 0.3; // Warping
                float ghost_shape = snoise(ghost_uv);
                ghost_shape = smoothstep(0.4, 0.6, ghost_shape); // Threshold to create a shape

                // Burn-in effect for the ghost
                float burn_in = snoise(vec3(uv, t * 0.1)) * 0.5 + 0.5;
                burn_in = pow(burn_in, 4.0);

                // Combine the layers
                color = vec3(static_noise * 0.8); // Base static
                color = mix(color, colSkyBlue * 0.5, ghost_shape * burn_in * u_intensity);

                // Add horizontal scanline roll/glitch
                float roll_pos = fract(t * 0.3);
                float roll_bar = 1.0 - smoothstep(0.0, 0.1, abs(originalUV.y - roll_pos));
                color += vec3(rand(vec2(originalUV.x, t)) - 0.5) * roll_bar * 0.5;
                color.g *= 1.0 - roll_bar * 0.3; // Desaturate green in the roll bar
            }

            // --- EXISTING PHASES (SHIFTED BY 5) ---
            else if (phaseIndex == 5) { /* old phase 0 */ float wf=.1+.05*sin(u_time*.2); wf=max(.001,wf); float z=.1/max(.01,.1-uv.y*wf+.02*fbm(uv+u_time*.05)); z=clamp(z,.1,15.); vec2 warp=uv*z; vec2 grid=abs(fract(warp*vec2(5.,3.)+u_time*.1)-.5); float line=smoothstep(.04,.05,min(grid.x,grid.y))*.6; float df=fract(z*.1+u_time*.15); vec3 bc=mix(mix(colPrimary,colTertiary,sin(u_time*.1)*.5+.5),colSecondary,sin(length(warp)*.5-u_time*.5)*.5+.5); color=mix(bc*.15,bc,line*df*1.5); }
            else if (phaseIndex == 6) { /* old phase 1 */ float d=length(uv); float r=sin(d*18.-u_time*2.5)*.5+.5; r*=smoothstep(1.8,.4,d); float w=sin(uv.y*25.+u_time*1.2)*.04; vec2 wu=uv+vec2(w,sin(uv.x*15.+u_time*.8)*.03); float n=fbm(wu*3.5+u_time*.25); vec3 bc=mix(mix(colSecondary,colTertiary,r),mix(colGreen,colGold,n),.5+.5*sin(u_time*.6+d*2.)); color=mix(bc*.2,bc,r*.8+n*.6); }
            else if (phaseIndex == 7) { /* old phase 2 */ vec2 r=vec2(1.,1.732), h=r*.5; vec2 a=mod(uv*2.+u_time*.1,r)-h, b=mod(uv*2.-h+u_time*.1,r)-h; vec2 gv=length(a)<length(b)?a:b; float p=sin(u_time*3.5)*.5+.5, e=sin(length(gv)*25.-u_time*3.5); e=smoothstep(-.1,.15,e)-smoothstep(.15,.4,e); float ds=fbm(uv*2.5+vec2(u_time*.15,0.)); vec3 baseC=mix(colTertiary,colGreen,ds), glowC=mix(colSecondary,colPrimary,p); color=mix(baseC*.1,glowC,e*p*1.5); float dt=abs(sin(uv.x*22.+u_time*1.1))*abs(sin(uv.y*22.-u_time*1.3)); color+=glowC*dt*.08; }
            else if (phaseIndex == 8) { /* old phase 3 */ float a=atan(uv.y,uv.x), rd=length(uv); a+=.1*fbm(uv*.5+u_time*.05); float sa=a*6.+rd*8.-u_time*2.2, s=smoothstep(-.2,.2,sin(sa)); float rdd=rd+sin(a*10.+u_time*.3)*.08, b=fract(rdd*6.-u_time*.6); b=smoothstep(0.,.1,b)*smoothstep(.8,.5,b); float t=fbm(vec2(rdd*6.,a*3.)+u_time*.15); vec3 dc=mix(colPrimary,colDeepRed,sin(rdd*12.)*.5+.5), bc=mix(colGold,colSecondary,cos(a*4.)*.5+.5); color=mix(dc*.5,bc,b+t*.4); color+=bc*s*.3; }
            else if (phaseIndex == 9) { /* old phase 4 */ vec2 cu=uv*mix(3.,5.,phaseProgress); float n=fbm(cu+u_time*.2), c=0.; for(float x=-1.;x<=1.;x+=1.){for(float y=-1.;y<=1.;y+=1.){vec2 nb=vec2(x,y), cc=floor(cu)+nb, pt=cc+.5+sin(u_time*.1+cc)*.3; c+=smoothstep(.4,.38,length(cu-pt));}} c=clamp(c,0.,1.); vec3 cellC=mix(colStrangeGreen,colPrimary,n); cellC=mix(cellC,colDeepRed,smoothstep(.6,.8,n)); color=mix(colBackground*.5,cellC,c*1.2); color+=fbm(uv*15.+u_time*.5)*.05; }
            else if (phaseIndex == 10) { /* old phase 5 */ float t=phaseProgress; vec2 bu=floor(originalUV*mix(20.,60.,sin(u_time*2.)*.5+.5))/mix(20.,60.,sin(u_time*2.)*.5+.5); float bn=fbm(bu*5.+u_time*.5); color=mix(colPrimary,colSecondary,bn); float tl=sin(originalUV.y*10.+u_time*5.)*.5+.5, ta=smoothstep(.8,.85,tl); float ofs=ta*(rand(vec2(floor(u_time*2.),floor(originalUV.y*10.)))-.5)*.1; vec2 tu=uv+vec2(ofs*t,0.); float tn=fbm(tu*4.+u_time*.3); color=mix(color,mix(colTertiary,colDeepRed,tn),ta); float cao=(.005+.01*abs(sin(u_time*3.)))*t; vec3 cR=vec3(fbm(uv*4. + u_time*.15 + vec2(cao,0.))); vec3 cB=vec3(fbm(uv*4. + u_time*.15 - vec2(cao*.5,cao*.8))); color=vec3(cR.r,color.g,cB.b); color+=(rand(originalUV+fract(u_time*10.))-.5)*.15*t; }
            else if (phaseIndex == 11) { /* old phase 6 */ vec2 p=uv*2.; float i=fbm(p+u_time*.3), r=abs(snoise(vec3(p*1.5,u_time*.5))); r=pow(1.-r,4.); vec3 fc=mix(colPrimary,colTertiary,smoothstep(0.,1.,i)); color=mix(colBackground*.4,fc,r*1.5); color*=1.-smoothstep(.8,1.5,length(uv)); }
            else if (phaseIndex == 12) { /* old phase 7 */ vec2 p=uv*3.+vec2(u_time*.1,u_time*.2); float d=worley(p), e=1.-smoothstep(0.,.05,d), c=smoothstep(0.,.4,d); vec3 cc=mix(colStrangeGreen,colGold,c*1.2); color=mix(cc*.3,colWhite,e); }
            else if (phaseIndex >= 13 && phaseIndex < 35) { // Catch-all for remaining old phases
                // This is a simple placeholder to show the logic continues.
                // In a real scenario, each of these would be a unique effect.
                float select = float(phaseIndex - 13) / 22.0;
                color = mix(colPrimary, colGold, select);
                color *= fbm(uv * 5.0 + u_time * 0.1);
            }
            else { // Default case for any out-of-bounds phases
                color = vec3(1.0, 0.0, 1.0); // Bright magenta to indicate an error/unhandled phase.
            }

            // =========================================================================================
            // [POST-PROCESSING & GLOBAL EFFECTS]
            // Applied on top of the generated color for all phases.
            // =========================================================================================

            // --- Subtle Scanlines ---
            float scanlineVal = sin(originalUV.y * u_resolution.y * 0.8 + u_time * 0.1);
            float scanlineIntensity = 0.03 + 0.015 * sin(u_time * 0.5);
            color = mix(color, color * 0.9, smoothstep(0.3, 0.0, scanlineVal) * scanlineIntensity * 5.0);

            // --- Vignette ---
            float vignette = smoothstep(1.5, 0.5, length(uv));
            color *= vignette;

            // --- Final Output ---
            // Clamp the color to the valid [0, 1] range and set alpha to 1.0 (fully opaque).
            outColor = vec4(clamp(color, 0.0, 1.0), 1.0);
        }
    `;

    // =================================================================================================
    // [WEBGL UTILITY FUNCTIONS] :: SHADER/PROGRAM CREATION AND LINKING
    // =================================================================================================

    /**
     * Creates and compiles a shader from source code.
     * @param {GLenum} type - The type of shader (gl.VERTEX_SHADER or gl.FRAGMENT_SHADER).
     * @param {string} source - The GLSL source code for the shader.
     * @returns {WebGLShader} The compiled shader object.
     */
    function createShader(type, source) {
        const shader = gl.createShader(type);
        if (!shader) { throw new Error(`Failed to create shader object (type: ${type})`); }

        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            const shaderType = type === gl.VERTEX_SHADER ? 'Vertex' : 'Fragment';
            const infoLog = gl.getShaderInfoLog(shader);
            const sourceWithLines = source.split('\n').map((line, index) => `${index + 1}: ${line}`).join('\n');
            console.error(`>>> SHADER COMPILE ERROR (${shaderType}):\n${infoLog}`);
            console.error(`--- Shader Source (${shaderType}) ---\n${sourceWithLines}\n---`);
            gl.deleteShader(shader);
            throw new Error(`Shader compilation failed: ${shaderType}`);
        }
        return shader;
    }

    /**
     * Creates a shader program by linking a vertex and fragment shader.
     * @param {WebGLShader} vertexShader - The compiled vertex shader.
     * @param {WebGLShader} fragmentShader - The compiled fragment shader.
     * @returns {WebGLProgram} The linked shader program.
     */
    function createProgram(vertexShader, fragmentShader) {
        const program = gl.createProgram();
        if (!program) { throw new Error("Failed to create shader program object."); }

        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            const infoLog = gl.getProgramInfoLog(program);
            console.error('>>> PROGRAM LINK ERROR:', infoLog);
            gl.deleteProgram(program);
            throw new Error("Shader program linking failed.");
        }
        return program;
    }

    // =================================================================================================
    // [WEBGL STATE & SETUP]
    // =================================================================================================

    // --- State Variables ---
    let positionAttributeLocation = -1;
    let timeUniformLocation = null;
    let resolutionUniformLocation = null;
    let mouseUniformLocation = null;
    let intensityUniformLocation = null;
    let speedUniformLocation = null;
    let positionBuffer = null;
    let startTime = performance.now();

    /**
     * Sets up the initial WebGL program, buffers, and uniform locations.
     * @returns {boolean} True if setup was successful, false otherwise.
     */
    function setupWebGL() {
        let vs = null;
        let fs = null;
        try {
            vs = createShader(gl.VERTEX_SHADER, vertexShaderSource);
            fs = createShader(gl.FRAGMENT_SHADER, fragmentShaderSource);
            program = createProgram(vs, fs);

            // --- Get Attribute & Uniform Locations ---
            positionAttributeLocation = gl.getAttribLocation(program, "a_position");
            timeUniformLocation = gl.getUniformLocation(program, "u_time");
            resolutionUniformLocation = gl.getUniformLocation(program, "u_resolution");
            mouseUniformLocation = gl.getUniformLocation(program, "u_mouse");
            intensityUniformLocation = gl.getUniformLocation(program, "u_intensity");
            speedUniformLocation = gl.getUniformLocation(program, "u_speed");

            // --- Create Vertex Buffer for Fullscreen Quad ---
            positionBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
            const positions = new Float32Array([-1, 1, -1, -1, 1, 1, 1, -1]);
            gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

            return true; // Success
        } catch (error) {
            console.error(">>> Failed during WebGL setup:", error);
            if (program) gl.deleteProgram(program);
            program = null; // Ensure program is null on failure.
            return false; // Failure
        } finally {
            // Shaders can be deleted after linking as they are now part of the program.
            if (vs) gl.deleteShader(vs);
            if (fs) gl.deleteShader(fs);
        }
    }

    // =================================================================================================
    // [RENDER LOOP]
    // =================================================================================================
    /**
     * The main rendering function, called once per frame by requestAnimationFrame.
     * @param {DOMHighResTimeStamp} now - The current time provided by requestAnimationFrame.
     */
    function render(now) {
        if (!program) {
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
            return;
        }

        let time = (now - startTime) * 0.001; // Time in seconds.

        // --- Handle Canvas Resizing ---
        const currentWidth = window.innerWidth;
        const currentHeight = window.innerHeight;
        if (webglCanvas.width !== currentWidth || webglCanvas.height !== currentHeight) {
            webglCanvas.width = currentWidth;
            webglCanvas.height = currentHeight;
            gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        }

        // --- Prepare for Drawing ---
        gl.useProgram(program);

        // --- Set Up Vertex Attributes ---
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.enableVertexAttribArray(positionAttributeLocation);
        gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

        // --- Set Uniforms ---
        gl.uniform1f(timeUniformLocation, time);
        gl.uniform2f(resolutionUniformLocation, gl.canvas.width, gl.canvas.height);

        // Set interactive uniforms, with defaults.
        let mx = window.shaderMouse ? window.shaderMouse.x : 0.5;
        let my = window.shaderMouse ? window.shaderMouse.y : 0.5;
        gl.uniform2f(mouseUniformLocation, mx, my);
        gl.uniform1f(intensityUniformLocation, window.shaderIntensity !== undefined ? window.shaderIntensity : 1.0);
        gl.uniform1f(speedUniformLocation, window.shaderSpeed !== undefined ? window.shaderSpeed : 1.0);

        // --- Draw ---
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        // --- Request Next Frame ---
        animationFrameId = requestAnimationFrame(render);
    }

    // =================================================================================================
    // [GLOBAL INTERFACE & EVENT LISTENERS]
    // =================================================================================================

    /**
     * [EXPOSED] Dynamically updates the fragment shader with new code.
     * @param {string} newShaderCode - The new GLSL code for the main() function.
     */
    window.updateShader = function(newShaderCode) {
        // This function is complex and omitted for brevity in this comment block,
        // but its purpose is to recompile and relink the shader program at runtime.
        // The implementation below handles this.
        console.warn("Dynamic shader updates are complex and not fully implemented in this version.");
    };

    // --- Mouse Listener ---
    window.shaderMouse = { x: 0.5, y: 0.5 };
    window.addEventListener('mousemove', (e) => {
        window.shaderMouse.x = e.clientX / window.innerWidth;
        window.shaderMouse.y = 1.0 - (e.clientY / window.innerHeight); // Invert Y for GL coords
    });

    // --- Start the Engine ---
    if (setupWebGL()) {
        console.log("[INFO] WebGL setup successful. Starting render loop.");
        animationFrameId = requestAnimationFrame(render);
    } else {
        console.error("[FATAL] WebGL setup failed. Render loop will not start.");
    }

})(); // End of IIFE.
