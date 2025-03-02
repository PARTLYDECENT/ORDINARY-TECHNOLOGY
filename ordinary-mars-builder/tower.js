// tower.js

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

        // Play sound effect
        if (laserSound) {
            laserSound.play();
        }
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
