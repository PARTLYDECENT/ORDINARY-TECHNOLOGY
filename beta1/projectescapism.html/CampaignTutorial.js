class CampaignTutorialManager {
    constructor(player, tutorialManagerRef, spawnZombieRef) {
        this.player = player;
        this.tm = tutorialManagerRef;
        this.spawnZombie = spawnZombieRef;
        this.state = 0; // 0: intro, 1: kill shambler, 2: kill puker, 3: done
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
            if (this.timer > 0.5) {
                this.popupActive = true;
                // Immediate Intro: Move, Shoot, and Shambler spawn
                this.tm.playIngamePopup("SYSTEM ONLINE. Move [WASD], Fire [Click]. Class: Shambler localized. Terminate.", () => {
                    this.state = 1;
                    this.timer = 0;
                    this.popupActive = false;
                    this.startKills = totalKills;
                    // Spawn Shambler
                    this.spawnZombie(this.player.position.x + 12, this.player.position.z + 12, 0);
                });
            }
        } 
        else if (this.state === 1) {
            // Wait for Kill OR 8 seconds (if player is slow/confused)
            if (totalKills > this.startKills || this.timer > 8.0) {
                this.popupActive = true;
                this.tm.playIngamePopup("Neutralized. Warning: Puker inbound. Corrosive range attack. Destroy them and search for Hive Nodes.", () => {
                    this.state = 2;
                    this.timer = 0;
                    this.popupActive = false;
                    this.startKills = totalKills;
                    // Spawn Puker
                    this.spawnZombie(this.player.position.x - 15, this.player.position.z + 15, 1);
                });
            }
        }
        else if (this.state === 2) {
            // Final finish once 2 kills happen or after another 10s
            if (totalKills > this.startKills || this.timer > 10.0) {
                this.state = 3;
                this.isFinished = true;
                // No final popup to keep it fast, just resume game
            }
        }
    }
}

