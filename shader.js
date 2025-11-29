// [QUANTUM REALITY ENGINE] :: CALM 3D WORLD SHADER
// A soothing, atmospheric 3D landscape generator.

(function () {
    "use strict";

    let canvas, gl, program, animationId;
    let time = 0;
    let cameraPos = [0, 2, 0]; // Start slightly above ground
    let speed = 0.2; // Very slow, calming speed

    // --- VERTEX SHADER ---
    const vertexSource = `attribute vec2 p;varying vec2 vUv;void main(){vUv=p;gl_Position=vec4(p,0,1);}`;

    // --- FRAGMENT SHADER ---
    const fragmentSource = `
precision highp float;
uniform float time;
uniform vec2 resolution;
uniform vec3 cameraPos;

const int MAX_STEPS = 100;
const float MIN_DIST = 0.001;
const float MAX_DIST = 50.0;

// --- NOISE FUNCTIONS ---
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

// --- FBM (Fractal Brownian Motion) for Terrain ---
float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
    for (int i = 0; i < 5; i++) {
        v += a * noise(p);
        p = rot * p * 2.0 + vec2(1.3);
        a *= 0.5;
    }
    return v;
}

// --- SCENE SDF ---
float sceneSDF(vec3 p) {
    // Terrain height based on FBM
    float h = fbm(p.xz * 0.1 + vec2(time * 0.05, 0.0)) * 4.0; 
    // Add some rolling hills
    h += sin(p.x * 0.2) * 0.5 + cos(p.z * 0.3) * 0.5;
    
    return p.y + 1.0 - h; // Plane at y = -1 distorted by height
}

// --- RAYMARCHING ---
float raymarch(vec3 ro, vec3 rd) {
    float d = 0.0;
    for (int i = 0; i < MAX_STEPS; i++) {
        vec3 p = ro + rd * d;
        float h = sceneSDF(p);
        if (h < MIN_DIST) return d;
        if (d > MAX_DIST) break;
        d += h * 0.5; // Slower step for better quality on terrain
    }
    return MAX_DIST;
}

// --- NORMALS ---
vec3 calcNormal(vec3 p) {
    vec2 e = vec2(0.01, 0.0);
    return normalize(vec3(
        sceneSDF(p + e.xyy) - sceneSDF(p - e.xyy),
        sceneSDF(p + e.yxy) - sceneSDF(p - e.yxy),
        sceneSDF(p + e.yyx) - sceneSDF(p - e.yyx)
    ));
}

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * resolution.xy) / resolution.y;
    
    // Camera Setup
    vec3 ro = cameraPos + vec3(0.0, 0.0, -time * 0.5); // Move forward slowly
    vec3 lookAt = ro + vec3(0.0, -0.2, -1.0);
    vec3 f = normalize(lookAt - ro);
    vec3 r = normalize(cross(vec3(0.0, 1.0, 0.0), f));
    vec3 u = cross(f, r);
    vec3 rd = normalize(f + uv.x * r + uv.y * u);

    // Render
    float d = raymarch(ro, rd);
    
    // Sky / Background Color (Soft Gradient)
    vec3 col = mix(vec3(0.05, 0.1, 0.2), vec3(0.1, 0.05, 0.15), uv.y + 0.5);
    
    if (d < MAX_DIST) {
        vec3 p = ro + rd * d;
        vec3 n = calcNormal(p);
        
        // Lighting
        vec3 lightDir = normalize(vec3(0.5, 0.8, -0.5));
        float diff = max(dot(n, lightDir), 0.0);
        float amb = 0.2;
        
        // Terrain Color (Procedural grid/lines for "digital" feel but calm)
        vec3 terrainCol = vec3(0.1, 0.15, 0.25);
        
        // Grid lines
        float grid = smoothstep(0.95, 1.0, max(sin(p.x * 2.0), sin(p.z * 2.0)));
        terrainCol += vec3(0.0, 0.8, 1.0) * grid * 0.3; // Cyan glowing grid
        
        col = terrainCol * (diff + amb);
        
        // Fog (Atmospheric Depth)
        float fog = 1.0 - exp(-d * 0.08);
        vec3 fogCol = vec3(0.05, 0.08, 0.15);
        col = mix(col, fogCol, fog);
    }

    // Vignette
    col *= 1.0 - length(uv) * 0.3;

    gl_FragColor = vec4(col, 1.0);
}
`;

    // --- WEBGL SETUP ---
    function initWebGL() {
        // Try to find existing canvas first
        canvas = document.getElementById('webglCanvas') || document.getElementById('qreCanvas');

        if (!canvas) {
            canvas = document.createElement('canvas');
            canvas.id = 'webglCanvas';
            document.body.insertBefore(canvas, document.body.firstChild);
        }

        canvas.style.cssText = `position:fixed;top:0;left:0;z-index:-2;width:100vw;height:100vh;background:#000;`;
        gl = canvas.getContext('webgl');

        if (!gl) throw new Error("WebGL is not supported.");

        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        gl.viewport(0, 0, canvas.width, canvas.height);
        console.log("[QRE] :: Calm Reality Engine Initialized.");
    }

    function createProgram() {
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
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
        const pos = gl.getAttribLocation(program, 'p');
        gl.enableVertexAttribArray(pos);
        gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
        console.log("[QRE] :: Shader Compiled. World generating...");
    }

    function render(timestamp) {
        time = timestamp * 0.001 * speed;

        gl.uniform1f(gl.getUniformLocation(program, 'time'), time);
        gl.uniform2f(gl.getUniformLocation(program, 'resolution'), canvas.width, canvas.height);
        gl.uniform3fv(gl.getUniformLocation(program, 'cameraPos'), cameraPos);

        gl.drawArrays(gl.TRIANGLES, 0, 6);
        animationId = requestAnimationFrame(render);
    }

    function bootstrap() {
        try {
            initWebGL();
            createProgram();
            animationId = requestAnimationFrame(render);
            console.log("[QRE] :: Bootstrap complete. Calmness restored.");
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

    // Auto-start if not already running
    if (typeof document !== 'undefined') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', bootstrap);
        } else {
            bootstrap();
        }
    }

})();
