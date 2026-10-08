/* 素材重新剪辑：铺法（cover / contain / blur）、推拉摇、叠化、擦切、J-cut、原声压低、署名。素材全部是自有的（usage_basis: own） */
window.FILM={theme:'keynote',chrome:'none',chapters:['三种铺法','推拉摇与转场','声音先进','原声压低','署名'],
 cover:{pill:'回归样片',title:'素材重新剪辑',line1:'铺法 · 推拉摇 · 转场',line2:'J-cut · 原声压低',tagline:'自有素材演示',art(c,cx,cy,R){c.strokeStyle=TH.a1;c.lineWidth=10;c.strokeRect(cx-R,cy-R*.56,2*R,1.12*R)}},
 scenes(t){
  // 一、同一段竖拍素材放进三个横框
  scn(t,T('p0'),N('p0'),()=>{const s=T('p0');rise(t,s+.1,'同一段竖拍素材，放进横框的三种铺法',W/2,250,52,TH.ink,TH.f.t,'center');
   [['cover','cover：裁满','上下被裁掉一大半'],['contain','contain：留黑边','画面完整，两边是黑的'],['blur','blur：模糊垫底','两边用同一帧模糊填满']].forEach(([fit,lab,sub],i)=>{const x=110+i*590,t0=s+.5+i*.3,ts=s+2.6+i*1.0;
    clip('tall',t,t0,x,360,520,292,{fit,speed:.4,fade:[.4,0],credit:false});txt(lab,x+260,720,40,TH.ink,TH.f.b,'center',eo(seg(t,t0,t0+.4)));rise(t,ts,sub,x+260,780,34,TH.note,TH.f.b,'center');highlight(t,ts,x+20,734,480,6)});
   sourceTag(t,s+1.6,'影像：本频道自制（自有素材）',110,860)});
  // 二、全屏：推拉摇 → 交叉溶解 → 擦切到竖拍全屏（模糊垫底）
  scn(t,T('p1'),N('p1'),()=>{const s=T('p1');
   xfade(t,s+3.8,1.0,()=>clipFull('sunset',t,s,s+4.3,{speed:.75,kb:{z0:1.25,z1:1.7,x0:.5,y0:.5,x1:.74,y1:.46}}),
    ()=>wipe(t,s+7,.8,'left',()=>clipFull('prism',t,s+3.3,s+7.4,{speed:.7,kb:{z0:1.6,z1:1.3,x0:.32,y0:.5,x1:.5,y1:.5}}),()=>clipFull('tall',t,s+6.6,null,{fit:'blur',speed:.6,kb:{z0:1.1,z1:1.1}})));
   const L=[['推拉摇',s+.3,s+3.5],['交叉溶解',s+3.6,s+6.6],['擦切',s+6.8,N('p1')]];
   L.forEach(([s_,a,b])=>pill(s_,110,230,44,'rgba(10,10,20,.72)','#fff',fadeIO(t,a,b,.3)))});
  // 三、J-cut：素材里的讲话先响 1.4 秒，画面再切过去
  scn(t,T('p2'),N('p2'),()=>{const s=T('p2'),cut=s+1.8;clipSound('talk',t,s+.4,{fadeIn:.25});
   if(t<cut)clip('sunset',t,s,560,200,800,450,{from:2,speed:.3});else clip('talk',t,cut,560,200,800,450,{from:1.4,t1:s+6.3,fade:[0,.3]});
   rise(t,s+.2,'原声先进（J-cut）',W/2,160,48,TH.ink,TH.f.t,'center');
   lowerThird(t,cut+.2,'素材原声','声音比画面早 1.4 秒进来',110,850,N('p2')-.2)});
  // 四、原声在旁白下面自动压低（只有测试项目有这一段：回归样片没有配音）
  if(S('v0'))scn(t,T('p3'),N('v0'),()=>{const s=T('p3');clip('amb',t,s+.2,560,200,800,450,{sound:.9,t1:N('v0')-.3,fade:[.3,.5]});
   rise(t,s+.3,'旁白一进来，原声自动压低 12 分贝',W/2,160,48,TH.ink,TH.f.t,'center')});
  // 五、片尾署名：从素材台账自动列出
  scn(t,T('e0'),N('e0'),()=>{const s=T('e0');clip('prism',t,s,660,150,600,338,{speed:.3,kb:{z0:1.3,z1:1.7,x0:.4,y0:.5,x1:.62,y1:.42},credit:false});
   rise(t,s+.2,'素材与署名',W/2,620,72,TH.ink,TH.f.t,'center');credits(t,s+.6,creditLines(),710);
   txt('全部素材为自有（usage_basis: own）',W/2,800,36,TH.note,TH.f.b,'center',eo(seg(t,s+1,s+1.5)))});
 }};
