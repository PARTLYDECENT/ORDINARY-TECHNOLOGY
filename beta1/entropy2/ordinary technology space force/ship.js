/**
 * ship.js
 * Manages the construction of the player ship with premium modular components and kinetic animations.
 */

function createPlayerShip(scene) {
    const shipGroup = new THREE.Group();
    shipGroup.position.set(0, 0, -10);
    
    // --- ADVANCED MATERIALS ---
    const hullMat = new THREE.MeshStandardMaterial({ 
        color: 0x1a1a2e, 
        metalness: 1.0, 
        roughness: 0.2,
        emissive: 0x001122,
        emissiveIntensity: 0.5
    });

    const energyMat = new THREE.MeshStandardMaterial({ 
        color: 0x00ccff, 
        emissive: 0x0088ff,
        emissiveIntensity: 2.0,
        transparent: true,
        opacity: 0.9
    });

    const glassMat = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        metalness: 0.1,
        roughness: 0.05,
        transmission: 0.9,
        thickness: 0.5,
        transparent: true,
        opacity: 0.4
    });

    const frameMat = new THREE.MeshStandardMaterial({
        color: 0x444444,
        metalness: 0.9,
        roughness: 0.1
    });

    // --- 1. MAIN CHASSIS (Core Core) ---
    const mainHull = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.4, 3.5), hullMat);
    shipGroup.add(mainHull);

    // Fusion Core (Internal glow)
    const coreGeo = new THREE.IcosahedronGeometry(0.4, 2);
    const core = new THREE.Mesh(coreGeo, energyMat);
    core.position.set(0, 0, 0.5);
    shipGroup.add(core);

    // --- 2. MAGNETIC WINGS ---
    const wingGroupL = new THREE.Group();
    const wingGroupR = new THREE.Group();

    const wingGeo = new THREE.BoxGeometry(1.5, 0.05, 1.8);
    // Taper the wings slightly
    const wingPos = wingGeo.attributes.position;
    for(let i=0; i<wingPos.count; i++) {
        if(wingPos.getZ(i) < 0) {
            wingPos.setX(i, wingPos.getX(i) * 0.5);
        }
    }
    
    const leftWing = new THREE.Mesh(wingGeo, hullMat);
    leftWing.position.set(-1.2, 0, 0);
    wingGroupL.add(leftWing);

    const rightWing = new THREE.Mesh(wingGeo, hullMat);
    rightWing.position.set(1.2, 0, 0);
    wingGroupR.add(rightWing);

    // Wing Fins (Energy highlights)
    const finGeo = new THREE.BoxGeometry(0.1, 0.1, 2.0);
    const leftFin = new THREE.Mesh(finGeo, energyMat);
    leftFin.position.set(-1.8, 0.05, 0);
    wingGroupL.add(leftFin);

    const rightFin = new THREE.Mesh(finGeo, energyMat);
    rightFin.position.set(1.8, 0.05, 0);
    wingGroupR.add(rightFin);

    shipGroup.add(wingGroupL);
    shipGroup.add(wingGroupR);

    // Store wing groups for animation
    shipGroup.userData.wings = { left: wingGroupL, right: wingGroupR };

    // --- 3. COCKPIT CANOPY ---
    const canopyGeo = new THREE.BoxGeometry(0.8, 0.5, 2.0);
    const canopy = new THREE.Mesh(canopyGeo, glassMat);
    canopy.position.set(0, 0.35, -0.6);
    shipGroup.add(canopy);

    const canopyFrame = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.55, 2.0), frameMat);
    canopyFrame.position.copy(canopy.position);
    canopyFrame.scale.set(1.05, 1.05, 0.1); // Back frame
    canopyFrame.position.z += 1.0;
    shipGroup.add(canopyFrame);

    // Internal "Seat"
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.4), hullMat);
    seat.position.set(0, 0.2, -0.2);
    shipGroup.add(seat);

    // --- 4. CANNON PODS ---
    const podGeo = new THREE.CylinderGeometry(0.1, 0.15, 1.2, 8);
    podGeo.rotateX(Math.PI / 2);
    
    const podPositions = [[-0.8, -0.2, -1.5], [0.8, -0.2, -1.5]];
    const pods = [];
    podPositions.forEach(pos => {
        const pod = new THREE.Mesh(podGeo, frameMat);
        pod.position.set(pos[0], pos[1], pos[2]);
        
        // Muzzle flare point
        const muzzle = new THREE.Group();
        muzzle.position.set(0, 0, -0.7);
        pod.add(muzzle);
        pod.userData.muzzle = muzzle;

        shipGroup.add(pod);
        pods.push(pod);
    });
    shipGroup.userData.pods = pods;

    // --- 5. QUAD THRUSTERS ---
    const nozzleGeo = new THREE.CylinderGeometry(0.1, 0.2, 0.5, 8);
    nozzleGeo.rotateX(Math.PI / 2);
    const thrusterPositions = [
        [-0.4, 0.1, 1.8], [0.4, 0.1, 1.8],
        [-0.4, -0.2, 1.8], [0.4, -0.2, 1.8]
    ];

    thrusterPositions.forEach(pos => {
        const n = new THREE.Mesh(nozzleGeo, frameMat);
        n.position.set(pos[0], pos[1], pos[2]);
        shipGroup.add(n);

        const l = new THREE.PointLight(0x00ccff, 1.0, 5);
        l.position.set(pos[0], pos[1], pos[2] + 0.3);
        shipGroup.add(l);
    });

    scene.add(shipGroup);
    return { group: shipGroup, hullMat, energyMat, glassMat };
}

function updateShipTransform(shipGroup, targetPos, delta, bounds) {
    // Sharp interpolation for high-speed feel
    shipGroup.position.x += (targetPos.x - shipGroup.position.x) * 10 * delta;
    shipGroup.position.y += (targetPos.y - shipGroup.position.y) * 10 * delta;
    
    // Return Z from recoil
    shipGroup.position.z += (-10 - shipGroup.position.z) * 12 * delta;

    // Movement Delta for animations
    const dx = targetPos.x - shipGroup.position.x;
    const dy = targetPos.y - shipGroup.position.y;

    // Banking
    shipGroup.rotation.z = -dx * 0.25; 
    shipGroup.rotation.x = dy * 0.2;   
    shipGroup.rotation.y = -dx * 0.15; 

    // --- KINETIC WING ANIMATION ---
    if (shipGroup.userData.wings) {
        const { left, right } = shipGroup.userData.wings;
        // Tilting wings based on banking
        left.rotation.z = dx * 0.15;
        right.rotation.z = dx * 0.15;
        
        // "Turbo" Sweep - wings pull in when moving fast forward
        const sweep = Math.abs(dx) * 0.05;
        left.rotation.y = sweep;
        right.rotation.y = -sweep;
    }

    // --- PULSE EFFECTS ---
    const time = performance.now() * 0.005;
    // Note: shipGroup.userData.energyMat might not be accessible here if not stored correctly, 
    // but we can find it in children
    shipGroup.children.forEach(child => {
        if(child.material && child.material.emissiveIntensity !== undefined) {
            // Differentiate between energy and hull
            if (child.material.emissive && child.material.emissive.b > 0.5) {
                child.material.emissiveIntensity = 2.0 + Math.sin(time * 2.0) * 1.0;
            }
        }
    });

    // Core Rotation
    const core = shipGroup.children.find(c => c.geometry.type === 'IcosahedronGeometry');
    if(core) {
        core.rotation.y += delta * 5.0;
        core.rotation.x += delta * 2.0;
    }
}
