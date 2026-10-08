/* 风格包 · 案卷 —— 本项目自己实现
   牛皮纸档案夹里一张张案卷卡，每张只有三样东西：标题（这条说法）、证物（网点图、原文、记录）、一行结论；红章盖下去有一下冲击。
   规矩：红色只给结论章（属实 / 不实 / 存疑 / 待核），别的东西一律用墨色；图片一律网点化，没有图就画网点占位并标“示意”；
   卡和卡之间硬切或像翻档案（上一张往上翻走，露出下一张）；卡角写“第 n / 共 N 条”；字大，打字机感（逐字打出、轻微错位和浓淡）。
   坐标是 1920×1080 画布；档案夹内页 PAGE={x,y,w,h} 画在主题背景里，卡片默认放在内页中间。底部 120 像素不放字。
   用法：
   folder(t, t0, o)                         档案夹：o={label 封面大字, sub 封面小字, head 封面左上小字（缺省“案卷”）, tabs:['老钟',…]|[{label, at}] 顶上的标签页（at 起这一页高亮）,
                                            tabsIn 标签页出现时刻（相对 t0，缺省 .8）, openAt 封面翻开时刻, closeAt 合上时刻, dur 翻开用时, seal:{text, at, x, y, sz, col, rot} 合上后在封面盖章（缺省墨色）}
   card(t, t0, o)                           一张案卷卡，按“标题→证物→结论”的顺序出：o={no, total, title, evidence, line, verdict:{text, at, rot, sz}, tag 卡头黑底小标（如“虚构示例”）,
                                            at:{title, ev, cap, line} 各部分相对 t0 的出现时刻, out 开始翻走的时刻, flip 翻走用时, pre 提前多少秒以空白卡垫在上一张底下, stack 下面还压着几张, x, y, w, h}
                                            evidence={kind:'image', img, crop, art(c,w,h), id, label, cap} 网点图 | {kind:'quote', lines:[…], src, redact:{line, a, b, at, mode}, cap} 原文纸条 |
                                            {kind:'text', head, lines:[…], ticks, sign, signAt, cap} 记录单（sign 是落款，后面自动用黑条涂掉）
                                            返回 {x, y, w, h, stamp:[x, y]}；verdict 给了就在 stamp 位置盖章，卡片跟着震一下
   verdict(t, t0, '不实', o)                章：o={x, y, rot 弧度, sz 字号, col 缺省红, gain}；从空中砸下 0.13 秒落定，落定时一圈冲击和溅点，带 sfx('thud')
   halftone(t, t0, {x, y, w, h}, o)         网点图片位：o={img IM 的键, crop, art(c,w,h) 没有图时用灰度画一张简图, id 缓存名, label 角标（没图缺省“示意”）, cell 网点间距, dur 印出来用时}
   redact(t, t0, {x, y, w, h}, o)           黑条：o.mode='cover' t0 起从左往右涂上（缺省）| 'reveal' 一直盖着、t0 起揭开；o={since 'reveal' 时黑条从何时起出现, t1 'cover' 时何时揭掉, dur}
   tally(t, t0, items, o)                   清单：items=[{label, verdict, at, vat}]，逐行打出、逐行盖小章；o={title, tag, x, y, w, h, rowH, pre, out 停画时刻}
   typed(t, s, x, y, sz, o)                 打字机字：o={f 字体, wt 字重, col, al, a, t0 起打时刻（不给就直接全显）, cps 每秒几个字, jit 错位幅度}；整串登记给检查，返回 {w, end}
   tag(t, s, x, y, o)                       黑底小标（“虚构示例”“示意”）；x,y 是左上角（o.al='right' 时是右上角），o={sz, t0}；返回宽度
   sheet(x, y, w, h, o)                     一张卡纸：o={col, rules:{from, step} 横格, r, blur}
   on(ctx, fn)                              临时把画笔换成 ctx（封面 art 里用：sheet、halftone、verdict 都能画；不登记文字）
   常量：PAGE 内页范围，RED 章红，INK 墨，CREAM 卡纸，KRAFT 牛皮纸，DIM 淡墨
   注意：卡片翻走时字先降到半透明再压扁（检查不会报小字）；下一张卡用 pre 提前以空白卡垫在底下，所以场景里后出的卡先画。 */
window.PACK=window.PACK||{};window.PACK_INIT=window.PACK_INIT||[];
PACK.dossier=(function(){
  const RED='#c22a1f',INK='#1f1a14',CREAM='#f3ecda',KRAFT='#c7a068',KRAFT2='#b98f55',DESK='#2a2824',DIM='rgba(31,26,20,.62)',BLUE='#2f4a5e';
  const PAGE={x:70,y:86,w:1780,h:950};
  let G=g;
  function on(ctx,fn){const o=G;G=ctx;try{fn()}finally{G=o}}
  const recOn=()=>typeof REC!=='undefined'&&REC&&G===g;
  const mk=(w,h,rf)=>{const c=document.createElement('canvas');c.width=Math.max(1,Math.ceil(w));c.height=Math.max(1,Math.ceil(h));c._x=c.getContext('2d',rf?{willReadFrequently:true}:undefined);return c};
  const PI=Math.PI;
  function rrect(c,x,y,w,h,r){c.beginPath();c.roundRect(x,y,w,h,r)}

  /* ---------- 预先做好的纸张 ---------- */
  let _fib=null,_bg=null,_cover=null,_vig=null;
  function fiberTex(){if(_fib)return _fib;const c=_fib=mk(256,256),x=c._x;
    for(let i=0;i<900;i++){x.fillStyle=rnd(i+31)>.45?`rgba(70,48,20,${.04+.08*rnd(i+41)})`:`rgba(255,250,235,${.08+.16*rnd(i+51)})`;x.fillRect(rnd(i+61)*256,rnd(i+71)*256,1+rnd(i+81)*2.2,1+rnd(i+91)*1.4)}
    x.lineCap='round';for(let i=0;i<70;i++){const px=rnd(i+111)*256,py=rnd(i+121)*256,an=rnd(i+131)*6.28,l=6+rnd(i+151)*16;x.strokeStyle=`rgba(80,55,22,${.06+.07*rnd(i+141)})`;x.lineWidth=.8;x.beginPath();x.moveTo(px,py);x.quadraticCurveTo(px+Math.cos(an+.6)*l*.5,py+Math.sin(an+.6)*l*.5,px+Math.cos(an)*l,py+Math.sin(an)*l);x.stroke()}
    return c}
  function mottle(x,w,h,n,seed,a){for(let i=0;i<n;i++){const px=rnd(seed+i)*w,py=rnd(seed+i+400)*h,r=80+rnd(seed+i+800)*320,gr=x.createRadialGradient(px,py,0,px,py,r),dk=rnd(seed+i+1200)>.5;
    gr.addColorStop(0,dk?`rgba(90,58,20,${a})`:`rgba(255,240,205,${a})`);gr.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=gr;x.fillRect(px-r,py-r,2*r,2*r)}}
  function bgTex(){if(_bg)return _bg;const c=_bg=mk(W,H),x=c._x;
    // 桌面
    x.fillStyle=DESK;x.fillRect(0,0,W,H);const dg=x.createLinearGradient(0,0,W,H);dg.addColorStop(0,'rgba(255,240,210,.05)');dg.addColorStop(1,'rgba(0,0,0,.18)');x.fillStyle=dg;x.fillRect(0,0,W,H);
    for(let i=0;i<5000;i++){x.fillStyle=rnd(i+5)>.5?`rgba(255,240,215,${.02+.05*rnd(i+6)})`:`rgba(0,0,0,${.05+.08*rnd(i+7)})`;x.fillRect(rnd(i+8)*W,rnd(i+9)*H,1+rnd(i+10)*1.5,1+rnd(i+11)*1.5)}
    // 档案夹内页
    const P=PAGE;x.save();x.shadowColor='rgba(0,0,0,.55)';x.shadowBlur=36;x.shadowOffsetY=12;x.fillStyle=KRAFT;rrect(x,P.x,P.y,P.w,P.h,10);x.fill();x.restore();
    x.save();rrect(x,P.x,P.y,P.w,P.h,10);x.clip();mottle(x,W,H,46,17,.07);x.translate(P.x,P.y);x.fillStyle=x.createPattern(fiberTex(),'repeat');x.globalAlpha=.9;x.fillRect(0,0,P.w,P.h);x.globalAlpha=1;x.translate(-P.x,-P.y);
    const eg=x.createLinearGradient(P.x,0,P.x+P.w,0);eg.addColorStop(0,'rgba(70,45,15,.22)');eg.addColorStop(.04,'rgba(70,45,15,0)');eg.addColorStop(.96,'rgba(70,45,15,0)');eg.addColorStop(1,'rgba(70,45,15,.18)');x.fillStyle=eg;x.fillRect(P.x,P.y,P.w,P.h);
    // 折痕（靠书脊的两道压线）、底部扩展压线
    x.strokeStyle='rgba(70,45,15,.30)';x.lineWidth=2;[34,48].forEach(d=>{x.beginPath();x.moveTo(P.x+d,P.y+6);x.lineTo(P.x+d,P.y+P.h-6);x.stroke()});
    x.strokeStyle='rgba(255,240,205,.22)';x.lineWidth=1.5;[36,50].forEach(d=>{x.beginPath();x.moveTo(P.x+d,P.y+6);x.lineTo(P.x+d,P.y+P.h-6);x.stroke()});
    // 两个打孔 + 金属圈
    [330,790].forEach(py=>{const px=P.x+98;x.fillStyle='#8f8a80';x.beginPath();x.arc(px,py,17,0,7);x.fill();x.fillStyle='#c9c3b6';x.beginPath();x.arc(px-2,py-2,15,0,7);x.fill();x.fillStyle=DESK;x.beginPath();x.arc(px,py,9,0,7);x.fill()});
    x.restore();x.strokeStyle='rgba(60,38,12,.5)';x.lineWidth=2;rrect(x,P.x,P.y,P.w,P.h,10);x.stroke();return c}
  function coverTex(){if(_cover)return _cover;const P=PAGE,c=_cover=mk(P.w,P.h),x=c._x;
    x.fillStyle=KRAFT2;rrect(x,0,0,P.w,P.h,10);x.fill();x.save();rrect(x,0,0,P.w,P.h,10);x.clip();mottle(x,P.w,P.h,40,91,.08);x.fillStyle=x.createPattern(fiberTex(),'repeat');x.fillRect(0,0,P.w,P.h);
    // 印刷的框线
    x.strokeStyle='rgba(31,26,20,.32)';x.lineWidth=4;x.strokeRect(64,40,P.w-104,P.h-80);x.lineWidth=1.5;x.strokeRect(76,52,P.w-128,P.h-104);
    x.strokeStyle='rgba(70,45,15,.34)';x.lineWidth=2;[30,44].forEach(d=>{x.beginPath();x.moveTo(d,6);x.lineTo(d,P.h-6);x.stroke()});
    // 磨损的边
    for(let i=0;i<220;i++){const s=rnd(i+3)*4|0,u=rnd(i+5);const px=s===0?u*P.w:s===1?P.w-rnd(i+7)*8:s===2?u*P.w:rnd(i+7)*8,py=s===0?rnd(i+7)*8:s===2?P.h-rnd(i+7)*8:u*P.h;x.fillStyle=`rgba(240,222,185,${.15+.25*rnd(i+9)})`;x.fillRect(px,py,2+rnd(i+11)*5,1+rnd(i+13)*3)}
    // 贴签（米色），左上画一道格线
    const sx=470-P.x,sy=300-P.y,sw=980,sh=340;x.save();x.shadowColor='rgba(40,20,0,.35)';x.shadowBlur=8;x.shadowOffsetY=3;x.fillStyle=CREAM;x.fillRect(sx,sy,sw,sh);x.restore();
    x.save();x.translate(sx,sy);x.fillStyle=x.createPattern(fiberTex(),'repeat');x.globalAlpha=.6;x.fillRect(0,0,sw,sh);x.restore();
    x.strokeStyle='rgba(31,26,20,.55)';x.lineWidth=3;x.beginPath();x.moveTo(sx+40,sy+100);x.lineTo(sx+sw-40,sy+100);x.stroke();x.lineWidth=1.2;x.beginPath();x.moveTo(sx+40,sy+108);x.lineTo(sx+sw-40,sy+108);x.stroke();
    x.restore();return c}
  function vigTex(){if(_vig)return _vig;const c=_vig=mk(W,H),x=c._x,v=x.createRadialGradient(W*.5,H*.46,H*.45,W/2,H/2,H*1.1);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(20,10,0,.34)');x.fillStyle=v;x.fillRect(0,0,W,H);return c}

  addTheme('dossier',{light:true,ink:INK,dim:DIM,note:'rgba(31,26,20,.8)',a1:BLUE,a2:'#7a5a2e',a3:'#5b5348',chip:'rgba(31,26,20,.08)',
    sub:'rgba(24,20,15,.86)',subInk:'#f3ecda',top:'#d4b07a',bot:'#b88e55',card:'rgba(243,236,218,.97)',cardInk:INK,pillInk:'#f3ecda',hl:'rgba(230,205,130,.75)',
    f:{t:'H9',b:'H7',s:'H5',h:'KT',n:'RC'},
    bg(t){g.drawImage(bgTex(),0,0)},post(t){g.drawImage(vigTex(),0,0)}});

  /* ---------- 打字机字：整串登记一次，逐字画（轻微错位、浓淡、双击墨痕） ---------- */
  const WC=new Map();
  function widths(s,font){const k=font+'|'+s;let a=WC.get(k);if(a)return a;G.font=font;a=[0];let acc='';for(const ch of Array.from(s)){acc+=ch;a.push(G.measureText(acc).width)}if(WC.size>3000)WC.clear();WC.set(k,a);return a}
  const fontOf=(sz,o)=>`${o.wt?o.wt+' ':''}${sz}px ${o.f||'H7'}, H7`;
  function typed(t,s,x,y,sz,o={}){s=String(s);const ch=Array.from(s),n0=ch.length,cps=o.cps||20,t0=o.t0;const end=t0!=null?t0+n0/cps:0;if(!n0)return {w:0,end};
    let n=n0;if(t0!=null){if(t<t0)return {w:0,end};n=Math.min(n0,Math.floor((t-t0)*cps)+1)}
    const a=o.a??1;if(a<=0)return {w:0,end};const font=fontOf(sz,o),P=widths(s,font),wd=P[n0],al=o.al||'left',x0=al==='center'?x-wd/2:al==='right'?x-wd:x;
    G.save();G.font=font;G.textAlign='left';G.textBaseline='alphabetic';G.globalAlpha*=a;const base=G.globalAlpha;
    if(recOn()){if(n<n0*.6)G.globalAlpha=base*.5;recText(s,x0,y,sz,'left');G.globalAlpha=base;if(t0!=null)sfx('tick',t0,.3)}
    const col=o.col||INK,sd=o.seed??(Math.round(x*1.3+y*2.7)%997+n0),jit=o.jit??1;G.fillStyle=col;
    for(let i=0;i<n;i++){const c=ch[i];if(c===' '||c==='　')continue;const dx=(rnd(sd+i*3.1)-.5)*sz*.03*jit,dy=(rnd(sd+i*5.7+1)-.5)*sz*.07*jit,ink=.8+.2*rnd(sd+i*2.3+2);
      const fresh=t0!=null&&n<n0&&i===n-1?sz*.04:0;G.globalAlpha=base*ink;G.fillText(c,x0+P[i]+dx,y+dy-fresh);G.globalAlpha=base*ink*.3;G.fillText(c,x0+P[i]+dx+sz*.014,y+dy+sz*.01-fresh)}
    if(t0!=null&&n<n0){G.globalAlpha=base;G.fillStyle=col;G.fillRect(x0+P[n]+2,y+sz*.12,sz*.55,Math.max(3,sz*.07))}
    G.restore();return {w:wd,x0,end,P,font}}
  function tag(t,s,x,y,o={}){const sz=o.sz||32;if(o.t0!=null&&t<o.t0)return 0;G.save();G.font=`${sz}px H7, H7`;const w=G.measureText(s).width+sz*.9,h=sz*1.5,x0=o.al==='right'?x-w:x;
    G.globalAlpha*=o.a??1;G.fillStyle=o.bg||INK;G.fillRect(x0,y,w,h);G.restore();typed(t,s,x0+sz*.45,y+sz*1.1,sz,{col:o.col||CREAM,jit:.5,a:o.a});return w}

  /* ---------- 卡纸 ---------- */
  function sheet(x,y,w,h,o={}){const r=o.r??6;G.save();G.shadowColor=o.shadow||'rgba(30,18,6,.40)';G.shadowBlur=o.blur??22;G.shadowOffsetY=o.sy??10;G.shadowOffsetX=o.sx??3;G.fillStyle=o.col||CREAM;rrect(G,x,y,w,h,r);G.fill();G.restore();
    G.save();rrect(G,x,y,w,h,r);G.clip();G.translate(x,y);G.globalAlpha*=.55;G.fillStyle=G.createPattern(fiberTex(),'repeat');G.fillRect(0,0,w,h);G.restore();
    if(o.rules){G.save();G.strokeStyle='rgba(47,74,94,.17)';G.lineWidth=2;G.beginPath();for(let yy=y+o.rules.from;yy<y+h-24;yy+=o.rules.step){G.moveTo(x+24,yy);G.lineTo(x+w-24,yy)}G.stroke();G.restore()}
    G.save();const eg=G.createLinearGradient(0,y,0,y+h);eg.addColorStop(0,'rgba(255,255,255,.10)');eg.addColorStop(1,'rgba(90,60,20,.10)');G.fillStyle=eg;rrect(G,x,y,w,h,r);G.fill();G.restore()}

  /* ---------- 章：缓存成一张有磨损的印，盖下去 ---------- */
  const ST=new Map();
  function stampTex(text,sz,col){const k=text+'|'+sz+'|'+col;let c=ST.get(k);if(c)return c;const f=`${sz}px H9, H7`,m=mk(4,4)._x;m.font=f;const tw0=m.measureText(text).width;
    const pad=sz*.42,bw=tw0+pad*2,bh=sz*1.42,M=14;c=mk(bw+2*M,bh+2*M);const x=c._x;x.translate(M,M);const lw=sz*.075;
    x.strokeStyle=col;x.lineWidth=lw;rrect(x,lw/2,lw/2,bw-lw,bh-lw,sz*.08);x.stroke();const ins=sz*.15;x.lineWidth=sz*.03;rrect(x,ins,ins,bw-2*ins,bh-2*ins,sz*.05);x.stroke();
    x.fillStyle=col;x.font=f;x.textAlign='center';x.textBaseline='alphabetic';x.fillText(text,bw/2,bh/2+sz*.36);
    let sd=0;for(const ch of text)sd+=ch.charCodeAt(0);x.globalCompositeOperation='destination-out';const nh=Math.round(bw*bh/420);
    for(let i=0;i<nh;i++){const big=rnd(sd+i*7+3)>.92;x.globalAlpha=.45+.55*rnd(sd+i*7+4);x.beginPath();x.arc(rnd(sd+i*7)*bw,rnd(sd+i*7+1)*bh,(.6+rnd(sd+i*7+2)*1.8)*(big?2.4:1)*sz/110,0,7);x.fill()}
    x.globalAlpha=.35;x.lineWidth=1.3;for(let i=0;i<7;i++){const py=rnd(sd+i+500)*bh;x.beginPath();x.moveTo(rnd(sd+i+520)*bw*.3,py);x.lineTo(bw*(.5+rnd(sd+i+540)*.5),py+(rnd(sd+i+560)-.5)*10);x.stroke()}
    x.globalCompositeOperation='source-over';x.globalAlpha=1;c.bw=bw;c.bh=bh;c.sd=sd;ST.set(k,c);return c}
  function verdict(t,t0,text,o={}){if(t<t0)return;const sz=o.sz||120,col=o.col||RED,x=o.x??W/2,y=o.y??H/2,rot=o.rot??-.12,d=o.d||.13;sfx('thud',t0,o.gain??1);
    const k=seg(t,t0,t0+d),s=lerp(o.from||1.7,1,k*k),al=cl(k*3)*(o.a??.93),c=stampTex(text,sz,col);
    G.save();G.translate(x,y);G.rotate(rot);
    if(k<1){G.save();G.globalAlpha*=.13*cl(k*4);G.fillStyle='#120a02';const sh=s*1.05;rrect(G,-c.bw*sh/2+(s-1)*36,-c.bh*sh/2+(s-1)*48,c.bw*sh,c.bh*sh,12);G.fill();G.restore()}
    const k2=seg(t,t0+d*.8,t0+d+.4);if(k2>0&&k2<1){G.save();G.globalAlpha*=.3*(1-k2);G.strokeStyle=INK;G.lineWidth=3;const e=1+.32*eo(k2);rrect(G,-c.bw*e/2,-c.bh*e/2,c.bw*e,c.bh*e,14);G.stroke();
      G.globalAlpha=G.globalAlpha*.8;for(let i=0;i<10;i++){const a=i/10*6.283+rnd(c.sd+i)*.5,r0=1+.2*eo(k2),r1=r0+.18*eo(k2);G.beginPath();G.moveTo(Math.cos(a)*c.bw*.5*r0,Math.sin(a)*c.bh*.5*r0*1.2);G.lineTo(Math.cos(a)*c.bw*.5*r1,Math.sin(a)*c.bh*.5*r1*1.2);G.stroke()}G.restore()}
    G.scale(s,s);G.save();G.globalAlpha*=al;G.globalCompositeOperation='multiply';G.drawImage(c,-c.width/2,-c.height/2);
    if(k>=1){G.fillStyle=col;for(let i=0;i<9;i++){const a=rnd(c.sd+i*3+90)*6.283,rx=c.bw/2+10+rnd(c.sd+i*3+91)*36*sz/110,ry=c.bh/2+8+rnd(c.sd+i*3+92)*26*sz/110;G.beginPath();G.arc(Math.cos(a)*rx,Math.sin(a)*ry,(1.2+rnd(c.sd+i*3+93)*3.4)*sz/110,0,7);G.fill()}}
    G.restore();if(recOn()){G.save();G.globalAlpha*=al;G.font=`${sz}px H9, H7`;recText(text,0,sz*.36,sz,'center');G.restore()}G.restore()}

  /* ---------- 网点图：灰度图按格取平均，换成大小不一的墨点（只做一次） ---------- */
  const HT=new Map();
  function htTex(key,w,h,cell,src){let c=HT.get(key);if(c)return c;w=Math.round(w);h=Math.round(h);const F=mk(w,h,true),fx=F._x;fx.fillStyle='#fff';fx.fillRect(0,0,w,h);src(fx,w,h);
    const d=fx.getImageData(0,0,w,h).data,cols=Math.ceil(w/cell)+1,rows=Math.ceil(h/cell)+1,S=new Float32Array(cols*rows),C=new Float32Array(cols*rows);
    for(let yy=0;yy<h;yy++){const j=Math.floor(yy/cell)*cols;for(let xx=0;xx<w;xx++){const p=(yy*w+xx)*4,i=j+Math.floor(xx/cell);S[i]+=d[p]*.3+d[p+1]*.59+d[p+2]*.11;C[i]++}}
    c=mk(w,h);const x=c._x;x.fillStyle=INK;for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){const q=j*cols+i;if(!C[q])continue;const dk=1-S[q]/C[q]/255;if(dk<.06)continue;const r=cell*.6*Math.pow(dk,.85);
      x.beginPath();x.arc((i+.5)*cell+(j&1?cell*.5:0),(j+.5)*cell,r,0,7);x.fill()}HT.set(key,c);return c}
  function placeholder(c,w,h){const gr=c.createRadialGradient(w*.5,h*.5,0,w*.5,h*.5,Math.max(w,h)*.55);gr.addColorStop(0,'#555');gr.addColorStop(.6,'#aaa');gr.addColorStop(1,'#eee');c.fillStyle=gr;c.fillRect(0,0,w,h)}
  function halftone(t,t0,r,o={}){if(t<t0)return;const cell=o.cell||11,k=eo(seg(t,t0,t0+(o.dur??.6))),im=o.img&&typeof IM!=='undefined'?IM[o.img]:null;
    const key=(o.id||o.img||(o.art?'art':'ph'))+'|'+Math.round(r.w)+'x'+Math.round(r.h)+'|'+cell;
    const src=im?(c,w,h)=>{const cr=o.crop||[0,0,im.width,im.height],s=Math.max(w/cr[2],h/cr[3]);c.filter='grayscale(1) contrast(1.15)';c.drawImage(im,cr[0],cr[1],cr[2],cr[3],(w-cr[2]*s)/2,(h-cr[3]*s)/2,cr[2]*s,cr[3]*s);c.filter='none'}:(o.art||placeholder);
    const c=htTex(key,r.w,r.h,cell,src);sfx('whoosh',t0,.25);
    G.save();G.fillStyle=o.paper||'#ebe3cf';G.fillRect(r.x,r.y,r.w,r.h);G.save();G.beginPath();G.rect(r.x,r.y,r.w,r.h*k);G.clip();G.globalAlpha*=.92;G.drawImage(c,r.x,r.y);G.restore();
    if(k<1){G.fillStyle='rgba(31,26,20,.22)';G.fillRect(r.x,r.y+r.h*k-8,r.w,8)}
    G.strokeStyle=INK;G.globalAlpha*=.85;G.lineWidth=3;G.strokeRect(r.x,r.y,r.w,r.h);G.restore();
    const lab=o.label??(im?null:'示意');if(lab&&k>.3)tag(t,lab,r.x+16,r.y+16,{sz:32})}

  /* ---------- 黑条：涂掉或揭开 ---------- */
  function redact(t,t0,r,o={}){const mode=o.mode||'cover',d=o.dur||.35;let a0=0,a1=1;
    if(mode==='cover'){if(t<t0)return;a1=eo(seg(t,t0,t0+d));if(o.t1!=null){if(t>=o.t1+d)return;a0=eio(seg(t,o.t1,o.t1+d))}sfx('whoosh',t0,.3)}
    else{if(o.since!=null&&t<o.since)return;a0=eio(seg(t,t0,t0+d));if(a0>=1)return;if(t>=t0)sfx('whoosh',t0,.3)}
    if(a1<=a0)return;const sd=Math.round(r.x*.7+r.y*1.1),xa=r.x+r.w*a0,xb=r.x+r.w*a1,n=Math.max(2,Math.round((xb-xa)/16));
    G.save();G.fillStyle=o.col||'#15110c';G.beginPath();for(let i=0;i<=n;i++){const px=lerp(xa,xb,i/n);G.lineTo(px,r.y+(rnd(sd+Math.round(px/16))-.5)*5)}
    G.lineTo(xb+3,r.y+r.h*.5);for(let i=n;i>=0;i--){const px=lerp(xa,xb,i/n);G.lineTo(px,r.y+r.h+(rnd(sd+Math.round(px/16)+77)-.5)*5)}G.lineTo(xa-3,r.y+r.h*.5);G.closePath();G.fill();
    G.fillStyle='rgba(255,255,255,.06)';G.fillRect(xa,r.y+4,xb-xa,3);G.restore()}

  /* ---------- 证物 ---------- */
  function qmark(x,y,s){G.save();G.fillStyle=INK;G.globalAlpha*=.5;[0,s*1.1].forEach(dx=>{G.beginPath();G.arc(x+dx,y,s*.42,0,7);G.fill();G.beginPath();G.moveTo(x+dx+s*.38,y);G.quadraticCurveTo(x+dx+s*.3,y+s*.9,x+dx-s*.25,y+s*1.05);G.lineTo(x+dx-s*.1,y+s*.75);G.quadraticCurveTo(x+dx+s*.12,y+s*.45,x+dx-s*.05,y+s*.2);G.fill()});G.restore()}
  function evImage(t,t0,ev,x,y,w,h){halftone(t,t0,{x,y,w,h},ev)}
  function evQuote(t,t0,ev,x,y,w,h){const k=eo(seg(t,t0,t0+.2));G.save();G.translate(x+w/2,y+h/2);G.rotate((ev.rot??-1)*PI/180);const s=lerp(1.04,1,k);G.scale(s,s);G.translate(-w/2,-h/2);
    const sz=ev.sz||56,lh=sz*1.55,lx=110,ly=110;h=Math.min(h,ly+(ev.lines.length-1)*lh+(ev.src?120:60));sheet(6,8,w-12,h-20,{col:'#fbf7ec',blur:10,sy:5,r:2});qmark(46,66,32);let tt=t0+.25;const R=[];
    ev.lines.forEach((l,i)=>{const r=typed(t,l,lx,ly+i*lh,sz,{f:'H7',t0:tt,cps:20});r.t0=tt;R.push(r);tt=r.end+.06});
    if(ev.src)typed(t,'—— '+ev.src,w-44,h-50,32,{f:'H5',t0:tt+.05,cps:40,al:'right',col:DIM});
    const q=ev.redact;if(q){const line=ev.lines[q.line||0],P=widths(line,fontOf(sz,{f:'H7'}));redact(t,q.at,{x:lx+P[q.a]-8,y:ly+(q.line||0)*lh-sz*.92,w:P[q.b]-P[q.a]+16,h:sz*1.16},{mode:q.mode||'reveal',since:R[q.line||0].t0+q.a/20,dur:q.dur})}
    G.restore()}
  function evText(t,t0,ev,x,y,w,h){if(t<t0)return;sheet(x+6,y+6,w-12,h-12,{col:'#efe6cf',blur:8,sy:4,r:2,rules:{from:ev.head?82:36,step:58}});let tt=t0+.15;
    if(ev.head){typed(t,ev.head,x+40,y+58,34,{t0:tt,cps:30,col:DIM});tt+=.25}const sz=ev.sz||44;
    ev.lines.forEach((l,i)=>{const yy=y+(ev.head?126:80)+i*58,r=typed(t,l,x+40,yy,sz,{t0:tt,cps:32});
      if(ev.ticks&&t>=r.end){const k=eo(seg(t,r.end,r.end+.18)),tx=x+40+r.w+34,ty=yy-sz*.32;G.save();G.strokeStyle=INK;G.lineWidth=6;G.lineCap='round';G.lineJoin='round';G.beginPath();G.moveTo(tx,ty);
        const m=[tx+12,ty+14],e=[tx+40,ty-22];if(k<.4){const f=k/.4;G.lineTo(lerp(tx,m[0],f),lerp(ty,m[1],f))}else{G.lineTo(m[0],m[1]);const f=(k-.4)/.6;G.lineTo(lerp(m[0],e[0],f),lerp(m[1],e[1],f))}G.stroke();G.restore()}
      tt=r.end+.06});
    if(ev.sign){const yy=y+h-28,r=typed(t,ev.sign,x+40,yy,34,{t0:ev.signAt??tt,cps:30,col:DIM});if(t>=r.end)redact(t,r.end+.1,{x:x+40+r.w+10,y:yy-32,w:ev.signW||200,h:40},{mode:'cover',dur:.3})}}

  /* ---------- 案卷卡 ---------- */
  function card(t,t0,o={}){const x=o.x??230,y=o.y??128,w=o.w??1460,h=o.h??800,pre=o.pre??.35,geo={x,y,w,h,stamp:[x+w-250,y+440]};if(t<t0-pre)return geo;
    const out=o.out,fd=o.flip??.32;let fk=0;if(out!=null){if(t>=out+fd)return geo;fk=eio(seg(t,out,out+fd));if(t>=out)sfx('whoosh',out,.4)}
    if(!fk)for(let i=o.stack||0;i>=1;i--)sheet(x+i*9,y+i*11,w,h,{blur:10,sy:4});
    const V=o.verdict;let dx=0,dy=0;if(V){const va=V.at??t0+1.7,ks=seg(t,va+.1,va+.45);if(ks>0&&ks<1){dx=Math.sin(ks*40)*10*(1-ks);dy=Math.cos(ks*33)*7*(1-ks)}}
    G.save();G.translate(dx,dy);if(fk>0){G.translate(0,y-fk*46);G.scale(1,Math.max(.002,Math.cos(fk*PI/2)));G.translate(0,-y)}
    sheet(x,y,w,h,{rules:{from:262,step:66},blur:fk?30:22});G.save();G.strokeStyle='rgba(31,26,20,.7)';G.lineWidth=3;G.beginPath();G.moveTo(x+50,y+118);G.lineTo(x+w-50,y+118);G.stroke();G.lineWidth=1.2;G.beginPath();G.moveTo(x+50,y+126);G.lineTo(x+w-50,y+126);G.stroke();G.restore();
    if(t>=t0){const ca=fk>0?.45*(1-seg(t,out,out+.12)):1;G.save();G.globalAlpha*=ca;const A=o.at||{},tT=t0+(A.title??.1),tE=t0+(A.ev??.6),tC=t0+(A.cap??(A.ev??.6)+.45),tL=t0+(A.line??1.1);
      const nr=typed(t,'No.'+String(o.no??1).padStart(2,'0'),x+56,y+92,64,{f:'RC',wt:700,col:DIM});
      if(o.tag)tag(t,o.tag,x+56+nr.w+32,y+46,{sz:32});
      if(o.total)typed(t,`第 ${o.no} / 共 ${o.total} 条`,x+w-56,y+90,44,{f:'RC',wt:600,al:'right'});
      if(o.title){const sz=Math.max(48,Math.min(o.titleSz||90,90*(w-120)/Math.max(1,tw(o.title,90,'H9'))));typed(t,o.title,x+56,y+214,sz,{f:'H9',t0:tT,cps:18})}
      const ev=o.evidence,ex=x+56,ey=y+252,ew=o.evW||880,eh=o.evH||400;
      if(ev&&t>=tE){if(ev.kind==='quote')evQuote(t,tE,ev,ex,ey,ew,eh);else if(ev.kind==='text')evText(t,tE,ev,ex,ey,ew,eh);else evImage(t,tE,ev,ex,ey,ew,eh);
        if(ev.cap)typed(t,ev.cap,ex,y+702,32,{f:'H5',t0:tC,cps:36,col:DIM})}
      if(o.line&&t>=tL){const p=typed(t,'结论：',x+56,y+768,40,{col:DIM});typed(t,o.line,x+56+p.w+6,y+768,60,{f:'H9',t0:tL+.06,cps:20})}
      if(V)verdict(t,V.at??t0+1.7,V.text,{x:geo.stamp[0],y:geo.stamp[1],rot:V.rot??-.13,sz:V.sz||124,col:V.col});
      G.restore()}
    if(fk>0){G.fillStyle=`rgba(70,45,15,${.45*fk})`;rrect(G,x,y,w,h,6);G.fill()}
    G.restore();return geo}

  /* ---------- 清单 ---------- */
  function tally(t,t0,items,o={}){const x=o.x??300,y=o.y??128,w=o.w??1320,h=o.h??800,pre=o.pre??0;if(t<t0-pre)return;if(o.out!=null&&t>=o.out)return;
    sheet(x,y,w,h,{rules:{from:262,step:155}});G.save();G.strokeStyle='rgba(31,26,20,.7)';G.lineWidth=3;G.beginPath();G.moveTo(x+50,y+190);G.lineTo(x+w-50,y+190);G.stroke();G.lineWidth=1.2;G.beginPath();G.moveTo(x+50,y+198);G.lineTo(x+w-50,y+198);G.stroke();G.restore();
    if(t<t0)return;typed(t,o.title||'核查清单',x+64,y+150,86,{f:'H9',t0:t0+.05,cps:14});if(o.tag)tag(t,o.tag,x+w-64,y+92,{sz:34,al:'right'});
    const rh=o.rowH||155;items.forEach((it,i)=>{const ry=y+318+i*rh,ta=it.at??t0+.55+i*.8;if(t<ta)return;
      typed(t,String(i+1).padStart(2,'0'),x+64,ry,60,{f:'RC',wt:700,col:DIM});const r=typed(t,it.label,x+180,ry,54,{f:'H7',t0:ta+.05,cps:22});
      const lx0=x+180+r.w+28,lx1=x+w-360,kl=eo(seg(t,r.end,r.end+.3));if(kl>0&&lx1>lx0){G.save();G.fillStyle=DIM;for(let px=lx0;px<lerp(lx0,lx1,kl);px+=18){G.beginPath();G.arc(px,ry-14,3,0,7);G.fill()}G.restore()}
      if(it.verdict)verdict(t,it.vat??r.end+.3,it.verdict,{x:x+w-200,y:ry-20,sz:60,rot:i%2?.07:-.09,col:it.col})})}

  /* ---------- 档案夹：标签页、封面（翻开 / 合上）、捆绳 ---------- */
  const CL={x:1680,y1:440,y2:650,r:34};let _path=null;
  function cordPath(){if(_path)return _path;const P=[],{x,y1,y2,r}=CL;const arc=(cx,cy,a0,a1,rr)=>{for(let i=0;i<=14;i++){const a=lerp(a0,a1,i/14);P.push([cx+Math.cos(a)*rr,cy+Math.sin(a)*rr])}};
    for(let L=0;L<3;L++){const rr=r+6+L*4;arc(x,y1,0,-PI,rr);arc(x,y2,PI,0,rr)}let len=0;const D=[0];for(let i=1;i<P.length;i++){len+=Math.hypot(P[i][0]-P[i-1][0],P[i][1]-P[i-1][1]);D.push(len)}_path={P,D,len};return _path}
  function cord(t,o){const {x,y1,y2,r}=CL;let u=0;if(o.openAt!=null)u=eio(seg(t,o.openAt-1.5,o.openAt-.2));
    G.save();[y1,y2].forEach(cy=>{G.fillStyle='#e2d3b2';G.beginPath();G.arc(x,cy,r,0,7);G.fill();G.strokeStyle='rgba(31,26,20,.45)';G.lineWidth=3;G.stroke();G.fillStyle='#6d5a3e';G.beginPath();G.arc(x,cy,6,0,7);G.fill()});
    const {P,D,len}=cordPath(),lim=len*(1-u);G.strokeStyle='#3b2f20';G.lineWidth=4;G.lineCap='round';G.lineJoin='round';G.beginPath();G.moveTo(x,y1);let last=[x,y1];
    for(let i=0;i<P.length&&D[i]<=lim;i++){G.lineTo(P[i][0],P[i][1]);last=P[i]}const tl=60+u*200;G.quadraticCurveTo(last[0]+30,last[1]+tl*.6,x+40+u*30,Math.min(PAGE.y+PAGE.h-40,y2+60+tl));G.stroke();G.restore()}
  function tabs(t,t0,list,o){const x0=o.tabX??330,step=o.tabStep??300,tw0=o.tabW??250;let cur=-1;list.forEach((tb,i)=>{if(tb.at!=null&&tb.at<=t)cur=i});
    list.forEach((tb,i)=>{const ti=t0+(o.tabsIn??.8)+i*.14;if(t<ti)return;const k=eo(seg(t,ti,ti+.25));sfx('tick',ti,.25);const on=i===cur,x=x0+i*step,top=(on?18:32)+(1-k)*60,bot=PAGE.y+8;
      G.save();G.beginPath();G.moveTo(x,bot);G.lineTo(x+12,top+12);G.quadraticCurveTo(x+16,top,x+30,top);G.lineTo(x+tw0-30,top);G.quadraticCurveTo(x+tw0-16,top,x+tw0-12,top+12);G.lineTo(x+tw0,bot);G.closePath();
      G.shadowColor='rgba(0,0,0,.4)';G.shadowBlur=8;G.shadowOffsetY=-2;G.fillStyle=on?'#dcb983':'#a7804e';G.fill();G.shadowColor='transparent';G.clip();G.globalAlpha*=.6;G.fillStyle=G.createPattern(fiberTex(),'repeat');G.fillRect(x,top,tw0,bot-top);G.restore();
      typed(t,tb.label,x+tw0/2,top+48,34,{f:on?'H9':'H7',al:'center',a:on?1:.72,jit:.6})})}
  function folder(t,t0,o={}){if(t<t0)return;if(o.tabs)tabs(t,t0,o.tabs.map(v=>typeof v==='string'?{label:v}:v),o);const dur=o.dur||.55;
    let op=0;if(o.openAt!=null&&t>=o.openAt){op=eio(seg(t,o.openAt,o.openAt+dur));sfx('whoosh',o.openAt,.5)}if(o.closeAt!=null&&t>=o.closeAt){op=1-eio(seg(t,o.closeAt,o.closeAt+dur));sfx('whoosh',o.closeAt,.5)}
    if(op>=1)return;const P=PAGE;G.save();if(op>0){G.translate(P.x,0);G.scale(Math.max(.002,Math.cos(op*PI/2)),1);G.translate(-P.x,0)}
    G.save();G.shadowColor='rgba(20,10,0,.5)';G.shadowBlur=26;G.shadowOffsetX=8;G.shadowOffsetY=8;G.drawImage(coverTex(),P.x,P.y);G.restore();
    const ta=op>0?.45*(1-op):1;typed(t,o.head??'案卷',510,384,40,{col:DIM,a:ta});
    if(o.label)typed(t,o.label,960,522,Math.min(108,108*880/Math.max(1,tw(o.label,108,'H9'))),{f:'H9',al:'center',t0:t0+.3,cps:12,a:ta});
    if(o.sub)typed(t,o.sub,960,598,44,{al:'center',col:DIM,t0:t0+1,cps:24,a:ta});
    cord(t,o);if(o.seal)verdict(t,o.seal.at,o.seal.text,{x:o.seal.x??1180,y:o.seal.y??790,sz:o.seal.sz??96,col:o.seal.col??INK,rot:o.seal.rot??-.09});
    if(op>0){G.fillStyle=`rgba(25,15,5,${.45*op})`;G.fillRect(P.x,P.y,P.w,P.h)}G.restore()}

  return {folder,card,verdict,halftone,redact,tally,typed,tag,sheet,on,PAGE,RED,INK,CREAM,KRAFT,DIM};
})();
