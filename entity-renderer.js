/**
 * ENTITY-RENDERER.JS
 * Canvas-based metaball rendering system for organic entities
 * Provides high-performance visual rendering with soft-body appearance
 */

class EntityRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.entities = new Map(); // id -> entity
        this.time = 0;

        // Performance settings
        this.renderDistance = 2000; // Cull entities beyond this distance
        this.enableLOD = true; // Level of Detail optimization
        this.enableGlow = true;

        // Offscreen canvas for complex effects
        this.offscreenCanvas = document.createElement('canvas');
        this.offscreenCtx = this.offscreenCanvas.getContext('2d');

        this.resize();
        window.addEventListener('resize', () => this.resize());

        console.log('🎨 EntityRenderer initialized');
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.offscreenCanvas.width = window.innerWidth;
        this.offscreenCanvas.height = window.innerHeight;
    }

    addEntity(entity) {
        this.entities.set(entity.id, entity);
    }

    removeEntity(id) {
        this.entities.delete(id);
    }

    clear() {
        this.entities.clear();
    }

    /**
     * Main render loop - draws all entities
     */
    render() {
        this.time += 0.016; // Approximate 60fps

        // Debug log every ~100 frames
        if (Math.floor(this.time * 60) % 100 === 0) {
            console.log(`🎨 EntityRenderer: Rendering ${this.entities.size} entities`);
        }

        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Sort entities by depth (optional: for proper layering)
        const entitiesArray = Array.from(this.entities.values());
        entitiesArray.sort((a, b) => a.size - b.size); // Render smaller ones last (on top)

        // Render each entity
        entitiesArray.forEach(entity => {
            if (this.shouldRender(entity)) {
                this.renderEntity(entity);
            }
        });
    }

    /**
     * Check if entity should be rendered (culling)
     */
    shouldRender(entity) {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const dx = entity.position.x - centerX;
        const dy = entity.position.y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        return distance < this.renderDistance;
    }

    /**
     * Render a single entity using metaball technique
     */
    renderEntity(entity) {
        const ctx = this.ctx;
        const pos = entity.position;

        // Level of Detail: reduce quality for distant entities
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const dx = pos.x - centerX;
        const dy = pos.y - centerY;
        const distanceFromCenter = Math.sqrt(dx * dx + dy * dy);
        const isDistant = this.enableLOD && distanceFromCenter > 500;

        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.rotate(entity.rotation * Math.PI / 180);

        // Apply breathing scale
        const breatheScale = entity.currentScale || 1;
        ctx.scale(breatheScale, breatheScale);

        // === METABALL RENDERING ===
        // Draw particles that will be "blobbed" together
        this.renderMetaballBody(ctx, entity, isDistant);

        // === DETAIL LAYER ===
        if (!isDistant) {
            // Render eyes on top
            this.renderEyes(ctx, entity);

            // Render patterns/textures
            if (entity.skinPattern && entity.skinPattern !== 'none') {
                this.renderPattern(ctx, entity);
            }

            // Render bioluminescent spots
            if (entity.bioluminescentSpots && entity.bioluminescentSpots.length > 0) {
                this.renderBioluminescence(ctx, entity);
            }
        }

        ctx.restore();
    }

    /**
     * Render entity body using metaball technique
     */
    renderMetaballBody(ctx, entity, isDistant) {
        const size = entity.size;
        const particleCount = isDistant ? 6 : entity.particles.length;
        const blurAmount = isDistant ? 8 : 15;

        // Use offscreen canvas for blur/contrast effect
        const offCtx = this.offscreenCtx;
        offCtx.clearRect(-size * 2, -size * 2, size * 4, size * 4);

        offCtx.save();
        offCtx.translate(size * 2, size * 2);

        // Draw particles as black circles on white background
        entity.particles.slice(0, particleCount).forEach(particle => {
            offCtx.fillStyle = 'black';
            offCtx.beginPath();
            offCtx.arc(
                particle.x,
                particle.y,
                particle.radius,
                0,
                Math.PI * 2
            );
            offCtx.fill();
        });

        offCtx.restore();

        // Apply blur and contrast filter to create metaball effect
        ctx.save();
        ctx.filter = `blur(${blurAmount}px) contrast(20)`;

        // Draw the processed image
        ctx.drawImage(
            this.offscreenCanvas,
            0, 0, size * 4, size * 4,
            -size * 2, -size * 2, size * 4, size * 4
        );

        ctx.filter = 'none';
        ctx.restore();

        // Colorize the metaball shape using composite operation
        ctx.save();
        ctx.globalCompositeOperation = 'source-atop';

        // Gradient for depth
        const gradient = ctx.createRadialGradient(
            -size * 0.3, -size * 0.3, 0,
            0, 0, size
        );

        const baseColor = entity.color;
        const brightColor = this.adjustColorBrightness(baseColor, 20);
        const darkColor = this.adjustColorBrightness(baseColor, -10);

        gradient.addColorStop(0, brightColor);
        gradient.addColorStop(0.6, baseColor);
        gradient.addColorStop(1, darkColor);

        ctx.fillStyle = gradient;
        ctx.fillRect(-size * 2, -size * 2, size * 4, size * 4);

        ctx.restore();

        // Add glow effect
        if (this.enableGlow && entity.glowIntensity > 0) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.shadowBlur = 20 * entity.glowIntensity;
            ctx.shadowColor = entity.color;

            ctx.fillStyle = entity.color;
            ctx.globalAlpha = 0.3 * entity.glowIntensity;

            entity.particles.slice(0, particleCount).forEach(particle => {
                ctx.beginPath();
                ctx.arc(particle.x, particle.y, particle.radius * 0.8, 0, Math.PI * 2);
                ctx.fill();
            });

            ctx.restore();
        }
    }

    /**
     * Render eyes with glossy appearance
     */
    renderEyes(ctx, entity) {
        if (!entity.eyes || entity.eyes.length === 0) return;

        entity.eyes.forEach(eye => {
            // Eye white
            ctx.fillStyle = 'white';
            ctx.beginPath();
            ctx.arc(eye.x, eye.y, eye.radius, 0, Math.PI * 2);
            ctx.fill();

            // Iris
            const irisGradient = ctx.createRadialGradient(
                eye.x, eye.y, 0,
                eye.x, eye.y, eye.radius * 0.7
            );
            irisGradient.addColorStop(0, '#4a90e2');
            irisGradient.addColorStop(0.5, '#2c5aa0');
            irisGradient.addColorStop(1, '#1a3a6b');

            ctx.fillStyle = irisGradient;
            ctx.beginPath();
            ctx.arc(eye.x, eye.y, eye.radius * 0.7, 0, Math.PI * 2);
            ctx.fill();

            // Pupil
            ctx.fillStyle = 'black';
            ctx.beginPath();
            ctx.arc(eye.x, eye.y, eye.radius * 0.35, 0, Math.PI * 2);
            ctx.fill();

            // Glossy highlight
            const highlight = ctx.createRadialGradient(
                eye.x - eye.radius * 0.3,
                eye.y - eye.radius * 0.3,
                0,
                eye.x - eye.radius * 0.2,
                eye.y - eye.radius * 0.2,
                eye.radius * 0.4
            );
            highlight.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
            highlight.addColorStop(1, 'rgba(255, 255, 255, 0)');

            ctx.fillStyle = highlight;
            ctx.beginPath();
            ctx.arc(eye.x - eye.radius * 0.25, eye.y - eye.radius * 0.25, eye.radius * 0.4, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    /**
     * Render procedural pattern overlay
     */
    renderPattern(ctx, entity) {
        if (!entity.patternFunction) return;

        const size = entity.size;
        const pattern = entity.patternFunction;

        ctx.save();
        ctx.globalAlpha = 0.3;

        // Sample pattern at key points and draw
        const resolution = 20; // Pattern sampling resolution
        for (let i = -size; i < size; i += resolution) {
            for (let j = -size; j < size; j += resolution) {
                const alpha = pattern(i + size, j + size);
                if (alpha > 0.3) {
                    ctx.fillStyle = `rgba(0, 0, 0, ${alpha * 0.5})`;
                    ctx.fillRect(i, j, resolution, resolution);
                }
            }
        }

        ctx.restore();
    }

    /**
     * Render bioluminescent glowing spots
     */
    renderBioluminescence(ctx, entity) {
        const spots = entity.bioluminescentSpots;

        spots.forEach((spot, index) => {
            // Animate pulsing
            const pulse = Math.sin(this.time * 2 + spot.phase) * 0.3 + 0.7;
            const radius = spot.radius * pulse;
            const intensity = spot.intensity * pulse;

            // Glow
            const glow = ctx.createRadialGradient(
                spot.x, spot.y, 0,
                spot.x, spot.y, radius * 3
            );

            const glowColor = this.adjustColorBrightness(entity.color, 30);
            glow.addColorStop(0, glowColor);
            glow.addColorStop(0.5, `${entity.color.replace(')', `, ${intensity * 0.5})`).replace('hsl', 'hsla')}`);
            glow.addColorStop(1, `${entity.color.replace(')', ', 0)').replace('hsl', 'hsla')}`);

            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(spot.x, spot.y, radius * 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });
    }

    /**
     * Utility: Adjust color brightness
     */
    adjustColorBrightness(color, percent) {
        if (color.startsWith('hsl')) {
            const match = color.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
            if (match) {
                const h = match[1];
                const s = match[2];
                const l = Math.max(0, Math.min(100, parseInt(match[3]) + percent));
                return `hsl(${h}, ${s}%, ${l}%)`;
            }
        }
        return color;
    }
}

// Export
if (typeof window !== 'undefined') {
    window.EntityRenderer = EntityRenderer;
    console.log('🖼️ EntityRenderer loaded!');
}
