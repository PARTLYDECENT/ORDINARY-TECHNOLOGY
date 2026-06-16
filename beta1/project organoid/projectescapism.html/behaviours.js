/**
 * behaviours.js - Dedicated Zombie Movement, Steering, and Predictive Aiming Engine
 * Runs inside the translator Web Worker.
 * Handles: Boid separation/cohesion, obstacle avoidance, predictive aiming,
 * and flanking/intercept paths.
 */

const ZombieBehaviours = {
    /**
     * Steers a zombie toward a target while avoiding obstacles in the costField.
     */
    seek: function (zx, zz, tx, tz, costField, config, playerX, playerZ) {
        let vx = tx - zx;
        let vz = tz - zz;
        const len = Math.sqrt(vx * vx + vz * vz);

        if (len > 0.1) {
            vx /= len;
            vz /= len;
        }

        // --- DYNAMIC OBSTACLE AVOIDANCE (reading costField) ---
        // Look ahead in the direction of movement
        const lookAheadDist = 3.5;
        const lax = zx + vx * lookAheadDist;
        const laz = zz + vz * lookAheadDist;

        const mid = Math.floor(config.gridSize / 2);
        const cellX = Math.floor((lax - playerX) / config.cellSize) + mid;
        const cellZ = Math.floor((laz - playerZ) / config.cellSize) + mid;

        if (cellX >= 0 && cellX < config.gridSize && cellZ >= 0 && cellZ < config.gridSize) {
            const idx = cellZ * config.gridSize + cellX;
            const cost = costField[idx];

            if (cost >= 50) { // Wall, obstacle, or fortress
                // Calculate a steering vector perpendicular to the wall to push around it
                const perpX = -vz;
                const perpZ = vx;

                // Test which perpendicular side has lower cost
                const lxL = Math.floor((zx + perpX * 2.5 - playerX) / config.cellSize) + mid;
                const lzL = Math.floor((zz + perpZ * 2.5 - playerZ) / config.cellSize) + mid;
                let costLeft = 255;
                if (lxL >= 0 && lxL < config.gridSize && lzL >= 0 && lzL < config.gridSize) {
                    costLeft = costField[lzL * config.gridSize + lxL];
                }

                const sign = (costLeft < 50) ? 1.0 : -1.0;
                vx = vx * 0.3 + perpX * sign * 1.2;
                vz = vz * 0.3 + perpZ * sign * 1.2;

                const nLen = Math.sqrt(vx * vx + vz * vz);
                if (nLen > 0) {
                    vx /= nLen;
                    vz /= nLen;
                }
            }
        }

        return { vx, vz };
    },

    /**
     * Computes flocking separation and cohesion forces for organic group steering.
     */
    flock: function (i, zx, zz, vx, vz, getNearby, zPosX, zPosZ) {
        let sepX = 0, sepZ = 0, sepCount = 0;
        let cohX = 0, cohZ = 0, cohCount = 0;

        const nearby = getNearby(zx, zz);
        for (let n = 0; n < nearby.length; n++) {
            const j = nearby[n];
            if (i === j) continue;

            const dx = zx - zPosX[j];
            const dz = zz - zPosZ[j];
            const dSq = dx * dx + dz * dz;

            if (dSq < 1.4 && dSq > 0.001) {
                // Separation
                const dist = Math.sqrt(dSq);
                const inv = 1.0 / (dist + 0.05);
                sepX += dx * inv;
                sepZ += dz * inv;
                sepCount++;
            } else if (dSq < 6.0) {
                // Cohesion (pull towards neighbors to form packs)
                cohX += zPosX[j];
                cohZ += zPosZ[j];
                cohCount++;
            }
        }

        if (sepCount > 0) {
            vx += sepX * 1.3;
            vz += sepZ * 1.3;
        }
        if (cohCount > 0) {
            cohX /= cohCount;
            cohZ /= cohCount;
            vx += (cohX - zx) * 0.15;
            vz += (cohZ - zz) * 0.15;
        }

        const len = Math.sqrt(vx * vx + vz * vz);
        if (len > 0.001) {
            vx /= len;
            vz /= len;
        }

        return { vx, vz };
    },

    /**
     * Predictive target interception for throwers and pukers.
     * Guesses the player's position after `leadTime` seconds.
     */
    predictTarget: function (px, pz, pvx, pvz, pSpeed, leadTime) {
        return {
            x: px + pvx * pSpeed * leadTime,
            z: pz + pvz * pvz * pSpeed * leadTime
        };
    }
};
