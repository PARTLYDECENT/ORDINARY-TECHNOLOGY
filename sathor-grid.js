import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

/* ================= helpers ================= */
const TAU = Math.PI * 2;
const clamp = THREE.MathUtils.clamp;
const mix = (a, b, t) => a + (b - a) * t;
const rand = (a = 1, b) => b === undefined ? Math.random() * a : a + Math.random() * (b - a);
const sstep = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
function wrapPI(a){ while(a > Math.PI) a -= TAU; while(a < -Math.PI) a += TAU; return a; }
function hash2(i, j){
  let n = (i * 374761393 + j * 668265263) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177); n ^= n >>> 16;
  return (n >>> 0) / 4294967296;
}
function vnoise(x, y){
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const sx = xf * xf * (3 - 2 * xf), sy = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi), b = hash2(xi + 1, yi), c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
  return (a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy) * 2 - 1;
}
function fbm(x, y, oct){
  let v = 0, a = 0.5, f = 1, n = 0;
  for(let o = 0; o < oct; o++){ v += a * vnoise(x * f, y * f); n += a; a *= 0.5; f *= 2.03; }
  return v / n;
}
/* value noise, periodic on both axes — used so the skin texture tiles seamlessly */
function vnoiseP(x, y, px, py, salt){
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const sx = xf * xf * (3 - 2 * xf), sy = yf * yf * (3 - 2 * yf);
  const X0 = ((xi % px) + px) % px, X1 = (X0 + 1) % px;
  const Y0 = ((yi % py) + py) % py, Y1 = (Y0 + 1) % py;
  const h = (i, j) => hash2(i + salt * 1013, j);
  const a = h(X0, Y0), b = h(X1, Y0), c = h(X0, Y1), d = h(X1, Y1);
  return (a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy) * 2 - 1;
}
function fbmP(u, v, fx, fy, oct, salt){
  let s = 0, a = 0.5, f = 1, n = 0;
  for(let o = 0; o < oct; o++){
    s += a * vnoiseP(u * fx * f, v * fy * f, Math.round(fx * f), Math.round(fy * f), salt + o * 57);
    n += a; a *= 0.55; f *= 2;
  }
  return s / n;
}

/* ================= renderer / scene ================= */
const canvas = document.createElement('canvas');
canvas.id = 'sathor-grid-canvas';
canvas.style.position = 'fixed';
canvas.style.top = '0';
canvas.style.left = '0';
canvas.style.width = '100vw';
canvas.style.height = '100vh';
canvas.style.pointerEvents = 'none';
canvas.style.zIndex = '-1';
document.body.insertBefore(canvas, document.body.firstChild);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
const maxAniso = renderer.capabilities.getMaxAnisotropy();

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xdfc49e, 55, 230);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 800);
const camA = new THREE.Vector3(30, 16, 38), camB = new THREE.Vector3(9.5, 5, 13.5);
camera.position.copy(camA);

const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
pmrem.dispose();

/* sky dome — gradient, sun, drifting cirrus */
const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false,
  uniforms: { sunDir: { value: new THREE.Vector3(0.52, 0.58, 0.32).normalize() }, uT: { value: 0 }, uW: { value: 0 }, uF: { value: 0 } },
  vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `varying vec3 vP; uniform vec3 sunDir; uniform float uT; uniform float uW; uniform float uF;
    float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f);
      return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
    float fb(vec2 p){ float v = 0., a = .5; for(int i = 0; i < 5; i++){ v += a*n(p); p = p*2.03 + 7.1; a *= .5; } return v; }
    void main(){
      vec3 d = normalize(vP);
      vec3 c = mix(vec3(0.89,0.77,0.60), vec3(0.45,0.60,0.74), smoothstep(-0.02,0.45,d.y));
      float s = max(dot(d,sunDir),0.0);
      c += vec3(1.0,0.85,0.6) * (pow(s,600.0)*1.2 + pow(s,12.0)*0.14);
      if(d.y > 0.01){
        vec2 q = d.xz / (d.y + 0.12) * 1.6 + vec2(uT * 0.004, 0.0);
        float cl = smoothstep(.48, .85, fb(q * vec2(1., 2.2))) * smoothstep(0.01, .25, d.y);
        c = mix(c, vec3(1.0,.93,.82) + vec3(.15,.05,0.) * pow(s,3.0), cl * .55);
      }
      c = mix(c, vec3(0.52, 0.53, 0.55) * (0.65 + 0.35 * s), uW * 0.85);
      c += vec3(0.8, 0.85, 1.0) * uF * 0.7;
      gl_FragColor = vec4(c,1.0);
    }`
});
scene.add(new THREE.Mesh(new THREE.SphereGeometry(420, 32, 18), skyMat));

/* lights */
scene.add(new THREE.HemisphereLight(0xbfd2e4, 0x9a8563, 0.5));
const sun = new THREE.DirectionalLight(0xffdfb0, 2.6);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -32; sun.shadow.camera.right = 32;
sun.shadow.camera.top = 32; sun.shadow.camera.bottom = -32;
sun.shadow.camera.near = 5; sun.shadow.camera.far = 130;
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.05;
scene.add(sun); scene.add(sun.target);

/* ================= terrain ================= */
function terrainH(x, z){
  let h = fbm(x * 0.018 + 11.3, z * 0.018 + 7.6, 4) * 7.5 + fbm(x * 0.07 + 3.1, z * 0.07 + 9.4, 2) * 1.1;
  const d = Math.hypot(x, z);
  h *= 0.45 + 0.55 * sstep(8, 45, d);
  const rim = sstep(80, 125, d);
  h += rim * rim * 16;
  return h;
}
const obstacles = [];

const tGeo = new THREE.PlaneGeometry(260, 260, 150, 150);
tGeo.rotateX(-Math.PI / 2);
{
  const p = tGeo.attributes.position;
  for(let i = 0; i < p.count; i++) p.setY(i, terrainH(p.getX(i), p.getZ(i)));
  tGeo.computeVertexNormals();
  const nrm = tGeo.attributes.normal;
  const cols = new Float32Array(p.count * 3);
  const cSand = new THREE.Color(0xc3ae86), cOlive = new THREE.Color(0x8b8a58), cRock = new THREE.Color(0x83776a);
  const c = new THREE.Color();
  for(let i = 0; i < p.count; i++){
    const x = p.getX(i), z = p.getZ(i), ny = nrm.getY(i);
    const veg = fbm(x * 0.045 + 21.7, z * 0.045 + 4.2, 3);
    c.copy(cSand).lerp(cOlive, sstep(-0.2, 0.55, veg));
    c.lerp(cRock, sstep(0.20, 0.45, 1 - ny));
    c.multiplyScalar(0.9 + vnoise(x * 0.31, z * 0.27) * 0.1);
    cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b;
  }
  tGeo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
}
const dc = document.createElement('canvas'); dc.width = dc.height = 256;
{
  const dctx = dc.getContext('2d');
  const img = dctx.createImageData(256, 256);
  for(let i = 0; i < img.data.length; i += 4){
    const v = 205 + (Math.random() * 50) | 0;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255;
  }
  dctx.putImageData(img, 0, 0);
}
const detailTex = new THREE.CanvasTexture(dc);
detailTex.wrapS = detailTex.wrapT = THREE.RepeatWrapping;
detailTex.repeat.set(46, 46);
detailTex.colorSpace = THREE.SRGBColorSpace;
detailTex.anisotropy = 4;
const terrain = new THREE.Mesh(tGeo, new THREE.MeshStandardMaterial({
  vertexColors: true, map: detailTex, bumpMap: detailTex, bumpScale: 1.2, roughness: 0.96, metalness: 0, envMapIntensity: 0.2
}));
terrain.receiveShadow = true;
scene.add(terrain);

/* rocks — tileable fbm bump shared by every stone */
const rockBump = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const x = c.getContext('2d'), im = x.createImageData(256, 256);
  for(let j = 0; j < 256; j++) for(let i = 0; i < 256; i++){
    const v = 0.5 + 0.5 * (fbmP(i / 256, j / 256, 6, 6, 5, 3) * 0.8 + fbmP(i / 256, j / 256, 32, 32, 2, 9) * 0.2);
    const k = (j * 256 + i) * 4, b = clamp(v * 255, 0, 255);
    im.data[k] = im.data[k + 1] = im.data[k + 2] = b; im.data[k + 3] = 255;
  }
  x.putImageData(im, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
})();
for(let i = 0; i < 22; i++){
  let g = new THREE.IcosahedronGeometry(1, 4);
  g.deleteAttribute('normal'); g.deleteAttribute('uv'); g = mergeVertices(g);
  const p = g.attributes.position, v = new THREE.Vector3();
  /* fbm displacement + random fracture planes that shear off flat faces */
  const pl = [0, 1].map(() => new THREE.Vector3(rand(-1, 1), rand(-0.3, 1), rand(-1, 1)).normalize());
  const pc = pl.map(() => rand(0.55, 0.85));
  const o = i * 13.1;
  for(let vi = 0; vi < p.count; vi++){
    v.fromBufferAttribute(p, vi);
    v.multiplyScalar(1 + 0.16 * fbm(v.x * 1.1 + o, v.y * 1.1 + v.z * 1.5, 3));
    for(let k = 0; k < 2; k++){ const dd = v.dot(pl[k]); if(dd > pc[k]) v.addScaledVector(pl[k], -(dd - pc[k]) * 0.6); }
    p.setXYZ(vi, v.x, v.y, v.z);
  }
  const uvs = new Float32Array(p.count * 2);
  for(let vi = 0; vi < p.count; vi++){
    const x = p.getX(vi), y = p.getY(vi), z = p.getZ(vi);
    uvs[vi * 2] = (x * 0.9 + z * 0.6) * 1.4; uvs[vi * 2 + 1] = (y * 0.9 - z * 0.3 + x * 0.25) * 1.4;
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  g.computeVertexNormals();
  /* strata bands, darker undersides, moss pooling on up-facing surfaces */
  const nr = g.attributes.normal, col = new Float32Array(p.count * 3), cc2 = new THREE.Color();
  const cA = new THREE.Color().setHSL(0.08 + rand(-0.02, 0.02), rand(0.08, 0.16), rand(0.30, 0.42));
  const cB = new THREE.Color().setHSL(0.06 + rand(-0.02, 0.03), rand(0.15, 0.30), rand(0.25, 0.36));
  const cM = new THREE.Color(0x6f7a3c);
  for(let vi = 0; vi < p.count; vi++){
    const px = p.getX(vi), py = p.getY(vi), pz = p.getZ(vi);
    cc2.copy(cA).lerp(cB, sstep(-0.3, 0.3, Math.sin(py * 9 + vnoise(px * 2, pz * 2) * 2.2)));
    cc2.lerp(cM, sstep(0.72, 0.95, nr.getY(vi)) * 0.55 * (0.5 + 0.5 * vnoise(px * 6, pz * 6)));
    cc2.multiplyScalar(0.78 + 0.3 * sstep(-0.9, 0.9, py));
    col[vi * 3] = cc2.r; col[vi * 3 + 1] = cc2.g; col[vi * 3 + 2] = cc2.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const s = rand(0.7, 2.0);
  const rock = new THREE.Mesh(g, new THREE.MeshStandardMaterial({
    vertexColors: true, bumpMap: rockBump, bumpScale: 1.0, roughness: 0.93, envMapIntensity: 0.3
  }));
  const a = rand(TAU), rr = rand(20, 105);
  const x = Math.cos(a) * rr, z = Math.sin(a) * rr;
  rock.position.set(x, terrainH(x, z) + s * 0.15, z);
  rock.scale.set(s * rand(0.8, 1.3), s * rand(0.55, 0.85), s * rand(0.8, 1.3));
  rock.rotation.set(rand(0.3), rand(TAU), rand(0.3));
  rock.castShadow = rock.receiveShadow = true;
  scene.add(rock);
  obstacles.push({ x, z, r: s * 1.15 });
}

const windU = { value: 0 }, windS = { value: 0.5 }, snU = { value: new THREE.Vector3() };
/* pebbles + sage scrub */
{
  const d = new THREE.Object3D(), c = new THREE.Color();
  const pm = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.1, 1),
    new THREE.MeshStandardMaterial({ roughness: 0.9, envMapIntensity: 0.2 }), 700);
  for(let i = 0; i < 700; i++){
    const a = rand(TAU), rr = Math.sqrt(Math.random()) * 105, x = Math.cos(a) * rr, z = Math.sin(a) * rr, s = rand(0.4, 1.6);
    d.position.set(x, terrainH(x, z) + 0.01, z); d.rotation.set(rand(TAU), rand(TAU), rand(TAU));
    d.scale.set(s, s * rand(0.5, 0.9), s * rand(0.7, 1.2)); d.updateMatrix();
    pm.setMatrixAt(i, d.matrix); pm.setColorAt(i, c.setHSL(0.09 + rand(-0.02, 0.02), rand(0.1, 0.25), rand(0.3, 0.55)));
  }
  pm.instanceColor.needsUpdate = true; pm.castShadow = pm.receiveShadow = true; pm.frustumCulled = false; scene.add(pm);

  let bg = new THREE.IcosahedronGeometry(0.5, 2); bg.deleteAttribute('normal'); bg.deleteAttribute('uv'); bg = mergeVertices(bg);
  const bp = bg.attributes.position, bv = new THREE.Vector3();
  for(let i = 0; i < bp.count; i++){
    bv.fromBufferAttribute(bp, i); bv.multiplyScalar(1 + 0.28 * vnoise(bv.x * 5 + 3, bv.y * 5 + bv.z * 5));
    bp.setXYZ(i, bv.x, Math.max(bv.y, -0.1), bv.z);
  }
  bg.computeVertexNormals();
  const bm = new THREE.InstancedMesh(bg, new THREE.MeshStandardMaterial({ roughness: 1, envMapIntensity: 0.2 }), 70);
  for(let i = 0; i < 70; i++){
    const a = rand(TAU), rr = rand(12, 100), x = Math.cos(a) * rr, z = Math.sin(a) * rr, s = rand(0.8, 2.2);
    d.position.set(x, terrainH(x, z) + 0.12 * s, z); d.rotation.set(0, rand(TAU), 0);
    d.scale.set(s * rand(0.9, 1.4), s * rand(0.5, 0.8), s * rand(0.9, 1.4)); d.updateMatrix();
    bm.setMatrixAt(i, d.matrix); bm.setColorAt(i, c.setHSL(0.2 + rand(-0.03, 0.03), rand(0.12, 0.25), rand(0.26, 0.38)));
  }
  bm.instanceColor.needsUpdate = true; bm.castShadow = bm.receiveShadow = true; bm.frustumCulled = false; scene.add(bm);
}

/* dry grass — wind-driven */
if(false){
  const bladeGeo = new THREE.BufferGeometry();
  bladeGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
    -0.045, 0, 0,  0.045, 0, 0,  -0.018, 0.34, 0.07,  0.018, 0.34, 0.07,  0, 0.66, 0.16
  ]), 3));
  bladeGeo.setIndex([0, 1, 3, 0, 3, 2, 2, 3, 4]);
  bladeGeo.computeVertexNormals();
  const grass = new THREE.InstancedMesh(bladeGeo,
    new THREE.MeshStandardMaterial({ roughness: 1, side: THREE.DoubleSide, envMapIntensity: 0.2 }), 3200);
  const dummy = new THREE.Object3D(), gc = new THREE.Color();
  for(let i = 0; i < 3200; i++){
    let rr = Math.sqrt(Math.random()) * 112; if(rr < 3) rr += 6;
    const a = rand(TAU), x = Math.cos(a) * rr, z = Math.sin(a) * rr;
    dummy.position.set(x, terrainH(x, z) - 0.02, z);
    dummy.rotation.set(rand(-0.18, 0.18), rand(TAU), rand(-0.18, 0.18));
    const s = rand(0.6, 1.7);
    dummy.scale.set(s, s * rand(0.8, 1.3), s);
    dummy.updateMatrix();
    grass.setMatrixAt(i, dummy.matrix);
    gc.setHSL(0.13 + rand(-0.03, 0.03), rand(0.25, 0.4), rand(0.28, 0.42));
    grass.setColorAt(i, gc);
  }
  grass.instanceColor.needsUpdate = true;
  grass.receiveShadow = true;
  grass.frustumCulled = false;
  grass.material.onBeforeCompile = s => {
    s.uniforms.uT = windU;
    s.vertexShader = 'uniform float uT;\n' + s.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      float ph = instanceMatrix[3].x * 0.35 + instanceMatrix[3].z * 0.22;
      float gw = sin(uT * 1.6 + ph) * 0.5 + sin(uT * 2.7 + ph * 1.7) * 0.2;
      transformed.x += gw * position.y * 0.35;
      transformed.z += gw * 0.5 * position.y * position.y * 0.3;`);
  };
  scene.add(grass);
}

/* tall-patch grass: tapered 3-segment blades, root-to-tip gradient, sheen, gusts, pushed aside by Sathor */
{
  const bg2 = new THREE.BufferGeometry();
  bg2.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
    -0.05, 0, 0,  0.05, 0, 0,  -0.038, 0.33, 0.04,  0.038, 0.33, 0.04,  -0.022, 0.66, 0.12,  0.022, 0.66, 0.12,  0, 1.0, 0.26
  ]), 3));
  bg2.setIndex([0, 1, 3, 0, 3, 2, 2, 3, 5, 2, 5, 4, 4, 5, 6]);
  bg2.computeVertexNormals();
  const GN = 11500;
  const gm = new THREE.InstancedMesh(bg2, new THREE.MeshPhysicalMaterial({
    roughness: 0.65, side: THREE.DoubleSide, sheen: 0.7, sheenColor: new THREE.Color(0xfff0c0), sheenRoughness: 0.45, envMapIntensity: 0.25
  }), GN);
  const d = new THREE.Object3D(), c = new THREE.Color();
  let n = 0, tries = 0;
  while(n < GN && tries++ < 400000){
    const rr = Math.sqrt(Math.random()) * 112, a = rand(TAU), x = Math.cos(a) * rr, z = Math.sin(a) * rr;
    if(rr < 3.5) continue;
    const patch = sstep(0.12, 0.5, fbm(x * 0.035 + 5.2, z * 0.035 + 9.1, 3));
    if(n < 6500 ? Math.random() > 0.3 + 0.7 * patch : (patch < 0.3 || Math.random() > patch)) continue;
    d.position.set(x, terrainH(x, z) - 0.02, z);
    d.rotation.set(rand(-0.12, 0.12), rand(TAU), rand(-0.12, 0.12));
    const s = rand(0.5, 0.9) * (1 + 2.4 * patch) * (1 + patch), wd = rand(0.9, 1.4);
    d.scale.set(Math.sqrt(s) * wd * 0.9, s * rand(0.85, 1.2), Math.sqrt(s) * wd * 0.9);
    d.updateMatrix(); gm.setMatrixAt(n, d.matrix);
    gm.setColorAt(n, c.setHSL(0.13 + 0.07 * patch + rand(-0.025, 0.025), 0.25 + 0.2 * patch + rand(0, 0.1), 0.3 + rand(-0.05, 0.08)));
    n++;
  }
  gm.count = n; gm.instanceMatrix.needsUpdate = true; gm.instanceColor.needsUpdate = true;
  gm.receiveShadow = true; gm.frustumCulled = false;
  gm.material.onBeforeCompile = sh => {
    sh.uniforms.uT = windU; sh.uniforms.uS = windS; sh.uniforms.uSn = snU;
    sh.vertexShader = 'varying float vH; uniform float uT; uniform float uS; uniform vec3 uSn;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      vH = position.y;
      mat3 iR = mat3(instanceMatrix); float is2 = dot(iR[0], iR[0]);
      vec3 ip = instanceMatrix[3].xyz;
      float bend = position.y * position.y;
      float gust = sin(uT * 1.3 + ip.x * 0.12 + ip.z * 0.07) * 0.5 + 0.5;
      float flut = sin(uT * 3.1 + ip.x * 0.9 + ip.z * 0.7) * 0.25 + sin(uT * 5.3 + ip.z * 1.3) * 0.12;
      vec3 wv = vec3(1.0, 0.0, 0.4) * (0.1 + 0.5 * gust) * uS + vec3(flut, 0.0, flut * 0.6) * (0.4 + uS);
      vec2 dq = ip.xz - uSn.xz; float dd = length(dq);
      vec3 pv = vec3(dq.x, 0.0, dq.y) / (dd + 0.001) * smoothstep(2.4, 0.2, dd) * 1.2;
      transformed += (transpose(iR) * ((wv + pv) * bend * 0.35)) / sqrt(is2);`);
    sh.fragmentShader = 'varying float vH;\n' + sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      diffuseColor.rgb *= mix(0.4, 1.15, vH);
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.86, 0.8, 0.55), smoothstep(0.72, 1.0, vH) * 0.35);`);
  };
  scene.add(gm);
}

/* dust motes */
const DUST_N = 160;
const dustGeo = new THREE.BufferGeometry();
const dustPos = new Float32Array(DUST_N * 3), dustVel = [];
for(let i = 0; i < DUST_N; i++){
  dustPos[i * 3] = rand(-48, 48); dustPos[i * 3 + 1] = rand(0.2, 10); dustPos[i * 3 + 2] = rand(-48, 48);
  dustVel.push([rand(-0.22, 0.22), rand(-0.06, 0.1), rand(-0.22, 0.22)]);
}
dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
const dustTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 2, 32, 32, 30);
  g.addColorStop(0, 'rgba(255,246,228,0.85)'); g.addColorStop(0.4, 'rgba(255,246,228,0.25)'); g.addColorStop(1, 'rgba(255,246,228,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
})();
const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
  map: dustTex, size: 0.42, transparent: true, opacity: 0.45, depthWrite: false, color: 0xfff2dc
}));
dust.frustumCulled = false;
scene.add(dust);

/* ================= snake skin (procedural scale texture) ================= */
function skinColor(u, v){
  const dv = Math.min(v, 1 - v);       // 0 at dorsal centre
  const belly = Math.abs(v - 0.5);     // 0 at ventral centre
  const n = fbmP(u, v, 7, 5, 4, 1) * 0.72 + fbmP(u, v, 17, 13, 3, 7) * 0.28;
  const t = n * 0.5 + 0.5;
  const k = sstep(0.32, 0.78, t);
  let r = mix(156, 66, k), g = mix(143, 60, k), b = mix(84, 38, k);
  const core = sstep(0.36, 0.18, t);                    // deep blotch cores
  r = mix(r, 36, core); g = mix(g, 30, core); b = mix(b, 18, core);
  const rim = Math.exp(-Math.pow((t - 0.46) / 0.05, 2)); // cream reticulation
  r = mix(r, 216, rim * 0.75); g = mix(g, 201, rim * 0.75); b = mix(b, 158, rim * 0.75);
  const dd = 1 - 0.22 * sstep(0.30, 0.06, dv);           // dorsal darkening
  r *= dd; g *= dd; b *= dd;
  const stripe = sstep(0.035, 0.012, dv);                // thin dorsal stripe
  r = mix(r, 30, stripe * 0.8); g = mix(g, 26, stripe * 0.8); b = mix(b, 16, stripe * 0.8);
  const lat = sstep(0.20, 0.13, belly);                  // light flanks
  r = mix(r, 190, lat * 0.5); g = mix(g, 178, lat * 0.5); b = mix(b, 140, lat * 0.5);
  return [r, g, b];
}
function buildSkinCanvases(){
  const S = 1024, cols = 44, rows = 30;
  const cc = document.createElement('canvas'); cc.width = cc.height = S;
  const bc = document.createElement('canvas'); bc.width = bc.height = S;
  const c = cc.getContext('2d'), b = bc.getContext('2d');
  c.fillStyle = '#6e663d'; c.fillRect(0, 0, S, S);
  b.fillStyle = '#7d7d7d'; b.fillRect(0, 0, S, S);
  const sw = S / cols, sh = S / rows;

  const stamp = (x, y, fill) => {
    c.fillStyle = fill;
    c.beginPath(); c.ellipse(x, y, sw * 0.74, sh * 0.60, 0, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(22,17,8,0.30)'; c.lineWidth = 1.3; c.stroke();
    const g = b.createRadialGradient(x, y - sh * 0.18, sw * 0.06, x, y, sw * 0.78);
    g.addColorStop(0, '#b8b8b8'); g.addColorStop(0.75, '#8a8a8a'); g.addColorStop(1, '#4e4e4e');
    b.fillStyle = g;
    b.beginPath(); b.ellipse(x, y, sw * 0.74, sh * 0.60, 0, 0, TAU); b.fill();
  };
  for(let r2 = 0; r2 < rows; r2++){
    const v = (r2 + 0.5) / rows;
    if(Math.abs(v - 0.5) < 0.145) continue; // ventral zone drawn as a band
    for(let ci = 0; ci < cols; ci++){
      const u = (ci + ((r2 % 2) ? 0.5 : 0)) / cols;
      const x = u * S, y = v * S;
      const n = skinColor(u % 1, v);
      const j = 0.9 + hash2(ci, r2) * 0.2;
      const fill = `rgb(${clamp(n[0]*j,0,255)|0},${clamp(n[1]*j,0,255)|0},${clamp(n[2]*j,0,255)|0})`;
      stamp(x, y, fill);
      if(x < sw) stamp(x + S, y, fill);
      if(x > S - sw) stamp(x - S, y, fill);
      if(r2 === 0) stamp(x, y + S, fill);
      if(r2 === rows - 1) stamp(x, y - S, fill);
    }
  }
  /* ventral band */
  for(let ci = 0; ci < cols; ci++){
    const x = ci * sw, j = 0.94 + hash2(ci, 991) * 0.10;
    c.fillStyle = `rgb(${222*j|0},${208*j|0},${182*j|0})`;
    c.fillRect(x + 0.5, S * 0.355, sw - 1, S * 0.29);
    c.strokeStyle = 'rgba(122,102,72,0.55)'; c.lineWidth = 1.6;
    c.beginPath(); c.moveTo(x + 0.5, S * 0.355); c.lineTo(x + 0.5, S * 0.645); c.stroke();
    for(let k = 0; k < 3; k++){
      c.fillStyle = 'rgba(110,100,80,0.18)';
      c.fillRect(x + rand(4, sw - 6), S * (0.37 + Math.random() * 0.26), rand(2, 5), rand(1, 3));
    }
    b.fillStyle = '#999999'; b.fillRect(x + 1, S * 0.355, sw - 2, S * 0.29);
    b.strokeStyle = '#5f5f5f'; b.lineWidth = 2;
    b.beginPath(); b.moveTo(x + 1, S * 0.355); b.lineTo(x + 1, S * 0.645); b.stroke();
  }
  c.fillStyle = 'rgba(110,102,61,0.5)'; c.fillRect(0, S * 0.345, S, S * 0.014); c.fillRect(0, S * 0.641, S, S * 0.014);
  return { cc, bc };
}
const { cc, bc } = buildSkinCanvases();
const skinTex = new THREE.CanvasTexture(cc);
skinTex.wrapS = skinTex.wrapT = THREE.RepeatWrapping;
skinTex.colorSpace = THREE.SRGBColorSpace;
skinTex.anisotropy = maxAniso;
const bumpTex = new THREE.CanvasTexture(bc);
bumpTex.wrapS = bumpTex.wrapT = THREE.RepeatWrapping;
bumpTex.anisotropy = 4;

/* roughness map derived from the scale relief: glossy scale faces, rough seams */
const roughTex = (() => {
  const S = 1024, c = document.createElement('canvas'); c.width = c.height = S;
  const x = c.getContext('2d'); x.drawImage(bc, 0, 0);
  const im = x.getImageData(0, 0, S, S), d = im.data;
  for(let i = 0; i < d.length; i += 4){ const r = clamp(255 - (d[i] - 70) * 1.45, 40, 255); d[i] = d[i + 1] = d[i + 2] = r; }
  x.putImageData(im, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t;
})();
const bodyMat = new THREE.MeshPhysicalMaterial({ roughnessMap: roughTex,
  map: skinTex, bumpMap: bumpTex, bumpScale: 1.1,
  roughness: 1.0, clearcoat: 0.55, clearcoatRoughness: 0.35, iridescence: 0.45, iridescenceIOR: 1.35,
  iridescenceThicknessRange: [120, 420], sheen: 0.4, sheenRoughness: 0.6, sheenColor: new THREE.Color(0xc9b88a), color: new THREE.Color(0xa89f8a),
  side: THREE.DoubleSide, envMapIntensity: 0.45
});
const headTex = skinTex.clone(); headTex.repeat.set(3, 2); headTex.needsUpdate = true;
const headBump = bumpTex.clone(); headBump.repeat.set(3, 2); headBump.needsUpdate = true;
const headMat = bodyMat.clone();
const hr = roughTex.clone(); hr.repeat.set(3, 2); hr.needsUpdate = true; headMat.roughnessMap = hr;
headMat.map = headTex; headMat.bumpMap = headBump; headMat.color = new THREE.Color(0xb4ab96);

/* ================= snake body ================= */
const SPINE_N = 150, RADIAL = 22, SEG_LEN = 0.15;
const BODY_LEN = (SPINE_N - 1) * SEG_LEN;
const U_REP = BODY_LEN / 2.1;
const R_PROFILE = [[0,0.30],[0.02,0.31],[0.07,0.35],[0.14,0.42],[0.25,0.475],[0.45,0.46],[0.65,0.37],[0.82,0.25],[0.93,0.12],[1,0.018]];
function radiusAt(t){
  for(let i = 1; i < R_PROFILE.length; i++){
    if(t <= R_PROFILE[i][0]){
      const [t0, r0] = R_PROFILE[i - 1], [t1, r1] = R_PROFILE[i];
      let u = (t - t0) / (t1 - t0); u = u * u * (3 - 2 * u);
      return r0 + (r1 - r0) * u;
    }
  }
  return 0.018;
}

const snake = {
  pos: new THREE.Vector3(0, 0, 0), heading: rand(TAU), phase: 0, speed: 0,
  state: 'forage', path: [],
  spine: Array.from({ length: SPINE_N }, () => new THREE.Vector3()),
  wanderTarget: new THREE.Vector3(20, 0, 10), wanderTimer: 0,
  targetPos: new THREE.Vector3(),
  defense: 0, defenseTimer: 0,
  strike: null, strikeCooldown: 0, swallowTimer: 0,
  bulges: [], jaw: 0
};
snake.pos.y = terrainH(0, 0);

/* pre-fill the trailing path with a resting S-curve so the body exists on frame one */
{
  const h = snake.heading;
  const f = new THREE.Vector3(Math.sin(h), 0, Math.cos(h));
  const r = new THREE.Vector3(f.z, 0, -f.x);
  for(let s = 0; s <= 26; s += 0.03){
    const p = new THREE.Vector3().copy(snake.pos).addScaledVector(f, -s).addScaledVector(r, Math.sin(s * 1.5) * 0.55);
    p.y = terrainH(p.x, p.z);
    snake.path.push(p);
  }
}

const snakeGeo = new THREE.BufferGeometry();
{
  const n = SPINE_N * RADIAL;
  snakeGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  snakeGeo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  const uv = new Float32Array(n * 2);
  let p = 0;
  for(let i = 0; i < SPINE_N; i++)
    for(let j = 0; j < RADIAL; j++){ uv[p++] = i / (SPINE_N - 1) * U_REP; uv[p++] = j / RADIAL; }
  snakeGeo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  const idx = [];
  for(let i = 0; i < SPINE_N - 1; i++)
    for(let j = 0; j < RADIAL; j++){
      const a = i * RADIAL + j, b = i * RADIAL + (j + 1) % RADIAL;
      const c = (i + 1) * RADIAL + j, d = (i + 1) * RADIAL + (j + 1) % RADIAL;
      idx.push(a, c, b, b, c, d);
    }
  snakeGeo.setIndex(idx);
}
const snakeMesh = new THREE.Mesh(snakeGeo, bodyMat);
snakeMesh.castShadow = snakeMesh.receiveShadow = true;
snakeMesh.frustumCulled = false;
scene.add(snakeMesh);

const tailTip = new THREE.Mesh(new THREE.SphereGeometry(0.032, 8, 6),
  new THREE.MeshStandardMaterial({ color: 0x2e2818, roughness: 0.7 }));
scene.add(tailTip);

/* ================= snake head ================= */
const headGroup = new THREE.Group();
scene.add(headGroup);
let jawPivot, tongueGroup, tongueBase;
{
  const prof = [[0.28,-0.55],[0.315,-0.40],[0.32,-0.18],[0.30,0.02],[0.26,0.18],[0.195,0.32],[0.105,0.43],[0.045,0.49],[0.001,0.515]];
  const headGeo = new THREE.LatheGeometry(prof.map(p => new THREE.Vector2(Math.max(p[0], 0.001), p[1])), 26);
  headGeo.rotateX(Math.PI / 2);
  headGeo.scale(1.12, 0.92, 1.1);
  headGeo.computeVertexNormals();
  const skull = new THREE.Mesh(headGeo, headMat);
  skull.castShadow = skull.receiveShadow = true;
  headGroup.add(skull);

  /* lower jaw (hidden inside the skull until it hinges open for a strike) */
  jawPivot = new THREE.Group(); jawPivot.position.set(0, -0.14, 0.05);
  const jawGeo = new THREE.CapsuleGeometry(0.095, 0.26, 4, 10);
  jawGeo.rotateX(Math.PI / 2);
  const jaw = new THREE.Mesh(jawGeo, new THREE.MeshStandardMaterial({ color: 0x6b2418, roughness: 0.55, envMapIntensity: 0.4 }));
  jaw.scale.set(1.25, 0.6, 1); jaw.position.set(0, -0.01, 0.12);
  jawPivot.add(jaw);
  const toothMat = new THREE.MeshStandardMaterial({ color: 0xded6c4, roughness: 0.35 });
  for(const [tx, tz] of [[-0.05,0.05],[0.05,0.05],[-0.09,0.18],[0.09,0.18]]){
    const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.013, 0.055, 6), toothMat);
    tooth.position.set(tx, 0.05, tz);
    jawPivot.add(tooth);
  }
  headGroup.add(jawPivot);

  /* mouth line */
  const mouthMat = new THREE.MeshStandardMaterial({ color: 0x1f1610, roughness: 0.6 });
  for(const s of [-1, 1]){
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, -0.055, 0.505),
      new THREE.Vector3(0.128 * s, -0.09, 0.40),
      new THREE.Vector3(0.268 * s, -0.085, 0.23),
      new THREE.Vector3(0.33 * s, -0.075, 0.06)
    ]);
    headGroup.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.014, 6), mouthMat));
    for(let k = 1; k < 9; k++){ /* labial scales along the lip line */
      const q = curve.getPoint(k / 9), ls = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), headMat);
      ls.scale.set(1.3, 0.55, 1.7); ls.position.set(q.x, q.y + 0.028, q.z); ls.rotation.y = -0.6 * s;
      headGroup.add(ls);
    }
  }

  /* eyes: gold iris, vertical slit pupil, dark eye scale */
  const eyeMat = new THREE.MeshPhysicalMaterial({ color: 0xd9871a, emissive: 0x4a1c00, emissiveIntensity: 0.7, roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1.2 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x1a120b, roughness: 0.35 });
  const specMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.18, roughness: 0.05, clearcoat: 1, envMapIntensity: 2.2, depthWrite: false });
  for(const s of [-1, 1]){
    const eyeC = new THREE.Vector3(0.18 * s, 0.05, 0.30);
    const dir = new THREE.Vector3(0.72 * s, 0.30, 0.62).normalize();
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.07, 14, 10), eyeMat);
    eye.position.copy(eyeC); eye.castShadow = true;
    const pupil = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.08, 0.03), darkMat);
    pupil.position.copy(eyeC).addScaledVector(dir, 0.062);
    pupil.lookAt(dir);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.062, 0.012, 8, 18), darkMat);
    ring.position.copy(eyeC).addScaledVector(dir, 0.04);
    ring.lookAt(dir);
    const brow = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), headMat);
    brow.scale.set(1.5, 0.55, 1.9); brow.position.set(0.185 * s, 0.115, 0.29); brow.rotation.set(0, -0.5 * s, -0.3 * s); brow.castShadow = true;
    const spec = new THREE.Mesh(new THREE.SphereGeometry(0.074, 14, 10), specMat); /* clear spectacle over the eye */
    spec.position.copy(eyeC);
    headGroup.add(eye, pupil, ring, brow, spec);
  }

  /* nostrils */
  for(const s of [-1, 1]){
    const n = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 5), darkMat);
    n.position.set(0.06 * s, 0.038, 0.45);
    headGroup.add(n);
  }

  /* forked tongue */
  tongueGroup = new THREE.Group();
  tongueGroup.position.set(0, -0.07, 0.50);
  const tMat = new THREE.MeshStandardMaterial({ color: 0x351018, roughness: 0.4 });
  const baseGeo = new THREE.CylinderGeometry(0.011, 0.018, 0.9, 6);
  baseGeo.rotateX(Math.PI / 2); baseGeo.translate(0, 0, 0.45);
  tongueBase = new THREE.Mesh(baseGeo, tMat);
  tongueGroup.add(tongueBase);
  for(const s of [-1, 1]){
    const fGeo = new THREE.CylinderGeometry(0.007, 0.012, 0.26, 5);
    fGeo.rotateX(Math.PI / 2); fGeo.translate(0, 0, 0.13);
    const fork = new THREE.Mesh(fGeo, tMat);
    fork.position.set(0.03 * s, 0, 0.9);
    fork.rotation.y = -0.35 * s;
    tongueGroup.add(fork);
  }
  tongueGroup.visible = false;
  tongueGroup.scale.set(1, 1, 0.02);
  headGroup.add(tongueGroup);
}
const headFwd = new THREE.Vector3(Math.sin(snake.heading), 0, Math.cos(snake.heading));

/* ================= spit / venom droplets ================= */
const SPIT_N = 48;
const spitMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.02, 6, 5),
  new THREE.MeshPhysicalMaterial({ color: 0xe4ecc8, roughness: 0.05, clearcoat: 1, transparent: true, opacity: 0.78, envMapIntensity: 1.6 }), SPIT_N);
spitMesh.frustumCulled = false; scene.add(spitMesh);
const spits = Array.from({ length: SPIT_N }, () => ({ p: new THREE.Vector3(), v: new THREE.Vector3(), life: 0, sc: 1 }));
let spitIdx = 0; const _sm = new THREE.Matrix4(), _so = new THREE.Vector3();
function spit(n, spread, speed){
  _so.set(0, -0.07, 0.55); headGroup.localToWorld(_so);
  for(let i = 0; i < n; i++){
    const s = spits[spitIdx++ % SPIT_N];
    s.p.copy(_so); s.v.copy(headFwd).multiplyScalar(speed * rand(0.7, 1.2));
    s.v.x += rand(-spread, spread) * speed * 0.5; s.v.y += rand(-0.05, spread) * speed * 0.6; s.v.z += rand(-spread, spread) * speed * 0.5;
    s.life = rand(0.7, 1.4); s.sc = rand(0.6, 1.8);
  }
}
function updateSpit(dt){
  for(let i = 0; i < SPIT_N; i++){
    const s = spits[i];
    if(s.life > 0){
      s.life -= dt; s.v.y -= 9 * dt; s.p.addScaledVector(s.v, dt);
      if(s.p.y < terrainH(s.p.x, s.p.z)) s.life = 0;
    }
    const k = s.life > 0 ? s.sc : 0;
    _sm.makeScale(k, k, k).setPosition(s.p); spitMesh.setMatrixAt(i, _sm);
  }
  spitMesh.instanceMatrix.needsUpdate = true;
}

/* ================= prey ================= */
const mice = [];
const vv = (x, y, z) => new THREE.Vector3(x, y, z);
/* directional fur strokes for the mouse bump */
const furBump = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d'); x.fillStyle = '#808080'; x.fillRect(0, 0, 128, 128);
  for(let i = 0; i < 1800; i++){
    const px = rand(128), py = rand(128), b = (100 + Math.random() * 110) | 0;
    x.strokeStyle = `rgb(${b},${b},${b})`; x.lineWidth = 1; x.beginPath(); x.moveTo(px, py); x.lineTo(px + rand(-1, 1), py + rand(4, 9)); x.stroke();
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 2); return t;
})();
class Mouse{
  constructor(p){
    this.group = new THREE.Group();
    this.seed = rand(100);
    this.heading = rand(TAU);
    this.alive = true; this.dying = false; this.gone = false;
    this.falling = true; this.vy = 0; this.squash = 0; this.timer = rand(2);
    const fur = new THREE.MeshPhysicalMaterial({ color: 0x8d8174, roughness: 0.95, bumpMap: furBump, bumpScale: 1.5, sheen: 1, sheenRoughness: 0.5, sheenColor: new THREE.Color(0xd8c8b0), envMapIntensity: 0.3 });
    const pink = new THREE.MeshStandardMaterial({ color: 0xc79a90, roughness: 0.8 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x1c1712, roughness: 0.5 });
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 10), fur);
    body.scale.set(1, 0.85, 1.55); body.position.y = 0.13; body.castShadow = true;
    this.front = new THREE.Group(); this.front.position.set(0, 0.02, 0.18);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.105, 12, 9), fur);
    head.scale.set(0.85, 0.8, 1.15); head.position.set(0, 0.13, 0.10); head.castShadow = true;
    const earGeo = new THREE.SphereGeometry(0.055, 8, 6);
    this.earL = new THREE.Mesh(earGeo, pink); this.earL.scale.set(1, 1, 0.35); this.earL.position.set(-0.075, 0.235, 0.06);
    this.earR = new THREE.Mesh(earGeo, pink); this.earR.scale.set(1, 1, 0.35); this.earR.position.set(0.075, 0.235, 0.06);
    const eL = new THREE.Mesh(new THREE.SphereGeometry(0.016, 6, 5), dark); eL.position.set(-0.055, 0.16, 0.185);
    const eR = eL.clone(); eR.position.x = 0.055;
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.013, 6, 5), pink); nose.position.set(0, 0.115, 0.225);
    this.front.add(head, this.earL, this.earR, eL, eR, nose);
    const tCurve = new THREE.CatmullRomCurve3([vv(0,0,0), vv(0,-0.03,-0.18), vv(0.03,-0.05,-0.36)]);
    this.tail = new THREE.Group(); this.tail.position.set(0, 0.10, -0.22);
    this.tail.add(new THREE.Mesh(new THREE.TubeGeometry(tCurve, 8, 0.013, 5), pink));
    this.group.add(body, this.front, this.tail);
    this.legs = []; this.whis = [];
    for(const [lx, lz] of [[-0.09, -0.12], [0.09, -0.12], [-0.07, 0.14], [0.07, 0.14]]){
      const lg = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), pink);
      lg.scale.set(0.8, 0.6, 1.5); lg.position.set(lx, 0.035, lz); lg.userData.z = lz; this.legs.push(lg); this.group.add(lg);
    }
    const wm = new THREE.MeshStandardMaterial({ color: 0xded6c8, roughness: 0.6 });
    for(const s of [-1, 1]) for(const k of [-1, 0, 1]){
      const wg = new THREE.CylinderGeometry(0.0022, 0.0006, 0.15, 3); wg.rotateZ(Math.PI / 2); wg.translate(s * 0.075, 0, 0);
      const w = new THREE.Mesh(wg, wm); w.position.set(s * 0.03, 0.12 + k * 0.014, 0.215);
      w.rotation.set(0, -s * (0.5 + k * 0.18), k * 0.18 * s); this.front.add(w); this.whis.push(w);
    }
    this.groundY = terrainH(p.x, p.z);
    this.group.position.set(p.x, this.groundY + 2.6, p.z);
    scene.add(this.group);
  }
  update(dt, t, threat){
    const g = this.group;
    if(this.dying){
      g.scale.multiplyScalar(Math.max(0, 1 - dt * 9));
      if(g.scale.x < 0.04){ this.gone = true; scene.remove(g); }
      return;
    }
    if(this.falling){
      this.vy -= 20 * dt;
      g.position.y += this.vy * dt;
      if(g.position.y <= this.groundY){ g.position.y = this.groundY; this.falling = false; this.squash = 1; }
      g.rotation.y = this.heading;
      return;
    }
    this.groundY = terrainH(g.position.x, g.position.z);
    let speed = 0;
    const dT = g.position.distanceTo(threat);
    if(dT < 8){ // flee
      const want = Math.atan2(g.position.x - threat.x, g.position.z - threat.z);
      this.heading += wrapPI(want - this.heading) * Math.min(1, dt * 6) + Math.sin(t * 3 + this.seed) * 0.8 * dt;
      speed = 2.1;
    } else { // graze
      this.timer -= dt;
      if(this.timer <= 0){ this.heading += rand(-1.4, 1.4); this.timer = rand(1, 3); }
      speed = Math.sin(t * 0.7 + this.seed) > 0.25 ? 0.5 : 0;
    }
    if(speed > 0){
      g.position.x += Math.sin(this.heading) * speed * dt;
      g.position.z += Math.cos(this.heading) * speed * dt;
      const bd = Math.hypot(g.position.x, g.position.z);
      if(bd > 100) this.heading = Math.atan2(-g.position.x, -g.position.z) + rand(-0.5, 0.5);
    }
    g.position.y = this.groundY + Math.abs(Math.sin(t * 9 + this.seed)) * 0.03 * speed;
    g.rotation.y = this.heading;
    this.squash *= Math.exp(-dt * 6);
    g.scale.set(1 + 0.2 * this.squash, 1 - 0.3 * this.squash, 1 + 0.2 * this.squash);
    this.front.rotation.x = Math.sin(t * 2.3 + this.seed) * 0.12 * (speed > 0 ? 0.4 : 1);
    const eL = 1 + 0.28 * Math.max(0, Math.sin(t * 6.3 + this.seed * 3));
    const eR = 1 + 0.28 * Math.max(0, Math.sin(t * 6.3 + this.seed * 3 + 2.1));
    this.earL.scale.set(eL, eL, 0.35); this.earR.scale.set(eR, eR, 0.35);
    this.tail.rotation.y = Math.sin(t * 1.8 + this.seed) * 0.4;
    for(const lg of this.legs) lg.position.z = lg.userData.z + Math.sin(t * 15 + lg.userData.z * 40 + (lg.position.x > 0 ? 3.1 : 0)) * 0.045 * (speed > 0 ? 1 : 0);
    for(const w of this.whis) w.rotation.x = Math.sin(t * 17 + this.seed) * 0.1;
    this.front.position.y = 0.02 + Math.sin(t * 7 + this.seed) * 0.004;
  }
  consume(){ this.dying = true; }
}
mice.push(new Mouse(vv(9, 0, 7)));
mice.push(new Mouse(vv(-14, 0, 16)));

/* ================= audio (all synthesized) ================= */
let AC = null, master = null, muted = true, rainGain = null;
function ensureAudio(){
  if(AC) return;
  try{
    AC = new (window.AudioContext || window.webkitAudioContext)();
    master = AC.createGain(); master.gain.value = 0.9; master.connect(AC.destination);
    const nb = makeNoise(4);
    const src = AC.createBufferSource(); src.buffer = nb; src.loop = true;
    const lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 220; lp.Q.value = 0.4;
    const wg = AC.createGain(); wg.gain.value = 0.05;
    const lfo = AC.createOscillator(); lfo.frequency.value = 0.07;
    const lg = AC.createGain(); lg.gain.value = 0.025;
    lfo.connect(lg); lg.connect(wg.gain);
    src.connect(lp); lp.connect(wg); wg.connect(master);
    src.start(); lfo.start();
    const rs = AC.createBufferSource(); rs.buffer = nb; rs.loop = true;
    const rhp = AC.createBiquadFilter(); rhp.type = 'highpass'; rhp.frequency.value = 1800;
    rainGain = AC.createGain(); rainGain.gain.value = 0;
    rs.connect(rhp); rhp.connect(rainGain); rainGain.connect(master); rs.start();
  }catch(e){ /* audio unavailable — stay silent */ }
}
function makeNoise(sec){
  const n = AC.sampleRate * sec, b = AC.createBuffer(1, n, AC.sampleRate), d = b.getChannelData(0);
  for(let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  return b;
}
function playNoise(dur, type, freq, q, gain, attack){
  if(!AC || muted) return;
  const src = AC.createBufferSource(); src.buffer = makeNoise(Math.min(dur + 0.1, 2));
  const f = AC.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = AC.createGain(); const t0 = AC.currentTime;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f); f.connect(g); g.connect(master);
  src.start(t0); src.stop(t0 + dur + 0.05);
}
function sfxHiss(){ playNoise(1.8, 'bandpass', 2600, 0.7, 0.5, 0.18); playNoise(1.8, 'lowpass', 420, 0.5, 0.15, 0.2); }
function sfxStrike(){ playNoise(0.28, 'bandpass', 900, 1.2, 0.28, 0.02); }
function sfxGulp(){
  if(!AC || muted) return;
  const o = AC.createOscillator(); o.type = 'sine';
  const g = AC.createGain(); const t0 = AC.currentTime;
  o.frequency.setValueAtTime(170, t0); o.frequency.exponentialRampToValueAtTime(55, t0 + 0.22);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(0.25, t0 + 0.03);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.25);
  o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + 0.3);
}

/* ================= behaviour ================= */
let flicks = 0;
function facing(m){
  const fx = Math.sin(snake.heading), fz = Math.cos(snake.heading);
  const tx = m.group.position.x - snake.pos.x, tz = m.group.position.z - snake.pos.z;
  const l = Math.hypot(tx, tz) || 1;
  return (fx * tx + fz * tz) / l;
}
function beginStrike(m){
  snake.state = 'strike';
  const dir = new THREE.Vector3().subVectors(m.group.position, snake.pos).setY(0);
  if(dir.lengthSq() < 0.001) dir.set(Math.sin(snake.heading), 0, Math.cos(snake.heading));
  dir.normalize();
  snake.strike = { mouse: m, t: 0, dur: 0.42, dir };
  snake.heading = Math.atan2(dir.x, dir.z);
  sfxStrike();
}
function capture(m){
  m.consume();
  snake.state = 'swallow'; snake.swallowTimer = 2.4; snake.strikeCooldown = 1.6;
  snake.bulges.push({ s: 0.4, amp: 0.02, max: 0.21, digesting: false });
  sfxGulp();
}
function updateBulges(dt){
  for(const b of snake.bulges){
    if(!b.digesting){
      b.amp = Math.min(b.max, b.amp + dt * 0.5);
      b.s += dt * 0.55;
      if(b.s > BODY_LEN * 0.30) b.digesting = true;
    } else {
      b.amp *= Math.exp(-dt / 26);
    }
  }
  snake.bulges = snake.bulges.filter(b => b.amp > 0.012);
}

/* anti-kink: cap the bend between consecutive spine segments so the neck can never fold back past the head */
const _bd0 = new THREE.Vector3(), _bd1 = new THREE.Vector3(), _bax = new THREE.Vector3();
function limitBend(){
  const sp = snake.spine, MAXA = 0.25;
  _bd0.subVectors(sp[1], sp[0]);
  if(_bd0.lengthSq() < 1e-8) return;
  _bd0.normalize();
  for(let i = 2; i < SPINE_N; i++){
    _bd1.subVectors(sp[i], sp[i - 1]);
    if(_bd1.lengthSq() < 1e-10) _bd1.copy(_bd0); else _bd1.normalize();
    const ang = Math.acos(clamp(_bd0.dot(_bd1), -1, 1));
    if(ang > MAXA){
      _bax.crossVectors(_bd0, _bd1);
      if(_bax.lengthSq() < 1e-10) _bax.set(0, 1, 0); else _bax.normalize();
      _bd1.copy(_bd0).applyAxisAngle(_bax, MAXA);
    }
    sp[i].copy(sp[i - 1]).addScaledVector(_bd1, SEG_LEN);
    _bd0.copy(_bd1);
  }
}

function updateSnake(dt, t){
  snake.strikeCooldown = Math.max(0, snake.strikeCooldown - dt);
  if(snake.defenseTimer > 0) snake.defenseTimer -= dt;
  snake.defense += ((snake.defenseTimer > 0 ? 1 : 0) - snake.defense) * Math.min(1, dt * 2.5);
  updateBulges(dt);

  let prey = null, pd = 1e9;
  for(const m of mice){
    if(!m.alive || m.dying) continue;
    const d = m.group.position.distanceTo(snake.pos);
    if(d < pd){ pd = d; prey = m; }
  }

  snake.prey = pd < 12 ? prey : null;
  let targetSpeed = 1.6, maxTurn = 1.9, wigAmp = 1.0;

  if(snake.state === 'strike'){
    const st = snake.strike;
    st.t += dt;
    const k = st.t / st.dur;
    if(!st.mouse.alive || k >= 1){
      snake.state = (prey && pd < 30) ? 'hunt' : 'forage';
      snake.strike = null; snake.strikeCooldown = 0.9;
    } else {
      const sp = 11.5 * (1 - 0.35 * k);
      snake.pos.addScaledVector(st.dir, sp * dt);
      snake.heading = Math.atan2(st.dir.x, st.dir.z);
      snake.speed = sp;
      snake.jaw = sstep(0.06, 0.25, k) * (1 - sstep(0.85, 1, k));
      if(snake.pos.distanceTo(st.mouse.group.position) < 1.15){
        capture(st.mouse); snake.strike = null;
      }
    }
  }

  if(snake.state !== 'strike'){
    const digesting = snake.bulges.some(b => b.digesting && b.amp > 0.05);
    const jawT = snake.state === 'swallow' ? 0.25 * clamp(snake.swallowTimer / 2.4, 0, 1) : 0;
    snake.jaw += (jawT - snake.jaw) * Math.min(1, dt * 6);

    if(snake.state === 'swallow'){
      snake.swallowTimer -= dt;
      targetSpeed = 1.0; maxTurn = 1.2; wigAmp = 0.9;
      snake.targetPos.copy(snake.wanderTarget);
      if(snake.swallowTimer <= 0){ snake.state = 'forage'; snake.wanderTimer = 0; }
    } else if(prey && pd < 2.6 && snake.strikeCooldown <= 0 && facing(prey) > 0.35){
      beginStrike(prey);
    } else if(prey && pd < 30 && snake.defense <= 0.5){
      snake.state = 'hunt';
      targetSpeed = 3.4 * (digesting ? 0.7 : 1); maxTurn = 3.0; wigAmp = 0.85;
      snake.targetPos.copy(prey.group.position);
    } else if(snake.defense > 0.5){
      snake.state = 'defense';
      targetSpeed = 0.12; maxTurn = 1.2; wigAmp = 1.2;
      snake.targetPos.set(
        snake.pos.x + Math.sin(snake.heading) * 4, 0,
        snake.pos.z + Math.cos(snake.heading) * 4);
    } else {
      snake.state = 'forage';
      snake.wanderTimer -= dt;
      const dxw = snake.wanderTarget.x - snake.pos.x, dzw = snake.wanderTarget.z - snake.pos.z;
      if(snake.wanderTimer <= 0 || Math.hypot(dxw, dzw) < 3){
        const a = rand(TAU), rr = rand(14, 72);
        snake.wanderTarget.set(Math.cos(a) * rr, 0, Math.sin(a) * rr);
        snake.wanderTimer = rand(8, 14);
      }
      targetSpeed = digesting ? 1.0 : 1.6;
      snake.targetPos.copy(snake.wanderTarget);
    }

    if(snake.state !== 'strike'){
      /* steer toward target + avoid rocks + stay in the valley */
      const dx = snake.targetPos.x - snake.pos.x, dz = snake.targetPos.z - snake.pos.z;
      const desired0 = Math.atan2(dx, dz);
      let sx = Math.sin(desired0), sz = Math.cos(desired0);
      for(const o of obstacles){
        const ox = snake.pos.x - o.x, oz = snake.pos.z - o.z;
        const d = Math.hypot(ox, oz), rr = o.r + 2.3;
        if(d < rr && d > 1e-4){
          const w = (rr - d) / rr * 2.5;
          sx += ox / d * w; sz += oz / d * w;
        }
      }
      const bd = Math.hypot(snake.pos.x, snake.pos.z);
      if(bd > 80){ sx += -snake.pos.x / bd * 2.5; sz += -snake.pos.z / bd * 2.5; }
      const desired = Math.atan2(sx, sz);
      snake.heading += clamp(wrapPI(desired - snake.heading), -maxTurn * dt, maxTurn * dt);

      /* serpentine: lateral oscillation of the heading — the body inherits the S */
      snake.phase += snake.speed * dt * 1.5;
      const eff = snake.heading + Math.sin(snake.phase) * wigAmp * clamp(snake.speed / 1.6, 0, 1);
      snake.speed += (targetSpeed - snake.speed) * Math.min(1, dt * 2.2);
      snake.pos.x += Math.sin(eff) * snake.speed * dt;
      snake.pos.z += Math.cos(eff) * snake.speed * dt;
    }
  }
  snake.pos.y = terrainH(snake.pos.x, snake.pos.z);

  /* trail: push head, resample spine at fixed arc-length, trim */
  snake.path.unshift(snake.pos.clone());
  const sp = snake.spine;
  sp[0].copy(snake.path[0]);
  let si = 1, acc = 0, targetD = SEG_LEN, cut = snake.path.length;
  for(let i = 1; i < snake.path.length; i++){
    const a = snake.path[i - 1], b = snake.path[i];
    const d = a.distanceTo(b);
    if(d > 1e-6){
      while(acc + d >= targetD && si < SPINE_N){
        sp[si].lerpVectors(a, b, (targetD - acc) / d);
        si++; targetD += SEG_LEN;
      }
      acc += d;
    }
    if(acc > 25){ cut = i + 1; break; }
  }
  snake.path.length = Math.min(cut, snake.path.length);
  while(si < SPINE_N){ sp[si].copy(sp[si - 1]); si++; }
  limitBend();
}

/* ================= skin the spine ================= */
const UP = new THREE.Vector3(0, 1, 0);
const _tan = new THREE.Vector3(), _N = new THREE.Vector3(), _B = new THREE.Vector3();
function frameAt(i){
  const sp = snake.spine;
  const i0 = Math.max(0, i - 1), i1 = Math.min(SPINE_N - 1, i + 1);
  _tan.subVectors(sp[i1], sp[i0]);
  if(_tan.lengthSq() < 1e-10) _tan.set(Math.sin(snake.heading), 0, Math.cos(snake.heading));
  _tan.normalize();
  _N.copy(UP).addScaledVector(_tan, -UP.dot(_tan));
  if(_N.lengthSq() < 1e-6) _N.set(1, 0, 0);
  _N.normalize();
  _B.crossVectors(_N, _tan).normalize();
}

function buildSnakeGeometry(t){
  const sp = snake.spine, def = snake.defense;
  const swK = snake.state === 'swallow' ? clamp(snake.swallowTimer / 2.4, 0, 1) : 0;

  /* rest the belly on the ground */
  for(let i = 0; i < SPINE_N; i++){
    const tt = i / (SPINE_N - 1);
    sp[i].y = terrainH(sp[i].x, sp[i].z) + radiusAt(tt) * 0.88;
  }
  /* defensive rear-up: lift the anterior body, sway the neck, puff the throat */
  if(def > 0.003 || swK > 0.003){
    for(let i = 0; i < SPINE_N; i++){
      frameAt(i);
      const eN = sstep(0, 1, 1 - i / 16);
      const eL = sstep(0, 1, 1 - i / 20);
      sp[i].y += 2.0 * def * Math.pow(eL, 1.4) + 0.4 * swK * sstep(0, 1, 1 - i / 8);
      const sway = Math.sin(t * 2.1 + i * 0.55) * 0.42 * def * eN;
      sp[i].addScaledVector(_B, sway);
    }
  }

  /* travelling lateral wave: the whole body ripples, not just the path it follows */
  const mv = clamp(snake.speed / 1.6, 0, 1) * (1 - def);
  if(mv > 0.01) for(let i = 1; i < SPINE_N; i++){
    frameAt(i); const tw = i / (SPINE_N - 1);
    sp[i].addScaledVector(_B, Math.sin(snake.phase * 1.3 - i * 0.22) * 0.07 * mv * sstep(0, 0.2, tw) * (1 - 0.4 * sstep(0.85, 1, tw)));
  }
  const posA = snakeGeo.attributes.position, norA = snakeGeo.attributes.normal;
  let p = 0;
  for(let i = 0; i < SPINE_N; i++){
    frameAt(i);
    const Bx = _B.x, By = _B.y, Bz = _B.z, Nx = _N.x, Ny = _N.y, Nz = _N.z;
    const tt = i / (SPINE_N - 1);
    /* breathing: a slow rib-expansion wave along the mid-body */
    let R = radiusAt(tt) * (1 + 0.012 * Math.sin(snake.phase * 4 - i * 0.45) * mv) * (1 + 0.018 * Math.sin(t * 1.7 - tt * 7) * sstep(0.05, 0.3, tt) * (1 - sstep(0.7, 0.95, tt)));
    const sArc = tt * BODY_LEN;
    let add = 0;
    for(const b of snake.bulges){
      const d = sArc - b.s;
      add += b.amp * Math.exp(-(d * d) / (2 * 0.42 * 0.42));
    }
    R += Math.min(add, 0.30);
    if(def > 0.003) R *= 1 + 0.16 * sstep(0, 1, 1 - i / 16) * def;
    const cx = sp[i].x, cy = sp[i].y, cz = sp[i].z;
    for(let j = 0; j < RADIAL; j++){
      const th = Math.PI / 2 + j / RADIAL * TAU; // j=0 dorsal, j=11 ventral
      let lat = Math.cos(th), vert = Math.sin(th);
      if(vert < 0) vert *= 0.85; // slightly flattened belly
      const nx = Bx * lat + Nx * vert, ny = By * lat + Ny * vert, nz = Bz * lat + Nz * vert;
      /* dorsal keel: rounded-triangular cross-section */
      const Rj = R * (1 + 0.05 * Math.pow(Math.max(vert, 0), 8));
      posA.setXYZ(p, cx + nx * Rj, cy + ny * Rj, cz + nz * Rj);
      const il = 1 / Math.hypot(nx, ny, nz);
      norA.setXYZ(p, nx * il, ny * il, nz * il);
      p++;
    }
  }
  posA.needsUpdate = true; norA.needsUpdate = true;
  tailTip.position.copy(sp[SPINE_N - 1]);
}

/* ================= head pose, tongue, jaw ================= */
const _m4 = new THREE.Matrix4(), _qT = new THREE.Quaternion();
const ZERO = new THREE.Vector3(), _look = new THREE.Vector3();
let tongueT = -1, tongueNext = 1.2;
const _tv = new THREE.Vector3(), _qi = new THREE.Quaternion(), _qy = new THREE.Quaternion(); let headYaw = 0; const _X = new THREE.Vector3(1, 0, 0), _Z = new THREE.Vector3(0, 0, 1);
function updateHead(dt, t){
  const sp = snake.spine;
  _tan.subVectors(sp[0], sp[3]).normalize();
  headFwd.copy(_tan);
  _m4.lookAt(headFwd, ZERO, UP);
  _qT.setFromRotationMatrix(_m4);
  /* the head turns to track nearby prey */
  if(snake.prey){
    _tv.copy(snake.prey.group.position).sub(headGroup.position).applyQuaternion(_qi.copy(_qT).invert());
    headYaw += (clamp(Math.atan2(_tv.x, _tv.z), -0.35, 0.35) - headYaw) * Math.min(1, dt * 5);
  } else headYaw *= Math.exp(-dt * 2.5);
  _qT.multiply(_qy.setFromAxisAngle(UP, headYaw));
  _qT.multiply(_qy.setFromAxisAngle(_X, -0.35 * snake.defense)).multiply(_qy.setFromAxisAngle(_Z, Math.sin(t * 1.4) * 0.03));
  headGroup.quaternion.copy(_qT); /* rigid mount: no lag, no drift */
  headGroup.position.copy(sp[0]).add(_tv.set(0, 0.05, 0.42).applyQuaternion(_qT)); /* pivots at the neck joint; the skull's rear stays buried in the neck */
  
  

  jawPivot.rotation.x = (snake.jaw + 0.22 * snake.defense) * 0.55;
  if(snake.defense > 0.5 && Math.random() < dt * 0.9) spit(12, 0.3, 5);

  tongueNext -= dt;
  if(tongueNext <= 0 && tongueT < 0){
    tongueT = 0; flicks++; if(Math.random() < 0.6) spit(2, 0.1, 1.4);
    tongueNext = (snake.state === 'hunt' || snake.state === 'strike') ? rand(0.45, 1.1) : rand(1.4, 3.8);
  }
  if(tongueT >= 0){
    tongueT += dt / 0.85;
    if(tongueT > 1){ tongueT = -1; tongueGroup.visible = false; }
    else{
      const out = sstep(0, 0.22, tongueT) * (1 - sstep(0.62, 0.95, tongueT));
      tongueGroup.visible = out > 0.02 && snake.jaw < 0.2;
      tongueGroup.scale.set(1, 1, Math.max(0.02, out));
      tongueGroup.rotation.y = Math.sin(tongueT * 34) * 0.3 * out;
      tongueGroup.rotation.x = -0.18;
    }
  }
}

/* ================= interaction ================= */
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
function provoke(){ snake.defenseTimer = 5; sfxHiss(); setTimeout(() => spit(24, 0.35, 5.5), 450); }
let downX = 0, downY = 0;
window.addEventListener('pointerdown', e => {
  downX = e.clientX; downY = e.clientY;
}, { passive: true });
window.addEventListener('pointerup', e => {
  if(Math.hypot(e.clientX - downX, e.clientY - downY) > 6) return; // was a drag
  ndc.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  if(ray.intersectObject(headGroup, true).length || ray.intersectObject(snakeMesh, false).length){
    provoke();
    return;
  }
  const ht = ray.intersectObject(terrain);
  if(ht.length){
    const p = ht[0].point;
    if(Math.hypot(p.x, p.z) < 105){
      for(const o of obstacles){ // nudge out of rocks
        const dx = p.x - o.x, dz = p.z - o.z, d = Math.hypot(dx, dz);
        if(d < o.r + 0.8 && d > 1e-4){ p.x = o.x + dx / d * (o.r + 1); p.z = o.z + dz / d * (o.r + 1); }
      }
      if(mice.length >= 5){
        const old = mice.shift();
        old.alive = false; old.gone = true; scene.remove(old.group);
      }
      mice.push(new Mouse(p.clone()));
    }
  }
});

const muteBtn = document.getElementById('mute');
const icoOn = document.getElementById('icoOn'), icoOff = document.getElementById('icoOff');
const sndLabel = document.getElementById('sndLabel');
if (muteBtn) muteBtn.addEventListener('click', () => {
  ensureAudio();
  muted = !muted;
  if(master) master.gain.value = muted ? 0 : 0.9;
  icoOn.style.display = muted ? 'none' : 'block';
  icoOff.style.display = muted ? 'block' : 'none';
  sndLabel.textContent = muted ? 'muted' : 'sound';
});

/* ================= HUD ================= */
const stState = document.getElementById('stState'), stVel = document.getElementById('stVel');
const stPrey = document.getElementById('stPrey'), stFlick = document.getElementById('stFlick'), stWx = document.getElementById('stWx');
function displayState(){
  if(snake.state === 'strike') return 'STRIKING';
  if(snake.state === 'swallow') return 'SWALLOWING';
  if(snake.defense > 0.5) return 'DEFENSIVE';
  if(snake.state === 'hunt') return 'HUNTING';
  if(snake.bulges.some(b => b.digesting && b.amp > 0.05)) return 'DIGESTING';
  return 'FORAGING';
}
let hudTimer = 0;
function hudTick(dt){
  hudTimer -= dt;
  if(hudTimer > 0) return;
  hudTimer = 0.2;
  const s = displayState();
  if (stState) { stState.textContent = s;
  stState.classList.toggle('warn', s === 'DEFENSIVE');
  stVel.textContent = snake.speed.toFixed(2) + ' u/s';
  stPrey.textContent = String(mice.filter(m => m.alive && !m.dying).length);
  stFlick.textContent = String(flicks);
  stWx.textContent = wx.rain > 0.5 ? 'STORM' : wx.rain > 0.1 ? 'RAIN' : wx.dust > 0.5 ? 'DUST STORM' : wx.dust > 0.1 ? 'WINDY' : 'CLEAR'; }
  snakeGeo.computeBoundingSphere();
}
requestAnimationFrame(() => document.getElementById('hud')?.classList.add('on'));

/* ================= loop ================= */
const clock = new THREE.Clock();
let intro = 0;
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

/* ================= weather: clear → dust storm → thunderstorm → clear ================= */
const WXM = [[0, 0], [0.9, 0], [0.45, 1], [0, 0]]; // [dust, rain]
const wx = { mode: 0, timer: 25, dust: 0, rain: 0, flash: 0, nextBolt: 6 };
const RAIN_N = 1400, rainPos = new Float32Array(RAIN_N * 6), rainSeed = new Float32Array(RAIN_N * 3);
for(let i = 0; i < RAIN_N; i++){ rainSeed[i * 3] = rand(-24, 24); rainSeed[i * 3 + 1] = rand(0, 30); rainSeed[i * 3 + 2] = rand(-24, 24); }
const rainGeo = new THREE.BufferGeometry(); rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
const rainMat = new THREE.LineBasicMaterial({ color: 0xc4d2e0, transparent: true, opacity: 0, fog: false, depthWrite: false });
const rainLines = new THREE.LineSegments(rainGeo, rainMat); rainLines.frustumCulled = false; rainLines.visible = false; scene.add(rainLines);
const fogClear = new THREE.Color(0xdfc49e), fogDust = new THREE.Color(0xa8906e), fogRain = new THREE.Color(0x7f8a92), _fc = new THREE.Color();
function updateWeather(dt, t){
  wx.timer -= dt;
  if(wx.timer <= 0){ wx.mode = (wx.mode + 1) % WXM.length; wx.timer = rand(35, 60); }
  const [dT, rT] = WXM[wx.mode];
  wx.dust += (dT - wx.dust) * Math.min(1, dt * 0.35);
  wx.rain += (rT - wx.rain) * Math.min(1, dt * 0.4);
  const w = Math.max(wx.dust, wx.rain);
  wx.flash *= Math.exp(-dt * 7);
  if(wx.rain > 0.7){
    wx.nextBolt -= dt;
    if(wx.nextBolt <= 0){ wx.flash = 1; wx.nextBolt = rand(5, 14); setTimeout(() => playNoise(2.6, 'lowpass', 150, 0.6, 0.7, 0.08), rand(500, 1800)); }
  }
  _fc.copy(fogClear).lerp(fogDust, wx.dust).lerp(fogRain, wx.rain).addScalar(wx.flash * 0.5);
  scene.fog.color.copy(_fc); scene.fog.near = mix(55, 6, w); scene.fog.far = mix(230, 80, w);
  skyMat.uniforms.uW.value = w; skyMat.uniforms.uF.value = wx.flash;
  sun.intensity = 2.6 * (1 - 0.65 * w) + wx.flash * 3;
  renderer.toneMappingExposure = 1.05 - 0.15 * w + wx.flash * 0.5;
  windS.value = 0.5 + 1.6 * wx.dust + 0.8 * wx.rain;
  dust.material.opacity = 0.45 + 0.4 * wx.dust; dust.material.size = 0.42 + 0.7 * wx.dust;
  terrain.material.roughness = mix(0.96, 0.5, wx.rain); terrain.material.color.setScalar(1 - 0.35 * wx.rain);
  if(rainGain) rainGain.gain.value = muted ? 0 : 0.11 * wx.rain;
  rainLines.visible = wx.rain > 0.01; rainMat.opacity = 0.4 * wx.rain;
  if(rainLines.visible){
    const cx = camera.position.x, cy = camera.position.y - 6, cz = camera.position.z;
    for(let i = 0; i < RAIN_N; i++){
      const y = 30 - ((rainSeed[i * 3 + 1] + t * 26) % 30), x = cx + rainSeed[i * 3], z = cz + rainSeed[i * 3 + 2], k = i * 6;
      rainPos[k] = x; rainPos[k + 1] = cy + y; rainPos[k + 2] = z;
      rainPos[k + 3] = x + 0.25; rainPos[k + 4] = cy + y + 0.9; rainPos[k + 5] = z + 0.1;
    }
    rainGeo.attributes.position.needsUpdate = true;
  }
}

function updateDust(dt, t){
  const sx = snake.pos.x, sz = snake.pos.z;
  for(let i = 0; i < DUST_N; i++){
    const i3 = i * 3;
    dustPos[i3]     += (dustVel[i][0] + Math.sin(t * 0.5 + i) * 0.12) * dt;
    dustPos[i3 + 1] += dustVel[i][1] * dt + Math.sin(t * 0.8 + i * 2.1) * 0.02 * dt;
    dustPos[i3 + 2] += (dustVel[i][2] + Math.cos(t * 0.4 + i) * 0.12) * dt;
    if(dustPos[i3] - sx > 48) dustPos[i3] -= 96; else if(dustPos[i3] - sx < -48) dustPos[i3] += 96;
    if(dustPos[i3 + 2] - sz > 48) dustPos[i3 + 2] -= 96; else if(dustPos[i3 + 2] - sz < -48) dustPos[i3 + 2] += 96;
    if(dustPos[i3 + 1] > 11) dustPos[i3 + 1] = 0.2; else if(dustPos[i3 + 1] < 0) dustPos[i3 + 1] = 10.8;
  }
  dustGeo.attributes.position.needsUpdate = true;
}

renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  updateSnake(dt, t);
  buildSnakeGeometry(t);
  updateHead(dt, t);

  for(const m of mice) m.update(dt, t, snake.pos);
  for(let i = mice.length - 1; i >= 0; i--) if(mice[i].gone) mice.splice(i, 1);

  updateDust(dt, t); updateSpit(dt);

  /* drifting sun, synced to the sky shader and the wind clock */
  const sa = 0.6 + t * 0.01, sdx = Math.cos(sa) * 30, sdz = Math.sin(sa) * 30;
  skyMat.uniforms.sunDir.value.set(sdx, 26, sdz).normalize(); skyMat.uniforms.uT.value = t; windU.value = t; snU.value.copy(snake.pos); updateWeather(dt, t);
  sun.position.set(snake.pos.x + sdx, snake.pos.y + 26, snake.pos.z + sdz);
  sun.target.position.copy(snake.pos);
  sun.target.updateMatrixWorld();

  const targetCamPos = new THREE.Vector3(snake.pos.x + 10, snake.pos.y + 12, snake.pos.z + 14);
  camera.position.lerp(targetCamPos, Math.min(1, dt * 2.0));
  _look.copy(snake.spine[0]).addScaledVector(headFwd, 1.2);
  _look.y += 0.5;
  camera.lookAt(_look);

  hudTick(dt);
  renderer.render(scene, camera);
});
