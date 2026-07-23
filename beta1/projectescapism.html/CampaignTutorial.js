class CampaignTutorialManager {
    constructor(player, tutorialManagerRef, spawnZombieRef) {
        this.player = player;
        this.tm = tutorialManagerRef;
        this.spawnZombie = spawnZombieRef;
        this.state = 0; // 0: locomotion sync, 1: spawn shambler request, 2: wait for shambler kill, 3: completed
        this.timer = 0;
        this.isFinished = false;
        this.popupActive = false;
        this.startKills = 0;
    }

    notifyShotFired() {
        // Compatibility hook
    }

    update(delta, totalKills) {
        if (this.isFinished || this.popupActive) return;
        this.timer += delta;

        if (this.state === 1) {
            // ObjectiveTutorial transitioned us to Phase 3 (threat neutralization)
            this.state = 2;
            this.timer = 0;
            this.startKills = totalKills;
            // Spawn Shambler near player
            this.spawnZombie(this.player.position.x + 12, this.player.position.z + 12, 0);
        } 
        else if (this.state === 2) {
            // Wait for Kill OR a fail-safe timer (12 seconds)
            if (totalKills > this.startKills || this.timer > 12.0) {
                this.state = 3;
                this.isFinished = true;
            }
        }
    }
}
