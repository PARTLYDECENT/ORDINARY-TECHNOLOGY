// Wrap everything in an Immediately Invoked Function Expression (IIFE)
// to avoid polluting the global scope unnecessarily, except for `window.updateShader`.
(function() {
    "use strict"; // Enable strict mode

    // --- WebGL Setup and Shader Logic ---

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
    // Vertex Shader (GLSL 3.00 ES)
    const vertexShaderSource = `#version 300 es
        precision highp float; // Precision needed in VS for GLSL 300 es
        in vec4 a_position;
        void main() {
            gl_Position = a_position; // Pass position through
        }
    `;

    // Fragment Shader (GLSL 3.00 ES - REVISED: Raymarched Mandelbulb Variation)
    const fragmentShaderSource = `#version 300 es
        precision highp float; // Precision qualifier required in fragment shaders

        // Uniforms: Inputs from JavaScript
        uniform float u_time;
        uniform vec2 u_resolution;

        // Output variable: Replaces gl_FragColor
        out vec4 outColor;

        // --- Constants ---
        const int MAX_STEPS = 80;        // Increased steps for potentially better quality
        const float MAX_DIST = 100.0;      // Max distance to march
        const float SURFACE_DIST = 0.001; // Hit threshold (epsilon)
        const float PI = 3.14159265359;
        const int FBM_OCTAVES = 5; // Keep for updateShader compatibility if needed elsewhere

        // --- Helper Functions ---
        // Basic random function
        float rand(vec2 co){ return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453); }

        // --- SDF Definitions (Inspired by Inigo Quilez / Shader Bible) ---
        // Basic Sphere SDF
        float sdSphere( vec3 p, float s ) {
            return length(p)-s;
        }

        // Mandelbulb SDF variation
        float sdMandelbulb( vec3 pos ) {
            vec3 z = pos;
            float dr = 1.0;
            float r = 0.0;
            float power = 8.0 + 2.0 * sin(u_time * 0.2); // Unhinged: Power animates wildly

            for (int i = 0; i < 5; i++) { // Lower iterations for performance/glitchiness
                r = length(z);
                if (r > 2.0) break; // Bailout

                // Convert to polar coordinates
                float theta = acos(clamp(z.z/r, -1.0, 1.0)); // Clamp for safety
                float phi = atan(z.y, z.x);
                dr = pow(r, power - 1.0) * power * dr + 1.0;

                // Scale and rotate
                float zr = pow(r, power);
                theta = theta * power + u_time * 0.5; // Add time-based twist
                phi = phi * power + u_time * 0.4;

                // Convert back to Cartesian coordinates and add original position
                z = zr * vec3(sin(theta)*cos(phi), sin(phi)*sin(theta), cos(theta));
                z += pos;
            }
            // Distance estimation
            return 0.5 * log(r) * r / dr;
        }

        // Scene SDF: Combining shapes
        float sceneSDF( vec3 p ) {
            float ground = p.y + 1.5; // Simple plane
            p.y += sin(p.x * 0.5 + u_time) * 0.2; // Wobble the fractal
            p.x += cos(p.z * 0.5 - u_time * 1.1) * 0.3;
            float fractal = sdMandelbulb(p * (1.0 + 0.3 * sin(u_time * 0.1))); // Scale oscillates
            return min(ground, fractal); // Union
        }

        // --- Normal Calculation (Gradient of SDF) --- *** FIXED ***
        vec3 calcNormal( vec3 p ) {
            float eps = SURFACE_DIST * 0.5; // Use a small epsilon based on surface distance
            vec3 n = vec3(
                sceneSDF( vec3(p.x+eps, p.y, p.z) ) - sceneSDF( vec3(p.x-eps, p.y, p.z) ), // Difference along X
                sceneSDF( vec3(p.x, p.y+eps, p.z) ) - sceneSDF( vec3(p.x, p.y-eps, p.z) ), // Difference along Y
                sceneSDF( vec3(p.x, p.y, p.z+eps) ) - sceneSDF( vec3(p.x, p.y, p.z-eps) )  // Difference along Z
            );
            return normalize(n);
        }

        // --- Raymarching Function (Sphere Tracing) ---
        float rayMarch( vec3 ro, vec3 rd ) {
            float dO = 0.0; // Distance from Origin
            for( int i=0; i < MAX_STEPS; i++ ) {
                vec3 p = ro + rd * dO;  // Current position
                float dS = sceneSDF(p); // Distance to Scene
                // Use a slightly larger factor for the relative epsilon to avoid artifacts
                if( dS < SURFACE_DIST * max(1.0, dO * 0.1) ) { // Hit condition (relative epsilon)
                     return dO;
                }
                dO += dS * (0.6 + 0.4 * rand(rd.xy + float(i))); // Step forward, add some noise
                if( dO > MAX_DIST ) { // Missed
                    return MAX_DIST;
                }
            }
            return MAX_DIST; // Missed
        }

        // --- Main Shader Logic ---
        void main() {
            // Normalized device coordinates, aspect corrected, origin center
            vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / min(u_resolution.x, u_resolution.y);
            vec2 originalUV = gl_FragCoord.xy / u_resolution.xy; // Keep original UVs if needed

            // --- Camera Setup ---
            vec3 ro = vec3(2.5 * cos(u_time * 0.3), 1.5 + sin(u_time * 0.2), 2.5 * sin(u_time * 0.3)); // Ray Origin (animated)
            vec3 target = vec3(0.0, 0.5, 0.0);
            vec3 camF = normalize(target - ro); // Forward
            vec3 camR = normalize(cross(vec3(0.0, 1.0, 0.0), camF)); // Right
            vec3 camU = cross(camF, camR); // Up
            // Calculate Ray Direction (perspective)
            vec3 rd = normalize(uv.x * camR + uv.y * camU + 1.5 * camF); // Adjust 1.5 for FOV

            // --- Raymarch the scene ---
            float dist = rayMarch(ro, rd);

            // --- Shading ---
            vec3 col = vec3(0.0); // Background
            if( dist < MAX_DIST ) { // Hit
                vec3 p = ro + rd * dist; // Hit position
                vec3 n = calcNormal(p); // Normal

                // Lighting (simple Blinn-Phong-ish)
                vec3 lightPos = vec3(5.0 * sin(u_time * 0.6), 5.0, 5.0 * cos(u_time * 0.6)); // Animated light
                vec3 lightDir = normalize(lightPos - p);
                vec3 viewDir = normalize(ro - p);
                vec3 halfwayDir = normalize(lightDir + viewDir);

                // Unhinged Material Colors based on position/normal/time
                vec3 baseColor = vec3(0.6, 0.2, 0.8) + 0.4 * sin(p * 3.0 + u_time * 2.0);
                baseColor = mix(baseColor, vec3(0.1, 0.9, 0.5), smoothstep(-0.5, 0.5, n.y)); // Color based on normal Y
                baseColor = clamp(baseColor, 0.0, 1.0); // Ensure valid color range

                float ambient = 0.2;
                float diffuse = max(dot(n, lightDir), 0.0) * 0.8;
                float specular = pow(max(dot(n, halfwayDir), 0.0), 32.0) * (0.5 + 0.5 * sin(u_time)); // Pulsating specular

                col = baseColor * (ambient + diffuse) + vec3(1.0) * specular;

                // Cheap distance fog
                float fogAmount = smoothstep(0.0, MAX_DIST * 0.8, dist);
                col = mix(col, vec3(0.05, 0.0, 0.1), fogAmount); // Mix with dark purple fog

            } else {
               // Background Sky - procedural noise
               col = vec3(0.1, 0.0, 0.2) + 0.2 * pow(max(0.0, dot(rd, vec3(0.0, 1.0, 0.0))), 2.0); // Simple gradient + up-vector glow
               col += 0.05 * rand(uv + fract(u_time)); // Add some noise
            }

            // Final color correction / effects
            col = pow(col, vec3(0.8, 0.9, 1.0)); // Color grading tweak
            col += (rand(gl_FragCoord.xy)-0.5)*0.05; // Noise grain

            // Ensure alpha is 1.0
            outColor = vec4(clamp(col, 0.0, 1.0), 1.0);
        }
    `; // End of fragmentShaderSource

    // --- WebGL Utility Functions ---
    // (createShader, createProgram functions remain exactly the same)
     function createShader(type, source) {
        const shader = gl.createShader(type);
        if (!shader) { throw new Error(`Failed to create shader (type: ${type})`); }
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            const shaderType = type === gl.VERTEX_SHADER ? 'Vertex' : 'Fragment';
            const infoLog = gl.getShaderInfoLog(shader);
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
        const program = gl.createProgram();
        if (!program) { throw new Error("Failed to create program"); }
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            const infoLog = gl.getProgramInfoLog(program);
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
        // Detaching shaders after successful linking is good practice
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
    // (setupWebGL remains functionally the same, using the new fragmentShaderSource)
    function setupWebGL() {
        let vs = null;
        let fs = null;
        try {
            vs = createShader(gl.VERTEX_SHADER, vertexShaderSource);
            fs = createShader(gl.FRAGMENT_SHADER, fragmentShaderSource); // Uses the new fragment shader source
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
            // Use TRIANGLE_STRIP: (-1,1), (-1,-1), (1,1), (1,-1) covers the screen
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
        gl.useProgram(program);

        // --- Set up Vertex Attributes ---
        if (positionAttributeLocation !== -1 && positionBuffer) {
            gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
            gl.enableVertexAttribArray(positionAttributeLocation);
            gl.vertexAttribPointer(
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

        // --- Set Uniforms ---
        if (timeUniformLocation) {
           gl.uniform1f(timeUniformLocation, time);
        }
        if (resolutionUniformLocation) {
           gl.uniform2f(resolutionUniformLocation, gl.canvas.width, gl.canvas.height);
        }

        // --- Draw the Quad ---
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        // --- Request Next Frame ---
        animationFrameId = requestAnimationFrame(render);
    }

    // --- Function to Update Shader Dynamically ---
    // (updateShader function remains functionally the same)
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
         const completeNewFragmentSource = `#version 300 es
            precision highp float;
            uniform float u_time;
            uniform vec2 u_resolution;
            out vec4 outColor;

            // --- Include Common Helper Functions ---
            // Helper functions needed by the dynamic code (adjust as necessary)
            float hash(float n) { return fract(sin(n) * 43758.5453); }
            float noise(vec2 p) { vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);float n=i.x+i.y*57.;return mix(mix(hash(n),hash(n+1.),f.x),mix(hash(n+57.),hash(n+58.),f.x),f.y); }
            float fbm(vec2 p) { float s=0.,a=.7,f=1.;int FBM_OCTAVES_DYNAMIC=5; for(int i=0;i<FBM_OCTAVES_DYNAMIC;i++){s+=noise(p*f)*a;a*=.5;f*=2.;}return s;}
            float rand(vec2 co){ return fract(sin(dot(co.xy,vec2(12.9898,78.233)))*43758.5453); }
            // --- END Helper Functions ---

            // --- Common Colors --- // Define common colors if dynamic code needs them
            vec3 colPrimary = vec3(106./255., 0., 1.);
            vec3 colSecondary = vec3(0., 1., 204./255.);
            vec3 colTertiary = vec3(0., 184./255., 212./255.);
            vec3 colBackground = vec3(5./255., 5./255., 17./255.);
            // --- END Colors ---

            // --- User Provided Shader Code ---
            ${newShaderCode}
            // --- End User Code ---
        `;

        let newVs = null;
        let newFs = null;
        let newProgram = null;
        try {
             // Recompile the vertex shader
             newVs = createShader(gl.VERTEX_SHADER, vertexShaderSource);
             // Compile the new fragment shader
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
             timeUniformLocation = gl.getUniformLocation(program, "u_time");
             resolutionUniformLocation = gl.getUniformLocation(program, "u_resolution");

             // Optional: Check new locations
             if (positionAttributeLocation === -1) console.warn("New program missing 'a_position' attribute.");
             if (!timeUniformLocation) console.warn("New program missing 'u_time' uniform.");
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
    // (Resize listener remains the same)
    window.addEventListener('resize', () => {
        // The actual resizing logic is handled within the render loop check
        if (!animationFrameId && program) {
            console.log("Resize event: Requesting animation frame.");
            animationFrameId = requestAnimationFrame(render);
        }
    }, false);

})(); // Execute the IIFE
```

**Reasoning for the fix:**

The error messages clearly pointed to lines 69-71 within the `calcNormal` function. The original incorrect code was:

```glsl
vec3 calcNormal( vec3 p ) {
    vec2 e = vec2(SURFACE_DIST * 0.5, 0.0); // Smaller epsilon for normal calc
    return normalize( vec3( sceneSDF(p + e.xyy()) - sceneSDF(p - e.xyy()), // INCORRECT
                           sceneSDF(p + e.yxy()) - sceneSDF(p - e.yxy()), // INCORRECT
                           sceneSDF(p + e.yyx()) - sceneSDF(p - e.yyx())  // INCORRECT
                         ));
}
```

The corrected code replaces the invalid swizzling with explicit `vec3` constructions for the offsets along each axis:

```glsl
vec3 calcNormal( vec3 p ) {
    float eps = SURFACE_DIST * 0.5; // Define epsilon directly
    vec3 n = vec3(
        sceneSDF( vec3(p.x+eps, p.y, p.z) ) - sceneSDF( vec3(p.x-eps, p.y, p.z) ), // CORRECT X offset
        sceneSDF( vec3(p.x, p.y+eps, p.z) ) - sceneSDF( vec3(p.x, p.y-eps, p.z) ), // CORRECT Y offset
        sceneSDF( vec3(p.x, p.y, p.z+eps) ) - sceneSDF( vec3(p.x, p.y, p.z-eps) )  // CORRECT Z offset
    );
    return normalize(n);
}
```

This method correctly calculates the gradient of the SDF by sampling slightly offset points along the X, Y, and Z axes and finding the difference.

I also adjusted the relative epsilon check in the `rayMarch` function slightly (`max(1.0, dO * 0.1)`) as this can sometimes help prevent artifacts when the ray origin is very close to a surface.

This corrected version should compile and run without the previous errors. Let me know if you encounter any other issu
