/**
 * NARRATOR.JS - Aria's Voice Synthesis System
 * Provides a text-to-speech interface utilizing the Web Speech API,
 * tuned to sound like an ethereal, slightly robotic "alien AI" (Aria).
 */

class Narrator {
    constructor() {
        this.synth = window.speechSynthesis;
        this.voices = [];
        this.ariaVoice = null;
        this.isReady = false;

        // Initialize voices when available
        if (speechSynthesis.onvoiceschanged !== undefined) {
            speechSynthesis.onvoiceschanged = this.initVoices.bind(this);
        }

        // Fallback initialization
        setTimeout(() => this.initVoices(), 1000);
    }

    initVoices() {
        if (this.isReady) return;
        this.voices = this.synth.getVoices();

        if (this.voices.length > 0) {
            // Priority: Find a Google/UK English Female voice for a sophisticated AI sound.
            // Fallbacks to any English female voice.
            this.ariaVoice =
                this.voices.find(voice => voice.name.includes('Google UK English Female')) ||
                this.voices.find(voice => voice.name.includes('Samantha')) || // Mac fallback
                this.voices.find(voice => voice.lang === 'en-GB' && voice.name.includes('Female')) ||
                this.voices.find(voice => voice.lang.includes('en') && (voice.name.includes('Female') || voice.name.includes('Zira')));

            // If still no preference, just grab the first available English voice
            if (!this.ariaVoice) {
                this.ariaVoice = this.voices.find(voice => voice.lang.includes('en')) || this.voices[0];
            }

            this.isReady = true;
            console.log("Aria Voice System Initialized:", this.ariaVoice ? this.ariaVoice.name : "Default");
        }
    }

    /**
     * Speaks the given text with Aria's modulation.
     * @param {string} text - The line of dialogue for Aria to speak.
     * @param {function} onStart - Callback when speech begins (useful for subtitles).
     * @param {function} onEnd - Callback when speech finishes.
     */
    speak(text, onStart, onEnd) {
        if (!this.synth) {
            console.error("Speech Synthesis not supported in this browser.");
            return;
        }

        // Cancel any currently playing speech to avoid overlapping
        this.synth.cancel();

        const utterance = new SpeechSynthesisUtterance(text);

        if (this.ariaVoice) {
            utterance.voice = this.ariaVoice;
        }

        // Aria's Voice Modulation parameters (Alien/AI aesthetic)
        utterance.pitch = 0.8;  // Slightly lower, commanding pitch
        utterance.rate = 0.9;   // Deliberate, measured pace
        utterance.volume = 0.5; // Not overly loud, atmospheric

        if (onStart) {
            utterance.onstart = onStart;
        }

        if (onEnd) {
            utterance.onend = onEnd;
        }

        // Failsafe error handler
        utterance.onerror = (e) => {
            console.warn("SpeechSynthesisUtterance Error:", e);
            if (onEnd) onEnd(); // Fire onEnd to ensure UI gracefully recovers
        };

        this.synth.speak(utterance);
    }

    stop() {
        if (this.synth) {
            this.synth.cancel();
        }
    }
}

// Instantiate globally
window.AriaNarrator = new Narrator();
