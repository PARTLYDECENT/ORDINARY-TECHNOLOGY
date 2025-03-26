(function() {
  console.log('Advanced Multi-Shader Background System: Initializing');

  // Configuration for shader management
  const SHADER_CONFIG = {
    transitionDuration: 3000,  // Smoother transitions
    displayDuration: 90000,    // Longer display time for complex shaders
    enableConsoleLogging: true,
    transitionEasing: 'cubic-bezier(0.4, 0.0, 0.2, 1)' // Smooth transition curve
  };

  // [Rest of the existing ShaderManager class remains the same]

  // ENHANCED SHADER 1: Fractal Noise Landscape
  const fractalLandscapeShader = `
    precision highp float;
    uniform float u_time;
    uniform vec2 u_resolution;

    // Noise and fractal functions
    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    }

    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      
      float a = hash(i);
      float b = hash(i + vec2(1.0, 0.0));
      float c = hash(i + vec2(0.0, 1.0));
      float d = hash(i + vec2(1.0, 1.0));
      
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
    }

    float fbm(vec2 x) {
      float value = 0.0;
      float amplitude = 0.5;
      float frequency = 0.0;
      
      for (int i = 0; i < 6; i++) {
        value += amplitude * noise(x);
        x *= 2.0;
        amplitude *= 0.5;
      }
      return value;
    }

    void main() {
      vec2 uv = gl_FragCoord.xy / u_resolution.xy;
      uv = uv * 2.0 - 1.0;
      uv.x *= u_resolution.x / u_resolution.y;

      // Dynamic camera movement
      vec2 offset = vec2(
        sin(u_time * 0.1) * 0.3,
        cos(u_time * 0.1) * 0.3
      );

      // Complex fractal terrain generation
      float terrain = fbm(uv * 4.0 + offset);
      
      // Layer multiple noise patterns
      float detailNoise = noise(uv * 20.0 + u_time * 0.05);
      float turbulence = pow(abs(noise(uv * 8.0 - u_time * 0.03)), 2.0);

      // Color manipulation
      vec3 baseColor = vec3(0.2, 0.4, 0.7);  // Deep ocean blue
      vec3 heightColor = vec3(0.1, 0.5, 0.3);  // Mountain green
      vec3 peakColor = vec3(1.0, 1.0, 1.0);  // Snow peaks

      // Blend colors based on height and turbulence
      vec3 finalColor = mix(
        baseColor, 
        mix(heightColor, peakColor, smoothstep(0.6, 0.9, terrain)),
        terrain + detailNoise * 0.2 + turbulence * 0.1
      );

      // Add some atmospheric perspective
      finalColor *= 1.0 - length(uv) * 0.5;

      gl_FragColor = vec4(finalColor, 1.0);
    }
  `;

  // ENHANCED SHADER 2: Cosmic Particle Swarm
  const cosmicParticleShader = `
    precision highp float;
    uniform float u_time;
    uniform vec2 u_resolution;

    // Pseudo-random function
    float random(vec2 st) {
      return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
    }

    // Rotate vector
    mat2 rotate2d(float angle) {
      return mat2(
        cos(angle), -sin(angle),
        sin(angle), cos(angle)
      );
    }

    // Particle simulation
    vec3 particleSystem(vec2 uv) {
      float time = u_time * 0.5;
      
      // Multiple particle layers
      vec3 particleColor = vec3(0.0);
      
      for (int i = 0; i < 3; i++) {
        vec2 particleUV = uv * (1.0 + float(i) * 0.5);
        
        // Rotate and distort space
        particleUV = rotate2d(time * float(i + 1) * 0.2) * particleUV;
        
        // Generate particle clusters
        vec2 cellID = floor(particleUV * 10.0);
        vec2 cellUV = fract(particleUV * 10.0) - 0.5;
        
        float randomSeed = random(cellID);
        vec2 particleOffset = vec2(
          sin(time * randomSeed * 2.0),
          cos(time * randomSeed * 2.0)
        ) * 0.2;
        
        float particleSize = 0.1 + random(cellID * 1.3) * 0.2;
        float particle = smoothstep(
          particleSize, 
          0.0, 
          length(cellUV - particleOffset)
        );
        
        // Color variation
        vec3 layerColor = mix(
          vec3(0.2, 0.4, 0.9),  // Blue tones
          vec3(0.9, 0.3, 0.6),  // Magenta tones
          randomSeed
        );
        
        particleColor += particle * layerColor * (1.0 / float(i + 1));
      }
      
      return particleColor;
    }

    void main() {
      vec2 uv = gl_FragCoord.xy / u_resolution.xy;
      uv = uv * 2.0 - 1.0;
      uv.x *= u_resolution.x / u_resolution.y;

      // Particle system with cosmic backdrop
      vec3 particleColor = particleSystem(uv);
      
      // Gradient background
      vec3 backgroundColor = mix(
        vec3(0.05, 0.05, 0.1),    // Dark space
        vec3(0.1, 0.05, 0.2),     // Nebula purple
        length(uv) * 0.7
      );

      // Combine background and particles
      vec3 finalColor = particleColor + backgroundColor * 0.5;
      
      // Slight vignette effect
      finalColor *= 1.0 - length(uv) * 0.3;

      gl_FragColor = vec4(finalColor, 1.0);
    }
  `;

  // ENHANCED SHADER 3: Organic Fluid Dynamics
  const organicFluidShader = `
    precision highp float;
    uniform float u_time;
    uniform vec2 u_resolution;

    // Advanced noise and fluid-like behavior
    float noise(vec2 p) {
      return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    }

    // Curl noise for fluid-like motion
    vec2 curlNoise(vec2 p) {
      float epsilon = 0.01;
      
      float n1 = noise(p + vec2(0.0, epsilon));
      float n2 = noise(p + vec2(0.0, -epsilon));
      float n3 = noise(p + vec2(epsilon, 0.0));
      float n4 = noise(p + vec2(-epsilon, 0.0));
      
      return vec2(n1 - n2, n4 - n3) / (2.0 * epsilon);
    }

    void main() {
      vec2 uv = gl_FragCoord.xy / u_resolution.xy;
      uv = uv * 2.0 - 1.0;
      uv.x *= u_resolution.x / u_resolution.y;

      // Dynamic fluid motion
      vec2 flow = curlNoise(uv * 3.0 + u_time * 0.1);
      
      // Layer multiple fluid dynamics
      float fluidDensity = 0.0;
      vec3 fluidColor = vec3(0.0);
      
      for (int i = 0; i < 3; i++) {
        float scale = pow(2.0, float(i));
        vec2 scaledUV = uv * scale + flow * float(i + 1) * 0.2;
        
        float layerNoise = noise(scaledUV);
        float layerDetail = abs(sin(layerNoise * 10.0 + u_time * 0.5));
        
        fluidDensity += layerDetail / scale;
        
        // Color interpolation
        vec3 layerColorA = vec3(0.1, 0.3, 0.6);  // Deep blue
        vec3 layerColorB = vec3(0.7, 0.2, 0.5);  // Magenta
        
        fluidColor += mix(layerColorA, layerColorB, layerNoise) * layerDetail / scale;
      }
      
      // Normalize and stylize
      fluidColor /= 3.0;
      fluidDensity /= 3.0;
      
      // Add subtle motion and depth
      fluidColor *= 1.0 + sin(u_time * 0.3) * 0.2;
      fluidColor *= 1.0 - length(uv) * 0.4;

      gl_FragColor = vec4(fluidColor, 1.0);
    }
  `;

  // Initialize shader system
  const canvas = document.getElementById('webglCanvas');
  const shaderManager = new ShaderManager(canvas);

  // Add enhanced shaders
  shaderManager.addShader(fractalLandscapeShader);
  shaderManager.addShader(cosmicParticleShader);
  shaderManager.addShader(organicFluidShader);

  // Start the shader system
  shaderManager.start();

  // Expose enhanced shader management globally
  window.ShaderManager = {
    addShader: (fragmentShader) => shaderManager.addShader(fragmentShader),
    getCurrentShaderIndex: () => shaderManager.currentShaderIndex,
    getTotalShaders: () => shaderManager.shaders.length
  };
})();
