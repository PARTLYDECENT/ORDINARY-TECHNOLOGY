/**
 * NACHT MAP MANAGER: VERTICAL CITADEL EDITION (ADVANCED PBR)
 * 10-Floor/Room unlockable vertical layout with window barricades in every zone.
 */

const NachtMapManager = (function () {

    class NachtMapManager {
        constructor(scene, config) {
            this.scene = scene;
            this.config = config;
            
            this.group = new THREE.Group();
            this.group.position.y = -2.0;
            this.group.scale.set(4, 4, 4); // Scale the entire map 4x in all directions
            this.scene.add(this.group);

            this.walls = []; // Collision bounding boxes: {minX, maxX, minZ, maxZ, minY, maxY}
            this.interactables = []; // {type, x, y, z, radius, cost, text, action}

            // Glowing cybernetic portals for vertical level transitions
            this.portals = [];
            this.portalVisualsList = [];
            this.registeredPortals = {
                'debris_r2_to_r3': [
                    { from: {x: 12, y: 0.05, z: -12}, to: {x: 12, y: 4.55, z: -9}, type: 'up', color: 0x00ffcc },
                    { from: {x: 12, y: 4.55, z: -12}, to: {x: 12, y: 0.05, z: -9}, type: 'down', color: 0xff00ff }
                ],
                'hatch_r4_to_r5': [
                    { from: {x: -12, y: 4.55, z: -12}, to: {x: -12, y: 9.05, z: -9}, type: 'up', color: 0x00ffcc },
                    { from: {x: -12, y: 9.05, z: -12}, to: {x: -12, y: 4.55, z: -9}, type: 'down', color: 0xff00ff }
                ],
                'debris_r7_to_r8': [
                    { from: {x: 12, y: 13.55, z: -12}, to: {x: 12, y: 18.05, z: -9}, type: 'up', color: 0x00ffcc },
                    { from: {x: 12, y: 18.05, z: -12}, to: {x: 12, y: 13.55, z: -9}, type: 'down', color: 0xff00ff }
                ],
                'hatch_r9_to_r10': [
                    { from: {x: -12, y: 18.05, z: -12}, to: {x: -12, y: 22.55, z: -9}, type: 'up', color: 0x00ffcc },
                    { from: {x: -12, y: 22.55, z: -12}, to: {x: -12, y: 18.05, z: -9}, type: 'down', color: 0xff00ff }
                ],
                'door_r11_to_r10': [
                    { from: {x: 0, y: 22.55, z: 8}, to: {x: 0, y: 27.05, z: 0}, type: 'up', color: 0xffff00 },
                    { from: {x: 0, y: 27.05, z: 8}, to: {x: 0, y: 22.55, z: 6}, type: 'down', color: 0xff00ff }
                ]
            };

            // Global Map Footprint Boundaries (4x larger)
            this.mapMinX = -64;
            this.mapMaxX = 64;
            this.mapMinZ = -64;
            this.mapMaxZ = 64;

            this.setupLighting();
            this.initMaterials();
            this.buildMap();

            // Mystery Box State Machine
            this.boxState = 'idle';
            this.boxTimer = 0;
            this.boxWeapon = null;
            this.boxMesh = null;
            this.boxWeaponMesh = null;
            this.boxLight = null;
        }

        setupLighting() {
            const ambient = new THREE.AmbientLight(0x0d1121, 0.25);
            this.scene.add(ambient);
            
            const dirLight = new THREE.DirectionalLight(0x1a2b4c, 0.65);
            dirLight.position.set(40, 120, 20);
            dirLight.castShadow = true;
            dirLight.shadow.mapSize.width = 2048;
            dirLight.shadow.mapSize.height = 2048;
            dirLight.shadow.bias = -0.0004;
            this.scene.add(dirLight);

            this.scene.fog = new THREE.FogExp2(0x040509, 0.018);
            this.scene.background = new THREE.Color(0x040509);
        }

        initMaterials() {
            // --- ADVANCED BRICK WALL ---
            const brickPBR = this._makePBRTexPairs(512, 512, (ctxC, ctxB, W, H) => {
                ctxC.fillStyle = '#1a1614'; ctxC.fillRect(0,0,W,H);
                ctxB.fillStyle = '#454545'; ctxB.fillRect(0,0,W,H);
                const bw = 64, bh = 28, gap = 4;
                for (let row = 0; row < H/(bh+gap); row++) {
                    const offset = (row % 2) * (bw/2);
                    for (let col = -1; col < W/(bw+gap)+1; col++) {
                        const x = col*(bw+gap)+offset, y = row*(bh+gap);
                        ctxC.fillStyle = `rgb(${55 + Math.random()*20},${30 + Math.random()*12},24)`;
                        ctxC.fillRect(x+gap/2, y+gap/2, bw, bh);
                        const bH = 170 + Math.floor(Math.random()*45);
                        ctxB.fillStyle = `rgb(${bH},${bH},${bH})`;
                        ctxB.fillRect(x+gap/2, y+gap/2, bw, bh);
                    }
                }
            });
            this.brickMat = new THREE.MeshStandardMaterial({ map: brickPBR.map, bumpMap: brickPBR.bumpMap, bumpScale: 0.03, roughness: 0.88, metalness: 0.05 });
            this.brickMat.map.repeat.set(2, 2); this.brickMat.bumpMap.repeat.set(2, 2);

            // --- DECAYED CONCRETE ---
            const concretePBR = this._makePBRTexPairs(512, 512, (ctxC, ctxB, W, H) => {
                ctxC.fillStyle = '#363636'; ctxC.fillRect(0,0,W,H);
                ctxB.fillStyle = '#7a7a7a'; ctxB.fillRect(0,0,W,H);
                for(let i=0; i<3000; i++){
                    const rx = Math.random()*W, ry = Math.random()*H;
                    ctxC.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.12)';
                    ctxC.fillRect(rx, ry, 2, 2);
                }
            });
            this.concreteMat = new THREE.MeshStandardMaterial({ map: concretePBR.map, bumpMap: concretePBR.bumpMap, bumpScale: 0.015, roughness: 0.82, metalness: 0.1 });

            // --- GRAINED WOOD PLANKS ---
            const woodPBR = this._makePBRTexPairs(512, 512, (ctxC, ctxB, W, H) => {
                const pw = 64; ctxB.fillStyle = '#757575'; ctxB.fillRect(0,0,W,H);
                for(let p=0; p<W/pw; p++){
                    ctxC.fillStyle = `rgb(${42+Math.random()*12},${30+Math.random()*6},18)`;
                    ctxC.fillRect(p*pw, 0, pw-2, H);
                    ctxB.fillStyle = 'rgb(140,140,140)'; ctxB.fillRect(p*pw, 0, pw-2, H);
                }
            });
            this.woodMat = new THREE.MeshStandardMaterial({ map: woodPBR.map, bumpMap: woodPBR.bumpMap, bumpScale: 0.025, roughness: 0.75 });

            // --- INDUSTRIAL METALS ---
            const metalPBR = this._makePBRTexPairs(512, 512, (ctxC, ctxB, W, H) => {
                ctxC.fillStyle = '#42464b'; ctxC.fillRect(0,0,W,H);
                ctxB.fillStyle = '#959595'; ctxB.fillRect(0,0,W,H);
                for(let i=0; i<500; i++){
                    ctxC.fillStyle = `rgba(100, 40, 10, ${0.15 + Math.random()*0.35})`;
                    ctxC.fillRect(Math.random()*W, Math.random()*H, 6, 5);
                }
            });
            this.metalMat = new THREE.MeshStandardMaterial({ map: metalPBR.map, bumpMap: metalPBR.bumpMap, bumpScale: 0.035, roughness: 0.42, metalness: 0.8 });

            const ceilTex = this._makeTex(256, 256, (ctx, W, H) => {
                ctx.fillStyle = '#9e9682'; ctx.fillRect(0,0,W,H);
                ctx.strokeStyle = '#665f4e'; ctx.lineWidth = 4; ctx.strokeRect(2,2,W-4,H-4);
            });
            this.ceilMat = new THREE.MeshStandardMaterial({ map: ceilTex, roughness: 0.92 });

            this.debrisMat = new THREE.MeshStandardMaterial({ color: 0x1c1612, roughness: 0.95 });
            this.sandbagMat = new THREE.MeshStandardMaterial({ color: 0x594f3e, roughness: 0.92 });
            this.bloodMat = new THREE.MeshStandardMaterial({ color: 0x1f0202, roughness: 0.12, transparent: true, opacity: 0.85 });
        }

        buildMap() {
            const RH = 4.5;    // Room Height multiplier
            const WT = 0.8;    // Wall Thickness
            const size = 32;   // Footprint square dimension

            // Base Map Foundations
            this.addFloor(0, -0.15, 0, size, size, this.concreteMat);

            // =================================================================
            // ROOM 1: SPAWN STATION (Y: 0 -> 4.5, South Half)
            // =================================================================
            this.addWall(-size/2 + WT/2, RH/2, size/4, WT, RH, size/2, this.brickMat); // West Outer Wall
            this.addWall(size/2 - WT/2, RH/2, size/4, WT, RH, size/2, this.brickMat);  // East Outer Wall
            this.addWall(0, RH/2, size/2 - WT/2, size, RH, WT, this.brickMat);         // South Outer Wall
            this.addCeiling(0, RH, size/4, size, size/2);                              // Room 1 Ceiling

            // Room 1 Entry/Window Barriers
            this.addWindowBarricade(-size/2 + 0.5, 2.0, 10, Math.PI/2);
            this.addWindowBarricade(size/2 - 0.5, 2.0, 6, -Math.PI/2);
            this.addWindowBarricade(-4, 2.0, size/2 - 0.5, 0);

            // Room 1 Assets & Wallbuys
            this.addSandbagWall(-6, 0.18, 12, 3);
            this.addBloodStain(-3, 8, 2.5);
            this.addFlickerLight(-4, RH - 0.5, 8, 0xffd2a1, 1.2, 16);
            this.addWallBuy(size/2 - 0.9, 2.0, 12, -Math.PI/2, 'ammo', 'Ammo Crate', 250, 'ammo');

            // DOORWAYS BLOCKER: Room 1 -> Room 2 (Dividing Wall at Z = 0)
            this.addWall(-9.5, RH/2, 0, 13, RH, WT, this.concreteMat);
            this.addWall(9.5, RH/2, 0, 13, RH, WT, this.concreteMat);
            this.addInteractableDebris(0, RH/2, 0, 6, RH, WT, 750, "POWER GRID VAULT", 'door_r1_to_r2');


            // =================================================================
            // ROOM 2: POWER GRID VAULT (Y: 0 -> 4.5, North Half)
            // =================================================================
            this.addWall(-size/2 + WT/2, RH/2, -size/4, WT, RH, size/2, this.brickMat); // West Outer Wall
            this.addWall(size/2 - WT/2, RH/2, -size/4, WT, RH, size/2, this.brickMat);  // East Outer Wall
            this.addWall(0, RH/2, -size/2 + WT/2, size, RH, WT, this.brickMat);        // North Outer Wall

            // Ceiling (Leave 8x8 cutout hole in the Northeast corner for stairs up to Room 3)
            this.addCeiling(-4, RH, -size/4, 24, size/2);
            this.addCeiling(12, RH, -4, 8, 8);

            // Room 2 Barriers & Content
            this.addWindowBarricade(0, 2.0, -size/2 + 0.5, 0);
            this.addWindowBarricade(size/2 - 0.5, 2.0, -10, -Math.PI/2);
            this.addFlickerLight(6, RH - 0.5, -6, 0xffa873, 1.0, 15);
            this.addWallBuy(-size/2 + 0.9, 2.0, -6, Math.PI/2, 'shotgun', 'Trench Gun', 500, 'weapon');

            // DEBRIS BLOCKER: Room 2 -> Room 3 Stairwell Blocker
            this.addInteractableDebris(12, RH/2, -12, 7.5, RH, 7.5, 1000, "COMMS CONTROL DECK STAIRS", 'debris_r2_to_r3');


            // =================================================================
            // ROOM 3: COMMS CONTROL DECK (Y: 4.5 -> 9.0, South Half)
            // =================================================================
            const R3_Y = RH; // Level 2 base
            this.addFloor(0, R3_Y - 0.05, size/4, size, size/2, this.woodMat);

            // Level 2 Perimeter Walls (South Layer)
            this.addWall(-size/2 + WT/2, R3_Y + RH/2, size/4, WT, RH, size/2, this.concreteMat);
            this.addWall(size/2 - WT/2, R3_Y + RH/2, size/4, WT, RH, size/2, this.concreteMat);
            this.addWall(0, R3_Y + RH/2, size/2 - WT/2, size, RH, WT, this.concreteMat);
            this.addCeiling(0, R3_Y + RH, size/4, size, size/2);

            // Room 3 Windows & Assets
            this.addWindowBarricade(-size/2 + 0.5, R3_Y + 2.0, 4, Math.PI/2);
            this.addWindowBarricade(size/2 - 0.5, R3_Y + 2.0, 12, -Math.PI/2);
            this.addFlickerLight(0, R3_Y + RH - 0.5, 8, 0x82b4ff, 1.3, 18);
            this.addBloodStain(4, 6, 3.0);

            // DOORWAYS BLOCKER: Room 3 -> Room 4 (Dividing Wall at Z = 0)
            this.addWall(-9.5, R3_Y + RH/2, 0, 13, RH, WT, this.concreteMat);
            this.addWall(9.5, R3_Y + RH/2, 0, 13, RH, WT, this.concreteMat);
            this.addInteractableDebris(0, R3_Y + RH/2, 0, 6, RH, WT, 1250, "LOGISTICS SUPPLY BAY", 'door_r3_to_r4');


            // =================================================================
            // ROOM 4: LOGISTICS SUPPLY BAY (Y: 4.5 -> 9.0, North Half)
            // =================================================================
            const R4_Y = RH;
            this.addFloor(0, R4_Y - 0.05, -size/4, size, size/2, this.woodMat);

            // Level 2 Perimeter Walls (North Layer)
            this.addWall(-size/2 + WT/2, R4_Y + RH/2, -size/4, WT, RH, size/2, this.concreteMat);
            this.addWall(size/2 - WT/2, R4_Y + RH/2, -size/4, WT, RH, size/2, this.concreteMat);
            this.addWall(0, R4_Y + RH/2, -size/2 + WT/2, size, RH, WT, this.concreteMat);

            // Ceiling Cutout (Leave 8x8 cutout hole in Northwest corner for Hatch leading into Room 5 Penthouse)
            this.addCeiling(4, R4_Y + RH, -size/4, 24, size/2);
            this.addCeiling(-12, R4_Y + RH, -4, 8, 8);

            // Room 4 Windows & Infrastructure
            this.addWindowBarricade(4, R4_Y + 2.0, -size/2 + 0.5, 0);
            this.addWindowBarricade(-size/2 + 0.5, R4_Y + 2.0, -8, Math.PI/2);
            this.addProp(6, R4_Y + 0.8, -6, 3, 1.6, 2, this.metalMat);
            this.addFlickerLight(-6, R4_Y + RH - 0.5, -6, 0x55ffaa, 1.1, 15);
            this.addWallBuy(0, R4_Y + 2.0, -size/2 + 0.9, 0, 'ar', 'Assault Rifle', 1000, 'weapon');

            // HATCH BLOCKER: Room 4 -> Room 5 Roof Penthouse Access
            this.addInteractableDebris(-12, R4_Y + RH/2, -12, 7.5, RH, 7.5, 2000, "ROOF APEX PENTHOUSE HATCH", 'hatch_r4_to_r5');


            // =================================================================
            // ROOM 5: THE ROOF APEX PENTHOUSE (Y: 9.0 -> 14.5, Full Mega-Room)
            // =================================================================
            const R5_Y = RH * 2; // High altitude base platform
            
            // Render a unified solid massive floor base sealing all cutouts completely
            this.addFloor(0, R5_Y - 0.05, 0, size, size, this.concreteMat);

            // Full Outer Perimeter Structural Boundary Enclosure
            this.addWall(-size/2 + WT/2, R5_Y + RH/2, 0, WT, RH, size, this.brickMat);
            this.addWall(size/2 - WT/2, R5_Y + RH/2, 0, WT, RH, size, this.brickMat);
            this.addWall(0, R5_Y + RH/2, size/2 - WT/2, size, RH, WT, this.brickMat);
            this.addWall(0, R5_Y + RH/2, -size/2 + WT/2, size, RH, WT, this.brickMat);

            // Industrial Sky Roof Deck Top Cap Cover
            this.addCeiling(0, R5_Y + RH, 0, size, size);

            // Room 5 Strategic Defensive Boarded Windows Around Perimeter
            this.addWindowBarricade(-size/2 + 0.5, R5_Y + 2.0, -4, Math.PI/2);
            this.addWindowBarricade(size/2 - 0.5, R5_Y + 2.0, 4, -Math.PI/2);
            this.addWindowBarricade(-6, R5_Y + 2.0, size/2 - 0.5, 0);
            this.addWindowBarricade(6, R5_Y + 2.0, -size/2 + 0.5, 0);

            // Light, Environmental Polish & End-Game Content Placement
            this.addFlickerLight(0, R5_Y + RH - 0.6, 0, 0xff3300, 1.6, 25);
            this.addBloodStain(-2, -2, 4.5);
            this.addWallBuy(-size/2 + 0.9, R5_Y + 2.0, -10, Math.PI/2, 'railgun', 'Railgun', 2500, 'weapon');
            
            // DOOR BLOCKER: Room 5 -> Room 6 (Dividing wall inside Room 5, splitting South access)
            // Room 5 is a full-size mega room. We place a dividing wall + door at Z=0 to gate access to the south side upper hatch.
            this.addWall(-9.5, R5_Y + RH/2, size/4 - 2, 13, RH, WT, this.concreteMat);
            this.addWall(9.5, R5_Y + RH/2, size/4 - 2, 13, RH, WT, this.concreteMat);
            this.addInteractableDebris(0, R5_Y + RH/2, size/4 - 2, 6, RH, WT, 2500, "ARMORY BUNKER ACCESS", 'door_r5_to_r6');


            // =================================================================
            // ROOM 6: ARMORY BUNKER (Y: 13.5 -> 18.0, South Half, Level 4)
            // =================================================================
            const R6_Y = RH * 3; // Level 4 base
            this.addFloor(0, R6_Y - 0.05, size/4, size, size/2, this.metalMat);

            // Level 4 South Perimeter Walls
            this.addWall(-size/2 + WT/2, R6_Y + RH/2, size/4, WT, RH, size/2, this.concreteMat);
            this.addWall(size/2 - WT/2, R6_Y + RH/2, size/4, WT, RH, size/2, this.concreteMat);
            this.addWall(0, R6_Y + RH/2, size/2 - WT/2, size, RH, WT, this.concreteMat);
            this.addCeiling(0, R6_Y + RH, size/4, size, size/2);

            // Room 6 Windows & Assets
            this.addWindowBarricade(-size/2 + 0.5, R6_Y + 2.0, 10, Math.PI/2);
            this.addWindowBarricade(size/2 - 0.5, R6_Y + 2.0, 6, -Math.PI/2);
            this.addWindowBarricade(4, R6_Y + 2.0, size/2 - 0.5, 0);
            this.addFlickerLight(-6, R6_Y + RH - 0.5, 8, 0xff6622, 1.4, 18);
            this.addFlickerLight(8, R6_Y + RH - 0.5, 12, 0xffaa44, 0.9, 12);
            this.addBloodStain(5, 10, 2.0);
            this.addSandbagWall(4, R6_Y + 0.18, 6, 4);
            this.addProp(-8, R6_Y + 0.6, 4, 2.5, 1.2, 2, this.metalMat);
            this.addWallBuy(size/2 - 0.9, R6_Y + 2.0, 10, -Math.PI/2, 'shotgun', 'Combat Shotgun', 1500, 'weapon');

            // DOOR BLOCKER: Room 6 -> Room 7 (Dividing Wall at Z = 0)
            this.addWall(-9.5, R6_Y + RH/2, 0, 13, RH, WT, this.concreteMat);
            this.addWall(9.5, R6_Y + RH/2, 0, 13, RH, WT, this.concreteMat);
            this.addInteractableDebris(0, R6_Y + RH/2, 0, 6, RH, WT, 3000, "BIO-LAB CHAMBER", 'door_r6_to_r7');


            // =================================================================
            // ROOM 7: BIO-LAB CHAMBER (Y: 13.5 -> 18.0, North Half, Level 4)
            // =================================================================
            this.addFloor(0, R6_Y - 0.05, -size/4, size, size/2, this.metalMat);

            // Level 4 North Perimeter Walls
            this.addWall(-size/2 + WT/2, R6_Y + RH/2, -size/4, WT, RH, size/2, this.concreteMat);
            this.addWall(size/2 - WT/2, R6_Y + RH/2, -size/4, WT, RH, size/2, this.concreteMat);
            this.addWall(0, R6_Y + RH/2, -size/2 + WT/2, size, RH, WT, this.concreteMat);

            // Ceiling Cutout (8x8 hole in Northeast for stairs to Room 8)
            this.addCeiling(-4, R6_Y + RH, -size/4, 24, size/2);
            this.addCeiling(12, R6_Y + RH, -4, 8, 8);

            // Room 7 Windows & Bio-Lab Assets
            this.addWindowBarricade(0, R6_Y + 2.0, -size/2 + 0.5, 0);
            this.addWindowBarricade(-size/2 + 0.5, R6_Y + 2.0, -10, Math.PI/2);
            this.addWindowBarricade(size/2 - 0.5, R6_Y + 2.0, -8, -Math.PI/2);
            this.addFlickerLight(0, R6_Y + RH - 0.5, -8, 0x22ff88, 1.5, 20);
            this.addFlickerLight(-10, R6_Y + RH - 0.5, -12, 0x44ffaa, 0.8, 10);
            this.addBloodStain(-4, -8, 3.5);
            this.addProp(6, R6_Y + 0.8, -10, 3, 1.6, 2.5, this.metalMat); // Lab Equipment
            this.addProp(-6, R6_Y + 0.5, -4, 1.5, 1.0, 3, this.metalMat); // Specimen Tank
            this.addWallBuy(-size/2 + 0.9, R6_Y + 2.0, -8, Math.PI/2, 'ar', 'Carbine MK2', 2000, 'weapon');

            // DEBRIS BLOCKER: Room 7 -> Room 8 Stairwell
            this.addInteractableDebris(12, R6_Y + RH/2, -12, 7.5, RH, 7.5, 3500, "REACTOR CORE STAIRS", 'debris_r7_to_r8');


            // =================================================================
            // ROOM 8: REACTOR CORE (Y: 18.0 -> 22.5, South Half, Level 5)
            // =================================================================
            const R8_Y = RH * 4; // Level 5 base
            this.addFloor(0, R8_Y - 0.05, size/4, size, size/2, this.concreteMat);

            // Level 5 South Perimeter Walls
            this.addWall(-size/2 + WT/2, R8_Y + RH/2, size/4, WT, RH, size/2, this.brickMat);
            this.addWall(size/2 - WT/2, R8_Y + RH/2, size/4, WT, RH, size/2, this.brickMat);
            this.addWall(0, R8_Y + RH/2, size/2 - WT/2, size, RH, WT, this.brickMat);
            this.addCeiling(0, R8_Y + RH, size/4, size, size/2);

            // Room 8 Windows & Reactor Assets
            this.addWindowBarricade(-size/2 + 0.5, R8_Y + 2.0, 8, Math.PI/2);
            this.addWindowBarricade(size/2 - 0.5, R8_Y + 2.0, 12, -Math.PI/2);
            this.addFlickerLight(0, R8_Y + RH - 0.5, 10, 0xff2200, 1.8, 22);
            this.addFlickerLight(-8, R8_Y + RH - 0.5, 4, 0xff4400, 1.0, 14);
            this.addBloodStain(2, 6, 4.0);
            // Reactor Core structure (central prop)
            this.addProp(0, R8_Y + 1.5, 8, 4, 3.0, 4, this.metalMat);
            this.addWallBuy(size/2 - 0.9, R8_Y + 2.0, 4, -Math.PI/2, 'ammo', 'Ammo Stockpile', 500, 'ammo');

            // DOOR BLOCKER: Room 8 -> Room 9 (Dividing Wall at Z = 0)
            this.addWall(-9.5, R8_Y + RH/2, 0, 13, RH, WT, this.concreteMat);
            this.addWall(9.5, R8_Y + RH/2, 0, 13, RH, WT, this.concreteMat);
            this.addInteractableDebris(0, R8_Y + RH/2, 0, 6, RH, WT, 4000, "WAR ROOM", 'door_r8_to_r9');


            // =================================================================
            // ROOM 9: WAR ROOM (Y: 18.0 -> 22.5, North Half, Level 5)
            // =================================================================
            this.addFloor(0, R8_Y - 0.05, -size/4, size, size/2, this.woodMat);

            // Level 5 North Perimeter Walls
            this.addWall(-size/2 + WT/2, R8_Y + RH/2, -size/4, WT, RH, size/2, this.brickMat);
            this.addWall(size/2 - WT/2, R8_Y + RH/2, -size/4, WT, RH, size/2, this.brickMat);
            this.addWall(0, R8_Y + RH/2, -size/2 + WT/2, size, RH, WT, this.brickMat);

            // Ceiling Cutout (8x8 hole in Northwest for hatch to Room 10)
            this.addCeiling(4, R8_Y + RH, -size/4, 24, size/2);
            this.addCeiling(-12, R8_Y + RH, -4, 8, 8);

            // Room 9 Windows & War Room Assets
            this.addWindowBarricade(4, R8_Y + 2.0, -size/2 + 0.5, 0);
            this.addWindowBarricade(-size/2 + 0.5, R8_Y + 2.0, -6, Math.PI/2);
            this.addWindowBarricade(size/2 - 0.5, R8_Y + 2.0, -12, -Math.PI/2);
            this.addFlickerLight(-4, R8_Y + RH - 0.5, -8, 0x4488ff, 1.3, 18);
            this.addFlickerLight(6, R8_Y + RH - 0.5, -4, 0x6699ff, 0.9, 12);
            this.addBloodStain(-6, -10, 2.5);
            // War Table
            this.addProp(0, R8_Y + 0.6, -8, 5, 1.2, 3, this.woodMat);
            // Filing Cabinets
            this.addProp(-10, R8_Y + 0.9, -4, 1.5, 1.8, 1.5, this.metalMat);
            this.addProp(-10, R8_Y + 0.9, -6.5, 1.5, 1.8, 1.5, this.metalMat);
            this.addWallBuy(0, R8_Y + 2.0, -size/2 + 0.9, 0, 'railgun', 'Tesla Cannon', 3500, 'weapon');

            // HATCH BLOCKER: Room 9 -> Room 10 Observatory Spire Access
            this.addInteractableDebris(-12, R8_Y + RH/2, -12, 7.5, RH, 7.5, 5000, "OBSERVATORY SPIRE HATCH", 'hatch_r9_to_r10');


            // =================================================================
            // ROOM 10: THE OBSERVATORY SPIRE (Y: 22.5 -> 27.0, South Half, Level 6)
            // =================================================================
            const R10_Y = RH * 5; // Highest altitude platform
            
            // South floor
            this.addFloor(0, R10_Y - 0.05, size/4, size, size/2, this.metalMat);

            // Level 6 South Perimeter Walls
            this.addWall(-size/2 + WT/2, R10_Y + RH/2, size/4, WT, RH, size/2, this.brickMat);
            this.addWall(size/2 - WT/2, R10_Y + RH/2, size/4, WT, RH, size/2, this.brickMat);
            this.addWall(0, R10_Y + RH/2, size/2 - WT/2, size, RH, WT, this.brickMat);

            // Ceiling
            this.addCeiling(0, R10_Y + RH, size/4, size, size/2);

            // Room 10 Strategic Windows Around Perimeter
            this.addWindowBarricade(-size/2 + 0.5, R10_Y + 2.0, 6, Math.PI/2);
            this.addWindowBarricade(size/2 - 0.5, R10_Y + 2.0, 6, -Math.PI/2);
            this.addWindowBarricade(-8, R10_Y + 2.0, size/2 - 0.5, 0);

            // Observatory Spire Lighting — dramatic crimson & violet for endgame atmosphere
            this.addFlickerLight(0, R10_Y + RH - 0.6, 8, 0xaa00ff, 2.0, 28);
            this.addFlickerLight(8, R10_Y + RH - 0.5, 8, 0xff0044, 1.2, 16);
            this.addBloodStain(4, 8, 5.0);
            this.addBloodStain(-6, 6, 3.0);

            // Central Observatory Telescope/Antenna Prop (in South half)
            this.addProp(0, R10_Y + 2.0, 8, 2, 4.0, 2, this.metalMat);

            // Endgame Wall Buys (in South half)
            this.addWallBuy(-size/2 + 0.9, R10_Y + 2.0, 10, Math.PI/2, 'ar', 'Plasma Rifle', 4000, 'weapon');
            this.addWallBuy(size/2 - 0.9, R10_Y + 2.0, 10, -Math.PI/2, 'ammo', 'Ammo Cache', 750, 'ammo');


            // DOOR BLOCKER: Room 11 -> Room 10 (Dividing Wall at Z = 0)
            this.addWall(-9.5, R10_Y + RH/2, 0, 13, RH, WT, this.concreteMat);
            this.addWall(9.5, R10_Y + RH/2, 0, 13, RH, WT, this.concreteMat);
            this.addInteractableDebris(0, R10_Y + RH/2, 0, 6, RH, WT, 6000, "OBSERVATORY SPIRE", 'door_r11_to_r10');


            // =================================================================
            // ROOM 11: AETHER RESEARCH LAB (Y: 22.5 -> 27.0, North Half, Level 6)
            // =================================================================
            // North floor
            this.addFloor(0, R10_Y - 0.05, -size/4, size, size/2, this.metalMat);

            // Level 6 North Perimeter Walls
            this.addWall(-size/2 + WT/2, R10_Y + RH/2, -size/4, WT, RH, size/2, this.brickMat);
            this.addWall(size/2 - WT/2, R10_Y + RH/2, -size/4, WT, RH, size/2, this.brickMat);
            this.addWall(0, R10_Y + RH/2, -size/2 + WT/2, size, RH, WT, this.brickMat);

            // Ceiling
            this.addCeiling(0, R10_Y + RH, -size/4, size, size/2);

            // Room 11 Windows & Lab Assets
            this.addWindowBarricade(-size/2 + 0.5, R10_Y + 2.0, -6, Math.PI/2);
            this.addWindowBarricade(size/2 - 0.5, R10_Y + 2.0, -6, -Math.PI/2);
            this.addWindowBarricade(8, R10_Y + 2.0, -size/2 + 0.5, 0);
            this.addFlickerLight(-6, R10_Y + RH - 0.5, -8, 0x00ffcc, 1.2, 16); // Cyan lab light
            this.addProp(-8, R10_Y + 0.9, -4, 1.5, 1.8, 1.5, this.metalMat); // Server Rack
            this.addProp(-8, R10_Y + 0.9, -6.5, 1.5, 1.8, 1.5, this.metalMat);

            // Wall Buy (in North half)
            this.addWallBuy(0, R10_Y + 2.0, -size/2 + 0.9, 0, 'railgun', 'Tesla Cannon', 3500, 'weapon');


            // Build Mystery Box inside the Apex Room (Room 5)
            this.buildMysteryBox(-8, R5_Y + 0.45, 8);

            // Atmosphere particles
            this.initDustMotes();

            // Set dynamic area rooms mapping registry globally (scaled 4x)
            // IMPORTANT: Rooms are ordered HIGHEST first so the loop matches the correct
            // upper room before a lower room that shares the same XZ footprint.
            window.NachtSafeRooms = [
                { minX: -64, maxX: 64, minZ: -64, maxZ: 64, minY: 108.0, maxY: 126.0 },   // Spire Roof (ceiling of top floor)
                { minX: -64, maxX: 64, minZ: 0, maxZ: 64, minY: 90.0, maxY: 112.0 },     // Room 10 - Observatory Spire (South)
                { minX: -64, maxX: 64, minZ: -64, maxZ: 0, minY: 90.0, maxY: 112.0 },    // Room 11 - Aether Research Lab (North)
                { minX: -64, maxX: 64, minZ: 0, maxZ: 64, minY: 72.0, maxY: 90.0 },       // Room 8 - Reactor Core
                { minX: -64, maxX: 64, minZ: -64, maxZ: 0, minY: 72.0, maxY: 90.0 },      // Room 9 - War Room
                { minX: -64, maxX: 64, minZ: 0, maxZ: 64, minY: 54.0, maxY: 72.0 },       // Room 6 - Armory Bunker
                { minX: -64, maxX: 64, minZ: -64, maxZ: 0, minY: 54.0, maxY: 72.0 },      // Room 7 - Bio-Lab Chamber
                { minX: -64, maxX: 64, minZ: -64, maxZ: 64, minY: 36.0, maxY: 54.0 },    // Room 5 - Roof Apex Penthouse (ceiling lowered to match R6/R7 floor)
                { minX: -64, maxX: 64, minZ: 0, maxZ: 64, minY: 18.0, maxY: 36.0 },       // Room 3 - Comms Control Deck
                { minX: -64, maxX: 64, minZ: -64, maxZ: 0, minY: 18.0, maxY: 36.0 },      // Room 4 - Logistics Supply Bay
                { minX: -64, maxX: 64, minZ: 0, maxZ: 64, minY: 0, maxY: 18.0 },         // Room 1 - Spawn Station
                { minX: -64, maxX: 64, minZ: -64, maxZ: 0, minY: 0, maxY: 18.0 }         // Room 2 - Power Grid Vault
            ];
        }

        getCostAt(worldX, worldZ, worldY) {
            const yPos = worldY !== undefined ? worldY : 0.05;
            for (let i = 0; i < this.walls.length; i++) {
                const w = this.walls[i];
                if (worldX > w.minX && worldX < w.maxX && worldZ > w.minZ && worldZ < w.maxZ) {
                    // Only collide if player height is within the wall vertical bounds
                    if (yPos >= w.minY - 1.0 && yPos <= w.maxY + 1.0) {
                        return 255;
                    }
                }
            }
            if (worldX < this.mapMinX || worldX > this.mapMaxX || worldZ < this.mapMinZ || worldZ > this.mapMaxZ) return 255;
            return 1;
        }

        _makePBRTexPairs(w, h, paintFn) {
            const cColor = document.createElement('canvas'); cColor.width = w; cColor.height = h;
            const cBump = document.createElement('canvas');  cBump.width = w;  cBump.height = h;
            paintFn(cColor.getContext('2d'), cBump.getContext('2d'), w, h);
            const tColor = new THREE.CanvasTexture(cColor);  const tBump = new THREE.CanvasTexture(cBump);
            tColor.wrapS = tColor.wrapT = THREE.RepeatWrapping; tBump.wrapS = tBump.wrapT = THREE.RepeatWrapping;
            return { map: tColor, bumpMap: tBump };
        }

        _makeTex(w, h, fn) {
            const c = document.createElement('canvas'); c.width = w; c.height = h;
            fn(c.getContext('2d'), w, h);
            const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
        }

        addWall(cx, cy, cz, width, height, depth, mat) {
            const geo = new THREE.BoxGeometry(width, height, depth);
            this._assignUVs(geo, width, height, depth);
            const mesh = new THREE.Mesh(geo, mat || this.brickMat);
            mesh.position.set(cx, cy, cz); mesh.castShadow = true; mesh.receiveShadow = true;
            this.group.add(mesh);
            this.walls.push({
                minX: (cx - width/2) * 4.0,
                maxX: (cx + width/2) * 4.0,
                minZ: (cz - depth/2) * 4.0,
                maxZ: (cz + depth/2) * 4.0,
                minY: (cy - height/2) * 4.0 - 2.0,
                maxY: (cy + height/2) * 4.0 - 2.0
            });
        }

        addFloor(cx, cy, cz, width, depth, mat) {
            const geo = new THREE.BoxGeometry(width, 0.3, depth);
            this._assignUVs(geo, width, 0.3, depth);
            const mesh = new THREE.Mesh(geo, mat || this.woodMat);
            mesh.position.set(cx, cy, cz); mesh.receiveShadow = true;
            this.group.add(mesh);
        }

        addCeiling(cx, cy, cz, width, depth) {
            const geo = new THREE.BoxGeometry(width, 0.2, depth);
            this._assignUVs(geo, width, 0.2, depth);
            const mesh = new THREE.Mesh(geo, this.ceilMat);
            mesh.position.set(cx, cy - 0.15, cz); mesh.receiveShadow = true;
            this.group.add(mesh);
        }

        addProp(cx, cy, cz, w, h, d, mat, rotY) {
            const geo = new THREE.BoxGeometry(w, h, d);
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(cx, cy, cz); if(rotY) mesh.rotation.y = rotY;
            mesh.castShadow = true; mesh.receiveShadow = true;
            this.group.add(mesh);
            this.walls.push({
                minX: (cx - w/2) * 4.0,
                maxX: (cx + w/2) * 4.0,
                minZ: (cz - d/2) * 4.0,
                maxZ: (cz + d/2) * 4.0,
                minY: (cy - h/2) * 4.0 - 2.0,
                maxY: (cy + h/2) * 4.0 - 2.0
            });
        }

        _assignUVs(geometry, w, h, d) {
            const positionAttribute = geometry.attributes.position;
            const uvAttribute = geometry.attributes.uv;
            for (let i = 0; i < positionAttribute.count; i++) {
                const nx = Math.abs(geometry.attributes.normal.getX(i));
                const ny = Math.abs(geometry.attributes.normal.getY(i));
                const vx = positionAttribute.getX(i); const vy = positionAttribute.getY(i); const vz = positionAttribute.getZ(i);
                let u = 0, v = 0;
                if (nx > 0.5) { u = vz / 4; v = vy / 4; } 
                else if (ny > 0.5) { u = vx / 4; v = vz / 4; } 
                else { u = vx / 4; v = vy / 4; }
                uvAttribute.setXY(i, u, v);
            }
            uvAttribute.needsUpdate = true;
        }

        addBloodStain(cx, cz, size) {
            const geo = new THREE.PlaneGeometry(size, size);
            const mesh = new THREE.Mesh(geo, this.bloodMat);
            mesh.position.set(cx, 0.025, cz); mesh.rotation.x = -Math.PI/2;
            this.group.add(mesh);
        }

        addFlickerLight(x, y, z, color, intensity, dist) {
            const light = new THREE.PointLight(color, intensity, dist);
            light.position.set(x, y, z); light.castShadow = true; light.shadow.bias = -0.002;
            this.group.add(light);
            if (!this.flickerLights) this.flickerLights = [];
            this.flickerLights.push({ light, baseIntensity: intensity, phase: Math.random()*Math.PI*2 });
        }

        addSandbagWall(cx, cy, cz, count) {
            for (let i=0; i<count; i++) {
                for (let r=0; r<3; r++) {
                    const bag = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.32, 0.6), this.sandbagMat);
                    bag.position.set(cx + i*1.1 - count*0.55, cy + r*0.3, cz + (i%2)*0.04);
                    bag.castShadow = true; this.group.add(bag);
                }
            }
        }

        addWindowBarricade(cx, cy, cz, rotY) {
            // Steel Window Frame Profile 
            const frame = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.6, 0.2), this.metalMat);
            frame.position.set(cx, cy, cz); if(rotY) frame.rotation.y = rotY;
            frame.castShadow = true; this.group.add(frame);
            
            // Shattered Wood Defensive Barricade Planks Stacking Assembly Layer
            for (let i = 0; i < 4; i++) {
                const board = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.26, 0.08), this.woodMat);
                board.position.set(
                    cx + (rotY ? Math.sin(rotY)*0.12 : 0), 
                    cy - 0.8 + (i * 0.55), 
                    cz + (rotY ? 0 : Math.cos(rotY)*0.12)
                );
                if (rotY) board.rotation.y = rotY;
                board.rotation.z = (Math.random() - 0.5) * 0.12; // Realistic weathered angle shift
                board.castShadow = true; board.receiveShadow = true;
                this.group.add(board);
            }
        }

        createPortalVisuals(cx, cy, cz, color) {
            const portalGroup = new THREE.Group();
            portalGroup.position.set(cx, cy, cz);

            // Glowing cylinder representing the portal column
            const geom = new THREE.CylinderGeometry(1.2, 1.2, 2.0, 16, 1, true);
            const mat = new THREE.MeshBasicMaterial({
                color: color,
                transparent: true,
                opacity: 0.35,
                side: THREE.DoubleSide,
                blending: THREE.AdditiveBlending
            });
            const cylinder = new THREE.Mesh(geom, mat);
            portalGroup.add(cylinder);

            // Neon rings at top and bottom of the cylinder
            const ringGeom = new THREE.TorusGeometry(1.2, 0.08, 8, 24);
            const ringMat = new THREE.MeshBasicMaterial({ color: color });
            
            const ringBottom = new THREE.Mesh(ringGeom, ringMat);
            ringBottom.rotation.x = Math.PI / 2;
            ringBottom.position.y = -1.0;
            portalGroup.add(ringBottom);

            const ringTop = new THREE.Mesh(ringGeom, ringMat);
            ringTop.rotation.x = Math.PI / 2;
            ringTop.position.y = 1.0;
            portalGroup.add(ringTop);

            // Light inside the portal
            const light = new THREE.PointLight(color, 1.5, 8);
            light.position.set(0, 0, 0);
            portalGroup.add(light);

            this.group.add(portalGroup);

            // Keep reference for update logic (pulsing)
            if (!this.portalVisualsList) this.portalVisualsList = [];
            this.portalVisualsList.push({ group: portalGroup, light, cylinder, baseIntensity: 1.5, time: 0 });

            return portalGroup;
        }

        activatePortal(blockerId) {
            const configs = this.registeredPortals[blockerId];
            if (configs) {
                for (const cfg of configs) {
                    // Create the visual mesh and light
                    const visualGroup = this.createPortalVisuals(cfg.from.x, cfg.from.y + 1.0, cfg.from.z, cfg.color);
                    
                    // Add active portal entry for player intersection checks
                    this.portals.push({
                        x: cfg.from.x * 4.0,
                        y: cfg.from.y * 4.0 - 2.0,
                        z: cfg.from.z * 4.0,
                        targetX: cfg.to.x * 4.0,
                        targetY: cfg.to.y * 4.0 + 3.0,
                        targetZ: cfg.to.z * 4.0,
                        radius: 5.0, // World coordinate radius (scaled 4x)
                        meshGroup: visualGroup
                    });
                }
            }
        }

        initDustMotes() {
            const count = 500; const geo = new THREE.BufferGeometry(); const pos = new Float32Array(count * 3);
            this.dustVelocities = [];
            for (let i=0; i<count; i++) {
                pos[i*3] = (Math.random()-0.5)*30; pos[i*3+1] = Math.random()*30.0; pos[i*3+2] = (Math.random()-0.5)*30;
                this.dustVelocities.push({ x:(Math.random()-0.5)*0.04, y:(Math.random()-0.5)*0.015, z:(Math.random()-0.5)*0.04 });
            }
            geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
            this.dustPoints = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xddffdd, size: 0.05, transparent: true, opacity: 0.25 }));
            this.scene.add(this.dustPoints);
        }

        addInteractableDebris(cx, cy, cz, width, height, depth, cost, doorName, id) {
            const geo = new THREE.BoxGeometry(width, height, depth);
            const mesh = new THREE.Mesh(geo, this.debrisMat);
            mesh.position.set(cx, cy, cz); mesh.castShadow = true; mesh.receiveShadow = true;
            this.group.add(mesh);

            // apply door shader overlay when available
            try {
                if (window.Doors && typeof window.Doors.applyDoorShader === 'function') {
                    window.Doors.applyDoorShader(mesh, { baseColor: new THREE.Color(0x2b2b33), edgeColor: new THREE.Color(0x00e5ff) });
                }
            } catch (e) { console.error('Doors shader apply failed', e); }

            const wallData = {
                minX: (cx - width/2) * 4.0,
                maxX: (cx + width/2) * 4.0,
                minZ: (cz - depth/2) * 4.0,
                maxZ: (cz + depth/2) * 4.0,
                minY: (cy - height/2) * 4.0 - 2.0,
                maxY: (cy + height/2) * 4.0 - 2.0
            };
            this.walls.push(wallData);

            this.interactables.push({
                type: 'debris', id: id,
                x: cx * 4.0, y: cy * 4.0 - 2.0, z: cz * 4.0,
                radius: 18.0, cost: cost,
                text: `[E] UNLOCK ${doorName} [COST: ${cost}]`,
                mesh: mesh, wallRef: wallData, active: true,
                action: (it) => {
                    if (window.SFX) window.SFX.triggerExplosion?.();
                    // trigger Doors animation if available
                    try { if (window.Doors && typeof window.Doors.openDoor === 'function') window.Doors.openDoor(mesh, id); } catch (e) { console.error(e); }
                }
            });
        }

        addWallBuy(x, y, z, rotY, weaponId, weaponName, cost, type) {
            const geo = new THREE.PlaneGeometry(3.2, 1.2);
            const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 128;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = 'rgba(240,240,255,0.85)'; ctx.font = 'bold 36px "Courier New"';
            ctx.fillText(weaponName.toUpperCase(), 40, 75);
            
            const tex = new THREE.CanvasTexture(canvas);
            const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide }));
            mesh.position.set(x, y, z); mesh.rotation.y = rotY;
            this.group.add(mesh);

            this.interactables.push({
                type: 'wallbuy',
                x: x * 4.0, y: y * 4.0 - 2.0, z: z * 4.0,
                radius: 14.0, cost: cost,
                text: type === 'ammo' ? `[E] BUY AMMO [COST: ${cost}]` : `[E] BUY ${weaponName.toUpperCase()} [COST: ${cost}]`,
                active: true,
                action: () => {
                    if (type === 'ammo') {
                        if (window.inventory?.[window.currentWeaponIdx]) {
                            window.inventory[window.currentWeaponIdx].ammo = window.inventory[window.currentWeaponIdx].maxAmmo || 999;
                        }
                    } else {
                        const existing = window.inventory?.find(w => w.id === weaponId);
                        if (existing) { existing.ammo = existing.maxAmmo; } 
                        else {
                            const cfg = window.weaponsCfg?.[weaponId];
                            if (cfg) window.inventory.push({ ...cfg, ammo: cfg.maxAmmo });
                            window.currentWeaponIdx = window.inventory.length - 1;
                            if (window.updateWeaponMesh) window.updateWeaponMesh();
                        }
                    }
                    if (window.SFX?.triggerUIConfirm) window.SFX.triggerUIConfirm();
                }
            });
        }

        buildMysteryBox(x, y, z) {
            const geo = new THREE.BoxGeometry(2.8, 0.9, 1.3);
            this.boxMesh = new THREE.Mesh(geo, this.metalMat);
            this.boxMesh.position.set(x, y, z); this.boxMesh.castShadow = true; this.boxMesh.receiveShadow = true;
            this.group.add(this.boxMesh);

            this.boxLight = new THREE.PointLight(0xff5500, 1.5, 12);
            this.boxLight.position.set(x, y + 0.8, z); this.boxLight.castShadow = true;
            this.group.add(this.boxLight);

            const wallData = {
                minX: (x - 1.4) * 4.0,
                maxX: (x + 1.4) * 4.0,
                minZ: (z - 0.65) * 4.0,
                maxZ: (z + 0.65) * 4.0,
                minY: (y - 0.45) * 4.0 - 2.0,
                maxY: (y + 2.0) * 4.0 - 2.0
            };
            this.walls.push(wallData);

            this.interactables.push({
                type: 'mystery_box',
                x: x * 4.0, y: y * 4.0 - 2.0, z: z * 4.0,
                radius: 16.0, cost: 950,
                text: `[E] MYSTERY BOX [COST: 950]`,
                active: true,
                action: (iobj) => {
                    if (this.boxState !== 'idle') return;
                    this.boxState = 'rolling'; this.boxTimer = 3.0;
                    if (window.SFX?.triggerUIConfirm) window.SFX.triggerUIConfirm();
                    iobj.active = false;
                }
            });
            this.mysteryBoxInteractable = this.interactables[this.interactables.length - 1];
        }

        update(playerPosition, delta) {
            // Flicker Lights System Matrix
            if (this.flickerLights) {
                for (let i=0; i<this.flickerLights.length; i++) {
                    const fl = this.flickerLights[i]; fl.phase += delta * (6 + Math.random()*16);
                    fl.light.intensity = fl.baseIntensity * (0.65 + 0.35 * Math.sin(fl.phase) * Math.sin(fl.phase*1.8));
                }
            }

            // Atmosphere Motes System Translation
            if (this.dustPoints && this.dustVelocities) {
                const positions = this.dustPoints.geometry.attributes.position.array;
                for (let i=0; i<this.dustVelocities.length; i++) {
                    positions[i*3] += this.dustVelocities[i].x * delta;
                    positions[i*3+1] += this.dustVelocities[i].y * delta;
                    positions[i*3+2] += this.dustVelocities[i].z * delta;
                    if (positions[i*3+1] > 30.0 || positions[i*3+1] < 0) this.dustVelocities[i].y *= -1;
                }
                this.dustPoints.geometry.attributes.position.needsUpdate = true;
            }

            // Mystery Box Handler Run Cycle
            if (this.boxState === 'rolling') {
                this.boxTimer -= delta;
                this.boxLight.color.setHSL((Date.now()%600)/600, 1.0, 0.5);
                if (this.boxTimer <= 0) {
                    this.boxState = 'ready'; this.boxTimer = 10.0;
                    this.boxLight.color.setHex(0x00ff66);
                    
                    const weaponKeys = Object.keys(window.weaponsCfg || {}).filter(k => k !== 'tentacle');
                    this.boxWeapon = weaponKeys[Math.floor(Math.random() * weaponKeys.length)] || 'ar';
                    
                    if (this.boxWeaponMesh) this.group.remove(this.boxWeaponMesh);
                    this.boxWeaponMesh = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.3, 0.3), new THREE.MeshBasicMaterial({ color: 0x33ffaa, wireframe: true }));
                    this.boxWeaponMesh.position.set(this.boxMesh.position.x, this.boxMesh.position.y + 1.2, this.boxMesh.position.z);
                    this.group.add(this.boxWeaponMesh);

                    this.boxPickupInteractable = {
                        type: 'box_pickup', x: this.boxMesh.position.x, y: this.boxMesh.position.y + 1.0, z: this.boxMesh.position.z, radius: 4.0, cost: 0,
                        text: `[E] TAKE ${window.weaponsCfg?.[this.boxWeapon]?.name?.toUpperCase() || 'WEAPON'}`, active: true,
                        action: () => {
                            if (window.inventory) {
                                const existing = window.inventory.find(w => w.id === this.boxWeapon);
                                if (existing) existing.ammo = existing.maxAmmo;
                                else if (window.weaponsCfg?.[this.boxWeapon]) window.inventory.push({ ...window.weaponsCfg[this.boxWeapon], ammo: window.weaponsCfg[this.boxWeapon].maxAmmo });
                                window.currentWeaponIdx = window.inventory.length - 1;
                                if (window.updateWeaponMesh) window.updateWeaponMesh();
                            }
                            this.cleanupBox();
                        }
                    };
                    this.interactables.push(this.boxPickupInteractable);
                }
            } else if (this.boxState === 'ready') {
                this.boxTimer -= delta;
                if (this.boxWeaponMesh) {
                    this.boxWeaponMesh.rotation.y += delta * 1.5;
                    this.boxWeaponMesh.position.y = this.boxMesh.position.y + 1.2 + Math.sin(Date.now()*0.004)*0.05;
                }
                if (this.boxTimer <= 0) this.cleanupBox();
            }

            // Closest interactable evaluator loop tracking
            let closest = null; let minDist = Infinity;
            for(let i=0; i<this.interactables.length; i++) {
                const item = this.interactables[i]; if (!item.active) continue;
                const dist = playerPosition.distanceTo(new THREE.Vector3(item.x, item.y, item.z));
                if (dist < item.radius && dist < minDist) { minDist = dist; closest = item; }
            }
            this.currentInteractable = closest;

            const promptEl = document.getElementById('nacht-prompt');
            if (promptEl) {
                if (closest) {
                    const balance = window.moneyWeb?.getBalance?.() ?? window.zombiePoints ?? 0;
                    promptEl.style.color = balance >= closest.cost ? '#e6f2ff' : '#ff3333';
                    promptEl.textContent = closest.text; promptEl.style.display = 'block';
                } else { promptEl.style.display = 'none'; }
            }

            // Check portal intersections
            if (this.portals && this.portals.length) {
                for (let i = 0; i < this.portals.length; i++) {
                    const portal = this.portals[i];
                    // Player position is in world space
                    const dx = playerPosition.x - portal.x;
                    const dy = playerPosition.y - portal.y;
                    const dz = playerPosition.z - portal.z;
                    const distXZ = Math.sqrt(dx * dx + dz * dz);
                    
                    // Teleport player if they are inside the XZ radius AND close vertically (within 4.0 units)
                    if (distXZ < portal.radius && Math.abs(dy) < 4.0) {
                        // Teleport the player!
                        playerPosition.set(portal.targetX, portal.targetY, portal.targetZ);

                        // CRITICAL: Reset velocity so player doesn't overshoot the new floor
                        window._nachtResetVelocity = true;
                        
                        // Play a cool sound effect or visual feedback beep if available
                        if (window.SFX?.triggerUIConfirm) window.SFX.triggerUIConfirm();
                        
                        // Add a cool camera shake/hud flash or console log to show teleportation occurred!
                        if (window.NeuralConsole) {
                            window.NeuralConsole.log(`0x07E1: QUANTUM_TRANSIT_COMPLETE. TARGET_FLOOR_ALTITUDE: ${portal.targetY.toFixed(2)}`);
                            window.NeuralConsole.beep(880, 0.1);
                        }
                        break;
                    }
                }
            }

            // Pulse portal visuals
            if (this.portalVisualsList) {
                for (let i = 0; i < this.portalVisualsList.length; i++) {
                    const pv = this.portalVisualsList[i];
                    pv.time += delta;
                    // Pulse light intensity
                    pv.light.intensity = pv.baseIntensity * (0.8 + 0.4 * Math.sin(pv.time * 6.0));
                    // Rotate and scale the cylinder/rings slightly to look alive
                    pv.cylinder.rotation.y += delta * 1.5;
                    const scale = 1.0 + 0.05 * Math.sin(pv.time * 3.0);
                    pv.cylinder.scale.set(scale, 1.0, scale);
                }
            }
        }

        cleanupBox() {
            this.boxState = 'cooldown';
            if (this.boxWeaponMesh) { this.group.remove(this.boxWeaponMesh); this.boxWeaponMesh = null; }
            this.boxLight.color.setHex(0xff5500);
            if (this.boxPickupInteractable) {
                this.boxPickupInteractable.active = false;
                this.interactables = this.interactables.filter(i => i !== this.boxPickupInteractable);
                this.boxPickupInteractable = null;
            }
            setTimeout(() => { this.boxState = 'idle'; if (this.mysteryBoxInteractable) this.mysteryBoxInteractable.active = true; }, 3000);
        }

        interact() {
            if (this.currentInteractable && this.currentInteractable.active) {
                const cost = this.currentInteractable.cost || 0;
                let purchased = false;

                if (window.moneyWeb?.spend) { purchased = window.moneyWeb.spend(cost); } 
                else if ((window.zombiePoints || 0) >= cost) { window.zombiePoints -= cost; purchased = true; }

                if (purchased) {
                    if (window.moneyWeb?.createToken) window.moneyWeb.createToken('nacht_purchase', cost);

                    this.currentInteractable.action(this.currentInteractable);

                    this.currentInteractable.active = false;
                    if (this.currentInteractable.mesh) this.group.remove(this.currentInteractable.mesh);
                    if (this.currentInteractable.wallRef) this.walls = this.walls.filter(w => w !== this.currentInteractable.wallRef);
                    
                    // Activate the portals for this vertical transition
                    this.activatePortal(this.currentInteractable.id);

                    this.interactables = this.interactables.filter(i => i !== this.currentInteractable);
                } else {
                    if (window.SFX?.triggerUI) window.SFX.triggerUI();
                }
            }
        }

        dispose() {
            this.scene.remove(this.group);
            if (this.dustPoints) this.scene.remove(this.dustPoints);
            const promptEl = document.getElementById('nacht-prompt');
            if (promptEl) promptEl.style.display = 'none';
            if (window.aetherMechBoss) {
                window.aetherMechBoss.dispose();
                window.aetherMechBoss = null;
            }
            if (window.mechaZombieBoss) {
                window.mechaZombieBoss.dispose();
                window.mechaZombieBoss = null;
            }
        }
    }

    return NachtMapManager;
})();