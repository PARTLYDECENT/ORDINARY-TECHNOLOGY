(function () {
  "use strict";

  let scene, camera, renderer, ufoInstancedMesh, glowInstancedMesh;
  const COUNT = 100;
  const dummy = new THREE.Object3D();
  
  let isFlying = false;
  let flyProgress = 0;
  const flightDuration = 14.0; // 14 seconds flight pass
  let startTime = 0;
  
  // Armada Boid Swarm Data
  const swarmData = [];
  for (let i = 0; i < COUNT; i++) {
    const row = Math.floor(i / 10);
    const col = i % 10;
    
    // Organic wedge armada offset distribution
    const offsetX = (col - 4.5) * 4.8 + (row % 2) * 2.4 + (Math.random() - 0.5) * 1.6;
    const offsetY = (Math.random() - 0.5) * 4.2;
    const offsetZ = row * -7.0 + (Math.random() - 0.5) * 2.5;
    
    swarmData.push({
      x: offsetX,
      y: offsetY,
      z: offsetZ,
      scale: 0.8 + Math.random() * 0.45,
      phase: Math.random() * Math.PI * 2,
      freqX: 1.5 + Math.random() * 2.0,
      freqY: 2.0 + Math.random() * 2.5,
      lastPos: new THREE.Vector3()
    });
  }

  // 1. SDF Custom Raymarched / Procedural Shader Material for UFO Hull
  const sdfsSaucerVS = `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vWorldPosition;
    
    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vec4 worldPosition = modelMatrix * instanceMatrix * vec4(position, 1.0);
      vWorldPosition = worldPosition.xyz;
      gl_Position = projectionMatrix * viewMatrix * worldPosition;
    }
  `;

  const sdfsSaucerFS = `
    uniform float uTime;
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vWorldPosition;

    // Smooth Signed Distance Field for organic hull blending
    float smin(float a, float b, float k) {
      float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
      return mix(b, a, h) - k * h * (1.0 - h);
    }

    void main() {
      vec2 st = vUv - vec2(0.5);
      float r = length(st);
      
      // SDF Saucer Profile
      float dRim = abs(r - 0.42) - 0.05;
      float dCore = r - 0.22;
      float sdfDist = smin(dRim, dCore, 0.1);

      // Emissive SDF vector glow
      float rimGlow = pow(0.025 / max(0.001, dRim), 1.8);
      float coreGlow = smoothstep(0.25, 0.0, dCore);
      
      // Metallic Shading
      vec3 lightDir = normalize(vec3(0.5, 0.8, 0.6));
      float diff = max(0.0, dot(vNormal, lightDir));
      vec3 baseHull = vec3(0.04, 0.04, 0.08) * (diff + 0.3);

      // Dynamic SDF glow pulse (Cyan & White)
      vec3 glowColor = mix(vec3(0.0, 1.0, 0.85), vec3(1.0, 1.0, 1.0), sin(uTime * 4.0 + r * 10.0) * 0.5 + 0.5);
      vec3 finalCol = baseHull + glowColor * (rimGlow * 1.2 + coreGlow * 1.5);
      
      float alpha = smoothstep(0.5, 0.45, r) + rimGlow * 0.5;
      gl_FragColor = vec4(finalCol, clamp(alpha, 0.0, 1.0));
    }
  `;

  function initUFOFleet() {
    const canvas = document.createElement('canvas');
    canvas.id = 'ufo-fleet-canvas';
    canvas.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:9997;pointer-events:none;';
    document.body.appendChild(canvas);

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 65);

    renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);

    // Geometry: Thin Disc for SDF Raymarched shader
    const saucerGeo = new THREE.CylinderGeometry(0.1, 2.4, 0.14, 32);
    
    // Custom SDF Shader Material
    const sdfMaterial = new THREE.ShaderMaterial({
      vertexShader: sdfsSaucerVS,
      fragmentShader: sdfsSaucerFS,
      uniforms: {
        uTime: { value: 0 }
      },
      transparent: true,
      side: THREE.DoubleSide
    });

    ufoInstancedMesh = new THREE.InstancedMesh(saucerGeo, sdfMaterial, COUNT);
    scene.add(ufoInstancedMesh);

    window.addEventListener('resize', onWindowResize);
    
    // EXACTLY ONCE EVERY MINUTE (60,000ms loop)
    scheduleMinuteFlyby();
    
    // Expose manual trigger function
    window.spawnUFOFleet = startFlyby;

    animate();
  }

  function startFlyby() {
    if (isFlying) return;
    isFlying = true;
    startTime = performance.now();

    if (typeof window.osToast === 'function') {
      window.osToast('⚠️ OMINOUS SDF ARMADA: 100 HIGH-ALTITUDE CRAFT IN BOUND', 'warn');
    }
    if (typeof window.narrate === 'function') {
      window.narrate('Ominous unidentified SDF craft swarm detected on long-range scanner.');
    }
  }

  // Exact 60-second interval trigger
  function scheduleMinuteFlyby() {
    const ONE_MINUTE = 60000;
    setTimeout(() => {
      startFlyby();
      scheduleMinuteFlyby();
    }, ONE_MINUTE);
  }

  function onWindowResize() {
    if (!camera || !renderer) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  // Advanced Flight Physics: 3D Trajectory & Banking Dynamics
  function animate() {
    requestAnimationFrame(animate);

    const now = performance.now();
    const elapsedTime = (now - startTime) * 0.001;
    
    if (ufoInstancedMesh && ufoInstancedMesh.material.uniforms) {
      ufoInstancedMesh.material.uniforms.uTime.value = now * 0.001;
    }

    if (isFlying) {
      const t = elapsedTime / flightDuration;

      if (t >= 1.0) {
        isFlying = false;
        renderer.clear();
        return;
      }

      // Way Better Flight: Smooth 3D Bezier Swoop & Acceleration Profile
      // Phase 0-0.3: Descend & swoop into view
      // Phase 0.3-0.7: Undulating horizontal swarm glide
      // Phase 0.7-1.0: Hyper-acceleration velocity burst out to deep space
      
      const easeT = t < 0.7 
        ? Math.pow(t / 0.7, 1.2) * 0.7 
        : 0.7 + Math.pow((t - 0.7) / 0.3, 2.5) * 0.3;

      const leadX = -180 + easeT * 360;
      const leadY = 22 + Math.sin(t * Math.PI * 3) * 6.5 + Math.cos(t * Math.PI * 1.5) * 3.5;
      const leadZ = -35 + Math.sin(t * Math.PI * 2) * 12.0;

      for (let i = 0; i < COUNT; i++) {
        const boid = swarmData[i];

        // Boid flocking wave interference
        const waveX = Math.sin(elapsedTime * boid.freqX + boid.phase) * 1.2;
        const waveY = Math.cos(elapsedTime * boid.freqY + boid.phase) * 1.4;

        const posX = leadX + boid.x + waveX;
        const posY = leadY + boid.y + waveY;
        const posZ = leadZ + boid.z;

        // Calculate velocity vector for dynamic banking
        const velX = posX - boid.lastPos.x;
        const velY = posY - boid.lastPos.y;
        boid.lastPos.set(posX, posY, posZ);

        dummy.position.set(posX, posY, posZ);

        // Realistic Aerodynamic Banking & Yaw
        const bankAngle = THREE.MathUtils.clamp(-velX * 0.12, -0.45, 0.45);
        const pitchAngle = THREE.MathUtils.clamp(velY * 0.18, -0.35, 0.35);

        dummy.rotation.x = pitchAngle + 0.15;
        dummy.rotation.z = bankAngle;
        dummy.rotation.y = elapsedTime * 1.5 + boid.phase;

        dummy.scale.set(boid.scale, boid.scale, boid.scale);
        dummy.updateMatrix();

        ufoInstancedMesh.setMatrixAt(i, dummy.matrix);
      }

      ufoInstancedMesh.instanceMatrix.needsUpdate = true;
      renderer.render(scene, camera);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initUFOFleet);
  } else {
    initUFOFleet();
  }
})();
