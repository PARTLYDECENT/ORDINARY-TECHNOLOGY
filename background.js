(function() {
  console.log('Multi-Shader Background System: Initializing');

  // Configuration for shader management
  const SHADER_CONFIG = {
    transitionDuration: 2000, // Transition between shaders (ms)
    displayDuration: 60000,   // Each shader displays for 1 minute
    enableConsoleLogging: true
  };

  // Utility Logging Function
  function log(message) {
    if (SHADER_CONFIG.enableConsoleLogging) {
      console.log(`[Multi-Shader] ${message}`);
    }
  }

  // Shader Management Class
  class ShaderManager {
    constructor(canvas) {
      this.canvas = canvas;
      this.gl = canvas.getContext('webgl');
      this.shaders = [];
      this.currentShaderIndex = 0;
      this.isTransitioning = false;

      if (!this.gl) {
        console.error('WebGL not supported');
        return;
      }

      this.setupCanvasResizing();
    }

    setupCanvasResizing() {
      const resizeCanvas = () => {
        const displayWidth = this.canvas.clientWidth;
        const displayHeight = this.canvas.clientHeight;

        if (this.canvas.width !== displayWidth || this.canvas.height !== displayHeight) {
          this.canvas.width = displayWidth;
          this.canvas.height = displayHeight;
          this.gl.viewport(0, 0, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);
        }
      };

      window.addEventListener('resize', resizeCanvas);
      resizeCanvas();
    }

    // Universal Vertex Shader (works with all fragment shaders)
    static getVertexShader() {
      return `
        attribute vec2 a_position;
        void main() {
          gl_Position = vec4(a_position, 0.0, 1.0);
        }
      `;
    }

    // Shader compilation utility
    compileShader(type, source) {
      const gl = this.gl;
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);

      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compilation error:', gl.getShaderInfoLog(shader));
        return null;
      }
      return shader;
    }

    // Program creation utility
    createProgram(vertexShader, fragmentShader) {
      const gl = this.gl;
      const program = gl.createProgram();
      gl.attachShader(program, vertexShader);
      gl.attachShader(program, fragmentShader);
      gl.linkProgram(program);

      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Program linking error:', gl.getProgramInfoLog(program));
        return null;
      }
      return program;
    }

    // Add a new shader to the rotation
    addShader(fragmentShaderSource) {
      const gl = this.gl;
      const vertexShader = this.compileShader(gl.VERTEX_SHADER, ShaderManager.getVertexShader());
      const fragmentShader = this.compileShader(gl.FRAGMENT_SHADER, fragmentShaderSource);

      if (!vertexShader || !fragmentShader) return null;

      const program = this.createProgram(vertexShader, fragmentShader);
      if (!program) return null;

      const shader = {
        program,
        vertexShader,
        fragmentShader,
        startTime: null,
        uniforms: {}
      };

      this.shaders.push(shader);
      return shader;
    }

    // Transition between shaders
    transitionToNextShader() {
      if (this.shaders.length <= 1) return;

      this.isTransitioning = true;
      this.currentShaderIndex = (this.currentShaderIndex + 1) % this.shaders.length;
      
      log(`Transitioning to Shader ${this.currentShaderIndex + 1}`);
    }

    // Main render loop
    render() {
      if (this.shaders.length === 0) return;

      const gl = this.gl;
      const now = performance.now();
      const currentShader = this.shaders[this.currentShaderIndex];

      // Setup geometry
      const positionBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      const positions = new Float32Array([
        -1, -1,   1, -1,  -1,  1,
        -1,  1,   1, -1,   1,  1
      ]);
      gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

      // Use current shader program
      gl.useProgram(currentShader.program);

      // Set up attribute and uniforms dynamically
      const positionAttributeLocation = gl.getAttribLocation(currentShader.program, 'a_position');
      gl.enableVertexAttribArray(positionAttributeLocation);
      gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

      // Standard uniforms
      const timeUniform = gl.getUniformLocation(currentShader.program, 'u_time');
      const resolutionUniform = gl.getUniformLocation(currentShader.program, 'u_resolution');

      // Track first render of each shader
      if (!currentShader.startTime) {
        currentShader.startTime = now;
      }

      const elapsedTime = (now - currentShader.startTime) * 0.001;

      // Transition check
      if (now - currentShader.startTime > SHADER_CONFIG.displayDuration) {
        this.transitionToNextShader();
        currentShader.startTime = now;
      }

      // Clear and render
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.uniform1f(timeUniform, elapsedTime);
      gl.uniform2f(resolutionUniform, gl.canvas.width, gl.canvas.height);

      gl.drawArrays(gl.TRIANGLES, 0, 6);

      // Continue rendering
      requestAnimationFrame(() => this.render());
    }

    start() {
      log('Shader System Starting');
      this.render();
    }
  }

  // Initialize shader system
  const canvas = document.getElementById('webglCanvas');
  const shaderManager = new ShaderManager(canvas);

 precision highp float;

uniform float u_time;
uniform vec2 u_resolution;

// Madness-inducing noise functions
float hash(vec2 p) {
    p = 50.0 * fract(p * 0.3183099 + vec2(0.71, 0.113));
    return -1.0 + 2.0 * fract(p.x * p.y * (p.x + p.y));
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    
    vec2 u = f * f * (3.0 - 2.0 * f);
    
    return mix(mix(hash(i + vec2(0.0, 0.0)), 
                   hash(i + vec2(1.0, 0.0)), u.x),
               mix(hash(i + vec2(0.0, 1.0)), 
                   hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

// Warped reality transformation
vec3 warpReality(vec2 fragCoord) {
    vec2 uv = fragCoord / u_resolution.xy;
    
    // Recursive distortion layers
    float timeWarp = u_time * 0.5;
    
    // Nightmare-fuel geometric transformations
    uv += vec2(
        sin(uv.y * 10.0 + timeWarp) * 0.1 * cos(timeWarp),
        cos(uv.x * 8.0 + timeWarp) * 0.15 * sin(timeWarp)
    );
    
    // Fractal-like noise mutations
    float noiseIntensity = noise(uv * 20.0 + timeWarp) * 2.0;
    
    // Psychedelic color mutations
    vec3 color = vec3(
        abs(sin(uv.x * 5.0 + timeWarp + noiseIntensity)),
        abs(cos(uv.y * 6.0 - timeWarp * 1.5)),
        abs(tan(uv.x * uv.y * 4.0 + timeWarp * 2.0))
    );
    
    // Additional reality-breaking effects
    color *= 1.0 + 0.5 * sin(length(uv - 0.5) * 10.0 + timeWarp);
    color = pow(color, vec3(1.3 + 0.3 * sin(timeWarp)));
    
    // Glitchy edge distortions
    float glitchIntensity = sin(timeWarp * 3.0) * 0.05;
    color += glitchIntensity * noise(uv * 100.0);
    
    return clamp(color, 0.0, 1.0);
}

void main() {
    vec2 fragCoord = gl_FragCoord.xy;
    vec3 finalColor = warpReality(fragCoord);
    
    // Occasional total reality breakdown
    float breakdown = abs(sin(u_time * 0.2));
    if (breakdown > 0.95) {
        finalColor = vec3(1.0) - finalColor;
    }
    
    gl_FragColor = vec4(finalColor, 1.0);
}

  // EXAMPLE SHADER 2 (A different style)
  const complexShader2 = `
    precision highp float;
    uniform float u_time;
    uniform vec2 u_resolution;

    float random(vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
    }

    void main() {
        vec2 uv = gl_FragCoord.xy / u_resolution.xy;
        uv = uv * 2.0 - 1.0;
        uv.x *= u_resolution.x / u_resolution.y;

        float timeWarp = u_time * 0.2;
        
        // Spiral pattern
        float angle = atan(uv.y, uv.x);
        float radius = length(uv);
        
        float spiral = sin(radius * 10.0 - angle * 5.0 + timeWarp) * 0.5 + 0.5;
        
        // Color manipulation
        vec3 color = vec3(
            spiral * abs(sin(timeWarp)),
            spiral * abs(cos(timeWarp * 1.3)),
            spiral * abs(sin(timeWarp * 1.7))
        );

        gl_FragColor = vec4(color, 1.0);
    }
  `;

  // More example shaders can be added here
  const complexShader3 = `...`; // Future shader designs

  // Add shaders to the manager
  shaderManager.addShader(complexShader1);
  shaderManager.addShader(complexShader2);
  // shaderManager.addShader(complexShader3);  // Uncomment to add more

  // Start the shader system
  shaderManager.start();

  // Expose shader management globally for dynamic extension
  window.ShaderManager = {
    addShader: (fragmentShader) => shaderManager.addShader(fragmentShader),
    getCurrentShaderIndex: () => shaderManager.currentShaderIndex,
    getTotalShaders: () => shaderManager.shaders.length
  };
})();
