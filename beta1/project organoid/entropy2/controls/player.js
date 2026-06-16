import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';

/**
 * Player controller for the Genesis Kernel engine.
 * Handles keyboard input, position, velocity, and basic CPU physics.
 */
export class GenesisPlayer {
    constructor(camera) {
        this.camera = camera;
        this.position = new THREE.Vector3(0, 0, -20);
        this.velocity = new THREE.Vector3();
        this.acceleration = 150.0;
        this.friction = 5.0; // Ground friction
        this.airFriction = 0.5;
        this.gravity = 30.0;
        this.jumpForce = 15.0;
        this.maxSpeed = 20.0;
        
        // Settings
        this.floorHeight = -10.0;
        this.isGrounded = false;

        // Input state
        this.keys = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            jump: false
        };

        this.setupInput();
    }

    setupInput() {
        const onKeyDown = (e) => {
            switch(e.code) {
                case 'KeyW': this.keys.forward = true; break;
                case 'KeyS': this.keys.backward = true; break;
                case 'KeyA': this.keys.left = true; break;
                case 'KeyD': this.keys.right = true; break;
                case 'Space': 
                    if (this.isGrounded) {
                        this.velocity.y = this.jumpForce;
                        this.isGrounded = false;
                    }
                    this.keys.jump = true; 
                    break;
            }
        };

        const onKeyUp = (e) => {
            switch(e.code) {
                case 'KeyW': this.keys.forward = false; break;
                case 'KeyS': this.keys.backward = false; break;
                case 'KeyA': this.keys.left = false; break;
                case 'KeyD': this.keys.right = false; break;
                case 'Space': this.keys.jump = false; break;
            }
        };

        document.addEventListener('keydown', onKeyDown);
        document.addEventListener('keyup', onKeyUp);
    }

    update(delta) {
        // Compute input direction based on camera yaw angles
        const direction = new THREE.Vector3();
        const rawDir = this.camera.direction.clone();
        rawDir.y = 0; // Flatten look direction to XZ plane
        rawDir.normalize();

        const right = this.camera.right.clone();
        right.y = 0;
        right.normalize();

        if (this.keys.forward) direction.add(rawDir);
        if (this.keys.backward) direction.sub(rawDir);
        if (this.keys.right) direction.add(right);
        if (this.keys.left) direction.sub(right);
        
        direction.normalize();

        // Apply movement forces
        if (direction.lengthSq() > 0) {
            this.velocity.x += direction.x * this.acceleration * delta;
            this.velocity.z += direction.z * this.acceleration * delta;
        }

        // Apply friction
        const currentFriction = this.isGrounded ? this.friction : this.airFriction;
        this.velocity.x -= this.velocity.x * currentFriction * delta;
        this.velocity.z -= this.velocity.z * currentFriction * delta;

        // Apply gravity
        this.velocity.y -= this.gravity * delta;

        // Apply velocity to position
        this.position.addScaledVector(this.velocity, delta);

        // Very basic CPU floor collision
        if (this.position.y <= this.floorHeight) {
            this.position.y = this.floorHeight;
            this.velocity.y = Math.max(0, this.velocity.y); // Stop falling
            this.isGrounded = true;
        } else {
            this.isGrounded = false;
        }

        return this.position;
    }

    getPosition() {
        return this.position;
    }
}
