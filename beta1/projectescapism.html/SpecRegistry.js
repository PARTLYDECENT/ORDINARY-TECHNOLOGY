/**
 * SpecRegistry - Special Weapon Behaviors
 * Handles Piercing, Singularity Pulls, and Area-of-Effect Explosions.
 */
class SpecRegistry {
    static applyPiercing(bullet, zombieIdx) {
        if (!bullet.pierce) return false;
        bullet.hits = (bullet.hits || 0) + 1;
        if (bullet.hits >= (bullet.maxHits || 3)) return false;
        return true; // Keep bullet alive
    }

    static applySingularity(pos, radius, force) {
        // Find zombies within range and pull them toward pos
        for (let i = 0; i < spawnedZombies; i++) {
            if (zState[i] === 0) continue;
            if (window.RealityPhaseShifter && window.zombieDimensions && window.zombieDimensions[i] !== window.RealityPhaseShifter.activeDimension) continue;
            const dx = zPosX[i] - pos.x;
            const dz = zPosZ[i] - pos.z;
            const distSq = dx*dx + dz*dz;
            if (distSq < radius * radius) {
                const dist = Math.sqrt(distSq);
                const pull = (1.0 - dist / radius) * force;
                zPosX[i] -= (dx / dist) * pull;
                zPosZ[i] -= (dz / dist) * pull;
            }
        }
    }

    static applyAOE(pos, radius, damage) {
        for (let i = 0; i < spawnedZombies; i++) {
            if (zState[i] === 0) continue;
            if (window.RealityPhaseShifter && window.zombieDimensions && window.zombieDimensions[i] !== window.RealityPhaseShifter.activeDimension) continue;
            const dx = zPosX[i] - pos.x;
            const dz = zPosZ[i] - pos.z;
            const distSq = dx*dx + dz*dz;
            if (distSq < radius * radius) {
                zHP[i] = Math.max(0, zHP[i] - damage);
                // Hit effect
                const hurtTimeAttr = zombieMeshes.normal.geometry.attributes.aHurtTime;
                hurtTimeAttr.setX(i, uTime);
                hurtTimeAttr.needsUpdate = true;
            }
        }
    }
}
window.SpecRegistry = SpecRegistry;
