/* 风格包 · 艺术引擎（art）—— 绘画、动效、转场各库改自 alchaincyf/huashu-art-motion（MIT），接合层是本项目自己写的
   它不是一套“长相”，而是一层画法：别的风格包、通用组件画出来的任何画面，都可以再过一遍它。没有主题，和任何主题、任何包一起用。
   brief.json：  "packs":["art"]（和别的包并列，如 ["glow","art"]）      scenes.js：  const {look, post, trans, seq, P, MO, CAM} = PACK.art;

   一、重绘 look：把画面重新“画”一遍（笔触、色点、石块、网点……）
     look('名字', t, {…})                  把这一帧到目前为止画在画布上的东西重绘；之后再画的（文字、标注）保持清晰，不被重绘
     look('名字', t, {draw(tt){…}, fps})   步进重绘：只重绘 draw 里画的东西，画面按 fps（默认 12）一顿一顿地走，手绘动画的味道；
                                            同一步里的帧直接用上一次的结果，整片渲染快两三倍。draw 收到的 tt 是量化后的时间，里面要用 tt 不要用 t
       名字：vangogh 旋动的短笔触 · impression 印象派色点 · pointill 点彩（等大的纯色点，靠眼睛混色） · mosaic 马赛克石块
             halftone 印刷网点 · pixel 像素 · cubist 立体主义切面
       通用参数：mix 0..1 重绘的浓度（从 0 推到 1 就是“画面变成一幅画”）；rect:[x,y,w,h] 只重绘这一块；seed
       各自的参数在下面 LOOKS 每一项前面的注释里（cell 笔触疏密、len 笔长、width 笔宽、flow 旋动快慢、tile 石块大小、size 像素大小……）
     重绘是整帧逐点取色，一帧 0.1–0.3 秒：整片都重绘的片子用步进形式；只在几句里用就无所谓。文字一律在 look 之后画。

   二、后期 post：叠在整幅画面上的一层“媒介”
     post('名字', t, {…})   在分场里调用：叠在到目前为止画好的东西上；想叠在整片最上面（文字也盖住），写进 FILM.themePatch:{post(t){ post('film',t) }}
       名字：film 老胶片（闪烁、划痕、灰尘、片门） · vhs 录像带（色差、噪声带、扫描线） · bloom 泛光 · vignette 暗角 · fade 褪色/染色
             scan 扫描线 · rgb 三色错位 · flare 镜头光晕（{sun:[x,y]}） · light 明暗法：整幅乘一张光照图（{ambient, pools:[[x,y,半径,'r,g,b',强度],…]}）
     film、vhs 是整屏在闪的东西，一条片里用在一两段，别从头叠到尾。

   三、转场 trans：两场之间不只是淡入淡出
     trans('名字', t, 切点, 时长, 画A, 画B, {…})   和通用的 xfade 一样的用法：切点前后各占一半时长；画A、画B 是两个函数，各画一场完整的画面
       写在 scenes(t) 的最外层，不要放进 scn() 里（转场自己管两场的进出）。两场各自的 scn 起止要盖过转场窗口。
       通用（任何画面都合适）：dissolve 溶解（{dip:'#000'} 先压黑；same 是硬切，不是溶解）· push 推页 · slidePush 横推（{bar:'#色'}）· whip 甩镜 · smash 砸镜 · blurPush 模糊推进 · fadeShift 淡出上移
             bands 色带擦除（{colors:[…]}）· fillZoom 冲进色块（{cx,cy,fill}）· zoomThrough 镜头穿越（{cx,cy,zoom}）· expandRect 卡片展开成全屏（{rect:{x,y,w,h}}，不给就是画面正中一张卡）
             lensReveal 从一个圆里钻进下一场（{cx,cy}，或 lens:t=>({x,y,r}) 自己给圆）· matchCut 同色硬接 · same 两场本是同一幅画
             iris 圈入 · pageTurn 翻页 · tiles 石块砌入 · cube 立方体翻转 · wave 水波 · ripple 涟漪（{cx,cy}）· pixelate 像素化 · zigzag 锯齿 · shards 碎片
       带画种味道的（进入那种画风的一场时用）：inkBloom 墨晕（{cx,cy}）· dabs 色点 · swirl 旋笔 · pointill 点彩 · mosaic 马赛克 · goldLeaf 贴金
             godRays 天光 · chiaroscuro 明暗 · lampGlow 灯晕 · flareSweep 光扫 · irisFilm 老胶片圈入 · blueBrush 蓝色干笔 · organic 藤蔓曲线
             bauhaus 几何色块 · redWedge 红楔 · comicPanels 漫画分格 · dotBloom 圆点 · cutouts 剪纸 · wireframe 线框 · screamWarp 扭曲 · apsara 飘带
             melt 融化 · sunShaft 光柱 · bleed 洇开 · vhs 录像带撕裂
       全部名字：Object.keys(TR)。带坐标的转场，不给 cx、cy 时用画面中心。
     seq(t, 第一场, ['名字', 切点, 时长, 下一场, {…}], ['名字', 切点, 时长, 再下一场], …)   一串场景依次转场，不用一层套一层；相邻转场的窗口不要重叠

   四、库：直接用绘画库和动效库（第一个参数都是画笔，在主画布上就传 g）
     P    绘画：P.brush 毛笔飞白 · P.leaf 两头尖单笔 · P.inkWash 墨晕 · P.watercolor 水彩洗染 · P.impasto 厚涂 · P.cut 剪刀折线 · P.flowLines 长弯流线笔
               P.strokes / dabs / pointillism / mosaic / halftone / pixelate / facets（look 用的就是它们）· P.cel 赛璐珞两调 · P.vol 体积 · P.castShadow 长影子
               P.litClip 硬光块 · P.lightMap / applyLight 光照图 · P.piece / stamp 皮影 · P.texture / grain / craquelure 纸、颗粒、龟裂 · P.noise / fbm 噪声
     MO   动效时间：MO.smooth、MO.spring、MO.springHz、MO.settle、MO.bezier、MO.lagged、MO.step（一拍二）、MO.float……全是“时间→数值”的纯函数
     CAM  世界相机：CAM.with(g, cam, fn)、CAM.at(关键帧, t)、CAM.pushTo、CAM.layer（视差）、CAM.zlerp（对数缩放）、CAM.motionBlur
     DG   图解：逐笔描出 DG.drawPartial、手绘抖动 DG.hand、形变 DG.morph、公式 DG.math、圈注 DG.circumscribe、白板 DG.board
     TY   文字动效：TY.charsIn、TY.rise、TY.pop、TY.slam、TY.keyword、TY.marker、TY.count、TY.fit
     CH   图表：CH.grid、CH.bars、CH.line、CH.candles、CH.callout、CH.frame
     UI   发布会界面：UI.mesh 光斑底、UI.glass 毛玻璃卡、UI.sheen 光扫、UI.persp 伪 3D
     CL   拼贴：CL.paperTile 纸纹、CL.tornRect 撕边、CL.photo 网点照片、CL.tape、CL.string 红线、CL.highlight
     TOON 扁平插画：TOON.flat 双色分面、TOON.glow、换姿势 TOON.poseAt、眨眼 TOON.blinkAt（角色本身没有收进来，用工坊自己的 stick、host）
     KIT、U  小工具：KIT.ribbon 可变线宽、KIT.densify、KIT.warpRows、U.rng 种子随机、U.hash、U.ss
     每个函数的参数说明在各库文件的注释里：kit/packs/art/<库>.js（paint brush render post geom motion camera diagram typo chart ui collage toon transitions）。
     库里画的字（TY、CH、DG、CL、UI、TOON）会自动登记进检查；逐字、打字出现的字只登记得到当时画出来的那一截，
     这种地方自己补一句 if(REC) recText('整句', x, y, 字号, 对齐)。

   五、小工具
     snap('名字') → 画布   把主画布此刻的样子拍下来（给 P.rgbSplit、CAM.motionBlur 这类要一张源图的函数用）
     buf('名字') → 画布    一张和画面一样大的离屏画布，按名字复用
     on(ctx, fn)            封面 art(c,…) 里用：fn 里的 look、post 画到 ctx 上

   字体：库里的缺省字体名已经接到工坊的字体上（PuHui-* → 思源黑体，LXGWWenKai-500 → 霞鹜文楷），另带 Inter、CMU（公式）、PressStart2P（像素字）。
   不要引用原项目文档里别的字体名：没收进来，会悄悄回落成系统字体。 */

/* 这个文件只是入口：库在 kit/packs/art/ 里，一个文件一个库，按下面的顺序加载；最后的 index.js 是接合层。
   各库改自 alchaincyf/huashu-art-motion（MIT License，Copyright (c) 2026 alchaincyf）。许可全文：kit/packs/art/LICENSE；取了什么、改了什么：kit/packs/art/README.md */
window.PACK=window.PACK||{};window.PACK_INIT=window.PACK_INIT||[];
PACK.art={};
['util','motion','ik','paint','brush','render','post','geom','camera','diagram','typo','chart','ui','collage','toon','transitions','index']
  .forEach(m=>document.write('<script src="/kit/packs/art/'+m+'.js"><\/script>'));
