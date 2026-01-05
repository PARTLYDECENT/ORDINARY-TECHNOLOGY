/**
 * ENTITY-ABILITIES.JS
 * Special abilities system for evolved entities
 * Implements teleportation, phasing, splitting, merging, energy burst, and camouflage
 */

class EntityAbilities {
    constructor() {
        this.cooldowns = new Map(); // entity.id -> { abilityName: timestamp }
        this.activeEffects = new Map(); // entity.id -> { effectName: data }
    }

    /**
     * Check if ability is on cooldown
     */
    isOnCooldown(entity, abilityName) {
        const cooldowns = this.cooldowns.get(entity.id) || {};
        const lastUsed = cooldowns[abilityName] || 0;
        const cooldownDuration = this.getCooldownDuration(abilityName);
        return Date.now() - lastUsed < cooldownDuration;
    }

    getCooldownDuration(abilityName) {
        const durations = {
            teleport: 3000,      // 3 seconds
            phase: 5000,         // 5 seconds
            split: 10000,        // 10 seconds
            merge: 5000,         // 5 seconds
            energyBurst: 4000,   // 4 seconds
            camouflage: 8000     // 8 seconds
        };
        return durations[abilityName] || 5000;
    }

    setCooldown(entity, abilityName) {
        const cooldowns = this.cooldowns.get(entity.id) || {};
        cooldowns[abilityName] = Date.now();
        this.cooldowns.set(entity.id, cooldowns);
    }

    /**
     * TELEPORTATION
     * Instant short-range jump with particle effects
     */
    teleport(entity, config = {}) {
        if (this.isOnCooldown(entity, 'teleport')) return false;
        if (entity.stage < 4) return false; // Only Transcendent and above

        const maxDistance = config.maxDistance || 200;
        const angle = Math.random() * Math.PI * 2;
        const distance = 100 + Math.random() * maxDistance;

        const newX = entity.position.x + Math.cos(angle) * distance;
        const newY = entity.position.y + Math.sin(angle) * distance;

        // Clamp to screen bounds
        entity.teleportFrom = { ...entity.position };
        entity.position.x = Math.max(0, Math.min(window.innerWidth, newX));
        entity.position.y = Math.max(0, Math.min(window.innerHeight, newY));
        entity.teleportTo = { ...entity.position };

        this.setCooldown(entity, 'teleport');

        // Create visual effect
        entity.teleportEffect = {
            active: true,
            startTime: Date.now(),
            duration: 500
        };

        console.log(`⚡ ${entity.id} teleported!`);
        return true;
    }

    /**
     * PHASING
     * Become translucent and pass through others
     */
    phase(entity, config = {}) {
        if (this.isOnCooldown(entity, 'phase')) return false;
        if (entity.stage < 4) return false;

        const duration = config.duration || 2000;

        entity.phasing = {
            active: true,
            startTime: Date.now(),
            duration: duration,
            opacity: 0.3
        };

        this.setCooldown(entity, 'phase');

        console.log(`👻 ${entity.id} is phasing!`);
        return true;
    }

    /**
     * SPLITTING
     * Divide into smaller clones
     */
    split(entity, entityManager, config = {}) {
        if (this.isOnCooldown(entity, 'split')) return false;
        if (entity.stage < 3) return false; // Only Apex and above
        if (entity.size < 40) return false; // Too small to split

        const cloneCount = config.cloneCount || 2;
        const clones = [];

        // Reduce original size
        entity.size *= 0.7;
        entity.rebuild();

        // Create clones
        for (let i = 0; i < cloneCount; i++) {
            const angle = (i / cloneCount) * Math.PI * 2;
            const distance = entity.size * 2;

            const clone = entityManager.spawn({
                x: entity.position.x + Math.cos(angle) * distance,
                y: entity.position.y + Math.sin(angle) * distance,
                size: entity.size * 0.8,
                color: entity.color,
                shape: entity.shape,
                tentacles: entity.tentacles,
                speed: entity.speed * 1.2,
                pattern: entity.skinPattern
            });

            clone.stage = Math.max(0, entity.stage - 1);
            clone.personality = entity.personality;
            clones.push(clone);
        }

        this.setCooldown(entity, 'split');

        console.log(`🧬 ${entity.id} split into ${cloneCount} clones!`);
        return clones;
    }

    /**
     * MERGING
     * Combine with another entity to grow larger
     */
    merge(entity, target, entityManager) {
        if (this.isOnCooldown(entity, 'merge')) return false;
        if (!target || !target.alive) return false;
        if (entity.stage < 2) return false;

        const dx = target.position.x - entity.position.x;
        const dy = target.position.y - entity.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > entity.size + target.size) return false; // Too far

        // Absorb target's mass
        const combinedSize = Math.sqrt(entity.size * entity.size + target.size * target.size);
        entity.size = Math.min(combinedSize, 200); // Cap max size
        entity.tentacles = Math.min(entity.tentacles + Math.floor(target.tentacles / 2), 20);
        entity.evolutionPoints += target.evolutionPoints;

        // Rebuild with new properties
        entity.rebuild();

        // Remove target
        entityManager.removeEntity(target);

        this.setCooldown(entity, 'merge');

        // Visual effect
        entity.mergeEffect = {
            active: true,
            startTime: Date.now(),
            duration: 1000,
            absorbedColor: target.color
        };

        console.log(`🔗 ${entity.id} merged with ${target.id}!`);
        return true;
    }

    /**
     * ENERGY BURST
     * Emit shockwave that pushes others away
     */
    energyBurst(entity, allEntities, config = {}) {
        if (this.isOnCooldown(entity, 'energyBurst')) return false;
        if (entity.stage < 3) return false;

        const burstRadius = config.burstRadius || 300;
        const burstForce = config.burstForce || 15;

        let affectedCount = 0;

        allEntities.forEach(other => {
            if (other.id === entity.id || !other.alive) return;

            const dx = other.position.x - entity.position.x;
            const dy = other.position.y - entity.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < burstRadius && distance > 0) {
                const force = burstForce * (1 - distance / burstRadius);
                other.velocity.x += (dx / distance) * force;
                other.velocity.y += (dy / distance) * force;
                affectedCount++;
            }
        });

        this.setCooldown(entity, 'energyBurst');

        // Visual effect
        entity.burstEffect = {
            active: true,
            startTime: Date.now(),
            duration: 800,
            radius: burstRadius
        };

        console.log(`💥 ${entity.id} energy burst affected ${affectedCount} entities!`);
        return true;
    }

    /**
     * CAMOUFLAGE
     * Blend with background colors
     */
    camouflage(entity, config = {}) {
        if (this.isOnCooldown(entity, 'camouflage')) return false;
        if (entity.stage < 3) return false;

        const duration = config.duration || 5000;

        entity.camouflaged = {
            active: true,
            startTime: Date.now(),
            duration: duration,
            originalColor: entity.color,
            targetColor: this.getBackgroundColor()
        };

        this.setCooldown(entity, 'camouflage');

        console.log(`🦎 ${entity.id} is camouflaged!`);
        return true;
    }

    getBackgroundColor() {
        // Sample background color (simplified - could be more sophisticated)
        const colors = [
            'hsl(220, 20%, 15%)',
            'hsl(200, 30%, 20%)',
            'hsl(240, 15%, 18%)'
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    /**
     * Update active effects
     */
    updateEffects(entity) {
        const now = Date.now();

        // Update phasing
        if (entity.phasing && entity.phasing.active) {
            if (now - entity.phasing.startTime > entity.phasing.duration) {
                entity.phasing.active = false;
            }
        }

        // Update camouflage
        if (entity.camouflaged && entity.camouflaged.active) {
            const elapsed = now - entity.camouflaged.startTime;
            if (elapsed > entity.camouflaged.duration) {
                entity.camouflaged.active = false;
                entity.color = entity.camouflaged.originalColor;
            } else {
                // Blend colors
                const progress = elapsed / entity.camouflaged.duration;
                if (progress < 0.2) {
                    // Transition to camouflage
                    const blend = progress / 0.2;
                    entity.color = this.blendColors(entity.camouflaged.originalColor, entity.camouflaged.targetColor, blend);
                } else if (progress > 0.8) {
                    // Transition back
                    const blend = (progress - 0.8) / 0.2;
                    entity.color = this.blendColors(entity.camouflaged.targetColor, entity.camouflaged.originalColor, blend);
                } else {
                    entity.color = entity.camouflaged.targetColor;
                }
            }
        }

        // Update teleport effect
        if (entity.teleportEffect && entity.teleportEffect.active) {
            if (now - entity.teleportEffect.startTime > entity.teleportEffect.duration) {
                entity.teleportEffect.active = false;
            }
        }

        // Update burst effect
        if (entity.burstEffect && entity.burstEffect.active) {
            if (now - entity.burstEffect.startTime > entity.burstEffect.duration) {
                entity.burstEffect.active = false;
            }
        }

        // Update merge effect
        if (entity.mergeEffect && entity.mergeEffect.active) {
            if (now - entity.mergeEffect.startTime > entity.mergeEffect.duration) {
                entity.mergeEffect.active = false;
            }
        }
    }

    blendColors(color1, color2, ratio) {
        // Simple HSL color blending
        const hsl1 = this.parseHSL(color1);
        const hsl2 = this.parseHSL(color2);

        if (!hsl1 || !hsl2) return color1;

        const h = hsl1.h + (hsl2.h - hsl1.h) * ratio;
        const s = hsl1.s + (hsl2.s - hsl1.s) * ratio;
        const l = hsl1.l + (hsl2.l - hsl1.l) * ratio;

        return `hsl(${Math.round(h)}, ${Math.round(s)}%, ${Math.round(l)}%)`;
    }

    parseHSL(color) {
        const match = color.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
        if (match) {
            return {
                h: parseInt(match[1]),
                s: parseInt(match[2]),
                l: parseInt(match[3])
            };
        }
        return null;
    }

    /**
     * Randomly trigger abilities for AI entities
     */
    autoTriggerAbilities(entity, allEntities, entityManager) {
        if (entity.stage < 3) return; // Only advanced entities use abilities

        const abilities = ['teleport', 'phase', 'energyBurst', 'camouflage'];

        // Random chance to use ability
        if (Math.random() < 0.002) { // ~0.2% chance per frame
            const ability = abilities[Math.floor(Math.random() * abilities.length)];

            switch (ability) {
                case 'teleport':
                    this.teleport(entity);
                    break;
                case 'phase':
                    this.phase(entity);
                    break;
                case 'energyBurst':
                    this.energyBurst(entity, allEntities);
                    break;
                case 'camouflage':
                    this.camouflage(entity);
                    break;
            }
        }

        // Special conditions for split/merge
        if (entity.stage >= 4 && Math.random() < 0.0005) {
            if (entity.size > 80 && Math.random() < 0.5) {
                this.split(entity, entityManager);
            }
        }
    }
}

// Export
if (typeof window !== 'undefined') {
    window.EntityAbilities = EntityAbilities;
    console.log('✨ EntityAbilities loaded!');
}
