import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';

export const ENEMY_MAX_ENTITIES = 10;

export class EnemyManager {
    constructor() {
        // Flat buffers for better V8 performance
        // positions: 3 floats per enemy (x, y, z)
        this.positions = new Float32Array(ENEMY_MAX_ENTITIES * 3);
        // states: 4 floats per enemy (active, health, type, age/animTime)
        this.states = new Float32Array(ENEMY_MAX_ENTITIES * 4);
    }

    spawn(position, type = 0) {
        for (let i = 0; i < ENEMY_MAX_ENTITIES; i++) {
            const idx4 = i * 4;
            if (this.states[idx4] < 0.5) { // Inactive
                const idx3 = i * 3;
                this.positions[idx3] = position.x;
                this.positions[idx3 + 1] = position.y;
                this.positions[idx3 + 2] = position.z;
                
                this.states[idx4] = 1.0;
                this.states[idx4 + 1] = 100.0;
                this.states[idx4 + 2] = type;
                this.states[idx4 + 3] = 0.0;
                return true;
            }
        }
        return false;
    }

    update(delta) {
        for (let i = 0; i < ENEMY_MAX_ENTITIES; i++) {
            const idx4 = i * 4;
            if (this.states[idx4] > 0.5) {
                // Advance animation time
                this.states[idx4 + 3] += delta;
                
                // Currently stationary for testing!
            }
        }
    }

    getUniforms() {
        return {
            u_enemyPos: { value: this.positions },
            u_enemyState: { value: this.states }
        };
    }
}

export const ENEMY_SHADER = {
    helpers: `
        // --- HASH & NOISE FOR REALISM ---
        float enemy_hash(vec3 p) {
            p = fract(p * 0.3183099 + 0.1);
            p *= 17.0;
            return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
        }

        float enemy_noise(in vec3 x) {
            vec3 i = floor(x);
            vec3 f = fract(x);
            f = f * f * (3.0 - 2.0 * f);
            return mix(mix(mix(enemy_hash(i + vec3(0,0,0)), enemy_hash(i + vec3(1,0,0)), f.x),
                           mix(enemy_hash(i + vec3(0,1,0)), enemy_hash(i + vec3(1,1,0)), f.x), f.y),
                       mix(mix(enemy_hash(i + vec3(0,0,1)), enemy_hash(i + vec3(1,0,1)), f.x),
                           mix(enemy_hash(i + vec3(0,1,1)), enemy_hash(i + vec3(1,1,1)), f.x), f.y), f.z);
        }
        
        float sdEllipsoid(vec3 p, vec3 r) {
            float k0 = length(p/r);
            float k1 = length(p/(r*r));
            return k0*(k0-1.0)/k1;
        }

        float ssub(float d1, float d2, float k) {
            float h = clamp(0.5 - 0.5 * (d2 + d1) / k, 0.0, 1.0);
            return mix(d1, -d2, h) + k * h * (1.0 - h);
        }
    `,

    uniforms: `
        uniform vec3 u_enemyPos[${ENEMY_MAX_ENTITIES}];
        uniform vec4 u_enemyState[${ENEMY_MAX_ENTITIES}];
    `,

    // mapZombie takes a local space point `p` and returns the SDF + MatID
    map: `
        vec2 mapEnemies(vec3 worldP) {
            vec2 res = vec2(MAX_DIST, 0.0);

            for(int i = 0; i < ${ENEMY_MAX_ENTITIES}; i++) {
                if(u_enemyState[i].x > 0.5) {
                    vec3 ePos = u_enemyPos[i];
                    float time = u_enemyState[i].w * 4.0; 
                    
                    // Transform point to local enemy space
                    vec3 p = worldP - ePos;
                    
                    // Look AT player (we don't have facing yet, so just leave standard for now)
                    // For now, let's just make it face Z-negative
                    p.xz *= rot(-3.14159);
                    
                    // --- ZOMBIE SDF ---
                    // Scale the zombie up to fit the massive world space (originally designed tiny)
                    float scale = 0.2; // Divide p by scale to make the object 5x bigger
                    vec3 bp = p * scale;
                    
                    float bounce = abs(sin(time * 0.8)) * 0.15;
                    bp.y -= bounce;
                    
                    // Lift zombie drastically so feet are at ground level (our ground is at y=15)
                    bp.y -= 2.5; 
                    bp.x -= sin(time * 0.4) * 0.05; 
                    
                    // Torso
                    vec3 tp = bp - vec3(0.0, 1.2, 0.0);
                    tp.xy *= rot(sin(time * 0.4) * 0.08); 
                    tp.xz *= rot(-sin(time * 0.8) * 0.15); 
                    tp.yz *= rot(0.3); 
                    
                    float torso = sdCapsule(tp, vec3(0.0, 0.1, 0.0), vec3(0.0, -0.6, 0.0), 0.22);
                    torso = smin(torso, sdEllipsoid(tp - vec3(0.0, -0.2, 0.08), vec3(0.25, 0.35, 0.25)), 0.1); 
                    
                    // Ribcage
                    vec3 rp = tp;
                    rp.z -= 0.18; rp.y += 0.05;
                    float ribs = sdCapsule(rp, vec3(-0.15, 0.0, 0.0), vec3(0.15, 0.0, 0.0), 0.03);
                    rp.y -= 0.12; ribs = min(ribs, sdCapsule(rp, vec3(-0.16, 0.0, 0.0), vec3(0.16, 0.0, 0.0), 0.03));
                    rp.y -= 0.12; ribs = min(ribs, sdCapsule(rp, vec3(-0.17, 0.0, 0.0), vec3(0.17, 0.0, 0.0), 0.03));
                    rp.y -= 0.12; ribs = min(ribs, sdCapsule(rp, vec3(-0.15, 0.0, 0.0), vec3(0.15, 0.0, 0.0), 0.03));
                    
                    // Head
                    vec3 hp = tp - vec3(0.0, 0.28, 0.05); 
                    hp.xz *= rot(sin(time * 0.8) * 0.15); 
                    hp.yz *= rot(sin(time * 0.8) * 0.05 - 0.2); 
                    hp.xy *= rot(sin(time * 0.3) * 0.1);
                    float head = sdEllipsoid(hp, vec3(0.2, 0.25, 0.24));
                    float jaw = sdCapsule(hp, vec3(0.0, -0.05, 0.05), vec3(0.0, -0.25, 0.15), 0.11);
                    head = smin(head, jaw, 0.05);
                    float leftSocket = length(hp - vec3(-0.08, 0.05, 0.2)) - 0.07;
                    head = max(head, -leftSocket); 

                    // Tumor
                    vec3 rEyePos = hp - vec3(0.18, 0.12, 0.28); 
                    float tumor = length(hp - vec3(0.14, 0.08, 0.2)) - 0.14; 
                    head = smin(head, tumor, 0.1); 
                    head = max(head, -(length(rEyePos) - 0.09));
                    float gVirusEyes = min(length(rEyePos) - 0.085, length(hp - vec3(-0.08, 0.05, 0.21)) - 0.02);

                    // Arms
                    vec3 laP = tp - vec3(-0.28, -0.05, 0.0);
                    laP.yz *= rot(1.2 + sin(time * 0.8) * 0.1); laP.xz *= rot(0.2);
                    float lArm = sdCapsule(laP, vec3(0.0), vec3(0.0, -0.5, 0.0), 0.07);
                    vec3 llaP = laP - vec3(0.0, -0.5, 0.0);
                    llaP.yz *= rot(0.6); 
                    lArm = smin(lArm, sdCapsule(llaP, vec3(0.0), vec3(0.0, -0.5, 0.0), 0.05), 0.06);

                    vec3 raP = tp - vec3(0.28, -0.05, 0.0);
                    raP.yz *= rot(0.2 + cos(time * 0.8) * 0.1); raP.xy *= rot(0.15);
                    float rArm = sdCapsule(raP, vec3(0.0), vec3(0.0, -0.45, 0.0), 0.07);
                    vec3 rlaP = raP - vec3(0.0, -0.45, 0.0);
                    rlaP.yz *= rot(0.1);
                    rArm = smin(rArm, sdCapsule(rlaP, vec3(0.0), vec3(0.0, -0.45, 0.0), 0.05), 0.06);

                    // Legs
                    float lSwing = sin(time * 0.8);
                    float rSwing = -sin(time * 0.8); 
                    vec3 llP = bp - vec3(-0.14, 0.6, 0.0);
                    llP.yz *= rot(lSwing * 0.5); 
                    float lLeg = sdCapsule(llP, vec3(0.0), vec3(0.0, -0.5, 0.0), 0.09);
                    vec3 lllP = llP - vec3(0.0, -0.5, 0.0);
                    lllP.yz *= rot(-max(0.0, lSwing * 0.8)); 
                    lLeg = smin(lLeg, sdCapsule(lllP, vec3(0.0), vec3(0.0, -0.5, 0.0), 0.07), 0.06);

                    vec3 rlP = bp - vec3(0.14, 0.6, 0.0);
                    rlP.yz *= rot(rSwing * 0.5); 
                    float rLeg = sdCapsule(rlP, vec3(0.0), vec3(0.0, -0.5, 0.0), 0.1); 
                    vec3 rllP = rlP - vec3(0.0, -0.5, 0.0);
                    rllP.yz *= rot(-max(0.0, rSwing * 0.8)); 
                    rLeg = smin(rLeg, sdCapsule(rllP, vec3(0.0), vec3(0.0, -0.5, 0.0), 0.08), 0.06);

                    float zombie = smin(torso, head, 0.1);
                    zombie = smin(zombie, lArm, 0.08); zombie = smin(zombie, rArm, 0.08);
                    zombie = smin(zombie, lLeg, 0.1); zombie = smin(zombie, rLeg, 0.1);
                    
                    float fleshDetail = enemy_noise(p * 8.0) * 0.03;
                    fleshDetail += enemy_noise(p * 20.0) * 0.01;
                    zombie -= fleshDetail; 
                    
                    float wound = length(tp - vec3(0.15, -0.2, 0.15)) - 0.18;
                    zombie = ssub(zombie, ribs, 0.04);
                    zombie = ssub(zombie, wound, 0.05);

                    if(zombie < res.x) res = vec2(zombie / scale, 20.0); // ID 20 = Zombie Flesh
                    if(gVirusEyes < res.x) res = vec2(gVirusEyes / scale, 21.0); // ID 21 = G-Virus Eyes
                }
            }

            return res;
        }
    `,

    shade: `
        if (matID == 20.0) { // FLESH
            float fA = float(max(1.0-roughness, 0.0));
            // Add noise variation for bruising, rotting, and wounds
            float nVal = enemy_noise(p * 15.0);
            float bloodNoise = enemy_noise(p * 25.0);
            
            vec3 zCol = vec3(0.35, 0.38, 0.3); // Dead pallid skin
            zCol = mix(zCol, vec3(0.15, 0.18, 0.15), smoothstep(0.3, 0.7, nVal)); // bruises
            zCol = mix(zCol, vec3(0.1, 0.01, 0.01), smoothstep(0.4, 1.0, bloodNoise)); // blood
            
            albedo = zCol;
            roughness = mix(0.9, 0.4, bloodNoise); // Wet blood
            
            // Faux SSS
            emission = vec3(0.1, 0.02, 0.02) * (1.0 - nVal * 0.5) * max(0.0, 1.0 - dot(n, normalize(u_cameraPos - p)));
        } else if (matID == 21.0) { // G-VIRUS EYES
            albedo = vec3(0.0);
            // Glowing core
            emission = mix(vec3(8.0, 1.0, 0.0), vec3(12.0, 8.0, 2.0), pow(clamp(dot(n, viewDir), 0.0, 1.0), 2.0));
            float pupil = smoothstep(0.05, 0.15, abs(n.x));
            emission *= mix(vec3(0.05, 0.0, 0.0), vec3(1.0), pupil); 
        }
    `
};
