/* 风格包 · 动态文字 —— 本项目自己实现
   纯色满屏底上，一个巨大的词砸在拍子上；落定之后完全静止；全片一个强调色，其余黑、白、一种底色；换屏硬切或色块擦过。
   用法（t 全片时间，t0 开始时刻；颜色缺省跟着当前这一屏的配色走）：
   screens(t, [{at, bg:'paper|black|accent|white', fn(pal,u), wipe:'right|left|up|down', d}], {wipe, d, band})  按时刻换屏；不写 wipe 就是硬切；fn 里 pal={bg,ink,acc,dim}，u=这一屏已经过了几秒
   slam(t, t0, '词', {x, y, sz:340, col, al:'left|center|right', from:'scale|up|down|left|right', d:.15, maxW, font, hit, gain})  主词砸到位，小过冲后静止，落地时 sfx('thud')；hit:true 时 t0 是落地时刻；返回实际字号
   sub(t, t0, '辅句', {x, y, sz:100, col, al, from:'up', maxW, font})  辅句：比主词晚 0.2–0.3 秒调用；字号取主词的 1/3.4 左右（RATIO）
   listUp(t, [{at, text}], {x, y, sz:170, gap, num:true, from:'left', allOn, maxW})  清单一条一条砸上来，新的一条到了旧的立刻退灰；allOn 时刻全部点亮
   countBig(t, t0, 数字或字符串, {x, y, sz:520, col, al, pad:2, from:'down', roll:0})  巨大的序号或数字；roll>0 时落地后用这么多秒数到位，然后不动
   bar(t, t0, {x, y, w, h:28, col, from:'left|right|center|top|bottom', d:.22})  强调色粗条，一笔擦出来；x,y 是左上角；top/bottom 用来擦竖条
   fit('词', 字号, 最大宽度, 字体)  自动缩字，不小于 32
   on(ctx, fn)  临时把图形画笔换成 ctx（封面里用 bar）；带文字的组件不支持
   PAL  四种屏的配色表；RATIO=3.4 主词和辅句的字号比 */
window.PACK=window.PACK||{};window.PACK_INIT=window.PACK_INIT||[];
PACK.kinetic=(function(){
  const BLK='#0e0e0e',WHT='#ffffff',PAPER='#ece6d8',ACC='#ff4d14',RATIO=3.4,MARGIN=96;
  const PAL={
    paper:{bg:PAPER,ink:BLK,acc:ACC,dim:'#a39c8c'},
    white:{bg:WHT,ink:BLK,acc:ACC,dim:'#a8a8a8'},
    black:{bg:BLK,ink:WHT,acc:ACC,dim:'#6a6a6a'},
    accent:{bg:ACC,ink:BLK,acc:WHT,dim:'rgba(14,14,14,.42)'}};
  let CUR=PAL.paper,P=g;   // CUR 当前屏的配色；P 图形画笔（on() 可以临时换）
  addTheme('kinetic',{light:true,ink:BLK,dim:'rgba(14,14,14,.6)',note:'rgba(14,14,14,.78)',a1:ACC,a2:BLK,a3:'#8a8474',chip:'rgba(14,14,14,.07)',
    sub:'rgba(14,14,14,.9)',subInk:WHT,top:PAPER,bot:PAPER,card:WHT,cardInk:BLK,pillInk:BLK,hl:'rgba(255,77,20,.32)',
    f:{t:'H9',b:'H7',s:'H5',h:'H9',n:'RC'},
    bg(t){g.fillStyle=PAPER;g.fillRect(0,0,W,H)}});

  function on(ctx,fn){const o=P;P=ctx;try{fn()}finally{P=o}}
  function fit(s,sz,maxW,font){const w=tw(String(s),sz,font||'H9');return w<=maxW?sz:Math.max(32,Math.floor(sz*maxW/w))}
  const roomFor=(x,al)=>al==='center'?2*Math.min(x-MARGIN,W-MARGIN-x):al==='right'?x-MARGIN:W-MARGIN-x;

  /* 砸字的内核：ts 起动，tl 落地；落地前加速冲进来，落地后 0.1 秒内一下很小的过冲，之后变换恰好是单位变换（完全静止） */
  function hitText(t,ts,tl,s,x,y,sz,col,font,al,from,draw){
    if(t<ts)return;const k=seg(t,ts,tl),e=k*k*k,r=seg(t,tl,tl+.1),bo=r>=1?0:Math.sin(r*Math.PI)*(1-r);
    const wd=draw.w(s,sz,font),cx=al==='center'?x:al==='right'?x-wd/2:x+wd/2,cy=y-sz*.36;
    let sc=1,dx=0,dy=0;
    if(from==='scale')sc=lerp(2.6,1,e)*(1-.04*bo);
    else{const far=from==='left'||from==='right'?Math.max(260,sz*1.6):Math.max(200,sz*1.1),v={left:[-1,0],right:[1,0],up:[0,-1],down:[0,1]}[from]||[0,1];
      const off=(1-e)*far-bo*sz*.045;dx=v[0]*off;dy=v[1]*off;sc=1+.02*bo}
    g.save();g.globalAlpha*=cl(k*3.2);if(sc!==1||dx||dy){g.translate(cx+dx,cy+dy);g.scale(sc,sc);g.translate(-cx,-cy)}
    draw.go(s,x,y,sz,col,font,al);g.restore()}
  const CJKDRAW={w:(s,sz,f)=>tw(s,sz,f),go:(s,x,y,sz,col,f,al)=>txt(s,x,y,sz,col,f,al)};
  const numFont=sz=>`800 ${sz}px RC, H9`;
  const NUMDRAW={w:(s,sz)=>{g.save();g.font=numFont(sz);const w=g.measureText(s).width;g.restore();return w},
    go:(s,x,y,sz,col,f,al)=>{g.save();g.font=numFont(sz);g.fillStyle=col;g.textAlign=al;g.textBaseline='alphabetic';if(REC)recText(s,x,y,sz,al);g.fillText(s,x,y);g.restore()}};

  function slam(t,t0,s,o={}){s=String(s);const d=o.d??.15,tl=o.hit?t0:t0+d,ts=tl-d,al=o.al||'left',x=o.x??MARGIN,y=o.y??H/2,font=o.font||'H9';
    const sz=fit(s,o.sz||340,o.maxW||roomFor(x,al),font);if(t<ts)return sz;sfx('thud',tl,o.gain??1);
    hitText(t,ts,tl,s,x,y,sz,o.col||CUR.ink,font,al,o.from||'scale',CJKDRAW);return sz}
  function sub(t,t0,s,o={}){s=String(s);const d=o.d??.12,al=o.al||'left',x=o.x??MARGIN,y=o.y??H/2+200,font=o.font||'H7';
    const sz=fit(s,o.sz||100,o.maxW||roomFor(x,al),font);if(t<t0)return sz;sfx('tick',t0+d,o.gain??.5);
    hitText(t,t0,t0+d,s,x,y,sz,o.col||CUR.ink,font,al,o.from||'up',CJKDRAW);return sz}
  function countBig(t,t0,n,o={}){const d=o.d??.15,tl=t0+d,al=o.al||'left',x=o.x??MARGIN,y=o.y??H/2,sz=o.sz||520,pad=o.pad??2;if(t<t0)return;
    let s=typeof n==='number'?String(o.roll?Math.round(n*expo(seg(t,tl,tl+o.roll))):n).padStart(pad,'0'):String(n);
    sfx('thud',tl,o.gain??.8);hitText(t,t0,tl,s,x,y,sz,o.col||CUR.acc,null,al,o.from||'down',NUMDRAW)}
  function bar(t,t0,o={}){const k=eo(seg(t,t0,t0+(o.d??.22)));if(k<=0)return;sfx('whoosh',t0,o.gain??.35);const x=o.x??MARGIN,y=o.y??H/2,w=o.w??600,h=o.h??28,ww=w*k,from=o.from||'left';
    P.save();P.fillStyle=o.col||CUR.acc;if(from==='top'||from==='bottom'){const hh=h*k;P.fillRect(x,from==='bottom'?y+h-hh:y,w,hh)}else P.fillRect(from==='right'?x+w-ww:from==='center'?x+(w-ww)/2:x,y,ww,h);P.restore()}
  function listUp(t,items,o={}){const x=o.x??MARGIN+40,y=o.y??300,sz=o.sz||170,gap=o.gap||sz*1.32,num=o.num!==false,from=o.from||'left',nw=num?sz*.78:0,d=.15;
    let cur=-1;items.forEach((it,i)=>{if(t>=it.at)cur=i});const all=o.allOn!=null&&t>=o.allOn;if(all)sfx('ding',o.allOn,.6);
    items.forEach((it,i)=>{if(t<it.at)return;const live=all||i===cur,yy=y+i*gap,tl=it.at+d;sfx('thud',tl,.9);
      if(num)hitText(t,it.at,tl,String(i+1),x,yy,sz,live?(o.acc||CUR.acc):(o.dim||CUR.dim),null,'left',from,NUMDRAW);
      const s=String(it.text),fs=fit(s,sz,o.maxW||W-MARGIN-x-nw,'H9');
      hitText(t,it.at,tl,s,x+nw,yy,fs,live?(o.col||CUR.ink):(o.dim||CUR.dim),'H9','left',from,CJKDRAW)});
    return y+(items.length-1)*gap}

  /* 换屏：每屏一个底色。屏内 TH 的文字色跟着换，通用组件也读得清 */
  function drawScreen(s,t){const pal=typeof s.bg==='string'?(PAL[s.bg]||{...PAL.paper,bg:s.bg}):(s.bg||PAL.paper),oc=CUR,keep={ink:TH.ink,dim:TH.dim,note:TH.note,a1:TH.a1,light:TH.light,cardInk:TH.cardInk,card:TH.card};
    const dark=pal.ink===WHT;CUR=pal;Object.assign(TH,{ink:pal.ink,dim:dark?'rgba(255,255,255,.62)':'rgba(14,14,14,.6)',note:dark?'rgba(255,255,255,.82)':'rgba(14,14,14,.78)',a1:pal.acc,light:!dark,cardInk:BLK,card:WHT});
    g.save();g.fillStyle=pal.bg;g.fillRect(0,0,W,H);try{if(s.fn)s.fn(pal,t-s.at)}finally{g.restore();CUR=oc;Object.assign(TH,keep)}return pal}
  const bgOf=s=>typeof s.bg==='string'?(PAL[s.bg]?PAL[s.bg].bg:s.bg):(s.bg||PAL.paper).bg;
  function screens(t,list,o={}){let i=-1;list.forEach((s,j)=>{if(t>=s.at)i=j});if(i<0)return;const cur=list[i],wp=cur.wipe??o.wipe,d=cur.d||o.d||.32,k=wp&&i>0?seg(t,cur.at,cur.at+d):1;
    if(k>=1){drawScreen(cur,t);return}
    sfx('whoosh',cur.at,.7);const prev=list[i-1];drawScreen(prev,t);
    // 一道色块擦过去：色块前面是旧屏，后面是新屏。色块取一个和前后两屏底色都不同的颜色
    const horiz=wp==='left'||wp==='right'||wp===true,L=horiz?W:H,B=L*(o.bandW||.42),e=lerp(0,L+B,eio(k)),a=cl(e-B,0,L),b=cl(e,0,L),rev=wp==='left'||wp==='up';
    const R=(p,q)=>{const lo=rev?L-q:p,hi=rev?L-p:q;return horiz?[lo,0,hi-lo,H]:[0,lo,W,hi-lo]};
    if(a>0){g.save();g.beginPath();g.rect(...R(0,a));g.clip();drawScreen(cur,t);g.restore()}
    const used=[bgOf(prev),bgOf(cur)],band=o.band||[ACC,BLK,WHT].find(c=>!used.includes(c));g.save();g.fillStyle=band;g.fillRect(...R(a,b));g.restore()}

  return {screens,slam,sub,listUp,countBig,bar,fit,on,PAL,RATIO,ACC,BLK,WHT,PAPER};
})();
