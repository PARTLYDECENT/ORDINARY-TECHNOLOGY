// =================================================================================================
// [QUANTUM REALITY ENGINE] :: REIMAGINED 3D WORLD SHADER - IIFE SCRIPT
// A journey through 26 uncanny, procedurally generated 3D landscapes.
// =================================================================================================
(function() {
    "use strict";

    let canvas, gl, program, animationId;
    let time = 0, phaseIndex = 0, speed = 1.0;
    let cameraPos = [0, 0, 5], cameraRot = [0, 0, 0];
    let keys = {}, autoJourney = true;
    let infoElement;

    // =================================================================================================
    // [PHASE DEFINITIONS] :: 26 New Procedural 3D Realities
    // =================================================================================================
    const phases = [
        { name: "Menger Sponge", colors: [[1.0,0.8,0.6], [0.8,0.2,0.1], [0.1,0.1,0.2]], params: [3.0, 0.5, 4.0], gridSize: 3.0, fogDensity: 0.1 },
        { name: "Crystalline Caverns", colors: [[0.2,0.8,1.0], [0.8,0.9,1.0], [0.0,0.2,0.4]], params: [0.8, 1.2, 0.1], gridSize: 4.0, fogDensity: 0.15 },
        { name: "Gigeresque Bones", colors: [[0.8,0.8,0.7], [0.2,0.2,0.2], [0.0,0.0,0.0]], params: [1.5, 0.4, 0.8], gridSize: 3.0, fogDensity: 0.2 },
        { name: "Gyroid Infinity", colors: [[1.0,0.6,0.1], [0.2,0.8,1.0], [0.1,0.0,0.1]], params: [8.0, 0.05, 0.9], gridSize: 5.0, fogDensity: 0.08 },
        { name: "Voxel Overgrowth", colors: [[0.2,0.8,0.3], [0.9,0.9,0.8], [0.1,0.2,0.1]], params: [5.0, 0.4, 1.0], gridSize: 2.0, fogDensity: 0.12 },
        { name: "Mandelbulb Core", colors: [[1.0,0.5,0.0], [0.0,0.5,1.0], [0.0,0.0,0.0]], params: [8.0, 1.5, 8.0], gridSize: 1.0, fogDensity: 0.25 },
        { name: "Floating Obelisks", colors: [[0.9,0.9,1.0], [0.4,0.4,0.6], [0.1,0.2,0.4]], params: [0.2, 5.0, 0.8], gridSize: 8.0, fogDensity: 0.07 },
        { name: "Hexagonal Pillars", colors: [[1.0,0.9,0.2], [0.8,0.4,0.1], [0.2,0.1,0.0]], params: [1.0, 0.8, 0.5], gridSize: 2.0, fogDensity: 0.1 },
        { name: "Torus Knot City", colors: [[1.0,0.1,0.3], [0.2,0.8,1.0], [0.1,0.1,0.2]], params: [0.8, 0.2, 4.0], gridSize: 10.0, fogDensity: 0.05 },
        { name: "Alien Desert", colors: [[0.8,0.4,0.2], [1.0,0.8,0.6], [0.3,0.5,0.8]], params: [1.2, 0.5, 0.9], gridSize: 1.0, fogDensity: 0.06 },
        { name: "Mechanized Heart", colors: [[1.0,0.1,0.1], [0.5,0.5,0.6], [0.1,0.1,0.1]], params: [0.5, 0.2, 0.8], gridSize: 2.0, fogDensity: 0.3 },
        { name: "Frozen Nebula", colors: [[0.5,0.8,1.0], [1.0,0.5,1.0], [0.0,0.0,0.1]], params: [2.5, 0.8, 1.2], gridSize: 1.0, fogDensity: 0.18 },
        { name: "Recursive Tetrahedra", colors: [[0.1,1.0,0.8], [0.8,1.0,0.9], [0.1,0.2,0.3]], params: [0.5, 4.0, 1.0], gridSize: 1.0, fogDensity: 0.15 },
        { name: "Data Weave", colors: [[0.0,1.0,1.0], [1.0,1.0,0.0], [0.0,0.0,0.2]], params: [0.1, 5.0, 0.5], gridSize: 2.0, fogDensity: 0.1 },
        { name: "Submerged Temple", colors: [[0.1,0.4,0.3], [0.5,0.8,0.7], [0.0,0.1,0.2]], params: [1.0, 2.0, 1.0], gridSize: 12.0, fogDensity: 0.2 },
        { name: "Volcanic Plains", colors: [[1.0,0.3,0.0], [0.2,0.1,0.1], [0.0,0.0,0.0]], params: [1.5, 0.3, 2.0], gridSize: 1.0, fogDensity: 0.09 },
        { name: "Quantum Chip", colors: [[0.8,0.8,1.0], [0.2,0.2,0.8], [0.1,0.1,0.1]], params: [0.1, 1.0, 0.0], gridSize: 3.0, fogDensity: 0.11 },
        { name: "The Great Attractor", colors: [[1.0,0.8,1.0], [0.8,0.2,1.0], [0.0,0.0,0.0]], params: [1.0, 0.1, 0.5], gridSize: 1.0, fogDensity: 0.04 },
        { name: "Living Coral", colors: [[1.0,0.4,0.6], [0.2,1.0,0.8], [0.1,0.2,0.5]], params: [1.8, 0.6, 0.3], gridSize: 3.0, fogDensity: 0.13 },
        { name: "Dyson Swarm", colors: [[1.0,0.9,0.8], [0.8,0.8,0.8], [0.1,0.1,0.1]], params: [0.5, 0.9, 0.1], gridSize: 15.0, fogDensity: 0.03 },
        { name: "Warp Core", colors: [[0.2,0.8,1.0], [1.0,1.0,1.0], [0.0,0.2,0.5]], params: [0.3, 0.8, 0.4], gridSize: 2.0, fogDensity: 0.22 },
        { name: "The Oracle", colors: [[1.0,0.8,0.2], [0.8,1.0,0.9], [0.2,0.1,0.0]], params: [0.6, 0.5, 0.2], gridSize: 1.0, fogDensity: 0.16 },
        { name: "Glitch City", colors: [[1.0,0.0,0.5], [0.0,1.0,0.8], [0.1,0.1,0.1]], params: [1.0, 0.9, 0.5], gridSize: 6.0, fogDensity: 0.08 },
        { name: "Abyssal Leviathan", colors: [[0.0,0.1,0.3], [0.5,0.2,0.8], [0.0,0.0,0.0]], params: [0.2, 0.5, 0.8], gridSize: 1.0, fogDensity: 0.35 },
        { name: "Stochastic Forest", colors: [[0.4,0.8,0.2], [0.2,0.4,0.1], [0.1,0.1,0.1]], params: [0.1, 6.0, 0.5], gridSize: 4.0, fogDensity: 0.1 },
        { name: "World Serpent", colors: [[0.8,1.0,0.9], [0.8,0.5,0.2], [0.2,0.2,0.3]], params: [1.0, 0.4, 3.0], gridSize: 1.0, fogDensity: 0.07 }
    ];

    // =================================================================================================
    // [OPTIMIZED VERTEX SHADER] (FIXED)
    // =================================================================================================
    const vertexSource = `attribute vec2 p;varying vec2 vUv;void main(){vUv=p;gl_Position=vec4(p,0,1);}`;

    // =================================================================================================
    // [REIMAGINED 3D FRAGMENT SHADER] :: PROCEDURAL WORLD GENERATOR
    // =================================================================================================
    const fragmentSource = `
        precision highp float;
        uniform float time, speed;
        uniform int mode;
        uniform vec2 resolution;
        uniform vec3 cameraPos, cameraRot;
        uniform vec3 color1, color2, color3;
        uniform vec3 params; // x, y, z: context-dependent parameters
        uniform float gridSize, fogDensity;
        varying vec2 vUv;
        
        const float PI = 3.14159265;
        const int MAX_STEPS = 90;
        const float MIN_DIST = 0.001;
        const float MAX_DIST = 80.0;
        
        // --- UTILITY & NOISE ---
        mat3 rotX(float a){float c=cos(a),s=sin(a);return mat3(1,0,0,0,c,-s,0,s,c);}
        mat3 rotY(float a){float c=cos(a),s=sin(a);return mat3(c,0,s,0,1,0,-s,0,c);}
        float hash(float n){return fract(sin(n)*43758.5453);}
        float noise(vec3 x){vec3 p=floor(x);vec3 f=fract(x);f=f*f*(3.0-2.0*f);float n=p.x+p.y*57.0+113.0*p.z;return mix(mix(mix(hash(n+0.0),hash(n+1.0),f.x),mix(hash(n+57.0),hash(n+58.0),f.x),f.y),mix(mix(hash(n+113.0),hash(n+114.0),f.x),mix(hash(n+170.0),hash(n+171.0),f.x),f.y),f.z);}

        // --- SDF (SIGNED DISTANCE FUNCTION) LIBRARY ---
        float sdSphere(vec3 p, float s){return length(p)-s;}
        float sdBox(vec3 p, vec3 b){vec3 q=abs(p)-b;return length(max(q,0.0))+min(max(q.x,max(q.y,q.z)),0.0);}
        float sdTorus(vec3 p, vec2 t){vec2 q=vec2(length(p.xz)-t.x,p.y);return length(q)-t.y;}
        float sdCylinder(vec3 p, float h, float r){vec2 d=abs(vec2(length(p.xz),p.y))-vec2(r,h);return min(max(d.x,d.y),0.0)+length(max(d,0.0));}
        float sdHexPrism(vec3 p, vec2 h){const vec3 k=vec3(-0.8660254,0.5,0.57735026);p=abs(p);p.xy-=2.0*min(dot(k.xy,p.xy),0.0)*k.xy;vec2 d=vec2(length(p.xy-vec2(clamp(p.x,-k.z*h.x,k.z*h.x),h.x))*sign(p.y-h.x),p.z-h.y);return min(max(d.x,d.y),0.0)+length(max(d,0.0));}
        
        // --- SDF OPERATORS ---
        vec3 opRep(vec3 p, vec3 c){return mod(p+0.5*c,c)-0.5*c;}
        float opSmoothUnion(float d1, float d2, float k){float h=clamp(0.5+0.5*(d2-d1)/k,0.0,1.0);return mix(d2,d1,h)-k*h*(1.0-h);}
        float opSmoothSubtraction(float d1, float d2, float k){float h=clamp(0.5-0.5*(d1+d2)/k,0.0,1.0);return mix(d1,-d2,h)+k*h*(1.0-h);}

        // --- COMPLEX SDFs ---
        float sdMengerSponge(vec3 p, float scale) {
            float d = sdBox(p, vec3(scale));
            float s = 1.0;
            for(int m=0; m<int(params.z); m++){
                vec3 a = mod(p*s, 2.0)-1.0;
                s *= 3.0;
                vec3 r = 1.0 - 3.0*abs(a);
                float c = sdBox(r, vec3(1.0))/s;
                d = max(d, -c);
            }
            return d;
        }

        float sdMandelbulb(vec3 pos, float power, float bailout) {
            vec3 z = pos;
            float dr = 1.0;
            float r = 0.0;
            for (int i = 0; i < 5; i++) {
                r = length(z);
                if (r > bailout) break;
                float theta = acos(z.z / r) * power;
                float phi = atan(z.y, z.x) * power;
                dr = pow(r, power - 1.0) * power * dr + 1.0;
                float zr = pow(r, power);
                z = zr * vec3(sin(theta) * cos(phi), sin(phi) * sin(theta), cos(theta));
                z += pos;
            }
            return 0.5 * log(r) * r / dr;
        }

        // --- MASTER SCENE SDF ---
        float sceneSDF(vec3 p) {
            if (mode == 0) return sdMengerSponge(p, params.x);
            if (mode == 1) return length(opRep(p, vec3(gridSize))) - params.x - noise(p * params.y) * 1.5;
            if (mode == 2) return opSmoothUnion(sdTorus(p.xzy, vec2(params.x, params.y)), sdCylinder(opRep(p, vec3(gridSize)), 0.1, 0.1), params.z);
            if (mode == 3) return dot(sin(p*gridSize), cos(p.zxy*gridSize)) - params.y;
            if (mode == 4) return sdBox(opRep(p, vec3(gridSize)), vec3(params.y)) - noise(p * params.x) * 0.2;
            if (mode == 5) return sdMandelbulb(p, params.x, params.y);
            if (mode == 6) return sdBox(opRep(p, vec3(gridSize)) - vec3(0, 2.5, 0), vec3(params.x, params.y, params.x)) - noise(p) * params.z;
            if (mode == 7) return sdHexPrism(opRep(p, vec3(gridSize, 100.0, gridSize*0.866)), vec2(params.x, 50.0));
            if (mode == 8) { vec3 q = opRep(p, vec3(gridSize)); return sdTorus(q, vec2(params.x, params.y)) - sin(p.y * params.z) * 0.1; }
            if (mode == 9) return p.y + noise(vec3(p.xz * params.x, 0.0)) * params.y * 2.0 - 1.0;
            if (mode == 10) return opSmoothUnion(sdSphere(p, 1.0), sdTorus(p, vec2(1.2, 0.3) + sin(time * 2.0) * 0.1), params.x);
            if (mode == 11) return sdSphere(p, 5.0) - noise(p * params.x + time) * params.y * 3.0;
            if (mode == 12) { p = rotY(time*0.2) * p; vec3 q = p; float d = 100.0; float s = params.x; for(int i=0; i<int(params.y); i++){ d = opSmoothUnion(d, sdSphere(q-vec3(s,0,0), s), 0.5); q.xzy = abs(q.xzy); q -= s; s*=0.7;} return d;}
            if (mode == 13) return min(abs(p.x)-params.x, min(abs(p.y)-params.x, abs(p.z)-params.x)) - noise(p*params.y)*0.05;
            if (mode == 14) { vec3 q = opRep(p, vec3(gridSize)); q.y -= 1.0; return opSmoothUnion(sdBox(q, vec3(2, 0.1, 2)), sdCylinder(q-vec3(0,1,0), 2.0, 0.2), 1.0);}
            if (mode == 15) return p.y + noise(vec3(p.xz * params.x + sin(time*0.5), 0.0)) * params.y * 1.5 - (sin(p.x*0.1)*cos(p.z*0.1))*3.0;
            if (mode == 16) { vec3 q = opRep(p, vec3(gridSize)); float box = sdBox(q, vec3(1.0, 0.05, 1.0)); float lines = min(sdBox(q, vec3(1.1, 0.1, 0.02)), sdBox(q, vec3(0.02, 0.1, 1.1))); return min(box, lines); }
            if (mode == 17) return opSmoothSubtraction(sdSphere(p, 1.0), sdSphere(p - vec3(sin(time), cos(time), 0.0), 1.1), params.y);
            if (mode == 18) { vec3 q = p; q.z += time * 5.0; return sdCylinder(opRep(q, vec3(gridSize)), 0.1, 0.05) - noise(p * params.x) * params.y; }
            if (mode == 19) { vec3 q = opRep(p, vec3(gridSize, 10, gridSize)); return sdSphere(q, params.x) + noise(p * 2.0) * params.y; }
            if (mode == 20) { p = rotY(time * 0.05) * p; return sdTorus(opRep(p, vec3(gridSize)), vec2(0.5, 0.1)); }
            if (mode == 21) { vec3 q = p; q.y = abs(q.y); float cyl = sdCylinder(q, 1.5, params.x); float pulse = sin(p.y - time * 2.0) * params.y; return cyl - pulse; }
            if (mode == 22) { float sph = sdSphere(p, params.x); float disp = sin(p.x*5.+time)*sin(p.y*5.+time)*sin(p.z*5.+time)*params.y; return sph + disp; }
            if (mode == 23) { vec3 q = opRep(p, vec3(gridSize)); q.y += sin(q.x + time) * 0.5; return sdBox(q, vec3(1.5, 1.5, 1.5)) + noise(p) * params.y * step(0.5, fract(p.x*0.1));}
            if (mode == 24) { float spine = sdCylinder(p.xzy, 100.0, params.x); float ribs = sdTorus(opRep(p, vec3(0, gridSize, 0)), vec2(1.0, 0.1)); return opSmoothUnion(spine, ribs, params.z); }
            if (mode == 25) { vec3 q = opRep(p, vec3(gridSize)); vec2 id = floor(p.xz / gridSize); float h = hash(id.x * 13.37 + id.y * 7.77); return sdCylinder(q - vec3(0, h * params.y * 0.5, 0), h * params.y, params.x); }
            if (mode == 26) { vec3 q = p; float tube = 100.0; for(int i=0; i<4; i++){ q.xy = abs(q.xy); q.xy -= 1.0; q = rotY(PI/params.z) * q; } tube = sdTorus(q, vec2(params.x, params.y)); return tube;}
            return 1.0;
        }

        vec3 calcNormal(vec3 p) {
            vec2 e = vec2(0.001, 0);
            return normalize(vec3(
                sceneSDF(p + e.xyy) - sceneSDF(p - e.xyy),
                sceneSDF(p + e.yxy) - sceneSDF(p - e.yxy),
                sceneSDF(p + e.yyx) - sceneSDF(p - e.yyx)
            ));
        }
        
        float calcAO(vec3 p, vec3 n) {
            float total_ao = 0.0;
            float step_dist = 0.05;
            for(int i=1; i<=5; i++){
                float dist = float(i) * step_dist;
                total_ao += (dist - sceneSDF(p + n * dist)) / pow(1.0 + dist, 2.0);
            }
            return 1.0 - clamp(total_ao * 0.5, 0.0, 1.0);
        }

        // --- RAYMARCHER & MAIN ---
        vec4 raymarch(vec3 ro, vec3 rd) {
            float dist = 0.0;
            for(int i=0; i < MAX_STEPS; i++){
                vec3 p = ro + rd * dist;
                float d = sceneSDF(p);
                if(d < MIN_DIST){
                    vec3 n = calcNormal(p);
                    float ao = calcAO(p, n);
                    vec3 lightDir = normalize(vec3(0.5, 0.8, -0.3));
                    float diffuse = max(0.2, dot(n, lightDir));
                    
                    float fresnel = pow(1.0 - max(0.0, dot(n, -rd)), 3.0);
                    vec3 surfCol = mix(color1, color2, fresnel);
                    
                    if (mode == 15) { // Volcanic Plains emissive
                        surfCol = mix(surfCol, color1, clamp(-d*200.0, 0.0, 1.0));
                    }
                     if (mode == 21) { // Oracle emissive
                        surfCol = mix(surfCol, color1, pow(abs(sin(p.y*3.0 - time*2.0)), 5.0));
                    }

                    vec3 finalColor = surfCol * diffuse * ao;
                    return vec4(finalColor, dist);
                }
                if(dist > MAX_DIST) break;
                dist += d * 0.7;
            }
            return vec4(0.0, 0.0, 0.0, MAX_DIST);
        }

        void main() {
            vec2 uv = (vUv * 2.0 - 1.0) * vec2(resolution.x / resolution.y, 1.0);
            vec3 ro = cameraPos;
            mat3 camRot = rotY(cameraRot.y) * rotX(cameraRot.x);
            vec3 rd = normalize(camRot * vec3(uv, 1.5));
            
            vec4 res = raymarch(ro,rd);
            vec3 col = res.rgb;
            float d = res.a;
            
            float fog = exp(-d * fogDensity);
            col = mix(color3, col, fog);
            
            col = pow(col, vec3(0.4545)); // Gamma correction
            col *= 1.0 - length(uv) * 0.15; // Vignette
            gl_FragColor = vec4(col, 1.0);
        }
    `;

    // =================================================================================================
    // [HYPER-OPTIMIZED WEBGL SETUP & CONTROL]
    // =================================================================================================
    function initWebGL() {
        canvas = document.getElementById('qreCanvas');
        if (!canvas) {
            canvas = document.createElement('canvas');
            canvas.id = 'qreCanvas';
        }
        canvas.style.cssText = `position:fixed;top:0;left:0;z-index:-1;width:100vw;height:100vh;background:#000;`;
        document.body.insertBefore(canvas, document.body.firstChild);

        gl = canvas.getContext('webgl', { antialias: false, powerPreference: "high-performance" });
        if (!gl) throw new Error("WebGL is not supported.");
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        gl.viewport(0, 0, canvas.width, canvas.height);
        console.log("[QRE] :: Quantum Reality Engine Initialized. GL Context Acquired.");
    }

    function createProgramAndShaders() {
        const vs = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vs, vertexSource);
        gl.compileShader(vs);

        const fs = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fs, fragmentSource);
        gl.compileShader(fs);

        if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
            console.error("SHADER COMPILATION ERROR LOG:", gl.getShaderInfoLog(fs));
            throw new Error(`Fragment shader compilation failed.`);
        }

        program = gl.createProgram();
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.linkProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error("SHADER LINKING ERROR LOG:", gl.getProgramInfoLog(program));
            throw new Error(`Shader program linking failed.`);
        }

        gl.useProgram(program);
        
        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
        const pos = gl.getAttribLocation(program, 'p');
        gl.enableVertexAttribArray(pos);
        gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
        console.log("[QRE] :: Shader Matrix Compiled and Linked. Ready for world generation.");
    }
    
    function updateInfo() {
        if (typeof document !== 'undefined') {
            infoElement = document.getElementById('phaseName');
            if (!infoElement) {
                 // Create info div if it doesn't exist for standalone script usage
                const infoContainer = document.createElement('div');
                infoContainer.style.cssText = `position: fixed; bottom: 10px; left: 10px; color: white; font-family: 'Courier New', Courier, monospace; font-size: 14px; background-color: rgba(0,0,0,0.5); padding: 8px; border-radius: 5px; text-shadow: 1px 1px 2px black; z-index: 10;`;
                infoContainer.innerHTML = `<b>[QRE]</b> <span id="phaseName">Loading...</span><br>Controls: [←][→] | [W/A/S/D] | [J] | [R]`;
                document.body.appendChild(infoContainer);
                infoElement = document.getElementById('phaseName');
            }
            if (infoElement) {
                infoElement.textContent = `[${phaseIndex}] ${phases[phaseIndex].name}`;
            }
        }
    }

    function updateCamera(deltaTime) {
        const moveSpeed = 3.0 * (keys['Shift'] ? 3.0 : 1.0);
        if (autoJourney) cameraPos[2] -= moveSpeed * deltaTime * speed;
        if (keys['w'] || keys['W']) cameraPos[2] -= moveSpeed * deltaTime;
        if (keys['s'] || keys['S']) cameraPos[2] += moveSpeed * deltaTime;
        if (keys['a'] || keys['A']) cameraPos[0] -= moveSpeed * deltaTime;
        if (keys['d'] || keys['D']) cameraPos[0] += moveSpeed * deltaTime;

        if (autoJourney && Math.floor(time / 20) !== Math.floor((time - deltaTime) / 20)) {
            phaseIndex = (phaseIndex + 1) % phases.length;
            console.log(`[QRE] :: Auto-phasing to [${phaseIndex}] ${phases[phaseIndex].name}`);
            updateInfo();
        }
    }

    let lastTimestamp = 0;
    function render(timestamp) {
        const deltaTime = Math.min(0.1, (timestamp - lastTimestamp) / 1000);
        lastTimestamp = timestamp;
        time = timestamp * 0.001;

        updateCamera(deltaTime);
        const phase = phases[phaseIndex];
        
        gl.useProgram(program);
        gl.uniform1f(gl.getUniformLocation(program, 'time'), time);
        gl.uniform1f(gl.getUniformLocation(program, 'speed'), speed);
        gl.uniform1i(gl.getUniformLocation(program, 'mode'), phaseIndex);
        gl.uniform2f(gl.getUniformLocation(program, 'resolution'), canvas.width, canvas.height);
        gl.uniform3fv(gl.getUniformLocation(program, 'cameraPos'), cameraPos);
        gl.uniform3fv(gl.getUniformLocation(program, 'cameraRot'), cameraRot);
        gl.uniform3fv(gl.getUniformLocation(program, 'color1'), phase.colors[0]);
        gl.uniform3fv(gl.getUniformLocation(program, 'color2'), phase.colors[1]);
        gl.uniform3fv(gl.getUniformLocation(program, 'color3'), phase.colors[2]);
        gl.uniform3fv(gl.getUniformLocation(program, 'params'), phase.params);
        gl.uniform1f(gl.getUniformLocation(program, 'gridSize'), phase.gridSize);
        gl.uniform1f(gl.getUniformLocation(program, 'fogDensity'), phase.fogDensity);
        
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        animationId = requestAnimationFrame(render);
    }

    window.qre = {
        switchPhase: (index) => {
            if (index >= 0 && index < phases.length) {
                phaseIndex = index;
                console.log(`[QRE] :: Manual phase shift to [${index}] ${phases[index].name}`);
                updateInfo();
            }
        },
        nextPhase: () => qre.switchPhase((phaseIndex + 1) % phases.length),
        prevPhase: () => qre.switchPhase((phaseIndex - 1 + phases.length) % phases.length),
        setSpeed: (val) => { speed = Math.max(0, Math.min(10, val)); },
        toggleAuto: () => { autoJourney = !autoJourney; console.log(`[QRE] :: Auto-Journey ${autoJourney ? 'ENABLED' : 'DISABLED'}`); },
        reset: () => { cameraPos = [0, 0, 5]; cameraRot = [0, 0, 0]; console.log("[QRE] :: Camera Origin Reset."); },
        getPhases: () => phases.map((p, i) => ({ index: i, name: p.name })),
        getCurrentPhase: () => ({ index: phaseIndex, name: phases[phaseIndex].name }),
        destroy: () => {
            if (animationId) cancelAnimationFrame(animationId);
            if (canvas) canvas.remove();
            console.log("[QRE] :: Reality Engine Terminated.");
        }
    };

    function bootstrap() {
        try {
            initWebGL();
            createProgramAndShaders();
            updateInfo();
            animationId = requestAnimationFrame(render);
            console.log("[QRE] :: Bootstrap complete. Journey has begun.");
            console.log("Use qre.nextPhase() or qre.prevPhase() to navigate realities.");
        } catch (e) {
            console.error("[QRE CRITICAL FAILURE] :: Engine bootstrap failed:", e);
        }
    }
    
    window.addEventListener('resize', () => {
        if (canvas && gl) {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            gl.viewport(0, 0, canvas.width, canvas.height);
        }
    });

    window.addEventListener('keydown', (e) => {
        keys[e.key] = true;
        if (e.key === 'ArrowRight') qre.nextPhase();
        if (e.key === 'ArrowLeft') qre.prevPhase();
        if (e.key.toLowerCase() === 'r') qre.reset();
        if (e.key.toLowerCase() === 'j') qre.toggleAuto();
    });
    
    window.addEventListener('keyup', (e) => { keys[e.key] = false; });

    if (typeof document !== 'undefined') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', bootstrap);
        } else {
            bootstrap();
        }
    } else {
        console.warn("[QRE] :: No DOM found. Bootstrap will not run automatically.");
    }
})();


