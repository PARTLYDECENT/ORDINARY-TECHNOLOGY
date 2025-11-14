// =================================================================================================
// [NON-EUCLIDEAN RENDERER] :: UNCANNY DISPLACEMENT SHADER - IIFE SCRIPT
// A traversal of 26 procedurally generated, shifting, and unreal landscapes.
// =================================================================================================
(function() {
    "use strict";

    let canvas, gl, program, animationId;
    let time = 0, phaseIndex = 0, speed = 1.0;
    let cameraPos = [0, 0, 5], cameraRot = [0, 0, 0];
    let keys = {}, autoJourney = true;
    let infoElement;

    // =================================================================================================
    // [PHASE DEFINITIONS] :: 26 REVISED UNCANNY REALITIES
    // =================================================================================================
    // Colors: [Base/Diffuse, Fresnel/Edge, Ambient/Fog]
    // Params: [x, y, z] (context-dependent)
    // =================================================================================================
    const phases = [
        // 0: Was "Menger Sponge". Now an oxidized, impossible artifact.
        { name: "Oxidized Artifact", colors: [[0.7,0.4,0.2], [0.9,0.7,0.5], [0.05,0.05,0.1]], params: [3.0, 0.5, 4.0], gridSize: 3.0, fogDensity: 0.1 },
        // 1: Was "Crystalline Caverns". Now a shifting, noisy geode.
        { name: "Resonant Geode", colors: [[0.5,0.8,1.0], [0.9,0.9,1.0], [0.0,0.1,0.2]], params: [0.8, 1.2, 0.1], gridSize: 4.0, fogDensity: 0.15 },
        // 2: Was "Gigeresque Bones". Now vertebrae, warped and repeating.
        { name: "Gigeresque Vertebrae", colors: [[0.6,0.6,0.5], [0.2,0.2,0.2], [0.0,0.0,0.0]], params: [1.5, 0.4, 0.8], gridSize: 2.8, fogDensity: 0.2 },
        // 3: Was "Gyroid Infinity". Now a metallic, infinite structure.
        { name: "Gyroid Labyrinth", colors: [[0.9,0.9,1.0], [0.4,0.5,0.6], [0.1,0.1,0.1]], params: [8.0, 0.05, 0.9], gridSize: 5.0, fogDensity: 0.08 },
        // 4: Was "Voxel Overgrowth". Now rounded, "living" blocks.
        { name: "Biomechanical Blocks", colors: [[0.2,0.8,0.3], [0.9,0.9,0.8], [0.1,0.2,0.1]], params: [5.0, 0.4, 1.0], gridSize: 2.0, fogDensity: 0.12 },
        // 5: "Mandelbulb Core". A classic fractal.
        { name: "Mandelbulb Core", colors: [[1.0,0.5,0.0], [0.0,0.5,1.0], [0.0,0.0,0.0]], params: [8.0, 1.5, 8.0], gridSize: 1.0, fogDensity: 0.25 },
        // 6: Was "Floating Obelisks". Now they drift and shift.
        { name: "Drifting Monoliths", colors: [[0.9,0.9,1.0], [0.4,0.4,0.6], [0.1,0.2,0.4]], params: [0.2, 5.0, 0.8], gridSize: 8.0, fogDensity: 0.07 },
        // 7: Was "Hexagonal Pillars". Now basalt columns from an alien world.
        { name: "Xenobasalt Columns", colors: [[0.2,0.2,0.3], [0.8,0.8,0.9], [0.0,0.0,0.0]], params: [1.0, 0.8, 0.5], gridSize: 2.0, fogDensity: 0.1 },
        // 8: Was "Torus Knot City". Now an unsettling, fleshy structure.
        { name: "Flesh Knot", colors: [[1.0,0.2,0.3], [0.2,0.8,1.0], [0.1,0.0,0.0]], params: [0.8, 0.2, 4.0], gridSize: 10.0, fogDensity: 0.05 },
        // 9: Was "Alien Desert". Now a sea of undulating, oily dunes.
        { name: "Oily Dunes", colors: [[0.8,0.4,0.2], [1.0,0.8,0.6], [0.3,0.5,0.8]], params: [1.2, 0.5, 0.9], gridSize: 1.0, fogDensity: 0.06 },
        // 10: Was "Mechanized Heart". Now it visibly pulses.
        { name: "Pulsing Core", colors: [[1.0,0.1,0.1], [0.5,0.5,0.6], [0.1,0.1,0.1]], params: [0.5, 0.2, 0.8], gridSize: 2.0, fogDensity: 0.3 },
        // 11: Was "Frozen Nebula". Now a breathing cloud of crystal.
        { name: "Breathing Nebula", colors: [[0.5,0.8,1.0], [1.0,0.5,1.0], [0.0,0.0,0.1]], params: [2.5, 0.8, 1.2], gridSize: 1.0, fogDensity: 0.18 },
        // 12: Was "Recursive Tetrahedra". Now a "seraph" object.
        { name: "Seraphim", colors: [[0.1,1.0,0.8], [0.8,1.0,0.9], [0.1,0.2,0.3]], params: [0.5, 4.0, 1.0], gridSize: 1.0, fogDensity: 0.15 },
        // 13: Was "Data Weave". Now a "hyper-grid" that feels unstable.
        { name: "Hyper-Grid", colors: [[0.0,1.0,1.0], [1.0,1.0,0.0], [0.0,0.0,0.2]], params: [0.1, 5.0, 0.5], gridSize: 2.0, fogDensity: 0.1 },
        // 14: Was "Submerged Temple". Now a cyclopean, non-Euclidean city.
        { name: "Sunken R'lyeh", colors: [[0.1,0.4,0.3], [0.5,0.8,0.7], [0.0,0.1,0.2]], params: [1.0, 2.0, 1.0], gridSize: 12.0, fogDensity: 0.2 },
        // 15: Was "Volcanic Plains". Now with molten, emissive cracks.
        { name: "Emissive Fissures", colors: [[1.0,0.3,0.0], [0.2,0.1,0.1], [0.0,0.0,0.0]], params: [1.5, 0.3, 2.0], gridSize: 1.0, fogDensity: 0.09 },
        // 16: Was "Quantum Chip". Now a more detailed, alien "processor."
        { name:A: "Processor", colors: [[0.8,0.8,1.0], [0.2,0.2,0.8], [0.1,0.1,0.1]], params: [0.1, 1.0, 0.0], gridSize: 3.0, fogDensity: 0.11 },
        // 17: Was "The Great Attractor". Now a singularity.
        { name: "Singularity", colors: [[1.0,0.8,1.0], [0.8,0.2,1.0], [0.0,0.0,0.0]], params: [1.0, 0.1, 0.5], gridSize: 1.0, fogDensity: 0.04 },
        // 18: Was "Living Coral". Now a true, complex gyroid structure.
        { name: "Gyroid Coral", colors: [[1.0,0.4,0.6], [0.2,1.0,0.8], [0.1,0.2,0.5]], params: [1.8, 0.6, 0.3], gridSize: 3.0, fogDensity: 0.13 },
        // 19: Was "Dyson Swarm". Now a vast field of mirrors.
        { name: "Dyson Mirrors", colors: [[1.0,0.9,0.8], [0.8,0.8,0.8], [0.1,0.1,0.1]], params: [0.5, 0.9, 0.1], gridSize: 15.0, fogDensity: 0.03 },
        // 20: Was "Warp Core". Now a more active, contained plasma.
        { name: "Contained Plasma", colors: [[0.2,0.8,1.0], [1.0,1.0,1.0], [0.0,0.2,0.5]], params: [0.3, 0.8, 0.4], gridSize: 2.0, fogDensity: 0.22 },
        // 21: Was "The Oracle". Now a pulsating, glowing pillar.
        { name: "The Oracle", colors: [[1.0,0.8,0.2], [0.8,1.0,0.9], [0.2,0.1,0.0]], params: [0.6, 0.5, 0.2], gridSize: 1.0, fogDensity: 0.16 },
        // 22: Was "Glitch City". Now a corrupted, displaced reality.
        { name: "Corrupted Data", colors: [[1.0,0.0,0.5], [0.0,1.0,0.8], [0.1,0.1,0.1]], params: [1.0, 0.9, 0.5], gridSize: 6.0, fogDensity: 0.08 },
        // 23: Was "Abyssal Leviathan". Now a vast, coiling spine.
        { name: "Abyssal Spine", colors: [[0.0,0.1,0.3], [0.5,0.2,0.8], [0.0,0.0,0.0]], params: [0.2, 0.5, 0.8], gridSize: 1.0, fogDensity: 0.35 },
        // 24: Was "Stochastic Forest". Now with randomly rotated pillars.
        { name: "Chaotic Forest", colors: [[0.4,0.8,0.2], [0.2,0.4,0.1], [0.1,0.1,0.1]], params: [0.1, 6.0, 0.5], gridSize: 4.0, fogDensity: 0.1 },
        // 25: Was "World Serpent". Now a twisting, impossible knot.
        { name: "Ouroboros", colors: [[0.8,1.0,0.9], [0.8,0.5,0.2], [0.2,0.2,0.3]], params: [1.0, 0.4, 3.0], gridSize: 1.0, fogDensity: 0.07 }
    ];

    // =================================================================================================
    // [OPTIMIZED VERTEX SHADER] (UNCHANGED)
    // =================================================================================================
    const vertexSource = `attribute vec2 p;varying vec2 vUv;void main(){vUv=p;gl_Position=vec4(p,0,1);}`;

    // =================================================================================================
    // [REIMAGINED 3D FRAGMENT SHADER] :: UNCANNY REALITY GENERATOR
    // =================================================================================================
    const fragmentSource = `
        precision highp float;
        uniform float time, speed;
        uniform int mode;
        uniform vec2 resolution;
        uniform vec3 cameraPos, cameraRot;
        uniform vec3 color1, color2, color3; // color1=Base, color2=Fresnel, color3=Ambient/Fog
        uniform vec3 params; // x, y, z: context-dependent parameters
        uniform float gridSize, fogDensity;
        varying vec2 vUv;
        
        const float PI = 3.14159265;
        const int MAX_STEPS = 80;
        const float MIN_DIST = 0.001;
        const float MAX_DIST = 80.0;
        
        // --- UTILITY & NOISE ---
        mat3 rotX(float a){float c=cos(a),s=sin(a);return mat3(1,0,0,0,c,-s,0,s,c);}
        mat3 rotY(float a){float c=cos(a),s=sin(a);return mat3(c,0,s,0,1,0,-s,0,c);}
        float hash(float n){return fract(sin(n)*43758.5453);}
        vec2 hash2(vec2 p){return fract(sin(vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3))))*43758.5453);}
        float noise(vec3 x){vec3 p=floor(x);vec3 f=fract(x);f=f*f*(3.0-2.0*f);float n=p.x+p.y*57.0+113.0*p.z;return mix(mix(mix(hash(n+0.0),hash(n+1.0),f.x),mix(hash(n+57.0),hash(n+58.0),f.x),f.y),mix(mix(hash(n+113.0),hash(n+114.0),f.x),mix(hash(n+170.0),hash(n+171.0),f.x),f.y),f.z);}

        // --- SDF (SIGNED DISTANCE FUNCTION) LIBRARY ---
        float sdSphere(vec3 p, float s){return length(p)-s;}
        float sdBox(vec3 p, vec3 b){vec3 q=abs(p)-b;return length(max(q,0.0))+min(max(q.x,max(q.y,q.z)),0.0);}
        float sdRoundBox(vec3 p, vec3 b, float r){vec3 q=abs(p)-b;return length(max(q,0.0))+min(max(q.x,max(q.y,q.z)),0.0)-r;}
        float sdTorus(vec3 p, vec2 t){vec2 q=vec2(length(p.xz)-t.x,p.y);return length(q)-t.y;}
        float sdCylinder(vec3 p, float h, float r){vec2 d=abs(vec2(length(p.xz),p.y))-vec2(r,h);return min(max(d.x,d.y),0.0)+length(max(d,0.0));}
        float sdHexPrism(vec3 p, vec2 h){const vec3 k=vec3(-0.8660254,0.5,0.57735026);p=abs(p);p.xy-=2.0*min(dot(k.xy,p.xy),0.0)*k.xy;vec2 d=vec2(length(p.xy-vec2(clamp(p.x,-k.z*h.x,k.z*h.x),h.x))*sign(p.y-h.x),p.z-h.y);return min(max(d.x,d.y),0.0)+length(max(d,0.0));}
        float sdGyroid(vec3 p, float scale, float thickness) { return abs(dot(sin(p*scale), cos(p.zxy*scale)) / scale) - thickness; }

        // --- SDF OPERATORS ---
        vec3 opRep(vec3 p, vec3 c){return mod(p+0.5*c,c)-0.5*c;}
        float opSmoothUnion(float d1, float d2, float k){float h=clamp(0.5+0.5*(d2-d1)/k,0.0,1.0);return mix(d2,d1,h)-k*h*(1.0-h);}
        float opSmoothSubtraction(float d1, float d2, float k){float h=clamp(0.5-0.5*(d1+d2)/k,0.0,1.0);return mix(d1,-d2,h)+k*h*(1.0-h);}

        // --- COMPLEX SDFs ---
        float sdMengerSponge(vec3 p, float scale) {
            float d = sdBox(p, vec3(scale));
            float s = 1.0;
            // Loop count MUST be a compile-time constant for WebGL1.
            // The 'Menger Sponge' phase (mode 0) uses params.z = 4.0.
            for(int m=0; m < 4; m++){
                vec3 a = mod(p*s, 2.0)-1.0;
                s *= 3.0;
                vec3 r = 1.0 - 3.0*abs(a);
                float c = sdBox(r, vec3(1.0))/s;
                d = max(d, -c);
            }
            return d;
        }

        float sdMandelbulb(vec3 pos, float power, float bailout) {
            vec3 z = pos;
            float dr = 1.0;
            float r = 0.0;
            for (int i = 0; i < 5; i++) {
                r = length(z);
                if (r > bailout) break;
                float theta = acos(z.z / r) * power;
                float phi = atan(z.y, z.x) * power;
                dr = pow(r, power - 1.0) * power * dr + 1.0;
                float zr = pow(r, power);
                z = zr * vec3(sin(theta) * cos(phi), sin(phi) * sin(theta), cos(theta));
                z += pos;
            }
            return 0.5 * log(r) * r / dr;
        }

        // --- MASTER SCENE SDF (REVISED) ---
        float sceneSDF(vec3 p) {
            float breath = sin(time * 0.5);
            if (mode == 0) return sdMengerSponge(p, params.x);
            if (mode == 1) return length(opRep(p, vec3(gridSize))) - params.x - noise(p * params.y + breath) * 1.5;
            if (mode == 2) { vec3 q = p; q.y = mod(p.y, gridSize)-gridSize*0.5; q.xz *= 1.0 + sin(p.y * 0.5) * 0.2; return opSmoothUnion(sdTorus(q.xzy, vec2(params.x, params.y)), sdCylinder(q, 0.1, 0.1), params.z); }
            if (mode == 3) return sdGyroid(p, gridSize, params.y);
            if (mode == 4) return sdRoundBox(opRep(p, vec3(gridSize)), vec3(params.y), 0.1) - noise(p * params.x) * 0.2;
            if (mode == 5) return sdMandelbulb(p, params.x + breath * 0.1, params.y);
            if (mode == 6) { vec3 q = p; q.x += sin(p.y*0.5 + time) * 2.0; return sdBox(opRep(q, vec3(gridSize)), vec3(params.x, params.y, params.x)) - noise(p) * params.z; }
            if (mode == 7) return sdHexPrism(opRep(p, vec3(gridSize, 100.0, gridSize*0.866)), vec2(params.x, 50.0));
            if (mode == 8) { vec3 q = opRep(p, vec3(gridSize)); return sdTorus(q, vec2(params.x, params.y)) - sin(p.y * params.z + time) * 0.1; }
            if (mode == 9) return p.y + noise(vec3(p.xz * params.x, time * 0.1)) * params.y * 2.0 - 1.0;
            if (mode == 10) { float pulse = (1.0 - sin(time * PI * 2.0)) * 0.1; return opSmoothUnion(sdSphere(p, 1.0 + pulse), sdTorus(p, vec2(1.2 + pulse, 0.3)), params.x); }
            if (mode == 11) return sdSphere(p, 5.0) - noise(p * params.x + time*0.2) * params.y * 3.0;
            if (mode == 12) { p = rotY(time*0.2) * p; vec3 q = p; float d = 100.0; float s = params.x; for(int i=0; i<4; i++){ d = opSmoothUnion(d, sdSphere(q-vec3(s,0,0), s), 0.5); q.xzy = abs(q.xzy); q -= s; s*=0.7;} return d;}
            if (mode == 13) return min(abs(p.x)-params.x, min(abs(p.y)-params.x, abs(p.z)-params.x)) - noise(p*params.y + time)*0.05;
            if (mode == 14) { vec3 q = opRep(p, vec3(gridSize)); q.y -= 1.0; return opSmoothUnion(sdBox(q, vec3(2, 0.1, 2)), sdCylinder(q-vec3(0,1,0), 2.0, 0.2), 1.0);}
            if (mode == 15) return p.y + noise(vec3(p.xz * params.x + sin(time*0.5), 0.0)) * params.y * 1.5 - (sin(p.x*0.1)*cos(p.z*0.1))*3.0;
            if (mode == 16) { vec3 q = opRep(p, vec3(gridSize)); float box = sdBox(q, vec3(1.0, 0.05, 1.0)); float lines = min(sdBox(q, vec3(1.1, 0.1, 0.02)), sdBox(q, vec3(0.02, 0.1, 1.1))); return min(box, lines); }
            if (mode == 17) return opSmoothSubtraction(sdSphere(p, 1.0), sdSphere(p - vec3(sin(time), cos(time), 0.0), 1.1), params.y);
            if (mode == 18) return sdGyroid(p, params.x, params.y); // Use proper gyroid for coral
            if (mode == 19) { vec3 q = opRep(p, vec3(gridSize, 10, gridSize)); return sdBox(q, vec3(params.x, 0.01, params.x)); }
            if (mode == 20) { p = rotY(time * 0.05) * p; return sdTorus(opRep(p, vec3(gridSize)), vec2(0.5 + breath * 0.1, 0.1)); }
            if (mode == 21) { vec3 q = p; q.y = abs(q.y); float cyl = sdCylinder(q, 1.5, params.x); float pulse = sin(p.y*3.0 - time * 2.0) * params.y; return cyl - pulse; }
            if (mode == 22) { vec3 q = p; q.xy += (noise(vec3(p.z, 0.0, time)) - 0.5) * params.y; q = opRep(q, vec3(gridSize)); return sdRoundBox(q, vec3(1.0), 0.1); }
            if (mode == 23) { vec3 q = p; q.x += sin(p.z * 0.1 + time) * 3.0; return sdSphere(opRep(q, vec3(1.5, 2.0, 1.5)), 0.5); }
            if (mode == 24) { vec3 q = opRep(p, vec3(gridSize, 100.0, gridSize)); vec2 id = floor(p.xz / gridSize); vec2 h = hash2(id); q.xz = rotY(h.x * PI * 2.0) * q.xz; return sdCylinder(q - vec3(0, h.y * params.y * 0.5, 0), h.y * params.y, params.x); }
            if (mode == 25) { vec3 q = p; float tube = 100.0; for(int i=0; i<4; i++){ q.xy = abs(q.xy); q.xy -= 1.0; q = rotY(PI/params.z) * q; } tube = sdTorus(q, vec2(params.x, params.y)); return tube;}
            return 1.0;
        }

        vec3 calcNormal(vec3 p) {
            vec2 e = vec2(0.001, 0);
            return normalize(vec3(
                sceneSDF(p + e.xyy) - sceneSDF(p - e.xyy),
                sceneSDF(p + e.yxy) - sceneSDF(p - e.yxy),
                sceneSDF(p + e.yyx) - sceneSDF(p - e.yyx)
            ));
        }
        
        float calcAO(vec3 p, vec3 n) {
            float total_ao = 0.0;
            float step_dist = 0.05;
            for(int i=1; i<=5; i++){
                float dist = float(i) * step_dist;
                total_ao += (dist - sceneSDF(p + n * dist)) / pow(1.0 + dist, 2.0);
            }
            return 1.0 - clamp(total_ao * 0.5, 0.0, 1.0);
        }
        
        // --- NEW SOFT SHADOW CALCULATION ---
        float calcShadow(vec3 ro, vec3 rd) {
            float res = 1.0;
            float t = 0.01;
            float tmax = 10.0;
            float k = 8.0; // Softness
            for(int i=0; i < 16; i++){ // Cheaper shadow ray
                if(t > tmax) break;
                float h = sceneSDF(ro + rd * t);
                if(h < MIN_DIST) return 0.0; // Hard shadow
                res = min(res, k * h / t);
                t += h * 0.6;
            }
            return clamp(res, 0.0, 1.0);
        }

        // --- RAYMARCHER & MAIN (REVISED LIGHTING) ---
        vec4 raymarch(vec3 ro, vec3 rd) {
            float dist = 0.0;
            float emissive = 0.0;

            for(int i=0; i < MAX_STEPS; i++){
                vec3 p = ro + rd * dist;
                float d = sceneSDF(p);
                if(d < MIN_DIST){
                    vec3 n = calcNormal(p);
                    float ao = calcAO(p, n);
                    
                    // --- New Animated Light & Shadow ---
                    vec3 lightDir = normalize(vec3(sin(time*0.1), 0.8, cos(time*0.1)));
                    float shadow = calcShadow(p + n * MIN_DIST * 2.0, lightDir);
                    float diffuse = max(0.0, dot(n, lightDir));
                    float fresnel = pow(1.0 - max(0.0, dot(n, -rd)), 4.0);
                    
                    vec3 surfCol = mix(color1, color2, fresnel); // Base color + Fresnel
                    vec3 directLight = surfCol * diffuse * shadow * 1.2; // Direct light
                    vec3 ambientLight = (color1 * 0.1 + color3 * 0.9) * ao; // Ambient/Occluded light
                    
                    // --- Emissive ---
                    if (mode == 15) { // Emissive Fissures
                        emissive = clamp(-d*200.0, 0.0, 1.0);
                    }
                    if (mode == 21) { // Oracle
                        emissive = pow(abs(sin(p.y*3.0 - time*2.0)), 5.0);
                    }
                    if (mode == 10) { // Pulsing Core
                        emissive = pow(max(0.0, 1.0 - sin(time * PI * 2.0)), 10.0) * 0.5;
                    }
                    
                    vec3 finalColor = directLight + ambientLight + (color1 * emissive);
                    return vec4(finalColor, dist);
                }
                if(dist > MAX_DIST) break;
                dist += d * 0.7;
            }
            return vec4(0.0, 0.0, 0.0, MAX_DIST);
        }

        void main() {
            vec2 uv = (vUv * 2.0 - 1.0) * vec2(resolution.x / resolution.y, 1.0);
            vec3 ro = cameraPos;
            mat3 camRot = rotY(cameraRot.y) * rotX(cameraRot.x);
            vec3 rd = normalize(camRot * vec3(uv, 1.5));
            
            vec4 res = raymarch(ro,rd);
            vec3 col = res.rgb;
            float d = res.a;
            
            // Revised Fog: Fades to a DARKER version of the ambient color
            float fog = exp(-d * fogDensity);
            col = mix(color3 * 0.5, col, fog); 
            
            col = pow(col, vec3(0.4545)); // Gamma correction
            col *= 1.0 - length(uv) * 0.15; // Vignette
            gl_FragColor = vec4(col, 1.0);
        }
    `;

    // =================================================================================================
    // [HYPER-OPTIMIZED WEBGL SETUP & CONTROL] (UNCHANGED)
    // =================================================================================================
    function initWebGL() {
        canvas = document.getElementById('qreCanvas');
        if (!canvas) {
            canvas = document.createElement('canvas');
            canvas.id = 'qreCanvas';
        }
        canvas.style.cssText = `position:fixed;top:0;left:0;z-index:-1;width:100vw;height:100vh;background:#000;`;
        document.body.insertBefore(canvas, document.body.firstChild);

        gl = canvas.getContext('webgl', { antialias: false, powerPreference: "high-performance" });
        if (!gl) throw new Error("WebGL is not supported.");
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        gl.viewport(0, 0, canvas.width, canvas.height);
        console.log("[NER] :: Non-Euclidean Renderer Initialized. GL Context Acquired.");
    }

    function createProgramAndShaders() {
        const vs = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vs, vertexSource);
        gl.compileShader(vs);

        const fs = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fs, fragmentSource);
        gl.compileShader(fs);

        if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
            console.error("SHADER COMPILATION ERROR LOG:", gl.getShaderInfoLog(fs));
            throw new Error(`Fragment shader compilation failed.`);
        }

        program = gl.createProgram();
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.linkProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error("SHADER LINKING ERROR LOG:", gl.getProgramInfoLog(program));
            throw new Error(`Shader program linking failed.`);
        }

        gl.useProgram(program);
        
        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
        const pos = gl.getAttribLocation(program, 'p');
        gl.enableVertexAttribArray(pos);
        gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
        console.log("[NER] :: Shader Matrix Compiled and Linked. Ready for world generation.");
    }
    
    function updateInfo() {
        if (typeof document !== 'undefined') {
            infoElement = document.getElementById('phaseName');
            if (!infoElement) {
                const infoContainer = document.createElement('div');
                infoContainer.style.cssText = `position: fixed; bottom: 10px; left: 10px; color: white; font-family: 'Courier New', Courier, monospace; font-size: 14px; background-color: rgba(0,0,0,0.5); padding: 8px; border-radius: 5px; text-shadow: 1px 1px 2px black; z-index: 10;`;
                infoContainer.innerHTML = `<b>[NER]</b> <span id="phaseName">Loading...</span><br>Controls: [←][→] | [W/A/S/D] | [J] | [R]`;
                document.body.appendChild(infoContainer);
                infoElement = document.getElementById('phaseName');
            }
            if (infoElement) {
                infoElement.textContent = `[${phaseIndex}] ${phases[phaseIndex].name}`;
            }
        }
    }

    function updateCamera(deltaTime) {
        const moveSpeed = 3.0 * (keys['Shift'] ? 3.0 : 1.0);
        if (autoJourney) cameraPos[2] -= moveSpeed * deltaTime * speed;
        if (keys['w'] || keys['W']) cameraPos[2] -= moveSpeed * deltaTime;
        if (keys['s'] || keys['S']) cameraPos[2] += moveSpeed * deltaTime;
        if (keys['a'] || keys['A']) cameraPos[0] -= moveSpeed * deltaTime;
        if (keys['d'] || keys['D']) cameraPos[0] += moveSpeed * deltaTime;

        if (autoJourney && Math.floor(time / 20) !== Math.floor((time - deltaTime) / 20)) {
            phaseIndex = (phaseIndex + 1) % phases.length;
            console.log(`[NER] :: Auto-phasing to [${phaseIndex}] ${phases[phaseIndex].name}`);
            updateInfo();
        }
    }

    let lastTimestamp = 0;
    function render(timestamp) {
        const deltaTime = Math.min(0.1, (timestamp - lastTimestamp) / 1000);
        lastTimestamp = timestamp;
        time = timestamp * 0.001;

        updateCamera(deltaTime);
        const phase = phases[phaseIndex];
        
        gl.useProgram(program);
        gl.uniform1f(gl.getUniformLocation(program, 'time'), time);
        gl.uniform1f(gl.getUniformLocation(program, 'speed'), speed);
        gl.uniform1i(gl.getUniformLocation(program, 'mode'), phaseIndex);
        gl.uniform2f(gl.getUniformLocation(program, 'resolution'), canvas.width, canvas.height);
        gl.uniform3fv(gl.getUniformLocation(program, 'cameraPos'), cameraPos);
        gl.uniform3fv(gl.getUniformLocation(program, 'cameraRot'), cameraRot);
        gl.uniform3fv(gl.getUniformLocation(program, 'color1'), phase.colors[0]);
        gl.uniform3fv(gl.getUniformLocation(program, 'color2'), phase.colors[1]);
        gl.uniform3fv(gl.getUniformLocation(program, 'color3'), phase.colors[2]);
        gl.uniform3fv(gl.getUniformLocation(program, 'params'), phase.params);
        gl.uniform1f(gl.getUniformLocation(program, 'gridSize'), phase.gridSize);
        gl.uniform1f(gl.getUniformLocation(program, 'fogDensity'), phase.fogDensity);
        
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        animationId = requestAnimationFrame(render);
    }

    window.qre = {
        switchPhase: (index) => {
            if (index >= 0 && index < phases.length) {
                phaseIndex = index;
                console.log(`[NER] :: Manual phase shift to [${index}] ${phases[index].name}`);
                updateInfo();
            }
        },
        nextPhase: () => qre.switchPhase((phaseIndex + 1) % phases.length),
        prevPhase: () => qre.switchPhase((phaseIndex - 1 + phases.length) % phases.length),
        setSpeed: (val) => { speed = Math.max(0, Math.min(10, val)); },
        toggleAuto: () => { autoJourney = !autoJourney; console.log(`[NER] :: Auto-Journey ${autoJourney ? 'ENABLED' : 'DISABLED'}`); },
        reset: () => { cameraPos = [0, 0, 5]; cameraRot = [0, 0, 0]; console.log("[NER] :: Camera Origin Reset."); },
        getPhases: () => phases.map((p, i) => ({ index: i, name: p.name })),
        getCurrentPhase: () => ({ index: phaseIndex, name: phases[phaseIndex].name }),
        destroy: () => {
            if (animationId) cancelAnimationFrame(animationId);
            if (canvas) canvas.remove();
            console.log("[NER] :: Reality Engine Terminated.");
        }
    };

    function bootstrap() {
        try {
            initWebGL();
            createProgramAndShaders();
            updateInfo();
            animationId = requestAnimationFrame(render);
            console.log("[NER] :: Bootstrap complete. Journey has begun.");
            console.log("Use qre.nextPhase() or qre.prevPhase() to navigate realities.");
        } catch (e) {
            console.error("[NER CRITICAL FAILURE] :: Engine bootstrap failed:", e);
        }
    }
    
    window.addEventListener('resize', () => {
        if (canvas && gl) {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            gl.viewport(0, 0, canvas.width, canvas.height);
        }
    });

    window.addEventListener('keydown', (e) => {
        keys[e.key] = true;
        if (e.key === 'ArrowRight') qre.nextPhase();
        if (e.key === 'ArrowLeft') qre.prevPhase();
        if (e.key.toLowerCase() === 'r') qre.reset();
        if (e.key.toLowerCase() === 'j') qre.toggleAuto();
    });
    
    window.addEventListener('keyup', (e) => { keys[e.key] = false; });

    if (typeof document !== 'undefined') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', bootstrap);
        } else {
            bootstrap();
        }
    } else {
        console.warn("[NER] :: No DOM found. Bootstrap will not run automatically.");
    }
})();