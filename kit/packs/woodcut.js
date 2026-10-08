/* 风格包 · 木刻版画 —— 本项目自己实现
   黑色的木版上用刀刻出白色的“光”：白线就是刀痕，宽窄不一、两头尖、方向跟着形体走，带一点木纹；全片只有一处颜色（TH.a1，缺省朱红）；
   画面靠“被刻出来”出现（刀痕一条条出现），不淡入；换场是硬切，等于新印一张：墨色不匀、纸纹、极轻的错位。
   用法（t 全片时间，t0 开始时刻；区域 region 是多边形点组 [[x,y],…]，也可以是几个多边形的数组 [[[x,y],…],[…]]，按奇偶规则挖洞）：
   print(t, t0, fn, {t1, mode:'block|paper', seed, shift:4, rot, margin:40})  印一张：t0 到 t1 之间画 fn() 的内容，盖上墨色不匀和纸纹/木纹；
                                         'paper' 印在米色纸上（四边留纸、每张轻微错位），'block' 就是木版本身（带木纹）；缺省取主题的 mode。相邻几张首尾相接就是硬切
   gouge(t, t0, dur, 点组, {w0:10, w1, col, seed, ease, smooth:true})  一刀：沿点组（缺省自动圆滑，smooth:false 走折线）刻出两头尖、边缘略毛的白色刀痕，dur 秒刻完；返回刻完的时刻
   carve(t, t0, dur, 区域, {angle:0, gap:16, w, flow, tone, jit:.3, max:560, order:'sweep|rand'|[x,y], ds, seed, key, col})
                                         用一组刀痕把区域“刻亮”：angle 刀向（度，0 水平）；gap 线距；w 最宽处；flow 为数字时线条向一侧鼓出这么多像素，
                                         为函数 (x,y)=>角度 时顺着这个方向场走（顺着形体弯，起刀点排在穿过区域中心、垂直于 angle 的线上，往两头追）；tone(x,y)=>0..1 控制刀痕粗细（0 处不下刀，做明暗）；
                                         order 下刀顺序：逐行 / 随机 / 从某点向外；flow、tone 用函数时请给 key 区分缓存。返回刻完的时刻
   spot(t, t0, 区域, {col, d:.3, shift:[3,-2], seed})  那唯一的一处颜色：像第二块色版一样滚上去（d 秒从左到右），带一点错版和斑驳
   title(t, t0, '字', x, y, 字号, {font, col, al:'left|center|right', dur})  刻字：粗重的字被一刀刀斜着刻出来，边缘有崩口；整串登记给检查；返回刻完的时刻
   rain(t, t0, {n:140, angle:155, speed:240, len:[10,34], w:[2,5], area:{x,y,w,h}, keep:[[x,y,w,h],…], fps:12, d:.8, seed, col})
                                         风雪/雨：一片片短刀痕顺着风向飘；keep 里的矩形不落雪（给字留地方）；fps 让它像一张张印出来的那样一顿一顿地动
   solid(区域, col)  留黑：用版面的黑把一块填实（人物、房子的剪影）；shape.rect/ellipse/inside 取形、判点
   on(ctx, fn)  临时把画笔换成 ctx（封面 art 里用 gouge / carve / spot / rain / solid）；title 不支持
   BLK 版面黑；CUT 刀痕白（= 纸色）；主题名 woodcut，mode 缺省 'block'（themePatch:{mode:'paper'} 整片换成纸本，themePatch:{a1:'#c4952f'} 换成土黄） */
window.PACK=window.PACK||{};window.PACK_INIT=window.PACK_INIT||[];
PACK.woodcut=(function(){
  const BLK='#15120e',CUT='#ece3cd',WOODC='#19140f',VERM='#c8361f';
  let P=g,TX=null;
  function on(ctx,fn){const o=P;P=ctx;try{fn()}finally{P=o}}
  function mk(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c}
  function R(seed){let i=seed*1013+17;return ()=>rnd(i++)}
  function sn(x,seed){const i=Math.floor(x),f=x-i,u=f*f*(3-2*f);return lerp(rnd(seed*13.7+i),rnd(seed*13.7+i+1),u)*2-1}
  function hashS(s){let h=7;for(let i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))%99991;return h}

  /* ---------- 纹理：只做一次 ---------- */
  function tex(){if(TX)return TX;TX={};
    // 木版：深色底 + 极淡的长木纹和两三个节疤
    {const c=mk(W,H),x=c.getContext('2d'),r=R(5);x.fillStyle=WOODC;x.fillRect(0,0,W,H);const knots=[[r()*W,r()*H,40+r()*40],[r()*W,r()*H,30+r()*30],[r()*W,r()*H,50+r()*30]];x.lineCap='round';
      for(let i=0;i<190;i++){const y0=i*6-40+r()*5,ph=r()*6,a=.025+r()*.05;x.strokeStyle=`rgba(150,112,72,${a})`;x.lineWidth=.7+r()*1.8;x.beginPath();
        for(let px=-20;px<=W+20;px+=14){let y=y0+8*Math.sin(px/340+ph)+3*Math.sin(px/97+i*.7);for(const [kx,ky,kr] of knots){const d=Math.hypot(px-kx,y-ky);if(d<kr*4)y+=Math.sign(y-ky||1)*kr*1.3*Math.exp(-(d/kr)*(d/kr)*.35)}px<-10?x.moveTo(px,y):x.lineTo(px,y)}x.stroke()}
      for(const [kx,ky,kr] of knots)for(let j=1;j<5;j++){x.strokeStyle=`rgba(150,112,72,${.05})`;x.lineWidth=1.2;x.beginPath();x.ellipse(kx,ky,kr*.22*j,kr*.11*j,0,0,7);x.stroke()}
      TX.wood=c}
    // 刀痕里的木纹（block 模式正片叠底）
    {const c=mk(W+300,H+240),x=c.getContext('2d'),r=R(9);x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.lineCap='round';
      for(let i=0;i<260;i++){const y0=r()*c.height,ph=r()*6;x.strokeStyle=`rgba(150,112,72,${.08+r()*.16})`;x.lineWidth=.6+r()*1.4;x.beginPath();for(let px=0;px<=c.width;px+=16){const y=y0+6*Math.sin(px/300+ph)+2*Math.sin(px/70+i);px?x.lineTo(px,y):x.moveTo(px,y)}x.stroke()}
      TX.grain=c}
    // 米色纸
    {const c=mk(W,H),x=c.getContext('2d'),r=R(13);x.fillStyle=CUT;x.fillRect(0,0,W,H);
      for(let i=0;i<70;i++){const px=r()*W,py=r()*H,rr=60+r()*260,gr=x.createRadialGradient(px,py,0,px,py,rr);gr.addColorStop(0,'rgba(170,140,90,.07)');gr.addColorStop(1,'rgba(170,140,90,0)');x.fillStyle=gr;x.fillRect(px-rr,py-rr,2*rr,2*rr)}
      x.lineCap='round';for(let i=0;i<3200;i++){const px=r()*W,py=r()*H,l=4+r()*18,a=r()*7;x.strokeStyle=r()<.75?`rgba(125,100,66,${.06+r()*.1})`:`rgba(255,252,240,${.3+r()*.3})`;x.lineWidth=.5+r()*.8;x.beginPath();x.moveTo(px,py);x.quadraticCurveTo(px+Math.cos(a)*l*.5+(r()-.5)*5,py+Math.sin(a)*l*.5+(r()-.5)*5,px+Math.cos(a)*l,py+Math.sin(a)*l);x.stroke()}
      const v=x.createRadialGradient(W/2,H/2,H*.4,W/2,H/2,H*1.05);v.addColorStop(0,'rgba(120,90,50,0)');v.addColorStop(1,'rgba(120,90,50,.16)');x.fillStyle=v;x.fillRect(0,0,W,H);TX.paper=c}
    // 纸纤维（paper 模式正片叠底：只在白处看得见）
    {const c=mk(W+300,H+240),x=c.getContext('2d'),r=R(17);x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);
      for(let i=0;i<60;i++){const px=r()*c.width,py=r()*c.height,rr=50+r()*200,gr=x.createRadialGradient(px,py,0,px,py,rr);gr.addColorStop(0,'rgba(200,175,130,.14)');gr.addColorStop(1,'rgba(200,175,130,0)');x.fillStyle=gr;x.fillRect(px-rr,py-rr,2*rr,2*rr)}
      x.lineCap='round';for(let i=0;i<5200;i++){const px=r()*c.width,py=r()*c.height,l=4+r()*20,a=r()*7;x.strokeStyle=`rgba(140,112,76,${.1+r()*.22})`;x.lineWidth=.5+r()*.8;x.beginPath();x.moveTo(px,py);x.quadraticCurveTo(px+Math.cos(a)*l*.5+(r()-.5)*6,py+Math.sin(a)*l*.5+(r()-.5)*6,px+Math.cos(a)*l,py+Math.sin(a)*l);x.stroke()}
      TX.fiber=c}
    // 墨色不匀（paper 模式“变亮”叠加：只在黑处看得见）：滚筒的横向条痕、薄墨斑、没吃上墨的小白点
    {const c=mk(W+300,H+240),x=c.getContext('2d'),r=R(23);x.fillStyle='#000';x.fillRect(0,0,c.width,c.height);
      for(let i=0;i<30;i++){const y=r()*c.height,h=16+r()*110;x.fillStyle=`rgba(66,58,46,${.06+r()*.14})`;x.fillRect(0,y,c.width,h)}
      for(let i=0;i<80;i++){const px=r()*c.width,py=r()*c.height,rr=30+r()*240,gr=x.createRadialGradient(px,py,0,px,py,rr);gr.addColorStop(0,`rgba(74,66,52,${.14+r()*.26})`);gr.addColorStop(1,'rgba(74,66,52,0)');x.fillStyle=gr;x.fillRect(px-rr,py-rr,2*rr,2*rr)}
      for(let i=0;i<2600;i++){x.fillStyle=`rgba(128,116,96,${.2+r()*.5})`;x.beginPath();x.ellipse(r()*c.width,r()*c.height,.5+r()*1.8,.4+r()*1.1,r()*3,0,7);x.fill()}
      TX.mottle=c}
    // 色版的斑驳（spot 用）
    {const c=mk(512,512),x=c.getContext('2d'),r=R(29);for(let i=0;i<900;i++){x.fillStyle=r()<.6?`rgba(40,14,6,${.08+r()*.22})`:`rgba(255,236,210,${.08+r()*.18})`;x.beginPath();x.ellipse(r()*512,r()*512,.6+r()*2.6,.5+r()*1.6,r()*3,0,7);x.fill()}
      for(let i=0;i<14;i++){x.fillStyle=`rgba(40,14,6,${.05+r()*.06})`;x.fillRect(0,r()*512,512,6+r()*30)}TX.speck=c}
    return TX}

  addTheme('woodcut',{mode:'block',ink:CUT,dim:'rgba(236,227,205,.62)',note:'rgba(236,227,205,.86)',a1:VERM,a2:CUT,a3:'#8c8270',chip:'rgba(236,227,205,.10)',
    sub:'rgba(16,13,10,.88)',subInk:CUT,top:'#1b1712',bot:'#0f0d0a',card:'rgba(21,18,14,.94)',cardInk:CUT,pillInk:BLK,hl:'rgba(200,54,31,.45)',
    f:{t:'H9',b:'SongB',s:'SongB',h:'SongB',n:'RC'},
    bg(t){const T=tex();g.drawImage(this.mode==='paper'?T.paper:T.wood,0,0)}});
  PACK_INIT.push(async()=>{await document.fonts.load('48px SongB','风雪里的一盏灯');tex()});

  /* ---------- 形状小工具 ---------- */
  const shape={
    rect:(x,y,w,h)=>[[x,y],[x+w,y],[x+w,y+h],[x,y+h]],
    ellipse:(cx,cy,rx,ry,n=40)=>Array.from({length:n},(_,i)=>[cx+Math.cos(i/n*2*Math.PI)*rx,cy+Math.sin(i/n*2*Math.PI)*(ry??rx)]),
    inside:(p,region)=>{let c=false;for(const poly of polys(region))if(inPoly(p,poly))c=!c;return c}};
  const polys=r=>Array.isArray(r[0][0])?r:[r];
  function inPoly(p,poly){let c=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if(((a[1]>p[1])!==(b[1]>p[1]))&&(p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0]))c=!c}return c}
  function pathOf(X,region){X.beginPath();for(const poly of polys(region)){poly.forEach((p,i)=>i?X.lineTo(p[0],p[1]):X.moveTo(p[0],p[1]));X.closePath()}}
  function solid(region,col){P.save();P.fillStyle=col||BLK;pathOf(P,region);P.fill('evenodd');P.restore()}

  /* ---------- 刀痕的内核 ---------- */
  // 圆滑并按 5px 重采样
  function dense(pts,smooth=true){let D=pts;if(smooth&&pts.length>2){D=[];const n=pts.length;for(let i=0;i<n-1;i++){const a=pts[Math.max(0,i-1)],b=pts[i],c=pts[i+1],d=pts[Math.min(n-1,i+2)],m=Math.max(2,Math.ceil(Math.hypot(c[0]-b[0],c[1]-b[1])/6));
      for(let j=0;j<m;j++){const u=j/m,u2=u*u,u3=u2*u;D.push([0,1].map(k=>.5*(2*b[k]+(c[k]-a[k])*u+(2*a[k]-5*b[k]+4*c[k]-d[k])*u2+(3*b[k]-a[k]-3*c[k]+d[k])*u3)))}}D.push(pts[n-1])}
    const out=[D[0]];for(let i=1;i<D.length;i++){const a=out[out.length-1],b=D[i],l=Math.hypot(b[0]-a[0],b[1]-a[1]);if(l<5&&i<D.length-1)continue;if(l<=.01)continue;const m=Math.ceil(l/5);for(let j=1;j<=m;j++)out.push([lerp(a[0],b[0],j/m),lerp(a[1],b[1],j/m)])}return out}
  // 一道刀痕：预先算好中线、法向、两侧的半宽（两头尖、边缘毛）；画的时候只乘刀尖的收束
  function makeStroke(pts,w0,w1,seed,wm,smooth=true){const D=dense(pts,smooth),n=D.length,s=[0];for(let i=1;i<n;i++)s.push(s[i-1]+Math.hypot(D[i][0]-D[i-1][0],D[i][1]-D[i-1][1]));const L=s[n-1]||1,wx=Math.max(w0,w1);
    const ta=Math.min(L*.32,Math.max(10,wx*3)),tb=Math.min(L*.42,Math.max(14,wx*4.5)),X=[],Y=[],NX=[],NY=[],HL=[],HR=[];
    for(let i=0;i<n;i++){const a=D[Math.max(0,i-1)],b=D[Math.min(n-1,i+1)],dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy)||1;X.push(D[i][0]);Y.push(D[i][1]);NX.push(-dy/l);NY.push(dx/l);
      const env=Math.pow(cl(s[i]/ta),.6)*Math.pow(cl((L-s[i])/tb),.75),h=lerp(w0,w1,s[i]/L)/2*env*(1+.16*sn(s[i]/37,seed))*(wm?wm[Math.min(wm.length-1,i)]:1);
      HL.push(h*(1+.14*sn(s[i]/7,seed+3)+.06*sn(s[i]/2.3,seed+5)));HR.push(h*(1+.14*sn(s[i]/7,seed+11)+.06*sn(s[i]/2.1,seed+13)))}
    return {X,Y,NX,NY,HL,HR,s,L,tip:Math.max(8,wx*2.6),path:null}}
  function drawStroke(X,st,k,col){if(k<=0)return;X.fillStyle=col;
    if(k>=1){if(!st.path){const p=new Path2D(),n=st.X.length;p.moveTo(st.X[0]+st.NX[0]*st.HL[0],st.Y[0]+st.NY[0]*st.HL[0]);for(let i=1;i<n;i++)p.lineTo(st.X[i]+st.NX[i]*st.HL[i],st.Y[i]+st.NY[i]*st.HL[i]);for(let i=n-1;i>=0;i--)p.lineTo(st.X[i]-st.NX[i]*st.HR[i],st.Y[i]-st.NY[i]*st.HR[i]);p.closePath();st.path=p}X.fill(st.path);return}
    const end=k*st.L,L=[],Rr=[];let i=0;for(;i<st.X.length&&st.s[i]<=end;i++){const e=Math.pow(cl((end-st.s[i])/st.tip),.5);L.push([st.X[i]+st.NX[i]*st.HL[i]*e,st.Y[i]+st.NY[i]*st.HL[i]*e]);Rr.push([st.X[i]-st.NX[i]*st.HR[i]*e,st.Y[i]-st.NY[i]*st.HR[i]*e])}
    if(i<st.X.length&&i>0){const u=(end-st.s[i-1])/(st.s[i]-st.s[i-1]);L.push([lerp(st.X[i-1],st.X[i],u),lerp(st.Y[i-1],st.Y[i],u)])}
    if(L.length<2)return;X.beginPath();L.forEach((p,j)=>j?X.lineTo(p[0],p[1]):X.moveTo(p[0],p[1]));for(let j=Rr.length-1;j>=0;j--)X.lineTo(Rr[j][0],Rr[j][1]);X.closePath();X.fill()}
  const SC=new Map();function cache(key,make){let v=SC.get(key);if(!v){if(SC.size>3000)SC.clear();v=make();SC.set(key,v)}return v}
  const knife=x=>1-Math.pow(1-cl(x),1.7);

  function gouge(t,t0,dur,pts,o={}){const te=t0+dur;if(t<t0)return te;const w0=o.w0??10,w1=o.w1??w0*.6,key=pts.map(p=>p[0].toFixed(1)+','+p[1].toFixed(1)).join(';'),sd=o.seed??hashS(key)%977;
    const sm=o.smooth!==false,st=cache('g|'+key+'|'+w0+'|'+w1+'|'+sd+'|'+sm,()=>makeStroke(pts,w0,w1,sd,null,sm));drawStroke(P,st,(o.ease||knife)(seg(t,t0,te)),o.col||CUT);return te}

  function carveStrokes(region,o){const PS=polys(region),all=PS.flat(),xs=all.map(p=>p[0]),ys=all.map(p=>p[1]),cx=(Math.min(...xs)+Math.max(...xs))/2,cy=(Math.min(...ys)+Math.max(...ys))/2;
    const a=(o.angle||0)*Math.PI/180,dx=Math.cos(a),dy=Math.sin(a),nx=-dy,ny=dx,gap=o.gap||16,w=o.w??gap*.55,jit=o.jit??.3,sd=o.seed??3,r=R(sd+101),mx=o.max??560;
    let d0=1e9,d1=-1e9,n0=1e9,n1=-1e9;for(const p of all){const u=(p[0]-cx)*dx+(p[1]-cy)*dy,v=(p[0]-cx)*nx+(p[1]-cy)*ny;d0=Math.min(d0,u);d1=Math.max(d1,u);n0=Math.min(n0,v);n1=Math.max(n1,v)}
    const inside=p=>{let c=false;for(const q of PS)if(inPoly(p,q))c=!c;return c},out=[];let li=0;
    for(let v=n0+gap*(.3+.4*r());v<n1;v+=gap*(1+jit*(r()-.5)),li++){const line=[];
      if(typeof o.flow==='function'){// 方向场：起点排在穿过区域中心、垂直于 angle 的线上，从起点往前、往后各追一段
        const s0=[cx+nx*v,cy+ny*v],steps=Math.ceil((d1-d0+60)/6*1.3),tr=sg=>{const q=[];let p=s0;for(let k=0;k<steps;k++){const an=o.flow(p[0],p[1])*Math.PI/180;p=[p[0]+sg*Math.cos(an)*6,p[1]+sg*Math.sin(an)*6];q.push(p)}return q};line.push(...tr(-1).reverse(),s0,...tr(1))}
      else{const bow=o.flow||0;for(let u=d0-30;u<=d1+30;u+=6){const b=bow*Math.sin(Math.PI*cl((u-d0)/(d1-d0||1))),wv=jit*gap*.35*sn(u/110,sd+li*3);line.push([cx+dx*u+nx*(v+b+wv),cy+dy*u+ny*(v+b+wv)])}}
      // 切成落在区域里、且 tone 够亮的几段
      let run=[],tv=[];const flush=()=>{if(run.length>2){let s=0;for(let i=1;i<run.length;i++)s+=Math.hypot(run[i][0]-run[i-1][0],run[i][1]-run[i-1][1]);
          if(s>=gap*1.4){// 太长的分成几刀
            const pieces=Math.max(1,Math.round(s/(mx*(.75+.5*r()))));const per=Math.ceil(run.length/pieces);for(let q=0;q<pieces;q++){const a0=q*per,a1=Math.min(run.length,(q+1)*per+1);if(a1-a0>2)out.push({pts:run.slice(a0,a1),wm:tv.slice(a0,a1),w:w*(.72+.56*r()),sd:Math.floor(r()*900)})}}}run=[];tv=[]};
      for(const p of line){const tn=o.tone?cl(o.tone(p[0],p[1])):1;if(inside(p)&&tn>.06){run.push(p);tv.push(Math.pow(tn,.8))}else flush()}flush()}
    out.forEach(s=>{s.st=makeStroke(s.pts,s.w,s.w*.8,s.sd,s.wm,false);s.mx=s.pts.reduce((m,p)=>[m[0]+p[0]/s.pts.length,m[1]+p[1]/s.pts.length],[0,0])});
    if(o.order==='rand'){const rr=R(sd+7);out.forEach(s=>s.k=rr());out.sort((a,b)=>a.k-b.k)}else if(Array.isArray(o.order)){const [ox,oy]=o.order;out.sort((a,b)=>Math.hypot(a.mx[0]-ox,a.mx[1]-oy)-Math.hypot(b.mx[0]-ox,b.mx[1]-oy))}
    return out}
  function carve(t,t0,dur,region,o={}){const te=t0+dur;if(t<t0)return te;const key='c|'+polys(region).map(q=>q.map(p=>p[0].toFixed(0)+','+p[1].toFixed(0)).join(';')).join('/')+'|'+[o.angle,o.gap,o.w,typeof o.flow==='number'?o.flow:'f',o.jit,o.max,String(o.order),o.seed,o.key].join(',');
    const S=cache(key,()=>carveStrokes(region,o)),n=S.length;if(!n)return te;const ds=o.ds??cl(dur*.3,.12,.5),col=o.col||CUT;
    for(let i=0;i<n;i++){const st=t0+(dur-ds)*(n>1?i/(n-1):0);if(t<st)break;drawStroke(P,S[i].st,knife(seg(t,st,st+ds)),col)}return te}

  /* ---------- 唯一的颜色 ---------- */
  const PAT=new WeakMap();
  function spot(t,t0,region,o={}){const d=o.d??.3,k=seg(t,t0,t0+d);if(k<=0)return t0+d;sfx('tick',t0,.4);if(Array.isArray(region)&&typeof region[0]==='number')region=shape.rect(...region);
    const all=polys(region).flat(),x0=Math.min(...all.map(p=>p[0])),x1=Math.max(...all.map(p=>p[0])),y0=Math.min(...all.map(p=>p[1])),y1=Math.max(...all.map(p=>p[1])),sh=o.shift||[3,-2],sd=o.seed??7;
    P.save();P.translate(sh[0],sh[1]);pathOf(P,region);P.clip('evenodd');
    if(k<1){const ex=lerp(x0-12,x1+16,eo(k));P.beginPath();P.moveTo(x0-20,y0-20);for(let y=y0-20;y<=y1+20;y+=10)P.lineTo(ex+8*sn(y/14,sd),y);P.lineTo(x0-20,y1+20);P.closePath();P.clip()}
    P.fillStyle=o.col||TH.a1;P.fillRect(x0-20,y0-20,x1-x0+40,y1-y0+40);
    let pt=PAT.get(P);if(!pt){pt=P.createPattern(tex().speck,'repeat');PAT.set(P,pt)}P.translate(-rnd(sd)*300,-rnd(sd+1)*300);P.fillStyle=pt;P.fillRect(x0-20+rnd(sd)*300,y0-20+rnd(sd+1)*300,x1-x0+40,y1-y0+40);P.restore();return t0+d}

  /* ---------- 刻字 ---------- */
  const TC=new Map();
  function glyphs(s,sz,font,col){const key=[s,sz,font,col].join('|');let c=TC.get(key);if(c)return c;
    const f=`${sz}px ${font}, H7`,m=mk(4,4).getContext('2d');m.font=f;const wd=Math.ceil(m.measureText(s).width),pad=Math.ceil(sz*.22),base=Math.round(sz*1.08),cw=wd+pad*2,chh=Math.ceil(sz*1.42);
    const cv2=mk(cw,chh),x=cv2.getContext('2d'),r=R(hashS(key));x.font=f;x.fillStyle=col;x.textBaseline='alphabetic';x.fillText(s,pad,base);
    x.globalCompositeOperation='destination-out';x.lineCap='round';
    // 刀纹：斜向的细槽，很淡
    const st=Math.max(5,sz*.085);x.lineWidth=Math.max(1,sz*.012);for(let i=-chh;i<cw;i+=st*(.7+.6*r())){x.strokeStyle=`rgba(0,0,0,${.12+r()*.16})`;x.beginPath();x.moveTo(i,chh);x.lineTo(i+chh*.45,0);x.stroke()}
    // 崩口：细长的小刀口，顺着下刀方向
    const nch=Math.round(cw*chh/(sz*sz)*9);for(let i=0;i<nch;i++){const px=r()*cw,py=r()*chh,q=sz*(.008+r()*.016),a=-1.15+(r()-.5)*.5,l=q*(3+r()*3);x.fillStyle='rgba(0,0,0,.95)';x.beginPath();x.moveTo(px-Math.cos(a)*l,py-Math.sin(a)*l);x.quadraticCurveTo(px-Math.sin(a)*q,py+Math.cos(a)*q,px+Math.cos(a)*l,py+Math.sin(a)*l);x.quadraticCurveTo(px+Math.sin(a)*q*.4,py-Math.cos(a)*q*.4,px-Math.cos(a)*l,py-Math.sin(a)*l);x.fill()}
    c={cv:cv2,pad,base,w:wd};if(TC.size>200)TC.clear();TC.set(key,c);return c}
  function title(t,t0,s,x,y,sz,o={}){s=String(s);const font=o.font||TH.f.t,col=o.col||CUT,al=o.al||'left',dur=o.dur??Math.min(1.1,.3+s.length*.09),te=t0+dur;if(t<t0)return te;sfx('tick',t0,.4);
    g.save();g.font=`${sz}px ${font}, H7`;if(REC)recText(s,x,y,sz,al);g.restore();
    const G=glyphs(s,sz,font,col),x0=(al==='center'?x-G.w/2:al==='right'?x-G.w:x)-G.pad,y0=y-G.base,k=seg(t,t0,te);
    if(k>=1){g.drawImage(G.cv,x0,y0);return te}
    const cw=G.cv.width,hh=G.cv.height,sl=hh*.42,bw=Math.max(8,sz*.36),first=-Math.ceil(sl/bw),n=Math.ceil(cw/bw),tot=n-first;g.save();g.beginPath();
    for(let i=first;i<n;i++){const ki=seg(k,(i-first)/tot*.72,(i-first)/tot*.72+.28);if(ki<=0)continue;const bx=x0+i*bw,h=hh*knife(ki),sh=sl*h/hh;g.moveTo(bx+sl,y0);g.lineTo(bx+bw+sl+1,y0);g.lineTo(bx+bw+sl+1-sh,y0+h);g.lineTo(bx+sl-sh,y0+h);g.closePath()}
    g.clip();g.drawImage(G.cv,x0,y0);g.restore();return te}

  /* ---------- 风雪 ---------- */
  function rain(t,t0,o={}){if(t<t0)return;const n=o.n??140,an=(o.angle??155)*Math.PI/180,sp=o.speed??240,A=o.area||{x:0,y:0,w:W,h:H},keep=o.keep||[],sd=o.seed??7,fps=o.fps??12,len=o.len||[10,34],wd=o.w||[2,5];
    const tq=fps?Math.floor(t*fps+1e-6)/fps:t,grow=cl((t-t0)/(o.d??.8)),dx=Math.cos(an),dy=Math.sin(an),md=(v,m)=>((v%m)+m)%m;
    P.save();P.fillStyle=o.col||CUT;P.beginPath();
    for(let i=0;i<n;i++){if(rnd(sd*31+i*7.3)>grow)continue;const v=sp*(.6+.8*rnd(i*3.1+sd*13)),L=lerp(len[0],len[1],Math.pow(rnd(i*1.7+sd),1.6)),w=lerp(wd[0],wd[1],rnd(i*2.9+sd*5)),sw=8*Math.sin(tq*1.7+i);
      const px=A.x+md(rnd(i*2.3+sd)*A.w+dx*v*tq-dy*sw,A.w),py=A.y+md(rnd(i*5.7+sd+1)*A.h+dy*v*tq+dx*sw,A.h);
      if(keep.some(([kx,ky,kw,kh])=>px>kx-L&&px<kx+kw+L&&py>ky-L&&py<ky+kh+L))continue;
      const hx=dx*L/2,hy=dy*L/2,nx=-dy*w/2,ny=dx*w/2;P.moveTo(px-hx,py-hy);P.quadraticCurveTo(px+nx*1.5,py+ny*1.5,px+hx,py+hy);P.quadraticCurveTo(px-nx*.6,py-ny*.6,px-hx,py-hy);P.closePath()}
    P.fill();P.restore()}

  /* ---------- 印一张 ---------- */
  function roughRect(X,x,y,w,h,sd){const r=R(sd+51),pts=[],j=()=>(r()-.5)*3+(r()<.06?(r()-.5)*7:0);for(let u=0;u<w;u+=28)pts.push([x+u,y+j()]);for(let u=0;u<h;u+=28)pts.push([x+w+j(),y+u]);for(let u=w;u>0;u-=28)pts.push([x+u,y+h+j()]);for(let u=h;u>0;u-=28)pts.push([x+j(),y+u]);
    X.beginPath();pts.forEach((p,i)=>i?X.lineTo(p[0],p[1]):X.moveTo(p[0],p[1]));X.closePath()}
  function print(t,t0,fn,o={}){if(t<t0||(o.t1!=null&&t>=o.t1))return;const T=tex(),mode=o.mode||TH.mode||'block',s=o.seed??(Math.round(t0*10)+3),sh=o.shift??4;sfx('thud',t0,.5);
    const dx=(rnd(s+3)-.5)*2*sh,dy=(rnd(s+5)-.5)*2*sh,rot=(rnd(s+7)-.5)*(o.rot??.005),ox=-Math.floor(rnd(s+11)*290),oy=-Math.floor(rnd(s+13)*230);
    g.save();
    if(mode==='paper'){g.drawImage(T.paper,0,0);const m=o.margin??40;g.translate(W/2+dx,H/2+dy);g.rotate(rot);g.translate(-W/2,-H/2);roughRect(g,m,m,W-2*m,H-2*m,s);g.fillStyle=BLK;g.fill();g.clip();
      g.save();fn();g.restore();g.setTransform(1,0,0,1,0,0);g.globalCompositeOperation='lighten';g.drawImage(T.mottle,ox,oy);g.restore();
      g.save();g.globalCompositeOperation='multiply';g.drawImage(T.fiber,ox,oy);g.restore()}
    else{g.drawImage(T.wood,0,0);g.save();fn();g.restore();g.setTransform(1,0,0,1,0,0);g.globalCompositeOperation='lighten';g.drawImage(T.wood,0,0);g.globalCompositeOperation='multiply';g.drawImage(T.grain,ox,oy);g.restore()}}

  return {print,gouge,carve,spot,title,rain,solid,on,shape,BLK,CUT};
})();
