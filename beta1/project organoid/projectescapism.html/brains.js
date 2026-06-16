/**
 * brains.js - Dedicated Horde AI Cognitive & Decision Engine
 * Runs inside the translator Web Worker.
 * Handles: Dynamic awareness range, memory tracking, and immediate target drop limits.
 */

// Persistent cognitive memory buffers for all 2500 potential active zombies
const zLastKnownX = new Float32Array(2500);
const zLastKnownZ = new Float32Array(2500);
const zHasMemory = new Uint8Array(2500);

// Sensory parameters
const BASE_SENSE_RANGE = 18.0;
const GIVE_UP_DIST = 26.0; // The threshold beyond which zombies give up chasing and return to shamble
const MEMORY_TIMEOUT = 8.0; // Seconds to remember player's last position before giving up

const ZombieBrain = {
    /**
     * Evaluates a zombie's sensory awareness, memory, and cognitive state.
     * Selects the next behavior state and steering intent.
     */
    think: function (i, zx, zz, px, pz, distToPlayer, delta, elapsed, config, hp, type, currentBehavior, timer) {
        let sensoryRadius = BASE_SENSE_RANGE;

        // TARGET STATE MACHINE
        let nextBehavior = currentBehavior;
        let targetX = px;
        let targetZ = pz;

        // IF PLAYER GETS FAR AWAY, THEY GIVE UP INSTANTLY
        if (distToPlayer > GIVE_UP_DIST) {
            zHasMemory[i] = 0;
            nextBehavior = 0; // SHAMBLE (Give up completely)
            timer = 0;
        } else if (distToPlayer < sensoryRadius) {
            // Target acquired
            zLastKnownX[i] = px;
            zLastKnownZ[i] = pz;
            zHasMemory[i] = 1;
            timer = 0; // reset state timer when target is seen

            // If shamble, wake up and charge
            if (currentBehavior === 0) {
                nextBehavior = 1; // CHARGE
            }
        } else {
            // Player is outside direct sensory radius but within give up threshold
            if (zHasMemory[i] === 1) {
                // Investigate memory of player's last known location
                const mx = zLastKnownX[i];
                const mz = zLastKnownZ[i];
                const dx = mx - zx;
                const dz = mz - zz;
                const distToMemory = Math.sqrt(dx * dx + dz * dz);

                if (distToMemory > 1.5 && timer < MEMORY_TIMEOUT) {
                    // Head to memory location
                    targetX = mx;
                    targetZ = mz;
                    nextBehavior = 3; // Flank / Investigate steering
                } else {
                    // Lost memory, return to wandering
                    zHasMemory[i] = 0;
                    nextBehavior = 0; // SHAMBLE (Give up and idle)
                    timer = 0;
                }
            } else {
                // No direct target and no memory -> wand/shamble
                nextBehavior = 0;
            }
        }

        // Behavior-specific overrides
        if (type === 0) { // Normal
            // If very close to player in charge mode, trigger lethal lunge
            if (nextBehavior === 1 && distToPlayer < 3.0) {
                nextBehavior = 2; // LUNGE
                timer = 0;
            }
        }

        return {
            behavior: nextBehavior,
            tx: targetX,
            tz: targetZ,
            stateTimer: timer
        };
    },

    /**
     * Broadcasts sensory alerts to nearby shambling zombies.
     */
    propagateHiveAlert: function (i, zx, zz, getNearby, zBehavior, zStateTimer) {
        if (zBehavior[i] === 1 || zBehavior[i] === 2) { // Charging or Lunging
            const nearby = getNearby(zx, zz);
            for (let n = 0; n < nearby.length; n++) {
                const j = nearby[n];
                if (zBehavior[j] === 0) { // Shamble
                    zBehavior[j] = 1; // Wake up and join charge
                    zStateTimer[j] = 0;
                    zLastKnownX[j] = zLastKnownX[i];
                    zLastKnownZ[j] = zLastKnownZ[i];
                    zHasMemory[j] = 1;
                }
            }
        }
    }
};
