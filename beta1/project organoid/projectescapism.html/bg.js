/**
 * PROJECT ESCAPISM — SHADER GRID BACKGROUND
 * High-performance WebGL/Three.js grid background for the Main Menu.
 * Features: 3D perspective grid, neural pulse waves, and scanline effects.
 */

const MenuBG = {
    renderer: null,
    scene: null,
    camera: null,
    material: null,
    mesh: null,
    active: false,
    clock: null,

    init: function(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        // Create specialized canvas for the background
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'menu-bg-canvas';
        this.canvas.style.position = 'absolute';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.zIndex = '0'; // Behind the 2D menu canvas
        container.insertBefore(this.canvas, container.firstChild);

        // Setup Three.js
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.z = 5;

        try {
            this.renderer = new THREE.WebGLRenderer({
                canvas: this.canvas,
                antialias: true,
                alpha: true
            });
        } catch (e) {
            console.warn("MenuBG: WebGLRenderer context creation failed. Retrying with basic options...", e);
            try {
                this.renderer = new THREE.WebGLRenderer({
                    canvas: this.canvas,
                    antialias: false,
                    alpha: true
                });
            } catch (e2) {
                console.error("MenuBG: WebGL context creation failed entirely.", e2);
                if (typeof showWebGLFallbackOverlay === 'function') {
                    showWebGLFallbackOverlay(e2.message || e2);
                }
                this.renderer = {
                    setSize: function() {},
                    setPixelRatio: function() {},
                    render: function() {}
                };
            }
        }
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        this.clock = new THREE.Clock();

        // Shader Material for the Super Cool Grid
        this.material = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
                uColor: { value: new THREE.Color(0x00ff88) }, // Emerald Cyberpunk
                uMouse: { value: new THREE.Vector2(0.5, 0.5) }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform float uTime;
                uniform vec2 uResolution;
                uniform vec3 uColor;
                uniform vec2 uMouse;
                varying vec2 vUv;

                // 3D Distance field function for undulating wave layers
                float map(vec3 p) {
                    // Wavy surface deforming along X and Z
                    float w1 = sin(p.x * 0.5 + uTime * 0.4) * cos(p.z * 0.4 + uTime * 0.3) * 0.6;
                    float w2 = sin(p.x * 1.3 - uTime * 0.7) * cos(p.z * 1.0 + uTime * 0.5) * 0.15;
                    float wave = w1 + w2;
                    
                    // Periodic swell/amplitude modulation ("sometimes")
                    float pulse = sin(uTime * 0.25) * 0.5 + 0.5;
                    wave *= 0.6 + pulse * 0.6;
                    
                    return p.y - wave;
                }

                // Compute normal via central differences
                vec3 calcNormal(vec3 p) {
                    const vec2 h = vec2(0.002, 0.0);
                    return normalize(vec3(
                        map(p + h.xyy) - map(p - h.xyy),
                        map(p + h.yxy) - map(p - h.yxy),
                        map(p + h.yyx) - map(p - h.yyx)
                    ));
                }

                void main() {
                    // Normalize coordinates from -1 to 1
                    vec2 uv = (gl_FragCoord.xy * 2.0 - uResolution.xy) / min(uResolution.y, uResolution.x);
                    
                    // Ray origin (camera) with smooth mouse drift
                    vec3 ro = vec3(0.0, 1.5, -6.0);
                    vec2 mouseOffset = (uMouse - 0.5) * 0.4;
                    ro.x += mouseOffset.x * 3.0;
                    ro.y += mouseOffset.y * 1.5;
                    
                    // Ray direction
                    vec3 rd = normalize(vec3(uv, 1.6));
                    
                    // Slightly tilt the ray downwards to view the waves
                    float pitch = -0.2;
                    float cosP = cos(pitch);
                    float sinP = sin(pitch);
                    float tempY = rd.y * cosP - rd.z * sinP;
                    float tempZ = rd.y * sinP + rd.z * cosP;
                    rd.y = tempY;
                    rd.z = tempZ;
                    
                    // Raymarch the wave surface
                    float t = 0.0;
                    float maxT = 16.0;
                    bool hit = false;
                    vec3 p;
                    
                    for (int i = 0; i < 48; i++) {
                        p = ro + rd * t;
                        float h = map(p);
                        if (h < 0.002) {
                            hit = true;
                            break;
                        }
                        t += h;
                        if (t > maxT) break;
                    }
                    
                    // Ambient backwall tint - extremely subtle deep emerald gradient
                    vec3 backwallColor = vec3(0.002, 0.008, 0.006);
                    float glowFactor = exp(-length(uv - vec2(0.0, 0.4)) * 0.7);
                    vec3 background = backwallColor * (glowFactor * 1.5 + 0.2);
                    
                    vec3 col = vec3(0.0);
                    
                    if (hit) {
                        vec3 n = calcNormal(p);
                        vec3 lightDir = normalize(vec3(1.0, 3.5, -2.0));
                        
                        // Fresnel edge reflection for glowing waves
                        float fre = pow(clamp(1.0 + dot(rd, n), 0.0, 1.0), 4.5);
                        
                        // Specular highlights to simulate a glossy black liquid/oil texture
                        vec3 ref = reflect(rd, n);
                        float spec = pow(max(0.0, dot(ref, lightDir)), 24.0);
                        
                        // Solid black wave body with uColor neon edge highlights
                        col = vec3(0.001, 0.001, 0.002);
                        col += uColor * fre * 0.45;
                        col += vec3(1.0) * spec * 0.2;

                        // Pulse cyber-grid lines along the Glossy Wave Surface
                        float gridLines = step(0.97, cos(p.x * 2.2)) + step(0.97, cos(p.z * 2.2));
                        float gridPulse = sin(uTime * 2.0 - length(p.xz) * 0.35) * 0.35 + 0.65;
                        col += uColor * gridLines * 0.45 * gridPulse;
                        
                        // Fog out into the background in the distance
                        float fog = smoothstep(0.0, 1.0, t / maxT);
                        col = mix(col, background, fog);
                    } else {
                        col = background;
                    }
                    
                    // Scanlines
                    float scanline = sin(gl_FragCoord.y * 1.5) * 0.015;
                    col -= scanline;
                    
                    // Vignette
                    float vignette = smoothstep(1.5, 0.5, length(uv));
                    col *= vignette;
                    
                    gl_FragColor = vec4(col, 1.0);
                }
            `,
            transparent: true,
            side: THREE.DoubleSide
        });

        const geometry = new THREE.PlaneGeometry(20, 20);
        this.mesh = new THREE.Mesh(geometry, this.material);
        this.mesh.rotation.x = -Math.PI / 2.5;
        this.mesh.position.y = -1;
        this.scene.add(this.mesh);

        this.active = true;
        window.addEventListener('resize', () => this.resize());
        window.addEventListener('mousemove', (e) => {
            this.material.uniforms.uMouse.value.set(e.clientX / window.innerWidth, 1.0 - e.clientY / window.innerHeight);
        });

        this.animate();
    },

    resize: function() {
        if (!this.active) return;
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.material.uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
    },

    animate: function() {
        if (!this.active) return;
        requestAnimationFrame(() => this.animate());

        const delta = this.clock.getElapsedTime();
        this.material.uniforms.uTime.value = delta;

        // Subtle camera movement
        this.camera.position.x = Math.sin(delta * 0.5) * 0.5;
        this.camera.lookAt(0, 0, 0);

        this.renderer.render(this.scene, this.camera);
    },

    stop: function() {
        this.active = false;
        if (this.canvas && this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }
    }
};

window.MenuBG = MenuBG;
