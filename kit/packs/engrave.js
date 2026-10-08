/* 风格包 · 铜版画 —— 本项目自己实现
   米白纸上压出一块图版：双线框、角上编号、底部图题；东西先刻轮廓，再一组一组铺排线（平行、交叉、点刻、环线、顺形线），
   明暗只靠线的疏密和粗细，不用灰度和渐变；细引线加编号圆圈标注，圆形放大框把细节放大重画；最后淡水彩一次刷进去，全片一两种颜色。字用宋体。
   用法（时间习惯：t 全片时间，t0 开始时刻；能“刻出来”的函数都返回刻完的时刻，可以接着往下排）：
   plate(t, t0, {x,y,w,h,no,head,title,note,dur})        图版：先压出版痕（略深的纸色和压边），再刻双线框；no 右上角编号、head 左上角图谱名、title 框下居中图题、note 框下右侧小注
                                                          （x,y,w,h 是内框；版痕向外多占约 70 像素，底部到 y+h+90，排版时让它停在 960 以上）
   etch(t, t0, dur, 路径, {lw,col,seq,tool})              轮廓线按进度刻出来：线两头收尖、中段略有粗细起伏；一组路径缺省一条接一条刻（seq:false 同时刻）；tool 画刻刀（缺省在主画面上画）
   hatch(t, t0, dur, 区域, {angle,gap,lw,cross,crossFrom,dots,density,dotR,rings,along,width,light,contrast,tone,shade,cut,col,rev,tool})
                                                          在闭合区域里按进度铺排线（一排一排扫过去），线裁在区域内（区域可带洞，按奇偶规则）。明暗 = 线宽：shade(x,y[,v]) 返回 0..1 的暗度，
                                                          缺省按 light 方向（缺省左上来光）、tone 基调、contrast 反差算；暗度低于 cut 的地方不下刀（留白当高光）。
                                                          线型：缺省平行线（angle 度，gap 间距）；cross:true 在暗处（≥crossFrom）再加一组交叉线（cross 也可写夹角度数）；
                                                          rings:[cx,cy] 同心环线；along:中心线, width:半宽 顺着形体走的线（管子、弯梁），这时 shade 的第三个参数 v 是横向位置 -1..1；
                                                          dots:true 只点刻（density 密度、dotR 点径），dots:'add' 在线之外再点刻；铺线时刻刀跟着走（tool:false 关掉）
   callNo(t, t0, 编号, [px,py], [lx,ly], '说明', {r,size,side,col,tool})  从部件上的点拉一根细引线（刻刀带着走）到编号圆圈，圈里写编号，旁边写说明（缺省写在远离部件的一侧）；0.75 秒画完
   loupe(t, t0, [cx,cy], 半径, 放大倍数, 画细节的函数, {src,label,labelDy,dur})  圆形放大框：src 处先刻一个小圈，两条切线连到大圈，大圈像光圈一样张开，
                                                          里面用 src 处的坐标调用 画细节的函数(t) 放大重画；里面的 etch/hatch 线宽和间距自动除以倍数，放大了仍是细线；label 写在大圈下方
   tint(t, t0, dur, 区域, 颜色, {alpha,angle,edge,grain,seed,brush})  水彩上色：一道湿边从 angle 方向扫过区域，颜料略溢出边线、边缘积色、纸纹透出；用正片叠底，排线照样看得见；
                                                          主画面上有一支画笔沿湿边来回刷、刷完抬起离开（brush:false 关掉；放大框里缺省不画）
   S.line/poly/rect/rrect/circle/ellipse/arc/curve/smooth/offset/band/ring/zigzag   路径工具（返回点组；闭合的带 .closed）；band(中心线, 半宽) 得到弯梁那样的闭合区域
   on(ctx, fn)                                            把不带字的组件临时画到另一张画布上（封面 art 用；plate/callNo/loupe 的字不画）
   主题名 engrave；颜色 INK 墨、TONE 版痕纸色、COPPER 淡铜、STEEL 铁灰（上色用，全片别超过两种） */
window.PACK=window.PACK||{};window.PACK_INIT=window.PACK_INIT||[];
PACK.engrave=(function(){
  const INK='#2a211b',PAPER='#efe8d6',TONE='#e7ddc6',COPPER='#cf9460',STEEL='#7f9cae',TAU=Math.PI*2;
  let G=g,ZS=1,PAPC=null,GRAN=null,TMP=null;
  const sn=(x,seed)=>{const i=Math.floor(x),f=x-i,u=f*f*(3-2*f);return lerp(rnd(seed*13.7+i),rnd(seed*13.7+i+1),u)*2-1};
  const hashv=a=>{let h=7;for(const v of a)h=(h*31+Math.round(v))%9973;return h};
  const mk=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c};

  /* ---------- 纸：做一次 ---------- */
  function paperTex(){if(PAPC)return PAPC;const c=mk(W,H),x=c.getContext('2d');x.fillStyle=PAPER;x.fillRect(0,0,W,H);
    for(let i=0;i<70;i++){const px=rnd(i+5)*W,py=rnd(i+91)*H,r=140+rnd(i+177)*420,warm=rnd(i+33)<.6;const gr=x.createRadialGradient(px,py,0,px,py,r);gr.addColorStop(0,warm?'rgba(150,118,70,.035)':'rgba(255,253,245,.08)');gr.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=gr;x.fillRect(px-r,py-r,2*r,2*r)}
    x.lineCap='round';for(let i=0;i<1100;i++){const px=rnd(i+400)*W,py=rnd(i+1700)*H,l=6+rnd(i+3000)*22,a=rnd(i+4200)*TAU;x.strokeStyle=`rgba(110,88,55,${.04+rnd(i+5100)*.06})`;x.lineWidth=.6+rnd(i+6000)*.6;x.beginPath();x.moveTo(px,py);x.quadraticCurveTo(px+Math.cos(a+.6)*l*.5,py+Math.sin(a+.6)*l*.5,px+Math.cos(a)*l,py+Math.sin(a)*l);x.stroke()}
    for(let i=0;i<3200;i++){x.fillStyle=`rgba(90,70,40,${.04+rnd(i+7000)*.08})`;const s=.6+rnd(i+9000)*1.4;x.fillRect(rnd(i+11000)*W,rnd(i+13000)*H,s,s)}
    for(let i=0;i<9;i++){const px=rnd(i+15000)*W,py=rnd(i+15100)*H,r=5+rnd(i+15200)*14;const gr=x.createRadialGradient(px,py,0,px,py,r);gr.addColorStop(0,'rgba(160,110,60,.10)');gr.addColorStop(1,'rgba(160,110,60,0)');x.fillStyle=gr;x.fillRect(px-r,py-r,2*r,2*r)}
    const v=x.createRadialGradient(W/2,H/2,H*.45,W/2,H/2,H*1.05);v.addColorStop(0,'rgba(120,90,50,0)');v.addColorStop(1,'rgba(120,90,50,.13)');x.fillStyle=v;x.fillRect(0,0,W,H);return PAPC=c}
  // 水彩的纸纹：用 destination-out 从颜料里抠掉一些（大块深浅 + 细颗粒）
  function gran(){if(GRAN)return GRAN;const N=1920,c=mk(N,N),x=c.getContext('2d');
    for(let i=0;i<260;i++){const px=rnd(i+20000)*N,py=rnd(i+20500)*N,r=30+rnd(i+21000)*120;const gr=x.createRadialGradient(px,py,0,px,py,r);gr.addColorStop(0,`rgba(0,0,0,${.12+rnd(i+21500)*.22})`);gr.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=gr;x.fillRect(px-r,py-r,2*r,2*r)}
    for(let i=0;i<26000;i++){x.fillStyle=`rgba(0,0,0,${.2+rnd(i+30000)*.45})`;const s=1+rnd(i+60000)*2.2;x.fillRect(rnd(i+90000)*N,rnd(i+120000)*N,s,s)}return GRAN=c}

  addTheme('engrave',{light:true,ink:INK,dim:'rgba(42,33,27,.62)',note:'rgba(42,33,27,.82)',a1:'#93441f',a2:INK,a3:'#4d6576',chip:'rgba(42,33,27,.06)',sub:'rgba(242,236,222,.94)',subInk:INK,
    top:'#f2ebdb',bot:'#e6dbc2',card:'rgba(246,240,226,.96)',cardInk:INK,pillInk:'#f4eddd',hl:'rgba(194,125,69,.30)',f:{t:'SongB',b:'SongB',s:'Song',h:'Song',n:'SongB'},
    bg(t){g.drawImage(paperTex(),0,0)}});
  PACK_INIT.push(async()=>{await Promise.all([['Song','铜版'],['SongB','铜版']].map(([f,s])=>document.fonts.load(`40px ${f}`,s).catch(()=>0)))});

  /* ---------- 路径工具 ---------- */
  const cls=(p,c=true)=>{p.closed=c;return p};
  const S={
    line:(x1,y1,x2,y2)=>[[x1,y1],[x2,y2]],
    poly:(pts,closed=true)=>cls(pts.map(p=>[p[0],p[1]]),closed),
    rect:(x,y,w,h)=>cls([[x,y],[x+w,y],[x+w,y+h],[x,y+h]]),
    rrect(x,y,w,h,r){const o=[],C=[[x+w-r,y+r,-.25],[x+w-r,y+h-r,0],[x+r,y+h-r,.25],[x+r,y+r,.5]];o.push([x+r,y]);C.forEach(([cx,cy,a])=>{for(let i=0;i<=8;i++){const b=(a+i/32)*TAU;o.push([cx+Math.cos(b)*r,cy+Math.sin(b)*r])}});return cls(o)},
    circle:(cx,cy,r,n)=>{n=n||Math.max(32,Math.round(r*ZS*.8));const o=[];for(let i=0;i<n;i++){const a=-Math.PI/2+i/n*TAU;o.push([cx+Math.cos(a)*r,cy+Math.sin(a)*r])}return cls(o)},
    ellipse:(cx,cy,rx,ry,n=72)=>{const o=[];for(let i=0;i<n;i++){const a=Math.PI+i/n*TAU;o.push([cx+Math.cos(a)*rx,cy+Math.sin(a)*ry])}return cls(o)},
    arc:(cx,cy,r,a0,a1,n)=>{n=n||Math.max(8,Math.round(Math.abs(a1-a0)*r/8));const o=[];for(let i=0;i<=n;i++){const a=lerp(a0,a1,i/n);o.push([cx+Math.cos(a)*r,cy+Math.sin(a)*r])}return cls(o,false)},
    curve:(fn,n=48,closed=false)=>{const o=[];for(let i=0;i<=n;i++)o.push(fn(i/n));return cls(o,closed)},
    smooth(pts,closed=false,k=8){const o=[],n=pts.length,P=i=>closed?pts[(i+n)%n]:pts[Math.max(0,Math.min(n-1,i))];for(let i=0;i<(closed?n:n-1);i++){const a=P(i-1),b=P(i),c=P(i+1),d=P(i+2);for(let j=0;j<k;j++){const u=j/k,u2=u*u,u3=u2*u;o.push([0,1].map(q=>.5*(2*b[q]+(c[q]-a[q])*u+(2*a[q]-5*b[q]+4*c[q]-d[q])*u2+(3*b[q]-a[q]-3*c[q]+d[q])*u3)))}}if(!closed)o.push(pts[n-1].slice());return cls(o,closed)},
    offset(p,d){const n=p.length,c=p.closed;return cls(p.map((q,i)=>{const a=p[c?(i-1+n)%n:Math.max(0,i-1)],b=p[c?(i+1)%n:Math.min(n-1,i+1)],tx=b[0]-a[0],ty=b[1]-a[1],l=Math.hypot(tx,ty)||1;return [q[0]-ty/l*d,q[1]+tx/l*d]}),c)},
    band(center,hw){const a=S.offset(center,hw),b=S.offset(center,-hw).reverse();return cls(a.concat(b))},
    ring:(cx,cy,r0,r1)=>[S.circle(cx,cy,r1),S.circle(cx,cy,r0)],
    zigzag(x,y1,y2,w,n){const o=[[x,y1]];for(let i=0;i<n;i++){const y=lerp(y1,y2,(i+.5)/n);o.push([x+(i%2?-w:w)/2,y])}o.push([x,y2]);return cls(o,false)}
  };
  const paths=p=>(p.length&&typeof p[0][0]==='number')?[p]:p;
  const closedPts=p=>p.closed?p.concat([p[0]]):p;
  function plen(p){let L=0;for(let i=1;i<p.length;i++)L+=Math.hypot(p[i][0]-p[i-1][0],p[i][1]-p[i-1][1]);return L}
  function bbox(R){let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;R.forEach(p=>p.forEach(([x,y])=>{x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y)}));return {x0,y0,x1,y1}}
  // 沿折线走到 upto 为止，每 ds 一小段回调；返回走到的点和方向
  function walk(p,upto,ds,cb){let s=0,last=p[0],dir=[1,0];for(let i=1;i<p.length;i++){const a=p[i-1],b=p[i],L=Math.hypot(b[0]-a[0],b[1]-a[1]);if(L===0)continue;dir=[(b[0]-a[0])/L,(b[1]-a[1])/L];const n=Math.max(1,Math.ceil(L/ds));
      for(let j=0;j<n;j++){const s0=s+L*j/n;if(s0>=upto)return {p:last,dir};const u0=j/n,u1=Math.min((j+1)/n,(upto-s)/L),x0=a[0]+(b[0]-a[0])*u0,y0=a[1]+(b[1]-a[1])*u0,x1=a[0]+(b[0]-a[0])*u1,y1=a[1]+(b[1]-a[1])*u1;cb(x0,y0,x1,y1,s0);last=[x1,y1];if(u1<(j+1)/n)return {p:last,dir}}s+=L}return {p:last,dir}}
  const NB=6,bk=()=>Array.from({length:NB},()=>new Path2D());
  function strokeB(B,lw,col,minF){G.save();G.strokeStyle=col;G.lineCap='round';G.lineJoin='round';B.forEach((p,i)=>{G.lineWidth=lw*(minF+(1-minF)*(i+.5)/NB);G.stroke(p)});G.restore()}
  const bi=f=>Math.max(0,Math.min(NB-1,Math.floor(f*NB)));

  /* ---------- 刻线 ---------- */
  function tool(x,y){const s=1/ZS;G.save();G.translate(x,y);G.rotate(-.88);G.scale(s,s);
    G.fillStyle='rgba(40,30,20,.14)';G.beginPath();G.ellipse(100,18,80,9,0,0,TAU);G.fill();
    G.fillStyle='#5d6266';G.beginPath();G.moveTo(0,0);G.lineTo(30,-5);G.lineTo(30,5);G.closePath();G.fill();
    G.fillStyle='#7d8387';G.fillRect(30,-5,92,10);G.fillStyle='rgba(255,255,255,.45)';G.fillRect(32,-4,88,2.5);
    G.fillStyle='#6b4024';G.fillRect(118,-8,10,16);G.beginPath();G.moveTo(128,-22);G.lineTo(128,22);G.ellipse(128,0,15,22,0,Math.PI/2,-Math.PI/2,true);G.closePath();G.fill();
    G.fillStyle='rgba(255,230,200,.25)';G.beginPath();G.ellipse(134,-8,6,9,0,0,TAU);G.fill();
    G.strokeStyle='rgba(30,20,10,.5)';G.lineWidth=1.2;G.stroke();G.restore()}
  function etch(t,t0,dur,path,o={}){const P=paths(path).map(closedPts),k=seg(t,t0,t0+dur);if(k<=0)return t0+dur;
    const lw=(o.lw||2.6)/ZS,col=o.col||INK,Ls=P.map(plen),tot=Ls.reduce((a,b)=>a+b,0),seq=o.seq!==false,e=k>=1?1:eio(k)*.6+k*.4,ds=5/ZS,tap=16/ZS;let bud=tot*e,head=null;
    const B=bk();P.forEach((p,i)=>{const L=Ls[i],up=seq?Math.min(L,bud):L*e;bud-=L;if(up<=0)return;const sd=hashv(p[0])+i;
      const r=walk(p,up,ds,(x0,y0,x1,y1,s)=>{const f=Math.min(1,.25+.75*Math.min(s,L-s)/tap)*(.82+.18*sn(s*ZS/70,sd));const b=B[bi(f)];b.moveTo(x0,y0);b.lineTo(x1,y1)});if(up<L)head=r.p});
    strokeB(B,lw,col,.35);
    if(head&&k<1){G.save();G.fillStyle=col;G.beginPath();G.arc(head[0],head[1],lw*.7,0,TAU);G.fill();G.restore();if(o.tool??ZS===1)tool(head[0],head[1])}
    return t0+dur}

  /* ---------- 排线 ---------- */
  function mkShade(o,b){if(typeof o.shade==='function')return o.shade;const L=o.light||[-1,-1],m=Math.hypot(L[0],L[1])||1,lx=L[0]/m,ly=L[1]/m,cx=(b.x0+b.x1)/2,cy=(b.y0+b.y1)/2,hw=Math.max(1,(b.x1-b.x0)/2),hh=Math.max(1,(b.y1-b.y0)/2),c=o.contrast??1,base=o.tone??.5;
    return (x,y)=>cl(base-.5*c*(((x-cx)/hw)*lx+((y-cy)/hh)*ly))}
  function parLines(b,ang,gap){const a=ang*Math.PI/180,ux=Math.cos(a),uy=Math.sin(a),nx=-uy,ny=ux,cx=(b.x0+b.x1)/2,cy=(b.y0+b.y1)/2,r=Math.hypot(b.x1-b.x0,b.y1-b.y0)/2+2,o=[];
    for(let d=-r+((r%gap)/2);d<=r;d+=gap)o.push({p:[[cx+nx*d-ux*r,cy+ny*d-uy*r],[cx+nx*d+ux*r,cy+ny*d+uy*r]]});return o}
  function drawLines(L,kk,shade,o,lw,minS,b){const n=L.length;if(!n||kk<=0)return;const m=Math.max(1,n*.22),ds=9/ZS,cut=o.cut??.1,B=bk(),pad=2/ZS;
    L.forEach((ln,i)=>{const ki=kk>=1?1:cl((kk*(n+m)-i)/m);if(ki<=0)return;const p=ln.p,up=plen(p)*ki;
      walk(p,up,ds,(x0,y0,x1,y1)=>{const mx=(x0+x1)/2,my=(y0+y1)/2;if(mx<b.x0-pad||mx>b.x1+pad||my<b.y0-pad||my>b.y1+pad)return;const s=shade(mx,my,ln.v);if(s<cut||s<minS)return;const lo=Math.max(cut,minS),f=cl((s-lo)/(1-lo)),q=B[bi(f)];q.moveTo(x0,y0);q.lineTo(x1,y1)})});
    strokeB(B,lw,o.col||INK,minS>0?.08:.22)}
  function pip(R,x,y){let c=false;for(const p of R)for(let i=0,j=p.length-1;i<p.length;j=i++){const a=p[i],q=p[j];if((a[1]>y)!==(q[1]>y)&&x<(q[0]-a[0])*(y-a[1])/(q[1]-a[1])+a[0])c=!c}return c}
  // 刻刀停在“正在刻的那一排”上：取正在生长的那几条线中间的一条，找它已刻部分里最后一个落在区域内的点
  function toolAt(L,kk,R){const n=L.length,m=Math.max(1,n*.22),fi=Math.max(0,Math.min(n-1,Math.round(kk*(n+m)-m*.5)));
    for(let j=fi;j>=Math.max(0,fi-10);j--){const ki=cl((kk*(n+m)-j)/m),p=L[j].p;let last=null;walk(p,plen(p)*ki,6/ZS,(x0,y0,x1,y1)=>{if(pip(R,x1,y1))last=[x1,y1]});if(last)return last}return null}
  function hatch(t,t0,dur,region,o={}){const k=seg(t,t0,t0+dur);if(k<=0)return t0+dur;const R=paths(region),b=bbox(R),gap=(o.gap||8)/ZS,lw=(o.lw||2)/ZS,shade=mkShade(o,b);
    G.save();const cp=new Path2D();R.forEach(p=>{cp.moveTo(p[0][0],p[0][1]);for(let i=1;i<p.length;i++)cp.lineTo(p[i][0],p[i][1]);cp.closePath()});G.clip(cp,'evenodd');
    const lines=o.dots===true?null:o.rings?(()=>{const [cx,cy]=o.rings,dx=Math.max(b.x0-cx,0,cx-b.x1),dy=Math.max(b.y0-cy,0,cy-b.y1),r0=Math.max(gap*.6,Math.hypot(dx,dy)),r1=Math.max(...[[b.x0,b.y0],[b.x1,b.y0],[b.x0,b.y1],[b.x1,b.y1]].map(([x,y])=>Math.hypot(x-cx,y-cy))),out=[];for(let r=r0;r<=r1;r+=gap)out.push({p:closedPts(S.circle(cx,cy,r,Math.max(24,Math.round(r*ZS*.4))))});return out})()
      :o.along?(()=>{const w=o.width||20,out=[];for(let d=-w+gap/2;d<=w;d+=gap)out.push({p:S.offset(o.along,d),v:d/w});return out})():parLines(b,o.angle??45,gap);
    if(o.rev&&lines)lines.reverse();
    const cross=o.cross?(o.cross===true?90:o.cross):0,k1=cross?seg(k,0,.62):k;
    const L2=cross&&lines?parLines(b,(o.angle??45)+cross,gap*1.05):null,k2=seg(k,.45,1);
    if(lines)drawLines(lines,k1,shade,o,lw,0,b);
    if(L2)drawLines(L2,k2,shade,o,lw*.85,o.crossFrom??.5,b);
    if(o.dots){const kd=lines?seg(k,.3,1):k,st=gap*(o.dots===true?1:1.3),den=o.density??1,r0=(o.dotR||1.7)/ZS,sd=hashv([b.x0,b.y0,b.x1]),B=bk();let i=0;
      for(let y=b.y0;y<=b.y1;y+=st)for(let x=b.x0;x<=b.x1;x+=st){i++;const px=x+(rnd(sd+i*3)-.5)*st*.9,py=y+(rnd(sd+i*3+1)-.5)*st*.9,s=shade(px,py);if(rnd(sd+i*3+2)>s*den||rnd(sd+i*7)*.9>kd)continue;const f=cl(s),q=B[bi(f)],rr0=r0*(.55+.9*(bi(f)+.5)/NB);q.moveTo(px+rr0,py);q.arc(px,py,rr0,0,TAU)}
      G.fillStyle=o.col||INK;B.forEach(p=>G.fill(p))}
    G.restore();
    if(k<1&&(o.tool??ZS===1)){const tp=lines?(L2&&k1>=1?toolAt(L2,k2,R):toolAt(lines,k1,R)):(()=>{const q=[(b.x0+b.x1)/2+(b.x1-b.x0)*.32*Math.sin(k*Math.PI*5),(b.y0+b.y1)/2+(b.y1-b.y0)*.3*Math.sin(k*Math.PI*7)];return q})();if(tp)tool(tp[0],tp[1])}
    return t0+dur}

  /* ---------- 图版框 ---------- */
  function plate(t,t0,o={}){const x=o.x??240,y=o.y??110,w=o.w??1440,h=o.h??760,d=o.dur||1.6,k=seg(t,t0,t0+d);if(k<=0)return t0+d;
    const ka=eo(seg(k,0,.35)),X0=x-60,Y0=y-72,X1=x+w+60,Y1=y+h+88;
    if(ka>0){G.save();G.globalAlpha*=ka;G.fillStyle=TONE;G.fillRect(X0,Y0,X1-X0,Y1-Y0);
      G.lineWidth=3;G.strokeStyle='rgba(255,252,242,.85)';G.beginPath();G.moveTo(X0+1.5,Y1);G.lineTo(X0+1.5,Y0+1.5);G.lineTo(X1,Y0+1.5);G.stroke();
      G.strokeStyle='rgba(120,95,60,.35)';G.beginPath();G.moveTo(X1-1.5,Y0);G.lineTo(X1-1.5,Y1-1.5);G.lineTo(X0,Y1-1.5);G.stroke();G.restore()}
    etch(t,t0+d*.1,d*.55,S.rect(x-10,y-10,w+20,h+20),{lw:4.4,tool:false});
    etch(t,t0+d*.3,d*.55,S.rect(x,y,w,h),{lw:1.6,tool:false});
    if(G===g){const a=eo(seg(k,.72,1));
      if(o.no)txt(o.no,x+w+10,y-30,36,INK,'SongB','right',a);
      if(o.head)txt(o.head,x-10,y-30,34,INK,'Song','left',a);
      if(o.title)txt(o.title,x+w/2,y+h+64,42,INK,'SongB','center',a);
      if(o.note)txt(o.note,x+w+10,y+h+64,32,TH.note,'Song','right',a)}
    return t0+d}

  /* ---------- 编号引线 ---------- */
  function callNo(t,t0,n,p,l,label,o={}){const d=.75,k=seg(t,t0,t0+d);if(k<=0)return t0+d;const r=o.r||27,col=o.col||INK,side=o.side||(l[0]<p[0]?'left':'right');
    const dx=l[0]-p[0],dy=l[1]-p[1],dl=Math.hypot(dx,dy)||1,ex=l[0]-dx/dl*r,ey=l[1]-dy/dl*r,kl=eio(seg(k,0,.5));
    G.save();G.strokeStyle=col;G.fillStyle=col;G.lineCap='round';G.beginPath();G.arc(p[0],p[1],3.6/ZS,0,TAU);G.fill();
    G.lineWidth=1.5/ZS;G.beginPath();G.moveTo(p[0],p[1]);G.lineTo(lerp(p[0],ex,kl),lerp(p[1],ey,kl));G.stroke();if(kl>0&&kl<1&&(o.tool??ZS===1))tool(lerp(p[0],ex,kl),lerp(p[1],ey,kl));
    const kc=seg(k,.4,.8);if(kc>0){const a0=Math.atan2(-dy,-dx);G.lineWidth=2/ZS;G.beginPath();G.arc(l[0],l[1],r,a0,a0+TAU*eio(kc));G.stroke()}
    G.restore();
    if(G===g){const sz=o.size||40;txt(String(n),l[0],l[1]+12.5,34,col,'SongB','center',eo(seg(k,.6,1)));
      txt(label,side==='left'?l[0]-r-14:l[0]+r+14,l[1]+sz*.36,sz,col,'SongB',side==='left'?'right':'left',eo(seg(k,.7,1)))}
    return t0+d}

  /* ---------- 放大框 ---------- */
  function loupe(t,t0,c,r,mag,draw,o={}){const src=o.src||c,d=o.dur||1.1,k=seg(t,t0,t0+d);if(k<=0)return t0+d;const r1=r/mag;
    etch(t,t0,d*.3,S.circle(src[0],src[1],r1),{lw:1.8,tool:false});
    const kt=eio(seg(k,.22,.6));if(kt>0){const dx=c[0]-src[0],dy=c[1]-src[1],dd=Math.hypot(dx,dy),th=Math.atan2(dy,dx),al=Math.acos(cl((r1-r)/dd,-1,1));
      G.save();G.strokeStyle=INK;G.lineWidth=1.3/ZS;G.lineCap='round';[th+al,th-al].forEach(a=>{const nx=Math.cos(a),ny=Math.sin(a),ax=src[0]+nx*r1,ay=src[1]+ny*r1,bx=c[0]+nx*r,by=c[1]+ny*r;G.beginPath();G.moveTo(ax,ay);G.lineTo(lerp(ax,bx,kt),lerp(ay,by,kt));G.stroke()});G.restore()}
    const kd=eio(seg(k,.38,.88));if(kd>0){G.save();G.beginPath();G.arc(c[0],c[1],r*kd,0,TAU);G.fillStyle=TONE;G.fill();G.clip();G.translate(c[0],c[1]);G.scale(mag,mag);G.translate(-src[0],-src[1]);const z=ZS;ZS=z*mag;try{draw(t)}finally{ZS=z}G.restore()}
    etch(t,t0+d*.4,d*.5,S.circle(c[0],c[1],r,120),{lw:4,tool:false});etch(t,t0+d*.5,d*.5,S.circle(c[0],c[1],r-9,120),{lw:1.4,tool:false});
    if(o.label&&G===g)txt(o.label,c[0],c[1]+r+(o.labelDy||58),36,INK,'SongB','center',eo(seg(k,.8,1)));
    return t0+d}

  /* ---------- 水彩上色 ---------- */
  function brush(x,y,col,a){if(a<=0)return;G.save();G.globalAlpha*=a;G.translate(x,y);G.rotate(-1.02);G.scale(1/ZS,1/ZS);
    G.fillStyle='rgba(40,30,20,.13)';G.beginPath();G.ellipse(150,22,120,10,0,0,TAU);G.fill();
    G.fillStyle=col;G.beginPath();G.moveTo(0,0);G.quadraticCurveTo(12,-10,46,-9);G.lineTo(46,9);G.quadraticCurveTo(12,10,0,0);G.fill();
    G.fillStyle='rgba(40,25,15,.35)';G.beginPath();G.moveTo(0,0);G.quadraticCurveTo(10,-4,24,-5);G.lineTo(24,5);G.quadraticCurveTo(10,4,0,0);G.fill();
    G.fillStyle='#9b968b';G.fillRect(46,-10,26,20);G.fillStyle='rgba(255,255,255,.4)';G.fillRect(48,-8,22,3);
    G.fillStyle='#5b2f1d';G.beginPath();G.moveTo(72,-8);G.lineTo(260,-4.5);G.quadraticCurveTo(268,0,260,4.5);G.lineTo(72,8);G.closePath();G.fill();
    G.fillStyle='rgba(255,220,190,.22)';G.fillRect(76,-6,180,2.5);G.restore()}
  function tint(t,t0,dur,region,col,o={}){const k=seg(t,t0,t0+dur),useB=o.brush??ZS===1;if(k<=0)return t0+dur;const R=paths(region),b=bbox(R),m=G.getTransform(),cw=G.canvas.width,ch=G.canvas.height;
    if(!TMP||TMP.width<cw||TMP.height<ch)TMP=mk(Math.max(1920,cw),Math.max(1920,ch));const x=TMP.getContext('2d');
    const edge=(o.edge??6)/ZS,sd=o.seed??hashv([b.x0,b.y0,b.x1,b.y1]),pad=edge*2+16/ZS;
    const cor=[[b.x0-pad,b.y0-pad],[b.x1+pad,b.y0-pad],[b.x0-pad,b.y1+pad],[b.x1+pad,b.y1+pad]].map(([u,v])=>[m.a*u+m.c*v+m.e,m.b*u+m.d*v+m.f]);
    const bx=Math.max(0,Math.floor(Math.min(...cor.map(p=>p[0])))),by=Math.max(0,Math.floor(Math.min(...cor.map(p=>p[1])))),bw=Math.min(cw,Math.ceil(Math.max(...cor.map(p=>p[0]))))-bx,bh=Math.min(ch,Math.ceil(Math.max(...cor.map(p=>p[1]))))-by;if(bw<=0||bh<=0)return t0+dur;
    x.setTransform(1,0,0,1,0,0);x.globalCompositeOperation='source-over';x.globalAlpha=1;x.clearRect(bx,by,bw,bh);x.setTransform(m);
    // 不整齐的边：沿边线重采样，向外溢出 0.3–1 倍 edge
    const RP=new Path2D();R.forEach((p,pi)=>{const q=closedPts(p),L=plen(q),n=Math.max(12,Math.round(L*ZS/9)),pts=[];let s=0,j=1;
      for(let i=0;i<n;i++){const want=L*i/n;while(j<q.length-1&&s+Math.hypot(q[j][0]-q[j-1][0],q[j][1]-q[j-1][1])<want){s+=Math.hypot(q[j][0]-q[j-1][0],q[j][1]-q[j-1][1]);j++}const a=q[j-1],c2=q[j],sl=Math.hypot(c2[0]-a[0],c2[1]-a[1])||1,u=cl((want-s)/sl);pts.push([lerp(a[0],c2[0],u),lerp(a[1],c2[1],u),(c2[0]-a[0])/sl,(c2[1]-a[1])/sl,want])}
      const ccw=pts.reduce((acc,p2,i)=>{const p3=pts[(i+1)%pts.length];return acc+(p3[0]-p2[0])*(p3[1]+p2[1])},0)>0?1:-1;
      pts.forEach(([px,py,tx,ty,s2],i)=>{const off=edge*(.3+.7*(sn(s2*ZS/38,sd+pi)*.5+.5))*(pi?-1:1)*ccw,qx=px-ty*off,qy=py+tx*off;i?RP.lineTo(qx,qy):RP.moveTo(qx,qy)});RP.closePath()});
    // 湿边从 angle 方向扫过来
    const a=(o.angle??-12)*Math.PI/180,ux=Math.cos(a),uy=Math.sin(a),nx=-uy,ny=ux,cx=(b.x0+b.x1)/2,cy=(b.y0+b.y1)/2,rad=Math.hypot(b.x1-b.x0,b.y1-b.y0)/2+pad,f=lerp(-rad,rad+20/ZS,k>=1?1:eio(k)),FP=new Path2D(),FL=new Path2D();
    for(let i=0;i<=24;i++){const s=lerp(-rad,rad,i/24),w=f+sn(i*.55,sd+7)*14/ZS,px=cx+nx*s+ux*w,py=cy+ny*s+uy*w;i?(FP.lineTo(px,py),FL.lineTo(px,py)):(FP.moveTo(cx+nx*s-ux*rad*2,cy+ny*s-uy*rad*2),FP.lineTo(px,py),FL.moveTo(px,py))}
    FP.lineTo(cx+nx*rad-ux*rad*2,cy+ny*rad-uy*rad*2);FP.closePath();
    x.save();if(k<1)x.clip(FP);x.fillStyle=col;x.fill(RP,'evenodd');x.globalCompositeOperation='multiply';x.strokeStyle=col;x.lineJoin='round';x.globalAlpha=.6;x.lineWidth=4/ZS;x.stroke(RP);
    if(k<1){x.clip(RP,'evenodd');x.globalAlpha=.55*(1-k*.6);x.lineWidth=16/ZS;x.stroke(FL)}x.restore();
    x.setTransform(1,0,0,1,0,0);x.globalCompositeOperation='destination-out';x.globalAlpha=o.grain??.75;x.drawImage(gran(),bx,by,bw,bh,bx,by,bw,bh);x.globalAlpha=1;x.globalCompositeOperation='source-over';
    G.save();G.setTransform(1,0,0,1,0,0);G.globalCompositeOperation='multiply';G.globalAlpha*=(o.alpha??.42);G.drawImage(TMP,bx,by,bw,bh,bx,by,bw,bh);G.restore();
    // 画笔：沿湿边上下来回刷，刷完抬起离开
    if(useB&&t<t0+dur+.5){const ke=k>=1?1:eio(k),fb=lerp(-rad,rad+20/ZS,ke)-10/ZS,life=seg(t,t0+dur,t0+dur+.5);let s=rad*.6*Math.sin(ke*Math.PI*3.5),px,py;
      for(let i=0;i<5;i++){px=cx+nx*s+ux*fb;py=cy+ny*s+uy*fb;if(pip(R,px,py))break;s*=.5}
      brush(px+90*life/ZS,py-150*life/ZS,col,cl(k*12)*(1-life))}
    return t0+dur}

  function on(ctx,fn){const k=G;G=ctx;try{fn()}finally{G=k}}
  return {plate,etch,hatch,callNo,loupe,tint,S,on,INK,TONE,COPPER,STEEL,PAPER};
})();
