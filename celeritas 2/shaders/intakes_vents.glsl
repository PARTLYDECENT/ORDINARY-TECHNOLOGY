// Heavily Engineered Multi-Angular Aerodynamic Intakes, Splitter, and Winglets (-Z Front)
float getIntakes(vec3 pSym) {
    // 1. Core intake volume
    float intake = sdRoundBox(pSym - vec3(0.0, 0.12, -1.34), vec3(0.38, 0.12, 0.15), 0.05);
    float trapPlane = dot(pSym - vec3(0.25, 0.12, 0.0), normalize(vec3(0.8, 0.4, 0.0)));
    intake = max(intake, trapPlane);

    // 2. Heavy Engineering: Vertical Dividers
    float div1 = abs(pSym.x - 0.12) - 0.01;
    float div2 = abs(pSym.x - 0.28) - 0.01;
    float dividers = min(div1, div2);
    return max(intake, -dividers);
}

float getSideVents(vec3 pSym) {
    vec3 pVent = pSym - vec3(0.48, 0.15, -1.35);
    pVent.xy = rot2D(0.3) * pVent.xy;
    
    float vent = sdRoundBox(pVent, vec3(0.04, 0.18, 0.12), 0.01);
    vent = max(vent, dot(pVent, normalize(vec3(0.6, 0.2, -0.8))));
    
    return vent;
}

float getBlackPlastics(vec3 pSym) {
    // 1. Intake Plastics
    float plasticIntake = sdRoundBox(pSym - vec3(0.0, 0.12, -1.38), vec3(0.36, 0.1, 0.1), 0.04);
    float trapPlane = dot(pSym - vec3(0.25, 0.12, 0.0), normalize(vec3(0.8, 0.4, 0.0)));
    plasticIntake = max(plasticIntake, trapPlane);

    // 2. Side Vent Plastics
    vec3 pVentPlast = pSym - vec3(0.48, 0.15, -1.34);
    pVentPlast.xy = rot2D(0.3) * pVentPlast.xy;
    float plasticVent = sdRoundBox(pVentPlast, vec3(0.03, 0.16, 0.1), 0.01);

    // 3. Lowered Headlight Plastics (Matching Y = 0.42, -Z Front)
    float plasticHousing = sdRoundBox(pSym - vec3(0.28, 0.42, -1.3), vec3(0.26, 0.045, 0.1), 0.03);
    plasticHousing = max(plasticHousing, dot(pSym - vec3(0.12, 0.42, 0.0), normalize(vec3(-0.7, -0.6, -0.1))));
    plasticHousing = max(plasticHousing, dot(pSym - vec3(0.0, 0.46, -1.2), normalize(vec3(0.1, 0.9, -0.6))));
    plasticHousing = max(plasticHousing, dot(pSym - vec3(0.52, 0.42, 0.0), normalize(vec3(0.8, -0.3, 0.2))));

    // 4. Splitter/Under-tray Plastics (Slightly raised above ground)
    float plasticSplitter = sdRoundBox(pSym - vec3(0.0, 0.03, -1.45), vec3(0.54, 0.015, 0.16), 0.01);

    // 5. Heavy Engineering: Side Winglets / Canards (Added to plastics)
    float winglet = sdRoundBox(pSym - vec3(0.55, 0.15, -1.35), vec3(0.08, 0.01, 0.12), 0.005);
    winglet = max(winglet, dot(pSym - vec3(0.55, 0.15, -1.35), normalize(vec3(0.3, 0.9, 0.0)))); 

    return min(min(min(min(plasticIntake, plasticVent), plasticHousing), plasticSplitter), winglet);
}
