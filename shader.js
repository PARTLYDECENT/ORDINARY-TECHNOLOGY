(function () {
    "use strict";

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

    // Fragment Shader - 3D Infinite Grid World (Synthwave Style)
    const fsSource = `
        #extension GL_OES_standard_derivatives : enable
        precision highp float;
        
        varying highp vec2 vTextureCoord;

        uniform vec2 uResolution;
        uniform float uTime;
        uniform vec2 uMouse;

        /*
        * 3D GRID WORLD SHADER
        * Simple infinite moving grid with retro synthwave aesthetic.
        * User Request: "SEMI GOOD 3D WORLD SIMPLE NOTHING INSANE LIKE A GRIDWORLD"
        */

        // --- Hash Function ---
        float hash(vec2 p) {
            return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
        }

        // --- 3D Camera / Ray Functions ---
        vec3 getRayDir(vec2 uv, vec3 p, vec3 l, float z) {
            vec3 f = normalize(l - p),
                 r = normalize(cross(vec3(0, 1, 0), f)),
                 u = cross(f, r),
                 c = f * z,
                 i = c + uv.x * r + uv.y * u;
            return normalize(i);
        }

        void main() {
            // Correct Aspect Ratio
            // uResolution is set in JS: this.gl.uniform2f(..., canvas.width, canvas.height)
            vec2 uv = vTextureCoord;
            float aspect = uResolution.x / uResolution.y;
            uv.x *= aspect;
            
            // Center UVs for 3D camera (0,0 is center)
            uv = (uv - vec2(aspect * 0.5, 0.5)) * 2.0;

            // --- Camera Setup ---
            float speed = 2.0;
            float forwardTime = uTime * speed;
            
            // Camera Position: Fly at y=1.0
            vec3 ro = vec3(0.0, 1.0, forwardTime); 
            
            // Look At Point: Look ahead
            vec3 lookAt = ro + vec3(0.0, -0.2, 10.0);
            
            // Get Ray Direction
            vec3 rd = getRayDir(uv, ro, lookAt, 1.0);

            // --- Render ---
            vec3 col = vec3(0.0); // Background color

            // --- Sky ---
            // Gradient: Dark blue to black
            // Use rd.y for sky gradient based on look angle
            float sky = max(0.0, rd.y);
            col = mix(vec3(0.05, 0.0, 0.1), vec3(0.0), pow(sky, 0.5));
            
            // Stars in the sky
            if (rd.y > 0.0) {
                float stars = pow(hash(uv * 50.0), 50.0);
                col += vec3(stars);
            }

            // --- Ground Intersection (Plane y=0) ---
            if (rd.y < 0.0) {
                float t = -ro.y / rd.y;
                if (t > 0.0) {
                    vec3 p = ro + t * rd;
                    
                    // --- Grid Pattern ---
                    float scale = 1.0;
                    vec2 coord = p.xz * scale;
                    
                    // Anti-aliased grid lines
                    vec2 grid = abs(fract(coord - 0.5) - 0.5) / fwidth(coord);
                    float line = min(grid.x, grid.y);
                    float gridIntensity = 1.0 - min(line, 1.0);
                    
                    // Base Colors
                    vec3 floorColor = vec3(0.0, 0.0, 0.05 + 0.05 * sin(p.z * 0.1)); // Subtle scrolling variation
                    vec3 gridColor = vec3(0.0, 1.0, 0.8); // Cyan Grid
                    
                    // Fade grid lines in distance slightly less than fog to make them pop
                    gridColor *= 1.5; 

                    vec3 finalGround = mix(floorColor, gridColor, gridIntensity);

                    // --- Fog ---
                    // Exponential fog fading to black/sky color
                    float dist = distance(ro, p);
                    float fogFactor = 1.0 - exp(-dist * 0.08);
                    
                    col = mix(finalGround, vec3(0.0, 0.05, 0.1), fogFactor);
                    
                    // Horizon Glow
                    float horizon = smoothstep(20.0, 40.0, dist);
                    col += vec3(0.0, 0.3, 0.5) * horizon * 0.5;
                }
            }

            // --- Retro Post-Processing ---
            // Vignette
            float vignette = smoothstep(1.5, 0.5, length(uv * 0.5)); // We scaled UV up, so scale down for vignette
            col *= vignette;

            // Gamma
            col = pow(col, vec3(0.4545));

            gl_FragColor = vec4(col, 1.0);
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

            this.gl = this.canvas.getContext('webgl') || this.canvas.getContext('experimental-webgl') || this.canvas.getContext('webgl2');

            // ENABLE DERIVATIVES extension for OES_standard_derivatives if WebGL1
            // fwidth() requires OES_standard_derivatives in WebGL 1
            if (this.gl) {
                this.gl.getExtension('OES_standard_derivatives');
            }

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
