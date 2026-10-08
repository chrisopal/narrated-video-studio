/* 风格包 · 概念形变 —— 本项目自己实现
   近黑的底上只有彩色的线和点；一个东西平滑地变成另一个；一种颜色全片只指一个概念；
   每个动画走 1–3 秒，然后停约 1 秒；不加光晕、阴影、装饰；坐标轴和网格细而暗，主角线亮。
   主题名：morph。点的写法统一是 [x,y]；一条线是点的数组。
   用法（t 全片时间，t0 开始时刻，dur 时长，o 都可省）：
     frame({x,y,w,h},{xr:[0,6],yr:[0,6]})            坐标框：返回 F，F.p(vx,vy) 数据→像素，F.pts(点组) 整组换算
     gridWarp(t,t0,dur,F,[a,b,c,d],{in,step,col,lw,ghost})  画网格，并在 t0 起把整张网格按 x'=ax+by, y'=cx+dy 慢慢变形；返回和 F 同样用法的 {p,pts,k,m}，别的图形用它换算就跟着网格一起变
     axes(t,t0,F,{warp,ticks,labels:['x','y'],col,lw,sz}) 两根坐标轴从原点长出来，带刻度和轴名；warp 传 gridWarp 的返回值
     drawOn(t,t0,dur,点组,{col,lw,close,dot,a,dash}) 一条线从头“写”出来；dot:true 笔尖带一个点；返回笔尖位置
     plot(t,t0,dur,fn,F,{col,lw,xr,n,warp,dot})       函数图像从左写到右；返回像素点组（可以接着拿去形变）
     morphPath(t,t0,dur,点组A,点组B,{col,colB,lw,close,fill,fa,n,a,ease}) A 按点对点插值变成 B（自动重采样到相同点数）；t0 之前画 A，之后画 B；返回当前点组
     dotOn(t,t0,dur,点组,{col,r,close,t1,ring})      一个点沿路径走一遍；返回当前位置
     label(t,t0,'字',px,py,lx,ly,{col,sz,al,w,t1})    贴着图形的短标签：(px,py) 是所指的点，(lx,ly) 是文字基线位置，中间一条细引线
     brace(t,t0,x1,y1,x2,y2,'字',{col,sz,side,depth,t1}) 大括号：从 (x1,y1) 到 (x2,y2)，side=1 在行进方向右手边（左→右时在下方）
     formula(t,t0,[ '宽', {s:'x',sup:'2',sub:'n',col,a}, … ],x,y,sz,{col,al,w,t1}) 排一行简单式子，上下标用小号字（不小于 32）；返回总宽
     cap(t,t0,t1,'字',x,y,sz,col,字体,对齐)           一行会退场的说明字（t1 为空就不退场）
   取点工具（坐标无关，数据坐标或像素都行）：
     sample(fn,x0,x1,n) 函数取点；steps(fn,x0,x1,n,side) 函数下的 n 级台阶轮廓（side=1 取每级右端的高，0 取左端）；
     shape.line(x0,y0,x1,y1) .rect(x,y,w,h) .circle(cx,cy,r,n) .ngon(cx,cy,r,边数,起角) .stairs(x0,y0,x1,y1,n)；
     resample(点组,n,close) 按弧长重采样；along(点组,k,close) 路径上按长度走到 k（0..1）处的那个点；mixCol('#aabbcc','#ddeeff',k) 两色之间取色；C 调色板 {blue,amber,coral,green,violet,grid,axis} */
window.PACK=window.PACK||{};window.PACK_INIT=window.PACK_INIT||[];
PACK.morph=(function(){
  const C={bg0:'#0a0c10',bg1:'#0d1016',ink:'#e8ecf1',blue:'#5cc8ff',amber:'#ffd166',coral:'#ff7b72',green:'#8ee07a',violet:'#b79cff',grid:'rgba(255,255,255,.13)',axis:'rgba(255,255,255,.5)'};
  addTheme('morph',{light:false,ink:C.ink,dim:'rgba(232,236,241,.58)',note:'rgba(232,236,241,.82)',a1:C.blue,a2:C.amber,a3:C.coral,
    chip:'rgba(255,255,255,.06)',sub:'rgba(8,10,14,.82)',subInk:C.ink,top:C.bg0,bot:C.bg1,card:'rgba(22,26,34,.94)',cardInk:C.ink,pillInk:'#0a0c10',hl:'rgba(255,209,102,.35)',
    f:{t:'H7',b:'H5',s:'H5',h:'KT',n:'RC'},
    bg(t){grad(this.top,this.bot)}});

  /* ---------- 取点和换算 ---------- */
  const vis=(t,t0,t1,d=.4)=>eo(seg(t,t0,t0+d))*(t1==null?1:1-seg(t,t1-.3,t1));
  function mixCol(a,b,k){if(!b||a===b||k<=0)return a;if(k>=1)return b;const h=c=>/^#[0-9a-f]{6}$/i.test(c)?[1,3,5].map(i=>parseInt(c.slice(i,i+2),16)):null,A=h(a),B=h(b);if(!A||!B)return k<.5?a:b;return 'rgb('+A.map((v,i)=>Math.round(lerp(v,B[i],k))).join(',')+')'}
  function lens(Q){const L=[0];for(let i=1;i<Q.length;i++)L.push(L[i-1]+Math.hypot(Q[i][0]-Q[i-1][0],Q[i][1]-Q[i-1][1]));return L}
  // 按弧长重采样到 n 个点（闭合图形不重复起点）
  function resample(P,n,close){const Q=close?P.concat([P[0]]):P,L=lens(Q),tot=L[L.length-1],out=[];if(tot<=0)return Array.from({length:n},()=>[Q[0][0],Q[0][1]]);let j=1;
    for(let i=0;i<n;i++){const d=tot*(close?i/n:i/Math.max(1,n-1));while(j<Q.length-1&&L[j]<d)j++;const s=L[j]-L[j-1],k=s>0?(d-L[j-1])/s:0;out.push([lerp(Q[j-1][0],Q[j][0],k),lerp(Q[j-1][1],Q[j][1],k)])}return out}
  // 一条线的前 k 段（按长度）
  function partial(P,k,close){const Q=close?P.concat([P[0]]):P;if(k>=1)return Q;const L=lens(Q),d=L[L.length-1]*k,out=[Q[0]];for(let i=1;i<Q.length;i++){if(L[i]<=d){out.push(Q[i]);continue}const s=L[i]-L[i-1],f=s>0?(d-L[i-1])/s:0;out.push([lerp(Q[i-1][0],Q[i][0],f),lerp(Q[i-1][1],Q[i][1],f)]);break}return out}
  function along(P,k,close){const Q=partial(P,cl(k,1e-6,1),close);return Q[Q.length-1]}
  function sample(fn,x0,x1,n=160){const out=[];for(let i=0;i<=n;i++){const x=lerp(x0,x1,i/n);out.push([x,fn(x)])}return out}
  function steps(fn,x0,x1,n,side=1){const w=(x1-x0)/n,out=[[x0,fn(x0)]];for(let i=0;i<n;i++){const xa=x0+i*w,xb=xa+w,h=fn(side?xb:xa);out.push([xa,h],[xb,h])}out.push([x1,fn(x1)]);return out}
  const shape={
    line:(x0,y0,x1,y1)=>[[x0,y0],[x1,y1]],
    rect:(x,y,w,h)=>[[x,y],[x+w,y],[x+w,y+h],[x,y+h]],
    circle:(cx,cy,r,n=96)=>Array.from({length:n},(_,i)=>[cx+r*Math.cos(i/n*2*Math.PI-Math.PI/2),cy+r*Math.sin(i/n*2*Math.PI-Math.PI/2)]),
    ngon:(cx,cy,r,m,a0=-Math.PI/2)=>Array.from({length:m},(_,i)=>[cx+r*Math.cos(a0+i/m*2*Math.PI),cy+r*Math.sin(a0+i/m*2*Math.PI)]),
    stairs:(x0,y0,x1,y1,n)=>{const out=[[x0,y0]],dx=(x1-x0)/n,dy=(y1-y0)/n;for(let i=0;i<n;i++)out.push([x0+i*dx,y0+(i+1)*dy],[x0+(i+1)*dx,y0+(i+1)*dy]);return out}};
  function frame(R,o={}){const xr=o.xr||[0,1],yr=o.yr||[0,1];const p=(vx,vy)=>[R.x+(vx-xr[0])/(xr[1]-xr[0])*R.w,R.y+R.h-(vy-yr[0])/(yr[1]-yr[0])*R.h];return {R,xr,yr,p,pts:A=>A.map(q=>p(q[0],q[1]))}}

  /* ---------- 画线 ---------- */
  function trace(P,close){g.beginPath();for(let i=0;i<P.length;i++)i?g.lineTo(P[i][0],P[i][1]):g.moveTo(P[i][0],P[i][1]);if(close)g.closePath()}
  function stroke(P,o){if(!P||P.length<2)return;const a=o.a==null?1:o.a;if(a<=0)return;g.save();g.globalAlpha*=a;g.lineJoin='round';g.lineCap='round';
    if(o.fill){g.save();g.globalAlpha*=o.fa==null?.14:o.fa;g.fillStyle=o.fill;trace(P,true);g.fill();g.restore()}
    g.strokeStyle=o.col||TH.a1;g.lineWidth=o.lw||6;if(o.dash)g.setLineDash(o.dash);trace(P,o.close);g.stroke();g.restore()}
  function dot(x,y,r,col,a=1,ring){if(a<=0)return;g.save();g.globalAlpha*=a;g.fillStyle=col;g.beginPath();g.arc(x,y,r,0,7);g.fill();if(ring){g.strokeStyle=col;g.lineWidth=2;g.globalAlpha*=.6;g.beginPath();g.arc(x,y,r+ring,0,7);g.stroke()}g.restore()}
  function drawOn(t,t0,dur,P,o={}){const k=eio(seg(t,t0,t0+dur));if(k<=0)return P[0];const Q=partial(P,k,o.close);stroke(Q,{...o,close:o.close&&k>=1,fill:k>=1?o.fill:null});const h=Q[Q.length-1];
    if(o.dot&&k<1)dot(h[0],h[1],(o.lw||6)*1.5,o.col||TH.a1,o.a==null?1:o.a);return h}
  function plot(t,t0,dur,fn,F,o={}){const xr=o.xr||F.xr,P=(o.warp||F).pts(sample(fn,xr[0],xr[1],o.n||160));drawOn(t,t0,dur,P,o);return P}
  function morphPath(t,t0,dur,A,B,o={}){const k=(o.ease||eio)(seg(t,t0,t0+dur));let P;
    if(k<=0)P=A;else if(k>=1)P=B;else{const n=o.n||Math.max(240,A.length,B.length),a=resample(A,n,o.close),b=resample(B,n,o.close);P=a.map((p,i)=>[lerp(p[0],b[i][0],k),lerp(p[1],b[i][1],k)])}
    stroke(P,{...o,col:mixCol(o.col||TH.a1,o.colB,k)});return P}
  function dotOn(t,t0,dur,P,o={}){const k=eio(seg(t,t0,t0+dur)),Q=partial(P,Math.max(k,1e-6),o.close),h=k<=0?P[0]:Q[Q.length-1];dot(h[0],h[1],o.r||11,o.col||TH.a1,vis(t,t0-.25,o.t1,.25),o.ring);return h}

  /* ---------- 坐标系 ---------- */
  function gridWarp(t,t0,dur,F,M,o={}){const k=M?eio(seg(t,t0,t0+dur)):0,I=[1,0,0,1],m=I.map((v,i)=>lerp(v,(M||I)[i],k));
    const mk=m=>(vx,vy)=>F.p(m[0]*vx+m[1]*vy,m[2]*vx+m[3]*vy),p=mk(m),st=o.step||1,[xa,xb]=F.xr,[ya,yb]=F.yr;
    const lines=(pp,a)=>{g.save();g.globalAlpha*=a;g.strokeStyle=o.col||C.grid;g.lineWidth=o.lw||1.5;g.lineCap='round';g.beginPath();let i=0;
      for(let x=Math.ceil(xa/st)*st;x<=xb+1e-9;x+=st,i++){const q=o.in==null?1:eo(seg(t,o.in+i*.05,o.in+i*.05+.6));if(q<=0)continue;const A=pp(x,ya),B=pp(x,lerp(ya,yb,q));g.moveTo(A[0],A[1]);g.lineTo(B[0],B[1])}
      i=0;for(let y=Math.ceil(ya/st)*st;y<=yb+1e-9;y+=st,i++){const q=o.in==null?1:eo(seg(t,o.in+i*.05,o.in+i*.05+.6));if(q<=0)continue;const A=pp(xa,y),B=pp(lerp(xa,xb,q),y);g.moveTo(A[0],A[1]);g.lineTo(B[0],B[1])}
      g.stroke();g.restore()};
    if(o.ghost&&k>0)lines(mk(I),o.ghost*k);lines(p,1);
    return {k,m,p,pts:A=>A.map(q=>p(q[0],q[1])),R:F.R,xr:F.xr,yr:F.yr}}
  function axes(t,t0,F,o={}){const k=eo(seg(t,t0,t0+.9));if(k<=0)return;const Wp=o.warp||F,[xa,xb]=F.xr,[ya,yb]=F.yr,ox=cl(0,xa,xb),oy=cl(0,ya,yb),col=o.col||C.axis,sz=o.sz||40;
    g.save();g.strokeStyle=col;g.lineWidth=o.lw||2.5;g.lineCap='round';g.beginPath();
    let A=Wp.p(xa,oy),B=Wp.p(lerp(xa,xb,k),oy);g.moveTo(A[0],A[1]);g.lineTo(B[0],B[1]);A=Wp.p(ox,ya);B=Wp.p(ox,lerp(ya,yb,k));g.moveTo(A[0],A[1]);g.lineTo(B[0],B[1]);
    const st=o.ticks==null?1:o.ticks;if(st){const dx=(xb-xa)/F.R.w*7,dy=(yb-ya)/F.R.h*7;
      for(let x=Math.ceil(xa/st)*st;x<=lerp(xa,xb,k)+1e-9;x+=st){A=Wp.p(x,oy-dy);B=Wp.p(x,oy+dy);g.moveTo(A[0],A[1]);g.lineTo(B[0],B[1])}
      for(let y=Math.ceil(ya/st)*st;y<=lerp(ya,yb,k)+1e-9;y+=st){A=Wp.p(ox-dx,y);B=Wp.p(ox+dx,y);g.moveTo(A[0],A[1]);g.lineTo(B[0],B[1])}}
    g.stroke();g.restore();
    if(o.labels){const a=eo(seg(t,t0+.6,t0+1.1)),ex=Wp.p(xb,oy),ey=Wp.p(ox,yb);if(o.labels[0])txt(o.labels[0],ex[0]+22,ex[1]+sz*.32,sz,TH.dim,TH.f.h,'left',a);if(o.labels[1])txt(o.labels[1],ey[0],ey[1]-22,sz,TH.dim,TH.f.h,'center',a)}}

  /* ---------- 标签、括号、式子 ---------- */
  function label(t,t0,s,px,py,lx,ly,o={}){const a=vis(t,t0,o.t1);if(a<=0)return;const sz=o.sz||40,col=o.col||TH.ink,w=o.w||TH.f.b,al=o.al||'left',wd=tw(s,sz,w),x0=al==='center'?lx-wd/2:al==='right'?lx-wd:lx;
    const ex=cl(px,x0-14,x0+wd+14),ey=cl(py,ly-sz*.86-10,ly+sz*.16+10),d=Math.hypot(ex-px,ey-py);g.save();g.globalAlpha*=a;
    if(d>26){const ux=(ex-px)/d,uy=(ey-py)/d,k=eo(seg(t,t0,t0+.5));g.strokeStyle=col;g.globalAlpha*=.75;g.lineWidth=2;g.lineCap='round';g.beginPath();g.moveTo(px+ux*13,py+uy*13);g.lineTo(lerp(px+ux*13,ex,k),lerp(py+uy*13,ey,k));g.stroke()}
    g.restore();dot(px,py,5,col,a);txt(s,lx,ly,sz,col,w,al,a)}
  function brace(t,t0,x1,y1,x2,y2,s,o={}){const a=vis(t,t0,o.t1);if(a<=0)return;const k=eo(seg(t,t0,t0+.5)),col=o.col||TH.note,sz=o.sz||36,side=o.side==null?1:o.side,mx=(x1+x2)/2,my=(y1+y2)/2;
    const ax=lerp(mx,x1,k),ay=lerp(my,y1,k),bx=lerp(mx,x2,k),by=lerp(my,y2,k),len=Math.hypot(bx-ax,by-ay)||1,ux=(bx-ax)/len,uy=(by-ay)/len,nx=-uy*side,ny=ux*side;
    const off=o.off==null?10:o.off,d=o.depth||22,h=d/2,q=Math.min(h,len/4),P=(u,n)=>[ax+ux*u+nx*(n+off),ay+uy*u+ny*(n+off)],m=len/2;
    g.save();g.globalAlpha*=a;g.strokeStyle=col;g.lineWidth=o.lw||2.5;g.lineCap='round';g.lineJoin='round';g.beginPath();
    let p=P(0,0),c=P(0,h),e=P(q,h);g.moveTo(p[0],p[1]);g.quadraticCurveTo(c[0],c[1],e[0],e[1]);e=P(m-q,h);g.lineTo(e[0],e[1]);c=P(m,h);e=P(m,d);g.quadraticCurveTo(c[0],c[1],e[0],e[1]);
    e=P(m+q,h);g.quadraticCurveTo(c[0],c[1],e[0],e[1]);e=P(len-q,h);g.lineTo(e[0],e[1]);c=P(len,h);e=P(len,0);g.quadraticCurveTo(c[0],c[1],e[0],e[1]);g.stroke();g.restore();
    if(s){const c2=P(m,d+12+sz*.5);txt(s,o.tx==null?c2[0]:o.tx,c2[1]+sz*.35,sz,col,o.w||TH.f.b,'center',a)}}
  function formula(t,t0,parts,x,y,sz,o={}){const a=vis(t,t0,o.t1);const w=o.w||TH.f.h,ss=Math.max(32,Math.round(sz*.6)),col=o.col||TH.ink;
    const L=parts.map(p=>typeof p==='string'?{s:p}:p).map(p=>{const mw=tw(p.s,sz,p.w||w),xw=Math.max(p.sup?tw(p.sup,ss,p.w||w):0,p.sub?tw(p.sub,ss,p.w||w):0);return {...p,mw,xw}}),tot=L.reduce((s,p)=>s+p.mw+p.xw+(p.xw?sz*.06:0),0);
    if(a<=0)return tot;let cx=o.al==='center'?x-tot/2:o.al==='right'?x-tot:x;const dy=(1-eo(seg(t,t0,t0+.5)))*18;
    for(const p of L){const pa=a*(p.a==null?1:p.a),pc=p.col||col,f=p.w||w;txt(p.s,cx,y+dy,sz,pc,f,'left',pa);cx+=p.mw;if(p.xw){cx+=sz*.03;if(p.sup)txt(p.sup,cx,y+dy-sz*.46,ss,pc,f,'left',pa);if(p.sub)txt(p.sub,cx,y+dy+sz*.24,ss,pc,f,'left',pa);cx+=p.xw+sz*.03}}
    return tot}
  function cap(t,t0,t1,s,x,y,sz=40,col,w,al='left'){const a=vis(t,t0,t1,.5);if(a<=0)return;txt(s,x,y+(1-eo(seg(t,t0,t0+.5)))*18,sz,col||TH.ink,w||TH.f.b,al,a)}

  return {C,frame,gridWarp,axes,drawOn,plot,morphPath,dotOn,label,brace,formula,cap,sample,steps,shape,resample,along,mixCol};
})();
