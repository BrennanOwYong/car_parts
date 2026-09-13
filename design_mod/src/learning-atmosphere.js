// A locally drawn atmosphere: no video download and no continuous render loop.
export function createAtmosphere(){
 const canvas=document.createElement('canvas');canvas.className='learning-atmosphere';canvas.setAttribute('aria-hidden','true');document.body.prepend(canvas);const ctx=canvas.getContext('2d');if(!ctx)return;
 function paint(){const ratio=Math.min(devicePixelRatio,1.5),w=innerWidth,h=innerHeight;canvas.width=w*ratio;canvas.height=h*ratio;ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,w,h);let seed=7361;const random=()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646;};const count=Math.floor(w*h/1500);
 for(let i=0;i<count;i++){const x=random()*w,y=random()*h,size=random(),r=size>.987?1.7:.25+size*.6;const color=i%9===0?'159,190,241':i%17===0?'237,197,158':'211,225,243';const alpha=.12+random()*.43;ctx.fillStyle=`rgba(${color},${alpha})`;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();if(size>.987){const glow=ctx.createRadialGradient(x,y,0,x,y,12);glow.addColorStop(0,`rgba(${color},.24)`);glow.addColorStop(1,`rgba(${color},0)`);ctx.fillStyle=glow;ctx.fillRect(x-12,y-12,24,24);}}
 }
 let scheduled=false;window.addEventListener('resize',()=>{if(!scheduled){scheduled=true;requestAnimationFrame(()=>{paint();scheduled=false;});}});paint();
}
