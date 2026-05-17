/**
 * Procedural Exotic Console - TentacleOS
 * A fluid, unnatural, but highly organic canvas-based interface.
 */

class TentacleOSProcedural {
    constructor() {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.isActive = false;
        this.time = 0;
        
        // Output and Input state
        this.history = [
            { text: "SYSTEM STATUS: NEURAL LINK ESTABLISHED", type: "system", time: 0 },
            { text: "AWAITING INPUT...", type: "system", time: 0 }
        ];
        this.currentInput = "";
        this.cursorBlink = 0;
        
        // Fluid points for membrane boundaries
        this.points = [];
        for(let i=0; i<12; i++) {
            this.points.push({ angle: (i/12)*Math.PI*2, radius: 0, targetRadius: 0, phase: Math.random()*Math.PI*2 });
        }

        // Audio Context (lazy loaded)
        this.audioCtx = null;

        // Command dictionary (ported from tentacle1.js)
        this.ariaResponses = {
            'hello': 'Greetings, entity. The neural link is stable.',
            'help': 'Commands: status, clear, ls, neofetch, whoami, date, color, dice [N], timer [N], encode [txt], decode [txt], chat, weather, calc, uptime, hgt 109'
        };

        this.alienFS = {
            '/root/': { type: 'dir', children: { 'system/': { type: 'dir', children: { 'core.sys': {size: '2.4 MB'} } }, 'data/': { type: 'dir', children: {} } } }
        };

        this.initDOM();
        this.bindEvents();
        this.loop = this.loop.bind(this);
    }

    initDOM() {
        this.canvas.style.position = 'fixed';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.width = '100vw';
        this.canvas.style.height = '100vh';
        this.canvas.style.zIndex = '9999';
        this.canvas.style.pointerEvents = 'none'; // Will be 'auto' when active
        this.canvas.style.opacity = '0';
        this.canvas.style.transition = 'opacity 0.5s ease-in-out';
        this.canvas.style.mixBlendMode = 'screen';
        document.body.appendChild(this.canvas);
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        this.canvas.width = window.innerWidth * window.devicePixelRatio;
        this.canvas.height = window.innerHeight * window.devicePixelRatio;
        this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    }

    bindEvents() {
        // Toggle on backtick
        document.addEventListener('keydown', (e) => {
            if (e.key === '`') {
                e.preventDefault();
                this.toggle();
                return;
            }

            if (!this.isActive) return;

            if (e.key === 'Enter') {
                this.processCommand(this.currentInput);
                this.currentInput = "";
                this.playTone(200, "sawtooth");
            } else if (e.key === 'Backspace') {
                this.currentInput = this.currentInput.slice(0, -1);
                this.playTone(150, "sine");
            } else if (e.key.length === 1) {
                this.currentInput += e.key;
                this.playTone(300 + Math.random()*200, "sine");
            }
        });
    }

    toggle() {
        this.isActive = !this.isActive;
        this.canvas.style.pointerEvents = this.isActive ? 'auto' : 'none';
        this.canvas.style.opacity = this.isActive ? '1' : '0';
        
        if (this.isActive) {
            if (!this.audioCtx) {
                this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            }
            if (this.audioCtx.state === 'suspended') {
                this.audioCtx.resume();
            }
            this.playTone(100, "square", 0.5); // Boot sound
            requestAnimationFrame(this.loop);
        }
    }

    playTone(freq, type = "sine", duration = 0.1) {
        if (!this.audioCtx) return;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
        
        gain.gain.setValueAtTime(0.1, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duration);
        
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start();
        osc.stop(this.audioCtx.currentTime + duration);
    }

    pushOutput(text, type = "info") {
        this.history.push({ text, type, time: this.time });
        if (this.history.length > 30) this.history.shift();
    }

    processCommand(cmdStr) {
        const cmd = cmdStr.trim().toLowerCase();
        this.pushOutput(`> ${cmd}`, "input");
        if (!cmd) return;

        const args = cmd.split(' ');
        const base = args[0];

        switch (base) {
            case 'help':
                this.pushOutput(this.ariaResponses['help'], 'system');
                break;
            case 'clear':
                this.history = [];
                break;
            case 'status':
                this.pushOutput("SYMBIOSIS: ACTIVE | NEURAL LOAD: 42%", 'system');
                break;
            case 'ls':
                this.pushOutput("system/ data/", 'data');
                break;
            case 'whoami':
                this.pushOutput("BIOLOGICAL_ENTITY // HOST", 'system');
                break;
            case 'neofetch':
                this.pushOutput("OS: TentacleOS-Procedural", 'data');
                this.pushOutput("Kernel: Bioluminescent v1", 'data');
                break;
            case 'date':
                this.pushOutput(new Date().toString(), 'info');
                break;
            case 'chat':
                this.pushOutput("[ARIA]: Neural link established.", 'aria');
                break;
            case 'dice':
                const sides = parseInt(args[1]) || 20;
                this.pushOutput(`Rolling D${sides}... Result: ${Math.floor(Math.random()*sides)+1}`, 'data');
                break;
            case 'encode':
                this.pushOutput(`BASE64: ${btoa(cmdStr.substring(7))}`, 'data');
                break;
            case 'decode':
                try { this.pushOutput(`DECODED: ${atob(cmdStr.substring(7))}`, 'data'); } 
                catch(e) { this.pushOutput("ERR: INVALID B64", 'error'); }
                break;
            case 'hgt':
                if (args[1] === '109') {
                    this.pushOutput("ACCESSING ARCHIVE NODE...", 'system');
                    setTimeout(() => window.location.href = 'hgt109.html', 1000);
                } else {
                    this.pushOutput("ERR: UNKNOWN NODE", 'error');
                }
                break;
            default:
                this.pushOutput(`ERR: UNKNOWN SYNAPSE '${cmd}'`, 'error');
                break;
        }
    }

    drawMembrane(w, h) {
        this.ctx.beginPath();
        const centerX = w/2;
        const centerY = h/2;
        const baseRadius = Math.min(w, h) * 0.45;
        
        for(let i=0; i<this.points.length; i++) {
            const p = this.points[i];
            const wave = Math.sin(this.time * 2 + p.phase) * 20;
            const r = baseRadius + wave;
            const x = centerX + Math.cos(p.angle) * r;
            const y = centerY + Math.sin(p.angle) * r;
            
            if (i===0) this.ctx.moveTo(x, y);
            else {
                const prev = this.points[i-1];
                const prevR = baseRadius + Math.sin(this.time * 2 + prev.phase) * 20;
                const prevX = centerX + Math.cos(prev.angle) * prevR;
                const prevY = centerY + Math.sin(prev.angle) * prevR;
                const cpX = (x + prevX) / 2;
                const cpY = (y + prevY) / 2;
                this.ctx.quadraticCurveTo(prevX, prevY, cpX, cpY);
            }
        }
        this.ctx.closePath();
        
        const grad = this.ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, baseRadius);
        grad.addColorStop(0, 'rgba(0, 40, 50, 0.8)');
        grad.addColorStop(0.8, 'rgba(0, 150, 200, 0.2)');
        grad.addColorStop(1, 'rgba(0, 255, 200, 0)');
        
        this.ctx.fillStyle = grad;
        this.ctx.fill();
        this.ctx.strokeStyle = `rgba(0, 255, 170, ${0.3 + Math.sin(this.time)*0.2})`;
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
    }

    drawText(w, h) {
        this.ctx.font = '16px "Courier New", monospace';
        const startX = w * 0.15;
        let startY = h * 0.2;
        const lineHeight = 24;

        for(let i=0; i<this.history.length; i++) {
            const item = this.history[i];
            let color = '#00ffaa';
            if(item.type === 'error') color = '#ff3366';
            if(item.type === 'system') color = '#00ccff';
            if(item.type === 'input') color = '#ffffff';
            if(item.type === 'aria') color = '#ffaa00';
            
            // Organic fade in
            const age = this.time - item.time;
            const alpha = Math.min(1, age * 2);
            
            this.ctx.fillStyle = color;
            this.ctx.globalAlpha = alpha;
            
            // Subtle wave on text
            const xOffset = Math.sin(this.time * 3 + i) * 2;
            
            this.ctx.fillText(item.text, startX + xOffset, startY);
            startY += lineHeight;
        }

        this.ctx.globalAlpha = 1;
        
        // Input Line
        startY += lineHeight;
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillText(`> ${this.currentInput}`, startX, startY);
        
        // Tentacle Cursor
        this.cursorBlink += 0.1;
        if (Math.sin(this.cursorBlink) > 0) {
            const cursorX = startX + this.ctx.measureText(`> ${this.currentInput}`).width + 5;
            this.ctx.beginPath();
            this.ctx.moveTo(cursorX, startY);
            this.ctx.quadraticCurveTo(
                cursorX + Math.sin(this.time*10)*10, startY - 10,
                cursorX + Math.sin(this.time*8)*5, startY - 20
            );
            this.ctx.strokeStyle = '#00ffaa';
            this.ctx.lineWidth = 3;
            this.ctx.stroke();
        }
    }

    drawParticles(w, h) {
        for(let i=0; i<20; i++) {
            const x = (Math.sin(this.time + i*99) * 0.5 + 0.5) * w;
            const y = (Math.cos(this.time * 0.8 + i*13) * 0.5 + 0.5) * h;
            this.ctx.beginPath();
            this.ctx.arc(x, y, 1 + Math.sin(this.time*5 + i), 0, Math.PI*2);
            this.ctx.fillStyle = `rgba(0, 255, 170, ${0.1 + Math.sin(this.time+i)*0.1})`;
            this.ctx.fill();
        }
    }

    loop() {
        if (!this.isActive) return;
        this.time += 0.016; // Approx 60fps
        
        const w = window.innerWidth;
        const h = window.innerHeight;

        // Clear with slight fade for trails
        this.ctx.fillStyle = 'rgba(5, 5, 10, 0.2)';
        this.ctx.fillRect(0, 0, w, h);

        this.ctx.save();
        this.drawMembrane(w, h);
        this.drawParticles(w, h);
        this.drawText(w, h);
        this.ctx.restore();

        // Scanlines overlay
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        for(let y=0; y<h; y+=4) {
            this.ctx.fillRect(0, y, w, 1);
        }

        requestAnimationFrame(this.loop);
    }
}

// Auto-init
if (typeof window !== 'undefined') {
    window.addEventListener('load', () => {
        window.TentacleOS = new TentacleOSProcedural();
    });
}
