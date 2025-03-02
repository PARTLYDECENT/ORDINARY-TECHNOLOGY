// ========== FRIENDLY FLYING NPC ==========
document.addEventListener("keydown", (event) => {
    if (event.key === "9") {
        spawnFriendlyFlyingNPC();
    }
});

// Function to spawn a friendly flying NPC
function spawnFriendlyFlyingNPC() {
    // Create texture loader
    const textureLoader = new THREE.TextureLoader();
    
    // Load textures
    const bodyTexture = textureLoader.load('body-texture.png');
    const noseTexture = textureLoader.load('/path/to/ship-nose-texture.jpg');
    const wingTexture = textureLoader.load('/path/to/ship-wing-texture.jpg');

    // Create the ship body (rectangle)
    const bodyGeometry = new THREE.BoxGeometry(30, 22, 15);
    const bodyMaterial = new THREE.MeshStandardMaterial({ 
        map: bodyTexture,
        metalness: 0.5,
        roughness: 0.5
    });
    const shipBody = new THREE.Mesh(bodyGeometry, bodyMaterial);

    // Create the nose (triangle)
    const noseGeometry = new THREE.ConeGeometry(7.5, 20, 4);
    const noseMaterial = new THREE.MeshStandardMaterial({ 
        map: noseTexture,
        metalness: 0.6,
        roughness: 0.4
    });
    const shipNose = new THREE.Mesh(noseGeometry, noseMaterial);
    shipNose.rotation.z = Math.PI / 2;
    shipNose.position.x = 25; // Position at front of body

    // Create wings (flat triangles)
    const wingGeometry = new THREE.BufferGeometry();
    const wingVertices = new Float32Array([
        0, 0, 0,     // vertex 1
        20, 0, 0,    // vertex 2
        10, 15, 0    // vertex 3
    ]);
    wingGeometry.setAttribute('position', new THREE.BufferAttribute(wingVertices, 3));
    
    // Add UV coordinates for wing texture mapping
    const wingUVs = new Float32Array([
        0, 0,    // UV for vertex 1
        1, 0,    // UV for vertex 2
        0.5, 1   // UV for vertex 3
    ]);
    wingGeometry.setAttribute('uv', new THREE.BufferAttribute(wingUVs, 2));
    
    const wingMaterial = new THREE.MeshStandardMaterial({ 
        map: wingTexture,
        side: THREE.DoubleSide,
        metalness: 0.4,
        roughness: 0.6
    });

    // Left wing
    const leftWing = new THREE.Mesh(wingGeometry, wingMaterial);
    leftWing.position.set(0, 0, 12);
    leftWing.rotation.y = Math.PI / 2;

    // Right wing
    const rightWing = new THREE.Mesh(wingGeometry, wingMaterial);
    rightWing.position.set(0, 0, -12);
    rightWing.rotation.y = -Math.PI / 2;

    // Create ship container
    const ship = new THREE.Group();
    ship.add(shipBody);
    ship.add(shipNose);
    ship.add(leftWing);
    ship.add(rightWing);

    // Position the ship above the ground
    ship.position.set(0, 100, 0);
    ship.castShadow = true;
    ship.receiveShadow = true;

    // Add the ship to the scene
    GAME.scene.add(ship);
    console.log("🛸 Friendly Flying NPC spawned!");

    // Add properties for attacking
    ship.userData = {
        speed: 2,
        attackRange: 100,
        attackCooldown: 1000,
        lastAttackTime: Date.now(),
        damage: 10
    };

    // Make the ship fly around and attack enemies
    flyAround(ship);
    attackEnemies(ship);
}

// Function to make the NPC fly around
function flyAround(npc) {
    let targetPoint = getRandomPatrolPoint(npc.position, 500); // Random point within 500 units

    const flyInterval = setInterval(() => {
        // Calculate direction to the target point
        const direction = new THREE.Vector3().subVectors(targetPoint, npc.position).normalize();

        // Move the NPC toward the target point
        npc.position.addScaledVector(direction, npc.userData.speed);

        // Rotate the NPC to face the direction it's moving
        npc.lookAt(targetPoint);

        // If the NPC reaches the target point, pick a new one
        if (npc.position.distanceTo(targetPoint) < 10) {
            targetPoint = getRandomPatrolPoint(npc.position, 500);
        }
    }, 50);
}

// Function to make the NPC attack enemies
function attackEnemies(npc) {
    const attackInterval = setInterval(() => {
        // Find the closest enemy
        let closestEnemy = null;
        let closestDistance = npc.userData.attackRange;

        // Ensure GAME.enemyNPCs exists and is populated
        if (!GAME.enemyNPCs || GAME.enemyNPCs.length === 0) {
            return; // No enemies to attack
        }

        GAME.enemyNPCs.forEach(enemy => {
            if (!enemy.userData.isDead) { // Only attack alive enemies
                const distance = npc.position.distanceTo(enemy.position);
                if (distance < closestDistance) {
                    closestEnemy = enemy;
                    closestDistance = distance;
                }
            }
        });

        // If an enemy is in range, attack it
        if (closestEnemy && Date.now() - npc.userData.lastAttackTime >= npc.userData.attackCooldown) {
            // Initialize enemy health if not already set
            if (!closestEnemy.userData.health) {
                closestEnemy.userData.health = 100;
            }

            // Damage the enemy
            closestEnemy.userData.health -= npc.userData.damage;

            // Log the attack
            console.log(`💥 Friendly NPC attacked enemy! Enemy health: ${closestEnemy.userData.health}`);

            // If the enemy's health drops to 0, mark it as dead and remove it
            if (closestEnemy.userData.health <= 0) {
                closestEnemy.userData.isDead = true;
                GAME.scene.remove(closestEnemy);
                GAME.enemyNPCs = GAME.enemyNPCs.filter(enemy => enemy !== closestEnemy);
                console.log("Enemy destroyed!");
            }

            // Update the last attack time
            npc.userData.lastAttackTime = Date.now();
        }
    }, 100); // Check for enemies every 100ms
}

// Utility: Get a random patrol point around a center within a given radius
function getRandomPatrolPoint(center, radius) {
    const angle = Math.random() * Math.PI * 2;
    const r = Math.random() * radius;
    const x = clamp(center.x + r * Math.cos(angle), -GAME.mapSize / 2, GAME.mapSize / 2);
    const z = clamp(center.z + r * Math.sin(angle), -GAME.mapSize / 2, GAME.mapSize / 2);
    const y = clamp(30 + Math.random() * 120, 30, 150); // Random height between 30 and 150
    return new THREE.Vector3(x, y, z);
}

// Utility: Clamp value between min and max
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}