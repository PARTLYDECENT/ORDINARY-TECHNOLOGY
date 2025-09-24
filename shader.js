// =================================================================================================
// [GRID JOURNEY] :: 3D TUNNEL WORLD SHADER - IIFE SCRIPT
// Uncanny digital landscape with structured journey through grid space
// =================================================================================================
(function() {
    "use strict";

    let canvas, gl, program, animationId;
    let time = 0, journeyMode = 0, speed = 1.0;
    let cameraPos = [0, 0, 0], cameraRot = [0, 0, 0];
    let keys = {}, autoJourney = true;
    
    // =================================================================================================
    // [JOURNEY MODES] :: Different tunnel/grid experiences
    // =================================================================================================
    const journeyModes = [
        { 
            name: "Cyber Tunnels", 
            colors: [[0.0,1.0,1.0], [0.0,0.5,1.0], [1.0,0.0,1.0]], 
            params: [1.0, 0.8, 0.3],
            gridSize: 2.0,
            fogDensity: 0.02
        },
        { 
            name: "Neon Underground", 
            colors: [[1.0,0.2,0.8], [0.2,1.0,0.3], [1.0,0.8,0.0]], 
            params: [1.5, 0.6, 0.5],
            gridSize: 1.5,
            fogDensity: 0.025
        },
        { 
            name: "Data Highways", 
            colors: [[0.1,0.8,0.1], [0.0,1.0,0.5], [0.5,0.5,1.0]], 
            params: [0.8, 1.0, 0.2],
            gridSize: 3.0,
            fogDensity: 0.015
        },
        { 
            name: "Ghost Protocol", 
            colors: [[0.8,0.8,1.0], [0.3,0.3,0.6], [1.0,0.9,0.7]], 
            params: [2.0, 0.4, 0.7],
            gridSize: 1.2,
            fogDensity: 0.03
        },
        { 
            name: "Neural Pathways", 
            colors: [[1.0,0.3,0.0], [0.8,0.0,0.8], [0.0,0.6,1.0]], 
            params: [1.2, 0.9, 0.4],
            gridSize: 2.5,
            fogDensity: 0.02
        }
    ];

    // =================================================================================================
    // [OPTIMIZED VERTEX SHADER]
    // =================================================================================================
    const vertexSource = `
        attribute vec2 position;
        varying vec2 vUv;
        void main() {
            vUv = position;
            gl_Position = vec4(position, 0.0, 1.0);
        }
    `;

    // =================================================================================================
    // [3D GRID JOURNEY FRAGMENT SHADER]
    // =================================================================================================
    const fragmentSource = `
        precision highp float;
        uniform float time, speed;
        uniform int mode;
        uniform vec2 resolution;
        uniform vec3 cameraPos, cameraRot;
        uniform vec3 color1, color2, color3;
        uniform vec3 params;
        uniform float gridSize, fogDensity;
        varying vec2 vUv;
        
        const float PI = 3.14159265;
        const int MAX_STEPS = 80;
        const float MIN_DIST = 0.001;
        const float MAX_DIST = 100.0;
        
        // Rotation matrices
        mat3 rotateX(float a) {
            float c = cos(a), s = sin(a);
            return mat3(1,0,0, 0,c,-s, 0,s,c);
        }
        
        mat3 rotateY(float a) {
            float c = cos(a), s = sin(a);
            return mat3(c,0,s, 0,1,0, -s,0,c);
        }
        
        // Smooth noise for organic movement
        float noise(vec3 p) {
            vec3 f = fract(p);
            p = floor(p);
            f = f * f * (3.0 - 2.0 * f);
            float n = p.x + p.y * 57.0 + p.z * 113.0;
            return mix(
                mix(mix(fract(sin(n) * 43758.5), fract(sin(n + 1.0) * 43758.5), f.x),
                    mix(fract(sin(n + 57.0) * 43758.5), fract(sin(n + 58.0) * 43758.5), f.x), f.y),
                mix(mix(fract(sin(n + 113.0) * 43758.5), fract(sin(n + 114.0) * 43758.5), f.x),
                    mix(fract(sin(n + 170.0) * 43758.5), fract(sin(n + 171.0) * 43758.5), f.x), f.y), f.z);
        }
        
        // Distance field for 3D grid structures
        float gridSDF(vec3 p) {
            if(mode == 0) {
                // Cyber tunnel with grid walls
                vec3 q = p;
                q.z = mod(q.z + time * speed * 2.0, gridSize) - gridSize * 0.5;
                
                float tunnel = length(p.xy) - 3.0 - sin(p.z * 0.1 + time) * 0.5;
                float grid = min(
                    abs(mod(q.x, gridSize) - gridSize * 0.5) - 0.05,
                    abs(mod(q.y, gridSize) - gridSize * 0.5) - 0.05
                );
                return max(-tunnel, grid);
            }
            else if(mode == 1) {
                // Underground neon passages  
                vec3 q = p;
                q.z = mod(q.z + time * speed, gridSize * 2.0) - gridSize;
                
                float corridor = max(abs(p.x) - 2.0, abs(p.y) - 1.5);
                float bars = min(
                    abs(mod(q.x, gridSize * 0.5) - gridSize * 0.25) - 0.02,
                    abs(mod(q.z, gridSize * 0.3) - gridSize * 0.15) - 0.02
                );
                return max(-corridor, bars);
            }
            else if(mode == 2) {
                // Data highway lanes
                vec3 q = p;
                q.z = mod(q.z + time * speed * 3.0, gridSize) - gridSize * 0.5;
                
                float highway = abs(p.y) - 0.1;
                float lanes = abs(mod(p.x + gridSize * 0.5, gridSize) - gridSize * 0.5) - 0.05;
                float dividers = abs(mod(q.z, gridSize * 0.2) - gridSize * 0.1) - 0.02;
                
                return max(highway, min(lanes, dividers));
            }
            else if(mode == 3) {
                // Ghost protocol - floating platforms
                vec3 q = p;
                q.z = mod(q.z + time * speed * 1.5, gridSize * 3.0) - gridSize * 1.5;
                
                float platforms = abs(p.y + 1.0) - 0.1;
                float holes = length(mod(p.xz, gridSize) - gridSize * 0.5) - gridSize * 0.3;
                
                return max(platforms, -holes);
            }
            else {
                // Neural pathways - organic tubes
                vec3 q = p;
                float twist = sin(p.z * 0.1) * 0.5;
                q.x += sin(p.z * 0.2 + time) * 0.8;
                q.y += cos(p.z * 0.15 + time * 0.7) * 0.6;
                
                float tube = length(q.xy) - 2.5;
                float segments = abs(mod(p.z + time * speed, gridSize) - gridSize * 0.5) - 0.1;
                
                return max(tube, segments);
            }
        }
        
        // Raymarching through the 3D grid world
        vec4 raymarch(vec3 origin, vec3 direction) {
            float dist = 0.0;
            vec3 pos = origin;
            
            for(int i = 0; i < MAX_STEPS; i++) {
                float d = gridSDF(pos);
                
                if(d < MIN_DIST) {
                    // Hit surface - calculate lighting
                    vec3 normal = normalize(vec3(
                        gridSDF(pos + vec3(0.001, 0, 0)) - gridSDF(pos - vec3(0.001, 0, 0)),
                        gridSDF(pos + vec3(0, 0.001, 0)) - gridSDF(pos - vec3(0, 0.001, 0)),
                        gridSDF(pos + vec3(0, 0, 0.001)) - gridSDF(pos - vec3(0, 0, 0.001))
                    ));
                    
                    float light = max(0.0, dot(normal, normalize(vec3(1, 1, -1))));
                    float fresnel = 1.0 - max(0.0, dot(normal, -direction));
                    
                    // Mode-specific surface effects
                    vec3 surfaceColor = color1;
                    if(mode == 0) {
                        surfaceColor = mix(color1, color2, sin(pos.z * 0.5 + time * 2.0) * 0.5 + 0.5);
                    } else if(mode == 1) {
                        surfaceColor = mix(color2, color3, fresnel);
                    } else if(mode == 2) {
                        surfaceColor = color2 * (sin(pos.x * 2.0 + time * 4.0) * 0.5 + 0.5);
                    } else if(mode == 3) {
                        surfaceColor = mix(color1, color3, noise(pos * 0.5));
                    } else {
                        surfaceColor = mix(color1, color2, light);
                    }
                    
                    return vec4(surfaceColor * (light * 0.7 + 0.3), dist);
                }
                
                if(dist > MAX_DIST) break;
                
                pos += direction * d;
                dist += d;
            }
            
            // Didn't hit anything - return background
            return vec4(0.0, 0.0, 0.0, MAX_DIST);
        }
        
        void main() {
            vec2 uv = (vUv * 2.0 - 1.0) * vec2(resolution.x / resolution.y, 1.0);
            
            // Camera setup with rotation
            vec3 camPos = cameraPos;
            mat3 camRot = rotateY(cameraRot.y) * rotateX(cameraRot.x);
            vec3 rayDir = normalize(camRot * vec3(uv, 1.0));
            
            // March through the grid world
            vec4 result = raymarch(camPos, rayDir);
            vec3 color = result.rgb;
            float depth = result.a;
            
            // Atmospheric fog
            float fog = exp(-depth * fogDensity);
            vec3 fogColor = mix(color1 * 0.1, color2 * 0.05, sin(time * 0.5) * 0.5 + 0.5);
            color = mix(fogColor, color, fog);
            
            // Journey-specific post effects
            if(mode == 0) {
                // Cyber scan lines
                color += sin(vUv.y * resolution.y * 0.5) * 0.02;
            } else if(mode == 1) {
                // Underground glow
                color += exp(-depth * 0.1) * color2 * 0.1;
            } else if(mode == 2) {
                // Data stream particles
                float stream = noise(vec3(vUv * 10.0, time * 5.0)) * exp(-depth * 0.05);
                color += stream * color3 * 0.15;
            } else if(mode == 3) {
                // Ghostly interference
                float interference = sin(uv.x * 20.0 + time * 3.0) * sin(uv.y * 15.0 + time * 2.0);
                color += interference * 0.03 * color1;
            } else {
                // Neural pulse
                float pulse = sin(depth * 0.1 - time * 2.0) * exp(-depth * 0.02);
                color += pulse * color2 * 0.1;
            }
            
            // Final tweaks
            color = pow(color, vec3(0.8)); // Slight gamma
            color *= 1.0 - length(vUv) * 0.1; // Subtle vignette
            
            gl_FragColor = vec4(color, 1.0);
        }
    `;

    // =================================================================================================
    // [HYPER-OPTIMIZED WEBGL SETUP]
    // =================================================================================================
    function initWebGL() {
        canvas = document.createElement('canvas');
        canvas.id = 'gridJourneyCanvas';
        canvas.style.cssText = `
            position: fixed; top: 0; left: 0; z-index: -1;
            width: 100vw; height: 100vh; background: #000;
        `;
        document.body.appendChild(canvas);
        
        gl = canvas.getContext('webgl', { 
            antialias: false, 
            depth: false, 
            stencil: false,
            alpha: false,
            preserveDrawingBuffer: false,
            powerPreference: "high-performance"
        });
        
        if (!gl) throw new Error("WebGL not supported");
        
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        gl.viewport(0, 0, canvas.width, canvas.height);
        
        console.log("[GRID JOURNEY] WebGL initialized - Grid matrix loaded");
    }

    function compileShader(type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            throw new Error(`Shader error: ${gl.getShaderInfoLog(shader)}`);
        }
        return shader;
    }

    function createProgram() {
        const vs = compileShader(gl.VERTEX_SHADER, vertexSource);
        const fs = compileShader(gl.FRAGMENT_SHADER, fragmentSource);
        
        program = gl.createProgram();
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.linkProgram(program);
        
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            throw new Error(`Program error: ${gl.getProgramInfoLog(program)}`);
        }
        
        gl.useProgram(program);
        
        // Ultra-simple fullscreen quad
        const vertices = new Float32Array([-1,-1, 1,-1, 1,1, -1,-1, 1,1, -1,1]);
        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
        
        const pos = gl.getAttribLocation(program, 'position');
        gl.enableVertexAttribArray(pos);
        gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
        
        console.log("[GRID JOURNEY] Shader program compiled successfully");
    }

    // =================================================================================================
    // [CAMERA CONTROLS & MOVEMENT]
    // =================================================================================================
    function updateCamera(deltaTime) {
        const moveSpeed = 3.0 * speed;
        
        // Auto journey forward movement
        if (autoJourney) {
            cameraPos[2] += moveSpeed * deltaTime;
        }
        
        // Manual controls
        if (keys['ArrowUp'] || keys['w'] || keys['W']) cameraPos[1] += moveSpeed * deltaTime;
        if (keys['ArrowDown'] || keys['s'] || keys['S']) cameraPos[1] -= moveSpeed * deltaTime;
        if (keys['ArrowLeft'] || keys['a'] || keys['A']) cameraPos[0] -= moveSpeed * deltaTime;
        if (keys['ArrowRight'] || keys['d'] || keys['D']) cameraPos[0] += moveSpeed * deltaTime;
        
        // Speed boost
        speed = keys[' '] ? 2.0 : 1.0;
        
        // Gentle automatic camera sway for uncanny feeling
        cameraRot[0] = Math.sin(time * 0.3) * 0.05;
        cameraRot[1] = Math.sin(time * 0.2) * 0.1;
        
        // Auto mode switching for journey progression
        if (autoJourney && Math.floor(time / 12) !== Math.floor((time - deltaTime) / 12)) {
            journeyMode = Math.floor(time / 12) % journeyModes.length;
            console.log(`[GRID JOURNEY] Auto-switching to ${journeyModes[journeyMode].name}`);
        }
    }

    // =================================================================================================
    // [GRID RENDER LOOP] :: MAXIMUM PERFORMANCE
    // =================================================================================================
    let lastTime = 0;
    function render(timestamp) {
        const deltaTime = (timestamp - lastTime) / 1000;
        lastTime = timestamp;
        time = timestamp * 0.001;
        
        updateCamera(deltaTime);
        
        const mode = journeyModes[journeyMode];
        
        // Ultra-fast uniform updates
        gl.uniform1f(gl.getUniformLocation(program, 'time'), time);
        gl.uniform1f(gl.getUniformLocation(program, 'speed'), speed);
        gl.uniform1i(gl.getUniformLocation(program, 'mode'), journeyMode);
        gl.uniform2f(gl.getUniformLocation(program, 'resolution'), canvas.width, canvas.height);
        gl.uniform3f(gl.getUniformLocation(program, 'cameraPos'), cameraPos[0], cameraPos[1], cameraPos[2]);
        gl.uniform3f(gl.getUniformLocation(program, 'cameraRot'), cameraRot[0], cameraRot[1], cameraRot[2]);
        gl.uniform3f(gl.getUniformLocation(program, 'color1'), mode.colors[0][0], mode.colors[0][1], mode.colors[0][2]);
        gl.uniform3f(gl.getUniformLocation(program, 'color2'), mode.colors[1][0], mode.colors[1][1], mode.colors[1][2]);
        gl.uniform3f(gl.getUniformLocation(program, 'color3'), mode.colors[2][0], mode.colors[2][1], mode.colors[2][2]);
        gl.uniform3f(gl.getUniformLocation(program, 'params'), mode.params[0], mode.params[1], mode.params[2]);
        gl.uniform1f(gl.getUniformLocation(program, 'gridSize'), mode.gridSize);
        gl.uniform1f(gl.getUniformLocation(program, 'fogDensity'), mode.fogDensity);
        
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        animationId = requestAnimationFrame(render);
    }

    // =================================================================================================
    // [GRID CONTROL API] :: JOURNEY MANIPULATION
    // =================================================================================================
    window.gridJourney = {
        switchMode: (index) => {
            if (index >= 0 && index < journeyModes.length) {
                journeyMode = index;
                console.log(`[GRID JOURNEY] Entering ${journeyModes[index].name}`);
            }
        },
        
        setSpeed: (val) => {
            speed = Math.max(0, Math.min(5, val));
        },
        
        toggleAutoJourney: () => {
            autoJourney = !autoJourney;
            console.log(`[GRID JOURNEY] Auto-journey ${autoJourney ? 'enabled' : 'disabled'}`);
        },
        
        resetCamera: () => {
            cameraPos = [0, 0, 0];
            cameraRot = [0, 0, 0];
            console.log("[GRID JOURNEY] Camera reset");
        },
        
        getModes: () => journeyModes.map((m, i) => ({index: i, name: m.name})),
        
        getCurrentMode: () => ({index: journeyMode, name: journeyModes[journeyMode].name}),
        
        destroy: () => {
            if (animationId) cancelAnimationFrame(animationId);
            if (canvas) canvas.remove();
            console.log("[GRID JOURNEY] Journey terminated");
        }
    };

    // =================================================================================================
    // [JOURNEY INITIALIZATION]
    // =================================================================================================
    function initialize() {
        try {
            initWebGL();
            createProgram();
            
            // Performance monitoring
            let frameCount = 0, lastTime = performance.now();
            const renderLoop = (timestamp) => {
                frameCount++;
                render(timestamp);
            };
            
            function logPerformance() {
                const now = performance.now();
                const fps = frameCount / ((now - lastTime) / 1000);
                console.log(`[GRID JOURNEY PERF] ${fps.toFixed(1)} FPS - Mode: ${journeyModes[journeyMode].name}`);
                frameCount = 0;
                lastTime = now;
            }
            
            setInterval(logPerformance, 5000);
            
            animationId = requestAnimationFrame(renderLoop);
            
            console.log("[GRID JOURNEY] Journey matrix fully loaded");
            console.log("Use gridJourney.switchMode(0-4) to change journey types");
            console.log("Use gridJourney.setSpeed(1-5) for travel speed");
            
            return true;
        } catch (e) {
            console.error("[GRID JOURNEY ERROR] Journey matrix failed:", e);
            return false;
        }
    }

    // =================================================================================================
    // [JOURNEY HOOKS]
    // =================================================================================================
    window.addEventListener('resize', () => {
        if (canvas && gl) {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            gl.viewport(0, 0, canvas.width, canvas.height);
        }
    });
    
    // Keyboard controls for journey navigation
    window.addEventListener('keydown', (e) => {
        keys[e.key] = true;
        
        const key = parseInt(e.key);
        if (key >= 1 && key <= 5) {
            window.gridJourney.switchMode(key - 1);
        } else if (e.key.toLowerCase() === 'r') {
            window.gridJourney.resetCamera();
        } else if (e.key.toLowerCase() === 'j') {
            window.gridJourney.toggleAutoJourney();
        }
    });
    
    window.addEventListener('keyup', (e) => {
        keys[e.key] = false;
    });

    // Initialize when ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

})();
