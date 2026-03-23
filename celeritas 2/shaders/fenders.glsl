// Integrated Fenders with Aerodynamic Cheek Panels (-Z Front)
float getFenders(vec3 pSym) {
    // Front Fender (Now at -Z)
    float fendF = sdEllipsoid(pSym - vec3(0.6, 0.25, -0.95), vec3(0.12, 0.35, 0.45));
    
    // Cheek Panel: Bridges the gap toward the bumper (-Z)
    float cheek = sdRoundBox(pSym - vec3(0.52, 0.25, -1.35), vec3(0.04, 0.15, 0.15), 0.05);
    cheek = max(cheek, dot(pSym - vec3(0.0, 0.0, -1.4), normalize(vec3(0.5, 0.0, -0.8)))); 
    
    fendF = smin(fendF, cheek, 0.1);

    // Rear Fender (Now at +Z)
    float fendB = sdEllipsoid(pSym - vec3(0.6, 0.25, 0.9), vec3(0.12, 0.35, 0.4));
    
    return min(fendF, fendB);
}
