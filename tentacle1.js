/**
 * Tentacle OS - Refactored Shell Logic
 * This module handles the state, UI interactions, and command processing
 * for the Tentacle OS shell.
 */

export class TentacleOS {
    constructor() {
        // Elements
        this.osFrame = document.getElementById('tentacle-os');
        this.bootScreen = document.getElementById('os-boot');
        this.bootText = document.getElementById('boot-text');
        this.cliInput = document.getElementById('os-cli-input');
        this.cliOutput = document.getElementById('console-output');

        // State
        this.isMinimized = false;
        this.isMaximized = false;
        this.narrationEnabled = true;
        this.currentPath = '/root/';
        this.diceHistory = [];
        this.timerInterval = null;
        this.timerRemaining = 0;
        this.calcExpression = '';

        // Data Models
        this.ariaResponses = {
            'hello': 'Greetings, entity. The neural link is stable.',
            'hi': 'Hello. Communication pathways optimized.',
            'who are you': 'I am Aria, the core intelligence of this OS.',
            'what is this': 'This is Tentacle OS, a neural-symbiotic interface.',
            'help': 'I can assist with system status, commands, or data analysis.',
            'bye': 'The link will remain dormant until your return.',
            'thanks': 'Positive feedback loop detected in core.',
            'meaning': 'The meaning of this simulation is yet to be discovered.'
        };

        this.alienFS = {
            '/root/': {
                type: 'dir',
                children: {
                    'system/': {
                        type: 'dir', children: {
                            'core.sys': { type: 'file', size: '2.4 MB' },
                            'aria_neural.bin': { type: 'file', size: '847 KB' },
                            'symbiosis.conf': { type: 'file', size: '12 KB' },
                            'void_resonance.dat': { type: 'file', size: '1.1 MB' },
                            'drivers/': {
                                type: 'dir', children: {
                                    'haptic_v3.drv': { type: 'file', size: '340 KB' },
                                    'tentacle_io.drv': { type: 'file', size: '567 KB' },
                                    'neural_bridge.drv': { type: 'file', size: '890 KB' },
                                }
                            },
                        }
                    },
                    'data/': {
                        type: 'dir', children: {
                            'anomaly_log.db': { type: 'file', size: '5.2 MB' },
                            'node_map.graph': { type: 'file', size: '1.8 MB' },
                            'cipher_keys.enc': { type: 'file', size: '256 B' },
                            'freq_samples/': {
                                type: 'dir', children: {
                                    'sample_001.wav': { type: 'file', size: '3.4 MB' },
                                    'sample_002.wav': { type: 'file', size: '2.9 MB' },
                                    'analysis.json': { type: 'file', size: '45 KB' },
                                }
                            },
                        }
                    },
                    'user/': {
                        type: 'dir', children: {
                            'notepad.txt': { type: 'file', size: '1 KB' },
                            'preferences.cfg': { type: 'file', size: '4 KB' },
                            'screenshots/': {
                                type: 'dir', children: {
                                    'capture_001.png': { type: 'file', size: '1.2 MB' },
                                    'capture_002.png': { type: 'file', size: '980 KB' },
                                }
                            },
                            'downloads/': {
                                type: 'dir', children: {
                                    'reality_patch_v2.zip': { type: 'file', size: '15.4 MB' },
                                    'void_map.dat': { type: 'file', size: '8.7 MB' },
                                }
                            },
                        }
                    },
                    'logs/': {
                        type: 'dir', children: {
                            'boot.log': { type: 'file', size: '24 KB' },
                            'error.log': { type: 'file', size: '89 KB' },
                            'comm.log': { type: 'file', size: '156 KB' },
                            'anomaly_report.log': { type: 'file', size: '67 KB' },
                        }
                    },
                    'hgt109.html': { type: 'file', size: '15 KB' },
                    'README.txt': { type: 'file', size: '2 KB' },
                    '.secret': { type: 'file', size: '?? B' },
                }
            }
        };

        this.bindGlobals();
        this.init();
    }

    /**
     * Attaches methods to window object to maintain compatibility with
     * inline HTML event handlers (onclick, etc.).
     */
    bindGlobals() {
        window.closeOS = this.closeOS.bind(this);
        window.toggleMinOS = this.toggleMinOS.bind(this);
        window.toggleMaxOS = this.toggleMaxOS.bind(this);
        window.toggleFolder = this.toggleFolder.bind(this);
        window.processCommand = this.processCommand.bind(this);
        window.toggleNarration = this.toggleNarration.bind(this);
        window.narrate = this.narrate.bind(this);
        window.toggleOSTool = this.toggleOSTool.bind(this);
        window.updateColorDisplay = this.updateColorDisplay.bind(this);
        window.rollDice = this.rollDice.bind(this);
        window.startOSTimer = this.startOSTimer.bind(this);
        window.stopOSTimer = this.stopOSTimer.bind(this);
        window.resetOSTimer = this.resetOSTimer.bind(this);
        window.encodeB64 = this.encodeB64.bind(this);
        window.decodeB64 = this.decodeB64.bind(this);
        window.takeOSScreenshot = this.takeOSScreenshot.bind(this);
        window.osToast = this.osToast.bind(this);
        window.toggleStartMenu = this.toggleStartMenu.bind(this);
        window.hideContextMenu = this.hideContextMenu.bind(this);
        window.sendAriaChat = this.sendAriaChat.bind(this);
        window.fetchWeather = this.fetchWeather.bind(this);
        window.navigateFilesUp = this.navigateFilesUp.bind(this);
        window.pulseHaptic = this.pulseHaptic.bind(this);
        window.renderFileSystem = this.renderFileSystem.bind(this);
        window.handleCalc = this.handleCalc.bind(this);
        window.showAriaSubtitle = this.showAriaSubtitle.bind(this);
        window.hideAriaSubtitle = this.hideAriaSubtitle.bind(this);
        window.runBootSequence = this.runBootSequence.bind(this);
    }

    init() {
        console.log("TENTACLE_OS initializing...");

        // CLI Input Listener
        if (this.cliInput) {
            this.cliInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    const cmd = e.target.value.trim().toLowerCase();
                    e.target.value = '';
                    this.processCommand(cmd);
                }
            });
        }

        // Clock Ticking
        setInterval(() => this.updateSysClock(), 1000);
        setInterval(() => this.updateTaskbarClock(), 1000);

        // Load Persistence
        this.loadNotepad();

        // Start Boot Sequence
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.runBootSequence());
        } else {
            this.runBootSequence();
        }

        // Start Menu Close Handler
        document.addEventListener('click', (e) => this.handleOutsideClick(e));

        // Right-Click Handler
        if (this.osFrame) {
            this.osFrame.addEventListener('contextmenu', (e) => this.handleContextMenu(e));
        }

        // Initialize Tools
        this.initCalculator();
    }

    // --- Core Systems ---

    pulseHaptic() {
        if (navigator.vibrate) {
            try { navigator.vibrate(15); } catch (e) { }
        }
    }

    narrate(text) {
        if (!this.narrationEnabled) return;
        if (window.AriaNarrator) {
            window.AriaNarrator.speak(text, () => this.showAriaSubtitle(text), () => this.hideAriaSubtitle());
        }
    }

    showAriaSubtitle(text) {
        const subtitleBox = document.getElementById('aria-subtitles');
        const subtitleText = document.getElementById('aria-text');
        if (subtitleBox && subtitleText) {
            subtitleBox.style.opacity = '1';
            subtitleText.textContent = text;
        }
    }

    hideAriaSubtitle() {
        const subtitleBox = document.getElementById('aria-subtitles');
        if (subtitleBox) subtitleBox.style.opacity = '0';
    }

    osToast(msg, type = 'info') {
        const container = document.getElementById('os-toast-container');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = 'os-toast ' + type;
        toast.textContent = msg;
        container.appendChild(toast);
        setTimeout(() => {
            toast.style.animation = 'toastOut 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // --- Window Management ---

    closeOS() {
        if (!this.osFrame) return;
        this.osFrame.style.opacity = '0';
        this.osFrame.style.transform = 'scale(0.9)';
        setTimeout(() => { this.osFrame.style.display = 'none'; }, 300);
        this.pulseHaptic();
    }

    toggleMinOS() {
        if (this.isMaximized) this.toggleMaxOS();
        this.isMinimized = !this.isMinimized;
        if (this.isMinimized) {
            this.osFrame.classList.add('minimized');
        } else {
            this.osFrame.classList.remove('minimized');
        }
        this.pulseHaptic();
    }

    toggleMaxOS() {
        if (this.isMinimized) this.toggleMinOS();
        this.isMaximized = !this.isMaximized;
        if (this.isMaximized) {
            this.osFrame.classList.add('maximized');
        } else {
            this.osFrame.classList.remove('maximized');
        }
        this.pulseHaptic();
    }

    toggleFolder(folderId) {
        const folder = document.getElementById(folderId);
        if (folder) folder.classList.toggle('active');
    }

    toggleOSTool(id) {
        const el = document.getElementById(id);
        if (!el) return;
        el.style.display = el.style.display === 'none' ? 'block' : 'none';
    }

    // --- CLI Module ---

    processCommand(cmd) {
        if (!cmd) return;
        this.printToConsole(`<span style="color:#fff;">root@tentacle:~#</span> ${cmd}`);

        let response = "";
        const args = cmd.split(' ');
        const baseCmd = args[0];

        // Custom implementations for specific commands
        switch (baseCmd) {
            case 'help':
                response = "AVAILABLE COMMANDS:<br>- status / clear / ls / neofetch / whoami / date<br>- clock / notepad / color / dice [N] / timer [N]<br>- encode [text] / decode [text]<br>- hgt [id] / narration [on/off] / chat / weather / calc / files / tasks / uptime";
                break;
            case 'status':
                response = "SYMBIOSIS: ACTIVE<br>NEURAL LOAD: 42%<br>VOID RESONANCE: STABLE";
                break;
            case 'clear':
                if (this.cliOutput) this.cliOutput.innerHTML = '';
                return;
            case 'ls':
                this.toggleOSTool('os-files-tool');
                this.renderFileSystem();
                response = "FILE_SYS BROWSER OPENED.";
                break;
            case 'neofetch':
                response = `
<span style='color:#00ffaa;'>Tentacle OS v2.0.26</span><br>
------------------<br>
OS: TentacleOS-v2 x86_64<br>
Host: Neural-Symbiosis-Entity-01<br>
Kernel: 5.15.0-void-resonance<br>
Uptime: ${this.getFormattedUptime()}<br>
Packages: 42 (neural)<br>
Shell: tentacle-sh 1.0<br>
DE: VoidPulse-X<br>
CPU: Bio-Synthetic 8-Core<br>
GPU: Reality-Distortion-P6000<br>
Memory: Intrinsic Capacity Realized`;
                break;
            case 'whoami':
                response = "<span style='color:#00ffaa;'>BIOLOGICAL_ENTITY // HOST // ADMIN</span>";
                break;
            case 'date':
                response = new Date().toString();
                break;
            case 'clock':
                this.toggleOSTool('os-clock-tool');
                response = "SYSTEM CHRONOMETER OPENED.";
                break;
            case 'notepad':
                this.toggleOSTool('os-notepad-tool');
                response = "SECURE NOTEPAD OPENED.";
                break;
            case 'color':
                this.toggleOSTool('os-colorpick-tool');
                response = "COLOR SPECTRUM ANALYZER OPENED.";
                break;
            case 'dice':
                const sides = parseInt(args[1]) || 20;
                this.toggleOSTool('os-dice-tool');
                this.rollDice(sides);
                response = `ROLLING D${sides}...`;
                break;
            case 'timer':
                const secs = parseInt(args[1]) || 60;
                const timerInput = document.getElementById('os-timer-input');
                if (timerInput) timerInput.value = secs;
                this.toggleOSTool('os-timer-tool');
                this.startOSTimer();
                response = `TIMER SET: ${secs}s.`;
                break;
            case 'encode':
                const textEnc = cmd.substring(7);
                response = `BASE64: ${btoa(textEnc)}`;
                break;
            case 'decode':
                const textDec = cmd.substring(7);
                try {
                    response = `DECODED: ${atob(textDec)}`;
                } catch (e) {
                    response = "ERR: INVALID BASE64.";
                }
                break;
            case 'chat':
            case 'aria':
                this.toggleOSTool('os-chat-tool');
                response = "NEURAL LINK ESTABLISHED WITH ARIA.";
                break;
            case 'weather':
                this.toggleOSTool('os-weather-tool');
                response = "OPENING VOID WEATHER SENSOR.";
                break;
            case 'calc':
                this.toggleOSTool('os-calc-tool');
                response = "OPENING MATH CO-PROCESSOR.";
                break;
            case 'files':
                this.toggleOSTool('os-files-tool');
                this.renderFileSystem();
                response = "ACCESSING LOCAL DATA ARRAYS.";
                break;
            case 'tasks':
            case 'taskman':
                this.toggleOSTool('os-taskman-tool');
                response = "TASK_MANAGER OPENED.";
                break;
            case 'uptime':
                response = `UPTIME: ${this.getFormattedUptime()}`;
                break;
            case 'narration':
                if (args[1] === 'on') {
                    this.narrationEnabled = true;
                    this.updateNarrationUI();
                    response = "NARRATION: ON";
                } else if (args[1] === 'off') {
                    this.narrationEnabled = false;
                    this.updateNarrationUI();
                    response = "NARRATION: OFF";
                } else {
                    response = "USAGE: narration [on/off]";
                }
                break;
            case 'hgt':
                if (args[1] === '109') {
                    response = "⚡ HGT-109: SIGNAL DETECTED. ACCESSING ARCHIVE NODE... ⚡";
                    this.narrate("H G T 109 signal detected. Accessing archive node.");
                    setTimeout(() => {
                        window.location.href = 'hgt109.html';
                    }, 1200);
                } else if (args[1] === '25') {
                    this.toggleOSTool('hgt25-habitat'); // If habitat is a tool
                    const habitat = document.getElementById('hgt25-habitat');
                    if (habitat && window.VoidSymbiote) {
                        new window.VoidSymbiote({ container: habitat });
                        response = "HGT-25: VOID SYMBIOTE EVOKED.";
                    } else {
                        response = "ERR: HGT-25 CORE NOT FOUND.";
                    }
                } else {
                    response = "USAGE: hgt [id] (try 109)";
                }
                break;
            default:
                response = `ERR: COMMAND '${cmd}' NOT RECOGNIZED IN THIS ENTITY.`;
                if (Math.random() > 0.5) {
                    this.narrate("Input command unrecognized.");
                }
        }

        setTimeout(() => {
            this.printToConsole(`<span style="color:#ffcc00;">${response}</span>`);
            if (response.includes("OPENED") || response.includes("SET") || response.includes("ROLLING")) {
                this.narrate(response);
            }
        }, 300);
    }

    printToConsole(html) {
        if (!this.cliOutput) return;
        const line = document.createElement('div');
        line.innerHTML = html;
        this.cliOutput.appendChild(line);
        while (this.cliOutput.children.length > 20) {
            this.cliOutput.removeChild(this.cliOutput.firstChild);
        }
        this.cliOutput.scrollTop = this.cliOutput.scrollHeight;
    }

    getFormattedUptime() {
        const up = Math.floor((Date.now() - performance.timing.navigationStart) / 1000);
        const hrs = Math.floor(up / 3600);
        const mins = Math.floor((up % 3600) / 60);
        const secs = up % 60;
        return `${hrs}h ${mins}m ${secs}s`;
    }

    // --- Boot Sequence ---

    runBootSequence() {
        if (!this.osFrame || !this.bootText || !this.bootScreen) return;

        this.osFrame.style.opacity = '0';
        this.osFrame.style.transform = 'translateY(20px)';

        setTimeout(() => {
            this.osFrame.style.opacity = '1';
            this.osFrame.style.transform = 'translateY(0)';

            const lines = [
                "INITIALIZING NEURAL LINK...",
                "ESTABLISHING SYMBIOSIS...",
                "LOADING CORE ENTITY MODULES...",
                "CALIBRATING VOID RESONANCE...",
                "SYS_SHELL UPGRADED -> TENTACLE_OS v2.0",
                "ACCESS GRANTED."
            ];

            let currentLine = 0;
            this.bootText.innerHTML = "";

            const typeLine = () => {
                if (currentLine < lines.length) {
                    const p = document.createElement('div');
                    p.textContent = lines[currentLine];
                    p.style.marginBottom = "5px";
                    this.bootText.appendChild(p);

                    if (currentLine === lines.length - 1) {
                        p.style.color = "#00ffaa";
                    }

                    currentLine++;
                    this.pulseHaptic();
                    setTimeout(typeLine, 300 + Math.random() * 200);
                } else {
                    setTimeout(() => {
                        this.bootScreen.classList.add('os-boot-hidden');
                        const welcomeMessage = "Biological entity detected. Welcome to Tentacle O S Core. I am Aria. Neural link established. How can I assist you with this simulation?";
                        this.narrate(welcomeMessage);
                    }, 800);
                }
            };
            typeLine();
        }, 500);
    }

    // --- Tools Logic ---

    updateSysClock() {
        const now = new Date();
        const clockEl = document.getElementById('os-clock-display');
        const dateEl = document.getElementById('os-clock-date');
        if (clockEl) clockEl.textContent = now.toLocaleTimeString('en-US', { hour12: false });
        if (dateEl) dateEl.textContent = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }

    updateTaskbarClock() {
        const tbClock = document.getElementById('taskbar-clock');
        if (tbClock) {
            tbClock.textContent = new Date().toLocaleTimeString('en-US', {
                hour12: false,
                hour: '2-digit',
                minute: '2-digit'
            });
        }
    }

    loadNotepad() {
        const saved = localStorage.getItem('tentacle-notepad');
        if (saved) {
            const area = document.getElementById('os-notepad-area');
            if (area) area.value = saved;
        }
    }

    updateColorDisplay(hex) {
        const hexEl = document.getElementById('os-color-hex');
        const rgbEl = document.getElementById('os-color-rgb');
        const hslEl = document.getElementById('os-color-hsl');

        if (hexEl) hexEl.textContent = hex.toUpperCase();

        const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
        if (rgbEl) rgbEl.textContent = `rgb(${r}, ${g}, ${b})`;

        const rn = r / 255, gn = g / 255, bn = b / 255;
        const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
        let h, s, l = (max + min) / 2;
        if (max === min) { h = s = 0; } else {
            const d = max - min; s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case rn: h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6; break;
                case gn: h = ((bn - rn) / d + 2) / 6; break;
                case bn: h = ((rn - gn) / d + 4) / 6; break;
            }
        }
        if (hslEl) hslEl.textContent = `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
    }

    rollDice(sides) {
        const result = Math.floor(Math.random() * sides) + 1;
        const display = document.getElementById('os-dice-display');
        const histEl = document.getElementById('os-dice-history');

        if (display) {
            display.style.transform = 'scale(1.3) rotate(15deg)';
            display.style.transition = 'transform 0.1s';
            setTimeout(() => {
                display.textContent = result;
                display.style.transform = 'scale(1) rotate(0)';
                this.narrate(`D ${sides} rolled. Result: ${result}.`);
            }, 150);
        }

        this.diceHistory.unshift(`D${sides}:${result}`);
        if (this.diceHistory.length > 10) this.diceHistory.pop();
        if (histEl) histEl.textContent = this.diceHistory.join(' | ');
    }

    startOSTimer() {
        this.stopOSTimer();
        const input = document.getElementById('os-timer-input');
        this.timerRemaining = parseInt(input ? input.value : 60) || 60;
        this.updateTimerDisplay();
        this.timerInterval = setInterval(() => {
            this.timerRemaining--;
            this.updateTimerDisplay();
            if (this.timerRemaining <= 0) {
                clearInterval(this.timerInterval);
                this.timerInterval = null;
                this.narrate('Timer complete. Mission objective reached.');
                const display = document.getElementById('os-timer-display');
                if (display) display.style.color = '#00ffaa';
                this.pulseHaptic();
            }
        }, 1000);
    }

    stopOSTimer() {
        if (this.timerInterval) { clearInterval(this.timerInterval); this.timerInterval = null; }
    }

    resetOSTimer() {
        this.stopOSTimer();
        const input = document.getElementById('os-timer-input');
        this.timerRemaining = parseInt(input ? input.value : 60) || 60;
        this.updateTimerDisplay();
        const display = document.getElementById('os-timer-display');
        if (display) display.style.color = '#ff4444';
    }

    updateTimerDisplay() {
        const display = document.getElementById('os-timer-display');
        if (!display) return;
        const mins = Math.floor(this.timerRemaining / 60);
        const secs = this.timerRemaining % 60;
        display.textContent = String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
    }

    encodeB64() {
        const input = document.getElementById('os-b64-input');
        const output = document.getElementById('os-b64-output');
        if (!input || !output) return;
        try {
            output.textContent = btoa(input.value);
            this.narrate('Encoding to base 64 complete.');
        } catch (e) {
            output.textContent = 'ERR: INVALID INPUT';
        }
    }

    decodeB64() {
        const input = document.getElementById('os-b64-input');
        const output = document.getElementById('os-b64-output');
        if (!input || !output) return;
        try {
            output.textContent = atob(input.value);
            this.narrate('Decoding from base 64 complete.');
        } catch (e) {
            output.textContent = 'ERR: INVALID BASE64';
        }
    }

    takeOSScreenshot() {
        this.osToast('SCREENSHOT COMPONENT DISABLED: No capture driver.', 'error');
        this.narrate('Screenshot driver missing.');
    }

    // --- UI Helpers ---

    toggleNarration() {
        this.narrationEnabled = !this.narrationEnabled;
        this.updateNarrationUI();
        if (this.narrationEnabled) {
            this.narrate('Narration re-enabled. I can hear you again.');
        }
    }

    updateNarrationUI() {
        const btn = document.getElementById('narration-toggle');
        if (btn) {
            btn.textContent = this.narrationEnabled ? '🔊 ARIA: ON' : '🔇 ARIA: OFF';
            btn.style.borderColor = this.narrationEnabled ? '#00ffaa' : '#555';
            btn.style.color = this.narrationEnabled ? '#00ffaa' : '#555';
        }
    }

    toggleStartMenu() {
        const menu = document.getElementById('os-start-menu');
        if (menu) menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
        this.pulseHaptic();
    }

    handleOutsideClick(e) {
        const menu = document.getElementById('os-start-menu');
        const startBtn = document.querySelector('.taskbar-start');
        if (menu && menu.style.display !== 'none' && !menu.contains(e.target) && e.target !== startBtn) {
            menu.style.display = 'none';
        }
    }

    handleContextMenu(e) {
        const osFrame = document.getElementById('tentacle-os');
        if (!osFrame || !osFrame.contains(e.target)) return;

        e.preventDefault();
        const menu = document.getElementById('os-context-menu');
        if (menu) {
            menu.style.display = 'block';
            menu.style.left = e.clientX + 'px';
            menu.style.top = e.clientY + 'px';
        }
    }

    hideContextMenu() {
        const menu = document.getElementById('os-context-menu');
        if (menu) menu.style.display = 'none';
    }

    // --- AI Chat ---

    sendAriaChat() {
        const input = document.getElementById('os-chat-input');
        const log = document.getElementById('os-chat-log');
        if (!input || !log) return;
        const msg = input.value.trim();
        if (!msg) return;
        input.value = '';

        const userDiv = document.createElement('div');
        userDiv.style.color = '#ff6b3f';
        userDiv.style.marginBottom = '5px';
        userDiv.textContent = '[YOU]: ' + msg;
        log.appendChild(userDiv);

        const lower = msg.toLowerCase();
        let response = null;
        for (const [key, val] of Object.entries(this.ariaResponses)) {
            if (lower.includes(key)) { response = val; break; }
        }
        if (!response) {
            const generic = [
                'Interesting input. My neural networks are processing this data.',
                'I detect patterns in your query. The void echoes with similar frequencies.',
                'Processing... The symbiosis link suggests this relates to deeper system layers.',
                'Your biological neural patterns are fascinating. Tell me more.',
                'That data stream is... unusual. I will log it for analysis.',
                'The tentacle core is resonating with your input. This is noteworthy.',
                'Acknowledged. Cross-referencing with known anomaly signatures.',
                'My circuits hum with intrigue. This interaction enriches the neural graph.',
            ];
            response = generic[Math.floor(Math.random() * generic.length)];
        }

        setTimeout(() => {
            const ariaDiv = document.createElement('div');
            ariaDiv.style.color = '#00ffaa';
            ariaDiv.style.marginBottom = '5px';
            ariaDiv.textContent = '[ARIA]: ' + response;
            log.appendChild(ariaDiv);
            log.scrollTop = log.scrollHeight;
            this.narrate(response);
        }, 500 + Math.random() * 500);
    }

    // --- Weather ---

    fetchWeather() {
        const cityInput = document.getElementById('os-weather-city');
        const resultEl = document.getElementById('os-weather-result');
        if (!cityInput || !resultEl) return;
        const city = cityInput.value.trim();
        if (!city) { resultEl.textContent = 'ERR: NO CITY SPECIFIED.'; return; }
        resultEl.textContent = 'SCANNING ATMOSPHERE...';

        fetch(`https://wttr.in/${encodeURIComponent(city)}?format=j1`)
            .then(r => r.json())
            .then(data => {
                const curr = data.current_condition?.[0];
                if (!curr) { resultEl.textContent = 'ERR: NO DATA FROM ATMOSPHERIC PROBE.'; return; }
                resultEl.innerHTML = `
                    <div style="font-size:1.5rem;margin-bottom:5px;">${curr.weatherDesc?.[0]?.value || '--'}</div>
                    <div>TEMP: <span style="color:#ff6b3f;">${curr.temp_F}°F / ${curr.temp_C}°C</span></div>
                    <div>HUMIDITY: ${curr.humidity}%</div>
                    <div>WIND: ${curr.windspeedMiles} mph ${curr.winddir16Point}</div>
                    <div>FEELS LIKE: ${curr.FeelsLikeF}°F</div>
                    <div>VISIBILITY: ${curr.visibility} km</div>
                    <div style="color:#555;margin-top:5px;font-size:0.65rem;">LOCATION: ${city.toUpperCase()}</div>
                `;
                this.narrate(`Atmospheric scan complete. ${city}. Temperature: ${curr.temp_F} degrees. ${curr.weatherDesc?.[0]?.value || ''}.`);
            })
            .catch(() => {
                resultEl.textContent = 'ERR: ATMOSPHERIC PROBE SIGNAL LOST.';
            });
    }

    // --- Calculator ---

    initCalculator() {
        const grid = document.getElementById('os-calc-grid');
        if (!grid) return;
        const buttons = [
            'C', '(', ')', '/',
            '7', '8', '9', '*',
            '4', '5', '6', '-',
            '1', '2', '3', '+',
            '0', '.', 'DEL', '='
        ];
        grid.innerHTML = '';
        buttons.forEach(b => {
            const btn = document.createElement('button');
            btn.textContent = b;
            btn.className = 'calc-btn' + (['/', '+', '-', '*', '(', ')'].includes(b) ? ' op' : '') + (b === '=' ? ' eq' : '');
            btn.onclick = () => this.handleCalc(b);
            grid.appendChild(btn);
        });
    }

    handleCalc(b) {
        const display = document.getElementById('os-calc-display');
        if (!display) return;
        if (b === 'C') { this.calcExpression = ''; display.value = '0'; this.narrate('Calculator cleared.'); }
        else if (b === 'DEL') { this.calcExpression = this.calcExpression.slice(0, -1); display.value = this.calcExpression || '0'; }
        else if (b === '=') {
            try {
                const result = Function('"use strict";return (' + this.calcExpression + ')')();
                display.value = result;
                this.narrate('Result: ' + result);
                this.calcExpression = String(result);
            } catch (e) {
                display.value = 'ERR';
                this.calcExpression = '';
            }
        } else {
            this.calcExpression += b;
            display.value = this.calcExpression;
        }
    }

    // --- File System ---

    getDir(path) {
        const parts = path.split('/').filter(Boolean);
        let current = this.alienFS['/root/'];
        for (let i = 1; i < parts.length; i++) {
            current = current.children[parts[i] + '/'];
            if (!current) return null;
        }
        return current;
    }

    renderFileSystem() {
        const pathEl = document.getElementById('os-files-path');
        const listEl = document.getElementById('os-files-list');
        if (!pathEl || !listEl) return;

        pathEl.textContent = this.currentPath;
        const dir = this.getDir(this.currentPath);
        if (!dir || !dir.children) { listEl.innerHTML = '<div style="color:#ff3b30;">ERR: DIRECTORY NOT FOUND</div>'; return; }

        listEl.innerHTML = '';
        for (const [name, item] of Object.entries(dir.children)) {
            const div = document.createElement('div');
            div.className = 'file-item';
            const isDir = item.type === 'dir';
            div.innerHTML = `
                <span class="file-icon">${isDir ? '📁' : (name.endsWith('.log') ? '📄' : name.endsWith('.enc') || name.endsWith('.bin') ? '🔒' : name.endsWith('.png') || name.endsWith('.jpg') ? '🖼️' : name.endsWith('.wav') || name.endsWith('.mp3') ? '🎵' : name.endsWith('.zip') ? '📦' : '📄')}</span>
                <span class="file-name">${name}</span>
                <span class="file-size">${item.size || (Object.keys(item.children || {}).length + ' items')}</span>
            `;
            if (isDir) {
                div.onclick = () => { this.currentPath += name; this.narrate('Entering directory ' + name); this.renderFileSystem(); };
            } else {
                div.onclick = () => { this.narrate(`File ${name}. Size: ${item.size}.`); this.osToast(`Viewing: ${name} (${item.size})`, 'info'); };
            }
            listEl.appendChild(div);
        }
    }

    navigateFilesUp() {
        if (this.currentPath === '/root/') return;
        const parts = this.currentPath.split('/').filter(Boolean);
        parts.pop();
        this.currentPath = '/' + parts.join('/') + '/';
        this.renderFileSystem();
    }
}

// Automatically instantiate the OS if we're in the browser
if (typeof document !== 'undefined') {
    window.TentacleOSInstance = new TentacleOS();
}
