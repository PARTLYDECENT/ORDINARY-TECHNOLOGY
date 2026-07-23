/**
 * MINECRAFT 3D VOXEL BLOCK ENGINE: Complete 3D Grid procedurally built block-by-block
 * Advanced Biome Upgrades:
 * 1. 10 Distinct Voxel Tree Typologies: Oak, Redwood, Cyber Spire, Umbrella, Weeping Willow, Mangrove, Bamboo, Shrub, Double Canopy, Fractal Cross.
 * 2. 3-State Biome Morphing: Rapidly cycles from Lush Jungle -> Fleshy Xenotree -> Silicon Motherboard RAM Chip!
 * 3. Silicon Motherboard Shader: Renders glowing copper circuit tracers, pulsating gold/cyan currents and scrolling neon binary data streams.
 * 4. SDF Melting & Eyeballs: Trunks/Leaves physically warp and liquefy down using vertex shaders.
 */

const JungleMapManager = (function () {

    // Simple deterministic hash for procedural block noise
    function hash2D(x, z) {
        let h = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453123;
        return h - Math.floor(h);
    }

    class VoxelBlockMaterialFactory {
        static createProceduralMaterial(blockType) {
            let baseColor;
            let roughness = 0.9;
            let transparent = false;
            let opacity = 1.0;

            if (blockType === 'grass') baseColor = new THREE.Color(0x3f9b2d);
            else if (blockType === 'dirt') baseColor = new THREE.Color(0x654321);
            else if (blockType === 'sand') baseColor = new THREE.Color(0xdfc47c);
            else if (blockType === 'stone') baseColor = new THREE.Color(0x7a7a7a);
            else if (blockType === 'wood') baseColor = new THREE.Color(0x5c4033);
            else if (blockType === 'leaves') {
                baseColor = new THREE.Color(0x1a7f2a);
                transparent = true;
                opacity = 0.96;
            } else if (blockType === 'water') {
                baseColor = new THREE.Color(0x0e7c96);
                transparent = true;
                opacity = 0.78;
                roughness = 0.15;
            } else if (blockType === 'ruins') baseColor = new THREE.Color(0x4a5348);

            const mat = new THREE.MeshStandardMaterial({
                color: baseColor,
                roughness: roughness,
                metalness: blockType === 'water' ? 0.9 : 0.05,
                transparent: transparent,
                opacity: opacity
            });

            mat.onBeforeCompile = (shader) => {
                shader.uniforms.uTime = { value: 0 };
                shader.uniforms.uBiomeShift = { value: 0.0 }; // 0.0 (Jungle), 1.0 (Xeno), 2.0 (RAM Motherboard)
                mat.userData.shader = shader;

                // Vertex shader: pass UVs, apply SDF Melting distortion in Xeno and RAM phases!
                shader.vertexShader = shader.vertexShader.replace(
                    `#include <common>`,
                    `#include <common>
                    varying vec3 vLocalPos;
                    varying vec3 vNormalVec;
                    varying vec2 vFaceUv;
                    uniform float uTime;
                    uniform float uBiomeShift;`
                );
                
                shader.vertexShader = shader.vertexShader.replace(
                    `#include <begin_vertex>`,
                    `#include <begin_vertex>
                    vLocalPos = position;
                    vNormalVec = normal;
                    vFaceUv = uv;
                    
                    // Stepped SDF-like melting deformation triggers in Xeno (1.0) and RAM (2.0) phases!
                    #ifdef USE_INSTANCING
                    if (position.y > -0.6) {
                        float meltTrigger = clamp(uBiomeShift, 0.0, 2.0);
                        if (meltTrigger > 0.4) {
                            float meltAmt = (meltTrigger > 1.0) ? 1.0 : (meltTrigger - 0.4) * 1.6;
                            // Pull coordinates downwards and wobble like melting silicon circuitry
                            transformed.y -= sin(position.x * 2.8 + uTime * 3.5) * 0.28 * meltAmt;
                            transformed.xz += cos(position.y * 3.2 + uTime * 2.8) * 0.22 * meltAmt;
                        }
                    }
                    #endif`
                );

                // Fragment shader: custom procedural 16x16 pixel texturing, xenotree mutations, RAM silicon grid, eyeballs!
                shader.fragmentShader = shader.fragmentShader.replace(
                    `#include <common>`,
                    `#include <common>
                    varying vec3 vLocalPos;
                    varying vec3 vNormalVec;
                    varying vec2 vFaceUv;
                    uniform float uTime;
                    uniform float uBiomeShift;

                    // Pseudo-random noise for pixel grid
                    float pixelNoise(vec2 co) {
                        return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
                    }`
                );

                let texturingCode = '';

                if (blockType === 'grass') {
                    texturingCode = `
                    // 16x16 pixel grid snap
                    vec2 pixel = floor(vFaceUv * 16.0) / 16.0;
                    float noise = pixelNoise(pixel);
                    
                    // Determine if top, bottom or side face
                    if (vNormalVec.y > 0.8) {
                        // Top face: Vibrant Grass
                        vec3 gCol = mix(vec3(0.24, 0.60, 0.18), vec3(0.32, 0.72, 0.22), noise);
                        diffuseColor.rgb = gCol;
                    } else if (vNormalVec.y < -0.8) {
                        // Bottom face: Dirt
                        vec3 dCol = mix(vec3(0.38, 0.25, 0.15), vec3(0.44, 0.30, 0.18), noise);
                        diffuseColor.rgb = dCol;
                    } else {
                        // Side face: Dirt with grass hanging down
                        float drape = 0.72 + sin(pixel.x * 6.28) * 0.08 + noise * 0.05;
                        if (vFaceUv.y > drape) {
                            diffuseColor.rgb = mix(vec3(0.24, 0.60, 0.18), vec3(0.32, 0.72, 0.22), noise);
                        } else {
                            diffuseColor.rgb = mix(vec3(0.38, 0.25, 0.15), vec3(0.44, 0.30, 0.18), noise);
                        }
                    }
                    
                    // --- MULTI-STATE BIOME MORPHING ---
                    // State 1: Fleshy Xenotree (0.0 to 1.0)
                    float xenoAmt = clamp(uBiomeShift, 0.0, 1.0);
                    vec3 xenoBase = vec3(0.22, 0.02, 0.32); // deep xeno violet
                    float vein = step(0.85, sin(pixel.x * 15.0 + uTime * 2.8) * cos(pixel.y * 15.0 - uTime * 2.0));
                    vec3 xenoCol = mix(xenoBase, vec3(0.95, 0.02, 0.12), vein * 0.68); // neon red veins
                    diffuseColor.rgb = mix(diffuseColor.rgb, xenoCol, xenoAmt);

                    // State 2: RAM Chip Motherboard (1.0 to 2.0)
                    float ramAmt = clamp(uBiomeShift - 1.0, 0.0, 1.0);
                    if (ramAmt > 0.0) {
                        // Sleek green/dark silicon motherboard background
                        vec3 siliconBase = mix(vec3(0.04, 0.14, 0.08), vec3(0.06, 0.22, 0.12), noise);
                        // Glowing cyan/gold circuit tracers
                        float lineX = step(0.90, fract(vFaceUv.x * 4.0));
                        float lineY = step(0.90, fract(vFaceUv.y * 4.0));
                        float tracer = max(lineX, lineY);
                        float pulse = step(0.88, sin(vFaceUv.x * 16.0 - uTime * 15.0) * cos(vFaceUv.y * 16.0 + uTime * 12.0));
                        vec3 tracerCol = mix(vec3(0.0, 0.95, 1.0), vec3(1.0, 0.85, 0.0), pulse); // cyan & gold
                        vec3 motherboardCol = mix(siliconBase, tracerCol, tracer * 0.85);
                        diffuseColor.rgb = mix(diffuseColor.rgb, motherboardCol, ramAmt);
                    }

                    // Crisp voxel pixel border
                    vec2 edge = smoothstep(0.06, 0.0, fract(vFaceUv * 16.0)) + smoothstep(0.06, 0.0, 1.0 - fract(vFaceUv * 16.0));
                    float grid = max(edge.x, edge.y);
                    diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 0.82, grid * 0.6);
                    `;
                } else if (blockType === 'dirt') {
                    texturingCode = `
                    vec2 pixel = floor(vFaceUv * 16.0) / 16.0;
                    float noise = pixelNoise(pixel);
                    diffuseColor.rgb = mix(vec3(0.38, 0.25, 0.15), vec3(0.46, 0.32, 0.20), noise);
                    
                    // State 2: Motherboard transition
                    float ramAmt = clamp(uBiomeShift - 1.0, 0.0, 1.0);
                    if (ramAmt > 0.0) {
                        vec3 siliconBase = mix(vec3(0.03, 0.08, 0.05), vec3(0.04, 0.15, 0.08), noise);
                        diffuseColor.rgb = mix(diffuseColor.rgb, siliconBase, ramAmt);
                    }

                    vec2 edge = smoothstep(0.06, 0.0, fract(vFaceUv * 16.0)) + smoothstep(0.06, 0.0, 1.0 - fract(vFaceUv * 16.0));
                    float grid = max(edge.x, edge.y);
                    diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 0.82, grid * 0.5);
                    `;
                } else if (blockType === 'sand') {
                    texturingCode = `
                    vec2 pixel = floor(vFaceUv * 16.0) / 16.0;
                    float noise = pixelNoise(pixel);
                    diffuseColor.rgb = mix(vec3(0.85, 0.76, 0.50), vec3(0.92, 0.84, 0.58), noise);
                    
                    // State 2: Motherboard transition (Gold bus lanes!)
                    float ramAmt = clamp(uBiomeShift - 1.0, 0.0, 1.0);
                    if (ramAmt > 0.0) {
                        vec3 goldBus = mix(vec3(0.78, 0.62, 0.12), vec3(1.0, 0.85, 0.22), noise);
                        float line = step(0.88, sin(vFaceUv.x * 8.0 - uTime * 6.0));
                        vec3 targetCol = mix(goldBus, vec3(1.0, 1.0, 0.9), line * 0.45);
                        diffuseColor.rgb = mix(diffuseColor.rgb, targetCol, ramAmt);
                    }

                    vec2 edge = smoothstep(0.06, 0.0, fract(vFaceUv * 16.0)) + smoothstep(0.06, 0.0, 1.0 - fract(vFaceUv * 16.0));
                    float grid = max(edge.x, edge.y);
                    diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 0.85, grid * 0.4);
                    `;
                } else if (blockType === 'stone') {
                    texturingCode = `
                    vec2 pixel = floor(vFaceUv * 16.0) / 16.0;
                    float noise = pixelNoise(pixel);
                    diffuseColor.rgb = mix(vec3(0.45, 0.45, 0.45), vec3(0.55, 0.55, 0.55), noise);
                    
                    // State 2: Motherboard transition (Scrolling Green Binary Matrix blocks!)
                    float ramAmt = clamp(uBiomeShift - 1.0, 0.0, 1.0);
                    if (ramAmt > 0.0) {
                        vec3 motherboardBg = vec3(0.02, 0.03, 0.04); // dark graphite
                        // Scrolling binary streams
                        float binVal = pixelNoise(floor(vFaceUv * vec2(8.0, 16.0)) + vec2(0.0, floor(uTime * 16.0)));
                        float charMask = step(0.68, binVal);
                        vec3 matrixGreen = vec3(0.0, 0.95, 0.18) * charMask;
                        vec3 targetCol = mix(motherboardBg, matrixGreen, 0.85);
                        diffuseColor.rgb = mix(diffuseColor.rgb, targetCol, ramAmt);
                    }

                    float moss = pixelNoise(pixel * 2.5);
                    if (moss > 0.72 && ramAmt < 0.5) {
                        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.20, 0.42, 0.15), 0.55);
                    }
                    
                    vec2 edge = smoothstep(0.06, 0.0, fract(vFaceUv * 16.0)) + smoothstep(0.06, 0.0, 1.0 - fract(vFaceUv * 16.0));
                    float grid = max(edge.x, edge.y);
                    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.24), grid * 0.7);
                    `;
                } else if (blockType === 'wood') {
                    texturingCode = `
                    vec2 pixel = floor(vFaceUv * 16.0) / 16.0;
                    float noise = pixelNoise(pixel);
                    if (abs(vNormalVec.y) > 0.8) {
                        // Top/Bottom: Rings of wood
                        float dist = length(vFaceUv - vec2(0.5));
                        float ring = step(0.12, abs(fract(dist * 6.0) - 0.5));
                        diffuseColor.rgb = mix(vec3(0.72, 0.56, 0.38), vec3(0.58, 0.42, 0.26), ring * 0.6 + noise * 0.15);
                    } else {
                        // Sides: Tree Bark
                        float strip = step(0.3, abs(sin(pixel.x * 12.56)));
                        diffuseColor.rgb = mix(vec3(0.32, 0.20, 0.12), vec3(0.44, 0.28, 0.16), strip * 0.5 + noise * 0.2);
                    }
                    
                    // State 1: Fleshy Xenotree (0.0 to 1.0)
                    float xenoAmt = clamp(uBiomeShift, 0.0, 1.0);
                    vec3 xenoBase = vec3(0.22, 0.02, 0.32); // deep xeno violet
                    float vein = step(0.85, sin(pixel.x * 15.0 + uTime * 2.8) * cos(pixel.y * 15.0 - uTime * 2.0));
                    vec3 xenoCol = mix(xenoBase, vec3(0.95, 0.02, 0.12), vein * 0.68); // neon red veins
                    diffuseColor.rgb = mix(diffuseColor.rgb, xenoCol, xenoAmt);
                    
                    // Eyeballs (in Xeno phase)
                    if (xenoAmt > 0.35 && abs(vNormalVec.y) < 0.2) {
                        float eyeHash = pixelNoise(pixel * 4.0 + vec2(100.0));
                        if (eyeHash > 0.68) {
                            vec2 eyeCenter = vec2(0.5) + (vec2(eyeHash, fract(eyeHash * 10.0)) - 0.5) * 0.2;
                            float distToEye = length(vFaceUv - eyeCenter);
                            if (distToEye < 0.14) {
                                float blink = step(0.15, abs(sin(uTime * 2.2 + eyeHash * 20.0)));
                                if (blink > 0.5) {
                                    diffuseColor.rgb = vec3(0.95, 0.93, 0.84); // Sclera white
                                    float distToPupil = length(vFaceUv - (eyeCenter + vec2(sin(uTime + eyeHash * 10.0) * 0.015, 0.0)));
                                    if (distToPupil < 0.05) {
                                        diffuseColor.rgb = vec3(0.98, 0.02, 0.08); // Blazing crimson pupil!
                                    }
                                }
                            }
                        }
                    }

                    // State 2: Motherboard transition (Black carbon cylinder with cyan circuit lines!)
                    float ramAmt = clamp(uBiomeShift - 1.0, 0.0, 1.0);
                    if (ramAmt > 0.0) {
                        vec3 carbonBase = mix(vec3(0.08, 0.09, 0.12), vec3(0.14, 0.16, 0.20), noise);
                        float line = step(0.90, sin(vFaceUv.y * 6.28 * 2.0 - uTime * 4.0));
                        vec3 targetCol = mix(carbonBase, vec3(0.0, 0.98, 1.0), line * 0.72);
                        diffuseColor.rgb = mix(diffuseColor.rgb, targetCol, ramAmt);
                    }

                    vec2 edge = smoothstep(0.06, 0.0, fract(vFaceUv * 16.0)) + smoothstep(0.06, 0.0, 1.0 - fract(vFaceUv * 16.0));
                    float grid = max(edge.x, edge.y);
                    diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 0.78, grid * 0.6);
                    `;
                } else if (blockType === 'leaves') {
                    texturingCode = `
                    vec2 pixel = floor(vFaceUv * 16.0) / 16.0;
                    float noise = pixelNoise(pixel);
                    diffuseColor.rgb = mix(vec3(0.08, 0.44, 0.15), vec3(0.15, 0.58, 0.22), noise);
                    
                    // State 1: Fleshy Xenotree (0.0 to 1.0)
                    float xenoAmt = clamp(uBiomeShift, 0.0, 1.0);
                    vec3 xenoBase = vec3(0.22, 0.02, 0.32); // deep xeno violet
                    float vein = step(0.85, sin(pixel.x * 15.0 + uTime * 2.8) * cos(pixel.y * 15.0 - uTime * 2.0));
                    vec3 xenoCol = mix(xenoBase, vec3(0.95, 0.02, 0.12), vein * 0.68); // neon red veins
                    diffuseColor.rgb = mix(diffuseColor.rgb, xenoCol, xenoAmt);

                    // State 2: Motherboard transition (Semi-transparent neon data clouds!)
                    float ramAmt = clamp(uBiomeShift - 1.0, 0.0, 1.0);
                    if (ramAmt > 0.0) {
                        vec3 chipCyan = mix(vec3(0.0, 0.42, 0.48), vec3(0.0, 0.88, 1.0), noise);
                        diffuseColor.rgb = mix(diffuseColor.rgb, chipCyan, ramAmt);
                        diffuseColor.a = mix(diffuseColor.a, 0.75, ramAmt);
                    }

                    // Semi-transparent leaf clusters
                    if (noise < 0.22 && ramAmt < 0.5) {
                        diffuseColor.a = 0.35; // See-through spots
                    }
                    vec2 edge = smoothstep(0.06, 0.0, fract(vFaceUv * 16.0)) + smoothstep(0.06, 0.0, 1.0 - fract(vFaceUv * 16.0));
                    float grid = max(edge.x, edge.y);
                    diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 0.7, grid * 0.5);
                    `;
                } else if (blockType === 'water') {
                    texturingCode = `
                    vec2 pixel = floor(vFaceUv * 16.0) / 16.0;
                    float timeStep = floor(uTime * 3.5) * 0.28;
                    // Scrolling pixelated foam lines
                    float foam = step(0.85, sin(pixel.x * 8.0 + timeStep) * cos(pixel.y * 8.0 - timeStep * 0.8));
                    diffuseColor.rgb = mix(vec3(0.04, 0.45, 0.60), vec3(0.70, 0.95, 1.0), foam * 0.48);
                    
                    // State 2: Motherboard (flowing liquid gold coolant lines!)
                    float ramAmt = clamp(uBiomeShift - 1.0, 0.0, 1.0);
                    if (ramAmt > 0.0) {
                        vec3 goldCoolant = mix(vec3(0.88, 0.70, 0.05), vec3(1.0, 0.92, 0.40), foam);
                        diffuseColor.rgb = mix(diffuseColor.rgb, goldCoolant, ramAmt);
                    }
                    `;
                } else if (blockType === 'ruins') {
                    texturingCode = `
                    vec2 pixel = floor(vFaceUv * 16.0) / 16.0;
                    float noise = pixelNoise(pixel);
                    diffuseColor.rgb = mix(vec3(0.35, 0.37, 0.35), vec3(0.45, 0.47, 0.45), noise);
                    
                    // State 2: Motherboard (Hexadecimal core micro-registers!)
                    float ramAmt = clamp(uBiomeShift - 1.0, 0.0, 1.0);
                    if (ramAmt > 0.0) {
                        vec3 chipCore = mix(vec3(0.12, 0.02, 0.18), vec3(0.24, 0.04, 0.32), noise);
                        float line = step(0.85, sin(vFaceUv.x * 12.0 - uTime * 8.0) * cos(vFaceUv.y * 12.0 + uTime * 6.0));
                        vec3 targetCol = mix(chipCore, vec3(1.0, 0.18, 0.88), line * 0.78); // pulsating magenta
                        diffuseColor.rgb = mix(diffuseColor.rgb, targetCol, ramAmt);
                    }

                    float moss = pixelNoise(pixel * 3.0 + vec2(1.5));
                    if (vFaceUv.y > 0.48 && moss > 0.58 && ramAmt < 0.5) {
                        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.12, 0.38, 0.10), 0.7);
                    }
                    vec2 edge = smoothstep(0.06, 0.0, fract(vFaceUv * 16.0)) + smoothstep(0.06, 0.0, 1.0 - fract(vFaceUv * 16.0));
                    float grid = max(edge.x, edge.y);
                    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.18), grid * 0.75);
                    `;
                }

                shader.fragmentShader = shader.fragmentShader.replace(
                    `#include <color_fragment>`,
                    `#include <color_fragment>
                    ${texturingCode}`
                );
            };

            return mat;
        }
    }

    class JungleMapManager {
        constructor(scene, config) {
            this.scene = scene;
            this.config = config;
            this.chunks = new Map();
            this.voxelSize = 1.2; // 1.2 units per voxel cube
            this.chunkGrid = 16;  // 16x16 voxels wide
            this.chunkHeight = 16; // 16 voxels high
            this.chunkSize = this.chunkGrid * this.voxelSize; // 19.2 physical units
            
            this.activeChunks = new Set();
            this.viewRadius = 2; // load 5x5 chunks around player
            this.time = 0;

            window.JUNGLE_MODE = true;

            // --- 1. PRE-BUILD VOXEL MATERIALS ---
            this.materials = {
                grass: VoxelBlockMaterialFactory.createProceduralMaterial('grass'),
                dirt: VoxelBlockMaterialFactory.createProceduralMaterial('dirt'),
                sand: VoxelBlockMaterialFactory.createProceduralMaterial('sand'),
                stone: VoxelBlockMaterialFactory.createProceduralMaterial('stone'),
                wood: VoxelBlockMaterialFactory.createProceduralMaterial('wood'),
                leaves: VoxelBlockMaterialFactory.createProceduralMaterial('leaves'),
                water: VoxelBlockMaterialFactory.createProceduralMaterial('water'),
                ruins: VoxelBlockMaterialFactory.createProceduralMaterial('ruins')
            };

            this.blockGeo = new THREE.BoxGeometry(1.2, 1.2, 1.2);
        }

        update(playerPosition, delta = 0) {
            this.time += delta;

            // Rapid Biome Morphing Shift cycles: 0 to 3
            // 0 -> 1 (Jungle -> Xeno), 1 -> 2 (Xeno -> RAM), 2 -> 3 (RAM -> Jungle)
            const cycle = (this.time * 0.08) % 3.0; // cycle over ~37 seconds
            let shift = 0.0;
            if (cycle < 1.0) {
                shift = cycle; // smooth blend Jungle to Xeno
            } else if (cycle < 2.0) {
                shift = 1.0 + (cycle - 1.0); // smooth blend Xeno to RAM
            } else {
                shift = 2.0 + (cycle - 2.0) * -2.0; // rapid glitch transition back to Jungle!
            }

            // Sync materials uniforms (time & biome shift)
            Object.values(this.materials).forEach(mat => {
                if (mat.userData && mat.userData.shader) {
                    if (mat.userData.shader.uniforms.uTime) {
                        mat.userData.shader.uniforms.uTime.value = this.time;
                    }
                    if (mat.userData.shader.uniforms.uBiomeShift) {
                        mat.userData.shader.uniforms.uBiomeShift.value = shift;
                    }
                }
            });

            // Share biome shift with SkyboxJungle globally
            window.JUNGLE_BIOME_SHIFT = shift;

            const px = Math.floor(playerPosition.x / this.chunkSize);
            const pz = Math.floor(playerPosition.z / this.chunkSize);
            const currentActive = new Set();

            for (let x = px - this.viewRadius; x <= px + this.viewRadius; x++) {
                for (let z = pz - this.viewRadius; z <= pz + this.viewRadius; z++) {
                    const key = `${x},${z}`;
                    currentActive.add(key);
                    if (!this.chunks.has(key)) {
                        this._generateChunk(x, z);
                    }
                }
            }

            for (const key of this.activeChunks) {
                if (!currentActive.has(key)) this._unloadChunk(key);
            }
            this.activeChunks = currentActive;
        }

        // Return EXACT height in the 3D voxel grid at world coordinates
        getHeight(worldX, worldZ) {
            const cx = Math.floor(worldX / this.chunkSize);
            const cz = Math.floor(worldZ / this.chunkSize);
            const key = `${cx},${cz}`;
            const chunk = this.chunks.get(key);
            if (!chunk) return 0.0;

            const lx = Math.floor((worldX - cx * this.chunkSize) / this.voxelSize);
            const lz = Math.floor((worldZ - cz * this.chunkSize) / this.voxelSize);

            if (lx < 0 || lx >= this.chunkGrid || lz < 0 || lz >= this.chunkGrid) return 0.0;

            // Scan column top-down for the highest solid block (Types: grass, dirt, sand, stone, wood, ruins)
            for (let y = this.chunkHeight - 1; y >= 0; y--) {
                const bType = chunk.grid3D[(y * this.chunkGrid + lz) * this.chunkGrid + lx];
                if (bType > 0 && bType !== 7) { // 7 is water (walk-through)
                    return (y + 1) * this.voxelSize;
                }
            }
            return 0.0;
        }

        getCostAt(worldX, worldZ) {
            const cx = Math.floor(worldX / this.chunkSize);
            const cz = Math.floor(worldZ / this.chunkSize);
            const key = `${cx},${cz}`;
            const chunk = this.chunks.get(key);
            if (!chunk) return 1;

            const lx = Math.floor((worldX - cx * this.chunkSize) / this.voxelSize);
            const lz = Math.floor((worldZ - cz * this.chunkSize) / this.voxelSize);

            if (lx < 0 || lx >= this.chunkGrid || lz < 0 || lz >= this.chunkGrid) return 1;

            // If highest block is wood trunk, leaves, or ruins, set impassable
            const gh = Math.floor(this.getHeight(worldX, worldZ) / this.voxelSize) - 1;
            if (gh >= 0 && gh < this.chunkHeight) {
                const bType = chunk.grid3D[(gh * this.chunkGrid + lz) * this.chunkGrid + lx];
                if (bType === 5 || bType === 6 || bType === 9) return 255;
            }
            return 1;
        }

        _generateChunk(cx, cz) {
            const key = `${cx},${cz}`;
            const worldOffsetX = cx * this.chunkSize;
            const worldOffsetZ = cz * this.chunkSize;

            const grid3D = new Uint8Array(this.chunkGrid * this.chunkGrid * this.chunkHeight);

            // 1. Procedural 3D Terrain Height Generation
            const terrainHeights = new Uint8Array(this.chunkGrid * this.chunkGrid);
            for (let lz = 0; lz < this.chunkGrid; lz++) {
                for (let lx = 0; lx < this.chunkGrid; lx++) {
                    const wx = lx * this.voxelSize + worldOffsetX;
                    const wz = lz * this.voxelSize + worldOffsetZ;
                    
                    // Smooth stepped hills (FBM pattern)
                    let v = 0.0;
                    let a = 0.5;
                    let px = wx * 0.006;
                    let pz = wz * 0.006;
                    for (let n = 0; n < 3; n++) {
                        v += a * Math.sin(px * 8.0) * Math.cos(pz * 8.0);
                        px *= 2.0;
                        pz *= 2.0;
                        a *= 0.5;
                    }
                    // Height snaps to integer block index: 2 to 9 blocks
                    let hVal = Math.floor((v * 0.5 + 0.5) * 7.0) + 2;
                    terrainHeights[lz * this.chunkGrid + lx] = hVal;
                }
            }

            // 2. Fill the 3D Voxel Grid
            const waterLevel = 4; // Water table at Y=4 blocks

            for (let lz = 0; lz < this.chunkGrid; lz++) {
                for (let lx = 0; lx < this.chunkGrid; lx++) {
                    const hVal = terrainHeights[lz * this.chunkGrid + lx];

                    for (let y = 0; y < this.chunkHeight; y++) {
                        const idx = (y * this.chunkGrid + lz) * this.chunkGrid + lx;

                        if (y < hVal) {
                            if (y === hVal - 1) {
                                // Shoreline transition to sand
                                if (hVal <= waterLevel + 1) {
                                    grid3D[idx] = 4; // Sand Block
                                } else {
                                    grid3D[idx] = 1; // Grass Block
                                }
                            } else if (y >= hVal - 3) {
                                grid3D[idx] = 2; // Dirt Block
                            } else {
                                grid3D[idx] = 3; // Stone Block
                            }
                        } else if (y < waterLevel) {
                            grid3D[idx] = 7; // Voxel Water Block
                        }
                    }
                }
            }

            // 3. Grow 10 Types of Trees and Ruins procedurally!
            for (let lz = 2; lz < this.chunkGrid - 2; lz++) {
                for (let lx = 2; lx < this.chunkGrid - 2; lx++) {
                    const hVal = terrainHeights[lz * this.chunkGrid + lx];
                    const wx = lx * this.voxelSize + worldOffsetX;
                    const wz = lz * this.voxelSize + worldOffsetZ;

                    // Avoid spawning trees at spawn landing coordinates
                    if (cx === 0 && cz === 0 && Math.sqrt(wx * wx + wz * wz) < 12.0) continue;

                    const hash = hash2D(cx * 123 + lx, cz * 456 + lz);

                    // 15% spawn chance, grass blocks only
                    if (hash < 0.15 && hVal > waterLevel + 1) {
                        const treeType = Math.floor(hash * 66.6) % 10; // Select from 10 tree types!
                        
                        if (treeType === 0) {
                            // --- 1. CLASSIC OAK ---
                            const tHeight = 5;
                            for (let th = 0; th < tHeight; th++) {
                                grid3D[((hVal + th) * this.chunkGrid + lz) * this.chunkGrid + lx] = 5; // Wood
                            }
                            this._fillLeavesSphere(grid3D, lx, hVal + tHeight - 1, lz, 2);
                            
                        } else if (treeType === 1) {
                            // --- 2. TALL REDWOOD ---
                            const tHeight = 9;
                            for (let th = 0; th < tHeight; th++) {
                                grid3D[((hVal + th) * this.chunkGrid + lz) * this.chunkGrid + lx] = 5;
                            }
                            // Conical leaves top
                            this._fillLeavesConic(grid3D, lx, hVal + 3, tHeight - 3, lz);

                        } else if (treeType === 2) {
                            // --- 3. CYBER-CRYSTAL SPIRE ---
                            const tHeight = 7;
                            for (let th = 0; th < tHeight; th++) {
                                grid3D[((hVal + th) * this.chunkGrid + lz) * this.chunkGrid + lx] = 9; // Ruins/Spire block
                            }
                            // Ring of leaves at mid-height
                            this._fillLeavesRing(grid3D, lx, hVal + 3, lz, 2);

                        } else if (treeType === 3) {
                            // --- 4. UMBRELLA CANOPY ---
                            const tHeight = 6;
                            for (let th = 0; th < tHeight; th++) {
                                grid3D[((hVal + th) * this.chunkGrid + lz) * this.chunkGrid + lx] = 5;
                            }
                            // Flat umbrella top
                            this._fillLeavesUmbrella(grid3D, lx, hVal + tHeight - 1, lz, 3);

                        } else if (treeType === 4) {
                            // --- 5. WEEPING WILLOW ---
                            const tHeight = 5;
                            for (let th = 0; th < tHeight; th++) {
                                grid3D[((hVal + th) * this.chunkGrid + lz) * this.chunkGrid + lx] = 5;
                            }
                            this._fillLeavesWillow(grid3D, lx, hVal + tHeight - 1, lz);

                        } else if (treeType === 5) {
                            // --- 6. SHRUB BUSH ---
                            grid3D[(hVal * this.chunkGrid + lz) * this.chunkGrid + lx] = 5; // tiny wood base
                            this._fillLeavesSphere(grid3D, lx, hVal + 1, lz, 1);

                        } else if (treeType === 6) {
                            // --- 7. BAMBOO SHOOTS ---
                            const tHeight = 8;
                            for (let th = 0; th < tHeight; th++) {
                                grid3D[((hVal + th) * this.chunkGrid + lz) * this.chunkGrid + lx] = 5; // wood stalk
                            }
                            grid3D[((hVal + tHeight) * this.chunkGrid + lz) * this.chunkGrid + lx] = 6; // leaves top

                        } else if (treeType === 7) {
                            // --- 8. SPRAWLING MANGROVE ---
                            grid3D[(hVal * this.chunkGrid + lz) * this.chunkGrid + lx] = 5; // main root
                            // Sprout 4 diagonal wood branches
                            const branchOffsets = [[1,1], [-1,1], [1,-1], [-1,-1]];
                            branchOffsets.forEach(offset => {
                                const bx = lx + offset[0];
                                const bz = lz + offset[1];
                                grid3D[((hVal + 1) * this.chunkGrid + bz) * this.chunkGrid + bx] = 5;
                                grid3D[((hVal + 2) * this.chunkGrid + bz) * this.chunkGrid + bx] = 5;
                                this._fillLeavesSphere(grid3D, bx, hVal + 3, bz, 1);
                            });

                        } else if (treeType === 8) {
                            // --- 9. DOUBLE CANOPY ---
                            const tHeight = 8;
                            for (let th = 0; th < tHeight; th++) {
                                grid3D[((hVal + th) * this.chunkGrid + lz) * this.chunkGrid + lx] = 5;
                            }
                            this._fillLeavesSphere(grid3D, lx, hVal + 3, lz, 1.5);
                            this._fillLeavesSphere(grid3D, lx, hVal + 7, lz, 2);

                        } else if (treeType === 9) {
                            // --- 10. FRACTAL CROSS ---
                            const tHeight = 6;
                            for (let th = 0; th < tHeight; th++) {
                                grid3D[((hVal + th) * this.chunkGrid + lz) * this.chunkGrid + lx] = 5;
                            }
                            // Cross branches
                            grid3D[((hVal + 3) * this.chunkGrid + lz) * this.chunkGrid + lx + 1] = 5;
                            grid3D[((hVal + 3) * this.chunkGrid + lz) * this.chunkGrid + lx - 1] = 5;
                            grid3D[((hVal + 3) * this.chunkGrid + lz + 1) * this.chunkGrid + lx] = 5;
                            grid3D[((hVal + 3) * this.chunkGrid + lz - 1) * this.chunkGrid + lx] = 5;
                            this._fillLeavesSphere(grid3D, lx, hVal + 5, lz, 2);
                        }

                    // Grow Ancient mossy ruins pillars (8% spawn chance)
                    } else if (hash < 0.23 && hVal > waterLevel + 1) {
                        const pillarHeight = 3 + Math.floor(hash * 4.0); // 3 to 6 blocks high
                        for (let ph = 0; ph < pillarHeight; ph++) {
                            const y = hVal + ph;
                            if (y < this.chunkHeight) {
                                grid3D[(y * this.chunkGrid + lz) * this.chunkGrid + lx] = 9; // Ruins Block
                            }
                        }
                    }
                }
            }

            // 4. Render Grid into InstancedMeshes (Extremely high-fidelity GPU optimization!)
            const chunkGroup = new THREE.Group();
            chunkGroup.position.set(worldOffsetX, 0, worldOffsetZ);
            this.scene.add(chunkGroup);

            // Palette materials map
            const typeToKey = {
                1: 'grass', 2: 'dirt', 3: 'stone', 4: 'sand',
                5: 'wood', 6: 'leaves', 7: 'water', 9: 'ruins'
            };

            // Count occurrences of each block type
            const counts = {};
            for (let i = 0; i < grid3D.length; i++) {
                const bType = grid3D[i];
                if (bType > 0) {
                    counts[bType] = (counts[bType] || 0) + 1;
                }
            }

            // Create InstancedMeshes per block type in the chunk
            const instancedMeshes = {};
            Object.keys(counts).forEach(bTypeStr => {
                const bType = parseInt(bTypeStr);
                const matKey = typeToKey[bType];
                if (matKey) {
                    const count = counts[bType];
                    const imesh = new THREE.InstancedMesh(this.blockGeo, this.materials[matKey], count);
                    imesh.castShadow = (bType !== 7); // No shadows for water blocks
                    imesh.receiveShadow = true;
                    chunkGroup.add(imesh);
                    instancedMeshes[bType] = { mesh: imesh, currentCount: 0 };
                }
            });

            // Position each instance perfectly in 3D grid
            const dummy = new THREE.Object3D();
            for (let y = 0; y < this.chunkHeight; y++) {
                for (let lz = 0; lz < this.chunkGrid; lz++) {
                    for (let lx = 0; lx < this.chunkGrid; lx++) {
                        const bType = grid3D[(y * this.chunkGrid + lz) * this.chunkGrid + lx];
                        if (bType > 0 && instancedMeshes[bType]) {
                            const cellX = lx * this.voxelSize + this.voxelSize * 0.5;
                            const cellY = y * this.voxelSize + this.voxelSize * 0.5;
                            const cellZ = lz * this.voxelSize + this.voxelSize * 0.5;

                            dummy.position.set(cellX, cellY, cellZ);
                            dummy.scale.set(1.0, 1.0, 1.0);
                            dummy.rotation.set(0, 0, 0);
                            dummy.updateMatrix();

                            const entry = instancedMeshes[bType];
                            entry.mesh.setMatrixAt(entry.currentCount++, dummy.matrix);
                        }
                    }
                }
            }

            // Mark meshes as dirty for GPU update
            Object.values(instancedMeshes).forEach(entry => {
                entry.mesh.instanceMatrix.needsUpdate = true;
            });

            this.chunks.set(key, {
                group: chunkGroup,
                grid3D: grid3D,
                meshes: Object.values(instancedMeshes).map(entry => entry.mesh)
            });
        }

        // --- TREE FILLER UTILITIES ---
        _fillLeavesSphere(grid3D, cx, cy, cz, radius) {
            const radSq = radius * radius;
            for (let dy = -Math.ceil(radius); dy <= Math.ceil(radius); dy++) {
                for (let dz = -Math.ceil(radius); dz <= Math.ceil(radius); dz++) {
                    for (let dx = -Math.ceil(radius); dx <= Math.ceil(radius); dx++) {
                        const lx = cx + dx;
                        const ly = cy + dy;
                        const lz = cz + dz;
                        if (lx >= 0 && lx < this.chunkGrid && ly >= 0 && ly < this.chunkHeight && lz >= 0 && lz < this.chunkGrid) {
                            if (dx*dx + dy*dy + dz*dz <= radSq) {
                                const idx = (ly * this.chunkGrid + lz) * this.chunkGrid + lx;
                                if (grid3D[idx] === 0) grid3D[idx] = 6; // Leaves
                            }
                        }
                    }
                }
            }
        }

        _fillLeavesConic(grid3D, cx, startY, height, cz) {
            for (let dy = 0; dy < height; dy++) {
                const ly = startY + dy;
                // Cone narrows as Y height increases
                const radius = (height - dy) * 0.4 + 0.6;
                const radSq = radius * radius;
                for (let dz = -Math.ceil(radius); dz <= Math.ceil(radius); dz++) {
                    for (let dx = -Math.ceil(radius); dx <= Math.ceil(radius); dx++) {
                        const lx = cx + dx;
                        const lz = cz + dz;
                        if (lx >= 0 && lx < this.chunkGrid && ly >= 0 && ly < this.chunkHeight && lz >= 0 && lz < this.chunkGrid) {
                            if (dx*dx + dz*dz <= radSq) {
                                const idx = (ly * this.chunkGrid + lz) * this.chunkGrid + lx;
                                if (grid3D[idx] === 0) grid3D[idx] = 6;
                            }
                        }
                    }
                }
            }
        }

        _fillLeavesRing(grid3D, cx, cy, cz, radius) {
            for (let dz = -radius; dz <= radius; dz++) {
                for (let dx = -radius; dx <= radius; dx++) {
                    if (Math.abs(dx) + Math.abs(dz) === radius) {
                        const lx = cx + dx;
                        const lz = cz + dz;
                        if (lx >= 0 && lx < this.chunkGrid && cy >= 0 && cy < this.chunkHeight && lz >= 0 && lz < this.chunkGrid) {
                            const idx = (cy * this.chunkGrid + lz) * this.chunkGrid + lx;
                            if (grid3D[idx] === 0) grid3D[idx] = 6;
                        }
                    }
                }
            }
        }

        _fillLeavesUmbrella(grid3D, cx, cy, cz, radius) {
            for (let dz = -radius; dz <= radius; dz++) {
                for (let dx = -radius; dx <= radius; dx++) {
                    const lx = cx + dx;
                    const lz = cz + dz;
                    if (lx >= 0 && lx < this.chunkGrid && cy >= 0 && cy < this.chunkHeight && lz >= 0 && lz < this.chunkGrid) {
                        if (dx*dx + dz*dz <= radius*radius) {
                            const idx = (cy * this.chunkGrid + lz) * this.chunkGrid + lx;
                            if (grid3D[idx] === 0) grid3D[idx] = 6;
                        }
                    }
                }
            }
        }

        _fillLeavesWillow(grid3D, cx, cy, cz) {
            this._fillLeavesSphere(grid3D, cx, cy, cz, 2);
            // Append hanging vines/leaves on the edges
            const hangingOffsets = [[2,0], [-2,0], [0,2], [0,-2]];
            hangingOffsets.forEach(offset => {
                const lx = cx + offset[0];
                const lz = cz + offset[1];
                for (let dy = -1; dy >= -3; dy--) {
                    const ly = cy + dy;
                    if (lx >= 0 && lx < this.chunkGrid && ly >= 0 && ly < this.chunkHeight && lz >= 0 && lz < this.chunkGrid) {
                        const idx = (ly * this.chunkGrid + lz) * this.chunkGrid + lx;
                        if (grid3D[idx] === 0) grid3D[idx] = 6;
                    }
                }
            });
        }

        _unloadChunk(key) {
            const chunk = this.chunks.get(key);
            if (chunk) {
                this.scene.remove(chunk.group);
                if (chunk.meshes) {
                    chunk.meshes.forEach(m => {
                        m.dispose();
                    });
                }
                this.chunks.delete(key);
            }
        }

        dispose() {
            Object.values(this.materials).forEach(m => {
                if (m) m.dispose();
            });
            this.blockGeo.dispose();

            for (const key of this.chunks.keys()) {
                this._unloadChunk(key);
            }
            this.chunks.clear();
            this.activeChunks.clear();

            window.JUNGLE_MODE = false;
        }
    }

    return JungleMapManager;
})();
