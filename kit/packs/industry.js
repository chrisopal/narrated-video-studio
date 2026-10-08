/* 风格包 · 产业图谱 —— 本项目自己实现
   深灰底、钢蓝结构线、一种安全橙只给“焦点”；切角方框、细线、编号，干净硬朗的工程感。
   题材：隐形冠军 / 专精特新企业、核心零部件、国产替代、产业链里的位置。
   组件只用 TH 的颜色（a1 焦点、a2 结构线、ink/dim/note 文字、card 卡片底、top 当“强调色上的字”），换成 blueprint、swiss 等主题也能用。
   用法：
   - chainMap(t, t0, {tiers:[{name, items:[…]}], focus, flow, label, x, y, w, h, gap, stagger, focusAt, itemH, size, speed})
       产业链层级图：一层一层从左到右出现，层间连线经中间节点汇合，flow 时连线上有流动的小点；focus 那一项到 focusAt 时变橙、
       上方弹出 label（缺省“它在这里”）并有脉冲框。返回 {done, focus:{x,y,w,h}}
   - robotBody(t, t0, {x, y, h, joints, hi, labels, side, hiAt, stagger, idle, labelDx})
       自己设计的通用人形机器人正面线稿（x,y 是两脚中点的地面，h 是身高）；先从脚到头逐件出现，hi 里的关节按顺序点亮（橙色 + 脉冲），
       labels:{关节:'说明'} 的关节点亮时引出标签；idle 缺省开（呼吸、手臂轻摆、头微动）。关节名 shoulder elbow wrist hand hip knee ankle waist neck。
       返回 {pos(关节, 'l'|'r') → [x,y]}
   - exploded(t, t0, dur, layers, {x, y, axis:'x'|'y', gap, labels, focus, k, back, center, labelGap})
       零件按层炸开、停住、在 t0+dur-0.6 前归位（back:false 不归位）；focus（层名或序号）那一层用橙色。layers=[{shape, r, r2, w, name, teeth, spin, at}]，
       shape：housing 外壳（带螺栓孔）| ring 圆环 | ringGear 内齿圈 | flex 柔性杯形齿轮（外齿）| gear 外齿轮 | wave 椭圆凸轮（波发生器）| disc 圆盘 | shaft 轴；
       r 外半径、r2 内孔半径、w 沿轴厚度、spin 自转角速度（弧度/秒）。炸开后每层引出名称（labels:false 不要，或给字符串数组覆盖）
   - shareRing(t, t0, [{name, value}], {focus, source, x, y, r, thick, title, unit, decimals, dur})
       份额环：扇区顺时针依次扫出，焦点扇区橙色并外移，其余退灰；外圈引线标签；中心是焦点的数；
       图下写“来源：…”，不给 source 时写“示意数据”
   - vsLocal(t, t0, {left:{title, lines, col}, right:{title, lines, col}, x, y, w, h, gap, tR, stagger, size})
       “进口 / 国产”两栏对比卡（h 不给就按条目数定高）：左栏钢蓝、右栏橙色，从两侧滑入，条目逐条出现，中间是流动的箭头
   - iconWall(t, t0, [{icon, label}], {x, y, cols, size, gap, stagger, hi})
       下游应用图标墙：自己画的线性图标逐个弹出，hi 指定的标签高亮；图标带小动作（车轮、风机叶片、烟、机械臂）。
       icon：car robot phone plane wind medical factory chip gear
   - icon(name, cx, cy, s, t, {col, acc, lw})   单个线性图标（s 是半边长）
   - heading(t, t0, '标题', {x, y, sz, t1})      场景标题：橙色竖条 + 钢蓝细线
   - badge(t, t0, '文字', x, y, {al, sz, col, t1})  切角细框小注（“示意图，未按比例”“虚构企业”这类）
   - on(ctx, fn)                                 临时把画笔换成 ctx（封面 art 里用；带文字的组件除外） */
window.PACK=window.PACK||{};window.PACK_INIT=window.PACK_INIT||[];
PACK.industry=(function(){
  let G=g;const TAU=Math.PI*2;
  function on(ctx,fn){const o=G;G=ctx;try{fn()}finally{G=o}}
  const C={bg0:'#15181c',bg1:'#24282d',ink:'#e8ecf0',steel:'#6fa3cf',orange:'#ff7a1a'};

  /* ---------- 底色：深灰渐变 + 极淡的工程网格 + 拉丝细纹，一次做好 ---------- */
  let _bg=null,_vg=null;
  function bgImg(){if(_bg)return _bg;const c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');
    const gr=x.createLinearGradient(0,0,0,H);gr.addColorStop(0,C.bg0);gr.addColorStop(1,C.bg1);x.fillStyle=gr;x.fillRect(0,0,W,H);
    for(let i=0;i<320;i++){x.fillStyle=`rgba(255,255,255,${(.006+rnd(i+5)*.012).toFixed(4)})`;x.fillRect(0,Math.floor(rnd(i)*H),W,1)}
    x.lineWidth=1;x.strokeStyle='rgba(150,180,210,.045)';x.beginPath();for(let i=40;i<W;i+=40){x.moveTo(i+.5,0);x.lineTo(i+.5,H)}for(let j=40;j<H;j+=40){x.moveTo(0,j+.5);x.lineTo(W,j+.5)}x.stroke();
    x.strokeStyle='rgba(150,180,210,.08)';x.beginPath();for(let i=200;i<W;i+=200){x.moveTo(i+.5,0);x.lineTo(i+.5,H)}for(let j=200;j<H;j+=200){x.moveTo(0,j+.5);x.lineTo(W,j+.5)}x.stroke();
    // 四角的切角框线和顶边刻度
    x.strokeStyle='rgba(111,163,207,.42)';x.lineWidth=2;const m=30,a=56;x.beginPath();
    [[m,m,1,1],[W-m,m,-1,1],[m,H-m,1,-1],[W-m,H-m,-1,-1]].forEach(([px,py,sx,sy])=>{x.moveTo(px,py+sy*a);x.lineTo(px,py+sy*12);x.lineTo(px+sx*12,py);x.lineTo(px+sx*a,py)});x.stroke();
    x.strokeStyle='rgba(111,163,207,.22)';x.lineWidth=1;x.beginPath();for(let i=120;i<W-100;i+=20){const l=i%200===0?10:5;x.moveTo(i+.5,m);x.lineTo(i+.5,m+l)}x.stroke();
    return _bg=c}
  function vgImg(){if(_vg)return _vg;const c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');const v=x.createRadialGradient(W/2,H/2,H*.45,W/2,H/2,H*1.05);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(0,0,0,.42)');x.fillStyle=v;x.fillRect(0,0,W,H);return _vg=c}
  addTheme('industry',{light:false,ink:C.ink,dim:'rgba(232,236,240,.55)',note:'rgba(214,224,234,.84)',a1:C.orange,a2:C.steel,a3:'#a3b1bf',chip:'rgba(111,163,207,.12)',
    sub:'rgba(12,14,17,.82)',subInk:'#f2f4f6',top:C.bg0,bot:C.bg1,card:'rgba(38,43,50,.94)',cardInk:C.ink,pillInk:C.bg0,hl:'rgba(255,122,26,.35)',
    f:{t:'H9',b:'H7',s:'H5',h:'KT',n:'RC'},
    bg(t){g.drawImage(bgImg(),0,0)},post(t){g.drawImage(vgImg(),0,0)}});

  /* ---------- 小工具 ---------- */
  function line(x1,y1,x2,y2){G.beginPath();G.moveTo(x1,y1);G.lineTo(x2,y2);G.stroke()}
  // 切角矩形：右上、左下两个角切掉
  function cham(x,y,w,h,c){c=Math.min(c,w/2,h/2);G.beginPath();G.moveTo(x,y);G.lineTo(x+w-c,y);G.lineTo(x+w,y+c);G.lineTo(x+w,y+h);G.lineTo(x+c,y+h);G.lineTo(x,y+h-c);G.closePath()}
  // 实心填充（先铺底色再罩一层 chip），保证遮挡关系
  function solid(){G.fillStyle=TH.top;G.fill();G.fillStyle=TH.chip;G.fill()}
  function fit(s,sz,maxW,w){return Math.max(32,Math.min(sz,sz*maxW/Math.max(1,tw(s,sz,w))))}
  function bz(p0,p3,u){const dx=(p3[0]-p0[0])*.5,p1=[p0[0]+dx,p0[1]],p2=[p3[0]-dx,p3[1]],v=1-u;
    return [v*v*v*p0[0]+3*v*v*u*p1[0]+3*v*u*u*p2[0]+u*u*u*p3[0],v*v*v*p0[1]+3*v*v*u*p1[1]+3*v*u*u*p2[1]+u*u*u*p3[1]]}
  function bzPath(p0,p3,k){if(k<=0)return;const n=28;G.beginPath();G.moveTo(p0[0],p0[1]);for(let i=1;i<=n;i++){const u=Math.min(k,i/n),q=bz(p0,p3,u);G.lineTo(q[0],q[1]);if(u>=k)break}G.stroke()}
  function chevron(x,y,s){G.beginPath();G.moveTo(x-s*.5,y-s);G.lineTo(x+s*.5,y);G.lineTo(x-s*.5,y+s);G.stroke()}

  /* ---------- 标题与小注 ---------- */
  function heading(t,t0,s,o={}){const x=o.x??80,y=o.y??110,sz=o.sz??44,k=eo(seg(t,t0,t0+.45))*(o.t1?1-seg(t,o.t1-.35,o.t1):1);if(k<=0)return;
    const w=tw(s,sz,TH.f.t);G.save();G.globalAlpha*=k;G.fillStyle=TH.a1;G.fillRect(x,y-sz*.8,8,sz*.9);G.globalAlpha*=.6;G.strokeStyle=TH.a2;G.lineWidth=2;line(x+26,y+20,x+26+(w+60)*eo(seg(t,t0+.1,t0+.8)),y+20);G.restore();
    txt(s,x+26-(1-k)*18,y,sz,TH.ink,TH.f.t,'left',k)}
  function badge(t,t0,s,x,y,o={}){const sz=o.sz??32,al=o.al||'left',k=eo(seg(t,t0,t0+.4))*(o.t1?1-seg(t,o.t1-.3,o.t1):1);if(k<=0)return;
    const w=tw(s,sz,TH.f.s),x0=al==='right'?x-w:al==='center'?x-w/2:x;G.save();G.globalAlpha*=k;G.strokeStyle=o.col||TH.dim;G.lineWidth=1.5;cham(x0-18,y-sz*1.02,w+36,sz*1.5,9);G.stroke();G.fillStyle=TH.a1;G.fillRect(x0-18,y-sz*1.02,5,sz*1.5-9);G.restore();
    txt(s,x,y,sz,o.ink||TH.note,TH.f.s,al,k)}

  /* ---------- 产业链层级图 ---------- */
  function chainMap(t,t0,o={}){const tiers=o.tiers||[],n=tiers.length;if(!n||t<t0)return null;
    const x=o.x??120,y=o.y??220,w=o.w??1680,h=o.h??640,gap=o.gap??120,st=o.stagger??.5,cw=(w-gap*(n-1))/n,ih=o.itemH??80,isz=o.size??36,hh=84,
      fAt=o.focusAt??(t0+st*(n-1)+.9),flab=o.label??'它在这里',fk=o.focus!=null?eo(seg(t,fAt,fAt+.5)):0;
    const top=y+hh+30,avail=h-hh-30,mx=Math.max(...tiers.map(tr=>(tr.items||[]).length+((tr.items||[]).includes(o.focus)?.8:0))),sp=Math.min(ih+30,avail/Math.max(1,mx)),blk=sp*mx-(sp-ih);
    // 所有层以最高的一层为准上下居中，保证焦点上方有放标签的空位
    const cols=tiers.map((tr,i)=>{const cx=x+i*(cw+gap),its=tr.items||[],fi=its.indexOf(o.focus),slots=its.length+(fi>=0?.8:0),bh=sp*slots-(sp-ih);let yy=top+(blk-bh)/2;
      const items=its.map((s,j)=>{if(j===fi)yy+=sp*.8;const b={s,x:cx,y:yy,w:cw,h:ih,focus:j===fi};yy+=sp;return b});return {cx,ti:t0+i*st,items,name:tr.name,fi,my:items.length?(items[0].y+items[items.length-1].y+ih)/2:top+blk/2}});
    // 层间连线：每一项连到中间节点，再从节点分到下一层每一项
    for(let i=0;i<n-1;i++){const A=cols[i],B=cols[i+1],kc=eo(seg(t,B.ti-.2,B.ti+.5));if(kc<=0)continue;const J=[A.cx+cw+gap/2,(A.my+B.my)/2],S=[];
      A.items.forEach(a=>S.push({p:[a.x+a.w,a.y+a.h/2],q:J,f:a.focus,d:0}));B.items.forEach(b=>S.push({p:J,q:[b.x,b.y+b.h/2],f:b.focus,d:1}));
      S.sort((a,b)=>a.f-b.f).forEach((s,j)=>{const hot=s.f?fk:0,kk=s.d?cl(kc*2-1):cl(kc*2);G.save();G.strokeStyle=hot>.01?TH.a1:TH.a2;G.globalAlpha*=hot>.01?lerp(.45,1,hot):.42;G.lineWidth=hot>.01?3.5:2;bzPath(s.p,s.q,kk);
        if(o.flow!==false&&kc>=1){G.fillStyle=G.strokeStyle;G.globalAlpha=Math.min(1,G.globalAlpha*2);for(let m=0;m<2;m++){const u=((t-t0)*(o.speed??.42)+j*.29+m*.5+i*.17)%1,q=bz(s.p,s.q,u);G.beginPath();G.arc(q[0],q[1],hot>.01?5.5:4,0,TAU);G.fill()}}G.restore()});
      G.save();G.globalAlpha*=kc;G.fillStyle=TH.a2;G.translate(J[0],J[1]);G.rotate(Math.PI/4);G.fillRect(-7,-7,14,14);G.restore()}
    // 每一层：编号 + 层名 + 钢蓝线，层与层之间的箭头
    cols.forEach((c,i)=>{const k=eo(seg(t,c.ti,c.ti+.45));if(k<=0)return;sfx('tick',c.ti,.5);
      const nw=numw('00',40)+14;numtxt(String(i+1).padStart(2,'0'),c.cx,y+44,40,TH.a2,'left',k);txt(c.name,c.cx+nw,y+44,fit(c.name,38,cw-nw,TH.f.t),TH.ink,TH.f.t,'left',k);
      G.save();G.globalAlpha*=k;G.strokeStyle=TH.a2;G.lineWidth=3;line(c.cx,y+68,c.cx+cw*k,y+68);if(i<n-1){G.lineWidth=4;G.lineCap='round';G.lineJoin='round';chevron(c.cx+cw+gap/2-8,y+30,12);chevron(c.cx+cw+gap/2+10,y+30,12)}G.restore();
      c.items.forEach((b,j)=>{const tb=c.ti+.15+j*.1,kb=eo(seg(t,tb,tb+.4));if(kb<=0)return;const hot=b.focus?fk:0;G.save();G.globalAlpha*=kb;G.translate(0,(1-kb)*14);
        G.fillStyle=TH.card;cham(b.x,b.y,b.w,b.h,14);G.fill();G.strokeStyle=TH.dim;G.lineWidth=2;G.stroke();
        if(hot>0){G.save();G.globalAlpha*=hot;G.strokeStyle=TH.a1;G.lineWidth=4;cham(b.x,b.y,b.w,b.h,14);G.stroke();G.fillStyle=TH.a1;G.fillRect(b.x,b.y,8,b.h-14);G.restore()}
        txt(b.s,b.x+b.w/2,b.y+b.h/2+isz*.36,fit(b.s,isz,b.w-40,TH.f.b),hot>.5?TH.a1:TH.cardInk,TH.f.b,'center');G.restore()})});
    // 焦点：脉冲框 + 上方的“它在这里”
    const fc=cols.find(c=>c.fi>=0);let fb=null;
    if(fc){fb=fc.items[fc.fi];if(fk>0){sfx('ding',fAt,.6);const p=((t-fAt)%1.6)/1.6,e=6+p*16;
      G.save();G.globalAlpha*=fk*(1-p)*.7;G.strokeStyle=TH.a1;G.lineWidth=2;cham(fb.x-e,fb.y-e,fb.w+2*e,fb.h+2*e,14+e*.5);G.stroke();G.restore();
      const sz=34,pw=tw(flab,sz,TH.f.t)+48,ph=54,mx=fb.x+fb.w/2,py=fb.y-ph-24;G.save();G.globalAlpha*=fk;G.translate(0,(1-fk)*12);G.fillStyle=TH.a1;cham(mx-pw/2,py,pw,ph,10);G.fill();
      G.beginPath();G.moveTo(mx-12,py+ph);G.lineTo(mx+12,py+ph);G.lineTo(mx,py+ph+14);G.closePath();G.fill();txt(flab,mx,py+ph/2+sz*.36,sz,TH.top,TH.f.t,'center');G.restore()}}
    return {done:fAt+.5,focus:fb}}

  /* ---------- 人形机器人线稿（自己设计的通用形象） ---------- */
  const JN={shoulder:'肩',elbow:'肘',wrist:'腕',hand:'手',hip:'髋',knee:'膝',ankle:'踝',waist:'腰',neck:'颈'};
  const JR={shoulder:3.8,elbow:3.1,wrist:2.5,hand:2.3,hip:3.7,knee:3.3,ankle:2.7,waist:3.1,neck:2.3};
  // 身高 100 个单位，原点在两脚中点的地面，向上为负
  function pose(t,idle){const b=idle?Math.sin(t*1.7)*.45:0,sw=idle?Math.sin(t*1.15)*.05:0,ht=idle?Math.sin(t*.8+1)*.05:0,P={b,ht};
    for(const s of [-1,1]){const k=s<0?'l':'r';P['ankle_'+k]=[s*9.5,-6];P['knee_'+k]=[s*10,-29];P['hip_'+k]=[s*9,-49];
      const sh=[s*16,-78+b],au=.12+s*sw,af=au-.16+s*sw*.6,el=[sh[0]+s*17*Math.sin(au),sh[1]+17*Math.cos(au)],wr=[el[0]+s*15*Math.sin(af),el[1]+15*Math.cos(af)];
      P['shoulder_'+k]=sh;P['elbow_'+k]=el;P['wrist_'+k]=wr;P['hand_'+k]=[wr[0]+s*5.5*Math.sin(af),wr[1]+5.5*Math.cos(af)];P['af_'+k]=af}
    P.waist=[0,-58.5+b*.7];P.neck=[0,-82.5+b];return P}
  function limb(p,q,w1,w2,lw){const dx=q[0]-p[0],dy=q[1]-p[1],l=Math.hypot(dx,dy)||1,nx=-dy/l,ny=dx/l;G.beginPath();G.moveTo(p[0]+nx*w1/2,p[1]+ny*w1/2);G.lineTo(q[0]+nx*w2/2,q[1]+ny*w2/2);G.lineTo(q[0]-nx*w2/2,q[1]-ny*w2/2);G.lineTo(p[0]-nx*w1/2,p[1]-ny*w1/2);G.closePath();solid();G.stroke();
    G.save();G.globalAlpha*=.45;G.lineWidth=lw*.7;line(p[0]+dx*.28+nx*w1*.22,p[1]+dy*.28+ny*w1*.22,p[0]+dx*.72+nx*w2*.22,p[1]+dy*.72+ny*w2*.22);G.restore()}
  function robotBody(t,t0,o={}){const x=o.x??960,y=o.y??900,h=o.h??700,u=h/100,idle=o.idle!==false,P=pose(t,idle),hi=o.hi||[],labels=o.labels||{},st=o.stagger??.45,hiAt=o.hiAt??t0+1.2;
    const joints=o.joints||['shoulder','elbow','wrist','hip','knee','ankle','hand','waist','neck'],S=(p)=>[x+p[0]*u,y+p[1]*u];
    const pos=(j,s='r')=>S(P[j+'_'+s]||P[j]||[0,0]);
    if(t<t0)return {pos};
    const lw=Math.max(2,h/290)/u,ap=i=>eo(seg(t,t0+i*.065,t0+i*.065+.3));
    G.save();G.translate(x,y);G.scale(u,u);G.lineJoin='round';G.lineCap='round';G.strokeStyle=TH.ink;G.lineWidth=lw;
    let pi=0;const part=fn=>{const a=ap(pi++);if(a<=0)return;G.save();G.globalAlpha*=a;G.translate(0,(1-a)*3);fn();G.restore()};
    for(const s of [-1,1])part(()=>{const a=P[s<0?'ankle_l':'ankle_r'];G.beginPath();G.moveTo(a[0]-s*4.5,-.2);G.lineTo(a[0]+s*7.5,-.2);G.lineTo(a[0]+s*6,-3.6);G.lineTo(a[0]+s*1.5,-5.2);G.lineTo(a[0]-s*4,-4.4);G.closePath();solid();G.stroke()});
    for(const k of ['l','r'])part(()=>limb(P['knee_'+k],P['ankle_'+k],7,5.6,lw));
    for(const k of ['l','r'])part(()=>limb(P['hip_'+k],P['knee_'+k],8.6,7,lw));
    part(()=>{G.beginPath();G.moveTo(-12,-56+P.b*.5);G.lineTo(12,-56+P.b*.5);G.lineTo(13,-50);G.lineTo(9,-45.5);G.lineTo(-9,-45.5);G.lineTo(-13,-50);G.closePath();solid();G.stroke();G.save();G.globalAlpha*=.45;line(-6,-49,6,-49);G.restore()});
    part(()=>{const b=P.b*.7;G.beginPath();G.rect(-7.5,-61+b,15,5.4);solid();G.stroke();G.save();G.globalAlpha*=.5;line(-7.5,-59.2+b,7.5,-59.2+b);line(-7.5,-57.4+b,7.5,-57.4+b);G.restore()});
    part(()=>{const b=P.b;G.beginPath();G.moveTo(-11.5,-82.5+b);G.lineTo(11.5,-82.5+b);G.lineTo(15.5,-78.5+b);G.lineTo(14,-67+b);G.lineTo(9.5,-60.5+b);G.lineTo(-9.5,-60.5+b);G.lineTo(-14,-67+b);G.lineTo(-15.5,-78.5+b);G.closePath();solid();G.stroke();
      G.save();G.globalAlpha*=.5;G.beginPath();G.moveTo(-9,-79+b);G.lineTo(-6,-71+b);G.lineTo(6,-71+b);G.lineTo(9,-79+b);G.stroke();line(-11,-65+b,11,-65+b);G.restore();
      G.save();G.strokeStyle=TH.a2;G.lineWidth=lw*1.2;G.beginPath();G.arc(0,-75.5+b,1.7,0,TAU);G.stroke();G.restore()});
    for(const k of ['l','r'])part(()=>limb(P['shoulder_'+k],P['elbow_'+k],6.2,5.4,lw));
    for(const k of ['l','r'])part(()=>limb(P['elbow_'+k],P['wrist_'+k],5.4,4.6,lw));
    for(const k of ['l','r'])part(()=>{const s=k==='l'?-1:1,hp=P['hand_'+k],af=P['af_'+k];G.save();G.translate(hp[0],hp[1]);G.rotate(-s*af);G.beginPath();G.roundRect(-2.4,-3.2,4.8,6.6,1.6);solid();G.stroke();G.save();G.globalAlpha*=.5;line(-s*2.4,-1,-s*3.6,1.6);line(-1,1.2,1,1.2);G.restore();G.restore()});
    part(()=>{const b=P.b;G.beginPath();G.rect(-2.6,-85.5+b,5.2,3.6);solid();G.stroke()});
    part(()=>{const b=P.b;G.save();G.translate(0,-85+b);G.rotate(P.ht);G.beginPath();G.moveTo(-6.5,-1);G.lineTo(-7,-9);G.lineTo(-4.5,-13);G.lineTo(4.5,-13);G.lineTo(7,-9);G.lineTo(6.5,-1);G.closePath();solid();G.stroke();
      G.save();G.globalAlpha*=.75;G.fillStyle=TH.a2;G.beginPath();G.roundRect(-5,-8.6,10,2.6,1.3);G.fill();G.restore();
      G.beginPath();G.rect(-8.6,-8.5,1.8,4.4);solid();G.stroke();G.beginPath();G.rect(6.8,-8.5,1.8,4.4);solid();G.stroke();G.restore()});
    // 关节
    const all=ap(pi);if(all>0){joints.forEach(j=>{const sides=P[j]?[null]:['l','r'],li=hi.indexOf(j),tl=li>=0?hiAt+li*st:1e9,kl=eo(seg(t,tl,tl+.35)),r=JR[j]||3;
      sides.forEach(s=>{const p=s?P[j+'_'+s]:P[j];G.save();G.globalAlpha*=all;
        G.beginPath();G.arc(p[0],p[1],r,0,TAU);solid();G.strokeStyle=TH.ink;G.stroke();G.beginPath();G.arc(p[0],p[1],r*.42,0,TAU);G.globalAlpha*=.6;G.stroke();G.restore();
        if(kl>0){sfx('pop',tl,.5);G.save();G.globalAlpha*=all*kl;G.fillStyle=TH.a1;G.strokeStyle=TH.a1;G.lineWidth=lw*1.4;G.beginPath();G.arc(p[0],p[1],r,0,TAU);G.globalAlpha*=.3;G.fill();G.globalAlpha/=.3;G.stroke();
          G.beginPath();G.arc(p[0],p[1],r*.45,0,TAU);G.fill();const q=((t-tl)%1.6)/1.6;G.globalAlpha*=(1-q)*.8;G.lineWidth=lw;G.beginPath();G.arc(p[0],p[1],r+q*5,0,TAU);G.stroke();G.restore()}})})}
    G.restore();
    // 标签：点亮时引出（左右两栏，按高度错开）
    const L=hi.filter(j=>labels[j]).map((j,i)=>{const side=(o.side&&o.side[j])||(i%2?'l':'r'),p=pos(j,side),tl=hiAt+hi.indexOf(j)*st;return {j,side,p,tl,ly:p[1]-12}});
    for(const sd of ['l','r']){const A=L.filter(a=>a.side===sd).sort((a,b)=>a.ly-b.ly);for(let i=1;i<A.length;i++)if(A[i].ly-A[i-1].ly<72)A[i].ly=A[i-1].ly+72}
    L.forEach(a=>{const dir=a.side==='r'?1:-1,lx=x+dir*(o.labelDx??h*.34),kd=eo(seg(t,a.tl+.1,a.tl+.45)),kt=eo(seg(t,a.tl+.35,a.tl+.7));if(kd<=0)return;
      const nm=JN[a.j]||a.j,s=labels[a.j],nw=tw(nm,34,TH.f.t),sw=tw(s,36,TH.f.b),tw2=nw+14+sw,ex=lx-dir*30,ey=a.ly+14;
      G.save();G.strokeStyle=TH.a1;G.lineWidth=2.5;G.lineCap='round';G.beginPath();G.moveTo(a.p[0],a.p[1]);const k1=cl(kd*1.6),k2=cl(kd*1.6-.6);G.lineTo(lerp(a.p[0],ex,k1),lerp(a.p[1],ey,k1));if(k2>0)G.lineTo(lerp(ex,lx+dir*tw2,k2),ey);G.stroke();G.restore();
      if(kt>0){const x0=dir>0?lx:lx-tw2;txt(nm,x0,a.ly,34,TH.a1,TH.f.t,'left',kt);txt(s,x0+nw+14,a.ly,36,TH.ink,TH.f.b,'left',kt)}});
    return {pos}}

  /* ---------- 爆炸图 ---------- */
  function exploded(t,t0,dur,layers,o={}){const n=layers.length;if(!n||t<t0)return;const x=o.x??960,y=o.y??540,ax=o.axis||'x',gap=o.gap??240,K=o.k??.34,c0=o.center??(n-1)/2,
      kin=eo(seg(t,t0,t0+.4)),tE=t0+.45,tB=t0+dur-1.3,fo=o.focus,back=o.back!==false,wmax=Math.max(...layers.map(l=>l.w||40)),rmax=Math.max(...layers.map(l=>l.r||80));
    const P=(a,v)=>ax==='x'?[x+a,y+v]:[x+v,y+a],pt=(a,r,f)=>P(a+r*K*Math.cos(f),r*Math.sin(f)),pq=(a,p,q)=>P(a+p*K,q);
    const ke=i=>{const a=tE+Math.abs(i-c0)*.12;return eio(seg(t,a,a+.8))*(back?1-eio(seg(t,tB,tB+.7)):1)};
    const ell=(a,r,f0=0,f1=TAU,mv=true)=>{const m=Math.max(24,Math.ceil(r/3));for(let i=0;i<=m;i++){const p=pt(a,r,f0+(f1-f0)*i/m);i===0&&mv?G.moveTo(p[0],p[1]):G.lineTo(p[0],p[1])}};
    const L=layers.map((l,i)=>({...l,i,w:l.w||40,r:l.r||80,u:(l.at||0)+(i-c0)*gap*ke(i)-wmax/2}));
    G.save();G.globalAlpha*=kin;G.lineJoin='round';G.lineCap='round';
    L.slice().sort((a,b)=>(b.u+b.w/2)-(a.u+a.w/2)||b.r-a.r).forEach(l=>{const {u,w,r}=l,r2=l.r2??0,ph=(l.spin||0)*(t-t0),sh=l.shape||'disc',hot=fo!=null&&(fo===l.name||fo===l.i),lw=hot?3:2.2;G.strokeStyle=hot?TH.a1:TH.ink;G.lineWidth=lw;
      if(sh==='wave'){const b=r*.84,shape=(a,sc)=>{G.beginPath();for(let i=0;i<=60;i++){const th=i/60*TAU,p0=r*sc*Math.cos(th),q0=b*sc*Math.sin(th),p=p0*Math.cos(ph)-q0*Math.sin(ph),q=p0*Math.sin(ph)+q0*Math.cos(ph),z=pq(a,p,q);i?G.lineTo(z[0],z[1]):G.moveTo(z[0],z[1])}G.closePath()};
        shape(u+w,1);solid();G.stroke();for(let i=5;i>0;i--){shape(u+w*i/6,1);G.fillStyle=TH.top;G.fill()}
        let qa=1e9,qb=-1e9;for(let i=0;i<72;i++){const th=i/72*TAU,q=r*Math.cos(th)*Math.sin(ph)+b*Math.sin(th)*Math.cos(ph);qa=Math.min(qa,q);qb=Math.max(qb,q)}
        for(const q of [qa,qb]){const p1=P(u,q),p2=P(u+w,q);line(p1[0],p1[1],p2[0],p2[1])}shape(u,1);solid();G.stroke();G.save();G.globalAlpha*=.6;shape(u,.8);G.stroke();G.restore();
        for(let i=0;i<16;i++){const th=i/16*TAU,p0=r*.9*Math.cos(th),q0=b*.9*Math.sin(th),z=pq(u,p0*Math.cos(ph)-q0*Math.sin(ph),p0*Math.sin(ph)+q0*Math.cos(ph));G.beginPath();G.arc(z[0],z[1],Math.max(2.5,r*.045),0,TAU);G.save();G.globalAlpha*=.7;G.stroke();G.restore()}
        G.beginPath();ell(u,r*.22);G.fillStyle=TH.top;G.fill();G.stroke();G.save();G.strokeStyle=TH.a2;G.lineWidth=3;const m1=pq(u,r*.3*Math.cos(ph),r*.3*Math.sin(ph)),m2=pq(u,r*.74*Math.cos(ph),r*.74*Math.sin(ph));line(m1[0],m1[1],m2[0],m2[1]);G.restore();return}
      // 柱体轮廓：前脸近半圈 → 顶边 → 背面远半圈 → 底边
      G.beginPath();ell(u,r,Math.PI/2,Math.PI*1.5);ell(u+w,r,-Math.PI/2,Math.PI/2,false);G.closePath();solid();G.stroke();
      G.save();G.globalAlpha*=.35;for(const f of [-1.05,-.75]){const p1=pt(u,r,f),p2=pt(u+w,r,f);line(p1[0],p1[1],p2[0],p2[1])}G.restore();
      // 前脸
      G.beginPath();ell(u,r);solid();G.stroke();
      const teeth=(rr,d,nT)=>{G.save();G.globalAlpha*=.8;G.lineWidth=1.6;G.beginPath();for(let i=0;i<nT;i++){const f=ph+i*TAU/nT,p1=pt(u,rr,f),p2=pt(u,rr+d,f);G.moveTo(p1[0],p1[1]);G.lineTo(p2[0],p2[1])}G.stroke();G.restore()};
      if(r2>0){G.beginPath();ell(u,r2);G.fillStyle=TH.top;G.fill();G.stroke();G.save();G.beginPath();ell(u,r2);G.clip();G.globalAlpha*=.5;G.beginPath();ell(u+w*(sh==='flex'?.92:1),r2);if(sh==='flex'){G.fillStyle=TH.chip;G.fill();G.stroke();G.beginPath();ell(u+w*.92,r2*.3);G.stroke()}else G.stroke();G.restore()}
      if(sh==='housing'){const rm=(r+(r2||r*.6))/2,hr=Math.max(4,(r-(r2||r*.6))*.16);for(let i=0;i<8;i++){const f=i/8*TAU+ph+Math.PI/8;G.beginPath();for(let k=0;k<=16;k++){const a=k/16*TAU,z=pq(u,rm*Math.cos(f)+hr*Math.cos(a),rm*Math.sin(f)+hr*Math.sin(a));k?G.lineTo(z[0],z[1]):G.moveTo(z[0],z[1])}G.fillStyle=TH.top;G.fill();G.stroke()}}
      if(sh==='ringGear')teeth(r2,-Math.max(5,(r-r2)*.35),l.teeth||56);
      if(sh==='flex'||sh==='gear')teeth(r,Math.max(5,r*.07),l.teeth||48);
      if(sh==='gear'&&!r2){G.beginPath();ell(u,r*.2);G.fillStyle=TH.top;G.fill();G.stroke()}
      if(sh==='disc'){G.save();G.globalAlpha*=.55;G.beginPath();ell(u,r*.62);G.stroke();G.beginPath();ell(u,r*.18);G.stroke();G.restore()}
      if(sh==='shaft'){G.save();G.strokeStyle=TH.a2;G.globalAlpha*=.8;const p1=pt(u,r*.6,Math.PI*1.25),p2=pt(u,r*.6,Math.PI*.25);line(p1[0],p1[1],p2[0],p2[1]);G.restore()}});
    G.restore();
    // 名称标签：炸开停稳后出现，归位前退场
    if(o.labels===false)return;const names=Array.isArray(o.labels)?o.labels:layers.map(l=>l.name||'');const tLab=tE+.75+Math.abs(n-1-c0)*.12;
    const ws=names.map(s=>tw(s,36,TH.f.t)),alt=ax==='x'&&gap<Math.max(...ws)+40;
    L.forEach((l,i)=>{const s=names[i];if(!s)return;const tl=tLab+i*.12,k=eo(seg(t,tl,tl+.35))*(back?1-seg(t,tB-.25,tB):1);if(k<=0)return;sfx('tick',tl,.4);
      const lg=o.labelGap??58,up=!(alt&&i%2),hot=fo!=null&&(fo===l.name||fo===l.i),lc=hot?TH.a1:TH.a2,tc=hot?TH.a1:TH.ink;G.save();G.globalAlpha*=k;G.strokeStyle=lc;G.lineWidth=2;
      if(ax==='x'){const a=P(l.u+l.w/2,up?-l.r:l.r),ly=up?y-rmax-lg:y+rmax+lg+30;line(a[0],a[1],a[0],up?ly+14:ly-40);G.fillStyle=lc;G.beginPath();G.arc(a[0],a[1],4,0,TAU);G.fill();G.restore();txt(s,a[0],ly,36,tc,TH.f.t,'center',k)}
      else{const a=P(l.u+l.w/2,l.r),lx=x+rmax+lg;line(a[0],a[1],lx-12,a[1]);G.fillStyle=lc;G.beginPath();G.arc(a[0],a[1],4,0,TAU);G.fill();G.restore();txt(s,lx,a[1]+13,36,tc,TH.f.t,'left',k)}})}

  /* ---------- 份额环 ---------- */
  function shareRing(t,t0,data,o={}){const k=eo(seg(t,t0,t0+.4));if(k<=0||!data.length)return;const x=o.x??960,y=o.y??520,r=o.r??210,th=o.thick??r*.3,dur=o.dur??1.4,unit=o.unit??'%',dec=o.decimals||0,
      tot=data.reduce((a,d)=>a+d.value,0)||1,p=eio(seg(t,t0+.25,t0+.25+dur)),tD=t0+.25+dur,fk=eo(seg(t,tD,tD+.45)),A0=-Math.PI/2;
    G.save();G.globalAlpha*=k;
    // 刻度圈
    G.strokeStyle=TH.dim;G.lineWidth=1.5;G.beginPath();for(let i=0;i<72;i++){const a=i/72*TAU,l=i%6?6:12;G.moveTo(x+Math.cos(a)*(r+10),y+Math.sin(a)*(r+10));G.lineTo(x+Math.cos(a)*(r+10+l),y+Math.sin(a)*(r+10+l))}G.stroke();
    G.globalAlpha*=.5;G.beginPath();G.arc(x,y,r-th-12,0,TAU);G.stroke();G.restore();
    let acc=0,gi=0;const AL=[.62,.45,.32,.22,.15],segs=data.map(d=>{const a0=A0+acc/tot*TAU;acc+=d.value;const a1=A0+acc/tot*TAU,f=d.name===o.focus;return {d,a0,a1,f,al:f?1:AL[Math.min(gi++,AL.length-1)]}});
    const sw=A0+p*TAU;
    segs.forEach(s=>{const e=Math.min(s.a1,sw);if(e<=s.a0)return;const ga=Math.min(.02,(s.a1-s.a0)*.2),am=(s.a0+s.a1)/2,off=s.f?12*fk:0,cx=x+Math.cos(am)*off,cy=y+Math.sin(am)*off;
      G.save();G.globalAlpha*=k*s.al;G.fillStyle=s.f?TH.a1:TH.ink;G.beginPath();G.arc(cx,cy,r,s.a0+ga,Math.max(s.a0+ga,e-ga));G.arc(cx,cy,r-th,Math.max(s.a0+ga,e-ga),s.a0+ga,true);G.closePath();G.fill();G.restore()});
    // 外圈标签
    const lab=segs.map((s,i)=>{const am=(s.a0+s.a1)/2,side=Math.cos(am)>=0?1:-1;return {s,i,am,side,ly:y+Math.sin(am)*(r+46)}});
    for(const sd of [-1,1]){const A=lab.filter(a=>a.side===sd).sort((a,b)=>a.ly-b.ly);A.forEach(a=>a.ly=cl(a.ly,y-r-40,y+r+40));for(let i=1;i<A.length;i++)if(A[i].ly-A[i-1].ly<62)A[i].ly=A[i-1].ly+62}
    lab.forEach(a=>{const tl=tD+.1+a.i*.15,kl=eo(seg(t,tl,tl+.4));if(kl<=0)return;const s=a.s,c=s.f?TH.a1:TH.ink,e1=[x+Math.cos(a.am)*(r+26),y+Math.sin(a.am)*(r+26)],e2x=x+Math.cos(a.am)*(r+46),lx=x+a.side*(r+74);
      G.save();G.globalAlpha*=k*kl;G.strokeStyle=s.f?TH.a1:TH.dim;G.lineWidth=2;G.beginPath();G.moveTo(e1[0],e1[1]);G.lineTo(e2x,a.ly);G.lineTo(lx,a.ly);G.stroke();G.restore();
      const v=fmt(s.d.value,dec)+unit,nm=s.d.name,nw=tw(nm,34,TH.f.b),vw=numw(v,40);
      if(a.side>0){txt(nm,lx+10,a.ly+12,34,c,TH.f.b,'left',kl);numtxt(v,lx+10+nw+12,a.ly+12,40,c,'left',kl)}else{numtxt(v,lx-10,a.ly+12,40,c,'right',kl);txt(nm,lx-10-vw-12,a.ly+12,34,c,TH.f.b,'right',kl)}});
    // 中心：焦点的数
    const F=segs.find(s=>s.f);if(F){const kc=eo(seg(t,t0+.4,tD));if(kc>0){numtxt(fmt(F.d.value*expo(seg(t,t0+.4,tD)),dec)+unit,x,y+r*.12,Math.round(r*.4),TH.a1,'center',kc);txt(F.d.name,x,y+r*.12+50,34,TH.ink,TH.f.b,'center',kc)}}
    if(o.title)txt(o.title,x,y-r-64,40,TH.ink,TH.f.t,'center',k);
    txt(o.source?'来源：'+o.source:'示意数据',x,y+r+82,32,TH.note,TH.f.s,'center',k);
    return tD+.25+segs.length*.15}

  /* ---------- 进口 / 国产 两栏对比 ---------- */
  function vsLocal(t,t0,o={}){const Lc=o.left||{},Rc=o.right||{},x=o.x??160,y=o.y??240,w=o.w??1600,gap=o.gap??120,cw=(w-gap)/2,tR=o.tR??t0+.5,st=o.stagger??.4,sz=o.size??38,hb=o.headH??88,h=o.h??hb+52+Math.max((Lc.lines||[]).length,(Rc.lines||[]).length,1)*sz*1.8;
    [[Lc,t0,x,-1,TH.a2],[Rc,tR,x+cw+gap,1,TH.a1]].forEach(([c,tc,cx,dir,col])=>{const k=eo(seg(t,tc,tc+.45));if(k<=0)return;sfx('whoosh',tc,.4);col=c.col||col;
      G.save();G.globalAlpha*=k;G.translate(dir*(1-k)*40,0);G.fillStyle=TH.card;cham(cx,y,cw,h,24);G.fill();G.save();G.clip();G.fillStyle=col;G.fillRect(cx,y,cw,hb);G.restore();G.strokeStyle=col;G.lineWidth=3;cham(cx,y,cw,h,24);G.stroke();
      const ti=c.title||'';txt(ti,cx+32,y+hb/2+15,fit(ti,42,cw-64,TH.f.t),TH.top,TH.f.t,'left');
      (c.lines||[]).forEach((s,j)=>{const tl=tc+.45+j*st,kl=eo(seg(t,tl,tl+.35));if(kl<=0)return;const ly=y+hb+68+j*sz*1.8,fs=fit(s,sz,cw-110,TH.f.b);G.save();G.globalAlpha*=kl;G.fillStyle=col;G.fillRect(cx+34,ly-fs*.48,12,12);txt(s,cx+64+(1-kl)*14,ly,fs,TH.cardInk,TH.f.b,'left');G.restore()});
      G.restore()});
    const km=eo(seg(t,tR,tR+.4));if(km>0){const mx=x+cw+gap/2,my=y+h/2;G.save();G.strokeStyle=TH.a1;G.lineWidth=5;G.lineCap='round';G.lineJoin='round';
      for(let i=0;i<3;i++){G.globalAlpha=km*(.25+.75*Math.max(0,Math.sin(t*3.2-i*.9)));chevron(mx+(i-1)*Math.min(22,gap/4),my,14)}G.restore()}
    return tR+.45+Math.max((Lc.lines||[]).length,(Rc.lines||[]).length)*st}

  /* ---------- 线性图标 ---------- */
  function icon(name,cx,cy,s,t,o={}){const col=o.col||TH.ink,acc=o.acc||TH.a1;G.save();G.translate(cx,cy);G.scale(s,s);G.lineWidth=(o.lw||Math.max(2.6,s*.055))/s;G.strokeStyle=col;G.fillStyle=acc;G.lineJoin='round';G.lineCap='round';
    const P=(pts,close)=>{G.beginPath();pts.forEach((p,i)=>i?G.lineTo(p[0],p[1]):G.moveTo(p[0],p[1]));if(close)G.closePath();G.stroke()},A=(x,y,r,a0=0,a1=TAU)=>{G.beginPath();G.arc(x,y,r,a0,a1);G.stroke()},AC=f=>{G.save();G.strokeStyle=acc;f();G.restore()};
    switch(name){
      case 'car':{P([[-.36,.3],[-.75,.3]]);P([[-.98,.3],[-1,.05],[-.92,-.1],[-.5,-.16],[-.26,-.46],[.32,-.46],[.56,-.16],[.9,-.08],[1,.06],[.98,.3],[.75,.3]]);P([[.34,.3],[-.36,.3]]);P([[.02,-.44],[.02,-.16]]);P([[-.46,-.16],[.54,-.16]]);
        for(const wx of [-.55,.55]){A(wx,.32,.19);const a=t*3;P([[wx+Math.cos(a)*.15,.32+Math.sin(a)*.15],[wx-Math.cos(a)*.15,.32-Math.sin(a)*.15]])}AC(()=>P([[.86,-.02],[.97,.02]]));break}
      case 'robot':{const a=Math.sin(t*1.3)*.12;P([[-.5,.86],[.5,.86],[.32,.64],[-.32,.64]],true);const j1=[0,.52],j2=[j1[0]-.72*Math.sin(.45+a),j1[1]-.72*Math.cos(.45+a)],j3=[j2[0]+.78*Math.cos(-.55-a),j2[1]+.78*Math.sin(-.55-a)];
        P([j1,j2]);P([j2,j3]);P([[j3[0],j3[1]],[j3[0]+.18,j3[1]-.1]]);P([[j3[0],j3[1]],[j3[0]+.2,j3[1]+.1]]);AC(()=>{A(j1[0],j1[1],.1);A(j2[0],j2[1],.09);A(j3[0],j3[1],.06)});break}
      case 'phone':{G.beginPath();G.roundRect(-.46,-.9,.92,1.8,.14);G.stroke();G.save();G.globalAlpha*=.5;G.beginPath();G.roundRect(-.34,-.72,.68,1.34,.05);G.stroke();G.restore();G.beginPath();G.arc(0,.79,.055,0,TAU);G.fill();AC(()=>P([[-.14,-.82],[.14,-.82]]));break}
      case 'plane':{P([[0,-.95],[.09,-.8],[.09,.62],[0,.88],[-.09,.62],[-.09,-.8]],true);P([[.09,-.15],[.95,.22],[.95,.34],[.09,.16]]);P([[-.09,-.15],[-.95,.22],[-.95,.34],[-.09,.16]]);P([[.07,.62],[.36,.8],[.36,.88],[.05,.8]]);P([[-.07,.62],[-.36,.8],[-.36,.88],[-.05,.8]]);
        AC(()=>{P([[.55,.12],[.55,.24]]);P([[-.55,.12],[-.55,.24]])});break}
      case 'wind':{P([[-.06,.95],[-.025,-.25]]);P([[.06,.95],[.025,-.25]]);P([[-.3,.95],[.3,.95]]);const hx=0,hy=-.32;for(let i=0;i<3;i++){const a=t*1.4+i*TAU/3,c=Math.cos(a),sn=Math.sin(a);P([[hx+c*.08,hy+sn*.08],[hx+c*.35-sn*.07,hy+sn*.35+c*.07],[hx+c*.68,hy+sn*.68],[hx+c*.35+sn*.03,hy+sn*.35-c*.03]],true)}AC(()=>A(hx,hy,.08));break}
      case 'medical':{G.save();G.translate(-.32,.28);G.rotate(-Math.PI/4);G.beginPath();G.roundRect(-.52,-.2,1.04,.4,.2);G.stroke();P([[0,-.2],[0,.2]]);G.save();G.globalAlpha*=.35;G.beginPath();G.roundRect(-.52,-.2,.52,.4,[.2,0,0,.2]);G.fill();G.restore();G.restore();
        const ph=(t*.8)%1;AC(()=>P([[-.1,-.5],[.15,-.5],[.27,-.82],[.42,-.2],[.55,-.5],[.95,-.5]]));G.beginPath();G.arc(lerp(-.1,.95,ph),-.5,.05,0,TAU);G.fill();break}
      case 'factory':{P([[-.95,.82],[.95,.82]]);P([[-.92,.82],[-.92,-.05],[-.55,.2],[-.55,-.05],[-.18,.2],[-.18,-.05],[.19,.2],[.19,.82]]);P([[.36,.82],[.36,-.62],[.62,-.62],[.62,.82]]);
        AC(()=>{for(const wx of [-.74,-.37])P([[wx,.42],[wx+.16,.42],[wx+.16,.58],[wx,.58]],true)});G.save();for(let i=0;i<3;i++){const q=((t*.35+i/3)%1);G.globalAlpha*=1;G.save();G.globalAlpha*=(1-q)*.8;A(.49+q*.25,-.72-q*.45,.06+q*.1);G.restore()}G.restore();break}
      case 'chip':{G.beginPath();G.rect(-.55,-.55,1.1,1.1);G.stroke();AC(()=>{G.beginPath();G.rect(-.25,-.25,.5,.5);G.stroke()});G.beginPath();for(let i=0;i<4;i++){const v=-.375+i*.25;G.moveTo(v,-.55);G.lineTo(v,-.8);G.moveTo(v,.55);G.lineTo(v,.8);G.moveTo(-.55,v);G.lineTo(-.8,v);G.moveTo(.55,v);G.lineTo(.8,v)}G.stroke();
        const q=Math.floor(t*2.5)%4;G.beginPath();G.arc(-.375+q*.25,-.8,.05,0,TAU);G.fill();break}
      default:{const a=t*.6;G.beginPath();for(let i=0;i<=40;i++){const f=a+i/40*TAU,rr=i%5<2?.8:.62;i?G.lineTo(Math.cos(f)*rr,Math.sin(f)*rr):G.moveTo(Math.cos(f)*rr,Math.sin(f)*rr)}G.closePath();G.stroke();AC(()=>A(0,0,.25))}}
    G.restore()}

  /* ---------- 下游应用图标墙 ---------- */
  function iconWall(t,t0,items,o={}){const n=items.length;if(!n||t<t0)return;const cols=o.cols??Math.min(4,n),s=o.size??200,gx=o.gap??56,cx=o.x??960,y0=o.y??260,st=o.stagger??.15,hi=[].concat(o.hi??[]),bk=s*.16;
    items.forEach((it,i)=>{const r=Math.floor(i/cols),c=i%cols,inRow=Math.min(cols,n-r*cols),rw=inRow*s+(inRow-1)*gx,tx=cx-rw/2+c*(s+gx),ty=y0+r*(s+gx+64),ti=t0+i*st,k=seg(t,ti,ti+.45);if(k<=0)return;sfx('pop',ti,.4);
      const on=hi.includes(it.label)||hi.includes(i),col=on?TH.a1:TH.dim,b=back(k);G.save();G.globalAlpha*=cl(k*2.5);G.translate(tx+s/2,ty+s/2);G.scale(.8+.2*b,.8+.2*b);
      G.fillStyle=TH.chip;cham(-s/2,-s/2,s,s,18);G.fill();G.strokeStyle=col;G.lineWidth=on?4:2.5;G.beginPath();[[-1,-1],[1,-1],[1,1],[-1,1]].forEach(([sx,sy])=>{const px=sx*s/2,py=sy*s/2;G.moveTo(px,py-sy*bk);G.lineTo(px,py);G.lineTo(px-sx*bk,py)});G.stroke();
      icon(it.icon,0,0,s*.3,t,{col:TH.ink,acc:on?TH.a1:TH.a2});G.restore();
      txt(it.label,tx+s/2,ty+s+50,fit(it.label,36,s+gx-12,TH.f.b),on?TH.a1:TH.ink,TH.f.b,'center',eo(seg(t,ti+.1,ti+.45)))});
    return t0+(n-1)*st+.45}

  return {chainMap,robotBody,exploded,shareRing,vsLocal,iconWall,icon,heading,badge,on};
})();
