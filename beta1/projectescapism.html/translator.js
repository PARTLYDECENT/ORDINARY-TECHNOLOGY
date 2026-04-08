// translator.js
// Dedicated Web Worker to offload Horde AI, Flowfield following, and Matrix computation from the main thread.

// --- Terrain FBM Map Logic (Copied from terrain.js for independent worker execution) ---
const TerrainGen = {
    _glsl_mod289: function(x) { return x - Math.floor(x * (1.0 / 289.0)) * 289.0; },
    _glsl_permute: function(x) { return this._glsl_mod289(((x * 34.0) + 1.0) * x); },
    __snoise: function(v_x, v_y) {
        let C0 = 0.211324865405187, C1 = 0.366025403784439, C2 = -0.577350269189626, C3 = 0.024390243902439;
        let d_v_Cyy = v_x * C1 + v_y * C1;
        let i_x = Math.floor(v_x + d_v_Cyy);
        let i_y = Math.floor(v_y + d_v_Cyy);
        let d_i_Cxx = i_x * C0 + i_y * C0;
        let x0_x = v_x - i_x + d_i_Cxx;
        let x0_y = v_y - i_y + d_i_Cxx;
        let i1_x = (x0_x > x0_y) ? 1.0 : 0.0;
        let i1_y = (x0_x > x0_y) ? 0.0 : 1.0;
        let x12_x = x0_x + C0 - i1_x;
        let x12_y = x0_y + C0 - i1_y;
        let x12_z = x0_x + C2;
        let x12_w = x0_y + C2;
        i_x = this._glsl_mod289(i_x);
        i_y = this._glsl_mod289(i_y);
        let py0 = this._glsl_permute(i_y + 0.0);
        let py1 = this._glsl_permute(i_y + i1_y);
        let py2 = this._glsl_permute(i_y + 1.0);
        let px0 = this._glsl_permute(py0 + i_x + 0.0);
        let px1 = this._glsl_permute(py1 + i_x + i1_x);
        let px2 = this._glsl_permute(py2 + i_x + 1.0);
        
        // m0 calculation fixes
        let mx = 0.5 - (x0_x*x0_x + x0_y*x0_y); let m0 = mx > 0.0 ? mx : 0.0;
        let my = 0.5 - (x12_x*x12_x + x12_y*x12_y); let m1 = my > 0.0 ? my : 0.0;
        let mz = 0.5 - (x12_z*x12_z + x12_w*x12_w); let m2 = mz > 0.0 ? mz : 0.0;
        
        m0 = m0 * m0; m0 = m0 * m0;
        m1 = m1 * m1; m1 = m1 * m1;
        m2 = m2 * m2; m2 = m2 * m2;
        
        let f0 = px0 * C3; f0 = f0 - Math.floor(f0);
        let f1 = px1 * C3; f1 = f1 - Math.floor(f1);
        let f2 = px2 * C3; f2 = f2 - Math.floor(f2);
        
        let x__x = 2.0 * f0 - 1.0;
        let x__y = 2.0 * f1 - 1.0;
        let x__z = 2.0 * f2 - 1.0;
        
        let h_x = Math.abs(x__x) - 0.5;
        let h_y = Math.abs(x__y) - 0.5;
        let h_z = Math.abs(x__z) - 0.5;
        
        let ox_x = Math.floor(x__x + 0.5);
        let ox_y = Math.floor(x__y + 0.5);
        let ox_z = Math.floor(x__z + 0.5);
        
        let a0_x = x__x - ox_x;
        let a0_y = x__y - ox_y;
        let a0_z = x__z - ox_z;
        
        m0 *= 1.79284291400159 - 0.85373472095314 * (a0_x*a0_x + h_x*h_x);
        m1 *= 1.79284291400159 - 0.85373472095314 * (a0_y*a0_y + h_y*h_y);
        m2 *= 1.79284291400159 - 0.85373472095314 * (a0_z*a0_z + h_z*h_z);
        
        return 130.0 * (
            m0 * (a0_x * x0_x + h_x * x0_y) +
            m1 * (a0_y * x12_x + h_y * x12_y) +
            m2 * (a0_z * x12_z + h_z * x12_w)
        );
    },
    getHeight: function(x, z) {
        let v = 0.0;
        let a = 0.5;
        let px = x * 0.005;
        let py = z * 0.005;
        
        const c = Math.cos(0.5);
        const s = Math.sin(0.5);
        
        for (let i = 0; i < 6; i++) { 
            v += a * this.__snoise(px, py);
            let nx = (c * px - s * py) * 2.0 + 100.0;
            let ny = (s * px + c * py) * 2.0 + 100.0;
            px = nx;
            py = ny;
            a *= 0.5;
        }
        
        const base = Math.sign(v) * Math.pow(Math.abs(v), 1.2) * 55.0;
        const detail = this.__snoise(x * 0.03, z * 0.03) * 2.5;
        return base + detail;
    },
    getMeshHeight: function(x, z) {
        const s = 6.25;
        const x0 = Math.floor(x / s) * s;
        const z0 = Math.floor(z / s) * s;
        const x1 = x0 + s;
        const z1 = z0 + s;
        
        const h00 = this.getHeight(x0, z0);
        const h10 = this.getHeight(x1, z0);
        const h01 = this.getHeight(x0, z1);
        const h11 = this.getHeight(x1, z1);
        
        const u = (x - x0) / s;
        const v = (z - z0) / s;
        
        if (u + v < 1) {
            return h00 + u * (h10 - h00) + v * (h01 - h00);
        } else {
            return h11 + (1 - u) * (h01 - h11) + (1 - v) * (h10 - h11);
        }
    }
};

// --- Spatial Hash Memory for Separation ---
const gridCells = new Map();
function getSpatialGridKey(x, z) {
    const s = 4.0;
    return `${Math.floor(x/s)}_${Math.floor(z/s)}`;
}

// --- Worker Message Listener ---
self.onmessage = function(e) {
    const data = e.data;
    
    const delta = Math.min(data.delta, 0.1);
    const elapsedTime = data.elapsedTime;
    const px = data.playerPos.x;
    const pz = data.playerPos.z;
    const vfX = data.vectorFieldX;
    const vfZ = data.vectorFieldZ;
    const config = data.config;
    
    // Arrays representing state
    const zState = data.zState;
    const zPosX = data.zPosX;
    const zPosZ = data.zPosZ;
    const zRotY = data.zRotY;
    const zType = data.zType;
    const zBehavior = data.zBehavior;
    const zSpeedMul = data.zSpeedMul;
    const zStateTimer = data.zStateTimer;
    const zCooldown = data.zCooldown;
    const zHP = data.zHP;
    
    // Output objects
    let frameDamage = 0;
    const enemyProjectiles = [];
    const triggerAudio = [];
    
    // Track instances for matrix population
    let nIdx = 0, pIdx = 0, tIdx = 0;
    
    gridCells.clear();
    
    // Build spatial hash
    for (let i = 0; i < data.spawnedZombies; i++) {
        if (zState[i] === 0) continue;
        const key = getSpatialGridKey(zPosX[i], zPosZ[i]);
        if (!gridCells.has(key)) gridCells.set(key, []);
        gridCells.get(key).push(i);
    }
    
    // Helper to get nearby
    function getNearby(x, z) {
        const s = 4.0;
        const out = [];
        const bx = Math.floor(x/s), bz = Math.floor(z/s);
        for(let ox=-1; ox<=1; ox++) {
            for(let oz=-1; oz<=1; oz++) {
                const arr = gridCells.get(`${bx+ox}_${bz+oz}`);
                if(arr) {
                    for(let j=0; j<arr.length; j++) out.push(arr[j]);
                }
            }
        }
        return out;
    }

    // Prepare matrix float arrays (16 floats per matrix per mesh type)
    const normalMatrixArray = new Float32Array(config.maxZombies * 16);
    const pukerMatrixArray = new Float32Array(config.maxZombies * 16);
    const throwerMatrixArray = new Float32Array(config.maxZombies * 16);

    for (let i = 0; i < data.spawnedZombies; i++) {
        if (zState[i] === 0) continue;

        let zx = zPosX[i];
        let zz = zPosZ[i];

        const mid = Math.floor(config.gridSize / 2);
        const lx = Math.floor((zx - px) / config.cellSize) + mid;
        const lz = Math.floor((zz - pz) / config.cellSize) + mid;

        let vx = 0, vz = 0;
        if (lx >= 0 && lx < config.gridSize && lz >= 0 && lz < config.gridSize) {
            const idx = lz * config.gridSize + lx;
            vx = vfX[idx];
            vz = vfZ[idx];
        } else {
            vx = px > zx ? 1 : -1;
            vz = pz > zz ? 1 : -1;
        }

        const toPlayerX = px - zx;
        const toPlayerZ = pz - zz;
        const distToPlayer = Math.sqrt(toPlayerX * toPlayerX + toPlayerZ * toPlayerZ) || 1;
        const dirPX = toPlayerX / distToPlayer;
        const dirPZ = toPlayerZ / distToPlayer;
        const perpX = -dirPZ;
        const perpZ = dirPX;

        const type = zType[i];
        const behavior = zBehavior[i];
        let speedMul = zSpeedMul[i];
        zStateTimer[i] += delta;

        // --- TYPE-SPECIFIC BEHAVIOR ---
        if (type === 1) { // PUKER
            if (distToPlayer < 12) {
                const fs = (i % 2 === 0) ? 1 : -1;
                vx = perpX * fs * 0.7 + dirPX * (distToPlayer < 6 ? -0.4 : 0.3);
                vz = perpZ * fs * 0.7 + dirPZ * (distToPlayer < 6 ? -0.4 : 0.3);
                speedMul *= 0.8;
            }
            zCooldown[i] += delta;
            if (zCooldown[i] > 3.0 && distToPlayer < 12) {
                zCooldown[i] = 0;
                const pukeX = zx + dirPX * distToPlayer * 0.4;
                const pukeZ = zz + dirPZ * distToPlayer * 0.4;
                const py = TerrainGen.getMeshHeight(pukeX, pukeZ) + 0.05;
                enemyProjectiles.push({ type: 'puke', x: pukeX, y: py, z: pukeZ, life: 5.0 });
                triggerAudio.push({ type: 'SLIME_ATTACK' });
            }
            if (distToPlayer < 1.5) frameDamage += 3 * delta;
        } else if (type === 2) { // THROWER
            const fs = (i % 2 === 0) ? 1 : -1;
            if (distToPlayer < 20) {
                if (distToPlayer < 8) {
                    vx = -dirPX; vz = -dirPZ; speedMul *= 1.2;
                } else if (distToPlayer < 15) {
                    vx = perpX * fs * 0.8 + dirPX * 0.1;
                    vz = perpZ * fs * 0.8 + dirPZ * 0.1;
                }
            }
            zCooldown[i] += delta;
            if (zCooldown[i] > 3.5 && distToPlayer < 20 && distToPlayer > 5) {
                zCooldown[i] = 0;
                const dir = { x: dirPX, y: 0.3, z: dirPZ };
                enemyProjectiles.push({ type: 'rock', x: zx, y: 1.5, z: zz, dir: dir, speed: 12.0, life: 3.0 });
            }
        } else {
            // NORMAL ZOMBIE STATE MACHINE
            switch (behavior) {
                case 0:
                    if (distToPlayer < 18) { zBehavior[i] = 1; zStateTimer[i] = 0; }
                    if (i % 10 < 3 && distToPlayer < 25 && distToPlayer > 8) { zBehavior[i] = 3; zStateTimer[i] = 0; }
                    break;
                case 1:
                    vx = dirPX; vz = dirPZ; speedMul *= 2.5;
                    if (distToPlayer < 3.0) { zBehavior[i] = 2; zStateTimer[i] = 0; }
                    if (distToPlayer > 28) { zBehavior[i] = 0; zStateTimer[i] = 0; }
                    break;
                case 2:
                    vx = dirPX; vz = dirPZ; speedMul *= 5.0;
                    if (zStateTimer[i] > 0.3) { zBehavior[i] = 4; zStateTimer[i] = 0; }
                    if (distToPlayer < 1.5) {
                        frameDamage += 25;
                        triggerAudio.push({ type: 'ZOMBIE_ATTACK' });
                        zBehavior[i] = 4; zStateTimer[i] = 0;
                    }
                    break;
                case 3:
                    const flankS = (i % 2 === 0) ? 1 : -1;
                    vx = perpX * flankS * 0.8 + dirPX * 0.2;
                    vz = perpZ * flankS * 0.8 + dirPZ * 0.2;
                    speedMul *= 1.6;
                    if (zStateTimer[i] > 1.5 + (i % 3)) { zBehavior[i] = 1; zStateTimer[i] = 0; }
                    if (distToPlayer > 32) { zBehavior[i] = 0; zStateTimer[i] = 0; }
                    break;
                case 4:
                    vx *= 0.1; vz *= 0.1; speedMul = 0.2;
                    if (zStateTimer[i] > 0.8) { zBehavior[i] = 0; zStateTimer[i] = 0; }
                    break;
            }
            if (distToPlayer < 1.5 && behavior !== 2) {
                frameDamage += 5 * delta;
            }
        }

        // Separation (boids)
        let sepX = 0, sepZ = 0, sepCount = 0;
        const nearby = getNearby(zx, zz);
        for (let n = 0; n < nearby.length; n++) {
            const j = nearby[n];
            if (i === j) continue;
            const dx = zx - zPosX[j];
            const dz = zz - zPosZ[j];
            const dSq = dx * dx + dz * dz;
            if (dSq < 1.2 && dSq > 0.001) {
                const inv = 1.0 / (Math.sqrt(dSq) + 0.1);
                sepX += dx * inv; sepZ += dz * inv;
                sepCount++;
            }
        }
        if (sepCount > 0) {
            vx += sepX * 1.2; vz += sepZ * 1.2;
            const len = Math.sqrt(vx * vx + vz * vz);
            if (len > 0) { vx /= len; vz /= len; }
        }

        // Apply movement
        zx += vx * config.zombieSpeed * speedMul * delta;
        zz += vz * config.zombieSpeed * speedMul * delta;
        zx += Math.sin(i * 12.3 + elapsedTime * 2) * 0.02;
        zz += Math.cos(i * 4.5 + elapsedTime * 2) * 0.02;

        zPosX[i] = zx;
        zPosZ[i] = zz;

        // Determine target mesh properties
        const zh = TerrainGen.getMeshHeight(zx, zz);
        
        let faceX = vx, faceZ = vz;
        if (faceX === 0 && faceZ === 0) { faceX = dirPX; faceZ = dirPZ; }
        if (faceX !== 0 || faceZ !== 0) {
            const targetRot = Math.atan2(faceX, faceZ);
            const diff = targetRot - zRotY[i];
            zRotY[i] += Math.atan2(Math.sin(diff), Math.cos(diff)) * 5.0 * delta;
        }

        // --- Calculate 4x4 Matrix for GPU ---
        // Basic translation + Y-axis rotation matrix
        const cosY = Math.cos(zRotY[i]);
        const sinY = Math.sin(zRotY[i]);
        
        // Structure matches THREE.Matrix4 .elements (Column-major order)
        // [ m11, m21, m31, m41, m12, m22, m32, m42, m13, m23, m33, m43, m14, m24, m34, m44 ]
        const matrix = [
             cosY,  0, -sinY,  0,
                0,  1,     0,  0,
             sinY,  0,  cosY,  0,
               zx, zh,    zz,  1
        ];

        let offset = 0;
        if (type === 0) {
            offset = nIdx * 16;
            normalMatrixArray.set(matrix, offset);
            nIdx++;
        } else if (type === 1) {
            offset = pIdx * 16;
            pukerMatrixArray.set(matrix, offset);
            pIdx++;
        } else if (type === 2) {
            offset = tIdx * 16;
            throwerMatrixArray.set(matrix, offset);
            tIdx++;
        }
    }

    // Send the results back
    self.postMessage({
        zPosX, zPosZ, zRotY, zBehavior, zStateTimer, zCooldown, zSpeedMul,
        normalMatrixArray, pukerMatrixArray, throwerMatrixArray,
        nIdx, pIdx, tIdx,
        frameDamage,
        enemyProjectiles,
        triggerAudio
    });
};
