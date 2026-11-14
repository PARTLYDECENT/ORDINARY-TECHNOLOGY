/* =====================================================================
   ORDINARY TECHNOLOGY // SENTIENT SDF ARMADA v2 (Three.js r128, global THREE)
   - 3 castes: 2 Motherships, 34 Drones, 64 Scouts (100 craft total)
   - PBR hulls (MeshPhysicalMaterial + clearcoat + procedural PMREM env)
     with emissive panel seams, portholes and underside reactor core
   - Glass domes with a living "eye" that tracks the cursor and blinks
   - Chasing rim-light rings, additive halos, tractor beams
   - AI: boids flocking + per-ship personality (curiosity / boldness),
     state machine: flock → curious (orbit cursor) → beam (abduct cursor)
     → evade / aggro (click reactions) → warp exit
   - Light-signal "chatter" that propagates ship-to-ship as waves
   - Lazy GPU init on first flyby, canvas hidden + loop stopped when idle
   Public API kept: window.spawnUFOFleet() + automatic flyby every 60s.
   ===================================================================== */
(function () {
  'use strict';
  if (typeof THREE === 'undefined') return;

  const COUNT = 100;
  const MOTHERSHIPS = 2;
  const DRONES = 34;
  const FLIGHT_EXIT = 21;
  const FLIGHT_MAX = 28;

  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  let scene, camera, renderer, canvas, initialized = false;
  let hullMesh, domeMesh, ringMesh, haloMesh, beamMesh;
  let moodArr, energyArr, blinkArr, beamArr, phaseArr;
  let moodAttr, energyAttr, blinkAttr, beamAttr;

  const uniforms = {
    uTime: { value: 0 },
    uLook: { value: new THREE.Vector3(0, 0, 60) }
  };

  const dummy = new THREE.Object3D();
  dummy.rotation.order = 'ZXY';
  const tmp = new THREE.Vector3();
  const steer = new THREE.Vector3();
  const desired = new THREE.Vector3();
  const sep = new THREE.Vector3();
  const ali = new THREE.Vector3();
  const coh = new THREE.Vector3();
  const goal = new THREE.Vector3();
  const WHITE = new THREE.Color(1, 1, 1);
  const outColor = new THREE.Color();

  const MOODS = {
    calm: new THREE.Color(0x00ffd5),
    curious: new THREE.Color(0xffb347),
    alarm: new THREE.Color(0xff2a4a),
    beam: new THREE.Color(0x9dff7a),
    aggro: new THREE.Color(0xff4fd8)
  };

  const CASTES = {
    mother: { scale: 3.0, maxSpeed: 7, maxForce: 6, tint: 0x9c8452, curiosity: [0.5, 0.8], boldness: [0.7, 1.0] },
    drone: { scale: 1.25, maxSpeed: 13, maxForce: 14, tint: 0xb98466, curiosity: [0.2, 0.9], boldness: [0.2, 0.9] },
    scout: { scale: 0.72, maxSpeed: 19, maxForce: 22, tint: 0xdfe8ff, curiosity: [0.3, 1.0], boldness: [0.0, 0.6] }
  };

  // Flight state
  let isFlying = false;
  let flightT = 0;
  let lastFrame = 0;
  let rafId = 0;
  let entrySide = 1;
  let waypoints = [];
  let wpIndex = 0;
  let beamToastShown = false;
  const ext = { halfW: 50, halfH: 30 };

  // Input state
  const mouse = { ndcX: 0, ndcY: 0, world: new THREE.Vector3(), lastMove: -1e9, inside: false };
  let scrollVel = 0;
  let lastScrollY = window.scrollY;
  let lastScrollT = performance.now();

  /* ------------------------------------------------------------------
     Ship roster
     ------------------------------------------------------------------ */
  const ships = [];
  for (let i = 0; i < COUNT; i++) {
    const caste = i < MOTHERSHIPS ? 'mother' : i < MOTHERSHIPS + DRONES ? 'drone' : 'scout';
    const c = CASTES[caste];
    ships.push({
      caste,
      scale: c.scale * rand(0.88, 1.12),
      maxSpeed: c.maxSpeed * rand(0.85, 1.15),
      maxForce: c.maxForce,
      curiosity: 0, boldness: 0,
      pos: new THREE.Vector3(), vel: new THREE.Vector3(),
      formation: new THREE.Vector3(), exitDir: new THREE.Vector3(),
      clickPoint: new THREE.Vector3(),
      mood: MOODS.calm.clone(), targetMood: MOODS.calm,
      state: 'flock', stateT: 0, delay: 0, exitDelay: 0,
      activated: false, gone: false, appear: 0,
      energy: 0.3, flash: 0, signal: 0, beam: 0, beamTarget: 0, beamLen: 0,
      blinkT: rand(1, 6), blinkPhase: 0,
      orbitA: rand(0, Math.PI * 2), orbitDir: 1, orbitR: 6, curiousFor: 6,
      wanderTheta: rand(0, Math.PI * 2),
      bank: 0, pitch: 0.2, spin: rand(0, Math.PI * 2),
      spinBase: caste === 'mother' ? 0.25 : rand(0.6, 1.6), spinDir: Math.random() < 0.5 ? -1 : 1,
      phase: rand(0, Math.PI * 2), wobF: rand(1.2, 2.6)
    });
  }

  /* ------------------------------------------------------------------
     Shaders
     ------------------------------------------------------------------ */
  const domeVS = `
    attribute vec3 aMood;
    attribute float aBlink;
    attribute float aEnergy;
    attribute float aPhase;
    uniform vec3 uLook;
    varying vec3 vN;
    varying vec3 vView;
    varying vec3 vMood;
    varying vec3 vEyeDir;
    varying float vBlink;
    varying float vEnergy;
    varying float vPhase;
    void main() {
      mat4 m = modelMatrix * instanceMatrix;
      vec4 wp = m * vec4(position, 1.0);
      vec3 center = (m * vec4(0.0, 0.42, 0.0, 1.0)).xyz;
      vN = normalize(mat3(m) * normal);
      vView = normalize(cameraPosition - wp.xyz);
      vEyeDir = normalize(uLook - center);
      vMood = aMood; vBlink = aBlink; vEnergy = aEnergy; vPhase = aPhase;
      gl_Position = projectionMatrix * viewMatrix * wp;
    }
  `;
  const domeFS = `
    uniform float uTime;
    varying vec3 vN;
    varying vec3 vView;
    varying vec3 vMood;
    varying vec3 vEyeDir;
    varying float vBlink;
    varying float vEnergy;
    varying float vPhase;
    void main() {
      vec3 n = normalize(vN);
      float fres = pow(1.0 - max(dot(n, normalize(vView)), 0.0), 2.4);
      float look = dot(n, vEyeDir);
      float open = 1.0 - vBlink;
      float iris = smoothstep(0.80, 0.93, look) * open;
      float pupil = smoothstep(0.955, 0.985, look) * open;
      float ringIris = smoothstep(0.90, 0.93, look) * (1.0 - smoothstep(0.93, 0.95, look)) * open;
      float swirl = sin(dot(n, vec3(11.0, 7.0, 9.0)) + uTime * 2.6 + vPhase) * 0.5 + 0.5;
      vec3 glass = vec3(0.015, 0.03, 0.06) + fres * mix(vec3(0.55, 0.85, 1.0), vMood, 0.55);
      vec3 col = glass + vMood * swirl * 0.12 * (0.6 + vEnergy);
      col += vMood * iris * (0.9 + vEnergy * 1.2) + vec3(1.0) * ringIris * 0.6;
      col = mix(col, vec3(0.0), pupil * 0.9);
      col += vec3(1.0) * pow(max(dot(reflect(-normalize(vView), n), normalize(vec3(0.4, 0.9, 0.5))), 0.0), 40.0) * 0.9;
      float alpha = clamp(0.5 + fres * 0.45 + iris * 0.45, 0.0, 1.0);
      gl_FragColor = vec4(col, alpha);
    }
  `;

  const ringVS = `
    attribute vec3 aMood;
    attribute float aEnergy;
    attribute float aPhase;
    varying vec3 vMood;
    varying float vEnergy;
    varying float vPhase;
    varying float vAng;
    void main() {
      vMood = aMood; vEnergy = aEnergy; vPhase = aPhase;
      vAng = atan(position.z, position.x);
      gl_Position = projectionMatrix * viewMatrix * modelMatrix * instanceMatrix * vec4(position, 1.0);
    }
  `;
  const ringFS = `
    uniform float uTime;
    varying vec3 vMood;
    varying float vEnergy;
    varying float vPhase;
    varying float vAng;
    void main() {
      float a = vAng / 6.28318 * 16.0 - uTime * (1.5 + vEnergy * 4.0) + vPhase;
      float dash = smoothstep(0.35, 0.5, fract(a)) * (1.0 - smoothstep(0.5, 0.85, fract(a)));
      vec3 col = vMood * (0.35 + dash * (1.4 + vEnergy * 1.6));
      gl_FragColor = vec4(col, clamp(max(col.r, max(col.g, col.b)), 0.0, 1.0));
    }
  `;

  const haloVS = `
    attribute vec3 aMood;
    attribute float aEnergy;
    attribute float aBeam;
    varying vec2 vUv;
    varying vec3 vMood;
    varying float vI;
    void main() {
      vUv = uv; vMood = aMood; vI = 0.18 + aEnergy * 0.32 + aBeam * 0.35;
      gl_Position = projectionMatrix * viewMatrix * modelMatrix * instanceMatrix * vec4(position, 1.0);
    }
  `;
  const haloFS = `
    varying vec2 vUv;
    varying vec3 vMood;
    varying float vI;
    void main() {
      float d = length(vUv - 0.5) * 2.0;
      float g = pow(max(1.0 - d, 0.0), 2.6);
      vec3 c = vMood * g * vI;
      gl_FragColor = vec4(c, clamp(max(c.r, max(c.g, c.b)), 0.0, 1.0));
    }
  `;

  const beamVS = `
    attribute vec3 aMood;
    attribute float aBeam;
    varying vec3 vMood;
    varying float vBeam;
    varying float vT;
    varying float vEdge;
    void main() {
      vMood = aMood; vBeam = aBeam; vT = -position.y;
      vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.0);
      vec3 wn = normalize(mat3(modelMatrix * instanceMatrix) * normal);
      vEdge = 1.0 - abs(dot(wn, normalize(cameraPosition - wp.xyz)));
      gl_Position = projectionMatrix * viewMatrix * wp;
    }
  `;
  const beamFS = `
    uniform float uTime;
    varying vec3 vMood;
    varying float vBeam;
    varying float vT;
    varying float vEdge;
    void main() {
      float rise = fract(vT * 9.0 + uTime * 1.8);
      float stripes = smoothstep(0.0, 0.15, rise) * (1.0 - smoothstep(0.15, 0.5, rise));
      float fade = pow(1.0 - clamp(vT, 0.0, 1.0), 0.7);
      float a = vBeam * fade * (0.18 + stripes * 0.5 + pow(vEdge, 2.0) * 0.6);
      vec3 c = mix(vMood, vec3(1.0), 0.35) * a;
      gl_FragColor = vec4(c, clamp(max(c.r, max(c.g, c.b)), 0.0, 1.0));
    }
  `;

  /* ------------------------------------------------------------------
     Init (lazy — only when the first flyby is requested)
     ------------------------------------------------------------------ */
  function buildEnvironment() {
    const envScene = new THREE.Scene();
    const envMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `
        varying vec3 vDir;
        void main(){
          vec3 d = normalize(vDir);
          vec3 top = vec3(1.0, 0.92, 0.82);
          vec3 hor = vec3(1.0, 0.42, 0.18);
          vec3 bot = vec3(0.02, 0.05, 0.12);
          vec3 col = d.y > 0.0 ? mix(hor, top, pow(d.y, 0.6)) : mix(hor * 0.6, bot, pow(-d.y, 0.5));
          float strips = smoothstep(0.985, 1.0, abs(sin(d.x * 4.0 + d.z * 2.0))) * step(0.15, d.y);
          col += vec3(2.2) * strips;
          col += vec3(0.0, 1.0, 0.85) * 0.9 * smoothstep(0.92, 1.0, dot(d, normalize(vec3(-0.8, 0.1, -0.5))));
          gl_FragColor = vec4(col, 1.0);
        }`
    });
    envScene.add(new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), envMat));
    const pmrem = new THREE.PMREMGenerator(renderer);
    const rt = pmrem.fromScene(envScene, 0.02, 0.1, 50);
    pmrem.dispose();
    envMat.dispose();
    return rt.texture;
  }

  function makeInstAttr(arr, size) {
    const a = new THREE.InstancedBufferAttribute(arr, size);
    a.setUsage(THREE.DynamicDrawUsage);
    return a;
  }

  function attachShared(geo, withBeam) {
    geo.setAttribute('aMood', moodAttr);
    geo.setAttribute('aEnergy', energyAttr);
    geo.setAttribute('aBlink', blinkAttr);
    geo.setAttribute('aPhase', new THREE.InstancedBufferAttribute(phaseArr, 1));
    if (withBeam) geo.setAttribute('aBeam', beamAttr);
  }

  function init() {
    if (initialized) return true;
    try {
      canvas = document.createElement('canvas');
      canvas.id = 'ufo-fleet-canvas';
      canvas.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:9997;pointer-events:none;display:none;';
      document.body.appendChild(canvas);

      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.setSize(window.innerWidth, window.innerHeight, false);
      renderer.outputEncoding = THREE.sRGBEncoding;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;

      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
      camera.position.set(0, 0, 65);
      computeExtents();

      scene.add(new THREE.HemisphereLight(0x9fdcff, 0x2a0f05, 0.7));
      const key = new THREE.DirectionalLight(0xffe2c4, 2.2);
      key.position.set(30, 40, 50);
      scene.add(key);
      const rim = new THREE.DirectionalLight(0x00ffd5, 1.4);
      rim.position.set(-40, -10, -30);
      scene.add(rim);

      const envMap = buildEnvironment();

      moodArr = new Float32Array(COUNT * 3);
      energyArr = new Float32Array(COUNT);
      blinkArr = new Float32Array(COUNT);
      beamArr = new Float32Array(COUNT);
      phaseArr = new Float32Array(COUNT);
      ships.forEach((s, i) => { phaseArr[i] = s.phase; });
      moodAttr = makeInstAttr(moodArr, 3);
      energyAttr = makeInstAttr(energyArr, 1);
      blinkAttr = makeInstAttr(blinkArr, 1);
      beamAttr = makeInstAttr(beamArr, 1);

      // Hull: lathe lens profile
      const profile = [
        [0.0, -0.56], [0.55, -0.52], [1.2, -0.38], [1.9, -0.2], [2.45, -0.06], [2.62, 0.0],
        [2.45, 0.08], [1.95, 0.2], [1.4, 0.32], [1.0, 0.42], [0.92, 0.44]
      ].map(([x, y]) => new THREE.Vector2(x, y));
      const hullGeo = new THREE.LatheGeometry(profile, 56);
      attachShared(hullGeo, false);
      const hullMat = new THREE.MeshPhysicalMaterial({
        color: 0xffffff, metalness: 1.0, roughness: 0.24,
        clearcoat: 1.0, clearcoatRoughness: 0.08,
        envMap, envMapIntensity: 1.5, side: THREE.DoubleSide
      });
      hullMat.onBeforeCompile = (shader) => {
        shader.uniforms.uTime = uniforms.uTime;
        shader.vertexShader = shader.vertexShader
          .replace('#include <common>', `#include <common>
            attribute vec3 aMood;
            attribute float aEnergy;
            varying vec3 vMoodH;
            varying float vEnergyH;
            varying vec3 vLocalH;`)
          .replace('#include <begin_vertex>', `#include <begin_vertex>
            vMoodH = aMood; vEnergyH = aEnergy; vLocalH = position;`);
        shader.fragmentShader = shader.fragmentShader
          .replace('#include <common>', `#include <common>
            uniform float uTime;
            varying vec3 vMoodH;
            varying float vEnergyH;
            varying vec3 vLocalH;`)
          .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
            {
              float ang = atan(vLocalH.z, vLocalH.x);
              float rr = length(vLocalH.xz);
              float under = smoothstep(0.0, -0.18, vLocalH.y);
              float seams = smoothstep(0.94, 1.0, abs(sin(ang * 6.0)));
              float grooves = smoothstep(0.9, 1.0, abs(sin(rr * 6.5)));
              float ports = smoothstep(0.7, 1.0, sin(ang * 18.0 + uTime * 1.6)) * (1.0 - smoothstep(0.0, 0.09, abs(rr - 1.85))) * step(0.0, vLocalH.y);
              float core = (1.0 - smoothstep(0.0, 0.85, rr)) * under;
              totalEmissiveRadiance += vMoodH * ((seams * 0.3 + grooves * 0.18) * under * (0.4 + vEnergyH) + ports * 1.5 + core * (1.0 + vEnergyH * 2.2));
            }`);
      };
      hullMesh = new THREE.InstancedMesh(hullGeo, hullMat, COUNT);
      ships.forEach((s, i) => hullMesh.setColorAt(i, new THREE.Color(CASTES[s.caste].tint).offsetHSL(rand(-0.02, 0.02), 0, rand(-0.05, 0.05))));
      hullMesh.instanceColor.needsUpdate = true;

      // Dome
      const domeGeo = new THREE.SphereGeometry(0.95, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
      domeGeo.translate(0, 0.42, 0);
      attachShared(domeGeo, false);
      domeMesh = new THREE.InstancedMesh(domeGeo, new THREE.ShaderMaterial({
        vertexShader: domeVS, fragmentShader: domeFS, uniforms, transparent: true
      }), COUNT);

      // Rim light ring
      const ringGeo = new THREE.TorusGeometry(2.6, 0.065, 8, 96);
      ringGeo.rotateX(Math.PI / 2);
      attachShared(ringGeo, false);
      ringMesh = new THREE.InstancedMesh(ringGeo, new THREE.ShaderMaterial({
        vertexShader: ringVS, fragmentShader: ringFS, uniforms,
        transparent: true, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor, depthWrite: false
      }), COUNT);

      // Halo glow
      const haloGeo = new THREE.PlaneGeometry(1, 1);
      attachShared(haloGeo, true);
      haloMesh = new THREE.InstancedMesh(haloGeo, new THREE.ShaderMaterial({
        vertexShader: haloVS, fragmentShader: haloFS, uniforms,
        transparent: true, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor, depthWrite: false
      }), COUNT);

      // Tractor beam (apex at origin, widening downward)
      const beamGeo = new THREE.ConeGeometry(1, 1, 32, 1, true);
      beamGeo.translate(0, -0.5, 0);
      attachShared(beamGeo, true);
      beamMesh = new THREE.InstancedMesh(beamGeo, new THREE.ShaderMaterial({
        vertexShader: beamVS, fragmentShader: beamFS, uniforms,
        transparent: true, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor, depthWrite: false, side: THREE.DoubleSide
      }), COUNT);

      [hullMesh, domeMesh, ringMesh, haloMesh, beamMesh].forEach((m) => {
        m.frustumCulled = false;
        m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      });
      haloMesh.renderOrder = 1;
      beamMesh.renderOrder = 2;
      scene.add(haloMesh, hullMesh, domeMesh, ringMesh, beamMesh);

      bindInput();
      initialized = true;
      return true;
    } catch (err) {
      console.warn('[UFO-ARMADA] init failed', err);
      return false;
    }
  }

  function computeExtents() {
    ext.halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
    ext.halfW = ext.halfH * camera.aspect;
  }

  function bindInput() {
    window.addEventListener('pointermove', (e) => {
      mouse.ndcX = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.ndcY = -(e.clientY / window.innerHeight) * 2 + 1;
      mouse.world.set(mouse.ndcX * ext.halfW, mouse.ndcY * ext.halfH, 0);
      mouse.lastMove = performance.now();
      mouse.inside = true;
    }, { passive: true });
    document.addEventListener('pointerleave', () => { mouse.inside = false; }, { passive: true });
    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    window.addEventListener('scroll', () => {
      const now = performance.now();
      const dt = Math.max(16, now - lastScrollT) / 1000;
      scrollVel = clamp((window.scrollY - lastScrollY) / dt, -4000, 4000);
      lastScrollY = window.scrollY;
      lastScrollT = now;
    }, { passive: true });
    window.addEventListener('resize', () => {
      if (!camera || !renderer) return;
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight, false);
      computeExtents();
    });
  }

  function onPointerDown(e) {
    if (!isFlying) return;
    const px = ((e.clientX / window.innerWidth) * 2 - 1) * ext.halfW;
    const py = (-(e.clientY / window.innerHeight) * 2 + 1) * ext.halfH;
    for (const s of ships) {
      if (!s.activated || s.gone || s.state === 'exit') continue;
      const dx = s.pos.x - px, dy = s.pos.y - py;
      const d = Math.hypot(dx, dy);
      if (d > 24) continue;
      s.signal = 1;
      s.flash = 1;
      if (s.caste === 'mother' && s.boldness > 0.5) {
        s.state = 'aggro'; s.stateT = 0; s.targetMood = MOODS.aggro;
        s.clickPoint.set(px, py, 0);
      } else {
        const inv = 1 / Math.max(d, 0.5);
        const push = (34 / s.scale) * (1 - d / 24 * 0.5);
        s.vel.x += dx * inv * push;
        s.vel.y += dy * inv * push;
        s.vel.z += rand(-1, 1) * push * 0.4;
        s.state = 'evade'; s.stateT = 0; s.targetMood = MOODS.alarm;
        s.beamTarget = 0;
      }
    }
  }

  /* ------------------------------------------------------------------
     Flight lifecycle
     ------------------------------------------------------------------ */
  function resetFlight() {
    entrySide = Math.random() < 0.5 ? -1 : 1;
    waypoints = [];
    for (let k = 0; k < 7; k++) {
      waypoints.push(new THREE.Vector3(rand(-0.7, 0.7) * ext.halfW, rand(-0.45, 0.6) * ext.halfH, rand(-14, 4)));
    }
    wpIndex = 0;
    goal.copy(waypoints[0]);
    flightT = 0;
    beamToastShown = false;
    const exitBase = new THREE.Vector3(entrySide, 0.35, -0.35).normalize();

    ships.forEach((s, i) => {
      const c = CASTES[s.caste];
      s.curiosity = rand(c.curiosity[0], c.curiosity[1]);
      s.boldness = rand(c.boldness[0], c.boldness[1]);
      s.formation.set(rand(-1, 1) * 18, rand(-1, 1) * 9, rand(-1, 1) * 8);
      s.exitDir.copy(exitBase).add(tmp.set(rand(-0.3, 0.3), rand(-0.2, 0.4), rand(-0.2, 0.2))).normalize();
      s.state = 'flock'; s.stateT = 0;
      s.activated = false; s.gone = false;
      s.mood.copy(MOODS.calm); s.targetMood = MOODS.calm;
      s.energy = 0.3; s.flash = 0; s.signal = 0; s.beam = 0; s.beamTarget = 0;
      s.bank = 0; s.pitch = 0.2;
      if (s.caste === 'mother') {
        s.delay = 0.4 + i * 1.1;
        s.exitDelay = 3.5 + i * 0.6;
      } else {
        s.delay = (i - MOTHERSHIPS) * 0.012 + rand(0, 0.25);
        s.exitDelay = rand(0, 2.8);
      }
    });
  }

  function activate(s) {
    s.activated = true;
    if (s.caste === 'mother') {
      // Warp-in materialization near the current goal
      s.pos.copy(goal).add(tmp.set(s.formation.x * 0.4, 6 + Math.random() * 4, -12));
      s.vel.set(0, 0, 0);
      s.appear = 0;
      s.flash = 1.4;
    } else {
      s.pos.set(-entrySide * (ext.halfW + rand(1, 12)), rand(-0.3, 0.8) * ext.halfH, rand(-22, 6));
      s.vel.set(entrySide * s.maxSpeed * 1.4, rand(-2, 2), 0);
      s.appear = 1;
    }
  }

  function startFlyby() {
    if (isFlying) return;
    if (!init()) return;
    resetFlight();
    isFlying = true;
    canvas.style.display = 'block';
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    lastFrame = performance.now();
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(loop);

    if (typeof window.osToast === 'function') {
      window.osToast('⚠️ SENTIENT SDF ARMADA INBOUND: 100 CRAFT // 2 MOTHERSHIPS — THEY CAN SEE YOUR CURSOR', 'warn');
    }
    if (typeof window.narrate === 'function') {
      window.narrate('Unidentified sentient craft detected. They appear to be curious about you.');
    }
  }

  function stopFlyby() {
    isFlying = false;
    cancelAnimationFrame(rafId);
    rafId = 0;
    if (renderer) renderer.clear();
    if (canvas) canvas.style.display = 'none';
  }

  function scheduleMinuteFlyby() {
    setTimeout(() => {
      if (!document.hidden) startFlyby();
      scheduleMinuteFlyby();
    }, 60000);
  }

  /* ------------------------------------------------------------------
     AI + physics
     ------------------------------------------------------------------ */
  function seek(s, target, speedMul, arriveR) {
    desired.subVectors(target, s.pos);
    const d = desired.length();
    const maxV = s.maxSpeed * speedMul;
    const v = arriveR && d < arriveR ? maxV * (d / arriveR) : maxV;
    if (d > 1e-4) desired.multiplyScalar(v / d);
    desired.sub(s.vel);
    const maxF = s.maxForce * speedMul;
    if (desired.lengthSq() > maxF * maxF) desired.setLength(maxF);
    steer.add(desired);
    return d;
  }

  function setState(s, state, mood) {
    s.state = state;
    s.stateT = 0;
    if (mood) s.targetMood = mood;
  }

  function update(dt) {
    flightT += dt;
    const t = flightT;
    const time = (uniforms.uTime.value += dt);
    const now = performance.now();

    if (wpIndex < waypoints.length - 1 && t > (wpIndex + 1) * 3.4) wpIndex++;
    goal.lerp(waypoints[wpIndex], 1 - Math.exp(-dt * 0.9));

    const mouseActive = mouse.inside && now - mouse.lastMove < 4000;
    const mouseStill = mouseActive && now - mouse.lastMove > 1100;
    if (mouseActive) uniforms.uLook.value.set(mouse.world.x, mouse.world.y, 38);
    else uniforms.uLook.value.lerp(tmp.set(0, -10, 70), 1 - Math.exp(-dt * 2));

    scrollVel *= Math.exp(-dt * 4);

    // Spontaneous chatter
    if (Math.random() < dt * 0.7) {
      const s = ships[(Math.random() * COUNT) | 0];
      if (s.activated && !s.gone) s.signal = 1;
    }

    let alive = 0;
    for (let i = 0; i < COUNT; i++) {
      const s = ships[i];
      if (s.gone) continue;
      if (t < s.delay) { alive++; continue; }
      if (!s.activated) activate(s);
      alive++;
      s.stateT += dt;
      steer.set(0, 0, 0);

      // Neighborhood (boids + signal propagation)
      sep.set(0, 0, 0); ali.set(0, 0, 0); coh.set(0, 0, 0);
      let n = 0;
      for (let j = 0; j < COUNT; j++) {
        if (j === i) continue;
        const o = ships[j];
        if (!o.activated || o.gone) continue;
        const dx = o.pos.x - s.pos.x, dy = o.pos.y - s.pos.y, dz = o.pos.z - s.pos.z;
        const d2 = dx * dx + dy * dy + dz * dz;
        const sepR = 2.4 * (s.scale + o.scale);
        if (d2 < sepR * sepR && d2 > 1e-6) {
          const d = Math.sqrt(d2);
          const w = (1 - d / sepR) / d;
          sep.x -= dx * w; sep.y -= dy * w; sep.z -= dz * w;
        }
        if (d2 < 150) {
          ali.add(o.vel); coh.add(o.pos); n++;
          if (o.signal > 0.55 && o.signal < 0.63 && s.signal < 0.05) s.signal = 1;
        }
      }
      steer.addScaledVector(sep, s.maxForce * 2.6);

      // Exit trigger
      if (s.state !== 'exit' && t > FLIGHT_EXIT + s.exitDelay) {
        setState(s, 'exit', MOODS.calm);
        s.flash = 1;
        s.beamTarget = 0;
      }

      let speedMul = 1;
      switch (s.state) {
        case 'flock': {
          tmp.copy(goal).add(s.formation);
          seek(s, tmp, 1, 0);
          if (n > 0) {
            ali.multiplyScalar(1 / n).sub(s.vel).multiplyScalar(0.55);
            coh.multiplyScalar(1 / n).sub(s.pos).multiplyScalar(0.35);
            steer.add(ali).add(coh);
          }
          if (mouseActive && Math.hypot(s.pos.x - mouse.world.x, s.pos.y - mouse.world.y) < 22 &&
              Math.random() < s.curiosity * dt * 1.3) {
            setState(s, 'curious', MOODS.curious);
            s.orbitDir = Math.random() < 0.5 ? -1 : 1;
            s.orbitR = rand(4, 9) * Math.sqrt(s.scale);
            s.curiousFor = rand(4, 9);
            s.signal = 1;
          }
          break;
        }
        case 'curious': {
          s.orbitA += dt * s.orbitDir * (0.5 + 0.35 / s.scale);
          tmp.set(
            mouse.world.x + Math.cos(s.orbitA) * s.orbitR,
            mouse.world.y + 3.5 * s.scale + Math.sin(s.orbitA) * s.orbitR * 0.45,
            Math.sin(s.orbitA) * s.orbitR * 0.6
          );
          const d = seek(s, tmp, 1.1, 8);
          const distMouse = Math.hypot(s.pos.x - mouse.world.x, s.pos.y - mouse.world.y);
          if (mouseStill && (s.caste === 'mother' || s.boldness > 0.7) && d < 4 * s.scale) {
            setState(s, 'beam', MOODS.beam);
          } else if (!mouseActive || s.stateT > s.curiousFor || distMouse > 32) {
            setState(s, 'flock', MOODS.calm);
          }
          break;
        }
        case 'beam': {
          tmp.set(mouse.world.x, mouse.world.y + 5.5 * s.scale, 2);
          seek(s, tmp, 1, 6);
          s.beamTarget = 1;
          s.beamLen = Math.max(1.5, s.pos.y - mouse.world.y + 0.5);
          if (!beamToastShown && s.caste === 'mother' && typeof window.osToast === 'function') {
            beamToastShown = true;
            window.osToast('🛸 MOTHERSHIP TRACTOR BEAM LOCKED ON CURSOR — MOVE TO BREAK FREE', 'warn');
          }
          if (!mouseStill || s.stateT > 7) {
            s.beamTarget = 0;
            setState(s, mouseActive ? 'curious' : 'flock', mouseActive ? MOODS.curious : MOODS.calm);
            s.curiousFor = rand(2, 5);
          }
          break;
        }
        case 'evade': {
          s.vel.multiplyScalar(Math.exp(-dt * 1.4));
          if (s.stateT > 1.6) setState(s, 'flock', MOODS.calm);
          break;
        }
        case 'aggro': {
          tmp.copy(s.clickPoint).add(desired.set(0, 6 * s.scale, 4));
          seek(s, tmp, 1.4, 8);
          s.beamTarget = 0.5 + 0.5 * Math.sin(time * 14);
          s.beamLen = Math.max(1.5, s.pos.y - s.clickPoint.y);
          if (s.stateT > 3.2) { s.beamTarget = 0; setState(s, 'flock', MOODS.calm); }
          break;
        }
        case 'exit': {
          speedMul = 2.5 + s.stateT * 2.5;
          tmp.copy(s.pos).addScaledVector(s.exitDir, 200);
          seek(s, tmp, speedMul, 0);
          if (s.stateT > 1.1) s.appear -= dt * 1.7;
          if (s.appear <= 0) { s.gone = true; s.appear = 0; }
          break;
        }
      }

      // Wander, scroll reaction, soft bounds (not while leaving)
      s.wanderTheta += rand(-1, 1) * dt * 3;
      steer.x += Math.cos(s.wanderTheta) * s.maxForce * 0.22;
      steer.y += Math.sin(s.wanderTheta) * s.maxForce * 0.14;
      steer.y += scrollVel * 0.0035 / s.scale;
      if (s.state !== 'exit') {
        const bx = ext.halfW * 0.92, by = ext.halfH * 0.85;
        if (s.pos.x > bx) steer.x -= Math.min(s.pos.x - bx, 20) * 0.9;
        if (s.pos.x < -bx) steer.x += Math.min(-bx - s.pos.x, 20) * 0.9;
        if (s.pos.y > by) steer.y -= (s.pos.y - by) * 0.9;
        if (s.pos.y < -by) steer.y += (-by - s.pos.y) * 0.9;
        if (s.pos.z > 14) steer.z -= (s.pos.z - 14) * 1.2;
        if (s.pos.z < -30) steer.z += (-30 - s.pos.z) * 1.2;
        if (s.appear < 1) s.appear = Math.min(1, s.appear + dt * 0.9);
      }

      // Integrate
      s.vel.addScaledVector(steer, dt);
      const vmax = s.maxSpeed * speedMul * (s.state === 'evade' ? 3 : 1);
      if (s.vel.lengthSq() > vmax * vmax) s.vel.setLength(vmax);
      s.pos.addScaledVector(s.vel, dt);

      // Emotional / visual state
      s.signal = Math.max(0, s.signal - dt * 1.6);
      s.flash = Math.max(0, s.flash - dt * 1.4);
      s.beam += (s.beamTarget - s.beam) * (1 - Math.exp(-dt * 6));
      let extra = 0;
      if (s.state === 'curious') extra = 0.5;
      else if (s.state === 'beam') extra = 1.0;
      else if (s.state === 'evade') extra = 1.2;
      else if (s.state === 'aggro') extra = 0.9 + 0.5 * Math.sin(time * 12);
      else if (s.state === 'exit') extra = 0.6 + s.stateT;
      const base = 0.25 + 0.12 * Math.sin(time * 2.3 + s.phase);
      s.energy += (base + extra + s.flash * 2 - s.energy) * (1 - Math.exp(-dt * 5));
      s.mood.lerp(s.targetMood, 1 - Math.exp(-dt * 4));

      s.blinkT -= dt;
      if (s.blinkT <= 0) {
        s.blinkPhase = 0.18;
        s.blinkT = s.state === 'evade' ? rand(0.25, 0.6) : rand(2, 7);
      }
      s.blinkPhase = Math.max(0, s.blinkPhase - dt);
      const blink = s.blinkPhase > 0 ? Math.sin((1 - s.blinkPhase / 0.18) * Math.PI) : 0;

      // Attitude: bank into turns, pitch with climb, tilt dome toward viewer
      const bankT = clamp(-(s.vel.x * 0.035 + steer.x * 0.012), -0.75, 0.75);
      const pitchT = 0.22 + clamp(s.vel.y * 0.03 - s.vel.z * 0.012, -0.45, 0.45);
      s.bank += (bankT - s.bank) * (1 - Math.exp(-dt * 4));
      s.pitch += (pitchT - s.pitch) * (1 - Math.exp(-dt * 4));
      s.spin += dt * (s.spinBase + s.energy * 1.4) * s.spinDir;

      writeInstance(i, s, time, blink);
    }

    return alive > 0;
  }

  function writeInstance(i, s, time, blink) {
    const visible = s.activated && !s.gone;
    const hover = Math.sin(time * 1.7 + s.phase) * 0.2 * s.scale;
    const sc = visible ? s.scale * s.appear * (1 + 0.03 * Math.sin(time * 3 + s.phase)) : 0;
    const wob = Math.sin(time * s.wobF + s.phase) * 0.06;

    dummy.position.set(s.pos.x, s.pos.y + hover, s.pos.z);
    dummy.rotation.set(s.pitch + wob, s.spin, s.bank + wob * 0.6);
    dummy.scale.setScalar(sc);
    dummy.updateMatrix();
    hullMesh.setMatrixAt(i, dummy.matrix);
    domeMesh.setMatrixAt(i, dummy.matrix);
    ringMesh.setMatrixAt(i, dummy.matrix);

    dummy.rotation.set(0, 0, 0);
    dummy.position.set(s.pos.x, s.pos.y + hover, s.pos.z - 1.2 * sc);
    dummy.scale.setScalar(sc * 6.5);
    dummy.updateMatrix();
    haloMesh.setMatrixAt(i, dummy.matrix);

    if (visible && s.beam > 0.01) {
      const r = 0.6 * s.scale + s.beamLen * 0.22;
      dummy.position.set(s.pos.x, s.pos.y + hover - 0.4 * sc, s.pos.z);
      dummy.scale.set(r, s.beamLen, r);
    } else {
      dummy.scale.setScalar(0);
    }
    dummy.updateMatrix();
    beamMesh.setMatrixAt(i, dummy.matrix);

    // Mood color with signal/flash whitening
    outColor.copy(s.mood).lerp(WHITE, clamp(s.signal * 0.75 + s.flash * 0.5, 0, 0.9));
    moodArr[i * 3] = outColor.r;
    moodArr[i * 3 + 1] = outColor.g;
    moodArr[i * 3 + 2] = outColor.b;
    energyArr[i] = s.energy;
    blinkArr[i] = blink;
    beamArr[i] = visible ? s.beam : 0;
  }

  function loop(now) {
    if (!isFlying) return;
    rafId = requestAnimationFrame(loop);
    const dt = Math.min((now - lastFrame) / 1000, 0.05);
    lastFrame = now;

    const anyAlive = update(dt);

    hullMesh.instanceMatrix.needsUpdate = true;
    domeMesh.instanceMatrix.needsUpdate = true;
    ringMesh.instanceMatrix.needsUpdate = true;
    haloMesh.instanceMatrix.needsUpdate = true;
    beamMesh.instanceMatrix.needsUpdate = true;
    moodAttr.needsUpdate = true;
    energyAttr.needsUpdate = true;
    blinkAttr.needsUpdate = true;
    beamAttr.needsUpdate = true;

    renderer.render(scene, camera);

    if (!anyAlive || flightT > FLIGHT_MAX) stopFlyby();
  }

  /* ------------------------------------------------------------------
     Boot
     ------------------------------------------------------------------ */
  function boot() {
    window.spawnUFOFleet = startFlyby;
    window.UFO_ARMADA = { ships, start: startFlyby, stop: stopFlyby, get flying() { return isFlying; } };
    scheduleMinuteFlyby();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
