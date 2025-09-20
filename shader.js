// =================================================================================================
// [3D WORLD EXPLORER] :: MEGA-ENHANCED WEBGL SHADER SYSTEM V2
// 10 Unique procedural worlds with advanced travel mechanics, multiple variations, and shader voodoo
// =================================================================================================
(function() {
    "use strict";

    const webglCanvas = document.getElementById('webglCanvas');
    let gl = null;
    let program = null;
    let animationFrameId = null;
    let currentWorldIndex = 0;
    let cameraPos = [0, 2, 0];
    let cameraRot = [0, 0];
    let autoTravel = true;
    let travelSpeed = 1.0;

    if (!webglCanvas) {
        console.error("[FATAL] WebGL Canvas element with id 'webglCanvas' not found in DOM. Aborting.");
        return;
    }

    // =================================================================================================
    // [3D WORLD CONFIGURATIONS] :: 10 DIFFERENT 3D ENVIRONMENTS
    // =================================================================================================
    const worlds3D = [
        // --- Original 5 ---
        {
            name: "Neon Cyberpunk Metropolis",
            bgColor: [0.05, 0.05, 0.2], primaryColor: [0.0, 1.0, 1.0], secondaryColor: [1.0, 0.0, 1.0],
            speed: 1.5, density: 0.8, height: 15.0, style: 0
        },
        {
            name: "Bio-Organic Forest",
            bgColor: [0.02, 0.1, 0.02], primaryColor: [0.2, 0.8, 0.3], secondaryColor: [0.8, 0.4, 0.1],
            speed: 0.8, density: 1.2, height: 12.0, style: 1
        },
        {
            name: "Crystal Dimension Cave",
            bgColor: [0.1, 0.05, 0.15], primaryColor: [0.8, 0.9, 1.0], secondaryColor: [1.0, 0.8, 0.9],
            speed: 1.2, density: 0.6, height: 20.0, style: 2
        },
        {
            name: "Void Matrix Construct",
            bgColor: [0.0, 0.0, 0.0], primaryColor: [0.0, 1.0, 0.0], secondaryColor: [1.0, 0.0, 0.0],
            speed: 2.0, density: 0.4, height: 8.0, style: 3
        },
        {
            name: "Plasma Storm Dimension",
            bgColor: [0.2, 0.0, 0.1], primaryColor: [1.0, 0.3, 0.8], secondaryColor: [0.5, 0.0, 1.0],
            speed: 1.8, density: 1.0, height: 18.0, style: 4
        },
        // --- New 5 ---
        {
            name: "Infernal Forge",
            bgColor: [0.1, 0.0, 0.0], primaryColor: [1.0, 0.2, 0.0], secondaryColor: [1.0, 0.8, 0.0],
            speed: 1.0, density: 1.5, height: 25.0, style: 5
        },
        {
            name: "Abyssal Trench",
            bgColor: [0.0, 0.02, 0.05], primaryColor: [0.1, 0.5, 1.0], secondaryColor: [0.8, 1.0, 0.2],
            speed: 0.7, density: 0.9, height: 30.0, style: 6
        },
        {
            name: "Celestial Archipelago",
            bgColor: [0.4, 0.6, 0.9], primaryColor: [1.0, 0.9, 0.7], secondaryColor: [0.2, 0.8, 0.5],
            speed: 1.3, density: 1.0, height: 0.0, style: 7
        },
        {
            name: "Polygonal Dreamscape",
            bgColor: [0.1, 0.1, 0.1], primaryColor: [1.0, 1.0, 1.0], secondaryColor: [0.0, 0.5, 1.0],
            speed: 2.2, density: 0.5, height: 10.0, style: 8
        },
        {
            name: "Sun-Bleached Expanse",
            bgColor: [0.8, 0.75, 0.6], primaryColor: [0.9, 0.85, 0.8], secondaryColor: [0.3, 0.2, 0.1],
            speed: 1.6, density: 0.7, height: 40.0, style: 9
        }
    ];

    // =================================================================================================
    // [WEBGL INITIALIZATION]
    // =================================================================================================
    try {
        webglCanvas.width = window.innerWidth;
        webglCanvas.height = window.innerHeight;

        gl = webglCanvas.getContext('webgl2') || webglCanvas.getContext('webgl');
        if (!gl) throw new Error("WebGL not supported");

        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        
        console.log("[INFO] 3D World Explorer V2 initialized successfully.");
    } catch (e) {
        console.error("[FATAL] 3D World initialization error:", e);
        return;
    }

    // =================================================================================================
    // [3D VERTEX SHADER] :: PROPER 3D TRANSFORMATION
    // =================================================================================================
    const vertexShaderSource = `
        attribute vec3 a_position;
        uniform mat4 u_mvpMatrix;
        varying vec3 v_worldPos;
        
        void main() {
            v_worldPos = a_position;
            gl_Position = u_mvpMatrix * vec4(a_position, 1.0);
        }
    `;

    // =================================================================================================
    // [3D FRAGMENT SHADER] :: ENHANCED 3D WORLD RENDERING WITH SHADER VOODOO
    // =================================================================================================
    const fragmentShaderSource = `
        precision highp float;
        
        uniform float u_time;
        uniform vec3 u_cameraPos;
        uniform vec2 u_resolution;
        uniform vec3 u_bgColor;
        uniform vec3 u_primaryColor;
        uniform vec3 u_secondaryColor;
        uniform float u_speed;
        uniform int u_style;

        varying vec3 v_worldPos;
        
        const float PI = 3.14159265359;
        const float TWO_PI = 6.28318530718;
        const int MAX_STEPS = 96;
        const float MAX_DIST = 150.0;
        const float SURF_DIST = 0.005;

        // =========================================================================================
        // [3D UTILITY FUNCTIONS] :: ENHANCED NOISE AND MATH
        // =========================================================================================
        float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float hash3D(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }

        float noise(vec3 p) {
            vec3 i = floor(p), f = fract(p);
            f = f * f * (3.0 - 2.0 * f);
            return mix(
                mix(mix(hash3D(i), hash3D(i + vec3(1,0,0)), f.x),
                    mix(hash3D(i + vec3(0,1,0)), hash3D(i + vec3(1,1,0)), f.x), f.y),
                mix(mix(hash3D(i + vec3(0,0,1)), hash3D(i + vec3(1,0,1)), f.x),
                    mix(hash3D(i + vec3(0,1,1)), hash3D(i + vec3(1,1,1)), f.x), f.y), f.z);
        }
        
        float fbm(vec3 p) {
            float v = 0.0, a = 0.5;
            for(int i = 0; i < 6; i++) {
                v += a * noise(p);
                p *= 2.0; a *= 0.5;
            }
            return v;
        }

        mat3 rotY(float a) { float c=cos(a), s=sin(a); return mat3(c,0,s,0,1,0,-s,0,c); }
        mat3 rotX(float a) { float c=cos(a), s=sin(a); return mat3(1,0,0,0,c,-s,0,s,c); }
        mat3 rotZ(float a) { float c=cos(a), s=sin(a); return mat3(c,-s,0,s,c,0,0,0,1); }

        // =========================================================================================
        // [3D DISTANCE FUNCTIONS] :: SDF FOR PROCEDURAL GEOMETRY
        // =========================================================================================
        float sdBox(vec3 p, vec3 b) { vec3 q=abs(p)-b; return length(max(q,0.0))+min(max(q.x,max(q.y,q.z)),0.0); }
        float sdSphere(vec3 p, float r) { return length(p) - r; }
        float sdCylinder(vec3 p, float h, float r) { vec2 d=abs(vec2(length(p.xz),p.y))-vec2(r,h); return min(max(d.x,d.y),0.0)+length(max(d,0.0)); }
        float sdTorus(vec3 p, vec2 t) { vec2 q=vec2(length(p.xz)-t.x,p.y); return length(q)-t.y; }
        float opU(float d1, float d2) { return min(d1, d2); }

        // =========================================================================================
        // [3D WORLD GENERATION] :: PROCEDURAL 3D ENVIRONMENTS
        // =========================================================================================
        float map(vec3 p, float t) {
            float res = MAX_DIST;
            if(u_style == 0) { // Neon Cyberpunk
                vec3 cell = floor(p / 12.0);
                vec3 local = mod(p, 12.0) - 6.0;
                float h = 15.0 + hash3D(cell) * 25.0;
                res = opU(res, sdBox(local - vec3(0, h * 0.5 - 5.0, 0), vec3(2.5, h * 0.5, 2.5)));
            } else if(u_style == 1) { // Bio Forest
                vec3 treePos = p;
                treePos.xz = mod(p.xz, 8.0) - 4.0;
                float h = 10.0 + fbm(p*0.1) * 8.0;
                res = opU(res, sdCylinder(treePos - vec3(0, h * 0.4, 0), h * 0.6, 0.4 + fbm(p*0.5)*0.2));
            } else if(u_style == 2) { // Crystal Cave
                p.y += 10.0;
                res = opU(res, -sdSphere(p, 15.0) + fbm(p * 0.8 + t * 0.1) * 3.0);
            } else if(u_style == 3) { // Void Matrix
                vec3 gridPos = floor(p / 5.0) * 5.0;
                if(hash3D(gridPos) > 0.6) {
                    float h = 8.0 + sin(t + gridPos.x) * 4.0;
                    res = opU(res, sdBox(p - gridPos - vec3(2.5, h*0.5-5.0, 2.5), vec3(0.2, h*0.5, 0.2)));
                }
            } else if(u_style == 4) { // Plasma Storm
                res = fbm(p * 0.3 + t * 0.5) * 8.0;
                res += sdTorus(p, vec2(10.0, 1.0));
            } else if(u_style == 5) { // Infernal Forge
                float ground = p.y + fbm(p * 0.5 + vec3(0,0,t*0.2)) * 3.0;
                vec3 q = mod(p, 15.0) - 7.5;
                float spire_h = 20.0 * hash3D(floor(p/15.0));
                float spire = sdCylinder(q - vec3(0,spire_h*0.5,0), spire_h*0.5, 1.0);
                res = opU(ground, spire);
            } else if(u_style == 6) { // Abyssal Trench
                float trench = abs(p.x) - 15.0 + noise(p*0.2)*5.0;
                p.y += 20.0;
                vec3 vent_pos = mod(p, 20.0) - 10.0;
                float vent_h = 30.0 * hash3D(floor(p/20.0));
                float vent = sdCylinder(vent_pos - vec3(0,vent_h*0.5,0), vent_h*0.5, 0.5 + noise(p)*0.5);
                res = opU(trench, vent);
            } else if(u_style == 7) { // Celestial Archipelago
                vec3 island_pos = mod(p, 50.0)-25.0;
                float id = hash3D(floor(p/50.0));
                if (id > 0.5) {
                    float island_size = 5.0 + id * 10.0;
                    res = opU(res, sdSphere(island_pos, island_size) - fbm(p*0.5)*3.0);
                }
            } else if(u_style == 8) { // Polygonal Dreamscape
                p = rotY(t*0.2) * p;
                p = rotX(t*0.1) * p;
                res = sdBox(abs(mod(p, 8.0) - 4.0)-1.0, vec3(0.5));
            } else if(u_style == 9) { // Sun-Bleached Expanse
                float ground = p.y + sin(p.x * 0.1 + t) * sin(p.z * 0.1 + t) * 2.0; // Dunes
                vec3 rib_pos = p;
                rib_pos.xz = mod(p.xz, 40.0) - 20.0;
                rib_pos.y -= 5.0;
                rib_pos = rotZ(1.2) * rib_pos;
                res = opU(ground, sdTorus(rib_pos, vec2(10.0, 1.5)));
            }
            return res;
        }

        // =========================================================================================
        // [3D RAYMARCHING & NORMALS]
        // =========================================================================================
        vec3 getNormal(vec3 p, float t) {
            float e = 0.001;
            vec2 h = vec2(1, -1);
            return normalize(
                h.xyy * map(p + h.xyy*e, t) +
                h.yyx * map(p + h.yyx*e, t) +
                h.yxy * map(p + h.yxy*e, t) +
                h.xxx * map(p + h.xxx*e, t)
            );
        }

        float raymarch(vec3 ro, vec3 rd, float t) {
            float d = 0.0;
            for(int i=0; i<MAX_STEPS; i++) {
                vec3 p = ro + rd * d;
                float h = map(p, t);
                if(h < SURF_DIST || d > MAX_DIST) break;
                d += h * 0.7;
            }
            return d;
        }
        
        // =========================================================================================
        // [3D WORLD SHADING & RENDERING]
        // =========================================================================================
        vec3 render(vec3 ro, vec3 rd, float t) {
            vec3 col = u_bgColor;
            float d = raymarch(ro, rd, t);

            if(d < MAX_DIST) {
                vec3 p = ro + rd * d;
                vec3 n = getNormal(p, t);
                vec3 lightDir = normalize(vec3(0.5, 0.8, -0.3));
                float diffuse = max(0.0, dot(n, lightDir));
                
                // --- World-Specific Materials & Lighting ---
                vec3 material_col = u_primaryColor;
                if(u_style == 0) { // Neon Cyberpunk
                    material_col = mix(u_primaryColor, u_secondaryColor, step(0.95, hash3D(floor(p*2.0))));
                    float fresnel = pow(1.0 - abs(dot(n, -rd)), 4.0);
                    col = material_col * (diffuse * 0.5 + 0.5) + u_secondaryColor * fresnel;
                    col += sin(p.y*10.0 + t*5.0) * 0.1 * u_primaryColor;
                } else if(u_style == 1) { // Bio Forest
                    float bio = fbm(p*2.0 + t) * 0.5 + 0.5;
                    material_col = mix(u_primaryColor, u_secondaryColor, bio);
                    col = material_col * (diffuse * 0.7 + 0.3);
                } else if(u_style == 2) { // Crystal Cave
                    vec3 r = reflect(rd, n);
                    float reflection = fbm(r*2.0);
                    material_col = mix(u_primaryColor, vec3(1.0), reflection);
                    col = material_col * (diffuse * 0.4 + 0.6);
                } else if(u_style == 3) { // Void Matrix
                    float grid = step(0.98, noise(p*vec3(10,1,10)));
                    material_col = mix(u_primaryColor, u_secondaryColor, grid);
                    col = material_col * (diffuse * 0.8 + 0.2);
                } else if(u_style == 4) { // Plasma Storm
                    float plasma = fbm(p * 2.0 + t) * 0.5 + 0.5;
                    col = mix(u_primaryColor, u_secondaryColor, plasma);
                } else if(u_style == 5) { // Infernal Forge
                    float lava = smoothstep(0.4, 0.6, fbm(p * 1.5 + vec3(0,0,t)));
                    material_col = mix(vec3(0.05), u_secondaryColor, lava);
                    col = material_col * (diffuse * 0.3 + 0.7) + u_secondaryColor * lava * 1.5;
                } else if(u_style == 6) { // Abyssal Trench
                    float lum = pow(fbm(p * 3.0 - t * 0.5), 3.0);
                    col = u_primaryColor * diffuse * 0.2 + u_secondaryColor * lum * 2.0;
                } else if(u_style == 7) { // Celestial Archipelago
                    float grass = smoothstep(0.5, 0.6, noise(p*3.0));
                    material_col = mix(u_primaryColor, u_secondaryColor, grass);
                    col = material_col * (diffuse * 0.8 + 0.2);
                } else if(u_style == 8) { // Polygonal Dreamscape
                    vec3 cell = floor(p);
                    material_col = mix(u_primaryColor, u_secondaryColor, hash3D(cell));
                    col = material_col * (diffuse * 0.5 + 0.5);
                } else if(u_style == 9) { // Sun-Bleached Expanse
                    col = u_primaryColor * (diffuse * 0.9 + 0.1);
                }
                
                // --- Fog ---
                float fog = 1.0 - exp(-d * d * 0.001);
                col = mix(col, u_bgColor, fog);

            } else {
                // --- Background effects for worlds without hits ---
                if (u_style == 7) { // Volumetric clouds for Celestial Archipelago
                    float clouds = fbm(rd * 3.0 + vec3(0, -t*0.1, 0));
                    col = mix(u_bgColor, vec3(1.0), smoothstep(0.4, 0.7, clouds));
                }
            }
            return col;
        }


        // =========================================================================================
        // [MAIN 3D RENDERING]
        // =========================================================================================
        void main() {
            vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / u_resolution.y;
            
            // 3D camera setup
            vec3 ro = u_cameraPos;
            vec3 target = ro + vec3(0, 0, 1);
            vec3 fwd = normalize(target - ro);
            vec3 right = normalize(cross(fwd, vec3(0,1,0)));
            vec3 up = normalize(cross(right, fwd));
            vec3 rd = normalize(fwd + right * uv.x + up * uv.y);
            
            // Heat distortion for Infernal Forge
            if(u_style == 5){
                rd.xy += (fbm(ro*0.1+t)-0.5)*0.02;
            }

            float t = u_time * u_speed;
            vec3 color = render(ro, rd, t);
            
            // Post-processing effects
            color = pow(color, vec3(0.4545)); // Gamma correction
            color *= 1.0 - dot(uv, uv) * 0.15; // Vignette
            
            gl_FragColor = vec4(color, 1.0);
        }
    `;

    // =================================================================================================
    // [SHADER COMPILATION AND SETUP]
    // =================================================================================================
    function createShader(type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('Shader error:', gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
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
            console.error('Program error:', gl.getProgramInfoLog(program));
            return false;
        }
        
        gl.useProgram(program);
        return true;
    }

    // =================================================================================================
    // [GEOMETRY AND RENDERING]
    // =================================================================================================
    function createGeometry() {
        const vertices = new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]);
        const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);
        
        const vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
        
        const indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
        
        const positionLoc = gl.getAttribLocation(program, 'a_position');
        gl.enableVertexAttribArray(positionLoc);
        gl.vertexAttribPointer(positionLoc, 3, gl.FLOAT, false, 0, 0);
        
        return indices.length;
    }

    // =================================================================================================
    // [CAMERA AND TRAVEL MECHANICS]
    // =================================================================================================
    function updateCamera(dt) {
        if(autoTravel) {
            const time = performance.now() * 0.001;
            const currentSpeed = travelSpeed * worlds3D[currentWorldIndex].speed;
            cameraPos[2] += currentSpeed * dt * 2.0;
            cameraPos[0] += Math.sin(time * 0.2) * currentSpeed * dt;
            cameraPos[1] = 2.0 + Math.sin(time * 0.3) * 0.5;
        }
    }

    // =================================================================================================
    // [MAIN RENDER LOOP]
    // =================================================================================================
    let lastTime = 0, indexCount = 0;
    
    function render(time) {
        time *= 0.001; // convert to seconds
        const dt = time - lastTime;
        lastTime = time;
        
        updateCamera(dt);
        
        const world = worlds3D[currentWorldIndex];
        
        // Set uniforms
        gl.uniform1f(gl.getUniformLocation(program, 'u_time'), time);
        gl.uniform3fv(gl.getUniformLocation(program, 'u_cameraPos'), cameraPos);
        gl.uniform2f(gl.getUniformLocation(program, 'u_resolution'), webglCanvas.width, webglCanvas.height);
        
        gl.uniform3fv(gl.getUniformLocation(program, 'u_bgColor'), world.bgColor);
        gl.uniform3fv(gl.getUniformLocation(program, 'u_primaryColor'), world.primaryColor);
        gl.uniform3fv(gl.getUniformLocation(program, 'u_secondaryColor'), world.secondaryColor);
        gl.uniform1f(gl.getUniformLocation(program, 'u_speed'), world.speed);
        gl.uniform1i(gl.getUniformLocation(program, 'u_style'), world.style);
        
        // Identity matrix for fullscreen quad
        const mvpMatrix = new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
        gl.uniformMatrix4fv(gl.getUniformLocation(program, 'u_mvpMatrix'), false, mvpMatrix);
        
        gl.drawElements(gl.TRIANGLES, indexCount, gl.UNSIGNED_SHORT, 0);
        
        animationFrameId = requestAnimationFrame(render);
    }

    // =================================================================================================
    // [EXTERNAL API AND INITIALIZATION]
    // =================================================================================================
    window.updateShader = function(options = {}) {
        // *** UPDATED to handle 10 worlds ***
        if (options.worldIndex !== undefined && options.worldIndex >= 0 && options.worldIndex < 10) {
            currentWorldIndex = options.worldIndex;
            console.log(`[3D WORLD SWITCH] ${worlds3D[currentWorldIndex].name}`);
        }
        if (options.autoTravel !== undefined) autoTravel = options.autoTravel;
        if (options.speed !== undefined) travelSpeed = Math.max(0.1, Math.min(5.0, options.speed));
    };

    function initialize() {
        try {
            if (!createProgram()) return;
            indexCount = createGeometry();
            
            // Auto-switch worlds every 25 seconds
            setInterval(() => {
                if(autoTravel) {
                    currentWorldIndex = (currentWorldIndex + 1) % worlds3D.length;
                    console.log(`[AUTO SWITCH] ${worlds3D[currentWorldIndex].name}`);
                }
            }, 25000);
            
            requestAnimationFrame(render);
        } catch (e) {
            console.error('3D World initialization failed:', e);
        }
    }

    // =================================================================================================
    // [WINDOW RESIZE AND STARTUP]
    // =================================================================================================
    window.addEventListener('resize', function() {
        if (webglCanvas && gl) {
            webglCanvas.width = window.innerWidth;
            webglCanvas.height = window.innerHeight;
            gl.viewport(0, 0, window.innerWidth, window.innerHeight);
        }
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

})();
