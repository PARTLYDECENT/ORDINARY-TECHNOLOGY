// Realistic Panel Seams and Indents
float getPanelGaps(vec3 pSym) {
    float gapBpillar = abs(pSym.z + 0.1) - 0.003;
    float gapFront   = abs(pSym.z - 0.5) - 0.003;
    float gapRear    = abs(pSym.z + 0.65) - 0.003;
    float gapSill    = abs(pSym.y - 0.1) - 0.003; 

    float vSeams = min(min(gapBpillar, gapFront), gapRear);
    vSeams = max(vSeams, pSym.y - 0.5); 
    vSeams = max(vSeams, 0.1 - pSym.y); 
    float hSeams = max(gapSill, abs(pSym.z - 0.05) - 0.65);
    float sillTop = max(abs(pSym.y - 0.5) - 0.003, abs(pSym.z - 0.05) - 0.65); 

    float allSeams = min(min(vSeams, hSeams), sillTop);
    allSeams = max(allSeams, 0.45 - pSym.x); 
    return allSeams;
}

float getPlateIndent(vec3 pCar) {
    return sdRoundBox(pCar - vec3(0.0, 0.35, -1.35), vec3(0.2, 0.08, 0.1), 0.02);
}
