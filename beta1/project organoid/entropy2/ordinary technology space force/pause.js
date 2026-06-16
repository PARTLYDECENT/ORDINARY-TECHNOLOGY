/**
 * pause.js
 * Handles the holographic cockpit HUD and pause state transitions.
 */

const PauseMenu = {
    isPaused: false,
    
    // Initial camera state to return to
    originalCamPos: new THREE.Vector3(),
    originalCamFOV: 60,

    init() {
        this.createUI();
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' || e.key === 'p') {
                this.toggle();
            }
        });
    },

    createUI() {
        const uiContainer = document.createElement('div');
        uiContainer.id = 'pauseOverlay';
        uiContainer.className = 'fixed inset-0 z-[100] hidden pointer-events-none flex flex-col items-center justify-center';
        
        // Holographic Backdrop (Glassmorphism)
        uiContainer.innerHTML = `
            <div class="absolute inset-0 bg-cyan-900/10 backdrop-blur-[2px]"></div>
            
            <!-- Cockpit HUD Elements -->
            <div class="relative w-full h-full flex flex-col items-center justify-between p-12 overflow-hidden">
                
                <!-- Top HUD Bar -->
                <div class="w-full flex justify-between items-start opacity-70 animate-pulse">
                    <div class="text-[10px] font-mono text-cyan-400 space-y-1">
                        <div>AUTOPILOT_STATUS: ACTIVE</div>
                        <div>Z-DRIVE_BUFFER: STABLE</div>
                    </div>
                    <div class="text-[10px] font-mono text-magenta-400 text-right space-y-1">
                        <div>SYSTEM_PAUSED</div>
                        <div>LOCAL_TIME: ${new Date().toLocaleTimeString()}</div>
                    </div>
                </div>

                <!-- Center Holographic Windows -->
                <div class="flex gap-8 pointer-events-auto">
                    <!-- Resume Window -->
                    <div onclick="PauseMenu.toggle()" class="group relative w-64 h-80 bg-cyan-950/40 border border-cyan-500/50 backdrop-blur-md rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all hover:scale-105 hover:border-cyan-400 hover:shadow-[0_0_30px_rgba(0,255,255,0.3)]">
                        <div class="absolute top-0 left-0 w-full h-1 bg-cyan-400/50"></div>
                        <span class="text-xs text-cyan-500/50 absolute top-4 left-4 font-mono">CMD_RESUME</span>
                        <h2 class="text-3xl font-black text-cyan-400 tracking-tighter group-hover:glitch-text">ENGAGE</h2>
                        <p class="text-[10px] text-cyan-300/70 mt-4 uppercase tracking-widest text-center px-4">Resume manual control and return to sector</p>
                    </div>

                    <!-- Reset Window -->
                    <div onclick="location.reload()" class="group relative w-64 h-80 bg-magenta-950/40 border border-magenta-500/50 backdrop-blur-md rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all hover:scale-105 hover:border-magenta-400 hover:shadow-[0_0_30px_rgba(255,0,255,0.3)]">
                        <div class="absolute top-0 left-0 w-full h-1 bg-magenta-400/50"></div>
                        <span class="text-xs text-magenta-500/50 absolute top-4 left-4 font-mono">CMD_REBOOT</span>
                        <h2 class="text-3xl font-black text-magenta-400 tracking-tighter group-hover:glitch-text">REBOOT</h2>
                        <p class="text-[10px] text-magenta-300/70 mt-4 uppercase tracking-widest text-center px-4">System reset and restart mission protocol</p>
                    </div>
                </div>

                <!-- Bottom Decorative HUD -->
                <div class="w-full flex justify-center items-end opacity-40 h-32">
                    <div class="w-1/3 h-full border-t border-x border-cyan-500/30 rounded-t-3xl relative">
                         <div class="absolute inset-x-0 top-4 flex justify-around">
                            <div class="w-1 h-8 bg-cyan-400 animate-[bounce_1s_infinite]"></div>
                            <div class="w-1 h-12 bg-magenta-400 animate-[bounce_1.2s_infinite]"></div>
                            <div class="w-1 h-6 bg-cyan-400 animate-[bounce_0.8s_infinite]"></div>
                            <div class="w-1 h-10 bg-cyan-400 animate-[bounce_1.1s_infinite]"></div>
                         </div>
                    </div>
                </div>
            </div>

            <!-- Scanline Overlay -->
            <div class="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] bg-[length:100%_4px,3px_100%]"></div>
        `;
        
        document.body.appendChild(uiContainer);
    },

    toggle() {
        if (typeof gameState !== 'undefined' && gameState === 'menu') return;
        
        this.isPaused = !this.isPaused;
        const overlay = document.getElementById('pauseOverlay');
        
        if (this.isPaused) {
            overlay.classList.remove('hidden');
            overlay.classList.add('flex');
            gameState = 'paused';
            
            // Camera Logic
            this.originalCamPos.copy(camera.position);
            this.originalCamFOV = camera.fov;
            
            // Move camera "into" the cockpit
            const cockpitTarget = playerShip.group.position.clone();
            cockpitTarget.z -= 2; // Zoom forward passed the tail
            cockpitTarget.y += 0.5; // Slightly up for pilot view
            
            gsap.to(camera.position, {
                x: cockpitTarget.x,
                y: cockpitTarget.y,
                z: cockpitTarget.z,
                duration: 0.8,
                ease: "power2.inOut"
            });
            
            gsap.to(camera, {
                fov: 90,
                duration: 0.8,
                ease: "power2.inOut",
                onUpdate: () => camera.updateProjectionMatrix()
            });

        } else {
            overlay.classList.add('hidden');
            overlay.classList.remove('flex');
            gameState = 'playing';
            
            // Return camera to original state
            gsap.to(camera.position, {
                x: 0,
                y: 0,
                z: 5,
                duration: 0.5,
                ease: "power2.out"
            });
            
            gsap.to(camera, {
                fov: 60,
                duration: 0.5,
                ease: "power2.out",
                onUpdate: () => camera.updateProjectionMatrix()
            });
        }
    }
};

window.PauseMenu = PauseMenu;
