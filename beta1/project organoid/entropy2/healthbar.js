import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';

/**
 * SDF Fluid Health Bar — integrated into the Genesis Kernel.
 * 
 * Provides:
 *   - GLSL shader fragments for rendering
 *   - JS-side drop physics simulation
 *   - takeDamage() / heal() API
 */

const MAX_DROPS = 40;

// ─── Drop Particle ───
class Drop {
    constructor() {
        this.active = false;
        this.x = 0; this.y = 0;
        this.vx = 0; this.vy = 0;
        this.size = 0;
        this.colorT = 0; // 0 = green, 1 = red
    }
}

export class HealthBar {
    constructor() {
        this.targetHealth = 1.0;
        this.visualHealth = 1.0;
        this.drops = Array.from({ length: MAX_DROPS }, () => new Drop());

        // Flat typed arrays for GPU uniforms
        this.dropData = new Float32Array(MAX_DROPS * 3);
        // Regular JS array for float uniforms (THREE r128 compatibility)
        this.dropColorsArray = new Array(MAX_DROPS).fill(0.0);

        // Convert to THREE uniform-compatible arrays
        this.dropVec3Array = [];
        for (let i = 0; i < MAX_DROPS; i++) {
            this.dropVec3Array.push(new THREE.Vector3());
        }
    }

    getUniforms() {
        return {
            u_health: { value: 1.0 },
            u_hbDrops: { value: this.dropVec3Array },
            u_hbDropColors: { value: this.dropColorsArray }
        };
    }

    takeDamage(amount) {
        if (this.targetHealth <= 0) return;

        const oldHealth = this.targetHealth;
        this.targetHealth = Math.max(0, this.targetHealth - amount);

        // Calculate where the chunk was on the bar
        const barMaxWidth = 0.35;
        const oldRightEdge = -barMaxWidth + (oldHealth * barMaxWidth * 2.0);
        const newRightEdge = -barMaxWidth + (this.targetHealth * barMaxWidth * 2.0);

        // Spawn fluid drops in the vacated space
        const numDrops = Math.min(MAX_DROPS, Math.floor(amount * 120));
        for (let i = 0; i < numDrops; i++) {
            const d = this.drops.find(d => !d.active);
            if (!d) break;

            d.active = true;
            const t = Math.random();
            d.x = newRightEdge + t * (oldRightEdge - newRightEdge);
            d.y = 0.38 + (Math.random() - 0.5) * 0.03; // Near bar vertical center
            d.vx = (Math.random() - 0.5) * 0.006;
            d.vy = Math.random() * 0.01;
            d.size = Math.random() * 0.015 + 0.01;
            d.colorT = 0.0;
        }
    }

    heal(amount) {
        this.targetHealth = Math.min(1.0, this.targetHealth + amount);
    }

    update(delta) {
        // Smooth bar animation
        this.visualHealth += (this.targetHealth - this.visualHealth) * 0.12;

        // Physics for drops
        for (let i = 0; i < MAX_DROPS; i++) {
            const d = this.drops[i];
            if (d.active) {
                d.vy -= 0.0005; // Gravity
                d.x += d.vx;
                d.y += d.vy;

                // Transition green → red as drops fall
                d.colorT = Math.min(1.0, Math.max(0.0, (d.y - 0.38 + 0.03) / -0.2));

                // Kill offscreen drops
                if (d.y < -1.0) d.active = false;
            }
        }

        // Pack into uniform arrays
        for (let i = 0; i < MAX_DROPS; i++) {
            if (this.drops[i].active) {
                this.dropVec3Array[i].set(
                    this.drops[i].x,
                    this.drops[i].y,
                    this.drops[i].size
                );
                this.dropColorsArray[i] = this.drops[i].colorT;
            } else {
                this.dropVec3Array[i].set(0, 0, 0);
                this.dropColorsArray[i] = 0.0;
            }
        }
    }

    getHealth() { return this.targetHealth; }
    getVisualHealth() { return this.visualHealth; }
}

// ─── SHADER FRAGMENTS ───

export const HEALTHBAR_SHADER = {
    uniforms: `
        uniform float u_health;
        uniform vec3 u_hbDrops[${MAX_DROPS}];
        uniform float u_hbDropColors[${MAX_DROPS}];
    `,

    // Composite function called in main() after tone mapping
    composite: `
        vec3 compositeHealthBar(vec2 uv, vec3 sceneColor) {
            // Health bar dimensions — top of screen, centered
            float barMaxWidth = 0.35;
            float barHeight = 0.025;
            vec2 barCenter = vec2(0.0, 0.38); // near top of screen

            float currentWidth = barMaxWidth * u_health;
            float leftEdge = -barMaxWidth;
            float centerX = leftEdge + currentWidth;
            vec2 barPos = vec2(centerX, barCenter.y);

            // SDF: background track
            vec2 trackD = abs(uv - barCenter) - vec2(barMaxWidth, barHeight);
            float dTrack = length(max(trackD, 0.0)) + min(max(trackD.x, trackD.y), 0.0) - 0.015;

            // SDF: active health fill
            vec2 barD = abs(uv - barPos) - vec2(currentWidth, barHeight);
            float dBar = length(max(barD, 0.0)) + min(max(barD.x, barD.y), 0.0) - 0.015;

            // Fluid color with pulse
            float pulse = sin(u_time * 4.0) * 0.5 + 0.5;
            vec3 colBar = vec3(0.1, 0.85 + pulse * 0.1, 0.2);

            // Low health warning: shift to orange/red
            float healthWarn = smoothstep(0.35, 0.15, u_health);
            colBar = mix(colBar, vec3(1.0, 0.3, 0.05), healthWarn);

            // Critical flash
            float critFlash = step(u_health, 0.2) * (sin(u_time * 8.0) * 0.5 + 0.5);
            colBar = mix(colBar, vec3(1.0, 0.0, 0.0), critFlash * 0.4);

            vec4 finalFluid = vec4(dBar, colBar);

            // Blend fluid drops
            for(int i = 0; i < ${MAX_DROPS}; i++) {
                if(u_hbDrops[i].z > 0.0) {
                    float dDrop = length(uv - u_hbDrops[i].xy) - u_hbDrops[i].z;
                    vec3 bloodCol = vec3(0.9, 0.05, 0.1);
                    vec3 dropCol = mix(colBar, bloodCol, u_hbDropColors[i]);

                    // Smooth union (viscous fluid)
                    float h = clamp(0.5 + 0.5 * (dDrop - finalFluid.x) / 0.06, 0.0, 1.0);
                    float mixDist = mix(dDrop, finalFluid.x, h) - 0.06 * h * (1.0 - h);
                    vec3 mixCol = mix(dropCol, finalFluid.yzw, h);
                    finalFluid = vec4(mixDist, mixCol);
                }
            }

            // ─── RENDER ───
            vec3 result = sceneColor;

            // Background track
            float trackAlpha = smoothstep(0.003, 0.0, dTrack);
            float trackBorder = smoothstep(0.0, -0.004, dTrack) - smoothstep(-0.004, -0.012, dTrack);
            vec3 trackRender = mix(vec3(0.06, 0.06, 0.07), vec3(0.12, 0.12, 0.16), trackBorder);
            result = mix(result, trackRender, trackAlpha * 0.85);

            // Fluid
            float dFluid = finalFluid.x;
            vec3 fluidCol = finalFluid.yzw;

            float fluidAlpha = smoothstep(0.002, -0.002, dFluid);

            // Bevel / inner shadow
            float innerShadow = smoothstep(-0.04, 0.0, dFluid);
            fluidCol *= mix(0.5, 1.1, 1.0 - innerShadow);

            // Specular highlight (top edge)
            float highlight = smoothstep(-0.004, -0.012, dFluid) - smoothstep(-0.012, -0.02, dFluid);
            highlight *= smoothstep(-0.015, 0.04, uv.y - barCenter.y + barHeight);
            fluidCol += highlight * vec3(0.3, 0.5, 0.3);

            result = mix(result, fluidCol, fluidAlpha);

            // Subtle glow
            float glow = exp(-max(dFluid, 0.0) * 40.0) * 0.1;
            result += finalFluid.yzw * glow;

            return result;
        }
    `
};
