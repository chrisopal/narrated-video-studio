/* 风格包 · 简笔角色故事 —— 本项目自己实现
   白底，黑色粗线的简笔人：圆头、一片带三个尖的“锅盖”刘海（本包自己设计的形象），点眼、一条线的嘴，单线身体和四肢；
   一句一镜，镜头之间硬切；画面大部分时间定住，动作是“姿势到姿势”的快速切换（两姿势之间只用 0.07 秒）；
   全片只有一种强调色（ACC = TH.a1），只给情绪符号和关键道具；对白框和手写一行字是画面的一部分。
   用法（t 全片时间，t0 开始时刻）：
   stick(t, x, y, {pose, face, talk, scale, flip, seat})  简笔人。x,y 是落地点（脚下；躺着时是身下）；seat:true 时 x,y 是胯（坐在凳子上用，凳面高度给 y）；
        pose 写姿势名，或关键帧 [[时刻,'名字'],…]（到点 0.07 秒切过去）；face 写表情名或关键帧；talk:true 或 [[起,止],…] 说话时嘴一张一合；flip:true 面朝左；
        返回世界坐标 {head:[x,y], top:[x,y], hand:[x,y], hand2:[x,y], hip:[x,y], r}（hand 是前手，拿道具就画在这里）
        姿势：stand walk point raise shrug facepalm cheer panic sit sitthink think fold drop lift peek fall lie reach slap；表情：plain smile shock sad smug sleep blank
   beats(t, [{at, fn(u,i), cam:{x,y,z}}])  一句一镜：到 at 硬切到这一镜，u=这一镜已经过了几秒；cam 是这一镜固定的取景（看哪一点、放大几倍），镜头里不推不摇；返回当前镜号
   say(t, t0, '对白', x, y, {to:[x,y], mode:'bubble|shout|line', sz, cps, t1, rot, col, font})  对白框（尾巴指向 to；to 直接给 stick() 的返回值，尾巴就停在那个人头边上）/喊叫框/手写一行字；x,y 是文字中心；
        逐字显出（cps 字/秒，缺省 16）但整串只登记一次；t1 到点硬切消失；返回框 [x0,y0,x1,y1]
   emote(t, t0, 'sweat|bang|heart|question|zzz|spark|dots', x, y, {s, t1, rot})  情绪符号，强调色，0.16 秒弹到位后定住；zzz 一格一格往上冒；spark 是一圈撞击短线；dots 是“愣住”的三个点，一格出一个
   prop(name, x, y, {s, hot, t, flip, w, h, …})  道具，同样的粗线画法；hot:true 用强调色（只给关键道具）；返回 {top}（能放东西的面的高度）等。
        室内：desk（桌，w h）laptop phone door(open) cup box window(sun moon) floor(w) bed blanket clock(time=钟点或 [[时刻,钟点],…]，指针一格跳到位) alarm(ring:[起,止])
        厨房：stove（灶台，fire:true 火苗一格一格跳；返回 {top} 放锅的高度）pot（锅，boil:0..1 水开的程度，noodles:'stick|clump'；返回 {rim}）
              bowl（碗，full:true 盛着面，steam:true 冒热气）noodles（kind:'bundle' 一把干面 | 'clump' 一整坨，rot）chopsticks（to:[x,y] 筷子尖指到哪）stool（凳子，返回 {top}）
        道具里会动的东西（火苗、水泡、热气、闹钟）都要传 t
   hold(t, t0, d, fn, {x, y, z, lines, r, span})  包袱后的定住：t0 是包袱落下的时刻；fn(tt) 画这一镜，里面一律用 tt 取时；t0+0.2 秒（姿势、弹出的符号都到位）起 d 秒（至少 0.9 秒）
        tt 冻结，所有东西（嘴、火、热气）一起停住；z 给了就在 t0 一下子切近 1+z 倍（以 x,y 为中心，缺省不切）；lines:true 在 (x,y) 周围补一圈半径 r 的撞击短线（span:[起角,止角] 弧度，0 朝右、负数朝上，只画这一段，避开人和字）；返回解冻时刻
   on(ctx, fn)  临时把画笔换成 ctx（封面 art 里用 stick / prop / emote；say 带文字，不支持）
   另导出 POSES（姿势关节表，可以照着加新姿势）、INK BG ACC 三个颜色 */
window.PACK=window.PACK||{};window.PACK_INIT=window.PACK_INIT||[];
PACK.stick=(function(){
  const INK='#161616',BG='#fbfaf6',ACC='#ef3e5c',LW=9,SNAP=.07;
  let P=g;                                   // 图形画笔：on() 可以临时换
  addTheme('stick',{light:true,ink:INK,dim:'rgba(22,22,22,.58)',note:'rgba(22,22,22,.78)',a1:ACC,a2:INK,a3:'#8c8a86',chip:'rgba(22,22,22,.06)',
    sub:'rgba(22,22,22,.9)',subInk:'#ffffff',top:BG,bot:'#f3f1ea',card:'#ffffff',cardInk:INK,pillInk:'#ffffff',hl:'rgba(239,62,92,.24)',
    f:{t:'H9',b:'H7',s:'H5',h:'KT',n:'RC'},
    bg(t){g.fillStyle=BG;g.fillRect(0,0,W,H)}});
  function on(ctx,fn){const o=P;P=ctx;try{fn()}finally{P=o}}
  const acc=()=>(TH&&TH.a1)||ACC;

  /* ---------- 关键帧取值：v 是单个值，或 [[时刻,值],…] ---------- */
  function keyAt(t,v){if(!Array.isArray(v)||!Array.isArray(v[0]))return {cur:v,prev:null,age:9};let i=-1;for(let j=0;j<v.length;j++)if(t>=v[j][0])i=j;if(i<0)return {cur:v[0][1],prev:null,age:9};return {cur:v[i][1],prev:i>0?v[i-1][1]:null,age:t-v[i][0]}}

  /* ---------- 简笔人 ----------
     尺寸（scale=1）：头半径 44，身 118，上臂 60 前臂 56，大腿 72 小腿 70，站高约 360。
     关节表：角度用度，0 = 朝下，90 = 朝前（面朝的一侧，+x），180 = 朝上，负数朝后。
     lean 身子前倾；hd 头再前倾；aF/aB 前/后手臂 [上臂, 前臂相对上臂]（跟着身子转）；lF/lB 前/后腿 [大腿, 小腿相对大腿]；rot 整个人绕胯转（躺下用）；
     top:true 前手画在头上面（手碰到脸的姿势） */
  const L={r:44,gap:6,torso:118,sho:24,ua:60,la:56,th:72,sh:70};
  const POSES={
    stand:{aF:[20,6],aB:[-20,-6],lF:[9,0],lB:[-9,0]},
    walk:{lean:4,aF:[-26,16],aB:[30,24],lF:[26,-4],lB:[-22,-24]},
    walk2:{lean:4,aF:[30,24],aB:[-26,16],lF:[-22,-24],lB:[26,-4]},
    point:{aF:[100,-6],aB:[-18,-8],lF:[12,0],lB:[-9,0]},
    raise:{aF:[150,-10],aB:[-20,-8],lF:[10,0],lB:[-9,0]},
    shrug:{hd:10,aF:[64,86],aB:[-64,-86],lF:[9,0],lB:[-9,0]},
    facepalm:{lean:6,hd:16,aF:[96,118],aB:[-16,-6],lF:[9,0],lB:[-9,0],top:true},
    cheer:{aF:[128,24],aB:[-128,-24],lF:[16,0],lB:[-16,0]},
    panic:{lean:-4,hd:-6,aF:[128,52],aB:[-128,-52],lF:[22,0],lB:[-20,0]},
    sit:{lean:-3,aF:[26,48],aB:[14,54],lF:[92,-92],lB:[84,-84]},
    sitthink:{lean:4,hd:-6,aF:[90,143],aB:[14,54],lF:[92,-92],lB:[84,-84],top:true},
    think:{hd:-8,aF:[90,143],aB:[-24,-60],lF:[9,0],lB:[-9,0],top:true},
    fold:{hd:-4,aF:[22,-112],aB:[-22,112],lF:[12,0],lB:[-12,0]},
    drop:{lean:6,hd:10,aF:[135,-5],aB:[-24,-10],lF:[10,0],lB:[-12,0]},
    lift:{lean:-4,hd:-10,aF:[118,26],aB:[96,46],lF:[14,0],lB:[-12,0]},
    peek:{lean:20,hd:14,aF:[40,24],aB:[-34,-20],lF:[6,0],lB:[-20,0]},
    fall:{lean:-30,hd:-10,aF:[140,30],aB:[-130,-30],lF:[118,-26],lB:[96,-20]},
    lie:{rot:-90,aF:[10,4],aB:[-10,-4],lF:[5,0],lB:[-5,0]},
    reach:{rot:-90,aF:[96,-8],aB:[-10,-4],lF:[5,0],lB:[-5,0]},
    slap:{rot:-90,aF:[132,30],aB:[-10,-4],lF:[5,0],lB:[-5,0]}};
  const ARR=['aF','aB','lF','lB'],NUM=['lean','hd','rot'];
  function poseOf(t,name){if(name&&typeof name==='object')return name;if(name==='walk')return POSES[Math.floor(t*4)%2?'walk2':'walk'];return POSES[name]||POSES.stand}
  function mixPose(a,b,k){const o={top:k<.5?a.top:b.top};NUM.forEach(n=>o[n]=lerp(a[n]||0,b[n]||0,k));ARR.forEach(n=>o[n]=[lerp(a[n][0],b[n][0],k),lerp(a[n][1],b[n][1],k)]);return o}
  function resolve(t,pose){const k=keyAt(t,pose||'stand');const cur=poseOf(t,k.cur);if(k.prev==null||k.age>=SNAP)return cur;return mixPose(poseOf(t,k.prev),cur,k.age/SNAP)}
  const lim=(o,ang,len)=>{const a=ang*Math.PI/180;return [o[0]+Math.sin(a)*len,o[1]+Math.cos(a)*len]};
  function build(p){const lean=p.lean||0,hd=p.hd||0,hip=[0,0];
    const neck=lim(hip,180-lean,L.torso),sh=lim(hip,180-lean,L.torso-L.sho),head=lim(neck,180-lean-hd,L.r+L.gap);
    const eF=lim(sh,lean+p.aF[0],L.ua),hF=lim(eF,lean+p.aF[0]+p.aF[1],L.la),eB=lim(sh,lean+p.aB[0],L.ua),hB=lim(eB,lean+p.aB[0]+p.aB[1],L.la);
    const kF=lim(hip,p.lF[0],L.th),fF=lim(kF,p.lF[0]+p.lF[1],L.sh),kB=lim(hip,p.lB[0],L.th),fB=lim(kB,p.lB[0]+p.lB[1],L.sh);
    const J={hip,neck,sh,head,eF,hF,eB,hB,kF,fF,kB,fB},rot=(p.rot||0)*Math.PI/180;
    if(rot){const c=Math.cos(rot),s=Math.sin(rot);for(const k in J){const [x,y]=J[k];J[k]=[x*c-y*s,x*s+y*c]}}
    J.ang=lean+hd+(p.rot||0);J.top=!!p.top;return J}
  function face(name,talking,t){const fx=5,c=P;c.save();c.fillStyle=INK;c.strokeStyle=INK;c.lineCap='round';c.lineJoin='round';c.lineWidth=6;
    const dot=(x,y,r)=>{c.beginPath();c.arc(x,y,r,0,7);c.fill()},ln=(a,b,x,y)=>{c.beginPath();c.moveTo(a,b);c.lineTo(x,y);c.stroke()};
    const ex=[fx-14,fx+14],ey=2;
    if(name==='shock'){c.lineWidth=4.5;ex.forEach(x=>{c.beginPath();c.arc(x,ey,8.5,0,7);c.stroke();dot(x,ey,3)});c.lineWidth=5;ln(ex[0]-8,-16,ex[0]+5,-19);ln(ex[1]-5,-19,ex[1]+8,-16)}
    else if(name==='sleep'){c.lineWidth=5;ex.forEach(x=>{c.beginPath();c.arc(x,ey-3,7,.15*Math.PI,.85*Math.PI);c.stroke()})}
    else if(name==='smug'){c.lineWidth=5;ex.forEach(x=>{ln(x-8,ey-1,x+8,ey-1);dot(x+2,ey+2.5,3.6)})}
    else if(name==='blank')ex.forEach(x=>dot(x,ey+1,3.2));
    else{ex.forEach(x=>dot(x,ey,5.4));if(name==='sad'){c.lineWidth=5;ln(ex[0]-8,-11,ex[0]+5,-15);ln(ex[1]-5,-15,ex[1]+8,-11)}}
    const open=talking&&Math.floor(t*7.5)%2===0;
    if(name==='shock'){c.beginPath();c.ellipse(fx,22,open?9:7.5,open?14:11,0,0,7);c.fill()}
    else if(open){c.beginPath();c.ellipse(fx,20,9.5,7.5,0,0,7);c.fill()}
    else if(name==='smile'){c.beginPath();c.arc(fx,10,14,.22*Math.PI,.78*Math.PI);c.stroke()}
    else if(name==='sad'){c.beginPath();c.arc(fx,33,12,1.22*Math.PI,1.78*Math.PI);c.stroke()}
    else if(name==='smug'){ln(fx-9,21,fx+13,15)}
    else if(name==='sleep'){ln(fx-5,21,fx+5,21)}
    else if(name==='blank'){c.lineWidth=4.5;ln(fx-4,22,fx+4,22)}
    else ln(fx-10,20,fx+10,20);
    c.restore()}
  function hair(r){const c=P,a=Math.asin(.4);c.beginPath();c.arc(0,0,r,Math.PI+a,2*Math.PI-a);
    [[.92,-.40],[.52,-.17],[.24,-.42],[-.10,-.16],[-.44,-.40],[-.92,-.40]].forEach(([x,y])=>c.lineTo(x*r,y*r));c.closePath();c.fillStyle=INK;c.fill()}
  function stick(t,x,y,o={}){const s=o.scale||1,f=o.flip?-1:1,J=build(resolve(t,o.pose)),fc=keyAt(t,o.face||'plain').cur;
    let talking=false;if(o.talk===true)talking=true;else if(Array.isArray(o.talk))talking=o.talk.some(([a,b])=>t>=a&&t<b);
    const dy=o.seat?0:o.ground===false?L.th+L.sh:-Math.max(J.fF[1],J.fB[1],J.hip[1],J.head[1]+L.r);
    const c=P;c.save();c.translate(x,y);c.scale(s*f,s);c.translate(0,dy);c.strokeStyle=INK;c.lineCap='round';c.lineJoin='round';c.lineWidth=LW;
    const pl=(...pts)=>{c.beginPath();c.moveTo(...pts[0]);pts.slice(1).forEach(p=>c.lineTo(...p));c.stroke()};
    pl(J.hip,J.kB,J.fB);pl(J.sh,J.eB,J.hB);pl(J.hip,J.neck);pl(J.hip,J.kF,J.fF);if(!J.top)pl(J.sh,J.eF,J.hF);
    c.save();c.translate(...J.head);c.rotate(J.ang*Math.PI/180);c.fillStyle=BG;c.beginPath();c.arc(0,0,L.r,0,7);c.fill();hair(L.r);c.beginPath();c.arc(0,0,L.r,0,7);c.stroke();face(fc,talking,t);c.restore();
    if(J.top)pl(J.sh,J.eF,J.hF);
    c.restore();
    const wp=p=>[x+f*s*p[0],y+s*(p[1]+dy)],up=J.ang*Math.PI/180;
    return {head:wp(J.head),top:wp([J.head[0]+Math.sin(up)*L.r,J.head[1]-Math.cos(up)*L.r]),hand:wp(J.hF),hand2:wp(J.hB),hip:wp(J.hip),r:L.r*s}}

  /* ---------- 一句一镜：硬切 ---------- */
  function beats(t,list){let i=-1;list.forEach((b,j)=>{if(t>=b.at)i=j});if(i<0)return -1;const b=list[i];if(i>0)sfx('tick',b.at,.25);
    g.save();const cm=b.cam;if(cm){const z=cm.z||1;g.translate(W/2,H/2);g.scale(z,z);g.translate(-(cm.x??W/2),-(cm.y??H/2))}
    try{b.fn(t-b.at,i)}finally{g.restore()}return i}

  /* ---------- 对白框 / 喊叫框 / 手写一行字 ---------- */
  function say(t,t0,s,x,y,o={}){s=String(s);if(t<t0||(o.t1!=null&&t>=o.t1))return null;
    const mode=o.mode||'bubble',sz=o.sz||(mode==='line'?64:54),font=o.font||(mode==='line'?'KT':'H7'),cps=o.cps||16,ch=[...s],n=ch.length;
    const shown=Math.min(n,Math.floor((t-t0)*cps)+1),wd=tw(s,sz,font),pw=shown>=n?wd+sz:tw(ch.slice(0,shown).join(''),sz,font);
    const k=seg(t,t0,t0+.08),sc=mode==='line'?1:lerp(.86,1,k);sfx('pop',t0,.4);
    const padX=sz*.62,bw=wd+padX*2,bh=sz*1.72;let box=[x-bw/2,y-bh/2,x+bw/2,y+bh/2];
    g.save();g.translate(x,y);g.rotate(o.rot??(mode==='line'?-.035:0));g.scale(sc,sc);g.lineJoin='round';g.lineCap='round';
    let to=o.to;if(to&&to.head){const [hx,hy]=to.head,dx=x-hx,dy=y-hy,dd=Math.hypot(dx,dy)||1,kk=(to.r||44)+18;to=[hx+dx/dd*kk,hy+dy/dd*kk]}
    if(mode!=='line'){const lw=7;
      const body=()=>{g.beginPath();if(mode==='shout'){const N=22,rx=bw/2+sz*.5,ry=bh/2+sz*.55;for(let i=0;i<N;i++){const a=i/N*2*Math.PI,rr2=i%2?1:1.16+.08*rnd(i+3);const px=Math.cos(a)*rx*rr2,py=Math.sin(a)*ry*rr2;i?g.lineTo(px,py):g.moveTo(px,py)}g.closePath()}else g.roundRect(-bw/2,-bh/2,bw,bh,bh*.42)};
      // 尾巴：从框中心出发的细三角，先描两遍边、再分别填白，这样框和尾巴连成一个轮廓（各自单独填，避免绕向相反时互相抵消）
      const tail=()=>{if(!to)return false;const tx=(to[0]-x)/sc,ty=(to[1]-y)/sc,d=Math.hypot(tx,ty)||1,nx=-ty/d,ny=tx/d,wb=Math.min(bh*.2,24);
        g.beginPath();g.moveTo(nx*wb,ny*wb);g.lineTo(tx,ty);g.lineTo(-nx*wb,-ny*wb);g.closePath();return true};
      g.strokeStyle=INK;g.lineWidth=lw*2;body();g.stroke();if(tail())g.stroke();g.fillStyle='#ffffff';body();g.fill();if(tail())g.fill()}
    g.beginPath();g.rect(-wd/2-sz*.1,-sz,pw+sz*.1,sz*2);g.clip();txt(s,-wd/2,sz*.36,sz,o.col||INK,font,'left');
    g.restore();if(mode==='shout')box=[x-bw/2-sz*.6,y-bh/2-sz*.7,x+bw/2+sz*.6,y+bh/2+sz*.7];return box}

  /* ---------- 情绪符号：强调色，弹一下就定住 ---------- */
  function emote(t,t0,kind,x,y,o={}){if(t<t0||(o.t1!=null&&t>=o.t1))return;const u=t-t0,k=seg(u,0,.16),s=(o.s||1)*(k<1?(k<.5?lerp(.3,1.25,k*2):lerp(1.25,1,(k-.5)*2)):1);
    const c=P,A=acc();c.save();c.translate(x,y);c.rotate(o.rot||0);c.scale(s,s);c.lineJoin='round';c.lineCap='round';c.fillStyle=A;c.strokeStyle=A;
    const out=()=>{c.lineWidth=5;c.strokeStyle=INK;c.stroke();c.fill()};
    if(kind==='sweat'){c.beginPath();c.moveTo(0,-30);c.bezierCurveTo(8,-14,20,0,20,10);c.arc(0,10,20,0,Math.PI);c.bezierCurveTo(-20,0,-8,-14,0,-30);c.closePath();out();c.fillStyle='#ffffff';c.beginPath();c.ellipse(-7,10,4,7,.4,0,7);c.fill()}
    else if(kind==='bang'){c.beginPath();c.moveTo(-14,-48);c.lineTo(14,-48);c.lineTo(5,14);c.lineTo(-5,14);c.closePath();out();c.beginPath();c.arc(0,36,10,0,7);out()}
    else if(kind==='heart'){c.beginPath();c.moveTo(0,26);c.bezierCurveTo(-34,2,-30,-26,-14,-28);c.bezierCurveTo(-6,-29,-1,-22,0,-16);c.bezierCurveTo(1,-22,6,-29,14,-28);c.bezierCurveTo(30,-26,34,2,0,26);c.closePath();out()}
    else if(kind==='question'){c.lineWidth=13;c.beginPath();c.arc(0,-22,18,Math.PI*1.05,Math.PI*2.35);c.quadraticCurveTo(0,-2,0,10);c.stroke();c.beginPath();c.arc(0,34,8,0,7);c.fill()}
    else if(kind==='zzz'){const cyc=Math.floor(u/.42)%4,nz=[1,2,3,3][cyc];c.lineWidth=7;for(let i=0;i<nz;i++){const z=18+i*9,zx=i*34,zy=-i*40;c.beginPath();c.moveTo(zx-z/2,zy-z/2);c.lineTo(zx+z/2,zy-z/2);c.lineTo(zx-z/2,zy+z/2);c.lineTo(zx+z/2,zy+z/2);c.stroke()}}
    else if(kind==='spark'){c.lineWidth=8;for(let i=0;i<8;i++){const a=i/8*2*Math.PI+.2,r0=34+(i%2)*8,r1=r0+22+(i%2?0:10);c.beginPath();c.moveTo(Math.cos(a)*r0,Math.sin(a)*r0);c.lineTo(Math.cos(a)*r1,Math.sin(a)*r1);c.stroke()}}
    else if(kind==='dots'){const nd=Math.min(3,Math.floor(u/.3)+1);for(let i=0;i<nd;i++){c.beginPath();c.arc((i-1)*42,0,12,0,7);out()}}
    c.restore()}

  /* ---------- 道具：粗线极简 ---------- */
  // 一团疙疙瘩瘩的轮廓（seed 固定，同样的参数画出来一模一样）
  function blob(c,rx,ry,seed,n=11){const pts=[];for(let i=0;i<n;i++){const a=i/n*2*Math.PI,k=.84+.24*rnd(seed+i*7);pts.push([Math.cos(a)*rx*k,Math.sin(a)*ry*k])}
    c.beginPath();const m=(p,q)=>[(p[0]+q[0])/2,(p[1]+q[1])/2];c.moveTo(...m(pts[n-1],pts[0]));for(let i=0;i<n;i++)c.quadraticCurveTo(...pts[i],...m(pts[i],pts[(i+1)%n]));c.closePath()}
  // 热气：几道 S 形细线，两种形状一格一格换（不是连续飘）
  function steam(c,t,x,y,n,h=90){const ph=Math.floor(t*3.2)%2;c.save();c.lineWidth=LW*.55;c.strokeStyle=INK;for(let i=0;i<n;i++){const sx=x+(i-(n-1)/2)*38,d=(i+ph)%2?1:-1;c.beginPath();c.moveTo(sx,y);c.bezierCurveTo(sx+16*d,y-h*.3,sx-16*d,y-h*.6,sx,y-h);c.stroke()}c.restore()}
  function prop(name,x,y,o={}){const s=o.s||1,c=P,hot=!!o.hot,t=o.t??0,A=acc();c.save();c.translate(x,y);c.scale(s*(o.flip?-1:1),s);c.lineCap='round';c.lineJoin='round';c.strokeStyle=INK;c.lineWidth=LW*.85;
    const box=(x0,y0,w,h,r=6,fill=BG)=>{c.beginPath();c.roundRect(x0,y0,w,h,r);c.fillStyle=fill;c.fill();c.stroke()},ln=(a,b,x2,y2)=>{c.beginPath();c.moveTo(a,b);c.lineTo(x2,y2);c.stroke()};
    let ret={};
    if(name==='floor'){const w=o.w||1500;ln(-w/2,0,w/2,0)}
    else if(name==='desk'){const w=o.w||320,h=o.h||150;box(-w/2,-h,w,18,4);ln(-w/2+20,-h+18,-w/2+20,0);ln(w/2-20,-h+18,w/2-20,0);if(w<220){box(-w/2+20,-h+18,w-40,h*.42,2);ln(-10,-h+18+h*.21,10,-h+18+h*.21)}ret={top:y-h*s}}
    else if(name==='bed'){const w=o.w||560;box(-w/2-16,-240,30,240,10);box(w/2-14,-150,28,150,10);box(-w/2,-112,w,72,10);ln(-w/2+20,-40,-w/2+20,0);ln(w/2-20,-40,w/2-20,0);box(-w/2+22,-158,118,46,20);ret={top:y-112*s}}
    else if(name==='blanket'){const w=o.w||330,h=o.h||70;c.beginPath();c.moveTo(-w/2,0);c.lineTo(-w/2,-h+20);c.quadraticCurveTo(-w/2,-h,-w/2+24,-h);c.lineTo(w/2-10,-h);c.quadraticCurveTo(w/2+6,-h,w/2+6,-h+18);c.lineTo(w/2+6,26);c.lineTo(-w/2,26);c.closePath();c.fillStyle=BG;c.fill();c.stroke();ln(-w/2+30,-h+6,-w/2+30,22);c.lineWidth=LW*.55;ln(-w/2+70,-h+30,-w/2+150,-h+30)}
    else if(name==='window'){const w=o.w||300,h=o.h||240;box(-w/2,-h/2,w,h,4);ln(0,-h/2,0,h/2);ln(-w/2,0,w/2,0);
      if(o.sun){c.lineWidth=LW*.6;c.beginPath();c.arc(w*.22,-h*.24,22,0,7);c.stroke();for(let i=0;i<8;i++){const a=i/8*2*Math.PI;ln(w*.22+Math.cos(a)*32,-h*.24+Math.sin(a)*32,w*.22+Math.cos(a)*42,-h*.24+Math.sin(a)*42)}}
      if(o.moon){c.lineWidth=LW*.6;c.beginPath();c.arc(-w*.24,-h*.24,24,.6*Math.PI,1.9*Math.PI);c.arc(-w*.24+12,-h*.24-6,18,1.75*Math.PI,.72*Math.PI,true);c.closePath();c.stroke()}}
    else if(name==='door'){const w=o.w||210,h=o.h||400;box(-w/2,-h,w,h,4);if(o.open){c.beginPath();c.moveTo(-w/2,-h);c.lineTo(-w/2+w*.55,-h+30);c.lineTo(-w/2+w*.55,-26);c.lineTo(-w/2,0);c.closePath();c.fillStyle=BG;c.fill();c.stroke()}else{c.fillStyle=INK;c.beginPath();c.arc(w/2-34,-h*.48,9,0,7);c.fill()}}
    else if(name==='laptop'){const w=o.w||170;ln(-w/2-14,0,w/2+14,0);c.beginPath();c.moveTo(-w/2,-4);c.lineTo(-w/2+10,-w*.66);c.lineTo(w/2-10,-w*.66);c.lineTo(w/2,-4);c.closePath();c.fillStyle=hot?A:BG;c.fill();c.stroke()}
    else if(name==='phone'){box(-28,-52,56,104,12,hot?A:BG);c.lineWidth=LW*.5;ln(-8,38,8,38)}
    else if(name==='cup'){box(-28,-64,56,64,8,hot?A:BG);c.beginPath();c.arc(30,-34,15,-.5*Math.PI,.5*Math.PI);c.stroke();c.lineWidth=LW*.5;[-10,8].forEach(dx=>{c.beginPath();c.moveTo(dx,-78);c.quadraticCurveTo(dx+10,-90,dx,-102);c.stroke()})}
    else if(name==='box'){const w=o.w||180,h=o.h||140;box(-w/2,-h,w,h,3,hot?A:BG);ln(-w/2,-h+30,w/2,-h+30);c.lineWidth=LW*.55;ln(-14,-h,-14,-h+30);ln(14,-h,14,-h+30)}
    else if(name==='clock'){const R=o.r||72,tm=keyAt(t,o.time??3).cur;c.beginPath();c.arc(0,0,R,0,7);c.fillStyle=BG;c.fill();c.lineWidth=hot?LW*1.5:LW*.85;c.strokeStyle=hot?A:INK;c.stroke();c.strokeStyle=INK;
      for(let i=0;i<12;i++){const a=i/12*2*Math.PI,r0=R*(i%3?.8:.7);c.lineWidth=i%3?4:7;ln(Math.cos(a)*r0,Math.sin(a)*r0,Math.cos(a)*R*.88,Math.sin(a)*R*.88)}
      const ha=(tm%12)/12*2*Math.PI,ma=(tm%1)*2*Math.PI;c.lineWidth=LW;ln(0,0,Math.sin(ha)*R*.48,-Math.cos(ha)*R*.48);c.lineWidth=LW*.7;ln(0,0,Math.sin(ma)*R*.72,-Math.cos(ma)*R*.72);c.fillStyle=INK;c.beginPath();c.arc(0,0,7,0,7);c.fill()}
    else if(name==='alarm'){const rg=o.ring&&t>=o.ring[0]&&t<o.ring[1],ph=Math.floor(t*15)%2?1:-1;if(rg){c.translate(ph*5,0);c.rotate(ph*.07)}
      ln(-20,-14,-30,0);ln(20,-14,30,0);[[-1],[1]].forEach(([d])=>{c.save();c.translate(d*28,-88);c.rotate(d*.6);c.beginPath();c.arc(0,0,17,Math.PI,2*Math.PI);c.closePath();c.fillStyle=INK;c.fill();c.restore()});
      ln(0,-86,0,-98);c.beginPath();c.arc(0,-50,40,0,7);c.fillStyle=hot?A:BG;c.fill();c.stroke();c.beginPath();c.arc(0,-50,27,0,7);c.fillStyle=BG;c.fill();c.lineWidth=5;c.stroke();
      c.lineWidth=6;ln(0,-50,0,-68);ln(0,-50,12,-46);
      if(rg){c.lineWidth=6;c.strokeStyle=INK;for(let i=0;i<3;i++){const r=62+i*16+(ph>0?4:0);c.beginPath();c.arc(0,-60,r,-.55*Math.PI+.25,-.12*Math.PI);c.stroke();c.beginPath();c.arc(0,-60,r,Math.PI+.12*Math.PI,Math.PI*1.55-.25);c.stroke()}}}
    else if(name==='stove'){const w=o.w||380,h=o.h||190,gh=22;box(-w/2,-h,w,h,6);ln(-w/2,-h+44,w/2,-h+44);c.fillStyle=INK;[-.3,.3].forEach(k=>{c.beginPath();c.arc(w*k,-h+22,9,0,7);c.fill()});
      box(-w/2+30,-h+70,w-60,h-90,4);c.lineWidth=LW*.6;ln(-w*.18,-h+90,w*.18,-h+90);c.lineWidth=LW*.85;
      if(o.fire){const ph=Math.floor(t*6)%2;[-34,0,34].forEach((fx,i)=>{const ht=(i+ph)%2?20:14;c.beginPath();c.moveTo(fx-10,-h-1);c.quadraticCurveTo(fx-9,-h-ht*.7,fx,-h-ht);c.quadraticCurveTo(fx+9,-h-ht*.7,fx+10,-h-1);c.closePath();c.fillStyle=hot?A:BG;c.lineWidth=LW*.5;c.fill();c.stroke()});c.lineWidth=LW*.85}
      ln(-70,-h,-70,-h-gh);ln(70,-h,70,-h-gh);ln(-84,-h-gh,-56,-h-gh);ln(56,-h-gh,84,-h-gh);ret={top:y-(h+gh)*s}}
    else if(name==='pot'){const w=o.w||250,h=o.h||150,v=o.boil||0,nd=o.noodles;
      if(nd==='stick'){c.lineWidth=LW*.55;for(let i=0;i<7;i++)ln(-w*.22+i*11,-h*.3,w*.02+i*15,-h-104+Math.abs(i-3)*7)}
      if(nd==='clump'){c.save();c.translate(0,-h-6);blob(c,w*.4,62,31);c.fillStyle=hot?A:BG;c.fill();c.lineWidth=LW*.85;c.stroke();c.lineWidth=LW*.45;[[-46,-24,28],[8,-34,26],[50,-14,20]].forEach(([bx,by,r])=>{c.beginPath();c.arc(bx,by,r,1.1*Math.PI,1.9*Math.PI);c.stroke()});c.restore();c.lineWidth=LW*.85}
      c.beginPath();c.roundRect(-w/2,-h,w,h,[4,4,26,26]);c.fillStyle=BG;c.fill();c.stroke();
      c.lineWidth=LW*1.15;ln(-w/2-14,-h,w/2+14,-h);ln(-w/2,-h+32,-w/2-36,-h+32);ln(w/2,-h+32,w/2+36,-h+32);c.lineWidth=LW*.85;
      if(v>0&&nd!=='clump'){const ph=Math.floor(t*5),nb=Math.max(1,Math.round(v*6));c.lineWidth=LW*.5;for(let i=0;i<nb;i++){const bx=(rnd(i*7+ph*13)-.5)*w*.78,by=-h-10-rnd(i*3+ph*5)*26*v,r=6+rnd(i+ph*11)*9*v;c.beginPath();c.arc(bx,by,r,0,7);c.fillStyle=BG;c.fill();c.stroke()}
        if(v>=.5)steam(c,t,0,-h-46,3,90+50*v)}
      else if(v>0)steam(c,t,0,-h-96,3,70+40*v)
      ret={rim:y-h*s}}
    else if(name==='bowl'){const w=o.w||220,h=w*.4;
      if(o.full){c.save();c.translate(0,-h-10);blob(c,w*.4,38,57,9);c.fillStyle=hot?A:BG;c.fill();c.lineWidth=LW*.75;c.stroke();c.lineWidth=LW*.42;[-1,0,1].forEach(i=>{c.beginPath();c.moveTo(i*44-30,-4);c.bezierCurveTo(i*44-14,-26,i*44+4,12,i*44+22,-12);c.stroke()});c.restore()}
      c.beginPath();c.moveTo(-w/2,-h-10);c.lineTo(w/2,-h-10);c.bezierCurveTo(w/2,-18,w*.25,-10,w*.18,-10);c.lineTo(-w*.18,-10);c.bezierCurveTo(-w*.25,-10,-w/2,-18,-w/2,-h-10);c.closePath();c.fillStyle=BG;c.fill();c.stroke();
      ln(-w*.16,-10,-w*.2,0);ln(w*.16,-10,w*.2,0);ln(-w*.22,0,w*.22,0);
      if(o.steam)steam(c,t,0,-h-60,3,100);ret={top:y-(h+10)*s}}
    else if(name==='noodles'){c.rotate(o.rot||0);if(o.kind==='clump'){const w=o.w||210,h=o.h||140;blob(c,w/2,h/2,31,12);c.fillStyle=hot?A:BG;c.fill();c.stroke();c.lineWidth=LW*.45;[[-40,-8,34],[18,-20,30],[50,18,22],[-20,30,24]].forEach(([bx,by,r])=>{c.beginPath();c.arc(bx,by,r,1.1*Math.PI,1.9*Math.PI);c.stroke()})}
      else{const L2=o.w||170,n=9;c.lineWidth=LW*.42;for(let i=0;i<n;i++){const k=(i-(n-1)/2)/((n-1)/2),ye=k*22,ym=k*9;c.beginPath();c.moveTo(-L2/2,ye);c.lineTo(-L2*.1,ym);c.lineTo(L2*.1,ym);c.lineTo(L2/2,ye);c.stroke()}c.lineWidth=LW*.7;box(-L2*.09,-16,L2*.18,32,4,hot?A:BG)}}
    else if(name==='chopsticks'){const to=o.to||[x+120,y-60],tx=(to[0]-x)/s*(o.flip?-1:1),ty=(to[1]-y)/s,d=Math.hypot(tx,ty)||1,nx=-ty/d*7,ny=tx/d*7;c.lineWidth=LW*.6;ln(-tx*.22-nx,-ty*.22-ny,tx-nx*.3,ty-ny*.3);ln(-tx*.22+nx,-ty*.22+ny,tx+nx*.3,ty+ny*.3)}
    else if(name==='stool'){const w=o.w||150,h=o.h||74;box(-w/2,-h,w,16,6);ln(-w/2+18,-h+16,-w/2+6,0);ln(w/2-18,-h+16,w/2-6,0);ret={top:y-h*s}}
    c.restore();return ret}

  /* ---------- 包袱后的定住 ---------- */
  function hold(t,t0,d,fn,o={}){d=Math.max(.9,d||0);const f=t0+.2,on2=t>=t0,tt=t>=f&&t<f+d?f:t,x=o.x??W/2,y=o.y??H/2,z=on2&&o.z?1+o.z:1;if(on2)sfx('thud',t0,.5);
    g.save();if(z!==1){g.translate(x,y);g.scale(z,z);g.translate(-x,-y)}
    try{fn(tt)}finally{if(o.lines&&on2){g.strokeStyle=INK;g.lineCap='round';g.lineWidth=8;const R=o.r||230;const sp=o.span||[0,2*Math.PI],nL=Math.max(3,Math.round(14*(sp[1]-sp[0])/(2*Math.PI)));for(let i=0;i<nL;i++){const a=sp[0]+(i+.5)/nL*(sp[1]-sp[0])+(rnd(i+5)-.5)*.18,r0=R+rnd(i+9)*30,r1=r0+40+rnd(i+13)*36;g.beginPath();g.moveTo(x+Math.cos(a)*r0,y+Math.sin(a)*r0);g.lineTo(x+Math.cos(a)*r1,y+Math.sin(a)*r1);g.stroke()}}g.restore()}
    return f+d}

  return {stick,beats,say,emote,prop,hold,on,POSES,INK,BG,ACC};
})();
