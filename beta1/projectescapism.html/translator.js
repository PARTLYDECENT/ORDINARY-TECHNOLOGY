// translator.js
// Dedicated Web Worker to offload Horde AI, Flowfield following, and Matrix computation from the main thread.
self.importScripts('./behaviours.js', './brains.js');

// --- Terrain FBM Map Logic (Copied from terrain.js for independent worker execution) ---
let currentMapId = 'forest';

const TerrainGen = {
    _glsl_mod289: function (x) { return x - Math.floor(x * (1.0 / 289.0)) * 289.0; },
    _glsl_permute: function (x) { return this._glsl_mod289(((x * 34.0) + 1.0) * x); },
    __snoise: function (v_x, v_y) {
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
        let mx = 0.5 - (x0_x * x0_x + x0_y * x0_y); let m0 = mx > 0.0 ? mx : 0.0;
        let my = 0.5 - (x12_x * x12_x + x12_y * x12_y); let m1 = my > 0.0 ? my : 0.0;
        let mz = 0.5 - (x12_z * x12_z + x12_w * x12_w); let m2 = mz > 0.0 ? mz : 0.0;

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

        m0 *= 1.79284291400159 - 0.85373472095314 * (a0_x * a0_x + h_x * h_x);
        m1 *= 1.79284291400159 - 0.85373472095314 * (a0_y * a0_y + h_y * h_y);
        m2 *= 1.79284291400159 - 0.85373472095314 * (a0_z * a0_z + h_z * h_z);

        return 130.0 * (
            m0 * (a0_x * x0_x + h_x * x0_y) +
            m1 * (a0_y * x12_x + h_y * x12_y) +
            m2 * (a0_z * x12_z + h_z * x12_w)
        );
    },
    getDesertDuneHeight: function (x, z) {
        let waveX = Math.sin(x * 0.007 + Math.sin(z * 0.003) * 2.0);
        let duneHeight = Math.pow(Math.abs(waveX * 0.5 + 0.5), 1.6) * 11.0 - 2.5;
        let waveY = Math.cos(z * 0.005 + Math.cos(x * 0.004) * 1.5);
        duneHeight += waveY * 2.5;
        let ripple = this.__snoise(x * 0.08, z * 0.08) * 0.4;
        return duneHeight + ripple;
    },
    getHeight: function (x, z) {
        if (currentMapId === 'desert') {
            return this.getDesertDuneHeight(x, z);
        }
        if (currentMapId === 'facility' || currentMapId === 'endgame') {
            return 0.0; // Flat empty plane
        }
        if (currentMapId === 'abyss') {
            return -8.0; // Deep seafloor
        }

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

        const base = Math.sign(v) * Math.pow(Math.abs(v), 1.2) * 20.0;
        const detail = this.__snoise(x * 0.03, z * 0.03) * 2.5;
        return base + detail;
    },
    getMeshHeight: function (x, z) {
        if (typeof currentMapId !== 'undefined' && currentMapId === 'abyss') {
            const getRaftHash = (cx, cz) => {
                let h = Math.sin(cx * 12.9898 + cz * 78.233) * 43758.5453123;
                return h - Math.floor(h);
            };
            const cs = 6.25;
            const cx = Math.floor(x / cs);
            const cz = Math.floor(z / cs);
            const isRaft = (cx === 0 && cz === 0) || (getRaftHash(cx, cz) < 0.35);
            const centerX = (cx + 0.5) * cs;
            const centerZ = (cz + 0.5) * cs;
            const raftHalf = 2.25;

            if (isRaft) {
                if (Math.abs(x - centerX) <= raftHalf && Math.abs(z - centerZ) <= raftHalf) {
                    return 0.2;
                }
            }

            const raftRight = getRaftHash(cx + 1, cz) < 0.35;
            if (isRaft && raftRight) {
                const nextCenterX = (cx + 1.5) * cs;
                if (x >= centerX && x <= nextCenterX && Math.abs(z - centerZ) <= 0.85) {
                    return 0.2;
                }
            }

            const raftLeft = (cx - 1 === 0 && cz === 0) || (getRaftHash(cx - 1, cz) < 0.35);
            if (raftLeft && isRaft) {
                const prevCenterX = (cx - 0.5) * cs;
                if (x >= prevCenterX && x <= centerX && Math.abs(z - centerZ) <= 0.85) {
                    return 0.2;
                }
            }

            const raftDown = getRaftHash(cx, cz + 1) < 0.35;
            if (isRaft && raftDown) {
                const nextCenterZ = (cz + 1.5) * cs;
                if (z >= centerZ && z <= nextCenterZ && Math.abs(x - centerX) <= 0.85) {
                    return 0.2;
                }
            }

            const raftUp = (cx === 0 && cz - 1 === 0) || (getRaftHash(cx, cz - 1) < 0.35);
            if (raftUp && isRaft) {
                const prevCenterZ = (cz - 0.5) * cs;
                if (z >= prevCenterZ && z <= centerZ && Math.abs(x - centerX) <= 0.85) {
                    return 0.2;
                }
            }
            return -8.0; // Water level
        }
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
    return `${Math.floor(x / s)}_${Math.floor(z / s)}`;
}

// --- Player Tracking for Intercept Paths ---
let lastPlayerX = 0;
let lastPlayerZ = 0;
let playerVelX = 0;
let playerVelZ = 0;
let playerSpeed = 0;

// --- Single Active Nightmare Boss System ---
let currentNightmareBossIndex = -1;
let nightmareBossTimer = 0.0;

// --- Worker Message Listener ---
self.onmessage = function (e) {
    const data = e.data;

    const delta = Math.min(data.delta, 0.1);
    const elapsedTime = data.elapsedTime;
    const px = data.playerPos.x;
    const py = data.playerPos.y || 0.0;
    const pz = data.playerPos.z;
    const config = data.config || {};

    if (lastPlayerX !== 0 || lastPlayerZ !== 0) {
        const invDt = 1.0 / (delta || 0.016);
        playerVelX = (px - lastPlayerX) * invDt;
        playerVelZ = (pz - lastPlayerZ) * invDt;
        playerSpeed = Math.sqrt(playerVelX * playerVelX + playerVelZ * playerVelZ);
        if (playerSpeed > 30.0) { // Clamp teleports/spikes
            playerVelX = 0; playerVelZ = 0; playerSpeed = 0;
        }
    }
    lastPlayerX = px;
    lastPlayerZ = pz;

    // Build dynamic config flags for brain awareness
    config.isRunning = playerSpeed > 3.2;

    const vfX = data.vectorFieldX;
    const vfZ = data.vectorFieldZ;
    if (config.mapId) {
        currentMapId = config.mapId;
    }

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

    // --- Single Nightmare Boss Election System ---
    let currentBossAlive = false;
    if (currentNightmareBossIndex >= 0 && currentNightmareBossIndex < data.spawnedZombies) {
        if (zState[currentNightmareBossIndex] === 1 && zHP[currentNightmareBossIndex] > 0) {
            currentBossAlive = true;
        }
    }
    if (!currentBossAlive) {
        currentNightmareBossIndex = -1;
        nightmareBossTimer = 0.0;
        let candidates = [];
        for (let j = 0; j < data.spawnedZombies; j++) {
            if (zState[j] === 1 && zHP[j] > 0) {
                if (zType[j] === 3) candidates.push(j);
            }
        }
        if (candidates.length === 0) {
            for (let j = 0; j < data.spawnedZombies; j++) {
                if (zState[j] === 1 && zHP[j] > 0) candidates.push(j);
            }
        }
        if (candidates.length > 0) {
            currentNightmareBossIndex = candidates[0];
        }
    }
    if (currentNightmareBossIndex >= 0) {
        nightmareBossTimer = Math.min(1.0, nightmareBossTimer + delta * 0.45);
    } else {
        nightmareBossTimer = 0.0;
    }

    // Output objects
    let frameDamage = 0;
    let triggerShockwave = false;
    const enemyProjectiles = [];
    const triggerAudio = [];

    // Track instances for matrix population
    let nIdx = 0, pIdx = 0, tIdx = 0, mIdx = 0;

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
        const bx = Math.floor(x / s), bz = Math.floor(z / s);
        for (let ox = -1; ox <= 1; ox++) {
            for (let oz = -1; oz <= 1; oz++) {
                const arr = gridCells.get(`${bx + ox}_${bz + oz}`);
                if (arr) {
                    for (let j = 0; j < arr.length; j++) out.push(arr[j]);
                }
            }
        }
        return out;
    }

    // Prepare matrix float arrays (16 floats per matrix per mesh type)
    const normalMatrixArray = new Float32Array(config.maxZombies * 16);
    const pukerMatrixArray = new Float32Array(config.maxZombies * 16);
    const throwerMatrixArray = new Float32Array(config.maxZombies * 16);
    const mutantMatrixArray = new Float32Array(config.maxZombies * 16);

    for (let i = 0; i < data.spawnedZombies; i++) {
        if (zState[i] === 0) continue;

        let zx = zPosX[i];
        let zz = zPosZ[i];

        const type = zType[i];

        if (zState[i] === 3) {
            // Grabbed/held state: skip movement & steering physics.
            // Map the matrix exactly as set by the main thread.
            const cosY = Math.cos(zRotY[i]);
            const sinY = Math.sin(zRotY[i]);
            let scale = type === 3 ? 1.35 : 1.0;
            if (currentMapId === 'nacht') {
                scale *= 2.0;
            }
            let zh = TerrainGen.getMeshHeight(zx, zz);
            if (currentMapId === 'nacht') {
                zh = 0.05;
                if (config.nachtSafeRooms && config.nachtSafeRooms.length) {
                    let bestRoom = null;
                    let minDistY = Infinity;
                    for (let rIdx = 0; rIdx < config.nachtSafeRooms.length; rIdx++) {
                        const r = config.nachtSafeRooms[rIdx];
                        if (zx >= r.minX && zx <= r.maxX && zz >= r.minZ && zz <= r.maxZ) {
                            const distY = Math.abs((r.minY + r.maxY) / 2.0 - py);
                            if (distY < minDistY) {
                                minDistY = distY;
                                bestRoom = r;
                            }
                        }
                    }
                    if (bestRoom) {
                        zh = bestRoom.minY + 0.05;
                    }
                }
            }
            const matrix = [
                cosY * scale, 0, -sinY * scale, 0,
                0, scale, 0, 0,
                sinY * scale, 0, cosY * scale, 0,
                zx, zh, zz, 1
            ];
            let offset = 0;
            if (type === 0) {
                offset = nIdx * 16; normalMatrixArray.set(matrix, offset); nIdx++;
            } else if (type === 1) {
                offset = pIdx * 16; pukerMatrixArray.set(matrix, offset); pIdx++;
            } else if (type === 2) {
                offset = tIdx * 16; throwerMatrixArray.set(matrix, offset); tIdx++;
            } else if (type === 3) {
                offset = mIdx * 16; mutantMatrixArray.set(matrix, offset); mIdx++;
            }
            continue;
        }

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

        const behavior = zBehavior[i];
        zStateTimer[i] += delta;

        // 1. HORDE INTELLECT & DECISION BRAIN
        const brain = ZombieBrain.think(
            i, zx, zz, px, pz, distToPlayer, delta, elapsedTime, config,
            zHP[i], type, behavior, zStateTimer[i]
        );
        zBehavior[i] = brain.behavior;
        zStateTimer[i] = brain.stateTimer;
        let speedMul = zSpeedMul[i];

        // --- EVOLVED SWARM BEHAVIOR: DYNAMIC BIOLOGICAL MORPHING ---
        // Exactly one elected zombie undergoes the horrifying procedural nightmare morph at a time
        const isBoss = (i === currentNightmareBossIndex);
        const morph = (isBoss && type === 3) ? nightmareBossTimer : 0.0;

        // Glitch Infection Aura: Find if this normal zombie is within the boss's glitched simulation range (18 units)
        let isGlitchedSwarmed = false;
        let glitchSwarmFactor = 0.0;
        if (currentNightmareBossIndex >= 0 && !isBoss) {
            const bx = zPosX[currentNightmareBossIndex];
            const bz = zPosZ[currentNightmareBossIndex];
            const dx = zx - bx;
            const dz = zz - bz;
            const distToBoss = Math.sqrt(dx * dx + dz * dz) || 1;
            if (distToBoss < 18.0) {
                isGlitchedSwarmed = true;
                glitchSwarmFactor = (1.0 - (distToBoss / 18.0)) * nightmareBossTimer;
            }
        }
 
        // Reach scale based on physical size growth
        const baseReach = (type === 3) ? 1.6 : 1.5;
        // The Boss expands its reach significantly as scythes and tendrils lash out
        const reachFactor = isBoss ? 1.75 : 0.0;
        const reach = baseReach * (1.0 + morph * reachFactor);
 
        // Apply swarming organic movement (weaving slither path when morphed)
        if (isBoss && morph > 0.05) {
            // Boss has wilder, faster wriggling slither movements
            const slitherSpeed = 10.0;
            const slitherAmp = 0.68;
            const slither = Math.sin(elapsedTime * slitherSpeed + i) * slitherAmp * morph;
            zx += perpX * slither * delta;
            zz += perpZ * slither * delta;
            
            // Boss rushes at the player even faster in morphed state
            speedMul *= (1.0 + morph * 1.5);
            
            // Boss Ability: Holographic Quantum Teleport / Phase Shift
            if (morph > 0.6) {
                if (!self.bossPhaseTimer) self.bossPhaseTimer = 0.0;
                self.bossPhaseTimer += delta;
                if (self.bossPhaseTimer > 3.0 && distToPlayer > 10.0) {
                    self.bossPhaseTimer = 0.0;
                    zx += dirPX * 7.5;
                    zz += dirPZ * 7.5;
                    const pky = TerrainGen.getMeshHeight(zx, zz) + 0.05;
                    enemyProjectiles.push({ type: 'puke', x: zx, y: pky, z: zz, life: 4.0 });
                    triggerAudio.push({ type: 'SLIME_ATTACK' });
                }
            }

            // Boss Ability: Toxic Containment Puddle Bursts around the player
            if (morph > 0.5) {
                zCooldown[i] += delta;
                if (zCooldown[i] > 2.5) {
                    zCooldown[i] = 0;
                    for (let k = 0; k < 5; k++) {
                        const angle = (k / 5) * Math.PI * 2 + elapsedTime;
                        const r = 3.5;
                        const pkX = px + Math.cos(angle) * r;
                        const pkZ = pz + Math.sin(angle) * r;
                        const pky = TerrainGen.getMeshHeight(pkX, pkZ) + 0.05;
                        enemyProjectiles.push({ type: 'puke', x: pkX, y: pky, z: pkZ, life: 4.5 });
                    }
                    triggerAudio.push({ type: 'SLIME_ATTACK' });
                }
            }
        }

        // Apply Glitch Infection Aura parameters on nearby shamblers
        if (isGlitchedSwarmed) {
            // Thrashing, slithering movements
            const slitherSpeed = 16.0;
            const slitherAmp = 0.45;
            const slither = Math.sin(elapsedTime * slitherSpeed + i) * slitherAmp * glitchSwarmFactor;
            zx += perpX * slither * delta;
            zz += perpZ * slither * delta;
            
            // Glitch Speed Boost
            speedMul *= (1.0 + glitchSwarmFactor * 0.9);
        }
 
        // Propagate alert pheromones to surrounding shambling horde members
        ZombieBrain.propagateHiveAlert(i, zx, zz, getNearby, zBehavior, zStateTimer);

        // 2. TYPE-SPECIFIC STEERING & ATTACK BEHAVIORS
        if (type === 3) {
            // Relentless charge/lunge AI for developed mutants
            speedMul *= 1.35; // 35% speed increase
            
            const seekSteer = ZombieBehaviours.seek(zx, zz, brain.tx, brain.tz, data.vectorFieldX || new Uint8Array(0), config, px, pz);
            vx = seekSteer.vx;
            vz = seekSteer.vz;

            // Never shamble; upgrade to charge immediately
            if (zBehavior[i] === 0) {
                zBehavior[i] = 1;
                zStateTimer[i] = 0;
            }

            switch (zBehavior[i]) {
                case 1: // CHARGE
                    speedMul *= 2.5;
                    break;
                case 2: // LUNGE
                    speedMul *= 5.0;
                    if (zStateTimer[i] > 0.3) { zBehavior[i] = 4; zStateTimer[i] = 0; }
                    if (distToPlayer < reach) {
                        frameDamage += 35 + morph * 25; // Developed mutant heavy slam!
                        triggerAudio.push({ type: 'ZOMBIE_ATTACK' });
                        zBehavior[i] = 4; zStateTimer[i] = 0;
                        if (isBoss && morph > 0.5) {
                            triggerShockwave = true;
                            for (let k = 0; k < 8; k++) {
                                const angle = (k / 8) * Math.PI * 2 + elapsedTime;
                                const spX = zx + Math.cos(angle) * 0.8;
                                const spZ = zz + Math.sin(angle) * 0.8;
                                const spy = TerrainGen.getMeshHeight(spX, spZ) + 1.2;
                                enemyProjectiles.push({
                                    type: 'rock',
                                    x: spX,
                                    y: spy,
                                    z: spZ,
                                    dir: { x: Math.cos(angle), y: 0.1, z: Math.sin(angle) },
                                    speed: 14.0,
                                    life: 2.8
                                });
                            }
                        }
                    }
                    break;
                case 3: // FLANK (Developed flanking charge)
                    const flankS = (i % 2 === 0) ? 1 : -1;
                    vx = perpX * flankS * 0.85 + dirPX * 0.15;
                    vz = perpZ * flankS * 0.85 + dirPZ * 0.15;
                    speedMul *= 1.8;
                    if (zStateTimer[i] > 1.5 + (i % 3)) { zBehavior[i] = 1; zStateTimer[i] = 0; }
                    break;
                case 4: // RECOVER
                    vx *= 0.1; vz *= 0.1; speedMul = 0.2;
                    if (zStateTimer[i] > 0.8) { zBehavior[i] = 1; zStateTimer[i] = 0; } // back to charge!
                    break;
            }
            if (distToPlayer < reach && zBehavior[i] !== 2) {
                frameDamage += (10 + morph * 15) * delta; // heavy standard attack
            }

            // Force clamp speed for Hantavirus Phage Boss to keep walk creepy and menacing
            if (isBoss) {
                speedMul = 0.55;
            }
        } else if (type === 1) { // PUKER
            if (distToPlayer < 12) {
                const fs = (i % 2 === 0) ? 1 : -1;
                vx = perpX * fs * 0.7 + dirPX * (distToPlayer < 6 ? -0.4 : 0.3);
                vz = perpZ * fs * 0.7 + dirPZ * (distToPlayer < 6 ? -0.4 : 0.3);
                speedMul *= 0.8;
            }
            zCooldown[i] += delta;
            if (zCooldown[i] > 3.0 && distToPlayer < 12) {
                zCooldown[i] = 0;
                // Predictive lead aiming (trap player where they are running)
                const pred = ZombieBehaviours.predictTarget(px, pz, playerVelX, playerVelZ, playerSpeed, 0.55);
                const pukeX = zx + (pred.x - zx) * 0.4;
                const pukeZ = zz + (pred.z - zz) * 0.4;
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
                // Predictive rock throws (high accuracy prediction at 0.75s lead)
                const pred = ZombieBehaviours.predictTarget(px, pz, playerVelX, playerVelZ, playerSpeed, 0.75);
                const toPredX = pred.x - zx;
                const toPredZ = pred.z - zz;
                const dPred = Math.sqrt(toPredX * toPredX + toPredZ * toPredZ) || 1;
                const dir = { x: toPredX / dPred, y: 0.3, z: toPredZ / dPred };
                enemyProjectiles.push({ type: 'rock', x: zx, y: 1.5, z: zz, dir: dir, speed: 12.0, life: 3.0 });
            }
        } else {
            // NORMAL ZOMBIE PATH COGNITION (Obstacle-avoidance seek steering)
            const seekSteer = ZombieBehaviours.seek(zx, zz, brain.tx, brain.tz, data.vectorFieldX || new Uint8Array(0), config, px, pz);
            vx = seekSteer.vx;
            vz = seekSteer.vz;

            switch (zBehavior[i]) {
                case 0: // SHAMBLE
                    vx = Math.sin(i * 4.5 + elapsedTime) * 0.25;
                    vz = Math.cos(i * 2.8 + elapsedTime) * 0.25;
                    speedMul *= 0.35;
                    break;
                case 1: // CHARGE
                    speedMul *= 2.5;
                    break;
                case 2: // LUNGE
                    speedMul *= 5.0;
                    if (zStateTimer[i] > 0.3) { zBehavior[i] = 4; zStateTimer[i] = 0; }
                    if (distToPlayer < reach) {
                        frameDamage += 25 + morph * 15;
                        triggerAudio.push({ type: 'ZOMBIE_ATTACK' });
                        zBehavior[i] = 4; zStateTimer[i] = 0;
                    }
                    break;
                case 3: // FLANK
                    const flankS = (i % 2 === 0) ? 1 : -1;
                    vx = perpX * flankS * 0.85 + dirPX * 0.15;
                    vz = perpZ * flankS * 0.85 + dirPZ * 0.15;
                    speedMul *= 1.6;
                    if (zStateTimer[i] > 1.5 + (i % 3)) { zBehavior[i] = 1; zStateTimer[i] = 0; }
                    break;
                case 4: // RECOVER
                    vx *= 0.1; vz *= 0.1; speedMul = 0.2;
                    if (zStateTimer[i] > 0.8) { zBehavior[i] = 0; zStateTimer[i] = 0; }
                    break;
            }
            if (distToPlayer < reach && zBehavior[i] !== 2) {
                frameDamage += (5 + morph * 8) * delta;
            }
        }

        // 3. FLOCKING SEPARATION & PACK COHESION
        const flockSteer = ZombieBehaviours.flock(i, zx, zz, vx, vz, getNearby, zPosX, zPosZ);
        vx = flockSteer.vx;
        vz = flockSteer.vz;

        // Apply movement
        zx += vx * config.zombieSpeed * speedMul * delta;
        zz += vz * config.zombieSpeed * speedMul * delta;
        zx += Math.sin(i * 12.3 + elapsedTime * 2) * 0.02;
        zz += Math.cos(i * 4.5 + elapsedTime * 2) * 0.02;

        zPosX[i] = zx;
        zPosZ[i] = zz;

        let faceX = vx, faceZ = vz;
        if (faceX === 0 && faceZ === 0) { faceX = dirPX; faceZ = dirPZ; }
        if (faceX !== 0 || faceZ !== 0) {
            const targetRot = Math.atan2(faceX, faceZ);
            const diff = targetRot - zRotY[i];
            zRotY[i] += Math.atan2(Math.sin(diff), Math.cos(diff)) * 5.0 * delta;
        }

        // --- Calculate 4x4 Matrix for GPU ---
        // Basic translation + Y-axis rotation matrix with dynamic morphing scale
        const cosY = Math.cos(zRotY[i]);
        const sinY = Math.sin(zRotY[i]);
        const baseScale = type === 3 ? 1.35 : 1.0;
        const scaleMultiplier = isBoss ? 1.65 : (isGlitchedSwarmed ? 0.78 * glitchSwarmFactor : 0.0);
        let scale = baseScale * (1.0 + (isBoss ? morph : glitchSwarmFactor) * scaleMultiplier);

        // Determine target mesh properties sitting perfectly on ground level
        let zh = TerrainGen.getMeshHeight(zx, zz);
        if (currentMapId === 'nacht') {
            scale *= 2.0;
            zh = 0.05;
            if (config.nachtSafeRooms && config.nachtSafeRooms.length) {
                let bestRoom = null;
                let minDistY = Infinity;
                for (let rIdx = 0; rIdx < config.nachtSafeRooms.length; rIdx++) {
                    const r = config.nachtSafeRooms[rIdx];
                    if (zx >= r.minX && zx <= r.maxX && zz >= r.minZ && zz <= r.maxZ) {
                        const distY = Math.abs((r.minY + r.maxY) / 2.0 - py);
                        if (distY < minDistY) {
                            minDistY = distY;
                            bestRoom = r;
                        }
                    }
                }
                if (bestRoom) {
                    zh = bestRoom.minY + 0.05;
                }
            }
        }

        // In abyss (Water World) mode, Aqua-Sentinels float at the ocean surface or hover over rafts
        if (currentMapId === 'abyss') {
            if (zh > -2.0) {
                // Hovering gracefully over floating raft decks
                zh = 0.55 + Math.sin(elapsedTime * 3.0 + i) * 0.08;
            } else {
                // Floating buoyant at the ocean surface level
                zh = -0.35 + Math.sin(elapsedTime * 2.2 + i * 1.7) * 0.15;
            }
        }

        // Structure matches THREE.Matrix4 .elements (Column-major order)
        // [ m11, m21, m31, m41, m12, m22, m32, m42, m13, m23, m33, m43, m14, m24, m34, m44 ]
        const matrix = [
            cosY * scale, 0, -sinY * scale, 0,
            0, scale, 0, 0,
            sinY * scale, 0, cosY * scale, 0,
            zx, zh, zz, 1
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
        } else if (type === 3) {
            offset = mIdx * 16;
            mutantMatrixArray.set(matrix, offset);
            mIdx++;
        }
    }

    // Send the results back
    self.postMessage({
        zPosX, zPosZ, zRotY, zBehavior, zStateTimer, zCooldown, zSpeedMul,
        normalMatrixArray, pukerMatrixArray, throwerMatrixArray, mutantMatrixArray,
        nIdx, pIdx, tIdx, mIdx,
        frameDamage,
        enemyProjectiles,
        triggerAudio,
        currentNightmareBossIndex,
        nightmareBossTimer,
        triggerShockwave
    });
};
