/* 风格包 · 活体录屏 —— 本项目自己实现
   看起来像一段录屏，但界面全是矢量重画的：一镜到底，镜头只推近、平移、拉回；指针有起有停，点击有涟漪；字一个一个打出来。
   界面是自拟的通用样式（不仿任何真实系统或产品）。坐标一律用“界面坐标”：镜头 z=1、看向 (960,540) 时等于画面坐标。
   用法：
   shot(t, keys, fn, {desk})            录屏镜头。keys=[{x,y,z}, {t,x,y,z,d}, …]：第一项是起始机位，之后每项从 t 起用 d 秒移到“看向 (x,y)、放大 z 倍”；fn(cam) 里用界面坐标画。返回 {x,y,z}
   win(x, y, w, h, {title,k,bar}, fn)   朴素的应用窗口（一条细栏 + 自拟应用名）；k 是出现进度 0..1；fn 里画内容（裁在窗口内）
   tabBar(x, y, tabs, active, {hover})  标签栏，返回每个标签的矩形
   field(x, y, w, h, {placeholder,focus,filled})  输入框；focus 0..1 聚焦环；filled 为真时不画占位字。返回 {tx,ty,sz} 供 typeIn 落字
   button(x, y, w, h, label, {state})   按钮；state：'idle' 'hover' 'down' 'off'（禁用）
   listRow(x, y, w, h, text, {k,checked,hover,flash,t})  列表行；k 0=骨架占位 1=内容；checked 0..1 打勾并划掉；flash 新行高亮。返回 {bx,by,bs,cx,cy}（勾选框）
   toggle(x, y, on, {label,state})      开关，on 0..1；label 写在左边。返回开关矩形
   panel(x, y, w, h, {k,from}, fn)      滑出的面板（from：'right' 'left' 'top' 'bottom'）；fn(x,y) 画内容
   cursor(t, path, {size})              指针。path=[{x,y}, {t,x,y,d,pause,click}, …]：t 时起步，d 秒到位（先快后慢），停 pause 秒再点；点击出涟漪和 sfx('tick')
   clicks(path) / cursorAt(t, path) / stateOf(t, path, x, y, w, h)   点击时刻列表 / 指针此刻位置 / 某控件此刻的状态（'idle' 'hover' 'down'）
   typeIn(t, t0, '文字', x, y, {rate,sz,col,font,caret,caretFrom})  逐字打字加闪烁光标（整串只登记一次）。返回 {n,done,t1,w}；typed(t,t0,'文字',{rate}) 只算已打出几个字
   spotlight(t, t0, t1, x, y, w, h, {a,pad,r})  把这块区域以外压暗
   badge('演示画面', {corner})           固定在画面角上的标记（不跟镜头动），放在 shot 之后调
   loading(t, x, y, w, {h,k}) / progress(x, y, w, h, p, {col})  不定长加载条 / 进度条
   on(ctx, fn)                          临时把画笔换成 ctx（封面里用包组件）
   U                                    界面配色表；mix(a,b,k) 两个 #rrggbb 之间取色 */
window.PACK=window.PACK||{};window.PACK_INIT=window.PACK_INIT||[];
PACK.ui=(function(){
  let c=g;
  const U={desk0:'#1b2f36',desk1:'#0f1c21',surf:'#f6f3ec',bar:'#e8e2d4',ink:'#1d2a2f',dim:'#7c8a8b',line:'#d6cfbf',fieldBg:'#fffdf8',skel:'#e3ddcf',hover:'#efeadd',a1:'#ff7d4d',a1d:'#d9562a',a1h:'#ff9368',a2:'#1fa58f',a3:'#ffc857',btnInk:'#2b1206',off:'#ddd7c9',offInk:'#9aa3a1'};
  const hx=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
  function mix(a,b,k){const A=hx(a),B=hx(b);k=cl(k);return 'rgb('+A.map((v,i)=>Math.round(lerp(v,B[i],k))).join(',')+')'}
  addTheme('ui',{light:false,ink:'#eaf1ef',dim:'rgba(234,241,239,.62)',note:'rgba(234,241,239,.84)',a1:U.a1,a2:'#35c2a8',a3:U.a3,chip:'rgba(255,255,255,.08)',sub:'rgba(8,18,22,.78)',subInk:'#ffffff',top:U.desk0,bot:U.desk1,card:'rgba(16,32,38,.92)',cardInk:'#eaf1ef',pillInk:'#0d1d1a',hl:U.a3,
    f:{t:'H9',b:'H7',s:'H5',h:'KT',n:'RC'},
    bg(t){grad(this.top,this.bot)}});
  // 文字：画在主画布上就走 txt()（检查看得见）；换了画笔（封面）就直接画
  function tx(s,x,y,sz,col,w='H5',al='left',a=1){if(a<=0)return;if(c===g){txt(s,x,y,sz,col,w,al,a);return}c.save();c.globalAlpha*=a;c.font=`${sz}px ${w}, H7`;c.fillStyle=col;c.textAlign=al;c.textBaseline='alphabetic';c.fillText(s,x,y);c.restore()}
  function mw(s,sz,w='H5'){c.font=`${sz}px ${w}, H7`;return c.measureText(s).width}
  function box(x,y,w,h,r){c.beginPath();c.roundRect(x,y,w,h,r)}
  function on(ctx,fn){const o=c;c=ctx;try{fn()}finally{c=o}}

  /* ---------- 镜头 ---------- */
  let CAM={x:W/2,y:H/2,z:1},TILE=null;
  function camAt(t,keys){let x=keys[0].x??W/2,y=keys[0].y??H/2,z=keys[0].z??1;
    for(let i=1;i<keys.length;i++){const k=keys[i];if(t<=k.t)break;const e=eio(seg(t,k.t,k.t+(k.d||1)));x=lerp(x,k.x??x,e);y=lerp(y,k.y??y,e);z=Math.exp(lerp(Math.log(z),Math.log(k.z??z),e))}
    return {x,y,z}}
  function tile(){if(TILE)return TILE;TILE=document.createElement('canvas');TILE.width=TILE.height=64;const k=TILE.getContext('2d');k.fillStyle='rgba(255,255,255,.085)';k.beginPath();k.arc(32,32,2.6,0,7);k.fill();return TILE}
  function shot(t,keys,fn,o={}){const cm=camAt(t,keys);CAM=cm;c.save();c.translate(W/2,H/2);c.scale(cm.z,cm.z);c.translate(-cm.x,-cm.y);
    if(o.desk!==false){const vw=W/cm.z,vh=H/cm.z;c.fillStyle=c.createPattern(tile(),'repeat');c.fillRect(cm.x-vw/2-2,cm.y-vh/2-2,vw+4,vh+4)}
    fn(cm);c.restore();CAM={x:W/2,y:H/2,z:1};return cm}

  /* ---------- 窗口和控件 ---------- */
  function win(x,y,w,h,o={},fn){const k=o.k??1,bar=o.bar??64;if(k<=0)return;const cx=x+w/2,cy=y+h/2,s=.965+.035*k;c.save();c.globalAlpha*=cl(k*1.4);c.translate(cx,cy+(1-k)*34);c.scale(s,s);c.translate(-cx,-cy);
    c.save();c.shadowColor='rgba(0,0,0,.5)';c.shadowBlur=54*CAM.z;c.shadowOffsetY=20*CAM.z;c.fillStyle=U.surf;box(x,y,w,h,20);c.fill();c.restore();
    c.save();box(x,y,w,h,20);c.clip();c.fillStyle=U.bar;c.fillRect(x,y,w,bar);c.fillStyle=U.line;c.fillRect(x,y+bar-2,w,2);
    const gs=bar*.56,gx=x+bar*.36,gy=y+(bar-gs)/2;c.fillStyle=U.ink;box(gx,gy,gs,gs,gs*.28);c.fill();c.fillStyle=U.a3;box(gx+gs*.43,gy+gs*.42,gs*.14,gs*.38,gs*.07);c.fill();c.beginPath();c.arc(gx+gs*.5,gy+gs*.26,gs*.1,0,7);c.fill();
    if(o.title)tx(o.title,gx+gs+18,y+bar/2+bar*.19,bar*.53,U.ink,'H7');
    if(fn)fn({x,y:y+bar,w,h:h-bar});c.restore();
    c.strokeStyle='rgba(29,42,47,.22)';c.lineWidth=2;box(x,y,w,h,20);c.stroke();c.restore()}
  function tabBar(x,y,tabs,active,o={}){const sz=o.sz??34,h=o.h??62,pad=o.pad??30,gap=o.gap??10;let px=x;const out=[];
    tabs.forEach((s,i)=>{const w=mw(s,sz,'H7')+pad*2,on_=i===active;if(on_){c.fillStyle=U.ink;box(px,y,w,h,h/2);c.fill()}else if(o.hover===i){c.fillStyle=U.hover;box(px,y,w,h,h/2);c.fill()}
      tx(s,px+pad,y+h/2+sz*.36,sz,on_?U.surf:U.dim,on_?'H7':'H5');out.push({x:px,y,w,h});px+=w+gap});return out}
  function field(x,y,w,h,o={}){const f=cl(o.focus??0),sz=o.sz??36;if(f>0){c.save();c.globalAlpha*=.28*f;c.strokeStyle=U.a2;c.lineWidth=12;box(x,y,w,h,16);c.stroke();c.restore()}
    c.fillStyle=U.fieldBg;box(x,y,w,h,16);c.fill();c.strokeStyle=mix(U.line,U.a2,f);c.lineWidth=2.5+1.5*f;c.stroke();
    const ty=y+h/2+sz*.36;if(o.placeholder&&!o.filled)tx(o.placeholder,x+28,ty,sz,mix(U.dim,U.fieldBg,.35),'H5');return {tx:x+28,ty,sz}}
  function button(x,y,w,h,label,o={}){const st=o.state||'idle',sz=o.sz??36,off=st==='off',dn=st==='down',lip=6,dy=dn?lip-1:0;
    if(!off){c.fillStyle=U.a1d;box(x,y+lip,w,h-lip,16);c.fill()}
    c.fillStyle=off?U.off:dn?mix(U.a1,U.a1d,.45):st==='hover'?U.a1h:U.a1;box(x,y+dy,w,h-lip,16);c.fill();
    tx(label,x+w/2,y+dy+(h-lip)/2+sz*.36,sz,off?U.offInk:U.btnInk,'H7','center')}
  function listRow(x,y,w,h,text,o={}){const k=o.k??1,ck=cl(o.checked??0),sz=o.sz??36,bs=o.box??42,bx=x+26,by=y+(h-bs)/2,cx=bx+bs/2,cy=y+h/2,txX=bx+bs+26,sk=1-seg(k,.35,.7),ca=seg(k,.55,.95);
    if(o.hover){c.fillStyle=U.hover;box(x,y+3,w,h-6,14);c.fill()}
    if(o.flash>0){c.save();c.globalAlpha*=.42*cl(o.flash);c.fillStyle=U.a3;box(x,y+3,w,h-6,14);c.fill();c.restore()}
    c.fillStyle=U.line;c.fillRect(x+bx-x,y+h-1.5,w-(bx-x)*2,1.5);
    if(sk>0){c.save();c.globalAlpha*=sk;const p=.5+.5*Math.sin((o.t||0)*5.2-y*.012);c.fillStyle=mix(U.skel,U.surf,p*.6);box(bx,by,bs,bs,11);c.fill();box(txX,cy-13,Math.min(w-(txX-x)-40,mw(text,sz)*1.05),26,13);c.fill();c.restore()}
    if(ca>0){c.save();c.globalAlpha*=ca;const e=back(seg(ck,0,.45));
      if(ck>0){c.fillStyle=U.a2;const s=bs*(.8+.2*e);box(cx-s/2,cy-s/2,s,s,11);c.fill();const m=seg(ck,.12,.55);c.strokeStyle='#fff';c.lineWidth=5;c.lineCap='round';c.lineJoin='round';c.beginPath();const p0=[cx-bs*.24,cy+bs*.02],p1=[cx-bs*.06,cy+bs*.2],p2=[cx+bs*.26,cy-bs*.18],a=cl(m*2),b=cl(m*2-1);c.moveTo(p0[0],p0[1]);c.lineTo(lerp(p0[0],p1[0],a),lerp(p0[1],p1[1],a));if(b>0)c.lineTo(lerp(p1[0],p2[0],b),lerp(p1[1],p2[1],b));if(m>0)c.stroke()}
      else{c.strokeStyle=o.hover?U.a2:U.dim;c.lineWidth=3;box(bx+1.5,by+1.5,bs-3,bs-3,10);c.stroke()}
      c.restore();
      tx(text,txX,cy+sz*.36,sz,mix(U.ink,U.dim,seg(ck,.3,.9)),'H5','left',ca);
      const sl=eo(seg(ck,.3,1));if(sl>0){c.save();c.globalAlpha*=ca;c.strokeStyle=U.dim;c.lineWidth=3.5;c.lineCap='round';c.beginPath();c.moveTo(txX-6,cy+2);c.lineTo(txX-6+(mw(text,sz)+12)*sl,cy+2);c.stroke();c.restore()}}
    return {bx,by,bs,cx,cy}}
  function toggle(x,y,on_,o={}){const w=o.w??86,h=o.h??46,k=cl(+on_),sz=o.sz??34,r=h/2-5;c.fillStyle=mix('#b9b3a4',U.a2,k);box(x,y,w,h,h/2);c.fill();
    if(o.state==='hover'||o.state==='down'){c.save();c.globalAlpha*=.3;c.strokeStyle=U.a2;c.lineWidth=8;box(x,y,w,h,h/2);c.stroke();c.restore()}
    c.save();c.shadowColor='rgba(0,0,0,.3)';c.shadowBlur=6*CAM.z;c.shadowOffsetY=2*CAM.z;c.fillStyle='#fff';c.beginPath();c.arc(lerp(x+h/2,x+w-h/2,eio(k)),y+h/2,r*(o.state==='down'?.9:1),0,7);c.fill();c.restore();
    if(o.label)tx(o.label,x-20,y+h/2+sz*.36,sz,U.ink,'H5','right');return {x,y,w,h}}
  function panel(x,y,w,h,o={},fn){const k=cl(o.k??1);if(k<=0)return;const from=o.from||'right',d=(1-k)*((from==='left'||from==='right'?w:h)+40),dx=from==='right'?d:from==='left'?-d:0,dy=from==='bottom'?d:from==='top'?-d:0;
    c.save();c.translate(dx,dy);c.save();c.shadowColor='rgba(0,0,0,.35)';c.shadowBlur=26*CAM.z;c.shadowOffsetY=8*CAM.z;c.fillStyle=o.fill||U.ink;box(x,y,w,h,o.r??16);c.fill();c.restore();if(fn)fn(x,y);c.restore()}
  function loading(t,x,y,w,o={}){const h=o.h??6,k=cl(o.k??1);if(k<=0)return;c.save();c.globalAlpha*=k;c.fillStyle=U.line;c.fillRect(x,y,w,h);c.beginPath();c.rect(x,y,w,h);c.clip();const p=(t*.85)%1,sw=w*.32;c.fillStyle=U.a1;c.fillRect(x-sw+(w+sw)*eio(p),y,sw,h);c.restore()}
  function progress(x,y,w,h,p,o={}){c.fillStyle=U.line;box(x,y,w,h,h/2);c.fill();const pw=Math.max(h,w*cl(p));c.fillStyle=o.col||U.a2;box(x,y,pw,h,h/2);c.fill()}

  /* ---------- 指针 ---------- */
  const keyT=k=>k.t+(k.d??.8)+(k.pause??.28);
  function clicks(path){return path.filter(k=>k.click).map(keyT)}
  function cursorAt(t,path){let x=path[0].x,y=path[0].y;for(let i=1;i<path.length;i++){const k=path[i];if(t<=k.t)break;const d=k.d??.8,e=d>0?1-Math.pow(1-seg(t,k.t,k.t+d),4):1,nx=k.x??x,ny=k.y??y,L=Math.hypot(nx-x,ny-y)||1,b=Math.sin(e*Math.PI)*L*.055;
      const px=lerp(x,nx,e)-(ny-y)/L*b,py=lerp(y,ny,e)+(nx-x)/L*b;x=px;y=py;if(e>=1){x=nx;y=ny}}
    const down=clicks(path).some(tc=>t>=tc&&t<tc+.14);return {x,y,down}}
  function stateOf(t,path,x,y,w,h){const p=cursorAt(t,path);if(p.x<x||p.x>x+w||p.y<y||p.y>y+h)return 'idle';return p.down?'down':'hover'}
  function cursor(t,path,o={}){const p=cursorAt(t,path),s=o.size??1;
    clicks(path).forEach((tc,i)=>{if(t<tc)return;if(c===g)sfx('tick',tc);const k=seg(t,tc,tc+.6);if(k>=1)return;const q=cursorAt(tc,path);c.save();c.globalAlpha*=(1-k)*.3;c.fillStyle=U.a3;c.beginPath();c.arc(q.x,q.y,(12+30*eo(k))*s,0,7);c.fill();c.globalAlpha=c.globalAlpha/.3*.95;c.strokeStyle=U.a3;c.lineWidth=(6*(1-k)+1.5)*s;c.beginPath();c.arc(q.x,q.y,(12+52*eo(k))*s,0,7);c.stroke();c.restore()});
    const pr=clicks(path).some(tc=>t>=tc-.07&&t<tc+.14)?.84:1;c.save();c.translate(p.x,p.y);c.scale(s*pr,s*pr);c.shadowColor='rgba(0,0,0,.45)';c.shadowBlur=10*CAM.z;c.shadowOffsetY=4*CAM.z;
    c.beginPath();c.moveTo(1,1);c.lineTo(1,40);c.quadraticCurveTo(1.5,45,5.5,41.5);c.lineTo(14,33);c.lineTo(29,33);c.quadraticCurveTo(35,32.5,31,28.5);c.closePath();c.fillStyle=U.a1;c.fill();c.shadowColor='transparent';c.strokeStyle='#fff';c.lineWidth=3.5;c.lineJoin='round';c.stroke();c.restore();return p}

  /* ---------- 打字、聚光、角标 ---------- */
  function keys_(t0,s,rate){const ch=Array.from(s);let tt=t0;return ch.map((_,i)=>tt+=rate*(.65+.7*rnd(i*13+ch.length*7+5)))}
  function typed(t,t0,s,o={}){return keys_(t0,s,o.rate??.2).filter(k=>t>=k).length}
  function typeIn(t,t0,s,x,y,o={}){const rate=o.rate??.2,sz=o.sz??36,font=o.font||'H5',col=o.col||U.ink,ch=Array.from(s),ks=keys_(t0,s,rate),tt=ks[ks.length-1];let n=0,last=t0;
    ks.forEach((k,i)=>{if(t>=k){n=i+1;last=k;if(c===g)sfx('tick',k,.35)}});
    const sub=ch.slice(0,n).join('');c.save();c.font=`${sz}px ${font}, H7`;const w=c.measureText(sub).width;
    if(n>0){if(c===g&&REC)recText(s,x,y,sz,'left');c.fillStyle=col;c.textAlign='left';c.textBaseline='alphabetic';c.fillText(sub,x,y)}
    if(o.caret!==false&&t>=(o.caretFrom??t0)&&(t-last<.45||((t*1.7)%1)<.55)){c.fillStyle=o.caretCol||U.a2;c.fillRect(x+w+(n?5:0),y-sz*.88,3.5,sz*1.12)}
    c.restore();return {n,done:n===ch.length,t1:tt,w}}
  function spotlight(t,t0,t1,x,y,w,h,o={}){const k=eo(seg(t,t0,t0+.45))*(1-eio(seg(t,t1-.45,t1)));if(k<=0)return;const p=o.pad??12;c.save();c.globalAlpha*=k;c.fillStyle=`rgba(8,18,22,${o.a??.5})`;c.beginPath();c.rect(-4e4,-4e4,8e4,8e4);c.roundRect(x-p,y-p,w+2*p,h+2*p,o.r??22);c.fill('evenodd');c.strokeStyle='rgba(255,255,255,.55)';c.lineWidth=2.5;box(x-p,y-p,w+2*p,h+2*p,o.r??22);c.stroke();c.restore()}
  function badge(s='演示画面',o={}){const sz=o.sz??32,cn=o.corner||'tr';c.save();if(c===g)c.setTransform(1,0,0,1,0,0);c.globalAlpha=1;const w=mw(s,sz,'H7')+74,h=sz+28,x=cn[1]==='r'?W-36-w:36,y=cn[0]==='t'?28:H-28-h;
    c.fillStyle='rgba(8,18,22,.82)';box(x,y,w,h,h/2);c.fill();c.strokeStyle='rgba(255,255,255,.28)';c.lineWidth=2;c.stroke();c.strokeStyle=U.a3;c.lineWidth=3.5;box(x+20,y+h/2-9,18,18,5);c.stroke();tx(s,x+52,y+h/2+sz*.36,sz,'#f3f6f4','H7');c.restore()}
  return {shot,camAt,win,tabBar,field,button,listRow,toggle,panel,cursor,clicks,cursorAt,stateOf,typeIn,typed,spotlight,badge,loading,progress,on,mix,U};
})();
