/**
 * world.js
 * Manages the advanced environment, shaders, and particle systems.
 */

const SDF_VERTEX_SHADER = `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = vec4(position, 1.0);
    }
`;

const SDF_FRAGMENT_SHADER = `
    varying vec2 vUv;
    uniform float iTime;
    uniform vec2 iResolution;
    uniform vec2 shipPos;
    uniform float warpFactor;

    mat2 rot(float a) {
        float s = sin(a), c = cos(a);
        return mat2(c, -s, s, c);
    }

    // Hash function for noise
    float hash(vec3 p) {
        p = fract(p * 0.3183099 + .1);
        p *= 17.0;
        return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
    }

    // 3D Noise
    float noise(vec3 x) {
        vec3 i = floor(x);
        vec3 f = fract(x);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
                       mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
                   mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
                       mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
    }

    void main() {
        vec2 uv = (vUv - 0.5) * 2.0;
        uv.x *= iResolution.x / iResolution.y;

        // Space Warp Distortion
        float dist = length(uv);
        uv *= 1.0 + pow(dist, 2.0) * (0.2 + warpFactor * 0.5);

        // Camera direction
        vec3 rd = normalize(vec3(uv, -1.0));
        rd.xy *= rot(shipPos.x * 0.01 + sin(iTime * 0.2) * 0.05);
        rd.xz *= rot(shipPos.y * 0.01 + cos(iTime * 0.1) * 0.05);

        // Volumetric Fractal Nebula
        vec3 ro = vec3(shipPos.x * 0.01, shipPos.y * 0.01, iTime * 1.5);
        vec3 col = vec3(0.01, 0.01, 0.02);
        
        float t = iTime * 0.1;
        float layers = 0.0;
        for(int i = 1; i < 5; i++) {
            float f = float(i);
            vec3 p = ro + rd * (f * 2.0);
            layers += noise(p * 0.5 + t) / f;
        }

        // Color Palette (Cyan / Magenta / Deep Blue)
        vec3 baseColor = mix(vec3(0.0, 0.5, 1.0), vec3(1.0, 0.0, 0.8), sin(iTime * 0.1) * 0.5 + 0.5);
        col += baseColor * layers * 0.3;

        // Sparkle Stars
        float stars = pow(noise(rd * 100.0), 20.0);
        col += vec3(stars) * (0.5 + 0.5 * sin(iTime * 5.0 + rd.x * 100.0));

        // Speed Streaks logic (Visualized as brighter nebula patches)
        col += baseColor * pow(layers, 3.0) * warpFactor * 2.0;

        // Vignette
        col *= smoothstep(1.8, 0.2, length(vUv - 0.5));

        gl_FragColor = vec4(col, 1.0);
    }
`;

const POST_PROCESS_FRAGMENT_SHADER = `
    varying vec2 vUv;
    uniform sampler2D tDiffuse;
    uniform float iTime;
    uniform vec2 iResolution;
    uniform float amount;

    void main() {
        vec2 uv = vUv;
        
        // --- CHROMATIC ABERRATION ---
        float offset = 0.004 * amount;
        float r = texture2D(tDiffuse, uv + vec2(offset, 0.0)).r;
        float g = texture2D(tDiffuse, uv).g;
        float b = texture2D(tDiffuse, uv - vec2(offset, 0.0)).b;
        vec3 col = vec3(r, g, b);

        // --- SCANLINES & NOISE ---
        float scanline = sin(uv.y * iResolution.y * 1.8) * 0.05;
        col -= scanline * 0.5;
        float grain = (fract(sin(dot(uv, vec2(12.9898, 78.233) * iTime)) * 43758.5453) - 0.5) * 0.06;
        col += grain;

        // --- ADVANCED BLOOM (Bright Pass Approximation) ---
        vec3 scene = texture2D(tDiffuse, uv).rgb;
        vec3 bloom = vec3(0.0);
        float samples = 4.0;
        float radius = 0.004 * amount;
        for(float i = 0.0; i < 4.0; i++) {
            float angle = i * 1.57; // 4 directions
            bloom += texture2D(tDiffuse, uv + vec2(cos(angle), sin(angle)) * radius).rgb;
        }
        bloom /= samples;
        // Only bloom the bright parts
        bloom = max(bloom - 0.3, 0.0) * 2.0;
        col += bloom * amount;

        // --- VIGNETTE ---
        float vignette = 1.0 - length(uv - 0.5) * 1.2;
        col *= smoothstep(0.0, 0.8, vignette);

        gl_FragColor = vec4(col, 1.0);
    }
`;

class ParticleSystem {
    constructor(scene) {
        this.maxParticles = 3000; // Increased
        this.geometry = new THREE.BufferGeometry();
        
        this.positions = new Float32Array(this.maxParticles * 3);
        this.velocities = new Float32Array(this.maxParticles * 3);
        this.colors = new Float32Array(this.maxParticles * 3);
        this.lifetimes = new Float32Array(this.maxParticles);
        this.maxLifetimes = new Float32Array(this.maxParticles);
        this.sizes = new Float32Array(this.maxParticles);
        
        this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
        this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
        
        this.material = new THREE.PointsMaterial({
            size: 0.6,
            vertexColors: true,
            blending: THREE.AdditiveBlending,
            transparent: true,
            opacity: 0.9,
            depthWrite: false
        });
        
        this.points = new THREE.Points(this.geometry, this.material);
        scene.add(this.points);
        this.activeCount = 0;
    }

    spawn(pos, color, count, speedFactor = 1.0, lifeFactor = 1.0, spread = Math.PI * 2, size = 0.6) {
        for(let i = 0; i < count; i++) {
            if(this.activeCount >= this.maxParticles) break;
            
            let idx = this.activeCount * 3;
            this.positions[idx] = pos.x;
            this.positions[idx+1] = pos.y;
            this.positions[idx+2] = pos.z;
            
            let u = Math.random();
            let v = Math.random();
            let theta = spread * u;
            let phi = Math.acos(2 * v - 1);
            let speed = (Math.random() * 20 + 10) * speedFactor;
            
            this.velocities[idx] = Math.sin(phi) * Math.cos(theta) * speed;
            this.velocities[idx+1] = Math.sin(phi) * Math.sin(theta) * speed;
            this.velocities[idx+2] = Math.cos(phi) * speed;
            
            let c = new THREE.Color(color);
            this.colors[idx] = c.r;
            this.colors[idx+1] = c.g;
            this.colors[idx+2] = c.b;
            
            let life = (Math.random() * 0.5 + 0.5) * lifeFactor;
            this.lifetimes[this.activeCount] = life;
            this.maxLifetimes[this.activeCount] = life;
            this.sizes[this.activeCount] = size;
            
            this.activeCount++;
        }
    }

    update(delta) {
        for(let i = 0; i < this.activeCount; i++) {
            this.lifetimes[i] -= delta;
            
            if(this.lifetimes[i] <= 0) {
                this.activeCount--;
                let lastIdx = this.activeCount * 3;
                let currIdx = i * 3;
                for(let j=0; j<3; j++) {
                    this.positions[currIdx+j] = this.positions[lastIdx+j];
                    this.velocities[currIdx+j] = this.velocities[lastIdx+j];
                    this.colors[currIdx+j] = this.colors[lastIdx+j];
                }
                this.lifetimes[i] = this.lifetimes[this.activeCount];
                this.maxLifetimes[i] = this.maxLifetimes[this.activeCount];
                i--; continue;
            }
            
            let idx = i * 3;
            this.positions[idx] += this.velocities[idx] * delta;
            this.positions[idx+1] += this.velocities[idx+1] * delta;
            this.positions[idx+2] += this.velocities[idx+2] * delta;
            
            this.velocities[idx] *= 0.98;
            this.velocities[idx+1] *= 0.98;
            this.velocities[idx+2] *= 0.98;

            let lifeRatio = this.lifetimes[i] / this.maxLifetimes[i];
            this.colors[idx] *= lifeRatio;
            this.colors[idx+1] *= lifeRatio;
            this.colors[idx+2] *= lifeRatio;
        }
        this.geometry.attributes.position.needsUpdate = true;
        this.geometry.attributes.color.needsUpdate = true;
    }
}

function setupWorldEnvironment(scene) {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);
    
    // Primary Neon Pink Light
    const magentaLight = new THREE.PointLight(0xff00ff, 2.0, 50);
    magentaLight.position.set(20, 10, -10);
    scene.add(magentaLight);

    // Primary Neon Cyan Light
    const cyanLight = new THREE.PointLight(0x00ffff, 2.0, 50);
    cyanLight.position.set(-20, -10, -10);
    scene.add(cyanLight);

    // Backlight for edge highlighting
    const backLight = new THREE.DirectionalLight(0xffffff, 0.5);
    backLight.position.set(0, 5, -20);
    scene.add(backLight);
}
