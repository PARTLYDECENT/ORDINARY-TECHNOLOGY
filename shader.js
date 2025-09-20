// =================================================================================================
// [QUANTUM FRACTAL DIMENSION EXPLORER] :: HYPER-OPTIMIZED SHADER MADNESS
// Performance-focused fractal universe with mind-bending visuals
// =================================================================================================
(function() {
    "use strict";

    let canvas, gl, program, animationId;
    let time = 0, dimIndex = 0, morphFactor = 0;
    let autoMorph = true, intensity = 1.0, warpSpeed = 1.0;
    
    // =================================================================================================
    // [FRACTAL DIMENSIONS] :: MATHEMATICAL UNIVERSES
    // =================================================================================================
    const dimensions = [
        { name: "Mandelbrot Nexus", colors: [[0.1,0.5,1.0], [1.0,0.2,0.8], [0.0,0.8,0.4]], params: [2.0, 4.0, 0.3] },
        { name: "Julia Vortex", colors: [[1.0,0.3,0.0], [0.8,0.0,1.0], [0.0,1.0,0.5]], params: [3.0, 6.0, 0.5] },
        { name: "Phoenix Flames", colors: [[1.0,0.6,0.0], [1.0,0.0,0.3], [0.5,0.0,1.0]], params: [2.5, 8.0, 0.4] },
        { name: "Quantum Foam", colors: [[0.0,1.0,1.0], [1.0,0.5,0.0], [1.0,0.0,1.0]], params: [1.8, 10.0, 0.6] },
        { name: "Void Spiral", colors: [[0.8,0.8,1.0], [0.2,0.2,0.4], [1.0,0.1,0.1]], params: [3.5, 5.0, 0.2] },
        { name: "Neural Web", colors: [[0.3,1.0,0.3], [0.0,0.5,1.0], [1.0,0.8,0.0]], params: [2.2, 7.0, 0.7] }
    ];

    // =================================================================================================
    // [ULTRA-OPTIMIZED VERTEX SHADER]
    // =================================================================================================
    const vertexSource = `
        attribute vec2 pos;
        varying vec2 uv;
        void main() {
            uv = pos;
            gl_Position = vec4(pos, 0, 1);
        }
    `;

    // =================================================================================================
    // [QUANTUM FRACTAL FRAGMENT SHADER] :: PURE MATHEMATICAL POETRY
    // =================================================================================================
    const fragmentSource = `
        precision highp float;
        uniform float time, intensity, warp, morph;
        uniform int dim;
        uniform vec2 res;
        uniform vec3 col1, col2, col3;
        uniform vec3 params;
        varying vec2 uv;
        
        const int MAX_ITER = 128;
        const float PI = 3.14159265;
        const float TAU = 6.28318531;
        
        // Ultra-fast complex math
        vec2 cmul(vec2 a, vec2 b) { return vec2(a.x*b.x - a.y*b.y, a.x*b.y + a.y*b.x); }
        vec2 csqr(vec2 z) { return vec2(z.x*z.x - z.y*z.y, 2.0*z.x*z.y); }
        vec2 cdiv(vec2 a, vec2 b) { float d = dot(b,b); return vec2(dot(a,b), a.y*b.x - a.x*b.y) / d; }
        float cabs2(vec2 z) { return dot(z,z); }
        
        // Hyper-optimized noise
        float hash21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5); }
        
        // Quantum field distortion
        vec2 warpField(vec2 z, float t) {
            float r = length(z);
            float a = atan(z.y, z.x);
            r += sin(a * 5.0 + t) * warp * 0.1;
            a += sin(r * 3.0 + t * 2.0) * warp * 0.2;
            return r * vec2(cos(a), sin(a));
        }
        
        // Multi-dimensional fractal engine
        float fractal(vec2 coord) {
            vec2 z = coord;
            vec2 c = coord;
            float escape = 0.0;
            
            // Dimension-specific transformations
            if(dim == 0) { // Mandelbrot Nexus
                c = coord * (2.0 + sin(time * 0.5) * 0.5);
                for(int i = 0; i < MAX_ITER; i++) {
                    if(cabs2(z) > params.y) break;
                    z = csqr(z) + c + vec2(sin(time * 0.3), cos(time * 0.4)) * 0.1;
                    escape += 1.0;
                }
            }
            else if(dim == 1) { // Julia Vortex
                c = vec2(sin(time * 0.2) * 0.7, cos(time * 0.3) * 0.8);
                for(int i = 0; i < MAX_ITER; i++) {
                    if(cabs2(z) > params.y) break;
                    z = csqr(z) + c;
                    z = warpField(z, time);
                    escape += 1.0;
                }
            }
            else if(dim == 2) { // Phoenix Flames
                vec2 prev = vec2(0);
                for(int i = 0; i < MAX_ITER; i++) {
                    if(cabs2(z) > params.y) break;
                    vec2 temp = csqr(z) + c + params.z * prev;
                    prev = z; z = temp;
                    escape += 1.0;
                }
            }
            else if(dim == 3) { // Quantum Foam
                float phase = time * 0.1;
                for(int i = 0; i < MAX_ITER; i++) {
                    if(cabs2(z) > params.y) break;
                    z = vec2(z.x*z.x - z.y*z.y + c.x + sin(phase), 
                             params.x * z.x * z.y + c.y + cos(phase));
                    phase += 0.1;
                    escape += 1.0;
                }
            }
            else if(dim == 4) { // Void Spiral
                float spiral = atan(coord.y, coord.x) + time * 0.2;
                c = coord + vec2(cos(spiral), sin(spiral)) * 0.3;
                for(int i = 0; i < MAX_ITER; i++) {
                    if(cabs2(z) > params.y) break;
                    z = cmul(z, z) + c;
                    z *= mat2(cos(time*0.1), -sin(time*0.1), sin(time*0.1), cos(time*0.1));
                    escape += 1.0;
                }
            }
            else { // Neural Web
                for(int i = 0; i < MAX_ITER; i++) {
                    if(cabs2(z) > params.y) break;
                    float r = length(z), a = atan(z.y, z.x);
                    r = pow(r, params.x) + params.z;
                    a = a * params.x + time * 0.1;
                    z = r * vec2(cos(a), sin(a)) + c;
                    escape += 1.0;
                }
            }
            
            return escape / float(MAX_ITER);
        }
        
        // Quantum color mixing
        vec3 quantumColor(float t, vec2 pos) {
            t = pow(t, 0.7); // Gamma for better distribution
            
            // Multi-dimensional color interpolation
            vec3 base = mix(col1, col2, smoothstep(0.0, 0.6, t));
            base = mix(base, col3, smoothstep(0.4, 1.0, t));
            
            // Quantum interference patterns
            float interference = sin(pos.x * 20.0 + time) * sin(pos.y * 15.0 + time * 1.3) * 0.1;
            base += interference * intensity;
            
            // Dimensional energy fields
            float energy = hash21(floor(pos * 10.0) + time * 0.1) * 0.2;
            base += vec3(energy) * intensity;
            
            // Morphing between dimensions
            if(morph > 0.0) {
                vec3 nextCol1 = dimensions[int(mod(float(dim + 1), 6.0))].colors[0];
                base = mix(base, nextCol1, morph * 0.3);
            }
            
            return base;
        }
        
        void main() {
            vec2 coord = (uv * 2.0 - 1.0) * vec2(res.x / res.y, 1.0);
            coord *= 1.5; // Zoom level
            
            // Multi-sample anti-aliasing for smooth edges
            vec3 color = vec3(0);
            const int samples = 2;
            for(int sx = 0; sx < samples; sx++) {
                for(int sy = 0; sy < samples; sy++) {
                    vec2 offset = (vec2(sx, sy) - 0.5) / res * 2.0;
                    float t = fractal(coord + offset);
                    color += quantumColor(t, coord + offset);
                }
            }
            color /= float(samples * samples);
            
            // Post-quantum effects
            color = pow(color, vec3(0.8)); // Gamma correction
            color *= 1.0 - length(uv) * 0.3; // Vignette
            color += hash21(gl_FragCoord.xy + time) * 0.02; // Film grain
            
            gl_FragColor = vec4(color, 1.0);
        }
    `;

    // =================================================================================================
    // [HYPER-OPTIMIZED WEBGL SETUP]
    // =================================================================================================
    function initWebGL() {
        canvas = document.createElement('canvas');
        canvas.id = 'quantumCanvas';
        canvas.style.cssText = `
            position: fixed; top: 0; left: 0; z-index: -1;
            width: 100vw; height: 100vh; background: #000;
        `;
        document.body.appendChild(canvas);
        
        gl = canvas.getContext('webgl', { 
            antialias: false, 
            depth: false, 
            stencil: false,
            alpha: false,
            preserveDrawingBuffer: false,
            powerPreference: "high-performance"
        });
        
        if (!gl) throw new Error("WebGL not supported");
        
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        gl.viewport(0, 0, canvas.width, canvas.height);
        
        console.log("[QUANTUM] WebGL initialized - Reality matrix loaded");
    }

    function compileShader(type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            throw new Error(`Shader error: ${gl.getShaderInfoLog(shader)}`);
        }
        return shader;
    }

    function createProgram() {
        const vs = compileShader(gl.VERTEX_SHADER, vertexSource);
        const fs = compileShader(gl.FRAGMENT_SHADER, fragmentSource);
        
        program = gl.createProgram();
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.linkProgram(program);
        
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            throw new Error(`Program error: ${gl.getProgramInfoLog(program)}`);
        }
        
        gl.useProgram(program);
        
        // Ultra-simple fullscreen quad
        const vertices = new Float32Array([-1,-1, 1,-1, 1,1, -1,-1, 1,1, -1,1]);
        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
        
        const pos = gl.getAttribLocation(program, 'pos');
        gl.enableVertexAttribArray(pos);
        gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
    }

    // =================================================================================================
    // [QUANTUM RENDER LOOP] :: MAXIMUM PERFORMANCE
    // =================================================================================================
    function render(timestamp) {
        time = timestamp * 0.001;
        
        // Auto-morph between dimensions
        if (autoMorph) {
            morphFactor = Math.sin(time * 0.1) * 0.5 + 0.5;
            if (time % 8.0 < 0.016) { // ~60fps check
                dimIndex = Math.floor(time / 8.0) % dimensions.length;
            }
        }
        
        const dim = dimensions[dimIndex];
        
        // Ultra-fast uniform updates
        gl.uniform1f(gl.getUniformLocation(program, 'time'), time);
        gl.uniform1f(gl.getUniformLocation(program, 'intensity'), intensity);
        gl.uniform1f(gl.getUniformLocation(program, 'warp'), warpSpeed);
        gl.uniform1f(gl.getUniformLocation(program, 'morph'), morphFactor);
        gl.uniform1i(gl.getUniformLocation(program, 'dim'), dimIndex);
        gl.uniform2f(gl.getUniformLocation(program, 'res'), canvas.width, canvas.height);
        gl.uniform3f(gl.getUniformLocation(program, 'col1'), ...dim.colors[0]);
        gl.uniform3f(gl.getUniformLocation(program, 'col2'), ...dim.colors[1]);
        gl.uniform3f(gl.getUniformLocation(program, 'col3'), ...dim.colors[2]);
        gl.uniform3f(gl.getUniformLocation(program, 'params'), ...dim.params);
        
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        animationId = requestAnimationFrame(render);
    }

    // =================================================================================================
    // [QUANTUM CONTROL API] :: REALITY MANIPULATION
    // =================================================================================================
    window.quantumControl = {
        switchDimension: (index) => {
            if (index >= 0 && index < dimensions.length) {
                dimIndex = index;
                console.log(`[QUANTUM SHIFT] Entering ${dimensions[index].name}`);
            }
        },
        
        setIntensity: (val) => {
            intensity = Math.max(0, Math.min(3, val));
        },
        
        setWarpSpeed: (val) => {
            warpSpeed = Math.max(0, Math.min(5, val));
        },
        
        toggleAutoMorph: () => {
            autoMorph = !autoMorph;
            console.log(`[QUANTUM] Auto-morph ${autoMorph ? 'enabled' : 'disabled'}`);
        },
        
        getDimensions: () => dimensions.map((d, i) => ({index: i, name: d.name})),
        
        getCurrentDimension: () => ({index: dimIndex, name: dimensions[dimIndex].name}),
        
        destroy: () => {
            if (animationId) cancelAnimationFrame(animationId);
            if (canvas) canvas.remove();
            console.log("[QUANTUM] Reality matrix unloaded");
        }
    };

    // =================================================================================================
    // [REALITY INITIALIZATION]
    // =================================================================================================
    function initialize() {
        try {
            initWebGL();
            createProgram();
            
            // Performance monitoring
            let frameCount = 0, lastTime = performance.now();
            function logPerformance() {
                const now = performance.now();
                const fps = frameCount / ((now - lastTime) / 1000);
                console.log(`[QUANTUM PERF] ${fps.toFixed(1)} FPS - Dimension: ${dimensions[dimIndex].name}`);
                frameCount = 0;
                lastTime = now;
            }
            
            setInterval(logPerformance, 5000);
            
            render(0);
            
            console.log("[QUANTUM] Reality matrix fully loaded");
            console.log("Use quantumControl.switchDimension(0-5) to explore dimensions");
            console.log("Use quantumControl.setIntensity(1-3) for visual intensity");
            
            return true;
        } catch (e) {
            console.error("[QUANTUM ERROR] Reality matrix failed:", e);
            return false;
        }
    }

    // =================================================================================================
    // [REALITY HOOKS]
    // =================================================================================================
    window.addEventListener('resize', () => {
        if (canvas && gl) {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            gl.viewport(0, 0, canvas.width, canvas.height);
        }
    });
    
    // Keyboard controls for dimension switching
    window.addEventListener('keydown', (e) => {
        const key = parseInt(e.key);
        if (key >= 1 && key <= 6) {
            window.quantumControl.switchDimension(key - 1);
        } else if (e.key === 'a') {
            window.quantumControl.toggleAutoMorph();
        } else if (e.key === '=') {
            window.quantumControl.setIntensity(intensity + 0.2);
        } else if (e.key === '-') {
            window.quantumControl.setIntensity(intensity - 0.2);
        }
    });

    // Initialize when ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

})();
