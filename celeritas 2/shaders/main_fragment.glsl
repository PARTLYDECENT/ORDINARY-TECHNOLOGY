out vec4 FragColor;
uniform vec2 iResolution;
uniform float iTime;

#define MAX_STEPS 150
#define MAX_DIST 100.0
#define SURF_DIST 0.002

vec2 map(vec3 p) {
    float speed = 15.0;
    float carZ = iTime * speed;
    vec3 pCar = p - vec3(0.0, 0.6, carZ); 

    if (length(pCar) > 6.0 && p.y > 0.0) {
        return minMat(vec2(length(pCar) - 3.5, 0.0), vec2(p.y, 6.0));
    }

    vec3 pSym = pCar;
    pSym.x = abs(pSym.x);

    // 1. Body Assembly
    float chassis = getChassis(pCar);
    float cabin = getCabin(pCar);
    float body = smin(chassis, cabin, 0.25);
    body = applyWedges(body, pCar);

    // 2. Additions
    float fenders = getFenders(pSym);
    body = smin(body, fenders, 0.15);

    // 3. Subtractions (Details)
    float grilles = min(getIntakes(pSym), getSideVents(pSym));
    body = smax(body, -grilles, 0.04);

    float hlHousing = getHeadlightHousings(pSym);
    body = smax(body, -hlHousing, 0.04);

    float wheelWells = getWheelWells(pSym);
    body = smax(body, -wheelWells, 0.05);

    float panelSeams = getPanelGaps(pSym);
    body = smax(body, -panelSeams, 0.015);

    float plateIndent = getPlateIndent(pCar);
    body = smax(body, -plateIndent, 0.02);

    // 4. Gather Materials
    vec2 res = vec2(body, 1.0); // Paint
    
    float headlights = getHeadlightLEDs(pSym);
    res = minMat(res, vec2(headlights, 5.0));

    float taillights = getTaillights(pSym);
    res = minMat(res, vec2(taillights, 7.0));

    float blackPlastics = getBlackPlastics(pSym);
    res = minMat(res, vec2(blackPlastics, 9.0));

    vec2 wheels = getWheels(pSym, carZ);
    res = minMat(res, vec2(wheels.x, 3.0)); // Tires
    res = minMat(res, vec2(wheels.y, 4.0)); // Rims

    // Ground
    res = minMat(res, vec2(p.y, 6.0));

    return res;
}

vec3 getNormal(vec3 p) {
    float d = map(p).x;
    vec2 e = vec2(0.002, 0); 
    return normalize(d - vec3(map(p - e.xyy).x, map(p - e.yxy).x, map(p - e.yyx).x));
}

float getShadow(vec3 ro, vec3 rd) {
    float res = 1.0;
    float t = 0.05;
    for(int i = 0; i < 30; i++) {
        float h = map(ro + rd * t).x;
        if(h < 0.001) return 0.05; 
        res = min(res, 14.0 * h / t); 
        t += h;
        if(t > 15.0) break;
    }
    return clamp(res, 0.05, 1.0);
}

float calcAO(vec3 p, vec3 n) {
    float occ = 0.0;
    float sca = 1.0;
    for(int i = 0; i < 5; i++) {
        float h = 0.01 + 0.12 * float(i)/4.0;
        float d = map(p + h * n).x;
        occ += (h - d) * sca;
        sca *= 0.95;
    }
    return clamp(1.0 - 2.0 * occ, 0.0, 1.0);
}

vec3 getEnvLight(vec3 dir) {
    vec3 sky = mix(vec3(0.01, 0.01, 0.02), vec3(0.05, 0.08, 0.12), smoothstep(-0.2, 1.0, dir.y));
    float box1 = smoothstep(0.85, 0.98, dot(dir, normalize(vec3(1.0, 0.5, -0.5))));
    sky += vec3(1.0, 0.8, 0.7) * box1 * 3.0;
    float box2 = smoothstep(0.9, 0.99, dot(dir, normalize(vec3(-1.0, 0.3, 0.8))));
    sky += vec3(0.5, 0.7, 1.0) * box2 * 2.0;
    float strip = smoothstep(0.97, 1.0, dot(dir, vec3(0.0, 1.0, 0.0)));
    sky += vec3(1.0, 1.0, 1.0) * strip * 2.0;
    return sky;
}

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * iResolution.xy) / iResolution.y;
    float carZ = iTime * 15.0;
    
    float camAngle = iTime * 0.4; 
    float camRadius = 8.0; 
    vec3 ro = vec3(sin(camAngle) * camRadius, 1.6 + sin(iTime * 0.2)*0.4, carZ + cos(camAngle) * camRadius);
    vec3 ta = vec3(0.0, 0.6, carZ + 1.0); 
    
    vec3 ww = normalize(ta - ro);
    vec3 uu = normalize(cross(ww, vec3(0.0, 1.0, 0.0)));
    vec3 vv = normalize(cross(uu, ww));
    vec3 rd = normalize(uv.x * uu + uv.y * vv + 1.5 * ww); 

    float t = 0.0;
    float matID = 0.0;
    vec3 p;
    
    for(int i = 0; i < MAX_STEPS; i++) {
        p = ro + rd * t;
        vec2 mapRes = map(p);
        if(mapRes.x < SURF_DIST) { matID = mapRes.y; break; }
        if(t > MAX_DIST) break;
        t += mapRes.x;
    }

    vec3 col = getEnvLight(rd) * 0.2; 

    if(t < MAX_DIST) {
        vec3 n = getNormal(p);
        vec3 viewDir = normalize(ro - p);
        vec3 refDir = reflect(-viewDir, n); 
        
        float ao = calcAO(p, n);
        vec3 lightDir = normalize(vec3(1.0, 1.0, -0.5));
        float shadow = getShadow(p + n * 0.01, lightDir);
        
        vec3 albedo = vec3(0.0);
        float roughness = 0.5;
        float metallic = 0.0;
        float ndotv = max(dot(n, viewDir), 0.0);

        if (matID == 1.0) { 
            albedo = mix(vec3(0.015, 0.015, 0.02), vec3(0.05, 0.05, 0.06), pow(ndotv, 1.2)); 
            roughness = 0.08; metallic = 0.8; 
        } 
        else if (matID == 3.0) { albedo = vec3(0.02); roughness = 0.9; }
        else if (matID == 4.0) { albedo = vec3(0.02); roughness = 0.15; metallic = 0.9; } 
        else if (matID == 5.0 || matID == 7.0) { albedo = (matID == 5.0) ? vec3(1.0, 0.9, 0.8) : vec3(1.0, 0.05, 0.0); } 
        else if (matID == 9.0) { albedo = vec3(0.01); roughness = 0.8; metallic = 0.0; }
        else if (matID == 6.0) { 
            vec2 uvG = p.xz; vec2 grid = fract(uvG * 0.5);
            float line = smoothstep(0.05, 0.0, min(grid.x, grid.y));
            albedo = mix(vec3(0.04, 0.04, 0.05), vec3(0.1, 0.1, 0.12), line);
            roughness = 0.3; metallic = 0.4;
        }
        
        vec3 envLight = getEnvLight(refDir); 
        vec3 f0 = mix(vec3(0.04), albedo, metallic);
        vec3 F = f0 + (1.0 - f0) * pow(1.0 - ndotv, 5.0);
        
        vec3 diffuse = albedo * (1.0 - metallic) * max(dot(n, lightDir), 0.0) * shadow;
        vec3 specular = envLight * F; 
        
        col = (diffuse + specular) * ao;

        if (matID == 6.0) {
            float underShadow = getShadow(p + vec3(0,0.01,0), normalize(vec3(0,1,0)));
            col *= underShadow;
        }

        if(matID == 5.0 || matID == 7.0) col = albedo * 5.0; 
        
        float fog = 1.0 - exp(-0.0002 * t * t);
        col = mix(col, getEnvLight(rd) * 0.2, fog);
    }

    col = (col * (2.51 * col + 0.03)) / (col * (2.43 * col + 0.59) + 0.14);
    col = pow(col, vec3(0.4545)); 
    col *= 1.0 - 0.5 * length(uv);

    FragColor = vec4(col, 1.0);
}
