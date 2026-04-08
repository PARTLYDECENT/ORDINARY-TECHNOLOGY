/**
 * ParticleEffects.js
 * 
 * Bridges the request for BobBoss character effects to the existing 
 * high-performance Three.js particle system in index.html.
 */

export const ParticleEffects = {
    // Standard Blood Splatter (Red/Dark Red)
    blood: function(pos) {
        if (typeof window.emitParticle !== 'function') return;
        const count = 12 + Math.floor(Math.random() * 8);
        for (let i = 0; i < count; i++) {
            window.emitParticle(
                pos.x, pos.y + 0.8, pos.z,
                (Math.random() - 0.5) * 5.0, 
                Math.random() * 6.0, 
                (Math.random() - 0.5) * 5.0,
                0.4 + Math.random() * 0.2, 0.05, 0.02, // Deep Red
                0.6 + Math.random() * 1.0, 
                0.6 + Math.random() * 0.4
            );
        }
    },

    // Fiery Explosion (Orange/Yellow/White)
    explosion: function(pos, scale = 1.0) {
        if (typeof window.emitParticle !== 'function') return;
        const count = 30 * scale;
        for (let i = 0; i < count; i++) {
            const r = Math.random();
            const col = r > 0.8 ? [1,1,1] : (r > 0.4 ? [1, 0.8, 0.2] : [1, 0.4, 0.1]);
            window.emitParticle(
                pos.x, pos.y, pos.z,
                (Math.random() - 0.5) * 12.0 * scale,
                (Math.random() - 0.5) * 12.0 * scale,
                (Math.random() - 0.5) * 12.0 * scale,
                col[0], col[1], col[2],
                1.5 * scale + Math.random() * scale,
                0.8 + Math.random() * 0.5
            );
        }
    },

    // Lingering Fire / Flame (Orange/Red)
    fire: function(pos) {
        if (typeof window.emitParticle !== 'function') return;
        const count = 5;
        for (let i = 0; i < count; i++) {
            window.emitParticle(
                pos.x + (Math.random() - 0.5) * 0.5, 
                pos.y + 0.2, 
                pos.z + (Math.random() - 0.5) * 0.5,
                (Math.random() - 0.5) * 1.0, 
                2.0 + Math.random() * 3.0, 
                (Math.random() - 0.5) * 1.0,
                1.0, 0.5 + Math.random() * 0.3, 0.1, // Orange/Amber
                1.2 + Math.random() * 0.8, 
                1.0 + Math.random() * 1.2
            );
        }
    },

    // Toxic/Viral Splatter (Green)
    viral: function(pos) {
        if (typeof window.emitParticle !== 'function') return;
        const count = 10;
        for (let i = 0; i < count; i++) {
            window.emitParticle(
                pos.x, pos.y + 0.8, pos.z,
                (Math.random() - 0.5) * 4.0, 
                Math.random() * 5.0, 
                (Math.random() - 0.5) * 4.0,
                0.2, 0.9, 0.1, // Sickly Green
                0.8 + Math.random() * 0.8, 
                0.7 + Math.random() * 0.5
            );
        }
    }
};

// Global attachment to satisfy ported logic's window.game.particleEffects
if (typeof window !== 'undefined') {
    if (!window.game) window.game = {};
    window.game.particleEffects = ParticleEffects;
}
