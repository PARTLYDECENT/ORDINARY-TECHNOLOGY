class CampaignTutorialManager {
    constructor(player, tutorialManagerRef, spawnZombieRef) {
        this.player = player;
        this.tm = tutorialManagerRef;
        this.spawnZombie = spawnZombieRef;
        this.state = 0; // 0: intro, 1: kill shambler, 3: done
        this.timer = 0;
        this.isFinished = false;
        this.popupActive = false;
    }

    notifyShotFired() {
        // Not strictly needed in this fast version but keeping hook for compatibility
    }

    update(delta, totalKills) {
        if (this.isFinished || this.popupActive) return;
        this.timer += delta;

        if (this.state === 0) {
            if (this.timer > 0.1) {
                this.state = 1;
                this.timer = 0;
                this.popupActive = false;
                this.startKills = totalKills;
                // Spawn Shambler
                this.spawnZombie(this.player.position.x + 12, this.player.position.z + 12, 0);
            }
        } 
        else if (this.state === 1) {
            // Wait for Kill OR 8 seconds (if player is slow/confused)
            if (totalKills > this.startKills || this.timer > 8.0) {
                // Done after first kill as requested (removing Puker dialogue bit)
                this.state = 3;
                this.isFinished = true;
            }
        }
    }
}
