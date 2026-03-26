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
        precision highp float;
        
        varying highp vec2 vTextureCoord;

        uniform vec2 uResolution;
        uniform float uTime;
        uniform vec2 uMouse;

        // Hash
        float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

        // Box SDF edge (wireframe)
        float sdBoxEdge(vec3 p, vec3 b, float e) {
            p = abs(p) - b;
            vec3 q = abs(p + e) - e;
            return min(min(
                length(max(vec3(p.x, q.y, q.z), 0.0)) + min(max(p.x, max(q.y, q.z)), 0.0),
                length(max(vec3(q.x, p.y, q.z), 0.0)) + min(max(q.x, max(p.y, q.z)), 0.0)),
                length(max(vec3(q.x, q.y, p.z), 0.0)) + min(max(q.x, max(q.y, p.z)), 0.0));
        }

        vec2 map(vec3 p) {
            // 1. Terrain Plane
            float dG = p.y + 1.0;
            
            // 2. Objects forming out of the grid
            vec3 op = p;
            
            // Grid space for objects
            float cellSize = 4.0; 
            // We DO NOT scroll objects locally, so they stay anchored to the world grid coordinates!
            
            vec2 id = floor(op.xz / cellSize);
            // Center local space within the cell
            op.xz = mod(op.xz, cellSize) - cellSize * 0.5;
            
            float h1 = hash(id + vec2(1.0, 2.0));
            float h2 = hash(id + vec2(3.0, 4.0));
            float shapeType = hash(id + vec2(5.0, 6.0));
            
            // Sparsity check: emitting slowly in random order
            // Only ~10% of cells have an active extrusion
            if (h1 > 0.1) {
                return vec2(dG, 0.0); // ID 0 is terrain/floor
            }

            // Object "lattice up" cycle
            // Slower cycle, randomized phase
            float cycleSpeed = 0.2 + h2 * 0.3;
            float cycle = fract(uTime * cycleSpeed + h1);
            
            // Growth factor from 0.0 to 1.0 back to 0.0 smoothly
            float growth = smoothstep(0.0, 0.15, cycle) * smoothstep(1.0, 0.7, cycle);
            
            // Object sizes must be multiples of 0.5 to align edges perfectly with the 1x1 grid lines.
            // bSize = 0.5 (width=1), 1.0 (width=2)
            float bSize = 0.5 + floor(h1 * 3.0) * 0.5; 
            if (bSize > 1.0) bSize = 1.0;
            
            // Up to height 2.0
            float maxH = 0.5 + floor(h2 * 4.0) * 0.5; 
            float currentH = maxH * growth;
            if (currentH < 0.01) return vec2(dG, 0.0); // Don't render tiny artifacts
            
            // To rest exactly on y = -1.0, center is at y = -1.0 + currentH
            float objYCenter = -1.0 + currentH;
            vec3 localP = vec3(op.x, p.y - objYCenter, op.z); 
            
            float e = 0.015; // directly corresponds to grid line thickness bounds!
            
            // Base wireframe contour matches grid
            float dObj = sdBoxEdge(localP, vec3(bSize, currentH, bSize), e);
            
            // Multiple parts latticing up
            if (shapeType > 0.4 && currentH > 0.25) {
                // Add a tiered wider base section
                float bSize2 = bSize + 0.5; 
                float h2Val = currentH * 0.5;
                float dObj2 = sdBoxEdge(vec3(op.x, p.y - (-1.0 + h2Val), op.z), vec3(bSize2, h2Val, bSize2), e);
                dObj = min(dObj, dObj2);
            }
            if (shapeType > 0.8 && currentH > 0.5) {
                // Add an inner pillar
                float bSize3 = max(0.25, bSize - 0.5); 
                float h3Val = currentH * 1.5;
                float dObj3 = sdBoxEdge(vec3(op.x, p.y - (-1.0 + h3Val), op.z), vec3(bSize3, h3Val, bSize3), e);
                dObj = min(dObj, dObj3);
            }
            
            if (dG < dObj) return vec2(dG, 0.0); 
            return vec2(dObj, 1.0); // return object ID
        }

        vec3 calcNormal(vec3 p) {
            vec2 e = vec2(0.01, 0);
            return normalize(vec3(map(p+e.xyy).x - map(p-e.xyy).x,
                                  map(p+e.yxy).x - map(p-e.yxy).x,
                                  map(p+e.yyx).x - map(p-e.yyx).x));
        }

        void main() {
            vec2 uv = vTextureCoord;
            float aspect = uResolution.x / uResolution.y;
            uv.x *= aspect;
            uv = (uv - vec2(aspect * 0.5, 0.5)) * 2.0;

            // Roll slow like it used to
            vec3 ro = vec3(0.0, 1.5, -uTime * 1.5);
            vec3 rd = normalize(vec3(uv.x, uv.y - 0.2, -1.0)); 
            
            // Raymarch
            float t = 0.0;
            float d = 0.0;
            float m = -1.0;
            
            for(int i = 0; i < 90; i++) {
                vec3 p = ro + rd * t;
                vec2 res = map(p);
                d = res.x;
                m = res.y;
                if(d < 0.005) break;
                if(t > 60.0) { t = 60.0; m = -1.0; break; }
                t += d * 0.8; // conservative stepping for detailed wireframes
            }

            vec3 col = vec3(0.0);

            // Sky
            if(m < 0.0) {
                float sky = max(0.0, rd.y);
                col = mix(vec3(0.05, 0.0, 0.15), vec3(0.0), pow(sky, 0.5));
                if (rd.y > 0.0) col += pow(hash(uv * 50.0), 50.0); // Stars
                
                // Horizon Glow
                float horizon = smoothstep(0.1, 0.0, abs(rd.y));
                col += vec3(0.0, 0.3, 0.5) * horizon * 0.5;
            } else {
                vec3 p = ro + rd * t;
                vec3 n = calcNormal(p);
                
                vec3 baseColor = vec3(0.02, 0.0, 0.04);
                vec3 gridColor = vec3(0.0, 1.0, 0.8) * 1.5; // Cyan glow

                if (m == 0.0) {
                    // Floor grid lines
                    vec2 grid = abs(fract(p.xz) - 0.5);
                    float dw = t * 0.005; // Distance-based anti-aliasing
                    float line = min(grid.x, grid.y);
                    
                    float gridIntensity = smoothstep(0.015 + dw, 0.005, line);
                    col = mix(baseColor, gridColor, gridIntensity);

                    // Floor Shading
                    float ambient = 0.5;
                    col *= ambient + 0.5 * max(0.0, dot(n, vec3(0.0, 1.0, 0.0)));
                } else {
                    // Wireframe Objects
                    // Literally wireframes of the same grid!
                    // We shade the whole wireframe pure grid color
                    col = gridColor;

                    // Volumetric depth cue / glow variation from the base
                    float glow = smoothstep(-1.0, 2.0, p.y);
                    col += vec3(0.0, 0.5, 0.4) * glow;
                    
                    // Subtle 3D lighting so we see its structure
                    vec3 ld = normalize(vec3(0.5, 0.8, -0.5));
                    float diff = max(0.0, dot(n, ld));
                    col *= 0.8 + 0.4 * diff;
                }
            }
            
            // Fog
            float fogFactor = 1.0 - exp(-t * 0.04);
            col = mix(col, vec3(0.02, 0.0, 0.05), fogFactor);
            
            // Vignette & Gamma
            float vignette = smoothstep(1.5, 0.5, length(uv * 0.5));
            col *= vignette;
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
            this.paused = false;

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

            // Mutual Exclusion Events
            window.addEventListener('spatial-web-3d-active', () => {
                this.paused = true;
                console.log("⏸️ Background Shader Paused (3D Mode Active)");
            });

            window.addEventListener('spatial-web-3d-inactive', () => {
                if (this.paused) {
                    this.paused = false;
                    console.log("▶️ Background Shader Resumed");
                    this.render();
                }
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
            if (this.paused) return; // Stop rendering when paused

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
