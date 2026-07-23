/* truck.js
   Procedural drivable Cyber-Truck system for Project Escapism.
   Provides: M to spawn the truck, - to enter/exit and drive it.
*/
(function(){
  if (typeof THREE === 'undefined') { console.warn('[Truck] THREE not present'); return; }

  const truckState = {
    isDriving: false,
    truckObject: null,
    speed: 0,
    maxSpeed: 22,
    accel: 15,
    decel: 12,
    friction: 4.0,
    turnSpeed: 2.2,
    prevCamera: null
  };

  function createProceduralTruck() {
    // Generate the vertex shader (maps to Three.js vertex positions)
    const vertexShader = `
      varying vec3 vLocalPos;
      varying vec3 vWorldPos;
      void main() {
          vLocalPos = position;
          vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    // Generate the fragment shader from user's WebGL2 SDF source
    const fragmentShader = `
      precision highp float;
      
      varying vec3 vLocalPos;
      varying vec3 vWorldPos;
      
      uniform mat4 inverseModelMatrix;
      uniform mat4 modelMatrix;
      uniform mat4 projectionMatrix;
      uniform mat4 viewMatrix;
      uniform float iTime;
      uniform vec3 cameraPosition;

      // --- SDF Primitives ---
      float sdBox( vec3 p, vec3 b ) {
        vec3 q = abs(p) - b;
        return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0);
      }
      
      float sdRoundBox( vec3 p, vec3 b, float r ) {
        vec3 q = abs(p) - b;
        return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0) - r;
      }

      float sdCylY( vec3 p, float h, float r ) {
        vec2 d = abs(vec2(length(p.xz),p.y)) - vec2(r,h);
        return min(max(d.x,d.y),0.0) + length(max(d,0.0));
      }

      // --- Rotation ---
      mat2 rot(float a) { float s=sin(a), c=cos(a); return mat2(c, -s, s, c); }

      // --- Arctic Camo ---
      vec3 arcticCamo(vec3 p) {
          vec3 rp = p * 2.0; // scale the pattern
          vec3 q = rp + vec3(sin(rp.z*2.0), sin(rp.x*2.0), cos(rp.y*2.0));
          float f = sin(q.x*2.0)*cos(q.y*2.0)*sin(q.z*2.0);
          f += 0.5*sin(q.x*4.0 + 2.0)*cos(q.y*4.0 - 1.0);

          vec3 col1 = vec3(0.9, 0.95, 1.0); // Snow white
          vec3 col2 = vec3(0.6, 0.65, 0.7); // Light Grey
          vec3 col3 = vec3(0.4, 0.45, 0.5); // Dark Grey
          vec3 col4 = vec3(0.2, 0.25, 0.3); // Slate Blue

          if(f > 0.3) return col1;
          if(f > -0.1) return col2;
          if(f > -0.4) return col3;
          return col4;
      }

      // --- The Truck SDF ---
      vec2 sdTruck(vec3 p) {
          // Animation loop: Smooth open and close with a pause
          float tCycle = smoothstep(-0.2, 0.8, sin(iTime * 1.5));
          float hoodAngle = tCycle * 1.0;  // Hood opens upward
          float doorAngle = tCycle * 1.2;  // Doors swing outward
          
          vec2 res = vec2(1e5, 0.0);
          #define ADD(d, matId) if(d < res.x) res = vec2(d, matId)

          // 1. Chassis, Bumpers & Grill (Dark Metal - ID 2.0)
          float chassis = sdRoundBox(p - vec3(0.0, 0.25, 0.0), vec3(0.65, 0.05, 1.9), 0.05);
          float fbumper = sdRoundBox(p - vec3(0.0, 0.3, -2.0), vec3(0.75, 0.1, 0.1), 0.05);
          float rbumper = sdRoundBox(p - vec3(0.0, 0.3, 1.9), vec3(0.75, 0.1, 0.1), 0.05);
          float grill = sdBox(p - vec3(0.0, 0.65, -1.95), vec3(0.6, 0.2, 0.05));
          
          float undercarriage = min(chassis, min(fbumper, min(rbumper, grill)));
          ADD(undercarriage, 2.0);

          // 2. Engine Block (Under the hood - ID 2.0)
          float engineBlock = sdRoundBox(p - vec3(0.0, 0.5, -1.4), vec3(0.3, 0.15, 0.3), 0.05);
          float airFilter = sdCylY(p - vec3(0.0, 0.7, -1.4), 0.05, 0.25);
          float engine = min(engineBlock, airFilter);
          ADD(engine, 2.0);

          // 3. Wheels & Rims (ID 3.0 Tires, ID 4.0 Rims)
          vec3 pw = p;
          pw.x = abs(pw.x); // Mirror X for left/right
          pw.z = abs(pw.z - 0.1) - 1.4; // Mirror Z for front/back wheels
          float tires = sdCylY(pw.yxz - vec3(0.4, 0.78, 0.0), 0.12, 0.35);
          float rims = sdCylY(pw.yxz - vec3(0.4, 0.83, 0.0), 0.08, 0.25);
          ADD(tires, 3.0);
          ADD(rims, 4.0);

          // 4. Interior / Cabin (ID 2.0)
          float seats = sdRoundBox(p - vec3(0.25, 0.6, 0.0), vec3(0.2, 0.1, 0.3), 0.05); // Right seat
          seats = min(seats, sdRoundBox(p - vec3(-0.25, 0.6, 0.0), vec3(0.2, 0.1, 0.3), 0.05)); // Left seat
          seats = min(seats, sdRoundBox(p - vec3(0.25, 1.0, 0.2), vec3(0.2, 0.35, 0.05), 0.05)); // Right backrest
          seats = min(seats, sdRoundBox(p - vec3(-0.25, 1.0, 0.2), vec3(0.2, 0.35, 0.05), 0.05)); // Left backrest
          
          vec3 pWheel = p - vec3(-0.3, 0.9, -0.6); // Steering wheel (Left side)
          pWheel.yz *= rot(0.5);
          float steerRing = max(sdCylY(pWheel, 0.02, 0.16), -sdCylY(pWheel, 0.03, 0.12));
          float column = sdCylY(pWheel - vec3(0.0, -0.15, 0.0), 0.15, 0.04);
          
          float dash = sdRoundBox(p - vec3(0.0, 0.85, -0.7), vec3(0.65, 0.15, 0.15), 0.05);
          ADD(min(seats, min(steerRing, min(column, dash))), 2.0);

          // 5. Painted Body (ID 1.0)
          float bedExt = sdRoundBox(p - vec3(0.0, 0.65, 1.0), vec3(0.75, 0.25, 0.8), 0.05);
          float bedInt = sdRoundBox(p - vec3(0.0, 0.75, 1.0), vec3(0.65, 0.25, 0.75), 0.02);
          float bed = max(bedExt, -bedInt);

          // Front Engine Bay
          float ffender = sdRoundBox(p - vec3(0.0, 0.6, -1.4), vec3(0.75, 0.2, 0.5), 0.05);
          float bayCut = sdBox(p - vec3(0.0, 0.7, -1.4), vec3(0.6, 0.3, 0.45));
          ffender = max(ffender, -bayCut);

          // Wheel Well Cuts
          float fenderCut = sdCylY(pw.yxz - vec3(0.4, 0.75, 0.0), 0.4, 0.45); 
          ffender = max(ffender, -fenderCut);
          bed = max(bed, -fenderCut);

          // Cabin Shell
          float cabLower = sdRoundBox(p - vec3(0.0, 0.6, 0.0), vec3(0.75, 0.3, 0.2), 0.05);
          float cabHollow = sdBox(p - vec3(0.0, 0.7, 0.0), vec3(0.65, 0.3, 0.3));
          cabLower = max(cabLower, -cabHollow);

          // Cabin Back
          float cabBack = sdBox(p - vec3(0.0, 1.1, 0.15), vec3(0.75, 0.4, 0.05));
          float cabWinHole = sdBox(p - vec3(0.0, 1.15, 0.15), vec3(0.6, 0.2, 0.1));
          cabBack = max(cabBack, -cabWinHole);

          float cabRoof = sdRoundBox(p - vec3(0.0, 1.5, -0.35), vec3(0.75, 0.05, 0.5), 0.05);
          
          // Windshield Pillar
          vec3 pPillar = p - vec3(0.0, 1.22, -0.85);
          pPillar.yz *= rot(0.75);
          float pillar = sdBox(pPillar, vec3(0.75, 0.35, 0.05));
          float winHole = sdBox(pPillar, vec3(0.65, 0.3, 0.1));
          pillar = max(pillar, -winHole);

          float windshield = sdBox(pPillar, vec3(0.65, 0.3, 0.01));
          float backGlass = sdBox(p - vec3(0.0, 1.15, 0.15), vec3(0.6, 0.2, 0.01));

          float body = min(bed, min(ffender, min(cabLower, min(cabBack, min(cabRoof, pillar)))));

          // --- ANIMATED HOOD ---
          vec3 pHood = p;
          pHood -= vec3(0.0, 0.85, -0.9);
          pHood.yz *= rot(-hoodAngle);
          pHood += vec3(0.0, 0.85, -0.9);
          float hood = sdRoundBox(pHood - vec3(0.0, 0.85, -1.45), vec3(0.72, 0.02, 0.45), 0.03);

          // --- ANIMATED RIGHT DOOR ---
          vec3 pRDoor = p;
          pRDoor -= vec3(0.75, 0.0, -0.85);
          pRDoor.xz *= rot(doorAngle);
          pRDoor += vec3(0.75, 0.0, -0.85);
          float rDoor = sdRoundBox(pRDoor - vec3(0.75, 0.95, -0.35), vec3(0.02, 0.45, 0.45), 0.03);
          float rWin = sdBox(pRDoor - vec3(0.75, 1.25, -0.35), vec3(0.1, 0.2, 0.4));
          rDoor = max(rDoor, -rWin);

          // --- ANIMATED LEFT DOOR ---
          vec3 pLDoor = p;
          pLDoor -= vec3(-0.75, 0.0, -0.85);
          pLDoor.xz *= rot(-doorAngle);
          pLDoor += vec3(-0.75, 0.0, -0.85);
          float lDoor = sdRoundBox(pLDoor - vec3(-0.75, 0.95, -0.35), vec3(0.02, 0.45, 0.45), 0.03);
          float lWin = sdBox(pLDoor - vec3(-0.75, 1.25, -0.35), vec3(0.1, 0.2, 0.4));
          lDoor = max(lDoor, -lWin);

          body = min(body, min(hood, min(lDoor, rDoor)));
          ADD(body, 1.0); // Paint material
          ADD(min(windshield, backGlass), 5.0); // Glass material
          
          // 6. Lights (ID 6.0 = Headlights, ID 7.0 = Taillights)
          vec3 pl = p; pl.x = abs(pl.x);
          float headlights = sdCylY((pl - vec3(0.55, 0.65, -1.95)).xzy, 0.05, 0.15);
          float taillights = sdBox(pl - vec3(0.65, 0.65, 1.85), vec3(0.15, 0.1, 0.05));
          ADD(headlights, 6.0);
          ADD(taillights, 7.0);

          return res;
      }

      vec2 map(vec3 p) {
          return sdTruck(p);
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
          // Bounding box dimensions: x:[-1.2, 1.2], y:[0.0, 2.5], z:[-2.3, 2.3]
          float hit_box = hitBox(ro, rd, vec3(-1.2, 0.0, -2.3), vec3(1.2, 2.5, 2.3), tN, tF);
          
          if (hit_box < 0.5) {
              discard;
          }
          
          // Start raymarching at the entry point of the box
          float t = max(0.0, tN);
          float id = 0.0;
          bool hit = false;
          
          // Raymarch only within the box
          for(int i = 0; i < 100; i++) {
              vec3 p = ro + rd * t;
              vec2 res = map(p);
              
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
          
          vec2 e = vec2(0.001, 0.0);
          vec3 localN = normalize(vec3(
              map(localP+e.xyy).x - map(localP-e.xyy).x,
              map(localP+e.yxy).x - map(localP-e.yxy).x,
              map(localP+e.yyx).x - map(localP-e.yyx).x
          ));
          
          // Transform normal & position to world space
          vec3 worldN = normalize(vec3(modelMatrix * vec4(localN, 0.0)));
          vec3 worldPos = (modelMatrix * vec4(localP, 1.0)).xyz;
          vec3 worldV = normalize(worldPos - cameraPosition);
          
          // Lighting setup
          vec3 l = normalize(vec3(1.0, 2.0, -1.5)); // Key light
          vec3 l2 = normalize(vec3(-1.0, 0.5, 1.0)); // Fill light
          
          float dif = clamp(dot(worldN, l), 0.0, 1.0);
          float dif2 = clamp(dot(worldN, l2), 0.0, 1.0) * 0.3;
          float amb = 0.2 + 0.1 * worldN.y;
          
          vec3 viewDir = normalize(cameraPosition - worldPos);
          vec3 halfVector = normalize(l + viewDir);

          vec3 col = vec3(0.0);

          if(id < 1.5) {
              // Painted Body (Arctic Camo)
              vec3 baseColor = arcticCamo(localP);
              float spec = pow(max(dot(worldN, halfVector), 0.0), 32.0);
              col = baseColor * (amb + dif + dif2) + spec * 0.4;
          }
          else if(id < 2.5) {
              // Dark Metal & Interior
              col = vec3(0.15) * (amb + dif + dif2);
          }
          else if(id < 3.5) {
              // Tires (Rubber)
              col = vec3(0.04) * (amb + dif + dif2);
          }
          else if(id < 4.5) {
              // Rims (Chrome/Silver)
              vec3 baseColor = vec3(0.7);
              float spec = pow(max(dot(worldN, halfVector), 0.0), 32.0);
              col = baseColor * (amb + dif + dif2) + spec * 0.8;
          }
          else if(id < 5.5) {
              // Glass (Windshield)
              vec3 baseColor = vec3(0.02, 0.05, 0.1);
              float spec = pow(max(dot(worldN, halfVector), 0.0), 128.0);
              float reflection = pow(1.0 - clamp(dot(worldN, viewDir), 0.0, 1.0), 3.0);
              col = baseColor * (amb + dif) + spec * 1.5 + reflection * vec3(0.3, 0.5, 0.7);
          }
          else if(id < 6.5) {
              // Headlights
              col = vec3(1.0, 0.9, 0.7) * 1.5;
          }
          else {
              // Taillights
              col = vec3(1.0, 0.1, 0.0) * 1.5;
          }

          // Fog fade out in distance
          float distanceToCam = length(worldPos - cameraPosition);
          float fog = 1.0 - exp(-0.0001 * distanceToCam * distanceToCam);
          col = mix(col, vec3(0.0), fog);

          col = pow(col, vec3(1.0/2.2));
          gl_FragColor = vec4(col, 1.0);
          
          #ifdef GL_EXT_frag_depth
              vec4 clipPos = projectionMatrix * viewMatrix * vec4(worldPos, 1.0);
              gl_FragDepthEXT = (clipPos.z / clipPos.w) * 0.5 + 0.5;
          #endif
      }
    `;

    // Create custom ShaderMaterial
    const shaderMat = new THREE.ShaderMaterial({
      uniforms: {
        inverseModelMatrix: { value: new THREE.Matrix4() },
        modelMatrix: { value: new THREE.Matrix4() },
        projectionMatrix: { value: new THREE.Matrix4() },
        viewMatrix: { value: new THREE.Matrix4() },
        iTime: { value: 0 },
        cameraPosition: { value: new THREE.Vector3() }
      },
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      transparent: true,
      depthWrite: true,
      depthTest: true
    });

    // Bounding Box Geometry enclosing the truck's SDF volume
    const boundingGeo = new THREE.BoxGeometry(2.4, 2.5, 4.6);
    
    // Position center of box geometry to enclose Y height properly (0.0 to 2.5)
    boundingGeo.translate(0, 1.25, 0);

    const truckMesh = new THREE.Mesh(boundingGeo, shaderMat);

    // Keep track of the uniforms on beforeRender update callback
    truckMesh.onBeforeRender = function(renderer, scene, camera, geometry, material) {
      if (material.uniforms) {
        material.uniforms.inverseModelMatrix.value.copy(truckMesh.matrixWorld).invert();
        material.uniforms.modelMatrix.value.copy(truckMesh.matrixWorld);
        material.uniforms.projectionMatrix.value.copy(camera.projectionMatrix);
        material.uniforms.viewMatrix.value.copy(camera.matrixWorldInverse);
        material.uniforms.cameraPosition.value.copy(camera.position);
        material.uniforms.iTime.value = (performance.now() * 0.001);
      }
    };

    // Return the single group containing the raymarched mesh, headlights, spotlight etc.
    const truckGroup = new THREE.Group();
    truckGroup.add(truckMesh);

    // Spotlight forward
    const spotL = new THREE.SpotLight(0xffffff, 3.0, 25.0, Math.PI / 4, 0.5, 1.0);
    spotL.position.set(0.6, 0.9, -1.91);
    const targetL = new THREE.Object3D();
    targetL.position.set(0.6, 0.9, -10.0);
    truckGroup.add(targetL);
    spotL.target = targetL;
    truckGroup.add(spotL);

    const spotR = new THREE.SpotLight(0xffffff, 3.0, 25.0, Math.PI / 4, 0.5, 1.0);
    spotR.position.set(-0.6, 0.9, -1.91);
    const targetR = new THREE.Object3D();
    targetR.position.set(-0.6, 0.9, -10.0);
    truckGroup.add(targetR);
    spotR.target = targetR;
    truckGroup.add(spotR);

    // Apply shadow properties
    truckGroup.traverse(child => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    return truckGroup;
  }

  function spawnTruck() {
    try {
      if (!window.scene || !window.player) { console.warn('[Truck] scene or player not ready'); return; }
      
      // Remove old truck if existing
      if (truckState.truckObject) {
        window.scene.remove(truckState.truckObject);
      }

      const t = createProceduralTruck();
      const p = window.player.position;
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(window.player.quaternion);
      
      // Spawn truck 4 units in front of the player
      const spawnX = p.x + forward.x * 4.0;
      const spawnZ = p.z + forward.z * 4.0;
      
      let y = p.y;
      if (window.TerrainGen && typeof window.TerrainGen.getMeshHeight === 'function') {
        y = window.TerrainGen.getMeshHeight(spawnX, spawnZ);
      }
      
      t.position.set(spawnX, y, spawnZ);
      t.rotation.y = window.player.rotation.y;
      window.scene.add(t);
      truckState.truckObject = t;
      console.log('[Truck] Cyber-Truck spawned at', spawnX, spawnZ);
      if (window.NeuralConsole) window.NeuralConsole.log('CYBER_TRUCK_SPAWNED_NEARBY', 'sys');
    } catch (e) {
      console.error('[Truck] Failed to spawn truck:', e);
    }
  }

  function enterTruck() {
    try {
      if (!window.player || !truckState.truckObject) return;

      const dist = window.player.position.distanceTo(truckState.truckObject.position);
      if (dist > 4.5) {
        if (window.NeuralConsole) window.NeuralConsole.log('TOO_FAR_FROM_TRUCK_TO_ENTER', 'err');
        return;
      }

      truckState.prevCamera = window.activeCamera;
      truckState.isDriving = true;
      window.player.speedMultiplier = 0.0;
      
      // Fully hide player mesh and arms/weapons
      window.player.visible = false;
      window.player.traverse(child => {
        if (child.isMesh) child.visible = false;
      });
      if (window.fpsViewmodel) {
        window.fpsViewmodel.visible = false;
      }

      // Hide mobile joysticks and crosshair/guns UI if necessary
      const hudElements = ['crosshair', 'joystick-left-zone', 'joystick-right-zone'];
      hudElements.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.opacity = '0';
      });

      truckState.speed = 0;

      // Initialize truck camera view and swap it
      if (window.TruckView) {
        window.TruckView.initCamera();
        window.activeCamera = window.TruckView.camera;
        window.activeCamera.position.copy(truckState.truckObject.position).add(new THREE.Vector3(0, 3.8, 7.5));
      }

      if (window.NeuralConsole) window.NeuralConsole.log('ENTERED_TRUCK_DRIVE_WASD', 'sys');
    } catch (e) {
      console.error('[Truck] Failed to enter truck:', e);
    }
  }

  function exitTruck() {
    try {
      if (!window.player) return;

      truckState.isDriving = false;
      window.player.speedMultiplier = 1.0;
      
      // Restore player and weapon visibility based on view mode
      window.player.visible = !window.isFPSMode;
      window.player.traverse(child => {
        if (child.isMesh) {
          child.visible = !window.isFPSMode;
        }
      });
      if (window.fpsViewmodel) {
        window.fpsViewmodel.visible = window.isFPSMode;
      }

      // Restore UI elements
      const hudElements = ['crosshair', 'joystick-left-zone', 'joystick-right-zone'];
      hudElements.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.opacity = '1';
      });

      // Restore camera
      window.activeCamera = truckState.prevCamera || (window.isFPSMode ? window.cameraFPS : window.cameraIso);

      // Reposition player slightly to the side
      if (truckState.truckObject) {
        const sideVec = new THREE.Vector3(1.5, 0.2, 0.0).applyQuaternion(truckState.truckObject.quaternion);
        window.player.position.copy(truckState.truckObject.position).add(sideVec);
      }

      if (window.NeuralConsole) window.NeuralConsole.log('EXITED_TRUCK', 'sys');
    } catch (e) {
      console.error('[Truck] Failed to exit truck:', e);
    }
  }

  function toggleTruckDriving() {
    if (truckState.isDriving) {
      exitTruck();
    } else {
      enterTruck();
    }
  }

  function update(dt) {
    if (isNaN(dt) || dt <= 0) dt = 0.016;
    if (!truckState.truckObject) return;

    // If driving, run physics and update driving camera
    if (truckState.isDriving) {
      const keys = window.keys;
      if (!keys) return;

      try {
        // Acceleration & Braking (W / S)
        if (keys.w) {
          truckState.speed = Math.min(truckState.maxSpeed, truckState.speed + truckState.accel * dt);
        } else if (keys.s) {
          truckState.speed = Math.max(-truckState.maxSpeed * 0.5, truckState.speed - truckState.decel * dt);
        } else {
          // Friction Decel
          if (truckState.speed > 0) {
            truckState.speed = Math.max(0, truckState.speed - truckState.friction * dt);
          } else if (truckState.speed < 0) {
            truckState.speed = Math.min(0, truckState.speed + truckState.friction * dt);
          }
        }

        // Steering (A / D)
        if (Math.abs(truckState.speed) > 0.1) {
          const dirSign = truckState.speed > 0 ? 1.0 : -1.0;
          if (keys.a) {
            truckState.truckObject.rotation.y += truckState.turnSpeed * dt * dirSign;
          }
          if (keys.d) {
            truckState.truckObject.rotation.y -= truckState.turnSpeed * dt * dirSign;
          }
        }

        // Apply displacement
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(truckState.truckObject.quaternion);
        truckState.truckObject.position.addScaledVector(forward, truckState.speed * dt);

        // Keep aligned to terrain height
        if (window.TerrainGen && typeof window.TerrainGen.getMeshHeight === 'function') {
          const th = window.TerrainGen.getMeshHeight(truckState.truckObject.position.x, truckState.truckObject.position.z);
          truckState.truckObject.position.y = th;
        }

        // Sync player position & yaw to the cab
        if (window.player) {
          window.player.position.copy(truckState.truckObject.position);
          window.player.position.y += 0.8; // Lift camera inside cab height
          window.player.rotation.y = truckState.truckObject.rotation.y;
          window.player.speedMultiplier = 0.0; // Block walking
        }

        // Update the driving camera view
        if (window.TruckView) {
          window.TruckView.updateCamera(dt, truckState.truckObject);
        }
      } catch (err) {
        console.error('[Truck] Update error during driving:', err);
      }
    }
  }

  // Key listener (M spawns, - enters/exits)
  window.addEventListener('keydown', e => {
    if (window.playerHealth <= 0 || window.isPaused) return;

    if (e.key && e.key.toLowerCase() === 'm') {
      spawnTruck();
    } else if (e.key === '-' || e.key === '_') {
      toggleTruckDriving();
    }
  });

  // Export module API
  window.Truck = {
    spawnTruck,
    enterTruck,
    exitTruck,
    toggleTruckDriving,
    update,
    state: truckState
  };

  console.log('[Truck] Drivable Cyber-Truck module loaded');
})();
