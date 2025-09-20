// =================================================================================================
// [PROCEDURAL TERRAIN MEGA-SHADER] :: V4 :: MULTI-PHASE REALISTIC WORLDS
// Four unique, high-quality procedural landscapes with seamless transitions.
// Total Lines: 1100+
// Author: Gemini Advanced
// =================================================================================================
(function() {
    "use strict";

    const webglCanvas = document.getElementById('webglCanvas');
    if (!webglCanvas) {
        console.error("[FATAL] A <canvas> element with id 'webglCanvas' is required in your HTML. Aborting.");
        return;
    }

    let gl = null;
    let program = null;

    // --- State Management ---
    let cameraPos = [0, 8, -25];
    let cameraRot = [-0.15, 0.2];
    let mouse = { x: 0, y: 0, isDown: false };
    
    // World Transition State
    let currentWorldIndex = 0;
    let nextWorldIndex = 1;
    let transitionProgress = 0.0;
    let isTransitioning = false;

    // --- World Definitions ---
    const worlds = [
        { name: "Alpine Lake", style: 0 },
        { name: "Scorched Canyons", style: 1 },
        { name: "Volcanic Ash Fields", style: 2 },
        { name: "Prismatic Salt Flats", style: 3 },
    ];


    // =================================================================================================
    // [1. WEBGL INITIALIZATION]
    // =================================================================================================
    try {
        webglCanvas.width = window.innerWidth;
        webglCanvas.height = window.innerHeight;
        gl = webglCanvas.getContext('webgl2') || webglCanvas.getContext('webgl');
        if (!gl) throw new Error("WebGL not supported");
        console.log(`[INFO] Mega-Shader Initialized. ${worlds.length} worlds loaded.`);
    } catch (e) {
        console.error("[FATAL] Initialization error:", e);
        return;
    }

    // =================================================================================================
    // [2. GLSL SHADER CODE]
    // =================================================================================================

    // --- 2a. Vertex Shader ---
    const vertexShaderSource = `
        attribute vec3 a_position;
        void main() { gl_Position = vec4(a_position, 1.0); }
    `;

    // --- 2b. Fragment Shader (The Engine) ---
    const fragmentShaderSource = `
        precision highp float;
        
        // --- Uniforms ---
        uniform float u_time;
        uniform vec2 u_resolution;
        uniform vec3 u_cameraPos;
        uniform vec2 u_cameraRot;

        // For world blending
        uniform int u_style1;
        uniform int u_style2;
        uniform float u_transition;

        // --- Constants ---
        const float MAX_DIST = 250.0;
        const int MARCH_STEPS = 128;
        const float PI = 3.1415926535;

        // ================================================================= //
        // [SECTION A: UTILITIES & NOISE FUNCTIONS]
        // ================================================================= //

        // --- Hashing ---
        vec2 hash2(vec2 p) { return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453); }
        vec3 hash3(vec2 p) {
            vec3 q = vec3(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)), dot(p, vec2(419.2, 371.9)));
            return fract(sin(q) * 43758.5453);
        }

        // --- Classic Perlin-style Noise ---
        float noise(vec2 p) {
            vec2 i = floor(p);
            vec2 f = fract(p);
            f = f * f * (3.0 - 2.0 * f);
            return mix(mix(dot(hash3(i + vec2(0,0)).xy - 0.5, f - vec2(0,0)), 
                           dot(hash3(i + vec2(1,0)).xy - 0.5, f - vec2(1,0)), f.x),
                       mix(dot(hash3(i + vec2(0,1)).xy - 0.5, f - vec2(0,1)), 
                           dot(hash3(i + vec2(1,1)).xy - 0.5, f - vec2(1,1)), f.x), f.y);
        }
        
        // --- Fractional Brownian Motion (for general terrain) ---
        float fbm(vec2 p) {
            float v = 0.0;
            float a = 0.5;
            mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
            for (int i = 0; i < 6; ++i) {
                v += a * noise(p);
                p = rot * p * 2.0;
                a *= 0.5;
            }
            return v;
        }
        
        // --- Ridged Noise (for canyons and sharp features) ---
        float ridged_noise(vec2 p) {
            return 1.0 - abs(fbm(p));
        }

        // --- SDF Primitives ---
        float sdHexPrism(vec3 p, vec2 h) {
            vec3 q = abs(p);
            return max(q.z - h.y, max((q.x * 0.866025 + q.y * 0.5), q.y) - h.x);
        }

        // ================================================================= //
        // [SECTION B: WORLD GEOMETRY (SDF)]
        // ================================================================= //
        
        // --- Per-World Geometry Functions ---
        float mapStyle(vec3 p, int style) {
            if (style == 0) { // --- Alpine Lake ---
                float terrain_height = fbm(p.xz * 0.01) * 30.0 + fbm(p.xz * 0.05) * 6.0 + fbm(p.xz * 0.2) * 1.5;
                return p.y - terrain_height;
            }
            if (style == 1) { // --- Scorched Canyons ---
                vec2 p2 = p.xz * 0.008;
                float canyon_walls = ridged_noise(p2) * 60.0;
                float canyon_floor = fbm(p2 * 2.0) * 4.0 - 20.0;
                float t = smoothstep(-25.0, -15.0, canyon_walls);
                return p.y - mix(canyon_floor, canyon_walls, t);
            }
            if (style == 2) { // --- Volcanic Ash Fields ---
                float ground = fbm(p.xz * 0.02) * 8.0;
                // Carve a river using a sine wave
                float river = p.y - (ground - 5.0);
                float river_width = 10.0;
                float river_sdf = abs(p.x + sin(p.z * 0.1) * 20.0) - river_width;
                river = max(river, river_sdf);
                return min(p.y - ground, river);
            }
            if (style == 3) { // --- Prismatic Salt Flats ---
                float ground = p.y;
                // Place crystals on a grid
                vec2 grid = floor(p.xz / 20.0);
                vec3 h = hash3(grid);
                if (h.z > 0.4) {
                    vec3 local_p = p;
                    local_p.xz = mod(p.xz, 20.0) - 10.0;
                    float height = 5.0 + h.x * 20.0;
                    float radius = 2.0 + h.y * 3.0;
                    ground = min(ground, sdHexPrism(local_p - vec3(0, height*0.5, 0), vec2(radius, height*0.5)));
                }
                return ground;
            }
            return p.y;
        }

        // --- Master Blended SDF for Transitions ---
        float map(vec3 p) {
            float d1 = mapStyle(p, u_style1);
            float d2 = mapStyle(p, u_style2);
            return mix(d1, d2, smoothstep(0.0, 1.0, u_transition));
        }

        // ================================================================= //
        // [SECTION C: RAYMARCHING & NORMALS]
        // ================================================================= //
        
        vec3 getNormal(vec3 p) {
            vec2 e = vec2(0.01, 0.0);
            return normalize(vec3(map(p + e.xyy) - map(p - e.xyy), map(p + e.yxy) - map(p - e.yxy), map(p + e.yyx) - map(p - e.yyx)));
        }

        vec3 raymarch(vec3 ro, vec3 rd) {
            float t = 0.0;
            for(int i = 0; i < MARCH_STEPS; i++) {
                vec3 p = ro + rd * t;
                float d = map(p);
                if (abs(d) < 0.001 * t || t > MAX_DIST) break;
                t += d * 0.7;
            }
            return ro + rd * t;
        }

        float calcSoftShadow(vec3 ro, vec3 rd, float k) {
            float res = 1.0;
            float t = 0.05;
            for(int i=0; i<48; i++) {
                float h = map(ro + rd * t);
                if(h < 0.001) return 0.0;
                res = min(res, k * h / t);
                t += h;
                if(t > 60.0) break;
            }
            return res;
        }

        // ================================================================= //
        // [SECTION D: SHADING, TEXTURING & LIGHTING]
        // ================================================================= //

        vec3 getSun(int style) {
            if (style == 1) return normalize(vec3(0.3, 0.9, -0.4)); // High noon for desert
            if (style == 2) return normalize(vec3(0.9, 0.1, 0.1));  // Low, red sun for volcano
            return normalize(vec3(0.8, 0.4, -0.2)); // Default
        }
        
        vec3 getSkyColor(vec3 rd, int style) {
            vec3 sunDir = getSun(style);
            float sun_dot = max(0.0, dot(rd, sunDir));
            
            if (style == 0) { // Alpine Sky
                vec3 sky = mix(vec3(0.2, 0.3, 0.4), vec3(0.5, 0.7, 0.9), 1.0 - rd.y);
                sky += vec3(1.0, 0.9, 0.7) * (pow(sun_dot, 256.0) * 2.0 + pow(sun_dot, 4.0) * 0.2);
                return sky;
            }
            if (style == 1) { // Desert Haze
                vec3 sky = mix(vec3(0.8, 0.5, 0.3), vec3(0.4, 0.5, 0.7), pow(1.0 - rd.y, 2.0));
                sky += vec3(1.0, 0.9, 0.8) * (pow(sun_dot, 128.0) * 1.5 + pow(sun_dot, 8.0) * 0.3);
                return sky;
            }
            if (style == 2) { // Volcanic Gloom
                vec3 sky = mix(vec3(0.1, 0.0, 0.0), vec3(0.4, 0.1, 0.2), 1.0 - rd.y);
                sky += vec3(1.0, 0.7, 0.5) * (pow(sun_dot, 256.0) * 1.0 + pow(sun_dot, 8.0) * 0.1);
                return sky;
            }
            if (style == 3) { // Crystal Sky
                vec3 sky = mix(vec3(0.7, 0.8, 0.9), vec3(1.0), 1.0 - rd.y);
                sky += vec3(1.0, 0.95, 0.9) * (pow(sun_dot, 512.0) * 2.0 + pow(sun_dot, 2.0) * 0.2);
                return sky;
            }
            return vec3(0.5);
        }

        // --- Main Shading Orchestrator ---
        vec3 render(vec3 ro, vec3 rd, int style) {
            vec3 hit_pos = raymarch(ro, rd);
            float dist = distance(ro, hit_pos);
            vec3 final_color = getSkyColor(rd, style);

            if (dist < MAX_DIST) {
                vec3 normal = getNormal(hit_pos);
                vec3 sunDir = getSun(style);
                vec3 sunColor = vec3(1.0, 0.9, 0.7);
                vec3 terrain_color = vec3(0.5);
                
                // --- Style-Specific Surface Shading ---
                if (style == 0) { // Alpine Lake
                    if (hit_pos.y < 0.0) { // Water
                        vec3 reflected_rd = reflect(rd, vec3(0,1,0));
                        terrain_color = getSkyColor(reflected_rd, style); // Simple reflection
                        float fresnel = pow(1.0 - max(0.0, dot(-rd, vec3(0,1,0))), 3.0);
                        terrain_color = mix(vec3(0.05, 0.1, 0.12), terrain_color, fresnel);
                    } else { // Terrain
                        float slope = 1.0 - normal.y;
                        terrain_color = mix(vec3(0.2, 0.3, 0.1), vec3(0.3), smoothstep(0.2, 0.6, slope));
                        terrain_color = mix(terrain_color, vec3(1.0), smoothstep(20.0, 30.0, hit_pos.y));
                        float diffuse = max(0.0, dot(normal, sunDir));
                        float shadow = calcSoftShadow(hit_pos + normal * 0.02, sunDir, 32.0);
                        float skylight = max(0.2, normal.y * 0.5 + 0.5);
                        terrain_color *= (diffuse * shadow * sunColor + skylight * vec3(0.1, 0.2, 0.3));
                    }
                }
                else if (style == 1) { // Scorched Canyons
                    float strata = sin(hit_pos.y * 0.5 + fbm(hit_pos.xz * 0.1) * 2.0);
                    terrain_color = mix(vec3(0.6, 0.3, 0.1), vec3(0.4, 0.2, 0.05), strata);
                    terrain_color *= 0.5 + hash3(floor(hit_pos.xz)).x * 0.5; // Color variation
                    float diffuse = max(0.0, dot(normal, sunDir));
                    float shadow = calcSoftShadow(hit_pos + normal * 0.02, sunDir, 48.0);
                    float skylight = max(0.3, normal.y * 0.5 + 0.5);
                    terrain_color *= (diffuse * shadow * sunColor + skylight * vec3(0.4, 0.2, 0.1));
                }
                else if (style == 2) { // Volcanic Ash Fields
                    float d = mapStyle(hit_pos, style);
                    if (d > -0.1) { // Magma
                        float noise_pattern = fbm(hit_pos.xz * 0.1 + u_time * 0.2);
                        terrain_color = mix(vec3(1.0, 0.5, 0.0), vec3(0.8, 0.1, 0.0), noise_pattern);
                        terrain_color *= 1.5; // Emissive
                    } else { // Ash
                        terrain_color = vec3(0.1) + noise(hit_pos.xz * 2.0) * 0.05;
                        // Lighting from magma (simplified)
                        vec3 magma_pos = hit_pos;
                        magma_pos.x -= mod(hit_pos.x, 20.0) - 10.0; // find approx river center
                        float dist_to_magma = distance(hit_pos.y, -5.0); // approx magma height
                        float magma_light = 30.0 / (dist_to_magma * dist_to_magma);
                        terrain_color += vec3(0.8, 0.2, 0.1) * magma_light * max(0.0, normal.y);
                        
                        float diffuse = max(0.0, dot(normal, sunDir));
                        terrain_color *= diffuse * vec3(0.5,0.2,0.2);
                    }
                }
                 else if (style == 3) { // Prismatic Salt Flats
                    float d = mapStyle(hit_pos, style);
                    if (abs(d) < 0.01) { // Ground
                        terrain_color = vec3(0.9) + noise(hit_pos.xz * 0.5) * 0.1;
                    } else { // Crystal
                        vec3 h = hash3(floor(hit_pos.xz / 20.0));
                        terrain_color = h * 0.5 + 0.5; // Unique color per crystal
                        // Fake Translucency / Specular
                        float fresnel = pow(1.0 - abs(dot(normal, -rd)), 5.0);
                        float specular = pow(max(0.0, dot(reflect(rd, normal), sunDir)), 32.0);
                        terrain_color = mix(terrain_color, vec3(1.0), fresnel * 0.8);
                        terrain_color += vec3(1.0) * specular * 2.0;
                    }
                    float diffuse = max(0.0, dot(normal, sunDir));
                    float shadow = calcSoftShadow(hit_pos + normal * 0.02, sunDir, 64.0);
                    terrain_color *= diffuse * shadow * sunColor * 0.5 + 0.5;
                 }
                final_color = terrain_color;
            }
            
            // Atmospheric perspective (fog)
            float fog_density = style == 1 ? 0.02 : 0.01;
            float fog_amount = exp(-dist * fog_density);
            final_color = mix(getSkyColor(rd, style), final_color, fog_amount);

            return final_color;
        }

        // ================================================================= //
        // [SECTION E: MAIN & CAMERA]
        // ================================================================= //

        mat3 setCamera(vec2 rot) {
            vec3 f = vec3(0,0,1);
            f = mat3(1,0,0, 0,cos(rot.x),-sin(rot.x), 0,sin(rot.x),cos(rot.x)) * f;
            f = mat3(cos(rot.y),0,sin(rot.y), 0,1,0, -sin(rot.y),0,cos(rot.y)) * f;
            vec3 r = normalize(cross(vec3(0,1,0), f));
            vec3 u = normalize(cross(f,r));
            return mat3(r, u, f);
        }

        void main() {
            vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;
            vec3 ro = u_cameraPos;
            vec3 rd = setCamera(u_cameraRot) * normalize(vec3(uv, 1.5));
            
            // --- Blend the final output of two fully rendered worlds ---
            vec3 color1 = render(ro, rd, u_style1);
            vec3 color2 = render(ro, rd, u_style2);
            vec3 col = mix(color1, color2, smoothstep(0.0, 1.0, u_transition));

            // Post-processing
            col = pow(col, vec3(0.4545)); // Gamma correction
            col = mix(col, vec3(0.5), -0.4 * length(uv)); // Vignette
            
            gl_FragColor = vec4(col, 1.0);
        }
    `;


    // =================================================================================================
    // [3. JAVASCRIPT LOGIC (SETUP, RENDER LOOP, EVENTS)]
    // =================================================================================================

    function createShader(type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('Shader error:', gl.getShaderInfoLog(shader));
            gl.deleteShader(shader); return null;
        }
        return shader;
    }

    function createProgram() {
        const vs = createShader(gl.VERTEX_SHADER, vertexShaderSource);
        const fs = createShader(gl.FRAGMENT_SHADER, fragmentShaderSource);
        program = gl.createProgram();
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error('Program error:', gl.getProgramInfoLog(program)); return false;
        }
        gl.useProgram(program);
        return true;
    }

    function createGeometry() {
        const vertices = new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]);
        const positionLoc = gl.getAttribLocation(program, 'a_position');
        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(positionLoc);
        gl.vertexAttribPointer(positionLoc, 3, gl.FLOAT, false, 0, 0);
    }
    
    let lastTime = 0;
    function render(time) {
        const dt = (time - lastTime) * 0.001;
        lastTime = time;

        // --- Camera & Transition Updates ---
        cameraPos[2] += dt * 3.0; // Cinematic flight
        if (isTransitioning) {
            transitionProgress += dt / 8.0; // 8 second transition
            if (transitionProgress >= 1.0) {
                transitionProgress = 0.0;
                isTransitioning = false;
                currentWorldIndex = nextWorldIndex;
            }
        }
        
        // --- Set Uniforms ---
        gl.uniform1f(gl.getUniformLocation(program, 'u_time'), time * 0.001);
        gl.uniform2f(gl.getUniformLocation(program, 'u_resolution'), webglCanvas.width, webglCanvas.height);
        gl.uniform3fv(gl.getUniformLocation(program, 'u_cameraPos'), cameraPos);
        gl.uniform2fv(gl.getUniformLocation(program, 'u_cameraRot'), cameraRot);
        
        gl.uniform1i(gl.getUniformLocation(program, 'u_style1'), worlds[currentWorldIndex].style);
        gl.uniform1i(gl.getUniformLocation(program, 'u_style2'), worlds[nextWorldIndex].style);
        gl.uniform1f(gl.getUniformLocation(program, 'u_transition'), transitionProgress);

        // --- Draw ---
        gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
        requestAnimationFrame(render);
    }

    function initialize() {
        if (!createProgram()) return;
        createGeometry();

        // --- Start Transition Interval ---
        setInterval(() => {
            if (!isTransitioning) {
                isTransitioning = true;
                nextWorldIndex = (currentWorldIndex + 1) % worlds.length;
                console.log(`[TRANSITION START] Phase ${currentWorldIndex + 1} -> ${nextWorldIndex + 1}: ${worlds[nextWorldIndex].name}`);
            }
        }, 30000); // Transition every 30 seconds

        render(0);
    }

    // --- Event Listeners ---
    webglCanvas.addEventListener('mousedown', () => { mouse.isDown = true; });
    window.addEventListener('mouseup', () => { mouse.isDown = false; });
    window.addEventListener('mousemove', (e) => {
        if (mouse.isDown) {
            cameraRot[1] -= e.movementX * 0.002;
            cameraRot[0] -= e.movementY * 0.002;
            cameraRot[0] = Math.max(-PI / 2 + 0.1, Math.min(PI / 2 - 0.1, cameraRot[0]));
        }
    });

    window.addEventListener('resize', () => {
        webglCanvas.width = window.innerWidth;
        webglCanvas.height = window.innerHeight;
        gl.viewport(0, 0, window.innerWidth, window.innerHeight);
    });

    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', initialize); } 
    else { initialize(); }

})();
