(function () {
    "use strict";

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

            // Smooth interpolation
            vec2 u = f * f * (3.0 - 2.0 * f);

            return mix(a, b, u.x) +
                   (c - a) * u.y * (1.0 - u.x) +
                   (d - b) * u.x * u.y;
        }
    `;

    // Fractional Brownian Motion (adds layers of noise)
    const fbm = `
        #define OCTAVES 4
        float fbm(vec2 st) {
            float value = 0.0;
            float amplitude = 0.5;
            float frequency = 1.0;

            for (int i = 0; i < OCTAVES; i++) {
                value += amplitude * noise(st * frequency);
                st *= 2.0;
                amplitude *= 0.5;
                frequency *= 2.0;
            }
            return value;
        }
    `;

    // Vertex Shader (simple full-screen quad)
    const vsSource = `
        attribute vec4 aVertexPosition;
        attribute vec2 aTextureCoord;

        varying highp vec2 vTextureCoord;

        void main(void) {
            gl_Position = aVertexPosition;
            vTextureCoord = aTextureCoord;
        }
    `;

    // Fragment Shader - Backrooms/Tomb Raider uncanny style
    const fsSource = `
        precision highp float;

        varying highp vec2 vTextureCoord;

        uniform vec2 uResolution;
        uniform float uTime;
        uniform vec2 uMouse;

        // PRNG function
        float random(vec2 st) {
            return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
        }

        // Noise function
        float noise(vec2 st) {
            vec2 i = floor(st);
            vec2 f = fract(st);
            float a = random(i);
            float b = random(i + vec2(1.0, 0.0));
            float c = random(i + vec2(0.0, 1.0));
            float d = random(i + vec2(1.0, 1.0));
            vec2 u = f * f * (3.0 - 2.0 * f);
            return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
        }

        // FBM function
        float fbm(vec2 st) {
            float value = 0.0;
            float amplitude = 0.5;
            float frequency = 1.0;
            for (int i = 0; i < 4; i++) {
                value += amplitude * noise(st * frequency);
                st *= 2.0;
                amplitude *= 0.5;
                frequency *= 2.0;
            }
            return value;
        }

        // Function to create a grid/wall pattern
        float wallPattern(vec2 uv, float scale) {
            vec2 grid = fract(uv * scale);
            float lines = max(
                smoothstep(0.05, 0.07, grid.x) * smoothstep(0.95, 0.93, grid.x),
                smoothstep(0.05, 0.07, grid.y) * smoothstep(0.95, 0.93, grid.y)
            );
            return lines;
        }

        // Create distorted lighting effect
        float lighting(vec2 uv, float time) {
            // Create a slow pulsing light source
            float dist = length(uv - vec2(0.5 + sin(time * 0.2) * 0.2, 0.5 + cos(time * 0.3) * 0.1));
            float light = smoothstep(0.8, 0.0, dist);
            
            // Add flickering
            float flicker = 0.95 + 0.05 * sin(time * 10.0);
            
            return light * flicker;
        }

        void main(void) {
            // Use texture coordinates and correct aspect ratio
            vec2 uv = vTextureCoord;
            float aspect = uResolution.x / uResolution.y;
            uv.x *= aspect;
            
            // Center coordinates (for various effects)
            vec2 centered_uv = (uv - vec2(aspect * 0.5, 0.5)) * 2.0;

            // --- Create a backrooms-like environment ---
            
            // Base color (sickly yellow-green of the backrooms)
            vec3 backroomsYellow = vec3(0.7, 0.65, 0.3);
            
            // Wall pattern with slight distortion
            vec2 distortedUV = uv;
            distortedUV.x += sin(uv.y * 20.0 + uTime * 0.2) * 0.01;
            distortedUV.y += cos(uv.x * 15.0 + uTime * 0.1) * 0.01;
            
            // Create wall tiles
            float walls = wallPattern(distortedUV, 3.0);
            
            // Add some noise texture for grime/mold
            float grime = noise(uv * 15.0) * 0.2;
            float timeMold = fbm(uv * 4.0 + uTime * 0.05) * 0.15;
            
            // Lighting with flickering and shadows
            float light = lighting(uv / vec2(aspect, 1.0), uTime);
            
            // Vignette effect for claustrophobic feel
            float vignette = smoothstep(1.4, 0.2, length(centered_uv));
            
            // Add a water puddle effect on the floor
            float puddle = 0.0;
            if (uv.y < 0.4) {
                // Distorted reflection
                vec2 reflectionUV = vec2(uv.x, 0.8 - uv.y);
                reflectionUV.x += sin(uv.y * 40.0 + uTime) * 0.02;
                float reflectionWalls = wallPattern(reflectionUV, 3.0);
                puddle = reflectionWalls * smoothstep(0.4, 0.2, uv.y) * 0.3;
                puddle *= (0.5 + 0.5 * sin(uv.x * 30.0 + uTime)); // Ripple effect
            }
            
            // Add some dust particles floating in the air
            float dust = 0.0;
            for (int i = 0; i < 5; i++) {
                float t = mod(uTime * 0.1 + float(i) * 0.2, 1.0);
                vec2 dustPos = vec2(
                    mod(random(vec2(float(i), 0.0)) + sin(uTime * 0.1 + float(i)), aspect),
                    mod(t + random(vec2(0.0, float(i))), 1.0)
                );
                dust += smoothstep(0.02, 0.0, length(uv - dustPos)) * 0.5;
            }
            
            // Occasional shadows moving across walls (uncanny)
            float shadow = 0.0;
            float shadowTime = mod(uTime * 0.2, 20.0);
            if (shadowTime > 8.0 && shadowTime < 10.0) {
                vec2 shadowPos = vec2(mod(shadowTime - 8.0, aspect), 0.5);
                shadow = smoothstep(0.3, 0.0, length(uv - shadowPos)) * 0.5;
            }
            
            // Combine all elements
            vec3 finalColor = backroomsYellow;
            finalColor *= mix(0.2, 1.0, walls); // Apply wall pattern
            finalColor -= shadow; // Apply moving shadows
            finalColor = mix(finalColor, vec3(0.1, 0.12, 0.0), grime); // Add grime
            finalColor = mix(finalColor, vec3(0.06, 0.15, 0.06), timeMold); // Add mold
            finalColor += dust * vec3(1.0, 0.9, 0.7); // Add dust
            finalColor += puddle * vec3(0.2, 0.25, 0.3); // Add water puddles
            finalColor *= light * 1.5; // Apply lighting
            finalColor *= vignette; // Apply vignette
            
            // Add scanlines for a horror/old camera effect
            float scanline = sin(gl_FragCoord.y * 0.5 - uTime * 10.0) * 0.5 + 0.5;
            finalColor *= 0.8 + 0.2 * scanline;
            
            // Occasional glitch effect
            float glitchTime = mod(uTime, 15.0);
            if (glitchTime > 14.0 && glitchTime < 14.2) {
                if (random(uv + fract(uTime)) > 0.7) {
                    finalColor.rb = finalColor.br; // Swap channels
                    finalColor += vec3(0.1, 0.0, 0.1) * random(uv);
                }
            }
            
            gl_FragColor = vec4(finalColor, 1.0);
        }
    `;

    class ShaderBackground {
        constructor() {
            this.canvas = document.getElementById('webglCanvas');
            if (!this.canvas) {
                this.canvas = document.createElement('canvas');
                this.canvas.id = 'webglCanvas';
                this.canvas.style.cssText = `position:fixed;top:0;left:0;z-index:-2;width:100vw;height:100vh;background:#000;`;
                document.body.insertBefore(this.canvas, document.body.firstChild);
            }

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
            this.mousePos = { x: 0.5, y: 0.5 };

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
                    textureCoord: this.gl.getAttribLocation(this.shaderProgram, 'aTextureCoord'),
                },
                uniformLocations: {
                    resolution: this.gl.getUniformLocation(this.shaderProgram, 'uResolution'),
                    time: this.gl.getUniformLocation(this.shaderProgram, 'uTime'),
                    mouse: this.gl.getUniformLocation(this.shaderProgram, 'uMouse'),
                },
            };

            this.buffers = this.initBuffers(this.gl);
            this.setupEventListeners();
            this.resizeCanvas();
            console.log('Shader initialized successfully, starting animation loop');
            requestAnimationFrame(this.render.bind(this));
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
                return null;
            }
            return shaderProgram;
        }

        loadShader(gl, type, source) {
            const shader = gl.createShader(type);
            gl.shaderSource(shader, source);
            gl.compileShader(shader);

            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                console.error(`An error occurred compiling the shader: ${gl.getShaderInfoLog(shader)}`);
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
                -1.0, 1.0,
                1.0, 1.0,
                -1.0, -1.0,
                1.0, -1.0,
            ];
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

            // Texture coordinate buffer
            const textureCoordBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordBuffer);
            const textureCoordinates = [
                0.0, 1.0,
                1.0, 1.0,
                0.0, 0.0,
                1.0, 0.0,
            ];
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoordinates), gl.STATIC_DRAW);

            return {
                position: positionBuffer,
                textureCoord: textureCoordBuffer,
            };
        }

        setupEventListeners() {
            window.addEventListener('resize', this.resizeCanvas.bind(this));
            // Track mouse movement for interactive lighting
            this.canvas.addEventListener('mousemove', (event) => {
                const rect = this.canvas.getBoundingClientRect();
                this.mousePos.x = (event.clientX - rect.left) / this.canvas.width;
                this.mousePos.y = 1.0 - (event.clientY - rect.top) / this.canvas.height;
            });
        }

        resizeCanvas() {
            if (!this.gl) return;
            const displayWidth = window.innerWidth;
            const displayHeight = window.innerHeight;

            if (this.canvas.width !== displayWidth || this.canvas.height !== displayHeight) {
                this.canvas.width = displayWidth;
                this.canvas.height = displayHeight;
                this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
            }
        }

        render() {
            if (!this.gl || !this.programInfo || !this.buffers) {
                console.warn('Shader not ready, retrying...');
                requestAnimationFrame(this.render.bind(this));
                return;
            }

            try {
                const currentTime = (Date.now() - this.startTime) / 1000.0;

                this.resizeCanvas();

                this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
                this.gl.clear(this.gl.COLOR_BUFFER_BIT);
                this.gl.useProgram(this.programInfo.program);

                // Set uniforms
                this.gl.uniform2f(this.programInfo.uniformLocations.resolution, this.gl.canvas.width, this.gl.canvas.height);
                this.gl.uniform1f(this.programInfo.uniformLocations.time, currentTime);
                this.gl.uniform2f(this.programInfo.uniformLocations.mouse, this.mousePos.x, this.mousePos.y);

                // Position attribute
                const attribs = this.programInfo.attribLocations;

                this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.position);
                this.gl.vertexAttribPointer(attribs.vertexPosition, 2, this.gl.FLOAT, false, 0, 0);
                this.gl.enableVertexAttribArray(attribs.vertexPosition);

                this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.textureCoord);
                this.gl.vertexAttribPointer(attribs.textureCoord, 2, this.gl.FLOAT, false, 0, 0);
                this.gl.enableVertexAttribArray(attribs.textureCoord);

                // Draw the quad
                this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);

                // Check for GL errors
                const error = this.gl.getError();
                if (error !== this.gl.NO_ERROR) {
                    console.error('WebGL Error:', error);
                }
            } catch (e) {
                console.error('Render error:', e);
            }

            requestAnimationFrame(this.render.bind(this));
        }

        showFallback() {
            const fallback = document.createElement('div');
            fallback.style.position = 'fixed';
            fallback.style.top = '0';
            fallback.style.left = '0';
            fallback.style.width = '100%';
            fallback.style.height = '100%';
            fallback.style.background = 'linear-gradient(to bottom, #393022, #121212)';
            fallback.style.color = '#c8b29a';
            fallback.style.zIndex = '-1';
            fallback.innerHTML = '<p style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); font-family: monospace;">WebGL failed. Displaying static backrooms background.</p>';
            document.body.insertBefore(fallback, document.body.firstChild);
            if (this.canvas) this.canvas.style.display = 'none';
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => new ShaderBackground());
    } else {
        new ShaderBackground();
    }

})();
