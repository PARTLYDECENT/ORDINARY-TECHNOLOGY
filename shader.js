// =================================================================================================
// [QUANTUM REALITY ENGINE] :: MULTI-PHASE PROCEDURAL WORLD SHADER - IIFE SCRIPT
// A journey through 26 uncanny, procedurally generated digital landscapes.
// =================================================================================================
(function() {
    "use strict";

    let canvas, gl, program, animationId;
    let time = 0, phaseIndex = 0, speed = 1.0;
    let cameraPos = [0, 0, 0], cameraRot = [0, 0, 0];
    let keys = {}, autoJourney = true;

    // =================================================================================================
    // [PHASE DEFINITIONS] :: 26 Unique Procedural Realities
    // =================================================================================================
    const phases = [
        { name: "Cyber Tunnels", colors: [[0.0,1.0,1.0], [0.0,0.5,1.0], [1.0,0.0,1.0]], params: [1.0, 0.8, 0.3], gridSize: 2.0, fogDensity: 0.02 },
        { name: "Neon Underground", colors: [[1.0,0.2,0.8], [0.2,1.0,0.3], [1.0,0.8,0.0]], params: [1.5, 0.6, 0.5], gridSize: 1.5, fogDensity: 0.025 },
        { name: "Data Highways", colors: [[0.1,0.8,0.1], [0.0,1.0,0.5], [0.5,0.5,1.0]], params: [0.8, 1.0, 0.2], gridSize: 3.0, fogDensity: 0.015 },
        { name: "Ghost Protocol", colors: [[0.8,0.8,1.0], [0.3,0.3,0.6], [1.0,0.9,0.7]], params: [2.0, 0.4, 0.7], gridSize: 1.2, fogDensity: 0.03 },
        { name: "Neural Pathways", colors: [[1.0,0.3,0.0], [0.8,0.0,0.8], [0.0,0.6,1.0]], params: [1.2, 0.9, 0.4], gridSize: 2.5, fogDensity: 0.02 },
        { name: "Quantum Foam", colors: [[0.5,1.0,0.8], [1.0,0.5,1.0], [0.8,1.0,0.5]], params: [0.5, 2.0, 1.5], gridSize: 0.8, fogDensity: 0.05 },
        { name: "Aetheric Weave", colors: [[1.0,0.7,0.3], [0.5,0.8,1.0], [1.0,0.4,0.6]], params: [3.0, 0.1, 0.9], gridSize: 4.0, fogDensity: 0.01 },
        { name: "Mainframe Collapse", colors: [[1.0,0.1,0.1], [0.8,0.8,0.8], [0.2,1.0,0.2]], params: [1.0, 1.0, 1.0], gridSize: 2.2, fogDensity: 0.02 },
        { name: "Event Horizon", colors: [[0.1,0.1,0.1], [1.0,0.5,0.0], [0.8,0.0,0.0]], params: [5.0, 0.9, 0.0], gridSize: 10.0, fogDensity: 0.005 },
        { name: "Starlight Cathedral", colors: [[0.9,0.9,1.0], [0.4,0.6,1.0], [1.0,0.8,0.6]], params: [0.3, 5.0, 0.5], gridSize: 6.0, fogDensity: 0.012 },
        { name: "Mandelbrot Maze", colors: [[0.3,1.0,0.5], [1.0,0.3,0.8], [0.8,1.0,0.2]], params: [2.0, 8.0, 0.1], gridSize: 1.0, fogDensity: 0.04 },
        { name: "Subspace Anomaly", colors: [[0.8,0.2,1.0], [0.2,1.0,0.8], [1.0,1.0,0.2]], params: [0.7, 0.7, 0.7], gridSize: 3.5, fogDensity: 0.02 },
        { name: "Crystal Spires", colors: [[0.4,0.8,1.0], [1.0,0.9,1.0], [0.8,0.6,1.0]], params: [0.1, 0.9, 0.4], gridSize: 2.8, fogDensity: 0.018 },
        { name: "The Singularity", colors: [[1.0,1.0,1.0], [0.5,0.5,0.5], [0.0,0.0,0.0]], params: [0.1, 0.1, 0.1], gridSize: 0.5, fogDensity: 0.08 },
        { name: "Abyssal Trench", colors: [[0.0,0.1,0.3], [0.1,0.5,0.8], [0.5,1.0,1.0]], params: [4.0, 0.2, 1.0], gridSize: 5.0, fogDensity: 0.03 },
        { name: "Circuit Board City", colors: [[0.2,0.8,0.2], [0.9,0.9,0.1], [0.7,0.7,0.7]], params: [0.05, 1.5, 0.8], gridSize: 1.8, fogDensity: 0.022 },
        { name: "Plasma Conduits", colors: [[1.0,0.5,0.0], [1.0,0.1,0.5], [1.0,0.8,0.2]], params: [0.4, 0.8, 0.2], gridSize: 2.0, fogDensity: 0.025 },
        { name: "Warpspace Current", colors: [[0.5,0.0,1.0], [1.0,0.2,0.5], [0.0,0.8,1.0]], params: [0.2, 0.5, 0.9], gridSize: 1.0, fogDensity: 0.03 },
        { name: "Genesis Bloom", colors: [[0.2,1.0,0.3], [1.0,0.6,0.8], [0.9,1.0,0.5]], params: [1.5, 0.6, 0.4], gridSize: 4.0, fogDensity: 0.015 },
        { name: "Glacial Fortress", colors: [[0.7,0.9,1.0], [0.9,0.95,1.0], [0.4,0.6,0.8]], params: [0.8, 0.3, 0.2], gridSize: 3.2, fogDensity: 0.01 },
        { name: "Chronos Antechamber", colors: [[0.9,0.8,0.5], [0.5,0.4,0.2], [1.0,1.0,0.9]], params: [0.5, 1.2, 0.8], gridSize: 5.0, fogDensity: 0.018 },
        { name: "Void Lattice", colors: [[0.2,0.0,0.3], [0.8,0.2,1.0], [1.0,1.0,1.0]], params: [0.02, 2.0, 1.0], gridSize: 2.5, fogDensity: 0.02 },
        { name: "Redwood Glitch", colors: [[0.5,0.2,0.1], [0.1,0.6,0.2], [1.0,0.8,0.3]], params: [0.8, 0.8, 0.8], gridSize: 3.0, fogDensity: 0.015 },
        { name: "Hellscape Grid", colors: [[0.8,0.1,0.0], [1.0,0.4,0.0], [0.3,0.0,0.0]], params: [0.3, 0.9, 0.6], gridSize: 1.5, fogDensity: 0.03 },
        { name: "Logic Gates", colors: [[1.0,0.6,0.0], [0.0,0.8,1.0], [0.9,0.9,0.9]], params: [0.1, 0.5, 1.0], gridSize: 2.0, fogDensity: 0.01 },
        { name: "Elysian Fields", colors: [[1.0,0.9,0.8], [0.8,1.0,0.9], [0.9,0.8,1.0]], params: [10.0, 0.2, 0.5], gridSize: 10.0, fogDensity: 0.008 }
    ];

    // =================================================================================================
    // [OPTIMIZED VERTEX SHADER] (FIXED)
    // =================================================================================================
    const vertexSource = `attribute vec2 p;varying vec2 vUv;void main(){vUv=p;gl_Position=vec4(p,0,1);}`;

    // =================================================================================================
    // [EXPANDED FRAGMENT SHADER] :: PROCEDURAL WORLD GENERATOR
    // =================================================================================================
    const fragmentSource = `
        precision highp float;
        uniform float time, speed;
        uniform int mode;
        uniform vec2 resolution;
        uniform vec3 cameraPos, cameraRot;
        uniform vec3 color1, color2, color3;
        uniform vec3 params; // x: frequency/scale, y: amplitude/power, z: detail/twist
        uniform float gridSize, fogDensity;
        varying vec2 vUv;
        
        const float PI = 3.14159265;
        const int MAX_STEPS = 90;
        const float MIN_DIST = 0.001;
        const float MAX_DIST = 120.0;
        
        // --- UTILITY FUNCTIONS ---
        mat3 rotX(float a){float c=cos(a),s=sin(a);return mat3(1,0,0,0,c,-s,0,s,c);}
        mat3 rotY(float a){float c=cos(a),s=sin(a);return mat3(c,0,s,0,1,0,-s,0,c);}
        float hash(float n){return fract(sin(n)*43758.5453);}
        float noise(vec3 x){vec3 p=floor(x);vec3 f=fract(x);f=f*f*(3.0-2.0*f);float n=p.x+p.y*57.0+113.0*p.z;return mix(mix(mix(hash(n+0.0),hash(n+1.0),f.x),mix(hash(n+57.0),hash(n+58.0),f.x),f.y),mix(mix(hash(n+113.0),hash(n+114.0),f.x),mix(hash(n+170.0),hash(n+171.0),f.x),f.y),f.z);}

        // --- SDF (SIGNED DISTANCE FUNCTION) LIBRARY ---
        float sphere(vec3 p, float s){return length(p)-s;}
        float box(vec3 p, vec3 b){vec3 q=abs(p)-b;return length(max(q,0.0))+min(max(q.x,max(q.y,q.z)),0.0);}
        float cylinder(vec3 p, float h, float r){vec2 d=abs(vec2(length(p.xz),p.y))-vec2(r,h);return min(max(d.x,d.y),0.0)+length(max(d,0.0));}
        float opSmoothUnion(float d1, float d2, float k){float h=clamp(0.5+0.5*(d2-d1)/k,0.0,1.0);return mix(d2,d1,h)-k*h*(1.0-h);}

        // --- MASTER SCENE SDF ---
        float sceneSDF(vec3 p) {
            vec3 q;
            // Base worlds (0-4)
            if (mode < 5) {
                if(mode==0) return max(-(length(p.xy)-3.0-sin(p.z*0.1+time)*0.5),min(abs(mod(p.x,gridSize)-gridSize*0.5)-0.05,abs(mod(p.y,gridSize)-gridSize*0.5)-0.05));
                if(mode==1) return max(max(abs(p.x)-2.0,abs(p.y)-1.5),min(abs(mod(p.x,gridSize*0.5)-gridSize*0.25)-0.02,abs(mod(p.z,gridSize*0.3)-gridSize*0.15)-0.02));
                if(mode==2) return max(abs(p.y)-0.1,min(abs(mod(p.x+gridSize*0.5,gridSize)-gridSize*0.5)-0.05,abs(mod(p.z,gridSize*0.2)-gridSize*0.1)-0.02));
                if(mode==3) return max(abs(p.y+1.0)-0.1,-length(mod(p.xz,gridSize)-gridSize*0.5)+gridSize*0.3);
                if(mode==4) { q=p; q.x+=sin(p.z*0.2+time)*0.8; q.y+=cos(p.z*0.15+time*0.7)*0.6; return max(length(q.xy)-2.5,abs(mod(p.z+time*speed,gridSize)-gridSize*0.5)-0.1); }
            }
            // Expanded worlds (5-25)
            q=p; q.z+=time*speed*2.0;
            if(mode==5) return opSmoothUnion(sphere(p,params.y),noise(p*params.x)*gridSize-0.1,params.z);
            if(mode==6) { q=abs(sin(q*0.1*params.x)); return max(max(q.x,q.y),q.z)-params.y*0.1; }
            if(mode==7) { float block=box(mod(p,gridSize)-gridSize*0.5,vec3(0.5)); float glitch=noise(p*params.x+time); return block-glitch*params.y*(step(0.5,fract(time*0.5)));}
            if(mode==8) { float disc=length(p.xy)-gridSize; float hole=sphere(p,params.x); return max(disc,-hole); }
            if(mode==9) return min(abs(p.y)-params.y,length(p.xz)-abs(sin(p.y*0.1*params.x))*gridSize-0.2);
            if(mode==10){vec2 id=floor(p.xz);vec3 z=vec3(p.x,p.y,p.z); z.xy=abs(z.xy)-params.y; z.x+=sin(time+id.x)*0.2; return box(z,vec3(0.2,1.0,0.2));}
            if(mode==11){ p = rotY(p.z*0.1*params.z) * p; return max(-(length(p.xy)-gridSize),noise(p*params.x)*params.y-1.0); }
            if(mode==12){ q = rotY(q.y*params.z) * p; return cylinder(mod(q,gridSize)-gridSize/2.,params.y,abs(sin(q.y*params.x))*0.5+0.05); }
            if(mode==13){return length(p.xy)-params.x-sin(atan(p.y,p.x)*10.0+p.z*0.5)*0.1;}
            if(mode==14){return max(abs(p.y)-gridSize,-cylinder(p,params.x,0.1));}
            if(mode==15){float wall=box(p,vec3(gridSize,10.0,gridSize))-0.1;float path=box(p,vec3(0.5,10.1,gridSize*1.1));return max(wall,-path);}
            if(mode==16){return length(p.xy)-params.x-noise(p*vec3(1,1,5))*params.y;}
            if(mode==17){float d=length(p.xy)-1.0;d=abs(d)-0.2;d=abs(d)-0.05; return d-noise(p*params.x+time*2.)*params.y;}
            if(mode==18){float sph=sphere(mod(p,gridSize)-gridSize*0.5,gridSize*0.4); float outer=sphere(p,params.y); return max(-outer,sph); }
            if(mode==19){vec2 id=floor(p.xz);float h=hash(id.x*13.37+id.y*7.77);return box(p-vec3(0,h*params.y,0),vec3(params.x,h*params.y+0.1,params.z));}
            if(mode==20){return box(p, vec3(params.x,params.x,100.0)) - noise(p * gridSize) * params.y;}
            if(mode==21){return min(length(mod(p.xy,gridSize)-gridSize*0.5)-0.1,length(mod(p.yz,gridSize)-gridSize*0.5)-0.1);}
            if(mode==22){float plane=p.y;float columns=cylinder(mod(p,gridSize)-gridSize*0.5,10.0,0.2);float glitch=box(p,vec3(5.0))-step(0.5,noise(p*10.0+time));return opSmoothUnion(plane,min(columns,glitch),2.0);}
            if(mode==23){float plane=p.y;float spikes=p.y+noise(vec3(p.x, 0.0, p.z)*params.x)*params.y;return max(plane,-spikes);}
            if(mode==24){float x=abs(mod(p.x,gridSize)-gridSize/2.)-params.x;float y=abs(mod(p.y,gridSize)-gridSize/2.)-params.x;float z=abs(mod(p.z,gridSize)-gridSize/2.)-params.x;return min(min(x,y),z);}
            if(mode==25){float plane=p.y-sin(p.x*params.x)*cos(p.z*params.x)*params.y;return plane;}
            return 1.0;
        }

        // --- RAYMARCHER & MAIN ---
        vec4 raymarch(vec3 ro, vec3 rd) {
            float dist=0.0;
            for(int i=0;i<MAX_STEPS;i++){
                vec3 p=ro+rd*dist;
                float d=sceneSDF(p);
                if(d<MIN_DIST){
                    vec2 e=vec2(0.001,0);
                    vec3 n=normalize(vec3(d-sceneSDF(p-e.xyy),d-sceneSDF(p-e.yxy),d-sceneSDF(p-e.yyx)));
                    float l=max(0.2,dot(n,normalize(vec3(1,1,-1))));
                    float fr=pow(1.0-max(0.0,dot(n,-rd)),3.0);
                    vec3 surfCol=mix(color1,color2,fr);
                    if(mode==7||mode==22) surfCol=mix(surfCol,color3,step(0.5,fract(time*0.5)));
                    return vec4(surfCol*l,dist);
                }
                if(dist>MAX_DIST) break;
                dist+=d*0.7;
            }
            return vec4(0.0,0.0,0.0,MAX_DIST);
        }

        void main() {
            vec2 uv = (vUv*2.0-1.0)*vec2(resolution.x/resolution.y,1.0);
            vec3 ro = cameraPos;
            mat3 camRot = rotY(cameraRot.y)*rotX(cameraRot.x);
            vec3 rd = normalize(camRot*vec3(uv,1.5));
            
            vec4 res = raymarch(ro,rd);
            vec3 col = res.rgb;
            float d = res.a;
            
            float fog = exp(-d*fogDensity);
            vec3 fogColor = mix(color3*0.1,color1*0.2,sin(time*0.5)*0.5+0.5);
            col=mix(fogColor,col,fog);
            
            // --- POST-FX ---
            if(mode==2)col+=noise(vec3(vUv*10.0,time*5.0))*exp(-d*0.05)*color3*0.15;
            if(mode==7)col.r+=noise(vec3(vUv*50.,time))*0.1;
            if(mode==11)col+=abs(sin(d*0.1-time*3.0))*color3*0.2;
            if(mode==17)col+=pow(1.0-length(uv),5.0)*color1;
            if(mode==23)col.g+=sin(vUv.y*100.+time)*0.05*step(0.5,fract(time));

            col = pow(col,vec3(0.8));
            col *= 1.0 - length(uv)*0.1;
            gl_FragColor = vec4(col,1.0);
        }
    `;

    // =================================================================================================
    // [HYPER-OPTIMIZED WEBGL SETUP]
    // =================================================================================================
    function initWebGL() {
        canvas = document.createElement('canvas');
        canvas.id = 'qreCanvas';
        canvas.style.cssText = `position:fixed;top:0;left:0;z-index:-1;width:100vw;height:100vh;background:#000;`;
        document.body.appendChild(canvas);
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

    // =================================================================================================
    // [CAMERA DYNAMICS & JOURNEY LOGIC]
    // =================================================================================================
    function updateCamera(deltaTime) {
        const moveSpeed = 3.0 * speed;
        if (autoJourney) cameraPos[2] += moveSpeed * deltaTime;
        if (keys['w'] || keys['W']) cameraPos[1] += moveSpeed * deltaTime;
        if (keys['s'] || keys['S']) cameraPos[1] -= moveSpeed * deltaTime;
        if (keys['a'] || keys['A']) cameraPos[0] -= moveSpeed * deltaTime;
        if (keys['d'] || keys['D']) cameraPos[0] += moveSpeed * deltaTime;
        speed = keys[' '] ? 3.0 : 1.0;
        cameraRot[0] = Math.sin(time * 0.3) * 0.05;
        cameraRot[1] = Math.cos(time * 0.2) * 0.1;
        if (autoJourney && Math.floor(time / 15) !== Math.floor((time - deltaTime) / 15)) {
            phaseIndex = (phaseIndex + 1) % phases.length;
            console.log(`[QRE] :: Auto-phasing to [${phaseIndex}] ${phases[phaseIndex].name}`);
        }
    }

    // =================================================================================================
    // [RENDER CORE] :: MAX PERFORMANCE LOOP
    // =================================================================================================
    let lastTimestamp = 0;
    function render(timestamp) {
        const deltaTime = (timestamp - lastTimestamp) / 1000;
        lastTimestamp = timestamp;
        time = timestamp * 0.001;
        updateCamera(deltaTime);
        const phase = phases[phaseIndex];
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

    // =================================================================================================
    // [QRE CONTROL API] :: REALITY MANIPULATION INTERFACE
    // =================================================================================================
    window.qre = {
        switchPhase: (index) => {
            if (index >= 0 && index < phases.length) {
                phaseIndex = index;
                console.log(`[QRE] :: Manual phase shift to [${index}] ${phases[index].name}`);
            }
        },
        nextPhase: () => qre.switchPhase((phaseIndex + 1) % phases.length),
        prevPhase: () => qre.switchPhase((phaseIndex - 1 + phases.length) % phases.length),
        setSpeed: (val) => { speed = Math.max(0, Math.min(10, val)); },
        toggleAuto: () => { autoJourney = !autoJourney; console.log(`[QRE] :: Auto-Journey ${autoJourney ? 'ENABLED' : 'DISABLED'}`); },
        reset: () => { cameraPos = [0, 0, 0]; cameraRot = [0, 0, 0]; console.log("[QRE] :: Camera Origin Reset."); },
        getPhases: () => phases.map((p, i) => ({ index: i, name: p.name })),
        getCurrentPhase: () => ({ index: phaseIndex, name: phases[phaseIndex].name }),
        destroy: () => {
            if (animationId) cancelAnimationFrame(animationId);
            if (canvas) canvas.remove();
            console.log("[QRE] :: Reality Engine Terminated.");
        }
    };

    // =================================================================================================
    // [SYSTEM BOOTSTRAP & EVENT HOOKS]
    // =================================================================================================
    function bootstrap() {
        try {
            initWebGL();
            createProgramAndShaders();
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

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootstrap);
    } else {
        bootstrap();
    }
})();


