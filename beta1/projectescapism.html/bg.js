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
                return;
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

                // Hash function for randomness
                float hash(vec2 p) {
                    return fract(sin(dot(p, vec3(127.1, 311.7, 74.7).xy)) * 43758.5453);
                }

                void main() {
                    vec2 uv = (gl_FragCoord.xy * 2.0 - uResolution.xy) / min(uResolution.y, uResolution.x);
                    
                    // Perspective transformation
                    float z = 1.0 / (uv.y + 2.0);
                    vec2 p = vec2(uv.x * z, z);
                    
                    // Scrolling speed
                    p.y += uTime * 0.15;
                    p.x += sin(uTime * 0.1) * 0.05;

                    // Grid Logic
                    vec2 g = fract(p * 8.0);
                    vec2 id = floor(p * 8.0);
                    
                    // Grid lines
                    float grid = smoothstep(0.02, 0.0, abs(g.x - 0.5)) + smoothstep(0.02, 0.0, abs(g.y - 0.5));
                    
                    // Neural Pulses (Refined)
                    float pulse = sin(id.y * 0.5 - uTime * 4.0) * 0.5 + 0.5;
                    pulse *= sin(id.x * 0.2 + uTime * 2.0) * 0.5 + 0.5;
                    pulse = pow(pulse, 3.0); // Sharper pulses
                    
                    // Intersections / Nodes
                    float node = smoothstep(0.15, 0.0, length(g - 0.5));
                    
                    // Chromatic Aberration Simulation
                    float r = grid + node * pulse * 2.0;
                    float g_pulse = sin(id.y * 0.5 - (uTime + 0.02) * 4.0) * 0.5 + 0.5;
                    float b_pulse = sin(id.y * 0.5 - (uTime + 0.04) * 4.0) * 0.5 + 0.5;
                    
                    // Color composition
                    vec3 col = uColor * r * 0.3;
                    col.r *= 1.2;
                    col.b *= 0.8;
                    col += uColor * node * pulse * 2.0;
                    
                    // Atmosphere / Glow
                    float glow = exp(-length(uv) * 0.8);
                    col += uColor * glow * 0.1;
                    
                    // Depth fade
                    col *= smoothstep(-1.0, 1.5, uv.y + 1.0);
                    
                    // Scanlines
                    float scanline = sin(gl_FragCoord.y * 1.5) * 0.04;
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
