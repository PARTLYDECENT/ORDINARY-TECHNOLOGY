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

        // Proto-language syllables
        this.syllables = [
            'ka', 'tu', 'bar', 'ix', 'no', 'ze', 'la', 'qui', 'om', 'ra',
            'shh', 'glip', 'fop', 'wex', 'yuin', 'zzt', 'krr', 'plip'
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
     * Generate a procedural word
     */
    generateWord() {
        const length = 1 + Math.floor(Math.random() * 3);
        let word = '';
        for (let i = 0; i < length; i++) {
            const syllable = this.syllables[Math.floor(Math.random() * this.syllables.length)];
            word += syllable;
            if (i < length - 1 && Math.random() > 0.7) word += '-';
        }
        return word.toUpperCase();
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

        const word = this.generateWord();
        this.showSpeechBubble(word, type);
        this.playSound(type);

        console.log(`🔊 [${this.entity.id}] says: "${word}"`);
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

        if (type === 'evolve') {
            color = '#ff00ff'; // Special color for evolution
            scale = 1.5;
            bubble.style.fontWeight = 'bold';
        }

        bubble.style.cssText = `
            position: fixed;
            pointer-events: none;
            color: ${color};
            background: rgba(0, 0, 0, 0.6);
            padding: 4px 8px;
            border-radius: 4px;
            border: 1px solid ${color};
            font-family: 'Space Grotesk', monospace;
            font-size: 12px;
            transform: translate(-50%, -100%) scale(${scale});
            transition: opacity 0.3s, transform 0.3s;
            z-index: 10000;
            opacity: 0;
            text-shadow: 0 0 5px ${color};
        `;

        document.body.appendChild(bubble);
        this.speechBubble = bubble;

        // Animate in
        requestAnimationFrame(() => {
            bubble.style.opacity = '1';
            bubble.style.transform = `translate(-50%, -120%) scale(${scale})`;
        });

        // Update position immediately
        this.updatePosition();

        // Auto remove
        this.speechTimer = setTimeout(() => {
            if (this.speechBubble) {
                this.speechBubble.style.opacity = '0';
                setTimeout(() => {
                    if (this.speechBubble) this.speechBubble.remove();
                    this.speechBubble = null;
                }, 300);
            }
        }, 2000 + Math.random() * 1000);
    }

    /**
     * Update bubble position to follow entity
     */
    updatePosition() {
        if (this.speechBubble && this.entity) {
            const x = this.entity.position.x;
            const y = this.entity.position.y - (this.entity.size * 1.2); // Above entity
            this.speechBubble.style.left = `${x}px`;
            this.speechBubble.style.top = `${y}px`;
        }
    }

    /**
     * Audio: Synthesize sound
     */
    playSound(type) {
        if (!this.audioCtx) return;

        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.type = this.timbre;

        // Pitch modulation based on type
        const now = this.audioCtx.currentTime;
        let freq = this.basePitch;

        // Adjust pitch by size (larger = deeper)
        freq /= (this.entity.size / 20);

        if (type === 'evolve') {
            // Rising tone
            osc.frequency.setValueAtTime(freq, now);
            osc.frequency.exponentialRampToValueAtTime(freq * 2, now + 0.5);
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 1.0);
            osc.start(now);
            osc.stop(now + 1.0);
        } else {
            // Random chatter
            osc.frequency.setValueAtTime(freq, now);
            osc.frequency.linearRampToValueAtTime(freq + this.pitchMod, now + 0.1);
            osc.frequency.linearRampToValueAtTime(freq, now + 0.2);

            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

            osc.start(now);
            osc.stop(now + 0.3);
        }
    }
}

// Expose to window
window.EntityVoice = EntityVoice;
