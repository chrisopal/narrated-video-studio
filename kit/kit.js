/* 讲解视频工坊 · 通用层
   每期片子只写 scenes.js：window.FILM = {theme, chapters, questions, scenes(t), cover:{...}, short:{...}, credits:[...], images:{key:url}}
   这里提供：画布与缓动、文字与图形小件、主题背景、章节条与字幕、分场淡入淡出、照片卡、竖版合成、封面。 */
const cv=document.getElementById('c'),W=cv.width,H=cv.height,g=cv.getContext('2d'),VERT=H>W,SAFE=(a=>({t:a[0],r:a[1],b:a[2],l:a[3]}))(window.SAFE_||[0,0,0,0]);
// 竖版：safeBox() 给出平台按钮、标题、文案挡不住的那块区域（横版就是整个画面）；竖版画面上重要的东西都放进这里
// 竖版的 safeBox 不含最下面 160 像素的字幕带（字幕画在安全区底边上）；横版返回整个画面（底部 120 像素字幕带照旧不放字）
function safeBox(pad=0){const sb=VERT?160:0,h=H-SAFE.t-SAFE.b-sb-2*pad;return {x:SAFE.l+pad,y:SAFE.t+pad,w:W-SAFE.l-SAFE.r-2*pad,h,cx:(SAFE.l+W-SAFE.r)/2,cy:SAFE.t+pad+h/2}}
const cl=(x,a=0,b=1)=>Math.max(a,Math.min(b,x)),seg=(t,a,b)=>cl((t-a)/(b-a)),lerp=(a,b,k)=>a+(b-a)*k;
const eo=x=>1-Math.pow(1-cl(x),3),eio=x=>{x=cl(x);return x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2},expo=x=>{x=cl(x);return x>=1?1:1-Math.pow(2,-10*x)},back=x=>{x=cl(x);if(x<=0)return 0;if(x>=1)return 1;const c=1.70158;return 1+(c+1)*Math.pow(x-1,3)+c*Math.pow(x-1,2)};
function rnd(i){const x=Math.sin(i*127.1+311.7)*43758.5453;return x-Math.floor(x)}
let TL=[],IM={},FILM=null,TH=null;

/* ---------- 主题（风格预设）：换题材换这里，不动流程 ----------
   每套主题给：文字色 ink/dim/note，三个强调色 a1 a2 a3，章节条 chip，字幕条 sub/subInk，卡片 card/cardInk，
   封面渐变 top/bot，字体 f:{t 标题,b 正文,s 小字,h 手写,n 数字}，背景 bg(t)。FILM.themePatch 可以逐项覆盖。 */
const TDEF={subInk:'#fff',card:'rgba(8,24,56,.82)',cardInk:'#fff',note:'rgba(255,255,255,.82)',pillInk:'#3a2a05',hl:'#ffe24a',light:false,f:{t:'H9',b:'H7',s:'H5',h:'KT',n:'RC'}};
function grad(a,b){const gr=g.createLinearGradient(0,0,0,H);gr.addColorStop(0,a);gr.addColorStop(1,b);g.fillStyle=gr;g.fillRect(0,0,W,H)}
function gridBg(step,col,a,lw=1){g.save();g.globalAlpha=a;g.strokeStyle=col;g.lineWidth=lw;g.beginPath();for(let x=0;x<=W;x+=step){g.moveTo(x,0);g.lineTo(x,H)}for(let y=0;y<=H;y+=step){g.moveTo(0,y);g.lineTo(W,y)}g.stroke();g.restore()}
function grain(n,col,a){g.save();g.fillStyle=col;for(let i=0;i<n;i++){g.globalAlpha=a*rnd(i+11);g.fillRect(rnd(i)*W,rnd(i+300)*H,1+rnd(i+7)*2,1+rnd(i+9)*2)}g.restore()}
const THEMES={
  // 科普·宇宙：深蓝星空
  space:{ink:'#eaf4ff',dim:'rgba(234,244,255,.6)',a1:'#5ff0ff',a2:'#ffd76a',a3:'#ff8a3d',chip:'rgba(95,240,255,.14)',sub:'rgba(3,8,20,.62)',top:'#040916',bot:'#0a1a33',
    bg(t){grad(this.top,this.bot);stars(t,150,1)}},
  // 科普·天空：蓝天到黄昏
  sky:{ink:'#ffffff',dim:'rgba(255,255,255,.72)',a1:'#fff3a8',a2:'#ffd24a',a3:'#ff7a3d',chip:'rgba(255,255,255,.18)',sub:'rgba(6,24,56,.62)',top:'#0f4fa8',bot:'#57a6ea',
    bg(t){skyBg(0)}},
  // 科普·实验室：墨绿网格
  lab:{ink:'#eafff6',dim:'rgba(234,255,246,.6)',a1:'#5ff0b0',a2:'#ffd76a',a3:'#ff8a3d',chip:'rgba(95,240,176,.14)',sub:'rgba(2,16,14,.66)',top:'#03110f',bot:'#0a2b28',card:'rgba(3,26,22,.86)',
    bg(t){grad(this.top,this.bot);gridBg(80,'#fff',.07)}},
  // 工业·蓝图：晒蓝图纸，只有蓝和白，唯一的暖色留给重点
  blueprint:{ink:'#f2f8ff',dim:'rgba(226,240,255,.72)',note:'rgba(226,240,255,.85)',a1:'#ffffff',a2:'#ffd24a',a3:'#ff7a4d',chip:'rgba(255,255,255,.10)',sub:'rgba(4,22,58,.78)',top:'#0b3f8f',bot:'#0a2f73',card:'rgba(6,34,92,.88)',f:{t:'H9',b:'H7',s:'H5',h:'KT',n:'RC'},
    bg(t){grad(this.top,this.bot);gridBg(40,'#fff',.07);gridBg(200,'#fff',.16,2);g.save();g.strokeStyle='rgba(255,255,255,.5)';g.lineWidth=3;g.strokeRect(36,36,W-72,H-72);g.restore()}},
  // 历史/新闻·档案桌：旧纸、暗桌面、一种红、荧光黄（浅色主题）
  archive:{light:true,ink:'#221c16',dim:'rgba(34,28,22,.66)',note:'rgba(34,28,22,.8)',a1:'#b3261e',a2:'#e9c63a',a3:'#2f5d50',chip:'rgba(179,38,30,.10)',sub:'rgba(28,22,16,.84)',subInk:'#f6efe2',top:'#efe6d3',bot:'#e2d5ba',card:'rgba(250,245,234,.95)',cardInk:'#221c16',pillInk:'#221c16',f:{t:'H9',b:'KT',s:'H5',h:'KT',n:'RC'},
    bg(t){grad(this.top,this.bot);grain(900,'#5a4a32',.10);g.save();const v=g.createRadialGradient(W/2,H/2,H*.35,W/2,H/2,H*.95);v.addColorStop(0,'rgba(60,40,10,0)');v.addColorStop(1,'rgba(60,40,10,.22)');g.fillStyle=v;g.fillRect(0,0,W,H);g.restore()}},
  // AI/科技·发布会：近黑底，缓慢漂移的彩色光斑，玻璃卡片
  keynote:{ink:'#f5f7ff',dim:'rgba(245,247,255,.62)',a1:'#7aa8ff',a2:'#c9a0ff',a3:'#5ff0d0',chip:'rgba(255,255,255,.08)',sub:'rgba(10,10,18,.72)',top:'#07070c',bot:'#0d0d18',card:'rgba(255,255,255,.08)',pillInk:'#0a0a14',
    bg(t){grad(this.top,this.bot);[['rgba(110,90,255,.34)',.23,.30,560,.05],['rgba(40,150,255,.28)',.76,.36,620,.04],['rgba(40,220,200,.18)',.55,.82,520,.06],['rgba(255,90,120,.12)',.14,.80,420,.045]].forEach(([c,x,y,r,s],i)=>glow(W*x+Math.sin(t*s*6+i*2)*90,H*y+Math.cos(t*s*5+i)*60,r,c))}},
  // 企业/品牌·瑞士网格：纸白、墨黑、唯一的信号色（浅色主题）
  swiss:{light:true,ink:'#111111',dim:'rgba(17,17,17,.6)',note:'rgba(17,17,17,.78)',a1:'#e4002b',a2:'#111111',a3:'#8a8a8a',chip:'rgba(17,17,17,.06)',sub:'rgba(17,17,17,.88)',subInk:'#ffffff',top:'#f6f4ef',bot:'#eeebe4',card:'rgba(255,255,255,.96)',cardInk:'#111111',pillInk:'#ffffff',
    bg(t){grad(this.top,this.bot);g.save();g.globalAlpha=.07;g.strokeStyle='#111';g.lineWidth=1;g.beginPath();for(let i=0;i<=12;i++){const x=96+i*(W-192)/12;g.moveTo(x,0);g.lineTo(x,H)}g.stroke();g.restore()}},
  // 小说/文学·水墨：暖宣纸，墨色，全片只有一处朱红（浅色主题）
  ink:{light:true,ink:'#1d1a17',dim:'rgba(29,26,23,.6)',note:'rgba(29,26,23,.78)',a1:'#b7332b',a2:'#1d1a17',a3:'#6b6257',chip:'rgba(29,26,23,.07)',sub:'rgba(29,26,23,.0)',subInk:'#1d1a17',top:'#f3ecdc',bot:'#e9dfc8',card:'rgba(247,241,226,.94)',cardInk:'#1d1a17',pillInk:'#f3ecdc',f:{t:'KT',b:'KT',s:'KT',h:'KT',n:'RC'},
    bg(t){grad(this.top,this.bot);grain(700,'#6b5a3c',.08);g.save();for(let i=0;i<5;i++){const x=rnd(i+41)*W,y=H*.55+rnd(i+52)*H*.4,r=260+rnd(i+63)*380;const gr=g.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,'rgba(40,36,30,.10)');gr.addColorStop(1,'rgba(40,36,30,0)');g.fillStyle=gr;g.fillRect(0,0,W,H)}g.restore()}},
  // 数据/财经·图表：白底，顶部细红线，只有水平网格（浅色主题）
  chart:{light:true,ink:'#16181d',dim:'rgba(22,24,29,.58)',note:'rgba(22,24,29,.75)',a1:'#d7263d',a2:'#16181d',a3:'#1f6fb2',chip:'rgba(215,38,61,.08)',sub:'rgba(22,24,29,.88)',subInk:'#ffffff',top:'#fbf9f6',bot:'#f4f1ec',card:'rgba(255,255,255,.97)',cardInk:'#16181d',pillInk:'#ffffff',
    bg(t){grad(this.top,this.bot);g.fillStyle=this.a1;g.fillRect(0,0,W,8);g.fillRect(64,8,90,22)}},
};
function themeDefaults(th){for(const k in TDEF)if(th[k]===undefined)th[k]=TDEF[k];if(th.cardInk===TDEF.cardInk&&th.light)th.cardInk=th.ink;return th}
Object.values(THEMES).forEach(themeDefaults);
// 风格包（kit/packs/*.js）用它登记自己的主题；主题可以带 post(t)：分场画完后再盖一层（比如四角压暗）
function addTheme(name,th){THEMES[name]=themeDefaults(th)}
function stars(t,n=150,a=1){g.save();g.globalAlpha*=a;for(let i=0;i<n;i++){const x=rnd(i)*W,y=rnd(i+500)*H,r=rnd(i+900)*1.6+.4,k=.5+.5*Math.sin(t*(.6+rnd(i+33)*1.5)+i);g.fillStyle=`rgba(210,230,255,${.25+.55*k})`;g.beginPath();g.arc(x,y,r,0,7);g.fill()}g.restore()}
// 天空背景：k=0 正午蓝天，k=1 黄昏，k=2 夜空（可取小数做渐变）
function mix3(a,b,k){return a.map((v,i)=>Math.round(lerp(v,b[i],k)))}
function skyBg(k,t=0){const S=[[[15,79,168],[87,166,234]],[[44,52,120],[255,138,72]],[[4,9,22],[10,26,51]]];const i=Math.min(1,Math.floor(k)),f=cl(k-i);const top=mix3(S[i][0],S[i+1][0],f),bot=mix3(S[i][1],S[i+1][1],f);
  const gr=g.createLinearGradient(0,0,0,H);gr.addColorStop(0,`rgb(${top})`);gr.addColorStop(1,`rgb(${bot})`);g.fillStyle=gr;g.fillRect(0,0,W,H);if(k>1.2)stars(t,150,cl(k-1.2)/.8)}

/* ---------- 时间轴与取时 ---------- */
const S=id=>TL.find(s=>s.id===id);
const T=id=>S(id).t0,N=id=>{const i=TL.findIndex(s=>s.id===id);return i+1<TL.length?TL[i+1].t0:TL[i].t1+3};
function at(id,kw,off=0){const s=S(id);const i=kw?s.vo.indexOf(kw):0;if(i<0)console.error('找不到关键词',id,kw);if(s.ct&&i>=0)return s.t0+s.ct[i]+off;return s.t0+s.lead+(i<0?0:i/s.vo.length)*(s.voiced-s.lead)+off}
const total=()=>TL[TL.length-1].t1+3;
/* ---------- 节拍网格（brief.json 写了 bpm 才有；没有时这几个函数返回 0 并报错） ---------- */
// beatT(n) 第 n 拍的时刻（0 是正片第一句开始的那一拍，可以是小数：beatT(2.5) 是第三拍的后半拍）；barT(n) 第 n 小节第一拍的时刻
// beatAt(t) 此刻是第几拍（带小数）；beatN(t, 每几拍) 此刻是第几个整拍（整数，用来在拍点上换画面：图组[beatN(t,2)%图组.length]）
// pulse(t, {every:每几拍一次, off:错后几拍, decay:衰减秒数}) 拍点上是 1，随后很快落回 0：乘在大小、亮度、位移上就是“跟着拍子跳一下”
const BT=()=>{const b=TL[0]&&TL[0]._grid;if(!b)console.error('没有节拍网格：在 brief.json 里写 "bpm"');return b};
const beatT=n=>{const b=BT();return b?b.t0+n*b.spb:0},barT=n=>{const b=BT();return b?b.t0+n*b.meter*b.spb:0};
const beatAt=t=>{const b=BT();return b?(t-b.t0)/b.spb:0},beatN=(t,every=1)=>Math.floor(beatAt(t)/every+1e-6);
function pulse(t,o={}){const b=BT();if(!b)return 0;const ev=o.every??1,x=(beatAt(t)-(o.off||0))/ev;if(x<-1e-6)return 0;return Math.exp(-(x-Math.floor(x+1e-6))*ev*b.spb/(o.decay??.18))}

/* ---------- 文字与图形小件 ---------- */
// 竖版在手机上整屏看：24–39 像素的小字一律放到 40（tw 量宽也照这个算，版式不会对不上）
const vsz=sz=>VERT&&sz>=24&&sz<40?40:sz;
function txt(s,x,y,sz,col,w='H7',al='left',a=1){if(a<=0)return;sz=vsz(sz);g.save();g.globalAlpha*=a;g.font=`${sz}px ${w}, H7`;if(REC)recText(String(s),x,y,sz,al);g.fillStyle=col||TH.ink;g.textAlign=al;g.textBaseline='alphabetic';g.fillText(s,x,y);g.restore()}
/* 检查模式：登记每帧出现的文字框和音效事件（build.py check / sfx 用） */
let REC=null;
function recText(s,x,y,sz,al){const m=g.getTransform(),wd=g.measureText(s).width,x0=al==='center'?x-wd/2:al==='right'?x-wd:x;const P=[[x0,y-sz*.86],[x0+wd,y-sz*.86],[x0,y+sz*.16],[x0+wd,y+sz*.16]].map(([a,b])=>[m.a*a+m.c*b+m.e,m.b*a+m.d*b+m.f]);
  REC.tx.push([s,Math.round(Math.min(...P.map(p=>p[0]))),Math.round(Math.min(...P.map(p=>p[1]))),Math.round(Math.max(...P.map(p=>p[0]))),Math.round(Math.max(...P.map(p=>p[1]))),+g.globalAlpha.toFixed(2)])}
// 音效：在场景里写 sfx('ding', 时间)；pop() 自动带 'pop'。类型：pop tick whoosh ding rise thud
function sfx(type,t0,gain=1){if(REC&&t0>=0)REC.ev[type+'@'+t0.toFixed(2)]=gain}
function tw(s,sz,w='H7'){sz=vsz(sz);g.font=`${sz}px ${w}, H7`;return g.measureText(s).width}
function rr(x,y,w,h,r){g.beginPath();g.roundRect(x,y,w,h,r)}
function pop(t,t0,fn,d=.45){sfx('pop',t0);const k=seg(t,t0,t0+d);if(k<=0)return;g.save();g.globalAlpha*=cl(k*2.5);fn(back(k));g.restore()}
function rise(t,t0,s,x,y,sz,col,w,al){const k=eo(seg(t,t0,t0+.5));if(k<=0)return;txt(s,x,y+(1-k)*26,sz,col,w,al,k)}
function glow(x,y,r,col,a=1){const gr=g.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,col);gr.addColorStop(1,'rgba(0,0,0,0)');g.save();g.globalAlpha*=a;g.globalCompositeOperation='lighter';g.fillStyle=gr;g.beginPath();g.arc(x,y,r,0,7);g.fill();g.restore()}
function pill(s,x,y,sz,bgc,fc='#06101f',a=1){if(a<=0)return 0;g.save();g.globalAlpha*=a;const w=tw(s,sz,'H9')+sz*1.1;g.fillStyle=bgc;rr(x,y-sz*1.05,w,sz*1.6,sz*.8);g.fill();txt(s,x+sz*.55,y+sz*.12,sz,fc,'H9');g.restore();return w}
function dash(x1,y1,x2,y2,k,col,lw=4,d=[14,12]){g.save();g.strokeStyle=col;g.lineWidth=lw;g.setLineDash(d);g.lineCap='round';g.beginPath();g.moveTo(x1,y1);g.lineTo(lerp(x1,x2,k),lerp(y1,y2,k));g.stroke();g.restore()}
function arrow(x1,y1,x2,y2,k,col,lw=6){if(k<=0)return;const x=lerp(x1,x2,k),y=lerp(y1,y2,k),a=Math.atan2(y2-y1,x2-x1);g.save();g.strokeStyle=col;g.fillStyle=col;g.lineWidth=lw;g.lineCap='round';g.beginPath();g.moveTo(x1,y1);g.lineTo(x,y);g.stroke();g.translate(x,y);g.rotate(a);g.beginPath();g.moveTo(8,0);g.lineTo(-18,-12);g.lineTo(-18,12);g.fill();g.restore()}
function num(t,t0,val,dur=1){return Math.round(val*expo(seg(t,t0,t0+dur))).toLocaleString('en-US')}
function wave(x1,x2,y,amp,wl,ph,col,lw=6,k=1){g.save();g.strokeStyle=col;g.lineWidth=lw;g.lineCap='round';g.beginPath();const xe=lerp(x1,x2,k);for(let x=x1;x<=xe;x+=4){const yy=y+Math.sin((x-ph)/wl*2*Math.PI)*amp;x===x1?g.moveTo(x,yy):g.lineTo(x,yy)}g.stroke();g.restore()}
function person(x,y,s,col){g.save();g.fillStyle=col;g.beginPath();g.arc(x,y-s*.95,s*.42,0,7);g.fill();g.beginPath();g.moveTo(x-s*.8,y+s*.6);g.quadraticCurveTo(x-s*.8,y-s*.4,x,y-s*.4);g.quadraticCurveTo(x+s*.8,y-s*.4,x+s*.8,y+s*.6);g.closePath();g.fill();g.restore()}
function card(x,y,w,h,col,fill){g.fillStyle=fill||TH.card;g.strokeStyle=col;g.lineWidth=5;rr(x,y,w,h,32);g.fill();g.stroke()}
// 真实照片：圆角卡片 + 署名；crop=[sx,sy,sw,sh]
function photo(key,x,y,w,h,crop,credit,k=0,col,r=22){const im=IM[key];const c=crop||[0,0,im.width,im.height];const z=1+.06*k;g.save();g.shadowColor='rgba(0,0,0,.55)';g.shadowBlur=40;g.shadowOffsetY=14;g.fillStyle='#000';rr(x,y,w,h,r);g.fill();g.restore();
  g.save();rr(x,y,w,h,r);g.clip();const s=Math.max(w/c[2],h/c[3])*z;const dw=c[2]*s,dh=c[3]*s;g.drawImage(im,c[0],c[1],c[2],c[3],x+(w-dw)/2,y+(h-dh)/2,dw,dh);g.restore();g.strokeStyle=col||TH.a1;g.lineWidth=5;rr(x,y,w,h,r);g.stroke();
  if(credit)txt('照片：'+credit,x+w,y+h+32,22,TH.dim,'H5','right')}
function photoCircle(key,cx,cy,rad,crop,col){const im=IM[key];const c=crop||[0,0,im.width,im.height];g.save();g.beginPath();g.arc(cx,cy,rad,0,7);g.clip();const s=Math.max(2*rad/c[2],2*rad/c[3]);g.drawImage(im,c[0],c[1],c[2],c[3],cx-c[2]*s/2,cy-c[3]*s/2,c[2]*s,c[3]*s);g.restore();g.strokeStyle=col||TH.a1;g.lineWidth=6;g.beginPath();g.arc(cx,cy,rad,0,7);g.stroke()}

/* ---------- 分场：按句子起止自动淡入淡出 ---------- */
function fadeIO(t,a,b,d=.45){return eo(seg(t,a-.05,a+d))*(1-seg(t,b-d,b))}
function scn(t,a,b,fn,d){const al=fadeIO(t,a,b,d);if(al<=0)return;g.save();g.globalAlpha=al;fn();g.restore()}
// 固定版式：记住三件事 cards=[{tag,title,sub,icon(g)}]
// 三张卡片：at 出卡片，subAt 出小字（原因），titleAt 出大字（结论）——先原因后结论
function threeCards(t,id,title,cards){rise(t,T(id)+.2,title,W/2,220,84,TH.ink,'H9','center');cards.forEach((c,i)=>{const t0=T(id)+1+i*.5,k=eo(seg(t,t0,t0+.5))*(1-seg(t,c.at-.1,c.at+.3));if(k<=0)return;sfx('tick',t0);g.save();g.globalAlpha*=k*.55;g.strokeStyle=c.col||TH.a1;g.lineWidth=4;g.setLineDash([14,14]);rr(100+i*600,330,520,540,32);g.stroke();g.restore()});cards.forEach((c,i)=>{pop(t,c.at,k=>{const cx=360+i*600,cy=590;g.translate(cx,cy);g.scale(k,k);card(-260,-260,520,540,c.col||TH.a1);if(c.icon)c.icon();txt(c.tag,0,40,38,c.col||TH.a1,'H7','center');const sz=Math.min(104,104*460/tw(c.title,104,'H9')),tt=c.titleAt??c.at;txt(c.title,0,150,sz,TH.ink,'H9','center',eo(seg(t,tt,tt+.4)));const ts=c.subAt??c.at+1.6;txt(c.sub,0,222+(1-eo(seg(t,ts,ts+.5)))*16,Math.min(36,36*470/tw(c.sub,36,'KT')),TH.ink,'KT','center',.85*eo(seg(t,ts,ts+.5)))})})}

/* ---------- 包装：问题章节条 + 字幕 ---------- */
// 章节条样式 FILM.chrome：'question'（问题+序号，默认）'label'（只有标题）'step'（第几步/共几步）'date'（年代大字+标题，章节写成 "1969｜登月"）'none'
function chrome(t){const mode=FILM.chrome||'question';if(mode==='none')return;const CH=FILM.chapters;const cur=TL.filter(s=>s.t0-.2<=t).pop()||TL[0];const ci=CH.indexOf(cur.ch);const st=TL.find(s=>s.ch===cur.ch).t0;const k=eo(seg(t,st-.2,st+.35));g.save();
  if(mode==='date'){const [yr,ttl]=cur.ch.includes('｜')?cur.ch.split('｜'):['',cur.ch];g.globalAlpha=k;g.font='800 64px RC, H9';g.fillStyle=TH.a1;g.textAlign='left';g.textBaseline='alphabetic';g.fillText(yr,64,96);const yw=g.measureText(yr).width;txt(ttl,64+yw+(yr?22:0),92,36,TH.ink,TH.f.t);g.globalAlpha=1}
  else{const q=mode==='step'?`第 ${ci+1} 步 / 共 ${CH.length} 步　${cur.ch}`:mode==='label'?cur.ch:(ci+1)+' · '+cur.ch+(ci<(FILM.questions??CH.length-1)?'？':'');const w=tw(q,34,'H9')+56,X0=VERT?SAFE.l+16:64,Y0=VERT?SAFE.t+10:44;g.fillStyle=TH.chip;rr(X0,Y0,w*k,62,31);g.fill();g.strokeStyle=TH.a1;g.globalAlpha=.8;g.lineWidth=2;rr(X0,Y0,w*k,62,31);g.stroke();g.globalAlpha=1;
   g.save();g.beginPath();g.rect(X0,Y0,w*k,62);g.clip();txt(q,X0+28,Y0+43,34,TH.light?TH.ink:TH.a1,'H9');g.restore()}
  for(let i=0;i<CH.length;i++){g.globalAlpha=i<=ci?1:.3;g.fillStyle=i===ci?TH.a1:TH.ink;g.beginPath();g.arc(W-(VERT?SAFE.r+30:90)-(CH.length-1-i)*34,VERT?SAFE.t+41:75,i===ci?9:6,0,7);g.fill()}g.restore()}
function subs(t){const s=TL.find(s=>t>=s.t0&&t<s.t1);if(!s)return;const c=(s.chunks||[]).find(c=>t>=c.t0&&t<c.t1);if(!c)return;g.save();
  // 竖版：字更大、放在平台底部文案区上面；字幕在构建时已经按竖版切得更短
  if(VERT){const sz=56,w=tw(c.text,sz,TH.f.b),y=H-SAFE.b-36;g.fillStyle=TH.sub;rr(W/2-w/2-32,y-sz-12,w+64,sz+40,30);g.fill();txt(c.text,W/2,y,sz,TH.subInk,TH.f.b,'center');g.restore();return}
  const w=tw(c.text,42,TH.f.b);g.fillStyle=TH.sub;rr(W/2-w/2-30,H-112,w+60,68,34);g.fill();txt(c.text,W/2,H-64,42,TH.subInk,TH.f.b,'center');g.restore()}
function credits(t,t0,lines,y0=650){lines.forEach((l,i)=>rise(t,t0+i*.2,l,W/2,y0+i*50,32,TH.note,'H5','center'))}

/* ---------- 渲染入口 ---------- */
window.renderFrame=t=>{if(REC)REC.tx=[];g.setTransform(1,0,0,1,0,0);g.globalAlpha=1;g.globalCompositeOperation='source-over';g.setLineDash([]);TH.bg(t);FILM.scenes(t);g.setTransform(1,0,0,1,0,0);g.globalAlpha=1;g.globalCompositeOperation='source-over';g.filter='none';if(TH.post)TH.post(t);if(!window.CLEAN){chrome(t);typeof FILM.subs==='function'?FILM.subs(t):FILM.subs!==false&&subs(t)}
  const f=1-eo(seg(t,0,.6))+seg(t,total()-.8,total());if(f>0){g.fillStyle=`rgba(0,0,0,${cl(f)})`;g.fillRect(0,0,W,H)}if(REC)LASTTX=REC.tx;return true};
// 竖版：把横版画面放进 1080x1920，上面标题、下面大字幕
window.vertFrame=(t,sub,prog)=>{window.CLEAN=1;window.renderFrame(t);window.CLEAN=0;let V=window.__V;if(!V){V=window.__V=document.createElement('canvas');V.width=1080;V.height=1920}const v=V.getContext('2d'),C=FILM.cover;
  const bg=v.createLinearGradient(0,0,0,1920);bg.addColorStop(0,TH.top);bg.addColorStop(1,TH.bot);v.fillStyle=bg;v.fillRect(0,0,1080,1920);
  const X=(s,x,y,sz,col,w='H9')=>{v.font=`${sz}px ${w}, H7`;v.fillStyle=col;v.textAlign='center';v.textBaseline='alphabetic';v.fillText(s,x,y)};const F=(s,b,m)=>{v.font=`${b}px H9, H7`;return Math.floor(Math.min(b,b*m/v.measureText(s).width))};
  v.font='44px H9';const pw=v.measureText(C.pill).width+56;v.fillStyle=TH.light?TH.a1:TH.a2;v.beginPath();v.roundRect(540-pw/2,150,pw,74,37);v.fill();X(C.pill,540,203,44,TH.pillInk);
  X(C.title,540,370,F(C.title,128,960),TH.ink);v.fillStyle=TH.a1;v.fillRect(340,405,400,8);X(C.shortSub||C.tagline,540,480,40,TH.dim,'H7');
  v.drawImage(cv,0,0,1920,1080,0,560,1080,608);v.fillStyle=TH.a1;v.fillRect(0,554,1080,6);v.fillRect(0,1168,1080,6);
  if(sub){const lines=[];let cur='';for(const ch of sub){cur+=ch;if(cur.length>=13){lines.push(cur);cur=''}}if(cur){if(cur.length<3&&lines.length)lines[lines.length-1]+=cur;else lines.push(cur)}lines.slice(0,3).forEach((l,i)=>X(l,540,1330+i*96,70,TH.ink))}
  X('完整版在主页',540,1740,40,TH.dim,'H7');v.fillStyle=TH.chip;v.fillRect(90,1800,900,8);v.fillStyle=TH.a1;v.fillRect(90,1800,900*prog,8);return V.toDataURL('image/jpeg',.93)};
// 封面：v='wide' 1920x1080、'tall' 1080x1440（3:4）或 'vert' 1080x1920（9:16，内容在正中 3:4 区域）；主体图由 FILM.cover.art(ctx,cx,cy,R) 画
window.coverFrame=v=>{const vert=v==='vert',tall=v==='tall'||vert,CW=tall?1080:1920,CH=tall?1440:1080;const K=document.createElement('canvas');K.width=CW;K.height=vert?1920:CH;const c=K.getContext('2d'),C=FILM.cover;
  const bg=c.createLinearGradient(0,0,CW,K.height);bg.addColorStop(0,TH.top);bg.addColorStop(1,TH.bot);c.fillStyle=bg;c.fillRect(0,0,CW,K.height);
  if(vert)c.translate(0,240);   // 9:16 封面：版式和 3:4 一样，放在正中间（主页宫格按 3:4 裁中间）
  const X=(s,x,y,sz,col,w='H9',al='left')=>{c.font=`${sz}px ${w}, H7`;c.fillStyle=col;c.textAlign=al;c.textBaseline='alphabetic';c.fillText(s,x,y)};const M=(s,sz)=>{c.font=`${sz}px H9, H7`;return c.measureText(s).width};const F=(s,b,m)=>Math.floor(Math.min(b,b*m/M(s,b)));
  const cx=tall?CW/2:1510,cy=tall?430:500,R=tall?300:310;C.art(c,cx,cy,R,CW,CH);
  const P=(s,x,y,sz)=>{const w=M(s,sz)+sz*1.2;c.fillStyle=TH.light?TH.a1:TH.a2;c.beginPath();c.roundRect(x,y-sz*1.08,w,sz*1.66,sz*.83);c.fill();X(s,x+sz*.6,y+sz*.12,sz,TH.pillInk)};
  if(!tall){P(C.pill,110,210,54);X(C.title,96,470,F(C.title,186,1010),TH.ink);c.fillStyle=TH.a1;c.fillRect(110,520,560,10);X(C.line1,110,650,F(C.line1,84,1000),TH.ink);X(C.line2,110,760,F(C.line2,84,1000),TH.a1);X(C.tagline,110,880,48,TH.dim,'H7');
    if(C.name)X(C.name,cx,cy+R+96,60,TH.ink,'H9','center');if(C.credit)X(C.credit,CW-40,CH-28,20,TH.dim,'H5','right')}
  else{P(C.pill,CW/2-(M(C.pill,46)+55)/2,96,46);if(C.name)X(C.name,CW/2,cy+R+84,40,TH.dim,'H7','center');X(C.title,CW/2,1010,F(C.title,150,940),TH.ink,'H9','center');c.fillStyle=TH.a1;c.fillRect(CW/2-240,1050,480,9);
    X(C.line1,CW/2,1170,F(C.line1,70,960),TH.ink,'H9','center');X(C.line2,CW/2,1265,F(C.line2,70,960),TH.a1,'H9','center');X(C.tagline,CW/2,1360,40,TH.dim,'H7','center');if(C.credit)X(C.credit,CW-30,CH-22,18,TH.dim,'H5','right')}
  return K.toDataURL('image/png')};
// 需要等素材（视频片段的某一帧）加载的渲染：先画一遍登记要哪些帧，等它们到了再画
window.renderFrameA=async t=>{for(let i=0;i<5;i++){PENDING=[];window.renderFrame(t);if(!PENDING.length)break;await Promise.all(PENDING)}return true};
window.vertFrameA=async(t,sub,prog)=>{window.CLEAN=1;await window.renderFrameA(t);window.CLEAN=0;return window.vertFrame(t,sub,prog)};
// 整片扫描：每 step 秒画一帧（不带章节条和字幕），返回文字框、画面变化量、音效事件、用到的素材
window.scan=async(step=.1)=>{const T=total(),th=document.createElement('canvas');th.width=96;th.height=54;const c=th.getContext('2d',{willReadFrequently:true});let prev=null;const frames=[],ev={},used={},miss={};window.CLEAN=1;
  for(let t=0;t<T;t+=step){await window.renderFrameA(t);REC={tx:[],ev,used,miss};window.renderFrame(t);REC=null;c.drawImage(cv,0,0,96,54);const d=c.getImageData(0,0,96,54).data;let df=0;if(prev){for(let i=0;i<d.length;i+=4)df+=Math.abs(d[i]-prev[i])+Math.abs(d[i+1]-prev[i+1])+Math.abs(d[i+2]-prev[i+2]);df/=d.length/4*3}prev=d;frames.push({t:+t.toFixed(2),tx:LASTTX,df:+df.toFixed(3)})}
  window.CLEAN=0;return {frames,events:Object.entries(ev).map(([k,g])=>{const i=k.lastIndexOf('@');return {type:k.slice(0,i),t:+k.slice(i+1),gain:g}}).sort((a,b)=>a.t-b.t),used,miss:Object.keys(miss),W,H,total:T}};
// 动效扫描：整片逐帧画一遍，量每一对相邻帧有多少像素在动（mv，占画面的比例）和画这一帧用了多久（ms）；
// 另抽几个时刻，隔着别的帧各画两遍，看结果是不是逐像素一样（det）。量法照 huashu-art-motion 的 qa.py：
// 隔 0.1 秒比两帧看得出“有没有动”，看不出“是连续在动还是一卡一卡”，也看不出单帧的闪烁和硬切，所以这里每一对相邻帧都比，不抽样。
window.motionScan=async(fps=30)=>{const T=total(),tw_=192,th_=Math.round(192*H/W),th=document.createElement('canvas');th.width=tw_;th.height=th_;const c=th.getContext('2d',{willReadFrequently:true}),frames=[],det=[];window.CLEAN=1;let a=null;
  for(let k=0;k/fps<T;k++){const t=k/fps,s=performance.now();await window.renderFrameA(t);c.drawImage(cv,0,0,tw_,th_);const b=c.getImageData(0,0,tw_,th_).data,ms=performance.now()-s;if(a){let n=0;for(let i=0;i<a.length;i+=4)if(Math.abs(a[i]-b[i])>12||Math.abs(a[i+1]-b[i+1])>12||Math.abs(a[i+2]-b[i+2])>12)n++;frames.push({t:+((k-1)/fps).toFixed(3),mv:+(n/(a.length/4)).toFixed(5),ms:+ms.toFixed(1)})}a=b}
  const png=async t=>{await window.renderFrameA(t);return cv.toDataURL('image/png')};
  for(let k=0;k<8;k++){const t=+(T*(k+.5)/8).toFixed(2),u=await png(t);await png((t+T/2)%T);await png(Math.max(0,t-.5));det.push({t,same:u===await png(t)})}
  window.CLEAN=0;return {frames,det,total:T,fps}};
let LASTTX=[],ASSETS=[];
// tl 时间轴；assets 素材台账（图片直接载入 IM，视频片段登记到 CLIPS，逐帧按需加载）
window.init=async(tl,assets)=>{TL=tl;FILM=window.FILM;TH=THEMES[FILM.theme]||THEMES.space;if(FILM.themePatch)Object.assign(TH,FILM.themePatch);ASSETS=assets||[];
  const imgs=Object.entries(FILM.images||{}).concat(ASSETS.filter(a=>a.type==='image').map(a=>[a.id,'/project/'+a.file]));
  await Promise.all(imgs.map(([k,u])=>new Promise((r,j)=>{const i=new Image();i.onload=()=>{IM[k]=i;r()};i.onerror=()=>j(new Error('图片加载失败 '+u));i.src=u})));
  ASSETS.filter(a=>a.type==='video'&&a.clip).forEach(a=>{CLIPS[a.id]=a.clip});
  await Promise.all(['H5','H7','H9','KT'].map(f=>document.fonts.load(`40px ${f}`,'讲解视频')));await document.fonts.load('800 40px RC','2026');for(const f of (window.PACK_INIT||[]))await f(tl);await document.fonts.ready;return total()};
