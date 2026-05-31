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
        
        EXP_1: 'assets/sfx/detonating_ordinance_%231-1775517125954.mp3',
        EXP_2: 'assets/sfx/detonating_ordinance_%232-1775517134304.mp3',
        EXP_3: 'assets/sfx/detonating_ordinance_%233-1775517134305.mp3',
        EXP_4: 'assets/sfx/detonating_ordinance_%234-1775517134306.mp3',
        
        WATER_1: 'assets/sfx/insane_water_%231-1775517281133.mp3',
        WATER_2: 'assets/sfx/insane_water_%232-1775517285791.mp3',
        WATER_3: 'assets/sfx/insane_water_%233-1775517281138.mp3',
        WATER_4: 'assets/sfx/insane_water_%234-1775517281140.mp3',
        
        CYC_1: 'assets/sfx/cyclical_sound_%231-1775516903403.mp3',
        CYC_2: 'assets/sfx/cyclical_sound_%232-1775516909572.mp3',
        CYC_3: 'assets/sfx/cyclical_sound_%233-1775516911600.mp3',
        CYC_4: 'assets/sfx/cyclical_sound_%234-1775516914661.mp3'
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
        else if (weaponId === 'sword') this.play('WATER_1', { volume: 0.5, pitch: 1.8 + Math.random() * 0.4 });
        else if (weaponId === 'flame') this.play('EXP_1', { volume: 0.3, pitch: 0.4 + Math.random() * 0.2 });
        else if (weaponId === 'tentacle') this.play('WATER_2', { volume: 0.6, pitch: 0.6 + Math.random() * 0.3 });
        else this.play('PISTOL', { volume: 0.5 });
    },

    triggerZombieDie() {
        if (window.ABYSS_MODE) {
            const variants = ['CYC_1', 'CYC_2', 'CYC_3', 'CYC_4'];
            this.play(variants[Math.floor(Math.random() * variants.length)], { volume: 0.45 });
        } else {
            this.play('ZOMBIE_DIE', { volume: 0.4 });
        }
    },

    triggerZombieAttack() {
        if (window.ABYSS_MODE) {
            const variants = ['WATER_1', 'WATER_2', 'WATER_3', 'WATER_4'];
            this.play(variants[Math.floor(Math.random() * variants.length)], { volume: 0.35 });
        } else {
            const variants = ['ZOMBIE_ATTACK_1', 'ZOMBIE_ATTACK_2', 'ZOMBIE_ATTACK_3', 'ZOMBIE_ATTACK_4'];
            this.play(variants[Math.floor(Math.random() * variants.length)], { volume: 0.3 });
        }
    },

    triggerPlayerDie() {
        this.play('PLAYER_DIE', { volume: 0.8 });
    },

    triggerExplosion() {
        const variants = ['EXP_1', 'EXP_2', 'EXP_3', 'EXP_4'];
        this.play(variants[Math.floor(Math.random() * variants.length)], { volume: 0.7 });
    },
    
    triggerScream(duration = 3.0) {
        if (!this.isInitialized || !this.audioCtx) return;
        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }

        const now = this.audioCtx.currentTime;
        
        // 1. Create a Master Gain Node
        const masterGain = this.audioCtx.createGain();
        masterGain.gain.setValueAtTime(0.0, now);
        masterGain.gain.linearRampToValueAtTime(0.48, now + 0.15); // sharp, painful screech attack!
        masterGain.gain.setValueAtTime(0.48, now + duration - 0.45);
        masterGain.gain.exponentialRampToValueAtTime(0.01, now + duration);
        
        // 2. Desperate high-frequency detuned Sawtooth vocal scream
        const osc1 = this.audioCtx.createOscillator();
        const osc2 = this.audioCtx.createOscillator();
        osc1.type = 'sawtooth';
        osc2.type = 'sawtooth';
        
        // Horizontal pitch modulation (vibrato) for a desperate, panicked screech
        const vibrato = this.audioCtx.createOscillator();
        const vibratoGain = this.audioCtx.createGain();
        vibrato.frequency.value = 14.5; // 14.5 Hz throat tremor LFO
        vibratoGain.gain.value = 65;    // massive frantic detuning wobble depth!
        
        // Tearing pitch sweep: Starts extremely high and desperate, drops under crush pressure
        osc1.frequency.setValueAtTime(920, now);
        osc2.frequency.setValueAtTime(935, now);
        osc1.frequency.exponentialRampToValueAtTime(340, now + duration - 0.4);
        osc2.frequency.exponentialRampToValueAtTime(345, now + duration - 0.4);
        
        vibrato.connect(vibratoGain);
        vibratoGain.connect(osc1.frequency);
        vibratoGain.connect(osc2.frequency);
        
        // 3. Fast amplitude ring-modulation LFO for terrifying vocal chord tearing/rasp
        const ringMod = this.audioCtx.createOscillator();
        ringMod.frequency.value = 42; // aggressive amplitude FM
        const ringGain = this.audioCtx.createGain();
        ringGain.gain.value = 0.65;
        
        // 4. Resonant Bandpass filtered white noise for tissue tearing/raspy scream air flow
        const bufferSize = this.audioCtx.sampleRate * duration;
        const noiseBuffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2.0 - 1.0;
        }
        
        const noiseSource = this.audioCtx.createBufferSource();
        noiseSource.buffer = noiseBuffer;
        
        const bandpass = this.audioCtx.createBiquadFilter();
        bandpass.type = 'bandpass';
        bandpass.frequency.setValueAtTime(1300, now);
        bandpass.frequency.exponentialRampToValueAtTime(480, now + duration);
        bandpass.Q.value = 6.5; // razor-sharp resonant screech squeal!
        
        const noiseGain = this.audioCtx.createGain();
        noiseGain.gain.setValueAtTime(0.09, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.02, now + duration);
        
        noiseSource.connect(bandpass);
        bandpass.connect(noiseGain);
        noiseGain.connect(masterGain);
        
        // Connect tone generators
        osc1.connect(masterGain);
        osc2.connect(masterGain);
        
        // 5. Crisp highpass filter to cut low mud, amplifying the excruciating high screeching tones
        const hpFilter = this.audioCtx.createBiquadFilter();
        hpFilter.type = 'highpass';
        hpFilter.frequency.value = 260;
        
        masterGain.connect(hpFilter);
        hpFilter.connect(this.audioCtx.destination);
        
        // Start and stop all nodes
        vibrato.start(now);
        ringMod.start(now);
        osc1.start(now);
        osc2.start(now);
        noiseSource.start(now);
        
        vibrato.stop(now + duration);
        ringMod.stop(now + duration);
        osc1.stop(now + duration);
        osc2.stop(now + duration);
        noiseSource.stop(now + duration);
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

    // --- BGM: Single track from assets/MUSIC/bg.mp3, looped infinitely ---
    startBGM() {
        if (this.bgmAudio) return; // Already playing
        try {
            this.bgmAudio = new Audio('assets/MUSIC/bg.mp3');
            this.bgmAudio.loop = true;
            this.bgmAudio.volume = 0.25; // Keep BGM soft compared to SFX
            this.bgmAudio.play().catch(e => console.warn('[BGM] Autoplay blocked, will retry on interaction:', e));
            console.log('[BGM] Playing assets/MUSIC/bg.mp3 on loop');
        } catch (e) {
            console.warn('[BGM] Failed to start bg.mp3:', e);
        }
    },

    stopBGM() {
        if (this.bgmAudio) {
            this.bgmAudio.pause();
            this.bgmAudio.currentTime = 0;
            this.bgmAudio = null;
        }
    }
};

window.SFX = SFX;
