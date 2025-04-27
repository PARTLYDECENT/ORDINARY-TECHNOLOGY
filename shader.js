// Wrap everything in an Immediately Invoked Function Expression (IIFE)
// to avoid polluting the global scope unnecessarily, except for `window.updateShader`.
(function() {
    "use strict"; // Enable strict mode

    // --- WebGL Setup and Shader Logic ---
    // Line 3
    const webglCanvas = document.getElementById('webglCanvas'); // Line 4 (Approximate target of error)
    let gl = null; // Keep gl scoped within this IIFE // Line 5

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

    // Fragment Shader (GLSL 3.00 ES - 20 Phases)
    const fragmentShaderSource = \`#version 300 es
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

        // Basic color getter for CA effect
        vec3 getColorForCA(vec2 uv, float t) { float n = fbm(uv*4. + t*.15); return mix(colPrimary, colTertiary, n); }

        // --- Main Shader Logic ---
        void main() {
            // Normalized device coordinates, aspect corrected, origin center
            vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / min(u_resolution.y, u_resolution.x);
            // Original UV coordinates (0 to 1)
            vec2 originalUV = gl_FragCoord.xy / u_resolution.xy;

            float time_warp = u_time * 0.1; // Controls phase speed
            const float TOTAL_PHASES_F = 20.0;
            float phase = mod(time_warp, TOTAL_PHASES_F);
            float phaseProgress = fract(phase); // Progress within current phase
            int phaseIndex = int(floor(phase)); // Current phase index (0-19)

            vec3 color = colBackground; // Start with background

            // --- Phase Implementations (Condensed versions) ---
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
            else if (phaseIndex == 12) { float z=.5+pow(mod(u_time*.05,5.)+1.,2.); vec2 c=uv*1.5/z-vec2(.7,0.), zz=vec2(0.); int it=0; for(int i=0;i<MANDELBROT_ITER;i++){zz=vec2(zz.x*zz.x-zz.y*zz.y,2.*zz.x*zz.y)+c; if(dot(zz,zz)>4.)break; it++;} float m=clamp(float(it)/float(MANDELBROT_ITER),0.,1.); m=pow(m,.5); color=mix(colBackground,mix(colPrimary,colGold,m),smoothstep(0.,.1,m)); if(it==MANDELBROT_ITER)color=colBackground*.5; }
            else if (phaseIndex == 13) { vec2 d=vec2(snoise(vec3(uv*2.,u_time*.3)),snoise(vec3(uv*2.+10.,u_time*.35)))*.15, du=uv+d; vec2 g=abs(fract(du*6.)-.5); float l=smoothstep(.03,.04,min(g.x,g.y)); float n=fbm(du*3.+u_time*.1); vec3 gc=mix(colTertiary,colPink,n); color=mix(colBackground*.5,gc,l*1.2); }
            else if (phaseIndex == 14) { float h=snoise(vec3(uv*1.5,u_time*.2)), f=snoise(vec3(uv*3.+h*.3,u_time*.4)); float la=.785, l=clamp(.5+h*.5*cos(atan(uv.y,uv.x)-la),.2,1.); vec3 tc=mix(colGreen*.8,colGold*.6,h*.5+.5), wc=mix(colPrimary*.7,colTertiary*.9,f*.5+.5); color=mix(wc,tc*l,smoothstep(-.1,.1,h))*.8; }
            else if (phaseIndex == 15) { vec2 p=abs(uv)*.8; float s=1.5+.5*sin(u_time*.4); for(int i=0;i<4;i++){ p=abs(p*s-1.); if(dot(p,p)>20.)break; } float r=sin(length(p)*.2*10.+u_time); color=mix(colSecondary,colPrimary,smoothstep(-.5,.5,r)); }
            else if (phaseIndex == 16) { vec2 p=uv*2.5; float d1=worley(p), d2=worley(p+vec2(5.2,1.3)); float c=pow(1.-smoothstep(0.,.1,d1),2.)+pow(1.-smoothstep(0.,.05,d2),2.)*.5; c=clamp(c,0.,1.); float g=fbm(p*10.+u_time*.1); vec3 cc=mix(colWhite*.8,colTertiary,g); color=mix(colBackground*.8,cc,c); }
            else if (phaseIndex == 17) { float i=.5+.5*noise(vec2(u_time*1.5,originalUV.y*5.)); float fs=floor(u_time*15.)+floor(originalUV.y*10.), f=rand(fs); i*=smoothstep(.2,.8,f); vec3 bc=mix(colPrimary,colSecondary,noise(uv*3.+u_time*.2)); float sy=fract(originalUV.y*u_resolution.y*.5), se=smoothstep(.4,.5,sy)*(1.-smoothstep(.5,.6,sy)); color=mix(bc*.5,vec3(0.),se*i*1.5); color+=(rand(originalUV+u_time)-.5)*.1*i; }
            else if (phaseIndex == 18) { vec3 ro=vec3(0.,0.,-3.+sin(u_time*.3)), rd=normalize(vec3(uv,1.)); vec3 col=colBackground; float t=0.; for(int i=0;i<MAX_RAYMARCH_STEPS;i++){ vec3 p=ro+rd*t, sc=vec3(0.,sin(u_time*.8)*.5-.2,0.); float ds=sdSphere(p-sc,.5), dp=sdPlane(p,vec3(0.,1.,0.),1.); float d=min(ds,dp); if(d<.001*t){ vec3 hc, n; if(dp<ds){hc=colGreen*.8;n=vec3(0.,1.,0.);}else{hc=colPrimary;vec2 eps=vec2(.001,0.);n=normalize(vec3(sdSphere(p+eps.xyy-sc,.5)-sdSphere(p-eps.xyy-sc,.5),sdSphere(p+eps.yxy-sc,.5)-sdSphere(p-eps.yxy-sc,.5),sdSphere(p+eps.yyx-sc,.5)-sdSphere(p-eps.yyx-sc,.5)));} float l=max(.2,dot(n,normalize(vec3(-.7,.7,-.5)))); col=hc*l; break; } t+=d; if(t>MAX_RAYMARCH_DIST)break; } color=col; }
            else { /* phaseIndex == 19 */ float rd=length(uv), s=0.; for(float i=0.;i<15.;i++){ float seed=i*13.37, st=u_time*(.5+rand(seed))*1.5+rand(seed+1.)*10., sd=fract(st)*3., sa=rand(seed+2.)*TWO_PI+u_time*rand(seed+3.)*.05; vec2 sp=vec2(cos(sa),sin(sa))*sd; float ds=length(uv-sp), sl=.02+sd*.1, si=smoothstep(sl,0.,ds)*(1.-smoothstep(1.,1.5,sd)); s+=si; } vec3 sc=mix(colWhite,colSecondary,clamp(rd*.5,0.,1.)); color=mix(colBackground,sc,clamp(s,0.,1.)); }

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
    \`; // Using template literal for easier multi-line string

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
        // Detach shaders after linking
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

         const completeNewFragmentSource = \`#version 300 es
            precision highp float;
            uniform float u_time;
            uniform vec2 u_resolution;
            out vec4 outColor;
            const int FBM_OCTAVES = \${FBM_OCTAVES};
            float hash(float n){return fract(sin(n)*43758.5453);}
            float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);float n=i.x+i.y*57.;return mix(mix(hash(n),hash(n+1.),f.x),mix(hash(n+57.),hash(n+58.),f.x),f.y);}
            float fbm(vec2 p){float s=0.,a=.7,f=1.;for(int i=0;i<FBM_OCTAVES;i++){s+=noise(p*f)*a;a*=.5;f*=2.;}return s;}
            float rand(vec2 co){return fract(sin(dot(co.xy,vec2(12.9898,78.233)))*43758.5453);}
            vec3 colPrimary=vec3(106./255.,0.,1.); vec3 colSecondary=vec3(0.,1.,204./255.); vec3 colTertiary=vec3(0.,184./255.,212./255.); vec3 colBackground=vec3(5./255.,5./255.,17./255.);
            \${newShaderCode} // Inject user code
        \`; // Using template literal

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
