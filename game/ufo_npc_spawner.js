(function () {
    // UFO NPC Spawner for Enemy Bases

    class UFO {
        constructor(x, y) {
            this.x = x;
            this.y = y;
            this.width = 50;
            this.height = 30;
            this.speed = Math.random() * 2 + 1; // Random speed between 1 and 3
            this.direction = Math.random() * Math.PI * 2; // Random movement direction
        }

        update() {
            this.x += Math.cos(this.direction) * this.speed;
            this.y += Math.sin(this.direction) * this.speed;

            // Randomly change direction
            if (Math.random() < 0.01) {
                this.direction = Math.random() * Math.PI * 2;
            }
        }

        draw(ctx) {
            ctx.fillStyle = "lime";
            ctx.beginPath();
            ctx.ellipse(this.x, this.y, this.width, this.height, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    class UFOSpawner {
        constructor(enemyBases, maxUFOs = 4) {
            this.ufos = [];
            this.enemyBases = enemyBases;
            this.maxUFOs = maxUFOs;
            this.spawnUFOs();
        }

        spawnUFOs() {
            this.enemyBases.forEach(base => {
                let ufoCount = Math.floor(Math.random() * (this.maxUFOs + 1));
                for (let i = 0; i < ufoCount; i++) {
                    let ufo = new UFO(
                        base.x + Math.random() * base.width,
                        base.y + Math.random() * base.height
                    );
                    this.ufos.push(ufo);
                }
            });
        }

        update() {
            this.ufos.forEach(ufo => ufo.update());
        }

        draw(ctx) {
            this.ufos.forEach(ufo => ufo.draw(ctx));
        }
    }

    // Export to global scope if needed
    window.UFO = UFO;
    window.UFOSpawner = UFOSpawner;
})();