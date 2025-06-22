// mainx1.js - Optimized with Manual Vertex Update for Mountains
// Consolidated revisions including platform/ramp, global constants,
// material cache fix, path corrections, shadow setup, and basic UI updates.

// --- Ship UI Overlay (moved to top for global access) ---
function showShipUI() {
    let ui = document.getElementById("shipUIOverlay");
    if (!ui) {
        ui = document.createElement("div");
        ui.id = "shipUIOverlay";
        ui.style.position = "absolute";
        ui.style.top = "20px";
        ui.style.left = "50%";
        ui.style.transform = "translateX(-50%)";
        ui.style.background = "rgba(10,30,60,0.7)";
        ui.style.color = "#0ff";
        ui.style.fontFamily = "monospace";
        ui.style.fontSize = "22px";
        ui.style.padding = "16px 32px";
        ui.style.borderRadius = "12px";
        ui.style.zIndex = 10000;
        ui.innerHTML = "SHIP MODE";
        document.body.appendChild(ui);
    }
    ui.style.display = "block";
}
function hideShipUI() {
    const ui = document.getElementById("shipUIOverlay");
    if (ui) ui.style.display = "none";
}
function updateShipUI(speed, altitude, canExit) {
    const ui = document.getElementById("shipUIOverlay");
    if (ui) {
        ui.innerHTML = `SHIP MODE<br>Speed: <b>${speed.toFixed(1)}</b>  Altitude: <b>${altitude.toFixed(1)}</b><br>${canExit ? '<span style=\"color:#0f0\">Press R to Exit</span>' : '<span style=\"color:#888\">Land to Exit</span>'}`;
    }
}

// --- Material Cache --- <<< MOVED TO TOP
const materialCache = {};
function getCachedMaterial(name, scene, options, generatorFunc) {
    // Ensure scene is valid
    if (!scene) {
        console.error("Attempted to get cached material with invalid scene:", name);
        return null; // Or throw an error
    }
    if (!materialCache[name]) {
        try {
            materialCache[name] = generatorFunc(scene, options);
        } catch (e) {
            console.error(`Error creating cached material '${name}':`, e);
            // Optionally return a default fallback material
            return null;
        }
    }
    return materialCache[name];
}
// --- END OF MOVED CODE ---

// --- Global Variables ---
const PLAYER_DAMAGE = 20;
const GROUND_LEVEL = 0;
let healthPacks = [];
let currentCrosshairIndex = 0;

// --- Platform/Ramp Constants --- <<< MOVED TO GLOBAL SCOPE
const PLATFORM_HEIGHT = 20;
const PLATFORM_POS = new BABYLON.Vector3(150, GROUND_LEVEL + PLATFORM_HEIGHT, -80);
const PLATFORM_WIDTH = 30;
const PLATFORM_DEPTH = 40;
const PLATFORM_THICKNESS = 2;
const RAMP_WIDTH = 15;
const RAMP_LENGTH = 45; // Adjust for desired slope along with PLATFORM_HEIGHT
const RAMP_THICKNESS = 1;

/**
 * Updates the player health and stamina display in the UI.
 */
function updatePlayerHealthUI() {
    // Update Health
    const healthCounter = document.getElementById("playerHealthCounter");
    if (window.player && healthCounter) {
        healthCounter.innerText = "Health: " + Math.round(player.health); // Use Math.round for cleaner display
    }

    // Update stamina UI if player and elements exist
    if (window.player && typeof window.player.updateStaminaUI === 'function') {
        window.player.updateStaminaUI(); // Delegate stamina update logic to Player class
    } else if (window.player && !document.getElementById("staminaUI")) {
        // Warn only once if UI elements are missing after player exists
        if (!window.player.staminaWarningShown) {
            console.warn("Stamina UI elements (staminaUI, staminaFill, staminaText) not found in HTML.");
            window.player.staminaWarningShown = true; // Prevent repeated warnings
        }
    }
}

// Make getCachedMaterial globally accessible if needed by other scripts (optional)
window.getCachedMaterial = getCachedMaterial;

// --- Drivable UFO Ship Class ---
class DrivableUFO {
    constructor(scene, position) {
        this.scene = scene;
        this.isPlayerIn = false;
        this.mesh = null;
        this.speed = 0;
        this.maxSpeed = 3.2;
        this.accel = 0.09;
        this.decel = 0.07;
        this.turnSpeed = 0.035;
        this.upSpeed = 1.5;
        this.grounded = false;
        this._loadUFOMesh(position);
    }
    async _loadUFOMesh(position) {
        const modelPath = "./assets/models/";
        const modelFile = "ufo.glb";
        try {
            const result = await BABYLON.SceneLoader.ImportMeshAsync("", modelPath, modelFile, this.scene);
            this.mesh = result.meshes[0];
            this.mesh.position = position.clone();
            this.mesh.scaling.scaleInPlace(2.5);
        } catch (e) {
            // Fallback: disc + dome
            const disc = BABYLON.MeshBuilder.CreateDisc("ufoDisc", { radius: 5, tessellation: 48 }, this.scene);
            disc.position = position.clone();
            disc.material = new BABYLON.StandardMaterial("ufoDiscMat", this.scene);
            disc.material.diffuseColor = new BABYLON.Color3(0.7, 0.7, 0.8);
            disc.material.specularColor = new BABYLON.Color3(0.8, 0.9, 1.0);
            // Dome
            const dome = BABYLON.MeshBuilder.CreateSphere("ufoDome", { diameter: 4, slice: 0.5 }, this.scene);
            dome.position = position.clone().add(new BABYLON.Vector3(0, 2, 0));
            dome.material = new BABYLON.StandardMaterial("ufoDomeMat", this.scene);
            dome.material.diffuseColor = new BABYLON.Color3(0.5, 0.8, 1.0);
            dome.material.alpha = 0.5;
            // Parent dome to disc
            dome.parent = disc;
            this.mesh = disc;
        }
        this.mesh.checkCollisions = true;
        this.mesh.receiveShadows = true;
        this.mesh.isPickable = true;
        this.mesh.metadata = { isShip: true, ref: this };
        if (this.scene.shadowGenerator) this.scene.shadowGenerator.addShadowCaster(this.mesh);
    }
    setPlayerIn(player) {
        this.isPlayerIn = true;
        this.player = player;
        player.camera.parent = this.mesh;
        player.camera.position = new BABYLON.Vector3(0, 2, -8);
        player.camera.rotation = new BABYLON.Vector3(0, 0, 0);
        player.camera.attachControl(false);
        player.inShip = true;
        player.disableControls = true;
        showShipUI();
        this._setupShipControls();
    }
    setPlayerOut() {
        if (!this.isPlayerIn) return;
        this.isPlayerIn = false;
        if (this.player) {
            this.player.camera.parent = null;
            const exitPos = this.mesh.position.add(new BABYLON.Vector3(0, 2, -7));
            this.player.camera.position = exitPos;
            this.player.camera.attachControl(true);
            this.player.inShip = false;
            this.player.disableControls = false;
        }
        hideShipUI();
        this._removeShipControls();
    }
    _setupShipControls() {
        this._keyState = {};
        this._keyListener = (e) => {
            if (e.type === "keydown") this._keyState[e.key.toLowerCase()] = true;
            else if (e.type === "keyup") this._keyState[e.key.toLowerCase()] = false;
        };
        window.addEventListener("keydown", this._keyListener);
        window.addEventListener("keyup", this._keyListener);
        this._updateObserver = this.scene.onBeforeRenderObservable.add(() => this._update());
    }
    _removeShipControls() {
        window.removeEventListener("keydown", this._keyListener);
        window.removeEventListener("keyup", this._keyListener);
        if (this._updateObserver) this.scene.onBeforeRenderObservable.remove(this._updateObserver);
    }
    _update() {
        if (!this.isPlayerIn || !this.mesh) return;
        let move = BABYLON.Vector3.Zero();
        let rotY = 0;
        if (this._keyState["w"]) this.speed = Math.min(this.maxSpeed, this.speed + this.accel);
        else if (this._keyState["s"]) this.speed = Math.max(-this.maxSpeed * 0.5, this.speed - this.accel * 0.7);
        else {
            if (this.speed > 0) this.speed = Math.max(0, this.speed - this.decel);
            else if (this.speed < 0) this.speed = Math.min(0, this.speed + this.decel * 0.7);
        }
        if (this._keyState["a"]) rotY += this.turnSpeed;
        if (this._keyState["d"]) rotY -= this.turnSpeed;
        if (this._keyState[" "] || this._keyState["space"]) move.y += this.upSpeed;
        if (this._keyState["control"] || this._keyState["ctrl"]) move.y -= this.upSpeed;
        this.mesh.rotation.y += rotY;
        const forward = new BABYLON.Vector3(Math.sin(this.mesh.rotation.y), 0, Math.cos(this.mesh.rotation.y));
        this.mesh.position.addInPlace(forward.scale(this.speed * 0.19));
        this.mesh.position.y += move.y * 0.13;
        if (!this._keyState[" "] && !this._keyState["space"]) {
            this.mesh.position.y -= 0.09;
        }
        if (this.mesh.position.y < GROUND_LEVEL + 2) {
            this.mesh.position.y = GROUND_LEVEL + 2;
            this.grounded = true;
        } else {
            this.grounded = false;
        }
        const altitude = this.mesh.position.y - GROUND_LEVEL;
        updateShipUI(Math.abs(this.speed * 10), altitude, this.grounded);
        if (this.grounded && this._keyState["r"] && !this._exitPressed) {
            this.setPlayerOut();
            this._exitPressed = true;
        }
        if (!this._keyState["r"]) {
            this._exitPressed = false;
        }
    }
}

// --- Place a UFO ship in the world ---
function placeDrivableUFO(scene) {
    const ufoPos = new BABYLON.Vector3(PLATFORM_POS.x + 30, GROUND_LEVEL + 2, PLATFORM_POS.z - 30);
    const ufo = new DrivableUFO(scene, ufoPos);
    scene.drivableUFO = ufo;
}

// --- Main Scene Creation ---
const createScene = async function(engine, canvas) {
    const scene = new BABYLON.Scene(engine);
    scene.gamePaused = false;
    scene.enemies = []; // Array to hold enemy instances
    scene.gameWon = false;
    scene.boss = null;
    scene.collisionsEnabled = true; // Default Babylon collision system
    scene.groundPlane = null;
    scene.mountains = []; // Array to hold mountain meshes
    scene.platform = null; // Reference for platform
    scene.ramp = null;     // Reference for ramp
    scene.shadowGenerator = null; // Reference for shadow map generator

    // --- Physics Setup ---
    try {
        // Using Cannon.js - Note the MeshImpostor collision limitation warning
        scene.enablePhysics(new BABYLON.Vector3(0, -9.81, 0), new BABYLON.CannonJSPlugin());
        console.log("Physics engine enabled (Cannon.js)");
    } catch (e) {
        console.error("Failed to enable physics:", e);
        // Potentially display error to user and stop loading
        engine.hideLoadingUI();
        alert("Error initializing physics engine. Game cannot start.");
        return null;
    }

    // --- Environment & Ground Setup ---
    setupEnvironment(scene); // Sets up lights, skybox, fog, and scene.shadowGenerator

    try {
        createFlatPlaneTerrain(scene); // Creates ground mesh, material, physics
        if (!scene.groundPlane) throw new Error("Ground plane mesh failed creation.");
    } catch (terrainError) {
        console.error("FATAL: Failed to create ground plane.", terrainError);
        engine.hideLoadingUI();
        alert("Error creating terrain. Game cannot start.");
        return null;
    }

    // --- Mountains Setup ---
    try {
        await createMountains(scene); // Adds mountains and shadow casters
    } catch (mountainError) {
        console.error("Error creating mountains:", mountainError);
        // Non-fatal, game can continue without mountains potentially
    }

    // --- Platform and Ramp Setup ---
    try {
        createPlatformAndRamp(scene); // Adds platform/ramp and shadow handling
        console.log("Platform and Ramp created.");
    } catch (structureError) {
        console.error("Error creating platform and ramp:", structureError);
        // Potentially non-fatal, depending on gameplay reliance
    }

    // --- Player Setup ---
    try {
        if (typeof Player !== 'undefined') {
            window.player = new Player(scene, canvas, { PLAYER_DAMAGE, playerShotSoundPath: "assets/sounds/shot1.mp3" });
            // Start player near the ramp base
            const startPos = new BABYLON.Vector3(
                PLATFORM_POS.x,
                GROUND_LEVEL + window.player.normalCameraHeight + 1, // Start slightly above ground
                PLATFORM_POS.z - RAMP_LENGTH * 0.7 // Start further back from ramp base
             );
            player.camera.position = startPos;
            player.initialize(); // Sets up controls, stamina, etc.
             // Add player capsule/mesh to shadow casters if it exists and should cast shadows
             if (scene.shadowGenerator && player.getMesh && player.getMesh()) { // Assuming player has a getMesh() method
                 scene.shadowGenerator.addShadowCaster(player.getMesh(), true);
                 console.log("Player added to shadow casters.");
             } else {
                 console.warn("Player mesh not found or shadow generator missing, cannot add player to shadow casters.");
             }

        } else {
            console.error("Player class not defined!");
            throw new Error("Player class definition is missing."); // Make it fatal
        }
    } catch (playerError) {
        console.error("Failed to initialize player:", playerError);
        engine.hideLoadingUI();
        alert("Error initializing player. Game cannot start.");
        return null;
    }

    // --- Load Game Elements ---
    // Ensure player is initialized before loading elements that might reference it (like zombies)
    if (window.player) {
        loadGameElements(scene); // Spawns enemies, items, effects, adds shadow casters
    } else {
         console.error("Cannot load game elements because player failed to initialize.");
    }


    // --- UI Setup ---
    setupPauseMenu(scene, engine);
    setupInventoryMenu();

    // --- Win Condition Check ---
    scene.checkWinCondition = function() {
        // Ensure enemies array exists and filter out potentially null/disposed enemies
        const activeEnemies = scene.enemies ? scene.enemies.filter(e => e && !e.isDisposed) : [];
        scene.enemies = activeEnemies; // Update scene enemies array
        const bossAlive = scene.boss && !scene.boss.isDisposed; // Check if boss exists and is not disposed

        const totalEnemies = activeEnemies.length + (bossAlive ? 1 : 0);

        if (totalEnemies === 0 && !scene.gameWon) { // Prevent multiple wins
            scene.gameWon = true;
            console.log("YOU WON!");
            // Display win message UI
             const winMsg = document.getElementById("winMessage");
             if (winMsg) winMsg.style.display = 'block';
             // Optionally pause game on win
             // scene.gamePaused = true;
        }
    };

    // Check win condition less frequently to save performance
    scene.onBeforeRenderObservable.add(() => {
        if (!scene.gameWon && !scene.gamePaused && scene.frameId % 120 === 0) { // Check every ~2 seconds
            scene.checkWinCondition();
        }
    });

    placeDrivableUFO(scene);
    scene.onBeforeRenderObservable.add(() => {
        if (!window.player || !scene.drivableUFO || !scene.drivableUFO.mesh) return;
        if (window.player.inShip) return; // Only one ship at a time
        const dist = BABYLON.Vector3.Distance(window.player.camera.position, scene.drivableUFO.mesh.position);
        if (dist < 9 && !window.player._ufoEnterPressed && window.player._keyState && window.player._keyState["r"]) {
            scene.drivableUFO.setPlayerIn(window.player);
            window.player._ufoEnterPressed = true;
        }
        if (!window.player._keyState || !window.player._keyState["r"]) {
            window.player._ufoEnterPressed = false;
        }
    });
    if (!window.player._keyState) window.player._keyState = {};
    window.addEventListener("keydown", e => window.player._keyState[e.key.toLowerCase()] = true);
    window.addEventListener("keyup", e => window.player._keyState[e.key.toLowerCase()] = false);

    console.log("Scene setup complete.");
    return scene;
};

/**
 * Creates a simple flat plane for terrain
 */
function createFlatPlaneTerrain(scene) {
    const groundSize = 3000;
    const ground = BABYLON.MeshBuilder.CreateGround("groundPlane", {
        width: groundSize,
        height: groundSize,
        subdivisions: 10
    }, scene);

    ground.position.y = GROUND_LEVEL;

    // Use getCachedMaterial safely
    const groundMat = getCachedMaterial("groundPlaneMat", scene, {}, (sc) => {
        const mat = new BABYLON.StandardMaterial("groundPlaneMat", sc);
        mat.diffuseColor = new BABYLON.Color3(0.4, 0.35, 0.3);
        mat.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
        try {
            // Ensure path is relative to the HTML file
            mat.diffuseTexture = new BABYLON.Texture("assets/textures/ground.jpg", sc);
            mat.diffuseTexture.uScale = 60;
            mat.diffuseTexture.vScale = 60;
        } catch (texErr) {
            console.warn("Ground texture 'assets/textures/ground.jpg' not found, using color.", texErr);
        }
        return mat;
    });
    if (groundMat) { // Check if material was created successfully
        ground.material = groundMat;
    } else {
        console.error("Failed to create or cache ground material.");
        // Apply a basic fallback material
        const fallbackMat = new BABYLON.StandardMaterial("fallbackGroundMat", scene);
        fallbackMat.diffuseColor = new BABYLON.Color3(0.5, 0.4, 0.3);
        ground.material = fallbackMat;
    }


    ground.checkCollisions = true;
    ground.receiveShadows = true; // Ground should receive shadows
    ground.isMapGround = true; // Custom flag if needed

    try {
        ground.physicsImpostor = new BABYLON.PhysicsImpostor(
            ground,
            BABYLON.PhysicsImpostor.BoxImpostor, // BoxImpostor is efficient for flat ground
            { mass: 0, restitution: 0.1, friction: 0.8 },
            scene
        );
    } catch(e) {
        console.error("Failed physics for ground plane", e);
    }

    scene.groundPlane = ground;
    return ground;
}

/**
 * Creates the raised platform and the ramp leading to it.
 */
function createPlatformAndRamp(scene) {
    // --- Labyrinth Materials ---
    const platformMat = getCachedMaterial("labPlatformMat", scene, {}, (sc) => {
        const mat = new BABYLON.StandardMaterial("labPlatformMat", sc);
        mat.diffuseColor = new BABYLON.Color3(0.5, 0.6, 0.7);
        mat.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);
        try {
            mat.diffuseTexture = new BABYLON.Texture("assets/textures/concrete_normal.jpg", sc);
            mat.diffuseTexture.uScale = 2;
            mat.diffuseTexture.vScale = 2;
        } catch (e) {}
        return mat;
    });
    const rampMat = getCachedMaterial("labRampMat", scene, {}, (sc) => {
        const mat = new BABYLON.StandardMaterial("labRampMat", sc);
        mat.diffuseColor = new BABYLON.Color3(0.4, 0.5, 0.6);
        mat.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);
        return mat;
    });

    // --- Labyrinth Parameters ---
    const mazeWidth = 9; // number of cells
    const mazeDepth = 9;
    const cellSize = 10;
    const platformHeight = 1.5;
    const wallHeight = 4.5;
    const labyrinthY = PLATFORM_POS.y;
    const labyrinthCenter = new BABYLON.Vector3(PLATFORM_POS.x, labyrinthY, PLATFORM_POS.z);

    // --- Maze Generation (simple DFS) ---
    function generateMaze(w, h) {
        const maze = Array.from({ length: h }, () => Array(w).fill(0));
        const visited = Array.from({ length: h }, () => Array(w).fill(false));
        const stack = [[0, 0]];
        visited[0][0] = true;
        while (stack.length) {
            const [cx, cy] = stack[stack.length - 1];
            const dirs = [
                [0, -1, 1], // up
                [1, 0, 2],  // right
                [0, 1, 4],  // down
                [-1, 0, 8]  // left
            ].sort(() => Math.random() - 0.5);
            let moved = false;
            for (const [dx, dy, bit] of dirs) {
                const nx = cx + dx, ny = cy + dy;
                if (nx >= 0 && nx < w && ny >= 0 && ny < h && !visited[ny][nx]) {
                    maze[cy][cx] |= bit;
                    maze[ny][nx] |= (bit === 1 ? 4 : bit === 2 ? 8 : bit === 4 ? 1 : 2);
                    visited[ny][nx] = true;
                    stack.push([nx, ny]);
                    moved = true;
                    break;
                }
            }
            if (!moved) stack.pop();
        }
        return maze;
    }
    const maze = generateMaze(mazeWidth, mazeDepth);

    // --- Create Platforms (floors) ---
    const platforms = [];
    for (let z = 0; z < mazeDepth; z++) {
        for (let x = 0; x < mazeWidth; x++) {
            const px = labyrinthCenter.x + (x - Math.floor(mazeWidth / 2)) * cellSize;
            const pz = labyrinthCenter.z + (z - Math.floor(mazeDepth / 2)) * cellSize;
            const platform = BABYLON.MeshBuilder.CreateBox(`labPlatform_${x}_${z}`, {
                width: cellSize * 0.98,
                height: platformHeight,
                depth: cellSize * 0.98
            }, scene);
            platform.position = new BABYLON.Vector3(px, labyrinthY, pz);
            platform.material = platformMat;
            platform.checkCollisions = true;
            platform.receiveShadows = true;
            try {
                platform.physicsImpostor = new BABYLON.PhysicsImpostor(platform, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 0, restitution: 0.1, friction: 0.9 }, scene);
            } catch (e) {}
            if (scene.shadowGenerator) scene.shadowGenerator.addShadowCaster(platform);
            platforms.push(platform);
        }
    }

    // --- Create Walls (maze) ---
    for (let z = 0; z < mazeDepth; z++) {
        for (let x = 0; x < mazeWidth; x++) {
            const px = labyrinthCenter.x + (x - Math.floor(mazeWidth / 2)) * cellSize;
            const pz = labyrinthCenter.z + (z - Math.floor(mazeDepth / 2)) * cellSize;
            const cell = maze[z][x];
            // North wall
            if ((cell & 1) === 0) {
                const wall = BABYLON.MeshBuilder.CreateBox(`labWallN_${x}_${z}`, {
                    width: cellSize,
                    height: wallHeight,
                    depth: 0.7
                }, scene);
                wall.position = new BABYLON.Vector3(px, labyrinthY + wallHeight / 2, pz - cellSize / 2);
                wall.material = platformMat;
                wall.checkCollisions = true;
                wall.receiveShadows = true;
                try {
                    wall.physicsImpostor = new BABYLON.PhysicsImpostor(wall, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 0, restitution: 0.1, friction: 0.9 }, scene);
                } catch (e) {}
                if (scene.shadowGenerator) scene.shadowGenerator.addShadowCaster(wall);
            }
            // West wall
            if ((cell & 8) === 0) {
                const wall = BABYLON.MeshBuilder.CreateBox(`labWallW_${x}_${z}`, {
                    width: 0.7,
                    height: wallHeight,
                    depth: cellSize
                }, scene);
                wall.position = new BABYLON.Vector3(px - cellSize / 2, labyrinthY + wallHeight / 2, pz);
                wall.material = platformMat;
                wall.checkCollisions = true;
                wall.receiveShadows = true;
                try {
                    wall.physicsImpostor = new BABYLON.PhysicsImpostor(wall, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 0, restitution: 0.1, friction: 0.9 }, scene);
                } catch (e) {}
                if (scene.shadowGenerator) scene.shadowGenerator.addShadowCaster(wall);
            }
            // South wall (maze border)
            if (z === mazeDepth - 1) {
                const wall = BABYLON.MeshBuilder.CreateBox(`labWallS_${x}_${z}`, {
                    width: cellSize,
                    height: wallHeight,
                    depth: 0.7
                }, scene);
                wall.position = new BABYLON.Vector3(px, labyrinthY + wallHeight / 2, pz + cellSize / 2);
                wall.material = platformMat;
                wall.checkCollisions = true;
                wall.receiveShadows = true;
                try {
                    wall.physicsImpostor = new BABYLON.PhysicsImpostor(wall, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 0, restitution: 0.1, friction: 0.9 }, scene);
                } catch (e) {}
                if (scene.shadowGenerator) scene.shadowGenerator.addShadowCaster(wall);
            }
            // East wall (maze border)
            if (x === mazeWidth - 1) {
                const wall = BABYLON.MeshBuilder.CreateBox(`labWallE_${x}_${z}`, {
                    width: 0.7,
                    height: wallHeight,
                    depth: cellSize
                }, scene);
                wall.position = new BABYLON.Vector3(px + cellSize / 2, labyrinthY + wallHeight / 2, pz);
                wall.material = platformMat;
                wall.checkCollisions = true;
                wall.receiveShadows = true;
                try {
                    wall.physicsImpostor = new BABYLON.PhysicsImpostor(wall, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 0, restitution: 0.1, friction: 0.9 }, scene);
                } catch (e) {}
                if (scene.shadowGenerator) scene.shadowGenerator.addShadowCaster(wall);
            }
        }
    }

    // --- Main Ramp to Labyrinth Entrance ---
    const rampLength = PLATFORM_HEIGHT * 2.5;
    const ramp = BABYLON.MeshBuilder.CreateBox("labRamp", {
        width: cellSize * 1.2,
        height: 1.2,
        depth: rampLength
    }, scene);
    ramp.material = rampMat;
    ramp.checkCollisions = true;
    ramp.receiveShadows = true;
    // Position and rotate ramp
    ramp.position = new BABYLON.Vector3(labyrinthCenter.x, GROUND_LEVEL + PLATFORM_HEIGHT / 2, labyrinthCenter.z - (mazeDepth * cellSize) / 2 - rampLength / 2 + cellSize / 2);
    ramp.rotation.x = Math.atan(PLATFORM_HEIGHT / rampLength);
    try {
        ramp.physicsImpostor = new BABYLON.PhysicsImpostor(ramp, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 0, restitution: 0.1, friction: 0.9 }, scene);
    } catch (e) {}
    if (scene.shadowGenerator) scene.shadowGenerator.addShadowCaster(ramp);
    scene.ramp = ramp;

    // --- Optionally: Add some random ramps inside the maze for verticality ---
    for (let i = 0; i < 8; i++) {
        const x = Math.floor(Math.random() * mazeWidth);
        const z = Math.floor(Math.random() * mazeDepth);
        const up = Math.random() > 0.5;
        const px = labyrinthCenter.x + (x - Math.floor(mazeWidth / 2)) * cellSize;
        const pz = labyrinthCenter.z + (z - Math.floor(mazeDepth / 2)) * cellSize;
        const rampLen = cellSize * (0.9 + Math.random() * 0.5);
        const rampAngle = Math.PI / 8 + Math.random() * Math.PI / 12;
        const rampY = labyrinthY + (up ? platformHeight : 0);
        const mazeRamp = BABYLON.MeshBuilder.CreateBox(`mazeRamp_${i}`, {
            width: cellSize * 0.7,
            height: 1.0,
            depth: rampLen
        }, scene);
        mazeRamp.material = rampMat;
        mazeRamp.checkCollisions = true;
        mazeRamp.receiveShadows = true;
        mazeRamp.position = new BABYLON.Vector3(px, rampY + 0.5, pz);
        mazeRamp.rotation.x = up ? -rampAngle : rampAngle;
        try {
            mazeRamp.physicsImpostor = new BABYLON.PhysicsImpostor(mazeRamp, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 0, restitution: 0.1, friction: 0.9 }, scene);
        } catch (e) {}
        if (scene.shadowGenerator) scene.shadowGenerator.addShadowCaster(mazeRamp);
    }
}

/**
 * Optimized mountain creation with vertex manipulation
 */
async function createMountains(scene) {
    const mountainCount = 15;
    const spawnArea = 1200;
    const minBaseRadius = 80;
    const maxBaseRadius = 250;
    const minHeight = 100;
    const maxHeight = 400;
    const subdivisions = 24;

    // --- Mountain Material ---
    const mountMat = getCachedMaterial("mountainMat", scene, {}, (sc) => {
        const mat = new BABYLON.StandardMaterial("mountainMat", sc);
        mat.diffuseColor = new BABYLON.Color3(0.55, 0.5, 0.45);
        mat.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
        mat.specularPower = 16;
        try {
            mat.diffuseTexture = new BABYLON.Texture("assets/textures/rock_diffuse.jpg", sc);
            mat.bumpTexture = new BABYLON.Texture("assets/textures/rock_normal.jpg", sc);
            mat.diffuseTexture.uScale = 5; mat.diffuseTexture.vScale = 5;
            mat.useParallax = true; mat.useParallaxOcclusion = true;
            mat.parallaxScaleBias = 0.05;
        } catch(texErr){ console.warn("Mountain textures not found.") }
        return mat;
    });
     const fallbackMat = new BABYLON.StandardMaterial("fallbackMountMat", scene);
     fallbackMat.diffuseColor = new BABYLON.Color3(0.55, 0.5, 0.45);

    const addShadowCaster = (mesh) => {
        if (scene.shadowGenerator && mesh) {
            scene.shadowGenerator.addShadowCaster(mesh, true);
        }
    };

    const batchSize = 5;
    for (let batch = 0; batch < Math.ceil(mountainCount / batchSize); batch++) {
        const startIdx = batch * batchSize;
        const endIdx = Math.min(startIdx + batchSize, mountainCount);

        for (let i = startIdx; i < endIdx; i++) {
            try {
                const baseRadius = minBaseRadius + Math.random() * (maxBaseRadius - minBaseRadius);
                const height = minHeight + Math.random() * (maxHeight - minHeight);
                const mountainMesh = BABYLON.MeshBuilder.CreateGround(`mountain_${i}`, {
                    width: baseRadius * 2, height: baseRadius * 2,
                    subdivisions: subdivisions, updatable: true
                }, scene);

                const positions = mountainMesh.getVerticesData(BABYLON.VertexBuffer.PositionKind);
                if (!positions) { mountainMesh.dispose(); continue; }

                for (let v = 0; v < positions.length / 3; v++) {
                    const idx = v * 3; const x = positions[idx]; const z = positions[idx + 2];
                    const distFromCenter = Math.sqrt(x * x + z * z);
                    const normalizedDist = Math.min(1.0, distFromCenter / baseRadius);
                    let heightFactor = Math.cos(normalizedDist * Math.PI / 2);
                    heightFactor *= (1.0 + (Math.random() - 0.5) * 0.4);
                    heightFactor = Math.max(0, heightFactor);
                    positions[idx + 1] = heightFactor * height;
                }

                mountainMesh.updateVerticesData(BABYLON.VertexBuffer.PositionKind, positions);
                mountainMesh.computeWorldMatrix(true);
                mountainMesh.createNormals(true);
                mountainMesh.refreshBoundingInfo(true);

                let posX, posZ;
                const bufferDist = 1.5; // Increase buffer slightly
                do {
                     posX = (Math.random() - 0.5) * 2 * spawnArea;
                     posZ = (Math.random() - 0.5) * 2 * spawnArea;
                } while (
                     Math.abs(posX - PLATFORM_POS.x) < (maxBaseRadius + PLATFORM_WIDTH) * bufferDist &&
                     Math.abs(posZ - PLATFORM_POS.z) < (maxBaseRadius + PLATFORM_DEPTH) * bufferDist
                );

                mountainMesh.position = new BABYLON.Vector3(posX, GROUND_LEVEL, posZ);
                mountainMesh.material = mountMat || fallbackMat;
                mountainMesh.checkCollisions = true;
                mountainMesh.receiveShadows = true; // Mountains receive shadows

                try {
                    mountainMesh.physicsImpostor = new BABYLON.PhysicsImpostor( mountainMesh,
                        BABYLON.PhysicsImpostor.MeshImpostor,
                        { mass: 0, restitution: 0.1, friction: 0.8 }, scene );
                } catch (physErr) { console.error(`Mountain ${i} physics failed:`, physErr); }

                addShadowCaster(mountainMesh); // Mountains cast shadows
                scene.mountains.push(mountainMesh);
            } catch (error) { console.error(`Error processing mountain ${i}:`, error); }
        }
        await new Promise(resolve => setTimeout(resolve, 10)); // Slightly longer yield
    }
    console.log(`Created ${scene.mountains.length} mountains`);
}

/**
 * Environment setup with lights, fog, skybox, and shadow generator
 */
function setupEnvironment(scene) {
    // --- Lighting ---
    const hemiLight = new BABYLON.HemisphericLight("hemiLight", new BABYLON.Vector3(0.1, 1, 0.1), scene);
    hemiLight.intensity = 0.6;
    hemiLight.diffuse = new BABYLON.Color3(1, 1, 1);
    hemiLight.groundColor = new BABYLON.Color3(0.4, 0.4, 0.5);

    const dirLight = new BABYLON.DirectionalLight("dirLight", new BABYLON.Vector3(-0.7, -0.8, 0.5), scene);
    dirLight.intensity = 0.9;
    dirLight.position = new BABYLON.Vector3(250, 400, -200); // Adjust light position for desired shadow angle
    dirLight.shadowMinZ = 10;
    dirLight.shadowMaxZ = 1000; // Adjust based on scene scale and camera distance

    // --- Shadow Generator Setup ---
    try {
        const shadowGenerator = new BABYLON.ShadowGenerator(2048, dirLight); // 1024, 2048, or 4096 resolution
        // PCF (Percentage Closer Filtering) provides softer shadows than ESM/BlurESM sometimes, less prone to light bleeding
        shadowGenerator.usePercentageCloserFiltering = true;
        shadowGenerator.filteringQuality = BABYLON.ShadowGenerator.QUALITY_HIGH; // Or MEDIUM/LOW
        // shadowGenerator.useExponentialShadowMap = true;
        // shadowGenerator.useBlurExponentialShadowMap = true;
        // shadowGenerator.blurKernel = 32;
        shadowGenerator.setDarkness(0.5); // Adjust darkness (0 to 1)
        shadowGenerator.bias = 0.005; // Adjust bias to prevent shadow acne
        // shadowGenerator.normalBias = 0.02; // Adjust normal bias if needed

        // Assign the light that casts shadows
        dirLight.shadowGenerator = shadowGenerator;
        // Store on scene object for easy access
        scene.shadowGenerator = shadowGenerator;
        console.log("Shadow Generator created.");

        // Automatically make the light cast shadows
        dirLight.castShadows = true; // Ensure the light source is set to cast shadows

    } catch (sgError) {
        console.error("Failed to create Shadow Generator:", sgError);
        scene.shadowGenerator = null; // Ensure it's null if creation fails
    }


    // --- Fog ---
    scene.fogMode = BABYLON.Scene.FOGMODE_LINEAR;
    scene.fogStart = 400.0;
    scene.fogEnd = 1500.0;
    scene.fogColor = new BABYLON.Color3(0.15, 0.15, 0.2);
    scene.clearColor = scene.fogColor.clone(); // Match background clear color to fog

    // --- Skybox ---
    try {
        const skybox = BABYLON.MeshBuilder.CreateBox("skyBox", { size: 5000 }, scene);
        const skyboxMaterial = new BABYLON.StandardMaterial("skyBoxMat", scene);
        skyboxMaterial.backFaceCulling = false;
        skyboxMaterial.disableLighting = true;
        // IMPORTANT: Ensure 6 texture files (e.g., sky_px.jpg, sky_nx.jpg...)
        // exist in 'assets/textures/skybox/' relative to the HTML file.
        skyboxMaterial.reflectionTexture = new BABYLON.CubeTexture("assets/textures/skybox/sky", scene);
        skyboxMaterial.reflectionTexture.coordinatesMode = BABYLON.Texture.SKYBOX_MODE;
        skyboxMaterial.diffuseColor = new BABYLON.Color3(0, 0, 0); // Black base color for skybox
        skyboxMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
        skybox.material = skyboxMaterial;
        skybox.infiniteDistance = true; // Keeps skybox fixed relative to camera
    } catch (e) {
        console.warn("Failed to load skybox texture. Check path 'assets/textures/skybox/sky*.jpg'. Using clear color.", e);
        // Fallback is handled by scene.clearColor
    }
}


/**
 * Load game elements like effects, enemies and items
 */
function loadGameElements(scene) {
     const addShadowCaster = (mesh) => {
         if (scene.shadowGenerator && mesh) {
             scene.shadowGenerator.addShadowCaster(mesh, true);
         }
     };

    // Spawn effect near ramp base
    createSpawnEffect(scene, new BABYLON.Vector3(PLATFORM_POS.x, GROUND_LEVEL + 1, PLATFORM_POS.z - RAMP_LENGTH * 0.7));

    // Create decorative elements
    createDebrisPile(scene, "rampBaseDebris", new BABYLON.Vector3(PLATFORM_POS.x + RAMP_WIDTH, GROUND_LEVEL, PLATFORM_POS.z - RAMP_LENGTH), 5, 15);
    createDebrisPile(scene, "platformCornerDebris", new BABYLON.Vector3(PLATFORM_POS.x - PLATFORM_WIDTH/2 - 3, GROUND_LEVEL, PLATFORM_POS.z + PLATFORM_DEPTH/2 + 3), 4, 10);

    // Add a decal on the platform
    createGroundDecal(scene, "platformDecal",
        new BABYLON.Vector3(PLATFORM_POS.x, PLATFORM_POS.y + 0.05, PLATFORM_POS.z),
        8, "assets/textures/rune_decal.png", Math.random() * Math.PI * 2
    );

    // --- Spawn enemies ---
    if (typeof ModelZombie !== 'undefined' && window.player) {
        const zombieSpawnPoints = [
            { x: -50, z: 30 }, { x: 50, z: 50 }, { x: -30, z: -40 },
            { x: PLATFORM_POS.x + 50, z: PLATFORM_POS.z - 20 },
            { x: 200, z: 250}
        ];
        zombieSpawnPoints.forEach((pos) => {
            try {
                const spawnPos = new BABYLON.Vector3(pos.x, GROUND_LEVEL + 1.0, pos.z);
                // Check distance from player before spawning?
                // if (BABYLON.Vector3.Distance(spawnPos, window.player.camera.position) > 50) {
                    const newZombie = new ModelZombie(scene, window.player, spawnPos); // Pass player ref
                    if (newZombie?.mesh) { // Optional chaining
                        addShadowCaster(newZombie.mesh);
                        scene.enemies.push(newZombie);
                    }
                // }
            } catch (e) { console.error("Failed to spawn zombie:", e); }
        });
        console.log(`Spawned ${scene.enemies.length} zombies.`);
    } else { /* ... warnings ... */ }

    // --- Spawn items ---
    const itemSpawnPoints = [
        { x: PLATFORM_POS.x, z: PLATFORM_POS.z }, // Center platform
        { x: PLATFORM_POS.x - PLATFORM_WIDTH * 0.4, z: PLATFORM_POS.z + PLATFORM_DEPTH * 0.3 }, // Corner platform
        { x: -3, z: -12 }, { x: 40, z: 45 } // Ground
    ];
    itemSpawnPoints.forEach((pos) => {
         let yPos = GROUND_LEVEL + 1; // Default to ground + offset
         // Check if within platform bounds
         if (Math.abs(pos.x - PLATFORM_POS.x) < PLATFORM_WIDTH / 2 &&
             Math.abs(pos.z - PLATFORM_POS.z) < PLATFORM_DEPTH / 2) {
             yPos = PLATFORM_POS.y + 1; // Place above platform surface
         }
        createInteractableItem(scene, new BABYLON.Vector3(pos.x, yPos, pos.z));
    });

    // Schedule boss spawn
    setTimeout(() => { spawnBoss(scene); }, 60000); // 1 minute
}

/**
 * Spawn the boss entity
 */
function spawnBoss(scene) {
    if (!scene || scene.isDisposed) return;
    if (scene.boss) { console.log("Boss already spawned."); return; } // Prevent multiple bosses

    if (typeof BossCore !== 'undefined') {
        try {
            const bossSpawnPos = new BABYLON.Vector3(0, GROUND_LEVEL + 50, 400); // Spawn further away
            const bossInstance = new BossCore(scene, bossSpawnPos);
            if (!bossInstance) throw new Error("BossCore constructor failed.");

            const bossScale = 4;
            if (bossInstance.coreMesh) {
                bossInstance.coreMesh.scaling.scaleInPlace(bossScale);
                bossInstance.coreMesh.computeWorldMatrix(true); // Update matrix after scaling

                 if (scene.shadowGenerator) {
                     scene.shadowGenerator.addShadowCaster(bossInstance.coreMesh, true);
                 }
                // Scale emitters relative to new boss scale
                if (bossInstance.emitters) {
                    bossInstance.emitters.forEach(emitter => {
                        if (emitter?.mesh) { // Check if emitter and its mesh exist
                             if (emitter.mesh.name.startsWith("orbitEmitter_")) {
                                 emitter.mesh.position.z *= bossScale; // Adjust orbit distance
                             }
                             if (scene.shadowGenerator) { // Add emitter meshes as casters
                                  scene.shadowGenerator.addShadowCaster(emitter.mesh, true);
                             }
                         }
                    });
                }
                 // Physics might need update - depends on BossCore implementation
            } else {
                 console.warn("BossCore instance created, but coreMesh not found for scaling/shadows.");
            }
            scene.boss = bossInstance; // Assign to scene only if successful
            console.log("Boss spawned at", bossSpawnPos);
        } catch (e) {
            console.error("Failed to spawn boss:", e);
            scene.boss = null; // Ensure boss is null if spawning failed
        }
    } else {
        console.warn("BossCore class not defined, cannot spawn boss.");
    }
}


/**
 * Creates particle effect for spawn points
 */
function createSpawnEffect(scene, position) {
    try {
        const particleSystem = new BABYLON.ParticleSystem("spawnParticles_" + BABYLON.Tools.RandomId(), 500, scene);
        // Ensure texture path is correct relative to the HTML file
        particleSystem.particleTexture = new BABYLON.Texture("assets/textures/flare.png", scene);
        particleSystem.emitter = position;
        // --- Rest of particle properties ---
        particleSystem.minEmitBox = new BABYLON.Vector3(-1.5, -0.2, -1.5);
        particleSystem.maxEmitBox = new BABYLON.Vector3(1.5, 1.0, 1.5);
        particleSystem.color1 = new BABYLON.Color4(0.5, 0.7, 1.0, 1.0);
        particleSystem.color2 = new BABYLON.Color4(0.2, 0.3, 1.0, 1.0);
        particleSystem.colorDead = new BABYLON.Color4(0.1, 0.1, 0.3, 0.0);
        particleSystem.minSize = 0.1; particleSystem.maxSize = 0.6;
        particleSystem.minLifeTime = 0.5; particleSystem.maxLifeTime = 1.5;
        particleSystem.emitRate = 400;
        particleSystem.minEmitPower = 1; particleSystem.maxEmitPower = 3;
        particleSystem.updateSpeed = 0.01;
        particleSystem.gravity = new BABYLON.Vector3(0, -2.81, 0);
        particleSystem.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADDITIVE;
        particleSystem.targetStopDuration = 1.5;
        particleSystem.disposeOnStop = true; // Automatically remove when done
        particleSystem.start();
    } catch (e) {
        // Check if the error is specifically about the texture
        if (e.message && (e.message.includes("flare.png") || e.message.includes("404"))) {
             console.error("Failed to load particle texture 'assets/textures/flare.png'. Check path and file existence.", e);
        } else {
             console.error("Failed to create spawn effect:", e);
        }
    }
}


/**
 * Creates a physics-enabled debris pile
 */
function createDebrisPile(scene, namePrefix, centerPosition, pileRadius, debrisCount) {
    const debrisMat = getCachedMaterial("debrisMat", scene, {}, (sc) => {
        const mat = new BABYLON.StandardMaterial("debrisMat", sc);
        mat.diffuseColor = new BABYLON.Color3(0.45, 0.45, 0.45);
        mat.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
        try {
            mat.diffuseTexture = new BABYLON.Texture("assets/textures/concrete_rubble.jpg", sc);
            mat.diffuseTexture.uScale = 2; mat.diffuseTexture.vScale = 2;
        } catch(e) { console.warn("Debris texture 'assets/textures/concrete_rubble.jpg' not found.") }
        return mat;
    });
     const fallbackMat = new BABYLON.StandardMaterial("fallbackDebrisMat", scene);
     fallbackMat.diffuseColor = new BABYLON.Color3(0.45, 0.45, 0.45);

    const debrisParent = new BABYLON.TransformNode(namePrefix + "_Parent", scene);
    debrisParent.position = new BABYLON.Vector3(centerPosition.x, GROUND_LEVEL, centerPosition.z);

     const addShadowCaster = (mesh) => {
         if (scene.shadowGenerator && mesh) {
             scene.shadowGenerator.addShadowCaster(mesh);
         }
     };

    for (let i = 0; i < debrisCount; i++) {
        try {
            const size = 0.4 + Math.random() * 1.2;
            const isBox = Math.random() < 0.6;
            let debrisMesh;
            if (isBox) {
                 debrisMesh = BABYLON.MeshBuilder.CreateBox(namePrefix + i, {
                    width: size * (0.7 + Math.random() * 0.6), // Randomize dimensions
                    height: size * (0.7 + Math.random() * 0.6),
                    depth: size * (0.7 + Math.random() * 0.6) }, scene);
            } else {
                 debrisMesh = BABYLON.MeshBuilder.CreateIcoSphere(namePrefix + i, {
                    radius: size * 0.5, subdivisions: 1 }, scene);
            }

            debrisMesh.material = debrisMat || fallbackMat;
            debrisMesh.parent = debrisParent;
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * pileRadius;
            const initialY = size / 2 + Math.random() * pileRadius * 0.3; // Stack less aggressively
            debrisMesh.position = new BABYLON.Vector3(Math.cos(angle) * radius, initialY, Math.sin(angle) * radius);
            debrisMesh.rotation = new BABYLON.Vector3(Math.random() * Math.PI, Math.random() * Math.PI*2, Math.random() * Math.PI); // Random rotation

            const impostorType = isBox ? BABYLON.PhysicsImpostor.BoxImpostor : BABYLON.PhysicsImpostor.SphereImpostor;
            const mass = 1.5 + Math.random() * 4;
            const friction = 0.6 + Math.random() * 0.3; // Slightly higher friction
            const restitution = 0.05 + Math.random() * 0.1;
            debrisMesh.physicsImpostor = new BABYLON.PhysicsImpostor(debrisMesh, impostorType, { mass, restitution, friction }, scene);
            debrisMesh.checkCollisions = true; // Keep for potential raycasting
            debrisMesh.receiveShadows = true; // Debris should receive shadows
            addShadowCaster(debrisMesh); // Debris should cast shadows

        } catch (e) { console.error(`Failed to create debris ${i}:`, e); }
    }
}


/**
 * Creates a ground decal (texture applied to ground or other horizontal surfaces)
 */
function createGroundDecal(scene, name, position, size, texturePath, rotationY = 0) {
    try {
        // Ensure texture path is correct
        const fullTexturePath = texturePath.startsWith("assets/") ? texturePath : `assets/textures/${texturePath}`;

        const decalPlane = BABYLON.MeshBuilder.CreatePlane(name, { size: size, sideOrientation: BABYLON.Mesh.DOUBLESIDE }, scene);
        decalPlane.position = new BABYLON.Vector3(position.x, position.y + 0.02, position.z);
        decalPlane.rotation.x = Math.PI / 2;
        decalPlane.rotation.z = rotationY;

        const decalMaterial = getCachedMaterial(name + "_mat", scene, { texturePath: fullTexturePath }, (sc, opts) => {
            const mat = new BABYLON.StandardMaterial(name + "_mat", sc);
            try {
                const decalTexture = new BABYLON.Texture(opts.texturePath, sc, true, false);
                decalTexture.hasAlpha = true;
                mat.diffuseTexture = decalTexture;
                mat.useAlphaFromDiffuseTexture = true;
                mat.alphaMode = BABYLON.Engine.ALPHA_PREMULTIPLIED_PORTERDUFF; // Often better blending for decals
                mat.backFaceCulling = false;
                mat.specularColor = new BABYLON.Color3(0.05, 0.05, 0.05);
                mat.zOffset = -2; // Render closer
            } catch (e) {
                console.error(`Failed to load decal texture ${opts.texturePath}:`, e);
                 mat.diffuseColor = new BABYLON.Color3(1,0,1); // Magenta fallback color
                 mat.alpha = 0.5;
            }
             return mat;
        });

        if (decalMaterial) {
             decalPlane.material = decalMaterial;
        } else {
             const fallbackMat = new BABYLON.StandardMaterial("fallbackDecalMat", scene);
             fallbackMat.diffuseColor = new BABYLON.Color3(1,0,1); fallbackMat.alpha = 0.5;
             decalPlane.material = fallbackMat;
        }

        decalPlane.isPickable = false;
        decalPlane.receiveShadows = true; // Decals should receive shadows

        return decalPlane;
    } catch (e) {
        console.error(`Failed to create decal ${name}:`, e);
        return null;
    }
}

/**
 * Creates an interactable game item (using GLB model)
 */
function createInteractableItem(scene, position) {
    const modelPath = "./assets/models/"; // Relative to HTML
    const modelFile = "energy.glb";

     const addShadowCaster = (mesh) => {
         if (scene.shadowGenerator && mesh) {
             scene.shadowGenerator.addShadowCaster(mesh, true);
         }
     };

    BABYLON.SceneLoader.ImportMeshAsync("", modelPath, modelFile, scene)
        .then(result => {
            if (!result.meshes || result.meshes.length === 0) {
                 throw new Error(`No meshes found in loaded GLB: ${modelFile}`);
            }

            let itemRoot = null;
            // Find the first mesh with geometry data, often the primary visible mesh
            for (let mesh of result.meshes) {
                 if (mesh.geometry && mesh.getTotalVertices() > 0) {
                     itemRoot = mesh;
                     break;
                 }
            }
            // Fallback to the __root__ mesh if it exists and others don't have geometry
             if (!itemRoot && result.meshes[0]?.name === "__root__") {
                  itemRoot = result.meshes[0];
                  // Find the actual visible mesh under the root if possible
                  let childMesh = itemRoot.getChildMeshes(false, (node) => node instanceof BABYLON.Mesh && node.getTotalVertices() > 0)[0];
                  if (childMesh) itemRoot = childMesh; // Use the child if found
                  else console.warn(`GLB root node '${result.meshes[0].name}' used, but no visible child mesh found.`);
             } else if (!itemRoot) {
                  itemRoot = result.meshes[0]; // Last resort: use the very first mesh node
                  console.warn(`Could not determine primary mesh in ${modelFile}, using first node: ${itemRoot.name}`);
             }


            itemRoot.name = "interactable_energy_" + BABYLON.Tools.RandomId();
            itemRoot.position = position.clone();
            itemRoot.scaling.scaleInPlace(0.8); // Adjust scale as needed
            itemRoot.computeWorldMatrix(true); // Update world matrix after position/scale changes


            itemRoot.metadata = { isItem: true, itemName: "Energy Sphere", itemValue: 25 };
            itemRoot.checkCollisions = true; // Enable standard collision checks

             try {
                  // Use SphereImpostor for better performance than MeshImpostor for small items
                  itemRoot.physicsImpostor = new BABYLON.PhysicsImpostor( itemRoot,
                      BABYLON.PhysicsImpostor.SphereImpostor,
                      { mass: 0.5, restitution: 0.2, friction: 0.6 }, scene );
             } catch (physErr) { console.error(`Failed physics for item ${itemRoot.name}:`, physErr); }

            addShadowCaster(itemRoot); // Items cast shadows
            // Ensure all child meshes also receive shadows if the GLB has a hierarchy
             itemRoot.getChildMeshes(false).forEach(m => m.receiveShadows = true);
             itemRoot.receiveShadows = true; // The root itself too


            // Bobbing Animation
             const bobAnim = new BABYLON.Animation( itemRoot.name + "_bob", "position.y", 30,
                 BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE );
             const startY = itemRoot.position.y;
             const bobHeight = 0.25;
             bobAnim.setKeys([ { frame: 0, value: startY }, { frame: 30, value: startY + bobHeight }, { frame: 60, value: startY } ]);
             const easingFunction = new BABYLON.SineEase();
             easingFunction.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEINOUT);
             bobAnim.setEasingFunction(easingFunction);
             itemRoot.animations = itemRoot.animations || [];
             itemRoot.animations.push(bobAnim);
             scene.beginAnimation(itemRoot, 0, 60, true, 0.8 + Math.random() * 0.4);

             // console.log(`Item '${itemRoot.metadata.itemName}' created at ${position}`);

        })
        .catch(error => {
            console.error(`Failed to load item model '${modelPath}${modelFile}':`, error);
             // Handle error, maybe spawn a placeholder?
        });
}


// --- UI Stubs ---
function setupPauseMenu(scene, engine) {
    // console.log("Setting up Pause Menu");
    const pauseMenuElement = document.getElementById("pauseMenu"); // Get reference once

    window.addEventListener("keydown", (ev) => {
        if (ev.key === "p" || ev.key === "P" || ev.key === "Escape") {
             if (scene && !scene.isDisposed) {
                 scene.gamePaused = !scene.gamePaused;
                 console.log("Game Paused:", scene.gamePaused);
                 if (pauseMenuElement) { // Check if element exists
                     pauseMenuElement.style.display = scene.gamePaused ? "block" : "none";
                 }
                 // Manage render loop if needed (often better to check pause state within loop)
                 // if (scene.gamePaused) engine.stopRenderLoop(); else engine.runRenderLoop(...);
             }
        }
    });
}

function setupInventoryMenu() {
    // console.log("Setting up Inventory Menu");
    const invMenuElement = document.getElementById("inventoryMenu"); // Get reference once

     window.addEventListener("keydown", (ev) => {
         if (ev.key === "i" || ev.key === "I") {
             if (invMenuElement) { // Check if element exists
                  const isVisible = invMenuElement.style.display === "block";
                  invMenuElement.style.display = isVisible ? "none" : "block";
                  console.log("Inventory Toggled:", !isVisible);
                  // Decide if inventory pauses the game
                  // if (scene && !scene.isDisposed) scene.gamePaused = !isVisible;
             }
         }
     });
}

// --- Game Initialization ---
const canvas = document.getElementById("renderCanvas");
if (!canvas) {
    console.error("FATAL: Could not find canvas element with ID 'renderCanvas'");
    alert("Error: Canvas element not found. Game cannot load."); // User-friendly message
    document.body.innerHTML = `<div style="color:red; padding: 20px; font-family: sans-serif;">Error: Canvas element 'renderCanvas' not found.</div>`;
} else {
    let engine;
    try {
        engine = new BABYLON.Engine(canvas, true, {
            preserveDrawingBuffer: true, stencil: true, antialias: true
        }, true); // Enable Hardware Scaling
        window.engine = engine; // Make global if needed
    } catch (e) {
         console.error("FATAL: Failed to create Babylon Engine.", e);
         alert("Error: Could not initialize graphics engine. Your browser might not be supported.");
         engine = null; // Ensure engine is null if creation fails
    }


    if (engine) { // Only proceed if engine was created successfully
         engine.displayLoadingUI();
         console.log("Displaying Loading UI");

        const startGame = async () => {
            console.log("Starting game initialization...");
            let scene = null; // Declare scene variable here
            try {
                scene = await createScene(engine, canvas);
                if (!scene) {
                     // createScene should have already alerted the user if fatal error occurred
                     console.error("Scene creation returned null. Aborting game start.");
                    engine.hideLoadingUI();
                    return;
                }
                console.log("Scene created successfully.");
                 engine.hideLoadingUI();
                 console.log("Hidden Loading UI");

                // --- Main Render Loop ---
                let lastTime = performance.now();
                engine.runRenderLoop(() => {
                     if (scene?.activeCamera && !scene.isDisposed) { // Check scene and camera validity
                        if (!scene.gamePaused) {
                            const currentTime = performance.now();
                            // Calculate delta time, capping at 0.1s (100ms) to prevent huge jumps if tabbed out
                            const deltaTime = Math.min(0.1, (currentTime - lastTime) / 1000.0);
                            lastTime = currentTime;

                            // --- Update Game Logic ---
                            if (window.player?.update) { window.player.update(deltaTime); }

                            // Update enemies - Safe iteration and cleanup
                            for (let i = scene.enemies.length - 1; i >= 0; i--) {
                                const enemy = scene.enemies[i];
                                if (enemy && !enemy.isDisposed) {
                                     if (enemy.update) { enemy.update(deltaTime); }
                                } else {
                                     scene.enemies.splice(i, 1); // Remove null or disposed enemy
                                }
                            }

                            if (scene.boss && !scene.boss.isDisposed && scene.boss.update) {
                                 scene.boss.update(deltaTime);
                            } else if (scene.boss && scene.boss.isDisposed) {
                                 scene.boss = null; // Clear reference if boss is disposed
                            }

                            // --- Render ---
                            scene.render();

                            // --- Update UI ---
                            updatePlayerHealthUI();
                            // Update FPS counter (optional)
                            // const fpsLabel = document.getElementById("fpsLabel");
                            // if (fpsLabel) fpsLabel.innerText = "FPS: " + engine.getFps().toFixed();
                        }
                    } else if (!scene || scene.isDisposed) {
                        console.log("Scene disposed or invalid, stopping render loop.");
                        engine.stopRenderLoop();
                     }
                });

            } catch (error) {
                console.error("Critical error during game start:", error);
                engine.hideLoadingUI();
                alert(`Critical Error during game start: ${error.message}. Check console.`);
                // Optional: Display error message on the page itself
            }
        };

        // Start the game initialization process
        startGame();

        // --- Window Resize Handling ---
        window.addEventListener("resize", () => {
            if (engine) {
                engine.resize();
                // console.log("Engine resized.");
            }
        });

    } // End if(engine) check
} // End else block for canvas check
