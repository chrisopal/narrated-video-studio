/* 风格包 · 全息界面 —— 本项目自己实现
   很深的底色上，实物是细线框；一次只框住一个部件，被框住的亮、其余退暗；参数数字滚到真值后定住、变成强调色；所有文字都有自己的半透明底板。
   用法：
   - wire(t, t0, dur, paths, {col, lw, dim, lit, over, tip})  一组线框路径依次描出来；dim 0..1 退暗，lit 0..1 点亮（加辉光、变亮色）
   - partFrame(t, t0, x, y, w, h, {label, idx, t1, pos})       四角括号从大收拢到 (x,y,w,h)，带编号标签；pos 'tl'|'bl' 标签放框上/框下
   - readout(t, t0, {label, value, unit, decimals, dur}, x, y, {w, h, t1})  带底板的参数卡：0.3 秒后开始滚 dur 秒，定住时变强调色并 sfx('ding')；返回定住时刻
   - leader(t, t0, [x1,y1], [x2,y2], {dur, t1})                从部件上的点到参数卡的细引线（先走 45° 或竖直，再拐平），起点带小圆环
   - scan(t, t0, {x,y,w,h}, {dur, dir:'x'|'y'})                一道扫描线扫过一个区域一次
   - compareBar(t, t0, {a, b, labelA, labelB, unit, title, decimals, max}, x, y, w)  旧/新两个数值的横条对比，两个都定住后标出差值
   - tag(t, t0, 文字, x, y, {sz, col, al, w, t1})               带半透明底板的一行字（场景标题、注释）；x,y 是文字基线
   - shape.{line, poly, arc, circle, rings, rrect, teeth, thread, spring, hatch, curve, move}  线框路径生成（返回 {pts,closed} 或其数组，交给 wire）
   - on(ctx, fn)                                               临时把线框组件的画笔换成 ctx（封面 art 里用；带文字的组件除外）
   - COL                                                       配色：line 线框冷色、lit 点亮色、cool 未定值、hot 强调（只给已定值） */
window.PACK=window.PACK||{};window.PACK_INIT=window.PACK_INIT||[];
PACK.holo=(function(){
  let G=g;
  const TAU=Math.PI*2;
  const COL={bg0:'#02060c',bg1:'#061522',line:'#4fb8e0',lit:'#d4f7ff',cool:'#8fdcf7',hot:'#ffb23e',plate:'rgba(3,14,24,.86)',edge:'rgba(110,210,250,.36)'};
  function on(ctx,fn){const o=G;G=ctx;try{fn()}finally{G=o}}

  /* ---------- 底色：一次做好的离屏图 ---------- */
  let _bg=null,_vg=null;
  function bgImg(){if(_bg)return _bg;const c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');
    const gr=x.createLinearGradient(0,0,0,H);gr.addColorStop(0,COL.bg0);gr.addColorStop(1,COL.bg1);x.fillStyle=gr;x.fillRect(0,0,W,H);
    const rg=x.createRadialGradient(W*.5,H*.48,0,W*.5,H*.48,W*.55);rg.addColorStop(0,'rgba(30,90,130,.20)');rg.addColorStop(1,'rgba(30,90,130,0)');x.fillStyle=rg;x.fillRect(0,0,W,H);
    x.fillStyle='rgba(120,210,250,.13)';for(let i=48;i<W;i+=48)for(let j=48;j<H;j+=48)x.fillRect(i-1,j-1,2,2);
    x.strokeStyle='rgba(120,210,250,.16)';x.lineWidth=1;x.beginPath();for(let i=240;i<W;i+=240)for(let j=240;j<H;j+=240){x.moveTo(i-7,j);x.lineTo(i+7,j);x.moveTo(i,j-7);x.lineTo(i,j+7)}x.stroke();
    x.fillStyle='rgba(140,220,255,.026)';for(let j=0;j<H;j+=4)x.fillRect(0,j,W,1);
    x.strokeStyle='rgba(140,220,255,.42)';x.lineWidth=2;const m=36,a=44;x.beginPath();[[m,m,1,1],[W-m,m,-1,1],[m,H-m,1,-1],[W-m,H-m,-1,-1]].forEach(([px,py,sx,sy])=>{x.moveTo(px,py+sy*a);x.lineTo(px,py);x.lineTo(px+sx*a,py)});x.stroke();
    return _bg=c}
  function vgImg(){if(_vg)return _vg;const c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');const v=x.createRadialGradient(W/2,H/2,H*.42,W/2,H/2,H*1.02);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(0,0,0,.55)');x.fillStyle=v;x.fillRect(0,0,W,H);return _vg=c}
  addTheme('holo',{light:false,ink:'#e2f5fc',dim:'rgba(180,222,240,.62)',note:'rgba(190,228,244,.84)',a1:COL.hot,a2:'#62d8ff',a3:'#7fa8ff',chip:'rgba(98,216,255,.12)',
    sub:'rgba(2,9,16,.80)',subInk:'#e8f7ff',top:'#02070d',bot:'#082033',card:COL.plate,cardInk:'#e2f5fc',pillInk:'#03121d',hl:'rgba(255,178,62,.35)',
    f:{t:'H9',b:'H7',s:'H5',h:'KT',n:'RC'},
    bg(t){g.drawImage(bgImg(),0,0);const y=(t*40)%(H+320)-160,gr=g.createLinearGradient(0,y-80,0,y+80);gr.addColorStop(0,'rgba(120,210,250,0)');gr.addColorStop(.5,'rgba(120,210,250,.035)');gr.addColorStop(1,'rgba(120,210,250,0)');g.fillStyle=gr;g.fillRect(0,y-80,W,160)},
    post(t){g.drawImage(vgImg(),0,0)}});

  /* ---------- 线框路径 ---------- */
  const mk=(pts,closed=false)=>({pts,closed:!!closed});
  const shape={
    line:(x1,y1,x2,y2)=>mk([[x1,y1],[x2,y2]]),
    poly:(pts,closed)=>mk(pts.map(p=>[p[0],p[1]]),closed),
    // 圆弧/椭圆弧：ry 不给就是正圆；a0..a1 弧度
    arc(cx,cy,r,a0=0,a1=TAU,ry){ry=ry??r;const full=Math.abs(a1-a0)>=TAU-1e-6,n=Math.max(10,Math.ceil(Math.abs(a1-a0)*Math.max(r,ry)/8)),p=[];for(let i=0;i<=(full?n-1:n);i++){const a=a0+(a1-a0)*i/n;p.push([cx+r*Math.cos(a),cy+ry*Math.sin(a)])}return mk(p,full)},
    circle:(cx,cy,r)=>shape.arc(cx,cy,r),
    rings:(cx,cy,rs)=>rs.map(r=>shape.arc(cx,cy,r)),
    rrect(x,y,w,h,r=0){r=Math.min(r,w/2,h/2);if(r<=0)return mk([[x,y],[x+w,y],[x+w,y+h],[x,y+h]],true);const p=[],C=[[x+w-r,y+r,-Math.PI/2],[x+w-r,y+h-r,0],[x+r,y+h-r,Math.PI/2],[x+r,y+r,Math.PI]];C.forEach(([cx,cy,a])=>{for(let i=0;i<=6;i++){const b=a+Math.PI/2*i/6;p.push([cx+r*Math.cos(b),cy+r*Math.sin(b)])}});return mk(p,true)},
    // 齿形轮廓：r1 齿根、r2 齿顶、n 齿数、duty 齿顶占比
    teeth(cx,cy,r1,r2,n,duty=.45){const p=[],s=TAU/n,q=s*(1-duty)/4;for(let i=0;i<n;i++){const a=i*s-Math.PI/2;[[a,r1],[a+q,r2],[a+q+s*duty,r2],[a+2*q+s*duty,r1]].forEach(([b,r])=>p.push([cx+r*Math.cos(b),cy+r*Math.sin(b)]))}return mk(p,true)},
    // 外螺纹侧视：x,y 左上，w 长，h 高（不含牙），n 牙数，d 牙深。返回 [上牙, 下牙, 斜纹…]
    thread(x,y,w,h,n,d=8){const p=w/n,top=[],bot=[],sl=[];for(let i=0;i<=n;i++){top.push([x+i*p,y]);bot.push([x+i*p+p/2,y+h]);if(i<n){top.push([x+(i+.5)*p,y-d]);bot.push([x+(i+1)*p,y+h+d])}}bot.pop();for(let i=0;i<n;i++)sl.push(mk([[x+(i+.5)*p,y-d],[x+(i+1)*p,y+h+d]]));return [mk(top),mk(bot),...sl]},
    // 弹簧侧视：x1→x2，振幅 amp，n 圈
    spring(x1,y,x2,amp,n){const p=[[x1,y]];for(let i=0;i<n;i++){const a=x1+(x2-x1)*i/n,b=(x2-x1)/n;p.push([a+b*.25,y-amp],[a+b*.75,y+amp])}p.push([x2,y]);return mk(p)},
    // 滚花/剖面线：矩形内的平行斜线；slope 1 右下、-1 右上
    hatch(x,y,w,h,step,slope=1){const out=[];for(let c=x-h;c<=x+w;c+=step){const s0=Math.max(0,x-c),s1=Math.min(h,x+w-c);if(s1-s0<2)continue;out.push(slope>0?mk([[c+s0,y+s0],[c+s1,y+s1]]):mk([[c+s0,y+h-s0],[c+s1,y+h-s1]]))}return out},
    // 参数曲线：fn(u) → [x,y]，u 从 0 到 1
    curve(fn,n=32){const p=[];for(let i=0;i<=n;i++)p.push(fn(i/n));return mk(p)},
    move(paths,dx,dy){return flat([paths]).map(p=>mk(p.pts.map(([a,b])=>[a+dx,b+dy]),p.closed))},
  };
  function flat(a,out=[]){for(const p of a){if(Array.isArray(p))flat(p,out);else if(p&&p.pts)out.push(p)}return out}
  function plen(p){if(p._len!=null)return p._len;const q=p.closed?p.pts.concat([p.pts[0]]):p.pts;let L=0;for(let i=1;i<q.length;i++)L+=Math.hypot(q[i][0]-q[i-1][0],q[i][1]-q[i-1][1]);return p._len=L}
  // 把路径 p 的前 k 部分加进 Path2D，返回笔尖位置
  function part(P2,p,k){const q=p.closed?p.pts.concat([p.pts[0]]):p.pts;let rem=plen(p)*k;P2.moveTo(q[0][0],q[0][1]);let tip=q[0];for(let i=1;i<q.length;i++){const d=Math.hypot(q[i][0]-q[i-1][0],q[i][1]-q[i-1][1]);if(d>=rem){const f=d?rem/d:0;tip=[lerp(q[i-1][0],q[i][0],f),lerp(q[i-1][1],q[i][1],f)];P2.lineTo(tip[0],tip[1]);return tip}P2.lineTo(q[i][0],q[i][1]);rem-=d;tip=q[i]}return null}

  /* ---------- 招牌组件 ---------- */
  function wire(t,t0,dur,paths,o={}){const P=flat([paths]);const k=dur>0?seg(t,t0,t0+dur):(t>=t0?1:0);if(k<=0||!P.length)return;
    const {col=COL.line,lw=2.4,dim=0,lit=0,over=.25,tip=true}=o;const L=P.reduce((s,p)=>s+plen(p),0);let acc=0;const P2=new Path2D(),tips=[];
    P.forEach(p=>{const l=plen(p),a=acc/L*(1-over),b=a+l/L*(1-over)+over;acc+=l;const kk=k>=1?1:cl((k-a)/(b-a));if(kk<=0)return;const tp=part(P2,p,kk);if(kk<1&&tp)tips.push(tp)});
    const al=1-.8*cl(dim),A=G.globalAlpha;G.save();G.lineCap='round';G.lineJoin='round';
    if(lit>0){G.globalCompositeOperation='lighter';G.strokeStyle=COL.line;G.globalAlpha=A*.09*lit;G.lineWidth=lw*7;G.stroke(P2);G.globalAlpha=A*.2*lit;G.lineWidth=lw*2.8;G.stroke(P2);G.globalCompositeOperation='source-over'}
    G.globalAlpha=A*al*.85;G.strokeStyle=col;G.lineWidth=lw;G.stroke(P2);
    if(lit>0){G.globalAlpha=A*al*lit;G.strokeStyle=COL.lit;G.lineWidth=lw*1.15;G.stroke(P2)}
    if(tip&&tips.length){G.globalAlpha=A*al;G.fillStyle=COL.lit;tips.forEach(([x,y])=>{G.beginPath();G.arc(x,y,lw*1.6,0,TAU);G.fill()});G.globalCompositeOperation='lighter';G.globalAlpha=A*al*.22;tips.forEach(([x,y])=>{G.beginPath();G.arc(x,y,lw*3.5,0,TAU);G.fill()})}
    G.restore()}

  // 带底板的一行字
  function tag(t,t0,s,x,y,o={}){const {sz=34,col,al='left',w='H7',t1,edge=COL.edge}=o;const k=eo(seg(t,t0,t0+.4))*(t1!=null?1-seg(t,t1-.3,t1):1);if(k<=0)return 0;
    const tw0=tw(s,sz,w),px=sz*.5,x0=al==='center'?x-tw0/2:al==='right'?x-tw0:x;g.save();g.globalAlpha*=k;g.fillStyle=COL.plate;g.fillRect(x0-px,y-sz*1.06,(tw0+2*px)*cl(k*1.4),sz*1.5);g.strokeStyle=edge;g.lineWidth=1.5;g.strokeRect(x0-px,y-sz*1.06,(tw0+2*px)*cl(k*1.4),sz*1.5);g.fillStyle=COL.cool;g.fillRect(x0-px,y-sz*1.06,4,sz*1.5);
    txt(s,x,y,sz,col||TH.ink,w,al);g.restore();return tw0+2*px}

  function partFrame(t,t0,x,y,w,h,o={}){const {label,idx,t1,col=COL.cool,arm=38,lw=3,pos='tl'}=o;sfx('whoosh',t0,.4);const k=eo(seg(t,t0,t0+.55)),out=t1!=null?1-seg(t,t1-.3,t1):1;if(k<=0||out<=0)return;
    const e=(1-k)*80+Math.sin((t-t0)*2.4)*2.2*k,x0=x-e,y0=y-e,x1=x+w+e,y1=y+h+e;G.save();G.globalAlpha*=cl(k*1.5)*out;G.strokeStyle=col;G.lineWidth=lw;G.lineCap='square';G.beginPath();
    [[x0,y0,1,1],[x1,y0,-1,1],[x0,y1,1,-1],[x1,y1,-1,-1]].forEach(([px,py,sx,sy])=>{G.moveTo(px,py+sy*arm);G.lineTo(px,py);G.lineTo(px+sx*arm,py)});G.stroke();
    G.globalAlpha*=.6;G.lineWidth=2;G.beginPath();const mx=(x0+x1)/2,my=(y0+y1)/2;G.moveTo(mx,y0-8);G.lineTo(mx,y0+8);G.moveTo(mx,y1-8);G.lineTo(mx,y1+8);G.moveTo(x0-8,my);G.lineTo(x0+8,my);G.moveTo(x1-8,my);G.lineTo(x1+8,my);G.stroke();G.restore();
    if(label){const s=(idx?idx+'  ':'')+label;tag(t,t0+.35,s,x+17,pos==='bl'?y+h+66:y-22,{sz:34,col:COL.lit,t1})}}

  function readout(t,t0,v,x,y,o={}){const {label='',value=0,unit='',decimals=0,dur=1.2}=v,{w=380,h=176,t1}=o;const tr=t0+.3,ts=tr+dur;sfx('tick',tr,.6);sfx('ding',ts,.7);
    const k=eo(seg(t,t0,t0+.4)),out=t1!=null?1-seg(t,t1-.3,t1):1;if(k<=0||out<=0)return ts;const kr=seg(t,tr,ts),done=t>=ts,f=1-seg(t,ts,ts+.6);
    g.save();g.globalAlpha*=cl(k*1.5)*out;g.beginPath();g.rect(x-4,y-4,(w+8)*k,h+8);g.clip();
    g.fillStyle=COL.plate;g.fillRect(x,y,w,h);g.strokeStyle=done?'rgba(255,178,62,.55)':COL.edge;g.lineWidth=1.5;g.strokeRect(x,y,w,h);g.fillStyle=done?COL.hot:COL.cool;g.fillRect(x,y,5,h);
    g.lineWidth=2;g.strokeStyle=done?COL.hot:COL.cool;if(done){g.fillStyle=COL.hot;g.fillRect(x+w-30,y+18,14,14)}else g.strokeRect(x+w-30,y+18,14,14);
    txt(label,x+26,y+50,32,TH.note,'H5');
    let val=value;if(!done){const j=(rnd(Math.floor(t*28)*13+Math.round(value*7))-.5)*Math.max(1,Math.abs(value))*.35*(1-kr);val=Math.max(0,value*expo(kr)+(kr>0?j:0))}
    const s=fmt(val,decimals),uw=unit?tw(unit,38,'H7'):0,nx=x+w-26-(unit?uw+12:0);numtxt(s,nx,y+140,88,done?COL.hot:COL.cool,'right');if(unit)txt(unit,x+w-26,y+140,38,done?TH.ink:TH.dim,'H7','right');
    if(!done){g.fillStyle='rgba(143,220,247,.22)';g.fillRect(x+26,y+156,w-52,3);g.fillStyle=COL.cool;g.fillRect(x+26,y+156,(w-52)*kr,3)}
    else{const ku=eo(seg(t,ts,ts+.35));g.fillStyle=COL.hot;g.fillRect(x+26,y+155,(w-52)*ku,4);if(f>0){g.globalCompositeOperation='lighter';g.globalAlpha*=.22*f;g.fillStyle=COL.hot;g.fillRect(x,y,w,h)}}
    g.restore();return ts}

  function leader(t,t0,a,b,o={}){const {dur=.45,t1,col=COL.cool,lw=2}=o;const k=eo(seg(t,t0,t0+dur)),out=t1!=null?1-seg(t,t1-.3,t1):1;if(k<=0||out<=0)return;
    const dx=b[0]-a[0],dy=b[1]-a[1],e=Math.abs(dx)>=Math.abs(dy)?[a[0]+Math.sign(dx)*Math.abs(dy),b[1]]:[a[0],b[1]-Math.sign(dy)*Math.abs(dx)];const P2=new Path2D();part(P2,mk([a,e,b]),k);
    G.save();G.globalAlpha*=out;G.strokeStyle=col;G.fillStyle=col;G.lineWidth=lw;G.lineCap='round';G.lineJoin='round';G.stroke(P2);
    const kr=back(seg(t,t0,t0+.3));G.lineWidth=2;G.beginPath();G.arc(a[0],a[1],9*kr,0,TAU);G.stroke();G.beginPath();G.arc(a[0],a[1],3.5,0,TAU);G.fill();
    if(k>=1)G.fillRect(b[0]-4,b[1]-4,8,8);G.restore()}

  function scan(t,t0,r,o={}){const {dur=1.1,dir='x',trail=150}=o;sfx('whoosh',t0,.5);const k=seg(t,t0,t0+dur);if(k<=0||k>=1)return;const e=eio(k),fa=Math.min(1,Math.sin(Math.PI*k)*2.5);
    G.save();G.globalAlpha*=fa;G.beginPath();G.rect(r.x,r.y,r.w,r.h);G.clip();G.globalCompositeOperation='lighter';
    if(dir==='x'){const X=r.x-trail/3+(r.w+trail/3)*e,gr=G.createLinearGradient(X-trail,0,X,0);gr.addColorStop(0,'rgba(120,215,255,0)');gr.addColorStop(1,'rgba(120,215,255,.20)');G.fillStyle=gr;G.fillRect(X-trail,r.y,trail,r.h);G.fillStyle='rgba(215,248,255,.9)';G.fillRect(X-1.5,r.y,3,r.h)}
    else{const Y=r.y-trail/3+(r.h+trail/3)*e,gr=G.createLinearGradient(0,Y-trail,0,Y);gr.addColorStop(0,'rgba(120,215,255,0)');gr.addColorStop(1,'rgba(120,215,255,.20)');G.fillStyle=gr;G.fillRect(r.x,Y-trail,r.w,trail);G.fillStyle='rgba(215,248,255,.9)';G.fillRect(r.x,Y-1.5,r.w,3)}
    G.restore()}

  function compareBar(t,t0,v,x,y,w,o={}){const {a,b,labelA='旧款',labelB='新款',unit='',title='',decimals=0,max}=v;const ta=t0+.3,tb=t0+.8,dr=.9,td=t0+2;sfx('tick',ta,.5);sfx('tick',tb,.5);sfx('ding',td,.8);
    const k=eo(seg(t,t0,t0+.4)),out=o.t1!=null?1-seg(t,o.t1-.3,o.t1):1;if(k<=0||out<=0)return;const M=max||Math.max(a,b),lw0=Math.max(tw(labelA,34,'H7'),tw(labelB,34,'H7')),uw=unit?tw(unit,34,'H7'):0,vw=Math.max(numw(fmt(a,decimals),64),numw(fmt(b,decimals),64))+uw+40,bx=x+28+lw0+28,bw=w-(bx-x)-vw-30,hh=272;
    g.save();g.globalAlpha*=cl(k*1.5)*out;g.fillStyle=COL.plate;g.fillRect(x,y,w*k,hh);g.strokeStyle=COL.edge;g.lineWidth=1.5;g.strokeRect(x,y,w*k,hh);g.fillStyle=COL.cool;g.fillRect(x,y,5,hh);
    if(title)txt(title,x+28,y+56,34,TH.note,'H7');
    const ends=[];[[a,labelA,ta,0],[b,labelB,tb,1]].forEach(([val,lab,t1,i])=>{const yc=y+124+i*92,kr=seg(t,t1,t1+dr),done=t>=t1+dr,len=bw*val/M*expo(kr);ends.push(bx+len);
      txt(lab,x+28,yc+12,34,i?TH.ink:TH.dim,'H7');g.strokeStyle='rgba(143,220,247,.18)';g.lineWidth=1;g.strokeRect(bx,yc-22,bw,44);
      if(kr>0){if(i&&done){g.fillStyle=COL.hot;g.globalAlpha*=.9;g.fillRect(bx,yc-22,len,44);g.globalAlpha/=.9}else{g.save();g.beginPath();g.rect(bx,yc-22,len,44);g.clip();g.strokeStyle='rgba(143,220,247,.45)';g.lineWidth=2;g.beginPath();for(let q=bx-44;q<bx+len;q+=14){g.moveTo(q,yc+22);g.lineTo(q+44,yc-22)}g.stroke();g.restore();g.strokeStyle=COL.cool;g.lineWidth=2;g.strokeRect(bx,yc-22,len,44)}
        let vv=val;if(!done)vv=Math.max(0,val*expo(kr)+(rnd(Math.floor(t*28)*11+i*5)-.5)*val*.3*(1-kr));numtxt(fmt(vv,decimals),x+w-28-(unit?uw+10:0),yc+24,64,done?COL.hot:COL.cool,'right');if(unit)txt(unit,x+w-28,yc+24,34,done?TH.ink:TH.dim,'H7','right')}});
    const kd=eo(seg(t,td,td+.45));if(kd>0){const e0=Math.min(...ends),e1=Math.max(...ends),ym=y+124+46;g.strokeStyle=COL.hot;g.fillStyle=COL.hot;g.lineWidth=2;g.globalAlpha*=kd;g.setLineDash([6,6]);g.beginPath();g.moveTo(e0,y+124-26);g.lineTo(e0,y+124+92+26);g.stroke();g.setLineDash([]);
      g.beginPath();g.moveTo(e0,ym);g.lineTo(lerp(e0,e1,kd),ym);g.moveTo(e1,ym-8);g.lineTo(e1,ym+8);g.stroke();
      const d=b-a,s=(d<0?'−':'+')+fmt(Math.abs(d),decimals)+(unit?' '+unit:'');g.globalAlpha/=kd;tag(t,td,s,x+w-28,y+56,{sz:34,col:COL.hot,al:'right',edge:'rgba(255,178,62,.5)'})}
    g.restore()}

  return {wire,partFrame,readout,leader,scan,compareBar,tag,shape,on,COL};
})();
