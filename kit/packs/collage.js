/* 风格包 · 桌面拼贴 —— 本项目自己实现
   俯拍的桌面上摆着纸片、照片、便签；红线把证据串起来，荧光笔划出正在念的那一句。
   规矩：元素“一拍二”（每 2 帧动一次，包里的组件自己量化，场景不用管）；镜头平滑；全片一种红（线、圈、箭头）、一种荧光黄。
   没有真实材料不要用这套风格做成片；照片位没给图就画成标着“示意”的灰色占位。
   坐标都是“桌面坐标”：不用 cam 时就是画布坐标；用 cam 时镜头在桌面上推移。x,y 是纸片没旋转时的左上角，rot 是角度（度），绕纸片中心转。
   用法：
   q(t, t0=0)                              把时间量化到 1/15 秒（一拍二），自己画的小动作用它
   cam(t, keys, fn, o)                     镜头：keys=[{t, x, y, z, d}]（t 开始移动的时刻，x,y 看向桌面哪一点，z 放大倍数，d 移动秒数）；fn() 里画桌面上的东西；o={drift 漂移幅度, push 每秒慢推比例}
   paper(t, t0, x, y, w, h, o, fn)         纸片/剪报卡：o={rot, tape:'top|corners|none', pin, tear:'bottom|top|left|right|none', col, kicker 黑底小标, title, lines:[…], titleSz, sz, pad, marks:[{i 行号或'title', at, a, b}] 荧光笔, rings:[{i, at, a, b}] 红圈, out 离场时刻}；fn(w,h) 在纸片内再画东西
   photoCard(t, t0, x, y, w, h, o)         照片：o={img:'IM 里的键名', crop:[sx,sy,sw,sh], cap 手写图注, rot, tape, pin, art(w,h) 占位里的灰色简图, label 占位标记（缺省“示意”）}
   sticky(t, t0, x, y, w, h, o)            便签：o={title, lines:[…], sz, rot, col, tape, marks, rings}
   thread(t, t0, pts, o)                   红线：pts=[[x,y],…] 依次连过去，一拍二地长出来，拐点有图钉；o={dur, sag 下垂, lw, pins:false 不画图钉}
   ring(t, t0, cx, cy, rx, ry, o)          红圈：手画的椭圆，一圈多一点；o={dur, lw, seed, rot}
   marker(t, t0, x, y, w, h, o)            荧光笔：从左到右划过一行（正片叠底，可以划在字上面）；o={dur, col, seed}
   redArrow(t, t0, x1, y1, x2, y2, o)      红箭头：手画的弯箭头；o={dur, bend, lw}
   scrawl(t, t0, s, x, y, o)               红笔批注：手写体，一拍二地从左到右写出来；x,y 是首字基线左端；o={sz, rot, dur, under:true 画一道红线}
   strip(t, t0, s, x, y, o)                标签条：黑底小条（“示意材料，非真实档案”、出处）；x,y 是左上角，通常画在 cam 之外、贴在画面上；o={sz, rot, col, ink}
   spot(x, y, w, h, rot, u, v)             纸片上一点（u,v 取 0..1）落定后在桌面上的坐标，给红线找端点
   pinAt(x, y) / tapeAt(x, y, w, rot度)    单独画一颗图钉 / 一段胶带
   颜色常量 RED YEL PAPER INK
   注意：检查按“文字完整在画面里连续停留多久”算阅读时长。镜头扫过别的纸片、让它的字只完整露面零点几秒，会报不通过——
   材料沿镜头路线挨着摆（相邻两张之间横移或竖移），不要斜穿桌面；全景时 z 不小于 1，否则 32 像素的字会变小。 */
window.PACK=window.PACK||{};window.PACK_INIT=window.PACK_INIT||[];
PACK.collage=(function(){
  const RED='#e0392e',YEL='#f7e648',PAPER='#f3eee2',INK='#1f1b17',DIM='#6d655a',TAPE='rgba(222,206,160,.82)',D2R=Math.PI/180,FPS2=15;
  const q=(t,t0=0)=>t0+Math.floor((t-t0)*FPS2+1e-4)/FPS2;
  const st=(t,t0)=>Math.floor((t-t0)*FPS2+1e-4);          // t0 之后过了几拍
  const grow=(t,t0,dur)=>{const n=Math.max(1,Math.round(dur*FPS2));return eo(cl(st(t,t0)/n))};

  /* ---------- 预先生成的底纹 ---------- */
  let _desk=null,_fiber=null,_vig=null,_hatch=null;
  function mk(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c}
  function deskTex(){if(_desk)return _desk;const c=_desk=mk(W,H),x=c.getContext('2d');
    x.fillStyle='#2c2723';x.fillRect(0,0,W,H);
    // 几块宽木板，深浅略有不同
    const PH=216;for(let j=0;j<H/PH;j++){x.fillStyle=`rgba(${rnd(j+3)>.5?'255,236,205':'0,0,0'},${.025+.045*rnd(j+17)})`;x.fillRect(0,j*PH,W,PH);x.fillStyle='rgba(0,0,0,.35)';x.fillRect(0,j*PH,W,2);x.fillStyle='rgba(255,240,215,.05)';x.fillRect(0,j*PH+2,W,1)}
    // 木纹：很多条淡淡的长线
    x.lineCap='round';for(let i=0;i<900;i++){const y0=rnd(i+101)*H,x0=rnd(i+202)*W-200,len=180+rnd(i+303)*900,a=.02+.05*rnd(i+404),wv=2+rnd(i+505)*5;x.strokeStyle=rnd(i+606)>.45?`rgba(0,0,0,${a*1.6})`:`rgba(255,232,200,${a})`;x.lineWidth=.6+rnd(i+707)*1.6;x.beginPath();
      for(let s=0;s<=8;s++){const px=x0+len*s/8,py=y0+Math.sin(s*.9+i)*wv;s?x.lineTo(px,py):x.moveTo(px,py)}x.stroke()}
    // 细尘和划痕
    for(let i=0;i<2600;i++){x.fillStyle=`rgba(255,240,220,${.03+.07*rnd(i+808)})`;x.fillRect(rnd(i+909)*W,rnd(i+1010)*H,1+rnd(i+1111)*1.6,1+rnd(i+1212)*1.6)}
    for(let i=0;i<26;i++){const px=rnd(i+1313)*W,py=rnd(i+1414)*H,an=rnd(i+1515)*6.28,l=30+rnd(i+1616)*120;x.strokeStyle=`rgba(255,240,220,${.04+.05*rnd(i+1717)})`;x.lineWidth=1;x.beginPath();x.moveTo(px,py);x.lineTo(px+Math.cos(an)*l,py+Math.sin(an)*l);x.stroke()}
    return c}
  function fiberTex(){if(_fiber)return _fiber;const c=_fiber=mk(256,256),x=c.getContext('2d');
    for(let i=0;i<700;i++){x.fillStyle=rnd(i+31)>.5?`rgba(90,70,40,${.03+.06*rnd(i+41)})`:`rgba(255,255,255,${.10+.2*rnd(i+51)})`;x.fillRect(rnd(i+61)*256,rnd(i+71)*256,1+rnd(i+81)*2.4,1+rnd(i+91)*1.4)}
    for(let i=0;i<40;i++){const px=rnd(i+111)*256,py=rnd(i+121)*256,an=rnd(i+131)*6.28;x.strokeStyle=`rgba(90,70,40,${.05+.05*rnd(i+141)})`;x.lineWidth=.7;x.beginPath();x.moveTo(px,py);x.lineTo(px+Math.cos(an)*14,py+Math.sin(an)*14);x.stroke()}
    return c}
  function hatchTex(){if(_hatch)return _hatch;const c=_hatch=mk(48,48),x=c.getContext('2d');x.fillStyle='#b9b3a8';x.fillRect(0,0,48,48);x.strokeStyle='rgba(120,113,102,.38)';x.lineWidth=3;for(let i=-48;i<96;i+=16){x.beginPath();x.moveTo(i,48);x.lineTo(i+48,0);x.stroke()}return c}
  function vigTex(){if(_vig)return _vig;const c=_vig=mk(W,H),x=c.getContext('2d');const v=x.createRadialGradient(W*.46,H*.44,H*.42,W/2,H/2,H*1.08);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(0,0,0,.5)');x.fillStyle=v;x.fillRect(0,0,W,H);
    const l=x.createRadialGradient(W*.3,H*.2,0,W*.3,H*.2,H*.9);l.addColorStop(0,'rgba(255,236,200,.07)');l.addColorStop(1,'rgba(255,236,200,0)');x.fillStyle=l;x.fillRect(0,0,W,H);return c}
  // 桌面：镜像平铺，镜头移到哪儿都接得上
  function desk(){const d=deskTex();for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++){g.save();g.translate(i*W+(i&1?W:0),j*H+(j&1?H:0));g.scale(i&1?-1:1,j&1?-1:1);g.drawImage(d,0,0,W+1,H+1);g.restore()}}

  addTheme('collage',{light:false,ink:'#f1eadb',dim:'rgba(241,234,219,.66)',note:'rgba(241,234,219,.84)',a1:RED,a2:YEL,a3:'#cdbf99',chip:'rgba(241,234,219,.10)',
    sub:'rgba(18,15,12,.84)',subInk:'#f6efe2',top:'#332d28',bot:'#1e1a17',card:'rgba(243,238,226,.97)',cardInk:INK,pillInk:INK,hl:YEL,f:{t:'H9',b:'H7',s:'H5',h:'KT',n:'RC'},
    bg(t){g.drawImage(deskTex(),0,0)},post(t){g.drawImage(vigTex(),0,0)}});

  /* ---------- 镜头：平滑，不量化 ---------- */
  function camState(t,keys,o={}){const push=o.push??.004,dr=o.drift??5;const ef=k=>({x:k.x,y:k.y,lz:Math.log(k.z||1)+Math.log(1+push*cl(t-k.t,0,12))});
    let s=ef(keys[0]);for(let i=1;i<keys.length;i++){const k=keys[i],e=eio(seg(t,k.t,k.t+(k.d||1.2)));if(e<=0)break;const n=ef(k);s={x:lerp(s.x,n.x,e),y:lerp(s.y,n.y,e),lz:lerp(s.lz,n.lz,e)}}
    const z=Math.exp(s.lz);return {x:s.x+Math.sin(t*.31)*dr/z,y:s.y+Math.cos(t*.23)*dr*.7/z,z}}
  function cam(t,keys,fn,o){const s=camState(t,keys,o);g.save();g.translate(W/2,H/2);g.scale(s.z,s.z);g.translate(-s.x,-s.y);desk();fn(s);g.restore()}

  /* ---------- 小件：胶带、图钉 ---------- */
  function tapeAt(x,y,w=120,rot=0,h=34,seed=1){g.save();g.translate(x,y);g.rotate(rot*D2R);g.fillStyle=TAPE;g.beginPath();const n=6;g.moveTo(-w/2,-h/2);g.lineTo(w/2,-h/2);
    for(let i=1;i<=n;i++)g.lineTo(w/2+(i&1?-5:0)+rnd(seed+i)*2,-h/2+h*i/n);g.lineTo(-w/2,h/2);for(let i=n-1;i>=0;i--)g.lineTo(-w/2+(i&1?5:0)-rnd(seed+9+i)*2,-h/2+h*i/n);g.closePath();
    g.shadowColor='rgba(0,0,0,.28)';g.shadowBlur=5;g.shadowOffsetY=2;g.fill();g.shadowColor='transparent';g.fillStyle='rgba(255,255,255,.16)';g.fillRect(-w/2+6,-h/2+3,w-12,5);g.restore()}
  function pinAt(x,y,r=11){g.save();g.fillStyle='rgba(0,0,0,.38)';g.beginPath();g.ellipse(x+5,y+7,r*1.05,r*.8,0,0,7);g.fill();
    const gr=g.createRadialGradient(x-r*.35,y-r*.4,1,x,y,r);gr.addColorStop(0,'#fbf7ee');gr.addColorStop(.55,'#cfc8ba');gr.addColorStop(1,'#7f786c');g.fillStyle=gr;g.beginPath();g.arc(x,y,r,0,7);g.fill();g.strokeStyle='rgba(30,25,20,.55)';g.lineWidth=1.5;g.stroke();
    g.fillStyle='rgba(60,54,46,.7)';g.beginPath();g.arc(x,y,r*.28,0,7);g.fill();g.restore()}

  /* ---------- 落到桌上：一拍二，三个姿势后落定 ---------- */
  const POSE=[[1.2,7,0],[1.07,2.6,0],[.985,-.9,0]];
  function drop(t,t0,x,y,w,h,rot,seed,out,fn){const n=st(t,t0);if(n<0)return;let s=1,dr=0,a=1,lift=0;if(n<3){[s,dr]=POSE[n];dr*=rnd(seed+5)>.5?1:-1;lift=3-n}
    if(out!=null){const m=st(t,out);if(m>=3)return;if(m>=0){s*=1+.07*(m+1);a=1-.3*(m+1);lift=m+1}}
    sfx('thud',t0,.45);g.save();g.globalAlpha*=a;g.translate(x+w/2,y+h/2);g.rotate((rot+dr)*D2R);g.scale(s,s);g.translate(-w/2,-h/2);fn(lift);g.restore()}
  function spot(x,y,w,h,rot=0,u=.5,v=0){const a=rot*D2R,dx=(u-.5)*w,dy=(v-.5)*h;return [x+w/2+dx*Math.cos(a)-dy*Math.sin(a),y+h/2+dx*Math.sin(a)+dy*Math.cos(a)]}
  // 纸的外形：某一边撕过
  function sheetPath(w,h,tear,seed){const J=(n,i)=>(rnd(seed+n*37+i)-.5)*9,stp=15;g.beginPath();g.moveTo(0,0);
    if(tear==='top')for(let px=stp;px<w;px+=stp)g.lineTo(px,4+J(1,px));g.lineTo(w,0);
    if(tear==='right')for(let py=stp;py<h;py+=stp)g.lineTo(w-4+J(2,py),py);g.lineTo(w,h);
    if(tear==='bottom')for(let px=w-stp;px>0;px-=stp)g.lineTo(px,h-4+J(3,px));g.lineTo(0,h);
    if(tear==='left')for(let py=h-stp;py>0;py-=stp)g.lineTo(4+J(4,py),py);g.closePath()}
  function sheet(w,h,col,tear,seed,lift){g.save();g.shadowColor='rgba(0,0,0,.55)';g.shadowBlur=14+lift*12;g.shadowOffsetX=4+lift*5;g.shadowOffsetY=7+lift*9;g.fillStyle=col;sheetPath(w,h,tear,seed);g.fill();g.restore();
    g.save();sheetPath(w,h,tear,seed);g.clip();g.fillStyle=g.createPattern(fiberTex(),'repeat');g.globalAlpha*=.8;g.fillRect(0,0,w,h);
    const sh=g.createLinearGradient(0,0,w,h);sh.addColorStop(0,'rgba(255,255,255,.10)');sh.addColorStop(1,'rgba(70,50,20,.10)');g.globalAlpha=g.globalAlpha/.8;g.fillStyle=sh;g.fillRect(0,0,w,h);g.restore()}
  function fasten(w,h,o,seed){const tp=o.tape??(o.pin?'none':'top');if(tp==='top')tapeAt(w/2,2,Math.min(150,w*.3),(rnd(seed+2)-.5)*8,34,seed);
    if(tp==='corners'){tapeAt(14,14,96,-42,30,seed);tapeAt(w-14,14,96,42,30,seed+3)}
    if(o.pin){const p=Array.isArray(o.pin)?o.pin:[.5,0];pinAt(p[0]*w,p[1]*h+(p[1]<.5?20:-20))}}

  /* ---------- 荧光笔、红圈、红箭头、红线 ---------- */
  function marker(t,t0,x,y,w,h=46,o={}){const k=grow(t,t0,o.dur||.5);if(st(t,t0)<0)return;sfx('whoosh',t0,.4);if(k<=0)return;const s=o.seed||Math.round(x+y),ww=w*k,j=i=>(rnd(s+i)-.5)*h*.16;
    g.save();g.globalCompositeOperation='multiply';g.globalAlpha*=.92;g.fillStyle=o.col||YEL;g.beginPath();g.moveTo(x-4+j(1),y+j(2));g.lineTo(x+ww*.5,y+j(3)*.6);g.lineTo(x+ww+4+j(4),y+j(5));g.lineTo(x+ww+7+j(6),y+h+j(7));g.lineTo(x+ww*.45,y+h+j(8)*.6);g.lineTo(x-7+j(9),y+h+j(10));g.closePath();g.fill();g.restore()}
  function ring(t,t0,cx,cy,rx,ry,o={}){const n=st(t,t0);if(n<0)return;const k=grow(t,t0,o.dur||.5);sfx('tick',t0,.6);const s=o.seed||Math.round(cx*3+cy),a0=-2.2+rnd(s)*.6,tot=Math.PI*2*1.13,N=64;
    g.save();g.translate(cx,cy);g.rotate((o.rot??-4)*D2R);g.strokeStyle=o.col||RED;g.lineWidth=o.lw||6;g.lineCap='round';g.lineJoin='round';g.beginPath();
    for(let i=0;i<=Math.round(N*k);i++){const f=i/N,a=a0+tot*f,r=1+.035*Math.sin(a*2+s)+.09*(f-.5);const px=Math.cos(a)*rx*r,py=Math.sin(a)*ry*r;i?g.lineTo(px,py):g.moveTo(px,py)}g.stroke();g.restore()}
  function redArrow(t,t0,x1,y1,x2,y2,o={}){const n=st(t,t0);if(n<0)return;const k=grow(t,t0,o.dur||.4),b=o.bend??.16,mx=(x1+x2)/2-(y2-y1)*b,my=(y1+y2)/2+(x2-x1)*b,N=24,m=Math.max(1,Math.round(N*k));sfx('tick',t0,.6);
    const P=f=>[(1-f)*(1-f)*x1+2*f*(1-f)*mx+f*f*x2,(1-f)*(1-f)*y1+2*f*(1-f)*my+f*f*y2];g.save();g.strokeStyle=g.fillStyle=o.col||RED;g.lineWidth=o.lw||6;g.lineCap='round';g.lineJoin='round';g.beginPath();for(let i=0;i<=m;i++){const p=P(i/N);i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1])}g.stroke();
    if(k>=1){const e=P(1),d=P(.9),a=Math.atan2(e[1]-d[1],e[0]-d[0]),L=(o.lw||6)*4.2;g.beginPath();g.moveTo(e[0],e[1]);g.lineTo(e[0]-Math.cos(a-.5)*L,e[1]-Math.sin(a-.5)*L);g.moveTo(e[0],e[1]);g.lineTo(e[0]-Math.cos(a+.5)*L,e[1]-Math.sin(a+.5)*L);g.stroke()}g.restore()}
  function thread(t,t0,pts,o={}){const n=st(t,t0);if(n<0||pts.length<2)return;const k=grow(t,t0,o.dur||(.55*(pts.length-1))),sag=o.sag??22,S=20,P=[];sfx('rise',t0,.5);
    for(let i=0;i<pts.length-1;i++){const [ax,ay]=pts[i],[bx,by]=pts[i+1],mx=(ax+bx)/2,my=(ay+by)/2+sag;for(let s=i?1:0;s<=S;s++){const f=s/S;P.push([(1-f)*(1-f)*ax+2*f*(1-f)*mx+f*f*bx,(1-f)*(1-f)*ay+2*f*(1-f)*my+f*f*by])}}
    const m=Math.max(1,Math.round((P.length-1)*k)),line=(dx,dy)=>{g.beginPath();for(let i=0;i<=m;i++)i?g.lineTo(P[i][0]+dx,P[i][1]+dy):g.moveTo(P[i][0]+dx,P[i][1]+dy);g.stroke()};
    g.save();g.lineCap='round';g.lineJoin='round';g.strokeStyle='rgba(0,0,0,.34)';g.lineWidth=(o.lw||5)+1;line(4,7);g.strokeStyle=o.col||RED;g.lineWidth=o.lw||5;line(0,0);g.strokeStyle='rgba(255,170,150,.35)';g.lineWidth=1.2;line(-1,-1.2);g.restore();
    if(o.pins!==false)pts.forEach((p,i)=>{if(i*S<=m)pinAt(p[0],p[1],o.pinR||11)})}

  /* ---------- 纸片上的字：小标、标题、正文；荧光笔和红圈锁在某一行的某几个字上 ---------- */
  function body(t,w,o,x0,y0,font,ink){const pad=x0,tsz=o.titleSz||56,sz=o.sz||38,lh=o.lh||1.52,tf=o.tf||'H9',R={};let y=y0;
    if(o.kicker){const kw=tw(o.kicker,32,'H7')+28;g.fillStyle=INK;g.fillRect(pad-2,y,kw,48);txt(o.kicker,pad+12,y+36,32,PAPER,'H7');y+=48+(o.title?tsz*.36:sz*.4)}
    if(o.title){y+=tsz*.9;R.title={s:o.title,x:pad,yb:y,sz:tsz,f:tf};y+=tsz*.42}
    (o.lines||[]).forEach((s,i)=>{y+=i||o.title||o.kicker?sz*(i?lh:1.15):sz;R[i]={s,x:pad,yb:y,sz,f:font}});
    const box=m=>{const r=R[m.i??0];if(!r)return null;const a=m.a||0,b=m.b??r.s.length;return {x:r.x+tw(r.s.slice(0,a),r.sz,r.f),w:tw(r.s.slice(a,b),r.sz,r.f),yb:r.yb,sz:r.sz}};
    Object.values(R).forEach(r=>txt(r.s,r.x,r.yb,r.sz,ink,r.f));
    (o.marks||[]).forEach((m,i)=>{const b=box(m);if(b)marker(t,m.at,b.x+2,b.yb-b.sz*.88,b.w,b.sz*1.12,{dur:m.dur,seed:i*7+3+Math.round(b.yb)})});
    (o.rings||[]).forEach((m,i)=>{const b=box(m);if(b)ring(t,m.at,b.x+b.w/2,b.yb-b.sz*.36,b.w/2+b.sz*.3,b.sz*.86,{dur:m.dur,seed:i*5+11+Math.round(b.yb)})})}
  function paper(t,t0,x,y,w,h,o={},fn){const seed=o.seed||Math.round(x*.7+y*1.3+w);drop(t,t0,x,y,w,h,o.rot||0,seed,o.out,lift=>{sheet(w,h,o.col||PAPER,o.tear||'none',seed,lift);
      const pad=o.pad||36;body(t,w,o,pad,(o.top??pad+10),o.bf||'H5',o.ink||INK);if(fn)fn(w,h);fasten(w,h,o,seed)})}
  function sticky(t,t0,x,y,w,h,o={}){const seed=o.seed||Math.round(x*.7+y*1.3+w),c=30;drop(t,t0,x,y,w,h,o.rot||0,seed,o.out,lift=>{
      g.save();g.shadowColor='rgba(0,0,0,.5)';g.shadowBlur=12+lift*12;g.shadowOffsetX=4+lift*5;g.shadowOffsetY=8+lift*9;g.fillStyle=o.col||'#e6dfcd';g.beginPath();g.moveTo(0,0);g.lineTo(w,0);g.lineTo(w,h-c);g.lineTo(w-c,h);g.lineTo(0,h);g.closePath();g.fill();g.restore();
      g.fillStyle='rgba(70,55,30,.20)';g.beginPath();g.moveTo(w,h-c);g.lineTo(w-c,h);g.lineTo(w-c-3,h-c-3);g.closePath();g.fill();
      const sh=g.createLinearGradient(0,0,0,h);sh.addColorStop(0,'rgba(60,45,20,.12)');sh.addColorStop(.18,'rgba(60,45,20,0)');g.fillStyle=sh;g.fillRect(0,0,w,h*.2);
      body(t,w,{...o,tf:o.tf||'KT',titleSz:o.titleSz||48,sz:o.sz||36},o.pad||30,o.top??30,'KT',o.ink||INK);if((o.tape??'top')!=='none')tapeAt(w/2,0,Math.min(120,w*.36),(rnd(seed+2)-.5)*10,30,seed)})}
  function photoCard(t,t0,x,y,w,h,o={}){const seed=o.seed||Math.round(x*.7+y*1.3+w),b=o.border||16,ch=o.cap?62:b,iw=w-2*b,ih=h-b-ch;drop(t,t0,x,y,w,h,o.rot||0,seed,o.out,lift=>{sheet(w,h,'#f6f3ec','none',seed,lift);
      const im=o.img&&typeof IM!=='undefined'?IM[o.img]:null;g.save();g.beginPath();g.rect(b,b,iw,ih);g.clip();
      if(im){const c=o.crop||[0,0,im.width,im.height],s=Math.max(iw/c[2],ih/c[3]),dw=c[2]*s,dh=c[3]*s;g.drawImage(im,c[0],c[1],c[2],c[3],b+(iw-dw)/2,b+(ih-dh)/2,dw,dh);g.fillStyle='rgba(120,90,50,.10)';g.fillRect(b,b,iw,ih)}
      else{g.fillStyle=g.createPattern(hatchTex(),'repeat');g.fillRect(b,b,iw,ih);if(o.art){g.save();g.translate(b,b);g.strokeStyle='#7d766b';g.fillStyle='#8f887c';g.lineWidth=5;g.lineCap='round';g.lineJoin='round';o.art(iw,ih);g.restore()}}
      const ig=g.createLinearGradient(0,b,0,b+ih);ig.addColorStop(0,'rgba(0,0,0,.10)');ig.addColorStop(.2,'rgba(0,0,0,0)');g.fillStyle=ig;g.fillRect(b,b,iw,ih);g.restore();
      if(!im){const lab=o.label||'示意',lw=tw(lab,32,'H7')+26;g.fillStyle='rgba(31,27,23,.82)';g.fillRect(b+10,b+10,lw,46);txt(lab,b+23,b+45,32,PAPER,'H7')}
      if(o.cap){const sz=Math.min(34,34*(w-40)/Math.max(1,tw(o.cap,34,'KT')));txt(o.cap,w/2,h-ch/2+sz*.36,Math.max(32,sz),INK,'KT','center')}
      fasten(w,h,o,seed)})}

  /* ---------- 红笔批注、标签条 ---------- */
  // 红笔手写：整句一直登记给检查，靠一拍二的遮罩从左到右“写”出来
  function scrawl(t,t0,s,x,y,o={}){const n=st(t,t0);if(n<0)return;const sz=o.sz||46,w=tw(s,sz,'KT'),k=cl(n/Math.max(1,Math.round((o.dur||.12*s.length)*FPS2)));sfx('tick',t0,.4);
    g.save();g.translate(x,y);g.rotate((o.rot??-3)*D2R);g.beginPath();g.rect(-6,-sz*1.1,(w+12)*k+(k>=1?40:0),sz*1.7);g.clip();txt(s,0,0,sz,o.col||TH.a1,'KT');
    if(o.under){const m=Math.round(24*seg(k,.5,1));g.strokeStyle=o.col||RED;g.lineWidth=5;g.lineCap='round';g.beginPath();for(let i=0;i<=m;i++){const f=i/24,px=w*f,py=sz*.3+Math.sin(f*5+x)*3-f*4;i?g.lineTo(px,py):g.moveTo(px,py)}g.stroke()}g.restore()}
  // 标签条：打码机打出来的黑底小条，贴在画面或桌面上（“示意材料，非真实档案”、出处）
  function strip(t,t0,s,x,y,o={}){const n=st(t,t0);if(n<0)return;const sz=o.sz||32,w=tw(s,sz,'H7')+sz*1.3,h=sz*1.75,dy=n<2?(2-n)*-9:0;
    g.save();g.translate(x,y+dy);g.rotate((o.rot||0)*D2R);g.shadowColor='rgba(0,0,0,.5)';g.shadowBlur=10;g.shadowOffsetY=5;g.fillStyle=o.col||'#16130f';g.beginPath();g.moveTo(0,0);g.lineTo(w,0);g.lineTo(w+7,h*.5);g.lineTo(w,h);g.lineTo(0,h);g.lineTo(-7,h*.5);g.closePath();g.fill();g.shadowColor='transparent';
    g.fillStyle='rgba(255,255,255,.07)';g.fillRect(0,3,w,4);txt(s,sz*.65,h*.5+sz*.36,sz,o.ink||PAPER,'H7');g.restore();return w}

  return {q,cam,camState,desk,paper,photoCard,sticky,thread,ring,marker,redArrow,scrawl,strip,spot,pinAt,tapeAt,RED,YEL,PAPER,INK};
})();
