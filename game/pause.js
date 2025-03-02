let isPaused = false;
let pauseMenu = null;

// Create and display the pause menu
function createPauseMenu() {
    const menu = document.createElement('div');
    menu.style.position = 'absolute';
    menu.style.top = '0';
    menu.style.left = '0';
    menu.style.width = '100vw';
    menu.style.height = '100vh';
    menu.style.backgroundColor = 'rgba(0, 0, 0, 0.85)'; // Slightly darker background
    menu.style.display = 'none'; // Hidden by default
    menu.style.zIndex = '1000';
    menu.style.pointerEvents = 'auto';
    menu.style.transition = 'opacity 0.5s'; // Smooth transition

    const buttonsContainer = document.createElement('div');
    buttonsContainer.style.display = 'flex';
    buttonsContainer.style.flexDirection = 'column';
    buttonsContainer.style.alignItems = 'center';
    buttonsContainer.style.marginTop = '20px';

    function createButton(text, onClick) {
        const button = document.createElement('button');
        button.innerText = text;
        button.style.padding = '15px 30px';
        button.style.margin = '10px';
        button.style.backgroundColor = 'rgba(0, 255, 255, 0.9)';
        button.style.color = 'black';
        button.style.border = 'none';
        button.style.fontSize = '1.5rem';
        button.style.cursor = 'pointer';
        button.style.borderRadius = '8px'; // Rounded corners
        button.style.boxShadow = '0 4px 10px rgba(0, 0, 0, 0.5)'; // Subtle shadow
        button.style.transition = 'transform 0.2s, background-color 0.3s';

        // Add hover effect
        button.addEventListener('mouseenter', () => {
            button.style.backgroundColor = 'rgba(0, 255, 255, 1)';
            button.style.transform = 'scale(1.05)';
        });
        button.addEventListener('mouseleave', () => {
            button.style.backgroundColor = 'rgba(0, 255, 255, 0.9)';
            button.style.transform = 'scale(1)';
        });

        button.addEventListener('click', onClick);
        return button;
    }

    // Existing buttons
    buttonsContainer.appendChild(createButton('Settings', openSettingsPage));
    buttonsContainer.appendChild(createButton('Readme', openReadmePage));
    buttonsContainer.appendChild(createButton('Visit Link', () => window.open('https://example.com', '_blank')));
    // New Side Game button
    buttonsContainer.appendChild(createButton('Side Game', launchSideGame));

    menu.appendChild(buttonsContainer);
    document.body.appendChild(menu);
    return menu;
}

// Toggle the pause menu
function togglePause() {
    isPaused = !isPaused;
    pauseMenu.style.display = isPaused ? 'flex' : 'none';
    pauseMenu.style.opacity = isPaused ? '1' : '0'; // Fade effect
}

// Open Settings page in a new tab
function openSettingsPage() {
    window.open('settings.html', '_blank');
}

// Open Readme page in a new tab
function openReadmePage() {
    window.open('readme.html', '_blank');
}

// Launch the side game in a new tab
function launchSideGame() {
    const sideGameWindow = window.open('', '_blank');
    if (!sideGameWindow) {
        alert('Pop-up blocked. Please allow pop-ups for this site.');
        return;
    }
    const sideGameHTML = `
<!DOCTYPE html>
<html>
<head>
    <title>Space Warfare Simulation</title>
    <style>
        body { margin: 0; overflow: hidden; }
        canvas { width: 100vw; height: 100vh; }
        #ui { 
            position: fixed; 
            color: white; 
            padding: 10px; 
            bottom: 10px;
            left: 10px;
        }
        #title {
            position: fixed;
            color: white;
            width: 100%;
            text-align: center;
            top: 20px;
            font-size: 24px;
            font-family: 'Arial', sans-serif;
            font-weight: bold;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
        }
        #logo {
            position: fixed;
            top: 10px;
            right: 10px;
            width: 200px;
            height: 200px;
        }
        /* New style for assistant video */
        #assistantVideo {
            position: fixed;
            bottom: 10px;
            right: 10px;
            width: 200px;
            height: auto;
            z-index: 999;
        }
        /* Style for the music enable button */
        #musicButton {
            position: fixed;
            top: 10px;
            left: 10px;
            width: 50px;
            height: 50px;
            z-index: 1000;
            cursor: pointer;
        }
    </style>
</head>
<body>
    <canvas id="gameCanvas"></canvas>
    <div id="title">SPACE WARFARE SIMULATION</div>
    <img id="logo" src="ui.jpg" alt="Game Logo">
    <div id="ui">
        Score: <span id="score">0</span>
    </div>
    <!-- Assistant video element -->
    <video id="assistantVideo" src="assistant.mp4" autoplay loop muted></video>
    <!-- Music enable button -->
    <img id="musicButton" src="music-button.png" alt="Enable Music">

    <script src="https://cdn.babylonjs.com/babylon.js"></script>
    <script src="https://cdn.babylonjs.com/loaders/babylonjs.loaders.js"></script>

    <script>
        const canvas = document.getElementById("gameCanvas");
        const engine = new BABYLON.Engine(canvas, true);
        let scene, ship, camera;
        let bullets = [];
        let enemies = [];
        let score = 0;
        const keys = {};
        const laserSound = new Audio('laser.mp3');
        let isRecoiling = false;
        let recoilTime = 0;

        // Variables for boss spawn logic.
        let smallShipsKilled = 0;
        let bossSpawned = false;
        let boss = null;
        let bossHealth = 0;

        // Background sound for the fight (won't autoplay until enabled).
        const backgroundSound = new Audio('fight.mp3');
        backgroundSound.loop = true;
        backgroundSound.volume = 0.3;

        // Add click event to the music button to enable background music.
        const musicButton = document.getElementById("musicButton");
        musicButton.addEventListener("click", () => {
            backgroundSound.play().then(() => {
                // Hide the button after the music starts.
                musicButton.style.display = 'none';
            }).catch(err => {
                console.error("Failed to play background sound:", err);
            });
        });

        const createScene = () => {
            scene = new BABYLON.Scene(engine);
            scene.clearColor = new BABYLON.Color3(0, 0, 0);

            // Enhanced lighting setup.
            const mainLight = new BABYLON.HemisphericLight("mainLight", new BABYLON.Vector3(0, 1, 0), scene);
            mainLight.intensity = 0.7;
            mainLight.groundColor = new BABYLON.Color3(0.2, 0.2, 0.3);

            // Add point light for more dramatic effect.
            const pointLight = new BABYLON.PointLight("pointLight", new BABYLON.Vector3(0, 10, -20), scene);
            pointLight.intensity = 0.5;
            pointLight.diffuse = new BABYLON.Color3(0.7, 0.7, 1.0);
            pointLight.specular = new BABYLON.Color3(0.8, 0.8, 1.0);

            // Add subtle ambient lighting.
            const ambientLight = new BABYLON.HemisphericLight("ambientLight", new BABYLON.Vector3(0, -1, 0), scene);
            ambientLight.intensity = 0.2;
            ambientLight.groundColor = new BABYLON.Color3(0.1, 0.1, 0.2);

            camera = new BABYLON.UniversalCamera("camera", new BABYLON.Vector3(0, 10, -100), scene);
            camera.setTarget(BABYLON.Vector3.Zero());
            camera.attachControl(canvas, true);

            createStarfield();

            BABYLON.SceneLoader.ImportMesh("", "", "ship1.glb", scene, (meshes) => {
                ship = meshes[0];
                ship.position = new BABYLON.Vector3(0, 2, 0);
                ship.rotation.y += Math.PI / 2;
            });

            // Enable bloom effect.
            const pipeline = new BABYLON.DefaultRenderingPipeline("pipeline", true, scene);
            pipeline.bloomEnabled = true;
            pipeline.bloomThreshold = 0.7;
            pipeline.bloomWeight = 0.5;
            pipeline.bloomKernel = 64;

            return scene;
        };

        const createStarfield = () => {
            const starfield = new BABYLON.ParticleSystem("stars", 2000, scene);
            starfield.particleTexture = new BABYLON.Texture("https://www.babylonjs-playground.com/textures/flare.png", scene);
            starfield.emitter = new BABYLON.Vector3(0, 0, 0);
            starfield.minSize = 0.1;
            starfield.maxSize = 0.5;
            starfield.minLifeTime = 3000;
            starfield.maxLifeTime = 5000;
            starfield.emitRate = 1000;
            starfield.minEmitBox = new BABYLON.Vector3(-100, -50, -200);
            starfield.maxEmitBox = new BABYLON.Vector3(100, 50, 0);

            starfield.updateFunction = (particle) => {
                if (Math.random() < 0.05) {
                    particle.size *= Math.random() * 2;
                    particle.lifeTime += Math.random() * 3000;
                }
            };

            starfield.start();
        };

        const createLaserTrail = (position, direction) => {
            const trail = new BABYLON.ParticleSystem("laser", 50, scene);
            trail.particleTexture = new BABYLON.Texture("https://www.babylonjs-playground.com/textures/flare.png", scene);
            trail.emitter = position;
            trail.minEmitBox = new BABYLON.Vector3(0, 0, 0);
            trail.maxEmitBox = new BABYLON.Vector3(0, 0, 0);
            trail.color1 = new BABYLON.Color4(0.8, 0.2, 0.2, 1.0);
            trail.color2 = new BABYLON.Color4(1, 0.5, 0.5, 1.0);
            trail.colorDead = new BABYLON.Color4(0, 0, 0.2, 0.0);
            trail.minSize = 0.3;
            trail.maxSize = 0.5;
            trail.minLifeTime = 0.1;
            trail.maxLifeTime = 0.2;
            trail.emitRate = 100;
            trail.direction1 = direction.scale(-1);
            trail.direction2 = direction.scale(-1);
            trail.minEmitPower = 1;
            trail.maxEmitPower = 2;
            trail.updateSpeed = 0.01;
            
            trail.start();
            setTimeout(() => trail.stop(), 200);
        };

        // Function to create an explosion particle effect.
        const createExplosion = (position) => {
            const explosion = new BABYLON.ParticleSystem("explosion", 200, scene);
            explosion.particleTexture = new BABYLON.Texture("https://www.babylonjs-playground.com/textures/flare.png", scene);
            explosion.emitter = position.clone();
            explosion.minSize = 0.5;
            explosion.maxSize = 2.0;
            explosion.minLifeTime = 0.2;
            explosion.maxLifeTime = 0.5;
            explosion.emitRate = 500;
            explosion.gravity = new BABYLON.Vector3(0, -9.81, 0);
            explosion.direction1 = new BABYLON.Vector3(-1, 1, -1);
            explosion.direction2 = new BABYLON.Vector3(1, 1, 1);
            explosion.minEmitPower = 1;
            explosion.maxEmitPower = 3;
            explosion.updateSpeed = 0.005;
            
            explosion.start();
            setTimeout(() => {
                explosion.stop();
                setTimeout(() => explosion.dispose(), 300);
            }, 200);
        };

        // Function to spawn the boss enemy.
        const spawnBoss = () => {
            bossSpawned = true;
            bossHealth = 3; // Boss requires 3 hits to be destroyed.
            BABYLON.SceneLoader.ImportMesh("", "", "ship4.glb", scene, (meshes) => {
                boss = meshes[0];
                // Spawn the boss at a fixed position (e.g., far ahead).
                boss.position = new BABYLON.Vector3(0, 2, -500);
            });
        };

        const spawnEnemy = () => {
            if (enemies.length < 15) {
                BABYLON.SceneLoader.ImportMesh("", "", "ship2.glb", scene, (meshes) => {
                    let enemy = meshes[0];
                    enemy.position = new BABYLON.Vector3(
                        Math.random() * 200 - 100,
                        2,
                        Math.random() * -300 - 100
                    );
                    enemies.push({ mesh: enemy, speed: 0.02 });
                });
            }
        };

        setInterval(spawnEnemy, 3000);

        window.addEventListener("keydown", e => keys[e.key.toLowerCase()] = true);
        window.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);

        canvas.addEventListener("wheel", (event) => {
            event.preventDefault();
            camera.position.z += event.deltaY * 0.01;
        });

        const updateGame = () => {
            if (!ship) return;

            const speed = 0.1;
            const shipForward = new BABYLON.Vector3(
                Math.sin(ship.rotation.y),
                0,
                Math.cos(ship.rotation.y)
            );

            // Handle recoil animation.
            if (isRecoiling) {
                recoilTime += 1;
                const recoilDuration = 10;
                if (recoilTime <= recoilDuration / 2) {
                    ship.position.y += 0.02;
                } else if (recoilTime <= recoilDuration) {
                    ship.position.y -= 0.02;
                } else {
                    isRecoiling = false;
                    recoilTime = 0;
                }
            }

            if (keys['w']) ship.position.addInPlace(shipForward.scale(speed));
            if (keys['s']) ship.position.addInPlace(shipForward.scale(-speed));
            if (keys['a']) ship.rotation.y += 0.05;
            if (keys['d']) ship.rotation.y -= 0.05;
            if (keys['q']) ship.position.y += speed;
            if (keys['e']) ship.position.y -= speed;
            if (keys['r']) {
                ship.rotation.y += Math.PI / 2;
                keys['r'] = false;
            }

            if ((keys[' '] || keys['.']) && !isRecoiling) {
                const bullet = BABYLON.MeshBuilder.CreateSphere("bullet", { diameter: 0.3 }, scene);
                bullet.material = new BABYLON.StandardMaterial("bulletMat", scene);
                bullet.material.emissiveColor = new BABYLON.Color3(1, 0, 0);
                bullet.material.alpha = 0.7;
                
                // Move the gun up a tiny bit (4.7) and forward further (shipForward scaled by 4).
                const bulletPos = ship.position.clone().add(new BABYLON.Vector3(0, 4.7, 0)).add(shipForward.scale(4));
                bullet.position = bulletPos;
                bullets.push({ mesh: bullet, direction: shipForward.scale(-0.5), lifetime: 0 });

                // Create laser trail effect.
                createLaserTrail(bulletPos, shipForward);

                // Trigger recoil and play laser sound.
                isRecoiling = true;
                recoilTime = 0;
                laserSound.currentTime = 0;
                laserSound.play();

                keys[' '] = keys['.'] = false;
            }

            // Update bullets.
            bullets.forEach((bullet, index) => {
                bullet.mesh.position.addInPlace(bullet.direction);
                if (bullet.lifetime++ > 100) {
                    bullet.mesh.dispose();
                    bullets.splice(index, 1);
                }
            });

            // Update small enemy ships.
            enemies.forEach((enemy, index) => {
                let direction = ship.position.subtract(enemy.mesh.position).normalize().scale(enemy.speed);
                enemy.mesh.position.addInPlace(direction);

                bullets.forEach((bullet, bulletIndex) => {
                    if (BABYLON.Vector3.Distance(bullet.mesh.position, enemy.mesh.position) < 1) {
                        // Explosion effect for small enemy.
                        createExplosion(enemy.mesh.position);
                        
                        enemy.mesh.dispose();
                        enemies.splice(index, 1);
                        bullet.mesh.dispose();
                        bullets.splice(bulletIndex, 1);
                        score += 10;
                        document.getElementById("score").innerText = score;
                        
                        // Increment small ship kill counter.
                        smallShipsKilled++;
                        // Once 10 small ships are killed and no boss is present, spawn the boss.
                        if (smallShipsKilled >= 10 && !bossSpawned) {
                            spawnBoss();
                        }
                    }
                });
            });

            // Update boss movement and collisions if boss exists.
            if (boss) {
                // Move boss slowly toward the ship.
                let bossDirection = ship.position.subtract(boss.position).normalize().scale(0.01);
                boss.position.addInPlace(bossDirection);

                // Check bullet collisions with boss.
                bullets.forEach((bullet, bulletIndex) => {
                    if (BABYLON.Vector3.Distance(bullet.mesh.position, boss.position) < 2) {
                        bossHealth--;
                        bullet.mesh.dispose();
                        bullets.splice(bulletIndex, 1);
                        // Create a small explosion at the boss position.
                        createExplosion(boss.position);
                        if (bossHealth <= 0) {
                            boss.dispose();
                            boss = null;
                            bossSpawned = false;
                            score += 50; // Bonus score for defeating the boss.
                            document.getElementById("score").innerText = score;
                            // Reset small ship kill counter after boss is defeated.
                            smallShipsKilled = 0;
                        }
                    }
                });
            }
        };

        scene = createScene();
        engine.runRenderLoop(() => {
            updateGame();
            scene.render();
        });

        window.addEventListener("resize", () => engine.resize());
    </script>
</body>
</html>









    `;
    sideGameWindow.document.open();
    sideGameWindow.document.write(sideGameHTML);
    sideGameWindow.document.close();
}

// Listen for key presses to toggle the pause menu (Space key)
document.addEventListener("DOMContentLoaded", () => {
    pauseMenu = createPauseMenu();
    window.addEventListener('keydown', (event) => {
        if (event.code === 'Space') togglePause();
    });
});
