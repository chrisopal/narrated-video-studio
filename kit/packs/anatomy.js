/* 风格包 · 器物解剖（anatomy）—— 几何改自 wheresryan22/anatomy（MIT），画到画布上的接合层、视频镜头和动作、招牌零件是本项目自己写的
   一个原理讲成一台看得见的小器械：底座、导轨、滑台、弹簧、旋钮、表盘、管线……许多小而准的实体零件，四档明暗，前后遮挡正确，
   只有一件“此刻要看的”零件高亮。观众认出这台机器，就懂了这个原理。读数、指针、零件的运动都从同一个模型算出来。
   用在：科普原理、工业零部件、机构和测量（弹簧、杠杆、齿轮、轴承、阀、传感器）、把抽象的系统讲成一台机器（缓存 → 锁、分层 → 抽屉柜）。
   主题：anatomy（深灰，原项目的暗色）· anatomy_light（纸白，原项目网站上线用的浅色）。也能画在别的主题上（按深浅自动取一套灰阶）。
   brief.json： "packs":["anatomy"]       scenes.js： const {K, G, TB, view, fit, camLerp, solid, line, dots, …} = PACK.anatomy;

   先读 templates/风格包.md「anatomy」一节：先写“这台机器是什么、什么在动、动代表什么”和零件清单（≥40 件），再写几何。

   坐标和尺度：世界坐标 x、y 在板面上，z 朝上；一个单位约等于真东西的 1 毫米，一台桌面器械的底座 250–300 × 120 左右，镜头每单位约 3 像素（view 的 s≈3，或直接用 fit 装进框里）。
   平面 plan 一律写成 {x, y, w, d, r}：x、y 是起始角（不是中心），w 沿 x、d 沿 y、r 圆角。写错会在 stills 的“页面报错”里提示。
   画框 plate 是不透明的：机器要画在它的 draw 回调里（见下面的最小例子），不要画在 plate 之前或之后。
   最小例子（一块带脚的底座、一根导轨、一个会转的旋钮，读数写在框角）：
     (() => { const { K, fit, plate, basePlate, rail, knob, follow } = PACK.anatomy;
       const BASE = { x: -120, y: -50, w: 240, d: 100, r: 8 };
       window.FILM = { theme: 'anatomy_light', chrome: 'none', cover: { title: '例子', art() {} },
         scenes(t) {
           const P = fit(K.boxCorners(BASE, -20, 40), { x: 160, y: 170, w: W - 320, h: H - 420 }, { az: 50 });
           const a = follow(t, [[0, 0], [1, 3]], .6);                     // 模型：旋钮转了多少圈（示意）
           plate(t, 0, { fig: '图 1', title: '例子', hint: '拧旋钮', readout: `${a.toFixed(1)} 圈（示意）`,
             draw: () => { basePlate(P, BASE); rail(P, { x: -90, y: -4, w: 150, d: 8, r: 1 }, { z: 0 }); knob(P, 80, 0, 0, { r: 10, h: 8, angle: a * 2 * Math.PI, lit: true }) } });
         } };
     })();

   一、几何（原项目原样搬来，返回 SVG 路径字符串，交给下面的 solid/line 画）
     K   核心（kit/packs/anatomy/isokit.js）：K.iso([x,y,z], P) 投影；K.depthOf 深度；K.slabOf(plan,z,h,P,steps,bevel) 圆角板；K.cylinder(cx,cy,r,z,h,P)；
         K.extrude(环,z,h,P)；K.planOutline / insetPlan / lineOnTop / segment / ring / sideArc / sideSeam；K.knurl 滚花；K.coil 弹簧（分 back/front）；
         K.topTicks / sideTicks / radialTicks 刻度；K.corners / boxCorners / dotGrid；K.haloOf 软影；K.topMatrix / sideMatrix 贴面；K.fitProjection
     G   回转体和曲面（lathe.js）：G.frameAlong(原点, 轴) 定一根轴；G.solidOf(半剖面, F, P) 车出来的零件；G.disc / ringBand / sphereOf / saddleOf / prismOf；
         G.bandsOf 长曲面体分段；G.arcOf 曲面上的缝；G.ribsOf 肋（带 fade）；G.dotsOf 螺栓圈；G.rodOut 从密封套里伸出的杆；G.fillet 管路倒圆角
     TB  管线（tube.js）：TB.tubePieces(三维点列, 半径, P, {gaps, breaks, rings, caps}) 切成可排序的段；TB.crossingsOf 找卡箍处
     参数和例子见原项目的 references/kit.md（README.md 里有链接），这里的函数名、参数一个没改。

   二、画（index.js）
     solid(paths, {tone, crease, lit, flat, halo, inner, a})   画一个实体：底色 → 四档侧面 → 顶面 → 折线 → inner → 轮廓。lit 全片同一时刻只给一件
     line(d, {tone, dotted, dashed, flow:t, w, a})             线。tone：hi mid lo faint lit，或 red green blue（只在颜色就是主题时用）
     dots(屏幕点, {size, tone, pulse:t}) · wire(甲, 乙, {via, tone, ends}) 两端落点的连线 · fadeLine(点列, {fade:[头,尾]}) 两头淡出的线
     faded([[d,透明度],…]) · softShadow(填充路径) · tubePiece(段) · pipe(P, 路线, 半径, {rings,…}) 整根管子按深度画
     turned(P, 半剖面, F, 车削参数, 画法)  回转体一步画出 · onFace(K.sideMatrix(…), fn) 在零件的面上画
     look({lw})  线宽（缺省 1.5 像素；原项目网页是 0.6，视频要在手机上看得见）

   三、镜头和动作
     view({at,sx,sy,s,az,el}) 世界点 at 落在屏幕 (sx,sy)、每单位 s 像素，返回投影 P · fit(点列, 框, {pad,az,el}) 装进框里，返回 P
     camLerp(甲, 乙, k) 推拉平移：甲、乙是 view()/fit() 返回的 P，也可以直接给 view 的参数；例 camLerp(WIDE, view({at:[50,20,20], s:8}), eio(k))
     byDepth(东西, P, 取点) 远的先画 · at(点, P) 投影
     follow(t, [[时刻,目标],…], τ) 指数跟随 · spring(t, keys, {f,z}) 弹簧（回弹一次）· env(t,t0,t1,{a,d}) 起落包络 · drop(t,t0,{h}) 装上去的落差
     都是 t 的确定函数：模型（比如胡克定律的位移）算出目标，零件、指针、读数都读同一个值。

   四、招牌零件（菜谱来自原项目的零件词汇，坐标是世界单位）
     basePlate(P, plan, {z,h,feet,groove,screws,halo}) 带脚的底座 · ruler(P,{x,y,w,z,step,every,axis,zero}) 刻度尺 · labelPlate(P, plan, z) 铭牌
     rail(P, plan, {z,h}) 导轨 · post(P, x,y,z0,h) 立柱 · knob(P, cx,cy,z,{r,h,angle,lit}) 滚花旋钮 · coil(P,{from,to,center,r,turns,axis}, inner) 弹簧
     dial(P, x,y,z,{R,h,value,mark,lit}) 表盘（value 0..1 一圈）
     plate(t, t0, {x,y,w,h,fig,title,hint,readout,t1}) 画框：四角放“图 n”、标题、提示、读数，画里不写字
     on(ctx, fn) 封面里画零件

   许可：kit/packs/anatomy/LICENSE（原项目 MIT 全文）；取了什么、改了什么、没取什么：kit/packs/anatomy/README.md */
window.PACK=window.PACK||{};window.PACK_INIT=window.PACK_INIT||[];
PACK.anatomy={K:{},G:{},TB:{},AU:{},GL:{},T3:{},TF:{},TBLD:{},TA:{}};
['isokit','lathe','tube','audit','gl','turn','turn-canvas','turn-build','turn-audit','index','fx','check']
  .forEach(m=>document.write('<script src="/kit/packs/anatomy/'+m+'.js"><\/script>'));
