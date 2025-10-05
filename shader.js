// =================================================================================================
// [BACKROOMS EXPLORER] :: PROCEDURAL LIMINAL SPACE WALKER
// An endless journey through the uncanny yellow corridors of the Backrooms.
// =================================================================================================
(function() {
    "use strict";

    let canvas, gl, program, animationId;
    let time = 0, walkCycle = 0;
    let cameraPos = [0, 1.6, 0], cameraRot = [0, 0];
    let velocity = [0, 0], headBob = 0;
    let keys = {}, mouseMovement = { x: 0, y: 0 };
    let lastMouseX = 0, lastMouseY = 0, isPointerLocked = false;

    // =================================================================================================
    // [VERTEX SHADER]
    // =================================================================================================
    const vertexSource = `attribute vec2 p;varying vec2 vUv;void main(){vUv=p;gl_Position=vec4(p,0,1);}`;

    // =================================================================================================
    // [BACKROOMS FRAGMENT SHADER] :: 3D RAYMARCHED LIMINAL SPACES
    // =================================================================================================
    const fragmentSource = `
        precision highp float;
        uniform float time;
        uniform vec2 resolution;
        uniform vec3 cameraPos, cameraDir;
        uniform float headBob;
        varying vec2 vUv;
        
        const float PI = 3.14159265;
        const int MAX_STEPS = 128;
        const float MIN_DIST = 0.001;
        const float MAX_DIST = 100.0;
        
        // --- NOISE ---
        float hash(float n){return fract(sin(n)*43758.5453);}
        float noise(vec3 x){
            vec3 p=floor(x);
            vec3 f=fract(x);
            f=f*f*(3.0-2.0*f);
            float n=p.x+p.y*57.0+113.0*p.z;
            return mix(
                mix(mix(hash(n+0.0),hash(n+1.0),f.x),mix(hash(n+57.0),hash(n+58.0),f.x),f.y),
                mix(mix(hash(n+113.0),hash(n+114.0),f.x),mix(hash(n+170.0),hash(n+171.0),f.x),f.y),
                f.z
            );
        }
        
        // --- ROTATION MATRICES ---
        mat3 rotX(float a){float c=cos(a),s=sin(a);return mat3(1,0,0,0,c,-s,0,s,c);}
        mat3 rotY(float a){float c=cos(a),s=sin(a);return mat3(c,0,s,0,1,0,-s,0,c);}
        
        // --- SDF PRIMITIVES ---
        float box(vec3 p, vec3 b){
            vec3 q=abs(p)-b;
            return length(max(q,0.0))+min(max(q.x,max(q.y,q.z)),0.0);
        }
        
        // --- BACKROOMS SCENE ---
        float backroomsSDF(vec3 p) {
            vec3 roomSize = vec3(4.0, 3.0, 4.0);
            vec3 cellId = floor(p / roomSize);
            vec3 cellPos = mod(p, roomSize) - roomSize * 0.5;
            
            // Walls (with occasional doorways)
            float wallThickness = 0.15;
            float walls = 1e10;
            
            // Room boundaries
            float roomBox = -box(cellPos, roomSize * 0.5 - wallThickness);
            
            // Random doorways
            float doorChance = hash(cellId.x * 12.34 + cellId.z * 56.78);
            vec3 doorPos = cellPos;
            
            // North/South doors
            if (doorChance > 0.6) {
                doorPos.z = abs(cellPos.z) - roomSize.z * 0.5;
                float door = box(doorPos, vec3(1.0, 2.0, wallThickness * 2.0));
                roomBox = max(roomBox, -door);
            }
            
            // East/West doors
            doorChance = hash(cellId.x * 78.90 + cellId.z * 12.34);
            doorPos = cellPos;
            if (doorChance > 0.6) {
                doorPos.x = abs(cellPos.x) - roomSize.x * 0.5;
                float door = box(doorPos, vec3(wallThickness * 2.0, 2.0, 1.0));
                roomBox = max(roomBox, -door);
            }
            
            walls = roomBox;
            
            // Floor
            float floor = cellPos.y + roomSize.y * 0.5;
            
            // Ceiling
            float ceiling = -cellPos.y + roomSize.y * 0.5;
            
            // Ceiling lights (recessed)
            vec3 lightPos = cellPos;
            lightPos.xz = mod(lightPos.xz + roomSize.xz * 0.25, roomSize.xz * 0.5) - roomSize.xz * 0.25;
            float light = box(lightPos - vec3(0, roomSize.y * 0.5 - 0.1, 0), vec3(0.8, 0.05, 0.4));
            
            // Occasional pillars
            float pillarChance = hash(cellId.x * 34.56 + cellId.z * 78.90);
            float pillars = 1e10;
            if (pillarChance > 0.85) {
                vec3 pillarPos = cellPos;
                pillarPos.xz = abs(pillarPos.xz) - roomSize.xz * 0.3;
                pillars = box(pillarPos, vec3(0.2, roomSize.y * 0.5, 0.2));
            }
            
            return min(min(min(walls, floor), ceiling), min(light, pillars));
        }
        
        // --- MATERIAL ID ---
        int getMaterial(vec3 p) {
            vec3 roomSize = vec3(4.0, 3.0, 4.0);
            vec3 cellPos = mod(p, roomSize) - roomSize * 0.5;
            
            // Floor
            if (abs(cellPos.y + roomSize.y * 0.5) < 0.01) return 1;
            
            // Ceiling lights
            vec3 lightPos = cellPos;
            lightPos.xz = mod(lightPos.xz + roomSize.xz * 0.25, roomSize.xz * 0.5) - roomSize.xz * 0.25;
            if (length(lightPos.xz) < 0.9 && abs(cellPos.y - roomSize.y * 0.5) < 0.15) return 2;
            
            // Ceiling
            if (abs(cellPos.y - roomSize.y * 0.5) < 0.01) return 3;
            
            // Walls (default)
            return 0;
        }
        
        // --- RAYMARCHER ---
        vec3 getNormal(vec3 p) {
            vec2 e = vec2(0.001, 0);
            float d = backroomsSDF(p);
            return normalize(vec3(
                d - backroomsSDF(p - e.xyy),
                d - backroomsSDF(p - e.yxy),
                d - backroomsSDF(p - e.yyx)
            ));
        }
        
        vec4 raymarch(vec3 ro, vec3 rd) {
            float dist = 0.0;
            vec3 p;
            
            for(int i = 0; i < MAX_STEPS; i++) {
                p = ro + rd * dist;
                float d = backroomsSDF(p);
                
                if (d < MIN_DIST) {
                    vec3 normal = getNormal(p);
                    int mat = getMaterial(p);
                    vec3 col = vec3(0.8, 0.75, 0.5); // Yellow wallpaper
                    
                    // Floor (carpet texture)
                    if (mat == 1) {
                        float pattern = noise(p * 20.0);
                        col = mix(vec3(0.6, 0.55, 0.4), vec3(0.5, 0.45, 0.3), pattern);
                    }
                    // Ceiling lights
                    else if (mat == 2) {
                        col = vec3(1.0, 0.95, 0.8) * 3.0;
                    }
                    // Ceiling
                    else if (mat == 3) {
                        float tiles = step(0.95, fract(p.x * 2.0)) + step(0.95, fract(p.z * 2.0));
                        col = mix(vec3(0.85, 0.85, 0.85), vec3(0.7, 0.7, 0.7), tiles);
                    }
                    // Walls (with subtle texture)
                    else {
                        float wallNoise = noise(p * 10.0) * 0.1;
                        float stains = smoothstep(0.6, 0.7, noise(p * 3.0)) * 0.2;
                        col = vec3(0.8, 0.75, 0.5) * (1.0 - stains) + wallNoise;
                    }
                    
                    // Lighting
                    float lightDist = 1e10;
                    vec3 roomSize = vec3(4.0, 3.0, 4.0);
                    vec3 cellId = floor(p / roomSize);
                    vec3 lightCenter = (cellId + 0.5) * roomSize;
                    lightCenter.y = roomSize.y - 0.1;
                    lightDist = length(p - lightCenter);
                    
                    float light = max(0.0, dot(normal, normalize(lightCenter - p)));
                    float ambient = 0.3;
                    float diffuse = light * (1.0 / (1.0 + lightDist * lightDist * 0.1));
                    
                    col *= ambient + diffuse;
                    
                    return vec4(col, dist);
                }
                
                if (dist > MAX_DIST) break;
                dist += d * 0.8;
            }
            
            return vec4(0.0, 0.0, 0.0, MAX_DIST);
        }
        
        void main() {
            vec2 uv = (vUv * 2.0 - 1.0) * vec2(resolution.x / resolution.y, 1.0);
            
            // Apply head bob
            uv.y += headBob * 0.02;
            
            vec3 ro = cameraPos;
            vec3 forward = normalize(cameraDir);
            vec3 right = normalize(cross(forward, vec3(0, 1, 0)));
            vec3 up = cross(right, forward);
            
            vec3 rd = normalize(forward + right * uv.x + up * uv.y);
            
            vec4 res = raymarch(ro, rd);
            vec3 col = res.rgb;
            float dist = res.a;
            
            // Atmospheric fog
            float fog = exp(-dist * 0.015);
            vec3 fogColor = vec3(0.7, 0.65, 0.45);
            col = mix(fogColor, col, fog);
            
            // Vignette
            col *= 1.0 - length(vUv - 0.5) * 0.3;
            
            // Slight film grain
            col += (noise(vec3(vUv * 100.0, time)) - 0.5) * 0.02;
            
            // Color grading
            col = pow(col, vec3(0.9));
            
            gl_FragColor = vec4(col, 1.0);
        }
    `;

    // =================================================================================================
    // [WEBGL INITIALIZATION]
    // =================================================================================================
    function initWebGL() {
        canvas = document.createElement('canvas');
        canvas.id = 'backroomsCanvas';
        canvas.style.cssText = `position:fixed;top:0;left:0;width:100vw;height:100vh;background:#000;cursor:none;`;
        document.body.appendChild(canvas);
        
        gl = canvas.getContext('webgl', { antialias: false, powerPreference: "high-performance" });
        if (!gl) throw new Error("WebGL not supported");
        
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        gl.viewport(0, 0, canvas.width, canvas.height);
        
        console.log("[BACKROOMS] :: You've entered the Backrooms. Use WASD to move, mouse to look.");
    }

    function createShaders() {
        const vs = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vs, vertexSource);
        gl.compileShader(vs);

        const fs = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fs, fragmentSource);
        gl.compileShader(fs);

        if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
            console.error("Shader error:", gl.getShaderInfoLog(fs));
            throw new Error("Fragment shader compilation failed");
        }

        program = gl.createProgram();
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.linkProgram(program);
        gl.useProgram(program);
        
        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
        const pos = gl.getAttribLocation(program, 'p');
        gl.enableVertexAttribArray(pos);
        gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
    }

    // =================================================================================================
    // [PLAYER CONTROLLER]
    // =================================================================================================
    function updatePlayer(dt) {
        const moveSpeed = 3.0;
        const lookSpeed = 0.002;
        
        // Mouse look
        cameraRot[0] = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, cameraRot[0] - mouseMovement.y * lookSpeed));
        cameraRot[1] += mouseMovement.x * lookSpeed;
        mouseMovement.x = 0;
        mouseMovement.y = 0;
        
        // Movement
        let moveX = 0, moveZ = 0;
        if (keys['w'] || keys['W']) moveZ += 1;
        if (keys['s'] || keys['S']) moveZ -= 1;
        if (keys['a'] || keys['A']) moveX -= 1;
        if (keys['d'] || keys['D']) moveX += 1;
        
        // Apply movement relative to camera direction
        const forward = [Math.sin(cameraRot[1]), 0, Math.cos(cameraRot[1])];
        const right = [Math.cos(cameraRot[1]), 0, -Math.sin(cameraRot[1])];
        
        velocity[0] = (forward[0] * moveZ + right[0] * moveX) * moveSpeed;
        velocity[1] = (forward[2] * moveZ + right[2] * moveX) * moveSpeed;
        
        cameraPos[0] += velocity[0] * dt;
        cameraPos[2] += velocity[1] * dt;
        
        // Walking animation (head bob)
        const isMoving = Math.abs(velocity[0]) > 0.1 || Math.abs(velocity[1]) > 0.1;
        if (isMoving) {
            walkCycle += dt * 8.0;
            headBob = Math.sin(walkCycle) * 0.05;
        } else {
            headBob *= 0.9;
        }
    }

    // =================================================================================================
    // [RENDER LOOP]
    // =================================================================================================
    let lastTime = 0;
    function render(timestamp) {
        const dt = Math.min((timestamp - lastTime) / 1000, 0.1);
        lastTime = timestamp;
        time = timestamp * 0.001;
        
        updatePlayer(dt);
        
        // Calculate camera direction from rotation
        const pitch = cameraRot[0];
        const yaw = cameraRot[1];
        const cameraDir = [
            Math.cos(pitch) * Math.sin(yaw),
            Math.sin(pitch),
            Math.cos(pitch) * Math.cos(yaw)
        ];
        
        gl.uniform1f(gl.getUniformLocation(program, 'time'), time);
        gl.uniform2f(gl.getUniformLocation(program, 'resolution'), canvas.width, canvas.height);
        gl.uniform3fv(gl.getUniformLocation(program, 'cameraPos'), cameraPos);
        gl.uniform3fv(gl.getUniformLocation(program, 'cameraDir'), cameraDir);
        gl.uniform1f(gl.getUniformLocation(program, 'headBob'), headBob);
        
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        animationId = requestAnimationFrame(render);
    }

    // =================================================================================================
    // [EVENT HANDLERS]
    // =================================================================================================
    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        gl.viewport(0, 0, canvas.width, canvas.height);
    });

    window.addEventListener('keydown', (e) => {
        keys[e.key] = true;
    });
    
    window.addEventListener('keyup', (e) => {
        keys[e.key] = false;
    });
    
    canvas.addEventListener('click', () => {
        canvas.requestPointerLock();
    });
    
    document.addEventListener('pointerlockchange', () => {
        isPointerLocked = document.pointerLockElement === canvas;
    });
    
    window.addEventListener('mousemove', (e) => {
        if (isPointerLocked) {
            mouseMovement.x += e.movementX;
            mouseMovement.y += e.movementY;
        }
    });

    // =================================================================================================
    // [BOOTSTRAP]
    // =================================================================================================
    function bootstrap() {
        try {
            initWebGL();
            createShaders();
            animationId = requestAnimationFrame(render);
            console.log("[BACKROOMS] :: Click to lock pointer and start exploring.");
        } catch (e) {
            console.error("[BACKROOMS] :: Initialization failed:", e);
        }
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootstrap);
    } else {
        bootstrap();
    }

    // =================================================================================================
    // [PUBLIC API]
    // =================================================================================================
    window.backrooms = {
        teleport: (x, y, z) => {
            cameraPos = [x, y, z];
            console.log(`[BACKROOMS] :: Teleported to ${x}, ${y}, ${z}`);
        },
        destroy: () => {
            if (animationId) cancelAnimationFrame(animationId);
            if (canvas) canvas.remove();
            document.exitPointerLock();
            console.log("[BACKROOMS] :: You've escaped... for now.");
        }
    };
})();

