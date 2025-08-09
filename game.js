const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d', {alpha: true});
const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const startBtn = document.getElementById('startBtn');
const muteBtn = document.getElementById('muteBtn');

let W, H, lastTime=0;
let stars = [];
let running=false, score=0, lives=3, spawnTimer=0, spawnRate=800;
let muted=false;

function resize(){
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.floor(rect.width * devicePixelRatio);
  canvas.height = Math.floor(rect.height * devicePixelRatio);
  W = canvas.width; H = canvas.height;
  ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);
}
window.addEventListener('resize', resize);
resize();

function rand(min,max){ return Math.random()*(max-min)+min; }

function spawnStar(){
  const size = rand(18,42);
  stars.push({
    x: rand(size, canvas.width/devicePixelRatio - size),
    y: -size,
    vy: rand(80, 220),
    size,
    hit:false,
    wobble: Math.random()*Math.PI*2,
    rot: rand(-0.04,0.04),
  });
}

function update(dt){
  if(!running) return;
  spawnTimer += dt;
  if(spawnTimer > spawnRate/1000){ spawnTimer=0; spawnStar(); if(spawnRate>300) spawnRate *= 0.995; }
  for(let i=stars.length-1;i>=0;i--){
    const s=stars[i];
    s.y += s.vy * dt;
    s.wobble += dt*6;
    if(s.y - s.size > canvas.height/devicePixelRatio){
      if(!s.hit){ lives--; updateHud(); playSound('miss'); if(lives<=0) endGame(); }
      stars.splice(i,1);
    }
  }
}

function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  const g = ctx.createLinearGradient(0,0,0,canvas.height);
  g.addColorStop(0,'rgba(255,222,121,0.04)');
  g.addColorStop(1,'rgba(3,8,18,0.6)');
  ctx.fillStyle = g; ctx.fillRect(0,0,canvas.width,canvas.height);

  for(const s of stars){
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.rot);
    const wob = Math.sin(s.wobble)*s.size*0.12;
    drawStar(ctx, 0, wob, s.size*0.5, s.size*0.25, 5, '#ffd166', '#fff');
    ctx.restore();
  }
}

function drawStar(ctx, x, y, outerR, innerR, points, color, innerColor){
  ctx.beginPath();
  for(let i=0;i<points*2;i++){
    const r = (i%2===0)? outerR:innerR;
    const ang = (i*Math.PI)/points;
    ctx.lineTo(x + Math.cos(ang)*r, y + Math.sin(ang)*r);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = innerColor;
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
}

function gameLoop(ts){
  if(!lastTime) lastTime=ts;
  const dt = Math.min((ts-lastTime)/1000, 0.04);
  lastTime = ts;
  update(dt);
  draw();
  requestAnimationFrame(gameLoop);
}
requestAnimationFrame(gameLoop);

function startGame(){
  running=true; score=0; lives=3; stars=[]; spawnRate=800; updateHud(); playSound('start');
}
function endGame(){
  running=false; playSound('gameover');
  setTimeout(()=>{
    if(confirm('Game over — score: '+score+'\\nPlay again?')) startGame();
  },100);
}

function updateHud(){
  scoreEl.textContent = score;
  livesEl.textContent = lives;
}

function handleTap(clientX, clientY){
  const rect = canvas.getBoundingClientRect();
  const x = (clientX - rect.left) * (canvas.width / rect.width) / devicePixelRatio;
  const y = (clientY - rect.top) * (canvas.height / rect.height) / devicePixelRatio;
  for(let i=stars.length-1;i>=0;i--){
    const s = stars[i];
    const dx = x - s.x;
    const dy = y - s.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    if(dist < s.size*0.9){
      score += Math.ceil(s.size/6);
      stars.splice(i,1);
      playSound('pop');
      updateHud();
      return;
    }
  }
  score = Math.max(0, score - 1);
  updateHud();
  playSound('tapmiss');
}

canvas.addEventListener('pointerdown', (e)=>{
  e.preventDefault();
  handleTap(e.clientX, e.clientY);
});

startBtn.addEventListener('click', ()=>{
  if(!running) { startGame(); startBtn.textContent='Restart'; }
  else { if(confirm('Restart game?')) startGame(); }
});
muteBtn.addEventListener('click', ()=>{ muted = !muted; muteBtn.textContent = muted? '🔇':'🔊'; });

const audioCtx = (()=>{ try{return new (window.AudioContext || window.webkitAudioContext)();}catch(e){return null} })();

function playSound(name){
  if(muted || !audioCtx) return;
  const now = audioCtx.currentTime;
  function s(freq, dur, type='sine'){
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = type; o.frequency.value = freq; g.gain.value = 0.0001;
    o.connect(g); g.connect(audioCtx.destination);
    o.start(now);
    g.gain.setTargetAtTime(0.12, now, 0.01);
    g.gain.setTargetAtTime(0.0001, now + dur*0.9, 0.02);
    o.stop(now + dur);
  }
  if(name==='pop'){ s(880,0.12,'square'); s(1320,0.06,'sine'); }
  if(name==='tapmiss'){ s(220,0.16,'sawtooth'); }
  if(name==='miss'){ s(120,0.4,'sine'); }
  if(name==='start'){ s(660,0.16); s(880,0.08); }
  if(name==='gameover'){ s(120,0.5); s(80,0.6); }
}

window.addEventListener('orientationchange', ()=>{ setTimeout(resize,260); });
window.addEventListener('load', ()=>{ canvas.style.opacity = 0; setTimeout(()=>{ canvas.style.transition='opacity 400ms'; canvas.style.opacity=1; }, 60); });
document.addEventListener('visibilitychange', ()=>{ if(document.hidden) running=false; });
