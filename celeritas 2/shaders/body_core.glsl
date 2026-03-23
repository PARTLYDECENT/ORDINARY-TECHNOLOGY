// Core Uniform Chassis and Cabin
float getChassis(vec3 pCar) {
    // Front is -Z, Rear is +Z
    // Center at -0.3, half-extent 1.6
    // Front: -0.3 - 1.6 - 0.1 = -2.0
    // Rear:  -0.3 + 1.6 + 0.1 = 1.4 (Identical to original)
    return sdRoundBox(pCar - vec3(0.0, 0.25, -0.3), vec3(0.55, 0.25, 1.6), 0.1);
}

float getCabin(vec3 pCar) {
    // Cabin mirrored to maintain proportions relative to +Z Rear
    return sdRoundBox(pCar - vec3(0.0, 0.7, 0.15), vec3(0.45, 0.3, 0.6), 0.15);
}
