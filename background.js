// Global ShaderManager initialization
let ShaderManager = null;

(function() {
  console.log('Advanced Multi-Shader Background System: Initializing');

  // Configuration for shader management
  const SHADER_CONFIG = {
    transitionDuration: 3000,  // Smoother transitions
    displayDuration: 90000,    // Longer display time for complex shaders
    enableConsoleLogging: true
  };

  // Utility Logging Function
  function log(message) {
    if (SHADER_CONFIG.enableConsoleLogging) {
      console.log(`[Multi-Shader] ${message}`);
    }
  }

  // Shader Management Class
  class WebGLShaderManager {
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

    static getVertexShader() {
      return `
        attribute vec2 a_position;
        void main() {
          gl_Position = vec4(a_position, 0.0, 1.0);
        }
      `;
    }

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

    addShader(fragmentShaderSource) {
      const gl = this.gl;
      const vertexShader = this.compileShader(gl.VERTEX_SHADER, WebGLShaderManager.getVertexShader());
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

    transitionToNextShader() {
      if (this.shaders.length <= 1) return;

      this.isTransitioning = true;
      this.currentShaderIndex = (this.currentShaderIndex + 1) % this.shaders.length;
      
      log(`Transitioning to Shader ${this.currentShaderIndex + 1}`);
    }

    render() {
      if (this.shaders.length === 0) return;

      const gl = this.gl;
      const now = performance.now();
      const currentShader = this.shaders[this.currentShaderIndex];

      const positionBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      const positions = new Float32Array([
        -1, -1,   1, -1,  -1,  1,
        -1,  1,   1, -1,   1,  1
      ]);
      gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

      gl.useProgram(currentShader.program);

      const positionAttributeLocation = gl.getAttribLocation(currentShader.program, 'a_position');
      gl.enableVertexAttribArray(positionAttributeLocation);
      gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

      const timeUniform = gl.getUniformLocation(currentShader.program, 'u_time');
      const resolutionUniform = gl.getUniformLocation(currentShader.program, 'u_resolution');

      if (!currentShader.startTime) {
        currentShader.startTime = now;
      }

      const elapsedTime = (now - currentShader.startTime) * 0.001;

      if (now - currentShader.startTime > SHADER_CONFIG.displayDuration) {
        this.transitionToNextShader();
        currentShader.startTime = now;
      }

      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.uniform1f(timeUniform, elapsedTime);
      gl.uniform2f(resolutionUniform, gl.canvas.width, gl.canvas.height);

      gl.drawArrays(gl.TRIANGLES, 0, 6);

      requestAnimationFrame(() => this.render());
    }

    start() {
      log('Shader System Starting');
      this.render();
    }
  }

  // Shader Definitions (from previous implementation)
  const shaders = [
    // Fractal Landscape Shader (previous implementation)
    `precision highp float;
    // ... (shader code from previous implementation)
    `,
    
    // Cosmic Particle Shader (previous implementation)
    `precision highp float;
    // ... (shader code from previous implementation)
    `,
    
    // Organic Fluid Shader (previous implementation)
    `precision highp float;
    // ... (shader code from previous implementation)
    `
  ];

  // Global initialization function
  function initShaderSystem(canvasId) {
    const canvas = document.getElementById(canvasId);
    
    if (!canvas) {
      console.error(`Canvas with ID '${canvasId}' not found`);
      return null;
    }

    ShaderManager = new WebGLShaderManager(canvas);
    
    // Add all shaders
    shaders.forEach(shaderSource => {
      ShaderManager.addShader(shaderSource);
    });

    ShaderManager.start();
    return ShaderManager;
  }

  // Expose global initialization function
  window.initShaderSystem = initShaderSystem;
})();
