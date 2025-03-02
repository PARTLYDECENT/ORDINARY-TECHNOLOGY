// Single Boss with Patrol Path
document.addEventListener("DOMContentLoaded", () => {
    loadBossTexture().then(() => {
        spawnBoss();
    });
});

async function loadBossTexture() {
    return new Promise((resolve) => {
        const textureLoader = new THREE.TextureLoader();
        GAME.bossTexture = textureLoader.load('boss-sprite.png', () => {
            resolve();
        });
    });
}

function spawnBoss() {
    const bossSize = 5;  // 5x bigger
    
    // Create the boss sprite
    const spriteMaterial = new THREE.SpriteMaterial({
        map: GAME.bossTexture,
        color: 0xffffff
    });

    const bossSprite = new THREE.Sprite(spriteMaterial);
    bossSprite.scale.set(100 * bossSize, 100 * bossSize, 1);
    
    // Set initial position
    bossSprite.position.set(0, 150, 0);
    
    // Add to scene
    GAME.scene.add(bossSprite);
    
    // Start patrol movement
    moveOnPatrol(bossSprite);
}

const patrolPoints = [
    new THREE.Vector3(500, 150, 500),
    new THREE.Vector3(-500, 150, 500),
    new THREE.Vector3(-500, 150, -500),
    new THREE.Vector3(500, 150, -500)
];

function moveOnPatrol(boss) {
    let currentPoint = 0;
    
    function update() {
        const target = patrolPoints[currentPoint];
        const direction = new THREE.Vector3()
            .subVectors(target, boss.position)
            .normalize();
        
        // Move boss
        boss.position.addScaledVector(direction, 2);
        
        // Face the camera
        boss.quaternion.copy(GAME.camera.quaternion);
        
        // Check if reached current patrol point
        if (boss.position.distanceTo(target) < 10) {
            currentPoint = (currentPoint + 1) % patrolPoints.length;
        }
        
        requestAnimationFrame(update);
    }
    
    update();
}