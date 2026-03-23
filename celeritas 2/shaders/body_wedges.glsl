// Angular Sculpting: Hood, Windshield, Rear slopes and flat chops
float applyWedges(float body, vec3 pCar) {
    // Wedge 1: Hood slope (Focused on -Z Front)
    float hoodPlane = dot(pCar - vec3(0.0, 0.5, -0.7), normalize(vec3(0.0, 1.0, -0.35)));
    body = smax(body, hoodPlane, 0.15);

    // Wedge 2: Windshield slope (Focused on -Z Front)
    float windPlane = dot(pCar - vec3(0.0, 0.7, -0.3), normalize(vec3(0.0, 1.0, -0.8)));
    body = smax(body, windPlane, 0.15);

    // Wedge 3: Rear Window / C-Pillar slope (Focused on +Z Rear)
    float rearPlane = dot(pCar - vec3(0.0, 0.7, 0.6), normalize(vec3(0.0, 1.0, 0.6)));
    body = smax(body, rearPlane, 0.15);
    
    // Blunt front and rear chops (Front is -Z, Rear is +Z)
    float frontChop = dot(pCar - vec3(0.0, 0.0, -2.0), normalize(vec3(0.0, 0.1, -1.0)));
    float rearChop = dot(pCar - vec3(0.0, 0.0, 1.35), normalize(vec3(0.0, 0.1, 1.0)));
    body = smax(body, frontChop, 0.08);
    body = smax(body, rearChop, 0.08);

    return body;
}
