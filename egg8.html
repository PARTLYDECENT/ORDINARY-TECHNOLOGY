// First add this to your GAME object at the top of the file
GAME.alienBase = null;

// Then add this to your existing keyboard controls section inside init()
else if (key === '9') {
    if (!GAME.alienBase) {
        // Create a simple alien base
        const geometry = new THREE.IcosahedronGeometry(200, 1);
        const material = new THREE.MeshStandardMaterial({
            color: 0x00ff88,
            emissive: 0x004400,
            emissiveIntensity: 0.5
        });
        
        const alienBase = new THREE.Mesh(geometry, material);
        alienBase.position.set(2000, 150, 2000);
        alienBase.castShadow = true;
        alienBase.receiveShadow = true;
        
        GAME.alienBase = alienBase;
        scene.add(alienBase);
        console.log('Alien base spawned at position:', alienBase.position);
    }
}

// And add this to your animate() function to test alien NPC spawning
if (GAME.alienBase && GAME.enemyNPCs.length < GAME.maxEnemyNPCs) {
    if (Math.random() < 0.01) { // 1% chance per frame
        const geometry = new THREE.OctahedronGeometry(15, 1);
        const material = new THREE.MeshStandardMaterial({
            color: 0x00ff88,
            emissive: 0x004400
        });
        
        const alien = new THREE.Mesh(geometry, material);
        alien.position.copy(GAME.alienBase.position);
        alien.position.y += 100;
        
        alien.userData = {
            speed: 3,
            targetPoint: getRandomPatrolPoint(GAME.alienBase.position, 300),
            isAlien: true,
            health: 150
        };
        
        scene.add(alien);
        GAME.enemyNPCs.push(alien);
        console.log('Alien NPC spawned');
    }
}