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

// Fragment Shader: Extended to 14 phases (WARNING: High Complexity/Performance Risk)
const fragmentShaderSource = `
  precision highp float;
  uniform float u_time;
  uniform vec2 u_resolution;

  // --- Constants ---
  const vec3 COLOR_BLUE   = vec3(0.0, 0.3, 0.8);
  const vec3 COLOR_TEAL   = vec3(0.0, 0.7, 0.7);
  const vec3 COLOR_GREEN  = vec3(0.0, 0.8, 0.4);
  const vec3 COLOR_PURPLE = vec3(0.4, 0.0, 0.8);
  const vec3 COLOR_GOLD   = vec3(0.8, 0.7, 0.0);
  const vec3 COLOR_WHITE  = vec3(1.0, 1.0, 1.0);
  const vec3 COLOR_RED    = vec3(0.9, 0.1, 0.1); // Added Color
  const vec3 COLOR_CYAN   = vec3(0.1, 0.9, 0.9); // Added Color
  const float PI = 3.14159265359;

  // --- Noise Functions (Keep from original) ---
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

  float fbm(vec2 p) {
    float sum = 0.0;
    float amp = 1.0;
    float freq = 1.0;
    for(int i = 0; i < 4; i++) { // Keep original 4 octaves for performance
      sum += noise(p * freq) * amp;
      amp *= 0.5;
      freq *= 2.0;
    }
    return sum;
  }

  // --- Helpers ---
  mat2 rotate2d(float angle){
      return mat2(cos(angle),-sin(angle),
                  sin(angle),cos(angle));
  }

  // --- Main ---
  void main() {
    // Consistent UV mapping with aspect correction
    vec2 uv = gl_FragCoord.xy / u_resolution;
    uv = uv * 2.0 - 1.0;
    uv.x *= u_resolution.x / u_resolution.y;

    // --- Phase Calculation (0 to 13.999...) ---
    float totalPhases = 14.0;
    float cycleSpeed = 0.2; // Adjusts overall speed (14 phases / 70 sec cycle = 0.2)
    float phase = mod(u_time * cycleSpeed, totalPhases);

    // Initialize color
    vec3 color = vec3(0.0);

    // --- Original 4 Phases ---
    // Phase 0: Initial grid effect
    if (phase < 1.0) {
        float y_warp = 0.1 + 0.05 * sin(u_time * 0.2);
        float warped_y = uv.y * y_warp;
        if (abs(0.1 - warped_y) < 0.001) warped_y = (0.1 - sign(0.1 - warped_y) * 0.001);
        float z = 0.1 / (0.1 - warped_y);
        z = clamp(z, 0.1, 10.0);
        vec2 warp = uv * z;
        vec2 grid = abs(fract(warp * 5.0) - 0.5);
        float line = smoothstep(0.05, 0.06, min(grid.x, grid.y)) * 0.5;
        float depth = fract(z * 0.1 + u_time * 0.1);
        color = mix(
            mix(COLOR_PURPLE, COLOR_TEAL, sin(u_time * 0.1) * 0.5 + 0.5),
            COLOR_BLUE,
            sin(length(warp) - u_time * 0.5) * 0.5 + 0.5
        );
        color = mix(color * 0.2, color, line * depth);
        // Transition effect (original)
        if (phase > 0.8) { // Using original phase value here
            float t = (phase - 0.8) * 5.0;
            float circles = smoothstep(0.3, 0.31, abs(length(uv) - mix(2.0, 0.5, t)));
            color = mix(color, COLOR_BLUE, circles * t);
        }
    }
    // Phase 1: Circular wave effect
    else if (phase < 2.0) {
        float dist = length(uv);
        float rings = sin(dist * 15.0 - u_time * 2.0) * 0.5 + 0.5;
        rings *= smoothstep(1.5, 0.5, dist);
        float wave = sin(uv.y * 20.0 + u_time) * 0.05;
        vec2 waved_uv = uv + vec2(wave, 0.0);
        float n = fbm(waved_uv * 3.0 + u_time * 0.2);
        color = mix(
            mix(COLOR_BLUE, COLOR_TEAL, rings),
            mix(COLOR_GREEN, COLOR_GOLD, n),
            0.5 + 0.5 * sin(u_time * 0.5)
        );
        color = mix(color * 0.2, color, rings + n * 0.5);
        // Transition effect (original)
        if (phase > 1.8) {
             float t = (phase - 1.8) * 5.0;
             float cells = fract(waved_uv.x * 10.0 * t) * fract(waved_uv.y * 10.0 * t);
             color = mix(color, COLOR_GREEN, cells * t);
        }
    }
    // Phase 2: Electric pulse effect
    else if (phase < 3.0) {
        vec2 scaled_uv = uv * 4.0;
        vec2 r = vec2(1.0, 1.73); vec2 h = r * 0.5;
        vec2 a = mod(scaled_uv, r) - h; vec2 b = mod(scaled_uv - h, r) - h;
        vec2 gv = length(a) < length(b) ? a : b;
        float pulse = sin(u_time * 3.0) * 0.5 + 0.5;
        float electric = sin(length(gv) * 10.0 - u_time * 3.0);
        electric = smoothstep(0.0, 0.1, abs(electric));
        float distortion = fbm(uv * 2.0 + vec2(u_time * 0.1, 0.0));
        vec3 baseColor = mix(COLOR_TEAL, COLOR_GREEN, distortion);
        vec3 glowColor = mix(COLOR_BLUE, COLOR_PURPLE, pulse);
        color = mix(baseColor * 0.2, glowColor, electric * pulse);
        float detail = abs(sin(uv.x * 20.0 + u_time)) * abs(sin(uv.y * 20.0 - u_time));
        color += glowColor * detail * 0.1;
        // Transition effect (original)
         if (phase > 2.8) {
            float t = (phase - 2.8) * 5.0;
            float angle = atan(uv.y, uv.x);
            float vortex = angle / (2.0 * PI) + 0.5;
            vortex = fract(vortex * 5.0 + t + u_time * 0.1);
            color = mix(color, COLOR_PURPLE, vortex * t);
        }
    }
    // Phase 3: Vortex effect
    else if (phase < 4.0) {
        float angle = atan(uv.y, uv.x);
        float radius = length(uv);
        float spiral_angle = angle * 5.0 + radius * 10.0 - u_time * 2.0;
        float spiral = sin(spiral_angle) * 0.5 + 0.5;
        float radius_distorted = radius + sin(angle * 8.0 + u_time * 0.5) * 0.05;
        float bands = fract(radius_distorted * 5.0 - u_time * 0.5);
        bands = smoothstep(0.0, 0.2, bands) * smoothstep(1.0, 0.8, bands);
        float turb = fbm(vec2(radius_distorted * 5.0, angle * 2.0) + u_time * 0.1);
        vec3 deepColor = mix(COLOR_PURPLE, COLOR_BLUE, sin(radius_distorted * 10.0) * 0.5 + 0.5);
        vec3 brightColor = mix(COLOR_GOLD, COLOR_TEAL, cos(angle * 3.0) * 0.5 + 0.5);
        color = mix(deepColor, brightColor, bands + turb * 0.3);
        color = mix(color, brightColor, spiral * 0.2);
        // Transition effect (original)
        if (phase > 3.8) {
           float t = (phase - 3.8) * 5.0;
           float grid_x = smoothstep(0.01, 0.05, abs(fract(uv.x * 10.0 * t + u_time * 0.1) - 0.5));
           float grid_y = smoothstep(0.01, 0.05, abs(fract(uv.y * 10.0 * t + u_time * 0.1) - 0.5));
           color = mix(color, COLOR_BLUE, max(grid_x, grid_y) * t);
        }
    }

    // --- NEW PHASES (4 to 13) --- Simpler effects ---

    // Phase 4: Noise Flow
    else if (phase < 5.0) {
        vec2 flow_uv = uv + vec2(u_time * 0.1, u_time * 0.05);
        float n = fbm(flow_uv * 2.0);
        color = mix(COLOR_GREEN, COLOR_TEAL, n * 0.5 + 0.5);
        color *= 0.6 + 0.4 * sin(n * 10.0 + u_time);
    }
    // Phase 5: Rotating Rays
    else if (phase < 6.0) {
        float angle = atan(uv.y, uv.x) + u_time * 0.5;
        float radius = length(uv);
        float rays = smoothstep(0.0, 0.1, abs(fract(angle / (PI / 4.0)) - 0.5)); // 8 rays
        color = mix(COLOR_BLACK, COLOR_GOLD, rays * (1.0 - smoothstep(0.8, 1.5, radius)));
        color += fbm(uv * 3.0 + u_time * 0.1) * 0.2 * COLOR_PURPLE;
    }
    // Phase 6: Digital Rain (Simple)
    else if (phase < 7.0) {
        vec2 rain_uv = uv * vec2(5.0, 1.0); // Stretch horizontally
        rain_uv.y += u_time * 0.5;
        float rain_val = fract(sin(floor(rain_uv.x) * 13.7 + floor(rain_uv.y) * 9.3) * 437.5); // Random seed per cell
        float rain_intensity = smoothstep(0.0, 0.1, fract(rain_uv.y)) * smoothstep(1.0, 0.9, fract(rain_uv.y)); // Drop shape
        if (rain_val > 0.8) { // Only show some drops
             color = COLOR_GREEN * rain_intensity;
        } else {
             color = COLOR_BLACK;
        }
        color += noise(uv * 10.0) * 0.1; // Background noise
    }
    // Phase 7: Simple Plasma
    else if (phase < 8.0) {
        float plasma = 0.0;
        plasma += sin(length(uv + vec2(0.0, sin(u_time * 0.3))) * 8.0 + u_time);
        plasma += sin(length(uv + vec2(sin(u_time * 0.5), 0.0)) * 10.0 - u_time * 1.2);
        plasma = plasma * 0.5 + 0.5;
        color = mix(COLOR_RED, COLOR_BLUE, plasma);
        color = mix(color, COLOR_GOLD, fbm(uv * 3.0 - u_time * 0.1));
    }
    // Phase 8: Scanlines & Color Shift
    else if (phase < 9.0) {
        float scanline = sin(gl_FragCoord.y * 2.0 + u_time * 5.0) * 0.5 + 0.5;
        scanline = smoothstep(0.4, 0.6, scanline) * 0.8 + 0.2; // Sharpen scanlines
        vec3 base = fbm(uv * 1.5 + u_time * 0.05) * vec3(0.5, 0.8, 1.0);
        // Shift colors based on horizontal position
        color.r = texture2D(u_texture, uv + vec2(0.01 * sin(u_time), 0.0)).r; // Requires a texture uniform! Placeholder logic:
        color.r = fbm((uv + vec2(0.01 * sin(u_time), 0.0)) * 1.5 + u_time * 0.05) * 0.5;
        color.g = fbm(uv * 1.5 + u_time * 0.05) * 0.8;
        color.b = fbm((uv - vec2(0.01 * sin(u_time), 0.0)) * 1.5 + u_time * 0.05) * 1.0;

        color *= scanline;
    }
     // Phase 9: Truchet Tiles (Simplified)
    else if (phase < 10.0) {
        vec2 tile_uv = fract(uv * 5.0); // Scale for tiling
        vec2 tile_id = floor(uv * 5.0);
        float pattern = hash(tile_id.x * 31.7 + tile_id.y * 19.3 + floor(u_time * 2.0)); // Change pattern over time

        float val;
        if (pattern < 0.5) { // Diagonal pattern 1
            val = smoothstep(0.48, 0.52, abs(tile_uv.x - tile_uv.y));
        } else { // Diagonal pattern 2
            val = smoothstep(0.48, 0.52, abs(tile_uv.x + tile_uv.y - 1.0));
        }
        color = mix(COLOR_CYAN, COLOR_PURPLE, val);
    }
    // Phase 10: Warped Checkerboard
    else if (phase < 11.0) {
        vec2 warp_uv = uv + fbm(uv * 2.0 + u_time * 0.1) * 0.3; // Warp coordinates
        float checker = mod(floor(warp_uv.x * 6.0) + floor(warp_uv.y * 6.0), 2.0);
        color = mix(COLOR_GOLD * 0.8, COLOR_BLUE * 0.6, checker);
    }
    // Phase 11: Simple Glitch Effect
    else if (phase < 12.0) {
        float glitch_t = fract(u_time * 1.5); // Timing for glitch
        float glitch_line = hash(floor(uv.y * 10.0 + u_time * 5.0)); // Random line selection
        float glitch_strength = smoothstep(0.9, 0.95, glitch_line) * (0.5 + 0.5 * sin(glitch_t * PI * 20.0)) * 0.1; // Intensity pulse

        vec2 offset_uv = uv + vec2(glitch_strength * (hash(uv.y + 0.1) - 0.5) * 2.0, 0.0); // Horizontal offset

        // Simulate reading offset color (use noise instead of texture)
        float r = fbm(offset_uv * 3.0 + 0.1);
        float g = fbm(offset_uv * 3.0 + 0.2);
        float b = fbm(offset_uv * 3.0 + 0.3);

        color = vec3(r, g, b);
        color = mix(color, COLOR_RED, glitch_strength * 5.0); // Add red tint on strong glitches
    }
    // Phase 12: Expanding Boxes
    else if (phase < 13.0) {
        float box_t = fract(u_time * 0.4); // Box expansion timing
        float box_size = box_t * 1.5; // Size expands
        float box_dist = max(abs(uv.x), abs(uv.y)); // Distance from center in box shape
        float box_edge = smoothstep(box_size - 0.05, box_size + 0.05, box_dist);
        float box_glow = smoothstep(box_size - 0.1, box_size + 0.1, box_dist);
        box_glow *= (1.0 - smoothstep(box_size + 0.1, box_size + 0.2, box_dist)); // Make it a band

        color = mix(COLOR_TEAL, COLOR_PURPLE, box_edge) * (1.0 - box_edge) * 0.5; // Fill color
        color += COLOR_WHITE * box_glow * 0.8; // Edge glow
    }
    // Phase 13: Fading Noise (Transition back towards start)
    else { // phase < 14.0
        float fade_n = fbm(uv * (2.0 + 8.0 * (1.0-fract(phase))) + u_time * 0.1); // Noise scales down
        float fade_amount = 0.5 + 0.5*sin(fract(phase)*PI); // Fade intensity
        color = mix(COLOR_BLUE, COLOR_PURPLE, fade_n);
        color *= mix(1.0, 0.3, fade_amount); // Fade to darker
    }

    // --- Final Global Adjustments ---

    // Subtle global pulse (copied from original)
    color += 0.05 * sin(u_time * 2.0 + uv.x * 5.0) * sin(u_time * 2.0 + uv.y * 5.0);

    // Vignette (copied from original)
    float vignette = smoothstep(1.2, 0.5, length(uv));
    color *= vignette;

    // Clamp color (copied from original)
    color = clamp(color, 0.0, 1.0);

    gl_FragColor = vec4(color, 1.0);
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
