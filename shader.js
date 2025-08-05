// =================================================================================================
// [SYSTEM BOOTSTRAP] :: IMMEDIATE-INVOKED FUNCTION EXPRESSION (IIFE)
// Creative WebGL rendering system with completely new visual effects
// Only the `window.updateShader` function is intentionally exposed for external control.
// =================================================================================================
(function() {
    "use strict";

    // --- Core Variable Declarations ---
    const webglCanvas = document.getElementById('webglCanvas');
    let gl = null;
    let program = null;
    let animationFrameId = null;

    // --- Error Handling and Initialization Check ---
    if (!webglCanvas) {
        console.error("[FATAL] WebGL Canvas element with id 'webglCanvas' not found in DOM. Aborting.");
        return;
    }

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

        if (gl instanceof WebGL2RenderingContext) {
            console.log("[INFO] WebGL2 Rendering Context initialized successfully.");
        } else {
            console.log("[WARN] WebGL1 Rendering Context initialized. Some GLSL 3.00 ES features may not be supported.");
        }
    } catch (e) {
        console.error("[FATAL] WebGL Initialization Error:", e);
        if (document.body) document.body.style.backgroundColor = '#050511';
        return;
    }

    // =================================================================================================
    // [SHADER SOURCE CODE] :: GLSL 3.00 ES - COMPLETELY NEW CREATIVE EFFECTS
    // =================================================================================================

    const vertexShaderSource = `#version 300 es
        in vec4 a_position;
        void main() {
            gl_Position = a_position;
        }
    `;

    const fragmentShaderSource = `#version 300 es
        precision highp float;

        uniform float u_time;
        uniform vec2 u_resolution;
        uniform vec2 u_mouse;
        uniform float u_intensity;
        uniform float u_speed;

        out vec4 outColor;

        const float PI = 3.14159265359;
        const float TWO_PI = 6.28318530718;
        const float TOTAL_PHASES_F = 15.0;

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
        
        float fbm(vec2 p) {
            float v = 0.0, a = 0.5;
            for(int i = 0; i < 4; i++) {
                v += a * noise(p);
                p *= 2.0; a *= 0.5;
            }
            return v;
        }
        
        mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, s, -s, c); }

        // =========================================================================================
        // [COLOR PALETTES]
        // =========================================================================================
        vec3 neonPink = vec3(1.0, 0.1, 0.8);
        vec3 neonBlue = vec3(0.1, 0.8, 1.0);
        vec3 neonGreen = vec3(0.1, 1.0, 0.3);
        vec3 deepPurple = vec3(0.3, 0.1, 0.8);
        vec3 fireOrange = vec3(1.0, 0.4, 0.1);
        vec3 iceBlue = vec3(0.4, 0.9, 1.0);
        vec3 acidGreen = vec3(0.7, 1.0, 0.2);
        vec3 darkBg = vec3(0.02, 0.02, 0.1);

        // =========================================================================================
        // [EFFECT FUNCTIONS]
        // =========================================================================================

        vec3 plasmaStorm(vec2 uv, float t) {
            float v1 = sin(uv.x * 8.0 + t * 2.0);
            float v2 = sin(10.0 * (uv.x * sin(t * 0.5) + uv.y * cos(t * 0.7)) + t * 1.5);
            float v3 = sin(sqrt(50.0 * dot(uv, uv) + 1.0) + t * 3.0);
            float plasma = (v1 + v2 + v3) / 3.0;
            return mix(neonPink, neonBlue, sin(plasma * PI + t) * 0.5 + 0.5);
        }

        vec3 crystalCave(vec2 uv, float t) {
            vec2 p = uv * 6.0;
            p = rot(t * 0.3) * p;
            float crystal = 0.0;
            for(int i = 0; i < 6; i++) {
                float angle = float(i) * PI / 3.0 + t * 0.5;
                vec2 dir = vec2(cos(angle), sin(angle));
                crystal = max(crystal, 1.0 / (1.0 + abs(dot(p, dir)) * 3.0));
            }
            float shimmer = sin(crystal * 15.0 + t * 4.0) * 0.5 + 0.5;
            return mix(iceBlue, neonGreen, shimmer) * crystal * 2.0;
        }

        vec3 vortexGalaxy(vec2 uv, float t) {
            float angle = atan(uv.y, uv.x) + t * 0.5;
            float radius = length(uv);
            angle += sin(radius * 4.0 - t * 2.0) * 0.5;
            float spiral = sin(angle * 3.0 + radius * 8.0 - t * 2.0) * 0.5 + 0.5;
            float glow = exp(-radius * 1.5) * 2.0;
            return mix(deepPurple, fireOrange, spiral) * glow;
        }

        vec3 quantumField(vec2 uv, float t) {
            vec2 p = uv * 5.0;
            float quantum = 0.0;
            for(int i = 0; i < 4; i++) {
                vec2 offset = vec2(hash(vec2(float(i))), hash(vec2(float(i) + 50.0))) * 4.0 - 2.0;
                offset *= sin(t * 0.8 + float(i)) * 0.5 + 0.5;
                quantum += exp(-length(p - offset * 2.0)) * (sin(t * 3.0 + float(i)) * 0.5 + 0.5);
            }
            float interference = sin(quantum * 12.0 + t * 5.0);
            return vec3(quantum, quantum * interference, quantum * cos(t + length(uv))) * 1.5;
        }

        vec3 electricWeb(vec2 uv, float t) {
            vec2 grid = fract(uv * 12.0 + t * 0.2) - 0.5;
            float line = min(abs(grid.x), abs(grid.y));
            line = 1.0 - smoothstep(0.0, 0.1, line);
            float pulse = sin(t * 4.0 + length(uv) * 8.0) * 0.5 + 0.5;
            float spark = hash(floor(uv * 12.0 + t * 0.2)) > 0.95 ? 1.0 : 0.0;
            return (neonBlue * line * pulse + neonPink * spark) * 2.0;
        }

        vec3 liquidMetal(vec2 uv, float t) {
            vec2 p = uv * 3.0 + vec2(sin(t * 0.4), cos(t * 0.6)) * 0.5;
            float n1 = fbm(p + t * 0.3);
            float n2 = fbm(p * 1.5 - t * 0.2);
            float metal = sin(n1 * 8.0 + n2 * 6.0 + t * 2.0) * 0.5 + 0.5;
            vec3 silver = vec3(0.8, 0.9, 1.0);
            vec3 gold = vec3(1.0, 0.8, 0.3);
            return mix(silver, gold, metal) * (0.5 + metal * 0.5);
        }

        vec3 dimensionalRift(vec2 uv, float t) {
            float rift = abs(uv.x + sin(uv.y * 5.0 + t) * 0.2);
            rift = 1.0 - smoothstep(0.0, 0.15, rift);
            vec2 bg_uv = uv * 2.0 + vec2(t * 0.5, 0);
            float bg = fbm(bg_uv);
            vec3 bg_color = mix(darkBg, deepPurple, bg);
            vec3 rift_color = mix(neonPink, vec3(1.0), sin(t * 10.0 + uv.y * 15.0) * 0.5 + 0.5);
            return mix(bg_color, rift_color, rift * 2.0);
        }

        vec3 cosmicDust(vec2 uv, float t) {
            vec2 p = uv * 8.0;
            float dust = 0.0;
            for(int i = 0; i < 5; i++) {
                vec2 offset = vec2(hash(vec2(float(i) * 17.3)), hash(vec2(float(i) * 23.7))) * 6.0 - 3.0;
                offset += vec2(sin(t * 0.3 + float(i)), cos(t * 0.4 + float(i))) * 2.0;
                float size = 0.5 + hash(vec2(float(i) * 41.2)) * 1.5;
                dust += exp(-length(p - offset) * size) * (0.5 + sin(t * 2.0 + float(i)) * 0.5);
            }
            return mix(darkBg, mix(fireOrange, iceBlue, sin(t + length(uv)) * 0.5 + 0.5), dust);
        }

        vec3 neuralNetwork(vec2 uv, float t) {
            vec2 cell = floor(uv * 8.0);
            vec2 fpos = fract(uv * 8.0);
            float minDist = 8.0;
            vec2 nearestPoint;
            for(int x = -1; x <= 1; x++) {
                for(int y = -1; y <= 1; y++) {
                    vec2 neighbor = vec2(x, y);
                    vec2 point = vec2(hash(cell + neighbor), hash(cell + neighbor + vec2(100.0)));
                    point = 0.5 + 0.3 * sin(t * 0.5 + point * TWO_PI);
                    float dist = length(neighbor + point - fpos);
                    if(dist < minDist) {
                        minDist = dist;
                        nearestPoint = cell + neighbor + point;
                    }
                }
            }
            float connection = 1.0 - smoothstep(0.0, 0.3, minDist);
            float pulse = sin(t * 3.0 + nearestPoint.x + nearestPoint.y) * 0.5 + 0.5;
            return mix(acidGreen, neonBlue, pulse) * connection * 1.5;
        }

        vec3 timeWarp(vec2 uv, float t) {
            float radius = length(uv);
            float angle = atan(uv.y, uv.x);
            angle += sin(radius * 6.0 - t * 3.0) * (1.0 - radius);
            vec2 warped = vec2(cos(angle), sin(angle)) * radius;
            float warp = fbm(warped * 4.0 + t * 0.2);
            float time_distort = sin(warp * 10.0 + t * 4.0) * 0.5 + 0.5;
            return mix(deepPurple, fireOrange, time_distort) * (1.0 - radius * 0.5);
        }

        vec3 holographicGlitch(vec2 uv, float t) {
            vec2 originalUV = uv;
            float glitch_intensity = sin(t * 7.0) * 0.5 + 0.5;
            uv.x += sin(t * 23.0 + uv.y * 50.0) * 0.01 * glitch_intensity;
            
            float holo = sin(uv.y * 100.0 + t * 5.0) * 0.5 + 0.5;
            vec3 r_channel = vec3(holo + 0.02, 0, 0);
            vec3 g_channel = vec3(0, holo, 0);
            vec3 b_channel = vec3(0, 0, holo - 0.02);
            
            float scan = sin(originalUV.y * 200.0 + t * 10.0) * 0.1 + 0.9;
            return (r_channel + g_channel + b_channel) * scan * neonBlue;
        }

        vec3 fractalFlame(vec2 uv, float t) {
            vec2 p = uv * 4.0;
            p = rot(t * 0.2) * p;
            float flame = 0.0;
            for(int i = 0; i < 6; i++) {
                p = abs(p) - 0.8;
                p = rot(0.8 + sin(t * 0.3) * 0.4) * p;
                flame += 1.0 / (1.0 + length(p) * float(i + 1));
            }
            float flicker = sin(t * 8.0 + length(uv) * 10.0) * 0.2 + 0.8;
            return mix(fireOrange, neonPink, flame * 0.5) * flame * flicker;
        }

        // =========================================================================================
        // [MAIN SHADER LOGIC]
        // =========================================================================================
        void main() {
            vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / min(u_resolution.y, u_resolution.x);
            vec2 originalUV = gl_FragCoord.xy / u_resolution.xy;

            float time_warp = u_time * 0.4 * u_speed;
            float phase = mod(time_warp, TOTAL_PHASES_F);
            float phaseProgress = fract(phase);
            int phaseIndex = int(floor(phase));

            vec3 color = darkBg;

            // Phase dispatcher with completely new effects
            if (phaseIndex == 0) {
                color = plasmaStorm(uv, u_time);
            }
            else if (phaseIndex == 1) {
                color = crystalCave(uv, u_time);
            }
            else if (phaseIndex == 2) {
                color = vortexGalaxy(uv, u_time);
            }
            else if (phaseIndex == 3) {
                color = quantumField(uv, u_time);
            }
            else if (phaseIndex == 4) {
                color = electricWeb(uv, u_time);
            }
            else if (phaseIndex == 5) {
                color = liquidMetal(uv, u_time);
            }
            else if (phaseIndex == 6) {
                color = dimensionalRift(uv, u_time);
            }
            else if (phaseIndex == 7) {
                color = cosmicDust(uv, u_time);
            }
            else if (phaseIndex == 8) {
                color = neuralNetwork(uv, u_time);
            }
            else if (phaseIndex == 9) {
                color = timeWarp(uv, u_time);
            }
            else if (phaseIndex == 10) {
                color = holographicGlitch(uv, u_time);
            }
            else if (phaseIndex == 11) {
                color = fractalFlame(uv, u_time);
            }
            else if (phaseIndex >= 12) {
                // Additional creative variations
                float selector = mod(float(phaseIndex - 12), 3.0);
                if (selector < 1.0) {
                    color = mix(plasmaStorm(uv, u_time), crystalCave(uv * 0.5, u_time), 0.5);
                } else if (selector < 2.0) {
                    color = mix(quantumField(uv, u_time), electricWeb(uv, u_time), sin(u_time) * 0.5 + 0.5);
                } else {
                    color = mix(vortexGalaxy(uv, u_time), fractalFlame(uv * 1.5, u_time), 0.7);
                }
            }

            // Mouse interaction
            vec2 mouse_pos = u_mouse * 2.0 - 1.0;
            mouse_pos.y *= -1.0; // Correct mouse Y
            float mouse_dist = length(uv - mouse_pos);
            float mouse_effect = exp(-mouse_dist * 3.0) * u_intensity * 0.5;
            color += neonPink * mouse_effect;

            // Intensity modulation
            color *= u_intensity;

            // Vignette
            float vignette = smoothstep(1.8, 0.5, length(uv));
            color *= vignette;

            // Subtle scanlines
            float scanline = sin(originalUV.y * u_resolution.y * 1.5) * 0.02 + 0.98;
            color *= scanline;

            outColor = vec4(clamp(color, 0.0, 1.0), 1.0);
        }
    `;

    // =================================================================================================
    // [WEBGL UTILITY FUNCTIONS] :: SAME AS ORIGINAL
    // =================================================================================================

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
    // [WEBGL STATE & SETUP] :: SAME STRUCTURE AS ORIGINAL
    // =================================================================================================

    let positionAttributeLocation = -1;
    let timeUniformLocation = null;
    let resolutionUniformLocation = null;
    let mouseUniformLocation = null;
    let intensityUniformLocation = null;
    let speedUniformLocation = null;
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
            mouseUniformLocation = gl.getUniformLocation(program, "u_mouse");
            intensityUniformLocation = gl.getUniformLocation(program, "u_intensity");
            speedUniformLocation = gl.getUniformLocation(program, "u_speed");

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
    // [RENDER LOOP] :: SAME AS ORIGINAL
    // =================================================================================================
    function render(now) {
        if (!program) {
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
            return;
        }

        let time = (now - startTime) * 0.001;

        const currentWidth = window.innerWidth;
        const currentHeight = window.innerHeight;
        if (webglCanvas.width !== currentWidth || webglCanvas.height !== currentHeight) {
            webglCanvas.width = currentWidth;
            webglCanvas.height = currentHeight;
            gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        }

        gl.useProgram(program);

        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.enableVertexAttribArray(positionAttributeLocation);
        gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

        gl.uniform1f(timeUniformLocation, time);
        gl.uniform2f(resolutionUniformLocation, gl.canvas.width, gl.canvas.height);

        let mx = window.shaderMouse ? window.shaderMouse.x : 0.5;
        let my = window.shaderMouse ? window.shaderMouse.y : 0.5;
        gl.uniform2f(mouseUniformLocation, mx, my);
        gl.uniform1f(intensityUniformLocation, window.shaderIntensity !== undefined ? window.shaderIntensity : 1.0);
        gl.uniform1f(speedUniformLocation, window.shaderSpeed !== undefined ? window.shaderSpeed : 1.0);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        animationFrameId = requestAnimationFrame(render);
    }

    // =================================================================================================
    // [GLOBAL INTERFACE & EVENT LISTENERS] :: SAME AS ORIGINAL
    // =================================================================================================

    window.updateShader = function(newShaderCode) {
        console.warn("Dynamic shader updates are complex and not fully implemented in this version.");
    };

    window.shaderMouse = { x: 0.5, y: 0.5 };
    window.addEventListener('mousemove', (e) => {
        window.shaderMouse.x = e.clientX / window.innerWidth;
        window.shaderMouse.y = 1.0 - (e.clientY / window.innerHeight);
    });

    if (setupWebGL()) {
        console.log("[INFO] WebGL setup successful. Starting render loop.");
        animationFrameId = requestAnimationFrame(render);
    } else {
        console.error("[FATAL] WebGL setup failed. Render loop will not start.");
    }

})();
