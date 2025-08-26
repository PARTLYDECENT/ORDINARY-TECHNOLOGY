// =================================================================================================
// [SYSTEM BOOTSTRAP] :: IMMEDIATE-INVOKED FUNCTION EXPRESSION (IIFE)
// Optimized Grid World WebGL rendering system with traveling camera and random forms
// Only the `window.updateShader` function is intentionally exposed for external control.
// =================================================================================================
(function() {
    "use strict";

    // --- Core Variable Declarations ---
    const webglCanvas = document.getElementById('webglCanvas');
    let gl = null;
    let program = null;
    let animationFrameId = null;
    let currentShaderIndex = 0;
    let shaderTransitionTime = 0;
    let lastShaderChange = 0;

    // --- Error Handling and Initialization Check ---
    if (!webglCanvas) {
        console.error("[FATAL] WebGL Canvas element with id 'webglCanvas' not found in DOM. Aborting.");
        return;
    }

    // =================================================================================================
    // [GRID WORLD CONFIGURATIONS] :: DIFFERENT GRID ENVIRONMENTS
    // =================================================================================================
    const gridWorlds = [
        {
            name: "Neon Cyberpunk Grid",
            description: "A futuristic neon-lit grid world with pulsing energy lines and holographic forms",
            gridColor: [0.0, 1.0, 1.0],
            backgroundColor: [0.05, 0.05, 0.2],
            formColors: [[1.0, 0.0, 1.0], [0.0, 1.0, 0.0], [1.0, 1.0, 0.0]],
            speed: 1.5,
            gridScale: 2.0
        },
        {
            name: "Organic Bio Grid",
            description: "A living grid world with organic forms and pulsing bio-luminescent patterns",
            gridColor: [0.2, 0.8, 0.3],
            backgroundColor: [0.02, 0.1, 0.02],
            formColors: [[0.8, 0.4, 0.1], [0.6, 0.8, 0.2], [0.9, 0.6, 0.3]],
            speed: 0.8,
            gridScale: 1.5
        },
        {
            name: "Crystal Dimension",
            description: "A crystalline world with geometric forms and prismatic light effects",
            gridColor: [0.8, 0.9, 1.0],
            backgroundColor: [0.1, 0.05, 0.15],
            formColors: [[1.0, 0.8, 0.9], [0.8, 0.9, 1.0], [0.9, 1.0, 0.8]],
            speed: 1.2,
            gridScale: 3.0
        },
        {
            name: "Void Matrix",
            description: "A dark matrix-like world with glowing code patterns and digital anomalies",
            gridColor: [0.0, 1.0, 0.0],
            backgroundColor: [0.0, 0.0, 0.0],
            formColors: [[0.0, 1.0, 0.0], [1.0, 0.0, 0.0], [1.0, 1.0, 1.0]],
            speed: 2.0,
            gridScale: 1.0
        },
        {
            name: "Plasma Storm",
            description: "An energetic world with plasma effects and electromagnetic disturbances",
            gridColor: [1.0, 0.3, 0.8],
            backgroundColor: [0.2, 0.0, 0.1],
            formColors: [[1.0, 0.0, 0.5], [0.5, 0.0, 1.0], [1.0, 0.5, 0.0]],
            speed: 1.8,
            gridScale: 2.5
        }
    ];

    // =================================================================================================
    // [CONTEXT INITIALIZATION] :: ATTEMPT TO SECURE WEBGL2/WEBGL1 CONTEXT
    // =================================================================================================
    try {
        webglCanvas.width = window.innerWidth;
        webglCanvas.height = window.innerHeight;

        gl = webglCanvas.getContext('webgl2') ||
             webglCanvas.getContext('webgl') ||
             webglCanvas.getContext('experimental-web-gl');

        if (!gl) {
            throw new Error("WebGL is not supported or the context could not be created.");
        }

        console.log("[INFO] Advanced Grid World initialized successfully.");
    } catch (e) {
        console.error("[FATAL] Grid World initialization error:", e);
        if (document.body) document.body.style.backgroundColor = '#050511';
        return;
    }

    // =================================================================================================
    // [SHADER SOURCE CODE] :: GLSL - OPTIMIZED GRID WORLD EFFECTS
    // =================================================================================================

    const vertexShaderSource = `
        attribute vec4 a_position;
        void main() {
            gl_Position = a_position;
        }
    `;

    const fragmentShaderSource = `
        precision highp float;

        uniform float u_time;
        uniform vec2 u_resolution;
        uniform float u_speed;
        uniform int u_shader_index;
        uniform float u_transition;
        uniform vec3 u_grid_color;
        uniform vec3 u_background_color;
        uniform vec3 u_form_colors[3];
        uniform float u_grid_scale;

        const float PI = 3.14159265359;
        const float TWO_PI = 6.28318530718;

        // =========================================================================================
        // [UTILITY FUNCTIONS]
        // =========================================================================================
        
        float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        
        float noise(vec2 p) {
            vec2 i = floor(p), f = fract(p);
            f = f * f * (3.0 - 2.0 * f);
            return mix(mix(hash(i), hash(i + vec2(1,0)), f.x),
                       mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x), f.y);
        }
        
        mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, s, -s, c); }

        // =========================================================================================
        // [OPTIMIZED GRID WORLD RENDERING]
        // =========================================================================================
        vec3 renderGridWorld(vec2 uv, float t) {
            // Create perspective effect
            vec2 perspective = uv / (1.0 + uv.y * 0.3);
            
            // Moving grid coordinates
            vec2 gridPos = perspective * u_grid_scale + vec2(0.0, t * u_speed);
            
            // Grid lines
            vec2 grid = abs(fract(gridPos) - 0.5);
            float lineWidth = 0.02 * (1.0 + uv.y * 0.5); // Thicker lines in distance
            float lines = smoothstep(lineWidth, lineWidth * 0.5, min(grid.x, grid.y));
            
            // Distance fade
            float fade = 1.0 / (1.0 + abs(uv.y) * 2.0);
            
            // Pulsing effect
            float pulse = sin(t * 2.0 + gridPos.x * 0.5 + gridPos.y * 0.3) * 0.3 + 0.7;
            
            vec3 gridColor = u_grid_color * lines * fade * pulse;
            
            return mix(u_background_color, gridColor, min(lines * fade, 1.0));
        }

        // =========================================================================================
        // [SIMPLIFIED RANDOM FORMS]
        // =========================================================================================
        vec3 addRandomForms(vec2 uv, float t, vec3 baseColor) {
            vec3 formColor = vec3(0.0);
            
            // Generate fewer forms for better performance
            for(int i = 0; i < 4; i++) {
                float formSeed = float(i) * 123.456;
                vec2 formPos = vec2(
                    sin(t * 0.3 + formSeed) * 0.8,
                    cos(t * 0.2 + formSeed * 1.5) * 0.6 + 0.2
                );
                
                // Form lifecycle
                float formLife = mod(t * 0.5 + formSeed, 6.0);
                float formScale = smoothstep(0.0, 1.0, formLife) * smoothstep(6.0, 5.0, formLife);
                
                if(formScale > 0.01) {
                    float dist = length(uv - formPos);
                    
                    // Different form shapes
                    float form = 0.0;
                    if(i == 0) {
                        // Pulsing circle
                        float radius = 0.1 + sin(t * 4.0 + formSeed) * 0.05;
                        form = exp(-dist / radius) * formScale;
                    } else if(i == 1) {
                        // Rotating square
                        vec2 rotUV = (uv - formPos) * rot(t + formSeed);
                        float square = max(abs(rotUV.x), abs(rotUV.y));
                        form = exp(-square * 10.0) * formScale;
                    } else if(i == 2) {
                        // Noise blob
                        float noiseVal = noise((uv - formPos) * 8.0 + t);
                        form = exp(-dist * 5.0) * noiseVal * formScale;
                    } else {
                        // Star shape
                        float angle = atan(uv.y - formPos.y, uv.x - formPos.x);
                        float star = sin(angle * 5.0) * 0.5 + 0.5;
                        form = exp(-dist * 8.0) * star * formScale;
                    }
                    
                    vec3 formColorPalette = u_form_colors[i - (i / 3) * 3];
                    formColor += formColorPalette * form * 0.8;
                }
            }
            
            return baseColor + formColor;
        }

        // =========================================================================================
        // [SIMPLIFIED BURST EFFECTS]
        // =========================================================================================
        vec3 addBurstEffects(vec2 uv, float t, vec3 baseColor) {
            vec3 burstColor = vec3(0.0);
            
            // Fewer burst effects for performance
            for(int i = 0; i < 2; i++) {
                float burstSeed = float(i) * 456.789;
                float burstTime = mod(t * 1.5 + burstSeed, 4.0);
                
                if(burstTime < 1.0) {
                    vec2 burstPos = vec2(
                        sin(burstSeed) * 0.6,
                        cos(burstSeed * 1.3) * 0.4
                    );
                    
                    float burstRadius = burstTime * 1.5;
                    float burstIntensity = (1.0 - burstTime) * (1.0 - burstTime);
                    
                    float distToBurst = length(uv - burstPos);
                    
                    // Expanding ring
                    float ring = exp(-abs(distToBurst - burstRadius) * 15.0) * burstIntensity;
                    
                    // Flash effect
                    float flash = exp(-distToBurst * 3.0) * burstIntensity * 0.2;
                    
                    vec3 burstColorPalette = u_form_colors[i - (i / 3) * 3];
                    burstColor += burstColorPalette * (ring + flash);
                }
            }
            
            return baseColor + burstColor;
        }

        // =========================================================================================
        // [SHADER VARIANTS FOR DIFFERENT GRID WORLDS]
        // =========================================================================================
        
        vec3 neonCyberpunkGrid(vec2 uv, float t) {
            vec3 base = renderGridWorld(uv, t);
            base = addRandomForms(uv, t, base);
            base = addBurstEffects(uv, t, base);
            
            // Add scanlines
            float scanlines = sin(uv.y * 400.0) * 0.05;
            base += vec3(0.0, 0.05, 0.05) * scanlines;
            
            return base;
        }
        
        vec3 organicBioGrid(vec2 uv, float t) {
            vec3 base = renderGridWorld(uv, t);
            base = addRandomForms(uv, t, base);
            base = addBurstEffects(uv, t, base);
            
            // Add organic pulsing
            float pulse = sin(t * 1.5 + length(uv) * 3.0) * 0.1 + 0.9;
            base *= pulse;
            
            return base;
        }
        
        vec3 crystalDimension(vec2 uv, float t) {
            vec3 base = renderGridWorld(uv, t);
            base = addRandomForms(uv, t, base);
            base = addBurstEffects(uv, t, base);
            
            // Prismatic effects
            float prism = sin(uv.x * 10.0 + t) * sin(uv.y * 8.0 + t * 1.3);
            vec3 rainbow = vec3(
                sin(prism + 0.0) * 0.5 + 0.5,
                sin(prism + 2.0) * 0.5 + 0.5,
                sin(prism + 4.0) * 0.5 + 0.5
            );
            base += rainbow * 0.05 * smoothstep(0.3, 0.7, abs(prism));
            
            return base;
        }
        
        vec3 voidMatrix(vec2 uv, float t) {
            vec3 base = renderGridWorld(uv, t);
            base = addRandomForms(uv, t, base);
            base = addBurstEffects(uv, t, base);
            
            // Digital rain effect
            float rain = 0.0;
            for(int i = 0; i < 5; i++) {
                float x = float(i) * 0.2 - 0.4;
                float y = mod(t * 1.5 + float(i) * 0.3, 2.0) - 1.0;
                rain += exp(-length(uv - vec2(x, y)) * 30.0);
            }
            base += vec3(0.0, 1.0, 0.0) * rain * 0.3;
            
            return base;
        }
        
        vec3 plasmaStorm(vec2 uv, float t) {
            vec3 base = renderGridWorld(uv, t);
            base = addRandomForms(uv, t, base);
            base = addBurstEffects(uv, t, base);
            
            // Plasma effects
            float plasma = sin(uv.x * 3.0 + t * 2.0) * cos(uv.y * 4.0 + t * 1.5);
            vec3 plasmaColor = vec3(
                sin(plasma + t) * 0.5 + 0.5,
                sin(plasma + t + 2.0) * 0.5 + 0.5,
                sin(plasma + t + 4.0) * 0.5 + 0.5
            );
            base += plasmaColor * 0.2;
            
            return base;
        }

        // =========================================================================================
        // [MAIN SHADER LOGIC]
        // =========================================================================================
        void main() {
            vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / min(u_resolution.y, u_resolution.x);
            
            float time_warp = u_time * 0.5;
            
            vec3 color = u_background_color;
            
            // Shader selection based on index
            if (u_shader_index == 0) {
                color = neonCyberpunkGrid(uv, time_warp);
            } else if (u_shader_index == 1) {
                color = organicBioGrid(uv, time_warp);
            } else if (u_shader_index == 2) {
                color = crystalDimension(uv, time_warp);
            } else if (u_shader_index == 3) {
                color = voidMatrix(uv, time_warp);
            } else if (u_shader_index == 4) {
                color = plasmaStorm(uv, time_warp);
            }
            
            // Smooth transition between shaders
            color = mix(color, color * 1.2, u_transition);
            
            // Vignette effect
            float vignette = 1.0 - length(uv) * 0.2;
            color *= vignette;
            
            // Final color output
            gl_FragColor = vec4(color, 1.0);
        }
    `;

    // =================================================================================================
    // [SHADER COMPILATION AND PROGRAM CREATION]
    // =================================================================================================
    function createShader(type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            const infoLog = gl.getShaderInfoLog(shader);
            console.error('>>> SHADER COMPILE ERROR:', infoLog);
            gl.deleteShader(shader);
            throw new Error("Shader compilation failed.");
        }
        return shader;
    }

    function createProgram(vertexShader, fragmentShader) {
        const program = gl.createProgram();
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

    let positionAttributeLocation = -1;
    let timeUniformLocation = null;
    let resolutionUniformLocation = null;
    let speedUniformLocation = null;
    let shaderIndexUniformLocation = null;
    let transitionUniformLocation = null;
    let gridColorUniformLocation = null;
    let backgroundColorUniformLocation = null;
    let formColorsUniformLocation = null;
    let gridScaleUniformLocation = null;
    let positionBuffer = null;
    let startTime = performance.now();

    function setupWebGL() {
        let vs = null;
        let fs = null;
        try {
            vs = createShader(gl.VERTEX_SHADER, vertexShaderSource);
            fs = createShader(gl.FRAGMENT_SHADER, fragmentShaderSource);
            program = createProgram(vs, fs);

            positionAttributeLocation = gl.getAttribLocation(program, "a_position");
            timeUniformLocation = gl.getUniformLocation(program, "u_time");
            resolutionUniformLocation = gl.getUniformLocation(program, "u_resolution");
            speedUniformLocation = gl.getUniformLocation(program, "u_speed");
            shaderIndexUniformLocation = gl.getUniformLocation(program, "u_shader_index");
            transitionUniformLocation = gl.getUniformLocation(program, "u_transition");
            gridColorUniformLocation = gl.getUniformLocation(program, "u_grid_color");
            backgroundColorUniformLocation = gl.getUniformLocation(program, "u_background_color");
            formColorsUniformLocation = gl.getUniformLocation(program, "u_form_colors");
            gridScaleUniformLocation = gl.getUniformLocation(program, "u_grid_scale");

            positionBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
            const positions = new Float32Array([-1, 1, -1, -1, 1, 1, 1, -1]);
            gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

            return true;
        } catch (error) {
            console.error(">>> Failed during WebGL setup:", error);
            if (program) gl.deleteProgram(program);
            program = null;
            return false;
        } finally {
            if (vs) gl.deleteShader(vs);
            if (fs) gl.deleteShader(fs);
        }
    }

    // =================================================================================================
    // [RENDER LOOP WITH SHADER CYCLING]
    // =================================================================================================
    function render(now) {
        if (!program) {
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
            return;
        }

        let time = (now - startTime) * 0.001;

        // Auto-cycle through grid worlds every 15 seconds
        if (time - lastShaderChange > 15.0) {
            currentShaderIndex = (currentShaderIndex + 1) % 5;
            lastShaderChange = time;
            shaderTransitionTime = time;
            
            // Display grid world info
            const world = gridWorlds[currentShaderIndex];
            console.log(`[GRID WORLD] ${world.name}`);
            console.log(`[DESCRIPTION] ${world.description}`);
        }

        // Calculate transition effect
        let transition = Math.min(1.0, (time - shaderTransitionTime) / 2.0);

        const currentWidth = window.innerWidth;
        const currentHeight = window.innerHeight;

        if (webglCanvas.width !== currentWidth || webglCanvas.height !== currentHeight) {
            webglCanvas.width = currentWidth;
            webglCanvas.height = currentHeight;
            gl.viewport(0, 0, currentWidth, currentHeight);
        }

        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.useProgram(program);

        // Set up vertex attributes
        gl.enableVertexAttribArray(positionAttributeLocation);
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

        // Set uniforms
        const currentWorld = gridWorlds[currentShaderIndex];
        
        gl.uniform1f(timeUniformLocation, time);
        gl.uniform2f(resolutionUniformLocation, currentWidth, currentHeight);
        gl.uniform1f(speedUniformLocation, currentWorld.speed);
        gl.uniform1i(shaderIndexUniformLocation, currentShaderIndex);
        gl.uniform1f(transitionUniformLocation, transition);
        gl.uniform3f(gridColorUniformLocation, currentWorld.gridColor[0], currentWorld.gridColor[1], currentWorld.gridColor[2]);
        gl.uniform3f(backgroundColorUniformLocation, currentWorld.backgroundColor[0], currentWorld.backgroundColor[1], currentWorld.backgroundColor[2]);
        gl.uniform1f(gridScaleUniformLocation, currentWorld.gridScale);
        
        // Set form colors array
        const formColors = new Float32Array(9); // 3 colors * 3 components
        for(let i = 0; i < 3; i++) {
            formColors[i * 3] = currentWorld.formColors[i][0];
            formColors[i * 3 + 1] = currentWorld.formColors[i][1];
            formColors[i * 3 + 2] = currentWorld.formColors[i][2];
        }
        gl.uniform3fv(formColorsUniformLocation, formColors);

        // Draw
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        animationFrameId = requestAnimationFrame(render);
    }

    // =================================================================================================
    // [INITIALIZATION AND STARTUP]
    // =================================================================================================
    function initialize() {
        if (!setupWebGL()) {
            console.error("[FATAL] Grid World WebGL setup failed. Cannot continue.");
            return false;
        }

        console.log("[SUCCESS] Optimized Grid World shader system initialized.");
        console.log("[INFO] Cycling through 5 different grid worlds every 15 seconds.");
        
        // Start the render loop
        animationFrameId = requestAnimationFrame(render);
        return true;
    }

    // =================================================================================================
    // [WINDOW RESIZE HANDLER]
    // =================================================================================================
    window.addEventListener('resize', function() {
        if (webglCanvas) {
            webglCanvas.width = window.innerWidth;
            webglCanvas.height = window.innerHeight;
            if (gl) {
                gl.viewport(0, 0, window.innerWidth, window.innerHeight);
            }
        }
    });

    // =================================================================================================
    // [EXTERNAL API - EXPOSED FUNCTIONS]
    // =================================================================================================
    window.updateShader = function(options = {}) {
        if (options.worldIndex !== undefined && options.worldIndex >= 0 && options.worldIndex < 5) {
            currentShaderIndex = options.worldIndex;
            shaderTransitionTime = performance.now() * 0.001;
            lastShaderChange = shaderTransitionTime;
            
            const world = gridWorlds[currentShaderIndex];
            console.log(`[MANUAL SWITCH] ${world.name}`);
        }
        
        if (options.speed !== undefined) {
            gridWorlds[currentShaderIndex].speed = Math.max(0.1, Math.min(5.0, options.speed));
        }
    };

    // =================================================================================================
    // [AUTO-INITIALIZATION]
    // =================================================================================================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

})();
