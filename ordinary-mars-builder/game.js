const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const ui = document.getElementById('ui');
const stats = document.getElementById('stats');
const towerButtons = document.getElementById('towerButtons');

canvas.width = 800;
canvas.height = 600;

const GAME_STATE = {
    MENU: 0,
    PLAYING: 1,
    GAME_OVER: 2,
    LEVEL_TRANSITION: 3
};

let gameState = GAME_STATE.MENU;
let money = 1000;
let lives = 20;
let wave = 0;
let score = 0;
let currentLevel = 1;
let maxLevel = 10; // Increased to 10 levels
let wavesPerLevel = 3;
let levelWave = 0;
const WAVE_DURATION = 10000;

// Expanded Tower Types
const TOWER_TYPES = {
    BASIC: {
        name: 'Basic Tower',
        cost: 50,
        damage: 10,
        range: 100,
        fireRate: 1,
        image: 'tower1.png',
        projectileColor: 'rgba(255, 255, 255, 0.8)',
        levelUnlocked: 1 // Unlocked from the start
    },
    SNIPER: {
        name: 'Sniper Tower',
        cost: 100,
        damage: 50,
        range: 200,
        fireRate: 0.5,
        image: 'tower2.png',
        projectileColor: 'rgba(100, 100, 255, 0.8)',
        levelUnlocked: 2
    },
    MACHINE_GUN: {
        name: 'Machine Gun Tower',
        cost: 150,
        damage: 5,
        range: 75,
        fireRate: 3,
        image: 'tower3.png',
        projectileColor: 'rgba(255, 100, 100, 0.8)',
        levelUnlocked: 3
    },
    SLOW: {
        name: 'Slow Tower',
        cost: 120,
        damage: 0,
        range: 120,
        fireRate: 1,
        image: 'tower4.png',
        projectileColor: 'rgba(100, 255, 100, 0.8)',
        levelUnlocked: 4,
        slowAmount: 0.5 // Reduce speed by 50%
    },
    LASER: {
        name: 'Laser Tower',
        cost: 200,
        damage: 30,
        range: 150,
        fireRate: 2,
        image: 'tower5.png',
        projectileColor: 'rgba(255, 255, 0, 0.8)',
        levelUnlocked: 5
    },
    MISSILE: {
        name: 'Missile Tower',
        cost: 250,
        damage: 80,
        range: 250,
        fireRate: 0.3,
        image: 'tower6.png',
        projectileColor: 'rgba(255, 0, 255, 0.8)',
        levelUnlocked: 6
    },
    FLAME: {
        name: 'Flame Tower',
        cost: 180,
        damage: 15,
        range: 60,
        fireRate: 5,
        image: 'tower7.png',
        projectileColor: 'rgba(255, 165, 0, 0.8)',
        levelUnlocked: 7
    }
};

const ENEMY_TYPES = {
    BASIC: {
        health: 50,
        speed: 1,
        value: 10,
        image: 'enemy1.png'
    },
    FAST: {
        health: 30,
        speed: 2,
        value: 15,
        image: 'enemy2.png'
    },
    TANK: {
        health: 200,
        speed: 0.5,
        value: 30,
        image: 'enemy3.png'
    },
    BOSS: {
        health: 500,
        speed: 0.7,
        value: 100,
        image: 'enemy4.png'
    }
};

// Level configurations
const LEVEL_CONFIG = {
    1: {
        floorImage: 'floor1.png',
        enemyMultiplier: 1,
        enemyHealthMultiplier: 1,
        moneyBonus: 0
    },
    2: {
        floorImage: 'floor2.png',
        enemyMultiplier: 1.5,
        enemyHealthMultiplier: 1.2,
        moneyBonus: 50
    },
    3: {
        floorImage: 'floor3.png',
        enemyMultiplier: 2,
        enemyHealthMultiplier: 1.5,
        moneyBonus: 100
    },
    4: {
        floorImage: 'floor4.png',
        enemyMultiplier: 2.5,
        enemyHealthMultiplier: 1.7,
        moneyBonus: 150
    },
    5: {
        floorImage: 'floor5.png',
        enemyMultiplier: 3,
        enemyHealthMultiplier: 2,
        moneyBonus: 200
    },
    6: {
        floorImage: 'floor6.png',
        enemyMultiplier: 3.5,
        enemyHealthMultiplier: 2.2,
        moneyBonus: 250
    },
    7: {
        floorImage: 'floor7.png',
        enemyMultiplier: 4,
        enemyHealthMultiplier: 2.5,
        moneyBonus: 300
    },
    8: {
        floorImage: 'floor8.png',
        enemyMultiplier: 4.5,
        enemyHealthMultiplier: 2.7,
        moneyBonus: 350
    },
    9: {
        floorImage: 'floor9.png',
        enemyMultiplier: 5,
        enemyHealthMultiplier: 3,
        moneyBonus: 400
    },
    10: {
        floorImage: 'floor10.png',
        enemyMultiplier: 6,
        enemyHealthMultiplier: 3.5,
        moneyBonus: 500
    }
};

let towers = [];
let enemies = [];
let projectiles = [];
let waveInProgress = false;

const path = [
    {x: 0, y: 300},
    {x: 200, y: 280},
    {x: 200, y: 80},
    {x: 600, y: 60},
    {x: 600, y: 480},
    {x: 800, y: 460}
];

const perspectiveFactor = 0.1;

// Load all floor images
const floorImages = {};
for (let i = 1; i <= maxLevel; i++) {
    floorImages[i] = new Image();
    floorImages[i].src = `floor${i}.png`;
}

let backgroundImage = floorImages[1];

const enemyImages = {
    BASIC: new Image(),
    FAST: new Image(),
    TANK: new Image(),
    BOSS: new Image()
};
enemyImages.BASIC.src = 'enemy1.png';
enemyImages.FAST.src = 'enemy2.png';
enemyImages.TANK.src = 'enemy3.png';
enemyImages.BOSS.src = 'enemy4.png';

class Tower {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.damage = TOWER_TYPES[type].damage;
        this.range = TOWER_TYPES[type].range;
        this.fireRate = TOWER_TYPES[type].fireRate;
        this.lastFired = 0;
        this.level = 1;
        this.image = new Image();
        this.image.src = TOWER_TYPES[type].image;
    }

    draw() {
        ctx.drawImage(this.image, this.x - 20, this.y - 20, 40, 40);
        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.fillText(this.level, this.x - 3, this.y + 4);
    }

    update(time) {
        if (time - this.lastFired > 1000 / this.fireRate) {
            const target = this.findTarget();
            if (target) {
                this.fire(target);
                this.lastFired = time;
            }
        }
    }

    findTarget() {
        return enemies.find(enemy => {
            const dx = enemy.x - this.x;
            const dy = enemy.y - this.y;
            return Math.sqrt(dx * dx + dy * dy) <= this.range;
        });
    }

    fire(target) {
        const projectileColor = TOWER_TYPES[this.type].projectileColor;
        projectiles.push(new Projectile(this.x, this.y, target, this.damage, this.type));
    }

    upgrade() {
        if (money >= TOWER_TYPES[this.type].cost) {
            money -= TOWER_TYPES[this.type].cost;
            this.level++;
            this.damage *= 1.2;
            this.range *= 1.1;
            this.fireRate *= 1.1;
            updateUI();
        }
    }
}

class Enemy {
    constructor(type) {
        this.type = type;
        this.health = ENEMY_TYPES[type].health * LEVEL_CONFIG[currentLevel].enemyHealthMultiplier;
        this.maxHealth = this.health;
        this.speed = ENEMY_TYPES[type].speed;

        // Apply slow effect if any
        this.baseSpeed = this.speed; // Store the original speed
        this.isSlowed = false;
        this.slowTimer = 0;

        this.value = ENEMY_TYPES[type].value;
        this.image = enemyImages[type];
        this.x = path[0].x;
        this.y = path[0].y;
        this.pathIndex = 0;
        this.size = 30;
        this.isDead = false;
        this.deathTimer = 0;
    }

    draw() {
        if (this.isDead) {
            ctx.globalAlpha = Math.max(0, 1 - this.deathTimer / 500);
            const scale = 1 + this.deathTimer / 500;
            const angle = this.deathTimer / 200 * Math.PI;

            ctx.translate(this.x, this.y);
            ctx.rotate(angle);
            ctx.drawImage(this.image, -this.size / 2 * scale, -this.size / 2 * scale, this.size * scale, this.size * scale);
            ctx.rotate(-angle);
            ctx.translate(-this.x, -this.y);
            ctx.globalAlpha = 1;
        } else {
            ctx.drawImage(this.image, this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
        }

        ctx.fillStyle = 'black';
        ctx.fillRect(this.x - 15, this.y - 20, 30, 5);
        ctx.fillStyle = 'red';
        ctx.fillRect(this.x - 15, this.y - 20, (this.health / this.maxHealth) * 30, 5);
    }

    update(time) {
        // Slow Effect Update
        if (this.isSlowed) {
            this.slowTimer -= time;
            if (this.slowTimer <= 0) {
                this.isSlowed = false;
                this.speed = this.baseSpeed; // Restore original speed
            }
        }
        if (this.isDead) {
            this.deathTimer += 16;
            if (this.deathTimer > 500) {
                return false;
            }
            return true;
        }

        if (this.pathIndex >= path.length - 1) {
            lives--;
            updateUI();
            return false;
        }

        const target = path[this.pathIndex + 1];
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < this.speed) {
            this.pathIndex++;
            if (this.pathIndex >= path.length - 1) {
                lives--;
                updateUI();
                return false;
            }
        } else {
            this.x += (dx / distance) * this.speed;
            this.y += (dy / distance) * this.speed;
        }

        return !this.isDead;
    }

    takeDamage(damage) {
        this.health -= damage;
        if (this.health <= 0) {
            money += this.value;
            score += this.value;
            updateUI();
            this.isDead = true;
            return false;
        }
        return true;
    }

    applySlow(slowAmount, duration) {
        if (!this.isSlowed) {
            this.speed *= (1 - slowAmount); // Reduce speed by slowAmount
            this.isSlowed = true;
            this.slowTimer = duration;
        } else {
            // Refresh existing slow with new duration
            this.slowTimer = duration;
        }
    }
}

class Projectile {
    constructor(x, y, target, damage, towerType) {
        this.x = x;
        this.y = y;
        this.target = target;
        this.damage = damage;
        this.speed = 5;
        this.hitTarget = false;
        this.towerType = towerType; // Store the tower type for slow effect
        this.color = TOWER_TYPES[towerType].projectileColor;
        this.trail = [];
        this.trailLength = 5;
    }

    draw() {
        for (let i = 0; i < this.trail.length; i++) {
            const point = this.trail[i];
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(point.x, point.y, 2 * (i / this.trail.length), 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
        ctx.fill();
    }

    update() {
        if (this.target.isDead || !enemies.includes(this.target)) {
            return false;
        }

        const dx = this.target.x - this.x;
        const dy = this.target.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > this.trailLength) {
            this.trail.shift();
        }

        if (distance < this.speed) {
            this.hitTarget = true;
            this.target.takeDamage(this.damage);

            // Apply slow effect if applicable
            if (TOWER_TYPES[this.towerType].slowAmount) {
                this.target.applySlow(TOWER_TYPES[this.towerType].slowAmount, 3000); // 3 seconds slow duration
            }
            return false;
        } else {
            this.x += (dx / distance) * this.speed;
            this.y += (dy / distance) * this.speed;
            return true;
        }
    }
}

function updateLevelBackground() {
    backgroundImage = floorImages[currentLevel];
    console.log(`Updated background to floor${currentLevel}.png`);
}

function spawnWave() {
    if (waveInProgress) return;

    waveInProgress = true;
    wave++;
    levelWave++;

    console.log(`Starting wave ${wave}, level wave ${levelWave}`);

    if (levelWave > wavesPerLevel && currentLevel < maxLevel) {
        advanceToNextLevel();
        return;
    }

    const baseEnemyCount = Math.floor(8 + wave * 1.5);
    const enemyCount = Math.floor(baseEnemyCount * LEVEL_CONFIG[currentLevel].enemyMultiplier);

    let enemiesSpawned = 0;

    const spawnEnemy = () => {
        if (enemiesSpawned >= enemyCount) {
            return;
        }

        let type;
        const rand = Math.random();

        // Adjust enemy type distribution based on level, include BOSS on level 10
        if (currentLevel === 10) {
            type = rand < 0.2 ? 'BASIC' : (rand < 0.4 ? 'FAST' : (rand < 0.7 ? 'TANK' : 'BOSS'));
        } else if (currentLevel > 5) {
            type = rand < 0.3 ? 'BASIC' : (rand < 0.6 ? 'FAST' : 'TANK');
        } else if (currentLevel > 2) {
            type = rand < 0.5 ? 'BASIC' : (rand < 0.8 ? 'FAST' : 'TANK');
        } else {
            type = rand < 0.7 ? 'BASIC' : (rand < 0.9 ? 'FAST' : 'TANK');
        }

        enemies.push(new Enemy(type));
        enemiesSpawned++;

        if (enemiesSpawned < enemyCount) {
            setTimeout(spawnEnemy, 1600);
        } else {
            setTimeout(() => {
                if (enemies.length === 0) {
                    waveInProgress = false;
                    updateLevelBackground();

                    // Check if game is complete
                    if (levelWave >= wavesPerLevel && currentLevel === maxLevel) {
                        gameState = GAME_STATE.GAME_OVER; // or a GAME_WIN state
                        console.log('Congratulations! You won the game!');
                        return;
                    }
                    if (levelWave >= wavesPerLevel && currentLevel < maxLevel) {
                        advanceToNextLevel();
                    }
                }
            }, WAVE_DURATION * 2);
        }
    };

    spawnEnemy();
    updateUI();
}

function advanceToNextLevel() {
    levelWave = 0;
    gameState = GAME_STATE.LEVEL_TRANSITION;
    currentLevel++;

    money += LEVEL_CONFIG[currentLevel].moneyBonus;
    backgroundImage = floorImages[currentLevel];
    enemies = [];
    projectiles = [];
    waveInProgress = false;
    updateUI();

    console.log(`Advanced to level ${currentLevel}`);

    setTimeout(() => {
        gameState = GAME_STATE.PLAYING;
        spawnWave();
    }, 5000);
}

function drawPath() {
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 30;
    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i++) {
        ctx.lineTo(path[i].x, path[i].y);
    }
    ctx.stroke();
}

function updateUI() {
    stats.innerHTML = `Level: ${currentLevel} | Money: $${money} | Lives: ${lives} | Wave: ${levelWave}/${wavesPerLevel} | Total Score: ${score}`;
}

function createTowerButtons() {
    towerButtons.innerHTML = '';
    Object.keys(TOWER_TYPES).forEach(type => {
        // Check if the tower is unlocked for the current level
        if (TOWER_TYPES[type].levelUnlocked <= currentLevel) {
            const button = document.createElement('button');
            button.textContent = `${TOWER_TYPES[type].name} ($${TOWER_TYPES[type].cost})`;
            button.onclick = () => selectTower(type);
            towerButtons.appendChild(button);
        }
    });

    // No more "Next Wave" button
}

let selectedTower = null;

function selectTower(type) {
    selectedTower = type;
}

canvas.addEventListener('click', (e) => {
    if (gameState === GAME_STATE.MENU) {
        startGame();
    } else if (gameState === GAME_STATE.GAME_OVER) {
        resetGame();
    } else if (gameState === GAME_STATE.PLAYING && selectedTower) {
        placeTower(e);
    }
});

canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    if (gameState === GAME_STATE.PLAYING) {
        upgradeTower(e);
    }
});

function startGame() {
    gameState = GAME_STATE.PLAYING;
    levelWave = 0;
    backgroundImage = floorImages[currentLevel];
    spawnWave();
    createTowerButtons();
    updateUI();
}

function resetGame() {
    gameState = GAME_STATE.MENU;
    money = 1000;
    lives = 20;
    wave = 0;
    levelWave = 0;
    score = 0;
    currentLevel = 1;
    backgroundImage = floorImages[currentLevel];
    towers = [];
    enemies = [];
    projectiles = [];
    waveInProgress = false;
    updateUI();
}

function placeTower(e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (money >= TOWER_TYPES[selectedTower].cost) {
        towers.push(new Tower(x, y, selectedTower));
        money -= TOWER_TYPES[selectedTower].cost;
        updateUI();
    }

    selectedTower = null;
}

function upgradeTower(e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const tower = towers.find(t => {
        const dx = t.x - x;
        const dy = t.y - y;
        return Math.sqrt(dx * dx + dy * dy) <= 20;
    });

    if (tower) {
        tower.upgrade();
    }
}

function update(time) {
    if (gameState === GAME_STATE.PLAYING) {
        towers.forEach(tower => tower.update(time));
        enemies = enemies.filter(enemy => enemy.update(time)); // Pass time to enemy.update
        projectiles = projectiles.filter(projectile => projectile.update());

        // Automatic wave spawning
        if (enemies.length === 0 && !waveInProgress) {
            spawnWave();
        }

        if (lives <= 0) {
            gameState = GAME_STATE.GAME_OVER;
        }

        if (currentLevel === maxLevel && levelWave > wavesPerLevel && enemies.length === 0) {
            gameState = GAME_STATE.GAME_OVER; // Or GAME_WIN
            console.log('Congratulations! You won the game!');
        }
    }
}

function draw() {
    if (backgroundImage && backgroundImage.complete) {
        ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);
    } else {
        ctx.fillStyle = '#333';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    drawPath();
    towers.forEach(tower => tower.draw());
    enemies.forEach(enemy => enemy.draw());
    projectiles.forEach(projectile => projectile.draw());

    if (gameState === GAME_STATE.MENU) {
        drawMenu();
    } else if (gameState === GAME_STATE.GAME_OVER) {
        drawGameOver();
    } else if (gameState === GAME_STATE.LEVEL_TRANSITION) {
        drawLevelTransition();
    }
}

function drawMenu() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'white';
    ctx.font = '48px Arial';
    ctx.fillText('Tower Defense', 250, 200);
    ctx.font = '24px Arial';
    ctx.fillText('Click to Start', 320, 250);
}

function drawGameOver() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'white';
    ctx.font = '48px Arial';
    ctx.fillText('Game Over', 280, 200);
    ctx.font = '24px Arial';
    ctx.fillText(`Score: ${score}`, 340, 250);
    ctx.fillText('Click to Restart', 300, 300);
}

function drawLevelTransition() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'white';
    ctx.font = '48px Arial';
    ctx.fillText(`Level ${currentLevel}`, 280, 200);
    ctx.font = '24px Arial';
    ctx.fillText('Get Ready!', 340, 250);
}

function gameLoop(time) {
    update(time);
    draw();
    requestAnimationFrame(gameLoop);
}

// Start the game loop
requestAnimationFrame(gameLoop);
