/**
 * PROCEDURAL-TEXTURES.JS
 * Lightweight procedural texture generation for organic entities
 * Provides noise-based patterns without external dependencies
 */

class ProceduralTextures {
    /**
     * Simplex-like 2D noise function (simplified Perlin noise)
     * Returns value between -1 and 1
     */
    static noise2D(x, y, seed = 0) {
        // Simple hash-based pseudo-random noise
        const hash = (x, y) => {
            let n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
            return n - Math.floor(n);
        };

        // Grid coordinates
        const xi = Math.floor(x);
        const yi = Math.floor(y);

        // Interpolation weights
        const xf = x - xi;
        const yf = y - yi;

        // Smooth interpolation (cosine)
        const u = xf * xf * (3.0 - 2.0 * xf);
        const v = yf * yf * (3.0 - 2.0 * yf);

        // Hash corners
        const a = hash(xi, yi);
        const b = hash(xi + 1, yi);
        const c = hash(xi, yi + 1);
        const d = hash(xi + 1, yi + 1);

        // Bilinear interpolation
        return (a * (1 - u) + b * u) * (1 - v) +
            (c * (1 - u) + d * u) * v;
    }

    /**
     * Fractional Brownian Motion - layered noise for organic detail
     */
    static fbm(x, y, octaves = 4, seed = 0) {
        let value = 0;
        let amplitude = 1;
        let frequency = 1;
        let maxValue = 0;

        for (let i = 0; i < octaves; i++) {
            value += this.noise2D(x * frequency, y * frequency, seed + i) * amplitude;
            maxValue += amplitude;
            amplitude *= 0.5;
            frequency *= 2;
        }

        return value / maxValue;
    }

    /**
     * Generate leopard-like spots pattern
     * @param {number} size - Pattern size
     * @param {number} density - Spot density (0-1)
     * @returns {Function} (x, y) => alpha value
     */
    static generateSpots(size, density = 0.3) {
        const seed = Math.random() * 1000;
        const scale = 5 / size;
        const threshold = 0.3 + (1 - density) * 0.4;

        return (x, y) => {
            const noise = this.fbm(x * scale, y * scale, 3, seed);
            // Create spots where noise exceeds threshold
            return noise > threshold ? 1 - ((noise - threshold) / (1 - threshold)) : 0;
        };
    }

    /**
     * Generate zebra-like stripes pattern
     * @param {number} size - Pattern size
     * @param {number} frequency - Stripe frequency
     * @returns {Function} (x, y) => alpha value
     */
    static generateStripes(size, frequency = 5) {
        const seed = Math.random() * 1000;
        const scale = frequency / size;

        return (x, y) => {
            // Base stripes with noise distortion
            const distortion = this.noise2D(x * 0.01, y * 0.01, seed) * 10;
            const stripe = Math.sin((x + distortion) * scale);

            // Add noise for organic variation
            const noise = this.fbm(x * 0.02, y * 0.02, 2, seed + 1);

            return (stripe + noise * 0.3 + 1) * 0.5;
        };
    }

    /**
     * Generate cellular/voronoi-like patterns
     * @param {number} size - Pattern size
     * @param {number} cellCount - Number of cell centers
     * @returns {Function} (x, y) => alpha value
     */
    static generateCells(size, cellCount = 8) {
        // Generate random cell centers
        const cells = [];
        for (let i = 0; i < cellCount; i++) {
            cells.push({
                x: Math.random() * size,
                y: Math.random() * size
            });
        }

        return (x, y) => {
            // Find distance to nearest cell
            let minDist = Infinity;
            let secondMinDist = Infinity;

            cells.forEach(cell => {
                const dx = x - cell.x;
                const dy = y - cell.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < minDist) {
                    secondMinDist = minDist;
                    minDist = dist;
                } else if (dist < secondMinDist) {
                    secondMinDist = dist;
                }
            });

            // Cell edge intensity
            const edge = (secondMinDist - minDist) / size;
            return Math.min(1, edge * 5);
        };
    }

    /**
     * Generate vein/crack patterns
     * @param {number} size - Pattern size
     * @param {number} complexity - Vein complexity (1-5)
     * @returns {Function} (x, y) => alpha value
     */
    static generateVeins(size, complexity = 3) {
        const seed = Math.random() * 1000;
        const scale = 3 / size;

        return (x, y) => {
            // Use noise derivatives to create vein-like structures
            const noise1 = this.fbm(x * scale, y * scale, complexity, seed);
            const noise2 = this.fbm(x * scale * 1.5, y * scale * 1.5, complexity, seed + 10);

            // Ridged multifractal effect
            const ridge1 = 1 - Math.abs(noise1);
            const ridge2 = 1 - Math.abs(noise2);

            return Math.pow(ridge1 * ridge2, 2);
        };
    }

    /**
     * Generate random pattern based on type
     * @param {string} type - Pattern type: 'spots', 'stripes', 'cells', 'veins', 'none'
     * @param {number} size - Pattern size
     * @returns {Function} (x, y) => alpha value
     */
    static getPattern(type, size) {
        switch (type) {
            case 'spots':
                return this.generateSpots(size, 0.2 + Math.random() * 0.3);
            case 'stripes':
                return this.generateStripes(size, 3 + Math.random() * 5);
            case 'cells':
                return this.generateCells(size, Math.floor(5 + Math.random() * 8));
            case 'veins':
                return this.generateVeins(size, 2 + Math.floor(Math.random() * 3));
            case 'none':
            default:
                return () => 0;
        }
    }

    /**
     * Generate bioluminescent spots (glowing points)
     * @param {number} count - Number of spots
     * @param {number} size - Entity size
     * @returns {Array} Array of {x, y, radius, intensity}
     */
    static generateBiolumSpots(count, size) {
        const spots = [];
        for (let i = 0; i < count; i++) {
            // Random position within circular bounds
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * size * 0.4;

            spots.push({
                x: Math.cos(angle) * distance,
                y: Math.sin(angle) * distance,
                radius: (2 + Math.random() * 5),
                intensity: 0.5 + Math.random() * 0.5,
                phase: Math.random() * Math.PI * 2 // For pulsing animation
            });
        }
        return spots;
    }
}

// Export for use
if (typeof window !== 'undefined') {
    window.ProceduralTextures = ProceduralTextures;
    console.log('🎨 ProceduralTextures loaded!');
}
