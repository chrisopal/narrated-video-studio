/* 风格包 · 艺术引擎（art）—— 收编自 alchaincyf/huashu-art-motion（MIT），接合层是本项目自己写的
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
       通用（任何画面都合适）：push 推页 · slidePush 横推（{bar:'#色'}）· whip 甩镜 · smash 砸镜 · blurPush 模糊推进 · fadeShift 淡出上移
             bands 色带擦除（{colors:[…]}）· fillZoom 冲进色块（{cx,cy,fill}）· zoomThrough 镜头穿越（{cx,cy,zoom}）· expandRect 卡片展开成全屏（{rect:{x,y,w,h}}）
             iris 圈入 · pageTurn 翻页 · tiles 石块砌入 · cube 立方体翻转 · wave 水波 · ripple 涟漪（{cx,cy}）· pixelate 像素化 · zigzag 锯齿 · shards 碎片
       带画种味道的（进入那种画风的一场时用）：inkBloom 墨晕（{cx,cy}）· dabs 色点 · swirl 旋笔 · pointill 点彩 · mosaic 马赛克 · goldLeaf 贴金
             godRays 天光 · chiaroscuro 明暗 · lampGlow 灯晕 · flareSweep 光扫 · irisFilm 老胶片圈入 · blueBrush 蓝色干笔 · organic 藤蔓曲线
             bauhaus 几何色块 · redWedge 红楔 · comicPanels 漫画分格 · dotBloom 圆点 · cutouts 剪纸 · wireframe 线框 · screamWarp 扭曲 · apsara 飘带
             melt 融化 · sunShaft 光柱 · bleed 洇开 · vhs 录像带撕裂
       全部名字：Object.keys(TR)。带坐标的转场，不给 cx、cy 时用画面中心。
     seq(t, 第一场, ['名字', 切点, 时长, 下一场, {…}], ['名字', 切点, 时长, 再下一场], …)   一串场景依次转场，不用一层套一层；相邻转场的窗口不要重叠

   四、库：直接用上游的绘画库和动效库（第一个参数都是画笔，在主画布上就传 g）
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
     每个函数的参数说明在上游源码的注释里（legacy/huashu/lib/*.js，也原样留在这个文件里）。
     库里画的字（TY、CH、DG、CL、UI、TOON）会自动登记进检查；逐字、打字出现的字只登记得到当时画出来的那一截，
     这种地方自己补一句 if(REC) recText('整句', x, y, 字号, 对齐)。

   五、小工具
     snap('名字') → 画布   把主画布此刻的样子拍下来（给 P.rgbSplit、CAM.motionBlur 这类要一张源图的函数用）
     buf('名字') → 画布    一张和画面一样大的离屏画布，按名字复用
     on(ctx, fn)            封面 art(c,…) 里用：fn 里的 look、post 画到 ctx 上

   字体：库里的缺省字体名已经接到工坊的字体上（PuHui-* → 思源黑体，LXGWWenKai-500 → 霞鹜文楷），另带 Inter、CMU（公式）、PressStart2P（像素字）。
   不要引用上游文档里别的字体名：没收进来，会悄悄回落成系统字体。 */

/* ====== 接合：把上游的库接到工坊（手写） ====== */
/* 导出：look, post, trans, seq, snap, buf, on, LOOKS, TR, P, MO, CAM, DG, TY, CH, UI, CL, TOON, KIT, U, RIG */
U.setStage(W, H); DG.U = H / 8;                       // 库的画布尺寸跟工坊画布走（上游默认 1920×1080）；DG.U 是公式排版的单位，上游在加载时就按 1080 算好了
delete KIT.girlOrder; delete KIT.choreo; delete KIT.nearArm; delete PAINT.choreo; delete PAINT.cupCycle;   // 上游那支短片的角色编舞，角色没有收进来
delete TRANSITIONS.radiant;                            // 模仿一位画家招牌小人的转场，不收
const P = PAINT, TR = TRANSITIONS;

/* ---------- 字体：上游的缺省字体名接到工坊已有的字体文件上 ---------- */
const FACES = [
  { family: 'PuHui-Medium', url: '/kit/fonts/NotoSansSC-500.woff' }, { family: 'PuHui-Bold', url: '/kit/fonts/NotoSansSC-700.woff' },
  { family: 'PuHui-Heavy', url: '/kit/fonts/NotoSansSC-900.woff' }, { family: 'PuHui-Black', url: '/kit/fonts/NotoSansSC-900.woff' },
  { family: 'LXGWWenKai-500', url: '/kit/fonts/LXGWWenKai-500.woff' },
  { family: 'RobotoCondensed', url: '/kit/fonts/RobotoCondensed-var.woff', desc: { weight: '100 900' } },
  { family: 'Inter', url: '/kit/fonts/art/Inter-var.woff', desc: { weight: '100 900' } },
  { family: 'CMU-rm', url: '/kit/fonts/art/cmunrm.woff' }, { family: 'CMU-it', url: '/kit/fonts/art/cmunti.woff' },
  { family: 'PressStart2P-400', url: '/kit/fonts/art/PressStart2P-400.woff' },
];
// 同一个 family 给三个字重（上游当可变字体用，写 '600 30px "NotoSansSC"'）；宋体和工坊一样用本机的思源宋体
const FACES2 = [
  { family: 'NotoSansSC', src: 'url(/kit/fonts/NotoSansSC-500.woff)', desc: { weight: '100 599' } }, { family: 'NotoSansSC', src: 'url(/kit/fonts/NotoSansSC-700.woff)', desc: { weight: '600 799' } },
  { family: 'NotoSansSC', src: 'url(/kit/fonts/NotoSansSC-900.woff)', desc: { weight: '800 900' } },
  { family: 'NotoSerifSC', src: 'local("Noto Serif CJK SC"), local("NotoSerifCJKsc-Regular"), local("Noto Serif SC"), local("Songti SC"), local("STSong")', desc: { weight: '100 900' }, optional: true },
];
PACK_INIT.push(async () => {
  for (const f of FACES.map(f => ({ ...f, src: `url(${f.url})` })).concat(FACES2)) {
    try { const ff = new FontFace(f.family, f.src, f.desc || {}); await ff.load(); document.fonts.add(ff); }
    catch (e) { if (!f.optional) console.error('艺术引擎的字体没加载上：' + f.family); }
  }
  await U.loadCmaps(FACES);                              // 之后 U.assertGlyphs('PuHui-Black', '要画的字') 能查缺字
});

/* ---------- 画笔和缓冲 ---------- */
let G = g, CV = cv;                                     // on(ctx, fn) 临时换成封面的画布
const _buf = {};
// read：这张画布要被逐点取色，放在内存里（不然每帧都要从显卡读回来）
function buf(key, w = W, h = H, read) { let c = _buf[key]; if (!c || c.width !== w || c.height !== h) { c = _buf[key] = document.createElement('canvas'); c.width = w; c.height = h; if (read) c.getContext('2d', { willReadFrequently: true }); } return c; }
function copyTo(dst, src) { const x = dst.getContext('2d'); x.save(); x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.filter = 'none'; x.globalCompositeOperation = 'copy'; x.drawImage(src, 0, 0); x.restore(); return dst; }
function snap(key = 'snap', read) { return copyTo(buf('snap_' + key, CV.width, CV.height, read), CV); }
// 在“干净的画笔”下干活：不带调用方的变换、透明度、混合方式（返回调用方原来的透明度）
function flat(fn) { const a = G.globalAlpha; G.save(); G.setTransform(1, 0, 0, 1, 0, 0); G.globalAlpha = 1; G.globalCompositeOperation = 'source-over'; G.filter = 'none'; G.shadowColor = 'transparent'; G.setLineDash([]); try { fn(a); } finally { G.restore(); } }
function on(ctx, fn) { const g0 = G, c0 = CV; G = ctx; CV = ctx.canvas; try { fn(); } finally { G = g0; CV = c0; } }
const full = () => CV.width === W && CV.height === H;   // 上游的渲染器整帧取色，只认和画面一样大的画布

/* ---------- 重绘 ---------- */
const TAU = Math.PI * 2;
// 点彩用的纯色板：第 0 个是最暗的色（暗侧光渗用），最后一个是近白（亮侧光渗用）；带几个和白调过的淡色，亮面才不会被拆成雪花点
const POINT_PAL = ['#1b2a6b', '#2f55b8', '#3f8f4f', '#d7332c', '#e9862a', '#f2c230', '#7a3f9a', '#8fb7e6', '#b9dba6', '#f2a79c', '#f6dc9a', '#c9b3de', '#fbf6e6'];
const POINT_COMP = { 1: 4, 4: 1, 2: 3, 3: 2, 5: 6, 6: 5 };   // 补色对：蓝↔橙、绿↔红、黄↔紫
const LOOKS = {
  // 旋动的短笔触（后印象派）。cell 笔触间距，len 笔长，width 笔宽，flow 方向场随时间转动的快慢（0 = 不动），swirl 方向场的弯曲程度，
  // outline 深色描边的浓度（0 = 不描），boil 每秒换几次笔触位置（默认 0：笔触位置固定，只有方向在缓缓转，不会满屏闪）
  vangogh(c, src, t, o) {
    const flow = o.flow ?? 1, sw = o.swirl ?? 1, f = 0.0014 * (o.scale || 1);
    P.strokes(c, src, { cell: o.cell || 12, len: o.len || 30, width: o.width || 7.5, seed: o.seed || 9, t, boil: o.boil || 0, outline: o.outline ?? 0.5, outlineMix: 0.45, outlineCol: o.outlineCol || [20, 25, 60], jitterCol: o.jitter ?? 20,
      angle: o.angle || ((x, y) => sw * 2.6 * Math.PI * P.fbm(x * f + 7.3, y * f + 3.1 + t * 0.03 * flow, 2) + 0.35 * Math.sin(t * 0.5 * flow + y * 0.004)) });
  },
  // 印象派色点：椭圆短点，带冷暖偏移。cell 间距，size 点大小，angle 点的朝向，shift 冷暖偏移量，boil 每秒换几次位置（默认 0）
  impression(c, src, t, o) { P.dabs(c, src, { cell: o.cell || 10, size: o.size || 9, seed: o.seed || 2, t, boil: o.boil || 0, angle: o.angle ?? -0.6, shift: o.shift ?? 22 }); },
  // 点彩：等大的纯色点两两并置，靠眼睛混色。pitch 点距，rad 点半径，pal 自己的纯色板（要带淡色），flicker 每次有多少比例的点换色（空气在颤），fps 换色的频率
  pointill(c, src, t, o) {
    const pal = o.pal || POINT_PAL;
    c.fillStyle = o.ground || '#f3ecd6'; c.fillRect(0, 0, W, H);
    P.pointillism(c, src, { pal, comp: o.pal ? (o.comp || {}) : POINT_COMP, pitch: o.pitch || 10, rad: o.rad || 4.5, t, fps: o.fps2 || 6, flicker: o.flicker ?? 0.05, colorJitter: o.colorJitter ?? 22, compRate: o.compRate ?? 0.04, white: o.white ?? pal.length - 1, dark: o.dark ?? 0, bleed: o.bleed ?? 45 });
  },
  // 马赛克：带缝的小石块。tile 石块大小，grout 缝的颜色，jitter 石块颜色的抖动
  mosaic(c, src, t, o) { P.mosaic(c, src, { tile: o.tile || 14, grout: o.grout || '#3b352e', seed: o.seed || 3, jitter: o.jitter ?? 0.25 }); },
  // 印刷网点：点的大小随明暗变。cell 网点间距，paper 纸色
  halftone(c, src, t, o) { P.halftone(c, src, { cell: o.cell || 14, paper: o.paper || '#f4ecd8', seed: o.seed || 4 }); },
  // 像素：size 一格几个像素，palette 调色板（[[r,g,b],…]，不给就不量化）
  pixel(c, src, t, o) { P.pixelate(c, src, { size: o.size || 8, palette: o.palette }); },
  // 立体主义切面：抖动的三角网，每块取偏了一点视角的颜色。nx、ny 网格数，shift 视角偏移量，edge 棱线颜色
  cubist(c, src, t, o) { P.facets(c, src, { nx: o.nx || 22, ny: o.ny || 13, seed: o.seed || 5, t, shiftAmt: o.shift ?? 26, edge: o.edge || 'rgba(40,30,20,.45)' }); },
};
const _lk = {};
function look(name, t, o = {}) {
  const L = LOOKS[name]; if (!L) { console.error('art.look 没有这个名字：' + name + '（有：' + Object.keys(LOOKS).join(' ') + '）'); return; }
  if (!full()) { console.error('art.look 只能画在和画面一样大的画布上'); return; }
  const mix = cl(o.mix ?? 1); if (mix <= 0 && !o.draw) return;
  const id = name + '|' + (o.key || ''), out = buf('look_out_' + id);
  const paint = (src, ts) => { const x = out.getContext('2d'); copyTo(out, src); x.save(); L(x, src, ts, o); x.restore(); };
  const blit = a => { G.globalAlpha = a; if (o.rect) { G.beginPath(); G.rect(...o.rect); G.clip(); } G.drawImage(out, 0, 0); };
  if (!o.draw) { flat(() => { paint(snap('look_src', true), t); blit(mix); }); return; }
  // 步进形式：按 fps 量化时间；同一步里的帧直接用上一次的结果。检查扫描时（REC）每帧都重画，文字才登记得全
  const fps = o.fps || 12, ts = Math.floor(t * fps + 1e-6) / fps, st = _lk[id] || (_lk[id] = {});
  if (REC || G !== g || st.ts !== ts) {
    const keep = snap('look_keep');
    flat(() => G.clearRect(0, 0, W, H));
    G.save(); G.globalAlpha = 1; if (o.bg !== false) flat(() => TH.bg(ts)); o.draw(ts); G.restore();
    flat(() => { paint(snap('look_src', true), ts); copyTo(CV, keep); });
    st.ts = ts;
  }
  flat(a => blit(a * mix));
}

/* ---------- 后期 ---------- */
const D = Math.hypot(W, H);
const POSTS = {
  // 老胶片：fps 闪烁的帧率，scratches 竖划痕条数，dust 灰尘点数，gate:false 不要四周的片门暗边，flicker:[底,幅,暗] 闪烁强度
  film(t, o) { P.film(G, t, o); },
  // 录像带：色差错位＋从上往下滚的噪声带＋扫描线。band 噪声带高度，bandSpeed 滚动速度，osd:{label,date,clock} 左上角和左下角的机器字（默认不要：会进字幕带）
  vhs(t, o) { const S = snap('vhs'); P.vhs(G, S, t, o.lt ?? t, { osd: false, vignette: false, ...o }); if (o.vignette !== false) P.vignette(G, { inner: D * 0.227, outer: D * 0.522, col: typeof o.vignette === 'string' ? o.vignette : 'rgba(10,0,25,.55)' }); },
  // 泛光：整帧缩小糊化后叠回去。alpha 强度，blur 糊的程度，brightness
  bloom(t, o) { P.bloom(G, o); },
  // 暗角：col 颜色和浓度（'rgba(0,0,0,.4)'），inner、outer 起止半径，cx、cy 中心
  vignette(t, o) { P.vignette(G, o); },
  // 褪色/染色：sat 去色的程度（1 = 全灰），tint 再乘一层颜色（暖灰 '#f2e8d2' 像老照片）
  fade(t, o) { P.fade(G, { sat: 0.6, ...o }); },
  // 扫描线：a1、a2 两道线的浓度
  scan(t, o) { P.scanlines(G, o.a1 ?? 0.28, o.a2 ?? 0.12); },
  // 三色错位：r、g、b 各自的偏移 [dx,dy]
  rgb(t, o) { P.rgbSplit(G, snap('rgb'), o); },
  // 镜头光晕：sun:[x,y] 光源位置（必给），core 光核半径，streak 横向拉丝长度
  flare(t, o) { if (!o.sun) { console.error("art.post('flare') 要给 sun:[x,y]"); return; } P.lensFlare(G, o.sun, t, o); },
  // 明暗法：整幅乘一张光照图。ambient 环境光（越暗反差越大），pools:[[x,y,半径,'r,g,b',强度],…] 几团光；光可以每帧动（烛光的晃动自己用 t 算进半径和强度里）
  light(t, o) { P.applyLight(G, P.lightMap('art_' + (o.key || ''), o.ambient || 'rgb(36,26,18)', m => (o.pools || [[W * 0.5, H * 0.45, D * 0.4, '255,220,170', 0.95]]).forEach(q => P.pool(m, q[0], q[1], q[2], q[3] || '255,220,170', q[4] ?? 0.9)))); },
};
function post(name, t, o = {}) {
  const f = POSTS[name]; if (!f) { console.error('art.post 没有这个名字：' + name + '（有：' + Object.keys(POSTS).join(' ') + '）'); return; }
  if (!full()) { console.error('art.post 只能画在和画面一样大的画布上'); return; }
  const k = cl(o.mix ?? 1); if (k <= 0) return;
  if (k >= 1) { flat(() => f(t, o)); return; }
  const before = snap('post_keep');                     // mix<1：先叠满，再把叠之前的样子按 1-mix 盖回去
  flat(() => { f(t, o); G.globalAlpha = 1 - k; G.drawImage(before, 0, 0); });
}

/* ---------- 转场 ---------- */
// 通用用法和 xfade 一致：切点前后各占一半时长。o.lead 改“切点之前占多少”（0..1，默认 .5）；其余参数原样交给上游的转场函数。
function trans(type, t, tCut, d, drawA, drawB, o = {}) {
  const f = TR[type]; if (!f) { console.error('art.trans 没有这个转场：' + type); drawB(1); return; }
  const a = tCut - d * (o.lead ?? 0.5), b = a + d;
  if (t < a) { drawA(0); return; } if (t >= b) { drawB(1); return; }
  const p = cl((t - a) / d), keep = snap('tr_keep'), n0 = REC ? REC.tx.length : 0;
  G.save(); G.globalAlpha = 1; drawA(p); G.restore(); const A = snap('tr_A'), n1 = REC ? REC.tx.length : 0;
  flat(() => copyTo(CV, keep));
  G.save(); G.globalAlpha = 1; drawB(p); G.restore(); const B = snap('tr_B');
  if (REC) REC.tx.forEach((r, i) => { if (i >= n0) r[5] = +(r[5] * (i < n1 ? 1 - p : p)).toFixed(2); });   // 两场的字各按进度算可见度，检查不会把它们当成同时在场
  flat(() => { G.clearRect(0, 0, W, H); f(G, A, B, p, { cx: W / 2, cy: H / 2, ...o, id: o.id || type + '@' + tCut.toFixed(2), from: '', lt: t - a, t, W, H, dur: d, tmp: buf('tr_tmp'), IMG: {} }); G.globalAlpha = 1; G.globalCompositeOperation = 'source-over'; G.filter = 'none'; });
}

// 一串场景依次转场：seq(t, 第一场, ['转场名', 切点, 时长, 下一场, {参数}], ['转场名', 切点, 时长, 再下一场], …)
// 每一场是一个画完整画面的函数。相邻两个转场的窗口不要重叠（重叠时后一个说了算，前一个会被掐断）。
function seq(t, first, ...steps) {
  let i = -1; steps.forEach(([, tc, d, , o = {}], k) => { if (t >= tc - d * (o.lead ?? 0.5)) i = k; });
  if (i < 0) { first(0); return; }
  const [type, tc, d, draw, o = {}] = steps[i]; trans(type, t, tc, d, i ? steps[i - 1][3] : first, draw, o);
}

/* ---------- 文字登记：库里直接 fillText 的字，检查时也要看得见 ---------- */
// 做法：只在“正在调用艺术引擎的库函数、画在主画布上、检查扫描中”这三个条件同时成立时，记下 fillText 的外框。
// 一次调用里逐字画出来的一串字，合成一条（用调用时传进来的那个整串）；否则检查会把每个字当成一段独立的文字。
let _depth = 0, _glyphs = null;
(() => {
  const C2 = CanvasRenderingContext2D.prototype;
  for (const fn of ['fillText', 'strokeText']) {
    const orig = C2[fn];
    C2[fn] = function (text, x, y) {
      if (_depth && REC && this === g && this.globalAlpha > 0.02 && String(text).trim()) {
        const s = String(text), m = this.measureText(s), T = this.getTransform(), sc = Math.sqrt(Math.abs(T.a * T.d - T.b * T.c)), px = (parseFloat((/([\d.]+)px/.exec(this.font) || [0, 0])[1]) || 0) * sc;
        const X = [], Y = [];
        for (const [u, v] of [[x - m.actualBoundingBoxLeft, y - m.actualBoundingBoxAscent], [x + m.actualBoundingBoxRight, y - m.actualBoundingBoxAscent], [x - m.actualBoundingBoxLeft, y + m.actualBoundingBoxDescent], [x + m.actualBoundingBoxRight, y + m.actualBoundingBoxDescent]]) { X.push(T.a * u + T.c * v + T.e); Y.push(T.b * u + T.d * v + T.f); }
        _glyphs.push([s, Math.min(...X), Math.min(...Y), Math.max(...X), Math.max(...Y), this.globalAlpha, px]);
      }
      return orig.apply(this, arguments);
    };
  }
})();
function flush(args) {
  const L = _glyphs; _glyphs = null; if (!L || !L.length || !REC) return;
  const put = r => REC.tx.push([r[0], Math.round(r[1]), Math.round(r[2]), Math.round(r[3]), Math.round(r[4]), +r[5].toFixed(2), Math.round(r[6])]);
  const strs = args.filter(v => typeof v === 'string' && [...v].length > 1);
  const whole = L.length > 1 && L.every(r => [...r[0]].length === 1) ? strs.find(s => L.every(r => s.includes(r[0]))) : null;
  if (whole) { put([whole, Math.min(...L.map(r => r[1])), Math.min(...L.map(r => r[2])), Math.max(...L.map(r => r[3])), Math.max(...L.map(r => r[4])), Math.max(...L.map(r => r[5])), Math.max(...L.map(r => r[6]))]); return; }
  const seen = new Set();                                // 同一串字画两遍（描边＋填色）只记一次
  for (const r of L) { const k = r[0] + '|' + Math.round(r[1]) + '|' + Math.round(r[2]); if (!seen.has(k)) { seen.add(k); put(r); } }
}
const _wr = new WeakMap();
function watch(lib) {
  return new Proxy(lib, { get(tg, k) {
    const v = tg[k]; if (typeof v !== 'function') return v;
    let w = _wr.get(v); if (w) return w;
    w = function (...a) {
      if (!REC) return v.apply(tg, a);
      const top = !_depth; if (top) _glyphs = []; _depth++;
      try { const r = v.apply(tg, a); return r && typeof r === 'object' && Object.getPrototypeOf(r) === Object.prototype && Object.values(r).some(x => typeof x === 'function') ? watch(r) : r; }
      finally { _depth--; if (top) flush(a); }
    };
    _wr.set(v, w); return w;
  } });
}
DG = watch(DG); TY = watch(TY); CH = watch(CH); UI = watch(UI); CL = watch(CL); TOON = watch(TOON);
