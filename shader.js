// Wrap everything in an Immediately Invoked Function Expression (IIFE)
// to avoid polluting the global scope unnecessarily, except for `window.updateShader`.
(function() {
    "use strict"; // Enable strict mode

    // --- WebGL Setup and Shader Logic ---
    // --- (Derived from sources 200-548) ---

    const webglCanvas = document.getElementById('webglCanvas');
    let gl = null; // Keep gl scoped within this IIFE

    if (!webglCanvas) {
        console.error("WebGL Canvas element with id 'webglCanvas' not found!");
        return; // Stop script execution if canvas isn't found
    }

    try {
        webglCanvas.width = window.innerWidth;
        webglCanvas.height = window.innerHeight;
        // Try to get webgl2, fall back to webgl1
        gl = webglCanvas.getContext('webgl2') ||
             webglCanvas.getContext('webgl') ||
             webglCanvas.getContext('experimental-web-gl');

        if (!gl) {
            throw new Error("WebGL not supported or context creation failed.");
        }

        if (gl instanceof WebGL2RenderingContext) {
            console.log("WebGL2 Context Initialized.");
        } else {
            console.log("WebGL1 Context Initialized. Note: Shader uses GLSL 3.00 ES features.");
        }
    } catch (e) {
        console.error("WebGL Initialization Error:", e);
        // Fallback: Provide a static background color if WebGL fails
        if (document.body) document.body.style.backgroundColor = '#050511';
        return; // Stop script execution
    }

    // --- Shader Sources ---
    // Vertex Shader (GLSL 3.00 ES)
    const vertexShaderSource = `#version 300 es
        precision highp float; // Precision needed in VS for GLSL 300 es
        in vec4 a_position;
        void main() {
            gl_Position = a_position; // Pass position through
        }
    `;

    // Fragment Shader (GLSL 3.00 ES - 38 Phases)
    // Added 8 new phases (0-7) at the beginning, shifted existing phases up by 8.
    const fragmentShaderSource = `#version 300 es
        precision highp float; // Precision qualifier required in fragment shaders

        // Uniforms: Inputs from JavaScript
        uniform float u_time;
        uniform vec2 u_resolution;
        uniform vec2 u_mouse;
        uniform float u_intensity;
        uniform float u_speed;
        uniform int u_complexity;

        // Output variable: Replaces gl_FragColor
        out vec4 outColor;

        // --- Constants ---
        const float PI = 3.14159265359;
        const float TWO_PI = 6.28318530718;
        const int FBM_OCTAVES = 5;
        const int MAX_RAYMARCH_STEPS = 48;
        const float MAX_RAYMARCH_DIST = 12.0;
        const int MANDELBROT_ITER = 40;
        const float TOTAL_PHASES_F = 38.0; // 8 new phases added

        // --- Helper Functions (minified versions often used in shaders) ---
        float rand(vec2 co){ return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453); }
        float rand(float n){ return fract(sin(n) * 43758.5453123); }
        float hash(float n) { return fract(sin(n) * 43758.5453); }
        float noise(vec2 p) { vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); float n=i.x+i.y*57.; return mix(mix(hash(n),hash(n+1.),f.x), mix(hash(n+57.),hash(n+58.),f.x),f.y); }
        float fbm(vec2 p) { float s=0., a=.7, f=1.; for(int i=0; i<FBM_OCTAVES; i++) { s+=noise(p*f)*a; a*=.5; f*=2.; } return s; }
        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
        vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
        float snoise(vec3 v) { const vec2 C=vec2(1./6.,1./3.); const vec4 D=vec4(0.,.5,1.,2.); vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx); vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy); vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy; i=mod289(i); vec4 p=permute(permute(permute(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.)); float n_=1./7.; vec3 ns=n_*D.wyz-D.xzx; vec4 j=p-49.*floor(p*ns.z*ns.z); vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.*x_); vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.-abs(x)-abs(y); vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw); vec4 s0=floor(b0)*2.+1.; vec4 s1=floor(b1)*2.+1.; vec4 sh=-step(h,vec4(0.)); vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww; vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w); vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3))); p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w; vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.); m=m*m; return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3))); }
        float snoise(vec2 v) { return snoise(vec3(v, 0.0)); }
        mat2 rotate2D(float a) { return mat2(cos(a), -sin(a), sin(a), cos(a)); }
        float worley(vec2 p) { float md=10.; vec2 g=floor(p); for(int x=-1;x<=1;x++){ for(int y=-1;y<=1;y++){ vec2 n=g+vec2(float(x),float(y)); vec2 pt=vec2(rand(n),rand(n+vec2(7.3,3.7))); pt=.5+.5*sin(u_time*.3+TWO_PI*pt); vec2 fp=n+pt; md=min(md,length(p-fp)); }} return md; }
        float truchetPattern(vec2 uv, float s) { uv*=s; vec2 ip=floor(uv), fp=fract(uv); float r=rand(ip), t=floor(r*2.), d; if(t==0.){d=abs(fp.x+fp.y-1.)/sqrt(2.);}else{d=abs(fp.x-fp.y)/sqrt(2.);} return smoothstep(.04,.06,abs(d-.5)); }
        float sdSphere(vec3 p, float s) { return length(p) - s; }
        float sdPlane(vec3 p, vec3 n, float h) { return dot(p, n) + h; }

        // --- Color Definitions ---
        vec3 colPrimary = vec3(106./255., 0., 1.); // Purple/Blue
        vec3 colSecondary = vec3(0., 1., 204./255.); // Cyan
        vec3 colTertiary = vec3(0., 184./255., 212./255.); // Turquoise
        vec3 colGreen = vec3(0.1, 0.8, 0.4); // Vibrant Green
        vec3 colGold = vec3(0.9, 0.7, 0.1); // Gold/Yellow
        vec3 colStrangeGreen = vec3(0.1, 0.4, 0.2); // Darker Green
        vec3 colDeepRed = vec3(0.6, 0.0, 0.15); // Maroon
        vec3 colWhite = vec3(1.0); // White
        vec3 colOrange = vec3(1.0, 0.5, 0.0); // Orange
        vec3 colPink = vec3(1.0, 0.4, 0.7); // Pink
        vec3 colSkyBlue = vec3(0.5, 0.7, 1.0); // Light Blue
        vec3 colLimeGreen = vec3(0.7, 1.0, 0.0); // Lime Green
        vec3 colDarkGrey = vec3(0.2, 0.2, 0.2); // Dark Grey
        vec3 colElectricBlue = vec3(0.2, 0.6, 1.0); // Electric Blue
        vec3 colSoftPurple = vec3(0.6, 0.4, 0.8); // Soft Purple

        vec3 colBackground = vec3(5./255., 5./255., 17./255.); // Dark Background

        // Basic color getter for CA effect
        vec3 getColorForCA(vec2 uv, float t) { float n = fbm(uv*4. + t*.15); return mix(colPrimary, colTertiary, n); }

        // --- Main Shader Logic ---
        void main() {
            // Normalized device coordinates, aspect corrected, origin center
            vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / min(u_resolution.y, u_resolution.x);
            // Original UV coordinates (0 to 1)
            vec2 originalUV = gl_FragCoord.xy / u_resolution.xy;

            float time_warp = u_time * 0.1; // Controls phase speed
            float phase = mod(time_warp, TOTAL_PHASES_F);
            float phaseProgress = fract(phase); // Progress within current phase
            int phaseIndex = int(floor(phase)); // Current phase index (0-37)

            vec3 color = colBackground; // Start with background

            // --- New GLSL Phases (0-7) from Holographic Theory ---
            if (phaseIndex == 0) { // Quantum Field
                // Quantum Field GLSL
                vec2 center = vec2(0.5, 0.5);
                float dist = distance(originalUV, u_mouse);
                float t = u_time * u_speed;
                float field = 0.0;
                for(int i = 0; i < 5; i++) {
                    float freq = pow(2.0, float(i));
                    field += sin(originalUV.x * freq * 10.0 + t) * sin(originalUV.y * freq * 10.0 + t) / freq;
                }
                float disturbance = exp(-dist * 10.0) * sin(t * 5.0);
                field += disturbance * u_intensity;
                float zpe = fbm(originalUV * 5.0 + t * 0.1) * 0.3;
                field += zpe;
                float hue = field * 0.5 + t * 0.1;
                float sat = 0.8 + sin(field * 3.0) * 0.2;
                float val = 0.5 + field * u_intensity;
                vec3 color1 = vec3(hue, sat, val);
                float interference = sin(dist * 50.0 - t * 3.0) * 0.1;
                color = color1 + vec3(interference);
            }
            else if (phaseIndex == 1) { // Holographic Interference
                vec2 uv = originalUV;
                float t = u_time * u_speed;
                vec2 source1 = vec2(0.3, 0.3) + vec2(sin(t * 0.7), cos(t * 0.5)) * 0.2;
                vec2 source2 = vec2(0.7, 0.7) + vec2(cos(t * 0.8), sin(t * 0.6)) * 0.2;
                vec2 source3 = u_mouse;
                float d1 = distance(uv, source1);
                float d2 = distance(uv, source2);
                float d3 = distance(uv, source3);
                float wave1 = sin(d1 * 30.0 - t * 5.0) / (d1 + 0.1);
                float wave2 = sin(d2 * 35.0 - t * 4.5) / (d2 + 0.1);
                float wave3 = sin(d3 * 40.0 - t * 6.0) / (d3 + 0.1);
                float interference = (wave1 + wave2 + wave3) * u_intensity;
                vec3 color1 = vec3(0.0, 1.0, 1.0);
                vec3 color2 = vec3(1.0, 0.0, 1.0);
                vec3 color3 = vec3(1.0, 1.0, 0.0);
                vec3 finalColor = mix(color1, color2, sin(interference * 2.0) * 0.5 + 0.5);
                finalColor = mix(finalColor, color3, sin(interference * 3.0 + 1.0) * 0.3 + 0.3);
                float shimmer = sin(uv.x * 100.0 + t * 10.0) * sin(uv.y * 100.0 + t * 8.0) * 0.1;
                finalColor += vec3(shimmer);
                color = finalColor * (0.5 + interference * 0.5);
            }
            else if (phaseIndex == 2) { // Fractal Dimension
                vec2 uv = (originalUV - 0.5) * 3.0;
                float t = u_time * u_speed * 0.1;
                vec2 offset = (u_mouse - 0.5) * 2.0;
                float zoom = 1.0 + sin(t) * 0.5;
                vec2 c = (uv + offset) / zoom;
                c += vec2(sin(t * 0.7), cos(t * 0.5)) * 0.3;
                vec2 z = vec2(0.0);
                float iterations = 0.0;
                for(int i = 0; i < 100; i++) {
                    if(dot(z, z) > 4.0) break;
                    z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
                    iterations += 1.0;
                }
                float m = iterations / 100.0;
                vec3 color1 = vec3(0.1, 0.2, 0.8);
                vec3 color2 = vec3(0.8, 0.1, 0.9);
                vec3 color3 = vec3(0.9, 0.8, 0.1);
                vec3 colorF = mix(color1, color2, m);
                colorF = mix(colorF, color3, sin(m * 10.0 + t * 2.0) * 0.5 + 0.5);
                float rift = sin(length(uv) * 20.0 - t * 5.0) * 0.1;
                color = colorF + vec3(rift) * u_intensity;
            }
            else if (phaseIndex == 3) { // Wave Collapse
                vec2 uv = originalUV;
                float t = u_time * u_speed;
                float superposition = 0.0;
                for(int i = 0; i < 10; i++) {
                    float phase = float(i) * 0.628 + t;
                    vec2 waveCenter = vec2(0.5) + vec2(sin(phase), cos(phase)) * 0.3;
                    float dist = distance(uv, waveCenter);
                    superposition += sin(dist * 15.0 - t * 3.0) * exp(-dist * 2.0);
                }
                float mouseInfluence = distance(uv, u_mouse);
                float collapse = exp(-mouseInfluence * 8.0);
                float probability = abs(superposition) * (1.0 - collapse);
                float tunnel = sin(uv.x * 50.0 + t * 2.0) * sin(uv.y * 50.0 + t * 1.5) * 0.1;
                color = vec3(0.0);
                color += vec3(0.2, 0.4, 1.0) * probability * (1.0 - collapse);
                color += vec3(1.0, 1.0, 0.5) * collapse * u_intensity;
                float noise = fract(sin(dot(uv + t * 0.1, vec2(12.9898,78.233))) * 43758.5453123) * 0.1;
                color += vec3(noise);
                color += vec3(0.0, 1.0, 0.5) * tunnel * u_intensity;
            }
            else if (phaseIndex == 4) { // Zero Point Energy
                vec2 uv = originalUV;
                float t = u_time * u_speed;
                float vacuum = fbm(vec3(uv * 8.0, t * 0.5)) * u_intensity;
                float particles = 0.0;
                for(int i = 0; i < 20; i++) {
                    float phase = float(i) * 0.314 + t * 2.0;
                    vec2 particlePos = vec2(sin(phase * 1.3), cos(phase * 1.7)) * 0.4 + 0.5;
                    float dist = distance(uv, particlePos);
                    float lifetime = sin(phase * 3.0) * 0.5 + 0.5;
                    particles += exp(-dist * 30.0) * lifetime;
                }
                float casimir = sin(uv.x * 100.0) * sin(uv.y * 100.0) * 0.05;
                float energy = vacuum + particles * 0.5 + casimir;
                float mouseEffect = exp(-distance(uv, u_mouse) * 5.0) * sin(t * 10.0) * 0.3;
                energy += mouseEffect;
                vec3 lowEnergy = vec3(0.1, 0.0, 0.3);
                vec3 medEnergy = vec3(0.0, 0.5, 1.0);
                vec3 highEnergy = vec3(1.0, 1.0, 1.0);
                vec3 colorF = mix(lowEnergy, medEnergy, smoothstep(-0.5, 0.0, energy));
                colorF = mix(colorF, highEnergy, smoothstep(0.0, 0.5, energy));
                float foam = fract(sin(dot(vec3(uv * 50.0, t * 5.0), vec3(12.9898, 78.233, 45.164))) * 43758.5453) * 0.1;
                color = colorF + vec3(foam);
            }
            else if (phaseIndex == 5) { // Dimensional Portal
                vec2 uv = originalUV - 0.5;
                float t = u_time * u_speed;
                vec2 portalCenter = (u_mouse - 0.5) * 0.5;
                uv -= portalCenter;
                float dist = length(uv);
                float angle = atan(uv.y, uv.x);
                angle += t * 2.0;
                uv = vec2(cos(angle), sin(angle)) * dist;
                float warp = sin(dist * 10.0 - t * 5.0) * 0.1 / (dist + 0.1);
                uv += normalize(uv) * warp;
                float rings = sin(dist * 20.0 - t * 3.0) * exp(-dist * 2.0);
                float energy = 0.0;
                for(int i = 0; i < 5; i++) {
                    float layer = float(i) * 0.2;
                    energy += sin((dist + layer) * 15.0 - t * (3.0 + layer)) * exp(-abs(dist - 0.3 - layer) * 10.0);
                }
                float horizon = smoothstep(0.25, 0.35, dist) * smoothstep(0.6, 0.4, dist);
                vec3 color1 = vec3(1.0, 0.0, 1.0);
                vec3 color2 = vec3(0.0, 1.0, 1.0);
                vec3 color3 = vec3(1.0, 1.0, 0.0);
                vec3 color4 = vec3(1.0, 0.5, 0.0);
                float colorPhase = angle * 2.0 + t;
                vec3 colorF = mix(color1, color2, sin(colorPhase) * 0.5 + 0.5);
                colorF = mix(colorF, color3, sin(colorPhase + 2.0) * 0.5 + 0.5);
                colorF = mix(colorF, color4, sin(colorPhase + 4.0) * 0.5 + 0.5);
                float intensity = (rings + energy * 0.5) * horizon * u_intensity;
                float distortion = sin(uv.x * 30.0 + t * 4.0) * sin(uv.y * 30.0 + t * 3.0) * 0.1;
                intensity += distortion;
                color = colorF * intensity;
            }
            else if (phaseIndex == 6) { // Cosmic Strings
                vec2 uv = originalUV;
                float t = u_time * u_speed;
                float strings = 0.0;
                for(int i = 0; i < 8; i++) {
                    float phase = float(i) * 0.785 + t * 0.5;
                    vec2 a = vec2(sin(phase * 1.3), cos(phase * 1.7)) * 0.8 + 0.5;
                    vec2 b = vec2(sin(phase * 1.7 + 3.14), cos(phase * 1.3 + 3.14)) * 0.8 + 0.5;
                    vec2 gravity = u_mouse - 0.5;
                    a += gravity * 0.2 * sin(t + float(i));
                    b += gravity * 0.2 * cos(t + float(i));
                    vec2 pa = uv - a;
                    vec2 ba = b - a;
                    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
                    float dist = length(pa - ba * h);
                    float thickness = 0.01 + sin(t * 2.0 + float(i)) * 0.005;
                    float energy = exp(-dist / thickness) * (0.5 + sin(t * 3.0 + float(i)) * 0.5);
                    strings += energy;
                }
                vec2 lensCenter = u_mouse;
                float lensing = exp(-distance(uv, lensCenter) * 3.0) * 0.3;
                float distortion = sin(uv.x * 20.0 + t * 2.0) * sin(uv.y * 20.0 + t * 1.5) * lensing;
                color = vec3(0.0);
                color += vec3(0.8, 0.4, 1.0) * strings * u_intensity;
                color += vec3(1.0, 0.8, 0.2) * lensing;
                color += vec3(0.2, 0.8, 1.0) * abs(distortion);
                float background = sin(length(uv - 0.5) * 50.0 - t * 10.0) * 0.05;
                color += vec3(background);
            }
            else if (phaseIndex == 7) { // Quantum Entanglement
                vec2 uv = originalUV;
                float t = u_time * u_speed;
                vec3 entanglement = vec3(0.0);
                for(int i = 0; i < 6; i++) {
                    float pairPhase = float(i) * 1.047 + t * 0.8;
                    vec2 particleA = vec2(sin(pairPhase * 1.2), cos(pairPhase * 0.9)) * 0.3 + vec2(0.3, 0.5);
                    vec2 particleB = vec2(-sin(pairPhase * 1.2), -cos(pairPhase * 0.9)) * 0.3 + vec2(0.7, 0.5);
                    vec2 mouseInfluence = (u_mouse - 0.5) * 0.1;
                    particleA += mouseInfluence;
                    particleB -= mouseInfluence;
                    float distA = distance(uv, particleA);
                    float distB = distance(uv, particleB);
                    float stateA = sin(pairPhase * 3.0 + t * 5.0);
                    float stateB = -stateA;
                    float particleIntensityA = exp(-distA * 20.0) * (0.5 + stateA * 0.5);
                    float particleIntensityB = exp(-distB * 20.0) * (0.5 + stateB * 0.5);
                    vec2 connectionDir = normalize(particleB - particleA);
                    vec2 toConnection = uv - particleA;
                    float connectionDist = abs(dot(toConnection, vec2(-connectionDir.y, connectionDir.x)));
                    float alongConnection = dot(toConnection, connectionDir);
                    float connectionIntensity = 0.0;
                    if(alongConnection > 0.0 && alongConnection < distance(particleA, particleB)) {
                        connectionIntensity = exp(-connectionDist * 50.0) * sin(alongConnection * 20.0 - t * 10.0) * 0.3;
                    }
                    vec3 pairColor = vec3(
                        sin(float(i) * 2.0) * 0.5 + 0.5,
                        sin(float(i) * 2.0 + 2.0) * 0.5 + 0.5,
                        sin(float(i) * 2.0 + 4.0) * 0.5 + 0.5
                    );
                    entanglement += pairColor * (particleIntensityA + particleIntensityB + connectionIntensity);
                }
                float field = sin(uv.x * 15.0 + t * 2.0) * sin(uv.y * 15.0 + t * 1.8) * 0.1;
                float nonlocal = exp(-abs(sin(length(uv - u_mouse) * 10.0 - t * 8.0)) * 2.0) * 0.2;
                vec3 finalColor = entanglement * u_intensity + vec3(field) + vec3(nonlocal);
                float uncertainty = fract(sin(dot(uv + t * 0.1, vec2(12.9898, 78.233))) * 43758.5453) * 0.1;
                finalColor += vec3(uncertainty);
                color = finalColor;
            }
            // --- Existing phases, now shifted up by 8 ---
            else if (phaseIndex == 8) {
                // ...existing code for old phase 0...
            }
            else if (phaseIndex == 9) { float wf=.1+.05*sin(u_time*.2); wf=max(.001,wf); float z=.1/max(.01,.1-uv.y*wf+.02*fbm(uv+u_time*.05)); z=clamp(z,.1,15.); vec2 warp=uv*z; vec2 grid=abs(fract(warp*vec2(5.,3.)+u_time*.1)-.5); float line=smoothstep(.04,.05,min(grid.x,grid.y))*.6; float df=fract(z*.1+u_time*.15); vec3 bc=mix(mix(colPrimary,colTertiary,sin(u_time*.1)*.5+.5),colSecondary,sin(length(warp)*.5-u_time*.5)*.5+.5); color=mix(bc*.15,bc,line*df*1.5); }
            else if (phaseIndex == 10) { float d=length(uv); float r=sin(d*18.-u_time*2.5)*.5+.5; r*=smoothstep(1.8,.4,d); float w=sin(uv.y*25.+u_time*1.2)*.04; vec2 wu=uv+vec2(w,sin(uv.x*15.+u_time*.8)*.03); float n=fbm(wu*3.5+u_time*.25); vec3 bc=mix(mix(colSecondary,colTertiary,r),mix(colGreen,colGold,n),.5+.5*sin(u_time*.6+d*2.)); color=mix(bc*.2,bc,r*.8+n*.6); }
            else if (phaseIndex == 11) { vec2 r=vec2(1.,1.732), h=r*.5; vec2 a=mod(uv*2.+u_time*.1,r)-h, b=mod(uv*2.-h+u_time*.1,r)-h; vec2 gv=length(a)<length(b)?a:b; float p=sin(u_time*3.5)*.5+.5, e=sin(length(gv)*25.-u_time*3.5); e=smoothstep(-.1,.15,e)-smoothstep(.15,.4,e); float ds=fbm(uv*2.5+vec2(u_time*.15,0.)); vec3 baseC=mix(colTertiary,colGreen,ds), glowC=mix(colSecondary,colPrimary,p); color=mix(baseC*.1,glowC,e*p*1.5); float dt=abs(sin(uv.x*22.+u_time*1.1))*abs(sin(uv.y*22.-u_time*1.3)); color+=glowC*dt*.08; }
            else if (phaseIndex == 12) { float a=atan(uv.y,uv.x), rd=length(uv); a+=.1*fbm(uv*.5+u_time*.05); float sa=a*6.+rd*8.-u_time*2.2, s=smoothstep(-.2,.2,sin(sa)); float rdd=rd+sin(a*10.+u_time*.3)*.08, b=fract(rdd*6.-u_time*.6); b=smoothstep(0.,.1,b)*smoothstep(.8,.5,b); float t=fbm(vec2(rdd*6.,a*3.)+u_time*.15); vec3 dc=mix(colPrimary,colDeepRed,sin(rdd*12.)*.5+.5), bc=mix(colGold,colSecondary,cos(a*4.)*.5+.5); color=mix(dc*.5,bc,b+t*.4); color+=bc*s*.3; }
            else if (phaseIndex == 13) { vec2 cu=uv*mix(3.,5.,phaseProgress); float n=fbm(cu+u_time*.2), c=0.; for(float x=-1.;x<=1.;x+=1.){for(float y=-1.;y<=1.;y+=1.){vec2 nb=vec2(x,y), cc=floor(cu)+nb, pt=cc+.5+sin(u_time*.1+cc)*.3; c+=smoothstep(.4,.38,length(cu-pt));}} c=clamp(c,0.,1.); vec3 cellC=mix(colStrangeGreen,colPrimary,n); cellC=mix(cellC,colDeepRed,smoothstep(.6,.8,n)); color=mix(colBackground*.5,cellC,c*1.2); color+=fbm(uv*15.+u_time*.5)*.05; }
            else if (phaseIndex == 14) { float t=phaseProgress; vec2 bu=floor(originalUV*mix(20.,60.,sin(u_time*2.)*.5+.5))/mix(20.,60.,sin(u_time*2.)*.5+.5); float bn=fbm(bu*5.+u_time*.5); color=mix(colPrimary,colSecondary,bn); float tl=sin(originalUV.y*10.+u_time*5.)*.5+.5, ta=smoothstep(.8,.85,tl); float ofs=ta*(rand(vec2(floor(u_time*2.),floor(originalUV.y*10.)))-.5)*.1; vec2 tu=uv+vec2(ofs*t,0.); float tn=fbm(tu*4.+u_time*.3); color=mix(color,mix(colTertiary,colDeepRed,tn),ta); float cao=(.005+.01*abs(sin(u_time*3.)))*t; vec3 cR=getColorForCA(uv+vec2(cao,0.),u_time), cB=getColorForCA(uv-vec2(cao*.5,cao*.8),u_time); color=vec3(cR.r,color.g,cB.b); color+=(rand(originalUV+fract(u_time*10.))-.5)*.15*t; }
            else if (phaseIndex == 15) { vec2 p=uv*2.; float i=fbm(p+u_time*.3), r=abs(snoise(vec3(p*1.5,u_time*.5))); r=pow(1.-r,4.); vec3 fc=mix(colPrimary,colTertiary,smoothstep(0.,1.,i)); color=mix(colBackground*.4,fc,r*1.5); color*=1.-smoothstep(.8,1.5,length(uv)); }
            else if (phaseIndex == 16) { vec2 p=uv*3.+vec2(u_time*.1,u_time*.2); float d=worley(p), e=1.-smoothstep(0.,.05,d), c=smoothstep(0.,.4,d); vec3 cc=mix(colStrangeGreen,colGold,c*1.2); color=mix(cc*.3,colWhite,e); }
            else if (phaseIndex == 17) { vec2 p=rotate2D(u_time*.4)*uv; float a=atan(p.y,p.x), rd=length(p); float t=fbm(vec2(1./(rd+.1),a*2.)+u_time*.2), r=sin(rd*20.-u_time*3.)*.5+.5; vec3 tc=mix(colSecondary,colPink,smoothstep(0.,1.,t)); color=mix(colBackground,(tc*(smoothstep(0.,.8,t)+r*.5)*.8),1.); } // Removed background mix factor for stronger effect
            else if (phaseIndex == 18) { float s=mix(4.,8.,sin(u_time*.5)*.5+.5), p=truchetPattern(uv,s); vec2 us=uv*s; float bn=noise(floor(us)+u_time*.1); vec3 tc=mix(colPrimary,colTertiary,bn); color=mix(tc*.2,colWhite*.9,p); }
            else if (phaseIndex == 19) { float v=sin(uv.x*3.+u_time*.8)+sin(uv.y*4.-u_time*.5+sin(uv.x*3.+u_time*.8)*.5)+sin(uv.x*uv.y*2.+u_time)+sin(sqrt(pow(uv.x+.5*sin(u_time/5.),2.)+pow(uv.y+.5*cos(u_time/3.),2.))*5.+u_time); v*=.5; vec3 pc1=mix(colDeepRed,colOrange,sin(u_time*.2)*.5+.5), pc2=mix(colPrimary,colSecondary,cos(u_time*.3)*.5+.5); color=mix(pc1,pc2,smoothstep(-.8,.8,v)); }
            else if (phaseIndex == 20) { vec2 gv = abs(fract(uv * (10.0 + 5.0 * sin(u_time * 0.5))) - 0.5);
                 float gridLine = smoothstep(0.02, 0.03, min(gv.x, gv.y));
                 vec3 gridColor = mix(colTertiary, colElectricBlue, sin(u_time * 0.8) * 0.5 + 0.5);
                 color = mix(colBackground, gridColor, gridLine * 1.5);
            }
            else if (phaseIndex == 21) { // Radial noise with color mix
                 float rd = length(uv);
                 float n = fbm(uv * 5.0 + u_time * 0.2);
                 vec3 noiseColor = mix(colPrimary, colSoftPurple, n);
                 color = mix(colBackground, noiseColor, smoothstep(0.0, 1.0, rd * 0.8) * (n * 0.5 + 0.5));
            }
            else if (phaseIndex == 22) { // Circular wave pattern
                 float wave = sin(length(uv) * 20.0 - u_time * 4.0) * 0.5 + 0.5;
                 vec3 waveColor = mix(colSecondary, colLimeGreen, wave);
                 color = mix(colBackground, waveColor, smoothstep(0.0, 0.8, wave));
            }
            else if (phaseIndex == 23) { // Simple horizontal bars
                 float bars = sin(uv.y * 20.0 + u_time * 3.0) * 0.5 + 0.5;
                 vec3 barColor = mix(colPrimary, colTertiary, bars);
                 color = mix(colBackground, barColor, smoothstep(0.3, 0.7, bars));
            }
            else if (phaseIndex == 24) { // Diagonal lines with shift
                 vec2 d_uv = uv;
                 d_uv.x += d_uv.y * 0.5 + u_time * 0.2;
                 float lines = fract(d_uv.x * 8.0) * 2.0 - 1.0;
                 lines = smoothstep(0.9, 1.0, abs(lines));
                 vec3 lineColor = mix(colGold, colOrange, sin(u_time * 0.7) * 0.5 + 0.5);
                 color = mix(colBackground, lineColor, lines);
            }
            else if (phaseIndex == 25) { // ordinary - A simple static gradient for testing
                 // ordinary
                 color = mix(colBackground, colDarkGrey, length(uv) * 0.5);
            }
            else if (phaseIndex == 26) { // Cellular automata effect with color cycling
                 float cellScale = mix(15.0, 30.0, sin(u_time * 0.4) * 0.5 + 0.5);
                 vec2 cu = floor(originalUV * cellScale) / cellScale;
                 float cellState = rand(cu + floor(u_time * 5.0));
                 vec3 cellColor = mix(colPrimary, colTertiary, cellState);
                 color = mix(colBackground * 0.8, cellColor, smoothstep(0.3, 0.7, cellState));
            }
            else if (phaseIndex == 27) { // Swirling noise pattern
                 vec2 p = rotate2D(u_time * 0.5) * uv * (2.0 + 1.0 * cos(u_time * 0.3));
                 float n = snoise(vec3(p, u_time * 0.1));
                 vec3 noiseColor = mix(colDeepRed, colOrange, smoothstep(-0.5, 0.5, n));
                 color = mix(colBackground * 0.7, noiseColor, (n * 0.5 + 0.5) * 1.2);
            }
            else if (phaseIndex == 28) { // Concentric pulsating circles
                 float rd = length(uv);
                 float pulse = sin((rd - u_time * 0.6) * 15.0) * 0.5 + 0.5;
                 pulse = smoothstep(0.8, 1.0, pulse);
                 vec3 circleColor = mix(colWhite, colSkyBlue, sin(u_time * 1.0) * 0.5 + 0.5);
                 color = mix(colBackground, circleColor, pulse);
            }
            else { /* phaseIndex == 29 */ // Plasma-like fbm distortion
                 vec2 pu = uv * 4.0;
                 pu.x += sin(u_time * 0.5 + pu.y * 0.8) * 0.5;
                 pu.y += cos(u_time * 0.6 + pu.x * 0.7) * 0.5;
                 float n = fbm(pu + u_time * 0.3);
                 vec3 plasmaColor = mix(colPrimary, colPink, smoothstep(0.2, 0.8, n));
                 color = mix(colBackground, plasmaColor, n);
            }


            // --- Global Effects ---
            // Subtle Scanlines
            float scanlineVal = sin(originalUV.y * u_resolution.y * 0.8 + u_time * 0.1) * 0.5 + 0.5;
            float scanlineIntensity = 0.03 + 0.015 * sin(u_time * 0.5);
            color = mix(color, color * (1.0 - scanlineIntensity * 0.8), smoothstep(0.3, 0.0, scanlineVal));
            color = mix(color, color * (1.0 + scanlineIntensity * 0.5), smoothstep(0.7, 1.0, scanlineVal));
            // Vignette
            float vignette = smoothstep(1.5, 0.5, length(uv));
            color *= vignette;

            // Final Output (ensure alpha is 1.0)
            outColor = vec4(clamp(color, 0.0, 1.0), 1.0);
        }
    `;

    // --- WebGL Utility Functions ---
    function createShader(type, source) {
        const shader = gl.createShader(type);
        if (!shader) { throw new Error(`Failed to create shader (type: ${type})`); }
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            const shaderType = type === gl.VERTEX_SHADER ? 'Vertex' : 'Fragment';
            const infoLog = gl.getShaderInfoLog(shader);
            console.error(`>>> Shader compile error (${shaderType}):\n${infoLog}`);
            // Log source with line numbers for easier debugging
            const lines = source.split('\n');
            const sourceWithLines = lines.map((line, index) => `${index + 1}: ${line}`).join('\n');
            console.error(`--- Shader Source (${shaderType}) ---\n${sourceWithLines}\n--------------------------`);
            gl.deleteShader(shader);
            throw new Error(`Shader compilation failed: ${shaderType}`);
        }
        return shader;
    }

    function createProgram(vertexShader, fragmentShader) {
        const program = gl.createProgram();
        if (!program) { throw new Error("Failed to create program"); }
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            const infoLog = gl.getProgramInfoLog(program);
            console.error('>>> Program link error:', infoLog);
            // Log info about attached shaders if linking fails
            const shaders = gl.getAttachedShaders(program);
            if (shaders) {
                 shaders.forEach(shader => {
                     const type = gl.getShaderParameter(shader, gl.SHADER_TYPE);
                     const shaderType = type === gl.VERTEX_SHADER ? 'Vertex' : 'Fragment';
                     console.error(`--- Attached ${shaderType} Shader Info Log ---\n${gl.getShaderInfoLog(shader)}`);
                 });
            }
            gl.deleteProgram(program);
            throw new Error("Program linking failed");
        }
        // Detaching shaders after successful linking is good practice
        // but not strictly required by WebGL spec. Can sometimes help resource management.
        gl.detachShader(program, vertexShader);
        gl.detachShader(program, fragmentShader);
        return program;
    }

    // --- WebGL State Variables ---
    let program = null;
    let positionAttributeLocation = -1;
    let timeUniformLocation = null;
    let resolutionUniformLocation = null;
    let positionBuffer = null;
    let animationFrameId = null; // Keep track of animation frame request
    let startTime = performance.now();
    let mouseUniformLocation = null;
    let intensityUniformLocation = null;
    let speedUniformLocation = null;
    let complexityUniformLocation = null;

    // --- Initialize WebGL Program and Buffers ---
    function setupWebGL() {
        let vs = null;
        let fs = null;
        try {
            vs = createShader(gl.VERTEX_SHADER, vertexShaderSource);
            fs = createShader(gl.FRAGMENT_SHADER, fragmentShaderSource);
            program = createProgram(vs, fs);

            // Get attribute/uniform locations (only need to do this once per program)
            positionAttributeLocation = gl.getAttribLocation(program, "a_position");
            timeUniformLocation = gl.getUniformLocation(program, "u_time");
            resolutionUniformLocation = gl.getUniformLocation(program, "u_resolution");
            mouseUniformLocation = gl.getUniformLocation(program, "u_mouse");
            intensityUniformLocation = gl.getUniformLocation(program, "u_intensity");
            speedUniformLocation = gl.getUniformLocation(program, "u_speed");
            complexityUniformLocation = gl.getUniformLocation(program, "u_complexity");

            // Basic check if locations are valid
            if (positionAttributeLocation === -1) console.warn("Attribute 'a_position' not found in shader program.");
            if (!timeUniformLocation) console.warn("Uniform 'u_time' not found in shader program."); // Uniform location is object or null
            if (!resolutionUniformLocation) console.warn("Uniform 'u_resolution' not found in shader program.");

            // Create buffer for the fullscreen quad positions
            positionBuffer = gl.createBuffer();
            if (!positionBuffer) throw new Error("Failed to create position buffer");
            gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
            // Use TRIANGLE_STRIP: (-1,1), (-1,-1), (1,1), (1,-1) covers the screen
            const positions = new Float32Array([-1, 1, -1, -1, 1, 1, 1, -1]);
            gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

            return true; // Indicate successful setup

        } catch (error) {
            console.error(">>> Failed during WebGL setup:", error);
            // Clean up partial resources if error occurred
            if (program) gl.deleteProgram(program);
            if (vs) gl.deleteShader(vs);
            if (fs) gl.deleteShader(fs);
            if (positionBuffer) gl.deleteBuffer(positionBuffer);
            program = null; // Ensure program is null if setup failed
            return false; // Indicate setup failure
        } finally {
            // Delete shaders after program creation (whether successful or not)
            // as they are linked into the program.
            if (vs) gl.deleteShader(vs);
            if (fs) gl.deleteShader(fs);
        }
    }

    // --- Render Loop ---
    function render(now) {
        if (!program) { // If program is null (setup failed or deleted), stop rendering
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
            return;
        }

        // Calculate time elapsed
        let time = (now - startTime) * 0.001; // Time in seconds

        // --- Canvas Resize Check ---
        // More efficient than resize event listener for continuous resizing
        const currentWidth = window.innerWidth;
        const currentHeight = window.innerHeight;
        if (webglCanvas.width !== currentWidth || webglCanvas.height !== currentHeight) {
            webglCanvas.width = currentWidth;
            webglCanvas.height = currentHeight;
            // Update the WebGL viewport to match the new canvas size
            gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
            console.log(`Resized canvas to ${gl.canvas.width}x${gl.canvas.height}`);
        }

        // --- Prepare for Drawing ---
        // Clear might not be necessary if shader draws fullscreen opaque pixels
        // gl.clearColor(0, 0, 0, 0); // Clear to transparent black
        // gl.clear(gl.COLOR_BUFFER_BIT);

        // Select the program to use
        gl.useProgram(program);

        // --- Set up Vertex Attributes ---
        if (positionAttributeLocation !== -1 && positionBuffer) {
            gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer); // Bind the position buffer
            gl.enableVertexAttribArray(positionAttributeLocation);
            // Tell the attribute how to get data out of positionBuffer (ARRAY_BUFFER)
            gl.vertexAttribPointer(
                positionAttributeLocation, // location
                2,           // size (num components per iteration, vec2)
                gl.FLOAT,    // type
                false,       // normalize
                0,           // stride (0 = use size * sizeof(type))
                0            // offset (bytes from start of buffer)
            );
        } else {
            // Disable attribute if not used or buffer missing, prevents potential errors
            if (positionAttributeLocation !== -1) gl.disableVertexAttribArray(positionAttributeLocation);
        }

        // --- Set Uniforms ---
        if (timeUniformLocation) {
           gl.uniform1f(timeUniformLocation, time);
        }
        if (resolutionUniformLocation) {
           gl.uniform2f(resolutionUniformLocation, gl.canvas.width, gl.canvas.height);
        }
        // --- Set new uniforms for the first 8 phases ---
        if (mouseUniformLocation) {
           // Use mouse position from window if available
           let mx = 0.5, my = 0.5;
           if (window.shaderMouse) {
               mx = window.shaderMouse.x;
               my = window.shaderMouse.y;
           }
           gl.uniform2f(mouseUniformLocation, mx, my);
        }
        if (intensityUniformLocation) {
           let intensity = 1.0;
           if (window.shaderIntensity !== undefined) intensity = window.shaderIntensity;
           gl.uniform1f(intensityUniformLocation, intensity);
        }
        if (speedUniformLocation) {
           let speed = 1.0;
           if (window.shaderSpeed !== undefined) speed = window.shaderSpeed;
           gl.uniform1f(speedUniformLocation, speed);
        }
        if (complexityUniformLocation) {
           let complexity = 5;
           if (window.shaderComplexity !== undefined) complexity = window.shaderComplexity;
           gl.uniform1i(complexityUniformLocation, complexity);
        }

        // --- Draw the Quad ---
        // Draw 4 vertices using the bound buffer and TRIANGLE_STRIP mode
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        // --- Request Next Frame ---
        animationFrameId = requestAnimationFrame(render);
    }

    // --- Function to Update Shader Dynamically ---
    // Expose this function to the global scope so it can be called from index.html
    window.updateShader = function(newShaderCode) {
        if (!gl) {
            console.warn("WebGL context not available. Cannot update shader.");
            if(typeof showNotification === 'function') showNotification("WebGL inactive. Cannot update shader.");
            return;
        }
        console.log("Attempting shader update with new code...");

        // Basic validation
        if (!newShaderCode || typeof newShaderCode !== 'string' || newShaderCode.indexOf('main()') === -1) {
             console.error("Invalid shader code provided: Missing main() function or not a string.");
             if(typeof showNotification === 'function') showNotification("Invalid shader code: Missing main().");
             console.error("Provided code:\n", newShaderCode);
             return;
        }

        // Construct the full source for the new fragment shader, including essential parts
          const completeNewFragmentSource = `#version 300 es
             precision highp float;
             uniform float u_time;
             uniform vec2 u_resolution;
             out vec4 outColor;

             // --- Include Common Helper Functions ---
             const int FBM_OCTAVES = ${FBM_OCTAVES}; // Use the JS constant
             float hash(float n) { return fract(sin(n) * 43758.5453); }
             float noise(vec2 p) { vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);float n=i.x+i.y*57.;return mix(mix(hash(n),hash(n+1.),f.x),mix(hash(n+57.),hash(n+58.),f.x),f.y); }
             float fbm(vec2 p) { float s=0.,a=.7,f=1.;for(int i=0;i<FBM_OCTAVES;i++){s+=noise(p*f)*a;a*=.5;f*=2.;}return s;}
             float rand(vec2 co){ return fract(sin(dot(co.xy,vec2(12.9898,78.233)))*43758.5453); }
             // --- END Helper Functions ---

             // --- Common Colors ---
             vec3 colPrimary = vec3(106./255., 0., 1.);
             vec3 colSecondary = vec3(0., 1., 204./255.);
             vec3 colTertiary = vec3(0., 184./255., 212./255.);
             vec3 colBackground = vec3(5./255., 5./255., 17./255.);
             // Add other colors needed if the user code might use them
             vec3 colGreen = vec3(0.1, 0.8, 0.4);
             vec3 colGold = vec3(0.9, 0.7, 0.1);
             vec3 colStrangeGreen = vec3(0.1, 0.4, 0.2);
             vec3 colDeepRed = vec3(0.6, 0.0, 0.15);
             vec3 colWhite = vec3(1.0);
             vec3 colOrange = vec3(1.0, 0.5, 0.0);
             vec3 colPink = vec3(1.0, 0.4, 0.7);
             vec3 colSkyBlue = vec3(0.5, 0.7, 1.0);
             vec3 colLimeGreen = vec3(0.7, 1.0, 0.0);
             vec3 colDarkGrey = vec3(0.2, 0.2, 0.2);
             vec3 colElectricBlue = vec3(0.2, 0.6, 1.0);
             vec3 colSoftPurple = vec3(0.6, 0.4, 0.8);
             // --- END Colors ---

             // --- User Provided Shader Code ---
             ${newShaderCode}
             // --- End User Code ---
         `;

        let newVs = null;
        let newFs = null;
        let newProgram = null;
        try {
             // Recompile the vertex shader (it's simple, but good practice)
             newVs = createShader(gl.VERTEX_SHADER, vertexShaderSource);
             // Compile the new fragment shader
             newFs = createShader(gl.FRAGMENT_SHADER, completeNewFragmentSource);
             // Link the new program
             newProgram = createProgram(newVs, newFs);

             // --- Success! Switch to the new program ---
             console.log("New shader compiled and linked successfully.");

             // Stop the old animation loop before changing the program
             if (animationFrameId) {
                 cancelAnimationFrame(animationFrameId);
                 animationFrameId = null;
             }

             // Delete the old program *before* assigning the new one
             if (program) {
                 gl.deleteProgram(program);
                 console.log("Old program deleted.");
             }
             program = newProgram; // Assign the new program

             // Re-get all attribute and uniform locations for the *new* program
             positionAttributeLocation = gl.getAttribLocation(program, "a_position");
             timeUniformLocation = gl.getUniformLocation(program, "u_time");
             resolutionUniformLocation = gl.getUniformLocation(program, "u_resolution");

             // Optional: Check new locations for debugging
             if (positionAttributeLocation === -1) console.warn("New program missing 'a_position' attribute.");
             if (!timeUniformLocation) console.warn("New program missing 'u_time' uniform.");
             if (!resolutionUniformLocation) console.warn("New program missing 'u_resolution' uniform.");

             // Restart the render loop with the new program
             startTime = performance.now(); // Optionally reset start time
             animationFrameId = requestAnimationFrame(render);

             console.log("Shader update complete. Render loop restarted.");
              if(typeof showNotification === 'function') showNotification("SHADER UPDATE SUCCESSFUL.");

        } catch (e) {
             console.error('>>> Shader update failed during compile/link:', e);
             // Clean up partially created resources from the failed update attempt
             if (newProgram) gl.deleteProgram(newProgram); // Should be null if link failed, but check anyway
             if (newVs) gl.deleteShader(newVs);
             if (newFs) gl.deleteShader(newFs);
             // Do NOT delete the old 'program' if the update failed, keep it running
             if(typeof showNotification === 'function') showNotification(`SHADER UPDATE FAILED: ${e.message}`);

             // If the render loop was stopped, restart it with the old program
             if (!animationFrameId && program) {
                 console.log("Restarting render loop with previous program after update failure.");
                 animationFrameId = requestAnimationFrame(render);
             }

        } finally {
             // Delete the new shaders regardless of success, as they are now linked (or failed)
             if (newVs) gl.deleteShader(newVs);
             if (newFs) gl.deleteShader(newFs);
        }
    }; // End window.updateShader

    // --- Start WebGL ---
    if (setupWebGL()) {
        // Start the rendering loop only if setup was successful
        console.log("WebGL setup successful. Starting render loop.");
        animationFrameId = requestAnimationFrame(render);
    } else {
        console.error("WebGL setup failed. Render loop will not start.");
        // Ensure static background as fallback
        if(document.body) document.body.style.backgroundColor = '#050511';
    }

    // --- Resize Listener ---
    // Handles canvas buffer resizing via check in render loop, but good to have listener too.
    window.addEventListener('resize', () => {
        // The actual resizing logic is handled within the render loop check
        // This listener ensures responsiveness if the loop somehow stops temporarily
        // and helps trigger the check on resize events.
        if (!animationFrameId && program) {
            // If the loop isn't running but we have a program, request a frame
            // This might happen if the tab was hidden and the loop stopped
            console.log("Resize event: Requesting animation frame.");
            animationFrameId = requestAnimationFrame(render);
        }
    }, false); // Use passive: true? Might improve scroll perf slightly if listener is heavy.

})(); // Execute the IIFE

// ---
// PHASE SYSTEM UPDATE (June 2025):
// The first 8 phases (0-7) are now advanced GLSL shaders from the Holographic Theory showcase.
// These use extra uniforms: u_mouse, u_intensity, u_speed, u_complexity.
// To control these, set window.shaderMouse, window.shaderIntensity, window.shaderSpeed, window.shaderComplexity in JS.
// All previous phases are shifted up by 8 (old phase 0 is now phase 8, etc.).
// To add more phases, increment TOTAL_PHASES_F and add a new phaseIndex block.
// ---
