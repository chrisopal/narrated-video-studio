/* 风格包 · 口播版式 —— 本项目自己实现
   一条录好的口播配上跟着讲话走的画面：人像固定在一个角上，一张大卡片里的内容讲到哪换到哪，要点一条条累加，大字幕里关键词变色，底下一条进度。
   横版、竖版共用一份场景：坐标都从 stage() 给的卡片区域 R 取。口播线（brief.json 的 "mode":"talk"）的做法见 templates/口播片.md。
   用法（t 全片时间；at、t0 都是时刻，口播线里用 at('句id','词') 取）：
   stage(t, {name, topic, title:['第一行','第二行'], steps:[{label, at}], points:[{at, text}], clip:'talk'|null, tag:'名字条', side:'left'|'right', ar, kb}, R => {…})
        搭好整个版面：顶栏（名字、主题）、两行标题、大卡片（卡片顶上一条阶段条 steps，讲到哪亮到哪）、角上的口播画面、要点清单。
        回调里拿到卡片的内容区 R={x,y,w,h}，往里画。ar 是口播小窗的宽高比（缺省跟素材走；人站在画面中间一小条时写 1 或 .8）；kb:{z0, x0, y0} 把素材放大并对准人（z0 倍数，x0、y0 是人在素材里的位置 0..1）。clip 写 null 时画一个占位的人像框（样片用）。返回版面 {card, pip, V}
   swap(t, R, [{at, fn(R, u)}])            卡片内容按时刻换：旧的上移淡出，新的从下面进来；u 是这一块已经出现了几秒
   label(t, t0, R, '小标题', 颜色)          卡片左上的小标题（一根色条 + 一行字）；返回它下面可用的区域
   rows(t, R, [{at, title, sub, icon, tags:[{at, text}]}], {label})   一行一个对象，讲到谁谁亮；tags 是这一行里一个个弹出来的词
   tiles(t, R, [{at, title, sub, icon, draw(x,y,w,h,k)}], {label, head})   并排的几格（两到四格），各自在 at 出现；head 是上面的一句话
   verdict(t, R, {label, bad:[{at, text, icon}], good:{at, text, icon}})   上面两格“问题”（暖色），下面一条“结论”
   big(t, R, t0, ['一句话','可以两行'], {hl:['变色的词'], sz})         卡片正中的一句大字
   steps3(t, R, [{at, title, sub}], {label})                          一级一级往上的台阶（层次、阶段、递进）
   icon('flag|people|person|q|wave|map|check|cross|layers|bulb|eye', cx, cy, 大小, 颜色)   线条小图标
   caption(t, {sz})                        大字幕：按原话分行，句子的 hl 里的词变成强调色；底下画进度条。在 FILM 里写 subs: t => caption(t)
   动效：开场各部分依次入场；阶段条的亮块从上一格滑到这一格；卡片换内容时旧的收走、新的弹进来；大字从底线下面升上来，hl 的词底下扫过一道色；
        一行一个的高亮是渐变过去的；字幕随原声逐字点亮（说过的是实的，没说到的是淡的）。都只用 t 算，同一时刻画两遍一样。
   颜色：强调色跟主题走（TH.a1），企业色用 themePatch:{a1:'#…'}；问题色 TH.a2，辅助色 TH.a3 */
window.PACK=window.PACK||{};window.PACK_INIT=window.PACK_INIT||[];
PACK.talk=(function(){
  const V=H>W,INK='#15181c';
  addTheme('talk',{light:true,ink:INK,dim:'rgba(21,24,28,.56)',note:'rgba(21,24,28,.74)',a1:'#0b7a6e',a2:'#d9512c',a3:'#2f6fd0',chip:'rgba(21,24,28,.06)',
    sub:'rgba(21,24,28,.9)',subInk:'#fff',top:'#f6f3ec',bot:'#e7e3d8',card:'#ffffff',cardInk:INK,pillInk:'#fff',hl:'rgba(11,122,110,.22)',
    f:{t:'H9',b:'H7',s:'H5',h:'H9',n:'RC'},
    bg(t){grad(this.top,this.bot);const A=this.a1;   // 两团很淡的强调色慢慢游走，底不死
      [[.22+.1*Math.sin(t*.11),.18+.06*Math.cos(t*.13),.62],[.8+.08*Math.cos(t*.09+1),.72+.07*Math.sin(t*.12+2),.7]].forEach(([fx,fy,fr],i)=>{const x=fx*W,y=fy*H,r=fr*Math.max(W,H)*.6,gr=g.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,hexA(A,i?.05:.07));gr.addColorStop(1,hexA(A,0));g.fillStyle=gr;g.fillRect(0,0,W,H)});
      g.save();g.globalAlpha=.5;g.strokeStyle='rgba(21,24,28,.04)';g.lineWidth=1;g.beginPath();for(let x=0;x<=W;x+=90){g.moveTo(x,0);g.lineTo(x,H)}for(let y=0;y<=H;y+=90){g.moveTo(0,y);g.lineTo(W,y)}g.stroke();g.restore()}});
  const S=sz=>V?Math.max(40,sz):sz;                                   // 竖版最小 40 号
  function hexA(h,a){const n=parseInt(h.slice(1),16);return `rgba(${n>>16},${n>>8&255},${n&255},${a})`}
  const mixH=(a,b,k)=>{const A=parseInt(a.slice(1),16),B=parseInt(b.slice(1),16),m=s=>Math.round(lerp(A>>s&255,B>>s&255,cl(k)));return `rgb(${m(16)},${m(8)},${m(0)})`};
  const sp=x=>{x=cl(x);return x>=1?1:1-Math.exp(-6.5*x)*Math.cos(8.5*x)};       // 带一点过冲的弹簧，0→1
  const fitSz=(s,sz,maxW,f='H9',min=V?40:32)=>{const w=tw(s,sz,f);return w<=maxW?sz:Math.max(min,Math.floor(sz*maxW/w))};
  function box(x,y,w,h,r,fill,stroke,lw=3,shadow){g.save();if(shadow){g.shadowColor=`rgba(21,24,28,${shadow===true?.12:shadow})`;g.shadowBlur=40;g.shadowOffsetY=14}if(fill){g.fillStyle=fill;rr(x,y,w,h,r);g.fill()}g.restore();if(stroke){g.save();g.strokeStyle=stroke;g.lineWidth=lw;rr(x,y,w,h,r);g.stroke();g.restore()}}
  const around=(cx,cy,sc,rot,fn)=>{g.save();g.translate(cx,cy);if(rot)g.rotate(rot);g.scale(sc,sc);g.translate(-cx,-cy);fn();g.restore()};
  /* 从底线下面升上来的一行字：裁在这一行的格子里，k 0→1 */
  function riseIn(k,x0,yBase,w,sz,fn){if(k<=0)return;g.save();g.beginPath();g.rect(x0-8,yBase-sz*1.02,w+16,sz*1.32);g.clip();g.translate(0,(1-k)*sz*1.05);fn();g.restore()}

  /* 线条小图标：画在 s×s 的格子里，中心 (cx,cy)；k<1 时是一笔一笔画出来的 */
  function icon(name,cx,cy,s,col,k=1){if(k<=0)return;g.save();g.translate(cx,cy);g.scale(s/48,s/48);g.strokeStyle=col;g.fillStyle=col;g.lineWidth=3.6;g.lineCap='round';g.lineJoin='round';if(k<1)g.setLineDash([150*k,400]);g.beginPath();
    const P={flag(){g.moveTo(-12,18);g.lineTo(-12,-18);g.lineTo(14,-12);g.lineTo(-12,-2)},
      person(){g.arc(0,-9,8,0,7);g.moveTo(-15,18);g.quadraticCurveTo(-15,2,0,2);g.quadraticCurveTo(15,2,15,18)},
      people(){g.arc(-7,-8,7,0,7);g.moveTo(-20,17);g.quadraticCurveTo(-20,3,-7,3);g.quadraticCurveTo(6,3,6,17);g.moveTo(10,-13);g.arc(10,-8,6,-1.6,1.6);g.moveTo(13,4);g.quadraticCurveTo(21,6,21,17)},
      q(){g.arc(0,0,18,0,7);g.moveTo(-6,-6);g.quadraticCurveTo(-6,-12,0,-12);g.quadraticCurveTo(7,-12,7,-6);g.quadraticCurveTo(7,-1,0,2);g.lineTo(0,5);g.moveTo(0,11);g.lineTo(0,11.5)},
      wave(){[[-16,6],[-8,14],[0,20],[8,12],[16,6]].forEach(([x,h])=>{g.moveTo(x,-h);g.lineTo(x,h)})},
      map(){g.moveTo(-18,-12);g.lineTo(-6,-17);g.lineTo(6,-12);g.lineTo(18,-17);g.lineTo(18,12);g.lineTo(6,17);g.lineTo(-6,12);g.lineTo(-18,17);g.closePath();g.moveTo(-6,-17);g.lineTo(-6,12);g.moveTo(6,-12);g.lineTo(6,17)},
      check(){g.arc(0,0,18,0,7);g.moveTo(-8,0);g.lineTo(-2,7);g.lineTo(9,-7)},
      cross(){g.arc(0,0,18,0,7);g.moveTo(-7,-7);g.lineTo(7,7);g.moveTo(7,-7);g.lineTo(-7,7)},
      layers(){g.moveTo(0,-17);g.lineTo(18,-7);g.lineTo(0,3);g.lineTo(-18,-7);g.closePath();g.moveTo(-18,2);g.lineTo(0,12);g.lineTo(18,2);g.moveTo(-18,10);g.lineTo(0,20);g.lineTo(18,10)},
      bulb(){g.arc(0,-5,12,2.2,7.2);g.moveTo(-6,7);g.lineTo(-6,12);g.lineTo(6,12);g.lineTo(6,7);g.moveTo(-4,18);g.lineTo(4,18)},
      eye(){g.moveTo(-19,0);g.quadraticCurveTo(0,-17,19,0);g.quadraticCurveTo(0,17,-19,0);g.moveTo(6,0);g.arc(0,0,6,0,7)}};
    (P[name]||P.check)();g.stroke();g.restore()}
  function iconBox(name,x,y,s,col,k=1){box(x,y,s,s,s*.26,'#ffffff',hexA(INK,.12),2.5);icon(name,x+s/2,y+s/2,s*.58,col,k)}

  /* 版面：竖版从上到下是顶栏、标题、卡片、（口播 + 要点）、字幕、进度；横版一边一列是顶栏、标题、要点、口播，另一边是卡片 */
  function layout(o){const cid=o.clip===undefined?'talk':o.clip,c=cid&&typeof CLIPS!=='undefined'?CLIPS[cid]:null,ar=cl(o.ar||(c?c.w/c.h:4/3),.6,1.78),right=o.side==='right';
    if(V){const x0=Math.max(SAFE.l,48),x1=W-Math.max(SAFE.r,48),top=SAFE.t,bot=H-SAFE.b,ph=300,pw=Math.round(Math.min(ph*ar,470)),py=bot-160-ph,px=right?x1-pw:x0;
      return {V,x0,x1,top,bot,head:{y:top+58},title:{x:x0,y:top+178,sz:80,lh:100,w:x1-x0},card:{x:x0,y:top+330,w:x1-x0,h:py-28-(top+330)},pip:{x:px,y:py,w:pw,h:ph},
        pts:{x:right?x0:px+pw+26,y:py,w:x1-x0-pw-26,h:ph,row:70,sz:40,max:4},cap:{x:W/2,y:bot-44,sz:64,w:x1-x0},bar:{x:x0,y:bot+26,w:x1-x0}}}
    const x0=64,colW=500,cx0=x0+colW+44,ph=Math.min(300,Math.round(colW/ar)),pw=Math.round(Math.min(colW,ph*ar)),py=930-ph,lx=right?W-x0-colW:x0,cardX=right?x0:cx0,cardW=W-x0-cx0;
    return {V,x0,x1:W-x0,top:48,bot:1040,head:{y:96,x:lx},title:{x:lx,y:196,sz:58,lh:74,w:colW},card:{x:cardX,y:56,w:cardW,h:874},pip:{x:right?lx+colW-pw:lx,y:py,w:pw,h:ph},
      pts:{x:lx,y:360,w:colW,h:py-24-360,row:62,sz:34,max:Math.max(1,Math.floor((py-24-360-52)/62))},cap:{x:cardX+cardW/2,y:1004,sz:50,w:cardW},bar:{x:x0,y:1046,w:W-2*x0}}}

  let MARKS=[];   // 阶段条的时刻，进度条上画成刻度
  function stage(t,o,fn){const L=layout(o),A=TH.a1,hx=L.head.x??L.x0,E=(a,d=.5)=>seg(t,a,a+d);   // E：开场各部分依次入场
    MARKS=(o.steps||[]).map(s=>s.at);
    // 顶栏：名字牌 + 主题
    const hs=S(34),nw=tw(o.name||'',hs,'H9')+hs*.9,kh=eo(E(.05,.45));g.save();g.globalAlpha*=kh;g.translate(0,(1-kh)*-18);
    if(o.name){box(hx,L.head.y-hs*1.08,nw,hs*1.56,hs*.36,INK);txt(o.name,hx+hs*.45,L.head.y,hs,'#fff','H9')}
    if(o.topic){const tx=hx+(o.name?nw+18:0),mw=(L.V?L.x1:hx+L.title.w)-tx;g.save();g.beginPath();g.rect(tx,L.head.y-hs*1.2,mw,hs*1.8);g.clip();txt(o.topic,tx,L.head.y,S(32),TH.dim,'H7');g.restore()}
    g.restore();
    // 标题：两行，一行一行从底线下面升上来；第二行强调色
    (o.title||[]).slice(0,2).forEach((s,i)=>{const sz=fitSz(s,L.title.sz,L.title.w,'H9',L.V?52:40),yb=L.title.y+i*L.title.lh;riseIn(eo(E(.18+i*.14,.5)),L.title.x,yb,L.title.w,sz,()=>txt(s,L.title.x,yb,sz,i?A:TH.ink,'H9'))});
    // 卡片：升上来落定
    const C=L.card,kc=sp(E(.3,.8)),ac=cl(E(.3,.25));g.save();g.globalAlpha*=ac;g.translate(0,(1-kc)*46);box(C.x,C.y,C.w,C.h,40,TH.card,hexA(INK,.06),2,true);
    // 阶段条：一块亮底从上一格滑到这一格
    let top=C.y+34;const steps=o.steps||[];
    if(steps.length){let cur=-1;steps.forEach((s,i)=>{if(t>=s.at)cur=i});const sz=S(30),ph=sz*1.7;let x=C.x+36;const rc=steps.map((s,i)=>{const w=tw(s.label,sz,'H9')+sz*1.5,r={x,w};x+=w+38;return r});
      rc.forEach((r,i)=>{box(r.x,top,r.w,ph,ph/2,i<cur?hexA(A,.12):hexA(INK,.06));if(i<steps.length-1){g.fillStyle=i<cur?hexA(A,.4):hexA(INK,.16);g.fillRect(r.x+r.w+8,top+ph/2-1.5,22,3)}});
      if(cur>=0){const k=cur>0?eio(seg(t,steps[cur].at,steps[cur].at+.5)):1,a=rc[Math.max(0,cur-1)],b=rc[cur],ix=lerp(a.x,b.x,k),iw=lerp(a.w,b.w,k),st=Math.sin(k*Math.PI)*14;   // 滑的时候拉长一点
        g.save();g.shadowColor=hexA(A,.35);g.shadowBlur=18;g.shadowOffsetY=6;g.fillStyle=A;rr(ix-st/2,top,iw+st,ph,ph/2);g.fill();g.restore();
        rc.forEach((r,i)=>{const on=i===cur?k:i===cur-1?1-k:0;txt(steps[i].label,r.x+r.w/2,top+ph*.5+sz*.36,sz,on>.5?'#fff':i<cur?A:TH.dim,'H9','center')})}
      else rc.forEach((r,i)=>txt(steps[i].label,r.x+r.w/2,top+ph*.5+sz*.36,sz,TH.dim,'H9','center'));
      top+=ph+26;g.fillStyle=hexA(INK,.07);g.fillRect(C.x+36,top-12,C.w-72,2)}
    const R={x:C.x+36,y:top+8,w:C.w-72,h:C.y+C.h-34-(top+8)};
    if(fn){g.save();g.beginPath();g.rect(C.x+6,top-6,C.w-12,C.y+C.h-top);g.clip();fn(R);g.restore()}
    g.restore();
    // 口播画面：弹出来落定；名字条晚一点滑上来
    const Pp=L.pip,cid=o.clip===undefined?'talk':o.clip,kp=sp(E(.5,.8)),ap=cl(E(.5,.2));
    around(Pp.x+Pp.w/2,Pp.y+Pp.h/2,.82+.18*kp,0,()=>{g.globalAlpha*=ap;
      if(cid&&typeof CLIPS!=='undefined'&&CLIPS[cid])clip(cid,t,o.clipAt||0,Pp.x,Pp.y,Pp.w,Pp.h,{credit:false,r:28,col:'#ffffff',from:o.clipFrom||0,...(o.kb?{kb:o.kb}:{})});
      else{box(Pp.x,Pp.y,Pp.w,Pp.h,28,'#3a4650','#ffffff',4,true);g.save();rr(Pp.x,Pp.y,Pp.w,Pp.h,28);g.clip();const bob=Math.sin(t*2.1)*4+Math.sin(t*5.3)*1.5;person(Pp.x+Pp.w/2,Pp.y+Pp.h*.62+bob,Pp.h*.36,'#8fa3a0');g.restore();txt('口播画面占位',Pp.x+Pp.w-18,Pp.y+S(30)+10,S(26),'rgba(255,255,255,.7)','H5','right')}
      if(o.tag){const sz=S(28),w=tw(o.tag,sz,'H7')+sz,kt=eo(E(1,.4));g.save();g.globalAlpha*=kt;g.translate(0,(1-kt)*14);box(Pp.x+14,Pp.y+Pp.h-sz*1.5-14,w,sz*1.5,10,'rgba(21,24,28,.72)');txt(o.tag,Pp.x+14+sz/2,Pp.y+Pp.h-14-sz*.42,sz,'#fff','H7');g.restore()}});
    // 要点清单：讲到一条，从旁边滑进来一条，序号弹一下，边框亮一下再暗下去；放不下时只留最近的几条
    const Q=L.pts,pts=(o.points||[]).map((p,i)=>({...p,i})).filter(p=>t>=p.at),show=pts.slice(-Q.max),dir=o.side==='right'&&V?-1:1;
    if((o.points||[]).length){const hs2=S(30),hy=Q.y+hs2,ka=eo(E(.7,.4));g.save();g.globalAlpha*=ka;icon('layers',Q.x+hs2*.45,hy-hs2*.34,hs2*.9,A);txt(o.pointsTitle||'要点',Q.x+hs2+8,hy,hs2,A,'H9');g.restore();
      show.forEach((p,j)=>{const k=sp(seg(t,p.at,p.at+.6)),a=cl(seg(t,p.at,p.at+.18)),y=Q.y+S(30)+22+j*Q.row,h=Q.row-10,fl=1-seg(t,p.at+.4,p.at+1.6);if(a<=0)return;sfx('tick',p.at,.6);g.save();g.globalAlpha*=a;g.translate((1-k)*46*dir,0);
        box(Q.x,y,Q.w,h,16,'#ffffff',fl>0?hexA(A,.2+.8*fl):hexA(INK,.1),2.5,fl>0?.05+.1*fl:0);
        const nb=sp(seg(t,p.at+.12,p.at+.6));around(Q.x+h*.5,y+h/2,nb,0,()=>{g.fillStyle=A;g.beginPath();g.arc(Q.x+h*.5,y+h/2,h*.3,0,7);g.fill();g.font=`800 ${Math.round(h*.4)}px RC, H9`;g.fillStyle='#fff';g.textAlign='center';g.textBaseline='middle';g.fillText(String(p.i+1),Q.x+h*.5,y+h/2+1)});
        const sz=fitSz(p.text,Q.sz,Q.w-h-18,'H9');txt(p.text,Q.x+h*.92,y+h/2+sz*.36,sz,TH.ink,'H9');g.restore()})}
    return L}

  /* 卡片里的内容 */
  // 换内容：旧的往上收、变淡、略缩；新的晚一点从下面弹上来
  function swap(t,R,list,d=.34){let i=-1;list.forEach((s,j)=>{if(t>=s.at)i=j});if(i<0)return;const cur=list[i],u=t-cur.at,cx=R.x+R.w/2,cy=R.y+R.h/2;
    if(i>0&&u<d*.6){const k=eio(u/(d*.6));g.save();g.globalAlpha*=1-k;around(cx,cy,1-.03*k,0,()=>{g.translate(0,-22*k);list[i-1].fn(R,t-list[i-1].at)});g.restore()}
    const k=i>0?sp(seg(u,d*.35,d*.35+.55)):1,a=i>0?cl(seg(u,d*.35,d*.35+.2)):1;if(a<=0)return;if(i>0)sfx('whoosh',cur.at,.22);g.save();g.globalAlpha*=a;g.translate(0,(1-k)*34);cur.fn(R,u);g.restore()}
  function label(t,t0,R,s,col){const sz=S(30),k=eo(seg(t,t0,t0+.25)),k2=eo(seg(t,t0+.1,t0+.5)),c=col||TH.a1;if(k>0){g.fillStyle=c;const bh=sz*.9*k;rr(R.x,R.y+4+(sz*.9-bh)/2,8,bh,4);g.fill();
      if(k2>0){const w=tw(s,sz,'H9');g.save();g.beginPath();g.rect(R.x+14,R.y-6,(w+16)*k2,sz*1.5);g.clip();txt(s,R.x+22-(1-k2)*14,R.y+sz*.82,sz,c,'H9');g.restore()}}const dy=sz*1.5+10;return {x:R.x,y:R.y+dy,w:R.w,h:R.h-dy}}
  function tagPill(t,t0,s,x,y,sz){const w=tw(s,sz,'H9')+sz*1.1,h=sz*1.55;if(t>=t0){sfx('pop',t0,.5);const k=sp(seg(t,t0,t0+.5));g.save();g.globalAlpha*=cl(seg(t,t0,t0+.1));around(x+w/2,y+h/2,.5+.5*k,(1-k)*-.09,()=>{box(x,y,w,h,h/2,TH.a1,null,0,.1);txt(s,x+w/2,y+h/2+sz*.36,sz,'#fff','H9','center')});g.restore()}return w}
  // 讲到谁谁亮：亮和暗都是渐变过去的，亮的那一行左边长出一根色条、略微放大
  function rows(t,R,items,o={}){if(o.label)R=label(t,items[0].at-.2,R,o.label,o.col);const n=items.length,gap=14,rh=Math.min(V?178:230,(R.h-gap*(n-1))/n),A=TH.a1;
    items.forEach((r,i)=>{const y=R.y+i*(rh+gap),nx=items[i+1],on=eio(seg(t,r.at,r.at+.35))*(nx?1-eio(seg(t,nx.at,nx.at+.35)):1),seen=eo(seg(t,r.at-.1,r.at+.3)),ts=S(V?46:44),ss=S(V?40:32),is=V?50:64,pd=V?12:20;
      g.save();g.globalAlpha*=.38+.62*seen;around(R.x+R.w/2,y+rh/2,1+.012*on,0,()=>{
        box(R.x,y,R.w,rh,24,'#fff',hexA(INK,.12),2.5,.1*on);if(on>0){g.save();g.globalAlpha*=on;box(R.x,y,R.w,rh,24,hexA(A,.07),A,3.5);g.fillStyle=A;rr(R.x,y+rh*(.5-.28*on),7,rh*.56*on,3.5);g.fill();g.restore()}
        iconBox(r.icon||'person',R.x+22,y+pd,is,on>.5?A:TH.dim,eo(seg(t,r.at-.05,r.at+.55))||.001);txt(r.title,R.x+22+is+18,y+pd+is*.5+ts*.36,ts,TH.ink,'H9');
        if(r.sub){const tx=R.x+22+is+18+tw(r.title,ts,'H9')+18;txt(r.sub,tx,y+pd+is*.5+ss*.36,fitSz(r.sub,ss,R.x+R.w-20-tx,'H7'),TH.dim,'H7')}
        let x=R.x+22;const ty=y+pd+is+(rh-pd-is-S(30)*1.55)/2,tsz=S(30);(r.tags||[]).forEach(tg=>{const w=tw(tg.text,tsz,'H9')+tsz*1.1;if(x+w>R.x+R.w-16)return;tagPill(t,tg.at,tg.text,x,ty,tsz);x+=w+12})});
      g.restore()})}
  // 并排几格：一格一格弹出来，落地时影子收一下；格子里的图 draw(x,y,w,h,k) 的 k 从 0 到 1
  function tiles(t,R,items,o={}){if(o.label)R=label(t,items[0].at-.2,R,o.label,o.col);let y=R.y;
    if(o.head){const sz=fitSz(o.head,S(46),R.w,'H9'),t0=(o.headAt??items[0].at)-.1;riseIn(eo(seg(t,t0,t0+.45)),R.x,y+sz,R.w,sz,()=>txt(o.head,R.x,y+sz,sz,TH.ink,'H9'));y+=sz*1.7}
    const n=items.length,gap=18,w=(R.w-gap*(n-1))/n,h=Math.min(R.y+R.h-y,o.h||(V?330:420)),y0=y+(R.y+R.h-y-h)/2;
    items.forEach((it,i)=>{if(t<it.at)return;sfx('pop',it.at,.5);const k=sp(seg(t,it.at,it.at+.6)),x=R.x+i*(w+gap),ts=fitSz(it.title,S(V?44:40),w-28,'H9'),th=it.sub?ts*1.3+S(30)*1.5:ts*1.9,kd=seg(t,it.at+.12,it.at+1.1);
      g.save();g.globalAlpha*=cl(seg(t,it.at,it.at+.14));g.translate(0,(1-k)*30);around(x+w/2,y0+h/2,.86+.14*k,0,()=>{box(x,y0,w,h,26,it.fill||'#fff',it.stroke||hexA(INK,.12),2.5,.16*(1-seg(t,it.at+.2,it.at+1)));
        const ah=h-th-28;if(it.draw){g.save();it.draw(x+16,y0+16,w-32,ah,kd);g.restore()}else if(it.icon)icon(it.icon,x+w/2,y0+16+ah/2,Math.min(ah*.6,w*.4),it.col||TH.a1,eo(kd)||.001);
        const kt=eo(seg(t,it.at+.1,it.at+.5));riseIn(kt,x+8,y0+h-th+ts*.9,w-16,ts,()=>txt(it.title,x+w/2,y0+h-th+ts*.9,ts,it.col||TH.ink,'H9','center'));
        if(it.sub){const ss=fitSz(it.sub,S(30),w-24,'H7');txt(it.sub,x+w/2,y0+h-18,ss,TH.dim,'H7','center',eo(seg(t,it.at+.3,it.at+.7)))}});g.restore()})}
  function verdict(t,R,o){if(o.label)R=label(t,(o.bad[0]||o.good).at-.2,R,o.label,o.col||TH.a2);const B=TH.a2,n=o.bad.length,gap=18,w=(R.w-gap*(n-1))/n,bh=Math.min(V?210:260,R.h*.42),gh=Math.min(V?190:200,R.h*.36),y0=R.y+(R.h-bh-gh-22)/2;
    o.bad.forEach((b,i)=>{if(t<b.at)return;sfx('thud',b.at,.5);const k=sp(seg(t,b.at,b.at+.55)),x=R.x+i*(w+gap),sz=fitSz(b.text,S(V?46:44),w-28,'H9');g.save();g.globalAlpha*=cl(seg(t,b.at,b.at+.12));around(x+w/2,y0+bh/2,.84+.16*k,0,()=>{
      box(x,y0,w,bh,24,hexA(B,.1),hexA(B,.35),2.5);icon(b.icon||'q',x+w/2,y0+bh*.36,bh*.36,B,eo(seg(t,b.at+.1,b.at+.8))||.001);txt(b.text,x+w/2,y0+bh*.8,sz,B,'H9','center')});g.restore()});
    const G=o.good;if(G&&t>=G.at-.2){const k=sp(seg(t,G.at-.2,G.at+.45)),y=y0+bh+22,is=V?70:76;g.save();g.globalAlpha*=cl(seg(t,G.at-.2,G.at));g.translate(0,(1-k)*30);box(R.x,y,R.w,gh,24,'#fff',TH.a1,3.5,.1);iconBox(G.icon||'check',R.x+24,y+(gh-is)/2,is,TH.a1,eo(seg(t,G.at,G.at+.7))||.001);
      const ls=[].concat(G.text),sz=Math.min(...ls.map(s=>fitSz(s,S(V?44:42),R.w-is-70,'H9'))),lh=sz*1.32,ty=y+gh/2-(ls.length-1)*lh/2+sz*.36;ls.forEach((s,i)=>txt(s,R.x+24+is+22,ty+i*lh,sz,TH.ink,'H9'));g.restore()}}
  // 一行字里把 hl 的词换成强调色。mark 0..1：这些词底下扫过一道色（像荧光笔）
  function hlText(s,x,y,sz,hl,al='center',a=1,f='H9',mark=0){const parts=[];let rest=s;const words=(hl||[]).filter(w=>w&&s.includes(w));
    while(rest){let bi=-1,bw='';words.forEach(w=>{const i=rest.indexOf(w);if(i>=0&&(bi<0||i<bi)){bi=i;bw=w}});if(bi<0){parts.push([rest,0]);break}if(bi>0)parts.push([rest.slice(0,bi),0]);parts.push([bw,1]);rest=rest.slice(bi+bw.length)}
    const ws=parts.map(p=>tw(p[0],sz,f)),tot=ws.reduce((a,b)=>a+b,0);let cx=al==='center'?x-tot/2:al==='right'?x-tot:x;
    parts.forEach((p,i)=>{if(p[1]&&mark>0){g.save();g.globalAlpha*=a;g.fillStyle=hexA(TH.a1,.16);rr(cx-4,y-sz*.3,(ws[i]+8)*mark,sz*.46,sz*.12);g.fill();g.restore()}txt(p[0],cx,y,sz,p[1]?TH.a1:TH.ink,f,'left',a);cx+=ws[i]});return tot}
  // 卡片正中的一句大字：一行一行从底线下面升上来，hl 的词随后被扫一道色
  function big(t,R,t0,lines,o={}){lines=[].concat(lines);const sz=Math.min(...lines.map(s=>fitSz(s,o.sz||S(V?76:84),R.w-20,'H9'))),lh=sz*1.36,y0=R.y+R.h/2-(lines.length-1)*lh/2+sz*.36;
    lines.forEach((s,i)=>{const ti=t0+i*(o.gap??.45),k=eo(seg(t,ti,ti+.5));riseIn(k,R.x,y0+i*lh,R.w,sz,()=>hlText(s,R.x+R.w/2,y0+i*lh,sz,o.hl,'center',1,'H9',eo(seg(t,ti+.35,ti+.85))))})}
  function steps3(t,R,items,o={}){if(o.label)R=label(t,items[0].at-.2,R,o.label,o.col);const n=items.length,gap=14,rh=Math.min(V?170:200,(R.h-gap*(n-1))/n),A=TH.a1,y0=R.y+(R.h-(rh*n+gap*(n-1)))/2;
    items.forEach((r,i)=>{if(t<r.at-.2)return;const k=sp(seg(t,r.at-.2,r.at+.45)),nx=items[i+1],on=eio(seg(t,r.at,r.at+.35))*(nx?1-eio(seg(t,nx.at,nx.at+.35)):1),ind=(n-1-i)*(R.w*.09),y=y0+(n-1-i)*(rh+gap),x=R.x+ind,w=R.w-ind,ts=S(V?46:44),ss=S(V?40:32),ns=rh*.5;   // 第一级在最下面、最宽；越往上越窄
      g.save();g.globalAlpha*=cl(seg(t,r.at-.2,r.at));g.translate((1-k)*-44,0);box(x,y,w,rh,22,hexA(A,.08+.05*i),hexA(A,.25),2.5);if(on>0){g.save();g.globalAlpha*=on;box(x,y,w,rh,22,A,null,0,.14);g.restore()}
      const two=(fn)=>{fn(1-on,0);if(on>0)fn(on,1)};   // 字的颜色跟着底色渐变：深色画一遍，白色叠一遍
      two((a,wht)=>{g.save();g.globalAlpha*=a;g.font=`800 ${Math.round(ns)}px RC, H9`;g.fillStyle=wht?'rgba(255,255,255,.92)':A;g.textAlign='center';g.textBaseline='middle';g.fillText(String(i+1),x+rh*.5,y+rh/2+2);g.restore()});
      const tx=x+rh*.95,mw=x+w-20-tx;
      if(r.sub){const s1=fitSz(r.title,ts,mw,'H9'),s2=fitSz(r.sub,ss,mw,'H7');two((a,wht)=>{txt(r.title,tx,y+rh*.42,s1,wht?'#fff':TH.ink,'H9','left',a);txt(r.sub,tx,y+rh*.42+ss*1.25,s2,wht?'rgba(255,255,255,.86)':TH.dim,'H7','left',a)})}
      else{const s1=fitSz(r.title,ts,mw,'H9');two((a,wht)=>txt(r.title,tx,y+rh/2+ts*.36,s1,wht?'#fff':TH.ink,'H9','left',a))}g.restore()})}

  /* 大字幕 + 进度条。字幕是原话，随原声逐字点亮：说过的是实的，还没说到的是淡的；句子的 hl 里的词是强调色。不进文字检查（和引擎自己的字幕一样） */
  function caption(t,o={}){const L=layout(o),s=TL.find(s=>t>=s.t0&&t<s.t1),end=TL[TL.length-1].t1,B=L.bar,A=TH.a1;
    g.fillStyle=hexA(INK,.1);rr(B.x,B.y,B.w,8,4);g.fill();g.fillStyle=A;const bw=Math.max(8,B.w*cl(t/end));rr(B.x,B.y,bw,8,4);g.fill();
    MARKS.forEach(m=>{if(m<=0||m>=end)return;const x=B.x+B.w*m/end;g.fillStyle=t>=m?'#fff':hexA(INK,.28);g.fillRect(x-1.5,B.y-3,3,14)});g.fillStyle=A;g.beginPath();g.arc(B.x+bw,B.y+4,9,0,7);g.fill();
    if(!s)return;const ci=(s.chunks||[]).findIndex(c=>t>=c.t0&&t<c.t1);if(ci<0)return;const c=s.chunks[ci];if(!c.text)return;
    const sz=fitSz(c.text,o.sz||L.cap.sz,L.cap.w,'H9',V?44:36),kin=eo(cl((t-c.t0)/.16)),y=L.cap.y+(1-kin)*10,tot=tw(c.text,sz,'H9'),x0=L.cap.x-tot/2;
    let px=tot;   // 已经说到第几个字（按像素算，字和字之间平滑走）
    if(s.ct){let from=0;for(let j=0;j<ci;j++){const q=s.vo.indexOf(s.chunks[j].text,from);if(q>=0)from=q+s.chunks[j].text.length}const i0=s.vo.indexOf(c.text,from);
      if(i0>=0){const n=c.text.length,tt=j=>s.t0+s.ct[Math.min(s.ct.length-1,i0+j)]-.06,wd=j=>tw(c.text.slice(0,j),sz,'H9');let j=0;while(j<n&&t>=tt(j))j++;   // j：已经开口的字数
        if(j===0)px=0;else{const a=tt(j-1),b=j<n?tt(j):a+.22,f=b>a?cl((t-a)/(b-a)):1;px=lerp(wd(j-1),wd(j),f)}}}
    g.save();g.globalAlpha*=kin;hlText(c.text,L.cap.x,y,sz,s.hl,'center',.34);g.save();g.beginPath();g.rect(x0-10,y-sz*1.1,px+10,sz*1.5);g.clip();hlText(c.text,L.cap.x,y,sz,s.hl,'center',1);g.restore();g.restore()}

  return {stage,swap,label,rows,tiles,verdict,big,steps3,icon,caption,layout,hexA,riseIn,sp};
})();
