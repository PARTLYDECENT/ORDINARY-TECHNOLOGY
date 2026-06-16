import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';

/**
 * Camera controller for the Genesis Kernel engine.
 * Handles mouse look (yaw/pitch) and calculates direction vectors.
 */
export class GenesisCamera {
    constructor() {
        this.pitch = 0;
        this.yaw = 0;
        
        // Limits
        this.PITCH_LIMIT = Math.PI / 2 - 0.05; // Look straight up/down limit
        this.sensitivity = 0.002;

        this.direction = new THREE.Vector3(0, 0, 1);
        this.right = new THREE.Vector3(1, 0, 0);
        this.up = new THREE.Vector3(0, 1, 0);

        this.updateVectors();
    }

    handleMouseMove(e) {
        if (document.pointerLockElement === document.body) {
            this.yaw -= e.movementX * this.sensitivity;
            this.pitch -= e.movementY * this.sensitivity;

            // Clamp pitch to avoid flipping over
            this.pitch = Math.max(-this.PITCH_LIMIT, Math.min(this.PITCH_LIMIT, this.pitch));

            this.updateVectors();
        }
    }

    updateVectors() {
        // Spherical to Cartesian conversion for direction vector
        const cosPitch = Math.cos(this.pitch);
        this.direction.set(
            Math.sin(this.yaw) * cosPitch,
            Math.sin(this.pitch),
            Math.cos(this.yaw) * cosPitch
        ).normalize();

        // Calculate right vector relative to absolute UP (0,1,0)
        this.right.crossVectors(this.direction, new THREE.Vector3(0, 1, 0)).normalize();
        
        // Ensure right vector is correct even if looking straight up/down
        if (this.right.lengthSq() < 0.001) {
            this.right.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw)).normalize();
        }

        // Calculate actual up vector
        this.up.crossVectors(this.right, this.direction).normalize();
    }

    // Returns the view direction for the shader
    getDirection() {
        return this.direction;
    }
    
    // Returns the pitch and yaw for the shader rotations
    getRotations() {
        return new THREE.Vector2(this.yaw, this.pitch);
    }
}
