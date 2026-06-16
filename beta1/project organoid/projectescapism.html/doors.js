// doors.js
// Adds a custom shader overlay & animation for purchasable doors (gray areas)
(function(){
    const Doors = {
        active: new Set(),
        allMaterials: new Set(),
        applyDoorShader(mesh, opts = {}) {
            if (!mesh || !THREE) return;
            if (mesh.userData.__doorShaderApplied) return;

            // store original material
            mesh.userData._origMaterial = mesh.material;

            const baseColor = opts.baseColor || new THREE.Color(0x222233);
            const edgeColor = opts.edgeColor || new THREE.Color(0x00ffe5);

            const mat = new THREE.ShaderMaterial({
                uniforms: {
                    uTime: { value: 0 },
                    uProgress: { value: 0 },
                    uBaseColor: { value: new THREE.Vector3(baseColor.r, baseColor.g, baseColor.b) },
                    uEdgeColor: { value: new THREE.Vector3(edgeColor.r, edgeColor.g, edgeColor.b) },
                    uNoiseScale: { value: 5.0 }
                },
                vertexShader: `
                    varying vec2 vUv;
                    varying vec3 vPosition;
                    uniform float uTime;
                    uniform float uProgress;

                    // Simple hash for pseudo-random numbers
                    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453123); }

                    void main() {
                        vUv = uv;
                        vPosition = position;
                        
                        vec3 pos = position;
                        if (uProgress > 0.0) {
                            // Jitter envelope: peaks in middle of dissolve, vanishes at start and end
                            float envelope = sin(uProgress * 3.14159265);
                            
                            // Segment-based horizontal displacement (holographic tearing)
                            float segment = floor(position.y * 8.0);
                            float jitter = hash(vec2(segment, floor(uTime * 20.0))) * 2.0 - 1.0;
                            
                            // Glitch trigger
                            float glitchActive = step(0.65, hash(vec2(floor(uTime * 12.0), 98.76)));
                            
                            // Apply horizontal glitch tearing
                            pos.x += jitter * 0.16 * envelope * glitchActive;
                            pos.z += jitter * 0.16 * envelope * glitchActive;
                            
                            // Soft vertical ripple
                            pos.y += sin(position.x * 6.0 + uTime * 8.0) * 0.04 * envelope;
                        }
                        
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                    }
                `,
                fragmentShader: `
                    varying vec2 vUv;
                    varying vec3 vPosition;
                    uniform float uTime;
                    uniform float uProgress;
                    uniform vec3 uBaseColor;
                    uniform vec3 uEdgeColor;
                    uniform float uNoiseScale;

                    // 2D noise
                    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453123); }
                    float noise(vec2 p) {
                        vec2 i = floor(p);
                        vec2 f = fract(p);
                        float a = hash(i + vec2(0.0,0.0));
                        float b = hash(i + vec2(1.0,0.0));
                        float c = hash(i + vec2(0.0,1.0));
                        float d = hash(i + vec2(1.0,1.0));
                        vec2 u = f*f*(3.0-2.0*f);
                        return mix(a, b, u.x) + (c - a)*u.y*(1.0 - u.x) + (d - b)*u.x*u.y;
                    }

                    // 3-octave Fractional Brownian Motion (fbm)
                    float fbm(vec2 p) {
                        float v = 0.0;
                        float a = 0.5;
                        vec2 shift = vec2(100.0);
                        mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
                        for (int i = 0; i < 3; ++i) {
                            v += a * noise(p);
                            p = rot * p * 2.0 + shift;
                            a *= 0.5;
                        }
                        return v;
                    }

                    void main() {
                        // Moving scanlines
                        float scanline = sin(vUv.y * 140.0 - uTime * 12.0) * 0.12 + 0.88;
                        
                        // Cybernetic grid overlay
                        float gridX = step(0.96, fract(vUv.x * 20.0));
                        float gridY = step(0.96, fract(vUv.y * 12.0));
                        float grid = max(gridX, gridY);
                        
                        // Progress maps from 0.0 to 1.3 to ensure full dissolve
                        float threshold = uProgress * 1.35;
                        
                        // Blend vertical height coordinate with layered noise
                        float n = fbm(vUv * uNoiseScale + vec2(uTime * 0.1, uTime * 0.05)) * 0.35 + vUv.y * 0.65;
                        
                        // Discard fragments below the threshold
                        if (n < threshold) {
                            discard;
                        }
                        
                        vec3 col = uBaseColor;
                        
                        // Apply grid details
                        col = mix(col, uEdgeColor, grid * 0.4);
                        
                        // Apply scanlines
                        col *= scanline;
                        
                        // High-intensity edge burning glow line
                        float edgeDist = n - threshold;
                        if (edgeDist < 0.12) {
                            float borderGlow = smoothstep(0.12, 0.0, edgeDist);
                            
                            // Pulse color between EdgeColor (cyan) and Magenta energy
                            vec3 pulseColor = mix(uEdgeColor, vec3(1.0, 0.02, 0.60), sin(uTime * 8.0 + vPosition.y * 4.0) * 0.5 + 0.5);
                            col = mix(col, pulseColor * 3.5, borderGlow);
                        }
                        
                        // Ambient rim glow fading with progress
                        float rim = smoothstep(0.7, 0.0, length(vUv - 0.5));
                        col += uEdgeColor * 0.15 * rim * (1.0 - uProgress);
                        
                        // Smoothly fade transparency right before disappearing
                        float finalAlpha = smoothstep(1.0, 0.85, uProgress);
                        
                        gl_FragColor = vec4(col, finalAlpha);
                    }
                `,
                transparent: true,
                depthWrite: true
            });

            mesh.material = mat;
            mesh.userData.__doorShaderApplied = true;
            mesh.userData.__doorShaderMaterial = mat;

            Doors.allMaterials.add(mat);
        },

        openDoor(mesh, id) {
            if (!mesh || !mesh.userData || !mesh.userData.__doorShaderMaterial) return;
            const mat = mesh.userData.__doorShaderMaterial;
            if (!mat) return;
            Doors.active.add(mat);

            // Extract geometry dimensions safely
            let width = 4, height = 4, depth = 4;
            if (mesh.geometry && mesh.geometry.parameters) {
                width = mesh.geometry.parameters.width || 4;
                height = mesh.geometry.parameters.height || 4;
                depth = mesh.geometry.parameters.depth || 4;
            } else if (mesh.geometry) {
                if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
                const box = mesh.geometry.boundingBox;
                width = box.max.x - box.min.x;
                height = box.max.y - box.min.y;
                depth = box.max.z - box.min.z;
            }

            // At start, emit a gorgeous burst of cybernetic particles
            if (typeof window.emitParticle === 'function') {
                for (let i = 0; i < 35; i++) {
                    const px = mesh.position.x + (Math.random() - 0.5) * width;
                    const py = mesh.position.y + (Math.random() - 0.5) * height;
                    const pz = mesh.position.z + (Math.random() - 0.5) * depth;
                    const vx = (Math.random() - 0.5) * 8.0;
                    const vy = (Math.random() - 0.5) * 8.0;
                    const vz = (Math.random() - 0.5) * 8.0;
                    
                    const r = Math.random() > 0.5 ? 0.0 : 1.0;
                    const g = Math.random() > 0.5 ? 0.9 : 0.02;
                    const b = Math.random() > 0.5 ? 1.0 : 0.60;
                    const size = 0.2 + Math.random() * 0.25;
                    const life = 0.7 + Math.random() * 0.9;
                    window.emitParticle(px, py, pz, vx, vy, vz, r, g, b, size, life);
                }
            }

            // animate uProgress from 0 -> 1 over 1600ms
            const start = performance.now();
            const duration = 1600;
            function step(now){
                const t = Math.min(1, (now - start) / duration);
                mat.uniforms.uProgress.value = t;
                mat.uniforms.uTime.value = now * 0.001;

                // Emit disintegration boundary particles
                if (t < 1) {
                    const currentY = mesh.position.y - height/2 + t * height;
                    const particleCount = Math.floor(Math.random() * 4) + 3; // 3 to 6 particles per frame
                    for (let i = 0; i < particleCount; i++) {
                        const px = mesh.position.x + (Math.random() - 0.5) * width;
                        const pz = mesh.position.z + (Math.random() - 0.5) * depth;
                        const py = currentY + (Math.random() - 0.5) * 0.15;
                        
                        const vx = (Math.random() - 0.5) * 4.5;
                        const vy = Math.random() * 4.0 + 2.0; // fly upwards
                        const vz = (Math.random() - 0.5) * 4.5;
                        
                        const r = Math.random() > 0.5 ? 0.0 : 1.0;
                        const g = Math.random() > 0.5 ? 0.9 : 0.02;
                        const b = Math.random() > 0.5 ? 1.0 : 0.60;
                        
                        const size = 0.15 + Math.random() * 0.2;
                        const life = 0.4 + Math.random() * 0.7;
                        
                        if (typeof window.emitParticle === 'function') {
                            window.emitParticle(px, py, pz, vx, vy, vz, r, g, b, size, life);
                        }
                    }
                    requestAnimationFrame(step);
                } else {
                    // finalize: remove mesh
                    try {
                        if (mesh.parent) mesh.parent.remove(mesh);
                    } catch(e) {}
                    Doors.active.delete(mat);
                    Doors.allMaterials.delete(mat);
                }
            }
            requestAnimationFrame(step);
        }
    };

    // keep updating time uniform for all active materials (static and dissolving)
    function tick(now){
        Doors.allMaterials.forEach(mat => {
            if (mat && mat.uniforms && mat.uniforms.uTime) mat.uniforms.uTime.value = now * 0.001;
        });
        requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);

    window.Doors = Doors;
})();
