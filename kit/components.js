/* 讲解视频工坊 · 通用组件
   全部是时间的纯函数：component(t, 出现时刻, 内容, 位置…)。颜色和字体取自当前主题 TH，所以换主题不用改场景代码。
   文字都走 txt()/numtxt()，检查脚本能看到它们；声音用 sfx() 登记。
   坐标是 1920×1080 画布。画面底部 120 像素是字幕带，组件不要放进去。 */

/* ---------- 文字排版 ---------- */
// 按宽度折行（中文逐字折，行首不放标点）
function wrap(s,maxW,sz,w){w=w||TH.f.b;const out=[];let cur='';for(const ch of String(s)){if(ch==='\n'){out.push(cur);cur='';continue}
  if(cur&&tw(cur+ch,sz,w)>maxW&&!'，。；：？！、）》”’…'.includes(ch)){out.push(cur);cur=ch}else cur+=ch}if(cur)out.push(cur);return out}
function para(s,x,y,maxW,sz,col,w,lh=1.45,al='left',a=1){const L=wrap(s,maxW,sz,w);L.forEach((l,i)=>txt(l,x,y+i*sz*lh,sz,col,w||TH.f.b,al,a));return L.length*sz*lh}
// 粗体数字（RobotoCondensed 800），同样登记给检查
function numtxt(s,x,y,sz,col,al='left',a=1){if(a<=0)return 0;g.save();g.globalAlpha*=a;g.font=`800 ${sz}px ${TH.f.n}, H9`;g.fillStyle=col||TH.ink;g.textAlign=al;g.textBaseline='alphabetic';if(REC)recText(String(s),x,y,sz,al);g.fillText(s,x,y);const w=g.measureText(s).width;g.restore();return w}
function numw(s,sz){g.save();g.font=`800 ${sz}px ${TH.f.n}, H9`;const w=g.measureText(s).width;g.restore();return w}
const fmt=(v,d=0)=>Number(v).toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d});

/* ---------- 人名条、年代、来源 ---------- */
// 人名条：谁在说话/这是哪里。t1 给了就在 t1 退场
function lowerThird(t,t0,name,role,x=110,y=830,t1){const k=eo(seg(t,t0,t0+.45))*(t1?1-seg(t,t1-.3,t1):1);if(k<=0)return;sfx('whoosh',t0,.5);const hh=role?132:94,w=Math.max(tw(name,56,TH.f.t),role?tw(role,32,TH.f.b):0)+76;g.save();g.globalAlpha*=k;g.beginPath();g.rect(x,y-80,(w+12)*k,hh+20);g.clip();g.fillStyle=TH.card;rr(x,y-70,w,hh,8);g.fill();g.fillStyle=TH.a1;g.fillRect(x,y-70,10,hh);txt(name,x+36,y-6,56,TH.cardInk,TH.f.t);if(role)txt(role,x+36,y+40,32,TH.light?TH.dim:TH.a1,TH.f.b);g.restore()}
// 年代戳：大号年份 + 一行说明
function dateStamp(t,t0,big,small,x=110,y=300,sz=170){const k=eo(seg(t,t0,t0+.5));if(k<=0)return;sfx('thud',t0,.6);g.save();g.globalAlpha*=k;numtxt(big,x,y+(1-k)*30,sz,TH.a1);if(small)txt(small,x+6,y+62,42,TH.ink,TH.f.t);g.restore()}
// 来源角标：数字、截图、引文旁边写出处（放左下，字幕带上方）
function sourceTag(t,t0,text,x=72,y=H-140){txt(text,x,y,32,TH.note,TH.f.s,'left',eo(seg(t,t0,t0+.4)))}
// 图章：定论、结案、合格
function stamp(t,t0,text,x,y,rot=-.14,col){const k=seg(t,t0,t0+.14);if(k<=0)return;sfx('thud',t0);const s=lerp(2.2,1,eo(k)),w=tw(text,64,'H9')+70;g.save();g.translate(x,y);g.rotate(rot);g.scale(s,s);g.globalAlpha*=cl(k*3)*.92;g.strokeStyle=col||TH.a1;g.lineWidth=8;rr(-w/2,-58,w,116,14);g.stroke();g.lineWidth=3;rr(-w/2+12,-46,w-24,92,8);g.stroke();txt(text,0,22,64,col||TH.a1,'H9','center');g.restore()}
// 荧光笔：在截图或引文上划一道。要写在被划的文字之前（先画底色，再画字）
function highlight(t,t0,x,y,w,h=46,col){const k=eo(seg(t,t0,t0+.5));if(k<=0)return;g.save();g.globalAlpha*=TH.light?.85:.45;g.fillStyle=col||TH.hl;g.fillRect(x,y,w*k,h);g.restore()}

/* ---------- 时间轴、流程 ---------- */
// 时间轴：items=[{tag:'1969',label:'登月',at}]。到了 at 那一刻亮起，最新的一项最大
function timeline(t,t0,items,o={}){const y=o.y||560,x0=o.x0||220,x1=o.x1||1700,k=eo(seg(t,t0,t0+.8));if(k<=0)return;g.save();g.strokeStyle=TH.dim;g.lineWidth=5;g.lineCap='round';g.beginPath();g.moveTo(x0,y);g.lineTo(lerp(x0,x1,k),y);g.stroke();
  // 排版：同侧相邻两条相隔两个间距，标签按这个宽度缩字（不小于 32），还放不下就折成两行；年份和标签的位置按实际行数算，朝上朝下对称，互不压字
  const n=items.length,sp=n>1?(x1-x0-120)/(n-1):x1-x0,maxW=o.labelW||Math.max(160,(n>2?2*sp:sp*1.6)-48),stem=70,gl=22,gt=24;
  const cur=items.filter(i=>i.at<=t).length-1;items.forEach((it,i)=>{const x=n>1?lerp(x0+60,x1-60,i/(n-1)):(x0+x1)/2,ki=seg(t,it.at,it.at+.4);if(ki<=0){g.fillStyle=TH.dim;g.globalAlpha=k*.5;g.beginPath();g.arc(x,y,8,0,7);g.fill();g.globalAlpha=1;return}
   sfx('pop',it.at);const on=i===cur,up=i%2===0,r=on?20:13,ts=on?72:56;let ls=on?40:34;while(ls>32&&tw(it.label,ls,TH.f.b)>maxW)ls-=2;const fw=tw(it.label,ls,TH.f.b),lines=fw>maxW?wrap(it.label,Math.min(maxW,fw/2+ls*1.5),ls).slice(0,2):[it.label],lh=ls*1.25,lw=Math.max(...lines.map(l=>tw(l,ls,TH.f.b))),lx=cl((x-60)/(W-120),.5*lw/(W-120),1-.5*lw/(W-120))*(W-120)+60;
   g.fillStyle=on?TH.a1:TH.ink;g.beginPath();g.arc(x,y,r*back(ki),0,7);g.fill();g.strokeStyle=on?TH.a1:TH.dim;g.lineWidth=3;g.beginPath();g.moveTo(x,y+(up?-r-8:r+8));g.lineTo(x,y+(up?-stem:stem));g.stroke();
   let b0,tagY;if(up){const last=y-stem-gl-ls*.16;b0=last-(lines.length-1)*lh;tagY=b0-ls*.86-gt}else{b0=y+stem+gl+ls*.86;const last=b0+(lines.length-1)*lh;tagY=last+ls*.16+gt+ts*.74}
   numtxt(it.tag,x,tagY,ts,on?TH.a1:TH.ink,'center',eo(ki));lines.forEach((l,j)=>txt(l,lx,b0+j*lh,ls,TH.ink,TH.f.b,'center',eo(ki)))});g.restore()}
// 流程：steps=[{label,sub,at}]，一步一步点亮，当前步高亮
function flowSteps(t,steps,x,y,w,o={}){const n=steps.length,gap=o.gap||56,bw=(w-gap*(n-1))/n,bh=o.h||170,cur=steps.filter(s=>s.at<=t).length-1;steps.forEach((s,i)=>{const bx=x+i*(bw+gap),k=seg(t,s.at,s.at+.45);g.save();
   if(k<=0){g.globalAlpha*=.35;g.strokeStyle=TH.dim;g.lineWidth=3;g.setLineDash([10,10]);rr(bx,y,bw,bh,18);g.stroke();g.restore();return}
   sfx('pop',s.at);const on=i===cur;g.globalAlpha*=cl(k*2.5);g.translate(bx+bw/2,y+bh/2);g.scale(back(k),back(k));g.fillStyle=TH.card;g.strokeStyle=on?TH.a1:TH.dim;g.lineWidth=on?6:3;rr(-bw/2,-bh/2,bw,bh,18);g.fill();g.stroke();
   g.fillStyle=on?TH.a1:TH.dim;g.beginPath();g.arc(-bw/2+46,-bh/2+46,26,0,7);g.fill();numtxt(String(i+1),-bw/2+46,-bh/2+60,38,TH.light?'#fff':'#06101f','center');
   const sz=Math.min(46,46*(bw-110)/Math.max(1,tw(s.label,46,TH.f.t)));txt(s.label,-bw/2+88,-bh/2+62,sz,TH.cardInk,TH.f.t);if(s.sub)wrap(s.sub,bw-56,32).slice(0,2).forEach((l,j)=>txt(l,-bw/2+28,-bh/2+118+j*42,32,TH.light?TH.dim:TH.note,TH.f.b));g.restore();
   if(i<n-1){const ka=seg(t,s.at+.3,s.at+.7);arrow(bx+bw+8,y+bh/2,bx+bw+gap-8,y+bh/2,eo(ka),on?TH.a1:TH.dim,5)}})}

/* ---------- 数字与图表 ---------- */
// 大数字：念到的那一刻（t0）落定，之前 0.9 秒开始滚。o={value,unit,label,note,decimals,prefix}
function bigNumber(t,t0,o,x,y,sz=220){const ts=t0-.9,k=seg(t,ts,ts+.3);if(k<=0)return;sfx('ding',t0);const v=o.value*expo(seg(t,ts,t0)),s=(o.prefix||'')+fmt(t>=t0?o.value:v,o.decimals||0);g.save();g.globalAlpha*=eo(k);
  if(o.label)txt(o.label,x,y-sz*.92,44,TH.ink,TH.f.t,'center');const wn=numw((o.prefix||'')+fmt(o.value,o.decimals||0),sz),wu=o.unit?tw(o.unit,sz*.4,TH.f.t)+18:0;numtxt(s,x-(wn+wu)/2+wn,y,sz,TH.a1,'right');if(o.unit)txt(o.unit,x-(wn+wu)/2+wn+18,y-sz*.06,sz*.4,TH.ink,TH.f.t);
  if(o.note)txt(o.note,x,y+70,34,TH.note,TH.f.s,'center',eo(seg(t,t0+.2,t0+.6)));g.restore()}
// 柱状图：从零基线长出来，一根主角色，其余退灰。data=[{label,value,hi}]；o={title,unit,source,max,decimals}
function barChart(t,t0,data,x,y,w,h,o={}){const k=eo(seg(t,t0,t0+.5));if(k<=0)return;const max=o.max||Math.max(...data.map(d=>d.value))*1.15,n=data.length,bw=Math.min(180,w/n*.56),step=w/n,top=y+(o.title?70:0),ph=h-(o.title?70:0)-70,base=top+ph;g.save();g.globalAlpha*=k;
  if(o.title)txt(o.title,x,y+40,44,TH.ink,TH.f.t);g.strokeStyle=TH.dim;g.lineWidth=1.5;for(let i=1;i<=4;i++){const gy=base-ph*i/4;g.globalAlpha=k*.35;g.beginPath();g.moveTo(x,gy);g.lineTo(x+w,gy);g.stroke()}g.globalAlpha=k;g.strokeStyle=TH.ink;g.lineWidth=3;g.beginPath();g.moveTo(x,base);g.lineTo(x+w,base);g.stroke();
  data.forEach((d,i)=>{const tb=t0+.5+i*.18,kb=expo(seg(t,tb,tb+.9)),bx=x+step*i+(step-bw)/2,bh=ph*d.value/max*kb,col=d.hi?TH.a1:(TH.light?'rgba(0,0,0,.22)':'rgba(255,255,255,.3)');if(kb>0&&d.hi)sfx('rise',tb);g.fillStyle=col;g.fillRect(bx,base-bh,bw,bh);
   if(kb>0)numtxt(fmt(d.value*kb,o.decimals||0)+(o.unit||''),bx+bw/2,base-bh-14,d.hi?50:40,d.hi?TH.a1:TH.ink,'center');txt(d.label,bx+bw/2,base+48,34,TH.ink,TH.f.b,'center')});
  if(o.source)txt('来源：'+o.source,x,base+104,32,TH.note,TH.f.s);g.restore()}
// 折线图：坐标先出，线随时间画出，线头带当前值；marks=[{i,label}] 在线头经过时弹出标注
function lineChart(t,t0,pts,x,y,w,h,o={}){const k=eo(seg(t,t0,t0+.5));if(k<=0)return;const dur=o.dur||3,vs=pts.map(p=>p.v),mn=o.min??Math.min(0,...vs),mx=o.max||Math.max(...vs)*1.12,top=y+(o.title?70:0),ph=h-(o.title?70:0)-70,base=top+ph,X=i=>x+w*i/(pts.length-1),Y=v=>base-ph*(v-mn)/(mx-mn),kp=seg(t,t0+.5,t0+.5+dur)*(pts.length-1);g.save();g.globalAlpha*=k;
  if(o.title)txt(o.title,x,y+40,44,TH.ink,TH.f.t);g.strokeStyle=TH.dim;g.lineWidth=1.5;for(let i=0;i<=4;i++){const gy=base-ph*i/4;g.globalAlpha=k*(i?.35:1);g.beginPath();g.moveTo(x,gy);g.lineTo(x+w,gy);g.stroke();g.globalAlpha=k;numtxt(fmt(mn+(mx-mn)*i/4,o.decimals||0),x+w+14,gy+10,30,TH.dim)}
  pts.forEach((p,i)=>{if(p.label)txt(p.label,X(i),base+46,32,TH.ink,TH.f.b,'center')});
  if(kp>0){g.strokeStyle=TH.a1;g.lineWidth=7;g.lineJoin='round';g.lineCap='round';g.beginPath();const fi=Math.floor(kp),fr=kp-fi;for(let i=0;i<=fi&&i<pts.length;i++){i?g.lineTo(X(i),Y(pts[i].v)):g.moveTo(X(i),Y(pts[i].v))}let hx=X(Math.min(fi,pts.length-1)),hv=pts[Math.min(fi,pts.length-1)].v;if(fi<pts.length-1){hx=lerp(X(fi),X(fi+1),fr);hv=lerp(pts[fi].v,pts[fi+1].v,fr);g.lineTo(hx,Y(hv))}g.stroke();g.fillStyle=TH.a1;g.beginPath();g.arc(hx,Y(hv),12,0,7);g.fill();numtxt(fmt(hv,o.decimals||0)+(o.unit||''),hx>x+w-80?hx-18:hx,Y(hv)-26,46,TH.a1,hx>x+w-80?'right':'center');
   (o.marks||[]).forEach(m=>{const tm=t0+.5+dur*m.i/(pts.length-1),km=eo(seg(t,tm,tm+.4));if(km<=0)return;sfx('pop',tm);g.strokeStyle=TH.ink;g.lineWidth=3;g.beginPath();const up=Y(pts[m.i].v)>top+ph*.45?-1:1,my=Y(pts[m.i].v);g.moveTo(X(m.i),my+up*18);g.lineTo(X(m.i),my+up*(18+60*km));g.stroke();txt(m.label,X(m.i),my+up*(up>0?118:92),34,TH.ink,TH.f.b,'center',km)})}
  if(o.source)txt('来源：'+o.source,x,base+104,32,TH.note,TH.f.s);g.restore()}
// 参数表：rows=[['材料','轴承钢 GCr15'],…] 逐行出现
function specTable(t,t0,rows,x,y,w,o={}){const rh=o.rowH||78,k=eo(seg(t,t0,t0+.4));if(k<=0)return;g.save();g.globalAlpha*=k;g.fillStyle=TH.card;rr(x,y,w,(o.title?84:20)+rows.length*rh+16,16);g.fill();let yy=y+18;if(o.title){txt(o.title,x+32,y+60,42,TH.light?TH.ink:TH.a1,TH.f.t);yy=y+84}
  rows.forEach((r,i)=>{const tr=t0+.3+i*(o.stagger||.3),kr=eo(seg(t,tr,tr+.35));if(kr<=0)return;sfx('tick',tr);g.globalAlpha=k*kr;g.strokeStyle=TH.dim;g.lineWidth=1.5;g.beginPath();g.moveTo(x+28,yy+i*rh);g.lineTo(x+w-28,yy+i*rh);g.stroke();txt(r[0],x+32,yy+i*rh+52,36,TH.light?TH.dim:TH.note,TH.f.b);const vs=Math.min(40,40*(w*.58)/Math.max(1,tw(r[1],40,TH.f.t)));txt(r[1],x+w-32,yy+i*rh+52,vs,TH.cardInk,TH.f.t,'right')});g.restore()}

/* ---------- 对比、标注、引文、章节 ---------- */
// 左右对比：L/R={title,lines:[…],col}；R 可以晚一点出（o.tR）
function compare2(t,t0,L,R,o={}){const x=o.x||140,y=o.y||280,w=o.w||1640,h=o.h||560,gap=90,cw=(w-gap)/2;[[L,t0,x,TH.a3],[R,o.tR||t0+.5,x+cw+gap,TH.a1]].forEach(([c,tc,cx,dc],i)=>{pop(t,tc,q=>{g.translate(cx+cw/2,y+h/2);g.scale(q,q);const col=c.col||dc;card(-cw/2,-h/2,cw,h,col);g.fillStyle=col;rr(-cw/2,-h/2,cw,96,32);g.fill();g.fillRect(-cw/2,-h/2+50,cw,46);txt(c.title,0,-h/2+66,48,TH.light?'#fff':'#06101f','H9','center');
    (c.lines||[]).forEach((l,j)=>{const tl=tc+.5+j*.35;txt('· '+l,-cw/2+44,-h/2+176+j*72,40,TH.cardInk,TH.f.b,'left',eo(seg(t,tl,tl+.35)))});if(c.draw){g.save();c.draw(cw,h);g.restore()}})});
  const kv=eo(seg(t,(o.tR||t0+.5),(o.tR||t0+.5)+.3));if(kv>0){g.save();g.globalAlpha*=kv;g.fillStyle=TH.light?TH.ink:'#fff';g.beginPath();g.arc(x+w/2,y+h/2,44,0,7);g.fill();numtxt('VS',x+w/2,y+h/2+15,40,TH.light?'#fff':'#06101f','center');g.restore()}}
// 引线标注：从部件上的点 (px,py) 拉一条线到 (lx,ly)，写名称和一行说明
function callout(t,t0,px,py,lx,ly,label,sub,col){const k=eo(seg(t,t0,t0+.5));if(k<=0)return;sfx('tick',t0);col=col||TH.a1;const right=lx>=px,ex=lerp(px,lx,k),ey=lerp(py,ly,k);g.save();g.strokeStyle=col;g.fillStyle=col;g.lineWidth=3;g.beginPath();g.arc(px,py,8,0,7);g.fill();g.beginPath();g.moveTo(px,py);g.lineTo(ex,ey);g.stroke();
  if(k>.6){const a=eo(seg(k,.6,1)),w=Math.max(tw(label,46,TH.f.t),sub?tw(sub,38,TH.f.b):0);g.globalAlpha*=a;g.beginPath();g.moveTo(lx,ly);g.lineTo(lx+(right?w+16:-w-16),ly);g.stroke();txt(label,right?lx+8:lx-8,ly-16,46,TH.ink,TH.f.t,right?'left':'right');if(sub)txt(sub,right?lx+8:lx-8,ly+46,38,TH.note,TH.f.b,right?'left':'right')}g.restore()}
// 引文卡：原话 + 出处。出处必填，没有出处的话不要做成引文
function quoteCard(t,t0,text,source,x,y,w,o={}){const sz=o.sz||54,k=eo(seg(t,t0,t0+.5));if(k<=0)return;const L=wrap(text,w-120,sz,TH.f.h),S=wrap(source,w-150,34,TH.f.b),hh=110+L.length*sz*1.5+30+S.length*46;g.save();g.globalAlpha*=k;g.translate(0,(1-k)*24);g.fillStyle=TH.card;rr(x,y,w,hh,14);g.fill();g.fillStyle=TH.a1;g.fillRect(x,y,10,hh);numtxt('“',x+40,y+118,150,TH.a1);L.forEach((l,i)=>txt(l,x+70,y+130+i*sz*1.5,sz,TH.cardInk,TH.f.h));S.forEach((l,i)=>txt((i?'':'—— ')+l,x+w-40,y+hh-34-(S.length-1-i)*46,34,TH.light?TH.dim:TH.note,TH.f.b,'right'));g.restore()}
// 章节卡：整屏盖一下，写第几章和标题（t0 到 t1）
function chapterCard(t,t0,t1,num,title,sub){const a=fadeIO(t,t0,t1,.35);if(a<=0)return;sfx('whoosh',t0);g.save();g.globalAlpha=a;const gr=g.createLinearGradient(0,0,0,H);gr.addColorStop(0,TH.top);gr.addColorStop(1,TH.bot);g.fillStyle=gr;g.fillRect(0,0,W,H);g.fillStyle=TH.a1;g.fillRect(W/2-60,430,120,10);numtxt(String(num).padStart(2,'0'),W/2,390,150,TH.a1,'center');rise(t,t0+.15,title,W/2,580,96,TH.ink,TH.f.t,'center');if(sub)rise(t,t0+.35,sub,W/2,660,42,TH.dim,TH.f.b,'center');g.restore()}

/* ---------- 视频片段（素材层） ---------- */
// 片段先由 build.py clips 切好并拆成逐帧图片；这里按时间取帧，所以和其它画面一样是确定的、可任意跳帧
let PENDING=[];const CLIPS={},FC=new Map();
function clipImg(id,n){const key=id+'/'+n;let e=FC.get(key);if(e){FC.delete(key);FC.set(key,e);return e.ok?e.im:null}const im=new Image();e={im,ok:false};FC.set(key,e);PENDING.push(new Promise(r=>{im.onload=()=>{e.ok=true;r()};im.onerror=()=>{console.error('片段帧加载失败',key);r()}}));im.src=`/project/clips/${id}/f${String(n).padStart(5,'0')}.jpg`;if(FC.size>60)FC.delete(FC.keys().next().value);return null}
// 原声登记给 build.py mix：'clip:id|from[|t1=..|fi=..|fo=..]@t0' → 增益。没有 t1/淡入淡出时和旧写法一字不差
function clipKey(id,from,t0,s){let k='clip:'+id+'|'+from;if(s.t1!=null)k+='|t1='+(+s.t1).toFixed(2);if(s.fadeIn>0)k+='|fi='+(+s.fadeIn).toFixed(2);if(s.fadeOut>0)k+='|fo='+(+s.fadeOut).toFixed(2);return k+'@'+t0.toFixed(2)}
// 片段在框里怎么放：mode cover 裁满 / contain 留边；z 放大倍数，(cx,cy) 取景中心（0–1）。放大后不露边
function clipPlace(iw,ih,x,y,w,h,mode,z,cx,cy){const s=(mode==='cover'?Math.max(w/iw,h/ih):Math.min(w/iw,h/ih))*z,dw=iw*s,dh=ih*s;let dx=x+w/2-cx*dw,dy=y+h/2-cy*dh;dx=dw>=w?cl(dx,x+w-dw,x):x+(w-dw)/2;dy=dh>=h?cl(dy,y+h-dh,y):y+(h-dh)/2;return [dx,dy,dw,dh]}
// 模糊垫底：同一帧缩到几十像素的离屏小画布上，小半径模糊一次，再放大铺满（不在大画面上做大半径 filter）
let BLUR=null;
function clipBlurBg(im,x,y,w,h){if(!BLUR)BLUR=[document.createElement('canvas'),document.createElement('canvas')];const [A,B]=BLUR,bw=64,bh=Math.max(8,Math.round(64*h/w));
  if(A.width!==bw+8||A.height!==bh+8){A.width=bw+8;A.height=bh+8}if(B.width!==bw||B.height!==bh){B.width=bw;B.height=bh}const a=A.getContext('2d'),b=B.getContext('2d'),s=Math.max(A.width/im.width,A.height/im.height);
  a.imageSmoothingQuality='high';a.drawImage(im,(A.width-im.width*s)/2,(A.height-im.height*s)/2,im.width*s,im.height*s);b.clearRect(0,0,bw,bh);b.filter='blur(2.5px)';b.drawImage(A,-4,-4);b.filter='none';
  g.save();g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';g.drawImage(B,x,y,w,h);g.fillStyle='rgba(0,0,0,.3)';g.fillRect(x,y,w,h);g.restore()}
// clip(素材id, t, 开始时刻, x,y,w,h, o)
//   o.from 从片段第几秒起；o.speed 变速（原声不变速）；o.r 圆角；o.frame:false 不画边框阴影；o.col 边框色；o.credit:false 不显示署名
//   o.fit 'cover' 裁满（缺省）/ 'contain' 留黑边 / 'blur' 同一帧模糊放大垫底、原画居中（竖拍放进横框、横拍放进竖框）
//   o.kb={z0,z1,x0,y0,x1,y1} 推拉摇：在片段播放时间内（t0 到 t1，没写 t1 就到片段放完）从取景 (z0,x0,y0) 平滑到 (z1,x1,y1)；x,y 是取景中心 0–1
//   o.t1 片段在全片里的结束时刻：到点就不画（没写就放完停在最后一帧）；o.fade=[入,出] 秒数，出要配 t1（没写 t1 就在片段放完时淡完）
//   o.sound 原声：数字是音量 0–1，截止和淡入淡出跟画面（t1、fade）走；也可写 {gain,t1,fadeIn,fadeOut} 单独定
// 署名默认画在右下角，来自素材台账的 credit；o.creditLift 往上挪的像素（全屏时避开字幕带）。
function clip(id,t,t0,x,y,w,h,o={}){const c=CLIPS[id];if(!c){console.error('素材台账里没有这个片段，或还没运行 build.py clips：',id);return}if(t<t0)return;const from=o.from||0,sp=o.speed||1,fd=o.fade||[0,0],te=o.t1!=null?o.t1:fd[1]>0?t0+(c.dur-from)/sp:null;
  if(REC){REC.used[id]=1;const so=o.sound,ob=so!==null&&typeof so==='object';REC.ev[clipKey(id,from,t0,ob?{t1:so.t1??te,fadeIn:so.fadeIn??fd[0],fadeOut:so.fadeOut??fd[1]}:{t1:te,fadeIn:fd[0],fadeOut:fd[1]})]=ob?(so.gain??1):(so||0)}
  if(te!=null&&t>=te)return;const al=(fd[0]>0?eio(seg(t,t0,t0+fd[0])):1)*(te!=null&&fd[1]>0?1-eio(seg(t,te-fd[1],te)):1);if(al<=0)return;
  const n=cl(Math.floor(((t-t0)*sp+from)*c.fps)+1,1,c.n),r=o.r??18,fit=o.fit||'cover';const im=clipImg(id,n),ga=g.globalAlpha;g.save();g.globalAlpha*=al;
  g.save();if(o.frame!==false){g.shadowColor='rgba(0,0,0,.5)';g.shadowBlur=36;g.shadowOffsetY=12}g.fillStyle='#000';rr(x,y,w,h,r);g.fill();g.restore();
  if(im){g.save();rr(x,y,w,h,r);g.clip();if(fit==='cover'&&!o.kb){const s=Math.max(w/im.width,h/im.height),dw=im.width*s,dh=im.height*s;g.drawImage(im,x+(w-dw)/2,y+(h-dh)/2,dw,dh)}
   else{if(fit==='blur')clipBlurBg(im,x,y,w,h);const kb=o.kb||{},k=eio(seg(t,t0,te!=null?te:t0+(c.dur-from)/sp)),z0=kb.z0??1,x0=kb.x0??.5,y0=kb.y0??.5;
    g.drawImage(im,...clipPlace(im.width,im.height,x,y,w,h,fit==='cover'?'cover':'contain',lerp(z0,kb.z1??z0,k),lerp(x0,kb.x1??x0,k),lerp(y0,kb.y1??y0,k)))}g.restore()}g.restore();
  if(o.frame!==false){g.globalAlpha=ga*al;g.strokeStyle=o.col||TH.a1;g.lineWidth=4;rr(x,y,w,h,r);g.stroke();g.globalAlpha=ga}const a=ASSETS.find(a=>a.id===id);if(o.credit!==false&&a&&a.credit){const s='影像：'+a.credit,cw=tw(s,32,TH.f.s)+28,yl=o.creditLift||0;g.save();g.globalAlpha*=al;g.save();g.fillStyle='rgba(0,0,0,.55)';rr(x+w-cw-14,y+h-58-yl,cw,44,8);g.fill();g.restore();txt(s,x+w-28,y+h-26-yl,32,'#fff',TH.f.s,'right');g.restore()}}
// 全屏片段：铺满画面、无边框、无圆角；署名抬到字幕带上方。t1 可以写 null（放完停在最后一帧）
function clipFull(id,t,t0,t1,o={}){clip(id,t,t0,0,0,W,H,{frame:false,r:0,creditLift:100,...o,t1:t1??o.t1})}
// 只登记原声、不画画面：原声比画面先进（J-cut）或画面切走后原声还在（L-cut）。o={from,gain,t1,fadeIn,fadeOut}
function clipSound(id,t,t0,o={}){if(!CLIPS[id]){console.error('素材台账里没有这个片段，或还没运行 build.py clips：',id);return}if(!REC)return;REC.used[id]=1;REC.ev[clipKey(id,o.from||0,t0,o)]=o.gain??1}

/* ---------- 转场 ---------- */
// drawA/drawB 是两个画法函数（参数是转场进度 0–1）。tCut 是剪辑点，转场占 tCut-d/2 到 tCut+d/2；之前只画 A，之后只画 B。都是 t 的确定函数，可任意跳帧
// 写在 scn() 里面，不要把 scn() 写进 drawA/drawB（scn 会重设透明度）。
// 交叉溶解：B 渐显盖在 A 上；A 画满全屏（片段、背景）时就是标准叠化，A 只是局部元素时最后四分之一 A 也淡掉，不会突然消失
function xfade(t,tCut,d,drawA,drawB){const a=tCut-d/2,b=tCut+d/2;if(t<a){drawA(0);return}if(t>=b){drawB(1);return}const k=eio(seg(t,a,b));g.save();g.globalAlpha*=cl((1-k)*4);drawA(k);g.restore();g.save();g.globalAlpha*=k;drawB(k);g.restore()}
// 经过一种颜色转场（黑场、白闪、主题色）：A 渐隐到 col，再从 col 渐显出 B。rect=[x,y,w,h] 只在一块区域里做，缺省全屏
function dipTo(t,tCut,d,col,drawA,drawB,rect){const a=tCut-d/2,b=tCut+d/2,pre=t<tCut;pre?drawA(seg(t,a,tCut)):drawB(seg(t,tCut,b));const k=pre?eio(seg(t,a,tCut)):1-eio(seg(t,tCut,b));if(k<=0)return;const [rx,ry,rw,rh]=rect||[0,0,W,H];g.save();g.globalAlpha*=k;g.fillStyle=col||'#000';g.fillRect(rx,ry,rw,rh);g.restore()}
// 擦切：一条直边扫过，边后面是 B。dir 是边移动的方向：'right'（缺省，从左往右擦）'left' 'down' 'up'。rect 同上
function wipe(t,tCut,d,dir,drawA,drawB,rect){const a=tCut-d/2,b=tCut+d/2;if(t<a){drawA(0);return}if(t>=b){drawB(1);return}const k=eio(seg(t,a,b)),[rx,ry,rw,rh]=rect||[0,0,W,H];let B;
  if(dir==='left')B=[rx+rw*(1-k),ry,rw*k,rh];else if(dir==='down')B=[rx,ry,rw,rh*k];else if(dir==='up')B=[rx,ry+rh*(1-k),rw,rh*k];else B=[rx,ry,rw*k,rh];
  g.save();g.beginPath();g.rect(rx,ry,rw,rh);g.rect(...B);g.clip('evenodd');drawA(k);g.restore();g.save();g.beginPath();g.rect(...B);g.clip();drawB(k);g.restore()}
// 片尾署名：从素材台账自动列出需要署名的素材
function creditLines(){const seen=new Set(),out=[];ASSETS.forEach(a=>{if(!a.credit)return;const s=(a.type==='video'?'影像：':'图片：')+a.credit+(a.license_name?'（'+a.license_name+'）':'');if(!seen.has(s)){seen.add(s);out.push(s)}});return out}
