/**
 * ENTITY-BEHAVIORS.JS
 * Advanced behavior system for procedural entities
 * Implements flocking, hunting, territorial, symbiosis, and curiosity behaviors
 */

class EntityBehaviors {
    constructor() {
        this.mousePosition = { x: 0, y: 0 };
        this.territories = new Map(); // entity.id -> territory zone
        this.symbioticPairs = new Map(); // entity.id -> partner entity.id

        // Track mouse position
        if (typeof window !== 'undefined') {
            window.addEventListener('mousemove', (e) => {
                this.mousePosition.x = e.clientX;
                this.mousePosition.y = e.clientY;
            });
        }
    }

    /**
     * FLOCKING BEHAVIOR
     * Implements Reynolds' boids algorithm: separation, alignment, cohesion
     */
    applyFlocking(entity, allEntities, config = {}) {
        const perceptionRadius = config.perceptionRadius || 150;
        const separationWeight = config.separationWeight || 1.5;
        const alignmentWeight = config.alignmentWeight || 1.0;
        const cohesionWeight = config.cohesionWeight || 1.0;

        const neighbors = this.getNeighbors(entity, allEntities, perceptionRadius);
        if (neighbors.length === 0) return { x: 0, y: 0 };

        // Separation: steer away from nearby entities
        const separation = this.calculateSeparation(entity, neighbors);

        // Alignment: steer towards average heading of neighbors
        const alignment = this.calculateAlignment(entity, neighbors);

        // Cohesion: steer towards center of mass of neighbors
        const cohesion = this.calculateCohesion(entity, neighbors);

        return {
            x: separation.x * separationWeight + alignment.x * alignmentWeight + cohesion.x * cohesionWeight,
            y: separation.y * separationWeight + alignment.y * alignmentWeight + cohesion.y * cohesionWeight
        };
    }

    getNeighbors(entity, allEntities, radius) {
        return allEntities.filter(other => {
            if (other.id === entity.id || !other.alive) return false;
            const dx = other.position.x - entity.position.x;
            const dy = other.position.y - entity.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            return distance < radius;
        });
    }

    calculateSeparation(entity, neighbors) {
        let steerX = 0, steerY = 0;

        neighbors.forEach(other => {
            const dx = entity.position.x - other.position.x;
            const dy = entity.position.y - other.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > 0) {
                steerX += dx / distance;
                steerY += dy / distance;
            }
        });

        if (neighbors.length > 0) {
            steerX /= neighbors.length;
            steerY /= neighbors.length;
        }

        return { x: steerX, y: steerY };
    }

    calculateAlignment(entity, neighbors) {
        let avgVelX = 0, avgVelY = 0;

        neighbors.forEach(other => {
            avgVelX += other.velocity.x;
            avgVelY += other.velocity.y;
        });

        if (neighbors.length > 0) {
            avgVelX /= neighbors.length;
            avgVelY /= neighbors.length;
        }

        return { x: avgVelX * 0.1, y: avgVelY * 0.1 };
    }

    calculateCohesion(entity, neighbors) {
        let centerX = 0, centerY = 0;

        neighbors.forEach(other => {
            centerX += other.position.x;
            centerY += other.position.y;
        });

        if (neighbors.length > 0) {
            centerX /= neighbors.length;
            centerY /= neighbors.length;

            const dx = centerX - entity.position.x;
            const dy = centerY - entity.position.y;

            return { x: dx * 0.01, y: dy * 0.01 };
        }

        return { x: 0, y: 0 };
    }

    /**
     * HUNTING BEHAVIOR
     * Predator entities chase smaller/weaker prey
     */
    applyHunting(entity, allEntities, config = {}) {
        const huntingRange = config.huntingRange || 300;
        const isPredator = entity.stage >= 2; // Only creatures and above hunt

        if (!isPredator) return { x: 0, y: 0 };

        // Find nearest prey (smaller entities)
        let nearestPrey = null;
        let nearestDistance = Infinity;

        allEntities.forEach(other => {
            if (other.id === entity.id || !other.alive) return;
            if (other.size >= entity.size * 0.8) return; // Only hunt smaller entities

            const dx = other.position.x - entity.position.x;
            const dy = other.position.y - entity.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < huntingRange && distance < nearestDistance) {
                nearestPrey = other;
                nearestDistance = distance;
            }
        });

        if (nearestPrey) {
            const dx = nearestPrey.position.x - entity.position.x;
            const dy = nearestPrey.position.y - entity.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // Chase with intensity based on distance
            const intensity = 1 - (distance / huntingRange);
            return {
                x: (dx / distance) * intensity * 2,
                y: (dy / distance) * intensity * 2
            };
        }

        return { x: 0, y: 0 };
    }

    /**
     * EVASION BEHAVIOR
     * Flee from larger predators
     */
    applyEvasion(entity, allEntities, config = {}) {
        const dangerRange = config.dangerRange || 200;

        let fleeX = 0, fleeY = 0;
        let threatCount = 0;

        allEntities.forEach(other => {
            if (other.id === entity.id || !other.alive) return;
            if (other.size <= entity.size * 1.2) return; // Only flee from larger entities

            const dx = entity.position.x - other.position.x;
            const dy = entity.position.y - other.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < dangerRange) {
                const intensity = 1 - (distance / dangerRange);
                fleeX += (dx / distance) * intensity;
                fleeY += (dy / distance) * intensity;
                threatCount++;
            }
        });

        if (threatCount > 0) {
            return {
                x: (fleeX / threatCount) * 3,
                y: (fleeY / threatCount) * 3
            };
        }

        return { x: 0, y: 0 };
    }

    /**
     * TERRITORIAL BEHAVIOR
     * Defend a zone and repel intruders
     */
    applyTerritorial(entity, allEntities, config = {}) {
        const territoryRadius = config.territoryRadius || 200;
        const isTerritorial = entity.stage >= 3; // Only apex and above are territorial

        if (!isTerritorial) return { x: 0, y: 0 };

        // Establish territory if not exists
        if (!this.territories.has(entity.id)) {
            this.territories.set(entity.id, {
                x: entity.position.x,
                y: entity.position.y,
                radius: territoryRadius
            });
        }

        const territory = this.territories.get(entity.id);

        // Return to territory center if too far
        const dxToCenter = territory.x - entity.position.x;
        const dyToCenter = territory.y - entity.position.y;
        const distanceToCenter = Math.sqrt(dxToCenter * dxToCenter + dyToCenter * dyToCenter);

        let steerX = 0, steerY = 0;

        if (distanceToCenter > territoryRadius * 0.7) {
            // Pull back to territory
            steerX += (dxToCenter / distanceToCenter) * 1.5;
            steerY += (dyToCenter / distanceToCenter) * 1.5;
        }

        // Repel intruders
        allEntities.forEach(other => {
            if (other.id === entity.id || !other.alive) return;

            const dx = other.position.x - territory.x;
            const dy = other.position.y - territory.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < territoryRadius) {
                // Push towards intruder to chase them away
                const pushX = (other.position.x - entity.position.x);
                const pushY = (other.position.y - entity.position.y);
                const pushDist = Math.sqrt(pushX * pushX + pushY * pushY);

                if (pushDist > 0) {
                    steerX += (pushX / pushDist) * 2;
                    steerY += (pushY / pushDist) * 2;
                }
            }
        });

        return { x: steerX, y: steerY };
    }

    /**
     * CURIOSITY BEHAVIOR
     * Investigate mouse cursor and interesting objects
     */
    applyCuriosity(entity, config = {}) {
        const curiosityRange = config.curiosityRange || 400;
        const isCurious = entity.stage >= 1; // Cells and above are curious

        if (!isCurious) return { x: 0, y: 0 };

        const dx = this.mousePosition.x - entity.position.x;
        const dy = this.mousePosition.y - entity.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < curiosityRange) {
            // Personality-based response
            const personality = entity.personality || 'neutral';

            if (personality === 'curious' || personality === 'friendly') {
                // Approach mouse
                const intensity = 1 - (distance / curiosityRange);
                return {
                    x: (dx / distance) * intensity * 0.8,
                    y: (dy / distance) * intensity * 0.8
                };
            } else if (personality === 'shy' || personality === 'fearful') {
                // Flee from mouse
                const intensity = 1 - (distance / curiosityRange);
                return {
                    x: -(dx / distance) * intensity * 1.2,
                    y: -(dy / distance) * intensity * 1.2
                };
            }
        }

        return { x: 0, y: 0 };
    }

    /**
     * SYMBIOSIS BEHAVIOR
     * Form beneficial partnerships with other entities
     */
    applySymbiosis(entity, allEntities, config = {}) {
        const symbiosisRange = config.symbiosisRange || 100;
        const canFormSymbiosis = entity.stage >= 2;

        if (!canFormSymbiosis) return { x: 0, y: 0 };

        // Check if already has a partner
        const partnerId = this.symbioticPairs.get(entity.id);

        if (partnerId) {
            const partner = allEntities.find(e => e.id === partnerId);

            if (partner && partner.alive) {
                // Stay close to partner
                const dx = partner.position.x - entity.position.x;
                const dy = partner.position.y - entity.position.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance > symbiosisRange) {
                    return {
                        x: (dx / distance) * 0.5,
                        y: (dy / distance) * 0.5
                    };
                }
            } else {
                // Partner died, remove pairing
                this.symbioticPairs.delete(entity.id);
            }
        } else {
            // Look for potential partner
            const candidates = allEntities.filter(other => {
                if (other.id === entity.id || !other.alive) return false;
                if (this.symbioticPairs.has(other.id)) return false; // Already paired
                if (other.stage < 2) return false; // Too young

                const dx = other.position.x - entity.position.x;
                const dy = other.position.y - entity.position.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                return distance < symbiosisRange * 2;
            });

            if (candidates.length > 0 && Math.random() < 0.01) {
                // Form symbiotic pair
                const partner = candidates[0];
                this.symbioticPairs.set(entity.id, partner.id);
                this.symbioticPairs.set(partner.id, entity.id);

                console.log(`🤝 Symbiosis formed between ${entity.id} and ${partner.id}`);
            }
        }

        return { x: 0, y: 0 };
    }

    /**
     * COMBINED BEHAVIOR
     * Apply all behaviors with weighted priorities
     */
    applyAllBehaviors(entity, allEntities, config = {}) {
        const weights = config.weights || {
            flocking: 0.3,
            hunting: 0.4,
            evasion: 0.8,
            territorial: 0.5,
            curiosity: 0.2,
            symbiosis: 0.3
        };

        const flocking = this.applyFlocking(entity, allEntities);
        const hunting = this.applyHunting(entity, allEntities);
        const evasion = this.applyEvasion(entity, allEntities);
        const territorial = this.applyTerritorial(entity, allEntities);
        const curiosity = this.applyCuriosity(entity);
        const symbiosis = this.applySymbiosis(entity, allEntities);

        return {
            x: flocking.x * weights.flocking +
                hunting.x * weights.hunting +
                evasion.x * weights.evasion +
                territorial.x * weights.territorial +
                curiosity.x * weights.curiosity +
                symbiosis.x * weights.symbiosis,
            y: flocking.y * weights.flocking +
                hunting.y * weights.hunting +
                evasion.y * weights.evasion +
                territorial.y * weights.territorial +
                curiosity.y * weights.curiosity +
                symbiosis.y * weights.symbiosis
        };
    }
}

// Export
if (typeof window !== 'undefined') {
    window.EntityBehaviors = EntityBehaviors;
    console.log('🧠 EntityBehaviors loaded!');
}
