import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

// --- ADVANCED ABYSSAL SHADERS ---

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
        
        // Progress along tentacle (0 at base, 1 at tip)
        float progress = uv.x; 
        
        // Wriggle animation in vertex shader
        float ripple = sin(time * wriggleSpeed + progress * 5.0) * wriggleAmount * progress;
        float ripple2 = cos(time * wriggleSpeed * 0.7 + progress * 3.0) * wriggleAmount * progress;
        
        transformed.x += ripple;
        transformed.y += ripple2;
        
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
        // Multi-layered pulse pattern down black tentacle
        float p1 = fract(vDistance * 3.0 - time * pulseSpeed);
        float p2 = fract(vDistance * 8.0 - time * pulseSpeed * 1.5);
        
        // Base dark abyssal black gradient
        vec3 baseColor = mix(colorStart, colorEnd, vDistance);
        
        // Dark energy pulse down black tentacles
        float pulses = step(0.85, p1) * energyLevel;
        float microPulses = step(0.93, p2) * energyLevel * 0.4;
        
        vec3 color = mix(baseColor, accentColor, pulses + microPulses);
        
        // Rim lighting (Fresnel) to accentuate black glossy surface
        vec3 normal = normalize(vNormal);
        vec3 viewDir = normalize(vViewPosition);
        float fresnel = pow(1.0 - abs(dot(normal, viewDir)), 2.5);
        color += accentColor * fresnel * 0.7 * energyLevel;
        
        // Deep ambient occlusion at base
        color *= smoothstep(0.0, 0.15, vDistance) * 0.9 + 0.1;
        
        gl_FragColor = vec4(color, opacity);
    }
`;

export class TentacleOrb {
    constructor(scene, position, config = {}) {
        if (!scene) return;
        this.scene = scene;
        this.position = position ? position.clone() : new THREE.Vector3(0, 0, 0);

        this.config = Object.assign({
            count: 24,
            orbSize: 0.8,
            length: 4.2,
            thickness: 0.06,
            wriggleAmount: 1.2,
            wriggleSpeed: 2.8,
            colorTheme: {
                orb: new THREE.Color(0xD16847),           // Glowing PointCloud body core
                tentacleStart: new THREE.Color(0x050505), // Pitch Black
                tentacleEnd: new THREE.Color(0x000000),   // Deep Abyssal Black
                accent: new THREE.Color(0xFF4500)        // Ember accent rim/pulse
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
        // --- POINTCLOUD BODY CORE ---
        const pointCount = 800;
        const positions = new Float32Array(pointCount * 3);
        const colors = new Float32Array(pointCount * 3);
        const initialPositions = new Float32Array(pointCount * 3);

        const orbColor = this.config.colorTheme.orb || new THREE.Color(0xD16847);
        const accentColor = this.config.colorTheme.accent || new THREE.Color(0xFF4500);

        for (let i = 0; i < pointCount; i++) {
            const u = Math.random();
            const v = Math.random();
            const theta = u * 2.0 * Math.PI;
            const phi = Math.acos(2.0 * v - 1.0);
            const r = Math.cbrt(Math.random()) * this.config.orbSize;

            const x = r * Math.sin(phi) * Math.cos(theta);
            const y = r * Math.sin(phi) * Math.sin(theta);
            const z = r * Math.cos(phi);

            positions[i * 3] = x;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = z;

            initialPositions[i * 3] = x;
            initialPositions[i * 3 + 1] = y;
            initialPositions[i * 3 + 2] = z;

            const mixFactor = Math.random();
            const c = orbColor.clone().lerp(accentColor, mixFactor);
            colors[i * 3] = c.r;
            colors[i * 3 + 1] = c.g;
            colors[i * 3 + 2] = c.b;
        }

        const pointGeometry = new THREE.BufferGeometry();
        pointGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        pointGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const pointMaterial = new THREE.PointsMaterial({
            size: 0.06,
            vertexColors: true,
            transparent: true,
            opacity: 0.95,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        this.pointCloud = new THREE.Points(pointGeometry, pointMaterial);
        this.initialPointPositions = initialPositions;
        this.group.add(this.pointCloud);

        // Inner dark singularity void core
        const innerGeom = new THREE.IcosahedronGeometry(this.config.orbSize * 0.45, 2);
        const innerMat = new THREE.MeshBasicMaterial({
            color: 0x000000,
            transparent: true,
            opacity: 0.95
        });
        this.innerCore = new THREE.Mesh(innerGeom, innerMat);
        this.group.add(this.innerCore);

        // PointCloud Outer Wireframe Shell
        const wireframeGeom = new THREE.IcosahedronGeometry(this.config.orbSize * 1.15, 2);
        const wireframeMat = new THREE.MeshBasicMaterial({
            color: this.config.colorTheme.accent,
            wireframe: true,
            transparent: true,
            opacity: 0.18
        });
        this.shell = new THREE.Mesh(wireframeGeom, wireframeMat);
        this.group.add(this.shell);

        const light = new THREE.PointLight(this.config.colorTheme.accent, 4, 15);
        this.group.add(light);
    }

    createTentacles() {
        const segments = 32;
        const radialSegments = 8;
        const geometry = new THREE.CylinderGeometry(this.config.thickness, this.config.thickness * 0.2, this.config.length, radialSegments, segments, true);

        geometry.rotateX(Math.PI / 2);
        geometry.translate(0, 0, this.config.length / 2);

        const uvs = geometry.attributes.uv.array;
        for (let i = 0; i < uvs.length; i += 2) {
            const temp = uvs[i];
            uvs[i] = uvs[i + 1];
            uvs[i + 1] = temp;
        }

        for (let i = 0; i < this.config.count; i++) {
            const mesh = new THREE.Mesh(geometry, this.tentacleMaterial);

            const phi = Math.acos(-1 + (2 * i) / this.config.count);
            const theta = Math.sqrt(this.config.count * Math.PI) * phi;

            mesh.rotation.set(phi, theta, 0);

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

        this.group.rotation.y += delta * 0.25;
        this.group.rotation.x += delta * 0.12;

        // Animate PointCloud particle turbulence & pulsation
        if (this.pointCloud) {
            const positions = this.pointCloud.geometry.attributes.position.array;
            const initPos = this.initialPointPositions;
            const count = initPos.length / 3;

            for (let i = 0; i < count; i++) {
                const ix = initPos[i * 3];
                const iy = initPos[i * 3 + 1];
                const iz = initPos[i * 3 + 2];

                const dist = Math.sqrt(ix * ix + iy * iy + iz * iz);
                const pulse = 1.0 + Math.sin(this.time * 3.0 + dist * 4.0 + i) * 0.14;

                positions[i * 3] = ix * pulse + Math.sin(this.time * 2.0 + i) * 0.04;
                positions[i * 3 + 1] = iy * pulse + Math.cos(this.time * 2.5 + i) * 0.04;
                positions[i * 3 + 2] = iz * pulse;
            }
            this.pointCloud.geometry.attributes.position.needsUpdate = true;
            this.pointCloud.rotation.y += delta * 0.4;
        }

        if (this.shell) {
            this.shell.rotation.z -= delta * 0.3;
            this.shell.scale.setScalar(1 + Math.sin(this.time * 2) * 0.05);
        }

        this.group.position.y = this.position.y + Math.sin(this.time * 0.5) * 0.3;
    }
}

