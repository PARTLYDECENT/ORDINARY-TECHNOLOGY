/**
 * EASTER EGG — "THE ESCAPISM"
 * Triggers for the first 15 seconds of every spawn and respawn.
 * Insane GPU shader pipeline: chromatic shatter, pixel sort, datamosh,
 * SDF biomass horror, procedural audio, DOM corruption.
 */

class EasterEgg {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.active = false;
        this.timer = 0;
        this.duration = 30.0;
        this.introTime = 3.0;   // Black screen intro
        this.outroTime = 2.0;   // Fade back out
        this.phase = 0;
        this.totalElapsed = 0;
        this.spawnTriggered = false;
        this._audioCtx = null;
        this._audioNodes = [];
        this._domOverlays = [];
        this._cssBackup = '';
        this._camOrigFov = null;
        this._camOrigRotZ = null;
        this._gameCamera = null;

        this.camera = new THREE.OrthographicCamera(-width/2, width/2, height/2, -height/2, 0.1, 10);
        this.camera.position.z = 1;
        this.scene2 = new THREE.Scene();
        this._buildShader();
        const geo = new THREE.PlaneGeometry(width, height);
        this.mesh = new THREE.Mesh(geo, this.material);
        this.scene2.add(this.mesh);
    }

    _buildShader() {
        const vert = `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`;
        const frag = `
uniform vec2 uRes;
uniform float uTime;
uniform float uPresence;
uniform float uPhase;
uniform float uSeed;
varying vec2 vUv;

float h12(vec2 p){vec3 p3=fract(vec3(p.xyx)*.1031);p3+=dot(p3,p3.yzx+33.33);return fract((p3.x+p3.y)*p3.z);}
float h11(float p){p=fract(p*.1031);p*=p+33.33;p*=p+p;return fract(p);}
float nse(vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*(3.0-2.0*f);return mix(mix(h12(i),h12(i+vec2(1,0)),u.x),mix(h12(i+vec2(0,1)),h12(i+vec2(1,1)),u.x),u.y);}
float fbm(vec2 x){float v=0.0,a=0.5;mat2 r=mat2(cos(.5),sin(.5),-sin(.5),cos(.5));for(int i=0;i<6;i++){v+=a*nse(x);x=r*x*2.0+100.0;a*=0.5;}return v;}
float sdC(vec2 p,float r){return length(p)-r;}
float smn(float a,float b,float k){float h=clamp(.5+.5*(b-a)/k,0.0,1.0);return mix(b,a,h)-k*h*(1.0-h);}

vec2 voronoi(vec2 x){vec2 p=floor(x),f=fract(x);float res=8.0;vec2 id=vec2(0);
for(int j=-1;j<=1;j++)for(int i=-1;i<=1;i++){vec2 b=vec2(float(i),float(j));vec2 r=b-f+h12(p+b);float d=dot(r,r);if(d<res){res=d;id=p+b;}}return vec2(sqrt(res),h12(id));}

float biomass(vec2 p,float t){
    float pulse=sin(t*3.0)*0.3+1.0;
    float core=sdC(p,80.0*pulse*uPresence);
    vec2 w=p+vec2(fbm(p*0.01+t*2.0+uSeed)-0.5,fbm(p*0.01-t*1.5+uSeed+50.0)-0.5)*120.0*uPresence;
    core+=fbm(w*0.02+t)*60.0;
    for(int i=0;i<5;i++){float fi=float(i);float a=t*(0.5+fi*0.3)+fi*1.2566+uSeed;float d2=(60.0+sin(t*2.0+fi)*30.0)*uPresence;
    vec2 bp=vec2(cos(a),sin(a))*d2;core=smn(core,sdC(p-bp,(20.0+fbm(vec2(t+fi,uSeed))*15.0)*uPresence),30.0);}return core;}

float veins(vec2 p,float t){float d=1000.0;for(int i=0;i<8;i++){float fi=float(i);float a=fi*0.7854+uSeed;vec2 dir=vec2(cos(a),sin(a));
vec2 s=vec2(0);float l=(150.0+sin(t*1.5+fi)*50.0)*uPresence;vec2 e=dir*l;vec2 m=(s+e)*0.5+vec2(sin(t*3.0+fi),cos(t*2.5+fi))*30.0;
vec2 pa=p-s,ba=m-s;float h1=clamp(dot(pa,ba)/dot(ba,ba),0.0,1.0);float d1=length(pa-ba*h1)-(2.0+sin(t*5.0+fi));
vec2 pa2=p-m,ba2=e-m;float h2=clamp(dot(pa2,ba2)/dot(ba2,ba2),0.0,1.0);float d2=length(pa2-ba2*h2)-(1.5+cos(t*4.0+fi)*0.5);
d=min(d,min(d1,d2)+fbm(p*0.05+t+fi)*5.0);}return d;}

void main(){
    if(uPresence<0.001){gl_FragColor=vec4(0);return;}
    vec2 px=(vUv-0.5)*uRes;
    float t=uTime, pr=uPresence;
    vec3 col=vec3(0); float alpha=0.0;

    // Screen warp
    vec2 wuv=vUv+vec2(sin(vUv.y*20.0+t*5.0),cos(vUv.x*15.0+t*4.0))*pr*0.03;
    vec2 wpx=(wuv-0.5)*uRes;

    // CHROMATIC SHATTER via Voronoi
    vec2 vor=voronoi(vUv*(3.0+pr*12.0)+t*0.5);
    float cellEdge=smoothstep(0.0,0.05+(1.0-pr)*0.2,vor.x);
    float sOff=vor.y*0.03*pr;
    float r=0.0,g=0.0,b=0.0;
    // Pixel sort bands
    vec2 sortUV=vUv;
    float sortB=step(0.5,sin(vUv.y*20.0+t*3.0))*pr;
    if(sortB>0.3){float lm=0.0;for(float s=0.0;s<10.0;s+=1.0){vec2 su=vUv+vec2(s*0.003*pr,0);
    vec3 sc=vec3(nse(su*100.0+t),nse(su*80.0-t),nse(su*60.0+t*0.5));float l=dot(sc,vec3(.299,.587,.114));if(l>lm){lm=l;sortUV=su;}}}

    vec2 rUV=sortUV+vec2(sOff,-sOff*0.5)*pr;
    vec2 gUV=sortUV;
    vec2 bUV=sortUV-vec2(sOff*0.7,sOff)*pr;

    // BIOMASS
    float dM=biomass(wpx,t);
    float mGlow=1.0-smoothstep(0.0,25.0,dM);
    float mCore=1.0-smoothstep(0.0,3.0,dM);
    if(mGlow>0.0){float cs=fbm(wpx*0.01+t*0.5);
    vec3 mc=mix(vec3(0.3,0,0.15),vec3(0,0.4,0.1),cs);mc=mix(mc,vec3(0.5,0,0.5),sin(t*2.0)*0.5+0.5);
    mc+=mCore*vec3(0.8,0.2,0.1)+fbm(wpx*0.03+t*2.0)*0.4*vec3(0.1,0.3,0);col=mc;alpha=mGlow*pr;}

    // VEINS
    float dV=veins(wpx,t);float vG=1.0-smoothstep(0.0,8.0,dV);float vC=1.0-smoothstep(0.0,1.5,dV);
    if(vG>0.0){float pulse=sin(t*6.0-length(wpx)*0.05)*0.5+0.5;vec3 vc=mix(vec3(0.15,0,0),vec3(0.6,0,0.05),pulse)+vC*vec3(0.9,0.1,0);
    col=mix(col,vc,vG*pr);alpha=max(alpha,vG*pr*0.9);}

    // DIMENSIONAL TEARS
    if(uPhase>=2.0){vec2 ctr=vec2(0.5+sin(t*1.3)*0.3,0.5+cos(t*0.9)*0.3);float dist=length(vUv-ctr);
    float hole=smoothstep(0.05*pr,0.0,dist-0.02*pr);float vP=sin(t*20.0+dist*50.0)*0.5+0.5;
    col=mix(col,vec3(0.1*vP,0,0.15*vP),hole*pr*0.7);alpha=max(alpha,hole*pr);}

    // DATAMOSH
    if(uPhase>=3.0){float bs=0.02+0.05*(1.0-pr);vec2 blk=floor(vUv/bs)*bs;float rnd=h12(blk+floor(t*8.0));
    if(rnd>0.7){vec2 disp=vUv+vec2((h12(blk+1.0)-0.5)*0.08*pr,(h12(blk+2.0)-0.5)*0.08*pr);
    col=mix(col,vec3(nse(disp*50.0+t),nse(disp*40.0-t),nse(disp*30.0+t*0.7)),0.5);}}

    // SCREEN INVERSION FLASH
    if(uPhase>=3.5){float flash=step(0.97,sin(t*15.0));col=mix(col,1.0-col,flash*pr);}

    // Edge creep
    float eD=min(min(vUv.x,1.0-vUv.x),min(vUv.y,1.0-vUv.y));
    float eC=(1.0-smoothstep(0.0,0.15+0.1*sin(t*2.0),eD))*pr*(0.5+0.5*fbm(vUv*10.0+t*2.0));
    if(eC>0.0){col=mix(col,vec3(0.05,0,0),eC);alpha=max(alpha,eC*0.8);}

    // Cell edge glow
    col+=vec3(0.2,0,0.3)*(1.0-cellEdge)*pr*2.0;

    // VHS scanlines + noise
    col+=sin(vUv.y*800.0+t*50.0)*sin(vUv.y*800.0+t*50.0)*0.03*pr;
    col+=h12(vUv*uRes+t*100.0)*0.12*pr;

    // Chromatic split on final
    float caS=pr*0.008*(1.0+sin(t*10.0)*0.5);
    col.r+=fbm(vUv*30.0+t*3.0)*caS*40.0;
    col.b+=fbm(vUv*25.0-t*2.0)*caS*30.0;

    // Vignette
    float vig=1.0-length(vUv-0.5)*pr*1.5;
    col*=max(vig,0.2);

    gl_FragColor=vec4(col,alpha);
}`;

        this.material = new THREE.ShaderMaterial({
            vertexShader: vert, fragmentShader: frag,
            uniforms: {
                uRes: { value: new THREE.Vector2(this.width, this.height) },
                uTime: { value: 0 }, uPresence: { value: 0 },
                uPhase: { value: 0 }, uSeed: { value: Math.random() * 100 }
            },
            transparent: true, depthTest: false, depthWrite: false
        });
    }

    /** Call this on every spawn and respawn */
    triggerSpawn() {
        this.active = true;
        this.timer = -this.introTime; // Negative = intro blackout phase
        this.phase = 0;
        this.material.uniforms.uSeed.value = Math.random() * 100;
        this.material.uniforms.uPresence.value = 0;
        // Grab game camera for phase 2 hijack
        if (window.cameraFPS) { this._gameCamera = window.cameraFPS; this._camOrigFov = window.cameraFPS.fov; this._camOrigRotZ = window.cameraFPS.rotation.z; }
        else if (window.activeCamera) { this._gameCamera = window.activeCamera; this._camOrigFov = window.activeCamera.fov; this._camOrigRotZ = window.activeCamera.rotation.z; }

        // FREEZE CONTROLS
        window.escapismCutscene = true;

        // BUILD BLACKOUT CUTSCENE
        this._buildBlackout();

        console.log('%c[THE ESCAPISM] ██ BLACKOUT ██', 'color:#f0f;font-weight:bold;text-shadow:0 0 15px #f0f,0 0 30px #f00');
    }

    _buildBlackout() {
        // Full-screen black overlay
        const bo = document.createElement('div');
        bo.id = 'escapism-blackout';
        bo.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:#000;z-index:100000;opacity:0;transition:opacity 0.8s ease;pointer-events:none;display:flex;align-items:center;justify-content:center;flex-direction:column;';
        bo.innerHTML = `
            <div id="esc-intro-text" style="opacity:0;transition:opacity 0.5s;text-align:center;font-family:'Courier New',monospace;">
                <div style="font-size:14px;color:#333;letter-spacing:12px;margin-bottom:20px;">SYSTEM INTERRUPT</div>
                <div id="esc-intro-main" style="font-size:64px;color:#f00;text-shadow:0 0 30px #f00,0 0 60px #800,0 0 90px #400;letter-spacing:16px;font-weight:900;">THE ESCAPISM</div>
                <div id="esc-intro-sub" style="font-size:16px;color:#600;margin-top:20px;letter-spacing:8px;opacity:0;transition:opacity 0.3s;">DIMENSIONAL BREACH DETECTED</div>
                <div id="esc-intro-bar" style="width:200px;height:2px;background:#222;margin:30px auto 0;overflow:hidden;border-radius:1px;">
                    <div id="esc-intro-fill" style="width:0%;height:100%;background:linear-gradient(90deg,#f00,#f0f);transition:width 2s linear;"></div>
                </div>
                <div id="esc-intro-glitch" style="font-size:11px;color:#444;margin-top:15px;letter-spacing:4px;"></div>
            </div>
        `;
        document.body.appendChild(bo);
        this._domOverlays.push(bo);

        // Animate blackout in
        requestAnimationFrame(() => {
            bo.style.opacity = '1';
            setTimeout(() => {
                const txt = document.getElementById('esc-intro-text');
                if (txt) txt.style.opacity = '1';
                // Fill bar
                setTimeout(() => {
                    const fill = document.getElementById('esc-intro-fill');
                    if (fill) fill.style.width = '100%';
                    const sub = document.getElementById('esc-intro-sub');
                    if (sub) sub.style.opacity = '1';
                }, 300);
                // Glitch text ticker
                const glitchEl = document.getElementById('esc-intro-glitch');
                if (glitchEl) {
                    const msgs = ['STACK OVERFLOW AT 0xDEAD','REALITY.DLL CORRUPTED','NEURAL LINK SEVERED','VOID DETECTED','BREACH IN PROGRESS'];
                    let gi = 0;
                    this._glitchInterval = setInterval(() => {
                        glitchEl.textContent = msgs[gi % msgs.length];
                        gi++;
                    }, 400);
                }
            }, 800);
        });

        // After intro time, start the audio + effects
        setTimeout(() => {
            this._startAudio();
            this._startDOMCorruption();
            // Fade blackout to transparent to reveal the chaos underneath
            const boEl = document.getElementById('escapism-blackout');
            if (boEl) {
                boEl.style.transition = 'opacity 1.5s ease';
                boEl.style.opacity = '0';
                setTimeout(() => { if(boEl) boEl.remove(); }, 1600);
            }
            if (this._glitchInterval) clearInterval(this._glitchInterval);
        }, this.introTime * 1000);
    }

    _startAudio() {
        try {
            this._stopAudio();
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            if (ctx.state === 'suspended') ctx.resume();
            this._audioCtx = ctx;
            const master = ctx.createGain();
            master.gain.value = 0;
            master.connect(ctx.destination);
            this._audioNodes = [master];

            master.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 2);

            // 23Hz sub drone
            const drone = ctx.createOscillator();
            drone.type = 'sine'; drone.frequency.value = 23;
            const dg = ctx.createGain(); dg.gain.value = 0.5;
            drone.connect(dg).connect(master); drone.start();
            this._audioNodes.push(drone, dg);

            // LFO on drone
            const lfo = ctx.createOscillator(); lfo.frequency.value = 0.3;
            const lg = ctx.createGain(); lg.gain.value = 5;
            lfo.connect(lg).connect(drone.frequency); lfo.start();
            this._audioNodes.push(lfo, lg);

            // Binaural
            const bL = ctx.createOscillator(); bL.frequency.value = 200;
            const bR = ctx.createOscillator(); bR.frequency.value = 204.5;
            const bg = ctx.createGain(); bg.gain.value = 0.06;
            bL.connect(bg).connect(master); bR.connect(bg).connect(master);
            bL.start(); bR.start();
            this._audioNodes.push(bL, bR, bg);

            // Distortion
            const dist = ctx.createWaveShaper();
            const curve = new Float32Array(256);
            for (let i = 0; i < 256; i++) { const x = (i*2)/256-1; curve[i] = (Math.PI+20)*x/(Math.PI+20*Math.abs(x)); }
            dist.curve = curve; dist.oversample = '4x';
            master.disconnect(); master.connect(dist).connect(ctx.destination);
            this._audioNodes.push(dist);

            // Glitch grains
            const grainLoop = () => {
                if (!this.active) return;
                const o = ctx.createOscillator();
                o.type = Math.random() > 0.5 ? 'sawtooth' : 'square';
                o.frequency.value = 200 + Math.random() * 4000;
                const g2 = ctx.createGain();
                const p = this.timer / this.duration;
                g2.gain.value = Math.min(p * 0.12, 0.06);
                const dur = 0.01 + Math.random() * 0.04;
                g2.gain.linearRampToValueAtTime(0, ctx.currentTime + dur);
                o.connect(g2).connect(master); o.start(); o.stop(ctx.currentTime + dur);
                setTimeout(grainLoop, 20 + Math.random() * 60 * (1.1 - p));
            };
            setTimeout(grainLoop, 400);

            // Fade out at end
            const end = ctx.currentTime + this.duration;
            master.gain.linearRampToValueAtTime(0.3, end - 4);
            master.gain.linearRampToValueAtTime(0, end - 0.3);
        } catch(e) { console.warn('Audio fail:', e); }
    }

    _stopAudio() {
        if (this._audioCtx) {
            this._audioNodes.forEach(n => { try{if(n.stop)n.stop();}catch(e){} try{if(n.disconnect)n.disconnect();}catch(e){} });
            try { this._audioCtx.close(); } catch(e) {}
            this._audioCtx = null; this._audioNodes = [];
        }
    }

    _startDOMCorruption() {
        this._cleanDOM();
        const canvas = document.querySelector('canvas');
        if (canvas) this._cssBackup = canvas.style.cssText;

        const err = document.createElement('div');
        err.id = 'escapism-err';
        err.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:99999;display:flex;align-items:center;justify-content:center;opacity:0;font-family:monospace;';
        err.innerHTML = `<div style="background:rgba(0,0,0,0.85);border:2px solid #f00;padding:40px 60px;color:#f00;font-size:18px;text-shadow:0 0 10px #f00;max-width:500px;text-align:center;">
        <div style="font-size:24px;margin-bottom:15px;">⚠ REALITY_FAULT ⚠</div>
        <div>MEMORY ACCESS VIOLATION AT 0x${Math.random().toString(16).substr(2,8).toUpperCase()}</div>
        <div style="margin-top:10px;color:#ff6;">DIMENSIONAL INTEGRITY: COMPROMISED</div></div>`;
        document.body.appendChild(err);
        this._domOverlays.push(err);

        const zalgo = document.createElement('div');
        zalgo.id = 'escapism-zalgo';
        zalgo.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);pointer-events:none;z-index:99998;opacity:0;font-size:48px;color:#fff;text-align:center;text-shadow:0 0 20px rgba(255,0,100,0.8),0 0 40px rgba(100,0,255,0.6);font-family:serif;letter-spacing:8px;';
        document.body.appendChild(zalgo);
        this._domOverlays.push(zalgo);
    }

    _cleanDOM() {
        const canvas = document.querySelector('canvas');
        if (canvas && this._cssBackup) canvas.style.cssText = this._cssBackup;
        if (canvas) { canvas.style.transform = ''; canvas.style.filter = ''; }
        this._domOverlays.forEach(el => { try{el.remove();}catch(e){} });
        this._domOverlays = [];
    }

    _zalgo(text) {
        const u=['\u0300','\u0301','\u0302','\u0303','\u0304','\u0305','\u0306','\u0307','\u0308','\u030A','\u030B','\u030C'];
        const d=['\u0316','\u0317','\u0318','\u0319','\u031A','\u031B','\u031C','\u031D','\u031E','\u031F'];
        const m=['\u0334','\u0335','\u0336','\u0337','\u0338'];
        let o='';for(const c of text){o+=c;const n=3+Math.floor(Math.random()*8);for(let i=0;i<n;i++){const a=[u,d,m][Math.floor(Math.random()*3)];o+=a[Math.floor(Math.random()*a.length)];}}return o;
    }

    _updateDOM(t, phase, elapsed) {
        const canvas = document.querySelector('canvas');
        if (!canvas) return;
        if (phase < 2) { canvas.style.transform = `skew(${Math.sin(elapsed*4)*0.5*t}deg)`; }
        else if (phase < 3.5) {
            const sk=Math.sin(elapsed*7)*1.5*t, ro=Math.sin(elapsed*3)*0.5*t, sc=1+Math.sin(elapsed*11)*0.02*t;
            canvas.style.transform = `skew(${sk}deg) rotate(${ro}deg) scale(${sc})`;
        } else if (phase < 4) {
            const sk=Math.sin(elapsed*9)*3*t, ro=Math.sin(elapsed*5)*2*t;
            canvas.style.transform = `skew(${sk}deg) rotate(${ro}deg)`;
            if (Math.random()<0.05) { canvas.style.filter='invert(1) hue-rotate(180deg)'; setTimeout(()=>{canvas.style.filter='';},80); }
        } else { canvas.style.transform=''; canvas.style.filter=''; }

        const err = document.getElementById('escapism-err');
        if (err) err.style.opacity = (phase>=3 && Math.sin(elapsed*8)>0.7) ? 0.9*t : 0;

        const z = document.getElementById('escapism-zalgo');
        if (z && phase >= 3.5) {
            if(Math.random()<0.08) z.textContent=this._zalgo(['ESCAPISM','YOU ARE NOT HERE','BREACH','DISSOLVE','BETWEEN'][Math.floor(Math.random()*5)]);
            z.style.opacity=0.7+Math.sin(elapsed*12)*0.3;
        } else if(z) z.style.opacity=0;
    }

    update(renderer, delta, time) {
        this.totalElapsed += delta;

        // Timer-based trigger: first at 3 minutes, then every 5 minutes after
        if (!this.active) {
            const firstTrigger = 180;   // 3 minutes
            const repeatInterval = 300; // 5 minutes
            if (!this._hasTriggeredFirst && this.totalElapsed >= firstTrigger) {
                this._hasTriggeredFirst = true;
                this._nextTriggerAt = this.totalElapsed + repeatInterval;
                this.triggerSpawn();
            } else if (this._hasTriggeredFirst && this.totalElapsed >= this._nextTriggerAt) {
                this._nextTriggerAt = this.totalElapsed + repeatInterval;
                this.triggerSpawn();
            }
        }

        if (!this.active) return;

        this.timer += delta;
        const t = this.timer;
        const dur = this.duration;

        // Still in blackout intro (negative timer)
        if (t < 0) return;

        if (t >= dur) { this._deactivate(); return; }

        // PHASE 1 (0-15s): Biomass horror overlay
        // PHASE 2 (15-30s): Reality fracture + camera hijack
        let presence, phase;
        if (t < 2) { phase=1; presence=t/2*0.3; }
        else if (t < 5) { phase=2; presence=0.3+(t-2)/3*0.3; }
        else if (t < 9) { phase=3; presence=0.6+(t-5)/4*0.25; }
        else if (t < 12) { phase=3.5; presence=0.85+(t-9)/3*0.15; }
        else if (t < 15) { phase=4; presence=1.0-((t-12)/3); }
        // --- PHASE 2: Reality Fracture ---
        else if (t < 17) { phase=5; presence=(t-15)/2*0.4; }
        else if (t < 21) { phase=6; presence=0.4+(t-17)/4*0.35; }
        else if (t < 25) { phase=7; presence=0.75+(t-21)/4*0.25; }
        else if (t < 28) { phase=7.5; presence=1.0; }
        else { phase=8; presence=1.0-((t-28)/2); }

        this.phase = phase;
        this.material.uniforms.uTime.value = time;
        this.material.uniforms.uPhase.value = phase;
        this.material.uniforms.uPresence.value = Math.max(0, presence);

        // Camera hijack in phase 2
        this._updateCamera(t, phase, time);
        this._updateDOM(Math.max(0, presence), phase, time);

        const ac = renderer.autoClear;
        renderer.autoClear = false;
        renderer.clearDepth();
        renderer.render(this.scene2, this.camera);
        renderer.autoClear = ac;
    }

    _updateCamera(t, phase, elapsed) {
        const cam = this._gameCamera;
        if (!cam || phase < 5) return;
        const pr = this.material.uniforms.uPresence.value;
        if (phase < 6) {
            cam.fov = this._camOrigFov + Math.sin(elapsed*4)*2*pr;
        } else if (phase < 7) {
            cam.fov = this._camOrigFov + Math.sin(elapsed*8)*8*pr + Math.cos(elapsed*13)*3*pr;
            cam.rotation.z = Math.sin(elapsed*5)*0.08*pr;
        } else if (phase < 8) {
            cam.fov = this._camOrigFov + Math.sin(elapsed*12)*15*pr + Math.sin(elapsed*7.3)*8*pr;
            cam.rotation.z = Math.sin(elapsed*7)*0.2*pr + Math.sin(elapsed*11.3)*0.12*pr;
            if (Math.random()<0.02) { cam.rotation.x += (Math.random()-0.5)*0.03; cam.rotation.y += (Math.random()-0.5)*0.03; }
        } else {
            cam.fov += (this._camOrigFov - cam.fov) * 0.15;
            cam.rotation.z += (this._camOrigRotZ - cam.rotation.z) * 0.15;
        }
        cam.updateProjectionMatrix();
    }

    _deactivate() {
        this.active = false;
        this.material.uniforms.uPresence.value = 0;
        this.phase = 0;
        this._stopAudio();
        this._cleanDOM();
        // Restore camera
        if (this._gameCamera && this._camOrigFov !== null) {
            this._gameCamera.fov = this._camOrigFov;
            this._gameCamera.rotation.z = this._camOrigRotZ || 0;
            this._gameCamera.updateProjectionMatrix();
        }
        // UNFREEZE CONTROLS
        window.escapismCutscene = false;
        if (this._glitchInterval) clearInterval(this._glitchInterval);
        // Remove any lingering blackout
        const bo = document.getElementById('escapism-blackout');
        if (bo) bo.remove();
        console.log('%c[THE ESCAPISM] ██ REALITY RECONSTITUTED ██', 'color:#0ff;font-weight:bold;');
    }

    resize(w, h) {
        this.width=w; this.height=h;
        this.camera.left=-w/2; this.camera.right=w/2; this.camera.top=h/2; this.camera.bottom=-h/2;
        this.camera.updateProjectionMatrix();
        this.mesh.geometry.dispose();
        this.mesh.geometry = new THREE.PlaneGeometry(w, h);
        this.material.uniforms.uRes.value.set(w, h);
    }
}

window.EasterEgg = EasterEgg;
