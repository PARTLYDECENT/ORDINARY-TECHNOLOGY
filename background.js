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
      const displayWidth = canvas.clientWidth;
      const displayHeight = canvas.clientHeight;

      if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
          canvas.width = displayWidth;
          canvas.height = displayHeight;
          gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
          console.log(`background.js: Resized WebGL canvas to ${canvas.width}x${canvas.height}`);
      }
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas(); // Initial size setup

  // Vertex Shader: Basic passthrough for fullscreen quad
  const vertexShaderSource = `
    attribute vec2 a_position;
    void main() {
      gl_Position = vec4(a_position, 0.0, 1.0);
    }
  `;

  // NEW CRAZY FRAGMENT SHADER
  const fragmentShaderSource = `
    precision highp float;

    uniform float u_time;
    uniform vec2 u_resolution;
    uniform vec2 u_mouse;

    // ADVANCED NOISE FUNCTIONS
    float random(vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
    }

    float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        float a = random(i);
        float b = random(i + vec2(1.0, 0.0));
        float c = random(i + vec2(0.0, 1.0));
        float d = random(i + vec2(1.0, 1.0));
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
    }

    float fbm(vec2 x) {
        float height = 0.0;
        float amplitude = 0.5;
        float frequency = 3.0;
        
        for (int i = 0; i < 6; i++) {
            height += amplitude * noise(frequency * x);
            x = x * 2.0;
            amplitude *= 0.5;
            frequency *= 2.0;
        }
        
        return height;
    }

    // ADVANCED COLOR MANIPULATION
    vec3 hsv2rgb(vec3 c) {
        vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
        vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
        return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
    }

    void main() {
        // Normalized pixel coordinates (from 0 to 1)
        vec2 uv = gl_FragCoord.xy / u_resolution.xy;
        
        // Center and aspect correct
        uv = uv * 2.0 - 1.0;
        uv.x *= u_resolution.x / u_resolution.y;
        
        // MULTI-DIMENSIONAL WARPING
        float timeWarp = u_time * 0.3;
        vec2 warpedUV = uv + vec2(
            sin(uv.y * 3.0 + timeWarp) * 0.1,
            cos(uv.x * 4.0 - timeWarp) * 0.15
        );
        
        // FRACTAL COMPLEXITY
        float fractalNoise = fbm(warpedUV * 4.0 + timeWarp);
        float detailNoise = noise(warpedUV * 15.0 + timeWarp * 2.0);
        
        // CRAZY COLOR DYNAMICS
        float hueShift = sin(length(uv) * 5.0 + timeWarp) * 0.5 + 0.5;
        float saturation = cos(length(warpedUV) * 3.0 + timeWarp) * 0.5 + 0.5;
        float brightness = fractalNoise * 0.7 + 0.3;
        
        vec3 baseColor = hsv2rgb(vec3(
            hueShift, 
            saturation * 0.8, 
            brightness
        ));
        
        // ADVANCED LAYERING
        float layerA = sin(length(warpedUV) * 10.0 + timeWarp) * 0.5 + 0.5;
        float layerB = cos(atan(warpedUV.y, warpedUV.x) * 3.0 + timeWarp) * 0.5 + 0.5;
        
        vec3 finalColor = baseColor * (layerA + layerB * detailNoise);
        
        // SUBTLE VORTEX EFFECT
        float vortexIntensity = sin(length(uv) * 5.0 - timeWarp * 2.0) * 0.5 + 0.5;
        finalColor *= 1.0 + vortexIntensity * 0.2;
        
        // CHROMATIC ABERRATION SIMULATION
        vec3 aberrationColor = vec3(
            finalColor.r * (1.0 + sin(timeWarp) * 0.1),
            finalColor.g,
            finalColor.b * (1.0 + cos(timeWarp) * 0.1)
        );
        
        // FINAL TOUCHES
        float vignetteEffect = 1.0 - smoothstep(0.5, 1.2, length(uv));
        aberrationColor *= vignetteEffect;
        
        gl_FragColor = vec4(clamp(aberrationColor, 0.0, 1.0), 1.0);
    }
  `;

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

  if (!vertexShader || !fragmentShader) return;

  // Create and link the shader program
  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error("background.js: Error linking program:", gl.getProgramInfoLog(program));
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    return;
  }
  gl.useProgram(program);
  console.log('background.js: Shaders compiled and program linked.');

  // Geometry Setup
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

  // Get uniform locations
  const timeUniformLocation = gl.getUniformLocation(program, 'u_time');
  const resolutionUniformLocation = gl.getUniformLocation(program, 'u_resolution');
  const mouseUniformLocation = gl.getUniformLocation(program, 'u_mouse');

  // Mouse interaction (optional)
  let mouseX = 0, mouseY = 0;
  canvas.addEventListener('mousemove', (event) => {
    mouseX = (event.clientX / canvas.width) * 2 - 1;
    mouseY = 1 - (event.clientY / canvas.height) * 2;
  });

  // Render Loop
  let startTime = performance.now();
  let frameCount = 0;
  function render(now) {
    let elapsed = (now - startTime) * 0.001;

    if (frameCount === 0) console.log('background.js: First render frame executing.');
    frameCount++;

    resizeCanvas();

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(program);

    // Pass uniform values
    gl.uniform1f(timeUniformLocation, elapsed);
    gl.uniform2f(resolutionUniformLocation, canvas.width, canvas.height);
    gl.uniform2f(mouseUniformLocation, mouseX, mouseY);

    gl.drawArrays(gl.TRIANGLES, 0, 6);

    requestAnimationFrame(render);
  }

  console.log('background.js: Requesting initial animation frame.');
  render();
})();

console.log('background.js: Script execution finished.');
