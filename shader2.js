// Basic pseudo-random number generator for shaders
const prng = `
    float random(vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
    }
`;

// Noise function (Value Noise)
const noise = `
    float noise(vec2 st) {
        vec2 i = floor(st);
        vec2 f = fract(st);

        // Four corners in 2D of a tile
        float a = random(i);
        float b = random(i + vec2(1.0, 0.0));
        float c = random(i + vec2(0.0, 1.0));
        float d = random(i + vec2(1.0, 1.0));

        // Smooth interpolation (smoothstep)
        vec2 u = f * f * (3.0 - 2.0 * f);
        // vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0); // Perlin smoothstep

        return mix(a, b, u.x) +
               (c - a) * u.y * (1.0 - u.x) +
               (d - b) * u.x * u.y;
    }
`;

// Fractional Brownian Motion (adds layers of noise)
const fbm = `
    #define OCTAVES 6
    float fbm(vec2 st) {
        float value = 0.0;
        float amplitude = 0.5;
        float frequency = 0.0; // This will be modified in the loop

        for (int i = 0; i < OCTAVES; i++) {
            frequency *= 2.0; // Double frequency - removed initial multiplication
            value += amplitude * noise(st * frequency);
            st *= 2.0; // Double frequency for next octave
            amplitude *= 0.5; // Halve amplitude
        }
        return value;
    }
`;


// Vertex Shader (usually stays simple for full-screen quad)
const vsSource = `
    attribute vec4 aVertexPosition;
    attribute vec2 aTextureCoord; // Added texture coord attribute

    varying highp vec2 vTextureCoord; // Pass texture coord to fragment shader

    void main(void) {
        gl_Position = aVertexPosition;
        vTextureCoord = aTextureCoord; // Pass through the texture coordinate
    }
`;

// Fragment Shader (The cool, uncanny part)
const fsSource = `
    precision highp float; // Need high precision

    varying highp vec2 vTextureCoord; // Receive texture coord

    uniform vec2 uResolution; // Canvas resolution (width, height)
    uniform float uTime;      // Time in seconds
    uniform vec2 uMouse;      // Mouse coordinates (normalized 0.0 to 1.0) - Optional but cool

    // Include PRNG and Noise functions
    ${prng}
    ${noise}
    // ${fbm} // FBM function - uncomment if using

    // Function to create a rotating pattern
    vec3 pattern(vec2 uv, float time) {
        float angle = atan(uv.y, uv.x);
        float radius = length(uv);

        // Combine multiple frequencies of sine waves based on angle and radius, animated by time
        float R = 0.5 + 0.5 * cos(angle * 5.0 + time * 0.5 + radius * 10.0);
        float G = 0.5 + 0.5 * sin(angle * 6.0 - time * 0.3 + radius * 12.0);
        float B = 0.5 + 0.5 * cos(angle * 7.0 + time * 0.2 + radius * 14.0);

        // Add some noise modulation
        float n = noise(uv * 5.0 + time * 0.1);
        R += n * 0.2;
        G += n * 0.15;
        B += n * 0.25;

        // Add a subtle pulsing effect based on radius
        float pulse = 0.05 * sin(radius * 8.0 - time * 2.0);

        return vec3(R, G, B) + pulse;
    }

    // Function for grid/scanlines
    float grid(vec2 uv, float scale, float thickness) {
        vec2 grid_uv = fract(uv * scale);
        float line = min(step(thickness, grid_uv.x), step(thickness, grid_uv.y));
        return 1.0 - line; // Invert so lines are dark
    }


    void main(void) {
        // Use vTextureCoord directly (it's already 0.0 to 1.0)
        vec2 uv = vTextureCoord;
        // Correct aspect ratio (optional but good practice)
        // float aspect = uResolution.x / uResolution.y;
        // vec2 uv_aspect = uv;
        // uv_aspect.x *= aspect;

        // Center UV coordinates (0,0 is center)
        vec2 centered_uv = (vTextureCoord - 0.5) * 2.0; // Range -1.0 to 1.0
        centered_uv.x *= uResolution.x / uResolution.y; // Aspect correction for centered coords


        // --- Base Color ---
        //vec3 baseColor = vec3(0.01, 0.02, 0.05); // Very dark blue base
        vec3 baseColor = vec3(0.0, 0.0, 0.0); // Black base


        // --- Layer 1: Complex Rotating Pattern ---
        vec3 patternColor = pattern(centered_uv * 1.5, uTime * 0.3); // Use centered UVs for symmetry
        patternColor *= smoothstep(1.5, 0.3, length(centered_uv)); // Fade out at edges


        // --- Layer 2: Noise field for distortion/texture ---
        vec2 noise_uv = uv * vec2(uResolution.x/uResolution.y, 1.0); // Aspect corrected UV for noise
        float noiseVal = noise(noise_uv * 4.0 + uTime * 0.05);
        noiseVal = smoothstep(0.3, 0.7, noiseVal); // Make it sharper


        // --- Layer 3: Subtle Scanlines ---
        float scanlineIntensity = 0.08;
        float scanlines = mod(gl_FragCoord.y - uTime * 20.0, 3.0) / 3.0; // Moving scanlines
        scanlines = pow(scanlines, 1.5); // Sharpen


        // --- Combine Layers ---
        vec3 finalColor = baseColor;
        finalColor += patternColor * vec3(0.1, 0.4, 0.5); // Tint the pattern blue/cyan dominant
        finalColor += noiseVal * vec3(0.05, 0.02, 0.1); // Add noise as subtle purple/blue texture
        finalColor = mix(finalColor, baseColor, scanlines * scanlineIntensity); // Apply scanlines

        // --- Glitch Effect (Occasional) ---
        float glitchTime = mod(uTime, 10.0); // Cycle every 10 seconds
        if (glitchTime > 9.5 && glitchTime < 9.6) { // Short glitch burst
             if (random(uv + fract(uTime)) > 0.95) {
                 finalColor.rg = finalColor.gr; // Swap channels
                 finalColor.b += 0.2;
                 finalColor.r *= 0.5;
             }
         }
        if (glitchTime > 6.0 && glitchTime < 6.05) { // Horizontal shift glitch
            float shift = (random(vec2(floor(uv.y * 20.0), uTime)) - 0.5) * 0.1;
            vec2 shifted_uv = uv + vec2(shift, 0.0);
            if (shifted_uv.x >= 0.0 && shifted_uv.x <= 1.0) { // Check bounds
                 // Recalculate centered_uv for shifted pattern lookup
                 vec2 centered_shifted_uv = (shifted_uv - 0.5) * 2.0;
                 centered_shifted_uv.x *= uResolution.x / uResolution.y;
                 finalColor = pattern(centered_shifted_uv * 1.5, uTime * 0.3) * vec3(0.5, 0.1, 0.2); // Use different color for glitch
             }
         }


        // --- Vignette ---
        float vignette = smoothstep(1.0, 0.4, length(centered_uv * 0.8)); // Soft vignette
        finalColor *= vignette;


        gl_FragColor = vec4(finalColor, 1.0);
    }
`;

class ShaderBackground {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            console.error(`Canvas element with id "${canvasId}" not found.`);
            return;
        }
        // Try to get WebGL context, fallback to experimental if needed
        this.gl = this.canvas.getContext('webgl') || this.canvas.getContext('experimental-webgl');

        if (!this.gl) {
            console.error("WebGL not supported or disabled.");
            this.showFallback();
            return;
        }

        this.shaderProgram = null;
        this.programInfo = null;
        this.buffers = null;
        this.startTime = Date.now();
        this.mousePos = { x: 0.5, y: 0.5 }; // Normalized mouse coords

        this.init();
    }

    init() {
        if (!this.gl) return;

        this.shaderProgram = this.initShaderProgram(this.gl, vsSource, fsSource);
        if (!this.shaderProgram) return;

        this.programInfo = {
            program: this.shaderProgram,
            attribLocations: {
                vertexPosition: this.gl.getAttribLocation(this.shaderProgram, 'aVertexPosition'),
                textureCoord: this.gl.getAttribLocation(this.shaderProgram, 'aTextureCoord'), // Get location
            },
            uniformLocations: {
                resolution: this.gl.getUniformLocation(this.shaderProgram, 'uResolution'),
                time: this.gl.getUniformLocation(this.shaderProgram, 'uTime'),
                mouse: this.gl.getUniformLocation(this.shaderProgram, 'uMouse'), // Get location
            },
        };

        this.buffers = this.initBuffers(this.gl);
        this.setupEventListeners();
        this.resizeCanvas(); // Initial size setup
        requestAnimationFrame(this.render.bind(this)); // Start render loop
    }

    initShaderProgram(gl, vsSource, fsSource) {
        const vertexShader = this.loadShader(gl, gl.VERTEX_SHADER, vsSource);
        const fragmentShader = this.loadShader(gl, gl.FRAGMENT_SHADER, fsSource);
        if (!vertexShader || !fragmentShader) return null;

        const shaderProgram = gl.createProgram();
        gl.attachShader(shaderProgram, vertexShader);
        gl.attachShader(shaderProgram, fragmentShader);
        gl.linkProgram(shaderProgram);

        if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
            console.error('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
            gl.deleteProgram(shaderProgram);
            gl.deleteShader(vertexShader);
            gl.deleteShader(fragmentShader);
            return null;
        }
        return shaderProgram;
    }

    loadShader(gl, type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error(`An error occurred compiling the ${type === gl.VERTEX_SHADER ? 'vertex' : 'fragment'} shader: ${gl.getShaderInfoLog(shader)}`);
            gl.deleteShader(shader);
            return null;
        }
        return shader;
    }

    initBuffers(gl) {
        // Position buffer (covers entire screen)
        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        const positions = [
            -1.0,  1.0,
             1.0,  1.0,
            -1.0, -1.0,
             1.0, -1.0,
        ];
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

        // Texture coordinate buffer (maps texture coords to screen corners)
        const textureCoordBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordBuffer);
        const textureCoordinates = [
            0.0, 1.0, // Top-left
            1.0, 1.0, // Top-right
            0.0, 0.0, // Bottom-left
            1.0, 0.0, // Bottom-right
        ];
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoordinates), gl.STATIC_DRAW);


        return {
            position: positionBuffer,
            textureCoord: textureCoordBuffer,
        };
    }

     setupEventListeners() {
        window.addEventListener('resize', this.resizeCanvas.bind(this));
        // Optional: Track mouse movement
        // window.addEventListener('mousemove', (event) => {
        //     this.mousePos.x = event.clientX / window.innerWidth;
        //     this.mousePos.y = 1.0 - (event.clientY / window.innerHeight); // Flip Y coord
        // });
    }

    resizeCanvas() {
        if (!this.gl) return;
         // Lookup the size the browser is displaying the canvas in CSS pixels.
        const displayWidth  = this.canvas.clientWidth;
        const displayHeight = this.canvas.clientHeight;

        // Check if the canvas size is different.
        if (this.canvas.width  !== displayWidth ||
            this.canvas.height !== displayHeight) {
            // Make the canvas the same size
            this.canvas.width  = displayWidth;
            this.canvas.height = displayHeight;
            this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
            console.log(`Canvas resized to: ${this.canvas.width}x${this.canvas.height}`);
        }
    }

    render(timestamp) {
         if (!this.gl || !this.programInfo || !this.buffers) {
            requestAnimationFrame(this.render.bind(this)); // Keep trying? Or stop?
            return;
         }

        const currentTime = (Date.now() - this.startTime) / 1000.0; // Time in seconds

        // Check if resize needed (might have happened between frames)
        this.resizeCanvas();

        // --- Set up GL state ---
        this.gl.clearColor(0.0, 0.0, 0.0, 1.0); // Clear to black
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);

        // --- Tell WebGL to use our program ---
        this.gl.useProgram(this.programInfo.program);

        // --- Set Uniforms ---
        this.gl.uniform2f(this.programInfo.uniformLocations.resolution, this.gl.canvas.width, this.gl.canvas.height);
        this.gl.uniform1f(this.programInfo.uniformLocations.time, currentTime);
        this.gl.uniform2f(this.programInfo.uniformLocations.mouse, this.mousePos.x, this.mousePos.y);


        // --- Set up Attributes ---
        // Position Attribute
        {
            const numComponents = 2; // pull out 2 values per iteration
            const type = this.gl.FLOAT; // the data is 32bit floats
            const normalize = false; // don't normalize the data
            const stride = 0; // 0 = move forward size * numComponents each iteration to get the next position
            const offset = 0; // start at the beginning of the buffer
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.position);
            this.gl.vertexAttribPointer(
                this.programInfo.attribLocations.vertexPosition,
                numComponents, type, normalize, stride, offset);
            this.gl.enableVertexAttribArray(this.programInfo.attribLocations.vertexPosition);
        }

         // Texture Coordinate Attribute
         {
            const numComponents = 2;
            const type = this.gl.FLOAT;
            const normalize = false;
            const stride = 0;
            const offset = 0;
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.textureCoord);
            this.gl.vertexAttribPointer(
                this.programInfo.attribLocations.textureCoord,
                numComponents, type, normalize, stride, offset);
             // Check if the attribute location is valid before enabling
             if (this.programInfo.attribLocations.textureCoord !== -1) {
                this.gl.enableVertexAttribArray(this.programInfo.attribLocations.textureCoord);
             } else {
                 //console.warn("aTextureCoord attribute not found or used in the shader.");
             }
        }


        // --- Draw the Quad ---
        const offset = 0;
        const vertexCount = 4; // We are drawing a TRIANGLE_STRIP with 4 vertices
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, offset, vertexCount);

        // --- Request Next Frame ---
        requestAnimationFrame(this.render.bind(this));
    }

    showFallback() {
        // Add a fallback message or style if WebGL fails
        const fallback = document.createElement('div');
        fallback.style.position = 'fixed';
        fallback.style.top = '0';
        fallback.style.left = '0';
        fallback.style.width = '100%';
        fallback.style.height = '100%';
        fallback.style.background = 'linear-gradient(to bottom right, #02000f, #0a1428)';
        fallback.style.color = '#a0c8d8';
        fallback.style.zIndex = '-1'; // Behind content
        fallback.innerHTML = '<p style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); font-family: monospace;">WebGL failed to load. Displaying static background.</p>';
        document.body.insertBefore(fallback, document.body.firstChild);
        if (this.canvas) this.canvas.style.display = 'none'; // Hide the canvas
    }
}

// --- Instantiate the shader ---
// Use type="module" in the script tag in HTML
export default new ShaderBackground('shader-canvas');

// If not using modules, just run:
// document.addEventListener('DOMContentLoaded', () => {
//     new ShaderBackground('shader-canvas');
// });