// =============================================================================
// SpazzerEnemy — SDF Raymarched Billboard Entity
// Each spazzer is rendered as a world-space billboard quad that raymarches
// the EXACT same SDF flesh volume as spazzer.html, driven by live joint data.
// =============================================================================

'use strict';

// ---- Vertex shader: billboard quad, outputs world-space ray origin + direction ----
const SPAZZER_VS = `
precision highp float;
attribute vec2 aQuad;

uniform mat4 uViewMatrix;
uniform mat4 uProjMatrix;
uniform vec3 uCamPos;
uniform vec3 uCamRight;
uniform vec3 uCamUp;
uniform vec3 uBillboardCenter;
uniform float uBillboardSize;

varying vec3 vRayOri;
varying vec3 vRayDir;
varying vec2 vUV;

void main() {
  vUV = aQuad;

  // World-space vertex of billboard quad
  vec3 worldPos = uBillboardCenter
    + uCamRight * aQuad.x * uBillboardSize
    + uCamUp    * aQuad.y * uBillboardSize;

  // Ray from camera through this world-space point
  vRayOri = uCamPos - uBillboardCenter;
  vRayDir = normalize(worldPos - uCamPos);

  gl_Position = uProjMatrix * uViewMatrix * vec4(worldPos, 1.0);
}
`;

// ---- Fragment shader: SDF raymarcher, identical to spazzer.html ----
const SPAZZER_FS = `
precision highp float;

uniform float uTime;
uniform float uDecay;
uniform float uTwitch;
uniform float uShowBones;
uniform vec3  uJoints[24];
uniform vec3  uTarget;
uniform float uLurch;

varying vec3 vRayOri;
varying vec3 vRayDir;
varying vec2 vUV;

// ---- Noise helpers (exact from spazzer.html) ----
float hash31(vec3 p){
  p = fract(p * vec3(0.1031, 0.11369, 0.13787));
  p += dot(p, p.yxz + 19.19);
  return fract((p.x + p.y) * p.z);
}
float noise3(vec3 p){
  vec3 i = floor(p), f = fract(p);
  f = f*f*(3.0-2.0*f);
  return mix(
    mix(mix(hash31(i+vec3(0,0,0)), hash31(i+vec3(1,0,0)), f.x),
        mix(hash31(i+vec3(0,1,0)), hash31(i+vec3(1,1,0)), f.x), f.y),
    mix(mix(hash31(i+vec3(0,0,1)), hash31(i+vec3(1,0,1)), f.x),
        mix(hash31(i+vec3(0,1,1)), hash31(i+vec3(1,1,1)), f.x), f.y),
    f.z);
}
float fbm3(vec3 p){
  float v=0.0, a=0.5;
  for(int i=0;i<4;i++){ v += a*noise3(p); p = p*2.02+1.7; a *= 0.5; }
  return v;
}

// ---- SDF primitives (exact from spazzer.html) ----
float sdCapsule(vec3 p, vec3 a, vec3 b, float r){
  vec3 pa = p-a, ba = b-a;
  float h = clamp(dot(pa,ba)/max(dot(ba,ba),1e-6), 0.0, 1.0);
  return length(pa - ba*h) - r;
}
float sdSphere(vec3 p, float r){ return length(p) - r; }
float sdEllipsoid(vec3 p, vec3 r){
  float k0 = length(p/r);
  float k1 = length(p/(r*r));
  return k0*(k0-1.0)/max(k1,1e-6);
}
float sdBox(vec3 p, vec3 b){
  vec3 q = abs(p)-b;
  return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0);
}
float smin(float a, float b, float k){
  float h = clamp(0.5+0.5*(b-a)/k, 0.0, 1.0);
  return mix(b,a,h) - k*h*(1.0-h);
}
float smax(float a, float b, float k){ return -smin(-a,-b,k); }

mat3 transposeMat3(mat3 m) {
  return mat3(
    vec3(m[0].x, m[1].x, m[2].x),
    vec3(m[0].y, m[1].y, m[2].y),
    vec3(m[0].z, m[1].z, m[2].z)
  );
}

mat3 headFrame(){
  vec3 f = normalize(uJoints[5] - uJoints[4] + vec3(0.001));
  vec3 r = normalize(cross(f, vec3(0.0,1.0,0.0)));
  vec3 u = cross(r, f);
  return mat3(r, u, f);
}

// ---- Body SDF (exact from spazzer.html) ----
vec2 mapBody(vec3 p){
  float flesh = 1e10;
  flesh = smin(flesh, sdCapsule(p, uJoints[0], uJoints[1], 0.17), 0.06);
  flesh = smin(flesh, sdCapsule(p, uJoints[1], uJoints[2], 0.19), 0.06);
  flesh = smin(flesh, sdCapsule(p, uJoints[2], uJoints[3], 0.21), 0.06);
  flesh = smin(flesh, sdCapsule(p, uJoints[3], uJoints[4], 0.09), 0.05);
  // Collarbone connections to attach arms to shoulders
  flesh = smin(flesh, sdCapsule(p, uJoints[3], uJoints[7], 0.12), 0.05);
  flesh = smin(flesh, sdCapsule(p, uJoints[3], uJoints[11], 0.12), 0.05);
  flesh = smin(flesh, sdSphere(p - uJoints[7], 0.10), 0.05);
  flesh = smin(flesh, sdSphere(p - uJoints[11], 0.10), 0.05);
  flesh = smin(flesh, sdCapsule(p, uJoints[7], uJoints[8], 0.075), 0.04);
  flesh = smin(flesh, sdCapsule(p, uJoints[8], uJoints[9], 0.065), 0.04);
  flesh = smin(flesh, sdCapsule(p, uJoints[9], uJoints[10], 0.055), 0.03);
  flesh = smin(flesh, sdCapsule(p, uJoints[11], uJoints[12], 0.075), 0.04);
  flesh = smin(flesh, sdCapsule(p, uJoints[12], uJoints[13], 0.065), 0.04);
  flesh = smin(flesh, sdCapsule(p, uJoints[13], uJoints[14], 0.055), 0.03);
  flesh = smin(flesh, sdSphere(p - uJoints[15], 0.10), 0.05);
  flesh = smin(flesh, sdSphere(p - uJoints[19], 0.10), 0.05);
  flesh = smin(flesh, sdCapsule(p, uJoints[15], uJoints[16], 0.105), 0.04);
  flesh = smin(flesh, sdCapsule(p, uJoints[16], uJoints[17], 0.085), 0.04);
  flesh = smin(flesh, sdCapsule(p, uJoints[17], uJoints[18], 0.07), 0.03);
  flesh = smin(flesh, sdCapsule(p, uJoints[19], uJoints[20], 0.105), 0.04);
  flesh = smin(flesh, sdCapsule(p, uJoints[20], uJoints[21], 0.085), 0.04);
  flesh = smin(flesh, sdCapsule(p, uJoints[21], uJoints[22], 0.07), 0.03);

  mat3 H = headFrame();
  vec3 hp = transposeMat3(H) * (p - uJoints[5]);
  float head = sdEllipsoid(hp, vec3(0.13, 0.16, 0.14));
  float brow = sdEllipsoid(hp - vec3(0.0, 0.055, 0.09), vec3(0.12, 0.022, 0.05));
  head = smin(head, brow, 0.025);
  head = smin(head, sdEllipsoid(hp - vec3(-0.07, -0.01, 0.06), vec3(0.04, 0.045, 0.045)), 0.04);
  head = smin(head, sdEllipsoid(hp - vec3(0.07, -0.01, 0.06), vec3(0.04, 0.045, 0.045)), 0.04);
  head = smin(head, sdEllipsoid(hp - vec3(0.0, -0.02, 0.13), vec3(0.025, 0.035, 0.04)), 0.015);
  float mouth = sdEllipsoid(hp - vec3(0.0, -0.058, 0.11), vec3(0.045, 0.022, 0.04));
  head = smax(head, -mouth, 0.012);
  head = smax(head, -sdSphere(hp - vec3(-0.055, 0.025, 0.10), 0.038), 0.012);
  head = smax(head, -sdSphere(hp - vec3(0.055, 0.025, 0.10), 0.038), 0.012);

  float body = smin(flesh, head, 0.07);

  float disp = (fbm3(p*5.0) - 0.5) * 0.022;
  disp += (noise3(p*22.0) - 0.5) * 0.012 * uDecay;
  float tearDist = 1e10;
  tearDist = min(tearDist, length(p - uJoints[8]) - 0.08);
  tearDist = min(tearDist, length(p - uJoints[12]) - 0.08);
  tearDist = min(tearDist, length(p - uJoints[10]) - 0.05);
  tearDist = min(tearDist, length(p - uJoints[14]) - 0.05);
  tearDist = min(tearDist, length(p - uJoints[16]) - 0.09);
  tearDist = min(tearDist, length(p - uJoints[20]) - 0.09);
  disp += smoothstep(0.12, 0.0, tearDist) * (noise3(p*30.0) - 0.5) * 0.05 * uDecay;
  body += disp;

  vec3 eyeLPos = uJoints[5] + H * vec3(-0.055, 0.025, 0.11);
  vec3 eyeRPos = uJoints[5] + H * vec3(0.055, 0.025, 0.11);
  float eyes = min(sdSphere(p - eyeLPos, 0.020), sdSphere(p - eyeRPos, 0.020));
  vec3 teethPos = uJoints[5] + H * vec3(0.0, -0.048, 0.13);
  float teeth = sdBox(transposeMat3(H) * (p - teethPos), vec3(0.035, 0.008, 0.012));

  vec2 res = vec2(body, 1.0);
  if(head < flesh - 0.001) res = vec2(body, 2.0);
  if(teeth < res.x) res = vec2(teeth, 6.0);
  if(eyes  < res.x) res = vec2(eyes,  3.0);
  return res;
}

float mapBones(vec3 p){
  float d = 1e10;
  d = min(d, sdCapsule(p, uJoints[0], uJoints[1], 0.013));
  d = min(d, sdCapsule(p, uJoints[1], uJoints[2], 0.013));
  d = min(d, sdCapsule(p, uJoints[2], uJoints[3], 0.013));
  d = min(d, sdCapsule(p, uJoints[3], uJoints[4], 0.013));
  d = min(d, sdCapsule(p, uJoints[4], uJoints[5], 0.013));
  d = min(d, sdCapsule(p, uJoints[5], uJoints[6], 0.013));
  d = min(d, sdCapsule(p, uJoints[3], uJoints[7], 0.013));
  d = min(d, sdCapsule(p, uJoints[7], uJoints[8], 0.013));
  d = min(d, sdCapsule(p, uJoints[8], uJoints[9], 0.013));
  d = min(d, sdCapsule(p, uJoints[9], uJoints[10], 0.013));
  d = min(d, sdCapsule(p, uJoints[3], uJoints[11], 0.013));
  d = min(d, sdCapsule(p, uJoints[11], uJoints[12], 0.013));
  d = min(d, sdCapsule(p, uJoints[12], uJoints[13], 0.013));
  d = min(d, sdCapsule(p, uJoints[13], uJoints[14], 0.013));
  d = min(d, sdCapsule(p, uJoints[0], uJoints[15], 0.013));
  d = min(d, sdCapsule(p, uJoints[15], uJoints[16], 0.013));
  d = min(d, sdCapsule(p, uJoints[16], uJoints[17], 0.013));
  d = min(d, sdCapsule(p, uJoints[17], uJoints[18], 0.013));
  d = min(d, sdCapsule(p, uJoints[0], uJoints[19], 0.013));
  d = min(d, sdCapsule(p, uJoints[19], uJoints[20], 0.013));
  d = min(d, sdCapsule(p, uJoints[20], uJoints[21], 0.013));
  d = min(d, sdCapsule(p, uJoints[21], uJoints[22], 0.013));
  d = min(d, sdSphere(p - uJoints[0], 0.024));
  d = min(d, sdSphere(p - uJoints[1], 0.024));
  d = min(d, sdSphere(p - uJoints[2], 0.024));
  d = min(d, sdSphere(p - uJoints[3], 0.024));
  d = min(d, sdSphere(p - uJoints[4], 0.024));
  d = min(d, sdSphere(p - uJoints[5], 0.024));
  d = min(d, sdSphere(p - uJoints[6], 0.024));
  d = min(d, sdSphere(p - uJoints[7], 0.024));
  d = min(d, sdSphere(p - uJoints[8], 0.024));
  d = min(d, sdSphere(p - uJoints[9], 0.024));
  d = min(d, sdSphere(p - uJoints[10], 0.024));
  d = min(d, sdSphere(p - uJoints[11], 0.024));
  d = min(d, sdSphere(p - uJoints[12], 0.024));
  d = min(d, sdSphere(p - uJoints[13], 0.024));
  d = min(d, sdSphere(p - uJoints[14], 0.024));
  d = min(d, sdSphere(p - uJoints[15], 0.024));
  d = min(d, sdSphere(p - uJoints[16], 0.024));
  d = min(d, sdSphere(p - uJoints[17], 0.024));
  d = min(d, sdSphere(p - uJoints[18], 0.024));
  d = min(d, sdSphere(p - uJoints[19], 0.024));
  d = min(d, sdSphere(p - uJoints[20], 0.024));
  d = min(d, sdSphere(p - uJoints[21], 0.024));
  d = min(d, sdSphere(p - uJoints[22], 0.024));
  d = min(d, sdSphere(p - uJoints[23], 0.024));
  return d;
}

vec2 map(vec3 p){
  if(uShowBones > 0.5){
    return vec2(mapBones(p), 4.0);
  }
  return mapBody(p);
}

vec3 calcNormal(vec3 p){
  const float eps = 0.0012;
  vec2 h = vec2(1.0, -1.0);
  return normalize(
    h.xyy * map(p + h.xyy*eps).x +
    h.yyx * map(p + h.yyx*eps).x +
    h.yxy * map(p + h.yxy*eps).x +
    h.xxx * map(p + h.xxx*eps).x
  );
}

float softShadow(vec3 ro, vec3 rd, float mint, float maxt, float k){
  float res = 1.0, t = mint;
  for(int i=0;i<28;i++){
    float h = map(ro + rd*t).x;
    if(h < 0.001) return 0.0;
    res = min(res, k*h/t);
    t += clamp(h, 0.01, 0.25);
    if(t > maxt) break;
  }
  return clamp(res, 0.0, 1.0);
}

float calcAO(vec3 p, vec3 n){
  float occ = 0.0, sca = 1.0;
  for(int i=0;i<5;i++){
    float h = 0.01 + 0.13*float(i)/4.0;
    float d = map(p + n*h).x;
    occ += (h-d)*sca;
    sca *= 0.92;
  }
  return clamp(1.0 - 2.5*occ, 0.0, 1.0);
}

// ---- Shading (exact from spazzer.html) ----
vec3 shade(vec3 p, vec3 n, float mat, vec3 rd){
  vec3 lightDir = normalize(vec3(0.5, 0.75, 0.4));
  vec3 moonDir  = normalize(vec3(-0.35, 0.55, -0.5));

  if(mat > 3.5 && mat < 4.5){
    return vec3(0.2, 1.0, 0.4) * (0.6 + 0.4*sin(uTime * 6.0 + p.y*12.0));
  }
  if(mat < 3.5 && mat > 2.5){
    float pulse = 0.8 + 0.2*sin(uTime*8.0);
    return vec3(0.2, 1.8, 0.4) * pulse;
  }
  if(mat > 5.5){
    vec3 col = vec3(0.55, 0.52, 0.40);
    col *= 0.8 + 0.2*noise3(p*40.0);
    col *= 0.3 + 0.7*max(dot(n, lightDir), 0.0);
    return col;
  }

  float isHead = step(1.5, mat);
  vec3 baseSkin = vec3(0.35, 0.44, 0.32);
  vec3 decaySkin = vec3(0.20, 0.15, 0.11);
  float decay = fbm3(p*2.5 + 17.0);
  decay = smoothstep(0.28, 0.72, decay) * uDecay;
  vec3 col = mix(baseSkin, decaySkin, decay);
  col *= 0.8 + 0.2*noise3(p*15.0);

  float veins = fbm3(p*6.0 + 5.0);
  veins = smoothstep(0.54, 0.70, veins);
  col = mix(col, vec3(0.05, 0.02, 0.04), veins * 0.6);

  float blood = fbm3(p*3.0 - 8.0);
  blood = smoothstep(0.55, 0.75, blood);
  col = mix(col, vec3(0.12, 0.01, 0.01), blood * uDecay * 0.85);

  float boneDist = 1e10;
  boneDist = min(boneDist, length(p - uJoints[16]) - 0.07);
  boneDist = min(boneDist, length(p - uJoints[20]) - 0.07);
  boneDist = min(boneDist, length(p - uJoints[8]) - 0.06);
  boneDist = min(boneDist, length(p - uJoints[12]) - 0.06);
  boneDist = min(boneDist, length(p - uJoints[10]) - 0.04);
  boneDist = min(boneDist, length(p - uJoints[14]) - 0.04);
  boneDist = min(boneDist, length(p - uJoints[5]) - 0.13);
  float bone = smoothstep(0.045, 0.0, boneDist) * uDecay;
  vec3 boneCol = vec3(0.68, 0.65, 0.52) * (0.8 + 0.2*noise3(p*35.0));
  col = mix(col, boneCol, bone);
  col = mix(col, col*vec3(0.88, 1.0, 0.9), isHead*0.4);

  mat3 H = headFrame();
  vec3 hp = transposeMat3(H) * (p - uJoints[5]);
  float mouthDist = sdEllipsoid(hp - vec3(0.0, -0.058, 0.11), vec3(0.045, 0.022, 0.04));
  if(mouthDist < 0.0 && isHead > 0.5) col *= 0.05;

  float diff   = max(dot(n, lightDir), 0.0);
  float ambient = 0.08 + 0.15*max(n.y, 0.0);
  float back   = max(dot(n, moonDir), 0.0) * 0.35;

  float sss = pow(clamp(dot(reflect(rd, n), -lightDir), 0.0, 1.0), 4.0);
  vec3 sssCol = vec3(0.35, 0.04, 0.02) * sss * (0.3 + decay * 0.7);

  col *= ambient + diff * 0.75;
  col += sssCol;
  col += vec3(0.12, 0.16, 0.22) * back;

  float rim = pow(1.0 - max(dot(n, -rd), 0.0), 3.0);
  col += vec3(0.2, 0.26, 0.35) * rim * 0.45;

  vec3 hh = normalize(lightDir - rd);
  float spec = pow(max(dot(n, hh), 0.0), 32.0);
  float slimeMask = mix(0.2, 1.0, noise3(p * 20.0)) * (1.0 - bone * 0.8);
  col += vec3(0.4, 0.45, 0.38) * spec * slimeMask * 0.35;

  float wrapLight = pow(max(0.0, dot(n, -lightDir)*0.5+0.5), 2.0);
  col += vec3(0.15, 0.02, 0.02) * wrapLight * decay * 0.35;

  return col;
}

void main(){
  // Discard fragments far outside the billboard (circular crop)
  if(length(vUV) > 1.42) discard;

  vec3 ro = vRayOri;
  vec3 rd = normalize(vRayDir);

  float t = 0.05;
  float mat = -1.0;
  bool hit = false;
  for(int i=0;i<110;i++){
    vec3 p = ro + rd*t;
    vec2 res = map(p);
    if(res.x < 0.002){ hit = true; mat = res.y; break; }
    t += res.x * 0.88;
    if(t > 30.0) break;
  }

  if(!hit){ discard; }

  vec3 p = ro + rd*t;
  vec3 n = calcNormal(p);
  vec3 col = shade(p, n, mat, rd);

  // Shadows
  if(mat > 0.5 && mat < 5.5 && abs(mat-3.0) > 0.5){
    vec3 lightDir = normalize(vec3(0.5, 0.75, 0.4));
    float sh = softShadow(p + n*0.012, lightDir, 0.02, 8.0, 14.0);
    col *= 0.4 + 0.6*sh;
  }

  // AO
  float ao = calcAO(p, n);
  col *= 0.5 + 0.5*ao;

  // Fog
  float fog = 1.0 - exp(-t*0.04);
  col = mix(col, vec3(0.02, 0.028, 0.025), fog * 0.85);

  // Tonemap + gamma
  col = col / (1.0 + col);
  col = pow(max(col, 0.0), vec3(1.0/2.2));

  gl_FragColor = vec4(col, 1.0);
}
`;

// ---- Build the billboard quad geometry ----
function _buildBillboardGeo() {
  const geo = new THREE.BufferGeometry();
  // Two triangles covering -1..1 in X and Y
  const verts = new Float32Array([
    -1, -1,
     1, -1,
     1,  1,
    -1, -1,
     1,  1,
    -1,  1
  ]);
  geo.setAttribute('aQuad', new THREE.BufferAttribute(verts, 2));
  // Position attribute needed by THREE internally (all zeros; actual positions computed in VS)
  const pos = new Float32Array(6 * 3);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  return geo;
}

// ---- SpazzerEnemy ----
class SpazzerEnemy {
  constructor(worldX, worldZ, scene, camera) {
    this.worldX = worldX;
    this.worldZ = worldZ;
    this.scene  = scene;
    this.camera = camera;

    this.hp    = 6;
    this.dead  = false;
    this.speed = 1.8 + Math.random() * 0.8;
    this.seed  = Math.random() * 100;
    this.startTime = performance.now();
    this.attackCooldown = 0;

    // Unique seeds for procedural animation variation
    this.animSeed = Math.random() * 100.0;
    this.scaleFactor = 1.6 + Math.random() * 0.30; // 1.6x to 1.9x bigger!
    this.limpFrequency = 0.35 + Math.random() * 0.25;
    this.limpLeg = Math.random() < 0.5 ? 'LEFT' : 'RIGHT';
    this.twitchFreq = 16.0 + Math.random() * 12.0;
    this.lurchFreq = 0.55 + Math.random() * 0.35;

    // Behavioral state
    this.behaviorTimer   = 0;
    this.currentBehavior = 'STALKING';
    this.walkSpeedTarget = 0.8;
    this.twitchTarget    = 0.45;
    this.decayTarget     = 0.75;
    this.lurchTarget     = 1.1;
    this.trackTarget     = 0.75;
    this.params = { walkSpeed:0.8, twitch:0.55, decay:0.75, lurch:1.0, track:0.75 };

    this.joints   = new Float32Array(24 * 3);
    this.localJ   = new Float32Array(24 * 3);
    this.walkPhase = Math.random() * Math.PI * 2;
    this.rotY      = Math.random() * Math.PI * 2;

    // Target for head tracking (local space)
    this.localTarget = [0, 1.5, 2.0];

    this._buildMesh();
  }

  _buildMesh() {
    this.uniforms = {
      uTime:            { value: 0.0 },
      uDecay:           { value: 0.75 },
      uTwitch:          { value: 0.55 },
      uShowBones:       { value: 0.0 },
      uLurch:           { value: 1.0 },
      uJoints:          { value: new Array(24).fill(null).map(() => new THREE.Vector3()) },
      uTarget:          { value: new THREE.Vector3(0, 1.5, 2) },
      uCamPos:          { value: new THREE.Vector3() },
      uCamRight:        { value: new THREE.Vector3(1, 0, 0) },
      uCamUp:           { value: new THREE.Vector3(0, 1, 0) },
      uBillboardCenter: { value: new THREE.Vector3() },
      uBillboardSize:   { value: 3.2 },
      uViewMatrix:      { value: new THREE.Matrix4() },
      uProjMatrix:      { value: new THREE.Matrix4() },
    };

    const mat = new THREE.RawShaderMaterial({
      vertexShader:   SPAZZER_VS,
      fragmentShader: SPAZZER_FS,
      uniforms:       this.uniforms,
      side:           THREE.DoubleSide,
      transparent:    false,
      depthWrite:     true,
      depthTest:      true,
    });

    const geo  = _buildBillboardGeo();
    this.mesh  = new THREE.Mesh(geo, mat);
    this.mesh.frustumCulled = false; // billboard manages its own culling

    // Chest glow light
    this.chestLight = new THREE.PointLight(0x39ff14, 1.2, 5.0, 1.8);
    this.scene.add(this.chestLight);

    let spawnY = 0;
    if (typeof TerrainGen !== 'undefined' && typeof TerrainGen.getMeshHeight === 'function') {
      spawnY = TerrainGen.getMeshHeight(this.worldX, this.worldZ);
    }
    this.groundY = spawnY;
    this.mesh.position.set(this.worldX, spawnY + 1.1 * this.scaleFactor, this.worldZ);
    this.scene.add(this.mesh);
  }

  // ---- Skeleton update (exact port of spazzer.html updateSkeleton) ----
  _updateSkeleton(t, w, localTarget) {
    const p = this.params;
    const lurch  = Math.sin(t * this.lurchFreq) * 0.08 * p.lurch;
    const lurch2 = Math.sin(t * (this.lurchFreq * 0.65) + 1.1) * 0.05 * p.lurch;
    const tw = p.twitch;
    const twT = (Math.sin(t*this.twitchFreq) > 0.91 ? 1 : 0) * tw * 0.05;
    const twH = (Math.sin(t*(this.twitchFreq*1.3)) > 0.93 ? 1 : 0) * tw * 0.04;
    const twA = (Math.sin(t*(this.twitchFreq*0.8)+0.3) > 0.92 ? 1 : 0) * tw * 0.07;
    const twB = (Math.sin(t*(this.twitchFreq*0.6)+2.1) > 0.94 ? 1 : 0) * tw * 0.05;

    const limpMod  = 1.0 + Math.sin(w * this.limpFrequency) * 0.4;
    
    let legSwingL, legSwingR, legLiftL, legLiftR;
    if (this.currentBehavior === 'LIMPING_WOUNDED') {
      if (this.limpLeg === 'LEFT') {
        legSwingL = Math.sin(w * 0.2) * 0.1 - 0.15;
        legLiftL = 0.0;
        legSwingR = Math.sin(w * 1.2) * 0.5;
        legLiftR = Math.max(0, Math.sin(w * 1.2)) * 0.16;
      } else {
        legSwingR = Math.sin(w * 0.2) * 0.1 - 0.15;
        legLiftR = 0.0;
        legSwingL = Math.sin(w * 1.2) * 0.5;
        legLiftL = Math.max(0, Math.sin(w * 1.2)) * 0.16;
      }
    } else {
      legSwingL = Math.sin(w * limpMod) * 0.42;
      legSwingR = Math.sin(w * limpMod + Math.PI) * 0.42;
      legLiftL  = Math.max(0, Math.sin(w * limpMod)) * 0.08;
      legLiftR  = Math.max(0, Math.sin(w * limpMod + Math.PI)) * 0.08;
    }

    let armSwingL = Math.sin(w + Math.PI) * 0.28;
    let armSwingR = Math.sin(w) * 0.20;
    const bob       = Math.abs(Math.sin(w * limpMod)) * 0.05;

    const setL = (i, x, y, z) => { this.localJ[i*3]=x; this.localJ[i*3+1]=y; this.localJ[i*3+2]=z; };
    const L    = (i, a) => this.localJ[i*3+a];
    const v3n  = (a) => { const l = Math.hypot(a[0],a[1],a[2])||1; return [a[0]/l,a[1]/l,a[2]/l]; };

    let pelvisY = 1.0 + lurch*0.3 - bob;
    if (this.currentBehavior === 'ALERT_CHARGE') {
      pelvisY -= 0.15; // lower stance
    }
    setL(0, 0, pelvisY, 0);
    setL(1, lurch*0.4, pelvisY+0.22, 0.04+lurch*0.5);
    setL(2, lurch2*0.6, pelvisY+0.48, 0.085);
    setL(3, lurch2*0.7, pelvisY+0.72, 0.065);
    // Hunch neck - head raised slightly
    setL(4, lurch2*0.5+twT, pelvisY+0.86, 0.045);
    
    // Head tracking toward localTarget
    const headBase = [L(4,0), L(4,1)+0.03, L(4,2)];
    const toTarget = [localTarget[0]-headBase[0], localTarget[1]-headBase[1], localTarget[2]-headBase[2]];
    const tLen = Math.hypot(toTarget[0],toTarget[1],toTarget[2]) || 1;
    const targetDir = [toTarget[0]/tLen, toTarget[1]/tLen, toTarget[2]/tLen];
    const defaultFwd = v3n([0, 0.12, 1]);
    const dotFwd = targetDir[0]*defaultFwd[0] + targetDir[1]*defaultFwd[1] + targetDir[2]*defaultFwd[2];
    const angle = Math.acos(Math.max(-1, Math.min(1, dotFwd)));
    const maxAng = Math.PI * 0.55;
    const trackFactor = angle > maxAng ? Math.max(0, 1-(angle-maxAng)/0.6) : 1;
    const eTrack = p.track * trackFactor;
    const headDir = v3n([
      defaultFwd[0]*(1-eTrack) + targetDir[0]*eTrack + twT*0.3,
      defaultFwd[1]*(1-eTrack) + targetDir[1]*eTrack + twH,
      defaultFwd[2]*(1-eTrack) + targetDir[2]*eTrack
    ]);
    setL(5, headBase[0]+headDir[0]*0.08, headBase[1]+headDir[1]*0.06, headBase[2]+headDir[2]*0.08);
    setL(6, L(5,0)+headDir[0]*0.12, L(5,1)+headDir[1]*0.12, L(5,2)+headDir[2]*0.12);
    setL(23, L(5,0), L(5,1)-0.05, L(5,2)+0.05);

    // Left arm posing (shoulder attachment)
    setL(7, L(3,0)-0.20, L(3,1)-0.02, L(3,2));
    if (this.currentBehavior === 'THREAT_DISPLAY') {
      setL(8, L(7,0)-0.10, L(7,1)+0.35, L(7,2)+0.10+twA*0.4);
      setL(9, L(8,0)-0.05+twA*0.5, L(8,1)+0.28, L(8,2)+0.05);
      setL(10, L(9,0), L(9,1)+0.15, L(9,2)+0.05);
    } else if (this.currentBehavior === 'ALERT_CHARGE') {
      setL(8, L(7,0)-0.08, L(7,1)+0.05, L(7,2)+0.32);
      setL(9, L(8,0)+twA*0.4, L(8,1)+0.02, L(8,2)+0.25);
      setL(10, L(9,0), L(9,1)-0.05, L(9,2)+0.12);
    } else {
      setL(8, L(7,0)+armSwingL*0.1, L(7,1)-0.27, L(7,2)-0.02+armSwingL*0.1);
      setL(9, L(8,0)-0.02+twA*0.4, L(8,1)-0.25, L(8,2)-0.02);
      setL(10, L(9,0), L(9,1)-0.12, L(9,2)+0.02);
    }

    // Right arm posing (shoulder attachment)
    setL(11, L(3,0)+0.20, L(3,1)-0.02, L(3,2));
    if (this.currentBehavior === 'THREAT_DISPLAY') {
      setL(12, L(11,0)+0.10, L(11,1)+0.35, L(11,2)+0.10+twB*0.4);
      setL(13, L(12,0)+0.05+twB*0.5, L(12,1)+0.28, L(12,2)+0.05);
      setL(14, L(13,0), L(13,1)+0.15, L(13,2)+0.05);
    } else {
      const reachWorldDir = v3n([
        localTarget[0]-L(11,0), (localTarget[1]+0.3)-L(11,1), localTarget[2]-L(11,2)
      ]);
      const reachBlend = (this.currentBehavior === 'ALERT_CHARGE' ? 0.85 : 0.45) * p.track;
      const elbowDir = v3n([
        0.15*(1-reachBlend)+reachWorldDir[0]*reachBlend+twA*0.3,
        0.05*(1-reachBlend)+reachWorldDir[1]*reachBlend+armSwingR*0.2,
        0.85*(1-reachBlend)+reachWorldDir[2]*reachBlend
      ]);
      setL(12, L(11,0)+elbowDir[0]*0.27, L(11,1)+elbowDir[1]*0.27, L(11,2)+elbowDir[2]*0.27);
      const wristDir = v3n([elbowDir[0]*0.6+0.08+twB*0.4, elbowDir[1]*0.3-0.08, elbowDir[2]*0.9+0.18]);
      setL(13, L(12,0)+wristDir[0]*0.22, L(12,1)+wristDir[1]*0.22, L(12,2)+wristDir[2]*0.22);
      setL(14, L(13,0)+wristDir[0]*0.12, L(13,1)+wristDir[1]*0.12, L(13,2)+wristDir[2]*0.12);
    }

    // Left leg (smooth zombie walk)
    setL(15, L(0,0)-0.13, L(0,1)-0.04, L(0,2));
    const klx = L(15,0)+legSwingL*0.16;
    const kly = L(15,1)-0.42+legLiftL*0.4;
    const klz = L(15,2)+legSwingL*0.20;
    setL(16, klx, kly, klz);
    setL(17, klx+legSwingL*0.08, kly-0.42, klz+legSwingL*0.12-0.02);
    setL(18, L(17,0), L(17,1), L(17,2)+0.13);

    // Right leg (smooth zombie walk)
    setL(19, L(0,0)+0.13, L(0,1)-0.04, L(0,2));
    const krx = L(19,0)+legSwingR*0.16;
    const kry = L(19,1)-0.42+legLiftR*0.4;
    const krz = L(19,2)+legSwingR*0.20;
    setL(20, krx, kry, krz);
    setL(21, krx+legSwingR*0.12, kry-0.42, krz+legSwingR*0.12-0.02);
    setL(22, L(21,0), L(21,1), L(21,2)+0.13);

    if (this.currentBehavior === 'GLITCH_DANCE') {
      for (let i = 0; i < 24; i++) {
        const hash = Math.sin(i * 1.5 + t * 45.0);
        if (hash > 0.85) {
          this.localJ[i*3]   += (Math.random() - 0.5) * 0.16;
          this.localJ[i*3+1] += (Math.random() - 0.5) * 0.16;
          this.localJ[i*3+2] += (Math.random() - 0.5) * 0.16;
        }
      }
    }

    const scale = this.scaleFactor;
    for (let i = 0; i < 24*3; i++) this.joints[i] = this.localJ[i] * scale;
  }

  _updateNervousSystem(dt, nowSec, distToPlayer) {
    this.behaviorTimer += dt;
    const damp = 0.08;
    if (this.behaviorTimer > 4.0 + Math.sin(nowSec * 0.15) * 1.5) {
      this.behaviorTimer = 0;
      const roll = Math.random();
      if (distToPlayer < 6.0 && roll < 0.65) {
        if (Math.random() < 0.5) {
          this.currentBehavior = 'ALERT_CHARGE';
          this.walkSpeedTarget = 1.6 + Math.random() * 0.5;
          this.twitchTarget = 0.65 + Math.random() * 0.25;
          this.decayTarget = 0.4 + Math.random() * 0.2;
          this.lurchTarget = 1.6 + Math.random() * 0.3;
          this.trackTarget = 0.95;
        } else {
          this.currentBehavior = 'THREAT_DISPLAY';
          this.walkSpeedTarget = 0.1 + Math.random() * 0.15;
          this.twitchTarget = 0.85 + Math.random() * 0.15;
          this.decayTarget = 0.7 + Math.random() * 0.15;
          this.lurchTarget = 1.2 + Math.random() * 0.4;
          this.trackTarget = 0.9;
        }
      } else {
        if (roll < 0.20) {
          this.currentBehavior = 'STALKING';
          this.walkSpeedTarget = 0.7 + Math.random() * 0.3;
          this.twitchTarget = 0.35 + Math.random() * 0.2;
          this.decayTarget = 0.65 + Math.random() * 0.15;
          this.lurchTarget = 0.8 + Math.random() * 0.4;
          this.trackTarget = 0.7 + Math.random() * 0.2;
        } else if (roll < 0.40) {
          this.currentBehavior = 'SPASMODIC_FIT';
          this.walkSpeedTarget = 0.05 + Math.random() * 0.15;
          this.twitchTarget = 0.95;
          this.decayTarget = 0.8 + Math.random() * 0.15;
          this.lurchTarget = 1.5 + Math.random() * 0.4;
          this.trackTarget = 0.1 + Math.random() * 0.15;
        } else if (roll < 0.60) {
          this.currentBehavior = 'STAGGERING';
          this.walkSpeedTarget = 0.45 + Math.random() * 0.25;
          this.twitchTarget = 0.5 + Math.random() * 0.2;
          this.decayTarget = 0.75 + Math.random() * 0.15;
          this.lurchTarget = 1.1 + Math.random() * 0.3;
          this.trackTarget = 0.8 + Math.random() * 0.15;
        } else if (roll < 0.80) {
          this.currentBehavior = 'LIMPING_WOUNDED';
          this.walkSpeedTarget = 0.5 + Math.random() * 0.25;
          this.twitchTarget = 0.45 + Math.random() * 0.25;
          this.decayTarget = 0.8 + Math.random() * 0.15;
          this.lurchTarget = 1.3 + Math.random() * 0.3;
          this.trackTarget = 0.75;
        } else {
          this.currentBehavior = 'GLITCH_DANCE';
          this.walkSpeedTarget = 0.3 + Math.random() * 0.4;
          this.twitchTarget = 0.95;
          this.decayTarget = 0.6 + Math.random() * 0.2;
          this.lurchTarget = 1.8 + Math.random() * 0.5;
          this.trackTarget = 0.4 + Math.random() * 0.3;
        }
      }
    }
    const p = this.params;
    p.walkSpeed += (this.walkSpeedTarget - p.walkSpeed) * damp;
    p.twitch    += (this.twitchTarget    - p.twitch)    * damp;
    p.decay     += (this.decayTarget     - p.decay)     * damp;
    p.lurch     += (this.lurchTarget     - p.lurch)     * damp;
    p.track     += (this.trackTarget     - p.track)     * damp;
  }

  update(dt, playerX, playerZ) {
    if (this.dead) return;
    const nowSec = (performance.now() - this.startTime) / 1000;

    const dx = playerX - this.worldX;
    const dz = playerZ - this.worldZ;
    const dist = Math.hypot(dx, dz);

    if (dist > 1.4) {
      const moveSpeed = this.speed * this.params.walkSpeed * dt;
      const vx = dx / dist;
      const vz = dz / dist;
      this.worldX += vx * moveSpeed;
      this.worldZ += vz * moveSpeed;
      const targetRot = Math.atan2(vx, vz);
      const diff = targetRot - this.rotY;
      this.rotY += Math.atan2(Math.sin(diff), Math.cos(diff)) * 5.0 * dt;
    } else {
      this.attackCooldown -= dt;
      if (this.attackCooldown <= 0) {
        this.attackCooldown = 0.75;
        if (window.player && !window.player.godMode && !window.gameOver) {
          window.playerHealth = Math.max(0, window.playerHealth - 12);
          window.player.takeDamage(12);
          if (window.SFX) window.SFX.triggerZombieAttack();
          window.damageFlashTimer = 0.3;
          if (window.isFPSMode) window.screenShakeIntensity = Math.max(window.screenShakeIntensity, 0.02);
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

    let currentY = 0;
    if (typeof TerrainGen !== 'undefined' && typeof TerrainGen.getMeshHeight === 'function') {
      currentY = TerrainGen.getMeshHeight(this.worldX, this.worldZ);
    }

    // Compute local-space target for skeleton tracking
    // We must project the world-space player-relative vector into the billboard's
    // camera-facing local space: +X=camRight, +Y=camUp, -Z=camForward.
    // Do this AFTER building cam basis below (forward-declare camRight/camForward).
    let playerY = currentY + 1.0;
    if (window.player && window.player.position) playerY = window.player.position.y;
    // Deferred: set this.localTarget after cam basis is built below.
    this._pendingPlayerWorldDelta = [dx, playerY - (currentY + 1.1 * this.scaleFactor), dz];

    this._updateNervousSystem(dt, nowSec, dist);
    const limpMod = 1.0 + Math.sin(this.walkPhase * 0.5) * 0.35;
    this.walkPhase += dt * (this.speed * this.params.walkSpeed) * 3.8 * limpMod;

    // ---- Update billboard uniforms ----
    const cam = this.camera;
    const camPos = cam.position;

    // Camera basis vectors
    const camRight   = new THREE.Vector3();
    const camUp      = new THREE.Vector3(0, 1, 0);
    const camForward = new THREE.Vector3();
    cam.getWorldDirection(camForward);
    camRight.crossVectors(camForward, camUp).normalize();
    camUp.crossVectors(camRight, camForward).normalize();

    // Project player-relative world vector into billboard local space.
    // Billboard local: +X = camRight, +Y = camUp, -Z = camForward (toward cam)
    // Player is "in front" of spazzer, so negate camForward component => +Z
    {
      const pd = this._pendingPlayerWorldDelta || [0, 1, 2];
      const lx =  pd[0] * camRight.x   + pd[1] * camRight.y   + pd[2] * camRight.z;
      const ly =  pd[0] * camUp.x      + pd[1] * camUp.y      + pd[2] * camUp.z;
      const lz = -(pd[0] * camForward.x + pd[1] * camForward.y + pd[2] * camForward.z);
      this.localTarget = [lx, ly, lz];
    }

    // Now update skeleton with correct billboard-space target
    this._updateSkeleton(nowSec, this.walkPhase, this.localTarget);

    // Billboard center = spazzer world position + body center height
    const bodyCenterY = currentY + 1.1 * this.scaleFactor;
    const bodyCenter = new THREE.Vector3(this.worldX, bodyCenterY, this.worldZ);
    this.mesh.position.copy(bodyCenter);

    // Push joint positions into uniforms (joints are LOCAL, shader works in local space)
    const ju = this.uniforms.uJoints.value;
    for (let i = 0; i < 24; i++) {
      ju[i].set(this.joints[i*3], this.joints[i*3+1] - 1.1 * this.scaleFactor, this.joints[i*3+2]);
    }

    this.uniforms.uTime.value        = nowSec;
    this.uniforms.uDecay.value       = this.params.decay;
    this.uniforms.uTwitch.value      = this.params.twitch;
    this.uniforms.uLurch.value       = this.params.lurch;
    this.uniforms.uBillboardCenter.value.copy(bodyCenter);
    this.uniforms.uBillboardSize.value = 2.4 * this.scaleFactor;
    this.uniforms.uCamPos.value.copy(camPos);
    this.uniforms.uCamRight.value.copy(camRight);
    this.uniforms.uCamUp.value.copy(camUp);
    this.uniforms.uTarget.value.set(this.localTarget[0], this.localTarget[1], this.localTarget[2]);
    this.uniforms.uViewMatrix.value.copy(cam.matrixWorldInverse);
    this.uniforms.uProjMatrix.value.copy(cam.projectionMatrix);

    // Chest glow light
    if (this.chestLight) {
      // joint[3] = upper spine in local space, transform to world
      const j3 = new THREE.Vector3(
        this.joints[3*3], this.joints[3*3+1], this.joints[3*3+2]
      );
      // Rotate by rotY and add world position
      const cosR = Math.cos(this.rotY), sinR = Math.sin(this.rotY);
      const wx = j3.x * cosR + j3.z * sinR + this.worldX;
      const wz = -j3.x * sinR + j3.z * cosR + this.worldZ;
      this.chestLight.position.set(wx, currentY + j3.y, wz);
      this.chestLight.intensity = (0.9 + Math.sin(nowSec * 9.0) * 0.4) * (0.85 + 0.15 * Math.random());
    }
  }

  takeDamage(dmg) {
    this.hp -= dmg;
    if (this.hp <= 0) this.die();
    const emitX = this.worldX;
    const emitY = (this.mesh ? this.mesh.position.y : 0) + 1.0;
    const emitZ = this.worldZ;
    if (typeof emitParticle === 'function') {
      for (let i = 0; i < 8; i++) {
        emitParticle(emitX, emitY, emitZ,
          (Math.random()-0.5)*5.0, 2.0+Math.random()*4.0, (Math.random()-0.5)*5.0,
          0.22, 0.45, 0.18, 6+Math.random()*4, 0.25+Math.random()*0.25);
      }
    }
  }

  die() {
    this.dead = true;
    if (this.mesh) {
      if (this.mesh.geometry) this.mesh.geometry.dispose();
      if (this.mesh.material) this.mesh.material.dispose();
      this.scene.remove(this.mesh);
      this.mesh = null;
    }
    if (this.chestLight) {
      this.scene.remove(this.chestLight);
      this.chestLight = null;
    }
  }

  getPosition() { return { x: this.worldX, z: this.worldZ }; }
}

// ---- SpazzerManager ----
class SpazzerManager {
  constructor(scene, camera) {
    this.scene   = scene;
    this.camera  = camera;
    this.spazzers = [];
    this.maxSpazzers = 8;
  }

  spawn(x, z) {
    if (this.spazzers.length >= this.maxSpazzers) {
      const deadIdx = this.spazzers.findIndex(s => s.dead);
      if (deadIdx !== -1) this.spazzers.splice(deadIdx, 1);
      else return null;
    }
    const s = new SpazzerEnemy(x, z, this.scene, this.camera);
    this.spazzers.push(s);
    return s;
  }

  update(dt, playerX, playerZ) {
    for (let i = this.spazzers.length - 1; i >= 0; i--) {
      const s = this.spazzers[i];
      if (s.dead) { this.spazzers.splice(i, 1); continue; }
      s.update(dt, playerX, playerZ);
    }
  }

  getPositions() {
    return this.spazzers.map(s => ({ x: s.worldX, z: s.worldZ, ref: s }));
  }

  killAll() {
    this.spazzers.forEach(s => s.die());
    this.spazzers = [];
  }
}

window.SpazzerEnemy  = SpazzerEnemy;
window.SpazzerManager = SpazzerManager;
