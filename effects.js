document.addEventListener('DOMContentLoaded', () => {
    // ==========================================
    // 0. GLOBAL CSS INJECTIONS & SELECTION OVERRIDE
    // ==========================================
    const customStyle = document.createElement('style');
    customStyle.innerHTML = `
        /* Cyberpunk Text Selection */
        ::selection {
            background: rgba(0, 255, 170, 0.9);
            color: #000;
            text-shadow: none;
        }
        ::-moz-selection {
            background: rgba(0, 255, 170, 0.9);
            color: #000;
            text-shadow: none;
        }

        /* Dynamic Noise Overlay */
        .noise-overlay {
            transition: opacity 0.1s ease-out;
        }

        /* ASCII Click Particles */
        .fx-ascii-particle {
            position: fixed;
            color: #00ffaa;
            font-family: monospace;
            font-weight: bold;
            font-size: 14px;
            pointer-events: none;
            z-index: 10000;
            text-shadow: 0 0 5px #00ffaa;
            will-change: transform, opacity;
        }

        /* Idle Anomaly Glitch */
        @keyframes idle-glitch {
            0% { transform: translate(0); }
            20% { transform: translate(-2px, 1px); filter: hue-rotate(90deg); }
            40% { transform: translate(-1px, -1px); filter: hue-rotate(-90deg); }
            60% { transform: translate(2px, 1px); filter: hue-rotate(0deg); }
            80% { transform: translate(1px, -1px); }
            100% { transform: translate(0); }
        }
        .idle-glitching {
            animation: idle-glitch 0.2s cubic-bezier(.25, .46, .45, .94) both;
        }

        /* Magnetic Cursor Core */
        #fx-cursor-glow {
            position: fixed;
            top: 0; 
            left: 0;
            width: 400px; 
            height: 400px;
            background: radial-gradient(circle, rgba(0, 255, 170, 0.12) 0%, transparent 60%);
            border-radius: 50%;
            pointer-events: none;
            transform: translate(-50%, -50%);
            z-index: 9999;
            mix-blend-mode: screen;
            transition: width 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275), 
                        height 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275), 
                        background 0.3s;
            will-change: left, top, width, height;
        }
        body:active #fx-cursor-glow {
            width: 250px !important; 
            height: 250px !important;
            background: radial-gradient(circle, rgba(255, 0, 85, 0.25) 0%, transparent 70%) !important;
        }
    `;
    document.head.appendChild(customStyle);

    // ==========================================
    // 1. WORKER INITIALIZATION (CPU OFFLOADING)
    // ==========================================
    const worker = new Worker('translator.js');
    
    // DOM Element References
    const scrollWrapper = document.getElementById('css3d-container') || document.body;
    scrollWrapper.style.transition = 'transform 0.1s cubic-bezier(0.25, 0.46, 0.45, 0.94), filter 0.1s ease-out';
    scrollWrapper.style.willChange = 'transform, filter';
    
    const noiseOverlay = document.querySelector('.noise-overlay');
    
    // Card setup for Parallax
    const cards = document.querySelectorAll('.showcase-item, .archive-entry');
    const cardData = [];
    cards.forEach((card, index) => {
        card.dataset.fxId = index;
        card.style.transformStyle = 'preserve-3d';
        card.style.transition = 'transform 0.1s ease-out';
        const rect = card.getBoundingClientRect();
        cardData.push({
            id: index,
            rect: {
                left: rect.left,
                right: rect.right,
                top: rect.top,
                bottom: rect.bottom,
                width: rect.width,
                height: rect.height,
                centerX: rect.width / 2,
                centerY: rect.height / 2
            }
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)';
            card.style.transition = 'transform 0.4s ease-out';
        });
        card.addEventListener('mouseenter', () => {
            card.style.transition = 'transform 0.1s ease-out';
        });
    });

    // Send initial card boxes to worker so it doesn't need to ask the DOM
    worker.postMessage({ type: 'init_cards', cards: cardData });

    // Handle recalculating card rects on resize
    window.addEventListener('resize', () => {
        const newCardData = [];
        cards.forEach((card, index) => {
            const rect = card.getBoundingClientRect();
            newCardData.push({
                id: index,
                rect: {
                    left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom,
                    width: rect.width, height: rect.height, centerX: rect.width / 2, centerY: rect.height / 2
                }
            });
        });
        worker.postMessage({ type: 'init_cards', cards: newCardData });
    });

    // Particle DOM tracking
    const activeParticles = new Map();

    // ==========================================
    // 2. WORKER MESSAGE HANDLER (APPLY CSS)
    // ==========================================
    worker.onmessage = function(e) {
        const payload = e.data;

        // Apply Scroll Physics
        if (payload.scroll) {
            if (payload.scroll.skew === 0 && payload.scroll.rgbShift === 0) {
                if (scrollWrapper.style.transform !== 'skewY(0deg)') {
                    scrollWrapper.style.transform = 'skewY(0deg)';
                    scrollWrapper.style.filter = 'none';
                }
            } else {
                scrollWrapper.style.transform = \`skewY(\${payload.scroll.skew}deg)\`;
                scrollWrapper.style.filter = \`drop-shadow(\${payload.scroll.rgbShift}px 0 0 rgba(255,0,85,0.4)) drop-shadow(-\${payload.scroll.rgbShift}px 0 0 rgba(0,255,170,0.4))\`;
            }
        }

        // Apply Noise Physics
        if (payload.noiseOpacity !== undefined && noiseOverlay) {
            noiseOverlay.style.opacity = payload.noiseOpacity;
        }

        // Apply Card Parallax Physics
        if (payload.cards) {
            payload.cards.forEach(c => {
                const cardEl = cards[c.id];
                if (cardEl && cardEl.style.transform !== c.transform) {
                    cardEl.style.transform = c.transform;
                }
            });
        }

        // Apply Particle Physics
        if (payload.particles) {
            payload.particles.forEach(p => {
                if (p.dead) {
                    if (activeParticles.has(p.id)) {
                        activeParticles.get(p.id).remove();
                        activeParticles.delete(p.id);
                    }
                } else {
                    let el = activeParticles.get(p.id);
                    if (!el) {
                        el = document.createElement('div');
                        el.className = 'fx-ascii-particle';
                        el.innerText = p.char;
                        el.style.left = p.x + 'px';
                        el.style.top = p.y + 'px';
                        document.body.appendChild(el);
                        activeParticles.set(p.id, el);
                    }
                    el.style.transform = p.transform;
                    el.style.opacity = p.opacity;
                }
            });
        }
    };

    // ==========================================
    // 3. INPUT GATHERING (SEND TO WORKER)
    // ==========================================
    window.addEventListener('scroll', () => {
        worker.postMessage({ type: 'scroll', scrollY: window.scrollY });
    }, { passive: true });

    let cursorGlow = document.createElement('div');
    cursorGlow.id = 'fx-cursor-glow';
    document.body.appendChild(cursorGlow);

    window.addEventListener('mousemove', (e) => {
        worker.postMessage({ type: 'mousemove', x: e.clientX, y: e.clientY });
        
        // Glow is kept on main thread because it needs zero-latency for feel
        cursorGlow.style.left = e.clientX + 'px';
        cursorGlow.style.top = e.clientY + 'px';
    }, { passive: true });

    window.addEventListener('click', (e) => {
        worker.postMessage({ type: 'click', x: e.clientX, y: e.clientY });
    });

    const interactables = document.querySelectorAll('a, button, .showcase-item, .archive-entry, .nav-button');
    interactables.forEach(el => {
        el.addEventListener('mouseenter', () => {
            cursorGlow.style.width = '600px';
            cursorGlow.style.height = '600px';
            cursorGlow.style.background = 'radial-gradient(circle, rgba(0, 255, 170, 0.2) 0%, transparent 70%)';
        });
        el.addEventListener('mouseleave', () => {
            cursorGlow.style.width = '400px';
            cursorGlow.style.height = '400px';
            cursorGlow.style.background = 'radial-gradient(circle, rgba(0, 255, 170, 0.12) 0%, transparent 60%)';
        });
    });

    // ==========================================
    // 4. THE "IDLE ANOMALY" SYSTEM
    // ==========================================
    // Kept on main thread because it relies heavily on DOM layout and is low frequency
    const decryptElements = document.querySelectorAll('h1, h2, h3, .showcase-title, .entry-title, .glitch-effect');
    const hackerChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+><?[]{}|\\\\';
    let idleTimer = null;
    const IDLE_TIMEOUT = 5000;

    function resetIdleTimer() {
        clearTimeout(idleTimer);
        idleTimer = setTimeout(triggerIdleAnomaly, IDLE_TIMEOUT);
    }

    function triggerIdleAnomaly() {
        if (!decryptElements || decryptElements.length === 0) return;
        const visibleElements = Array.from(decryptElements).filter(el => {
            const rect = el.getBoundingClientRect();
            return rect.top >= 0 && rect.bottom <= window.innerHeight;
        });

        if (visibleElements.length > 0) {
            const target = visibleElements[Math.floor(Math.random() * visibleElements.length)];
            const originalText = target.dataset.originalText || target.innerText;
            if (!target.dataset.originalText) target.dataset.originalText = originalText;
            
            let iterations = 0;
            const interval = setInterval(() => {
                target.innerText = originalText.split('').map((char, index) => {
                    if (index < iterations) return originalText[index];
                    return char.trim() ? hackerChars[Math.floor(Math.random() * hackerChars.length)] : ' ';
                }).join('');

                if (iterations >= originalText.length) {
                    clearInterval(interval);
                    target.innerText = originalText;
                }
                iterations += 2;
            }, 30);

            if (Math.random() > 0.4) {
                target.classList.add('idle-glitching');
                setTimeout(() => target.classList.remove('idle-glitching'), 200);
            }
        }
        idleTimer = setTimeout(triggerIdleAnomaly, 3000 + Math.random() * 5000);
    }

    // Scroll decryption 
    const decryptObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const el = entry.target;
                if (!el.dataset.decrypted) {
                    el.dataset.decrypted = 'true';
                    const originalText = el.innerText || el.textContent;
                    if (!originalText || originalText.length > 200) return;
                    el.dataset.originalText = originalText;

                    let iterations = 0;
                    const interval = setInterval(() => {
                        el.innerText = originalText.split('').map((char, index) => {
                            if (index < iterations) return originalText[index];
                            return char.trim() ? hackerChars[Math.floor(Math.random() * hackerChars.length)] : ' ';
                        }).join('');

                        if (iterations >= originalText.length) {
                            clearInterval(interval);
                            el.innerText = originalText;
                        }
                        iterations += 1 + Math.floor(Math.random() * 2);
                    }, 30);
                }
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    decryptElements.forEach(el => decryptObserver.observe(el));

    window.addEventListener('mousemove', resetIdleTimer, { passive: true });
    window.addEventListener('scroll', resetIdleTimer, { passive: true });
    window.addEventListener('click', resetIdleTimer, { passive: true });
    window.addEventListener('keydown', resetIdleTimer, { passive: true });
    resetIdleTimer();

});
