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

    // Fragment Shader (GLSL 3.00 ES - 35 Phases)
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
        const float TOTAL_PHASES_F = 35.0; // <<< UPDATED TO 35 PHASES

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
            int phaseIndex = int(floor(phase)); // Current phase index (0-34)

            vec3 color = colBackground; // Start with background

            // --- Phase Implementations ---
            if (phaseIndex == 0) { float wf=.1+.05*sin(u_time*.2); wf=max(.001,wf); float z=.1/max(.01,.1-uv.y*wf+.02*fbm(uv+u_time*.05)); z=clamp(z,.1,15.); vec2 warp=uv*z; vec2 grid=abs(fract(warp*vec2(5.,3.)+u_time*.1)-.5); float line=smoothstep(.04,.05,min(grid.x,grid.y))*.6; float df=fract(z*.1+u_time*.15); vec3 bc=mix(mix(colPrimary,colTertiary,sin(u_time*.1)*.5+.5),colSecondary,sin(length(warp)*.5-u_time*.5)*.5+.5); color=mix(bc*.15,bc,line*df*1.5); }
            // --- NEW UNGODLY ADVANCED PHASES ---
            else if (phaseIndex == 1) { // Fractal Dimensional Cascade
                vec2 p = uv * 2.0;
                float s = 0.0;
                float d = 1.0;
                for(int i = 0; i < 8; i++) {
                    p = abs(p) / dot(p, p) - vec2(1.0 + 0.5 * sin(u_time * 0.2 + float(i)));
                    p *= 1.3 + 0.2 * cos(u_time * 0.1);
                    s += exp(-length(p) * d) * cos(length(p) * 10.0 - u_time * 3.0);
                    d *= 0.7;
                }
                s = pow(abs(s), 0.7);
                vec3 fractalColor = mix(colPrimary, colGold, s);
                fractalColor = mix(fractalColor, colWhite, pow(s, 3.0));
                color = mix(colBackground, fractalColor, clamp(s * 2.0, 0.0, 1.0));
            }
            else if (phaseIndex == 2) { // Quantum Field Distortion
                vec2 p = uv * 4.0;
                float field = 0.0;
                for(int i = 0; i < 6; i++) {
                    float fi = float(i);
                    vec2 offset = vec2(sin(u_time * 0.3 + fi), cos(u_time * 0.7 + fi * 1.7)) * 2.0;
                    vec2 q = p + offset;
                    float dist = length(q);
                    field += sin(dist * 15.0 - u_time * 4.0) / (1.0 + dist * dist) * 
                             exp(-dist * 0.5) * (1.0 + 0.5 * snoise(vec3(q * 0.5, u_time * 0.2)));
                }
                field *= exp(-length(uv) * 0.3);
                vec3 quantumColor = mix(colSecondary, colPink, sin(field * 5.0) * 0.5 + 0.5);
                quantumColor = mix(quantumColor, colElectricBlue, pow(abs(field), 2.0));
                color = mix(colBackground * 0.3, quantumColor, clamp(abs(field) * 3.0, 0.0, 1.0));
            }
            else if (phaseIndex == 3) { // Hyperdimensional Vortex
                vec2 p = uv;
                float angle = atan(p.y, p.x);
                float radius = length(p);
                angle += sin(radius * 8.0 - u_time * 2.0) * 0.5;
                angle += u_time * 0.5 + radius * radius * 3.0;
                
                vec2 spiral = vec2(cos(angle), sin(angle)) * radius;
                float vortex = 0.0;
                for(int i = 0; i < 5; i++) {
                    float fi = float(i) * 0.2;
                    vec2 sp = spiral * (1.0 + fi);
                    vortex += snoise(vec3(sp * 2.0, u_time * 0.4 + fi * 10.0)) * 
                              exp(-fi * 2.0) / (1.0 + radius * radius);
                }
                
                float hyperField = sin(vortex * 10.0 + radius * 20.0 - u_time * 6.0);
                hyperField *= exp(-radius * 0.8);
                
                vec3 vortexColor = mix(colDeepRed, colOrange, hyperField * 0.5 + 0.5);
                vortexColor = mix(vortexColor, colWhite, pow(abs(hyperField), 4.0));
                color = mix(colBackground, vortexColor, clamp(abs(hyperField) * 2.0, 0.0, 1.0));
            }
            else if (phaseIndex == 4) { // Tesseract Projection
                vec3 p4d = vec3(uv * 3.0, sin(u_time * 0.3));
                p4d.z += cos(length(uv) * 5.0 - u_time * 1.5);
                
                float tesseract = 0.0;
                for(int i = 0; i < 4; i++) {
                    for(int j = 0; j < 4; j++) {
                        vec3 corner = vec3(float(i) - 1.5, float(j) - 1.5, sin(u_time * 0.5 + float(i + j)));
                        corner = corner * (1.0 + 0.3 * sin(u_time * 0.2));
                        
                        float dist4d = length(p4d - corner);
                        tesseract += exp(-dist4d * 2.0) * cos(dist4d * 15.0 - u_time * 4.0);
                    }
                }
                
                float projection = tesseract * exp(-length(uv) * 0.4);
                projection += snoise(vec3(uv * 5.0, u_time * 0.3)) * 0.3;
                
                vec3 tesseractColor = mix(colSoftPurple, colLimeGreen, projection * 0.5 + 0.5);
                tesseractColor = mix(tesseractColor, colWhite, pow(clamp(projection, 0.0, 1.0), 3.0));
                color = mix(colBackground * 0.2, tesseractColor, clamp(abs(projection) * 1.5, 0.0, 1.0));
            }
            else if (phaseIndex == 5) { // Plasma Wormhole
                vec2 p = uv * 2.0;
                float wormhole = length(p);
                float time_spiral = u_time * 0.8;
                
                vec2 spiral_uv = p;
                for(int i = 0; i < 6; i++) {
                    float spiral_angle = atan(spiral_uv.y, spiral_uv.x) + time_spiral + wormhole * 5.0;
                    spiral_uv = vec2(cos(spiral_angle), sin(spiral_angle)) * length(spiral_uv);
                    spiral_uv *= 1.2;
                    wormhole += snoise(vec3(spiral_uv * 0.8, time_spiral * 0.3 + float(i))) * 
                                exp(-float(i) * 0.5) * 0.3;
                }
                
                float plasma = sin(wormhole * 12.0 - time_spiral * 3.0) * 
                               cos(wormhole * 8.0 + time_spiral * 2.0) * 
                               exp(-wormhole * 0.3);
                
                vec3 plasmaColor = mix(colTertiary, colPrimary, plasma * 0.5 + 0.5);
                plasmaColor = mix(plasmaColor, colGold, pow(abs(plasma), 2.0));
                plasmaColor = mix(plasmaColor, colWhite, pow(abs(plasma), 6.0));
                color = mix(colBackground * 0.1, plasmaColor, clamp(abs(plasma) * 2.5, 0.0, 1.0));
            }
            // --- END NEW UNGODLY PHASES ---
            else if (phaseIndex == 6) { float d=length(uv); float r=sin(d*18.-u_time*2.5)*.5+.5; r*=smoothstep(1.8,.4,d); float w=sin(uv.y*25.+u_time*1.2)*.04; vec2 wu=uv+vec2(w,sin(uv.x*15.+u_time*.8)*.03); float n=fbm(wu*3.5+u_time*.25); vec3 bc=mix(mix(colSecondary,colTertiary,r),mix(colGreen,colGold,n),.5+.5*sin(u_time*.6+d*2.)); color=mix(bc*.2,bc,r*.8+n*.6); }
            else if (phaseIndex == 7) { vec2 r=vec2(1.,1.732), h=r*.5; vec2 a=mod(uv*2.+u_time*.1,r)-h, b=mod(uv*2.-h+u_time*.1,r)-h; vec2 gv=length(a)<length(b)?a:b; float p=sin(u_time*3.5)*.5+.5, e=sin(length(gv)*25.-u_time*3.5); e=smoothstep(-.1,.15,e)-smoothstep(.15,.4,e); float ds=fbm(uv*2.5+vec2(u_time*.15,0.)); vec3 baseC=mix(colTertiary,colGreen,ds), glowC=mix(colSecondary,colPrimary,p); color=mix(baseC*.1,glowC,e*p*1.5); float dt=abs(sin(uv.x*22.+u_time*1.1))*abs(sin(uv.y*22.-u_time*1.3)); color+=glowC*dt*.08; }
            else if (phaseIndex == 8) { float a=atan(uv.y,uv.x), rd=length(uv); a+=.1*fbm(uv*.5+u_time*.05); float sa=a*6.+rd*8.-u_time*2.2, s=smoothstep(-.2,.2,sin(sa)); float rdd=rd+sin(a*10.+u_time*.3)*.08, b=fract(rdd*6.-u_time*.6); b=smoothstep(0.,.1,b)*smoothstep(.8,.5,b); float t=fbm(vec2(rdd*6.,a*3.)+u_time*.15); vec3 dc=mix(colPrimary,colDeepRed,sin(rdd*12.)*.5+.5), bc=mix(colGold,colSecondary,cos(a*4.)*.5+.5); color=mix(dc*.5,bc,b+t*.4); color+=bc*s*.3; }
            else if (phaseIndex == 9) { vec2 cu=uv*mix(3.,5.,phaseProgress); float n=fbm(cu+u_time*.2), c=0.; for(float x=-1.;x<=1.;x+=1.){for(float y=-1.;y<=1.;y+=1.){vec2 nb=vec2(x,y), cc=floor(cu)+nb, pt=cc+.5+sin(u_time*.1+cc)*.3; c+=smoothstep(.4,.38,length(cu-pt));}} c=clamp(c,0.,1.); vec3 cellC=mix(colStrangeGreen,colPrimary,n); cellC=mix(cellC,colDeepRed,smoothstep(.6,.8,n)); color=mix(colBackground*.5,cellC,c*1.2); color+=fbm(uv*15.+u_time*.5)*.05; }
            else if (phaseIndex == 10) { float t=phaseProgress; vec2 bu=floor(originalUV*mix(20.,60.,sin(u_time*2.)*.5+.5))/mix(20.,60.,sin(u_time*2.)*.5+.5); float bn=fbm(bu*5.+u_time*.5); color=mix(colPrimary,colSecondary,bn); float tl=sin(originalUV.y*10.+u_time*5.)*.5+.5, ta=smoothstep(.8,.85,tl); float ofs=ta*(rand(vec2(floor(u_time*2.),floor(originalUV.y*10.)))-.5)*.1; vec2 tu=uv+vec2(ofs*t,0.); float tn=fbm(tu*4.+u_time*.3); color=mix(color,mix(colTertiary,colDeepRed,tn),ta); float cao=(.005+.01*abs(sin(u_time*3.)))*t; vec3 cR=getColorForCA(uv+vec2(cao,0.),u_time), cB=getColorForCA(uv-vec2(cao*.5,cao*.8),u_time); color=vec3(cR.r,color.g,cB.b); color+=(rand(originalUV+fract(u_time*10.))-.5)*.15*t; }
            else if (phaseIndex == 11) { vec2 p=uv*2.; float i=fbm(p+u_time*.3), r=abs(snoise(vec3(p*1.5,u_time*.5))); r=pow(1.-r,4.); vec3 fc=mix(colPrimary,colTertiary,smoothstep(0.,1.,i)); color=mix(colBackground*.4,fc,r*1.5); color*=1.-smoothstep(.8,1.5,length(uv)); }
            else if (phaseIndex == 12) { vec2 p=uv*3.+vec2(u_time*.1,u_time*.2); float d=worley(p), e=1.-smoothstep(0.,.05,d), c=smoothstep(0.,.4,d); vec3 cc=mix(colStrangeGreen,colGold,c*1.2); color=mix(cc*.3,colWhite,e); }
            else if (phaseIndex == 13) { vec2 p=rotate2D(u_time*.4)*uv; float a=atan(p.y,p.x), rd=length(p); float t=fbm(vec2(1./(rd+.1),a*2.)+u_time*.2), r=sin(rd*20.-u_time*3.)*.5+.5; vec3 tc=mix(colSecondary,colPink,smoothstep(0.,1.,t)); color=mix(colBackground,(tc*(smoothstep(0.,.8,t)+r*.5)*.8),1.); }
            else if (phaseIndex == 14) { float s=mix(4.,8.,sin(u_time*.5)*.5+.5), p=truchetPattern(uv,s); vec2 us=uv*s; float bn=noise(floor(us)+u_time*.1); vec3 tc=mix(colPrimary,colTertiary,bn); color=mix(tc*.2,colWhite*.9,p); }
            else if (phaseIndex == 15) { float v=sin(uv.x*3.+u_time*.8)+sin(uv.y*4.-u_time*.5+sin(uv.x*3.+u_time*.8)*.5)+sin(uv.x*uv.y*2.+u_time)+sin(sqrt(pow(uv.x+.5*sin(u_time/5.),2.)+pow(uv.y+.5*cos(u_time/3.),2.))*5.+u_time); v*=.5; vec3 pc1=mix(colDeepRed,colOrange,sin(u_time*.2)*.5+.5), pc2=mix(colPrimary,colSecondary,cos(u_time*.3)*.5+.5); color=mix(pc1,pc2,smoothstep(-.8,.8,v)); }
            else if (phaseIndex == 16) { vec2 gu=originalUV*vec2(80.,60.), c=floor(gu); float sp=rand(c.x)*3.+1., ss=rand(c.x)*10., sps=fract(ss-u_time*sp*.1), cy=originalUV.y; float tl=.15+rand(c.x)*.1, ci=smoothstep(sps,sps+.01,cy)*(1.-smoothstep(sps+.01,sps+tl,cy)); float cv=rand(c+floor((ss-u_time*sp*.1)*10.)); vec3 rc=mix(colStrangeGreen*.5,colGreen*1.5,step(.5,cv)); color=mix(colBackground,rc,ci); }
            else if (phaseIndex == 17) { float z=.5+pow(mod(u_time*.05,5.)+1.,2.); vec2 c=uv*1.5/z-vec2(.7,0.), zz=vec2(0.); int it=0; for(int i=0;i<MANDELBROT_ITER;i++){zz=vec2(zz.x*zz.x-zz.y*zz.y,2.*zz.x*zz.y)+c; if(dot(zz,zz)>4.)break; it++;} float m=clamp(float(it)/float(MANDELBROT_ITER),0.,1.); m=pow(m,.5); color=mix(colBackground,mix(colPrimary,colGold,m),smoothstep(0.,.1,m)); if(it==MANDELBROT_ITER)color=colBackground*.5; }

			
			// ... [previous shader code remains unchanged] ...

        else if (phaseIndex == 18) {
            vec2 d = vec2(snoise(vec3(uv*2., u_time*.3)), snoise(vec3(uv*2.+10., u_time*.35)))*.15;
            vec2 du = uv + d;
            vec2 g = abs(fract(du*6.) - .5);
            float l = smoothstep(.03, .04, min(g.x, g.y));
            float n = fbm(du*3. + u_time*.1);
            vec3 gc = mix(colPrimary, colTertiary, n);
            color = mix(gc, colWhite, l);
        }
        else if (phaseIndex == 19) {
            vec2 p = uv * 4.0;
            float w = 0.0;
            for (int i = 0; i < 6; i++) {
                float fi = float(i);
                vec2 pos = vec2(sin(u_time*0.2 + fi*2.0), cos(u_time*0.3 + fi*1.5));
                w += sin(30.0*length(p - pos) - u_time*3.0) * exp(-length(p - pos)*2.0);
            }
            w = pow(abs(w), 0.7);
            vec3 waveColor = mix(colSecondary, colElectricBlue, w);
            color = mix(colBackground, waveColor, clamp(w*1.5, 0.0, 1.0));
        }
        else if (phaseIndex == 20) {
            vec2 p = uv * 1.5;
            float r = length(p);
            float a = atan(p.y, p.x);
            float s = sin(8.0*a + r*15.0 - u_time*2.0);
            s = smoothstep(0.7, 0.9, s) * exp(-r);
            vec3 radialColor = mix(colGold, colOrange, r*0.8);
            color = mix(colBackground, radialColor, s*1.5);
        }
        else if (phaseIndex == 21) {
            vec2 p = uv * 5.0;
            vec2 grid = abs(fract(p) - 0.5);
            float hex = smoothstep(0.05, 0.04, max(grid.x*1.2, grid.y));
            float n = fbm(p + u_time*0.2);
            vec3 hexColor = mix(colStrangeGreen, colGreen, n);
            color = mix(hexColor*0.3, hexColor, hex);
        }
        else if (phaseIndex == 22) {
            vec2 p = uv * vec2(1.0, 0.8);
            float f = fbm(p*2.0 - vec2(0.0, u_time*0.5));
            f = pow(f, 3.0);
            vec3 fire = mix(colDeepRed, colOrange, f);
            fire = mix(fire, colGold, pow(f, 2.0));
            color = mix(colBackground, fire, f*1.2);
        }
        else if (phaseIndex == 23) {
            vec2 p = originalUV * 2.0 - 1.0;
            vec3 starColor = colWhite;
            float star = 0.0;
            for (int i = 0; i < 50; i++) {
                if (i >= 30) break;
                float fi = float(i);
                vec2 pos = vec2(hash(fi*12.3), hash(fi*45.6)) * 2.0 - 1.0;
                float depth = hash(fi*78.9);
                float size = 0.01 + 0.02 * depth;
                vec2 offset = p - pos*(0.5 + depth*0.5);
                offset.x *= u_resolution.x/u_resolution.y;
                float dist = length(offset);
                star += smoothstep(size*1.5, 0.0, dist) * (0.5 + depth*0.5);
            }
            color = mix(colBackground, starColor, clamp(star, 0.0, 1.0));
        }
        else if (phaseIndex == 24) {
            vec2 p = uv * 2.0;
            float wave = sin(p.x*5.0 + u_time*2.0) * 0.1 * exp(-p.y);
            wave += sin(p.x*8.0 + u_time*1.7) * 0.05 * exp(-p.y*1.5);
            float ocean = smoothstep(0.01, 0.0, abs(p.y + wave));
            vec3 foam = mix(colSkyBlue, colWhite, ocean);
            vec3 water = mix(colBackground, colElectricBlue, smoothstep(0.0, 0.5, p.y+0.5));
            color = mix(water, foam, ocean);
        }
        else if (phaseIndex == 25) {
            vec2 p = uv * 3.0;
            float md = 10.0;
            vec2 cell;
            for (int x = -1; x <= 1; x++) {
                for (int y = -1; y <= 1; y++) {
                    vec2 grid = floor(p) + vec2(x, y);
                    vec2 point = grid + vec2(rand(grid), rand(grid+vec2(5.7, 3.1)));
                    point = 0.5 + 0.5*sin(u_time*0.3 + TWO_PI*point);
                    float dist = distance(p, grid + point);
                    if (dist < md) {
                        md = dist;
                        cell = grid;
                    }
                }
            }
            float c = rand(cell);
            vec3 cellColor = mix(mix(colPrimary, colTertiary, c), mix(colSecondary, colPink, c), 0.5);
            color = mix(cellColor*0.3, cellColor, exp(-md*5.0));
        }
        else if (phaseIndex == 26) {
            vec2 p = uv * 0.5;
            float r = length(p);
            float a = atan(p.y, p.x);
            float spiral = sin(10.0*r - 5.0*a - u_time*2.0);
            spiral = pow(abs(spiral), 0.7) * exp(-r*2.0);
            vec3 galaxy = mix(colSoftPurple, colPrimary, r*1.5);
            color = mix(colBackground, galaxy, spiral*2.0);
        }
        else if (phaseIndex == 27) {
            vec2 p = uv * 3.0;
            float e = 0.0;
            for (int i = 0; i < 5; i++) {
                float fi = float(i);
                vec2 pos = vec2(sin(u_time*0.2 + fi), cos(u_time*0.3 + fi*1.3));
                e += sin(30.0*length(p - pos) - u_time*3.0) * exp(-length(p - pos)*3.0);
            }
            e = pow(abs(e), 0.5);
            vec3 electric = mix(colSecondary, colElectricBlue, e);
            color = mix(colBackground, electric, clamp(e*1.8, 0.0, 1.0));
        }
        else if (phaseIndex == 28) {
            vec2 p = uv;
            float segments = 8.0;
            float angle = TWO_PI / segments;
            float a = atan(p.y, p.x) + angle/2.0;
            a = mod(a, angle) - angle/2.0;
            float r = length(p);
            vec2 kaleido = vec2(cos(a), sin(a)) * r;
            float n = fbm(kaleido*3.0 + u_time*0.2);
            vec3 kaleidoColor = mix(colPrimary, colPink, n);
            color = mix(colBackground, kaleidoColor, smoothstep(0.0, 0.5, r));
        }
        else if (phaseIndex == 29) {
            float pixels = mix(50.0, 150.0, sin(u_time*0.5)*0.5+0.5);
            vec2 block = floor(originalUV * pixels) / pixels;
            float n = fbm(block*5.0 + u_time*0.3);
            vec3 pixelColor = mix(colStrangeGreen, colLimeGreen, n);
            color = pixelColor;
        }
        else if (phaseIndex == 30) {
            vec2 p = uv;
            float r = length(p);
            vec2 center = vec2(sin(u_time*0.3), cos(u_time*0.4));
            float ripple = sin(20.0*(r - length(center) - u_time*3.0);
            ripple = smoothstep(0.8, 0.9, ripple) * exp(-r);
            vec3 water = mix(colSkyBlue, colElectricBlue, r);
            color = mix(colBackground, water, ripple*2.0);
        }
        else if (phaseIndex == 31) {
            vec2 gu = originalUV * vec2(80.0, 60.0);
            vec2 cell = floor(gu);
            float speed = rand(cell.x) * 3.0 + 1.0;
            float start = rand(cell.x) * 10.0;
            float position = fract(start - u_time * speed * 0.1);
            float charHeight = 0.15 + rand(cell.x)*0.1;
            float char = smoothstep(position, position+0.01, originalUV.y) * 
                       (1.0 - smoothstep(position+0.01, position+charHeight, originalUV.y));
            float charVal = rand(cell + floor((start - u_time * speed * 0.1) * 10.0));
            vec3 charColor = mix(colStrangeGreen, colLimeGreen, step(0.5, charVal));
            color = mix(colBackground, charColor, char);
        }
        else if (phaseIndex == 32) {
            vec2 p = uv * 0.5;
            float cloud = 0.0;
            for (int i = 0; i < 4; i++) {
                float fi = float(i);
                vec2 offset = vec2(sin(u_time*0.1 + fi), cos(u_time*0.15 + fi*1.7));
                cloud += snoise(vec3(p*exp(fi*0.5) + offset*0.5, u_time*0.1)) * exp(-fi);
            }
            cloud = smoothstep(0.3, 0.8, cloud);
            vec3 cloudColor = mix(colSkyBlue, colWhite, cloud);
            color = mix(colBackground, cloudColor, cloud);
        }
        else if (phaseIndex == 33) {
            vec2 gu = originalUV * vec2(100.0, 80.0);
            vec2 cell = floor(gu);
            float speed = rand(cell.x) * 2.0 + 0.5;
            float start = rand(cell.x) * 15.0;
            float position = fract(start - u_time * speed * 0.1);
            float charHeight = 0.1 + rand(cell.x)*0.05;
            float char = smoothstep(position, position+0.01, originalUV.y) * 
                       (1.0 - smoothstep(position+0.01, position+charHeight, originalUV.y));
            float charVal = rand(cell + floor((start - u_time * speed * 0.1) * 10.0));
            vec3 charColor = mix(colGreen, colLimeGreen, step(0.5, charVal));
            color = mix(colBackground*0.2, charColor, char);
        }
        else if (phaseIndex == 34) {
            vec2 p = uv;
            float r = length(p);
            float tunnel = 0.1 / r;
            float a = atan(p.y, p.x);
            float pattern = sin(tunnel * 10.0 + a * 5.0 - u_time * 3.0);
            pattern = smoothstep(0.5, 0.8, pattern);
            vec3 tunnelColor = mix(colPrimary, colSecondary, r);
            color = mix(colBackground, tunnelColor, pattern * exp(-r));
        }
        else {
            // Fallback for unhandled phases
            float t = sin(u_time) * 0.5 + 0.5;
            color = mix(colPrimary, colSecondary, t);
        }

        // Apply final output
        outColor = vec4(color, 1.0);
    }
