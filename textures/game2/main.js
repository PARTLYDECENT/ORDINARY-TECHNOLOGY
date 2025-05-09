// --- Global Variables ---
let scene, camera, renderer, gltfLoader;
let conveyorBelt;
let items = []; // Active items on the belt
let animatingOutItems = []; // For sort animation
let powerUps = []; // Active power-ups on the belt
let itemLabels = {}; // Dictionary to hold HTML label elements { mesh.uuid: labelElement }
let score = 0;
let gameSpeed = 0.02;
let baseGameSpeed = 0.02; // To reset after slow-mo
let spawnTimer = 0;
let timeBetweenSpawns = 180; // Frames
let baseTimeBetweenSpawns = 180;
let gameActive = false;
let messageTimeout;
let animationFrameId = null;
let lastTime = 0; // For deltaTime calculation

const modelScale = 1.2;
const placeholderSize = 1.4;
let assetsLoaded = false;

// Zoom settings
const MIN_FOV = 25;
const MAX_FOV = 75;
const ZOOM_SPEED = 2;

// Sort Animation settings
const SORT_ANIM_DURATION = 300; // ms
const SORT_ANIM_SCALE_UP = 1.5;
const SORT_ANIM_SCALE_DOWN = 0.1;

// Difficulty Increase Params
const SPEED_INCREASE = 0.0008;
const SPAWN_RATE_DECREASE = 2.5; // Frames
const MAX_SPEED = 0.06;
const MIN_SPAWN_TIME = 45; // Frames

// Power-up Settings
const POWERUP_SPAWN_CHANCE = 0.08; // 8% chance per spawn cycle
const POWERUP_DURATION = 8000; // ms (8 seconds)
let activePowerUp = null; // null, 'slowMo', 'doublePoints'
let powerUpEndTime = 0;
let isSlowMoActive = false;
let isDoublePointsActive = false;

// --- DOM Elements ---
const gameContainer = document.getElementById('game-container');
const canvas = document.getElementById('gameCanvas'); // <<< ENSURE THIS IS CORRECT
const scoreBoard = document.getElementById('score-board');
const messageBox = document.getElementById('message-box');
const paperButton = document.getElementById('paper-button');
const plasticButton = document.getElementById('plastic-button');
const glassButton = document.getElementById('glass-button');
const metalButton = document.getElementById('metal-button');
const startButton = document.getElementById('start-button');
const gameOverOverlay = document.getElementById('game-over-overlay');
const finalScoreDisplay = document.getElementById('final-score');
const restartButton = document.getElementById('restart-button');
const backgroundMusic = document.getElementById('background-music');
const itemLabelContainer = document.getElementById('item-label-container');
const powerUpTimerDisplay = document.getElementById('powerup-timer');

// --- Item Definitions ---
const itemTypes = {
    paper: { name: 'paper', modelPath: null, fallbackShape: 'box', color: 0x3498db },
    plastic: { name: 'plastic', modelPath: 'assets/models/plastic.glb', fallbackShape: 'sphere', color: 0xe67e22 },
    glass: { name: 'glass', modelPath: 'assets/models/glass.glb', fallbackShape: 'cylinder', color: 0x2ecc71 },
    metal: { name: 'metal', modelPath: 'assets/models/metal.glb', fallbackShape: 'cone', color: 0x95a5a6 }
};
const itemTypeList = Object.values(itemTypes);

// --- Power-up Definitions ---
const powerUpTypes = {
    slowMo: { name: 'Slow Mo!', color: 0x8e44ad, effect: () => activateSlowMo() }, // Purple
    doublePoints: { name: '2x Points!', color: 0xf1c40f, effect: () => activateDoublePoints() } // Yellow
};
const powerUpTypeList = Object.values(powerUpTypes);


// --- Initialization ---
function init() {
    console.log("Initializing game..."); // <<< DEBUG
    scene = new THREE.Scene();
    setupBackground();
    setupCamera();
    setupRenderer();
    setupLighting();
    setupConveyorBelt();
    setupEnvironment(conveyorBelt.geometry.parameters.width, conveyorBelt.geometry.parameters.depth);

    gltfLoader = new THREE.GLTFLoader();

    // Initialize Weather Effects
    if (typeof initRain === 'function' && typeof initLightning === 'function') {
        console.log("Initializing weather effects...");
        try {
            initRain(scene);
            initLightning(scene);
        } catch (error) {
             console.error("Error initializing weather effects:", error);
             showMessage("Weather effects failed.", "#ff0000", 5000);
        }
    } else {
        console.warn("Weather effect init functions not found.");
        showMessage("Weather effects unavailable.", "#ffcc00", 3000);
    }

    addEventListeners();
    showMessage("Loading Assets...", "#f39c12");
    disableButtons();
    animate(); // Start animation loop
}

// --- Setup Helpers ---

function setupCamera() {
    const aspect = gameContainer.clientWidth / gameContainer.clientHeight;
    camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
    camera.position.set(0, 8, 14);
    camera.lookAt(0, 1, 0);
    console.log("Camera setup complete."); // <<< DEBUG
}

function setupRenderer() {
    if (!canvas) { // <<< DEBUG: Check if canvas exists
        console.error("CRITICAL: Canvas element with ID 'gameCanvas' not found!");
        showMessage("ERROR: Game canvas not found!", "#ff0000");
        return;
    }
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    renderer.setSize(gameContainer.clientWidth, gameContainer.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.outputEncoding = THREE.sRGBEncoding;
    console.log("Renderer setup complete."); // <<< DEBUG
}

function setupConveyorBelt() {
    const beltWidth = 5.5, beltDepth = 18, beltHeight = 0.2;
    const beltGeometry = new THREE.BoxGeometry(beltWidth, beltHeight, beltDepth);
    const beltMaterial = new THREE.MeshStandardMaterial({ color: 0xff8c00, roughness: 0.8, metalness: 0.1 });
    conveyorBelt = new THREE.Mesh(beltGeometry, beltMaterial);
    conveyorBelt.position.y = -0.1;
    conveyorBelt.receiveShadow = true;
    scene.add(conveyorBelt);
    console.log("Conveyor belt setup complete."); // <<< DEBUG
}

function setupBackground() {
    const loader = new THREE.CubeTextureLoader();
    const path = 'assets/textures/skybox/';
    const urls = [
        path + 'px.jpg', path + 'nx.jpg',
        path + 'py.jpg', path + 'ny.jpg',
        path + 'pz.jpg', path + 'nz.jpg'
    ];
    loader.load(urls,
    (texture) => {
        scene.background = texture;
        if(renderer) renderer.render(scene, camera); // Render once background loads
        assetsReady();
        console.log("Skybox loaded successfully."); // <<< DEBUG
    },
    undefined,
    (err) => {
        console.error('Local skybox texture loading failed:', err);
        console.warn('Ensure skybox images exist in: ' + path);
        scene.background = new THREE.Color(0x4d3319); // Dark orange fallback
        if(renderer) renderer.render(scene, camera);
        assetsReady("#f39c12", " (No Skybox)");
    });
    // Set fallback immediately in case loading takes time
    scene.background = new THREE.Color(0x4d3319);
}

function setupLighting() {
    const ambientLight = new THREE.AmbientLight(0x604030, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffd8b8, 0.6);
    directionalLight.position.set(8, 15, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -15;
    directionalLight.shadow.camera.right = 15;
    directionalLight.shadow.camera.top = 15;
    directionalLight.shadow.camera.bottom = -15;
    scene.add(directionalLight);

    const hemisphereLight = new THREE.HemisphereLight(0x775533, 0x332211, 0.4);
    scene.add(hemisphereLight);
    console.log("Lighting setup complete."); // <<< DEBUG
}

function setupEnvironment(beltWidth, beltDepth) {
    const railingHeight = 0.5, railingThickness = 0.1;
    const railingY = conveyorBelt.position.y + conveyorBelt.geometry.parameters.height / 2 + railingHeight / 2;
    const railingOffset = beltWidth / 2 + railingThickness / 2;
    const railingGeo = new THREE.BoxGeometry(railingThickness, railingHeight, beltDepth);
    const railingMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.4, metalness: 0.8 });
    const leftRailing = new THREE.Mesh(railingGeo, railingMat);
    leftRailing.position.set(-railingOffset, railingY, 0);
    leftRailing.castShadow = true; scene.add(leftRailing);
    const rightRailing = new THREE.Mesh(railingGeo, railingMat);
    rightRailing.position.set(railingOffset, railingY, 0);
    rightRailing.castShadow = true; scene.add(rightRailing);

    const binSize = 2.0, binY = binSize / 2 - 0.2, binZ = beltDepth / 2 + binSize * 0.7, binSpacing = 3.0;
    const binsData = [
        { type: itemTypes.paper, xOffset: -binSpacing * 1.5 }, { type: itemTypes.plastic, xOffset: -binSpacing * 0.5 },
        { type: itemTypes.glass, xOffset: binSpacing * 0.5 }, { type: itemTypes.metal, xOffset: binSpacing * 1.5 }
    ];
    binsData.forEach(b => scene.add(createBin(b.type.color, b.xOffset, binY, binZ, binSize)));
    console.log("Environment (railings, bins) setup complete."); // <<< DEBUG
}

function createBin(color, x, y, z, size) {
    const binGeo = new THREE.BoxGeometry(size, size, size);
    const binMat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.7 });
    const bin = new THREE.Mesh(binGeo, binMat);
    bin.position.set(x, y, z);
    bin.receiveShadow = true;
    return bin;
}

function assetsReady(color = "#27ae60", messageSuffix = "") {
     if (!gameActive) showMessage(`Assets Ready${messageSuffix}! Press Start.`, color);
     enableButtons();
     assetsLoaded = true;
     startButton.disabled = false; // Enable start button specifically when assets are ready
     console.log("Assets ready, start button enabled."); // <<< DEBUG
}


// --- Event Listeners ---
function addEventListeners() {
    console.log("Adding event listeners..."); // <<< DEBUG

    // Sorting Buttons (Click)
    paperButton.addEventListener('click', () => handleSort('paper'));
    plasticButton.addEventListener('click', () => handleSort('plastic'));
    glassButton.addEventListener('click', () => handleSort('glass'));
    metalButton.addEventListener('click', () => handleSort('metal'));

    // Sorting Buttons (Touch)
    paperButton.addEventListener('touchstart', (e) => { e.preventDefault(); handleSort('paper'); }, { passive: false });
    plasticButton.addEventListener('touchstart', (e) => { e.preventDefault(); handleSort('plastic'); }, { passive: false });
    glassButton.addEventListener('touchstart', (e) => { e.preventDefault(); handleSort('glass'); }, { passive: false });
    metalButton.addEventListener('touchstart', (e) => { e.preventDefault(); handleSort('metal'); }, { passive: false });

    // Game State Buttons
    startButton.addEventListener('click', startGame);
    restartButton.addEventListener('click', resetGame);

    // Window Resize
    window.addEventListener('resize', onWindowResize, false);

    // Camera Zoom
    gameContainer.addEventListener('wheel', handleZoom, { passive: false });

    // --- Power-up Click/Touch Listener ---
    if (canvas) { // <<< DEBUG: Only add if canvas exists
        canvas.addEventListener('click', handleCanvasClick);
        canvas.addEventListener('touchstart', handleCanvasClick, { passive: false }); // Use the same handler
        console.log("Canvas click/touch listeners added."); // <<< DEBUG
    } else {
        console.error("Could not add canvas listeners because canvas was not found!"); // <<< DEBUG
    }
}

function handleZoom(event) {
    event.preventDefault();
    const delta = event.deltaY;
    if (delta < 0) { camera.fov = Math.max(MIN_FOV, camera.fov - ZOOM_SPEED); }
    else { camera.fov = Math.min(MAX_FOV, camera.fov + ZOOM_SPEED); }
    camera.updateProjectionMatrix();
}

// <<< REVISED Power-up Click Handler >>>
function handleCanvasClick(event) {
    console.log(`Canvas ${event.type} event detected.`); // <<< DEBUG (Logs 'click' or 'touchstart')

    if (!gameActive) {
        console.log("Canvas click ignored: Game not active."); // <<< DEBUG
        return;
    }
    if (powerUps.length === 0) {
        console.log("Canvas click ignored: No power-ups currently on belt."); // <<< DEBUG
        return;
    }

    const rect = canvas.getBoundingClientRect();
    const mouse = new THREE.Vector2(); // Use 'mouse' for both click and touch coordinates

    let clientX, clientY;
    if (event.type === 'touchstart') {
        if (event.touches.length === 0) return; // Should not happen but safeguard
        clientX = event.touches[0].clientX;
        clientY = event.touches[0].clientY;
        console.log(`Touch coordinates: X=${clientX}, Y=${clientY}`); // <<< DEBUG
        event.preventDefault(); // Prevent default touch actions like scrolling/zooming
    } else { // 'click' event
        clientX = event.clientX;
        clientY = event.clientY;
        console.log(`Click coordinates: X=${clientX}, Y=${clientY}`); // <<< DEBUG
    }

    // Calculate normalized device coordinates (-1 to +1)
    mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    console.log(`Normalized coordinates: X=${mouse.x.toFixed(3)}, Y=${mouse.y.toFixed(3)}`); // <<< DEBUG

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);

    // Get the actual mesh objects from the powerUps array
    const powerUpMeshes = powerUps.map(p => p.mesh).filter(mesh => mesh); // Filter out any null/undefined meshes
    console.log(`Checking for intersections against ${powerUpMeshes.length} power-up meshes.`); // <<< DEBUG
    if(powerUpMeshes.length === 0 && powerUps.length > 0) {
        console.warn("PowerUps array contains entries without valid meshes!", powerUps); // <<< DEBUG
    }

    // Perform the intersection test
    const intersects = raycaster.intersectObjects(powerUpMeshes); // Pass the array of meshes

    console.log(`Raycaster found ${intersects.length} intersections.`); // <<< DEBUG

    if (intersects.length > 0) {
        // Find the *closest* intersected object
        const clickedMesh = intersects[0].object;
        console.log("Closest intersected object UUID:", clickedMesh.uuid); // <<< DEBUG

        // Find the corresponding power-up data in our original array
        const powerUpIndex = powerUps.findIndex(p => p.mesh && p.mesh.uuid === clickedMesh.uuid); // <<< CHANGE: Added check for p.mesh

        if (powerUpIndex > -1) {
            const powerUpData = powerUps[powerUpIndex];
            console.log(`Found matching power-up data at index ${powerUpIndex}:`, powerUpData); // <<< DEBUG
            activatePowerUp(powerUpData, powerUpIndex); // Activate it!
        } else {
            console.warn("Intersection found, but couldn't find matching power-up data in the array for UUID:", clickedMesh.uuid); // <<< DEBUG
            console.log("Current powerUps array:", powerUps); // <<< DEBUG
        }
    } else {
        console.log("Click/touch did not intersect any power-up meshes."); // <<< DEBUG
    }
}


// --- UI Button State ---
function enableButtons() {
    paperButton.disabled = false;
    plasticButton.disabled = false;
    glassButton.disabled = false;
    metalButton.disabled = false;
}
function disableButtons() {
    paperButton.disabled = true;
    plasticButton.disabled = true;
    glassButton.disabled = true;
    metalButton.disabled = true;
    startButton.disabled = true; // Keep start disabled by default
}


// --- Game State Management ---
function startGame() {
    if (gameActive || !assetsLoaded) {
        console.log(`Start game ignored: gameActive=${gameActive}, assetsLoaded=${assetsLoaded}`); // <<< DEBUG
        return;
    }
    console.log("Starting game..."); // <<< DEBUG
    resetGameState();
    gameActive = true;
    gameOverOverlay.style.display = 'none';
    startButton.style.display = 'none';
    enableButtons(); // Enable sorting buttons
    startButton.disabled = true; // Keep start disabled during gameplay

    if (backgroundMusic) {
        backgroundMusic.currentTime = 0;
        backgroundMusic.play().catch(error => {
            console.error("Audio play failed:", error);
            // Suggest interaction to enable audio
            document.body.addEventListener('click', () => {
                 if(backgroundMusic.paused) backgroundMusic.play().catch(e => console.error("Second audio play attempt failed:", e));
            }, { once: true });
            showMessage("Click screen to enable sound?", "#f39c12", 3000);
        });
    }
    showMessage("Game Started!", "#2ecc71", 1500);
    if (!animationFrameId) { // Restart animation loop if stopped
        console.log("Restarting animation loop from startGame."); // <<< DEBUG
        animate();
    }
}

function resetGame() {
    console.log("Resetting game..."); // <<< DEBUG
    gameActive = false;
    if (animationFrameId) { // Stop the loop if resetting completely
       // cancelAnimationFrame(animationFrameId); // <<< Consider stopping loop if needed
       // animationFrameId = null;
    }
    if (backgroundMusic) {
        backgroundMusic.pause();
        backgroundMusic.currentTime = 0;
    }
    resetGameState();
    gameOverOverlay.style.display = 'none';
    startButton.style.display = 'block'; // Show start button
    if (assetsLoaded) {
         showMessage("Press Start!", "#cccccc");
         startButton.disabled = false; // Re-enable start button
    } else {
         showMessage("Loading Assets...", "#f39c12");
         disableButtons(); // Keep all disabled if assets not loaded
    }
    // Deactivate any lingering power-ups visually and logically
    deactivatePowerUp();
    // Restart animation loop if it was stopped
    if (!animationFrameId) {
        console.log("Restarting animation loop from resetGame."); // <<< DEBUG
        animate();
    }
}

function resetGameState() {
    console.log("Resetting game state variables..."); // <<< DEBUG
    // Clear Items
    items.forEach(itemData => {
        if (itemData?.mesh) {
            removeLabelForItem(itemData.mesh);
            scene.remove(itemData.mesh);
        }
    });
    items = [];

    // Clear PowerUps
    powerUps.forEach(powerUpData => {
         if (powerUpData?.mesh) {
             removeLabelForItem(powerUpData.mesh); // Reuse label removal
             scene.remove(powerUpData.mesh);
         }
    });
    powerUps = [];
    console.log("Cleared items and powerups arrays and removed from scene."); // <<< DEBUG

    // Clear animating items
    animatingOutItems.forEach(itemData => { if (itemData?.mesh) scene.remove(itemData.mesh); });
    animatingOutItems = [];

    // Clear all labels from DOM
    clearAllLabels();

    // Reset game variables
    score = 0;
    gameSpeed = baseGameSpeed; // Use base speed
    timeBetweenSpawns = baseTimeBetweenSpawns;
    spawnTimer = timeBetweenSpawns; // Ready to spawn immediately? Maybe set to 0? Let's keep as is for now.
    updateScoreBoard();
    disableButtons(); // Disable sorting buttons until game starts
    deactivatePowerUp(); // Ensure no power-up is active
    console.log("Game state variables reset."); // <<< DEBUG
}

function gameOver() {
    if (!gameActive) return; // Prevent multiple calls
    console.log("Game Over triggered!"); // <<< DEBUG
    gameActive = false;
    if (backgroundMusic) backgroundMusic.pause();
    finalScoreDisplay.textContent = `Your Score: ${score}`;
    gameOverOverlay.style.display = 'flex';
    showMessage("Game Over!", "#e74c3c");
    disableButtons();
    startButton.disabled = true; // Keep start disabled
    deactivatePowerUp(); // Ensure power-ups end on game over
    // Maybe stop animation loop on game over?
    // if (animationFrameId) {
    //     cancelAnimationFrame(animationFrameId);
    //     animationFrameId = null;
    //     console.log("Animation loop stopped on game over."); // <<< DEBUG
    // }
}


// --- Item & Power-up Spawning ---
function spawn() {
    // Decide whether to spawn an item or a power-up
    if (Math.random() < POWERUP_SPAWN_CHANCE) {
        spawnPowerUp();
    } else {
        spawnItem();
    }
}

function spawnItem() {
    const itemTypeDefinition = itemTypeList[Math.floor(Math.random() * itemTypeList.length)];
    const spawnPos = calculateSpawnPosition();
    console.log(`Attempting to spawn item: ${itemTypeDefinition.name}`); // <<< DEBUG

    const createPlaceholder = (typeDef) => {
        console.log(`Creating placeholder for ${typeDef.name}`); // <<< DEBUG
        let itemGeometry; const size = placeholderSize;
        switch (typeDef.fallbackShape) {
            case 'box': itemGeometry = new THREE.BoxGeometry(size, size, size); break;
            case 'sphere': itemGeometry = new THREE.SphereGeometry(size / 2, 16, 16); break;
            case 'cylinder': itemGeometry = new THREE.CylinderGeometry(size / 2, size / 2, size, 16); break;
            case 'cone': itemGeometry = new THREE.ConeGeometry(size / 2, size, 16); break;
            default: itemGeometry = new THREE.BoxGeometry(size, size, size);
        }
        const itemMaterial = new THREE.MeshStandardMaterial({ color: typeDef.color, roughness: 0.6 });
        const itemMesh = new THREE.Mesh(itemGeometry, itemMaterial);
        itemMesh.position.set(spawnPos.x, spawnPos.y, spawnPos.z);
        itemMesh.castShadow = true;
        itemMesh.userData = { type: typeDef.name, baseScale: new THREE.Vector3(1, 1, 1), isPowerUp: false };
        scene.add(itemMesh);
        items.push({ mesh: itemMesh, type: typeDef.name });
        createLabelForItem(itemMesh, typeDef.name);
        console.log(`Placeholder ${typeDef.name} added to scene and items array.`); // <<< DEBUG
    };

    if (itemTypeDefinition.modelPath && gltfLoader) {
        console.log(`Loading model for ${itemTypeDefinition.name} from ${itemTypeDefinition.modelPath}`); // <<< DEBUG
        gltfLoader.load(itemTypeDefinition.modelPath, (gltf) => {
            if (!gameActive) { // Check if game ended while loading
                 console.log(`Model loaded for ${itemTypeDefinition.name}, but game is no longer active. Discarding.`); // <<< DEBUG
                 return;
            }
            console.log(`Model loaded successfully for ${itemTypeDefinition.name}`); // <<< DEBUG
            const model = gltf.scene;
            model.traverse((node) => { if (node.isMesh) node.castShadow = true; });
            model.scale.set(modelScale, modelScale, modelScale);
            const baseScale = new THREE.Vector3(modelScale, modelScale, modelScale);
            const box = new THREE.Box3().setFromObject(model);
            const size = box.getSize(new THREE.Vector3());
            model.position.set(spawnPos.x, size.y / 2, spawnPos.z); // Position based on size
            model.userData = { type: itemTypeDefinition.name, baseScale: baseScale, isPowerUp: false };
            scene.add(model);
            items.push({ mesh: model, type: itemTypeDefinition.name });
            createLabelForItem(model, itemTypeDefinition.name);
            console.log(`Model ${itemTypeDefinition.name} added to scene and items array.`); // <<< DEBUG
        }, undefined, (error) => {
            console.error(`Model load failed ${itemTypeDefinition.modelPath}:`, error);
            if (gameActive) createPlaceholder(itemTypeDefinition); // Fallback if loading failed
        });
    } else {
        createPlaceholder(itemTypeDefinition); // Use placeholder if no model path
    }
}

function spawnPowerUp() {
    const powerUpType = powerUpTypeList[Math.floor(Math.random() * powerUpTypeList.length)];
    const spawnPos = calculateSpawnPosition();
    const size = placeholderSize * 0.8; // Slightly smaller

    console.log(`Attempting to spawn power-up: ${powerUpType.name}`); // <<< DEBUG

    // Simple flashing sphere for power-up
    const geometry = new THREE.SphereGeometry(size / 1.5, 16, 16);
    const material = new THREE.MeshPhongMaterial({
        color: powerUpType.color,
        emissive: powerUpType.color, // Make it glow slightly
        emissiveIntensity: 0.5,
        shininess: 100
    });
    const powerUpMesh = new THREE.Mesh(geometry, material);
    powerUpMesh.position.set(spawnPos.x, spawnPos.y, spawnPos.z);
    powerUpMesh.castShadow = true;
    // <<< CHANGE: Store the type name directly in userData for easier access later
    powerUpMesh.userData = {
        type: powerUpType.name, // Store the name e.g., 'Slow Mo!'
        baseScale: new THREE.Vector3(1, 1, 1),
        isPowerUp: true
        // We don't strictly need the effect function here if we look it up later
    };

    scene.add(powerUpMesh);
    // <<< CHANGE: Store the definition object, not just name/effect
    powerUps.push({ mesh: powerUpMesh, definition: powerUpType }); // Store the whole definition
    createLabelForItem(powerUpMesh, powerUpType.name, true); // Add label (mark as powerup)
    console.log(`Power-up ${powerUpType.name} (UUID: ${powerUpMesh.uuid}) added to scene and powerUps array.`); // <<< DEBUG
    console.log("Current powerUps array:", powerUps); // <<< DEBUG
}

function calculateSpawnPosition() {
    const spawnXVariance = conveyorBelt.geometry.parameters.width / 2 - placeholderSize * 0.7;
    const spawnX = (Math.random() - 0.5) * 2 * spawnXVariance;
    const spawnY = placeholderSize * 0.7; // Base height
    const spawnZ = -conveyorBelt.geometry.parameters.depth / 2 + placeholderSize; // Start at back
    return { x: spawnX, y: spawnY, z: spawnZ };
}

// --- Movement & Updates ---
function moveObjects() {
    if (!gameActive) return;

    const beltEndZ = conveyorBelt.geometry.parameters.depth / 2;
    const removalThreshold = beltEndZ + placeholderSize * 1.5; // Item missed threshold
    const powerUpRemovalThreshold = beltEndZ + placeholderSize; // Power-up missed threshold

    // --- Move Regular Items ---
    for (let i = items.length - 1; i >= 0; i--) {
        const itemData = items[i];
        if (!itemData?.mesh) {
            console.warn("Found item entry without mesh, removing:", items[i]); // <<< DEBUG
            items.splice(i, 1);
            continue;
        }

        itemData.mesh.position.z += gameSpeed; // Use current gameSpeed
        applySway(itemData.mesh);

        if (itemData.mesh.position.z > removalThreshold) {
            console.log(`Item ${itemData.type} missed (passed removal threshold). Game Over.`); // <<< DEBUG
            removeLabelForItem(itemData.mesh);
            scene.remove(itemData.mesh);
            items.splice(i, 1);
            gameOver(); // <<< Calls game over
            return; // Exit immediately on game over
        }
    }

    // --- Move Power-ups ---
    for (let i = powerUps.length - 1; i >= 0; i--) {
        const powerUpData = powerUps[i];
        if (!powerUpData?.mesh) {
            console.warn("Found powerUp entry without mesh, removing:", powerUps[i]); // <<< DEBUG
            powerUps.splice(i, 1);
            continue;
        }

        powerUpData.mesh.position.z += gameSpeed; // Also affected by slow-mo
        applySway(powerUpData.mesh, 0.03); // Slightly different sway

        // Animate power-up (e.g., pulsing emissive intensity)
        const pulse = Math.sin(performance.now() * 0.005) * 0.3 + 0.7; // Oscillate between 0.7 and 1.0
        if(powerUpData.mesh.material.emissiveIntensity !== undefined) { // <<< CHANGE: Check property exists
             powerUpData.mesh.material.emissiveIntensity = pulse;
        }

        if (powerUpData.mesh.position.z > powerUpRemovalThreshold) {
            // Missed power-up just disappears, no game over
            console.log(`Power-up ${powerUpData.definition.name} missed (passed removal threshold). Removing.`); // <<< DEBUG
            removeLabelForItem(powerUpData.mesh);
            scene.remove(powerUpData.mesh);
            powerUps.splice(i, 1);
            console.log("Current powerUps array after miss:", powerUps); // <<< DEBUG
        }
    }
}

function applySway(mesh, swayAmplitudeY = 0.015, swayAmplitudeX = 0.008) {
    const swayFrequency = 0.5;
    const swayFactor = Math.sin(mesh.position.z * swayFrequency);
    mesh.rotation.y = swayFactor * swayAmplitudeY; // Yaw
    mesh.rotation.x = swayFactor * swayAmplitudeX; // Pitch
}

function updatePowerUps(currentTime) {
    // Check for expiry
    if (activePowerUp && currentTime > powerUpEndTime) {
        console.log(`Power-up ${activePowerUp} expired.`); // <<< DEBUG
        deactivatePowerUp();
    }

    // Update Timer Display
    if (activePowerUp) {
        const timeLeft = Math.max(0, Math.ceil((powerUpEndTime - currentTime) / 1000));
        powerUpTimerDisplay.textContent = `${activePowerUp}: ${timeLeft}s`; // Use the stored name
        powerUpTimerDisplay.style.opacity = 1;
        // Change color based on time left
        if (timeLeft <= 3) {
             powerUpTimerDisplay.style.color = '#e74c3c'; // Red when about to expire
        } else {
             // <<< CHANGE: Use the color from the power-up definition if available
             const activePowerUpDef = Object.values(powerUpTypes).find(p => p.name === activePowerUp);
             powerUpTimerDisplay.style.color = activePowerUpDef ? activePowerUpDef.color.toString(16).padStart(6,'0') : '#f1c40f'; // Fallback gold
        }

    } else {
        // Hide timer if no power-up active and opacity is not already 0
        if (parseFloat(powerUpTimerDisplay.style.opacity || 0) > 0) {
            powerUpTimerDisplay.style.opacity = 0;
        }
    }
}

// --- Sorting & Power-up Activation ---
function handleSort(binType) {
    if (!gameActive || items.length === 0) return;

    let itemToSort = null;
    let itemIndex = -1;
    let maxZ = -Infinity;

    // Define the zone where items can be sorted (near the end of the belt)
    const sortZoneStartZ = conveyorBelt.geometry.parameters.depth / 2 - 5; // Start 5 units before end
    const sortZoneEndZ = conveyorBelt.geometry.parameters.depth / 2 + 1.5; // Allow slightly past the visual end

    // Find the item closest to the end within the sort zone
    for (let i = 0; i < items.length; i++) {
        const itemData = items[i];
        if (!itemData?.mesh) continue;
        const itemZ = itemData.mesh.position.z;
        // Check if item is within the sortable Z range AND is the furthest along
        if (itemZ > sortZoneStartZ && itemZ < sortZoneEndZ && itemZ > maxZ) {
            maxZ = itemZ;
            itemToSort = itemData;
            itemIndex = i;
        }
    }

    if (itemToSort) {
        console.log(`Attempting to sort item: ${itemToSort.type} with button: ${binType}`); // <<< DEBUG
        const correctSort = itemToSort.type === binType;
        items.splice(itemIndex, 1); // Remove from active items immediately
        removeLabelForItem(itemToSort.mesh); // Remove Label

        if (correctSort) {
            const pointsToAdd = isDoublePointsActive ? 2 : 1;
            score += pointsToAdd;
            showMessage(`Correct! +${pointsToAdd}`, "#2ecc71", 800);
            console.log(`Correct sort. Score: ${score}. Points added: ${pointsToAdd}`); // <<< DEBUG

            // Increase difficulty (only if not in slow-mo)
            if (!isSlowMoActive) {
                 const oldSpeed = gameSpeed;
                 const oldSpawnTime = timeBetweenSpawns;
                 gameSpeed = Math.min(MAX_SPEED, gameSpeed + SPEED_INCREASE);
                 timeBetweenSpawns = Math.max(MIN_SPAWN_TIME, timeBetweenSpawns - SPAWN_RATE_DECREASE);
                 if(gameSpeed !== oldSpeed || timeBetweenSpawns !== oldSpawnTime) {
                    console.log(`Difficulty increased: Speed=${gameSpeed.toFixed(4)}, SpawnTime=${timeBetweenSpawns.toFixed(1)}`); // <<< DEBUG
                 }
            }

            // Start Sort Animation
            itemToSort.isAnimatingOut = true;
            itemToSort.animationStartTime = performance.now();
            // Ensure baseScale is correctly captured
            itemToSort.baseScale = itemToSort.mesh.userData.baseScale?.clone() ?? itemToSort.mesh.scale.clone();
            if (!itemToSort.mesh.userData.baseScale) console.warn("Used fallback baseScale for sort animation");
            animatingOutItems.push(itemToSort);

        } else { // Incorrect sort
            score = Math.max(0, score - 2); // Penalize
            showMessage(`Wrong! Was ${itemToSort.type}.`, "#e74c3c", 1500);
            console.log(`Incorrect sort. Score: ${score}. Item was ${itemToSort.type}`); // <<< DEBUG
            scene.remove(itemToSort.mesh); // Remove mesh immediately if wrong
        }
        updateScoreBoard();
    } else {
         console.log(`Sort button ${binType} pressed, but no item found in the sort zone.`); // <<< DEBUG
    }
}

// <<< REVISED Power-up Activation >>>
function activatePowerUp(powerUpData, index) {
    console.log(`Activating power-up: ${powerUpData.definition.name}`); // <<< DEBUG

    // Deactivate any existing power-up first
    if (activePowerUp) {
        console.log(`Deactivating previous power-up: ${activePowerUp} before activating new one.`); // <<< DEBUG
        deactivatePowerUp();
    }

    // Remove the power-up mesh from the scene and the data from the array
    if (powerUpData.mesh) {
        removeLabelForItem(powerUpData.mesh);
        scene.remove(powerUpData.mesh);
    } else {
        console.warn("Tried to activate power-up but its mesh was already gone?"); // <<< DEBUG
    }
    powerUps.splice(index, 1); // Remove from the array
    console.log("Removed power-up mesh from scene and data from array. Remaining powerUps:", powerUps); // <<< DEBUG

    // Activate the new one
    activePowerUp = powerUpData.definition.name; // Store the name ('Slow Mo!', '2x Points!')
    powerUpEndTime = performance.now() + POWERUP_DURATION;

    // Call the effect function from the definition
    if (typeof powerUpData.definition.effect === 'function') {
        powerUpData.definition.effect();
    } else {
        console.error(`Power-up ${activePowerUp} has no valid effect function!`); // <<< DEBUG
    }

    // Show message using the power-up's color
    const colorStyle = `#${powerUpData.definition.color.toString(16).padStart(6, '0')}`;
    showMessage(`${activePowerUp} Activated!`, colorStyle, 2000);
    console.log(`Power-up ${activePowerUp} is now active until ${new Date(powerUpEndTime).toLocaleTimeString()}`); // <<< DEBUG
}

function activateSlowMo() {
    if (isSlowMoActive) return; // Prevent stacking
    isSlowMoActive = true;
    // Store the speed *before* slow-mo is applied
    // baseGameSpeed = gameSpeed; // <<< Let's NOT change baseGameSpeed, store pre-slow speed differently
    // Instead, just calculate the slow speed based on the *current* speed
    gameSpeed = gameSpeed * 0.5; // Half the current speed
    console.log(`Slow Mo Activated! Game speed reduced to ${gameSpeed.toFixed(4)}`); // <<< DEBUG
    // Keep current spawn rate, don't make it faster during slow-mo
}

function activateDoublePoints() {
    if (isDoublePointsActive) return;
    isDoublePointsActive = true;
    console.log("Double Points Activated!"); // <<< DEBUG
    // No change to game speed or spawn rate needed
}

function deactivatePowerUp() {
    if (!activePowerUp) return; // Nothing to deactivate

    console.log(`Deactivating power-up: ${activePowerUp}`); // <<< DEBUG

    if (isSlowMoActive) {
        isSlowMoActive = false;
        // Restore game speed: Double the current (slowed) speed to get back
        gameSpeed = gameSpeed * 2;
        // Ensure speed doesn't exceed the maximum limit after restoring
        gameSpeed = Math.min(gameSpeed, MAX_SPEED);
        console.log(`Slow Mo Deactivated. Game speed restored to ${gameSpeed.toFixed(4)}`); // <<< DEBUG
    }
    if (isDoublePointsActive) {
        isDoublePointsActive = false;
        console.log("Double Points Deactivated."); // <<< DEBUG
    }

    // Clear the active power-up state
    const deactivatedPowerUpName = activePowerUp; // Store name for message
    activePowerUp = null;
    powerUpEndTime = 0;

    // Hide timer display smoothly
    powerUpTimerDisplay.style.transition = 'opacity 0.3s ease'; // Add transition for hiding
    powerUpTimerDisplay.style.opacity = 0;

    // Show expiration message only if the game is still active
    if (gameActive) {
        showMessage(`${deactivatedPowerUpName} Expired.`, "#aaaaaa", 1500);
    }
}


// --- Item Labels (HTML Overlay Method) ---

function createLabelForItem(mesh, text, isPowerUp = false) {
    if (!itemLabelContainer) {
        console.error("item-label-container div not found in HTML!");
        return;
    }
    const labelDiv = document.createElement('div');
    labelDiv.className = 'item-label' + (isPowerUp ? ' powerup-label' : ''); // Add specific class for powerups
    labelDiv.textContent = text;
    labelDiv.style.opacity = '0'; // Start hidden
    labelDiv.style.transform = 'translate(-50%, -100%) scale(0)'; // Start scaled down
    itemLabelContainer.appendChild(labelDiv);
    itemLabels[mesh.uuid] = labelDiv; // Store label reference by mesh UUID
    // console.log(`Created label for mesh ${mesh.uuid}: "${text}"`); // <<< DEBUG (Can be noisy)
}

function updateLabels() {
    if (!itemLabelContainer || !camera || !renderer) return; // Need camera and renderer

    const objectsToLabel = [...items, ...powerUps]; // Combine items and powerups
    const currentLabelUUIDs = new Set(Object.keys(itemLabels));
    const objectsOnScreenUUIDs = new Set(objectsToLabel.map(obj => obj.mesh?.uuid).filter(uuid => uuid));

    // Update existing/visible labels
    objectsToLabel.forEach(objData => {
        if (!objData?.mesh) return;
        const mesh = objData.mesh;
        const uuid = mesh.uuid;

        if (itemLabels[uuid]) { // Check if label exists for this mesh
            const label = itemLabels[uuid];
            const labelPos = calculateLabelPosition(mesh);

            if (labelPos.visible) {
                // Update position smoothly only if significantly changed? Maybe not necessary.
                label.style.left = `${labelPos.x}px`;
                label.style.top = `${labelPos.y}px`;
                // Make visible if not already
                if (label.style.opacity !== '1') {
                    label.style.opacity = '1';
                    label.style.transform = `translate(-50%, -100%) scale(1)`;
                }
            } else {
                // Hide if off-screen and not already hidden
                if (label.style.opacity !== '0') {
                    label.style.opacity = '0';
                    label.style.transform = `translate(-50%, -100%) scale(0)`;
                }
            }
        } else {
             // This case should ideally not happen if labels are created correctly
             // console.warn(`Mesh ${uuid} exists but has no corresponding label.`);
        }
    });

    // Remove labels for objects that no longer exist
    currentLabelUUIDs.forEach(uuid => {
        if (!objectsOnScreenUUIDs.has(uuid)) {
            removeLabelForItemUUID(uuid); // Use a function that just takes UUID
        }
    });
}


function calculateLabelPosition(mesh) {
    const vector = new THREE.Vector3();
    const canvasElement = renderer.domElement; // Use the actual canvas element

    // Get the mesh's world position
    // Offset slightly upwards from the mesh center/top
    const boundingBox = new THREE.Box3().setFromObject(mesh); // Recalculate bounds if needed
    const sizeY = boundingBox.max.y - boundingBox.min.y;
    vector.setFromMatrixPosition(mesh.matrixWorld);
    vector.y += sizeY * 0.6; // Adjust this offset as needed (relative to mesh height)

    // Project world position to 2D screen coordinates
    vector.project(camera);

    // Convert normalized device coordinates (-1 to +1) to CSS pixels relative to the canvas
    const x = (vector.x * 0.5 + 0.5) * canvasElement.clientWidth;
    const y = (vector.y * -0.5 + 0.5) * canvasElement.clientHeight;

    // Check if the label is behind the camera or too far left/right/top/bottom
    const visible = vector.z < 1 && x > -50 && x < canvasElement.clientWidth + 50 && y > -50 && y < canvasElement.clientHeight + 50; // Add buffer

    return { x: x, y: y, visible: visible };
}

// Helper to remove label just by UUID
function removeLabelForItemUUID(uuid) {
    if (itemLabels[uuid]) {
        removeLabelElement(itemLabels[uuid], uuid);
    }
}

function removeLabelForItem(mesh) {
    if (mesh && itemLabels[mesh.uuid]) {
        // console.log(`Removing label for mesh ${mesh.uuid}`); // <<< DEBUG (Can be noisy)
        removeLabelElement(itemLabels[mesh.uuid], mesh.uuid);
    }
}

function removeLabelElement(labelElement, uuid) {
     if (labelElement && labelElement.parentNode) {
        labelElement.parentNode.removeChild(labelElement);
    }
    delete itemLabels[uuid]; // Remove from our tracking dictionary
}

function clearAllLabels() {
    if (!itemLabelContainer) return;
    while (itemLabelContainer.firstChild) {
        itemLabelContainer.removeChild(itemLabelContainer.firstChild);
    }
    itemLabels = {}; // Clear the tracking object
    console.log("Cleared all item labels from DOM and tracking object."); // <<< DEBUG
}

// --- UI Updates ---
function updateScoreBoard() {
    scoreBoard.textContent = `Score: ${score}`;
}

function showMessage(text, color = '#cccccc', duration = null) {
    if (!messageBox) return; // Safety check
    if (messageTimeout) clearTimeout(messageTimeout); // Clear previous timeout

    messageBox.textContent = text;
    messageBox.style.color = color;
    messageBox.style.opacity = 1;
    messageBox.style.transition = 'none'; // Remove transition for fade-in

    // Set timeout for fade-out if duration is provided
    if (duration) {
        messageTimeout = setTimeout(() => {
            // Check if the message is still the one we set before fading out
            if (messageBox.textContent === text) {
                messageBox.style.transition = 'opacity 0.5s ease-out'; // Add transition for fade-out
                messageBox.style.opacity = 0;
                // Optional: Clear text after fade-out completes
                // setTimeout(() => { if (messageBox.style.opacity == 0) messageBox.textContent = ''; }, 500);
            }
            messageTimeout = null; // Clear the timeout ID
        }, duration);
    }
}


// --- Weather Effect Update Calls ---
function updateWeather(currentTime) {
    try {
         if (typeof window.updateRain === 'function') window.updateRain();
         if (typeof window.updateLightning === 'function') window.updateLightning(currentTime);
    } catch(error) {
        // Avoid spamming console if weather fails repeatedly
        // console.error("Error during weather update:", error);
    }
}

// --- Animation Loop ---
function animate(currentTime) { // Pass time for consistency
    animationFrameId = requestAnimationFrame(animate); // Request next frame first

    // Use performance.now() if currentTime isn't passed reliably by requestAnimationFrame
    const time = currentTime || performance.now();
    // const deltaTime = (time - lastTime) / 1000; // Calculate delta time in seconds if needed
    // lastTime = time;

    // Update Game Logic (only if active)
    if (gameActive) {
        spawnTimer++;
        if (spawnTimer >= timeBetweenSpawns) {
            spawn(); // Use the combined spawn function
            spawnTimer = 0;
        }
        moveObjects(); // Moves both items and powerups
        updatePowerUps(time); // Check for power-up expiry, pass consistent time
    }

    // Handle Sort Animations (Scale in/out)
    for (let i = animatingOutItems.length - 1; i >= 0; i--) {
        const itemData = animatingOutItems[i];
        // <<< CHANGE: More robust check for valid animation data
        if (!itemData || !itemData.mesh || !itemData.baseScale || !itemData.animationStartTime || !itemData.isAnimatingOut) {
             if (itemData?.mesh) scene.remove(itemData.mesh); // Clean up mesh if possible
             animatingOutItems.splice(i, 1);
             console.warn("Removed invalid or incomplete animating item data", itemData); // <<< DEBUG
             continue;
        }
        const elapsedTime = time - itemData.animationStartTime;
        const progress = Math.min(elapsedTime / SORT_ANIM_DURATION, 1.0);
        let currentScaleFactor;
        // Simple linear scale down for now, easier to debug
        // if (progress < 0.5) { currentScaleFactor = 1.0 + (SORT_ANIM_SCALE_UP - 1.0) * (progress / 0.5); }
        // else { currentScaleFactor = SORT_ANIM_SCALE_UP + (SORT_ANIM_SCALE_DOWN - SORT_ANIM_SCALE_UP) * ((progress - 0.5) / 0.5); }
        currentScaleFactor = 1.0 - progress; // Scale from 1 down to 0

        itemData.mesh.scale.copy(itemData.baseScale).multiplyScalar(currentScaleFactor);

        if (progress >= 1.0) {
            scene.remove(itemData.mesh); // Remove mesh from scene
            animatingOutItems.splice(i, 1); // Remove data from array
        }
    }

    // Update Weather
    updateWeather(time); // Pass consistent time

    // Update Item Labels Positions
    updateLabels();

    // Render Scene
    if (renderer && scene && camera) { // <<< DEBUG: Check if core components exist
        renderer.render(scene, camera);
    } else {
        // console.error("Render skipped: Missing renderer, scene, or camera."); // <<< DEBUG (Can be noisy)
        // Potentially stop the loop if critical components are missing?
        // cancelAnimationFrame(animationFrameId);
        // animationFrameId = null;
    }
}


// --- Window Resize Handler ---
function onWindowResize() {
    console.log("Window resize detected."); // <<< DEBUG
    const width = gameContainer.clientWidth;
    const height = gameContainer.clientHeight;
    if (camera) {
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
    }
    if (renderer) {
        renderer.setSize(width, height);
        renderer.setPixelRatio(window.devicePixelRatio); // Re-set pixel ratio on resize
    }
    // Labels will be updated in the next animation frame by updateLabels()
}


// --- Start Everything ---
// <<< CHANGE: Use DOMContentLoaded for safety, though window.onload is often fine
// window.onload = init;
document.addEventListener('DOMContentLoaded', init);

