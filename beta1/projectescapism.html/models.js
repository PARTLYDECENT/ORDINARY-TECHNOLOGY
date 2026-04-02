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
        const trunk = new THREE.CylinderGeometry(0.15, 0.2, 1.0, 8);
        trunk.translate(0, 0.5, 0);
        components.push(trunk);

        const foliage1 = new THREE.SphereGeometry(0.6, 8, 8);
        foliage1.translate(0, 1.2, 0);
        components.push(foliage1);

        const foliage2 = new THREE.SphereGeometry(0.45, 8, 8);
        foliage2.translate(0, 1.8, 0);
        components.push(foliage2);

        this.treeGeometry = this._safeMerge(components);
        return this.treeGeometry;
    },

    // --- PLAYER: Athletic, bio-armor-plated humanoid with Chest Core ---
    _createPlayerGeo: function() {
        if (!THREE.BufferGeometryUtils) return new THREE.BoxGeometry(0.8, 1.8, 0.8);
        const parts = [];

        // Head — slightly larger, more heroic, with "visor" detail
        const head = new THREE.SphereGeometry(0.22, 12, 12);
        head.translate(0, 1.72, 0.02);
        parts.push(head);
        
        const visor = new THREE.BoxGeometry(0.3, 0.08, 0.1);
        visor.translate(0, 1.75, 0.18);
        parts.push(visor);

        // Neck
        const neck = new THREE.CylinderGeometry(0.08, 0.10, 0.12, 8);
        neck.translate(0, 1.54, 0);
        parts.push(neck);

        // Upper torso (chest) — broad shoulders, armored plates
        const chest = new THREE.BoxGeometry(0.62, 0.40, 0.32);
        chest.translate(0, 1.30, 0);
        parts.push(chest);
        
        // --- CHEST CORE (The Pulse Source) ---
        // A circular inset in the chest that will glow in the shader
        const core = new THREE.CylinderGeometry(0.12, 0.12, 0.05, 12);
        core.rotateX(Math.PI / 2);
        core.translate(0, 1.32, 0.15);
        parts.push(core);

        // Lower torso (waist) — tapers down
        const waist = new THREE.BoxGeometry(0.42, 0.25, 0.24);
        waist.translate(0, 1.00, 0);
        parts.push(waist);

        // Hip / pelvis region
        const hips = new THREE.BoxGeometry(0.46, 0.16, 0.28);
        hips.translate(0, 0.82, 0);
        parts.push(hips);

        // -- SHOULDERS (Armored) --
        const shoulderL = new THREE.SphereGeometry(0.12, 8, 8);
        shoulderL.scale(1.1, 1.0, 1.1);
        shoulderL.translate(-0.35, 1.42, 0);
        parts.push(shoulderL);
        const shoulderR = new THREE.SphereGeometry(0.12, 8, 8);
        shoulderR.scale(1.1, 1.0, 1.1);
        shoulderR.translate(0.35, 1.42, 0);
        parts.push(shoulderR);

        // -- UPPER ARMS --
        const upperArmL = new THREE.CylinderGeometry(0.08, 0.07, 0.32, 8);
        upperArmL.translate(-0.38, 1.22, 0);
        parts.push(upperArmL);
        const upperArmR = new THREE.CylinderGeometry(0.08, 0.07, 0.32, 8);
        upperArmR.translate(0.38, 1.22, 0);
        parts.push(upperArmR);

        // -- LOWER ARMS (forearms) --
        const forearmL = new THREE.CylinderGeometry(0.06, 0.055, 0.30, 8);
        forearmL.translate(-0.38, 0.92, 0);
        parts.push(forearmL);
        const forearmR = new THREE.CylinderGeometry(0.06, 0.055, 0.30, 8);
        forearmR.translate(0.38, 0.92, 0);
        parts.push(forearmR);

        // -- HANDS --
        const handL = new THREE.SphereGeometry(0.06, 6, 6);
        handL.translate(-0.38, 0.76, 0);
        parts.push(handL);
        const handR = new THREE.SphereGeometry(0.06, 6, 6);
        handR.translate(0.38, 0.76, 0);
        parts.push(handR);

        // -- UPPER LEGS (Armored Thighs) --
        const thighL = new THREE.CylinderGeometry(0.11, 0.09, 0.38, 8);
        thighL.translate(-0.15, 0.56, 0);
        parts.push(thighL);
        const thighR = new THREE.CylinderGeometry(0.11, 0.09, 0.38, 8);
        thighR.translate(0.15, 0.56, 0);
        parts.push(thighR);

        // -- LOWER LEGS (Armored Shins) --
        const shinL = new THREE.CylinderGeometry(0.08, 0.07, 0.36, 8);
        shinL.translate(-0.15, 0.22, 0);
        parts.push(shinL);
        const shinR = new THREE.CylinderGeometry(0.08, 0.07, 0.36, 8);
        shinR.translate(0.15, 0.22, 0);
        parts.push(shinR);

        // -- FEET --
        const footL = new THREE.BoxGeometry(0.12, 0.07, 0.20);
        footL.translate(-0.15, 0.03, 0.03);
        parts.push(footL);
        const footR = new THREE.BoxGeometry(0.12, 0.07, 0.20);
        footR.translate(0.15, 0.03, 0.03);
        parts.push(footR);

        // -- BACKPACK (Enhanced tactical unit) --
        const backpackBase = new THREE.BoxGeometry(0.32, 0.35, 0.16);
        backpackBase.translate(0, 1.25, -0.22);
        parts.push(backpackBase);
        const backpackAntenna = new THREE.CylinderGeometry(0.01, 0.01, 0.2, 4);
        backpackAntenna.translate(0.1, 1.5, -0.25);
        parts.push(backpackAntenna);

        const finalGeo = this._safeMerge(parts);
        return finalGeo;
    },

    // --- ZOMBIE: Jagged, asymmetrical, viral-ridden horror ---
    _createZombieGeo: function() {
        if (!THREE.BufferGeometryUtils) return new THREE.BoxGeometry(0.8, 1.6, 0.8);
        const parts = [];

        // Head — fractured, tilted
        const head = new THREE.SphereGeometry(0.20, 10, 10);
        head.scale(0.9, 1.1, 0.95);
        head.rotateZ(0.2); 
        head.translate(0.05, 1.54, 0.1);
        parts.push(head);

        // Neck — bent further
        const neck = new THREE.CylinderGeometry(0.08, 0.12, 0.12, 6);
        neck.rotateX(0.4);
        neck.translate(0, 1.40, 0.05);
        parts.push(neck);

        // Upper torso — asymmetrical hunched chest
        const chest = new THREE.BoxGeometry(0.55, 0.36, 0.34);
        chest.rotateX(0.2);
        chest.rotateZ(0.05);
        chest.translate(0, 1.18, 0.04);
        parts.push(chest);
        
        // Viral growth on shoulder
        const cyst = new THREE.SphereGeometry(0.12, 6, 6);
        cyst.scale(1.2, 0.8, 1.0);
        cyst.translate(-0.25, 1.35, 0.05);
        parts.push(cyst);

        // Lower torso
        const waist = new THREE.BoxGeometry(0.38, 0.24, 0.26);
        waist.translate(0, 0.92, 0.02);
        parts.push(waist);

        // Hips
        const hips = new THREE.BoxGeometry(0.48, 0.14, 0.28);
        hips.translate(0, 0.78, 0.01);
        parts.push(hips);

        // -- SHOULDERS (Mismatched heights) --
        const shoulderL = new THREE.SphereGeometry(0.12, 8, 8);
        shoulderL.translate(-0.34, 1.28, 0.04);
        parts.push(shoulderL);
        const shoulderR = new THREE.SphereGeometry(0.10, 8, 8);
        shoulderR.translate(0.32, 1.36, 0.02);
        parts.push(shoulderR);

        // -- ARMS (Broken & reaching) --
        const upperArmL = new THREE.CylinderGeometry(0.06, 0.07, 0.32, 6);
        upperArmL.rotateZ(0.3);
        upperArmL.translate(-0.4, 1.05, 0.06);
        parts.push(upperArmL);
        
        const forearmL = new THREE.CylinderGeometry(0.05, 0.04, 0.30, 6);
        forearmL.rotateX(-0.6);
        forearmL.translate(-0.42, 0.82, 0.15);
        parts.push(forearmL);

        const upperArmR = new THREE.CylinderGeometry(0.06, 0.06, 0.28, 6);
        upperArmR.rotateX(-0.3);
        upperArmR.translate(0.34, 1.15, 0.08);
        parts.push(upperArmR);
        
        const forearmR = new THREE.CylinderGeometry(0.05, 0.04, 0.32, 6);
        forearmR.rotateX(-0.8);
        forearmR.translate(0.36, 0.95, 0.25);
        parts.push(forearmR);

        // Hands (Sharp silhouettes)
        const handL = new THREE.BoxGeometry(0.06, 0.04, 0.15);
        handL.translate(-0.44, 0.68, 0.28);
        parts.push(handL);
        const handR = new THREE.BoxGeometry(0.06, 0.04, 0.15);
        handR.translate(0.38, 0.78, 0.40);
        parts.push(handR);

        // -- LEGS (Uneven Limp) --
        const thighL = new THREE.CylinderGeometry(0.09, 0.08, 0.34, 6);
        thighL.rotateZ(0.05);
        thighL.translate(-0.16, 0.54, 0.02);
        parts.push(thighL);
        const thighR = new THREE.CylinderGeometry(0.10, 0.08, 0.34, 6);
        thighR.translate(0.14, 0.54, 0);
        parts.push(thighR);

        const shinL = new THREE.CylinderGeometry(0.07, 0.06, 0.32, 6);
        shinL.rotateX(0.15);
        shinL.translate(-0.16, 0.22, 0.05);
        parts.push(shinL);
        const shinR = new THREE.CylinderGeometry(0.07, 0.06, 0.32, 6);
        shinR.rotateX(0.1);
        shinR.translate(0.14, 0.22, 0.03);
        parts.push(shinR);

        // Feet
        const footL = new THREE.BoxGeometry(0.11, 0.05, 0.22);
        footL.translate(-0.16, 0.03, 0.08);
        parts.push(footL);
        const footR = new THREE.BoxGeometry(0.11, 0.05, 0.22);
        footR.translate(0.14, 0.03, 0.06);
        parts.push(footR);

        const finalGeo = this._safeMerge(parts);
        return finalGeo;
    },

    // --- PUKER: Bloated belly, slouched posture ---
    _createPukerGeo: function() {
        if (!THREE.BufferGeometryUtils) return new THREE.BoxGeometry(0.9, 1.5, 0.9);
        const parts = [];

        // Head — slouched forward
        const head = new THREE.SphereGeometry(0.22, 10, 10);
        head.scale(0.9, 1.0, 0.95);
        head.rotateX(0.4); 
        head.translate(0.0, 1.4, 0.25);
        parts.push(head);

        // Neck
        const neck = new THREE.CylinderGeometry(0.12, 0.14, 0.15, 6);
        neck.rotateX(0.6);
        neck.translate(0, 1.25, 0.12);
        parts.push(neck);

        // Upper torso & Bloated Belly
        const chest = new THREE.SphereGeometry(0.35, 10, 10);
        chest.scale(1.0, 1.2, 1.3);
        chest.rotateX(0.2);
        chest.translate(0, 0.95, 0.15);
        parts.push(chest);
        
        // Lower torso / Hips
        const hips = new THREE.BoxGeometry(0.55, 0.2, 0.35);
        hips.translate(0, 0.65, 0.05);
        parts.push(hips);

        // Shoulders
        const shoulderL = new THREE.SphereGeometry(0.14, 8, 8);
        shoulderL.translate(-0.35, 1.15, 0.1);
        parts.push(shoulderL);
        const shoulderR = new THREE.SphereGeometry(0.14, 8, 8);
        shoulderR.translate(0.35, 1.15, 0.1);
        parts.push(shoulderR);

        // Arms (stubby/fat)
        const upperArmL = new THREE.CylinderGeometry(0.09, 0.08, 0.28, 6);
        upperArmL.rotateZ(0.2);
        upperArmL.translate(-0.4, 0.95, 0.15);
        parts.push(upperArmL);
        
        const forearmL = new THREE.CylinderGeometry(0.08, 0.06, 0.25, 6);
        forearmL.rotateX(-0.5);
        forearmL.translate(-0.45, 0.75, 0.25);
        parts.push(forearmL);

        const upperArmR = new THREE.CylinderGeometry(0.09, 0.08, 0.28, 6);
        upperArmR.rotateZ(-0.2);
        upperArmR.translate(0.4, 0.95, 0.15);
        parts.push(upperArmR);
        
        const forearmR = new THREE.CylinderGeometry(0.08, 0.06, 0.25, 6);
        forearmR.rotateX(-0.5);
        forearmR.translate(0.45, 0.75, 0.25);
        parts.push(forearmR);

        // Legs (Sturdy to support weight)
        const thighL = new THREE.CylinderGeometry(0.14, 0.12, 0.35, 6);
        thighL.translate(-0.18, 0.45, 0.05);
        parts.push(thighL);
        const thighR = new THREE.CylinderGeometry(0.14, 0.12, 0.35, 6);
        thighR.translate(0.18, 0.45, 0.05);
        parts.push(thighR);

        const shinL = new THREE.CylinderGeometry(0.09, 0.08, 0.3, 6);
        shinL.rotateX(0.1);
        shinL.translate(-0.18, 0.15, 0.1);
        parts.push(shinL);
        const shinR = new THREE.CylinderGeometry(0.09, 0.08, 0.3, 6);
        shinR.rotateX(0.1);
        shinR.translate(0.18, 0.15, 0.1);
        parts.push(shinR);

        // Feet
        const footL = new THREE.BoxGeometry(0.14, 0.06, 0.24);
        footL.translate(-0.18, 0.03, 0.12);
        parts.push(footL);
        const footR = new THREE.BoxGeometry(0.14, 0.06, 0.24);
        footR.translate(0.18, 0.03, 0.12);
        parts.push(footR);

        return this._safeMerge(parts);
    },

    // --- THROWER: One massive, muscular arm ---
    _createThrowerGeo: function() {
        if (!THREE.BufferGeometryUtils) return new THREE.BoxGeometry(0.8, 1.7, 0.8);
        const parts = [];

        // Head
        const head = new THREE.SphereGeometry(0.18, 10, 10);
        head.scale(0.9, 1.1, 0.95);
        head.rotateZ(-0.1); 
        head.translate(-0.05, 1.6, 0.05);
        parts.push(head);

        // Core Torso
        const chest = new THREE.BoxGeometry(0.45, 0.4, 0.3);
        chest.rotateX(0.1);
        chest.translate(-0.05, 1.25, 0);
        parts.push(chest);
        
        // Huge Right Shoulder & Arm
        const shoulderR = new THREE.SphereGeometry(0.22, 10, 10);
        shoulderR.translate(0.35, 1.45, 0.05);
        parts.push(shoulderR);
        
        const upperArmR = new THREE.CylinderGeometry(0.16, 0.14, 0.45, 8);
        upperArmR.rotateZ(-0.3);
        upperArmR.translate(0.45, 1.15, 0.1);
        parts.push(upperArmR);
        
        const forearmR = new THREE.CylinderGeometry(0.14, 0.12, 0.45, 8);
        forearmR.rotateX(-0.4);
        forearmR.translate(0.55, 0.8, 0.25);
        parts.push(forearmR);
        
        const handR = new THREE.BoxGeometry(0.2, 0.15, 0.25);
        handR.translate(0.55, 0.55, 0.4);
        parts.push(handR);

        // Atrophied Left Arm
        const shoulderL = new THREE.SphereGeometry(0.08, 6, 6);
        shoulderL.translate(-0.25, 1.35, 0);
        parts.push(shoulderL);
        
        const upperArmL = new THREE.CylinderGeometry(0.04, 0.03, 0.25, 5);
        upperArmL.translate(-0.28, 1.15, 0);
        parts.push(upperArmL);

        // Waist & Hips
        const waist = new THREE.BoxGeometry(0.35, 0.2, 0.25);
        waist.translate(-0.05, 0.95, 0);
        parts.push(waist);
        
        const hips = new THREE.BoxGeometry(0.4, 0.16, 0.25);
        hips.translate(-0.05, 0.8, 0);
        parts.push(hips);

        // Base Legs
        const thighL = new THREE.CylinderGeometry(0.1, 0.08, 0.35, 6);
        thighL.rotateZ(0.1);
        thighL.translate(-0.2, 0.55, 0);
        parts.push(thighL);
        
        const thighR = new THREE.CylinderGeometry(0.12, 0.09, 0.35, 6);
        thighR.translate(0.15, 0.55, 0);
        parts.push(thighR);

        const shinL = new THREE.CylinderGeometry(0.07, 0.06, 0.35, 6);
        shinL.translate(-0.22, 0.22, 0);
        parts.push(shinL);
        
        const shinR = new THREE.CylinderGeometry(0.08, 0.07, 0.35, 6);
        shinR.translate(0.15, 0.22, 0);
        parts.push(shinR);

        // Feet
        const footL = new THREE.BoxGeometry(0.11, 0.05, 0.2);
        footL.translate(-0.22, 0.03, 0.05);
        parts.push(footL);
        const footR = new THREE.BoxGeometry(0.12, 0.05, 0.22);
        footR.translate(0.15, 0.03, 0.05);
        parts.push(footR);

        return this._safeMerge(parts);
    },

    _createProceduralItem: function() {
        if (!THREE.BufferGeometryUtils) return new THREE.BoxGeometry(0.8, 0.8, 0.8);
        const geometries = [];
        const crate = new THREE.BoxGeometry(0.6, 0.4, 0.4);
        crate.translate(0, 0.2, 0);
        geometries.push(crate);
        const strap1 = new THREE.BoxGeometry(0.65, 0.45, 0.05);
        strap1.translate(0, 0.2, 0);
        geometries.push(strap1);
        const strap2 = new THREE.BoxGeometry(0.05, 0.45, 0.45);
        strap2.translate(0, 0.2, 0);
        geometries.push(strap2);
        return this._safeMerge(geometries);
    }
};
