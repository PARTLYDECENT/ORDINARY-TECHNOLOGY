/**
 * NACHT MAP MANAGER: VERTICAL CITADEL EDITION (ADVANCED PBR)
 * 10-Floor/Room unlockable vertical layout with window barricades in every zone.
 */

const NachtMapManager = (function () {

    class NachtMapManager {
        constructor(scene, config) {
            this.scene = scene;
            this.config = config;
            
            this.MAP_SCALE = 20.0;
            this.MAP_Y_OFFSET = -10.0;
            this.RH = 3.5; // lower the ceilings (was 4.5)
            this.powerOnline = false;

            this.group = new THREE.Group();
            this.group.position.y = this.MAP_Y_OFFSET;
            this.group.scale.set(this.MAP_SCALE, this.MAP_SCALE, this.MAP_SCALE); // Scale the entire map 20x in all directions
            this.scene.add(this.group);

            this.walls = []; // Collision bounding boxes: {minX, maxX, minZ, maxZ, minY, maxY}
            this.interactables = []; // {type, x, y, z, radius, cost, text, action}

            const RH = this.RH;
            // Glowing cybernetic portals for vertical level transitions
            this.portals = [];
            this.portalVisualsList = [];
            this.registeredPortals = {
                'debris_r2_to_r3': [
                    { from: {x: 12, y: 0.05, z: -12}, to: {x: 12, y: RH + 0.05, z: -9}, type: 'up', color: 0x00ffcc },
                    { from: {x: 12, y: RH + 0.05, z: -12}, to: {x: 12, y: 0.05, z: -9}, type: 'down', color: 0xff00ff }
                ],
                'hatch_r4_to_r5': [
                    { from: {x: -12, y: RH + 0.05, z: -12}, to: {x: -12, y: RH * 2 + 0.05, z: -9}, type: 'up', color: 0x00ffcc },
                    { from: {x: -12, y: RH * 2 + 0.05, z: -12}, to: {x: -12, y: RH + 0.05, z: -9}, type: 'down', color: 0xff00ff }
                ],
                'debris_r7_to_r8': [
                    { from: {x: 12, y: RH * 3 + 0.05, z: -12}, to: {x: 12, y: RH * 4 + 0.05, z: -9}, type: 'up', color: 0x00ffcc },
                    { from: {x: 12, y: RH * 4 + 0.05, z: -12}, to: {x: 12, y: RH * 3 + 0.05, z: -9}, type: 'down', color: 0xff00ff }
                ],
                'hatch_r9_to_r10': [
                    { from: {x: -12, y: RH * 4 + 0.05, z: -12}, to: {x: -12, y: RH * 5 + 0.05, z: -9}, type: 'up', color: 0x00ffcc },
                    { from: {x: -12, y: RH * 5 + 0.05, z: -12}, to: {x: -12, y: RH * 4 + 0.05, z: -9}, type: 'down', color: 0xff00ff }
                ],
                'door_r11_to_r10': [
                    { from: {x: 0, y: RH * 5 + 0.05, z: 8}, to: {x: 0, y: RH * 6 + 0.05, z: 0}, type: 'up', color: 0xffff00 },
                    { from: {x: 0, y: RH * 6 + 0.05, z: 8}, to: {x: 0, y: RH * 5 + 0.05, z: 6}, type: 'down', color: 0xff00ff }
                ]
            };

            // Global Map Footprint Boundaries (40x larger)
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

            // Secondary moody crimson-violet bounce fill light from opposite angle
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
            const brickPBR = this._makePBRTexPairs(2048, 2048, (ctxC, ctxB, ctxR, ctxM, W, H) => {
                // Base mortar
                ctxC.fillStyle = '#24201d'; ctxC.fillRect(0,0,W,H);
                ctxB.fillStyle = '#222222'; ctxB.fillRect(0,0,W,H);
                ctxR.fillStyle = '#dddddd'; ctxR.fillRect(0,0,W,H); // Mortar is rough
                ctxM.fillStyle = '#000000'; ctxM.fillRect(0,0,W,H);

                // Add grit to mortar
                for (let i = 0; i < 4000; i++) {
                    const gx = Math.random() * W, gy = Math.random() * H;
                    ctxC.fillStyle = Math.random() > 0.5 ? '#151312' : '#302b28';
                    ctxC.fillRect(gx, gy, 2, 2);
                }

                const bw = 128, bh = 56, gap = 8;
                for (let row = 0; row < H/(bh+gap); row++) {
                    const offset = (row % 2) * (bw/2);
                    for (let col = -2; col < W/(bw+gap)+2; col++) {
                        const x = col*(bw+gap)+offset, y = row*(bh+gap);
                        const bx = x + gap/2, by = y + gap/2;

                        // Skip out of bounds
                        if (bx + bw < 0 || bx > W || by > H) continue;

                        // Multi-palette brick selection
                        const rVal = Math.random();
                        let baseColor, baseH, baseR;
                        if (rVal < 0.35) {
                            // Classic dirty brick
                            baseColor = `rgb(${75 + Math.random()*25},${32 + Math.random()*12},24)`;
                            baseH = 160 + Math.floor(Math.random()*40);
                            baseR = 190 + Math.floor(Math.random()*40);
                        } else if (rVal < 0.65) {
                            // Burned soot brick
                            baseColor = `rgb(${22 + Math.random()*15},${18 + Math.random()*8},15)`;
                            baseH = 130 + Math.floor(Math.random()*30);
                            baseR = 210 + Math.floor(Math.random()*30);
                        } else if (rVal < 0.85) {
                            // Mossy decay brick
                            baseColor = `rgb(${45 + Math.random()*20},${42 + Math.random()*15},20)`;
                            baseH = 150 + Math.floor(Math.random()*40);
                            baseR = 180 + Math.floor(Math.random()*50);
                        } else {
                            // Pale sand brick
                            baseColor = `rgb(${100 + Math.random()*25},${65 + Math.random()*15},42)`;
                            baseH = 175 + Math.floor(Math.random()*45);
                            baseR = 160 + Math.floor(Math.random()*40);
                        }

                        // Fill base brick
                        ctxC.fillStyle = baseColor; ctxC.fillRect(bx, by, bw, bh);
                        ctxB.fillStyle = `rgb(${baseH},${baseH},${baseH})`; ctxB.fillRect(bx, by, bw, bh);
                        ctxR.fillStyle = `rgb(${baseR},${baseR},${baseR})`; ctxR.fillRect(bx, by, bw, bh);
                        ctxM.fillStyle = '#050505'; ctxM.fillRect(bx, by, bw, bh);

                        // Micro-pores / texture noise on the brick face
                        for (let p = 0; p < 80; p++) {
                            const px = bx + Math.random() * bw, py = by + Math.random() * bh;
                            ctxC.fillStyle = Math.random() > 0.5 ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.06)';
                            ctxC.fillRect(px, py, 2, 1);
                        }

                        // Chipped corners
                        if (Math.random() < 0.45) {
                            ctxC.fillStyle = '#24201d';
                            ctxB.fillStyle = '#222222';
                            ctxR.fillStyle = '#dddddd';
                            const side = Math.random();
                            ctxC.beginPath();
                            ctxB.beginPath();
                            ctxR.beginPath();
                            const chipSize = 3 + Math.random() * 6;
                            if (side < 0.25) {
                                // Top Left
                                ctxC.moveTo(bx, by); ctxC.lineTo(bx + chipSize, by); ctxC.lineTo(bx, by + chipSize);
                                ctxB.moveTo(bx, by); ctxB.lineTo(bx + chipSize, by); ctxB.lineTo(bx, by + chipSize);
                                ctxR.moveTo(bx, by); ctxR.lineTo(bx + chipSize, by); ctxR.lineTo(bx, by + chipSize);
                            } else if (side < 0.5) {
                                // Top Right
                                ctxC.moveTo(bx + bw, by); ctxC.lineTo(bx + bw - chipSize, by); ctxC.lineTo(bx + bw, by + chipSize);
                                ctxB.moveTo(bx + bw, by); ctxB.lineTo(bx + bw - chipSize, by); ctxB.lineTo(bx + bw, by + chipSize);
                                ctxR.moveTo(bx + bw, by); ctxR.lineTo(bx + bw - chipSize, by); ctxR.lineTo(bx + bw, by + chipSize);
                            } else if (side < 0.75) {
                                // Bottom Left
                                ctxC.moveTo(bx, by + bh); ctxC.lineTo(bx + chipSize, by + bh); ctxC.lineTo(bx, by + bh - chipSize);
                                ctxB.moveTo(bx, by + bh); ctxB.lineTo(bx + chipSize, by + bh); ctxB.lineTo(bx, by + bh - chipSize);
                                ctxR.moveTo(bx, by + bh); ctxR.lineTo(bx + chipSize, by + bh); ctxR.lineTo(bx, by + bh - chipSize);
                            } else {
                                // Bottom Right
                                ctxC.moveTo(bx + bw, by + bh); ctxC.lineTo(bx + bw - chipSize, by + bh); ctxC.lineTo(bx + bw, by + bh - chipSize);
                                ctxB.moveTo(bx + bw, by + bh); ctxB.lineTo(bx + bw - chipSize, by + bh); ctxB.lineTo(bx + bw, by + bh - chipSize);
                                ctxR.moveTo(bx + bw, by + bh); ctxR.lineTo(bx + bw - chipSize, by + bh); ctxR.lineTo(bx + bw, by + bh - chipSize);
                            }
                            ctxC.fill(); ctxB.fill(); ctxR.fill();
                        }

                        // Brick fractures/cracks
                        if (Math.random() < 0.22) {
                            ctxC.strokeStyle = 'rgba(10,8,8,0.7)'; ctxC.lineWidth = 1;
                            ctxB.strokeStyle = '#101010'; ctxB.lineWidth = 1.5;
                            let cx = bx + 5 + Math.random() * (bw - 10), cy = by + 2;
                            ctxC.beginPath(); ctxC.moveTo(cx, cy);
                            ctxB.beginPath(); ctxB.moveTo(cx, cy);
                            const steps = 3 + Math.random() * 4;
                            for (let s = 0; s < steps; s++) {
                                cx += (Math.random() - 0.5) * 8;
                                cy += bh / steps;
                                ctxC.lineTo(cx, cy); ctxB.lineTo(cx, cy);
                            }
                            ctxC.stroke(); ctxB.stroke();
                        }

                        // Shiny wet blood stains on individual bricks
                        if (Math.random() < 0.08) {
                            ctxC.fillStyle = 'rgba(80,4,4,0.88)';
                            const bwx = bx + Math.random() * (bw - 15), bwy = by + Math.random() * (bh - 10);
                            ctxC.fillRect(bwx, bwy, 8 + Math.random() * 12, 6 + Math.random() * 8);
                            // Paint very shiny spot on roughness map (low roughness = dark in map)
                            ctxR.fillStyle = '#181818';
                            ctxR.fillRect(bwx, bwy, 8 + Math.random() * 12, 6 + Math.random() * 8);
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
            repeatPBR(brickPBR, 100, 100);

            // --- DECAYED CONCRETE ---
            const concretePBR = this._makePBRTexPairs(2048, 2048, (ctxC, ctxB, ctxR, ctxM, W, H) => {
                // Base Concrete color, height, roughness, metalness
                ctxC.fillStyle = '#3a3a3a'; ctxC.fillRect(0,0,W,H);
                ctxB.fillStyle = '#808080'; ctxB.fillRect(0,0,W,H);
                ctxR.fillStyle = '#b8b8b8'; ctxR.fillRect(0,0,W,H); // rough concrete
                ctxM.fillStyle = '#101010'; ctxM.fillRect(0,0,W,H); // non-metal with tiny mineral specks

                // Concrete cloudiness/staining (large patches)
                for (let i = 0; i < 15; i++) {
                    const cx = Math.random()*W, cy = Math.random()*H, r = 100 + Math.random()*200;
                    const grad = ctxC.createRadialGradient(cx, cy, 10, cx, cy, r);
                    const shade = Math.random() > 0.5 ? '0,0,0' : '255,255,255';
                    const opacity = 0.05 + Math.random()*0.12;
                    grad.addColorStop(0, `rgba(${shade},${opacity})`);
                    grad.addColorStop(1, 'rgba(0,0,0,0)');
                    ctxC.fillStyle = grad; ctxC.beginPath(); ctxC.arc(cx, cy, r, 0, Math.PI*2); ctxC.fill();
                }

                // Add concrete grit
                for(let i=0; i<8000; i++){
                    const rx = Math.random()*W, ry = Math.random()*H;
                    ctxC.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.18)';
                    ctxC.fillRect(rx, ry, 2, 2);
                    
                    const bhValue = 110 + Math.floor(Math.random()*36);
                    ctxB.fillStyle = `rgb(${bhValue},${bhValue},${bhValue})`;
                    ctxB.fillRect(rx, ry, 1, 1);
                }

                // Spiderweb branching cracks helper
                const drawCrack = (x1, y1, length, angle, depth) => {
                    let cx = x1, cy = y1;
                    ctxC.lineWidth = 1.2; ctxB.lineWidth = 1.8;
                    ctxC.strokeStyle = '#1d1d1d'; ctxB.strokeStyle = '#202020'; // bump indent
                    ctxC.beginPath(); ctxC.moveTo(cx, cy);
                    ctxB.beginPath(); ctxB.moveTo(cx, cy);
                    const segments = 6 + Math.floor(Math.random()*6);
                    for (let j = 0; j < segments; j++) {
                        cx += Math.cos(angle) * (length / segments) + (Math.random() - 0.5) * 12;
                        cy += Math.sin(angle) * (length / segments) + (Math.random() - 0.5) * 12;
                        ctxC.lineTo(cx, cy); ctxB.lineTo(cx, cy);
                        
                        // Small branch
                        if (Math.random() < 0.2 && depth < 2) {
                            drawCrack(cx, cy, length * 0.4, angle + (Math.random() - 0.5) * 1.6, depth + 1);
                        }
                    }
                    ctxC.stroke(); ctxB.stroke();
                };

                // Draw several large structural cracks
                for (let c = 0; c < 10; c++) {
                    drawCrack(Math.random()*W, Math.random()*H, 80 + Math.random()*150, Math.random()*Math.PI*2, 0);
                }

                // Vertical water stains/leak residue
                for (let s = 0; s < 12; s++) {
                    const sx = Math.random()*W, sy = Math.random()*(H/2), sw = 8 + Math.random()*24, sh = 200 + Math.random()*400;
                    const grad = ctxC.createLinearGradient(sx, sy, sx, sy + sh);
                    grad.addColorStop(0, 'rgba(38,30,22,0.4)');
                    grad.addColorStop(0.3, 'rgba(46,38,30,0.25)');
                    grad.addColorStop(1, 'rgba(0,0,0,0)');
                    ctxC.fillStyle = grad; ctxC.fillRect(sx, sy, sw, sh);
                }

                // Dark wet mold patches
                for (let m = 0; m < 8; m++) {
                    const mx = Math.random()*W, my = Math.random()*H, mr = 40 + Math.random()*70;
                    const grad = ctxC.createRadialGradient(mx, my, 5, mx, my, mr);
                    grad.addColorStop(0, 'rgba(18,24,12,0.55)');
                    grad.addColorStop(1, 'rgba(0,0,0,0)');
                    ctxC.fillStyle = grad; ctxC.beginPath(); ctxC.arc(mx, my, mr, 0, Math.PI*2); ctxC.fill();
                    
                    // Make mold shiny/wet
                    const gradR = ctxR.createRadialGradient(mx, my, 5, mx, my, mr);
                    gradR.addColorStop(0, '#222222'); // very shiny/wet
                    gradR.addColorStop(1, '#b8b8b8'); // back to normal rough
                    ctxR.fillStyle = gradR; ctxR.beginPath(); ctxR.arc(mx, my, mr, 0, Math.PI*2); ctxR.fill();
                }

                // Blood splatters directly baked onto the concrete
                for (let b = 0; b < 4; b++) {
                    const bx = Math.random()*W, by = Math.random()*H, br = 20 + Math.random()*45;
                    const grad = ctxC.createRadialGradient(bx, by, 2, bx, by, br);
                    grad.addColorStop(0, 'rgba(78,3,3,0.85)');
                    grad.addColorStop(0.4, 'rgba(68,2,2,0.65)');
                    grad.addColorStop(1, 'rgba(0,0,0,0)');
                    ctxC.fillStyle = grad; ctxC.beginPath(); ctxC.arc(bx, by, br, 0, Math.PI*2); ctxC.fill();

                    // Make blood very wet (roughness = 0.1)
                    const gradR = ctxR.createRadialGradient(bx, by, 2, bx, by, br);
                    gradR.addColorStop(0, '#101010');
                    gradR.addColorStop(0.7, '#252525');
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
            repeatPBR(concretePBR, 100, 100);

            // --- GRAINED WOOD PLANKS ---
            const woodPBR = this._makePBRTexPairs(2048, 2048, (ctxC, ctxB, ctxR, ctxM, W, H) => {
                ctxB.fillStyle = '#808080'; ctxB.fillRect(0,0,W,H);
                ctxR.fillStyle = '#b0b0b0'; ctxR.fillRect(0,0,W,H); // base wood roughness ~0.7
                ctxM.fillStyle = '#000000'; ctxM.fillRect(0,0,W,H); // wood is non-metallic

                const pw = 256; // 8 planks across 2048 width
                for (let p = 0; p < W / pw; p++) {
                    const px = p * pw;
                    // Mix clean wood and aged weathered grey planks
                    const colorType = Math.random();
                    let baseCol, plankRough;
                    if (colorType < 0.6) {
                        // Warm rotten brown wood
                        baseCol = {
                            r: 45 + Math.floor(Math.random() * 12),
                            g: 31 + Math.floor(Math.random() * 7),
                            b: 17 + Math.floor(Math.random() * 4)
                        };
                        plankRough = 170 + Math.floor(Math.random() * 25);
                    } else {
                        // Weathered grey rotting wood
                        baseCol = {
                            r: 40 + Math.floor(Math.random() * 10),
                            g: 37 + Math.floor(Math.random() * 8),
                            b: 33 + Math.floor(Math.random() * 8)
                        };
                        plankRough = 190 + Math.floor(Math.random() * 20);
                    }

                    // Fill plank
                    ctxC.fillStyle = `rgb(${baseCol.r},${baseCol.g},${baseCol.b})`; ctxC.fillRect(px, 0, pw - 3, H);
                    ctxB.fillStyle = '#909090'; ctxB.fillRect(px, 0, pw - 3, H);
                    ctxR.fillStyle = `rgb(${plankRough},${plankRough},${plankRough})`; ctxR.fillRect(px, 0, pw - 3, H);

                    // Wood grains (wavy vertical lines)
                    ctxC.strokeStyle = `rgba(${baseCol.r - 18},${baseCol.g - 14},${baseCol.b - 8},0.35)`;
                    ctxC.lineWidth = 1.0;
                    ctxB.strokeStyle = '#858585';
                    ctxB.lineWidth = 1.0;

                    // Knot coords
                    const knotY = 100 + Math.random() * (H - 200), knotX = px + 25 + Math.random() * (pw - 50);
                    const hasKnot = Math.random() < 0.65;

                    for (let g = 0; g < pw - 4; g += 5) {
                        const gx = px + g;
                        ctxC.beginPath(); ctxB.beginPath();
                        ctxC.moveTo(gx, 0); ctxB.moveTo(gx, 0);
                        
                        for (let y = 0; y <= H; y += 20) {
                            let tx = gx;
                            if (hasKnot) {
                                // Distort grain lines around wood knot center
                                const dy = y - knotY;
                                const dx = gx - knotX;
                                const distSq = dx * dx + dy * dy;
                                if (distSq < 2500) {
                                    const force = (1.0 - Math.sqrt(distSq) / 50) * 15;
                                    tx += dx > 0 ? force : -force;
                                }
                            }
                            // Add slight organic wiggle
                            tx += Math.sin(y * 0.05 + p) * 1.5;
                            ctxC.lineTo(tx, y); ctxB.lineTo(tx, y);
                        }
                        ctxC.stroke(); ctxB.stroke();
                    }

                    // Paint the knot itself (concentric rings)
                    if (hasKnot) {
                        ctxC.fillStyle = `rgba(${baseCol.r - 24},${baseCol.g - 18},${baseCol.b - 12},0.8)`;
                        ctxC.beginPath(); ctxC.arc(knotX, knotY, 12, 0, Math.PI*2); ctxC.fill();
                        ctxB.fillStyle = '#656565';
                        ctxB.beginPath(); ctxB.arc(knotX, knotY, 12, 0, Math.PI*2); ctxB.fill();
                        
                        ctxC.strokeStyle = `rgba(${baseCol.r - 28},${baseCol.g - 20},${baseCol.b - 15},0.9)`;
                        ctxC.lineWidth = 1.5;
                        ctxC.beginPath(); ctxC.arc(knotX, knotY, 7, 0, Math.PI*2); ctxC.stroke();
                        ctxC.beginPath(); ctxC.arc(knotX, knotY, 16, 0, Math.PI*2); ctxC.stroke();
                    }

                    // Splinters & splits on board ends
                    for (let s = 0; s < 4; s++) {
                        const splitY = Math.random() > 0.5 ? 0 : H;
                        const splitX = px + 10 + Math.random() * (pw - 20);
                        const splitLen = 20 + Math.random() * 50;
                        ctxC.strokeStyle = '#15100a'; ctxC.lineWidth = 1.5;
                        ctxB.strokeStyle = '#202020'; ctxB.lineWidth = 2.0;
                        ctxC.beginPath(); ctxC.moveTo(splitX, splitY); ctxC.lineTo(splitX + (Math.random()-0.5)*8, splitY === 0 ? splitLen : H - splitLen);
                        ctxB.beginPath(); ctxB.moveTo(splitX, splitY); ctxB.lineTo(splitX + (Math.random()-0.5)*8, splitY === 0 ? splitLen : H - splitLen);
                        ctxC.stroke(); ctxB.stroke();
                    }

                    // Rusty iron bolts/nails at board joints
                    for (let yPos of [30, H - 30]) {
                        const nailX = px + pw / 2 + (Math.random() - 0.5) * 20;
                        // Nail Color
                        ctxC.fillStyle = '#6b4530'; // rusty brown
                        ctxC.beginPath(); ctxC.arc(nailX, yPos, 6, 0, Math.PI * 2); ctxC.fill();
                        
                        // Metallic specular highlight in center
                        ctxC.fillStyle = '#c5b8b0';
                        ctxC.beginPath(); ctxC.arc(nailX - 1.5, yPos - 1.5, 1.8, 0, Math.PI * 2); ctxC.fill();

                        // Nail Bump (cylindrical cap)
                        const radG = ctxB.createRadialGradient(nailX - 1.8, yPos - 1.8, 1, nailX, yPos, 6);
                        radG.addColorStop(0, '#ffffff');
                        radG.addColorStop(0.7, '#858585');
                        radG.addColorStop(1, '#505050');
                        ctxB.fillStyle = radG; ctxB.beginPath(); ctxB.arc(nailX, yPos, 6, 0, Math.PI * 2); ctxB.fill();

                        // Nail Roughness / Metalness maps
                        ctxR.fillStyle = '#555555'; ctxR.beginPath(); ctxR.arc(nailX, yPos, 6, 0, Math.PI * 2); ctxR.fill(); // shinier
                        ctxM.fillStyle = '#c0c0c0'; ctxM.beginPath(); ctxM.arc(nailX, yPos, 6, 0, Math.PI * 2); ctxM.fill(); // metallic
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
            repeatPBR(woodPBR, 100, 100);

            // --- INDUSTRIAL METALS ---
            const metalPBR = this._makePBRTexPairs(2048, 2048, (ctxC, ctxB, ctxR, ctxM, W, H) => {
                // Base metal plate
                ctxC.fillStyle = '#3c4046'; ctxC.fillRect(0,0,W,H);
                ctxB.fillStyle = '#808080'; ctxB.fillRect(0,0,W,H);
                ctxR.fillStyle = '#3b3b3b'; ctxR.fillRect(0,0,W,H); // smooth shiny base
                ctxM.fillStyle = '#d0d0d0'; ctxM.fillRect(0,0,W,H); // highly metallic

                // Segment into 4 panels (2x2 grid)
                ctxC.strokeStyle = '#1c1e22'; ctxC.lineWidth = 4;
                ctxB.strokeStyle = '#303030'; ctxB.lineWidth = 6;
                ctxC.beginPath(); ctxC.moveTo(0, H/2); ctxC.lineTo(W, H/2); ctxC.moveTo(W/2, 0); ctxC.lineTo(W/2, H); ctxC.stroke();
                ctxB.beginPath(); ctxB.moveTo(0, H/2); ctxB.lineTo(W, H/2); ctxB.moveTo(W/2, 0); ctxB.lineTo(W/2, H); ctxB.stroke();

                // Rivets along the seams
                const drawRivet = (rx, ry) => {
                    ctxC.fillStyle = '#4f545d'; ctxC.beginPath(); ctxC.arc(rx, ry, 8, 0, Math.PI * 2); ctxC.fill();
                    ctxC.fillStyle = '#9aa1ab'; ctxC.beginPath(); ctxC.arc(rx - 2, ry - 2, 2.5, 0, Math.PI * 2); ctxC.fill(); // shine

                    const radG = ctxB.createRadialGradient(rx - 2.5, ry - 2.5, 1, rx, ry, 8);
                    radG.addColorStop(0, '#ffffff');
                    radG.addColorStop(0.7, '#8f8f8f');
                    radG.addColorStop(1, '#404040');
                    ctxB.fillStyle = radG; ctxB.beginPath(); ctxB.arc(rx, ry, 8, 0, Math.PI * 2); ctxB.fill();
                };

                // Add rivets near borders
                const offsets = [24, W/2 - 24, W/2 + 24, W - 24];
                for (let ox of offsets) {
                    for (let oy of offsets) {
                        // Skip central intersection itself
                        if ((ox === W/2 - 24 || ox === W/2 + 24) && (oy === H/2 - 24 || oy === H/2 + 24)) continue;
                        drawRivet(ox, oy);
                    }
                }

                // Add metallic scratch lines
                for (let i = 0; i < 400; i++) {
                    const sx = Math.random() * W, sy = Math.random() * H, slen = 10 + Math.random() * 25;
                    const angle = (Math.random() - 0.5) * 0.8;
                    ctxC.strokeStyle = 'rgba(255,255,255,0.18)'; ctxC.lineWidth = 1.0;
                    ctxB.strokeStyle = '#606060'; ctxB.lineWidth = 1.0;
                    ctxC.beginPath(); ctxC.moveTo(sx, sy); ctxC.lineTo(sx + Math.cos(angle)*slen, sy + Math.sin(angle)*slen); ctxC.stroke();
                    ctxB.beginPath(); ctxB.moveTo(sx, sy); ctxB.lineTo(sx + Math.cos(angle)*slen, sy + Math.sin(angle)*slen); ctxB.stroke();
                }

                // Heavy patches of iron oxide rust
                for (let r = 0; r < 20; r++) {
                    const rx = Math.random() * W, ry = Math.random() * H, rr = 40 + Math.random() * 120;
                    // Draw organic shaped rust cluster
                    const grad = ctxC.createRadialGradient(rx, ry, 10, rx, ry, rr);
                    grad.addColorStop(0, 'rgba(115,46,12,0.92)');
                    grad.addColorStop(0.5, 'rgba(92,34,8,0.75)');
                    grad.addColorStop(1, 'rgba(0,0,0,0)');
                    ctxC.fillStyle = grad; ctxC.beginPath(); ctxC.arc(rx, ry, rr, 0, Math.PI * 2); ctxC.fill();

                    // Rust eats metal -> rough and non-metallic
                    const gradR = ctxR.createRadialGradient(rx, ry, 10, rx, ry, rr);
                    gradR.addColorStop(0, '#ededed'); // highly rough
                    gradR.addColorStop(0.6, '#cdcdcd');
                    gradR.addColorStop(1, '#3b3b3b'); // back to smooth steel
                    ctxR.fillStyle = gradR; ctxR.beginPath(); ctxR.arc(rx, ry, rr, 0, Math.PI * 2); ctxR.fill();

                    const gradM = ctxM.createRadialGradient(rx, ry, 10, rx, ry, rr);
                    gradM.addColorStop(0, '#040404'); // non-metal
                    gradM.addColorStop(0.6, '#181818');
                    gradM.addColorStop(1, '#d0d0d0'); // back to metallic
                    ctxM.fillStyle = gradM; ctxM.beginPath(); ctxM.arc(rx, ry, rr, 0, Math.PI * 2); ctxM.fill();

                    // Bubbly rough bump for rust
                    ctxB.fillStyle = '#656565';
                    for (let p = 0; p < 80; p++) {
                        const px = rx + (Math.random() - 0.5) * rr * 1.4, py = ry + (Math.random() - 0.5) * rr * 1.4;
                        if ((px - rx)*(px - rx) + (py - ry)*(py - ry) < rr*rr) {
                            ctxB.fillRect(px, py, 3, 3);
                            // add tiny rust color grain
                            ctxC.fillStyle = '#4c1e08'; ctxC.fillRect(px, py, 2, 2);
                        }
                    }
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
            repeatPBR(metalPBR, 100, 100);

            const ceilTex = this._makeTex(256, 256, (ctx, W, H) => {
                ctx.fillStyle = '#6c665c'; ctx.fillRect(0,0,W,H);
                ctx.strokeStyle = '#443f34'; ctx.lineWidth = 4; ctx.strokeRect(2,2,W-4,H-4);
            });
            this.ceilMat = new THREE.MeshStandardMaterial({ map: ceilTex, roughness: 0.92 });
            ceilTex.repeat.set(100, 100);

            this.debrisMat = new THREE.MeshStandardMaterial({ color: 0x14100d, roughness: 0.95 });
            this.sandbagMat = new THREE.MeshStandardMaterial({ color: 0x483f32, roughness: 0.92 });
            this.bloodMat = new THREE.MeshStandardMaterial({ color: 0x220101, roughness: 0.12, transparent: true, opacity: 0.88 });
        }

        buildMap() {
            const RH = this.RH;    // Room Height multiplier
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
            // Yellow-flickering warning light
            this.addFlickerLight(-4, RH - 0.5, 8, 0xffaa11, 1.3, 16);
            this.addWallBuy(size/2 - 0.9, 2.0, 12, -Math.PI/2, 'ammo', 'Ammo Crate', 250, 'ammo');

            // Room 1 Decals & Pipes
            this.addWallDecal(-size/2 + WT + 0.05, 2.2, 10, 2.5, 2.5, Math.PI/2, 'blood_splatter');
            this.addWallDecal(4, 2.0, size/2 - WT - 0.05, 0, 'horror_text');
            this.addWallPipe(-size/2 + 1.2, 3.5, 4, 16, 'z');
            this.addWallPipe(size/2 - 1.2, 3.5, 8, 12, 'z');

            // DOORWAYS BLOCKER: Room 1 -> Room 2 (Dividing Wall at Z = 0)
            this.addWall(-9.0, RH/2, 0, 14, RH, WT, this.concreteMat);
            this.addWall(9.0, RH/2, 0, 14, RH, WT, this.concreteMat);
            this.addInteractableDebris(0, RH/2, 0, 4, RH, WT, 750, "POWER GRID VAULT", 'door_r1_to_r2');


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
            this.addDanglingChain(-8, RH - 0.1, -8, 8);
            this.addDanglingChain(4, RH - 0.1, -10, 10);
            this.addWindowBarricade(0, 2.0, -size/2 + 0.5, 0);
            this.addWindowBarricade(size/2 - 0.5, 2.0, -10, -Math.PI/2);
            // Toxic warning yellow-green light
            this.addFlickerLight(6, RH - 0.5, -6, 0xbbff22, 1.2, 15);
            this.addWallBuy(-size/2 + 0.9, 2.0, -6, Math.PI/2, 'shotgun', 'Trench Gun', 500, 'weapon');
            this.addPowerGenerator(0, 0.1, -14.35);

            // Room 2 Decals & Pipes
            this.addWallDecal(-size/2 + WT + 0.05, 2.2, -4, Math.PI/2, 'horror_text');
            this.addWallDecal(8, 2.0, -size/2 + WT + 0.05, 0, 'slime_leak');
            this.addWallPipe(size/2 - 1.2, 3.5, -8, 12, 'z');

            // DEBRIS BLOCKER: Room 2 -> Room 3 Stairwell Blocker
            this.addInteractableDebris(12, RH/2, -12, 5.0, RH, 5.0, 1000, "COMMS CONTROL DECK STAIRS", 'debris_r2_to_r3');


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
            this.addComputerTerminal(4, R3_Y, 6, Math.PI / 4);
            // Cold warning cyan light
            this.addFlickerLight(0, R3_Y + RH - 0.5, 8, 0x11ccff, 1.4, 18);
            this.addBloodStain(4, 6, 3.0);

            // Room 3 Decals & Pipes
            this.addWallDecal(size/2 - WT - 0.05, R3_Y + 2.0, 10, 3.0, 3.0, -Math.PI/2, 'blood_splatter');
            this.addWallDecal(-size/2 + WT + 0.05, R3_Y + 2.2, 6, 2.5, 2.5, Math.PI/2, 'horror_text');

            // DOORWAYS BLOCKER: Room 3 -> Room 4 (Dividing Wall at Z = 0)
            this.addWall(-9.0, R3_Y + RH/2, 0, 14, RH, WT, this.concreteMat);
            this.addWall(9.0, R3_Y + RH/2, 0, 14, RH, WT, this.concreteMat);
            this.addInteractableDebris(0, R3_Y + RH/2, 0, 4, RH, WT, 1250, "LOGISTICS SUPPLY BAY", 'door_r3_to_r4');


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
            // Eerie warning green light
            this.addFlickerLight(-6, R4_Y + RH - 0.5, -6, 0x22ff66, 1.3, 15);
            this.addWallBuy(0, R4_Y + 2.0, -size/2 + 0.9, 0, 'ar', 'Assault Rifle', 1000, 'weapon');

            // Room 4 Decals & Pipes
            this.addWallDecal(-size/2 + WT + 0.05, R4_Y + 2.0, -6, Math.PI/2, 'slime_leak');
            this.addWallDecal(0, R4_Y + 2.2, -size/2 + WT + 0.05, 0, 'horror_text');

            // HATCH BLOCKER: Room 4 -> Room 5 Roof Penthouse Access
            this.addInteractableDebris(-12, R4_Y + RH/2, -12, 5.0, RH, 5.0, 2000, "ROOF APEX PENTHOUSE HATCH", 'hatch_r4_to_r5');


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
            // Eerie crimson warning light
            this.addFlickerLight(0, R5_Y + RH - 0.6, 0, 0xff1100, 1.8, 25);
            this.addBloodStain(-2, -2, 4.5);
            this.addWallBuy(-size/2 + 0.9, R5_Y + 2.0, -10, Math.PI/2, 'railgun', 'Railgun', 2500, 'weapon');
            
            // Room 5 Decals & Pipes
            this.addWallDecal(0, R5_Y + 0.03, 0, 4.5, 4.5, 'floor', 'glowing_sigil');
            this.addWallDecal(-size/2 + WT + 0.05, R5_Y + 2.0, 0, 3.0, 3.0, Math.PI/2, 'blood_splatter');
            this.addWallPipe(-size/2 + 1.2, R5_Y + 3.5, 0, 24, 'z');

            // DOOR BLOCKER: Room 5 -> Room 6 (Dividing wall inside Room 5, splitting South access)
            // Room 5 is a full-size mega room. We place a dividing wall + door at Z=0 to gate access to the south side upper hatch.
            this.addWall(-9.0, R5_Y + RH/2, size/4 - 2, 14, RH, WT, this.concreteMat);
            this.addWall(9.0, R5_Y + RH/2, size/4 - 2, 14, RH, WT, this.concreteMat);
            this.addInteractableDebris(0, R5_Y + RH/2, size/4 - 2, 4, RH, WT, 2500, "ARMORY BUNKER ACCESS", 'door_r5_to_r6');


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
            this.addDanglingChain(-6, R6_Y + RH - 0.1, 6, 8);
            this.addDanglingChain(6, R6_Y + RH - 0.1, 10, 10);
            this.addFlickerLight(-6, R6_Y + RH - 0.5, 8, 0xff5511, 1.5, 18);
            this.addFlickerLight(8, R6_Y + RH - 0.5, 12, 0xff9933, 1.0, 12);
            this.addBloodStain(5, 10, 2.0);
            this.addSandbagWall(4, R6_Y + 0.18, 6, 4);
            this.addProp(-8, R6_Y + 0.6, 4, 2.5, 1.2, 2, this.metalMat);
            this.addWallBuy(size/2 - 0.9, R6_Y + 2.0, 10, -Math.PI/2, 'shotgun', 'Combat Shotgun', 1500, 'weapon');

            // Room 6 Decals
            this.addWallDecal(size/2 - WT - 0.05, R6_Y + 2.2, 10, 2.5, 2.5, -Math.PI/2, 'horror_text');

            // DOOR BLOCKER: Room 6 -> Room 7 (Dividing Wall at Z = 0)
            this.addWall(-9.0, R6_Y + RH/2, 0, 14, RH, WT, this.concreteMat);
            this.addWall(9.0, R6_Y + RH/2, 0, 14, RH, WT, this.concreteMat);
            this.addInteractableDebris(0, R6_Y + RH/2, 0, 4, RH, WT, 3000, "BIO-LAB CHAMBER", 'door_r6_to_r7');


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
            // Toxic radioactive green lights
            this.addFlickerLight(0, R6_Y + RH - 0.5, -8, 0x00ff44, 1.6, 20);
            this.addFlickerLight(-10, R6_Y + RH - 0.5, -12, 0x00e199, 1.0, 10);
            this.addBloodStain(-4, -8, 3.5);
            this.addProp(6, R6_Y + 0.8, -10, 3, 1.6, 2.5, this.metalMat); // Lab Equipment
            this.addSpecimenTank(-6, R6_Y, -4);
            this.addWallBuy(-size/2 + 0.9, R6_Y + 2.0, -8, Math.PI/2, 'ar', 'Carbine MK2', 2000, 'weapon');

            // Room 7 Decals & Pipes
            this.addWallDecal(-size/2 + WT + 0.05, R6_Y + 2.0, -10, 3.0, 3.0, Math.PI/2, 'slime_leak');
            this.addWallDecal(4, R6_Y + 2.0, -size/2 + WT + 0.05, 0, 'blood_splatter');
            this.addWallPipe(-10, R6_Y + RH/2, -10, RH, 'y');

            // DEBRIS BLOCKER: Room 7 -> Room 8 Stairwell
            this.addInteractableDebris(12, R6_Y + RH/2, -12, 5.0, RH, 5.0, 3500, "REACTOR CORE STAIRS", 'debris_r7_to_r8');


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
            // Pulsing warning orange-red lights
            this.addFlickerLight(0, R8_Y + RH - 0.5, 10, 0xff2a00, 1.9, 22);
            this.addFlickerLight(-8, R8_Y + RH - 0.5, 4, 0xff4400, 1.1, 14);
            this.addBloodStain(2, 6, 4.0);
            // Reactor Core structure (central prop)
            this.addProp(0, R8_Y + 1.5, 8, 4, 3.0, 4, this.metalMat);
            this.addWallBuy(size/2 - 0.9, R8_Y + 2.0, 4, -Math.PI/2, 'ammo', 'Ammo Stockpile', 500, 'ammo');

            // Room 8 Decals & Pipes
            this.addWallDecal(-8, R8_Y + 2.0, size/2 - WT - 0.05, 0, 'blood_splatter');
            this.addWallPipe(-4, R8_Y + RH/2, 8, RH, 'y');
            this.addWallPipe(4, R8_Y + RH/2, 8, RH, 'y');

            // DOOR BLOCKER: Room 8 -> Room 9 (Dividing Wall at Z = 0)
            this.addWall(-9.0, R8_Y + RH/2, 0, 14, RH, WT, this.concreteMat);
            this.addWall(9.0, R8_Y + RH/2, 0, 14, RH, WT, this.concreteMat);
            this.addInteractableDebris(0, R8_Y + RH/2, 0, 4, RH, WT, 4000, "WAR ROOM", 'door_r8_to_r9');


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
            // Cold command cyan/blue lights
            this.addFlickerLight(-4, R8_Y + RH - 0.5, -8, 0x00ccff, 1.4, 18);
            this.addFlickerLight(6, R8_Y + RH - 0.5, -4, 0x4488ff, 1.0, 12);
            this.addBloodStain(-6, -10, 2.5);
            // War Table
            this.addProp(0, R8_Y + 0.6, -8, 5, 1.2, 3, this.woodMat);
            // Filing Cabinets
            this.addProp(-10, R8_Y + 0.9, -4, 1.5, 1.8, 1.5, this.metalMat);
            this.addProp(-10, R8_Y + 0.9, -6.5, 1.5, 1.8, 1.5, this.metalMat);
            this.addComputerTerminal(-6, R8_Y, -6, Math.PI / 2);
            this.addWallBuy(0, R8_Y + 2.0, -size/2 + 0.9, 0, 'railgun', 'Tesla Cannon', 3500, 'weapon');

            // Room 9 Decals
            this.addWallDecal(size/2 - WT - 0.05, R8_Y + 2.0, -10, 2.5, 2.5, -Math.PI/2, 'horror_text');

            // HATCH BLOCKER: Room 9 -> Room 10 Observatory Spire Access
            this.addInteractableDebris(-12, R8_Y + RH/2, -12, 5.0, RH, 5.0, 5000, "OBSERVATORY SPIRE HATCH", 'hatch_r9_to_r10');


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

            // Observatory Spire Lighting — dramatic violet and warning crimson
            this.addFlickerLight(0, R10_Y + RH - 0.6, 8, 0xbb00ff, 2.2, 28);
            this.addFlickerLight(8, R10_Y + RH - 0.5, 8, 0xff0033, 1.4, 16);
            this.addBloodStain(4, 8, 5.0);
            this.addBloodStain(-6, 6, 3.0);

            // Central Observatory Telescope/Antenna Prop (in South half)
            this.addProp(0, R10_Y + 2.0, 8, 2, 4.0, 2, this.metalMat);

            // Endgame Wall Buys (in South half)
            this.addWallBuy(-size/2 + 0.9, R10_Y + 2.0, 10, Math.PI/2, 'ar', 'Plasma Rifle', 4000, 'weapon');
            this.addWallBuy(size/2 - 0.9, R10_Y + 2.0, 10, -Math.PI/2, 'ammo', 'Ammo Cache', 750, 'ammo');

            // Room 10 Decals
            this.addWallDecal(0, R10_Y + 0.03, 4, 6.0, 6.0, 'floor', 'glowing_sigil');
            this.addWallDecal(-size/2 + WT + 0.05, R10_Y + 2.2, 6, 3.0, 3.0, Math.PI/2, 'horror_text');

            // DOOR BLOCKER: Room 11 -> Room 10 (Dividing Wall at Z = 0)
            this.addWall(-9.0, R10_Y + RH/2, 0, 14, RH, WT, this.concreteMat);
            this.addWall(9.0, R10_Y + RH/2, 0, 14, RH, WT, this.concreteMat);
            this.addInteractableDebris(0, R10_Y + RH/2, 0, 4, RH, WT, 6000, "OBSERVATORY SPIRE", 'door_r11_to_r10');


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
            // High-tech cyan lab light
            this.addFlickerLight(-6, R10_Y + RH - 0.5, -8, 0x00ffcc, 1.3, 16);
            this.addProp(-8, R10_Y + 0.9, -4, 1.5, 1.8, 1.5, this.metalMat); // Server Rack
            this.addProp(-8, R10_Y + 0.9, -6.5, 1.5, 1.8, 1.5, this.metalMat);

            // Wall Buy (in North half)
            this.addWallBuy(0, R10_Y + 2.0, -size/2 + 0.9, 0, 'railgun', 'Tesla Cannon', 3500, 'weapon');


            // Build Mystery Box inside the Apex Room (Room 5)
            this.buildMysteryBox(-8, R5_Y + 0.45, 8);

            // Add mechanical satellite/radar dish on the Spire Roof
            this.addRadarDish(0, R10_Y + RH, 0);

            // Atmosphere particles
            this.initDustMotes();

            // Dynamically register ceiling heights for collision detection
            window.NachtCeilings = [
                RH * 20.0 - 10.0,
                RH * 2.0 * 20.0 - 10.0,
                RH * 3.0 * 20.0 - 10.0,
                RH * 4.0 * 20.0 - 10.0,
                RH * 5.0 * 20.0 - 10.0,
                RH * 6.0 * 20.0 - 10.0
            ];

            // Set dynamic area rooms mapping registry globally (scaled 4x)
            // IMPORTANT: Rooms are ordered HIGHEST first so the loop matches the correct
            // upper room before a lower room that shares the same XZ footprint.
            window.NachtSafeRooms = [
                { minX: -320, maxX: 320, minZ: -320, maxZ: 320, minY: RH * 6 * 20.0 - 10.0, maxY: RH * 6 * 20.0 - 10.0 + 90.0 },   // Spire Roof (ceiling of top floor)
                { minX: -320, maxX: 320, minZ: 0, maxZ: 320, minY: RH * 5 * 20.0 - 10.0 + 2.0, maxY: RH * 6 * 20.0 - 10.0 + 20.0 },     // Room 10 - Observatory Spire (South)
                { minX: -320, maxX: 320, minZ: -320, maxZ: 0, minY: RH * 5 * 20.0 - 10.0 + 2.0, maxY: RH * 6 * 20.0 - 10.0 + 20.0 },    // Room 11 - Aether Research Lab (North)
                { minX: -320, maxX: 320, minZ: 0, maxZ: 320, minY: RH * 4 * 20.0 - 10.0 + 2.0, maxY: RH * 5 * 20.0 - 10.0 },       // Room 8 - Reactor Core
                { minX: -320, maxX: 320, minZ: -320, maxZ: 0, minY: RH * 4 * 20.0 - 10.0 + 2.0, maxY: RH * 5 * 20.0 - 10.0 },      // Room 9 - War Room
                { minX: -320, maxX: 320, minZ: 0, maxZ: 320, minY: RH * 3 * 20.0 - 10.0 + 2.0, maxY: RH * 4 * 20.0 - 10.0 },       // Room 6 - Armory Bunker
                { minX: -320, maxX: 320, minZ: -320, maxZ: 0, minY: RH * 3 * 20.0 - 10.0 + 2.0, maxY: RH * 4 * 20.0 - 10.0 },      // Room 7 - Bio-Lab Chamber
                { minX: -320, maxX: 320, minZ: -320, maxZ: 320, minY: RH * 2 * 20.0 - 10.0 + 2.0, maxY: RH * 3 * 20.0 - 10.0 },    // Room 5 - Roof Apex Penthouse
                { minX: -320, maxX: 320, minZ: 0, maxZ: 320, minY: RH * 20.0 - 10.0 + 2.0, maxY: RH * 2 * 20.0 - 10.0 },       // Room 3 - Comms Control Deck
                { minX: -320, maxX: 320, minZ: -320, maxZ: 0, minY: RH * 20.0 - 10.0 + 2.0, maxY: RH * 2 * 20.0 - 10.0 },      // Room 4 - Logistics Supply Bay
                { minX: -320, maxX: 320, minZ: 0, maxZ: 320, minY: -10.0, maxY: RH * 20.0 - 10.0 },         // Room 1 - Spawn Station
                { minX: -320, maxX: 320, minZ: -320, maxZ: 0, minY: -10.0, maxY: RH * 20.0 - 10.0 }         // Room 2 - Power Grid Vault
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
            const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
        }

        addWallDecal(cx, cy, cz, w, h, rotY, decalType) {
            if (decalType === undefined && typeof h === 'string') {
                decalType = h;
                rotY = w;
                w = 2.5;
                h = 2.5;
            }
            if (!this._decalTexes) this._decalTexes = {};
            if (!this._decalTexes[decalType]) {
                const canvas = document.createElement('canvas');
                canvas.width = 512; canvas.height = 512;
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, 512, 512);

                if (decalType === 'blood_splatter') {
                    const cx1 = 256, cy1 = 256;
                    ctx.fillStyle = 'rgba(75, 2, 2, 0.9)';
                    ctx.beginPath(); ctx.arc(cx1, cy1, 60, 0, Math.PI * 2); ctx.fill();

                    for (let s = 0; s < 18; s++) {
                        const angle = Math.random() * Math.PI * 2;
                        const dist = 70 + Math.random() * 120;
                        const spotX = cx1 + Math.cos(angle) * dist;
                        const spotY = cy1 + Math.sin(angle) * dist;
                        const spotRad = 5 + Math.random() * 18;
                        
                        ctx.beginPath(); ctx.arc(spotX, spotY, spotRad, 0, Math.PI * 2); ctx.fill();

                        ctx.strokeStyle = 'rgba(65, 2, 2, 0.6)'; ctx.lineWidth = 2;
                        ctx.beginPath(); ctx.moveTo(cx1, cy1); ctx.lineTo(spotX, spotY); ctx.stroke();
                    }

                    for (let d = 0; d < 6; d++) {
                        const dripX = cx1 - 80 + Math.random() * 160;
                        const dripLen = 80 + Math.random() * 140;
                        const dripW = 3 + Math.random() * 5;
                        const grad = ctx.createLinearGradient(dripX, cy1, dripX, cy1 + dripLen);
                        grad.addColorStop(0, 'rgba(75, 2, 2, 0.9)');
                        grad.addColorStop(0.7, 'rgba(60, 1, 1, 0.7)');
                        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
                        
                        ctx.fillStyle = grad; ctx.fillRect(dripX - dripW/2, cy1, dripW, dripLen);
                        ctx.fillStyle = 'rgba(60, 1, 1, 0.8)';
                        ctx.beginPath(); ctx.arc(dripX, cy1 + dripLen - 2, dripW * 0.9, 0, Math.PI * 2); ctx.fill();
                    }
                } else if (decalType === 'glowing_sigil') {
                    ctx.strokeStyle = '#9900ff'; ctx.lineWidth = 14;
                    ctx.shadowColor = '#bb00ff'; ctx.shadowBlur = 20;
                    const cx1 = 256, cy1 = 256, r = 160;
                    ctx.beginPath(); ctx.arc(cx1, cy1, r, 0, Math.PI * 2); ctx.stroke();

                    ctx.beginPath();
                    for (let i = 0; i < 5; i++) {
                        const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
                        const px = cx1 + Math.cos(angle) * r;
                        const py = cy1 + Math.sin(angle) * r;
                        if (i === 0) ctx.moveTo(px, py);
                        else ctx.lineTo(px, py);
                    }
                    ctx.closePath(); ctx.stroke();

                    ctx.beginPath(); ctx.arc(cx1, cy1, 35, 0, Math.PI * 2); ctx.stroke();
                    ctx.fillStyle = '#ff0055';
                    ctx.beginPath(); ctx.arc(cx1, cy1, 12, 0, Math.PI * 2); ctx.fill();
                } else if (decalType === 'horror_text') {
                    ctx.font = 'bold 54px "Georgia", serif';
                    ctx.fillStyle = 'rgba(75, 2, 2, 0.85)';
                    ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 6;

                    const texts = [
                        ["HE IS HERE", "RUN"],
                        ["NO ESCAPE", "DEATH AWAIT"],
                        ["HELP US", "THE COLD NODE"],
                        ["SURVIVED", "DAY 666"],
                        ["CORRUPTED", "GRID"]
                    ];
                    const chosen = texts[Math.floor(Math.random() * texts.length)];
                    ctx.fillText(chosen[0], 40, 200);
                    if (chosen[1]) {
                        ctx.fillText(chosen[1], 80, 290);
                        ctx.fillStyle = 'rgba(65, 1, 1, 0.7)';
                        for(let d=0; d<4; d++){
                            ctx.fillRect(100 + d*90, 290, 4, 30 + Math.random()*50);
                        }
                    }
                    ctx.strokeStyle = 'rgba(75, 2, 2, 0.85)'; ctx.lineWidth = 6;
                    ctx.beginPath();
                    for(let i=0; i<4; i++) {
                        ctx.moveTo(320 + i*15, 60); ctx.lineTo(325 + i*15, 120);
                    }
                    ctx.stroke();
                    ctx.beginPath(); ctx.moveTo(310, 80); ctx.lineTo(380, 100); ctx.stroke();
                } else if (decalType === 'slime_leak') {
                    ctx.fillStyle = 'rgba(25, 220, 50, 0.85)';
                    ctx.shadowColor = '#00ff44'; ctx.shadowBlur = 15;
                    for (let s = 0; s < 4; s++) {
                        const sx = 100 + Math.random() * 300;
                        const slen = 200 + Math.random() * 250;
                        const sw = 6 + Math.random() * 12;
                        
                        ctx.beginPath(); ctx.arc(sx, 50, sw, 0, Math.PI * 2); ctx.fill();
                        ctx.fillRect(sx - sw/2, 50, sw, slen);
                        ctx.beginPath(); ctx.arc(sx, 50 + slen, sw * 1.2, 0, Math.PI * 2); ctx.fill();
                    }
                }
                this._decalTexes[decalType] = new THREE.CanvasTexture(canvas);
            }

            const tex = this._decalTexes[decalType];
            const isSigil = decalType === 'glowing_sigil';
            const mat = new THREE.MeshBasicMaterial({
                map: tex,
                transparent: true,
                side: THREE.DoubleSide,
                depthWrite: false,
                blending: isSigil ? THREE.AdditiveBlending : THREE.NormalBlending,
                opacity: isSigil ? 0.75 : 0.88
            });

            const geo = new THREE.PlaneGeometry(w, h);
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(cx, cy, cz);
            if (rotY === 'floor') {
                mesh.rotation.x = -Math.PI / 2;
            } else if (rotY) {
                mesh.rotation.y = rotY;
            }
            this.group.add(mesh);

            if (isSigil) {
                if (!this.glowingSigils) this.glowingSigils = [];
                this.glowingSigils.push({ mesh, time: Math.random() * Math.PI * 2 });
            }
        }

        addWallPipe(x, y, z, length, axis, rotY) {
            const geo = new THREE.CylinderGeometry(0.08, 0.08, length);
            const mesh = new THREE.Mesh(geo, this.metalMat);
            mesh.position.set(x, y, z);
            if (axis === 'x') {
                mesh.rotation.z = Math.PI / 2;
            } else if (axis === 'z') {
                mesh.rotation.x = Math.PI / 2;
            }
            if (rotY) mesh.rotation.y = rotY;
            mesh.castShadow = true; mesh.receiveShadow = true;
            this.group.add(mesh);
        }

        addWall(cx, cy, cz, width, height, depth, mat) {
            const geo = new THREE.BoxGeometry(width, height, depth);
            this._assignUVs(geo, width, height, depth);
            const mesh = new THREE.Mesh(geo, mat || this.brickMat);
            mesh.position.set(cx, cy, cz); mesh.castShadow = true; mesh.receiveShadow = true;
            this.group.add(mesh);
            this.walls.push({
                minX: (cx - width/2) * this.MAP_SCALE,
                maxX: (cx + width/2) * this.MAP_SCALE,
                minZ: (cz - depth/2) * this.MAP_SCALE,
                maxZ: (cz + depth/2) * this.MAP_SCALE,
                minY: (cy - height/2) * this.MAP_SCALE + this.MAP_Y_OFFSET,
                maxY: (cy + height/2) * this.MAP_SCALE + this.MAP_Y_OFFSET
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
                minX: (cx - w/2) * this.MAP_SCALE,
                maxX: (cx + w/2) * this.MAP_SCALE,
                minZ: (cz - d/2) * this.MAP_SCALE,
                maxZ: (cz + d/2) * this.MAP_SCALE,
                minY: (cy - h/2) * this.MAP_SCALE + this.MAP_Y_OFFSET,
                maxY: (cy + h/2) * this.MAP_SCALE + this.MAP_Y_OFFSET
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

        addDanglingChain(cx, cy, cz, heightSegments = 5) {
            const segmentGroup = new THREE.Group();
            segmentGroup.position.set(cx, cy, cz);
            const chainMat = this.metalMat;
            for (let i = 0; i < heightSegments; i++) {
                const linkGeo = new THREE.TorusGeometry(0.15, 0.04, 6, 12);
                const link = new THREE.Mesh(linkGeo, chainMat);
                link.position.y = -i * 0.25;
                link.rotation.y = (i % 2) * Math.PI / 2;
                link.castShadow = true;
                segmentGroup.add(link);
            }
            this.group.add(segmentGroup);
        }

        addSpecimenTank(cx, cy, cz) {
            const tankGroup = new THREE.Group();
            tankGroup.position.set(cx, cy, cz);

            const glassGeo = new THREE.CylinderGeometry(1.5, 1.5, 3.0, 12, 1, true);
            const glassMat = new THREE.MeshStandardMaterial({
                color: 0x00ffaa,
                transparent: true,
                opacity: 0.3,
                roughness: 0.1,
                metalness: 0.1,
                side: THREE.DoubleSide
            });
            const glass = new THREE.Mesh(glassGeo, glassMat);
            glass.position.y = 1.5;
            tankGroup.add(glass);

            const capGeo = new THREE.CylinderGeometry(1.7, 1.7, 0.4, 12);
            const capBottom = new THREE.Mesh(capGeo, this.metalMat);
            capBottom.position.y = 0.2;
            const capTop = new THREE.Mesh(capGeo, this.metalMat);
            capTop.position.y = 3.2;
            tankGroup.add(capBottom);
            tankGroup.add(capTop);

            const coreGeo = new THREE.CylinderGeometry(0.5, 0.5, 1.8, 8);
            const coreMat = new THREE.MeshBasicMaterial({
                color: 0x00ff33,
                transparent: true,
                opacity: 0.8
            });
            const core = new THREE.Mesh(coreGeo, coreMat);
            core.position.y = 1.6;
            tankGroup.add(core);

            const light = new THREE.PointLight(0x00ff33, 1.5, 12);
            light.position.set(0, 1.6, 0);
            tankGroup.add(light);

            this.group.add(tankGroup);

            if (!this.specimenTanks) this.specimenTanks = [];
            this.specimenTanks.push({ core, light, time: Math.random() * 10 });
            
            this.walls.push({
                minX: (cx - 1.7) * this.MAP_SCALE,
                maxX: (cx + 1.7) * this.MAP_SCALE,
                minZ: (cz - 1.7) * this.MAP_SCALE,
                maxZ: (cz + 1.7) * this.MAP_SCALE,
                minY: cy * this.MAP_SCALE + this.MAP_Y_OFFSET,
                maxY: (cy + 3.4) * this.MAP_SCALE + this.MAP_Y_OFFSET
            });
        }

        addRadarDish(cx, cy, cz) {
            const radarGroup = new THREE.Group();
            radarGroup.position.set(cx, cy, cz);

            const standGeo = new THREE.CylinderGeometry(0.2, 0.2, 2.0, 8);
            const stand = new THREE.Mesh(standGeo, this.metalMat);
            stand.position.y = 1.0;
            radarGroup.add(stand);

            const jointGeo = new THREE.SphereGeometry(0.4, 8, 8);
            const joint = new THREE.Mesh(jointGeo, this.metalMat);
            joint.position.y = 2.0;
            radarGroup.add(joint);

            const dishSubGroup = new THREE.Group();
            dishSubGroup.position.set(0, 2.0, 0);
            dishSubGroup.rotation.x = Math.PI / 6;

            const dishGeo = new THREE.CylinderGeometry(2.5, 0.4, 0.8, 16, 1, true);
            const dish = new THREE.Mesh(dishGeo, this.metalMat);
            dish.rotation.x = Math.PI / 2;
            dish.position.z = 0.4;
            dishSubGroup.add(dish);

            const hornGeo = new THREE.ConeGeometry(0.15, 0.8, 4);
            const horn = new THREE.Mesh(hornGeo, this.metalMat);
            horn.rotation.x = -Math.PI / 2;
            horn.position.z = 1.6;
            dishSubGroup.add(horn);

            const strutGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.6, 4);
            for (let i = 0; i < 3; i++) {
                const strut = new THREE.Mesh(strutGeo, this.metalMat);
                strut.position.set(Math.sin(i * Math.PI * 2 / 3) * 1.0, 0.3, Math.cos(i * Math.PI * 2 / 3) * 1.0);
                strut.rotation.x = Math.PI / 4;
                strut.rotation.y = i * Math.PI * 2 / 3;
                dishSubGroup.add(strut);
            }

            radarGroup.add(dishSubGroup);
            this.group.add(radarGroup);

            if (!this.radarDishes) this.radarDishes = [];
            this.radarDishes.push({ dishSubGroup });

            this.walls.push({
                minX: (cx - 2.5) * this.MAP_SCALE,
                maxX: (cx + 2.5) * this.MAP_SCALE,
                minZ: (cz - 2.5) * this.MAP_SCALE,
                maxZ: (cz + 2.5) * this.MAP_SCALE,
                minY: cy * this.MAP_SCALE + this.MAP_Y_OFFSET,
                maxY: (cy + 3.5) * this.MAP_SCALE + this.MAP_Y_OFFSET
            });
        }

        createTerminalScreenCanvas() {
            const canvas = document.createElement('canvas');
            canvas.width = 256;
            canvas.height = 128;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, 256, 128);
            return canvas;
        }

        addComputerTerminal(cx, cy, cz, rotY) {
            const consoleGroup = new THREE.Group();
            consoleGroup.position.set(cx, cy, cz);
            if (rotY) consoleGroup.rotation.y = rotY;

            const boxGeo = new THREE.BoxGeometry(2.0, 1.2, 1.2);
            const base = new THREE.Mesh(boxGeo, this.metalMat);
            base.position.y = 0.6;
            base.castShadow = true; base.receiveShadow = true;
            consoleGroup.add(base);

            const screenGeo = new THREE.BoxGeometry(1.6, 0.8, 0.1);
            
            const canvas = this.createTerminalScreenCanvas();
            const screenTex = new THREE.CanvasTexture(canvas);
            const screenMat = new THREE.MeshBasicMaterial({ map: screenTex });
            
            const screen = new THREE.Mesh(screenGeo, screenMat);
            screen.position.set(0, 1.3, -0.2);
            screen.rotation.x = -Math.PI / 6;
            consoleGroup.add(screen);

            const screenLight = new THREE.PointLight(0x00ffff, 1.0, 5);
            screenLight.position.set(0, 1.3, 0.2);
            consoleGroup.add(screenLight);

            this.group.add(consoleGroup);

            if (!this.computerScreens) this.computerScreens = [];
            this.computerScreens.push({
                screen,
                screenLight,
                canvas,
                screenTex,
                time: Math.random() * 10.0,
                lastDrawTime: 0
            });

            this.walls.push({
                minX: (cx - 1.0) * this.MAP_SCALE,
                maxX: (cx + 1.0) * this.MAP_SCALE,
                minZ: (cz - 0.6) * this.MAP_SCALE,
                maxZ: (cz + 0.6) * this.MAP_SCALE,
                minY: cy * this.MAP_SCALE + this.MAP_Y_OFFSET,
                maxY: (cy + 1.6) * this.MAP_SCALE + this.MAP_Y_OFFSET
            });
        }

        addPowerGenerator(cx, cy, cz) {
            const genGroup = new THREE.Group();
            genGroup.position.set(cx, cy, cz);

            const bodyGeo = new THREE.BoxGeometry(2.5, 1.8, 1.5);
            const body = new THREE.Mesh(bodyGeo, this.metalMat);
            body.position.y = 0.9;
            body.castShadow = true; body.receiveShadow = true;
            genGroup.add(body);

            const leverBaseGeo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
            const leverBase = new THREE.Mesh(leverBaseGeo, this.metalMat);
            leverBase.position.set(0, 1.2, 0.6);
            leverBase.castShadow = true;
            genGroup.add(leverBase);

            const armGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.0, 6);
            const arm = new THREE.Mesh(armGeo, this.metalMat);
            arm.position.set(0, 1.6, 0.6);
            arm.rotation.x = -Math.PI / 4;
            arm.castShadow = true;
            genGroup.add(arm);

            const knobGeo = new THREE.SphereGeometry(0.18, 8, 8);
            const knobMat = new THREE.MeshBasicMaterial({ color: 0xff3300 });
            const knob = new THREE.Mesh(knobGeo, knobMat);
            knob.position.set(0, 1.95, 0.95);
            knob.castShadow = true;
            genGroup.add(knob);

            const bulbLight = new THREE.PointLight(0xff3300, 1.0, 8);
            bulbLight.position.set(0, 1.4, 0.8);
            genGroup.add(bulbLight);

            this.group.add(genGroup);

            this.generatorArm = arm;
            this.generatorKnob = knob;
            this.generatorKnobMat = knobMat;
            this.generatorLight = bulbLight;

            this.interactables.push({
                type: 'power_switch',
                x: cx * this.MAP_SCALE, y: cy * this.MAP_SCALE + this.MAP_Y_OFFSET, z: cz * this.MAP_SCALE,
                radius: 140.0, cost: 0,
                text: '[E] ACTIVATE MAIN POWER GENERATOR',
                active: true,
                action: (iobj) => {
                    this.triggerPowerActivation();
                    iobj.active = false;
                }
            });

            this.walls.push({
                minX: (cx - 1.25) * this.MAP_SCALE,
                maxX: (cx + 1.25) * this.MAP_SCALE,
                minZ: (cz - 0.75) * this.MAP_SCALE,
                maxZ: (cz + 0.75) * this.MAP_SCALE,
                minY: cy * this.MAP_SCALE + this.MAP_Y_OFFSET,
                maxY: (cy + 1.8) * this.MAP_SCALE + this.MAP_Y_OFFSET
            });
        }

        triggerPowerActivation() {
            this.powerOnline = true;
            
            if (this.generatorArm) {
                this.generatorArm.rotation.x = Math.PI / 4;
                this.generatorArm.position.y = 1.0;
                this.generatorArm.position.z = 0.85;
            }
            if (this.generatorKnob) {
                this.generatorKnob.position.set(0, 0.65, 1.2);
            }
            if (this.generatorKnobMat) {
                this.generatorKnobMat.color.setHex(0x00ff44);
            }
            if (this.generatorLight) {
                this.generatorLight.color.setHex(0x00ff44);
                this.generatorLight.intensity = 2.0;
            }

            try {
                if (window.audioCtx) {
                    const ctx = window.audioCtx;
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(80, ctx.currentTime);
                    osc.frequency.exponentialRampToValueAtTime(320, ctx.currentTime + 1.5);
                    gain.gain.setValueAtTime(0.08, ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start();
                    osc.stop(ctx.currentTime + 1.5);
                }
            } catch (e) {}

            if (window.NeuralConsole) {
                window.NeuralConsole.log('0x0E54: MAIN POWER GENERATOR ONLINE. ALL SUB-SYSTEMS GO.', 'res');
                window.NeuralConsole.beep(880, 0.15);
                setTimeout(() => window.NeuralConsole.beep(1100, 0.2), 200);
            }

            if (typeof emitParticle === 'function') {
                const px = this.generatorArm.parent.position.x * this.MAP_SCALE;
                const py = (this.generatorArm.parent.position.y + 1.4) * this.MAP_SCALE + this.MAP_Y_OFFSET;
                const pz = this.generatorArm.parent.position.z * this.MAP_SCALE;
                for (let i = 0; i < 45; i++) {
                    emitParticle(
                        px, py, pz,
                        (Math.random() - 0.5) * 20.0,
                        Math.random() * 12.0 + 4.0,
                        (Math.random() - 0.5) * 20.0,
                        0.7, 0.95, 1.0,
                        24.0 + Math.random() * 10.0,
                        0.8
                    );
                }
            }
        }

        addFlickerLight(x, y, z, color, intensity, dist) {
            const light = new THREE.PointLight(color, intensity, dist);
            light.position.set(x, y, z); light.castShadow = true; light.shadow.bias = -0.002;
            this.group.add(light);

            // Add visible industrial glowing light tube fixture
            const fixtureMat = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.8 });
            const fixtureMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.2, 8), fixtureMat);
            fixtureMesh.rotation.z = Math.PI / 2; // horizontal
            fixtureMesh.position.set(x, y + 0.1, z);
            this.group.add(fixtureMesh);

            // Steel fixture cage/backing
            const backingMat = new THREE.MeshStandardMaterial({ color: 0x222225, roughness: 0.6, metalness: 0.8 });
            const backing = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.1, 0.15), backingMat);
            backing.position.set(x, y + 0.16, z);
            this.group.add(backing);

            if (!this.flickerLights) this.flickerLights = [];
            this.flickerLights.push({ 
                light, 
                baseIntensity: intensity, 
                phase: Math.random()*Math.PI*2,
                mesh: fixtureMesh,
                baseColor: new THREE.Color(color)
            });
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

            // Crossed heavy reinforcement steel rods
            const rodMat = this.metalMat;
            const offsetDist = 0.15;
            const rx = cx + (rotY ? Math.sin(rotY) * offsetDist : 0);
            const rz = cz + (rotY ? 0 : Math.cos(rotY) * offsetDist);
            
            const rod1 = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 3.2), rodMat);
            rod1.position.set(rx, cy, rz);
            if (rotY) rod1.rotation.y = rotY;
            rod1.rotation.z = Math.PI / 4;
            rod1.castShadow = true;
            this.group.add(rod1);

            const rod2 = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 3.2), rodMat);
            rod2.position.set(rx, cy, rz);
            if (rotY) rod2.rotation.y = rotY;
            rod2.rotation.z = -Math.PI / 4;
            rod2.castShadow = true;
            this.group.add(rod2);
            
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

            // Glowing cylinder representing the portal column - Upgraded to 1.5 radius, 2.6 height
            const geom = new THREE.CylinderGeometry(1.5, 1.5, 2.6, 24, 1, true);
            
            // Custom GLSL Cyber-Vortex Shader Material
            const mat = new THREE.ShaderMaterial({
                uniforms: {
                    uTime: { value: 0 },
                    uColor: { value: new THREE.Color(color) },
                    uPowerOnline: { value: 0.0 }
                },
                vertexShader: `
                    varying vec2 vUv;
                    varying vec3 vPosition;
                    void main() {
                        vUv = uv;
                        vPosition = position;
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    }
                `,
                fragmentShader: `
                    uniform float uTime;
                    uniform vec3 uColor;
                    uniform float uPowerOnline;
                    varying vec2 vUv;
                    varying vec3 vPosition;

                    float hash(vec2 p) {
                        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
                    }
                    float noise(vec2 p) {
                        vec2 i = floor(p);
                        vec2 f = fract(p);
                        vec2 u = f*f*(3.0-2.0*f);
                        return mix(mix(hash(i + vec2(0.0,0.0)), hash(i + vec2(1.0,0.0)), u.x),
                                   mix(hash(i + vec2(0.0,1.0)), hash(i + vec2(1.0,1.0)), u.x), u.y);
                    }

                    void main() {
                        float time = uTime * 4.0;
                        float angle = vUv.x * 2.0 * 3.14159265;
                        
                        // Spiraling vertical energy waves
                        float w1 = sin(angle * 4.0 + vUv.y * 10.0 - time) * 0.5 + 0.5;
                        float w2 = cos(angle * 2.0 - vUv.y * 6.0 + time * 1.5) * 0.5 + 0.5;
                        
                        // Scanning grid lines
                        float scan = step(0.94, sin(vUv.y * 65.0 - time * 2.0));
                        
                        // Core plasma noise
                        float ns = noise(vec2(angle * 2.0, vUv.y * 6.0 - time * 0.5));
                        
                        // Smooth fade at the top and bottom of the cylinder
                        float edgeMask = smoothstep(0.0, 0.15, vUv.y) * smoothstep(1.0, 0.85, vUv.y);
                        
                        vec3 col = uColor;
                        if (uPowerOnline < 0.5) {
                            // Offline: pulsing warn crimson glow
                            col = vec3(1.0, 0.05, 0.05);
                            float offlineFlicker = step(0.97, sin(uTime * 18.0)) * 0.12 + 0.04;
                            gl_FragColor = vec4(col * 1.3, offlineFlicker * edgeMask);
                        } else {
                            // Active vortex: colorful swirling plasma stream
                            vec3 energyCol = mix(col, vec3(1.0, 1.0, 1.0), w1 * 0.35);
                            float energy = mix(w1, w2, 0.5) * 0.7 + ns * 0.3 + scan * 0.12;
                            float glitch = step(0.996, sin(uTime * 15.0)) * 0.22;
                            
                            vec3 finalCol = energyCol * (0.35 + energy * 1.9 + glitch);
                            float finalAlpha = (0.2 + energy * 0.75) * edgeMask * 0.78;
                            gl_FragColor = vec4(finalCol, finalAlpha);
                        }
                    }
                `,
                transparent: true,
                depthWrite: false,
                blending: THREE.AdditiveBlending,
                side: THREE.DoubleSide
            });

            const cylinder = new THREE.Mesh(geom, mat);
            portalGroup.add(cylinder);

            // Containment rings - Upgraded to 1.5 radius to match cylinder
            const ringGeom = new THREE.TorusGeometry(1.5, 0.07, 8, 24);
            const ringMat = new THREE.MeshBasicMaterial({ color: color });
            
            const ringBottom = new THREE.Mesh(ringGeom, ringMat);
            ringBottom.rotation.x = Math.PI / 2;
            ringBottom.position.y = -1.3;
            portalGroup.add(ringBottom);

            const ringTop = new THREE.Mesh(ringGeom, ringMat);
            ringTop.rotation.x = Math.PI / 2;
            ringTop.position.y = 1.3;
            portalGroup.add(ringTop);

            // Containment Field: Mid, sub-low, and sub-high ribs
            const ringMid = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.04, 6, 24), ringMat);
            ringMid.rotation.x = Math.PI / 2;
            ringMid.position.y = 0.0;
            portalGroup.add(ringMid);

            const ringSub1 = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.03, 6, 24), ringMat);
            ringSub1.rotation.x = Math.PI / 2;
            ringSub1.position.y = -0.65;
            portalGroup.add(ringSub1);

            const ringSub2 = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.03, 6, 24), ringMat);
            ringSub2.rotation.x = Math.PI / 2;
            ringSub2.position.y = 0.65;
            portalGroup.add(ringSub2);

            // Light inside the portal
            const light = new THREE.PointLight(color, 1.5, 8);
            light.position.set(0, 0, 0);
            portalGroup.add(light);

            this.group.add(portalGroup);

            // Keep reference for update loop
            if (!this.portalVisualsList) this.portalVisualsList = [];
            this.portalVisualsList.push({ 
                group: portalGroup, 
                light, 
                cylinder, 
                baseIntensity: 1.5, 
                time: 0, 
                baseColor: new THREE.Color(color), 
                ringBottom, 
                ringTop,
                ringMid,
                ringSub1,
                ringSub2
            });

            return portalGroup;
        }

        activatePortal(blockerId) {
            const configs = this.registeredPortals[blockerId];
            if (configs) {
                for (const cfg of configs) {
                    // Create visual mesh (centered at y + 1.3 for 2.6 height cylinder)
                    const visualGroup = this.createPortalVisuals(cfg.from.x, cfg.from.y + 1.3, cfg.from.z, cfg.color);
                    
                    // Add active portal entry
                    this.portals.push({
                        x: cfg.from.x * this.MAP_SCALE,
                        y: cfg.from.y * this.MAP_SCALE + this.MAP_Y_OFFSET,
                        z: cfg.from.z * this.MAP_SCALE,
                        targetX: cfg.to.x * this.MAP_SCALE,
                        targetY: cfg.to.y * this.MAP_SCALE + this.MAP_Y_OFFSET + 5.0,
                        targetZ: cfg.to.z * this.MAP_SCALE,
                        radius: 50.0,
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
                minX: (cx - width/2) * this.MAP_SCALE,
                maxX: (cx + width/2) * this.MAP_SCALE,
                minZ: (cz - depth/2) * this.MAP_SCALE,
                maxZ: (cz + depth/2) * this.MAP_SCALE,
                minY: (cy - height/2) * this.MAP_SCALE + this.MAP_Y_OFFSET,
                maxY: (cy + height/2) * this.MAP_SCALE + this.MAP_Y_OFFSET
            };
            this.walls.push(wallData);

            this.interactables.push({
                type: 'debris', id: id,
                x: cx * this.MAP_SCALE, y: cy * this.MAP_SCALE + this.MAP_Y_OFFSET, z: cz * this.MAP_SCALE,
                radius: 180.0, cost: cost,
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
                x: x * this.MAP_SCALE, y: y * this.MAP_SCALE + this.MAP_Y_OFFSET, z: z * this.MAP_SCALE,
                radius: 140.0, cost: cost,
                text: type === 'ammo' ? `[E] BUY AMMO [COST: ${cost}]` : `[E] BUY ${weaponName.toUpperCase()} [COST: ${cost}]`,
                baseText: type === 'ammo' ? `[E] BUY AMMO [COST: ${cost}]` : `[E] BUY ${weaponName.toUpperCase()} [COST: ${cost}]`,
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

            // Pulsing occult green-amber aura ring around the mystery box
            const ringGeom = new THREE.TorusGeometry(1.6, 0.04, 6, 24);
            const ringMat = new THREE.MeshBasicMaterial({ color: 0xff5500, transparent: true, opacity: 0.5 });
            this.boxAura = new THREE.Mesh(ringGeom, ringMat);
            this.boxAura.rotation.x = Math.PI / 2;
            this.boxAura.position.set(x, y + 0.05, z);
            this.group.add(this.boxAura);

            this.boxLight = new THREE.PointLight(0xff5500, 1.5, 12);
            this.boxLight.position.set(x, y + 0.8, z); this.boxLight.castShadow = true;
            this.group.add(this.boxLight);

            const wallData = {
                minX: (x - 1.4) * this.MAP_SCALE,
                maxX: (x + 1.4) * this.MAP_SCALE,
                minZ: (z - 0.65) * this.MAP_SCALE,
                maxZ: (z + 0.65) * this.MAP_SCALE,
                minY: (y - 0.45) * this.MAP_SCALE + this.MAP_Y_OFFSET,
                maxY: (y + 2.0) * this.MAP_SCALE + this.MAP_Y_OFFSET
            };
            this.walls.push(wallData);

            this.interactables.push({
                type: 'mystery_box',
                x: x * this.MAP_SCALE, y: y * this.MAP_SCALE + this.MAP_Y_OFFSET, z: z * this.MAP_SCALE,
                radius: 160.0, cost: 950,
                text: `[E] MYSTERY BOX [COST: 950]`,
                baseText: `[E] MYSTERY BOX [COST: 950]`,
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
            // Flicker Lights System Matrix with erratic grid brownouts and sparks
            if (this.flickerLights) {
                for (let i=0; i<this.flickerLights.length; i++) {
                    const fl = this.flickerLights[i];
                    if (!this.powerOnline) {
                        fl.light.intensity = 0.0;
                        if (fl.mesh) {
                            fl.mesh.material.color.setHex(0x111115);
                            fl.mesh.material.opacity = 0.1;
                        }
                    } else {
                        fl.phase += delta * (8 + Math.random() * 20);
                        const noise = Math.sin(fl.phase) * Math.sin(fl.phase * 1.7) * Math.cos(fl.phase * 0.4);
                        let modifier = 0.6 + 0.4 * noise;
                        if (Math.random() < 0.015) modifier = 0.05; // temporary brownout
                        else if (Math.random() < 0.008) modifier = 1.6; // temporary spike/spark
                        fl.light.intensity = fl.baseIntensity * modifier;
                        if (fl.mesh) {
                            fl.mesh.material.color.copy(fl.baseColor).multiplyScalar(Math.min(1.5, modifier));
                            fl.mesh.material.opacity = Math.min(1.0, 0.4 + modifier * 0.6);
                        }
                    }
                }
            }

            // Rotate Radar Dishes
            if (this.radarDishes) {
                for (let i = 0; i < this.radarDishes.length; i++) {
                    this.radarDishes[i].dishSubGroup.rotation.y += delta * 0.4;
                }
            }

            // Pulse Specimen Tank Cores
            if (this.specimenTanks) {
                for (let i = 0; i < this.specimenTanks.length; i++) {
                    const st = this.specimenTanks[i];
                    if (!this.powerOnline) {
                        st.core.material.opacity = 0.15;
                        st.light.intensity = 0.0;
                    } else {
                        st.time += delta * 3.0;
                        st.core.material.opacity = 0.5 + 0.3 * Math.sin(st.time);
                        st.light.intensity = 1.0 + 0.5 * Math.sin(st.time * 2.0);
                        // Spawn toxic steam particles occasionally
                        if (typeof emitParticle === 'function' && Math.random() < 0.15) {
                            const angle = Math.random() * Math.PI * 2;
                            const r = Math.random() * 1.5;
                            const wx = st.core.parent.position.x * this.MAP_SCALE;
                            const wy = (st.core.parent.position.y + 3.0) * this.MAP_SCALE + this.MAP_Y_OFFSET;
                            const wz = st.core.parent.position.z * this.MAP_SCALE;
                            emitParticle(
                                wx + Math.cos(angle) * r * this.MAP_SCALE,
                                wy,
                                wz + Math.sin(angle) * r * this.MAP_SCALE,
                                (Math.random() - 0.5) * 4.0,
                                2.0 + Math.random() * 3.0,
                                (Math.random() - 0.5) * 4.0,
                                0.0, 1.0, 0.4,
                                12.0 + Math.random() * 8.0,
                                0.8 + Math.random() * 0.5
                            );
                        }
                    }
                }
            }

            // Update Computer Screen Textures with retro CRT scrolling logs
            if (this.computerScreens) {
                const now = Date.now();
                for (let i = 0; i < this.computerScreens.length; i++) {
                    const cs = this.computerScreens[i];
                    cs.time += delta;
                    
                    if (now - cs.lastDrawTime > 100) {
                        cs.lastDrawTime = now;
                        const canvas = cs.canvas;
                        const ctx = canvas.getContext('2d');
                        
                        ctx.fillStyle = '#000000';
                        ctx.fillRect(0, 0, 256, 128);
                        
                        if (!this.powerOnline) {
                            ctx.fillStyle = '#ff1111';
                            ctx.font = 'bold 16px "Courier New"';
                            ctx.fillText("☣️ ERROR: GRID OFFLINE ☣️", 10, 30);
                            
                            ctx.fillStyle = '#ff5555';
                            ctx.font = '12px "Courier New"';
                            ctx.fillText("RESTORE MAIN GENERATOR", 15, 60);
                            ctx.fillText("GRID STATUS: 0%", 15, 80);
                            
                            if (Math.floor(cs.time * 2.0) % 2 === 0) {
                                ctx.fillText("> SYS_STANDBY_RED_ALERT <", 15, 110);
                            }
                            
                            cs.screenLight.color.setHex(0xff0000);
                            cs.screenLight.intensity = 0.3 + 0.1 * Math.sin(cs.time * 5);
                        } else {
                            ctx.fillStyle = '#00ffcc';
                            ctx.font = 'bold 14px "Courier New"';
                            ctx.fillText("SYS_BOOT: OK (v2.81)", 10, 25);
                            
                            ctx.font = '11px "Courier New"';
                            ctx.fillStyle = '#00e5ff';
                            
                            const baseTemp = 1350;
                            const tempOffset = Math.floor(Math.sin(cs.time * 2) * 45 + Math.random() * 10);
                            ctx.fillText(`REACTOR_TEMP: ${baseTemp + tempOffset} C`, 10, 50);
                            
                            ctx.fillText("WARNING: PROTO-TYPHON ACTIVE", 10, 70);
                            
                            ctx.fillStyle = '#88ff88';
                            const lineOffset = Math.floor(cs.time) % 3;
                            if (lineOffset === 0) {
                                ctx.fillText("> CHECKING SECTOR SHIELDS...", 10, 95);
                                ctx.fillText("> CONTAINMENT INTEGRITY: 98.4%", 10, 110);
                            } else if (lineOffset === 1) {
                                ctx.fillText("> FLOW_REGULATOR: RUNNING", 10, 95);
                                ctx.fillText("> PRESSURE VALVE: LOCKED", 10, 110);
                            } else {
                                ctx.fillText("> ANOMALY DETECTED IN R-8", 10, 95);
                                ctx.fillText("> SYNAPSE GRID SYNC: 100%", 10, 110);
                            }
                            
                            cs.screenLight.color.setHex(0x00e5ff);
                            const flickerVal = 0.8 + 0.25 * Math.sin(cs.time * 15.0);
                            cs.screenLight.intensity = flickerVal;
                        }
                        
                        cs.screenTex.needsUpdate = true;
                    }
                }
            }

            // Pulse Occult Sigils
            if (this.glowingSigils) {
                for (let i = 0; i < this.glowingSigils.length; i++) {
                    const sigil = this.glowingSigils[i];
                    sigil.time += delta * 2.5;
                    sigil.mesh.material.opacity = 0.4 + 0.35 * Math.sin(sigil.time);
                }
            }

            // Pulse Mystery Box Aura
            if (this.boxAura) {
                this.boxAura.rotation.z += delta * 0.8;
                this.boxAura.scale.setScalar(1.0 + 0.06 * Math.sin(Date.now() * 0.003));
                if (!this.powerOnline) {
                    this.boxAura.material.color.setHex(0x550000);
                    this.boxAura.material.opacity = 0.15;
                    if (this.boxLight) this.boxLight.intensity = 0.0;
                } else {
                    if (this.boxState === 'rolling') {
                        this.boxAura.material.color.setHSL((Date.now() % 1000) / 1000, 1.0, 0.5);
                        this.boxAura.material.opacity = 0.8;
                        if (this.boxLight) {
                            this.boxLight.intensity = 1.5;
                            this.boxLight.color.setHSL((Date.now()%600)/600, 1.0, 0.5);
                        }
                    } else if (this.boxState === 'ready') {
                        this.boxAura.material.color.setHex(0x00ff66);
                        this.boxAura.material.opacity = 0.7;
                        if (this.boxLight) {
                            this.boxLight.intensity = 1.5;
                            this.boxLight.color.setHex(0x00ff66);
                        }
                    } else {
                        this.boxAura.material.color.setHex(0xff5500);
                        this.boxAura.material.opacity = 0.45;
                        if (this.boxLight) {
                            this.boxLight.intensity = 1.5;
                            this.boxLight.color.setHex(0xff5500);
                        }
                    }
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
                if (!this.powerOnline) {
                    this.cleanupBox();
                } else {
                    this.boxTimer -= delta;
                    if (this.boxTimer <= 0) {
                        this.boxState = 'ready'; this.boxTimer = 10.0;
                        if (this.boxLight) this.boxLight.color.setHex(0x00ff66);
                        
                        const weaponKeys = Object.keys(window.weaponsCfg || {}).filter(k => k !== 'tentacle');
                        this.boxWeapon = weaponKeys[Math.floor(Math.random() * weaponKeys.length)] || 'ar';
                        
                        if (this.boxWeaponMesh) this.group.remove(this.boxWeaponMesh);
                        this.boxWeaponMesh = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.3, 0.3), new THREE.MeshBasicMaterial({ color: 0x33ffaa, wireframe: true }));
                        this.boxWeaponMesh.position.set(this.boxMesh.position.x, this.boxMesh.position.y + 1.2, this.boxMesh.position.z);
                        this.group.add(this.boxWeaponMesh);

                        this.boxPickupInteractable = {
                            type: 'box_pickup',
                            x: this.boxMesh.position.x * this.MAP_SCALE,
                            y: (this.boxMesh.position.y + 1.0) * this.MAP_SCALE + this.MAP_Y_OFFSET,
                            z: this.boxMesh.position.z * this.MAP_SCALE,
                            radius: 40.0, cost: 0,
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
                }
            } else if (this.boxState === 'ready') {
                this.boxTimer -= delta;
                if (this.boxWeaponMesh) {
                    this.boxWeaponMesh.rotation.y += delta * 1.5;
                    this.boxWeaponMesh.position.y = this.boxMesh.position.y + 1.2 + Math.sin(Date.now()*0.004)*0.05;
                }
                if (this.boxTimer <= 0) this.cleanupBox();
            }

            // Dynamically update locked interactable labels depending on power status
            for (let i = 0; i < this.interactables.length; i++) {
                const item = this.interactables[i];
                if (item.type === 'wallbuy' || item.type === 'mystery_box') {
                    if (!this.powerOnline) {
                        item.text = `[POWER OFFLINE] ${item.baseText || item.text}`;
                    } else {
                        item.text = item.baseText || item.text;
                    }
                }
            }

            // Ceiling fluid dripping system
            if (typeof emitParticle === 'function') {
                if (!this.driptime) this.driptime = 0;
                this.driptime += delta;
                if (this.driptime > 0.05) {
                    this.driptime = 0;
                    
                    // Room 2 (Power Vault): Green toxic slime
                    if (Math.random() < 0.25) {
                        const px = (Math.random() * 26 - 13) * this.MAP_SCALE;
                        const pz = (Math.random() * -13 - 1) * this.MAP_SCALE;
                        const py = 4.5 * this.MAP_SCALE + this.MAP_Y_OFFSET - 2.0;
                        emitParticle(px, py, pz, 0, -5.0, 0, 0.1, 0.9, 0.2, 15.0 + Math.random() * 10.0, 2.0);
                    }
                    
                    // Room 7 (Bio-Lab): Glowing bio-leak droplets
                    if (Math.random() < 0.25) {
                        const px = (Math.random() * 26 - 13) * this.MAP_SCALE;
                        const pz = (Math.random() * -13 - 1) * this.MAP_SCALE;
                        const py = 18.0 * this.MAP_SCALE + this.MAP_Y_OFFSET - 2.0;
                        emitParticle(px, py, pz, 0, -5.0, 0, 0.0, 0.8, 0.9, 15.0 + Math.random() * 10.0, 2.5);
                    }
                    
                    // Room 8 (Reactor Core): Rusty water droplets
                    if (Math.random() < 0.25) {
                        const px = (Math.random() * 26 - 13) * this.MAP_SCALE;
                        const pz = (Math.random() * 13 + 1) * this.MAP_SCALE;
                        const py = 22.5 * this.MAP_SCALE + this.MAP_Y_OFFSET - 2.0;
                        emitParticle(px, py, pz, 0, -5.0, 0, 0.8, 0.35, 0.1, 12.0 + Math.random() * 8.0, 3.0);
                    }
                }
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
            let standingInOfflinePortal = false;
            if (this.portals && this.portals.length) {
                for (let i = 0; i < this.portals.length; i++) {
                    const portal = this.portals[i];
                    // Player position is in world space
                    const dx = playerPosition.x - portal.x;
                    const dy = playerPosition.y - portal.y;
                    const dz = playerPosition.z - portal.z;
                    const distXZ = Math.sqrt(dx * dx + dz * dz);
                    
                    // Teleport player if they are inside the XZ radius AND close vertically (within 40.0 units)
                    if (distXZ < portal.radius && Math.abs(dy) < 40.0) {
                        if (!this.powerOnline) {
                            standingInOfflinePortal = true;
                            continue;
                        }
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

            if (standingInOfflinePortal && promptEl) {
                promptEl.style.color = '#ff3333';
                promptEl.textContent = '[PORTAL OFFLINE - RESTORE GENERATOR POWER]';
                promptEl.style.display = 'block';
            }

            // Pulse portal visuals
            if (this.portalVisualsList) {
                for (let i = 0; i < this.portalVisualsList.length; i++) {
                    const pv = this.portalVisualsList[i];
                    pv.time += delta;
                    if (!this.powerOnline) {
                        pv.light.intensity = 0.0;
                        if (pv.cylinder.material.uniforms) {
                            pv.cylinder.material.uniforms.uTime.value = pv.time;
                            pv.cylinder.material.uniforms.uPowerOnline.value = 0.0;
                            pv.cylinder.material.uniforms.uColor.value.setHex(0xff0000);
                        } else {
                            pv.cylinder.material.opacity = 0.05;
                            pv.cylinder.material.color.setHex(0xff0000);
                        }
                        if (pv.ringBottom) pv.ringBottom.material.color.setHex(0xff0000);
                        if (pv.ringTop) pv.ringTop.material.color.setHex(0xff0000);
                        if (pv.ringMid) pv.ringMid.material.color.setHex(0xff0000);
                        if (pv.ringSub1) pv.ringSub1.material.color.setHex(0xff0000);
                        if (pv.ringSub2) pv.ringSub2.material.color.setHex(0xff0000);
                        pv.cylinder.rotation.y += delta * 0.2;
                    } else {
                        pv.light.intensity = pv.baseIntensity * (0.8 + 0.4 * Math.sin(pv.time * 6.0));
                        if (pv.cylinder.material.uniforms) {
                            pv.cylinder.material.uniforms.uTime.value = pv.time;
                            pv.cylinder.material.uniforms.uPowerOnline.value = 1.0;
                            pv.cylinder.material.uniforms.uColor.value.copy(pv.baseColor);
                        } else {
                            pv.cylinder.material.opacity = 0.35;
                            pv.cylinder.material.color.copy(pv.baseColor);
                        }
                        
                        // Spin containment rings in opposite directions
                        const rotSpeed = delta * 1.5;
                        if (pv.ringBottom) {
                            pv.ringBottom.material.color.copy(pv.baseColor);
                            pv.ringBottom.rotation.z += rotSpeed;
                        }
                        if (pv.ringTop) {
                            pv.ringTop.material.color.copy(pv.baseColor);
                            pv.ringTop.rotation.z -= rotSpeed;
                        }
                        if (pv.ringMid) {
                            pv.ringMid.material.color.copy(pv.baseColor);
                            pv.ringMid.rotation.z += rotSpeed * 0.5;
                        }
                        if (pv.ringSub1) {
                            pv.ringSub1.material.color.copy(pv.baseColor);
                            pv.ringSub1.rotation.z -= rotSpeed * 0.75;
                        }
                        if (pv.ringSub2) {
                            pv.ringSub2.material.color.copy(pv.baseColor);
                            pv.ringSub2.rotation.z += rotSpeed * 0.75;
                        }

                        pv.cylinder.rotation.y += delta * 1.5;
                        const scale = 1.0 + 0.05 * Math.sin(pv.time * 3.0);
                        pv.cylinder.scale.set(scale, 1.0, scale);
                    }
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
                if (!this.powerOnline && (this.currentInteractable.type === 'wallbuy' || this.currentInteractable.type === 'mystery_box')) {
                    if (window.SFX?.triggerUI) window.SFX.triggerUI();
                    return;
                }
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