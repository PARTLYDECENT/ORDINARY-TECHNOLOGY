// animationdie1.js
// Triggers an instant extreme death animation where the player flies down fast into the abyss, gets crushed, and melts.

window.triggerAbyssDeath = function() {
    if (window.isDead || window.abyssDeathTriggered) return;
    window.abyssDeathTriggered = true;
    
    // Play error sound and log
    if (typeof NeuralConsole !== 'undefined') {
        NeuralConsole.log("CRITICAL_WARNING: CHASSIS BREACH DETECTED.", "err");
        setTimeout(() => NeuralConsole.log("DEPTH_SENSOR: FREEFALL. RAPID DESCENSION.", "err"), 200);
        setTimeout(() => NeuralConsole.log("STRUCTURAL_INTEGRITY: COMPROMISED. HULL CRUSHING.", "err"), 600);
        setTimeout(() => NeuralConsole.log("SYSTEM_FAILURE: MELTING SEQUENCE INITIATED.", "sys"), 1000);
    }

    if (window.SFX) {
        if (typeof window.SFX.triggerAbility === 'function') window.SFX.triggerAbility();
        if (typeof window.SFX.triggerScream === 'function') window.SFX.triggerScream(2.0);
    }

    // Disable player controls
    window.isDead = true;
    if (window.player) window.player.isDead = true;

    // UI overlays
    const abyssOverlay = document.getElementById('abyss-overlay');
    const depthIndicator = document.getElementById('abyss-depth-indicator');
    if (abyssOverlay) {
        abyssOverlay.style.display = 'block';
        abyssOverlay.style.background = 'radial-gradient(ellipse at 50% 50%, rgba(0, 10, 30, 0.8) 0%, rgba(0, 0, 5, 1.0) 100%)';
    }
    if (depthIndicator) {
        depthIndicator.style.display = 'block';
        depthIndicator.style.color = '#ff3333';
        depthIndicator.style.fontWeight = 'bold';
        depthIndicator.style.fontSize = '24px';
    }

    const duration = 2.5; // Slightly longer for the horror to set in
    let t = 0;
    let initialFOV = window.cameraFPS ? window.cameraFPS.fov : 75;

    // Use a custom update loop for the intense death animation
    const animateDeath = () => {
        t += 0.016; // Approx delta
        const progress = Math.min(t / duration, 1.0);
        const easeInExp = Math.pow(progress, 3); // starts slow, ends extremely fast

        if (t > duration) {
            if (depthIndicator) depthIndicator.innerText = "CRUSH DEPTH EXCEEDED // SIGNAL LOST";
            
            // Show Game Over
            const overlay = document.getElementById('gameover-overlay');
            if (overlay) {
                overlay.classList.add('active');
                if (document.getElementById('go-kills')) document.getElementById('go-kills').innerText = window.totalKills || 0;
                if (document.getElementById('go-time')) {
                    const st = window.survivalTime || 0;
                    document.getElementById('go-time').innerText = 
                        Math.floor(st / 60).toString().padStart(2, '0') + ':' + 
                        Math.floor(st % 60).toString().padStart(2, '0');
                }
            }
            
            // Restore FOV just in case (though game is over)
            if (window.cameraFPS) {
                window.cameraFPS.fov = initialFOV;
                window.cameraFPS.updateProjectionMatrix();
            }
            return;
        }

        // Update Depth UI
        if (depthIndicator) {
            // Logarithmic depth plummeting: 0 to -12,000 meters
            const currentDepth = Math.floor(Math.pow(progress, 4) * 12450);
            depthIndicator.innerText = `DEPTH: -${currentDepth}m \\\\ PRESSURE CRITICAL`;
            
            // Glitch text effect
            if (Math.random() < 0.2) {
                depthIndicator.style.transform = `translate(${(Math.random()-0.5)*10}px, ${(Math.random()-0.5)*10}px)`;
            } else {
                depthIndicator.style.transform = 'none';
            }
        }

        // Fast downward flight (exponential speed)
        const fallSpeed = 10.0 + (easeInExp * 200.0); 
        
        if (window.player) {
            window.player.position.y -= fallSpeed * 0.016; 
            
            // Melt & Crush effect 
            if (window.player.armorMat && window.player.armorMat.uniforms) {
                window.player.armorMat.uniforms.uDamagePulse.value = 1.0 + (easeInExp * 5.0);
                window.player.armorMat.uniforms.uHealthPct.value = Math.max(0, 1.0 - (progress * 1.5));
            }
            if (window.player.energyMat) {
                window.player.energyMat.emissiveIntensity = Math.max(0, 3.5 * (1.0 - progress));
            }
            
            // Physical chassis crushing (compressing X and Z, stretching Y slightly)
            const crushXZ = 1.0 - (easeInExp * 0.85); // crushes down to 15% width
            const stretchY = 1.0 + (easeInExp * 1.5); // stretches to 250% height
            // We need to access the root scale, TitanPlayer's initial scale is 0.19.
            window.player.scale.set(0.19 * crushXZ, 0.19 * stretchY, 0.19 * crushXZ);

            // Spin the player wildly
            window.player.rotation.y += (10.0 + easeInExp * 40.0) * 0.016;
            window.player.rotation.x += (5.0 + easeInExp * 20.0) * 0.016;
            window.player.rotation.z += (8.0 + easeInExp * 25.0) * 0.016;
        }

        // Camera FOV Warp & Shake
        if (window.cameraFPS) {
            // FOV narrows to simulate crushing pressure and tunnel vision
            window.cameraFPS.fov = initialFOV - (easeInExp * 50.0);
            window.cameraFPS.updateProjectionMatrix();

            // Violent camera shake
            const shake = easeInExp * 0.5;
            window.cameraFPS.position.x += (Math.random() - 0.5) * shake;
            window.cameraFPS.position.y += (Math.random() - 0.5) * shake;
            window.cameraFPS.position.z += (Math.random() - 0.5) * shake;
            
            window.cameraFPS.rotation.z += (Math.random() - 0.5) * shake * 0.5;
        }

        // Emit high velocity bubbles streaming upward
        if (typeof window.emitParticle === 'function') {
            for(let i=0; i < 3; i++) {
                const px = window.player ? window.player.position.x : 0;
                const py = window.player ? window.player.position.y : 0;
                const pz = window.player ? window.player.position.z : 0;
                
                // Bubbles moving up relative to the falling player
                window.emitParticle(
                    px + (Math.random()-0.5)*3, 
                    py - 2.0, 
                    pz + (Math.random()-0.5)*3,
                    (Math.random()-0.5)*2,
                    fallSpeed * 0.8 + Math.random()*10, // Rushing upwards
                    (Math.random()-0.5)*2,
                    0.6, 0.8, 1.0, // cyan/blue bubbles
                    2 + Math.random()*3, 
                    0.5 + Math.random()*0.5
                );
            }
        }
        
        // Continually trigger harsh impact sounds as we get deeper
        if (progress > 0.3 && Math.random() < 0.1 && window.SFX && typeof window.SFX.triggerHit === 'function') {
            window.SFX.triggerHit();
        }

        requestAnimationFrame(animateDeath);
    };

    animateDeath();
};
