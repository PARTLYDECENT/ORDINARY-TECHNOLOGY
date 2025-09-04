// =================================================================================================
// [3D WORLD EXPLORER] :: ENHANCED WEBGL SHADER SYSTEM
// Legitimate 3D world with travel mechanics, multiple variations, and shader voodoo
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
    // [3D WORLD CONFIGURATIONS] :: DIFFERENT 3D ENVIRONMENTS
    // =================================================================================================
    const worlds3D = [
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
    // [3D VERTEX SHADER] :: PROPER 3D TRANSFORMATION
    // =================================================================================================
    const vertexShaderSource = `
        attribute vec3 a_position;
        attribute vec2 a_texCoord;
        uniform mat4 u_mvpMatrix;
        uniform float u_time;
        uniform vec3 u_cameraPos;
        varying vec3 v_worldPos;
        varying vec3 v_viewPos;
        varying vec2 v_texCoord;
        varying float v_time;
        
        void main() {
            v_worldPos = a_position;
            v_viewPos = a_position - u_cameraPos;
            v_texCoord = a_texCoord;
            v_time = u_time;
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
        uniform vec3 u_bgColor;
        uniform vec3 u_primaryColor;
        uniform vec3 u_secondaryColor;
        uniform float u_speed;
        uniform float u_density;
        uniform float u_height;
        uniform int u_style;
        uniform vec2 u_resolution;
        
        varying vec3 v_worldPos;
        varying vec3 v_viewPos;
        varying vec2 v_texCoord;
        varying float v_time;
        
        const float PI = 3.14159265359;
        const float TWO_PI = 6.28318530718;

        // =========================================================================================
        // [3D UTILITY FUNCTIONS] :: ENHANCED NOISE AND MATH
        // =========================================================================================
        
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

        // =========================================================================================
        // [3D DISTANCE FUNCTIONS] :: SDF FOR PROCEDURAL GEOMETRY
        // =========================================================================================
        
        float sdBox(vec3 p, vec3 b) {
            vec3 q = abs(p) - b;
            return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
        }
        
        float sdSphere(vec3 p, float r) {
            return length(p) - r;
        }
        
        float sdCylinder(vec3 p, float h, float r) {
            vec2 d = abs(vec2(length(p.xz), p.y)) - vec2(r, h);
            return min(max(d.x, d.y), 0.0) + length(max(d, 0.0));
        }

        // =========================================================================================
        // [3D WORLD GENERATION] :: PROCEDURAL 3D ENVIRONMENTS
        // =========================================================================================
        
        float map3D(vec3 p, float t, int style) {
            float dist = 1000.0;
            
            // Ground plane
            dist = min(dist, p.y + 0.5);
            
            if(style == 0) { // Neon Cyberpunk
                // Skyscrapers
                vec3 cell = floor(p / 8.0);
                vec3 local = mod(p, 8.0) - 4.0;
                float height = 10.0 + hash(cell) * 15.0;
                dist = min(dist, sdBox(local - vec3(0, height * 0.5, 0), vec3(1.5, height * 0.5, 1.5)));
                
                // Floating platforms
                float platformY = sin(t + cell.x + cell.z) * 3.0 + 8.0;
                dist = min(dist, sdBox(local - vec3(0, platformY, 0), vec3(2.0, 0.2, 2.0)));
                
            } else if(style == 1) { // Bio Forest
                // Organic trees
                vec3 treePos = vec3(mod(p.x, 6.0) - 3.0, 0, mod(p.z, 6.0) - 3.0);
                float treeHeight = 8.0 + fbm3D(floor(p.xz / 6.0).xyx) * 6.0;
                dist = min(dist, sdCylinder(treePos - vec3(0, treeHeight * 0.5, 0), treeHeight * 0.5, 0.5));
                
                // Organic blobs
                float blobDist = sdSphere(treePos - vec3(0, treeHeight + 2.0, 0), 2.0 + sin(t) * 0.5);
                dist = min(dist, blobDist);
                
            } else if(style == 2) { // Crystal Cave
                // Crystal formations
                vec3 crystalPos = vec3(mod(p.x, 5.0) - 2.5, 0, mod(p.z, 5.0) - 2.5);
                float crystalHeight = 5.0 + hash(floor(p.xz / 5.0).xyx) * 10.0;
                vec3 rotatedPos = rotY(t * 0.1 + hash(floor(p.xz / 5.0).xyx) * TWO_PI) * crystalPos;
                dist = min(dist, sdBox(rotatedPos - vec3(0, crystalHeight * 0.5, 0), vec3(0.8, crystalHeight * 0.5, 0.8)));
                
            } else if(style == 3) { // Void Matrix
                // Digital structures
                vec3 gridPos = floor(p / 4.0) * 4.0;
                vec3 localPos = p - gridPos;
                if(hash(gridPos) > 0.7) {
                    float pillarHeight = 6.0 + sin(t + gridPos.x + gridPos.z) * 2.0;
                    dist = min(dist, sdBox(localPos - vec3(0, pillarHeight * 0.5, 0), vec3(0.3, pillarHeight * 0.5, 0.3)));
                }
                
            } else if(style == 4) { // Plasma Storm
                // Energy pillars
                vec3 pillarPos = vec3(mod(p.x, 7.0) - 3.5, 0, mod(p.z, 7.0) - 3.5);
                float energy = sin(t * 2.0 + length(pillarPos.xz) * 0.5) * 0.5 + 0.5;
                float pillarHeight = 12.0 + energy * 8.0;
                dist = min(dist, sdCylinder(pillarPos - vec3(0, pillarHeight * 0.5, 0), pillarHeight * 0.5, 0.8 + energy * 0.4));
            }
            
            return dist;
        }

        // =========================================================================================
        // [3D RAYMARCHING] :: VOLUMETRIC RENDERING
        // =========================================================================================
        
        vec3 getNormal(vec3 p, float t, int style) {
            float eps = 0.01;
            return normalize(vec3(
                map3D(p + vec3(eps, 0, 0), t, style) - map3D(p - vec3(eps, 0, 0), t, style),
                map3D(p + vec3(0, eps, 0), t, style) - map3D(p - vec3(0, eps, 0), t, style),
                map3D(p + vec3(0, 0, eps), t, style) - map3D(p - vec3(0, 0, eps), t, style)
            ));
        }
        
        float raymarch(vec3 ro, vec3 rd, float t, int style) {
            float dist = 0.0;
            for(int i = 0; i < 64; i++) {
                vec3 p = ro + rd * dist;
                float d = map3D(p, t, style);
                if(d < 0.01 || dist > 100.0) break;
                dist += d * 0.8;
            }
            return dist;
        }

        // =========================================================================================
        // [3D WORLD SHADERS] :: STYLE-SPECIFIC RENDERING
        // =========================================================================================
        
        vec3 neonCyberpunk3D(vec3 ro, vec3 rd, float t) {
            float dist = raymarch(ro, rd, t, 0);
            vec3 color = u_bgColor;
            
            if(dist < 100.0) {
                vec3 p = ro + rd * dist;
                vec3 n = getNormal(p, t, 0);
                
                // Neon lighting
                float neonGlow = max(0.0, dot(n, normalize(vec3(1, 1, 1))));
                color += u_primaryColor * neonGlow * 0.8;
                
                // Holographic scanlines
                float scanlines = sin(p.y * 20.0 + t * 5.0) * 0.5 + 0.5;
                color += u_secondaryColor * scanlines * 0.3;
                
                // Edge glow
                float fresnel = 1.0 - abs(dot(n, -rd));
                color += u_primaryColor * fresnel * 0.5;
            }
            
            // Atmospheric fog
            float fog = exp(-dist * 0.02);
            color = mix(u_bgColor, color, fog);
            
            // Digital rain
            float rain = fbm3D(vec3(ro.x * 0.1, ro.y + t * 3.0, ro.z * 0.1)) * 0.3;
            color += u_primaryColor * rain * 0.2;
            
            return color;
        }
        
        vec3 bioForest3D(vec3 ro, vec3 rd, float t) {
            float dist = raymarch(ro, rd, t, 1);
            vec3 color = u_bgColor;
            
            if(dist < 100.0) {
                vec3 p = ro + rd * dist;
                vec3 n = getNormal(p, t, 1);
                
                // Organic lighting
                float organicLight = max(0.0, dot(n, normalize(vec3(0, 1, 0.5))));
                color += u_primaryColor * organicLight * 0.6;
                
                // Bio-luminescence
                float bioGlow = fbm3D(p * 2.0 + t * 0.5) * 0.5 + 0.5;
                color += u_secondaryColor * bioGlow * 0.4;
                
                // Pulsing life energy
                float pulse = sin(t * 2.0 + length(p) * 0.1) * 0.3 + 0.7;
                color *= pulse;
            }
            
            // Atmospheric particles
            float particles = fbm3D(ro * 0.5 + t * 0.3) * 0.4;
            color += u_primaryColor * particles * 0.1;
            
            return color;
        }
        
        vec3 crystalCave3D(vec3 ro, vec3 rd, float t) {
            float dist = raymarch(ro, rd, t, 2);
            vec3 color = u_bgColor;
            
            if(dist < 100.0) {
                vec3 p = ro + rd * dist;
                vec3 n = getNormal(p, t, 2);
                
                // Crystal reflections
                vec3 reflected = reflect(rd, n);
                float reflection = max(0.0, dot(reflected, normalize(vec3(1, 1, 1))));
                color += u_primaryColor * reflection * 0.7;
                
                // Prismatic effects
                float prism = sin(p.x * 5.0 + t) * sin(p.y * 3.0 + t) * sin(p.z * 4.0 + t);
                vec3 rainbow = vec3(sin(prism), sin(prism + 2.0), sin(prism + 4.0)) * 0.5 + 0.5;
                color += rainbow * 0.3;
                
                // Crystal internal glow
                float internalGlow = 1.0 / (1.0 + dist * 0.1);
                color += u_secondaryColor * internalGlow * 0.2;
            }
            
            // Crystalline atmosphere
            float atmosphere = fbm3D(ro * 0.3 + t * 0.2) * 0.5;
            color += u_primaryColor * atmosphere * 0.15;
            
            return color;
        }
        
        vec3 voidMatrix3D(vec3 ro, vec3 rd, float t) {
            float dist = raymarch(ro, rd, t, 3);
            vec3 color = u_bgColor;
            
            if(dist < 100.0) {
                vec3 p = ro + rd * dist;
                vec3 n = getNormal(p, t, 3);
                
                // Digital grid overlay
                vec3 gridPos = floor(p * 2.0) / 2.0;
                float gridHash = hash(gridPos);
                if(gridHash > 0.95) {
                    color += u_primaryColor * 0.8;
                }
                
                // Matrix code streams
                float code = step(0.98, noise3D(vec3(p.x, p.y + t * 5.0, p.z) * 10.0));
                color += u_primaryColor * code * 0.6;
                
                // Glitch effects
                float glitch = step(0.99, noise3D(p * 20.0 + t * 10.0));
                color += u_secondaryColor * glitch;
            }
            
            // Digital void
            float voidEffect = 1.0 - smoothstep(0.0, 50.0, dist);
            color += u_primaryColor * voidEffect * 0.1;
            
            return color;
        }
        
        vec3 plasmaStorm3D(vec3 ro, vec3 rd, float t) {
            float dist = raymarch(ro, rd, t, 4);
            vec3 color = u_bgColor;
            
            if(dist < 100.0) {
                vec3 p = ro + rd * dist;
                vec3 n = getNormal(p, t, 4);
                
                // Plasma energy
                float plasma = sin(p.x * 2.0 + t * 2.0) * cos(p.y * 3.0 + t * 1.5) * sin(p.z * 2.5 + t * 1.8);
                vec3 plasmaColor = vec3(sin(plasma + t), sin(plasma + t + 2.0), sin(plasma + t + 4.0)) * 0.5 + 0.5;
                color += plasmaColor * 0.6;
                
                // Energy bolts
                float bolts = fbm3D(p * 3.0 + t * 2.0) * 0.5;
                color += u_primaryColor * bolts * 0.4;
                
                // Electromagnetic distortion
                float distortion = sin(length(p) * 0.5 + t * 3.0) * 0.3 + 0.7;
                color *= distortion;
            }
            
            // Storm atmosphere
            float storm = fbm3D(ro * 0.2 + t * 0.8) * 0.6;
            color += u_secondaryColor * storm * 0.2;
            
            return color;
        }

        // =========================================================================================
        // [MAIN 3D RENDERING]
        // =========================================================================================
        void main() {
            vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / min(u_resolution.y, u_resolution.x);
            
            // 3D camera setup
            vec3 ro = u_cameraPos;
            vec3 rd = normalize(vec3(uv, 1.0));
            
            float t = u_time * u_speed;
            vec3 color = u_bgColor;
            
            // Render based on world style
            if(u_style == 0) {
                color = neonCyberpunk3D(ro, rd, t);
            } else if(u_style == 1) {
                color = bioForest3D(ro, rd, t);
            } else if(u_style == 2) {
                color = crystalCave3D(ro, rd, t);
            } else if(u_style == 3) {
                color = voidMatrix3D(ro, rd, t);
            } else if(u_style == 4) {
                color = plasmaStorm3D(ro, rd, t);
            }
            
            // Post-processing effects
            color = pow(color, vec3(0.8)); // Gamma correction
            color *= 1.0 - length(uv) * 0.1; // Vignette
            
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
    // [3D GEOMETRY AND RENDERING]
    // =================================================================================================
    function createGeometry() {
        const vertices = new Float32Array([
            -1, -1, 0, 0, 0,
             1, -1, 0, 1, 0,
             1,  1, 0, 1, 1,
            -1,  1, 0, 0, 1
        ]);
        
        const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);
        
        const vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
        
        const indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
        
        const positionLoc = gl.getAttribLocation(program, 'a_position');
        const texCoordLoc = gl.getAttribLocation(program, 'a_texCoord');
        
        gl.enableVertexAttribArray(positionLoc);
        gl.vertexAttribPointer(positionLoc, 3, gl.FLOAT, false, 20, 0);
        
        gl.enableVertexAttribArray(texCoordLoc);
        gl.vertexAttribPointer(texCoordLoc, 2, gl.FLOAT, false, 20, 12);
        
        return 6;
    }

    // =================================================================================================
    // [CAMERA AND TRAVEL MECHANICS]
    // =================================================================================================
    function updateCamera(dt) {
        if(autoTravel) {
            const time = performance.now() * 0.001;
            cameraPos[0] += Math.sin(time * 0.3) * travelSpeed * dt;
            cameraPos[2] += travelSpeed * dt * 2.0;
            cameraRot[1] = Math.sin(time * 0.2) * 0.1;
        }
    }

    // =================================================================================================
    // [MAIN RENDER LOOP]
    // =================================================================================================
    let lastTime = 0, indexCount = 0;
    
    function render(time) {
        const dt = (time - lastTime) * 0.001;
        lastTime = time;
        
        updateCamera(dt);
        
        const world = worlds3D[currentWorldIndex];
        gl.clearColor(...world.bgColor, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        
        // Set uniforms
        gl.uniform1f(gl.getUniformLocation(program, 'u_time'), time * 0.001);
        gl.uniform3f(gl.getUniformLocation(program, 'u_cameraPos'), ...cameraPos);
        gl.uniform3f(gl.getUniformLocation(program, 'u_bgColor'), ...world.bgColor);
        gl.uniform3f(gl.getUniformLocation(program, 'u_primaryColor'), ...world.primaryColor);
        gl.uniform3f(gl.getUniformLocation(program, 'u_secondaryColor'), ...world.secondaryColor);
        gl.uniform1f(gl.getUniformLocation(program, 'u_speed'), world.speed);
        gl.uniform1f(gl.getUniformLocation(program, 'u_density'), world.density);
        gl.uniform1f(gl.getUniformLocation(program, 'u_height'), world.height);
        gl.uniform1i(gl.getUniformLocation(program, 'u_style'), world.style);
        gl.uniform2f(gl.getUniformLocation(program, 'u_resolution'), webglCanvas.width, webglCanvas.height);
        
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
        if (options.worldIndex !== undefined && options.worldIndex >= 0 && options.worldIndex < 5) {
            currentWorldIndex = options.worldIndex;
            console.log(`[3D WORLD SWITCH] ${worlds3D[currentWorldIndex].name}`);
        }
        if (options.autoTravel !== undefined) autoTravel = options.autoTravel;
        if (options.speed !== undefined) travelSpeed = Math.max(0.1, Math.min(5.0, options.speed));
    };

    function initialize() {
        try {
            if (!createProgram()) return false;
            indexCount = createGeometry();
            
            // Auto-switch worlds every 20 seconds
            setInterval(() => {
                if(autoTravel) {
                    currentWorldIndex = (currentWorldIndex + 1) % worlds3D.length;
                    console.log(`[AUTO SWITCH] ${worlds3D[currentWorldIndex].name}`);
                }
            }, 20000);
            
            render(0);
            return true;
        } catch (e) {
            console.error('3D World initialization failed:', e);
            return false;
        }
    }

    // =================================================================================================
    // [WINDOW RESIZE AND STARTUP]
    // =================================================================================================
    window.addEventListener('resize', function() {
        if (webglCanvas) {
            webglCanvas.width = window.innerWidth;
            webglCanvas.height = window.innerHeight;
            if (gl) gl.viewport(0, 0, window.innerWidth, window.innerHeight);
        }
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

})();
