/* 组件包 · 古代人物库 —— 本项目自己实现，出自《师饶的一年》之后的整理
   一个参数化的人：朝代 × 身份 × 性别 × 年龄 × 动作 × 表情 × 道具，木刻线描 + 平涂，正面（walk、point 可朝左右）。
   画的都是“示意人物”：服饰取各朝常见的样子做简化，不是考据复原，画面上要标“示意人物”。
   用法（t 全片时间；坐标原点在两脚中间的地面，s=1 时成人约 400 像素高）：
   person(t, {x, y, s, preset:'han.clerk', pose, t0, face, facing, props, age, colors:{robe,…}, hat, hair, robe, beard})
       preset 见 PRESETS（下面的表），其余字段逐项覆盖；pose：stand 站 / hu 执笏 / bow 作揖 / walk 走 / point 指 / kneel 跪坐 / write 跪坐书写 /
       sit 坐凳 / carry 挑担 / lie 卧病；t0 是这个动作开始的时刻（作揖、指向从这时起做）；face：calm 平静 / sad 愁 / smile 笑 / tired 倦 / closed 闭眼；
       facing：1 朝右、-1 朝左（walk、point 用）；props：['slip','brush','scroll','staff','sword','fan','whisk','beads','basket','book','bowl','spear'] 挑几样拿在手里
   lineup(t, list, {x, y, w, s})  一排人：list=[{preset, pose, …}]，按宽度等距排开（样张、群像用）
   on(ctx, fn)                     临时把画笔换成 ctx（封面 art 里画人）
   PRESETS                         预设表：{名字: {era, role, sex, …, label}}，label 是中文名（做目录、样张用）
   ERAS                            朝代：han 汉、wei 北魏（南北朝）、tang 唐、song 宋、ming 明、qing 清，另有 any（不分朝代的平民、僧道、孩童、老人） */
window.PACK=window.PACK||{};window.PACK_INIT=window.PACK_INIT||[];
PACK.renwu=(function(){
  let G=null;const C=()=>G||g;
  function on(ctx,fn){const o=G;G=ctx;try{fn()}finally{G=o}}
  const LINE='#211e19',SKIN='#ead7b0',SKIN2='#dfc59a',WHITE='#efe6cf',HAIR='#1c1a17',GREY='#8f8a80';
  const sg=(t,a,d)=>Math.max(0,Math.min(1,(t-a)/d)),L=(a,b,k)=>a+(b-a)*k,E=x=>1-Math.pow(1-Math.max(0,Math.min(1,x)),3);

  /* ---------- 预设 ---------- */
  const ERAS={han:'汉',wei:'北魏',tang:'唐',song:'宋',ming:'明',qing:'清',any:'通用'};
  const P=(era,role,sex,o,label)=>({era,role,sex,...o,label});
  const PRESETS={
    'han.official':P('han','official','m',{hat:'jinxian',hair:'topknot',robe:'shenyi',sleeve:'wide',beard:'long',colors:{robe:'#2f2a26',inner:WHITE,belt:'#a8322b',trim:'#a8322b'},props:['hu']},'汉代官员'),
    'han.clerk':P('han','clerk','m',{hat:'jinxian',hair:'topknot',robe:'shenyi',sleeve:'wide',beard:'none',colors:{robe:'#2f3d5c',inner:WHITE,belt:'#a8322b',trim:'#26324c'},props:['slip']},'汉代小吏'),
    'han.scholar':P('han','scholar','m',{hat:'jin',hair:'topknot',robe:'shenyi',sleeve:'wide',beard:'short',colors:{robe:'#d9ccad',inner:WHITE,belt:'#6b4f2a',trim:'#6b4f2a'},props:['scroll']},'汉代儒生'),
    'han.woman':P('han','woman','f',{hair:'lowbun',robe:'qujv',sleeve:'wide',colors:{robe:'#8c3a32',inner:WHITE,belt:'#2f2a26',trim:'#2f2a26'}},'汉代女子（曲裾）'),
    'han.soldier':P('han','soldier','m',{hat:'helmet',hair:'topknot',robe:'armor',sleeve:'narrow',beard:'short',colors:{robe:'#7a3a2c',inner:'#c9b38a',belt:'#3a3128',trim:'#3a3128'},props:['spear']},'汉代兵卒'),
    'wei.official':P('wei','official','m',{hat:'longguan',hair:'topknot',robe:'shenyi',sleeve:'wide',beard:'short',colors:{robe:'#3d4a3a',inner:WHITE,belt:'#a8322b',trim:'#a8322b'},props:['hu']},'北魏官员（笼冠）'),
    'wei.palace':P('wei','palace','f',{hair:'highbun',robe:'ruqun',sleeve:'wide',colors:{robe:'#b85a3c',inner:'#e8d8b0',skirt:'#3d4a6a',belt:'#2f2a26',trim:'#e0b84a',pibo:'#d9c48e'}},'北魏宫人'),
    'wei.nun':P('wei','nun','f',{hair:'bald',robe:'kasaya',sleeve:'wide',colors:{robe:'#7d776c',inner:'#a59f92',kasaya:'#8a4a2c',trim:'#5b3420'},props:['beads']},'比丘尼'),
    'tang.official':P('tang','official','m',{hat:'futou_tang',hair:'topknot',robe:'yuanling',sleeve:'narrow',beard:'short',colors:{robe:'#7a2f2b',inner:WHITE,belt:'#1c1a17',trim:'#1c1a17'},props:['hu']},'唐代官员（圆领袍）'),
    'tang.lady':P('tang','lady','f',{hair:'highbun',robe:'ruqun',sleeve:'wide',colors:{robe:'#c9873a',inner:'#efe0c0',skirt:'#9c2f3a',belt:'#2f2a26',trim:'#2f5a4a',pibo:'#e8d8a8'},props:['fan']},'唐代仕女（襦裙披帛）'),
    'tang.poet':P('tang','scholar','m',{hat:'futou_tang',hair:'topknot',robe:'yuanling',sleeve:'narrow',beard:'long',colors:{robe:'#d8ccb0',inner:WHITE,belt:'#1c1a17',trim:'#1c1a17'},props:['scroll']},'唐代文士'),
    'song.official':P('song','official','m',{hat:'futou_song',hair:'topknot',robe:'yuanling',sleeve:'wide',beard:'long',colors:{robe:'#2f5a4a',inner:WHITE,belt:'#c9a24a',trim:'#1c1a17'},props:['hu']},'宋代官员（直脚幞头）'),
    'song.scholar':P('song','scholar','m',{hat:'dongpo',hair:'topknot',robe:'daopao',sleeve:'wide',beard:'long',colors:{robe:'#e2d8bf',inner:WHITE,belt:'#2f2a26',trim:'#2f2a26'},props:['book']},'宋代文人（高巾道袍）'),
    'song.woman':P('song','woman','f',{hair:'lowbun',robe:'beizi',sleeve:'narrow',colors:{robe:'#9fb0a2',inner:WHITE,skirt:'#e2d8bf',belt:'#2f2a26',trim:'#6b4f2a'}},'宋代女子（褙子）'),
    'ming.official':P('ming','official','m',{hat:'wusha',hair:'topknot',robe:'yuanling',sleeve:'wide',beard:'long',buzi:true,colors:{robe:'#8c2f2a',inner:WHITE,belt:'#c9a24a',trim:'#1c1a17',buzi:'#c9a24a'},props:['hu']},'明代官员（乌纱补服）'),
    'ming.scholar':P('ming','scholar','m',{hat:'fangjin',hair:'topknot',robe:'daopao',sleeve:'wide',beard:'short',colors:{robe:'#3d5a7a',inner:WHITE,belt:'#1c1a17',trim:WHITE},props:['fan']},'明代士人（方巾道袍）'),
    'ming.woman':P('ming','woman','f',{hair:'lowbun',robe:'aoqun',sleeve:'wide',colors:{robe:'#b04a3c',inner:WHITE,skirt:'#2f4a6a',belt:'#2f2a26',trim:'#e0b84a'}},'明代女子（袄裙）'),
    'qing.official':P('qing','official','m',{hat:'qingguan',hair:'queue',robe:'qingbuzi',sleeve:'horsehoof',beard:'short',beads:true,colors:{robe:'#2f4a6a',outer:'#1f1d1b',inner:WHITE,belt:'#c9a24a',trim:'#1f1d1b',buzi:'#c9a24a'}},'清代官员（补褂顶戴）'),
    'qing.commoner':P('qing','commoner','m',{hat:'guapi',hair:'queue',robe:'changshan',sleeve:'narrow',beard:'none',colors:{robe:'#5a6b7a',outer:'#2f2a26',inner:WHITE,belt:'#2f2a26',trim:'#2f2a26'}},'清代百姓（长衫马褂）'),
    'qing.woman':P('qing','woman','f',{hair:'liangbatou',robe:'qipao',sleeve:'narrow',colors:{robe:'#7a4a8c',inner:WHITE,belt:'#2f2a26',trim:'#e0b84a'}},'清代旗装女子'),
    'farmer':P('any','farmer','m',{hat:'douli',hair:'topknot',robe:'duanhe',sleeve:'narrow',beard:'short',colors:{robe:'#9a8a6a',inner:'#c9b38a',belt:'#5b4630',trim:'#5b4630'},props:['basket']},'农夫（短褐斗笠）'),
    'peasant_woman':P('any','farmer','f',{hat:'kerchief',hair:'lowbun',robe:'duanhe',sleeve:'narrow',colors:{robe:'#6a7a8a',inner:'#c9b38a',belt:'#5b4630',trim:'#5b4630',kerchief:'#3d5a7a'}},'村妇（头巾短褐）'),
    'merchant':P('any','merchant','m',{hat:'jin',hair:'topknot',robe:'daopao',sleeve:'narrow',beard:'short',colors:{robe:'#8a6a3a',inner:WHITE,belt:'#2f2a26',trim:'#2f2a26'},props:['bowl']},'商贩'),
    'monk':P('any','monk','m',{hair:'bald',robe:'kasaya',sleeve:'wide',colors:{robe:'#7d776c',inner:'#a59f92',kasaya:'#a8482c',trim:'#6b2c1a'},props:['beads']},'僧人'),
    'daoist':P('any','daoist','m',{hat:'daoguan',hair:'topknot',robe:'daopao',sleeve:'wide',beard:'long',colors:{robe:'#3d5a7a',inner:WHITE,belt:'#2f2a26',trim:'#1c1a17'},props:['whisk']},'道士'),
    'general':P('any','general','m',{hat:'helmet',hair:'topknot',robe:'armor',sleeve:'narrow',beard:'long',cape:true,colors:{robe:'#8a6a3a',inner:'#7a2f2b',belt:'#3a3128',trim:'#3a3128',cape:'#9c2f2a'},props:['sword']},'武将（甲胄）'),
    'child':P('any','child','m',{hair:'zongjiao',robe:'duanhe',sleeve:'narrow',beard:'none',child:true,colors:{robe:'#c9873a',inner:WHITE,belt:'#a8322b',trim:'#a8322b'}},'孩童（总角）'),
    'elder':P('any','elder','m',{hat:'jin',hair:'topknot',robe:'daopao',sleeve:'wide',beard:'white',elder:true,colors:{robe:'#8f8a80',inner:WHITE,belt:'#2f2a26',trim:'#2f2a26'},props:['staff']},'老翁'),
    'old_woman':P('any','elder','f',{hat:'kerchief',hair:'lowbun',robe:'aoqun',sleeve:'narrow',elder:true,colors:{robe:'#6b5a4a',inner:WHITE,skirt:'#3a3128',belt:'#2f2a26',trim:'#2f2a26',kerchief:'#2f2a26'},props:['staff']},'老妇'),
    'emperor':P('any','emperor','m',{hat:'mianliu',hair:'topknot',robe:'shenyi',sleeve:'wide',beard:'long',colors:{robe:'#1f1d1b',inner:'#a8322b',skirt:'#8c2f2a',belt:'#c9a24a',trim:'#a8322b'}},'帝王（冕服，示意）'),
    'eunuch':P('ming','eunuch','m',{hat:'ruanjin',hair:'topknot',robe:'yuanling',sleeve:'narrow',beard:'none',colors:{robe:'#7a4a3a',inner:WHITE,belt:'#1c1a17',trim:'#1c1a17'}},'宦官'),
    'prisoner':P('any','prisoner','m',{hair:'loose',robe:'duanhe',sleeve:'narrow',beard:'short',face:'tired',colors:{robe:'#8f8a80',inner:'#b8b0a0',belt:'#5b4630',trim:'#5b4630'},props:['jia']},'戴枷的犯人'),
    'servant':P('any','servant','m',{hat:'kerchief',hair:'topknot',robe:'duanhe',sleeve:'narrow',beard:'none',colors:{robe:'#5a6b7a',inner:'#c9b38a',belt:'#2f2a26',trim:'#2f2a26',kerchief:'#2f2a26'},props:['bundle']},'仆从（背包袱）'),
  };
  function resolve(o){const base=PRESETS[o.preset||'han.clerk']||PRESETS['han.clerk'];const r={...base,...o};r.colors={...base.colors,...(o.colors||{})};r.props=o.props||base.props||[];return r}

  /* ---------- 小工具 ---------- */
  function path(pts,close=true){const c=C();c.beginPath();pts.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));if(close)c.closePath()}
  function fs(fill,lw=3){const c=C();if(fill){c.fillStyle=fill;c.fill()}if(lw){c.lineWidth=lw;c.strokeStyle=LINE;c.lineJoin='round';c.stroke()}}
  function hatch(alpha=.11,gap=10,ang=1){const c=C();c.save();c.clip();c.strokeStyle=`rgba(255,255,255,${alpha})`;c.lineWidth=2;for(let i=-500;i<500;i+=gap){c.beginPath();c.moveTo(i,-520);c.lineTo(i+ang*420,20);c.stroke()}c.restore()}
  function shade(alpha=.14){const c=C();c.save();c.clip();const gr=c.createLinearGradient(-90,0,90,0);gr.addColorStop(0,`rgba(0,0,0,${alpha})`);gr.addColorStop(.45,'rgba(0,0,0,0)');gr.addColorStop(1,`rgba(0,0,0,${alpha*1.4})`);c.fillStyle=gr;c.fillRect(-200,-600,400,620);c.restore()}
  function line(pts,lw=2.5,col=LINE){const c=C();c.beginPath();pts.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));c.lineWidth=lw;c.strokeStyle=col;c.lineCap='round';c.stroke()}
  function quad(a,b,cp,lw=2.5,col=LINE){const c=C();c.beginPath();c.moveTo(a[0],a[1]);c.quadraticCurveTo(cp[0],cp[1],b[0],b[1]);c.lineWidth=lw;c.strokeStyle=col;c.lineCap='round';c.stroke()}
  function circ(x,y,r,fill,lw=2.5){const c=C();c.beginPath();c.arc(x,y,r,0,7);fs(fill,lw)}
  function ell(x,y,rx,ry,fill,lw=2.5,rot=0){const c=C();c.beginPath();c.ellipse(x,y,rx,ry,rot,0,7);fs(fill,lw)}

  /* ---------- 骨架：按动作给出各处位置 ---------- */
  function skeleton(R,pose,t,t0){const k=E(sg(t,t0,.8)),w=pose==='walk'?Math.sin((t-t0)*5.5):0;
    let drop=0;if(pose==='kneel'||pose==='write')drop=118;else if(pose==='sit')drop=84;
    const S={drop,head:[0,-348+drop],neck:-312+drop,sh:-296+drop,shx:R.sex==='f'?36:42,waist:-200+drop,hem:0,hemw:R.sex==='f'?78:72,walk:w,tilt:0,
      hands:[[-14,-196+drop],[14,-196+drop]],elb:[[-58,-238+drop],[58,-238+drop]]};
    if(R.robe==='ruqun')S.waist=-262+drop;
    if(['duanhe','armor'].includes(R.robe))S.hem=-118;
    if(pose==='hu'||R.props.includes('hu')&&pose==='stand'){S.hands=[[-10,-238+drop],[10,-238+drop]];S.elb=[[-56,-226+drop],[56,-226+drop]]}
    if(pose==='bow'){const b=Math.sin(k*Math.PI/2);S.hands=[[-12,L(-200,-276,b)+drop],[12,L(-200,-276,b)+drop]];S.elb=[[-60,-246+drop],[60,-246+drop]];S.tilt=.08*b}
    if(pose==='walk'){S.hands=[[-48+w*14,-186],[48+w*14,-186]];S.elb=[[-56+w*6,-238],[56+w*6,-238]]}
    if(pose==='point'){S.hands=[[-14,-196],[L(14,118,k),L(-196,-292,k)]];S.elb=[[-58,-238],[L(58,80,k),L(-238,-282,k)]]}
    if(pose==='carry'){S.hands=[[-70,-318],[70,-318]];S.elb=[[-74,-268],[74,-268]]}
    if(pose==='write'){S.hands=[[-30,-150+drop*0],[74+Math.sin(t*5)*8,-150+Math.cos(t*7)*3]];S.elb=[[-62,-206+drop*.3],[66,-198+drop*.3]]}
    if(R.props.includes('staff')&&pose==='stand'){S.hands=[[-14,-196+drop],[70,-210+drop]];S.elb=[[-58,-238+drop],[72,-246+drop]]}
    if(R.props.includes('spear')&&pose==='stand'){S.hands=[[-14,-196],[66,-230]];S.elb=[[-58,-238],[70,-260]]}
    S.clasp=['stand','hu','bow','kneel','sit'].includes(pose)&&!(R.props.includes('staff')||R.props.includes('spear')||R.props.includes('jia'));
    if(pose==='write'){S.claspL=true;S.hands[0]=[-16,-138];}
    if(R.props.includes('jia')){S.hands=[[-30,S.sh+30],[30,S.sh+30]];S.elb=[[-56,S.sh+80],[56,S.sh+80]]}
    if(R.elder){S.head[1]+=10;S.neck+=10;S.sh+=8;S.tilt+=.05}
    return S}

  /* ---------- 下身：裙、袍下摆、腿和鞋 ---------- */
  function shoes(S,pose,col='#1c1a17'){if(pose==='kneel'||pose==='write'){return}const w=S.walk*14;const c=C();
    c.fillStyle=col;c.beginPath();c.roundRect(-38+w,-10,30,12,4);c.fill();c.beginPath();c.roundRect(8-w,-10,30,12,4);c.fill()}
  function lowerBody(R,S,pose){const c=C(),col=R.colors,w=S.walk*12;
    if(pose==='kneel'||pose==='write'){const top=S.waist,wd=S.hemw+28;path([[-S.shx-6,top],[S.shx+6,top],[wd,-24],[wd+10,0],[-wd-10,0],[-wd,-24]]);fs(col.skirt||col.robe);shade(.16);hatch(.08);
      line([[-wd+20,-16],[wd-20,-16]],2,'rgba(33,30,25,.45)');return}
    if(pose==='sit'){const top=S.waist,kn=-112;c.fillStyle='#6b4f2a';c.fillRect(-64,-108,128,14);c.fillRect(-58,-94,10,94);c.fillRect(48,-94,10,94);
      path([[-S.shx-4,top],[S.shx+4,top],[S.hemw+4,kn],[S.hemw-6,-30],[-S.hemw+6,-30],[-S.hemw-4,kn]]);fs(col.skirt||col.robe);shade();hatch(.08);
      c.fillStyle='#3a3128';c.fillRect(-36,-30,22,24);c.fillRect(14,-30,22,24);shoes({...S,walk:0},'stand');return}
    if(['duanhe','armor'].includes(R.robe)){c.fillStyle=R.robe==='armor'?'#3a3128':(col.inner||'#c9b38a');
      path([[-34+w,S.hem],[-4,S.hem],[-8+w*.6,-10],[-36+w,-10]]);fs(c.fillStyle);path([[4,S.hem],[34-w,S.hem],[36-w,-10],[8-w*.6,-10]]);fs(c.fillStyle);
      line([[-34+w,-34],[-6+w*.6,-34]],5,'#5b4630');line([[6-w*.6,-34],[34-w,-34]],5,'#5b4630');shoes(S,pose,R.robe==='armor'?'#2f2a26':'#5b4630');return}
    shoes(S,pose);
    const top=S.waist,hw=S.hemw*(R.elder?.94:1),sk=col.skirt&&['ruqun','beizi','aoqun','shenyi'].includes(R.robe)?col.skirt:col.robe;
    path([[-S.shx+2,top],[S.shx-2,top],[hw+w,-8],[-hw+w,-8]]);fs(sk);shade();hatch(R.sex==='f'?.06:.1,R.sex==='f'?14:10);
    if(R.robe==='aoqun'){for(let i=-3;i<=3;i++)line([[i*12,top+40],[i*18+w,-12]],1.6,'rgba(33,30,25,.35)')}
    if(R.robe==='ruqun'){for(let i=-2;i<=2;i++)line([[i*14,top+30],[i*26+w,-12]],1.6,'rgba(33,30,25,.3)')}
    if(R.robe==='qujv'){path([[-S.shx+2,top+50],[S.shx-2,top+10],[S.shx+12,top+60],[-S.shx-8,top+110]]);fs(col.trim,2);path([[-hw+10,-60],[hw-10,-90],[hw-4,-70],[-hw+6,-40]]);fs(col.trim,2)}
    if(R.robe==='yuanling'||R.robe==='qingbuzi'||R.robe==='changshan'||R.robe==='qipao'){line([[hw*.55+w,-10],[S.shx*.7,top+60]],2,'rgba(33,30,25,.4)')}
    if(R.robe==='qipao'){line([[-hw+6+w,-10],[hw-6+w,-10]],8,col.trim)}
  }

  /* ---------- 上身 ---------- */
  function torso(R,S){const col=R.colors,{sh,shx,waist}=S;
    const body=[[-shx,sh],[shx,sh],[shx+10,waist],[-shx-10,waist]];
    const tc=R.robe==='ruqun'?col.robe:R.robe==='kasaya'?col.robe:col.robe;
    path(body);fs(tc);shade(.12);hatch(.1);
    if(R.robe==='ruqun'){path([[-shx-8,waist-10],[shx+8,waist-10],[shx+10,waist+14],[-shx-10,waist+14]]);fs(col.skirt);line([[-shx-8,waist+2],[shx+8,waist+2]],3,col.trim)}
    if(R.robe==='beizi'){path([[-14,sh+6],[14,sh+6],[18,0-8],[-18,0-8]]);fs(col.inner,0);line([[-14,sh+6],[-18,-10]],8,col.trim);line([[14,sh+6],[18,-10]],8,col.trim)}
    if(R.robe==='qingbuzi'||R.robe==='changshan'){const ol=R.robe==='qingbuzi'?-80:waist+40;path([[-shx-2,sh],[shx+2,sh],[shx+16,ol],[-shx-16,ol]]);fs(col.outer);shade(.1);
      if(R.robe==='changshan'){for(let i=0;i<4;i++)circ(0,sh+22+i*22,3,'#c9a24a',1)}}
    if(R.robe==='armor'){const c=C();c.save();path([[-shx-4,sh],[shx+4,sh],[shx+14,waist+30],[-shx-14,waist+30]]);c.clip();c.fillStyle=col.robe;c.fillRect(-90,sh-4,180,waist-sh+40);
      c.strokeStyle='rgba(30,26,22,.55)';c.lineWidth=1.6;for(let y=sh+6;y<waist+30;y+=12)for(let x=-shx-14+(Math.round(y)%24?6:0);x<shx+14;x+=12){c.beginPath();c.arc(x,y,6,0,Math.PI);c.stroke()}c.restore();path([[-shx-4,sh],[shx+4,sh],[shx+14,waist+30],[-shx-14,waist+30]]);fs(null);
      path([[-shx-14,waist+30],[shx+14,waist+30],[shx+20,-118],[-shx-20,-118]]);fs(col.robe);const cc=C();cc.save();cc.clip();cc.strokeStyle='rgba(30,26,22,.5)';cc.lineWidth=1.6;for(let y=waist+36;y<-118;y+=12)for(let x=-shx-20;x<shx+20;x+=12){cc.beginPath();cc.arc(x,y,6,0,Math.PI);cc.stroke()}cc.restore();
      ell(-shx-6,sh+16,24,18,col.belt);ell(shx+6,sh+16,24,18,col.belt);circ(0,sh+46,12,'#c9a24a',2)}
    // 领
    if(R.robe==='yuanling'||R.robe==='qingbuzi'||R.robe==='qipao'){const c=C();c.beginPath();c.arc(0,sh+2,20,0.1,Math.PI-.1);c.lineWidth=7;c.strokeStyle=R.robe==='qingbuzi'?'#1f1d1b':col.trim||LINE;c.stroke();
      if(R.robe==='qipao'){line([[0,sh+20],[shx*.7,sh+48]],5,col.trim)}}
    else if(R.robe==='kasaya'){line([[-16,sh],[16,waist+40]],5,col.inner)}
    else if(!['armor'].includes(R.robe)){line([[-22,sh],[16,sh+70]],8,col.inner);line([[22,sh],[2,sh+36]],8,col.inner);line([[-22,sh],[16,sh+70]],2,LINE);line([[22,sh],[2,sh+36]],2,LINE)}
    if(R.robe==='kasaya'){const c=C(),kb=Math.min(waist+110,-8),km=Math.min(waist+70,-30);path([[-shx-2,sh+4],[-shx+20,sh-4],[shx+12,km],[shx-8,kb],[-shx-6,waist+20]]);fs(col.kasaya);c.save();c.clip();c.strokeStyle=col.trim;c.lineWidth=3;for(let i=-4;i<8;i++){c.beginPath();c.moveTo(-90+i*30,sh-20);c.lineTo(-30+i*30,waist+140);c.stroke()}for(let y=sh;y<waist+120;y+=34){c.beginPath();c.moveTo(-90,y);c.lineTo(90,y+40);c.stroke()}c.restore();path([[-shx-2,sh+4],[-shx+20,sh-4],[shx+12,km],[shx-8,kb],[-shx-6,waist+20]]);fs(null)}
    // 带
    if(!['armor','ruqun','kasaya','qipao'].includes(R.robe)){const y=R.robe==='qingbuzi'?waist+6:waist;path([[-shx-10,y-8],[shx+10,y-8],[shx+10,y+6],[-shx-10,y+6]]);fs(col.belt,2);
      if(R.role==='official'&&R.robe==='yuanling'){for(let i=-2;i<=2;i++){C().fillStyle='#c9a24a';C().fillRect(i*16-5,y-5,10,8)}}
      if(['shenyi','daopao','duanhe','qujv'].includes(R.robe)){line([[8,y+6],[14,y+56]],4,col.belt);line([[16,y+6],[26,y+50]],4,col.belt)}}
    if(R.buzi){const y=R.robe==='qingbuzi'?sh+52:sh+40;path([[-26,y],[26,y],[26,y+50],[-26,y+50]]);fs(col.buzi,2);quad([-14,y+30],[14,y+20],[0,y+4],2.5,'#7a2f2b');circ(-8,y+18,3,'#7a2f2b',0)}
    if(R.robe==='qingbuzi'){path([[-26,sh+48],[26,sh+48],[26,sh+102],[-26,sh+102]]);fs(col.buzi,2);quad([-14,sh+84],[14,sh+72],[0,sh+56],2.5,'#2f4a6a')}
    if(R.beads){const c=C();c.save();c.strokeStyle='#5b3a2a';c.lineWidth=2;for(let i=0;i<=24;i++){const a=Math.PI*(.15+.7*i/24);circ(Math.cos(a)*30,sh+8+Math.sin(a)*86,3.4,'#7a4a2c',1)}c.restore()}
  }

  /* ---------- 手臂和袖 ---------- */
  function sleeve(R,S,side,t){const col=R.colors,d=side,H=S.hands[side<0?0:1],E_=S.elb[side<0?0:1];
    const wide=R.sleeve==='wide',hh=R.sleeve==='horsehoof',sway=Math.sin(t*1.6+d)*2.5;
    const sc=R.robe==='qingbuzi'||R.robe==='changshan'?col.outer:R.robe==='ruqun'?col.inner:R.robe==='armor'?col.inner:col.robe;const c=C();
    if(S.clasp||(S.claspL&&side<0)){ // 袖手：两手在身前合拢，袖子从肩头垂下、袖口在手下兜成一个袋
      const ax=Math.abs(H[0]),dr=wide?74:18,out=wide?46:20;
      c.beginPath();c.moveTo(d*(S.shx-2),S.sh+2);c.quadraticCurveTo(d*(S.shx+22),S.sh+28,d*(S.shx+20),(S.sh+H[1])/2+16);
      c.lineTo(d*(ax+out),H[1]+dr*.62);c.quadraticCurveTo(d*(ax+out-6),H[1]+dr+sway,d*(ax+4),H[1]+dr*.92+sway);
      c.lineTo(d*(ax-4),H[1]+(wide?18:4));c.lineTo(d*(ax+4),H[1]-16);c.quadraticCurveTo(d*(S.shx-6),H[1]-30,d*(S.shx-14),S.sh+64);c.closePath();fs(sc);shade(.12);
      if(wide)quad([d*(ax+out-2),H[1]+dr*.62],[d*(ax+2),H[1]+dr*.9+sway],[d*(ax+out*.5),H[1]+dr*.95+sway],2,'rgba(33,30,25,.35)');
      if(R.robe==='beizi'||R.robe==='aoqun'||R.robe==='qipao')line([[d*(ax-4),H[1]+(wide?18:4)],[d*(ax+4),H[1]-16]],6,col.trim);
      if(hh)ell(d*(ax+2),H[1]+2,13,10,col.robe,2);
      return [H[0],H[1]+(wide?18:4)]}
    const shp=[d*S.shx,S.sh+6],w0=16,w1=wide?24:hh?13:15,dx=H[0]-E_[0],dy=H[1]-E_[1],ln=Math.hypot(dx,dy)||1,nx=-dy/ln,ny=dx/ln;
    const pts=[[shp[0]-d*2,shp[1]-w0],[E_[0]-nx*w0*d,E_[1]-ny*w0*d],[H[0]-nx*w1*d,H[1]-ny*w1*d],[H[0]+nx*w1*d,H[1]+ny*w1*d+(wide?30+sway:0)],[E_[0]+nx*w0*d,E_[1]+ny*w0*d+6],[shp[0]+d*4,shp[1]+w0+10]];
    c.beginPath();c.moveTo(pts[0][0],pts[0][1]);c.lineTo(pts[1][0],pts[1][1]);c.lineTo(pts[2][0],pts[2][1]);
    if(wide)c.quadraticCurveTo(H[0]+d*6,H[1]+48+sway,pts[3][0],pts[3][1]);else c.lineTo(pts[3][0],pts[3][1]);
    c.lineTo(pts[4][0],pts[4][1]);c.lineTo(pts[5][0],pts[5][1]);c.closePath();fs(sc);shade(.12);
    if(hh)ell(H[0],H[1],12,9,col.robe,2);
    if(R.robe==='beizi'||R.robe==='aoqun'||R.robe==='qipao')line([[H[0]-nx*w1*d,H[1]-ny*w1*d],[H[0]+nx*w1*d,H[1]+ny*w1*d]],5,col.trim);
    return H}
  function hand(H,R,S){if(S.clasp&&R.sleeve==='wide')return;const c=C();c.beginPath();c.ellipse(H[0],H[1]+3,9,7.5,0,0,7);fs(R.elder?SKIN2:SKIN,2);line([[H[0]-4,H[1]+1],[H[0]-4,H[1]+7]],1.2,'rgba(33,30,25,.5)')}

  /* ---------- 头 ---------- */
  function face(R,S,t){const [hx,hy]=S.head,f=R.face||'calm',blink=((t*.37+hx*.001)%1)<.035||f==='closed';
    const sk=R.elder?SKIN2:SKIN,ry=R.child?30:33,rx=R.child?28:R.sex==='f'?25:27;
    ell(hx,hy,rx,ry,sk);
    const c=C();c.lineCap='round';
    const ey=hy+2,eyeL=hx-10,eyeR=hx+10;
    if(blink){quad([eyeL-6,ey],[eyeL+4,ey],[eyeL-1,ey+5],2.4);quad([eyeR-4,ey],[eyeR+6,ey],[eyeR+1,ey+5],2.4)}
    else{line([[eyeL-6,ey],[eyeL+3,ey]],3);line([[eyeR-3,ey],[eyeR+6,ey]],3)}
    if(f==='sad'){line([[eyeL-7,ey-8],[eyeL+3,ey-12]],2.2);line([[eyeR-3,ey-12],[eyeR+7,ey-8]],2.2)}
    else{line([[eyeL-7,ey-10],[eyeL+4,ey-11]],2.2);line([[eyeR-4,ey-11],[eyeR+7,ey-10]],2.2)}
    line([[hx,ey+4],[hx-2,ey+13]],1.8,'rgba(33,30,25,.6)');
    const my=hy+21;if(f==='smile')quad([hx-7,my],[hx+7,my],[hx,my+6],2.2);else if(f==='sad')quad([hx-6,my+3],[hx+6,my+3],[hx,my-2],2.2);else line([[hx-6,my],[hx+6,my]],2.2);
    if(R.sex==='f'&&!R.elder){c.fillStyle='rgba(200,90,80,.28)';c.beginPath();c.ellipse(hx-15,hy+12,6,4,0,0,7);c.ellipse(hx+15,hy+12,6,4,0,0,7);c.fill();circ(hx,my+1,2.6,'#b03a32',0)}
    if(f==='tired'||R.elder){line([[eyeL-6,ey+6],[eyeL+3,ey+7]],1.4,'rgba(33,30,25,.5)');line([[eyeR-3,ey+7],[eyeR+6,ey+6]],1.4,'rgba(33,30,25,.5)')}
    if(R.elder){line([[hx-14,hy-18],[hx+14,hy-18]],1.4,'rgba(33,30,25,.45)');line([[hx-12,hy-13],[hx+12,hy-13]],1.4,'rgba(33,30,25,.45)')}
    // 须
    const bc=R.beard==='white'?'#e9e4d8':HAIR;
    if(R.beard==='short'){line([[hx-8,my-4],[hx-2,my-6]],2.4,bc);line([[hx+2,my-6],[hx+8,my-4]],2.4,bc);line([[hx,my+6],[hx,my+16]],3,bc)}
    if(R.beard==='long'||R.beard==='white'){line([[hx-9,my-4],[hx-2,my-6]],2.6,bc);line([[hx+2,my-6],[hx+9,my-4]],2.6,bc);const sw=Math.sin(t*1.3)*2;
      quad([hx,my+5],[hx+sw,my+52],[hx-3,my+30],3.4,bc);quad([hx-12,my-1],[hx-14+sw,my+34],[hx-16,my+16],2.6,bc);quad([hx+12,my-1],[hx+12+sw,my+34],[hx+16,my+16],2.6,bc)}
  }
  function hairBack(R,S,t=0){const [hx,hy]=S.head;if(R.hat==='futou_tang'){const sw=Math.sin(t*1.8)*3;quad([hx-16,hy-20],[hx-30+sw,hy+44],[hx-30,hy+6],6,'#1c1a17');quad([hx+16,hy-20],[hx+30+sw,hy+44],[hx+30,hy+6],6,'#1c1a17')}if(R.hair==='queue'){line([[hx+6,hy+20],[hx+30,hy+60],[S.shx+4,S.sh+60],[S.shx+8,S.sh+130]],7,HAIR);line([[S.shx+8,S.sh+130],[S.shx+8,S.sh+148]],3,'#a8322b')}
    if(R.hair==='lowbun'&&R.sex==='f'){ell(hx,hy-6,R.child?30:31,36,HAIR,0)}
    if(R.hair==='highbun'){ell(hx,hy-6,30,36,HAIR,0)}}
  function hairFront(R,S,t){const [hx,hy]=S.head,c=C();const hc=R.elder?'#cfcac0':HAIR;
    if(R.hair==='bald'){c.save();c.beginPath();c.ellipse(hx,hy,27,33,0,Math.PI*1.02,Math.PI*1.98);c.strokeStyle='rgba(60,50,40,.35)';c.lineWidth=2;c.stroke();c.restore();if(R.role==='monk'||R.role==='nun')for(let i=0;i<3;i++)circ(hx-8+i*8,hy-24,1.6,'rgba(60,40,30,.5)',0);return}
    if(R.hair==='queue'){c.beginPath();c.ellipse(hx,hy-4,27,30,0,Math.PI*1.05,Math.PI*1.95);c.lineTo(hx+26,hy-6);c.closePath();c.fillStyle='rgba(60,50,40,.18)';c.fill();if(R.hat==='none'||!R.hat){c.beginPath();c.ellipse(hx,hy-22,24,14,0,Math.PI,0);c.fillStyle=HAIR;c.fill()}return}
    // 前发
    c.beginPath();c.ellipse(hx,hy-6,R.sex==='f'?27:28,30,0,Math.PI*1.02,Math.PI*1.98);c.lineTo(hx+22,hy-12);c.quadraticCurveTo(hx,hy-22,hx-22,hy-12);c.closePath();c.fillStyle=hc;c.fill();
    if(R.hair==='highbun'){ell(hx,hy-50,24,22,HAIR,0);ell(hx-18,hy-62,14,18,HAIR,0,-.4);ell(hx+18,hy-62,14,18,HAIR,0,.4);
      line([[hx-30,hy-58],[hx+34,hy-70]],3,'#c9a24a');circ(hx+34,hy-70,5,'#c9a24a',1.5);circ(hx-22,hy-46,4,'#a8322b',1.2);circ(hx+14,hy-74,5,'#a8322b',1.2);
      if(R.era==='tang'){c.save();c.fillStyle='#a8322b';c.beginPath();c.ellipse(hx,hy-30,4,6,0,0,7);c.fill();c.restore()}}
    if(R.hair==='lowbun'&&R.sex==='f'){ell(hx+20,hy-30,15,12,hc,0);line([[hx+6,hy-34],[hx+38,hy-26]],2.5,'#c9a24a')}
    if(R.hair==='loose'){line([[hx-26,hy-8],[hx-32,hy+30]],5,HAIR);line([[hx+26,hy-8],[hx+32,hy+34]],5,HAIR);line([[hx-10,hy-30],[hx-16,hy-12]],2,HAIR);line([[hx+8,hy-30],[hx+16,hy-14]],2,HAIR)}
    if(R.hair==='zongjiao'){ell(hx-22,hy-30,12,12,HAIR,0);ell(hx+22,hy-30,12,12,HAIR,0);line([[hx-22,hy-18],[hx-26,hy-8]],3,'#a8322b');line([[hx+22,hy-18],[hx+26,hy-8]],3,'#a8322b')}
    if(R.hair==='liangbatou'){ell(hx,hy-26,26,20,HAIR,0);line([[hx,hy-44],[hx,hy-36]],10,HAIR);path([[hx-60,hy-38],[hx+60,hy-38],[hx+52,hy-66],[hx-52,hy-66]]);fs('#1c1a17',2);circ(hx-30,hy-52,6,'#a8322b',1.5);circ(hx+30,hy-52,6,'#c9a24a',1.5);circ(hx,hy-54,7,'#e8d8b0',1.5);line([[hx-58,hy-38],[hx-64,hy-6]],3,'#a8322b');circ(hx-64,hy-4,4,'#a8322b',1)}
    if(R.hair==='topknot'&&(!R.hat||R.hat==='none')){ell(hx,hy-40,11,10,hc,0);line([[hx-16,hy-40],[hx+16,hy-40]],2,'#c9a24a')}
  }
  function hat(R,S,t){const [hx,hy]=S.head,c=C(),h=R.hat;if(!h||h==='none')return;
    if(h==='jinxian'){path([[hx-26,hy-20],[hx-22,hy-40],[hx+20,hy-58],[hx+28,hy-30],[hx+24,hy-20]]);fs('#1c1a17',0);line([[hx-24,hy-22],[hx-28,hy+6]],2.5);line([[hx+24,hy-22],[hx+28,hy+6]],2.5);line([[hx-10,hy-38],[hx+18,hy-52]],2,'rgba(240,230,210,.4)')}
    if(h==='longguan'){path([[hx-30,hy-18],[hx-28,hy-62],[hx+28,hy-62],[hx+30,hy-18]]);fs('rgba(30,28,26,.82)',2);for(let i=0;i<5;i++)line([[hx-26+i*13,hy-60],[hx-26+i*13,hy-20]],1,'rgba(240,230,210,.25)');line([[hx-30,hy-18],[hx-32,hy+10]],2.5)}
    if(h==='jin'){path([[hx-27,hy-14],[hx-24,hy-40],[hx,hy-48],[hx+24,hy-40],[hx+27,hy-14]]);fs('#2f2a26',0);line([[hx+18,hy-40],[hx+30,hy-8]],4,'#2f2a26')}
    if(h==='futou_tang'){path([[hx-27,hy-14],[hx-26,hy-40],[hx-10,hy-58],[hx+10,hy-58],[hx+26,hy-40],[hx+27,hy-14]]);fs('#1c1a17',0);}
    if(h==='futou_song'){path([[hx-28,hy-14],[hx-27,hy-46],[hx+27,hy-46],[hx+28,hy-14]]);fs('#1c1a17',0);path([[hx-27,hy-34],[hx-29,hy-62],[hx+29,hy-62],[hx+27,hy-34]]);fs('#1c1a17',0);line([[hx-28,hy-30],[hx-108,hy-32]],5,'#1c1a17');line([[hx+28,hy-30],[hx+108,hy-32]],5,'#1c1a17')}
    if(h==='wusha'){path([[hx-28,hy-14],[hx-27,hy-44],[hx+27,hy-44],[hx+28,hy-14]]);fs('#1c1a17',0);ell(hx,hy-52,22,12,'#1c1a17',0);ell(hx-40,hy-38,16,8,'#1c1a17',0,-.15);ell(hx+40,hy-38,16,8,'#1c1a17',0,.15)}
    if(h==='qingguan'){c.beginPath();c.moveTo(hx-44,hy-18);c.quadraticCurveTo(hx,hy-78,hx+44,hy-18);c.closePath();fs('#3a2f28',2);c.save();c.beginPath();c.moveTo(hx-40,hy-20);c.quadraticCurveTo(hx,hy-72,hx+40,hy-20);c.closePath();c.clip();c.strokeStyle='#a8322b';c.lineWidth=2;for(let i=-6;i<=6;i++){c.beginPath();c.moveTo(hx,hy-60);c.lineTo(hx+i*8,hy-18);c.stroke()}c.restore();
      line([[hx-46,hy-18],[hx+46,hy-18]],5,'#2a2420');circ(hx,hy-64,7,'#5a8ab0',2)}
    if(h==='guapi'){c.beginPath();c.ellipse(hx,hy-20,28,22,0,Math.PI,0);c.closePath();fs('#1c1a17',0);circ(hx,hy-44,5,'#a8322b',0);for(let i=-1;i<=1;i++)line([[hx+i*12,hy-40],[hx+i*20,hy-20]],1,'rgba(240,230,210,.25)')}
    if(h==='dongpo'){path([[hx-27,hy-14],[hx-26,hy-74],[hx+26,hy-74],[hx+27,hy-14]]);fs('#1c1a17',0);path([[hx-30,hy-14],[hx-29,hy-46],[hx+29,hy-46],[hx+30,hy-14]]);fs('#2a2622',0)}
    if(h==='fangjin'){path([[hx-27,hy-14],[hx-30,hy-62],[hx+30,hy-62],[hx+27,hy-14]]);fs('#1c1a17',0);line([[hx,hy-62],[hx,hy-14]],1,'rgba(240,230,210,.25)')}
    if(h==='daoguan'){ell(hx,hy-38,14,12,HAIR,0);path([[hx-10,hy-46],[hx+10,hy-46],[hx+7,hy-60],[hx-7,hy-60]]);fs('#c9a24a',2);line([[hx-22,hy-48],[hx+22,hy-52]],2.5,'#efe6cf')}
    if(h==='douli'){c.beginPath();c.moveTo(hx-74,hy-6);c.lineTo(hx,hy-54);c.lineTo(hx+74,hy-6);c.closePath();fs('#c9a46a',2.5);for(let i=-3;i<=3;i++)line([[hx,hy-54],[hx+i*22,hy-6]],1.2,'rgba(90,70,40,.6)')}
    if(h==='kerchief'){c.beginPath();c.ellipse(hx,hy-10,30,30,0,Math.PI,0);c.lineTo(hx+30,hy+6);c.lineTo(hx-30,hy+6);c.closePath();fs(R.colors.kerchief||'#3d5a7a',2.5);line([[hx+26,hy-4],[hx+40,hy+26]],5,R.colors.kerchief||'#3d5a7a')}
    if(h==='mianliu'){path([[hx-22,hy-18],[hx-20,hy-50],[hx+20,hy-50],[hx+22,hy-18]]);fs('#1c1a17',0);path([[hx-58,hy-58],[hx+58,hy-58],[hx+52,hy-48],[hx-52,hy-48]]);fs('#1c1a17',2);
      for(let i=-5;i<=5;i++){if(Math.abs(i)<1)continue;const x=hx+i*9.5,sw=Math.sin(t*1.5+i)*1.5;line([[x,hy-48],[x+sw,hy-8]],1.2,'#5b4630');for(let k=0;k<4;k++)circ(x+sw*k/4,hy-42+k*10,2.6,k%2?'#c9a24a':'#efe6cf',0)}line([[hx-54,hy-50],[hx-60,hy-6]],2,'#a8322b')}
    if(h==='ruanjin'){c.beginPath();c.ellipse(hx,hy-20,29,24,0,Math.PI,0);c.closePath();fs('#1c1a17',0);path([[hx-29,hy-24],[hx+29,hy-24],[hx+29,hy-16],[hx-29,hy-16]]);fs('#2f2a26',0)}
    if(h==='helmet'){c.beginPath();c.ellipse(hx,hy-14,31,32,0,Math.PI,0);c.lineTo(hx+34,hy+14);c.lineTo(hx+24,hy+18);c.lineTo(hx+24,hy-4);c.lineTo(hx-24,hy-4);c.lineTo(hx-24,hy+18);c.lineTo(hx-34,hy+14);c.closePath();fs('#5a5248',2.5);
      line([[hx,hy-46],[hx,hy-60]],3);const sw=Math.sin(t*2)*4;c.fillStyle='#a8322b';c.beginPath();c.moveTo(hx,hy-60);c.quadraticCurveTo(hx+18+sw,hy-76,hx+6+sw,hy-52);c.quadraticCurveTo(hx-14,hy-70,hx,hy-60);c.fill()}
  }

  /* ---------- 道具 ---------- */
  function props(R,S,Hs,t){const c=C(),[HL,HR]=Hs;
    for(const p of R.props){
      if(p==='hu'){path([[-6,HR[1]-54],[6,HR[1]-54],[7,HR[1]-4],[-7,HR[1]-4]]);fs('#efe6cf',2)}
      if(p==='slip'){c.save();c.translate((HL[0]+HR[0])/2,(HL[1]+HR[1])/2-6);c.fillStyle='#d8bf86';c.fillRect(-26,-18,52,32);c.strokeStyle=LINE;c.lineWidth=2;c.strokeRect(-26,-18,52,32);for(let i=-18;i<26;i+=9){c.beginPath();c.moveTo(i,-18);c.lineTo(i,14);c.stroke()}c.restore()}
      if(p==='scroll'){c.save();c.translate(HR[0]+6,HR[1]-10);c.rotate(-.3);c.fillStyle='#efe6cf';c.fillRect(-8,-40,16,70);c.strokeStyle=LINE;c.lineWidth=2;c.strokeRect(-8,-40,16,70);c.fillStyle='#6b4f2a';c.fillRect(-11,-44,22,6);c.fillRect(-11,28,22,6);c.restore()}
      if(p==='book'){c.save();c.translate(HL[0]-4,HL[1]-12);c.rotate(.15);c.fillStyle='#3d5a7a';c.fillRect(-22,-28,44,52);c.strokeStyle=LINE;c.lineWidth=2;c.strokeRect(-22,-28,44,52);c.fillStyle='#efe6cf';c.fillRect(6,-22,10,38);c.restore()}
      if(p==='brush'){line([[HR[0],HR[1]],[HR[0]+14,HR[1]-44]],3);line([[HR[0]-1,HR[1]+2],[HR[0]-3,HR[1]+10]],5)}
      if(p==='staff'){line([[HR[0]+4,HR[1]-60],[HR[0]+14,0]],5,'#6b4f2a');circ(HR[0]+3,HR[1]-64,7,'#6b4f2a',2)}
      if(p==='spear'){line([[HR[0],HR[1]-150],[HR[0]+6,0]],4,'#6b4f2a');path([[HR[0]-6,HR[1]-150],[HR[0]+6,HR[1]-150],[HR[0],HR[1]-190]]);fs('#cfc9bd',2);line([[HR[0]-6,HR[1]-148],[HR[0]+6,HR[1]-148]],5,'#a8322b')}
      if(p==='sword'){line([[-S.shx-6,S.waist+4],[-S.shx-40,S.waist+120]],8,'#3a3128');line([[-S.shx+2,S.waist-6],[-S.shx-12,S.waist+16]],4,'#c9a24a')}
      if(p==='fan'){c.save();c.translate(HR[0]+4,HR[1]-26);const sw=Math.sin(t*2)*.12;c.rotate(sw);c.beginPath();c.ellipse(0,0,24,28,0,0,7);fs('#efe6cf',2);line([[0,26],[0,52]],3,'#6b4f2a');c.restore()}
      if(p==='whisk'){line([[HR[0],HR[1]],[HR[0]+20,HR[1]-40]],3,'#6b4f2a');const sw=Math.sin(t*1.4)*6;for(let i=0;i<8;i++)quad([HR[0]+2,HR[1]+2],[HR[0]+sw+i*3-10,HR[1]+70],[HR[0]-6+i*2,HR[1]+30],1.4,'#efe6cf')}
      if(p==='beads'){c.save();for(let i=0;i<12;i++){const a=i/12*Math.PI*2;circ(HL[0]+Math.cos(a)*12,HL[1]+14+Math.sin(a)*12,3,'#5b3420',1)}c.restore()}
      if(p==='basket'){line([[HR[0],HR[1]],[HR[0]+4,HR[1]+30]],2.5);path([[HR[0]-24,HR[1]+30],[HR[0]+30,HR[1]+30],[HR[0]+22,HR[1]+66],[HR[0]-16,HR[1]+66]]);fs('#c9a46a',2.5);for(let i=0;i<4;i++)line([[HR[0]-20+i*13,HR[1]+32],[HR[0]-14+i*10,HR[1]+64]],1.2,'rgba(90,70,40,.6)')}
      if(p==='jia'){path([[-80,S.sh-22],[80,S.sh-22],[80,S.sh+18],[-80,S.sh+18]]);fs('#8a6c3a',3);circ(0,S.sh-6,20,'#4a3a2a',2);for(const x of [-60,60])circ(x,S.sh-2,4,'#3a3128',1);line([[-56,S.sh+4],[56,S.sh+4]],1.4,'rgba(33,30,25,.45)');
        for(let i=0;i<6;i++){circ(L(HL[0],HR[0],i/5),HL[1]+18+Math.sin(i/5*Math.PI)*12,4.5,null,2.2)}}
      if(p==='bundle'){c.save();c.translate(S.shx+12,S.sh+40);c.rotate(.2);c.beginPath();c.ellipse(0,0,30,24,0,0,7);fs('#c9b38a',2.5);line([[-8,-20],[-22,-70]],3,'#5b4630');c.restore()}
      if(p==='bowl'){c.beginPath();c.ellipse(HL[0]+12,HL[1]-4,22,8,0,0,7);fs('#efe6cf',2);c.beginPath();c.moveTo(HL[0]-10,HL[1]-4);c.quadraticCurveTo(HL[0]+12,HL[1]+22,HL[0]+34,HL[1]-4);fs('#efe6cf',2)}
    }}

  /* ---------- 卧病 ---------- */
  function lie(R,t,o){const c=C();c.fillStyle='#6b4f2a';c.fillRect(-190,-60,380,16);c.fillRect(-184,-44,14,44);c.fillRect(170,-44,14,44);ell(-150,-78,34,16,'#efe6cf',2);
    c.save();c.translate(-132,-88);c.rotate(-Math.PI/2.3);c.scale(1.15,1.15);on(c,()=>{face({...R,face:o.face||'closed'},{head:[0,0]},t);hairFront({...R},{head:[0,0]},t)});c.restore();
    const br=Math.sin(t*1.6)*2;c.beginPath();c.moveTo(-104,-70);c.quadraticCurveTo(0,-112-br,170,-76);c.lineTo(170,-60);c.lineTo(-110,-60);c.closePath();fs(R.colors.robe,2.5);c.save();c.clip();for(let i=-6;i<8;i++){line([[-100+i*40,-120],[-60+i*40,-56]],1.4,'rgba(255,255,255,.15)')}c.restore()}

  /* ---------- 主函数 ---------- */
  function person(t,o={}){const c=C(),R=resolve(o),pose=o.pose||R.pose||'stand',t0=o.t0??0,s=(o.s||1)*(R.child?.62:1)*(R.elder?.96:1),fc=o.facing||1;
    c.save();c.translate(o.x||0,o.y||0);c.scale(s*(fc<0?-1:1),s*(1+.006*Math.sin(t*2.1+(o.x||0)*.01)));c.lineJoin='round';
    c.fillStyle='rgba(60,40,10,.16)';c.beginPath();c.ellipse(0,2,pose==='lie'?200:(pose==='kneel'||pose==='write'?110:84),13,0,0,7);c.fill();
    if(pose==='lie'){lie(R,t,o);c.restore();return}
    const S=skeleton(R,pose,t,t0);
    if(pose==='write'){c.fillStyle='#6b4f2a';c.fillRect(30,-140,170,12);c.fillRect(44,-128,10,128);c.fillRect(176,-128,10,128);c.save();c.translate(110,-150);c.fillStyle='#d8bf86';c.fillRect(-56,-6,112,12);c.strokeStyle=LINE;c.lineWidth=2;c.strokeRect(-56,-6,112,12);c.restore()}
    if(R.cape){const sw=Math.sin(t*1.2)*6;path([[-S.shx-4,S.sh],[S.shx+4,S.sh],[S.shx+40+sw,S.hem-20],[-S.shx-40+sw,S.hem-20]]);fs(R.colors.cape,2.5)}
    c.save();if(S.tilt){c.translate(0,S.waist);c.rotate(0);c.translate(0,-S.waist)}
    hairBack(R,S,t);
    lowerBody(R,S,pose);
    torso(R,S);
    
    // 头先于手臂画在后层？不：袖子盖住身体，头在最上
    const HL=sleeve(R,S,-1,t),HR=sleeve(R,S,1,t);
    if(R.robe==='ruqun'&&R.colors.pibo){const sw=Math.sin(t*1.3)*7,c2=C();c2.save();c2.strokeStyle=R.colors.pibo;c2.lineWidth=11;c2.lineCap='round';c2.globalAlpha*=.92;
      [[-1,0],[1,1]].forEach(([d,k])=>{c2.beginPath();c2.moveTo(d*(S.shx-6),S.sh+4);c2.bezierCurveTo(d*(S.shx+40),S.sh+60,d*(S.shx+60)+sw,S.waist+40,d*(S.shx+34)+sw,S.waist+(k?190:150));c2.stroke()});c2.restore()}
    if(pose==='carry'){line([[-150,-322],[150,-322]],6,'#6b4f2a');[[-140],[140]].forEach(([x])=>{line([[x,-322],[x-14,-240]],1.5);line([[x,-322],[x+14,-240]],1.5);path([[x-26,-240],[x+26,-240],[x+20,-196],[x-20,-196]]);fs('#c9a46a',2.5)})}
    if(S.claspL){hand(HR,R,S)}else if(S.clasp&&R.sleeve!=='wide'){const c=C();c.beginPath();c.ellipse(0,S.hands[0][1]+6,14,9,0,0,7);fs(R.elder?SKIN2:SKIN,2)}else{hand(HL,R,S);hand(HR,R,S)}
    if(pose==='write')line([[HR[0],HR[1]],[HR[0]+12,HR[1]-40]],3);
    if(pose!=='carry')props(R,S,[HL,HR],t);
    // 颈和头
    c.fillStyle=R.elder?SKIN2:SKIN;c.fillRect(S.head[0]-9,S.neck-14,18,22);
    face(R,S,t);hairFront(R,S,t);hat(R,S,t);
    c.restore();c.restore()}

  // ---------- 图片版人物（renwu_img.py 生成：mu 木刻平涂 / 3d 软陶手办） ----------
  // portrait(t,{id:'han.clerk', style:'mu', x, y, h:880, t0, enter:'rise'|'fade'|'ink'|'none', dur:.9, facing:1, breathe:1, sway:1, shadow:1, tone:0, alpha:1})
  //   (x,y) 是两脚中间的地面；h 是人物像素高；breathe/sway 是呼吸起伏和轻微摆动的幅度（0 关掉）；
  //   tone 0~1 把颜色往纸色压（mu 放在 liubai 纸上更融）；库里没有这张图就退回参数化的 person()，不报错。
  const RI={},RM={};
  function has(id,style='mu'){return !!RI[style+'/'+id]}
  function portrait(t,o={}){
    const style=o.style||'mu',id=o.id||o.preset,im=RI[style+'/'+id],m=(RM[style]||{})[id];
    const h=o.h||880,x=o.x??W/2,y=o.y??H*.8,t0=o.t0??-9,dur=o.dur||.9,k=eo(cl((t-t0)/dur)),en=o.enter||'rise';
    if(!im){if(PRESETS[id])person(t,{preset:id,x,y,s:h/400*.92,t0:o.t0,facing:o.facing,pose:o.pose,face:o.face});return}
    const s=h/m.h,fx=m.foot[0],fy=m.foot[1],ph=(o.phase??(x*.013))%7;
    const br=(o.breathe??1)*.0045*Math.sin(t*2*Math.PI/4.2+ph),sw=(o.sway??1)*.0045*Math.sin(t*2*Math.PI/6.5+ph*1.7);
    const a=(o.alpha??1)*(en==='none'?1:k);if(a<=.003)return;
    g.save();g.globalAlpha*=a;
    if(o.shadow??1){g.save();g.globalAlpha*=.22;const rg=g.createRadialGradient(x,y,4,x,y,m.w*s*.55);rg.addColorStop(0,'rgba(40,28,16,.9)');rg.addColorStop(1,'rgba(40,28,16,0)');g.fillStyle=rg;g.beginPath();g.ellipse(x,y,m.w*s*.55,m.w*s*.09,0,0,7);g.fill();g.restore()}
    g.translate(x,y+(en==='rise'?(1-k)*46:0));g.rotate(sw);g.scale((o.facing||1)*s*(1-br*.4),s*(1+br));
    if(en==='ink'&&k<1)g.filter=`blur(${((1-k)*10).toFixed(2)}px)`;
    g.drawImage(im,-fx,-fy);
    if(o.tone){g.globalCompositeOperation='source-atop';g.globalAlpha*=o.tone*.5;g.fillStyle=o.toneCol||TH.top||'#e7d9b6';g.fillRect(-fx,-fy,m.w,m.h)}
    g.restore()}
  PACK_INIT.push(async()=>{let man={};
    try{const r=await fetch('/kit/packs/renwu_img/manifest.json');if(r.ok)man=await r.json()}catch(e){}
    Object.assign(RM,man);
    await Promise.all(Object.entries(man).flatMap(([st,v])=>Object.keys(v).map(id=>new Promise(res=>{const i=new Image();i.onload=()=>{RI[st+'/'+id]=i;res()};i.onerror=()=>res();i.src=`/kit/packs/renwu_img/${st}/${id}.webp`}))))});

  function lineup(t,list,o={}){const n=list.length,w=o.w||W*.8,x0=(o.x??W/2)-w/2;list.forEach((p,i)=>person(t,{...p,x:x0+w*(i+.5)/n,y:o.y??H*.8,s:o.s||.8}))}

  return {person,portrait,has,lineup,on,PRESETS,ERAS};
})();
