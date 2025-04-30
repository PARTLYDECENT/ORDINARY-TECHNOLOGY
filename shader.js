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
    // Vertex Shader (GLSL 3.00 ES)
    const vertexShaderSource = `#version 300 es
        precision highp float; // Precision needed in VS for GLSL 300 es
        in vec4 a_position;
        void main() {
            gl_Position = a_position; // Pass position through
        }
    `;





(function() {
    "use strict";
    // ... [WebGL setup code remains the same] ...

    // Fragment Shader - COMPLETELY UNHINGED VERSION
    const fragmentShaderSource = `#version 300 es
        precision highp float;
        uniform float u_time;
        uniform vec2 u_resolution;
        out vec4 outColor;

        #define TAU 6.28318530718
        #define PHI 1.61803398875
        #define MAX_STEPS 666
        #define MAX_DIST 66.6
        #define SURFACE_DIST 0.00666
        #define ROTATE(a) mat2(cos(a), -sin(a), sin(a), cos(a))

        float hash(float n) { return fract(sin(n)*43758.5453); }
        float noise(vec3 x) {
            vec3 p = floor(x);
            vec3 f = fract(x);
            f = f*f*(3.0-2.0*f);
            float n = p.x + p.y*157.0 + 113.0*p.z;
            return mix(mix(mix( hash(n+0.0), hash(n+1.0),f.x),
                       mix( hash(n+157.0), hash(n+158.0),f.x),f.y),
                   mix(mix( hash(n+113.0), hash(n+114.0),f.x),
                       mix( hash(n+270.0), hash(n+271.0),f.x),f.y),f.z);
        }

        float sdHellBulb(vec3 p) {
            vec3 z = p * (1.0 + 0.3*sin(u_time*0.7));
            float dr = 1.0;
            float r = 0.0;
            float power = 8.0 + 4.0*sin(u_time*0.3) + 2.0*noise(vec3(u_time*0.1));
            
            for(int i=0; i<13; i++) {
                r = length(z);
                if(r > 6.66) break;
                
                float theta = acos(z.z/r) * (power + 2.0*sin(u_time*2.0));
                float phi = atan(z.y, z.x) * power;
                float zr = pow(r, power-1.0);
                dr = zr*power*dr + 1.0;
                zr = pow(r, power);
                
                theta += u_time*2.0 + 3.0*noise(z*0.3 + u_time);
                phi = phi*power + u_time*3.0;
                
                z = zr*vec3(sin(theta)*cos(phi), sin(phi)*sin(theta), cos(theta));
                z += p * (0.8 + 0.2*sin(u_time*0.5));
                z = mix(z, z.yxz, smoothstep(0.3,0.7,sin(u_time*0.7)));
            }
            return 0.5*log(r)*r/dr * (0.7 + 0.3*noise(p*3.0 + u_time));
        }

        float sceneSDF(vec3 p) {
            p.xy *= ROTATE(u_time*0.3 + p.z*0.2);
            p.yz *= ROTATE(u_time*0.4);
            p = mod(p+2.0,4.0)-2.0;
            
            float bulb = sdHellBulb(p);
            float floorDist = p.y + 2.0 - 1.5*sin(p.x*0.5 + u_time)*cos(p.z*0.3 - u_time);
            float twist = length(p.xz) - 1.0 - 0.5*cos(u_time*2.0);
            
            return min(min(bulb, floorDist), twist + 0.3*noise(p*5.0 + u_time));
        }

        vec3 calcNormal(vec3 p) {
            vec2 e = vec2(0.00666, 0);
            return normalize(vec3(
                sceneSDF(p+e.xyy) - sceneSDF(p-e.xyy),
                sceneSDF(p+e.yxy) - sceneSDF(p-e.yxy),
                sceneSDF(p+e.yyx) - sceneSDF(p-e.yyx)
            ));
        }

        float rayMarch(vec3 ro, vec3 rd) {
            float dO=0.0;
            for(int i=0; i<MAX_STEPS; i++) {
                vec3 p = ro + rd*dO;
                float dS = sceneSDF(p);
                if(dS < SURFACE_DIST*dO || dO > MAX_DIST) break;
                dO += dS * mix(0.5, 1.5, noise(vec3(rd*100.0 + float(i))));
                if(mod(dO, 3.0) < 0.1) rd.xy *= ROTATE(0.1*sin(u_time));
            }
            return dO;
        }

        void main() {
            vec2 uv = (gl_FragCoord.xy*2.0 - u_resolution.xy)/min(u_resolution.x, u_resolution.y);
            uv *= 1.0 + 0.1*sin(u_time*5.0);
            
            vec3 ro = vec3(3.0*cos(u_time*0.3), 2.0*sin(u_time*0.2), 3.0*sin(u_time*0.4));
            ro += 0.5*noise(vec3(u_time*0.7));
            vec3 rd = normalize(vec3(uv, 1.0 + 0.3*sin(u_time)));
            
            float distort = 0.1*sin(u_time*10.0 + uv.x*TAU);
            rd.xy += distort;
            rd = normalize(rd);
            
            float d = rayMarch(ro, rd);
            vec3 col = vec3(0.1, 0.03, 0.1)* (1.0 - exp(-0.2*d));
            
            if(d < MAX_DIST) {
                vec3 p = ro + rd*d;
                vec3 n = calcNormal(p);
                n = mix(n, vec3(noise(p*10.0)), 0.3);
                
                vec3 lightPos = vec3(10.0*sin(u_time), 10.0, 10.0*cos(u_time));
                vec3 lightDir = normalize(lightPos - p + 2.0*noise(vec3(u_time)));
                vec3 halo = vec3(0.3, 0.1, 0.5) * pow(max(0.0, dot(-rd, lightDir)), 2.0);
                
                vec3 albedo = mix(
                    vec3(0.8, 0.1, 0.3),
                    vec3(0.1, 0.8, 0.2),
                    sin(p.x*3.0 + u_time)*0.5 + 0.5
                ) * (0.9 + 0.5*noise(p*5.0));
                
                float flicker = step(0.9, hash(u_time*30.0));
                vec3 lighting = albedo * (0.3 + 0.7*flicker * max(0.0, dot(n, lightDir)));
                lighting += halo * (0.5 + 0.5*sin(u_time*30.0));
                
                col = mix(col, lighting, exp(-d*0.1));
                col *= 1.0 + 0.3*sin(TAU*(dot(uv, uv)*10.0 - u_time*3.0));
            }
            
            col = pow(col, vec3(1.0/2.2));
            col += 0.02*vec3(
                hash(uv.x*73.0 + u_time),
                hash(uv.y*59.0 + u_time),
                hash((uv.x+uv.y)*97.0 + u_time)
            );
            
            col *= 1.0 - 0.1*length(uv);
            col.rb *= ROTATE(0.01*sin(u_time));
            
            outColor = vec4(col, 1.0);
        }
    `;

    // ... [Remaining WebGL setup and functions stay the same] ...
})();




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
    // (setupWebGL remains functionally the same, using the new fragmentShaderSource)
    function setupWebGL() {
        let vs = null;
        let fs = null;
        try {
            vs = createShader(gl.VERTEX_SHADER, vertexShaderSource); // [cite: 637]
            fs = createShader(gl.FRAGMENT_SHADER, fragmentShaderSource); // [cite: 637] Uses the new fragment shader source
            program = createProgram(vs, fs); // [cite: 26]

            // Get attribute/uniform locations [cite: 27, 644]
            positionAttributeLocation = gl.getAttribLocation(program, "a_position");
            timeUniformLocation = gl.getUniformLocation(program, "u_time");
            resolutionUniformLocation = gl.getUniformLocation(program, "u_resolution");

            // Basic check if locations are valid
            if (positionAttributeLocation === -1) console.warn("Attribute 'a_position' not found in shader program.");
            if (!timeUniformLocation) console.warn("Uniform 'u_time' not found in shader program.");
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
           gl.uniform1f(timeUniformLocation, time);
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
            //const int FBM_OCTAVES = ${FBM_OCTAVES}; // Use the JS constant - Not needed if fbm isn't in the dynamic code
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
