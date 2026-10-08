/* 风格包 · 白板手写 —— 本项目自己实现
   一块比画面大好几倍的白板，一支马克笔跟着话一句一句写、画；只有黑笔加一种强调色（TH.a1）；最后拉远成一张完整的图。
   用法（时间习惯：t 全片时间，t0 开始时刻；凡是“写/画”的函数都返回画完的时刻，可以接着往下排）：
   board(t, keys, fn, {w,h,pen,tray})                 白板镜头。keys=[{t,x,y,z,d}]：到 t 时刻起用 d 秒（缺省 .9）移到以白板坐标 (x,y) 为中心、放大 z 倍；第一个 key 是起始机位；
                                                      fn(cam) 里全部用白板坐标画；最后一个 key 用 fit(...) 拉远看全貌。返回当前机位 {x,y,z}。缺省白板 3840×2160，自动画笔尖
   fit(x0,y0,x1,y1,{t,d,pad,bottom})                  算出“把这块区域整个放进画面（避开底部字幕带）”的机位 key，给 board 的最后一个 key 用
   write(t, t0, 文字, x, y, 字号, {col,rate,al,rot,font,seed})  手写文字：逐字从左到右写出来，每个字略有高低歪斜；rate 是每个字用的秒数（缺省 .13）；有旁白时 t0 用 said(句id,'词')
   said(句id, '词', 晚多少=.5)                         这个词念出来之后半秒的时刻（说一句写一句，笔比话慢半拍）
   sketchLine(t, t0, x1,y1, x2,y2, {col,lw,d,bow,dash,seed})    手画直线（略抖、粗细有变化）；bow 是中间鼓出去多少像素
   sketchArrow(t, t0, x1,y1, x2,y2, {col,lw,d,bow,via,head,dash,seed})  手画箭头；via=[[x,y],…] 让它绕路（平滑曲线）
   sketchBox(t, t0, x,y,w,h, {col,lw,d,seed})          手画方框：一笔画四边，收笔处不完全闭合
   sketchCircle(t, t0, cx,cy,rx,ry, {col,lw,d,turns,seed})      手画圈：画一圈多一点，头尾错开；缺省用强调色
   sketchPath(t, t0, [[x,y],…], {col,lw,d,smooth,dash,seed})    任意手画折线/曲线（对勾、小涂鸦）
   underline(t, t0, x, y, 宽, {col,lw,d,double,seed})  强调色波浪划线；double 再折回来划第二道
   pen()                                              在“当前正在写的位置”画马克笔笔尖（board 会自动调用；不用 board 时在分场最后自己调一次）
   on(ctx, fn)                                        把手画图形临时画到另一个画布上（封面 art 用；write 不支持）
   主题名 whiteboard：INK 黑笔色，ACC 强调色（= TH.a1，换强调色用 FILM.themePatch:{a1:'#…'}） */
window.PACK=window.PACK||{};window.PACK_INIT=window.PACK_INIT||[];
PACK.whiteboard=(function(){
  const INK='#1c1d22',ACC='#e23f2b',WALL0='#dfe3e5',WALL1='#c9ced1',SURF='#fbfbf8';
  let G=g,PEN=null,TEX=null;
  const acc=()=>(TH&&TH.a1)||ACC,ink=()=>(TH&&TH.ink)||INK;
  // 平滑噪声：-1..1
  function sn(x,seed){const i=Math.floor(x),f=x-i,u=f*f*(3-2*f);return lerp(rnd(seed*13.7+i),rnd(seed*13.7+i+1),u)*2-1}
  function hash(a){let h=7;for(const v of a)h=(h*31+Math.round(v))%9973;return h}

  /* ---------- 白板底：做一次 ---------- */
  function tex(){if(TEX)return TEX;const c=document.createElement('canvas');c.width=1920;c.height=1080;const x=c.getContext('2d');x.fillStyle=SURF;x.fillRect(0,0,1920,1080);
    // 擦过的痕迹：很淡的灰雾和横向抹痕
    for(let i=0;i<46;i++){const px=rnd(i+3)*1920,py=rnd(i+71)*1080,r=120+rnd(i+140)*320;const gr=x.createRadialGradient(px,py,0,px,py,r);gr.addColorStop(0,'rgba(70,82,104,.030)');gr.addColorStop(1,'rgba(70,82,104,0)');x.fillStyle=gr;x.fillRect(px-r,py-r,2*r,2*r)}
    x.lineCap='round';for(let i=0;i<18;i++){const px=rnd(i+220)*1920,py=rnd(i+260)*1080,l=160+rnd(i+300)*420,a=(rnd(i+340)-.5)*.5;x.strokeStyle='rgba(60,70,92,.011)';x.lineWidth=36+rnd(i+380)*60;x.beginPath();x.moveTo(px,py);x.quadraticCurveTo(px+l*.5,py+Math.sin(a)*l*.5+30*(rnd(i+9)-.5),px+l*Math.cos(a),py+l*Math.sin(a));x.stroke()}
    // 斜着的一道反光
    const gl=x.createLinearGradient(0,0,1920,1080);gl.addColorStop(0,'rgba(255,255,255,0)');gl.addColorStop(.36,'rgba(255,255,255,0)');gl.addColorStop(.46,'rgba(255,255,255,.55)');gl.addColorStop(.52,'rgba(255,255,255,0)');gl.addColorStop(.6,'rgba(255,255,255,.3)');gl.addColorStop(.66,'rgba(255,255,255,0)');gl.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=gl;x.fillRect(0,0,1920,1080);
    const sh=x.createLinearGradient(0,0,0,1080);sh.addColorStop(0,'rgba(40,50,70,.035)');sh.addColorStop(.25,'rgba(40,50,70,0)');sh.addColorStop(.8,'rgba(40,50,70,0)');sh.addColorStop(1,'rgba(40,50,70,.05)');x.fillStyle=sh;x.fillRect(0,0,1920,1080);
    return TEX=c}
  addTheme('whiteboard',{light:true,ink:INK,dim:'rgba(28,29,34,.6)',note:'rgba(28,29,34,.8)',a1:ACC,a2:INK,a3:'#8a9099',chip:'rgba(28,29,34,.06)',sub:'rgba(28,29,34,.88)',subInk:'#ffffff',
    top:'#fdfdfb',bot:'#f1f2ef',card:'rgba(255,255,255,.96)',cardInk:INK,pillInk:'#ffffff',hl:'rgba(226,63,43,.22)',f:{t:'KT',b:'KT',s:'KT',h:'KT',n:'RC'},
    bg(t){PEN=null;g.drawImage(tex(),0,0)}});

  /* ---------- 笔尖登记：每个正在写/画的东西报告“笔现在在哪” ---------- */
  function reg(t,t0,t1,p0,p,p1,col){let a,q,lift=0;if(t>=t0&&t<=t1){a=1;q=p}else if(t<t0&&t>t0-.3){a=seg(t,t0-.3,t0);q=p0;lift=1-a}else if(t>t1&&t<t1+.3){a=1-seg(t,t1,t1+.3);q=p1;lift=1-a}else return;
    if(G!==g)return;const m=g.getTransform(),s=Math.hypot(m.a,m.b),pr=a+(lift?0:1)+(t>t1?.001:0);if(PEN&&PEN.pr>=pr)return;PEN={pr,a:a*g.globalAlpha,x:m.a*q[0]+m.c*q[1]+m.e,y:m.b*q[0]+m.d*q[1]+m.f,s,lift,col}}
  function pen(){const p=PEN;PEN=null;if(!p||p.a<=0)return;const s=Math.max(.62,Math.min(1.15,p.s)),L=p.lift*46*s;g.save();g.setTransform(1,0,0,1,0,0);g.globalAlpha=p.a;
    // 影子
    g.save();g.translate(p.x+14*s+L*.6,p.y+10*s+L*.2);g.rotate(-.92);g.fillStyle='rgba(30,36,48,.13)';g.beginPath();g.ellipse(170*s,14*s,170*s,20*s,0,0,7);g.fill();g.restore();
    g.translate(p.x+L*.5,p.y-L);g.rotate(-.96);g.scale(s,s);
    g.fillStyle=p.col;g.beginPath();g.moveTo(0,0);g.lineTo(20,-9);g.lineTo(26,-9);g.lineTo(26,9);g.lineTo(14,9);g.closePath();g.fill();                    // 笔头
    g.fillStyle='#3a3d45';g.beginPath();g.moveTo(26,-11);g.lineTo(58,-20);g.lineTo(58,20);g.lineTo(26,11);g.closePath();g.fill();                           // 笔头座
    const bg=g.createLinearGradient(0,-25,0,25);bg.addColorStop(0,'#f6f7f8');bg.addColorStop(.55,'#dfe2e6');bg.addColorStop(1,'#b9bec6');g.fillStyle=bg;g.strokeStyle='#8f959e';g.lineWidth=2.5;g.beginPath();g.roundRect(58,-25,262,50,9);g.fill();g.stroke();   // 笔杆
    g.fillStyle=p.col;g.fillRect(84,-25,44,50);g.beginPath();g.roundRect(286,-27,54,54,10);g.fill();                                                       // 色环、笔帽尾
    g.fillStyle='rgba(255,255,255,.5)';g.fillRect(64,-17,250,6);
    g.restore()}

  /* ---------- 手画线：沿折线走，法向用平滑噪声抖动，线宽缓慢变化 ---------- */
  function dense(pts,smooth){if(!smooth||pts.length<3)return pts;const o=[];for(let i=0;i<pts.length-1;i++){const a=pts[Math.max(0,i-1)],b=pts[i],c=pts[i+1],d=pts[Math.min(pts.length-1,i+2)];for(let k=0;k<12;k++){const u=k/12,u2=u*u,u3=u2*u;o.push([.5*(2*b[0]+(c[0]-a[0])*u+(2*a[0]-5*b[0]+4*c[0]-d[0])*u2+(3*b[0]-a[0]-3*c[0]+d[0])*u3),.5*(2*b[1]+(c[1]-a[1])*u+(2*a[1]-5*b[1]+4*c[1]-d[1])*u2+(3*b[1]-a[1]-3*c[1]+d[1])*u3)])}}o.push(pts[pts.length-1]);return o}
  function plen(pts){let L=0;for(let i=1;i<pts.length;i++)L+=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]);return L}
  // 画出前 k（0..1）段；返回笔所在的点
  function stroke(pts,k,col,lw,seed,dashp){const L=plen(pts);if(L<=0)return pts[0];const end=L*cl(k),ds=Math.max(5,Math.min(11,lw*1.4)),wob=Math.min(3.4,1.2+lw*.22);G.save();G.strokeStyle=col;G.lineCap='round';G.lineJoin='round';
    let i=1,acc0=0,sl=Math.hypot(pts[1][0]-pts[0][0],pts[1][1]-pts[0][1]),prev=null,last=pts[0];
    for(let s=0;;s=Math.min(end,s+ds)){while(i<pts.length-1&&s>acc0+sl){acc0+=sl;i++;sl=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1])}
      const u=sl>0?cl((s-acc0)/sl):0,a=pts[i-1],b=pts[i],nx=sl>0?-(b[1]-a[1])/sl:0,ny=sl>0?(b[0]-a[0])/sl:0,edge=Math.min(1,s/26,(L-s)/26+.25),o=(sn(s/88,seed)*wob+sn(s/21,seed+5)*wob*.3)*edge;
      const p=[lerp(a[0],b[0],u)+nx*o,lerp(a[1],b[1],u)+ny*o];
      if(prev&&!(dashp&&(s%(dashp[0]+dashp[1]))>dashp[0])){G.lineWidth=lw*(.84+.2*sn(s/130,seed+9)+.1*sn(s/17,seed+3))*(s<14?.72+.28*s/14:1);G.beginPath();G.moveTo(prev[0],prev[1]);G.lineTo(p[0],p[1]);G.stroke()}
      prev=p;last=p;if(s>=end)break}
    G.restore();return last}
  const dur=(L,o)=>o.d!=null?o.d:cl(L/1500,.28,1.5);
  function sketchPath(t,t0,pts,o={}){const P=dense(pts,o.smooth),d=dur(plen(P),o),col=o.col||ink(),k=seg(t,t0,t0+d);let p=P[0];if(k>0)p=stroke(P,eio(k)*.5+k*.5,col,o.lw||7,o.seed??hash(pts[0].concat(pts[pts.length-1])),o.dash);reg(t,t0,t0+d,P[0],p,P[P.length-1],col);return t0+d}
  function bowed(x1,y1,x2,y2,bow){const L=Math.hypot(x2-x1,y2-y1)||1,nx=-(y2-y1)/L,ny=(x2-x1)/L,o=[];for(let i=0;i<=10;i++){const u=i/10,b=4*u*(1-u)*bow;o.push([lerp(x1,x2,u)+nx*b,lerp(y1,y2,u)+ny*b])}return o}
  function sketchLine(t,t0,x1,y1,x2,y2,o={}){const sd=o.seed??hash([x1,y1,x2,y2]);return sketchPath(t,t0,bowed(x1,y1,x2,y2,o.bow??(rnd(sd)-.5)*Math.hypot(x2-x1,y2-y1)*.03),{...o,seed:sd})}
  function sketchArrow(t,t0,x1,y1,x2,y2,o={}){const sd=o.seed??hash([x1,y1,x2,y2,3]),lw=o.lw||7,col=o.col||ink();const P=o.via?dense([[x1,y1],...o.via,[x2,y2]],true):bowed(x1,y1,x2,y2,o.bow??Math.hypot(x2-x1,y2-y1)*.045);
    const d=dur(plen(P),o),ts=t0+d,n=P.length,a=Math.atan2(P[n-1][1]-P[n-4][1],P[n-1][0]-P[n-4][0]),h=o.head||lw*6.2,hd=.09;
    const k=seg(t,t0,ts);let p=P[0];if(k>0)p=stroke(P,eio(k)*.5+k*.5,col,lw,sd,o.dash);
    const H1=[[x2-Math.cos(a-.5)*h,y2-Math.sin(a-.5)*h],[x2+Math.cos(a)*3,y2+Math.sin(a)*3]],H2=[[x2+Math.cos(a)*2,y2+Math.sin(a)*2],[x2-Math.cos(a+.46)*h*.94,y2-Math.sin(a+.46)*h*.94]];
    const k1=seg(t,ts+.03,ts+.03+hd),k2=seg(t,ts+.06+hd,ts+.06+2*hd);if(k1>0)p=stroke(H1,k1,col,lw,sd+1);if(k2>0)p=stroke(H2,k2,col,lw,sd+2);
    const te=ts+.06+2*hd;reg(t,t0,te,P[0],p,H2[1],col);return te}
  function sketchBox(t,t0,x,y,w,h,o={}){const sd=o.seed??hash([x,y,w,h]),j=i=>(rnd(sd+i)-.5)*Math.min(18,w*.04),r=Math.min(16,w*.08,h*.08);
    const C=[[x+j(1),y+j(2)],[x+w+j(3),y+j(4)],[x+w+j(5),y+h+j(6)],[x+j(7),y+h+j(8)]],P=[[C[0][0]+r*.3,C[0][1]]];
    for(let i=1;i<=4;i++){const a=C[i-1],b=C[i%4],c=C[(i+1)%4],L=Math.hypot(b[0]-a[0],b[1]-a[1]),M=Math.hypot(c[0]-b[0],c[1]-b[1]),bw=(rnd(sd+20+i)-.5)*L*.022,nx=-(b[1]-a[1])/L,ny=(b[0]-a[0])/L;
      P.push([lerp(a[0],b[0],.5)+nx*bw,lerp(a[1],b[1],.5)+ny*bw]);
      if(i<4){P.push([b[0]-(b[0]-a[0])/L*r,b[1]-(b[1]-a[1])/L*r],[b[0]+(c[0]-b[0])/M*r*.25-(b[0]-a[0])/L*r*.25,b[1]+(c[1]-b[1])/M*r*.25-(b[1]-a[1])/L*r*.25],[b[0]+(c[0]-b[0])/M*r,b[1]+(c[1]-b[1])/M*r])}
      else{const gap=7+rnd(sd+40)*9,over=(sd%2)===0;P.push(over?[b[0]+gap*.5,b[1]-gap*.7]:[b[0]-gap*.4,b[1]+gap*2.2])}}   // 收笔：冲过头一点，或者差一点没接上
    return sketchPath(t,t0,P,{...o,seed:sd})}
  function sketchCircle(t,t0,cx,cy,rx,ry,o={}){const sd=o.seed??hash([cx,cy,rx,ry]),turns=o.turns||1.1,a0=-2.45+(rnd(sd)-.5)*.4,n=Math.ceil(64*turns),P=[];
    for(let i=0;i<=n;i++){const u=i/n,a=a0+u*turns*6.2832,q=1+.07*(u-.45)+.022*sn(u*5,sd+2);P.push([cx+Math.cos(a)*rx*q,cy+Math.sin(a)*ry*q+(u-.5)*ry*.05])}
    return sketchPath(t,t0,P,{col:acc(),lw:8,...o,seed:sd})}
  function underline(t,t0,x,y,w,o={}){const sd=o.seed??hash([x,y,w]),P=[],n=Math.max(6,Math.round(w/60)),sl=(rnd(sd)-.6)*w*.012;
    for(let i=0;i<=n;i++){const u=i/n;P.push([x+w*u,y+sl*u+Math.sin(u*n*1.9+sd)*4.5])}
    if(o.double)for(let i=n;i>=0;i--){const u=i/n;P.push([x+w*(.04+u*.9),y+19+sl*u+Math.sin(u*n*1.6+sd+2)*4])}
    return sketchPath(t,t0,P,{col:acc(),lw:8,smooth:true,...o,seed:sd})}

  /* ---------- 手写文字 ---------- */
  function write(t,t0,s,x,y,sz,o={}){s=String(s);const ch=[...s],rate=o.rate||.13,te=t0+ch.length*rate,col=o.col||ink(),font=o.font||'KT',al=o.al||'left',sd=o.seed??hash([x,y,sz,s.charCodeAt(0)]);
    g.save();g.translate(x,y);if(o.rot)g.rotate(o.rot);g.font=`${sz}px ${font}, H7`;const cum=[0];let acc0='';for(const c of ch){acc0+=c;cum.push(g.measureText(acc0).width)}const wd=cum[ch.length],x0=al==='center'?-wd/2:al==='right'?-wd:0;
    const P=i=>[x0+(cum[i]+cum[i+1])/2,-sz*.36];
    if(t<t0){reg(t,t0,te,[x0,-sz*.7],[x0,-sz*.7],[x0+wd,-sz*.1],col);g.restore();return te}
    if(REC)recText(s,0,0,sz,al);
    const p=(t-t0)/rate;g.fillStyle=col;g.strokeStyle=col;g.lineWidth=sz*.028;g.lineJoin='round';g.textAlign='center';g.textBaseline='alphabetic';
    for(let i=0;i<ch.length&&i<p;i++){const f=cl(p-i),q=P(i),cw=cum[i+1]-cum[i],dy=sn(i*.7,sd)*sz*.032,rot=(rnd(sd+i*3+1)-.5)*.07,sc=1+(rnd(sd+i*3+2)-.5)*.06;
      g.save();g.translate(q[0],q[1]+dy);g.rotate(rot-.012);g.scale(sc,sc);
      if(f<1){g.beginPath();const e=-cw*.62+cw*1.3*f;g.moveTo(-cw*.7,-sz*.8);g.lineTo(e+sz*.12,-sz*.8);g.lineTo(e-sz*.12,sz*.7);g.lineTo(-cw*.7,sz*.7);g.closePath();g.clip()}
      g.fillText(ch[i],0,sz*.36);g.strokeText(ch[i],0,sz*.36);g.restore()}
    const i=Math.min(ch.length-1,Math.floor(p)),f=cl(p-i),cw=cum[i+1]-cum[i];
    reg(t,t0,te,[x0,-sz*.7],[x0+cum[i]+cw*(.1+.8*f)+Math.sin(p*19)*cw*.1,-sz*(.4+.34*Math.cos(p*6.2832*2.5))],[x0+wd,-sz*.1],col);
    g.restore();return te}
  function said(id,kw,lag=.5){return at(id,kw,lag)}

  /* ---------- 白板镜头 ---------- */
  function camAt(t,keys){let c={x:keys[0].x,y:keys[0].y,z:keys[0].z||1};for(let i=1;i<keys.length;i++){const k=keys[i];if(t<k.t)break;const e=eio(seg(t,k.t,k.t+(k.d||.9))),z0=c.z,z1=k.z||z0;c={x:lerp(c.x,k.x??c.x,e),y:lerp(c.y,k.y??c.y,e),z:Math.exp(lerp(Math.log(z0),Math.log(z1),e))}}return c}
  function fit(x0,y0,x1,y1,o={}){const pad=o.pad??70,bot=o.bottom??130,z=Math.min((W-2*pad)/(x1-x0),(H-pad-bot)/(y1-y0),1),sy=(pad+H-bot)/2;return {t:o.t||0,d:o.d||1.8,x:(x0+x1)/2,y:(y0+y1)/2+(H/2-sy)/z,z}}
  function boardBody(bw,bh,tray){g.save();g.shadowColor='rgba(30,40,55,.28)';g.shadowBlur=60;g.shadowOffsetY=26;const fr=g.createLinearGradient(0,-30,0,bh+30);fr.addColorStop(0,'#d3d7dc');fr.addColorStop(1,'#a9afb7');g.fillStyle=fr;g.beginPath();g.roundRect(-30,-30,bw+60,bh+60,34);g.fill();g.restore();
    g.strokeStyle='rgba(255,255,255,.6)';g.lineWidth=4;g.beginPath();g.roundRect(-26,-26,bw+52,bh+52,30);g.stroke();
    g.drawImage(tex(),0,0,bw,bh);g.strokeStyle='rgba(60,70,85,.22)';g.lineWidth=3;g.strokeRect(0,0,bw,bh);
    if(tray!==false){const tx=bw*.34,tw_=bw*.32,ty=bh+30;g.fillStyle='#9aa1aa';g.beginPath();g.roundRect(tx,ty,tw_,40,[0,0,14,14]);g.fill();g.fillStyle='rgba(255,255,255,.35)';g.fillRect(tx,ty,tw_,6);
      [[tx+tw_*.08,INK],[tx+tw_*.38,acc()]].forEach(([px,c])=>{g.fillStyle='#e3e6ea';g.beginPath();g.roundRect(px,ty-30,250,34,8);g.fill();g.fillStyle=c;g.beginPath();g.roundRect(px+196,ty-32,70,38,9);g.fill();g.fillRect(px+18,ty-30,34,34)});
      g.fillStyle='#4b5059';g.beginPath();g.roundRect(tx+tw_*.68,ty-46,230,50,8);g.fill();g.fillStyle='#eceef0';g.fillRect(tx+tw_*.68,ty-10,230,14)}}
  function board(t,keys,fn,o={}){const bw=o.w||3840,bh=o.h||2160,c=camAt(t,keys);PEN=null;g.save();const wl=g.createLinearGradient(0,0,0,H);wl.addColorStop(0,WALL0);wl.addColorStop(1,WALL1);g.fillStyle=wl;g.fillRect(0,0,W,H);
    g.translate(W/2,H/2);g.scale(c.z,c.z);g.translate(-c.x,-c.y);boardBody(bw,bh,o.tray);fn(c);g.restore();if(o.pen!==false)pen();return c}
  function on(ctx,fn){const k=G;G=ctx;try{fn()}finally{G=k}}
  return {board,fit,write,said,sketchPath,sketchLine,sketchArrow,sketchBox,sketchCircle,underline,pen,on,INK,ACC};
})();
