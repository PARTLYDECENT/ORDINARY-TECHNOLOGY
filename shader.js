// =================================================================================================
// [PHOTOREALISTIC LANDSCAPE SHADER] :: SHADERTOY-INSPIRED PROCEDURAL WORLD
// Renders a single, high-quality alpine landscape with advanced lighting and reflections.
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

    // Camera & Interaction State
    let cameraPos = [0, 8, -25];
    let cameraRot = [-0.15, 0.2]; // [PITCH, YAW]
    let mouse = { x: 0, y: 0, isDown: false };

    // =================================================================================================
    // [WEBGL INITIALIZATION]
    // =================================================================================================
    try {
        webglCanvas.width = window.innerWidth;
        webglCanvas.height = window.innerHeight;
        gl = webglCanvas.getContext('webgl2') || webglCanvas.getContext('webgl');
        if (!gl) throw new Error("WebGL not supported");
        console.log("[INFO] Photorealistic Shader initialized.");
    } catch (e) {
        console.error("[FATAL] Initialization error:", e);
        return;
    }

    // =================================================================================================
    // [VERTEX SHADER]
    // =================================================================================================
    const vertexShaderSource = `
        attribute vec3 a_position;
        void main() {
            gl_Position = vec4(a_position, 1.0);
        }
    `;

    // =================================================================================================
    // [FRAGMENT SHADER - The Core Engine]
    // =================================================================================================
    const fragmentShaderSource = `
        precision highp float;
        
        uniform float u_time;
        uniform vec2 u_resolution;
        uniform vec3 u_cameraPos;
        uniform vec2 u_cameraRot;

        // --- Constants ---
        const vec3 SUN_DIR = normalize(vec3(0.8, 0.4, -0.2));
        const vec3 SUN_COLOR = vec3(1.0, 0.9, 0.7);
        const float MAX_DIST = 200.0;
        const float WATER_LEVEL = 0.0;
        const int MARCH_STEPS = 128;

        // --- Noise Functions ---
        vec3 hash3(vec2 p) {
            vec3 q = vec3(dot(p, vec2(127.1, 311.7)),
                          dot(p, vec2(269.5, 183.3)),
                          dot(p, vec2(419.2, 371.9)));
            return fract(sin(q) * 43758.5453);
        }

        float noise(vec2 p) {
            vec2 i = floor(p);
            vec2 f = fract(p);
            f = f * f * (3.0 - 2.0 * f);
            
            vec3 h = hash3(i) - 0.5;
            float n = dot(h.xy, f);
            
            return n * 0.6;
        }

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

        // --- World Generation (SDF) ---
        float terrainSDF(vec2 p) {
            // Layered noise for realistic terrain
            float large_features = fbm(p * 0.01) * 30.0;
            float medium_details = fbm(p * 0.05) * 6.0;
            float fine_rocks = fbm(p * 0.2) * 1.5;
            return large_features + medium_details + fine_rocks;
        }

        float map(vec3 p) {
            float terrain_height = terrainSDF(p.xz);
            return p.y - terrain_height;
        }

        // --- Raymarching & Lighting ---
        vec3 getNormal(vec3 p) {
            vec2 e = vec2(0.01, 0.0);
            float d = map(p);
            return normalize(vec3(
                d - map(p - e.xyy),
                d - map(p - e.yxy),
                d - map(p - e.yyx)
            ));
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

        vec3 raymarch(vec3 ro, vec3 rd) {
            float t = 0.0;
            for(int i = 0; i < MARCH_STEPS; i++) {
                vec3 p = ro + rd * t;
                float d = map(p);
                if (d < 0.001 * t || t > MAX_DIST) break;
                t += d * 0.6;
            }
            return ro + rd * t;
        }

        // --- Sky & Atmosphere ---
        vec3 getSkyColor(vec3 rd) {
            float sun_dot = max(0.0, dot(rd, SUN_DIR));
            vec3 sky = mix(vec3(0.2, 0.3, 0.4), vec3(0.5, 0.7, 0.9), 1.0 - rd.y);
            sky += SUN_COLOR * pow(sun_dot, 256.0) * 2.0; // Sun disk
            sky += SUN_COLOR * pow(sun_dot, 4.0) * 0.2; // Sun glow
            return sky;
        }

        // --- Main Shading Function ---
        vec3 render(vec3 ro, vec3 rd) {
            vec3 final_color = getSkyColor(rd);
            vec3 hit_pos = raymarch(ro, rd);
            float dist = distance(ro, hit_pos);

            if (dist < MAX_DIST) {
                // Check if we hit water plane or terrain
                if (hit_pos.y < WATER_LEVEL) { // --- Water Shading ---
                    vec3 normal = vec3(0.0, 1.0, 0.0);
                    vec3 reflected_rd = reflect(rd, normal);
                    
                    // Raymarch again for reflections
                    vec3 reflected_color = getSkyColor(reflected_rd);
                    vec3 reflected_hit = raymarch(hit_pos + normal * 0.01, reflected_rd);
                    if(distance(hit_pos, reflected_hit) < MAX_DIST) {
                         vec3 n_refl = getNormal(reflected_hit);
                         float diffuse_refl = max(0.0, dot(n_refl, SUN_DIR));
                         reflected_color = mix(vec3(0.2, 0.3, 0.2), vec3(1.0), smoothstep(0.4, 0.7, n_refl.y));
                         reflected_color = reflected_color * diffuse_refl * SUN_COLOR;
                    }

                    // Fresnel for mixing reflection and water color
                    float fresnel = pow(1.0 - max(0.0, dot(-rd, normal)), 3.0);
                    vec3 water_color = vec3(0.05, 0.1, 0.12);
                    final_color = mix(water_color, reflected_color, fresnel);

                } else { // --- Terrain Shading ---
                    vec3 normal = getNormal(hit_pos);
                    
                    // Texture based on height and slope
                    float slope = 1.0 - normal.y;
                    vec3 rock_color = vec3(0.3) + noise(hit_pos.xz * 2.0) * 0.1;
                    vec3 grass_color = vec3(0.2, 0.3, 0.1) + noise(hit_pos.xz * 5.0) * 0.05;
                    vec3 terrain_color = mix(grass_color, rock_color, smoothstep(0.2, 0.6, slope));
                    
                    // Add snow at high altitudes
                    float snow_amount = smoothstep(20.0, 30.0, hit_pos.y);
                    terrain_color = mix(terrain_color, vec3(1.0), snow_amount);
                    
                    // Lighting
                    float diffuse = max(0.0, dot(normal, SUN_DIR));
                    float shadow = calcSoftShadow(hit_pos + normal * 0.02, SUN_DIR, 32.0);
                    float skylight = max(0.2, normal.y * 0.5 + 0.5); // Ambient from sky
                    
                    vec3 lighting = diffuse * shadow * SUN_COLOR;
                    lighting += skylight * vec3(0.1, 0.2, 0.3); // Add sky color to ambient
                    
                    final_color = terrain_color * lighting;
                }
            }
            
            // Atmospheric perspective (fog)
            float fog_amount = exp(-dist * 0.01);
            final_color = mix(getSkyColor(rd), final_color, fog_amount);

            return final_color;
        }

        // --- Main Render Function ---
        mat3 setCamera(vec3 ro, vec2 rot) {
            vec3 f = vec3(0,0,1); // Forward
            f = mat3(1,0,0, 0,cos(rot.x),-sin(rot.x), 0,sin(rot.x),cos(rot.x)) * f;
            f = mat3(cos(rot.y),0,sin(rot.y), 0,1,0, -sin(rot.y),0,cos(rot.y)) * f;
            vec3 r = normalize(cross(vec3(0,1,0), f)); // Right
            vec3 u = normalize(cross(f,r)); // Up
            return mat3(r, u, f);
        }

        void main() {
            vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;
            vec3 ro = u_cameraPos;
            vec3 rd = setCamera(ro, u_cameraRot) * normalize(vec3(uv, 1.5));
            
            vec3 col = render(ro, rd);

            // Post-processing
            col = pow(col, vec3(0.4545)); // Gamma correction
            col = mix(col, vec3(0.5), -0.4 * length(uv)); // Vignette
            
            gl_FragColor = vec4(col, 1.0);
        }
    `;

    // =================================================================================================
    // [SHADER COMPILATION & SETUP]
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
    
    // =================================================================================================
    // [RENDER LOOP & EVENT LISTENERS]
    // =================================================================================================
    let lastTime = 0;
    function render(time) {
        const dt = (time - lastTime) * 0.001;
        lastTime = time;

        // Slow, cinematic camera flight
        cameraPos[2] += dt * 2.0;
        
        gl.uniform1f(gl.getUniformLocation(program, 'u_time'), time * 0.001);
        gl.uniform2f(gl.getUniformLocation(program, 'u_resolution'), webglCanvas.width, webglCanvas.height);
        gl.uniform3fv(gl.getUniformLocation(program, 'u_cameraPos'), cameraPos);
        gl.uniform2fv(gl.getUniformLocation(program, 'u_cameraRot'), cameraRot);

        gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
        requestAnimationFrame(render);
    }

    function initialize() {
        if (!createProgram()) return;
        createGeometry();
        render(0);
    }

    webglCanvas.addEventListener('mousedown', () => { mouse.isDown = true; });
    window.addEventListener('mouseup', () => { mouse.isDown = false; });
    window.addEventListener('mousemove', (e) => {
        if (mouse.isDown) {
            cameraRot[1] -= e.movementX * 0.002;
            cameraRot[0] -= e.movementY * 0.002;
            cameraRot[0] = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, cameraRot[0]));
        }
    });

    window.addEventListener('resize', () => {
        webglCanvas.width = window.innerWidth;
        webglCanvas.height = window.innerHeight;
        gl.viewport(0, 0, window.innerWidth, window.innerHeight);
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

})();
