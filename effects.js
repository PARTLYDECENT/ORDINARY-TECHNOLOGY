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

    // ==========================================
    // 5. HIGH-FREQUENCY HIEROGLYPH MORPHER (1 WINDOW AT A TIME)
    // ==========================================
    const HIEROGLYPH_GLYPHS = [
        '𓀀', '𓀁', '𓁀', '𓁁', '𓁂', '𓁃', '𓁄', '𓁅', '𓁆', '𓁇', '𓁈', '𓁉', '𓁊', 
        '𓁋', '𓁌', '𓁍', '𓁎', '𓁏', '𓁐', '𓁑', '𓁒', '𓁓', '𓁔', '𓁕', '𓁖', '𓁗', 
        '𓁘', '𓁙', '𓁚', '𓁛', '𓁜', '𓁝', '𓁞', '𓁟', '𓁠', '𓁡', '𓁢', '𓁣', '𓁤', 
        '𓁥', '𓁦', '𓁧', '𓁨', '𓁩', '𓁪', '𓁫', '𓁬', '𓁭', '𓁮', '𓁯', '𓁰', '𓁱', 
        '𓁲', '𓁳', '𓁴', '𓁵', '𓁶', '𓁷', '𓁸', '𓁹', '𓁺', '𓁻', '𓁼', '𓁽', '𓁾', 
        '𓁿', '𓂀', '𓃠', '𓅓', '𓆣', '𓇢', '𓈖', '𓉔', '𓊝', '𓋹', '𓌕', '𓍯', '𓎛', 
        '𓏏', '𓐍', '☤', '☫', '☸', '⚡', '❖', '✦', 'Ϡ', 'Ψ', 'Ω', '◈', '∆', '∑'
    ];

    const glyphStyle = document.createElement('style');
    glyphStyle.innerHTML = `
        .glyph-word {
            display: inline-block;
            transition: color 0.25s ease, text-shadow 0.25s ease, transform 0.25s ease;
            cursor: pointer;
            will-change: transform, text-shadow;
        }
        .glyph-word.hieroglyph-active {
            color: #ffffff !important;
            text-shadow: 0 0 8px rgba(255, 255, 255, 0.95), 
                         0 0 16px rgba(255, 255, 255, 0.85), 
                         0 0 30px rgba(255, 255, 255, 0.6) !important;
            transform: scale(1.08) translateY(-1px);
            letter-spacing: 1.5px;
        }
        .window-glyph-active {
            border-color: rgba(255, 255, 255, 0.6) !important;
            box-shadow: 0 0 35px rgba(255, 255, 255, 0.35), inset 0 0 15px rgba(255, 255, 255, 0.15) !important;
            transition: border-color 0.4s ease, box-shadow 0.4s ease !important;
        }
    `;
    document.head.appendChild(glyphStyle);

    function getRandomHieroglyph() {
        return HIEROGLYPH_GLYPHS[Math.floor(Math.random() * HIEROGLYPH_GLYPHS.length)];
    }

    window.setupHieroglyphMorphing = function() {
        // Target all window containers
        const windowElements = document.querySelectorAll(
            '.archive-entry, .showcase-item, .tentacle-os-frame, .os-tool-window, .hardpoint, .sidebar-ad, .terminal-frame, .game-container'
        );

        if (!windowElements || windowElements.length === 0) return;

        const windowMap = new Map();

        windowElements.forEach((win) => {
            const targets = win.querySelectorAll('.entry-title, .entry-content, .showcase-title, .showcase-description, .ad-title, .hardpoint-title, h1, h2, h3, p');
            const spans = [];

            targets.forEach(target => {
                if (target.dataset.glyphProcessed) return;
                target.dataset.glyphProcessed = 'true';

                const processNode = (node) => {
                    if (node.nodeType === Node.TEXT_NODE) {
                        const text = node.textContent;
                        if (!text.trim()) return;

                        const fragment = document.createDocumentFragment();
                        const words = text.split(/(\s+)/);

                        words.forEach(part => {
                            if (/\s+/.test(part) || !part.trim()) {
                                fragment.appendChild(document.createTextNode(part));
                            } else {
                                const span = document.createElement('span');
                                span.className = 'glyph-word';
                                span.textContent = part;
                                span.dataset.original = part;
                                fragment.appendChild(span);
                                spans.push(span);

                                // Mouseover trigger for tactile morphing
                                span.addEventListener('mouseenter', () => {
                                    morphSingleWord(span, 2200);
                                });
                            }
                        });

                        node.parentNode.replaceChild(fragment, node);
                    } else if (node.nodeType === Node.ELEMENT_NODE && node.tagName !== 'SCRIPT' && node.tagName !== 'STYLE') {
                        Array.from(node.childNodes).forEach(processNode);
                    }
                };

                Array.from(target.childNodes).forEach(processNode);
            });

            if (spans.length > 0) {
                windowMap.set(win, spans);
            }
        });

        function morphSingleWord(span, holdDuration = 2200) {
            if (span.dataset.morphing === 'true') return;
            span.dataset.morphing = 'true';

            const original = span.dataset.original || span.textContent;
            const length = original.length;

            let frame = 0;
            const scrambleFrames = 5;

            const scrambleInterval = setInterval(() => {
                let scrambled = '';
                for (let i = 0; i < length; i++) {
                    scrambled += getRandomHieroglyph();
                }
                span.textContent = scrambled;
                span.classList.add('hieroglyph-active');

                frame++;
                if (frame >= scrambleFrames) {
                    clearInterval(scrambleInterval);

                    setTimeout(() => {
                        let unscrambleFrame = 0;
                        const unscrambleInterval = setInterval(() => {
                            let current = '';
                            for (let i = 0; i < length; i++) {
                                if (i <= unscrambleFrame) {
                                    current += original[i];
                                } else {
                                    current += getRandomHieroglyph();
                                }
                            }
                            span.textContent = current;
                            unscrambleFrame++;

                            if (unscrambleFrame > length) {
                                clearInterval(unscrambleInterval);
                                span.textContent = original;
                                span.classList.remove('hieroglyph-active');
                                span.dataset.morphing = 'false';
                            }
                        }, 35);
                    }, holdDuration);
                }
            }, 45);
        }

        let currentActiveWindow = null;

        // SINGLE WINDOW AT A TIME HIGH-FREQUENCY MORPHER
        function triggerSingleWindowMorph() {
            // Find all visible windows that contain word spans
            const visibleWindows = Array.from(windowMap.keys()).filter(win => {
                const rect = win.getBoundingClientRect();
                return rect.top < window.innerHeight + 150 && rect.bottom > -150;
            });

            if (visibleWindows.length === 0) {
                setTimeout(triggerSingleWindowMorph, 800);
                return;
            }

            // Remove glow from previous window
            if (currentActiveWindow) {
                currentActiveWindow.classList.remove('window-glyph-active');
            }

            // Pick EXACTLY 1 visible window
            const targetWindow = visibleWindows[Math.floor(Math.random() * visibleWindows.length)];
            currentActiveWindow = targetWindow;
            
            const wordSpans = windowMap.get(targetWindow);

            if (wordSpans && wordSpans.length > 0) {
                targetWindow.classList.add('window-glyph-active');

                // Pick 3 to 8 random words inside THIS SINGLE WINDOW
                const count = Math.min(wordSpans.length, Math.floor(Math.random() * 6) + 3);
                const chosenSpans = [];

                for (let i = 0; i < count; i++) {
                    const randomSpan = wordSpans[Math.floor(Math.random() * wordSpans.length)];
                    if (randomSpan && !chosenSpans.includes(randomSpan) && randomSpan.dataset.morphing !== 'true') {
                        chosenSpans.push(randomSpan);
                    }
                }

                const holdTime = 1400 + Math.random() * 1200;
                chosenSpans.forEach((span, idx) => {
                    setTimeout(() => {
                        morphSingleWord(span, holdTime);
                    }, idx * 100);
                });
            }

            // Trigger next single window morph FREQUENTLY (every 1.0s to 1.6s)
            const nextWindowDelay = 1000 + Math.random() * 600;
            setTimeout(triggerSingleWindowMorph, nextWindowDelay);
        }

        // Start frequent single window morph loop
        triggerSingleWindowMorph();
    };

    window.setupHieroglyphMorphing();

});

// Global fallback launcher in case DOMContentLoaded fired early
if (document.readyState === 'interactive' || document.readyState === 'complete') {
    setTimeout(() => {
        if (typeof window.setupHieroglyphMorphing === 'function') {
            window.setupHieroglyphMorphing();
        }
    }, 200);
}
