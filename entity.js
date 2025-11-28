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

    init() {
        this.element = document.createElement('div');
        this.element.className = 'procedural-organism';
        this.element.id = this.id;
        this.element.style.cssText = `
      position: fixed;
      width: ${this.size}px;
      height: ${this.size}px;
      left: ${this.position.x}px;
      top: ${this.position.y}px;
      pointer-events: none;
      z-index: 9999; /* Increased z-index to ensure visibility */
      transition: transform 0.1s ease-out;
      display: block !important; /* Force display */
    `;

        // Create the core body
        const body = document.createElement('div');
        body.className = `organism-body shape-${this.shape}`;
        body.style.cssText = `
      width: 100%;
      height: 100%;
      background: radial-gradient(circle at 30% 30%, ${this.adjustColorBrightness(this.color, 30)}, ${this.color});
      border-radius: ${this.getShapeBorderRadius()};
      box-shadow: 0 0 ${20 * this.glowIntensity}px ${this.color}, 
                  inset 0 0 ${10 * this.glowIntensity}px rgba(255,255,255,0.3);
      animation: ${this.pulsate ? 'organismPulsate' : 'none'} ${2 + Math.random() * 2}s ease-in-out infinite;
      position: relative;
    `;

        // Add eye(s)
        const eyeCount = Math.random() > 0.5 ? 2 : 1;
        for (let i = 0; i < eyeCount; i++) {
            const eye = this.createEye(i, eyeCount);
            body.appendChild(eye);
        }

        // Add tentacles
        for (let i = 0; i < this.tentacles; i++) {
            const tentacle = this.createTentacle(i);
            body.appendChild(tentacle);
        }

        this.element.appendChild(body);

        // Append to container if exists, otherwise body
        const container = document.getElementById('organism-container');
        if (container) {
            container.appendChild(this.element);
        } else {
            document.body.appendChild(this.element);
        }

        // Add CSS animations if not already present
        this.ensureAnimations();

        console.log(`Spawned entity ${this.id} at ${this.position.x}, ${this.position.y}`);
    }

    getShapeBorderRadius() {
        switch (this.shape) {
            case 'blob': return '43% 57% 44% 56% / 55% 62% 38% 45%';
            case 'star': return '20% 80%';
            case 'diamond': return '10%';
            case 'hexagon': return '30%';
            case 'amoeba': return '63% 37% 54% 46% / 55% 48% 52% 45%';
            default: return '50%';
        }
    }

    createEye(index, total) {
        const eye = document.createElement('div');
        const eyeSize = this.size * 0.2;
        const xPos = total === 2 ? (index === 0 ? 30 : 70) : 50;

        eye.style.cssText = `
      position: absolute;
      width: ${eyeSize}px;
      height: ${eyeSize}px;
      background: radial-gradient(circle at 35% 35%, white, #f0f0f0 30%, #333 50%, black);
      border-radius: 50%;
      top: 35%;
      left: ${xPos}%;
      transform: translate(-50%, -50%);
      box-shadow: inset 0 0 5px rgba(0,0,0,0.5);
      animation: eyeBlink ${3 + Math.random() * 4}s ease-in-out infinite;
    `;

        // Add pupil
        const pupil = document.createElement('div');
        pupil.style.cssText = `
      position: absolute;
      width: 40%;
      height: 40%;
      background: black;
      border-radius: 50%;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      box-shadow: 0 0 3px rgba(255,255,255,0.5);
    `;
        eye.appendChild(pupil);

        return eye;
    }

    createTentacle(index) {
        const tentacle = document.createElement('div');
        const angle = (360 / this.tentacles) * index;
        const length = this.size * (0.5 + Math.random() * 0.8);
        const thickness = 3 + Math.random() * 5;

        tentacle.style.cssText = `
      position: absolute;
      width: ${thickness}px;
      height: ${length}px;
      background: linear-gradient(to bottom, ${this.color}, transparent);
      top: 50%;
      left: 50%;
      transform-origin: top center;
      transform: translate(-50%, 0) rotate(${angle}deg);
      border-radius: 50%;
      opacity: 0.7;
      animation: tentacleWave ${1 + Math.random() * 2}s ease-in-out infinite;
      animation-delay: ${index * 0.1}s;
    `;

        return tentacle;
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

    ensureAnimations() {
        const styleId = 'organism-animations';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = `
        @keyframes organismPulsate {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }

        @keyframes tentacleWave {
          0%, 100% { transform: translate(-50%, 0) rotate(var(--base-rotation, 0deg)) skewX(0deg); }
          25% { transform: translate(-50%, 0) rotate(var(--base-rotation, 0deg)) skewX(10deg); }
          75% { transform: translate(-50%, 0) rotate(var(--base-rotation, 0deg)) skewX(-10deg); }
        }

        @keyframes eyeBlink {
          0%, 90%, 100% { transform: translate(-50%, -50%) scaleY(1); }
          95% { transform: translate(-50%, -50%) scaleY(0.1); }
        }
      `;
            document.head.appendChild(style);
        }
    }

    update() {
        if (!this.alive) return;

        // Update position
        this.position.x += this.velocity.x * this.speed;
        this.position.y += this.velocity.y * this.speed;

        // Bounce off edges
        if (this.position.x <= 0 || this.position.x >= window.innerWidth - this.size) {
            this.velocity.x *= -1;
            this.position.x = Math.max(0, Math.min(window.innerWidth - this.size, this.position.x));
        }
        if (this.position.y <= 0 || this.position.y >= window.innerHeight - this.size) {
            this.velocity.y *= -1;
            this.position.y = Math.max(0, Math.min(window.innerHeight - this.size, this.position.y));
        }

        // Update rotation
        this.rotation += this.rotationSpeed;

        // Apply transformations
        if (this.element) {
            this.element.style.left = `${this.position.x}px`;
            this.element.style.top = `${this.position.y}px`;
            this.element.style.transform = `rotate(${this.rotation}deg)`;
        }
    }

    destroy() {
        this.alive = false;
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }
}

// Entity Manager - Manages multiple organisms
class EntityManager {
    constructor() {
        this.entities = [];
        this.animationFrame = null;
        this.running = false;
    }

    spawn(config) {
        const entity = new ProceduralEntity(config);
        this.entities.push(entity);
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

        this.entities.forEach(entity => entity.update());
        this.animationFrame = requestAnimationFrame(() => this.animate());
    }

    clear() {
        this.entities.forEach(entity => entity.destroy());
        this.entities = [];
    }

    removeEntity(entity) {
        const index = this.entities.indexOf(entity);
        if (index > -1) {
            this.entities.splice(index, 1);
            entity.destroy();
        }
    }
}

// Auto-initialize if loaded in browser
if (typeof window !== 'undefined') {
    window.ProceduralEntity = ProceduralEntity;
    window.EntityManager = EntityManager;

    // Create global entity manager
    window.entityManager = new EntityManager();

    console.log('🦠 Entity.js loaded! Use entityManager.spawn() to create organisms.');
}
