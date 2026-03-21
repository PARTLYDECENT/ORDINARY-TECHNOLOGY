/**
 * equalizer.js
 * Advanced Web Audio Graph & Spectral Enhancement
 */

let audioContext, analyser, source, filterNode, compressor, enhancer;
let dataArray, bufferLength;
let isAudioContextInitialized = false;

function initAudioContext(musicPlayer) {
    if (isAudioContextInitialized) return { audioContext, analyser, dataArray, bufferLength };
    
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        source = audioContext.createMediaElementSource(musicPlayer);
        analyser = audioContext.createAnalyser();
        filterNode = audioContext.createBiquadFilter(); // Signal Path Modulator
        
        // --- NEW: Spectral Enhancement & Dynamics ---
        // 1. Dynamics Compressor for "Punch"
        compressor = audioContext.createDynamicsCompressor();
        compressor.threshold.setValueAtTime(-24, audioContext.currentTime);
        compressor.knee.setValueAtTime(30, audioContext.currentTime);
        compressor.ratio.setValueAtTime(12, audioContext.currentTime);
        compressor.attack.setValueAtTime(0.003, audioContext.currentTime);
        compressor.release.setValueAtTime(0.25, audioContext.currentTime);
        
        // 2. High-Shelf Enhancer for "Clarity"
        enhancer = audioContext.createBiquadFilter();
        enhancer.type = "highshelf";
        enhancer.frequency.setValueAtTime(8000, audioContext.currentTime);
        enhancer.gain.setValueAtTime(3, audioContext.currentTime); // Subtle 3dB boost
        
        // Configure Analyser
        analyser.fftSize = 1024;
        analyser.smoothingTimeConstant = 0.75;
        bufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);

        // Connect: source -> filter -> compressor -> enhancer -> analyser -> destination
        source.connect(filterNode);
        filterNode.connect(compressor);
        compressor.connect(enhancer);
        enhancer.connect(analyser);
        analyser.connect(audioContext.destination);

        isAudioContextInitialized = true;
        console.log("Audio Engine Modularized. Spectral Enhancement Online.");
        
        return { audioContext, analyser, dataArray, bufferLength, filterNode, isAudioContextInitialized };
    } catch (e) {
        console.error("Audio Engine Failure:", e);
        throw e;
    }
}

// Helper to convert slider values to frequencies
const MIN_FREQ = 20, MAX_FREQ = 20000;
const MIN_LOG_FREQ = Math.log(MIN_FREQ), MAX_LOG_FREQ = Math.log(MAX_FREQ);
const LOG_FREQ_SCALE = (MAX_LOG_FREQ - MIN_LOG_FREQ) / 100;

function sliderToFreq(val) { return Math.exp(MIN_LOG_FREQ + LOG_FREQ_SCALE * parseFloat(val)); }

function applyFilterSettings(type, freqVal, qVal) {
    if (!isAudioContextInitialized) return;
    
    if (type === 'off' || !type) {
        filterNode.type = "allpass";
        filterNode.frequency.setTargetAtTime(audioContext.sampleRate / 2, audioContext.currentTime, 0.01);
        filterNode.Q.setTargetAtTime(1, audioContext.currentTime, 0.01);
    } else {
        filterNode.type = type;
        const freq = sliderToFreq(freqVal);
        const q = Math.exp(Math.log(0.1) + (Math.log(30) - Math.log(0.1)) / 100 * parseFloat(qVal));
        filterNode.frequency.setTargetAtTime(freq, audioContext.currentTime, 0.01);
        filterNode.Q.setTargetAtTime(q, audioContext.currentTime, 0.01);
    }
}

export { initAudioContext, applyFilterSettings, sliderToFreq };
