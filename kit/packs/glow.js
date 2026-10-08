/* 风格包 · 扁平发光世界 —— 本项目自己实现
   深色渐变底上圆润的扁平形体，带柔和的发光，画面永远在轻轻动。用在：尺度、系统、“里面是什么”。
   规则：不描边（形体靠“暗面 + 亮面 + 高光”几层色块区分）；每个元素入场后都有待机动作；换尺度用对数缩放一层一层钻进去。
   主题名 glow：背景自带缓慢漂移的大色斑和漂浮微粒，post 里有四角压暗和几颗近景光点。颜色一律写成 '#rrggbb'。
   用法：
     blob(t, x, y, r, {col, seed, wob, tip, hi, glow, sx, sy, idle, core, face:{look:[dx,dy], smile}, t0, t1, a}) → {x,y,r,rx,ry}
         发光圆润形体：外发光 + 暗面 + 亮面 + 高光，自带呼吸和漂浮；tip 把顶上拉出一个水滴尖，hi:0 不要高光（压扁的形体用）；core 加一个内核，face 加眼睛；t0 弹入、t1 退场
     dot(x, y, r, '#rrggbb')  一颗三层色块的小圆（暗面、亮面、高光），拼小单元用
     swarm(t, {x, y, rx, ry, n, r, cols, seed, k, calm, energy, heat, hot, shape:'disc'|'box', glow, draw(x,y,r,i,col)}) → [[x,y,r],…]
         成群小单元：各自慢慢漂；k 是出现的比例，energy 越大抖得越快越远，heat 把颜色推向 hot
     stream(t, [[x,y],…], {n, r, col, speed, k, seed, band, wave, a})
         沿一条圆滑路线流动的一串小圆点（系统里“什么往哪儿走”）；k 是路线长出来的进度
     zoomInto(t, z, [{draw(R,f,t), px, py, rho}, …], {x, y, R}) → {i, f, S, nx, ny, nr}
         对数缩放镜头：z 是连续的层号（1.5 = 第 1 层钻到第 2 层的一半）；每层的 draw 以原点为中心、半径 R 来画；
         px,py（以 R 为单位）和 rho（占 R 的比例）是下一层在这一层里的位置和大小
     bubble(t, t0, '文字', x, y, {sz, col, ink, tail:'down'|'up'|'left'|'right'|'none', t1, float, font})
         圆角标签气泡，x,y 是气泡中心；弹入，轻轻浮动，t1 退场
     scaleBar(t, t0, z, ['杯子','水滴','微粒'], x, y, w, {sz, col, cap, t1})
         尺度条：等距的刻度就是对数尺度，发光的滑块停在 z，当前一档的字变亮
     withCtx(ctx, fn)  把上面这些形体画到别的画布上（封面的 art 里用；气泡和尺度条带文字，只能画在主画布）
     PAL  这套风格的色板 */
window.PACK=window.PACK||{};window.PACK_INIT=window.PACK_INIT||[];
PACK.glow=(function(){
const TAU=Math.PI*2;
let G=g;
const PAL={bg0:'#0a1242',bg1:'#26104f',deep:'#140e44',teal:'#35e0cf',blue:'#3f8cff',violet:'#8f6bff',pink:'#ff6fa8',warm:'#ffc44d',hot:'#ff7a4a',white:'#f2f7ff'};

/* ---------- 颜色 ---------- */
const _rgb=new Map();
function rgb(c){if(Array.isArray(c))return c;let v=_rgb.get(c);if(v)return v;let h=String(c).replace('#','');if(h.length===3)h=h.split('').map(x=>x+x).join('');const n=parseInt(h,16);v=[(n>>16)&255,(n>>8)&255,n&255];_rgb.set(c,v);return v}
function mixc(a,b,k){a=rgb(a);b=rgb(b);return[a[0]+(b[0]-a[0])*k,a[1]+(b[1]-a[1])*k,a[2]+(b[2]-a[2])*k]}
function css(c,a=1){c=rgb(c);return`rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${a})`}
// 发光用的小图：每种颜色做一次，之后只是贴图
const _spr=new Map();
function sprite(col){const c=rgb(col),key=(Math.round(c[0]/8)<<12)|(Math.round(c[1]/8)<<6)|Math.round(c[2]/8);let s=_spr.get(key);if(s)return s;s=document.createElement('canvas');s.width=s.height=192;const x=s.getContext('2d'),gr=x.createRadialGradient(96,96,0,96,96,96);
  gr.addColorStop(0,css(c,1));gr.addColorStop(.25,css(c,.62));gr.addColorStop(.55,css(c,.22));gr.addColorStop(.8,css(c,.06));gr.addColorStop(1,css(c,0));x.fillStyle=gr;x.fillRect(0,0,192,192);_spr.set(key,s);return s}
function halo(x,y,r,col,a=1){if(a<=0||r<=0)return;G.save();G.globalAlpha*=a;G.globalCompositeOperation='lighter';G.drawImage(sprite(col),x-r,y-r,r*2,r*2);G.restore()}
function disc(x,y,r){G.beginPath();G.arc(x,y,Math.max(0,r),0,TAU);G.fill()}
function rrp(x,y,w,h,r){G.beginPath();G.roundRect(x,y,w,h,r)}

/* ---------- 发光圆润形体 ---------- */
function blobPath(x,y,rx,ry,wob,seed,t,tip=0){const n=48,P=[];for(let i=0;i<n;i++){const th=i/n*TAU,w=(1+tip*Math.pow(Math.max(0,-Math.sin(th)),9))*(1+wob*(.55*Math.sin(3*th+t*.9+seed*6.1)+.3*Math.sin(2*th-t*.7+seed*3.3)+.15*Math.sin(5*th+t*1.3+seed)));P.push([x+Math.cos(th)*rx*w,y+Math.sin(th)*ry*w])}
  G.beginPath();for(let i=0;i<n;i++){const a=P[i],b=P[(i+1)%n],mx=(a[0]+b[0])/2,my=(a[1]+b[1])/2;if(i===0){const z=P[n-1];G.moveTo((z[0]+a[0])/2,(z[1]+a[1])/2)}G.quadraticCurveTo(a[0],a[1],mx,my)}G.closePath()}
function blob(t,x,y,r,o={}){const col=o.col||TH.a1,seed=o.seed||0,idle=o.idle??1,wob=o.wob??.05,gl=o.glow??1,tip=o.tip||0,hi=o.hi??1;let k=1,a=o.a??1;
  if(o.t0!=null){const q=seg(t,o.t0,o.t0+.55);if(q<=0)return null;sfx('pop',o.t0);k=back(q);a*=cl(q*3)}
  if(o.t1!=null){const q=1-seg(t,o.t1-.4,o.t1);if(q<=0)return null;a*=q;k*=lerp(.8,1,q)}
  const br=Math.sin(t*1.7+seed*5),R=r*k*(1+.03*idle*br),rx=R*(o.sx||1)*(1+.018*idle*Math.cos(t*1.7+seed*5)),ry=R*(o.sy||1)*(1-.018*idle*Math.cos(t*1.7+seed*5));
  const cx=x+Math.cos(t*.6+seed*3)*r*.02*idle,cy=y+Math.sin(t*.9+seed*7)*r*.045*idle,dark=mixc(col,PAL.deep,.42);
  G.save();G.globalAlpha*=a;
  if(gl>0)halo(cx,cy,Math.max(rx,ry)*(2.05+.1*br),col,.5*gl);
  G.fillStyle=css(dark);blobPath(cx,cy,rx,ry,wob,seed,t,tip);G.fill();                                   // 暗面
  G.save();blobPath(cx,cy,rx,ry,wob,seed,t,tip);G.clip();
  G.fillStyle=css(col);blobPath(cx-rx*.09,cy-ry*.13,rx*.94,ry*.93,wob,seed+.4,t,tip);G.fill();          // 亮面（往左上偏一点，右下露出暗面）
  if(hi>0){G.fillStyle=css(mixc(col,'#ffffff',.6),.5*hi);G.beginPath();G.ellipse(cx-rx*.36,cy-ry*.44,rx*.27,ry*.15,-.55,0,TAU);G.fill();   // 高光
  G.fillStyle=css(mixc(col,'#ffffff',.6),.38*hi);disc(cx-rx*.62,cy-ry*.16,rx*.055)}
  if(o.core){const kx=cx+rx*.14+Math.sin(t*.8+seed)*rx*.04,ky=cy+ry*.12+Math.cos(t*.7+seed)*ry*.04,kr=R*.36*(1+.05*Math.sin(t*2.3+seed));
    G.fillStyle=css(mixc(o.core,PAL.deep,.4));blobPath(kx,ky,kr,kr,.06,seed+2,t);G.fill();G.fillStyle=css(o.core);blobPath(kx-kr*.1,ky-kr*.12,kr*.84,kr*.84,.06,seed+2.3,t);G.fill();
    G.fillStyle=css(mixc(o.core,'#ffffff',.6),.55);disc(kx-kr*.32,ky-kr*.36,kr*.16)}
  G.restore();
  if(o.face){const f=o.face===true?{}:o.face,lk=f.look||[0,0],bl=((t*.31+seed*.37)%1)<.035?.12:1,ex=rx*.3,ey=cy-ry*.06+lk[1]*ry*.1,ox=lk[0]*rx*.13,ew=rx*.105,eh=ry*.15*bl;
    for(const s of[-1,1]){G.fillStyle=css(PAL.deep);G.beginPath();G.ellipse(cx+s*ex+ox,ey,ew,eh,0,0,TAU);G.fill();if(bl===1){G.fillStyle=css(PAL.white,.95);disc(cx+s*ex+ox-ew*.3,ey-eh*.38,ew*.34)}}
    if(f.smile){G.fillStyle=css(PAL.deep);G.beginPath();G.arc(cx+ox,ey+ry*.24,rx*.12,0,Math.PI);G.closePath();G.fill()}}
  G.restore();return{x:cx,y:cy,r:R,rx,ry}}

/* ---------- 成群小单元 ---------- */
function dot(x,y,r,col){G.fillStyle=css(mixc(col,PAL.deep,.42));disc(x,y,r);G.fillStyle=css(col);disc(x-r*.1,y-r*.13,r*.84);G.fillStyle=css(mixc(col,'#ffffff',.65),.6);disc(x-r*.34,y-r*.38,r*.2)}
function swarm(t,o={}){const n=o.n||40,x=o.x??W/2,y=o.y??H/2,rx=o.rx||300,ry=o.ry||rx,r=o.r||10,cols=o.cols||[TH.a1],sd=o.seed||0,k=o.k??1,calm=o.calm??1,en=o.energy||0,heat=cl(o.heat||0),hot=o.hot||PAL.hot,gl=o.glow??1,out=[];
  for(let i=0;i<n;i++){const j=Math.floor(rnd(sd*13+i*7+1)*n),ord=(i*37+11)%n,ki=cl(k*n-ord);if(ki<=0)continue;let hx,hy;
    if(o.shape==='box'){hx=(rnd(sd+i*3+2)*2-1)*rx;hy=(rnd(sd+i*3+5)*2-1)*ry}else{const rad=Math.sqrt((i+.5)/n),an=i*2.39996+sd;hx=Math.cos(an)*rad*rx;hy=Math.sin(an)*rad*ry}
    const p1=rnd(sd+i*5+3)*TAU,p2=rnd(sd+i*5+4)*TAU,f1=.5+rnd(sd+i+60)*.6,f2=.4+rnd(sd+i+90)*.6,q1=7+rnd(sd+i+120)*5,q2=11+rnd(sd+i+150)*7;
    const px=x+hx+Math.sin(t*f1+p1)*r*1.3*calm+(Math.sin(t*q1+p2)+.5*Math.sin(t*q2+p1))*r*1.9*en,py=y+hy+Math.cos(t*f2+p2)*r*1.3*calm+(Math.cos(t*q1*.93+p1)+.5*Math.sin(t*q2*1.1+p2))*r*1.9*en;
    const rr=r*(.72+.56*rnd(sd+i+200))*(1+.07*Math.sin(t*2.1+i))*back(ki),c0=cols[j%cols.length],col=heat>0?mixc(c0,hot,Math.round(heat*12)/12):c0;
    G.save();G.globalAlpha*=cl(ki*2);if(gl>0)halo(px,py,rr*(2.6+en),col,.42*gl);if(o.draw)o.draw(px,py,rr,i,col);else dot(px,py,rr,col);G.restore();out.push([px,py,rr])}
  return out}

/* ---------- 流动的小圆点 ---------- */
function pathOf(pts){const S=[],n=pts.length;if(n<2)return{S:[[pts[0][0],pts[0][1],0]],L:0};for(let i=0;i<n-1;i++){const p0=pts[Math.max(0,i-1)],p1=pts[i],p2=pts[i+1],p3=pts[Math.min(n-1,i+2)];for(let j=0;j<16;j++){const u=j/16,u2=u*u,u3=u2*u;
    S.push([.5*(2*p1[0]+(p2[0]-p0[0])*u+(2*p0[0]-5*p1[0]+4*p2[0]-p3[0])*u2+(3*p1[0]-p0[0]-3*p2[0]+p3[0])*u3),.5*(2*p1[1]+(p2[1]-p0[1])*u+(2*p0[1]-5*p1[1]+4*p2[1]-p3[1])*u2+(3*p1[1]-p0[1]-3*p2[1]+p3[1])*u3),0])}}
  S.push([pts[n-1][0],pts[n-1][1],0]);let L=0;for(let i=1;i<S.length;i++){L+=Math.hypot(S[i][0]-S[i-1][0],S[i][1]-S[i-1][1]);S[i][2]=L}return{S,L}}
function along(P,s){const d=cl(s)*P.L,S=P.S;let i=1;while(i<S.length-1&&S[i][2]<d)i++;const a=S[i-1],b=S[i],u=b[2]>a[2]?(d-a[2])/(b[2]-a[2]):0;return[lerp(a[0],b[0],u),lerp(a[1],b[1],u),Math.atan2(b[1]-a[1],b[0]-a[0])]}
function stream(t,pts,o={}){const n=o.n||12,r=o.r||7,col=o.col||TH.a2,sp=o.speed??.22,k=cl(o.k??1),sd=o.seed||0,a=o.a??1;if(k<=0||a<=0)return;const P=pathOf(pts);G.save();G.globalAlpha*=a;
  if(o.band!==false){G.save();G.globalAlpha*=.13;G.strokeStyle=css(col);G.lineWidth=r*2.8;G.lineCap='round';G.lineJoin='round';G.beginPath();const m=Math.max(1,Math.round(k*40));for(let i=0;i<=m;i++){const p=along(P,k*i/m);i?G.lineTo(p[0],p[1]):G.moveTo(p[0],p[1])}G.stroke();G.restore()}   // 很淡的一条“通道”，不是轮廓线
  for(let i=0;i<n;i++){const s=(((i+rnd(sd+i*3)*.5)/n+t*sp)%1+1)%1;if(s>k)continue;const p=along(P,s),e=Math.sin(Math.PI*s),w=(o.wave||0)*Math.sin(t*3+i*1.7+sd),px=p[0]-Math.sin(p[2])*w,py=p[1]+Math.cos(p[2])*w,rr=r*(.55+.45*e)*(.8+.4*rnd(sd+i+40));
    G.save();G.globalAlpha*=cl(e*2.2)*cl((k-s)*12+.25);halo(px,py,rr*2.8,col,.5);G.fillStyle=css(col);disc(px,py,rr);G.fillStyle=css(mixc(col,'#ffffff',.7),.7);disc(px-rr*.3,py-rr*.32,rr*.34);G.restore()}
  G.restore()}

/* ---------- 对数缩放镜头 ---------- */
function zoomInto(t,z,layers,o={}){const n=layers.length,x=o.x??W/2,y=o.y??H/2,R=o.R||300;z=cl(z,0,n-1);let i=Math.min(n-1,Math.floor(z)),f=z-i;if(i===n-1&&n>1&&f===0&&z>0){i=n-2;f=1}
  const L=layers[i],N=layers[i+1],rho=N?(L.rho||.1):1,Sm=1/rho,S=N?Math.pow(Sm,f):1,q=N&&Sm>1?(1-1/S)/(1-1/Sm):0,cxu=(L.px||0)*q,cyu=(L.py||0)*q;
  const a0=N?1-seg(f,.5,.88):1;if(a0>0){G.save();G.translate(x,y);G.scale(S,S);G.translate(-cxu*R,-cyu*R);G.globalAlpha*=a0;L.draw(R,f,t);G.restore()}
  let nx=x,ny=y,nr=R;if(N){nx=x+((L.px||0)-cxu)*R*S;ny=y+((L.py||0)-cyu)*R*S;const s=S*rho;nr=R*s;const a1=seg(f,.18,.62);if(a1>0){G.save();G.translate(nx,ny);G.scale(s,s);G.globalAlpha*=a1;N.draw(R,f-1,t);G.restore()}}
  return{i,f,S,nx,ny,nr}}

/* ---------- 圆角标签气泡 ---------- */
function bubble(t,t0,s,x,y,o={}){const q=seg(t,t0,t0+.45);if(q<=0)return;const out=o.t1!=null?1-seg(t,o.t1-.35,o.t1):1;if(out<=0)return;sfx('pop',t0);
  const sz=o.sz||38,font=o.font||TH.f.b,col=o.col||PAL.white,ink=o.ink||PAL.deep,tail=o.tail||'down',w=tw(s,sz,font)+sz*1.5,h=sz*1.9,sc=lerp(.62,1,back(q))*lerp(.9,1,out),fy=Math.sin(t*1.3+x*.013+y*.007)*4*(o.float??1),tl=sz*.52,tb=sz*.34;
  G.save();G.translate(x,y+fy);G.scale(sc,sc);G.globalAlpha*=cl(q*3)*out;
  G.save();G.scale(1,h/w*1.9);halo(0,0,w*.72,col,.2);G.restore();
  G.fillStyle=css(PAL.deep,.4);rrp(-w/2+3,-h/2+9,w,h,h/2);G.fill();G.fillStyle=css(col);G.beginPath();
  if(tail==='down'){G.moveTo(-tb,h/2-3);G.lineTo(tb,h/2-3);G.lineTo(0,h/2+tl)}else if(tail==='up'){G.moveTo(-tb,-h/2+3);G.lineTo(tb,-h/2+3);G.lineTo(0,-h/2-tl)}else if(tail==='left'){G.moveTo(-w/2+3,-tb);G.lineTo(-w/2+3,tb);G.lineTo(-w/2-tl,0)}else if(tail==='right'){G.moveTo(w/2-3,-tb);G.lineTo(w/2-3,tb);G.lineTo(w/2+tl,0)}
  G.closePath();G.fill();rrp(-w/2,-h/2,w,h,h/2);G.fill();G.save();rrp(-w/2,-h/2,w,h,h/2);G.clip();G.fillStyle=css(mixc(col,PAL.blue,.22),.35);G.fillRect(-w/2,h*.22,w,h);G.restore();   // 下半截的暗面
  txt(s,0,sz*.36,sz,ink,font,'center');G.restore()}

/* ---------- 尺度条 ---------- */
function scaleBar(t,t0,z,stops,x,y,w,o={}){const k=eo(seg(t,t0,t0+.5))*(o.t1!=null?1-seg(t,o.t1-.4,o.t1):1);if(k<=0)return;const n=stops.length,sz=o.sz||34,col=o.col||TH.a1,X=i=>x+w*(n>1?i/(n-1):.5),kx=X(cl(z,0,n-1)),cur=Math.round(cl(z,0,n-1));
  G.save();G.globalAlpha*=k;G.fillStyle=css(PAL.white,.14);rrp(x-16,y-8,(w+32)*eo(seg(t,t0,t0+.6)),16,8);G.fill();G.fillStyle=css(col,.85);rrp(x-16,y-8,kx-x+32,16,8);G.fill();
  for(let i=0;i<n;i++){const on=i<=z+.02,isCur=i===cur,rr=isCur?13:10;G.fillStyle=on?css(col):css(mixc(PAL.white,PAL.deep,.5));disc(X(i),y,rr);G.fillStyle=css(PAL.deep,.55);disc(X(i),y,rr*.42);
    txt(stops[i],X(i),y+sz*1.75,sz,isCur?TH.ink:TH.dim,isCur?TH.f.t:TH.f.b,'center')}
  const br=1+.08*Math.sin(t*3);halo(kx,y,54*br,col,.75);G.fillStyle=css(PAL.white);disc(kx,y,17*br);G.fillStyle=css(col);disc(kx,y,10*br);
  if(o.cap)txt(o.cap,x-48,y+sz*.36,sz,TH.note,TH.f.s,'right');G.restore()}

function withCtx(c,fn){const old=G;G=c;try{fn()}finally{G=old}}

/* ---------- 主题：大色斑、漂浮微粒、四角压暗 ---------- */
const SPOTS=[[PAL.violet,.2,.24,760,.21,.05],[PAL.teal,.82,.3,640,.13,.04],[PAL.pink,.62,.92,600,.12,.06],[PAL.blue,.1,.86,560,.17,.045]];
function backdrop(t){const gr=g.createLinearGradient(0,0,W*.35,H);gr.addColorStop(0,PAL.bg0);gr.addColorStop(1,PAL.bg1);g.fillStyle=gr;g.fillRect(0,0,W,H);const old=G;G=g;
  SPOTS.forEach(([c,x,y,r,a,s],i)=>halo(W*x+Math.sin(t*s*5+i*2.1)*110,H*y+Math.cos(t*s*4+i*1.3)*70,r*(1+.06*Math.sin(t*.4+i)),c,a));
  const MC=[PAL.teal,PAL.white,PAL.violet,PAL.warm];
  for(let i=0;i<70;i++){const v=7+rnd(i+9)*16,yy=((rnd(i+50)*H-t*v)%H+H)%H,xx=rnd(i)*W+Math.sin(t*.25+i)*26,r=1.6+rnd(i+77)*3.2,e=Math.sin(Math.PI*yy/H),tk=.55+.45*Math.sin(t*(.7+rnd(i+33)*1.3)+i),c=MC[i%7===0?3:i%3];
    g.save();g.globalAlpha=e*tk*(.18+rnd(i+21)*.3);if(r>3.2)halo(xx,yy,r*5,c,.6);g.fillStyle=css(c);g.beginPath();g.arc(xx,yy,r,0,TAU);g.fill();g.restore()}
  G=old}
let VIG=null;
function vignette(){if(VIG)return VIG;VIG=document.createElement('canvas');VIG.width=W/4;VIG.height=H/4;const c=VIG.getContext('2d'),gr=c.createRadialGradient(W/8,H/8,H*.14,W/8,H/8,H*.3);gr.addColorStop(0,'rgba(5,4,30,0)');gr.addColorStop(1,'rgba(5,4,30,.5)');c.fillStyle=gr;c.fillRect(0,0,W/4,H/4);return VIG}
function front(t){g.save();g.setTransform(1,0,0,1,0,0);g.globalAlpha=1;g.drawImage(vignette(),0,0,W,H);const old=G;G=g;
  for(let i=0;i<7;i++){const v=22+rnd(i+400)*26,yy=((rnd(i+410)*(H+300)-t*v)%(H+300)+H+300)%(H+300)-150,xx=rnd(i+420)*W+Math.sin(t*.3+i*2)*60,r=46+rnd(i+430)*60;halo(xx,yy,r,i%2?PAL.teal:PAL.violet,.07)}
  G=old;g.restore()}
addTheme('glow',{ink:PAL.white,dim:'rgba(226,234,255,.66)',note:'rgba(226,234,255,.84)',a1:PAL.teal,a2:PAL.warm,a3:PAL.hot,chip:'rgba(53,224,207,.14)',sub:'rgba(10,9,44,.74)',subInk:PAL.white,top:PAL.bg0,bot:PAL.bg1,
  card:'rgba(28,24,96,.9)',cardInk:PAL.white,pillInk:PAL.deep,hl:PAL.warm,f:{t:'H9',b:'H7',s:'H5',h:'KT',n:'RC'},bg(t){backdrop(t)},post(t){front(t)}});

return{blob,dot,swarm,stream,zoomInto,bubble,scaleBar,withCtx,PAL};
})();
