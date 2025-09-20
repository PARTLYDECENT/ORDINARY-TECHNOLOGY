// =================================================================================================
// [ADVENTUROUS 3D WORLD EXPLORER] :: ENHANCED WEBGL SHADER SYSTEM V2
// Seamless transitions, interactive camera, and a new world to explore
// Standalone script for use as shader.js
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
    let animationFrameId = null;

    // Camera & Interaction State
    let currentWorldIndex = 0;
    let nextWorldIndex = 1;
    let transitionProgress = 0.0;
    let isTransitioning = false;

    let cameraPos = [0, 2, 0];
    let cameraRot = [-0.3, 0]; // [PITCH, YAW] - Start looking down slightly
    let travelSpeed = 1.0;
    let mouse = { x: 0, y: 0, isDown: false };

    // =================================================================================================
    // [3D WORLD CONFIGURATIONS]
    // =================================================================================================
    const worlds3D = [
        {
            name: "Neon Cyberpunk Metropolis",
            bgColor: [0.05, 0.05, 0.2], primaryColor: [0.0, 1.0, 1.0], secondaryColor: [1.0, 0.0, 1.0],
            speed: 1.5, style: 0
        },
        {
            name: "Bio-Organic Forest",
            bgColor: [0.02, 0.1, 0.02], primaryColor: [0.2, 0.8, 0.3], secondaryColor: [0.8, 0.4, 0.1],
            speed: 0.8, style: 1
        },
        {
            name: "Crystal Dimension Cave",
            bgColor: [0.1, 0.05, 0.15], primaryColor: [0.8, 0.9, 1.0], secondaryColor: [1.0, 0.8, 0.9],
            speed: 1.2, style: 2
        },
        {
            name: "Void Matrix Construct",
            bgColor: [0.0, 0.0, 0.0], primaryColor: [0.0, 1.0, 0.0], secondaryColor: [1.0, 0.0, 0.0],
            speed: 2.0, style: 3
        },
        {
            name: "Plasma Storm Dimension",
            bgColor: [0.2, 0.0, 0.1], primaryColor: [1.0, 0.3, 0.8], secondaryColor: [0.5, 0.0, 1.0],
            speed: 1.8, style: 4
        },
        { // New World
            name: "The Celestial Isles",
            bgColor: [0.01, 0.02, 0.05], primaryColor: [0.9, 0.8, 1.0], secondaryColor: [0.5, 0.7, 1.0],
            speed: 1.0, style: 5
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
        console.log("[INFO] 3D World Explorer initialized successfully.");
    } catch (e) {
        console.error("[FATAL] 3D World initialization error:", e);
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
    // [FRAGMENT SHADER]
    // =================================================================================================
    const fragmentShaderSource = `
        precision highp float;
        
        uniform float u_time;
        uniform vec2 u_resolution;
        uniform vec3 u_cameraPos;
        uniform vec2 u_cameraRot;

        // Uniforms for world blending
        uniform vec3 u_bgColor1;
        uniform vec3 u_primaryColor1;
        uniform vec3 u_secondaryColor1;
        uniform float u_speed1;
        uniform int u_style1;

        uniform vec3 u_bgColor2;
        uniform vec3 u_primaryColor2;
        uniform vec3 u_secondaryColor2;
        uniform float u_speed2;
        uniform int u_style2;

        uniform float u_transition;

        const float PI = 3.14159265359;

        // --- UTILITY FUNCTIONS (Noise, Math) ---
        float hash(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
        
        float noise3D(vec3 p) {
            vec3 i = floor(p), f = fract(p);
            f = f * f * (3.0 - 2.0 * f);
            return mix(
                mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x),
                    mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
                mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
                    mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
        }
        
        float fbm3D(vec3 p) {
            float value = 0.0, amplitude = 0.5;
            for(int i = 0; i < 5; i++) {
                value += amplitude * noise3D(p);
                p *= 2.0; amplitude *= 0.5;
            }
            return value;
        }

        mat3 rotY(float a) {
            float c = cos(a), s = sin(a);
            return mat3(c, 0, s, 0, 1, 0, -s, 0, c);
        }
        
        mat3 rotX(float a) {
            float c = cos(a), s = sin(a);
            return mat3(1, 0, 0, 0, c, -s, 0, s, c);
        }

        // --- SDF GEOMETRY FUNCTIONS ---
        float sdBox(vec3 p, vec3 b) {
            vec3 q = abs(p) - b;
            return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
        }
        float sdSphere(vec3 p, float r) { return length(p) - r; }
        float sdCylinder(vec3 p, float h, float r) {
            vec2 d = abs(vec2(length(p.xz), p.y)) - vec2(r, h);
            return min(max(d.x, d.y), 0.0) + length(max(d, 0.0));
        }

        // --- WORLD GENERATION (MAP) ---
        float mapStyle(vec3 p, float t, int style) {
            float dist = 1000.0;
            dist = min(dist, p.y + 0.5);
            
            if(style == 0) { // Neon Cyberpunk
                vec3 cell = floor(p / 8.0);
                vec3 local = mod(p, 8.0) - 4.0;
                float height = 10.0 + hash(cell) * 15.0;
                dist = min(dist, sdBox(local - vec3(0, height * 0.5, 0), vec3(1.5, height * 0.5, 1.5)));
            } else if(style == 1) { // Bio Forest
                vec3 treePos = vec3(mod(p.x, 6.0) - 3.0, p.y, mod(p.z, 6.0) - 3.0);
                float treeHeight = 8.0 + fbm3D(floor(p.xz / 6.0).xyx) * 6.0;
                dist = min(dist, sdCylinder(treePos - vec3(0, treeHeight * 0.5, 0), treeHeight * 0.5, 0.5));
            } else if(style == 2) { // Crystal Cave
                vec3 crystalPos = vec3(mod(p.x, 5.0) - 2.5, p.y, mod(p.z, 5.0) - 2.5);
                float crystalHeight = 5.0 + hash(floor(p.xz / 5.0).xyx) * 10.0;
                vec3 rotatedPos = rotY(t * 0.1 + hash(floor(p.xz / 5.0).xyx) * PI * 2.0) * crystalPos;
                dist = min(dist, sdBox(rotatedPos - vec3(0, crystalHeight * 0.5, 0), vec3(0.8, crystalHeight * 0.5, 0.8)));
            } else if(style == 3) { // Void Matrix
                vec3 gridPos = floor(p / 4.0) * 4.0;
                if(hash(gridPos) > 0.7) {
                    float pillarHeight = 6.0 + sin(t + gridPos.x + gridPos.z) * 2.0;
                    dist = min(dist, sdBox(p - gridPos - vec3(0, pillarHeight * 0.5, 0), vec3(0.3, pillarHeight * 0.5, 0.3)));
                }
            } else if(style == 4) { // Plasma Storm
                vec3 pillarPos = vec3(mod(p.x, 7.0) - 3.5, p.y, mod(p.z, 7.0) - 3.5);
                float energy = sin(t * 2.0 + length(pillarPos.xz) * 0.5) * 0.5 + 0.5;
                float pillarHeight = 12.0 + energy * 8.0;
                dist = min(dist, sdCylinder(pillarPos - vec3(0, pillarHeight * 0.5, 0), pillarHeight * 0.5, 0.8 + energy * 0.4));
            } else if(style == 5) { // Celestial Isles
                vec3 cell = floor(p / 15.0);
                if (hash(cell) > 0.6) {
                    vec3 localPos = mod(p, 15.0) - 7.5;
                    float islandRadius = 2.0 + hash(cell + 0.1) * 3.0;
                    float islandY = sin(cell.x * 0.5 + cell.z * 0.3 + t * 0.1) * 5.0;
                    vec3 islandCenter = vec3(0, islandY, 0);
                    float displacement = fbm3D(localPos * 0.8) * 1.5;
                    dist = min(dist, sdSphere(localPos - islandCenter, islandRadius) - displacement);
                }
            }
            return dist;
        }

        float map(vec3 p, float t) {
            float d1 = mapStyle(p, t * u_speed1, u_style1);
            float d2 = mapStyle(p, t * u_speed2, u_style2);
            return mix(d1, d2, smoothstep(0.0, 1.0, u_transition));
        }
        
        // --- RAYMARCHING CORE ---
        vec3 getNormal(vec3 p, float t) {
            float eps = 0.01;
            return normalize(vec3(
                map(p + vec3(eps, 0, 0), t) - map(p - vec3(eps, 0, 0), t),
                map(p + vec3(0, eps, 0), t) - map(p - vec3(0, eps, 0), t),
                map(p + vec3(0, 0, eps), t) - map(p - vec3(0, 0, eps), t)
            ));
        }
        
        float raymarch(vec3 ro, vec3 rd, float t) {
            float dist = 0.0;
            for(int i = 0; i < 80; i++) {
                vec3 p = ro + rd * dist;
                float d = map(p, t);
                if(d < 0.005 || dist > 150.0) break;
                dist += d * 0.7;
            }
            return dist;
        }

        // --- SHADING & EFFECTS ---
        vec3 renderStyle(vec3 ro, vec3 rd, float t, int style, vec3 bgColor, vec3 primaryColor, vec3 secondaryColor) {
            float dist = raymarch(ro, rd, t);
            vec3 color = bgColor;

            if (dist < 150.0) {
                vec3 p = ro + rd * dist;
                vec3 n = getNormal(p, t);
                vec3 sunDir = normalize(vec3(0.8, 0.4, 0.2));
                float diffuse = max(0.0, dot(n, sunDir));
                
                color = mix(color, primaryColor, diffuse * 0.8);
                float fresnel = pow(1.0 - abs(dot(n, -rd)), 3.0);
                color += secondaryColor * fresnel * 0.5;

                if (style == 0) { color += primaryColor * (sin(p.y * 20.0 + t * 5.0) * 0.5 + 0.5) * 0.1; }
                else if (style == 1) { color += secondaryColor * fbm3D(p * 2.0 + t) * 0.2; }
                else if (style == 2) { vec3 reflected = reflect(rd, n); color += primaryColor * max(0.0, dot(reflected, sunDir)) * 0.3; }
                else if (style == 4) { color *= sin(length(p) * 0.5 + t * 3.0) * 0.3 + 0.7; }
                else if (style == 5) { color += primaryColor * pow(fresnel, 2.0) * 0.3; }
            }
            
            float fogDensity = style == 5 ? 0.02 : 0.04;
            float fog = exp(-dist * dist * fogDensity);
            color = mix(bgColor, color, fog);

            if (style == 5) {
                float clouds = fbm3D(ro * 0.1 + vec3(0, t*0.1, 0)) * 0.5 + 0.3;
                color = mix(color, secondaryColor, clouds * (1.0 - fog) * 0.5);
            }

            return color;
        }

        // --- MAIN RENDER FUNCTION ---
        void main() {
            vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / u_resolution.y;
            vec3 ro = u_cameraPos;
            vec3 rd = normalize(vec3(uv, 1.5));
            rd = rotY(u_cameraRot.y) * rotX(u_cameraRot.x) * rd;
            
            float t = u_time;
            
            vec3 color1 = renderStyle(ro, rd, t * u_speed1, u_style1, u_bgColor1, u_primaryColor1, u_secondaryColor1);
            vec3 color2 = renderStyle(ro, rd, t * u_speed2, u_style2, u_bgColor2, u_primaryColor2, u_secondaryColor2);
            vec3 finalColor = mix(color1, color2, smoothstep(0.0, 1.0, u_transition));

            finalColor = pow(finalColor, vec3(0.85));
            finalColor *= 1.0 - length(uv) * 0.15;
            
            gl_FragColor = vec4(finalColor, 1.0);
        }
    `;

    // =================================================================================================
    // [SHADER COMPILATION]
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

    // =================================================================================================
    // [GEOMETRY & RENDER LOOP]
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
        return 6;
    }
    
    let lastTime = 0;
    function render(time) {
        const dt = (time - lastTime) * 0.001;
        lastTime = time;
        
        const timeForPath = performance.now() * 0.0001;
        cameraPos[0] += Math.sin(timeForPath * 2.0) * travelSpeed * dt * 5.0;
        cameraPos[2] += travelSpeed * dt * 10.0;
        cameraPos[1] += Math.cos(timeForPath * 3.0) * travelSpeed * dt * 3.0;

        if (isTransitioning) {
            transitionProgress += dt / 5.0;
            if (transitionProgress >= 1.0) {
                transitionProgress = 0.0;
                isTransitioning = false;
                currentWorldIndex = nextWorldIndex;
            }
        }
        
        const world1 = worlds3D[currentWorldIndex];
        const world2 = worlds3D[nextWorldIndex];
        
        gl.uniform1f(gl.getUniformLocation(program, 'u_time'), time * 0.001);
        gl.uniform2f(gl.getUniformLocation(program, 'u_resolution'), webglCanvas.width, webglCanvas.height);
        gl.uniform3fv(gl.getUniformLocation(program, 'u_cameraPos'), cameraPos);
        gl.uniform2fv(gl.getUniformLocation(program, 'u_cameraRot'), cameraRot);
        gl.uniform3fv(gl.getUniformLocation(program, 'u_bgColor1'), world1.bgColor);
        gl.uniform3fv(gl.getUniformLocation(program, 'u_primaryColor1'), world1.primaryColor);
        gl.uniform3fv(gl.getUniformLocation(program, 'u_secondaryColor1'), world1.secondaryColor);
        gl.uniform1f(gl.getUniformLocation(program, 'u_speed1'), world1.speed);
        gl.uniform1i(gl.getUniformLocation(program, 'u_style1'), world1.style);
        gl.uniform3fv(gl.getUniformLocation(program, 'u_bgColor2'), world2.bgColor);
        gl.uniform3fv(gl.getUniformLocation(program, 'u_primaryColor2'), world2.primaryColor);
        gl.uniform3fv(gl.getUniformLocation(program, 'u_secondaryColor2'), world2.secondaryColor);
        gl.uniform1f(gl.getUniformLocation(program, 'u_speed2'), world2.speed);
        gl.uniform1i(gl.getUniformLocation(program, 'u_style2'), world2.style);
        gl.uniform1f(gl.getUniformLocation(program, 'u_transition'), transitionProgress);

        gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
        animationFrameId = requestAnimationFrame(render);
    }

    // =================================================================================================
    // [INITIALIZATION & EVENT LISTENERS]
    // =================================================================================================
    function initialize() {
        try {
            if (!createProgram()) return;
            const indexCount = createGeometry();
            
            setInterval(() => {
                if (!isTransitioning) {
                    isTransitioning = true;
                    nextWorldIndex = (currentWorldIndex + 1) % worlds3D.length;
                    console.log(`[TRANSITION START] To: ${worlds3D[nextWorldIndex].name}`);
                }
            }, 20000);
            
            render(0);
        } catch (e) {
            console.error('3D World initialization failed:', e);
        }
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
