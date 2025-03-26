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

////////////////////////////////////////////////////////////////////////////////////////SHADERSSHADERSHADER 
////////////////////////////////////////////////////////////////////////////////////////SHADERSSHADERSHADER ////////////////////////////////////////////////////////////////////////////////////////SHADERSSHADERSHADER ////////////////////////////////////////////////////////////////////////////////////////SHADERSSHADERSHADER 





// Enhanced Fragment Shader
const fragmentShaderSource = `
  precision highp float; // Stick with highp for quality
  uniform float u_time;
  uniform vec2 u_resolution;

  // --- Constants ---
  const vec3 COLOR_BLUE   = vec3(0.0, 0.3, 0.8);
  const vec3 COLOR_TEAL   = vec3(0.0, 0.7, 0.7);
  const vec3 COLOR_GREEN  = vec3(0.0, 0.8, 0.4);
  const vec3 COLOR_PURPLE = vec3(0.4, 0.0, 0.8);
  const vec3 COLOR_GOLD   = vec3(0.8, 0.7, 0.0);
  const vec3 COLOR_WHITE  = vec3(1.0, 1.0, 1.0);
  const vec3 COLOR_BLACK  = vec3(0.0, 0.0, 0.0);
  const float PI = 3.14159265359;

  // --- Noise Functions (Slightly higher quality FBM) ---
  float hash(float n) {
    return fract(sin(n) * 43758.5453123); // Slightly different seed
  }

  // 2D Hash - needed for better grain
  vec2 hash2(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return fract(sin(p) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f); // Smoothstep interpolation

    float n = i.x + i.y * 57.0;
    return mix(
      mix(hash(n + 0.0), hash(n + 1.0), f.x),
      mix(hash(n + 57.0), hash(n + 58.0), f.x),
      f.y
    );
  }

  // Enhanced FBM - More octaves for detail
  float fbm(vec2 p) {
    float sum = 0.0;
    float amp = 0.7; // Start slightly lower amplitude
    float freq = 1.0;
    // Increase octaves for more detail (adjust 5 or 6 based on performance)
    for(int i = 0; i < 5; i++) {
      sum += noise(p * freq) * amp;
      amp *= 0.5;
      freq *= 2.1; // Slightly non-power-of-2 frequency increase
    }
    return sum;
  }

  // --- Helper Functions ---
  // Rotation matrix
  mat2 rotate2d(float angle) {
      return mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
  }

  // Smooth minimum function
  float smin(float a, float b, float k) {
      float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
      return mix(b, a, h) - k * h * (1.0 - h);
  }

  // --- Main Shader Logic ---
  void main() {
    // Standard aspect-corrected UVs [-aspect..aspect, -1..1] approx
    vec2 uv = gl_FragCoord.xy / u_resolution;
    uv = uv * 2.0 - 1.0;
    uv.x *= u_resolution.x / u_resolution.y;

    // Total animation duration for 4 phases
    float cycleDuration = 40.0; // e.g., 10 seconds per phase
    float phaseTime = mod(u_time, cycleDuration);
    float phaseIndex = floor(phaseTime / (cycleDuration / 4.0)); // 0, 1, 2, 3

    // --- Time within the current phase [0, 1] ---
    float tPhase = fract(phaseTime / (cycleDuration / 4.0));
    // Smoothed time for transitions
    float tSmooth = smoothstep(0.0, 1.0, tPhase);

    // --- Transition calculation ---
    float transitionDuration = 0.1; // e.g., 10% of phase time for transition
    float fadeIn = smoothstep(0.0, transitionDuration, tPhase);
    float fadeOut = 1.0 - smoothstep(1.0 - transitionDuration, 1.0, tPhase);
    float transitionFactor = fadeIn * fadeOut; // Strongest mid-phase

    // Initialize final color
    vec3 finalColor = vec3(0.0);

    // --- Phase 0: Warped Grid ---
    if (phaseIndex == 0.0) {
        vec2 gridUv = uv;
        // Add subtle wobble
        gridUv += noise(uv * 3.0 + u_time * 0.2) * 0.1;

        float y_warp = 0.15 + 0.08 * sin(u_time * 0.3);
        float warped_y = gridUv.y * y_warp;
        float denom = 0.1 - warped_y;
        // More robust division check
        if (abs(denom) < 0.001) denom = sign(denom) * 0.001;
        float z = 0.1 / denom;
        z = clamp(z, 0.1, 15.0); // Increased max clamp
        vec2 warp = gridUv * z;

        // Sharper grid lines
        vec2 grid = fract(warp * 6.0); // Slightly denser grid
        float lineX = smoothstep(0.0, 0.03, grid.x) * smoothstep(1.0, 0.97, grid.x);
        float lineY = smoothstep(0.0, 0.03, grid.y) * smoothstep(1.0, 0.97, grid.y);
        float line = max(lineX, lineY); // Use max for solid grid
        line = 1.0 - line; // Invert: lines are bright

        float depth = fract(z * 0.1 + u_time * 0.15);

        vec3 baseGridColor = mix(
            mix(COLOR_PURPLE, COLOR_TEAL, 0.5 + 0.5 * sin(u_time * 0.1)),
            COLOR_BLUE,
            0.5 + 0.5 * sin(length(warp * 0.5) - u_time * 0.5)
        );

        // Make lines glow
        finalColor = baseGridColor * 0.3 + COLOR_WHITE * line * depth * 1.5;

        // Add the transition circle effect (smoother)
        float tCircle = smoothstep(0.8, 1.0, tPhase); // Only last 20%
        float circleDist = abs(length(uv) - mix(2.0, 0.3, tCircle));
        float circles = smoothstep(0.01, 0.05, circleDist) * (1.0 - smoothstep(0.2, 0.25, circleDist));
        finalColor = mix(finalColor, COLOR_TEAL * 1.5, circles * tCircle); // Use TEAL glow

        finalColor *= fadeIn; // Apply fade-in for this phase
    }

    // --- Phase 1: Nebulous Rings ---
    else if (phaseIndex == 1.0) {
        float dist = length(uv);
        // Modulate ring thickness and speed
        float ringThickness = 0.02 + 0.01 * sin(u_time * 1.1);
        float ringSpeed = u_time * 2.5;
        float rings = sin(dist * 18.0 - ringSpeed) * 0.5 + 0.5;
        // Use smoothstep for softer ring edges
        rings = smoothstep(0.5 - ringThickness, 0.5 + ringThickness, rings);
        rings *= smoothstep(1.8, 0.4, dist); // Fade out rings towards edge

        // More dynamic wave distortion
        float wave = fbm(uv * 2.0 + u_time * 0.3) * 0.1; // Noise-based wave
        vec2 waved_uv = uv + vec2(wave, sin(uv.x * 15.0 + u_time * 0.8) * 0.05);

        float n = fbm(waved_uv * 3.5 + u_time * 0.25); // Slightly denser noise

        vec3 ringColor = mix(COLOR_BLUE, COLOR_TEAL, rings);
        vec3 noiseColor = mix(COLOR_GREEN, COLOR_GOLD, n * 0.6 + 0.4); // Bias noise color
        vec3 blendedColor = mix(ringColor, noiseColor, 0.5 + 0.5 * sin(u_time * 0.6));

        // Combine based on ring intensity and noise, add glow
        finalColor = blendedColor * (0.2 + rings * 0.8 + n * 0.3);
        finalColor += ringColor * rings * 0.5; // Additive glow for rings

        // Transition effect: Noise condensation
        float tCondense = smoothstep(0.8, 1.0, tPhase);
        float cells = noise(waved_uv * mix(10.0, 50.0, tCondense) + u_time);
        cells = smoothstep(0.4, 0.6, cells); // Sharpen condensation
        finalColor = mix(finalColor, COLOR_GREEN * (0.5 + cells * 0.5) , tCondense);

        finalColor *= transitionFactor; // Apply smooth fade in/out
    }

    // --- Phase 2: Distorted Hex Grid ---
    else if (phaseIndex == 2.0) {
        // Apply FBM distortion to UVs before hex grid calculation
        vec2 distorted_uv = uv + fbm(uv * 1.5 + u_time * 0.1) * 0.2;
        vec2 scaled_uv = distorted_uv * 5.0; // Scale for denser pattern

        vec2 r = vec2(1.0, 1.732); // Hex grid vectors (sqrt(3))
        vec2 h = r * 0.5;
        vec2 p1 = mod(scaled_uv, r) - h;
        vec2 p2 = mod(scaled_uv - h, r) - h;
        vec2 gv = dot(p1, p1) < dot(p2, p2) ? p1 : p2; // Use dot product (faster than length)

        float pulse = sin(u_time * 3.5) * 0.5 + 0.5; // Faster pulse
        // Sharper electric effect based on distance to hex edge
        float hexDist = length(gv);
        float electric = smoothstep(0.48, 0.50, hexDist); // Thin lines at edge
        electric *= (0.5 + 0.5 * sin(-u_time * 5.0 + scaled_uv.x * 2.0)); // Add movement along lines

        float distortion = fbm(uv * 2.5 + u_time * 0.15);
        vec3 baseColor = mix(COLOR_TEAL * 0.8, COLOR_GREEN, distortion);
        vec3 glowColor = mix(COLOR_BLUE, COLOR_PURPLE * 1.2, pulse); // Slightly brighter purple

        finalColor = mix(baseColor * 0.15, glowColor, electric * pulse * 2.0); // Stronger electric glow

        // Add sparks using noise
        float sparkNoise = noise(distorted_uv * 30.0 + u_time * 2.0);
        float sparks = smoothstep(0.95, 0.98, sparkNoise) * pulse; // Only brightest noise spots pulse
        finalColor += COLOR_WHITE * sparks * 0.5;

        // Transition: Vortex intensification
        float tVortex = smoothstep(0.8, 1.0, tPhase);
        float angle = atan(uv.y, uv.x);
        float vortex = fract(angle / (2.0 * PI) * 6.0 + u_time * 0.5 + length(uv) * 0.5); // Add radial dependency
        vortex = smoothstep(0.0, 0.1, vortex) * smoothstep(1.0, 0.9, vortex); // Create swirling bands
        finalColor = mix(finalColor, COLOR_PURPLE * 1.5, vortex * tVortex);

        finalColor *= transitionFactor; // Apply smooth fade in/out
    }

    // --- Phase 3: Turbulent Vortex ---
    else { // phaseIndex == 3.0
        // Rotate UVs over time for swirling effect
        float vortexAngle = u_time * 0.2;
        vec2 rotated_uv = rotate2d(vortexAngle) * uv;

        float angle = atan(rotated_uv.y, rotated_uv.x);
        float radius = length(rotated_uv);

        // More complex spiral based on angle and radius
        float spiral_angle = angle * 6.0 + pow(radius, 0.8) * 12.0 - u_time * 2.5;
        float spiral = sin(spiral_angle) * 0.5 + 0.5;
        spiral = pow(spiral, 1.5); // Enhance contrast

        // Animated radial distortion
        float radius_distorted = radius + sin(angle * 7.0 - u_time * 0.6) * 0.08 * (0.5 + 0.5 * sin(u_time * 0.4));

        // Sharper bands
        float bands = fract(radius_distorted * 6.0 - u_time * 0.6);
        bands = smoothstep(0.0, 0.1, bands) * smoothstep(0.8, 0.7, bands); // Thinner, sharper bands

        // Directional turbulence using rotated UVs
        float turb = fbm(vec2(radius_distorted * 6.0, angle * 3.0) + vec2(u_time * 0.2, u_time * 0.1));

        // Richer colors
        vec3 deepColor = mix(COLOR_PURPLE * 0.8, COLOR_BLUE, 0.5 + 0.5 * sin(radius_distorted * 12.0 + u_time * 0.3));
        vec3 brightColor = mix(COLOR_GOLD, COLOR_TEAL * 1.2, 0.5 + 0.5 * cos(angle * 4.0 - u_time * 0.4));

        finalColor = mix(deepColor * 0.5, brightColor, bands + turb * 0.4); // Background mix
        finalColor = mix(finalColor, brightColor * 1.5, spiral * 0.3 * smoothstep(0.0, 1.5, radius)); // Additive spiral glow, fades in center

        // Transition: Grid overlay fade-in (smoother)
        float tGridFade = smoothstep(0.8, 1.0, tPhase);
        vec2 finalGridUv = uv + fbm(uv * 5.0 + u_time * 0.1) * 0.05 * tGridFade; // Slightly noisy grid
        float grid_x = smoothstep(0.0, 0.02, abs(fract(finalGridUv.x * 10.0) - 0.5));
        float grid_y = smoothstep(0.0, 0.02, abs(fract(finalGridUv.y * 10.0) - 0.5));
        float gridLines = max(1.0 - grid_x, 1.0 - grid_y); // Grid lines are bright
        finalColor = mix(finalColor, COLOR_BLUE * 1.2, gridLines * tGridFade);

        finalColor *= fadeOut; // Apply fade-out for this phase
    }

    // --- Global Effects ---

    // Subtle global pulse (kept from original)
    finalColor += 0.03 * sin(u_time * 2.0 + uv.x * 5.0) * sin(u_time * 2.0 + uv.y * 5.0);

    // Vignette (kept from original, ensure length(uv) makes sense with chosen UV space)
    float vignette = smoothstep(1.5, 0.6, length(uv)); // Adjusted falloff
    finalColor *= vignette;

    // Enhanced Film Grain
    float grainAmount = 0.06;
    vec2 grainCoords = gl_FragCoord.xy / u_resolution * 2.0; // Use different coords for grain
    float grain = noise(grainCoords * 1.5 + u_time * 10.0) * grainAmount; // Simple time-varying noise
    // More complex grain:
    // vec2 grainUV = gl_FragCoord.xy / u_resolution;
    // float grain = (hash2(grainUV + fract(u_time)).x - 0.5) * grainAmount;
    finalColor += grain;

    // Final Clamp
    finalColor = clamp(finalColor, 0.0, 1.0);

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;
//////////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////////////SHADERSSHADERSHADER ////////////////////////////////////////////////////////////////////////////////////////SHADERSSHADERSHADER 

////////////////////////////////////////////////////////////////////////////////////////SHADERSSHADERSHADER ////////////////////////////////////////////////////////////////////////////////////////SHADERSSHADERSHADER 



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
