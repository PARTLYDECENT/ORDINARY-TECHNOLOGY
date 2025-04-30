// Wrap everything in an Immediately Invoked Function Expression (IIFE)
// to avoid polluting the global scope unnecessarily, except for `window.updateShader`.
(function() {
    "use strict"; // Enable strict mode

    // --- WebGL Setup and Shader Logic ---
    // --- (Derived from sources 200-548) ---

    const webglCanvas = document.getElementById('webglCanvas');
    let gl = null; // Keep gl scoped within this IIFE

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

    // --- Shader Sources ---
    // Vertex Shader (GLSL 3.00 ES) - **MODIFIED**
    const vertexShaderSource = `#version 300 es
        precision highp float; // Precision needed in VS for GLSL 300 es
        in vec4 a_position;
        uniform float u_time; // Added time uniform for subtle effect

        // Simple noise function (optional, for more complex vertex effects)
        float hash( float n ) { return fract(sin(n)*43758.5453); }

        void main() {
            vec4 pos = a_position;
            // *** CRAZY MODIFICATION 1: Subtle vertex wobble based on time and vertex position ***
            // This adds a very slight, almost imperceptible ripple effect across the quad.
            // Increase the multiplier (0.005) for a more noticeable (and potentially nauseating) effect.
            pos.xy += vec2(cos(u_time * 2.0 + pos.x * 10.0), sin(u_time * 1.5 + pos.y * 10.0)) * 0.005 * hash(pos.x + pos.y);

            gl_Position = pos; // Pass modified position through
        }
    `;

    // Fragment Shader (GLSL 3.00 ES - REVISED: Raymarched Mandelbulb Variation) - **MODIFIED**
    const fragmentShaderSource = `#version 300 es
        precision highp float; // Precision qualifier required in fragment shaders

        // Uniforms: Inputs from JavaScript
        uniform float u_time;
        uniform vec2 u_resolution;

        // Output variable: Replaces gl_FragColor
        out vec4 outColor;

        // --- Constants ---
        const int MAX_STEPS = 60;      // Reduced steps for more glitchy/faster feel
        const float MAX_DIST = 150.0;    // Increased max distance
        const float SURFACE_DIST = 0.0005; // Tighter hit threshold
        const float PI = 3.14159265359;
        //const int FBM_OCTAVES = 5; // Keep for updateShader compatibility if needed elsewhere (removed from this shader)

        // --- Helper Functions ---
        // Basic random function
        float rand(vec2 co){ return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453); }
        // Rotation matrix
        mat2 rot(float a) { float s=sin(a), c=cos(a); return mat2(c,-s,s,c); }

        // --- SDF Definitions (Inspired by Inigo Quilez / Shader Bible) ---
        // Basic Sphere SDF
        float sdSphere( vec3 p, float s ) {
            return length(p)-s;
        }

        // Mandelbulb SDF variation - **MODIFIED** [cite: 246-251]
        float sdMandelbulb( vec3 pos ) {
            vec3 z = pos;
            float dr = 1.0;
            float r = 0.0;
            // *** CRAZY MODIFICATION 2: Extremely chaotic power animation ***
            float power = 8.0 + 6.0 * sin(u_time * 0.8 + cos(u_time * 0.3) * 5.0) + 2.0 * rand(pos.xy); // Wildly fluctuating power

            for (int i = 0; i < 6; i++) { // Slightly more iterations, can increase instability
                r = length(z);
                if (r > 4.0) break; // Increased bailout radius

                // Convert to polar coordinates
                float theta = acos(clamp(z.z/r, -1.0, 1.0)); // Clamp for safety
                float phi = atan(z.y, z.x);
                dr = pow(r, power - 1.0) * power * dr + 1.0;

                // Scale and rotate
                float zr = pow(r, power);
                // *** CRAZY MODIFICATION 3: More aggressive time-based twisting/folding ***
                theta = theta * power + u_time * 1.5 * cos(float(i)*0.5); // Twist depends on iteration
                phi = phi * power + u_time * 1.2 * sin(float(i)*0.8);   // Different twist axis

                // Convert back to Cartesian coordinates and add original position
                z = zr * vec3(sin(theta)*cos(phi), sin(phi)*sin(theta), cos(theta));
                // *** CRAZY MODIFICATION 4: Add position offset modulated by time and noise ***
                z += pos + 0.1 * sin(u_time * 3.0 + pos * 5.0) * rand(pos.xz + float(i));
            }
            // Distance estimation [cite: 251] - slightly modified
            return 0.4 * log(r*r) * r / dr; // Using r*r in log for different falloff
        }

        // Scene SDF: Combining shapes - **MODIFIED** [cite: 427-429]
        float sceneSDF( vec3 p ) {
            // *** CRAZY MODIFICATION 5: Ground plane is now a chaotic wavy surface ***
            float ground = p.y + 1.5 + 0.3 * sin(p.x * 2.0 + u_time * 3.0) * cos(p.z * 3.0 - u_time * 2.0);
            ground += 0.1 * rand(p.xz * 5.0 + u_time); // Add noise to ground

            // *** CRAZY MODIFICATION 6: Apply domain repetition/distortion before fractal calculation ***
            vec3 q = p;
            q.xz = mod(q.xz, 4.0)-2.0; // Repeat domain
            q.xy *= rot(u_time * 0.1 + p.z * 0.1); // Rotate domain based on time and Z

            // *** CRAZY MODIFICATION 7: Fractal position/scale wobbles more intensely ***
            q.y += sin(q.x * 1.5 + u_time * 2.1) * 0.4; // More wobble
            q.x += cos(q.z * 1.2 - u_time * 2.5) * 0.5;
            float fractalScale = 1.0 + 0.6 * sin(u_time * 0.4 + length(p)*0.2); // Scale oscillates based on time and distance from origin
            float fractal = sdMandelbulb(q * fractalScale);

            // *** CRAZY MODIFICATION 8: Combine with a moving/distorting sphere using smooth min ***
            vec3 spherePos = vec3(sin(u_time * 1.1)*1.5, 0.5 + cos(u_time*0.9)*0.5, cos(u_time*1.3)*1.5);
            float sphereSize = 0.3 + 0.2 * sin(u_time * 2.5);
            float sphereDist = sdSphere(p - spherePos, sphereSize);

            // Smooth minimum function (IQ) - blends shapes together
            float k = 0.5 + 0.4 * sin(u_time); // Make blend factor oscillate crazily
            float h = clamp( 0.5 + 0.5*(fractal-sphereDist)/k, 0.0, 1.0 );
            float blendDist = mix( fractal, sphereDist, h ) - k*h*(1.0-h);

            // Combine ground and blended shapes
            return min(ground, blendDist); // Union [cite: 429]
        }

        // --- Normal Calculation (Gradient of SDF) [cite: 82, 481] ---
        // (Using a slightly larger epsilon might capture details better on noisy surfaces)
        vec3 calcNormal( vec3 p ) {
            vec2 e = vec2(SURFACE_DIST * 2.0, 0.0); // Slightly larger epsilon
            return normalize( vec3( sceneSDF(p + e.xyy()) - sceneSDF(p - e.xyy()), // X gradient [cite: 484]
                                  sceneSDF(p + e.yxy()) - sceneSDF(p - e.yxy()), // Y gradient [cite: 484]
                                  sceneSDF(p + e.yyx()) - sceneSDF(p - e.yyx())  // Z gradient [cite: 484]
                                ));
        }

        // --- Raymarching Function (Sphere Tracing) - **MODIFIED** [cite: 441, 457] ---
        float rayMarch( vec3 ro, vec3 rd ) {
            float dO = 0.0; // Distance from Origin [cite: 443]
            float totalDist = 0.0; // Keep track for effects
            for( int i=0; i < MAX_STEPS; i++ ) {
                vec3 p = ro + rd * dO;  // Current position [cite: 445]
                float dS = sceneSDF(p); // Distance to Scene [cite: 446]

                // *** CRAZY MODIFICATION 9: Dynamic hit threshold based on distance and noise ***
                float hitThreshold = SURFACE_DIST * (1.0 + dO * 0.1) * (0.8 + 0.4 * rand(rd.xy + float(i)));
                if( dS < hitThreshold ) { // Hit condition (relative epsilon) [cite: 447]
                     // *** CRAZY MODIFICATION 10: Return distance modulated by iteration count for banding effect ***
                     return dO - float(i) * 0.001; // Subtract small amount based on steps taken
                }

                // *** CRAZY MODIFICATION 11: Aggressive step multiplier with randomness ***
                dO += dS * (0.4 + 0.8 * rand(rd.xy + float(i) + u_time)); // Step forward, very noisy [cite: 448]

                totalDist += dS; // Accumulate distance for potential effects

                if( dO > MAX_DIST ) { // Missed [cite: 451]
                    return MAX_DIST;
                }
            }
            return MAX_DIST; // Missed
        }

        // --- Main Shader Logic ---
        void main() {
            // Normalized device coordinates, aspect corrected, origin center [cite: 138]
            vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / min(u_resolution.x, u_resolution.y);
            vec2 originalUV = gl_FragCoord.xy / u_resolution.xy; // Keep original UVs if needed

            // --- Camera Setup [cite: 233, 474] ---
            // *** CRAZY MODIFICATION 12: Camera zooms in/out wildly and jitters ***
            float zoom = 1.5 + 0.5 * sin(u_time * 1.5);
            vec3 ro = vec3(zoom * cos(u_time * 0.6), 1.0 + sin(u_time * 0.4)*0.5, zoom * sin(u_time * 0.6)); // Ray Origin (animated) [cite: 467]
            ro += (vec3(rand(uv+u_time), rand(uv-u_time*0.5), rand(uv+u_time*0.8)) - 0.5) * 0.05; // Camera jitter

            vec3 target = vec3(0.0, 0.2, 0.0); // Slightly lower target
            vec3 camF = normalize(target - ro); // Forward
            vec3 camR = normalize(cross(vec3(0.0, 1.0, 0.0), camF)); // Right
            vec3 camU = cross(camF, camR); // Up
            // Calculate Ray Direction (perspective) [cite: 139, 140, 468]
            // *** CRAZY MODIFICATION 13: Fisheye / distorted perspective ***
            vec2 distortedUV = uv * (1.0 + dot(uv,uv) * (0.1 + 0.1 * sin(u_time))); // Lens distortion
            vec3 rd = normalize(distortedUV.x * camR + distortedUV.y * camU + (1.2 + 0.3*cos(u_time)) * camF); // Adjust FOV dynamically

            // --- Raymarch the scene ---
            float dist = rayMarch(ro, rd); // [cite: 469]

            // --- Shading [cite: 476] ---
            vec3 col = vec3(0.0); // Background
            if( dist < MAX_DIST ) { // Hit [cite: 470]
                vec3 p = ro + rd * dist; // Hit position [cite: 471]
                vec3 n = calcNormal(p); // Normal [cite: 478, 485]

                // Lighting (simple Blinn-Phong-ish) [cite: 488, 494]
                // *** CRAZY MODIFICATION 14: Light position jumps around erratically ***
                vec3 lightPos = vec3(5.0 * sin(u_time * 3.6 + p.x), 3.0 + 2.0 * cos(u_time*4.1 + p.y), 5.0 * cos(u_time * 2.9 + p.z)); // Hyperactive light
                vec3 lightDir = normalize(lightPos - p); // [cite: 504]
                vec3 viewDir = normalize(ro - p); // [cite: 504]
                vec3 halfwayDir = normalize(lightDir + viewDir); // [cite: 501]

                // *** CRAZY MODIFICATION 15: Material Colors based on everything imaginable ***
                vec3 baseColor = vec3(0.5 + 0.5 * sin(p.x * 5.0 + u_time * 3.0),
                                      0.5 + 0.5 * cos(p.y * 6.0 - u_time * 2.5),
                                      0.5 + 0.5 * sin(p.z * 7.0 + u_time * 4.0));
                baseColor *= 0.6 + 0.4 * rand(p.xy); // Modulate by noise
                baseColor = mix(baseColor, vec3(rand(p.yz), rand(p.zx), rand(p.xy)), smoothstep(-0.8, 0.8, n.y * sin(u_time*5.0))); // Color based on normal Y and time
                baseColor = mix(baseColor, vec3(1.0,0.0,1.0), pow(abs(dot(n,rd)), 5.0)); // Rim light effect based on view angle, crazy color
                baseColor = clamp(abs(sin(baseColor * 3.0 + u_time)), 0.0, 1.0); // Apply trigonometric function for color banding/pulsing

                float ambient = 0.1 + 0.1 * rand(p.xz); // Noisy ambient [cite: 490]
                float diffuse = max(dot(n, lightDir), 0.0) * (0.5 + 0.5*rand(p.yz+u_time)); // Noisy diffuse [cite: 491]
                // *** CRAZY MODIFICATION 16: Specular changes color and intensity wildly ***
                float specIntensity = pow(max(dot(n, halfwayDir), 0.0), mix(8.0, 64.0, rand(p.xy-u_time))); // Random glossiness [cite: 502]
                vec3 specColor = vec3(1.0, 0.5, 0.2) * (0.5 + 0.5 * sin(u_time * 10.0 + p.x * 5.0)); // Color shifting specular
                float specular = specIntensity * (1.0 + sin(u_time * 5.0 + length(p)*2.0)); // Pulsating specular intensity

                col = baseColor * (ambient + diffuse) + specColor * specular;

                // *** CRAZY MODIFICATION 17: Fog color pulses and density depends on normal ***
                float fogAmount = smoothstep(0.0, MAX_DIST * 0.6, dist * (1.0 + dot(n, viewDir)*0.5)); // Fog depends on normal orientation [cite: 619, 621]
                vec3 fogColor = vec3(0.1, 0.0, 0.2) * (0.5 + 0.5 * cos(u_time * 3.0)); // Pulsating fog color
                col = mix(col, fogColor, fogAmount); // Mix with fog [cite: 622]

            } else {
                // Background Sky - **MODIFIED** [cite: 578]
                // *** CRAZY MODIFICATION 18: Hyper-complex noisy sky ***
                vec2 skyUV = rd.xy * (1.0 / (abs(rd.z)+0.1)); // Pseudo-spherical mapping
                float bgNoise = 0.0;
                float amp = 0.5;
                mat2 m = rot(u_time * 0.1);
                 for (int k=0; k<4; k++) { // 4 layers of noise
                     bgNoise += rand(skyUV * float(k+1) * 2.0 + u_time * 0.2 * float(k)) * amp;
                     amp *= 0.5;
                     skyUV *= m; // Rotate between layers
                 }
                col = vec3(0.05, 0.0, 0.1) + vec3(0.1, 0.2, 0.4) * bgNoise; // Base color + noise layers
                col += 0.3 * pow(max(0.0, dot(rd, normalize(vec3(sin(u_time), 0.8, cos(u_time))))), 5.0); // Moving sun/glow
                col += 0.05 * rand(uv + fract(u_time*10.0)); // Add fine grain noise
            }

            // Final color correction / effects - **MODIFIED**
            // *** CRAZY MODIFICATION 19: Color grading, vignette, and noise ***
            col = pow(col, vec3(1.0 / (1.5 + 0.5*sin(u_time)), 1.0 / (1.5 + 0.5*cos(u_time)), 1.1)); // Oscillating gamma correction
            float vignette = smoothstep(0.8, 0.3, length(uv * (1.0 + 0.2*sin(u_time*0.5)))); // Pulsating vignette
            col *= vignette;
            col += (rand(gl_FragCoord.xy + u_time)-0.5)*0.08; // More intense noise grain

            // *** CRAZY MODIFICATION 20: Chromatic Aberration (Simplified Fake) ***
            // True chromatic aberration requires sampling neighboring pixels (e.g., using texture lookups),
            // which isn't directly possible in this single-pass shader structure without textures.
            // This is a *fake* effect that shifts colors radially based on UV distance.
            float caAmount = 0.005 + 0.003 * sin(u_time*2.0); // Amount of shift oscillates
            vec3 caColorShift = vec3(length(uv) * 0.1, 0.0, -length(uv) * 0.1) * caAmount * 20.0; // Simple radial color shift amount
            col += caColorShift; // Add the color shift


            // Ensure alpha is 1.0
            outColor = vec4(clamp(col, 0.0, 1.0), 1.0); // [cite: 473]
        }
    `; // End of fragmentShaderSource

    // --- WebGL Utility Functions ---
    // (createShader, createProgram functions remain exactly the same as your original file)
     function createShader(type, source) {
        const shader = gl.createShader(type);
        if (!shader) { throw new Error(`Failed to create shader (type: ${type})`); }
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) { // [cite: 638]
            const shaderType = type === gl.VERTEX_SHADER ? 'Vertex' : 'Fragment';
            const infoLog = gl.getShaderInfoLog(shader); // [cite: 638]
            console.error(`>>> Shader compile error (${shaderType}):\n${infoLog}`);
            // Log source with line numbers for easier debugging
            const lines = source.split('\n');
            const sourceWithLines = lines.map((line, index) => `${index + 1}: ${line}`).join('\n');
            console.error(`--- Shader Source (${shaderType}) ---\n${sourceWithLines}\n--------------------------`);
            gl.deleteShader(shader);
            throw new Error(`Shader compilation failed: ${shaderType}`);
        }
        return shader;
    }

    function createProgram(vertexShader, fragmentShader) {
        const program = gl.createProgram(); // [cite: 639]
        if (!program) { throw new Error("Failed to create program"); }
        gl.attachShader(program, vertexShader); // [cite: 639]
        gl.attachShader(program, fragmentShader); // [cite: 639]
        gl.linkProgram(program); // [cite: 639]
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) { // [cite: 639]
            const infoLog = gl.getProgramInfoLog(program); // [cite: 639]
            console.error('>>> Program link error:', infoLog);
            // Log info about attached shaders if linking fails
            const shaders = gl.getAttachedShaders(program);
            if (shaders) {
                 shaders.forEach(shader => {
                     const type = gl.getShaderParameter(shader, gl.SHADER_TYPE);
                     const shaderType = type === gl.VERTEX_SHADER ? 'Vertex' : 'Fragment';
                     console.error(`--- Attached ${shaderType} Shader Info Log ---\n${gl.getShaderInfoLog(shader)}`);
                 });
            }
            gl.deleteProgram(program);
            throw new Error("Program linking failed");
        }
        // Detaching shaders after successful linking is good practice [cite: 640]
        gl.detachShader(program, vertexShader);
        gl.detachShader(program, fragmentShader);
        return program;
    }

    // --- WebGL State Variables ---
    // (program, attribute/uniform locations, buffer, animationFrameId, startTime remain the same)
    let program = null;
    let positionAttributeLocation = -1;
    let timeUniformLocation = null;
    let resolutionUniformLocation = null;
    let positionBuffer = null;
    let animationFrameId = null; // Keep track of animation frame request
    let startTime = performance.now();

    // --- Initialize WebGL Program and Buffers ---
    // (setupWebGL remains functionally the same, using the new shader sources)
    function setupWebGL() {
        let vs = null;
        let fs = null;
        try {
            vs = createShader(gl.VERTEX_SHADER, vertexShaderSource); // [cite: 637] Uses the MODIFIED vertex shader
            fs = createShader(gl.FRAGMENT_SHADER, fragmentShaderSource); // [cite: 637] Uses the MODIFIED fragment shader source
            program = createProgram(vs, fs); // [cite: 26]

            // Get attribute/uniform locations [cite: 27, 644]
            positionAttributeLocation = gl.getAttribLocation(program, "a_position");
            timeUniformLocation = gl.getUniformLocation(program, "u_time"); // Location needed for both shaders now
            resolutionUniformLocation = gl.getUniformLocation(program, "u_resolution");

            // Basic check if locations are valid
            if (positionAttributeLocation === -1) console.warn("Attribute 'a_position' not found in shader program.");
            if (!timeUniformLocation) console.warn("Uniform 'u_time' not found in shader program (needed by VS and FS)."); // Updated warning
            if (!resolutionUniformLocation) console.warn("Uniform 'u_resolution' not found in shader program.");

            // Create buffer for the fullscreen quad positions [cite: 642]
            positionBuffer = gl.createBuffer();
            if (!positionBuffer) throw new Error("Failed to create position buffer");
            gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
            // Use TRIANGLE_STRIP: (-1,1), (-1,-1), (1,1), (1,-1) covers the screen
            const positions = new Float32Array([-1, 1, -1, -1, 1, 1, 1, -1]);
            gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW); // [cite: 654]

            return true; // Indicate successful setup

        } catch (error) {
            console.error(">>> Failed during WebGL setup:", error);
            // Clean up partial resources if error occurred
            if (program) gl.deleteProgram(program);
            if (vs) gl.deleteShader(vs); // [cite: 640]
            if (fs) gl.deleteShader(fs); // [cite: 640]
            if (positionBuffer) gl.deleteBuffer(positionBuffer);
            program = null; // Ensure program is null if setup failed
            return false; // Indicate setup failure
        } finally {
            // Delete shaders after program creation (whether successful or not)
            // It's safe to delete them here as they are linked to the program
            if (vs) gl.deleteShader(vs);
            if (fs) gl.deleteShader(fs);
        }
    }

    // --- Render Loop ---
    // (render function remains functionally the same)
    function render(now) {
        if (!program) { // If program is null (setup failed or deleted), stop rendering
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
            return;
        }

        // Calculate time elapsed
        let time = (now - startTime) * 0.001; // Time in seconds

        // --- Canvas Resize Check ---
        const currentWidth = window.innerWidth;
        const currentHeight = window.innerHeight;
        if (webglCanvas.width !== currentWidth || webglCanvas.height !== currentHeight) {
            webglCanvas.width = currentWidth;
            webglCanvas.height = currentHeight;
            gl.viewport(0, 0, gl.canvas.width, gl.canvas.height); // Update viewport
            console.log(`Resized canvas to ${gl.canvas.width}x${gl.canvas.height}`);
        }

        // --- Prepare for Drawing ---
        gl.useProgram(program); // [cite: 646]

        // --- Set up Vertex Attributes --- [cite: 27]
        if (positionAttributeLocation !== -1 && positionBuffer) {
            gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
            gl.enableVertexAttribArray(positionAttributeLocation);
            gl.vertexAttribPointer( // [cite: 654]
                positionAttributeLocation, // location
                2,                     // size (num components per iteration, vec2)
                gl.FLOAT,              // type
                false,                 // normalize
                0,                     // stride (0 = use size * sizeof(type))
                0                      // offset (bytes from start of buffer)
            );
        } else {
            if (positionAttributeLocation !== -1) gl.disableVertexAttribArray(positionAttributeLocation);
        }

        // --- Set Uniforms --- [cite: 645]
        if (timeUniformLocation) {
           gl.uniform1f(timeUniformLocation, time); // Time uniform used by both shaders now
        }
        if (resolutionUniformLocation) {
           gl.uniform2f(resolutionUniformLocation, gl.canvas.width, gl.canvas.height);
        }

        // --- Draw the Quad ---
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); // [cite: 655]

        // --- Request Next Frame ---
        animationFrameId = requestAnimationFrame(render);
    }

    // --- Function to Update Shader Dynamically ---
    // (updateShader function remains functionally the same, uses the *original* simple vertex shader source
    // but compiles the user's new fragment shader source against it)
    // Expose this function to the global scope so it can be called from index.html
    window.updateShader = function(newShaderCode) {
        if (!gl) {
            console.warn("WebGL context not available. Cannot update shader.");
            if(typeof showNotification === 'function') showNotification("WebGL inactive. Cannot update shader.");
            return;
        }
        console.log("Attempting shader update with new code...");

        // Basic validation
        if (!newShaderCode || typeof newShaderCode !== 'string' || newShaderCode.indexOf('main()') === -1) {
             console.error("Invalid shader code provided: Missing main() function or not a string.");
             if(typeof showNotification === 'function') showNotification("Invalid shader code: Missing main().");
             console.error("Provided code:\n", newShaderCode);
             return;
        }

        // Construct the full source for the new fragment shader, including essential parts
        // NOTE: This template remains relatively simple to provide a stable base for user code.
        // It includes common uniforms and basic helper functions they might expect.
        const completeNewFragmentSource = `#version 300 es
            precision highp float;
            uniform float u_time;
            uniform vec2 u_resolution;
            out vec4 outColor; // Standard output

            // --- Include Common Helper Functions ---
            // Basic random function (often useful)
            float rand(vec2 co){ return fract(sin(dot(co.xy,vec2(12.9898,78.233)))*43758.5453); }
            // Basic hash function (alternative noise basis)
            float hash(float n) { return fract(sin(n) * 43758.5453); }
            // Rotation matrix (sometimes useful)
            mat2 rot(float a) { float s=sin(a), c=cos(a); return mat2(c,-s,s,c); }
            // --- END Helper Functions ---

            // --- User Provided Shader Code ---
            ${newShaderCode}
            // --- End User Code ---
        `; // Added semicolon for safety

        // **IMPORTANT**: Use the *original* simple vertex shader for updates.
        // Modifying the vertex shader dynamically based on user fragment shader input
        // is complex and usually not desired. We want a stable vertex stage.
        const simpleVertexShaderSource = `#version 300 es
            precision highp float;
            in vec4 a_position;
            // No time uniform needed here for the update function's VS
            void main() {
                gl_Position = a_position; // Pass position through directly
            }
        `; // Added semicolon for safety


        let newVs = null;
        let newFs = null;
        let newProgram = null;
        try {
             // Removed comment from directly above this line
             newVs = createShader(gl.VERTEX_SHADER, simpleVertexShaderSource); // Line ~601
             // Compile the new fragment shader (user code + template)
             newFs = createShader(gl.FRAGMENT_SHADER, completeNewFragmentSource);
             // Link the new program
             newProgram = createProgram(newVs, newFs);

             // --- Success! Switch to the new program ---
             console.log("New shader compiled and linked successfully.");

             // Stop the old animation loop
             if (animationFrameId) { cancelAnimationFrame(animationFrameId); animationFrameId = null; }

             // Delete the old program *before* assigning the new one
             if (program) { gl.deleteProgram(program); console.log("Old program deleted."); }
             program = newProgram; // Assign the new program

             // Re-get all attribute and uniform locations for the *new* program
             positionAttributeLocation = gl.getAttribLocation(program, "a_position");
             timeUniformLocation = gl.getUniformLocation(program, "u_time"); // Still get time for the new FS
             resolutionUniformLocation = gl.getUniformLocation(program, "u_resolution");

             // Optional: Check new locations
             if (positionAttributeLocation === -1) console.warn("New program missing 'a_position' attribute.");
             if (!timeUniformLocation) console.warn("New program missing 'u_time' uniform (may be needed by user fragment shader)."); // Adjusted warning
             if (!resolutionUniformLocation) console.warn("New program missing 'u_resolution' uniform.");

             // Restart the render loop with the new program
             startTime = performance.now(); // Optionally reset start time
             animationFrameId = requestAnimationFrame(render);

             console.log("Shader update complete. Render loop restarted.");
              if(typeof showNotification === 'function') showNotification("SHADER UPDATE SUCCESSFUL.");

        } catch (e) {
             console.error('>>> Shader update failed during compile/link:', e);
             // Clean up partially created resources from the failed update attempt
             if (newProgram) gl.deleteProgram(newProgram);
             if (newVs) gl.deleteShader(newVs);
             if (newFs) gl.deleteShader(newFs);
             // Do NOT delete the old 'program' if the update failed
             if(typeof showNotification === 'function') showNotification(`SHADER UPDATE FAILED: ${e.message}`);

             // If the render loop was stopped, restart it with the old program
             if (!animationFrameId && program) {
                 console.log("Restarting render loop with previous program after update failure.");
                 animationFrameId = requestAnimationFrame(render);
             }

        } finally {
             // Delete the new shaders regardless of success
             // Shaders are now part of the program object and don't need separate deletion
             // if linking was successful. If linking failed, they should be deleted.
             // The createProgram function handles detaching, and we delete the shader objects
             // in the setupWebGL and this update function's try/catch/finally blocks.
             if (newVs) gl.deleteShader(newVs);
             if (newFs) gl.deleteShader(newFs);
        }
    }; // End window.updateShader

    // --- Start WebGL ---
    if (setupWebGL()) {
        // Start the rendering loop only if setup was successful
        console.log("WebGL setup successful. Starting render loop.");
        animationFrameId = requestAnimationFrame(render);
    } else {
        console.error("WebGL setup failed. Render loop will not start.");
        // Ensure static background as fallback
        if(document.body) document.body.style.backgroundColor = '#050511';
    }

    // --- Resize Listener ---
    // (Resize listener remains the same, handles viewport update within render loop)
    window.addEventListener('resize', () => {
        // The actual resizing logic is handled within the render loop check.
        // This listener ensures that if the loop somehow stopped (e.g., error during update),
        // a resize event might trigger a single frame render to update the viewport.
        if (!animationFrameId && program && gl) {
             console.log("Resize event detected while loop inactive. Requesting single frame for resize.");
             // Render one frame immediately to apply viewport changes.
             // This doesn't restart the loop if it was intentionally stopped or failed permanently.
             render(performance.now());
        }
    }, false);

})(); // Execute the IIFE
```

I've made the following minor changes within the `window.updateShader` function:

1.  Added semicolons after the closing backtick (`) of the `completeNewFragmentSource` and `simpleVertexShaderSource` template literals.
2.  Removed the comment `// Recompile the *simple* vertex shader` that was directly above the line causing the error.

Please test this version. If the error persists or changes, the problem might be more subtle or potentially related to the environment where the code is runni
