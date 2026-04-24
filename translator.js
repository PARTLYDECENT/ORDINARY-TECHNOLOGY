// translator.js - Web Worker for offloading effects math
let scrollVelocity = 0;
let lastScrollY = 0;
let mouseX = 0, mouseY = 0;
let lastMouseX = 0, lastMouseY = 0;
let cards = [];
let particles = [];
let particleIdCounter = 0;

self.onmessage = function(e) {
    const data = e.data;
    if (data.type === 'init_cards') {
        cards = data.cards; 
    } else if (data.type === 'scroll') {
        scrollVelocity = data.scrollY - lastScrollY;
        lastScrollY = data.scrollY;
    } else if (data.type === 'mousemove') {
        mouseX = data.x;
        mouseY = data.y;
    } else if (data.type === 'click') {
        const numParticles = 8 + Math.floor(Math.random() * 5);
        for(let i=0; i<numParticles; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 30 + Math.random() * 50;
            const tx = Math.cos(angle) * dist;
            const ty = Math.sin(angle) * dist;
            const rot = (Math.random() - 0.5) * 360;
            particles.push({
                id: particleIdCounter++,
                x: data.x,
                y: data.y,
                tx, ty, rot,
                life: 1.0,
                char: ['+', '-', '.', '/', '>', '<', '*', '&', '0', '1'][Math.floor(Math.random() * 10)]
            });
        }
    }
};

function loop() {
    const payload = {};
    let hasUpdates = false;

    // 1. Scroll Physics
    if (Math.abs(scrollVelocity) > 0.1) {
        const skewAmount = Math.max(-2, Math.min(2, scrollVelocity * 0.02)); 
        const rgbShift = Math.min(10, Math.abs(scrollVelocity) * 0.05);
        payload.scroll = { skew: skewAmount, rgbShift: rgbShift };
        scrollVelocity *= 0.85;
        hasUpdates = true;
    } else {
        payload.scroll = { skew: 0, rgbShift: 0 };
    }

    // 2. Mouse Noise Velocity
    const dx = mouseX - lastMouseX;
    const dy = mouseY - lastMouseY;
    const mouseVel = Math.sqrt(dx*dx + dy*dy);
    lastMouseX = mouseX;
    lastMouseY = mouseY;
    if (mouseVel > 5) {
        payload.noiseOpacity = Math.min(0.15, 0.05 + mouseVel * 0.002);
        hasUpdates = true;
    } else {
        payload.noiseOpacity = 0.05;
        // Still need to send if it just stopped so UI can reset
        if (dx === 0 && dy === 0 && dx !== lastMouseX && dy !== lastMouseY) {
             hasUpdates = true;
        }
    }

    // 3. Card Parallax
    if (cards.length > 0 && (dx !== 0 || dy !== 0)) {
        payload.cards = cards.map(c => {
            const cx = mouseX - c.rect.left;
            const cy = mouseY - c.rect.top;
            
            if (mouseX >= c.rect.left && mouseX <= c.rect.right &&
                mouseY >= c.rect.top && mouseY <= c.rect.bottom) {
                const tiltX = (c.rect.centerY - cy) / 40;
                const tiltY = (cx - c.rect.centerX) / 40;
                return { id: c.id, transform: \`perspective(1000px) rotateX(\${tiltX}deg) rotateY(\${tiltY}deg) scale3d(1.02, 1.02, 1.02)\` };
            } else {
                return { id: c.id, transform: 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)' };
            }
        });
        hasUpdates = true;
    }

    // 4. Particles
    if (particles.length > 0 || Object.keys(particles).length > 0) {
        payload.particles = [];
        for (let i = particles.length - 1; i >= 0; i--) {
            let p = particles[i];
            p.life -= 0.03; // ~33 frames life (~500ms)
            if (p.life <= 0) {
                payload.particles.push({ id: p.id, dead: true });
                particles.splice(i, 1);
            } else {
                const currentTx = p.tx * (1 + (1 - p.life));
                const currentTy = p.ty * (1 + (1 - p.life));
                payload.particles.push({
                    id: p.id,
                    transform: \`translate(calc(-50% + \${currentTx}px), calc(-50% + \${currentTy}px)) rotate(\${p.rot + (1-p.life)*90}deg) scale(\${0.5 + p.life*0.5})\`,
                    opacity: p.life,
                    x: p.x, y: p.y, char: p.char
                });
            }
        }
        hasUpdates = true;
    }

    if (hasUpdates) {
        self.postMessage(payload);
    }
}

// Run at roughly 60fps
setInterval(loop, 16);
