'use strict';
// ===== Labirinto dos Mortos — FPS com raycasting (sem libs, sem backend) =====
const cv=document.getElementById('c'),ctx=cv.getContext('2d'),W=cv.width,H=cv.height,$=id=>document.getElementById(id);
ctx.imageSmoothingEnabled=false;
const N=25,PL=.66,rnd=Math.random,zbuf=new Float32Array(W),keys={};
let map,expl,D,pl,zs,items,exitP,state='title',kills=0,t=0,spawnT=0,shake=0,flash=0,kick=0,cd=0,rl=0,hurt=0,bob=0;
let reloading=false,showMap=true,locked=false,mouseDown=false,AC,hs=0,hu=0,lk='';

// ---------- áudio procedural ----------
function noise(d,f,v){if(!AC)return;const n=AC.sampleRate*d|0,b=AC.createBuffer(1,n,AC.sampleRate),a=b.getChannelData(0);
  for(let i=0;i<n;i++)a[i]=(rnd()*2-1)*(1-i/n)**2;
  const s=AC.createBufferSource(),fl=AC.createBiquadFilter(),g=AC.createGain();s.buffer=b;fl.type='lowpass';fl.frequency.value=f;g.gain.value=v;
  s.connect(fl);fl.connect(g);g.connect(AC.destination);s.start()}
function tone(f0,f1,d,v,type){if(!AC)return;const o=AC.createOscillator(),g=AC.createGain(),c=AC.currentTime;o.type=type;
  o.frequency.setValueAtTime(f0,c);o.frequency.exponentialRampToValueAtTime(f1,c+d);
  g.gain.setValueAtTime(v,c);g.gain.exponentialRampToValueAtTime(.001,c+d);o.connect(g);g.connect(AC.destination);o.start();o.stop(c+d)}

// ---------- labirinto ----------
function genMap(){
  map=Array.from({length:N},()=>Array(N).fill(1));
  const st=[[1,1]];map[1][1]=0;
  while(st.length){
    const [x,y]=st[st.length-1];
    const nb=[[2,0],[-2,0],[0,2],[0,-2]].filter(([a,b])=>{const nx=x+a,ny=y+b;return nx>0&&ny>0&&nx<N-1&&ny<N-1&&map[ny][nx]===1}).sort(()=>rnd()-.5);
    if(!nb.length){st.pop();continue}
    const [a,b]=nb[0];map[y+b/2][x+a/2]=0;map[y+b][x+a]=0;st.push([x+a,y+b]);
  }
  for(let i=0;i<60;i++){const x=1+(rnd()*(N-2)|0),y=1+(rnd()*(N-2)|0);if((x+y)%2===1)map[y][x]=0} // atalhos (loops)
}
function bfs(sx,sy){
  const d=Array.from({length:N},()=>Array(N).fill(-1)),q=[[sx,sy]];d[sy][sx]=0;
  for(let i=0;i<q.length;i++){const [x,y]=q[i];
    for(const [a,b] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+a,ny=y+b;if(map[ny][nx]===0&&d[ny][nx]<0){d[ny][nx]=d[y][x]+1;q.push([nx,ny])}}}
  return d;
}
const mkZ=(x,y)=>({k:'z',x:x+.5,y:y+.5,hp:55,sp:1+rnd()*1.1,cd:0,ph:rnd()*9,hit:0,stun:0,dead:0,awake:false});
function newGame(){
  genMap();expl=map.map(r=>r.map(()=>0));D=bfs(1,1);lk='';
  pl={x:1.5,y:1.5,a:map[1][2]===0?0:Math.PI/2,hp:100,ammo:6,res:18};
  kills=0;spawnT=0;cd=0;reloading=false;exitP={k:'x',x:N-1.5,y:N-1.5};
  const far=[],mid=[];
  for(let y=1;y<N-1;y++)for(let x=1;x<N-1;x++)if(map[y][x]===0){if(D[y][x]>=10)far.push([x,y]);else if(D[y][x]>=4)mid.push([x,y])}
  far.sort(()=>rnd()-.5);mid.sort(()=>rnd()-.5);
  zs=far.slice(0,16).map(([x,y])=>mkZ(x,y));
  items=[...mid.slice(0,6).map(([x,y])=>({k:'a',x:x+.5,y:y+.5})),...far.slice(-4).map(([x,y])=>({k:'h',x:x+.5,y:y+.5}))];
}

// ---------- sprites e textura (desenhados por código) ----------
const mk=(w,h,f)=>{const c=document.createElement('canvas');c.width=w;c.height=h;f(c.getContext('2d'));return c};
const tint=(s,col)=>mk(s.width,s.height,g=>{g.drawImage(s,0,0);g.globalCompositeOperation='source-atop';g.fillStyle=col;g.fillRect(0,0,s.width,s.height)});
const shades=s=>['rgba(0,0,0,0)','rgba(0,0,0,.4)','rgba(0,0,0,.65)','rgba(0,0,0,.85)'].map(c=>tint(s,c));
const zb=mk(64,96,g=>{const r=(c,x,y,w,h)=>{g.fillStyle=c;g.fillRect(x,y,w,h)};
  r('#24304a',22,64,9,32);r('#1d2740',34,62,9,34);r('#111',20,92,11,4);r('#111',34,92,11,4);
  r('#5a2a2a',17,34,30,32);r('#3b1818',20,40,5,22);r('#6d8a4a',30,54,8,10);
  r('#6d8a4a',3,28,14,7);r('#6d8a4a',47,28,14,7);r('#5a2a2a',14,34,6,7);r('#5a2a2a',44,34,6,7);r('#7f9f58',0,22,7,10);r('#7f9f58',57,22,7,10);
  r('#7f9f58',23,8,18,24);r('#2b3a1c',22,6,20,7);r('#000',26,16,5,5);r('#000',34,16,5,5);r('#f22',28,18,2,2);r('#f22',36,18,2,2);
  r('#200',27,25,11,5);r('#ddd',28,25,2,2);r('#ddd',32,25,2,2);r('#ddd',36,25,2,2);r('#a00',30,30,4,8);r('#a00',19,44,4,3);r('#800',40,50,5,4)});
const am=mk(32,32,g=>{g.fillStyle='#5a3a1a';g.fillRect(2,14,28,16);for(let i=0;i<4;i++){g.fillStyle='#c22';g.fillRect(5+i*6,6,4,12);g.fillStyle='#fc4';g.fillRect(5+i*6,4,4,3)}});
const hk=mk(32,32,g=>{g.fillStyle='#eee';g.fillRect(2,8,28,22);g.fillStyle='#d11';g.fillRect(13,11,6,16);g.fillRect(8,16,16,6)});
const ex=mk(32,128,g=>{const r=g.createLinearGradient(0,0,0,128);r.addColorStop(0,'rgba(60,255,80,0)');r.addColorStop(.5,'rgba(60,255,80,.85)');r.addColorStop(1,'rgba(200,255,200,.9)');g.fillStyle=r;g.fillRect(8,0,16,128)});
const SP={z:shades(zb),zh:[tint(zb,'rgba(255,0,0,.55)')],a:shades(am),h:shades(hk),x:[ex]};
const wt=mk(64,64,g=>{g.fillStyle='#4c5047';g.fillRect(0,0,64,64);g.fillStyle='#22241f';
  for(let y=0;y<64;y+=16){g.fillRect(0,y,64,2);for(let x=(y/16%2)*16;x<64;x+=32)g.fillRect(x,y,2,16)}
  for(let i=0;i<260;i++){g.fillStyle=`rgba(${rnd()<.5?'0,0,0':'120,140,100'},${rnd()*.25})`;g.fillRect(rnd()*64,rnd()*64,1+rnd()*3,1+rnd()*2)}
  g.fillStyle='rgba(120,0,0,.45)';g.fillRect(40,10,3,26);g.fillRect(38,30,7,5)});

// ---------- raycasting / colisão ----------
function cast(x,y,dx,dy){
  dx=dx||1e-9;dy=dy||1e-9;let mx=x|0,my=y|0,side=0;const ddx=Math.abs(1/dx),ddy=Math.abs(1/dy);
  const sx=dx<0?-1:1,sy=dy<0?-1:1;let sdx=dx<0?(x-mx)*ddx:(mx+1-x)*ddx,sdy=dy<0?(y-my)*ddy:(my+1-y)*ddy;
  while(true){if(sdx<sdy){sdx+=ddx;mx+=sx;side=0}else{sdy+=ddy;my+=sy;side=1}if(map[my][mx]===1)break}
  const d=side?sdy-ddy:sdx-ddx,u=side?x+d*dx:y+d*dy;hs=side;hu=u-Math.floor(u);return d;
}
const free=(x,y,r)=>!map[(y-r)|0][(x-r)|0]&&!map[(y-r)|0][(x+r)|0]&&!map[(y+r)|0][(x-r)|0]&&!map[(y+r)|0][(x+r)|0];
function move(o,dx,dy,r){if(free(o.x+dx,o.y,r))o.x+=dx;if(free(o.x,o.y+dy,r))o.y+=dy}
function los(x0,y0,x1,y1){const dx=x1-x0,dy=y1-y0,n=Math.ceil(Math.hypot(dx,dy)/.2);for(let i=1;i<n;i++)if(map[(y0+dy*i/n)|0][(x0+dx*i/n)|0])return false;return true}

// ---------- escopeta calibre 12 pump action ----------
function fire(){
  if(cd>0||state!=='play')return;
  if(pl.ammo<=0){noise(.03,5000,.3);cd=.3;return}
  reloading=false;pl.ammo--;cd=.85;kick=1;flash=.07;shake=16;
  noise(.5,2500,1);noise(.9,400,1.2);tone(110,30,.35,.8,'sine');
  setTimeout(()=>{noise(.06,3000,.5);tone(300,150,.05,.15,'square')},300); // pump: recua
  setTimeout(()=>{noise(.07,2000,.6);tone(250,120,.05,.15,'square')},560); // pump: avança
  const hits=new Map();
  for(let i=0;i<8;i++){ // 8 chumbos com dispersão
    const a=pl.a+(rnd()-.5)*.12,dx=Math.cos(a),dy=Math.sin(a);let bt=cast(pl.x,pl.y,dx,dy),bz=null;
    for(const z of zs){if(z.dead)continue;const vx=z.x-pl.x,vy=z.y-pl.y,tt=vx*dx+vy*dy;
      if(tt>.1&&tt<bt&&Math.abs(vx*dy-vy*dx)<.3){bt=tt;bz=z}}
    if(bz)hits.set(bz,(hits.get(bz)||0)+1);
  }
  for(const [z,n] of hits){
    z.hp-=n*12;z.hit=.12;z.awake=true;z.stun=.35;noise(.12,800,.5);
    const vx=z.x-pl.x,vy=z.y-pl.y,l=Math.hypot(vx,vy)||1;move(z,vx/l*.12*n,vy/l*.12*n,.25); // empurrão
    if(z.hp<=0){z.dead=.001;kills++;tone(120,40,.6,.3,'sawtooth')}
  }
}

// ---------- atualização ----------
function end(s){state=s;document.exitPointerLock();setMsg(s==='win'?'Você escapou!':'Você virou um deles','Zumbis abatidos: '+kills,'Clique para jogar de novo')}
function update(dt){
  t+=dt;if(keys.ArrowLeft)pl.a-=2.2*dt;if(keys.ArrowRight)pl.a+=2.2*dt;
  const fx=Math.cos(pl.a),fy=Math.sin(pl.a);let mx=0,my=0;
  if(keys.KeyW){mx+=fx;my+=fy}if(keys.KeyS){mx-=fx;my-=fy}if(keys.KeyA){mx+=fy;my-=fx}if(keys.KeyD){mx-=fy;my+=fx}
  const l=Math.hypot(mx,my),sp=(keys.ShiftLeft||keys.ShiftRight?4.4:3)*dt;
  if(l){move(pl,mx/l*sp,my/l*sp,.22);bob+=dt*(sp>3*dt?13:9)}
  const tx=pl.x|0,ty=pl.y|0;if(lk!==tx+','+ty){lk=tx+','+ty;D=bfs(tx,ty)}
  for(let j=-2;j<=2;j++)for(let i=-2;i<=2;i++){const r=expl[ty+j];if(r&&r[tx+i]!==undefined)r[tx+i]=1}
  cd=Math.max(0,cd-dt);kick=Math.max(0,kick-dt*5);flash=Math.max(0,flash-dt);hurt=Math.max(0,hurt-dt*1.5);shake*=Math.pow(.0005,dt);
  if(mouseDown)fire();
  if(reloading&&cd<=0){rl-=dt;if(rl<=0){if(pl.ammo<6&&pl.res>0){pl.ammo++;pl.res--;rl=.5;noise(.04,4000,.4);tone(900,600,.04,.1,'square')}else reloading=false}}
  for(const z of zs){
    if(z.dead){z.dead+=dt;continue}
    z.hit=Math.max(0,z.hit-dt);z.stun=Math.max(0,z.stun-dt);z.cd=Math.max(0,z.cd-dt);z.moving=false;
    const dx=pl.x-z.x,dy=pl.y-z.y,d=Math.hypot(dx,dy),cx=z.x|0,cy=z.y|0;
    if(D[cy][cx]>=0&&D[cy][cx]<=10)z.awake=true;
    if(!z.awake||z.stun>0)continue;
    let gx=pl.x,gy=pl.y;
    if(d>1.6||!los(z.x,z.y,pl.x,pl.y)){ // segue o caminho mais curto pelo labirinto
      let best=D[cy][cx],bx=cx,by=cy;
      for(const [a,b] of [[1,0],[-1,0],[0,1],[0,-1]]){const v=D[cy+b][cx+a];if(v>=0&&v<best){best=v;bx=cx+a;by=cy+b}}
      gx=bx+.5;gy=by+.5;
    }
    if(d>.75){const ax=gx-z.x,ay=gy-z.y,m=Math.hypot(ax,ay)||1;move(z,ax/m*z.sp*dt,ay/m*z.sp*dt,.25);z.moving=true}
    else if(z.cd<=0){z.cd=.9;pl.hp-=8+rnd()*6;hurt=1;noise(.2,500,.8);tone(80,40,.25,.5,'sine')}
    for(const o of zs)if(o!==z&&!o.dead){const ox=z.x-o.x,oy=z.y-o.y,od=Math.hypot(ox,oy);if(od>0&&od<.5)move(z,ox/od*dt*1.2,oy/od*dt*1.2,.2)}
    if(rnd()<dt*.25&&d<9)tone(80+rnd()*40,45+rnd()*20,.8,.1*(1-d/9),'sawtooth');
  }
  zs=zs.filter(z=>!z.dead||z.dead<.55);
  spawnT+=dt;if(spawnT>18&&zs.length<26){spawnT=0;const c=[];
    for(let y=1;y<N-1;y++)for(let x=1;x<N-1;x++)if(D[y][x]>=9)c.push([x,y]);
    if(c.length){const [x,y]=c[rnd()*c.length|0],z=mkZ(x,y);z.awake=true;zs.push(z)}}
  items=items.filter(it=>{if(Math.hypot(it.x-pl.x,it.y-pl.y)>.6)return true;
    if(it.k==='a'){if(pl.res>=60)return true;pl.res+=6}else{if(pl.hp>=100)return true;pl.hp=Math.min(100,pl.hp+30)}
    tone(500,900,.12,.15,'sine');return false});
  if(Math.hypot(exitP.x-pl.x,exitP.y-pl.y)<.7){tone(400,800,.5,.25,'sine');end('win')}
  else if(pl.hp<=0)end('dead');
}

// ---------- desenho ----------
function drawGun(){
  const ph=.85-cd,slide=cd>0&&ph>.25&&ph<.7?Math.sin((ph-.25)/.45*Math.PI):0;
  const by=Math.abs(Math.cos(bob))*6+kick*30+(reloading?34+Math.sin(t*14)*3:0);
  const P=(c,...p)=>{ctx.fillStyle=c;ctx.beginPath();ctx.moveTo(p[0],p[1]);for(let i=2;i<p.length;i+=2)ctx.lineTo(p[i],p[i+1]);ctx.fill()};
  ctx.save();ctx.translate(W/2+38+Math.sin(bob)*7,196+by);ctx.rotate(-.17-kick*.05);
  let g=ctx.createLinearGradient(-20,0,20,0);g.addColorStop(0,'#15171a');g.addColorStop(.4,'#7a8590');g.addColorStop(1,'#1a1c20');
  P('#101215',-22,22,-8,22,-12,230,-34,230);          // tubo do carregador
  P(g,-6,0,6,0,20,230,-20,230);                         // cano
  P('#222',-7,-3,7,-3,7,4,-7,4);P('#ddd',-1,-10,1,-10,1,-3,-1,-3); // boca + massa de mira
  const p=38+slide*34,wg=ctx.createLinearGradient(-30,0,30,0);wg.addColorStop(0,'#3d2310');wg.addColorStop(.5,'#8a5530');wg.addColorStop(1,'#3d2310');
  P(wg,-18,p,18,p,32,p+85,-32,p+85);                    // pump (coronha móvel)
  ctx.strokeStyle='#2a170a';ctx.lineWidth=2;
  for(let i=1;i<6;i++){const y=p+i*13,w=18+i*2.4;ctx.beginPath();ctx.moveTo(-w,y);ctx.lineTo(w,y);ctx.stroke()}
  ctx.fillStyle='#c98f6b';ctx.beginPath();ctx.ellipse(-8,p+44,22,27,.2,0,7);ctx.fill(); // mão esquerda
  P('#1c1e22',-22,125,22,125,44,240,-44,240);P('#050505',-4,140,10,140,12,168,-6,168);   // receptor + janela
  if(flash>0){const f=ctx.createRadialGradient(0,-6,2,0,-6,75);f.addColorStop(0,'#fff');f.addColorStop(.3,'#fb4');f.addColorStop(1,'rgba(255,100,0,0)');
    ctx.globalCompositeOperation='lighter';ctx.fillStyle=f;ctx.fillRect(-90,-90,180,180)}
  ctx.restore();
  if(flash>0){ctx.fillStyle='rgba(255,190,100,.18)';ctx.fillRect(0,0,W,H)}
}
function render(){
  const hz=H/2+shake;
  let g=ctx.createLinearGradient(0,0,0,hz);g.addColorStop(0,'#101018');g.addColorStop(1,'#000');ctx.fillStyle=g;ctx.fillRect(0,0,W,hz+1);
  g=ctx.createLinearGradient(0,hz,0,H);g.addColorStop(0,'#000');g.addColorStop(1,'#2b2118');ctx.fillStyle=g;ctx.fillRect(0,hz,W,H-hz);
  const fx=Math.cos(pl.a),fy=Math.sin(pl.a),px=-fy*PL,py=fx*PL;
  for(let x=0;x<W;x++){
    const c=2*x/W-1,d=cast(pl.x,pl.y,fx+px*c,fy+py*c),h=H/d,top=hz-h/2;zbuf[x]=d;
    ctx.drawImage(wt,(hu*64)|0,0,1,64,x,top,1,h);
    ctx.fillStyle=`rgba(0,0,0,${Math.min(.96,d/9+(hs?.25:0))})`;ctx.fillRect(x,top,1,h);
  }
  const L=[...zs,...items,exitP].map(s=>{const sx=s.x-pl.x,sy=s.y-pl.y;return{s,ty:sx*fx+sy*fy,tx:-sx*fy+sy*fx}}).filter(e=>e.ty>.2).sort((a,b)=>b.ty-a.ty);
  for(const {s,ty,tx} of L){
    const set=SP[s.k==='z'&&s.hit>0?'zh':s.k],img=set[set.length>1?(ty<3?0:ty<5?1:ty<7.5?2:3):0];
    let sc=s.k==='z'?.85:s.k==='x'?1.1:.28;if(s.dead)sc*=Math.max(.15,1-s.dead*1.7);
    const u=H/ty,h=sc*u,w=h*img.width/img.height,x0=W/2*(1+tx/(ty*PL))-w/2,top=hz+u/2-h-(s.moving?Math.abs(Math.sin(t*9+s.ph))*.05*u:0);
    for(let c=Math.max(0,x0|0);c<Math.min(W,x0+w);c++){if(ty<zbuf[c])ctx.drawImage(img,((c-x0)/w*img.width)|0,0,1,img.height,c,top,1,h)}
  }
  drawGun();
  if(showMap){const s=3,ox=W-N*s-6,oy=6;
    for(let y=0;y<N;y++)for(let x=0;x<N;x++)if(expl[y][x]){ctx.fillStyle=map[y][x]?'#777':'#222';ctx.fillRect(ox+x*s,oy+y*s,s,s)}
    if(expl[N-2][N-2]){ctx.fillStyle='#3f3';ctx.fillRect(ox+(N-2)*s,oy+(N-2)*s,s,s)}
    ctx.fillStyle=ctx.strokeStyle='#ff0';ctx.fillRect(ox+pl.x*s-1,oy+pl.y*s-1,3,3);
    ctx.beginPath();ctx.moveTo(ox+pl.x*s,oy+pl.y*s);ctx.lineTo(ox+(pl.x+fx*2)*s,oy+(pl.y+fy*2)*s);ctx.stroke()}
  $('hp').textContent='Vida '+Math.max(0,pl.hp|0);$('kills').textContent='Abatidos '+kills;
  $('ammo').textContent='Cal. 12: '+pl.ammo+' / '+pl.res;$('hurt').style.opacity=hurt;
}

// ---------- menu, entrada e loop ----------
function setMsg(title,sub,go){document.querySelector('#msg h1').textContent=title;$('sub').textContent=sub;document.querySelector('.go').textContent=go;$('msg').style.display='flex'}
$('msg').onclick=()=>{
  AC=AC||new(window.AudioContext||window.webkitAudioContext)();AC.resume();
  if(state==='dead'||state==='win')newGame();
  state='play';$('msg').style.display='none';cv.requestPointerLock();
};
document.addEventListener('pointerlockchange',()=>{locked=document.pointerLockElement===cv;
  if(!locked){mouseDown=false;if(state==='play'){state='pause';setMsg('Pausado','Eles esperam. Sem pressa… para eles.','Clique para continuar')}}});
addEventListener('keydown',e=>{keys[e.code]=1;
  if(e.code==='KeyR'&&state==='play'&&pl.ammo<6&&pl.res>0&&!reloading){reloading=true;rl=.3}
  if(e.code==='KeyM')showMap=!showMap;if(e.code.startsWith('Arrow')||e.code==='Space')e.preventDefault()});
addEventListener('keyup',e=>keys[e.code]=0);
addEventListener('mousemove',e=>{if(locked&&state==='play')pl.a+=e.movementX*.0023});
addEventListener('mousedown',e=>{if(e.button===0&&locked)mouseDown=true});
addEventListener('mouseup',()=>mouseDown=false);

newGame();
let last=performance.now();
(function loop(n){const dt=Math.min(.05,(n-last)/1000);last=n;if(state==='play')update(dt);render();requestAnimationFrame(loop)})(last);
