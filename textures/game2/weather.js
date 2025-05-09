// --- Uncanny Weather Effects ---

let rainParticles, rainGeometry, rainMaterial;
let rainCount = 10000; // Number of raindrops
let flash, flashInterval, flashDuration;
let nextFlashTime = 0;
let isFlashing = false;

// New uncanny elements
let distortionAmount = 0;
let glitchElement = null;
let glitchActive = false;
let lastGlitchTime = 0;
let bloodRain = false;
let bloodRainTimer = 0;
let rainColorShift = 0;
let rainDropSizes = [];
let floatingDebris = [];
let debrisGroup;
let ambientSound, thunderSound, glitchSound, whisperSound;
let fogEffect;
let fogDensity = 0.02;
let fogTarget = 0.02;

/**
 * Initializes all weather effects.
 * @param {THREE.Scene} scene - The main Three.js scene
 * @param {Object} options - Configuration options
 */
function initWeatherEffects(scene, options = {}) {
    initRain(scene, options.rainCount || 10000);
    initLightning(scene);
    initDebris(scene);
    initFog(scene);
    initGlitchFilter();
    initSounds();
    
    console.log("Uncanny weather effects initialized");
}

/**
 * Initializes the rain effect with enhanced properties.
 * @param {THREE.Scene} scene - The main Three.js scene
 * @param {number} count - Number of raindrops to create
 */
function initRain(scene, count = 10000) {
    rainCount = count;
    rainGeometry = new THREE.BufferGeometry();
    const positions = [];
    const velocities = []; // Store individual drop speeds
    const colors = []; // Store individual drop colors
    rainDropSizes = []; // Store individual drop sizes

    for (let i = 0; i < rainCount; i++) {
        positions.push(
            Math.random() * 60 - 30, // x: wider spread
            Math.random() * 40 + 10, // y: start above the camera view
            Math.random() * 60 - 30  // z: wider spread
        );
        
        velocities.push(Math.random() * 0.4 + 0.1); // Random falling speed (0.1 to 0.5)
        
        // Default to white/blue rain
        const shade = 0.8 + Math.random() * 0.2;
        colors.push(shade, shade, 1); // Slightly blue tint
        
        // Random raindrop sizes
        rainDropSizes.push(Math.random() * 0.15 + 0.05);
    }

    rainGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    rainGeometry.setAttribute('velocity', new THREE.Float32BufferAttribute(velocities, 1));
    rainGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    // Material with vertex colors
    rainMaterial = new THREE.PointsMaterial({
        size: 0.1,
        transparent: true,
        opacity: 0.7,
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true
    });

    rainParticles = new THREE.Points(rainGeometry, rainMaterial);
    scene.add(rainParticles);
    console.log("Enhanced rain initialized");
}

/**
 * Initializes floating debris for added atmosphere.
 * @param {THREE.Scene} scene - The main Three.js scene
 */
function initDebris(scene) {
    debrisGroup = new THREE.Group();
    scene.add(debrisGroup);
    
    // Create 50 random debris objects
    for (let i = 0; i < 50; i++) {
        const size = Math.random() * 0.5 + 0.2;
        let geometry;
        
        // Random geometry type
        const geoType = Math.floor(Math.random() * 4);
        switch(geoType) {
            case 0:
                geometry = new THREE.BoxGeometry(size, size, size);
                break;
            case 1:
                geometry = new THREE.SphereGeometry(size/2, 4, 4); // Low poly for uncanny feel
                break;
            case 2:
                geometry = new THREE.TetrahedronGeometry(size/2);
                break;
            default:
                geometry = new THREE.PlaneGeometry(size, size * 3); // Like papers or leaves
        }
        
        // Dark, semi-transparent material
        const material = new THREE.MeshBasicMaterial({
            color: 0x333333,
            transparent: true,
            opacity: 0.7,
            side: THREE.DoubleSide
        });
        
        const debris = new THREE.Mesh(geometry, material);
        
        // Random position
        debris.position.set(
            Math.random() * 60 - 30,
            Math.random() * 20,
            Math.random() * 60 - 30
        );
        
        // Random rotation
        debris.rotation.set(
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2
        );
        
        // Store movement properties
        const debrisData = {
            mesh: debris,
            rotSpeed: {
                x: (Math.random() - 0.5) * 0.02,
                y: (Math.random() - 0.5) * 0.02,
                z: (Math.random() - 0.5) * 0.02
            },
            velocity: {
                x: (Math.random() - 0.5) * 0.05,
                y: -0.02 - Math.random() * 0.02, // Slowly falling
                z: (Math.random() - 0.5) * 0.05
            },
            oscillation: {
                speed: Math.random() * 0.02,
                amplitude: Math.random() * 0.5,
                offset: Math.random() * Math.PI * 2
            }
        };
        
        floatingDebris.push(debrisData);
        debrisGroup.add(debris);
    }
    
    console.log("Floating debris initialized");
}

/**
 * Initializes fog effect for the scene.
 * @param {THREE.Scene} scene - The main Three.js scene
 */
function initFog(scene) {
    // Add fog to the scene
    scene.fog = new THREE.FogExp2(0x060611, fogDensity); // Dark blue fog
    fogEffect = scene.fog;
    console.log("Fog initialized");
}

/**
 * Initializes the lightning effect with enhanced properties.
 * @param {THREE.Scene} scene - The main Three.js scene
 */
function initLightning(scene) {
    // Main flash light
    flash = new THREE.PointLight(0xccddff, 0, 70, 2); // Bluish light
    flash.position.set(0, 50, 0);
    scene.add(flash);
    
    // Secondary ambient lightning effect
    const ambientFlash = new THREE.AmbientLight(0x444444, 0);
    ambientFlash.name = "ambientFlash";
    scene.add(ambientFlash);
    
    resetNextFlashTime();
    console.log("Enhanced lightning initialized");
}

/**
 * Creates a CSS filter for glitch effects on the canvas.
 */
function initGlitchFilter() {
    // Create a style element to hold our filter CSS
    const style = document.createElement('style');
    document.head.appendChild(style);
    
    // Add basic glitch keyframes
    style.sheet.insertRule(`
        @keyframes glitchAnimation {
            0% { filter: none; }
            10% { filter: hue-rotate(90deg) contrast(150%) saturate(150%); }
            15% { filter: hue-rotate(-90deg) contrast(150%) saturate(150%) invert(100%); }
            20% { filter: hue-rotate(45deg) brightness(2) contrast(150%); }
            25% { filter: hue-rotate(-45deg) brightness(0.8) contrast(150%) blur(1px); }
            30% { filter: none; }
            40% { filter: hue-rotate(20deg) saturate(150%); }
            45% { filter: hue-rotate(-20deg) contrast(150%) saturate(150%) invert(30%); }
            50% { filter: none; }
            51% { filter: brightness(0.3) contrast(200%); }
            52% { filter: none; }
            90% { filter: none; }
            100% { filter: none; }
        }
    `, 0);
    
    // Find the canvas element - do this after Three.js creates it
    setTimeout(() => {
        const canvas = document.querySelector('canvas');
        if (canvas) {
            glitchElement = canvas;
            console.log("Glitch filter initialized");
        } else {
            console.warn("Could not find canvas for glitch effect");
            // Try again later
            setTimeout(() => {
                const canvasRetry = document.querySelector('canvas');
                if (canvasRetry) {
                    glitchElement = canvasRetry;
                    console.log("Glitch filter initialized (retry)");
                }
            }, 2000);
        }
    }, 100);
}

/**
 * Initialize audio elements for atmospheric sounds.
 */
function initSounds() {
    // In a real implementation, you would load actual audio files
    // This is a placeholder for demonstration
    ambientSound = { play: () => console.log("Ambient sound playing"), volume: 1 };
    thunderSound = { play: () => console.log("Thunder sound playing"), volume: 1 };
    glitchSound = { play: () => console.log("Glitch sound playing"), volume: 1 };
    whisperSound = { play: () => console.log("Whisper sound playing"), volume: 1 };
    
    console.log("Sound effects initialized (placeholder)");
}

/**
 * Updates all weather effects in the animation loop.
 * @param {number} gameTime - Current game time (milliseconds)
 * @param {THREE.Scene} scene - The main Three.js scene
 */
function updateWeatherEffects(gameTime, scene) {
    updateRain(gameTime);
    updateLightning(gameTime, scene);
    updateDebris(gameTime);
    updateFog(gameTime);
    updateGlitchEffect(gameTime);
    
    // Occasionally switch to blood rain mode
    if (Math.random() < 0.0001) { // Very rare chance per frame
        toggleBloodRain();
    }
}

/**
 * Updates the position and properties of raindrops.
 * @param {number} gameTime - Current game time (milliseconds)
 */
function updateRain(gameTime) {
    if (!rainParticles) return;

    const positions = rainGeometry.attributes.position.array;
    const velocities = rainGeometry.attributes.velocity.array;
    const colors = rainGeometry.attributes.color.array;
    let changesMade = false;

    // Gradually shift rain color if in blood rain mode
    if (bloodRain) {
        bloodRainTimer += 0.01;
        if (bloodRainTimer > 1) bloodRainTimer = 1;
    } else {
        bloodRainTimer -= 0.01;
        if (bloodRainTimer < 0) bloodRainTimer = 0;
    }

    // Update rain color shift based on various factors
    rainColorShift = bloodRainTimer * 0.8; // Base shift from blood rain
    if (isFlashing) rainColorShift += 0.2; // Lightning affects color
    if (glitchActive) rainColorShift += 0.3; // Glitch affects color

    // Update material size based on uncanny factors
    rainMaterial.size = 0.1 + (bloodRainTimer * 0.1) + (glitchActive ? 0.2 : 0);

    for (let i = 0; i < rainCount; i++) {
        const idx = i * 3;
        const yIndex = idx + 1; // Index for the y-coordinate

        // Apply distortion during glitches
        if (glitchActive && Math.random() < 0.2) {
            positions[idx] += (Math.random() - 0.5) * distortionAmount;
            positions[idx + 2] += (Math.random() - 0.5) * distortionAmount;
        }

        // Move drop down based on its velocity (affected by glitch)
        const speedFactor = glitchActive && Math.random() < 0.1 ? 
            (Math.random() < 0.5 ? -0.5 : 3) : // Some drops go up or very fast during glitch
            1;
        
        positions[yIndex] -= velocities[i] * speedFactor;

        // Reset drop if it falls below the ground
        if (positions[yIndex] < -5 || positions[yIndex] > 50) { // Also reset if somehow gets too high
            positions[idx] = Math.random() * 60 - 30;
            positions[yIndex] = Math.random() * 20 + 20;
            positions[idx + 2] = Math.random() * 60 - 30;
            
            // Maybe change the velocity
            if (Math.random() < 0.1) {
                velocities[i] = Math.random() * 0.4 + 0.1;
            }
            
            changesMade = true;
        }
        
        // Update raindrop color
        const colorIdx = i * 3;
        if (bloodRainTimer > 0) {
            // Blend between normal rain and blood rain
            colors[colorIdx] = 0.8 + (0.2 * rainColorShift); // R: increase for blood
            colors[colorIdx + 1] = 0.8 - (0.8 * rainColorShift); // G: decrease for blood
            colors[colorIdx + 2] = 1.0 - (0.9 * rainColorShift); // B: decrease for blood
            changesMade = true;
        }
    }

    // Important: Tell Three.js that the attributes have changed
    if (changesMade) {
        rainGeometry.attributes.position.needsUpdate = true;
        rainGeometry.attributes.color.needsUpdate = true;
    }
}

/**
 * Updates the lightning effect with enhanced behavior.
 * @param {number} gameTime - Current game time (milliseconds)
 * @param {THREE.Scene} scene - The main Three.js scene
 */
function updateLightning(gameTime, scene) {
    if (!flash) return;

    const now = gameTime;

    if (isFlashing) {
        // If currently flashing, check if the duration is over
        if (now > flashInterval) {
            flash.intensity = 0; // Turn off flash
            
            // Also turn off ambient flash
            const ambientFlash = scene.getObjectByName("ambientFlash");
            if (ambientFlash) ambientFlash.intensity = 0;
            
            isFlashing = false;
            resetNextFlashTime(); // Schedule the next potential flash
        } else {
            // During flash, create pulsating effect
            const flashProgress = (now - (flashInterval - flashDuration)) / flashDuration;
            const pulseEffect = Math.sin(flashProgress * Math.PI * 8) * 0.5 + 0.5;
            
            // Base intensity with pulse modulation
            const baseIntensity = Math.max(0, 15 - (flashProgress * 15));
            flash.intensity = baseIntensity * (0.8 + (pulseEffect * 0.4));
            
            // Update ambient flash
            const ambientFlash = scene.getObjectByName("ambientFlash");
            if (ambientFlash) {
                ambientFlash.intensity = baseIntensity * 0.05; // Subtle ambient boost
            }
            
            // Chance to trigger glitch during flash
            if (Math.random() < 0.01 && !glitchActive) {
                triggerGlitch(gameTime, Math.random() * 300 + 200);
            }
        }
    } else {
        // If not flashing, check if it's time for the next potential flash
        if (now > nextFlashTime) {
            // Check for special multi-flash sequences
            const multiFlash = Math.random() < 0.3; // 30% chance of multi-flash
            
            // Trigger the flash
            const intensity = multiFlash ? 
                (Math.random() * 5 + 5) : // Softer for multi-flash
                (Math.random() * 20 + 10); // Stronger for single flash
                
            flash.intensity = intensity;
            flash.color.setHSL(
                Math.random() < 0.2 ? 0.6 : 0, // Occasionally purplish
                Math.random() * 0.2, // Low saturation
                0.9 // High lightness
            );
            
            // Set flash duration
            flashDuration = multiFlash ? 
                (Math.random() * 50 + 30) : // Shorter for multi-flash
                (Math.random() * 200 + 100); // Longer for single
                
            flashInterval = now + flashDuration;
            isFlashing = true;
            
            // Maybe play thunder sound
            if (thunderSound && Math.random() < 0.7) {
                // In a real implementation, would have delay and volume based on intensity
                // thunderSound.play();
            }
            
            // For multi-flash, schedule additional quick flashes
            if (multiFlash) {
                const numExtraFlashes = Math.floor(Math.random() * 3) + 1;
                scheduleMultiFlash(now, numExtraFlashes);
            }
            
            // High chance to trigger glitch during intense flashes
            if (intensity > 20 && Math.random() < 0.4 && !glitchActive) {
                triggerGlitch(gameTime, Math.random() * 500 + 200);
            }
        }
    }
}

/**
 * Schedules multiple quick flashes as part of a lightning sequence.
 * @param {number} startTime - Time when the sequence starts
 * @param {number} count - Number of additional flashes to schedule
 */
function scheduleMultiFlash(startTime, count) {
    // This would need proper implementation if used
    // The idea is to create multiple flash events after the main one
    console.log(`Scheduled ${count} additional flashes`);
}

/**
 * Updates the position and rotation of floating debris.
 * @param {number} gameTime - Current game time (milliseconds)
 */
function updateDebris(gameTime) {
    if (!floatingDebris || floatingDebris.length === 0) return;
    
    floatingDebris.forEach(debris => {
        const mesh = debris.mesh;
        
        // Update position
        mesh.position.x += debris.velocity.x * (glitchActive ? 5 : 1);
        mesh.position.y += debris.velocity.y * (glitchActive ? 2 : 1);
        mesh.position.z += debris.velocity.z * (glitchActive ? 5 : 1);
        
        // Add oscillation to x and z
        const time = gameTime * 0.001;
        mesh.position.x += Math.sin(time * debris.oscillation.speed + debris.oscillation.offset) 
            * debris.oscillation.amplitude * (isFlashing ? 2 : 1);
        mesh.position.z += Math.cos(time * debris.oscillation.speed + debris.oscillation.offset) 
            * debris.oscillation.amplitude * (isFlashing ? 2 : 1);
        
        // Update rotation
        mesh.rotation.x += debris.rotSpeed.x * (glitchActive ? 10 : 1);
        mesh.rotation.y += debris.rotSpeed.y * (glitchActive ? 10 : 1);
        mesh.rotation.z += debris.rotSpeed.z * (glitchActive ? 10 : 1);
        
        // Reset if out of bounds
        if (mesh.position.y < -10) {
            mesh.position.y = Math.random() * 20 + 20;
            mesh.position.x = Math.random() * 60 - 30;
            mesh.position.z = Math.random() * 60 - 30;
        }
        
        // During lightning, make debris more visible
        if (isFlashing) {
            mesh.material.opacity = Math.min(0.9, mesh.material.opacity + 0.05);
        } else {
            mesh.material.opacity = Math.max(0.3, mesh.material.opacity - 0.01);
        }
    });
}

/**
 * Updates the fog density and color based on environmental factors.
 * @param {number} gameTime - Current game time (milliseconds)
 */
function updateFog(gameTime) {
    if (!fogEffect) return;
    
    // Gradually change fog density target based on conditions
    if (bloodRain) {
        fogTarget = 0.04 + Math.sin(gameTime * 0.0005) * 0.01;
    } else if (isFlashing) {
        fogTarget = 0.01; // Less fog during lightning
    } else {
        fogTarget = 0.02 + Math.sin(gameTime * 0.0002) * 0.005;
    }
    
    // During glitch, randomize fog
    if (glitchActive && Math.random() < 0.1) {
        fogTarget = Math.random() * 0.05 + 0.01;
    }
    
    // Smoothly transition fog density
    fogDensity += (fogTarget - fogDensity) * 0.01;
    fogEffect.density = fogDensity;
    
    // Adjust fog color
    if (bloodRain) {
        // Reddish fog for blood rain
        fogEffect.color.setRGB(0.1 + bloodRainTimer * 0.1, 0.05, 0.05);
    } else if (isFlashing) {
        // Brighter fog during lightning
        fogEffect.color.setRGB(0.1, 0.1, 0.2);
    } else {
        // Normal dark fog
        fogEffect.color.setRGB(0.05, 0.05, 0.1);
    }
}

/**
 * Updates the glitch visual effect on the canvas.
 * @param {number} gameTime - Current game time (milliseconds)
 */
function updateGlitchEffect(gameTime) {
    if (!glitchElement) return;
    
    // Check if it's time to trigger a random glitch
    if (!glitchActive && Math.random() < 0.0005) { // Very rare chance per frame
        triggerGlitch(gameTime, Math.random() * 300 + 100);
    }
    
    // Update distortion amount if glitch is active
    if (glitchActive) {
        distortionAmount = Math.random() * 0.2 + 0.1;
    } else {
        distortionAmount = 0;
    }
    
    // Check if glitch should end
    if (glitchActive && gameTime > lastGlitchTime) {
        glitchElement.style.animation = 'none';
        glitchActive = false;
        
        // Reset canvas filter
        glitchElement.style.filter = 'none';
    }
}

/**
 * Triggers a glitch visual effect.
 * @param {number} gameTime - Current game time
 * @param {number} duration - Duration of the glitch in milliseconds
 */
function triggerGlitch(gameTime, duration) {
    if (!glitchElement) return;
    
    glitchActive = true;
    lastGlitchTime = gameTime + duration;
    
    // Apply glitch animation
    glitchElement.style.animation = 'glitchAnimation 0.5s infinite';
    
    // Maybe trigger whisper sound during glitch
    if (whisperSound && Math.random() < 0.5) {
        // In a real implementation, would play whisper sound
        // whisperSound.volume = Math.random() * 0.3 + 0.1;
        // whisperSound.play();
    }
    
    console.log(`Glitch triggered for ${duration}ms`);
}

/**
 * Toggles the blood rain mode on or off.
 */
function toggleBloodRain() {
    bloodRain = !bloodRain;
    console.log(`Blood rain: ${bloodRain ? 'ON' : 'OFF'}`);
    
    // If turning on blood rain, trigger a glitch
    if (bloodRain && !glitchActive) {
        triggerGlitch(performance.now(), 800);
    }
}

/**
 * Resets the time for the next lightning flash.
 * Uses randomness to make flashes unpredictable.
 */
function resetNextFlashTime() {
    const now = performance.now();
    
    // Different flash frequency based on conditions
    let minDelay, maxDelay;
    
    if (bloodRain) {
        // More frequent flashes during blood rain
        minDelay = 3000;
        maxDelay = 8000;
    } else {
        // Normal flash frequency
        minDelay = 5000;
        maxDelay = 25000;
    }
    
    // Schedule next flash
    const randomDelay = Math.random() * (maxDelay - minDelay) + minDelay;
    nextFlashTime = now + randomDelay;
}

// Export functions to be used in main.js
// If using ES6 modules:
// export { 
//     initWeatherEffects, 
//     updateWeatherEffects, 
//     toggleBloodRain, 
//     triggerGlitch
// };

// If including scripts in HTML, these functions will be globally accessible.