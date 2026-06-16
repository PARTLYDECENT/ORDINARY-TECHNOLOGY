import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';

export const E2C_MAX_ENTITIES = 20;

export class E2C {
    constructor() {
        // Flat buffers for better V8 performance and memory layout
        // positions: 3 floats per projectile (x, y, z)
        this.positions = new Float32Array(E2C_MAX_ENTITIES * 3);
        // velocities: 3 floats per projectile (x, y, z)
        this.velocities = new Float32Array(E2C_MAX_ENTITIES * 3);
        // data: 4 floats per projectile (active, age, type, seed)
        this.data = new Float32Array(E2C_MAX_ENTITIES * 4);
        
        // Internal helper vectors to avoid frequent object creation, though we'll work with the buffer mostly
        this._tmpPos = new THREE.Vector3();
    }

    fireProjectile(pos, dir, speed, type) {
        for (let i = 0; i < E2C_MAX_ENTITIES; i++) {
            const idx4 = i * 4;
            if (this.data[idx4] < 0.5) { // Inactive (active is at data[idx * 4])
                const idx3 = i * 3;
                
                // Start slightly offset to avoid clipping the player/camera immediately
                this._tmpPos.copy(pos).addScaledVector(dir, 2.5);
                
                this.positions[idx3] = this._tmpPos.x;
                this.positions[idx3 + 1] = this._tmpPos.y;
                this.positions[idx3 + 2] = this._tmpPos.z;
                
                this.velocities[idx3] = dir.x * speed;
                this.velocities[idx3 + 1] = dir.y * speed;
                this.velocities[idx3 + 2] = dir.z * speed;
                
                // active, age, type, seed
                this.data[idx4] = 1.0;
                this.data[idx4 + 1] = 0.0;
                this.data[idx4 + 2] = type;
                this.data[idx4 + 3] = Math.random();
                return true;
            }
        }
        return false;
    }

    update(delta) {
        for (let i = 0; i < E2C_MAX_ENTITIES; i++) {
            const idx4 = i * 4;
            if (this.data[idx4] > 0.5) {
                const idx3 = i * 3;
                this.data[idx4 + 1] += delta; // Increment age

                // Update positions: p += v * delta
                this.positions[idx3] += this.velocities[idx3] * delta;
                this.positions[idx3 + 1] += this.velocities[idx3 + 1] * delta;
                this.positions[idx3 + 2] += this.velocities[idx3 + 2] * delta;

                let type = this.data[idx4 + 2];
                
                if (type === 1.0) { // Flare
                    // Flares drop slowly and experience air drag
                    this.velocities[idx3 + 1] -= 4.0 * delta; 
                    const drag = 1.0 - 0.8 * delta;
                    this.velocities[idx3] *= drag;
                    this.velocities[idx3 + 1] *= drag;
                    this.velocities[idx3 + 2] *= drag;
                } else if (type === 2.0) { // Chaff
                    // Chaff scatters erratically and falls slowly
                    this.velocities[idx3 + 1] -= 2.0 * delta;
                    this.velocities[idx3] += (Math.random() - 0.5) * 10.0 * delta;
                    this.velocities[idx3 + 2] += (Math.random() - 0.5) * 10.0 * delta;
                    const drag = 1.0 - 1.5 * delta;
                    this.velocities[idx3] *= drag;
                    this.velocities[idx3 + 1] *= drag;
                    this.velocities[idx3 + 2] *= drag;
                }

                // End of life (4 seconds)
                if (this.data[idx4 + 1] > 4.0) {
                    this.data[idx4] = 0.0; // deactivate
                }
            }
        }
    }

    getUniforms() {
        // We still need to pass arrays to Three.js uniforms, 
        // but Three.js can handle typed arrays for vec3/vec4 uniforms efficiently if formatted correctly.
        // Actually, for uniforms of type vec3[N], Three.js expects a flat array.
        return {
            u_e2cPos: { value: this.positions },
            u_e2cVel: { value: this.velocities },
            u_e2cData: { value: this.data }
        };
    }
}

export const E2C_SHADER = {
    uniforms: `
        uniform vec3 u_e2cPos[${E2C_MAX_ENTITIES}];
        uniform vec3 u_e2cVel[${E2C_MAX_ENTITIES}];
        uniform vec4 u_e2cData[${E2C_MAX_ENTITIES}];
    `,
    
    // Returns vec2(distance, materialID)
    map: `
        vec2 mapE2C(vec3 p) {
            vec2 res = vec2(MAX_DIST, 0.0);
            
            for(int i = 0; i < ${E2C_MAX_ENTITIES}; i++) {
                if(u_e2cData[i].x > 0.5) {
                    vec3 pos = u_e2cPos[i];
                    vec3 vel = u_e2cVel[i];
                    float type = u_e2cData[i].z;
                    float age = u_e2cData[i].y;
                    float seed = u_e2cData[i].w;
                    
                    if (type < 0.5) { // 0: Railgun Slug
                        // Create a capsule for motion blur streak
                        float speed = length(vel);
                        vec3 dir = speed > 0.0 ? vel / speed : vec3(0.0,0.0,1.0);
                        vec3 tail = pos - dir * min(speed * 0.08, 10.0);
                        
                        // Make slug thinner for railgun
                        float d = sdCapsule(p, pos, tail, 0.08);
                        
                        // Plasma energy distortion
                        d -= 0.02 * sin(length(p - pos) * 20.0 - u_time * 50.0);
                        
                        // Very intense trail glow
                        globalGlow += (0.15) / (0.01 + d * d);
                        
                        if (d < res.x) res = vec2(d, 8.0);
                    } 
                    else if (type > 0.5 && type < 1.5) { // 1: Flare
                        float radius = 0.2 + 0.1 * sin(u_time * 20.0 + seed * 100.0);
                        float d = length(p - pos) - radius;
                        
                        // Intense volumetric red/orange glow, fades near end of life
                        float intensity = smoothstep(4.0, 3.0, age);
                        globalGlow += (0.2 * intensity) / (0.01 + d * d);
                        
                        if (d < res.x) res = vec2(d, 9.0);
                    }
                    else if (type > 1.5) { // 2: Chaff
                        vec3 q = p - pos;
                        // Organic distortion via fbm
                        float noise = fbm(q * 15.0 + u_time * 2.0 + seed * 50.0);
                        float d = length(q) - 0.4 + noise * 0.3;
                        
                        if (d < res.x) res = vec2(d, 10.0);
                    }
                }
            }
            return res;
        }
    `,

    shade: `
        if (matID == 8.0) { // Railgun Slug
            albedo = vec3(0.1);
            emission = vec3(1.0, 0.4, 0.1) * 20.0; // extremely bright orange/yellow core
            roughness = 0.1;
        } 
        else if (matID == 9.0) { // Flare
            albedo = vec3(1.0);
            emission = vec3(1.0, 0.1, 0.0) * 10.0 * max(0.2, sin(u_time * 30.0 + p.x)); // intermittent flash
            roughness = 0.9;
        }
        else if (matID == 10.0) { // Chaff
            albedo = vec3(0.9, 0.95, 1.0);
            roughness = 0.2;
            // Full silver/metallic reflections (approximated here)
        }
    `
};
