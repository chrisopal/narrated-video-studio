/* 风格包 · 器物解剖（anatomy）—— 几何、审计、WebGL 层、3D 转动的引擎改自 wheresryan22/anatomy（MIT）；画到画布上的接合层、视频镜头和动作、招牌零件、
   光效库、审计和 3D 接到逐帧画法上的那一层是本项目自己写的
   一个原理讲成一台看得见的小器械：底座、导轨、滑台、弹簧、旋钮、表盘、管线……许多小而准的实体零件，四档明暗，前后遮挡正确，
   只有一件“此刻要看的”零件高亮。观众认出这台机器，就懂了这个原理。读数、指针、零件的运动都从同一个模型算出来。
   用在：科普原理、工业零部件、机构和测量（弹簧、杠杆、齿轮、轴承、阀、传感器）、把抽象的系统讲成一台机器（缓存 → 锁、分层 → 抽屉柜）。
   主题：anatomy（深灰，原项目的暗色）· anatomy_light（纸白，原项目网站上线用的浅色）。也能画在别的主题上（按深浅自动取一套灰阶）。
   brief.json： "packs":["anatomy"]       scenes.js： const {K, G, TB, AU, view, fit, camLerp, solid, line, dots, fx, turn3d, …} = PACK.anatomy;

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
     dial(P, x,y,z,{R,h,value,mark,lit}) 表盘（value 0..1 一圈）· washer(P, at, {r,hole,t,axis}) 套在杆上的垫圈（弹簧的头压在它的边上）
     plate(t, t0, {x,y,w,h,fig,title,hint,readout,t1}) 画框：四角放“图 n”、标题、提示、读数，画里不写字
     on(ctx, fn) 封面里画零件

   五、审计（check.js；改自上游 audit.js 和 scripts/line-ends.mjs）—— build.py check 自动跑（每秒量一帧），build.py anatomy 逐条列出并圈在画面上
     量一帧时，上面每个画法都顺手登记：画了什么零件（真实形状）、在第几笔、哪些线要查线头。查五样：
       线头悬空（每根纹理线两头落在别的线、轮廓、圆点上，或被之后画的零件盖住；刻度一头生根就行）
       遮挡顺序（两件零件在画面上重叠时，真实在前面的那件必须后画——按“第几笔”和几何比）
       穿模（管子穿过零件、零件互相陷进去）、管线端头（管子的头落在接口上）、零件悬空超过 1 秒（提醒）
     几何函数（K.slabOf / cylinder / extrude、G.solidOf / lathe / disc / ringBand / sphereOf / prismOf）造的零件自动登记形状；
     自己拼路径画的，solid(paths, {shape: AU.box(…)})。给零件起名字：solid(…, {name:'carriage'})；底座是地：{ground:true}（basePlate 自动）。
     line(d, {free:true|'start'|'end'}) 本来就停在面上的线（代表印刷字的行、指针）；line(d, {mark:true}) 刻度（一头生根即可）。
     pipe(P, 路线, r, {name, owner, touch:['零件名'], limp, free:[起点,终点], gaps}) 管线的审计信息：touch 允许贴着的零件（躺在底座上的电缆），free 本来就不接东西的头。

   六、光效（fx.js）—— fx(名字, t, P, 参数)：画在零件同一个镜头里的 WebGL 层，没有 WebGL 时画二维替身
     glow   {at, r, heat, plan}            发热的面（加热片、烙铁头、焊点的热斑）；plan 把光晕限制在台面上
     flame  {base, dir, r, len, power}      火焰或喷流（dir 1 向上、-1 向下）
     steam  {base, r, rise, density, drift} 蒸汽、烟
     lamp   {at, z, r, power, warm, plan}   灯光落在台面上（先画光，再画立在台面上的东西）
     water  {plan, z, src:[[x,y,相位]…], wave, freq, amp, power}  一池水的波纹（最多 4 个振源）
     sparks {at, t0, t1, rate, life, speed, dir, spread, gravity, floor, seed}  按抛物线飞的火花，落地就灭
     顺序：画完被光效盖住的零件之后、画盖住光效的零件之前调用。强度参数一律骑在包络上：env、settle(t, keys, 秒)、burst(年龄, 升, 落)。
     深色主题发光用 screen 叠加（只加亮）；浅色主题按“纸上要看到的颜色”反解墨：饱和的主体、淡的芯、空中不放光晕。

   七、3D 转动（turn3d.js；引擎是上游的 turn-build / turn-canvas / turn-audit）
     const S = turn3d(P, (T, h) => {…}, {pose: t => ({组名: 角度…})})   构建在第一次画的时候做，按 pose(t) 采样整片会出现的姿态
       T.group(名, {turn:{pivot}} | {slide:{direction,travel}} | {hinge:{point,axis,range}} | {free:{origin}})  组
       T.round / T.prism / T.ball / T.tube / T.lathe / T.plane / T.split  凸零件（参数见上游 references/3d.md），material: steel gold chrome brass copper gunmetal rubber
       h.layer.live 活动层 · h.VERT(x,y) 竖直轴的框架 · h.fixed(名, AU.slab(…), 'back'|'front', {ground}) 登记二维画的静止零件（底座、立柱）
     S.draw(t, P现在, 'live')  在这一笔画活动层（镜头只能推拉平移）· S.anchor(t, 组, 静止时的点) 光效跟着零件走
     审计：build.py anatomy --turn [--quick] 用这条片子自己的每一帧跑上游的轨道审计（穿模、遮挡环、跳变、连续性）；check 读它留下的结果

   许可：kit/packs/anatomy/LICENSE（原项目 MIT 全文）；取了什么、改了什么、没取什么：kit/packs/anatomy/README.md */
window.PACK=window.PACK||{};window.PACK_INIT=window.PACK_INIT||[];
PACK.anatomy={K:{},G:{},TB:{},AU:{},GL:{},T3:{},TF:{},TBLD:{},TA:{}};
['isokit','lathe','tube','audit','gl','turn','turn-canvas','turn-build','turn-audit','index','fx','turn3d','check']
  .forEach(m=>document.write('<script src="/kit/packs/anatomy/'+m+'.js"><\/script>'));
