/**
 * SDF VOID ENTITY (SDF-CREATURE)
 * Crawls inside obsidian black text windows across Ordinary Technology.
 * Slithers through windows, tunnels across dark glass surfaces,
 * and hides into the void when stared at for too long (> 0.45s).
 */
(function () {
  'use strict';

  // 1. Create Overlay Canvas
  const canvas = document.createElement('canvas');
  canvas.id = 'sdf-entity-canvas';
  canvas.style.position = 'fixed';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '9999';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');

  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  // Mouse Tracking
  let mouseX = -9999;
  let mouseY = -9999;
  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  // Query all obsidian black windows
  function getBlackWindows() {
    const selectors = [
      '.showcase-item',
      '.archive-entry',
      '.os-tool-window',
      '.terminal-frame',
      '.hardpoint',
      '.sidebar-ad',
      '.game-container',
      '.console-output',
      '.os-module',
      '.os-folder'
    ];
    const elements = document.querySelectorAll(selectors.join(','));
    const rects = [];
    elements.forEach((el) => {
      const r = el.getBoundingClientRect();
      // Only include visible windows with non-zero dimensions
      if (r.width > 30 && r.height > 30 && r.bottom > 0 && r.top < window.innerHeight) {
        rects.push({
          element: el,
          left: r.left,
          top: r.top,
          width: r.width,
          height: r.height,
          right: r.right,
          bottom: r.bottom,
          centerX: r.left + r.width / 2,
          centerY: r.top + r.height / 2
        });
      }
    });
    return rects;
  }

  // Entity State Parameters
  const numNodes = 7;
  const nodes = [];
  for (let i = 0; i < numNodes; i++) {
    nodes.push({
      x: width / 2,
      y: height / 2,
      targetRadius: 18 - i * 1.8,
      radius: 0,
      angle: 0
    });
  }

  let currentRect = null;
  let targetX = width / 2;
  let targetY = height / 2;
  let moveSpeed = 2.5;

  let state = 'EMERGING'; // EMERGING, CRAWLING, STARING_REACTION, HIDING, HIDDEN
  let stareTimer = 0;
  let hideCooldown = 0;
  let scaleFactor = 0; // 0 to 1
  let opacity = 0; // 0 to 1
  let nextWanderTime = 0;

  // Pick best target window
  function pickNewWindow(avoidMouse = false) {
    const windows = getBlackWindows();
    if (!windows.length) return null;

    if (avoidMouse) {
      // Pick a window far away from mouse
      windows.sort((a, b) => {
        const distA = Math.hypot(a.centerX - mouseX, a.centerY - mouseY);
        const distB = Math.hypot(b.centerX - mouseX, b.centerY - mouseY);
        return distB - distA; // Descending distance
      });
      return windows[0];
    } else {
      // Pick random window
      const idx = Math.floor(Math.random() * windows.length);
      return windows[idx];
    }
  }

  // Set internal wander point inside current window
  function setWanderTarget() {
    if (!currentRect) {
      currentRect = pickNewWindow();
      if (!currentRect) return;
    }
    // Pick random spot inside current window bounds with 20px padding
    const padding = 25;
    const minX = currentRect.left + padding;
    const maxX = currentRect.right - padding;
    const minY = currentRect.top + padding;
    const maxY = currentRect.bottom - padding;

    if (maxX > minX && maxY > minY) {
      targetX = minX + Math.random() * (maxX - minX);
      targetY = minY + Math.random() * (maxY - minY);
    } else {
      targetX = currentRect.centerX;
      targetY = currentRect.centerY;
    }
  }

  let lastTime = performance.now();

  function animateEntity(now) {
    requestAnimationFrame(animateEntity);
    const dt = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;

    // Clear Canvas
    ctx.clearRect(0, 0, width, height);

    const windows = getBlackWindows();
    if (!windows.length) return;

    // Initialize currentRect if needed
    if (!currentRect) {
      currentRect = pickNewWindow();
      if (currentRect) {
        nodes[0].x = currentRect.centerX;
        nodes[0].y = currentRect.centerY;
        for (let i = 1; i < numNodes; i++) {
          nodes[i].x = nodes[0].x;
          nodes[i].y = nodes[0].y;
        }
        setWanderTarget();
      } else {
        return;
      }
    }

    // Refresh currentRect rect coordinates in case window scrolled or moved
    const updatedRect = windows.find(w => w.element === currentRect.element);
    if (updatedRect) {
      currentRect = updatedRect;
    }

    const head = nodes[0];
    const distToMouse = Math.hypot(head.x - mouseX, head.y - mouseY);

    // --- State Machine ---
    if (state === 'CRAWLING' || state === 'EMERGING' || state === 'STARING_REACTION') {
      // Check if user is looking / hovering near entity
      if (distToMouse < 140) {
        stareTimer += dt;
        if (stareTimer > 0.15 && state !== 'HIDING') {
          state = 'STARING_REACTION';
        }
        // STARE THRESHOLD: > 0.45s -> HIDE FROM USER!
        if (stareTimer >= 0.45) {
          state = 'HIDING';
        }
      } else {
        stareTimer = Math.max(0, stareTimer - dt * 2);
        if (state === 'STARING_REACTION' && stareTimer === 0) {
          state = 'CRAWLING';
        }
      }
    }

    if (state === 'HIDING') {
      scaleFactor = Math.max(0, scaleFactor - dt * 4.5);
      opacity = Math.max(0, opacity - dt * 4.5);
      if (scaleFactor === 0) {
        state = 'HIDDEN';
        hideCooldown = 3.5 + Math.random() * 2.0; // Hide for 3.5-5.5s
      }
    } else if (state === 'HIDDEN') {
      hideCooldown -= dt;
      if (hideCooldown <= 0) {
        // Teleport entity to new distant window
        currentRect = pickNewWindow(true);
        if (currentRect) {
          nodes[0].x = currentRect.centerX;
          nodes[0].y = currentRect.centerY;
          for (let i = 1; i < numNodes; i++) {
            nodes[i].x = nodes[0].x;
            nodes[i].y = nodes[0].y;
          }
          setWanderTarget();
        }
        state = 'EMERGING';
        stareTimer = 0;
      }
    } else if (state === 'EMERGING') {
      scaleFactor = Math.min(1, scaleFactor + dt * 1.5);
      opacity = Math.min(1, opacity + dt * 1.5);
      if (scaleFactor >= 1) {
        state = 'CRAWLING';
      }
    } else if (state === 'CRAWLING') {
      scaleFactor = 1;
      opacity = 1;
    }

    // --- Movement Logic ---
    if (state === 'CRAWLING' || state === 'STARING_REACTION' || state === 'EMERGING') {
      // Periodically switch target window to travel through all black windows
      if (now > nextWanderTime) {
        if (Math.random() < 0.35) {
          // Tunnel to a new window!
          currentRect = pickNewWindow();
        }
        setWanderTarget();
        nextWanderTime = now + 3500 + Math.random() * 4000;
      }

      // Move Head towards target
      const dx = targetX - head.x;
      const dy = targetY - head.y;
      const distToTarget = Math.hypot(dx, dy);

      if (distToTarget < 15) {
        setWanderTarget();
      } else {
        const curSpeed = state === 'STARING_REACTION' ? moveSpeed * 2.2 : moveSpeed;
        head.x += (dx / distToTarget) * curSpeed;
        head.y += (dy / distToTarget) * curSpeed;
      }

      // Inverse Kinematics / Follower Nodes
      for (let i = 1; i < numNodes; i++) {
        const prev = nodes[i - 1];
        const curr = nodes[i];
        const ndx = prev.x - curr.x;
        const ndy = prev.y - curr.y;
        const ndist = Math.hypot(ndx, ndy);
        const targetDist = (prev.targetRadius + curr.targetRadius) * 0.7;

        if (ndist > targetDist) {
          const angle = Math.atan2(ndy, ndx);
          curr.x = prev.x - Math.cos(angle) * targetDist;
          curr.y = prev.y - Math.sin(angle) * targetDist;
        }
      }
    }

    // Don't render if completely invisible
    if (opacity <= 0.01) return;

    // --- Render SDF Creature ---
    ctx.save();
    ctx.globalAlpha = opacity;

    // Clip rendering strictly to current window bounds so it looks inside the glass window
    if (currentRect) {
      ctx.beginPath();
      // Add slight padding so entity can slither close to borders
      ctx.rect(currentRect.left, currentRect.top, currentRect.width, currentRect.height);
      ctx.clip();
    }

    // 1. Draw Void Shadow Aura (Outer SDF Glow)
    for (let i = numNodes - 1; i >= 0; i--) {
      const node = nodes[i];
      const r = node.targetRadius * scaleFactor * 2.2;
      if (r <= 0) continue;

      const grad = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, r);
      grad.addColorStop(0, state === 'STARING_REACTION' ? 'rgba(180, 20, 60, 0.4)' : 'rgba(0, 220, 255, 0.3)');
      grad.addColorStop(0.5, 'rgba(10, 0, 30, 0.25)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. Draw Organic Connecting Body (SDF Fluid Metaballs)
    ctx.fillStyle = state === 'STARING_REACTION' ? '#12040b' : '#040711';
    ctx.strokeStyle = state === 'STARING_REACTION' ? 'rgba(255, 40, 90, 0.6)' : 'rgba(0, 240, 255, 0.5)';
    ctx.lineWidth = 1.5;

    for (let i = 0; i < numNodes; i++) {
      const node = nodes[i];
      const r = node.targetRadius * scaleFactor;
      if (r <= 0) continue;

      ctx.beginPath();
      ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Draw Smooth Spine / Tentacle Bridge
    ctx.beginPath();
    ctx.moveTo(nodes[0].x, nodes[0].y);
    for (let i = 1; i < numNodes; i++) {
      const xc = (nodes[i].x + nodes[i - 1].x) / 2;
      const yc = (nodes[i].y + nodes[i - 1].y) / 2;
      ctx.quadraticCurveTo(nodes[i - 1].x, nodes[i - 1].y, xc, yc);
    }
    ctx.strokeStyle = state === 'STARING_REACTION' ? 'rgba(255, 60, 100, 0.8)' : 'rgba(0, 255, 200, 0.7)';
    ctx.lineWidth = 3 * scaleFactor;
    ctx.stroke();

    // 3. Draw Bioluminescent Entity Eye at Head
    if (scaleFactor > 0.3) {
      const eyeR = 5 * scaleFactor;
      // Eye Glow
      const eyeGrad = ctx.createRadialGradient(head.x, head.y, 0, head.x, head.y, eyeR * 3);
      const eyeColor = state === 'STARING_REACTION' ? 'rgba(255, 20, 60, 1)' : 'rgba(0, 255, 220, 1)';
      eyeGrad.addColorStop(0, eyeColor);
      eyeGrad.addColorStop(0.4, state === 'STARING_REACTION' ? 'rgba(255, 0, 80, 0.6)' : 'rgba(0, 200, 255, 0.6)');
      eyeGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = eyeGrad;
      ctx.beginPath();
      ctx.arc(head.x, head.y, eyeR * 3, 0, Math.PI * 2);
      ctx.fill();

      // Slit Pupil
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      const pupilWidth = (state === 'STARING_REACTION' ? 1.2 : 2.0) * scaleFactor;
      const pupilHeight = (state === 'STARING_REACTION' ? 6.0 : 4.0) * scaleFactor;
      ctx.ellipse(head.x, head.y, pupilWidth, pupilHeight, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  // Start Animation Loop
  requestAnimationFrame(animateEntity);
})();
