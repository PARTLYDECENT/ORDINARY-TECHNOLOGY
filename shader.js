// --- WebGL Setup and Shader Logic ---
// --- (Derived from sources [cite: 199] through [cite: 548]) ---

const webglCanvas = document.getElementById('webglCanvas'); [cite: 200]
let gl = null; // Declare gl in this script's scope

if (webglCanvas) {
    webglCanvas.width = window.innerWidth; [cite: 201]
    webglCanvas.height = window.innerHeight;
    gl = webglCanvas.getContext('webgl2') || webglCanvas.getContext('webgl') || webglCanvas.getContext('experimental-webgl'); [cite: 202]
    if (gl instanceof WebGL2RenderingContext) { console.log("WebGL2 Context Initialized."); } [cite: 203]
    else if (gl instanceof WebGLRenderingContext || gl instanceof WebGLRenderingContext) { console.log("WebGL1 Context Initialized. Shader may require GLSL 300 es features."); } [cite: 204, 205, 206]
} else {
    console.error("WebGL Canvas element not found!"); [cite: 207]
}

if (!gl) {
    console.log("WebGL not supported, falling back. Background will be static."); [cite: 208]
    if(document.body) document.body.style.backgroundColor = '#050511';
} else {
    // --- Vertex shader source ---
    const vertexShaderSource = `#version 300 es
        in vec4 a_position; [cite: 209]
        void main() {
            gl_Position = a_position; [cite: 210]
        }
    `;

    // --- REVISED Fragment shader source - 20 PHASES ---
    const fragmentShaderSource = `#version 300 es
        precision highp float; [cite: 211]
        uniform float u_time; [cite: 212]
        uniform vec2 u_resolution;
        out vec4 outColor; [cite: 213]

        // --- Constants ---
        const float PI = 3.14159265359; [cite: 214]
        const float TWO_PI = 6.28318530718;
        const int FBM_OCTAVES = 5; [cite: 215]
        const int MAX_RAYMARCH_STEPS = 48; [cite: 216]
        const float MAX_RAYMARCH_DIST = 12.0; [cite: 217]
        const int MANDELBROT_ITER = 40; // Reduced iterations

        // --- Helper Functions (Sources [cite: 218] through [cite: 268]) ---
        float rand(vec2 co){ return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453); } [cite: 218]
        float rand(float n){ return fract(sin(n) * 43758.5453123); } [cite: 219]
        float hash(float n) { return fract(sin(n) * 43758.5453); } [cite: 220]
        float noise(vec2 p) { vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f); float n = i.x + i.y * 57.0; return mix(mix(hash(n), hash(n + 1.0), f.x), mix(hash(n + 57.0), hash(n + 58.0), f.x), f.y); } [cite: 221, 222, 223, 224]
        float fbm(vec2 p) { float sum = 0.0; float amp = 0.7; float freq = 1.0; for(int i = 0; i < FBM_OCTAVES; i++) { sum += noise(p * freq) * amp; amp *= 0.5; freq *= 2.0; } return sum; } [cite: 225, 226, 227]
        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; } [cite: 228]
        vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; } [cite: 229]
        vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); } [cite: 230]
        vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; } [cite: 231]
        float snoise(vec3 v) { const vec2 C=vec2(1./6.,1./3.); const vec4 D=vec4(0.,.5,1.,2.); vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx); vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy); vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy; i=mod289(i); vec4 p=permute(permute(permute(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.)); float n_=1./7.; vec3 ns=n_*D.wyz-D.xzx; vec4 j=p-49.*floor(p*ns.z*ns.z); vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.*x_); vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.-abs(x)-abs(y); vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw); vec4 s0=floor(b0)*2.+1.; vec4 s1=floor(b1)*2.+1.; vec4 sh=-step(h,vec4(0.)); vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww; vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w); vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3))); p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w; vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.); m=m*m; return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3))); } [cite: 232, 233, 234, 235, 236, 237, 238, 239, 240, 241, 242, 243, 244, 245, 246, 247, 248]
        float snoise(vec2 v) { return snoise(vec3(v, 0.0)); } [cite: 249]
        mat2 rotate2D(float angle) { return mat2(cos(angle), -sin(angle), sin(angle), cos(angle)); } [cite: 250]
        float worley(vec2 p) { float md=10.; vec2 g=floor(p); for(int x=-1;x<=1;x++){ for(int y=-1;y<=1;y++){ vec2 n=g+vec2(float(x),float(y)); vec2 pt=vec2(rand(n),rand(n+vec2(7.3,3.7))); pt=.5+.5*sin(u_time*.3+TWO_PI*pt); vec2 fp=n+pt; md=min(md,length(p-fp)); }} return md; } [cite: 251, 252, 253, 254, 255, 256, 257]
        float truchetPattern(vec2 uv, float scale) { uv*=scale; vec2 ip=floor(uv); vec2 fp=fract(uv); float r=rand(ip); float t=floor(r*2.); float d; if(t==0.){d=abs(fp.x+fp.y-1.)/sqrt(2.);}else{d=abs(fp.x-fp.y)/sqrt(2.);} return smoothstep(.04,.06,abs(d-.5)); } [cite: 258, 259, 260, 261, 262, 263, 264, 265, 266]
        float sdSphere(vec3 p, float s) { return length(p) - s; } [cite: 267]
        float sdPlane(vec3 p, vec3 n, float h) { return dot(p, n) + h; } [cite: 268]

        // --- Color Definitions (Sources [cite: 269] through [cite: 275]) ---
        vec3 colPrimary = vec3(106./255., 0., 1.); [cite: 269]
        vec3 colSecondary = vec3(0., 1., 204./255.); [cite: 270]
        vec3 colTertiary = vec3(0., 184./255., 212./255.); [cite: 271]
        vec3 colGreen = vec3(0.1, 0.8, 0.4); [cite: 272]
        vec3 colGold = vec3(0.9, 0.7, 0.1); [cite: 273]
        vec3 colStrangeGreen = vec3(0.1, 0.4, 0.2);
        vec3 colDeepRed = vec3(0.6, 0.0, 0.15); [cite: 274]
        vec3 colWhite = vec3(1.0);
        vec3 colOrange = vec3(1.0, 0.5, 0.0);
        vec3 colPink = vec3(1.0, 0.4, 0.7); [cite: 275]
        vec3 colBackground = vec3(5./255., 5./255., 17./255.);

        vec3 getColorForCA(vec2 uv, float t) { float n = fbm(uv*4. + t*.15); return mix(colPrimary, colTertiary, n); } [cite: 276, 277]

        // --- Main Shader Logic ---
        void main() {
            vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / min(u_resolution.y, u_resolution.x); [cite: 278]
            vec2 originalUV = gl_FragCoord.xy / u_resolution.xy; [cite: 279]
            float time_warp = u_time * 0.1; [cite: 280]
            const float TOTAL_PHASES_F = 20.0; [cite: 281]
            float phase = mod(time_warp, TOTAL_PHASES_F); [cite: 282]
            float phaseProgress = fract(phase);
            int phaseIndex = int(floor(phase)); [cite: 283]
            vec3 color = colBackground; [cite: 284]

            // --- Phase Implementations (Sources [cite: 285] through [cite: 471]) ---
            if (phaseIndex == 0) { // Distorted Grid
                float wf=.1+.05*sin(u_time*.2); wf=max(.001,wf); float z=.1/max(.01,.1-uv.y*wf+.02*fbm(uv+u_time*.05)); z=clamp(z,.1,15.); vec2 warp=uv*z; vec2 grid=abs(fract(warp*vec2(5.,3.)+u_time*.1)-.5); float line=smoothstep(.04,.05,min(grid.x,grid.y))*.6; float df=fract(z*.1+u_time*.15); vec3 bc=mix(mix(colPrimary,colTertiary,sin(u_time*.1)*.5+.5),colSecondary,sin(length(warp)*.5-u_time*.5)*.5+.5); color=mix(bc*.15,bc,line*df*1.5); [cite: 285, 286, 287, 288, 289, 290, 291]
            } else if (phaseIndex == 1) { // Circular Waves
                float d=length(uv); float r=sin(d*18.-u_time*2.5)*.5+.5; r*=smoothstep(1.8,.4,d); float w=sin(uv.y*25.+u_time*1.2)*.04; vec2 wu=uv+vec2(w,sin(uv.x*15.+u_time*.8)*.03); float n=fbm(wu*3.5+u_time*.25); vec3 bc=mix(mix(colSecondary,colTertiary,r),mix(colGreen,colGold,n),.5+.5*sin(u_time*.6+d*2.)); color=mix(bc*.2,bc,r*.8+n*.6); [cite: 292, 293, 294, 295, 296, 297, 298, 299]
            } else if (phaseIndex == 2) { // Electric Pulse / Hex Grid
                vec2 r=vec2(1.,1.732); vec2 h=r*.5; vec2 a=mod(uv*2.+u_time*.1,r)-h; vec2 b=mod(uv*2.-h+u_time*.1,r)-h; vec2 gv=length(a)<length(b)?a:b; float p=sin(u_time*3.5)*.5+.5; float e=sin(length(gv)*25.-u_time*3.5); e=smoothstep(-.1,.15,e)-smoothstep(.15,.4,e); float ds=fbm(uv*2.5+vec2(u_time*.15,0.)); vec3 baseC=mix(colTertiary,colGreen,ds); vec3 glowC=mix(colSecondary,colPrimary,p); color=mix(baseC*.1,glowC,e*p*1.5); float dt=abs(sin(uv.x*22.+u_time*1.1))*abs(sin(uv.y*22.-u_time*1.3)); color+=glowC*dt*.08; [cite: 300, 301, 302, 303, 304, 305, 306, 307, 308, 309, 310, 311, 312]
            } else if (phaseIndex == 3) { // Vortex / Spiral
                float a=atan(uv.y,uv.x); float rd=length(uv); a+=.1*fbm(uv*.5+u_time*.05); float sa=a*6.+rd*8.-u_time*2.2; float s=smoothstep(-.2,.2,sin(sa)); float rdd=rd+sin(a*10.+u_time*.3)*.08; float b=fract(rdd*6.-u_time*.6); b=smoothstep(0.,.1,b)*smoothstep(.8,.5,b); float t=fbm(vec2(rdd*6.,a*3.)+u_time*.15); vec3 dc=mix(colPrimary,colDeepRed,sin(rdd*12.)*.5+.5); vec3 bc=mix(colGold,colSecondary,cos(a*4.)*.5+.5); color=mix(dc*.5,bc,b+t*.4); color+=bc*s*.3; [cite: 313, 314, 315, 316, 317, 318, 319, 320, 321, 322, 323, 324]
            } else if (phaseIndex == 4) { // Organic / Cellular
                vec2 cu=uv*mix(3.,5.,phaseProgress); float n=fbm(cu+u_time*.2); float c=0.; for(float x=-1.;x<=1.;x+=1.){for(float y=-1.;y<=1.;y+=1.){vec2 nb=vec2(x,y); vec2 cc=floor(cu)+nb; vec2 pt=cc+.5+sin(u_time*.1+cc)*.3; c+=smoothstep(.4,.38,length(cu-pt));}} c=clamp(c,0.,1.); vec3 cc=mix(colStrangeGreen,colPrimary,n); cc=mix(cc,colDeepRed,smoothstep(.6,.8,n)); color=mix(colBackground*.5,cc,c*1.2); color+=fbm(uv*15.+u_time*.5)*.05; [cite: 325, 326, 327, 328, 329, 330, 331, 332, 333, 334, 335]
            } else if (phaseIndex == 5) { // Glitch / Corruption
                float t=phaseProgress; vec2 bu=floor(originalUV*mix(20.,60.,sin(u_time*2.)*.5+.5))/mix(20.,60.,sin(u_time*2.)*.5+.5); float bn=fbm(bu*5.+u_time*.5); color=mix(colPrimary,colSecondary,bn); float tl=sin(originalUV.y*10.+u_time*5.)*.5+.5; float ta=smoothstep(.8,.85,tl); float ofs=ta*(rand(vec2(floor(u_time*2.),floor(originalUV.y*10.)))-.5)*.1; vec2 tu=uv+vec2(ofs*t,0.); float tn=fbm(tu*4.+u_time*.3); color=mix(color,mix(colTertiary,colDeepRed,tn),ta); float cao=(.005+.01*abs(sin(u_time*3.)))*t; vec3 cR=getColorForCA(uv+vec2(cao,0.),u_time); vec3 cB=getColorForCA(uv-vec2(cao*.5,cao*.8),u_time); color=vec3(cR.r,color.g,cB.b); color+=(rand(originalUV+fract(u_time*10.))-.5)*.15*t; [cite: 336, 337, 338, 339, 340, 341, 342, 343, 344, 345, 346, 347]
            } else if (phaseIndex == 6) { // Simplex Noise Flow
                vec2 p=uv*2.; float i=fbm(p+u_time*.3); float r=abs(snoise(vec3(p*1.5,u_time*.5))); r=pow(1.-r,4.); vec3 fc=mix(colPrimary,colTertiary,smoothstep(0.,1.,i)); color=mix(colBackground*.4,fc,r*1.5); color*=1.-smoothstep(.8,1.5,length(uv)); [cite: 348, 349, 350, 351, 352, 353]
            } else if (phaseIndex == 7) { // Worley Noise
                vec2 p=uv*3.+vec2(u_time*.1,u_time*.2); float d=worley(p); float e=1.-smoothstep(0.,.05,d); float c=smoothstep(0.,.4,d); vec3 cc=mix(colStrangeGreen,colGold,c*1.2); color=mix(cc*.3,colWhite,e); [cite: 354, 355, 356, 357, 358, 359]
            } else if (phaseIndex == 8) { // Rotating Tunnel
                vec2 p=uv; p=rotate2D(u_time*.4)*p; float a=atan(p.y,p.x); float rd=length(p); float t=fbm(vec2(1./(rd+.1),a*2.)+u_time*.2); float r=sin(rd*20.-u_time*3.)*.5+.5; vec3 tc=mix(colSecondary,colPink,smoothstep(0.,1.,t)); color=mix(colBackground,tc,(smoothstep(0.,.8,t)+r*.5)*.8); [cite: 360, 361, 362, 363, 364, 365, 366]
            } else if (phaseIndex == 9) { // Truchet Tiles
                float s=mix(4.,8.,sin(u_time*.5)*.5+.5); float p=truchetPattern(uv,s); vec2 us=uv*s; float bn=noise(floor(us)+u_time*.1); vec3 tc=mix(colPrimary,colTertiary,bn); color=mix(tc*.2,colWhite*.9,p); [cite: 367, 368, 369, 370, 371]
            } else if (phaseIndex == 10) { // Pseudo Plasma
                float v=0.; v+=sin((uv.x*3.+u_time*.8)); v+=sin((uv.y*4.-u_time*.5)+v*.5); v+=sin((uv.x*uv.y*2.+u_time)); float cx=uv.x+.5*sin(u_time/5.); float cy=uv.y+.5*cos(u_time/3.); v+=sin(sqrt(cx*cx+cy*cy)*5.+u_time); v*=.5; vec3 pc1=mix(colDeepRed,colOrange,sin(u_time*.2)*.5+.5); vec3 pc2=mix(colPrimary,colSecondary,cos(u_time*.3)*.5+.5); color=mix(pc1,pc2,smoothstep(-.8,.8,v)); [cite: 372, 373, 374, 375, 376, 377, 378, 379]
            } else if (phaseIndex == 11) { // Digital Rain
                vec2 gu=originalUV*vec2(80.,60.); vec2 c=floor(gu); float sp=rand(c.x)*3.+1.; float ss=rand(c.x)*10.; float sps=fract(ss-u_time*sp*.1); float cy=originalUV.y; float tl=.15+rand(c.x)*.1; float ci=smoothstep(sps,sps+.01,cy)*(1.-smoothstep(sps+.01,sps+tl,cy)); float cv=rand(c+floor((ss-u_time*sp*.1)*10.)); vec3 rc=mix(colStrangeGreen*.5,colGreen*1.5,step(.5,cv)); color=mix(colBackground,rc,ci); [cite: 380, 381, 382, 383, 384, 385, 386, 387, 388, 389]
            } else if (phaseIndex == 12) { // Mandelbrot Zoom
                float z= .5+pow(mod(u_time*.05,5.)+1.,2.); vec2 c=uv*1.5/z-vec2(.7,0.); vec2 zz=vec2(0.); int it=0; for(int i=0;i<MANDELBROT_ITER;i++){zz=vec2(zz.x*zz.x-zz.y*zz.y,2.*zz.x*zz.y)+c; if(dot(zz,zz)>4.)break; it++;} float m=float(it)/float(MANDELBROT_ITER); m=pow(m,.5); color=mix(colBackground,mix(colPrimary,colGold,m),smoothstep(0.,.1,m)); if(it==MANDELBROT_ITER)color=colBackground*.5; [cite: 390, 391, 392, 393, 394, 395, 396, 397, 398]
            } else if (phaseIndex == 13) { // Wobbly Grid
                vec2 d=vec2(snoise(vec3(uv*2.,u_time*.3)),snoise(vec3(uv*2.+10.,u_time*.35)))*.15; vec2 du=uv+d; vec2 g=abs(fract(du*6.)-.5); float l=smoothstep(.03,.04,min(g.x,g.y)); float n=fbm(du*3.+u_time*.1); vec3 gc=mix(colTertiary,colPink,n); color=mix(colBackground*.5,gc,l*1.2); [cite: 399, 400, 401, 402, 403, 404, 405, 406]
            } else if (phaseIndex == 14) { // Heightmap Flow
                float h=snoise(vec3(uv*1.5,u_time*.2)); float f=snoise(vec3(uv*3.+h*.3,u_time*.4)); float la=.785; float l=.5+h*.5*cos(atan(uv.y,uv.x)-la); l=clamp(l,.2,1.); vec3 tc=mix(colGreen*.8,colGold*.6,h*.5+.5); vec3 wc=mix(colPrimary*.7,colTertiary*.9,f*.5+.5); color=mix(wc,tc*l,smoothstep(-.1,.1,h))*.8; [cite: 407, 408, 409, 410, 411, 412, 413, 414]
            } else if (phaseIndex == 15) { // Recursive Boxes
                vec2 p=abs(uv)*.8; float s=1.5+.5*sin(u_time*.4); for(int i=0;i<4;i++){p=abs(p*s-1.);if(dot(p,p)>20.)break;} float r=length(p)*.2; r=sin(r*10.+u_time); color=mix(colSecondary,colPrimary,smoothstep(-.5,.5,r)); [cite: 415, 416, 417, 418, 419, 420, 421]
            } else if (phaseIndex == 16) { // Crystal Growth
                vec2 p=uv*2.5; float d1=worley(p); float d2=worley(p+vec2(5.2,1.3)); float c=pow(1.-smoothstep(0.,.1,d1),2.); c+=pow(1.-smoothstep(0.,.05,d2),2.)*.5; c=clamp(c,0.,1.); float g=fbm(p*10.+u_time*.1); vec3 cc=mix(colWhite*.8,colTertiary,g); color=mix(colBackground*.8,cc,c); [cite: 422, 423, 424, 425, 426, 427, 428, 429, 430]
            } else if (phaseIndex == 17) { // Flickering Scanlines
                float i=.5+.5*noise(vec2(u_time*1.5,originalUV.y*5.)); float fs=floor(u_time*15.)+floor(originalUV.y*10.); float f=rand(fs); i*=smoothstep(.2,.8,f); vec3 bc=mix(colPrimary,colSecondary,noise(uv*3.+u_time*.2)); float sy=fract(originalUV.y*u_resolution.y*.5); float se=smoothstep(.4,.5,sy)*(1.-smoothstep(.5,.6,sy)); color=mix(bc*.5,vec3(0.),se*i*1.5); color+=(rand(originalUV+u_time)-.5)*.1*i; [cite: 431, 432, 433, 434, 435, 436, 437, 438]
            } else if (phaseIndex == 18) { // Simple Raymarch
                vec3 ro=vec3(0.,0.,-3.+sin(u_time*.3)); vec3 rd=normalize(vec3(uv,1.)); vec3 col=colBackground; float t=0.; for(int i=0;i<MAX_RAYMARCH_STEPS;i++){ vec3 p=ro+rd*t; vec3 sc=vec3(0.,sin(u_time*.8)*.5-.2,0.); float ds=sdSphere(p-sc,.5); float dp=sdPlane(p,vec3(0.,1.,0.),1.); float d=min(ds,dp); if(d<.001*t){ vec3 hc; vec3 n; if(dp<ds){hc=colGreen*.8;n=vec3(0.,1.,0.);}else{hc=colPrimary;vec2 eps=vec2(.001,0.);n=normalize(vec3(sdSphere(p+eps.xyy-sc,.5)-sdSphere(p-eps.xyy-sc,.5),sdSphere(p+eps.yxy-sc,.5)-sdSphere(p-eps.yxy-sc,.5),sdSphere(p+eps.yyx-sc,.5)-sdSphere(p-eps.yyx-sc,.5)));} float l=max(.2,dot(n,normalize(vec3(-.7,.7,-.5)))); col=hc*l; break; } t+=d; if(t>MAX_RAYMARCH_DIST)break; } color=col; [cite: 439, 440, 441, 442, 443, 444, 445, 446, 447, 448, 449, 450, 451, 452, 453, 454, 455, 456, 457, 458, 459]
            } else { // Phase 19: Warp Speed Streaks
                float rd=length(uv); float s=0.; for(float i=0.;i<15.;i++){ float seed=i*13.37; float st=u_time*(.5+rand(seed))*1.5+rand(seed+1.)*10.; float sd=fract(st)*3.; float sa=rand(seed+2.)*TWO_PI+u_time*rand(seed+3.)*.05; vec2 sp=vec2(cos(sa),sin(sa))*sd; float ds=length(uv-sp); float sl=.02+sd*.1; float si=smoothstep(sl,0.,ds)*(1.-smoothstep(1.,1.5,sd)); s+=si; } vec3 sc=mix(colWhite,colSecondary,clamp(rd*.5,0.,1.)); color=mix(colBackground,sc,clamp(s,0.,1.)); [cite: 460, 461, 462, 463, 464, 465, 466, 467, 468, 469, 470, 471]
            }

            // --- Global Effects ---
            float sv = sin(originalUV.y * u_resolution.y * 0.8 + u_time * 0.1) * 0.5 + 0.5; [cite: 472]
            float si = 0.03 + 0.015 * sin(u_time * 0.5); [cite: 473]
            color = mix(color, color * (1.0 - si * 0.8), smoothstep(0.3, 0.0, sv)); [cite: 474]
            color = mix(color, color * (1.0 + si * 0.5), smoothstep(0.7, 1.0, sv)); [cite: 475]
            float v = smoothstep(1.5, 0.5, length(uv)); [cite: 476]
            color *= v; [cite: 477]
            outColor = vec4(clamp(color, 0.0, 1.0), 1.0); [cite: 478]
        }
    `;

    // --- WebGL utility functions ---
    function createShader(gl, type, source) {
        const shader = gl.createShader(type); [cite: 479]
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            const shaderType = type === gl.VERTEX_SHADER ? 'Vertex' : 'Fragment'; [cite: 480]
            console.error(`>>> Shader compile error (${shaderType}):\n${gl.getShaderInfoLog(shader)}`);
            const lines = source.split('\n'); [cite: 481]
            const sourceWithLines = lines.map((line, index) => `${index + 1}: ${line}`).join('\n');
            console.error(`--- Shader Source (${shaderType}) ---\n${sourceWithLines}\n--------------------------`);
            gl.deleteShader(shader);
            return null; [cite: 482]
        }
        return shader; [cite: 483]
    }

    function createProgram(gl, vertexShader, fragmentShader) {
        if (!vertexShader || !fragmentShader) { console.error("Cannot create program without valid shaders."); return null; } [cite: 484]
        const program = gl.createProgram();
        gl.attachShader(program, vertexShader); [cite: 485]
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error('>>> Program link error:', gl.getProgramInfoLog(program)); [cite: 486]
             const shaders = gl.getAttachedShaders(program); [cite: 487]
             shaders.forEach(shader => { console.error(`--- Attached ${gl.getShaderParameter(shader, gl.SHADER_TYPE) === gl.VERTEX_SHADER ? 'Vertex' : 'Fragment'} Shader Info Log ---\n${gl.getShaderInfoLog(shader)}`); }); [cite: 488]
            gl.deleteProgram(program);
            return null;
        }
        // Detaching is optional after successful link [cite: 489]
        return program;
    }

    // --- Initialize WebGL shaders and program ---
    let program = null; [cite: 490]
    let positionAttributeLocation = -1;
    let timeUniformLocation = null; [cite: 491]
    let resolutionUniformLocation = null;
    let positionBuffer = null;
    let FBM_OCTAVES = 5; // Make FBM_OCTAVES accessible for shader update

    function setupWebGL() {
        const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
        let fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource); [cite: 492]
        program = createProgram(gl, vertexShader, fragmentShader); [cite: 493]

        if (vertexShader) gl.deleteShader(vertexShader); [cite: 494]
        if (fragmentShader) gl.deleteShader(fragmentShader);

        if (program) {
            positionAttributeLocation = gl.getAttribLocation(program, "a_position"); [cite: 495]
            timeUniformLocation = gl.getUniformLocation(program, "u_time");
            resolutionUniformLocation = gl.getUniformLocation(program, "u_resolution");

            if (positionAttributeLocation === -1) console.warn("Attribute 'a_position' not found."); [cite: 496]
            if (timeUniformLocation === null) console.warn("Uniform 'u_time' not found."); [cite: 497]
            if (resolutionUniformLocation === null) console.warn("Uniform 'u_resolution' not found.");

            positionBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer); [cite: 498]
            const positions = [-1, 1, -1, -1, 1, 1, 1, -1]; [cite: 499]
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW); [cite: 500]
            return true; // Setup successful
        } else {
            console.error(">>> Failed to initialize WebGL program. Background will be static."); [cite: 515]
            if(document.body) document.body.style.backgroundColor = '#050511';
            return false; // Setup failed
        }
    }


    // --- Render Loop ---
    let startTime = performance.now();
    let animationFrameId = null;

    function render(now) {
        if (!program) { if(animationFrameId) cancelAnimationFrame(animationFrameId); return; } [cite: 501]

        let time = (now - startTime) * 0.001; [cite: 502]

        if (webglCanvas.width !== window.innerWidth || webglCanvas.height !== window.innerHeight) {
            webglCanvas.width = window.innerWidth; [cite: 503]
            webglCanvas.height = window.innerHeight;
            gl.viewport(0, 0, gl.canvas.width, gl.canvas.height); [cite: 504]
        }

        gl.useProgram(program); [cite: 505]

        if (positionAttributeLocation !== -1 && positionBuffer !== null) {
            gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer); [cite: 506]
            gl.enableVertexAttribArray(positionAttributeLocation); [cite: 507]
            gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0); [cite: 508, 509]
        }

        if (timeUniformLocation !== null) { gl.uniform1f(timeUniformLocation, time); } [cite: 510]
        if (resolutionUniformLocation !== null) { gl.uniform2f(resolutionUniformLocation, gl.canvas.width, gl.canvas.height); } [cite: 511]

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); [cite: 512]
        animationFrameId = requestAnimationFrame(render); [cite: 513]
    }

    // --- Shader Update Function ---
    window.updateShader = function(newShaderCode) {
        if (!gl) { console.warn("WebGL inactive. Cannot update shader."); return; } [cite: 516]
        console.log("Attempting shader update..."); [cite: 517]
        try {
            if (!newShaderCode || newShaderCode.indexOf('main()') === -1) { console.error("Invalid shader code: Missing main()."); return; } [cite: 518, 519]

             const completeNewFragmentSource = `#version 300 es
                precision highp float; [cite: 520]
                uniform float u_time;
                uniform vec2 u_resolution;
                out vec4 outColor;
                float hash(float n){return fract(sin(n)*43758.5453);} [cite: 521]
                float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);float n=i.x+i.y*57.;return mix(mix(hash(n),hash(n+1.),f.x),mix(hash(n+57.),hash(n+58.),f.x),f.y);} [cite: 522]
                float fbm(vec2 p){float s=0.,a=.7,f=1.;for(int i=0;i<${FBM_OCTAVES};i++){s+=noise(p*f)*a;a*=.5;f*=2.;}return s;}
                float rand(vec2 co){return fract(sin(dot(co.xy,vec2(12.9898,78.233)))*43758.5453);} [cite: 523]
                vec3 colPrimary=vec3(106./255.,0.,1.); [cite: 524]
                vec3 colSecondary=vec3(0.,1.,204./255.);
                vec3 colTertiary=vec3(0.,184./255.,212./255.);
                vec3 colBackground=vec3(5./255.,5./255.,17./255.); [cite: 525]
                ${newShaderCode} // Inject user code
            `; [cite: 526]

             const currentVertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource); [cite: 527]
             const newFragmentShader = createShader(gl, gl.FRAGMENT_SHADER, completeNewFragmentSource);

             if (!newFragmentShader || !currentVertexShader) {
                 console.error("Failed to compile new shaders."); [cite: 528]
                 if (newFragmentShader) gl.deleteShader(newFragmentShader); [cite: 529]
                 if (currentVertexShader) gl.deleteShader(currentVertexShader);
                 if(typeof showNotification === 'function') showNotification("SHADER COMPILE ERROR."); else console.error("SHADER COMPILE ERROR.");
                 return; [cite: 530]
             }

             const newProgram = createProgram(gl, currentVertexShader, newFragmentShader); [cite: 531]
             gl.deleteShader(newFragmentShader); [cite: 532]
             gl.deleteShader(currentVertexShader);

             if (!newProgram) { console.error("Failed to link new program."); if(typeof showNotification === 'function') showNotification("SHADER LINK ERROR."); else console.error("SHADER LINK ERROR."); return; } [cite: 533, 534, 535]

             if (program) { gl.deleteProgram(program); } [cite: 537]
             program = newProgram; [cite: 538]

             positionAttributeLocation = gl.getAttribLocation(program, "a_position"); [cite: 539]
             timeUniformLocation = gl.getUniformLocation(program, "u_time");
             resolutionUniformLocation = gl.getUniformLocation(program, "u_resolution");

             if (positionAttributeLocation === -1) console.warn("New program missing 'a_position'."); [cite: 540]
             if (timeUniformLocation === null) console.warn("New program missing 'u_time'.");
             if (resolutionUniformLocation === null) console.warn("New program missing 'u_resolution'."); [cite: 541]

             gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer); // Ensure buffer is bound [cite: 542]
             console.log("Shader updated successfully."); [cite: 543]
             if(typeof showNotification === 'function') showNotification("SHADER UPDATE SUCCESSFUL."); else console.log("SHADER UPDATE SUCCESSFUL.");
        } catch (e) {
             console.error('>>> Shader update error:', e); [cite: 544]
             if(typeof showNotification === 'function') showNotification(`SHADER UPDATE FAILED: ${e.message}`); else console.error(`SHADER UPDATE FAILED: ${e.message}`); [cite: 545]
        }
    };

    // --- Start WebGL ---
    if (setupWebGL()) {
        animationFrameId = requestAnimationFrame(render); [cite: 514]
    }

    // --- Resize Listener ---
    window.addEventListener('resize', () => {
        if (gl && webglCanvas) {
            // Viewport update is handled within the render loop [cite: 546, 547]
            // Canvas width/height are also updated in the loop check
        }
    }); [cite: 548]

} // End of WebGL context check