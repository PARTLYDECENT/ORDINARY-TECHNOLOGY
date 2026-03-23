// Kinematic Tires and Rims (-Z Front)
vec2 getWheels(vec3 pSym, float carZ) {
    float wRadius = 0.26;
    float wheelAngle = carZ / wRadius; 
    // Front is -Z, Rear is +Z
    vec3 pWhlF = pSym - vec3(0.58, -0.06, -0.9);
    vec3 pWhlB = pSym - vec3(0.58, -0.06, 0.9); 
    
    pWhlF.yz = rot2D(wheelAngle) * pWhlF.yz;
    pWhlB.yz = rot2D(wheelAngle) * pWhlB.yz;

    float tireF = sdCylX(pWhlF, wRadius, 0.12);
    float tireB = sdCylX(pWhlB, wRadius, 0.12); 
    float tires = min(tireF, tireB);

    float rimF = sdCylX(pWhlF, wRadius * 0.7, 0.14);
    float rimB = sdCylX(pWhlB, wRadius * 0.7, 0.14);
    
    float angleF = atan(pWhlF.z, pWhlF.y);
    float angleB = atan(pWhlB.z, pWhlB.y);
    rimF = max(rimF, -(length(pWhlF.yz) - wRadius*0.45 + sin(angleF * 6.0)*0.1));
    rimB = max(rimB, -(length(pWhlB.yz) - wRadius*0.45 + sin(angleB * 6.0)*0.1));

    float rims = min(rimF, rimB);
    return vec2(tires, rims);
}

float getWheelWells(vec3 pSym) {
    float wRadius = 0.26;
    // Front is -Z, Rear is +Z
    float wellF = sdCylX(pSym - vec3(0.58, -0.06, -0.9), wRadius + 0.06, 0.25);
    float wellB = sdCylX(pSym - vec3(0.58, -0.06, 0.9), wRadius + 0.06, 0.25);
    return min(wellF, wellB);
}
