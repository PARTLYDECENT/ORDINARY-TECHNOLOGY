
/**
 * SDFManipulatorArm — Advanced Biomorphic Neural Point-Cloud Appendage
 * Formed from 1500 dynamic Dodecahedrons using instanced CPU raymarching SDF.
 * Features: High-fidelity biomorphic synaptic glow colors, precise physical gripping
 * kinematics, dynamic weapon scaling, pulsing bio-luminescence, organic static noise,
 * and high-fidelity Inverse Kinematics (IK) finger tip binding to invisible gun anchors.
 */
class SDFManipulatorArm extends THREE.Group {
    constructor() {
        super();
        
        // 1. Setup InstancedMesh with Dodecahedrons
        this.INSTANCE_COUNT = 1500;
        const geometry = new THREE.DodecahedronGeometry(0.011, 0); // slightly larger dodecahedron nodes
        
        // Premium brushed-chrome PBR material with emissive capability
        const material = new THREE.MeshStandardMaterial({
            color: 0xc8d0dc,
            roughness: 0.18,
            metalness: 0.95,
            emissive: 0x112233,
            emissiveIntensity: 0.3,
            transparent: false,
            wireframe: false
        });
 
        this.instancedMesh = new THREE.InstancedMesh(geometry, material, this.INSTANCE_COUNT);
        this.instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        this.add(this.instancedMesh);
 
        // 2. Pre-calculate targets for Forearm, Wrist, 3 Fingers
        this.particles = [];
        this.dummy = new THREE.Object3D();
        this.colorObj = new THREE.Color();
        
        // Smooth position buffers for each particle (prevents jitter/whipping)
        this.smoothPositions = [];
        
        const armCount = 700;
        const wristCount = 200;
        const fingerCount = 200; // per finger
        
        const randCyl = (radius, length) => {
            const theta = Math.random() * Math.PI * 2;
            const r = Math.sqrt(Math.random()) * radius;
            const y = (Math.random() - 0.5) * length;
            return new THREE.Vector3(r * Math.cos(theta), y, r * Math.sin(theta));
        };
        
        const randSphere = (radius) => {
            const u = Math.random();
            const v = Math.random();
            const theta = u * 2.0 * Math.PI;
            const phi = Math.acos(2.0 * v - 1.0);
            const r = Math.cbrt(Math.random()) * radius;
            const sinPhi = Math.sin(phi);
            return new THREE.Vector3(r * sinPhi * Math.cos(theta), r * sinPhi * Math.sin(theta), r * Math.cos(phi));
        };
 
        for (let i = 0; i < this.INSTANCE_COUNT; i++) {
            let basePos = new THREE.Vector3();
            let partId = 0; // 0=arm, 1=wrist, 2=thumb, 3=index, 4=middle
 
            if (i < armCount) {
                // Forearm
                basePos = randCyl(0.04, 0.6);
                basePos.y -= 0.15; // Shift back
                partId = 0;
            } else if (i < armCount + wristCount) {
                // Wrist core
                basePos = randSphere(0.045);
                basePos.y += 0.18; // Shift to end of forearm
                partId = 1;
            } else {
                // Fingers
                const fingerIdx = Math.floor((i - armCount - wristCount) / fingerCount);
                basePos = randCyl(0.010, 0.22); // slender finger segments
                basePos.y += 0.08;
                partId = 2 + fingerIdx;
            }
 
            this.particles.push({
                basePos: basePos,
                partId: partId,
                offset: Math.random() * Math.PI * 2,
                speed: 0.6 + Math.random() * 1.4,
                scaleOffset: Math.random()
            });
            
            // Initialize smooth position buffer to base position
            this.smoothPositions.push(new THREE.Vector3().copy(basePos));
        }
        
        // Cache for reusable vectors to avoid GC pressure
        this._cachedThumbTarget = new THREE.Vector3();
        this._cachedIndexTarget = new THREE.Vector3();
        this._cachedMiddleTarget = new THREE.Vector3();
        this._hasValidAnchors = false;
    }
 
    // Kinematics and SDF evaluation in JS
    update(uTime, delta, isFiring, isADS) {
        // Animation variables
        const pulse = Math.sin(uTime * 3.5) * 0.06 + 0.94;
        const gripTightness = isFiring ? 1.0 : (isADS ? 0.75 : 0.2);
        
        // Track grip changes for articulation glow
        if (this._prevGrip === undefined) this._prevGrip = gripTightness;
        const gripDelta = Math.abs(gripTightness - this._prevGrip);
        this._gripGlow = (this._gripGlow || 0) + gripDelta * 3.0;
        this._gripGlow *= Math.pow(0.02, delta); // Decay
        this._prevGrip = gripTightness;

        // Track sustained fire for heat shimmer
        if (this._fireHeat === undefined) this._fireHeat = 0;
        if (isFiring) {
            this._fireHeat = Math.min(1.0, this._fireHeat + delta * 2.5);
        } else {
            this._fireHeat *= Math.pow(0.1, delta);
        }
        
        // TIGHT PHYSICAL GRIPPING COORDINATES (Fallback kinematic base)
        const thumbRot = new THREE.Euler(0.1, 0, -0.7 - gripTightness * 0.4);
        const thumbPos = new THREE.Vector3(0.04, 0.22, 0.02);
        
        const indexRot = new THREE.Euler(0.65 + gripTightness * 0.55, 0.08, 0.06);
        const indexPos = new THREE.Vector3(-0.035, 0.24, 0.03);
        
        const middleRot = new THREE.Euler(0.75 + gripTightness * 0.65, -0.08, -0.06);
        const middlePos = new THREE.Vector3(-0.035, 0.24, -0.03);
        
        // EVALUATE INVISIBLE IK ANCHORS ON DYNAMIC ACTIVE WEAPON
        // Use cached targets to prevent whipping — only update when valid
        this._hasValidAnchors = false;
 
        if (window.activeWeaponMesh && window.activeWeaponMesh.gripAnchors) {
            try {
                // Get world positions of gun grip anchors
                window.activeWeaponMesh.gripAnchors.thumb.getWorldPosition(this._cachedThumbTarget);
                window.activeWeaponMesh.gripAnchors.index.getWorldPosition(this._cachedIndexTarget);
                window.activeWeaponMesh.gripAnchors.middle.getWorldPosition(this._cachedMiddleTarget);

                // Convert world coordinates back into local space of the manipulator arm
                this.worldToLocal(this._cachedThumbTarget);
                this.worldToLocal(this._cachedIndexTarget);
                this.worldToLocal(this._cachedMiddleTarget);
                
                this._hasValidAnchors = true;
            } catch (e) {
                this._hasValidAnchors = false;
            }
        }

        // Smooth interpolation speed — tighter grip = faster tracking
        const smoothLerp = Math.min(1.0, delta * (12.0 + gripTightness * 18.0));

        for (let i = 0; i < this.INSTANCE_COUNT; i++) {
            const p = this.particles[i];
            let targetPos = new THREE.Vector3().copy(p.basePos);
            
            // Apply SDF transforms
            if (p.partId === 0) {
                // Forearm
                targetPos.x *= pulse;
                targetPos.z *= pulse;
            } else if (p.partId === 1) {
                // Wrist
            } else if (p.partId >= 2) {
                // Parabolic curl for high-fidelity wrapping
                const curlAmount = Math.max(0, p.basePos.y - 0.04); 
                const bend = curlAmount * curlAmount * 6.5; 
                
                if (p.partId === 2) {
                    // Thumb
                    targetPos.z += bend * (0.6 + gripTightness * 0.8);
                    targetPos.applyEuler(thumbRot);
                    targetPos.add(thumbPos);
                    
                    // Bind thumb tip organically to active gun's invisible thumb anchor
                    if (this._hasValidAnchors) {
                        const tipWeight = THREE.MathUtils.smoothstep(p.basePos.y, 0.04, 0.22);
                        targetPos.lerp(this._cachedThumbTarget, tipWeight * 0.85);
                    }
                } else if (p.partId === 3) {
                    // Index
                    targetPos.z -= bend * (1.1 + gripTightness * 1.6);
                    targetPos.applyEuler(indexRot);
                    targetPos.add(indexPos);
                    
                    // Bind index tip organically to active gun's invisible index anchor (trigger guard)
                    if (this._hasValidAnchors) {
                        const tipWeight = THREE.MathUtils.smoothstep(p.basePos.y, 0.04, 0.22);
                        targetPos.lerp(this._cachedIndexTarget, tipWeight * 0.85);
                    }
                } else if (p.partId === 4) {
                    // Middle
                    targetPos.z -= bend * (1.1 + gripTightness * 1.6);
                    targetPos.applyEuler(middleRot);
                    targetPos.add(middlePos);
                    
                    // Bind middle tip organically to active gun's invisible middle anchor
                    if (this._hasValidAnchors) {
                        const tipWeight = THREE.MathUtils.smoothstep(p.basePos.y, 0.04, 0.22);
                        targetPos.lerp(this._cachedMiddleTarget, tipWeight * 0.85);
                    }
                }
            }
 
            // Subtle organic micro-noise (very small, no flicker)
            const wobble = Math.sin(uTime * p.speed + p.offset);
            targetPos.x += wobble * 0.0008;
            targetPos.y += Math.cos(uTime * p.speed * 1.1 + p.offset) * 0.0008;
            targetPos.z += Math.sin(uTime * p.speed * 0.9 + p.offset) * 0.0008;

            // Smooth position interpolation — prevents whipping/lag jitter!
            this.smoothPositions[i].lerp(targetPos, smoothLerp);
            this.dummy.position.copy(this.smoothPositions[i]);
            
            // Slow gentle spin for individual nodes (no erratic rotation)
            this.dummy.rotation.x = uTime * 0.4 + p.offset;
            this.dummy.rotation.y = uTime * 0.35 + p.offset * 0.7;
            
            // Smooth breathing scale — NO random static pops
            let scale = 0.65 + Math.sin(uTime * 2.5 + p.scaleOffset * Math.PI * 2) * 0.08;

            // --- HEAT SHIMMER: fingers expand/distort during sustained fire ---
            if (p.partId >= 2 && this._fireHeat > 0.05) {
                scale += this._fireHeat * 0.15 * (0.7 + Math.sin(uTime * 12.0 + p.offset * 3.0) * 0.3);
                // Add micro-displacement from heat
                this.dummy.position.x += Math.sin(uTime * 20.0 + p.offset) * this._fireHeat * 0.002;
                this.dummy.position.z += Math.cos(uTime * 18.0 + p.offset) * this._fireHeat * 0.002;
            }

            this.dummy.scale.set(scale, scale, scale);
 
            this.dummy.updateMatrix();
            this.instancedMesh.setMatrixAt(i, this.dummy.matrix);
 
            // PREMIUM BIOMORPHIC COLOR GRADIENTS
            if (p.partId === 0) {
                // Forearm: Brushed titanium with subtle blue undertone
                const fRatio = 0.5 + Math.sin(uTime * 2.0 + p.offset * 0.2) * 0.5;

                // --- ENERGY VEIN TRACES: central spine particles glow brighter ---
                const distFromCenter = Math.sqrt(p.basePos.x * p.basePos.x + p.basePos.z * p.basePos.z);
                const isVein = distFromCenter < 0.012; // Inner core particles form the nerve line
                if (isVein) {
                    // Bright energy vein — pulsing cyan/white nerve pathway
                    const veinPulse = 0.5 + Math.sin(uTime * 6.0 + p.basePos.y * 15.0) * 0.5;
                    this.colorObj.setHSL(0.52, 0.9, 0.55 + veinPulse * 0.3);
                } else {
                    this.colorObj.setHSL(0.58 + fRatio * 0.04, 0.35, 0.28 + fRatio * 0.08);
                }
            } else if (p.partId === 1) {
                // Wrist: Synaptic joint core (glowing cyber cyan)
                const wRatio = 0.8 + Math.sin(uTime * 5.0) * 0.2;
                // --- JOINT ARTICULATION GLOW: brighten during grip changes ---
                const articulationBoost = Math.min(1.0, this._gripGlow * 2.0);
                this.colorObj.setHSL(
                    0.52 - articulationBoost * 0.08,
                    0.85 + articulationBoost * 0.15,
                    0.40 + wRatio * 0.15 + articulationBoost * 0.25
                );
            } else {
                // Fingers: Bio-luminescent nervous paths
                if (isFiring) {
                    // Hot orange/red neural spike on firing!
                    const firePhase = 0.5 + Math.sin(uTime * 12.0 + p.offset) * 0.5;
                    // --- HEAT SHIMMER: shift from orange to white-hot with sustained fire ---
                    const heatHue = 0.02 + firePhase * 0.04 + this._fireHeat * 0.06;
                    const heatLightness = 0.50 + firePhase * 0.15 + this._fireHeat * 0.2;
                    this.colorObj.setHSL(heatHue, 0.95 - this._fireHeat * 0.3, Math.min(0.9, heatLightness));
                } else {
                    // Bio-cyan to toxic green pulsing gradient at rest
                    const gRatio = 0.5 + Math.sin(uTime * 4.0 + p.basePos.y * 10) * 0.5;
                    this.colorObj.setHSL(0.48 + gRatio * 0.12, 0.80, 0.35 + gRatio * 0.12);
                }
            }
            this.instancedMesh.setColorAt(i, this.colorObj);
        }
 
        this.instancedMesh.instanceMatrix.needsUpdate = true;
        if (this.instancedMesh.instanceColor) {
            this.instancedMesh.instanceColor.needsUpdate = true;
        }
    }
}
 
window.SDFManipulatorArm = SDFManipulatorArm;
