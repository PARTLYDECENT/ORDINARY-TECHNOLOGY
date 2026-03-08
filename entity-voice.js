/**
 * ENTITY-VOICE.JS - Synesthetic Audio & Proto-Language System
 * Gives entities a voice and a language based on their procedural traits.
 */

class EntityVoice {
    constructor(entity) {
        this.entity = entity;
        this.audioCtx = null;
        this.oscillator = null;
        this.gainNode = null;

        // Voice characteristics based on entity DNA
        this.basePitch = 200 + Math.random() * 600; // Hz
        this.pitchMod = (Math.random() - 0.5) * 50;
        this.timbre = ['sine', 'square', 'sawtooth', 'triangle'][Math.floor(Math.random() * 4)];
        this.chatters = Math.random() > 0.5; // Some talk more than others

        // Proto-language syllables (Guttural, Clicky, and Exotic)
        this.syllables = [
            'khu', 'z\'ka', 'gh-r', 'th\'un', 'n\'ga', 'x-l', 'mra', 'v\'lo',
            'sh-na', 'd-ra', 'p\'ta', 'o\'mu', 'k\'lra', 'z\'nu', 'ærr', 'θo',
            'ðu', 'ŋa', 'χi', 'ʔa', 'qov', 'xul', 'ʃar', 'ʒu', 'ʋi', 'ʕa', 'ħo',
            'krix', 'vash', 'nuum', 'glot', 'zark', 'feek', 'vrod', 'thra'
        ];

        this.speechBubble = null;
        this.speechTimer = null;

        this.initAudio();
    }

    initAudio() {
        // Lazy load audio context to comply with browser autoplay policies
        if (!window.sharedAudioCtx) {
            window.sharedAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        this.audioCtx = window.sharedAudioCtx;
    }

    /**
     * Generate a procedural word with proto-language rules
     */
    generateWord() {
        const length = 1 + Math.floor(Math.random() * 3);
        let word = '';
        for (let i = 0; i < length; i++) {
            let syllable = this.syllables[Math.floor(Math.random() * this.syllables.length)];

            // Chance to mutate syllable
            if (Math.random() > 0.8) syllable = syllable.replace('a', 'ä').replace('o', 'ö').replace('u', 'ü');

            word += syllable;
            if (i < length - 1 && Math.random() > 0.7) word += '\'';
        }
        return word;
    }

    /**
     * Generate a procedural sentence
     */
    generateSentence() {
        const wordCount = 2 + Math.floor(Math.random() * 4);
        const words = [];
        for (let i = 0; i < wordCount; i++) {
            words.push(this.generateWord());
        }

        // Add a proto-punctuation
        const punctuation = ['.', '!', '?', '...', '~'][Math.floor(Math.random() * 5)];
        return words.join(' ') + punctuation;
    }

    /**
     * Speak: Play sound and show text
     * @param {string} type - 'greeting', 'evolve', 'random', 'pain'
     */
    speak(type = 'random') {
        if (!this.entity.alive) return;

        // Resume context if suspended (common in browsers)
        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }

        let text;
        // Higher stage entities speak in sentences
        if (this.entity.stage >= 3 || (type === 'evolve' && this.entity.stage >= 2)) {
            text = this.generateSentence();
        } else {
            text = this.generateWord().toUpperCase();
        }

        this.showSpeechBubble(text, type);
        this.playSound(type);

        console.log(`🔊 [${this.entity.id}] (${type}) : "${text}"`);
    }

    /**
     * Visual: Create/Update Speech Bubble
     */
    showSpeechBubble(text, type) {
        // Remove existing bubble
        if (this.speechBubble) {
            this.speechBubble.remove();
            clearTimeout(this.speechTimer);
        }

        const bubble = document.createElement('div');
        bubble.className = 'entity-speech-bubble';
        bubble.textContent = text;

        // Style based on type
        let color = this.entity.color || '#fff';
        let scale = 1;
        let blur = '0px';

        if (type === 'evolve') {
            color = '#00ffff';
            scale = 1.6;
            bubble.style.fontWeight = '900';
            bubble.style.letterSpacing = '2px';
        } else if (this.entity.stage >= 4) {
            blur = '1px'; // Exotic/Cosmic entities have shimmering speech
            scale = 1.2;
        }

        bubble.style.cssText = `
        position: fixed;
        pointer-events: none;
        color: ${color};
        background: rgba(0, 0, 0, 0.8);
        backdrop-filter: blur(4px);
        padding: 6px 12px;
        border-radius: 8px;
        border: 2px solid ${color};
        font-family: 'Space Grotesk', 'Courier New', monospace;
        font-size: 14px;
        transform: translate(-50%, -100%) scale(${scale});
        transition: opacity 0.4s, transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        z-index: 10000;
        opacity: 0;
        text-shadow: 0 0 10px ${color};
        filter: blur(${blur});
        white-space: nowrap;
    `;

        document.body.appendChild(bubble);
        this.speechBubble = bubble;

        // Animate in
        requestAnimationFrame(() => {
            bubble.style.opacity = '1';
            bubble.style.transform = `translate(-50%, -140%) scale(${scale})`;
        });

        // Update position immediately
        this.updatePosition();

        // Auto remove
        const duration = text.length * 100 + 2000; // Duration based on text length
        this.speechTimer = setTimeout(() => {
            if (this.speechBubble) {
                this.speechBubble.style.opacity = '0';
                this.speechBubble.style.transform = `translate(-50%, -160%) scale(${scale * 0.8})`;
                setTimeout(() => {
                    if (this.speechBubble) this.speechBubble.remove();
                    this.speechBubble = null;
                }, 400);
            }
        }, duration);
    }

    /**
     * Update bubble position to follow entity with smooth interpolation
     */
    updatePosition() {
        if (this.speechBubble && this.entity) {
            const x = this.entity.position.x;
            const y = this.entity.position.y - (this.entity.size * 0.8);

            // Use transform for smoother movement than left/top
            this.speechBubble.style.left = `${x}px`;
            this.speechBubble.style.top = `${y}px`;
        }
    }

    /**
     * Audio: Synthesize sound with more complex FM/AM synthesis for proto-feeling
     */
    playSound(type) {
        if (!this.audioCtx) return;

        const osc = this.audioCtx.createOscillator();
        const mod = this.audioCtx.createOscillator();
        const modGain = this.audioCtx.createGain();
        const gain = this.audioCtx.createGain();

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        // FM Synthesis for weirdness
        mod.connect(modGain);
        modGain.connect(osc.frequency);

        osc.type = this.timbre;
        mod.type = 'sine';

        const now = this.audioCtx.currentTime;
        let freq = this.basePitch;

        // Adjust pitch by size (larger = deeper)
        freq /= (this.entity.size / 30);

        if (type === 'evolve') {
            // High-energy ascending sequence
            osc.frequency.setValueAtTime(freq, now);
            osc.frequency.exponentialRampToValueAtTime(freq * 4, now + 0.8);

            mod.frequency.setValueAtTime(freq / 2, now);
            modGain.gain.setValueAtTime(freq, now);
            modGain.gain.exponentialRampToValueAtTime(1, now + 0.8);

            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.4, now + 0.1);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

            osc.start(now);
            mod.start(now);
            osc.stop(now + 1.2);
            mod.stop(now + 1.2);
        } else {
            // Glitchy chatter
            const duration = 0.2 + Math.random() * 0.4;

            osc.frequency.setValueAtTime(freq, now);
            for (let i = 0; i < 5; i++) {
                osc.frequency.linearRampToValueAtTime(freq * (1 + Math.random()), now + (duration * i / 5));
            }

            mod.frequency.setValueAtTime(freq * 2, now);
            modGain.gain.setValueAtTime(freq * 0.5, now);

            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

            osc.start(now);
            mod.start(now);
            osc.stop(now + duration);
            mod.stop(now + duration);
        }
    }
}

// Expose to window
window.EntityVoice = EntityVoice;
