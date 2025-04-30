// Wrap everything in an Immediately Invoked Function Expression (IIFE)
// to avoid polluting the global scope unnecessarily, except for `window.updateShader`.
(function() {
    "use strict"; // Enable strict mode

    // --- DOM Element Check ---
    const webglCanvas = document.getElementById('webglCanvas');
    if (!webglCanvas) {
        console.error("WebGL Canvas element with id 'webglCanvas' not found!");
        return; // Stop script execution if canvas isn't found
    }

    // --- WebGL Context Initialization ---
    let gl = null; // Keep gl scoped within this IIFE
    try {
        webglCanvas.width = window.innerWidth;
        webglCanvas.height = window.innerHeight;
        // Try to get webgl2, fall back to webgl1 or experimental
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

    // Vertex Shader (GLSL 3.00 ES) - Simple pass-through
    const vertexShaderSource = `#version 300 es
        precision highp float;
        in vec4 a_position;
        void main() {
            gl_Position = a_position;
        }
    `;

    // Fragment Shader (GLSL 3.00 ES - Raymarched Mandelbulb Variation)
    // This is the shader that runs initially
    const fragmentShaderSource = `#version 300 es
        precision highp float;

        uniform float u_time;
        uniform vec2 u_resolution;
        out vec4 outColor;

        const int MAX_STEPS = 80;
        const float MAX_DIST = 100.0;
        const float SURFACE_DIST = 0.001;
        const float PI = 3.14159265359;

        float rand(vec2 co){
            return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
        }

        float sdSphere( vec3 p, float s ) {
            return length(p) - s;
        }

        float sdMandelbulb( vec3 pos ) {
            vec3 z = pos;
            float dr = 1.0;
            float r = 0.0;
            float power = 8.0 + 2.0 * sin(u_time * 0.2);
            for (int i = 0; i < 5; i++) {
                r = length(z);
                if (r > 2.0) break;
                float theta = acos(clamp(z.z / r, -1.0, 1.0));
                float phi = atan(z.y, z.x);
                dr = pow(r, power - 1.0) * power * dr + 1.0;
                float zr = pow(r, power);
                theta = theta * power + u_time * 0.5;
                phi = phi * power + u_time * 0.4;
                z = zr * vec3(sin(theta)*cos(phi), sin(phi)*sin(theta), cos(theta));
                z += pos;
            }
            return 0.5 * log(r) * r / dr;
        }

        float sceneSDF( vec3 p ) {
            float ground = p.y + 1.5;
            vec3 warped_p = p;
            warped_p.y += sin(p.x * 0.5 + u_time) * 0.2;
            warped_p.x += cos(p.z * 0.5 - u_time * 1.1) * 0.3;
            float fractal = sdMandelbulb(warped_p * (1.0 + 0.3 * sin(u_time * 0.1)));
            return min(ground, fractal);
        }

        vec3 calcNormal( vec3 p ) {
            float eps = SURFACE_DIST * 0.5;
            vec3 n = vec3(
                sceneSDF( vec3(p.x + eps, p.y, p.z) ) - sceneSDF( vec3(p.x - eps, p.y, p.z) ),
                sceneSDF( vec3(p.x, p.y + eps, p.z) ) - sceneSDF( vec3(p.x, p.y - eps, p.z) ),
                sceneSDF( vec3(p.x, p.y, p.z + eps) ) - sceneSDF( vec3(p.x, p.y, p.z - eps) )
            );
            return normalize(n + vec3(1e-6));
        }

        float rayMarch( vec3 ro, vec3 rd ) {
            float dO = 0.0;
            for( int i = 0; i < MAX_STEPS; i++ ) {
                vec3 p = ro + rd * dO;
                float dS = sceneSDF(p);
                if( dS < SURFACE_DIST * max(1.0, dO * 0.1) ) {
                     return dO;
                }
                dO += dS * (0.6 + 0.4 * rand(rd.xy + float(i)));
                if( dO > MAX_DIST ) {
                    return MAX_DIST;
                }
            }
            return MAX_DIST;
        }

        void main() {
            vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / min(u_resolution.x, u_resolution.y);
            vec3 ro = vec3(2.5 * cos(u_time * 0.3), 1.5 + sin(u_time * 0.2), 2.5 * sin(u_time * 0.3));
            vec3 target = vec3(0.0, 0.5, 0.0);
            vec3 camForward = normalize(target - ro);
            vec3 camRight = normalize(cross(vec3(0.0, 1.0, 0.0), camForward));
            vec3 camUp = cross(camForward, camRight);
            vec3 rd = normalize(uv.x * camRight + uv.y * camUp + 1.5 * camForward);

            float dist = rayMarch(ro, rd);
            vec3 col = vec3(0.0);

            if( dist < MAX_DIST ) {
                vec3 p = ro + rd * dist;
                vec3 n = calcNormal(p);
                vec3 lightPos = vec3(5.0 * sin(u_time * 0.6), 5.0, 5.0 * cos(u_time * 0.6));
                vec3 lightColor = vec3(1.0, 0.95, 0.9);
                vec3 lightDir = normalize(lightPos - p);
                vec3 viewDir = normalize(ro - p);
                vec3 halfwayDir = normalize(lightDir + viewDir);
                vec3 baseColor = vec3(0.6, 0.2, 0.8) + 0.4 * sin(p * 3.0 + u_time * 2.0);
                baseColor = mix(baseColor, vec3(0.1, 0.9, 0.5), smoothstep(-0.5, 0.5, n.y));
                baseColor = clamp(baseColor, 0.0, 1.0);
                float ambient = 0.2;
                float diffuse = max(dot(n, lightDir), 0.0) * 0.8;
                float specular = pow(max(dot(n, halfwayDir), 0.0), 32.0) * (0.5 + 0.5 * sin(u_time));
                col = baseColor * lightColor * (ambient + diffuse) + lightColor * specular;
                float fogAmount = smoothstep(0.0, MAX_DIST * 0.8, dist);
                col = mix(col, vec3(0.05, 0.0, 0.1), fogAmount);
            } else {
               col = vec3(0.1, 0.0, 0.2) + 0.2 * pow(max(0.0, dot(rd, vec3(0.0, 1.0, 0.0))), 2.0);
               col += 0.05 * rand(uv + fract(u_time));
            }

            col = pow(col, vec3(0.8, 0.9, 1.0));
            col += (rand(gl_FragCoord.xy) - 0.5) * 0.05;
            outColor = vec4(clamp(col, 0.0, 1.0), 1.0);
        }
    `; // End of fragmentShaderSource

    // --- WebGL Utility Functions ---
    function createShader(type, source) {
        const shader = gl.createShader(type);
        if (!shader) {
            throw new Error(`Failed to create shader (type: ${type})`);
        }
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            const shaderType = type === gl.VERTEX_SHADER ? 'Vertex' : 'Fragment';
            const infoLog = gl.getShaderInfoLog(shader);
            console.error(`>>> Shader compile error (${shaderType}):\n${infoLog}`);
            const lines = source.split('\n');
            const sourceWithLines = lines.map((line, index) => `${index + 1}: ${line}`).join('\n');
            console.error(`--- Shader Source (${shaderType}) ---\n${sourceWithLines}\n--------------------------`);
            gl.deleteShader(shader);
            throw new Error(`Shader compilation failed: ${shaderType}`);
        }
        return shader;
    }

    function createProgram(vertexShader, fragmentShader) {
        const program = gl.createProgram();
        if (!program) {
            throw new Error("Failed to create program");
        }
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            const infoLog = gl.getProgramInfoLog(program);
            console.error('>>> Program link error:', infoLog);
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
        // Detach shaders after successful linking
        gl.detachShader(program, vertexShader);
        gl.detachShader(program, fragmentShader);
        return program;
    }

    // --- WebGL State Variables ---
    let program = null;
    let positionAttributeLocation = -1;
    let timeUniformLocation = null;
    let resolutionUniformLocation = null;
    let positionBuffer = null;
    let animationFrameId = null;
    let startTime = performance.now();

    // --- Initialize WebGL Program and Buffers ---
    function setupWebGL() {
        let vs = null;
        let fs = null;
        try {
            vs = createShader(gl.VERTEX_SHADER, vertexShaderSource);
            fs = createShader(gl.FRAGMENT_SHADER, fragmentShaderSource); // Uses the main fragment shader source
            program = createProgram(vs, fs);

            // Get attribute/uniform locations
            positionAttributeLocation = gl.getAttribLocation(program, "a_position");
            timeUniformLocation = gl.getUniformLocation(program, "u_time");
            resolutionUniformLocation = gl.getUniformLocation(program, "u_resolution");

            // Basic check if locations are valid
            if (positionAttributeLocation === -1) console.warn("Attribute 'a_position' not found in shader program.");
            if (!timeUniformLocation) console.warn("Uniform 'u_time' not found in shader program.");
            if (!resolutionUniformLocation) console.warn("Uniform 'u_resolution' not found in shader program.");

            // Create buffer for the fullscreen quad positions
            positionBuffer = gl.createBuffer();
            if (!positionBuffer) throw new Error("Failed to create position buffer");
            gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
            const positions = new Float32Array([-1, 1, -1, -1, 1, 1, 1, -1]);
            gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

            return true; // Indicate successful setup

        } catch (error) {
            console.error(">>> Failed during WebGL setup:", error);
            // Clean up partial resources if error occurred
            if (program) gl.deleteProgram(program);
            if (vs) gl.deleteShader(vs);
            if (fs) gl.deleteShader(fs);
            if (positionBuffer) gl.deleteBuffer(positionBuffer);
            program = null; // Ensure program is null if setup failed
            return false; // Indicate setup failure
        } finally {
            // Delete shaders after program creation (whether successful or not)
            if (vs) gl.deleteShader(vs);
            if (fs) gl.deleteShader(fs);
        }
    } // End setupWebGL

    // --- Render Loop ---
    function render(now) {
        // Check if program is valid
        if (!program) {
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
            // Update the WebGL viewport to match the new canvas size
            gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
            // console.log(`Resized canvas to ${gl.canvas.width}x${gl.canvas.height}`);
        }

        // --- Prepare for Drawing ---
        gl.useProgram(program);

        // --- Set up Vertex Attributes ---
        if (positionAttributeLocation !== -1 && positionBuffer) {
            gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
            gl.enableVertexAttribArray(positionAttributeLocation);
            // Tell the attribute how to get data out of positionBuffer (ARRAY_BUFFER)
            gl.vertexAttribPointer(
                positionAttributeLocation, // location
                2,                     // size (num components per iteration, vec2)
                gl.FLOAT,              // type
                false,                 // normalize
                0,                     // stride (0 = use size * sizeof(type))
                0                      // offset (bytes from start of buffer)
            );
        } else {
            // Disable attribute if not used or buffer missing
            if (positionAttributeLocation !== -1) gl.disableVertexAttribArray(positionAttributeLocation);
        }

        // --- Set Uniforms ---
        if (timeUniformLocation) {
           gl.uniform1f(timeUniformLocation, time);
        }
        if (resolutionUniformLocation) {
           gl.uniform2f(resolutionUniformLocation, gl.canvas.width, gl.canvas.height);
        }

        // --- Draw the Quad ---
        // Draw 4 vertices using the bound buffer and TRIANGLE_STRIP mode
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        // --- Request Next Frame ---
        animationFrameId = requestAnimationFrame(render);
    } // End render

    // --- Function to Update Shader Dynamically ---
    // Expose this function to the global scope so it can be called from index.html
    // *** USING THE SIMPLIFIED TEMPLATE LITERAL FOR TESTING ***
    window.updateShader = function(newShaderCode) {
        if (!gl) {
            console.warn("WebGL context not available. Cannot update shader.");
            if(typeof showNotification === 'function') showNotification("WebGL inactive. Cannot update shader.");
            return;
        }
        console.log("Attempting shader update with new code (using simplified template)...");

        // Basic validation
        if (!newShaderCode || typeof newShaderCode !== 'string' || newShaderCode.indexOf('main()') === -1) {
             console.error("Invalid shader code provided: Missing main() function or not a string.");
             if(typeof showNotification === 'function') showNotification("Invalid shader code: Missing main().");
             console.error("Provided code:\n", newShaderCode);
             return;
        }

         // *** VERY SIMPLE TEMPLATE FOR DIAGNOSTICS ***
         const completeNewFragmentSource = `#version 300 es
            precision highp float;
            uniform float u_time;
            uniform vec2 u_resolution;
            out vec4 outColor;

            // Minimal common elements needed by almost any shader
            vec3 colBackground = vec3(0.0); // Simple background

            // --- User Provided Shader Code ---
            ${newShaderCode}
            // --- End User Code ---
        `;
        // console.log("Generated Shader Source for Update:\n", completeNewFragmentSource); // Uncomment for debugging

        let newVs = null;
        let newFs = null;
        let newProgram = null;
        try {
             // Recompile the vertex shader (it's simple, but good practice)
             newVs = createShader(gl.VERTEX_SHADER, vertexShaderSource);
             // Compile the new fragment shader
             newFs = createShader(gl.FRAGMENT_SHADER, completeNewFragmentSource); // Compile the simplified source
             // Link the new program
             newProgram = createProgram(newVs, newFs);

             console.log("New shader compiled and linked successfully (using simplified template).");

             // Stop the old animation loop before changing the program
             if (animationFrameId) {
                 cancelAnimationFrame(animationFrameId);
                 animationFrameId = null;
             }

             // Delete the old program *before* assigning the new one
             if (program) {
                 gl.deleteProgram(program);
                 console.log("Old program deleted.");
             }
             program = newProgram; // Assign the new program

             // Re-get all attribute and uniform locations for the *new* program
             positionAttributeLocation = gl.getAttribLocation(program, "a_position");
             timeUniformLocation = gl.getUniformLocation(program, "u_time");
             resolutionUniformLocation = gl.getUniformLocation(program, "u_resolution");

             // Optional: Check new locations for debugging
             if (positionAttributeLocation === -1) console.warn("New program missing 'a_position' attribute.");
             if (!timeUniformLocation) console.warn("New program missing 'u_time' uniform.");
             if (!resolutionUniformLocation) console.warn("New program missing 'u_resolution' uniform.");

             // Restart the render loop with the new program
             startTime = performance.now(); // Optionally reset start time
             animationFrameId = requestAnimationFrame(render);

             console.log("Shader update complete. Render loop restarted.");
             if(typeof showNotification === 'function') showNotification("SHADER UPDATE SUCCESSFUL (Simplified).");

        } catch (e) {
             console.error('>>> Shader update failed during compile/link (using simplified template):', e);
             // Clean up partially created resources from the failed update attempt
             if (newProgram) gl.deleteProgram(newProgram);
             if (newVs) gl.deleteShader(newVs);
             if (newFs) gl.deleteShader(newFs);
             // Do NOT delete the old 'program' if the update failed, keep it running
             if(typeof showNotification === 'function') showNotification(`SHADER UPDATE FAILED (Simplified): ${e.message}`);

             // If the render loop was stopped, restart it with the old program
             if (!animationFrameId && program) {
                 console.log("Restarting render loop with previous program after update failure.");
                 animationFrameId = requestAnimationFrame(render);
             }

        } finally {
             // Delete the new shaders regardless of success, as they are now linked (or failed)
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
    window.addEventListener('resize', () => {
        // The actual resizing logic is handled within the render loop check
        // This listener ensures responsiveness if the loop somehow stops temporarily
        // and helps trigger the check on resize events.
        if (!animationFrameId && program) {
            // If the loop isn't running but we have a program, request a frame
            // This might happen if the tab was hidden and the loop stopped
            console.log("Resize event: Requesting animation frame.");
            animationFrameId = requestAnimationFrame(render);
        }
    }, false); // Use passive: true? Might improve scroll perf slightly if listener is heavy.

})(); // Execute the IIFE
```

**Explanation of Changes:**

1.  **Clean Structure:** I've reviewed the overall structure, ensuring all function definitions (`setupWebGL`, `render`, `updateShader`, utility functions) and the main IIFE have correctly matched braces `{}` and parentheses `()`.
2.  **No Logic Change:** The core logic of the initial Mandelbulb shader and the simplified `updateShader` function remains the same as the previous attempt (`shader_js_fix_3`).
3.  **Comments:** Added/clarified comments for better readability.

**Next Steps:**

1.  Replace the *entire* content of your `shader.js` with this new version.
2.  Reload `index.html`. Check the console for any initial errors. The Mandelbulb should render.
3.  **Crucially, test the `shader` command again with a very simple input:**
    * Open the console.
    * Type: `shader void main() { outColor = vec4(0.0, 1.0, 0.0, 1.0); }` and press Enter.
    * Observe the console output. Does it succeed ("SHADER UPDATE SUCCESSFUL (Simplified).") or fail? If it fails, what is the exact error message and line number this time?

If this *still* fails with an `Unexpected identifier 'window'` error (or similar syntax error near line 471), then the issue is almost certainly *not* within the `shader.js` file itself, but potentially in how it's being loaded or interacting with other scripts in `index.html`, or even a browser caching issue. If it *succeeds*, then we know the problem was related to the complex string generation in the previous `updateShader` function, and we can carefully reintroduce the necessary helper functions and colors into the template liter
