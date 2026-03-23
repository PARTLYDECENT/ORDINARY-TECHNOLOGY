// Advanced Multi-Angular Headlight Housings and Chevy Sonic Style Dual Dots (Lowered & -Z Front)
float getHeadlightHousings(vec3 pSym) {
    // Core housing volume - Front is now -Z
    float hlHousing = sdRoundBox(pSym - vec3(0.28, 0.42, -1.25), vec3(0.28, 0.05, 0.15), 0.03);
    
    // Multi-angular facet 1: Inner slant 
    hlHousing = max(hlHousing, dot(pSym - vec3(0.12, 0.42, 0.0), normalize(vec3(-0.7, -0.6, -0.1))));
    // Multi-angular facet 2: Top swept back
    hlHousing = max(hlHousing, dot(pSym - vec3(0.0, 0.46, -1.2), normalize(vec3(0.1, 0.9, -0.6))));
    // Multi-angular facet 3: Outer sharp edge
    hlHousing = max(hlHousing, dot(pSym - vec3(0.52, 0.42, 0.0), normalize(vec3(0.8, -0.3, 0.2))));
    
    return hlHousing;
}

float getHeadlightLEDs(vec3 pSym) {
    // Chevy Sonic Style: Two distinct white dots per side (-Z Front)
    float dot1 = length(pSym - vec3(0.22, 0.42, -1.34)) - 0.032; // Inner dot
    float dot2 = length(pSym - vec3(0.42, 0.38, -1.28)) - 0.032; // Outer dot
    
    return min(dot1, dot2);
}
