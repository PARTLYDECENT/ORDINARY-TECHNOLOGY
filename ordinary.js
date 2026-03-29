// Matrix Effect removed as non-functional component.
function toggleMatrixEffect() {
  showNotification('MATRIX PROTOCOL: UNAVAILABLE');
}

// Pulse Wave removed as non-functional component.
function createPulseWave() {
  showNotification('PULSE WAVE: OFFLINE');
}

// Reality Distortion removed as non-functional component.
function toggleRealityDistortion() {
  showNotification('REALITY DISTORTION: UNAVAILABLE');
}

// Neural Interface removed as non-functional component.
function openNeuralInterface() {
  showNotification('NEURAL INTERFACE: ERROR');
}

// Quantum Calculator removed as non-functional component.
function openQuantumCalculator() {
  showNotification('QUANTUM CALCULATOR: OFFLINE');
}

// --- Scroll to Game ---
function scrollToGame() {
  const gameSection = document.getElementById('recycling-game');
  if (gameSection) {
    gameSection.scrollIntoView({ behavior: 'smooth' });
    showNotification('NAVIGATING TO ORDINARY RECYCLING GAME...');
  } else {
    showNotification('GAME MODULE NOT FOUND. SCROLL TO BOTTOM TO REVEAL.');
    window.scrollTo({
      top: document.body.scrollHeight,
      behavior: 'smooth'
    });
  }
}

// --- Mouse Light Effect ---
function setupMouseLight() {
  const mouseLight = document.getElementById('mouseLight');
  if (!mouseLight) return;

  document.addEventListener('mousemove', (e) => {
    mouseLight.style.opacity = '1';
    mouseLight.style.left = e.clientX + 'px';
    mouseLight.style.top = e.clientY + 'px';
  });

  document.addEventListener('mouseout', () => {
    mouseLight.style.opacity = '0';
  });
}

// --- Ripple Effect ---
function createRipple(event, element) {
  const ripple = document.createElement('div');
  ripple.classList.add('ripple');
  element.appendChild(ripple);

  const rect = element.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);

  ripple.style.width = ripple.style.height = size + 'px';
  ripple.style.left = event.clientX - rect.left - size / 2 + 'px';
  ripple.style.top = event.clientY - rect.top - size / 2 + 'px';

  setTimeout(() => {
    ripple.remove();
  }, 1000);
}

// --- Floating Action Buttons ---
function setupFloatingActionButtons() {
  const fabButtons = document.querySelectorAll('.floating-action-button');

  window.addEventListener('scroll', () => {
    const scrollPosition = window.scrollY;

    if (scrollPosition > 300) {
      fabButtons.forEach(btn => {
        btn.classList.add('visible');
      });
    } else {
      fabButtons.forEach(btn => {
        btn.classList.remove('visible');
      });
    }
  });

  fabButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      createRipple(e, btn);
    });
  });
}

// --- GIF Floating Animation ---
const gif = document.getElementById("glitchGif");
let yPosition = 0, yDirection = 1;
let xPosition = 0;
function animateGIF() {
  if (!gif) return;
  yPosition += 0.3 * yDirection;
  if (yPosition > 1.5 || yPosition < -1.5) yDirection *= -1;
  xPosition = (Math.random() - 0.5) * 1.0;
  gif.style.transform = `translate(${xPosition}px, ${yPosition}px) rotateZ(${(Math.random() - 0.5) * 0.5}deg)`;
  requestAnimationFrame(animateGIF);
}
if (gif) { animateGIF(); } else { console.warn("Glitch GIF element not found."); }

// --- Navigation & Helpers ---
function navigateToGame() { console.log("Navigate: Game"); animateButtonAndNavigate(document.querySelectorAll('.button.play-button')[0], 'game.html'); }
function navigateToVideoPlayer() { console.log("Navigate: Logs"); animateButtonAndNavigate(document.querySelectorAll('.button.play-button')[1], 'videoPlayer.html'); }
function navigateToLiquidMusic() { console.log("Navigate: Audio"); animateButtonAndNavigate(document.querySelectorAll('.button.play-button')[2], 'liquidMusic.html'); }
function navigateToDimension88() { console.log("Navigate: Dim88"); animateButtonAndNavigate(document.querySelectorAll('.button.play-button')[3], 'dimension88.html'); }
function navigateToAI() { console.log("Navigate: AI Gen"); animateButtonAndNavigate(document.querySelector('.button.ai-button'), 'ai.html'); }
function navigateToSettings() { console.log("Navigate: Calibration"); animateButtonAndNavigate(document.querySelectorAll('.button.play-button')[4], 'settings.html'); }
function navigateToForum() { console.log("Navigate: Weapon Lab"); animateButtonAndNavigate(document.querySelectorAll('.button.play-button')[5], 'forum.html'); }
function navigateToStore() { console.log("Navigate: Acquisitions"); animateButtonAndNavigate(document.querySelectorAll('.button.play-button')[6], 'https://www.ebay.com/usr/ordinarytechnology'); }
function navigateToAbout() { console.log("Navigate: Info"); animateButtonAndNavigate(document.querySelectorAll('.button.play-button')[7], 'about.html'); }

// --- Console Input Handler ---
function handleConsoleInput(event) {
  if (event.key === 'Enter') {
    const inputField = event.target;
    const input = inputField.value.trim().toLowerCase();
    inputField.value = '';
    if (!input) return;

    const commands = {
      'ali3n': 'easteregg.html', 'zombie1': 'egg1.html', 'valve2': 'egg2.html',
      'unr3al': 'egg3.html', 'phant0m': 'egg4.html', 'shadow5': 'egg5.html',
      'glitchx': 'egg6.html', 'oblivion7': 'egg7.html', 'cyb3rpunk': 'egg8.html',
      'n3on9': 'egg9.html', 'matrix10': 'egg10.html', 'quantum11': 'egg11.html',
      'nebula12': 'egg12.html', 'vortex13': 'egg13.html', 'enigma14': 'egg14.html',
      'paradox15': 'egg15.html', 'synapse16': 'egg16.html', 'zenith17': 'egg17.html',
      'help': 'showHelp', 'clear': 'clearConsole', 'nav': 'navigateCommand',
      'shader': 'updateShaderCommand',
      'scan': 'runScan',
      'theme': 'cycleTheme'
    };

    const parts = input.split(' ');
    const command = parts[0];
    const args = parts.slice(1).join(' ');
    
    if (command === '/ohayou') {
      showNotification('ACCESSING RESTRICTED DATA ARCHIVE: OHAYOU...');
      showEasterEggImage('textures/DIGITS.PNG', 10000);
      return;
    }

    const action = commands[command];

    if (action) {
      if (action === 'showHelp') {
        const availableCommands = Object.keys(commands).filter(k => typeof commands[k] === 'string' && !commands[k].endsWith('.html')).map(k => k + (k === 'nav' || k === 'shader' || k === 'theme' ? ' [args]' : '')).join(', ');
        const eggKeys = Object.keys(commands).filter(k => commands[k].endsWith('.html')).join(', ');
        showNotification(`SYSTEM COMMANDS: ${availableCommands}. DATA ARCHIVES: ${eggKeys}.`);
      } else if (action === 'clearConsole') {
        showNotification('CONSOLE BUFFER CLEARED.');
      } else if (action === 'navigateCommand') {
        handleNavCommand(args);
      } else if (action === 'updateShaderCommand') {
        if (typeof window.updateShader === 'function') {
          console.log("Attempting to update shader via console with args:", args);
          window.updateShader(args);
          showNotification(`SHADER DIRECTIVE [${args.toUpperCase()}] EXECUTED.`);
        } else {
          showNotification(`SHADER_SYSTEM OFFLINE OR UNRESPONSIVE. (Main background shader.js)`);
          console.error("window.updateShader is not defined. Ensure shader.js loaded correctly.");
        }
      } else if (action === 'runScan') {
        showNotification('SYSTEM SCAN INITIATED... ALL PARAMETERS NOMINAL.');
      } else if (action === 'cycleTheme') {
        showNotification('THEME CYCLING NOT IMPLEMENTED. SEND STYLESHEET.');
      } else if (action.endsWith('.html')) {
        const eggUrl = 'https://partlydecent.github.io/ORDINARY-TECHNOLOGY/' + action;
        showNotification(`ACCESSING ARCHIVE NODE: ${command.toUpperCase()}...`);
        setTimeout(() => { window.location.href = eggUrl; }, 500);
      }
    } else {
      showNotification(`DIRECTIVE UNRECOGNIZED: ${command.toUpperCase()}. TYPE 'HELP' FOR COMMANDS.`);
    }
  }
}

// --- Showcase Click Handler ---
function handleShowcaseClick(moduleId) {
  console.log("Interfacing with module:", moduleId);
  showNotification(`MODULE_INTERFACE [${moduleId.toUpperCase()}] STATUS: ACTIVE_PENDING...`);
}

// --- Navigation Command Helper ---
function handleNavCommand(target) {
  const destinations = {
    'game': navigateToGame, 'sims': navigateToGame, 'simulations': navigateToGame,
    'logs': navigateToVideoPlayer, 'xenodata': navigateToVideoPlayer, 'player': navigateToVideoPlayer,
    'audio': navigateToLiquidMusic, 'music': navigateToLiquidMusic, 'resonator': navigateToLiquidMusic,
    'dim88': navigateToDimension88, 'dimension88': navigateToDimension88, 'portal': navigateToDimension88,
    'ai': navigateToAI, 'reality': navigateToAI, 'engine': navigateToAI,
    'settings': navigateToSettings, 'calibration': navigateToSettings, 'config': navigateToSettings,
    'lab': navigateToForum, 'forge': navigateToForum, 'weaponlab': navigateToForum,
    'store': navigateToStore, 'acquisitions': navigateToStore, 'hub': navigateToStore,
    'about': navigateToAbout, 'info': navigateToAbout, 'core': navigateToAbout,
    'home': () => window.location.reload(), 'reload': () => window.location.reload(), 'reboot': () => window.location.reload()
  };
  const targetLower = target.toLowerCase();
  if (destinations[targetLower]) {
    showNotification(`NAV_SYSTEM ENGAGED: ${target.toUpperCase()}...`);
    setTimeout(() => { destinations[targetLower](); }, 300);
  } else {
    showNotification(`NAV_TARGET UNKNOWN: ${target.toUpperCase()}. USE 'HELP'.`);
  }
}

// --- Notification Display Helper ---
let notificationTimeout;
function showNotification(message) {
  clearTimeout(notificationTimeout);
  const existingNotification = document.getElementById('consoleNotification');
  if (existingNotification) { document.body.removeChild(existingNotification); }

  const notification = document.createElement('div');
  notification.id = 'consoleNotification';
  notification.style.cssText = `
        position: fixed; bottom: 8rem;
        left: 50%; padding: 0.9rem 1.8rem;
        background: rgba(var(--rgb-secondary), 0.1);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(var(--rgb-secondary), 0.5); border-radius: 4px;
        color: var(--secondary); font-family: 'Space Grotesk', monospace; font-size: 0.95rem;
        z-index: 101; text-align: center; text-transform: uppercase;
        box-shadow: 0 0 25px rgba(var(--rgb-secondary), 0.4);
        transform: translateX(-50%); 
        animation: fadeIn 0.3s ease-out forwards, fadeOut 0.4s ease-in 3.5s forwards;
    `;
  notification.textContent = message;
  document.body.appendChild(notification);

  notificationTimeout = setTimeout(() => {
    if (notification.parentNode === document.body) {
      document.body.removeChild(notification);
    }
  }, 3900);
}

// --- Easter Egg Helper ---
function showEasterEggImage(imgSrc, durationMs) {
  const existing = document.getElementById('ohayouEasterEgg');
  if (existing) return;

  const overlay = document.createElement('div');
  overlay.id = 'ohayouEasterEgg';
  overlay.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0,0,0,0.85); z-index: 9999;
    display: flex; justify-content: center; align-items: center;
    opacity: 0; transition: opacity 0.5s ease;
  `;
  
  const img = document.createElement('img');
  img.src = imgSrc;
  img.style.cssText = 'max-width: 90%; max-height: 90%; object-fit: contain; box-shadow: 0 0 50px rgba(255,107,63,0.5); border-radius: 8px;';
  
  overlay.appendChild(img);
  document.body.appendChild(overlay);

  // Trigger fade in
  setTimeout(() => { overlay.style.opacity = '1'; }, 50);

  // Remove after duration
  setTimeout(() => {
    overlay.style.opacity = '0';
    setTimeout(() => {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }, 500);
  }, durationMs);
}

// --- Button Animation and Navigation Helper ---
const warpSound = new Audio('https://partlydecent.github.io/ORDINARY-TECHNOLOGY/warp_sound.mp3');
warpSound.load();

function animateButtonAndNavigate(buttonElement, url) {
  if (!buttonElement) {
    console.error("Button element not found for navigation to:", url);
    window.location.href = url;
    return;
  }
  try {
    const warp = document.createElement('div');
    warp.classList.add('warp-distortion');
    document.body.appendChild(warp);

    warpSound.currentTime = 0;
    warpSound.volume = 0.7;
    warpSound.play().catch(e => console.warn('Audio play failed (user interaction might be needed):', e));

    buttonElement.style.transform = 'scale(0.95) perspective(500px) rotateX(10deg)';
    buttonElement.style.opacity = '0.6';

    setTimeout(() => { window.location.href = url; }, 550);

    setTimeout(() => {
      if (warp.parentNode === document.body) {
        document.body.removeChild(warp);
      }
    }, 1200);
  } catch (e) {
    console.error('Navigation animation error:', e);
    window.location.href = url;
  }
}

// --- DOM-based Sandstorm Effect for #particles div ---
function createDOMSandstorm() {
  const container = document.getElementById('particles');
  if (!container) {
    console.error("Sandstorm container ('particles') not found!");
    return;
  }
  // Clear only sand particles if re-running, keep vignette/noise overlay structure
  const existingParticles = container.querySelectorAll('.sand-particle');
  existingParticles.forEach(p => p.remove());

  const numParticles = Math.floor((container.offsetWidth * container.offsetHeight) / 3000); // Adjust density
  const sandColors = [getComputedStyle(document.documentElement).getPropertyValue('--sand-color-1').trim(),
  getComputedStyle(document.documentElement).getPropertyValue('--sand-color-2').trim(),
  getComputedStyle(document.documentElement).getPropertyValue('--sand-color-3').trim()];

  for (let i = 0; i < numParticles; i++) {
    const particle = document.createElement('div');
    particle.classList.add('sand-particle');

    const size = Math.random() * 3 + 1; // Particle size 1px to 4px
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    particle.style.backgroundColor = sandColors[Math.floor(Math.random() * sandColors.length)];

    // Initial position spread across the container, including starting off-screen for entry effect
    particle.style.left = `${Math.random() * 120 - 10}%`; // -10% to 110%
    particle.style.top = `${Math.random() * 120 - 10}%`;

    particle.dataset.vx = (Math.random() - 0.3) * 3 + 1; // Base horizontal velocity (mostly right to left)
    particle.dataset.vy = (Math.random() - 0.5) * 2;     // Vertical velocity (slight up/down drift)
    particle.dataset.life = Math.random() * 100 + 50;    // Particle lifespan

    particle.style.position = 'absolute';
    particle.style.borderRadius = '50%';
    particle.style.opacity = Math.random() * 0.7 + 0.3;
    particle.style.zIndex = '1';

    container.appendChild(particle);
  }

  // Animate particles
  function animateSandstorm() {
    const particles = container.querySelectorAll('.sand-particle');

    particles.forEach(particle => {
      let x = parseFloat(particle.style.left);
      let y = parseFloat(particle.style.top);
      let vx = parseFloat(particle.dataset.vx);
      let vy = parseFloat(particle.dataset.vy);
      let life = parseFloat(particle.dataset.life);

      // Update position
      x += vx * 0.5;
      y += vy * 0.5;

      // Add some turbulence
      vx += (Math.random() - 0.5) * 0.1;
      vy += (Math.random() - 0.5) * 0.1;

      // Boundary conditions - wrap around or reset
      if (x > 110) x = -10;
      if (x < -10) x = 110;
      if (y > 110) y = -10;
      if (y < -10) y = 110;

      // Update life
      life -= 1;
      if (life <= 0) {
        // Reset particle
        x = Math.random() * 120 - 10;
        y = Math.random() * 120 - 10;
        life = Math.random() * 100 + 50;
        vx = (Math.random() - 0.3) * 3 + 1;
        vy = (Math.random() - 0.5) * 2;
      }

      // Apply changes
      particle.style.left = `${x}%`;
      particle.style.top = `${y}%`;
      particle.dataset.vx = vx;
      particle.dataset.vy = vy;
      particle.dataset.life = life;

      // Fade effect based on life
      particle.style.opacity = Math.min(life / 50, 0.7);
    });

    requestAnimationFrame(animateSandstorm);
  }

  animateSandstorm();
}

// --- Neural Breach Game Class ---
class NeuralBreachGame {
  constructor() {
    this.canvas = document.getElementById('game-board');
    this.ctx = this.canvas.getContext('2d');
    this.overlay = document.querySelector('.game-overlay');
    this.startBtn = document.getElementById('game-start-btn');
    this.resetBtn = document.getElementById('game-reset-btn');
    this.revealBtn = document.getElementById('ability-reveal');
    this.boostBtn = document.getElementById('ability-boost');
    this.breachBtn = document.getElementById('ability-breach');

    // Game state
    this.gameActive = false;
    this.level = 1;
    this.score = 0;
    this.timeRemaining = 60;
    this.timerInterval = null;

    // Display elements
    this.levelDisplay = document.getElementById('level-display');
    this.timerDisplay = document.getElementById('timer-display');
    this.scoreDisplay = document.getElementById('score-display');

    // Game objects
    this.nodes = [];
    this.connections = [];
    this.completedPaths = [];
    this.selectedNode = null;
    this.sourceNode = null;
    this.targetNode = null;

    // Game settings
    this.nodeSize = 20;
    this.gridSize = { x: 8, y: 6 };

    // Abilities
    this.abilities = {
      reveal: { active: false, cooldown: 0, maxCooldown: 15 },
      boost: { active: false, cooldown: 0, maxCooldown: 20 },
      breach: { active: false, cooldown: 0, maxCooldown: 30 }
    };

    // Sound effects (using AudioContext)
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

    // Initialize event listeners
    this.initEventListeners();
  }

  initEventListeners() {
    // Start button
    this.startBtn.addEventListener('click', () => {
      this.startGame();
    });

    // Reset button
    this.resetBtn.addEventListener('click', () => {
      this.resetGame();
    });

    // Canvas click
    this.canvas.addEventListener('click', (e) => {
      if (!this.gameActive) return;

      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      this.handleCanvasClick(x, y);
    });

    // Canvas mousemove for hover effects
    this.canvas.addEventListener('mousemove', (e) => {
      if (!this.gameActive) return;

      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      this.handleCanvasHover(x, y);
    });

    // Ability buttons
    this.revealBtn.addEventListener('click', () => this.activateAbility('reveal'));
    this.boostBtn.addEventListener('click', () => this.activateAbility('boost'));
    this.breachBtn.addEventListener('click', () => this.activateAbility('breach'));
  }

  startGame() {
    this.overlay.style.opacity = '0';
    setTimeout(() => {
      this.overlay.style.display = 'none';
    }, 500);

    this.gameActive = true;
    this.resetLevel();
    this.startTimer();

    // Play start sound
    this.playSound('start');
    showNotification('NEURAL BREACH INITIALIZED');
  }

  resetGame() {
    clearInterval(this.timerInterval);
    this.level = 1;
    this.score = 0;
    this.timeRemaining = 60;
    this.updateDisplay();

    this.resetLevel();

    // Reset abilities
    Object.keys(this.abilities).forEach(key => {
      this.abilities[key].active = false;
      this.abilities[key].cooldown = 0;
    });
    this.updateAbilityButtons();

    showNotification('NEURAL BREACH RESET');
  }

  resetLevel() {
    // Clear existing nodes and connections
    this.nodes = [];
    this.connections = [];
    this.completedPaths = [];
    this.selectedNode = null;

    // Generate new level
    this.generateLevel();

    // Draw the board
    this.draw();
  }

  generateLevel() {
    // Calculate grid spacing
    const gridWidth = this.canvas.width - 40;
    const gridHeight = this.canvas.height - 40;
    const cellWidth = gridWidth / this.gridSize.x;
    const cellHeight = gridHeight / this.gridSize.y;

    // Generate nodes
    for (let y = 0; y < this.gridSize.y; y++) {
      for (let x = 0; x < this.gridSize.x; x++) {
        // Don't place nodes at every position (create some empty spaces)
        if (Math.random() > 0.6) {
          const nodeX = 20 + x * cellWidth + cellWidth / 2;
          const nodeY = 20 + y * cellHeight + cellHeight / 2;

          this.nodes.push({
            x: nodeX,
            y: nodeY,
            type: 'normal',
            connected: false,
            revealed: false,
            gridPos: { x, y }
          });
        }
      }
    }

    // Ensure we have at least some minimum number of nodes
    const minNodes = 10 + this.level * 2;
    while (this.nodes.length < minNodes) {
      const x = Math.floor(Math.random() * this.gridSize.x);
      const y = Math.floor(Math.random() * this.gridSize.y);

      // Check if position is already occupied
      const existing = this.nodes.find(node => node.gridPos.x === x && node.gridPos.y === y);
      if (!existing) {
        const nodeX = 20 + x * cellWidth + cellWidth / 2;
        const nodeY = 20 + y * cellHeight + cellHeight / 2;

        this.nodes.push({
          x: nodeX,
          y: nodeY,
          type: 'normal',
          connected: false,
          revealed: false,
          gridPos: { x, y }
        });
      }
    }

    // Add some firewall nodes (obstacles) based on level
    const firewallCount = Math.min(3 + Math.floor(this.level / 2), 10);
    for (let i = 0; i < firewallCount; i++) {
      const index = Math.floor(Math.random() * this.nodes.length);
      if (this.nodes[index].type === 'normal') {
        this.nodes[index].type = 'firewall';
      }
    }

    // Select source and target nodes (on opposite sides)
    const leftSide = this.nodes.filter(node => node.gridPos.x < 2 && node.type === 'normal');
    const rightSide = this.nodes.filter(node => node.gridPos.x > this.gridSize.x - 3 && node.type === 'normal');

    if (leftSide.length > 0 && rightSide.length > 0) {
      this.sourceNode = leftSide[Math.floor(Math.random() * leftSide.length)];
      this.targetNode = rightSide[Math.floor(Math.random() * rightSide.length)];

      this.sourceNode.type = 'source';
      this.sourceNode.revealed = true;
      this.targetNode.type = 'target';
      this.targetNode.revealed = true;
    } else {
      // Fallback if we don't have nodes on both sides
      this.sourceNode = this.nodes[0];
      this.targetNode = this.nodes[this.nodes.length - 1];

      this.sourceNode.type = 'source';
      this.sourceNode.revealed = true;
      this.targetNode.type = 'target';
      this.targetNode.revealed = true;
    }

    // Reveal a few random nodes to help the player
    const revealCount = Math.max(3, Math.floor(this.nodes.length * 0.2));
    for (let i = 0; i < revealCount; i++) {
      const index = Math.floor(Math.random() * this.nodes.length);
      this.nodes[index].revealed = true;
    }
  }

  startTimer() {
    clearInterval(this.timerInterval);

    this.timerInterval = setInterval(() => {
      this.timeRemaining--;
      this.updateDisplay();

      // Update ability cooldowns
      Object.keys(this.abilities).forEach(key => {
        if (this.abilities[key].cooldown > 0) {
          this.abilities[key].cooldown--;
        }
      });
      this.updateAbilityButtons();

      if (this.timeRemaining <= 0) {
        this.endGame(false);
      }
    }, 1000);
  }

  updateDisplay() {
    this.levelDisplay.textContent = this.level;
    this.timerDisplay.textContent = this.timeRemaining;
    this.scoreDisplay.textContent = this.score;
  }

  updateAbilityButtons() {
    // Update reveal button
    if (this.abilities.reveal.cooldown > 0) {
      this.revealBtn.classList.add('disabled');
      this.revealBtn.textContent = `NODE REVEAL (${this.abilities.reveal.cooldown}s)`;
    } else {
      this.revealBtn.classList.remove('disabled');
      this.revealBtn.textContent = 'NODE REVEAL';
    }

    // Update boost button
    if (this.abilities.boost.cooldown > 0) {
      this.boostBtn.classList.add('disabled');
      this.boostBtn.textContent = `PATH BOOST (${this.abilities.boost.cooldown}s)`;
    } else {
      this.boostBtn.classList.remove('disabled');
      this.boostBtn.textContent = 'PATH BOOST';
    }

    // Update breach button
    if (this.abilities.breach.cooldown > 0) {
      this.breachBtn.classList.add('disabled');
      this.breachBtn.textContent = `FIREWALL BREACH (${this.abilities.breach.cooldown}s)`;
    } else {
      this.breachBtn.classList.remove('disabled');
      this.breachBtn.textContent = 'FIREWALL BREACH';
    }
  }

  handleCanvasClick(x, y) {
    // Find if we clicked on a node
    const clickedNode = this.findNodeAtPosition(x, y);

    if (clickedNode) {
      // Can't click on firewall nodes unless breach ability is active
      if (clickedNode.type === 'firewall' && !this.abilities.breach.active) {
        this.playSound('error');
        showNotification('FIREWALL PROTECTION ACTIVE - BREACH REQUIRED');
        return;
      }

      // If node is not revealed and reveal ability is not active, can't select it
      if (!clickedNode.revealed && !this.abilities.reveal.active) {
        this.playSound('error');
        showNotification('NODE ENCRYPTED - REVEAL REQUIRED');
        return;
      }

      // If this is the first node selected
      if (!this.selectedNode) {
        this.selectedNode = clickedNode;
        this.playSound('select');

        // If reveal ability is active, reveal the node
        if (this.abilities.reveal.active) {
          clickedNode.revealed = true;
          this.abilities.reveal.active = false;
          this.playSound('ability');
          showNotification('NODE REVEALED');
        }
      }
      // If we already have a selected node, try to connect
      else {
        // Check if nodes are close enough to connect
        if (this.canConnect(this.selectedNode, clickedNode)) {
          // Create connection
          this.connections.push({
            from: this.selectedNode,
            to: clickedNode,
            active: true
          });

          // Mark nodes as connected
          this.selectedNode.connected = true;
          clickedNode.connected = true;

          // If boost ability is active, extend the connection
          if (this.abilities.boost.active) {
            this.selectedNode = clickedNode;
            this.abilities.boost.active = false;
            this.playSound('ability');
            showNotification('PATH BOOSTED');
          } else {
            this.selectedNode = null;
          }

          this.playSound('connect');

          // Check if we've reached the target
          if (clickedNode === this.targetNode || this.selectedNode === this.targetNode) {
            this.completedPaths.push([...this.connections]);
            this.playSound('success');
            showNotification('CONNECTION ESTABLISHED');

            // Check if level is complete
            if (this.isLevelComplete()) {
              this.completeLevel();
            }
          }
        } else {
          // Nodes too far apart
          this.playSound('error');
          showNotification('CONNECTION RANGE EXCEEDED');
          this.selectedNode = null;
        }
      }

      // If breach ability is active, convert firewall to normal
      if (clickedNode.type === 'firewall' && this.abilities.breach.active) {
        clickedNode.type = 'normal';
        this.abilities.breach.active = false;
        this.playSound('ability');
        showNotification('FIREWALL BREACHED');
      }

      this.draw();
    } else {
      // Clicked on empty space, deselect
      this.selectedNode = null;
      this.draw();
    }
  }

  handleCanvasHover(x, y) {
    const hoveredNode = this.findNodeAtPosition(x, y);

    // Update cursor style
    if (hoveredNode) {
      this.canvas.style.cursor = 'pointer';
    } else {
      this.canvas.style.cursor = 'default';
    }

    // Draw connection preview if we have a selected node
    if (this.selectedNode && hoveredNode && hoveredNode !== this.selectedNode) {
      this.draw();

      // Draw preview connection
      this.ctx.beginPath();
      this.ctx.moveTo(this.selectedNode.x, this.selectedNode.y);
      this.ctx.lineTo(x, y);
      this.ctx.strokeStyle = this.canConnect(this.selectedNode, hoveredNode) ?
        'rgba(0, 255, 204, 0.5)' : 'rgba(255, 0, 0, 0.5)';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
    } else {
      this.draw();
    }
  }

  findNodeAtPosition(x, y) {
    return this.nodes.find(node => {
      const dx = node.x - x;
      const dy = node.y - y;
      return Math.sqrt(dx * dx + dy * dy) <= this.nodeSize / 2;
    });
  }

  canConnect(node1, node2) {
    // Check distance between nodes
    const dx = node1.x - node2.x;
    const dy = node1.y - node2.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Base connection range increases with level
    const baseRange = 100 + (this.level * 5);

    // Boost ability increases range
    const range = this.abilities.boost.active ? baseRange * 1.5 : baseRange;

    return distance <= range;
  }

  isLevelComplete() {
    // Check if there's a path from source to target
    return this.completedPaths.length > 0;
  }

  completeLevel() {
    clearInterval(this.timerInterval);

    // Calculate score based on time remaining and level
    const timeBonus = this.timeRemaining * 10;
    const levelBonus = this.level * 100;
    const totalBonus = timeBonus + levelBonus;

    this.score += totalBonus;

    // Show level complete message
    this.overlay.style.display = 'flex';
    this.overlay.style.opacity = '1';

    const message = document.createElement('div');
    message.className = 'game-message';
    message.innerHTML = `
      <h3>LEVEL ${this.level} COMPLETE</h3>
      <p>Time Bonus: ${timeBonus}</p>
      <p>Level Bonus: ${levelBonus}</p>
      <p>Total Score: ${this.score}</p>
      <button id="next-level-btn" class="game-button">NEXT LEVEL</button>
    `;

    // Clear existing content
    this.overlay.innerHTML = '';
    this.overlay.appendChild(message);

    // Add event listener to next level button
    document.getElementById('next-level-btn').addEventListener('click', () => {
      this.level++;
      this.timeRemaining = 60 + (this.level * 5); // More time for higher levels
      this.updateDisplay();

      this.overlay.style.opacity = '0';
      setTimeout(() => {
        this.overlay.style.display = 'none';
      }, 500);

      this.resetLevel();
      this.startTimer();

      showNotification(`LEVEL ${this.level} INITIALIZED`);
    });

    this.playSound('levelComplete');
  }

  endGame(success) {
    clearInterval(this.timerInterval);
    this.gameActive = false;

    // Show game over message
    this.overlay.style.display = 'flex';
    this.overlay.style.opacity = '1';

    const message = document.createElement('div');
    message.className = 'game-message';

    if (success) {
      message.innerHTML = `
        <h3>NEURAL BREACH COMPLETE</h3>
        <p>Final Score: ${this.score}</p>
        <p>Levels Completed: ${this.level}</p>
        <button id="restart-btn" class="game-button">RESTART</button>
      `;
      this.playSound('gameComplete');
    } else {
      message.innerHTML = `
        <h3>NEURAL BREACH FAILED</h3>
        <p>Time Expired</p>
        <p>Final Score: ${this.score}</p>
        <p>Level Reached: ${this.level}</p>
        <button id="restart-btn" class="game-button">RESTART</button>
      `;
      this.playSound('gameOver');
    }

    // Clear existing content
    this.overlay.innerHTML = '';
    this.overlay.appendChild(message);

    // Add event listener to restart button
    document.getElementById('restart-btn').addEventListener('click', () => {
      this.resetGame();
      this.overlay.style.opacity = '0';
      setTimeout(() => {
        this.overlay.style.display = 'none';
      }, 500);
    });
  }

  activateAbility(abilityName) {
    const ability = this.abilities[abilityName];

    if (ability.cooldown > 0) {
      this.playSound('error');
      showNotification(`ABILITY ON COOLDOWN: ${ability.cooldown}s`);
      return;
    }

    ability.active = true;
    ability.cooldown = ability.maxCooldown;

    switch (abilityName) {
      case 'reveal':
        showNotification('NODE REVEAL ACTIVATED - CLICK TO REVEAL HIDDEN NODE');
        break;
      case 'boost':
        showNotification('PATH BOOST ACTIVATED - NEXT CONNECTION EXTENDS RANGE');
        break;
      case 'breach':
        showNotification('FIREWALL BREACH ACTIVATED - CLICK TO BREACH FIREWALL');
        break;
    }

    this.updateAbilityButtons();
    this.playSound('abilityActivate');
  }

  draw() {
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw grid background
    this.drawGrid();

    // Draw connections
    this.drawConnections();

    // Draw nodes
    this.drawNodes();
  }

  drawGrid() {
    this.ctx.strokeStyle = 'rgba(0, 170, 255, 0.1)';
    this.ctx.lineWidth = 1;

    // Calculate grid spacing
    const gridWidth = this.canvas.width - 40;
    const gridHeight = this.canvas.height - 40;
    const cellWidth = gridWidth / this.gridSize.x;
    const cellHeight = gridHeight / this.gridSize.y;

    // Draw vertical lines
    for (let x = 0; x <= this.gridSize.x; x++) {
      this.ctx.beginPath();
      this.ctx.moveTo(20 + x * cellWidth, 20);
      this.ctx.lineTo(20 + x * cellWidth, 20 + gridHeight);
      this.ctx.stroke();
    }

    // Draw horizontal lines
    for (let y = 0; y <= this.gridSize.y; y++) {
      this.ctx.beginPath();
      this.ctx.moveTo(20, 20 + y * cellHeight);
      this.ctx.lineTo(20 + gridWidth, 20 + y * cellHeight);
      this.ctx.stroke();
    }
  }

  drawConnections() {
    // Draw completed paths first
    this.completedPaths.forEach(path => {
      path.forEach(conn => {
        this.ctx.beginPath();
        this.ctx.moveTo(conn.from.x, conn.from.y);
        this.ctx.lineTo(conn.to.x, conn.to.y);
        this.ctx.strokeStyle = 'rgba(0, 255, 102, 0.7)';
        this.ctx.lineWidth = 3;
        this.ctx.stroke();
      });
    });

    // Draw active connections
    this.connections.forEach(conn => {
      if (!conn.active) return;

      this.ctx.beginPath();
      this.ctx.moveTo(conn.from.x, conn.from.y);
      this.ctx.lineTo(conn.to.x, conn.to.y);
      this.ctx.strokeStyle = 'rgba(0, 255, 204, 0.7)';
      this.ctx.lineWidth = 3;
      this.ctx.stroke();
    });
  }

  drawNodes() {
    this.nodes.forEach(node => {
      // Skip drawing if not revealed and not source/target
      if (!node.revealed && node.type !== 'source' && node.type !== 'target') {
        // Draw hidden node placeholder
        this.ctx.beginPath();
        this.ctx.arc(node.x, node.y, this.nodeSize / 4, 0, Math.PI * 2);
        this.ctx.fillStyle = 'rgba(100, 100, 150, 0.3)';
        this.ctx.fill();
        return;
      }

      // Draw node circle
      this.ctx.beginPath();
      this.ctx.arc(node.x, node.y, this.nodeSize / 2, 0, Math.PI * 2);

      // Set fill style based on node type
      switch (node.type) {
        case 'source':
          this.ctx.fillStyle = 'rgba(0, 170, 255, 0.7)';
          break;
        case 'target':
          this.ctx.fillStyle = 'rgba(0, 255, 102, 0.7)';
          break;
        case 'firewall':
          this.ctx.fillStyle = 'rgba(255, 102, 0, 0.7)';
          break;
        default:
          this.ctx.fillStyle = node === this.selectedNode ?
            'rgba(255, 0, 170, 0.7)' : 'rgba(200, 200, 255, 0.5)';
      }

      this.ctx.fill();

      // Draw node border
      this.ctx.lineWidth = 2;
      this.ctx.strokeStyle = node === this.selectedNode ?
        'rgba(255, 0, 170, 0.9)' : 'rgba(200, 200, 255, 0.8)';
      this.ctx.stroke();

      // Draw node icon/symbol based on type
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.font = '14px monospace';

      switch (node.type) {
        case 'source':
          this.ctx.fillText('S', node.x, node.y);
          break;
        case 'target':
          this.ctx.fillText('T', node.x, node.y);
          break;
        case 'firewall':
          this.ctx.fillText('F', node.x, node.y);
          break;
        default:
          if (node.connected) {
            this.ctx.fillText('•', node.x, node.y);
          }
      }
    });
  }

  playSound(type) {
    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      switch (type) {
        case 'start':
          oscillator.type = 'sine';
          oscillator.frequency.setValueAtTime(440, this.audioContext.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(880, this.audioContext.currentTime + 0.2);
          gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
          oscillator.start();
          oscillator.stop(this.audioContext.currentTime + 0.3);
          break;

        case 'select':
          oscillator.type = 'sine';
          oscillator.frequency.setValueAtTime(330, this.audioContext.currentTime);
          gainNode.gain.setValueAtTime(0.2, this.audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
          oscillator.start();
          oscillator.stop(this.audioContext.currentTime + 0.1);
          break;

        case 'connect':
          oscillator.type = 'sine';
          oscillator.frequency.setValueAtTime(440, this.audioContext.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(660, this.audioContext.currentTime + 0.1);
          gainNode.gain.setValueAtTime(0.2, this.audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);
          oscillator.start();
          oscillator.stop(this.audioContext.currentTime + 0.2);
          break;

        case 'error':
          oscillator.type = 'sawtooth';
          oscillator.frequency.setValueAtTime(220, this.audioContext.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(110, this.audioContext.currentTime + 0.2);
          gainNode.gain.setValueAtTime(0.2, this.audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);
          oscillator.start();
          oscillator.stop(this.audioContext.currentTime + 0.2);
          break;

        case 'success':
          oscillator.type = 'sine';
          oscillator.frequency.setValueAtTime(440, this.audioContext.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(880, this.audioContext.currentTime + 0.1);
          gainNode.gain.setValueAtTime(0.2, this.audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
          oscillator.start();

          setTimeout(() => {
            const osc2 = this.audioContext.createOscillator();
            const gain2 = this.audioContext.createGain();
            osc2.connect(gain2);
            gain2.connect(this.audioContext.destination);
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(660, this.audioContext.currentTime);
            osc2.frequency.exponentialRampToValueAtTime(1320, this.audioContext.currentTime + 0.1);
            gain2.gain.setValueAtTime(0.2, this.audioContext.currentTime);
            gain2.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
            osc2.start();
            osc2.stop(this.audioContext.currentTime + 0.3);
          }, 100);

          oscillator.stop(this.audioContext.currentTime + 0.3);
          break;

        case 'ability':
          oscillator.type = 'triangle';
          oscillator.frequency.setValueAtTime(220, this.audioContext.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(880, this.audioContext.currentTime + 0.3);
          gainNode.gain.setValueAtTime(0.2, this.audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.4);
          oscillator.start();
          oscillator.stop(this.audioContext.currentTime + 0.4);
          break;

        case 'abilityActivate':
          oscillator.type = 'triangle';
          oscillator.frequency.setValueAtTime(440, this.audioContext.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(220, this.audioContext.currentTime + 0.1);
          oscillator.frequency.exponentialRampToValueAtTime(660, this.audioContext.currentTime + 0.2);
          gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
          oscillator.start();
          oscillator.stop(this.audioContext.currentTime + 0.3);
          break;

        case 'levelComplete':
          // Play a sequence of notes
          [440, 554, 659, 880].forEach((freq, i) => {
            setTimeout(() => {
              const osc = this.audioContext.createOscillator();
              const gain = this.audioContext.createGain();
              osc.connect(gain);
              gain.connect(this.audioContext.destination);
              osc.type = 'sine';
              osc.frequency.value = freq;
              gain.gain.setValueAtTime(0.3, this.audioContext.currentTime);
              gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
              osc.start();
              osc.stop(this.audioContext.currentTime + 0.3);
            }, i * 100);
          });
          break;

        case 'gameComplete':
          // Play a triumphant sequence
          [440, 554, 659, 880, 1108, 880, 1108, 1320].forEach((freq, i) => {
            setTimeout(() => {
              const osc = this.audioContext.createOscillator();
              const gain = this.audioContext.createGain();
              osc.connect(gain);
              gain.connect(this.audioContext.destination);
              osc.type = 'sine';
              osc.frequency.value = freq;
              gain.gain.setValueAtTime(0.3, this.audioContext.currentTime);
              gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.4);
              osc.start();
              osc.stop(this.audioContext.currentTime + 0.4);
            }, i * 150);
          });
          break;

        case 'gameOver':
          // Play a sad sequence
          [440, 415, 392, 349].forEach((freq, i) => {
            setTimeout(() => {
              const osc = this.audioContext.createOscillator();
              const gain = this.audioContext.createGain();
              osc.connect(gain);
              gain.connect(this.audioContext.destination);
              osc.type = 'sine';
              osc.frequency.value = freq;
              gain.gain.setValueAtTime(0.3, this.audioContext.currentTime);
              gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.4);
              osc.start();
              osc.stop(this.audioContext.currentTime + 0.4);
            }, i * 200);
          });
          break;
      }
    } catch (e) {
      console.error('Error playing sound:', e);
    }
  }
}

// --- Scroll Reveal Intersection Observer ---
document.addEventListener("DOMContentLoaded", () => {
  // Initialize game
  window.neuralBreachGame = new NeuralBreachGame();

  // Setup mouse light effect
  setupMouseLight();

  // Setup floating action buttons
  setupFloatingActionButtons();

  // Add ripple effect to buttons
  document.querySelectorAll('.button, .game-button').forEach(button => {
    button.addEventListener('click', (e) => {
      createRipple(e, button);
    });
  });

  // Initialize sandstorm effect
  createDOMSandstorm();

  const scrollRevealElements = document.querySelectorAll('.scroll-reveal');

  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');

        // If this is the game section, initialize the game
        if (entry.target.id === 'neural-breach-game' && window.neuralBreachGame) {
          // Just make sure the game is visible, don't auto-start
          window.neuralBreachGame.draw();
        }
      }
    });
  }, { threshold: 0.05, rootMargin: "0px 0px -50px 0px" });

  scrollRevealElements.forEach(el => {
    revealObserver.observe(el);
  });

  // Initialize parallax effect
  const parallaxElements = document.querySelectorAll('.parallax-bg');
  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;
    parallaxElements.forEach(el => {
      const speed = el.dataset.speed || 0.5;
      el.style.transform = `translateY(${scrollY * speed}px)`;
    });
  });

  // Log initialization complete
  console.log("Enhanced ORDINARY//ACCESS.PANEL initialized successfully");
});

