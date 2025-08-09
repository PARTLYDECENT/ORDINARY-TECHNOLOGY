// =================================================================================================
// [SYSTEM BOOTSTRAP] :: IMMEDIATE-INVOKED FUNCTION EXPRESSION (IIFE)
// Creative WebGL rendering system with completely new visual effects
// Only the `window.updateShader` function is intentionally exposed for external control.
// =================================================================================================
(function() {
    "use strict";

    // --- Core Variable Declarations ---
    const webglCanvas = document.getElementById(\'webglCanvas\');
    let gl = null;
    let program = null;
    let animationFrameId = null;

    // --- Error Handling and Initialization Check ---
    if (!webglCanvas) {
        console.error("[FATAL] WebGL Canvas element with id \'webglCanvas\' not found in DOM. Aborting.");
        return;
    }

    // =================================================================================================
    // [CONTEXT INITIALIZATION] :: ATTEMPT TO SECURE WEBGL2/WEBGL1 CONTEXT
    // =================================================================================================
    try {
        webglCanvas.width = window.innerWidth;
        webglCanvas.height = window.innerHeight;

        gl = webglCanvas.getContext(\'webgl2\') ||
             webglCanvas.getContext(\'webgl\') ||
             webglCanvas.getContext(\'experimental-web-gl\');

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
        if (document.body) document.body.style.backgroundColor = \'#050511\';
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
        // [COLOR PALETTES] - Adjusted for uncanny, dark, alien vibes
        // =========================================================================================
        vec3 voidBlack = vec3(0.01, 0.01, 0.03);
        vec3 sicklyGreen = vec3(0.2, 0.8, 0.3);
        vec3 decayingRed = vec3(0.7, 0.1, 0.1);
        vec3 alienBlue = vec3(0.1, 0.4, 0.7);
        vec3 corruptedPurple = vec3(0.4, 0.1, 0.5);
        vec3 staticWhite = vec3(0.9, 0.9, 0.9);
        vec3 deepViolet = vec3(0.2, 0.0, 0.4);
        vec3 eerieYellow = vec3(0.8, 0.7, 0.1);

        // =========================================================================================
        // [EFFECT FUNCTIONS] - New shaders for uncanny, dark backrooms alien vibes
        // =========================================================================================

        vec3 liminalCorridor(vec2 uv, float t) {
            vec2 p = uv * 5.0;
            p.x += t * 0.1;
            float d = abs(sin(p.x * 0.5 + p.y * 0.2) + cos(p.y * 0.7 - p.x * 0.3)) * 0.5;
            float corridor = fbm(p * 0.8 + d * 0.5);
            corridor = pow(corridor, 2.0) * 2.0;
            vec3 color = mix(voidBlack, decayingRed, corridor);
            color = mix(color, sicklyGreen, sin(t * 0.5 + uv.x * 3.0) * 0.2 + 0.2);
            return color;
        }

        vec3 eldritchTentacles(vec2 uv, float t) {
            vec2 p = uv * 4.0;
            p = rot(t * 0.05) * p;
            float tentacle = 0.0;
            for(int i = 0; i < 5; i++) {
                p = abs(p) / dot(p, p) - 0.7;
                p = rot(sin(t * 0.1 + float(i)) * 0.5) * p;
                tentacle += exp(-length(p) * 0.8);
            }
            tentacle = fract(tentacle * 0.5 + t * 0.02);
            vec3 color = mix(corruptedPurple, alienBlue, tentacle);
            color *= (sin(length(uv) * 10.0 + t * 2.0) * 0.1 + 0.9);
            return color;
        }

        vec3 glitchedReality(vec2 uv, float t) {
            vec2 p = uv * 7.0;
            float glitch = 0.0;
            glitch += sin(p.x * 10.0 + t * 5.0) * 0.1;
            glitch += cos(p.y * 15.0 - t * 7.0) * 0.08;
            glitch += fbm(p * 2.0 + t * 0.3) * 0.2;
            
            vec2 distortedUV = uv + vec2(glitch, glitch * 0.5);
            float staticNoise = hash(floor(distortedUV * 100.0 + t * 100.0));
            vec3 color = mix(voidBlack, staticWhite, staticNoise * 0.3);
            color = mix(color, decayingRed, abs(sin(glitch * 20.0)) * 0.5);
            return color;
        }

        vec3 bioLuminescentSwamp(vec2 uv, float t) {
            vec2 p = uv * 6.0;
            float swamp = 0.0;
            for(int i = 0; i < 3; i++) {
                p = p * 1.8 + vec2(sin(t * 0.2 + float(i)), cos(t * 0.3 + float(i))) * 0.5;
                swamp += noise(p);
            }
            swamp = fract(swamp * 0.7 + t * 0.05);
            vec3 color = mix(sicklyGreen, alienBlue, swamp);
            color *= (0.5 + sin(length(uv) * 5.0 + t * 3.0) * 0.5);
            return color;
        }

        vec3 crystallineVoid(vec2 uv, float t) {
            vec2 p = uv * 8.0;
            p = rot(t * 0.07) * p;
            float crystal = 0.0;
            for(int i = 0; i < 4; i++) {
                p = abs(p) / dot(p, p) - 0.5;
                crystal += exp(-length(p) * 0.6);
            }
            crystal = fract(crystal * 0.3 + t * 0.01);
            vec3 color = mix(deepViolet, staticWhite, crystal);
            color *= (0.7 + sin(t * 0.8 + uv.y * 7.0) * 0.3);
            return color;
        }

        vec3 parasiticGrowth(vec2 uv, float t) {
            vec2 p = uv * 5.0;
            float growth = 0.0;
            for(int i = 0; i < 4; i++) {
                p = p * 1.5 + vec2(cos(t * 0.15 + float(i)), sin(t * 0.25 + float(i))) * 0.3;
                growth += fbm(p);
            }
            growth = fract(growth * 0.6 + t * 0.03);
            vec3 color = mix(decayingRed, sicklyGreen, growth);
            color *= (0.6 + cos(length(uv) * 8.0 - t * 2.0) * 0.4);
            return color;
        }

        vec3 spectralEchoes(vec2 uv, float t) {
            vec2 p = uv * 6.0;
            float echo = 0.0;
            for(int i = 0; i < 5; i++) {
                vec2 offset = vec2(sin(t * 0.1 + float(i)), cos(t * 0.15 + float(i))) * 0.2;
                echo += noise(p + offset);
            }
            echo = fract(echo * 0.4 + t * 0.02);
            vec3 color = mix(alienBlue, corruptedPurple, echo);
            color *= (0.8 + sin(uv.x * 12.0 + t * 4.0) * 0.2);
            return color;
        }

        vec3 voidGate(vec2 uv, float t) {
            vec2 p = uv * 4.0;
            float gate = 0.0;
            gate += 1.0 / (1.0 + pow(length(p - vec2(0.0, 0.0)), 2.0) * 5.0);
            gate += sin(p.x * 3.0 + t * 0.5) * 0.2;
            gate += cos(p.y * 4.0 - t * 0.7) * 0.2;
            gate = pow(gate, 3.0);
            vec3 color = mix(voidBlack, deepViolet, gate);
            color = mix(color, eerieYellow, sin(t * 0.9 + length(uv) * 6.0) * 0.3 + 0.3);
            return color;
        }

        vec3 alienGlyphs(vec2 uv, float t) {
            vec2 p = uv * 10.0;
            float glyph = 0.0;
            for(int i = 0; i < 3; i++) {
                p = rot(t * 0.03 + float(i) * PI / 2.0) * p;
                glyph += hash(floor(p));
            }
            glyph = fract(glyph * 0.7 + t * 0.01);
            vec3 color = mix(sicklyGreen, alienBlue, glyph);
            color *= (0.5 + cos(p.x * 2.0 + p.y * 2.0 + t * 1.5) * 0.5);
            return color;
        }

        vec3 pulsatingAbyss(vec2 uv, float t) {
            float r = length(uv);
            float a = atan(uv.y, uv.x);
            float pulse = sin(r * 15.0 - t * 2.0) * 0.5 + 0.5;
            pulse *= (0.5 + sin(a * 5.0 + t * 0.8) * 0.5);
            vec3 color = mix(voidBlack, corruptedPurple, pulse);
            color = mix(color, decayingRed, sin(t * 1.2 + r * 10.0) * 0.2 + 0.2);
            return color;
        }

        vec3 shiftingDimensions(vec2 uv, float t) {
            vec2 p = uv * 5.0;
            float shift = 0.0;
            shift += fbm(p + vec2(sin(t * 0.1), cos(t * 0.15)));
            shift += noise(p * 2.0 + t * 0.2);
            shift = fract(shift * 0.5 + t * 0.01);
            vec3 color = mix(deepViolet, eerieYellow, shift);
            color *= (0.7 + sin(uv.x * 8.0 + uv.y * 8.0 + t * 3.0) * 0.3);
            return color;
        }

        vec3 corruptedStatic(vec2 uv, float t) {
            vec2 p = uv * 20.0;
            float staticVal = hash(floor(p + t * 50.0));
            staticVal = pow(staticVal, 3.0);
            vec3 color = mix(voidBlack, staticWhite, staticVal);
            color = mix(color, decayingRed, abs(sin(t * 10.0 + uv.x * 30.0)) * 0.2);
            return color;
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

            vec3 color = voidBlack;

            // Phase dispatcher with completely new effects
            if (phaseIndex == 0) {
                color = liminalCorridor(uv, u_time);
            }
            else if (phaseIndex == 1) {
                color = eldritchTentacles(uv, u_time);
            }
            else if (phaseIndex == 2) {
                color = glitchedReality(uv, u_time);
            }
            else if (phaseIndex == 3) {
                color = bioLuminescentSwamp(uv, u_time);
            }
            else if (phaseIndex == 4) {
                color = crystallineVoid(uv, u_time);
            }
            else if (phaseIndex == 5) {
                color = parasiticGrowth(uv, u_time);
            }
            else if (phaseIndex == 6) {
                color = spectralEchoes(uv, u_time);
            }
            else if (phaseIndex == 7) {
                color = voidGate(uv, u_time);
            }
            else if (phaseIndex == 8) {
                color = alienGlyphs(uv, u_time);
            }
            else if (phaseIndex == 9) {
                color = pulsatingAbyss(uv, u_time);
            }
            else if (phaseIndex == 10) {
                color = shiftingDimensions(uv, u_time);
            }
            else if (phaseIndex == 11) {
                color = corruptedStatic(uv, u_time);
            }
            else if (phaseIndex >= 12) {
                // Additional creative variations (mix and match for more uniqueness)
                float selector = mod(float(phaseIndex - 12), 3.0);
                if (selector < 1.0) {
                    color = mix(liminalCorridor(uv, u_time), glitchedReality(uv * 0.8, u_time), 0.6);
                } else if (selector < 2.0) {
                    color = mix(eldritchTentacles(uv, u_time), bioLuminescentSwamp(uv, u_time), sin(u_time) * 0.5 + 0.5);
                } else {
                    color = mix(crystallineVoid(uv, u_time), parasiticGrowth(uv * 1.2, u_time), 0.7);
                }
            }

            // Mouse interaction
            vec2 mouse_pos = u_mouse * 2.0 - 1.0;
            mouse_pos.y *= -1.0; // Correct mouse Y
            float mouse_dist = length(uv - mouse_pos);
            float mouse_effect = exp(-mouse_dist * 3.0) * u_intensity * 0.5;
            color += eerieYellow * mouse_effect;

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
            const shaderType = type === gl.VERTEX_SHADER ? \'Vertex\' : \'Fragment\';
            const infoLog = gl.getShaderInfoLog(shader);
            const sourceWithLines = source.split(\'\\n\').map((line, index) => `${index + 1}: ${line}`).join(\'\\n\');
            console.error(`>>> SHADER COMPILE ERROR (${shaderType}):\\n${infoLog}`);
            console.error(`--- Shader Source (${shaderType}) ---\\n${sourceWithLines}\\n---`);
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
            console.error(\'>>> PROGRAM LINK ERROR:\', infoLog);
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
    window.addEventListener(\'mousemove\', (e) => {
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
