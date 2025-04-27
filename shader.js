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
    const vertexShaderSource = '#version 300 es\n' +
        'precision highp float;\n' +
        'in vec4 a_position;\n' +
        'void main() {\n' +
        '    gl_Position = a_position;\n' +
        '}\n';

    // Fragment Shader (GLSL 3.00 ES - 30 Phases) - REVISED STRING FORMAT
    // Line 47/48 error likely related to template literal parsing, switching to single quotes.
    const fragmentShaderSource = '#version 300 es\n' +
        'precision highp float;\n' +
        '\n' +
        'uniform float u_time;\n' +
        'uniform vec2 u_resolution;\n' +
        '\n' +
        'out vec4 outColor;\n' +
        '\n' +
        '// --- Constants ---\n' +
        'const float PI = 3.14159265359;\n' +
        'const float TWO_PI = 6.28318530718;\n' +
        'const int FBM_OCTAVES = 5;\n' +
        'const int MAX_RAYMARCH_STEPS = 48;\n' +
        'const float MAX_RAYMARCH_DIST = 15.0;\n' +
        'const int MANDELBROT_ITER = 40;\n' +
        'const float MAX_ITER_INV = 1.0 / float(MANDELBROT_ITER);\n' +
        'const vec2 SDF_EPS = vec2(0.001, 0.0);\n' +
        '\n' +
        '// --- Helper Functions ---\n' +
        'float rand(vec2 co){ return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453); }\n' +
        'float rand(float n){ return fract(sin(n) * 43758.5453123); }\n' +
        'float hash(float n) { return fract(sin(n) * 43758.5453); }\n' +
        'float noise(vec2 p) { vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); float n=i.x+i.y*57.; return mix(mix(hash(n),hash(n+1.),f.x), mix(hash(n+57.),hash(n+58.),f.x),f.y); }\n' +
        'float fbm(vec2 p) { float s=0., a=.7, f=1.; for(int i=0; i<FBM_OCTAVES; i++) { s+=noise(p*f)*a; a*=.5; f*=2.; } return s; }\n' +
        'vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }\n' +
        'vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }\n' +
        'vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }\n' +
        'vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }\n' +
        'float snoise(vec3 v) { const vec2 C=vec2(1./6.,1./3.); const vec4 D=vec4(0.,.5,1.,2.); vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx); vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy); vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy; i=mod289(i); vec4 p=permute(permute(permute(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.)); float n_=1./7.; vec3 ns=n_*D.wyz-D.xzx; vec4 j=p-49.*floor(p*ns.z*ns.z); vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.*x_); vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.-abs(x)-abs(y); vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw); vec4 s0=floor(b0)*2.+1.; vec4 s1=floor(b1)*2.+1.; vec4 sh=-step(h,vec4(0.)); vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww; vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w); vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3))); p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w; vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.); m=m*m; return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3))); }\n' +
        'float snoise(vec2 v) { return snoise(vec3(v, 0.0)); }\n' +
        'mat2 rotate2D(float a) { return mat2(cos(a), -sin(a), sin(a), cos(a)); }\n' +
        'float worley(vec2 p) { float md=10.; vec2 g=floor(p); for(int x=-1;x<=1;x++){ for(int y=-1;y<=1;y++){ vec2 n=g+vec2(float(x),float(y)); vec2 pt=vec2(rand(n),rand(n+vec2(7.3,3.7))); pt=.5+.5*sin(u_time*.3+TWO_PI*pt); vec2 fp=n+pt; md=min(md,length(p-fp)); }} return md; }\n' +
        'vec2 worley2(vec2 p) { vec2 d=vec2(10.); vec2 g=floor(p); for(int x=-1;x<=1;x++){ for(int y=-1;y<=1;y++){ vec2 n=g+vec2(float(x),float(y)); vec2 pt=vec2(rand(n),rand(n+vec2(7.3,3.7))); pt=.5+.5*sin(u_time*.3+TWO_PI*pt); vec2 fp=n+pt; float dist=length(p-fp); if(dist<d.x){d.y=d.x;d.x=dist;}else if(dist<d.y){d.y=dist;}}} return d; }\n' +
        'float truchetPattern(vec2 uv, float s) { uv*=s; vec2 ip=floor(uv), fp=fract(uv); float r=rand(ip), t=floor(r*2.), d; if(t==0.){d=abs(fp.x+fp.y-1.)/sqrt(2.);}else{d=abs(fp.x-fp.y)/sqrt(2.);} return smoothstep(.04,.06,abs(d-.5)); }\n' +
        '\n' +
        '// --- SDF Functions ---\n' +
        'float sdSphere(vec3 p, float s) { return length(p) - s; }\n' +
        'float sdPlane(vec3 p, vec3 n, float h) { return dot(p, n) + h; }\n' +
        'float sdBox(vec3 p, vec3 b) { vec3 q = abs(p) - b; return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0); }\n' +
        'float sdTorus( vec3 p, vec2 t ) { vec2 q = vec2(length(p.xz)-t.x,p.y); return length(q)-t.y; }\n' +
        'float smin( float a, float b, float k ) { float h = clamp( 0.5+0.5*(b-a)/k, 0.0, 1.0 ); return mix( b, a, h ) - k*h*(1.0-h); }\n' +
        '\n' +
        '// --- Scene Mapping Functions ---\n' +
        'float mapScenePhase18(vec3 p) {\n' +
        '    float dPlane = sdPlane(p, vec3(0.0, 1.0, 0.0), 1.0);\n' +
        '    vec3 spherePos = vec3(0.0, sin(u_time * 0.8) * 0.5 - 0.2, 0.0);\n' +
        '    float dSphere = sdSphere(p - spherePos, 0.5);\n' +
        '    return min(dPlane, dSphere);\n' +
        '}\n' +
        'float mapBackroomsPhase20(vec3 p) {\n' +
        '    vec3 cellID = floor(p / 4.0);\n' +
        '    p = mod(p, 4.0) - 2.0;\n' +
        '    float walls = sdBox(p, vec3(1.95, 1.95, 1.95));\n' +
        '    float room = -sdBox(p, vec3(1.8, 1.9, 1.8));\n' +
        '    return max(walls, room);\n' +
        '}\n' +
        'float mapTunnelPhase25(vec3 p) {\n' +
        '    p.xy = rotate2D(-p.z * 0.1) * p.xy;\n' +
        '    return length(p.xy) - (1.0 + 0.2 * sin(p.z * 0.5 + u_time));\n' +
        '}\n' +
        'float mapMetaballsPhase26(vec3 p) {\n' +
        '    float radius = 0.5;\n' +
        '    vec3 pos1 = vec3(sin(u_time * 0.8)       , cos(u_time * 0.5)       , sin(u_time * 0.3)) * 1.5;\n' +
        '    vec3 pos2 = vec3(cos(u_time * 0.7 + 1.0) , sin(u_time * 0.9 + 2.0) , cos(u_time * 0.4 + 3.0)) * 1.5;\n' +
        '    vec3 pos3 = vec3(sin(u_time * 0.6 + 4.0) , cos(u_time * 0.4 + 5.0) , sin(u_time * 0.8 + 6.0)) * 1.5;\n' +
        '    float d1 = sdSphere(p - pos1, radius);\n' +
        '    float d2 = sdSphere(p - pos2, radius);\n' +
        '    float d3 = sdSphere(p - pos3, radius);\n' +
        '    float d = smin(d1, d2, 0.5);\n' +
        '    return smin(d, d3, 0.5);\n' +
        '}\n' +
        'float mapFractalPhase27(vec3 p) {\n' +
        '    float scale = 2.0 + 0.2 * sin(u_time * 0.1);\n' +
        '    float boxFoldFactor = 1.0;\n' +
        '    float sphereScale = 1.0;\n' +
        '    for(int i = 0; i < 5; i++) {\n' +
        '        p = clamp(p, -boxFoldFactor, boxFoldFactor) * 2.0 - p;\n' +
        '        p = p * scale;\n' +
        '    }\n' +
        '    return (length(p) - sphereScale) / pow(scale, 5.0);\n' +
        '}\n' +
        '\n' +
        '// --- Estimate Normal using SDF Gradient (Generic Approximation) ---\n' +
        'vec3 calcNormalGeneric(vec3 p, float sceneDist) {\n' +
        '    return normalize(vec3(\n' +
        '        sdSphere(p + SDF_EPS.xyy, sceneDist) - sdSphere(p - SDF_EPS.xyy, sceneDist),\n' +
        '        sdSphere(p + SDF_EPS.yxy, sceneDist) - sdSphere(p - SDF_EPS.yxy, sceneDist),\n' +
        '        sdSphere(p + SDF_EPS.yyx, sceneDist) - sdSphere(p - SDF_EPS.yyx, sceneDist)\n' +
        '    ));\n' +
        '}\n' +
        '// More accurate normal calculation requires specific map functions\n' +
        'vec3 calcNormalScene18(vec3 p) {\n' +
        '    return normalize(vec3(\n' +
        '        mapScenePhase18(p + SDF_EPS.xyy) - mapScenePhase18(p - SDF_EPS.xyy),\n' +
        '        mapScenePhase18(p + SDF_EPS.yxy) - mapScenePhase18(p - SDF_EPS.yxy),\n' +
        '        mapScenePhase18(p + SDF_EPS.yyx) - mapScenePhase18(p - SDF_EPS.yyx)\n' +
        '    ));\n' +
        '}\n' +
         'vec3 calcNormalBackrooms20(vec3 p) {\n' +
        '    return normalize(vec3(\n' +
        '        mapBackroomsPhase20(p + SDF_EPS.xyy) - mapBackroomsPhase20(p - SDF_EPS.xyy),\n' +
        '        mapBackroomsPhase20(p + SDF_EPS.yxy) - mapBackroomsPhase20(p - SDF_EPS.yxy),\n' +
        '        mapBackroomsPhase20(p + SDF_EPS.yyx) - mapBackroomsPhase20(p - SDF_EPS.yyx)\n' +
        '    ));\n' +
        '}\n' +
         'vec3 calcNormalTunnel25(vec3 p) {\n' +
        '    return normalize(vec3(\n' +
        '        mapTunnelPhase25(p + SDF_EPS.xyy) - mapTunnelPhase25(p - SDF_EPS.xyy),\n' +
        '        mapTunnelPhase25(p + SDF_EPS.yxy) - mapTunnelPhase25(p - SDF_EPS.yxy),\n' +
        '        mapTunnelPhase25(p + SDF_EPS.yyx) - mapTunnelPhase25(p - SDF_EPS.yyx)\n' +
        '    ));\n' +
        '}\n' +
         'vec3 calcNormalMetaballs26(vec3 p) {\n' +
        '    return normalize(vec3(\n' +
        '        mapMetaballsPhase26(p + SDF_EPS.xyy) - mapMetaballsPhase26(p - SDF_EPS.xyy),\n' +
        '        mapMetaballsPhase26(p + SDF_EPS.yxy) - mapMetaballsPhase26(p - SDF_EPS.yxy),\n' +
        '        mapMetaballsPhase26(p + SDF_EPS.yyx) - mapMetaballsPhase26(p - SDF_EPS.yyx)\n' +
        '    ));\n' +
        '}\n' +
         'vec3 calcNormalFractal27(vec3 p) {\n' +
        '    return normalize(vec3(\n' +
        '        mapFractalPhase27(p + SDF_EPS.xyy) - mapFractalPhase27(p - SDF_EPS.xyy),\n' +
        '        mapFractalPhase27(p + SDF_EPS.yxy) - mapFractalPhase27(p - SDF_EPS.yxy),\n' +
        '        mapFractalPhase27(p + SDF_EPS.yyx) - mapFractalPhase27(p - SDF_EPS.yyx)\n' +
        '    ));\n' +
        '}\n' +
        '\n' +
        '// --- Color Definitions ---\n' +
        'vec3 colPrimary = vec3(106./255., 0., 1.);\n' +
        'vec3 colSecondary = vec3(0., 1., 204./255.);\n' +
        'vec3 colTertiary = vec3(0., 184./255., 212./255.);\n' +
        'vec3 colGreen = vec3(0.1, 0.8, 0.4);\n' +
        'vec3 colGold = vec3(0.9, 0.7, 0.1);\n' +
        'vec3 colStrangeGreen = vec3(0.1, 0.4, 0.2);\n' +
        'vec3 colDeepRed = vec3(0.6, 0.0, 0.15);\n' +
        'vec3 colWhite = vec3(1.0);\n' +
        'vec3 colOrange = vec3(1.0, 0.5, 0.0);\n' +
        'vec3 colPink = vec3(1.0, 0.4, 0.7);\n' +
        'vec3 colBackground = vec3(5./255., 5./255., 17./255.);\n' +
        'vec3 colBackroomsYellow = vec3(1.0, 0.9, 0.6) * 0.8;\n' +
        'vec3 colFlicker = vec3(1.1, 1.05, 0.9);\n' +
        '\n' +
        'vec3 basicLighting(vec3 n, vec3 ldir, vec3 scol, vec3 acol){ return acol+scol*max(0.,dot(n,ldir)); }\n' +
        'vec3 getColorForCA(vec2 uv, float t){ return mix(colPrimary, colTertiary, fbm(uv*4.+t*.15)); }\n' +
        '\n' +
        '// --- Main Shader Logic ---\n' +
        'void main() {\n' +
        '    vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / min(u_resolution.y, u_resolution.x);\n' +
        '    vec2 originalUV = gl_FragCoord.xy / u_resolution.xy;\n' +
        '\n' +
        '    float time_warp = u_time * 0.1; // Phase speed\n' +
        '    const float TOTAL_PHASES_F = 30.0; // Updated phase count\n' +
        '    float phase = mod(time_warp, TOTAL_PHASES_F);\n' +
        '    float phaseProgress = fract(phase);\n' +
        '    int phaseIndex = int(floor(phase));\n' +
        '\n' +
        '    vec3 color = colBackground;\n' +
        '\n' +
        '    // --- Phase Implementations (0-17 Condensed) ---\n' +
        '    if (phaseIndex == 0) { float wf=.1+.05*sin(u_time*.2); wf=max(.001,wf); float z=.1/max(.01,.1-uv.y*wf+.02*fbm(uv+u_time*.05)); z=clamp(z,.1,15.); vec2 warp=uv*z; vec2 grid=abs(fract(warp*vec2(5.,3.)+u_time*.1)-.5); float line=smoothstep(.04,.05,min(grid.x,grid.y))*.6; float df=fract(z*.1+u_time*.15); vec3 bc=mix(mix(colPrimary,colTertiary,sin(u_time*.1)*.5+.5),colSecondary,sin(length(warp)*.5-u_time*.5)*.5+.5); color=mix(bc*.15,bc,line*df*1.5); }\n' +
        '    else if (phaseIndex == 1) { float d=length(uv); float r=sin(d*18.-u_time*2.5)*.5+.5; r*=smoothstep(1.8,.4,d); float w=sin(uv.y*25.+u_time*1.2)*.04; vec2 wu=uv+vec2(w,sin(uv.x*15.+u_time*.8)*.03); float n=fbm(wu*3.5+u_time*.25); vec3 bc=mix(mix(colSecondary,colTertiary,r),mix(colGreen,colGold,n),.5+.5*sin(u_time*.6+d*2.)); color=mix(bc*.2,bc,r*.8+n*.6); }\n' +
        '    else if (phaseIndex == 2) { vec2 r=vec2(1.,1.732), h=r*.5; vec2 a=mod(uv*2.+u_time*.1,r)-h, b=mod(uv*2.-h+u_time*.1,r)-h; vec2 gv=length(a)<length(b)?a:b; float p=sin(u_time*3.5)*.5+.5, e=sin(length(gv)*25.-u_time*3.5); e=smoothstep(-.1,.15,e)-smoothstep(.15,.4,e); float ds=fbm(uv*2.5+vec2(u_time*.15,0.)); vec3 baseC=mix(colTertiary,colGreen,ds), glowC=mix(colSecondary,colPrimary,p); color=mix(baseC*.1,glowC,e*p*1.5); float dt=abs(sin(uv.x*22.+u_time*1.1))*abs(sin(uv.y*22.-u_time*1.3)); color+=glowC*dt*.08; }\n' +
        '    else if (phaseIndex == 3) { float a=atan(uv.y,uv.x), rd=length(uv); a+=.1*fbm(uv*.5+u_time*.05); float sa=a*6.+rd*8.-u_time*2.2, s=smoothstep(-.2,.2,sin(sa)); float rdd=rd+sin(a*10.+u_time*.3)*.08, b=fract(rdd*6.-u_time*.6); b=smoothstep(0.,.1,b)*smoothstep(.8,.5,b); float t=fbm(vec2(rdd*6.,a*3.)+u_time*.15); vec3 dc=mix(colPrimary,colDeepRed,sin(rdd*12.)*.5+.5), bc=mix(colGold,colSecondary,cos(a*4.)*.5+.5); color=mix(dc*.5,bc,b+t*.4); color+=bc*s*.3; }\n' +
        '    else if (phaseIndex == 4) { vec2 cu=uv*mix(3.,5.,phaseProgress); float n=fbm(cu+u_time*.2), c=0.; for(float x=-1.;x<=1.;x+=1.){for(float y=-1.;y<=1.;y+=1.){vec2 nb=vec2(x,y), cc=floor(cu)+nb, pt=cc+.5+sin(u_time*.1+cc)*.3; c+=smoothstep(.4,.38,length(cu-pt));}} c=clamp(c,0.,1.); vec3 cellC=mix(colStrangeGreen,colPrimary,n); cellC=mix(cellC,colDeepRed,smoothstep(.6,.8,n)); color=mix(colBackground*.5,cellC,c*1.2); color+=fbm(uv*15.+u_time*.5)*.05; }\n' +
        '    else if (phaseIndex == 5) { float t=phaseProgress; vec2 bu=floor(originalUV*mix(20.,60.,sin(u_time*2.)*.5+.5))/mix(20.,60.,sin(u_time*2.)*.5+.5); float bn=fbm(bu*5.+u_time*.5); color=mix(colPrimary,colSecondary,bn); float tl=sin(originalUV.y*10.+u_time*5.)*.5+.5, ta=smoothstep(.8,.85,tl); float ofs=ta*(rand(vec2(floor(u_time*2.),floor(originalUV.y*10.)))-.5)*.1; vec2 tu=uv+vec2(ofs*t,0.); float tn=fbm(tu*4.+u_time*.3); color=mix(color,mix(colTertiary,colDeepRed,tn),ta); float cao=(.005+.01*abs(sin(u_time*3.)))*t; vec3 cR=getColorForCA(uv+vec2(cao,0.),u_time), cB=getColorForCA(uv-vec2(cao*.5,cao*.8),u_time); color=vec3(cR.r,color.g,cB.b); color+=(rand(originalUV+fract(u_time*10.))-.5)*.15*t; }\n' +
        '    else if (phaseIndex == 6) { vec2 p=uv*2.; float i=fbm(p+u_time*.3), r=abs(snoise(vec3(p*1.5,u_time*.5))); r=pow(1.-r,4.); vec3 fc=mix(colPrimary,colTertiary,smoothstep(0.,1.,i)); color=mix(colBackground*.4,fc,r*1.5); color*=1.-smoothstep(.8,1.5,length(uv)); }\n' +
        '    else if (phaseIndex == 7) { vec2 p=uv*3.+vec2(u_time*.1,u_time*.2); float d=worley(p), e=1.-smoothstep(0.,.05,d), c=smoothstep(0.,.4,d); vec3 cc=mix(colStrangeGreen,colGold,c*1.2); color=mix(cc*.3,colWhite,e); }\n' +
        '    else if (phaseIndex == 8) { vec2 p=rotate2D(u_time*.4)*uv; float a=atan(p.y,p.x), rd=length(p); float t=fbm(vec2(1./(rd+.1),a*2.)+u_time*.2), r=sin(rd*20.-u_time*3.)*.5+.5; vec3 tc=mix(colSecondary,colPink,smoothstep(0.,1.,t)); color=mix(colBackground,tc,(smoothstep(0.,.8,t)+r*.5)*.8); }\n' +
        '    else if (phaseIndex == 9) { float s=mix(4.,8.,sin(u_time*.5)*.5+.5), p=truchetPattern(uv,s); vec2 us=uv*s; float bn=noise(floor(us)+u_time*.1); vec3 tc=mix(colPrimary,colTertiary,bn); color=mix(tc*.2,colWhite*.9,p); }\n' +
        '    else if (phaseIndex == 10) { float v=sin(uv.x*3.+u_time*.8)+sin(uv.y*4.-u_time*.5+sin(uv.x*3.+u_time*.8)*.5)+sin(uv.x*uv.y*2.+u_time)+sin(sqrt(pow(uv.x+.5*sin(u_time/5.),2.)+pow(uv.y+.5*cos(u_time/3.),2.))*5.+u_time); v*=.5; vec3 pc1=mix(colDeepRed,colOrange,sin(u_time*.2)*.5+.5), pc2=mix(colPrimary,colSecondary,cos(u_time*.3)*.5+.5); color=mix(pc1,pc2,smoothstep(-.8,.8,v)); }\n' +
        '    else if (phaseIndex == 11) { vec2 gu=originalUV*vec2(80.,60.), c=floor(gu); float sp=rand(c.x)*3.+1., ss=rand(c.x)*10., sps=fract(ss-u_time*sp*.1), cy=originalUV.y; float tl=.15+rand(c.x)*.1, ci=smoothstep(sps,sps+.01,cy)*(1.-smoothstep(sps+.01,sps+tl,cy)); float cv=rand(c+floor((ss-u_time*sp*.1)*10.)); vec3 rc=mix(colStrangeGreen*.5,colGreen*1.5,step(.5,cv)); color=mix(colBackground,rc,ci); }\n' +
        '    else if (phaseIndex == 12) { float z=.5+pow(mod(u_time*.05,5.)+1.,2.); vec2 c=uv*1.5/z-vec2(.7,0.), zz=vec2(0.); int it=0; for(int i=0;i<MANDELBROT_ITER;i++){zz=vec2(zz.x*zz.x-zz.y*zz.y,2.*zz.x*zz.y)+c; if(dot(zz,zz)>4.)break; it++;} float m=clamp(float(it)*MAX_ITER_INV,0.,1.); m=pow(m,.5); color=mix(colBackground,mix(colPrimary,colGold,m),smoothstep(0.,.1,m)); if(it==MANDELBROT_ITER)color=colBackground*.5; }\n' +
        '    else if (phaseIndex == 13) { vec2 d=vec2(snoise(vec3(uv*2.,u_time*.3)),snoise(vec3(uv*2.+10.,u_time*.35)))*.15, du=uv+d; vec2 g=abs(fract(du*6.)-.5); float l=smoothstep(.03,.04,min(g.x,g.y)); float n=fbm(du*3.+u_time*.1); vec3 gc=mix(colTertiary,colPink,n); color=mix(colBackground*.5,gc,l*1.2); }\n' +
        '    else if (phaseIndex == 14) { float h=snoise(vec3(uv*1.5,u_time*.2)), f=snoise(vec3(uv*3.+h*.3,u_time*.4)); float la=.785, l=clamp(.5+h*.5*cos(atan(uv.y,uv.x)-la),.2,1.); vec3 tc=mix(colGreen*.8,colGold*.6,h*.5+.5), wc=mix(colPrimary*.7,colTertiary*.9,f*.5+.5); color=mix(wc,tc*l,smoothstep(-.1,.1,h))*.8; }\n' +
        '    else if (phaseIndex == 15) { vec2 p=abs(uv)*.8; float s=1.5+.5*sin(u_time*.4); for(int i=0;i<4;i++){ p=abs(p*s-1.); if(dot(p,p)>20.)break; } float r=sin(length(p)*.2*10.+u_time); color=mix(colSecondary,colPrimary,smoothstep(-.5,.5,r)); }\n' +
        '    else if (phaseIndex == 16) { vec2 p=uv*2.5; float d1=worley(p), d2=worley(p+vec2(5.2,1.3)); float c=pow(1.-smoothstep(0.,.1,d1),2.)+pow(1.-smoothstep(0.,.05,d2),2.)*.5; c=clamp(c,0.,1.); float g=fbm(p*10.+u_time*.1); vec3 cc=mix(colWhite*.8,colTertiary,g); color=mix(colBackground*.8,cc,c); }\n' +
        '    else if (phaseIndex == 17) { float i=.5+.5*noise(vec2(u_time*1.5,originalUV.y*5.)); float fs=floor(u_time*15.)+floor(originalUV.y*10.), f=rand(fs); i*=smoothstep(.2,.8,f); vec3 bc=mix(colPrimary,colSecondary,noise(uv*3.+u_time*.2)); float sy=fract(originalUV.y*u_resolution.y*.5), se=smoothstep(.4,.5,sy)*(1.-smoothstep(.5,.6,sy)); color=mix(bc*.5,vec3(0.),se*i*1.5); color+=(rand(originalUV+u_time)-.5)*.1*i; }\n' +
        '\n' +
        '    // --- Phase 18: Raymarched Scene (Sphere/Plane) - REVISED ---\n' +
        '    else if (phaseIndex == 18) {\n' +
        '        vec3 ro = vec3(0.0, 0.0, -3.0 + sin(u_time * 0.3));\n' +
        '        vec3 rd = normalize(vec3(uv, 1.0));\n' +
        '        vec3 col = colBackground;\n' +
        '        float t = 0.0; float hitDist = -1.0;\n' +
        '        for(int i = 0; i < MAX_RAYMARCH_STEPS; i++) {\n' +
        '            vec3 p = ro + rd * t;\n' +
        '            float d = mapScenePhase18(p);\n' +
        '            if(abs(d) < 0.001 * t || t > MAX_RAYMARCH_DIST) { break; }\n' +
        '            t += d * 0.9;\n' +
        '        }\n' +
        '        if(t < MAX_RAYMARCH_DIST) hitDist = t;\n' +
        '\n' +
        '        if (hitDist > 0.0) {\n' +
        '            vec3 p = ro + rd * hitDist;\n' +
        '            vec3 n = calcNormalScene18(p);\n' + // Use specific normal calc
        '            vec3 lightDir = normalize(vec3(-0.7, 0.7, -0.5));\n' +
        '            vec3 surfCol = (p.y < -0.9) ? colGreen * 0.8 : colPrimary;\n' +
        '            col = basicLighting(n, lightDir, surfCol, colBackground * 0.2);\n' +
        '        } else {\n' +
        '            col = colBackground;\n' +
        '        }\n' +
        '        color = col;\n' +
        '    }\n' +
        '    else if (phaseIndex == 19) { float rd=length(uv), s=0.; for(float i=0.;i<15.;i++){ float seed=i*13.37, st=u_time*(.5+rand(seed))*1.5+rand(seed+1.)*10., sd=fract(st)*3., sa=rand(seed+2.)*TWO_PI+u_time*rand(seed+3.)*.05; vec2 sp=vec2(cos(sa),sin(sa))*sd; float ds=length(uv-sp), sl=.02+sd*.1, si=smoothstep(sl,0.,ds)*(1.-smoothstep(1.,1.5,sd)); s+=si; } vec3 sc=mix(colWhite,colSecondary,clamp(rd*.5,0.,1.)); color=mix(colBackground,sc,clamp(s,0.,1.)); }\n' +
        '\n' +
        '    // --- Phase 20: Backrooms Raymarch - REVISED ---\n' +
        '     else if (phaseIndex == 20) {\n' +
        '         vec3 ro = vec3(0.0, 0.0, u_time * 0.5);\n' +
        '         vec3 target = ro + vec3(0.0, 0.0, 1.0);\n' +
        '         vec3 camUp = vec3(0.0, 1.0, 0.0);\n' +
        '         vec3 ww = normalize(target - ro);\n' +
        '         vec3 uu = normalize(cross(ww, camUp));\n' +
        '         vec3 vv = normalize(cross(uu, ww));\n' +
        '         vec3 rd = normalize(uv.x * uu + uv.y * vv + 1.5 * ww);\n' +
        '\n' +
        '         vec3 col = colBackground;\n' +
        '         float t = 0.0; float hitDist = -1.0;\n' +
        '         for(int i = 0; i < MAX_RAYMARCH_STEPS; i++) {\n' +
        '             vec3 p = ro + rd * t;\n' +
        '             float d = mapBackroomsPhase20(p);\n' +
        '             if(abs(d) < 0.001 * t || t > MAX_RAYMARCH_DIST) { break; }\n' +
        '             t += d * 0.9;\n' +
        '         }\n' +
        '         if(t < MAX_RAYMARCH_DIST) hitDist = t;\n' +
        '\n' +
        '         if (hitDist > 0.0) {\n' +
        '             vec3 p = ro + rd * hitDist;\n' +
        '             vec3 n = calcNormalBackrooms20(p);\n' + // Use specific normal calc
        '             float ambient = 0.4 + 0.6 * n.y;\n' +
        '             float fog = 1.0 - smoothstep(5.0, MAX_RAYMARCH_DIST * 0.8, hitDist);\n' +
        '             col = colBackroomsYellow * ambient * fog;\n' +
        '             col *= 0.95 + 0.1 * rand(gl_FragCoord.xy / 50.0 + fract(u_time * 5.0));\n' +
        '         } else {\n' +
        '             col = colBackground;\n' +
        '         }\n' +
        '         color = col;\n' +
        '    }\n' +
        '     // Phase 21: Uncanny Flicker\n' +
        '    else if (phaseIndex == 21) {\n' +
        '         float flickerSpeed = 15.0 + 10.0 * sin(u_time * 0.3);\n' +
        '         float flicker = 0.5 + 0.5 * noise(vec2(u_time * flickerSpeed, originalUV.y * 2.0));\n' +
        '         float harshFlicker = smoothstep(0.7, 0.72, flicker) + smoothstep(0.3, 0.28, flicker);\n' +
        '         float baseNoise = fbm(uv * 2.0 + u_time * 0.1);\n' +
        '         vec3 baseCol = mix(colStrangeGreen, colBackroomsYellow * 0.7, baseNoise);\n' +
        '         color = baseCol * (0.6 + harshFlicker * 0.6) + colFlicker * harshFlicker * 0.1;\n' +
        '         float scanline = 0.5 + 0.5 * sin(originalUV.y * u_resolution.y * 0.7 + u_time);\n' +
        '         color *= 1.0 - smoothstep(0.4, 0.5, scanline) * 0.2 * harshFlicker;\n' +
        '    }\n' +
        '     // Phase 22: Distorted Wallpaper\n' +
        '    else if (phaseIndex == 22) {\n' +
        '        vec2 distOffset=vec2(snoise(vec3(uv*1.5,u_time*.2)),snoise(vec3(uv*1.5+50.,u_time*.2)))*.3;\n' +
        '        vec2 distortedUV=uv+distOffset;\n' +
        '        vec2 patternUV=fract(distortedUV*5.);\n' +
        '        float pattern=1.-smoothstep(.2,.25,abs(patternUV.x-.5)+abs(patternUV.y-.5));\n' +
        '        vec3 col1=vec3(.6,.55,.4); vec3 col2=vec3(.4,.5,.45);\n' +
        '        float patternNoise=noise(floor(distortedUV*5.)+.1);\n' +
        '        vec3 tileCol=mix(col1,col2,patternNoise);\n' +
        '        color=mix(tileCol*.8,tileCol*1.1,pattern);\n' +
        '        color*=.8+.2*noise(distortedUV*20.+u_time*.5);\n' +
        '    }\n' +
        '     // Phase 23: Raymarched Hallway Alt - REVISED ---\n' +
        '     else if (phaseIndex == 23) {\n' +
        '         vec3 ro = vec3(sin(u_time * 0.1) * 0.5, 0.0, u_time * 0.7);\n' +
        '         vec3 target = ro + vec3(sin(u_time * 0.2) * 0.2, 0.0, 1.0);\n' +
        '         vec3 camUp = vec3(0.0, 1.0, 0.0);\n' +
        '         vec3 ww = normalize(target - ro);\n' +
        '         vec3 uu = normalize(cross(ww, camUp));\n' +
        '         vec3 vv = normalize(cross(uu, ww));\n' +
        '         vec3 rd = normalize(uv.x * uu + uv.y * vv + 1.8 * ww);\n' +
        '\n' +
        '         vec3 col = colBackground;\n' +
        '         float t = 0.0; float hitDist = -1.0;\n' +
        '         for(int i = 0; i < MAX_RAYMARCH_STEPS; i++) {\n' +
        '             vec3 p = ro + rd * t;\n' +
        '             float d = mapBackroomsPhase20(p); // Use same map\n' +
        '             if(abs(d) < 0.001 * t || t > MAX_RAYMARCH_DIST) { break; }\n' +
        '             t += d * 0.9;\n' +
        '         }\n' +
        '         if(t < MAX_RAYMARCH_DIST) hitDist = t;\n' +
        '\n' +
        '         if (hitDist > 0.0) {\n' +
        '              vec3 p = ro + rd * hitDist;\n' +
        '              vec3 n = calcNormalBackrooms20(p);\n' + // Use specific normal calc
        '              vec3 lightDir = normalize(vec3(0.1, 0.5, -0.5));\n' +
        '              float fog = 1.0 - smoothstep(8.0, MAX_RAYMARCH_DIST * 0.9, hitDist);\n' +
        '              col = colBackroomsYellow * basicLighting(n, lightDir, vec3(0.7), vec3(0.1)) * fog;\n' +
        '         } else {\n' +
        '             col = colBackground * 0.5;\n' +
        '         }\n' +
        '         color = col;\n' +
        '     }\n' +
        '     // Phase 24: Unsettling Noise Field (Worley F2-F1)\n' +
        '    else if (phaseIndex == 24) {\n' +
        '        vec2 p=uv*(2.+.5*sin(u_time*.15));\n' +
        '        vec2 w=worley2(p); float val=w.y-w.x;\n' +
        '        float noiseVal=fbm(p*3.+u_time*.2);\n' +
        '        vec3 c1=colStrangeGreen*.8; vec3 c2=colDeepRed*.6; vec3 c3=colBackroomsYellow*.5;\n' +
        '        color=mix(c1,c2,smoothstep(0.,.15,val));\n' +
        '        color=mix(color,c3,smoothstep(.4,.8,noiseVal));\n' +
        '        color*=.7+.5*smoothstep(.05,0.,w.x);\n' +
        '    }\n' +
        '     // Phase 25: Raymarched Twisting Tunnel - REVISED ---\n' +
        '     else if (phaseIndex == 25) {\n' +
        '         vec3 ro = vec3(0.0, 0.0, u_time * 1.5);\n' +
        '         vec3 rd = normalize(vec3(uv, 1.0));\n' +
        '         float angle = ro.z * 0.1;\n' +
        '         rd.xy = rotate2D(angle) * rd.xy;\n' +
        '\n' +
        '         vec3 col = colBackground;\n' +
        '         float t = 0.0; float hitDist = -1.0;\n' +
        '         for(int i = 0; i < MAX_RAYMARCH_STEPS; i++) {\n' +
        '             vec3 p = ro + rd * t;\n' +
        '             float d = mapTunnelPhase25(p);\n' +
        '             if(abs(d) < 0.001 * t || t > MAX_RAYMARCH_DIST) { break; }\n' +
        '             t += d * 0.9;\n' +
        '         }\n' +
        '         if(t < MAX_RAYMARCH_DIST) hitDist = t;\n' +
        '\n' +
        '         if (hitDist > 0.0) {\n' +
        '             vec3 p = ro + rd * hitDist;\n' +
        '             vec3 n = calcNormalTunnel25(p);\n' + // Use specific normal calc
        '             float pattern = fract((p.z - atan(p.y, p.x)*0.5) * 0.5);\n' +
        '             pattern = smoothstep(0.4, 0.5, pattern) - smoothstep(0.5, 0.6, pattern);\n' +
        '             vec3 surfCol = mix(colPrimary, colTertiary, abs(n.z));\n' +
        '             col = surfCol * (0.5 + 0.5 * pattern);\n' +
        '             col *= exp(-hitDist * 0.1);\n' +
        '         } else {\n' +
        '             col = colBackground;\n' +
        '         }\n' +
        '         color = col;\n' +
        '     }\n' +
        '     // Phase 26: Raymarched Metaballs - REVISED ---\n' +
        '     else if (phaseIndex == 26) {\n' +
        '         vec3 ro = vec3(0.0, 0.0, -4.0 + u_time * 0.3);\n' +
        '         vec3 rd = normalize(vec3(uv, 1.0));\n' +
        '\n' +
        '         vec3 col = colBackground;\n' +
        '         float t = 0.0; float hitDist = -1.0;\n' +
        '         for(int i = 0; i < MAX_RAYMARCH_STEPS; i++) {\n' +
        '             vec3 p = ro + rd * t;\n' +
        '             float d = mapMetaballsPhase26(p);\n' +
        '             if(abs(d) < 0.001 * t || t > MAX_RAYMARCH_DIST) { break; }\n' +
        '             t += d * 0.9;\n' +
        '         }\n' +
        '         if(t < MAX_RAYMARCH_DIST) hitDist = t;\n' +
        '\n' +
        '         if (hitDist > 0.0) {\n' +
        '             vec3 p = ro + rd * hitDist;\n' +
        '             vec3 n = calcNormalMetaballs26(p);\n' + // Use specific normal calc
        '             vec3 lightDir = normalize(vec3(0.5, 0.8, -0.3));\n' +
        '             vec3 surfCol = mix(colSecondary, colPink, clamp(p.y * 0.5 + 0.5, 0.0, 1.0));\n' +
        '             col = basicLighting(n, lightDir, surfCol, vec3(0.1));\n' +
        '             col *= exp(-hitDist * 0.2);\n' +
        '         } else {\n' +
        '             col = colBackground;\n' +
        '         }\n' +
        '         color = col;\n' +
        '    }\n' +
        '     // Phase 27: Raymarched Fractal - REVISED ---\n' +
        '     else if (phaseIndex == 27) {\n' +
        '          vec3 ro = vec3(0.0, 0.0, -3.0 + u_time * 0.2);\n' +
        '          vec3 rd = normalize(vec3(uv, 1.0));\n' +
        '\n' +
        '          vec3 col = colBackground;\n' +
        '          float t = 0.0; float hitDist = -1.0;\n' +
        '          for(int i = 0; i < MAX_RAYMARCH_STEPS; i++) {\n' +
        '              vec3 p = ro + rd * t;\n' +
        '              float d = mapFractalPhase27(p);\n' +
        '              if(abs(d) < 0.001 * t || t > MAX_RAYMARCH_DIST) { break; }\n' +
        '              t += d * 0.7;\n' + // Smaller step for fractals
        '          }\n' +
        '          if(t < MAX_RAYMARCH_DIST) hitDist = t;\n' +
        '\n' +
        '          if (hitDist > 0.0) {\n' +
        '              vec3 p = ro + rd * hitDist;\n' +
        '              vec3 n = calcNormalFractal27(p);\n' + // Use specific normal calc
        '              vec3 surfCol = vec3(0.5) + 0.5 * n;\n' +
        '              surfCol = mix(colGold, colPrimary, surfCol.x);\n' +
        '              col = surfCol * max(0.1, dot(n, normalize(vec3(0.577))));\n' +
        '              col *= exp(-hitDist*0.15);\n' +
        '          } else {\n' +
        '             col = colBackground;\n' +
        '          }\n' +
        '          color = col;\n' +
        '     }\n' +
        '     // Phase 28: Glitchy Data Stream\n' +
        '    else if (phaseIndex == 28) {\n' +
        '        float base=fbm(uv*3.+u_time*.2);\n' +
        '        color=mix(colPrimary*.5,colTertiary*.7,base);\n' +
        '        float barY=floor(originalUV.y*20.);\n' +
        '        float barSpeed=rand(barY)*5.+2.;\n' +
        '        float barOffset=fract(u_time*barSpeed*.2+rand(barY+1.));\n' +
        '        float barWidth=.05+rand(barY+2.)*.2;\n' +
        '        float barMask=smoothstep(barOffset-barWidth*.5,barOffset,originalUV.x)*(1.-smoothstep(barOffset,barOffset+barWidth*.5,originalUV.x));\n' +
        '        if(barMask>0.){\n' +
        '            vec2 glitchUV=uv+vec2(rand(barY+fract(u_time*5.))*.1-.05,0.);\n' +
        '            float glitchNoise=fbm(glitchUV*10.+u_time*2.);\n' +
        '            color=mix(color,mix(colDeepRed,colWhite,glitchNoise),barMask*.8);\n' +
        '            color+=(rand(originalUV+fract(u_time*20.))-.5)*barMask*.2;\n' +
        '        }\n' +
        '    }\n' +
        '     // Phase 29: Interference Pattern\n' +
        '    else if (phaseIndex == 29) {\n' +
        '          vec2 src1=vec2(sin(u_time*.5),cos(u_time*.3))*.8;\n' +
        '          vec2 src2=vec2(cos(u_time*.4+1.),sin(u_time*.6+2.))*.7;\n' +
        '          vec2 src3=vec2(sin(u_time*.7+3.),cos(u_time*.5+4.))*.9;\n' +
        '          float wave1=sin(length(uv-src1)*20.-u_time*5.);\n' +
        '          float wave2=sin(length(uv-src2)*25.-u_time*6.);\n' +
        '          float wave3=cos(length(uv-src3)*18.+u_time*4.);\n' +
        '          float interference=(wave1+wave2+wave3)/3.;\n' +
        '          interference=pow(abs(interference),.7);\n' +
        '          color=mix(colSecondary,colPink,smoothstep(-.5,.5,wave1));\n' +
        '          color=mix(color,colPrimary,smoothstep(.3,.8,interference));\n' +
        '          color+=vec3(1.)*pow(max(0.,interference-.7),2.)*2.;\n' +
        '    }\n' +
        '\n' +
        '    // --- Global Effects ---\n' +
        '    float scanlineVal = sin(originalUV.y * u_resolution.y * 0.8 + u_time * 0.1) * 0.5 + 0.5;\n' +
        '    float scanlineIntensity = 0.03 + 0.015 * sin(u_time * 0.5);\n' +
        '    color = mix(color, color * (1.0 - scanlineIntensity * 0.8), smoothstep(0.3, 0.0, scanlineVal));\n' +
        '    color = mix(color, color * (1.0 + scanlineIntensity * 0.5), smoothstep(0.7, 1.0, scanlineVal));\n' +
        '    float vignette = smoothstep(1.5, 0.5, length(uv));\n' +
        '    color *= vignette;\n' +
        '\n' +
        '    outColor = vec4(clamp(color, 0.0, 1.0), 1.0);\n' +
        '}\n';

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
        // NOTE: This update function is highly simplified and WILL LIKELY BREAK
        // if the new shader code relies on the complex SDFs or specific normal calculations
        // defined in the main shader string above. It only includes basic helpers.
        // For full dynamic updates, the helper/SDF functions would also need to be
        // included within the 'completeNewFragmentSource' here or be globally accessible
        // in a way the new shader code can find them.
        if (!gl) {
            console.warn("WebGL context not available. Cannot update shader.");
            if(typeof showNotification === 'function') showNotification("WebGL inactive. Cannot update shader.");
            return;
        }
        console.log("Attempting shader update (simplified helpers)...");

        if (!newShaderCode || typeof newShaderCode !== 'string' || newShaderCode.indexOf('main()') === -1) {
             console.error("Invalid shader code provided: Missing main() or not a string.");
             if(typeof showNotification === 'function') showNotification("Invalid shader code: Missing main().");
             return;
        }

         const completeNewFragmentSource = '#version 300 es\n' +
            'precision highp float;\n' +
            'uniform float u_time;\n' +
            'uniform vec2 u_resolution;\n' +
            'out vec4 outColor;\n' +
            'const int FBM_OCTAVES = 5;\n' + // Use constant from outer scope
            'float hash(float n){return fract(sin(n)*43758.5453);}\n' +
            'float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);float n=i.x+i.y*57.;return mix(mix(hash(n),hash(n+1.),f.x),mix(hash(n+57.),hash(n+58.),f.x),f.y);}\n' +
            'float fbm(vec2 p){float s=0.,a=.7,f=1.;for(int i=0;i<FBM_OCTAVES;i++){s+=noise(p*f)*a;a*=.5;f*=2.;}return s;}\n' +
            'float rand(vec2 co){return fract(sin(dot(co.xy,vec2(12.9898,78.233)))*43758.5453);}\n' +
            'vec3 colPrimary=vec3(106./255.,0.,1.); vec3 colSecondary=vec3(0.,1.,204./255.); vec3 colTertiary=vec3(0.,184./255.,212./255.); vec3 colBackground=vec3(5./255.,5./255.,17./255.);\n' +
            // Inject user code (needs to define main())
            newShaderCode + '\n';

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
             program = newProgram; // Switch to new program

             // Re-get locations
             positionAttributeLocation = gl.getAttribLocation(program, "a_position");
             timeUniformLocation = gl.getUniformLocation(program, "u_time");
             resolutionUniformLocation = gl.getUniformLocation(program, "u_resolution");

             startTime = performance.now(); // Reset time for new shader?
             animationFrameId = requestAnimationFrame(render); // Restart loop

             console.log("Shader update complete.");
             if(typeof showNotification === 'function') showNotification("SHADER UPDATE SUCCESSFUL.");

        } catch (e) {
             console.error('>>> Shader update failed:', e);
             // Cleanup failed resources
             if (newProgram) gl.deleteProgram(newProgram);
             // Don't delete shaders if linking failed, they might be needed for error logs
             if(typeof showNotification === 'function') showNotification(\`SHADER UPDATE FAILED: \${e.message}\`);
             // IMPORTANT: If update fails, restart loop with OLD program if it exists and loop wasn't running
             if (!animationFrameId && program) {
                 console.log("Restarting render loop with previous program after update failure.");
                 animationFrameId = requestAnimationFrame(render);
             }
        } finally {
             // Always delete individual shaders after trying to link (if they exist)
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
        if(document.body) document.body.style.backgroundColor = '#050511'; // Static fallback
    }

    // --- Resize Listener ---
    window.addEventListener('resize', () => {
        // The render loop handles canvas/viewport resizing automatically
    }, false);

})(); // Execute the IIFE
