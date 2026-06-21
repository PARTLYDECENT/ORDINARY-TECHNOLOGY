/* deer.js
   Premium zombie deer SDF-like entity using Raymarched ShaderMaterial.
   Provides: window.Deer.spawnDeerAt(x,z), .spawnDeerRandom(), .update(dt), .debugSpawn(count)
*/
(function(){
  if (typeof THREE === 'undefined') { console.warn('[Deer] THREE not present'); return; }

  const MAX_DEER = 12;
  const deerList = [];

  const vertexShader = `
    varying vec3 vLocalPos;
    varying vec3 vWorldPos;
    void main() {
        vLocalPos = position;
        vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  const fragmentShader = `
    precision highp float;
    
    varying vec3 vLocalPos;
    varying vec3 vWorldPos;
    
    uniform mat4 inverseModelMatrix;
    uniform mat4 modelMatrix;
    uniform mat4 projectionMatrix;
    uniform float iTime;
    uniform float isMoving;

    // --- SDF Primitives ---
    float sdSphere(vec3 p, float r) { return length(p) - r; }
    float sdCapsule(vec3 p, vec3 a, vec3 b, float r) {
        vec3 pa = p - a, ba = b - a;
        float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
        return length(pa - ba * h) - r;
    }
    
    // --- Smooth Min (The glue of flesh) ---
    float smin(float a, float b, float k) {
        float h = clamp(0.5 + 0.5*(b-a)/k, 0.0, 1.0);
        return mix(b, a, h) - k*h*(1.0-h);
    }

    // --- Harmonic Noise (The zombie tremor) ---
    float noise(float t) {
        return sin(t*1.13)*0.5 + sin(t*2.71)*0.3 + sin(t*5.93)*0.2;
    }

    // --- Rotation ---
    mat2 rot(float a) { float s=sin(a), c=cos(a); return mat2(c, -s, s, c); }

    // --- The Deer SDF ---
    vec2 sdDeer(vec3 p) {
        // Walk cycle parameters
        float walkSpeed = 3.0;
        float wt = iTime * walkSpeed;
        float stride = 0.35 * isMoving;
        float lift = 0.25 * isMoving;
        
        // Global body bobbing based on step cycle
        float bob = abs(sin(wt)) * 0.08 * isMoving;
        p.y += bob; // World shifts up, deer dips down mid-step

        // Zombie twitching - localized spinal spasms
        float twitch = noise(iTime * 5.0) * 0.03;
        p.xz = rot(twitch) * p.xz;
        p.yz = rot(twitch * 0.5) * p.yz;

        // 1. Body (Articulated chest and hips)
        vec3 bp = p; 
        bp.xz = rot(sin(iTime*1.5)*0.02) * bp.xz; // Breathing
        
        float chest = sdSphere((bp - vec3(0.0, 0.1, -0.3)) * vec3(1.2, 0.9, 0.8), 0.6);
        float hips = sdSphere((bp - vec3(0.0, 0.0, 0.6)) * vec3(1.1, 1.2, 1.0), 0.45);
        float deerBody = smin(chest, hips, 0.5);
        
        // Emaciated belly (hollow out stomach)
        float belly = sdSphere(bp - vec3(0.0, -0.6, 0.2), 0.6);
        deerBody = max(deerBody, -belly);

        // Ribs displacement
        float ribs = sin(bp.z * 30.0) * 0.02;
        float ribMask = smoothstep(0.1, 0.4, abs(bp.x)) * smoothstep(0.4, -0.2, bp.y) * smoothstep(-0.8, 0.2, bp.z);
        deerBody += ribs * ribMask;

        // 2. Neck (Rising from the front)
        vec3 np = p - vec3(0.0, 0.4, -0.7);
        np.xz = rot(0.5) * np.xz; // Tilt neck up
        float deerNeck = sdCapsule(np, vec3(0.0), vec3(0.0, 1.0, -0.3), 0.22);
        deerNeck = smin(deerNeck, sdCapsule(np, vec3(0.0, 1.0, -0.3), vec3(0.0, 1.4, -0.4), 0.18), 0.2);

        // 3. Head
        vec3 hp = p - vec3(0.0, 1.7, -1.2);
        hp.xz = rot(sin(iTime*3.0)*0.1) * hp.xz; // Erratic head snapping
        vec3 hpSym = hp; hpSym.x = abs(hp.x);
        
        float cranium = sdSphere(hp * vec3(1.0, 1.1, 1.2), 0.28);
        float snout = sdCapsule(hp, vec3(0.0, -0.05, -0.1), vec3(0.0, -0.25, -0.5), 0.15);
        float deerHead = smin(cranium, snout, 0.1);
        
        // --- REALISTIC EMBEDDED EYE ---
        vec3 eyeP = hp - vec3(0.0, 0.06, -0.22); // Deep inside the forehead
        
        // Carve an almond-shaped socket out of the flesh
        float socket = sdSphere(eyeP * vec3(1.0, 1.8, 1.0), 0.14);
        deerHead = max(deerHead, -socket);
        
        // Heavy brow ridge blending into the skull over the eye
        float brow = sdCapsule(hp, vec3(-0.12, 0.16, -0.24), vec3(0.12, 0.16, -0.24), 0.05);
        deerHead = smin(deerHead, brow, 0.08);

        // Hollow normal eye sockets on the sides
        float deerEyes = sdSphere(hpSym - vec3(0.15, 0.05, -0.22), 0.08);
        deerHead = max(deerHead, -deerEyes);
        
        // Missing flesh on jaw (asymmetrical rot)
        float cheek = sdSphere(hp - vec3(0.1, -0.2, -0.15), 0.15);
        deerHead = max(deerHead, -cheek);

        // 4. Ears (Drooping)
        vec3 ep = hpSym - vec3(0.2, 0.2, 0.0);
        ep.xy = rot(-0.5) * ep.xy; 
        ep.xz = rot(0.2) * ep.xz;
        float deerEars = sdCapsule(ep, vec3(0), vec3(0.3, 0.1, -0.1), 0.06);

        // 5. Antlers (Branched using symmetry)
        vec3 ap = hpSym - vec3(0.12, 0.25, -0.05);
        ap.xy = rot(0.3) * ap.xy; 
        ap.xz = rot(0.1) * ap.xz;
        float antler = sdCapsule(ap, vec3(0), vec3(0.2, 0.5, -0.1), 0.035);
        antler = smin(antler, sdCapsule(ap, vec3(0.2, 0.5, -0.1), vec3(0.4, 0.8, -0.2), 0.025), 0.05);
        antler = smin(antler, sdCapsule(ap, vec3(0.2, 0.5, -0.1), vec3(0.1, 0.7, -0.3), 0.02), 0.05);
        antler = smin(antler, sdCapsule(ap, vec3(0.1, 0.2, -0.05), vec3(0.1, 0.4, -0.4), 0.02), 0.04);

        // --- 6. Legs (Walking Animation Cycle) ---
        float deerLegs = 1e5;
        
        // Front Right (Stepping)
        vec3 lpFR = p - vec3(0.25, -0.2, -0.5);
        float wFR = wt;
        lpFR.z += -cos(wFR) * stride;
        lpFR.y += max(0.0, sin(wFR)) * lift;
        lpFR.yz = rot(-cos(wFR) * 0.4) * lpFR.yz; 
        float fr_thigh = sdCapsule(lpFR, vec3(0), vec3(0.0, -0.6, 0.1), 0.09);
        vec3 calfFR = lpFR - vec3(0.0, -0.6, 0.1);
        calfFR.yz = rot(max(0.0, sin(wFR)) * 0.8) * calfFR.yz; // Knee bends back when lifting
        float fr_calf = sdCapsule(calfFR, vec3(0), vec3(0.0, -0.7, -0.1), 0.05); 
        deerLegs = min(deerLegs, smin(fr_thigh, fr_calf, 0.05));

        // Front Left (Stepping opposite)
        vec3 lpFL = p - vec3(-0.25, -0.2, -0.5);
        float wFL = wt + 3.1415; // Offset half cycle
        lpFL.z += -cos(wFL) * stride;
        lpFL.y += max(0.0, sin(wFL)) * lift;
        lpFL.yz = rot(-cos(wFL) * 0.4) * lpFL.yz;
        float fl_thigh = sdCapsule(lpFL, vec3(0), vec3(0.0, -0.6, 0.1), 0.09);
        vec3 calfFL = lpFL - vec3(0.0, -0.6, 0.1);
        calfFL.yz = rot(max(0.0, sin(wFL)) * 0.8) * calfFL.yz;
        float fl_calf = sdCapsule(calfFL, vec3(0), vec3(0.0, -0.7, -0.1), 0.05);
        deerLegs = min(deerLegs, smin(fl_thigh, fl_calf, 0.05));

        // Back Right (Dragging dead leg, broken)
        vec3 lpBR = p - vec3(0.25, -0.1, 0.6);
        float wBR = wt + 1.0; // Desynced dragging
        lpBR.z += -cos(wBR) * stride * 0.3; // Tiny drag stride
        lpBR.y += 0.2 * isMoving; // Sags closer to ground
        lpBR.xy = rot(0.3 * isMoving) * lpBR.xy; // Splayed outwards
        lpBR.yz = rot(-0.6 * isMoving) * lpBR.yz; // Permanently splayed back
        float br_thigh = sdCapsule(lpBR, vec3(0), vec3(0.0, -0.6, -0.2), 0.08);
        vec3 calfBR = lpBR - vec3(0.0, -0.6, -0.2);
        calfBR.yz = rot(0.3 * isMoving) * calfBR.yz; // Stiff broken knee
        float br_calf = sdCapsule(calfBR, vec3(0), vec3(0.0, -0.7, 0.1), 0.04);
        deerLegs = min(deerLegs, smin(br_thigh, br_calf, 0.05)); 

        // Back Left (Stepping)
        vec3 lpBL = p - vec3(-0.25, -0.1, 0.6);
        float wBL = wt; // Trot gait (matches front right)
        lpBL.z += -cos(wBL) * stride;
        lpBL.y += max(0.0, sin(wBL)) * lift;
        lpBL.yz = rot(-cos(wBL) * 0.4) * lpBL.yz;
        float bl_thigh = sdCapsule(lpBL, vec3(0), vec3(0.0, -0.6, -0.2), 0.11);
        vec3 calfBL = lpBL - vec3(0.0, -0.6, -0.2);
        calfBL.yz = rot(-max(0.0, sin(wBL)) * 0.6) * calfBL.yz; // Back knees bend forward
        float bl_calf = sdCapsule(calfBL, vec3(0), vec3(0.0, -0.7, 0.1), 0.06);
        deerLegs = min(deerLegs, smin(bl_thigh, bl_calf, 0.05));

        // 7. Tail
        vec3 tp = p - vec3(0.0, 0.3, 1.0); 
        tp.xz = rot(-0.5 + sin(iTime*4.0)*0.2) * tp.xz;
        float deerTail = sdCapsule(tp, vec3(0), vec3(0, -0.2, 0.1), 0.05);

        // --- REALISTIC EYEBALL ---
        // Sclera (scaled down to fit snugly inside the socket)
        float deerSclera = sdSphere(eyeP, 0.11);
        
        // Dual pupils (Goat-like vertical slits resting on the surface)
        vec3 p1 = eyeP - vec3(0.035, 0.0, -0.10);
        vec3 p2 = eyeP - vec3(-0.035, 0.0, -0.10);
        float deerPupils = min(sdCapsule(p1, vec3(0.0, 0.015, 0.0), vec3(0.0, -0.015, 0.0), 0.012), 
                           sdCapsule(p2, vec3(0.0, 0.015, 0.0), vec3(0.0, -0.015, 0.0), 0.012));

        // Combine the monster
        float deer = smin(deerBody, deerNeck, 0.4);
        deer = smin(deer, deerHead, 0.2);
        deer = smin(deer, deerEars, 0.05);
        deer = smin(deer, deerLegs, 0.2);
        deer = smin(deer, deerTail, 0.1);
        
        float deerBones = antler; 
        
        // Return distances encoded with exact material IDs
        vec2 res = vec2(deer, 1.0); // 1.0 = Flesh
        if(deerBones < res.x) res = vec2(deerBones, 2.0); // 2.0 = Bone
        if(deerSclera < res.x) res = vec2(deerSclera, 3.0); // 3.0 = Sclera
        if(deerPupils < res.x) res = vec2(deerPupils, 4.0); // 4.0 = Pupils
        
        return res;
    }

    vec2 map(vec3 p) {
        return sdDeer(p + vec3(0.0, 2.0, 0.0));
    }

    float hitBox(vec3 ro, vec3 rd, vec3 boxMin, vec3 boxMax, out float tN, out float tF) {
        vec3 invR = 1.0 / (rd + vec3(1e-6));
        vec3 tbot = invR * (boxMin - ro);
        vec3 ttop = invR * (boxMax - ro);
        vec3 tmin = min(tbot, ttop);
        vec3 tmax = max(tbot, ttop);
        float t0 = max(tmin.x, max(tmin.y, tmin.z));
        float t1 = min(tmax.x, min(tmax.y, tmax.z));
        tN = t0;
        tF = t1;
        return (t1 >= t0 && t1 > 0.0) ? 1.0 : 0.0;
    }

    void main() {
        // Transform camera position to local space
        vec3 localCameraPos = (inverseModelMatrix * vec4(cameraPosition, 1.0)).xyz;
        
        // Ray direction in local space
        vec3 rd = normalize(vLocalPos - localCameraPos);
        vec3 ro = localCameraPos;
        
        float tN = 0.0;
        float tF = 0.0;
        // Bounding box dimensions: x:[-1.25, 1.25], y:[0.0, 4.5], z:[-1.75, 1.75]
        float hit_box = hitBox(ro, rd, vec3(-1.25, 0.0, -1.75), vec3(1.25, 4.5, 1.75), tN, tF);
        
        if (hit_box < 0.5) {
            discard;
        }
        
        // Start raymarching at the entry point of the box
        float t = max(0.0, tN);
        float id = 0.0;
        bool hit = false;
        
        // Raymarch only within the box
        for(int i = 0; i < 70; i++) {
            vec3 p = ro + rd * t;
            
            vec3 sdfP = p - vec3(0.0, 3.5, 0.0);
            vec2 res = map(sdfP);
            
            if(res.x < 0.001) {
                id = res.y;
                hit = true;
                break;
            }
            t += res.x;
            if(t > tF) break;
        }
        
        if (!hit) {
            discard;
        }
        
        // Calculate normals in local space
        vec3 localP = ro + rd * t;
        vec3 sdfP = localP - vec3(0.0, 3.5, 0.0);
        
        vec2 e = vec2(0.001, 0.0);
        vec3 localN = normalize(vec3(
            map(sdfP+e.xyy).x - map(sdfP-e.xyy).x,
            map(sdfP+e.yxy).x - map(sdfP-e.yxy).x,
            map(sdfP+e.yyx).x - map(sdfP-e.yyx).x
        ));
        
        // Transform normal to world space
        vec3 worldN = normalize(vec3(modelMatrix * vec4(localN, 0.0)));
        vec3 worldPos = (modelMatrix * vec4(localP, 1.0)).xyz;
        vec3 worldV = normalize(worldPos - cameraPosition);
        
        vec3 l = normalize(vec3(1.0, 2.0, -1.0)); // Eerie moonlight
        
        // Ambient
        float amb = 0.15;
        // Diffuse
        float dif = clamp(dot(worldN, l), 0.0, 1.0);
        // Rim light (Undead glow)
        float rim = pow(1.0 - clamp(dot(worldN, -worldV), 0.0, 1.0), 3.0);

        vec3 col = vec3(0.0);

        if(id < 1.5) {
            // Deer Flesh
            vec3 flesh = vec3(0.35, 0.2, 0.15);
            float spots = smoothstep(0.3, 0.7, sin(sdfP.x*15.0)*sin(sdfP.y*20.0)*sin(sdfP.z*15.0));
            flesh = mix(flesh, vec3(0.08, 0.05, 0.05), spots);
            col = flesh * (amb + dif * vec3(0.6, 0.5, 0.4));
            col += vec3(0.2, 0.8, 0.3) * rim * 0.5; // Bioluminescent undead rim
        }
        else if(id < 2.5) {
            // Bone Antlers
            vec3 bone = vec3(0.8, 0.75, 0.6);
            col = bone * (amb + dif * 0.8);
            col += vec3(0.5, 0.9, 0.6) * rim * 1.2; // Glowing antler tips
        }
        else if(id < 3.5) {
            // Sclera (White Eye)
            vec3 scleraCol = vec3(0.85, 0.85, 0.8);
            float veins = smoothstep(0.7, 1.0, sin(sdfP.x*60.0)*sin(sdfP.y*50.0));
            scleraCol = mix(scleraCol, vec3(0.6, 0.1, 0.1), veins * 0.4);
            col = scleraCol * (amb + dif * 0.9);
            float spec = pow(max(dot(worldN, normalize(l - worldV)), 0.0), 32.0);
            col += vec3(1.0) * spec * 0.6;
        }
        else {
            // Pupils (Yellow)
            vec3 pupilCol = vec3(0.9, 0.8, 0.1);
            col = pupilCol * (amb + dif * 1.2);
            float spec = pow(max(dot(worldN, normalize(l - worldV)), 0.0), 64.0);
            col += vec3(1.0) * spec * 0.8;
            col += vec3(0.8, 0.7, 0.0) * rim * 0.5; // Slight yellow glow
        }

        // Gamma correction
        col = pow(col, vec3(1.0/2.2));
        
        gl_FragColor = vec4(col, 1.0);
        
        #ifdef GL_EXT_frag_depth
            vec4 clipPos = projectionMatrix * viewMatrix * vec4(worldPos, 1.0);
            gl_FragDepthEXT = (clipPos.z / clipPos.w) * 0.5 + 0.5;
        #endif
    }
  `;

  function makeZombieDeer() {
    let geo, mat, mesh;
    
    try {
      geo = new THREE.BoxGeometry(2.5, 4.5, 3.5);
      geo.translate(0, 2.25, 0);
    } catch (e) {
      console.error('[Deer] Failed to create BoxGeometry:', e);
      geo = new THREE.BoxGeometry(1, 1, 1);
    }

    try {
      mat = new THREE.ShaderMaterial({
        uniforms: {
          iTime: { value: 0 },
          isMoving: { value: 0 },
          inverseModelMatrix: { value: new THREE.Matrix4() }
        },
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        transparent: true,
        depthWrite: true,
        depthTest: true,
        side: THREE.DoubleSide
      });
    } catch (e) {
      console.error('[Deer] ShaderMaterial compilation failed. Falling back to MeshStandardMaterial:', e);
      mat = new THREE.MeshStandardMaterial({
        color: 0x3d4734,
        roughness: 0.9,
        metalness: 0.1
      });
    }

    try {
      mesh = new THREE.Mesh(geo, mat);
      mesh.onBeforeRender = function(renderer, scene, camera, geometry, material, group) {
        if (material && material.uniforms && material.uniforms.inverseModelMatrix) {
          try {
            material.uniforms.inverseModelMatrix.value.copy(mesh.matrixWorld).invert();
          } catch (err) {
            console.error('[Deer] Failed to update inverseModelMatrix uniform:', err);
          }
        }
      };
    } catch (e) {
      console.error('[Deer] Failed to instantiate Mesh:', e);
      mesh = new THREE.Object3D();
    }

    mesh.animTime = Math.random() * 100;
    mesh.velocity = new THREE.Vector3();
    mesh.targetPos = new THREE.Vector3();
    mesh.hasTarget = false;
    mesh.speed = 1.8 + Math.random() * 1.5;

    return mesh;
  }

  function spawnDeerAt(x, z) {
    try {
      if (!window.scene) { console.warn('[Deer] no global scene'); return false; }
      if (deerList.length >= MAX_DEER) {
        const old = deerList.shift(); if (old && old.parent) old.parent.remove(old);
      }

      let y = 1.0;
      if (window.TerrainGen && typeof window.TerrainGen.getMeshHeight === 'function') {
        y = window.TerrainGen.getMeshHeight(x, z) + 0.40;
      }

      const d = makeZombieDeer();
      if (!d) return false;
      
      d.position.set(x, y, z);
      const s = 0.8 + Math.random() * 0.35; d.scale.setScalar(s);
      d.rotation.y = Math.random() * Math.PI * 2;
      window.scene.add(d);
      deerList.push(d);
      console.log('[Deer] spawned raymarched zombie deer at', x, z);
      return d;
    } catch (e) { console.error('[Deer] spawn failed', e); return false; }
  }

  function spawnDeerRandom() {
    try {
      if (!window.player) { console.warn('[Deer] no player'); return false; }
      const p = window.player.position;
      const angle = Math.random() * Math.PI * 2;
      const dist = 8 + Math.random() * 16;
      const x = p.x + Math.cos(angle) * dist;
      const z = p.z + Math.sin(angle) * dist;
      return spawnDeerAt(x, z);
    } catch (e) { console.error('[Deer] spawn random failed:', e); return false; }
  }

  // Animates and moves all active zombie deer
  function update(dt) {
    if (isNaN(dt) || dt <= 0) dt = 0.016;
    const playerPos = window.player ? window.player.position : null;

    for (let i = deerList.length - 1; i >= 0; i--) {
      const d = deerList[i];
      if (!d || !d.parent) {
        deerList.splice(i, 1);
        continue;
      }

      try {
        d.animTime += dt;
        if (d.material && d.material.uniforms && d.material.uniforms.iTime) {
          d.material.uniforms.iTime.value = d.animTime;
        }

        // Zombie movement logic: mainly chase player globally
        let targetX = d.position.x;
        let targetZ = d.position.z;
        let targetDist = 999;

        if (playerPos) {
          const dx = playerPos.x - d.position.x;
          const dz = playerPos.z - d.position.z;
          targetDist = Math.hypot(dx, dz);

          targetX = playerPos.x;
          targetZ = playerPos.z;
          d.hasTarget = true;
        } else {
          if (!d.hasTarget || Math.random() < 0.01) {
            d.targetPos.set(
              d.position.x + (Math.random() - 0.5) * 12,
              d.position.y,
              d.position.z + (Math.random() - 0.5) * 12
            );
            d.hasTarget = true;
          }
        }

        const moveX = playerPos ? targetX - d.position.x : d.targetPos.x - d.position.x;
        const moveZ = playerPos ? targetZ - d.position.z : d.targetPos.z - d.position.z;
        const distToTarget = Math.hypot(moveX, moveZ);

        let isMoving = false;
        if (distToTarget > 0.5) {
          isMoving = true;
          const speedMultiplier = (playerPos && targetDist < 10.0) ? 2.2 : 1.0;
          const moveSpeed = d.speed * speedMultiplier * dt;
          d.position.x += (moveX / distToTarget) * moveSpeed;
          d.position.z += (moveZ / distToTarget) * moveSpeed;

          // Face the direction of movement (negative Z is forward in SDF, so we add Math.PI)
          const targetAngle = Math.atan2(moveX, moveZ) + Math.PI;
          let diff = targetAngle - d.rotation.y;
          while (diff < -Math.PI) diff += Math.PI * 2;
          while (diff > Math.PI) diff -= Math.PI * 2;
          d.rotation.y += diff * 5.0 * dt;
        }

        if (d.material && d.material.uniforms && d.material.uniforms.isMoving) {
          d.material.uniforms.isMoving.value = isMoving ? 1.0 : 0.0;
        }

        if (window.TerrainGen && typeof window.TerrainGen.getMeshHeight === 'function') {
          const targetY = window.TerrainGen.getMeshHeight(d.position.x, d.position.z) + 0.40;
          d.position.y += (targetY - d.position.y) * 12 * dt;
        }
      } catch (err) {
        console.error('[Deer] Error during update step:', err);
      }
    }
  }

  let enabled = true;
  setInterval(() => {
    try {
      if (!enabled || !window.GAME_START_CONFIG) return;
      if (window.GAME_START_CONFIG.mapId === 'desert') {
        if (Math.random() < 0.40) spawnDeerRandom();
      }
    } catch (e) {
      console.error('[Deer] Periodic spawner check failed:', e);
    }
  }, 18000);

  window.Deer = {
    spawnDeerAt,
    spawnDeerRandom,
    update,
    debugSpawn(count = 1){ for(let i=0;i<count;i++) setTimeout(spawnDeerRandom, i*120); },
    _list: deerList,
    _enablePeriodic(val){ enabled = !!val; }
  };

  console.log('[Deer] Raymarched Zombie Deer module loaded with error fallbacks');
})();
