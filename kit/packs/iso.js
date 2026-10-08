/* 风格包 · 等距沙盘 —— 本项目自己实现
   一块等距投影的小沙盘：投影角度全片固定，永不旋转（镜头只许平移和推拉）。房子、机器、货物都是三面体色块：顶面最亮、左面中、右面最暗。
   用在：系统、供应链、厂区/园区全景、生产流程的总览。
   规则：东西不凭空移动——先有路线/传送带，物体沿着它走；实体靠运动进场（升起来、开进来、搭起来、落下来），不靠淡入；
        建筑可以剖开（屋顶升起、前墙降下）露出里面；数量用小箱子一个个堆出来。
   主题名 iso（浅色）：暖白桌面 + 极淡的等距网格。沙盘坐标：x 朝右下、y 朝左下、z 朝上，单位是“格”。
   所有实体函数都**不直接画**，而是返回一个“件”（带包围盒），交给 scene([...]) 按遮挡关系排序后一起画；标签 tag 直接画，写在 scene 之后。
   用法：
     stage(t, {x,y,z,s,sx,sy} 或 {cx,cy,s}, fn)   设定镜头再执行 fn：沙盘上的点 (x,y,z) 落在屏幕 (sx,sy)，每格 s 像素；或直接给原点 cx,cy。t 是全片时间（带 t0 的实体靠它进场）
     cam(a, b, k)                                 两个镜头之间插值（位置线性、比例按对数），k 自己套缓动
     P(x, y, z=0) → [屏幕x, 屏幕y]                当前镜头下的投影
     scene(items)                                 把件（可以嵌套数组、可以有 null）按遮挡关系排序后画出来；地面上的影子自动加
     ground(x, y, w, d, {col, thick, grid, t0})   沙盘底座：一块有厚度的板，顶面带格线；t0 从下面升上来
     block(x, y, z, w, d, h, {col, t0, dur, top, deco(h), shadow}) 三面体方块；t0 从地里升起来（高度从 0 长到 h）；top 换顶面色；deco 在画完后补细节
     house(x, y, w, d, h, {col, roofCol, roof:'flat'|'gable'|'none', ridge:'x'|'y', t0, open, lift, inside:[件…], door:{face:'l'|'r',u,w,h}, wins:{l:n,r:n}})
         一座房子。open 0→1：屋顶先升起（升到 lift 格高，四角带虚线），前面两堵墙再降成矮墙，露出 inside 里的件（坐标仍是沙盘坐标）
     tree(x, y, {s, col, t0})                     小树（树干 + 两层方块），t0 长出来
     crate(x, y, z, s, {col, tape})               一只小货箱，(x,y) 是底面中心，s 是边长
     route([[x,y,z?],…]) → {len, at(d), d(i)}     一条折线路线；at(距离) → {x,y,z,dx,dy}；d(i) 是第 i 个拐点的距离
     road(t, R, {wid, col, t0, dur, dash})        把路线画成一条路（贴地），t0 起沿路线铺出去
     mover(t, R, [[时刻,距离],…] 或 {t0,speed,d0,d1}, pos=>件, {enter, exit, ease})
         沿路线走的东西：按关键帧在路线上取位置，把 pos 交给你画（返回一个件，比如 truck(pos) 或 crate(pos.x,pos.y,pos.z,.3)）；
         enter:true 第一个时刻之前不出现，exit:true 最后一个时刻之后消失；返回的件带 .pos
     truck(pos, {col, load, loadCols, s, k})      小货车，车头朝 pos 的前进方向；load 是车斗里的箱子数（0–3），或三个位置的颜色数组（null 表示空着）；k 是落地进场的进度
     slot(pos, i, s=1) → [x,y,z]                  车停在 pos 时，车斗第 i 个位置（0 后、1 前、2 叠在上面）的沙盘坐标：让货箱的路线正好接到车上
     belt(t, x, y, z, len, {axis:'x'|'y', wid, h, speed, col, k})   传送带：从 (x,y) 起沿 axis 方向长 len（x,y 是带子起点的中线），带面条纹按 speed 格/秒移动（负数反向）；k 是搭出来的进度
     stack(t, t0, n, x, y, {cols, rows, size, gap, rate, z, col, palette}) → 件的数组，另带 .count（已落下几只）
         从 (x,y) 角起，每层 cols×rows，一只只落下来堆出 n 只
     tag(t, t0, '文字', x, y, z, {up, sz, col, fill, t1})   立在沙盘某一点上的标签：一根竖直引线 + 一块牌子；写在 scene 之后、stage 之内
     on(ctx, fn)                                  把件画到别的画布上（封面 art 里用；tag 带文字，只能画在主画布）
     PAL  这套风格的色板；mix(色a, 色b, k) 混色；tri(色) → {top,left,right} 一个底色出三个面
   注意：house 的 inside 只和同一座房子里的件互相排序；穿过墙的东西（比如货箱进门）按位置在 inside 和外面之间切换。 */
window.PACK=window.PACK||{};window.PACK_INIT=window.PACK_INIT||[];
PACK.iso=(function(){
const CA=.8660254,SA=.5;
const PAL={bg0:'#f4f0e7',bg1:'#e5dfd1',ink:'#22303c',deep:'#1b2a3a',board:'#dfe7d6',boardSide:'#b9c4ae',road:'#8f9ba6',steel:'#9aa7b1',rubber:'#3a4651',
  coral:'#e8553d',teal:'#1f9d8b',mustard:'#f0b23a',blue:'#3f73b8',kraft:'#d7a468',leaf:'#57a85e',trunk:'#8a6748',cream:'#f1e9d8',white:'#ffffff'};
let G=g,CX=960,CY=300,S=60,NOW=0,GCLIP=[];

/* ---------- 颜色：一个底色出三个面 ---------- */
const _rgb=new Map(),_tri=new Map();
function rgb(c){if(Array.isArray(c))return c;let v=_rgb.get(c);if(v)return v;if(/^rgba?\(/.test(c)){v=c.replace(/[^\d.,]/g,'').split(',').slice(0,3).map(Number);_rgb.set(c,v);return v}let h=String(c).replace('#','');if(h.length===3)h=h.split('').map(x=>x+x).join('');const n=parseInt(h,16);v=[(n>>16)&255,(n>>8)&255,n&255];_rgb.set(c,v);return v}
function mix(a,b,k){a=rgb(a);b=rgb(b);return`rgb(${Math.round(a[0]+(b[0]-a[0])*k)},${Math.round(a[1]+(b[1]-a[1])*k)},${Math.round(a[2]+(b[2]-a[2])*k)})`}
function tri(col){let v=_tri.get(col);if(!v){v={top:mix(col,'#ffffff',.3),left:mix(col,'#ffffff',0),right:mix(col,PAL.deep,.27)};_tri.set(col,v)}return v}

/* ---------- 投影与镜头 ---------- */
function P(x,y,z=0){return[CX+(x-y)*S*CA,CY+(x+y)*S*SA-z*S]}
function solve(c){if(c.cx!=null)return{cx:c.cx,cy:c.cy,s:c.s};const s=c.s||60,x=c.x||0,y=c.y||0,z=c.z||0;return{cx:(c.sx??W/2)-(x-y)*s*CA,cy:(c.sy??H/2)-(x+y)*s*SA+z*s,s}}
function cam(a,b,k){const o={};for(const f of['x','y','z','sx','sy'])o[f]=lerp(a[f]??(f==='sx'?W/2:f==='sy'?H/2:0),b[f]??(f==='sx'?W/2:f==='sy'?H/2:0),k);o.s=Math.exp(lerp(Math.log(a.s||60),Math.log(b.s||60),k));return o}
function stage(t,c,fn){const sv=[CX,CY,S,NOW,GCLIP];const q=solve(c);CX=q.cx;CY=q.cy;S=q.s;NOW=t;GCLIP=[];G.save();try{fn()}finally{G.restore();[CX,CY,S,NOW,GCLIP]=sv}}
function on(ctx,fn){const o=G;G=ctx;try{fn()}finally{G=o}}

/* ---------- 画面 ---------- */
function path(pts){G.beginPath();for(let i=0;i<pts.length;i++){const q=P(pts[i][0],pts[i][1],pts[i][2]||0);i?G.lineTo(q[0],q[1]):G.moveTo(q[0],q[1])}G.closePath()}
function poly(pts,col,seam=true){path(pts);G.fillStyle=col;G.fill();if(seam){G.strokeStyle=col;G.lineWidth=1;G.lineJoin='round';G.stroke()}}
function faces(x,y,z,w,d,h,c,topCol){
  poly([[x,y+d,z],[x+w,y+d,z],[x+w,y+d,z+h],[x,y+d,z+h]],c.left);
  poly([[x+w,y,z],[x+w,y+d,z],[x+w,y+d,z+h],[x+w,y,z+h]],c.right);
  poly([[x,y,z+h],[x+w,y,z+h],[x+w,y+d,z+h],[x,y+d,z+h]],topCol||c.top)}
function item(x,y,z,w,d,h,draw,sh=true){return{x0:x,x1:x+w,y0:y,y1:y+d,z0:z,z1:z+h,draw,sh}}
const riseK=(t0,dur=.6)=>{if(t0==null)return 1;const q=seg(NOW,t0,t0+(dur||.6));return q<=0?0:back(q)};

/* ---------- 排序：谁挡谁 ----------
   两个盒子若被一个轴向平面隔开，靠后（x 小 / y 小 / z 低）的那个先画；两个方向都隔得开说明屏幕上不相交，随便。 */
function order(L){const n=L.length,e=1e-4,key=a=>a.x0+a.x1+a.y0+a.y1+(a.z0+a.z1)*.02,beh=(a,b)=>a.x1<=b.x0+e||a.y1<=b.y0+e||a.z1<=b.z0+e;
  const out=[],deg=new Array(n).fill(0),adj=L.map(()=>[]),K=L.map(key);
  for(let i=0;i<n;i++)for(let j=i+1;j<n;j++){const ab=beh(L[i],L[j]),ba=beh(L[j],L[i]);if(ab&&!ba){adj[i].push(j);deg[j]++}else if(ba&&!ab){adj[j].push(i);deg[i]++}}
  const done=new Array(n).fill(false);
  for(let c=0;c<n;c++){let b=-1,bf=-1;for(let i=0;i<n;i++){if(done[i])continue;if(deg[i]<=0){if(b<0||K[i]<K[b])b=i}if(bf<0||K[i]<K[bf])bf=i}if(b<0)b=bf;done[b]=true;out.push(L[b]);for(const j of adj[b])deg[j]--}
  return out}
function flat(a,o=[]){for(const x of a){if(!x)continue;if(Array.isArray(x))flat(x,o);else o.push(x)}return o}
function sortDraw(items){for(const it of order(flat(items||[])))it.draw()}
function shadowOf(it){const a=Math.min(.9,it.z1*.4);if(a<=.02)return;const x=it.x0,y=it.y0,w=it.x1-x,d=it.y1-y;path([[x,y+d],[x+w,y+d],[x+w+a,y+d-a],[x+w+a,y-a],[x+a,y-a],[x,y]]);G.fill()}
function scene(items){const L=order(flat(items));let shadowed=false;
  const shadows=()=>{shadowed=true;const C=GCLIP;G.save();if(C.length){G.beginPath();for(const c of C){const p=[[c[0],c[1]],[c[0]+c[2],c[1]],[c[0]+c[2],c[1]+c[3]],[c[0],c[1]+c[3]]].map(q=>P(q[0],q[1],c[4]));G.moveTo(p[0][0],p[0][1]);for(let i=1;i<4;i++)G.lineTo(p[i][0],p[i][1]);G.closePath()}G.clip()}
    G.fillStyle='rgba(27,42,58,.13)';for(const it of L)if(it.sh&&it.z1>.02&&it.z0<.6)shadowOf(it);G.restore()};
  for(const it of L){if(!shadowed&&it.z1>.02)shadows();it.draw()}}

/* ---------- 底座、方块 ---------- */
function ground(x,y,w,d,o={}){const th=o.thick??.35,col=o.col||PAL.board,gs=o.grid??1,k=o.t0==null?1:eo(seg(NOW,o.t0,o.t0+.7));const dz=-(1-k)*4;
  return item(x,y,-th,w,d,th,()=>{const c={top:col,left:o.side||PAL.boardSide,right:mix(o.side||PAL.boardSide,PAL.deep,.2)};
    G.save();G.fillStyle='rgba(27,42,58,.10)';const off=.55;path([[x+off,y+d+off,-th],[x+w+off,y+d+off,-th],[x+w+off,y+off,-th],[x+w,y,-th],[x,y+d,-th]]);G.fill();G.restore();
    faces(x,y,-th+dz,w,d,th,c);
    if(gs>0){G.save();G.strokeStyle=mix(col,PAL.deep,.1);G.lineWidth=1.5;G.beginPath();for(let i=gs;i<w-1e-6;i+=gs){const a=P(x+i,y,dz),b=P(x+i,y+d,dz);G.moveTo(a[0],a[1]);G.lineTo(b[0],b[1])}for(let j=gs;j<d-1e-6;j+=gs){const a=P(x,y+j,dz),b=P(x+w,y+j,dz);G.moveTo(a[0],a[1]);G.lineTo(b[0],b[1])}G.stroke();G.restore()}
    GCLIP.push([x,y,w,d,dz])},false)}
function block(x,y,z,w,d,h,o={}){const k=riseK(o.t0,o.dur);if(k<=0)return null;const hh=h*k,col=o.col||TH.a2;
  return item(x,y,z,w,d,hh,()=>{faces(x,y,z,w,d,hh,tri(col),o.top);if(o.deco)o.deco(hh)},o.shadow!==false)}
function crate(x,y,z,s,o={}){const col=o.col||PAL.kraft,h=s*.5;
  return item(x-h,y-h,z,s,s,s,()=>{const c=tri(col);faces(x-h,y-h,z,s,s,s,c);
    if(o.tape!==false){const tp=mix(col,'#ffffff',.62),a=s*.09;poly([[x-a,y-h,z+s],[x+a,y-h,z+s],[x+a,y+h,z+s],[x-a,y+h,z+s]],tp,false);poly([[x-a,y+h,z+s*.55],[x+a,y+h,z+s*.55],[x+a,y+h,z+s],[x-a,y+h,z+s]],mix(col,'#ffffff',.38),false)}},o.shadow!==false)}
function tree(x,y,o={}){const s=o.s||1,k=riseK(o.t0,.5);if(k<=0)return null;const col=o.col||PAL.leaf,a=.36*s;
  return item(x-a,y-a,0,2*a,2*a,1.25*s*k,()=>{const tk=.09*s;faces(x-tk,y-tk,0,2*tk,2*tk,.4*s*k,tri(PAL.trunk));
    faces(x-a,y-a,.38*s*k,2*a,2*a,.46*s*k,tri(col));const b=a*.6;faces(x-b,y-b,.84*s*k,2*b,2*b,.38*s*k,tri(mix(col,'#ffffff',.12)))})}

/* ---------- 房子：会剖开 ---------- */
function house(x,y,w,d,h,o={}){const k=riseK(o.t0);if(k<=0)return null;
  const col=o.col||TH.a2,rcol=o.roofCol||mix(col,PAL.deep,.22),op=cl(o.open||0),k1=eio(seg(op,0,.6)),k2=eio(seg(op,.42,1));
  const Hh=h*k,sink=Hh*.82*k2,hw=Hh-sink,lift=(o.lift??(w+d)/2+.4)*k1,rt=o.roof||'flat',ov=o.over??.12,th=.12,rh=rt==='gable'?(o.rh??(o.ridge==='y'?w:d)*.36)*k:rt==='none'?0:.16*k;
  return item(x,y,0,w,d,Hh+lift+rh,()=>{const c=tri(col),ic=tri(o.inCol||PAL.cream);
    if(op>0){
      poly([[x+th,y+th],[x+w,y+th],[x+w,y+d],[x+th,y+d]],o.floor||'#d8d0c0');
      poly([[x+th,y+th,0],[x+w,y+th,0],[x+w,y+th,Hh],[x+th,y+th,Hh]],ic.left);
      poly([[x+th,y+th,0],[x+th,y+d,0],[x+th,y+d,Hh],[x+th,y+th,Hh]],ic.right);
      poly([[x,y,Hh],[x+w,y,Hh],[x+w,y+th,Hh],[x+th,y+th,Hh],[x+th,y+d,Hh],[x,y+d,Hh]],c.top);
      if(sink>0){poly([[x+w,y,hw],[x+w,y+th,hw],[x+w,y+th,Hh],[x+w,y,Hh]],c.right);poly([[x,y+d,hw],[x+th,y+d,hw],[x+th,y+d,Hh],[x,y+d,Hh]],c.left)}
      sortDraw(o.inside)}
    // 前面两堵墙（剖开时往地里降）
    poly([[x,y+d,0],[x+w,y+d,0],[x+w,y+d,hw],[x,y+d,hw]],c.left);poly([[x+w,y,0],[x+w,y+d,0],[x+w,y+d,hw],[x+w,y,hw]],c.right);
    const onL=(u0,u1,z0,z1,cc)=>{z0=Math.max(0,z0*k-sink);z1=Math.max(0,z1*k-sink);if(z1-z0>.01)poly([[x+u0,y+d,z0],[x+u1,y+d,z0],[x+u1,y+d,z1],[x+u0,y+d,z1]],cc,false)};
    const onR=(u0,u1,z0,z1,cc)=>{z0=Math.max(0,z0*k-sink);z1=Math.max(0,z1*k-sink);if(z1-z0>.01)poly([[x+w,y+u0,z0],[x+w,y+u1,z0],[x+w,y+u1,z1],[x+w,y+u0,z1]],cc,false)};
    const D=o.door;if(D){const len=D.face==='r'?d:w,dw=D.w||.5,u=(D.u??.5)*len,dc=mix(col,PAL.deep,D.face==='r'?.62:.5);(D.face==='r'?onR:onL)(u-dw/2,u+dw/2,0,D.h||Math.min(.9,h*.6),dc)}
    const Wn=o.wins;if(Wn){const row=(n,len,fn,cc)=>{if(!n)return;const ww=Math.min(.42,len/(n*1.9)),gap=(len-n*ww)/(n+1);for(let i=0;i<n;i++){const u=gap+i*(ww+gap);if(D&&((D.face==='r')===(fn===onR))&&Math.abs(u+ww/2-(D.u??.5)*len)<ww/2+(D.w||.5)/2+.08)continue;fn(u,u+ww,h*.5,h*.5+Math.min(.42,h*.26),cc)}};
      row(Wn.l,w,onL,'#e4f3f3');row(Wn.r,d,onR,'#a9c8cf')}
    if(op>0)poly([[x,y+d,hw],[x+w,y+d,hw],[x+w,y,hw],[x+w-th,y,hw],[x+w-th,y+d-th,hw],[x,y+d-th,hw]],c.top);
    // 屋顶
    const zr=Hh+lift;
    if(lift>.03){G.save();G.strokeStyle='rgba(34,48,60,.38)';G.lineWidth=2;G.setLineDash([7,7]);G.beginPath();for(const [px,py,pz] of [[x,y+d,Hh],[x+w,y+d,hw],[x+w,y,Hh]]){const a=P(px,py,pz),b=P(px,py,zr);G.moveTo(a[0],a[1]);G.lineTo(b[0],b[1])}G.stroke();G.restore()}
    const X0=x-ov,Y0=y-ov,X1=x+w+ov,Y1=y+d+ov,rc=tri(rcol);
    if(rt==='flat')faces(X0,Y0,zr,X1-X0,Y1-Y0,rh,rc);
    else if(rt==='gable'){if(o.ridge==='y'){const xm=(X0+X1)/2;
        poly([[X0,Y0,zr],[xm,Y0,zr+rh],[xm,Y1,zr+rh],[X0,Y1,zr]],rc.top);poly([[X0,Y1,zr],[X1,Y1,zr],[xm,Y1,zr+rh]],c.left);poly([[X1,Y0,zr],[X1,Y1,zr],[xm,Y1,zr+rh],[xm,Y0,zr+rh]],mix(rcol,PAL.deep,.16))}
      else{const ym=(Y0+Y1)/2;
        poly([[X0,Y0,zr],[X1,Y0,zr],[X1,ym,zr+rh],[X0,ym,zr+rh]],rc.top);poly([[X1,Y0,zr],[X1,Y1,zr],[X1,ym,zr+rh]],c.right);poly([[X0,Y1,zr],[X1,Y1,zr],[X1,ym,zr+rh],[X0,ym,zr+rh]],mix(rcol,'#ffffff',.1))}}
  })}

/* ---------- 路线、路、沿路线走 ---------- */
function route(pts){const Q=pts.map(p=>[p[0],p[1],p[2]||0]),acc=[0];for(let i=1;i<Q.length;i++)acc.push(acc[i-1]+Math.hypot(Q[i][0]-Q[i-1][0],Q[i][1]-Q[i-1][1],Q[i][2]-Q[i-1][2]));
  const len=acc[acc.length-1];
  return{pts:Q,len,d:i=>acc[Math.max(0,Math.min(acc.length-1,i))],
    at(dd,rev=false){dd=cl(dd,0,len);let i=1;while(i<Q.length-1&&acc[i]<dd)i++;const a=Q[i-1],b=Q[i],L=acc[i]-acc[i-1]||1,k=(dd-acc[i-1])/L,hx=b[0]-a[0],hy=b[1]-a[1],hl=Math.hypot(hx,hy)||1,sg=rev?-1:1;
      return{x:lerp(a[0],b[0],k),y:lerp(a[1],b[1],k),z:lerp(a[2],b[2],k),dx:sg*hx/hl,dy:sg*hy/hl,i:i-1,d:dd}}}}
function road(t,R,o={}){const wid=(o.wid??.9)/2,col=o.col||PAL.road,k=o.t0==null?1:eio(seg(t,o.t0,o.t0+(o.dur||1.2)));if(k<=0)return null;const end=R.len*k,Q=R.pts;
  let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;for(const p of Q){x0=Math.min(x0,p[0]-wid);x1=Math.max(x1,p[0]+wid);y0=Math.min(y0,p[1]-wid);y1=Math.max(y1,p[1]+wid)}
  return item(x0,y0,0,x1-x0,y1-y0,0,()=>{
    for(let i=1;i<Q.length;i++){const da=R.d(i-1);if(da>=end)break;const a=Q[i-1],e=R.at(Math.min(end,R.d(i))),ux=e.dx,uy=e.dy,nx=-uy*wid,ny=ux*wid,ex=i<Q.length-1&&R.d(i)<=end?ux*wid:0,ey=i<Q.length-1&&R.d(i)<=end?uy*wid:0;
      poly([[a[0]+nx,a[1]+ny],[e.x+ex+nx,e.y+ey+ny],[e.x+ex-nx,e.y+ey-ny],[a[0]-nx,a[1]-ny]],col)}
    if(o.dash!==false){G.save();G.strokeStyle='rgba(255,255,255,.85)';G.lineWidth=Math.max(2,S*.05);G.setLineDash([S*.28,S*.24]);G.beginPath();const p0=P(Q[0][0],Q[0][1]);G.moveTo(p0[0],p0[1]);for(let i=1;i<Q.length;i++){const e=R.at(Math.min(end,R.d(i))),q=P(e.x,e.y);G.lineTo(q[0],q[1]);if(R.d(i)>=end)break}G.stroke();G.restore()}},false)}
function mover(t,R,keys,fn,o={}){if(!Array.isArray(keys)){const d0=keys.d0||0,d1=keys.d1??R.len,t0=keys.t0||0;keys=[[t0,d0],[t0+Math.abs(d1-d0)/(keys.speed||2),d1]]}
  const n=keys.length;if(o.enter&&t<keys[0][0])return null;if(o.exit&&t>keys[n-1][0])return null;
  let dd=keys[0][1],rev=false,i=0;if(t>=keys[n-1][0]){dd=keys[n-1][1];i=n-2}else if(t>keys[0][0]){while(i<n-2&&t>=keys[i+1][0])i++;const a=keys[i],b=keys[i+1];let u=seg(t,a[0],b[0]);if(o.ease!=='lin')u=u*u*(3-2*u);dd=lerp(a[1],b[1],u)}
  // 朝向：看当前（或最近一段有位移的）关键帧往哪边走
  let j=Math.max(0,Math.min(n-2,i));while(j>0&&keys[j+1][1]===keys[j][1])j--;if(n>1&&keys[j+1][1]===keys[j][1]){j=i;while(j<n-2&&keys[j+1][1]===keys[j][1])j++}if(n>1)rev=keys[j+1][1]<keys[j][1];
  const pos=R.at(dd,rev);pos.moving=n>1&&t>keys[0][0]&&t<keys[n-1][0]&&keys[Math.min(i,n-2)+1][1]!==keys[Math.min(i,n-2)][1];const it=fn(pos);if(it&&!Array.isArray(it))it.pos=pos;return it}

/* ---------- 小货车 ---------- */
const TRUCK_SLOTS=[[-.44,.3],[-.14,.3],[-.29,.57]];   // 车斗三个位置：[离车中心的前后距离, 高度]（单位按车的大小 s 缩放）
function slot(p,i,s=1){const sl=TRUCK_SLOTS[i],ax=Math.abs(p.dx)>=Math.abs(p.dy),sg=(ax?p.dx:p.dy)>=0?1:-1;return ax?[p.x+sg*sl[0]*s,p.y,(p.z||0)+sl[1]*s]:[p.x,p.y+sg*sl[0]*s,(p.z||0)+sl[1]*s]}
function truck(p,o={}){const k=o.k==null?1:cl(o.k),s=(o.s||1),col=o.col||TH.a1,ax=Math.abs(p.dx)>=Math.abs(p.dy)?'x':'y',sg=(ax==='x'?p.dx:p.dy)>=0?1:-1,z=(p.z||0)+(1-eo(k))*2.2,M=.32*s;
  if(k<=0)return null;
  const B=(l0,l1,m,z0,z1)=>{const a=(sg>0?l0:-l1)*s,b=(sg>0?l1:-l0)*s;return ax==='x'?[p.x+a,p.y-m*s,z+z0*s,b-a,2*m*s,(z1-z0)*s]:[p.x-m*s,p.y+a,z+z0*s,2*m*s,b-a,(z1-z0)*s]};
  const W3=(l,m,zz)=>ax==='x'?[p.x+sg*l*s,p.y+m*s,z+zz*s]:[p.x+m*s,p.y+sg*l*s,z+zz*s];
  const bx=ax==='x'?[p.x-.64*s,p.y-M,z,1.28*s,2*M,.76*s]:[p.x-M,p.y-.64*s,z,2*M,1.28*s,.76*s];
  return item(...bx,()=>{const parts=[],mk=(b,c,top)=>parts.push(item(...b,()=>faces(...b,tri(c),top),false));
    mk(B(-.62,.62,.3,.1,.22),'#3a4651');mk(B(-.62,.2,.32,.22,.3),'#6b7a86');mk(B(.24,.62,.32,.22,.74),col);
    const LC=o.loadCols||[],LD=Array.isArray(o.load)?o.load:Array.from({length:Math.min(3,o.load||0)},(_,i)=>LC[i]||PAL.kraft),cs=.27*s;
    for(let i=0;i<Math.min(3,LD.length);i++){if(!LD[i])continue;const sl=TRUCK_SLOTS[i],q=W3(sl[0],0,sl[1]);parts.push(crate(q[0],q[1],q[2],cs,{col:LD[i],shadow:false}))}
    sortDraw(parts);
    // 车窗：只有朝向观众的面才画
    const gl='#dff1f2',cb=B(.24,.62,.32,.22,.74);
    if(sg>0){if(ax==='x')poly([[cb[0]+cb[3],cb[1]+.06*s,z+.46*s],[cb[0]+cb[3],cb[1]+cb[4]-.06*s,z+.46*s],[cb[0]+cb[3],cb[1]+cb[4]-.06*s,z+.68*s],[cb[0]+cb[3],cb[1]+.06*s,z+.68*s]],'#a9c8cf',false);
      else poly([[cb[0]+.06*s,cb[1]+cb[4],z+.46*s],[cb[0]+cb[3]-.06*s,cb[1]+cb[4],z+.46*s],[cb[0]+cb[3]-.06*s,cb[1]+cb[4],z+.68*s],[cb[0]+.06*s,cb[1]+cb[4],z+.68*s]],gl,false)}
    if(ax==='x')poly([[cb[0]+.07*s,cb[1]+cb[4],z+.48*s],[cb[0]+cb[3]-.07*s,cb[1]+cb[4],z+.48*s],[cb[0]+cb[3]-.07*s,cb[1]+cb[4],z+.68*s],[cb[0]+.07*s,cb[1]+cb[4],z+.68*s]],gl,false);
    else poly([[cb[0]+cb[3],cb[1]+.07*s,z+.48*s],[cb[0]+cb[3],cb[1]+cb[4]-.07*s,z+.48*s],[cb[0]+cb[3],cb[1]+cb[4]-.07*s,z+.68*s],[cb[0]+cb[3],cb[1]+.07*s,z+.68*s]],'#a9c8cf',false);
    // 轮子：画在朝外的侧面上（圆在等距面上是斜椭圆）
    for(const l of[-.4,.4]){const c0=ax==='x'?P(p.x+l*s,p.y+M,z+.12*s):P(p.x+M,p.y+l*s,z+.12*s);G.save();G.transform(ax==='x'?S*CA:-S*CA,S*SA,0,-S,c0[0],c0[1]);G.fillStyle='#1f2a33';G.beginPath();G.arc(0,0,.13*s,0,7);G.fill();G.fillStyle='#b8c2ca';G.beginPath();G.arc(0,0,.055*s,0,7);G.fill();G.restore()}
  })}

/* ---------- 传送带 ---------- */
function belt(t,x,y,z,len,o={}){const ax=o.axis||'x',wd=o.wid??.5,h=o.h??.45,k=o.k==null?1:cl(o.k),L=len*k,sp=o.speed??1,col=o.col||PAL.steel;if(L<=.01)return null;
  const b=ax==='x'?[x,y-wd/2,z,L,wd,h]:[x-wd/2,y,z,wd,L,h];
  return item(...b,()=>{const c=tri(col),in_=.06,zt=z+h;
    // 机架：两头两条腿 + 一条梁，中间镂空
    const lg=.1,hb=h*.42;const seg3=(a0,a1,z0,z1,cc)=>ax==='x'?faces(x+a0,y-wd/2,z0,a1-a0,wd,z1-z0,cc):faces(x-wd/2,y+a0,z0,wd,a1-a0,z1-z0,cc);
    const dk=tri(mix(col,PAL.deep,.3));seg3(0,Math.min(lg,L),z,zt-hb,dk);if(L>lg*2)seg3(L-lg,L,z,zt-hb,dk);if(L>1.6)seg3(L/2-lg/2,L/2+lg/2,z,zt-hb,dk);
    seg3(0,L,zt-hb,zt,c);
    const T2=(a0,a1,cc)=>ax==='x'?poly([[x+a0,y-wd/2+in_,zt],[x+a1,y-wd/2+in_,zt],[x+a1,y+wd/2-in_,zt],[x+a0,y+wd/2-in_,zt]],cc,false):poly([[x-wd/2+in_,y+a0,zt],[x+wd/2-in_,y+a0,zt],[x+wd/2-in_,y+a1,zt],[x-wd/2+in_,y+a1,zt]],cc,false);
    T2(0,L,PAL.rubber);const pit=.3,sw=.07,ph=((t*sp)%pit+pit)%pit,sc=mix(PAL.rubber,'#ffffff',.3);
    for(let a=ph-pit;a<L;a+=pit){const a0=Math.max(0,a),a1=Math.min(L,a+sw);if(a1>a0)T2(a0,a1,sc)}})}

/* ---------- 堆数量 ---------- */
function stack(t,t0,n,x,y,o={}){const cols=o.cols||4,rows=o.rows||3,sz=o.size||.42,gap=o.gap??.1,rate=o.rate??.15,z=o.z||0,per=cols*rows,pal=o.palette,out=[];let count=0;
  for(let i=0;i<n;i++){const ti=t0+i*rate,q=seg(t,ti,ti+.32);if(q<=0)break;const lay=Math.floor(i/per),j=i%per,cx=x+sz/2+(j%cols)*(sz+gap),cy=y+sz/2+Math.floor(j/cols)*(sz+gap),land=1-eo(q);
    if(q>=1)count++;sfx('tick',ti+.32,.5);
    out.push(crate(cx,cy,z+lay*sz+land*2.4,sz*(.5+.5*cl(q*3)),{col:pal?pal[Math.floor(rnd(i*7+3)*pal.length)]:o.col,shadow:q>=1&&lay===0}))}
  out.count=count;return out}

/* ---------- 标签：竖直引线 + 牌子 ---------- */
function tag(t,t0,s,x,y,z,o={}){const up=o.up??90,sz=o.sz||36,col=o.col||TH.a1,fill=o.fill||TH.ink,t1=o.t1??1e9,kin=seg(t,t0,t0+.55),kout=1-seg(t,t1-.3,t1);if(kin<=0||kout<=0)return;sfx('pop',t0);
  const p=P(x,y,z||0),kl=eo(seg(kin,0,.55))*kout,kb=seg(kin,.3,1),sc=back(kb)*kout,top=p[1]-up*kl;
  G.save();G.strokeStyle=fill;G.lineWidth=3;G.lineCap='round';G.beginPath();G.moveTo(p[0],p[1]);G.lineTo(p[0],top);G.stroke();
  G.fillStyle='#ffffff';G.beginPath();G.arc(p[0],p[1],8*Math.min(1,kl*2),0,7);G.fill();G.fillStyle=col;G.beginPath();G.arc(p[0],p[1],5*Math.min(1,kl*2),0,7);G.fill();
  if(kb>0&&sc>0){const w=tw(s,sz,o.font||'H7')+sz*.95,h=sz*1.52;G.translate(p[0],top);G.scale(sc,sc);G.globalAlpha*=cl(kb*2.5)*seg(kout,.75,1);
    G.fillStyle=fill;G.beginPath();G.roundRect(-w/2,-h,w,h,10);G.fill();G.fillStyle=col;G.beginPath();G.roundRect(-w/2,-h,9,h,[10,0,0,10]);G.fill();
    txt(s,4,-h/2+sz*.35,sz,o.ink||'#ffffff',o.font||'H7','center')}
  G.restore()}

/* ---------- 主题 ---------- */
let _bg=null;
function bgTile(){if(_bg)return _bg;_bg=document.createElement('canvas');_bg.width=W;_bg.height=H;const c=_bg.getContext('2d'),gr=c.createLinearGradient(0,0,0,H);gr.addColorStop(0,PAL.bg0);gr.addColorStop(1,PAL.bg1);c.fillStyle=gr;c.fillRect(0,0,W,H);
  c.strokeStyle='rgba(34,48,60,.045)';c.lineWidth=2;c.beginPath();const st=96,dx=H/SA*CA;for(let x=-dx;x<W+dx;x+=st*CA*2){c.moveTo(x,0);c.lineTo(x+dx,H);c.moveTo(x,0);c.lineTo(x-dx,H)}c.stroke();
  const v=c.createRadialGradient(W/2,H*.52,H*.3,W/2,H*.52,H*1.05);v.addColorStop(0,'rgba(255,255,255,.35)');v.addColorStop(.5,'rgba(255,255,255,0)');v.addColorStop(1,'rgba(90,80,60,.14)');c.fillStyle=v;c.fillRect(0,0,W,H);return _bg}
addTheme('iso',{light:true,ink:PAL.ink,dim:'rgba(34,48,60,.62)',note:'rgba(34,48,60,.8)',a1:PAL.coral,a2:PAL.teal,a3:PAL.mustard,chip:'rgba(34,48,60,.07)',sub:'rgba(34,48,60,.9)',subInk:'#ffffff',
  top:PAL.bg0,bot:PAL.bg1,card:'rgba(255,255,255,.96)',cardInk:PAL.ink,pillInk:'#ffffff',hl:'rgba(240,178,58,.45)',f:{t:'H9',b:'H7',s:'H5',h:'KT',n:'RC'},
  bg(t){g.drawImage(bgTile(),0,0)}});

return{stage,cam,P,scene,ground,block,house,tree,crate,route,road,mover,truck,slot,belt,stack,tag,on,PAL,mix,tri};
})();
