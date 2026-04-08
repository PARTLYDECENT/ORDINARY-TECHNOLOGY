/**
 * SFX System: High-Fidelity Audio Manager
 * Uses AudioContext for polyphony, BGM looping, and low-latency playback.
 */
const SFX = {
    audioCtx: null,
    buffers: new Map(),
    isInitialized: false,
    bgmSource: null,
    bgmIndex: 0,

    sounds: {
        PISTOL: 'assets/sfx/pistol.mp3',
        RIFLE: 'assets/sfx/rifle.mp3',
        SHOTGUN: 'assets/sfx/shotgun.mp3',
        PLAYER_DIE: 'assets/sfx/playerdie.mp3',
        ZOMBIE_DIE: 'assets/sfx/zombiedie.mp3',
        ZOMBIE_ATTACK_1: 'assets/sfx/zombieattack1.mp3',
        ZOMBIE_ATTACK_2: 'assets/sfx/zombieattack2.mp3',
        ZOMBIE_ATTACK_3: 'assets/sfx/zombieattack3.mp3',
        ZOMBIE_ATTACK_4: 'assets/sfx/zombieattack4.mp3',
        
        EXP_1: 'assets/sfx/detonating_ordinance__no_1-1775517125954.mp3',
        EXP_2: 'assets/sfx/detonating_ordinance__no_2-1775517134304.mp3',
        EXP_3: 'assets/sfx/detonating_ordinance__no_3-1775517134305.mp3',
        EXP_4: 'assets/sfx/detonating_ordinance__no_4-1775517134306.mp3',
        
        WATER_1: 'assets/sfx/insane_water__no_1-1775517281133.mp3',
        WATER_2: 'assets/sfx/insane_water__no_2-1775517285791.mp3',
        WATER_3: 'assets/sfx/insane_water__no_3-1775517281138.mp3',
        WATER_4: 'assets/sfx/insane_water__no_4-1775517281140.mp3',
        
        CYC_1: 'assets/sfx/cyclical_sound__no_1-1775516903403.mp3',
        CYC_2: 'assets/sfx/cyclical_sound__no_2-1775516909572.mp3',
        CYC_3: 'assets/sfx/cyclical_sound__no_3-1775516911600.mp3',
        CYC_4: 'assets/sfx/cyclical_sound__no_4-1775516914661.mp3',
        
        BGM_1: 'assets/sfx/dark_technology_in_2__no_1-1775517703061.mp3',
        BGM_2: 'assets/sfx/dark_technology_in_2__no_1-1775517952984.mp3',
        BGM_3: 'assets/sfx/dark_technology_in_2__no_1-1775517955793.mp3'
    },

    async init() {
        if (this.isInitialized) return;
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        
        const loadPromises = Object.entries(this.sounds).map(async ([key, url]) => {
            try {
                const response = await fetch(url);
                const arrayBuffer = await response.arrayBuffer();
                const audioBuffer = await this.audioCtx.decodeAudioData(arrayBuffer);
                this.buffers.set(key, audioBuffer);
            } catch (err) {
                console.warn(`SFX: Failed to load sound ${key} from ${url}`, err);
            }
        });

        await Promise.all(loadPromises);
        this.isInitialized = true;
        console.log("SFX: System initialized and sounds loaded.");
    },

    play(soundKey, options = {}) {
        if (!this.isInitialized) {
            this.init();
            return null;
        }
        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }

        const buffer = this.buffers.get(soundKey);
        if (!buffer) return null;

        const source = this.audioCtx.createBufferSource();
        source.buffer = buffer;

        const gainNode = this.audioCtx.createGain();
        gainNode.gain.value = options.volume !== undefined ? options.volume : 0.5;
        
        if (options.pitch) {
            source.playbackRate.value = options.pitch;
        } else if (!options.noPitchVariance) {
            source.playbackRate.value = 0.9 + Math.random() * 0.2;
        }

        source.connect(gainNode);
        gainNode.connect(this.audioCtx.destination);
        source.start(0);
        return source; // Return source for sequencing
    },

    // --- High-Level Trigger Methods ---
    triggerFire(weaponId) {
        if (weaponId === 'shotgun') this.play('SHOTGUN', { volume: 0.6 });
        else if (weaponId === 'ar' || weaponId === 'rifle') this.play('RIFLE', { volume: 0.4 });
        else this.play('PISTOL', { volume: 0.5 });
    },

    triggerZombieDie() {
        this.play('ZOMBIE_DIE', { volume: 0.4 });
    },

    triggerZombieAttack() {
        const variants = ['ZOMBIE_ATTACK_1', 'ZOMBIE_ATTACK_2', 'ZOMBIE_ATTACK_3', 'ZOMBIE_ATTACK_4'];
        this.play(variants[Math.floor(Math.random() * variants.length)], { volume: 0.3 });
    },

    triggerPlayerDie() {
        this.play('PLAYER_DIE', { volume: 0.8 });
    },

    triggerExplosion() {
        const variants = ['EXP_1', 'EXP_2', 'EXP_3', 'EXP_4'];
        this.play(variants[Math.floor(Math.random() * variants.length)], { volume: 0.7 });
    },
    
    triggerSlime() {
        const variants = ['WATER_1', 'WATER_2', 'WATER_3', 'WATER_4'];
        this.play(variants[Math.floor(Math.random() * variants.length)], { volume: 0.5, pitch: 0.8 + Math.random() * 0.4 });
    },
    
    triggerAbility() {
        const variants = ['CYC_1', 'CYC_2', 'CYC_3', 'CYC_4'];
        this.play(variants[Math.floor(Math.random() * variants.length)], { volume: 0.6, noPitchVariance: true });
    },
    
    triggerUI() {
        const variants = ['CYC_1', 'CYC_3']; // Select fewer variants for crisp UI clicks
        this.play(variants[Math.floor(Math.random() * variants.length)], { volume: 0.3, pitch: 1.5 });
    },

    // --- BGM Sequencing Logic ---
    startBGM() {
        if (!this.isInitialized) return;
        
        const playlist = ['BGM_1', 'BGM_2', 'BGM_3'];
        
        const playNextTrack = () => {
            const trackKey = playlist[this.bgmIndex];
            const buffer = this.buffers.get(trackKey);
            
            if (!buffer) {
                // If it failed to load, retry loop after a short wait
                setTimeout(playNextTrack, 1000);
                return;
            }
            
            this.bgmSource = this.audioCtx.createBufferSource();
            this.bgmSource.buffer = buffer;
            
            const gainNode = this.audioCtx.createGain();
            gainNode.gain.value = 0.25; // Keep BGM soft compared to SFX
            
            this.bgmSource.connect(gainNode);
            gainNode.connect(this.audioCtx.destination);
            
            this.bgmSource.onended = () => {
                this.bgmIndex = (this.bgmIndex + 1) % playlist.length;
                playNextTrack(); // Sequence perfectly without overlapping
            };
            
            this.bgmSource.start(0);
        };
        
        // Start the infinite loop sequence
        playNextTrack();
    }
};

window.SFX = SFX;
