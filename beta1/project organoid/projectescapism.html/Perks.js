/**
 * Perks - Tactical Titan Passive Bonuses
 * These modify player stats and behaviors based on level or achievement.
 */
class Perks {
    constructor(player) {
        this.player = player;
        this.activePerks = [];
        this.perkRegistry = {
            'nanite_repair': { name: 'Nanite Repair', desc: 'Slowly regenerates 1HP/s', type: 'passive' },
            'kinetic_burst': { name: 'Kinetic Mobility', desc: 'Increases dash speed by 30%', type: 'passive' },
            'resistor': { name: 'Acid Resistance', desc: 'Reduces hazard damage by 50%', type: 'passive' }
        };
    }

    applyPerk(id) {
        if (!this.perkRegistry[id]) return;
        this.activePerks.push(id);
        console.log(`Perk applied: ${this.perkRegistry[id].name}`);
    }

    update(dt) {
        this.activePerks.forEach(perkId => {
            if (perkId === 'nanite_repair') {
                if (window.playerHealth < 100) {
                    window.playerHealth += 1.0 * dt;
                    document.getElementById('ui-health').style.width = Math.min(100, Math.max(0, window.playerHealth)) + '%';
                }
            }
        });
    }

    getDashMultiplier() {
        return this.activePerks.includes('kinetic_burst') ? 1.3 : 1.0;
    }

    getHazardReduction() {
        return this.activePerks.includes('resistor') ? 0.5 : 1.0;
    }
}
window.Perks = Perks;
