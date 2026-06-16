import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';
import { Translator } from './translator.js';
import { GenesisCamera } from './controls/camera.js';
import { GenesisPlayer } from './controls/player.js';
import { E2C } from './e2c.js';
import { EnemyManager } from './enemy.js';
import { HealthBar } from './healthbar.js';
import { ChromeKernel } from './chrome.js';

/**
 * Renderer for the Genesis Kernel engine.
 * Manages Three.js scene, camera, renderer, and animation.
 */

class GenesisRenderer {
    constructor() {
        this.scene = null;
        this.threeCamera = null;
        this.renderer = null;
        this.material = null;
        
        this.clock = new THREE.Clock();

        this.genesisCam = new GenesisCamera();
        this.player = new GenesisPlayer(this.genesisCam);
        this.e2c = new E2C();
        this.enemies = new EnemyManager();
        this.healthBar = new HealthBar();
        
        // Spawn our first test Zombie near the starting area
        this.enemies.spawn(new THREE.Vector3(0, 20, 20), 0);
        
        // HUD DOM Elements
        this.hudX = document.getElementById('hud-x');
        this.hudY = document.getElementById('hud-y');
        this.hudZ = document.getElementById('hud-z');
        this.hudHdg = document.getElementById('hud-heading');

        ChromeKernel.init();
        this.init();
    }

    init() {
        this.scene = new THREE.Scene();
        this.threeCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        
        this.renderer = new THREE.WebGLRenderer({ antialias: false });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        document.body.appendChild(this.renderer.domElement);

        const geometry = new THREE.PlaneGeometry(2, 2);
        this.material = new THREE.ShaderMaterial({
            vertexShader: Translator.assembleVertexShader(),
            fragmentShader: Translator.assembleFragmentShader(),
            uniforms: {
                u_time: { value: 0 },
                u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
                u_cameraPos: { value: new THREE.Vector3() },
                u_cameraRot: { value: new THREE.Vector2() },
                u_fireTime: { value: 9999.0 }, // time since last fired
                u_armGrab: { value: 0.0 },  // 0 = open, 1 = grab
                u_armSway: { value: 0.0 },  // 0 = auto idle sway, 1 = manual override
                u_armPose: { value: 0.0 },  // 0 = neutral, 1 = point, 2 = wave, 3 = fist
                ...this.e2c.getUniforms(),
                ...this.enemies.getUniforms(),
                ...this.healthBar.getUniforms()
            }
        });

        const mesh = new THREE.Mesh(geometry, this.material);
        this.scene.add(mesh);

        this.setupEventListeners();
        this.animate();
    }

    setupEventListeners() {
        window.addEventListener('resize', () => {
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.material.uniforms.u_resolution.value.set(window.innerWidth, window.innerHeight);
        }, false);
        
        // Pointer Lock for true FPS controls
        document.addEventListener('click', () => {
            if (document.pointerLockElement !== document.body) {
                document.body.requestPointerLock();
            } else {
                // Shoot railgun on click
                this.fireGun(0);
            }
        });

        window.addEventListener('keydown', (e) => {
            if (document.pointerLockElement === document.body) {
                if (e.code === 'KeyQ') this.fireGun(1); // Flare
                if (e.code === 'KeyE') this.fireGun(2); // Chaff
                if (e.code === 'KeyG') {
                    // Toggle Grab
                    const current = this.material.uniforms.u_armGrab.value;
                    this.material.uniforms.u_armGrab.value = current > 0.5 ? 0.0 : 1.0;
                }
                if (e.code === 'KeyF') {
                    // Cycle Pose: neutral → point → wave → fist → neutral
                    const current = this.material.uniforms.u_armPose.value;
                    this.material.uniforms.u_armPose.value = (current + 1.0) % 4.0;
                    console.log('Arm Pose:', ['Neutral','Point','Wave','Fist'][this.material.uniforms.u_armPose.value]);
                }
                if (e.code === 'KeyH') {
                    this.healthBar.takeDamage(0.15);
                    console.log('Health:', Math.round(this.healthBar.getHealth() * 100) + '%');
                }
                if (e.code === 'KeyJ') {
                    this.healthBar.heal(0.20);
                    console.log('Health:', Math.round(this.healthBar.getHealth() * 100) + '%');
                }
            }
        });

        window.addEventListener('mousemove', (e) => this.genesisCam.handleMouseMove(e));
    }

    fireGun(type = 0) {
        if (type === 0) this.lastFireTime = this.clock.getElapsedTime();
        
        const pos = this.player.getPosition().clone();
        const dir = this.genesisCam.getDirection().clone();
        
        let speed = 150.0;
        if (type === 1) speed = 30.0;
        else if (type === 2) speed = 20.0;
        
        this.e2c.fireProjectile(pos, dir, speed, type);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        const delta = this.clock.getDelta();
        const time = this.clock.getElapsedTime();

        // Update Physics
        this.player.update(delta);
        this.e2c.update(delta);
        this.enemies.update(delta);
        this.healthBar.update(delta);
        
        // Push health bar uniforms
        this.material.uniforms.u_health.value = this.healthBar.getVisualHealth();
        
        const camPos = this.player.getPosition();
        const camRot = this.genesisCam.getRotations();

        // Inject Uniforms
        this.material.uniforms.u_time.value = time;
        this.material.uniforms.u_cameraPos.value.copy(camPos);
        this.material.uniforms.u_cameraRot.value.copy(camRot);
        
        if (this.lastFireTime !== undefined) {
            this.material.uniforms.u_fireTime.value = time - this.lastFireTime;
        }

        ChromeKernel.scheduleLowPriority(() => this.updateHUD(camPos, camRot.x)); // x is yaw
        
        this.renderer.render(this.scene, this.threeCamera);
    }

    updateHUD(pos, yaw) {
        if(!this.hudX) return;
        
        this.hudX.innerText = pos.x.toFixed(2);
        this.hudY.innerText = pos.y.toFixed(2);
        this.hudZ.innerText = pos.z.toFixed(2);

        // Convert Yaw (radians) to 0-360 degrees
        // Subtract from 360 to make turning right = increasing degrees, standard compass
        let deg = (yaw * 180 / Math.PI) % 360;
        if (deg < 0) deg += 360;
        
        // standard map: 0=N, 90=E, 180=S, 270=W
        let dir = "N";
        if (deg > 45 && deg <= 135) dir = "W"; // Note: Three.js math vs screen space might flip E/W depending on setup. Assuming standard FPS math.
        else if (deg > 135 && deg <= 225) dir = "S";
        else if (deg > 225 && deg <= 315) dir = "E";

        this.hudHdg.innerText = `${Math.round(deg)}° ${dir}`;
    }
}

// Export the instance or the class
export const renderer = new GenesisRenderer();
