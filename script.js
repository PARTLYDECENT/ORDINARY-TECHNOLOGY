// Navigation functions
function navigateToSettings() {
  window.location.href = 'settings.html';
}

function navigateToForum() {
  window.location.href = 'forum.html';
}

function navigateToStore() {
  window.location.href = 'https://www.ebay.com/usr/ordinarytechnology';
}

function navigateToAbout() {
  window.location.href = 'about.html';
}

// Preload audio to avoid issues
const warpSound = new Audio('https://partlydecent.github.io/ORDINARY-TECHNOLOGY/warp_sound.mp3');
warpSound.load();

// WebGL initialization 
function initWebGL() {
  const webglCanvas = document.getElementById('webglCanvas');
  if (!webglCanvas) {
    console.error('WebGL canvas not found');
    return null;
  }

  webglCanvas.width = window.innerWidth;
  webglCanvas.height = window.innerHeight;

  const gl = webglCanvas.getContext('webgl');
  if (!gl) {
    console.log("WebGL not supported in this browser. Fallback visuals will be used.");
    return null;
  }

  return { gl, canvas: webglCanvas };
}

// Vertex shader source
const vertexShaderSource = `
  attribute vec4 a_position;
  void main() {
    gl_Position = a_position;
  }
`;

// Default fragment shader source with basic fallback
let fragmentShaderSource = `
  precision highp float;
  uniform float u_time;
  
  void main() {
    vec2 uv = gl_FragCoord.xy / vec2(400.0, 300.0);
    gl_FragColor = vec4(uv.x, uv.y, 0.5 + 0.5 * sin(u_time), 1.0);
  }
`;

// WebGL utility functions
function createShader(gl, type, source) {
  if (!gl) return null;

  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('Shader compilation error:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createProgram(gl, vertexShader, fragmentShader) {
  if (!gl || !vertexShader || !fragmentShader) return null;

  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Program link error:', gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

// Main WebGL setup and rendering
function setupWebGLRendering() {
  const webglContext = initWebGL();
  if (!webglContext) return;

  const { gl, canvas } = webglContext;

  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

  if (!vertexShader || !fragmentShader) {
    console.error('Failed to create shaders');
    return;
  }

  const program = createProgram(gl, vertexShader, fragmentShader);
  if (!program) {
    console.error('Failed to create WebGL program');
    return;
  }

  // Set up attribute and uniform locations
  const positionAttributeLocation = gl.getAttribLocation(program, "a_position");
  const timeUniformLocation = gl.getUniformLocation(program, "u_time");

  // Create geometry
  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  const positions = [
    -1, 1,
    -1, -1,
    1, 1,
    1, -1,
  ];
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

  // Render loop
  let time = 0;
  function render() {
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(program);
    gl.enableVertexAttribArray(positionAttributeLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);
    gl.uniform1f(timeUniformLocation, time);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    time += 0.005;
    requestAnimationFrame(render);
  }
  render();

  // Shader update function
  window.updateShader = function (newShaderCode) {
    try {
      const newFragmentShaderSource = `
        precision highp float;
        const eggUrl = 'https://partlydecent.github.io/ORDINARY-TECHNOLOGY/' + action;
        
        void main() {
          ${newShaderCode}
        }
      `;

      const newFragmentShader = createShader(gl, gl.FRAGMENT_SHADER, newFragmentShaderSource);
      if (!newFragmentShader) return;

      const newProgram = createProgram(gl, vertexShader, newFragmentShader);
      if (!newProgram) {
        gl.deleteShader(newFragmentShader);
        return;
      }

      gl.deleteProgram(program);
      gl.deleteShader(fragmentShader);

      // Update references
      fragmentShaderSource = newFragmentShaderSource;
      program = newProgram;
    } catch (e) {
      console.error('Shader update error:', e);
    }
  };

  // Handle window resize
  window.addEventListener('resize', function () {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
  });
}

// Call WebGL setup on page load
// DISABLED: shader.js now handles the background shader
// document.addEventListener('DOMContentLoaded', setupWebGLRendering);

// Navigation functions with button animation
function animateButtonAndNavigate(selector, url) {
  try {
    const button = typeof selector === 'string' ? document.querySelector(selector) : selector;
    const warp = document.createElement('div');
    warp.classList.add('warp-distortion');
    document.body.appendChild(warp);

    try {
      warpSound.currentTime = 0;
      warpSound.play().catch(e => console.log('Audio play failed:', e));
    } catch (e) {
      console.log('Audio error:', e);
    }

    button.style.transform = 'scale(0.9)';
    setTimeout(() => {
      button.style.transform = 'scale(1)';
      setTimeout(() => {
        window.location.href = url;
      }, 500);
    }, 100);
  } catch (e) {
    console.error('Navigation error:', e);
    window.location.href = url;
  }
}

// Navigation wrapper functions
    function navigateToGame() { console.log("Navigate: Game"); animateButtonAndNavigate(document.querySelectorAll('.button.play-button')[0], 'https://partlydecent.github.io/ORDINARY-TECHNOLOGY/game.html'); }
    function navigateToVideoPlayer() { console.log("Navigate: Logs"); animateButtonAndNavigate(document.querySelectorAll('.button.play-button')[1], 'https://partlydecent.github.io/ORDINARY-TECHNOLOGY/videoPlayer.html'); }
    function navigateToLiquidMusic() { console.log("Navigate: Audio"); animateButtonAndNavigate(document.querySelectorAll('.button.play-button')[2], 'https://partlydecent.github.io/ORDINARY-TECHNOLOGY/liquidMusic.html'); }
    function navigateToDimension88() { console.log("Navigate: Dimension 888"); animateButtonAndNavigate(document.querySelectorAll('.button.play-button')[3], 'https://partlydecent.github.io/ORDINARY-TECHNOLOGY/dimension888.html'); }
    function navigateToAI() { console.log("Navigate: AI Gen"); animateButtonAndNavigate(document.querySelector('.button.ai-button'), 'https://partlydecent.github.io/ORDINARY-TECHNOLOGY/ai.html'); }

// Console input handling
function handleConsoleInput(event) {
  if (event.key === 'Enter') {
    const input = event.target.value.toLowerCase();
    const easterEggs = {
      'ali3n': 'easteregg.html',
      'zombie1': 'egg1.html',
      'valve2': 'egg2.html',
      'unr3al': 'egg3.html',
      'phant0m': 'egg4.html',
      'shadow5': 'egg5.html',
      'glitchx': 'egg6.html',
      'oblivion7': 'egg7.html',
      'cyb3rpunk': 'egg8.html',
      'n3on9': 'egg9.html',
      'matrix10': 'egg10.html',
      'quantum11': 'egg11.html',
      'nebula12': 'egg12.html',
      'vortex13': 'egg13.html',
      'enigma14': 'egg14.html',
      'paradox15': 'egg15.html',
      'synapse16': 'egg16.html',
      'zenith17': 'egg17.html',
    };

    if (input.startsWith('shader ')) {
      const newShaderCode = input.substring(7);
      window.updateShader(newShaderCode);
    } else if (easterEggs[input]) {
      window.location.href = 'https://partlydecent.github.io/GAMEHUBORDINARY/' + easterEggs[input];
    } else {
      // Modern notification
      const notification = document.createElement('div');
      notification.style.position = 'fixed';
      notification.style.bottom = '5rem';
      notification.style.left = '50%';
      notification.style.transform = 'translateX(-50%)';
      notification.style.padding = '0.75rem 1.5rem';
      notification.style.background = 'rgba(0,0,0,0.8)';
      notification.style.backdropFilter = 'blur(10px)';
      notification.style.borderRadius = '8px';
      notification.style.color = 'white';
      notification.style.fontFamily = "'Space Grotesk', sans-serif";
      notification.style.zIndex = '100';
      notification.style.animation = 'fadeIn 0.3s, fadeOut 0.3s 2s forwards';
      notification.textContent = 'UNKNOWN COMMAND: ' + input;
      document.body.appendChild(notification);

      setTimeout(() => {
        document.body.removeChild(notification);
      }, 2300);
    }
    event.target.value = '';
  }
}

// Particle system
function createParticles() {
  const container = document.getElementById('particles');
  const particleCount = 40;

  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    particle.classList.add('particle');

    // Random positions and sizes
    const size = Math.random() * 4 + 1;
    const left = Math.random() * 100;
    const delay = Math.random() * 10;
    const duration = Math.random() * 15 + 10;

    // Set CSS properties
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    particle.style.left = `${left}%`;
    particle.style.bottom = `-5px`;
    particle.style.opacity = Math.random() * 0.6 + 0.1;

    // Random colors - no pink
    const colors = [
      'var(--primary)',
      'var(--secondary)',
      '#0088FF',
      '#00FFAA',
      '#6600FF',
      '#FFFFFF'
    ];
    particle.style.background = colors[Math.floor(Math.random() * colors.length)];

    // Enhanced animation with pulses
    if (Math.random() > 0.7) {
      particle.style.animation = `float ${duration}s infinite ease-in-out, pulse 3s infinite`;
    } else {
      particle.style.animation = `float ${duration}s infinite linear`;
    }
    particle.style.animationDelay = `${delay}s`;

    container.appendChild(particle);
  }
}

// Clear existing particles and recreate
function resetParticles() {
  const container = document.getElementById('particles');
  if (container) {
    container.innerHTML = '';
    createParticles();
  }
}

// Initialize particles
createParticles();

// Periodic particle refresh for visual variety
setInterval(resetParticles, 30000);
