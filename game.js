const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');

const W = 380, H = 280;
const LANES = [W*0.22, W*0.5, W*0.78];
const GROUND = H - 60;

let state = 'start';
let score = 0, lives = 3, frame = 0, speed = 3.5;
let lane = 1, playerY = GROUND, velY = 0;
let isJumping = false, isSliding = false, slideTimer = 0;
let obstacles = [], coins = [], particles = [];
let fgOffset = 0, invincible = 0;
let spawnTimer = 0, coinTimer = 0;

function drawSky() {
  let grad = ctx.createLinearGradient(0,0,0,GROUND);
  grad.addColorStop(0, '#1a0a2e');
  grad.addColorStop(1, '#3a1a5e');
  ctx.fillStyle = grad;
  ctx.fillRect(0,0,W,GROUND);

  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  let seed = 42;
  for(let i=0;i<40;i++){
    seed=(seed*1664525+1013904223)&0xffffffff;
    let sx=((seed>>>1)%W);
    seed=(seed*1664525+1013904223)&0xffffffff;
    let sy=((seed>>>1)%(GROUND-40));
    ctx.globalAlpha=0.4+0.4*Math.sin(frame*0.05+i);
    ctx.fillRect(sx,sy,1.5,1.5);
  }
  ctx.globalAlpha=1;

  ctx.fillStyle='#fff9d0';
  ctx.beginPath(); ctx.arc(W-60,35,22,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#1a0a2e';
  ctx.beginPath(); ctx.arc(W-52,30,18,0,Math.PI*2); ctx.fill();

  ctx.fillStyle='#120828';
  let cx=30, cy=GROUND-60;
  ctx.fillRect(cx,cy,50,60);
  ctx.fillRect(cx-8,cy-10,12,20);
  ctx.fillRect(cx+20,cy-20,14,30);
  ctx.fillRect(cx+44,cy-10,12,20);
  for(let i=0;i<3;i++){
    ctx.fillRect(cx-8+i*6,cy-18,4,8);
    ctx.fillRect(cx+20+i*5,cy-28,4,10);
    ctx.fillRect(cx+44+i*6,cy-18,4,8);
  }
}

function drawGround() {
  ctx.fillStyle='#5c3a1e';
  ctx.fillRect(0,GROUND,W,H-GROUND);
  for(let i=0;i<3;i++){
    let lx=LANES[i]-28;
    ctx.fillStyle='#8a7a6a';
    ctx.fillRect(lx,GROUND,56,H-GROUND);
    ctx.fillStyle='#5a4a3a';
    for(let y=GROUND;y<H;y+=18){
      ctx.fillRect(lx,(y+(fgOffset+i*7))%H,56,1);
    }
  }
  ctx.fillStyle='#7a4f2a';
  ctx.fillRect(0,GROUND,W,2);
}

function drawPlayer() {
  let lx=LANES[lane], py=playerY;
  if(invincible>0 && Math.floor(frame/4)%2===0) return;
  ctx.save();
  ctx.translate(lx,py);
  if(isSliding){ ctx.scale(1,0.55); ctx.translate(0,18); }
  ctx.fillStyle='#6030a0';
  ctx.beginPath();
  ctx.moveTo(-6,0); ctx.lineTo(-14,30); ctx.lineTo(6,30); ctx.lineTo(6,0);
  ctx.fill();
  ctx.fillStyle='#d4a024';
  ctx.fillRect(-10,-36,20,36);
  ctx.fillStyle='#8a6010';
  ctx.fillRect(-8,-34,16,18);
  ctx.fillStyle='#f0c840';
  ctx.fillRect(-4,-30,8,10);
  ctx.fillStyle='#b0b0c0';
  ctx.fillRect(-10,-52,20,18);
  ctx.fillStyle='#808090';
  ctx.fillRect(-10,-54,20,4);
  ctx.fillStyle='#404050';
  ctx.fillRect(-6,-50,12,6);
  ctx.fillStyle='#3a2a5a';
  if(!isSliding){
    let ls=isJumping?0:Math.sin(frame*0.25)*8;
    ctx.fillRect(-9,0,8,20); ctx.fillRect(1,0,8,20);
    ctx.fillRect(-11+ls,18,10,8); ctx.fillRect(1-ls,18,10,8);
  }
  ctx.save();
  ctx.translate(12,-20);
  ctx.rotate(isJumping?-0.6:Math.sin(frame*0.12)*0.25);
  ctx.fillStyle='#6030a0'; ctx.fillRect(-2,0,4,12);
  ctx.fillStyle='#c0c0d0'; ctx.fillRect(-1,-22,2,22);
  ctx.fillStyle='#d4a024'; ctx.fillRect(-4,-2,8,3);
  ctx.restore();
  ctx.restore();
}

function spawnObstacle() {
  let types=['barrel','spikes','troll','fireball'];
  let type=types[Math.floor(Math.random()*types.length)];
  let ol=Math.floor(Math.random()*3);
  let o={lane:ol,x:LANES[ol],y:GROUND,type,w:32,h:32};
  if(type==='troll') o.h=52;
  if(type==='fireball'){o.y=GROUND-40;o.h=20;o.w=20;}
  if(type==='spikes') o.h=20;
  obstacles.push(o);
}

function spawnCoin() {
  let cl=Math.floor(Math.random()*3);
  let cy=GROUND-20-Math.floor(Math.random()*2)*40;
  coins.push({lane:cl,x:LANES[cl],y:cy,collected:false});
}

function drawObstacle(o) {
  ctx.save();
  ctx.translate(o.x,o.y);
  if(o.type==='barrel'){
    ctx.fillStyle='#7a4a20';
    ctx.beginPath(); ctx.ellipse(0,-o.h/2,o.w/2,o.h/2,0,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle='#c08040'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.ellipse(0,-o.h/2,o.w/2,4,0,0,Math.PI*2); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0,-o.h*0.75,o.w/2,4,0,0,Math.PI*2); ctx.stroke();
  } else if(o.type==='spikes'){
    ctx.fillStyle='#808090';
    for(let i=-2;i<=2;i++){
      ctx.beginPath();
      ctx.moveTo(i*10,-o.h); ctx.lineTo(i*10+6,0); ctx.lineTo(i*10-6,0);
      ctx.fill();
    }
  } else if(o.type==='troll'){
    ctx.fillStyle='#2a5a20';
    ctx.fillRect(-12,-o.h,24,o.h);
    ctx.fillStyle='#1a4010';
    ctx.beginPath(); ctx.arc(0,-o.h-8,14,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#ff4040';
    ctx.fillRect(-4,-o.h-14,3,8); ctx.fillRect(1,-o.h-14,3,8);
    ctx.fillStyle='#ffff00'; ctx.fillRect(-5,-o.h-4,10,3);
  } else if(o.type==='fireball'){
    let grd=ctx.createRadialGradient(0,0,0,0,0,o.w/2);
    grd.addColorStop(0,'#fff060');
    grd.addColorStop(0.5,'#f06020');
    grd.addColorStop(1,'rgba(200,30,0,0)');
    ctx.fillStyle=grd;
    ctx.beginPath(); ctx.arc(0,0,o.w/2+Math.sin(frame*0.3)*3,0,Math.PI*2); ctx.fill();
  }
  ctx.restore();
}

function drawCoin(c) {
  if(c.collected) return;
  ctx.save();
  ctx.translate(c.x,c.y+Math.sin(frame*0.1+c.x)*4);
  let grd=ctx.createRadialGradient(-3,-3,1,0,0,10);
  grd.addColorStop(0,'#fff8a0'); grd.addColorStop(0.5,'#f5c542'); grd.addColorStop(1,'#c09010');
  ctx.fillStyle=grd;
  ctx.beginPath(); ctx.arc(0,0,10,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='rgba(255,255,255,0.7)';
  ctx.beginPath(); ctx.arc(-3,-3,3,0,Math.PI*2); ctx.fill();
  ctx.restore();
}

function emitParticles(x,y,color,n=8){
  for(let i=0;i<n;i++){
    let a=Math.random()*Math.PI*2, spd=1+Math.random()*3;
    particles.push({x,y,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd-2,r:3+Math.random()*3,color,life:30,maxLife:30});
  }
}

function drawParticles(){
  for(let p of particles){
    ctx.save();
    ctx.globalAlpha=p.life/p.maxLife;
    ctx.fillStyle=p.color;
    ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill();
    ctx.restore();
    p.x+=p.vx; p.y+=p.vy; p.vy+=0.15; p.life--;
  }
  particles=particles.filter(p=>p.life>0);
}

function drawOverlay(title,line1,line2=''){
  ctx.fillStyle='rgba(10,0,20,0.82)';
  ctx.fillRect(0,0,W,H);
  ctx.textAlign='center';
  ctx.fillStyle='#f5c542';
  ctx.font='bold 26px Cinzel, serif';
  ctx.fillText(title,W/2,H/2-28);
  ctx.fillStyle='rgba(255,255,255,0.85)';
  ctx.font='14px Cinzel, serif';
  ctx.fillText(line1,W/2,H/2+6);
  if(line2){
    ctx.fillStyle='rgba(200,200,200,0.55)';
    ctx.font='11px Cinzel, serif';
    ctx.fillText(line2,W/2,H/2+28);
  }
  ctx.textAlign='left';
}

function resetGame(){
  score=0; lives=3; frame=0; speed=3.5;
  lane=1; playerY=GROUND; velY=0;
  isJumping=false; isSliding=false; invincible=0;
  obstacles=[]; coins=[]; particles=[];
  spawnTimer=0; coinTimer=0;
  scoreEl.textContent='0';
  livesEl.textContent='♥ ♥ ♥';
}

function gameLoop(){
  frame++;
  fgOffset=(fgOffset+speed)%18;
  ctx.clearRect(0,0,W,H);
  drawSky();
  drawGround();

  if(state==='playing'){
    speed=3.5+score*0.004;
    score=Math.floor(frame/4);
    scoreEl.textContent=score;

    if(isJumping){ velY+=0.8; playerY+=velY; if(playerY>=GROUND){playerY=GROUND;velY=0;isJumping=false;} }
    if(isSliding){ slideTimer--; if(slideTimer<=0) isSliding=false; }

    spawnTimer++;
    if(spawnTimer>=Math.max(55,90-score*0.05)){ spawnObstacle(); spawnTimer=0; }
    coinTimer++;
    if(coinTimer>=70){ spawnCoin(); coinTimer=0; }

    for(let o of obstacles) o.x-=speed;
    for(let c of coins) c.x-=speed;
    obstacles=obstacles.filter(o=>o.x>-60);
    coins=coins.filter(c=>c.x>-30&&!c.collected);

    let px=LANES[lane], py=playerY;
    let ph=isSliding?18:52;
    if(invincible>0) invincible--;

    for(let o of obstacles){
      if(Math.abs(o.x-px)<(18+o.w/2-8)&&Math.abs(o.y-o.h/2-(py-ph/2))<(ph/2+o.h/2-10)){
        if(invincible===0){
          lives--; invincible=90;
          emitParticles(px,py-30,'#e84040',12);
          livesEl.textContent=lives>0?'♥ '.repeat(lives).trim():'✕';
          if(lives<=0) state='dead';
        }
      }
    }
    for(let c of coins){
      if(!c.collected&&Math.abs(c.x-px)<24&&Math.abs(c.y-py+26)<28){
        c.collected=true; emitParticles(c.x,c.y,'#f5c542',6); score+=10;
      }
    }

    for(let c of coins) drawCoin(c);
    for(let o of obstacles) drawObstacle(o);
    drawPlayer();
    drawParticles();

    // HUD hearts inline on canvas
    let hx=W-20;
    for(let i=2;i>=0;i--){
      ctx.fillStyle=i<lives?'#e84040':'#442222';
      ctx.beginPath();
      ctx.moveTo(hx,16+4);
      ctx.bezierCurveTo(hx,16,hx-8,16,hx-8,16+5);
      ctx.bezierCurveTo(hx-8,16+12,hx,16+18,hx,16+18);
      ctx.bezierCurveTo(hx,16+18,hx+8,16+12,hx+8,16+5);
      ctx.bezierCurveTo(hx+8,16,hx,16,hx,16+4);
      ctx.fill();
      hx-=24;
    }
  } else if(state==='start'){
    drawPlayer();
    drawOverlay("⚔ KNIGHT'S RUN","Swipe or click to begin","Dodge enemies · Collect gold");
  } else if(state==='dead'){
    drawOverlay("FALLEN KNIGHT",`Final Score: ${score}`,"Tap anywhere to try again");
  }

  requestAnimationFrame(gameLoop);
}

// Touch (mobile swipe)
let tx=0,ty=0;
canvas.addEventListener('touchstart',e=>{e.preventDefault();tx=e.touches[0].clientX;ty=e.touches[0].clientY;},{passive:false});
canvas.addEventListener('touchend',e=>{
  e.preventDefault();
  handleInput(e.changedTouches[0].clientX-tx, e.changedTouches[0].clientY-ty);
},{passive:false});

// Mouse click (desktop)
canvas.addEventListener('click',e=>{
  let r=canvas.getBoundingClientRect();
  let cx=(e.clientX-r.left)/(r.right-r.left)*W;
  if(cx<W/3) handleInput(-80,0);
  else if(cx>W*2/3) handleInput(80,0);
  else handleInput(0,-80);
});

// Keyboard (desktop bonus)
document.addEventListener('keydown',e=>{
  if(e.key==='ArrowLeft') handleInput(-80,0);
  else if(e.key==='ArrowRight') handleInput(80,0);
  else if(e.key==='ArrowUp'||e.key===' ') handleInput(0,-80);
  else if(e.key==='ArrowDown') handleInput(0,80);
});

function handleInput(dx,dy){
  if(state==='start'){ state='playing'; return; }
  if(state==='dead'){ resetGame(); state='start'; return; }
  let adx=Math.abs(dx),ady=Math.abs(dy);
  if(ady>adx){
    if(dy<-20&&!isJumping){velY=-14;isJumping=true;}
    else if(dy>20&&!isSliding){isSliding=true;slideTimer=40;}
  } else {
    if(dx<-20&&lane>0) lane--;
    if(dx>20&&lane<2) lane++;
  }
}

gameLoop();