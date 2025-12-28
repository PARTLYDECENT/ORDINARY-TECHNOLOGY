// --- ENHANCED CUSTOM SHADER CODE FOR TENTACLES ---
// Advanced GLSL shaders with multiple visual effects

// -- Enhanced Vertex Shader --
BABYLON.Effect.ShadersStore["tentacleVertexShader"] = `
    precision highp float;
    attribute vec3 position;
    attribute vec3 normal;
    uniform mat4 worldViewProjection;
    uniform mat4 world;
    uniform float time;
    uniform float waveIntensity;
    varying float v_localZ;
    varying vec3 v_worldPos;
    varying vec3 v_normal;

    void main(void) {
        vec4 worldPos = world * vec4(position, 1.0);
        
        // Add subtle wave deformation
        worldPos.xyz += normal * sin(time * 2.0 + position.z * 3.0) * waveIntensity * 0.02;
        
        gl_Position = worldViewProjection * vec4(position, 1.0);
        v_localZ = position.z;
        v_worldPos = worldPos.xyz;
        v_normal = normalize((world * vec4(normal, 0.0)).xyz);
    }
`;

// -- Enhanced Fragment Shader --
BABYLON.Effect.ShadersStore["tentacleFragmentShader"] = `
    precision highp float;
    uniform float time;
    uniform float length;
    uniform float orbSize;
    uniform vec3 colorStart;
    uniform vec3 colorEnd;
    uniform vec3 accentColor;
    uniform float energyLevel;
    uniform float pulseSpeed;
    uniform bool stealthMode;
    varying float v_localZ;
    varying vec3 v_worldPos;
    varying vec3 v_normal;

    // Noise function for organic patterns
    float noise(vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
    }

    void main(void) {
        float normalizedPos = (v_localZ - (orbSize / 2.0)) / length;
        
        // Multi-layered pattern system
        float primaryPattern = fract(normalizedPos * 5.0 - time * pulseSpeed);
        float secondaryPattern = fract(normalizedPos * 12.0 - time * pulseSpeed * 1.3);
        float tertiaryPattern = fract(normalizedPos * 20.0 + time * pulseSpeed * 0.8);
        
        // Organic noise overlay
        vec2 noiseCoord = vec2(normalizedPos * 10.0, time * 0.5);
        float organicNoise = noise(noiseCoord) * 0.3;
        
        // Energy-based color mixing
        vec3 baseGradient = mix(colorStart, colorEnd, primaryPattern + organicNoise);
        vec3 accentLayer = accentColor * secondaryPattern * energyLevel;
        vec3 detailLayer = mix(colorStart, accentColor, tertiaryPattern) * 0.4;
        
        // Combine all layers
        vec3 combinedColor = baseGradient + accentLayer + detailLayer;
        
        // Enhanced segmentation with smoother transitions
        float segmentIntensity = smoothstep(0.0, 0.15, primaryPattern) * 
                                (1.0 - smoothstep(0.75, 0.9, primaryPattern));
        
        // Pulsing energy effect
        float energyPulse = (sin(time * 3.0 + normalizedPos * 6.0) * 0.5 + 0.5) * energyLevel;
        segmentIntensity += energyPulse * 0.3;
        
        // Stealth mode effect
        if (stealthMode) {
            combinedColor *= 0.2;
            segmentIntensity *= 0.3;
        }
        
        // Rim lighting effect
        float rimFactor = 1.0 - abs(dot(v_normal, normalize(v_worldPos)));
        combinedColor += rimFactor * accentColor * 0.5;
        
        vec3 finalColor = combinedColor * segmentIntensity;
        gl_FragColor = vec4(finalColor, 1.0);
    }
`;

// --- PARTICLE SYSTEM SHADERS ---
BABYLON.Effect.ShadersStore["orbParticleVertexShader"] = `
    precision highp float;
    attribute vec3 position;
    attribute vec2 uv;
    uniform mat4 worldViewProjection;
    uniform float time;
    varying vec2 v_uv;
    varying float v_life;

    void main(void) {
        v_uv = uv;
        v_life = sin(time * 2.0) * 0.5 + 0.5;
        gl_Position = worldViewProjection * vec4(position, 1.0);
    }
`;

BABYLON.Effect.ShadersStore["orbParticleFragmentShader"] = `
    precision highp float;
    uniform vec3 particleColor;
    uniform float alpha;
    varying vec2 v_uv;
    varying float v_life;

    void main(void) {
        float dist = distance(v_uv, vec2(0.5));
        float alpha_val = (1.0 - smoothstep(0.0, 0.5, dist)) * alpha * v_life;
        gl_FragColor = vec4(particleColor, alpha_val);
    }
`;

// --- MASSIVELY ENHANCED TENTACLE ORB ---
class TentacleOrb {
    constructor(scene, position, config = {}) {
        this.scene = scene;
        this.position = position || new BABYLON.Vector3(0, 0, 0);
        this.snapToGround();

        this.config = Object.assign({
            // Basic properties
            count: 15, orbSize: 0.6, length: 2.0, thickness: 0.025, wriggle: 1.2, segments: 12,

            // Animation
            bobHeight: 0.25, bobSpeed: 1.2, pulseSpeed: 0.7,
            tentacleUpdateFrequency: 1,

            // Visual effects
            glowIntensity: 0.4, energyLevel: 1.0,

            // Color themes
            colorTheme: {
                orb: new BABYLON.Color3(0.4, 0.1, 0.1),
                tentacleStart: new BABYLON.Color3(0.5, 0.0, 0.0),
                tentacleEnd: new BABYLON.Color3(1.0, 0.3, 0.1),
                accent: new BABYLON.Color3(1.0, 0.8, 0.0)
            },

            // Behavioral systems
            patrol: {
                enabled: true,
                radius: 20 + Math.random() * 15,
                speed: 0.4 + Math.random() * 0.6,
                verticalBob: true
            },

            reactiveTentacles: {
                enabled: true,
                reactivity: 0.8,
                detectionRadius: 12,
                aggressionLevel: 1.0
            },

            // Combat abilities
            spikeShot: {
                enabled: true,
                cooldown: 4,
                spikeSpeed: 0.8,
                spikeLifetime: 4,
                volleySize: 3,
                spread: 0.3
            },

            stealthMode: {
                enabled: true,
                duration: 6,
                cooldown: 12,
                invisibilityLevel: 0.15
            },

            // NEW: Advanced abilities
            tentacleLash: {
                enabled: true,
                range: 3.0,
                damage: 25,
                cooldown: 3,
                windupTime: 0.5
            },

            energyShield: {
                enabled: true,
                duration: 5,
                cooldown: 15,
                absorption: 0.8
            },

            territorialBehavior: {
                enabled: true,
                territory: 25,
                aggressionRange: 15,
                retreatThreshold: 0.3
            },

            // NEW: Visual enhancements
            particleEffects: {
                enabled: true,
                density: 50,
                lifetime: 2.0
            },

            morphing: {
                enabled: true,
                morphSpeed: 0.3,
                variants: ['aggressive', 'defensive', 'hunting']
            }
        }, config);

        // State management
        this.tentacles = [];
        this.isDead = false;
        this.health = 100;
        this.maxHealth = 100;

        // Animation and effects
        this.glowPhase = Math.random() * Math.PI * 2;
        this.tentacleUpdateCounter = 0;
        this.energyLevel = this.config.energyLevel;

        // Behavioral state
        this.currentState = 'patrol'; // patrol, aggressive, defensive, hunting
        this.stateTimer = 0;
        this.detectedTargets = [];

        // Patrol system
        this.patrolPoints = [];
        this.currentPatrolPointIndex = 0;

        // Combat systems
        this.spikes = [];
        this.lastSpikeShotTime = 0;
        this.isInStealthMode = false;
        this.stealthStartTime = 0;
        this.hasEnergyShield = false;
        this.shieldStartTime = 0;
        this.lastTentacleLashTime = 0;

        // Particle system
        this.particleSystem = null;
        this.shieldParticles = null;

        this.initialize();
    }

    async initialize() {
        this.createMaterials();
        await this.createOrb();
        this.createTentacles();
        this.createParticleEffects();

        this.orb.position = this.position;
        this.basePosition = this.position.clone();

        if (this.config.patrol.enabled) {
            this.generatePatrolPoints();
        }

        this.mesh = this.orb;
        this.startUpdateLoop();
    }

    snapToGround() {
        const groundRay = new BABYLON.Ray(
            new BABYLON.Vector3(this.position.x, this.position.y + 50, this.position.z),
            new BABYLON.Vector3(0, -1, 0), 100
        );

        const pickInfo = this.scene.pickWithRay(groundRay,
            mesh => mesh.checkCollisions && mesh.name === "ground");

        if (pickInfo && pickInfo.hit && pickInfo.pickedPoint) {
            this.position.y = pickInfo.pickedPoint.y + 0.5;
        } else {
            this.position.y = 0.5;
        }
    }

    createMaterials() {
        // Enhanced orb material with dynamic properties
        this.orbMaterial = new BABYLON.PBRMaterial("orbMat", this.scene);
        this.orbMaterial.baseColor = this.config.colorTheme.orb;
        this.orbMaterial.metallicFactor = 0.3;
        this.orbMaterial.roughnessFactor = 0.4;
        this.orbMaterial.emissiveColor = this.config.colorTheme.orb.scale(0.6);

        // Enhanced tentacle shader material
        this.tentacleMaterial = new BABYLON.ShaderMaterial("tentacleShader", this.scene, {
            vertex: "tentacle",
            fragment: "tentacle",
        }, {
            attributes: ["position", "normal"],
            uniforms: ["worldViewProjection", "world", "time", "length", "orbSize",
                "colorStart", "colorEnd", "accentColor", "energyLevel",
                "pulseSpeed", "stealthMode", "waveIntensity"]
        });

        this.updateTentacleMaterial();

        // Enhanced spike material
        this.spikeMaterial = new BABYLON.PBRMaterial("spikeMat", this.scene);
        this.spikeMaterial.baseColor = new BABYLON.Color3(0.1, 0.1, 0.1);
        this.spikeMaterial.metallicFactor = 0.8;
        this.spikeMaterial.roughnessFactor = 0.2;
        this.spikeMaterial.emissiveColor = this.config.colorTheme.accent.scale(0.3);

        // Shield material
        this.shieldMaterial = new BABYLON.StandardMaterial("shieldMat", this.scene);
        this.shieldMaterial.diffuseColor = this.config.colorTheme.accent;
        this.shieldMaterial.alpha = 0.3;
        this.shieldMaterial.emissiveColor = this.config.colorTheme.accent.scale(0.5);
    }

    updateTentacleMaterial() {
        this.tentacleMaterial.setFloat("length", this.config.length);
        this.tentacleMaterial.setFloat("orbSize", this.config.orbSize);
        this.tentacleMaterial.setFloat("pulseSpeed", this.config.pulseSpeed);
        this.tentacleMaterial.setFloat("waveIntensity", this.energyLevel);
        this.tentacleMaterial.setColor3("colorStart", this.config.colorTheme.tentacleStart);
        this.tentacleMaterial.setColor3("colorEnd", this.config.colorTheme.tentacleEnd);
        this.tentacleMaterial.setColor3("accentColor", this.config.colorTheme.accent);
        this.tentacleMaterial.setFloat("energyLevel", this.energyLevel);
        this.tentacleMaterial.setFloat("stealthMode", this.isInStealthMode ? 1.0 : 0.0);
    }

    async createOrb() {
        try {
            const result = await BABYLON.SceneLoader.ImportMeshAsync(null, "../R2ASSETS/assets/models/", "orb1.glb", this.scene);
            const mainMesh = result.meshes[0];

            if (mainMesh) {
                this.orb = mainMesh;
                this.orb.name = "tentacleOrb_enhanced";

                this.orb.getChildMeshes().forEach(m => m.material = this.orbMaterial);
                this.orb.material = this.orbMaterial;

                const boundingInfo = this.orb.getHierarchyBoundingVectors();
                const size = boundingInfo.max.subtract(boundingInfo.min);
                const maxDimension = Math.max(size.x, size.y, size.z);
                if (maxDimension > 0) {
                    const scaleFactor = this.config.orbSize / maxDimension;
                    this.orb.scaling.scaleInPlace(scaleFactor);
                }
                console.log("✓ Tentacle orb model loaded successfully");
            }
        } catch (e) {
            console.log("⚠ Model not found, using fallback sphere:", e.message);
            // Create a more visible fallback sphere
            this.orb = BABYLON.MeshBuilder.CreateSphere("tentacleOrb_fallback",
                { diameter: this.config.orbSize * 2, segments: 32 }, this.scene);
            this.orb.material = this.orbMaterial;
            console.log("✓ Fallback sphere created with diameter:", this.config.orbSize * 2);
        }

        // Create energy shield mesh (initially invisible)
        this.shieldMesh = BABYLON.MeshBuilder.CreateSphere("energyShield",
            { diameter: this.config.orbSize * 2.5, segments: 32 }, this.scene);
        this.shieldMesh.material = this.shieldMaterial;
        this.shieldMesh.parent = this.orb;
        this.shieldMesh.isVisible = false;
    }

    createTentacles() {
        // Create spike instance mesh
        this.spikeInstanceMesh = BABYLON.MeshBuilder.CreateCylinder("spikeInstance", {
            height: 0.6, diameterBottom: this.config.thickness * 3, diameterTop: 0, tessellation: 8
        }, this.scene);
        this.spikeInstanceMesh.material = this.spikeMaterial;
        this.spikeInstanceMesh.isVisible = false;

        // Create main tentacles
        for (let i = 0; i < this.config.count; i++) {
            this.createTentacle(i, 'equatorial');
        }

        // Create polar tentacles
        this.createTentacle('top', 'polar', new BABYLON.Vector3(-Math.PI / 2, 0, 0));
        this.createTentacle('bottom', 'polar', new BABYLON.Vector3(Math.PI / 2, 0, 0));

        // Create additional mini-tentacles for variety
        for (let i = 0; i < 6; i++) {
            this.createTentacle(`mini_${i}`, 'mini');
        }
    }

    createTentacle(id, type, rotation = null) {
        const parent = new BABYLON.TransformNode(`tentacleParent_${id}`);
        parent.parent = this.orb;

        if (type === 'equatorial') {
            const angle = (id / this.config.count) * Math.PI * 2;
            parent.rotation.y = angle;
        } else if (type === 'polar' && rotation) {
            parent.rotation = rotation;
        } else if (type === 'mini') {
            const angle = (id / 6) * Math.PI * 2;
            parent.rotation.y = angle;
            parent.rotation.x = (Math.random() - 0.5) * Math.PI * 0.5;
        }

        const segmentCount = type === 'mini' ? 6 : this.config.segments;
        const length = type === 'mini' ? this.config.length * 0.6 : this.config.length;
        const thickness = type === 'mini' ? this.config.thickness * 0.7 : this.config.thickness;

        const points = [];
        for (let j = 0; j <= segmentCount; j++) {
            const radius = this.config.orbSize / 2;
            points.push(new BABYLON.Vector3(0, 0, radius + j * (length / segmentCount)));
        }

        const tentacleMesh = BABYLON.MeshBuilder.CreateTube(`tentacle_${id}`, {
            path: points,
            radius: thickness,
            updatable: true,
            cap: BABYLON.Mesh.CAP_ALL
        }, this.scene);

        tentacleMesh.material = this.tentacleMaterial;
        tentacleMesh.parent = parent;

        // Create spike for main tentacles only
        let spike = null;
        if (type !== 'mini') {
            spike = this.spikeInstanceMesh.createInstance(`spikeInstance_${id}`);
            spike.parent = parent;
            spike.rotationQuaternion = new BABYLON.Quaternion();
        }

        this.tentacles.push({
            mesh: tentacleMesh,
            parent: parent,
            points: points,
            type: type,
            spike: spike,
            id: id,
            length: length,
            segmentCount: segmentCount,
            aggressionLevel: 0,
            lastLashTime: 0
        });
    }

    createParticleEffects() {
        if (!this.config.particleEffects.enabled) return;

        // Ambient energy particles
        this.particleSystem = new BABYLON.ParticleSystem("orbParticles", this.config.particleEffects.density, this.scene);
        this.particleSystem.particleTexture = new BABYLON.Texture("https://playground.babylonjs.com/textures/flare.png", this.scene);

        this.particleSystem.emitter = this.orb;
        this.particleSystem.minEmitBox = new BABYLON.Vector3(-0.5, -0.5, -0.5);
        this.particleSystem.maxEmitBox = new BABYLON.Vector3(0.5, 0.5, 0.5);

        this.particleSystem.color1 = new BABYLON.Color4(this.config.colorTheme.tentacleStart.r, this.config.colorTheme.tentacleStart.g, this.config.colorTheme.tentacleStart.b, 0.8);
        this.particleSystem.color2 = new BABYLON.Color4(this.config.colorTheme.accent.r, this.config.colorTheme.accent.g, this.config.colorTheme.accent.b, 0.4);

        this.particleSystem.minSize = 0.05;
        this.particleSystem.maxSize = 0.15;
        this.particleSystem.minLifeTime = 1.0;
        this.particleSystem.maxLifeTime = this.config.particleEffects.lifetime;
        this.particleSystem.emitRate = 20;

        this.particleSystem.blendMode = BABYLON.ParticleSystem.BLENDMODE_ONEONE;
        this.particleSystem.gravity = new BABYLON.Vector3(0, -1, 0);
        this.particleSystem.direction1 = new BABYLON.Vector3(-1, 1, -1);
        this.particleSystem.direction2 = new BABYLON.Vector3(1, 1, 1);
        this.particleSystem.minAngularSpeed = 0;
        this.particleSystem.maxAngularSpeed = Math.PI;
        this.particleSystem.minInitialRotation = 0;
        this.particleSystem.maxInitialRotation = 2 * Math.PI;

        this.particleSystem.start();
    }

    generatePatrolPoints() {
        const patrolConfig = this.config.patrol;
        const pointCount = 6 + Math.floor(Math.random() * 4);

        for (let i = 0; i < pointCount; i++) {
            const angle = (i / pointCount) * Math.PI * 2;
            const distance = patrolConfig.radius * (0.5 + Math.random() * 0.5);
            const heightVariation = patrolConfig.verticalBob ? (Math.random() - 0.5) * 2 : 0;

            const point = new BABYLON.Vector3(
                this.position.x + Math.cos(angle) * distance,
                this.position.y + heightVariation,
                this.position.z + Math.sin(angle) * distance
            );
            this.patrolPoints.push(point);
        }
    }

    startUpdateLoop() {
        this.updateObserver = this.scene.registerBeforeRender(() => {
            if (!this.isDead && !game?.isPaused && this.orb) {
                const time = performance.now() * 0.001;
                const deltaTime = this.scene.getEngine().getDeltaTime() / 1000.0;

                this.updateBehaviorState(deltaTime);
                this.updateMovement(deltaTime);
                this.updateTentacles(time);
                this.updateVisualEffects(time);
                this.updateCombatSystems(time, deltaTime);
                this.updateTargetDetection();
            }
        });
    }

    updateBehaviorState(deltaTime) {
        this.stateTimer += deltaTime;

        // State transition logic based on detected targets and health
        const hasNearbyTargets = this.detectedTargets.length > 0;
        const healthPercentage = this.health / this.maxHealth;

        if (healthPercentage < this.config.territorialBehavior.retreatThreshold) {
            if (this.currentState !== 'defensive') {
                this.currentState = 'defensive';
                this.stateTimer = 0;
                this.activateEnergyShield();
            }
        } else if (hasNearbyTargets) {
            if (this.currentState !== 'aggressive') {
                this.currentState = 'aggressive';
                this.stateTimer = 0;
                this.energyLevel = Math.min(this.energyLevel + 0.5, 2.0);
            }
        } else if (this.stateTimer > 10 && this.currentState !== 'patrol') {
            this.currentState = 'patrol';
            this.stateTimer = 0;
            this.energyLevel = Math.max(this.energyLevel - 0.1, 0.5);
        }
    }

    updateMovement(deltaTime) {
        if (this.currentState === 'patrol' && this.config.patrol.enabled) {
            this.updatePatrol(deltaTime);
        } else if (this.currentState === 'aggressive' && this.detectedTargets.length > 0) {
            this.updateAggressiveMovement(deltaTime);
        } else if (this.currentState === 'defensive') {
            this.updateDefensiveMovement(deltaTime);
        }

        // Apply bobbing motion
        const time = performance.now() * 0.001;
        const bobIntensity = this.currentState === 'aggressive' ? 1.5 : 1.0;
        this.orb.position.x = this.basePosition.x;
        this.orb.position.z = this.basePosition.z;
        this.orb.position.y = this.basePosition.y +
            Math.sin(time * this.config.bobSpeed) * this.config.bobHeight * bobIntensity;
    }

    updatePatrol(deltaTime) {
        if (this.patrolPoints.length === 0) return;

        const targetPoint = this.patrolPoints[this.currentPatrolPointIndex];
        const distance = BABYLON.Vector3.Distance(this.basePosition, targetPoint);

        if (distance < 1.5) {
            this.currentPatrolPointIndex = (this.currentPatrolPointIndex + 1) % this.patrolPoints.length;
        }

        const direction = targetPoint.subtract(this.basePosition).normalize();
        const moveVector = direction.scale(this.config.patrol.speed * deltaTime);
        this.basePosition.addInPlace(moveVector);
    }

    updateAggressiveMovement(deltaTime) {
        const target = this.detectedTargets[0]; // Focus on closest target
        const direction = target.subtract(this.basePosition);
        const distance = direction.length();

        if (distance > 3) {
            // Move towards target
            const moveVector = direction.normalize().scale(this.config.patrol.speed * 1.5 * deltaTime);
            this.basePosition.addInPlace(moveVector);
        } else if (distance < 1.5) {
            // Back away slightly
            const moveVector = direction.normalize().scale(-this.config.patrol.speed * 0.5 * deltaTime);
            this.basePosition.addInPlace(moveVector);
        }
        // Optimal attack distance is 1.5-3 units
    }

    updateDefensiveMovement(deltaTime) {
        if (this.detectedTargets.length > 0) {
            const target = this.detectedTargets[0];
            const direction = target.subtract(this.basePosition);

            // Move away from threats
            const moveVector = direction.normalize().scale(-this.config.patrol.speed * 0.8 * deltaTime);
            this.basePosition.addInPlace(moveVector);
        }
    }

    updateTargetDetection() {
        this.detectedTargets = [];

        // Simple target detection (you would implement your own logic here)
        if (typeof game !== 'undefined' && game.player) {
            const distance = BABYLON.Vector3.Distance(this.orb.position, game.player.position);
            if (distance < this.config.reactiveTentacles.detectionRadius) {
                this.detectedTargets.push(game.player.position);
            }
        }
    }

    updateTentacles(time) {
        this.updateTentacleMaterial();
        this.tentacleMaterial.setFloat("time", time);

        const targetPosition = this.detectedTargets.length > 0 ? this.detectedTargets[0] : null;
        const aggressionMultiplier = this.currentState === 'aggressive' ? 1.5 : 1.0;

        this.tentacles.forEach((t, i) => {
            const newPoints = this.calculateTentaclePoints(t, time, targetPosition, aggressionMultiplier);

            // Update mesh
            BABYLON.MeshBuilder.CreateTube(null, {
                path: newPoints,
                instance: t.mesh,
                updatable: true
            });

            // Update spike position and orientation
            if (t.spike && newPoints.length > 1) {
                this.updateSpikePosition(t.spike, newPoints);
            }
        });
    }

    calculateTentaclePoints(tentacle, time, targetPosition, aggressionMultiplier) {
        const newPoints = [];
        const wriggleIntensity = this.config.wriggle * aggressionMultiplier;

        for (let j = 0; j <= tentacle.segmentCount; j++) {
            const basePoint = tentacle.points[j];
            const segmentRatio = j / tentacle.segmentCount;

            let wriggleX, wriggleY;

            if (tentacle.type === 'equatorial') {
                wriggleX = Math.sin(time * 3 + j * 0.5 + tentacle.id) * wriggleIntensity * segmentRatio;
                wriggleY = Math.cos(time * 2.5 + j * 0.3 + tentacle.id) * wriggleIntensity * segmentRatio;
            } else if (tentacle.type === 'mini') {
                const miniWriggle = wriggleIntensity * 0.6;
                wriggleX = Math.sin(time * 4 + j * 0.8 + tentacle.id) * miniWriggle * segmentRatio;
                wriggleY = Math.cos(time * 3.5 + j * 0.6 + tentacle.id) * miniWriggle * segmentRatio;
            } else {
                const polarWriggle = wriggleIntensity * 0.7;
                wriggleX = Math.sin(time * 1.8 + j * 0.4 + tentacle.id) * polarWriggle * segmentRatio;
                wriggleY = Math.cos(time * 2.2 + j * 0.5 + tentacle.id) * polarWriggle * segmentRatio;
            }

            // Apply reactivity to targets
            if (targetPosition && this.config.reactiveTentacles.enabled) {
                const directionToTarget = targetPosition.subtract(tentacle.mesh.absolutePosition).normalize();
                const reactivity = this.config.reactiveTentacles.reactivity * this.config.reactiveTentacles.aggressionLevel;
                wriggleX += directionToTarget.x * reactivity * segmentRatio;
                wriggleY += directionToTarget.y * reactivity * segmentRatio;
            }

            newPoints.push(new BABYLON.Vector3(
                basePoint.x + wriggleX,
                basePoint.y + wriggleY,
                basePoint.z
            ));
        }

        return newPoints;
    }

    updateSpikePosition(spike, points) {
        const tipPoint = points[points.length - 1];
        const preTipPoint = points[points.length - 2];

        spike.position.copyFrom(tipPoint);

        const direction = tipPoint.subtract(preTipPoint).normalize();
        const up = BABYLON.Vector3.Up();
        const angle = Math.acos(BABYLON.Vector3.Dot(up, direction));
        const axis = BABYLON.Vector3.Cross(up, direction).normalize();

        if (axis.lengthSquared() > 0.001) {
            BABYLON.Quaternion.RotationAxisToRef(axis, angle, spike.rotationQuaternion);
        }
    }

    updateVisualEffects(time) {
        // Dynamic orb glow based on state
        const baseEmissive = this.config.colorTheme.orb.scale(0.5);
        let glowMultiplier = 1.0;

        switch (this.currentState) {
            case 'aggressive':
                glowMultiplier = 1.8 + Math.sin(time * 8) * 0.3;
                break;
            case 'defensive':
                glowMultiplier = 0.6 + Math.sin(time * 3) * 0.2;
                break;
            default:
                glowMultiplier = 1.0 + Math.sin(this.glowPhase + time) * 0.2;
        }

        let currentGlowIntensity = this.config.glowIntensity * glowMultiplier;

        // Stealth mode effects
        if (this.isInStealthMode) {
            currentGlowIntensity *= this.config.stealthMode.invisibilityLevel;
            this.orb.visibility = this.config.stealthMode.invisibilityLevel;
            this.tentacles.forEach(t => t.mesh.visibility = this.config.stealthMode.invisibilityLevel);

            // Distortion effect
            this.orb.scaling.x = 1.0 + Math.sin(time * 10) * 0.05;
            this.orb.scaling.z = 1.0 + Math.cos(time * 12) * 0.05;
        } else {
            this.orb.visibility = 1.0;
            this.tentacles.forEach(t => t.mesh.visibility = 1.0);
            this.orb.scaling.setAll(1.0);
        }

        // Energy shield effects
        if (this.hasEnergyShield) {
            this.shieldMesh.isVisible = true;
            const shieldPulse = Math.sin(time * 6) * 0.3 + 0.7;
            this.shieldMesh.scaling.setAll(shieldPulse);
            this.shieldMaterial.alpha = 0.2 + Math.sin(time * 4) * 0.1;
        } else {
            this.shieldMesh.isVisible = false;
        }

        this.orbMaterial.emissiveColor = baseEmissive.scale(currentGlowIntensity);

        // Particle effects based on state
        if (this.particleSystem) {
            const baseEmitRate = 20;
            switch (this.currentState) {
                case 'aggressive':
                    this.particleSystem.emitRate = baseEmitRate * 2;
                    break;
                case 'defensive':
                    this.particleSystem.emitRate = baseEmitRate * 0.5;
                    break;
                default:
                    this.particleSystem.emitRate = baseEmitRate;
            }
        }
    }

    updateCombatSystems(time, deltaTime) {
        this.updateSpikes(deltaTime);
        this.updateStealthMode(time);
        this.updateEnergyShield(time);
        this.updateTentacleLash(time);
        this.updateAutoAttack(time);
    }

    updateSpikes(deltaTime) {
        const currentTime = performance.now() * 0.001;
        this.spikes = this.spikes.filter(spike => {
            spike.mesh.position.addInPlace(spike.direction.scale(spike.speed * deltaTime));

            if (currentTime - spike.spawnTime > spike.lifetime) {
                spike.mesh.dispose();
                return false;
            }
            return true;
        });
    }

    updateStealthMode(time) {
        if (this.isInStealthMode) {
            if (time - this.stealthStartTime > this.config.stealthMode.duration) {
                this.deactivateStealthMode();
            }
        }
    }

    updateEnergyShield(time) {
        if (this.hasEnergyShield) {
            if (time - this.shieldStartTime > this.config.energyShield.duration) {
                this.deactivateEnergyShield();
            }
        }
    }

    updateTentacleLash(time) {
        // Auto-lash at nearby targets when aggressive
        if (this.currentState === 'aggressive' && this.detectedTargets.length > 0 &&
            this.config.tentacleLash.enabled) {

            const target = this.detectedTargets[0];
            const distance = BABYLON.Vector3.Distance(this.orb.position, target);

            if (distance <= this.config.tentacleLash.range &&
                time - this.lastTentacleLashTime > this.config.tentacleLash.cooldown) {
                this.performTentacleLash(target);
            }
        }
    }

    updateAutoAttack(time) {
        // Auto-shoot spikes when aggressive and targets are in range
        if (this.currentState === 'aggressive' && this.detectedTargets.length > 0 &&
            this.config.spikeShot.enabled) {

            const target = this.detectedTargets[0];
            const distance = BABYLON.Vector3.Distance(this.orb.position, target);

            if (distance > this.config.tentacleLash.range && distance < 10 &&
                time - this.lastSpikeShotTime > this.config.spikeShot.cooldown * 0.7) {
                this.shootSpikesAtTarget(target);
            }
        }
    }

    // --- ENHANCED COMBAT ABILITIES ---

    shootSpikes() {
        if (!this.config.spikeShot.enabled) return;

        const currentTime = performance.now() * 0.001;
        if (currentTime - this.lastSpikeShotTime < this.config.spikeShot.cooldown) return;

        this.lastSpikeShotTime = currentTime;

        // Create a volley of spikes
        this.tentacles.forEach((t, index) => {
            if (t.spike && index % Math.max(1, Math.floor(this.tentacles.length / this.config.spikeShot.volleySize)) === 0) {
                this.createAndFireSpike(t, null);
            }
        });
    }

    shootSpikesAtTarget(targetPosition) {
        if (!this.config.spikeShot.enabled) return;

        const currentTime = performance.now() * 0.001;
        if (currentTime - this.lastSpikeShotTime < this.config.spikeShot.cooldown) return;

        this.lastSpikeShotTime = currentTime;

        // Fire spikes from multiple tentacles toward target
        const selectedTentacles = this.tentacles.filter((t, i) => t.spike && i % 3 === 0);
        selectedTentacles.forEach(t => {
            this.createAndFireSpike(t, targetPosition);
        });
    }

    createAndFireSpike(tentacle, targetPosition) {
        const spikeMesh = tentacle.spike.createInstance("shotSpike");
        spikeMesh.position.copyFrom(tentacle.spike.absolutePosition);
        spikeMesh.rotationQuaternion.copyFrom(tentacle.spike.rotationQuaternion);
        spikeMesh.isVisible = true;

        let direction;
        if (targetPosition) {
            direction = targetPosition.subtract(spikeMesh.position).normalize();
            // Add some spread for realism
            const spread = this.config.spikeShot.spread;
            direction.x += (Math.random() - 0.5) * spread;
            direction.y += (Math.random() - 0.5) * spread;
            direction.z += (Math.random() - 0.5) * spread;
            direction = direction.normalize();
        } else {
            // Use tentacle's natural direction - get forward vector from rotation
            const tentacleForward = new BABYLON.Vector3(0, 0, 1);
            const worldMatrix = tentacle.parent.getWorldMatrix();
            direction = BABYLON.Vector3.TransformNormal(tentacleForward, worldMatrix).normalize();
        }

        const currentTime = performance.now() * 0.001;

        this.spikes.push({
            mesh: spikeMesh,
            direction: direction,
            speed: this.config.spikeShot.spikeSpeed,
            spawnTime: currentTime,
            lifetime: this.config.spikeShot.spikeLifetime,
            damage: 15 + this.energyLevel * 5
        });
    }

    performTentacleLash(targetPosition) {
        this.lastTentacleLashTime = performance.now() * 0.001;

        // Find tentacles closest to target
        const nearTentacles = this.tentacles.filter(t => {
            const distance = BABYLON.Vector3.Distance(t.mesh.absolutePosition, targetPosition);
            return distance <= this.config.tentacleLash.range && t.type !== 'mini';
        }).slice(0, 3);

        nearTentacles.forEach(tentacle => {
            tentacle.aggressionLevel = 2.0;
            tentacle.lastLashTime = performance.now() * 0.001;

            // Create impact effect
            this.createLashImpactEffect(targetPosition);
        });

        // Reset aggression after a short time
        setTimeout(() => {
            nearTentacles.forEach(t => t.aggressionLevel = 0);
        }, this.config.tentacleLash.windupTime * 1000);
    }

    createLashImpactEffect(position) {
        // Create temporary impact particle burst
        const impactSystem = new BABYLON.ParticleSystem("lashImpact", 50, this.scene);
        impactSystem.particleTexture = new BABYLON.Texture("https://playground.babylonjs.com/textures/flare.png", this.scene);

        // Position the emitter at impact point
        const emitter = BABYLON.MeshBuilder.CreateSphere("impactEmitter", { diameter: 0.1 }, this.scene);
        emitter.position.copyFrom(position);
        emitter.isVisible = false;
        impactSystem.emitter = emitter;

        impactSystem.minEmitBox = new BABYLON.Vector3(-0.2, -0.2, -0.2);
        impactSystem.maxEmitBox = new BABYLON.Vector3(0.2, 0.2, 0.2);

        impactSystem.color1 = new BABYLON.Color4(this.config.colorTheme.accent.r, this.config.colorTheme.accent.g, this.config.colorTheme.accent.b, 1.0);
        impactSystem.color2 = new BABYLON.Color4(1, 1, 1, 0.5);

        impactSystem.minSize = 0.1;
        impactSystem.maxSize = 0.3;
        impactSystem.minLifeTime = 0.2;
        impactSystem.maxLifeTime = 0.5;
        impactSystem.emitRate = 200;

        impactSystem.blendMode = BABYLON.ParticleSystem.BLENDMODE_ONEONE;
        impactSystem.gravity = new BABYLON.Vector3(0, -5, 0);

        impactSystem.start();

        // Clean up after burst
        setTimeout(() => {
            impactSystem.stop();
            setTimeout(() => {
                impactSystem.dispose();
                emitter.dispose();
            }, 1000);
        }, 100);
    }

    activateStealthMode() {
        if (!this.config.stealthMode.enabled || this.isInStealthMode) return;

        const currentTime = performance.now() * 0.001;
        if (currentTime - this.stealthStartTime < this.config.stealthMode.cooldown && this.stealthStartTime !== 0) {
            return;
        }

        this.isInStealthMode = true;
        this.stealthStartTime = currentTime;

        // Visual effect for stealth activation
        this.createStealthActivationEffect();
    }

    deactivateStealthMode() {
        this.isInStealthMode = false;

        // Restoration effect
        this.createStealthDeactivationEffect();
    }

    createStealthActivationEffect() {
        // Ripple effect when going stealth
        const ripple = BABYLON.MeshBuilder.CreateGround("stealthRipple", { width: 10, height: 10 }, this.scene);
        ripple.position.copyFrom(this.orb.position);
        ripple.position.y = 0.1;

        const rippleMaterial = new BABYLON.StandardMaterial("rippleMat", this.scene);
        rippleMaterial.diffuseColor = this.config.colorTheme.accent;
        rippleMaterial.alpha = 0.5;
        ripple.material = rippleMaterial;

        // Animate ripple expansion and fade
        const startTime = performance.now();
        const animateRipple = () => {
            const elapsed = (performance.now() - startTime) / 1000;
            if (elapsed < 1.0) {
                ripple.scaling.x = ripple.scaling.z = elapsed * 3;
                rippleMaterial.alpha = 0.5 * (1 - elapsed);
                requestAnimationFrame(animateRipple);
            } else {
                ripple.dispose();
            }
        };
        animateRipple();
    }

    createStealthDeactivationEffect() {
        // Burst effect when exiting stealth
        const burst = new BABYLON.ParticleSystem("stealthBurst", 100, this.scene);
        burst.particleTexture = new BABYLON.Texture("https://playground.babylonjs.com/textures/flare.png", this.scene);
        burst.emitter = this.orb;

        burst.color1 = new BABYLON.Color4(this.config.colorTheme.accent.r, this.config.colorTheme.accent.g, this.config.colorTheme.accent.b, 1);
        burst.color2 = new BABYLON.Color4(1, 1, 1, 0.5);

        burst.minSize = 0.05;
        burst.maxSize = 0.2;
        burst.minLifeTime = 0.5;
        burst.maxLifeTime = 1.0;
        burst.emitRate = 500;

        burst.start();
        setTimeout(() => {
            burst.stop();
            setTimeout(() => burst.dispose(), 1500);
        }, 200);
    }

    activateEnergyShield() {
        if (!this.config.energyShield.enabled || this.hasEnergyShield) return;

        const currentTime = performance.now() * 0.001;
        if (currentTime - this.shieldStartTime < this.config.energyShield.cooldown && this.shieldStartTime !== 0) {
            return;
        }

        this.hasEnergyShield = true;
        this.shieldStartTime = currentTime;

        // Shield activation sound effect could go here
        console.log("Energy shield activated!");
    }

    deactivateEnergyShield() {
        this.hasEnergyShield = false;
        console.log("Energy shield deactivated!");
    }

    // --- DAMAGE AND HEALTH SYSTEM ---

    takeDamage(amount) {
        if (this.hasEnergyShield) {
            amount *= (1 - this.config.energyShield.absorption);
        }

        this.health = Math.max(0, this.health - amount);

        // Visual feedback for taking damage
        this.createDamageEffect();

        // State changes based on health
        if (this.health <= 0) {
            this.die();
        } else if (this.health < this.maxHealth * 0.3) {
            this.currentState = 'defensive';
            this.energyLevel = Math.max(this.energyLevel - 0.2, 0.3);
        }
    }

    createDamageEffect() {
        // Flash red briefly
        const originalEmissive = this.orbMaterial.emissiveColor.clone();
        this.orbMaterial.emissiveColor = new BABYLON.Color3(1, 0, 0);

        setTimeout(() => {
            this.orbMaterial.emissiveColor = originalEmissive;
        }, 150);
    }

    heal(amount) {
        this.health = Math.min(this.maxHealth, this.health + amount);

        // Visual healing effect
        this.createHealEffect();
    }

    createHealEffect() {
        const heal = new BABYLON.ParticleSystem("healEffect", 30, this.scene);
        heal.particleTexture = new BABYLON.Texture("https://playground.babylonjs.com/textures/flare.png", this.scene);
        heal.emitter = this.orb;

        heal.color1 = new BABYLON.Color4(0, 1, 0, 1);
        heal.color2 = new BABYLON.Color4(0.5, 1, 0.5, 0.5);

        heal.minSize = 0.1;
        heal.maxSize = 0.2;
        heal.minLifeTime = 1.0;
        heal.maxLifeTime = 2.0;
        heal.emitRate = 50;

        heal.gravity = new BABYLON.Vector3(0, 2, 0); // Float upward

        heal.start();
        setTimeout(() => {
            heal.stop();
            setTimeout(() => heal.dispose(), 2500);
        }, 1000);
    }

    die() {
        if (this.isDead) return;

        this.isDead = true;
        console.log("Tentacle Orb destroyed!");

        // Death explosion effect
        this.createDeathExplosion();

        // Cleanup after death animation
        setTimeout(() => {
            this.dispose();
        }, 2000);
    }

    createDeathExplosion() {
        // Large explosion particle system
        const explosion = new BABYLON.ParticleSystem("deathExplosion", 200, this.scene);
        explosion.particleTexture = new BABYLON.Texture("../R2ASSETS/assets/images/flare.png", this.scene);
        explosion.emitter = this.orb;

        explosion.minEmitBox = new BABYLON.Vector3(-0.5, -0.5, -0.5);
        explosion.maxEmitBox = new BABYLON.Vector3(0.5, 0.5, 0.5);

        explosion.color1 = new BABYLON.Color4(this.config.colorTheme.tentacleStart.r, this.config.colorTheme.tentacleStart.g, this.config.colorTheme.tentacleStart.b, 1);
        explosion.color2 = new BABYLON.Color4(1, 0.5, 0, 1);
        explosion.colorDead = new BABYLON.Color4(0.2, 0.2, 0.2, 0);

        explosion.minSize = 0.1;
        explosion.maxSize = 0.5;
        explosion.minLifeTime = 1.0;
        explosion.maxLifeTime = 3.0;
        explosion.emitRate = 300;

        explosion.blendMode = BABYLON.ParticleSystem.BLENDMODE_ONEONE;
        explosion.gravity = new BABYLON.Vector3(0, -2, 0);
        explosion.direction1 = new BABYLON.Vector3(-2, 2, -2);
        explosion.direction2 = new BABYLON.Vector3(2, 5, 2);
        explosion.minAngularSpeed = 0;
        explosion.maxAngularSpeed = Math.PI;

        explosion.start();

        // Hide mesh components
        this.orb.visibility = 0;
        this.tentacles.forEach(t => t.mesh.visibility = 0);
        if (this.particleSystem) this.particleSystem.stop();

        setTimeout(() => {
            explosion.stop();
            setTimeout(() => explosion.dispose(), 3000);
        }, 500);
    }

    // --- PUBLIC INTERFACE METHODS ---

    getHealthPercentage() {
        return this.health / this.maxHealth;
    }

    getCurrentState() {
        return this.currentState;
    }

    forceState(newState) {
        this.currentState = newState;
        this.stateTimer = 0;
    }

    addTarget(targetPosition) {
        this.detectedTargets.push(targetPosition);
    }

    clearTargets() {
        this.detectedTargets = [];
    }

    setEnergyLevel(level) {
        this.energyLevel = Math.max(0.1, Math.min(3.0, level));
    }

    // --- CLEANUP ---

    dispose() {
        if (this.updateObserver) {
            this.scene.unregisterBeforeRender(this.updateObserver);
        }

        this.tentacles.forEach(t => {
            if (t.mesh) t.mesh.dispose();
            if (t.spike) t.spike.dispose();
            if (t.parent) t.parent.dispose();
        });

        this.spikes.forEach(spike => {
            if (spike.mesh) spike.mesh.dispose();
        });

        if (this.orb) this.orb.dispose();
        if (this.shieldMesh) this.shieldMesh.dispose();
        if (this.spikeInstanceMesh) this.spikeInstanceMesh.dispose();
        if (this.particleSystem) this.particleSystem.dispose();
        if (this.shieldParticles) this.shieldParticles.dispose();

        // Dispose materials
        if (this.orbMaterial) this.orbMaterial.dispose();
        if (this.tentacleMaterial) this.tentacleMaterial.dispose();
        if (this.spikeMaterial) this.spikeMaterial.dispose();
        if (this.shieldMaterial) this.shieldMaterial.dispose();
    }
}

// --- ENHANCED SPAWNING SYSTEM ---

function spawnTentacleOrbs(scene, count = 4, bounds = 150) {
    const orbs = [];

    // Enhanced color themes with accent colors
    const colorThemes = [
        { // Inferno
            orb: new BABYLON.Color3(0.5, 0.1, 0.05),
            tentacleStart: new BABYLON.Color3(0.8, 0.0, 0.0),
            tentacleEnd: new BABYLON.Color3(1.0, 0.4, 0.1),
            accent: new BABYLON.Color3(1.0, 0.8, 0.0)
        },
        { // Toxic
            orb: new BABYLON.Color3(0.1, 0.5, 0.1),
            tentacleStart: new BABYLON.Color3(0.0, 0.7, 0.2),
            tentacleEnd: new BABYLON.Color3(0.4, 1.0, 0.3),
            accent: new BABYLON.Color3(0.8, 1.0, 0.0)
        },
        { // Arcane
            orb: new BABYLON.Color3(0.2, 0.1, 0.6),
            tentacleStart: new BABYLON.Color3(0.4, 0.0, 0.8),
            tentacleEnd: new BABYLON.Color3(0.8, 0.3, 1.0),
            accent: new BABYLON.Color3(1.0, 0.5, 1.0)
        },
        { // Frost
            orb: new BABYLON.Color3(0.1, 0.3, 0.6),
            tentacleStart: new BABYLON.Color3(0.0, 0.5, 0.9),
            tentacleEnd: new BABYLON.Color3(0.3, 0.9, 1.0),
            accent: new BABYLON.Color3(0.8, 1.0, 1.0)
        },
        { // Shadow
            orb: new BABYLON.Color3(0.2, 0.05, 0.2),
            tentacleStart: new BABYLON.Color3(0.3, 0.1, 0.4),
            tentacleEnd: new BABYLON.Color3(0.6, 0.2, 0.8),
            accent: new BABYLON.Color3(0.9, 0.3, 0.9)
        },
        { // Solar
            orb: new BABYLON.Color3(0.6, 0.4, 0.1),
            tentacleStart: new BABYLON.Color3(1.0, 0.6, 0.0),
            tentacleEnd: new BABYLON.Color3(1.0, 0.9, 0.3),
            accent: new BABYLON.Color3(1.0, 1.0, 0.8)
        }
    ];

    // Difficulty-based configurations
    const difficultyConfigs = [
        { // Easy
            health: 75,
            energyLevel: 0.8,
            aggressiveness: 0.7,
            abilityChance: 0.6
        },
        { // Normal
            health: 100,
            energyLevel: 1.0,
            aggressiveness: 1.0,
            abilityChance: 0.8
        },
        { // Hard
            health: 150,
            energyLevel: 1.3,
            aggressiveness: 1.4,
            abilityChance: 0.9
        },
        { // Elite
            health: 200,
            energyLevel: 1.8,
            aggressiveness: 1.8,
            abilityChance: 1.0
        }
    ];

    for (let i = 0; i < count; i++) {
        // Position with minimum distance between orbs
        let position, attempts = 0;
        do {
            const x = (Math.random() - 0.5) * bounds;
            const z = (Math.random() - 0.5) * bounds;
            position = new BABYLON.Vector3(x, 0, z);
            attempts++;
        } while (attempts < 20 && orbs.some(orb =>
            BABYLON.Vector3.Distance(orb.position, position) < 15));

        // Select random theme and difficulty
        const randomTheme = colorThemes[Math.floor(Math.random() * colorThemes.length)];
        const difficulty = difficultyConfigs[Math.floor(Math.random() * difficultyConfigs.length)];

        // Create varied configurations
        const orbConfig = {
            colorTheme: randomTheme,
            count: 12 + Math.floor(Math.random() * 8), // 12-19 tentacles
            length: 1.5 + Math.random() * 1.0, // 1.5-2.5 length
            energyLevel: difficulty.energyLevel,
            glowIntensity: 0.3 + Math.random() * 0.4,

            // Randomize abilities
            spikeShot: {
                enabled: Math.random() < difficulty.abilityChance,
                cooldown: 3 + Math.random() * 4,
                spikeSpeed: 0.6 + Math.random() * 0.6,
                volleySize: 2 + Math.floor(Math.random() * 4)
            },

            stealthMode: {
                enabled: Math.random() < difficulty.abilityChance * 0.7,
                duration: 4 + Math.random() * 4,
                cooldown: 10 + Math.random() * 8
            },

            tentacleLash: {
                enabled: Math.random() < difficulty.abilityChance * 0.8,
                damage: 20 + Math.floor(Math.random() * 20),
                range: 2.5 + Math.random() * 1.5
            },

            energyShield: {
                enabled: Math.random() < difficulty.abilityChance * 0.6,
                absorption: 0.5 + Math.random() * 0.4,
                duration: 4 + Math.random() * 3
            },

            reactiveTentacles: {
                enabled: true,
                reactivity: 0.5 + Math.random() * difficulty.aggressiveness,
                aggressionLevel: difficulty.aggressiveness
            },

            patrol: {
                enabled: true,
                radius: 15 + Math.random() * 20,
                speed: 0.3 + Math.random() * 0.5,
                verticalBob: Math.random() < 0.5
            }
        };

        const orb = new TentacleOrb(scene, position, orbConfig);
        orb.health = difficulty.health;
        orb.maxHealth = difficulty.health;
        orbs.push(orb);
    }

    console.log(`Spawned ${count} enhanced tentacle orbs with varied abilities and difficulties!`);
    return orbs;
}

// --- TENTACLE ORB MANAGER ---
// Manages multiple orbs and their interactions

class TentacleOrbManager {
    constructor(scene) {
        this.scene = scene;
        this.orbs = [];
        this.updateInterval = null;

        // Manager settings
        this.config = {
            maxOrbs: 8,
            spawnCooldown: 30, // seconds
            territoryRadius: 20,
            packBehavior: true,
            adaptiveDifficulty: true
        };

        this.lastSpawnTime = 0;
        this.playerThreatLevel = 1.0; // Increases based on player actions
    }

    addOrb(orb) {
        this.orbs.push(orb);
        this.updateOrbBehaviors();
    }

    removeOrb(orb) {
        const index = this.orbs.indexOf(orb);
        if (index > -1) {
            this.orbs.splice(index, 1);
            this.updateOrbBehaviors();
        }
    }

    updateOrbBehaviors() {
        // Update pack behaviors and territorial relationships
        this.orbs.forEach((orb, i) => {
            if (orb.isDead) return;

            // Find nearby orbs for pack behavior
            const nearbyOrbs = this.orbs.filter((other, j) => {
                if (i === j || other.isDead) return false;
                const distance = BABYLON.Vector3.Distance(orb.orb.position, other.orb.position);
                return distance < this.config.territoryRadius;
            });

            // Apply pack bonuses
            if (nearbyOrbs.length > 0 && this.config.packBehavior) {
                orb.setEnergyLevel(orb.energyLevel * (1 + nearbyOrbs.length * 0.1));

                // Share targets
                nearbyOrbs.forEach(other => {
                    orb.detectedTargets.forEach(target => {
                        if (!other.detectedTargets.some(t => BABYLON.Vector3.Distance(t, target) < 1)) {
                            other.addTarget(target);
                        }
                    });
                });
            }
        });
    }

    spawnAdditionalOrb(difficulty = 'normal') {
        const currentTime = performance.now() * 0.001;
        if (currentTime - this.lastSpawnTime < this.config.spawnCooldown) return false;
        if (this.orbs.filter(o => !o.isDead).length >= this.config.maxOrbs) return false;

        this.lastSpawnTime = currentTime;

        // Find spawn position away from existing orbs
        let spawnPosition;
        let attempts = 0;
        do {
            const angle = Math.random() * Math.PI * 2;
            const distance = 30 + Math.random() * 50;
            spawnPosition = new BABYLON.Vector3(
                Math.cos(angle) * distance,
                0,
                Math.sin(angle) * distance
            );
            attempts++;
        } while (attempts < 20 && this.orbs.some(orb =>
            BABYLON.Vector3.Distance(orb.position, spawnPosition) < 25));

        // Enhanced spawn based on threat level
        const difficultyMod = this.config.adaptiveDifficulty ? this.playerThreatLevel : 1.0;
        const spawnConfig = this.generateAdaptiveConfig(difficulty, difficultyMod);

        const newOrb = new TentacleOrb(this.scene, spawnPosition, spawnConfig);
        this.addOrb(newOrb);

        console.log(`Spawned adaptive tentacle orb (threat level: ${this.playerThreatLevel.toFixed(2)})`);
        return true;
    }

    generateAdaptiveConfig(baseDifficulty, threatMultiplier) {
        const colorThemes = [
            { // Inferno
                orb: new BABYLON.Color3(0.5, 0.1, 0.05),
                tentacleStart: new BABYLON.Color3(0.8, 0.0, 0.0),
                tentacleEnd: new BABYLON.Color3(1.0, 0.4, 0.1),
                accent: new BABYLON.Color3(1.0, 0.8, 0.0)
            },
            { // Void
                orb: new BABYLON.Color3(0.1, 0.0, 0.2),
                tentacleStart: new BABYLON.Color3(0.2, 0.0, 0.4),
                tentacleEnd: new BABYLON.Color3(0.5, 0.1, 0.8),
                accent: new BABYLON.Color3(0.8, 0.2, 1.0)
            }
        ];

        return {
            colorTheme: colorThemes[Math.floor(Math.random() * colorThemes.length)],
            count: Math.floor(12 + threatMultiplier * 6),
            length: 1.8 + threatMultiplier * 0.8,
            energyLevel: 1.0 + threatMultiplier * 0.8,

            spikeShot: {
                enabled: true,
                cooldown: Math.max(2, 5 - threatMultiplier),
                spikeSpeed: 0.8 + threatMultiplier * 0.4,
                volleySize: Math.floor(2 + threatMultiplier * 2)
            },

            stealthMode: {
                enabled: threatMultiplier > 1.2,
                duration: 5 + threatMultiplier,
                cooldown: Math.max(8, 15 - threatMultiplier * 2)
            },

            tentacleLash: {
                enabled: true,
                damage: Math.floor(25 + threatMultiplier * 15),
                range: 3.0 + threatMultiplier * 0.5,
                cooldown: Math.max(2, 4 - threatMultiplier * 0.5)
            },

            energyShield: {
                enabled: threatMultiplier > 1.0,
                absorption: Math.min(0.9, 0.6 + threatMultiplier * 0.2),
                duration: 4 + threatMultiplier
            },

            reactiveTentacles: {
                enabled: true,
                reactivity: 0.8 + threatMultiplier * 0.4,
                aggressionLevel: 1.0 + threatMultiplier * 0.6,
                detectionRadius: 12 + threatMultiplier * 3
            }
        };
    }

    updateThreatLevel(playerAction) {
        // Increase threat based on player actions
        switch (playerAction) {
            case 'orb_killed':
                this.playerThreatLevel += 0.2;
                break;
            case 'multiple_kills':
                this.playerThreatLevel += 0.5;
                break;
            case 'weapon_upgrade':
                this.playerThreatLevel += 0.3;
                break;
            case 'ability_used':
                this.playerThreatLevel += 0.1;
                break;
        }

        // Cap threat level
        this.playerThreatLevel = Math.min(this.playerThreatLevel, 3.0);

        // Enhance existing orbs based on new threat level
        this.orbs.forEach(orb => {
            if (!orb.isDead && Math.random() < 0.3) {
                orb.setEnergyLevel(orb.energyLevel * (1 + this.playerThreatLevel * 0.1));
            }
        });
    }

    getActiveOrbCount() {
        return this.orbs.filter(orb => !orb.isDead).length;
    }

    getAllOrbs() {
        return this.orbs;
    }

    getOrbsInRadius(position, radius) {
        return this.orbs.filter(orb => {
            if (orb.isDead) return false;
            return BABYLON.Vector3.Distance(orb.orb.position, position) <= radius;
        });
    }

    forceOrbState(state, radius = Infinity, centerPosition = null) {
        this.orbs.forEach(orb => {
            if (orb.isDead) return;

            if (centerPosition && radius < Infinity) {
                const distance = BABYLON.Vector3.Distance(orb.orb.position, centerPosition);
                if (distance > radius) return;
            }

            orb.forceState(state);
        });
    }

    dispose() {
        this.orbs.forEach(orb => orb.dispose());
        this.orbs = [];

        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
    }
}

// --- ADVANCED UTILITY FUNCTIONS ---

// Create a specific orb type with preset configurations
function createSpecialTentacleOrb(scene, position, type = 'guardian') {
    const specialConfigs = {
        guardian: {
            colorTheme: {
                orb: new BABYLON.Color3(0.2, 0.4, 0.8),
                tentacleStart: new BABYLON.Color3(0.0, 0.3, 1.0),
                tentacleEnd: new BABYLON.Color3(0.4, 0.8, 1.0),
                accent: new BABYLON.Color3(1.0, 1.0, 1.0)
            },
            count: 16,
            length: 2.5,
            orbSize: 0.8,
            energyLevel: 2.0,
            glowIntensity: 0.8,

            patrol: { enabled: false },

            energyShield: {
                enabled: true,
                absorption: 0.9,
                duration: 10,
                cooldown: 8
            },

            tentacleLash: {
                enabled: true,
                damage: 40,
                range: 4.0,
                cooldown: 2.0
            },

            spikeShot: {
                enabled: true,
                cooldown: 3,
                spikeSpeed: 1.2,
                volleySize: 6,
                spread: 0.2
            }
        },

        hunter: {
            colorTheme: {
                orb: new BABYLON.Color3(0.1, 0.5, 0.1),
                tentacleStart: new BABYLON.Color3(0.0, 0.8, 0.0),
                tentacleEnd: new BABYLON.Color3(0.5, 1.0, 0.2),
                accent: new BABYLON.Color3(1.0, 1.0, 0.0)
            },
            count: 10,
            length: 3.0,
            thickness: 0.015,
            energyLevel: 1.5,

            patrol: {
                enabled: true,
                radius: 40,
                speed: 0.8
            },

            stealthMode: {
                enabled: true,
                duration: 8,
                cooldown: 6,
                invisibilityLevel: 0.05
            },

            reactiveTentacles: {
                enabled: true,
                reactivity: 1.5,
                aggressionLevel: 2.0,
                detectionRadius: 20
            },

            spikeShot: {
                enabled: true,
                cooldown: 2,
                spikeSpeed: 1.5,
                volleySize: 2,
                spread: 0.1
            }
        },

        swarm: {
            colorTheme: {
                orb: new BABYLON.Color3(0.4, 0.0, 0.4),
                tentacleStart: new BABYLON.Color3(0.6, 0.0, 0.6),
                tentacleEnd: new BABYLON.Color3(1.0, 0.2, 1.0),
                accent: new BABYLON.Color3(1.0, 0.5, 1.0)
            },
            count: 20,
            length: 1.2,
            orbSize: 0.4,
            thickness: 0.018,
            energyLevel: 1.2,

            patrol: {
                enabled: true,
                radius: 15,
                speed: 1.2
            },

            spikeShot: {
                enabled: true,
                cooldown: 1.5,
                spikeSpeed: 0.8,
                volleySize: 8,
                spread: 0.4
            },

            tentacleLash: {
                enabled: true,
                damage: 15,
                range: 2.0,
                cooldown: 1.0
            }
        }
    };

    const config = specialConfigs[type];
    if (!config) {
        console.warn(`Unknown special orb type: ${type}`);
        return null;
    }

    const orb = new TentacleOrb(scene, position, config);
    orb.specialType = type;

    // Set health based on type
    const healthMultipliers = { guardian: 3.0, hunter: 1.5, swarm: 0.8 };
    orb.health = Math.floor(100 * (healthMultipliers[type] || 1.0));
    orb.maxHealth = orb.health;

    console.log(`Created special tentacle orb: ${type}`);
    return orb;
}

// Create a formation of orbs
function createTentacleOrbFormation(scene, centerPosition, formation = 'circle', count = 5) {
    const orbs = [];
    const formations = {
        circle: (i, total) => {
            const angle = (i / total) * Math.PI * 2;
            const radius = 20;
            return new BABYLON.Vector3(
                centerPosition.x + Math.cos(angle) * radius,
                centerPosition.y,
                centerPosition.z + Math.sin(angle) * radius
            );
        },

        line: (i, total) => {
            const spacing = 10;
            const offset = (total - 1) * spacing / 2;
            return new BABYLON.Vector3(
                centerPosition.x + i * spacing - offset,
                centerPosition.y,
                centerPosition.z
            );
        },

        triangle: (i, total) => {
            const positions = [
                new BABYLON.Vector3(0, 0, 0),
                new BABYLON.Vector3(-15, 0, -10),
                new BABYLON.Vector3(15, 0, -10),
                new BABYLON.Vector3(-7.5, 0, 10),
                new BABYLON.Vector3(7.5, 0, 10)
            ];
            return centerPosition.add(positions[i % positions.length]);
        },

        random: (i, total) => {
            const radius = 25;
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * radius;
            return new BABYLON.Vector3(
                centerPosition.x + Math.cos(angle) * distance,
                centerPosition.y,
                centerPosition.z + Math.sin(angle) * distance
            );
        }
    };

    const positionFunc = formations[formation] || formations.circle;

    for (let i = 0; i < count; i++) {
        const position = positionFunc(i, count);

        // Vary the orbs in the formation
        const orbTypes = ['guardian', 'hunter', 'swarm'];
        const randomType = i === 0 ? 'guardian' : orbTypes[Math.floor(Math.random() * orbTypes.length)];

        const orb = createSpecialTentacleOrb(scene, position, randomType);
        if (orb) {
            orbs.push(orb);
        }
    }

    console.log(`Created ${formation} formation with ${orbs.length} orbs`);
    return orbs;
}

// --- EXAMPLE USAGE AND TESTING ---

// Example function to demonstrate the enhanced system
function demonstrateEnhancedTentacleOrbs(scene) {
    console.log("=== Enhanced Tentacle Orb System Demo ===");

    // Create manager
    const orbManager = new TentacleOrbManager(scene);

    // Spawn varied orbs
    const standardOrbs = spawnTentacleOrbs(scene, 3, 100);
    standardOrbs.forEach(orb => orbManager.addOrb(orb));

    // Create special formations
    const guardianFormation = createTentacleOrbFormation(scene,
        new BABYLON.Vector3(50, 0, 50), 'circle', 3);
    guardianFormation.forEach(orb => orbManager.addOrb(orb));

    // Create a single powerful hunter
    const eliteHunter = createSpecialTentacleOrb(scene,
        new BABYLON.Vector3(-50, 0, -50), 'hunter');
    if (eliteHunter) {
        orbManager.addOrb(eliteHunter);
    }

    // Set up adaptive spawning
    setInterval(() => {
        if (Math.random() < 0.3) { // 30% chance every interval
            orbManager.spawnAdditionalOrb();
        }
    }, 20000); // Every 20 seconds

    // Simulate player actions for threat level testing
    setTimeout(() => {
        orbManager.updateThreatLevel('orb_killed');
        console.log("Threat level increased due to orb kill");
    }, 10000);

    setTimeout(() => {
        orbManager.updateThreatLevel('multiple_kills');
        console.log("Threat level significantly increased");
    }, 30000);

    console.log(`System initialized with ${orbManager.getActiveOrbCount()} active orbs`);

    // Return manager for external control
    return orbManager;
}

// Export for use in game systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        TentacleOrb,
        TentacleOrbManager,
        spawnTentacleOrbs,
        createSpecialTentacleOrb,
        createTentacleOrbFormation,
        demonstrateEnhancedTentacleOrbs
    };
}