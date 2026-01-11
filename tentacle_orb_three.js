import * as THREE from 'three';

// --- ADVANCED SHADERS ---

const tentacleVertexShader = `
    uniform float time;
    uniform float waveIntensity;
    uniform float wriggleSpeed;
    uniform float wriggleAmount;
    
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    varying float vDistance;

    void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        
        vec3 transformed = position;
        
        // Progress along the tentacle (0 at base, 1 at tip)
        // Assuming the geometry is a cylinder/tube oriented along Z or mapped UV
        float progress = uv.x; 
        
        // Wriggle animation in vertex shader
        float ripple = sin(time * wriggleSpeed + progress * 5.0) * wriggleAmount * progress;
        float ripple2 = cos(time * wriggleSpeed * 0.7 + progress * 3.0) * wriggleAmount * progress;
        
        transformed.x += ripple;
        transformed.y += ripple2;
        
        // Slight taper at the tip
        // transformed.xy *= (1.0 - progress * 0.5);
        
        vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
        vViewPosition = -mvPosition.xyz;
        vDistance = progress;
        
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
    varying float vDistance;

    void main() {
        // Multi-layered pattern
        float p1 = fract(vDistance * 3.0 - time * pulseSpeed);
        float p2 = fract(vDistance * 10.0 - time * pulseSpeed * 2.0);
        
        // Base color gradient
        vec3 baseColor = mix(colorStart, colorEnd, vDistance);
        
        // Energy pulses
        float pulses = step(0.8, p1) * energyLevel;
        float microPulses = step(0.95, p2) * energyLevel * 0.5;
        
        vec3 color = mix(baseColor, accentColor, pulses + microPulses);
        
        // Rim lighting (Fresnel)
        vec3 normal = normalize(vNormal);
        vec3 viewDir = normalize(vViewPosition);
        float fresnel = pow(1.0 - abs(dot(normal, viewDir)), 3.0);
        color += accentColor * fresnel * energyLevel;
        
        // Ambient occlusion at base
        color *= smoothstep(0.0, 0.2, vDistance) * 0.8 + 0.2;
        
        gl_FragColor = vec4(color, opacity);
    }
`;

export class TentacleOrb {
    constructor(scene, position, config = {}) {
        if (!scene) return;
        this.scene = scene;
        this.position = position ? position.clone() : new THREE.Vector3(0, 0, 0);

        this.config = Object.assign({
            count: 24, // Increased count for more detail
            orbSize: 1.5,
            length: 8.0,
            thickness: 0.12,
            wriggleAmount: 1.5,
            wriggleSpeed: 3.0,
            colorTheme: {
                orb: new THREE.Color(0xD16847), // Using site theme: Burnt Orange
                tentacleStart: new THREE.Color(0x7a0b2f), // Deep Red
                tentacleEnd: new THREE.Color(0xFF6B3F), // Hot Ember
                accent: new THREE.Color(0xFFFFFF)
            },
            energyLevel: 1.2,
            pulseSpeed: 1.5
        }, config);

        this.time = 0;
        this.init();
    }

    init() {
        this.group = new THREE.Group();
        this.group.position.copy(this.position);
        this.scene.add(this.group);

        this.createMaterials();
        this.createOrb();
        this.createTentacles();
    }

    createMaterials() {
        this.orbMaterial = new THREE.MeshStandardMaterial({
            color: this.config.colorTheme.orb,
            emissive: this.config.colorTheme.orb,
            emissiveIntensity: 1.0,
            roughness: 0.2,
            metalness: 0.9,
            transparent: true,
            opacity: 0.8
        });

        this.tentacleUniforms = {
            time: { value: 0 },
            colorStart: { value: this.config.colorTheme.tentacleStart },
            colorEnd: { value: this.config.colorTheme.tentacleEnd },
            accentColor: { value: this.config.colorTheme.accent },
            energyLevel: { value: this.config.energyLevel },
            pulseSpeed: { value: this.config.pulseSpeed },
            wriggleSpeed: { value: this.config.wriggleSpeed },
            wriggleAmount: { value: this.config.wriggleAmount },
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
        // Geometric complex core instead of just a sphere
        const geometry = new THREE.IcosahedronGeometry(this.config.orbSize, 1);
        this.orbMesh = new THREE.Mesh(geometry, this.orbMaterial);
        
        // Add a wireframe shell
        const wireframeGeom = new THREE.IcosahedronGeometry(this.config.orbSize * 1.2, 2);
        const wireframeMat = new THREE.MeshBasicMaterial({ 
            color: this.config.colorTheme.accent, 
            wireframe: true, 
            transparent: true, 
            opacity: 0.2 
        });
        const shell = new THREE.Mesh(wireframeGeom, wireframeMat);
        
        this.group.add(this.orbMesh);
        this.group.add(shell);
        this.shell = shell;

        const light = new THREE.PointLight(this.config.colorTheme.tentacleEnd, 5, 20);
        this.group.add(light);
    }

    createTentacles() {
        // Use a single geometry for instances or just multiple meshes
        // For 24 tentacles, individual meshes are fine if we don't recreate them.
        
        // Create a base geometry: a cylinder aligned with Z axis
        const segments = 32;
        const radialSegments = 8;
        const geometry = new THREE.CylinderGeometry(this.config.thickness, this.config.thickness * 0.2, this.config.length, radialSegments, segments, true);
        
        // Rotate so it points along Z
        geometry.rotateX(Math.PI / 2);
        // Offset so base is at origin
        geometry.translate(0, 0, this.config.length / 2);
        
        // Add UV transformation if needed (uv.x being distance along length)
        // CylinderGeometry UVs are usually (x=radial, y=length)
        // Let's fix that for our shader
        const uvs = geometry.attributes.uv.array;
        for (let i = 0; i < uvs.length; i += 2) {
            const temp = uvs[i];
            uvs[i] = uvs[i+1]; // x is now length progress [0,1]
            uvs[i+1] = temp;   // y is now radial progress
        }

        for (let i = 0; i < this.config.count; i++) {
            const mesh = new THREE.Mesh(geometry, this.tentacleMaterial);
            
            // Randomly distribute on the sphere
            const phi = Math.acos(-1 + (2 * i) / this.config.count);
            const theta = Math.sqrt(this.config.count * Math.PI) * phi;
            
            mesh.rotation.set(phi, theta, 0);
            
            // Push out to surface
            mesh.position.set(
                Math.sin(phi) * Math.cos(theta) * this.config.orbSize * 0.5,
                Math.sin(phi) * Math.sin(theta) * this.config.orbSize * 0.5,
                Math.cos(phi) * this.config.orbSize * 0.5
            );
            
            this.group.add(mesh);
        }
    }

    update(delta) {
        this.time += delta;
        this.tentacleUniforms.time.value = this.time;
        
        this.group.rotation.y += delta * 0.2;
        this.group.rotation.x += delta * 0.1;
        
        if (this.shell) {
            this.shell.rotation.z -= delta * 0.3;
            this.shell.scale.setScalar(1 + Math.sin(this.time * 2) * 0.05);
        }
        
        // Bobbing
        this.group.position.y = this.position.y + Math.sin(this.time * 0.5) * 5;
    }
}
