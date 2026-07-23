// =============================================================================
// NextGenZombie (zomb2.js) — High-Performance SDF Instanced Billboard Zombie
// Grafted directly from assets/superguides/nextgenzomb26.2.html
// Uses THREE.InstancedMesh for extremely high-performance rendering of up to 32
// procedural zombies with glowing red eyes, chest glow, staggered gait sways,
// and proper directional orientation (front, side, back angles).
// =============================================================================

'use strict';

// ---- Vertex shader: billboard quad, outputs world-space ray origin + direction ----
const ZOMB2_VS = `
precision highp float;
attribute vec2 aQuad;
attribute mat4 instanceMatrix;

// Instanced Attributes
attribute float aRotY;
attribute float aTimeOffset;
attribute float aAnimMode;

uniform mat4 uViewMatrix;
uniform mat4 uProjMatrix;
uniform vec3 uCamPos;
uniform vec3 uCamRight;
uniform vec3 uCamUp;
uniform float uBillboardSize;

varying vec3 vRayOri;
varying vec3 vRayDir;
varying vec2 vUV;

varying float vRotY;
varying float vTimeOffset;
varying float vAnimMode;

void main() {
  vUV = aQuad;
  vRotY = aRotY;
  vTimeOffset = aTimeOffset;
  vAnimMode = aAnimMode;

  // Extract translation from instanceMatrix (which represents the billboard center)
  vec3 billboardCenter = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);

  // World-space vertex of billboard quad
  vec3 worldPos = billboardCenter
    + uCamRight * aQuad.x * uBillboardSize
    + uCamUp    * aQuad.y * uBillboardSize;

  // Ray from camera through this world-space point
  vRayOri = uCamPos - billboardCenter;
  vRayDir = normalize(worldPos - uCamPos);

  gl_Position = uProjMatrix * uViewMatrix * vec4(worldPos, 1.0);
}
`;

// ---- Fragment shader: SDF raymarcher, from nextgenzomb26.2.html ----
const ZOMB2_FS = `
precision highp float;

uniform float uTime;

varying vec3 vRayOri;
varying vec3 vRayDir;
varying vec2 vUV;

varying float vRotY;
varying float vTimeOffset;
varying float vAnimMode;

// Material constants
const float MAT_FLESH    = 1.0;
const float MAT_BONE     = 2.0;
const float MAT_BLOOD    = 3.0;
const float MAT_EYE      = 4.0;

vec2 opU(vec2 a, vec2 b){ return (a.x < b.x) ? a : b; }

// smooth min (polynomial)
float smin(float a, float b, float k){
  float h = clamp(0.5 + 0.5*(b-a)/k, 0.0, 1.0);
  return mix(b, a, h) - k*h*(1.0-h);
}
// smooth max
float smax(float a, float b, float k){
  return -smin(-a, -b, k);
}

// 2D rotation
mat2 rot(float a){ float c=cos(a), s=sin(a); return mat2(c,-s,s,c); }

// SDF Primitives
float sdSphere(vec3 p, float r){ return length(p)-r; }
float sdBox(vec3 p, vec3 b){
  vec3 q = abs(p)-b;
  return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0);
}
float sdRoundBox(vec3 p, vec3 b, float r){
  vec3 q = abs(p)-b;
  return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0) - r;
}
float sdCapsule(vec3 p, vec3 a, vec3 b, float r){
  vec3 pa = p-a, ba = b-a;
  float h = clamp(dot(pa,ba)/max(dot(ba,ba),1e-5), 0.0, 1.0);
  return length(pa - ba*h) - r;
}
float sdEllipsoid(vec3 p, vec3 r){
  float k0 = length(p/r);
  float k1 = length(p/(r*r));
  return k0*(k0-1.0)/k1;
}
float sdRoundCone(vec3 p, vec3 a, vec3 b, float ra, float rb){
  vec3 ba = b - a;
  float l2 = dot(ba, ba);
  float t = clamp(dot(p - a, ba) / max(l2, 1e-5), 0.0, 1.0);
  float r = mix(ra, rb, t);
  return length(p - a - ba * t) - r;
}

// noise & hash functions
float hash13(vec3 p){
  p = fract(p*0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x*p.y*p.z*(p.x+p.y+p.z));
}
float hash21(vec2 p){
  p = fract(p*vec2(123.34, 345.45));
  p += dot(p, p+34.345);
  return fract(p.x*p.y);
}
float noise3(vec3 p){
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f*f*(3.0-2.0*f);
  float n000 = hash13(i+vec3(0,0,0));
  float n100 = hash13(i+vec3(1,0,0));
  float n010 = hash13(i+vec3(0,1,0));
  float n110 = hash13(i+vec3(1,1,0));
  float n001 = hash13(i+vec3(0,0,1));
  float n101 = hash13(i+vec3(1,0,1));
  float n011 = hash13(i+vec3(0,1,1));
  float n111 = hash13(i+vec3(1,1,1));
  float nx00 = mix(n000,n100,f.x);
  float nx10 = mix(n010,n110,f.x);
  float nx01 = mix(n001,n101,f.x);
  float nx11 = mix(n011,n111,f.x);
  float nxy0 = mix(nx00,nx10,f.y);
  float nxy1 = mix(nx01,nx11,f.y);
  return mix(nxy0,nxy1,f.z);
}
float fbm(vec3 p){
  float v=0.0, a=0.5;
  for(int i=0;i<4;i++){
    v += a*noise3(p);
    p *= 2.0;
    a *= 0.5;
  }
  return v;
}

// Zombie SDF - Feet at y=0, lean & motion procedurally calculated
vec2 zombieSDF(vec3 p, float t, int mode){
  float phase = t * 1.3;
  float stride = sin(phase);
  float liftR = max(0.0,  sin(phase)) * 0.08;
  float liftL = max(0.0, -sin(phase)) * 0.08;
  float bodySway = stride * 0.025;

  float walkAmt = (mode==1) ? 1.0 : 0.0;
  float reachAmt = (mode==2) ? 1.0 : 0.0;
  stride  *= walkAmt;
  stride  += reachAmt * sin(t*2.8) * 0.15; // mild combat stagger
  liftR   *= walkAmt;
  liftL   *= walkAmt;
  bodySway *= walkAmt;

  float twitch = sin(t*2.3)*0.5 + sin(t*5.1)*0.3;
  float headTwitch = (mode==0) ? twitch*0.02 : 0.0;

  // LEGS
  vec3 rHip   = vec3( 0.09, 0.92, 0.0);
  vec3 rKnee  = vec3( 0.09 + stride*0.05, 0.50 - liftR*0.20, stride*0.06);
  vec3 rAnkle = vec3( 0.09 + stride*0.10, 0.05 + liftR,       stride*0.12);
  float legR = sdCapsule(p, rHip, rKnee, 0.060);
  legR = smin(legR, sdCapsule(p, rKnee, rAnkle, 0.046), 0.02);
  legR = smin(legR, sdSphere(p - rKnee, 0.044), 0.012);
  vec3 rHeel = rAnkle + vec3(0.0, -0.005, -0.015);
  vec3 rToe  = rAnkle + vec3(0.0, -0.005,  0.135);
  legR = smin(legR, sdRoundCone(p, rHeel, rToe, 0.038, 0.014), 0.018);

  vec3 lHip   = vec3(-0.09, 0.92, 0.0);
  vec3 lKnee  = vec3(-0.11 - stride*0.04, 0.48 - liftL*0.15, -stride*0.05 + 0.02);
  vec3 lAnkle = vec3(-0.13 - stride*0.08, 0.05 + liftL*0.5,  -stride*0.10 + 0.04);
  float legL = sdCapsule(p, lHip, lKnee, 0.060);
  legL = smin(legL, sdCapsule(p, lKnee, lAnkle, 0.046), 0.02);
  legL = smin(legL, sdSphere(p - lKnee, 0.044), 0.012);
  vec3 lHeel = lAnkle + vec3(0.0, -0.005, -0.015);
  vec3 lToe  = lAnkle + vec3(0.0, -0.005,  0.135);
  legL = smin(legL, sdRoundCone(p, lHeel, lToe, 0.038, 0.014), 0.018);

  // TORSO leaning forward
  vec3 tp = p;
  tp.x -= bodySway;
  tp.y -= 0.92;
  tp.yz = rot(0.30) * tp.yz; // Lean forward
  tp.y += 0.92;

  float chest = sdEllipsoid(tp - vec3(0.0, 1.30, 0.0), vec3(0.15, 0.20, 0.11));
  chest = smin(chest, sdSphere(tp - vec3(0.0, 1.46, -0.08), 0.11), 0.05);
  chest = smin(chest, sdEllipsoid(tp - vec3(0.0, 1.02, 0.03), vec3(0.13, 0.10, 0.11)), 0.08);
  chest = smin(chest, sdEllipsoid(tp - vec3(0.0, 0.88, 0.0), vec3(0.082, 0.05, 0.065)), 0.04);
  chest = smin(chest, sdCapsule(tp, vec3(-0.13,1.42,0.04), vec3(0.13,1.42,0.04), 0.015), 0.02);

  // Rib grooves
  float ribs = 1e9;
  for(int i=0; i<4; i++){
    float fi = float(i);
    vec3 ribC = tp - vec3(0.0, 1.40 - fi*0.05, 0.10);
    float rib = sdCapsule(ribC, vec3(-0.10,0.0,0.0), vec3(0.10,0.0,0.0), 0.012);
    ribs = min(ribs, rib);
  }
  float ribMask = smoothstep(0.06, 0.02, ribs);
  chest = smin(chest, ribs*0.4, 0.01) * (1.0 - ribMask) + smax(chest, -ribs*0.35, 0.015);

  float neck = sdCapsule(tp, vec3(0.0,1.48,0.0), vec3(0.0,1.58,0.03), 0.045);

  // HEAD
  vec3 hp = tp - vec3(0.0, 1.66, 0.04);
  hp.xy = rot(0.18 + headTwitch) * hp.xy;
  hp.yz = rot(0.12) * hp.yz;

  float head = sdEllipsoid(hp, vec3(0.085, 0.105, 0.095));
  head = smin(head, sdSphere(hp - vec3(0.0, 0.03, -0.06), 0.08), 0.03);
  head = smin(head, sdEllipsoid(hp - vec3(0.0, 0.025, 0.07), vec3(0.07, 0.025, 0.04)), 0.02);
  head = smin(head, sdSphere(hp - vec3(-0.07, -0.02, 0.05), 0.028), 0.025);
  head = smin(head, sdSphere(hp - vec3( 0.07, -0.02, 0.05), 0.028), 0.025);
  head = smin(head, sdEllipsoid(hp - vec3(0.0, -0.07, 0.02), vec3(0.055, 0.035, 0.055)), 0.03);

  float sockL = sdSphere(hp - vec3(-0.040, 0.015, 0.085), 0.026);
  float sockR = sdSphere(hp - vec3( 0.040, 0.015, 0.085), 0.026);
  head = smax(head, -sockL, 0.008);
  head = smax(head, -sockR, 0.008);

  float noseS = sdSphere(hp - vec3(0.0, -0.02, 0.10), 0.018);
  head = smax(head, -noseS, 0.006);

  float mouthS = sdRoundBox(hp - vec3(0.0, -0.075, 0.075), vec3(0.030, 0.008, 0.015), 0.005);
  head = smax(head, -mouthS, 0.005);

  // EYES
  float eyeL = sdSphere(hp - vec3(-0.040, 0.012, 0.092), 0.011);
  float eyeR = sdSphere(hp - vec3( 0.040, 0.012, 0.092), 0.011);

  // RIGHT ARM
  vec3 rShoulder = vec3( 0.16 + bodySway, 1.38, 0.06);
  float reachSway = sin(t*0.6) * 0.04;
  float reachBob  = sin(t*0.9) * 0.02;
  vec3 rElbow = vec3( 0.20 + bodySway, 1.22 + reachBob, 0.28 + reachSway*0.5);
  vec3 rWrist = vec3( 0.22 + bodySway, 1.08 + reachBob*1.5, 0.50 + reachSway);
  rWrist.z += reachAmt * 0.18;
  rWrist.y -= reachAmt * 0.05;
  rElbow.z += reachAmt * 0.08;

  float armR = sdCapsule(p, rShoulder, rElbow, 0.048);
  armR = smin(armR, sdCapsule(p, rElbow, rWrist, 0.042), 0.02);
  armR = smin(armR, sdSphere(p - rElbow, 0.038), 0.015);
  vec3 rPalm = rWrist + vec3(0.0, -0.01, 0.04);
  armR = smin(armR, sdSphere(p - rPalm, 0.035), 0.015);
  for(int i=0; i<4; i++){
    float fi = float(i);
    float spread = (fi - 1.5) * 0.018;
    vec3 fStart = rPalm + vec3(spread, 0.0, 0.035);
    vec3 fEnd   = fStart + vec3(spread*0.5, -0.008, 0.045);
    armR = smin(armR, sdCapsule(p, fStart, fEnd, 0.008), 0.004);
  }

  // LEFT ARM
  vec3 lShoulder = vec3(-0.16 + bodySway, 1.38, 0.06);
  float lReachSway = sin(t*0.8) * 0.03;
  vec3 lElbow = vec3(-0.20 + bodySway, 1.20, 0.22);
  vec3 lWrist = vec3(-0.22 + bodySway, 1.05, 0.44 + lReachSway);
  lWrist.z += reachAmt * 0.20;
  lWrist.y -= reachAmt * 0.04;
  lElbow.z += reachAmt * 0.08;
  vec3 lPalm = lWrist + vec3(0.0, -0.01, 0.04);

  float armL = sdCapsule(p, lShoulder, lElbow, 0.048);
  armL = smin(armL, sdCapsule(p, lElbow, lWrist, 0.042), 0.02);
  armL = smin(armL, sdSphere(p - lElbow, 0.038), 0.015);
  armL = smin(armL, sdSphere(p - lPalm, 0.033), 0.015);
  for(int i=0; i<4; i++){
    float fi = float(i);
    float spread = (fi - 1.5) * 0.016;
    vec3 fStart = lPalm + vec3(spread, -0.005, 0.01);
    vec3 fEnd   = fStart + vec3(spread*0.3, -0.025, 0.015);
    armL = smin(armL, sdCapsule(p, fStart, fEnd, 0.0075), 0.004);
  }

  float body = legR;
  body = smin(body, legL, 0.04);
  body = smin(body, chest, 0.05);
  body = smin(body, neck, 0.03);
  body = smin(body, head, 0.035);
  body = smin(body, armR, 0.035);
  body = smin(body, armL, 0.035);

  vec2 res = vec2(body, MAT_FLESH);
  res = opU(res, vec2(eyeL, MAT_EYE));
  res = opU(res, vec2(eyeR, MAT_EYE));

  float boneFragL = sdCapsule(p, lElbow + vec3(-0.02,-0.02,0.0), lElbow + vec3(0.03,-0.05,0.0), 0.012);
  res = opU(res, vec2(boneFragL, MAT_BONE));

  return res;
}

vec2 map(vec3 p){
  // Zombie local coordinates - bottom is at local -0.9, top is at 0.9
  vec3 localP = p + vec3(0.0, 0.9, 0.0);
  // Apply rotation around Y axis to orient ray to zombie's facing angle
  localP.xz = rot(-vRotY) * localP.xz;
  return zombieSDF(localP, uTime + vTimeOffset, int(vAnimMode + 0.5));
}

vec3 calcNormal(vec3 p){
  vec2 e = vec2(0.0008, 0.0);
  return normalize(vec3(
    map(p+e.xyy).x - map(p-e.xyy).x,
    map(p+e.yxy).x - map(p-e.yxy).x,
    map(p+e.yyx).x - map(p-e.yyx).x
  ));
}

float softShadow(vec3 ro, vec3 rd, float mint, float maxt, float k){
  float res = 1.0;
  float t = mint;
  for(int i=0; i<28; i++){
    if(t >= maxt) break;
    float h = map(ro + rd*t).x;
    if(h < 0.001) return 0.0;
    res = min(res, k*h/t);
    t += clamp(h, 0.01, 0.25);
  }
  return clamp(res, 0.0, 1.0);
}

float calcAO(vec3 p, vec3 n){
  float occ = 0.0;
  float sca = 1.0;
  for(int i=0; i<5; i++){
    float hr = 0.02 + 0.06*float(i);
    float d = map(p + n*hr).x;
    occ += (hr - d)*sca;
    sca *= 0.7;
  }
  return clamp(1.0 - 1.5*occ, 0.0, 1.0);
}

// Albedo shades
vec3 shadeFlesh(vec3 p, vec3 n, vec3 rd){
  vec3 base = vec3(0.42, 0.52, 0.38);
  float decay = fbm(p*3.0);
  base = mix(base, vec3(0.28, 0.36, 0.22), decay*0.5);
  float rotVal = fbm(p*5.0 + 10.0);
  base = mix(base, vec3(0.12, 0.16, 0.10), smoothstep(0.55, 0.85, rotVal)*0.7);
  float vein = fbm(p*8.0 + vec3(0.0, 5.0, 0.0));
  base = mix(base, vec3(0.08, 0.10, 0.06), smoothstep(0.6, 0.75, vein)*0.6);

  // Mouth & chest blood
  float bloodMask = smoothstep(0.5, 0.3, length(p - vec3(0.0, 1.30 - 0.9, 0.12)));
  bloodMask += smoothstep(0.15, 0.05, length(p - vec3(0.0, 1.585 - 0.9, 0.13)));
  bloodMask += smoothstep(0.10, 0.03, length(p - vec3(0.22, 1.08 - 0.9, 0.50)));
  base = mix(base, vec3(0.35, 0.06, 0.05), clamp(bloodMask, 0.0, 1.0) * 0.6);
  base = mix(base, vec3(0.50, 0.48, 0.20), 0.08);
  return base;
}

vec3 shadeBone(vec3 p){
  vec3 base = vec3(0.78, 0.74, 0.62);
  base *= 0.7 + 0.3*hash13(floor(p*20.0));
  base = mix(base, vec3(0.55, 0.50, 0.30), fbm(p*4.0)*0.4);
  return base;
}

void main() {
  // Circular crop to discard pixels outside the raymarched billboard volume
  if (length(vUV) > 1.1) discard;

  vec3 ro = vRayOri;
  vec3 rd = normalize(vRayDir);

  // Optimized Raymarch loop
  float t = 0.05;
  float mID = 0.0;
  bool hit = false;
  vec3 p;
  for(int i=0; i<95; i++){
    p = ro + rd*t;
    vec2 res = map(p);
    if(res.x < 0.0015){ hit = true; mID = res.y; break; }
    t += res.x * 0.88;
    if(t > 15.0) break;
  }

  if (!hit) discard;

  vec3 n = calcNormal(p);

  // Stylized Studio/Ambient Lighting
  vec3 keyDir  = normalize(vec3(0.6,  0.8,  0.4));
  vec3 keyCol  = vec3(1.0, 0.95, 0.85) * 2.2;
  vec3 fillDir = normalize(vec3(-0.7, 0.5,  0.3));
  vec3 fillCol = vec3(0.30, 0.45, 0.70) * 0.9;
  vec3 rimDir  = normalize(vec3(0.0,  0.3, -1.0));
  vec3 rimCol  = vec3(0.50, 0.65, 0.85) * 1.4;
  vec3 amb     = vec3(0.10, 0.12, 0.16);

  vec3 albedo = vec3(0.5);
  vec3 emissive = vec3(0.0);

  if (abs(mID - MAT_FLESH) < 0.1) {
    albedo = shadeFlesh(p, n, rd);
  } else if (abs(mID - MAT_BONE) < 0.1) {
    albedo = shadeBone(p);
  } else if (abs(mID - MAT_EYE) < 0.1) {
    // Glowing red eyes
    albedo = vec3(0.9, 0.1, 0.05);
    emissive = vec3(1.8, 0.15, 0.05) * 3.5;
  }

  float diffKey  = max(dot(n, keyDir), 0.0);
  float diffFill = max(dot(n, fillDir), 0.0);
  float diffRim  = max(dot(n, rimDir), 0.0);
  float sh = softShadow(p + n*0.01, keyDir, 0.02, 5.0, 10.0);
  float ao = calcAO(p, n);

  vec3 lin = amb * ao;
  lin += keyCol  * diffKey  * sh;
  lin += fillCol * diffFill * 0.8;
  lin += rimCol  * diffRim  * 1.0;

  vec3 col = albedo * lin + emissive;

  // Specular highlights
  if (abs(mID - MAT_FLESH) < 0.1 || abs(mID - MAT_BONE) < 0.1) {
    vec3 h = normalize(keyDir - rd);
    float spec = pow(max(dot(n, h), 0.0), 24.0);
    col += vec3(0.4, 0.45, 0.40) * spec * sh * 0.4;
  }

  // Edge Rim pop
  if (abs(mID - MAT_FLESH) < 0.1 || abs(mID - MAT_BONE) < 0.1) {
    float rim = pow(1.0 - max(dot(n, -rd), 0.0), 3.0);
    col += rimCol * rim * 0.5;
  }

  // Ambient fog matching Outpost Nacht color scheme (dark void)
  float fogAmt = 1.0 - exp(-0.06 * t);
  col = mix(col, vec3(0.01, 0.015, 0.02), fogAmt * 0.85);

  // Gamma correction
  col = col / (1.0 + col);
  col = pow(max(col, 0.0), vec3(1.0/2.2));

  gl_FragColor = vec4(col, 1.0);
}
`;

// Helper to build quad geometry
function _buildZomb2BillboardGeo() {
  const geo = new THREE.BufferGeometry();
  const verts = new Float32Array([
    -1, -1,
     1, -1,
     1,  1,
    -1, -1,
     1,  1,
    -1,  1
  ]);
  geo.setAttribute('aQuad', new THREE.BufferAttribute(verts, 2));
  const pos = new Float32Array(6 * 3);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  return geo;
}

// ---- NextGenZombieManager ----
class NextGenZombieManager {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.maxZombies = 32; // Instance limit
    this.spazzers = []; // Must match 'spazzers' name for index.html bullet/weapon tracking
    
    this._initMesh();
    this._initLights();
  }

  _initMesh() {
    const geo = _buildZomb2BillboardGeo();

    // Create custom instanced buffer arrays
    this.rotYArray = new Float32Array(this.maxZombies);
    this.timeOffsetArray = new Float32Array(this.maxZombies);
    this.animModeArray = new Float32Array(this.maxZombies);

    this.rotYAttr = new THREE.InstancedBufferAttribute(this.rotYArray, 1);
    this.timeOffsetAttr = new THREE.InstancedBufferAttribute(this.timeOffsetArray, 1);
    this.animModeAttr = new THREE.InstancedBufferAttribute(this.animModeArray, 1);

    geo.setAttribute('aRotY', this.rotYAttr);
    geo.setAttribute('aTimeOffset', this.timeOffsetAttr);
    geo.setAttribute('aAnimMode', this.animModeAttr);

    this.uniforms = {
      uTime:          { value: 0.0 },
      uCamPos:        { value: new THREE.Vector3() },
      uCamRight:      { value: new THREE.Vector3(1, 0, 0) },
      uCamUp:         { value: new THREE.Vector3(0, 1, 0) },
      uBillboardSize: { value: 1.2 }, // 2.4m quad size
      uViewMatrix:    { value: new THREE.Matrix4() },
      uProjMatrix:    { value: new THREE.Matrix4() }
    };

    const mat = new THREE.RawShaderMaterial({
      vertexShader:   ZOMB2_VS,
      fragmentShader: ZOMB2_FS,
      uniforms:       this.uniforms,
      side:           THREE.DoubleSide,
      transparent:    false,
      depthWrite:     true,
      depthTest:      true
    });

    this.instancedMesh = new THREE.InstancedMesh(geo, mat, this.maxZombies);
    this.instancedMesh.frustumCulled = false;
    this.scene.add(this.instancedMesh);

    // Initialize unused matrices far below map
    const dummy = new THREE.Object3D();
    dummy.position.set(0, -1000, 0);
    dummy.updateMatrix();
    for (let i = 0; i < this.maxZombies; i++) {
      this.instancedMesh.setMatrixAt(i, dummy.matrix);
    }
    this.instancedMesh.instanceMatrix.needsUpdate = true;
    this.instancedMesh.count = 0;
  }

  _initLights() {
    this.lightsPool = [];
    this.maxLights = 6;
    for (let i = 0; i < this.maxLights; i++) {
      const pl = new THREE.PointLight(0xff1100, 0.0, 6.0, 1.6);
      this.scene.add(pl);
      this.lightsPool.push(pl);
    }
  }

  spawn(x, z) {
    this.spazzers = this.spazzers.filter(s => !s.dead);

    if (this.spazzers.length >= this.maxZombies) {
      return null;
    }

    let spawnY = -0.95;
    if (window.NachtSafeRooms) {
      for (const r of window.NachtSafeRooms) {
        if (x > r.minX && x < r.maxX && z > r.minZ && z < r.maxZ) {
          spawnY = r.minY + 0.05;
          break;
        }
      }
    }

    const s = {
      worldX: x,
      worldZ: z,
      groundY: spawnY,
      hp: 8,
      dead: false,
      speed: 1.5 + Math.random() * 0.6,
      seed: Math.random() * 100,
      timeOffset: Math.random() * 20.0,
      rotY: Math.random() * Math.PI * 2,
      animMode: 1.0,
      attackCooldown: 0.0,
      startTime: performance.now(),
      lurchFreq: 2.0 + Math.random() * 1.5,
      staggerPhase: Math.random() * Math.PI * 2,
      takeDamage: function(dmg) {
        this.hp -= dmg;
        if (this.hp <= 0) {
          this.dead = true;
          if (typeof emitParticle === 'function') {
            for (let i = 0; i < 12; i++) {
              emitParticle(this.worldX, this.groundY + 0.9, this.worldZ,
                (Math.random()-0.5)*4.5, 2.0+Math.random()*4.0, (Math.random()-0.5)*4.5,
                0.38, 0.05, 0.05, 8+Math.random()*6, 0.3+Math.random()*0.3);
            }
          }
        } else {
          if (typeof emitParticle === 'function') {
            for (let i = 0; i < 4; i++) {
              emitParticle(this.worldX, this.groundY + 0.9, this.worldZ,
                (Math.random()-0.5)*2.5, 1.5+Math.random()*2.0, (Math.random()-0.5)*2.5,
                0.38, 0.05, 0.05, 4+Math.random()*3, 0.2+Math.random()*0.2);
            }
          }
        }
      }
    };

    this.spazzers.push(s);
    return s;
  }

  update(dt, playerX, playerZ) {
    const nowSec = performance.now() / 1000;

    // 1. Move zombies & check attacks
    for (let i = this.spazzers.length - 1; i >= 0; i--) {
      const s = this.spazzers[i];
      if (s.dead) {
        this.spazzers.splice(i, 1);
        continue;
      }

      // Procedural staggering/zig-zag steering for complex gait movement
      s.staggerPhase += dt * s.lurchFreq;
      const swayAmt = 0.55;
      const sx = Math.sin(s.staggerPhase) * swayAmt;
      const sz = Math.cos(s.staggerPhase * 0.7) * swayAmt;

      const dx = playerX - s.worldX + sx;
      const dz = playerZ - s.worldZ + sz;
      const dist = Math.hypot(dx, dz);

      if (dist > 1.2) {
        const moveSpeed = s.speed * dt;
        const vx = dx / dist;
        const vz = dz / dist;
        s.worldX += vx * moveSpeed;
        s.worldZ += vz * moveSpeed;

        const targetRot = Math.atan2(vx, vz);
        const diff = targetRot - s.rotY;
        s.rotY += Math.atan2(Math.sin(diff), Math.cos(diff)) * 4.0 * dt;
        s.animMode = dist < 2.5 ? 2.0 : 1.0;
      } else {
        s.animMode = 2.0; // Reach/Attack
        s.attackCooldown -= dt;
        if (s.attackCooldown <= 0) {
          s.attackCooldown = 0.85;
          if (window.player && !window.player.godMode && !window.gameOver) {
            const dmg = 15;
            window.playerHealth = Math.max(0, window.playerHealth - dmg);
            window.player.takeDamage(dmg);
            if (window.SFX) window.SFX.triggerZombieAttack();
            window.damageFlashTimer = 0.3;
            if (window.isFPSMode) window.screenShakeIntensity = Math.max(window.screenShakeIntensity, 0.035);
            if (window.playerHealth <= 0 && !window.gameOver) {
              window.gameOver = true;
              if (window.SFX) window.SFX.triggerPlayerDie();
              const score = Math.floor(window.survivalTime * 10 + window.totalKills * 5);
              const goTime = document.getElementById('go-time');
              if (goTime) {
                goTime.textContent = typeof formatTime === 'function' ? formatTime(window.survivalTime) : window.survivalTime.toFixed(1);
                document.getElementById('go-kills').textContent = window.totalKills;
                document.getElementById('go-score').textContent = score;
                document.getElementById('go-nodes').textContent = window.nodesDestroyed || 0;
                document.getElementById('gameover-overlay').classList.add('active');
              }
            }
          }
        }
      }

      let currentY = -0.95;
      if (window.NachtSafeRooms) {
        for (const r of window.NachtSafeRooms) {
          if (s.worldX > r.minX && s.worldX < r.maxX && s.worldZ > r.minZ && s.worldZ < r.maxZ) {
            currentY = r.minY + 0.05;
            break;
          }
        }
      }
      s.groundY = currentY;
    }

    // 2. Camera basis vectors for billboard alignment
    const cam = this.camera;
    const camPos = cam.position;
    const camRight = new THREE.Vector3();
    const camUp = new THREE.Vector3(0, 1, 0);
    const camForward = new THREE.Vector3();
    cam.getWorldDirection(camForward);
    camRight.crossVectors(camForward, camUp).normalize();
    camUp.crossVectors(camRight, camForward).normalize();

    this.uniforms.uTime.value = nowSec;
    this.uniforms.uCamPos.value.copy(camPos);
    this.uniforms.uCamRight.value.copy(camRight);
    this.uniforms.uCamUp.value.copy(camUp);
    this.uniforms.uViewMatrix.value.copy(cam.matrixWorldInverse);
    this.uniforms.uProjMatrix.value.copy(cam.projectionMatrix);

    // 3. Update instanced mesh data
    let activeCount = 0;
    const dummy = new THREE.Object3D();

    for (let i = 0; i < this.spazzers.length; i++) {
      const s = this.spazzers[i];
      if (s.dead) continue;

      dummy.position.set(s.worldX, s.groundY + 0.9, s.worldZ);
      dummy.updateMatrix();
      this.instancedMesh.setMatrixAt(activeCount, dummy.matrix);

      this.rotYArray[activeCount] = s.rotY;
      this.timeOffsetArray[activeCount] = s.timeOffset;
      this.animModeArray[activeCount] = s.animMode;

      activeCount++;
      if (activeCount >= this.maxZombies) break;
    }

    // Reset remaining matrices below map
    dummy.position.set(0, -1000, 0);
    dummy.updateMatrix();
    for (let i = activeCount; i < this.maxZombies; i++) {
      this.instancedMesh.setMatrixAt(i, dummy.matrix);
    }

    this.instancedMesh.count = activeCount;
    this.instancedMesh.instanceMatrix.needsUpdate = true;

    this.rotYAttr.needsUpdate = true;
    this.timeOffsetAttr.needsUpdate = true;
    this.animModeAttr.needsUpdate = true;

    // 4. Dynamic PointLight allocation (pool of 6 PointLights assigned to closest zombies)
    const sortedZombies = this.spazzers
      .filter(s => !s.dead)
      .map(s => {
        const dx = playerX - s.worldX;
        const dz = playerZ - s.worldZ;
        return { s, distSq: dx * dx + dz * dz };
      })
      .sort((a, b) => a.distSq - b.distSq);

    for (let li = 0; li < this.maxLights; li++) {
      const pl = this.lightsPool[li];
      if (li < sortedZombies.length) {
        const sz = sortedZombies[li].s;
        const cosR = Math.cos(sz.rotY), sinR = Math.sin(sz.rotY);
        const wx = sz.worldX + sinR * 0.15;
        const wz = sz.worldZ + cosR * 0.15;
        pl.position.set(wx, sz.groundY + 1.2, wz);
        pl.intensity = (1.4 + Math.sin(nowSec * 8.0 + sz.seed) * 0.3) * (0.9 + 0.1 * Math.random());
      } else {
        pl.intensity = 0.0;
      }
    }
  }

  killAll() {
    this.spazzers.forEach(s => { s.dead = true; });
    this.spazzers = [];
    if (this.instancedMesh) {
      const dummy = new THREE.Object3D();
      dummy.position.set(0, -1000, 0);
      dummy.updateMatrix();
      for (let i = 0; i < this.maxZombies; i++) {
        this.instancedMesh.setMatrixAt(i, dummy.matrix);
      }
      this.instancedMesh.instanceMatrix.needsUpdate = true;
      this.instancedMesh.count = 0;
    }
    if (this.lightsPool) {
      this.lightsPool.forEach(pl => { pl.intensity = 0.0; });
    }
  }

  getPositions() {
    return this.spazzers.map(s => ({ x: s.worldX, z: s.worldZ, ref: s }));
  }
}

window.NextGenZombieManager = NextGenZombieManager;
