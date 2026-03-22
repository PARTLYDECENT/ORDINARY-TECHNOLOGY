/**
 * visualizer.js
 * Visualizer Collections and Audio Analysis Helpers
 */

const t = () => performance.now() / 1000;

function getAverageAmplitude(arr, start, end) {
    let sum = 0;
    start = Math.max(0, Math.floor(start));
    end = Math.min(arr.length, Math.ceil(end));
    if (start >= end) return 0;
    for (let i = start; i < end; i++) { sum += arr[i]; }
    return sum / (end - start) / 255;
}

// Visualizer functions (1-20)
const createVisualizers = (visualizerCtx, W, H, CX, CY, dataArray, bufferLength) => {
    
    const drawViz1 = () => {
        const barW=(W()/bufferLength)*2.0; const time=t(); visualizerCtx.save();
        visualizerCtx.globalCompositeOperation='lighter';
        for(let i=0,x=0;i<bufferLength;i++){
            const amp=Math.pow(dataArray[i]/255, 1.5);
            const h=Math.max(2, amp*H()*1.2);
            const hue=(i/bufferLength)*120+160+Math.sin(time)*30;
            const grad=visualizerCtx.createLinearGradient(x,H(),x+barW,H()-h);
            grad.addColorStop(0,`hsla(${hue},100%,40%,0.9)`);
            grad.addColorStop(0.5,`hsla(${(hue+40)%360},100%,60%,0.7)`);
            grad.addColorStop(1,`hsla(${(hue+80)%360},100%,80%,0.4)`);
            visualizerCtx.fillStyle=grad;
            visualizerCtx.fillRect(x,H()-h,barW-1,h);
            visualizerCtx.shadowColor=`hsla(${hue},100%,70%,0.8)`;
            visualizerCtx.shadowBlur=15*amp;
            visualizerCtx.fillStyle='#fff';
            visualizerCtx.fillRect(x,H()-h-2,barW-1,4);
            visualizerCtx.fillStyle=`hsla(${hue},100%,20%,0.2)`;
            visualizerCtx.fillRect(x+barW*0.5,H()-h*0.5,barW*0.5,h*0.5);
            x+=barW;
        }
        visualizerCtx.restore();
    };

    const drawViz2 = () => {
        const time=t()*0.8; const cx=CX(); const cy=CY(); const maxR=Math.min(cx,cy)*0.9;
        visualizerCtx.save(); visualizerCtx.globalCompositeOperation='lighter';
        const step=4;
        for(let i=0;i<bufferLength;i+=step){
            const amp=Math.pow(dataArray[i]/255, 1.2);
            const ang=(Math.PI*2*i/bufferLength)+time;
            const r=amp*maxR*(0.5+0.5*Math.sin(time*2+i*0.1));
            const x=cx+Math.cos(ang)*r; const y=cy+Math.sin(ang)*r;
            const hue=(i/bufferLength)*360+time*60;
            if(i>step){
                const prevAmp=Math.pow(dataArray[i-step]/255, 1.2);
                const prevAng=(Math.PI*2*(i-step)/bufferLength)+time;
                const prevR=prevAmp*maxR*(0.5+0.5*Math.sin(time*2+(i-step)*0.1));
                const px=cx+Math.cos(prevAng)*prevR; const py=cy+Math.sin(prevAng)*prevR;
                visualizerCtx.strokeStyle=`hsla(${hue},100%,60%,${0.1+amp*0.5})`;
                visualizerCtx.lineWidth=0.5+amp*3;
                visualizerCtx.beginPath(); visualizerCtx.moveTo(px,py); visualizerCtx.lineTo(x,y); visualizerCtx.stroke();
            }
            visualizerCtx.fillStyle=`hsla(${hue},100%,70%,${0.5+amp*0.5})`;
            visualizerCtx.beginPath(); visualizerCtx.arc(x,y,2+amp*10,0,Math.PI*2); visualizerCtx.fill();
            if(amp>0.8){
                visualizerCtx.strokeStyle='#fff'; visualizerCtx.lineWidth=1;
                visualizerCtx.beginPath(); visualizerCtx.arc(x,y,5+amp*20,0,Math.PI*2); visualizerCtx.stroke();
            }
        }
        visualizerCtx.restore();
    };

    const drawViz3 = () => {
        const time=t(); const waveH=H()*0.8; visualizerCtx.save();
        const layers=4;
        for(let l=0; l<layers; l++){
            const lFrac=l/layers;
            visualizerCtx.beginPath();
            visualizerCtx.lineWidth=2+lFrac*5;
            const hue=(time*20+l*40+180)%360;
            visualizerCtx.strokeStyle=`hsla(${hue},90%,${50+lFrac*20}%,${0.3+lFrac*0.5})`;
            let ox=0, oy=H()/2;
            for(let i=0; i<bufferLength; i+=10){
                const x=(i/bufferLength)*W();
                const amp=(dataArray[i]/255);
                const y=H()/2 + Math.sin(i*0.05+time*(1+lFrac)+l)*waveH*amp*0.5 + (l-layers/2)*40;
                if(i===0) visualizerCtx.moveTo(x,y);
                else visualizerCtx.quadraticCurveTo(ox,oy,(x+ox)/2,(y+oy)/2);
                ox=x; oy=y;
            }
            visualizerCtx.stroke();
        }
        visualizerCtx.restore();
    };

    const drawViz4 = () => {
        const cx=CX(); const cy=CY(); const time=t(); visualizerCtx.save();
        visualizerCtx.fillStyle='rgba(2,3,5,0.15)'; visualizerCtx.fillRect(0,0,W(),H());
        visualizerCtx.globalCompositeOperation='lighter';
        const bass=getAverageAmplitude(dataArray,0,bufferLength*0.1);
        const coreR=20+bass*H()*0.4;
        const grad=visualizerCtx.createRadialGradient(cx,cy,0,cx,cy,coreR);
        grad.addColorStop(0,'#fff');
        grad.addColorStop(0.2,`hsla(280,100%,70%,${0.8*bass})`);
        grad.addColorStop(0.5,`hsla(200,100%,50%,${0.4*bass})`);
        grad.addColorStop(1,'transparent');
        visualizerCtx.fillStyle=grad;
        visualizerCtx.beginPath(); visualizerCtx.arc(cx,cy,coreR,0,Math.PI*2); visualizerCtx.fill();
        for(let i=0; i<12; i++){
            const fr=i/12; const_amp=(dataArray[Math.floor(fr*bufferLength)]/255);
            const r=(coreR*0.5) + fr*H()*0.6; const tilt=Math.sin(time*0.5+i)*0.5;
            visualizerCtx.strokeStyle=`hsla(${200+fr*100},100%,60%,${0.1+amp*0.5})`; visualizerCtx.lineWidth=1+amp*4;
            visualizerCtx.save(); visualizerCtx.translate(cx,cy); visualizerCtx.rotate(time*0.2+i); visualizerCtx.scale(1, 0.3+tilt);
            visualizerCtx.beginPath(); visualizerCtx.arc(0,0,r,0,Math.PI*2); visualizerCtx.stroke(); visualizerCtx.restore();
        }
        visualizerCtx.restore();
    };

    const drawViz5 = () => {
        const cols=40; const cellW=W()/cols; const time=t(); visualizerCtx.save();
        for(let i=0; i<cols; i++){
            const amp=Math.pow(dataArray[Math.floor((i/cols)*bufferLength)]/255, 1.5);
            const x=i*cellW; const height=amp*H()*0.9; const hue=(i/cols)*60+120+Math.sin(time)*30;
            const voxels=Math.floor(10+amp*20);
            for(let v=0; v<voxels; v++){
                const vFrac=v/voxels; const vy=H() - (v/voxels)*height; const vSize=cellW*0.8*(1-vFrac*0.5);
                visualizerCtx.fillStyle=`hsla(${hue},100%,${40+vFrac*40}%,${0.6+amp*0.4})`;
                visualizerCtx.fillRect(x+cellW*0.1, vy, vSize, cellW*0.2);
                if(v===voxels-1 && amp>0.7){
                    visualizerCtx.shadowBlur=20*amp; visualizerCtx.shadowColor=visualizerCtx.fillStyle;
                    visualizerCtx.fillRect(x+cellW*0.3, 0, cellW*0.4, vy);
                }
            }
        }
        visualizerCtx.restore();
    };

    const drawViz6 = () => {
        const cx=CX(); const cy=CY(); const time=t(); visualizerCtx.save();
        const slices=8;
        for(let s=0; s<slices; s++){
            visualizerCtx.save(); visualizerCtx.translate(cx,cy); visualizerCtx.rotate((s/slices)*Math.PI*2 + time*0.1);
            const barWidth=(W()*0.4)/bufferLength;
            for(let i=0; i<bufferLength/slices; i++){
                const amp=dataArray[i]/255; const h=amp*H()*0.4; const hue=(i/bufferLength)*360+time*50;
                visualizerCtx.fillStyle=`hsla(${hue},100%,60%,0.7)`; visualizerCtx.fillRect(i*barWidth, -h/2, barWidth-1, h);
            }
            visualizerCtx.restore();
        }
        visualizerCtx.restore();
    };

    const drawViz7 = () => {
        const time=t(); const cx=CX(); const cy=CY(); visualizerCtx.save();
        visualizerCtx.translate(cx,cy);
        for(let p=0; p<12; p++){
            const pAng=(p/12)*Math.PI*2 + time*0.2; visualizerCtx.save(); visualizerCtx.rotate(pAng);
            const amp=Math.pow(getAverageAmplitude(dataArray, (p/12)*bufferLength, ((p+1)/12)*bufferLength), 1.2);
            const pLen=50 + amp*H()*0.4; const pWidth=20 + amp*100; const hue=(p/12)*360+time*40;
            const grad=visualizerCtx.createRadialGradient(pLen,0,0,pLen,0,pWidth);
            grad.addColorStop(0,`hsla(${hue},100%,70%,0.9)`); grad.addColorStop(1,`transparent`);
            visualizerCtx.fillStyle=grad; visualizerCtx.beginPath(); visualizerCtx.moveTo(0,0);
            visualizerCtx.bezierCurveTo(pLen*0.5, pWidth, pLen, pWidth*0.5, pLen, 0);
            visualizerCtx.bezierCurveTo(pLen, -pWidth*0.5, pLen*0.5, -pWidth, 0, 0);
            visualizerCtx.fill(); visualizerCtx.strokeStyle='#fff'; visualizerCtx.lineWidth=0.5; visualizerCtx.stroke(); visualizerCtx.restore();
        }
        visualizerCtx.restore();
    };

    const drawViz8 = () => {
        const cx=CX(); const cy=CY(); const time=t(); visualizerCtx.save();
        const bass=getAverageAmplitude(dataArray, 0, bufferLength*0.1);
        for(let i=0; i<20; i++){
            const fr=i/20; const amp=dataArray[Math.floor(fr*bufferLength)]/255;
            const r=fr*Math.min(W(),H())*0.6*(1.0 + 0.1*Math.sin(time*2+i));
            visualizerCtx.lineWidth=1 + amp*10 + bass*5; const hue=(fr*360 + time*50)%360;
            visualizerCtx.strokeStyle=`hsla(${hue},100%,60%,0.5)`; visualizerCtx.beginPath(); visualizerCtx.arc(cx+amp*10,cy,r,0,Math.PI*2); visualizerCtx.stroke();
            visualizerCtx.strokeStyle=`hsla(${(hue+120)%360},100%,60%,0.5)`; visualizerCtx.beginPath(); visualizerCtx.arc(cx-amp*10,cy,r,0,Math.PI*2); visualizerCtx.stroke();
        }
        visualizerCtx.restore();
    };

    const drawViz9 = () => {
        const time=t(); visualizerCtx.save();
        visualizerCtx.fillStyle='rgba(2,3,5,0.2)'; visualizerCtx.fillRect(0,0,W(),H());
        for(let i=0; i<30; i++){
            const amp=Math.pow(dataArray[Math.floor((i/30)*bufferLength)]/255, 1.5);
            const x=(i/30)*W(); const speed=5+amp*20; const offset=(time*speed + i*100) % (H()+200) - 100;
            const h=50+amp*200; const hue=160+amp*60;
            const grad=visualizerCtx.createLinearGradient(x,offset-h,x,offset);
            grad.addColorStop(0,'transparent'); grad.addColorStop(0.5,`hsla(${hue},80%,60%,${0.2+amp*0.3})`); grad.addColorStop(1,`hsla(${hue},100%,80%,${0.5+amp*0.5})`);
            visualizerCtx.fillStyle=grad; visualizerCtx.fillRect(x,offset-h,2+amp*4,h);
            if(offset>H()-50){
                const sAmp=(offset-(H()-50))/50; visualizerCtx.strokeStyle=`hsla(${hue},100%,80%,${(1-sAmp)*amp})`;
                visualizerCtx.beginPath(); visualizerCtx.ellipse(x,H()-10,20*sAmp*amp,5*sAmp*amp,0,0,Math.PI*2); visualizerCtx.stroke();
            }
        }
        visualizerCtx.restore();
    };

    const drawViz10 = () => {
        const cx=CX(); const cy=CY(); const time=t(); visualizerCtx.save(); visualizerCtx.lineWidth=1.5;
        const low=getAverageAmplitude(dataArray, 0, bufferLength*0.2);
        const mid=getAverageAmplitude(dataArray, bufferLength*0.2, bufferLength*0.6);
        const high=getAverageAmplitude(dataArray, bufferLength*0.6, bufferLength);
        const freqX=2+low*5; const freqY=3+mid*5; const scale=Math.min(cx,cy)*0.8;
        visualizerCtx.beginPath();
        for(let i=0; i<200; i++){
            const fr=i/200; const ang=fr*Math.PI*2; const x=cx + Math.sin(ang*freqX+time)*scale; const y=cy + Math.cos(ang*freqY+time*1.2)*scale;
            const hue=(fr*360 + time*100)%360; visualizerCtx.strokeStyle=`hsla(${hue},100%,60%,${0.5+high*0.5})`;
            if(i===0) visualizerCtx.moveTo(x,y); else visualizerCtx.lineTo(x,y);
            if(i%20===0 && high>0.5){ visualizerCtx.fillStyle='#fff'; visualizerCtx.beginPath(); visualizerCtx.arc(x,y,2+high*5,0,Math.PI*2); visualizerCtx.fill(); }
        }
        visualizerCtx.stroke(); visualizerCtx.restore();
    };

    const drawViz11 = () => {
        const barHeight=H()/bufferLength; const cx=CX(); const time=t(); visualizerCtx.save();
        visualizerCtx.globalCompositeOperation='lighter';
        for(let i=0;i<bufferLength/2;i++){
            const amp=Math.pow(dataArray[i]/255, 1.4); const w=Math.max(2, amp*W()*0.6); const y=CY() + (i-bufferLength/4)*barHeight*2;
            const hue=(i/(bufferLength/2))*100+200+Math.sin(time)*40;
            const grad=visualizerCtx.createLinearGradient(cx-w,y,cx+w,y);
            grad.addColorStop(0,'transparent'); grad.addColorStop(0.5,`hsla(${hue},100%,60%,${0.4+amp*0.6})`); grad.addColorStop(1,'transparent');
            visualizerCtx.fillStyle=grad; visualizerCtx.fillRect(cx-w,y,w*2,barHeight-1);
            if(amp>0.7){ visualizerCtx.fillStyle='#fff'; visualizerCtx.fillRect(cx-w*0.1,y,w*0.2,barHeight-1); }
        }
        visualizerCtx.restore();
    };

    const drawViz12 = () => {
        const time=t(); const cx=CX(); const cy=CY(); visualizerCtx.save(); visualizerCtx.translate(cx,cy);
        const bass=getAverageAmplitude(dataArray, 0, bufferLength*0.2);
        const mid=getAverageAmplitude(dataArray, bufferLength*0.2, bufferLength*0.6);
        const sides=3 + Math.floor(bass*7); const_radius=50 + mid*H()*0.5; const angleStep=(Math.PI*2)/sides;
        for(let l=0; l<4; l++){
            const lFrac=l/4; const lRadius=radius * (1.0 - lFrac*0.8); visualizerCtx.rotate(time*0.2 + l*0.5);
            visualizerCtx.strokeStyle=`hsla(${120+l*40+time*30},100%,60%,${0.8-lFrac*0.6})`; visualizerCtx.lineWidth=2 + bass*10;
            visualizerCtx.beginPath();
            for(let i=0; i<=sides; i++){
                const ang=i*angleStep; const x=Math.cos(ang)*lRadius; const y=Math.sin(ang)*lRadius;
                if(i===0) visualizerCtx.moveTo(x,y); else visualizerCtx.lineTo(x,y);
            }
            visualizerCtx.closePath(); visualizerCtx.stroke();
            if(bass>0.5){
                visualizerCtx.fillStyle='#fff';
                for(let i=0; i<sides; i++){
                    const x=Math.cos(i*angleStep)*lRadius; const y=Math.sin(i*angleStep)*lRadius;
                    visualizerCtx.beginPath(); visualizerCtx.arc(x,y,2+bass*5,0,Math.PI*2); visualizerCtx.fill();
                }
            }
        }
        visualizerCtx.restore();
    };

    const drawViz13 = () => {
        const cols=24; const rows=12; const cellW=W()/cols; const cellH=H()/rows; visualizerCtx.save(); visualizerCtx.globalAlpha=0.8;
        for(let r=0; r<rows; r++){
            for(let c=0; c<cols; c++){
                const idx=Math.floor(((r*cols+c)/(rows*cols))*bufferLength); const amp=dataArray[idx]/255;
                if(amp<0.1) continue;
                const hue=(c/cols)*100+100; const brightness=30+amp*70; const gX=Math.sin(t()*10+r)*amp*20;
                visualizerCtx.fillStyle=`hsla(${hue},100%,${brightness}%,${0.5+amp*0.5})`; visualizerCtx.fillRect(c*cellW + gX, r*cellH, cellW-2, cellH-2);
                if(amp>0.8){ visualizerCtx.fillStyle='#fff'; visualizerCtx.fillRect(c*cellW+gX, r*cellH, cellW*0.2, cellH-2); }
            }
        }
        visualizerCtx.restore();
    };

    const drawViz14 = () => {
        const cx=CX(); const cy=CY(); const time=t(); visualizerCtx.save(); visualizerCtx.translate(cx,cy); visualizerCtx.rotate(time*0.1);
        const overall=getAverageAmplitude(dataArray, 0, bufferLength); const baseR=H()*0.2 + overall*H()*0.3;
        visualizerCtx.strokeStyle=`hsla(${120+time*20},100%,60%,0.6)`; visualizerCtx.lineWidth=2;
        for(let i=0; i<32; i++){
            const ang=(i/32)*Math.PI*2; const amp=dataArray[Math.floor((i/32)*bufferLength)]/255;
            const r=baseR + amp*50; const x=Math.cos(ang)*r; const y=Math.sin(ang)*r;
            visualizerCtx.beginPath(); visualizerCtx.moveTo(0,0); visualizerCtx.lineTo(x,y); 
            visualizerCtx.strokeStyle=`hsla(${120+i*5+time*20},100%,70%,${0.1+amp*0.5})`; visualizerCtx.stroke();
            visualizerCtx.fillStyle='#fff'; visualizerCtx.beginPath(); visualizerCtx.arc(x,y,1+amp*5,0,Math.PI*2); visualizerCtx.fill();
        }
        visualizerCtx.restore();
    };

    const drawViz15 = () => {
        const time=t(); visualizerCtx.save();
        for(let i=0; i<15; i++){
            const iFrac=i/15; const y=H()*0.1 + iFrac*H()*0.8;
            visualizerCtx.beginPath(); const hue=(180+iFrac*120+time*30)%360;
            visualizerCtx.strokeStyle=`hsla(${hue},100%,60%,0.6)`; visualizerCtx.lineWidth=1+iFrac*4;
            for(let x=0; x<W(); x+=10){
                const xFrac=x/W(); const amp=dataArray[Math.floor(xFrac*(bufferLength/2))]/255;
                const_yOff=Math.sin(x*0.01 + time*2 + iFrac*10)*50*amp + Math.cos(x*0.02 - time + iFrac*5)*30;
                if(x===0) visualizerCtx.moveTo(x, y+yOff); else visualizerCtx.lineTo(x, y+yOff);
            }
            visualizerCtx.stroke();
        }
        visualizerCtx.restore();
    };

    const drawViz16 = () => {
        const cx=CX(); const cy=CY(); const time=t(); visualizerCtx.save(); visualizerCtx.translate(cx,cy);
        const bass=getAverageAmplitude(dataArray, 0, bufferLength*0.1);
        for(let s=0; s<12; s++){
            visualizerCtx.save(); visualizerCtx.rotate((s/12)*Math.PI*2 + time*0.5);
            const amp=dataArray[Math.floor((s/12)*bufferLength)]/255; const h=amp*H()*0.5;
            const grad=visualizerCtx.createLinearGradient(0,0,0,h);
            grad.addColorStop(0,`hsla(${s*30+time*60},100%,70%,0.9)`); grad.addColorStop(1,'transparent');
            visualizerCtx.fillStyle=grad; visualizerCtx.beginPath(); visualizerCtx.moveTo(0,0);
            visualizerCtx.lineTo(20+bass*100, h); visualizerCtx.lineTo(-20-bass*100, h);
            visualizerCtx.closePath(); visualizerCtx.fill(); visualizerCtx.restore();
        }
        visualizerCtx.restore();
    };

    const drawViz17 = () => {
        const time=t(); visualizerCtx.save();
        const bass=getAverageAmplitude(dataArray, 0, bufferLength*0.1);
        const high=getAverageAmplitude(dataArray, bufferLength*0.8, bufferLength);
        if(bass>0.6){
            for(let i=0; i<5; i++){
                const r=(time*500 + i*100) % (W()*0.8); const opacity=(1 - r/(W()*0.8))*bass;
                visualizerCtx.strokeStyle=`hsla(${200+bass*100},100%,70%,${opacity})`; visualizerCtx.lineWidth=2+high*20;
                visualizerCtx.beginPath(); visualizerCtx.arc(CX(),CY(),r,0,Math.PI*2); visualizerCtx.stroke();
            }
        }
        visualizerCtx.globalAlpha=bass*0.3; visualizerCtx.fillStyle='#fff'; visualizerCtx.beginPath(); visualizerCtx.arc(CX(),CY(),bass*100,0,Math.PI*2); visualizerCtx.fill();
        visualizerCtx.restore();
    };

    const drawViz18 = () => {
        const cols=20, rows=15; const cellW=W()/cols, cellH=H()/rows; visualizerCtx.save(); const time=t();
        for(let r=0; r<rows; r++){
            for(let c=0; c<cols; c++){
                const idx=Math.floor(((r*cols+c)/(rows*cols))*(bufferLength*0.5)); const amp=dataArray[idx]/255;
                const noise=Math.sin(c*0.5+time)*Math.cos(r*0.5+time); const size=2+amp*15 + noise*5; const hue=(180+amp*120+time*50)%360;
                visualizerCtx.fillStyle=`hsla(${hue},100%,${50+amp*30}%,${0.4+amp*0.6})`;
                visualizerCtx.beginPath(); visualizerCtx.arc(c*cellW+cellW/2, r*cellH+cellH/2, size, 0, Math.PI*2); visualizerCtx.fill();
                if(amp>0.8){ visualizerCtx.lineWidth=1; visualizerCtx.strokeStyle='#fff'; visualizerCtx.stroke(); }
            }
        }
        visualizerCtx.restore();
    };

    let stars = [];
    const drawViz19 = () => {
        visualizerCtx.fillStyle='rgba(2,3,5,0.2)'; visualizerCtx.fillRect(0,0,W(),H());
        visualizerCtx.save(); visualizerCtx.translate(CX(),CY());
        const overallAmp=getAverageAmplitude(dataArray,0,bufferLength); const speed=2 + overallAmp*25;
        if(stars.length===0){ for(let i=0;i<200;i++) stars.push({x:(Math.random()-0.5)*W()*2,y:(Math.random()-0.5)*H()*2,z:Math.random()*W()}); }
        stars.forEach(star=>{
            star.z-=speed;
            if(star.z<=0){ star.z=W(); star.x=(Math.random()-0.5)*W()*2; star.y=(Math.random()-0.5)*H()*2; }
            const k=128/star.z; const px=star.x*k; const py=star.y*k; const size=(1-star.z/W())*3 + overallAmp*5;
            const ppp=128/(star.z+speed); const ppx=star.x*ppp; const ppy=star.y*ppp;
            visualizerCtx.strokeStyle=`rgba(224,240,248,${(1-star.z/W())})`; visualizerCtx.lineWidth=size;
            visualizerCtx.beginPath(); visualizerCtx.moveTo(ppx,ppy); visualizerCtx.lineTo(px,py); visualizerCtx.stroke();
            visualizerCtx.fillStyle='#fff'; visualizerCtx.beginPath(); visualizerCtx.arc(px,py,size*0.4,0,Math.PI*2); visualizerCtx.fill();
        });
        visualizerCtx.restore();
    };

    const drawViz20 = () => {
        const time=t(); const cx=CX(); const cy=CY(); visualizerCtx.save();
        const overall=getAverageAmplitude(dataArray, 0, bufferLength);
        for(let k=0; k<2; k++){
            const kOff=k*Math.PI; visualizerCtx.beginPath(); visualizerCtx.lineWidth=2+overall*10;
            visualizerCtx.strokeStyle=`hsla(${180+k*120+time*40},100%,60%,0.8)`;
            for(let i=0; i<60; i++){
                const fr=i/60; const ang=fr*Math.PI*6 + time*2 + kOff; const amp=dataArray[Math.floor(fr*bufferLength)]/255;
                const r=30 + amp*100 + overall*50; const x=cx + Math.cos(ang)*r; const y=(fr*H()*0.8) + H()*0.1;
                if(i===0) visualizerCtx.moveTo(x,y); else visualizerCtx.lineTo(x,y);
                if(k===0){
                    const ang2=fr*Math.PI*6 + time*2 + Math.PI; const x2=cx+Math.cos(ang2)*r;
                    visualizerCtx.save(); visualizerCtx.lineWidth=1; visualizerCtx.strokeStyle='rgba(255,255,255,0.2)';
                    visualizerCtx.beginPath(); visualizerCtx.moveTo(x,y); visualizerCtx.lineTo(x2,y); visualizerCtx.stroke(); visualizerCtx.restore();
                }
                if(i%5===0){ visualizerCtx.fillStyle=visualizerCtx.strokeStyle; visualizerCtx.beginPath(); visualizerCtx.arc(x,y,4+amp*8,0,Math.PI*2); visualizerCtx.fill(); }
            }
            visualizerCtx.stroke();
        }
        visualizerCtx.restore();
    };

    return [drawViz1, drawViz2, drawViz3, drawViz4, drawViz5, drawViz6, drawViz7, drawViz8, drawViz9, drawViz10, drawViz11, drawViz12, drawViz13, drawViz14, drawViz15, drawViz16, drawViz17, drawViz18, drawViz19, drawViz20];
};

function drawHeart(ctx, x, y, size, opacity) {
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    ctx.moveTo(0, size * 0.3);
    ctx.bezierCurveTo(size * 0.5, -size * 0.3, size * 1.5, size * 0.3, 0, size * 1.5);
    ctx.bezierCurveTo(-size * 1.5, size * 0.3, -size * 0.5, -size * 0.3, 0, size * 0.3);
    ctx.closePath();
    ctx.fillStyle = `rgba(255, 105, 180, ${opacity})`;
    ctx.shadowBlur = 20 * opacity;
    ctx.shadowColor = 'rgba(255, 20, 147, 0.8)';
    ctx.fill();
    ctx.restore();
}

export { t, getAverageAmplitude, createVisualizers, drawHeart };
