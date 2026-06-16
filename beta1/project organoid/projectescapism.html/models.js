// Enhanced Model Factory for Project Escapism
// High-fidelity humanoids with "Chest Core" geometry for pulsing bio-armor effects

const ModelFactory = {
    _safeMerge: function(geometries) {
        if (!THREE.BufferGeometryUtils) return geometries[0];
        const sanitized = geometries.map(g => {
            let clone = g.index ? g.toNonIndexed() : g.clone();
            if (clone.attributes.uv) clone.deleteAttribute('uv');
            return clone;
        });
        return THREE.BufferGeometryUtils.mergeBufferGeometries(sanitized);
    },
    playerModel: null,
    zombieGeometry: null,
    pukerGeometry: null,
    throwerGeometry: null,
    playerGeometry: null,
    itemGeometry: null,

    loadAll: async function() {
        this.playerGeometry = this._createPlayerGeo();
        this.zombieGeometry = this._createZombieGeo();
        this.itemGeometry = this._createProceduralItem();

        return new Promise((resolve, reject) => {
            if (!THREE.GLTFLoader) {
                console.warn("THREE.GLTFLoader missing. Using procedural models.");
                this.playerModel = new THREE.Mesh(this.playerGeometry, new THREE.MeshStandardMaterial({ color: 0xffd700 }));
                resolve();
                return;
            }

            const loader = new THREE.GLTFLoader();
            let loadedCount = 0;
            const checkDone = () => { if (loadedCount === 2) resolve(); };

            loader.load('./assets/models/player.glb', (gltf) => {
                this.playerModel = new THREE.Mesh(this.playerGeometry, new THREE.MeshStandardMaterial({ color: 0xffd700 }));
                loadedCount++;
                checkDone();
            }, undefined, (err) => {
                console.warn("Player GLB skipped. Using procedural humanoid.");
                this.playerModel = new THREE.Mesh(this.playerGeometry, new THREE.MeshStandardMaterial({ color: 0xffd700 }));
                loadedCount++;
                checkDone();
            });

            loader.load('./assets/models/zombie1.glb', (gltf) => {
                loadedCount++;
                checkDone();
            }, undefined, (err) => {
                console.warn("Zombie GLB skipped. Using procedural humanoid.");
                loadedCount++;
                checkDone();
            });
        });
    },

    getZombieGeo: function() {
        return this.zombieGeometry || (this.zombieGeometry = this._createZombieGeo());
    },

    getPukerGeo: function() {
        return this.pukerGeometry || (this.pukerGeometry = this._createPukerGeo());
    },

    getThrowerGeo: function() {
        return this.throwerGeometry || (this.throwerGeometry = this._createThrowerGeo());
    },

    getPlayerModel: function() {
        return this.playerModel ? this.playerModel.clone() : new THREE.Mesh(this._createPlayerGeo(), new THREE.MeshStandardMaterial({ color: 0xffd700 }));
    },

    getItemGeo: function() {
        return this.itemGeometry;
    },

    getTreeGeo: function() {
        if (this.treeGeometry) return this.treeGeometry;
        const components = [];
        
        // 1. MAIN TRUNK
        const trunkHeight = 1.4;
        const trunk = new THREE.CylinderGeometry(0.1, 0.18, trunkHeight, 7);
        trunk.translate(0, trunkHeight / 2, 0);
        components.push(trunk);

        // 2. SKELETAL BRANCHES
        const branchConfigs = [
            { h: 0.5, len: 0.7, angle: 0.2, tilt: 0.9 },
            { h: 0.8, len: 0.6, angle: 2.3, tilt: 1.2 },
            { h: 1.1, len: 0.5, angle: 4.5, tilt: 0.7 },
            { h: 1.3, len: 0.4, angle: 1.1, tilt: 0.5 },
            { h: 0.6, len: 0.5, angle: 3.5, tilt: 1.0 }
        ];

        branchConfigs.forEach(cfg => {
            const branch = new THREE.CylinderGeometry(0.02, 0.08, cfg.len, 5);
            branch.translate(0, cfg.len / 2, 0);
            branch.rotateX(cfg.tilt);
            branch.rotateY(cfg.angle);
            branch.translate(0, cfg.h, 0);
            components.push(branch);

            // Jagged sub-branch
            if (cfg.len > 0.4) {
                const subLen = cfg.len * 0.7;
                const sub = new THREE.CylinderGeometry(0.01, 0.04, subLen, 4);
                sub.translate(0, subLen / 2, 0);
                sub.rotateX(cfg.tilt + 0.6);
                sub.rotateY(cfg.angle + 1.8);
                
                // Position at middle of parent branch
                const px = Math.sin(cfg.angle) * Math.sin(cfg.tilt) * cfg.len * 0.6;
                const py = cfg.h + Math.cos(cfg.tilt) * cfg.len * 0.6;
                const pz = Math.cos(cfg.angle) * Math.sin(cfg.tilt) * cfg.len * 0.6;
                
                sub.translate(px, py, pz);
                components.push(sub);
            }
        });

        this.treeGeometry = this._safeMerge(components);
        return this.treeGeometry;
    },

    // --- PLAYER: ("The Titan") - High-Fidelity Tactical Unit ---
    _createPlayerGeo: function() {
        if (!THREE.BufferGeometryUtils) return new THREE.BoxGeometry(0.8, 1.8, 0.8);
        const parts = [];

        // 1. TACTICAL HEAD UNIT (Angular, not spherical)
        const headBase = new THREE.BoxGeometry(0.25, 0.22, 0.28);
        headBase.translate(0, 1.72, 0.05);
        parts.push(headBase);
        
        const visor = new THREE.BoxGeometry(0.32, 0.06, 0.08); // Wraparound Visor
        visor.translate(0, 1.75, 0.18);
        parts.push(visor);

        const crown = new THREE.CylinderGeometry(0.12, 0.14, 0.08, 6); // Armored Plate Top
        crown.rotateX(Math.PI / 2);
        crown.translate(0, 1.85, 0.05);
        parts.push(crown);

        const neck = new THREE.CylinderGeometry(0.08, 0.12, 0.14, 8);
        neck.translate(0, 1.58, 0);
        parts.push(neck);

        // 2. CHASSIS / TORSO (Aggressive V-Taper)
        // Upper Chest Broadening
        const chestMain = new THREE.BoxGeometry(0.68, 0.38, 0.36);
        chestMain.translate(0, 1.34, 0);
        parts.push(chestMain);
        
        // Pectoral Plate Overlays
        const pecL = new THREE.BoxGeometry(0.3, 0.32, 0.06);
        pecL.translate(-0.16, 1.34, 0.18);
        parts.push(pecL);
        const pecR = pecL.clone();
        pecR.translate(0.32, 0, 0);
        parts.push(pecR);

        // CHEST CORE (The Pulse Source) - Recessed
        const core = new THREE.CylinderGeometry(0.14, 0.14, 0.08, 16);
        core.rotateX(Math.PI / 2);
        core.translate(0, 1.34, 0.16);
        parts.push(core);

        // Waist / Spine (Tapered)
        const waist = new THREE.BoxGeometry(0.44, 0.22, 0.24);
        waist.translate(0, 1.05, 0);
        parts.push(waist);

        // Pelvis / Hips (Armored Flat Geometry)
        const hips = new THREE.BoxGeometry(0.50, 0.15, 0.30);
        hips.translate(0, 0.86, 0);
        parts.push(hips);
        
        const hipSideL = new THREE.BoxGeometry(0.08, 0.30, 0.25); // Side armor "skirt"
        hipSideL.rotateZ(0.15);
        hipSideL.translate(-0.28, 0.75, 0);
        parts.push(hipSideL);
        const hipSideR = hipSideL.clone();
        hipSideR.translate(0.56, 0, 0);
        parts.push(hipSideR);

        // 3. ARMS & PAULDRONS
        // Heavy Layered Pauldrons (Shoulders)
        const pauldronL = new THREE.BoxGeometry(0.24, 0.18, 0.40);
        pauldronL.rotateZ(-0.2);
        pauldronL.translate(-0.42, 1.45, 0);
        parts.push(pauldronL);
        const pauldronR = pauldronL.clone();
        pauldronR.scale(-1, 1, 1);
        pauldronR.translate(0.84, 0, 0);
        parts.push(pauldronR);

        const shoulderL = new THREE.SphereGeometry(0.12, 8, 8);
        shoulderL.translate(-0.38, 1.42, 0);
        parts.push(shoulderL);
        const shoulderR = shoulderL.clone();
        shoulderR.translate(0.76, 0, 0);
        parts.push(shoulderR);

        // Upper Arm
        const upperArmL = new THREE.CylinderGeometry(0.09, 0.08, 0.35, 8);
        upperArmL.translate(-0.42, 1.20, 0);
        parts.push(upperArmL);
        const upperArmR = upperArmL.clone();
        upperArmR.translate(0.84, 0, 0);
        parts.push(upperArmR);

        // GAUNTLETS (Forearms) - Heavily Guarded
        const gauntletL = new THREE.BoxGeometry(0.18, 0.35, 0.18);
        gauntletL.translate(-0.42, 0.88, 0.02);
        parts.push(gauntletL);
        const gauntletR = gauntletL.clone();
        gauntletR.translate(0.84, 0, 0);
        parts.push(gauntletR);

        const handL = new THREE.BoxGeometry(0.12, 0.12, 0.12);
        handL.translate(-0.42, 0.72, 0.02);
        parts.push(handL);
        const handR = handL.clone();
        handR.translate(0.84, 0, 0);
        parts.push(handR);

        // 4. LEGS & GREAVES
        // Thigh Armor
        const thighL = new THREE.CylinderGeometry(0.14, 0.12, 0.40, 8);
        thighL.translate(-0.16, 0.58, 0);
        parts.push(thighL);
        const thighR = thighL.clone();
        thighR.translate(0.32, 0, 0);
        parts.push(thighR);

        const plateThighL = new THREE.BoxGeometry(0.20, 0.35, 0.08); // Front plate
        plateThighL.translate(-0.16, 0.58, 0.14);
        parts.push(plateThighL);
        const plateThighR = plateThighL.clone();
        plateThighR.translate(0.32, 0, 0);
        parts.push(plateThighR);

        // GREAVES (Shins)
        const shinL = new THREE.BoxGeometry(0.18, 0.42, 0.18);
        shinL.translate(-0.16, 0.22, 0.02);
        parts.push(shinL);
        const shinR = shinL.clone();
        shinR.translate(0.32, 0, 0);
        parts.push(shinR);

        const shinGuardL = new THREE.BoxGeometry(0.14, 0.30, 0.06); // Angular guard
        shinGuardL.rotateX(-0.1);
        shinGuardL.translate(-0.16, 0.24, 0.12);
        parts.push(shinGuardL);
        const shinGuardR = shinGuardL.clone();
        shinGuardR.translate(0.32, 0, 0);
        parts.push(shinGuardR);

        const footL = new THREE.BoxGeometry(0.16, 0.08, 0.24);
        footL.translate(-0.16, 0.04, 0.04);
        parts.push(footL);
        const footR = footL.clone();
        footR.translate(0.32, 0, 0);
        parts.push(footR);

        // 5. TACTICAL BACKPACK (Massive sensor/power unit)
        const packMain = new THREE.BoxGeometry(0.42, 0.45, 0.22);
        packMain.translate(0, 1.28, -0.22);
        parts.push(packMain);
        
        const thrusterL = new THREE.CylinderGeometry(0.06, 0.04, 0.15, 6);
        thrusterL.translate(-0.15, 1.05, -0.28);
        parts.push(thrusterL);
        const thrusterR = thrusterL.clone();
        thrusterR.translate(0.30, 0, 0);
        parts.push(thrusterR);
        
        const antenna = new THREE.CylinderGeometry(0.01, 0.01, 0.25, 4);
        antenna.translate(0.15, 1.55, -0.25);
        parts.push(antenna);

        const finalGeo = this._safeMerge(parts);
        return finalGeo;
    },

    // --- ZOMBIE: Jagged, asymmetrical, viral-ridden horror ---
    _createZombieGeo: function() {
        if (!THREE.BufferGeometryUtils) return new THREE.BoxGeometry(0.8, 1.6, 0.8);
        const parts = [];

        // 1. FRACTURED HEAD
        const head = new THREE.SphereGeometry(0.18, 8, 8);
        head.scale(0.8, 1.1, 0.9);
        head.rotateZ(0.3); 
        head.translate(0.08, 1.55, 0.1);
        parts.push(head);
        
        const jaw = new THREE.BoxGeometry(0.15, 0.08, 0.15);
        jaw.rotateX(0.4);
        jaw.translate(0.1, 1.45, 0.2);
        parts.push(jaw);

        // 2. EXPOSED SPINE & HUNCHED TORSO
        const torsoFrame = new THREE.BoxGeometry(0.2, 0.6, 0.15);
        torsoFrame.rotateX(0.3);
        torsoFrame.translate(0, 1.2, 0);
        parts.push(torsoFrame);

        // Jagged Rib/Chest Fragments
        const chestL = new THREE.BoxGeometry(0.3, 0.25, 0.25);
        chestL.rotateZ(0.2);
        chestL.translate(-0.15, 1.25, 0.05);
        parts.push(chestL);
        const chestR = new THREE.BoxGeometry(0.25, 0.2, 0.2);
        chestR.rotateZ(-0.4);
        chestR.translate(0.15, 1.15, 0.08);
        parts.push(chestR);

        // 3. MISMATCHED ARMS (Skeletal & reaching)
        const shoulderL = new THREE.SphereGeometry(0.1, 6, 6);
        shoulderL.translate(-0.35, 1.35, 0.05);
        parts.push(shoulderL);
        
        const armL = new THREE.CylinderGeometry(0.04, 0.03, 0.6, 5);
        armL.rotateZ(0.5);
        armL.translate(-0.45, 1.1, 0.2);
        parts.push(armL);

        const shoulderR = new THREE.SphereGeometry(0.08, 6, 6);
        shoulderR.translate(0.3, 1.25, 0.02);
        parts.push(shoulderR);
        
        const armR = new THREE.CylinderGeometry(0.045, 0.035, 0.5, 5);
        armR.rotateX(-0.8);
        armR.translate(0.35, 1.0, 0.3);
        parts.push(armR);

        // 4. UNEVEN LOWER BODY
        const pelvis = new THREE.BoxGeometry(0.45, 0.12, 0.28);
        pelvis.rotateZ(-0.1);
        pelvis.translate(0, 0.85, 0);
        parts.push(pelvis);

        const thighL = new THREE.CylinderGeometry(0.08, 0.06, 0.45, 5);
        thighL.rotateZ(0.15);
        thighL.translate(-0.18, 0.55, 0);
        parts.push(thighL);
        
        const shinL = new THREE.CylinderGeometry(0.06, 0.05, 0.4, 4);
        shinL.translate(-0.25, 0.2, 0.05);
        parts.push(shinL);

        const thighR = new THREE.CylinderGeometry(0.09, 0.07, 0.4, 5);
        thighR.translate(0.15, 0.55, -0.05);
        parts.push(thighR);
        
        const shinR = new THREE.CylinderGeometry(0.07, 0.06, 0.4, 4);
        shinR.rotateX(0.2);
        shinR.translate(0.15, 0.2, 0.1);
        parts.push(shinR);

        const finalGeo = this._safeMerge(parts);
        return finalGeo;
    },

    // --- PUKER: Bloated, asymmetrical, burst terror ---
    _createPukerGeo: function() {
        if (!THREE.BufferGeometryUtils) return new THREE.BoxGeometry(0.9, 1.5, 0.9);
        const parts = [];

        // 1. BLOATED CORE
        const belly = new THREE.SphereGeometry(0.45, 8, 8);
        belly.scale(1.2, 1.0, 1.3);
        belly.translate(0, 0.8, 0.15);
        parts.push(belly);
        
        // Asymmetrical Burst Growth
        for(let i=0; i<5; i++) {
            const growth = new THREE.SphereGeometry(0.12 + Math.random()*0.08, 6, 6);
            growth.translate(-0.25 + Math.random()*0.5, 1.1 + Math.random()*0.3, 0.2);
            parts.push(growth);
        }

        // 2. SLOUCHED UPPER BODY
        const torso = new THREE.BoxGeometry(0.5, 0.4, 0.35);
        torso.rotateX(0.4);
        torso.translate(0, 1.25, -0.05);
        parts.push(torso);

        const head = new THREE.SphereGeometry(0.22, 8, 8);
        head.rotateX(0.6);
        head.translate(0, 1.45, 0.2);
        parts.push(head);

        // 3. STUBBY LIMBS
        const shoulderL = new THREE.SphereGeometry(0.15, 6, 6);
        shoulderL.translate(-0.4, 1.2, 0);
        parts.push(shoulderL);
        const armL = new THREE.CylinderGeometry(0.12, 0.08, 0.45, 5);
        armL.translate(-0.45, 0.9, 0.1);
        parts.push(armL);

        const shoulderR = new THREE.SphereGeometry(0.15, 6, 6);
        shoulderR.translate(0.4, 1.25, 0);
        parts.push(shoulderR);
        const armR = new THREE.CylinderGeometry(0.12, 0.08, 0.4, 5);
        armR.translate(0.45, 1.0, 0.1);
        parts.push(armR);

        const legL = new THREE.CylinderGeometry(0.16, 0.12, 0.6, 5);
        legL.translate(-0.2, 0.3, 0);
        parts.push(legL);
        const legR = new THREE.CylinderGeometry(0.16, 0.12, 0.6, 5);
        legR.translate(0.2, 0.3, 0);
        parts.push(legR);

        return this._safeMerge(parts);
    },

    // --- THROWER: ("The Titan Breaker") - Ultra-Asymmetrical Powerhouse ---
    _createThrowerGeo: function() {
        if (!THREE.BufferGeometryUtils) return new THREE.BoxGeometry(0.8, 1.7, 0.8);
        const parts = [];

        // 1. SMALLER, SKEWED HEAD
        const head = new THREE.SphereGeometry(0.16, 6, 6);
        head.translate(-0.1, 1.6, 0);
        parts.push(head);

        // 2. MUSCULAR, LEANING TORSO
        const torso = new THREE.BoxGeometry(0.48, 0.45, 0.35);
        torso.rotateZ(-0.15); // Leaning away from the big arm
        torso.translate(-0.1, 1.25, 0);
        parts.push(torso);

        // 3. THE TITAN BREAKER ARM (Right)
        const shoulderMassR = new THREE.SphereGeometry(0.24, 8, 8);
        shoulderMassR.translate(0.35, 1.4, 0);
        parts.push(shoulderMassR);
        
        const upperArmR = new THREE.CylinderGeometry(0.18, 0.22, 0.5, 8);
        upperArmR.rotateZ(-0.4);
        upperArmR.translate(0.5, 1.1, 0.1);
        parts.push(upperArmR);
        
        const forearmR = new THREE.CylinderGeometry(0.24, 0.20, 0.6, 8); // Massive Forearm
        forearmR.rotateX(-0.3);
        forearmR.translate(0.65, 0.7, 0.3);
        parts.push(forearmR);
        
        // SHATTERED FIST (Merged shards)
        for(let i=0; i<6; i++) {
            const shard = new THREE.BoxGeometry(0.15 + Math.random()*0.1, 0.15, 0.2);
            shard.rotateX(Math.random()*6);
            shard.translate(0.7 + (Math.random()-0.5)*0.2, 0.4 + (Math.random()-0.5)*0.2, 0.5);
            parts.push(shard);
        }

        // 4. ATROPHIED LEFT ARM
        const armL = new THREE.CylinderGeometry(0.03, 0.02, 0.4, 4);
        armL.rotateZ(0.2);
        armL.translate(-0.35, 1.25, 0);
        parts.push(armL);

        // 5. STURDY LEGS
        const thighL = new THREE.CylinderGeometry(0.12, 0.10, 0.4, 6);
        thighL.translate(-0.18, 0.55, 0);
        parts.push(thighL);
        const thighR = new THREE.CylinderGeometry(0.14, 0.11, 0.4, 6);
        thighR.translate(0.18, 0.55, 0);
        parts.push(thighR);

        const legL = new THREE.CylinderGeometry(0.08, 0.07, 0.4, 5);
        legL.translate(-0.18, 0.2, 0.05);
        parts.push(legL);
        const legR = new THREE.CylinderGeometry(0.09, 0.08, 0.4, 5);
        legR.translate(0.18, 0.2, 0.05);
        parts.push(legR);

        return this._safeMerge(parts);
    },

    // --- PROCEDURAL ITEM: Tactical Supply Crate ---
    _createProceduralItem: function() {
        if (!THREE.BufferGeometryUtils) return new THREE.BoxGeometry(0.8, 0.8, 0.8);
        const parts = [];
        
        // Base Crate
        const base = new THREE.BoxGeometry(0.6, 0.35, 0.45);
        base.translate(0, 0.175, 0);
        parts.push(base);
        
        // Corner Braces
        const corners = [
            [-0.3, 0.2, -0.22], [0.3, 0.2, -0.22], 
            [-0.3, 0.2, 0.22], [0.3, 0.2, 0.22],
            [-0.3, 0.05, -0.22], [0.3, 0.05, -0.22], 
            [-0.3, 0.05, 0.22], [0.3, 0.05, 0.22]
        ];
        corners.forEach(c => {
            const brace = new THREE.BoxGeometry(0.08, 0.08, 0.08);
            brace.translate(c[0], c[1], c[2]);
            parts.push(brace);
        });

        // Glowing Core / Latch
        const latch = new THREE.BoxGeometry(0.15, 0.08, 0.05);
        latch.translate(0, 0.25, 0.22);
        parts.push(latch);

        return this._safeMerge(parts);
    }
};
