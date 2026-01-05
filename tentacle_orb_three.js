import * as THREE from 'three';

// --- CUSTOM SHADERS ---

const tentacleVertexShader = `
    uniform float time;
    uniform float waveIntensity;
    
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    varying float vLocalZ;

    void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        
        vec3 transformed = position;
        
        // Add subtle wave deformation
        // transformed += normal * sin(time * 2.0 + position.z * 3.0) * waveIntensity * 0.02;
        
        vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
        vViewPosition = -mvPosition.xyz;
        
        vLocalZ = position.z; // Approximate local Z for gradient
        
        gl_Position = projectionMatrix * mvPosition;
    }
`;

const tentacleFragmentShader = `
    uniform float time;
    uniform vec3 colorStart;
    uniform vec3 colorEnd;
    uniform vec3 accentColor;
    uniform float energyLevel;
    uniform float pulseSpeed;
    uniform float opacity;
    
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    varying float vLocalZ;

    // Noise function
    float noise(vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
    }

    void main() {
        // Normalized position along the tentacle (approximate)
        float normalizedPos = vUv.x; // TubeGeometry maps U along the length
        
        // Multi-layered pattern system
        float primaryPattern = fract(normalizedPos * 5.0 - time * pulseSpeed);
        float secondaryPattern = fract(normalizedPos * 12.0 - time * pulseSpeed * 1.3);
        
        // Organic noise
        float organicNoise = noise(vec2(normalizedPos * 10.0, time * 0.5)) * 0.3;
        
        // Energy-based color mixing
        vec3 baseGradient = mix(colorStart, colorEnd, primaryPattern + organicNoise);
        vec3 accentLayer = accentColor * secondaryPattern * energyLevel;
        
        vec3 combinedColor = baseGradient + accentLayer;
        
        // Pulsing energy
        float energyPulse = (sin(time * 3.0 + normalizedPos * 6.0) * 0.5 + 0.5) * energyLevel;
        combinedColor += accentColor * energyPulse * 0.3;
        
        // Rim lighting
        vec3 normal = normalize(vNormal);
        vec3 viewDir = normalize(vViewPosition);
        float rimFactor = 1.0 - abs(dot(normal, viewDir));
        combinedColor += accentColor * rimFactor * 0.5;
        
        gl_FragColor = vec4(combinedColor, opacity);
    }
`;

export class TentacleOrb {
    constructor(scene, position, config = {}) {
        console.log("🦑 TentacleOrb: Constructor called");
        if (!scene) {
            console.error("🦑 TentacleOrb Error: Scene is undefined!");
            return;
        }
        this.scene = scene;
        this.position = position ? position.clone() : new THREE.Vector3(0, 0, 0);

        this.config = Object.assign({
            count: 12,
            orbSize: 2.0,
            length: 4.0,
            thickness: 0.1,
            wriggle: 1.2,
            segments: 20,
            colorTheme: {
                orb: new THREE.Color(0x00ccff),
                tentacleStart: new THREE.Color(0x0055aa),
                tentacleEnd: new THREE.Color(0x00ccff),
                accent: new THREE.Color(0xff00cc)
            },
            energyLevel: 1.0,
            pulseSpeed: 1.0
        }, config);

        this.tentacles = [];
        this.time = 0;
        this.clock = new THREE.Clock();

        try {
            this.init();
            console.log("🦑 TentacleOrb: Initialization complete");
        } catch (error) {
            console.error("🦑 TentacleOrb Error: Initialization failed", error);
        }
    }

    init() {
        console.log("🦑 TentacleOrb: Initializing components...");
        this.group = new THREE.Group();
        this.group.position.copy(this.position);
        this.scene.add(this.group);
        console.log("🦑 TentacleOrb: Group added to scene at", this.position);

        this.createMaterials();
        this.createOrb();
        this.createTentacles();
    }

    createMaterials() {
        // Orb Material
        this.orbMaterial = new THREE.MeshStandardMaterial({
            color: this.config.colorTheme.orb,
            emissive: this.config.colorTheme.orb,
            emissiveIntensity: 0.5,
            roughness: 0.4,
            metalness: 0.8,
            transparent: true,
            opacity: 0.9
        });

        // Tentacle Shader Material
        this.tentacleUniforms = {
            time: { value: 0 },
            colorStart: { value: this.config.colorTheme.tentacleStart },
            colorEnd: { value: this.config.colorTheme.tentacleEnd },
            accentColor: { value: this.config.colorTheme.accent },
            energyLevel: { value: this.config.energyLevel },
            pulseSpeed: { value: this.config.pulseSpeed },
            waveIntensity: { value: 1.0 },
            opacity: { value: 1.0 }
        };

        this.tentacleMaterial = new THREE.ShaderMaterial({
            uniforms: this.tentacleUniforms,
            vertexShader: tentacleVertexShader,
            fragmentShader: tentacleFragmentShader,
            transparent: true,
            side: THREE.DoubleSide
        });
    }

    createOrb() {
        const geometry = new THREE.SphereGeometry(this.config.orbSize, 32, 32);
        this.orbMesh = new THREE.Mesh(geometry, this.orbMaterial);
        this.group.add(this.orbMesh);

        // Inner glow (simple point light)
        const light = new THREE.PointLight(this.config.colorTheme.orb, 2, 20);
        this.group.add(light);
    }

    createTentacles() {
        for (let i = 0; i < this.config.count; i++) {
            this.createTentacle(i);
        }
    }

    createTentacle(index) {
        const angle = (index / this.config.count) * Math.PI * 2;
        const radius = this.config.orbSize * 0.8;

        // Base position on the orb surface
        const baseX = Math.cos(angle) * radius;
        const baseZ = Math.sin(angle) * radius;
        const baseY = (Math.random() - 0.5) * radius * 0.5;

        // Create initial curve points
        const points = [];
        const segmentLength = this.config.length / this.config.segments;

        for (let i = 0; i <= this.config.segments; i++) {
            points.push(new THREE.Vector3(
                baseX + (Math.cos(angle) * i * segmentLength),
                baseY,
                baseZ + (Math.sin(angle) * i * segmentLength)
            ));
        }

        const curve = new THREE.CatmullRomCurve3(points);
        const geometry = new THREE.TubeGeometry(curve, this.config.segments, this.config.thickness, 8, false);

        const mesh = new THREE.Mesh(geometry, this.tentacleMaterial);
        this.group.add(mesh);

        this.tentacles.push({
            mesh: mesh,
            curve: curve,
            baseAngle: angle,
            basePos: new THREE.Vector3(baseX, baseY, baseZ),
            index: index,
            phaseOffset: Math.random() * Math.PI * 2
        });
    }

    update() {
        const delta = this.clock.getDelta();
        this.time += delta;

        // Update uniforms
        this.tentacleUniforms.time.value = this.time;

        // Animate Orb (bobbing)
        this.group.position.y = this.position.y + Math.sin(this.time * 0.5) * 0.5;
        this.group.rotation.y += delta * 0.1;

        // Animate Tentacles
        this.tentacles.forEach(t => {
            const points = [];
            const segmentLength = this.config.length / this.config.segments;

            for (let i = 0; i <= this.config.segments; i++) {
                const ratio = i / this.config.segments;

                // Wriggle math
                const wriggleX = Math.sin(this.time * 2.0 + i * 0.5 + t.phaseOffset) * this.config.wriggle * ratio;
                const wriggleY = Math.cos(this.time * 1.5 + i * 0.3 + t.phaseOffset) * this.config.wriggle * ratio;
                const wriggleZ = Math.sin(this.time * 1.8 + i * 0.4 + t.phaseOffset) * this.config.wriggle * ratio;

                points.push(new THREE.Vector3(
                    t.basePos.x + (Math.cos(t.baseAngle) * i * segmentLength) + wriggleX,
                    t.basePos.y + wriggleY,
                    t.basePos.z + (Math.sin(t.baseAngle) * i * segmentLength) + wriggleZ
                ));
            }

            // Update curve and geometry
            t.curve.points = points;
            t.mesh.geometry.dispose(); // Clean up old geometry
            t.mesh.geometry = new THREE.TubeGeometry(t.curve, this.config.segments, this.config.thickness, 8, false);
        });
    }
}
