/**
 * Rules for the Genesis Kernel engine.
 * Contains SDF primitives, semantic state logic, and mapping functions.
 */

export const RULES = {
    // 2D Rotation
    rotation: `
        mat2 rot(float a) {
            float s = sin(a), c = cos(a);
            return mat2(c, -s, s, c);
        }
    `,

    // Primitive: Box
    sdBox: `
        float sdBox(vec3 p, vec3 b) {
            vec3 q = abs(p) - b;
            return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
        }
    `,

    // Primitive: Infinite Gyroid (Organic Math)
    sdGyroid: `
        float sdGyroid(vec3 p, float scale, float thickness, float bias) {
            p *= scale;
            float g = abs(dot(sin(p), cos(p.zxy))) - bias;
            return g / scale - thickness;
        }
    `,

    // Smooth Minimum for organic blending
    smin: `
        float smin(float a, float b, float k) {
            float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
            return mix(b, a, h) - k * h * (1.0 - h);
        }
    `,

    // STATE 0: Brutalist Industrial Iron
    stateIron: `
        float getIronState(vec3 p, vec3 gridP) {
            float pillars = sdBox(vec3(gridP.x, p.y, gridP.z), vec3(2.0, 100.0, 2.0));
            float hollow = sdBox(vec3(gridP.x, p.y, gridP.z), vec3(1.2, 101.0, 2.5));
            float hollow2 = sdBox(vec3(gridP.x, p.y, gridP.z), vec3(2.5, 101.0, 1.2));
            
            float structure = max(pillars, -min(hollow, hollow2));
            
            // Add mechanical horizontal rings
            float rings = max(abs(length(gridP.xz) - 2.5) - 0.2, abs(mod(p.y, 4.0) - 2.0) - 0.2);
            return min(structure, rings);
        }
    `,

    // STATE 1: The Splat Kernel (Disintegration into Point Cloud)
    stateSplat: `
        float getSplatState(vec3 p, float ironDist, float time) {
            // Quantize space into a 3D grid of "Splats"
            float splatRes = 4.0;
            vec3 qP = round(p * splatRes) / splatRes; 
            
            // Add chaotic swirling motion to the splats based on time
            vec3 jitter = sin(qP.yzx * 5.0 + time * 3.0) * 0.15;
            qP += jitter;

            // Create spheres at the quantized points
            float splats = length(p - qP) - 0.08;
            
            // MAGIC: Bound the splats so they ONLY exist where the Iron structure used to be!
            return max(ironDist + 0.5, splats); 
        }
    `,

    // STATE 2: Reclaimed Organic Flora
    stateFlora: `
        float getFloraState(vec3 p, vec3 gridP, float ironDist) {
            // Generate a twisting, infinite organic network
            float bioNetwork = sdGyroid(p, 1.5, 0.05, 1.2);
            bioNetwork = smin(bioNetwork, sdGyroid(p + vec3(1.0), 3.0, 0.02, 1.0), 0.2);
            
            // Bound the organic growth to the pillars, but let it bulge outwards
            float bounds = sdBox(vec3(gridP.x, p.y, gridP.z), vec3(3.5, 100.0, 3.5));
            
            // Combine bounding box, original iron, and the bio-network
            return max(bounds, smin(ironDist, bioNetwork, 0.8));
        }
    `,

    // GLOBAL MAPPING & THE GENESIS WAVE
    mapFunction: `
        vec2 map(vec3 p, float time) {
            // Grid repetition for infinite space
            vec3 gridP = p;
            gridP.xz = mod(gridP.xz + 12.0, 24.0) - 12.0;
            
            // Calculate the 3 fundamental states
            float dIron = getIronState(p, gridP);
            float dFlora = getFloraState(p, gridP, dIron);
            float dSplat = getSplatState(p, dIron, time);

            // THE WAVE DYNAMICS
            float waveZ = time * 12.0; 
            float distToWave = p.z - waveZ;

            float finalDist = 0.0;
            float matID = 0.0;

            // Semantic State Blending based on distance to the Genesis Wave
            if (distToWave > 15.0) {
                finalDist = dIron;
                matID = 0.0;
            } 
            else if (distToWave < -15.0) {
                finalDist = dFlora;
                matID = 2.0;
            } 
            else {
                float wIron = smoothstep(5.0, 15.0, distToWave);
                float wFlora = smoothstep(-5.0, -15.0, distToWave);
                float wSplat = 1.0 - smoothstep(0.0, 8.0, abs(distToWave)); 

                finalDist = mix(
                    mix(dSplat, dIron, smoothstep(0.0, 15.0, distToWave)),
                    dFlora, smoothstep(0.0, -15.0, distToWave)
                );
                
                if (wSplat > max(wIron, wFlora)) matID = 1.0; 
                else if (wFlora > wIron) matID = mix(1.0, 2.0, wFlora);
                else matID = mix(1.0, 0.0, wIron);
            }

            float floorCeil = abs(p.y) - 15.0;
            if (floorCeil < finalDist) {
                finalDist = floorCeil;
                matID = 3.0;
            }

            return vec2(finalDist * 0.5, matID);
        }
    `
};
