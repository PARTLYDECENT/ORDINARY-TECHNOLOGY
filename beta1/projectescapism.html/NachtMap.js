/**
 * NACHT MAP MANAGER — EXACT GRAFT from assets/superguides/nacht.html
 * 10-Room Bunker. All geometry, textures, and lighting match nacht.html line-for-line.
 * Wrapped in game engine interface (collision walls, buyable doors, mystery box, wallbuys).
 */
const NachtMapManager = (function () {

    class NachtMapManager {
        constructor(scene, config) {
            this.scene = scene;
            this.config = config;

            // Scale/offset to place the nacht.html local-space bunker into game world space
            this.MAP_SCALE = 2.0;
            this.MAP_Y_OFFSET = -1.0;

            this.group = new THREE.Group();
            this.group.position.y = this.MAP_Y_OFFSET;
            this.group.scale.set(this.MAP_SCALE, this.MAP_SCALE, this.MAP_SCALE);
            this.scene.add(this.group);

            // Game engine collision + interaction state
            this.walls = [];
            this.interactables = [];
            this.portals = [];
            this.portalVisualsList = [];
            this.registeredPortals = {};
            this.currentInteractable = null;
            this.time = 0;
            this.powerOnline = false;

            // World-space map footprint
            this.mapMinX = -150;
            this.mapMaxX = 150;
            this.mapMinZ = -200;
            this.mapMaxZ = 50;

            // Mystery Box state machine
            this.boxState = 'idle';
            this.boxTimer = 0;
            this.boxWeapon = null;
            this.boxMesh = null;
            this.boxWeaponMesh = null;
            this.boxLight = null;

            // Texture + light caches
            this.textures = {};
            this.flickeringLights = [];

            // Build everything — order matches nacht.html init()
            this.generateTextures();
            this.setupLighting();
            this.buildComplex();
            this.createDustParticles();

            // Global metadata for game engine
            window.NachtCeilings = [13.0];
            window.NachtSafeRooms = [
                { minX: -25, maxX: 25, minZ: -25, maxZ: 25, minY: -1, maxY: 13 },
                { minX: 25, maxX: 75, minZ: -25, maxZ: 25, minY: -1, maxY: 13 },
                { minX: -75, maxX: -25, minZ: -25, maxZ: 25, minY: -1, maxY: 13 },
                { minX: -25, maxX: 25, minZ: -75, maxZ: -25, minY: -1, maxY: 13 },
                { minX: 25, maxX: 75, minZ: -75, maxZ: -25, minY: -1, maxY: 13 },
                { minX: -75, maxX: -25, minZ: -75, maxZ: -25, minY: -1, maxY: 13 },
                { minX: -25, maxX: 25, minZ: -125, maxZ: -75, minY: -1, maxY: 13 },
                { minX: 25, maxX: 75, minZ: -125, maxZ: -75, minY: -1, maxY: 13 },
                { minX: -25, maxX: 25, minZ: -175, maxZ: -125, minY: -1, maxY: 13 },
                { minX: -125, maxX: -75, minZ: -25, maxZ: 25, minY: -1, maxY: 13 }
            ];
        }

        // =================================================================
        // TEXTURES — Exact copy of nacht.html generateTextures() lines 173-242
        // =================================================================
        generateTextures() {
            function createNoiseCanvas(width, height, color1, color2, noiseScale, isWood, overlayText) {
                isWood = isWood || false;
                overlayText = overlayText || null;

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');

                ctx.fillStyle = color1;
                ctx.fillRect(0, 0, width, height);

                for (let i = 0; i < width; i += noiseScale) {
                    for (let j = 0; j < height; j += (isWood ? height : noiseScale)) {
                        if (Math.random() > 0.5) {
                            ctx.fillStyle = color2;
                            ctx.fillRect(i, j, noiseScale, isWood ? height : noiseScale);
                        }
                    }
                }

                const gradient = ctx.createRadialGradient(width / 2, height / 2, width / 4, width / 2, height / 2, width);
                gradient.addColorStop(0, 'rgba(0,0,0,0)');
                gradient.addColorStop(1, 'rgba(0,0,0,0.6)');
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, width, height);

                if (overlayText) {
                    ctx.font = 'bold 80px Courier New';
                    ctx.fillStyle = 'rgba(120, 0, 0, 0.8)';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.save();
                    ctx.translate(width / 2, height / 2);
                    ctx.strokeStyle = 'rgba(100, 0, 0, 0.5)';
                    ctx.lineWidth = 5;
                    for (let k = 0; k < 15; k++) {
                        ctx.beginPath();
                        ctx.moveTo(Math.random() * width - width / 2, Math.random() * height - height / 2);
                        ctx.lineTo(Math.random() * width - width / 2, Math.random() * height - height / 2);
                        ctx.stroke();
                    }
                    ctx.rotate(-0.05 + Math.random() * 0.1);
                    ctx.fillText(overlayText, 0, 0);
                    for (let k = 0; k < 20; k++) {
                        ctx.fillRect(Math.random() * 300 - 150, Math.random() * 100, 3 + Math.random() * 5, Math.random() * 150 + 50);
                    }
                    ctx.restore();
                }

                const texture = new THREE.CanvasTexture(canvas);
                texture.wrapS = THREE.RepeatWrapping;
                texture.wrapT = THREE.RepeatWrapping;
                return texture;
            }

            // nacht.html lines 232-241
            this.textures.floor = createNoiseCanvas(512, 512, '#151515', '#0a0a0a', 2);
            this.textures.floor.repeat.set(50, 50);

            this.textures.wall = createNoiseCanvas(512, 512, '#222225', '#111115', 4);
            this.textures.wall.repeat.set(2, 2);

            this.textures.wood = createNoiseCanvas(256, 256, '#2e1b15', '#1a0b08', 2, true);

            this.textures.bloodWall1 = createNoiseCanvas(512, 512, '#222225', '#111115', 4, false, 'TURN BACK');
            this.textures.bloodWall2 = createNoiseCanvas(512, 512, '#222225', '#111115', 4, false, 'HELL');

            // Shared materials built from nacht.html textures
            this.wallMat = new THREE.MeshStandardMaterial({ map: this.textures.wall, roughness: 0.9, metalness: 0.2 });
            this.floorMat = new THREE.MeshStandardMaterial({ map: this.textures.floor, roughness: 1.0 });
            this.woodMat = new THREE.MeshStandardMaterial({ map: this.textures.wood, roughness: 0.9, metalness: 0.1 });
            this.barrelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 1.0 });
            this.debrisMat = new THREE.MeshStandardMaterial({ color: 0x181512, roughness: 0.95 });

            // Ceiling reuses wall texture
            const ceilTex = createNoiseCanvas(512, 512, '#222225', '#111115', 4);
            ceilTex.repeat.set(2, 2);
            this.ceilMat = new THREE.MeshStandardMaterial({ map: ceilTex, roughness: 1.0 });

            // Blood wall materials
            this.bloodWall1Mat = new THREE.MeshStandardMaterial({ map: this.textures.bloodWall1, roughness: 0.9, metalness: 0.2 });
            this.bloodWall2Mat = new THREE.MeshStandardMaterial({ map: this.textures.bloodWall2, roughness: 0.9, metalness: 0.2 });
        }

        // =================================================================
        // LIGHTING — From nacht.html setupLighting() lines 244-283
        // Fog density: 0.035 / MAP_SCALE(20) = 0.00175 (same visual effect)
        // =================================================================
        setupLighting() {
            // Very dark ambient base (nacht.html line 246)
            const ambientLight = new THREE.AmbientLight(0x050508, 0.2);
            this.scene.add(ambientLight);
            this._ambientLight = ambientLight;

            // Cold blue moonlight (nacht.html line 250)
            const moonLight = new THREE.DirectionalLight(0x446688, 0.6);
            moonLight.position.set(50 * this.MAP_SCALE, 60 * this.MAP_SCALE, 50 * this.MAP_SCALE);
            moonLight.castShadow = true;
            moonLight.shadow.mapSize.width = 2048;
            moonLight.shadow.mapSize.height = 2048;
            moonLight.shadow.camera.near = 10;
            moonLight.shadow.camera.far = 300 * this.MAP_SCALE;
            moonLight.shadow.camera.left = -125 * this.MAP_SCALE;
            moonLight.shadow.camera.right = 125 * this.MAP_SCALE;
            moonLight.shadow.camera.top = 125 * this.MAP_SCALE;
            moonLight.shadow.camera.bottom = -125 * this.MAP_SCALE;
            this.scene.add(moonLight);
            this._moonLight = moonLight;

            // Localized room lights (nacht.html lines 264-272)
            // Positions in LOCAL coords → converted to world by addPointLight
            // R1: Warm barrel fire
            this.addPointLight(0, 1.5, -7.5, 0xff7700, 2.0, 35, true);
            // R5 (Armory): Creepy green chem light
            this.addPointLight(25, 4, -25, 0x00ff44, 1.2, 30, false);
            // R8 (Lab): Flickering fluorescent blue
            this.addPointLight(25, 4.5, -50, 0x88ccff, 1.8, 40, true);
            // R9 (Catacombs): Deep ominous red
            this.addPointLight(0, 3, -80, 0xff0000, 2.0, 50, true);

            // Fog — density scaled for 2x: 0.035 / 2 = 0.0175
            this.scene.fog = new THREE.FogExp2(0x010102, 0.0175);
            this.scene.background = new THREE.Color(0x010102);
        }

        // nacht.html addPointLight (line 274) — local→world conversion
        addPointLight(localX, localY, localZ, color, intensity, localDistance, flickers) {
            const worldX = localX * this.MAP_SCALE;
            const worldY = localY * this.MAP_SCALE + this.MAP_Y_OFFSET;
            const worldZ = localZ * this.MAP_SCALE;
            const worldDist = localDistance * this.MAP_SCALE;

            const light = new THREE.PointLight(color, intensity, worldDist);
            light.position.set(worldX, worldY, worldZ);
            light.castShadow = true;
            this.scene.add(light);

            if (flickers) {
                this.flickeringLights.push({ light, baseIntensity: intensity });
            }
        }

        // =================================================================
        // WALL BUILDERS — From nacht.html lines 285-370
        // =================================================================

        // nacht.html createWallMesh (line 285)
        createWallMesh(x, y, z, w, h, d, texType) {
            texType = texType || 'wall';
            const geometry = new THREE.BoxGeometry(w, h, d);

            let mat;
            if (texType === 'bloodWall1') mat = this.bloodWall1Mat;
            else if (texType === 'bloodWall2') mat = this.bloodWall2Mat;
            else mat = this.wallMat;

            const mesh = new THREE.Mesh(geometry, mat);
            mesh.position.set(x, y + h / 2, z);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            this.group.add(mesh);

            // Collision box in world space
            this.walls.push({
                minX: (x - w / 2) * this.MAP_SCALE,
                maxX: (x + w / 2) * this.MAP_SCALE,
                minZ: (z - d / 2) * this.MAP_SCALE,
                maxZ: (z + d / 2) * this.MAP_SCALE,
                minY: y * this.MAP_SCALE + this.MAP_Y_OFFSET,
                maxY: (y + h) * this.MAP_SCALE + this.MAP_Y_OFFSET
            });

            return mesh;
        }

        // nacht.html createPlank (line 302)
        createPlank(x, y, z, rotY, rotZ) {
            const plankGeo = new THREE.BoxGeometry(0.1, 0.4, 4.5);
            const plank = new THREE.Mesh(plankGeo, this.woodMat);
            plank.position.set(x, y, z);
            plank.rotation.y = rotY;
            plank.rotation.z = rotZ;
            plank.castShadow = true;
            this.group.add(plank);
        }

        // nacht.html addHWall (line 313) + game buyable door logic
        addHWall(startX, endX, z, type, specialTex, doorCost, doorName, doorId) {
            const length = endX - startX;
            const cx = startX + length / 2;
            const thickness = 1;
            const height = 7;
            const tex = specialTex || 'wall';

            if (type === 'solid') {
                this.createWallMesh(cx, 0, z, length + thickness, height, thickness, tex);
            } else if (type === 'door') {
                const doorW = 5;
                const sideW = (length - doorW) / 2;
                this.createWallMesh(startX + sideW / 2, 0, z, sideW + thickness, height, thickness, tex);
                this.createWallMesh(endX - sideW / 2, 0, z, sideW + thickness, height, thickness, tex);
                this.createWallMesh(cx, 4.5, z, doorW, 2.5, thickness, tex);

                // Game: buyable door blocker in the opening
                if (doorCost && doorCost > 0) {
                    this.addDoorBlocker(cx, 0, z, doorW, 4.5, thickness, doorCost, doorName, doorId);
                }
            } else if (type === 'window') {
                const winW = 6;
                const sideW = (length - winW) / 2;
                this.createWallMesh(startX + sideW / 2, 0, z, sideW + thickness, height, thickness, tex);
                this.createWallMesh(endX - sideW / 2, 0, z, sideW + thickness, height, thickness, tex);
                this.createWallMesh(cx, 0, z, winW, 1.5, thickness, tex);
                this.createWallMesh(cx, 4.5, z, winW, 2.5, thickness, tex);

                // Wooden barricades (nacht.html lines 337-339)
                this.createPlank(cx - 1.5, 2.0, z, Math.PI / 2, 0.1);
                this.createPlank(cx, 2.8, z + 0.1, Math.PI / 2, -0.2);
                this.createPlank(cx + 1.5, 3.5, z, Math.PI / 2, 0.05);
            }
        }

        // nacht.html addVWall (line 343) + game buyable door logic
        addVWall(x, startZ, endZ, type, specialTex, doorCost, doorName, doorId) {
            const length = endZ - startZ;
            const cz = startZ + length / 2;
            const thickness = 1;
            const height = 7;
            const tex = specialTex || 'wall';

            if (type === 'solid') {
                this.createWallMesh(x, 0, cz, thickness, height, length + thickness, tex);
            } else if (type === 'door') {
                const doorW = 5;
                const sideW = (length - doorW) / 2;
                this.createWallMesh(x, 0, startZ + sideW / 2, thickness, height, sideW + thickness, tex);
                this.createWallMesh(x, 0, endZ - sideW / 2, thickness, height, sideW + thickness, tex);
                this.createWallMesh(x, 4.5, cz, thickness, 2.5, doorW, tex);

                if (doorCost && doorCost > 0) {
                    this.addDoorBlocker(x, 0, cz, thickness, 4.5, doorW, doorCost, doorName, doorId);
                }
            } else if (type === 'window') {
                const winW = 6;
                const sideW = (length - winW) / 2;
                this.createWallMesh(x, 0, startZ + sideW / 2, thickness, height, sideW + thickness, tex);
                this.createWallMesh(x, 0, endZ - sideW / 2, thickness, height, sideW + thickness, tex);
                this.createWallMesh(x, 0, cz, thickness, 1.5, winW, tex);
                this.createWallMesh(x, 4.5, cz, thickness, 2.5, winW, tex);

                this.createPlank(x, 2.0, cz - 1.5, 0, 0.1);
                this.createPlank(x + 0.1, 2.8, cz, 0, -0.2);
                this.createPlank(x, 3.5, cz + 1.5, 0, 0.05);
            }
        }

        // =================================================================
        // BUILD COMPLEX — From nacht.html buildComplex() lines 372-469
        // Plus game features: buyable doors, mystery box, wall buys
        // =================================================================
        buildComplex() {
            // Massive floor (nacht.html line 374)
            const floorGeo = new THREE.PlaneGeometry(250, 250);
            const floor = new THREE.Mesh(floorGeo, this.floorMat);
            floor.rotation.x = -Math.PI / 2;
            floor.position.set(-12.5, 0, -37.5);
            floor.receiveShadow = true;
            this.group.add(floor);

            // Ceiling segments — R1 and R4 have NO ceiling (moonlight) (nacht.html lines 383-404)
            const addCeiling = (cx, cz) => {
                const cGeo = new THREE.PlaneGeometry(25, 25);
                const ceil = new THREE.Mesh(cGeo, this.ceilMat);
                ceil.rotation.x = Math.PI / 2;
                ceil.position.set(cx, 7, cz);
                this.group.add(ceil);
            };

            addCeiling(25, 0);      // R2
            addCeiling(-25, 0);     // R3
            addCeiling(25, -25);    // R5
            addCeiling(-25, -25);   // R6
            addCeiling(0, -50);     // R7
            addCeiling(25, -50);    // R8
            addCeiling(0, -75);     // R9
            addCeiling(-50, 0);     // R10

            // ======= HORIZONTAL WALLS (nacht.html lines 406-429) =======
            // Z = 12.5 (South Edge)
            this.addHWall(-62.5, -37.5, 12.5, 'solid');
            this.addHWall(-37.5, -12.5, 12.5, 'window');
            this.addHWall(-12.5, 12.5, 12.5, 'window');
            this.addHWall(12.5, 37.5, 12.5, 'solid');

            // Z = -12.5 (buyable doors to rooms 4/5/6)
            this.addHWall(-62.5, -37.5, -12.5, 'solid');
            this.addHWall(-37.5, -12.5, -12.5, 'door', null, 1000, 'WEST CORRIDOR', 'door_r3_to_r6');
            this.addHWall(-12.5, 12.5, -12.5, 'door', null, 1000, 'REACTOR CHAMBER', 'door_r1_to_r4');
            this.addHWall(12.5, 37.5, -12.5, 'door', null, 1000, 'EAST CORRIDOR', 'door_r2_to_r5');

            // Z = -37.5
            this.addHWall(-37.5, -12.5, -37.5, 'solid');
            this.addHWall(-12.5, 12.5, -37.5, 'door', null, 1250, 'NORTH FORWARD SECTOR', 'door_r4_to_r7');
            this.addHWall(12.5, 37.5, -37.5, 'solid');

            // Z = -62.5
            this.addHWall(-12.5, 12.5, -62.5, 'door', null, 1500, 'AETHER LAB ARCH', 'door_r7_to_r9');
            this.addHWall(12.5, 37.5, -62.5, 'solid');

            // Z = -87.5 (Deepest North — blood wall)
            this.addHWall(-12.5, 12.5, -87.5, 'solid', 'bloodWall2');

            // ======= VERTICAL WALLS (nacht.html lines 431-454) =======
            // X = -62.5 (Far West)
            this.addVWall(-62.5, -12.5, 12.5, 'solid');

            // X = -37.5
            this.addVWall(-37.5, -12.5, 12.5, 'door', null, 1000, 'WEST ANNEX ARCH', 'door_r3_to_r10');
            this.addVWall(-37.5, -37.5, -12.5, 'solid');

            // X = -12.5
            this.addVWall(-12.5, -12.5, 12.5, 'door', null, 750, 'WEST ANTECHAMBER', 'door_r1_to_r3');
            this.addVWall(-12.5, -37.5, -12.5, 'door', null, 1250, 'WEST INTERNAL GRID', 'door_r6_to_r4');
            this.addVWall(-12.5, -62.5, -37.5, 'solid');
            this.addVWall(-12.5, -87.5, -62.5, 'solid', 'bloodWall1');

            // X = 12.5
            this.addVWall(12.5, -12.5, 12.5, 'door', null, 750, 'EAST ANTECHAMBER', 'door_r1_to_r2');
            this.addVWall(12.5, -37.5, -12.5, 'door', null, 1250, 'EAST INTERNAL GRID', 'door_r4_to_r5');
            this.addVWall(12.5, -62.5, -37.5, 'door', null, 1250, 'NORTH-EAST LABORATORY', 'door_r7_to_r8');
            this.addVWall(12.5, -87.5, -62.5, 'solid');

            // X = 37.5 (Far East)
            this.addVWall(37.5, -12.5, 12.5, 'window');
            this.addVWall(37.5, -37.5, -12.5, 'solid');
            this.addVWall(37.5, -62.5, -37.5, 'window');

            // Decorative Pillars (nacht.html lines 457-459)
            this.addProp(-5, 0, -5, 2, 7, 2);
            this.addProp(5, 0, -5, 2, 7, 2);
            this.addProp(0, 0, -25, 3, 7, 3);

            // Burning Barrel in Spawn R1 (nacht.html lines 462-468)
            this.addBarrelFire(0, 0, -7.5);

            // ======= GAME: WALL BUYS =======
            this.addWallBuy(12.0, 2.0, 6.0, -Math.PI / 2, 'ammo', 'Ammo Crate', 250, 'ammo');
            this.addWallBuy(-50.0, 2.0, -6.0, Math.PI / 2, 'shotgun', 'Trench Gun', 500, 'weapon');
            this.addWallBuy(12.0, 2.0, -75.0, -Math.PI / 2, 'ar', 'Assault Rifle', 1000, 'weapon');
            this.addWallBuy(-12.0, 2.0, -75.0, Math.PI / 2, 'railgun', 'Railgun', 2500, 'weapon');

            // ======= GAME: MYSTERY BOX in R3 =======
            this.buildMysteryBox(-25.0, 0.45, 0.0);
        }

        // =================================================================
        // PROPS & BARREL — From nacht.html
        // =================================================================
        addProp(x, y, z, w, h, d) {
            const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), this.wallMat);
            mesh.position.set(x, y + h / 2, z);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            this.group.add(mesh);

            this.walls.push({
                minX: (x - w / 2) * this.MAP_SCALE,
                maxX: (x + w / 2) * this.MAP_SCALE,
                minZ: (z - d / 2) * this.MAP_SCALE,
                maxZ: (z + d / 2) * this.MAP_SCALE,
                minY: y * this.MAP_SCALE + this.MAP_Y_OFFSET,
                maxY: (y + h) * this.MAP_SCALE + this.MAP_Y_OFFSET
            });
        }

        addBarrelFire(x, y, z) {
            const barrelGeo = new THREE.CylinderGeometry(0.8, 0.8, 1.5, 16);
            const barrel = new THREE.Mesh(barrelGeo, this.barrelMat);
            barrel.position.set(x, y + 0.75, z);
            barrel.castShadow = true;
            this.group.add(barrel);

            this.walls.push({
                minX: (x - 0.8) * this.MAP_SCALE,
                maxX: (x + 0.8) * this.MAP_SCALE,
                minZ: (z - 0.8) * this.MAP_SCALE,
                maxZ: (z + 0.8) * this.MAP_SCALE,
                minY: y * this.MAP_SCALE + this.MAP_Y_OFFSET,
                maxY: (y + 1.5) * this.MAP_SCALE + this.MAP_Y_OFFSET
            });
        }

        // =================================================================
        // GAME: BUYABLE DOOR BLOCKERS
        // =================================================================
        addDoorBlocker(cx, y, cz, w, h, d, cost, doorName, doorId) {
            const geo = new THREE.BoxGeometry(w, h, d);
            const mesh = new THREE.Mesh(geo, this.debrisMat);
            mesh.position.set(cx, y + h / 2, cz);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            this.group.add(mesh);

            try {
                if (window.Doors && window.Doors.applyDoorShader) {
                    window.Doors.applyDoorShader(mesh, {
                        baseColor: new THREE.Color(0x2b2b33),
                        edgeColor: new THREE.Color(0x00e5ff)
                    });
                }
            } catch (e) { console.error(e); }

            const wallRef = {
                minX: (cx - w / 2) * this.MAP_SCALE,
                maxX: (cx + w / 2) * this.MAP_SCALE,
                minZ: (cz - d / 2) * this.MAP_SCALE,
                maxZ: (cz + d / 2) * this.MAP_SCALE,
                minY: y * this.MAP_SCALE + this.MAP_Y_OFFSET,
                maxY: (y + h) * this.MAP_SCALE + this.MAP_Y_OFFSET
            };
            this.walls.push(wallRef);

            const self = this;
            this.interactables.push({
                type: 'debris',
                id: doorId,
                x: cx * this.MAP_SCALE,
                y: (y + h / 2) * this.MAP_SCALE + this.MAP_Y_OFFSET,
                z: cz * this.MAP_SCALE,
                radius: 12.0,
                cost: cost,
                text: '[E] UNLOCK ' + doorName + ' [COST: ' + cost + ']',
                mesh: mesh,
                wallRef: wallRef,
                active: true,
                action: function (it) {
                    if (window.SFX && window.SFX.triggerExplosion) window.SFX.triggerExplosion();
                    try {
                        if (window.Doors && window.Doors.openDoor) window.Doors.openDoor(mesh, doorId);
                    } catch (e) { console.error(e); }
                }
            });
        }

        // =================================================================
        // GAME: WALL BUYS
        // =================================================================
        addWallBuy(x, y, z, rotY, weaponId, weaponName, cost, type) {
            const geo = new THREE.PlaneGeometry(3.2, 1.2);
            const canvas = document.createElement('canvas');
            canvas.width = 512;
            canvas.height = 128;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = 'rgba(240,240,255,0.85)';
            ctx.font = 'bold 36px "Courier New"';
            ctx.fillText(weaponName.toUpperCase(), 30, 50);
            ctx.fillStyle = '#ff3300';
            ctx.font = 'bold 28px "Courier New"';
            ctx.fillText('COST: ' + cost, 30, 95);

            const tex = new THREE.CanvasTexture(canvas);
            const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(x, y, z);
            mesh.rotation.y = rotY;
            this.group.add(mesh);

            const chalk = new THREE.Mesh(
                new THREE.PlaneGeometry(3.3, 1.3),
                new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true })
            );
            chalk.position.set(x, y, z - 0.01 * Math.sign(z));
            chalk.rotation.y = rotY;
            this.group.add(chalk);

            this.interactables.push({
                type: 'wallbuy',
                weaponId: weaponId,
                buyType: type,
                x: x * this.MAP_SCALE,
                y: y * this.MAP_SCALE + this.MAP_Y_OFFSET,
                z: z * this.MAP_SCALE,
                radius: 12.0,
                cost: cost,
                text: '[E] BUY ' + weaponName.toUpperCase() + ' [COST: ' + cost + ']',
                active: true,
                action: function (it) {
                    if (window.SFX && window.SFX.triggerPurchase) window.SFX.triggerPurchase();
                    if (window.player && typeof window.player.equipWeapon === 'function') {
                        window.player.equipWeapon(weaponId, type === 'ammo');
                    }
                    it.active = true;
                }
            });
        }

        // =================================================================
        // GAME: MYSTERY BOX
        // =================================================================
        buildMysteryBox(x, y, z) {
            const boxGroup = new THREE.Group();
            boxGroup.position.set(x, y, z);
            this.group.add(boxGroup);

            this.boxMesh = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.9, 1.2), this.woodMat);
            boxGroup.add(this.boxMesh);

            const brace1 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.92, 1.22), this.barrelMat);
            const brace2 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.92, 1.22), this.barrelMat);
            brace1.position.set(-1.2, 0, 0);
            brace2.position.set(1.2, 0, 0);
            boxGroup.add(brace1, brace2);

            const qMat = new THREE.MeshBasicMaterial({ color: 0x00ccff });
            const q1 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.3), qMat);
            const q2 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.3), qMat);
            q1.position.set(-0.6, 0.46, 0);
            q2.position.set(0.6, 0.46, 0);
            boxGroup.add(q1, q2);

            this.boxLight = new THREE.PointLight(0x00b3ff, 0, 8.0);
            this.boxLight.position.set(0, 0.6, 0);
            boxGroup.add(this.boxLight);

            const self = this;
            this.interactables.push({
                type: 'mystery_box',
                x: x * this.MAP_SCALE,
                y: y * this.MAP_SCALE + this.MAP_Y_OFFSET,
                z: z * this.MAP_SCALE,
                radius: 12.0,
                cost: 950,
                text: '[E] SPIN MYSTERY BOX [COST: 950]',
                active: true,
                action: function (it) {
                    if (self.boxState !== 'idle') return;
                    self.boxState = 'spinning';
                    self.boxTimer = 0;
                    self.mysteryBoxInteractable = it;
                    it.active = false;

                    if (window.SFX && window.SFX.triggerPurchase) window.SFX.triggerPurchase();
                    if (self.boxLight) self.boxLight.intensity = 2.0;

                    const weapons = ['pistol', 'shotgun', 'ar', 'railgun'];
                    const rWep = weapons[Math.floor(Math.random() * weapons.length)];
                    self.boxWeapon = rWep;

                    setTimeout(function () {
                        self.boxState = 'ready';
                        self.boxTimer = 0;

                        const wepGeo = new THREE.BoxGeometry(1.6, 0.25, 0.25);
                        const wepMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, wireframe: true });
                        self.boxWeaponMesh = new THREE.Mesh(wepGeo, wepMat);
                        self.boxWeaponMesh.position.set(x, y + 1.2, z);
                        self.group.add(self.boxWeaponMesh);

                        self.boxPickupInteractable = {
                            type: 'box_pickup',
                            x: x * self.MAP_SCALE,
                            y: (y + 1.2) * self.MAP_SCALE + self.MAP_Y_OFFSET,
                            z: z * self.MAP_SCALE,
                            radius: 12.0,
                            cost: 0,
                            text: '[E] EQUIP ' + rWep.toUpperCase() + ' [COST: 0]',
                            active: true,
                            action: function (pit) {
                                if (window.SFX && window.SFX.triggerPurchase) window.SFX.triggerPurchase();
                                if (window.player && typeof window.player.equipWeapon === 'function') {
                                    window.player.equipWeapon(self.boxWeapon, false);
                                }
                                self.clearBoxWeapon();
                            }
                        };
                        self.interactables.push(self.boxPickupInteractable);

                        setTimeout(function () {
                            if (self.boxState === 'ready') self.clearBoxWeapon();
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
                this.interactables = this.interactables.filter(function (i) { return i !== this.boxPickupInteractable; }.bind(this));
                this.boxPickupInteractable = null;
            }
            const self = this;
            setTimeout(function () {
                self.boxState = 'idle';
                if (self.mysteryBoxInteractable) self.mysteryBoxInteractable.active = true;
            }, 3000);
        }

        // =================================================================
        // DUST PARTICLES — From nacht.html createDustParticles() lines 471-494
        // Added to GROUP (not scene) so particles scale with the bunker
        // =================================================================
        createDustParticles() {
            const particleCount = 5000;
            const posArray = new Float32Array(particleCount * 3);

            for (let i = 0; i < particleCount * 3; i += 3) {
                posArray[i] = (Math.random() - 0.5) * 150;
                posArray[i + 1] = Math.random() * 7;
                posArray[i + 2] = (Math.random() - 0.5) * 150 - 37.5;
            }

            const particleGeo = new THREE.BufferGeometry();
            particleGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
            const particleMat = new THREE.PointsMaterial({
                size: 0.04,
                color: 0x777777,
                transparent: true,
                opacity: 0.4,
                blending: THREE.AdditiveBlending
            });

            this.dustPoints = new THREE.Points(particleGeo, particleMat);
            this.group.add(this.dustPoints);
        }

        updateDustParticles(delta) {
            if (!this.dustPoints) return;

            // Slow rotation (nacht.html line 620)
            this.dustPoints.rotation.y += 0.02 * delta;

            const positions = this.dustPoints.geometry.attributes.position.array;
            for (let i = 1; i < positions.length; i += 3) {
                positions[i] -= 0.05 * delta;
                if (positions[i] < 0) positions[i] = 7;
            }
            this.dustPoints.geometry.attributes.position.needsUpdate = true;
        }

        // =================================================================
        // GAME ENGINE INTERFACE
        // =================================================================

        getCostAt(worldX, worldZ, worldY) {
            const yPos = worldY !== undefined ? worldY : (window.player ? window.player.position.y : 0.05);
            for (let i = 0; i < this.walls.length; i++) {
                const w = this.walls[i];
                if (worldX > w.minX && worldX < w.maxX && worldZ > w.minZ && worldZ < w.maxZ) {
                    if (yPos >= w.minY - 3.0 && yPos <= w.maxY - 3.0) {
                        return 255;
                    }
                }
            }
            if (worldX < this.mapMinX || worldX > this.mapMaxX || worldZ < this.mapMinZ || worldZ > this.mapMaxZ) return 255;
            return 1;
        }

        // FIXED: Correct signature matching game engine call: update(position, delta, camera)
        update(position, delta, camera) {
            // Handle case where old call convention is used (just delta)
            if (typeof position === 'number') {
                delta = position;
            }
            if (delta === undefined || delta === null || typeof delta !== 'number' || isNaN(delta)) {
                delta = 0.016;
            }

            this.time = (this.time || 0) + delta;

            // Animate flickering lights (nacht.html lines 613-616)
            for (let i = 0; i < this.flickeringLights.length; i++) {
                const item = this.flickeringLights[i];
                item.light.intensity = item.baseIntensity * (0.8 + Math.random() * 0.4);
                if (Math.random() > 0.95) item.light.intensity *= 0.1;
            }

            this.updateDustParticles(delta);
            this.updateInteractionPrompt();
        }

        updateInteractionPrompt() {
            if (!window.player) return;
            const px = window.player.position.x;
            const py = window.player.position.y;
            const pz = window.player.position.z;

            let closest = null;
            let minDist = Infinity;

            for (let i = 0; i < this.interactables.length; i++) {
                const it = this.interactables[i];
                if (!it.active) continue;
                const dx = px - it.x;
                const dy = py - it.y;
                const dz = pz - it.z;
                const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
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

                if (window.moneyWeb && window.moneyWeb.spend) {
                    purchased = window.moneyWeb.spend(cost);
                } else if ((window.zombiePoints || 0) >= cost) {
                    window.zombiePoints -= cost;
                    purchased = true;
                }

                if (purchased) {
                    if (window.moneyWeb && window.moneyWeb.createToken) window.moneyWeb.createToken('nacht_purchase', cost);

                    this.currentInteractable.action(this.currentInteractable);

                    this.currentInteractable.active = false;
                    if (this.currentInteractable.mesh) this.group.remove(this.currentInteractable.mesh);
                    if (this.currentInteractable.wallRef) {
                        this.walls = this.walls.filter(function (w) { return w !== this.currentInteractable.wallRef; }.bind(this));
                    }

                    this.interactables = this.interactables.filter(function (i) { return i !== this.currentInteractable; }.bind(this));
                } else {
                    if (window.SFX && window.SFX.triggerUI) window.SFX.triggerUI();
                }
            }
        }

        activatePortal(id) {
            // Not used in single-floor horizontal layout
        }

        dispose() {
            this.scene.remove(this.group);

            // Remove lights added to scene
            for (let i = 0; i < this.flickeringLights.length; i++) {
                if (this.flickeringLights[i].light) {
                    this.scene.remove(this.flickeringLights[i].light);
                }
            }
            if (this._ambientLight) this.scene.remove(this._ambientLight);
            if (this._moonLight) this.scene.remove(this._moonLight);

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