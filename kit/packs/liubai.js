/* 风格包 · 史书留白（竖屏人物小传）—— 本项目自己实现，出自小红书账号《史书留白》的《师饶的一年》
   做旧米黄纸、细黑双线框、木刻线描插画；黑、靛蓝、朱红三色，竹简用霞鹜文楷手写。版面固定为五层，从上到下：
   刊头（账号名 + 朱印 + 右侧年份）→ 时间线（醒目，红笔刷标出“此刻在一年/一生的哪一段”）→ 地点题签 → 画心（场景、镜头、转场）→ 字幕 →（遮挡区里）口号。
   用法（t 全片时间，t0 开始时刻；竖版坐标全部从 safeBox() 推出，换 9:16 / 3:4 不用改）：
   layout()                                   返回版面各层的位置 {B, head, bar, place, art:{x,y,w,h,cx,cy}, slogan}
   config({timebar:false})                    不用时间线的片子（时间只在刊头右侧按转折点换）：在 scenes.js 顶层调用一次，题签和画心上移、画心变高
   masthead(t, {name:'史书留白', seal:'留白', right:'元延二年 · 前11年', rightKeys:[{at,text}]})  刊头；右侧标签可按时刻换
   timebar(t, keys, {n:12, ends:['正月','十二月'], major:3})  醒目的时间线：keys=[{at, lo, hi, mark, cap, fill, dim, d}]（单位是格，0..n；d 是从上一组变过来用几秒，缺省 0.8）
                                              lo..hi 红笔刷标出一段（只用来表示事情发生的时段；统计范围、资料覆盖年份不要用红段），mark 是红色墨点的位置，cap 是墨点上方的题签（≥44 像素），fill 是从头涂到哪，dim 整条变淡（0..1）；相邻两组之间 0.8 秒缓动
   place(t, keys)                             地点/章节题签：keys=[{at, text}]，换题签时左右两道朱线收放
   stage(t, scenes)                           画心：scenes=[{a, b, draw(t, box), tr:'fade|ink|scroll', cam:(t)=>[缩放, 焦点x, 焦点y], at:[x,y], opaque}]
                                              每场先铺一层纸（opaque:false 不铺），新场完整盖住旧场；
                                              每场在 a 进、b 出；tr 是进场方式（墨晕从 at 点洇开 / 卷轴展开 / 淡入）；cam 是镜头推拉
   slogan(t, {text, seal, col, size})         账号口号：朱红大字，放在字幕下面、远离画心，两侧朱线、下压一方印，按品牌字登记（允许在平台遮挡区）
   slip(t, t0, {x, y, w, h, text, size, rate, col})   一枚竹简，字一个个写出来（rate 字/秒）；返回写完的时刻
   calendar(t, {box, lens, days, t0, dur, home, redA, a})  历谱格子：lens 每月天数，days=[[月,日],…] 按顺序盖上朱红，home=[月,日] 描黑框的那一格
   counter(t, t0, {x, y, lines:[['出差',16,'次'],['',161,'天']], dur})  数字滚动卡
   figure(t, {x, y, s, pose:'stand|sit|walk', t0, robe, write, preset})  汉代文吏（简单形象）；写了 preset 并在 brief 的 packs 里加 renwu，就换成古代人物库（朝代 × 身份 × 动作，见 renwu.js）
   route(t, t0, {box, A:{x,y,name,sub}, B:{…}, trips, dur, label, traveler, oneway})  示意路线：远山、河、驿路；朱笔沿路画过去（笔锋+足迹+到站盖印），traveler:'cart' 换成贴路面倾斜的车，'none' 不画；trips=1 缺省单程
   tomb(t, {box, light})                      墓葬剖面：土层、墓坑、棺、简牍；light 时刻简牍发光升起
   night(t, {box, a})  moon(x, y, r, a)  torches(t, t0, {box, n})       夜色、月亮、举火追赶的人影
   seal(t, t0, {x, y, size, text, big})       盖印：落下、压纸、晕墨
   doc(t, t0, {box, cols})                    一卷官文书，墨行一列列写出
   tablet(t, {box, title, rows:[{name, amt, at, hot}]})               木牍名籍，按时刻逐行出现
   book(t, {box, title, sub, gap, at, label}) 一页史书，竖行排满，只有第 gap 列空着；at 时刻朱框圈出空行
   hills(t, box, {seed, y, amp, a})  birds(t, box, {n, y})  motes(t, box, {n})  lamp(t, x, y, s)   远山、飞鸟、浮尘、油灯（让画面一直在动的底子）
   vtxt(s, x, ytop, size, col, font, prog)    竖排文字，prog 写到第几个字；整串登记给检查
   coverArt(c, cx, cy, R, {text})             封面主图：竹简 + 朱印（画在封面画布 c 上）
   主题名 liubai；颜色 INK 墨、RED 朱、BLUE 靛、SLIP 竹；字体：标题和字幕 SongB，竹简 KT */
window.PACK=window.PACK||{};window.PACK_INIT=window.PACK_INIT||[];
PACK.liubai=(function(){
  const INK='#211e19',RED='#a8322b',DIM='#6f604a',BLUE='#2f3d5c',BLUE2='#26324c',SLIP='#d8bf86',SKIN='#ead7b0';
  const sg=(t,a,d)=>cl((t-a)/d);
  PACK_INIT.push(async()=>{await Promise.all([['SongB','史书留白元延'],['Song','史书'],['KT','旦休宿家']].map(([f,s])=>document.fonts.load(`40px ${f}`,s).catch(()=>0)))});

  /* ---------- 纸 ---------- */
  let PAP=null;
  function paperTex(){if(PAP)return PAP;const c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');
    const gr=x.createLinearGradient(0,0,0,H);gr.addColorStop(0,'#e7d9b6');gr.addColorStop(1,'#dccb9f');x.fillStyle=gr;x.fillRect(0,0,W,H);
    for(let i=0;i<26;i++){const cx=rnd(i+3)*W,cy=rnd(i+40)*H,r=80+rnd(i+77)*260,rg=x.createRadialGradient(cx,cy,0,cx,cy,r);rg.addColorStop(0,`rgba(150,120,70,${.05+rnd(i+9)*.07})`);rg.addColorStop(1,'rgba(150,120,70,0)');x.fillStyle=rg;x.fillRect(cx-r,cy-r,2*r,2*r)}
    x.strokeStyle='rgba(120,95,55,.10)';x.lineWidth=1;for(let i=0;i<2600;i++){const px=rnd(i*3+1)*W,py=rnd(i*3+2)*H,l=4+rnd(i*7)*16,a=rnd(i*5)*3.14;x.beginPath();x.moveTo(px,py);x.lineTo(px+Math.cos(a)*l,py+Math.sin(a)*l);x.stroke()}
    for(let i=0;i<1800;i++){x.fillStyle=`rgba(90,70,40,${rnd(i+900)*.12})`;x.fillRect(rnd(i+1200)*W,rnd(i+3100)*H,1.5,1.5)}
    const v=x.createRadialGradient(W/2,H/2,H*.3,W/2,H/2,H*.75);v.addColorStop(0,'rgba(70,50,20,0)');v.addColorStop(1,'rgba(70,50,20,.18)');x.fillStyle=v;x.fillRect(0,0,W,H);
    x.strokeStyle=INK;x.lineWidth=4;x.strokeRect(36,36,W-72,H-72);x.lineWidth=1.2;x.strokeRect(50,50,W-100,H-100);
    PAP=c;return c}
  addTheme('liubai',{light:true,ink:INK,dim:'rgba(33,30,25,.62)',note:'rgba(33,30,25,.8)',a1:RED,a2:BLUE,a3:'#8a6c3a',chip:'rgba(168,50,43,.10)',sub:'rgba(0,0,0,0)',subInk:INK,
    top:'#e7d9b6',bot:'#d9c89c',card:'rgba(241,231,204,.96)',cardInk:INK,pillInk:'#f3e9d0',hl:'rgba(168,50,43,.25)',f:{t:'SongB',b:'SongB',s:'Song',h:'KT',n:'RC'},
    bg(t){g.drawImage(paperTex(),0,0)}});

  /* ---------- 小工具 ---------- */
  function glyph(s,x,y,sz,col,font='SongB'){g.save();g.font=`${sz}px ${font}`;g.fillStyle=col;g.textAlign='center';g.textBaseline='middle';g.fillText(s,x,y);g.restore()}  // 印章里的字：装饰，不登记
  function paperCard(x,y,w,h,a=1){g.save();g.globalAlpha*=a;g.shadowColor='rgba(60,40,10,.25)';g.shadowBlur=18;g.shadowOffsetY=6;g.fillStyle='rgba(241,231,204,.97)';g.fillRect(x,y,w,h);g.restore();
    g.save();g.globalAlpha*=a;g.strokeStyle='#9d8965';g.lineWidth=1.4;g.strokeRect(x+10,y+10,w-20,h-20);g.restore()}
  function brushLine(x0,y0,x1,y1,w,col,seed=1,k=1){if(k<=0)return;const n=Math.max(4,Math.min(24,Math.round(Math.hypot(x1-x0,y1-y0)/12))),xe=lerp(x0,x1,k),ye=lerp(y0,y1,k);g.save();g.strokeStyle=col;g.lineCap='round';
    for(let p=0;p<3;p++){g.globalAlpha*=p?.55:1;g.lineWidth=w*(1-p*.25);g.beginPath();for(let i=0;i<=n;i++){const u=i/n,x=lerp(x0,xe,u),y=lerp(y0,ye,u)+(rnd(seed*31+i+p*7)-.5)*w*.18;i?g.lineTo(x,y):g.moveTo(x,y)}g.stroke()}g.restore()}
  function sealBox(x,y,s,col=RED){g.save();g.fillStyle=col;g.beginPath();g.roundRect(x-s/2,y-s/2,s,s,s*.08);g.fill();g.strokeStyle='rgba(243,233,208,.85)';g.lineWidth=Math.max(2,s*.035);g.strokeRect(x-s/2+s*.1,y-s/2+s*.1,s*.8,s*.8);
    g.globalCompositeOperation='destination-out';for(let i=0;i<14;i++){g.fillStyle=`rgba(0,0,0,${.25+rnd(i+s)*.5})`;g.beginPath();g.arc(x-s/2+rnd(i*3+1)*s,y-s/2+rnd(i*5+2)*s,1+rnd(i*7)*s*.03,0,7);g.fill()}g.restore()}

  /* ---------- 版面 ---------- */
  const CFG={timebar:true};
  function config(o={}){Object.assign(CFG,o)}   // config({timebar:false})：整片不画时间线，题签和画心上移约 110 像素，画心更大
  function layout(){const B=safeBox(),head=B.y,bar=B.y+92,tb=CFG.timebar!==false,place=B.y+(tb?262:150),ay=B.y+(tb?306:194),ah=B.y+B.h-ay;
    return {B,head,bar,place,art:{x:B.x,y:ay,w:B.w,h:ah,cx:B.x+B.w/2,cy:ay+ah/2},slogan:H-SAFE.b+Math.min(96,SAFE.b*.2)}}
  function keyAt(keys,t){let i=0;for(let j=0;j<keys.length;j++)if(t>=keys[j].at)i=j;return i}
  function masthead(t,o={}){const L=layout(),y=L.head+56,x0=L.B.x+4;
    txt(o.name||'史书留白',x0,y,50,INK,'SongB','left');const w=tw(o.name||'史书留白',50,'SongB');sealBox(x0+w+44,y-17,62);glyph(o.seal||'留白',x0+w+44,y-15,25,'#f3e9d0','SongB');
    if(o.rightKeys){const i=keyAt(o.rightKeys,t),k=eo(sg(t,o.rightKeys[i].at,.6));if(i>0&&k<1)txt(o.rightKeys[i-1].text,L.B.x+L.B.w-4,y,44,RED,'SongB','right',1-k);txt(o.rightKeys[i].text,L.B.x+L.B.w-4,y,44,RED,'SongB','right',i>0?k:1)}
    else if(o.right)txt(o.right,L.B.x+L.B.w-4,y,44,RED,'SongB','right');
    g.save();g.strokeStyle='#554a38';g.lineWidth=1.6;g.beginPath();g.moveTo(L.B.x,L.head+82);g.lineTo(L.B.x+L.B.w,L.head+82);g.stroke();g.restore()}

  // 时间线：一条粗墨线分成 n 格；红笔刷标出 lo..hi；红墨点 + 题签标出此刻
  function timebar(t,keys,o={}){const L=layout(),n=o.n||12,e0=o.ends?tw(o.ends[0],42,'SongB')+22:20,e1=o.ends?tw(o.ends[1],42,'SongB')+22:20,x0=L.B.x+e0,x1=L.B.x+L.B.w-e1,y=L.bar+112,X=u=>lerp(x0,x1,u/n);
    const i=keyAt(keys,t),cur=keys[i],prv=keys[Math.max(0,i-1)],k=i>0?eio(sg(t,cur.at,cur.d??.8)):1,v=f=>lerp(prv[f]??0,cur[f]??0,k);
    const lo=v('lo'),hi=v('hi'),mark=v('mark'),fill=v('fill'),dim=v('dim');
    g.save();g.globalAlpha*=1-.6*dim;
    // 底：格子
    for(let m=0;m<n;m++){const a=X(m)+3,b=X(m+1)-3;g.fillStyle=m%2?'rgba(120,98,62,.20)':'rgba(120,98,62,.30)';g.fillRect(a,y-11,b-a,22)}
    if(fill>0){g.fillStyle='rgba(33,30,25,.78)';g.fillRect(x0,y-11,X(fill)-x0,22)}
    if(hi-lo>.15){g.save();g.globalAlpha*=cl((hi-lo-.15)/.35);brushLine(X(lo),y,X(hi),y,26,RED,7,1);g.restore()}
    for(let m=0;m<=n;m++){const q=o.major&&m%o.major===0;g.fillStyle=INK;g.fillRect(X(m)-(q?2.5:1.5),y-(q?28:20),q?5:3,q?56:40)}
    if(o.ends){txt(o.ends[0],x0-14,y+15,42,DIM,'SongB','right');txt(o.ends[1],x1+14,y+15,42,DIM,'SongB','left')}
    if(o.mid)o.mid.forEach(([u,s])=>txt(s,X(u),y+68,42,DIM,'SongB','center'));
    // 墨点和题签
    const pulse=1+.12*Math.sin(t*4);
    if(cur.mark!=null||prv.mark!=null){const mx=X(mark);g.fillStyle=RED;g.beginPath();g.arc(mx,y,15*pulse,0,7);g.fill();g.strokeStyle='#f3e9d0';g.lineWidth=3;g.beginPath();g.arc(mx,y,8,0,7);g.stroke()}
    const capAt=(c,u,a)=>{if(!c||a<=0)return;const w=tw(c,46,'SongB')+48,cx=cl(X(u),x0+w/2-20,x1-w/2+20),cy=y-70;g.save();g.globalAlpha*=a;g.fillStyle='rgba(243,233,208,.97)';g.strokeStyle=RED;g.lineWidth=3;g.beginPath();g.roundRect(cx-w/2,cy-40,w,64,10);g.fill();g.stroke();
      g.fillStyle=RED;g.beginPath();g.moveTo(X(u)-10,cy+24);g.lineTo(X(u)+10,cy+24);g.lineTo(X(u),cy+40);g.fill();g.restore();txt(c,cx,cy+8,46,RED,'SongB','center',a)};
    const cu=cur.capAt??(cur.mark??(cur.lo+cur.hi)/2),pu=prv.capAt??(prv.mark??(prv.lo+prv.hi)/2);
    const kc=i>0?eo(sg(t,cur.at,.6)):1;if(i>0&&prv.cap!==cur.cap)capAt(prv.cap,pu,1-cl(kc*1.6));capAt(cur.cap,lerp(pu,cu,k),prv.cap!==cur.cap&&i>0?cl(kc*1.6-.6):1);
    g.restore()}

  function place(t,keys){const L=layout(),y=L.place,i=keyAt(keys,t),k=eo(sg(t,keys[i].at,.5));
    const s=keys[i].text,w=tw(s,46,'SongB');
    g.save();g.strokeStyle=RED;g.lineWidth=2.5;const half=(w/2+30)+120*k;[[-1],[1]].forEach(([d])=>{g.beginPath();g.moveTo(L.art.cx+d*(w/2+24),y-16);g.lineTo(L.art.cx+d*Math.min(half,L.B.w/2-10),y-16);g.stroke()});g.restore();
    if(i>0&&k<1)txt(keys[i-1].text,L.art.cx,y,46,RED,'SongB','center',1-k);txt(s,L.art.cx,y,46,RED,'SongB','center',i>0?k:1)}

  function slogan(t,o={}){const L=layout(),y=L.slogan,s=o.text||'史书寥寥几笔，人间却是一生',sz=o.size||58,col=o.col||RED;
    brand(()=>{const w=tw(s,sz,'SongB'),r=Math.min(110,(L.B.w-w)/2-34);g.save();if(r>20){brushLine(L.art.cx-w/2-24-r,y-sz*.35,L.art.cx-w/2-24,y-sz*.35,8,RED,3,1);brushLine(L.art.cx+w/2+24,y-sz*.35,L.art.cx+w/2+24+r,y-sz*.35,8,RED,5,1)}g.restore();
      txt(s,L.art.cx,y,sz,col,'SongB','center');
      if(o.seal!==false){sealBox(L.art.cx,y+70,58);glyph(o.seal||'留白',L.art.cx,y+72,24,'#f3e9d0','SongB')}})}

  /* ---------- 画心：场景、镜头、转场 ---------- */
  function blob(cx,cy,r,seed){g.beginPath();const n=48;for(let i=0;i<=n;i++){const a=i/n*Math.PI*2,rr_=r*(1+.10*Math.sin(a*5+seed)+.06*Math.sin(a*11+seed*2)+(rnd(seed+i%n)-.5)*.08);const x=cx+Math.cos(a)*rr_,y=cy+Math.sin(a)*rr_;i?g.lineTo(x,y):g.moveTo(x,y)}g.closePath()}
  function stage(t,scenes,o={}){const A=layout().art;
    g.save();g.beginPath();g.rect(A.x,A.y,A.w,A.h);g.clip();g.fillStyle='rgba(225,210,172,.35)';g.fillRect(A.x,A.y,A.w,A.h);
    clipText([A.x,A.y,A.x+A.w,A.y+A.h],()=>scenes.forEach((s,si)=>{if(t<s.a-.01||t>=s.b)return;const tr=s.tr||'fade',dIn=s.dIn??.7,out=1-sg(t,s.b-.4,.4);if(out<=0)return;
      g.save();
      if(tr==='ink'){const k=eo(sg(t,s.a,dIn));if(k<1){const [cx,cy]=s.at||[A.cx,A.cy];blob(cx,cy,Math.hypot(A.w,A.h)*k*1.05,si*13+3);g.clip()}}
      else if(tr==='scroll'){const k=eio(sg(t,s.a,dIn));if(k<1){const xe=A.x+A.w*k;g.beginPath();g.rect(A.x,A.y,xe-A.x,A.h);g.clip()}}
      else if(tr==='fade'&&s.a>.05)g.globalAlpha*=eo(sg(t,s.a,dIn*.7));
      g.globalAlpha*=out;
      if(s.opaque!==false){g.drawImage(paperTex(),A.x,A.y,A.w,A.h,A.x,A.y,A.w,A.h);g.fillStyle='rgba(225,210,172,.35)';g.fillRect(A.x,A.y,A.w,A.h)}  // 每场先铺一层纸：新场盖住旧场，不透出来
      if(s.cam){const [z,fx,fy]=s.cam(t);g.translate(fx,fy);g.scale(z,z);g.translate(-fx,-fy)}
      s.draw(t,A);g.restore();
      if(tr==='scroll'){const k=eio(sg(t,s.a,dIn));if(k>0&&k<1){const xe=A.x+A.w*k;g.save();g.fillStyle='#6b4f2a';g.fillRect(xe-9,A.y,18,A.h);g.fillStyle='#a8322b';g.fillRect(xe-14,A.y,28,14);g.fillRect(xe-14,A.y+A.h-14,28,14);g.restore()}}}));
    g.restore();g.save();g.strokeStyle='#8d7a58';g.lineWidth=1.5;g.strokeRect(A.x+.5,A.y+.5,A.w-1,A.h-1);g.restore()}

  /* ---------- 竖排字、竹简 ---------- */
  function vtxt(s,x,ytop,size,col=INK,font='KT',prog=99,lead=1.12){const cs=[...s],n=cs.length;if(prog<=0)return;
    if(typeof REC!=='undefined'&&REC){const m=g.getTransform(),sx=Math.hypot(m.a,m.b);const P=[[x-size/2,ytop],[x+size/2,ytop+n*size*lead]].map(([a,b])=>[m.a*a+m.c*b+m.e,m.b*a+m.d*b+m.f]);
      REC.tx.push([s,Math.round(P[0][0]),Math.round(P[0][1]),Math.round(P[1][0]),Math.round(P[1][1]),+(g.globalAlpha*(prog>=n?1:.5)).toFixed(2),Math.round(size*sx)].concat(CLIP?['',CLIP]:[]))}
    g.save();g.font=`${size}px ${font}`;g.fillStyle=col;g.textAlign='center';g.textBaseline='middle';
    cs.forEach((c,i)=>{const k=cl(prog-i);if(k<=0)return;const cy=ytop+(i+.5)*size*lead;g.save();g.beginPath();g.rect(x-size,cy-size*.6,size*2,size*1.2*k);g.clip();g.globalAlpha*=.92;g.fillText(c,x,cy);g.restore()});g.restore()}
  function slipBody(x,y,w,h){g.save();g.shadowColor='rgba(60,40,10,.3)';g.shadowBlur=14;g.shadowOffsetX=4;g.shadowOffsetY=6;g.fillStyle=SLIP;g.beginPath();g.roundRect(x-w/2,y,w,h,6);g.fill();g.restore();
    g.save();const gr=g.createLinearGradient(x-w/2,0,x+w/2,0);gr.addColorStop(0,'rgba(120,86,40,.35)');gr.addColorStop(.18,'rgba(255,240,200,.12)');gr.addColorStop(.8,'rgba(255,240,200,.0)');gr.addColorStop(1,'rgba(120,86,40,.35)');g.fillStyle=gr;g.fillRect(x-w/2,y,w,h);
    g.strokeStyle='rgba(138,108,58,.28)';g.lineWidth=1;for(let i=0;i<8;i++){const xx=x-w/2+6+(w-12)*rnd(i+Math.round(w));g.beginPath();g.moveTo(xx,y+4);g.lineTo(xx+1.5,y+h-4);g.stroke()}
    g.strokeStyle='#7d6232';g.lineWidth=2;g.strokeRect(x-w/2,y,w,h);g.fillStyle='rgba(70,40,20,.62)';for(const kk of [.1,.9]){g.fillRect(x-w/2-8,y+h*kk-3,w+16,6);g.beginPath();g.arc(x+w/2+8,y+h*kk,4,0,7);g.fill()}g.restore()}
  function slip(t,t0,o){const {x,y,w=120,h=520,text='',size=96,rate=3.2,col=INK}=o;const a=eo(sg(t,t0-.35,.35));if(a<=0)return t0+text.length/rate;
    g.save();g.globalAlpha*=a;slipBody(x,y,w,h);const n=[...text].length,step=Math.min(size*1.12,(h*.78)/Math.max(1,n));vtxt(text,x,y+h*.11,Math.min(size,step/1.12),col,'KT',(t-t0)*rate,1.12);g.restore();return t0+n/rate}

  /* ---------- 历谱格子 ---------- */
  function calendar(t,o){const {box,lens=[30,29,30,29,30,29,30,29,30,29,30,29],days=[],t0=1e9,dur=4,home,redA=.88,a=1}=o;const n=lens.length,mx=Math.max(...lens);
    const gx=box.x+24,gy=box.y+24,gw=box.w-48,gh=box.h-48,cw=gw/n,ch=gh/mx,cell=(m,d)=>[gx+(m-1)*cw,gy+(d-1)*ch];
    g.save();g.globalAlpha*=a;
    for(let m=1;m<=n;m++){for(let d=1;d<=lens[m-1];d++){const [x,y]=cell(m,d);g.strokeStyle='rgba(110,90,60,.42)';g.lineWidth=1;g.strokeRect(x+4,y+2,cw-8,ch-4)}if(m<n){g.strokeStyle='rgba(60,45,30,.35)';g.lineWidth=2;g.beginPath();g.moveTo(gx+m*cw,gy);g.lineTo(gx+m*cw,gy+gh);g.stroke()}}
    const N=days.length,prog=N*(o.linear?sg(t,t0,dur):eo(sg(t,t0,dur)));
    days.forEach(([m,d],i)=>{if(i>=prog)return;const [x,y]=cell(m,d),k=eo(cl((prog-i)/3)),sc=lerp(1.6,1,k);g.save();g.translate(x+cw/2,y+ch/2);g.scale(sc,sc);g.fillStyle=`rgba(168,50,43,${redA*cl(k*1.4)})`;g.fillRect(-cw/2+5,-ch/2+3,cw-10,ch-6);g.restore();
      if(prog-i<2){g.save();g.globalAlpha*=.5*(1-(prog-i)/2);g.fillStyle='rgba(255,220,160,1)';g.beginPath();g.arc(x+cw/2,y+ch/2,ch*1.2,0,7);g.fill();g.restore()}});
    if(home){const [x,y]=cell(home[0],home[1]);g.fillStyle='#f3e9d0';g.fillRect(x+3,y+1,cw-6,ch-2);g.strokeStyle=INK;g.lineWidth=3;g.strokeRect(x+2,y,cw-4,ch);glyph(home[2]||'宿家',x+cw/2,y+ch/2+1,Math.min(ch*.8,cw*.4),INK,'KT')}
    g.restore();return {cell,cw,ch}}
  function counter(t,t0,o){const {x,y,lines,dur=4}=o;const k=eo(sg(t,t0,dur)),a=eo(sg(t,t0-.2,.4));if(a<=0)return;const h=lines.length*86+50;paperCard(x-230,y-h/2,460,h,a);
    lines.forEach(([pre,val,unit],i)=>{const s=`${pre}${pre?' ':''}${Math.round(val*k)} ${unit}`;txt(s,x,y-h/2+92+i*86,i===lines.length-1?78:50,i===lines.length-1?RED:INK,'SongB','center',a)})}

  /* ---------- 人物：汉代文吏（自己设计的简单形象） ---------- */
  function figure(t,o){if(o.preset&&PACK.renwu)return PACK.renwu.person(t,o);   // 写了 preset 且加载了 renwu 包：用古代人物库
    const {x,y,s=1,pose='stand',t0=0,robe=BLUE,write=false}=o;const br=1+.008*Math.sin(t*2.1),sway=Math.sin(t*1.7)*3,walk=pose==='walk'?Math.sin((t-t0)*6):0;
    g.save();g.translate(x,y);g.scale(s,s*br);g.lineJoin='round';g.strokeStyle=INK;g.lineWidth=3;
    g.fillStyle='rgba(60,40,10,.18)';g.beginPath();g.ellipse(0,2,90,14,0,0,7);g.fill();
    if(pose==='sit'){g.fillStyle='#6b4f2a';g.fillRect(40,-120,170,14);g.fillRect(52,-106,10,106);g.fillRect(188,-106,10,106);g.strokeRect(40,-120,170,14)}
    const hem=pose==='sit'?-10:0,legL=walk*14,legR=-walk*14;
    g.fillStyle=INK;g.fillRect(-40+legL,-8+hem,32,10);g.fillRect(8+legR,-8+hem,32,10);
    g.fillStyle=robe;g.beginPath();g.moveTo(-36,-300);g.quadraticCurveTo(-66,-200,-76+legL*.6,hem);g.lineTo(76+legR*.6,hem);g.quadraticCurveTo(66,-200,36,-300);g.closePath();g.fill();g.stroke();
    g.save();g.clip();g.strokeStyle='rgba(255,255,255,.10)';g.lineWidth=2;for(let i=-120;i<120;i+=10){g.beginPath();g.moveTo(i,-320);g.lineTo(i+70,0);g.stroke()}g.restore();
    g.strokeStyle=INK;g.lineWidth=3;g.beginPath();g.moveTo(-60,-60+hem);g.lineTo(60,-60+hem);g.stroke();
    const armL=pose==='sit'||write?-40:sway,armR=pose==='sit'||write?40:-sway;
    g.fillStyle=BLUE2;[[-1,armL],[1,armR]].forEach(([d,sw])=>{g.beginPath();g.moveTo(d*34,-290);g.quadraticCurveTo(d*96,-232,d*88+sw*.4,-150);g.quadraticCurveTo(d*58,-136,d*28,-170);g.closePath();g.fill();g.stroke()});
    g.strokeStyle='#efe3c3';g.lineWidth=6;g.beginPath();g.moveTo(-26,-300);g.lineTo(18,-222);g.moveTo(26,-300);g.lineTo(4,-262);g.stroke();
    g.strokeStyle=INK;g.lineWidth=3;g.fillStyle=RED;g.fillRect(-54,-180,108,12);g.strokeRect(-54,-180,108,12);
    g.beginPath();g.moveTo(46,-170);g.lineTo(54,-118);g.stroke();
    if(write||pose==='sit'){g.fillStyle=SLIP;g.save();g.translate(110,-140);g.rotate(-.08);g.fillRect(-60,-8,120,16);g.strokeRect(-60,-8,120,16);g.restore();
      g.strokeStyle=INK;g.lineWidth=3;const px=80+Math.sin(t*5)*16,py=-150+Math.cos(t*7)*3;g.beginPath();g.moveTo(px,py);g.lineTo(px+18,py-46);g.stroke()}
    else{g.fillStyle=SLIP;g.fillRect(-26,-198,52,34);g.strokeRect(-26,-198,52,34);for(let i=-18;i<26;i+=9){g.beginPath();g.moveTo(i,-198);g.lineTo(i,-164);g.stroke()}}
    const hy=-338+(pose==='sit'?6:0),hx=(pose==='sit'?10:0);
    g.fillStyle=SKIN;g.beginPath();g.ellipse(hx,hy,27,33,0,0,7);g.fill();g.stroke();
    const blink=((t*.37)%1)<.04;g.lineWidth=3;g.beginPath();if(blink){g.moveTo(hx-11,hy+6);g.lineTo(hx-3,hy+6);g.moveTo(hx+11,hy+6);g.lineTo(hx+3,hy+6)}else{g.moveTo(hx-9,hy+3);g.lineTo(hx-3,hy+3);g.moveTo(hx+9,hy+3);g.lineTo(hx+3,hy+3)}g.moveTo(hx-6,hy+22);g.lineTo(hx+6,hy+22);g.stroke();
    g.fillStyle=INK;g.beginPath();g.moveTo(hx-26,hy-18);g.lineTo(hx-20,hy-38);g.lineTo(hx+22,hy-54);g.lineTo(hx+28,hy-28);g.lineTo(hx+24,hy-18);g.closePath();g.fill();
    g.beginPath();g.moveTo(hx-26,hy-18);g.lineTo(hx-30,hy+8);g.moveTo(hx+26,hy-18);g.lineTo(hx+30,hy+8);g.stroke();
    g.restore()}

  /* ---------- 底子：远山、飞鸟、浮尘、油灯 ---------- */
  function hills(t,box,o={}){const {seed=1,y=box.y+box.h*.55,amp=120,a=1,layers=3,drift=6}=o;g.save();g.globalAlpha*=a;
    for(let L=0;L<layers;L++){const yy=y+L*amp*.45,am=amp*(1-L*.25),off=Math.sin(t*.05+L)*drift*(L+1);const gr=g.createLinearGradient(0,yy-am,0,yy+am*.6);gr.addColorStop(0,`rgba(60,52,40,${.20+L*.10})`);gr.addColorStop(1,'rgba(60,52,40,0)');g.fillStyle=gr;
      g.beginPath();g.moveTo(box.x-20,box.y+box.h);for(let i=0;i<=40;i++){const u=i/40,x=box.x-20+u*(box.w+40),h_=Math.sin(u*Math.PI*(2+L)+seed+L*1.7)*.5+Math.sin(u*Math.PI*(7+L*2)+seed*2)*.18+rnd(seed*50+L*41+i)*.08;g.lineTo(x+off,yy-am*(.55+h_))}g.lineTo(box.x+box.w+20,box.y+box.h);g.closePath();g.fill();
      g.strokeStyle=`rgba(40,34,26,${.30+L*.12})`;g.lineWidth=2;g.beginPath();for(let i=0;i<=40;i++){const u=i/40,x=box.x-20+u*(box.w+40),h_=Math.sin(u*Math.PI*(2+L)+seed+L*1.7)*.5+Math.sin(u*Math.PI*(7+L*2)+seed*2)*.18+rnd(seed*50+L*41+i)*.08;i?g.lineTo(x+off,yy-am*(.55+h_)):g.moveTo(x+off,yy-am*(.55+h_))}g.stroke()}g.restore()}
  function birds(t,box,o={}){const {n=5,y=box.y+box.h*.22,speed=40,a=1,seed=3}=o;g.save();g.globalAlpha*=a;g.strokeStyle=INK;g.lineWidth=2.4;
    for(let i=0;i<n;i++){const span=box.w+200,x=box.x-100+((rnd(seed+i)*span+t*speed*(1+rnd(i+9)*.3))%span),yy=y+(rnd(seed+i+20)-.5)*120+Math.sin(t*1.3+i)*6,f=Math.sin(t*7+i*2)*7,s=10+rnd(i+31)*6;
      g.beginPath();g.moveTo(x-s,yy-f);g.quadraticCurveTo(x-s*.4,yy-2,x,yy);g.quadraticCurveTo(x+s*.4,yy-2,x+s,yy-f);g.stroke()}g.restore()}
  function motes(t,box,o={}){const {n=40,col='rgba(255,236,190,.8)',a=1,seed=5}=o;g.save();g.globalAlpha*=a;g.fillStyle=col;for(let i=0;i<n;i++){const x=box.x+((rnd(seed+i)*box.w+t*(6+rnd(i+3)*10))%box.w),y=box.y+box.h-((rnd(seed+i+90)*box.h+t*(10+rnd(i+7)*16))%box.h),r=1+rnd(i+11)*2.4;g.globalAlpha=a*(.3+.5*Math.sin(t*2+i)**2);g.beginPath();g.arc(x,y,r,0,7);g.fill()}g.restore()}
  function lamp(t,x,y,s=1){const f=1+.12*Math.sin(t*11)+.06*Math.sin(t*23+1);g.save();g.translate(x,y);g.scale(s,s);
    const gl=g.createRadialGradient(0,-60,4,0,-60,180*f);gl.addColorStop(0,'rgba(255,214,140,.55)');gl.addColorStop(1,'rgba(255,214,140,0)');g.fillStyle=gl;g.beginPath();g.arc(0,-60,180*f,0,7);g.fill();
    g.fillStyle='#6b4f2a';g.strokeStyle=INK;g.lineWidth=2.5;g.beginPath();g.moveTo(-34,0);g.lineTo(34,0);g.lineTo(18,-26);g.lineTo(-18,-26);g.closePath();g.fill();g.stroke();g.fillRect(-6,-46,12,20);
    g.fillStyle='#f6c35b';g.beginPath();g.moveTo(0,-90*f);g.quadraticCurveTo(14,-60,0,-48);g.quadraticCurveTo(-14,-60,0,-90*f);g.fill();g.restore()}

  /* ---------- 路线（示意） ---------- */
  // 车：底边贴在 (x,y) 的路面上，随坡度 ang 倾斜；车轮转、牛腿交替，整体轻微颠簸
  function cart(x,y,dir,t,s=1,ang=0){g.save();g.translate(x,y);g.rotate(ang);g.translate(0,-2*Math.abs(Math.sin(t*9)));g.scale(dir*s,s);g.strokeStyle=INK;g.lineWidth=3;g.fillStyle='#8a6c3a';
    g.beginPath();g.ellipse(-30,-40,30,20,0,Math.PI,0);g.fill();g.stroke();g.fillRect(-62,-40,64,9);g.strokeRect(-62,-40,64,9);
    const r=15,a=t*6;g.fillStyle='#e7d9b6';g.beginPath();g.arc(-30,-15,r,0,7);g.fill();g.stroke();for(let i=0;i<4;i++){g.beginPath();g.moveTo(-30,-15);g.lineTo(-30+Math.cos(a+i*.8)*r,-15+Math.sin(a+i*.8)*r);g.stroke()}
    g.beginPath();g.moveTo(2,-36);g.lineTo(26,-36);g.stroke();
    g.fillStyle=INK;const leg=Math.sin(t*9)*5;g.beginPath();g.ellipse(42,-30,18,10,0,0,7);g.fill();g.beginPath();g.ellipse(60,-35,7,6,0,0,7);g.fill();g.beginPath();g.moveTo(63,-40);g.lineTo(70,-48);g.stroke();
    g.lineWidth=3.5;g.beginPath();g.moveTo(32,-22);g.lineTo(31+leg,0);g.moveTo(52,-22);g.lineTo(53-leg,0);g.stroke();g.restore()}
  // 示意路线：远山、河、虚线驿路；行进默认是“朱笔沿路画过去”（笔锋 + 墨点足迹 + 到站盖印），不再用牛车。
  // o.traveler：'brush'（缺省）/ 'cart'（旧的车，已改为贴着路面、随坡度倾斜、不中途掉头）/ 'none'；o.oneway：只去不回（trips=1 时缺省就是单程）
  function route(t,t0,o){const {box,A,B,trips=4,dur=5,label}=o,traveler=o.traveler||'brush',oneway=o.oneway??(trips===1);
    hills(t,{x:box.x,y:box.y,w:box.w,h:box.h},{seed:4,y:box.y+box.h*.42,amp:90,a:.55,layers:2});
    g.save();g.strokeStyle='rgba(47,61,92,.55)';g.lineWidth=5;g.beginPath();for(let i=0;i<=30;i++){const u=i/30,x=box.x+u*box.w,y=box.y+box.h*.83+Math.sin(u*9+1)*14;i?g.lineTo(x,y):g.moveTo(x,y)}g.stroke();g.restore();
    const C=[(A.x+B.x)/2+40,(A.y+B.y)/2+130],q=k=>[(1-k)**2*A.x+2*k*(1-k)*C[0]+k*k*B.x,(1-k)**2*A.y+2*k*(1-k)*C[1]+k*k*B.y],
      tan=k=>{const [x0,y0]=q(Math.max(0,k-.01)),[x1,y1]=q(Math.min(1,k+.01));return Math.atan2(y1-y0,x1-x0)};
    g.save();g.setLineDash([10,14]);g.strokeStyle='rgba(141,122,88,.75)';g.lineWidth=4;g.beginPath();g.moveTo(A.x,A.y);g.quadraticCurveTo(C[0],C[1],B.x,B.y);g.stroke();g.restore();
    const K=cl((t-t0)/dur)*trips,tr=Math.min(trips-1,Math.floor(K)),f=K-tr,ease=x=>x<.5?2*x*x:1-(-2*x+2)**2/2;
    // 每一趟一条朱笔线（往返的话回程贴在旁边），笔锋粗细随笔画变化
    const stroke=(u0,u1,off,w)=>{const n=Math.max(2,Math.round(Math.abs(u1-u0)*60));g.save();g.strokeStyle='rgba(168,50,43,.85)';g.lineCap='round';
      for(let s=0;s<n;s++){const a=u0+(u1-u0)*s/n,b=u0+(u1-u0)*(s+1)/n,[x0,y0]=q(a),[x1,y1]=q(b),r=s/n;g.lineWidth=w*(.55+.45*Math.sin(Math.PI*Math.min(1,r*1.2)));g.beginPath();g.moveTo(x0+off,y0+off*.4);g.lineTo(x1+off,y1+off*.4);g.stroke()}g.restore()};
    let head=null;
    for(let i=0;i<=tr;i++){const e=i<tr?1:f;if(e<=0)continue;const off=(i-(trips-1)/2)*9;
      if(oneway){const u=ease(e);stroke(0,u,off,6);if(i===tr)head=[u,1]}
      else{const go=ease(Math.min(1,e*2));stroke(0,go,off,6);if(e>.5){const bk=ease((e-.5)*2);stroke(1,1-bk,off+7,4);if(i===tr)head=[1-bk,-1]}else if(i===tr)head=[go,1]}}
    if(head&&cl((t-t0)/dur)<1){const [u,d]=head,[hx,hy]=q(u),an=tan(u)+(d<0?Math.PI:0);
      if(traveler==='cart')cart(hx,hy,1,t,o.cart??.9,an);
      else if(traveler==='brush'){ // 笔锋：一滴朱墨 + 身后三五个渐淡的足迹点
        for(let j=1;j<=5;j++){const uj=u-d*j*.035;if(uj<0||uj>1)continue;const [fx,fy]=q(uj),side=(j%2?1:-1)*7,nx=-Math.sin(an),ny=Math.cos(an);g.save();g.globalAlpha*=.6*(1-j/6);g.fillStyle=INK;g.beginPath();g.ellipse(fx+nx*side,fy+ny*side,5,3,an,0,7);g.fill();g.restore()}
        g.save();g.translate(hx,hy);g.rotate(an);const pulse=1+.12*Math.sin(t*8);g.fillStyle=RED;g.beginPath();g.moveTo(16*pulse,0);g.quadraticCurveTo(0,-11*pulse,-12,0);g.quadraticCurveTo(0,11*pulse,16*pulse,0);g.fill();
        g.globalAlpha*=.35;g.beginPath();g.arc(0,0,22*pulse,0,7);g.fill();g.restore()}}
    // 到站：终点印章落下时轻轻一顿
    const arr=sg(t,t0+dur*(oneway?1:.5)/trips,.4);
    for(const [P,i] of [[A,0],[B,1]]){const k=i&&arr>0&&arr<1?1+.35*Math.sin(arr*Math.PI):1;sealBox(P.x,P.y,30*k);txt(P.name,P.x,P.y-142,48,INK,'SongB','center');if(P.sub)txt(P.sub,P.x,P.y-90,40,DIM,'Song','center')}
    if(label)txt(label(Math.min(trips,tr+1)),box.x+box.w/2,box.y+76,46,RED,'SongB','center')}

  /* ---------- 墓葬剖面 ---------- */
  function tomb(t,o){const {box,light=1e9}=o,gy=box.y+box.h*.36;g.save();
    g.fillStyle='rgba(210,196,160,.5)';g.fillRect(box.x,box.y,box.w,gy-box.y);hills(t,box,{seed:9,y:gy-10,amp:70,a:.45,layers:2});
    [['rgba(120,92,58,.22)',0],['rgba(100,76,48,.30)',.33],['rgba(80,60,38,.38)',.66]].forEach(([c,f],i)=>{const y0=gy+(box.y+box.h-gy)*f,h=(box.y+box.h-gy)/3+2;g.fillStyle=c;g.fillRect(box.x,y0,box.w,h);g.strokeStyle='rgba(60,45,30,.3)';g.lineWidth=1;for(let x=box.x-200;x<box.x+box.w;x+=16+i*5){g.beginPath();g.moveTo(x,y0+h);g.lineTo(x+110,y0);g.stroke()}});
    g.strokeStyle=INK;g.lineWidth=3;g.beginPath();g.moveTo(box.x,gy);g.lineTo(box.x+box.w,gy);g.stroke();for(let i=0;i<46;i++){const x=box.x+6+i*20+rnd(i)*8;g.beginPath();g.moveTo(x,gy);g.lineTo(x-4+Math.sin(t*1.5+i)*2,gy-12-rnd(i+3)*10);g.stroke()}
    const pw=box.w*.58,px=box.x+box.w*.21,py=gy+(box.y+box.h-gy)*.25,ph=(box.y+box.h-gy)*.62;g.fillStyle='rgba(40,30,20,.55)';g.fillRect(px,py,pw,ph);g.strokeRect(px,py,pw,ph);
    g.fillStyle='#4a3020';g.fillRect(px+24,py+ph*.32,pw*.56,ph*.5);g.strokeRect(px+24,py+ph*.32,pw*.56,ph*.5);g.strokeRect(px+24,py+ph*.32,pw*.56,ph*.1);txt('棺',px+24+pw*.28,py+ph*.68,46,'#d9c9a4','SongB','center');
    const k=eo(sg(t,light,1.8)),bx=px+pw*.68,by=py+ph*.48-ph*.55*k;
    if(k>0){const gr=g.createRadialGradient(bx+45,by+40,10,bx+45,by+40,320);gr.addColorStop(0,`rgba(255,244,205,${.6*k})`);gr.addColorStop(1,'rgba(255,244,205,0)');g.fillStyle=gr;g.fillRect(box.x,box.y,box.w,box.h);
      g.strokeStyle=`rgba(200,150,60,${.55*k})`;g.lineWidth=3;for(let i=0;i<11;i++){const an=-Math.PI/2+(i-5)*.2+Math.sin(t+i)*.02,r0=80,r1=150+50*k+Math.sin(t*3+i)*10;g.beginPath();g.moveTo(bx+45+Math.cos(an)*r0,by+40+Math.sin(an)*r0);g.lineTo(bx+45+Math.cos(an)*r1,by+40+Math.sin(an)*r1);g.stroke()}
      motes(t,{x:px,y:box.y,w:pw,h:box.h},{n:30,a:k})}
    for(let i=0;i<6;i++){g.fillStyle=SLIP;g.fillRect(bx+i*16,by,12,90);g.strokeStyle='#7d6232';g.lineWidth=1.5;g.strokeRect(bx+i*16,by,12,90)}g.fillStyle='rgba(70,40,20,.7)';g.fillRect(bx-4,by+18,104,4);g.fillRect(bx-4,by+66,104,4);
    g.restore()}

  /* ---------- 夜、月、举火 ---------- */
  function night(t,o){const {box,a=1}=o;g.save();g.globalAlpha*=a;const gr=g.createLinearGradient(0,box.y,0,box.y+box.h);gr.addColorStop(0,'rgba(22,26,40,.88)');gr.addColorStop(1,'rgba(30,28,30,.72)');g.fillStyle=gr;g.fillRect(box.x,box.y,box.w,box.h);
    for(let i=0;i<60;i++){g.fillStyle=`rgba(240,230,200,${.3+.5*Math.sin(t*2+i)**2})`;g.fillRect(box.x+rnd(i+5)*box.w,box.y+rnd(i+70)*box.h*.5,2,2)}g.restore()}
  function moon(x,y,r,a=1,sky='rgb(24,27,40)'){if(a<=0)return;g.save();g.globalAlpha*=a;const gl=g.createRadialGradient(x,y,r*.5,x,y,r*2.6);gl.addColorStop(0,'rgba(250,236,190,.35)');gl.addColorStop(1,'rgba(250,236,190,0)');g.fillStyle=gl;g.beginPath();g.arc(x,y,r*2.6,0,7);g.fill();
    g.beginPath();g.arc(x,y,r,0,7);g.clip();g.fillStyle='#efe0b4';g.beginPath();g.rect(x-r-2,y-r-2,2*r+4,2*r+4);g.arc(x+r*.72,y-r*.28,r*.84,0,7);g.fill('evenodd');g.restore()}
  function torches(t,t0,o){const {box,n=4}=o,base=box.y+box.h*.86;for(let i=0;i<n;i++){const x=box.x+((t-t0)*120+i*90)%(box.w+200)-100,y=base,leg=Math.sin(t*10+i)*10;
    g.save();g.fillStyle='rgba(20,16,12,.92)';g.strokeStyle='rgba(20,16,12,.92)';g.lineWidth=6;g.lineCap='round';g.beginPath();g.arc(x,y-92,13,0,7);g.fill();g.beginPath();g.moveTo(x,y-78);g.lineTo(x+4,y-36);g.stroke();
    g.beginPath();g.moveTo(x+4,y-36);g.lineTo(x-8+leg,y);g.moveTo(x+4,y-36);g.lineTo(x+16-leg,y);g.moveTo(x,y-70);g.lineTo(x+26,y-100);g.stroke();
    const fx=x+30,fy=y-112,f=1+.2*Math.sin(t*15+i);const gl=g.createRadialGradient(fx,fy,2,fx,fy,70*f);gl.addColorStop(0,'rgba(255,190,90,.7)');gl.addColorStop(1,'rgba(255,190,90,0)');g.fillStyle=gl;g.beginPath();g.arc(fx,fy,70*f,0,7);g.fill();
    g.fillStyle='#ffb347';g.beginPath();g.moveTo(fx,fy-26*f);g.quadraticCurveTo(fx+12,fy-4,fx,fy+6);g.quadraticCurveTo(fx-12,fy-4,fx,fy-26*f);g.fill();g.restore()}}

  /* ---------- 盖印、文书、名籍、史书 ---------- */
  function seal(t,t0,o){const {x,y,size=170,text='',big}=o,k=sg(t,t0,.32);if(k<=0)return;sfx('thud',t0,.6);const sc=lerp(1.6,1,eo(k)),sh=1-eo(k);
    g.save();if(sh>0){g.globalAlpha*=.12*sh;g.fillStyle='#000';g.beginPath();g.ellipse(x+10,y+16,size*.6*sc,size*.5*sc,0,0,7);g.fill()}g.restore();
    g.save();g.translate(x,y);g.rotate(-.05+.1*rnd(Math.round(x)));g.scale(sc,sc);g.globalAlpha*=cl(k*2);sealBox(0,0,size,big?RED:'rgba(168,50,43,.88)');
    const cs=[...text];if(cs.length===2){txt(cs[0],0,-size*.06,size*.36,'#f3e9d0','SongB','center');txt(cs[1],0,size*.34,size*.36,'#f3e9d0','SongB','center')}else txt(text,0,size*.2,size*.56,'#f3e9d0','SongB','center');g.restore()}
  function doc(t,t0,o){const {box,cols=7,a=1}=o;g.save();g.globalAlpha*=a;paperCard(box.x,box.y,box.w,box.h);const cw=(box.w-80)/cols;
    for(let c=0;c<cols;c++){const k=cl((t-t0)*2.2-c);if(k<=0)continue;const x=box.x+box.w-60-c*cw;for(let r=0;r<14;r++){const yy=box.y+40+r*(box.h-80)/14;if(r/14>k)break;g.fillStyle='rgba(40,34,26,.55)';g.fillRect(x-8,yy,16,8+10*rnd(c*31+r))}}g.restore()}
  function tablet(t,o){const {box,title='名籍',rows=[]}=o;g.save();g.fillStyle='#c9a46a';g.fillRect(box.x,box.y,box.w,box.h);g.strokeStyle='#6b4f2a';g.lineWidth=3;g.strokeRect(box.x,box.y,box.w,box.h);
    g.globalAlpha*=.25;for(let i=0;i<16;i++){g.beginPath();g.moveTo(box.x,box.y+20+i*42+10*rnd(i));g.bezierCurveTo(box.x+box.w*.33,box.y+10+i*42,box.x+box.w*.66,box.y+40+i*42,box.x+box.w,box.y+22+i*42);g.stroke()}g.globalAlpha/=.25;
    txt(title,box.x+box.w/2,box.y+86,66,INK,'KT','center');
    rows.forEach((r,i)=>{const a=eo(sg(t,r.at,.4)),yy=box.y+176+i*92;txt(r.name||'□□',box.x+box.w*.28,yy,52,'rgba(33,30,25,.55)','Song','center');if(a>0)txt(r.amt,box.x+box.w*.68,yy,72,r.hot?RED:INK,'KT','center',a)});g.restore()}
  function book(t,o){const {box,title='史书',sub='列传',gap=3,at=1e9,label='未见其名',cols=7}=o;paperCard(box.x,box.y,box.w,box.h);
    vtxt(title,box.x+box.w-50,box.y+40,48,INK,'KT');vtxt(sub,box.x+box.w-50,box.y+170,44,INK,'KT');
    const cw=(box.w-130)/cols;for(let c=0;c<cols;c++){if(c===gap)continue;const cx=box.x+box.w-120-c*cw;for(let r=0;r<16;r++){g.fillStyle='rgba(40,34,26,.55)';g.fillRect(cx-9,box.y+40+r*(box.h-80)/16,18,10+12*rnd(c*31+r))}}
    const k=eo(sg(t,at,.6));if(k>0){const cx=box.x+box.w-120-gap*cw;g.save();g.globalAlpha*=k;g.strokeStyle=RED;g.lineWidth=5;g.strokeRect(cx-28,box.y+28,56,box.h-56);g.restore();txt(label,cx,box.y+box.h+60,46,RED,'SongB','center',k)}}

  /* ---------- 封面 ---------- */
  function coverArt(c,cx,cy,R,o={}){const text=o.text||'史书留白';c.save();const w=R*.42,h=R*1.8,x=cx,y=cy-h/2;c.shadowColor='rgba(60,40,10,.3)';c.shadowBlur=20;c.fillStyle=SLIP;c.beginPath();c.roundRect(x-w/2,y,w,h,8);c.fill();c.shadowBlur=0;
    c.strokeStyle='#7d6232';c.lineWidth=3;c.strokeRect(x-w/2,y,w,h);c.fillStyle='rgba(70,40,20,.62)';c.fillRect(x-w/2-10,y+h*.1,w+20,7);c.fillRect(x-w/2-10,y+h*.9,w+20,7);
    const cs=[...text],sz=Math.min(w*.72,h*.72/cs.length);c.font=`${sz}px KT`;c.fillStyle=INK;c.textAlign='center';c.textBaseline='middle';cs.forEach((ch,i)=>c.fillText(ch,x,y+h*.14+(i+.5)*sz*1.1));
    c.fillStyle=RED;c.fillRect(x+w*.75,y+h*.62,R*.34,R*.34);c.font=`${R*.12}px SongB`;c.fillStyle='#f3e9d0';c.fillText('留',x+w*.75+R*.17,y+h*.62+R*.11);c.fillText('白',x+w*.75+R*.17,y+h*.62+R*.24);c.restore()}

  return {INK,RED,DIM,BLUE,SLIP,config,layout,masthead,timebar,place,slogan,stage,vtxt,slip,calendar,counter,figure,hills,birds,motes,lamp,route,tomb,night,moon,torches,seal,doc,tablet,book,coverArt,paperCard,brushLine,sealBox,glyph};
})();
