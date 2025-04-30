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
        precision highp float; // Precision needed in VS for GLSL 300 es
        in vec4 a_position;    // Input vertex position (from buffer)
        void main() {
            // Directly forward the position to clip space
            gl_Position = a_position;
        }
    `;

    // Fragment Shader (GLSL 3.00 ES - Raymarched Mandelbulb Variation)
    const fragmentShaderSource = `#version 300 es
        precision highp float; // High precision is important for raymarching

        // Uniforms: Inputs from JavaScript
        uniform float u_time;       // Current time in seconds
        uniform vec2 u_resolution; // Canvas resolution in pixels

        // Output variable: The final color of the fragment
        out vec4 outColor;

        // --- Constants ---
        const int MAX_STEPS = 80;        // Max iterations for raymarching loop
        const float MAX_DIST = 100.0;    // Max distance to trace a ray
        const float SURFACE_DIST = 0.001;// Threshold to consider a surface hit
        const float PI = 3.14159265359;

        // --- Helper Functions ---
        // Basic pseudo-random number generator for a 2D vector
        float rand(vec2 co){
            return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
        }

        // --- SDF Definitions (Signed Distance Functions) ---

        // Simple Sphere SDF: distance from point p to sphere of radius s centered at origin
        float sdSphere( vec3 p, float s ) {
            return length(p) - s;
        }

        // Mandelbulb Fractal SDF variation (complex shape defined by iteration)
        float sdMandelbulb( vec3 pos ) {
            vec3 z = pos; // Iteration variable, starts at the sample point
            float dr = 1.0; // Derivative approximation for distance estimation
            float r = 0.0;  // Magnitude of z
            // Power determines the fractal's complexity, animated for effect
            float power = 8.0 + 2.0 * sin(u_time * 0.2);

            // Iterate the Mandelbulb formula
            for (int i = 0; i < 5; i++) { // Low iteration count for performance/glitchy look
                r = length(z);
                if (r > 2.0) break; // Bailout condition: point is likely outside the set

                // Convert to spherical coordinates
                float theta = acos(clamp(z.z / r, -1.0, 1.0)); // Angle from Z axis (clamped for safety)
                float phi = atan(z.y, z.x);             // Angle from X axis in XY plane

                // Update derivative estimation
                dr = pow(r, power - 1.0) * power * dr + 1.0;

                // Scale and rotate in spherical coordinates based on power and time
                float zr = pow(r, power);
                theta = theta * power + u_time * 0.5; // Twist based on time
                phi = phi * power + u_time * 0.4;   // Twist based on time

                // Convert back to Cartesian coordinates and add original position (the fractal formula)
                z = zr * vec3(sin(theta)*cos(phi), sin(phi)*sin(theta), cos(theta));
                z += pos;
            }
            // Return the estimated distance to the Mandelbulb surface
            return 0.5 * log(r) * r / dr;
        }

        // Scene SDF: Defines the entire world geometry by combining primitives
        float sceneSDF( vec3 p ) {
            // Ground Plane: Simple plane at y = -1.5
            float ground = p.y + 1.5;

            // Warp the space before evaluating the fractal for a wobbling effect
            vec3 warped_p = p;
            warped_p.y += sin(p.x * 0.5 + u_time) * 0.2;
            warped_p.x += cos(p.z * 0.5 - u_time * 1.1) * 0.3;

            // Mandelbulb fractal, with oscillating scale based on time
            float fractal = sdMandelbulb(warped_p * (1.0 + 0.3 * sin(u_time * 0.1)));

            // Combine ground and fractal using minimum (boolean union)
            return min(ground, fractal);
        }

        // --- Normal Calculation (Gradient of SDF) ---
        // Calculates the surface normal at point p by sampling the SDF gradient
        vec3 calcNormal( vec3 p ) {
            // Epsilon: small offset for finite difference calculation
            float eps = SURFACE_DIST * 0.5; // Should be small relative to details
            // Calculate gradient by sampling SDF slightly offset in each axis direction
            vec3 n = vec3(
                sceneSDF( vec3(p.x + eps, p.y, p.z) ) - sceneSDF( vec3(p.x - eps, p.y, p.z) ),
                sceneSDF( vec3(p.x, p.y + eps, p.z) ) - sceneSDF( vec3(p.x, p.y - eps, p.z) ),
                sceneSDF( vec3(p.x, p.y, p.z + eps) ) - sceneSDF( vec3(p.x, p.y, p.z - eps) )
            );
            // Normalize the resulting gradient vector to get the unit normal
            return normalize(n);
        }

        // --- Raymarching Function (Sphere Tracing) ---
        // Marches a ray from origin 'ro' in direction 'rd' and returns distance to hit
        float rayMarch( vec3 ro, vec3 rd ) {
            float dO = 0.0; // Distance traveled along the ray from the Origin
            for( int i = 0; i < MAX_STEPS; i++ ) {
                vec3 p = ro + rd * dO;  // Current point along the ray
                float dS = sceneSDF(p); // Calculate distance from current point to the scene surface

                // Check for hit: if distance is very small (relative to distance traveled)
                // Use a relative epsilon to handle varying scales and distances
                if( dS < SURFACE_DIST * max(1.0, dO * 0.1) ) {
                     return dO; // Return the distance traveled to the hit point
                }

                // Advance the ray by the safe distance 'dS'
                // Add some randomness to step size for a potentially jittery/noisy effect
                dO += dS * (0.6 + 0.4 * rand(rd.xy + float(i)));

                // Check if the ray has traveled too far
                if( dO > MAX_DIST ) {
                    return MAX_DIST; // Return max distance if no hit within range
                }
            }
            return MAX_DIST; // Return max distance if no hit within MAX_STEPS
        }

        // --- Main Shader Logic ---
        void main() {
            // Calculate normalized device coordinates (uv) - range depends on aspect ratio, typically -1 to 1 on shortest side
            vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / min(u_resolution.x, u_resolution.y);
            // Keep original UV coordinates (0 to 1) if needed for effects like scanlines
            // vec2 originalUV = gl_FragCoord.xy / u_resolution.xy;

            // --- Camera Setup ---
            // Define camera position (animated orbit)
            vec3 ro = vec3(2.5 * cos(u_time * 0.3), 1.5 + sin(u_time * 0.2), 2.5 * sin(u_time * 0.3));
            // Define point the camera looks at
            vec3 target = vec3(0.0, 0.5, 0.0);
            // Calculate camera orientation vectors
            vec3 camForward = normalize(target - ro);                 // Forward direction
            vec3 camRight = normalize(cross(vec3(0.0, 1.0, 0.0), camForward)); // Right direction
            vec3 camUp = cross(camForward, camRight);                   // Up direction

            // Calculate ray direction for the current pixel (perspective projection)
            // The '1.5' factor controls the Field of View (FOV) - smaller is more zoomed in
            vec3 rd = normalize(uv.x * camRight + uv.y * camUp + 1.5 * camForward);

            // --- Raymarch the scene ---
            float dist = rayMarch(ro, rd); // Get distance to the first hit

            // --- Shading ---
            vec3 col = vec3(0.0); // Initialize color to black (background)

            if( dist < MAX_DIST ) { // If the ray hit something within the max distance
                vec3 p = ro + rd * dist; // Calculate the exact hit position
                vec3 n = calcNormal(p);  // Calculate the surface normal at the hit point

                // Define light properties (animated position)
                vec3 lightPos = vec3(5.0 * sin(u_time * 0.6), 5.0, 5.0 * cos(u_time * 0.6));
                vec3 lightColor = vec3(1.0, 0.95, 0.9); // Slightly warm light

                // Calculate lighting vectors
                vec3 lightDir = normalize(lightPos - p);   // Direction from hit point to light
                vec3 viewDir = normalize(ro - p);      // Direction from hit point to camera
                vec3 halfwayDir = normalize(lightDir + viewDir); // Halfway vector for Blinn-Phong

                // Define material properties (procedural & "unhinged")
                // Base color varies with position and time
                vec3 baseColor = vec3(0.6, 0.2, 0.8) + 0.4 * sin(p * 3.0 + u_time * 2.0);
                // Mix color based on the surface normal's Y component (e.g., green tops, purple sides)
                baseColor = mix(baseColor, vec3(0.1, 0.9, 0.5), smoothstep(-0.5, 0.5, n.y));
                baseColor = clamp(baseColor, 0.0, 1.0); // Ensure color is within valid range [0,1]

                // Calculate Blinn-Phong lighting components
                float ambient = 0.2; // Ambient light contribution
                float diffuse = max(dot(n, lightDir), 0.0) * 0.8; // Diffuse reflection (Lambertian)
                // Specular reflection, with intensity pulsating over time
                float specular = pow(max(dot(n, halfwayDir), 0.0), 32.0) * (0.5 + 0.5 * sin(u_time));

                // Combine lighting components
                col = baseColor * lightColor * (ambient + diffuse) + lightColor * specular;

                // Add cheap distance fog effect
                // Fog fades in from 0 distance up to 80% of MAX_DIST
                float fogAmount = smoothstep(0.0, MAX_DIST * 0.8, dist);
                // Mix the calculated color with a dark purple fog color based on distance
                col = mix(col, vec3(0.05, 0.0, 0.1), fogAmount);

            } else {
               // Background Sky: If the ray missed the scene
               // Simple gradient based on ray direction's Y component + noise
               col = vec3(0.1, 0.0, 0.2) + 0.2 * pow(max(0.0, dot(rd, vec3(0.0, 1.0, 0.0))), 2.0);
               col += 0.05 * rand(uv + fract(u_time)); // Add some random noise
            }

            // --- Final Color Adjustments ---
            // Apply a simple power curve for color grading/contrast adjustment
            col = pow(col, vec3(0.8, 0.9, 1.0));
            // Add subtle random noise grain based on screen coordinates
            col += (rand(gl_FragCoord.xy) - 0.5) * 0.05;

            // Final output: Clamp color to valid [0,1] range and set alpha to 1.0 (opaque)
            outColor = vec4(clamp(col, 0.0, 1.0), 1.0);
        }
    `; // End of fragmentShaderSource

    // --- WebGL Utility Functions ---
    // (createShader and createProgram functions remain unchanged)
     function createShader(type, source) {
        const shader = gl.createShader(type);
        if (!shader) { throw new Error(`Failed to create shader (type: ${type})`); }
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
        if (!program) { throw new Error("Failed to create program"); }
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
        gl.detachShader(program, vertexShader);
        gl.detachShader(program, fragmentShader);
        return program;
    }

    // --- WebGL State Variables ---
    // (Variables remain unchanged)
    let program = null;
    let positionAttributeLocation = -1;
    let timeUniformLocation = null;
    let resolutionUniformLocation = null;
    let positionBuffer = null;
    let animationFrameId = null;
    let startTime = performance.now();

    // --- Initialize WebGL Program and Buffers ---
    // (setupWebGL function remains unchanged)
    function setupWebGL() {
        let vs = null;
        let fs = null;
        try {
            vs = createShader(gl.VERTEX_SHADER, vertexShaderSource);
            fs = createShader(gl.FRAGMENT_SHADER, fragmentShaderSource); // Uses the new fragment shader source
            program = createProgram(vs, fs);

            positionAttributeLocation = gl.getAttribLocation(program, "a_position");
            timeUniformLocation = gl.getUniformLocation(program, "u_time");
            resolutionUniformLocation = gl.getUniformLocation(program, "u_resolution");

            if (positionAttributeLocation === -1) console.warn("Attribute 'a_position' not found in shader program.");
            if (!timeUniformLocation) console.warn("Uniform 'u_time' not found in shader program.");
            if (!resolutionUniformLocation) console.warn("Uniform 'u_resolution' not found in shader program.");

            positionBuffer = gl.createBuffer();
            if (!positionBuffer) throw new Error("Failed to create position buffer");
            gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
            const positions = new Float32Array([-1, 1, -1, -1, 1, 1, 1, -1]);
            gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

            return true; // Indicate successful setup

        } catch (error) {
            console.error(">>> Failed during WebGL setup:", error);
            if (program) gl.deleteProgram(program);
            if (vs) gl.deleteShader(vs);
            if (fs) gl.deleteShader(fs);
            if (positionBuffer) gl.deleteBuffer(positionBuffer);
            program = null;
            return false; // Indicate setup failure
        } finally {
            if (vs) gl.deleteShader(vs);
            if (fs) gl.deleteShader(fs);
        }
    }

    // --- Render Loop ---
    // (render function remains unchanged)
    function render(now) {
        if (!program) {
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
            return;
        }

        let time = (now - startTime) * 0.001; // Time in seconds

        const currentWidth = window.innerWidth;
        const currentHeight = window.innerHeight;
        if (webglCanvas.width !== currentWidth || webglCanvas.height !== currentHeight) {
            webglCanvas.width = currentWidth;
            webglCanvas.height = currentHeight;
            gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
            // console.log(`Resized canvas to ${gl.canvas.width}x${gl.canvas.height}`); // Optional: uncomment for resize logging
        }

        gl.useProgram(program);

        if (positionAttributeLocation !== -1 && positionBuffer) {
            gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
            gl.enableVertexAttribArray(positionAttributeLocation);
            gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);
        } else {
            if (positionAttributeLocation !== -1) gl.disableVertexAttribArray(positionAttributeLocation);
        }

        if (timeUniformLocation) {
           gl.uniform1f(timeUniformLocation, time);
        }
        if (resolutionUniformLocation) {
           gl.uniform2f(resolutionUniformLocation, gl.canvas.width, gl.canvas.height);
        }

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        animationFrameId = requestAnimationFrame(render);
    }

    // --- Function to Update Shader Dynamically ---
    // (updateShader function remains unchanged)
    window.updateShader = function(newShaderCode) {
        if (!gl) {
            console.warn("WebGL context not available. Cannot update shader.");
            if(typeof showNotification === 'function') showNotification("WebGL inactive. Cannot update shader.");
            return;
        }
        console.log("Attempting shader update with new code...");

        if (!newShaderCode || typeof newShaderCode !== 'string' || newShaderCode.indexOf('main()') === -1) {
             console.error("Invalid shader code provided: Missing main() function or not a string.");
             if(typeof showNotification === 'function') showNotification("Invalid shader code: Missing main().");
             console.error("Provided code:\n", newShaderCode);
             return;
        }

         const completeNewFragmentSource = `#version 300 es
            precision highp float;
            uniform float u_time;
            uniform vec2 u_resolution;
            out vec4 outColor;

            // --- Include Common Helper Functions ---
            // These might be needed by the dynamically injected code
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
             newVs = createShader(gl.VERTEX_SHADER, vertexShaderSource);
             newFs = createShader(gl.FRAGMENT_SHADER, completeNewFragmentSource);
             newProgram = createProgram(newVs, newFs);

             console.log("New shader compiled and linked successfully.");

             if (animationFrameId) { cancelAnimationFrame(animationFrameId); animationFrameId = null; }
             if (program) { gl.deleteProgram(program); console.log("Old program deleted."); }
             program = newProgram;

             positionAttributeLocation = gl.getAttribLocation(program, "a_position");
             timeUniformLocation = gl.getUniformLocation(program, "u_time");
             resolutionUniformLocation = gl.getUniformLocation(program, "u_resolution");

             if (positionAttributeLocation === -1) console.warn("New program missing 'a_position' attribute.");
             if (!timeUniformLocation) console.warn("New program missing 'u_time' uniform.");
             if (!resolutionUniformLocation) console.warn("New program missing 'u_resolution' uniform.");

             startTime = performance.now();
             animationFrameId = requestAnimationFrame(render);

             console.log("Shader update complete. Render loop restarted.");
              if(typeof showNotification === 'function') showNotification("SHADER UPDATE SUCCESSFUL.");

        } catch (e) {
             console.error('>>> Shader update failed during compile/link:', e);
             if (newProgram) gl.deleteProgram(newProgram);
             if (newVs) gl.deleteShader(newVs);
             if (newFs) gl.deleteShader(newFs);
             if(typeof showNotification === 'function') showNotification(`SHADER UPDATE FAILED: ${e.message}`);
             if (!animationFrameId && program) {
                 console.log("Restarting render loop with previous program after update failure.");
                 animationFrameId = requestAnimationFrame(render);
             }

        } finally {
             if (newVs) gl.deleteShader(newVs);
             if (newFs) gl.deleteShader(newFs);
        }
    }; // End window.updateShader

    // --- Start WebGL ---
    if (setupWebGL()) {
        console.log("WebGL setup successful. Starting render loop.");
        animationFrameId = requestAnimationFrame(render);
    } else {
        console.error("WebGL setup failed. Render loop will not start.");
        if(document.body) document.body.style.backgroundColor = '#050511';
    }

    // --- Resize Listener ---
    // (Resize listener remains unchanged)
    window.addEventListener('resize', () => {
        // Resize check is handled in render loop
        if (!animationFrameId && program) {
            // If the loop isn't running but we have a program, request a frame
            // This might happen if the tab was hidden and the loop stopped
            console.log("Resize event: Requesting animation frame.");
            animationFrameId = requestAnimationFrame(render);
        }
    }, false);

})(); // Execute the IIFE
```

I've updated the code block with the corrected `calcNormal` function and ensured the overall JavaScript structure appears sound. This should resolve the `Unexpected identifier 'calcNormal'` syntax err
