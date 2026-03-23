// Flowing LED Taillights (+Z Rear)
float getTaillights(vec3 pSym) {
    float tlBar = sdCapsule(pSym, vec3(0.0, 0.52, 1.33), vec3(0.4, 0.52, 1.3), 0.012);
    float tlDrop = sdCapsule(pSym, vec3(0.4, 0.52, 1.3), vec3(0.48, 0.42, 1.25), 0.012);
    return min(tlBar, tlDrop);
}
