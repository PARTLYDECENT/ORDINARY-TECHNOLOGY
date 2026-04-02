export const WEAPON = {
    // Noise and Helpers
    helpers: `
        float hash(vec3 p) {
            p = fract(p * 0.3183099 + .1);
            p *= 17.0;
            return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
        }

        float noise(vec3 x) {
            vec3 i = floor(x);
            vec3 f = fract(x);
            f = f*f*(3.0-2.0*f);
            return mix(mix(mix(hash(i+vec3(0,0,0)), hash(i+vec3(1,0,0)),f.x),
                           mix(hash(i+vec3(0,1,0)), hash(i+vec3(1,1,0)),f.x),f.y),
                       mix(mix(hash(i+vec3(0,0,1)), hash(i+vec3(1,0,1)),f.x),
                           mix(hash(i+vec3(0,1,1)), hash(i+vec3(1,1,1)),f.x),f.y),f.z);
        }

        float fbm(vec3 p) {
            float f = 0.0;
            f += 0.5000*noise(p); p = p*2.02;
            f += 0.2500*noise(p); p = p*2.03;
            f += 0.1250*noise(p);
            return f;
        }

        float sdRoundBox( vec3 p, vec3 b, float r ) {
            vec3 q = abs(p) - b;
            return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0) - r;
        }

        float sdCylinder(vec3 p, vec2 h) {
            vec2 d = abs(vec2(length(p.xy), p.z)) - h;
            return min(max(d.x, d.y), 0.0) + length(max(d, 0.0));
        }

        float sdBox2D( vec2 p, vec2 b ) {
            vec2 d = abs(p) - b;
            return length(max(d,0.0)) + min(max(d.x,d.y),0.0);
        }

        float sdCap2D( vec2 p, vec2 a, vec2 b, float r ) {
            vec2 pa = p - a, ba = b - a;
            float h = clamp( dot(pa,ba)/dot(ba,ba), 0.0, 1.0 );
            return length( pa - ba*h ) - r;
        }
        
        float sdCapsule( vec3 p, vec3 a, vec3 b, float r ) {
            vec3 pa = p - a, ba = b - a;
            float h = clamp( dot(pa,ba)/dot(ba,ba), 0.0, 1.0 );
            return length( pa - ba*h ) - r;
        }

        float opSmoothSub( float d1, float d2, float k ) {
            float h = clamp( 0.5 - 0.5*(d2+d1)/k, 0.0, 1.0 );
            return mix( d2, -d1, h ) + k*h*(1.0-h);
        }

        float opSmoothUnion( float d1, float d2, float k ) {
            float h = clamp( 0.5 + 0.5*(d2-d1)/k, 0.0, 1.0 );
            return mix( d2, d1, h ) - k*h*(1.0-h);
        }

        vec2 opU(vec2 d1, vec2 d2) {
            return (d1.x < d2.x) ? d1 : d2;
        }


    `,

    // The text SDF
    text: `
        float sdOrdinary(vec2 p) {
            float d = 1e5;
            float r = 0.015;
            vec2 q;
            
            // O
            q = p - vec2(-0.7, 0.0);
            d = min(d, abs(sdBox2D(q, vec2(0.04, 0.08))) - r);
            // R
            q = p - vec2(-0.5, 0.0);
            d = min(d, sdCap2D(q, vec2(-0.04,-0.08), vec2(-0.04,0.08), r));
            d = min(d, abs(sdBox2D(q - vec2(0.0, 0.04), vec2(0.04, 0.04))) - r);
            d = min(d, sdCap2D(q, vec2(-0.04,0.0), vec2(0.04,-0.08), r));
            // D
            q = p - vec2(-0.3, 0.0);
            d = min(d, sdCap2D(q, vec2(-0.04,-0.08), vec2(-0.04,0.08), r));
            d = min(d, abs(sdBox2D(vec2(max(0.0, q.x+0.04), q.y), vec2(0.04, 0.08))) - r);
            // I
            q = p - vec2(-0.1, 0.0);
            d = min(d, sdCap2D(q, vec2(0.0,-0.08), vec2(0.0,0.08), r));
            // N
            q = p - vec2(0.1, 0.0);
            d = min(d, sdCap2D(q, vec2(-0.04,-0.08), vec2(-0.04,0.08), r));
            d = min(d, sdCap2D(q, vec2(0.04,-0.08), vec2(0.04,0.08), r));
            d = min(d, sdCap2D(q, vec2(-0.04,0.08), vec2(0.04,-0.08), r));
            // A
            q = p - vec2(0.3, 0.0);
            d = min(d, sdCap2D(q, vec2(-0.04,-0.08), vec2(0.0,0.08), r));
            d = min(d, sdCap2D(q, vec2(0.04,-0.08), vec2(0.0,0.08), r));
            d = min(d, sdCap2D(q, vec2(-0.02,0.0), vec2(0.02,0.0), r));
            // R
            q = p - vec2(0.5, 0.0);
            d = min(d, sdCap2D(q, vec2(-0.04,-0.08), vec2(-0.04,0.08), r));
            d = min(d, abs(sdBox2D(q - vec2(0.0, 0.04), vec2(0.04, 0.04))) - r);
            d = min(d, sdCap2D(q, vec2(-0.04,0.0), vec2(0.04,-0.08), r));
            // Y
            q = p - vec2(0.7, 0.0);
            d = min(d, sdCap2D(q, vec2(0.0,-0.01), vec2(0.0,-0.08), r));
            d = min(d, sdCap2D(q, vec2(0.0,-0.01), vec2(-0.04,0.08), r));
            d = min(d, sdCap2D(q, vec2(0.0,-0.01), vec2(0.04,0.08), r));
            
            return d;
        }
    `,

    // Gun Map
    mapGun: `
        vec2 mapGun(vec3 pOriginal) {
            vec3 p = pOriginal;
            
            // FPS Positioning & Recoil Transformation
            float fireAnim = exp(-u_fireTime * 15.0); // sharp kick
            
            // Bobbing movement based on u_time and velocity (we can just use u_time for now)
            float bobX = sin(u_time * 3.0) * 0.02;
            float bobY = cos(u_time * 6.0) * 0.02;
            
            p -= vec3(0.5 + bobX, -0.6 + bobY, 2.5); // Right, Down, Forward
            
            p.z += fireAnim * 0.3; // Kickback
            p.yz *= rot(fireAnim * 0.15); // Muzzle rise
            
            // Apply scale so it isn't massive
            float scale = 0.5;
            p /= scale;

            vec2 res = vec2(MAX_DIST, 0.0);

            vec3 symP = p;
            symP.x = abs(symP.x); 

            // 1. SLEEK STEALTH RECEIVER
            vec3 pBody = p;
            float body = sdRoundBox(pBody, vec3(0.08, 0.18, 1.1), 0.015);
            
            vec3 pTopCut = pBody - vec3(0.0, 0.22, 0.2);
            pTopCut.yz *= rot(0.08); 
            body = max(body, -sdBox(pTopCut, vec3(0.5, 0.2, 1.5)));

            vec3 pBotCut = pBody - vec3(0.0, -0.22, 0.5);
            pBotCut.yz *= rot(-0.15); 
            body = max(body, -sdBox(pBotCut, vec3(0.5, 0.2, 1.5)));

            vec3 pPanels = symP - vec3(0.09, 0.0, -0.2);
            float panels = sdBox(pPanels, vec3(0.02, 0.12, 0.7));

            // TEXT EMBEDDING
            vec2 textUV = vec2((p.z + 0.2) * -sign(p.x), p.y) * 1.6; 
            float textDist2D = sdOrdinary(textUV) / 1.6;
            
            vec2 wText = vec2(textDist2D, abs(pPanels.x - 0.01) - 0.008);
            float text3D = min(max(wText.x, wText.y), 0.0) + length(max(wText, 0.0));
            
            vec2 wHole = vec2(textDist2D - 0.003, abs(pPanels.x - 0.015) - 0.01);
            float textHole = min(max(wHole.x, wHole.y), 0.0) + length(max(wHole, 0.0));
            panels = max(panels, -textHole);

            if (text3D < 0.1) {
                float firePulse = sin(u_time * 15.0 - p.z * 15.0) * 0.5 + 0.5;
                globalGlow += 0.006 * firePulse / (0.002 + abs(text3D)) * scale;
            }

            vec3 pPanelCut = pPanels - vec3(0.0, 0.0, 0.7);
            pPanelCut.yz *= rot(-0.5);
            panels = max(panels, -sdBox(pPanelCut, vec3(0.1, 0.3, 0.3)));
            body = opSmoothUnion(body, panels, 0.02);

            vec3 pHousing = p - vec3(0.0, 0.05, 0.95); 
            float housing = sdRoundBox(pHousing, vec3(0.085, 0.14, 0.55), 0.02); 
            
            vec3 pHousingCut = pHousing - vec3(0.0, 0.16, 0.0);
            pHousingCut.yz *= rot(0.12);
            housing = max(housing, -sdBox(pHousingCut, vec3(0.1, 0.1, 0.6)));
            
            vec3 pHousingCutBot = pHousing - vec3(0.0, -0.16, 0.0);
            pHousingCutBot.yz *= rot(-0.12);
            housing = max(housing, -sdBox(pHousingCutBot, vec3(0.1, 0.1, 0.6)));
            
            vec3 pHousingFront = pHousing - vec3(0.0, 0.0, 0.5);
            pHousingFront.yz *= rot(-0.4);
            housing = max(housing, -sdBox(pHousingFront, vec3(0.15, 0.2, 0.3)));
            
            float filler = sdBox(p - vec3(0.0, 0.02, 0.8), vec3(0.06, 0.1, 0.3));
            body = opSmoothUnion(body, filler, 0.05);
            body = opSmoothUnion(body, housing, 0.12); 

            // 2. RAILS
            vec3 pBarrel = p - vec3(0.0, 0.02, 1.2);
            vec3 pShroud = pBarrel;
            pShroud.xy *= rot(0.785398); 
            float shroud = sdBox(pShroud, vec3(0.075, 0.075, 0.8));
            
            float bore = sdCylinder(pBarrel, vec2(0.025, 0.85));
            shroud = max(shroud, -bore);

            vec3 pVents = pBarrel;
            pVents.yz *= rot(0.5); 
            pVents.z = mod(pVents.z, 0.15) - 0.075;
            float vents = sdBox(pVents, vec3(0.12, 0.15, 0.03)); 
            shroud = max(shroud, -vents);

            // 3. CORE
            vec3 pCore = pBarrel;
            float coreLine = sdCylinder(pCore, vec2(0.012, 0.82));
            vec3 pPulse = pCore;
            pPulse.z = mod(pPulse.z - u_time * 1.5, 0.3) - 0.15;
            float pulse = sdRoundBox(pPulse, vec3(0.03, 0.03, 0.08), 0.01);
            
            // During fire, pulse expands
            float coreRadius = mix(0.025, 0.06, fireAnim);
            float core = min(coreLine, max(pulse, sdCylinder(pCore, vec2(coreRadius, 0.8))));
            
            globalGlow += (0.015 / (0.005 + abs(core))) * scale;

            // Muzzle Flash
            if(fireAnim > 0.01) {
                vec3 pFlash = p - vec3(0.0, 0.02, 2.1);
                float flash = length(pFlash) - 0.1 * fireAnim;
                globalGlow += (1.0 * fireAnim) / (0.05 + abs(flash)) * scale;
            }

            // 4. GRIP & STOCK
            vec3 pGrip = p - vec3(0.0, -0.35, -0.1);
            pGrip.yz *= rot(0.4); 
            float grip = sdRoundBox(pGrip, vec3(0.07, 0.25, 0.1), 0.03);

            vec3 pStock = p - vec3(0.0, -0.1, -1.3); 
            float stock = sdRoundBox(pStock, vec3(0.07, 0.22, 0.6), 0.02); 
            
            float cheekRest = sdRoundBox(pStock - vec3(0.0, 0.22, 0.15), vec3(0.05, 0.05, 0.3), 0.02);
            stock = opSmoothUnion(stock, cheekRest, 0.05);

            vec3 pBridge = p - vec3(0.0, -0.4, -0.7); 
            float bridge = sdBox(pBridge, vec3(0.06, 0.04, 0.55));
            stock = opSmoothUnion(stock, bridge, 0.08);
            stock = opSmoothUnion(stock, grip, 0.08); 

            vec3 pThumbHole = p - vec3(0.0, -0.18, -0.6); 
            vec3 pThumbCyl = pThumbHole.yzx; 
            float thumbCut = sdCylinder(pThumbCyl, vec2(0.12, 0.3));
            stock = opSmoothSub(thumbCut, stock, 0.05);

            vec3 pNeckTop = pStock - vec3(0.0, 0.35, 0.1);
            stock = opSmoothSub(sdCylinder(pNeckTop.yzx, vec2(0.2, 0.5)), stock, 0.15);

            vec3 pNeckBot = pStock - vec3(0.0, -0.35, 0.1);
            stock = opSmoothSub(sdCylinder(pNeckBot.yzx, vec2(0.15, 0.5)), stock, 0.15);

            // OPTIC
            vec3 pOptic = p - vec3(0.0, 0.26, -0.1);
            float opticBase = sdBox(pOptic - vec3(0.0, -0.05, 0.0), vec3(0.04, 0.01, 0.15));
            float scopeBody = sdRoundBox(pOptic, vec3(0.045, 0.045, 0.15), 0.005);
            
            vec3 pScopeCut = pOptic - vec3(0.0, 0.05, 0.0);
            pScopeCut.yz *= rot(0.08);
            scopeBody = max(scopeBody, -sdBox(pScopeCut, vec3(0.06, 0.02, 0.2)));
            
            vec3 pLensCut = pOptic - vec3(0.0, 0.0, 0.15);
            pLensCut.yz *= rot(-0.4);
            scopeBody = max(scopeBody, -sdBox(pLensCut, vec3(0.06, 0.06, 0.05)));
            float optic = min(opticBase, scopeBody);
            
            vec3 pLens = pOptic - vec3(0.0, 0.0, 0.14);
            pLens.yz *= rot(-0.4);
            float lens = sdBox(pLens, vec3(0.035, 0.035, 0.002));
            
            vec3 pEyePiece = pOptic - vec3(0.0, 0.0, -0.15);
            float eyePiece = sdBox(pEyePiece, vec3(0.03, 0.03, 0.002));
            globalGlow += 0.006 / (0.002 + abs(eyePiece)) * scale;


            res = opU(res, vec2(body, 1.0));
            res = opU(res, vec2(text3D, 7.0));
            res = opU(res, vec2(shroud, 2.0));
            res = opU(res, vec2(core, 3.0));
            res = opU(res, vec2(stock, 1.0));
            res = opU(res, vec2(grip, 4.0));
            res = opU(res, vec2(optic, 1.0));
            res = opU(res, vec2(lens, 5.0));
            res = opU(res, vec2(eyePiece, 6.0));

            float hardStopFront = p.z - 2.05;
            float hardStopBack  = -p.z - 1.95;
            float globalZStops = max(hardStopFront, hardStopBack);
            res.x = max(res.x, globalZStops);

            // Scale back
            res.x *= scale;

            return res;
        }
    `,

    // Raymarch Gun specific loop
    rayMarchGun: `
        // Custom normal calc for gun
        vec3 getNormalGun(vec3 p) {
            vec2 e = vec2(0.001, 0.0);
            vec3 n = vec3(
                mapGun(p + e.xyy).x - mapGun(p - e.xyy).x,
                mapGun(p + e.yxy).x - mapGun(p - e.yxy).x,
                mapGun(p + e.yyx).x - mapGun(p - e.yyx).x
            );
            return normalize(n);
        }

        // Returns {dist, matID, hit}
        vec3 marchFPSGun(vec3 ro, vec3 rd) {
            float t = 0.0;
            float matID = 0.0;
            for(int i = 0; i < 80; i++) {
                vec3 p = ro + rd * t;
                vec2 d = mapGun(p);
                if(abs(d.x) < 0.001) {
                    return vec3(t, d.y, 1.0);
                }
                t += d.x * 0.75;
                if(t > 5.0) break; // gun max dist
            }
            return vec3(t, 0.0, 0.0);
        }
    `,

    shadeGun: `
        vec3 getGunColor(vec3 p, vec3 n, vec3 rd, float matID) {
            vec3 viewDir = -rd;
            // Gun light
            vec3 lightPos = vec3(2.0, 5.0, 0.0);
            vec3 l = normalize(lightPos - p);
            vec3 halfDir = normalize(l + viewDir);

            vec3 albedo = vec3(0.0);
            float rough = 0.5;
            float metallic = 0.0;
            
            if(matID == 1.0) { 
                float noiseVal = fbm(p * 3.5); 
                if(noiseVal < 0.35) { albedo = vec3(0.85, 0.88, 0.9); rough = 0.5; } 
                else if(noiseVal < 0.55) { albedo = vec3(0.5, 0.55, 0.6); rough = 0.6; } 
                else if(noiseVal < 0.75) { albedo = vec3(0.2, 0.25, 0.3); rough = 0.4; } 
                else { albedo = vec3(0.05, 0.08, 0.12); rough = 0.3; }
            } 
            else if(matID == 2.0) { albedo = vec3(0.2, 0.22, 0.25); rough = 0.3; metallic = 0.8;}
            else if(matID == 4.0) { albedo = vec3(0.02); rough = 0.85; }
            else if(matID == 3.0) { albedo = vec3(1.0, 0.2, 0.05); rough = 0.1; }
            else if(matID == 5.0) { albedo = vec3(0.02, 0.05, 0.1); rough = 0.05; metallic = 1.0; }
            else if(matID == 6.0) { albedo = vec3(1.0, 0.0, 0.0); rough = 0.5; }
            else if(matID == 7.0) { albedo = vec3(1.0, 0.2, 0.0); rough = 0.2; }


            float dif = clamp(dot(n, l), 0.0, 1.0);
            float f0 = mix(0.04, 1.0, metallic);
            float specBase = pow(clamp(dot(n, halfDir), 0.0, 1.0), mix(16.0, 128.0, 1.0 - rough));
            float spec = f0 * specBase;
            


            float amb = 0.05 + 0.05 * n.y;
            float rim = pow(1.0 - max(dot(viewDir, n), 0.0), 3.0) * mix(0.1, 0.3, metallic);
            


            vec3 col = albedo * (dif + amb) + spec * vec3(1.0) + rim * vec3(0.6, 0.6, 0.7);




            // Emissive
            if(matID == 3.0) {
                col = vec3(1.0, 0.1, 0.0) * 2.0;
            } else if(matID == 6.0) {
                col = vec3(1.0, 0.2, 0.05) * 3.0;
            } else if(matID == 7.0) {
                float fireFlicker = fbm(p * 20.0 - vec3(0.0, 0.0, u_time * 2.0));
                float firePulse = pow(fireFlicker, 2.0) * 2.0 + sin(u_time * 15.0 - p.z * 10.0) * 0.5 + 0.5;
                col = vec3(1.0, 0.3, 0.0) * (1.0 + firePulse * 4.0);
            }

            // Muzzle flash light on gun
            float fireAnim = exp(-u_fireTime * 15.0);
            if(fireAnim > 0.01) {
                vec3 flashCenter = vec3(0.0, 0.0, 2.1);
                float distToFlash = length(p - flashCenter);
                float flashLight = (1.0 * fireAnim) / (distToFlash * distToFlash + 0.01);
                col += vec3(1.0, 0.5, 0.1) * flashLight * max(dot(n, normalize(flashCenter - p)), 0.0) * 0.5;
            }

            return col;
        }
    `
};
