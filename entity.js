/**
 * ENTITY.JS - Procedural Organism Generation System
 * Creates animated, moving organisms with procedural characteristics
 */

class ProceduralEntity {
    constructor(config = {}) {
        this.id = config.id || `entity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        this.element = null;
        this.position = { x: config.x || Math.random() * window.innerWidth, y: config.y || Math.random() * window.innerHeight };
        this.velocity = { x: (Math.random() - 0.5) * 2, y: (Math.random() - 0.5) * 2 };
        this.size = config.size || 30 + Math.random() * 40;
        this.color = config.color || this.generateRandomColor();
        this.shape = config.shape || this.generateShape();
        this.tentacles = config.tentacles || Math.floor(3 + Math.random() * 8);
        this.pulsate = config.pulsate !== false;
        this.glowIntensity = config.glow || 0.5 + Math.random() * 0.5;
        this.speed = config.speed || 0.5 + Math.random() * 1.5;
        this.rotationSpeed = (Math.random() - 0.5) * 2;
        this.rotation = 0;
        this.alive = true;

        // Evolution System Properties
        this.stage = 0; // 0=Microbe, 1=Cell, 2=Creature, 3=Apex
        this.evolutionPoints = 0;
        this.age = 0; // In seconds
        this.birthTime = Date.now();
        this.hasEvolved = false;

        // Particle-based visual representation
        this.particles = [];
        this.constraints = [];
        this.eyes = [];
        this.particleRadius = this.size / 10;
        this.currentScale = 1.0;
        this.breathePhase = Math.random() * Math.PI * 2;

        // Procedural texturing
        this.skinPattern = config.pattern || this.generatePattern();
        this.patternFunction = null;
        this.bioluminescenceIntensity = 0.3 + Math.random() * 0.7;
        this.bioluminescentSpots = [];

        // Voice System
        if (typeof EntityVoice !== 'undefined') {
            this.voice = new EntityVoice(this);
        }

        // Personality System
        const personalities = ['curious', 'shy', 'aggressive', 'peaceful', 'fearful', 'friendly'];
        this.personality = config.personality || personalities[Math.floor(Math.random() * personalities.length)];

        // Movement Trail
        this.trail = [];
        this.maxTrailLength = 20;
        this.trailEnabled = false; // Enabled at higher stages

        // Energy Field
        this.energyField = {
            enabled: false,
            radius: 0,
            intensity: 0,
            color: this.color
        };

        this.init();
    }

    generateRandomColor() {
        const hue = Math.random() * 360;
        const saturation = 60 + Math.random() * 40;
        const lightness = 50 + Math.random() * 30;
        return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    }

    generateShape() {
        const shapes = ['blob', 'star', 'diamond', 'hexagon', 'amoeba'];
        return shapes[Math.floor(Math.random() * shapes.length)];
    }

    generatePattern() {
        const patterns = ['none', 'spots', 'stripes', 'cells', 'veins'];
        const weights = [0.3, 0.2, 0.15, 0.15, 0.2]; // Weighted random
        const rand = Math.random();
        let sum = 0;
        for (let i = 0; i < patterns.length; i++) {
            sum += weights[i];
            if (rand < sum) return patterns[i];
        }
        return 'none';
    }

    init() {
        // Generate particle-based body
        this.generateParticleBody();

        // Generate procedural pattern function
        if (typeof ProceduralTextures !== 'undefined') {
            this.patternFunction = ProceduralTextures.getPattern(this.skinPattern, this.size);

            // Generate bioluminescent spots
            const spotCount = Math.floor(2 + Math.random() * 5);
            this.bioluminescentSpots = ProceduralTextures.generateBiolumSpots(spotCount, this.size);
        }

        console.log(`🦠 Spawned entity ${this.id} at ${this.position.x}, ${this.position.y}`);

        // Greeting
        if (this.voice) setTimeout(() => this.voice.speak('greeting'), 1000 + Math.random() * 2000);
    }

    /**
     * Generate particle-based body structure
     */
    generateParticleBody() {
        this.particles = [];

        // Create body particles in a ring formation
        const bodyParticleCount = Math.floor(8 + Math.random() * 4);
        const bodyRadius = this.size * 0.4;

        for (let i = 0; i < bodyParticleCount; i++) {
            const angle = (i / bodyParticleCount) * Math.PI * 2;
            const radius = this.particleRadius * (0.8 + Math.random() * 0.4);

            this.particles.push({
                x: Math.cos(angle) * bodyRadius,
                y: Math.sin(angle) * bodyRadius,
                baseX: Math.cos(angle) * bodyRadius, // Original position
                baseY: Math.sin(angle) * bodyRadius,
                radius: radius,
                type: 'body',
                angle: angle,
                offset: Math.random() * Math.PI * 2 // For animation
            });
        }

        // Add center particle for more mass
        this.particles.push({
            x: 0,
            y: 0,
            baseX: 0,
            baseY: 0,
            radius: this.particleRadius * 1.5,
            type: 'body',
            angle: 0,
            offset: 0
        });

        // Create tentacle particles
        for (let t = 0; t < this.tentacles; t++) {
            const angle = (t / this.tentacles) * Math.PI * 2;
            const segmentCount = Math.floor(3 + Math.random() * 3);

            for (let s = 0; s < segmentCount; s++) {
                const distance = bodyRadius + (s + 1) * (this.size * 0.15);
                const segmentRadius = this.particleRadius * (1 - s / segmentCount) * 0.6;

                this.particles.push({
                    x: Math.cos(angle) * distance,
                    y: Math.sin(angle) * distance,
                    baseX: Math.cos(angle) * distance,
                    baseY: Math.sin(angle) * distance,
                    radius: segmentRadius,
                    type: 'tentacle',
                    tentacleIndex: t,
                    segmentIndex: s,
                    angle: angle,
                    offset: Math.random() * Math.PI * 2
                });
            }

            // Fractal branching for Transcendent and Cosmic entities
            if (this.fractalTentacles && segmentCount >= 2) {
                const branchPoint = Math.floor(segmentCount / 2);
                const branchDistance = bodyRadius + (branchPoint + 1) * (this.size * 0.15);
                const branchCount = 2;

                for (let b = 0; b < branchCount; b++) {
                    const branchAngle = angle + (b === 0 ? -0.5 : 0.5);
                    const branchSegments = Math.floor(segmentCount / 2);

                    for (let bs = 0; bs < branchSegments; bs++) {
                        const bDistance = branchDistance + (bs + 1) * (this.size * 0.1);
                        const bRadius = this.particleRadius * (1 - bs / branchSegments) * 0.4;

                        this.particles.push({
                            x: Math.cos(branchAngle) * bDistance,
                            y: Math.sin(branchAngle) * bDistance,
                            baseX: Math.cos(branchAngle) * bDistance,
                            baseY: Math.sin(branchAngle) * bDistance,
                            radius: bRadius,
                            type: 'fractal-tentacle',
                            tentacleIndex: t,
                            branchIndex: b,
                            segmentIndex: bs,
                            angle: branchAngle,
                            offset: Math.random() * Math.PI * 2
                        });
                    }
                }
            }
        }

        // Create eye particles
        const eyeCount = Math.random() > 0.5 ? 2 : 1;
        const eyeSize = this.size * 0.15;

        for (let i = 0; i < eyeCount; i++) {
            const xPos = eyeCount === 2 ? (i === 0 ? -1 : 1) * this.size * 0.2 : 0;

            this.eyes.push({
                x: xPos,
                y: -this.size * 0.15,
                radius: eyeSize
            });
        }
    }



    adjustColorBrightness(color, percent) {
        // Simple color adjustment for gradient
        if (color.startsWith('hsl')) {
            const match = color.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
            if (match) {
                const h = match[1];
                const s = match[2];
                const l = Math.min(100, parseInt(match[3]) + percent);
                return `hsl(${h}, ${s}%, ${l}%)`;
            }
        }
        return color;
    }



    update() {
        if (!this.alive) return;

        // Update age and evolution points
        this.age = (Date.now() - this.birthTime) / 1000;
        this.evolutionPoints = Math.floor(this.age); // 1 point per second
        this.checkEvolution();

        // Breathing animation
        this.breathePhase += 0.05;
        this.currentScale = 1.0 + Math.sin(this.breathePhase) * 0.05;

        // Animate particles
        this.animateParticles();

        // Apply behaviors if systems are available
        if (typeof window !== 'undefined' && window.entityManager) {
            const allEntities = window.entityManager.entities || [];

            // Apply behavior system
            if (window.entityBehaviors && this.stage >= 1) {
                const behaviorForce = window.entityBehaviors.applyAllBehaviors(this, allEntities);
                this.velocity.x += behaviorForce.x * 0.1;
                this.velocity.y += behaviorForce.y * 0.1;
            }

            // Update ability effects
            if (window.entityAbilities) {
                window.entityAbilities.updateEffects(this);

                // Auto-trigger abilities for AI entities
                if (this.stage >= 3) {
                    window.entityAbilities.autoTriggerAbilities(this, allEntities, window.entityManager);
                }
            }
        }

        // Update velocity for bouncing behavior
        this.velocity.x += (Math.random() - 0.5) * 0.5;
        this.velocity.y += (Math.random() - 0.5) * 0.5;

        // Limit speed
        const maxSpeed = this.speed;
        const currentSpeed = Math.sqrt(this.velocity.x ** 2 + this.velocity.y ** 2);
        if (currentSpeed > maxSpeed) {
            this.velocity.x = (this.velocity.x / currentSpeed) * maxSpeed;
            this.velocity.y = (this.velocity.y / currentSpeed) * maxSpeed;
        }

        // Update trail
        if (this.trailEnabled) {
            this.trail.push({ x: this.position.x, y: this.position.y, time: Date.now() });
            if (this.trail.length > this.maxTrailLength) {
                this.trail.shift();
            }
        }

        // Update position
        this.position.x += this.velocity.x;
        this.position.y += this.velocity.y;

        // Update rotation
        this.rotation += this.rotationSpeed;

        // Cosmic stage: color cycling
        if (this.stage === 5) {
            const hue = (Date.now() / 50) % 360;
            this.color = `hsl(${hue}, 100%, 80%)`;
            this.energyField.color = `hsl(${(hue + 180) % 360}, 100%, 70%)`;
        }

        // Bounce off edges
        if (this.position.x <= 0 || this.position.x >= window.innerWidth - this.size) {
            this.velocity.x *= -1;
            this.position.x = Math.max(0, Math.min(window.innerWidth - this.size, this.position.x));
        }
        if (this.position.y <= 0 || this.position.y >= window.innerHeight - this.size) {
            this.velocity.y *= -1;
            this.position.y = Math.max(0, Math.min(window.innerHeight - this.size, this.position.y));
        }

        // Update voice position and random chatter
        if (this.voice) {
            this.voice.updatePosition();
            // Random chatter chance (approx every 10-20 seconds)
            if (Math.random() < 0.001) this.voice.speak('random');
        }
    }

    /**
     * Animate particle positions for organic movement
     */
    animateParticles() {
        const time = this.age;

        this.particles.forEach((particle, index) => {
            if (particle.type === 'body') {
                // Subtle jitter for breathing effect
                const jitter = Math.sin(time * 2 + particle.offset) * 2;
                particle.x = particle.baseX + Math.cos(particle.angle) * jitter;
                particle.y = particle.baseY + Math.sin(particle.angle) * jitter;
            } else if (particle.type === 'tentacle') {
                // Wave propagation along tentacles
                const wave = Math.sin(time * 3 + particle.segmentIndex * 0.5 + particle.offset) * 5;
                const perpAngle = particle.angle + Math.PI / 2;
                particle.x = particle.baseX + Math.cos(perpAngle) * wave;
                particle.y = particle.baseY + Math.sin(perpAngle) * wave;
            } else if (particle.type === 'fractal-tentacle') {
                // More chaotic wave for fractal branches
                const wave = Math.sin(time * 4 + particle.segmentIndex * 0.7 + particle.offset) * 4;
                const wave2 = Math.cos(time * 3.5 + particle.branchIndex + particle.offset) * 3;
                const perpAngle = particle.angle + Math.PI / 2;
                particle.x = particle.baseX + Math.cos(perpAngle) * wave + Math.sin(perpAngle) * wave2;
                particle.y = particle.baseY + Math.sin(perpAngle) * wave + Math.cos(perpAngle) * wave2;
            }
        });
    }

    // Evolution System Methods
    checkEvolution() {
        const newStage = this.getStageForPoints(this.evolutionPoints);
        if (newStage > this.stage && newStage <= 3) {
            this.evolve(newStage);
        }
    }

    getStageForPoints(points) {
        if (points >= 1800) return 5; // Cosmic
        if (points >= 1200) return 4; // Transcendent
        if (points >= 600) return 3; // Apex
        if (points >= 300) return 2; // Creature
        if (points >= 100) return 1; // Cell
        return 0; // Microbe
    }

    evolve(newStage) {
        console.log(`🧬 ${this.id} evolving from stage ${this.stage} to ${newStage}!`);
        this.stage = newStage;
        this.hasEvolved = true;

        // Evolution effects based on stage
        switch (newStage) {
            case 1: // Cell stage
                this.size *= 1.3;
                this.tentacles = Math.min(this.tentacles + 2, 8);
                this.glowIntensity *= 1.5;
                this.color = this.adjustColorForStage(1);
                break;
            case 2: // Creature stage
                this.size *= 1.4;
                this.tentacles = Math.min(this.tentacles + 3, 12);
                this.glowIntensity *= 2;
                this.speed *= 1.2;
                this.shape = ['star', 'diamond'][Math.floor(Math.random() * 2)];
                this.color = this.adjustColorForStage(2);
                this.trailEnabled = true; // Enable movement trails
                break;
            case 3: // Apex stage
                this.size *= 1.5;
                this.tentacles = Math.min(this.tentacles + 5, 16);
                this.glowIntensity *= 2.5;
                this.speed *= 1.3;
                this.color = this.adjustColorForStage(3);
                this.rotationSpeed *= 0.5; // Slower, more majestic
                break;
            case 4: // Transcendent stage - EXOTIC
                this.size *= 1.6;
                this.tentacles = Math.min(this.tentacles + 8, 24);
                this.glowIntensity *= 3;
                this.speed *= 1.4;
                this.color = this.adjustColorForStage(4);
                this.rotationSpeed *= 0.3;
                this.fractalTentacles = true; // Enable fractal branching
                this.energyField.enabled = true;
                this.energyField.radius = this.size * 2;
                this.energyField.intensity = 0.5;
                this.skinPattern = 'fractal'; // Special pattern
                break;
            case 5: // Cosmic stage - REALITY-BENDING
                this.size *= 1.8;
                this.tentacles = Math.min(this.tentacles + 12, 32);
                this.glowIntensity *= 4;
                this.speed *= 1.5;
                this.color = this.adjustColorForStage(5);
                this.rotationSpeed *= 0.2;
                this.fractalTentacles = true;
                this.energyField.enabled = true;
                this.energyField.radius = this.size * 3;
                this.energyField.intensity = 1.0;
                this.holographic = true; // Holographic projections
                this.multiForm = true; // Multiple overlapping forms
                this.skinPattern = 'cosmic'; // Ultimate pattern
                break;
        }

        // Rebuild the organism with new properties
        this.rebuild();

        // Visual evolution effect
        this.showEvolutionEffect();

        // Voice evolution effect
        if (this.voice) this.voice.speak('evolve');
    }

    adjustColorForStage(stage) {
        switch (stage) {
            case 1: // Cell - vibrant greens/blues
                return `hsl(${120 + Math.random() * 60}, 70%, 60%)`;
            case 2: // Creature - purples/magentas
                return `hsl(${270 + Math.random() * 60}, 80%, 65%)`;
            case 3: // Apex - golds/oranges/reds
                return `hsl(${30 + Math.random() * 40}, 90%, 70%)`;
            case 4: // Transcendent - cyan/electric blue
                return `hsl(${180 + Math.random() * 40}, 95%, 75%)`;
            case 5: // Cosmic - prismatic/rainbow (will cycle)
                return `hsl(${Math.random() * 360}, 100%, 80%)`;
            default:
                return this.color;
        }
    }

    rebuild() {
        // Regenerate particles with new properties
        this.generateParticleBody();

        // Regenerate pattern if needed
        if (typeof ProceduralTextures !== 'undefined' && this.skinPattern !== 'none') {
            this.patternFunction = ProceduralTextures.getPattern(this.skinPattern, this.size);
            const spotCount = Math.floor(2 + Math.random() * 5);
            this.bioluminescentSpots = ProceduralTextures.generateBiolumSpots(spotCount, this.size);
        }
    }

    showEvolutionEffect() {
        if (!this.element) return;

        // Create evolution flash effect
        const flash = document.createElement('div');
        flash.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: ${this.size * 2}px;
            height: ${this.size * 2}px;
            background: radial-gradient(circle, ${this.color} 0%, transparent 70%);
            border-radius: 50%;
            pointer-events: none;
            animation: evolutionFlash 1s ease-out forwards;
            z-index: 10000;
        `;

        this.element.appendChild(flash);
        setTimeout(() => flash.remove(), 1000);

        // Add CSS for evolution animation if not already present
        if (!document.getElementById('evolution-animations')) {
            const style = document.createElement('style');
            style.id = 'evolution-animations';
            style.textContent = `
                @keyframes evolutionFlash {
                    0% { opacity: 1; transform: translate(-50%, -50%) scale(0.5); }
                    50% { opacity: 1; transform: translate(-50%, -50%) scale(1.5); }
                    100% { opacity: 0; transform: translate(-50%, -50%) scale(2); }
                }
            `;
            document.head.appendChild(style);
        }
    }

    destroy() {
        this.alive = false;
        // Particles will simply stop being rendered
    }
}

// Entity Manager - Manages multiple organisms
class EntityManager {
    constructor() {
        this.entities = [];
        this.animationFrame = null;
        this.running = false;
        this.renderer = null;

        // Initialize renderer when DOM is ready
        if (typeof window !== 'undefined') {
            this.initializeRenderer();

            // Listen for 3D mode toggle
            window.addEventListener('spatial-web-3d-active', () => this.handle3DMode(true));
            window.addEventListener('spatial-web-3d-inactive', () => this.handle3DMode(false));
        }
    }

    handle3DMode(active) {
        if (active) {
            console.log('🛑 EntityManager: 3D Mode Active - Pausing 2D entities');
            this.stop();
            if (this.renderer) {
                // Clear the canvas so they disappear
                this.renderer.clearCanvas();
            }
        } else {
            console.log('▶️ EntityManager: 3D Mode Inactive - Resuming 2D entities');
            this.start();
        }
    }

    initializeRenderer() {
        const canvas = document.getElementById('organism-canvas');
        if (canvas && typeof EntityRenderer !== 'undefined') {
            this.renderer = new EntityRenderer(canvas);
            console.log('✅ EntityManager connected to renderer');
        } else {
            console.warn('⚠️ Canvas or EntityRenderer not available yet', {
                canvas: !!canvas,
                EntityRenderer: typeof EntityRenderer
            });
        }
    }

    spawn(config) {
        console.log(`➕ EntityManager: Spawning entity (Total: ${this.entities.length + 1})`);
        const entity = new ProceduralEntity(config);
        this.entities.push(entity);

        // Register with renderer
        if (this.renderer) {
            this.renderer.addEntity(entity);
        } else {
            console.warn('⚠️ EntityManager: Renderer not connected during spawn');
        }

        return entity;
    }

    spawnMultiple(count, config = {}) {
        const spawned = [];
        for (let i = 0; i < count; i++) {
            spawned.push(this.spawn(config));
        }
        return spawned;
    }

    start() {
        if (this.running) return;
        console.log('▶️ EntityManager: Starting animation loop');
        this.running = true;
        this.animate();
    }

    stop() {
        this.running = false;
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
    }

    animate() {
        if (!this.running) return;

        // Update entity logic
        this.entities.forEach(entity => entity.update());

        // Render all entities
        if (this.renderer) {
            this.renderer.render();
        }

        this.animationFrame = requestAnimationFrame(() => this.animate());
    }

    clear() {
        this.entities.forEach(entity => entity.destroy());
        this.entities = [];
        if (this.renderer) {
            this.renderer.clear();
        }
    }

    removeEntity(entity) {
        const index = this.entities.indexOf(entity);
        if (index > -1) {
            this.entities.splice(index, 1);
            entity.destroy();

            if (this.renderer) {
                this.renderer.removeEntity(entity.id);
            }
        }
    }
}

// Auto-initialize if loaded in browser
if (typeof window !== 'undefined') {
    window.ProceduralEntity = ProceduralEntity;
    window.EntityManager = EntityManager;

    // Create global entity manager
    window.entityManager = new EntityManager();

    // Initialize behavior and ability systems
    if (typeof EntityBehaviors !== 'undefined') {
        window.entityBehaviors = new EntityBehaviors();
        console.log('🧠 EntityBehaviors system initialized!');
    }

    if (typeof EntityAbilities !== 'undefined') {
        window.entityAbilities = new EntityAbilities();
        console.log('✨ EntityAbilities system initialized!');
    }

    console.log('🦠 Entity.js loaded! Use entityManager.spawn() to create organisms.');
}
