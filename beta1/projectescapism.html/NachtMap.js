/**
 * NACHT MAP MANAGER: CLASSIC HORIZONTAL EDITION (ADVANCED PBR)
 * Redesigned ground-up as a horizontal 2-story progress-based layout modeled on the original Nacht.
 */

const NachtMapManager = (function () {

    class NachtMapManager {
        constructor(scene, config) {
            this.scene = scene;
            this.config = config;
            
            this.MAP_SCALE = 20.0;
            this.MAP_Y_OFFSET = -10.0;
            this.RH = 3.5; // Room Height
            this.powerOnline = false;

            this.group = new THREE.Group();
            this.group.position.y = this.MAP_Y_OFFSET;
            this.group.scale.set(this.MAP_SCALE, this.MAP_SCALE, this.MAP_SCALE);
            this.scene.add(this.group);

            this.walls = []; // Collision bounding boxes: {minX, maxX, minZ, maxZ, minY, maxY}
            this.interactables = []; // {type, x, y, z, radius, cost, text, action}
            
            this.portals = [];
            this.portalVisualsList = [];
            this.registeredPortals = {};

            // Global Map Footprint Boundaries (32 local size -> 640 world size)
            this.mapMinX = -640;
            this.mapMaxX = 640;
            this.mapMinZ = -640;
            this.mapMaxZ = 640;

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
            // Rich horror ambient glow (midnight navy)
            const ambient = new THREE.AmbientLight(0x080f1e, 0.15);
            this.scene.add(ambient);
            
            // Strong cyan-silver moonlight cast
            const dirLight = new THREE.DirectionalLight(0xd4e2ff, 0.65);
            dirLight.position.set(60, 160, 40);
            dirLight.castShadow = true;
            dirLight.shadow.mapSize.width = 2048;
            dirLight.shadow.mapSize.height = 2048;
            dirLight.shadow.bias = -0.0002;
            this.scene.add(dirLight);

            // Secondary moody crimson-violet bounce fill light
            const fillLight = new THREE.DirectionalLight(0x2a0d0d, 0.45);
            fillLight.position.set(-60, -160, -40);
            this.scene.add(fillLight);

            // Dark void fog
            this.scene.fog = new THREE.FogExp2(0x060913, 0.028);
            this.scene.background = new THREE.Color(0x060913);
        }

        initMaterials() {
            const repeatPBR = (pbr, u, v) => {
                pbr.map.repeat.set(u, v);
                pbr.bumpMap.repeat.set(u, v);
                pbr.roughnessMap.repeat.set(u, v);
                pbr.metalnessMap.repeat.set(u, v);
            };

            // --- ADVANCED DECAYED BRICK WALL ---
            const brickPBR = this._makePBRTexPairs(1024, 1024, (ctxC, ctxB, ctxR, ctxM, W, H) => {
                ctxC.fillStyle = '#24201d'; ctxC.fillRect(0,0,W,H);
                ctxB.fillStyle = '#222222'; ctxB.fillRect(0,0,W,H);
                ctxR.fillStyle = '#dddddd'; ctxR.fillRect(0,0,W,H);
                ctxM.fillStyle = '#000000'; ctxM.fillRect(0,0,W,H);

                for (let i = 0; i < 2000; i++) {
                    const gx = Math.random() * W, gy = Math.random() * H;
                    ctxC.fillStyle = Math.random() > 0.5 ? '#151312' : '#302b28';
                    ctxC.fillRect(gx, gy, 2, 2);
                }

                const bw = 64, bh = 28, gap = 4;
                for (let row = 0; row < H/(bh+gap); row++) {
                    const offset = (row % 2) * (bw/2);
                    for (let col = -2; col < W/(bw+gap)+2; col++) {
                        const x = col*(bw+gap)+offset, y = row*(bh+gap);
                        const bx = x + gap/2, by = y + gap/2;
                        if (bx + bw < 0 || bx > W || by > H) continue;

                        const rVal = Math.random();
                        let baseColor, baseH, baseR;
                        if (rVal < 0.35) {
                            baseColor = `rgb(${75 + Math.random()*25},${32 + Math.random()*12},24)`;
                            baseH = 160 + Math.floor(Math.random()*40);
                            baseR = 190 + Math.floor(Math.random()*40);
                        } else if (rVal < 0.65) {
                            baseColor = `rgb(${22 + Math.random()*15},${18 + Math.random()*8},15)`;
                            baseH = 130 + Math.floor(Math.random()*30);
                            baseR = 210 + Math.floor(Math.random()*30);
                        } else {
                            baseColor = `rgb(${45 + Math.random()*20},${42 + Math.random()*15},20)`;
                            baseH = 150 + Math.floor(Math.random()*40);
                            baseR = 180 + Math.floor(Math.random()*50);
                        }

                        ctxC.fillStyle = baseColor; ctxC.fillRect(bx, by, bw, bh);
                        ctxB.fillStyle = `rgb(${baseH},${baseH},${baseH})`; ctxB.fillRect(bx, by, bw, bh);
                        ctxR.fillStyle = `rgb(${baseR},${baseR},${baseR})`; ctxR.fillRect(bx, by, bw, bh);
                        ctxM.fillStyle = '#050505'; ctxM.fillRect(bx, by, bw, bh);

                        if (Math.random() < 0.08) {
                            ctxC.fillStyle = 'rgba(80,4,4,0.88)';
                            const bwx = bx + Math.random() * (bw - 10), bwy = by + Math.random() * (bh - 6);
                            ctxC.fillRect(bwx, bwy, 6 + Math.random() * 8, 4 + Math.random() * 6);
                            ctxR.fillStyle = '#181818';
                            ctxR.fillRect(bwx, bwy, 6 + Math.random() * 8, 4 + Math.random() * 6);
                        }
                    }
                }
            });
            this.brickMat = new THREE.MeshStandardMaterial({
                map: brickPBR.map,
                bumpMap: brickPBR.bumpMap,
                bumpScale: 0.045,
                roughnessMap: brickPBR.roughnessMap,
                metalnessMap: brickPBR.metalnessMap,
                roughness: 1.0,
                metalness: 1.0
            });
            repeatPBR(brickPBR, 12, 12);

            // --- DECAYED CONCRETE ---
            const concretePBR = this._makePBRTexPairs(1024, 1024, (ctxC, ctxB, ctxR, ctxM, W, H) => {
                ctxC.fillStyle = '#3a3a3a'; ctxC.fillRect(0,0,W,H);
                ctxB.fillStyle = '#808080'; ctxB.fillRect(0,0,W,H);
                ctxR.fillStyle = '#b8b8b8'; ctxR.fillRect(0,0,W,H);
                ctxM.fillStyle = '#101010'; ctxM.fillRect(0,0,W,H);

                for (let i = 0; i < 8; i++) {
                    const cx = Math.random()*W, cy = Math.random()*H, r = 80 + Math.random()*120;
                    const grad = ctxC.createRadialGradient(cx, cy, 10, cx, cy, r);
                    grad.addColorStop(0, Math.random() > 0.5 ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.05)');
                    grad.addColorStop(1, 'rgba(0,0,0,0)');
                    ctxC.fillStyle = grad; ctxC.beginPath(); ctxC.arc(cx, cy, r, 0, Math.PI*2); ctxC.fill();
                }

                // Add grit
                for(let i=0; i<4000; i++){
                    const rx = Math.random()*W, ry = Math.random()*H;
                    ctxC.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.15)';
                    ctxC.fillRect(rx, ry, 2, 2);
                }

                // Blood splatters
                for (let b = 0; b < 3; b++) {
                    const bx = Math.random()*W, by = Math.random()*H, br = 15 + Math.random()*30;
                    const grad = ctxC.createRadialGradient(bx, by, 2, bx, by, br);
                    grad.addColorStop(0, 'rgba(78,3,3,0.85)');
                    grad.addColorStop(1, 'rgba(0,0,0,0)');
                    ctxC.fillStyle = grad; ctxC.beginPath(); ctxC.arc(bx, by, br, 0, Math.PI*2); ctxC.fill();

                    const gradR = ctxR.createRadialGradient(bx, by, 2, bx, by, br);
                    gradR.addColorStop(0, '#101010');
                    gradR.addColorStop(1, '#b8b8b8');
                    ctxR.fillStyle = gradR; ctxR.beginPath(); ctxR.arc(bx, by, br, 0, Math.PI*2); ctxR.fill();
                }
            });
            this.concreteMat = new THREE.MeshStandardMaterial({
                map: concretePBR.map,
                bumpMap: concretePBR.bumpMap,
                bumpScale: 0.025,
                roughnessMap: concretePBR.roughnessMap,
                metalnessMap: concretePBR.metalnessMap,
                roughness: 1.0,
                metalness: 1.0
            });
            repeatPBR(concretePBR, 10, 10);

            // --- GRAINED WOOD PLANKS ---
            const woodPBR = this._makePBRTexPairs(1024, 1024, (ctxC, ctxB, ctxR, ctxM, W, H) => {
                ctxB.fillStyle = '#808080'; ctxB.fillRect(0,0,W,H);
                ctxR.fillStyle = '#b0b0b0'; ctxR.fillRect(0,0,W,H);
                ctxM.fillStyle = '#000000'; ctxM.fillRect(0,0,W,H);

                const pw = 128;
                for (let p = 0; p < W / pw; p++) {
                    const px = p * pw;
                    const colorType = Math.random();
                    let baseCol, plankRough;
                    if (colorType < 0.6) {
                        baseCol = { r: 45 + Math.floor(Math.random() * 12), g: 31 + Math.floor(Math.random() * 7), b: 17 + Math.floor(Math.random() * 4) };
                        plankRough = 170 + Math.floor(Math.random() * 25);
                    } else {
                        baseCol = { r: 40 + Math.floor(Math.random() * 10), g: 37 + Math.floor(Math.random() * 8), b: 33 + Math.floor(Math.random() * 8) };
                        plankRough = 190 + Math.floor(Math.random() * 20);
                    }

                    ctxC.fillStyle = `rgb(${baseCol.r},${baseCol.g},${baseCol.b})`; ctxC.fillRect(px, 0, pw - 2, H);
                    ctxB.fillStyle = '#909090'; ctxB.fillRect(px, 0, pw - 2, H);
                    ctxR.fillStyle = `rgb(${plankRough},${plankRough},${plankRough})`; ctxR.fillRect(px, 0, pw - 2, H);

                    // Planks grain detailing
                    ctxC.strokeStyle = `rgba(${baseCol.r - 18},${baseCol.g - 14},${baseCol.b - 8},0.35)`;
                    ctxC.lineWidth = 1.0;
                    for (let g = 0; g < pw - 4; g += 8) {
                        const gx = px + g;
                        ctxC.beginPath(); ctxC.moveTo(gx, 0);
                        for (let y = 0; y <= H; y += 40) {
                            ctxC.lineTo(gx + Math.sin(y * 0.05 + p) * 1.5, y);
                        }
                        ctxC.stroke();
                    }
                }
            });
            this.woodMat = new THREE.MeshStandardMaterial({
                map: woodPBR.map,
                bumpMap: woodPBR.bumpMap,
                bumpScale: 0.035,
                roughnessMap: woodPBR.roughnessMap,
                metalnessMap: woodPBR.metalnessMap,
                roughness: 1.0,
                metalness: 1.0
            });
            repeatPBR(woodPBR, 8, 8);

            // --- INDUSTRIAL METALS ---
            const metalPBR = this._makePBRTexPairs(1024, 1024, (ctxC, ctxB, ctxR, ctxM, W, H) => {
                ctxC.fillStyle = '#3c4046'; ctxC.fillRect(0,0,W,H);
                ctxB.fillStyle = '#808080'; ctxB.fillRect(0,0,W,H);
                ctxR.fillStyle = '#3b3b3b'; ctxR.fillRect(0,0,W,H);
                ctxM.fillStyle = '#d0d0d0'; ctxM.fillRect(0,0,W,H);

                ctxC.strokeStyle = '#1c1e22'; ctxC.lineWidth = 4;
                ctxC.beginPath(); ctxC.moveTo(0, H/2); ctxC.lineTo(W, H/2); ctxC.moveTo(W/2, 0); ctxC.lineTo(W/2, H); ctxC.stroke();

                // Scratch lines
                for (let i = 0; i < 150; i++) {
                    const sx = Math.random() * W, sy = Math.random() * H, slen = 10 + Math.random() * 20;
                    const angle = (Math.random() - 0.5) * 0.8;
                    ctxC.strokeStyle = 'rgba(255,255,255,0.15)'; ctxC.lineWidth = 1.0;
                    ctxC.beginPath(); ctxC.moveTo(sx, sy); ctxC.lineTo(sx + Math.cos(angle)*slen, sy + Math.sin(angle)*slen); ctxC.stroke();
                }

                // Iron oxide rust
                for (let r = 0; r < 8; r++) {
                    const rx = Math.random() * W, ry = Math.random() * H, rr = 30 + Math.random() * 60;
                    const grad = ctxC.createRadialGradient(rx, ry, 5, rx, ry, rr);
                    grad.addColorStop(0, 'rgba(115,46,12,0.9)');
                    grad.addColorStop(1, 'rgba(0,0,0,0)');
                    ctxC.fillStyle = grad; ctxC.beginPath(); ctxC.arc(rx, ry, rr, 0, Math.PI * 2); ctxC.fill();

                    const gradR = ctxR.createRadialGradient(rx, ry, 5, rx, ry, rr);
                    gradR.addColorStop(0, '#ededed');
                    gradR.addColorStop(1, '#3b3b3b');
                    ctxR.fillStyle = gradR; ctxR.beginPath(); ctxR.arc(rx, ry, rr, 0, Math.PI * 2); ctxR.fill();

                    const gradM = ctxM.createRadialGradient(rx, ry, 5, rx, ry, rr);
                    gradM.addColorStop(0, '#040404');
                    gradM.addColorStop(1, '#d0d0d0');
                    ctxM.fillStyle = gradM; ctxM.beginPath(); ctxM.arc(rx, ry, rr, 0, Math.PI * 2); ctxM.fill();
                }
            });
            this.metalMat = new THREE.MeshStandardMaterial({
                map: metalPBR.map,
                bumpMap: metalPBR.bumpMap,
                bumpScale: 0.045,
                roughnessMap: metalPBR.roughnessMap,
                metalnessMap: metalPBR.metalnessMap,
                roughness: 1.0,
                metalness: 1.0
            });
            repeatPBR(metalPBR, 6, 6);

            const ceilTex = this._makeTex(256, 256, (ctx, W, H) => {
                ctx.fillStyle = '#6c665c'; ctx.fillRect(0,0,W,H);
                ctx.strokeStyle = '#443f34'; ctx.lineWidth = 4; ctx.strokeRect(2,2,W-4,H-4);
            });
            this.ceilMat = new THREE.MeshStandardMaterial({ map: ceilTex, roughness: 0.92 });
            ceilTex.repeat.set(12, 12);

            this.debrisMat = new THREE.MeshStandardMaterial({ color: 0x181512, roughness: 0.95 });
            this.sandbagMat = new THREE.MeshStandardMaterial({ color: 0x423a2f, roughness: 0.92 });
            this.bloodMat = new THREE.MeshStandardMaterial({ color: 0x250101, roughness: 0.12, transparent: true, opacity: 0.85 });
        }

        buildMap() {
            const RH = this.RH;    // Room Height multiplier
            const WT = 0.8;    // Wall Thickness
            const size = 32;   // Footprint square dimension

            // 1. Base Map Foundations
            this.addFloor(0, -0.15, 0, size, size, this.concreteMat);

            // 2. Outer Perimeter Enclosure (2-Story Brick Shell)
            this.addWall(0, RH, 16 - WT/2, 32, 2*RH, WT, this.brickMat);   // South Outer Wall
            this.addWall(0, RH, -16 + WT/2, 32, 2*RH, WT, this.brickMat);  // North Outer Wall
            this.addWall(-16 + WT/2, RH, 0, WT, 2*RH, 32, this.brickMat);  // West Outer Wall
            this.addWall(16 - WT/2, RH, 0, WT, 2*RH, 32, this.brickMat);   // East Outer Wall

            // Ceiling top cover capping the entire 2-story building
            this.addCeiling(0, 2 * RH, 0, size, size);

            // =================================================================
            // GROUND FLOOR WALLS & ROOM PROGRESSION (Y: 0 -> 3.5)
            // =================================================================
            // Dividing Wall: Spawn Room to Center Reactor (Z = 0 to 16, X = 4)
            this.addWall(4.0, RH/2, 9.25, WT, RH, 13.5, this.concreteMat);
            // Door 3: Spawn to Center Reactor
            this.addInteractableDebris(4.0, RH/2, 2.5, WT, RH, 3.0, 1000, "REACTOR ACCESS (SOUTH)", 'door_r1_to_r4');

            // Dividing Wall: Spawn Room (South) to Help Room/East Corridor (North) at Z = 0, X = [4, 16]
            this.addWall(10.0, RH/2, 0, 12, RH, WT, this.concreteMat);
            // Door 1: Spawn to East Corridor
            this.addInteractableDebris(4.0, RH/2, 0, 3.0, RH, WT, 750, "HELP ARCHWAY", 'door_r1_to_r2');

            // Dividing Wall: East Corridor (X=[8,16]) to Help Room (X=[0,8]) at X = 8
            this.addWall(8.0, RH/2, -9.5, WT, RH, 13.0, this.concreteMat);
            // Door 2: East Corridor to Help Room Inner
            this.addInteractableDebris(8.0, RH/2, -3.0, WT, RH, 3.0, 1000, "HELP ROOM INNER DOOR", 'door_r2_to_r3');

            // Dividing Wall: Help Room to Center Reactor (Z = -16 to 0, X = 4)
            this.addWall(4.0, RH/2, -9.25, WT, RH, 13.5, this.concreteMat);
            // Door 4: Help Room to Center Reactor
            this.addInteractableDebris(4.0, RH/2, -2.5, WT, RH, 3.0, 1000, "REACTOR ACCESS (NORTH)", 'door_r3_to_r4');

            // Dividing Wall: West Wing to Center Reactor (Z = 0 to 16, X = -4)
            this.addWall(-4.0, RH/2, 8.0, WT, RH, 16, this.concreteMat);
            // Door 5: Center Reactor to West Wing
            this.addInteractableDebris(-4.0, RH/2, 0.0, WT, RH, 3.0, 1250, "WEST WING SECTOR", 'door_r4_to_r5');

            // Dividing Wall: West Wing (South) to Armory (North) at Z = 0, X = [-16, -4]
            this.addWall(-10.0, RH/2, 0, 12, RH, WT, this.concreteMat);

            // Dividing Wall: Armory to Center Reactor (Z = -16 to 0, X = -4)
            this.addWall(-4.0, RH/2, -8.0, WT, RH, 16, this.concreteMat);
            // Door 6: West Wing to Armory
            this.addInteractableDebris(-8.0, RH/2, -8.0, WT, RH, 3.0, 1250, "ARMORY VAULT DOOR", 'door_r5_to_r6');

            // =================================================================
            // UPPER FLOOR FLOORPLATES & PROGRESSION (Y: 3.5 -> 7.0)
            // =================================================================
            // Spawn Balcony (Room 7): Floor X = [3, 15], Z = [3, 15]
            this.addFloor(9.0, RH - 0.05, 9.0, 12.0, 12.0, this.woodMat);
            // Catwalk (Room 8): Floor X = [3, 15], Z = [-15, -3]
            this.addFloor(9.0, RH - 0.05, -9.0, 12.0, 12.0, this.woodMat);
            // West Overlook (Room 9): Floor X = [-15, -3], Z = [3, 15]
            this.addFloor(-9.0, RH - 0.05, 9.0, 12.0, 12.0, this.woodMat);
            // Command Penthouse (Room 10): Floor X = [-15, -3], Z = [-15, -3]
            this.addFloor(-9.0, RH - 0.05, -9.0, 12.0, 12.0, this.woodMat);

            // Balcony railings to prevent falling into the reactor core cutout
            // Room 7 Railings
            this.addWall(9.0, RH + 0.5, 3.0, 12, 1.0, 0.1, this.metalMat);
            this.addWall(3.0, RH + 0.5, 9.0, 0.1, 1.0, 12, this.metalMat);
            // Room 8 Railings
            this.addWall(9.0, RH + 0.5, -3.0, 12, 1.0, 0.1, this.metalMat);
            this.addWall(3.0, RH + 0.5, -9.0, 0.1, 1.0, 12, this.metalMat);
            // Room 9 Railings
            this.addWall(-9.0, RH + 0.5, 3.0, 12, 1.0, 0.1, this.metalMat);
            this.addWall(-3.0, RH + 0.5, 9.0, 0.1, 1.0, 12, this.metalMat);
            // Room 10 Railings
            this.addWall(-9.0, RH + 0.5, -3.0, 12, 1.0, 0.1, this.metalMat);
            this.addWall(-3.0, RH + 0.5, -9.0, 0.1, 1.0, 12, this.metalMat);

            // Upper Floor Dividers:
            // Door 8: Spawn Balcony to Catwalk (Z = 0, X = [3, 15])
            this.addWall(9.5, RH + RH/2, 0, 11, RH, WT, this.concreteMat);
            this.addInteractableDebris(4.0, RH + RH/2, 0, 2.0, RH, WT, 1250, "UPPER CATWALK GATE", 'door_r7_to_r8');

            // Door 10: West Overlook to Command Penthouse (Z = 0, X = [-15, -3])
            this.addWall(-9.5, RH + RH/2, 0, 11, RH, WT, this.concreteMat);
            this.addInteractableDebris(-4.0, RH + RH/2, 0, 2.0, RH, WT, 1500, "COMMAND DECK DOOR", 'door_r9_to_r10');

            // =================================================================
            // PHYSICAL STAIRCASES (STEPPED BOX GEOMETRIES)
            // =================================================================
            // Staircase 1: Spawn Room (Ground) to Balcony Room 7 (Upper)
            // Slopes up along X: X = 2 (Y=0) to X = 8 (Y=RH), Z = 12.0
            const stepsCount = 14;
            for (let i = 0; i < stepsCount; i++) {
                const t = i / (stepsCount - 1);
                const stepX = 2.0 + t * 6.0;
                const stepY = t * RH;
                const stepMesh = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.25, 2.0), this.concreteMat);
                stepMesh.position.set(stepX, stepY - 0.125, 12.0);
                stepMesh.castShadow = true;
                stepMesh.receiveShadow = true;
                this.group.add(stepMesh);
            }
            // Debris Blocker 7 at the bottom of Staircase 1
            this.addInteractableDebris(2.5, RH/2, 12.0, 2.0, RH, 2.0, 1000, "STAIRCASE BARRICADE", 'debris_r1_to_r7');

            // Staircase 2: West Wing (Ground) to West Overlook Room 9 (Upper)
            // Slopes up along X: X = -2 (Y=0) to X = -8 (Y=RH), Z = 12.0
            for (let i = 0; i < stepsCount; i++) {
                const t = i / (stepsCount - 1);
                const stepX = -2.0 - t * 6.0;
                const stepY = t * RH;
                const stepMesh = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.25, 2.0), this.concreteMat);
                stepMesh.position.set(stepX, stepY - 0.125, 12.0);
                stepMesh.castShadow = true;
                stepMesh.receiveShadow = true;
                this.group.add(stepMesh);
            }
            // Debris Blocker 9 at the bottom of Staircase 2
            this.addInteractableDebris(-2.5, RH/2, 12.0, 2.0, RH, 2.0, 1000, "WEST STAIRS DEBRIS", 'debris_r5_to_r9');

            // =================================================================
            // COOL CENTER REACTOR CORE MODEL (X=0, Z=0)
            // =================================================================
            const reactorBase = new THREE.Mesh(new THREE.BoxGeometry(3.0, 1.0, 3.0), this.metalMat);
            reactorBase.position.set(0, 0.5, 0);
            reactorBase.castShadow = true;
            reactorBase.receiveShadow = true;
            this.group.add(reactorBase);

            // Glowing glass cylinder tube
            const tubeGeo = new THREE.CylinderGeometry(0.8, 0.8, 6.0, 16);
            const tubeMat = new THREE.MeshBasicMaterial({
                color: 0x00d2ff,
                transparent: true,
                opacity: 0.35,
                side: THREE.DoubleSide
            });
            const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
            tubeMesh.position.set(0, 4.0, 0);
            this.group.add(tubeMesh);

            // Intense white/blue inner core rod
            const coreGeo = new THREE.CylinderGeometry(0.3, 0.3, 5.0, 8);
            const coreMat = new THREE.MeshStandardMaterial({
                color: 0xffffff,
                emissive: new THREE.Color(0x00a2ff),
                emissiveIntensity: 3.5
            });
            const coreMesh = new THREE.Mesh(coreGeo, coreMat);
            coreMesh.position.set(0, 4.0, 0);
            this.group.add(coreMesh);

            // Four metal corner support rods
            const rodGeo = new THREE.CylinderGeometry(0.12, 0.12, 7.5, 8);
            const rodOffsets = [[-1.2, -1.2], [-1.2, 1.2], [1.2, -1.2], [1.2, 1.2]];
            for (const offset of rodOffsets) {
                const rod = new THREE.Mesh(rodGeo, this.metalMat);
                rod.position.set(offset[0], 3.75, offset[1]);
                this.group.add(rod);
            }

            // Pulsating cyan light at reactor center
            this.addFlickerLight(0, 3.5, 0, 0x00e5ff, 2.5, 30);

            // =================================================================
            // WALLBUYS, BARRIERS, MYSTERY BOX & DECORATIONS
            // =================================================================
            // Window Barricades (Ground Floor)
            // Spawn Room
            this.addWindowBarricade(8.0, 2.0, 15.5, 0);
            this.addWindowBarricade(13.0, 2.0, 15.5, 0);
            this.addWindowBarricade(15.5, 2.0, 8.0, -Math.PI/2);
            this.addWindowBarricade(15.5, 2.0, 13.0, -Math.PI/2);
            // Help Room & Corridor
            this.addWindowBarricade(15.5, 2.0, -6.0, -Math.PI/2);
            this.addWindowBarricade(12.0, 2.0, -15.5, 0);
            // West Wing
            this.addWindowBarricade(-8.0, 2.0, 15.5, 0);
            this.addWindowBarricade(-15.5, 2.0, 8.0, Math.PI/2);
            // Armory
            this.addWindowBarricade(-15.5, 2.0, -8.0, Math.PI/2);
            this.addWindowBarricade(-12.0, 2.0, -15.5, 0);

            // Spawn Room Wallbuys & Lights
            this.addWallBuy(15.5 - 0.4, 2.0, 6.0, -Math.PI/2, 'ammo', 'Ammo Crate', 250, 'ammo');
            this.addFlickerLight(10.0, RH - 0.5, 10.0, 0xffaa11, 1.2, 15);
            this.addBloodStain(10.0, 10.0, 3.0);
            this.addSandbagWall(12.0, 0.18, 4.0, 3);

            // Help Room (Room 3) Mystery Box
            this.buildMysteryBox(4.0, 0.45, -10.0);
            this.addFlickerLight(4.0, RH - 0.5, -10.0, 0xbbff22, 1.2, 15);

            // Armory (Room 6) Wallbuys & Props
            this.addWallBuy(-15.5 + 0.4, 2.0, -6.0, Math.PI/2, 'shotgun', 'Trench Gun', 500, 'weapon');
            this.addFlickerLight(-10.0, RH - 0.5, -10.0, 0xff5511, 1.3, 16);
            this.addProp(-12.0, 0.9, -10.0, 2.0, 1.8, 1.0, this.metalMat);

            // Upper Floor Wallbuys (Balcony / Penthouse)
            this.addWallBuy(15.5 - 0.4, RH + 2.0, 10.0, -Math.PI/2, 'ar', 'Assault Rifle', 1000, 'weapon');
            this.addWallBuy(-15.5 + 0.4, RH + 2.0, -10.0, Math.PI/2, 'railgun', 'Railgun', 2500, 'weapon');

            // Atmosphere particles
            this.initDustMotes();

            // Set ceiling heights globally
            window.NachtCeilings = [
                RH * 20.0 - 10.0,
                RH * 2.0 * 20.0 - 10.0
            ];

            // Set dynamic area rooms mapping registry globally (scaled 4x)
            window.NachtSafeRooms = [
                // --- Floor 2 (Upper Floor, Y=60.0) ---
                { minX: 40, maxX: 320, minZ: 40, maxZ: 320, minY: RH * 20.0 - 10.0 + 2.0, maxY: RH * 2.0 * 20.0 - 10.0 }, // Room 7: Balcony
                { minX: 40, maxX: 320, minZ: -320, maxZ: -40, minY: RH * 20.0 - 10.0 + 2.0, maxY: RH * 2.0 * 20.0 - 10.0 }, // Room 8: Catwalk
                { minX: -320, maxX: -40, minZ: 40, maxZ: 320, minY: RH * 20.0 - 10.0 + 2.0, maxY: RH * 2.0 * 20.0 - 10.0 }, // Room 9: West Overlook
                { minX: -320, maxX: -40, minZ: -320, maxZ: -40, minY: RH * 20.0 - 10.0 + 2.0, maxY: RH * 2.0 * 20.0 - 10.0 }, // Room 10: Command Penthouse

                // --- Staircase 1 Steps (Spawn -> Balcony) ---
                { minX: 40, maxX: 70, minZ: 220, maxZ: 260, minY: -10.0, maxY: 7.5 },
                { minX: 70, maxX: 100, minZ: 220, maxZ: 260, minY: 7.5, maxY: 25.0 },
                { minX: 100, maxX: 130, minZ: 220, maxZ: 260, minY: 25.0, maxY: 42.5 },
                { minX: 130, maxX: 160, minZ: 220, maxZ: 260, minY: 42.5, maxY: 60.0 },

                // --- Staircase 2 Steps (West Wing -> Overlook) ---
                { minX: -70, maxX: -40, minZ: 220, maxZ: 260, minY: -10.0, maxY: 7.5 },
                { minX: -100, maxX: -70, minZ: 220, maxZ: 260, minY: 7.5, maxY: 25.0 },
                { minX: -130, maxX: -100, minZ: 220, maxZ: 260, minY: 25.0, maxY: 42.5 },
                { minX: -160, maxX: -130, minZ: 220, maxZ: 260, minY: 42.5, maxY: 60.0 },

                // --- Floor 1 (Ground Floor, Y=-10.0) ---
                { minX: 0, maxX: 320, minZ: 0, maxZ: 320, minY: -10.0, maxY: RH * 20.0 - 10.0 },      // Room 1: Spawn Station
                { minX: 160, maxX: 320, minZ: -320, maxZ: 0, minY: -10.0, maxY: RH * 20.0 - 10.0 },   // Room 2: East Corridor
                { minX: 0, maxX: 160, minZ: -320, maxZ: 0, minY: -10.0, maxY: RH * 20.0 - 10.0 },    // Room 3: Help Room
                { minX: -80, maxX: 80, minZ: -80, maxZ: 80, minY: -10.0, maxY: RH * 20.0 - 10.0 },    // Room 4: Center Reactor Room
                { minX: -320, maxX: 0, minZ: 0, maxZ: 320, minY: -10.0, maxY: RH * 20.0 - 10.0 },     // Room 5: West Wing
                { minX: -320, maxX: 0, minZ: -320, maxZ: 0, minY: -10.0, maxY: RH * 20.0 - 10.0 }     // Room 6: Armory
            ];
        }

        getCostAt(worldX, worldZ, worldY) {
            const yPos = worldY !== undefined ? worldY : (window.player ? window.player.position.y : 0.05);
            for (let i = 0; i < this.walls.length; i++) {
                const w = this.walls[i];
                if (worldX > w.minX && worldX < w.maxX && worldZ > w.minZ && worldZ < w.maxZ) {
                    // Only collide if height is strictly within the wall vertical bounds
                    // Shift range slightly down (-3.0) to comfortably overlap Y = -9.95 and Y = 60.05
                    if (yPos >= w.minY - 3.0 && yPos <= w.maxY - 3.0) {
                        return 255;
                    }
                }
            }
            if (worldX < this.mapMinX || worldX > this.mapMaxX || worldZ < this.mapMinZ || worldZ > this.mapMaxZ) return 255;
            return 1;
        }

        update(delta) {
            // Pulsate the central reactor core glow
            this.time = (this.time || 0) + delta;
            
            // Handle dust motes
            this.updateDustMotes(delta);

            // Handle HUD interaction prompt display
            this.updateInteractionPrompt();
        }

        updateInteractionPrompt() {
            if (!window.player) return;
            const px = window.player.position.x;
            const py = window.player.position.y;
            const pz = window.player.position.z;

            let closest = null;
            let minDist = Infinity;

            for (const it of this.interactables) {
                if (!it.active) continue;
                const dx = px - it.x;
                const dy = py - it.y;
                const dz = pz - it.z;
                const d = Math.sqrt(dx*dx + dy*dy + dz*dz);
                if (d < it.radius && d < minDist) {
                    minDist = d;
                    closest = it;
                }
            }

            this.currentInteractable = closest;
            const promptEl = document.getElementById('nacht-prompt');
            if (promptEl) {
                if (closest) {
                    promptEl.innerHTML = closest.text;
                    promptEl.style.display = 'block';
                } else {
                    promptEl.style.display = 'none';
                }
            }
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
                    
                    this.interactables = this.interactables.filter(i => i !== this.currentInteractable);
                } else {
                    if (window.SFX?.triggerUI) window.SFX.triggerUI();
                }
            }
        }

        activatePortal(id) {
            // Portal transitions are not used in horizontal layout
        }

        // ===================== HELPER BUILDERS =====================

        addWall(cx, cy, cz, width, height, depth, mat) {
            const geo = new THREE.BoxGeometry(width, height, depth);
            this._assignUVs(geo, width, height, depth);
            const mesh = new THREE.Mesh(geo, mat || this.brickMat);
            mesh.position.set(cx, cy, cz); mesh.castShadow = true; mesh.receiveShadow = true;
            this.group.add(mesh);

            const wallRef = {
                minX: (cx - width/2) * this.MAP_SCALE,
                maxX: (cx + width/2) * this.MAP_SCALE,
                minZ: (cz - depth/2) * this.MAP_SCALE,
                maxZ: (cz + depth/2) * this.MAP_SCALE,
                minY: (cy - height/2) * this.MAP_SCALE + this.MAP_Y_OFFSET,
                maxY: (cy + height/2) * this.MAP_SCALE + this.MAP_Y_OFFSET
            };
            this.walls.push(wallRef);
            return wallRef;
        }

        addCeiling(cx, cy, cz, width, depth) {
            const geo = new THREE.BoxGeometry(width, 0.15, depth);
            const mesh = new THREE.Mesh(geo, this.ceilMat);
            mesh.position.set(cx, cy - 0.075, cz); mesh.castShadow = true; mesh.receiveShadow = true;
            this.group.add(mesh);
        }

        addFloor(cx, cy, cz, width, depth, mat) {
            const geo = new THREE.BoxGeometry(width, 0.15, depth);
            const mesh = new THREE.Mesh(geo, mat || this.concreteMat);
            mesh.position.set(cx, cy + 0.075, cz); mesh.castShadow = true; mesh.receiveShadow = true;
            this.group.add(mesh);
        }

        addWindowBarricade(x, y, z, rotY) {
            // A barricaded wood window frame
            const frameGroup = new THREE.Group();
            frameGroup.position.set(x, y, z);
            frameGroup.rotation.y = rotY;
            this.group.add(frameGroup);

            // Left/Right vertical studs
            const studGeo = new THREE.BoxGeometry(0.15, 2.2, 0.15);
            const studL = new THREE.Mesh(studGeo, this.woodMat); studL.position.set(-1.0, 0, 0);
            const studR = new THREE.Mesh(studGeo, this.woodMat); studR.position.set(1.0, 0, 0);
            frameGroup.add(studL, studR);

            // Horizontal boards
            for (let i = 0; i < 4; i++) {
                const board = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.25, 0.08), this.woodMat);
                board.position.set(0, -0.7 + i * 0.45, 0.05);
                board.rotation.z = (Math.random() - 0.5) * 0.12;
                frameGroup.add(board);
            }
        }

        addInteractableDebris(cx, cy, cz, width, height, depth, cost, doorName, id) {
            const geo = new THREE.BoxGeometry(width, height, depth);
            const mesh = new THREE.Mesh(geo, this.debrisMat);
            mesh.position.set(cx, cy, cz); mesh.castShadow = true; mesh.receiveShadow = true;
            this.group.add(mesh);

            try {
                if (window.Doors?.applyDoorShader) {
                    window.Doors.applyDoorShader(mesh, { baseColor: new THREE.Color(0x2b2b33), edgeColor: new THREE.Color(0x00e5ff) });
                }
            } catch (e) { console.error(e); }

            const wallRef = {
                minX: (cx - width/2) * this.MAP_SCALE,
                maxX: (cx + width/2) * this.MAP_SCALE,
                minZ: (cz - depth/2) * this.MAP_SCALE,
                maxZ: (cz + depth/2) * this.MAP_SCALE,
                minY: (cy - height/2) * this.MAP_SCALE + this.MAP_Y_OFFSET,
                maxY: (cy + height/2) * this.MAP_SCALE + this.MAP_Y_OFFSET
            };
            this.walls.push(wallRef);

            this.interactables.push({
                type: 'debris', id: id,
                x: cx * this.MAP_SCALE, y: cy * this.MAP_SCALE + this.MAP_Y_OFFSET, z: cz * this.MAP_SCALE,
                radius: 120.0, cost: cost,
                text: `[E] UNLOCK ${doorName} [COST: ${cost}]`,
                mesh: mesh, wallRef: wallRef, active: true,
                action: (it) => {
                    if (window.SFX?.triggerExplosion) window.SFX.triggerExplosion();
                    try { if (window.Doors?.openDoor) window.Doors.openDoor(mesh, id); } catch (e) { console.error(e); }
                }
            });
        }

        addWallBuy(x, y, z, rotY, weaponId, weaponName, cost, type) {
            const geo = new THREE.PlaneGeometry(3.2, 1.2);
            const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 128;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = 'rgba(240,240,255,0.85)'; ctx.font = 'bold 36px "Courier New"';
            ctx.fillText(weaponName.toUpperCase(), 30, 50);
            ctx.fillStyle = '#ff3300'; ctx.font = 'bold 28px "Courier New"';
            ctx.fillText(`COST: ${cost}`, 30, 95);

            const tex = new THREE.CanvasTexture(canvas);
            const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(x, y, z);
            mesh.rotation.y = rotY;
            this.group.add(mesh);

            // Chalk chalk-drawing outline
            const chalk = new THREE.Mesh(new THREE.PlaneGeometry(3.3, 1.3), new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true }));
            chalk.position.set(x, y, z - 0.01 * Math.sign(z));
            chalk.rotation.y = rotY;
            this.group.add(chalk);

            this.interactables.push({
                type: 'wallbuy', weaponId: weaponId, buyType: type,
                x: x * this.MAP_SCALE, y: y * this.MAP_SCALE + this.MAP_Y_OFFSET, z: z * this.MAP_SCALE,
                radius: 120.0, cost: cost,
                text: `[E] BUY ${weaponName.toUpperCase()} [COST: ${cost}]`,
                active: true,
                action: (it) => {
                    if (window.SFX?.triggerPurchase) window.SFX.triggerPurchase();
                    if (window.player && typeof window.player.equipWeapon === 'function') {
                        window.player.equipWeapon(weaponId, type === 'ammo');
                    }
                    it.active = true; // Wallbuys stay active indefinitely
                }
            });
        }

        addFlickerLight(x, y, z, color, intensity, distance) {
            const light = new THREE.PointLight(color, intensity, distance);
            light.position.set(x, y, z);
            light.castShadow = true;
            light.shadow.bias = -0.001;
            this.group.add(light);

            // Add simple industrial caged bulb mesh
            const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), new THREE.MeshBasicMaterial({ color: color }));
            bulb.position.set(x, y, z);
            this.group.add(bulb);

            const cage = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), new THREE.MeshBasicMaterial({ color: 0x111111, wireframe: true }));
            cage.position.set(x, y, z);
            this.group.add(cage);
        }

        addBloodStain(x, z, scale) {
            const geo = new THREE.PlaneGeometry(scale, scale);
            const stain = new THREE.Mesh(geo, this.bloodMat);
            stain.position.set(x, 0.01, z);
            stain.rotation.x = -Math.PI / 2;
            stain.rotation.z = Math.random() * Math.PI * 2;
            this.group.add(stain);
        }

        addSandbagWall(x, y, z, count) {
            for (let i = 0; i < count; i++) {
                const sandbag = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.45, 0.8), this.sandbagMat);
                sandbag.position.set(x + (Math.random()-0.5)*0.2, y + i * 0.4, z + (Math.random()-0.5)*0.2);
                sandbag.rotation.y = (Math.random() - 0.5) * 0.15;
                sandbag.castShadow = true; sandbag.receiveShadow = true;
                this.group.add(sandbag);
            }
        }

        addProp(x, y, z, w, h, d, mat) {
            const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat || this.concreteMat);
            mesh.position.set(x, y + h/2, z);
            mesh.castShadow = true; mesh.receiveShadow = true;
            this.group.add(mesh);
        }

        // --- DECORATIVE PROPS ---
        addRadarDish(x, y, z) {
            const base = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1.5), this.metalMat);
            base.position.set(x, y + 0.75, z);
            this.group.add(base);

            const dish = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 0.2, 0.8, 16), this.metalMat);
            dish.position.set(x, y + 2.0, z);
            dish.rotation.x = Math.PI / 4;
            this.group.add(dish);
        }

        addSpecimenTank(x, y, z) {
            const base = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.5, 1.5), this.metalMat);
            base.position.set(x, y + 0.25, z);
            this.group.add(base);

            const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 2.2, 16), new THREE.MeshBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.3 }));
            glass.position.set(x, y + 1.6, z);
            this.group.add(glass);
        }

        // ===================== MYSTERY BOX BUILDER =====================

        buildMysteryBox(x, y, z) {
            // A long wooden military weapon chest with glowing blue details
            const boxGroup = new THREE.Group();
            boxGroup.position.set(x, y, z);
            this.group.add(boxGroup);

            this.boxMesh = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.9, 1.2), this.woodMat);
            boxGroup.add(this.boxMesh);

            const metalBraces = [
                new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.92, 1.22), this.metalMat),
                new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.92, 1.22), this.metalMat)
            ];
            metalBraces[0].position.set(-1.2, 0, 0);
            metalBraces[1].position.set(1.2, 0, 0);
            boxGroup.add(metalBraces[0], metalBraces[1]);

            // Glowing question marks basic meshes on the lid
            const qGeo = new THREE.BoxGeometry(0.3, 0.1, 0.3);
            const qMat = new THREE.MeshBasicMaterial({ color: 0x00ccff, emissive: 0x00ccff });
            const q1 = new THREE.Mesh(qGeo, qMat); q1.position.set(-0.6, 0.46, 0);
            const q2 = new THREE.Mesh(qGeo, qMat); q2.position.set(0.6, 0.46, 0);
            boxGroup.add(q1, q2);

            this.boxLight = new THREE.PointLight(0x00b3ff, 0, 8.0);
            this.boxLight.position.set(0, 0.6, 0);
            boxGroup.add(this.boxLight);

            this.interactables.push({
                type: 'mystery_box',
                x: x * this.MAP_SCALE, y: y * this.MAP_SCALE + this.MAP_Y_OFFSET, z: z * this.MAP_SCALE,
                radius: 120.0, cost: 950,
                text: `[E] SPIN MYSTERY BOX [COST: 950]`,
                active: true,
                action: (it) => {
                    if (this.boxState !== 'idle') return;
                    this.boxState = 'spinning';
                    this.boxTimer = 0;
                    this.mysteryBoxInteractable = it;
                    it.active = false; // Disable box spin interactable during spinning

                    if (window.SFX?.triggerPurchase) window.SFX.triggerPurchase();

                    // Blue beacon light pulses up
                    if (this.boxLight) this.boxLight.intensity = 2.0;

                    // Randomly select weapon after 2.5 seconds
                    const weapons = ['pistol', 'shotgun', 'ar', 'railgun'];
                    const rWep = weapons[Math.floor(Math.random() * weapons.length)];
                    this.boxWeapon = rWep;

                    setTimeout(() => {
                        this.boxState = 'ready';
                        this.boxTimer = 0;

                        // Spawn glowing weapon floating above chest
                        const wepGeo = new THREE.BoxGeometry(1.6, 0.25, 0.25);
                        const wepMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, wireframe: true });
                        this.boxWeaponMesh = new THREE.Mesh(wepGeo, wepMat);
                        this.boxWeaponMesh.position.set(x, y + 1.2, z);
                        this.group.add(this.boxWeaponMesh);

                        // Register box pickup interactable
                        this.boxPickupInteractable = {
                            type: 'box_pickup',
                            x: x * this.MAP_SCALE, y: (y + 1.2) * this.MAP_SCALE + this.MAP_Y_OFFSET, z: z * this.MAP_SCALE,
                            radius: 120.0, cost: 0,
                            text: `[E] EQUIP ${rWep.toUpperCase()} [COST: 0]`,
                            active: true,
                            action: (pit) => {
                                if (window.SFX?.triggerPurchase) window.SFX.triggerPurchase();
                                if (window.player && typeof window.player.equipWeapon === 'function') {
                                    window.player.equipWeapon(this.boxWeapon, false);
                                }
                                this.clearBoxWeapon();
                            }
                        };
                        this.interactables.push(this.boxPickupInteractable);

                        // Auto-clear weapon if player leaves it for 12 seconds
                        setTimeout(() => {
                            if (this.boxState === 'ready') this.clearBoxWeapon();
                        }, 12000);

                    }, 2500);
                }
            });
        }

        clearBoxWeapon() {
            if (this.boxWeaponMesh) {
                this.group.remove(this.boxWeaponMesh);
                this.boxWeaponMesh = null;
            }
            if (this.boxLight) this.boxLight.intensity = 0.0;
            if (this.boxPickupInteractable) {
                this.boxPickupInteractable.active = false;
                this.interactables = this.interactables.filter(i => i !== this.boxPickupInteractable);
                this.boxPickupInteractable = null;
            }
            setTimeout(() => { this.boxState = 'idle'; if (this.mysteryBoxInteractable) this.mysteryBoxInteractable.active = true; }, 3000);
        }

        // ===================== DUST MOTES PARTICLE SYSTEM =====================

        initDustMotes() {
            const COUNT = 150;
            const positions = new Float32Array(COUNT * 3);
            this.dustData = [];

            for (let i = 0; i < COUNT; i++) {
                const rx = (Math.random() - 0.5) * 32;
                const ry = Math.random() * 7.0;
                const rz = (Math.random() - 0.5) * 32;
                positions[i*3] = rx;
                positions[i*3+1] = ry;
                positions[i*3+2] = rz;

                this.dustData.push({
                    x: rx, y: ry, z: rz,
                    speedX: (Math.random() - 0.5) * 0.45,
                    speedY: (Math.random() - 0.5) * 0.25,
                    speedZ: (Math.random() - 0.5) * 0.45
                });
            }

            const geo = new THREE.BufferGeometry();
            geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            this.dustPoints = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xddffdd, size: 0.05, transparent: true, opacity: 0.25 }));
            this.scene.add(this.dustPoints);
        }

        updateDustMotes(delta) {
            if (!this.dustPoints || !this.dustData) return;
            const attr = this.dustPoints.geometry.attributes.position;
            const array = attr.array;

            for (let i = 0; i < this.dustData.length; i++) {
                const d = this.dustData[i];
                d.x += d.speedX * delta;
                d.y += d.speedY * delta;
                d.z += d.speedZ * delta;

                // Re-center if drifts out of local bounds
                if (Math.abs(d.x) > 16) d.x = -d.x;
                if (Math.abs(d.z) > 16) d.z = -d.z;
                if (d.y < 0 || d.y > 7.0) d.y = Math.random() * 7.0;

                array[i*3] = d.x;
                array[i*3+1] = d.y;
                array[i*3+2] = d.z;
            }
            attr.needsUpdate = true;
        }

        // ===================== TEXTURE GENERATORS =====================

        _makePBRTexPairs(w, h, paintFn) {
            const cColor = document.createElement('canvas'); cColor.width = w; cColor.height = h;
            const cBump = document.createElement('canvas');  cBump.width = w;  cBump.height = h;
            const cRough = document.createElement('canvas'); cRough.width = w; cRough.height = h;
            const cMetal = document.createElement('canvas'); cMetal.width = w; cMetal.height = h;
            
            paintFn(cColor.getContext('2d'), cBump.getContext('2d'), cRough.getContext('2d'), cMetal.getContext('2d'), w, h);
            
            const tColor = new THREE.CanvasTexture(cColor);
            const tBump = new THREE.CanvasTexture(cBump);
            const tRough = new THREE.CanvasTexture(cRough);
            const tMetal = new THREE.CanvasTexture(cMetal);
            
            tColor.wrapS = tColor.wrapT = THREE.RepeatWrapping;
            tBump.wrapS = tBump.wrapT = THREE.RepeatWrapping;
            tRough.wrapS = tRough.wrapT = THREE.RepeatWrapping;
            tMetal.wrapS = tMetal.wrapT = THREE.RepeatWrapping;
            
            return { map: tColor, bumpMap: tBump, roughnessMap: tRough, metalnessMap: tMetal };
        }

        _makeTex(w, h, fn) {
            const c = document.createElement('canvas'); c.width = w; c.height = h;
            fn(c.getContext('2d'), w, h);
            const t = new THREE.CanvasTexture(c);
            t.wrapS = t.wrapT = THREE.RepeatWrapping;
            return t;
        }

        _assignUVs(geom, w, h, d) {
            // Assign planar mapping coordinates based on dimensions
            const pos = geom.attributes.position;
            const uvs = [];
            for (let i = 0; i < pos.count; i++) {
                const x = pos.getX(i);
                const y = pos.getY(i);
                const z = pos.getZ(i);
                
                // Project onto bounding box planes
                if (Math.abs(x) > w/2 - 0.05) uvs.push(z / d, y / h);
                else if (Math.abs(z) > d/2 - 0.05) uvs.push(x / w, y / h);
                else uvs.push(x / w, z / d);
            }
            geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
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