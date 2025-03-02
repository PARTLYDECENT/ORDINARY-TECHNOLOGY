// =====================
// COMPLETE INTEGRATED WEATHER SYSTEM
// Enhanced Storm + Atmospheric Effects + Clouds
// =====================

// Global state for shared effects
const WEATHER = {
  time: 0,
  cloudTexture: null,
  activeStorms: [],
  activeClouds: []
};

// Shader definitions
const stormVertexShader = `
  attribute float size;
  attribute vec3 customColor;
  attribute float alpha;
  attribute float speed;
  attribute float turbulenceScale;
  
  varying vec3 vColor;
  varying float vAlpha;
  varying float vFogFactor;
  
  uniform float time;
  uniform float turbulence;
  uniform vec3 fogColor;
  
  // Simplex noise function
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
  
  float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(
              i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }
  
  float localNoise(vec3 p) {
    return snoise(p * 2.0) * 0.5 + snoise(p * 4.0) * 0.25 + snoise(p * 8.0) * 0.125;
  }
  
  void main() {
    vColor = customColor;
    vAlpha = alpha;
    
    vec3 noiseInput = position * 0.03 + vec3(time * 0.3);
    float primaryNoise = snoise(noiseInput) * turbulence;
    float secondaryNoise = localNoise(noiseInput * 2.0) * turbulence * turbulenceScale;
    
    float angle = time * 0.1 * speed + length(position.xz) * 0.01;
    mat2 rotation = mat2(
      cos(angle), -sin(angle),
      sin(angle), cos(angle)
    );
    
    vec3 newPosition = position;
    newPosition.xz = rotation * newPosition.xz;
    newPosition += vec3(
      primaryNoise * 1.5 + secondaryNoise,
      primaryNoise * 0.8,
      primaryNoise * 1.5 + secondaryNoise
    );
    
    newPosition.y *= 0.5;
    newPosition.xz *= 1.5;
    
    vec4 mvPosition = modelViewMatrix * vec4(newPosition, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    
    float heightFactor = 1.0 - abs(newPosition.y / 200.0);
    float distanceScale = 800.0 / length(mvPosition.xyz);
    gl_PointSize = size * (distanceScale + secondaryNoise * 0.3) * heightFactor;
    
    float fogDistance = length(mvPosition.xyz);
    vFogFactor = 1.0 - clamp((fogDistance - 100.0) / 300.0, 0.0, 1.0);
  }
`;

const stormFragmentShader = `
  varying vec3 vColor;
  varying float vAlpha;
  varying float vFogFactor;
  uniform vec3 fogColor;
  
  void main() {
    vec2 xy = gl_PointCoord.xy - vec2(0.5);
    float radius = length(xy);
    
    float coreOpacity = smoothstep(0.5, 0.1, radius) * vAlpha;
    float glowOpacity = smoothstep(0.5, 0.2, radius) * vAlpha * 0.5;
    
    vec3 coreColor = vColor;
    vec3 glowColor = vColor * (1.0 - radius * 2.0);
    vec3 finalColor = mix(glowColor, coreColor, radius);
    
    finalColor = mix(fogColor, finalColor, vFogFactor);
    float finalOpacity = mix(coreOpacity, glowOpacity, 1.0 - vFogFactor);
    
    gl_FragColor = vec4(finalColor, finalOpacity);
  }
`;

function spawnContinuousParticleStorm() {
  const particleCount = 450 * 50;
  const geometry = new THREE.BufferGeometry();
  
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);
  const sizes = new Float32Array(particleCount);
  const alphas = new Float32Array(particleCount);
  const speeds = new Float32Array(particleCount);
  const turbulenceScales = new Float32Array(particleCount);
  
  for (let i = 0; i < particleCount; i++) {
    const i3 = i * 3;
    
    const angle = Math.random() * Math.PI * 2;
    const radiusFactor = Math.pow(Math.random(), 0.5);
    const radius = radiusFactor * 6000;
    const height = (Math.random() - 0.5) * 200;
    
    positions[i3] = Math.cos(angle) * radius;
    positions[i3 + 1] = height;
    positions[i3 + 2] = Math.sin(angle) * radius;
    
    const colorVar = Math.random();
    colors[i3] = 1.0;
    colors[i3 + 1] = 0.3 + colorVar * 0.3;
    colors[i3 + 2] = colorVar * 0.2;
    
    sizes[i] = 1.5 + Math.random() * 2.5;
    alphas[i] = 0.3 + Math.random() * 0.4;
    speeds[i] = 0.5 + Math.random() * 0.5;
    turbulenceScales[i] = Math.random();
  }
  
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('customColor', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));
  geometry.setAttribute('speed', new THREE.BufferAttribute(speeds, 1));
  geometry.setAttribute('turbulenceScale', new THREE.BufferAttribute(turbulenceScales, 1));
  
  const material = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      turbulence: { value: 0.8 },
      fogColor: { value: new THREE.Color(0.8, 0.3, 0.1) }
    },
    vertexShader: stormVertexShader,
    fragmentShader: stormFragmentShader,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
    vertexColors: true,
    clipping: true,
    clippingPlanes: [ new THREE.Plane(new THREE.Vector3(0, 1, 0), 0) ]
  });
  
  const particles = new THREE.Points(geometry, material);
  particles.position.set(Math.random() * 800 - 4, 50, Math.random() * 800 - 400);
  GAME.scene.add(particles);
  
  WEATHER.activeStorms.push({
    particles,
    material,
    geometry
  });
}

// Enhanced cloud system
async function loadCloudTexture() {
  return new Promise((resolve) => {
    const textureLoader = new THREE.TextureLoader();
    WEATHER.cloudTexture = textureLoader.load('cloud.png', () => {
      resolve();
    });
  });
}

function spawnCloud() {
  const cloudMaterial = new THREE.SpriteMaterial({
    map: WEATHER.cloudTexture,
    transparent: true,
    opacity: 0.8,
    blending: THREE.NormalBlending
  });

  const cloudSprite = new THREE.Sprite(cloudMaterial);
  const scale = (100 + Math.random() * 50) * 20;
  cloudSprite.scale.set(scale, scale, 1);
  cloudSprite.position.set(Math.random() * 800 - 400, 250 + Math.random() * 50, Math.random() * 800 - 400);
  GAME.scene.add(cloudSprite);

  WEATHER.activeClouds.push({
    sprite: cloudSprite,
    material: cloudMaterial,
    speed: 0.05 + Math.random() * 0.02
  });
}

function autoSpawnClouds() {
  setInterval(() => {
    spawnCloud();
  }, 15000);
}

// Main animation loop
function animateWeather() {
  WEATHER.time += 0.008;

  // Animate storms
  WEATHER.activeStorms.forEach(storm => {
    storm.material.uniforms.time.value = WEATHER.time;
    storm.material.uniforms.turbulence.value = 0.8 + Math.sin(WEATHER.time * 0.3) * 0.15;
    storm.particles.rotation.y += 0.0005;
  });

  // Animate clouds
  WEATHER.activeClouds.forEach((cloud, index) => {
    cloud.sprite.position.x += cloud.speed;
    cloud.sprite.position.y += Math.sin(WEATHER.time) * 0.02;

    if (cloud.sprite.position.x > 500) {
      GAME.scene.remove(cloud.sprite);
      cloud.material.dispose();
      WEATHER.activeClouds.splice(index, 1);
    }
  });

  requestAnimationFrame(animateWeather);
}

// Initialize everything
document.addEventListener("DOMContentLoaded", () => {
  // Start weather animation loop
  animateWeather();
  
  // Load cloud texture and start cloud system
  loadCloudTexture().then(() => {
    autoSpawnClouds();
  });
  
  // Start storm after delay
  setTimeout(() => {
    spawnContinuousParticleStorm();
  }, 30000);
});