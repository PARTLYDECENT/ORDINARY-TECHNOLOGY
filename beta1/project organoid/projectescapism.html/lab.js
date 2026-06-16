/**
 * PROJECT ESCAPISM — ROTARY DNA LAB ENGINE (DARK EVOLVED SIMULATION)
 * High-fidelity 3D WebGL laboratory menu simulating biological research on HGT-109.
 * Features heartbeat pulses, interactive sliders, organic spikes, melting physics, and a quarantine breach event.
 */

const RotaryDNALab = {
    overlay: null,
    renderer: null,
    scene: null,
    camera: null,
    animationFrameId: null,
    onClose: null,

    // Three.js Objects
    dnaGroup: null,
    particulateGroup: null,
    nodesA: [],
    nodesB: [],
    rungs: [],
    particulates: [],
    splinters: [],

    // Evolved Visual Elements
    sparkPoints: null,
    sparks: [],
    maxSparks: 250,
    energyArcs: null,
    hudCage: null,
    hudRingTop: null,
    hudRingBot: null,

    // Interactive States
    isDragging: false,
    previousMousePosition: { x: 0, y: 0 },
    targetRotY: 0,
    targetRotX: 0,
    time: 0,
    activeMode: 'NORMAL', // 'NORMAL', 'SPIN', 'INFECT', 'SHEAR', 'DECAY', 'RESONANCE_OVERLOAD'
    decayProgress: 0,
    resonanceTime: 0,
    heartBeatFactor: 0,
    steerageFrequency: 1.0,

    // DNA Constants
    baseRadius: 1.4,
    baseHeight: 5.5,
    numBases: 26,

    init: function (onCloseCallback) {
        this.onClose = onCloseCallback;
        this.time = 0;
        this.decayProgress = 0;
        this.resonanceTime = 0;
        this.heartBeatFactor = 0;
        this.steerageFrequency = 1.0;
        this.activeMode = 'NORMAL';
        this.splinters = [];

        // 1. Create HTML UI Overlay
        this.createUI();

        // 2. Setup Three.js Render Target
        this.setupThreeJS();

        // 3. Create Scene Elements
        this.createDNAScene();

        // 4. Bind Input Handlers
        this.bindEvents();

        // 5. Initialize Sub-engines
        if (window.LabDepth) window.LabDepth.init(this);
        if (window.LabTentacles) window.LabTentacles.init(this);
        if (window.LabBreach) window.LabBreach.init(this);

        // 6. Run Animation Loop
        this.animate();

        if (window.SFX) window.SFX.triggerAbility();
    },

    createUI: function () {
        // Inject Evolved Styles
        if (!document.getElementById('dna-lab-styles')) {
            const style = document.createElement('style');
            style.id = 'dna-lab-styles';
            style.innerHTML = `
                #dna-lab-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100vw;
                    height: 100vh;
                    background: radial-gradient(circle at center, rgba(3, 8, 7, 0.99) 0%, #000000 100%);
                    z-index: 100000;
                    display: flex;
                    font-family: 'Courier New', monospace;
                    color: #ffffff;
                    user-select: none;
                    overflow: hidden;
                    opacity: 0;
                    transition: opacity 0.4s ease;
                }
                
                #dna-lab-sidebar {
                    width: 380px;
                    height: 100%;
                    background: rgba(3, 10, 8, 0.96);
                    border-right: 1px solid rgba(0, 255, 200, 0.25);
                    box-sizing: border-box;
                    padding: 24px;
                    display: flex;
                    flex-direction: column;
                    overflow-y: auto;
                    box-shadow: 10px 0 30px rgba(0, 255, 200, 0.03);
                    z-index: 10;
                }
                
                #dna-lab-sidebar::-webkit-scrollbar {
                    width: 4px;
                }
                #dna-lab-sidebar::-webkit-scrollbar-thumb {
                    background: rgba(0, 255, 200, 0.3);
                }
                
                #dna-lab-viewport-container {
                    flex-grow: 1;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    position: relative;
                }
                
                #dna-lab-header {
                    height: 48px;
                    border-bottom: 1px solid rgba(0, 255, 200, 0.2);
                    display: flex;
                    align-items: center;
                    padding: 0 24px;
                    font-size: 12px;
                    letter-spacing: 2.5px;
                    color: #00ffcc;
                    text-shadow: 0 0 10px rgba(0, 255, 200, 0.3);
                    background: rgba(0, 5, 3, 0.4);
                }
                
                #dna-lab-canvas-container {
                    flex-grow: 1;
                    position: relative;
                    cursor: grab;
                    background: transparent;
                    transition: filter 0.05s ease;
                }
                
                #dna-lab-canvas-container:active {
                    cursor: grabbing;
                }
                
                #dna-lab-controls {
                    display: flex;
                    flex-direction: column;
                    background: rgba(3, 8, 6, 0.95);
                    border-top: 1px solid rgba(0, 255, 200, 0.2);
                    z-index: 10;
                }

                .control-row {
                    display: flex;
                    gap: 32px;
                    background: rgba(0, 4, 3, 0.6);
                    padding: 10px 24px;
                    border-bottom: 1px solid rgba(0, 255, 200, 0.1);
                    align-items: center;
                    justify-content: center;
                }

                .button-row {
                    height: 64px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 12px;
                    padding: 0 16px;
                }
                
                .slider-container {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                    font-size: 8px;
                    letter-spacing: 1.5px;
                    color: rgba(0, 255, 200, 0.8);
                    width: 200px;
                }

                .slider-container label {
                    display: flex;
                    justify-content: space-between;
                }

                .slider-container input[type=range] {
                    -webkit-appearance: none;
                    background: rgba(0, 255, 200, 0.15);
                    height: 3px;
                    border-radius: 1px;
                    outline: none;
                }

                .slider-container input[type=range]::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    background: #00ffcc;
                    width: 10px;
                    height: 10px;
                    border-radius: 50%;
                    cursor: pointer;
                    box-shadow: 0 0 8px #00ffcc;
                }
                
                .lab-btn {
                    background: transparent;
                    border: 1px solid rgba(0, 255, 200, 0.4);
                    color: #00ffcc;
                    font-family: 'Courier New', monospace;
                    font-size: 10px;
                    font-weight: bold;
                    letter-spacing: 1.5px;
                    padding: 10px 16px;
                    cursor: pointer;
                    transition: all 0.2s cubic-bezier(0.165, 0.84, 0.44, 1);
                    box-shadow: 0 0 10px rgba(0, 255, 200, 0.05);
                }
                
                .lab-btn:hover {
                    background: rgba(0, 255, 200, 0.12);
                    border-color: #00ffcc;
                    box-shadow: 0 0 15px rgba(0, 255, 200, 0.2);
                    text-shadow: 0 0 5px #00ffcc;
                }
                
                .lab-btn:active {
                    transform: scale(0.97);
                }
                
                .lab-btn.active {
                    background: #00ffcc;
                    color: #000000;
                    box-shadow: 0 0 20px rgba(0, 255, 200, 0.4);
                }
                
                .lab-btn.exit {
                    border-color: rgba(239, 68, 68, 0.5);
                    color: #ef4444;
                }
                
                .lab-btn.exit:hover {
                    background: rgba(239, 68, 68, 0.12);
                    border-color: #ef4444;
                    box-shadow: 0 0 15px rgba(239, 68, 68, 0.3);
                    text-shadow: 0 0 5px #ef4444;
                }
                
                /* Lore Sidebar Styles */
                .lore-title {
                    font-size: 15px;
                    color: #ffffff;
                    margin-bottom: 6px;
                    font-weight: bold;
                    letter-spacing: 1.5px;
                    border-left: 3px solid #00ffcc;
                    padding-left: 8px;
                }
                
                .lore-meta {
                    font-size: 9px;
                    color: rgba(0, 255, 200, 0.5);
                    margin-bottom: 18px;
                    letter-spacing: 1px;
                }
                
                .lore-section {
                    font-size: 11px;
                    line-height: 1.6;
                    color: rgba(255, 255, 255, 0.8);
                    margin-bottom: 20px;
                }
                
                .lore-log {
                    background: rgba(0, 5, 3, 0.6);
                    border: 1px solid rgba(0, 255, 200, 0.1);
                    padding: 10px;
                    margin-bottom: 10px;
                    font-size: 10px;
                    border-radius: 2px;
                    transition: all 0.3s ease;
                }
                
                .lore-log-header {
                    color: #00ffcc;
                    font-weight: bold;
                    margin-bottom: 4px;
                }
                
                .redacted-box {
                    border: 1px dashed rgba(239, 68, 68, 0.4);
                    background: rgba(30, 10, 10, 0.15);
                    padding: 14px;
                    margin-top: 16px;
                    border-radius: 2px;
                    position: relative;
                    transition: all 0.3s ease;
                }
                
                .redacted-box.decrypted {
                    border: 1px solid rgba(0, 255, 200, 0.3);
                    background: rgba(10, 30, 20, 0.15);
                }
                
                .redacted-header {
                    color: #ef4444;
                    font-size: 11px;
                    font-weight: bold;
                    letter-spacing: 2px;
                    text-transform: uppercase;
                    margin-bottom: 8px;
                }
                
                .redacted-box.decrypted .redacted-header {
                    color: #00ffcc;
                }
                
                .redacted-text {
                    font-size: 10px;
                    line-height: 1.6;
                    color: rgba(239, 68, 68, 0.4);
                    filter: blur(2.5px);
                    transition: filter 0.5s ease;
                }
                
                .redacted-box.decrypted .redacted-text {
                    color: rgba(255, 255, 255, 0.85);
                    filter: blur(0px);
                }
                
                .decrypt-btn {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: rgba(0, 0, 0, 0.9);
                    border: 1px solid #ef4444;
                    color: #ef4444;
                    font-family: monospace;
                    font-size: 9px;
                    padding: 8px 16px;
                    cursor: pointer;
                    font-weight: bold;
                    letter-spacing: 1px;
                    box-shadow: 0 0 10px rgba(239, 68, 68, 0.2);
                    transition: all 0.2s;
                }
                
                .decrypt-btn:hover {
                    background: #ef4444;
                    color: #000000;
                    box-shadow: 0 0 15px #ef4444;
                }
                
                .redacted-box.decrypted .decrypt-btn {
                    display: none;
                }
                
                /* Evolved HUD readouts */
                .hud-panel {
                    position: absolute;
                    background: rgba(0, 5, 3, 0.7);
                    border: 1px solid rgba(0, 255, 200, 0.15);
                    padding: 10px 14px;
                    font-size: 9px;
                    line-height: 1.6;
                    letter-spacing: 1px;
                    color: rgba(0, 255, 200, 0.85);
                    border-radius: 2px;
                    box-shadow: 0 0 10px rgba(0, 255, 200, 0.03);
                    pointer-events: none;
                    text-shadow: 0 0 3px rgba(0, 255, 200, 0.3);
                    transition: all 0.3s ease;
                }
                
                #hud-top-left { top: 60px; left: 404px; }
                #hud-top-right { top: 60px; right: 24px; text-align: right; }
                #hud-bot-left { bottom: 146px; left: 404px; }
                #hud-bot-right { bottom: 146px; right: 24px; text-align: right; }
                
                .hud-panel span {
                    font-weight: bold;
                }
                
                .font-green { color: #00ffcc !important; }
                .font-yellow { color: #f59e0b !important; text-shadow: 0 0 3px rgba(245, 158, 11, 0.3) !important; }
                .font-red { color: #ef4444 !important; text-shadow: 0 0 3px rgba(239, 68, 68, 0.3) !important; }
                
                /* Telemetry Warning Alert */
                #telemetry-alert {
                    position: absolute;
                    top: 55px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: rgba(239, 68, 68, 0.15);
                    border: 1px solid #ef4444;
                    color: #ef4444;
                    font-size: 10px;
                    font-weight: bold;
                    letter-spacing: 2px;
                    padding: 8px 20px;
                    border-radius: 2px;
                    display: none;
                    animation: telemetry-blink 1s infinite alternate;
                    pointer-events: none;
                    box-shadow: 0 0 15px rgba(239, 68, 68, 0.2);
                }
                
                @keyframes telemetry-blink {
                    0% { opacity: 0.2; }
                    100% { opacity: 1; }
                }
                
                /* Evolved CSS viewport glitches */
                @keyframes lab-glitch {
                    0% { transform: translate(0, 0) skewX(0deg); filter: hue-rotate(0deg); }
                    10% { transform: translate(-3px, 1px) skewX(-3deg); filter: hue-rotate(30deg) contrast(1.2) brightness(1.1); }
                    20% { transform: translate(3px, -1px) skewX(2deg); filter: hue-rotate(-20deg); }
                    30% { transform: translate(0, 0); filter: none; }
                    100% { transform: translate(0, 0); }
                }
                @keyframes lab-shake-violent {
                    0% { transform: translate(0, 0); }
                    10% { transform: translate(-4px, -3px); filter: invert(0.08) contrast(1.2) brightness(1.2); }
                    20% { transform: translate(4px, 3px); }
                    30% { transform: translate(-3px, 4px); filter: saturate(1.8) hue-rotate(90deg); }
                    40% { transform: translate(3px, -4px); }
                    50% { transform: translate(-2px, 3px); filter: invert(0.1) hue-rotate(180deg); }
                    60% { transform: translate(2px, -3px); }
                    70% { transform: translate(-3px, -2px); }
                    80% { transform: translate(3px, 2px); }
                    90% { transform: translate(-2px, -2px); }
                    100% { transform: translate(0, 0); }
                }
                .lab-glitched {
                    animation: lab-glitch 0.22s infinite alternate;
                }
                .lab-glitched-violent {
                    animation: lab-shake-violent 0.12s infinite;
                }
            `;
            document.head.appendChild(style);
        }

        // Create HTML Overlay Structure
        this.overlay = document.createElement('div');
        this.overlay.id = 'dna-lab-overlay';
        this.overlay.innerHTML = `
            <div id="dna-lab-sidebar">
                <div class="lore-title">PROJECT HGT-109</div>
                <div class="lore-meta">SECURE ARCHIVE // BIO-INFECTIVE DOSSIER</div>
                
                <div id="logs-container">
                    <div class="lore-section">
                        <strong>OBJECTIVE OVERVIEW:</strong><br>
                        A classified Space Force Bio-Tactical Infantry program attempting to harvest damaged particulate arrays of threat compound HGT-109. The directive sought to introduce inert particulate fragments into biological hosts to restructure DNA cells and establish full cognitive steerage.
                    </div>
                    
                    <div class="lore-section">
                        <strong>SUBJECT TEST LOGS:</strong>
                        
                        <div class="lore-log">
                            <div class="lore-log-header">LOG-109.01 // SYNTHESIS</div>
                            HGT-109 particulate debris harvested from extraction site. Inoculated host cells under strict observation. Base cell structure remains static.
                        </div>
                        
                        <div class="lore-log">
                            <div class="lore-log-header">LOG-109.28 // TRANSITION</div>
                            Host cells showing rapid base pair restructuring. DNA bonds shifting in alignment. Override modules launched to guide neurological outcomes.
                        </div>
                        
                        <div class="lore-log">
                            <div class="lore-log-header">LOG-109.73 // ANOMALY</div>
                            Neural steering failure. Subject muscle mass increased by 300%. The host began continuously vocalizing coordinates pointing to [REDACTED]. Attempted termination protocols.
                        </div>
                        
                        <div class="lore-log">
                            <div class="lore-log-header">LOG-109.99 // FAILURE</div>
                            Host ceased respiration. 30 seconds post-mortem, cellular activity spiked, and subject re-animated as a highly infectious vector. Lockdown breached. Project terminated.
                        </div>
                    </div>
                </div>
                
                <div class="redacted-box" id="redacted-intel-box">
                    <div class="redacted-header" id="redacted-intel-title">
                        <span>[CLASSIFIED RECORDS - REDACTED]</span>
                    </div>
                    <div class="redacted-text" id="redacted-log-content">
                        <strong>FAILURE ANALYSIS (EYES ONLY):</strong><br>
                        Space Force command incorrectly hypothesized HGT-109 particulate fragments to be inert. It was discovered that even destroyed, the particulate functions as a quantum receiver. 
                        <br><br>
                        Once introduced, the particulate forces the host's DNA base pairs to match the vibration frequencies of the non-local entropic entity network ("Hive Soul"). We did not control the host because control is mathematically impossible; the host is claimed by the network. All subjects became shambling vectors.
                    </div>
                    <button class="decrypt-btn" id="btn-decrypt">DECRYPT RECORDS</button>
                </div>
            </div>
            
            <div id="dna-lab-viewport-container">
                <div id="dna-lab-header">[ LAB TERMINAL: DNA STRUCTURAL SIMULATION ]</div>
                <div id="dna-lab-canvas-container"></div>
                
                <!-- Holographic Corner HUD widgets -->
                <div id="hud-top-left" class="hud-panel">
                    <div>CALIBRATION: RUNNING</div>
                    <div>CORE TEMP: <span id="hud-val-temp" class="font-green">34.2 °C</span></div>
                    <div>SYS_FREQ: 2.45 GHz</div>
                </div>
                
                <div id="hud-top-right" class="hud-panel">
                    <div>DNA INTEGRITY: <span id="hud-val-integrity" class="font-green">100.0%</span></div>
                    <div>LATTICE STATE: <span id="hud-val-state" class="font-green">NOMINAL</span></div>
                    <div>MUTATION RATE: <span id="hud-val-mutation" class="font-green">0.0%</span></div>
                </div>
                
                <div id="hud-bot-left" class="hud-panel font-green">
                    <div>DRAG MOUSE TO ROTATE 3D LATTICE</div>
                    <div>SCROLL MOUSE WHEEL TO ZOOM VIEWPORT</div>
                    <div>ACTIVE TARGET: SEED-109</div>
                </div>
                
                <div id="hud-bot-right" class="hud-panel">
                    <div>THREAT PROFILE: <span id="hud-val-threat">INERT PARTICULATE</span></div>
                    <div>COGNITIVE OVERLAY: OFF</div>
                </div>
                
                <!-- Critical Alarm overlay -->
                <div id="telemetry-alert">SYSTEM FAILURE DETECTED: COLLAPSE IN PROGRESS</div>

                <div id="dna-lab-controls">
                    <div class="control-row">
                        <div class="slider-container">
                            <label>PARTICULATE LOAD: <span id="val-load-display">50</span></label>
                            <input type="range" min="10" max="400" value="50" id="slider-particulate-load">
                        </div>
                        <div class="slider-container">
                            <label>STEERAGE FREQ: <span id="val-freq-display">1.0 Hz</span></label>
                            <input type="range" min="2" max="100" value="10" id="slider-steerage-freq">
                        </div>
                        <div class="slider-container">
                            <label>TRIAL DEPTH: <span id="val-depth-display">100 m</span></label>
                            <input type="range" min="100" max="6666" value="100" id="slider-trial-depth">
                        </div>
                    </div>
                    <div class="button-row">
                        <button class="lab-btn active" id="btn-mode-normal">NORMAL VIEW</button>
                        <button class="lab-btn" id="btn-mode-spin">SPIN MATRIX</button>
                        <button class="lab-btn" id="btn-mode-infect">HGT-109 INFECT</button>
                        <button class="lab-btn" id="btn-mode-shear">CELLULAR SHEAR</button>
                        <button class="lab-btn" id="btn-mode-decay">SYSTEM DECAY</button>
                        <button class="lab-btn" id="btn-mode-resonance" style="border-color: #f59e0b; color: #f59e0b;">RESONANCE OVERLOAD</button>
                        <button class="lab-btn exit" id="btn-close-lab">CLOSE LAB</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(this.overlay);

        // Force browser redraw and fade overlay in
        requestAnimationFrame(() => {
            this.overlay.style.opacity = '1';
        });
    },

    setupThreeJS: function () {
        const container = document.getElementById('dna-lab-canvas-container');
        const width = container.clientWidth;
        const height = container.clientHeight;

        // Setup Scene
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x020805, 0.05);

        // Setup Camera
        this.camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
        this.camera.position.z = 9.5;

        // Setup Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        container.appendChild(this.renderer.domElement);

        // Setup Lights
        const ambientLight = new THREE.AmbientLight(0x051310);
        this.scene.add(ambientLight);

        this.pointLight = new THREE.PointLight(0x00ffcc, 1.8, 30);
        this.pointLight.position.set(0, 0, 4);
        this.scene.add(this.pointLight);

        const dirLightA = new THREE.DirectionalLight(0xffffff, 0.9);
        dirLightA.position.set(5, 5, 5);
        this.scene.add(dirLightA);

        const dirLightB = new THREE.DirectionalLight(0x4f00aa, 1.4);
        dirLightB.position.set(-5, -5, -2);
        this.scene.add(dirLightB);
    },

    createDNAScene: function () {
        // Group containing all DNA structures
        this.dnaGroup = new THREE.Group();
        this.scene.add(this.dnaGroup);

        // Group containing HGT-109 particulate spheres
        this.particulateGroup = new THREE.Group();
        this.scene.add(this.particulateGroup);

        this.nodesA = [];
        this.nodesB = [];
        this.rungs = [];
        this.particulates = [];

        // Geometries
        const nodeGeom = new THREE.SphereGeometry(0.12, 16, 16);
        const nodeMatA = new THREE.MeshPhongMaterial({ color: 0x00d2ff, emissive: 0x003355, shininess: 100 });
        const nodeMatB = new THREE.MeshPhongMaterial({ color: 0x00ffa8, emissive: 0x004422, shininess: 100 });
        
        const rungGeom = new THREE.CylinderGeometry(0.04, 0.04, 1.0, 8);
        const rungMat = new THREE.MeshPhongMaterial({ color: 0x3d4b5f, emissive: 0x111622, shininess: 50 });

        // Generate Double Helix
        for (let i = 0; i < this.numBases; i++) {
            const t = i / (this.numBases - 1);
            const baseAngle = t * Math.PI * 4;

            // Strand A Node Mesh
            const meshA = new THREE.Mesh(nodeGeom, nodeMatA.clone());
            this.dnaGroup.add(meshA);
            this.nodesA.push({
                mesh: meshA,
                baseAngle: baseAngle,
                t: t,
                originalColor: 0x00d2ff,
                isInfected: false,
                spikes: [],
                dripY: 0,
                dripVelY: 0
            });

            // Strand B Node Mesh
            const meshB = new THREE.Mesh(nodeGeom, nodeMatB.clone());
            this.dnaGroup.add(meshB);
            this.nodesB.push({
                mesh: meshB,
                baseAngle: baseAngle + Math.PI,
                t: t,
                originalColor: 0x00ffa8,
                isInfected: false,
                spikes: [],
                dripY: 0,
                dripVelY: 0
            });

            // Base pair connection rung
            const rungMesh = new THREE.Mesh(rungGeom, rungMat.clone());
            this.dnaGroup.add(rungMesh);
            this.rungs.push({
                mesh: rungMesh,
                t: t,
                originalColor: 0x3d4b5f
            });
        }

        // Generate Orbiting HGT-109 Particulates (Initial Load: 50)
        this.adjustParticulateDensity(50);

        // --- EVOLVED ELEMENT: Buffer-Attribute Spark Emitters ---
        const sparkGeom = new THREE.BufferGeometry();
        const sparkPositions = new Float32Array(this.maxSparks * 3);
        const sparkColors = new Float32Array(this.maxSparks * 3);
        
        // Populate initially with hidden positions
        for (let i = 0; i < this.maxSparks; i++) {
            sparkPositions[i * 3] = 9999;
            sparkPositions[i * 3 + 1] = 9999;
            sparkPositions[i * 3 + 2] = 9999;
        }
        
        sparkGeom.setAttribute('position', new THREE.BufferAttribute(sparkPositions, 3));
        sparkGeom.setAttribute('color', new THREE.BufferAttribute(sparkColors, 3));
        
        const sparkMat = new THREE.PointsMaterial({
            size: 0.12,
            vertexColors: true,
            transparent: true,
            opacity: 0.95,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        
        this.sparkPoints = new THREE.Points(sparkGeom, sparkMat);
        this.scene.add(this.sparkPoints);

        this.sparks = [];
        for (let i = 0; i < this.maxSparks; i++) {
            this.sparks.push({
                active: false,
                pos: new THREE.Vector3(),
                vel: new THREE.Vector3(),
                color: new THREE.Color(),
                life: 0,
                maxLife: 1
            });
        }

        // --- EVOLVED ELEMENT: Bio-Electric Line Segments ---
        const arcGeom = new THREE.BufferGeometry();
        const maxArcPoints = 400; // max lines 200
        const arcPositions = new Float32Array(maxArcPoints * 3);
        arcGeom.setAttribute('position', new THREE.BufferAttribute(arcPositions, 3));
        
        const arcMat = new THREE.LineBasicMaterial({
            color: 0x00ffcc,
            transparent: true,
            opacity: 0.85,
            blending: THREE.AdditiveBlending,
            linewidth: 2
        });
        
        this.energyArcs = new THREE.LineSegments(arcGeom, arcMat);
        this.scene.add(this.energyArcs);

        // --- EVOLVED ELEMENT: 3D Holographic Scanner HUD rings & cage ---
        const hudCageGeom = new THREE.CylinderGeometry(2.0, 2.0, 6.5, 12, 4, true);
        const hudCageMat = new THREE.MeshBasicMaterial({
            color: 0x00ffcc,
            wireframe: true,
            transparent: true,
            opacity: 0.05,
            side: THREE.DoubleSide
        });
        this.hudCage = new THREE.Mesh(hudCageGeom, hudCageMat);
        this.scene.add(this.hudCage);

        // Rotating target rings
        const ringGeom = new THREE.RingGeometry(1.95, 2.0, 32);
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0x00ffcc,
            transparent: true,
            opacity: 0.15,
            side: THREE.DoubleSide
        });
        
        this.hudRingTop = new THREE.Mesh(ringGeom, ringMat);
        this.hudRingTop.rotation.x = Math.PI / 2;
        this.hudRingTop.position.y = 3.0;
        this.scene.add(this.hudRingTop);

        this.hudRingBot = new THREE.Mesh(ringGeom, ringMat);
        this.hudRingBot.rotation.x = Math.PI / 2;
        this.hudRingBot.position.y = -3.0;
        this.scene.add(this.hudRingBot);
    },

    adjustParticulateDensity: function (newCount) {
        const diff = newCount - this.particulates.length;
        if (diff > 0) {
            const particulateGeom = new THREE.SphereGeometry(0.05, 8, 8);
            const particulateMat = new THREE.MeshPhongMaterial({ color: 0xc084fc, emissive: 0x3b0764, shininess: 120 });
            for (let i = 0; i < diff; i++) {
                const mesh = new THREE.Mesh(particulateGeom, particulateMat);
                const angle = Math.random() * Math.PI * 2;
                const r = 2.4 + Math.random() * 2.2;
                const py = (Math.random() - 0.5) * 7.5;
                mesh.position.set(Math.cos(angle) * r, py, Math.sin(angle) * r);
                this.particulateGroup.add(mesh);
                this.particulates.push({
                    mesh: mesh,
                    baseAngle: angle,
                    radius: r,
                    y: py,
                    speed: 0.3 + Math.random() * 0.6,
                    wobbleSpeed: 1.5 + Math.random() * 2.0,
                    wobbleAmp: 0.12 + Math.random() * 0.15,
                    initialPos: mesh.position.clone()
                });
            }
        } else if (diff < 0) {
            const removeCount = Math.abs(diff);
            for (let i = 0; i < removeCount; i++) {
                const p = this.particulates.pop();
                if (p) {
                    this.particulateGroup.remove(p.mesh);
                    p.mesh.geometry.dispose();
                    p.mesh.material.dispose();
                }
            }
        }
        const display = document.getElementById('val-load-display');
        if (display) display.innerText = newCount;
    },

    spawnSpark: function (position, color, velocity, life = 1.0) {
        let spark = this.sparks.find(s => !s.active);
        if (!spark) {
            spark = this.sparks[Math.floor(Math.random() * this.maxSparks)];
        }
        spark.active = true;
        spark.pos.copy(position);
        spark.vel.copy(velocity);
        spark.color.copy(color);
        spark.life = life;
        spark.maxLife = life;
    },

    bindEvents: function () {
        const container = document.getElementById('dna-lab-canvas-container');

        // Drag to rotate DNA helix
        container.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            this.previousMousePosition = { x: e.clientX, y: e.clientY };
        });

        container.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return;
            const deltaMove = {
                x: e.clientX - this.previousMousePosition.x,
                y: e.clientY - this.previousMousePosition.y
            };

            const invert = (window.LabBreach && window.LabBreach.isControlsInverted) ? -1 : 1;
            this.targetRotY += deltaMove.x * 0.007 * invert;
            this.targetRotX += deltaMove.y * 0.007 * invert;
            this.targetRotX = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this.targetRotX));

            this.previousMousePosition = { x: e.clientX, y: e.clientY };
        });

        window.addEventListener('mouseup', () => {
            this.isDragging = false;
        });

        // Prevent default zoom scrolling on 3D canvas
        container.addEventListener('wheel', (e) => {
            e.preventDefault();
        }, { passive: false });

        // Scroll wheel to change depth (going down/up)
        this.onDocWheel = (e) => {
            if (!this.overlay) return;
            if (this.activeMode === 'RESONANCE_OVERLOAD') return; // block during overload
            
            // Adjust depth by scroll amount
            const depthDelta = e.deltaY * 2.2;
            let newDepth = (window.LabDepth ? window.LabDepth.targetDepth : 100) + depthDelta;
            newDepth = Math.max(100, Math.min(6666, newDepth));
            
            if (window.LabDepth) {
                window.LabDepth.setDepth(newDepth);
            }
            
            // Sync slider UI
            const slider = document.getElementById('slider-trial-depth');
            if (slider) slider.value = newDepth;
        };
        window.addEventListener('wheel', this.onDocWheel, { passive: true });

        // Touch support
        container.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                this.isDragging = true;
                this.previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            }
        });

        container.addEventListener('touchmove', (e) => {
            if (!this.isDragging || e.touches.length !== 1) return;
            const deltaMove = {
                x: e.touches[0].clientX - this.previousMousePosition.x,
                y: e.touches[0].clientY - this.previousMousePosition.y
            };

            const invert = (window.LabBreach && window.LabBreach.isControlsInverted) ? -1 : 1;
            this.targetRotY += deltaMove.x * 0.007 * invert;
            this.targetRotX += deltaMove.y * 0.007 * invert;
            this.targetRotX = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this.targetRotX));

            this.previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        });

        window.addEventListener('touchend', () => {
            this.isDragging = false;
        });

        // Window resize
        window.addEventListener('resize', this.onResizeBound = () => this.handleResize());

        // Mode triggers
        document.getElementById('btn-mode-normal').addEventListener('click', (e) => this.setMode('NORMAL', e.target));
        document.getElementById('btn-mode-spin').addEventListener('click', (e) => this.setMode('SPIN', e.target));
        document.getElementById('btn-mode-infect').addEventListener('click', (e) => this.setMode('INFECT', e.target));
        document.getElementById('btn-mode-shear').addEventListener('click', (e) => this.setMode('SHEAR', e.target));
        document.getElementById('btn-mode-decay').addEventListener('click', (e) => this.setMode('DECAY', e.target));
        document.getElementById('btn-mode-resonance').addEventListener('click', (e) => this.setMode('RESONANCE_OVERLOAD', e.target));
        document.getElementById('btn-close-lab').addEventListener('click', () => this.close());

        // Sliders Listeners
        document.getElementById('slider-particulate-load').addEventListener('input', (e) => {
            this.adjustParticulateDensity(parseInt(e.target.value));
        });

        document.getElementById('slider-steerage-freq').addEventListener('input', (e) => {
            const val = parseInt(e.target.value);
            this.steerageFrequency = val / 10.0;
            const display = document.getElementById('val-freq-display');
            if (display) display.innerText = this.steerageFrequency.toFixed(1) + ' Hz';
        });

        // Decryption sequence
        document.getElementById('btn-decrypt').addEventListener('click', () => this.triggerDecryption());

        // Depth Slider Listener
        document.getElementById('slider-trial-depth').addEventListener('input', (e) => {
            const val = parseInt(e.target.value);
            if (window.LabDepth) window.LabDepth.setDepth(val);
        });
    },

    handleResize: function () {
        if (!this.renderer || !this.camera) return;
        const container = document.getElementById('dna-lab-canvas-container');
        if (!container) return;
        const w = container.clientWidth;
        const h = container.clientHeight;
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h);
    },

    setMode: function (mode, btnElement) {
        if (this.activeMode === mode) return;
        this.activeMode = mode;
        this.decayProgress = 0;
        this.resonanceTime = 0;

        // Clean up CSS classes & styles
        const container = document.getElementById('dna-lab-canvas-container');
        container.className = '';
        container.style.filter = 'none';

        // Reset sidebar overrides if leaving Resonance
        if (mode !== 'RESONANCE_OVERLOAD') {
            this.restoreSidebarLogs();
        }

        // Reset elements to normal size/state on changing mode
        if (mode !== 'INFECT' && mode !== 'RESONANCE_OVERLOAD') {
            // Remove organic spikes
            this.nodesA.forEach(n => {
                n.isInfected = false;
                n.spikes.forEach(s => n.mesh.remove(s.mesh));
                n.spikes = [];
                n.dripY = 0;
                n.dripVelY = 0;
            });
            this.nodesB.forEach(n => {
                n.isInfected = false;
                n.spikes.forEach(s => n.mesh.remove(s.mesh));
                n.spikes = [];
                n.dripY = 0;
                n.dripVelY = 0;
            });
        }

        // Toggle visibility of standard rungs/splinters
        if (mode === 'DECAY' || mode === 'RESONANCE_OVERLOAD') {
            this.rungs.forEach(r => { r.mesh.visible = false; });
            // Remove previous splinters
            this.splinters.forEach(s => this.dnaGroup.remove(s.mesh));
            this.splinters = [];
        } else {
            this.rungs.forEach(r => { r.mesh.visible = true; });
            this.splinters.forEach(s => this.dnaGroup.remove(s.mesh));
            this.splinters = [];
        }

        // Reset exploded coordinates
        this.nodesA.forEach(n => { n.expVel = null; n.expRot = null; });
        this.nodesB.forEach(n => { n.expVel = null; n.expRot = null; });

        // Update active classes on buttons
        const buttons = document.querySelectorAll('.lab-btn');
        buttons.forEach(btn => btn.classList.remove('active'));
        if (btnElement) btnElement.classList.add('active');

        // Play Sound triggers
        if (window.SFX) {
            if (mode === 'DECAY' || mode === 'RESONANCE_OVERLOAD') {
                window.SFX.triggerExplosion();
            } else if (mode === 'INFECT') {
                window.SFX.triggerScream(1.5);
            } else {
                window.SFX.triggerUI();
            }
        }
    },

    triggerDecryption: function () {
        const box = document.getElementById('redacted-intel-box');
        const textElement = document.getElementById('redacted-log-content');
        if (box.classList.contains('decrypted')) return;

        box.classList.add('decrypted');
        if (window.SFX) window.SFX.triggerUIConfirm();

        // Trigger viewport glitch flash
        const container = document.getElementById('dna-lab-canvas-container');
        container.classList.add('lab-glitched-violent');
        setTimeout(() => container.classList.remove('lab-glitched-violent'), 400);

        const targetHTML = textElement.innerHTML;
        textElement.style.filter = 'none';
        textElement.style.color = '#00ffcc';

        let currentLen = 0;
        const interval = setInterval(() => {
            currentLen += 6;
            if (currentLen >= targetHTML.length) {
                textElement.innerHTML = targetHTML;
                clearInterval(interval);
            } else {
                let glitchText = targetHTML.substring(0, currentLen);
                for (let j = currentLen; j < targetHTML.length; j++) {
                    const char = targetHTML[j];
                    if (char === '<' || char === '>' || char === '/' || char === ';' || char === '&' || char === 'b' || char === 'r') {
                        glitchText += char;
                    } else if (/\s/.test(char)) {
                        glitchText += char;
                    } else {
                        glitchText += "█▒░▓/X%$#@!"[Math.floor(Math.random() * 11)];
                    }
                }
                textElement.innerHTML = glitchText;
            }
        }, 15);
    },

    triggerResonanceLogs: function () {
        const logs = document.querySelectorAll('.lore-log');
        const cosmicHorror = [
            "WE ARE NOT DEBRIS. WE ARE THE RECEIVER. THE QUANTUM SHORE BREAKS.",
            "THE HOST IS SECURED. THE MIND UNFOLDS INTO THE VAST ARCHIVE.",
            "COGNITIVE OVERLAY ESTABLISHED. ALL FLESH SHALL ALIGN TO THE CHORD.",
            "THE HIVE BREATHES IN THE SKIN. THERE IS NO REDACTED WHY. WE ARE ONE."
        ];
        
        logs.forEach((log, idx) => {
            log.querySelector('.lore-log-header').innerText = `ERROR // OVERWRITE_${idx}`;
            log.querySelector('.lore-log-header').style.color = '#ef4444';
            log.style.borderColor = 'rgba(239, 68, 68, 0.4)';
            log.style.background = 'rgba(30, 5, 5, 0.8)';
            
            // Overwrite content node
            const textNode = log.childNodes[2] || log.lastChild;
            if (textNode) textNode.textContent = " " + cosmicHorror[idx];
        });
        
        // Decrypt redacted box automatically into red corruption
        const box = document.getElementById('redacted-intel-box');
        const textElement = document.getElementById('redacted-log-content');
        const titleElement = document.getElementById('redacted-intel-title');
        
        box.classList.add('decrypted');
        box.style.borderColor = '#ef4444';
        box.style.background = 'rgba(50, 0, 0, 0.2)';
        textElement.style.color = '#ef4444';
        textElement.style.filter = 'none';
        if (titleElement) titleElement.style.color = '#ef4444';
        
        textElement.innerHTML = "<strong>BREACH SUMMARY:</strong><br>THE VESSEL IS RECLAIMED. ENTROPY INCREASES. THE SYSTEM CANNOT PREVENT THE CONVERGENCE. THE SKY IS A RED EYE.";
    },

    restoreSidebarLogs: function () {
        const sidebar = document.getElementById('dna-lab-sidebar');
        if (!sidebar) return;

        // Restore normal text and layout
        const logsContainer = document.getElementById('logs-container');
        if (logsContainer) {
            logsContainer.innerHTML = `
                <div class="lore-section">
                    <strong>OBJECTIVE OVERVIEW:</strong><br>
                    A classified Space Force Bio-Tactical Infantry program attempting to harvest damaged particulate arrays of threat compound HGT-109. The directive sought to introduce inert particulate fragments into biological hosts to restructure DNA cells and establish full cognitive steerage.
                </div>
                
                <div class="lore-section">
                    <strong>SUBJECT TEST LOGS:</strong>
                    
                    <div class="lore-log">
                        <div class="lore-log-header">LOG-109.01 // SYNTHESIS</div>
                        HGT-109 particulate debris harvested from extraction site. Inoculated host cells under strict observation. Base cell structure remains static.
                    </div>
                    
                    <div class="lore-log">
                        <div class="lore-log-header">LOG-109.28 // TRANSITION</div>
                        Host cells showing rapid base pair restructuring. DNA bonds shifting in alignment. Override modules launched to guide neurological outcomes.
                    </div>
                    
                    <div class="lore-log">
                        <div class="lore-log-header">LOG-109.73 // ANOMALY</div>
                        Neural steering failure. Subject muscle mass increased by 300%. The host began continuously vocalizing coordinates pointing to [REDACTED]. Attempted termination protocols.
                    </div>
                    
                    <div class="lore-log">
                        <div class="lore-log-header">LOG-109.99 // FAILURE</div>
                        Host ceased respiration. 30 seconds post-mortem, cellular activity spiked, and subject re-animated as a highly infectious vector. Lockdown breached. Project terminated.
                    </div>
                </div>
            `;
        }

        const box = document.getElementById('redacted-intel-box');
        const textElement = document.getElementById('redacted-log-content');
        const titleElement = document.getElementById('redacted-intel-title');

        if (box) {
            box.className = 'redacted-box';
            box.style.borderColor = '';
            box.style.background = '';
            if (titleElement) {
                titleElement.style.color = '';
                titleElement.innerHTML = '<span>[CLASSIFIED RECORDS - REDACTED]</span>';
            }
        }
        if (textElement) {
            textElement.style.color = '';
            textElement.style.filter = '';
            textElement.innerHTML = `
                <strong>FAILURE ANALYSIS (EYES ONLY):</strong><br>
                Space Force command incorrectly hypothesized HGT-109 particulate fragments to be inert. It was discovered that even destroyed, the particulate functions as a quantum receiver. 
                <br><br>
                Once introduced, the particulate forces the host's DNA base pairs to match the vibration frequencies of the non-local entropic entity network ("Hive Soul"). We did not control the host because control is mathematically impossible; the host is claimed by the network. All subjects became shambling vectors.
            `;
        }

        // Re-inject decrypt button
        const btnDecrypt = document.getElementById('btn-decrypt');
        if (!btnDecrypt && box) {
            const btn = document.createElement('button');
            btn.className = 'decrypt-btn';
            btn.id = 'btn-decrypt';
            btn.innerText = 'DECRYPT RECORDS';
            box.appendChild(btn);
            btn.addEventListener('click', () => this.triggerDecryption());
        }
    },

    animate: function () {
        if (!this.renderer) return;
        this.animationFrameId = requestAnimationFrame(() => this.animate());

        this.time += 0.016;

        // Apply Inertial Rotation
        this.dnaGroup.rotation.y += (this.targetRotY - this.dnaGroup.rotation.y) * 0.08;
        this.dnaGroup.rotation.x += (this.targetRotX - this.dnaGroup.rotation.x) * 0.08;

        // HUD scanner cage rotation
        this.hudCage.rotation.y = -this.time * 0.15;
        this.hudRingTop.rotation.z = this.time * 0.3;
        this.hudRingBot.rotation.z = -this.time * 0.3;

        // --- DARK FEATURE: Heartbeat Pulse timing (Double beat rhythm: BA-BUM) ---
        let period = 2.0; // 2 seconds per beat normally
        if (this.activeMode === 'SPIN') period = 1.2;
        if (this.activeMode === 'INFECT') period = 0.8;
        if (this.activeMode === 'RESONANCE_OVERLOAD') {
            // Accelerates to 220 BPM (0.27s period) as breach event progresses
            period = Math.max(0.27, 2.0 - this.resonanceTime * 0.18);
        }
        const localTime = this.time % period;
        let heartBeat = 0;
        if (localTime < 0.12) {
            heartBeat = Math.sin((localTime / 0.12) * Math.PI) * 0.15;
        } else if (localTime > 0.18 && localTime < 0.3) {
            heartBeat = Math.sin(((localTime - 0.18) / 0.12) * Math.PI) * 0.22;
        }
        this.heartBeatFactor = heartBeat;

        // Heartbeat lighting sync
        this.pointLight.intensity = 1.2 + this.heartBeatFactor * 2.5;
        if (this.activeMode === 'RESONANCE_OVERLOAD' && this.resonanceTime > 2.0) {
            this.pointLight.color.setHex(0xff0000);
        } else {
            this.pointLight.color.setHex(0x00ffcc);
        }

        // Mode specific updates
        if (this.activeMode === 'NORMAL') {
            this.targetRotY += 0.005;
            this.dnaGroup.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1);
            this.dnaGroup.position.lerp(new THREE.Vector3(0, 0, 0), 0.1);
        } else if (this.activeMode === 'SPIN') {
            this.targetRotY += 0.04;
            const pulse = 1.0 + Math.sin(this.time * 5.0) * 0.07;
            this.dnaGroup.scale.lerp(new THREE.Vector3(pulse, pulse, pulse), 0.15);
            this.dnaGroup.position.lerp(new THREE.Vector3(0, 0, 0), 0.1);
        } else if (this.activeMode === 'INFECT') {
            this.targetRotY += 0.01;
            // DNA shakes frantically
            this.dnaGroup.position.set(
                (Math.random() - 0.5) * 0.07,
                (Math.random() - 0.5) * 0.07,
                (Math.random() - 0.5) * 0.07
            );
        } else if (this.activeMode === 'SHEAR') {
            this.targetRotY += 0.003;
            this.dnaGroup.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1);
            this.dnaGroup.position.lerp(new THREE.Vector3(0, 0, 0), 0.1);
        } else if (this.activeMode === 'DECAY') {
            this.decayProgress = Math.min(1.0, this.decayProgress + 0.005);
            this.targetRotY += 0.002 * (1.0 - this.decayProgress);
            
            const tremor = (1.0 - this.decayProgress) * 0.02;
            this.dnaGroup.position.set(
                (Math.random() - 0.5) * tremor,
                (Math.random() - 0.5) * tremor,
                (Math.random() - 0.5) * tremor
            );
        } else if (this.activeMode === 'RESONANCE_OVERLOAD') {
            // Scripted Resonance Breach Event loop
            this.resonanceTime += 0.016;
            const rt = this.resonanceTime;

            this.targetRotY += 0.006 + rt * 0.006;
            
            // Screen tremor increases over time
            const intensity = Math.min(0.2, rt * 0.02);
            this.dnaGroup.position.set(
                (Math.random() - 0.5) * intensity,
                (Math.random() - 0.5) * intensity,
                (Math.random() - 0.5) * intensity
            );
        }

        // Update Evolved Dynamic Sub-Elements
        this.updateDNASpline();
        this.updateParticulates();
        this.updateSplinters();
        this.updateSparks();
        this.updateEnergyArcs();
        this.updateHUDValues();
        this.updateCSSGlitches();

        // Sub-engine Updates
        const depthVal = window.LabDepth ? window.LabDepth.depth : 100;
        if (window.LabDepth) window.LabDepth.update(0.016);
        if (window.LabTentacles) window.LabTentacles.update(this.time, depthVal);
        if (window.LabBreach) window.LabBreach.update(depthVal);
 
        this.renderer.render(this.scene, this.camera);
    },

    updateDNASpline: function () {
        const R = this.activeMode === 'DECAY' ? this.baseRadius + this.decayProgress * 3.0 : this.baseRadius;
        const H = this.baseHeight;

        for (let i = 0; i < this.numBases; i++) {
            const t = i / (this.numBases - 1);
            
            // Apply Steerage Frequency slider to DNA twist
            const freqFactor = this.steerageFrequency;
            let angleA = t * Math.PI * 4 * freqFactor;
            let angleB = t * Math.PI * 4 * freqFactor + Math.PI;

            // Add wave offsets based on animation modes
            if (this.activeMode === 'SHEAR') {
                const shearWave = Math.sin(this.time * 3.5 + t * 5) * 0.9;
                angleA += shearWave;
                angleB -= shearWave;
            } else if (this.activeMode === 'SPIN') {
                const spinWave = Math.sin(this.time * 6.0 + t * 4) * 0.15;
                angleA += spinWave;
                angleB += spinWave;
            } else if (this.activeMode === 'DECAY') {
                angleA += this.decayProgress * 1.8 * (Math.random() - 0.5);
                angleB += this.decayProgress * 1.8 * (Math.random() - 0.5);
            } else if (this.activeMode === 'RESONANCE_OVERLOAD') {
                // High distortion
                const breachWave = Math.sin(this.time * 8.0 + t * 10) * Math.min(1.2, this.resonanceTime * 0.25);
                angleA += breachWave;
                angleB -= breachWave;
            }

            let yOffsetA = 0;
            let yOffsetB = 0;
            if (this.activeMode === 'DECAY') {
                yOffsetA = (Math.random() - 0.5) * this.decayProgress * 1.2;
                yOffsetB = (Math.random() - 0.5) * this.decayProgress * 1.2;
            } else if (this.activeMode === 'RESONANCE_OVERLOAD' && this.resonanceTime >= 8.0) {
                // Explode nodes
                yOffsetA = (Math.random() - 0.5) * (this.resonanceTime - 8.0) * 1.5;
                yOffsetB = (Math.random() - 0.5) * (this.resonanceTime - 8.0) * 1.5;
            }

            const posA = new THREE.Vector3(Math.cos(angleA) * R, (t - 0.5) * H + yOffsetA, Math.sin(angleA) * R);
            const posB = new THREE.Vector3(Math.cos(angleB) * R, (t - 0.5) * H + yOffsetB, Math.sin(angleB) * R);

            const nodeA = this.nodesA[i];
            const nodeB = this.nodesB[i];
            const rung = this.rungs[i];

            // --- DARK FEATURE: Melting Dripping Slime physics in DECAY ---
            if (this.activeMode === 'DECAY' && this.decayProgress > 0.25) {
                const dripScale = (this.decayProgress - 0.25) / 0.75;
                
                nodeA.dripVelY -= 0.0025 * Math.random();
                nodeA.dripY += nodeA.dripVelY;
                posA.y += nodeA.dripY;

                nodeB.dripVelY -= 0.0025 * Math.random();
                nodeB.dripY += nodeB.dripVelY;
                posB.y += nodeB.dripY;

                // Stretch along Y to simulate organic droplets
                const stretch = 1.0 + dripScale * 3.5;
                const width = Math.max(0.001, (1.0 - this.decayProgress) * 0.7);
                
                // Drop pooling clamping
                if (posA.y < -3.0) {
                    posA.y = -3.0;
                    nodeA.mesh.scale.set(width * 2.5, 0.01, width * 2.5); // flat pooling slag
                    nodeA.mesh.material.color.setHex(0xff3f00);
                } else {
                    nodeA.mesh.scale.set(width, width * stretch, width);
                }

                if (posB.y < -3.0) {
                    posB.y = -3.0;
                    nodeB.mesh.scale.set(width * 2.5, 0.01, width * 2.5);
                    nodeB.mesh.material.color.setHex(0xff3f00);
                } else {
                    nodeB.mesh.scale.set(width, width * stretch, width);
                }

                // Dropping slime sparks
                if (Math.random() < 0.18 && posA.y > -3.0) {
                    this.spawnSpark(posA, new THREE.Color(0xff4500), new THREE.Vector3(0, -0.05, 0), 0.6);
                }
                if (Math.random() < 0.18 && posB.y > -3.0) {
                    this.spawnSpark(posB, new THREE.Color(0xff4500), new THREE.Vector3(0, -0.05, 0), 0.6);
                }
            } else if (this.activeMode === 'RESONANCE_OVERLOAD' && this.resonanceTime >= 8.0) {
                // Explode nodes
                if (!nodeA.expVel) {
                    const dirA = posA.clone().normalize();
                    nodeA.expVel = dirA.multiplyScalar(0.06).add(new THREE.Vector3((Math.random()-0.5)*0.1, (Math.random()-0.5)*0.1 + 0.02, (Math.random()-0.5)*0.1));
                    nodeA.expRot = new THREE.Vector3(Math.random()*0.1, Math.random()*0.1, Math.random()*0.1);
                }
                posA.add(nodeA.expVel);
                nodeA.mesh.rotation.x += nodeA.expRot.x;
                nodeA.mesh.rotation.y += nodeA.expRot.y;

                if (!nodeB.expVel) {
                    const dirB = posB.clone().normalize();
                    nodeB.expVel = dirB.multiplyScalar(0.06).add(new THREE.Vector3((Math.random()-0.5)*0.1, (Math.random()-0.5)*0.1 + 0.02, (Math.random()-0.5)*0.1));
                    nodeB.expRot = new THREE.Vector3(Math.random()*0.1, Math.random()*0.1, Math.random()*0.1);
                }
                posB.add(nodeB.expVel);
                nodeB.mesh.rotation.x += nodeB.expRot.x;
                nodeB.mesh.rotation.y += nodeB.expRot.y;

                const shrink = Math.max(0.001, nodeA.mesh.scale.x - 0.02);
                nodeA.mesh.scale.set(shrink, shrink, shrink);
                nodeB.mesh.scale.set(shrink, shrink, shrink);
            }

            if (this.activeMode !== 'DECAY' && (this.activeMode !== 'RESONANCE_OVERLOAD' || this.resonanceTime < 8.0)) {
                nodeA.mesh.position.copy(posA);
                nodeB.mesh.position.copy(posB);
            } else if (this.activeMode === 'DECAY') {
                // Pos updated via drip logic
                nodeA.mesh.position.copy(posA);
                nodeB.mesh.position.copy(posB);
            } else {
                nodeA.mesh.position.copy(posA);
                nodeB.mesh.position.copy(posB);
            }

            // Sync node breathing and scale to Heartbeat Pulse
            if (this.activeMode === 'NORMAL') {
                const scaleFactor = 1.0 + this.heartBeatFactor;
                nodeA.mesh.scale.set(scaleFactor, scaleFactor, scaleFactor);
                nodeB.mesh.scale.set(scaleFactor, scaleFactor, scaleFactor);
                
                nodeA.mesh.material.color.setHex(nodeA.originalColor);
                nodeB.mesh.material.color.setHex(nodeB.originalColor);
                
                // Emissive heart glow
                nodeA.mesh.material.emissive.setHex(0x003355);
                nodeA.mesh.material.emissive.add(new THREE.Color(0xff0000).multiplyScalar(this.heartBeatFactor * 1.5));
                nodeB.mesh.material.emissive.setHex(0x004422);
                nodeB.mesh.material.emissive.add(new THREE.Color(0xff0000).multiplyScalar(this.heartBeatFactor * 1.5));

                rung.mesh.scale.set(1, 1, 1);
                rung.mesh.material.color.setHex(rung.originalColor);
                rung.mesh.material.emissive.setHex(0x111622);
            } 
            else if (this.activeMode === 'SPIN') {
                const scaleFactor = 1.0 + this.heartBeatFactor * 1.2;
                nodeA.mesh.scale.set(scaleFactor, scaleFactor, scaleFactor);
                nodeB.mesh.scale.set(scaleFactor, scaleFactor, scaleFactor);
                
                nodeA.mesh.material.emissive.setHex(0x003355);
                nodeA.mesh.material.emissive.add(new THREE.Color(0xff0000).multiplyScalar(this.heartBeatFactor * 2.0));
                nodeB.mesh.material.emissive.setHex(0x004422);
                nodeB.mesh.material.emissive.add(new THREE.Color(0xff0000).multiplyScalar(this.heartBeatFactor * 2.0));
            }
            else if (this.activeMode === 'INFECT') {
                const scaleFactor = 1.0 + this.heartBeatFactor;

                // --- DARK FEATURE: Mutated Spike spawning and animation ---
                if (nodeA.isInfected) {
                    const infectScale = 1.35 + this.heartBeatFactor * 1.8;
                    nodeA.mesh.scale.set(infectScale, infectScale, infectScale);
                    nodeA.mesh.material.color.setHex(0x00ff44);
                    nodeA.mesh.material.emissive.setHex(0x00aa00);

                    // Grow spikes
                    if (nodeA.spikes.length === 0) {
                        const spikeGeom = new THREE.ConeGeometry(0.022, 0.28, 4);
                        const spikeMat = new THREE.MeshPhongMaterial({ color: 0x00ff44, emissive: 0x003f00 });
                        for (let s = 0; s < 4; s++) {
                            const spikeMesh = new THREE.Mesh(spikeGeom, spikeMat);
                            const dir = new THREE.Vector3(
                                (Math.random() - 0.5) * 2.0,
                                (Math.random() - 0.5) * 2.0,
                                (Math.random() - 0.5) * 2.0
                            ).normalize();
                            spikeMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
                            spikeMesh.position.copy(dir).multiplyScalar(0.02);
                            spikeMesh.scale.set(0.01, 0.01, 0.01);
                            nodeA.mesh.add(spikeMesh);
                            nodeA.spikes.push({ mesh: spikeMesh, dir: dir, currentScale: 0 });
                        }
                    } else {
                        nodeA.spikes.forEach(sp => {
                            sp.currentScale = Math.min(1.0, sp.currentScale + 0.02);
                            sp.mesh.scale.set(sp.currentScale, sp.currentScale, sp.currentScale);
                            sp.mesh.position.copy(sp.dir).multiplyScalar(0.08 * sp.currentScale);
                        });
                    }
                } else {
                    nodeA.mesh.scale.set(scaleFactor, scaleFactor, scaleFactor);
                }

                if (nodeB.isInfected) {
                    const infectScale = 1.35 + this.heartBeatFactor * 1.8;
                    nodeB.mesh.scale.set(infectScale, infectScale, infectScale);
                    nodeB.mesh.material.color.setHex(0xff00b0);
                    nodeB.mesh.material.emissive.setHex(0xaa0066);

                    // Grow spikes Strand B
                    if (nodeB.spikes.length === 0) {
                        const spikeGeom = new THREE.ConeGeometry(0.022, 0.28, 4);
                        const spikeMat = new THREE.MeshPhongMaterial({ color: 0xff00b0, emissive: 0x3f0022 });
                        for (let s = 0; s < 4; s++) {
                            const spikeMesh = new THREE.Mesh(spikeGeom, spikeMat);
                            const dir = new THREE.Vector3(
                                (Math.random() - 0.5) * 2.0,
                                (Math.random() - 0.5) * 2.0,
                                (Math.random() - 0.5) * 2.0
                            ).normalize();
                            spikeMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
                            spikeMesh.position.copy(dir).multiplyScalar(0.02);
                            spikeMesh.scale.set(0.01, 0.01, 0.01);
                            nodeB.mesh.add(spikeMesh);
                            nodeB.spikes.push({ mesh: spikeMesh, dir: dir, currentScale: 0 });
                        }
                    } else {
                        nodeB.spikes.forEach(sp => {
                            sp.currentScale = Math.min(1.0, sp.currentScale + 0.02);
                            sp.mesh.scale.set(sp.currentScale, sp.currentScale, sp.currentScale);
                            sp.mesh.position.copy(sp.dir).multiplyScalar(0.08 * sp.currentScale);
                        });
                    }
                } else {
                    nodeB.mesh.scale.set(scaleFactor, scaleFactor, scaleFactor);
                }

                if (nodeA.isInfected || nodeB.isInfected) {
                    rung.mesh.material.color.setHex(0xb5ff00);
                    rung.mesh.material.emissive.setHex(0x445500);
                }
            } 
            else if (this.activeMode === 'SHEAR') {
                const dir = new THREE.Vector3().subVectors(posB, posA);
                const len = dir.length();
                const stress = Math.abs(Math.sin(this.time * 3.0 + t * 5.0));
                
                const thickness = 1.0 - stress * 0.4;
                rung.mesh.scale.set(thickness, len, thickness);
                
                rung.mesh.material.color.lerpColors(new THREE.Color(rung.originalColor), new THREE.Color(0xff4400), stress);
                rung.mesh.material.emissive.lerpColors(new THREE.Color(0x111622), new THREE.Color(0x550000), stress);
                
                if (stress > 0.82 && Math.random() < 0.12) {
                    const midPoint = new THREE.Vector3().addVectors(posA, posB).multiplyScalar(0.5);
                    this.spawnSpark(
                        midPoint,
                        new THREE.Color(0xffa500),
                        new THREE.Vector3((Math.random() - 0.5) * 0.08, Math.random() * 0.05, (Math.random() - 0.5) * 0.08),
                        0.5
                    );
                }
            }
            else if (this.activeMode === 'RESONANCE_OVERLOAD') {
                const rt = this.resonanceTime;
                
                if (rt < 2.0) {
                    const scaleFactor = 1.0 + this.heartBeatFactor * 1.5;
                    nodeA.mesh.scale.set(scaleFactor, scaleFactor, scaleFactor);
                    nodeB.mesh.scale.set(scaleFactor, scaleFactor, scaleFactor);
                } 
                else if (rt >= 2.0 && rt < 5.0) {
                    // Start pulsing red
                    const scaleFactor = 1.1 + this.heartBeatFactor * 2.0;
                    nodeA.mesh.scale.set(scaleFactor, scaleFactor, scaleFactor);
                    nodeB.mesh.scale.set(scaleFactor, scaleFactor, scaleFactor);
                    nodeA.mesh.material.color.lerp(new THREE.Color(0xef4444), 0.08);
                    nodeB.mesh.material.color.lerp(new THREE.Color(0xef4444), 0.08);
                } 
                else if (rt >= 5.0 && rt < 8.0) {
                    // Turn pitch black with purple core
                    const scaleFactor = 1.25 + this.heartBeatFactor * 2.5;
                    nodeA.mesh.scale.set(scaleFactor, scaleFactor, scaleFactor);
                    nodeB.mesh.scale.set(scaleFactor, scaleFactor, scaleFactor);
                    nodeA.mesh.material.color.setHex(0x020005);
                    nodeA.mesh.material.emissive.setHex(0x6e00a3);
                    nodeB.mesh.material.color.setHex(0x020005);
                    nodeB.mesh.material.emissive.setHex(0x6e00a3);
                    
                    // Force text log overrides on Resonance overloaded mind signal
                    if (Math.random() < 0.02) this.triggerResonanceLogs();
                }
            }

            // Cylinder Rung update positions
            if (this.activeMode !== 'DECAY' && this.activeMode !== 'SHEAR' && (this.activeMode !== 'RESONANCE_OVERLOAD' || this.resonanceTime < 8.0)) {
                const dir = new THREE.Vector3().subVectors(posB, posA);
                const len = dir.length();
                rung.mesh.scale.set(1, len, 1);

                const mid = new THREE.Vector3().addVectors(posA, posB).multiplyScalar(0.5);
                rung.mesh.position.copy(mid);
                rung.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
            } else if (this.activeMode === 'SHEAR') {
                const dir = new THREE.Vector3().subVectors(posB, posA);
                const mid = new THREE.Vector3().addVectors(posA, posB).multiplyScalar(0.5);
                rung.mesh.position.copy(mid);
                rung.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
            }
        }
    },

    updateParticulates: function () {
        this.particulates.forEach((p, idx) => {
            if (this.activeMode === 'DECAY') {
                const dir = p.mesh.position.clone().normalize();
                p.mesh.position.addScaledVector(dir, 0.15);
                const s = Math.max(0.001, p.mesh.scale.x - 0.015);
                p.mesh.scale.set(s, s, s);
            } else if (this.activeMode === 'RESONANCE_OVERLOAD') {
                // Particulates swarm aggressively around the DNA center
                const rt = this.resonanceTime;
                if (rt < 8.0) {
                    const speed = 1.0 + rt * 0.5;
                    p.baseAngle += p.speed * 0.02 * speed;
                    const r = Math.max(0.2, p.radius - rt * 0.25);
                    p.mesh.position.set(
                        Math.cos(p.baseAngle) * r,
                        p.y + Math.sin(this.time * p.wobbleSpeed * speed) * p.wobbleAmp,
                        Math.sin(p.baseAngle) * r
                    );
                    p.mesh.material.color.setHex(0xa855f7); // high violet excitation
                } else {
                    // Explode outward
                    const dir = p.mesh.position.clone().normalize();
                    p.mesh.position.addScaledVector(dir, 0.25);
                }
            } else if (this.activeMode === 'INFECT') {
                const targetIdx = idx % this.numBases;
                const targetNode = idx % 2 === 0 ? this.nodesA[targetIdx] : this.nodesB[targetIdx];
                const targetPos = targetNode.mesh.position;

                p.mesh.position.lerp(targetPos, 0.045);

                const dist = p.mesh.position.distanceTo(targetPos);
                if (dist < 0.22) {
                    if (!targetNode.isInfected) {
                        targetNode.isInfected = true;
                        
                        const sparkCol = idx % 2 === 0 ? new THREE.Color(0x00ff66) : new THREE.Color(0xff00ff);
                        for (let k = 0; k < 3; k++) {
                            this.spawnSpark(
                                targetPos,
                                sparkCol,
                                new THREE.Vector3(
                                    (Math.random() - 0.5) * 0.15,
                                    (Math.random() - 0.5) * 0.15,
                                    (Math.random() - 0.5) * 0.15
                                ),
                                0.6
                            );
                        }
                    }
                }
            } else {
                const speedMult = this.activeMode === 'SPIN' ? 3.0 : 1.0;
                p.baseAngle += p.speed * 0.015 * speedMult;
                const wobble = Math.sin(this.time * p.wobbleSpeed) * p.wobbleAmp;
                const radius = p.radius + wobble;

                p.mesh.position.set(
                    Math.cos(p.baseAngle) * radius,
                    p.y + wobble,
                    Math.sin(p.baseAngle) * radius
                );

                p.mesh.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1);
                p.mesh.material.color.setHex(0xc084fc);
            }
        });
    },

    updateSplinters: function () {
        if (this.activeMode === 'DECAY') {
            if (this.splinters.length === 0) {
                const splinterGeom = new THREE.CylinderGeometry(0.035, 0.035, 0.45, 8);
                const splinterMat = new THREE.MeshPhongMaterial({
                    color: 0xff3300,
                    emissive: 0xff1100,
                    transparent: true,
                    opacity: 1.0,
                    shininess: 30
                });

                for (let i = 0; i < this.numBases; i++) {
                    const posA = this.nodesA[i].mesh.position;
                    const posB = this.nodesB[i].mesh.position;
                    const mid = new THREE.Vector3().addVectors(posA, posB).multiplyScalar(0.5);

                    const meshSA = new THREE.Mesh(splinterGeom, splinterMat.clone());
                    meshSA.position.copy(posA).lerp(mid, 0.5);
                    this.dnaGroup.add(meshSA);

                    const meshSB = new THREE.Mesh(splinterGeom, splinterMat.clone());
                    meshSB.position.copy(posB).lerp(mid, 0.5);
                    this.dnaGroup.add(meshSB);

                    const dirA = new THREE.Vector3().subVectors(posA, mid).normalize();
                    const dirB = new THREE.Vector3().subVectors(posB, mid).normalize();
                    
                    this.splinters.push({
                        mesh: meshSA,
                        vel: dirA.multiplyScalar(0.045).add(new THREE.Vector3(
                            (Math.random() - 0.5) * 0.04,
                            (Math.random() - 0.5) * 0.04 + 0.02,
                            (Math.random() - 0.5) * 0.04
                        )),
                        rotVel: new THREE.Vector3(Math.random() * 0.12, Math.random() * 0.12, Math.random() * 0.12),
                        life: 1.0
                    });

                    this.splinters.push({
                        mesh: meshSB,
                        vel: dirB.multiplyScalar(0.045).add(new THREE.Vector3(
                            (Math.random() - 0.5) * 0.04,
                            (Math.random() - 0.5) * 0.04 + 0.02,
                            (Math.random() - 0.5) * 0.04
                        )),
                        rotVel: new THREE.Vector3(Math.random() * 0.12, Math.random() * 0.12, Math.random() * 0.12),
                        life: 1.0
                    });
                }
            }

            this.splinters.forEach(s => {
                s.mesh.position.add(s.vel);
                s.mesh.rotation.x += s.rotVel.x;
                s.mesh.rotation.y += s.rotVel.y;
                s.mesh.rotation.z += s.rotVel.z;

                s.life -= 0.016;
                const opacity = Math.max(0, s.life);
                s.mesh.material.opacity = opacity;

                if (s.life > 0.1 && Math.random() < 0.15) {
                    this.spawnSpark(
                        s.mesh.position,
                        new THREE.Color(0xff5500),
                        new THREE.Vector3((Math.random() - 0.5) * 0.03, -0.01, (Math.random() - 0.5) * 0.03),
                        0.4
                    );
                }

                if (s.life <= 0) {
                    s.mesh.visible = false;
                }
            });
        }
    },

    updateSparks: function () {
        const positions = this.sparkPoints.geometry.attributes.position.array;
        const colors = this.sparkPoints.geometry.attributes.color.array;

        for (let i = 0; i < this.maxSparks; i++) {
            const s = this.sparks[i];
            if (s.active) {
                s.pos.add(s.vel);
                s.pos.y += 0.012;
                s.vel.multiplyScalar(0.965);

                s.life -= 0.016;
                if (s.life <= 0) {
                    s.active = false;
                    positions[i * 3] = 9999;
                    positions[i * 3 + 1] = 9999;
                    positions[i * 3 + 2] = 9999;
                } else {
                    positions[i * 3] = s.pos.x;
                    positions[i * 3 + 1] = s.pos.y;
                    positions[i * 3 + 2] = s.pos.z;

                    const ratio = s.life / s.maxLife;
                    colors[i * 3] = s.color.r * ratio;
                    colors[i * 3 + 1] = s.color.g * ratio;
                    colors[i * 3 + 2] = s.color.b * ratio;
                }
            } else {
                positions[i * 3] = 9999;
                positions[i * 3 + 1] = 9999;
                positions[i * 3 + 2] = 9999;
            }
        }

        this.sparkPoints.geometry.attributes.position.needsUpdate = true;
        this.sparkPoints.geometry.attributes.color.needsUpdate = true;
    },

    updateEnergyArcs: function () {
        const posArr = this.energyArcs.geometry.attributes.position.array;
        let arcIdx = 0;

        if (this.activeMode === 'INFECT') {
            for (let i = 0; i < this.numBases; i++) {
                const nodeA = this.nodesA[i];
                const nodeB = this.nodesB[i];

                if (nodeA.isInfected && nodeB.isInfected && arcIdx < 120) {
                    const pA = nodeA.mesh.position;
                    const pB = nodeB.mesh.position;

                    const mid = new THREE.Vector3().addVectors(pA, pB).multiplyScalar(0.5);
                    const displaceFactor = 0.25;
                    mid.x += (Math.random() - 0.5) * displaceFactor;
                    mid.y += (Math.random() - 0.5) * displaceFactor;
                    mid.z += (Math.random() - 0.5) * displaceFactor;

                    posArr[arcIdx * 6] = pA.x;
                    posArr[arcIdx * 6 + 1] = pA.y;
                    posArr[arcIdx * 6 + 2] = pA.z;
                    
                    posArr[arcIdx * 6 + 3] = mid.x;
                    posArr[arcIdx * 6 + 4] = mid.y;
                    posArr[arcIdx * 6 + 5] = mid.z;
                    arcIdx++;

                    posArr[arcIdx * 6] = mid.x;
                    posArr[arcIdx * 6 + 1] = mid.y;
                    posArr[arcIdx * 6 + 2] = mid.z;

                    posArr[arcIdx * 6 + 3] = pB.x;
                    posArr[arcIdx * 6 + 4] = pB.y;
                    posArr[arcIdx * 6 + 5] = pB.z;
                    arcIdx++;
                }
            }

            for (let i = arcIdx * 2; i < 400; i++) {
                posArr[i * 3] = 9999;
                posArr[i * 3 + 1] = 9999;
                posArr[i * 3 + 2] = 9999;
            }

            this.energyArcs.geometry.attributes.position.needsUpdate = true;
            this.energyArcs.visible = true;

            this.energyArcs.material.color.setHex(Math.random() < 0.5 ? 0x00ffa0 : 0xff00ff);
            this.energyArcs.material.opacity = 0.35 + Math.random() * 0.65;
        } 
        else if (this.activeMode === 'RESONANCE_OVERLOAD') {
            // --- DARK FEATURE: Sprout chaotic spiderweb energy connections ---
            const rt = this.resonanceTime;
            if (rt >= 2.0 && rt < 8.0) {
                // Connect random nodes A and B with black/purple lighting arcs
                for (let i = 0; i < this.numBases - 1; i += 2) {
                    if (arcIdx >= 120) break;
                    
                    const pA1 = this.nodesA[i].mesh.position;
                    const pB2 = this.nodesB[i+1].mesh.position;
                    const pB1 = this.nodesB[i].mesh.position;
                    const pA2 = this.nodesA[i+1].mesh.position;

                    // Arc 1
                    posArr[arcIdx * 6] = pA1.x; posArr[arcIdx * 6 + 1] = pA1.y; posArr[arcIdx * 6 + 2] = pA1.z;
                    posArr[arcIdx * 6 + 3] = pB2.x; posArr[arcIdx * 6 + 4] = pB2.y; posArr[arcIdx * 6 + 5] = pB2.z;
                    arcIdx++;

                    // Arc 2
                    posArr[arcIdx * 6] = pB1.x; posArr[arcIdx * 6 + 1] = pB1.y; posArr[arcIdx * 6 + 2] = pB1.z;
                    posArr[arcIdx * 6 + 3] = pA2.x; posArr[arcIdx * 6 + 4] = pA2.y; posArr[arcIdx * 6 + 5] = pA2.z;
                    arcIdx++;
                }

                for (let i = arcIdx * 2; i < 400; i++) {
                    posArr[i * 3] = 9999;
                    posArr[i * 3 + 1] = 9999;
                    posArr[i * 3 + 2] = 9999;
                }

                this.energyArcs.geometry.attributes.position.needsUpdate = true;
                this.energyArcs.visible = true;
                
                // Dark violet/red glow
                this.energyArcs.material.color.setHex(Math.random() < 0.5 ? 0x9333ea : 0xef4444);
                this.energyArcs.material.opacity = 0.5 + Math.random() * 0.5;
            } else {
                this.energyArcs.visible = false;
            }
        }
        else {
            this.energyArcs.visible = false;
        }
    },

    updateHUDValues: function () {
        const tempEl = document.getElementById('hud-val-temp');
        const integrityEl = document.getElementById('hud-val-integrity');
        const stateEl = document.getElementById('hud-val-state');
        const mutationEl = document.getElementById('hud-val-mutation');
        const threatEl = document.getElementById('hud-val-threat');
        const alertEl = document.getElementById('telemetry-alert');

        if (!tempEl) return;

        // Reset classes
        tempEl.className = 'font-green';
        integrityEl.className = 'font-green';
        stateEl.className = 'font-green';
        mutationEl.className = 'font-green';
        alertEl.style.display = 'none';

        if (this.activeMode === 'NORMAL') {
            const tempVal = 34.0 + Math.sin(this.time * 2.0) * 0.4;
            tempEl.innerText = tempVal.toFixed(1) + ' °C';
            integrityEl.innerText = '100.0%';
            stateEl.innerText = 'NOMINAL';
            mutationEl.innerText = '0.0%';
            threatEl.innerHTML = 'INERT PARTICULATE';
        } 
        else if (this.activeMode === 'SPIN') {
            const tempVal = 42.1 + Math.sin(this.time * 5.0) * 0.8;
            tempEl.innerText = tempVal.toFixed(1) + ' °C';
            integrityEl.innerText = '99.8%';
            stateEl.innerText = 'SPIN MATRIX ACTIVE';
            mutationEl.innerText = '0.0%';
            threatEl.innerHTML = 'INERT PARTICULATE';
        }
        else if (this.activeMode === 'INFECT') {
            const infectedCount = this.nodesA.filter(n => n.isInfected).length + this.nodesB.filter(n => n.isInfected).length;
            const ratio = infectedCount / (this.numBases * 2);
            
            const tempVal = 44.0 + ratio * 20.0 + Math.sin(this.time * 10.0) * 1.5;
            tempEl.innerText = tempVal.toFixed(1) + ' °C';
            tempEl.className = ratio > 0.5 ? 'font-red' : 'font-yellow';

            const integrityVal = (100.0 - ratio * 35.0);
            integrityEl.innerText = integrityVal.toFixed(1) + '%';
            integrityEl.className = ratio > 0.5 ? 'font-red' : 'font-yellow';

            stateEl.innerText = ratio === 1.0 ? 'FULLY MUTATED' : 'CRITICAL ASSIMILATION';
            stateEl.className = ratio === 1.0 ? 'font-red' : 'font-yellow';

            const mutationVal = (ratio * 100.0);
            mutationEl.innerText = mutationVal.toFixed(1) + '%';
            mutationEl.className = 'font-yellow';

            threatEl.innerHTML = ratio > 0.0 ? '<span class="font-red">MUTATION VECTOR: ACTIVE</span>' : 'HGT-109 RECEPTIVE';
        }
        else if (this.activeMode === 'SHEAR') {
            const stress = Math.abs(Math.sin(this.time * 3.0));
            const tempVal = 51.5 + stress * 5.0 + Math.sin(this.time * 2.0) * 0.3;
            tempEl.innerText = tempVal.toFixed(1) + ' °C';
            tempEl.className = 'font-yellow';

            const integrityVal = (100.0 - stress * 14.0);
            integrityEl.innerText = integrityVal.toFixed(1) + '%';
            integrityEl.className = 'font-yellow';

            stateEl.innerText = 'TORSION STRESS';
            stateEl.className = 'font-yellow';
            
            mutationEl.innerText = '0.0%';

            threatEl.innerHTML = '<span class="font-yellow">MECHANICAL INTERFERENCE</span>';
        }
        else if (this.activeMode === 'DECAY') {
            tempEl.innerText = 'ERR // OVERLOAD';
            tempEl.className = 'font-red';

            const integrityVal = Math.max(0.0, 100.0 - this.decayProgress * 100.0);
            integrityEl.innerText = integrityVal.toFixed(1) + '%';
            integrityEl.className = 'font-red';

            stateEl.innerText = integrityVal === 0.0 ? 'TERMINATED' : 'CRITICAL COLLAPSE';
            stateEl.className = 'font-red';

            mutationEl.innerText = 'UNKNOWN';
            mutationEl.className = 'font-red';

            threatEl.innerHTML = '<span class="font-red">BIOHAZARD DETECTED</span>';

            alertEl.style.display = 'block';
            alertEl.innerText = integrityVal === 0.0 ? 'ALERT: LATTICE STRUCTURE DESTROYED' : 'SYSTEM FAILURE DETECTED: COLLAPSE IN PROGRESS';
        }
        else if (this.activeMode === 'RESONANCE_OVERLOAD') {
            // --- DARK EVENT: Quarantine telemetries override ---
            const rt = this.resonanceTime;
            tempEl.className = 'font-red';
            integrityEl.className = 'font-red';
            stateEl.className = 'font-red';
            mutationEl.className = 'font-red';

            alertEl.style.display = 'block';
            
            if (rt < 2.0) {
                tempEl.innerText = 'OVER-EXCITED';
                integrityEl.innerText = '99.4%';
                stateEl.innerText = 'RESONANCE DEVIATION';
                mutationEl.innerText = '0.2%';
                threatEl.innerHTML = '<span class="font-yellow">UNKNOWN SIGNAL ATTACHED</span>';
                alertEl.innerText = 'WARNING: COGNITIVE OVERLAY SIGNAL DETECTED';
                alertEl.className = 'font-yellow';
            }
            else if (rt >= 2.0 && rt < 5.0) {
                tempEl.innerText = '74.2 °C (HEATING)';
                integrityEl.innerText = '74.5%';
                stateEl.innerText = 'SIGNAL SYNC: INCOMPLETE';
                mutationEl.innerText = '45.1%';
                threatEl.innerHTML = '<span class="font-red">COGNITIVE SYNC IN PROGRESS</span>';
                alertEl.innerText = 'CRITICAL ALARM: SECURITY ENCLOSURE FRACTURE';
                alertEl.className = 'font-red';
            }
            else if (rt >= 5.0 && rt < 8.0) {
                tempEl.innerText = '104.9 °C // DANGER';
                integrityEl.innerText = '14.2%';
                stateEl.innerText = 'OVERWRITE: ACTIVE';
                mutationEl.innerText = '100.0%';
                threatEl.innerHTML = '<span class="font-red">ENTITY ALIGNMENT SECURED</span>';
                alertEl.innerText = 'ALERT: COGNITIVE OVERWRITE COMPLETE // CONVERGENCE';
                alertEl.className = 'font-red';
            }
            else {
                tempEl.innerText = 'SYS DEAD';
                integrityEl.innerText = '0.0%';
                stateEl.innerText = 'HOST TERMINATED';
                mutationEl.innerText = '100.0%';
                threatEl.innerHTML = '<span class="font-red">HOST IDENTIFIED AS HIVE NEST</span>';
                alertEl.innerText = 'WARNING: QUARANTINE PROTOCOL INITIATED // ACCESS REJECT';
                alertEl.className = 'font-red';
            }
        }
    },

    updateCSSGlitches: function () {
        const container = document.getElementById('dna-lab-canvas-container');
        if (!container) return;

        if (this.activeMode === 'INFECT') {
            const infectedCount = this.nodesA.filter(n => n.isInfected).length + this.nodesB.filter(n => n.isInfected).length;
            const ratio = infectedCount / (this.numBases * 2);

            if (ratio > 0.0) {
                const glitchChance = 0.03 + ratio * 0.07;
                if (Math.random() < glitchChance) {
                    container.className = 'lab-glitched';
                } else if (Math.random() < 0.25) {
                    container.className = '';
                }
            } else {
                container.className = '';
            }
        } 
        else if (this.activeMode === 'DECAY') {
            if (this.decayProgress < 0.95) {
                const shakeChance = 0.15 + this.decayProgress * 0.4;
                if (Math.random() < shakeChance) {
                    container.className = 'lab-glitched-violent';
                } else if (Math.random() < 0.15) {
                    container.className = 'lab-glitched';
                } else {
                    container.className = '';
                }
            } else {
                container.className = 'lab-glitched'; 
            }
        } 
        else if (this.activeMode === 'RESONANCE_OVERLOAD') {
            const rt = this.resonanceTime;
            
            if (rt >= 2.0 && rt < 5.0) {
                if (Math.random() < 0.22) {
                    container.className = 'lab-glitched';
                } else {
                    container.className = '';
                }
            }
            else if (rt >= 5.0 && rt < 8.0) {
                // Violent shake + periodic strobe inversions
                if (Math.random() < 0.4) {
                    container.className = 'lab-glitched-violent';
                } else {
                    container.className = 'lab-glitched';
                }

                // Invert frame colors
                if (Math.random() < 0.1) {
                    container.style.filter = 'invert(1) hue-rotate(180deg)';
                } else {
                    container.style.filter = 'none';
                }
            }
            else if (rt >= 8.0) {
                container.className = 'lab-glitched-violent';
                container.style.filter = 'contrast(3) saturate(0) brightness(0.4)'; // dead static high contrast black & white
            }
            else {
                container.className = '';
                container.style.filter = 'none';
            }
        }
        else {
            container.className = '';
            container.style.filter = 'none';
        }
    },

    close: function () {
        if (window.SFX) window.SFX.triggerUIConfirm();

        if (this.overlay) {
            this.overlay.style.opacity = '0';
            setTimeout(() => {
                this.destroy();
            }, 400);
        } else {
            this.destroy();
        }
    },

    destroy: function () {
        // Cancel ThreeJS loops
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        // Clean up resize listener
        if (this.onResizeBound) {
            window.removeEventListener('resize', this.onResizeBound);
        }

        // Clean up wheel listener
        if (this.onDocWheel) {
            window.removeEventListener('wheel', this.onDocWheel);
        }

        // Remove attached spikes
        this.nodesA.forEach(n => {
            n.spikes.forEach(s => n.mesh.remove(s.mesh));
            n.spikes = [];
        });
        this.nodesB.forEach(n => {
            n.spikes.forEach(s => n.mesh.remove(s.mesh));
            n.spikes = [];
        });

        // Remove Evolved splinters
        this.splinters.forEach(s => {
            if (s.mesh) {
                if (s.mesh.geometry) s.mesh.geometry.dispose();
                if (s.mesh.material) s.mesh.material.dispose();
                this.dnaGroup.remove(s.mesh);
            }
        });
        this.splinters = [];

        // Dispose Three.js geometries/materials/textures from memory
        if (this.scene) {
            this.scene.traverse((obj) => {
                if (obj.geometry) obj.geometry.dispose();
                if (obj.material) {
                    if (Array.isArray(obj.material)) {
                        obj.material.forEach(m => m.dispose());
                    } else {
                        obj.material.dispose();
                    }
                }
            });
        }

        if (this.renderer) {
            this.renderer.dispose();
            if (this.renderer.domElement && this.renderer.domElement.parentNode) {
                this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
            }
        }

        // Remove DOM node
        if (this.overlay && this.overlay.parentNode) {
            this.overlay.parentNode.removeChild(this.overlay);
        }

        this.renderer = null;
        this.scene = null;
        this.camera = null;
        this.overlay = null;

        this.nodesA = [];
        this.nodesB = [];
        this.rungs = [];
        this.particulates = [];
        this.sparks = [];

        // Destroy Sub-engines
        if (window.LabDepth) window.LabDepth.destroy();
        if (window.LabTentacles) window.LabTentacles.destroy();
        if (window.LabBreach) window.LabBreach.destroy();
 
        // Return to Dossier Menu callback
        if (this.onClose) {
            this.onClose();
        }
    }
};

window.RotaryDNALab = RotaryDNALab;
