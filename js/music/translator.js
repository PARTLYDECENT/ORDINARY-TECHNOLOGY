/**
 * translator.js
 * Visualizer Logic, WebGL Background, and Data Bridging
 */

import { t } from './visualizer.js';

let gl, program, vao;
let u_time, u_resolution, u_reactivity, u_bass;
let bgReactivity = 0, bgBassLevel = 0;

const vsSource = `attribute vec2 a_position; void main() { gl_Position = vec4(a_position, 0.0, 1.0); }`;
const fsSource = `
precision highp float;
uniform float u_time;
uniform vec2 u_resolution;
uniform float u_reactivity;
uniform float u_bass;

mat2 rot(float a) { float c=cos(a), s=sin(a); return mat2(c,-s,s,c); }
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
float sdGrid(vec2 p, float s) {
    p = abs(fract(p * s) - 0.5);
    return min(p.x, p.y);
}
float sdLine(vec2 p, vec2 a, vec2 b) {
    vec2 pa = p - a, ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h);
}

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;
    float t = u_time * 0.3;
    float react = u_reactivity;
    float bass = u_bass;

    float horizon = 0.3 + bass * 0.1;
    float planeDist = 1.0 / (uv.y + horizon + 0.001);
    vec2 planeUV = vec2(uv.x * planeDist, planeDist);

    float warp1 = sin(planeUV.y * 0.5 + t * 2.0) * (0.15 + react * 0.4);
    float warp2 = cos(planeUV.x * 0.8 + t * 1.5) * (0.1 + react * 0.3);
    vec2 warpedPlaneUV = planeUV + vec2(warp1, warp2);
    warpedPlaneUV *= rot(t * 0.1 + bass * 0.3);

    float gridScale1 = 0.8 + react * 0.5;
    float gridScale2 = gridScale1 * 3.0;
    float line1 = smoothstep(0.02, 0.0, sdGrid(warpedPlaneUV, gridScale1));
    float line2 = smoothstep(0.03, 0.01, sdGrid(warpedPlaneUV, gridScale2)) * 0.4;
    float grid = (line1 + line2) * (1.0 / (1.0 + planeDist * planeDist * 0.01));

    float treeLayer = 0.0;
    vec3 splatColor = vec3(0.0);
    vec2 treeID = floor(planeUV * 0.2);
    vec2 localTreeUV = fract(planeUV * 0.2) - 0.5;
    float h = hash(treeID);
    if (h > 0.6) {
        float sway = sin(t * 2.0 + h * 10.0) * 0.1;
        vec2 trunkBase = vec2(0.0, -0.4);
        vec2 trunkTip = vec2(sway, 0.4 + h * 0.2);
        float treeDist = planeDist;
        float treeFade = smoothstep(20.0, 5.0, treeDist) * smoothstep(-0.2, 0.2, uv.y + horizon);
        if (treeFade > 0.0) {
            vec2 p = localTreeUV * 10.0;
            float trunk = sdLine(p, trunkBase, trunkTip);
            float trunkWire = smoothstep(0.08, 0.04, trunk) * (0.5 + 0.5 * sin(p.y * 10.0 - t * 5.0));
            treeLayer += trunkWire * treeFade;
            for(int i=0; i<3; i++) {
                float fi = float(i);
                float bAngle = fi * 2.1 + h;
                vec2 bDir = vec2(sin(bAngle), cos(bAngle)) * 0.4;
                vec2 bStart = mix(trunkBase, trunkTip, 0.4 + fi * 0.2);
                vec2 bEnd = bStart + bDir + vec2(sway * 1.5, sway);
                float br = sdLine(p, bStart, bEnd);
                treeLayer += smoothstep(0.06, 0.02, br) * 0.6 * treeFade;
                float splatDist = length(p - bEnd);
                float splat = exp(-pow(splatDist * 4.0, 2.0));
                float pulseSplat = splat * (0.8 + react * 0.6 + 0.2 * sin(t * 5.0 + fi));
                vec3 pCol = mix(vec3(1.0, 0.4, 0.7), vec3(1.0, 0.8, 0.9), h);
                splatColor += pCol * pulseSplat * treeFade;
            }
        }
    }

    vec3 colBase = vec3(0.0, 1.0, 0.76);
    vec3 colEnergy = vec3(0.49, 0.3, 1.0);
    vec3 colCyan = vec3(0.0, 0.74, 0.82);
    float pulse = sin(warpedPlaneUV.y * 2.0 - t * 4.0) * 0.5 + 0.5;
    pulse = pow(pulse, 2.0) * react;
    vec3 gridCol = mix(colBase, colEnergy, pulse);
    gridCol = mix(gridCol, colCyan, sin(warpedPlaneUV.x * 3.0 + t) * 0.3 + 0.3);
    float horizonGlow = exp(-pow((uv.y + horizon) * 8.0, 2.0)) * bass * 2.0;
    vec3 bgColor = vec3(0.008, 0.012, 0.02);
    vec3 finalColor = bgColor + gridCol * grid + colBase * treeLayer * 0.8;
    finalColor += splatColor * 0.9 + colEnergy * horizonGlow;
    float scanline = sin(gl_FragCoord.y * 1.5 + t * 10.0) * 0.03;
    float vig = 1.0 - dot(uv * 0.8, uv * 0.8);
    finalColor = (finalColor + scanline) * vig;
    gl_FragColor = vec4(finalColor, 1.0);
}
`;

function initWebGLBackground(canvas) {
    gl = canvas.getContext('webgl', { alpha: false, antialias: false });
    if (!gl) return console.error('WebGL not supported');

    function createShader(gl, type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error(gl.getShaderInfoLog(shader));
            gl.deleteShader(shader); return null;
        }
        return shader;
    }

    const vs = createShader(gl, gl.VERTEX_SHADER, vsSource);
    const fs = createShader(gl, gl.FRAGMENT_SHADER, fsSource);
    program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    u_time = gl.getUniformLocation(program, 'u_time');
    u_resolution = gl.getUniformLocation(program, 'u_resolution');
    u_reactivity = gl.getUniformLocation(program, 'u_reactivity');
    u_bass = gl.getUniformLocation(program, 'u_bass');

    const positions = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    const posLoc = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
}

function renderCurrentBackground(canvas, reactivity = 0, bass = 0) {
    if (!gl || !program) return;
    
    bgReactivity += (reactivity - bgReactivity) * 0.15;
    bgBassLevel += (bass - bgBassLevel) * 0.2;

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.useProgram(program);
    gl.uniform1f(u_time, t());
    gl.uniform2f(u_resolution, canvas.width, canvas.height);
    gl.uniform1f(u_reactivity, bgReactivity);
    gl.uniform1f(u_bass, bgBassLevel);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

export { initWebGLBackground, renderCurrentBackground };
