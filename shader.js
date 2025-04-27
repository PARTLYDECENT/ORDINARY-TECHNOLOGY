// Wrap everything in an Immediately Invoked Function Expression (IIFE)
// to avoid polluting the global scope unnecessarily, except for `window.updateShader`.
(function() {
    "use strict"; // Enable strict mode

    // --- WebGL Setup and Shader Logic ---
    const webglCanvas = document.getElementById('webglCanvas');
    let gl = null;

    if (!webglCanvas) {
        console.error("WebGL Canvas element with id 'webglCanvas' not found!");
        return;
    }

    try {
        webglCanvas.width = window.innerWidth;
        webglCanvas.height = window.innerHeight;
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
        if (document.body) document.body.style.backgroundColor = '#050511';
        return;
    }

    // --- Shader Sources ---
    const vertexShaderSource = `#version 300 es
        precision highp float;
        in vec4 a_position;
        void main() {
            gl_Position = a_position;
        }
    `;

    // Fragment Shader (GLSL 3.00 ES - Now 30 Phases) - MODIFIED
    const fragmentShaderSource = \`#version 300 es
        precision highp float;

        uniform float u_time;
        uniform vec2 u_resolution;

        out vec4 outColor;

        // --- Constants ---
        const float PI = 3.14159265359;
        const float TWO_PI = 6.28318530718;
        const int FBM_OCTAVES = 5;
        const int MAX_RAYMARCH_STEPS = 48; // Keep relatively low for performance
        const float MAX_RAYMARCH_DIST = 15.0; // Increased slightly
        const int MANDELBROT_ITER = 40;
        const float MAX_ITER_INV = 1.0 / float(MANDELBROT_ITER); // Precompute inverse

        // --- Helper Functions ---
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
        // Worley noise returning vec2(dist_to_closest, dist_to_2nd_closest)
        vec2 worley2(vec2 p) {
            vec2 d = vec2(10.0); // distance to nearest (d.x) and second nearest (d.y)
            vec2 g = floor(p);
            for (int x = -1; x <= 1; x++) {
                for (int y = -1; y <= 1; y++) {
                    vec2 n = g + vec2(float(x), float(y));
                    vec2 pt = vec2(rand(n), rand(n + vec2(7.3, 3.7)));
                    pt = 0.5 + 0.5 * sin(u_time * 0.3 + TWO_PI * pt); // Animate points
                    vec2 fp = n + pt;
                    float dist = length(p - fp);
                    if (dist < d.x) {
                        d.y = d.x; // Old nearest becomes second nearest
                        d.x = dist; // New nearest
                    } else if (dist < d.y) {
                        d.y = dist; // New second nearest
                    }
                }
            }
            return d;
        }
        float truchetPattern(vec2 uv, float s) { uv*=s; vec2 ip=floor(uv), fp=fract(uv); float r=rand(ip), t=floor(r*2.), d; if(t==0.){d=abs(fp.x+fp.y-1.)/sqrt(2.);}else{d=abs(fp.x-fp.y)/sqrt(2.);} return smoothstep(.04,.06,abs(d-.5)); }

        // --- SDF Functions (Signed Distance Functions) ---
        float sdSphere(vec3 p, float s) { return length(p) - s; }
        float sdPlane(vec3 p, vec3 n, float h) { return dot(p, n) + h; }
        float sdBox(vec3 p, vec3 b) { vec3 q = abs(p) - b; return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0); }
        float sdTorus( vec3 p, vec2 t ) { vec2 q = vec2(length(p.xz)-t.x,p.y); return length(q)-t.y; }
        // Smooth minimum function (for blending SDFs)
        float smin( float a, float b, float k ) { float h = clamp( 0.5+0.5*(b-a)/k, 0.0, 1.0 ); return mix( b, a, h ) - k*h*(1.0-h); }

        // --- Raymarching Scene Definition ---
        // Generic function for scene SDF - combine shapes here
        float mapScene(vec3 p) {
            float d = MAX_RAYMARCH_DIST; // Initialize with max distance

            // Example: Ground plane
            d = min(d, sdPlane(p, vec3(0.0, 1.0, 0.0), 1.0));

            // Example: Oscillating sphere
            vec3 spherePos = vec3(0.0, sin(u_time * 0.8) * 0.5 - 0.2, 0.0);
            d = min(d, sdSphere(p - spherePos, 0.5));

            // Add more shapes for specific scenes
            // Example: A box
            // d = min(d, sdBox(p - vec3(1.5, -0.5, 1.0), vec3(0.4)));

            return d;
        }

         // --- Backrooms Scene SDF ---
        float mapBackrooms(vec3 p) {
            // Repeating grid using modulo arithmetic
            vec3 cellID = floor(p / 4.0); // Cell size 4x4x4
            p = mod(p, 4.0) - 2.0; // Center cell coordinates between -2 and 2

            // Walls (thin boxes)
            float walls = sdBox(p, vec3(1.95, 1.95, 1.95)); // Slightly smaller than cell to create gaps
            float room = -sdBox(p, vec3(1.8, 1.9, 1.8)); // Inside of the room

            // Combine walls and room interior
            float scene = max(walls, room);

            // Ground plane (optional, depends if you want floor distinct from ceiling)
            // float ground = sdPlane(p, vec3(0,1,0), 1.95);
            // scene = min(scene, ground);

            // Add some subtle variation or objects if needed
            // float sphereDist = sdSphere(p - vec3(0.5, -1.5, 0.5), 0.2);
            // scene = min(scene, sphereDist);

            return scene;
        }

        // --- Estimate Normal using SDF Gradient ---
        vec3 calcNormal(vec3 p, float (*mapFunc)(vec3)) {
             // Use the provided map function (mapScene, mapBackrooms, etc.)
            vec2 eps = vec2(0.001, 0.0); // Small epsilon for finite differencing
            return normalize(vec3(
                mapFunc(p + eps.xyy) - mapFunc(p - eps.xyy),
                mapFunc(p + eps.yxy) - mapFunc(p - eps.yxy),
                mapFunc(p + eps.yyx) - mapFunc(p - eps.yyx)
            ));
        }

        // --- Raymarch Function ---
        // Takes ray origin, direction, map function, returns distance or -1.0 on miss
        float raymarch(vec3 ro, vec3 rd, float (*mapFunc)(vec3)) {
            float t = 0.0; // Distance traveled
            for(int i = 0; i < MAX_RAYMARCH_STEPS; i++) {
                vec3 p = ro + rd * t;
                float d = mapFunc(p); // Distance to nearest surface from map function

                if(abs(d) < 0.001 * t || t > MAX_RAYMARCH_DIST) { // Hit or exceeded max distance
                    break;
                }
                t += d * 0.9; // March forward (step slightly less than d for robustness)
            }
            return (t < MAX_RAYMARCH_DIST) ? t : -1.0; // Return distance or -1.0 for miss
        }


        // --- Color Definitions ---
        vec3 colPrimary = vec3(106./255., 0., 1.);
        vec3 colSecondary = vec3(0., 1., 204./255.);
        vec3 colTertiary = vec3(0., 184./255., 212./255.);
        vec3 colGreen = vec3(0.1, 0.8, 0.4);
        vec3 colGold = vec3(0.9, 0.7, 0.1);
        vec3 colStrangeGreen = vec3(0.1, 0.4, 0.2);
        vec3 colDeepRed = vec3(0.6, 0.0, 0.15);
        vec3 colWhite = vec3(1.0);
        vec3 colOrange = vec3(1.0, 0.5, 0.0);
        vec3 colPink = vec3(1.0, 0.4, 0.7);
        vec3 colBackground = vec3(5./255., 5./255., 17./255.);
        vec3 colBackroomsYellow = vec3(1.0, 0.9, 0.6) * 0.8; // Unsettling yellow
        vec3 colFlicker = vec3(1.1, 1.05, 0.9); // Flicker color boost


        // --- Basic Diffuse Lighting ---
        vec3 basicLighting(vec3 normal, vec3 lightDir, vec3 surfaceColor, vec3 ambientColor) {
            float diffuse = max(0.0, dot(normal, lightDir));
            return ambientColor + surfaceColor * diffuse;
        }

        vec3 getColorForCA(vec2 uv, float t) { float n = fbm(uv*4. + t*.15); return mix(colPrimary, colTertiary, n); }

        // --- Main Shader Logic ---
        void main() {
            vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / min(u_resolution.y, u_resolution.x);
            vec2 originalUV = gl_FragCoord.xy / u_resolution.xy;

            // Use the slower speed from previous request
            float time_warp = u_time * 0.05; // Slower phase speed
            // ***** MODIFICATION: Increased total phases *****
            const float TOTAL_PHASES_F = 30.0;
            // ***** END MODIFICATION *****

            float phase = mod(time_warp, TOTAL_PHASES_F);
            float phaseProgress = fract(phase);
            int phaseIndex = int(floor(phase));

            vec3 color = colBackground; // Start with background

            // --- Phase Implementations (0-19 remain the same) ---
            if (phaseIndex == 0) { float wf=.1+.05*sin(u_time*.2); wf=max(.001,wf); float z=.1/max(.01,.1-uv.y*wf+.02*fbm(uv+u_time*.05)); z=clamp(z,.1,15.); vec2 warp=uv*z; vec2 grid=abs(fract(warp*vec2(5.,3.)+u_time*.1)-.5); float line=smoothstep(.04,.05,min(grid.x,grid.y))*.6; float df=fract(z*.1+u_time*.15); vec3 bc=mix(mix(colPrimary,colTertiary,sin(u_time*.1)*.5+.5),colSecondary,sin(length(warp)*.5-u_time*.5)*.5+.5); color=mix(bc*.15,bc,line*df*1.5); }
            else if (phaseIndex == 1) { float d=length(uv); float r=sin(d*18.-u_time*2.5)*.5+.5; r*=smoothstep(1.8,.4,d); float w=sin(uv.y*25.+u_time*1.2)*.04; vec2 wu=uv+vec2(w,sin(uv.x*15.+u_time*.8)*.03); float n=fbm(wu*3.5+u_time*.25); vec3 bc=mix(mix(colSecondary,colTertiary,r),mix(colGreen,colGold,n),.5+.5*sin(u_time*.6+d*2.)); color=mix(bc*.2,bc,r*.8+n*.6); }
            else if (phaseIndex == 2) { vec2 r=vec2(1.,1.732), h=r*.5; vec2 a=mod(uv*2.+u_time*.1,r)-h, b=mod(uv*2.-h+u_time*.1,r)-h; vec2 gv=length(a)<length(b)?a:b; float p=sin(u_time*3.5)*.5+.5, e=sin(length(gv)*25.-u_time*3.5); e=smoothstep(-.1,.15,e)-smoothstep(.15,.4,e); float ds=fbm(uv*2.5+vec2(u_time*.15,0.)); vec3 baseC=mix(colTertiary,colGreen,ds), glowC=mix(colSecondary,colPrimary,p); color=mix(baseC*.1,glowC,e*p*1.5); float dt=abs(sin(uv.x*22.+u_time*1.1))*abs(sin(uv.y*22.-u_time*1.3)); color+=glowC*dt*.08; }
            else if (phaseIndex == 3) { float a=atan(uv.y,uv.x), rd=length(uv); a+=.1*fbm(uv*.5+u_time*.05); float sa=a*6.+rd*8.-u_time*2.2, s=smoothstep(-.2,.2,sin(sa)); float rdd=rd+sin(a*10.+u_time*.3)*.08, b=fract(rdd*6.-u_time*.6); b=smoothstep(0.,.1,b)*smoothstep(.8,.5,b); float t=fbm(vec2(rdd*6.,a*3.)+u_time*.15); vec3 dc=mix(colPrimary,colDeepRed,sin(rdd*12.)*.5+.5), bc=mix(colGold,colSecondary,cos(a*4.)*.5+.5); color=mix(dc*.5,bc,b+t*.4); color+=bc*s*.3; }
            else if (phaseIndex == 4) { vec2 cu=uv*mix(3.,5.,phaseProgress); float n=fbm(cu+u_time*.2), c=0.; for(float x=-1.;x<=1.;x+=1.){for(float y=-1.;y<=1.;y+=1.){vec2 nb=vec2(x,y), cc=floor(cu)+nb, pt=cc+.5+sin(u_time*.1+cc)*.3; c+=smoothstep(.4,.38,length(cu-pt));}} c=clamp(c,0.,1.); vec3 cellC=mix(colStrangeGreen,colPrimary,n); cellC=mix(cellC,colDeepRed,smoothstep(.6,.8,n)); color=mix(colBackground*.5,cellC,c*1.2); color+=fbm(uv*15.+u_time*.5)*.05; }
            else if (phaseIndex == 5) { float t=phaseProgress; vec2 bu=floor(originalUV*mix(20.,60.,sin(u_time*2.)*.5+.5))/mix(20.,60.,sin(u_time*2.)*.5+.5); float bn=fbm(bu*5.+u_time*.5); color=mix(colPrimary,colSecondary,bn); float tl=sin(originalUV.y*10.+u_time*5.)*.5+.5, ta=smoothstep(.8,.85,tl); float ofs=ta*(rand(vec2(floor(u_time*2.),floor(originalUV.y*10.)))-.5)*.1; vec2 tu=uv+vec2(ofs*t,0.); float tn=fbm(tu*4.+u_time*.3); color=mix(color,mix(colTertiary,colDeepRed,tn),ta); float cao=(.005+.01*abs(sin(u_time*3.)))*t; vec3 cR=getColorForCA(uv+vec2(cao,0.),u_time), cB=getColorForCA(uv-vec2(cao*.5,cao*.8),u_time); color=vec3(cR.r,color.g,cB.b); color+=(rand(originalUV+fract(u_time*10.))-.5)*.15*t; }
            else if (phaseIndex == 6) { vec2 p=uv*2.; float i=fbm(p+u_time*.3), r=abs(snoise(vec3(p*1.5,u_time*.5))); r=pow(1.-r,4.); vec3 fc=mix(colPrimary,colTertiary,smoothstep(0.,1.,i)); color=mix(colBackground*.4,fc,r*1.5); color*=1.-smoothstep(.8,1.5,length(uv)); }
            else if (phaseIndex == 7) { vec2 p=uv*3.+vec2(u_time*.1,u_time*.2); float d=worley(p), e=1.-smoothstep(0.,.05,d), c=smoothstep(0.,.4,d); vec3 cc=mix(colStrangeGreen,colGold,c*1.2); color=mix(cc*.3,colWhite,e); }
            else if (phaseIndex == 8) { vec2 p=rotate2D(u_time*.4)*uv; float a=atan(p.y,p.x), rd=length(p); float t=fbm(vec2(1./(rd+.1),a*2.)+u_time*.2), r=sin(rd*20.-u_time*3.)*.5+.5; vec3 tc=mix(colSecondary,colPink,smoothstep(0.,1.,t)); color=mix(colBackground,tc,(smoothstep(0.,.8,t)+r*.5)*.8); }
            else if (phaseIndex == 9) { float s=mix(4.,8.,sin(u_time*.5)*.5+.5), p=truchetPattern(uv,s); vec2 us=uv*s; float bn=noise(floor(us)+u_time*.1); vec3 tc=mix(colPrimary,colTertiary,bn); color=mix(tc*.2,colWhite*.9,p); }
            else if (phaseIndex == 10) { float v=sin(uv.x*3.+u_time*.8)+sin(uv.y*4.-u_time*.5+sin(uv.x*3.+u_time*.8)*.5)+sin(uv.x*uv.y*2.+u_time)+sin(sqrt(pow(uv.x+.5*sin(u_time/5.),2.)+pow(uv.y+.5*cos(u_time/3.),2.))*5.+u_time); v*=.5; vec3 pc1=mix(colDeepRed,colOrange,sin(u_time*.2)*.5+.5), pc2=mix(colPrimary,colSecondary,cos(u_time*.3)*.5+.5); color=mix(pc1,pc2,smoothstep(-.8,.8,v)); }
            else if (phaseIndex == 11) { vec2 gu=originalUV*vec2(80.,60.), c=floor(gu); float sp=rand(c.x)*3.+1., ss=rand(c.x)*10., sps=fract(ss-u_time*sp*.1), cy=originalUV.y; float tl=.15+rand(c.x)*.1, ci=smoothstep(sps,sps+.01,cy)*(1.-smoothstep(sps+.01,sps+tl,cy)); float cv=rand(c+floor((ss-u_time*sp*.1)*10.)); vec3 rc=mix(colStrangeGreen*.5,colGreen*1.5,step(.5,cv)); color=mix(colBackground,rc,ci); }
            else if (phaseIndex == 12) { float z=.5+pow(mod(u_time*.05,5.)+1.,2.); vec2 c=uv*1.5/z-vec2(.7,0.), zz=vec2(0.); int it=0; for(int i=0;i<MANDELBROT_ITER;i++){zz=vec2(zz.x*zz.x-zz.y*zz.y,2.*zz.x*zz.y)+c; if(dot(zz,zz)>4.)break; it++;} float m=clamp(float(it)*MAX_ITER_INV,0.,1.); m=pow(m,.5); color=mix(colBackground,mix(colPrimary,colGold,m),smoothstep(0.,.1,m)); if(it==MANDELBROT_ITER)color=colBackground*.5; }
            else if (phaseIndex == 13) { vec2 d=vec2(snoise(vec3(uv*2.,u_time*.3)),snoise(vec3(uv*2.+10.,u_time*.35)))*.15, du=uv+d; vec2 g=abs(fract(du*6.)-.5); float l=smoothstep(.03,.04,min(g.x,g.y)); float n=fbm(du*3.+u_time*.1); vec3 gc=mix(colTertiary,colPink,n); color=mix(colBackground*.5,gc,l*1.2); }
            else if (phaseIndex == 14) { float h=snoise(vec3(uv*1.5,u_time*.2)), f=snoise(vec3(uv*3.+h*.3,u_time*.4)); float la=.785, l=clamp(.5+h*.5*cos(atan(uv.y,uv.x)-la),.2,1.); vec3 tc=mix(colGreen*.8,colGold*.6,h*.5+.5), wc=mix(colPrimary*.7,colTertiary*.9,f*.5+.5); color=mix(wc,tc*l,smoothstep(-.1,.1,h))*.8; }
            else if (phaseIndex == 15) { vec2 p=abs(uv)*.8; float s=1.5+.5*sin(u_time*.4); for(int i=0;i<4;i++){ p=abs(p*s-1.); if(dot(p,p)>20.)break; } float r=sin(length(p)*.2*10.+u_time); color=mix(colSecondary,colPrimary,smoothstep(-.5,.5,r)); }
            else if (phaseIndex == 16) { vec2 p=uv*2.5; float d1=worley(p), d2=worley(p+vec2(5.2,1.3)); float c=pow(1.-smoothstep(0.,.1,d1),2.)+pow(1.-smoothstep(0.,.05,d2),2.)*.5; c=clamp(c,0.,1.); float g=fbm(p*10.+u_time*.1); vec3 cc=mix(colWhite*.8,colTertiary,g); color=mix(colBackground*.8,cc,c); }
            else if (phaseIndex == 17) { float i=.5+.5*noise(vec2(u_time*1.5,originalUV.y*5.)); float fs=floor(u_time*15.)+floor(originalUV.y*10.), f=rand(fs); i*=smoothstep(.2,.8,f); vec3 bc=mix(colPrimary,colSecondary,noise(uv*3.+u_time*.2)); float sy=fract(originalUV.y*u_resolution.y*.5), se=smoothstep(.4,.5,sy)*(1.-smoothstep(.5,.6,sy)); color=mix(bc*.5,vec3(0.),se*i*1.5); color+=(rand(originalUV+u_time)-.5)*.1*i; }
            else if (phaseIndex == 18) { vec3 ro=vec3(0.,0.,-3.+sin(u_time*.3)), rd=normalize(vec3(uv,1.)); vec3 col=colBackground; float t = raymarch(ro, rd, mapScene); if (t > 0.0) { vec3 p = ro + rd * t; vec3 n = calcNormal(p, mapScene); vec3 lightDir = normalize(vec3(-0.7, 0.7, -0.5)); float diffuse = max(0.0, dot(n, lightDir)); vec3 surfCol = (abs(p.x) > 1.9 || abs(p.z) > 1.9) ? colGreen * 0.8 : colPrimary; // Crude plane/sphere check based on position
                col = basicLighting(n, lightDir, surfCol, colBackground * 0.2); } else { col = colBackground; } color=col; }
            else if (phaseIndex == 19) { float rd=length(uv), s=0.; for(float i=0.;i<15.;i++){ float seed=i*13.37, st=u_time*(.5+rand(seed))*1.5+rand(seed+1.)*10., sd=fract(st)*3., sa=rand(seed+2.)*TWO_PI+u_time*rand(seed+3.)*.05; vec2 sp=vec2(cos(sa),sin(sa))*sd; float ds=length(uv-sp), sl=.02+sd*.1, si=smoothstep(sl,0.,ds)*(1.-smoothstep(1.,1.5,sd)); s+=si; } vec3 sc=mix(colWhite,colSecondary,clamp(rd*.5,0.,1.)); color=mix(colBackground,sc,clamp(s,0.,1.)); }

            // ***** NEW PHASES START HERE *****

            // Phase 20: Backrooms Grid (Liminal Space)
            else if (phaseIndex == 20) {
                vec3 ro = vec3(0.0, 0.0, u_time * 0.5); // Slowly move forward
                vec3 target = ro + vec3(0.0, 0.0, 1.0); // Look forward
                vec3 camUp = vec3(0.0, 1.0, 0.0);
                // Basic camera setup
                vec3 ww = normalize(target - ro);
                vec3 uu = normalize(cross(ww, camUp));
                vec3 vv = normalize(cross(uu, ww));
                vec3 rd = normalize(uv.x * uu + uv.y * vv + 1.5 * ww); // Adjust FOV with 1.5

                vec3 col = colBackground;
                float t = raymarch(ro, rd, mapBackrooms);

                if (t > 0.0) {
                    vec3 p = ro + rd * t;
                    vec3 n = calcNormal(p, mapBackrooms);
                    // Flat, eerie lighting
                    float ambient = 0.4 + 0.6 * n.y; // Slightly brighter ceiling/floor
                    float fog = 1.0 - smoothstep(5.0, MAX_RAYMARCH_DIST * 0.8, t); // Fog
                    col = colBackroomsYellow * ambient * fog;
                    // Add subtle noise flicker
                    col *= 0.95 + 0.1 * rand(gl_FragCoord.xy / 50.0 + fract(u_time * 5.0));
                } else {
                    col = colBackground; // Hit nothing (or sky)
                }
                color = col;
            }

            // Phase 21: Uncanny Flicker
            else if (phaseIndex == 21) {
                 float flickerSpeed = 15.0 + 10.0 * sin(u_time * 0.3);
                 float flicker = 0.5 + 0.5 * noise(vec2(u_time * flickerSpeed, originalUV.y * 2.0));
                 float harshFlicker = smoothstep(0.7, 0.72, flicker) + smoothstep(0.3, 0.28, flicker); // More on/off
                 float baseNoise = fbm(uv * 2.0 + u_time * 0.1);
                 vec3 baseCol = mix(colStrangeGreen, colBackroomsYellow * 0.7, baseNoise);
                 color = baseCol * (0.6 + harshFlicker * 0.6) + colFlicker * harshFlicker * 0.1;
                 // Add scanline effect intensified by flicker
                 float scanline = 0.5 + 0.5 * sin(originalUV.y * u_resolution.y * 0.7 + u_time);
                 color *= 1.0 - smoothstep(0.4, 0.5, scanline) * 0.2 * harshFlicker;
            }

             // Phase 22: Distorted Wallpaper
            else if (phaseIndex == 22) {
                // Create distortion field using noise
                vec2 distOffset = vec2(snoise(vec3(uv * 1.5, u_time * 0.2)),
                                       snoise(vec3(uv * 1.5 + 50.0, u_time * 0.2))) * 0.3;
                vec2 distortedUV = uv + distOffset;

                // Simple repeating pattern UVs
                vec2 patternUV = fract(distortedUV * 5.0); // 5x5 grid
                // Basic geometric pattern (e.g., diamonds)
                float pattern = abs(patternUV.x - 0.5) + abs(patternUV.y - 0.5); // Diamond shape
                pattern = smoothstep(0.2, 0.25, pattern); // Make lines
                pattern = 1.0 - pattern;

                // Choose faded, sickly colors
                vec3 col1 = vec3(0.6, 0.55, 0.4); // Faded brown
                vec3 col2 = vec3(0.4, 0.5, 0.45); // Faded green/grey
                float patternNoise = noise(floor(distortedUV * 5.0) + 0.1); // Noise per tile
                vec3 tileCol = mix(col1, col2, patternNoise);

                color = mix(tileCol * 0.8, tileCol * 1.1, pattern); // Apply pattern lines
                color *= 0.8 + 0.2 * noise(distortedUV * 20.0 + u_time * 0.5); // Add grain/dirt
            }

             // Phase 23: Simple Raymarched Hallway (uses mapBackrooms)
            else if (phaseIndex == 23) {
                 // Re-use phase 20's raymarching setup but maybe different camera/lighting
                 vec3 ro = vec3(sin(u_time * 0.1) * 0.5, 0.0, u_time * 0.7); // Move faster, slight sway
                 vec3 target = ro + vec3(sin(u_time * 0.2) * 0.2, 0.0, 1.0); // Look slightly side-to-side
                 vec3 camUp = vec3(0.0, 1.0, 0.0);
                 vec3 ww = normalize(target - ro);
                 vec3 uu = normalize(cross(ww, camUp));
                 vec3 vv = normalize(cross(uu, ww));
                 vec3 rd = normalize(uv.x * uu + uv.y * vv + 1.8 * ww); // Slightly wider FOV

                 vec3 col = colBackground;
                 float t = raymarch(ro, rd, mapBackrooms);

                 if (t > 0.0) {
                     vec3 p = ro + rd * t;
                     vec3 n = calcNormal(p, mapBackrooms);
                     vec3 lightDir = normalize(vec3(0.1, 0.5, -0.5)); // Dim overhead light
                     float diffuse = max(0.0, dot(n, lightDir));
                     float fog = 1.0 - smoothstep(8.0, MAX_RAYMARCH_DIST * 0.9, t);
                     col = colBackroomsYellow * (0.1 + diffuse * 0.7) * fog; // Very ambient + dim diffuse
                 } else {
                     col = colBackground * 0.5; // Darker background
                 }
                 color = col;
             }

            // Phase 24: Unsettling Noise Field (Worley F2-F1)
            else if (phaseIndex == 24) {
                vec2 p = uv * (2.0 + 1.0 * sin(u_time * 0.15)); // Slowly pulsating zoom
                vec2 w = worley2(p); // Get F1 and F2 distances
                float val = w.y - w.x; // F2 - F1 creates cellular boundaries

                float noiseVal = fbm(p * 3.0 + u_time * 0.2); // Underlying noise

                vec3 c1 = colStrangeGreen * 0.8;
                vec3 c2 = colDeepRed * 0.6;
                vec3 c3 = colBackroomsYellow * 0.5;

                color = mix(c1, c2, smoothstep(0.0, 0.15, val)); // Mix based on cell boundary value
                color = mix(color, c3, smoothstep(0.4, 0.8, noiseVal)); // Mix based on noise
                color *= 0.7 + 0.5 * smoothstep(0.05, 0.0, w.x); // Darken cell centers
            }

            // Phase 25: Raymarched Twisting Tunnel
            else if (phaseIndex == 25) {
                vec3 ro = vec3(0.0, 0.0, u_time * 1.5); // Faster movement
                vec3 rd = normalize(vec3(uv, 1.0)); // Simple forward looking ray

                // Apply rotation to the ray direction based on distance (z)
                float angle = ro.z * 0.1; // Twist increases with distance
                mat2 rot = rotate2D(angle);
                rd.xy = rot * rd.xy;

                // SDF for a simple cylinder tunnel
                float mapTunnel(vec3 p) {
                    // Twist the query point as well
                    p.xy = rotate2D(-p.z * 0.1) * p.xy;
                    return length(p.xy) - (1.0 + 0.2 * sin(p.z * 0.5 + u_time)); // Pulsating radius
                }

                vec3 col = colBackground;
                float t = raymarch(ro, rd, mapTunnel);

                if (t > 0.0) {
                    vec3 p = ro + rd * t;
                    vec3 n = calcNormal(p, mapTunnel);
                    // Use distance and normal for coloring
                    float pattern = fract((p.z - atan(p.y, p.x)*0.5) * 0.5);
                    pattern = smoothstep(0.4, 0.5, pattern) - smoothstep(0.5, 0.6, pattern);
                    vec3 surfCol = mix(colPrimary, colTertiary, abs(n.z));
                    col = surfCol * (0.5 + 0.5 * pattern);
                    col *= exp(-t * 0.1); // Fog
                } else {
                    col = colBackground;
                }
                color = col;
            }

            // Phase 26: Raymarched Metaballs
            else if (phaseIndex == 26) {
                vec3 ro = vec3(0.0, 0.0, -4.0 + u_time * 0.3);
                vec3 rd = normalize(vec3(uv, 1.0));

                // Define metaball positions and radii
                float radius = 0.5;
                vec3 pos1 = vec3(sin(u_time * 0.8)       , cos(u_time * 0.5)       , sin(u_time * 0.3)) * 1.5;
                vec3 pos2 = vec3(cos(u_time * 0.7 + 1.0) , sin(u_time * 0.9 + 2.0) , cos(u_time * 0.4 + 3.0)) * 1.5;
                vec3 pos3 = vec3(sin(u_time * 0.6 + 4.0) , cos(u_time * 0.4 + 5.0) , sin(u_time * 0.8 + 6.0)) * 1.5;

                // Scene SDF using smooth minimum
                float mapMetaballs(vec3 p) {
                    float d1 = sdSphere(p - pos1, radius);
                    float d2 = sdSphere(p - pos2, radius);
                    float d3 = sdSphere(p - pos3, radius);
                    float d = smin(d1, d2, 0.5); // Blend first two (k controls smoothness)
                    d = smin(d, d3, 0.5); // Blend result with third
                    return d;
                }

                vec3 col = colBackground;
                float t = raymarch(ro, rd, mapMetaballs);

                if (t > 0.0) {
                    vec3 p = ro + rd * t;
                    vec3 n = calcNormal(p, mapMetaballs);
                    vec3 lightDir = normalize(vec3(0.5, 0.8, -0.3));
                    vec3 surfCol = mix(colSecondary, colPink, clamp(p.y * 0.5 + 0.5, 0.0, 1.0)); // Color by height
                    col = basicLighting(n, lightDir, surfCol, vec3(0.1));
                    col *= exp(-t * 0.2); // Fog
                } else {
                    col = colBackground;
                }
                color = col;
            }

            // Phase 27: Simplified Raymarched Fractal (Box Fold)
            else if (phaseIndex == 27) {
                 vec3 ro = vec3(0.0, 0.0, -3.0 + u_time * 0.2); // Slow zoom in
                 vec3 rd = normalize(vec3(uv, 1.0));

                 float mapFractal(vec3 p) {
                    vec3 p0 = p; // Store original point for coloring maybe
                    float scale = 2.0 + 0.2 * sin(u_time * 0.1); // Slowly changing scale
                    float boxFoldFactor = 1.0; // Amount to fold inwards
                    float sphereScale = 1.0; // Size of the base sphere

                    // Iterate folding
                    for(int i = 0; i < 5; i++) { // Low iteration count
                        p = clamp(p, -boxFoldFactor, boxFoldFactor) * 2.0 - p; // Box fold
                        p = p * scale;
                        // Optional: Add other simple transformations like rotation
                        // p.xy = rotate2D(0.1) * p.xy;
                    }
                    // Base shape after folding (a sphere)
                    return (length(p) - sphereScale) / pow(scale, 5.0); // Divide by scale factor
                 }

                 vec3 col = colBackground;
                 float t = raymarch(ro, rd, mapFractal);

                 if (t > 0.0) {
                     vec3 p = ro + rd * t;
                     vec3 n = calcNormal(p, mapFractal);
                     // Color based on normal and position/iterations (tricky for fractals)
                     vec3 surfCol = vec3(0.5) + 0.5 * n; // Normal visualization is often used
                     surfCol = mix(colGold, colPrimary, surfCol.x);
                     col = surfCol * max(0.1, dot(n, normalize(vec3(0.577)))); // Basic directional light
                     col *= exp(-t*0.15); // Fog
                 } else {
                    col = colBackground;
                 }
                 color = col;
            }

            // Phase 28: Glitchy Data Stream
            else if (phaseIndex == 28) {
                // Base noise
                float base = fbm(uv * 3.0 + u_time * 0.2);
                color = mix(colPrimary * 0.5, colTertiary * 0.7, base);

                // Horizontal glitch bars
                float barY = floor(originalUV.y * 20.0); // ~20 bars
                float barSpeed = rand(barY) * 5.0 + 2.0;
                float barOffset = fract(u_time * barSpeed * 0.2 + rand(barY+1.0));
                float barWidth = 0.05 + rand(barY + 2.0) * 0.2;
                float barMask = smoothstep(barOffset - barWidth*0.5, barOffset, originalUV.x) *
                                (1.0 - smoothstep(barOffset, barOffset + barWidth*0.5, originalUV.x));

                // Apply glitch within the bar
                if (barMask > 0.0) {
                    vec2 glitchUV = uv + vec2(rand(barY + fract(u_time*5.0)) * 0.1 - 0.05, 0.0);
                    float glitchNoise = fbm(glitchUV * 10.0 + u_time * 2.0);
                    color = mix(color, mix(colRed, colWhite, glitchNoise), barMask * 0.8);
                    color += (rand(originalUV + fract(u_time * 20.0)) - 0.5) * barMask * 0.2; // Additive noise
                }
            }

            // Phase 29: Interference Pattern
            else if (phaseIndex == 29) {
                 // Define moving source points
                 vec2 src1 = vec2(sin(u_time * 0.5), cos(u_time * 0.3)) * 0.8;
                 vec2 src2 = vec2(cos(u_time * 0.4 + 1.0), sin(u_time * 0.6 + 2.0)) * 0.7;
                 vec2 src3 = vec2(sin(u_time * 0.7 + 3.0), cos(u_time * 0.5 + 4.0)) * 0.9;

                 // Calculate wave values based on distance
                 float wave1 = sin(length(uv - src1) * 20.0 - u_time * 5.0);
                 float wave2 = sin(length(uv - src2) * 25.0 - u_time * 6.0);
                 float wave3 = cos(length(uv - src3) * 18.0 + u_time * 4.0);

                 // Combine waves
                 float interference = (wave1 + wave2 + wave3) / 3.0;
                 interference = pow(abs(interference), 0.7); // Enhance contrast

                 color = mix(colSecondary, colPink, smoothstep(-0.5, 0.5, wave1));
                 color = mix(color, colPrimary, smoothstep(0.3, 0.8, interference));

                 // Add sharp highlights
                 color += vec3(1.0) * pow(max(0.0, interference - 0.7), 2.0) * 2.0;
             }

            // ***** END NEW PHASES *****


            // --- Global Effects (Applied to all phases) ---
            float scanlineVal = sin(originalUV.y * u_resolution.y * 0.8 + u_time * 0.1) * 0.5 + 0.5;
            float scanlineIntensity = 0.03 + 0.015 * sin(u_time * 0.5);
            color = mix(color, color * (1.0 - scanlineIntensity * 0.8), smoothstep(0.3, 0.0, scanlineVal));
            color = mix(color, color * (1.0 + scanlineIntensity * 0.5), smoothstep(0.7, 1.0, scanlineVal));
            float vignette = smoothstep(1.5, 0.5, length(uv));
            color *= vignette;

            outColor = vec4(clamp(color, 0.0, 1.0), 1.0);
        }
    \`; // End template literal for fragmentShaderSource

    // --- WebGL Utility Functions ---
    function createShader(type, source) {
        const shader = gl.createShader(type);
        if (!shader) { throw new Error(\`Failed to create shader (type: \${type})\`); }
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            const shaderType = type === gl.VERTEX_SHADER ? 'Vertex' : 'Fragment';
            const infoLog = gl.getShaderInfoLog(shader);
            console.error(\`>>> Shader compile error (\${shaderType}):\\n\${infoLog}\`);
            const lines = source.split('\\n');
            const sourceWithLines = lines.map((line, index) => \`\${index + 1}: \${line}\`).join('\\n');
            console.error(\`--- Shader Source (\${shaderType}) ---\\n\${sourceWithLines}\\n--------------------------\`);
            gl.deleteShader(shader);
            throw new Error(\`Shader compilation failed: \${shaderType}\`);
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
            const shaders = gl.getAttachedShaders(program);
            if (shaders) {
                 shaders.forEach(shader => {
                     const type = gl.getShaderParameter(shader, gl.SHADER_TYPE);
                     const shaderType = type === gl.VERTEX_SHADER ? 'Vertex' : 'Fragment';
                     console.error(\`--- Attached \${shaderType} Shader Info Log ---\\n\${gl.getShaderInfoLog(shader)}\`);
                 });
            }
            gl.deleteProgram(program);
            throw new Error("Program linking failed");
        }
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
    let animationFrameId = null;
    let startTime = performance.now();

    // --- Initialize WebGL Program and Buffers ---
    function setupWebGL() {
        let vs = null;
        let fs = null;
        try {
            vs = createShader(gl.VERTEX_SHADER, vertexShaderSource);
            fs = createShader(gl.FRAGMENT_SHADER, fragmentShaderSource);
            program = createProgram(vs, fs);

            positionAttributeLocation = gl.getAttribLocation(program, "a_position");
            timeUniformLocation = gl.getUniformLocation(program, "u_time");
            resolutionUniformLocation = gl.getUniformLocation(program, "u_resolution");

            if (positionAttributeLocation === -1) console.warn("Attribute 'a_position' not found.");
            if (!timeUniformLocation) console.warn("Uniform 'u_time' not found.");
            if (!resolutionUniformLocation) console.warn("Uniform 'u_resolution' not found.");

            positionBuffer = gl.createBuffer();
            if (!positionBuffer) throw new Error("Failed to create position buffer");
            gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
            const positions = new Float32Array([-1, 1, -1, -1, 1, 1, 1, -1]);
            gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

            return true; // Success

        } catch (error) {
            console.error(">>> Failed during WebGL setup:", error);
            if (program) gl.deleteProgram(program);
            if (vs) gl.deleteShader(vs);
            if (fs) gl.deleteShader(fs);
            if (positionBuffer) gl.deleteBuffer(positionBuffer);
            program = null;
            return false; // Failure
        } finally {
            if (vs) gl.deleteShader(vs);
            if (fs) gl.deleteShader(fs);
        }
    }

    // --- Render Loop ---
    function render(now) {
        if (!program) {
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
            return;
        }
        let time = (now - startTime) * 0.001;

        const currentWidth = window.innerWidth;
        const currentHeight = window.innerHeight;
        if (webglCanvas.width !== currentWidth || webglCanvas.height !== currentHeight) {
            webglCanvas.width = currentWidth;
            webglCanvas.height = currentHeight;
            gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        }

        gl.useProgram(program);

        if (positionAttributeLocation !== -1 && positionBuffer) {
            gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
            gl.enableVertexAttribArray(positionAttributeLocation);
            gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);
        } else {
             if (positionAttributeLocation !== -1) gl.disableVertexAttribArray(positionAttributeLocation);
        }

        if (timeUniformLocation) { gl.uniform1f(timeUniformLocation, time); }
        if (resolutionUniformLocation) { gl.uniform2f(resolutionUniformLocation, gl.canvas.width, gl.canvas.height); }

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        animationFrameId = requestAnimationFrame(render);
    }

    // --- Function to Update Shader Dynamically ---
    // Expose to global scope
    window.updateShader = function(newShaderCode) {
        if (!gl) {
            console.warn("WebGL context not available. Cannot update shader.");
            if(typeof showNotification === 'function') showNotification("WebGL inactive. Cannot update shader.");
            return;
        }
        console.log("Attempting shader update...");

        if (!newShaderCode || typeof newShaderCode !== 'string' || newShaderCode.indexOf('main()') === -1) {
             console.error("Invalid shader code provided: Missing main() or not a string.");
             if(typeof showNotification === 'function') showNotification("Invalid shader code: Missing main().");
             return;
        }

         // Rebuild the complete source string for the new fragment shader
         // This assumes the helper functions and uniforms outside main() are still needed
         const completeNewFragmentSource = \`#version 300 es
            precision highp float;
            uniform float u_time;
            uniform vec2 u_resolution;
            out vec4 outColor;

            // --- Constants (ensure these are consistent if needed by helpers/main) ---
            const float PI = 3.14159265359;
            const float TWO_PI = 6.28318530718;
            const int FBM_OCTAVES = 5;
            const int MAX_RAYMARCH_STEPS = 48;
            const float MAX_RAYMARCH_DIST = 15.0;
            const int MANDELBROT_ITER = 40;
            const float MAX_ITER_INV = 1.0 / float(MANDELBROT_ITER);

            // --- Helper Functions (Copy from original shader source) ---
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
             vec2 worley2(vec2 p) { vec2 d=vec2(10.); vec2 g=floor(p); for(int x=-1;x<=1;x++){ for(int y=-1;y<=1;y++){ vec2 n=g+vec2(float(x),float(y)); vec2 pt=vec2(rand(n),rand(n+vec2(7.3,3.7))); pt=.5+.5*sin(u_time*.3+TWO_PI*pt); vec2 fp=n+pt; float dist=length(p-fp); if(dist<d.x){d.y=d.x;d.x=dist;}else if(dist<d.y){d.y=dist;}}} return d; }
             float truchetPattern(vec2 uv, float s) { uv*=s; vec2 ip=floor(uv), fp=fract(uv); float r=rand(ip), t=floor(r*2.), d; if(t==0.){d=abs(fp.x+fp.y-1.)/sqrt(2.);}else{d=abs(fp.x-fp.y)/sqrt(2.);} return smoothstep(.04,.06,abs(d-.5)); }
             float sdSphere(vec3 p, float s) { return length(p) - s; }
             float sdPlane(vec3 p, vec3 n, float h) { return dot(p, n) + h; }
             float sdBox(vec3 p, vec3 b) { vec3 q=abs(p)-b; return length(max(q,0.))+min(max(q.x,max(q.y,q.z)),0.); }
             float sdTorus( vec3 p, vec2 t ) { vec2 q=vec2(length(p.xz)-t.x,p.y); return length(q)-t.y; }
             float smin( float a, float b, float k ) { float h=clamp(.5+.5*(b-a)/k,0.,1.); return mix(b,a,h)-k*h*(1.-h); }
             float mapScene(vec3 p){ return min(sdPlane(p,vec3(0,1,0),1.), sdSphere(p-vec3(0.,sin(u_time*.8)*.5-.2,0.),.5)); } // Simplified mapScene for update
             float mapBackrooms(vec3 p){ vec3 cellID=floor(p/4.); p=mod(p,4.)-2.; float walls=sdBox(p,vec3(1.95,1.95,1.95)); float room=-sdBox(p,vec3(1.8,1.9,1.8)); return max(walls,room); } // Simplified backrooms for update
             vec3 calcNormal(vec3 p, float (*mapFunc)(vec3)){ vec2 eps=vec2(.001,0.); return normalize(vec3( mapFunc(p+eps.xyy)-mapFunc(p-eps.xyy), mapFunc(p+eps.yxy)-mapFunc(p-eps.yxy), mapFunc(p+eps.yyx)-mapFunc(p-eps.yyx) )); } // Simplified normal calc
             float raymarch(vec3 ro, vec3 rd, float (*mapFunc)(vec3)){ float t=0.; for(int i=0;i<MAX_RAYMARCH_STEPS;i++){ vec3 p=ro+rd*t; float d=mapFunc(p); if(abs(d)<.001*t || t>MAX_RAYMARCH_DIST){break;} t+=d*.9; } return (t<MAX_RAYMARCH_DIST)?t:-1.; } // Simplified raymarch
             vec3 basicLighting(vec3 n, vec3 ldir, vec3 scol, vec3 acol){ return acol+scol*max(0.,dot(n,ldir)); } // Simplified lighting
             vec3 getColorForCA(vec2 uv, float t){ return mix(vec3(106./255.,0.,1.), vec3(0.,184./255.,212./255.), fbm(uv*4.+t*.15)); } // Simplified CA color

            // --- Color Definitions ---
            vec3 colPrimary = vec3(106./255., 0., 1.);
            vec3 colSecondary = vec3(0., 1., 204./255.);
            vec3 colTertiary = vec3(0., 184./255., 212./255.);
            vec3 colGreen = vec3(0.1, 0.8, 0.4);
            vec3 colGold = vec3(0.9, 0.7, 0.1);
            vec3 colStrangeGreen = vec3(0.1, 0.4, 0.2);
            vec3 colDeepRed = vec3(0.6, 0.0, 0.15);
            vec3 colWhite = vec3(1.0);
            vec3 colOrange = vec3(1.0, 0.5, 0.0);
            vec3 colPink = vec3(1.0, 0.4, 0.7);
            vec3 colBackground = vec3(5./255., 5./255., 17./255.);
            vec3 colBackroomsYellow = vec3(1.0, 0.9, 0.6) * 0.8;
            vec3 colFlicker = vec3(1.1, 1.05, 0.9);
            // --- END Color Definitions ---

            // Inject user code (which should contain main())
            \${newShaderCode}
        \`; // End template literal

        let newVs = null;
        let newFs = null;
        let newProgram = null;
        try {
             newVs = createShader(gl.VERTEX_SHADER, vertexShaderSource);
             newFs = createShader(gl.FRAGMENT_SHADER, completeNewFragmentSource);
             newProgram = createProgram(newVs, newFs);

             console.log("New shader compiled and linked successfully.");

             if (animationFrameId) { cancelAnimationFrame(animationFrameId); animationFrameId = null; }
             if (program) { gl.deleteProgram(program); }
             program = newProgram;

             positionAttributeLocation = gl.getAttribLocation(program, "a_position");
             timeUniformLocation = gl.getUniformLocation(program, "u_time");
             resolutionUniformLocation = gl.getUniformLocation(program, "u_resolution");

             startTime = performance.now();
             animationFrameId = requestAnimationFrame(render);

             console.log("Shader update complete.");
             if(typeof showNotification === 'function') showNotification("SHADER UPDATE SUCCESSFUL.");

        } catch (e) {
             console.error('>>> Shader update failed:', e);
             if (newProgram) gl.deleteProgram(newProgram);
             if (newVs) gl.deleteShader(newVs);
             if (newFs) gl.deleteShader(newFs);
             if(typeof showNotification === 'function') showNotification(\`SHADER UPDATE FAILED: \${e.message}\`);
             if (!animationFrameId && program) { animationFrameId = requestAnimationFrame(render); } // Restart old loop if stopped
        } finally {
             if (newVs) gl.deleteShader(newVs);
             if (newFs) gl.deleteShader(newFs);
        }
    }; // End window.updateShader

    // --- Start WebGL ---
    if (setupWebGL()) {
        console.log("WebGL setup successful. Starting render loop.");
        animationFrameId = requestAnimationFrame(render);
    } else {
        console.error("WebGL setup failed. Render loop will not start.");
        if(document.body) document.body.style.backgroundColor = '#050511';
    }

    // --- Resize Listener ---
    window.addEventListener('resize', () => {
        // Resize check is handled in render loop
    }, false);

})(); // Execute the IIFE
