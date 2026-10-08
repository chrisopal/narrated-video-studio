/* 风格包 · 讲解员串场 —— 本项目自己实现
   一个本项目自己设计的卡通讲解员（短发、圆框眼镜、钢蓝工装夹克、胸袋里一支橙色笔）领着观众在图表和画面之间走。
   用在：商业史、企业故事（制造业“隐形冠军”一类的讲解片）、带情绪的知识讲解。讲解员可信、利落，不卖萌。
   规则：全片同一个讲解员；姿势硬切（这一帧还在指，下一帧已经摊手），不溶解、不补间，换姿势那 0.14 秒手边闪三道橙色短线；
        版式轮换（人左图右、人右图左、人小在角落、人大半身特写），换版式也是硬切；说话时嘴一张一合（硬切开合）；
        指向某个东西时手臂真的转过去对准它（按目标算角度），可加一条虚线引导和一个目标圈。
   主题名 host（浅色）：暖灰底 + 极淡的点阵；墨蓝字，橙色 a1 只给“正在讲的那个”，钢蓝 a2 是讲解员和图板的颜色，青绿 a3 辅助。
   用法（t 全片时间，t0 开始时刻；坐标是 1920×1080 画布）：
     host(t, x, y, {pose, talk, scale, flip, look, at, n, clip, blink})  画讲解员，(x,y) 是两脚中点；scale=1 时身高约 630 像素。
         pose：'stand|point|present|think|shrug|wave|count|cross|open'，或关键帧 [[时刻,'名字',{at,n,look}],…]（到点直接切，第一帧之前用第一个）
         talk：true 或 [[起,止],…] 时嘴动；flip:true 面朝左；at:[x,y] 指向的目标（point 姿势按它算手臂角度）；n 数手指个数（count）；
         look:[x,y] 眼睛看哪；clip:{x,y,r} 只在这个圆及其上半部以上画（角落小人用）
         返回 {x,y,s,flip,front,pose,cut,tip,hand,handL,head,mouth,top,shoulder}：tip 是指尖（只有 point 姿势有），cut 是离上次换姿势过了几秒
     pointTo(t, t0, h, [x,y], {line, r, gap, dot, col, t1, d})  指向：从讲解员指尖拉一条虚线到目标并画目标圈（r 半径，r≤40 时圈心带点）；h 是 host() 的返回值；line:false 只画圈
     layout(t, [{at, mode:'left|right|corner|close', side, fn(R, L)}], {set})  按时刻硬切版式，并画这个版式的布景（站台、角落圆框、特写大圆）；
         fn 拿到图表该放的区域 R={x,y,w,h} 和 L={mode,R,H,u,at,i,host(opts)}：L.host({pose,talk,at,…}) 在这个版式的位置画讲解员并返回关键点；
         corner 的 side:'br'（缺省，右下）或 'bl'；close 的 side:'l'（缺省，人在左）或 'r'。返回 L
     stagePanel(t, t0, R, {title, tag, d, t1, head})  图表承托板：白板 + 钢蓝标题条 + 橙色角标（如“示意”）；d>0 时 d 秒内从上往下展开；
         返回板内可用区域 {x,y,w,h}（kit 的 barChart/bigNumber/specTable/timeline 画在里面读得清）
     speechTag(t, t0, '关键词', h, {side, size, t1, dx, dy, x, y})  讲解员旁的一行关键词：深色标签 + 指向嘴的小尾巴 + 橙色下划线；
         side:0 在头顶（缺省），1/-1 在右/左侧；x,y 直接给标签左上角。返回标签框 {x,y,w,h}
     on(ctx, fn)  临时把图形画笔换成 ctx（封面 art 里画 host）；带文字的组件（stagePanel、speechTag）不支持
     poseAt(t, pose) → {name, t0, i, o}  解析姿势关键帧（当前是哪个姿势、从几秒开始）；POSES 姿势名列表；PAL 色板 */
window.PACK=window.PACK||{};window.PACK_INIT=window.PACK_INIT||[];
PACK.host=(function(){
  const PAL={ink:'#1c2430',a1:'#d9481c',a2:'#2c5b84',a3:'#2f8a72',paper0:'#f1efe9',paper1:'#e4e1d8',
    skin:'#ecb68f',skinD:'#d49a72',hair:'#25201e',jacket:'#2c5b84',jacketD:'#22486a',pants:'#2a313d',shoe:'#191d25',shirt:'#ffffff',line:'#1b212b',mouth:'#6a2a24'};
  let P=g;
  function on(ctx,fn){const o=P;P=ctx;try{fn()}finally{P=o}}
  const prr=(x,y,w,h,r)=>{P.beginPath();P.roundRect(x,y,w,h,r)};

  /* ---------- 主题：暖灰底 + 极淡点阵（离屏做一次） ---------- */
  let BG=null;
  function bgTex(){if(BG)return BG;BG=document.createElement('canvas');BG.width=W;BG.height=H;const c=BG.getContext('2d');
    const gr=c.createLinearGradient(0,0,0,H);gr.addColorStop(0,PAL.paper0);gr.addColorStop(1,PAL.paper1);c.fillStyle=gr;c.fillRect(0,0,W,H);
    c.fillStyle='rgba(28,36,48,.075)';for(let y=24;y<H;y+=48)for(let x=24;x<W;x+=48){c.beginPath();c.arc(x,y,2.2,0,7);c.fill()}
    return BG}
  addTheme('host',{light:true,ink:PAL.ink,dim:'rgba(28,36,48,.55)',note:'rgba(28,36,48,.8)',a1:PAL.a1,a2:PAL.a2,a3:PAL.a3,chip:'rgba(44,91,132,.10)',
    sub:'rgba(28,36,48,.88)',subInk:'#ffffff',top:PAL.paper0,bot:PAL.paper1,card:'#ffffff',cardInk:PAL.ink,pillInk:'#ffffff',hl:'rgba(217,72,28,.22)',
    f:{t:'H9',b:'H7',s:'H5',h:'KT',n:'RC'},
    bg(t){g.drawImage(bgTex(),0,0)}});

  /* ---------- 讲解员 ---------- */
  // 局部坐标：原点在两脚中点，y 向下为正（身体在负 y）；R 臂是“前手”（面朝的那一侧），flip 时整体镜像
  const SL=[-80,-438],SR=[80,-438],HEAD=[0,-547],UP=118,LO=108;
  const POSE={
    stand:  {L:[[-96,-335],[-98,-238],'down'],R:[[96,-335],[98,-238],'down']},
    point:  {L:[[-138,-342],[-76,-284],'fist'],R:null},
    present:{L:[[-96,-335],[-98,-238],'down'],R:[[160,-372],[252,-336],'palm']},
    think:  {L:[[-92,-338],[86,-352],'fist'],R:[[104,-346],[34,-486],'fist'],brow:'one',look:[.6,-.8],tilt:-.06},
    shrug:  {L:[[-150,-374],[-214,-454],'palm'],R:[[150,-374],[214,-454],'palm'],brow:'up',tilt:.07,lift:8},
    wave:   {L:[[-96,-335],[-98,-238],'down'],R:[[168,-498],[188,-620],'open'],R2:[[176,-494],[230,-600],'open']},
    count:  {L:[[-96,-335],[-98,-238],'down'],R:[[150,-380],[146,-512],'count']},
    cross:  {L:[[-104,-352],[60,-374],'fist'],R:[[104,-342],[-60,-358],'fist'],brow:'flat'},
    open:   {L:[[-140,-360],[-198,-318],'palm'],R:[[140,-360],[198,-318],'palm'],brow:'up'}};
  const POSES=Object.keys(POSE);
  function poseAt(t,p){if(!Array.isArray(p))return {name:p||'stand',t0:-1e9,i:0,o:{}};let k=p[0],i0=0;for(let i=0;i<p.length;i++)if(p[i][0]<=t){k=p[i];i0=i}return {name:k[1],t0:t<p[0][0]?-1e9:k[0],i:i0,o:k[2]||{}}}
  const talking=(t,tk)=>!tk?false:tk===true?true:tk.some(([a,b])=>t>=a&&t<b);
  function mouthOpen(t){const ph=Math.floor(t*8.5),r=rnd(ph*13+5);return r<.3?0:6+r*12}   // 每 1/8.5 秒硬切一次开合
  function seg2(a,b,lw,col){P.strokeStyle=col;P.lineWidth=lw;P.beginPath();P.moveTo(a[0],a[1]);P.lineTo(b[0],b[1]);P.stroke()}
  function limb(S,E,Hn,lw,col){P.lineCap='round';P.lineJoin='round';P.strokeStyle=PAL.line;P.lineWidth=lw+7;P.beginPath();P.moveTo(S[0],S[1]);P.lineTo(E[0],E[1]);P.lineTo(Hn[0],Hn[1]);P.stroke();
    P.strokeStyle=col;P.lineWidth=lw;P.beginPath();P.moveTo(S[0],S[1]);P.lineTo(E[0],E[1]);P.lineTo(Hn[0],Hn[1]);P.stroke()}
  function finger(x,y,a,len,lw=9){const ex=x+Math.cos(a)*len,ey=y+Math.sin(a)*len;P.lineCap='round';P.strokeStyle=PAL.line;P.lineWidth=lw+6;P.beginPath();P.moveTo(x,y);P.lineTo(ex,ey);P.stroke();P.strokeStyle=PAL.skin;P.lineWidth=lw;P.beginPath();P.moveTo(x,y);P.lineTo(ex,ey);P.stroke();return [ex,ey]}
  function hand(Hn,E,type,o){const a=Math.atan2(Hn[1]-E[1],Hn[0]-E[0]),[x,y]=Hn;let tip=null;
    // 袖口
    P.strokeStyle=PAL.shirt;P.lineWidth=8;P.lineCap='butt';P.beginPath();P.moveTo(x-Math.cos(a)*16-Math.sin(a)*12,y-Math.sin(a)*16+Math.cos(a)*12);P.lineTo(x-Math.cos(a)*16+Math.sin(a)*12,y-Math.sin(a)*16-Math.cos(a)*12);P.stroke();
    if(type==='point'){tip=finger(x,y,a,40);finger(x,y,a-1.2,14,8)}
    else if(type==='open'){for(let i=-2;i<=1;i++)finger(x,y,a+i*.3+.15,30,8);finger(x,y,a+1.3,18,8)}
    else if(type==='palm'){for(let i=0;i<3;i++)finger(x,y,a-.35+i*.32,24,8);finger(x,y,a-1.35,15,8)}
    else if(type==='count'){const n=cl(o.n||1,1,5);for(let i=0;i<n;i++)finger(x,y,-Math.PI/2+(i-(n-1)/2)*.26,34,8)}
    P.fillStyle=PAL.skin;P.strokeStyle=PAL.line;P.lineWidth=3.5;P.beginPath();P.arc(x,y,type==='fist'?18:17,0,7);P.fill();P.stroke();
    return tip}
  function host(t,x,y,o={}){
    const s=o.scale||1,fs=o.flip?-1:1,pk=poseAt(t,o.pose),po=Object.assign({},o,pk.o),name=POSE[pk.name]?pk.name:'stand',D=POSE[name],cut=t-pk.t0;
    const toL=p=>[(p[0]-x)/(s*fs),(p[1]-y)/s],toS=p=>[x+p[0]*s*fs,y+p[1]*s];
    const lift=D.lift||0,sl=[SL[0],SL[1]-lift],sr=[SR[0],SR[1]-lift];
    // 手臂
    let Ra=D.R,La=D.L,tipL=null;
    if(name==='wave'&&Math.floor(Math.max(0,cut)/.28)%2)Ra=D.R2;
    if(name==='point'){let ang=-.25;if(po.at){const T=toL(po.at);ang=Math.atan2(T[1]-sr[1],T[0]-sr[0])}ang=cl(ang,-1.35,1.05);
      const e=[sr[0]+Math.cos(ang+.12)*UP,sr[1]+Math.sin(ang+.12)*UP],hh=[e[0]+Math.cos(ang-.05)*LO,e[1]+Math.sin(ang-.05)*LO];Ra=[e,hh,'point']}
    // 视线
    let lk=D.look||[.5,.1];const lt=po.look||(name==='point'?po.at:null);if(lt){const T=toL(lt),dx=T[0]-HEAD[0],dy=T[1]-HEAD[1],m=Math.hypot(dx,dy)||1;lk=[dx/m,dy/m]}
    P.save();
    if(o.clip){const c=o.clip;P.beginPath();P.rect(c.x-c.r*4,0,c.r*8,c.y);P.arc(c.x,c.y,c.r,0,Math.PI*2);P.clip()}
    P.translate(x,y);P.scale(s*fs,s);P.lineJoin='round';
    // 腿和鞋
    P.fillStyle=PAL.pants;P.strokeStyle=PAL.line;P.lineWidth=3.5;prr(-60,-272,56,262,8);P.fill();P.stroke();prr(4,-272,56,262,8);P.fill();P.stroke();
    P.fillStyle=PAL.shoe;P.beginPath();P.ellipse(-38,-10,40,15,0,0,7);P.fill();P.beginPath();P.ellipse(38,-10,40,15,0,0,7);P.fill();
    // 身体（夹克 + 白衬衫 V 领 + 胸袋橙笔）
    P.save();P.translate(0,-lift*.5);
    P.fillStyle=PAL.jacket;P.strokeStyle=PAL.line;P.lineWidth=3.5;P.beginPath();P.moveTo(-34,-464);P.lineTo(-74,-454);P.quadraticCurveTo(-94,-448,-92,-420);P.lineTo(-74,-262);P.lineTo(74,-262);P.lineTo(92,-420);P.quadraticCurveTo(94,-448,74,-454);P.lineTo(34,-464);P.closePath();P.fill();P.stroke();
    P.fillStyle=PAL.shirt;P.beginPath();P.moveTo(-30,-464);P.lineTo(0,-376);P.lineTo(30,-464);P.closePath();P.fill();P.stroke();
    P.fillStyle=PAL.jacketD;P.beginPath();P.moveTo(-30,-464);P.lineTo(-44,-452);P.lineTo(-10,-392);P.closePath();P.fill();P.beginPath();P.moveTo(30,-464);P.lineTo(44,-452);P.lineTo(10,-392);P.closePath();P.fill();
    seg2([0,-376],[0,-264],3.5,PAL.line);P.fillStyle=PAL.line;P.beginPath();P.arc(-9,-330,4,0,7);P.arc(-9,-292,4,0,7);P.fill();
    P.fillStyle=PAL.a1;P.fillRect(42,-436,9,34);seg2([30,-404],[68,-404],3,PAL.line);
    P.restore();
    // 头（以脖子为轴可以轻轻歪一点）
    P.save();P.translate(0,-lift);P.fillStyle=PAL.skinD;P.fillRect(-17,-486,34,30);
    P.translate(0,-480);P.rotate(D.tilt||0);P.translate(0,480);
    P.fillStyle=PAL.skin;P.strokeStyle=PAL.line;P.lineWidth=3.5;P.beginPath();P.arc(-58,-542,13,0,7);P.fill();P.stroke();P.beginPath();P.arc(58,-542,13,0,7);P.fill();P.stroke();
    prr(-58,-612,116,132,44);P.fill();P.stroke();
    P.fillStyle=PAL.hair;P.beginPath();P.moveTo(-63,-548);P.lineTo(-63,-584);P.quadraticCurveTo(-62,-630,-6,-632);P.quadraticCurveTo(56,-634,63,-588);P.lineTo(63,-556);P.quadraticCurveTo(52,-588,14,-594);P.quadraticCurveTo(-24,-598,-44,-574);P.lineTo(-52,-548);P.closePath();P.fill();
    // 眼睛（眨眼）、眼镜、眉毛、鼻子、嘴
    const blink=o.blink!==false&&((t+(o.seed||0))%3.7)<.13,ex=lk[0]*5,ey=lk[1]*4;
    P.fillStyle=PAL.line;P.strokeStyle=PAL.line;
    if(blink){seg2([-31,-547],[-17,-547],4,PAL.line);seg2([17,-547],[31,-547],4,PAL.line)}else{P.beginPath();P.arc(-24+ex,-548+ey,5.5,0,7);P.arc(24+ex,-548+ey,5.5,0,7);P.fill()}
    P.lineWidth=4;P.beginPath();P.arc(-24,-548,18,0,7);P.stroke();P.beginPath();P.arc(24,-548,18,0,7);P.stroke();seg2([-6,-551],[6,-551],4,PAL.line);seg2([-42,-551],[-57,-554],4,PAL.line);seg2([42,-551],[57,-554],4,PAL.line);
    const bw=D.brow,bL=bw==='up'?-10:bw==='flat'?2:0,bR=bw==='up'||bw==='one'?-10:bw==='flat'?2:0;P.lineCap='round';
    seg2([-38,-575+bL],[-12,-578+bL+(bw==='flat'?3:0)],5,PAL.hair);seg2([12,-578+bR+(bw==='flat'?3:0)],[38,-575+bR],5,PAL.hair);
    P.strokeStyle=PAL.skinD;P.lineWidth=3.5;P.beginPath();P.moveTo(2,-534);P.quadraticCurveTo(-8,-520,4,-518);P.stroke();
    const mo=talking(t,o.talk)?mouthOpen(t):0;
    if(mo>0){P.fillStyle=PAL.mouth;P.strokeStyle=PAL.line;P.lineWidth=3.5;P.beginPath();P.moveTo(-17,-510);P.lineTo(17,-510);P.quadraticCurveTo(16,-510+mo*1.25,0,-510+mo*1.3);P.quadraticCurveTo(-16,-510+mo*1.25,-17,-510);P.closePath();P.fill();P.stroke()}
    else{P.strokeStyle=PAL.line;P.lineWidth=4;P.beginPath();if(name==='cross'||name==='think'){P.moveTo(-12,-503);P.lineTo(12,-503)}else{P.moveTo(-15,-506);P.quadraticCurveTo(0,-497,15,-506)}P.stroke()}
    P.restore();
    // 手臂在最前面（cross 先画左臂再画右臂，右臂压在上面）
    const arm=(Sh,A)=>{if(!A)return null;limb(Sh,A[0],A[1],A===Ra&&name==='point'?27:28,PAL.jacket);return hand(A[1],A[0],A[2],po)};
    arm(sl,La);tipL=arm(sr,Ra);
    // 换姿势那一下：手边三道短线（只在头 0.14 秒）
    if(pk.i>0&&cut>=0&&cut<.14){const hp=Ra?Ra[1]:sr;P.strokeStyle=PAL.a1;P.lineWidth=6;P.lineCap='round';for(let i=0;i<3;i++){const a=-2.3+i*.55;P.beginPath();P.moveTo(hp[0]+Math.cos(a)*34,hp[1]+Math.sin(a)*34);P.lineTo(hp[0]+Math.cos(a)*54,hp[1]+Math.sin(a)*54);P.stroke()}}
    P.restore();
    const out={x,y,s,flip:!!o.flip,front:fs,pose:name,cut,tip:tipL?toS(tipL):null,hand:toS(Ra?Ra[1]:sr),handL:toS(La?La[1]:sl),
      head:toS([HEAD[0],HEAD[1]-lift]),mouth:toS([0,-504-lift]),top:toS([0,-634-lift]),shoulder:toS(sr)};
    return out}

  /* ---------- 指向：虚线引导 + 目标圈 ---------- */
  function pointTo(t,t0,h,pt,o={}){if(t<t0||(o.t1!=null&&t>=o.t1))return 0;const k=eo(seg(t,t0,t0+(o.d??.22))),col=o.col||TH.a1,r=o.r||22,[tx,ty]=pt;
    P.save();P.lineCap='round';
    if(o.line!==false&&h&&h.tip){const [fx,fy]=h.tip,dx=tx-fx,dy=ty-fy,m=Math.hypot(dx,dy),gp=(o.gap??r+10);if(m>gp+12){const ex=fx+dx*(1-gp/m),ey=fy+dy*(1-gp/m);
      P.strokeStyle=col;P.lineWidth=5;P.setLineDash([4,14]);P.beginPath();P.moveTo(fx+dx*14/m,fy+dy*14/m);P.lineTo(lerp(fx+dx*14/m,ex,k),lerp(fy+dy*14/m,ey,k));P.stroke();P.setLineDash([])}}
    if(k>=.6){P.strokeStyle=col;P.lineWidth=5;P.beginPath();P.arc(tx,ty,r,0,7);P.stroke();if(o.dot??r<=40){P.fillStyle=col;P.beginPath();P.arc(tx,ty,6,0,7);P.fill()}}
    P.restore();return k}

  /* ---------- 版式：四种，硬切 ---------- */
  function place(mode,side){
    if(mode==='right')return {H:{x:1540,y:1012,s:1.1,flip:true},R:{x:80,y:96,w:1120,h:840}};
    if(mode==='corner'){const bl=side==='bl',cx=bl?182:1738;return {H:{x:cx,y:1004,s:.5,flip:!bl},ring:{x:cx,y:800,r:150},R:{x:bl?360:80,y:96,w:1480,h:840}}}
    if(mode==='close'){const r=side==='r';return {H:{x:r?1390:530,y:1535,s:2.1,flip:r},disc:{x:r?1390:530,y:560,r:470},R:{x:r?60:1110,y:120,w:750,h:800}}}
    return {H:{x:380,y:1012,s:1.1,flip:false},R:{x:720,y:96,w:1120,h:840}}}
  function setPiece(L){const {mode,H:h}=L;P.save();
    if(mode==='left'||mode==='right'){P.fillStyle='rgba(44,91,132,.08)';prr(h.x-200,250,400,800,200);P.fill();P.fillStyle='rgba(28,36,48,.07)';P.fillRect(0,1000,W,H-1000);P.fillStyle='rgba(28,36,48,.22)';P.fillRect(0,998,W,3);
      P.fillStyle='rgba(28,36,48,.16)';P.beginPath();P.ellipse(h.x,h.y-4,130,16,0,0,7);P.fill()}
    else if(mode==='corner'){const c=L.ring;P.fillStyle='rgba(28,36,48,.10)';P.beginPath();P.arc(c.x+8,c.y+10,c.r,0,7);P.fill();P.fillStyle='#ffffff';P.beginPath();P.arc(c.x,c.y,c.r,0,7);P.fill();
      P.fillStyle='rgba(44,91,132,.12)';P.fillRect(c.x-c.r,c.y+92,c.r*2,4);P.strokeStyle=TH.a2;P.lineWidth=7;P.beginPath();P.arc(c.x,c.y,c.r,0,7);P.stroke()}
    else if(mode==='close'){const c=L.disc;P.fillStyle='rgba(44,91,132,.10)';P.beginPath();P.arc(c.x,c.y,c.r,0,7);P.fill();P.strokeStyle='rgba(44,91,132,.22)';P.lineWidth=4;P.beginPath();P.arc(c.x,c.y,c.r+34,0,7);P.stroke()}
    P.restore()}
  function layout(t,keys,o={}){let i=0;for(let j=0;j<keys.length;j++)if(keys[j].at<=t)i=j;const k=keys[i],mode=k.mode||'left',pl=place(mode,k.side);
    const L={mode,R:pl.R,H:pl.H,ring:pl.ring,disc:pl.disc,u:t-k.at,at:k.at,i,key:k};
    L.host=(ho={})=>host(t,pl.H.x,pl.H.y,Object.assign({scale:pl.H.s,flip:pl.H.flip,clip:pl.ring},ho));
    if(o.set!==false)setPiece(L);if(k.fn)k.fn(pl.R,L);return L}

  /* ---------- 图表承托板 ---------- */
  function stagePanel(t,t0,R,o={}){if(t<t0||(o.t1!=null&&t>=o.t1))return null;const d=o.d||0,k=d?eo(seg(t,t0,t0+d)):1,hd=o.title?(o.head||76):0,{x,y,w}=R,h=Math.max(hd+8,R.h*k);
    g.save();g.fillStyle='rgba(28,36,48,.10)';rr(x+10,y+12,w,h,20);g.fill();g.fillStyle='#ffffff';rr(x,y,w,h,20);g.fill();g.strokeStyle='rgba(28,36,48,.18)';g.lineWidth=2;rr(x,y,w,h,20);g.stroke();
    if(o.title){g.save();rr(x,y,w,h,20);g.clip();g.fillStyle=TH.a2;g.fillRect(x,y,w,hd);g.restore();
      let tagW=0;if(o.tag){tagW=tw(o.tag,32,'H7')+36;g.fillStyle=TH.a1;rr(x+w-24-tagW,y+(hd-48)/2,tagW,48,24);g.fill();txt(o.tag,x+w-24-tagW/2,y+hd/2+11,32,'#ffffff','H7','center')}
      const room=w-56-(tagW?tagW+40:0),sz=Math.max(32,Math.min(42,42*room/Math.max(1,tw(o.title,42,'H9'))));txt(o.title,x+32,y+hd/2+sz*.36,sz,'#ffffff','H9')}
    g.restore();return {x:x+40,y:y+hd+28,w:w-80,h:R.h-hd-56}}

  /* ---------- 关键词标签 ---------- */
  function speechTag(t,t0,text,h,o={}){if(t<t0||(o.t1!=null&&t>=o.t1))return null;const sz=o.size||44,w=tw(text,sz,'H9')+sz*1.3,hh=Math.round(sz*1.75),side=o.side??0,s=h.s;
    let bx,by;if(o.x!=null){bx=o.x;by=o.y}
    else if(side===0){bx=h.top[0]-w/2;by=h.top[1]-hh-26}
    else{bx=side>0?h.head[0]+100*s+26:h.head[0]-100*s-26-w;by=h.head[1]-96*s-hh/2}
    bx=cl(bx+(o.dx||0),40,W-40-w);by=cl(by+(o.dy||0),40,950-hh);
    // 尾巴指向嘴（头顶时指向头顶）
    const ax=cl(side===0?h.top[0]:h.mouth[0],bx+30,bx+w-30),ay=by+hh/2,tx=side===0?h.top[0]:h.mouth[0],ty=side===0?h.top[1]-6:h.mouth[1],dx=tx-ax,dy=ty-ay,m=Math.hypot(dx,dy)||1,tl=Math.min(m*.45,46),px=-dy/m*14,py=dx/m*14;
    g.save();g.fillStyle=TH.ink;g.beginPath();g.moveTo(ax+px,ay+py);g.lineTo(ax+dx/m*(hh/2+tl),ay+dy/m*(hh/2+tl));g.lineTo(ax-px,ay-py);g.closePath();g.fill();
    rr(bx,by,w,hh,14);g.fill();const ku=eo(seg(t,t0+.08,t0+.38));g.fillStyle=TH.a1;g.fillRect(bx+sz*.65,by+hh-16,(w-sz*1.3)*ku,6);
    txt(text,bx+sz*.65,by+hh*.64,sz,'#ffffff','H9');g.restore();return {x:bx,y:by,w,h:hh}}

  return {host,pointTo,layout,stagePanel,speechTag,on,POSES,PAL,poseAt};
})();
