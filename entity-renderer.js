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
     * Clear the visual canvas without removing entities
     */
    clearCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
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

        // Apply phasing transparency
        if (entity.phasing && entity.phasing.active) {
            ctx.globalAlpha = entity.phasing.opacity;
        }

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

        // === EXOTIC EFFECTS (rendered in world space) ===
        ctx.save();
        ctx.translate(pos.x, pos.y);

        // Energy field
        if (entity.energyField && entity.energyField.enabled) {
            this.renderEnergyField(ctx, entity);
        }

        // Holographic projection
        if (entity.holographic) {
            this.renderHolographic(ctx, entity);
        }

        // Particle trail
        if (entity.trail && entity.trail.length > 0) {
            this.renderTrail(ctx, entity);
        }

        // Ability effects
        if (entity.teleportEffect && entity.teleportEffect.active) {
            this.renderTeleportEffect(ctx, entity);
        }

        if (entity.burstEffect && entity.burstEffect.active) {
            this.renderBurstEffect(ctx, entity);
        }

        if (entity.mergeEffect && entity.mergeEffect.active) {
            this.renderMergeEffect(ctx, entity);
        }

        // Phasing transparency
        if (entity.phasing && entity.phasing.active) {
            // Already handled via globalAlpha in main render
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

    /**
     * Render particle trail showing movement history
     */
    renderTrail(ctx, entity) {
        if (!entity.trail || entity.trail.length < 2) return;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        const now = Date.now();
        const maxAge = 2000; // Trail fades over 2 seconds

        for (let i = 0; i < entity.trail.length - 1; i++) {
            const point = entity.trail[i];
            const nextPoint = entity.trail[i + 1];
            const age = now - point.time;
            const alpha = Math.max(0, 1 - age / maxAge);
            const progress = i / entity.trail.length;

            ctx.strokeStyle = entity.color.replace(')', `, ${alpha * 0.3})`).replace('hsl', 'hsla');
            ctx.lineWidth = entity.size * 0.1 * (1 - progress);
            ctx.lineCap = 'round';

            ctx.beginPath();
            ctx.moveTo(point.x - entity.position.x, point.y - entity.position.y);
            ctx.lineTo(nextPoint.x - entity.position.x, nextPoint.y - entity.position.y);
            ctx.stroke();
        }

        ctx.restore();
    }

    /**
     * Render energy field around entity
     */
    renderEnergyField(ctx, entity) {
        const field = entity.energyField;
        const pulse = Math.sin(this.time * 3) * 0.3 + 0.7;
        const radius = field.radius * pulse;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        // Outer glow
        const gradient = ctx.createRadialGradient(0, 0, radius * 0.5, 0, 0, radius);
        gradient.addColorStop(0, field.color.replace(')', ', 0)').replace('hsl', 'hsla'));
        gradient.addColorStop(0.7, field.color.replace(')', `, ${field.intensity * 0.2})`).replace('hsl', 'hsla'));
        gradient.addColorStop(1, field.color.replace(')', ', 0)').replace('hsl', 'hsla'));

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fill();

        // Energy rings
        const ringCount = 3;
        for (let i = 0; i < ringCount; i++) {
            const ringPhase = (this.time * 2 + i * Math.PI * 2 / ringCount) % (Math.PI * 2);
            const ringRadius = radius * 0.6 + Math.sin(ringPhase) * radius * 0.2;
            const ringAlpha = (Math.sin(ringPhase) + 1) * 0.5 * field.intensity * 0.3;

            ctx.strokeStyle = field.color.replace(')', `, ${ringAlpha})`).replace('hsl', 'hsla');
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.restore();
    }

    /**
     * Render holographic projection effect
     */
    renderHolographic(ctx, entity) {
        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.globalCompositeOperation = 'lighter';

        // Multiple offset copies for holographic effect
        const offsets = [
            { x: 10, y: 10, color: 'rgba(255, 0, 0, 0.2)' },
            { x: -10, y: -10, color: 'rgba(0, 255, 0, 0.2)' },
            { x: 10, y: -10, color: 'rgba(0, 0, 255, 0.2)' }
        ];

        offsets.forEach(offset => {
            ctx.save();
            ctx.translate(offset.x, offset.y);
            ctx.fillStyle = offset.color;

            entity.particles.forEach(particle => {
                ctx.beginPath();
                ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
                ctx.fill();
            });

            ctx.restore();
        });

        // Scanlines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        for (let y = -entity.size; y < entity.size; y += 4) {
            ctx.beginPath();
            ctx.moveTo(-entity.size, y);
            ctx.lineTo(entity.size, y);
            ctx.stroke();
        }

        ctx.restore();
    }

    /**
     * Render teleportation effect
     */
    renderTeleportEffect(ctx, entity) {
        const effect = entity.teleportEffect;
        const elapsed = Date.now() - effect.startTime;
        const progress = elapsed / effect.duration;

        if (progress > 1) return;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        // Portal at departure point
        if (entity.teleportFrom && progress < 0.5) {
            const portalAlpha = 1 - progress * 2;
            const portalRadius = entity.size * (1 + progress * 2);

            const fromGradient = ctx.createRadialGradient(
                entity.teleportFrom.x - entity.position.x,
                entity.teleportFrom.y - entity.position.y,
                0,
                entity.teleportFrom.x - entity.position.x,
                entity.teleportFrom.y - entity.position.y,
                portalRadius
            );
            fromGradient.addColorStop(0, entity.color.replace(')', `, ${portalAlpha})`).replace('hsl', 'hsla'));
            fromGradient.addColorStop(1, entity.color.replace(')', ', 0)').replace('hsl', 'hsla'));

            ctx.fillStyle = fromGradient;
            ctx.beginPath();
            ctx.arc(
                entity.teleportFrom.x - entity.position.x,
                entity.teleportFrom.y - entity.position.y,
                portalRadius,
                0,
                Math.PI * 2
            );
            ctx.fill();
        }

        // Portal at arrival point
        if (progress > 0.5) {
            const portalAlpha = (1 - progress) * 2;
            const portalRadius = entity.size * (2 - progress);

            const toGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, portalRadius);
            toGradient.addColorStop(0, entity.color.replace(')', `, ${portalAlpha})`).replace('hsl', 'hsla'));
            toGradient.addColorStop(1, entity.color.replace(')', ', 0)').replace('hsl', 'hsla'));

            ctx.fillStyle = toGradient;
            ctx.beginPath();
            ctx.arc(0, 0, portalRadius, 0, Math.PI * 2);
            ctx.fill();
        }

        // Lightning particles
        const particleCount = 20;
        for (let i = 0; i < particleCount; i++) {
            const angle = (i / particleCount) * Math.PI * 2 + this.time * 5;
            const distance = entity.size * (0.5 + Math.random() * 1.5);
            const x = Math.cos(angle) * distance;
            const y = Math.sin(angle) * distance;

            ctx.fillStyle = entity.color.replace(')', `, ${(1 - progress) * 0.8})`).replace('hsl', 'hsla');
            ctx.beginPath();
            ctx.arc(x, y, 2, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    /**
     * Render energy burst shockwave
     */
    renderBurstEffect(ctx, entity) {
        const effect = entity.burstEffect;
        const elapsed = Date.now() - effect.startTime;
        const progress = elapsed / effect.duration;

        if (progress > 1) return;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        const currentRadius = effect.radius * progress;
        const alpha = 1 - progress;

        // Shockwave ring
        const gradient = ctx.createRadialGradient(0, 0, currentRadius - 20, 0, 0, currentRadius);
        gradient.addColorStop(0, entity.color.replace(')', ', 0)').replace('hsl', 'hsla'));
        gradient.addColorStop(0.5, entity.color.replace(')', `, ${alpha * 0.6})`).replace('hsl', 'hsla'));
        gradient.addColorStop(1, entity.color.replace(')', ', 0)').replace('hsl', 'hsla'));

        ctx.strokeStyle = entity.color.replace(')', `, ${alpha})`).replace('hsl', 'hsla');
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, currentRadius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, currentRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    /**
     * Render merge absorption effect
     */
    renderMergeEffect(ctx, entity) {
        const effect = entity.mergeEffect;
        const elapsed = Date.now() - effect.startTime;
        const progress = elapsed / effect.duration;

        if (progress > 1) return;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        // Swirling particles
        const particleCount = 30;
        for (let i = 0; i < particleCount; i++) {
            const angle = (i / particleCount) * Math.PI * 2 + this.time * 3;
            const distance = entity.size * (1.5 - progress * 1.5) * (1 + Math.sin(this.time * 5 + i) * 0.2);
            const x = Math.cos(angle) * distance;
            const y = Math.sin(angle) * distance;
            const size = 3 * (1 - progress);

            ctx.fillStyle = effect.absorbedColor.replace(')', `, ${1 - progress})`).replace('hsl', 'hsla');
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }
}

// Export
if (typeof window !== 'undefined') {
    window.EntityRenderer = EntityRenderer;
    console.log('🖼️ EntityRenderer loaded!');
}
