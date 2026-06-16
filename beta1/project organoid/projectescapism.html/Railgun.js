/**
 * Railgun — High-Fidelity Pointcloud Electromagnetic Accelerator
 * Features: Entirely procedural, rendered via a single custom shader points-mesh.
 * Animations: Idle hum, charging EM waves, rotating power core, and firing shockwave expansion.
 */
class Railgun extends THREE.Group {
    constructor() {
        super();
        this.name = "procedural_railgun";

        // Animation states
        this.chargeLevel = 0.0;
        this.timeSinceLastFire = 99.0;
        this.firedIntensity = 0.0;
        this.gunPitch = 0.0;
        this.gunZ = 0.0;
        this.lightIntensity = 0.0;
        this.coilPulse = 0.0;
        this.discharged = false;
        this.dischargeTimer = 0.0;
        this.elapsedTime = 0.0;

        // Create lights so the external rendering logic finds them
        this.muzzleLight = new THREE.PointLight(0x44ffff, 0, 8);
        this.muzzleLight.position.set(0, 0.15, -3.3);
        this.add(this.muzzleLight);

        this.coreLight = new THREE.PointLight(0x44ffff, 0.8, 3);
        this.coreLight.position.set(0, 0.15, 0.4);
        this.add(this.coreLight);

        this.buildRailgun();
    }

    buildRailgun() {
        // Arrays to hold vertex data
        const positions = [];
        const colors = [];
        const partIds = [];
        const phases = [];

        // Helper: Add points within a box volume
        const addPointsForBox = (w, h, d, centerX, centerY, centerZ, partId, colorHex, count, rotateXVal = 0) => {
            const col = new THREE.Color(colorHex);
            for (let i = 0; i < count; i++) {
                let px = (Math.random() - 0.5) * w;
                let py = (Math.random() - 0.5) * h;
                let pz = (Math.random() - 0.5) * d;

                if (rotateXVal !== 0) {
                    const cosX = Math.cos(rotateXVal);
                    const sinX = Math.sin(rotateXVal);
                    const newY = py * cosX - pz * sinX;
                    const newZ = py * sinX + pz * cosX;
                    py = newY;
                    pz = newZ;
                }

                positions.push(px + centerX, py + centerY, pz + centerZ);
                colors.push(col.r, col.g, col.b);
                partIds.push(partId);
                phases.push(Math.random() * Math.PI * 2);
            }
        };

        // Helper: Add points on a torus
        const addPointsForTorus = (radius, tube, centerX, centerY, centerZ, partId, colorHex, count, rotateYVal = 0) => {
            const col = new THREE.Color(colorHex);
            for (let i = 0; i < count; i++) {
                const u = Math.random() * Math.PI * 2;
                const v = Math.random() * Math.PI * 2;
                let px = (radius + tube * Math.cos(v)) * Math.cos(u);
                let py = (radius + tube * Math.cos(v)) * Math.sin(u);
                let pz = tube * Math.sin(v);

                if (rotateYVal !== 0) {
                    const cosY = Math.cos(rotateYVal);
                    const sinY = Math.sin(rotateYVal);
                    const newX = px * cosY + pz * sinY;
                    const newZ = -px * sinY + pz * cosY;
                    px = newX;
                    pz = newZ;
                }

                positions.push(px + centerX, py + centerY, pz + centerZ);
                colors.push(col.r, col.g, col.b);
                partIds.push(partId);
                phases.push(Math.random() * Math.PI * 2);
            }
        };

        // Helper: Add points in a sphere volume
        const addPointsForSphere = (radius, centerX, centerY, centerZ, partId, colorHex, count) => {
            const col = new THREE.Color(colorHex);
            for (let i = 0; i < count; i++) {
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.acos(2.0 * Math.random() - 1.0);
                const r = radius * Math.cbrt(Math.random());
                const px = r * Math.sin(phi) * Math.cos(theta);
                const py = r * Math.sin(phi) * Math.sin(theta);
                const pz = r * Math.cos(phi);

                positions.push(px + centerX, py + centerY, pz + centerZ);
                colors.push(col.r, col.g, col.b);
                partIds.push(partId);
                phases.push(Math.random() * Math.PI * 2);
            }
        };

        // 1. FRAME / RECEIVER BODY (PartId = 0.0)
        // Main receiver
        addPointsForBox(0.32, 0.3, 1.8, 0, 0.15, 0, 0.0, 0x1a2030, 800);
        // Top bevel panel
        addPointsForBox(0.28, 0.04, 1.6, 0, 0.32, 0, 0.0, 0x0e1520, 200);
        // Side panels
        addPointsForBox(0.04, 0.22, 1.4, -0.18, 0.15, 0, 0.0, 0x0e1520, 150);
        addPointsForBox(0.04, 0.22, 1.4, 0.18, 0.15, 0, 0.0, 0x0e1520, 150);
        // Scope elements
        addPointsForBox(0.12, 0.06, 0.3, 0, 0.36, 0.1, 0.0, 0x1a2030, 80);
        addPointsForBox(0.12, 0.12, 0.4, 0, 0.42, 0.1, 0.0, 0x003355, 150);
        // Heat sink fins
        for (let i = 0; i < 6; i++) {
            addPointsForBox(0.35, 0.02, 0.06, 0, 0.34, -0.3 - i * 0.15, 0.0, 0x334455, 40);
        }

        // 2. STOCK & GRIP (PartId = 1.0)
        // Grip (tilted)
        addPointsForBox(0.2, 0.8, 0.36, 0, -0.4, 0.6, 1.0, 0x0a0a0a, 250, Math.PI * 0.1);
        // Stock bar
        addPointsForBox(0.06, 0.06, 0.7, 0, 0.15, 1.2, 1.0, 0x1a2030, 150);
        // Butt plate
        addPointsForBox(0.16, 0.2, 0.04, 0, 0.15, 1.56, 1.0, 0x0e1520, 120);
        // Power cell indicators
        addPointsForBox(0.14, 0.5, 0.2, 0, -0.3, 0.0, 1.0, 0x0e1520, 100);
        addPointsForBox(0.02, 0.04, 0.02, 0.08, -0.15, 0.0, 1.0, 0x00ff88, 30);

        // 3. BARREL DUAL RAILS (PartId = 2.0)
        // Upper rail
        addPointsForBox(0.06, 0.06, 2.4, 0, 0.28, -2.0, 2.0, 0x667788, 350);
        // Lower rail
        addPointsForBox(0.06, 0.06, 2.4, 0, 0.02, -2.0, 2.0, 0x667788, 350);
        // Spacers
        for (let i = 0; i < 6; i++) {
            addPointsForBox(0.08, 0.04, 0.04, 0, 0.15, -1.0 - i * 0.35, 2.0, 0x1a2030, 30);
        }

        // 4. CAPACITOR COILS (PartId = 3.0)
        // 8 Torus coils
        for (let i = 0; i < 8; i++) {
            addPointsForTorus(0.14, 0.015, 0, 0.15, -0.8 - i * 0.28, 3.0, 0x44ffff, 110, Math.PI / 2);
        }

        // 5. POWER CORE (PartId = 4.0)
        // Glowing reactor core
        addPointsForSphere(0.07, 0, 0.15, 0.4, 4.0, 0x00ffff, 450);

        // 6. ENERGY SPINE CONDUIT (PartId = 5.0)
        // Center charging spine
        addPointsForBox(0.05, 0.05, 1.8, 0, 0.15, -1.7, 5.0, 0x00ccff, 250);

        // 7. MUZZLE EMITTER RING (PartId = 6.0)
        addPointsForTorus(0.1, 0.02, 0, 0.15, -3.2, 6.0, 0x00ffff, 120, Math.PI / 2);

        // Build Geometry
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('aColor', new THREE.Float32BufferAttribute(colors, 3));
        geometry.setAttribute('aPartId', new THREE.Float32BufferAttribute(partIds, 1));
        geometry.setAttribute('aPhase', new THREE.Float32BufferAttribute(phases, 1));

        // Custom Shader Material
        this.shaderMat = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0.0 },
                uChargeLevel: { value: 0.0 },
                uFired: { value: 0.0 },
                uRecoil: { value: 0.0 },
                uVent: { value: 0.0 }
            },
            vertexShader: `
                uniform float uTime;
                uniform float uChargeLevel;
                uniform float uFired;
                uniform float uRecoil;
                uniform float uVent;

                attribute float aPartId;
                attribute float aPhase;
                attribute vec3 aColor;

                varying float vPartId;
                varying float vPhase;
                varying vec3 vColor;
                varying vec3 vPosition;
                varying float vVentFactor;

                float hash(vec3 p) {
                    p = fract(p * 0.3183099 + 0.1);
                    p *= 17.0;
                    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
                }

                vec3 noise3(vec3 p) {
                    return vec3(
                        hash(p + vec3(1.23, 4.56, 7.89)),
                        hash(p + vec3(9.87, 6.54, 3.21)),
                        hash(p + vec3(5.55, 0.00, 2.22))
                    ) * 2.0 - 1.0;
                }

                void main() {
                    vPartId = aPartId;
                    vPhase = aPhase;
                    vColor = aColor;

                    vec3 pos = position;

                    // Calculate heat venting vapor factor
                    float ventMask = step(0.88, fract(sin(aPhase * 45.12) * 91.3));
                    vVentFactor = ventMask * uVent;

                    // 1. Idle micro-vibrations (quantum hum)
                    float vibe = 0.003 + uChargeLevel * 0.008 + sin(uTime * 25.0) * 0.001;
                    pos += sin(uTime * 35.0 + aPhase) * vibe;

                    // 2. Part-specific animations
                    if (aPartId == 4.0) { // Power Core
                        vec3 center = vec3(0.0, 0.15, 0.4);
                        vec3 rel = pos - center;

                        // Orbital rotation
                        float spinSpeed = 5.0 + uChargeLevel * 15.0;
                        float angle = uTime * spinSpeed + aPhase;
                        float dist = length(rel.xy);
                        rel.x = cos(angle) * dist;
                        rel.y = sin(angle) * dist;

                        // Pulsing radius
                        float pulse = sin(uTime * 12.0 + aPhase) * (0.008 + uChargeLevel * 0.018);
                        pos = center + normalize(rel) * (length(rel) + pulse);
                    }
                    else if (aPartId == 3.0) { // Capacitor Coils
                        vec3 coilCenter = vec3(0.0, 0.15, pos.z);
                        vec3 dir = normalize(pos - coilCenter);
                        // Contract coils on charge, ripple on fire
                        float coilPulse = sin(uTime * 8.0 + aPhase) * (0.006 + uChargeLevel * 0.015);
                        pos += dir * coilPulse;
                    }
                    else if (aPartId == 2.0) { // Rails
                        // Sinusoidal EM energy wave running forward along the rails
                        float waveSpeed = 24.0 + uChargeLevel * 36.0;
                        float waveAmp = 0.005 + uChargeLevel * 0.016;
                        float wave = sin(pos.z * 15.0 - uTime * waveSpeed) * waveAmp;
                        pos.y += wave;
                        pos.x += cos(pos.z * 12.0 + uTime * waveSpeed * 0.5) * waveAmp * 0.3;
                    }
                    else if (aPartId == 5.0) { // Spine
                        pos.y += sin(pos.z * 10.0 + uTime * 20.0) * 0.007;
                    }

                    // Heat Venting displacement
                    if (uVent > 0.0 && ventMask > 0.5 && (aPartId == 2.0 || aPartId == 3.0 || aPartId == 6.0)) {
                        vec3 ventDir = normalize(pos - vec3(0.0, 0.15, pos.z));
                        ventDir.y += 0.5; // rise up
                        ventDir.z -= 0.4; // move forward
                        ventDir = normalize(ventDir);
                        float dist = uVent * 0.14 * (1.0 + fract(aPhase) * 0.6);
                        pos += ventDir * dist;
                    }

                    // 3. Firing Explosion / Scatter Shockwave
                    if (uFired > 0.0) {
                        vec3 explodeDir = vec3(0.0);

                        if (aPartId == 4.0) {
                            explodeDir = normalize(pos - vec3(0.0, 0.15, 0.4));
                        } else if (aPartId == 2.0 || aPartId == 3.0 || aPartId == 5.0 || aPartId == 6.0) {
                            explodeDir = normalize(pos - vec3(0.0, 0.15, pos.z));
                        } else {
                            explodeDir = vec3(0.0, 1.0, 0.0) * sin(aPhase);
                        }

                        float expIntensity = sin(uFired * 3.14159) * 0.18;
                        pos += explodeDir * expIntensity * (1.0 + aPhase * 0.6);

                        // Turbulence
                        vec3 turb = noise3(pos * 4.0 + vec3(uTime)) * 0.04;
                        pos += turb * sin(uFired * 3.14159);
                    }

                    // Recoil displacement along Z
                    pos.z += uRecoil * 0.35;

                    vPosition = pos;

                    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                    gl_Position = projectionMatrix * mvPosition;

                    // Perspective sizing
                    float baseSize = 4.0;
                    if (aPartId == 4.0) baseSize = 8.5;       // Core
                    else if (aPartId == 3.0) baseSize = 6.0;  // Coils
                    else if (aPartId == 2.0) baseSize = 4.8;  // Rails
                    else if (aPartId == 1.0) baseSize = 3.2;  // Stock/Grip

                    float chargeSize = 1.0 + uChargeLevel * 0.5;
                    float fireSize = 1.0 + sin(uFired * 3.14159) * 1.8;
                    if (ventMask > 0.5 && uVent > 0.0 && (aPartId == 2.0 || aPartId == 3.0 || aPartId == 6.0)) {
                        baseSize *= (1.0 + uVent * 1.8);
                    }

                    gl_PointSize = clamp(baseSize * chargeSize * fireSize * (6.0 / -mvPosition.z), 1.0, 24.0);
                }
            `,
            fragmentShader: `
                uniform float uTime;
                uniform float uChargeLevel;
                uniform float uFired;

                varying float vPartId;
                varying float vPhase;
                varying vec3 vColor;
                varying vec3 vPosition;
                varying float vVentFactor;

                void main() {
                    vec2 pt = gl_PointCoord - vec2(0.5);
                    float distSq = dot(pt, pt);
                    if (distSq > 0.25) discard;

                    float glow = 1.0 - (sqrt(distSq) * 2.0);
                    glow = pow(glow, 2.5);

                    vec3 finalColor = vColor;

                    if (vPartId == 4.0) { // Core: Cyan -> Magenta -> Blazing White on fire
                        vec3 coreCyan = vec3(0.0, 0.85, 1.0);
                        vec3 coreMagenta = vec3(1.0, 0.0, 0.75);
                        vec3 fireWhite = vec3(1.0, 1.0, 1.0);

                        finalColor = mix(coreCyan, coreMagenta, uChargeLevel);
                        finalColor = mix(finalColor, fireWhite, sin(uFired * 3.14159));
                    }
                    else if (vPartId == 3.0 || vPartId == 5.0) { // Coils & Spine: Cyan -> Purple -> White
                        vec3 coilCyan = vec3(0.05, 0.9, 1.0);
                        vec3 coilPurple = vec3(0.55, 0.05, 1.0);
                        vec3 fireWhite = vec3(1.0, 1.0, 1.0);

                        finalColor = mix(coilCyan, coilPurple, uChargeLevel * 0.85);
                        finalColor = mix(finalColor, fireWhite, sin(uFired * 3.14159));
                    }
                    else if (vPartId == 2.0) { // Rails: Steel-Blue -> Fire Amber on shot
                        vec3 railBlue = vec3(0.2, 0.45, 0.85);
                        vec3 railAmber = vec3(1.0, 0.4, 0.0);
                        vec3 fireWhite = vec3(1.0, 1.0, 1.0);

                        finalColor = mix(railBlue, railAmber, sin(uFired * 3.14159) * 0.85);
                        finalColor = mix(finalColor, fireWhite, sin(uFired * 3.14159));
                    }
                    else if (vPartId == 6.0) { // Emitter Ring
                        vec3 emitCyan = vec3(0.0, 0.95, 1.0);
                        vec3 fireWhite = vec3(1.0, 1.0, 1.0);
                        finalColor = mix(emitCyan, fireWhite, sin(uFired * 3.14159));
                    }
                    else { // Body/Stock
                        vec3 heatColor = vec3(1.0, 0.25, 0.0);
                        finalColor = mix(finalColor, heatColor, sin(uFired * 3.14159) * 0.35);

                        float drift = sin(uTime * 2.5 + vPhase) * 0.03;
                        finalColor += vec3(drift, drift * 0.3, drift * 1.2);
                    }

                    float emitIntensity = 1.0;
                    if (vPartId == 4.0) {
                        emitIntensity = 2.0 + uChargeLevel * 5.0 + sin(uFired * 3.14159) * 12.0;
                    } else if (vPartId == 3.0 || vPartId == 5.0 || vPartId == 6.0) {
                        emitIntensity = 1.4 + uChargeLevel * 3.0 + sin(uFired * 3.14159) * 9.0;
                    } else if (vPartId == 2.0) {
                        emitIntensity = 0.9 + uChargeLevel * 1.8 + sin(uFired * 3.14159) * 7.0;
                    } else {
                        emitIntensity = 0.5 + sin(uFired * 3.14159) * 1.5;
                    }

                    if (vVentFactor > 0.0) {
                        vec3 steamColor = mix(vec3(1.0, 0.28, 0.0), vec3(0.35, 0.35, 0.35), vVentFactor);
                        finalColor = mix(finalColor, steamColor, vVentFactor);
                        emitIntensity *= (1.0 - vVentFactor * 0.55);
                    }

                    float alpha = glow;
                    if (vVentFactor > 0.0) {
                        alpha *= (1.0 - vVentFactor * 0.9);
                    }

                    gl_FragColor = vec4(finalColor * emitIntensity * glow, alpha);
                }
            `,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });

        this.pointsMesh = new THREE.Points(geometry, this.shaderMat);
        this.add(this.pointsMesh);
    }

    fire() {
        this.gunPitch = 0.4;
        this.gunZ = 0.3;
        this.lightIntensity = 6.0;
        this.discharged = true;
        this.dischargeTimer = 0.4;
        this.coilPulse = 1.0;
        this.firedIntensity = 1.0;
        this.timeSinceLastFire = 0.0;
        this.ventIntensity = 1.0;

        this.playProceduralShot();
    }

    playProceduralShot() {
        if (!window.audioCtx) window.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const ctx = window.audioCtx;
        if (ctx.state === 'suspended') ctx.resume();

        const t = ctx.currentTime;
        const masterVol = (window.SFX && window.SFX.masterVolume !== undefined) ? window.SFX.masterVolume : 0.8;

        // Layer 1: Deep electromagnetic discharge thrum
        const osc1 = ctx.createOscillator();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(50, t);
        osc1.frequency.exponentialRampToValueAtTime(18, t + 0.4);
        const g1 = ctx.createGain();
        g1.gain.setValueAtTime(0.55 * masterVol, t);
        g1.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
        osc1.connect(g1); g1.connect(ctx.destination);
        osc1.start(t); osc1.stop(t + 0.5);

        // Layer 2: Sharp hypersonic crack (projectile breaking sound barrier)
        const osc2 = ctx.createOscillator();
        osc2.type = 'sawtooth';
        osc2.frequency.setValueAtTime(3000, t);
        osc2.frequency.exponentialRampToValueAtTime(80, t + 0.03);
        const g2 = ctx.createGain();
        g2.gain.setValueAtTime(0.4 * masterVol, t);
        g2.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
        osc2.connect(g2); g2.connect(ctx.destination);
        osc2.start(t); osc2.stop(t + 0.06);

        // Layer 3: Electric crackle noise burst
        const bufLen = ctx.sampleRate * 0.15;
        const noiseBuf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
        const data = noiseBuf.getChannelData(0);
        for (let i = 0; i < bufLen; i++) {
            const env = Math.exp(-i / (bufLen * 0.2));
            data[i] = (Math.random() * 2 - 1) * env * (Math.random() > 0.7 ? 1.5 : 0.3);
        }
        const noise = ctx.createBufferSource();
        noise.buffer = noiseBuf;
        const nGain = ctx.createGain();
        nGain.gain.setValueAtTime(0.2 * masterVol, t);
        nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        const nFilter = ctx.createBiquadFilter();
        nFilter.type = 'highpass';
        nFilter.frequency.value = 2000;
        noise.connect(nFilter);
        nFilter.connect(nGain);
        nGain.connect(ctx.destination);
        noise.start(t); noise.stop(t + 0.18);

        // Layer 4: Electrical buzz aftermath (delayed ionization)
        const osc3 = ctx.createOscillator();
        osc3.type = 'square';
        osc3.frequency.setValueAtTime(300, t + 0.06);
        osc3.frequency.setValueAtTime(450, t + 0.1);
        osc3.frequency.exponentialRampToValueAtTime(150, t + 0.3);
        const g3 = ctx.createGain();
        g3.gain.setValueAtTime(0.08 * masterVol, t + 0.06);
        g3.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
        osc3.connect(g3); g3.connect(ctx.destination);
        osc3.start(t + 0.06); osc3.stop(t + 0.4);

        // Layer 5: Long reverb tail (room echo simulation)
        const tail = ctx.createOscillator();
        tail.type = 'sine';
        tail.frequency.setValueAtTime(45, t + 0.1);
        tail.frequency.exponentialRampToValueAtTime(25, t + 0.6);
        const tGain = ctx.createGain();
        tGain.gain.setValueAtTime(0.12 * masterVol, t + 0.1);
        tGain.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
        tail.connect(tGain); tGain.connect(ctx.destination);
        tail.start(t + 0.1); tail.stop(t + 0.75);

        // Layer 6: Pneumatic high-pressure steam vent hiss (dynamic noise buffer)
        const hissBufLen = ctx.sampleRate * 0.8;
        const hissBuf = ctx.createBuffer(1, hissBufLen, ctx.sampleRate);
        const hissData = hissBuf.getChannelData(0);
        for (let i = 0; i < hissBufLen; i++) {
            hissData[i] = (Math.random() * 2 - 1) * 0.25;
        }
        const hissSource = ctx.createBufferSource();
        hissSource.buffer = hissBuf;
        
        const hFilter = ctx.createBiquadFilter();
        hFilter.type = 'bandpass';
        hFilter.frequency.setValueAtTime(4000, t + 0.05);
        hFilter.frequency.exponentialRampToValueAtTime(900, t + 0.68);
        hFilter.Q.value = 3.5;
        
        const hGain = ctx.createGain();
        hGain.gain.setValueAtTime(0.001, t);
        hGain.gain.linearRampToValueAtTime(0.16 * masterVol, t + 0.06);
        hGain.gain.exponentialRampToValueAtTime(0.001, t + 0.75);
        
        hissSource.connect(hFilter);
        hFilter.connect(hGain);
        hGain.connect(ctx.destination);
        hissSource.start(t);
        hissSource.stop(t + 0.8);
    }

    update(dt) {
        this.elapsedTime += dt;
        this.timeSinceLastFire += dt;

        if (this.ventIntensity === undefined) this.ventIntensity = 0.0;
        this.ventIntensity = Math.max(0.0, this.ventIntensity - dt * 0.85);

        // Pitch & Recoil position animation decay
        this.gunPitch += (0 - this.gunPitch) * 10 * dt;
        this.gunZ += (0 - this.gunZ) * 10 * dt;
        this.lightIntensity = Math.max(0, this.lightIntensity - 20 * dt);
        this.muzzleLight.intensity = this.lightIntensity;

        if (this.discharged) {
            this.dischargeTimer -= dt;
            if (this.dischargeTimer <= 0) this.discharged = false;
        }

        // Fired shockwave intensity decay
        this.firedIntensity = Math.max(0, this.firedIntensity - dt * 2.2);

        // Continuous firing capacitor charge accumulation
        if (this.timeSinceLastFire < 0.8) {
            this.chargeLevel = Math.min(1.0, this.chargeLevel + dt * 2.2);
        } else {
            this.chargeLevel = Math.max(0.0, this.chargeLevel - dt * 1.5);
        }

        // Update shader uniforms
        if (this.shaderMat) {
            this.shaderMat.uniforms.uTime.value = this.elapsedTime;
            this.shaderMat.uniforms.uChargeLevel.value = this.chargeLevel;
            this.shaderMat.uniforms.uFired.value = this.firedIntensity;
            this.shaderMat.uniforms.uRecoil.value = this.gunZ;
            this.shaderMat.uniforms.uVent.value = this.ventIntensity;
        }

        // Core light pulse synchronization
        if (this.coreLight) {
            this.coreLight.intensity = 0.6 + Math.sin(this.elapsedTime * 3) * 0.3 + this.chargeLevel * 2.0 + this.firedIntensity * 4.0;
        }
    }
}

window.Railgun = Railgun;
