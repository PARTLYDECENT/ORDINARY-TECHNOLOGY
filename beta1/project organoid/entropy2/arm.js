export const ARM_SHADER = {
    helpers: `
        // Parametric Finger Generator
        float getFinger(vec3 p, vec3 root, float spread, float c1, float c2, float c3, float r, float len1, float len2, float len3) {
            vec3 d1 = vec3(0.0, 0.0, -1.0);
            d1.xz *= rot(spread);
            d1.yz *= rot(-c1); // Base curl
            vec3 p1 = root + d1 * len1;

            vec3 d2 = d1;
            d2.yz *= rot(-c2); // Mid curl
            vec3 p2 = p1 + d2 * len2;

            vec3 d3 = d2;
            d3.yz *= rot(-c3); // Tip curl
            vec3 p3 = p2 + d3 * len3;

            float r1 = r, r2 = r * 0.9, r3 = r * 0.8;

            // 3 segments
            float f = sdCapsule(p, root, p1, r1);
            f = smin(f, sdCapsule(p, p1, p2, r2), 0.015);
            f = smin(f, sdCapsule(p, p2, p3, r3), 0.015);

            // Mechanical joints
            float j1 = max(length(p - p1) - r1 * 1.15, abs(dot(p - p1, d1)) - 0.015);
            float j2 = max(length(p - p2) - r2 * 1.15, abs(dot(p - p2, d2)) - 0.015);
            
            f = min(f, j1);
            f = min(f, j2);

            return f;
        }
    `,

    // ─── LLM-CONTROLLABLE UNIFORMS ───
    // u_armGrab:  0.0 = open/relaxed, 1.0 = full grab fist
    // u_armSway:  0.0 = idle auto-sway on, 1.0 = override sway amount  
    // u_armPose:  0.0 = neutral, 1.0 = point, 2.0 = wave, 3.0 = fist
    uniforms: `
        uniform float u_armGrab;
        uniform float u_armSway;
        uniform float u_armPose;
    `,

    map: `
        vec2 mapArm(vec3 pOrig) {
            vec3 p = pOrig;
            
            // ─── AUTOMATIC IDLE ANIMATION ───
            float idleSway = u_armSway;
            float autoSwayX = sin(u_time * 1.5) * 0.03 * (1.0 - idleSway);
            float autoSwayY = cos(u_time * 2.3) * 0.02 * (1.0 - idleSway);
            float autoBreath = sin(u_time * 0.8) * 0.01;
            
            // FPS Positioning — LEFT SIDE of screen
            float bobX = sin(u_time * 3.0) * 0.02;
            float bobY = cos(u_time * 6.0) * 0.02;
            
            p -= vec3(0.42 + autoSwayX, -0.7 + autoSwayY + autoBreath, 2.2); 
            
            float scale = 0.5;
            p /= scale;

            // Flip arm 180 degrees so it faces AWAY from camera
            p.xz *= rot(3.14159);

            // Orient and position arm near the gun grip bottom
            p -= vec3(0.0, -0.15, 0.4); 
            // Idle wrist rotation animation
            float wristIdle = sin(u_time * 1.2) * 0.06 * (1.0 - idleSway);

            p.xz *= rot(0.25 + wristIdle);     // Straightened Yaw
            p.yz *= rot(0.1);                // Pitch up slightly (thumb up)
            p.xy *= rot(0.1);                // Roll — thumb pointing UP

            float dHand = 1000.0;

            // PALM
            float palm = sdRoundBox(p - vec3(0.0, 0.0, -0.05), vec3(0.18, 0.03, 0.20), 0.05);
            float knucklesBase = sdCapsule(p, vec3(-0.25, 0.0, -0.32), vec3(0.25, -0.02, -0.28), 0.06);
            palm = smin(palm, knucklesBase, 0.05);
            float hypoPad = sdCapsule(p, vec3(0.18, -0.02, 0.1), vec3(0.22, -0.01, -0.15), 0.06);
            palm = smin(palm, hypoPad, 0.05);
            dHand = palm;

            // FOREARM
            vec3 armStart = vec3(0.0, 0.0, 0.2);
            vec3 armEnd = vec3(0.0, 0.0, 5.0);
            float arm = sdCapsule(p, armStart, armEnd, 0.18); 

            // Folds
            vec3 ap = p - armStart;
            vec3 ab = armEnd - armStart;
            float hArm = clamp(dot(ap, ab)/dot(ab,ab), 0.0, 1.0);
            arm += sin(hArm * 40.0 + p.x * 8.0) * 0.01 * smoothstep(0.0, 0.3, hArm);

            dHand = smin(dHand, arm, 0.1);

            // CUFF
            float cuff = sdCapsule(p, vec3(0.01, -0.01, 0.2), vec3(0.06, -0.06, 0.35), 0.2);

            // ─── FINGER CURL: blend between poses ───
            // Auto finger fidget when idle
            float fidget = sin(u_time * 2.0) * 0.1 * (1.0 - u_armGrab);
            float grab = u_armGrab;
            
            // Pose overrides (u_armPose: 0=neutral, 1=point, 2=wave, 3=fist)
            float pose = u_armPose;
            
            // Index: stays extended when pointing (pose ~1)
            float indexGrab = (pose > 0.5 && pose < 1.5) ? 0.0 : max(grab, 0.6);
            vec4 cIndex = mix(vec4(0.03, 0.6 + fidget, 0.7, 0.5), vec4(0.03, 1.2, 1.4, 1.4), indexGrab);
            float fIndex = getFinger(p, vec3(-0.22, 0.0, -0.32), cIndex.x, cIndex.y, cIndex.z, cIndex.w, 0.065, 0.32, 0.22, 0.18);
            dHand = smin(dHand, fIndex, 0.025);
            
            // Wave animation for middle finger offset
            float waveOffset = (pose > 1.5 && pose < 2.5) ? sin(u_time * 5.0 + 1.0) * 0.3 : 0.0;
            vec4 cMid = mix(vec4(0.0, 0.65 + fidget + waveOffset, 0.75, 0.55), vec4(0.0, 1.2, 1.4, 1.4), grab);
            float fMid = getFinger(p, vec3(-0.06, 0.0, -0.35), cMid.x, cMid.y, cMid.z, cMid.w, 0.07, 0.36, 0.25, 0.2);
            dHand = smin(dHand, fMid, 0.025);

            float waveOffset2 = (pose > 1.5 && pose < 2.5) ? sin(u_time * 5.0 + 2.0) * 0.3 : 0.0;
            vec4 cRing = mix(vec4(-0.03, 0.7 + fidget + waveOffset2, 0.8, 0.6), vec4(-0.03, 1.2, 1.4, 1.4), grab);
            float fRing = getFinger(p, vec3(0.10, -0.01, -0.32), cRing.x, cRing.y, cRing.z, cRing.w, 0.065, 0.32, 0.22, 0.18);
            dHand = smin(dHand, fRing, 0.025);

            float waveOffset3 = (pose > 1.5 && pose < 2.5) ? sin(u_time * 5.0 + 3.0) * 0.3 : 0.0;
            vec4 cPinky = mix(vec4(-0.1, 0.75 + fidget + waveOffset3, 0.85, 0.65), vec4(-0.1, 1.2, 1.4, 1.4), grab);
            float fPinky = getFinger(p, vec3(0.25, -0.03, -0.26), cPinky.x, cPinky.y, cPinky.z, cPinky.w, 0.055, 0.24, 0.16, 0.14);
            dHand = smin(dHand, fPinky, 0.025);

            // THUMB
            vec4 cThumb = mix(vec4(0.4, 0.4, 0.3, -0.1), vec4(0.5, 0.8, 0.6, 0.2), grab);
            vec3 tRoot = vec3(-0.28, -0.02, 0.08);
            vec3 td1 = normalize(vec3(-0.8, -0.1, -0.8)); 
            td1.xz *= rot(cThumb.x); 
            vec3 tp1 = tRoot + td1 * 0.25;

            vec3 td2 = td1;
            td2.xz *= rot(cThumb.y); 
            td2.yz *= rot(-0.1); 
            vec3 tp2 = tp1 + td2 * 0.22;

            vec3 td3 = td2;
            td3.xz *= rot(cThumb.z); 
            td3.yz *= rot(cThumb.w); 
            vec3 tp3 = tp2 + td3 * 0.18;

            float thumb = sdCapsule(p, tRoot, tp1, 0.06);
            thumb = smin(thumb, sdCapsule(p, tp1, tp2, 0.055), 0.015);
            thumb = smin(thumb, sdCapsule(p, tp2, tp3, 0.05), 0.015);
            
            float tj1 = max(length(p - tp1) - 0.085, abs(dot(p - tp1, td1)) - 0.015);
            float tj2 = max(length(p - tp2) - 0.08, abs(dot(p - tp2, td2)) - 0.015);
            thumb = min(thumb, tj1);
            thumb = min(thumb, tj2);
            
            float thenarPad = sdCapsule(p, vec3(-0.12, -0.03, 0.15), tRoot, 0.08);
            thumb = smin(thumb, thenarPad, 0.06);

            dHand = smin(dHand, thumb, 0.05);

            vec2 res = vec2(dHand * scale, 8.0);
            if (cuff * scale < res.x + 0.02 && p.z > 0.18 && p.z < 0.32) res = vec2(cuff * scale, 9.0);

            return res;
        }

        vec3 getNormalArm(vec3 p) {
            vec2 e = vec2(0.001, 0.0);
            vec3 n = vec3(
                mapArm(p + e.xyy).x - mapArm(p - e.xyy).x,
                mapArm(p + e.yxy).x - mapArm(p - e.yxy).x,
                mapArm(p + e.yyx).x - mapArm(p - e.yyx).x
            );
            return normalize(n);
        }

        vec3 marchFPSArm(vec3 ro, vec3 rd) {
            float t = 0.0;
            for(int i = 0; i < 80; i++) {
                vec3 p = ro + rd * t;
                vec2 d = mapArm(p);
                if(abs(d.x) < 0.001) return vec3(t, d.y, 1.0);
                t += d.x * 0.8;
                if(t > 5.0) break;
            }
            return vec3(t, 0.0, 0.0);
        }
    `,

    shade: `
        vec3 getArmColor(vec3 p, vec3 n, vec3 rd, float matID) {
            vec3 viewDir = -rd;
            vec3 l = normalize(vec3(1.0, 2.0, 1.0));
            vec3 halfDir = normalize(l + viewDir);

            vec3 albedo = vec3(0.06, 0.06, 0.07);
            float rough = 0.5;
            
            if(matID == 8.0) { 
                float clothNoise = fbm(p * 30.0) * 0.1;
                albedo = vec3(1.0, 0.8, 0.02) - clothNoise; 
                rough = 0.45; 
            } 
            else if(matID == 9.0) { albedo = vec3(0.08, 0.08, 0.09); rough = 0.6; }

            float dif = clamp(dot(n, l), 0.0, 1.0);
            float spec = pow(clamp(dot(n, halfDir), 0.0, 1.0), 32.0);
            if(matID == 8.0) spec *= 1.2;

            float rim = pow(1.0 - max(dot(viewDir, n), 0.0), 3.0);
            vec3 col = albedo * (dif + 0.1) + spec * 0.5;
            if(matID == 8.0) col += rim * vec3(0.9, 0.8, 0.2) * 0.5;

            return col;
        }
    `
};
