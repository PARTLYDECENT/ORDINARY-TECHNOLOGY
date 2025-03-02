// =====================
// COMPLETE INTEGRATED WEATHER SYSTEM
// Enhanced Volumetric Smoke + Atmospheric Effects + Clouds
// =====================

// Check for existing WEATHER object or initialize new one
if (typeof WEATHER === 'undefined') {
  window.WEATHER = {
    time: 0,
    cloudTexture: null,
    activeClouds: []
  };
}

// Add smoke array if it doesn't exist
WEATHER.activeSmoke = WEATHER.activeSmoke || [];

// Smoke volume shader definitions
const smokeVertexShader = `
  varying vec2 vUv;
  varying vec3 vPosition;
  varying vec3 vWorldPosition;
  
  void main() {
    vUv = uv;
    vPosition = position;
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const smokeFragmentShader = `
  varying vec2 vUv;
  varying vec3 vPosition;
  varying vec3 vWorldPosition;
  
  uniform float time;
  uniform vec3 smokeColor;
  uniform float density;
  
  // Improved 3D noise function for better smoke detail
  float mod289(float x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 perm(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
  
  float noise(vec3 p) {
    vec3 a = floor(p);
    vec3 d = p - a;
    d = d * d * (3.0 - 2.0 * d);

    vec4 b = a.xxyy + vec4(0.0, 1.0, 0.0, 1.0);
    vec4 k1 = perm(b.xyxy);
    vec4 k2 = perm(k1.xyxy + b.zzww);

    vec4 c = k2 + a.zzzz;
    vec4 k3 = perm(c);
    vec4 k4 = perm(c + 1.0);

    vec4 o1 = fract(k3 * (1.0 / 41.0));
    vec4 o2 = fract(k4 * (1.0 / 41.0));

    vec4 o3 = o2 * d.z + o1 * (1.0 - d.z);
    vec2 o4 = o3.yw * d.x + o3.xz * (1.0 - d.x);

    return o4.y * d.y + o4.x * (1.0 - d.y);
  }
  
  float fbm(vec3 p) {
    float sum = 0.0;
    float amp = 0.5;
    float freq = 1.0;
    // Fewer octaves for better performance
    for(int i = 0; i < 4; i++) {
      sum += noise(p * freq) * amp;
      freq *= 2.0;
      amp *= 0.5;
    }
    return sum;
  }
  
  void main() {
    // Create base smoke shape
    vec3 noisePos = vWorldPosition * 0.003 + vec3(0.0, time * 0.05, 0.0);
    float baseNoise = fbm(noisePos);
    
    // Add movement and swirls
    float movementNoise = fbm(noisePos * 2.0 + vec3(time * 0.1));
    
    // Combine noises for final smoke shape
    float smoke = baseNoise * movementNoise;
    smoke = smoothstep(0.1, 0.6, smoke) * density;
    
    // Height falloff
    float heightFalloff = smoothstep(1.0, 0.0, vPosition.y / 100.0);
    smoke *= heightFalloff;
    
    // Edge softening
    float edgeSoftness = smoothstep(0.0, 0.3, 1.0 - length(vPosition.xz) / 50.0);
    smoke *= edgeSoftness;
    
    gl_FragColor = vec4(smokeColor, smoke);
  }
`;

function createSmokeVolume() {
  // Create a cylinder geometry for the smoke volume
  const geometry = new THREE.CylinderGeometry(30, 50, 100, 32, 32, true);
  
  const material = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      smokeColor: { value: new THREE.Color(0.95, 0.95, 0.95) },
      density: { value: 0.8 }
    },
    vertexShader: smokeVertexShader,
    fragmentShader: smokeFragmentShader,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  
  const smokeVolume = new THREE.Mesh(geometry, material);
  smokeVolume.position.set(Math.random() * 800 - 400, 50, Math.random() * 800 - 400);
  GAME.scene.add(smokeVolume);
  
  WEATHER.activeSmoke.push({
    volume: smokeVolume,
    material: material,
    geometry: geometry,
    initialY: smokeVolume.position.y,
    speed: 0.2 + Math.random() * 0.1
  });
}

// Update existing animation loop if it exists, otherwise create new one
const originalAnimateWeather = WEATHER.animate || function() {};

WEATHER.animate = function() {
  originalAnimateWeather();
  
  WEATHER.time += 0.008;

  // Animate smoke
  WEATHER.activeSmoke.forEach((smoke, index) => {
    smoke.material.uniforms.time.value = WEATHER.time;
    
    // Add subtle movement
    smoke.volume.position.y = smoke.initialY + Math.sin(WEATHER.time * 0.5) * 2;
    smoke.volume.rotation.y += 0.001;
    
    // Animate density for more natural look
    smoke.material.uniforms.density.value = 0.6 + Math.sin(WEATHER.time * 0.3) * 0.2;
  });

  requestAnimationFrame(WEATHER.animate);
};

// Initialize smoke system
function initSmokeSystem() {
  // Start smoke after delay if not already running
  if (!WEATHER.smokeInitialized) {
    setTimeout(() => {
      createSmokeVolume();
    }, 30000);
    WEATHER.smokeInitialized = true;
  }
  
  // Start animation if not already running
  if (!WEATHER.animationStarted) {
    WEATHER.animate();
    WEATHER.animationStarted = true;
  }
}

// Initialize when document is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSmokeSystem);
} else {
  initSmokeSystem();
}