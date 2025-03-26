// background.js (Using the original complex fragment shader)

(function() {
  console.log('background.js: Script starting execution.'); // Debug log

  // Grab the canvas element
  const canvas = document.getElementById('webglCanvas');
  if (!canvas) {
      console.error("background.js: Fatal Error - Canvas element with ID 'webglCanvas' not found.");
      return;
  }
  console.log('background.js: Canvas element found.'); // Debug log

  // Get the WebGL rendering context
  const gl = canvas.getContext('webgl');
  if (!gl) {
      console.error("background.js: WebGL not supported in this browser. Background rendering stopped.");
      return;
  }
  console.log('background.js: WebGL context obtained.'); // Debug log

  // Resize canvas to fit window dimensions
  function resizeCanvas() {
      // Use clientWidth/Height for display size
      const displayWidth = canvas.clientWidth;
      const displayHeight = canvas.clientHeight;

      // Check if the canvas backing store size matches
      if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
          canvas.width = displayWidth;
          canvas.height = displayHeight;
          // Set the viewport to match the new drawing buffer size
          gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
          console.log(`background.js: Resized WebGL canvas to ${canvas.width}x${canvas.height}`); // Debug log
      }
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas(); // Initial size setup

  // Vertex Shader: Basic passthrough for fullscreen quad
  const vertexShaderSource = `
    attribute vec2 a_position; // Use vec2 since we pass 2D positions
    void main() {
      // Output position in clip space (-1 to +1)
      gl_Position = vec4(a_position, 0.0, 1.0);
    }
  `;

  // Fragment Shader: The original complex multi-phase shader
  const fragmentShaderSource = `
    precision highp float; // Use highp as in the original complex shader
    uniform float u_time;
    uniform vec2 u_resolution;

    // --- Start of original complex shader code ---
    // Noise functions
    float hash(float n) {
      return fract(sin(n) * 43758.5453);
    }

    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      float n = i.x + i.y * 57.0;
      return mix(
        mix(hash(n), hash(n + 1.0), f.x),
        mix(hash(n + 57.0), hash(n + 58.0), f.x),
        f.y
      );
    }

    // Fractal noise
    float fbm(vec2 p) {
      float sum = 0.0;
      float amp = 1.0;
      float freq = 1.0;
      // Loop count should match original if possible (original had 4)
      for(int i = 0; i < 4; i++) {
        sum += noise(p * freq) * amp;
        amp *= 0.5;
        freq *= 2.0;
      }
      return sum;
    }

    void main() {
      // Normalize pixel coordinates and center
      vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution) / min(u_resolution.x, u_resolution.y);
      // Or using the previous uv calculation method:
      // vec2 uv = gl_FragCoord.xy / u_resolution;
      // uv = uv * 2.0 - 1.0;
      // uv.x *= u_resolution.x / u_resolution.y; // Correct aspect ratio

      // Animation phase (cycles through different effects)
      float phase = mod(u_time * 0.1, 4.0);

      // Colors (matching original)
      vec3 blue = vec3(0.0, 0.3, 0.8);
      vec3 teal = vec3(0.0, 0.7, 0.7);
      vec3 green = vec3(0.0, 0.8, 0.4);
      vec3 purple = vec3(0.4, 0.0, 0.8);
      vec3 gold = vec3(0.8, 0.7, 0.0);

      // Initialize color
      vec3 color = vec3(0.0);

      // --- Shader Phases (Copied from original) ---
      // Phase 0: Initial grid effect
      if (phase < 1.0) {
          float y_warp = 0.1 + 0.05 * sin(u_time * 0.2);
          // Avoid division by zero or near-zero
          float warped_y = uv.y * y_warp;
          if (abs(0.1 - warped_y) < 0.001) warped_y = (0.1 - sign(0.1 - warped_y) * 0.001); // Adjust slightly away from 0.1 if needed
          float z = 0.1 / (0.1 - warped_y); // Be cautious with division
          z = clamp(z, 0.1, 10.0);
          vec2 warp = uv * z;

          vec2 grid = abs(fract(warp * 5.0) - 0.5);
          float line = smoothstep(0.05, 0.06, min(grid.x, grid.y)) * 0.5;
          float depth = fract(z * 0.1 + u_time * 0.1);

          color = mix(
              mix(purple, teal, sin(u_time * 0.1) * 0.5 + 0.5),
              blue,
              sin(length(warp) - u_time * 0.5) * 0.5 + 0.5
          );
          color = mix(color * 0.2, color, line * depth);

          if (phase > 0.8) {
              float t = (phase - 0.8) * 5.0;
              float circles = smoothstep(0.3, 0.31, abs(length(uv) - mix(2.0, 0.5, t)));
              color = mix(color, blue, circles * t);
          }
      }
      // Phase 1: Circular wave effect
      else if (phase < 2.0) {
          float dist = length(uv);
          float rings = sin(dist * 15.0 - u_time * 2.0) * 0.5 + 0.5;
          rings *= smoothstep(1.5, 0.5, dist); // Fade out rings

          float wave = sin(uv.y * 20.0 + u_time) * 0.05;
          vec2 waved_uv = uv + vec2(wave, 0.0);

          float n = fbm(waved_uv * 3.0 + u_time * 0.2);

          color = mix(
              mix(blue, teal, rings),
              mix(green, gold, n),
              0.5 + 0.5 * sin(u_time * 0.5)
          );
          color = mix(color * 0.2, color, rings + n * 0.5);

          if (phase > 1.8) {
              float t = (phase - 1.8) * 5.0;
              // Use waved_uv for consistency
              float cells = fract(waved_uv.x * 10.0 * t) * fract(waved_uv.y * 10.0 * t);
              color = mix(color, green, cells * t);
          }
      }
      // Phase 2: Electric pulse effect
      else if (phase < 3.0) {
          // Hexagonal grid distance calculation might be sensitive to UV mapping.
          // Using centered UV from the start.
          vec2 scaled_uv = uv * 4.0; // Scale uv for denser pattern
          vec2 r = vec2(1.0, 1.73); // Hex grid vectors
          vec2 h = r * 0.5;
          vec2 a = mod(scaled_uv, r) - h;
          vec2 b = mod(scaled_uv - h, r) - h;
          vec2 gv = length(a) < length(b) ? a : b; // Closest hex center distance

          float pulse = sin(u_time * 3.0) * 0.5 + 0.5;
          // Adjust electric effect calculation based on hex distance
          float electric = sin(length(gv) * 10.0 - u_time * 3.0); // Adjusted scale
          electric = smoothstep(0.0, 0.1, abs(electric));

          float distortion = fbm(uv * 2.0 + vec2(u_time * 0.1, 0.0));
          vec3 baseColor = mix(teal, green, distortion);
          vec3 glowColor = mix(blue, purple, pulse);

          color = mix(baseColor * 0.2, glowColor, electric * pulse);

          float detail = abs(sin(uv.x * 20.0 + u_time)) * abs(sin(uv.y * 20.0 - u_time));
          color += glowColor * detail * 0.1;

          if (phase > 2.8) {
              float t = (phase - 2.8) * 5.0;
              float angle = atan(uv.y, uv.x); // Use original uv for angle/radius
              float vortex = angle / (2.0 * 3.14159) + 0.5;
              vortex = fract(vortex * 5.0 + t + u_time * 0.1); // Simplified vortex animation
              color = mix(color, purple, vortex * t);
          }
      }
      // Phase 3: Vortex effect
      else {
          float angle = atan(uv.y, uv.x);
          float radius = length(uv);
          // Ensure spiral_angle calculation matches original intent
          float spiral_angle = angle * 5.0 + radius * 10.0 - u_time * 2.0; // Adjusted radius factor
          float spiral = sin(spiral_angle) * 0.5 + 0.5; // Map to 0-1

          float radius_distorted = radius + sin(angle * 8.0 + u_time * 0.5) * 0.05; // Slightly animated distortion

          float bands = fract(radius_distorted * 5.0 - u_time * 0.5);
          bands = smoothstep(0.0, 0.2, bands) * smoothstep(1.0, 0.8, bands); // Create bands

          float turb = fbm(vec2(radius_distorted * 5.0, angle * 2.0) + u_time * 0.1);

          vec3 deepColor = mix(purple, blue, sin(radius_distorted * 10.0) * 0.5 + 0.5);
          vec3 brightColor = mix(gold, teal, cos(angle * 3.0) * 0.5 + 0.5);

          color = mix(deepColor, brightColor, bands + turb * 0.3); // Adjusted turbulence mix
          color = mix(color, brightColor, spiral * 0.2); // Mix in spiral subtly

          if (phase > 3.8) {
              float t = (phase - 3.8) * 5.0;
              // Use original uv for transition grid
              float grid_x = smoothstep(0.01, 0.05, abs(fract(uv.x * 10.0 * t + u_time * 0.1) - 0.5));
              float grid_y = smoothstep(0.01, 0.05, abs(fract(uv.y * 10.0 * t + u_time * 0.1) - 0.5));
              color = mix(color, blue, max(grid_x, grid_y) * t); // Transition using max for thicker lines
          }
      }
      // --- End Shader Phases ---

      // Add subtle pulse (copied from original)
      color += 0.05 * sin(u_time * 2.0 + uv.x * 5.0) * sin(u_time * 2.0 + uv.y * 5.0);

      // Add vignette (copied from original)
      float vignette = smoothstep(1.2, 0.5, length(uv)); // Adjust length based on chosen uv mapping
      color *= vignette;

      // Clamp color (copied from original)
      color = clamp(color, 0.0, 1.0);

      gl_FragColor = vec4(color, 1.0);
      // --- End of original complex shader code ---
    }
  `;
  console.log('background.js: Complex fragment shader source defined.'); // Debug log

  // Helper function to compile a shader
  function compileShader(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error(`background.js: Error compiling shader (${type === gl.VERTEX_SHADER ? 'Vertex' : 'Fragment'}):`, gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  // Compile shaders
  const vertexShader = compileShader(gl.VERTEX_SHADER, vertexShaderSource);
  const fragmentShader = compileShader(gl.FRAGMENT_SHADER, fragmentShaderSource);

  if (!vertexShader || !fragmentShader) return; // Exit if compilation failed

  // Create and link the shader program
  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error("background.js: Error linking program:", gl.getProgramInfoLog(program));
    // Clean up shaders if linking fails
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    return;
  }
  gl.useProgram(program); // Use the program from now on
  console.log('background.js: Shaders compiled and program linked.'); // Debug log

  // --- Geometry Setup (remains the same) ---
  const positionAttributeLocation = gl.getAttribLocation(program, 'a_position');
  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  const positions = new Float32Array([
    -1, -1,   1, -1,  -1,  1,
    -1,  1,   1, -1,   1,  1
  ]);
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(positionAttributeLocation);
  gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);
  console.log('background.js: Geometry setup complete.'); // Debug log

  // Get uniform locations (remain the same)
  const timeUniformLocation = gl.getUniformLocation(program, 'u_time');
  const resolutionUniformLocation = gl.getUniformLocation(program, 'u_resolution');
  console.log('background.js: Uniform locations obtained.'); // Debug log

  // --- Render Loop ---
  let startTime = performance.now();
  let frameCount = 0; // For logging first frame
  function render(now) {
    // Calculate time
    let elapsed = (now - startTime) * 0.001; // in seconds

    if (frameCount === 0) console.log('background.js: First render frame executing.'); // Debug log
    frameCount++;

    resizeCanvas(); // Ensure canvas size and viewport are correct

    // Clear the canvas
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Use the program (redundant if only one program, but good practice)
    gl.useProgram(program);

    // Pass uniform values
    gl.uniform1f(timeUniformLocation, elapsed);
    gl.uniform2f(resolutionUniformLocation, canvas.width, canvas.height);

    // Bind attributes (already set up, binding buffer might be needed if switching buffers)
    // gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer); // Often not needed if only one buffer
    // gl.enableVertexAttribArray(positionAttributeLocation); // Already enabled
    // gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0); // Pointer already set

    // Draw the quad
    gl.drawArrays(gl.TRIANGLES, 0, 6); // 6 vertices for two triangles

    requestAnimationFrame(render); // Loop
  }

  console.log('background.js: Requesting initial animation frame.'); // Debug log
  render(); // Start the loop

})(); // End of IIFE

console.log('background.js: Script execution finished.'); // Debug log
