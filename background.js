(function() {
  // Grab the canvas element
  const canvas = document.getElementById('webglCanvas');

  // Get the WebGL rendering context
  const gl = canvas.getContext('webgl');
  if (!gl) {
    console.error("WebGL not supported in this browser.");
    return;
  }

  // Resize canvas to fit window dimensions
  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  // Vertex Shader: Draws a full-screen quad
  const vertexShaderSource = `
    attribute vec2 a_position;
    void main() {
      gl_Position = vec4(a_position, 0.0, 1.0);
    }
  `;

  // Fragment Shader: Creates an animated color gradient using time
  const fragmentShaderSource = `
    precision mediump float;
    uniform float u_time;
    uniform vec2 u_resolution;
    void main() {
      // Normalize pixel coordinates (from 0 to 1)
      vec2 st = gl_FragCoord.xy / u_resolution;
      // Create a dynamic color based on time and position
      vec3 color = 0.5 + 0.5 * cos(u_time + st.xyx + vec3(0,2,4));
      gl_FragColor = vec4(color, 1.0);
    }
  `;

  // Helper function to compile a shader
  function compileShader(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error("Error compiling shader:", gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  // Compile shaders
  const vertexShader = compileShader(gl.VERTEX_SHADER, vertexShaderSource);
  const fragmentShader = compileShader(gl.FRAGMENT_SHADER, fragmentShaderSource);

  // Create and link the shader program
  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error("Error linking program:", gl.getProgramInfoLog(program));
    return;
  }
  gl.useProgram(program);

  // Set up a full-screen quad (two triangles covering the viewport)
  const positionLocation = gl.getAttribLocation(program, 'a_position');
  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  const positions = new Float32Array([
    -1, -1,  // bottom left
     1, -1,  // bottom right
    -1,  1,  // top left
    -1,  1,  // top left
     1, -1,  // bottom right
     1,  1   // top right
  ]);
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(positionLocation);
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

  // Get uniform locations
  const timeLocation = gl.getUniformLocation(program, 'u_time');
  const resolutionLocation = gl.getUniformLocation(program, 'u_resolution');

  // Animation loop using requestAnimationFrame
  let startTime = performance.now();
  function render() {
    let currentTime = performance.now();
    let elapsed = (currentTime - startTime) / 1000; // in seconds

    resizeCanvas(); // Ensure canvas is always up-to-date

    // Clear the canvas
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Pass uniform values
    gl.uniform1f(timeLocation, elapsed);
    gl.uniform2f(resolutionLocation, canvas.width, canvas.height);

    // Draw the quad
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    requestAnimationFrame(render);
  }
  render();
})();
