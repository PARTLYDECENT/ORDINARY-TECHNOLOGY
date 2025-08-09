// =================================================================================================
// [SYSTEM BOOTSTRAP] :: IMMEDIATE-INVOKED FUNCTION EXPRESSION (IIFE)
// Backrooms Alien World WebGL rendering system with otherworldly horror effects
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
            console.log("[INFO] Interdimensional portal (WebGL2) initialized successfully.");
        } else {
            console.log("[WARN] Backrooms breach (WebGL1) detected. Some eldritch features may be limited.");
        }
    } catch (e) {
        console.error("[FATAL] Dimensional rift error:", e);
        if (document.body) document.body.style.backgroundColor = '#050511';
        return;
    }

    // =================================================================================================
    // [SHADER SOURCE CODE] :: GLSL 3.00 ES - BACKROOMS ALIEN WORLD EFFECTS
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
            for(int i = 0; i < 6; i++) {
                v += a * noise(p);
                p *= 2.0; a *= 0.5;
            }
            return v;
        }
        
        mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, s, -s, c); }

        // =========================================================================================
        // [ALIEN BACKROOMS COLOR PALETTE]
        // =========================================================================================
        vec3 alienYellow = vec3(0.9, 0.9, 0.3);
        vec3 sickGreen = vec3(0.4, 0.7, 0.2);
        vec3 voidBlack = vec3(0.02, 0.02, 0.02);
        vec3 entityRed = vec3(0.8, 0.1, 0.1);
        vec3 fluorescent = vec3(0.95, 0.95, 0.7);
        vec3 moldGreen = vec3(0.2, 0.4, 0.1);
        vec3 dampWall = vec3(0.6, 0.55, 0.4);
        vec3 bloodStain = vec3(0.4, 0.1, 0.05);
        vec3 alienSlime = vec3(0.1, 0.8, 0.4);
        vec3 dimensionRift = vec3(0.7, 0.1, 0.9);

        // =========================================================================================
        // [BACKROOMS ALIEN WORLD EFFECTS]
        // =========================================================================================

        vec3 endlessOffice(vec2 uv, float t) {
            vec2 grid = floor(uv * 8.0);
            vec2 cellUV = fract(uv * 8.0);
            
            // Fluorescent lighting flicker
            float flicker = sin(t * 15.0 + grid.x + grid.y) * 0.1 + 0.9;
            
            // Wall pattern with water damage
            float wall = smoothstep(0.05, 0.1, min(cellUV.x, 1.0 - cellUV.x)) * 
                        smoothstep(0.05, 0.1, min(cellUV.y, 1.0 - cellUV.y));
            float damage = fbm(grid * 0.3 + t * 0.1) > 0.6 ? 1.0 : 0.0;
            
            vec3 wallColor = mix(dampWall, moldGreen, damage * 0.7);
            vec3 lightColor = fluorescent * flicker;
            
            return mix(voidBlack, wallColor, wall) + lightColor * (1.0 - wall) * 0.3;
        }

        vec3 alienInfestation(vec2 uv, float t) {
            vec2 p = uv * 6.0;
            float slime = 0.0;
            
            for(int i = 0; i < 5; i++) {
                vec2 center = vec2(hash(vec2(float(i))), hash(vec2(float(i) + 50.0))) * 4.0 - 2.0;
                center += vec2(sin(t * 0.5 + float(i)), cos(t * 0.7 + float(i))) * 0.5;
                
                float blob = exp(-length(p - center) * 2.0);
                float pulse = sin(t * 3.0 + float(i)) * 0.5 + 0.5;
                slime += blob * pulse;
            }
            
            float veins = sin(p.x * 8.0 + t) * sin(p.y * 6.0 + t * 0.8) * 0.5 + 0.5;
            veins *= exp(-length(uv) * 0.8);
            
            return mix(voidBlack, alienSlime, slime) + entityRed * veins * 0.5;
        }

        vec3 dimensionalCorridor(vec2 uv, float t) {
            float perspective = 1.0 / (abs(uv.y) + 0.1);
            vec2 corridor = vec2(uv.x * perspective, t * 0.5 + perspective * 0.1);
            
            // Ceiling tiles
            vec2 tile = fract(corridor * vec2(4.0, 20.0));
            float tilePattern = step(0.95, tile.x) + step(0.95, tile.y);
            
            // Wall decay
            float decay = fbm(corridor * 2.0) * smoothstep(0.0, 0.8, abs(uv.x));
            
            // Distant entity presence
            float entity = sin(t * 4.0 + corridor.y * 10.0) * 0.5 + 0.5;
            entity *= exp(-corridor.y * 0.5) * smoothstep(0.8, 1.0, abs(uv.x));
            
            vec3 base = mix(dampWall, moldGreen, decay);
            return base * (1.0 - tilePattern * 0.3) + entityRed * entity * 0.7;
        }

        vec3 liminalPool(vec2 uv, float t) {
            vec2 p = uv * 3.0;
            
            // Water ripples
            float ripple1 = sin(length(p) * 6.0 - t * 4.0) * 0.5 + 0.5;
            float ripple2 = sin(length(p + vec2(1.0)) * 8.0 - t * 3.0) * 0.3 + 0.7;
            
            // Submerged entities
            float entityGlow = 0.0;
            for(int i = 0; i < 3; i++) {
                vec2 pos = vec2(sin(t * 0.3 + float(i)), cos(t * 0.4 + float(i))) * 1.5;
                entityGlow += exp(-length(p - pos) * 1.5) * (sin(t * 5.0 + float(i)) * 0.5 + 0.5);
            }
            
            float depth = smoothstep(0.5, 2.0, length(uv));
            vec3 water = mix(alienSlime, voidBlack, depth) * ripple1 * ripple2;
            
            return water + entityRed * entityGlow * 0.8;
        }

        vec3 entityStalking(vec2 uv, float t) {
            float distance = length(uv);
            float angle = atan(uv.y, uv.x);
            
            // Entity silhouette
            float entityShape = 0.0;
            float entityDist = 1.5 + sin(t * 0.8) * 0.3;
            if(distance > entityDist - 0.1 && distance < entityDist + 0.1) {
                float bodyNoise = fbm(vec2(angle * 3.0, t * 2.0)) * 0.3;
                entityShape = smoothstep(0.05, 0.0, abs(distance - entityDist - bodyNoise));
            }
            
            // Breathing/movement
            float breathe = sin(t * 6.0) * 0.02;
            entityShape *= (1.0 + breathe);
            
            // Entity eyes
            vec2 eyePos1 = vec2(0.3, 0.1) + vec2(sin(t), cos(t * 0.7)) * 0.05;
            vec2 eyePos2 = vec2(-0.3, 0.1) + vec2(sin(t), cos(t * 0.7)) * 0.05;
            float eyes = exp(-length(uv - eyePos1) * 20.0) + exp(-length(uv - eyePos2) * 20.0);
            
            vec3 base = mix(voidBlack, dampWall, fbm(uv * 2.0 + t * 0.1) * 0.3);
            return base + entityRed * (entityShape * 2.0 + eyes * 3.0);
        }

        vec3 glitchedReality(vec2 uv, float t) {
            vec2 originalUV = uv;
            
            // Digital corruption
            float corruption = sin(t * 20.0 + uv.y * 100.0) * 0.01;
            uv.x += corruption * (sin(t * 13.0) * 0.5 + 0.5);
            
            // Pixelation effect
            vec2 pixelUV = floor(uv * 32.0) / 32.0;
            float pixelNoise = hash(pixelUV + floor(t * 4.0));
            
            // Reality tears
            float tear = abs(sin(originalUV.x * 5.0 + t * 2.0) + sin(originalUV.y * 7.0 + t * 1.5));
            tear = smoothstep(0.1, 0.0, tear - 1.8);
            
            vec3 glitched = mix(dampWall, alienYellow, pixelNoise) * (1.0 - tear);
            vec3 void_color = dimensionRift * tear * 2.0;
            
            return glitched + void_color;
        }

        vec3 moldInfestation(vec2 uv, float t) {
            vec2 p = uv * 8.0;
            
            // Mold growth pattern
            float mold = fbm(p + t * 0.05);
            mold = smoothstep(0.3, 0.8, mold);
            
            // Spore clouds
            float spores = 0.0;
            for(int i = 0; i < 4; i++) {
                vec2 sporeCenter = vec2(sin(t * 0.2 + float(i)), cos(t * 0.3 + float(i))) * 2.0;
                spores += exp(-length(p - sporeCenter) * 0.5) * sin(t * 4.0 + float(i));
            }
            spores = clamp(spores, 0.0, 1.0);
            
            // Wall base
            vec3 wall = mix(dampWall, bloodStain, fbm(p * 0.5));
            vec3 moldColor = mix(moldGreen, sickGreen, sin(t + mold * 5.0) * 0.5 + 0.5);
            
            return mix(wall, moldColor, mold) + alienYellow * spores * 0.3;
        }

        vec3 backroomsMaze(vec2 uv, float t) {
            vec2 maze = floor(uv * 6.0);
            vec2 cell = fract(uv * 6.0);
            
            // Maze generation
            float wallX = hash(maze) > 0.4 ? 1.0 : 0.0;
            float wallY = hash(maze + vec2(100.0)) > 0.4 ? 1.0 : 0.0;
            
            float wall = 0.0;
            if(cell.x < 0.1 || cell.x > 0.9) wall = wallX;
            if(cell.y < 0.1 || cell.y > 0.9) wall = wallY;
            
            // Lighting from above
            float lighting = smoothstep(0.2, 0.8, cell.y) * fluorescent.r;
            lighting *= sin(t * 8.0 + maze.x + maze.y) * 0.1 + 0.9; // Flicker
            
            // Mysterious shadows
            float shadow = fbm(maze * 0.2 + t * 0.05);
            
            vec3 wallColor = mix(dampWall, voidBlack, shadow);
            return mix(voidBlack * lighting, wallColor, wall);
        }

        vec3 alienPortal(vec2 uv, float t) {
            float radius = length(uv);
            float angle = atan(uv.y, uv.x);
            
            // Portal ring
            float portal = smoothstep(0.02, 0.0, abs(radius - 0.8));
            portal += smoothstep(0.01, 0.0, abs(radius - 0.6)) * 0.5;
            
            // Portal interior swirl
            angle += radius * 5.0 - t * 3.0;
            float swirl = sin(angle * 4.0 + radius * 10.0) * 0.5 + 0.5;
            float interior = smoothstep(0.6, 0.0, radius) * swirl;
            
            // Otherworldly energy
            float energy = sin(t * 10.0 + radius * 20.0) * 0.5 + 0.5;
            energy *= exp(-radius * 2.0);
            
            vec3 base = mix(voidBlack, dampWall, fbm(uv * 3.0));
            vec3 portalColor = dimensionRift * portal * 3.0;
            vec3 interiorColor = mix(alienSlime, dimensionRift, interior) * interior;
            
            return base + portalColor + interiorColor + alienYellow * energy * 0.5;
        }

        vec3 entitySwarm(vec2 uv, float t) {
            vec2 p = uv * 4.0;
            float swarm = 0.0;
            
            // Multiple entities moving in patterns
            for(int i = 0; i < 8; i++) {
                float fi = float(i);
                vec2 motion = vec2(
                    sin(t * 0.8 + fi) * 2.0,
                    cos(t * 0.6 + fi * 0.7) * 2.0
                );
                
                float entity = exp(-length(p - motion) * 4.0);
                float pulse = sin(t * 8.0 + fi) * 0.5 + 0.5;
                swarm += entity * pulse;
            }
            
            // Swarm communication/energy
            float communication = sin(swarm * 10.0 + t * 5.0);
            
            vec3 background = mix(voidBlack, moldGreen, fbm(uv * 2.0 + t * 0.1) * 0.2);
            return background + entityRed * swarm * 1.5 + alienSlime * communication * 0.3;
        }

        vec3 liminalStairwell(vec2 uv, float t) {
            // Infinite staircase perspective
            float y = uv.y + t * 0.3;
            float stair = mod(y * 8.0, 1.0);
            stair = step(0.7, stair);
            
            // Side walls
            float wall = smoothstep(0.0, 0.1, abs(uv.x) - 0.6);
            
            // Handrail
            float rail = smoothstep(0.02, 0.0, abs(abs(uv.x) - 0.65));
            
            // Lighting from top
            float light = exp(-y * 0.5) * fluorescent.r;
            light *= sin(t * 6.0 + y * 5.0) * 0.1 + 0.9;
            
            // Entity presence in darkness
            float entityPresence = smoothstep(1.0, 2.0, y) * 
                                 sin(t * 4.0 + uv.x * 10.0) * 0.5 + 0.5;
            
            vec3 base = mix(dampWall, moldGreen, wall * 0.3);
            base *= light + 0.1;
            base += bloodStain * rail;
            
            return base + entityRed * entityPresence * 0.8;
        }

        vec3 alienHive(vec2 uv, float t) {
            vec2 p = uv * 6.0;
            
            // Hexagonal hive pattern
            vec2 hex = vec2(p.x + p.y * 0.5, p.y * 0.866);
            vec2 hexCell = floor(hex);
            vec2 hexUV = fract(hex);
            
            // Hive cell
            float cell = length(hexUV - 0.5);
            cell = smoothstep(0.4, 0.3, cell);
            
            // Alien activity
            float activity = hash(hexCell);
            activity *= sin(t * 3.0 + hexCell.x + hexCell.y) * 0.5 + 0.5;
            
            // Secreted substances
            float secretion = fbm(p + t * 0.1) * cell;
            
            vec3 hiveColor = mix(moldGreen, alienSlime, activity);
            vec3 secretionColor = mix(sickGreen, alienYellow, secretion);
            
            return mix(voidBlack, hiveColor, cell) + secretionColor * secretion * 0.5;
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

            // Phase dispatcher with backrooms alien effects
            if (phaseIndex == 0) {
                color = endlessOffice(uv, u_time);
            }
            else if (phaseIndex == 1) {
                color = alienInfestation(uv, u_time);
            }
            else if (phaseIndex == 2) {
                color = dimensionalCorridor(uv, u_time);
            }
            else if (phaseIndex == 3) {
                color = liminalPool(uv, u_time);
            }
            else if (phaseIndex == 4) {
                color = entityStalking(uv, u_time);
            }
            else if (phaseIndex == 5) {
                color = glitchedReality(uv, u_time);
            }
            else if (phaseIndex == 6) {
                color = moldInfestation(uv, u_time);
            }
            else if (phaseIndex == 7) {
                color = backroomsMaze(uv, u_time);
            }
            else if (phaseIndex == 8) {
                color = alienPortal(uv, u_time);
            }
            else if (phaseIndex == 9) {
                color = entitySwarm(uv, u_time);
            }
            else if (phaseIndex == 10) {
                color = liminalStairwell(uv, u_time);
            }
            else if (phaseIndex == 11) {
                color = alienHive(uv, u_time);
            }
            else if (phaseIndex >= 12) {
                // Hybrid nightmare combinations
                float selector = mod(float(phaseIndex - 12), 3.0);
                if (selector < 1.0) {
                    color = mix(endlessOffice(uv, u_time), entityStalking(uv * 0.8, u_time), 0.6);
                } else if (selector < 2.0) {
                    color = mix(alienInfestation(uv, u_time), glitchedReality(uv, u_time), sin(u_time) * 0.5 + 0.5);
                } else {
                    color = mix(liminalPool(uv, u_time), alienHive(uv * 1.3, u_time), 0.7);
                }
            }

            // Mouse interaction - entity following
            vec2 mouse_pos = u_mouse * 2.0 - 1.0;
            mouse_pos.y *= -1.0;
            float mouse_dist = length(uv - mouse_pos);
            float entity_follow = exp(-mouse_dist * 2.0) * u_intensity * 0.3;
            color += entityRed * entity_follow;

            // Intensity modulation
            color *= u_intensity;

            // Eerie vignette
            float vignette = smoothstep(1.5, 0.3, length(uv));
            color *= vignette * 0.8 + 0.2;

            // CRT/Security camera effect
            float scanline = sin(originalUV.y * u_resolution.y * 2.0) * 0.03 + 0.97;
            color *= scanline;

            // Film grain for that found footage feel
            float grain = hash(originalUV + u_time) * 0.05 + 0.95;
            color *= grain;

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
        console.log("[INFO] Backrooms dimensional breach successful. Entity detection active.");
        animationFrameId = requestAnimationFrame(render);
    } else {
        console.error("[FATAL] Failed to establish interdimensional connection. Reality remains stable.");
    }

})();
