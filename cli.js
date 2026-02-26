#!/usr/bin/env node

const readline = require('readline');
const { exec } = require('child_process');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const WELCOME_MESSAGE = "welcome to ordinary technology we are working on bridging the gap form the known to the unknown and you are invited please stay safe!";

/**
 * Uses spd-say to speak the given text
 * @param {string} text 
 */
function speak(text) {
    exec(`spd-say "${text}"`, (error) => {
        if (error) {
            console.error(`TTS Error: ${error.message}`);
        }
    });
}

/**
 * Animated typing effect for the console
 * @param {string} text 
 * @param {number} delay 
 */
async function typeLine(text, delay = 50) {
    for (let i = 0; i < text.length; i++) {
        process.stdout.write(text[i]);
        await new Promise(resolve => setTimeout(resolve, delay));
    }
    process.stdout.write('\n');
}

async function start() {
    console.clear();
    console.log('\x1b[36m%s\x1b[0m', '--- ORDINARY TECHNOLOGY CLI ---');

    // Welcome sequence
    speak(WELCOME_MESSAGE);
    await typeLine(WELCOME_MESSAGE, 40);
    console.log('');

    function ask() {
        if (rl.closed) return;
        rl.question('\x1b[32m>\x1b[0m ', (input) => {
            if (input === null || input.toLowerCase() === 'exit' || input.toLowerCase() === 'quit') {
                if (!rl.closed) {
                    console.log('Stay safe.');
                    rl.close();
                }
                return;
            }

            if (input.trim()) {
                // For other inputs, just echoing for now
                console.log(`\x1b[90mProcessing: ${input}\x1b[0m`);
            }

            ask();
        });
    }

    rl.on('close', () => {
        // Handle stream end
    });

    ask();
}

start();
