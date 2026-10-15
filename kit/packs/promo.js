/* 风格包 · 宣传片的五种样子 —— 本项目自己实现
   同一套积木，五种“样子”（look）：配色、字体、底、字怎么进场、镜头怎么换、画框长什么样，一起换。按产品的特性选，选法见 templates/宣传片.md 和 templates/promo_looks.json。
     bold   大字撞色：纯色满屏、一个大词砸下来、硬切。工具、效率、直接的东西
     glass  暗场光感：深色底上两团游走的光、玻璃卡片、字一个个浮上来、换镜头时扫过一道光。智能、AI、有科技感的东西
     studio 影棚留白：暖白的底、宋体细字、东西立在台面上、镜头慢慢推、叠化。看得见摸得着的实物
     grid   工程网格：深蓝网格底、字是打出来的、带光标、按栏擦切。开发者工具、流程、讲精确的东西
     pop    彩块弹跳：一屏一个亮色、字一个个弹出来、圆从中间涨开换屏。课程、会员、内容、生活类的轻东西
   用法（t 全片时间，t0 开始时刻；宣传线里时刻从 beatT / barT 取）：
   use('glass')                      选样子；不调就用 brief.json 的 "look"（构建脚本传进来），再没有就是 bold。返回这套样子的配色
   scenes(t, [{at, fn(p, u)}])       按时刻换屏，换法跟着样子走。fn 里 p 是这一屏的配色 {bg, ink, dim, acc, card, line}，u 是这一屏过了几秒
   say(t, t0, '字', x, y, 字号, {al, col, font, anim, maxW})   一行字，进场方式跟着样子走（anim 可指定 slam / rise / fade / type / bounce）
   hero(t, t0, '大词', {sub, subAt, mark, y, sz})               一屏正中的大词，下面可以带一句；mark 是第二下的时刻：字底下扫出一道（一屏停得久时用它续一口气）
   feature(t, t0, 序号, '卖点名', '一句话')                      卖点题卡
   media(t, t0, 'phone|window|plinth', (x, y, w, h, u) => {…}, {cap, side})   一个画框（手机、窗口、台面），里面的内容自己画或放图放片段；cap 是旁边的一句话。返回画框的位置
   stat(t, t0, 数, '单位', '说的是什么', {note})                 一个大数，note 写来源或“示意”
   end(t, t0, {name, slogan, line, note})                       片尾：名字、口号、一行地址或行动号召
   note('演示画面')                                              固定在角上的小字（跨镜头保持同一句）
   LOOKS                                                        五种样子的配色和参数表；look.pre 是这套样子的字进场要用的秒数，想让字正好落在拍点上就写 t0 - look.pre */
window.PACK=window.PACK||{};window.PACK_INIT=window.PACK_INIT||[];
PACK.promo=(function(){
  const V=H>W,U=Math.min(W,H)/1080,SW=V?W-SAFE.l-SAFE.r:W,CX=V?SAFE.l+SW/2:W/2;   // U：按短边缩放；竖版按平台安全区（左右不对称，如视频号）取中线和宽度
  const MW=f=>V?SW*Math.min(.97,f+.11):W*f;   // 一行字最宽多少：横版按画面宽，竖版按安全区宽
  const hexA=(h,a)=>{const n=parseInt(h.slice(1),16);return `rgba(${n>>16},${n>>8&255},${n&255},${a})`};
  const sp=x=>{x=cl(x);return x>=1?1:1-Math.exp(-6.5*x)*Math.cos(8.5*x)};
  const LOOKS={
    bold:{pre:0.12,name:'大字撞色',font:'H9',hero:300,anim:'slam',cut:0,pals:[{bg:'#0e0e0e',ink:'#ffffff',dim:'#7a7a7a',acc:'#ff4d14'},{bg:'#ece6d8',ink:'#0e0e0e',dim:'#a39c8c',acc:'#ff4d14'},{bg:'#ff4d14',ink:'#0e0e0e',dim:'rgba(14,14,14,.5)',acc:'#ffffff'}]},
    glass:{pre:0.4,name:'暗场光感',font:'H7',hero:230,anim:'rise',cut:.4,pals:[{bg:'#070a1a',ink:'#eef3ff',dim:'rgba(238,243,255,.56)',acc:'#5ee2ff',acc2:'#8b5cff'}]},
    studio:{pre:0.55,name:'影棚留白',font:'SongB',hero:210,anim:'fade',cut:.5,pals:[{bg:'#f4f1ea',ink:'#1b1a18',dim:'rgba(27,26,24,.52)',acc:'#a8793a'}]},
    grid:{pre:0,name:'工程网格',font:'H7',hero:190,anim:'type',cut:.34,pals:[{bg:'#0b1220',ink:'#d9e6f7',dim:'rgba(217,230,247,.5)',acc:'#3ddc84'}]},
    pop:{pre:0.25,name:'彩块弹跳',font:'H9',hero:270,anim:'bounce',cut:.42,pals:[{bg:'#ffd84d',ink:'#1d1d2c',dim:'rgba(29,29,44,.55)',acc:'#ff4f6d'},{bg:'#7bdff2',ink:'#1d1d2c',dim:'rgba(29,29,44,.55)',acc:'#ff4f6d'},{bg:'#ff9fb5',ink:'#1d1d2c',dim:'rgba(29,29,44,.55)',acc:'#ffffff'},{bg:'#b9fbc0',ink:'#1d1d2c',dim:'rgba(29,29,44,.55)',acc:'#ff4f6d'},{bg:'#cdb4ff',ink:'#1d1d2c',dim:'rgba(29,29,44,.55)',acc:'#ffffff'}]}};
  Object.entries(LOOKS).forEach(([k,v])=>{v.id=k;v.pals.forEach(p=>{p.card=p.card||(k==='glass'?'rgba(255,255,255,.07)':k==='grid'?'rgba(61,220,132,.06)':'#ffffff');p.line=p.line||(k==='glass'?'rgba(255,255,255,.2)':k==='grid'?'rgba(61,220,132,.5)':hexA('#000000',.12))})});
  let L=LOOKS[window.LOOK_]||LOOKS.bold,SI=0,PAL=L.pals[0];
  function use(n){if(LOOKS[n])L=LOOKS[n];PAL=L.pals[0];return L}
  const pal=i=>L.pals[((i%L.pals.length)+L.pals.length)%L.pals.length];
  addTheme('promo',{light:false,ink:'#ffffff',dim:'rgba(255,255,255,.6)',note:'rgba(255,255,255,.8)',a1:'#ff4d14',a2:'#5ee2ff',a3:'#3ddc84',chip:'rgba(255,255,255,.08)',sub:'rgba(0,0,0,.8)',subInk:'#fff',top:'#000',bot:'#000',card:'#111',cardInk:'#fff',pillInk:'#000',hl:'#ffe24a',
    f:{t:'H9',b:'H7',s:'H5',h:'H9',n:'RC'},bg(t){g.fillStyle=pal(0).bg;g.fillRect(0,0,W,H)}});

  /* 每种样子的底 */
  function bgDraw(i,t){const p=pal(i);g.fillStyle=p.bg;g.fillRect(0,0,W,H);
    if(L.id==='glass'){const gr=g.createLinearGradient(0,0,W,H);gr.addColorStop(0,'#070a1a');gr.addColorStop(1,'#141a3c');g.fillStyle=gr;g.fillRect(0,0,W,H);
      [[.25+.12*Math.sin(t*.23),.3+.1*Math.cos(t*.19),p.acc,.3],[.78+.1*Math.cos(t*.17+1),.7+.12*Math.sin(t*.21+2),p.acc2,.34],[.55+.2*Math.sin(t*.13+3),.15+.05*Math.cos(t*.3),p.acc,.14]].forEach(([fx,fy,c,a])=>{const x=fx*W,y=fy*H,r=Math.max(W,H)*.42,q=g.createRadialGradient(x,y,0,x,y,r);q.addColorStop(0,hexA(c,a));q.addColorStop(1,hexA(c,0));g.fillStyle=q;g.fillRect(0,0,W,H)});
      g.fillStyle='rgba(255,255,255,.035)';for(let k=0;k<70;k++){const x=rnd(k)*W,y=(rnd(k+90)*H+t*(6+rnd(k+7)*10))%H;g.fillRect(x,y,2,2)}}
    else if(L.id==='studio'){const gr=g.createLinearGradient(0,0,0,H);gr.addColorStop(0,'#f7f5f0');gr.addColorStop(.62,'#f1eee7');gr.addColorStop(.63,'#e6e1d6');gr.addColorStop(1,'#efebe3');g.fillStyle=gr;g.fillRect(0,0,W,H);
      const v=g.createRadialGradient(CX,H*.45,H*.2,CX,H*.5,Math.max(W,H)*.75);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(60,50,30,.16)');g.fillStyle=v;g.fillRect(0,0,W,H)}
    else if(L.id==='grid'){g.strokeStyle='rgba(120,160,220,.1)';g.lineWidth=1;g.beginPath();const st=60*U;for(let x=(t*8)%st;x<=W;x+=st){g.moveTo(x,0);g.lineTo(x,H)}for(let y=0;y<=H;y+=st){g.moveTo(0,y);g.lineTo(W,y)}g.stroke();
      const sy=(t*140)%(H+300)-150,sg=g.createLinearGradient(0,sy-150,0,sy+150);sg.addColorStop(0,'rgba(61,220,132,0)');sg.addColorStop(.5,'rgba(61,220,132,.07)');sg.addColorStop(1,'rgba(61,220,132,0)');g.fillStyle=sg;g.fillRect(0,sy-150,W,300)}
    else if(L.id==='pop'){g.fillStyle=hexA('#ffffff',.28);[[.1,.16,90],[.9,.82,130],[.84,.14,60],[.12,.86,70]].forEach(([fx,fy,r],k)=>{g.beginPath();g.arc(fx*W+Math.sin(t*.8+k)*14,fy*H+Math.cos(t*.7+k*2)*14,r*U,0,7);g.fill()})}}

  /* 换屏：硬切 / 叠化加一道光 / 叠化 / 按栏擦开 / 一个圆涨开 */
  function scenes(t,list){let i=-1;list.forEach((s,j)=>{if(t>=s.at)i=j});if(i<0){bgDraw(0,t);return}
    list.forEach((s,j)=>{if(j>0&&t>=s.at)sfx('_cut',s.at,0)});   // 换屏的时刻记一笔，镜头节奏检查用（叠化量画面量不出来）
    const draw=j=>{SI=j;PAL=pal(j);bgDraw(j,t);const u=t-list[j].at;if(L.id==='bold'){const d=(list[j+1]?list[j+1].at:list[j].at+4)-list[j].at;g.fillStyle=PAL.acc;g.fillRect(0,H-16*U,W*cl(u/d),16*U)}list[j].fn(PAL,u)},cur=list[i],d=cur.cut??L.cut,k=i>0&&d>0?seg(t,cur.at,cur.at+d):1;
    if(k>=1){draw(i);return}
    if(i>0&&d>0)sfx('whoosh',cur.at,.3);draw(i-1);
    if(L.id==='glass'||L.id==='studio'){g.save();g.globalAlpha=eio(k);draw(i);g.restore();
      if(L.id==='glass'){const x=lerp(-W*.3,W*1.3,eio(k)),q=g.createLinearGradient(x-W*.18,0,x+W*.18,0);q.addColorStop(0,'rgba(255,255,255,0)');q.addColorStop(.5,'rgba(190,235,255,.22)');q.addColorStop(1,'rgba(255,255,255,0)');g.save();g.globalCompositeOperation='lighter';g.fillStyle=q;g.fillRect(0,0,W,H);g.restore()}}
    else if(L.id==='grid'){const n=12,cw=W/n;g.save();g.beginPath();for(let c=0;c<n;c++){const kk=eo(seg(k,c/n*.55,c/n*.55+.45));g.rect(c*cw,0,cw+1,H*kk)}g.clip();draw(i);g.restore()}
    else if(L.id==='pop'){const R=Math.hypot(W,H)*.62*eo(k);g.save();g.beginPath();g.arc(CX,H/2,R,0,7);g.clip();draw(i);g.restore();g.save();g.strokeStyle=pal(i).ink;g.lineWidth=14*U*(1-k);g.beginPath();g.arc(CX,H/2,R,0,7);g.stroke();g.restore()}
    else draw(i)}

  /* 一行字，进场方式跟着样子走 */
  function say(t,t0,s,x,y,sz,o={}){s=String(s);if(t<t0)return 0;const f=o.font||L.font,al=o.al||'left',an=o.anim||L.anim,col=o.col||PAL.ink;sz=vsz(sz);
    g.save();g.font=`${sz}px ${f}, H7`;let wd=g.measureText(s).width;if(o.maxW&&wd>o.maxW){sz=Math.max(32,Math.floor(sz*o.maxW/wd));g.font=`${sz}px ${f}, H7`;wd=g.measureText(s).width}
    const x0=al==='center'?x-wd/2:al==='right'?x-wd:x,ch=[...s],ws=ch.map(c=>g.measureText(c).width),tot=ws.reduce((a,b)=>a+b,0)||1,kx=wd/tot;g.fillStyle=col;g.textBaseline='alphabetic';g.textAlign='left';
    const prog=an==='slam'?seg(t,t0,t0+.12):an==='fade'?seg(t,t0,t0+.7):an==='type'?seg(t,t0,t0+ch.length*.045+.01):seg(t,t0,t0+(ch.length-1)*(an==='bounce'?.05:.035)+.4);
    if(REC){g.save();g.globalAlpha*=prog>=.6?1:prog;recText(s,x0,y,sz,'left');g.restore()}
    if(an==='slam'){const k=seg(t,t0,t0+.12),e=k*k*k,r=seg(t,t0+.12,t0+.22),bo=r>=1?0:Math.sin(r*Math.PI)*(1-r),sc=lerp(2.4,1,e)*(1-.04*bo),cx=x0+wd/2,cy=y-sz*.36;sfx('thud',t0+.12,o.gain??.8);g.globalAlpha*=cl(k*3);g.translate(cx,cy);g.scale(sc,sc);g.translate(-cx,-cy);g.fillText(s,x0,y)}
    else if(an==='fade'){const k=eio(seg(t,t0,t0+.7)),ls=lerp(.16,.02,k)*sz;g.globalAlpha*=k;const ex=ls*(ch.length-1);let cx=al==='center'?x0-ex/2:al==='right'?x0-ex:x0;ch.forEach((c,i)=>{g.fillText(c,cx,y+(1-k)*12);cx+=ws[i]*kx+ls})}
    else if(an==='type'){const n=Math.floor((t-t0)/.045),on=Math.min(ch.length,n);let cx=x0;ch.forEach((c,i)=>{if(i<on)g.fillText(c,cx,y);cx+=ws[i]*kx});if(on<ch.length&&n%3===0)sfx('tick',t0+on*.045,.25);
      const cxx=x0+ws.slice(0,on).reduce((a,b)=>a+b,0)*kx;if(on<ch.length||Math.floor((t-t0)*2.2)%2===0){g.fillStyle=o.caret||PAL.acc;g.fillRect(cxx+sz*.06,y-sz*.82,sz*.5,sz*.98)}}
    else{let cx=x0;ch.forEach((c,i)=>{const st=an==='bounce'?.05:.035,ti=t0+i*st;if(t<ti){cx+=ws[i]*kx;return}g.save();
        if(an==='bounce'){const k=sp(seg(t,ti,ti+.5)),mx=cx+ws[i]*kx/2,my=y-sz*.36;if(i===0)sfx('pop',t0,.5);g.globalAlpha*=cl(seg(t,ti,ti+.1));g.translate(mx,my);g.rotate((1-k)*.35*(i%2?1:-1));g.scale(k,k);g.translate(-mx,-my);g.fillText(c,cx,y)}
        else{const k=eo(seg(t,ti,ti+.45));g.globalAlpha*=k;if(k<1){g.shadowColor=PAL.acc;g.shadowBlur=28*(1-k)}g.fillText(c,cx,y+(1-k)*sz*.45)}
        g.restore();cx+=ws[i]*kx})}
    g.restore();return sz}

  function hero(t,t0,s,o={}){const y=o.y??H*.54,sz0=o.sz||L.hero*U*(V?.62:1),z=L.id==='bold'||L.id==='grid'?1:1+.03*seg(t,t0,t0+5);   // 软的样子：字落定后还在很慢地往前推
    g.save();g.translate(CX,y);g.scale(z,z);g.translate(-CX,-y);const sz=say(t,t0,s,CX,y,sz0,{al:'center',maxW:MW(.86),...o})||sz0;
    if(o.mark!=null&&t>=o.mark){const k=eo(seg(t,o.mark,o.mark+.35)),w=Math.min(MW(.86),tw(s,sz,o.font||L.font)),h=(L.id==='studio'?3:L.id==='glass'?8:L.id==='grid'?6:26)*U,yy=y+sz*.2;sfx('whoosh',o.mark,.3);   // 第二下：字底下扫出一道
      g.save();g.fillStyle=PAL.acc;if(L.id==='glass'){g.shadowColor=PAL.acc;g.shadowBlur=30}if(L.id==='pop'){rr(CX-w/2,yy,w*k,h,h/2);g.fill()}else g.fillRect(CX-w/2,yy,w*k,h);g.restore()}
    g.restore();
    if(o.sub)say(t,o.subAt??t0+.45,o.sub,CX,y+sz*.62+(o.mark!=null?30*U:0),Math.max(V?44:40,sz*.3),{al:'center',maxW:MW(.84),font:L.id==='studio'?'Song':L.id==='bold'||L.id==='pop'?'H7':L.font,col:L.id==='bold'||L.id==='pop'?PAL.ink:PAL.dim,anim:L.id==='bold'?'rise':L.anim})}

  /* 卖点题卡：序号、名字、一句话，装饰跟着样子走 */
  function feature(t,t0,n,name,line){const x=V?SAFE.l+16:W*.085,ns=String(n).padStart(2,'0'),p=PAL,k=eo(seg(t,t0,t0+.4)),y0=H*.36,nsz=110*U,sz=(L.id==='studio'?190:L.id==='grid'?170:230)*U*(V?.7:1);
    g.save();g.globalAlpha*=k;
    if(L.id==='glass'){g.strokeStyle=hexA(p.acc,.7);g.lineWidth=3;rr(x,y0-nsz*.9,nsz*1.5,nsz*1.1,nsz*.3);g.stroke();g.fillStyle=hexA(p.acc,.12);g.fill()}
    if(L.id==='pop'){g.fillStyle=p.acc;g.beginPath();g.arc(x+nsz*.62,y0-nsz*.36,nsz*.78*sp(seg(t,t0,t0+.5)),0,7);g.fill()}
    if(L.id==='grid'){g.fillStyle=p.acc;g.font=`${nsz*.7}px 'DejaVu Sans Mono', monospace`;g.fillText('>',x,y0-nsz*.08)}
    g.font=`800 ${nsz}px RC, H9`;g.fillStyle=L.id==='pop'?'#fff':L.id==='studio'?p.acc:p.acc;g.textBaseline='alphabetic';g.fillText(ns,x+(L.id==='grid'?nsz*.7:L.id==='glass'?nsz*.26:L.id==='pop'?nsz*.16:0),y0);g.restore();
    say(t,t0+.12,name,x,y0+sz*1.12,sz,{maxW:MW(.83)});
    const ry=y0+sz*1.36,rk=eo(seg(t,t0+.45,t0+.9));g.fillStyle=L.id==='studio'?p.ink:p.acc;if(L.id==='studio')g.fillRect(x,ry,W*.5*rk,2);else if(L.id==='grid'){g.fillRect(x,ry,MW(.83)*rk,3)}else g.fillRect(x,ry,W*.4*rk,(L.id==='glass'?6:22)*U);
    if(line)say(t,t0+.6,line,x,ry+96*U,(V?52:76)*U*(V?1/U:1),{maxW:MW(.83),font:L.id==='studio'?'Song':'H7',col:L.id==='bold'||L.id==='pop'?p.ink:p.dim,anim:L.id==='bold'?'rise':L.anim})}

  /* 画框：手机、窗口、台面。内容由 draw 画，裁在框里 */
  function media(t,t0,kind,draw,o={}){if(t<t0)return null;const p=PAL,side=o.side||(o.cap?'right':'center'),u=t-t0,capW=o.cap&&!V?W*.3:0;
    let w,h;if(kind==='phone'){h=H*(V?.5:.78);w=h*.5}else if(kind==='plinth'){h=H*(V?.46:.7);w=Math.min(W*.5,h*1.1)}else{w=V?SW:Math.min(W*(capW?.52:.74),1500*U);h=w*.58}
    const cx=V||!capW?CX:side==='right'?W-W*.06-w/2:W*.06+w/2,cy=H*(V?.5:.5),x=cx-w/2,y=cy-h/2,r=kind==='phone'?52*U:kind==='plinth'?0:22*U;
    let a=cl(seg(u,0,.2)),sc=1,dy=0,rot=0;
    if(L.id==='bold'){sc=lerp(1.25,1,eo(seg(u,0,.18)))}else if(L.id==='glass'){const k=eo(seg(u,0,.7));a=k;dy=(1-k)*60;sc=.96+.04*k}else if(L.id==='studio'){a=eio(seg(u,0,.8));sc=1+.035*seg(u,0,6)}
    else if(L.id==='grid'){a=1}else{const k=sp(seg(u,0,.7));dy=(1-k)*H*.5;rot=(1-k)*-.12;a=cl(seg(u,0,.12))}
    g.save();g.globalAlpha*=a;g.translate(cx,cy+dy);g.rotate(rot);g.scale(sc,sc);g.translate(-cx,-cy);
    if(kind==='plinth'){const fy=y+h*.93;g.save();g.fillStyle=L.id==='studio'?'rgba(60,45,20,.16)':hexA('#000000',.25);g.beginPath();g.ellipse(cx,fy,w*.42,h*.045,0,0,7);g.filter='blur(14px)';g.fill();g.restore();g.save();draw(x,y,w,h,u);g.restore()}
    else{// 框
      g.save();if(L.id==='pop'){g.fillStyle=p.ink;rr(x+16*U,y+18*U,w,h,r);g.fill()}else if(L.id!=='grid'){g.shadowColor=L.id==='glass'?hexA(p.acc,.35):'rgba(0,0,0,.28)';g.shadowBlur=(L.id==='glass'?70:50)*U;g.shadowOffsetY=18*U}
      g.fillStyle=L.id==='glass'?'rgba(14,20,44,.82)':L.id==='grid'?'rgba(8,14,26,.92)':'#ffffff';rr(x,y,w,h,r);g.fill();g.restore();
      g.save();rr(x,y,w,h,r);g.clip();const gk=L.id==='grid'?eo(seg(u,.15,.75)):1;if(gk<1){g.beginPath();g.rect(x,y,w,h*gk);g.clip()}
      let iy=y,ih=h;if(kind==='window'){const bh=54*U;g.fillStyle=L.id==='glass'?'rgba(255,255,255,.07)':L.id==='grid'?'rgba(61,220,132,.1)':'#ece8df';g.fillRect(x,y,w,bh);[0,1,2].forEach(i=>{g.fillStyle=L.id==='grid'?hexA(p.acc,.7-.2*i):['#ff5f57','#febc2e','#28c840'][i];g.beginPath();g.arc(x+30*U+i*28*U,y+bh/2,8*U,0,7);g.fill()});if(o.title)txt(o.title,x+w/2,y+bh*.68,30*U<32?32:30*U,L.id==='glass'||L.id==='grid'?p.dim:'#6b665c','H7','center');iy+=bh;ih-=bh}
      draw(x,iy,w,ih,u);g.restore();
      g.save();g.strokeStyle=L.id==='glass'?'rgba(255,255,255,.22)':L.id==='grid'?p.acc:L.id==='pop'?p.ink:'rgba(0,0,0,.1)';g.lineWidth=(L.id==='pop'?7:L.id==='grid'?2.5:2)*U;if(L.id==='grid'){g.setLineDash([2*(w+h)*eo(seg(u,0,.5)),4*(w+h)])}rr(x,y,w,h,r);g.stroke();g.restore();
      if(L.id==='grid'){g.fillStyle=p.acc;[[x,y],[x+w,y],[x,y+h],[x+w,y+h]].forEach(([px,py])=>g.fillRect(px-6*U,py-6*U,12*U,12*U))}}
    g.restore();
    if(o.cap){const tx=V?CX:side==='right'?W*.07:W-W*.07-capW,ty=V?y+h+110*U:H*.46,lines=[].concat(o.cap);lines.forEach((s,i)=>say(t,t0+.35+i*.25,s,tx,ty+i*(V?84:104)*U,(V?60:i?64:84)*U*(V?1/U:1),{al:V?'center':'left',maxW:V?MW(.86):capW,font:i&&L.id==='studio'?'Song':i?'H7':L.font,col:i?PAL.dim:PAL.ink,anim:L.id==='bold'?'rise':L.anim}))}
    return {x,y,w,h}}

  function stat(t,t0,v,unit,label,o={}){if(t<t0)return;const p=PAL,sz=(L.id==='studio'?360:440)*U*(V?.6:1),s=String(v),k=seg(t,t0,t0+.2);g.save();g.font=`800 ${sz}px RC, H9`;const wv=g.measureText(s).width;g.restore();
    const usz=Math.max(V?44:40,sz*.26),wu=unit?tw(unit,usz,L.id==='studio'?'SongB':'H9')+24*U:0,x0=CX-(wv+wu)/2,y=H*.56,a=cl(k*2.5),e=L.id==='studio'?eio(seg(t,t0,t0+.6)):1;
    g.save();g.globalAlpha*=L.id==='studio'?e:a;const sc=L.id==='bold'||L.id==='pop'?lerp(1.6,1,eo(k)):1;g.translate(CX,y-sz*.3);g.scale(sc,sc);g.translate(-CX,-(y-sz*.3));g.font=`800 ${sz}px RC, H9`;g.fillStyle=L.id==='studio'?p.ink:p.acc;g.textBaseline='alphabetic';if(L.id==='glass'){g.shadowColor=hexA(p.acc,.6);g.shadowBlur=50*U}
    if(REC)recText(s,x0,y,sz,'left');g.fillText(s,x0,y);g.restore();sfx('thud',t0+.1,.7);
    if(unit)say(t,t0+.12,unit,x0+wv+24*U,y,usz,{font:L.id==='studio'?'SongB':'H9',anim:'rise'});
    if(label)say(t,t0+.25,label,CX,y+usz*1.7,Math.max(V?44:40,sz*.19),{al:'center',font:L.id==='studio'?'Song':'H7',col:L.id==='bold'||L.id==='pop'?p.ink:p.dim,anim:'rise',maxW:MW(.84)});
    if(o.note)txt(o.note,CX,H-(V?SAFE.b+40:150*U),V?40:34,p.dim,'H7','center')}

  function end(t,t0,o={}){const p=PAL,sz=(L.id==='studio'?230:300)*U*(V?.62:1),y=H*.46;say(t,t0,o.name||'',CX,y,sz,{al:'center',maxW:MW(.84)});
    if(o.slogan)say(t,t0+.5,o.slogan,CX,y+sz*.6,Math.max(V?48:44,sz*.3),{al:'center',maxW:MW(.86),col:L.id==='studio'?p.acc:L.id==='bold'||L.id==='pop'?p.ink:p.acc,font:L.id==='studio'?'Song':'H7',anim:L.id==='bold'?'rise':L.anim});
    if(o.line)txt(o.line,CX,y+sz*.6+130*U,V?44:44*U<32?32:44*U,p.ink,'H7','center',eo(seg(t,t0+1,t0+1.4)));
    if(o.note)txt(o.note,CX,H-(V?SAFE.b+40:150*U),V?40:34,p.dim,'H7','center');
    const q=typeof pulse==='function'&&TL[0]&&TL[0]._grid?pulse(t,{decay:.25}):0;const dy=y-sz*1.05,r=TL[0]&&TL[0]._grid?(beatAt(t)/2)%1:(t*.5)%1;g.fillStyle=p.acc;g.beginPath();g.arc(CX,dy,(9+10*q)*U,0,7);g.fill();g.save();g.strokeStyle=p.acc;g.lineWidth=9*U*(1-r);g.globalAlpha*=(L.id==='studio'?.35:.7)*(1-r);g.beginPath();g.arc(CX,dy,(30+860*eo(r))*U,0,7);g.stroke();g.restore()}   // 名字上面一个点：每拍跳一下，每两拍荡开一圈

  function note(s){const p=PAL,sz=V?40:34,w=tw(s,sz,'H7')+40,x=W-(V?SAFE.r+24:48)-w,y=V?SAFE.t+20:44;g.fillStyle=L.id==='studio'?'rgba(27,26,24,.72)':'rgba(0,0,0,.6)';rr(x,y,w,sz*1.7,12);g.fill();txt(s,x+20,y+sz*1.2,sz,'#fff','H7')}

  return {use,scenes,say,hero,feature,media,stat,end,note,LOOKS,hexA,sp,pal,get look(){return L},get p(){return PAL}};
})();
