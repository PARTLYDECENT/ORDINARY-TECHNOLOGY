/**
 * Upgrades - Tactical Weapon Modification System
 * Handles weapon stat scaling and modification based on currency/level.
 */
class Upgrades {
    constructor(weaponsCfg) {
        this.weaponsCfg = weaponsCfg;
        this.upgradeCounts = {};
        Object.keys(weaponsCfg).forEach(id => {
            this.upgradeCounts[id] = { damage: 0, fireRate: 0, capacity: 0 };
        });
    }

    upgradeWeapon(weaponId, stat) {
        if (!this.weaponsCfg[weaponId] || !this.upgradeCounts[weaponId][stat]) return;
        
        const weapon = this.weaponsCfg[weaponId];
        this.upgradeCounts[weaponId][stat]++;

        if (stat === 'damage') {
            weapon.damage = Math.floor(weapon.damage * 1.15); // +15% per upgrade
        } else if (stat === 'fireRate') {
            weapon.fireRate = Math.max(0.02, weapon.fireRate * 0.9); // -10% per upgrade
        } else if (stat === 'capacity') {
            if (weapon.maxAmmo !== Infinity) {
                weapon.maxAmmo = Math.floor(weapon.maxAmmo * 1.5); // +50% per upgrade
            }
        }
        
        console.log(`Upgraded ${weapon.name} ${stat}!`);
        updateWeaponUI();
    }

    getUpgradeLevel(weaponId, stat) {
        return this.upgradeCounts[weaponId] ? this.upgradeCounts[weaponId][stat] : 0;
    }
}
window.Upgrades = Upgrades;
