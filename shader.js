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
             webglCanvas.getContext('experimental-webgl');

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

    // Fragment Shader (GLSL 3.00 ES - 50 Phases)
    // Expanded with 20 additional horrifying phases (30-49)
    const fragmentShaderSource = `#version 300 es
        precision highp float; // Precision qualifier required in fragment shaders

        // Uniforms: Inputs from JavaScript
        uniform float u_time;
        uniform vec2 u_resolution;

        // Output variable: Replaces gl_FragColor
        out vec4 outColor;

        // --- Constants ---
        const float PI = 3.14159265359;
        const float TWO_PI = 6.28318530718;
        const int FBM_OCTAVES = 5; // Used in fbm() and updateShader()
        const int MAX_RAYMARCH_STEPS = 48;
        const float MAX_RAYMARCH_DIST = 12.0;
        const int MANDELBROT_ITER = 40;
        const float TOTAL_PHASES_F = 50.0; // <<< UPDATED TO 50 PHASES

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
        float sdBox(vec3 p, vec3 b) { vec3 q = abs(p) - b; return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0); }
        float sdTorus(vec3 p, vec2 t) { vec2 q = vec2(length(p.xz)-t.x,p.y); return length(q)-t.y; }
        float sdCylinder(vec3 p, float h, float r) { vec2 d = abs(vec2(length(p.xz),p.y)) - vec2(r,h); return min(max(d.x,d.y),0.0) + length(max(d,0.0)); }
        float sdOctahedron(vec3 p, float s) { p = abs(p); return (p.x+p.y+p.z-s)*0.57735027; }
        float smin(float a, float b, float k) { float h = clamp(0.5+0.5*(b-a)/k, 0.0, 1.0); return mix(b, a, h) - k*h*(1.0-h); }
        float smax(float a, float b, float k) { return -smin(-a, -b, k); }
        vec3 opRep(vec3 p, vec3 c) { return mod(p+0.5*c,c)-0.5*c; }
        vec3 opTwist(vec3 p) { float c = cos(20.0*p.y); float s = sin(20.0*p.y); mat2 m = mat2(c,-s,s,c); vec3 q = vec3(m*p.xz,p.y); return q; }
        float displacement(vec3 p) { return sin(20.0*p.x)*sin(20.0*p.y)*sin(20.0*p.z); }
        float opDisplace(vec3 p) { float d1 = sdSphere(p, 1.0); float d2 = displacement(p); return d1+d2; }

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
        vec3 colBlood = vec3(0.8, 0.0, 0.0); // Blood Red
        vec3 colCorruption = vec3(0.3, 0.1, 0.4); // Dark Purple
        vec3 colToxic = vec3(0.4, 0.8, 0.1); // Toxic Green
        vec3 colVoid = vec3(0.05, 0.05, 0.1); // Deep Void
        vec3 colFlesh = vec3(0.9, 0.6, 0.5); // Flesh Tone
        vec3 colBone = vec3(0.9, 0.9, 0.8); // Bone White
        vec3 colRust = vec3(0.6, 0.3, 0.1); // Rust Brown
        vec3 colAcid = vec3(0.9, 1.0, 0.2); // Acid Yellow
        vec3 colShadow = vec3(0.1, 0.1, 0.15); // Shadow Blue
        vec3 colEmber = vec3(1.0, 0.3, 0.0); // Ember Orange
        vec3 colIce = vec3(0.7, 0.9, 1.0); // Ice Blue

        vec3 colBackground = vec3(5./255., 5./255., 17./255.); // Dark Background

        // Basic color getter for CA effect
        vec3 getColorForCA(vec2 uv, float t) { float n = fbm(uv*4. + t*.15); return mix(colPrimary, colTertiary, n); }

        // Advanced noise functions for horrifying effects
        float ridgedNoise(vec2 p) { return 1.0 - abs(snoise(p)); }
        float turbulence(vec2 p) { float t = 0.0; float f = 1.0; for(int i = 0; i < 4; i++) { t += abs(snoise(p * f)) / f; f *= 2.0; } return t; }
        float voronoi(vec2 p) { vec2 n = floor(p); vec2 f = fract(p); float md = 8.0; for(int j = -1; j <= 1; j++) { for(int i = -1; i <= 1; i++) { vec2 g = vec2(float(i), float(j)); vec2 o = rand(n + g) * vec2(1.0); vec2 r = g + o - f; float d = dot(r, r); md = min(md, d); } } return sqrt(md); }
        float marble(vec2 p) { return sin(p.x + 3.0 * turbulence(p)); }
        float wood(vec2 p) { return sin(20.0 * length(p) + 10.0 * turbulence(p)); }
        
        // Distortion functions
        vec2 distort(vec2 p, float strength) { return p + strength * vec2(snoise(p * 3.0), snoise(p * 3.0 + 100.0)); }
        vec2 swirl(vec2 p, float strength) { float angle = strength * length(p); float c = cos(angle); float s = sin(angle); return mat2(c, -s, s, c) * p; }
        vec2 kaleidoscope(vec2 p, float n) { float angle = atan(p.y, p.x); float radius = length(p); angle = mod(angle, TWO_PI / n); if(mod(floor(angle / (TWO_PI / n)), 2.0) == 1.0) angle = TWO_PI / n - angle; return radius * vec2(cos(angle), sin(angle)); }

        // Complex SDF combinations for horrifying geometry
        float horrorGeometry1(vec3 p) {
            float sphere = sdSphere(p, 0.8);
            float box = sdBox(p, vec3(0.6));
            float torus = sdTorus(p.xzy, vec2(0.5, 0.2));
            return smin(smin(sphere, box, 0.3), torus, 0.2);
        }
        
        float horrorGeometry2(vec3 p) {
            vec3 q = opRep(p, vec3(2.0));
            float oct = sdOctahedron(q, 0.5);
            float cyl = sdCylinder(q, 0.3, 0.2);
            return smax(oct, -cyl, 0.1);
        }
        
        float tentacle(vec3 p, float thickness) {
            vec3 q = p;
            q.x += 0.3 * sin(q.z * 2.0 + u_time);
            q.y += 0.2 * cos(q.z * 3.0 + u_time * 0.7);
            return sdCylinder(q, 2.0, thickness) - 0.1 * sin(q.z * 10.0 + u_time * 2.0);
        }
        
        float organicMass(vec3 p) {
            float base = sdSphere(p, 1.0);
            float bumps = 0.0;
            for(int i = 0; i < 5; i++) {
                vec3 offset = vec3(sin(float(i) * 2.3), cos(float(i) * 1.7), sin(float(i) * 3.1)) * 0.5;
                bumps += 0.2 * sdSphere(p - offset, 0.3) / (float(i) + 1.0);
            }
            return smin(base, bumps, 0.3);
        }

        // --- Main Shader Logic ---
        void main() {
            // Normalized device coordinates, aspect corrected, origin center
            vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / min(u_resolution.y, u_resolution.x);
            // Original UV coordinates (0 to 1)
            vec2 originalUV = gl_FragCoord.xy / u_resolution.xy;

            float time_warp = u_time * 0.1; // Controls phase speed
            float phase = mod(time_warp, TOTAL_PHASES_F);
            float phaseProgress = fract(phase); // Progress within current phase
            int phaseIndex = int(floor(phase)); // Current phase index (0-49)

            vec3 color = colBackground; // Start with background

            // --- Phase Implementations (Original 0-29) ---
            if (phaseIndex == 0) { float wf=.1+.05*sin(u_time*.2); wf=max(.001,wf); float z=.1/max(.01,.1-uv.y*wf+.02*fbm(uv+u_time*.05)); z=clamp(z,.1,15.); vec2 warp=uv*z; vec2 grid=abs(fract(warp*vec2(5.,3.)+u_time*.1)-.5); float line=smoothstep(.04,.05,min(grid.x,grid.y))*.6; float df=fract(z*.1+u_time*.15); vec3 bc=mix(mix(colPrimary,colTertiary,sin(u_time*.1)*.5+.5),colSecondary,sin(length(warp)*.5-u_time*.5)*.5+.5); color=mix(bc*.15,bc,line*df*1.5); }
            else if (phaseIndex == 1) { float d=length(uv); float r=sin(d*18.-u_time*2.5)*.5+.5; r*=smoothstep(1.8,.4,d); float w=sin(uv.y*25.+u_time*1.2)*.04; vec2 wu=uv+vec2(w,sin(uv.x*15.+u_time*.8)*.03); float n=fbm(wu*3.5+u_time*.25); vec3 bc=mix(mix(colSecondary,colTertiary,r),mix(colGreen,colGold,n),.5+.5*sin(u_time*.6+d*2.)); color=mix(bc*.2,bc,r*.8+n*.6); }
            else if (phaseIndex == 2) { vec2 r=vec2(1.,1.732), h=r*.5; vec2 a=mod(uv*2.+u_time*.1,r)-h, b=mod(uv*2.-h+u_time*.1,r)-h; vec2 gv=length(a)<length(b)?a:b; float p=sin(u_time*3.5)*.5+.5, e=sin(length(gv)*25.-u_time*3.5); e=smoothstep(-.1,.15,e)-smoothstep(.15,.4,e); float ds=fbm(uv*2.5+vec2(u_time*.15,0.)); vec3 baseC=mix(colTertiary,colGreen,ds), glowC=mix(colSecondary,colPrimary,p); color=mix(baseC*.1,glowC,e*p*1.5); float dt=abs(sin(uv.x*22.+u_time*1.1))*abs(sin(uv.y*22.-u_time*1.3)); color+=glowC*dt*.08; }
            else if (phaseIndex == 3) { float a=atan(uv.y,uv.x), rd=length(uv); a+=.1*fbm(uv*.5+u_time*.05); float sa=a*6.+rd*8.-u_time*2.2, s=smoothstep(-.2,.2,sin(sa)); float rdd=rd+sin(a*10.+u_time*.3)*.08, b=fract(rdd*6.-u_time*.6); b=smoothstep(0.,.1,b)*smoothstep(.8,.5,b); float t=fbm(vec2(rdd*6.,a*3.)+u_time*.15); vec3 dc=mix(colPrimary,colDeepRed,sin(rdd*12.)*.5+.5), bc=mix(colGold,colSecondary,cos(a*4.)*.5+.5); color=mix(dc*.5,bc,b+t*.4); color+=bc*s*.3; }
            else if (phaseIndex == 4) { vec2 cu=uv*mix(3.,5.,phaseProgress); float n=fbm(cu+u_time*.2), c=0.; for(float x=-1.;x<=1.;x+=1.){for(float y=-1.;y<=1.;y+=1.){vec2 nb=vec2(x,y), cc=floor(cu)+nb, pt=cc+.5+sin(u_time*.1+cc)*.3; c+=smoothstep(.4,.38,length(cu-pt));}} c=clamp(c,0.,1.); vec3 cellC=mix(colStrangeGreen,colPrimary,n); cellC=mix(cellC,colDeepRed,smoothstep(.6,.8,n)); color=mix(colBackground*.5,cellC,c*1.2); color+=fbm(uv*15.+u_time*.5)*.05; }
            else if (phaseIndex == 5) { float t=phaseProgress; vec2 bu=floor(originalUV*mix(20.,60.,sin(u_time*2.)*.5+.5))/mix(20.,60.,sin(u_time*2.)*.5+.5); float bn=fbm(bu*5.+u_time*.5); color=mix(colPrimary,colSecondary,bn); float tl=sin(originalUV.y*10.+u_time*5.)*.5+.5, ta=smoothstep(.8,.85,tl); float ofs=ta*(rand(vec2(floor(u_time*2.),floor(originalUV.y*10.)))-.5)*.1; vec2 tu=uv+vec2(ofs*t,0.); float tn=fbm(tu*4.+u_time*.3); color=mix(color,mix(colTertiary,colDeepRed,tn),ta); float cao=(.005+.01*abs(sin(u_time*3.)))*t; vec3 cR=getColorForCA(uv+vec2(cao,0.),u_time), cB=getColorForCA(uv-vec2(cao*.5,cao*.8),u_time); color=vec3(cR.r,color.g,cB.b); color+=(rand(originalUV+fract(u_time*10.))-.5)*.15*t; }
            else if (phaseIndex == 6) { vec2 p=uv*2.; float i=fbm(p+u_time*.3), r=abs(snoise(vec3(p*1.5,u_time*.5))); r=pow(1.-r,4.); vec3 fc=mix(colPrimary,colTertiary,smoothstep(0.,1.,i)); color=mix(colBackground*.4,fc,r*1.5); color*=1.-smoothstep(.8,1.5,length(uv)); }
            else if (phaseIndex == 7) { vec2 p=uv*3.+vec2(u_time*.1,u_time*.2); float d=worley(p), e=1.-smoothstep(0.,.05,d), c=smoothstep(0.,.4,d); vec3 cc=mix(colStrangeGreen,colGold,c*1.2); color=mix(cc*.3,colWhite,e); }
            else if (phaseIndex == 8) { vec2 p=rotate2D(u_time*.4)*uv; float a=atan(p.y,p.x), rd=length(p); float t=fbm(vec2(1./(rd+.1),a*2.)+u_time*.2), r=sin(rd*20.-u_time*3.)*.5+.5; vec3 tc=mix(colSecondary,colPink,smoothstep(0.,1.,t)); color=mix(colBackground,(tc*(smoothstep(0.,.8,t)+r*.5)*.8),1.); }
            else if (phaseIndex == 9) { float s=mix(4.,8.,sin(u_time*.5)*.5+.5), p=truchetPattern(uv,s); vec2 us=uv*s; float bn=noise(floor(us)+u_time*.1); vec3 tc=mix(colPrimary,colTertiary,bn); color=mix(tc*.2,colWhite*.9,p); }
            else if (phaseIndex == 10) { float v=sin(uv.x*3.+u_time*.8)+sin(uv.y*4.-u_time*.5+sin(uv.x*3.+u_time*.8)*.5)+sin(uv.x*uv.y*2.+u_time)+sin(sqrt(pow(uv.x+.5*sin(u_time/5.),2.)+pow(uv.y+.5*cos(u_time/3.),2.))*5.+u_time); v*=.5; vec3 pc1=mix(colDeepRed,colOrange,sin(u_time*.2)*.5+.5), pc2=mix(colPrimary,colSecondary,cos(u_time*.3)*.5+.5); color=mix(pc1,pc2,smoothstep(-.8,.8,v)); }
            else if (phaseIndex == 11) { vec2 gu=originalUV*vec2(80.,60.), c=floor(gu); float sp=rand(c.x)*3.+1., ss=rand(c.x)*10., sps=fract(ss-u_time*sp*.1), cy=originalUV.y; float tl=.15+rand(c.x)*.1, ci=smoothstep(sps,sps+.01,cy)*(1.-smoothstep(sps+.01,sps+tl,cy)); float cv=rand(c+floor((ss-u_time*sp*.1)*10.)); vec3 rc=mix(colStrangeGreen*.5,colGreen*1.5,step(.5,cv)); color=mix(colBackground,rc,ci); }
            else if (phaseIndex == 12) { float z=.5+pow(mod(u_time*.05,5.)+1.,2.); vec2 c=uv*1.5/z-vec2(.7,0.), zz=vec2(0.); int it=0; for(int i=0;i<MANDELBROT_ITER;i++){zz=vec2(zz.x*zz.x-zz.y*zz.y,2.*zz.x*zz.y)+c; if(dot(zz,zz)>4.)break; it++;} float m=clamp(float(it)/float(MANDELBROT_ITER),0.,1.); m=pow(m,.5); color=mix(colBackground,mix(colPrimary,colGold,m),smoothstep(0.,.1,m)); if(it==MANDELBROT_ITER)color=colBackground*.5; }
            else if (phaseIndex == 13) { vec2 d=vec2(snoise(vec3(uv*2.,u_time*.3)),snoise(vec3(uv*2.+10.,u_time*.35)))*.15, du=uv+d; vec2 g=abs(fract(du*6.)-.5); float l=smoothstep(.03,.04,min(g.x,g.y)); float n=fbm(du*3.+u_time*.1); vec3 gc=mix(colTertiary,colPink,n); color=mix(colBackground*.5,gc,l*1.2); }
            else if (phaseIndex == 14) { float h=snoise(vec3(uv*1.5,u_time*.2)), f=snoise(vec3(uv*3.+h*.3,u_time*.4)); float la=.785, l=clamp(.5+h*.5*cos(atan(uv.y,uv.x)-la),.2,1.); vec3 tc=mix(colGreen*.8,colGold*.6,h*.5+.5), wc=mix(colPrimary*.7,colTertiary*.9,f*.5+.5); color=mix(wc,tc*l,smoothstep(-.1,.1,h))*.8; }
            else if (phaseIndex == 15) { vec2 p=abs(uv)*.8; float s=1.5+.5*sin(u_time*.4); for(int i=0;i<4;i++){ p=abs(p*s-1.); if(dot(p,p)>20.)break; } float r=sin(length(p)*.2*10.+u_time); color=mix(colSecondary,colPrimary,smoothstep(-.5,.5,r)); }
            else if (phaseIndex == 16) { vec2 p=uv*2.5; float d1=worley(p), d2=worley(p+vec2(5.2,1.3)); float c=pow(1.-smoothstep(0.,.1,d1),2.)+pow(1.-smoothstep(0.,.05,d2),2.)*.5; c=clamp(c,0.,1.); float g=fbm(p*10.+u_time*.1); vec3 cc=mix(colWhite*.8,colTertiary,g); color=mix(colBackground*.8,cc,c); }
            else if (phaseIndex == 17) { float i=.5+.5*noise(vec2(u_time*1.5,originalUV.y*5.)); float fs=floor(u_time*15.)+floor(originalUV.y*10.), f=rand(fs); i*=smoothstep(.2,.8,f); vec3 bc=mix(colPrimary,colSecondary,noise(uv*3.+u_time*.2)); float sy=fract(originalUV.y*u_resolution.y*.5), se=smoothstep(.4,.5,sy)*(1.-smoothstep(.5,.6,sy)); color=mix(bc*.5,vec3(0.),se*i*1.5); color+=(rand(originalUV+u_time)-.5)*.1*i; }
            else if (phaseIndex == 18) { vec3 ro=vec3(0.,0.,-3.+sin(u_time*.3)), rd=normalize(vec3(uv,1.)); vec3 col=colBackground; float t=0.; for(int i=0;i<MAX_RAYMARCH_STEPS;i++){ vec3 p=ro+rd*t, sc=vec3(0.,sin(u_time*.8)*.5-.2,0.); float ds=sdSphere(p-sc,.5), dp=sdPlane(p,vec3(0.,1.,0.),1.); float d=min(ds,dp); if(d<.001*t){ vec3 hc, n; if(dp<ds){hc=colGreen*.8;n=vec3(0.,1.,0.);}else{hc=colPrimary;vec2 eps=vec2(.001,0.);n=normalize(vec3(sdSphere(p+eps.xyy-sc,.5)-sdSphere(p-eps.xyy-sc,.5),sdSphere(p+eps.yxy-sc,.5)-sdSphere(p-eps.yxy-sc,.5),sdSphere(p+eps.yyx-sc,.5)-sdSphere(p-eps.yyx-sc,.5)));} float l=max(.2,dot(n,normalize(vec3(-.7,.7,-.5)))); col=hc*l; break; } t+=d; if(t>MAX_RAYMARCH_DIST)break; } color=col; }
            else if (phaseIndex == 19) { float rd=length(uv), s=0.; for(float i=0.;i<15.;i++){ float seed=i*13.37, st=u_time*(.5+rand(seed))*1.5+rand(seed+1.)*10., sd=fract(st)*3., sa=rand(seed+2.)*TWO_PI+u_time*rand(seed+3.)*.05; vec2 sp=vec2(cos(sa),sin(sa))*sd; float ds=length(uv-sp), sl=.02+sd*.1, si=smoothstep(sl,0.,ds)*(1.-smoothstep(1.,1.5,sd)); s+=si; } vec3 sc=mix(colWhite,colSecondary,clamp(rd*.5,0.,1.)); color=mix(colBackground,sc,clamp(s,0.,1.)); }
            else if (phaseIndex == 20) { vec2 gv = abs(fract(uv * (10.0 + 5.0 * sin(u_time * 0.5))) - 0.5); float gridLine = smoothstep(0.02, 0.03, min(gv.x, gv.y)); vec3 gridColor = mix(colTertiary, colPrimary, sin(u_time * 2.0) * 0.5 + 0.5); color = mix(colBackground * 0.3, gridColor, gridLine * (0.8 + 0.2 * sin(u_time * 3.0))); }
            else if (phaseIndex == 21) { float angle = atan(uv.y, uv.x); float radius = length(uv); float spiral = sin(radius * 15.0 - angle * 8.0 + u_time * 4.0); spiral = smoothstep(-0.1, 0.1, spiral); vec3 spiralColor = mix(colDeepRed, colGold, radius); color = mix(colBackground * 0.2, spiralColor, spiral); }
            else if (phaseIndex == 22) { vec2 p = uv * 8.0; float n1 = fbm(p + u_time * 0.3); float n2 = fbm(p * 2.0 - u_time * 0.2); float pattern = sin(n1 * 10.0) * cos(n2 * 8.0); pattern = smoothstep(-0.3, 0.3, pattern); vec3 patternColor = mix(colStrangeGreen, colWhite, pattern); color = mix(colBackground * 0.4, patternColor, pattern * 0.9); }
            else if (phaseIndex == 23) { vec2 center = vec2(0.0); float dist = length(uv - center); float ripple = sin(dist * 20.0 - u_time * 6.0) * exp(-dist * 2.0); ripple = smoothstep(-0.2, 0.2, ripple); vec3 rippleColor = mix(colSecondary, colTertiary, ripple); color = mix(colBackground * 0.5, rippleColor, abs(ripple)); }
            else if (phaseIndex == 24) { vec2 p = uv * 6.0; float maze = step(0.5, fract(p.x)) * step(0.5, fract(p.y)); maze += step(0.5, fract(p.x + 0.5)) * step(0.5, fract(p.y + 0.5)); maze = mod(maze, 2.0); vec3 mazeColor = mix(colDarkGrey, colElectricBlue, maze); color = mix(colBackground * 0.6, mazeColor, maze); }
            else if (phaseIndex == 25) { float time = u_time * 0.8; vec2 p = uv + vec2(sin(time), cos(time * 0.7)) * 0.3; float crystal = abs(sin(p.x * 12.0)) * abs(cos(p.y * 12.0)); crystal = pow(crystal, 0.3); vec3 crystalColor = mix(colSoftPurple, colWhite, crystal); color = mix(colBackground * 0.3, crystalColor, crystal); }
            else if (phaseIndex == 26) { vec2 p = uv * 4.0; float web = 0.0; for(int i = 0; i < 6; i++) { float angle = float(i) * PI / 3.0; vec2 dir = vec2(cos(angle), sin(angle)); float line = abs(dot(p, dir)); web += smoothstep(0.05, 0.02, line); } vec3 webColor = mix(colBackground, colWhite, web); color = webColor; }
            else if (phaseIndex == 27) { vec2 p = uv * 3.0 + u_time * 0.1; float smoke = fbm(p) * fbm(p * 2.0 + 100.0); smoke = pow(smoke, 1.5); vec3 smokeColor = mix(colDarkGrey, colWhite, smoke); color = mix(colBackground * 0.8, smokeColor, smoke * 0.7); }
            else if (phaseIndex == 28) { float time = u_time * 2.0; vec2 p = uv * 5.0; float lightning = 0.0; lightning += smoothstep(0.98, 1.0, sin(p.x * 20.0 + time)) * smoothstep(0.95, 1.0, cos(p.y * 15.0 - time)); lightning += smoothstep(0.97, 1.0, sin(p.y * 25.0 + time * 1.3)) * smoothstep(0.94, 1.0, cos(p.x * 18.0 - time * 0.8)); vec3 lightningColor = mix(colElectricBlue, colWhite, lightning); color = mix(colBackground * 0.1, lightningColor, lightning); }
            else if (phaseIndex == 29) { vec2 p = uv * 2.0; float vortex = atan(p.y, p.x) + length(p) * 3.0 - u_time * 2.0; vortex = sin(vortex * 8.0) * 0.5 + 0.5; vortex *= smoothstep(1.5, 0.0, length(p)); vec3 vortexColor = mix(colPrimary, colSecondary, vortex); color = mix(colBackground * 0.2, vortexColor, vortex); }

            // --- NEW HORRIFYING PHASES (30-49) ---


            // Phase 30: Corrupted Static - Flickering distorted static with tears revealing disturbing patterns
            else if (phaseIndex == 30) {
                vec2 staticUV = uv * 50.0;
                float staticBase = rand(floor(staticUV) + floor(u_time * 10.0));
                float staticDetail = rand(floor(staticUV * 3.0) + floor(u_time * 30.0));
                float staticFine = rand(floor(staticUV * 8.0) + floor(u_time * 60.0));
                
                float staticNoise = staticBase * 0.6 + staticDetail * 0.3 + staticFine * 0.1;
                float flickerIntensity = sin(u_time * 15.0 + staticNoise * 10.0) * 0.5 + 0.5;
                flickerIntensity *= sin(u_time * 7.3 + length(uv) * 5.0) * 0.5 + 0.5;
                
                float tearThreshold = 0.7 + 0.2 * sin(u_time * 3.0);
                float tearMask = step(tearThreshold, staticNoise + 0.3 * fbm(uv * 8.0 + u_time * 0.5));
                
                vec2 distortedUV = uv + vec2(
                    0.1 * sin(uv.y * 20.0 + u_time * 8.0) * flickerIntensity,
                    0.05 * cos(uv.x * 15.0 + u_time * 12.0) * flickerIntensity
                );
                
                float underPattern = sin(distortedUV.x * 30.0 + u_time * 5.0) * cos(distortedUV.y * 25.0 - u_time * 3.0);
                underPattern = smoothstep(-0.3, 0.3, underPattern);
                
                vec3 staticColor = mix(colVoid, colCorruption, staticNoise);
                staticColor = mix(staticColor, colToxic * 0.3, staticDetail);
                
                vec3 tearColor = mix(colBlood, colEmber, underPattern);
                tearColor += colAcid * 0.5 * sin(u_time * 20.0 + length(distortedUV) * 10.0);
                
                float chromaticOffset = 0.02 * flickerIntensity;
                vec3 chromaticR = mix(staticColor, tearColor, tearMask);
                vec3 chromaticG = mix(staticColor, tearColor, step(tearThreshold - 0.1, staticNoise));
                vec3 chromaticB = mix(staticColor, tearColor, step(tearThreshold + 0.1, staticNoise));
                
                color = vec3(chromaticR.r, chromaticG.g, chromaticB.b);
                color *= flickerIntensity * 0.7 + 0.3;
                color += (rand(originalUV + u_time * 100.0) - 0.5) * 0.2 * flickerIntensity;
            }
            
            // Phase 31: Bio-Luminescent Veins - Pulsating organic veins with eerie glow
            else if (phaseIndex == 31) {
                vec2 veinUV = uv * 3.0 + vec2(sin(u_time * 0.3), cos(u_time * 0.4)) * 0.5;
                float veinPattern = worley(veinUV);
                float veinMask = 1.0 - smoothstep(0.0, 0.3, veinPattern);
                
                float pulse = sin(u_time * 2.0 + veinPattern * 10.0) * 0.5 + 0.5;
                pulse *= sin(u_time * 1.7 + length(veinUV) * 3.0) * 0.3 + 0.7;
                
                float veinThickness = 0.1 + 0.05 * sin(u_time * 1.5 + veinPattern * 15.0);
                veinMask = smoothstep(veinThickness + 0.05, veinThickness, veinPattern);
                
                vec2 flowUV = veinUV + vec2(u_time * 0.5, 0.0);
                float flowPattern = sin(flowUV.x * 20.0 + flowUV.y * 5.0) * 0.5 + 0.5;
                
                vec3 veinColor = mix(colToxic, colElectricBlue, pulse);
                veinColor = mix(veinColor, colAcid, flowPattern * 0.3);
                
                float glowRadius = 0.3;
                float glowMask = 1.0 - smoothstep(0.0, glowRadius, veinPattern);
                glowMask *= smoothstep(glowRadius, glowRadius * 0.5, veinPattern);
                
                vec3 glowColor = mix(colToxic * 0.3, colElectricBlue * 0.5, pulse);
                
                float organicNoise = fbm(uv * 5.0 + u_time * 0.2);
                vec3 backgroundTexture = mix(colVoid, colShadow, organicNoise);
                
                color = mix(backgroundTexture, glowColor, glowMask);
                color = mix(color, veinColor, veinMask * pulse);
                
                float spasm = step(0.95, sin(u_time * 8.0 + veinPattern * 20.0));
                color += veinColor * spasm * 0.5;
            }
            
            // Phase 32: Whispering Shadows - Fluid shadows with fleeting apparitions
            else if (phaseIndex == 32) {
                vec2 shadowUV = uv * 2.0 + vec2(sin(u_time * 0.2), cos(u_time * 0.15)) * 0.3;
                float shadowBase = snoise(shadowUV + u_time * 0.1);
                float shadowDetail = snoise(shadowUV * 3.0 + u_time * 0.05);
                float shadowFine = snoise(shadowUV * 8.0 + u_time * 0.02);
                
                float shadowMask = shadowBase * 0.6 + shadowDetail * 0.3 + shadowFine * 0.1;
                shadowMask = smoothstep(-0.2, 0.4, shadowMask);
                
                float dissolve = sin(u_time * 1.5 + length(shadowUV) * 2.0) * 0.5 + 0.5;
                dissolve = pow(dissolve, 2.0);
                shadowMask *= dissolve;
                
                float whisperTime = u_time * 0.8;
                float apparitionTrigger = step(0.8, sin(whisperTime * 3.0)) * step(0.7, cos(whisperTime * 2.3));
                
                vec2 faceUV = (uv - vec2(sin(whisperTime * 0.5) * 0.2, cos(whisperTime * 0.3) * 0.1)) * 8.0;
                float facePattern = 0.0;
                if (apparitionTrigger > 0.5) {
                    float eyeL = smoothstep(0.3, 0.2, length(faceUV - vec2(-1.0, 0.5)));
                    float eyeR = smoothstep(0.3, 0.2, length(faceUV - vec2(1.0, 0.5)));
                    float mouth = smoothstep(0.1, 0.05, abs(faceUV.y + 0.5)) * smoothstep(1.5, 0.5, abs(faceUV.x));
                    facePattern = eyeL + eyeR + mouth;
                    facePattern *= snoise(faceUV + u_time * 2.0) * 0.5 + 0.5;
                }
                
                vec3 shadowColor = mix(colShadow, colVoid, shadowMask);
                vec3 apparitionColor = mix(colBone * 0.3, colAcid * 0.2, facePattern);
                
                float whisperEffect = sin(u_time * 12.0 + length(uv) * 15.0) * 0.1 + 0.9;
                shadowColor *= whisperEffect;
                
                color = mix(colBackground, shadowColor, shadowMask);
                color = mix(color, apparitionColor, facePattern * apparitionTrigger * 0.7);
                
                float edgeWisp = smoothstep(0.4, 0.6, shadowMask) * (1.0 - smoothstep(0.6, 0.8, shadowMask));
                color += colShadow * 0.3 * edgeWisp * sin(u_time * 5.0 + length(uv) * 8.0);
            }
            
            // Phase 33: Geometric Abomination - Impossible shifting geometric structures
            else if (phaseIndex == 33) {
                vec2 geomUV = uv;
                float timeWarp = u_time * 0.5;
                
                // Apply non-Euclidean transformations
                geomUV = kaleidoscope(geomUV, 6.0 + 2.0 * sin(timeWarp));
                geomUV *= 1.0 + 0.3 * sin(timeWarp * 1.3);
                geomUV = rotate2D(timeWarp * 0.7) * geomUV;
                
                // Create impossible folding geometry
                vec2 foldUV = geomUV;
                for(int i = 0; i < 4; i++) {
                    foldUV = abs(foldUV) - 0.5 - 0.2 * sin(timeWarp + float(i));
                    foldUV = rotate2D(timeWarp * 0.3 + float(i) * 0.5) * foldUV;
                }
                
                float geomPattern = length(foldUV);
                geomPattern = mod(geomPattern * 8.0 + timeWarp * 2.0, 1.0);
                geomPattern = smoothstep(0.3, 0.7, geomPattern);
                
                // Impossible intersections
                vec2 intersectUV = geomUV * 5.0;
                float intersect1 = step(0.5, mod(intersectUV.x + intersectUV.y + timeWarp, 1.0));
                float intersect2 = step(0.5, mod(intersectUV.x - intersectUV.y - timeWarp * 0.7, 1.0));
                float intersection = intersect1 * (1.0 - intersect2);
                
                // Reflective surface simulation
                vec2 normalUV = geomUV + 0.1 * vec2(
                    snoise(geomUV * 10.0 + timeWarp),
                    snoise(geomUV * 10.0 + timeWarp + 100.0)
                );
                float reflection = fbm(normalUV * 3.0 + timeWarp * 0.3);
                
                vec3 geomColor = mix(colDarkGrey, colElectricBlue, geomPattern);
                geomColor = mix(geomColor, colWhite, intersection * 0.8);
                
                vec3 reflectColor = mix(colIce, colSoftPurple, reflection);
                geomColor = mix(geomColor, reflectColor, 0.4);
                
                // Chromatic aberration for unreality
                float aberration = 0.02;
                vec3 aberratedColor;
                aberratedColor.r = mix(colDarkGrey, colElectricBlue, geomPattern + aberration).r;
                aberratedColor.g = geomColor.g;
                aberratedColor.b = mix(colDarkGrey, colElectricBlue, geomPattern - aberration).b;
                
                color = mix(colBackground * 0.2, aberratedColor, 0.9);
                
                // Recursive detail
                float recursiveDetail = fbm(foldUV * 20.0 + timeWarp);
                color += recursiveDetail * 0.1 * mix(colElectricBlue, colWhite, geomPattern);
            }
            
            // Phase 34: Subterranean Horror - Claustrophobic cave with organic growths
            else if (phaseIndex == 34) {
                vec3 rayOrigin = vec3(0.0, 0.0, -2.0 + sin(u_time * 0.2) * 0.5);
                vec3 rayDir = normalize(vec3(uv, 1.0));
                
                vec3 caveColor = colBackground;
                float rayDist = 0.0;
                
                for(int i = 0; i < 32; i++) {
                    vec3 rayPos = rayOrigin + rayDir * rayDist;
                    
                    // Cave tunnel SDF
                    float tunnel = length(rayPos.xy) - 1.0 - 0.3 * sin(rayPos.z * 2.0 + u_time * 0.5);
                    tunnel += 0.1 * snoise(rayPos * 3.0 + u_time * 0.1);
                    
                    // Organic growths
                    vec3 growthPos = rayPos;
                    growthPos.xy = mod(growthPos.xy + 0.5, 1.0) - 0.5;
                    float growth = sdSphere(growthPos, 0.2 + 0.1 * sin(u_time * 2.0 + rayPos.z * 5.0));
                    growth += 0.05 * snoise(growthPos * 10.0 + u_time * 0.3);
                    
                    // Fungi
                    vec3 fungiPos = rayPos + vec3(0.5, 0.3, 0.0);
                    fungiPos.xy = mod(fungiPos.xy + 0.3, 0.6) - 0.3;
                    float fungi = sdCylinder(fungiPos, 0.1, 0.05);
                    fungi = smin(fungi, sdSphere(fungiPos + vec3(0.0, 0.1, 0.0), 0.08), 0.02);
                    
                    float caveDist = min(tunnel, min(growth, fungi));
                    
                    if(caveDist < 0.01) {
                        vec3 normal = normalize(vec3(
                            tunnel - min(growth, fungi),
                            0.0,
                            0.0
                        ));
                        
                        // Lighting from glowing fungi
                        vec3 fungiLight = vec3(0.0, 0.5, 0.0);
                        float fungiGlow = 1.0 / (1.0 + length(rayPos - fungiLight) * 2.0);
                        fungiGlow *= sin(u_time * 3.0 + length(rayPos) * 5.0) * 0.3 + 0.7;
                        
                        if(caveDist == tunnel) {
                            caveColor = mix(colRust, colShadow, 0.7);
                        } else if(caveDist == growth) {
                            caveColor = mix(colFlesh, colCorruption, sin(u_time * 2.0 + rayPos.z * 3.0) * 0.5 + 0.5);
                            caveColor *= 1.0 + 0.3 * sin(u_time * 4.0 + length(rayPos) * 8.0);
                        } else {
                            caveColor = mix(colToxic, colAcid, fungiGlow);
                            caveColor *= 1.5 * fungiGlow;
                        }
                        
                        caveColor *= fungiGlow * 0.5 + 0.3;
                        break;
                    }
                    
                    rayDist += caveDist * 0.8;
                    if(rayDist > 8.0) break;
                }
                
                // Claustrophobic lens distortion
                float distortion = length(uv) * 0.3;
                caveColor *= 1.0 - distortion;
                
                // Monstrous silhouettes
                float monsterTrigger = step(0.9, sin(u_time * 0.7 + length(uv) * 3.0));
                if(monsterTrigger > 0.5 && rayDist > 3.0) {
                    vec2 monsterUV = uv * 3.0 + vec2(sin(u_time * 0.3), cos(u_time * 0.4));
                    float monsterShape = smoothstep(0.8, 1.0, fbm(monsterUV * 2.0));
                    caveColor = mix(caveColor, colVoid, monsterShape * 0.8);
                }
                
                color = caveColor;
            }
            
            // Phase 35: Temporal Echoes - Ghostly echoes of past frames
            else if (phaseIndex == 35) {
                vec3 currentColor = colBackground;
                
                // Generate base pattern
                vec2 echoUV = uv * 3.0;
                float basePattern = fbm(echoUV + u_time * 0.2);
                basePattern = sin(basePattern * 8.0 + u_time * 1.5) * 0.5 + 0.5;
                
                vec3 baseColor = mix(colPrimary, colSecondary, basePattern);
                currentColor = mix(currentColor, baseColor, 0.8);
                
                // Temporal echoes - simulate past frames
                for(int i = 1; i <= 5; i++) {
                    float timeOffset = float(i) * 0.3;
                    float echoTime = u_time - timeOffset;
                    
                    vec2 echoDistort = uv + 0.1 * timeOffset * vec2(
                        sin(echoTime * 2.0 + length(uv) * 5.0),
                        cos(echoTime * 1.7 + uv.x * 8.0)
                    );
                    
                    float echoPattern = fbm(echoDistort * 3.0 + echoTime * 0.2);
                    echoPattern = sin(echoPattern * 8.0 + echoTime * 1.5) * 0.5 + 0.5;
                    
                    vec3 echoColor = mix(colPrimary, colSecondary, echoPattern);
                    
                    // Fade and distort echoes
                    float echoOpacity = 0.3 / float(i);
                    echoColor *= echoOpacity;
                    
                    // Temporal corruption
                    float corruption = snoise(echoDistort * 10.0 + echoTime * 0.5);
                    echoColor = mix(echoColor, colCorruption, abs(corruption) * 0.3);
                    
                    // Motion blur effect
                    vec2 motionBlur = (uv - echoDistort) * timeOffset;
                    echoColor *= 1.0 - length(motionBlur) * 2.0;
                    
                    currentColor = mix(currentColor, echoColor, echoOpacity);
                }
                
                // Temporal artifacts
                float artifact = step(0.98, rand(originalUV + floor(u_time * 20.0)));
                currentColor += artifact * mix(colAcid, colElectricBlue, rand(originalUV)) * 0.5;
                
                // Desaturated, ethereal look
                float luminance = dot(currentColor, vec3(0.299, 0.587, 0.114));
                currentColor = mix(vec3(luminance), currentColor, 0.6);
                
                color = currentColor;
            }
            
            // Phase 36: Infernal Geometries - Hellish molten geometric landscape
            else if (phaseIndex == 36) {
                vec3 rayOrigin = vec3(0.0, 1.0, -3.0);
                vec3 rayDir = normalize(vec3(uv, 1.0));
                
                vec3 infernalColor = colBackground;
                float rayDist = 0.0;
                
                for(int i = 0; i < 40; i++) {
                    vec3 rayPos = rayOrigin + rayDir * rayDist;
                    
                    // Jagged geometric structures
                    float geom1 = sdBox(rayPos, vec3(0.8, 0.5, 1.2));
                    geom1 += 0.2 * sin(rayPos.x * 5.0 + u_time) * sin(rayPos.z * 3.0 + u_time * 0.7);
                    
                    vec3 pyramidPos = rayPos - vec3(2.0, 0.0, 1.0);
                    float pyramid = sdOctahedron(pyramidPos, 1.0);
                    pyramid += 0.1 * snoise(pyramidPos * 8.0 + u_time * 0.3);
                    
                    // Molten surface deformation
                    float molten = 0.3 * sin(rayPos.x * 3.0 + u_time * 2.0) * cos(rayPos.z * 4.0 + u_time * 1.5);
                    molten += 0.1 * fbm(rayPos.xz * 5.0 + u_time * 0.5);
                    
                    float hellGeom = min(geom1 + molten, pyramid + molten);
                    
                    // Ground plane
                    float ground = rayPos.y + 1.0 + molten;
                    
                    float totalDist = min(hellGeom, ground);
                    
                    if(totalDist < 0.01) {
                        // Liquid fire effect
                        float fireIntensity = 1.0 - smoothstep(0.0, 0.5, totalDist);
                        float fireFlow = sin(rayPos.x * 8.0 + u_time * 3.0) * cos(rayPos.z * 6.0 + u_time * 2.0);
                        fireFlow = fireFlow * 0.5 + 0.5;
                        
                        vec3 fireColor = mix(colBlood, colEmber, fireFlow);
                        fireColor = mix(fireColor, colAcid, fireIntensity * 0.3);
                        
                        // Heat distortion
                        vec2 heatDistort = 0.05 * fireIntensity * vec2(
                            sin(u_time * 8.0 + rayPos.x * 10.0),
                            cos(u_time * 6.0 + rayPos.z * 8.0)
                        );
                        
                        // Reflections on molten surface
                        vec3 reflectDir = reflect(rayDir, normalize(vec3(molten, 1.0, molten)));
                        float reflection = fbm(reflectDir.xy * 2.0 + u_time * 0.2);
                        
                        infernalColor = mix(fireColor, fireColor * reflection, 0.4);
                        infernalColor *= fireIntensity * 2.0;
                        
                        // Glowing embers
                        float ember = step(0.95, sin(rayPos.x * 20.0 + u_time * 5.0) * cos(rayPos.z * 15.0 + u_time * 4.0));
                        infernalColor += ember * colAcid * 0.8;
                        
                        break;
                    }
                    
                    rayDist += totalDist * 0.7;
                    if(rayDist > 10.0) break;
                }
                
                // Heat shimmer effect
                float shimmer = 0.02 * sin(u_time * 10.0 + length(uv) * 15.0);
                infernalColor *= 1.0 + shimmer;
                
                color = infernalColor;
            }
            
            // Phase 37: Glitching Hive Mind - Failing organic computer network
            else if (phaseIndex == 37) {
                vec2 gridUV = uv * 8.0;
                vec2 gridID = floor(gridUV);
                vec2 gridLocal = fract(gridUV);
                
                // Node generation
                float nodeActive = step(0.3, rand(gridID + floor(u_time * 2.0)));
                float nodePulse = sin(u_time * 4.0 + rand(gridID) * 10.0) * 0.5 + 0.5;
                nodePulse *= nodeActive;
                
                // Node rendering
                float nodeRadius = 0.2 + 0.1 * nodePulse;
                float nodeDist = length(gridLocal - 0.5);
                float node = smoothstep(nodeRadius + 0.05, nodeRadius, nodeDist);
                
                vec3 nodeColor = mix(colElectricBlue, colToxic, nodePulse);
                
                // Connection lines
                vec3 connectionColor = colBackground;
                float connectionIntensity = 0.0;
                
                // Check connections to adjacent nodes
                for(int dx = -1; dx <= 1; dx++) {
                    for(int dy = -1; dy <= 1; dy++) {
                        if(dx == 0 && dy == 0) continue;
                        
                        vec2 neighborID = gridID + vec2(float(dx), float(dy));
                        float neighborActive = step(0.3, rand(neighborID + floor(u_time * 2.0)));
                        
                        if(nodeActive > 0.5 && neighborActive > 0.5) {
                            vec2 connectionDir = normalize(vec2(float(dx), float(dy)));
                            vec2 connectionStart = vec2(0.5);
                            vec2 connectionEnd = connectionStart + connectionDir * 0.5;
                            
                            float connectionDist = abs(dot(gridLocal - connectionStart, vec2(-connectionDir.y, connectionDir.x)));
                            float connectionLength = dot(gridLocal - connectionStart, connectionDir);
                            
                            if(connectionLength > 0.0 && connectionLength < 0.5) {
                                float connectionLine = smoothstep(0.05, 0.02, connectionDist);
                                
                                // Connection flickering
                                float flicker = step(0.7, sin(u_time * 15.0 + rand(gridID + neighborID) * 20.0));
                                connectionLine *= (1.0 - flicker * 0.8);
                                
                                connectionIntensity += connectionLine;
                            }
                        }
                    }
                }
                
                connectionColor = mix(colCorruption, colElectricBlue, connectionIntensity);
                
                // Data streams
                vec2 streamUV = gridUV + vec2(u_time * 3.0, u_time * 2.0);
                float streamPattern = sin(streamUV.x * 20.0) * cos(streamUV.y * 15.0);
                streamPattern = smoothstep(0.8, 1.0, streamPattern);
                
                // Data stream glitching
                float glitchTrigger = step(0.95, rand(floor(streamUV) + floor(u_time * 10.0)));
                streamPattern *= (1.0 - glitchTrigger);
                
                vec3 streamColor = mix(colAcid, colWhite, streamPattern);
                
                // Global system glitch
                float systemGlitch = step(0.98, sin(u_time * 7.0)) * step(0.95, cos(u_time * 11.0));
                vec2 glitchOffset = systemGlitch * 0.1 * vec2(
                    sin(u_time * 50.0),
                    cos(u_time * 37.0)
                );
                
                // Combine all elements
                vec3 finalColor = mix(colVoid, connectionColor, connectionIntensity);
                finalColor = mix(finalColor, nodeColor, node);
                finalColor = mix(finalColor, streamColor, streamPattern * connectionIntensity);
                
                // Apply system glitch
                if(systemGlitch > 0.5) {
                    finalColor = mix(finalColor, colBlood, 0.3);
                    finalColor += (rand(originalUV + glitchOffset + u_time) - 0.5) * 0.5;
                }
                
                color = finalColor;
            }
            
            // Phase 38: Eldritch Tentacles - Cosmic tentacles with glowing symbols
            else if (phaseIndex == 38) {
                vec3 cosmicColor = mix(colVoid, colShadow, fbm(uv * 2.0 + u_time * 0.1));
                
                // Starfield background
                vec2 starUV = uv * 50.0;
                float stars = step(0.98, rand(floor(starUV)));
                stars *= sin(u_time * 2.0 + rand(floor(starUV)) * 10.0) * 0.3 + 0.7;
                cosmicColor += stars * colWhite * 0.3;
                
                // Multiple tentacles
                for(int t = 0; t < 3; t++) {
                    float tentaclePhase = float(t) * 2.1 + u_time * 0.3;
                    vec2 tentacleOrigin = vec2(
                        sin(tentaclePhase) * 2.0,
                        cos(tentaclePhase * 0.7) * 1.5
                    );
                    
                    vec2 tentacleUV = uv - tentacleOrigin;
                    float tentacleAngle = atan(tentacleUV.y, tentacleUV.x);
                    float tentacleDist = length(tentacleUV);
                    
                    // Tentacle undulation
                    float undulation = sin(tentacleDist * 3.0 - u_time * 2.0 + float(t)) * 0.3;
                    tentacleAngle += undulation;
                    
                    // Tentacle thickness
                    float thickness = 0.3 * (1.0 - tentacleDist * 0.2) * (1.0 + 0.2 * sin(tentacleDist * 8.0 + u_time * 1.5));
                    thickness = max(thickness, 0.0);
                    
                    // Tentacle body
                    float tentacleMask = smoothstep(thickness + 0.1, thickness, abs(sin(tentacleAngle * 0.5) * tentacleDist));
                    tentacleMask *= smoothstep(3.0, 0.5, tentacleDist);
                    
                    if(tentacleMask > 0.1) {
                        // Tentacle surface texture
                        vec2 surfaceUV = vec2(tentacleDist * 5.0, tentacleAngle * 3.0);
                        float surfaceTexture = fbm(surfaceUV + u_time * 0.2);
                        
                        vec3 tentacleColor = mix(colCorruption, colFlesh, surfaceTexture);
                        tentacleColor = mix(tentacleColor, colShadow, 1.0 - tentacleMask);
                        
                        // Glowing symbols
                        float symbolSpacing = 0.8;
                        vec2 symbolUV = vec2(mod(tentacleDist, symbolSpacing) / symbolSpacing, tentacleAngle / PI);
                        
                        float symbolTrigger = step(0.7, sin(tentacleDist * 4.0 + u_time + float(t) * 3.0));
                        if(symbolTrigger > 0.5) {
                            float symbol = 0.0;
                            
                            // Simple runic patterns
                            symbol += smoothstep(0.1, 0.05, abs(symbolUV.x - 0.5));
                            symbol += smoothstep(0.15, 0.1, length(symbolUV - vec2(0.3, 0.3)));
                            symbol += smoothstep(0.15, 0.1, length(symbolUV - vec2(0.7, 0.7)));
                            
                            symbol *= sin(u_time * 3.0 + tentacleDist * 5.0) * 0.5 + 0.5;
                            
                            vec3 symbolColor = mix(colToxic, colAcid, symbol);
                            tentacleColor = mix(tentacleColor, symbolColor, symbol * 0.8);
                        }
                        
                        cosmicColor = mix(cosmicColor, tentacleColor, tentacleMask);
                        
                        // Light absorption effect
                        float absorption = tentacleMask * 0.5;
                        cosmicColor *= (1.0 - absorption);
                    }
                }
                
                // Cosmic distortion
                vec2 distortUV = uv + 0.1 * vec2(
                    sin(u_time * 0.5 + length(uv) * 3.0),
                    cos(u_time * 0.7 + uv.x * 5.0)
                );
                cosmicColor *= 1.0 + 0.1 * fbm(distortUV * 8.0 + u_time * 0.3);
                
                color = cosmicColor;
            }
            
            // Phase 39: Screaming Vortex - Chaotic destructive maelstrom
            else if (phaseIndex == 39) {
                vec2 vortexCenter = vec2(0.0);
                vec2 toCenter = uv - vortexCenter;
                float distToCenter = length(toCenter);
                float angle = atan(toCenter.y, toCenter.x);
                
                // Vortex rotation and inward pull
                float vortexStrength = 1.0 / (distToCenter + 0.1);
                float rotation = angle + vortexStrength * u_time * 3.0;
                float inwardPull = distToCenter * (1.0 - 0.8 * vortexStrength);
                
                vec2 vortexUV = vec2(cos(rotation), sin(rotation)) * inwardPull;
                
                // Multiple noise layers for chaos
                float chaos1 = fbm(vortexUV * 3.0 + u_time * 0.5);
                float chaos2 = turbulence(vortexUV * 5.0 - u_time * 0.3);
                float chaos3 = ridgedNoise(vortexUV * 8.0 + u_time * 0.7);
                
                float chaosPattern = chaos1 * 0.5 + chaos2 * 0.3 + chaos3 * 0.2;
                chaosPattern = pow(chaosPattern, 0.7);
                
                // Distorted faces in the maelstrom
                vec2 faceUV = vortexUV * 2.0 + vec2(sin(u_time * 2.0), cos(u_time * 1.7));
                float faceDistortion = 1.0 + 2.0 * vortexStrength;
                faceUV *= faceDistortion;
                
                float face = 0.0;
                if(distToCenter > 0.3 && distToCenter < 1.2) {
                    // Stretched and warped facial features
                    float eyeL = smoothstep(0.2, 0.1, length(faceUV - vec2(-0.5, 0.2)) * faceDistortion);
                    float eyeR = smoothstep(0.2, 0.1, length(faceUV - vec2(0.5, 0.2)) * faceDistortion);
                    float mouth = smoothstep(0.3, 0.1, abs(faceUV.y + 0.3)) * smoothstep(0.8, 0.3, abs(faceUV.x));
                    
                    face = (eyeL + eyeR + mouth) * chaosPattern;
                    face *= sin(u_time * 8.0 + distToCenter * 10.0) * 0.5 + 0.5;
                }
                
                // Vortex coloring
                vec3 vortexColor = mix(colBlood, colEmber, chaosPattern);
                vortexColor = mix(vortexColor, colVoid, smoothstep(0.0, 0.2, distToCenter));
                
                // Screaming effect - pulsating intensity
                float screamPulse = sin(u_time * 12.0 + distToCenter * 8.0) * 0.3 + 0.7;
                screamPulse *= sin(u_time * 7.0 + angle * 3.0) * 0.2 + 0.8;
                
                vortexColor *= screamPulse;
                
                // Electric flashes in intense areas
                float intensity = chaosPattern * vortexStrength;
                float flash = step(0.95, sin(u_time * 20.0 + intensity * 15.0));
                vortexColor += flash * colElectricBlue * 0.8;
                
                // Face overlay
                vec3 faceColor = mix(colBone, colBlood, face);
                vortexColor = mix(vortexColor, faceColor, face * 0.6);
                
                // Singularity effect at center
                float singularity = smoothstep(0.1, 0.0, distToCenter);
                vortexColor = mix(vortexColor, colVoid, singularity);
                
                color = vortexColor;
            }
            
            // Phase 40: Parasitic Growth - Organic parasite consuming metallic surface
            else if (phaseIndex == 40) {
                // Base metallic surface
                vec2 metalUV = uv * 8.0;
                float metalPattern = sin(metalUV.x * 2.0) * cos(metalUV.y * 3.0);
                metalPattern = metalPattern * 0.5 + 0.5;
                
                vec3 metalColor = mix(colDarkGrey, colIce, metalPattern);
                metalColor += 0.2 * fbm(metalUV * 0.5) * colWhite;
                
                // Parasitic growth spread
                vec2 growthCenter = vec2(sin(u_time * 0.2) * 0.3, cos(u_time * 0.15) * 0.2);
                float growthRadius = 0.3 + 0.7 * (sin(u_time * 0.5) * 0.5 + 0.5);
                
                float distToGrowth = length(uv - growthCenter);
                float growthMask = 1.0 - smoothstep(growthRadius - 0.2, growthRadius + 0.1, distToGrowth);
                
                // Growth texture
                vec2 growthUV = (uv - growthCenter) * 5.0 + u_time * 0.1;
                float growthTexture = worley(growthUV);
                growthTexture = 1.0 - growthTexture;
                growthTexture = pow(growthTexture, 0.8);
                
                // Slimy surface
                float slime = fbm(growthUV * 2.0 + u_time * 0.3);
                slime = sin(slime * 8.0 + u_time * 2.0) * 0.5 + 0.5;
                
                // Pulsation
                float pulse = sin(u_time * 3.0 + distToGrowth * 5.0) * 0.3 + 0.7;
                pulse *= sin(u_time * 2.0 + growthTexture * 10.0) * 0.2 + 0.8;
                
                vec3 growthColor = mix(colToxic, colFlesh, growthTexture);
                growthColor = mix(growthColor, colCorruption, slime * 0.4);
                growthColor *= pulse;
                
                // Glistening effect
                float glisten = pow(slime, 3.0) * pulse;
                growthColor += glisten * colWhite * 0.5;
                
                // Surface consumption and warping
                float consumption = growthMask * (0.8 + 0.2 * growthTexture);
                vec2 warpedMetalUV = metalUV + consumption * 0.5 * vec2(
                    sin(growthUV.x * 3.0 + u_time),
                    cos(growthUV.y * 4.0 + u_time * 0.8)
                );
                
                vec3 warpedMetal = mix(colDarkGrey, colRust, consumption);
                warpedMetal *= 1.0 - consumption * 0.5;
                
                // Growth edges
                float growthEdge = smoothstep(growthRadius - 0.1, growthRadius, distToGrowth);
                growthEdge *= (1.0 - smoothstep(growthRadius, growthRadius + 0.05, distToGrowth));
                
                vec3 edgeColor = mix(colBlood, colEmber, pulse);
                
                // Final composition
                color = mix(metalColor, warpedMetal, consumption * 0.7);
                color = mix(color, growthColor, growthMask * growthTexture);
                color = mix(color, edgeColor, growthEdge * 0.8);
                
                // Spreading tendrils
                for(int i = 0; i < 5; i++) {
                    float tendrilAngle = float(i) * 1.26 + u_time * 0.3;
                    vec2 tendrilDir = vec2(cos(tendrilAngle), sin(tendrilAngle));
                    vec2 tendrilPos = growthCenter + tendrilDir * (growthRadius + 0.1 + 0.2 * sin(u_time * 2.0 + float(i)));
                    
                    float tendrilDist = length(uv - tendrilPos);
                    float tendril = smoothstep(0.05, 0.02, tendrilDist);
                    
                    color = mix(color, growthColor * 0.8, tendril);
                }
            }

            // Set the final output color
            outColor = vec4(color, 1.0);
        }
    `;


            
            // Phase 41: Fractured Reality - Shattered mirror reflecting distorted dimensions
            else if (phaseIndex == 41) {
                vec2 fractureUV = uv * 6.0;
                vec2 fractureID = floor(fractureUV);
                vec2 fractureLocal = fract(fractureUV);
                
                // Generate fracture pattern
                float fractureNoise = fbm(fractureID * 0.3 + u_time * 0.1);
                float fractureTrigger = step(0.4, fractureNoise);
                
                // Individual shard distortion
                vec2 shardOffset = (rand(fractureID) - 0.5) * 0.3 * fractureTrigger;
                shardOffset += 0.1 * vec2(
                    sin(u_time * 2.0 + fractureID.x),
                    cos(u_time * 1.7 + fractureID.y)
                ) * fractureTrigger;
                
                vec2 distortedUV = uv + shardOffset;
                
                // Base reality pattern
                float realityPattern = fbm(distortedUV * 3.0 + u_time * 0.2);
                realityPattern = sin(realityPattern * 6.0 + u_time * 1.5) * 0.5 + 0.5;
                
                vec3 realityColor = mix(colPrimary, colSecondary, realityPattern);
                
                // Fracture lines
                vec2 fractureLines = abs(fractureLocal - 0.5);
                float linePattern = min(fractureLines.x, fractureLines.y);
                linePattern = smoothstep(0.02, 0.0, linePattern) * fractureTrigger;
                
                // Alien dimension glimpses
                float alienTrigger = step(0.7, fractureNoise) * fractureTrigger;
                vec3 alienColor = colBackground;
                
                if(alienTrigger > 0.5) {
                    vec2 alienUV = distortedUV * 4.0 + u_time * 0.5;
                    float alienPattern = turbulence(alienUV);
                    alienPattern = pow(alienPattern, 0.5);
                    
                    alienColor = mix(colToxic, colEmber, alienPattern);
                    alienColor = mix(alienColor, colCorruption, sin(alienPattern * 10.0 + u_time * 3.0) * 0.5 + 0.5);
                    
                    // Alien geometry
                    float alienGeom = sin(alienUV.x * 8.0) * cos(alienUV.y * 6.0);
                    alienGeom = smoothstep(-0.2, 0.2, alienGeom);
                    alienColor = mix(alienColor, colAcid, alienGeom * 0.6);
                }
                
                // Shattering animation
                float shatterTime = mod(u_time * 0.3, 3.0);
                float shatterIntensity = smoothstep(0.0, 0.5, shatterTime) * (1.0 - smoothstep(2.5, 3.0, shatterTime));
                
                vec2 shatterOffset = shatterIntensity * 0.2 * vec2(
                    sin(fractureID.x * 10.0 + u_time * 5.0),
                    cos(fractureID.y * 8.0 + u_time * 4.0)
                ) * fractureTrigger;
                
                // Chromatic aberration at fracture edges
                float aberrationStrength = linePattern * 0.05;
                vec3 aberratedColor;
                aberratedColor.r = mix(realityColor, alienColor, alienTrigger).r;
                aberratedColor.g = realityColor.g;
                aberratedColor.b = mix(realityColor, alienColor, alienTrigger).b;
                
                color = mix(aberratedColor, realityColor, 1.0 - aberrationStrength);
                color = mix(color, colVoid, linePattern * 0.8);
                color += shatterIntensity * colWhite * 0.3 * fractureTrigger;
            }
            
            // Phase 42: Entropic Decay - Gradual dissolution into chaos
            else if (phaseIndex == 42) {
                float decayProgress = sin(u_time * 0.2) * 0.5 + 0.5;
                decayProgress = pow(decayProgress, 0.8);
                
                // Original vibrant pattern
                vec2 originalUV = uv * 4.0;
                float originalPattern = fbm(originalUV + u_time * 0.1);
                originalPattern = sin(originalPattern * 8.0 + u_time) * 0.5 + 0.5;
                
                vec3 vibrantColor = mix(colElectricBlue, colToxic, originalPattern);
                vibrantColor = mix(vibrantColor, colEmber, sin(originalPattern * 5.0 + u_time * 2.0) * 0.5 + 0.5);
                
                // Pixelation effect
                float pixelSize = 1.0 + decayProgress * 20.0;
                vec2 pixelatedUV = floor(originalUV * pixelSize) / pixelSize;
                float pixelatedPattern = fbm(pixelatedUV);
                
                // Color desaturation
                float luminance = dot(vibrantColor, vec3(0.299, 0.587, 0.114));
                vec3 desaturatedColor = mix(vibrantColor, vec3(luminance), decayProgress * 0.8);
                
                // Data corruption
                float corruption = rand(floor(originalUV * (1.0 + decayProgress * 10.0)) + floor(u_time * 5.0));
                corruption = step(0.5 - decayProgress * 0.3, corruption);
                
                vec3 corruptedColor = mix(desaturatedColor, vec3(corruption), decayProgress * 0.4);
                
                // Noise dissolution
                float dissolveNoise = turbulence(originalUV * 2.0 + u_time * 0.3);
                dissolveNoise = pow(dissolveNoise, 1.0 - decayProgress * 0.5);
                
                vec3 dissolvedColor = mix(corruptedColor, colVoid, 1.0 - dissolveNoise);
                
                // Final entropy stage
                if(decayProgress > 0.8) {
                    float chaosNoise = rand(originalUV + u_time * 2.0);
                    vec3 chaosColor = mix(colVoid, colCorruption, chaosNoise);
                    chaosColor = mix(chaosColor, colWhite, step(0.95, chaosNoise));
                    
                    float entropyMix = (decayProgress - 0.8) * 5.0;
                    dissolvedColor = mix(dissolvedColor, chaosColor, entropyMix);
                }
                
                // Glitch artifacts
                float glitchTrigger = step(0.98, sin(u_time * 10.0 + length(uv) * 5.0));
                dissolvedColor += glitchTrigger * decayProgress * colElectricBlue * 0.5;
                
                color = dissolvedColor;
            }
            
            // Phase 43: Cosmic Horror Gaze - Vast unblinking eye inducing madness
            else if (phaseIndex == 43) {
                vec2 eyeCenter = vec2(0.0);
                float distToEye = length(uv - eyeCenter);
                
                // Eye structure
                float eyeballRadius = 0.8;
                float pupilRadius = 0.3 + 0.1 * sin(u_time * 1.5);
                float irisRadius = 0.6;
                
                vec3 eyeColor = colBackground;
                
                // Eyeball
                if(distToEye < eyeballRadius) {
                    vec3 eyeballColor = mix(colBone, colFlesh, 0.3);
                    
                    // Blood vessels
                    vec2 vesselUV = (uv - eyeCenter) * 8.0;
                    float vessels = 0.0;
                    for(int i = 0; i < 8; i++) {
                        float angle = float(i) * PI / 4.0 + u_time * 0.1;
                        vec2 vesselDir = vec2(cos(angle), sin(angle));
                        float vesselDist = abs(dot(vesselUV, vec2(-vesselDir.y, vesselDir.x)));
                        vessels += smoothstep(0.3, 0.1, vesselDist) * smoothstep(eyeballRadius, 0.2, distToEye);
                    }
                    
                    eyeballColor = mix(eyeballColor, colBlood, vessels * 0.4);
                    eyeColor = eyeballColor;
                }
                
                // Iris
                if(distToEye < irisRadius) {
                    vec2 irisUV = (uv - eyeCenter) / irisRadius;
                    float irisAngle = atan(irisUV.y, irisUV.x);
                    float irisRadius_local = length(irisUV);
                    
                    // Iris pattern
                    float irisPattern = sin(irisAngle * 12.0 + irisRadius_local * 8.0 + u_time * 0.5);
                    irisPattern = irisPattern * 0.5 + 0.5;
                    
                    vec3 irisColor = mix(colToxic, colCorruption, irisPattern);
                    
                    // Arcane symbols in iris
                    float symbolSpacing = 0.2;
                    for(float r = 0.3; r < 1.0; r += symbolSpacing) {
                        float symbolAngle = irisAngle + r * 10.0 + u_time * 0.3;
                        float symbolIntensity = sin(symbolAngle * 6.0) * cos(symbolAngle * 4.0);
                        symbolIntensity = smoothstep(0.5, 0.8, symbolIntensity);
                        symbolIntensity *= smoothstep(r + 0.05, r, irisRadius_local) * smoothstep(r - 0.05, r, irisRadius_local);
                        
                        float symbolPulse = sin(u_time * 4.0 + r * 20.0) * 0.5 + 0.5;
                        vec3 symbolColor = mix(colAcid, colElectricBlue, symbolPulse);
                        
                        irisColor = mix(irisColor, symbolColor, symbolIntensity * 0.8);
                    }
                    
                    eyeColor = irisColor;
                }
                
                // Pupil - infinite abyss
                if(distToEye < pupilRadius) {
                    vec2 pupilUV = (uv - eyeCenter) / pupilRadius;
                    float pupilDepth = length(pupilUV);
                    
                    // Swirling abyss
                    float abyssAngle = atan(pupilUV.y, pupilUV.x) + pupilDepth * 5.0 - u_time * 2.0;
                    float abyssPattern = sin(abyssAngle * 8.0) * cos(pupilDepth * 15.0 + u_time * 3.0);
                    abyssPattern = abyssPattern * 0.5 + 0.5;
                    
                    vec3 abyssColor = mix(colVoid, colShadow, abyssPattern);
                    abyssColor *= 1.0 - pupilDepth * 0.8; // Darker towards center
                    
                    // Infinite depth illusion
                    for(int i = 1; i <= 5; i++) {
                        float depthLayer = pupilDepth * float(i);
                        float layerPattern = sin(depthLayer * 10.0 - u_time * float(i)) * 0.5 + 0.5;
                        abyssColor = mix(abyssColor, colVoid, layerPattern * 0.2 / float(i));
                    }
                    
                    eyeColor = abyssColor;
                }
                
                // Reality distortion from the gaze
                float gazeStrength = 1.0 / (distToEye + 0.5);
                vec2 distortionUV = uv + gazeStrength * 0.1 * vec2(
                    sin(u_time * 3.0 + length(uv) * 8.0),
                    cos(u_time * 2.5 + uv.x * 10.0)
                );
                
                // Cosmic void background
                vec2 voidUV = distortionUV * 20.0;
                float stars = step(0.99, rand(floor(voidUV)));
                stars *= sin(u_time + rand(floor(voidUV)) * 10.0) * 0.5 + 0.5;
                
                vec3 voidColor = mix(colVoid, colShadow, fbm(distortionUV * 2.0 + u_time * 0.1));
                voidColor += stars * colWhite * 0.2;
                
                // Madness-inducing ripples
                float ripple = sin(distToEye * 15.0 - u_time * 4.0) * exp(-distToEye * 2.0);
                ripple *= gazeStrength * 0.3;
                
                color = mix(voidColor, eyeColor, smoothstep(eyeballRadius + 0.1, eyeballRadius - 0.1, distToEye));
                color += ripple * mix(colElectricBlue, colToxic, sin(u_time * 5.0));
                
                // Sanity degradation effect
                float sanityLoss = gazeStrength * sin(u_time * 8.0) * 0.1;
                color += (rand(originalUV + u_time * 3.0) - 0.5) * sanityLoss;
            }
            
            // Phase 44: Sentient Slime - Intelligent oozing organism
            else if (phaseIndex == 44) {
                vec2 slimeCenter = vec2(sin(u_time * 0.3) * 0.4, cos(u_time * 0.25) * 0.3);
                float slimeRadius = 0.6 + 0.2 * sin(u_time * 0.8);
                
                float distToSlime = length(uv - slimeCenter);
                
                // Slime body
                float slimeMask = 1.0 - smoothstep(slimeRadius - 0.2, slimeRadius + 0.1, distToSlime);
                
                // Viscous texture
                vec2 slimeUV = (uv - slimeCenter) * 3.0 + u_time * 0.1;
                float viscosity = fbm(slimeUV);
                viscosity = sin(viscosity * 6.0 + u_time * 2.0) * 0.5 + 0.5;
                
                // Slime surface bubbles
                vec2 bubbleUV = slimeUV * 2.0;
                float bubbles = 0.0;
                for(int i = 0; i < 8; i++) {
                    vec2 bubblePos = vec2(sin(float(i) * 2.3 + u_time), cos(float(i) * 1.7 + u_time * 0.8)) * 0.5;
                    float bubbleDist = length(bubbleUV - bubblePos);
                    float bubbleSize = 0.1 + 0.05 * sin(u_time * 3.0 + float(i));
                    bubbles += smoothstep(bubbleSize + 0.02, bubbleSize, bubbleDist);
                }
                
                vec3 slimeColor = mix(colToxic, colCorruption, viscosity);
                slimeColor = mix(slimeColor, colAcid, bubbles * 0.4);
                
                // Glistening surface
                float glisten = pow(viscosity, 3.0);
                glisten *= sin(u_time * 4.0 + length(slimeUV) * 8.0) * 0.5 + 0.5;
                slimeColor += glisten * colWhite * 0.6;
                
                // Reactive behavior simulation
                vec2 reactionCenter = vec2(0.0); // Could be mouse position if available
                vec2 toReaction = reactionCenter - slimeCenter;
                float reactionDist = length(toReaction);
                
                // Slime reaches towards stimulus
                if(reactionDist > 0.1) {
                    vec2 reachDir = normalize(toReaction);
                    float reachStrength = 1.0 / (reactionDist + 0.5);
                    
                    for(int i = 0; i < 3; i++) {
                        vec2 pseudopodPos = slimeCenter + reachDir * (slimeRadius + 0.2 + float(i) * 0.1);
                        pseudopodPos += 0.1 * vec2(sin(u_time * 4.0 + float(i)), cos(u_time * 3.0 + float(i)));
                        
                        float pseudopodDist = length(uv - pseudopodPos);
                        float pseudopodSize = 0.08 * reachStrength * (1.0 - float(i) * 0.3);
                        float pseudopod = smoothstep(pseudopodSize + 0.02, pseudopodSize, pseudopodDist);
                        
                        slimeMask += pseudopod * 0.8;
                    }
                }
                
                // Intelligence indicators - pulsing patterns
                float intelligence = sin(u_time * 1.5 + distToSlime * 5.0) * 0.3 + 0.7;
                intelligence *= sin(u_time * 2.3 + viscosity * 8.0) * 0.2 + 0.8;
                
                slimeColor *= intelligence;
                
                // Corrosive trail
                vec2 trailUV = uv - slimeCenter + vec2(sin(u_time * 0.2), cos(u_time * 0.15)) * 2.0;
                float trail = smoothstep(0.8, 0.3, length(trailUV));
                trail *= fbm(trailUV * 4.0 + u_time * 0.2);
                
                vec3 trailColor = mix(colRust, colShadow, trail);
                
                // Background
                vec3 backgroundColor = mix(colBackground, trailColor, trail * 0.6);
                
                color = mix(backgroundColor, slimeColor, slimeMask);
                
                // Refraction effect
                if(slimeMask > 0.1) {
                    vec2 refractionOffset = 0.05 * vec2(
                        sin(slimeUV.x * 8.0 + u_time * 2.0),
                        cos(slimeUV.y * 6.0 + u_time * 1.5)
                    ) * slimeMask;
                    
                    // Simulate looking through the slime
                    vec3 refractedBG = mix(colBackground, colToxic * 0.3, fbm((uv + refractionOffset) * 4.0));
                    color = mix(color, refractedBG, slimeMask * 0.3);
                }
            }
            
            // Phase 45: Echoes of the Void - Deep void with propagating disturbances
            else if (phaseIndex == 45) {
                vec3 voidColor = mix(colVoid, colShadow, fbm(uv * 1.5 + u_time * 0.05));
                
                // Subtle void hum visualization
                float hum = sin(u_time * 0.8) * 0.05 + 0.95;
                voidColor *= hum;
                
                // Propagating ripples from disturbances
                float rippleIntensity = 0.0;
                
                for(int i = 0; i < 6; i++) {
                    float disturbanceTime = u_time * 0.5 + float(i) * 2.0;
                    vec2 disturbancePos = vec2(
                        sin(disturbanceTime * 0.7 + float(i)) * 1.5,
                        cos(disturbanceTime * 0.5 + float(i) * 1.3) * 1.2
                    );
                    
                    float distToDist = length(uv - disturbancePos);
                    float rippleTime = mod(disturbanceTime, 4.0);
                    float rippleRadius = rippleTime * 0.8;
                    
                    // Ripple wave
                    float ripple = sin((distToDist - rippleRadius) * 15.0) * exp(-abs(distToDist - rippleRadius) * 3.0);
                    ripple *= smoothstep(4.0, 0.0, rippleTime); // Fade over time
                    
                    rippleIntensity += ripple * 0.3;
                }
                
                // Ripple affects void color and distorts background
                voidColor += rippleIntensity * mix(colElectricBlue, colToxic, sin(u_time * 2.0)) * 0.2;
                
                // Alien geometry flashes
                float geometryTrigger = step(0.95, sin(u_time * 1.3)) * step(0.9, cos(u_time * 0.9));
                
                if(geometryTrigger > 0.5) {
                    vec2 geomUV = uv * 4.0 + vec2(sin(u_time * 2.0), cos(u_time * 1.7)) * 0.5;
                    
                    // Impossible cube
                    float cube = sdBox(vec3(geomUV, sin(u_time * 3.0)), vec3(0.3));
                    cube += 0.1 * sin(geomUV.x * 10.0 + u_time * 5.0) * cos(geomUV.y * 8.0 + u_time * 4.0);
                    
                    float geomMask = smoothstep(0.1, 0.0, cube);
                    geomMask *= sin(u_time * 10.0) * 0.5 + 0.5; // Flickering
                    
                    vec3 geomColor = mix(colAcid, colElectricBlue, geomMask);
                    voidColor = mix(voidColor, geomColor, geomMask * 0.7);
                }
                
                // Echo visualization - sound as visual ripples
                vec2 echoUV = uv * 8.0;
                float echo = sin(length(echoUV) * 5.0 - u_time * 3.0) * exp(-length(uv) * 1.5);
                echo *= sin(u_time * 7.0 + length(uv) * 12.0) * 0.3 + 0.7;
                
                voidColor += echo * colShadow * 0.1;
                
                // Distant light sources
                for(int i = 0; i < 4; i++) {
                    vec2 lightPos = vec2(
                        sin(u_time * 0.3 + float(i) * 1.57) * 2.0,
                        cos(u_time * 0.4 + float(i) * 1.57) * 1.8
                    );
                    
                    float lightDist = length(uv - lightPos);
                    float light = 1.0 / (lightDist * lightDist + 1.0);
                    light *= sin(u_time * 2.0 + float(i)) * 0.3 + 0.7;
                    
                    vec3 lightColor = mix(colElectricBlue, colToxic, float(i) / 4.0);
                    voidColor += light * lightColor * 0.05;
                }
                
                color = voidColor;
            }
            
            // Phase 46: Chrono-Displacement - Temporal fragmentation
            else if (phaseIndex == 46) {
                vec2 regionUV = uv * 4.0;
                vec2 regionID = floor(regionUV);
                vec2 regionLocal = fract(regionUV);
                
                // Temporal offset for each region
                float timeOffset = rand(regionID) * 2.0 - 1.0;
                timeOffset *= sin(u_time * 0.5 + rand(regionID + 100.0) * 10.0) * 0.5 + 0.5;
                
                float localTime = u_time + timeOffset;
                
                // Base pattern with temporal displacement
                vec2 patternUV = uv * 3.0 + localTime * 0.2;
                float pattern = fbm(patternUV);
                pattern = sin(pattern * 6.0 + localTime * 1.5) * 0.5 + 0.5;
                
                vec3 regionColor = mix(colPrimary, colSecondary, pattern);
                
                // Temporal boundary effects
                vec2 boundary = abs(regionLocal - 0.5);
                float boundaryDist = min(boundary.x, boundary.y);
                float boundaryMask = smoothstep(0.1, 0.05, boundaryDist);
                
                // Temporal blur at boundaries
                if(boundaryMask > 0.1) {
                    vec3 blurredColor = regionColor;
                    
                    // Sample neighboring time states
                    for(int i = -2; i <= 2; i++) {
                        float sampleTime = localTime + float(i) * 0.1;
                        vec2 sampleUV = uv * 3.0 + sampleTime * 0.2;
                        float samplePattern = fbm(sampleUV);
                        samplePattern = sin(samplePattern * 6.0 + sampleTime * 1.5) * 0.5 + 0.5;
                        
                        vec3 sampleColor = mix(colPrimary, colSecondary, samplePattern);
                        blurredColor = mix(blurredColor, sampleColor, 0.2);
                    }
                    
                    regionColor = mix(regionColor, blurredColor, boundaryMask);
                }
                
                // Temporal artifacts
                float artifactTrigger = step(0.98, rand(regionID + floor(u_time * 5.0)));
                if(artifactTrigger > 0.5) {
                    float artifact = sin(regionLocal.x * 50.0 + localTime * 20.0) * cos(regionLocal.y * 40.0 + localTime * 15.0);
                    artifact = smoothstep(0.8, 1.0, artifact);
                    
                    vec3 artifactColor = mix(colElectricBlue, colAcid, artifact);
                    regionColor = mix(regionColor, artifactColor, artifact * 0.6);
                }
                
                // Causality violations - impossible color transitions
                float violation = step(0.9, abs(timeOffset));
                if(violation > 0.5) {
                    vec3 impossibleColor = mix(colToxic, colEmber, sin(localTime * 8.0));
                    regionColor = mix(regionColor, impossibleColor, 0.4);
                }
                
                color = regionColor;
                
                // Global temporal instability
                float instability = sin(u_time * 3.0) * 0.1;
                color += (rand(originalUV + u_time * 2.0) - 0.5) * instability;
            }
            
            // Phase 47: Abyssal Maw - Light-devouring void opening
            else if (phaseIndex == 47) {
                vec2 mawCenter = vec2(0.0);
                float mawRadius = 0.2 + 0.6 * (sin(u_time * 0.3) * 0.5 + 0.5);
                
                float distToMaw = length(uv - mawCenter);
                
                // Maw interior - pure darkness
                vec3 mawColor = colBackground;
                
                if(distToMaw < mawRadius) {
                    // Infinite darkness
                    mawColor = colVoid * 0.1;
                    
                    // Shimmering distortions representing screams
                    vec2 screamUV = (uv - mawCenter) / mawRadius;
                    float screamDistort = sin(length(screamUV) * 15.0 - u_time * 8.0) * 0.1;
                    screamDistort *= sin(atan(screamUV.y, screamUV.x) * 6.0 + u_time * 5.0) * 0.05;
                    
                    vec2 distortedScreamUV = screamUV + screamDistort;
                    float screamPattern = fbm(distortedScreamUV * 8.0 + u_time * 0.5);
                    
                    mawColor += screamPattern * colCorruption * 0.2;
                    
                    // Depth illusion
                    float depth = length(screamUV);
                    mawColor *= 1.0 - depth * 0.9;
                }
                
                // Tendrils of darkness reaching outward
                for(int i = 0; i < 8; i++) {
                    float tendrilAngle = float(i) * PI / 4.0 + u_time * 0.2;
                    vec2 tendrilDir = vec2(cos(tendrilAngle), sin(tendrilAngle));
                    
                    float tendrilLength = mawRadius + 0.5 + 0.3 * sin(u_time * 1.5 + float(i));
                    vec2 tendrilEnd = mawCenter + tendrilDir * tendrilLength;
                    
                    // Tendril shape
                    vec2 toTendril = uv - mawCenter;
                    float tendrilDist = abs(dot(toTendril, vec2(-tendrilDir.y, tendrilDir.x)));
                    float tendrilProgress = dot(toTendril, tendrilDir);
                    
                    if(tendrilProgress > mawRadius && tendrilProgress < tendrilLength) {
                        float tendrilWidth = 0.1 * (1.0 - (tendrilProgress - mawRadius) / (tendrilLength - mawRadius));
                        tendrilWidth += 0.02 * sin(tendrilProgress * 10.0 + u_time * 3.0);
                        
                        float tendrilMask = smoothstep(tendrilWidth + 0.02, tendrilWidth, tendrilDist);
                        
                        vec3 tendrilColor = mix(colShadow, colVoid, tendrilMask);
                        mawColor = mix(mawColor, tendrilColor, tendrilMask * 0.8);
                    }
                }
                
                // Background being consumed
                vec2 backgroundUV = uv * 2.0 + u_time * 0.1;
                float backgroundPattern = fbm(backgroundUV);
                vec3 backgroundColor = mix(colShadow, colElectricBlue, backgroundPattern);
                
                // Light absorption effect
                float absorption = 1.0 / (distToMaw + 0.3);
                absorption = smoothstep(0.0, 2.0, absorption);
                backgroundColor *= 1.0 - absorption * 0.7;
                
                // Maw edge effects
                float edgeDist = abs(distToMaw - mawRadius);
                float edge = smoothstep(0.05, 0.0, edgeDist);
                
                vec3 edgeColor = mix(colCorruption, colVoid, edge);
                edgeColor *= sin(u_time * 6.0 + distToMaw * 20.0) * 0.5 + 0.5;
                
                color = mix(backgroundColor, mawColor, smoothstep(mawRadius + 0.1, mawRadius - 0.1, distToMaw));
                color = mix(color, edgeColor, edge * 0.8);
                
                // Reality distortion around the maw
                float distortion = absorption * 0.1;
                vec2 distortedUV = uv + distortion * vec2(
                    sin(u_time * 4.0 + length(uv) * 8.0),
                    cos(u_time * 3.0 + uv.x * 10.0)
                );
                
                // Apply subtle distortion to final color
                color *= 1.0 + distortion * sin(u_time * 10.0 + length(distortedUV) * 15.0) * 0.2;
            }
            
            // Phase 48: Corrupted Consciousness - Mind breaking down
            else if (phaseIndex == 48) {
                vec3 consciousnessColor = colBackground;
                
                // Fragmented thought patterns
                for(int i = 0; i < 12; i++) {
                    vec2 thoughtPos = vec2(
                        sin(u_time * (1.0 + float(i) * 0.3) + float(i)) * 1.5,
                        cos(u_time * (0.8 + float(i) * 0.2) + float(i) * 1.7) * 1.2
                    );
                    
                    float thoughtDist = length(uv - thoughtPos);
                    float thoughtSize = 0.1 + 0.05 * sin(u_time * 4.0 + float(i));
                    
                    float thought = smoothstep(thoughtSize + 0.05, thoughtSize, thoughtDist);
                    
                    // Thought fragmentation
                    float fragmentation = sin(thoughtDist * 20.0 + u_time * 8.0) * 0.5 + 0.5;
                    fragmentation *= step(0.3, rand(vec2(float(i)) + floor(u_time * 3.0)));
                    
                    thought *= fragmentation;
                    
                    vec3 thoughtColor = mix(colElectricBlue, colToxic, float(i) / 12.0);
                    thoughtColor = mix(thoughtColor, colCorruption, fragmentation);
                    
                    consciousnessColor = mix(consciousnessColor, thoughtColor, thought * 0.6);
                }
                
                // Memory fragments
                vec2 memoryUV = uv * 6.0 + u_time * 0.5;
                float memoryNoise = fbm(memoryUV);
                float memoryMask = step(0.6, memoryNoise) * step(0.8, sin(u_time * 2.0 + memoryNoise * 10.0));
                
                vec3 memoryColor = mix(colBone, colFlesh, memoryNoise);
                memoryColor *= 0.5; // Faded memories
                
                consciousnessColor = mix(consciousnessColor, memoryColor, memoryMask * 0.4);
                
                // Static overlay - mental noise
                float staticIntensity = 0.3 + 0.7 * (sin(u_time * 0.8) * 0.5 + 0.5);
                vec2 staticUV = uv * 100.0;
                float staticNoise = rand(floor(staticUV) + floor(u_time * 20.0));
                staticNoise *= staticIntensity;
                
                consciousnessColor = mix(consciousnessColor, vec3(staticNoise), staticNoise * 0.3);
                
                // Synaptic firing patterns
                vec2 synapseUV = uv * 8.0;
                vec2 synapseID = floor(synapseUV);
                
                float synapseFire = step(0.95, rand(synapseID + floor(u_time * 10.0)));
                synapseFire *= sin(u_time * 15.0 + rand(synapseID) * 20.0) * 0.5 + 0.5;
                
                vec3 synapseColor = mix(colElectricBlue, colAcid, synapseFire);
                consciousnessColor += synapseFire * synapseColor * 0.2;
                
                // Disorientation effect
                float disorientation = sin(u_time * 1.2) * 0.1;
                vec2 disorientedUV = uv + disorientation * vec2(
                    sin(u_time * 3.0 + length(uv) * 5.0),
                    cos(u_time * 2.5 + uv.y * 8.0)
                );
                
                // Abstract text/symbol attempts
                vec2 symbolUV = disorientedUV * 20.0;
                float symbol = 0.0;
                
                // Simple line patterns representing broken text
                symbol += smoothstep(0.1, 0.05, abs(fract(symbolUV.x) - 0.5));
                symbol += smoothstep(0.1, 0.05, abs(fract(symbolUV.y) - 0.5));
                symbol *= step(0.7, rand(floor(symbolUV) + floor(u_time * 5.0)));
                
                vec3 symbolColor = mix(colWhite, colCorruption, symbol);
                consciousnessColor = mix(consciousnessColor, symbolColor, symbol * 0.3);
                
                // Madness progression
                float madness = (sin(u_time * 0.4) * 0.5 + 0.5);
                madness = pow(madness, 0.5);
                
                // Color desaturation as madness progresses
                float luminance = dot(consciousnessColor, vec3(0.299, 0.587, 0.114));
                consciousnessColor = mix(consciousnessColor, vec3(luminance), madness * 0.6);
                
                // Chaotic color flashes
                float chaos = step(0.98, sin(u_time * 12.0)) * madness;
                consciousnessColor += chaos * mix(colBlood, colAcid, rand(originalUV + u_time)) * 0.5;
                
                color = consciousnessColor;
            }
            
            // Phase 49: The Unseen Presence - Subtle invisible horror
            else if (phaseIndex == 49) {
                // Seemingly normal background
                vec2 normalUV = uv * 3.0 + u_time * 0.05;
                float normalPattern = fbm(normalUV);
                vec3 normalColor = mix(colShadow, colElectricBlue, normalPattern);
                
                // Invisible presence location
                vec2 presencePos = vec2(
                    sin(u_time * 0.2) * 0.8,
                    cos(u_time * 0.15) * 0.6
                );
                
                float distToPresence = length(uv - presencePos);
                
                // Heat haze effect around presence
                float hazeRadius = 0.4;
                float hazeMask = smoothstep(hazeRadius, hazeRadius * 0.5, distToPresence);
                
                vec2 hazeDistortion = hazeMask * 0.02 * vec2(
                    sin(u_time * 8.0 + distToPresence * 15.0),
                    cos(u_time * 6.0 + distToPresence * 12.0)
                );
                
                vec2 distortedUV = normalUV + hazeDistortion;
                float distortedPattern = fbm(distortedUV);
                vec3 distortedColor = mix(colShadow, colElectricBlue, distortedPattern);
                
                // Light bending - subtle UV coordinate shifts
                vec2 bentUV = normalUV + hazeMask * 0.01 * normalize(uv - presencePos);
                float bentPattern = fbm(bentUV);
                vec3 bentColor = mix(colShadow, colElectricBlue, bentPattern);
                
                // Whisper visualization - very subtle anomalies
                float whisperIntensity = 0.02;
                vec2 whisperUV = uv * 50.0 + u_time * 2.0;
                float whisper = sin(whisperUV.x * 3.0) * cos(whisperUV.y * 4.0);
                whisper = smoothstep(0.9, 1.0, whisper) * hazeMask;
                
                vec3 whisperColor = normalColor + whisper * whisperIntensity * colCorruption;
                
                // Presence movement creates subtle trails
                vec2 trailUV = uv - presencePos + vec2(sin(u_time * 0.1), cos(u_time * 0.08)) * 1.5;
                float trail = smoothstep(0.8, 0.2, length(trailUV));
                trail *= 0.05; // Very subtle
                
                // Combine all subtle effects
                color = mix(normalColor, distortedColor, hazeMask * 0.3);
                color = mix(color, bentColor, hazeMask * 0.2);
                color = mix(color, whisperColor, whisper);
                color = mix(color, normalColor * 0.95, trail); // Slight darkening for trail
                
                // Barely perceptible flicker
                float flicker = sin(u_time * 7.0 + distToPresence * 10.0) * 0.01 + 0.99;
                color *= flicker;
                
                // Subliminal unease - very subtle color shift
                float unease = hazeMask * 0.05;
                color = mix(color, color * vec3(1.0, 0.98, 0.95), unease);
            }


    // --- Shader Compilation and Linking Functions ---
    function compileShader(gl, type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            const info = gl.getShaderInfoLog(shader);
            gl.deleteShader(shader);
            throw new Error(`Shader compilation failed: ${info}`);
        }

        return shader;
    }

    function createProgram(gl, vertexShader, fragmentShader) {
        const program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            const info = gl.getProgramInfoLog(program);
            gl.deleteProgram(program);
            throw new Error(`Program linking failed: ${info}`);
        }

        return program;
    }

    // --- WebGL Setup ---
    let program = null;
    let positionBuffer = null;
    let animationFrameId = null;

    function setupWebGL() {
        try {
            // Compile shaders
            const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
            const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

            // Create program
            program = createProgram(gl, vertexShader, fragmentShader);

            // Clean up shaders (they're now linked to the program)
            gl.deleteShader(vertexShader);
            gl.deleteShader(fragmentShader);

            // Create position buffer for fullscreen quad
            positionBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
            const positions = [
                -1, -1,
                 1, -1,
                -1,  1,
                -1,  1,
                 1, -1,
                 1,  1,
            ];
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

            return true;
        } catch (e) {
            console.error("WebGL setup failed:", e);
            return false;
        }
    }

    // --- Render Loop ---
    function render(time) {
        // Check for canvas resize
        const displayWidth = webglCanvas.clientWidth;
        const displayHeight = webglCanvas.clientHeight;

        if (webglCanvas.width !== displayWidth || webglCanvas.height !== displayHeight) {
            webglCanvas.width = displayWidth;
            webglCanvas.height = displayHeight;
            gl.viewport(0, 0, displayWidth, displayHeight);
        }

        // Clear and setup
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        // Use shader program
        gl.useProgram(program);

        // Set uniforms
        const timeLocation = gl.getUniformLocation(program, 'u_time');
        const resolutionLocation = gl.getUniformLocation(program, 'u_resolution');

        gl.uniform1f(timeLocation, time * 0.001); // Convert to seconds
        gl.uniform2f(resolutionLocation, webglCanvas.width, webglCanvas.height);

        // Setup vertex attributes
        const positionLocation = gl.getAttribLocation(program, 'a_position');
        gl.enableVertexAttribArray(positionLocation);
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

        // Draw
        gl.drawArrays(gl.TRIANGLES, 0, 6);

        // Continue the loop
        animationFrameId = requestAnimationFrame(render);
    }

    // --- Shader Update Function (exposed globally) ---
    window.updateShader = function(newFragmentShaderSource) {
        if (!gl || !program) {
            console.error("WebGL not initialized or program not available.");
            return;
        }

        try {
            console.log("Updating shader...");

            // Stop the current render loop
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }

            // Compile new shaders
            const newVs = compileShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
            const newFs = compileShader(gl, gl.FRAGMENT_SHADER, newFragmentShaderSource || fragmentShaderSource);

            // Create new program
            const newProgram = createProgram(gl, newVs, newFs);

            // If successful, replace the old program
            gl.deleteProgram(program);
            program = newProgram;

            // Clean up shaders
            gl.deleteShader(newVs);
            gl.deleteShader(newFs);

            // Restart render loop
            animationFrameId = requestAnimationFrame(render);

            console.log("Shader updated successfully!");
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
