// ========== CONFIG ==========
const GAME = {
  resources: {
    iron: 0,
    water: 0,
    uranium: 0
  },
  mapSize: 50000,
  terrainHeight: 50,
  buildings: [],
  npcs: [],           
  enemyNPCs: [],     
  enemyBase: null,   
  bullets: [],       
  turrets: [],       
  terrainSegments: 400,
  selectedBuildingType: 0, // 0 for turret, 1 for light post
  keysPressed: { w: false, a: false, s: false, d: false },
  textures: {
    terrain: 'textures/terrain.jpg',
    buildings: [
      'textures/building_1.jpg',
      'textures/building_2.jpg',
      'textures/building_3.jpg',
      'textures/building_4.jpg',
      'textures/building_5.jpg'
    ],
    npc: 'textures/npc.jpg',
    enemyBase: 'textures/enemy.jpg'
  },
  maxNPCs: 10,
  maxEnemyNPCs: 5,
  maxUFOEnemyNPCs: 3
};

// Function to toggle between turret and light post selection
document.addEventListener('keydown', function(event) {
    if (event.key === 'L' || event.key === 'l') {
        GAME.selectedBuildingType = (GAME.selectedBuildingType + 1) % 2; // Toggle between 0 and 1
        const buildingType = GAME.selectedBuildingType === 0 ? "Turret" : "Light Post";
        console.log(`Selected Building Type: ${buildingType}`);
    }
});

// Click event to place the selected building
document.addEventListener('click', function(event) {
    // Assuming you have a function to convert screen coordinates to world coordinates
    const mousePosition = getMousePosition(event); // Replace this with your method to get the click position in 3D
    const position = new THREE.Vector3(mousePosition.x, mousePosition.y, mousePosition.z); // Adjust according to your scene

    if (GAME.selectedBuildingType === 0) {
        const turret = createTurret(position);
        GAME.scene.add(turret);
        GAME.turrets.push(turret);
        console.log("Turret placed at location:", position);
    } else if (GAME.selectedBuildingType === 1) {
        const lightPost = createLightPost(position);
        GAME.scene.add(lightPost);
        console.log("Light Post placed at location:", position);
    }
});

// Function to get mouse position (to be implemented)
function getMousePosition(event) {
    // Implement your logic here to get the click position in the 3D world
    // Example: use raycasting to determine the position on the map
    const rect = renderer.domElement.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    const vector = new THREE.Vector3(x, y, 0.5); // 0.5 to start from the middle of the screen
    vector.unproject(camera); // Unproject the mouse position to world coordinates

    const dir = vector.sub(camera.position).normalize();
    const distance = (GAME.terrainHeight - camera.position.y) / dir.y; // Find intersection with ground plane
    const position = camera.position.clone().add(dir.multiplyScalar(distance)); // Calculate world position

    return position;
}

// The rest of your existing code...

// Update resource UI, update resources, etc.


// Utility: clamp value between min and max
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

// Utility: get a random patrol point around a center within a given radius,
// ensuring the point stays on the map and with altitude between 30 and 150.
function getRandomPatrolPoint(center, radius) {
  const angle = Math.random() * Math.PI * 2;
  const r = Math.random() * radius;
  const x = clamp(center.x + r * Math.cos(angle), -GAME.mapSize / 2, GAME.mapSize / 2);
  const z = clamp(center.z + r * Math.sin(angle), -GAME.mapSize / 2, GAME.mapSize / 2);
  // For aerial NPCs, choose a random y between 30 and 150
  const y = clamp(30 + Math.random() * 120, 30, 150);
  return new THREE.Vector3(x, y, z);
}
// ========== AUDIO SETUP ==========
const backgroundSound1 = new Audio("wind.mp3"); // Ensure this file is in the correct directory
const backgroundSound2 = new Audio("ambient.mp3"); // Additional background sound
backgroundSound1.loop = true;
backgroundSound2.loop = true;
backgroundSound1.volume = 0.5; // Adjust volume as needed
backgroundSound2.volume = 0.3; // Adjust volume as needed

// Start background sound when user interacts
function startGame() {
  Promise.all([backgroundSound1.play(), backgroundSound2.play()])
    .then(() => console.log("Game started with background sound"))
    .catch(err => console.error("Audio playback failed:", err));
}

// Create a badass button to start the game
const startButton = document.createElement("button");
startButton.textContent = "INITIATE BETA TESTING SESSION";
startButton.style.position = "absolute";
startButton.style.top = "50%";
startButton.style.left = "50%";
startButton.style.transform = "translate(-50%, -50%)";
startButton.style.padding = "15px 30px";
startButton.style.fontSize = "20px";
startButton.style.fontWeight = "bold";
startButton.style.color = "white";
startButton.style.background = "linear-gradient(45deg, #ff0000, #660000)";
startButton.style.border = "2px solid #ffffff";
startButton.style.borderRadius = "10px";
startButton.style.boxShadow = "0px 0px 10px rgba(255, 0, 0, 0.8)";
startButton.style.cursor = "pointer";
startButton.style.transition = "transform 0.2s, box-shadow 0.2s";

startButton.addEventListener("mouseenter", () => {
  startButton.style.transform = "translate(-50%, -50%) scale(1.1)";
  startButton.style.boxShadow = "0px 0px 20px rgba(255, 0, 0, 1)";
});

startButton.addEventListener("mouseleave", () => {
  startButton.style.transform = "translate(-50%, -50%) scale(1)";
  startButton.style.boxShadow = "0px 0px 10px rgba(255, 0, 0, 0.8)";
});

document.body.appendChild(startButton);

startButton.addEventListener("click", () => {
  startGame();
  startButton.remove(); // Remove button after game starts
});
// ========== RESOURCE UI UPDATE ==========
function updateResourceUI() {
  document.getElementById('iron-count').innerText = GAME.resources.iron;
  document.getElementById('water-count').innerText = GAME.resources.water;
  document.getElementById('uranium-count').innerText = GAME.resources.uranium;
}
setInterval(updateResourceUI, 1000);// ========== UPDATE RESOURCES ==========
function updateResources() {
  const now = Date.now();
  GAME.buildings.forEach(building => {
    if (building.userData.resourceGenerator) {
      const timeElapsed = (now - building.userData.lastGenerationTime) / 1000; // seconds elapsed
      // Building type 0: generates uranium every 10 seconds
      if (building.userData.buildingType === 0 && timeElapsed >= 9) {
        GAME.resources.uranium += 1;
        building.userData.lastGenerationTime = now;
        console.log(`Type 0 building generated uranium. Total Uranium: ${GAME.resources.uranium}`);
      }
      // Building type 1: generates water every 5 seconds
      else if (building.userData.buildingType === 1 && timeElapsed >= 9) {
        GAME.resources.water += 1;
        building.userData.lastGenerationTime = now;
        console.log(`Type 1 building generated water. Total Water: ${GAME.resources.water}`);
      }
      // Building type 2: generates iron every 7 seconds
      else if (building.userData.buildingType === 2 && timeElapsed >= 9) {
        GAME.resources.iron += 1;
        building.userData.lastGenerationTime = now;
        console.log(`Type 2 building generated iron. Total Iron: ${GAME.resources.iron}`);
      }
    }
  });
}
// Event Listener for key '8' to spawn turret at building location
document.addEventListener('keydown', function(event) {
    if (event.key === '8') {
        spawnTurretAtBuildingLocation();
    }
});

// Array to store building positions
let buildingLocations = [
    new THREE.Vector3(100, 0, 100),
    new THREE.Vector3(200, 0, 200),
    new THREE.Vector3(300, 0, 300)
];

// Function to spawn turret at building location
function spawnTurretAtBuildingLocation() {
    const buildingIndex = Math.floor(Math.random() * buildingLocations.length);
    const spawnLocation = buildingLocations[buildingIndex];
    
    const turret = createTurret(spawnLocation);
    GAME.scene.add(turret);
    GAME.turrets.push(turret);
    
    console.log("Turret spawned at location:", spawnLocation);
}

// Create turret object
function createTurret(position) {
    const turret = new THREE.Object3D();
    
    // Create turret base (height increased)
    const baseGeometry = new THREE.CylinderGeometry(15, 20, 15, 8); // Increased height from 10 to 15
    const baseMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    turret.add(base);

    // Create turret gun (height increased)
    const gunGeometry = new THREE.BoxGeometry(8, 8, 50); // Increased length from 30 to 50
    const gunMaterial = new THREE.MeshStandardMaterial({ color: 0x666666 });
    const gun = new THREE.Mesh(gunGeometry, gunMaterial);
    gun.position.y = 15; // Adjusted position to match increased height
    gun.position.z = 15; // Adjusted for better balance with height
    turret.add(gun);

    // Create and add the light emitter (brightness increased)
    const light = new THREE.PointLight(0xffaa00, 3, 100); // Increased intensity from 1 to 3
    light.position.set(0, 25, 0); // Positioned at the top of the turret (base height + gun height)
    turret.add(light);

    // Optional: Create a light helper for visualizing the light source
    const lightHelper = new THREE.PointLightHelper(light, 1); // Size of the helper sphere
    turret.add(lightHelper);
    
    // Position the turret
    turret.position.copy(position);
    
    // Turret properties
    turret.userData = {
        cooldown: 0,
        target: null,
        bulletSpeed: 20,
        range: 300,
        fireRate: 0.5,  // Shots per second (increased fire rate)
        lastShot: Date.now(),
        damage: 20
    };
    
    return turret;
}

// Event Listener for key 'L' to spawn the light post anywhere
document.addEventListener('keydown', function(event) {
    if (event.key === 'L' || event.key === 'l') {
        spawnLightPost();
    }
});

// Function to spawn a light post
function spawnLightPost() {
    const lightPost = createLightPost(new THREE.Vector3(0, 0, 0)); // Create light post at origin
    GAME.scene.add(lightPost);
    console.log("Light post spawned at the scene origin.");
}

// Function to create a light post with three parts: base, mid-section, and holographic bulb
function createLightPost(position) {
    const lightPost = new THREE.Object3D();

    // Create light post base
    const baseGeometry = new THREE.CylinderGeometry(5, 5, 10, 8);
    const baseMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    lightPost.add(base);

    // Create mid-section
    const midGeometry = new THREE.CylinderGeometry(4, 4, 20, 8);
    const midMaterial = new THREE.MeshStandardMaterial({ color: 0x666666 });
    const midSection = new THREE.Mesh(midGeometry, midMaterial);
    midSection.position.y = 15; // Position it above the base
    lightPost.add(midSection);

    // Create holographic bulb at the top
    const bulbGeometry = new THREE.SphereGeometry(6, 32, 32);
    const bulbMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.8,
        emissive: 0xaaaaaa,
        emissiveIntensity: 1
    });
    const bulb = new THREE.Mesh(bulbGeometry, bulbMaterial);
    bulb.position.y = 30; // Position it above the mid-section
    lightPost.add(bulb);

    // Create the point light source
    const light = new THREE.PointLight(0xffaa00, 3, 100);
    light.position.set(0, 30, 0); // Position at the top of the bulb
    lightPost.add(light);

    // Optional: Create a light helper for visualizing the light source
    const lightHelper = new THREE.PointLightHelper(light, 1);
    lightPost.add(lightHelper);

    // Position the light post
    lightPost.position.copy(position);
    
    return lightPost;
}



// Create bullet object
function createBullet(position, direction) {
    const bulletGeometry = new THREE.SphereGeometry(3, 8, 8);
    const bulletMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
    
    bullet.position.copy(position);
    bullet.userData = {
        direction: direction,
        speed: 50,
        lifeTime: 5000,
        spawnTime: Date.now(),
        damage: 20
    };
    
    return bullet;
}

// Update turrets
function updateTurrets() {
    const now = Date.now();

    GAME.turrets.forEach(turret => {
        // Find target if none exists or current target is dead
        if (!turret.userData.target || turret.userData.target.userData.isDead) {
            let closestEnemy = null;
            let closestDistance = turret.userData.range;

            GAME.enemyNPCs.forEach(enemy => {
                if (!enemy.userData.isDead) {
                    const distance = turret.position.distanceTo(enemy.position);
                    if (distance < closestDistance) {
                        closestEnemy = enemy;
                        closestDistance = distance;
                    }
                }
            });

            turret.userData.target = closestEnemy;
        }

        // Handle targeting and shooting
        if (turret.userData.target) {
            const distanceToTarget = turret.position.distanceTo(turret.userData.target.position);
            
            // Check if target is still in range
            if (distanceToTarget > turret.userData.range) {
                turret.userData.target = null;
                return;
            }

            // Calculate direction to target
            const targetDir = new THREE.Vector3()
                .subVectors(turret.userData.target.position, turret.position)
                .normalize();

            // Rotate turret to face target
            turret.lookAt(turret.userData.target.position);

            // Shoot if cooldown is ready
            if (now - turret.userData.lastShot >= (1000 / turret.userData.fireRate)) {
                const bulletSpawnPos = turret.position.clone().add(
                    targetDir.clone().multiplyScalar(25)
                );
                
                const bullet = createBullet(bulletSpawnPos, targetDir.clone());
                GAME.bullets.push(bullet);
                GAME.scene.add(bullet);

                turret.userData.lastShot = now;
            }
        }
    });
}

// Update bullets
function updateBullets() {
    const now = Date.now();
    
    for (let i = GAME.bullets.length - 1; i >= 0; i--) {
        const bullet = GAME.bullets[i];
        
        // Move bullet
        const movement = bullet.userData.direction.clone()
            .multiplyScalar(bullet.userData.speed);
        bullet.position.add(movement);
        
        // Check lifetime
        if (now - bullet.userData.spawnTime > bullet.userData.lifeTime) {
            GAME.scene.remove(bullet);
            GAME.bullets.splice(i, 1);
            continue;
        }
        
        // Check collisions
        GAME.enemyNPCs.forEach(enemy => {
            if (!enemy.userData.isDead) {
                const distance = bullet.position.distanceTo(enemy.position);
                if (distance < 20) {
                    // Initialize health if it doesn't exist
                    if (typeof enemy.userData.health === 'undefined') {
                        enemy.userData.health = 100;
                    }
                    
                    // Apply damage
                    enemy.userData.health -= bullet.userData.damage;
                    if (enemy.userData.health <= 0) {
                        enemy.userData.isDead = true;
                        // You might want to add death effects here
                    }
                    
                    // Remove bullet
                    GAME.scene.remove(bullet);
                    GAME.bullets.splice(i, 1);
                }
            }
        });
    }
}

// Game loop integration
function gameLoop() {
    updateTurrets();
    updateBullets();
    // Your existing game loop code...
}

// Export necessary functions
window.spawnTurretAtBuildingLocation = spawnTurretAtBuildingLocation;
window.updateTurrets = updateTurrets;
window.updateBullets = updateBullets;
// ========== UFO ENEMY NPC ==========
function createUFOEnemyNPC() {
  const textureLoader = new THREE.TextureLoader();
  const texturePath = "textures/ufo.png"; // Define the texture path
  const texture = textureLoader.load(texturePath, 
    () => console.log(`Texture loaded: ${texturePath}`), 
    undefined, 
    (error) => console.error(`Error loading texture: ${texturePath}`, error)
  );

  // Use a disk-like geometry (a very flat cylinder)
  const geometry = new THREE.CylinderGeometry(10, 100, 50, 50);
  geometry.rotateX(Math.PI / 2);

  const material = new THREE.MeshStandardMaterial({
    map: texture,
    emissive: new THREE.Color(0x00ffff)
  });

  const ufo = new THREE.Mesh(geometry, material);
  ufo.castShadow = true;
  ufo.receiveShadow = true;

  // Position the UFO above the enemy base, or at a default position
  if (GAME.enemyBase) {
    ufo.position.copy(GAME.enemyBase.position);
    ufo.position.y += 200; // Hover 200 units above the base
  } else {
    ufo.position.set(0, 200, 0);
  }

  ufo.userData.speed = 3;
  ufo.userData.targetPoint = getRandomPatrolPoint(ufo.position, 500);
  ufo.userData.isUFO = true; // Mark this enemy as a UFO-type
  ufo.userData.texturePath = texturePath; // Store the texture path for debugging

  return ufo;
}


// ========== SETUP ==========
function init() {
  const scene = new THREE.Scene();
  GAME.scene = scene;
  scene.background = new THREE.Color(0x4A0404);

  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 150000);
  camera.position.set(500, 400, 500);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  document.body.appendChild(renderer.domElement);

 // ========== LIGHTING SETUP ==========
const light = new THREE.DirectionalLight(0xFF4500, 0.5); // Dim orange light for Mars-like feel
light.position.set(500, 1000, 500);
light.castShadow = true;
scene.add(light);

const ambientLight = new THREE.AmbientLight(0x330000, 0.5); // Dark red ambient light for eerie effect
scene.add(ambientLight);

const fogColor = new THREE.Color(0x220000); // Deep red fog for ominous atmosphere
scene.fog = new THREE.Fog(fogColor, 500, 10000);
scene.background = fogColor;

// Animation for pulsing light effect with slower transitions (1 minute per cycle)
let lightIntensity = 0.4;  // Starting darker intensity
let lightDirection = 0.0001; // Slower intensity change
const minIntensity = 0.2; // Lower bound (darker)
const maxIntensity = 1.0; // Upper bound (lighter)

// Adding orangish tone to the light and reducing the red dominance
function animateLight() {
  lightIntensity += lightDirection;

  if (lightIntensity <= minIntensity || lightIntensity >= maxIntensity) {
    lightDirection *= -1; // Reverse direction when limits are reached
  }

  light.intensity = lightIntensity;

  // Shift color from dark orange/red to a lighter orange/yellow tone
  const colorShift = new THREE.Color(0xFF4500) // Base orange color
    .lerp(new THREE.Color(0xFFFF00), Math.abs(Math.sin(lightIntensity))); // Shift to yellowish tone as it gets brighter
  
  light.color.set(colorShift);

  requestAnimationFrame(animateLight); // Keep the animation going
}

// Create random bright "shiners" in the daylight
function createShiners() {
  for (let i = 0; i < 10; i++) {
    const x = Math.random() * 2000 - 1000; // Random x position in the scene
    const y = Math.random() * 1000 + 500;  // Random y position
    const z = Math.random() * 2000 - 1000; // Random z position

    const shiner = new THREE.PointLight(0xFFFF00, Math.random() * 1.5 + 1, 500); // Yellowish "shiner"
    shiner.position.set(x, y, z);
    scene.add(shiner);
  }
}

// Start animating the light and adding shiners
animateLight();
createShiners();


  // Ground
  const ground = createTerrain();
  scene.add(ground);

  // Controls
  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.maxDistance = 2000;
  controls.minDistance = 50;

  // -----------------------
  // KEYBOARD CONTROLS
  // -----------------------
  window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    console.log('Key pressed:', key);
    if (key >= '1' && key <= '5') {
      GAME.selectedBuildingType = parseInt(key) - 1;
      console.log('Selected building type:', GAME.selectedBuildingType);
    } else if (key === '7') {
      if (GAME.npcs.length < GAME.maxNPCs) {
        const npc = createNPC(controls.target);
        scene.add(npc);
        GAME.npcs.push(npc);
        console.log('Spawned friendly NPC. Total:', GAME.npcs.length);
      } else {
        console.log('Max friendly NPCs reached.');
      }
    } else if (key === 'g') {
      if (!GAME.enemyBase) {
        GAME.enemyBase = createEnemyBase();
        scene.add(GAME.enemyBase);
        console.log('Enemy base spawned.');
      }
    }
    if (['w', 'a', 's', 'd'].includes(key)) {
      GAME.keysPressed[key] = true;
    }
  });

  window.addEventListener('keyup', (e) => {
    const key = e.key.toLowerCase();
    if (['w', 'a', 's', 'd'].includes(key)) {
      GAME.keysPressed[key] = false;
    }
  });

  // -----------------------
  // MOUSE CLICK HANDLER (NPC selection, building placement, commands)
  // -----------------------
  window.addEventListener('click', (e) => {
    const mouse = new THREE.Vector2(
      (e.clientX / window.innerWidth) * 2 - 1,
      -(e.clientY / window.innerHeight) * 2 + 1
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);

    const npcIntersects = raycaster.intersectObjects(GAME.npcs);
    if (npcIntersects.length > 0) {
      const npc = npcIntersects[0].object;
      npc.userData.selected = !npc.userData.selected;
      npc.material.emissive = npc.userData.selected ? new THREE.Color(0x00ff00) : new THREE.Color(0x000000);
      return;
    }

    const groundIntersects = raycaster.intersectObject(ground);
    if (groundIntersects.length > 0) {
      const point = groundIntersects[0].point;
      let anySelected = false;
      GAME.npcs.forEach(npc => {
        if (npc.userData.selected) {
          anySelected = true;
          npc.userData.patrolCenter.copy(point);
          npc.userData.targetPoint = getRandomPatrolPoint(point, npc.userData.patrolRadius);
          npc.userData.selected = false;
          npc.material.emissive = new THREE.Color(0x000000);
        }
      });
      if (!anySelected) {
        if (GAME.selectedBuildingType !== null) {
          const building = createBuilding(point, GAME.selectedBuildingType);
          scene.add(building);
          GAME.buildings.push(building);
          GAME.selectedBuildingType = null;
          console.log('Building placed. Type reset.');
        }
      }
    }

    // Custom cursor click animation
    cursorContainer.classList.add('clicked');
    setTimeout(() => cursorContainer.classList.remove('clicked'), 200);
  });

  // -----------------------
  // GAME LOOP
  // -----------------------
  let enemySpawnTimer = 0;
  const enemySpawnThreshold = 100; // threshold for normal enemy spawns
  function animate() {
    requestAnimationFrame(animate);

    updateResources();
    updateNPCs();
    updateEnemyNPCs();
    updateBullets();

    // Normal enemy spawn from enemy base
    if (GAME.enemyBase) {
      enemySpawnTimer++;
      if (enemySpawnTimer > enemySpawnThreshold && GAME.enemyNPCs.length < GAME.maxEnemyNPCs) {
        const enemyNPC = createEnemyNPC();
        scene.add(enemyNPC);
        GAME.enemyNPCs.push(enemyNPC);
        console.log('Normal enemy spawned. Total:', GAME.enemyNPCs.length);
        enemySpawnTimer = 0;
      }
    }

    // If water reaches 100, spawn UFO enemies (if under max)
    if (GAME.resources.water >= 100) {
      const currentUFOs = GAME.enemyNPCs.filter(npc => npc.userData.isUFO);
      if (currentUFOs.length < GAME.maxUFOEnemyNPCs) {
        const ufo = createUFOEnemyNPC();
        scene.add(ufo);
        GAME.enemyNPCs.push(ufo);
        console.log('UFO enemy spawned!');
      }
    }

    // Optional Camera movement (WASD)
    if (GAME.keysPressed.w || GAME.keysPressed.s || GAME.keysPressed.a || GAME.keysPressed.d) {
      const moveSpeed = 20;
      const direction = new THREE.Vector3();
      camera.getWorldDirection(direction);
      direction.y = 0;
      direction.normalize();

      const right = new THREE.Vector3();
      right.crossVectors(new THREE.Vector3(0, 1, 0), direction).normalize();

      const delta = new THREE.Vector3();
      if (GAME.keysPressed.w) delta.addScaledVector(direction, moveSpeed);
      if (GAME.keysPressed.s) delta.addScaledVector(direction, -moveSpeed);
      if (GAME.keysPressed.a) delta.addScaledVector(right, -moveSpeed);
      if (GAME.keysPressed.d) delta.addScaledVector(right, moveSpeed);

      camera.position.add(delta);
      controls.target.add(delta);
    }

    controls.update();
    renderer.render(scene, camera);
  }
  animate();
  window.onresize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  };
}

// ========== BUILDINGS ==========
function createBuilding(position, type) {
  // Texture loader for all building types
  const textureLoader = new THREE.TextureLoader();
  const texture = textureLoader.load(GAME.textures.buildings[type]);

  let geometry, offset;
  switch (type) {
    case 0:
      // Building type 0: Procedural box with futuristic details
      geometry = new THREE.BoxGeometry(200, 300, 200); // Taller box for type 0
      offset = 150; // Adjust height offset
      break;
    case 1:
      geometry = new THREE.CylinderGeometry(50, 50, 300, 32);
      offset = 150;
      break;
    case 2:
      geometry = new THREE.ConeGeometry(150, 300, 4);
      offset = 150;
      break;
    case 3:
      geometry = new THREE.SphereGeometry(120, 32, 32);
      offset = 120;
      break;
    case 4:
      geometry = new THREE.TorusGeometry(100, 40, 16, 100);
      offset = 140;
      break;
    default:
      geometry = new THREE.BoxGeometry(200, 200, 200);
      offset = 100;
  }

  const material = new THREE.MeshStandardMaterial({ map: texture });
  const mainMesh = new THREE.Mesh(geometry, material);
  mainMesh.castShadow = true;
  mainMesh.receiveShadow = true;

  // Create a group for the building so we can add extra details
  const building = new THREE.Group();
  building.add(mainMesh);

  // Add cooler sci-fi details for each building type
  switch (type) {
    case 0:
      // Box (type 0): Add multiple floating panels for a futuristic look
      for (let i = 0; i < 4; i++) {
        const panelGeo = new THREE.BoxGeometry(40, 20, 2);
        const panelMat = new THREE.MeshStandardMaterial({
          color: 0x3366ff,
          transparent: true,
          opacity: 0.75,
          emissive: 0x001133
        });
        const panel = new THREE.Mesh(panelGeo, panelMat);
        panel.position.set(
          (Math.random() - 0.5) * 150, // Random X position
          50 + i * 60, // Stack panels vertically
          (Math.random() - 0.5) * 150 // Random Z position
        );
        panel.castShadow = true;
        panel.receiveShadow = true;
        building.add(panel);
      }
      break;
    case 1:
      // Cylinder: add a glowing floating ring
      const ringGeo = new THREE.TorusGeometry(55, 5, 16, 100);
      const ringMat = new THREE.MeshStandardMaterial({
        color: 0x00ffcc,
        emissive: 0x003333
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 150;
      ring.castShadow = true;
      ring.receiveShadow = true;
      building.add(ring);
      break;
    case 2:
      // Cone: add a secondary layered cone detail
      const detailConeGeo = new THREE.ConeGeometry(130, 80, 4);
      const detailConeMat = new THREE.MeshStandardMaterial({
        color: 0xff8800,
        emissive: 0x442200
      });
      const detailCone = new THREE.Mesh(detailConeGeo, detailConeMat);
      detailCone.position.y = 180;
      detailCone.castShadow = true;
      detailCone.receiveShadow = true;
      building.add(detailCone);
      break;
    case 3:
      // Sphere: add an orbiting ring for a dynamic look
      const orbitRingGeo = new THREE.TorusGeometry(140, 5, 16, 100);
      const orbitRingMat = new THREE.MeshStandardMaterial({
        color: 0xff00ff,
        emissive: 0x220022
      });
      const orbitRing = new THREE.Mesh(orbitRingGeo, orbitRingMat);
      orbitRing.rotation.x = Math.PI / 2;
      orbitRing.castShadow = true;
      orbitRing.receiveShadow = true;
      building.add(orbitRing);
      break;
    case 4:
      // Torus: add an inner rotating torus for extra flair
      const innerTorusGeo = new THREE.TorusGeometry(70, 10, 16, 100);
      const innerTorusMat = new THREE.MeshStandardMaterial({
        color: 0x99ff33,
        emissive: 0x113311
      });
      const innerTorus = new THREE.Mesh(innerTorusGeo, innerTorusMat);
      innerTorus.rotation.x = Math.PI / 2;
      innerTorus.castShadow = true;
      innerTorus.receiveShadow = true;
      building.add(innerTorus);
      break;
    default:
      // Default box: add a futuristic holographic panel
      const panelGeo = new THREE.BoxGeometry(60, 30, 2);
      const panelMat = new THREE.MeshStandardMaterial({
        color: 0x3366ff,
        transparent: true,
        opacity: 0.75,
        emissive: 0x001133
      });
      const panel = new THREE.Mesh(panelGeo, panelMat);
      panel.position.set(0, 70, 110);
      panel.castShadow = true;
      panel.receiveShadow = true;
      building.add(panel);
  }

  building.position.copy(position);
  building.position.y += offset;
  building.castShadow = true;
  building.receiveShadow = true;

  // Optionally mark certain building types for resource generation
  if (type >= 0 && type <= 2) {
    building.userData.resourceGenerator = true;
    building.userData.lastGenerationTime = Date.now();
    building.userData.buildingType = type;
  }

  GAME.scene.add(building);
  return building;
}


// ========== TERRAIN ==========
function createTerrain() {
  const geometry = new THREE.PlaneGeometry(GAME.mapSize, GAME.mapSize, GAME.terrainSegments, GAME.terrainSegments);
  const textureLoader = new THREE.TextureLoader();
  const texture = textureLoader.load(GAME.textures.terrain);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(10, 10);
  const material = new THREE.MeshStandardMaterial({ map: texture });
  const vertices = geometry.attributes.position.array;
  for (let i = 0; i < vertices.length; i += 3) {
    const x = vertices[i];
    const y = vertices[i + 1];
    vertices[i + 2] = (Math.sin(x / 100) * 15 + Math.cos(y / 80) * 12 + Math.sin((x + y) / 150) * 9);
    if (Math.abs(x) < 500) vertices[i + 2] -= 50; // Deep canyon in the middle
    if (Math.random() < 0.005) vertices[i + 2] -= Math.random() * 30; // Small craters
    if (Math.random() < 0.001) vertices[i + 2] -= Math.random() * 80; // Large craters
  }
  geometry.computeVertexNormals();
  const ground = new THREE.Mesh(geometry, material);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  return ground;
}







// ========== FRIENDLY NPC (Pyramid Ships with Scanning Light) ==========
function createNPC(patrolCenter) {
  const textureLoader = new THREE.TextureLoader();
  const texture = textureLoader.load(GAME.textures.npc);

  // Create pyramid-like geometry using a ConeGeometry with 4 segments (a square base pyramid)
  const geometry = new THREE.ConeGeometry(10, 40, 4);
  // Rotate so the base is squarely aligned
  geometry.rotateY(Math.PI / 4);

  // Create material with emissive properties for extra glow
  const material = new THREE.MeshStandardMaterial({
    map: texture,
    emissive: new THREE.Color(0xffffff)
  });
  const npc = new THREE.Mesh(geometry, material);
  npc.castShadow = true;
  npc.receiveShadow = true;

  // Set initial random position around the patrol center.
  const spawnRadius = 500;
  npc.position.copy(getRandomPatrolPoint(patrolCenter, spawnRadius));
  npc.userData.patrolCenter = patrolCenter.clone();
  npc.userData.patrolRadius = 500;
  npc.userData.speed = 2;
  npc.userData.targetPoint = getRandomPatrolPoint(npc.userData.patrolCenter, npc.userData.patrolRadius);
  npc.userData.selected = false;

  // Attach a spotlight to simulate a scanning beam shining on the ground.
  // The spotlight is positioned at the pyramid's apex and aimed downward.
  const scanLight = new THREE.SpotLight(0x00ffcc, 2, 300, Math.PI / 6, 0.5, 1);
  // Position the light at the top of the pyramid (adjust as needed)
  scanLight.position.set(0, 20, 0);
  // Create a target for the spotlight that is directly below the NPC
  const scanTarget = new THREE.Object3D();
  scanTarget.position.set(0, -30, 0);
  npc.add(scanTarget);
  scanLight.target = scanTarget;
  npc.add(scanLight);

  return npc;
}

function updateNPCs() {
  GAME.npcs.forEach(npc => {
    const direction = new THREE.Vector3().subVectors(npc.userData.targetPoint, npc.position);
    const distance = direction.length();
    if (distance < 10) {
      npc.userData.targetPoint = getRandomPatrolPoint(npc.userData.patrolCenter, npc.userData.patrolRadius);
    } else {
      direction.normalize();
      npc.position.addScaledVector(direction, npc.userData.speed);
      npc.lookAt(npc.position.clone().add(direction));
    }
  });
}


// ========== ENEMY BASE ==========
function createEnemyBase() {
  const textureLoader = new THREE.TextureLoader();
  const texture = textureLoader.load(GAME.textures.enemyBase);

  // Main base structure (a large box)
  const baseGeometry = new THREE.BoxGeometry(3000, 3000, 3000);
  const baseMaterial = new THREE.MeshStandardMaterial({ map: texture });
  const baseMesh = new THREE.Mesh(baseGeometry, baseMaterial);
  baseMesh.castShadow = true;
  baseMesh.receiveShadow = true;

  // Create spikes to add a menacing look
  const spikeGeometry = new THREE.ConeGeometry(100, 300, 8);
  const spikeMaterial = new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0x000000 });
  const spikes = new THREE.Group();
  // Place spikes around the top surface of the base
  const spikeCount = 12;
  for (let i = 0; i < spikeCount; i++) {
    const spike = new THREE.Mesh(spikeGeometry, spikeMaterial);
    // Distribute spikes in a circle on the top face
    const angle = (i / spikeCount) * Math.PI * 2;
    const radius = 1500; // half the base size, roughly
    spike.position.set(Math.cos(angle) * radius, 1500 + 150, Math.sin(angle) * radius);
    // Rotate the spike so that it points outward
    spike.lookAt(new THREE.Vector3(Math.cos(angle) * (radius + 300), spike.position.y, Math.sin(angle) * (radius + 300)));
    spike.castShadow = true;
    spike.receiveShadow = true;
    spikes.add(spike);
  }

  // Combine the main base and spikes into one group
  const enemyBaseGroup = new THREE.Group();
  enemyBaseGroup.add(baseMesh);
  enemyBaseGroup.add(spikes);
  enemyBaseGroup.position.set(-2000, 150, -2000);
  return enemyBaseGroup;
}

// ========== ENEMY NPC ==========
function createEnemyNPC() {
  const textureLoader = new THREE.TextureLoader();
  const texture = textureLoader.load(GAME.textures.npc);

  // Create a group to hold the composite enemy NPC
  const enemy = new THREE.Group();

  // Main body: use a Capsule if available, otherwise a cylinder, scaled to look bulkier
  let bodyGeometry;
  if (typeof THREE.CapsuleGeometry !== 'undefined') {
    bodyGeometry = new THREE.CapsuleGeometry(10, 100, 8, 16);
  } else {
    bodyGeometry = new THREE.CylinderGeometry(10, 10, 150, 16);
  }
  const bodyMaterial = new THREE.MeshStandardMaterial({ map: texture, emissive: new THREE.Color(0xff0000) });
  const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  enemy.add(bodyMesh);

  // Add horns/spikes on the top for a scary look
  const hornGeometry = new THREE.ConeGeometry(5, 20, 8);
  const hornMaterial = new THREE.MeshStandardMaterial({ color: 0x880000, emissive: 0x330000 });
  const hornCount = 6;
  for (let i = 0; i < hornCount; i++) {
    const horn = new THREE.Mesh(hornGeometry, hornMaterial);
    const angle = (i / hornCount) * Math.PI * 2;
    // Position horns evenly around the top of the body
    horn.position.set(Math.cos(angle) * 12, 50, Math.sin(angle) * 12);
    horn.rotation.set(-Math.PI / 2, angle, 0);
    horn.castShadow = true;
    horn.receiveShadow = true;
    enemy.add(horn);
  }

  // Add arms: two short, rotated cylinders for a rugged look
  const armGeometry = new THREE.CylinderGeometry(3, 3, 50, 8);
  const armMaterial = new THREE.MeshStandardMaterial({ color: 0x660000, emissive: 0x220000 });
  for (let side = -1; side <= 1; side += 2) {
    const arm = new THREE.Mesh(armGeometry, armMaterial);
    arm.rotation.z = Math.PI / 2;
    arm.position.set(0, 20, side * 20);
    arm.castShadow = true;
    arm.receiveShadow = true;
    enemy.add(arm);
  }

  // Position the enemy randomly around the enemy base
  const spawnRadius = 300;
  enemy.position.copy(getRandomPatrolPoint(GAME.enemyBase.position, spawnRadius));
  enemy.userData.speed = 2.5;
  enemy.userData.targetPoint = getRandomPatrolPoint(GAME.enemyBase.position, 300);
  return enemy;
}

// ========== UPDATE ENEMY NPCs ==========
function updateEnemyNPCs() {
  GAME.enemyNPCs.forEach((enemy) => {
    if (enemy.userData.isUFO) {
      // UFO enemy behavior
      let target = null;
      let minDist = Infinity;
      GAME.npcs.forEach(friendly => {
        const d = enemy.position.distanceTo(friendly.position);
        if (d < minDist) {
          minDist = d;
          target = friendly;
        }
      });
      if (target) {
        const direction = new THREE.Vector3().subVectors(target.position, enemy.position).normalize();
        enemy.position.addScaledVector(direction, enemy.userData.speed);
        enemy.lookAt(enemy.position.clone().add(direction));
      } else {
        // Hover above the enemy base with a bobbing effect
        if (GAME.enemyBase) {
          enemy.position.x = GAME.enemyBase.position.x;
          enemy.position.z = GAME.enemyBase.position.z;
        }
        enemy.position.y = 200 + Math.sin(Date.now() * 0.001) * 10;
      }
    } else {
      // Normal enemy behavior
      let target = null;
      let minDist = Infinity;
      GAME.npcs.forEach(friendly => {
        const d = enemy.position.distanceTo(friendly.position);
        if (d < minDist) {
          minDist = d;
          target = friendly;
        }
      });
      if (target) {
        const direction = new THREE.Vector3().subVectors(target.position, enemy.position).normalize();
        enemy.position.addScaledVector(direction, enemy.userData.speed);
        enemy.lookAt(enemy.position.clone().add(direction));
        if (minDist < 10) {
          GAME.scene.remove(target);
          GAME.npcs = GAME.npcs.filter(npc => npc !== target);
          console.log('Enemy killed a friendly NPC.');
          const deathSound = new Audio('sounds/friendly_death.mp3');
          deathSound.play();
        }
      } else {
        const direction = new THREE.Vector3().subVectors(enemy.userData.targetPoint, enemy.position);
        const distance = direction.length();
        if (distance < 10) {
          enemy.userData.targetPoint = getRandomPatrolPoint(GAME.enemyBase.position, 300);
        } else {
          direction.normalize();
          enemy.position.addScaledVector(direction, enemy.userData.speed);
          enemy.lookAt(enemy.position.clone().add(direction));
        }
      }
    }
  });
}



// ========== CUSTOM CURSOR ==========
const cursorContainer = document.createElement('div');
cursorContainer.classList.add('custom-cursor-container');
cursorContainer.style.position = 'absolute';
cursorContainer.style.pointerEvents = 'none';
cursorContainer.style.transform = 'translate(-50%, -50%)';
cursorContainer.style.zIndex = '10000';
cursorContainer.style.animation = 'float 4s ease-in-out infinite';

const cursorImage = document.createElement('div');
cursorImage.classList.add('custom-cursor-image');
cursorImage.style.backgroundImage = 'url("textures/ORDINARY!.png")';
cursorImage.style.backgroundSize = 'contain';
cursorImage.style.backgroundRepeat = 'no-repeat';
cursorImage.style.width = '220px';
cursorImage.style.height = '150px';
cursorImage.style.animation = 'wavy 3s ease-in-out infinite';

cursorContainer.appendChild(cursorImage);
document.body.appendChild(cursorContainer);

// Hide the default mouse cursor
document.body.style.cursor = 'none';

// Add our CSS animations and electricity effect styles
const style = document.createElement('style');
style.innerHTML = `
@keyframes wavy {
  0% { transform: rotate(0deg); }
  50% { transform: rotate(5deg); }
  100% { transform: rotate(0deg); }
}
@keyframes float {
  0% { transform: translate(-50%, -50%) translateY(0px); }
  50% { transform: translate(-50%, -50%) translateY(-10px); }
  100% { transform: translate(-50%, -50%) translateY(0px); }
}
.custom-cursor-container.clicked {
  transform: translate(-50%, -50%) scale(1.2);
  transition: transform 0.2s ease-out;
}

/* Electricity effect styling */
.electricity-effect {
  position: absolute;
  pointer-events: none;
  width: 100px;
  height: 100px;
  background: url("textures/electricity.png") no-repeat center center;
  background-size: contain;
  transform: translate(-50%, -50%);
  z-index: 10001;
  animation: electricity 0.5s ease-out forwards;
}

@keyframes electricity {
  0% { opacity: 1; transform: translate(-50%, -50%) scale(0.5); }
  100% { opacity: 0; transform: translate(-50%, -50%) scale(1.5); }
}
`;
document.head.appendChild(style);

// Update custom cursor position to follow the mouse
document.addEventListener('mousemove', (e) => {
  cursorContainer.style.left = `${e.clientX}px`;
  cursorContainer.style.top = `${e.clientY}px`;
});

// Animate the cursor and create an electricity effect on click
document.addEventListener('mousedown', (e) => {
  // Scale up the cursor
  cursorContainer.classList.add('clicked');
  
  // Create an electricity effect element at the click location
  const effect = document.createElement('div');
  effect.classList.add('electricity-effect');
  effect.style.left = `${e.clientX}px`;
  effect.style.top = `${e.clientY}px`;
  document.body.appendChild(effect);
  
  // Remove the electricity effect after the animation duration
  setTimeout(() => {
    effect.remove();
  }, 500);
});

// Remove the clicked scaling shortly after releasing the mouse
document.addEventListener('mouseup', () => {
  setTimeout(() => {
    cursorContainer.classList.remove('clicked');
  }, 100);
});

style.innerHTML += `
  #win-screen {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.8);
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    z-index: 2000;
    color: white;
    font-family: Arial, sans-serif;
  }
  
  #win-screen h1 {
    font-size: 4em;
    margin-bottom: 20px;
    color: #FFD700;
    text-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
  }
  
  #win-screen p {
    font-size: 1.5em;
    margin-bottom: 30px;
  }
  
  #win-screen button {
    padding: 15px 30px;
    font-size: 1.2em;
    background-color: #4CAF50;
    border: none;
    border-radius: 5px;
    color: white;
    cursor: pointer;
    transition: background-color 0.3s;
  }
  
  #win-screen button:hover {
    background-color: #45a049;
  }
`;
// ========== START GAME ==========
window.onload = init;