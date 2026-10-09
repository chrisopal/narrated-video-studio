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
/* 由 legacy/tools/mkart.py 生成，不要手改这个文件：上游源码在 legacy/huashu/，接合代码在 legacy/tools/glue/art.js。
   上游：alchaincyf/huashu-art-motion，MIT License，Copyright (c) 2026 alchaincyf（花叔 · 花生）。许可全文见 legacy/huashu/LICENSE。 */
window.PACK=window.PACK||{};window.PACK_INIT=window.PACK_INIT||[];
PACK.art=(function(){
let U, PAINT, KIT, RIG, MO, CAM, DG, TY, CH, UI, CL, TOON, STAGE, TRANSITIONS, TR_UTIL;
/* ---------- 上游 lib/util.js（原样，仅做文件头说明的四类机械改动） ---------- */
// 通用工具（最先加载，转场库与引擎共用）
(() => {
// ---------- 工具 ----------
U = {
  TAU: Math.PI * 2,
  clamp: (x, a = 0, b = 1) => Math.max(a, Math.min(b, x)),
  lerp: (a, b, p) => a + (b - a) * p,
  // smoothstep：x 在 [a,b] 内平滑地从 0 走到 1（开场写出、渐显、段内节奏都用它）
  ss: (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); },
  // 把 p 的 [a,b] 段线性拉成 0..1（转场里分阶段用）
  seg: (p, a, b) => Math.max(0, Math.min(1, (p - a) / (b - a))),
  // 步进帧率：把连续时间量化成 fps 步——「一顿一顿」是很多风格的味道本身：
  // 橡皮管卡通 12fps（一拍二）、皮影杆操 10fps、哈林跳舞小人 8fps 硬切、手绘线条沸腾 8–12fps、胶片层 24fps。
  stepTime: (t, fps) => Math.floor(t * fps) / fps,
  ease: {
    linear: p => p,
    inOut: p => p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2,
    out: p => 1 - Math.pow(1 - p, 3),
    in: p => p * p * p,
    outBack: p => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); },
  },
  // 种子随机：mulberry32
  rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; },
  hash(i, j = 0) { let h = (i * 374761393 + j * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; },
  // 点列 → Path2D（折线）
  poly(pts, closed = true) { const p = new Path2D(); pts.forEach((q, i) => i ? p.lineTo(q[0], q[1]) : p.moveTo(q[0], q[1])); if (closed) p.closePath(); return p; },
};

// ---------- 字形检查 ----------
// 字体文件缺某个字时浏览器会静默回退到系统字体：measureText 不报错、宽度也对，换台机器就变样（迁移测试 B、D：全角字母、▶、「戏」「蓝」都踩过）。
// 做法：启动时（engine boot，字体加载完）把 FONT_FACES 里每个字体文件的 cmap 表读出来（WOFF1 用 DecompressionStream 解 zlib），查表判断有没有这个字。
// 不用 measureText 对比回退字体：macOS 上 Chromium 的逐字回退以首选字体为基准挑系统字体，两种写法会落到不同字体上，缺字也测不出来（实测误判）。
// font 可以是 family 名（'LXGWWenKai-500'）或 CSS 字体串（'80px "LXGWWenKai-500"'）。family 不在 FONT_FACES 里 → 当作全缺。
const famOf = font => { const m = /"([^"]+)"/.exec(font) || /'([^']+)'/.exec(font); return m ? m[1] : String(font).replace(/^(italic\s+|bold\s+|\d+\s+)*[\d.]+px\s+/, '').trim(); };
const CMAPS = {};
const inflate = async (buf) => new Uint8Array(await new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream('deflate'))).arrayBuffer());
async function readCmap(url) {
  const ab = await (await fetch(url)).arrayBuffer(), dv = new DataView(ab), sig = dv.getUint32(0);
  let tab = null;
  if (sig === 0x774F4646) {                                            // 'wOFF'
    const n = dv.getUint16(12);
    for (let i = 0; i < n; i++) { const o = 44 + i * 20; if (dv.getUint32(o) !== 0x636D6170) continue;   // 'cmap'
      const off = dv.getUint32(o + 4), comp = dv.getUint32(o + 8), orig = dv.getUint32(o + 12), raw = new Uint8Array(ab, off, comp);
      tab = comp < orig ? await inflate(raw) : raw.slice(); }
  } else {                                                             // 裸 TTF/OTF
    const n = dv.getUint16(4);
    for (let i = 0; i < n; i++) { const o = 12 + i * 16; if (dv.getUint32(o) === 0x636D6170) tab = new Uint8Array(ab, dv.getUint32(o + 8), dv.getUint32(o + 12)).slice(); }
  }
  if (!tab) throw new Error('没有 cmap 表');
  const t = new DataView(tab.buffer, tab.byteOffset, tab.byteLength), set = new Set(), nt = t.getUint16(2);
  for (let i = 0; i < nt; i++) {
    const so = t.getUint32(4 + i * 8 + 4), fmt = t.getUint16(so);
    if (fmt === 4) { const segX2 = t.getUint16(so + 6), ends = so + 14, starts = ends + segX2 + 2, deltas = starts + segX2, ros = deltas + segX2;
      for (let k = 0; k < segX2 / 2; k++) { const e = t.getUint16(ends + k * 2), s = t.getUint16(starts + k * 2), d = t.getInt16(deltas + k * 2), ro = t.getUint16(ros + k * 2);
        for (let ch = s; ch <= e && ch !== 0xFFFF; ch++) { let g; if (!ro) g = (ch + d) & 0xFFFF; else { g = t.getUint16(ros + k * 2 + ro + (ch - s) * 2); if (g) g = (g + d) & 0xFFFF; } if (g) set.add(ch); } } }
    else if (fmt === 12 || fmt === 13) { const ng = t.getUint32(so + 12); for (let k = 0; k < ng; k++) { const o = so + 16 + k * 12, s = t.getUint32(o), e = t.getUint32(o + 4), g = t.getUint32(o + 8);
      for (let ch = s; ch <= e; ch++) if (fmt === 13 ? g : g + ch - s) set.add(ch); } }
    else if (fmt === 0) { for (let ch = 0; ch < 256; ch++) if (t.getUint8(so + 6 + ch)) set.add(ch); }
    else if (fmt === 6) { const first = t.getUint16(so + 6), cnt = t.getUint16(so + 8); for (let k = 0; k < cnt; k++) if (t.getUint16(so + 10 + k * 2)) set.add(first + k); }
  }
  return set;
}
// 引擎 boot 里调用一次（字体加载之后）。读失败的字体记 console.error，不阻断启动。
U.loadCmaps = async (faces = window.FONT_FACES || []) => {
  await Promise.all(faces.map(async f => { try { CMAPS[f.family] = await readCmap(f.url); } catch (e) { console.error(`读不了字体 ${f.family} 的 cmap：${e}`); } }));
};
U.missingGlyphs = (font, text) => {
  const fam = famOf(font), cm = CMAPS[fam];
  const chars = [...new Set([...String(text)])].filter(ch => !/\s/.test(ch));
  if (!cm) return chars;
  return chars.filter(ch => !cm.has(ch.codePointAt(0)));
};
// 缺字就 console.error（qa.py / render.py 会把页面 console.error 当失败）。返回 true = 全都有。
U.assertGlyphs = (font, text, where = '') => {
  const fam = famOf(font), miss = U.missingGlyphs(font, text);
  if (miss.length) console.error(!CMAPS[fam] ? `字体「${fam}」没注册或没读到 cmap（lib/fonts.js 的 FONT_FACES）${where ? '（' + where + '）' : ''}`
    : `缺字形：字体「${fam}」里没有「${miss.join('')}」${where ? '（' + where + '）' : ''}——会静默回退系统字体。用 scripts/font_subset.py 补进子集，或改用路径自画。`);
  return miss.length === 0;
};
U.fontFamily = famOf;

})();

/* ---------- 上游 lib/motion.js（原样，仅做文件头说明的四类机械改动） ---------- */
// 动效时间库 MO：缓动、弹簧、步进、错开、拍号。全部是「时间 → 数值」的纯函数，不读时钟，确定性。
// 来源：YouTube 解说动画语法 8 支示范片（references/09-视频动画语法.md）。约定：p 是 0..1 的进度，t/lt 是秒。
//   选缓动的一句话：讲解（3b1b/白板）用 smooth/sineInOut 两端都停稳；发布会用 appleOut/弹簧；动态文字用 expoOut＋弹簧；
//   拼贴（Vox）相机用 sineInOut 或长尾 longTail，纸片按 12fps 步进；Kurzgesagt 动作用 k75，循环用 easyEase。
(() => {
const { clamp, lerp } = U;
MO = {};

// ---------- 画布尺寸（片段渲染用） ----------
// 引擎和全部示范片是 1920×1080。clip.html（口播管线的参数化片段）可能是竖屏 1080×1920：
// 用到屏幕尺寸的库（CAM / UI / CH / DG / CL）用 U.onStage 登记，clip.js 启动时 U.setStage(w, h) 一次性改掉。
const stageHooks = [];
STAGE = { W: 1920, H: 1080 };
U.onStage = f => { stageHooks.push(f); };
U.setStage = (w, h) => { STAGE = { W: w, H: h }; stageHooks.forEach(f => f(w, h)); };

// ---------- 时间片 ----------
MO.seg = (t, a, b) => clamp((t - a) / (b - a));                          // [a,b] → 0..1
MO.at = (t, t0, dur) => clamp((t - t0) / dur);                           // [t0, t0+dur] → 0..1
MO.anim = (lt, start, dur, ease = MO.smooth) => ease(clamp((lt - start) / dur));
// 步进时间：把连续时间量化成 fps 步。拼贴纸片/打字/荧光笔「一拍二」= 12fps；故事型角色 24fps；相机仍按 60fps 平滑。
MO.step = (t, fps = 12) => Math.floor(t * fps + 1e-6) / fps;

// ---------- manim 缓动（3b1b/manim rate_functions.py） ----------
// smooth = 6t⁵−15t⁴+10t³：两端速度、加速度都为 0。讲解类片子的默认缓动。
MO.smooth = t => { t = clamp(t); return t * t * t * (10 - 15 * t + 6 * t * t); };
const sig = x => 1 / (1 + Math.exp(-x));
MO.smoothCE = (t, inflection = 10) => { const e = sig(-inflection / 2); return clamp((sig(inflection * (t - 0.5)) - e) / (1 - 2 * e)); };   // ManimCE 版
MO.thereAndBack = t => MO.smooth(t < 0.5 ? 2 * t : 2 * (1 - t));          // Indicate 用：去了又回
MO.rushInto = t => 2 * MO.smooth(t / 2);                                  // 慢起、冲进终点
MO.rushFrom = t => 2 * MO.smooth(t / 2 + 0.5) - 1;                        // 冲出、慢收
MO.doubleSmooth = t => t < 0.5 ? 0.5 * MO.smooth(2 * t) : 0.5 * (1 + MO.smooth(2 * t - 1));
MO.wiggle = (t, wiggles = 2) => MO.thereAndBack(t) * Math.sin(wiggles * Math.PI * t);
// manim LaggedStart(lag_ratio=r)：n 个子动画里第 i 个在总进度 p 下的局部进度。总长 = 1+(n-1)·r 个单位，第 i 个占 [i·r, i·r+1]。
MO.lagged = (i, n, p, r = 0.05) => clamp(p * (1 + (n - 1) * r) - i * r);

// ---------- 常用解析缓动（AE / CSS 名字） ----------
MO.linear = p => p;
MO.sineInOut = p => -(Math.cos(Math.PI * p) - 1) / 2;
MO.cubicIn = p => p * p * p;
MO.cubicOut = p => 1 - Math.pow(1 - p, 3);
MO.cubicInOut = p => p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
MO.quartOut = p => 1 - Math.pow(1 - p, 4);
MO.quintOut = p => 1 - Math.pow(1 - p, 5);
MO.quintInOut = p => p < .5 ? 16 * p ** 5 : 1 - Math.pow(-2 * p + 2, 5) / 2;
MO.expoIn = p => p <= 0 ? 0 : Math.pow(2, 10 * p - 10);
MO.expoOut = p => p >= 1 ? 1 : 1 - Math.pow(2, -10 * p);                // 动效设计最常用的「快出慢停」
MO.expoInOut = p => p <= 0 ? 0 : p >= 1 ? 1 : p < .5 ? Math.pow(2, 20 * p - 10) / 2 : (2 - Math.pow(2, -20 * p + 10)) / 2;
// backOut 过冲：s=1.70158 约 10%；2.2 约 13%；2.6 约 17%；3.5 约 23%
MO.backOut = (p, s = 1.70158) => { const q = p - 1; return 1 + (s + 1) * q * q * q + s * q * q; };
// 弹性落定：overshoot 一次再回（贴纸「啪」地落下）
MO.elasticOut = p => p <= 0 ? 0 : p >= 1 ? 1 : Math.pow(2, -10 * p) * Math.sin((p * 10 - 0.75) * (2 * Math.PI / 3)) + 1;

// ---------- CSS cubic-bezier(x1,y1,x2,y2)：牛顿法由 x 求参数，再取 y ----------
MO.bezier = (x1, y1, x2, y2) => {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const X = s => ((ax * s + bx) * s + cx) * s, Y = s => ((ay * s + by) * s + cy) * s, dX = s => (3 * ax * s + 2 * bx) * s + cx;
  return p => {
    if (p <= 0) return 0; if (p >= 1) return 1;
    let s = p; for (let k = 0; k < 8; k++) { const e = X(s) - p, d = dX(s); if (Math.abs(e) < 1e-6 || Math.abs(d) < 1e-6) break; s -= e / d; }
    s = clamp(s); return Y(s);
  };
};
MO.appleOut = MO.bezier(0.25, 0.1, 0.25, 1);        // CSS `ease`：苹果官网/发布会过渡
MO.emphasized = MO.bezier(0.2, 0, 0, 1);            // Material 3 emphasized：长尾减速
MO.k75 = MO.bezier(0.75, 0, 0.25, 1);               // Kurzgesagt「其他动作用 75% influence」（y1 调研 §6.2）
MO.easyEase = MO.bezier(0.333, 0, 0.667, 1);        // AE Easy Ease：循环动作
MO.longTail = MO.bezier(0.33, 0, 0.2, 1);           // Vox「沿线追过去」「拉出揭示」：起步快、长尾落定（y2 调研）

// ---------- 弹簧 ----------
// SwiftUI 参数化（WWDC23 Animate with springs）：stiffness=(2π/duration)²，damping=4π(1-bounce)/duration → ζ=1-bounce，ω=2π/duration。
// 返回 0→1 的位移（可 >1 = 过冲）。t 单位秒。发布会 UI 用它：.smooth(bounce 0) / .snappy(0.15) / .bouncy(0.3)。
MO.spring = (t, { duration = 0.5, bounce = 0, v0 = 0 } = {}) => {
  if (t <= 0) return 0;
  const w = 2 * Math.PI / duration, z = 1 - bounce;
  let x;                                                                 // x = 剩余位移（1→0）
  if (Math.abs(z - 1) < 1e-4) x = Math.exp(-w * t) * (1 + (w - v0) * t);
  else if (z < 1) { const wd = w * Math.sqrt(1 - z * z); x = Math.exp(-z * w * t) * (Math.cos(wd * t) + ((z * w - v0) / wd) * Math.sin(wd * t)); }
  else { const r = Math.sqrt(z * z - 1), a = -w * (z - r), b = -w * (z + r); const A = (-v0 - b) / (a - b); x = A * Math.exp(a * t) + (1 - A) * Math.exp(b * t); }
  return 1 - x;
};
MO.smoothSpring = t => MO.spring(t, { duration: 0.5, bounce: 0 });
MO.snappy = t => MO.spring(t, { duration: 0.5, bounce: 0.15 });
MO.bouncy = t => MO.spring(t, { duration: 0.5, bounce: 0.3 });
// 频率/衰减参数化的欠阻尼弹簧阶跃响应（动态文字用）：freq Hz、decay 1/s。
//   freq 3 / decay 6 第一次过冲 ≈37%（砸进来的大字）；2.5 / 9 ≈16%（常规弹入）；2.2 / 10 ≈8%（主词落定）
MO.springHz = (t, freq = 2.5, decay = 9) => t <= 0 ? 0 : 1 - Math.exp(-decay * t) * Math.cos(2 * Math.PI * freq * t);
// 到位后的余振（Dan Ebberts 惯性回弹）：amp·sin(2πft)/e^(decay·t)。换姿势的身体挤压、屏幕震动都用它。
MO.settle = (t, amp, freq = 3, decay = 5) => t <= 0 ? 0 : amp * Math.sin(2 * Math.PI * freq * t) / Math.exp(decay * t);

// ---------- 持续微动 ----------
// 漂浮：两频正弦叠加。周期避开 5s 左右（HIG：~0.2Hz 的持续摆动让人不适）
MO.float = (t, amp = 6, period = 4, ph = 0) => amp * (0.75 * Math.sin(2 * Math.PI * t / period + ph) + 0.25 * Math.sin(2 * Math.PI * t / (period * 0.53) + ph * 1.7));

// ---------- 反查与拍号 ----------
// 缓动的反函数（二分）：「线头/计数在什么时刻到达 y」。例：折线按 smooth 画，求画到某个 x 的时刻（t3 镜 2 的事件标注）。
MO.invert = (ease, y, iters = 30) => { let a = 0, b = 1; for (let i = 0; i < iters; i++) { const m = (a + b) / 2; if (ease(m) < y) a = m; else b = m; } return (a + b) / 2; };
// 拍 → 秒
MO.beat = (n, bpm = 120) => n * 60 / bpm;
// 揭开那一帧落在拍上：段起点 = 小节线 − 揭开点 × 转场时长（y5：zoom 揭开点 .55、色带 .6、push 到 90% 位移在 .58）
MO.onBeat = (barTime, revealP, trDur) => barTime - revealP * trDur;
})();

/* ---------- 上游 lib/rig_excerpt.js（原样，仅做文件头说明的四类机械改动） ---------- */
// 节选自 lib/rig.js（上游第 8–28 行，原样）：只取与角色无关的两个几何函数——二骨 IK 和粗细变化的圆头胶囊。
// 上游 rig.js 的其余部分是那支短片的少女和猫的骨架，属于片子内容，没有收进工坊。转场 cutouts 用到 RIG.limb。
(() => {
const { clamp, lerp } = U;
const R = RIG = {};

// 二骨 IK：肩 S，目标 T，上臂 a，前臂 b，bendSign 决定肘向
R.ik2 = (S, T, a, b, bendSign = 1) => {
  let dx = T[0] - S[0], dy = T[1] - S[1], d = Math.hypot(dx, dy);
  d = Math.min(d, a + b - 0.01);
  const ang = Math.atan2(dy, dx), cosA = clamp((a * a + d * d - b * b) / (2 * a * d), -1, 1);
  const e = ang + bendSign * Math.acos(cosA);
  const E = [S[0] + Math.cos(e) * a, S[1] + Math.sin(e) * a];
  const H = [S[0] + Math.cos(ang) * d, S[1] + Math.sin(ang) * d];
  return { E, H };
};
// 粗细变化的肢体：沿 A→B 画一个圆头胶囊。两端半圆帽朝外（逆时针从 n 走到 n-π）。
// 旧版 arc 方向反了，帽子凹进胶囊、路径自交，粗描边/平涂时关节处露洞（迁移测试 C：哈林小人被画成奶牛）。
R.limb = (A, B, wA, wB) => {
  const p = new Path2D(), a = Math.atan2(B[1] - A[1], B[0] - A[0]), n = a + Math.PI / 2;
  p.moveTo(A[0] + Math.cos(n) * wA / 2, A[1] + Math.sin(n) * wA / 2);
  p.lineTo(B[0] + Math.cos(n) * wB / 2, B[1] + Math.sin(n) * wB / 2);
  p.arc(B[0], B[1], wB / 2, n, n - Math.PI, true);
  p.lineTo(A[0] - Math.cos(n) * wA / 2, A[1] - Math.sin(n) * wA / 2);
  p.arc(A[0], A[1], wA / 2, n - Math.PI, n - 2 * Math.PI, true);
  p.closePath(); return p;
};
})();

/* ---------- 上游 lib/paint.js（原样，仅做文件头说明的四类机械改动） ---------- */
// 纯代码绘画工具库：噪声、纹理、手绘线、风格渲染器（笔触/色点/马赛克/网点/像素/切面）、共享编舞。
// 约定：所有随机都用种子；「抖动线条」按 boilFps 换种子（手绘动画的 boiling line），其余保持帧间稳定。
(() => {
const P = PAINT = {};
const { clamp, lerp, ease, rng } = U;

// ---------- 画布 ----------
P.canvas = (w = W, h = H) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const CACHE = {};
P.cached = (key, w, h, fn) => { if (!CACHE[key]) { const c = P.canvas(w, h); fn(c.getContext('2d'), c); CACHE[key] = c; } return CACHE[key]; };
P.scratch = (key) => { if (!CACHE['s_' + key]) CACHE['s_' + key] = P.canvas(); return CACHE['s_' + key]; };

// ---------- 噪声 ----------
const perm = new Uint8Array(512); { const r = rng(1337); const p = [...Array(256).keys()]; for (let i = 255; i > 0; i--) { const j = (r() * (i + 1)) | 0; [p[i], p[j]] = [p[j], p[i]]; } for (let i = 0; i < 512; i++) perm[i] = p[i & 255]; }
const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
const grad = (h, x, y) => { const u = (h & 1) ? x : -x, v = (h & 2) ? y : -y; return (h & 4) ? u + v * 0.5 : u * 0.5 + v; };
P.noise = (x, y) => {                                   // Perlin 2D，约 [-1,1]
  const X = Math.floor(x) & 255, Y = Math.floor(y) & 255; x -= Math.floor(x); y -= Math.floor(y);
  const u = fade(x), v = fade(y), a = perm[X] + Y, b = perm[X + 1] + Y;
  return lerp(lerp(grad(perm[a], x, y), grad(perm[b], x - 1, y), u), lerp(grad(perm[a + 1], x, y - 1), grad(perm[b + 1], x - 1, y - 1), u), v);
};
P.fbm = (x, y, o = 4) => { let s = 0, a = 0.5, f = 1; for (let i = 0; i < o; i++) { s += a * P.noise(x * f, y * f); a *= 0.5; f *= 2; } return s; };

// ---------- 颜色 ----------
P.hex = h => { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(x => x + x).join(''); const n = parseInt(h, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
P.rgb = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
P.mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
P.jitter = (c, r, amt) => [c[0] + (r() - .5) * amt, c[1] + (r() - .5) * amt, c[2] + (r() - .5) * amt];

// ---------- 纹理（缓存） ----------
// 纸/墙/岩石：底色 + 多层噪声斑驳 + 细颗粒
P.texture = (key, base, opt = {}) => P.cached('tex_' + key, W, H, (g) => {
  const { scale = 0.004, amt = 26, grain = 14, dark = null, seed = 1 } = opt;
  const img = g.createImageData(W, H), d = img.data, b = P.hex(base), r = rng(seed);
  const dk = dark ? P.hex(dark) : null;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const n = P.fbm(x * scale + seed, y * scale, 5), gr = (r() - .5) * grain;
    const i = (y * W + x) * 4;
    let c = b;
    if (dk) c = P.mix(b, dk, clamp(n * 1.2 + 0.25));
    d[i] = c[0] + n * amt + gr; d[i + 1] = c[1] + n * amt + gr; d[i + 2] = c[2] + n * amt * 0.8 + gr; d[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
});
// 颗粒噪点叠层（扁平插画的 grain、旧印刷）：透明底上的随机点
P.grain = (key, density = 0.08, col = [0, 0, 0], alpha = 0.18) => P.cached('grain_' + key, W, H, (g) => {
  const img = g.createImageData(W, H), d = img.data, r = rng(key.length * 97 + 3);
  for (let i = 0; i < W * H; i++) if (r() < density) { d[i * 4] = col[0]; d[i * 4 + 1] = col[1]; d[i * 4 + 2] = col[2]; d[i * 4 + 3] = 255 * alpha * (0.4 + r() * 0.6); }
  g.putImageData(img, 0, 0);
});
// 龟裂纹（古典油画）：随机游走的细裂线网
P.craquelure = (key, alpha = 0.35) => P.cached('crack_' + key, W, H, (g) => {
  const r = rng(77); g.strokeStyle = `rgba(40,25,10,${alpha})`; g.lineWidth = 0.8;
  for (let k = 0; k < 900; k++) {
    let x = r() * W, y = r() * H, a = r() * Math.PI * 2; g.beginPath(); g.moveTo(x, y);
    for (let s = 0; s < 6 + r() * 10; s++) { a += (r() - .5) * 1.6; x += Math.cos(a) * (6 + r() * 14); y += Math.sin(a) * (6 + r() * 14); g.lineTo(x, y); }
    g.stroke();
  }
});

// ---------- 手绘线 ----------
// 把折线/曲线采样后加噪声抖动；boil = 当前时间换种子的频率（0 = 不抖）
P.boilSeed = (t, fps = 12) => Math.floor(t * fps);
P.roughPath = (c, pts, { amp = 2, seed = 1, closed = false, step = 6 } = {}) => {
  const r = rng(seed);
  // 先按 step 重采样
  const out = [];
  const N = closed ? pts.length : pts.length - 1;
  for (let i = 0; i < N; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.round(L / step));
    for (let k = 0; k < n; k++) { const q = k / n; out.push([lerp(a[0], b[0], q) + (r() - .5) * amp, lerp(a[1], b[1], q) + (r() - .5) * amp]); }
  }
  if (!closed) out.push([pts[pts.length - 1][0] + (r() - .5) * amp, pts[pts.length - 1][1] + (r() - .5) * amp]);
  c.beginPath(); out.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); if (closed) c.closePath();
};
// 三次贝塞尔采样成点列（便于 roughPath / 变形）
P.bez = (p0, p1, p2, p3, n = 24) => { const o = []; for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; o.push([u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]); } return o; };
// SVG path 字符串 → Path2D（写复杂轮廓最省事）
P.path = (d) => new Path2D(d);

// ---------- 风格渲染器（对一张底稿 canvas 做「重画」） ----------
// 1) 流场笔触（梵高/印象派）：在抖动网格上取底稿颜色，沿 angle(x,y,t) 画短笔触，带深色描边
//    cap：宽笔（width ≥ 30）密排时圆头会连成一排排「人头/鹅卵石」（迁移测试 D 蓝色时期），改 'butt'。
//    boil：只给母题区域沸腾，静止区（地板、道具、角色）boil=0 种子固定——全屏 8fps 换种子读成满屏闪烁（迁移测试 C 莫奈）。
P.strokes = (dst, src, { cell = 12, len = 22, width = 7, angle, seed = 1, t = 0, boil = 8, outline = 0.35, outlineCol = [20, 25, 60], outlineMix = 0.55, jitterCol = 18, mask, alphaMask = false, palette, cap = 'round' } = {}) => {
  const sd = src.getContext('2d').getImageData(0, 0, W, H).data;
  const r = rng(seed * 1000 + P.boilSeed(t, boil));
  dst.lineCap = cap;
  for (let y = 0; y < H + cell; y += cell) for (let x = 0; x < W + cell; x += cell) {
    const px = x + (r() - .5) * cell, py = y + (r() - .5) * cell;
    const ix = clamp(px | 0, 0, W - 1), iy = clamp(py | 0, 0, H - 1), i = (iy * W + ix) * 4;
    if (mask && !mask(px, py)) continue;
    if (alphaMask && sd[i + 3] < 200) continue;
    let col = [sd[i], sd[i + 1], sd[i + 2]];
    const pc = palette ? palette(px, py, col, r) : null; if (pc) col = pc;       // 区域色板：从色组里抽一个颜色
    const a = angle ? angle(px, py, t) : 0, l = len * (0.7 + r() * 0.6);
    const dx = Math.cos(a) * l / 2, dy = Math.sin(a) * l / 2;
    if (outline > 0) { dst.strokeStyle = P.rgb(P.mix(col, outlineCol, outlineMix), outline); dst.lineWidth = width + 2.5; dst.beginPath(); dst.moveTo(px - dx, py - dy); dst.lineTo(px + dx, py + dy); dst.stroke(); }
    dst.strokeStyle = P.rgb(pc ? col : P.jitter(col, r, jitterCol)); dst.lineWidth = width;
    dst.beginPath(); dst.moveTo(px - dx, py - dy); dst.lineTo(px + dx, py + dy); dst.stroke();
  }
};
// 色组工具：给一组 hex 和权重，返回按随机数抽色的函数（配 strokes 的 palette 用）；mixBase 把底稿色混进来保留明暗
P.swatch = (hexes, mixBase = 0.35) => { const cs = hexes.map(P.hex); return (col, r) => { const k = cs[(r() * cs.length) | 0]; return P.mix(k, col, mixBase); }; };
// 2) 色点（印象派）：椭圆短点，颜色带冷暖偏移、大小不一。注意这不是点彩——修拉的点彩是「等大点＋纯色板视觉混色」，用 P.pointillism（lib/render.js）
P.dabs = (dst, src, { cell = 10, size = 9, seed = 2, t = 0, boil = 8, angle = -0.6, shift = 22 } = {}) => {
  const sd = src.getContext('2d').getImageData(0, 0, W, H).data, r = rng(seed * 1000 + P.boilSeed(t, boil));
  for (let y = 0; y < H + cell; y += cell) for (let x = 0; x < W + cell; x += cell) {
    const px = x + (r() - .5) * cell * 1.2, py = y + (r() - .5) * cell * 1.2;
    const i = (clamp(py | 0, 0, H - 1) * W + clamp(px | 0, 0, W - 1)) * 4;
    const warm = r() < 0.5 ? [shift, shift * 0.5, -shift] : [-shift * 0.6, 0, shift];
    dst.fillStyle = `rgb(${sd[i] + warm[0]},${sd[i + 1] + warm[1]},${sd[i + 2] + warm[2]})`;
    dst.beginPath(); dst.ellipse(px, py, size * (0.8 + r() * 0.6), size * 0.45, angle + (r() - .5) * 0.5, 0, Math.PI * 2); dst.fill();
  }
};
// 3) 马赛克：带缝隙的小石块，颜色取中心，略有抖动与倒角
P.mosaic = (dst, src, { tile = 14, grout = '#3b352e', seed = 3, jitter = 0.25 } = {}) => {
  const sd = src.getContext('2d').getImageData(0, 0, W, H).data, r = rng(seed);
  dst.fillStyle = grout; dst.fillRect(0, 0, W, H);
  for (let y = 0; y < H; y += tile) { const off = (y / tile) % 2 ? tile * 0.5 * jitter : 0; for (let x = -tile; x < W; x += tile) {
    const cx = x + off + tile / 2, cy = y + tile / 2, i = (clamp(cy | 0, 0, H - 1) * W + clamp(cx | 0, 0, W - 1)) * 4;
    const c = P.jitter([sd[i], sd[i + 1], sd[i + 2]], r, 14), s = tile * (0.82 + r() * 0.1);
    dst.fillStyle = P.rgb(c); dst.fillRect(cx - s / 2 + (r() - .5) * 1.5, cy - s / 2 + (r() - .5) * 1.5, s, s);
    dst.fillStyle = 'rgba(255,255,255,.12)'; dst.fillRect(cx - s / 2, cy - s / 2, s, 2);
  } }
};
// 4) 网点（本戴点）：颜色取中心，半径随暗度
P.halftone = (dst, src, { cell = 14, paper = '#f4ecd8', seed = 4 } = {}) => {
  const sd = src.getContext('2d').getImageData(0, 0, W, H).data;
  dst.fillStyle = paper; dst.fillRect(0, 0, W, H);
  for (let y = 0; y < H + cell; y += cell) for (let x = 0; x < W + cell; x += cell) {
    const cx = x + ((y / cell) % 2) * cell / 2, i = (clamp(y | 0, 0, H - 1) * W + clamp(cx | 0, 0, W - 1)) * 4;
    const L = (sd[i] * .3 + sd[i + 1] * .59 + sd[i + 2] * .11) / 255;
    dst.fillStyle = `rgb(${sd[i]},${sd[i + 1]},${sd[i + 2]})`;
    dst.beginPath(); dst.arc(cx, y, cell * 0.72 * (0.3 + (1 - L) * 0.9), 0, Math.PI * 2); dst.fill();
  }
};
// 5) 像素：最近邻降采样，可选调色板量化
P.pixelate = (dst, src, { size = 8, palette } = {}) => {
  const w = Math.ceil(W / size), h = Math.ceil(H / size), s = P.scratch('px'), g = s.getContext('2d');
  g.imageSmoothingEnabled = false; g.clearRect(0, 0, w, h); g.drawImage(src, 0, 0, w, h);
  if (palette) { const pal = palette.map(P.hex), im = g.getImageData(0, 0, w, h), d = im.data;
    for (let i = 0; i < d.length; i += 4) { let best = 0, bd = 1e9; for (let k = 0; k < pal.length; k++) { const q = pal[k], dd = (d[i] - q[0]) ** 2 + (d[i + 1] - q[1]) ** 2 + (d[i + 2] - q[2]) ** 2; if (dd < bd) { bd = dd; best = k; } } d[i] = pal[best][0]; d[i + 1] = pal[best][1]; d[i + 2] = pal[best][2]; }
    g.putImageData(im, 0, 0); }
  dst.imageSmoothingEnabled = false; dst.drawImage(s, 0, 0, w, h, 0, 0, w * size, h * size); dst.imageSmoothingEnabled = true;
};
// 6) 立体主义切面：抖动三角网，每块取「偏移视角」的颜色做线性渐变，描暗边
P.facets = (dst, src, { nx = 22, ny = 13, seed = 5, t = 0, shiftAmt = 26, edge = 'rgba(40,30,20,.45)' } = {}) => {
  const sd = src.getContext('2d').getImageData(0, 0, W, H).data, r = rng(seed);
  const pts = []; for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) { const e = i === 0 || j === 0 || i === nx || j === ny; pts.push([i / nx * W + (e ? 0 : (r() - .5) * W / nx * .9), j / ny * H + (e ? 0 : (r() - .5) * H / ny * .9)]); }
  const col = (x, y) => { const i = (clamp(y | 0, 0, H - 1) * W + clamp(x | 0, 0, W - 1)) * 4; return [sd[i], sd[i + 1], sd[i + 2]]; };
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const a = pts[j * (nx + 1) + i], b = pts[j * (nx + 1) + i + 1], c2 = pts[(j + 1) * (nx + 1) + i], d2 = pts[(j + 1) * (nx + 1) + i + 1];
    for (const tri of (r() < .5 ? [[a, b, d2], [a, d2, c2]] : [[a, b, c2], [b, d2, c2]])) {
      const cx = (tri[0][0] + tri[1][0] + tri[2][0]) / 3, cy = (tri[0][1] + tri[1][1] + tri[2][1]) / 3;
      const sh = Math.sin(t * 3 + cx * 0.01) * shiftAmt * r();
      const c0 = col(cx + sh, cy), c1 = P.mix(c0, [60, 45, 30], 0.35);
      const g = dst.createLinearGradient(tri[0][0], tri[0][1], tri[2][0], tri[2][1]); g.addColorStop(0, P.rgb(P.mix(c0, [255, 250, 235], 0.12))); g.addColorStop(1, P.rgb(c1));
      dst.fillStyle = g; dst.beginPath(); tri.forEach((p, k) => k ? dst.lineTo(p[0], p[1]) : dst.moveTo(p[0], p[1])); dst.closePath(); dst.fill();
      dst.strokeStyle = edge; dst.lineWidth = 1.5; dst.stroke();
    }
  }
};

// ---------- 共享编舞：16 个时代用同一套动作曲线，各自用自己的画法画出来 ----------
// lt = 本段局部时间（秒）。返回 0..1 或角度，时代代码按需取用。
// 端杯循环（全片时间）：2.4s 一轮——0.9s 举到嘴边、停 0.7s 喝、0.8s 放回
P.cupCycle = (t, period = 2.4) => { const q = ((t % period) + period) % period;
  if (q < 0.9) return 0.5 - 0.5 * Math.cos(q / 0.9 * Math.PI); if (q < 1.6) return 1; return 0.5 + 0.5 * Math.cos((q - 1.6) / 0.8 * Math.PI); };
P.choreo = (lt, t) => ({
  cupG: P.cupCycle(t),                                         // 按全片时间的端杯（跨段连续：速通片换段时姿势不重置）
  cup: 0.5 - 0.5 * Math.cos(Math.min(1, lt / 0.9) * Math.PI),   // 端杯：0=在桌上 1=在嘴边（约 0.9s 举起）
  sip: Math.max(0, Math.sin(lt * 6)) * 0.15,                    // 喝时头部微仰
  tail: Math.sin(t * 5.2) * 0.35 + Math.sin(t * 11) * 0.08,      // 猫尾摆（弧度）
  blink: (t % 2.3) > 2.18 ? 1 : 0,                              // 眨眼
  ear: Math.max(0, Math.sin(t * 9)) > 0.97 ? 1 : 0,
  breathe: Math.sin(t * 4) * 0.012,
  steam: t,                                                     // 热气用全局时间
});

// ---------- 通用元素 ----------
// 热气：几条随时间上行的正弦曲线（风格化的 S 形可传 width/color）
P.steam = (c, t, x, y, { h = 80, n = 3, color = 'rgba(255,255,255,.8)', width = 4, spread = 16, wobble = 10, seed = 1 } = {}) => {
  c.save(); c.lineCap = 'round'; c.lineWidth = width;
  for (let k = 0; k < n; k++) {
    const ox = (k - (n - 1) / 2) * spread, ph = t * 3 + k * 2.1 + seed;
    const g = c.createLinearGradient(0, y, 0, y - h); g.addColorStop(0, color); g.addColorStop(1, 'rgba(255,255,255,0)'); c.strokeStyle = g;
    c.beginPath(); for (let s = 0; s <= 20; s++) { const q = s / 20; const xx = x + ox + Math.sin(ph - q * 5) * wobble * q, yy = y - q * h; s ? c.lineTo(xx, yy) : c.moveTo(xx, yy); } c.stroke();
  }
  c.restore();
};
// 粒子：给定种子与时间，返回确定的粒子位置（飘落/上浮）
P.particles = (n, seed, t, { x0 = 0, x1 = W, y0 = -40, y1 = H + 40, speed = 80, drift = 30, life = 6 } = {}) => {
  const r = rng(seed), out = [];
  for (let i = 0; i < n; i++) { const bx = lerp(x0, x1, r()), ph = r() * life, sp = speed * (0.6 + r() * 0.8), q = ((t + ph) % life) / life;
    out.push({ x: bx + Math.sin((t + ph) * 1.7 + i) * drift, y: lerp(y0, y1, q), a: r() * Math.PI * 2 + t * (r() - .5) * 3, s: 0.6 + r() * 0.8, q, i }); }
  return out;
};
})();

/* ---------- 上游 lib/brush.js（原样，仅做文件头说明的四类机械改动） ---------- */
// 笔与水：毛笔飞白、两头尖单笔、墨晕晕染、长弯流线笔、水彩洗染、厚涂鬃毛笔、剪刀折线。全部挂在 PAINT（P）上。
// 来源：迁移测试 A（水墨/蒙克）、B（吉卜力）、C（马蒂斯）、D（伦勃朗）。确定性：所有随机都走种子。
//   P.brush(c, pts, opt)            毛笔：笔压起收＋湿笔芯＋逐根笔毛飞白，可按 reveal 写出（水墨、书法、白描衣纹）
//   P.leaf(c, x, y, ang, L, w)      两头尖的单笔（竹叶、兰叶、鸟翅、虾尾）
//   P.inkWash(c, key, grow, fn, o)  墨晕：形状先画到 scratch，再「外晕＋本体」两遍模糊 multiply 到纸上，grow 0→1 是洇开
//   P.flowSeeds / P.flowLines       长弯流线笔：种子沿随时间扭动的方向场积分成 200–300px 的长笔（蒙克，不是梵高的短笔）
//   P.deform / P.watercolor         水彩洗染：中点位移变形多边形 × 多层低 α multiply ＋ 每层淡描边＝水痕边（吉卜力背景）
//   P.rectPts / P.ellipsePts        洗染常用的多边形点列
//   P.impasto(c, pts, w, col, hi)   厚涂鬃毛笔：一笔＝若干平行细鬃（伦勃朗高光、梵高厚涂补笔）
//   P.cut(pts, seed, step, amp)     剪刀折线：沿轮廓每 step px 取点＋抖动、直线相连（马蒂斯剪纸、剪影、木刻）
(() => {
const P = PAINT;
const { clamp, lerp, rng, ss } = U;

// ---------- 毛笔 ----------
// pts 控制点（会 Catmull-Rom 加密再按 4px 等弧长重采样——不重采样的话飞白噪声频率随笔画长短变）
// w 最大宽；tone 墨色透明度（焦 .9／浓 .8／重 .6／淡 .35／清 .15）；dry 0..1 飞白程度（越到笔尾越干）；reveal 0..1 写出比例
// head/tail 起笔/收笔占比；bristles 笔毛数；col 墨色 [r,g,b]；per 加密倍数
// 坑：笔毛必须每根一条连续 path（butt 头）；按小段单独 stroke＋round 头，接头处会叠出一节节深点，像竹节/麻绳。
P.brush = (c, pts, { w = 10, tone = 0.85, dry = 0.45, seed = 1, reveal = 1, bristles = 8, col = [16, 14, 12], head = 0.12, tail = 0.4, per = 5 } = {}) => {
  if (reveal <= 0) return;
  const D = KIT.resample(KIT.densify(pts, per), 4), n = D.length, m = Math.max(2, Math.ceil(n * clamp(reveal)));
  const r = rng(seed * 7919);
  const prof = q => ss(0, head, q) * (1 - 0.7 * ss(1 - tail, 1, q)) * (0.85 + 0.15 * P.noise(seed * 3.3, q * 6)) + 0.08;
  c.save(); c.lineCap = 'butt'; c.lineJoin = 'round';
  const N = [];
  for (let i = 0; i < n; i++) { const A = D[Math.max(0, i - 1)], B = D[Math.min(n - 1, i + 1)]; let dx = B[0] - A[0], dy = B[1] - A[1]; const d = Math.hypot(dx, dy) || 1; N.push([-dy / d, dx / d]); }
  const core = q => w * prof(q) * (1 - dry * 0.85 * Math.pow(q, 0.8));
  // 湿的笔芯：整笔都有，越往后越细越淡（墨在用完）
  c.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${tone * 0.72})`; c.fill(KIT.ribbon(D.slice(0, m), (q, i) => core(i / (n - 1))));
  // 笔毛：每根一条连续线，按噪声断开（飞白＝笔毛之间露出的纸），越到笔尾断得越多
  for (let k = 0; k < bristles; k++) {
    const off = (k / (bristles - 1) - 0.5) * 0.95, bw = w / bristles * (0.9 + r() * 0.9), ph = r() * 50;
    c.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},${tone * (0.45 + r() * 0.35)})`; c.lineWidth = Math.max(0.7, bw);
    c.beginPath(); let on = false;
    for (let i = 0; i < m; i++) {
      const q = i / (n - 1), dryness = dry * Math.pow(q, 1.2);
      const vis = P.noise(k * 1.9 + ph, i * 0.09) * 0.5 + 0.5 > dryness * 0.95 + 0.05;
      const o = off * w * prof(q), x = D[i][0] + N[i][0] * o, y = D[i][1] + N[i][1] * o;
      if (vis) { on ? c.lineTo(x, y) : c.moveTo(x, y); on = true; } else on = false;
    }
    c.stroke();
  }
  c.restore();
};
// 两头尖的单笔（个字竹叶、兰叶描、鸟翅）：沿 ang 方向长 L，最宽 wmax，微弯
P.leaf = (c, x, y, ang, L, wmax, tone = 0.88, col = [16, 14, 12]) => {
  if (!Array.isArray(col)) col = [16, 14, 12];
  const pts = []; for (let i = 0; i <= 10; i++) { const q = i / 10, bend = Math.sin(q * Math.PI) * 0.08 * L; pts.push([x + Math.cos(ang) * L * q - Math.sin(ang) * bend, y + Math.sin(ang) * L * q + Math.cos(ang) * bend]); }
  c.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${tone})`; c.fill(KIT.ribbon(pts, q => wmax * Math.pow(Math.sin(Math.PI * Math.min(1, q * 1.1)), 0.7) + 0.6));
};

// ---------- 墨晕 / 晕染层 ----------
// fn(g) 在 scratch 上画形状（实色即可）；grow 0..1 控制洇开：外晕 blur 随 grow 变宽，本体 blur 随 grow 收紧。
// halo 外晕模糊半径、haloA 外晕透明度、blur 本体模糊、alpha 整体透明度。返回 scratch（可再拿来做留白挖洞）。
// 坑：multiply 是透明的，背后的墨线会透过晕染（窗台线透过猫耳）。先在剪影里补一层纸色（clip 后 drawImage 纸）再上晕染＝「先留出这块地方」。
P.inkWash = (c, key, grow, fn, { blur = 2, halo = 10, haloA = 0.22, alpha = 1 } = {}) => {
  const S = P.scratch('inkw_' + key), g = S.getContext('2d'); g.reset(); fn(g);
  c.save(); c.globalCompositeOperation = 'multiply';
  if (grow > 0) {
    c.globalAlpha = haloA * alpha * grow; c.filter = `blur(${(halo * (0.4 + grow)).toFixed(2)}px)`; c.drawImage(S, 0, 0);
    c.globalAlpha = alpha * ss(0, 0.6, grow); c.filter = `blur(${(blur * (1.6 - grow * 0.6)).toFixed(2)}px)`; c.drawImage(S, 0, 0);
  }
  c.filter = 'none'; c.restore();
  return S;
};

// ---------- 长弯流线笔（蒙克《呐喊》式表现主义） ----------
// 种子：cell 抖动网格，每个种子带两个随机数 [x, y, r1, r2]
P.flowSeeds = (cell = 24, seed = 5) => { const r = rng(seed), o = []; for (let y = -10; y < H + 10; y += cell) for (let x = -10; x < W + 10; x += cell) o.push([x + (r() - .5) * cell, y + (r() - .5) * cell, r(), r()]); return o; };
// 每个种子：region(x,y,t) 判区 → 取该区参数 params[reg] = [steps, step, width, alpha] → 沿 angle(x,y,t,reg) 积分；越出本区就停（区域边界干净）。
// color(reg, sx, sy, r1, t) 返回 [r,g,b]。不描边、半透明叠色——蒙克是薄涂长笔；照搬梵高的深色描边会变成一节节毛毛虫短笔。
// 底下先铺同色系平涂，笔缝里露出的是同色而不是黑。长度：steps 26–42、step 6–8，一根笔走 200–300px。
P.flowLines = (c, seeds, { t = 0, region, angle, color, params, extraSteps = 8 }) => {
  c.lineCap = 'round'; c.lineJoin = 'round';
  for (const [sx, sy, r1, r2] of seeds) {
    const reg = region(sx, sy, t); const pr = params[reg]; if (!pr) continue; const [steps, step, width, alpha] = pr;
    const col = color(reg, sx, sy, r1, t);
    let x = sx, y = sy; c.beginPath(); c.moveTo(x, y);
    const n = steps + ((r2 * extraSteps) | 0);
    for (let i = 0; i < n; i++) { const a = angle(x, y, t, reg); x += Math.cos(a) * step; y += Math.sin(a) * step; if (region(x, y, t) !== reg) break; c.lineTo(x, y); }
    c.strokeStyle = P.rgb(col, alpha); c.lineWidth = width * (0.7 + r2 * 0.6); c.stroke();
  }
};

// ---------- 水彩洗染（吉卜力式背景美术） ----------
// 中点位移：每轮在每条边中点沿法向推一个近似高斯量（3 个均匀数相加），幅度与边长成比例，每轮 amp×0.6
P.deform = (pts, depth, amp, r) => {
  let out = pts;
  for (let d = 0; d < depth; d++) {
    const n = [];
    for (let i = 0; i < out.length; i++) {
      const a = out[i], b = out[(i + 1) % out.length], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const g = (r() + r() + r() - 1.5) * amp * Math.min(1, len / 80), nx = -(b[1] - a[1]) / (len || 1), ny = (b[0] - a[0]) / (len || 1);
      n.push(a, [(a[0] + b[0]) / 2 + nx * g, (a[1] + b[1]) / 2 + ny * g]);
    }
    out = n; amp *= 0.6;
  }
  return out;
};
const fillPts = (g, pts) => { g.beginPath(); pts.forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.closePath(); };
// 一次洗染：基形 deform 3 轮；每层再 deform 2 轮、低 α 填（multiply = 透明颜料叠色）、α=edge 描 1.6px 同色边（颜料在边缘沉积 = 水痕边）。
// fill 可传渐变；不透明的白（窗框、云、桌布）用 blend:'source-over'、alpha .9。
// 常用：大墙 layers5 α.4 amp12；色晕 layers3 α.045 amp40；木板 layers3 α.5 amp3 edge.14。
// 坑：暗部用大幅变形多边形（amp 60），别用矩形拼——矩形接缝处会出硬边。色晕 α 别超 .05×3 层，否则房间像发霉的羊皮纸。
P.watercolor = (g, pts, color, { layers = 7, alpha = 0.13, amp = 10, seed = 1, edge = 0.1, blend = 'multiply', fill } = {}) => {
  const r = rng(seed * 7919 + 13), base = P.deform(pts, 3, amp, r);
  g.save(); g.globalCompositeOperation = blend; g.lineJoin = 'round';
  for (let k = 0; k < layers; k++) {
    const q = P.deform(base, 2, amp * 0.55, r);
    fillPts(g, q); g.globalAlpha = alpha; g.fillStyle = fill || color; g.fill();
    if (edge) { g.globalAlpha = edge; g.strokeStyle = color; g.lineWidth = 1.6; g.stroke(); }
  }
  g.restore();
};
P.rectPts = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
P.ellipsePts = (cx, cy, rx, ry, n = 18) => Array.from({ length: n }, (_, i) => [cx + Math.cos(i / n * Math.PI * 2) * rx, cy + Math.sin(i / n * Math.PI * 2) * ry]);

// ---------- 厚涂鬃毛笔 ----------
// 一笔 = round(w/1.3) 条平行细鬃（亮度各自 ±17 抖、两端随机缩 0–25%）＋下侧一条淡投影＋上侧零星亮点 → 读成「被刷开的一坨厚颜料」。
// 只用在受光处（金发、领口、瓷器、珍珠、白毛）。坑：画成「暗影＋主笔＋亮脊」三条整齐的线会读成白色贴纸/创可贴。
P.impasto = (c, pts, w, col, hi) => {
  const base = col.startsWith('#') ? P.hex(col) : [240, 230, 210];
  const A = pts[0], B = pts[pts.length - 1], ang = Math.atan2(B[1] - A[1], B[0] - A[0]), nx = -Math.sin(ang), ny = Math.cos(ang);
  const r = rng((A[0] * 13 + A[1] * 7) | 0), nb = Math.max(3, Math.round(w / 1.3));
  c.save(); c.lineCap = 'round';
  c.strokeStyle = 'rgba(40,18,6,.28)'; c.lineWidth = w * 0.9; c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p[0] + nx * w * 0.45 + 1, p[1] + ny * w * 0.45 + 1.5) : c.moveTo(p[0] + nx * w * 0.45 + 1, p[1] + ny * w * 0.45 + 1.5)); c.stroke();
  for (let k = 0; k < nb; k++) {
    const o = (k / (nb - 1) - 0.5) * w, s0 = r() * 0.25, s1 = 1 - r() * 0.25, sh = (r() - 0.5) * 34 + (k < nb / 2 ? 14 : -10);
    c.strokeStyle = P.rgb([base[0] + sh, base[1] + sh, base[2] + sh * 0.8], 0.55 + r() * 0.4); c.lineWidth = 1.4 + r() * 1.2; c.beginPath();
    const n = pts.length - 1; for (let i = 0; i <= 8; i++) { const q = lerp(s0, s1, i / 8), j = Math.min(n - 1, Math.floor(q * n)), f = q * n - j, x = lerp(pts[j][0], pts[j + 1][0], f) + nx * o, y = lerp(pts[j][1], pts[j + 1][1], f) + ny * o; i ? c.lineTo(x, y) : c.moveTo(x, y); }
    c.stroke();
  }
  c.fillStyle = hi || 'rgba(255,250,232,.7)'; for (let k = 0; k < 2 + w / 3; k++) { const q = r(), x = lerp(A[0], B[0], q) - nx * w * 0.3, y = lerp(A[1], B[1], q) - ny * w * 0.3; c.beginPath(); c.arc(x, y, 0.9 + r(), 0, Math.PI * 2); c.fill(); }
  c.restore();
};

// ---------- 剪刀折线 ----------
// 把一圈（闭合）点列按 step 重采样，每点加 ±amp 种子抖动，直线相连 → 手剪纸的边。RIG 部件可用 path.pts 喂进来重剪。
P.cut = (pts, seed, step = 18, amp = 2.5) => {
  const r = rng(seed), out = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.round(L / step));
    for (let k = 0; k < n; k++) { const q = k / n; out.push([lerp(a[0], b[0], q) + (r() - 0.5) * amp * 2, lerp(a[1], b[1], q) + (r() - 0.5) * amp * 2]); }
  }
  return U.poly(out);
};
})();

/* ---------- 上游 lib/render.js（原样，仅做文件头说明的四类机械改动） ---------- */
// 渲染器与光影：网点、点彩、赛璐珞、漫画阴影、体积、长影子、双版本光影、光照图、皮影皮件、手剪位移。全部挂在 PAINT（P）上。
// 来源：迁移测试 B（构成主义/达利/霍珀/吉卜力）、C（Kirby/修拉/马蒂斯）、D（伦勃朗/皮影/新海诚）。
//   P.halftoneGray(c, src, bx,by,bw,bh, cell, col, gain, ang)  灰度照片网点：45° 网格、点径 ∝ √暗度、全部点并成一条 path 一次填（照片拼贴）
//   P.shadeDots(c, path, bx,by,bw,bh, cell, col, f)           路径内按函数 f(x,y)∈0..1 落网点（网点阴影）
//   P.dotPattern(c, key, pitch, r, col, bg, angleDeg)          本戴点 createPattern，带网屏角（四色印刷 C15° M75° Y0° K45°）
//   P.pointillism(c, src, opt)                                 修拉点彩＝视觉混色：等大点、纯色板两两并置逼近目标色（P.dabs 是印象派，不是点彩）
//   P.clipBeside(c, path, dx, dy)                              clip 到「path 减去平移后的自身」——赛璐珞阴影带、Kirby 黑块、亮边的公共底
//   P.cel(c, p, base, shade, rim, opt)                         赛璐珞两调＋边缘光（新海诚、吉卜力角色）
//   P.kirbyShade(g, path, opt)                                 Kirby 黑块阴影（spotted blacks）＋羽化排线（feathering）
//   P.vol(c, path, x0,y0,x1,y1, a, b, occl, blur)              体积填色：线性渐变＋路径内模糊暗边（学院派，无勾线）
//   P.castShadow(c, layers, opt)                               剪切仿射长影子：剪影投到地面（达利的长影子、黄昏）
//   P.litClip(c, polys, drawLit)                               双版本光影裁切：背光版先画好，光斑多边形里画受光版（霍珀的硬光块）
//   P.pool / P.lightMap / P.applyLight                         光照图整幅相乘：环境光打底＋lighter 叠光池＋multiply（伦勃朗、烛光、夜景）
//   P.carve / P.piece / P.stamp                                皮影：皮件填色→镂空刻纹→补皮边→描边；印到幕布 = 软影＋multiply（剪影/镂空类风格）
//   P.roughen(layer, box, opt)                                 整层低频像素位移：RIG 角色的边也像手剪的（马蒂斯）
//   P.glowStroke(c, col, w, blur)                              霓虹灯管：对当前路径用 shadowBlur 描辉光（再描一道近白细芯线就是灯管）
(() => {
const TAU = Math.PI * 2;
const P = PAINT;
const { clamp, lerp, rng } = U;

// ---------- 网点 ----------
P.halftoneGray = (c, src, bx, by, bw, bh, cell, col, gain = 0.78, ang = Math.PI / 4) => {
  bx |= 0; by |= 0; bw |= 0; bh |= 0;
  const d = src.getContext('2d', { willReadFrequently: true }).getImageData(bx, by, bw, bh).data;
  const ca = Math.cos(ang), sa = Math.sin(ang), cx = bx + bw / 2, cy = by + bh / 2, R = Math.hypot(bw, bh) / 2;
  c.beginPath();
  for (let v = -R; v <= R; v += cell) for (let u = -R; u <= R; u += cell) {
    const x = cx + u * ca - v * sa, y = cy + u * sa + v * ca, ix = (x - bx) | 0, iy = (y - by) | 0;
    if (ix < 0 || iy < 0 || ix >= bw || iy >= bh) continue;
    const i = (iy * bw + ix) * 4; if (d[i + 3] < 128) continue;
    const L = (d[i] * .3 + d[i + 1] * .59 + d[i + 2] * .11) / 255, r = cell * gain * Math.sqrt(Math.max(0, 1 - L));
    if (r < 0.45) continue; c.moveTo(x + r, y); c.arc(x, y, r, 0, TAU);
  }
  c.fillStyle = col; c.fill();
};
P.shadeDots = (c, path, bx, by, bw, bh, cell, col, f) => {
  c.save(); c.clip(path); c.beginPath();
  for (let y = by; y < by + bh; y += cell) for (let x = bx + ((((y - by) / cell) | 0) % 2) * cell / 2; x < bx + bw; x += cell) {
    const r = cell * 0.62 * f(x, y); if (r < 0.5) continue; c.moveTo(x + r, y); c.arc(x, y, r, 0, TAU);
  }
  c.fillStyle = col; c.fill(); c.restore();
};
P.dotPattern = (c, key, pitch, r, col, bg, angleDeg = 45) => {
  const tile = P.cached('dotpat_' + key, pitch, pitch, g => { if (bg) { g.fillStyle = bg; g.fillRect(0, 0, pitch, pitch); } g.fillStyle = col;
    [[0, 0], [pitch, 0], [0, pitch], [pitch, pitch]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }); });
  const p = c.createPattern(tile, 'repeat');
  p.setTransform(new DOMMatrix().rotate(angleDeg));
  return p;
};

// ---------- 点彩（修拉：视觉混色） ----------
// 固定六角网格、点等大（pitch 10、rad 4.5、位置 ±1.2px 静态抖）；每个点从纯色板 pal 里挑一对 (i,j)：
//   目标色投影到 Pj→Pi 上得连续比例 w（clamp .2–.8），距离加 0.004·|Pi−Pj|² 惩罚（别用黑白点混出灰），格子哈希 < w 选 i 否则 j。
// 取色前给目标色加 ±colorJitter 哈希抖动——配对色分界变成交错的点，不出竖向色带（两个坑都踩过：偏好纯色→色带；连续比例→整列切换）。
// compRate 的点换成补色 comp[idx]；光渗：和 (+14,+6) 处亮度差 >45 时，亮侧放 white 点、暗侧放 dark 点。
// shimmer(x,y) 为真的区域按 fps 重掷哈希（水面波光）；flicker 比例的点按 fps 换成配对色（空气在颤，太低会被判「基本定格」）。
// 色板要带淡色（和白混过的色），否则亮墙被拆成白＋肤色＋零星蓝点，像雪花噪声。约 2.4 万点、每色一条 Path2D 一次 fill，每帧约 100ms。
const pointCache = new WeakMap();
P.pointillism = (c, src, { pal, comp = {}, pitch = 10, rad = 4.5, posJitter = 2.4, colorJitter = 40, compRate = 0.08, flicker = 0.07, fps = 6, t = 0, shimmer, white = 12, dark = 0, bleed = 45 } = {}) => {
  const PAL = pal.map(v => typeof v === 'string' ? P.hex(v) : v);
  let cache = pointCache.get(pal); if (!cache) { cache = new Map(); pointCache.set(pal, cache); }
  const pick = (r, g, b) => {
    const key = (r >> 3) << 10 | (g >> 3) << 5 | (b >> 3);
    let v = cache.get(key); if (v) return v;
    let best = 1e18, bi = 0, bj = 0, bw = 1;
    for (let i = 0; i < PAL.length; i++) for (let j = i + 1; j < PAL.length; j++) {
      const pi = PAL[i], pj = PAL[j], ex = pi[0] - pj[0], ey = pi[1] - pj[1], ez = pi[2] - pj[2];
      const w = clamp(((r - pj[0]) * ex + (g - pj[1]) * ey + (b - pj[2]) * ez) / (ex * ex + ey * ey + ez * ez + 1e-6), 0.2, 0.8);
      const dr = pj[0] + w * ex - r, dg = pj[1] + w * ey - g, db = pj[2] + w * ez - b;
      const d = dr * dr * 0.9 + dg * dg * 1.2 + db * db * 0.8 + ex * ex * 0.004 + ey * ey * 0.004 + ez * ez * 0.004;
      if (d < best) { best = d; bi = i; bj = j; bw = w; }
    }
    v = [bi, bj, bw]; cache.set(key, v); return v;
  };
  const sd = src.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, W, H).data;
  const L = (x, y) => { const i = (clamp(y | 0, 0, H - 1) * W + clamp(x | 0, 0, W - 1)) * 4; return sd[i] * 0.3 + sd[i + 1] * 0.59 + sd[i + 2] * 0.11; };
  const paths = PAL.map(() => new Path2D()), st = Math.floor(t * fps), ROWH = pitch * 0.866, hj = posJitter / 2;
  for (let j = 0, y = 0; y < H + ROWH; j++, y += ROWH) for (let i = 0, x = (j % 2) * pitch / 2; x < W + pitch; i++, x += pitch) {
    const jx = (U.hash(i, j * 7 + 1) - 0.5) * 2 * hj, jy = (U.hash(i * 3, j + 5) - 0.5) * 2 * hj, px = x + jx, py = y + jy;
    const k = (clamp(py | 0, 0, H - 1) * W + clamp(px | 0, 0, W - 1)) * 4;
    const dj = (U.hash(i * 7 + 3, j * 11) - 0.5) * colorJitter;
    const [a, bb, w] = pick(clamp(sd[k] + dj, 0, 255), clamp(sd[k + 1] + dj * 0.8, 0, 255), clamp(sd[k + 2] - dj * 0.6, 0, 255));
    const hseed = shimmer && shimmer(px, py) ? U.hash(i + st * 977, j) : U.hash(i, j);
    let idx = hseed < w ? a : bb;
    const h2 = U.hash(i * 5 + 2, j * 3 + 9);
    if (h2 < compRate && comp[idx] != null) idx = comp[idx];
    else if (U.hash(i * 13 + st * 31, j * 17) < flicker) idx = (U.hash(i, j + st) < w) ? bb : a;
    else { const dl = L(px, py) - L(px + 14, py + 6); if (Math.abs(dl) > bleed && h2 < 0.45) idx = dl > 0 ? white : dark; }
    paths[idx].moveTo(px + rad, py); paths[idx].arc(px, py, rad, 0, TAU);
  }
  paths.forEach((p, k) => { c.fillStyle = P.rgb(PAL[k]); c.fill(p); });
};

// ---------- 赛璐珞 / 漫画阴影 ----------
const BIG = (() => { const p = new Path2D(); p.rect(-60, -60, W + 120, H + 120); return p; })();
// clip 到 path ∩ ¬translate(path, dx, dy)：沿 (dx,dy) 方向的那一侧之外留下一条带（光从 -(dx,dy) 来时就是背光侧的阴影带）
P.clipBeside = (c, path, dx, dy) => { const m = new Path2D(); m.addPath(BIG); m.addPath(path, new DOMMatrix().translate(dx, dy)); c.clip(path); c.clip(m, 'evenodd'); };
// 底色 → 背光侧硬阴影带（宽 sd，光方向 (lx,ly) 指向光源的反方向：lx=-1 光从左来、阴影在右）→ 受光侧亮边（宽 rw）→ 细描线。
// 按部件顺序逐个 cel，遮挡天然正确，不需要 visibleLines。逆光（窗下的猫）：lx/ly 取反并另加 lighter 暖色亮边。
P.cel = (c, p, base, shade, rim, { sd = 22, rw = 7, line = '#6a4632', lw = 2.2, lx = -1, ly = -0.55 } = {}) => {
  if (!p) return;
  c.fillStyle = base; c.fill(p);
  if (shade) { c.save(); P.clipBeside(c, p, lx * sd, ly * sd); c.fillStyle = shade; c.fill(p); c.restore(); }
  if (rim) { c.save(); P.clipBeside(c, p, -lx * rw, -ly * rw); c.fillStyle = rim; c.fill(p); c.restore(); }
  if (lw) { c.strokeStyle = line; c.lineWidth = lw; c.lineJoin = 'round'; c.stroke(p); }
};
// Kirby：light 指向光源（默认左上），黑块 = path ∩ ¬shift(d1)，羽化带 = path ∩ ¬shift(d2) 里沿光方向的平行线（间距 gap）
P.kirbyShade = (g, path, { d1 = 14, d2 = 30, gap = 9, light = [-0.86, -0.5], ink = '#141212', lw = 2.6 } = {}) => {
  g.save(); P.clipBeside(g, path, light[0] * d2, light[1] * d2);
  g.strokeStyle = ink; g.lineWidth = lw; g.lineCap = 'butt'; g.beginPath();
  const a = Math.atan2(light[1], light[0]), nx = -Math.sin(a), ny = Math.cos(a);
  for (let k = -260; k < 260; k++) { const ox = 960 + nx * k * gap, oy = 540 + ny * k * gap; g.moveTo(ox - light[0] * 1400, oy - light[1] * 1400); g.lineTo(ox + light[0] * 1400, oy + light[1] * 1400); }
  g.stroke(); g.restore();
  g.save(); P.clipBeside(g, path, light[0] * d1, light[1] * d1); g.fillStyle = ink; g.fillRect(0, 0, W, H); g.restore();
};

// ---------- 体积 / 影子 / 光 ----------
P.vol = (c, path, x0, y0, x1, y1, a, b, occl = 'rgba(40,20,10,.45)', blur = 14) => {
  const g = c.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, a); g.addColorStop(1, b);
  c.fillStyle = g; c.fill(path);
  if (occl) { c.save(); c.clip(path); c.shadowColor = occl; c.shadowBlur = blur; c.strokeStyle = occl; c.lineWidth = blur * 0.6; c.stroke(path); c.restore(); }
};
// layers: [[yg, g => { 在 g 上用黑色画这一组物体的剪影 }], ...]，yg 是这组物体的着地线。
// 剪切仿射 y' = yg − ky·(yg − y)、x' = x − kx·(y' 方向的高度)，影子往右后方躺（太阳在左前方低空）；kx 变大 = 影子变长（黄昏）。
// 所有剪影先画进一张离屏（纯黑）再整体以 alpha 叠，重叠处不会加深；clipY 以下才是地面。坑：ky>0 往观众方向投会被画框底边吃掉。
P.castShadow = (c, layers, { kx = 1, ky = 0.22, clipY = 0, alpha = 0.55, blur = 1.5, key = 'castShadow' } = {}) => {
  const S = P.scratch(key), g = S.getContext('2d'); g.reset(); g.clearRect(0, 0, W, H); g.fillStyle = '#000'; g.strokeStyle = '#000';
  for (const [yg, fn] of layers) { g.setTransform(1, 0, -kx, ky, kx * yg, yg * (1 - ky)); fn(g); }
  g.setTransform(1, 0, 0, 1, 0, 0);
  c.save(); c.beginPath(); c.rect(0, clipY, W, H); c.clip(); c.globalAlpha = alpha; if (blur) c.filter = `blur(${blur}px)`; c.drawImage(S, 0, 0); c.restore();
};
// 双版本光影裁切：先把整幅画成背光版，再 clip 到光斑多边形（可多个、可每帧平移）画受光版 → 光影边缘是硬的、能整体移动。
// 人物同理：drawLit 里用受光色再画一遍。人在墙上的投影＝剪影平移后 source-in 背光版，再画回光斑里。
P.litClip = (c, polys, drawLit) => {
  c.save(); c.beginPath(); polys.forEach(pp => { pp.forEach((q, i) => i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1])); c.closePath(); }); c.clip(); drawLit(c); c.restore();
};
// 光池：径向渐变的一团光（col 为 'r,g,b' 字符串）
P.pool = (g, x, y, r, col, a) => { const rg = g.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, `rgba(${col},${a})`); rg.addColorStop(0.45, `rgba(${col},${a * 0.55})`); rg.addColorStop(1, `rgba(${col},0)`); g.fillStyle = rg; g.fillRect(x - r, y - r, 2 * r, 2 * r); };
// 光照图：ambient 打底（环境光，伦勃朗约 rgb(30,21,13) = 0.13），fn(g) 里用 P.pool 叠光池（已是 lighter），返回画布
P.lightMap = (key, ambient, fn) => {
  const S = P.scratch('light_' + key), g = S.getContext('2d'); g.reset();
  g.fillStyle = ambient; g.fillRect(0, 0, W, H); g.globalCompositeOperation = 'lighter'; fn(g); g.globalCompositeOperation = 'source-over';
  return S;
};
// 整幅乘光：亮态底稿 × 光照图。所有明暗法、烛光、夜景都这么做——比逐个物体画明暗统一得多。
P.applyLight = (c, map) => { c.save(); c.globalCompositeOperation = 'multiply'; c.drawImage(map, 0, 0); c.restore(); };

// ---------- 皮影 / 镂空 ----------
// 刻纹库（在 clip 内用 destination-out 画）：dots 鱼子纹、flowers 团花、clouds 云纹、lattice 方格、lines 刻线
P.carve = {
  dots(g, x0, y0, x1, y1, s = 18, r = 3.2) { for (let y = y0; y < y1; y += s) for (let x = x0 + ((y / s | 0) % 2) * s / 2; x < x1; x += s) { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); } },
  flowers(g, x0, y0, x1, y1, s = 46, r = 5) { for (let y = y0; y < y1; y += s) for (let x = x0 + ((y / s | 0) % 2) * s / 2; x < x1; x += s) { for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2; g.beginPath(); g.ellipse(x + Math.cos(a) * r * 1.5, y + Math.sin(a) * r * 1.5, r, r * 0.6, a, 0, 7); g.fill(); } } },
  clouds(g, x0, y0, x1, y1, s = 40) { g.lineWidth = 3.4; g.lineCap = 'round'; for (let y = y0; y < y1; y += s) for (let x = x0 + ((y / s | 0) % 2) * s / 2; x < x1; x += s) { g.beginPath(); for (let a = 0; a < 7; a += 0.3) { const rr = 2 + a * 1.9; const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr; a ? g.lineTo(px, py) : g.moveTo(px, py); } g.stroke(); } },
  lattice(g, x0, y0, x1, y1, s = 26, w = 12) { for (let y = y0; y < y1; y += s) for (let x = x0; x < x1; x += s) g.fillRect(x + (s - w) / 2, y + (s - w) / 2, w, w); },
  lines(g, segs, w = 3.2) { g.lineWidth = w; g.lineCap = 'round'; segs.forEach(sg => { g.beginPath(); sg.forEach((p, i) => i ? g.lineTo(...p) : g.moveTo(...p)); g.stroke(); }); },
};
// 一块皮件：填色 → carve(g) 在 clip 内镂空 → 补 edge 宽的同色皮边（刻纹不刻穿外轮廓）→ 深色描边。
// 白色部位（猫的白胸白爪）直接整块镂空只留皮边——所有剪影/镂空类风格都适用。
P.piece = (g, path, col, carve, { edge = 5, line = '#3a160a', lw = 2.6 } = {}) => {
  g.save(); g.fillStyle = col; g.fill(path);
  if (carve) { g.save(); g.clip(path); g.globalCompositeOperation = 'destination-out'; g.fillStyle = '#000'; g.strokeStyle = '#000'; carve(g); g.restore(); }
  g.strokeStyle = col; g.lineWidth = edge * 2; g.lineJoin = 'round'; g.save(); g.clip(path); g.stroke(path); g.restore();
  g.strokeStyle = line; g.lineWidth = lw; g.stroke(path); g.restore();
};
// 把一层皮件印到幕布上：先 multiply 一层偏移软影（皮件没贴紧幕布的虚影），再 multiply 本体（透光 = 幕布色 × 皮色，重叠处自然变深）
P.stamp = (c, layer, { dx = 7, dy = 5, shadow = 0.28, blur = 6 } = {}) => {
  c.save(); c.globalCompositeOperation = 'multiply'; c.globalAlpha = shadow; c.filter = `blur(${blur}px)`; c.drawImage(layer, dx, dy); c.restore();
  c.save(); c.globalCompositeOperation = 'multiply'; c.drawImage(layer, 0, 0); c.restore();
};

// ---------- 霓虹 ----------
P.glowStroke = (c, col, w, blur) => { c.shadowColor = col; c.shadowBlur = blur; c.strokeStyle = col; c.lineWidth = w; c.stroke(); c.shadowBlur = 0; };

// ---------- 手剪位移 ----------
// 对 layer 的 box=[x0,y0,x1,y1] 区域做静态低频位移（fbm 频率 freq、幅度 amp px）：RIG 角色不给剪刀折线时，整层边缘也像手剪的。约 15ms。
const fields = {};
P.roughen = (layer, box, { freq = 0.028, amp = 9, key = 'rough' } = {}) => {
  const [X0, Y0, X1, Y1] = box, w = X1 - X0, h = Y1 - Y0, fk = `${key}|${box}|${freq}|${amp}`;
  const f = fields[fk] || (fields[fk] = (() => { const o = { dx: new Int8Array(w * h), dy: new Int8Array(w * h) };
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const gx = (x + X0) * freq, gy = (y + Y0) * freq; o.dx[y * w + x] = Math.round(P.fbm(gx, gy, 2) * amp); o.dy[y * w + x] = Math.round(P.fbm(gx + 40, gy + 17, 2) * amp); } return o; })());
  const g = layer.getContext('2d', { willReadFrequently: true });
  const src = g.getImageData(X0, Y0, w, h), out = g.createImageData(w, h), s = src.data, o = out.data;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const k = y * w + x, sx = clamp(x + f.dx[k], 0, w - 1), sy = clamp(y + f.dy[k], 0, h - 1), j = (sy * w + sx) * 4, i = k * 4;
    o[i] = s[j]; o[i + 1] = s[j + 1]; o[i + 2] = s[j + 2]; o[i + 3] = s[j + 3]; }
  g.putImageData(out, X0, Y0);
};
})();

/* ---------- 上游 lib/post.js（原样，仅做文件头说明的四类机械改动） ---------- */
// 后期：整幅叠在画面上的「媒介层」。全部挂在 PAINT（P）上。
// 来源：迁移测试 B（蒸汽波 VHS、吉卜力角色水彩肌理）、D（橡皮管胶片、新海诚泛光/光晕）、A（敦煌褪色）。
//   P.rgbSplit(c, S, opt)               RGB 三通道分离错位：multiply 取单通道 → lighter 合成到黑底（VHS、故障、3D 眼镜）
//   P.vhs(c, S, t, lt, opt)             VHS 全套：通道分离＋跟踪噪声带下滚撕裂＋扫描线＋OSD＋暗角（先把整幅画进离屏 S）
//   P.scanlines(c, a1, a2)              4px 扫描线 pattern
//   P.film(c, t, opt)                   老胶片层：24fps 闪烁、跨格存活的竖划痕、灰尘毛发、颗粒抖动、圆角片门（1930 卡通、默片）
//   P.gateWeave(c, t, fn, amp)          抖片：fn 里画的内容整体按 24fps 微抖
//   P.bloom(c, opt)                     泛光：整帧缩小糊化后 screen 回叠（新海诚、CG）
//   P.lensFlare(c, sun, t, opt)         镜头光晕：太阳核＋慢转星芒＋横向拉丝＋沿 太阳→画心 的六边形光斑
//   P.textureInside(c, shapeLayer, drawTex, opt)  纹理只「乘」在角色上：纹理层 destination-in 角色剪影 → multiply 叠回
//   P.fade(c, opt)                      褪色/单色化：saturation 混合去色＋multiply 染色（壁画褪色、胶片单色）
//   P.vignette(c, opt)                  径向暗角
(() => {
const P = PAINT;
const { rng } = U;

// ---------- 通道分离 / VHS ----------
P.rgbSplit = (c, S, { r = [-3, 0], g = [0, 0], b = [3, 1], key = 'rgbSplit' } = {}) => {
  const T = P.scratch(key), tg = T.getContext('2d');
  c.save(); c.fillStyle = '#000'; c.fillRect(0, 0, W, H); c.globalCompositeOperation = 'lighter';
  [['#ff0000', r], ['#00ff00', g], ['#0000ff', b]].forEach(([col, [dx, dy]]) => {
    tg.globalCompositeOperation = 'source-over'; tg.clearRect(0, 0, W, H); tg.drawImage(S, 0, 0);
    tg.globalCompositeOperation = 'multiply'; tg.fillStyle = col; tg.fillRect(0, 0, W, H);
    c.drawImage(T, dx, dy);
  });
  c.restore();
};
P.scanlines = (c, a1 = 0.28, a2 = 0.12) => {
  const tile = P.cached(`scan_${a1}_${a2}`, 4, 4, g => { g.fillStyle = `rgba(0,0,0,${a1})`; g.fillRect(0, 0, 4, 1); g.fillStyle = `rgba(0,0,0,${a2})`; g.fillRect(0, 2, 4, 1); });
  c.save(); c.fillStyle = c.createPattern(tile, 'repeat'); c.fillRect(0, 0, W, H); c.restore();
};
// osd: false 关掉；或 {label:'PLAY', date:'SEP. 04 2011', clock:'23:59', font:'PressStart2P-400'}（▶ 自己画：像素字体里没有这个字形）
P.vhs = (c, S, t, lt, { osd = {}, band = 70, bandSpeed = 520, vignette = 'rgba(10,0,25,.55)' } = {}) => {
  const f = Math.floor(t * 60), jit = U.hash(f >> 2, 9) < 0.12 ? 1 : 0;
  const ca = 3 + jit * 6 + Math.sin(t * 7) * 1.5;                          // 色差错位量（偶发加大）
  P.rgbSplit(c, S, { r: [-ca, 0], g: [0, 0], b: [ca, 1], key: 'vhsSplit' });
  // 跟踪噪声带：从上往下滚，带内每 6px 横向撕裂＋白噪声线
  const by = ((lt * bandSpeed + 200) % (H + 160)) - 80, bh = band, r = rng(f * 7 + 1);
  for (let y = by; y < by + bh; y += 6) { const dx = (r() - 0.5) * 60 * Math.sin((y - by) / bh * Math.PI); c.drawImage(S, 0, y, W, 6, dx, y, W, 6); }
  c.save(); c.globalAlpha = 0.5; for (let i = 0; i < 90; i++) { c.fillStyle = r() < 0.5 ? '#ffffff' : '#bbbbbb'; c.fillRect(r() * W, by + r() * bh, 20 + r() * 120, 1.5); } c.restore();
  P.scanlines(c);
  if (osd) {
    const font = osd.font || 'PressStart2P-400';
    c.save(); c.font = `34px "${font}"`; c.fillStyle = '#ffffff'; c.shadowColor = 'rgba(0,0,0,.8)'; c.shadowOffsetX = 3; c.shadowOffsetY = 3;
    if ((f >> 4) % 2 === 0 || lt < 0.2) { c.fillText(osd.label || 'PLAY', 60, 92); c.beginPath(); c.moveTo(232, 60); c.lineTo(262, 77); c.lineTo(232, 94); c.closePath(); c.fill(); }
    c.font = `26px "${font}"`; c.fillText(osd.date || 'SEP. 04 2011', 60, 1020); c.fillText((osd.clock || '23:59') + ':' + String(30 + Math.floor(lt)).padStart(2, '0') + ':' + String(Math.floor(lt * 30) % 30).padStart(2, '0'), 60, 1056);
    c.restore();
  }
  if (vignette) P.vignette(c, { inner: 500, outer: 1150, col: vignette });
};

// ---------- 胶片 ----------
P.film = (c, t, { fps = 24, flicker = [0.02, 0.07, 0.06], scratches = 3, dust = 14, grain = 'film', grainDensity = 0.18, gate = true, ink = '20,16,10', light = '255,252,240' } = {}) => {
  const fq = Math.floor(t * fps), r = rng(fq * 7919 + 11);
  c.fillStyle = `rgba(255,250,235,${flicker[0] + r() * flicker[1]})`; c.fillRect(0, 0, W, H);
  c.fillStyle = `rgba(${ink},${r() * flicker[2]})`; c.fillRect(0, 0, W, H);
  // 竖划痕：用 floor(t*6) 当寿命，一条划痕能活好几格
  const r6 = rng(Math.floor(t * 6) * 131 + 5);
  for (let k = 0; k < scratches; k++) { const x = r6() * W + (r() - 0.5) * 6; c.strokeStyle = r6() < 0.5 ? `rgba(${light},.55)` : `rgba(${ink},.5)`; c.lineWidth = 1 + r6() * 2; c.beginPath(); c.moveTo(x, 0); c.lineTo(x + (r() - 0.5) * 12, H); c.stroke(); }
  for (let k = 0; k < dust; k++) { c.fillStyle = r() < 0.6 ? `rgba(${ink},.7)` : `rgba(${light},.8)`; c.beginPath(); c.arc(r() * W, r() * H, 1 + r() * 3.5, 0, 7); c.fill(); }
  if (r() < 0.5) { c.strokeStyle = `rgba(${ink},.6)`; c.lineWidth = 1.6; const x = r() * W, y = r() * H; c.beginPath(); c.moveTo(x, y); c.bezierCurveTo(x + 30, y - 20, x + 10, y + 40, x + 50, y + 30); c.stroke(); }
  if (grain) c.drawImage(P.grain(grain, grainDensity, ink.split(',').map(Number), 0.25), (r() - 0.5) * 40, (r() - 0.5) * 40);
  if (gate) c.drawImage(P.cached('film_gate', W, H, (g) => {
    const vg = g.createRadialGradient(W / 2, H / 2, Math.hypot(W, H) * 0.19, W / 2, H / 2, Math.hypot(W, H) * 0.522); vg.addColorStop(0, 'rgba(10,8,5,0)'); vg.addColorStop(0.7, 'rgba(10,8,5,.18)'); vg.addColorStop(1, 'rgba(10,8,5,.85)'); g.fillStyle = vg; g.fillRect(0, 0, W, H);
    g.fillStyle = '#0c0a07'; g.beginPath(); g.rect(0, 0, W, H); g.roundRect(18, 14, W - 36, H - 28, 60); g.fill('evenodd');
  }), 0, 0);
};
P.gateWeave = (c, t, fn, amp = [3, 4], fps = 24) => { const r = rng(Math.floor(t * fps) * 31 + 7); c.save(); c.translate((r() - 0.5) * amp[0], (r() - 0.5) * amp[1]); fn(); c.restore(); };

// ---------- 光 ----------
P.bloom = (c, { scale = 4, blur = 6, brightness = 1.1, alpha = 0.28, key = 'bloom' } = {}) => {
  const w = W / scale, h = H / scale, bl = P.scratch(key), g = bl.getContext('2d'); g.reset();
  g.filter = `blur(${blur}px) brightness(${brightness})`; g.drawImage(c.canvas, 0, 0, w, h);
  c.save(); c.globalCompositeOperation = 'screen'; c.globalAlpha = alpha; c.drawImage(bl, 0, 0, w, h, 0, 0, W, H); c.restore();
};
// 坑：太阳要放在玻璃里面、核半径 ≤130，否则光晕溢到墙上像墙上挂了盏灯；横丝别超过 ~840px，否则像 bug 线。
P.lensFlare = (c, sun, t, { core = 130, rays = 10, streak = 840, ghosts = [[0.45, 34, '120,255,200', 0.09], [0.75, 18, '255,180,120', 0.12], [1.25, 56, '140,170,255', 0.06], [1.6, 24, '255,140,220', 0.09], [2.0, 90, '120,220,255', 0.04]] } = {}) => {
  c.save(); c.globalCompositeOperation = 'lighter';
  const sg = c.createRadialGradient(...sun, 0, ...sun, core); sg.addColorStop(0, 'rgba(255,255,250,.95)'); sg.addColorStop(0.18, 'rgba(255,248,220,.55)'); sg.addColorStop(1, 'rgba(255,230,180,0)'); c.fillStyle = sg; c.beginPath(); c.arc(...sun, core, 0, 7); c.fill();
  for (let k = 0; k < rays; k++) { const a = k / rays * Math.PI * 2 + t * 0.25, L = (k % 2 ? 90 : 170) * (0.9 + 0.1 * Math.sin(t * 5 + k)); c.strokeStyle = 'rgba(255,250,235,.28)'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(...sun); c.lineTo(sun[0] + Math.cos(a) * L, sun[1] + Math.sin(a) * L); c.stroke(); }
  const hz = c.createLinearGradient(sun[0] - streak / 2, 0, sun[0] + streak / 2, 0); hz.addColorStop(0, 'rgba(120,200,255,0)'); hz.addColorStop(0.5, 'rgba(200,235,255,.35)'); hz.addColorStop(1, 'rgba(120,200,255,0)'); c.fillStyle = hz; c.fillRect(sun[0] - streak / 2, sun[1] - 2, streak, 4);
  const cxp = W / 2 + Math.sin(t * 0.7) * 20, cyp = H / 2;
  ghosts.forEach(([k, r, col, a]) => {
    const x = sun[0] + (cxp - sun[0]) * k, y = sun[1] + (cyp - sun[1]) * k; c.fillStyle = `rgba(${col},${a})`; c.beginPath(); for (let i = 0; i < 6; i++) { const aa = i / 6 * Math.PI * 2 + 0.3; i ? c.lineTo(x + Math.cos(aa) * r, y + Math.sin(aa) * r) : c.moveTo(x + Math.cos(aa) * r, y + Math.sin(aa) * r); } c.closePath(); c.fill(); });
  c.restore();
};

// ---------- 纹理叠在角色上 ----------
// shapeLayer：只画了角色的离屏（透明底）；drawTex(g) 往纹理层上画纸纹/颗粒/色晕。
// 坑：直接 source-atop 叠纸纹会把纸的颜色盖上去，人物整体发白；正确做法是纹理层 destination-in 角色剪影，再 multiply 叠回（迁移测试 B）。
P.textureInside = (c, shapeLayer, drawTex, { op = 'multiply', alpha = 1, key = 'texInside' } = {}) => {
  const M = P.scratch(key), mg = M.getContext('2d'); mg.reset(); mg.clearRect(0, 0, W, H);
  drawTex(mg);
  mg.globalCompositeOperation = 'destination-in'; mg.globalAlpha = 1; mg.drawImage(shapeLayer, 0, 0);
  c.save(); c.globalCompositeOperation = op; c.globalAlpha = alpha; c.drawImage(M, 0, 0); c.restore();
};

// ---------- 色调 ----------
// sat: saturation 混合灰的 α（1 = 完全去色）；tint: multiply 一层颜色（暖灰 '#f2e8d2' = 老胶片；土色纹理 = 壁画）
P.fade = (c, { sat = 1, tint } = {}) => {
  c.save(); c.globalCompositeOperation = 'saturation'; c.fillStyle = `rgba(128,128,128,${sat})`; c.fillRect(0, 0, W, H); c.restore();
  if (tint) { c.save(); c.globalCompositeOperation = 'multiply'; c.fillStyle = tint; c.fillRect(0, 0, W, H); c.restore(); }
};
P.vignette = (c, { cx = W / 2, cy = H / 2, inner = Math.hypot(W, H) * 0.236, outer = Math.hypot(W, H) * 0.522, col = 'rgba(0,0,0,.4)' } = {}) => {
  const vg = c.createRadialGradient(cx, cy, inner, cx, cy, outer); vg.addColorStop(0, col.replace(/[\d.]+\)$/, '0)')); vg.addColorStop(1, col); c.fillStyle = vg; c.fillRect(0, 0, W, H);
};
})();

/* ---------- 上游 lib/kit.js（原样，仅做文件头说明的四类机械改动） ---------- */
// 跨场景共用的小工具：点列加密/等弧长重采样、可变线宽路径 ribbon、整幅行/列扭曲、手绘不规则圆、全片连续编舞、近侧手臂补盖、角标。
// 渲染器在 lib/brush.js（笔与水）、lib/render.js（网点/点彩/赛璐珞/光影/皮影）、lib/post.js（VHS/胶片/泛光/纹理叠角色）。
(() => {
const { clamp, lerp, rng } = U;
const K = KIT = {};

// Catmull-Rom 加密点列（开放）
K.densify = (pts, per = 6) => {
  const out = [], n = pts.length, P_ = i => pts[Math.max(0, Math.min(n - 1, i))];
  for (let i = 0; i < n - 1; i++) {
    const p0 = P_(i - 1), p1 = P_(i), p2 = P_(i + 1), p3 = P_(i + 2);
    for (let k = 0; k < per; k++) {
      const t = k / per, t2 = t * t, t3 = t2 * t;
      out.push([0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
                0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)]);
    }
  }
  out.push(pts[n - 1]); return out;
};
// 按弧长等距重采样（让噪声、飞白、行波的频率与笔画长短无关）
K.resample = (pts, step = 4) => {
  const out = [pts[0]]; let acc = 0;
  for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i], L = Math.hypot(b[0] - a[0], b[1] - a[1]); let d = step - acc;
    while (d <= L) { const q = d / L; out.push([a[0] + (b[0] - a[0]) * q, a[1] + (b[1] - a[1]) * q]); d += step; } acc = L - (d - step); }
  out.push(pts[pts.length - 1]); return out;
};
// 可变线宽路径：点列两侧按 w(q) 偏移成闭合多边形（书法线、飘带、表现主义长笔）
K.ribbon = (pts, w) => {
  const n = pts.length, L = [], R = [];
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1]; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    const hw = (typeof w === 'function' ? w(i / (n - 1), i) : w) / 2;
    L.push([pts[i][0] - dy * hw, pts[i][1] + dx * hw]); R.push([pts[i][0] + dy * hw, pts[i][1] - dx * hw]);
  }
  const p = new Path2D(); L.forEach((q, i) => i ? p.lineTo(q[0], q[1]) : p.moveTo(q[0], q[1]));
  for (let i = n - 1; i >= 0; i--) p.lineTo(R[i][0], R[i][1]); p.closePath(); return p;
};
// 少女部件按画序列出（远→近），给「不调 drawGirl、自己逐部件上色」的风格用
K.girlOrder = ['farSleeve', 'farHand', 'farCuff', 'hairDown', 'skirt', 'shoe', 'torso', 'neck', 'hairBack', 'bun', 'face', 'bangs', 'upperArm', 'foreArm', 'cuff', 'hand'];   // 完整画序（含五官、杯、钩子插槽名）见 RIG.GIRL_ORDER

// 把 src 按「水平条带位移」画到 dst：fx(y) 返回该行的 x 位移（蒙克式整个世界在流动）
// margin：每行横向多拉伸 2·margin 像素，位移后左右不露缝（margin ≥ 最大位移）
K.warpRows = (dst, src, fx, band = 6, margin = 0) => {
  for (let y = 0; y < H; y += band) { const dx = fx(y + band / 2); dst.drawImage(src, 0, y, W, band, dx - margin, y, W + 2 * margin, band); }
};
K.warpCols = (dst, src, fy, band = 6, margin = 0) => {
  for (let x = 0; x < W; x += band) { const dy = fy(x + band / 2); dst.drawImage(src, x, 0, band, H, x, dy - margin, band, H + 2 * margin); }
};

// n 角星（剪纸星、爆炸框、闪光）：外半径 r0、内半径 r1
K.star = (cx, cy, r0, r1, n, rot = 0) => { const pts = []; for (let i = 0; i < n * 2; i++) { const a = rot + i / (n * 2) * Math.PI * 2 - Math.PI / 2, r = i % 2 ? r1 : r0; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } return U.poly(pts); };
// 手绘不规则圆（草间的点不是完美圆）：n 个顶点、半径按种子起伏
K.blob = (c, x, y, r, seed, wob = 0.08, n = 14) => {
  const rr = rng(seed); const off = []; for (let i = 0; i < n; i++) off.push(1 + (rr() - .5) * 2 * wob);
  const pts = []; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; pts.push([x + Math.cos(a) * r * off[i], y + Math.sin(a) * r * off[i]]); }
  c.moveTo((pts[0][0] + pts[n - 1][0]) / 2, (pts[0][1] + pts[n - 1][1]) / 2);
  for (let i = 0; i < n; i++) { const p = pts[i], q = pts[(i + 1) % n]; c.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2); }
  c.closePath();
};

// 全片连续的编舞：端杯按全局时间走（周期 = 两段 = 2.34s，在嘴边和桌上各停一会儿），
// 换风格时姿势不重置——速通看的是「同一瞬间换了画风」，而不是每段重喝一次。转场正好落在杯子停住的时刻。
K.choreo = (lt, t) => {
  const ch = PAINT.choreo(lt, t), k = 0.5 - 0.5 * Math.cos(2 * Math.PI * t / 2.34375);
  let q = clamp((k - 0.15) / 0.7); q = q * q * (3 - 2 * q);
  ch.cup = q; ch.sip = Math.max(0, Math.sin(t * 6)) * 0.15 * q; return ch;
};
// drawGirl(mode:'line') 会把被近侧手臂挡住的躯干线画穿：线稿画完后，把近侧手臂、袖口、手、杯重新盖一遍
K.nearArm = (c, G, { fill, line = '#111', lw = 3, skin, cuff, cupBody, cupRim, pattern } = {}) => {
  const arm = new Path2D(); arm.addPath(G.upperArm); arm.addPath(G.foreArm);
  c.save(); c.lineJoin = 'round'; c.fillStyle = fill; c.fill(arm); if (pattern) { c.save(); c.clip(arm); pattern(c); c.restore(); }
  c.strokeStyle = line; c.lineWidth = lw; c.stroke(G.upperArm); c.stroke(G.foreArm);
  if (cuff) { c.fillStyle = cuff; c.fill(G.cuff); c.stroke(G.cuff); }
  c.fillStyle = skin; c.fill(G.hand); c.lineWidth = lw * 0.8; c.stroke(G.hand);
  RIG.drawCup(c, G.cup, { body: cupBody, rim: cupRim, line, lw: lw * 0.8, hw: 7 });
  c.fillStyle = skin; c.beginPath(); c.arc(G.thumb[0], G.thumb[1], 7, 0, Math.PI * 2); c.fill(); c.lineWidth = lw * 0.7; c.stroke();
  c.restore();
};
// 右上角角标：标题（中文）＋副标题；入场 0.18s 由各风格的 reveal(c,p) 决定怎么出现
K.label = (c, { title, sub, tFont, sFont, tCol, sCol, x = 1866, y = 128, sy = 182, shadow, before, after, spacing = 0 }) => {
  c.save(); c.textAlign = 'right'; c.textBaseline = 'alphabetic';
  if (before) before(c);
  if (shadow) { c.shadowColor = shadow.color; c.shadowOffsetX = shadow.x || 0; c.shadowOffsetY = shadow.y || 0; c.shadowBlur = shadow.blur || 0; }
  c.font = tFont; c.fillStyle = tCol; if (spacing) c.letterSpacing = spacing + 'px'; c.fillText(title, x, y); c.letterSpacing = '0px';
  if (sub) { c.font = sFont; c.fillStyle = sCol || tCol; c.fillText(sub, x, sy); }
  if (after) after(c);
  c.restore();
};
})();

/* ---------- 上游 lib/camera.js（原样，仅做文件头说明的四类机械改动） ---------- */
// 世界相机 CAM：解说片不是「一段段画＋转场」，而是「一张连续的世界画布＋一台相机」。
// 铁律：相机只由全片时间（或本段时间）算出来，场景每帧按相机矢量重画——缩放转场永远清楚，不会把 1920 的位图放大 20 倍糊掉；
//       引擎在转场窗口里会把上一段继续按 t 画进 A 缓冲，所以「上一镜的相机继续推」天然成立（live 推进）。
// cam = { x, y, z, r }：世界点 (x,y) 落在画面中心，缩放 z（>1 推近），绕中心旋转 r（弧度）。缺省 x=960,y=540,z=1,r=0。
(() => {
let W = 1920, H = 1080; U.onStage((w, h) => { W = w; H = h; });   // 画布尺寸跟 U.setStage 走（默认 1920×1080）
const { clamp, lerp } = U;
CAM = {};
const n = cam => ({ x: cam.x ?? W / 2, y: cam.y ?? H / 2, z: cam.z ?? 1, r: cam.r || 0 });

// 把相机变换作用到 c 上（不 save/restore，调用方负责）
CAM.apply = (c, cam) => { const k = n(cam); c.translate(W / 2, H / 2); if (k.r) c.rotate(k.r); c.scale(k.z, k.z); c.translate(-k.x, -k.y); };
// 在相机下画 fn(c)，自动 save/restore
CAM.with = (c, cam, fn) => { c.save(); CAM.apply(c, cam); fn(c); c.restore(); };
// 世界 → 屏幕 / 屏幕 → 世界
CAM.toScreen = (cam, x, y) => { const k = n(cam); let dx = (x - k.x) * k.z, dy = (y - k.y) * k.z; if (k.r) { const cs = Math.cos(k.r), sn = Math.sin(k.r); [dx, dy] = [dx * cs - dy * sn, dx * sn + dy * cs]; } return [W / 2 + dx, H / 2 + dy]; };
CAM.toWorld = (cam, sx, sy) => { const k = n(cam); let dx = sx - W / 2, dy = sy - H / 2; if (k.r) { const cs = Math.cos(-k.r), sn = Math.sin(-k.r); [dx, dy] = [dx * cs - dy * sn, dx * sn + dy * cs]; } return [k.x + dx / k.z, k.y + dy / k.z]; };

// ---------- 缩放 ----------
// 对数插值：z0→z1 每帧放大同样的倍数，观众感到「匀速穿越尺度」；线性插值会前慢后猛。所有推拉缩放都用它。
CAM.zlerp = (z0, z1, e) => z0 * Math.pow(z1 / z0, e);
// 「从一个半径 r 的圆形开口穿进去，开口要在转场结束前盖满屏」需要的最小放大倍数 = 开口中心到最远屏幕角的距离 / r。
// 开口在画面中心时 ≈ 1101/r（卡片里写的「放大倍数 ≥ 1100/半径」）。小了，最后一帧开口没盖满会跳。
CAM.coverZoom = (r, cx = W / 2, cy = H / 2) => Math.max(Math.hypot(cx, cy), Math.hypot(W - cx, cy), Math.hypot(cx, H - cy), Math.hypot(W - cx, H - cy)) / r;
// 让世界点 (wx,wy) 在缩放 z 下出现在屏幕 (sx,sy)：返回相机。推近某物时让它平滑移到画面中心就靠它。
CAM.anchor = (wx, wy, z, sx, sy) => ({ x: wx - (sx - W / 2) / z, y: wy - (sy - H / 2) / z, z });
// 推进某个世界点：从 base 相机出发，缩放按对数插值到 Z（进度 e）；该点在屏幕上从原位置移向画面中心（进度 k，默认 = e；k=0 = 绕它原地推）。
// 用于「钻进镜头」（y1）、「推满照片再硬切」（y2）、「推进最新数据点」（t3，k=0）。
CAM.pushTo = (base, wx, wy, Z, e, k = e, to = [W / 2, H / 2]) => {
  const s0 = CAM.toScreen(base, wx, wy), z = CAM.zlerp(n(base).z, Z, e);
  return CAM.anchor(wx, wy, z, lerp(s0[0], to[0], k), lerp(s0[1], to[1], k));
};

// ---------- 关键帧 ----------
// keys = [{t, x, y, z, r, ease}]；ease 作用在「从上一键到这一键」，默认 cubicInOut；z 用对数插值。
// 沿路径平移（Vox 桌面、白板上的平移/甩镜）就是一串关键帧：平滑移动用 sineInOut，远跳用 cubicInOut＋运动模糊，沿线追用 MO.longTail。
CAM.at = (keys, t) => {
  if (t <= keys[0].t) return { ...keys[0] };
  for (let i = 1; i < keys.length; i++) {
    const a = keys[i - 1], b = keys[i];
    if (t <= b.t) { const e = (b.ease || MO.cubicInOut)(MO.seg(t, a.t, b.t));
      return { x: lerp(a.x, b.x, e), y: lerp(a.y, b.y, e), z: CAM.zlerp(a.z, b.z, e), r: lerp(a.r || 0, b.r || 0, e), v: e }; }
  }
  return { ...keys[keys.length - 1] };
};

// ---------- 视差 ----------
// d=1 是主体平面，d<1 远、d>1 近。远层位移按 d 线性、缩放按 z^d：深推时远景几乎不动，这就是景深感（Kurzgesagt 5 层视差）。
CAM.layer = (c, cam, d, fn) => { const k = n(cam); c.save(); CAM.apply(c, { x: lerp(W / 2, k.x, d), y: lerp(H / 2, k.y, d), z: Math.pow(k.z, d) }); fn(c); c.restore(); };

// ---------- 运动 ----------
// 相机在屏幕上的瞬时速度（像素/帧，60fps）：camFn(t) → cam。给 motionBlur 用。
CAM.velocity = (camFn, t, dt = 1 / 60) => { const a = camFn(t), b = camFn(t - dt); const z = n(a).z; return [(n(a).x - n(b).x) * z, (n(a).y - n(b).y) * z]; };
// 动态模糊：沿速度方向把整帧叠 n 次（快摇/甩镜用；速度 <1.5px 自动退化成一次绘制）。模糊长度应短于相机位移（PremiumBeat）。
CAM.motionBlur = (c, src, vx, vy, k = 7) => {
  const sp = Math.hypot(vx, vy); if (sp < 1.5) { c.drawImage(src, 0, 0); return; }
  c.save(); for (let i = 0; i < k; i++) { const q = i / (k - 1) - 0.5; c.globalAlpha = i === 0 ? 1 : 1 / (i + 1); c.drawImage(src, -vx * q, -vy * q); } c.restore();
};
// 手持感微漂：两路不同周期的正弦（连续时间，不闪），返回 [dx, dy] 像素
CAM.drift = (t, amp = 6, seed = 0) => [amp * Math.sin(t * 0.9 + seed) + amp * 0.4 * Math.sin(t * 2.3 + seed * 2), amp * 0.7 * Math.sin(t * 1.1 + seed * 3)];
})();

/* ---------- 上游 lib/diagram.js（原样，仅做文件头说明的四类机械改动） ---------- */
// 图解与形变 DG：点列、逐笔描出（draw-on）、揭开遮罩、手绘抖动线、manim 式 Transform / Write、白板笔画时间线＋跟随的笔、
// 神经网络（神经元/连线/信号闪过）、Indicate / Circumscribe / 大括号、3b1b 色板。
// 约定：点列 pts = [[x,y],...]；cum = DG.cum(pts) 是累计弧长；「画到 d」都按弧长算。确定性：随机全走种子。
(() => {
let W = 1920, H = 1080; U.onStage((w, h) => { W = w; H = h; });   // 画布尺寸跟 U.setStage 走（默认 1920×1080）
const { clamp, lerp, rng } = U;
DG = {};

// ---------- 点列 ----------
DG.cum = pts => { const L = [0]; for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); return L; };
DG.len = pts => { const L = DG.cum(pts); return L[L.length - 1]; };
// 折线上弧长 d 处的点
DG.pointAt = (pts, cum, d) => {
  if (d <= 0) return pts[0]; const n = pts.length; if (d >= cum[n - 1]) return pts[n - 1];
  let lo = 0, hi = n - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] < d) lo = m; else hi = m; }
  const q = (d - cum[lo]) / (cum[hi] - cum[lo] || 1); return [lerp(pts[lo][0], pts[hi][0], q), lerp(pts[lo][1], pts[hi][1], q)];
};
// 逐笔描出：画折线的前 d 长度（用当前 strokeStyle/lineWidth），返回笔尖位置。白板、红笔圈、红线连接都用它。
DG.drawPartial = (c, pts, cum, d) => {
  const n = pts.length; if (d <= 0 || n < 2) return pts[0];
  c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
  let i = 1; for (; i < n && cum[i] <= d; i++) c.lineTo(pts[i][0], pts[i][1]);
  let tip = pts[n - 1];
  if (i < n) { tip = DG.pointAt(pts, cum, d); c.lineTo(tip[0], tip[1]); }
  c.stroke(); return tip;
};
// 变换点列：平移 (dx,dy)、缩放 s
DG.xform = (pts, dx, dy, s = 1) => pts.map(([x, y]) => [dx + x * s, dy + y * s]);
// 椭圆弧点列（a0→a1）
DG.arcPts = (cx, cy, rx, ry, a0, a1, n = 24) => { const o = []; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; o.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); } return o; };
// 手画的圈：从 a0 起转 turns 圈（>1 首尾略交叉，像真的用笔圈）
DG.ellipsePts = (cx, cy, rx, ry, a0 = -Math.PI / 2, turns = 1.08, n = 64) => DG.arcPts(cx, cy, rx, ry, a0, a0 + turns * Math.PI * 2, n);
// 手绘抖动：Catmull-Rom 加密后按种子加低频抖动（静态，不沸腾——白板上的线画完就不动）
DG.hand = (pts, { per = 8, amp = 1.6, seed = 1, freq = 0.035 } = {}) => {
  const d = KIT.densify(pts, per), r = rng(seed), ph = r() * 100;
  return KIT.resample(d, 3).map(([x, y], i) => [x + PAINT.noise(i * freq + ph, 3.1) * amp * 2, y + PAINT.noise(i * freq + ph, 7.7) * amp * 2]);
};
// 揭开遮罩：沿折线前 d 长度，每段做成同向绕行的方条（方头延长 w/2），合成一条 Path2D 用来 clip。
// VideoScribe 的「Reveal」画法：之字形笔触从上往下揭开一张画；也用于逐字书写。同向绕行保证 nonzero 下重叠处不抵消。
DG.revealMask = (pts, cum, d, w) => {
  const p = new Path2D(), h = w / 2;
  for (let i = 1; i < pts.length && cum[i - 1] < d; i++) {
    const a = pts[i - 1], b0 = pts[i], L = cum[i] - cum[i - 1]; if (L <= 0) continue;
    const q = Math.min(1, (d - cum[i - 1]) / L), b = [a[0] + (b0[0] - a[0]) * q, a[1] + (b0[1] - a[1]) * q];
    const ux = (b0[0] - a[0]) / L, uy = (b0[1] - a[1]) / L, nx = -uy * h, ny = ux * h;
    const A = [a[0] - ux * h, a[1] - uy * h], B = [b[0] + ux * h, b[1] + uy * h];
    p.moveTo(A[0] + nx, A[1] + ny); p.lineTo(B[0] + nx, B[1] + ny); p.lineTo(B[0] - nx, B[1] - ny); p.lineTo(A[0] - nx, A[1] - ny); p.closePath();
  }
  return p;
};
// 之字形揭开路径：在框 (x,y,w,h) 里从上往下 rows 行来回
DG.zigzag = (x, y, w, h, rows) => { const o = []; for (let r = 0; r <= rows; r++) { const yy = y + h * r / rows; o.push(r % 2 ? [x + w, yy] : [x, yy]); } return o; };

// ---------- manim Transform：两边点数相同、起点对齐（都从左上方向起、顺时针）才能逐点插值 ----------
DG.rectPts = (cx, cy, w, h, n = 64) => {
  const per = 2 * (w + h), out = [];
  for (let i = 0; i < n; i++) {
    let d = i / n * per; let x, y;
    if (d < w) { x = cx - w / 2 + d; y = cy - h / 2; }
    else if ((d -= w) < h) { x = cx + w / 2; y = cy - h / 2 + d; }
    else if ((d -= h) < w) { x = cx + w / 2 - d; y = cy + h / 2; }
    else { d -= w; x = cx - w / 2; y = cy + h / 2 - d; }
    out.push([x, y]);
  }
  return out;
};
DG.circlePts = (cx, cy, r, n = 64) => { const out = []; for (let i = 0; i < n; i++) { const a = -3 * Math.PI / 4 + i / n * 2 * Math.PI; out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } return out; };
DG.morph = (A, B, p) => A.map((a, i) => [lerp(a[0], B[i][0], p), lerp(a[1], B[i][1], p)]);
DG.shape = (c, pts, { fill, stroke, lw = 2 } = {}) => {
  c.beginPath(); pts.forEach((q, i) => i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1])); c.closePath();
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (stroke && lw > 0) { c.strokeStyle = stroke; c.lineWidth = lw; c.lineJoin = 'round'; c.stroke(); }
};

// ---------- 颜色（接受 '#hex' 或 [r,g,b]） ----------
DG.arr = h => Array.isArray(h) ? h : PAINT.hex(h);
DG.mixA = (h1, h2, t) => { const a = DG.arr(h1), b = DG.arr(h2); return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; };
DG.rgba = (h, a = 1) => { const v = DG.arr(h); return `rgba(${v[0] | 0},${v[1] | 0},${v[2] | 0},${a})`; };
DG.mix = (h1, h2, t) => DG.rgba(DG.mixA(h1, h2, t));
// 3b1b 色板。Grant 的 custom_config 在 ffmpeg 导出时 saturation=1.5，照 manim 原色值直接用会发灰，所以 DG.MANIM 是饱和后的。
DG.MANIM_RAW = { BLUE_C: '#58C4DD', BLUE_D: '#29ABCA', BLUE_E: '#1C758A', TEAL_C: '#5CD0B3', GREEN_C: '#83C167', YELLOW: '#FFFF00', GOLD_C: '#F0AC5F',
  RED_C: '#FC6255', MAROON_C: '#C55F73', PURPLE_C: '#9A72AC', GREY_A: '#DDDDDD', GREY_B: '#BBBBBB', GREY_C: '#888888', GREY_D: '#444444', GREY_E: '#222222', WHITE: '#FFFFFF', BLACK: '#000000' };
DG.saturate = (hex, s = 1.5) => {                         // CSS/SVG saturate 矩阵
  const [r, g, b] = PAINT.hex(hex);
  const R = (0.213 + 0.787 * s) * r + (0.715 - 0.715 * s) * g + (0.072 - 0.072 * s) * b;
  const G = (0.213 - 0.213 * s) * r + (0.715 + 0.285 * s) * g + (0.072 - 0.072 * s) * b;
  const B = (0.213 - 0.213 * s) * r + (0.715 - 0.715 * s) * g + (0.072 + 0.928 * s) * b;
  const f = v => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0');
  return '#' + f(R) + f(G) + f(B);
};
DG.MANIM = {}; for (const k in DG.MANIM_RAW) DG.MANIM[k] = DG.saturate(DG.MANIM_RAW[k]);
DG.U = H / 8;                                             // manim：画面高 8 个单位 → 1 单位 = 135px（1080p）

// ---------- Write 与公式（CMU = LaTeX Computer Modern；中文用思源宋） ----------
DG.FONT = { rm: 'CMU-rm', it: 'CMU-it', zh: 'NotoSerifSC' };
const famOf = tk => tk.zh ? DG.FONT.zh : tk.it ? DG.FONT.it : DG.FONT.rm;
// tokens: [{s, it, zh, col, sub, sup, size, gap}]；返回每个 token 的 {x,w,sz}（相对起点）
DG.layout = (c, tokens, size) => {
  let x = 0; return tokens.map(tk => {
    const sz = (tk.size || 1) * size; c.font = `${sz}px "${famOf(tk)}"`;
    const w = c.measureText(tk.s).width; let sw = 0;
    if (tk.sub || tk.sup) { c.font = `${sz * 0.62}px "${DG.FONT.rm}"`; sw = c.measureText(tk.sub || tk.sup).width + sz * 0.04; }
    const r = { x, w: w + sw, sz }; x += w + sw + (tk.gap != null ? tk.gap : sz * 0.06); return r;
  });
};
// manim Write：每个 token 先沿轮廓描边（lineDash 推进），后半程填色、描边淡掉；token 间 lag = min(4/(n+1), 0.2)（3b1b creation.py）。
// 尊重外层 globalAlpha（FadeOut 时整条公式一起淡）。返回每个 token 的屏幕 {x,w}。
DG.math = (c, tokens, x, y, size, { p = 1, align = 'center', col = '#fff', lag } = {}) => {
  const L = DG.layout(c, tokens, size), total = L.length ? L[L.length - 1].x + L[L.length - 1].w : 0;
  const x0 = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  const n = tokens.length, r = lag != null ? lag : Math.min(4 / (n + 1), 0.2);
  const A0 = c.globalAlpha;
  c.save(); c.textBaseline = 'alphabetic'; c.textAlign = 'left';
  tokens.forEach((tk, i) => {
    const q = MO.lagged(i, n, clamp(p), r); if (q <= 0) return;
    const sz = L[i].sz, fx = x0 + L[i].x, colr = tk.col || col;
    const draw = (txt, xx, yy, f, mode) => { c.font = f; mode === 's' ? c.strokeText(txt, xx, yy) : c.fillText(txt, xx, yy); };
    const main = `${sz}px "${famOf(tk)}"`, small = `${sz * 0.62}px "${DG.FONT.rm}"`;
    c.font = main; const mw = c.measureText(tk.s).width;
    const parts = [[tk.s, fx, y, main]]; if (tk.sub) parts.push([tk.sub, fx + mw + sz * 0.02, y + sz * 0.22, small]); if (tk.sup) parts.push([tk.sup, fx + mw + sz * 0.02, y - sz * 0.42, small]);
    const qs = MO.doubleSmooth(q);
    if (qs < 1) { c.strokeStyle = colr; c.lineWidth = Math.max(1.2, sz * 0.025); c.setLineDash([sz * 5 * clamp(qs * 2), 1e5]); c.globalAlpha = A0 * (1 - clamp((qs - 0.6) / 0.4)); parts.forEach(pt => draw(pt[0], pt[1], pt[2], pt[3], 's')); c.setLineDash([]); }
    const fa = clamp((qs - 0.4) / 0.6); if (fa > 0) { c.globalAlpha = A0 * fa; c.fillStyle = colr; parts.forEach(pt => draw(pt[0], pt[1], pt[2], pt[3], 'f')); }
    c.globalAlpha = A0;
  });
  c.restore();
  return L.map(l => ({ x: x0 + l.x, w: l.w }));
};
// 纯文本的 Write（中文标题也走这个：非 ASCII 字自动用 DG.FONT.zh）
DG.write = (c, text, x, y, size, p, opt = {}) => DG.math(c, [...text].map(ch => ({ s: ch, zh: /[^\x00-\x7f]/.test(ch) || opt.zh, gap: 0 })), x, y, size, { ...opt, p });

// ---------- 神经网络 ----------
// 神经元：描边白 2px，填充不透明度 = 激活值（3b1b nn/part1.py 原做法）
DG.neuron = (c, x, y, r, a, { stroke = '#fff', fill = '#fff', lw = 2, sa = 1 } = {}) => {
  c.save(); c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2);
  if (a > 0) { c.globalAlpha = clamp(a); c.fillStyle = fill; c.fill(); }
  c.globalAlpha = sa; c.strokeStyle = stroke; c.lineWidth = lw; c.stroke(); c.restore();
};
// 圆周到圆周的连线端点
DG.edgeEnds = (ax, ay, ar, bx, by, br) => { const dx = bx - ax, dy = by - ay, d = Math.hypot(dx, dy) || 1; return [ax + dx / d * ar, ay + dy / d * ar, bx - dx / d * br, by - dy / d * br]; };
// 连线：正权重蓝、负权重红；线宽 = minW + maxW·|w|³（nn/part2.py：3·(|w|/max)³）；p = 画到哪（ShowCreation）
DG.edge = (c, e, w, p = 1, { maxW = 3.2, minW = 0.6, pos = DG.MANIM.BLUE_C, neg = DG.MANIM.RED_C, alpha = 0.85, from = 0 } = {}) => {
  if (p <= from) return;
  const [x1, y1, x2, y2] = e;
  c.save(); c.strokeStyle = w >= 0 ? pos : neg; c.globalAlpha = alpha; c.lineWidth = minW + maxW * Math.pow(Math.min(1, Math.abs(w)), 3);
  c.beginPath(); c.moveTo(lerp(x1, x2, from), lerp(y1, y2, from)); c.lineTo(lerp(x1, x2, p), lerp(y1, y2, p)); c.stroke(); c.restore();
};
// ShowPassingFlash（time_width=2.0）：信号沿线闪过，返回可见段 [lo, hi]（0..1）
DG.flash = (alpha, tw = 2) => { const up = lerp(0, 1 + tw, alpha); return [clamp(up - tw), clamp(up)]; };

// ---------- 提示 ----------
DG.indicate = p => ({ s: 1 + 0.2 * MO.thereAndBack(clamp(p)), k: MO.thereAndBack(clamp(p)) });   // 放大 1.2、染黄（k）、回来
// Circumscribe：矩形框沿周长画出再收走（time_width 0.3 的近似）
DG.circumscribe = (c, x, y, w, h, p, { col = DG.MANIM.YELLOW, lw = 4, tw = 0.3 } = {}) => {
  if (p <= 0 || p >= 1) return; const pts = DG.rectPts(x + w / 2, y + h / 2, w, h, 160);
  const hi = clamp(lerp(0, 1 + tw, p)), lo = clamp(hi - tw - (1 - p) * 0.7);
  c.save(); c.strokeStyle = col; c.lineWidth = lw; c.beginPath();
  const i0 = Math.floor(lo * 160), i1 = Math.floor(hi * 160); for (let i = i0; i <= Math.min(160, i1); i++) { const q = pts[i % 160]; i === i0 ? c.moveTo(q[0], q[1]) : c.lineTo(q[0], q[1]); } c.stroke(); c.restore();
};
// 大括号（竖直，开口朝右），从中间向两端长出
DG.brace = (c, x, y0, y1, { col = '#fff', lw = 3, depth = 22, p = 1 } = {}) => {
  if (p <= 0) return; const ym = (y0 + y1) / 2;
  c.save(); c.strokeStyle = col; c.lineWidth = lw; c.lineCap = 'round'; c.globalAlpha = clamp(p * 1.5);
  const k = MO.smooth(p), a0 = lerp(ym, y0, k), a1 = lerp(ym, y1, k);
  c.beginPath(); c.moveTo(x, a0); c.quadraticCurveTo(x - depth * 0.5, a0, x - depth * 0.5, a0 + Math.min(40, (ym - a0) * 0.3));
  c.lineTo(x - depth * 0.5, ym - Math.min(40, (ym - a0) * 0.3)); c.quadraticCurveTo(x - depth * 0.5, ym, x - depth, ym);
  c.quadraticCurveTo(x - depth * 0.5, ym, x - depth * 0.5, ym + Math.min(40, (a1 - ym) * 0.3));
  c.lineTo(x - depth * 0.5, a1 - Math.min(40, (a1 - ym) * 0.3)); c.quadraticCurveTo(x - depth * 0.5, a1, x, a1); c.stroke(); c.restore();
};

// ---------- 白板：笔画时间线 ＋ 一支跟着画的笔 ----------
// 按顺序往板上加笔画，每笔时长 = 长度 / 笔速，自动排成时间线；画的时候笔尖永远在最新那一笔的前沿，两笔之间沿弧线滑过去，笔从不离开画面。
//   const B = DG.board({ ink, lw, speed, font });  B.at(0.12); B.line(pts); B.text('猫？', x, y, 150, {rate: 7.5}); B.pop('×1000万张', x, y, 74); ...
//   每帧：const { tip, col } = B.draw(g, ft)（在世界坐标里画，调用方先套相机）；const [sx, sy] = B.penAt(ft, cam, tip)；DG.pen(c, sx, sy, col || B.penColor(ft))。
// 自定义笔画 B.push({ kind:'custom', t0, t1, col, draw(g, q, ft) → 笔尖|null, start() → 世界点, end() → 世界点, handed:true })。
// 速度口径（RSA 实测）：正文写字 ≈16 字/秒、标题 ≈7.5 字/秒；强调色关键词不带手、整词弹出（后期合成）。
DG.board = ({ ink = '#0A0503', lw = 6.5, speed = 2600, font = '"LXGWWenKai-500"' } = {}) => {
  const B = { S: [], cur: 0, ink, lw, speed, font };
  B.at = t => { B.cur = t; return B; };
  B.push = s => { B.S.push(s); return s; };
  B.line = (raw, { w = lw, col = ink, speed: sp = speed, seed = B.S.length + 1, amp = 1.4, smooth = true, min = 0.04, gap = 0.02 } = {}) => {
    const pts = smooth ? DG.hand(raw, { amp, seed, per: 8 }) : raw, cum = DG.cum(pts), len = cum[cum.length - 1];
    const d = Math.max(min, len / sp); B.S.push({ kind: 'line', pts, cum, len, w, col, t0: B.cur, t1: B.cur + d }); B.cur += d + gap;
  };
  // 一笔直线（不抖、固定时长，比如网络连线），不推进太多时间
  B.segment = (a, b, { w = 3, col = ink, dur = 0.06, gap = 0.012 } = {}) => {
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]); B.S.push({ kind: 'line', pts: [a, b], cum: [0, L], len: L, w, col, t0: B.cur, t1: B.cur + dur }); B.cur += gap;
  };
  // 手写字：rate 字/秒
  B.text = (str, x, y, size, { col = ink, rate = 16, align = 'left', dur } = {}) => {
    const d = dur || [...str].length / rate; B.S.push({ kind: 'text', str, x, y, size, col, align, t0: B.cur, t1: B.cur + d }); B.cur += d + 0.03;
  };
  // 强调词：不带手、0.3s 放大回落整词弹出
  B.pop = (str, x, y, size, { col = ink, align = 'center', dur = 0.3 } = {}) => { B.S.push({ kind: 'pop', str, x, y, size, col, align, t0: B.cur, t1: B.cur + dur }); B.cur += 0.12; };
  // 铺色（淡入，不推进时间）
  B.fill = (path, col, dur = 0.18) => { B.S.push({ kind: 'fill', path, col, t0: B.cur, t1: B.cur + dur }); };

  const drawOne = (g, s, ft) => {
    if (ft < s.t0) return null;
    const q = clamp((ft - s.t0) / (s.t1 - s.t0));
    if (s.kind === 'custom') return s.draw(g, q, ft);
    if (s.kind === 'fill') { g.save(); g.globalAlpha = q; g.fillStyle = s.col; g.fill(s.path); g.restore(); return null; }
    if (s.kind === 'line') { g.strokeStyle = s.col; g.lineWidth = s.w; return DG.drawPartial(g, s.pts, s.cum, s.len * MO.sineInOut(q)); }
    if (s.kind === 'pop') {
      g.save(); g.font = `${s.size}px ${B.font}`; g.fillStyle = s.col; g.textBaseline = 'alphabetic'; g.textAlign = s.align;
      const e = MO.backOut(q, 2.2); g.globalAlpha = clamp(q * 4); g.translate(s.x, s.y - s.size * 0.35); g.scale(e, e); g.fillText(s.str, 0, s.size * 0.35); g.restore(); return null;
    }
    if (s.kind === 'text') {
      // 逐字写：笔尖在字框里 3 行之字形来回，遮罩跟着笔尖揭开这个字（Reveal 画法用在单字上）
      g.save(); g.font = `${s.size}px ${B.font}`; g.fillStyle = s.col; g.textBaseline = 'alphabetic';
      const chars = [...s.str], ws = chars.map(ch => g.measureText(ch).width), w = ws.reduce((a, b) => a + b, 0), x0 = s.align === 'center' ? s.x - w / 2 : s.x;
      const n = chars.length, k = Math.min(n, q * n), done = Math.floor(k);
      let x = x0, tip = null;
      chars.forEach((ch, i) => {
        if (i < done) g.fillText(ch, x, s.y);
        else if (i === done && k < n) {
          const zz = DG.zigzag(x - 2, s.y - s.size * 0.95, ws[i] + 4, s.size * 1.15, 3), cum = DG.cum(zz), d = cum[cum.length - 1] * (k - done);
          g.save(); g.clip(DG.revealMask(zz, cum, d, s.size * 0.62)); g.fillText(ch, x, s.y); g.restore(); tip = DG.pointAt(zz, cum, d);
        }
        x += ws[i];
      });
      g.restore(); return tip || [x0 + w, s.y - s.size * 0.35];
    }
    return null;
  };
  // 画全部笔画（世界坐标）。返回正在画的那一笔的笔尖与墨色（没有在画的 → tip=null）
  B.draw = (g, ft) => {
    g.lineJoin = 'round'; g.lineCap = 'round';
    let tip = null, col = null;
    for (const s of B.S) { const p = drawOne(g, s, ft); if (p && ft < s.t1) { tip = p; col = s.col; } }
    return { tip, col };
  };
  const handed = () => B.S.filter(s => s.kind !== 'pop' && s.kind !== 'fill' && (s.kind !== 'custom' || s.handed !== false));
  const tw = s => s.size * [...s.str].length * 0.9;
  const endPt = s => s.kind === 'custom' ? s.end() : s.kind === 'line' ? s.pts[s.pts.length - 1] : [s.align === 'center' ? s.x + tw(s) / 2 : s.x + tw(s), s.y - s.size * 0.3];
  const startPt = s => s.kind === 'custom' ? s.start() : s.kind === 'line' ? s.pts[0] : [s.align === 'center' ? s.x - tw(s) / 2 : s.x, s.y - s.size * 0.3];
  // 笔在屏幕上的位置：在画 → 笔尖；两笔之间 → 从上一笔终点沿弧线滑到下一笔起点；开场 → 从右下入画
  B.penAt = (ft, cam, tip) => {
    if (tip) return CAM.toScreen(cam, tip[0], tip[1]);
    let prev = null, next = null;
    for (const s of handed()) { if (s.t1 <= ft) prev = s; else if (s.t0 > ft && !next) next = s; }
    if (prev && next) {
      const q = MO.sineInOut((ft - prev.t1) / (next.t0 - prev.t1)), a = CAM.toScreen(cam, ...endPt(prev)), b = CAM.toScreen(cam, ...startPt(next));
      return [lerp(a[0], b[0], q), lerp(a[1], b[1], q) - Math.sin(q * Math.PI) * Math.min(80, 20 + Math.hypot(b[0] - a[0], b[1] - a[1]) * 0.15)];
    }
    if (next) { const b = CAM.toScreen(cam, ...startPt(next)), q = MO.cubicOut(clamp(ft / next.t0)); return [lerp(W * 0.62, b[0], q), lerp(H * 0.7, b[1], q)]; }
    return CAM.toScreen(cam, ...endPt(prev));
  };
  // 空档里笔的颜色 = 下一笔的墨色（没有下一笔就用上一笔）
  B.penColor = ft => { const hs = handed(), nx = hs.find(s => s.t0 > ft), pv = [...hs].reverse().find(s => s.t1 <= ft); return (nx || pv || { col: ink }).col; };
  return B;
};
// 一支马克笔（屏幕空间，笔尖在 (x,y)，笔身朝右上）。笔尾帽 = 墨色；有高光和投影，浮在板上。用笔引导视线。
DG.pen = (c, x, y, col, tilt = 0) => {
  c.save(); c.translate(x, y); c.rotate(-0.72 + tilt);
  c.fillStyle = 'rgba(0,0,0,.12)'; c.beginPath(); c.roundRect(30, 14, 250, 34, 16); c.fill();
  c.fillStyle = col; c.beginPath(); c.moveTo(0, 0); c.lineTo(26, -8); c.lineTo(26, 8); c.closePath(); c.fill();
  c.fillStyle = '#e8e8e4'; c.beginPath(); c.roundRect(24, -12, 26, 24, 4); c.fill();
  c.fillStyle = '#26262a'; c.beginPath(); c.roundRect(48, -17, 190, 34, 12); c.fill();
  c.fillStyle = col; c.beginPath(); c.roundRect(212, -18, 46, 36, 10); c.fill();
  c.fillStyle = 'rgba(255,255,255,.22)'; c.beginPath(); c.roundRect(60, -12, 140, 7, 4); c.fill();
  c.restore();
};
})();

/* ---------- 上游 lib/typo.js（原样，仅做文件头说明的四类机械改动） ---------- */
// 文字动效 TY：逐字/逐词弹入、遮罩升起、弹入、打字、从模糊浮出、荧光笔、下划线、主词砸入、关键词强调、数字计数与等宽数字。
// 约定：p 是 0..1 进度；lt/t 是秒。字体用 CSS 字体串或 family 名（中文默认 PuHui-*，开源版是思源黑体，见 lib/fonts.js）。
// 可读性底线（y5/y1 卡片）：主词 : 辅句 : 标签 ≈ 3.4 : 1 : 0.4；一句辅句在屏 ≥1.2s；入场慢（0.3–0.4s）、退场快（≈0.18s）。
(() => {
const { clamp, lerp } = U;
TY = {};

// ---------- 基础 ----------
TY.font = (size, fam = 'PuHui-Black') => `${size}px "${fam}"`;
// 画一段字：可带透明、缩放、旋转（绕 ox,oy）、字距 track、描边
TY.text = (c, s, x, y, { size = 120, fam = 'PuHui-Black', color = '#111', align = 'center', base = 'alphabetic', alpha = 1, scale = 1, rot = 0, track = 0, stroke, strokeW = 0, ox = x, oy = y } = {}) => {
  if (alpha <= 0 || scale <= 0) return;
  c.save(); c.globalAlpha *= alpha; c.translate(ox, oy); c.rotate(rot); c.scale(scale, scale); c.translate(-ox, -oy);
  c.font = TY.font(size, fam); c.textAlign = align; c.textBaseline = base; if (track) c.letterSpacing = track + 'px';
  if (stroke && strokeW) { c.lineJoin = 'round'; c.strokeStyle = stroke; c.lineWidth = strokeW; c.strokeText(s, x, y); }
  c.fillStyle = color; c.fillText(s, x, y); c.restore();
};
TY.width = (c, s, size, fam = 'PuHui-Black', track = 0) => { c.save(); c.font = TY.font(size, fam); if (track) c.letterSpacing = track + 'px'; const w = c.measureText(s).width; c.restore(); return w; };
// 折行：按 maxW 把一段字拆成多行（中文逐字可断；英文/数字按词断；行首不放中文标点）。font 是 CSS 字体串
TY.wrap = (c, text, maxW, font) => {
  c.save(); if (font) c.font = font;
  const toks = String(text).match(/[A-Za-z0-9.,%+\-'’]+\s*|\s+|./gu) || [], lines = []; let cur = '';
  for (const tk of toks) {
    if (tk === '\n') { lines.push(cur); cur = ''; continue; }
    if (cur && c.measureText(cur + tk.trimEnd()).width > maxW && !/^[，。、：；！？」』）》,.!?)]$/.test(tk)) { lines.push(cur.trimEnd()); cur = tk.trimStart(); }
    else cur += tk;
  }
  if (cur.trim()) lines.push(cur.trimEnd());
  c.restore(); return lines;
};
// 把字号从 size 往下缩，直到真放得下：折行后不超过 maxLines 行，而且量过每行宽 ≤ maxW（单个长英文词/长数字折不开，只数行数会超宽）。返回 {size, lines, ok}
// 先在 [min, 1] 倍里找；找不到时 soft:true 返回 ok:false 让调用方换方案（如改折两行），否则继续缩（最低 0.2 倍）。balance:true 时多行折成等长。
TY.fit = (c, text, maxW, size, fam, { maxLines = 2, min = 0.45, weight = '', soft = false, balance = false } = {}) => {
  const font = s => `${weight}${s}px "${fam}"`, ok = (s, lines) => { c.save(); c.font = font(s); const r = lines.length <= maxLines && lines.every(l => c.measureText(l).width <= maxW + 0.5); c.restore(); return r; };
  let s = size, lines = [String(text)], good = false;
  for (; s >= size * (soft ? min : 0.2) - 1e-9; s *= 0.94) { lines = TY.wrap(c, text, maxW, font(s)); if (ok(s, lines)) { good = true; break; } if (s < size * min && soft) break; }
  if (!good && !soft) s /= 0.94;
  if (good && balance && lines.length > 1) { const n = lines.length; let lo = maxW * 0.4, hi = maxW; for (let k = 0; k < 14; k++) { const m = (lo + hi) / 2; if (TY.wrap(c, text, m, font(s)).length > n) lo = m; else hi = m; } lines = TY.wrap(c, text, hi, font(s)); }
  return { size: s, lines, ok: good };
};

// ---------- 入场 ----------
// 逐字错开出现：每字 dur 秒，从 dy 往上、透明→不透明、可带缩放；Kurzgesagt 标题 0.5s/字、错开 45ms。返回总宽。
TY.charsIn = (c, str, x, y, lt, { font, color, dur = 0.35, stagger = 0.04, dy = 24, scale0 = 1, align = 'left', ease = MO.cubicOut, shadow, spacing = 0 } = {}) => {
  c.save(); c.font = font; c.textBaseline = 'alphabetic'; c.fillStyle = color; const A0 = c.globalAlpha;   // 乘上调用方的透明度（外面包一层淡出才生效）
  const chars = [...str]; const ws = chars.map(ch => c.measureText(ch).width + spacing); const tw = ws.reduce((a, b) => a + b, 0) - spacing;
  let cx = align === 'center' ? x - tw / 2 : align === 'right' ? x - tw : x;
  chars.forEach((ch, i) => {
    const q = clamp((lt - i * stagger) / dur); if (q > 0) {
      const e = ease(q); c.save(); c.globalAlpha = A0 * clamp(q * 2.2);
      c.translate(cx + ws[i] / 2, y + dy * (1 - e)); const s = lerp(scale0, 1, e); c.scale(s, s);
      if (shadow) { c.shadowColor = shadow.color; c.shadowOffsetX = shadow.x || 0; c.shadowOffsetY = shadow.y || 0; c.shadowBlur = shadow.blur || 0; }
      c.fillText(ch, -ws[i] / 2 + spacing / 2, 0); c.restore();
    }
    cx += ws[i];
  });
  c.restore(); return tw;
};
// 遮罩升起：字从基线下的「槽」里推上来（动态文字最常见的出字法）。p 0..1，o.dir=+1 往上出，-1 往下收。o 同 TY.text
TY.rise = (c, s, x, y, p, o = {}) => {
  const size = o.size || 120, e = MO.expoOut(clamp(p)), w = TY.width(c, s, size, o.fam, o.track), a = o.align || 'left';
  const x0 = a === 'left' ? x : a === 'center' ? x - w / 2 : x - w;
  c.save(); c.beginPath(); c.rect(x0 - 20, y - size * 1.05, w + 40, size * 1.32); c.clip();
  TY.text(c, s, x, y + size * 1.2 * (1 - e) * (o.dir || 1), { ...o, align: a }); c.restore();
};
// 弹入：从 0 放大到 1，backOut 过冲后停（以字中心为轴）。o.over = backOut 的 s
TY.pop = (c, s, x, y, p, o = {}) => {
  if (p <= 0) return; const size = o.size || 120, sc = MO.backOut(clamp(p), o.over ?? 2.2) * (o.scale || 1);
  TY.text(c, s, x, y, { ...o, scale: sc, ox: x, oy: y - size * 0.36 });
};
// 从模糊浮出（发布会标题）：模糊→清晰＋上移＋透明→不透明。用调用方设好的 font/fillStyle/textAlign。
TY.blurIn = (c, text, x, y, p, { blur = 18, dy = 28, scale = 0 } = {}) => {
  if (p <= 0) return;
  c.save(); c.globalAlpha *= clamp(p * 1.4);
  const b = (1 - p) * blur; if (b > 0.3) c.filter = `blur(${b.toFixed(2)}px)`;
  c.translate(x, y + (1 - p) * dy); if (scale) { const s = 1 + (1 - p) * scale; c.scale(s, s); }
  c.fillText(text, 0, 0); c.restore();
};
// 打字：按字符数截断（p 0..1）
TY.typed = (s, p) => [...s].slice(0, Math.round(clamp(p) * [...s].length)).join('');
// 打字机：t 时刻已打出的字数（rate 字/秒，可按 fps 步进；Vox 13 字/秒＋12fps，白板正文 16 字/秒）
TY.typedCount = (t, t0, rate, fps = 0) => Math.max(0, Math.floor(((fps ? MO.step(t, fps) : t) - t0) * rate + 1e-6) + 1);

// ---------- 强调 ----------
// 荧光笔：从左往右刷出的斜切色块，放在字后面（动态文字）。拼贴风的毛边 multiply 荧光笔见 CL.highlight
TY.marker = (c, x, y, w, h, p, color = '#FFE14D', skew = 0.18) => {
  if (p <= 0) return; const e = MO.expoOut(clamp(p)), ww = w * e;
  c.save(); c.fillStyle = color; c.beginPath(); c.moveTo(x + h * skew, y); c.lineTo(x + ww + h * skew, y); c.lineTo(x + ww, y + h); c.lineTo(x, y + h); c.closePath(); c.fill(); c.restore();
};
TY.underline = (c, x, y, w, p, color, lw = 10) => { if (p <= 0) return; c.save(); c.strokeStyle = color; c.lineCap = 'round'; c.lineWidth = lw; c.beginPath(); c.moveTo(x, y); c.lineTo(x + w * MO.expoOut(clamp(p)), y); c.stroke(); c.restore(); };
// 主词「砸」进来：从 from 倍缩到 1（弹簧 2.2Hz/10，过冲 ≈8%），前 0.06s 透明→不透明。lt = 本词出现后的秒数
TY.slam = (c, s, x, y, lt, o = {}) => {
  if (lt < 0) return; const size = o.size || 340, k = MO.springHz(lt, o.freq || 2.2, o.decay || 10), sc = lerp(o.from || 1.7, 1, k);
  TY.text(c, s, x, y, { size, fam: 'PuHui-Black', align: 'left', ...o, scale: sc * (o.scale || 1), alpha: clamp(lt / 0.06), ox: o.ox ?? x, oy: o.oy ?? y - size * 0.36 });
};
// 关键词：tIn 起从槽里升起，到「强调拍」tHit 放大到 1.35 倍并钉住（弹簧 2.5Hz/9）。返回当前缩放（给荧光笔/下划线跟着放大）。
// 字和动作说同一件事：「下一行」放大的那一拍正好按下 Tab（y5）。
TY.keyword = (c, s, x, y, t, tIn, tHit, o) => {
  if (t < tHit) { TY.rise(c, s, x, y, MO.at(t, tIn, 0.35), { ...o, align: 'left' }); return 1; }
  const sc = lerp(1, 1.35, MO.springHz(t - tHit, 2.5, 9));
  TY.text(c, s, x, y, { ...o, align: 'left', scale: sc, ox: x, oy: y });
  return sc;
};
// 关键词后面的荧光笔：跟关键词同一拍出现、同一缩放
TY.keywordMarker = (c, x, y, w, size, t, tHit, sc, col) => { if (t < tHit) return; TY.marker(c, x - 8, y - size * 0.98 * sc, (w + 16) * sc, size * 1.18 * sc, MO.at(t, tHit, 0.3), col); };

// ---------- 数字 ----------
// 千分位格式；负号用真减号「−」
TY.fmt = (v, dec = 0, sep = true) => { const s = Math.abs(v).toFixed(dec); const [i, f] = s.split('.'); const ii = sep ? i.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : i; return (v < 0 ? '−' : '') + ii + (f ? '.' + f : ''); };
// 计数：[start, start+dur] 内从 a 滚到 b；默认 expoOut（先快后慢，最后一位落定）。数字和动画只改「怎么出现」，不改口径。
TY.count = (lt, start, dur, a, b, ease = MO.expoOut) => lerp(a, b, ease(clamp((lt - start) / dur)));
// 等宽数字排布：canvas 开不了 tnum，滚动时数字宽度会抖，必须每个数字占同宽格子自己排。用调用方设好的 font/fillStyle。返回总宽
TY.tabular = (c, str, x, y, { align = 'left', digitW } = {}) => {
  const dw = digitW || c.measureText('0').width;
  const ws = [...str].map(ch => /[0-9]/.test(ch) ? dw : c.measureText(ch).width);
  const total = ws.reduce((s, w) => s + w, 0);
  let cx = align === 'right' ? x - total : align === 'center' ? x - total / 2 : x;
  const ta = c.textAlign; c.textAlign = 'center';
  [...str].forEach((ch, i) => { c.fillText(ch, cx + ws[i] / 2, y); cx += ws[i]; });
  c.textAlign = ta; return total;
};
})();

/* ---------- 上游 lib/chart.js（原样，仅做文件头说明的四类机械改动） ---------- */
// 数据图表动画 CH：比例尺、好看的刻度、网格（先出）、柱（从 0 长出）、折线（按时间画出、头部圆点）、K 线（逐根）、
// 标注（点→引线→文字）、经济学人式版式（顶红线＋红色小旗＋标题＋单位副标题＋来源注＋「示意数据」角标）。
// 顺序铁律（准确性＋可读性）：坐标系先出 → 数据后出 → 标注最后、一镜只标一件事；柱状图基线必须是 0（纵轴不从 0 开始要在副标题写明）；
// 动画只改「怎么出现」，不改数值；单位写在副标题；虚构/示意数据每一镜角落都标。
(() => {
let W = 1920, H = 1080; U.onStage((w, h) => { W = w; H = h; });   // 画布尺寸跟 U.setStage 走（默认 1920×1080）
const { clamp, lerp } = U;
CH = {};
const seg = (t, a, b) => clamp((t - a) / (b - a));

// 线性比例尺：值 → 屏幕；f.inv 反查
CH.lin = (d0, d1, r0, r1) => { const f = v => r0 + (v - d0) / (d1 - d0) * (r1 - r0); f.inv = y => d0 + (y - r0) / (r1 - r0) * (d1 - d0); return f; };
// 1/2/2.5/5×10^k 的好看刻度
CH.ticks = (min, max, n = 5) => {
  const raw = (max - min) / n, mag = Math.pow(10, Math.floor(Math.log10(raw))), steps = [1, 2, 2.5, 5, 10];
  const step = steps.map(s => s * mag).find(s => s >= raw) || 10 * mag;
  const out = []; for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) out.push(+v.toFixed(10)); return out;
};
CH.mixHex = (a, b, t) => { const A = PAINT.hex(a), B = PAINT.hex(b); return `rgb(${lerp(A[0], B[0], t) | 0},${lerp(A[1], B[1], t) | 0},${lerp(A[2], B[2], t) | 0})`; };

// ---------- 网格：水平线从左往右逐条画出（lag 错开），零线更深更粗；刻度值跟着淡入 ----------
// F = {x,y,w,h} 绘图区；ys = 刻度值；yS = 值→屏幕 y；p = 0..1
CH.grid = (c, F, ys, yS, p, { col = 'rgba(0,0,0,.14)', zeroCol = '#121212', lw = 1.5, zeroLw = 3, lag = 0.12, font = '28px sans-serif', labelCol = '#5b5b5b', fmt = v => String(v), side = 'right', labelDy = -10 } = {}) => {
  c.save(); c.font = font; c.textBaseline = 'alphabetic';
  ys.forEach((v, i) => {
    const q = MO.lagged(i, ys.length, p, lag), e = MO.quintOut(q); if (q <= 0) return;
    const y = Math.round(yS(v)) + 0.5, isZero = Math.abs(v) < 1e-9;
    c.strokeStyle = isZero ? zeroCol : col; c.lineWidth = isZero ? zeroLw : lw;
    c.beginPath(); c.moveTo(F.x, y); c.lineTo(F.x + F.w * e, y); c.stroke();
    c.globalAlpha = seg(q, 0.3, 1); c.fillStyle = labelCol;
    if (side === 'right') { c.textAlign = 'right'; c.fillText(fmt(v), F.x + F.w, y + labelDy); }
    else { c.textAlign = 'left'; c.fillText(fmt(v), F.x, y + labelDy); }
    c.globalAlpha = 1;
  });
  c.restore();
};
// x 轴标签（年份等）：逐个淡入上移。items = [{x, label}]
CH.xLabels = (c, items, y, p, { font = '28px sans-serif', col = '#3a3a3a', lag = 0.1 } = {}) => {
  c.save(); c.font = font; c.textAlign = 'center'; c.fillStyle = col;
  items.forEach((it, i) => { const q = MO.quintOut(MO.lagged(i, items.length, p, lag)); if (q <= 0) return; c.globalAlpha = q; c.fillText(it.label, it.x, y + (1 - q) * 14); });
  c.restore();
};

// ---------- 柱：从基线 0 长出（quintOut），数值标签与柱顶同步计数（等宽数字） ----------
// data: [{x, v}]；bw 柱宽；p 0..1 总进度；hi 高亮下标（其余按 hiP 过渡到 dimCol）。返回各柱顶 [[x,y]]
CH.bars = (c, data, yS, bw, p, { lag = 0.18, col = '#1f5c99', hi = -1, hiP = 0, hiCol, dimCol = '#b9c3cc', label = true, fmt = v => v.toFixed(0), font = '30px sans-serif', labelCol = '#121212' } = {}) => {
  const y0 = yS(0), tops = [];
  data.forEach((d, i) => {
    const q = MO.lagged(i, data.length, p, lag), e = MO.quintOut(q);
    const v = d.v * e, y = yS(v);
    let fill = col;
    if (hi >= 0) fill = i === hi ? (hiCol || col) : CH.mixHex(col, dimCol, hiP);
    c.fillStyle = fill; c.fillRect(d.x - bw / 2, y, bw, y0 - y);
    tops.push([d.x, y]);
    if (label && q > 0) {
      c.save(); c.font = font; c.textAlign = 'center'; c.fillStyle = labelCol; c.globalAlpha = seg(q, 0.05, 0.4);
      if (d.v < 0) { c.textBaseline = 'top'; TY.tabular(c, fmt(v), d.x, y + 12, { align: 'center' }); }   // 负数柱：数值写在柱底下方，别写进柱子里
      else TY.tabular(c, fmt(v), d.x, y - 14, { align: 'center' });
      c.restore();
    }
  });
  return tops;
};

// ---------- 折线：按 x（时间）推进画出；头部圆点；可选面积渐变；返回头部点 ----------
// pts: 屏幕坐标（x 递增）；p: 0..1 = 画到 x 范围的哪里。area = {top, base, c0, c1}
CH.line = (c, pts, p, { col = '#e3120b', lw = 5, head = true, headR = 9, area, glow } = {}) => {
  if (p <= 0) return null;
  const xEnd = lerp(pts[0][0], pts[pts.length - 1][0], clamp(p));
  const vis = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    if (pts[i][0] <= xEnd) vis.push(pts[i]);
    else { const a = pts[i - 1], b = pts[i], q = (xEnd - a[0]) / (b[0] - a[0]); vis.push([xEnd, lerp(a[1], b[1], q)]); break; }
  }
  const hp = vis[vis.length - 1];
  if (area) {
    const g = c.createLinearGradient(0, area.top, 0, area.base); g.addColorStop(0, area.c0); g.addColorStop(1, area.c1);
    c.save(); c.beginPath(); c.moveTo(vis[0][0], area.base); vis.forEach(q => c.lineTo(q[0], q[1])); c.lineTo(hp[0], area.base); c.closePath(); c.fillStyle = g; c.fill(); c.restore();
  }
  c.save(); c.strokeStyle = col; c.lineWidth = lw; c.lineJoin = 'round'; c.lineCap = 'round';
  if (glow) { c.shadowColor = col; c.shadowBlur = glow; }
  c.beginPath(); vis.forEach((q, i) => i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1])); c.stroke(); c.restore();
  if (head && p < 1.0001) { c.save(); c.fillStyle = col; c.beginPath(); c.arc(hp[0], hp[1], headR, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#fff'; c.lineWidth = 3; c.stroke(); c.restore(); }
  return hp;
};
// 折线在 x 处的 y（标注要钉在线上）
CH.yAt = (pts, x) => { for (let i = 1; i < pts.length; i++) if (pts[i][0] >= x) { const a = pts[i - 1], b = pts[i]; return lerp(a[1], b[1], (x - a[0]) / (b[0] - a[0])); } return pts[pts.length - 1][1]; };

// ---------- K 线：逐根出现，实体从开盘价长到收盘价，影线随后；默认红涨绿跌（A 股惯例，海外片换成绿涨红跌并在副标题写明） ----------
// rows: [{o,h,l,c}]；xs: 每根中心 x；cw 实体宽；p 0..1
CH.candles = (c, rows, xs, yS, cw, p, { up = '#e0322f', down = '#11a05a', lag = 0.06, hollowUp = false } = {}) => {
  rows.forEach((r, i) => {
    const q = MO.lagged(i, rows.length, p, lag); if (q <= 0) return;
    const e = MO.quintOut(seg(q, 0, 0.7)), w = MO.quintOut(seg(q, 0.35, 1));
    const isUp = r.c >= r.o, col = isUp ? up : down, x = xs[i];
    const yo = yS(r.o), yc = lerp(yo, yS(r.c), e);
    c.save(); c.strokeStyle = col; c.fillStyle = col; c.lineWidth = 2.5;
    if (w > 0) { const ym = (yo + yS(r.c)) / 2; c.beginPath(); c.moveTo(x, lerp(ym, yS(r.h), w)); c.lineTo(x, lerp(ym, yS(r.l), w)); c.stroke(); }
    const top = Math.min(yo, yc), hgt = Math.max(2, Math.abs(yc - yo));
    if (isUp && hollowUp) { c.fillStyle = '#fff'; c.fillRect(x - cw / 2, top, cw, hgt); c.strokeRect(x - cw / 2, top, cw, hgt); }
    else c.fillRect(x - cw / 2, top, cw, hgt);
    c.restore();
  });
};

// ---------- 标注：圆点弹出（弹簧）→ 脉冲环 → 引线画出 → 文字淡入。时间用秒，便于对口播 ----------
// lt 秒；t0 开始时刻；(x,y) 数据点；(tx,ty) 文字锚点；lines 第一行用 font、其余用 font2（数字先说，比较后说）
CH.callout = (c, lt, t0, { x, y, tx, ty, lines = [], col = '#121212', dotCol = '#e3120b', font = '600 30px sans-serif', font2, align = 'left', r = 11 }) => {
  const k = lt - t0; if (k <= 0) return;
  const s = MO.spring(k, { duration: 0.45, bounce: 0.25 });
  c.save();
  c.fillStyle = dotCol; c.beginPath(); c.arc(x, y, r * Math.max(0, s), 0, Math.PI * 2); c.fill();
  const pr = seg(k, 0, 0.6); if (pr > 0 && pr < 1) { c.strokeStyle = dotCol; c.globalAlpha = 1 - pr; c.lineWidth = 3; c.beginPath(); c.arc(x, y, r + pr * 34, 0, Math.PI * 2); c.stroke(); c.globalAlpha = 1; }
  const lp = MO.quintOut(seg(k, 0.12, 0.45));
  if (lp > 0) { c.strokeStyle = col; c.lineWidth = 2; c.beginPath(); c.moveTo(x, y); c.lineTo(lerp(x, tx, lp), lerp(y, ty, lp)); c.stroke(); }
  const fp = MO.quintOut(seg(k, 0.3, 0.7));
  if (fp > 0) {
    c.globalAlpha = fp; c.fillStyle = col; c.textAlign = align; c.textBaseline = 'alphabetic';
    const dx = align === 'left' ? 12 : align === 'right' ? -12 : 0;
    lines.forEach((L, i) => { c.font = i === 0 ? font : (font2 || font); c.fillText(L, tx + dx + (1 - fp) * (align === 'right' ? 16 : -16), ty + 8 + i * 40); });
  }
  c.restore();
};

// ---------- 版式 ----------
CH.tag = (c, x, y, w = 64, h = 14, col = '#e3120b') => { c.fillStyle = col; c.fillRect(x, y, w, h); };
// 「示意数据」角标：右下圆角框。虚构数据每一镜都要有
CH.demoBadge = (c, text = '示意数据', { x = W - 40, y = 1040, font = '600 24px sans-serif', col = '#7a7a7a', box = 'rgba(0,0,0,.06)' } = {}) => {
  c.save(); c.font = font; c.textAlign = 'right'; c.textBaseline = 'middle';
  const w = c.measureText(text).width + 28; c.fillStyle = box; c.beginPath(); c.roundRect(x - w, y - 22, w, 44, 8); c.fill();
  c.strokeStyle = col; c.globalAlpha = 0.5; c.lineWidth = 1.5; c.stroke(); c.globalAlpha = 1;
  c.fillStyle = col; c.fillText(text, x - 14, y + 1); c.restore();
};
// 经济学人式整页版式（每镜都画）：白底 → 顶部细红线从左画出 → 左上红色小旗 → 标题 → 副标题（单位/口径）→ 左下来源 → 右下「示意数据」。
// lt = 本镜时间（版式 0.6s 内全部到位，之后才出坐标系）。badge 传 false 不画角标（真实数据时）。
CH.frame = (c, lt, { title, sub, source = '来源：示意数据', badge = '示意数据', bg = '#FFFFFF', red = '#E3120B', ink = '#0C0C0C', subCol = '#4F5B61', srcCol = '#7c868b',
  font = '"NotoSansSC"', x = 90 } = {}) => {
  c.fillStyle = bg; c.fillRect(0, 0, W, H);
  const p = MO.quintOut(MO.seg(lt, 0, 0.45));
  c.fillStyle = red; c.fillRect(0, 0, W * p, 8);
  CH.tag(c, x, 56, 96 * p, 22, red);
  c.save(); c.textBaseline = 'alphabetic'; c.textAlign = 'left';
  const tp = MO.quintOut(MO.seg(lt, 0.05, 0.5));
  c.globalAlpha = tp; c.font = `700 58px ${font}`; c.fillStyle = ink; c.fillText(title, x, 150 + (1 - tp) * 18);
  const sp = MO.quintOut(MO.seg(lt, 0.15, 0.6));
  c.globalAlpha = sp; c.font = `400 34px ${font}`; c.fillStyle = subCol; c.fillText(sub, x, 205 + (1 - sp) * 14);
  c.globalAlpha = 1; c.font = `400 26px ${font}`; c.fillStyle = srcCol; c.fillText(source, x, 1040);
  c.restore();
  if (badge) CH.demoBadge(c, badge, { x: W - 60, y: 1030, font: `700 28px ${font}`, col: red, box: 'rgba(227,18,11,0.06)' });
};
})();

/* ---------- 上游 lib/ui.js（原样，仅做文件头说明的四类机械改动） ---------- */
// 发布会式界面 UI：渐变光斑底（mesh gradient 近似）、毛玻璃卡片、伪 3D 透视（切片）、光扫过（sheen）、只画影子的投影、线性图标。
// 约定：坐标是 1920×1080 屏幕坐标；所有动画参数由调用方用时间算好传进来，本库不读时钟。
// 卡片展开成全屏、模糊推进是转场（transitions.js 的 expandRect / blurPush）。
// 坑：blur 会从画布外拉进透明像素——画进不清空的离屏会逐帧累积（qa 确定性 ✗），所以先铺原图再叠模糊版；
//     切片透视的条带取整像素首尾相接，别用「重叠 0.75px 防缝」，半透明下重叠处出竖纹。
(() => {
let W = 1920, H = 1080; U.onStage((w, h) => { W = w; H = h; });   // 画布尺寸跟 U.setStage 走（默认 1920×1080）
const { clamp, lerp } = U;
UI = {};
const cvs = {};
const scratch = (k, w, h) => { let c = cvs[k]; if (!c || c.width !== w || c.height !== h) { c = cvs[k] = document.createElement('canvas'); c.width = w; c.height = h; } return c; };
UI.scratch = scratch;

UI.rr = (c, x, y, w, h, r) => { c.beginPath(); c.roundRect(x, y, w, h, r); };
UI.rrPath = (x, y, w, h, r) => { const p = new Path2D(); p.roundRect(x, y, w, h, r); return p; };

// ---------- 渐变光斑底（mesh gradient 的廉价近似） ----------
// 小画布上画几团径向渐变（screen 叠加）→ 小画布上模糊 → 放大铺满 → 叠静态颗粒防色带。
// blobs: [{x,y,r,col:[r,g,b],a, ax,ay,period,ph}]  位置单位是屏幕像素，ax/ay 漂移振幅，period 秒
UI.mesh = (c, t, { base = '#05060a', blobs = [], blur = 40, scale = 0.25, grain = 0.04, key = 'mesh' } = {}) => {
  const sw = Math.round(W * scale), sh = Math.round(H * scale);
  const a = scratch(key + 'a', sw, sh), g = a.getContext('2d');
  g.globalCompositeOperation = 'source-over'; g.fillStyle = base; g.fillRect(0, 0, sw, sh);
  g.globalCompositeOperation = 'screen';
  for (const b of blobs) {
    const w = 2 * Math.PI / (b.period || 10), ph = b.ph || 0;
    const x = (b.x + (b.ax || 0) * Math.sin(w * t + ph)) * scale, y = (b.y + (b.ay || 0) * Math.cos(w * t * 0.83 + ph)) * scale, r = b.r * scale * (1 + 0.06 * Math.sin(w * t * 1.3 + ph));
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    const [R, G, B] = b.col, A = b.a == null ? 1 : b.a;
    gr.addColorStop(0, `rgba(${R},${G},${B},${A})`); gr.addColorStop(0.45, `rgba(${R},${G},${B},${A * 0.45})`); gr.addColorStop(1, `rgba(${R},${G},${B},0)`);
    g.fillStyle = gr; g.fillRect(0, 0, sw, sh);
  }
  const bb = scratch(key + 'b', sw, sh), gb = bb.getContext('2d');
  // 先铺不模糊的原图再叠模糊版：blur 会从画布外拉进透明像素，边缘半透明——画进不清空的离屏会逐帧累积（qa 确定性 ✗ 就是这么来的）
  gb.clearRect(0, 0, sw, sh); gb.drawImage(a, 0, 0); gb.filter = `blur(${blur * scale}px)`; gb.drawImage(a, 0, 0); gb.filter = 'none';
  c.save(); c.imageSmoothingQuality = 'high'; c.drawImage(bb, 0, 0, W, H);
  if (grain) { c.globalAlpha = grain; c.drawImage(UI.grainTex(), 0, 0); }
  c.restore();
};
// 静态颗粒（种子固定）：对抗 8bit 视频编码里大面积渐变的色带
UI.grainTex = () => PAINT.cached('gl_grain' + W + 'x' + H, W, H, (g) => {
  const r = U.rng(77), im = g.createImageData(W, H), d = im.data;
  for (let i = 0; i < d.length; i += 4) { const v = r() * 255; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
  g.putImageData(im, 0, 0);
});

// ---------- 背景的模糊副本（毛玻璃取样用） ----------
UI.backdrop = (src, { scale = 0.25, blur = 28, key = 'bd' } = {}) => {
  const sw = Math.round(W * scale), sh = Math.round(H * scale);
  const a = scratch(key, sw, sh), g = a.getContext('2d');
  g.clearRect(0, 0, sw, sh); g.drawImage(src, 0, 0, sw, sh); g.filter = `blur(${blur * scale}px)`; g.drawImage(src, 0, 0, sw, sh); g.filter = 'none';   // 同上：先垫原图防边缘透明
  return a;
};

// ---------- 阴影（只画影子，不画形状本身：形状移到屏外，影子偏移回来） ----------
UI.shadow = (c, x, y, w, h, r, { blur = 60, oy = 28, alpha = 0.45 } = {}) => {
  c.save(); c.shadowColor = `rgba(0,0,0,${alpha})`; c.shadowBlur = blur; c.shadowOffsetX = 4000; c.shadowOffsetY = oy;
  c.fillStyle = '#000'; UI.rr(c, x - 4000, y, w, h, r); c.fill(); c.restore();
};

// ---------- 毛玻璃卡片 ----------
// bd = UI.backdrop(...) 的结果；sample = 取样的屏幕矩形（默认与卡片同位，卡片画进离屏纹理时要传屏幕位置）
UI.glass = (c, { x, y, w, h, r = 28, bd, sample, tint = 0.07, stroke = 0.22, light = 0.16, shadow = true }) => {
  if (shadow) UI.shadow(c, x, y, w, h, r, { blur: 70, oy: 30, alpha: 0.5 });
  c.save(); UI.rr(c, x, y, w, h, r); c.clip();
  if (bd) { const s = bd.width / W, S = sample || { x, y, w, h }; c.drawImage(bd, S.x * s, S.y * s, S.w * s, S.h * s, x, y, w, h); }
  c.fillStyle = `rgba(255,255,255,${tint})`; c.fillRect(x, y, w, h);
  // 顶部受光：上缘一道柔和亮带（玻璃的厚度感）
  const g = c.createLinearGradient(0, y, 0, y + h * 0.5); g.addColorStop(0, `rgba(255,255,255,${light})`); g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g; c.fillRect(x, y, w, h * 0.5);
  c.restore();
  // 1px 描边：左上亮、右下暗（光从左上来）
  c.save(); const sg = c.createLinearGradient(x, y, x + w, y + h);
  sg.addColorStop(0, `rgba(255,255,255,${stroke * 1.8})`); sg.addColorStop(0.5, `rgba(255,255,255,${stroke * 0.5})`); sg.addColorStop(1, `rgba(255,255,255,${stroke})`);
  c.strokeStyle = sg; c.lineWidth = 1.5; UI.rr(c, x + 0.75, y + 0.75, w - 1.5, h - 1.5, r); c.stroke(); c.restore();
};

// ---------- 光扫过（sheen） ----------
// 在 clip 区域里让一道斜向亮带从左扫到右；p∈[0,1]；band 宽 width；angle 弧度
// comp：默认 'lighter'（叠在画面上）；在只含文字的离屏上用 'source-atop'（光只落在字上）
UI.sheen = (c, clipPath, p, { x0 = 0, x1 = W, width = 260, angle = -0.35, alpha = 0.32, col = '255,255,255', comp = 'lighter' } = {}) => {
  if (p <= 0 || p >= 1) return;
  const cx = lerp(x0 - width * 2, x1 + width * 2, p);
  c.save(); if (clipPath) c.clip(clipPath);
  c.globalCompositeOperation = comp;
  c.translate(cx, H / 2); c.rotate(angle);
  const g = c.createLinearGradient(-width, 0, width, 0);
  g.addColorStop(0, `rgba(${col},0)`); g.addColorStop(0.5, `rgba(${col},${alpha})`); g.addColorStop(1, `rgba(${col},0)`);
  c.fillStyle = g; c.fillRect(-width, -H * 1.5, width * 2, H * 3);
  c.restore();
};

// ---------- 伪 3D：把一张纹理绕 Y 轴（竖条切片）或 X 轴（横条切片）转 ----------
// tex: 卡片纹理（任意分辨率），屏幕中心 cx,cy，屏幕尺寸 w×h（未旋转时），ry/rx 弧度，persp 透视距离（px）
// 远侧变暗 shade（0..1），模拟侧光。条宽 strip px。
// 切片边界取整像素、首尾相接（不重叠也不留缝）：重叠 0.75px 防缝的老办法，在半透明纹理/半透明绘制下重叠处透明度叠加，出一条条竖纹横纹。
// 另外先画进离屏再整体按 alpha 贴回，整卡淡入淡出时也不出纹。
UI.persp = (c0, tex, { cx, cy, w, h, ry = 0, rx = 0, persp = 1600, strip = 3, shade = 0.35, alpha = 1 }) => {
  const sc = scratch('persp', W, H), c = sc.getContext('2d'); c.reset();
  c.save();
  const tw = tex.width, th = tex.height;
  if (Math.abs(ry) >= Math.abs(rx)) {
    const n = Math.max(8, Math.ceil(w / strip)), cs = Math.cos(ry), sn = Math.sin(ry);
    const P = u => { const X = (u - 0.5) * w, z = X * sn, s = persp / (persp + z); return [cx + X * cs * s, s]; };
    for (let i = 0; i < n; i++) {
      const u0 = i / n, u1 = (i + 1) / n, [x0, s0] = P(u0), [x1, s1] = P(u1), s = (s0 + s1) / 2;
      const hh = h * s, xa = Math.round(Math.min(x0, x1)), xb = Math.round(Math.max(x0, x1)); if (xb > xa) c.drawImage(tex, u0 * tw, 0, (u1 - u0) * tw, th, xa, cy - hh / 2, xb - xa, hh);
    }
    if (shade && ry) { // 转离观众的一侧暗一点
      const [xa] = P(0), [xb] = P(1), g = c.createLinearGradient(xa, 0, xb, 0), k = Math.min(1, Math.abs(Math.sin(ry)) * 2) * shade;
      g.addColorStop(0, `rgba(0,0,0,${ry > 0 ? 0 : k})`); g.addColorStop(1, `rgba(0,0,0,${ry > 0 ? k : 0})`);
      c.globalCompositeOperation = 'source-atop'; c.fillStyle = g; c.fillRect(Math.min(xa, xb), cy - h, Math.abs(xb - xa), h * 2);
    }
  } else {
    const n = Math.max(8, Math.ceil(h / strip)), cs = Math.cos(rx), sn = Math.sin(rx);
    const P = v => { const Y = (v - 0.5) * h, z = -Y * sn, s = persp / (persp + z); return [cy + Y * cs * s, s]; };
    for (let i = 0; i < n; i++) {
      const v0 = i / n, v1 = (i + 1) / n, [y0, s0] = P(v0), [y1, s1] = P(v1), s = (s0 + s1) / 2;
      const ww = w * s, ya = Math.round(Math.min(y0, y1)), yb = Math.round(Math.max(y0, y1)); if (yb > ya) c.drawImage(tex, 0, v0 * th, tw, (v1 - v0) * th, cx - ww / 2, ya, ww, yb - ya);
    }
  }
  c.restore();
  c0.save(); c0.globalAlpha *= alpha; c0.drawImage(sc, 0, 0); c0.restore();
};

// ---------- 线性图标（SF Symbols 气质：圆头、等线宽） ----------
UI.icon = (c, kind, x, y, s, col, t = 0, lw = 0.075) => {
  c.save(); c.translate(x, y); c.scale(s, s); c.strokeStyle = col; c.fillStyle = col; c.lineWidth = lw; c.lineCap = 'round'; c.lineJoin = 'round';
  if (kind === 'wave') {                    // 语音：5 根会跳的竖条
    const hs = [0.35, 0.7, 1, 0.6, 0.3];
    hs.forEach((h0, i) => { const h = h0 * (0.75 + 0.25 * Math.sin(t * 7 + i * 1.3)); const xx = -0.4 + i * 0.2; c.beginPath(); c.moveTo(xx, -h * 0.45); c.lineTo(xx, h * 0.45); c.stroke(); });
  } else if (kind === 'memory') {           // 记忆：三层叠片
    for (let k = 0; k < 3; k++) { const yy = -0.28 + k * 0.24 + 0.02 * Math.sin(t * 2 + k); c.beginPath(); c.moveTo(-0.45, yy); c.lineTo(0, yy - 0.18); c.lineTo(0.45, yy); c.lineTo(0, yy + 0.18); c.closePath(); c.globalAlpha = k === 0 ? 1 : 0.6; c.stroke(); }
  } else if (kind === 'agent') {            // 智能体：四角星 + 小星
    const r = 0.42 * (1 + 0.05 * Math.sin(t * 3));
    c.beginPath(); c.moveTo(0, -r); c.quadraticCurveTo(0, 0, r, 0); c.quadraticCurveTo(0, 0, 0, r); c.quadraticCurveTo(0, 0, -r, 0); c.quadraticCurveTo(0, 0, 0, -r); c.fill();
    const r2 = 0.16; c.translate(0.36, -0.36); c.beginPath(); c.moveTo(0, -r2); c.quadraticCurveTo(0, 0, r2, 0); c.quadraticCurveTo(0, 0, 0, r2); c.quadraticCurveTo(0, 0, -r2, 0); c.quadraticCurveTo(0, 0, 0, -r2); c.globalAlpha = 0.7; c.fill();
  }
  c.restore();
};
})();

/* ---------- 上游 lib/collage.js（原样，仅做文件头说明的四类机械改动） ---------- */
// 拼贴材料 CL（Vox / Missing Chapter / Borders 一路）：纸纹、撕纸边、网点照片、胶带、图钉、红线（下垂的线索绳）、
// 毛边荧光笔（multiply）、轻投影、带倾斜滑入放平、剪纸贴纸白边。
// 节奏铁律（y2 调研）：相机 60fps 平滑；桌上的纸片/荧光笔/红笔/打字按 12fps「一拍二」步进（MO.step）——stop-motion 手感的一半。
// 纸纹是贴死的（静态颗粒，不逐帧抖）。素材一次画好走 PAINT.cached，确定性。
(() => {
let W = 1920, H = 1080; U.onStage((w, h) => { W = w; H = h; });   // 画布尺寸跟 U.setStage 走（默认 1920×1080）
const { clamp, lerp, rng } = U;
CL = {};

// ---------- 纸 ----------
// 可平铺纸纹 tile：环面取样的 fbm 明暗（无缝）＋纤维短线＋细颗粒。用 c.createPattern(tile, 'repeat') 铺
CL.paperTile = (key, base, { size = 512, amt = 10, fibers = 260, grain = 10, fiberCol = [120, 100, 70], seed = 3 } = {}) => PAINT.cached('ytpaper_' + key, size, size, (g) => {
  const img = g.createImageData(size, size), d = img.data, b = PAINT.hex(base), r = rng(seed);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const ax = x / size * Math.PI * 2, ay = y / size * Math.PI * 2;
    const n = PAINT.fbm(Math.cos(ax) * 1.6 + 10, Math.sin(ax) * 1.6 + Math.cos(ay) * 1.6, 4) * 0.6 + PAINT.noise(Math.sin(ay) * 3 + 5, Math.cos(ay) * 3) * 0.4;
    const gr = (r() - .5) * grain, i = (y * size + x) * 4;
    d[i] = b[0] + n * amt + gr; d[i + 1] = b[1] + n * amt + gr; d[i + 2] = b[2] + n * amt * 0.9 + gr; d[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  g.lineCap = 'round';
  for (let k = 0; k < fibers; k++) { const x = r() * size, y = r() * size, a = r() * Math.PI, l = 4 + r() * 14;
    g.strokeStyle = PAINT.rgb(fiberCol, 0.05 + r() * 0.08); g.lineWidth = 0.6 + r() * 0.8;
    for (const ox of [0, -size, size]) for (const oy of [0, -size, size]) { g.beginPath(); g.moveTo(x + ox, y + oy); g.quadraticCurveTo(x + ox + Math.cos(a + 1) * l * 0.5, y + oy + Math.sin(a + 1) * l * 0.5, x + ox + Math.cos(a) * l, y + oy + Math.sin(a) * l); g.stroke(); } }
});
CL.fillPaper = (c, tile, x, y, w, h) => { c.save(); c.fillStyle = c.createPattern(tile, 'repeat'); c.fillRect(x, y, w, h); c.restore(); };
// 撕纸边：沿一条线生成锯齿＋纤维的点列（左→右），amp 起伏、seed 固定
CL.tornEdge = (x0, y0, x1, y1, { step = 9, amp = 10, seed = 5 } = {}) => {
  const r = rng(seed), L = Math.hypot(x1 - x0, y1 - y0), n = Math.max(2, Math.round(L / step)), nx = -(y1 - y0) / L, ny = (x1 - x0) / L, o = [];
  for (let i = 0; i <= n; i++) { const q = i / n, k = PAINT.noise(i * 0.18, seed) * amp + (r() - .5) * amp * 0.9; o.push([lerp(x0, x1, q) + nx * k, lerp(y0, y1, q) + ny * k]); }
  return o;
};
// 撕边矩形 (0,0,w,h)：只建路径（beginPath…closePath），调用方 fill / clip
CL.tornRect = (g, w, h, seed, amp = 5) => {
  const pts = [...CL.tornEdge(0, 0, w, 0, { amp, seed }), ...CL.tornEdge(w, 0, w, h, { amp, seed: seed + 1 }), ...CL.tornEdge(w, h, 0, h, { amp, seed: seed + 2 }), ...CL.tornEdge(0, h, 0, 0, { amp, seed: seed + 3 })];
  g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath();
};

// ---------- 网点照片 ----------
// 灰度网点：源图（canvas）按亮度转成 45° 网点，cell 像素一格；只留在源图不透明处。结果缓存（key 唯一）
CL.halftone = (key, src, { cell = 7, ink = '#1b1b1b', paper = '#efe9dc', angle = Math.PI / 4, gamma = 1, contrast = 1.15 } = {}) => PAINT.cached('ytht_' + key, src.width, src.height, (g) => {
  const w = src.width, h = src.height, sd = src.getContext('2d').getImageData(0, 0, w, h).data;
  g.fillStyle = paper; g.fillRect(0, 0, w, h); g.fillStyle = ink;
  const ca = Math.cos(angle), sa = Math.sin(angle), R = Math.hypot(w, h);
  g.beginPath();
  for (let v = -R; v < R; v += cell) for (let u = -R; u < R; u += cell) {
    const x = w / 2 + u * ca - v * sa, y = h / 2 + u * sa + v * ca; if (x < -cell || y < -cell || x > w + cell || y > h + cell) continue;
    const ix = clamp(x | 0, 0, w - 1), iy = clamp(y | 0, 0, h - 1), i = (iy * w + ix) * 4;
    if (sd[i + 3] < 10) continue;
    let L = (sd[i] * .3 + sd[i + 1] * .59 + sd[i + 2] * .11) / 255; L = clamp((L - 0.5) * contrast + 0.5); L = Math.pow(L, gamma);
    const rr = cell * 0.62 * Math.sqrt(1 - L); if (rr < 0.4) continue;
    g.moveTo(x + rr, y); g.arc(x, y, rr, 0, Math.PI * 2);
  }
  g.fill();
  g.globalCompositeOperation = 'destination-in'; g.drawImage(src, 0, 0); g.globalCompositeOperation = 'source-over';
});
// 网点照片贴纸：draw(g, w, h) 画源图 → 网点 → 加 border 宽的纸边、一层旧纸色（multiply）。返回缓存 canvas（尺寸 w+2b × h+2b）
CL.photo = (key, w, h, draw, { border = 14, cell = 6, paper = '#f2f0ea', ink = '#1a1a1a', htPaper = '#e8e4da', contrast = 1.3 } = {}) => PAINT.cached('clphoto_' + key, w + border * 2, h + border * 2, (g) => {
  const src = PAINT.canvas(w, h); draw(src.getContext('2d'), w, h);
  const ht = CL.halftone(key + '_ht', src, { cell, ink, paper: htPaper, contrast });
  g.fillStyle = paper; g.fillRect(0, 0, w + border * 2, h + border * 2); g.drawImage(ht, border, border);
  g.globalCompositeOperation = 'multiply'; g.fillStyle = 'rgba(214,205,185,.3)'; g.fillRect(0, 0, w + border * 2, h + border * 2); g.globalCompositeOperation = 'source-over';
});

// ---------- 摆放 ----------
CL.placed = (g, x, y, r, fn) => { g.save(); g.translate(x, y); g.rotate(r); fn(g); g.restore(); };
// 轻投影（Vox 桌面上留一点就够；黑底卡片几乎无投影）
CL.shadowed = (g, fn, { col = 'rgba(50,40,25,.28)', blur = 10, x = 3, y = 6 } = {}) => { g.save(); g.shadowColor = col; g.shadowBlur = blur; g.shadowOffsetX = x; g.shadowOffsetY = y; fn(); g.restore(); };
// 带倾斜滑入、到位放平（MC 实测：滑入带 5–15° 倾斜，约 0.6–0.8s），按 12fps 步进。返回进度 q
CL.slideIn = (g, t, t0, x, y, r, fn, { from = [420, -60], tilt = 0.2, dur = 0.6, fps = 12 } = {}) => {
  const q = clamp((MO.step(t, fps) - t0) / dur); if (q <= 0) return 0;
  const e = MO.quartOut(q);
  g.save(); g.translate(x + from[0] * (1 - e), y + from[1] * (1 - e)); g.rotate(r + tilt * (1 - Math.min(1, e * 1.15))); fn(g); g.restore(); return q;
};
// 胶带：一条半透明撕边纸条
CL.tape = (g, x, y, a, w = 120, col = 'rgba(226,220,200,.85)') => { g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = col; g.translate(-w / 2, -17); CL.tornRect(g, w, 34, (x * 7 + y) | 0, 3); g.fill(); g.restore(); };
// 图钉
CL.pin = (g, x, y, col = '#b8433f') => { g.save(); g.translate(x, y); g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.arc(3, 5, 12, 0, 7); g.fill(); g.fillStyle = col; g.beginPath(); g.arc(0, 0, 12, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.arc(-4, -4, 4, 0, 7); g.fill(); g.restore(); };
// 调查墙的线索绳：a→b 之间按长度 sag 下垂的二次曲线点列（配 DG.cum / DG.drawPartial 逐段描出）
CL.stringPts = (a, b, sag = 0.08, n = 48) => { const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2 + Math.hypot(b[0] - a[0], b[1] - a[1]) * sag; const o = []; for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; o.push([u * u * a[0] + 2 * u * t * mx + t * t * b[0], u * u * a[1] + 2 * u * t * my + t * t * b[1]]); } return o; };
// 红线：带投影描出前 d 长度（d 用弧长；整根画完传 1e9）
CL.string = (g, pts, cum, d, { col = '#b8433f', lw = 5, shadow = 'rgba(0,0,0,.16)' } = {}) => {
  if (shadow) { g.save(); g.strokeStyle = shadow; g.lineWidth = lw; g.translate(3, 6); DG.drawPartial(g, pts, cum, d); g.restore(); }
  g.save(); g.strokeStyle = col; g.lineWidth = lw; g.lineCap = 'round'; DG.drawPartial(g, pts, cum, d); g.restore();
};
// 毛边荧光笔（multiply，压在印刷字上）：q 0..1 从左扫到右
CL.highlight = (g, x0, y0, w, h, q, col = 'rgba(218,207,8,.9)') => { if (q <= 0) return; g.save(); g.globalCompositeOperation = 'multiply'; g.fillStyle = col;
  g.beginPath(); const ww = w * q; g.moveTo(x0, y0 + 4); for (let i = 0; i <= 20; i++) g.lineTo(x0 + ww * i / 20, y0 + Math.sin(i * 1.7) * 2); g.lineTo(x0 + ww + 6, y0 + h / 2); g.lineTo(x0 + ww, y0 + h);
  for (let i = 20; i >= 0; i--) g.lineTo(x0 + ww * i / 20, y0 + h + Math.sin(i * 2.3) * 2); g.closePath(); g.fill(); g.restore(); };
// 剪纸贴纸白边：把 src（全屏离屏里的角色/物件）向四周膨胀 border 像素铺 col，返回同尺寸离屏；用法：先画返回值、再画 src
CL.stickerEdge = (src, key, border = 12, col = '#f4f2ec', dirs = 16) => {
  const sil = PAINT.scratch(key), sg = sil.getContext('2d'); sg.reset();
  for (let a = 0; a < dirs; a++) sg.drawImage(src, Math.cos(a / dirs * 6.283) * border, Math.sin(a / dirs * 6.283) * border);
  sg.globalCompositeOperation = 'source-in'; sg.fillStyle = col; sg.fillRect(0, 0, W, H);
  return sil;
};
})();

/* ---------- 上游 lib/toon.js（原样，仅做文件头说明的四类机械改动） ---------- */
// 卡通与扁平插画 TOON：Kurzgesagt 式「无描边、双色分面」、柔光；故事型（storytime）极简角色「豆子花叔」、
// pose-to-pose 换姿势（快切＋身体挤压回弹）、眨眼时刻表、口型读口播包络（一拍二）、汗滴、漫画符号。
(() => {
const { clamp, lerp } = U;
TOON = {};

// ---------- 扁平插画 ----------
// 双色分面（无描边、靠色块分面）：clip(S) → 整块阴影色 → 往光源方向平移 v 填高光 → 再往回挪 w 填本色：右下留阴影带、左上留细高光边
TOON.flat = (c, path, base, sh, hi, v = [10, 12], w = [4, 5]) => {
  c.save(); c.clip(path);
  c.fillStyle = sh || base; c.fill(path);
  c.save(); c.translate(-v[0], -v[1]); c.fillStyle = hi || base; c.fill(path); c.restore();
  c.save(); c.translate(-v[0] + w[0], -v[1] + w[1]); c.fillStyle = base; c.fill(path); c.restore();
  c.restore();
};
// 柔光：径向渐变方块（发光物、眼睛、信号脉冲）
TOON.glow = (c, x, y, r, col, a = 1) => { const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, PAINT.rgb(PAINT.hex(col), a)); g.addColorStop(1, PAINT.rgb(PAINT.hex(col), 0)); c.fillStyle = g; c.fillRect(x - r, y - r, 2 * r, 2 * r); };
// 竖向渐变（天空）
TOON.vgrad = (c, y0, y1, cols) => { const g = c.createLinearGradient(0, y0, 0, y1); cols.forEach((k, i) => g.addColorStop(i / (cols.length - 1), k)); return g; };
TOON.circle = (x, y, r) => { const p = new Path2D(); p.arc(x, y, r, 0, Math.PI * 2); return p; };
TOON.ellipse = (x, y, rx, ry, a = 0) => { const p = new Path2D(); p.ellipse(x, y, rx, ry, a, 0, Math.PI * 2); return p; };

// ---------- 口型：读口播包络 ----------
// window.VO_ENV = {fps, a:[...]}（0..1 的 RMS 包络，由音频脚本从口播 wav 生成）。口型「一拍二」：每 1/12 秒才换一次形。
TOON.env = t => { const E = window.VO_ENV; if (!E) return 0; const i = Math.round(t * E.fps); return i < 0 || i >= E.a.length ? 0 : E.a[i]; };
TOON.mouth = (t, fps = 12) => { const v = TOON.env(MO.step(t, fps)); return v < 0.06 ? 0 : v < 0.22 ? 1 : 2; };   // 0 闭 1 半 2 张

// ---------- 手臂姿势表（上游配它的角色用；角色本身没有收进来，姿势表和换姿势的算法是通用的） ----------
const SK = '#FFE2CC', LINE = '#1B1B1F', HAT = '#FFFFFF', BAND = '#E4E4E8', SHIRT = '#FFFFFF', SHORTS = '#CDBB97', HAIR = '#1B1B1F';
TOON.POSES = {
  rest:  { l: [-0.95, 1.05], r: [0.95, 1.05] },
  talk:  { l: [-0.95, 1.05], r: [1.05, 0.55] },          // 一只手微抬，口播默认
  point: { l: [-0.95, 1.05], r: [1.75, -0.15] },         // 指向画右
  type:  { l: [-0.55, 0.62], r: [0.55, 0.62] },          // 双手在胸前（打字）
  shrug: { l: [-1.45, -0.05], r: [1.45, -0.05], palms: 1 },
  stiff: { l: [-0.78, 1.25], r: [0.78, 1.25] },          // 僵住
};
// （TOON.bean：上游作者本人的卡通形象，没有收进工坊）

// ---------- pose-to-pose ----------
// keys = [[t, poseName, expr], ...]（同一条时间轴的秒）。换姿势：手臂 0.1s expoOut 过去（24fps 下 3 帧的「快切」），
// 身体同时挤压 7% 后按弹簧回弹（3.5Hz / 衰减 9）。返回 { pose, expr, squash, since }
TOON.poseAt = (keys, t, poses = TOON.POSES) => {
  let k = 0; for (let i = 0; i < keys.length; i++) if (t >= keys[i][0]) k = i;
  const cur = poses[keys[k][1]], prv = poses[keys[Math.max(0, k - 1)][1]];
  const dt = t - keys[k][0], q = k === 0 ? 1 : MO.expoOut(clamp(dt / 0.1));
  const mix = (a, b) => [lerp(a[0], b[0], q), lerp(a[1], b[1], q)];
  return { pose: { l: mix(prv.l, cur.l), r: mix(prv.r, cur.r), palms: cur.palms }, expr: keys[k][2], squash: k === 0 ? 1 : 1 + MO.settle(dt, -0.07, 3.5, 9), since: dt };
};
// 眨眼：固定时刻表（间隔 2.4–3.6s 的「随机」写死），闭眼 dur 秒（24fps 下 2 帧 ≈ 0.083s；「无语」的慢眨眼 3 帧）
TOON.blinkAt = (t, times, dur = 0.083) => times.some(b => t >= b && t < b + dur) ? 1 : 0;
// 活着：说话时头随口型轻点（每次张嘴下沉 0.015R）＋呼吸（1.6s 一周期，身体 ±1.2%）
TOON.alive = (t, R) => ({ bob: TOON.mouth(t) * R * 0.015, breathe: 1 + 0.012 * Math.sin(2 * Math.PI * t / 1.6) });

// ---------- 漫画符号 ----------
// 汗滴：p 0..1 沿脸侧滑下
TOON.sweat = (c, x, y, r, p) => {
  const yy = y + p * r * 3.2, a = p < 0.85 ? 1 : 1 - (p - 0.85) / 0.15;
  c.save(); c.globalAlpha = a; c.fillStyle = '#9ED8F5'; c.strokeStyle = LINE; c.lineWidth = Math.max(3, r * 0.12);
  c.beginPath(); c.moveTo(x, yy - r * 1.5); c.quadraticCurveTo(x + r * 1.05, yy + r * 0.1, x, yy + r); c.quadraticCurveTo(x - r * 1.05, yy + r * 0.1, x, yy - r * 1.5); c.fill(); c.stroke();
  c.fillStyle = '#fff'; c.beginPath(); c.ellipse(x - r * 0.3, yy - r * 0.05, r * 0.18, r * 0.32, 0, 0, Math.PI * 2); c.fill(); c.restore();
};
// 「？」「！」弹出（白描边，过冲 30%）
TOON.mark = (c, ch, x, y, p, size = 160, color = LINE) => { if (p <= 0) return; TY.pop(c, ch, x, y, p, { size, fam: 'PuHui-Black', color, stroke: '#fff', strokeW: size * 0.12, over: 3 }); };
})();

/* ---------- 上游 transitions.js（原样，仅做文件头说明的四类机械改动） ---------- */
// 转场库：每个函数 (c, A, B, p, o) —— A=旧画面 canvas，B=新画面 canvas，p∈[0,1]，
// o: {W,H,lt,t,tmp,IMG, ...该转场在 eras.js 里的参数}。确定性：随机数一律 U.rng(种子)。
// 每个转场都取「新时代」最有辨识度的形式元素（见 经验日志「转场」）。
(() => {
const { clamp, lerp, ease, rng } = U, TAU = Math.PI * 2;
const seg = (p, a, b) => clamp((p - a) / (b - a));          // 把 p 的 [a,b] 段拉成 0..1

// 缓存：同一转场里不随时间变化的预计算（瓦片表、离屏画布…）。
// 只缓存「和画面内容无关」的东西（几何表、scratch 画布）。依赖 A/B 画面内容的东西不要缓存：
// 缓存的是第一次被调用那一帧，同名转场在片中用第二次会画出第一次的内容，乱序渲染时还依赖调用顺序（迁移测试 B ②-10）。
// 确实要按段缓存时传 o：once(k, f, o) 的键带上进入段 id。
const cache = {};
const once = (k, f, o) => { const kk = o ? `${o.id}|${k}` : k; return cache[kk] || (cache[kk] = f()); };

const mkc = (w = W, h = H) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

const T = TRANSITIONS = {
  crossfade(c, A, B, p) { c.drawImage(A, 0, 0); c.globalAlpha = p; c.drawImage(B, 0, 0); c.globalAlpha = 1; },
  cut(c, A, B, p) { c.drawImage(p < 0.5 ? A : B, 0, 0); },

  // ① 洞穴→埃及：新画面拆成大小不一的石块，从左向右（带随机）拼进来，落位时从略大略偏处「砌」进去
  tiles(c, A, B, p, o) {
    const tiles = once('tiles', () => {
      const r = rng(7), out = [];
      // 三种块尺寸混排：先铺大块网格，再随机把一部分拆成小块
      const bw = 240, bh = 180;
      for (let y = 0; y < H; y += bh) for (let x = 0; x < W; x += bw) {
        if (r() < 0.45) { for (let yy = 0; yy < 2; yy++) for (let xx = 0; xx < 2; xx++) out.push({ x: x + xx * bw / 2, y: y + yy * bh / 2, w: bw / 2, h: bh / 2 }); }
        else out.push({ x, y, w: bw, h: bh });
      }
      out.forEach(t => { t.t = clamp((t.x + t.w / 2) / W * 0.62 + r() * 0.3); t.dx = (r() - 0.5) * 60; t.dy = -30 - r() * 50; t.rot = (r() - 0.5) * 0.12; });
      return out;
    });
    c.drawImage(A, 0, 0);
    for (const t of tiles) {
      const q = clamp((p - t.t * 0.7) / 0.28); if (q <= 0) continue;
      const e = ease.outBack(q);
      c.save();
      c.translate(t.x + t.w / 2 + t.dx * (1 - e), t.y + t.h / 2 + t.dy * (1 - e));
      c.rotate(t.rot * (1 - e));
      const s = 1.08 - 0.08 * e; c.scale(s, s);
      if (q < 1) { c.shadowColor = 'rgba(30,15,5,.55)'; c.shadowBlur = 18 * (1 - q); c.shadowOffsetY = 10 * (1 - q); }
      c.drawImage(B, t.x, t.y, t.w, t.h, -t.w / 2, -t.h / 2, t.w, t.h);
      c.restore();
    }
  },

  // ② 埃及→希腊：立方体绕竖轴转面（旧面向左转走，新面从右转入），面上有明暗
  cube(c, A, B, p) {
    const e = ease.inOut(p), th = e * Math.PI / 2;
    c.fillStyle = '#0d0a08'; c.fillRect(0, 0, W, H);
    const face = (img, ang, side) => {
      // 正交近似透视：面宽 = W*cos(ang)，远端边缩短 k
      const w = W * Math.cos(ang); if (w < 2) return;
      const N = 48, k = 0.18 * Math.sin(ang);
      for (let i = 0; i < N; i++) {
        const u0 = i / N, u1 = (i + 1) / N;
        const far = side === 'left' ? 1 - u0 : u0;                 // 远端在转出去的那一侧
        const sh = 1 - k * far, hh = H * sh;
        const x = side === 'left' ? u0 * w : W - w + u0 * w;
        c.drawImage(img, u0 * W, 0, W / N + 1, H, x, (H - hh) / 2, w / N + 1, hh);
      }
      c.fillStyle = `rgba(0,0,0,${0.55 * Math.sin(ang)})`;
      c.fillRect(side === 'left' ? 0 : W - w, 0, w, H);
    };
    face(A, th, 'left');
    face(B, Math.PI / 2 - th, 'right');
  },

  // ③ 希腊→罗马：马赛克小砖翻面——从猫的位置向外扩散，翻面瞬间露出深色砖背
  mosaic(c, A, B, p, o) {
    const tw = 18, th = 34, ox = W * 0.27, oy = H * 0.72;
    const grid = once('mosaic', () => {
      const r = rng(11), g = [], maxd = Math.hypot(W, H) * 0.8;
      for (let y = 0; y < H; y += th) for (let x = 0; x < W; x += tw) {
        const d = Math.hypot(x - ox, (y - oy) * 1.3) / maxd;
        g.push({ x, y, t: clamp(d * 0.75 + r() * 0.25) });
      }
      return g;
    });
    c.drawImage(A, 0, 0);
    for (const g of grid) {
      const q = (p - g.t * 0.78) / 0.16;
      if (q <= 0) continue;
      if (q >= 1) { c.drawImage(B, g.x, g.y, tw, th, g.x, g.y, tw, th); continue; }
      // 翻面：宽度按 |cos| 缩放，前半显示深色砖背，后半显示新砖
      const sx = Math.abs(Math.cos(q * Math.PI));
      c.fillStyle = '#17110d'; c.fillRect(g.x, g.y, tw, th);
      const w = tw * sx;
      if (q > 0.5) c.drawImage(B, g.x, g.y, tw, th, g.x + (tw - w) / 2, g.y, w, th);
      else { c.fillStyle = '#2a1c14'; c.fillRect(g.x + (tw - w) / 2, g.y, w, th); }
    }
  },

  // ④ 罗马→哥特：羊皮纸翻页，卷边从右向左扫过，背面是带淡淡旧画透印的羊皮纸
  pageTurn(c, A, B, p) {
    const e = ease.inOut(p);
    const band = 260;
    const x = lerp(W + band, -band * 1.4, e);          // 卷边位置
    c.drawImage(B, 0, 0);
    // 旧页：卷边左侧
    c.save(); c.beginPath(); c.rect(0, 0, Math.max(0, x - band * 0.15), H); c.clip(); c.drawImage(A, 0, 0); c.restore();
    // 卷起的页背：羊皮纸色＋旧画镜像透印＋圆柱明暗
    c.save();
    c.beginPath(); c.rect(x - band * 0.15, 0, band, H); c.clip();
    c.fillStyle = '#e9dcc0'; c.fillRect(x - band * 0.15, 0, band, H);
    c.globalAlpha = 0.18; c.save(); c.translate(2 * x + band * 0.7, 0); c.scale(-1, 1); c.drawImage(A, 0, 0); c.restore(); c.globalAlpha = 1;
    const g = c.createLinearGradient(x - band * 0.15, 0, x + band * 0.85, 0);
    g.addColorStop(0, 'rgba(60,40,20,.45)'); g.addColorStop(0.18, 'rgba(255,248,230,.25)'); g.addColorStop(0.55, 'rgba(120,90,50,.12)'); g.addColorStop(1, 'rgba(40,25,10,.55)');
    c.fillStyle = g; c.fillRect(x - band * 0.15, 0, band, H);
    c.restore();
    // 卷边投在新页上的影子
    const sg = c.createLinearGradient(x + band * 0.85, 0, x + band * 0.85 + 90, 0);
    sg.addColorStop(0, 'rgba(30,20,10,.35)'); sg.addColorStop(1, 'rgba(30,20,10,0)');
    c.fillStyle = sg; c.fillRect(x + band * 0.85, 0, 90, H);
  },

  // ⑤ 哥特→文艺复兴：窗口迸出金色神光，光芒里旧画渐隐、新画浮现
  godRays(c, A, B, p, o) {
    const cx = o.cx || 440, cy = o.cy || 300;
    c.drawImage(A, 0, 0);
    c.globalAlpha = ease.out(seg(p, 0.05, 0.5)); c.drawImage(B, 0, 0); c.globalAlpha = 1;
    // 光晕
    const glow = Math.sin(Math.PI * Math.pow(seg(p, 0, 1), 0.6));
    const rg = c.createRadialGradient(cx, cy, 0, cx, cy, 520);
    rg.addColorStop(0, `rgba(255,246,210,${0.85 * glow})`); rg.addColorStop(0.35, `rgba(255,220,140,${0.35 * glow})`); rg.addColorStop(1, 'rgba(255,220,140,0)');
    c.globalCompositeOperation = 'lighter'; c.fillStyle = rg; c.fillRect(0, 0, W, H);
    // 光芒
    const r = rng(5), n = 34, rot = p * 0.35;
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2 + rot + r() * 0.08, len = 2400, wd = 0.006 + r() * 0.01;
      const al = glow * (0.25 + r() * 0.45);
      c.fillStyle = `rgba(255,214,120,${al})`;
      c.beginPath(); c.moveTo(cx, cy);
      c.lineTo(cx + Math.cos(a - wd) * len, cy + Math.sin(a - wd) * len);
      c.lineTo(cx + Math.cos(a + wd) * len, cy + Math.sin(a + wd) * len); c.fill();
    }
    c.globalCompositeOperation = 'source-over';
  },

  // ⑥ 文艺复兴→浮世绘：神奈川冲浪里的巨浪从左向右横扫，浪头白沫爪＋飞溅浪花，浪后是新画面
  wave(c, A, B, p) {
    const e = ease.inOut(p);
    const bw = 300;                                     // 浪带宽
    const x0 = lerp(-bw - 120, W + 260, e);             // 浪带左缘
    const edge = y => x0 + Math.sin(y / H * Math.PI * 1.6 + 0.6) * 70;   // S 形
    c.drawImage(A, 0, 0);
    // 新画面：浪带左侧
    c.save(); c.beginPath(); c.moveTo(-10, 0);
    for (let y = 0; y <= H; y += 20) c.lineTo(edge(y) + 10, y);
    c.lineTo(-10, H); c.closePath(); c.clip(); c.drawImage(B, 0, 0); c.restore();
    // 浪带本体
    c.save(); c.beginPath();
    for (let y = 0; y <= H; y += 20) c.lineTo(edge(y), y);
    for (let y = H; y >= 0; y -= 20) c.lineTo(edge(y) + bw, y);
    c.closePath(); c.fillStyle = '#1f3f8a'; c.fill(); c.clip();
    // 浪纹：几条平行的浅蓝曲线
    c.strokeStyle = 'rgba(170,200,240,.75)'; c.lineWidth = 6;
    for (let k = 1; k < 7; k++) {
      c.beginPath();
      for (let y = 0; y <= H; y += 20) c.lineTo(edge(y) + k * bw / 7 + Math.sin(y / 60 + k) * 6, y);
      c.stroke();
    }
    c.restore();
    // 浪头白沫爪（右缘锯齿）
    c.fillStyle = '#fbf7ec'; c.strokeStyle = '#1b2a55'; c.lineWidth = 2;
    for (let y = -20; y < H + 40; y += 54) {
      const ex = edge(y) + bw;
      c.beginPath(); c.moveTo(ex - 6, y);
      c.quadraticCurveTo(ex + 40, y + 6, ex + 58, y + 22);
      c.quadraticCurveTo(ex + 30, y + 26, ex + 22, y + 40);
      c.quadraticCurveTo(ex + 10, y + 46, ex - 6, y + 54); c.closePath(); c.fill(); c.stroke();
    }
    // 飞沫
    const r = rng(19);
    for (let i = 0; i < 70; i++) {
      const y = r() * H, ex = edge(y) + bw + 30 + r() * 170, rr = 3 + r() * 7;
      c.globalAlpha = 0.9 * (1 - r() * 0.5);
      c.beginPath(); c.arc(ex, y, rr, 0, Math.PI * 2); c.fill();
    }
    c.globalAlpha = 1;
  },

  // ⑦ 浮世绘→印象派：一笔笔短促的彩色笔触把新画面「画」上去
  dabs(c, A, B, p) {
    const D = once('dabs', () => {
      const r = rng(23), out = [];
      for (let i = 0; i < 2600; i++) out.push({ x: r() * W, y: r() * H, a: -0.9 + r() * 0.5, l: 34 + r() * 46, w: 10 + r() * 10, t: r() });
      return out;
    });
    c.drawImage(A, 0, 0);
    const q = ease.out(seg(p, 0, 0.7));
    c.save(); c.beginPath();
    let any = false;
    for (const d of D) {
      if (d.t > q) continue; any = true;
      const s = clamp((q - d.t) / 0.12);
      c.moveTo(d.x + Math.cos(d.a) * d.l * s / 2, d.y + Math.sin(d.a) * d.l * s / 2);
      c.ellipse(d.x, d.y, d.l * s / 2, d.w / 2, d.a, 0, Math.PI * 2);
    }
    if (any) { c.clip(); c.drawImage(B, 0, 0); }
    c.restore();
    // 浮在上面的零星亮色笔触（印象派光斑）
    const r = rng(29), al = Math.sin(Math.PI * p) * 0.8;
    const cols = ['#f6e27a', '#f2a7c3', '#b9d9f2', '#c6e8a8', '#ffffff'];
    for (let i = 0; i < 260; i++) {
      const x = r() * W, y = r() * H, a = -0.8 + r() * 0.4, l = 20 + r() * 30, col = cols[(r() * cols.length) | 0];
      if (r() > al) continue;
      c.fillStyle = col; c.globalAlpha = 0.75; c.beginPath(); c.ellipse(x, y, l / 2, 4 + r() * 3, a, 0, Math.PI * 2); c.fill();
    }
    c.globalAlpha = 1;
    if (p > 0.7) { c.globalAlpha = seg(p, 0.7, 1); c.drawImage(B, 0, 0); c.globalAlpha = 1; }
  },

  // ⑧ 印象派→梵高：星空漩涡——以窗户为中心的旋涡扭曲，新画面带着旋转卷进来、最后摆正
  swirl(c, A, B, p, o) {
    const cx = o.cx || 420, cy = o.cy || 300;
    const S = 2;                                        // 半分辨率做像素扭曲
    const w = W / S, h = H / S;
    const src = once('swirlSrc', () => ({ a: mkc(w, h), b: mkc(w, h), out: mkc(w, h) }));
    const sa = src.a.getContext('2d'), sb = src.b.getContext('2d'), so = src.out.getContext('2d');
    sa.drawImage(A, 0, 0, w, h); sb.drawImage(B, 0, 0, w, h);
    const da = sa.getImageData(0, 0, w, h).data, db = sb.getImageData(0, 0, w, h).data;
    const out = so.createImageData(w, h), d = out.data;
    const e = ease.out(p);
    const R = 1100 / S, ccx = cx / S, ccy = cy / S;
    const twA = e * 5.0, twB = (1 - e) * 4.2, rotB = -(1 - e) * 0.9;
    const mixR = e * 2.4;                               // 新画面从中心向外占领的半径（相对 R）
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const dx = x - ccx, dy = y - ccy, r = Math.hypot(dx, dy), ang = Math.atan2(dy, dx), f = Math.max(0, 1 - r / R);
      const useB = r / R < mixR - 0.15 + Math.sin(ang * 3 + r / 40) * 0.08;
      let a2, sd;
      if (useB) { a2 = ang + twB * f * f + rotB * Math.min(1, f * 1.6); sd = db; } else { a2 = ang - twA * f * f; sd = da; }
      let sx = (ccx + Math.cos(a2) * r) | 0, sy = (ccy + Math.sin(a2) * r) | 0;
      sx = sx < 0 ? 0 : sx >= w ? w - 1 : sx; sy = sy < 0 ? 0 : sy >= h ? h - 1 : sy;
      const i = (y * w + x) * 4, j = (sy * w + sx) * 4;
      d[i] = sd[j]; d[i + 1] = sd[j + 1]; d[i + 2] = sd[j + 2]; d[i + 3] = 255;
    }
    so.putImageData(out, 0, 0);
    c.imageSmoothingQuality = 'high'; c.drawImage(src.out, 0, 0, W, H);
    if (p > 0.85) { c.globalAlpha = seg(p, 0.85, 1); c.drawImage(B, 0, 0); c.globalAlpha = 1; }
  },

  // ⑨ 梵高→新艺术：从人物头部长出一块带金边的有机形状（慕夏式曲线轮廓），向外生长吞没画面
  organic(c, A, B, p, o) {
    const cx = o.cx || 1500, cy = o.cy || 330;
    const e = ease.out(p) * 0.7 + p * 0.3;
    const R = e * 2300;
    const path = () => {
      c.beginPath();
      for (let i = 0; i <= 120; i++) {
        const a = i / 120 * Math.PI * 2;
        const rr = R * (1 + 0.22 * Math.sin(a * 3 + 0.7) + 0.12 * Math.sin(a * 5 + 2.1) + 0.06 * Math.sin(a * 9 + p * 3));
        const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr * 0.92;
        i ? c.lineTo(x, y) : c.moveTo(x, y);
      }
      c.closePath();
    };
    c.drawImage(A, 0, 0);
    if (R < 1) return;
    c.save(); path(); c.clip(); c.drawImage(B, 0, 0); c.restore();
    path(); c.lineJoin = 'round';
    c.strokeStyle = '#6b4a24'; c.lineWidth = 14; c.stroke();
    c.strokeStyle = '#d9b25a'; c.lineWidth = 8; c.stroke();
  },

  // ⑩ 新艺术→立体主义：画面碎成几何碎片，碎片错位旋转，新画面的碎片拼合落位
  shards(c, A, B, p) {
    const tris = once('shards', () => {
      const r = rng(31), nx = 9, ny = 6, pts = [];
      for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) {
        const edge = i === 0 || j === 0 || i === nx || j === ny;
        pts.push([i / nx * W + (edge ? 0 : (r() - 0.5) * W / nx * 0.8), j / ny * H + (edge ? 0 : (r() - 0.5) * H / ny * 0.8)]);
      }
      const out = [];
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
        const a = pts[j * (nx + 1) + i], b = pts[j * (nx + 1) + i + 1], cc = pts[(j + 1) * (nx + 1) + i], d = pts[(j + 1) * (nx + 1) + i + 1];
        const flip = r() < 0.5;
        const t1 = flip ? [a, b, d] : [a, b, cc], t2 = flip ? [a, d, cc] : [b, d, cc];
        for (const t of [t1, t2]) out.push({ p: t, cx: (t[0][0] + t[1][0] + t[2][0]) / 3, cy: (t[0][1] + t[1][1] + t[2][1]) / 3, t: r(), dx: (r() - 0.5) * 160, dy: (r() - 0.5) * 120, rot: (r() - 0.5) * 0.5, sh: 0.75 + r() * 0.5 });
      }
      return out;
    });
    const draw = (img, tr, q, out) => {
      c.save(); c.beginPath(); tr.p.forEach((v, i) => i ? c.lineTo(v[0], v[1]) : c.moveTo(v[0], v[1])); c.closePath();
      c.translate(tr.cx, tr.cy);
      const k = out ? q : 1 - q;                       // 旧片：越来越偏；新片：越来越正
      c.translate(tr.dx * k, tr.dy * k); c.rotate(tr.rot * k); c.translate(-tr.cx, -tr.cy);
      c.clip(); c.drawImage(img, 0, 0);
      c.fillStyle = `rgba(${out ? '60,45,30' : '255,250,235'},${0.12 * tr.sh * Math.sin(Math.PI * q)})`; c.fill();
      c.strokeStyle = 'rgba(40,30,20,.35)'; c.lineWidth = 2; c.stroke();
      c.restore();
    };
    c.fillStyle = '#cbbfa8'; c.fillRect(0, 0, W, H);
    for (const tr of tris) {
      const qo = ease.inOut(clamp((p - tr.t * 0.4) / 0.45));   // 旧片碎裂进度
      const qi = ease.out(clamp((p - 0.25 - tr.t * 0.45) / 0.3)); // 新片落位进度
      if (qi > 0) draw(B, tr, qi, false); else draw(A, tr, qo, true);
    }
  },

  // ⑪ 立体→包豪斯：蓝方块＋红圆＋黄三角的构成旋转放大，中心的米白圆里是新画面，最后构成扫出画面
  bauhaus(c, A, B, p, o) {
    const cx = o.cx || 1010, cy = o.cy || 560;
    c.drawImage(A, 0, 0);
    const s = Math.pow(30, ease.out(seg(p, 0, 0.7))) * 0.35;   // 指数放大
    const rot = -0.5 + p * 0.9;
    const shift = ease.in(seg(p, 0.4, 1)) * -1600;          // 构成整体扫向左边
    c.save(); c.translate(cx + shift, cy); c.rotate(rot); c.scale(s, s);
    c.fillStyle = '#1d4fa3'; c.fillRect(-170, -170, 340, 340);
    c.rotate(-rot * 0.6);
    c.fillStyle = '#d0262b'; c.beginPath(); c.arc(0, 0, 150, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#f2c81c'; c.beginPath(); c.moveTo(0, -150); c.lineTo(130, 75); c.lineTo(-130, 75); c.closePath(); c.fill();
    c.restore();
    // 米白圆里是新画面（不跟随整体扫出，持续放大直到铺满）
    const rr = Math.pow(40, ease.inOut(seg(p, 0.15, 0.85))) * 30;
    c.save(); c.beginPath(); c.arc(cx, cy, rr, 0, Math.PI * 2); c.clip(); c.drawImage(B, 0, 0); c.restore();
  },

  // ⑫ 包豪斯→波普：黄色闪电劈开＋本戴网点化，旧画面变网点、新画面从网点里显影
  zigzag(c, A, B, p) {
    const halftone = (img, amt, key) => {
      const sc = 16;
      const sm = once('ht_' + key, () => mkc(W / sc, H / sc));
      const sg = sm.getContext('2d'); sg.drawImage(img, 0, 0, W / sc, H / sc);
      const d = sg.getImageData(0, 0, W / sc, H / sc).data;
      c.globalAlpha = 1; c.drawImage(img, 0, 0); c.fillStyle = 'rgba(244,236,216,.55)'; c.fillRect(0, 0, W, H);
      for (let y = 0; y < H / sc; y++) for (let x = 0; x < W / sc; x++) {
        const i = (y * W / sc + x) * 4, L = (d[i] * .3 + d[i + 1] * .59 + d[i + 2] * .11) / 255;
        const r = sc * 0.62 * (0.35 + (1 - L) * 0.85) * amt + 1;
        c.fillStyle = `rgb(${d[i]},${d[i + 1]},${d[i + 2]})`;
        c.beginPath(); c.arc(x * sc + sc / 2 + (y % 2) * sc / 2, y * sc + sc / 2, r, 0, Math.PI * 2); c.fill();
      }
    };
    if (p < 0.35) c.drawImage(A, 0, 0);
    else if (p < 0.55) halftone(A, 1, 'a');
    else if (p < 0.75) halftone(B, 1, 'b');
    else { c.drawImage(B, 0, 0); c.globalAlpha = 1 - seg(p, 0.75, 1); halftone(B, 1, 'b'); c.globalAlpha = 1; }
    // 闪电：黑边黄色锯齿带，从左上劈到右下
    const q = seg(p, 0.05, 0.6); if (q <= 0 || q >= 1) return;
    const pts = [], n = 9;
    for (let i = 0; i <= n; i++) pts.push([lerp(780, 1450, i / n) + (i % 2 ? 90 : -90), lerp(-40, H + 40, i / n)]);
    const k = Math.min(n, Math.floor(q * 2 * n) + 1);
    c.save(); c.lineJoin = 'miter';
    c.beginPath(); pts.slice(0, k + 1).forEach((v, i) => i ? c.lineTo(v[0], v[1]) : c.moveTo(v[0], v[1]));
    c.strokeStyle = '#111'; c.lineWidth = 34; c.stroke(); c.strokeStyle = '#ffe02a'; c.lineWidth = 22; c.stroke();
    c.restore();
    // 起点星爆
    if (q < 0.5) {
      c.save(); c.translate(70, 990); c.fillStyle = '#ffe02a'; c.strokeStyle = '#111'; c.lineWidth = 4; c.beginPath();
      for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2, r = i % 2 ? 70 : 105; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
      c.closePath(); c.fill(); c.stroke(); c.restore();
    }
  },

  // ⑬ 波普→8-bit：旧画面像素块越来越大，切到新画面后像素块由大变小直至清晰
  pixelate(c, A, B, p) {
    const img = p < 0.5 ? A : B;
    const q = p < 0.5 ? p / 0.5 : 1 - (p - 0.5) / 0.5;
    const bs = Math.max(1, Math.round(lerp(1, 72, ease.in(q))));
    if (bs <= 1) { c.drawImage(img, 0, 0); return; }
    const sm = once('px', () => mkc(W, H)), sg = sm.getContext('2d');
    const w = Math.ceil(W / bs), h = Math.ceil(H / bs);
    sg.imageSmoothingEnabled = true; sg.clearRect(0, 0, w, h); sg.drawImage(img, 0, 0, w, h);
    c.imageSmoothingEnabled = false; c.drawImage(sm, 0, 0, w, h, 0, 0, w * bs, h * bs); c.imageSmoothingEnabled = true;
  },

  // ⑭ 8-bit→光追：黑底绿色霓虹线框（新画面的边缘＋透视网格地面），扫描线自上而下把渲染结果「算」出来
  wireframe(c, A, B, p) {
    const edges = (() => {                                   // 每帧从当前 B 重算（半分辨率 Sobel，约 10ms）：缓存会串段、依赖渲染顺序
      const s = 2, w = W / s, h = H / s, sm = once('edgesCanvas', () => mkc(w, h)), g = sm.getContext('2d', { willReadFrequently: true });
      g.clearRect(0, 0, w, h); g.drawImage(B, 0, 0, w, h);
      const d = g.getImageData(0, 0, w, h).data, out = g.createImageData(w, h), o = out.data;
      const L = (x, y) => { const i = (y * w + x) * 4; return d[i] * .3 + d[i + 1] * .59 + d[i + 2] * .11; };
      for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
        const gx = L(x + 1, y) - L(x - 1, y), gy = L(x, y + 1) - L(x, y - 1), m = Math.hypot(gx, gy);
        const i = (y * w + x) * 4, v = m > 38 ? 255 : 0;
        o[i] = 60; o[i + 1] = 255; o[i + 2] = 150; o[i + 3] = v;
      }
      g.putImageData(out, 0, 0); return sm;
    })();
    const wire = () => {
      c.fillStyle = '#02060a'; c.fillRect(0, 0, W, H);
      // 透视网格地面
      c.strokeStyle = 'rgba(60,255,150,.8)'; c.lineWidth = 2;
      const hy = 640, vx = W / 2;
      for (let i = -24; i <= 24; i++) { c.beginPath(); c.moveTo(vx + i * 30, hy); c.lineTo(vx + i * 260, H); c.stroke(); }
      for (let k = 0; k < 12; k++) { const y = hy + Math.pow(k / 12, 2) * (H - hy); c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
      c.shadowColor = '#3cff96'; c.shadowBlur = 8; c.drawImage(edges, 0, 0, W, H); c.shadowBlur = 0;
    };
    if (p < 0.12) { c.drawImage(A, 0, 0); c.globalAlpha = p / 0.12; wire(); c.globalAlpha = 1; return; }
    wire();
    const q = ease.inOut(seg(p, 0.3, 1)), yy = q * H;
    if (yy > 0) { c.save(); c.beginPath(); c.rect(0, 0, W, yy); c.clip(); c.drawImage(B, 0, 0); c.restore(); }
    if (q > 0 && q < 1) { c.fillStyle = 'rgba(200,255,230,.9)'; c.fillRect(0, yy - 3, W, 6); }
  },

  // ⑮ 光追→2026：三色同心环从杯子(992,601)线性扩张，外径约 143px/帧，每环厚 137px，最内环里是新画面（分镜表 T15）
  iris(c, A, B, p, o) {
    const cx = o.cx || 992, cy = o.cy || 601;
    const R = 19 + p * (1159 - 19 + 3 * 137 + 900);           // 线性；到 p=1 时最内环也超出画面对角
    c.drawImage(A, 0, 0);
    const ring = (r, col) => { if (r <= 0) return; c.fillStyle = col; c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.fill(); };
    ring(R, 'rgb(33,42,81)'); ring(R - 137, 'rgb(234,124,107)'); ring(R - 274, 'rgb(250,246,235)');
    const ri = R - 411;
    if (ri > 0) { c.save(); c.beginPath(); c.arc(cx, cy, ri, 0, Math.PI * 2); c.clip(); c.drawImage(B, 0, 0); c.restore(); }
  },

  // ===================== 迁移测试 A–D 收进来的转场（名字同 references/风格配方 里的配方卡） =====================
  // 每个都长在「进入段」风格的签名语言上：先找新风格里会「出现/点亮/扫过」的物理过程，旧画先被它污染，新画从它的形状里露出来。
  // ---- A：水墨 / 克里姆特 / 蒙克 / 敦煌 / 草间 ----
  // 水墨 → 克里姆特：金箔一片片贴上来。从少女头部按螺旋次序落下方形金箔（带螺旋/眼形/同心圆压纹），
  // 贴实后金色褪去露出新画面。q<0.5 贴金箔（从 1.3 倍、带旋转落位），0.5..1 金箔变透明露出 B。
  goldLeaf(c, A, B, p, o) {
    const ts = 72, cx = o.cx || 1300, cy = o.cy || 380;
    const tiles = once('goldLeaf', () => { const r = rng(21), out = [], maxd = Math.hypot(W, H) * 0.8;
      for (let y = 0; y < H; y += ts) for (let x = 0; x < W; x += ts) { const mx = x + ts / 2, my = y + ts / 2; const d = Math.hypot(mx - cx, my - cy) / maxd, a = (Math.atan2(my - cy, mx - cx) / (Math.PI * 2) + 1) % 1;
        out.push({ x, y, key: d * 0.78 + a * 0.12 + r() * 0.08, rot: (r() - .5) * 0.8, m: (r() * 3) | 0 }); }
      return out; });
    c.drawImage(A, 0, 0);
    for (const t of tiles) {
      const q = clamp((p * 1.32 - t.key) / 0.32); if (q <= 0) continue;
      if (q >= 1) { c.drawImage(B, t.x, t.y, ts, ts, t.x, t.y, ts, ts); continue; }
      const mx = t.x + ts / 2, my = t.y + ts / 2;
      if (q > 0.5) c.drawImage(B, t.x, t.y, ts, ts, t.x, t.y, ts, ts);
      const u = q < 0.5 ? q / 0.5 : 1, fadeOut = q < 0.5 ? 1 : 1 - (q - 0.5) / 0.5;
      c.save(); c.translate(mx, my); c.rotate(t.rot * (1 - ease.out(u))); const s = 1.3 - 0.3 * ease.out(u); c.scale(s, s);
      c.globalAlpha = Math.min(1, u * 2.5) * fadeOut;
      const g = c.createLinearGradient(-ts / 2, -ts / 2, ts / 2, ts / 2); const sh = clamp(u);
      g.addColorStop(0, '#a8741e'); g.addColorStop(clamp(0.2 + sh * 0.5), '#fbe6a0'); g.addColorStop(1, '#c8962e');
      c.fillStyle = g; c.fillRect(-ts / 2, -ts / 2, ts, ts);
      c.strokeStyle = 'rgba(70,40,10,.75)'; c.lineWidth = 2.2; c.beginPath();
      if (t.m === 0) { for (let a = 0; a < Math.PI * 5; a += 0.25) { const rr = 26 * a / (Math.PI * 5); a ? c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : c.moveTo(0, 0); } }
      else if (t.m === 1) { c.moveTo(-24, 0); c.quadraticCurveTo(0, -20, 24, 0); c.quadraticCurveTo(0, 20, -24, 0); c.moveTo(7, 0); c.arc(0, 0, 7, 0, Math.PI * 2); }
      else { [8, 16, 24].forEach(rr => { c.moveTo(rr, 0); c.arc(0, 0, rr, 0, Math.PI * 2); }); }
      c.stroke(); c.restore();
    }
  },
  // 克里姆特 → 蒙克：《呐喊》的血色天空从上往下「流」过画面。旧画按行正弦扭曲、幅度越来越大；
  // 波浪形前沿以上是新画面（扭曲幅度由大变小），前沿上压 4 道黄橙红色带。
  screamWarp(c, A, B, p, o) {
    const e = ease.inOut(p), ph = o.lt * 9;
    const yF = x => lerp(-180, H + 220, e) + 80 * Math.sin(x * 0.0055 + p * 7);
    c.fillStyle = '#3a1410'; c.fillRect(0, 0, W, H);
    KIT.warpRows(c, A, y => 70 * e * Math.sin(y * 0.014 + ph) + 20 * e * Math.sin(y * 0.05 - ph), 6, 92 * e);
    const tg = o.tmp.getContext('2d'); tg.reset(); tg.fillStyle = '#3a1410'; tg.fillRect(0, 0, W, H);
    KIT.warpRows(tg, B, y => 60 * (1 - e) * Math.sin(y * 0.013 - ph), 6, 62 * (1 - e));
    c.save(); c.beginPath(); c.moveTo(0, -10); for (let x = 0; x <= W; x += 24) c.lineTo(x, yF(x)); c.lineTo(W, -10); c.closePath(); c.clip(); c.drawImage(o.tmp, 0, 0); c.restore();
    c.save(); c.lineCap = 'round';
    ['#b82a1e', '#e2541c', '#f08a24', '#f4c03a'].forEach((col, k) => { c.strokeStyle = col; c.lineWidth = 26; c.beginPath(); for (let x = -20; x <= W + 20; x += 16) { const y = yF(x) - k * 22 + 10 * Math.sin(x * 0.02 + ph + k); x > -20 ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke(); });
    c.restore();
  },
  // 蒙克 → 敦煌：飞天的飘带从右往左扫过，带后是壁画；前沿处旧画剥落成碎片掉下去。
  apsara(c, A, B, p, o) {
    const e = ease.inOut(p);
    const xF = y => lerp(W + 260, -300, e) + 110 * Math.sin(y * 0.006 + p * 5);
    c.drawImage(A, 0, 0);
    c.save(); c.beginPath(); c.moveTo(W + 10, -10); for (let y = -10; y <= H + 10; y += 20) c.lineTo(xF(y), y); c.lineTo(W + 10, H + 10); c.closePath(); c.clip(); c.drawImage(B, 0, 0); c.restore();
    // 剥落：前沿左侧旧画碎片（取 A 的像素）旋转落下
    const fl = once('apsaraFlakes', () => { const r = rng(33), o2 = []; for (let i = 0; i < 70; i++) o2.push([r() * H, 20 + r() * 34, 10 + r() * 26, r() * 6.28, r()]); return o2; });
    fl.forEach(([y0, s, dx, rot, k]) => { const born = clamp(1 - (xF(y0) + 40) / (W + 300)); const age = e - born * 0.9; if (age < 0) return;
      const x = xF(y0) - dx + age * 120, y = y0 + age * age * 900; if (y > H + 40) return;
      c.save(); c.translate(x, y); c.rotate(rot + age * 9); c.scale(1, Math.cos(age * 12 + k * 6)); c.drawImage(A, clamp(x, 0, W - s), clamp(y0, 0, H - s), s, s * 0.7, -s / 2, -s * 0.35, s, s * 0.7); c.restore(); });
    // 三条飘带沿前沿翻卷（石绿、土红、石青），带白色描花
    [['#6ab08e', 0, 44], ['#a5452f', 70, 38], ['#5a86b0', 140, 32]].forEach(([col, off, w], k) => {
      const pts = []; for (let y = -60; y <= H + 60; y += 18) pts.push([xF(y) + off + 46 * Math.sin(y * 0.011 - p * 14 + k * 1.7), y]);
      const path = KIT.ribbon(pts, q => w * (0.6 + 0.4 * Math.sin(q * 14 + p * 10 + k)));
      c.fillStyle = col; c.fill(path); c.strokeStyle = '#5a2414'; c.lineWidth = 2.4; c.stroke(path);
      c.strokeStyle = '#ecdfc4'; c.lineWidth = 2; c.setLineDash([4, 10]); c.beginPath(); pts.forEach((q, i) => i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1])); c.stroke(); c.setLineDash([]);
    });
  },
  // 敦煌 → 草间：波点从猫的位置一圈圈长出来，点里是新画面；点胀到彼此相接就整幅换完。
  dotBloom(c, A, B, p, o) {
    const sp = 58, cx = o.cx || 540, cy = o.cy || 760, maxd = Math.hypot(W, H);
    c.drawImage(A, 0, 0);
    const pts = once('dotBloom', () => { const r = rng(44), out = []; for (let y = 0, j = 0; y < H + sp; y += sp * 0.87, j++) for (let x = (j % 2) * sp / 2; x < W + sp; x += sp) out.push([x + (r() - .5) * 8, y + (r() - .5) * 8, Math.hypot(x - cx, y - cy) / maxd, r()]); return out; });
    const path = new Path2D(), rims = [];
    for (const [x, y, d, k] of pts) { const q = clamp((p * 1.55 - d * 1.1 - k * 0.08) / 0.42); if (q <= 0) continue; const r = ease.outBack(q) * sp * 0.74; path.moveTo(x + r, y); path.arc(x, y, r, 0, Math.PI * 2); if (q < 1) rims.push([x, y, r, q]); }
    c.save(); c.clip(path); c.drawImage(B, 0, 0); c.restore();
    c.lineWidth = 5; rims.forEach(([x, y, r, q]) => { c.strokeStyle = `rgba(251,246,238,${1 - q})`; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.stroke(); });
  },
  // ---- C：Kirby / 莫奈 / 修拉 / 马蒂斯 / 哈林 ----
  // ① Kirby → 莫奈：旧画面「落进水里」——逐行横向正弦错位（水面倒影的抖动）越来越强；
  //    新画面从杯子位置以「横向短笔触」一圈圈荡开（涟漪由笔触组成），亮色水光短横线闪烁。
  ripple(c, A, B, p, o) {
    const cx = o.cx || 1000, cy = o.cy || 600, e = ease.inOut(p);
    const amp = 46 * Math.sin(Math.PI * Math.min(1, p * 1.2)), rowH = 6;
    for (let y = 0; y < H; y += rowH) { const d = Math.abs(y - cy) / H, dx = Math.sin(y * 0.045 - p * 26) * amp * (0.4 + d); c.drawImage(A, 0, y, W, rowH, dx, y, W, rowH); }
    const S = once('rip', () => { const r = rng(41), out = []; for (let i = 0; i < 3600; i++) { const x = r() * W, y = r() * H; out.push({ x, y, l: 40 + r() * 70, h: 9 + r() * 8, d: Math.hypot(x - cx, (y - cy) * 1.9) / 1700 + r() * 0.06 }); } return out; });
    const front = e * 1.15 - 0.05;
    c.save(); c.beginPath(); let any = false;
    for (const s of S) { if (s.d > front) continue; any = true; const k = clamp((front - s.d) / 0.06); c.ellipse(s.x, s.y, s.l * k / 2 + 1, s.h / 2, 0, 0, TAU); }
    if (any) { c.clip(); c.drawImage(B, 0, 0); }
    c.restore();
    // 涟漪前沿：几圈浅色虚线椭圆＋水光短横线
    c.save(); c.lineCap = 'round';
    for (let k = 0; k < 3; k++) { const R = front * 2300 - k * 70; if (R <= 0) continue; c.strokeStyle = `rgba(240,246,255,${0.7 - k * 0.2})`; c.lineWidth = 10 - k * 2; c.setLineDash([46, 22]); c.lineDashOffset = -p * 300; c.beginPath(); c.ellipse(cx, cy, R, R / 1.9, 0, 0, TAU); c.stroke(); }
    c.setLineDash([]);
    const r = rng(7 + Math.floor(p * 30)), al = Math.sin(Math.PI * p);
    for (let i = 0; i < 140; i++) { const x = r() * W, y = r() * H; c.strokeStyle = ['#fffbe8', '#f8e0ec', '#e8f4ff'][i % 3]; c.globalAlpha = al * 0.8; c.lineWidth = 5; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 18 + r() * 30, y); c.stroke(); }
    c.restore();
    if (p > 0.7) { c.globalAlpha = seg(p, 0.7, 0.95); c.drawImage(B, 0, 0); c.globalAlpha = 1; }
  },

  // ② 莫奈 → 修拉：画面「结晶」成一样大的圆点——先旧画面长出点（点长大、底下淡成纸色），
  //    点按对角线波次逐个换成新画面的颜色，最后新画面在点下面显影、点收回去。
  pointill(c, A, B, p, o) {
    const pitch = 14, rowh = pitch * 0.866;
    const sa = once('ptA', () => mkc(W, H)), sb = once('ptB', () => mkc(W, H));
    const ga = sa.getContext('2d', { willReadFrequently: true }), gb = sb.getContext('2d', { willReadFrequently: true });
    ga.drawImage(A, 0, 0); gb.drawImage(B, 0, 0);
    const da = ga.getImageData(0, 0, W, H).data, db = gb.getImageData(0, 0, W, H).data;
    // 底：旧画面 → 纸色 → 新画面
    c.drawImage(A, 0, 0);
    c.fillStyle = `rgba(246,238,220,${seg(p, 0.05, 0.4)})`; c.fillRect(0, 0, W, H);
    if (p > 0.6) { c.globalAlpha = seg(p, 0.6, 0.95); c.drawImage(B, 0, 0); c.globalAlpha = 1; }
    const grow = ease.out(seg(p, 0, 0.3)), shrink = 1 - ease.in(seg(p, 0.7, 1)), R = pitch * 0.46 * grow * shrink;
    if (R < 0.4) return;
    for (let j = 0, y = pitch / 2; y < H + pitch; j++, y += rowh) for (let x = (j % 2) * pitch / 2; x < W + pitch; x += pitch) {
      const sw = clamp(((x / W) * 0.6 + (y / H) * 0.4) * 0.5 + U.hash(x | 0, y | 0) * 0.25 + 0.15);   // 换色时刻：左上先、带随机
      const useB = p > sw;
      const i = (clamp(y | 0, 0, H - 1) * W + clamp(x | 0, 0, W - 1)) * 4, d = useB ? db : da;
      // 换色瞬间点会「跳」一下（变大）
      const pop = Math.abs(p - sw) < 0.04 ? 1.35 : 1;
      c.fillStyle = `rgb(${d[i]},${d[i + 1]},${d[i + 2]})`; c.beginPath(); c.arc(x, y, R * pop, 0, TAU); c.fill();
    }
  },

  // ③ 修拉 → 马蒂斯：一大张刷过水粉的钴蓝纸（剪刀边）从右往左扫过，纸上钉着白海藻、黄星、粉纸片（带投影）；
  //    纸经过的地方，后面换成了新画面。
  cutouts(c, A, B, p, o) {
    const e = ease.inOut(p), w = 1100;                       // 纸宽
    const x0 = lerp(W + 40, -w - 360, e);                   // 纸左缘
    const edge = (y, side) => { const r = Math.sin(y * 0.021 + side * 3) * 26 + Math.sin(y * 0.067 + side) * 12; return r; };
    // 新画面在纸的右缘之后
    c.drawImage(A, 0, 0);
    c.save(); c.beginPath(); c.moveTo(W + 10, 0); for (let y = 0; y <= H; y += 18) c.lineTo(x0 + w + edge(y, 1), y); c.lineTo(W + 10, H); c.closePath(); c.clip(); c.drawImage(B, 0, 0); c.restore();
    // 纸（带投影）
    const sheet = new Path2D(); for (let y = 0; y <= H; y += 18) sheet.lineTo(x0 + edge(y, 0), y); for (let y = H; y >= 0; y -= 18) sheet.lineTo(x0 + w + edge(y, 1), y); sheet.closePath();
    c.save(); c.shadowColor = 'rgba(10,20,40,.45)'; c.shadowOffsetX = 14; c.shadowOffsetY = 10; c.shadowBlur = 12; c.fillStyle = '#1d4fb8'; c.fill(sheet); c.restore();
    c.save(); c.clip(sheet);
    const r0 = rng(83); c.lineCap = 'round';
    for (let i = 0; i < 260; i++) { const x = x0 + r0() * w, y = r0() * H; c.strokeStyle = r0() < 0.5 ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.08)'; c.lineWidth = 8 + r0() * 14; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 160, y - 40); c.stroke(); }
    // 纸上的剪纸：海藻（茎＋手指）、星、圆片；随纸移动并各自晃
    const pin = (fn, col, x, y, rot) => { c.save(); c.translate(x, y); c.rotate(rot); c.shadowColor = 'rgba(10,20,40,.35)'; c.shadowOffsetX = 6; c.shadowOffsetY = 7; c.shadowBlur = 4; c.fillStyle = col; c.fill(fn); c.restore(); };
    const algae = once('ctAlg', () => { const p2 = new Path2D(); p2.addPath(RIG.limb([0, 0], [0, -420], 50, 26));
      for (let k = 0; k < 7; k++) { const u = 0.12 + k * 0.12, s = k % 2 ? 1 : -1, A0 = [0, -u * 420], th = s * (1.0 - 0.5 * u), L = 190 * (1 - 0.45 * u), d = [Math.sin(th), -Math.cos(th)];
        p2.addPath(RIG.limb(A0, [A0[0] + d[0] * L, A0[1] + d[1] * L], 64 * (1 - 0.3 * u), 56 * (1 - 0.3 * u))); } return p2; });
    const star = once('ctStar', () => KIT.star(0, 0, 120, 52, 6));
    pin(algae, '#f7f3e8', x0 + 260, 900, Math.sin(p * 9) * 0.1);
    pin(algae, '#f7d21e', x0 + 760, 1060, -0.2 + Math.sin(p * 11) * 0.1);
    pin(star, '#f7d21e', x0 + 540, 260, p * 3);
    pin(star, '#ef6f9a', x0 + 900, 520, -p * 2.5);
    const blob = once('ctBlob', () => { const q = new Path2D(); q.ellipse(0, 0, 130, 90, 0, 0, TAU); return q; }); pin(blob, '#e2322a', x0 + 180, 300, 0.3);
    c.restore();
  },

  // ④ 马蒂斯 → 哈林：一个粗黑轮廓的跳舞小人（双臂 V 字）从杯子处放大，身体里面是新画面，
  //    周围一圈哈林式放射动作线；小人越长越大直到身体铺满整个画面。
  radiant(c, A, B, p, o) {
    const cx = o.cx || 1000, cy = o.cy || 600, s = 0.15 * Math.pow(320, ease.inOut(p));
    const pose = { head: [0, -224], neck: [0, -182], hip: [0, -100], hl: [-84, -256], hr: [84, -256], kl: [-40, -54], kr: [40, -54], fl: [-60, -14], fr: [60, -14] };
    const T = q => [cx + q[0] * s, cy + (q[1] + 130) * s];
    const parts = [RIG.limb(T(pose.neck), T(pose.hip), 70 * s, 60 * s), RIG.limb(T(pose.neck), T(pose.hl), 36 * s, 32 * s), RIG.limb(T(pose.neck), T(pose.hr), 36 * s, 32 * s),
      RIG.limb(T(pose.hip), T(pose.kl), 38 * s, 34 * s), RIG.limb(T(pose.kl), T(pose.fl), 34 * s, 32 * s), RIG.limb(T(pose.hip), T(pose.kr), 38 * s, 34 * s), RIG.limb(T(pose.kr), T(pose.fr), 34 * s, 32 * s)];
    const hd = new Path2D(), hc = T(pose.head); hd.arc(hc[0], hc[1], 42 * s, 0, TAU); parts.push(hd);
    c.drawImage(A, 0, 0);
    // 黑色外轮廓（描粗＋填黑）
    c.save(); c.lineJoin = 'round'; c.strokeStyle = '#111'; c.lineWidth = 30; c.fillStyle = '#111'; parts.forEach(q => { c.stroke(q); c.fill(q); }); c.restore();
    // 身体里是新画面：离屏做遮罩
    const m = once('rdM', () => mkc()), mg = m.getContext('2d'); mg.globalCompositeOperation = 'source-over'; mg.clearRect(0, 0, W, H);
    mg.fillStyle = '#fff'; parts.forEach(q => mg.fill(q)); mg.globalCompositeOperation = 'source-in'; mg.drawImage(B, 0, 0);
    c.drawImage(m, 0, 0);
    // 放射动作线（8fps 跳）
    const st = Math.floor(o.t * 8), r = rng(300 + st); c.save(); c.strokeStyle = '#111'; c.lineCap = 'round'; c.lineWidth = 14;
    const R0 = 300 * s + 30;
    for (let i = 0; i < 16; i++) { const a = i / 16 * TAU + r() * 0.2, L = 50 + r() * 60; c.beginPath(); c.moveTo(cx + Math.cos(a) * R0, cy + Math.sin(a) * R0 * 0.9); c.lineTo(cx + Math.cos(a) * (R0 + L), cy + Math.sin(a) * (R0 + L) * 0.9); c.stroke(); }
    c.restore();
    if (p > 0.82) { c.globalAlpha = seg(p, 0.82, 1); c.drawImage(B, 0, 0); c.globalAlpha = 1; }
  },
  // ---- D：伦勃朗 / 橡皮管 / 皮影 / 新海诚 / 蓝色时期 ----
  // 伦勃朗 → 橡皮管卡通：旧画先褪成棕褐老胶片（闪烁＋划痕），黑色光圈收到少女杯口，再从同一点「弹」开（outBack 过冲）
  irisFilm(c, A, B, p, o) {
    const cx = o.cx || 960, cy = o.cy || 540, R0 = Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy)) + 20;
    const close = p < 0.5, q = close ? seg(p, 0, 0.5) : seg(p, 0.5, 1);
    if (close) { c.save(); c.filter = `sepia(${q}) grayscale(${q * 0.7}) contrast(${1 + q * 0.3})`; c.drawImage(A, 0, 0); c.restore(); }
    else c.drawImage(B, 0, 0);
    const R = close ? R0 * (1 - ease.in(q)) : R0 * ease.outBack(q);
    c.save(); c.fillStyle = '#0b0906'; c.beginPath(); c.rect(0, 0, W, H);
    // 光圈边缘微微手抖（12fps 换形）
    const wr = rng(Math.floor(o.t * 12) + 9); c.moveTo(cx + Math.max(0, R), cy);
    for (let i = 1; i <= 48; i++) { const a = i / 48 * Math.PI * 2, rr = Math.max(0, R * (1 + (wr() - 0.5) * 0.015)); c.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
    c.fill('evenodd'); c.restore();
    filmDirt(c, o.t, close ? q : 1 - q * 0.5);
  },
  // 橡皮管 → 皮影：旧片像灯灭一样压成暗褐剪影；幕后的油灯从中心点亮，暖光圈（边缘带灯焰抖动）向外推开，新画面在光里出现
  lampGlow(c, A, B, p, o) {
    const cx = o.cx || 960, cy = o.cy || 470;
    c.drawImage(A, 0, 0);
    c.save(); c.globalCompositeOperation = 'multiply'; c.fillStyle = `rgba(70,34,12,${Math.min(1, p * 2.2)})`; c.fillRect(0, 0, W, H); c.restore();
    const fl = Math.sin(o.t * 37) * 0.04 + Math.sin(o.t * 23) * 0.03;
    const R = 1500 * ease.inOut(seg(p, 0.12, 1)) * (1 + fl);
    if (R > 1) {
      const T = o.tmp, g = T.getContext('2d'); g.reset(); g.drawImage(B, 0, 0);
      g.globalCompositeOperation = 'destination-in'; const m = g.createRadialGradient(cx, cy, R * 0.55, cx, cy, R); m.addColorStop(0, '#000'); m.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = m; g.fillRect(0, 0, W, H);
      c.drawImage(T, 0, 0);
    }
    c.save(); c.globalCompositeOperation = 'lighter'; const gl = Math.sin(Math.PI * seg(p, 0.05, 1)), rg = c.createRadialGradient(cx, cy, 0, cx, cy, 300 + R * 0.4);
    rg.addColorStop(0, `rgba(255,200,110,${0.7 * gl})`); rg.addColorStop(1, 'rgba(255,170,60,0)'); c.fillStyle = rg; c.fillRect(0, 0, W, H);
    // 灯焰本身：一朵小火苗在光心跳
    c.fillStyle = `rgba(255,240,190,${gl})`; c.beginPath(); c.ellipse(cx, cy, 14 * (1 + fl * 4), 34 * (1 + fl * 3), 0, 0, 7); c.fill(); c.restore();
  },
  // 皮影 → 新海诚：一道斜向的强光从左扫到右（漏光），光带身后是新画面；带横向拉丝、彩色光斑和飘起的光粒
  flareSweep(c, A, B, p, o) {
    const e = ease.inOut(p), X = lerp(-500, W + 700, e), k = 0.35;
    c.drawImage(A, 0, 0);
    c.save(); c.beginPath(); c.moveTo(-10, 0); c.lineTo(X, 0); c.lineTo(X - H * k, H); c.lineTo(-10, H); c.closePath(); c.clip(); c.drawImage(B, 0, 0); c.restore();
    c.save(); c.globalCompositeOperation = 'lighter';
    const band = (w, a, col) => { c.save(); c.translate(X - H * k / 2, H / 2); c.transform(1, 0, -k, 1, 0, 0); const g = c.createLinearGradient(-w, 0, w, 0); g.addColorStop(0, `rgba(${col},0)`); g.addColorStop(0.5, `rgba(${col},${a})`); g.addColorStop(1, `rgba(${col},0)`); c.fillStyle = g; c.fillRect(-w, -H, 2 * w, 2 * H); c.restore(); };
    band(520, 0.55, '255,236,200'); band(160, 0.85, '255,255,250'); band(60, 0.6, '200,240,255');
    const hz = c.createLinearGradient(0, 0, W, 0); hz.addColorStop(0, 'rgba(150,210,255,0)'); hz.addColorStop(clamp(X / W), `rgba(220,240,255,${0.7 * Math.sin(Math.PI * p)})`); hz.addColorStop(1, 'rgba(150,210,255,0)'); c.fillStyle = hz; c.fillRect(Math.max(0, X - 700), 300, 1400, 5);
    const r = rng(77);
    for (let i = 0; i < 40; i++) { const x = X - H * k * r() + (r() - 0.5) * 500, y = r() * H - p * 120 * r(), rr = 3 + r() * 14, a = (1 - Math.abs(x - X) / 700) * 0.6; if (a <= 0) continue;
      const g = c.createRadialGradient(x, y, 0, x, y, rr); g.addColorStop(0, `rgba(255,252,235,${a})`); g.addColorStop(1, 'rgba(255,252,235,0)'); c.fillStyle = g; c.beginPath(); c.arc(x, y, rr, 0, 7); c.fill(); }
    [[0.3, 40, '120,255,200'], [0.6, 24, '255,170,120'], [0.9, 60, '140,170,255']].forEach(([f, rr, col]) => { const x = lerp(X, W - X, f), y = lerp(300, 780, f); c.fillStyle = `rgba(${col},${0.18 * Math.sin(Math.PI * p)})`; c.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; i ? c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : c.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } c.fill(); });
    c.restore();
  },
  // 新海诚 → 蓝色时期：先把旧画的颜色「抽走」只剩蓝（color 混合），再由 6 道宽大的干笔从左到右刷过，笔下就是新画；笔头带鬃毛拖痕
  blueBrush(c, A, B, p, o) {
    c.drawImage(A, 0, 0);
    c.save(); c.globalCompositeOperation = 'color'; c.fillStyle = `rgba(45,90,148,${Math.min(1, p * 2.2)})`; c.fillRect(0, 0, W, H); c.restore();
    c.save(); c.globalCompositeOperation = 'multiply'; c.fillStyle = `rgba(90,120,170,${Math.min(0.6, p * 1.5)})`; c.fillRect(0, 0, W, H); c.restore();
    const N = 6, bh = H / N + 90, r = rng(21);
    for (let k = 0; k < N; k++) {
      const s = ease.inOut(seg(p, 0.12 + k * 0.07, 0.62 + k * 0.07)), x1 = lerp(-120, W + 260, s); if (s <= 0) continue;
      const y0 = k * (H / N) - 20 + (k % 2 ? 10 : -10), tilt = (k % 2 ? 1 : -1) * 18;
      const path = new Path2D(); path.moveTo(-20, y0 + tilt); const n = 24;
      for (let i = 0; i <= n; i++) { const x = lerp(-20, x1, i / n); path.lineTo(x, y0 + tilt * (1 - i / n) + Math.sin(i * 1.7 + k) * 6); }
      path.quadraticCurveTo(x1 + 70, y0 + bh / 2, x1, y0 + bh);
      for (let i = n; i >= 0; i--) { const x = lerp(-20, x1, i / n); path.lineTo(x, y0 + bh + tilt * (1 - i / n) + Math.cos(i * 1.3 + k) * 7); }
      path.closePath();
      c.save(); c.clip(path); c.drawImage(B, 0, 0);
      // 鬃毛拖痕：笔头后 260px 内的深浅细线（颜料还没刷匀）
      for (let i = 0; i < 26; i++) { const y = y0 + 6 + r() * (bh - 12), L = 80 + r() * 200; const g = c.createLinearGradient(x1 - L, 0, x1, 0); g.addColorStop(0, 'rgba(15,30,60,0)'); g.addColorStop(1, `rgba(${r() < .5 ? '15,30,60' : '170,195,220'},.5)`);
        c.strokeStyle = g; c.lineWidth = 1 + r() * 3; c.beginPath(); c.moveTo(x1 - L, y); c.lineTo(x1 + 10, y + (r() - 0.5) * 4); c.stroke(); }
      c.restore();
    }
  },
};

// D 组转场共用：老胶片的闪烁、竖划痕、灰尘（24fps 换一次）
const filmDirt = (c, t, amt = 1) => {                       // 24fps 换一次：闪烁、竖划痕、灰尘
  const r = rng(Math.floor(t * 24) * 7919 + 3);
  c.fillStyle = `rgba(255,248,230,${(0.03 + r() * 0.1) * amt})`; c.fillRect(0, 0, W, H);
  for (let k = 0; k < 3; k++) { const x = r() * W; c.strokeStyle = `rgba(${r() < .5 ? '255,250,235' : '20,16,10'},${0.5 * amt})`; c.lineWidth = 1 + r() * 2; c.beginPath(); c.moveTo(x, 0); c.lineTo(x + (r() - .5) * 10, H); c.stroke(); }
  for (let k = 0; k < 12; k++) { c.fillStyle = `rgba(20,16,10,${0.6 * amt})`; c.beginPath(); c.arc(r() * W, r() * H, 1 + r() * 3, 0, 7); c.fill(); }
};

// ---- B：构成主义 / 达利 / 霍珀 / 吉卜力 / 蒸汽波 ----
// ① 构成主义 → 达利：新画面像颜料一样从上往下「流」下来——下缘 edge(x) 是整体下落线 + 一排圆头液滴
//    （剖面 (1-(dx/w)²)^0.3：长条＋圆头，往下挂）；旧画面被压着逐列下垂（融化）；液面一道高光＋一道暗边。
T.melt = function (c, A, B, p) {
  const r = rng(41), drips = [];
  for (let i = 0; i < 26; i++) drips.push([r() * W, 10 + r() * 22, 60 + r() * 220, r() * 0.25]);
  const e = ease.inOut(p), fall = lerp(-160, H + 40, e);
  const edge = x => { let d = 0; for (const [dx, w, h, t0] of drips) { const u = (x - dx) / w; if (u > -1 && u < 1) d = Math.max(d, h * seg(p, t0, t0 + 0.5) * Math.pow(1 - u * u, 0.3)); } return fall + d + Math.sin(x * 0.005 + 1) * 24; };
  // 旧画面逐列下垂（越靠近液面压得越多）
  const sw = 4;
  for (let x = 0; x < W; x += sw) { const ed = edge(x), sag = Math.max(0, ed) * 0.22 * e; c.drawImage(A, x, 0, sw, H, x, sag, sw, H + sag * 0.3); }
  // 新画面：液面以上
  c.save(); c.beginPath(); c.moveTo(0, -10); for (let x = 0; x <= W; x += 4) c.lineTo(x, edge(x)); c.lineTo(W, -10); c.closePath(); c.clip(); c.drawImage(B, 0, 0); c.restore();
  // 液面：内侧暗边（厚度感）＋高光
  c.save(); c.beginPath(); for (let x = 0; x <= W; x += 4) { const y = edge(x); x ? c.lineTo(x, y) : c.moveTo(x, y); }
  c.strokeStyle = 'rgba(40,20,10,.35)'; c.lineWidth = 9; c.filter = 'blur(3px)'; c.stroke(); c.filter = 'none';
  c.translate(0, -5); c.strokeStyle = 'rgba(255,250,232,.7)'; c.lineWidth = 3; c.stroke(); c.restore();
};

// ② 达利 → 霍珀：一道硬边斜光块从左侧切进来——光块里是新画面（带暖光），光块外的旧画面逐渐沉进冷绿阴影；
//    光块里有一根窗棂竖影跟着走。最后暖光褪去，只剩新画面。
T.sunShaft = function (c, A, B, p) {
  const e = ease.out(p) * 0.4 + ease.inOut(p) * 0.6, slant = 260;
  const xR = lerp(-slant, W + slant + 60, e), xL = lerp(-slant - 20, -slant - 900, e) ;   // 右缘扫过全屏，左缘留在左外
  const band = () => { c.beginPath(); c.moveTo(xL, 0); c.lineTo(xR, 0); c.lineTo(xR - slant, H); c.lineTo(xL - slant, H); c.closePath(); };
  c.drawImage(A, 0, 0);
  c.save(); c.globalCompositeOperation = 'multiply'; c.fillStyle = `rgba(70,120,110,${0.7 * Math.min(1, p * 2)})`; c.fillRect(0, 0, W, H); c.restore();
  c.save(); band(); c.clip(); c.drawImage(B, 0, 0);
  const warm = 0.45 * (1 - seg(p, 0.6, 1));
  c.globalCompositeOperation = 'screen'; c.fillStyle = `rgba(255,214,140,${warm})`; c.fillRect(0, 0, W, H);
  c.globalCompositeOperation = 'multiply'; c.fillStyle = `rgba(80,120,110,${0.8 * (1 - seg(p, 0.7, 1))})`;
  const mx = xR - 420; c.beginPath(); c.moveTo(mx, 0); c.lineTo(mx + 34, 0); c.lineTo(mx + 34 - slant, H); c.lineTo(mx - slant, H); c.closePath(); c.fill();
  c.restore();
  // 光块前缘一道亮边
  c.save(); c.strokeStyle = `rgba(255,236,190,${0.8 * (1 - seg(p, 0.8, 1))})`; c.lineWidth = 6; c.beginPath(); c.moveTo(xR, 0); c.lineTo(xR - slant, H); c.stroke(); c.restore();
};

// ③ 霍珀 → 吉卜力：水彩在湿纸上晕开。几团色晕从窗口先后绽开、边界是噪声扰动的圆，
//    边缘一圈颜料沉积的深色水痕＋外侧一圈被水冲淡的亮晕；色晕里是新画面。
//    水痕/亮晕的 α 跟着「这一团的扩张进度」淡出，否则长大后的水痕线会横穿新画面（第一版踩到）。
T.bleed = function (c, A, B, p, o) {
  const cx = o.cx || 580, cy = o.cy || 330;
  const blobs = [[cx, cy, 0, 1.0], [1300, 420, 0.14, 0.75], [520, 880, 0.24, 0.6], [1650, 860, 0.3, 0.6], [1050, 100, 0.34, 0.55]];
  const st = blobs.map(([x, y, t0, k]) => ({ x, y, q: ease.inOut(seg(p, t0, t0 + 0.66)), k }));
  const one = (i) => { const b = st[i], R = b.q * 1400 * b.k; if (R <= 0) return;
    for (let j = 0; j <= 90; j++) { const a = j / 90 * Math.PI * 2, n = PAINT.fbm(Math.cos(a) * 1.6 + i * 7, Math.sin(a) * 1.6 + p * 0.8, 3);
      const rr = R * (1 + 0.28 * n + 0.05 * Math.sin(a * 9 + i)); const X = b.x + Math.cos(a) * rr, Y = b.y + Math.sin(a) * rr; j ? c.lineTo(X, Y) : c.moveTo(X, Y); }
    c.closePath(); };
  c.drawImage(A, 0, 0);
  // 水痕只在刚绽开时有（q<0.55 内淡到 0）——审片抓到长大后的残圈横穿画面
  st.forEach((b, i) => { if (b.q <= 0 || b.q >= 1) return; c.save(); c.beginPath(); one(i); c.strokeStyle = `rgba(255,250,236,${0.6 * (1 - b.q)})`; c.lineWidth = 70; c.filter = 'blur(18px)'; c.stroke(); c.restore(); });
  c.save(); c.beginPath(); st.forEach((b, i) => one(i)); c.clip(); c.drawImage(B, 0, 0); c.restore();
  st.forEach((b, i) => { if (b.q <= 0 || b.q >= 0.55) return; c.save(); c.beginPath(); one(i); c.globalCompositeOperation = 'multiply'; c.strokeStyle = `rgba(150,110,70,${0.6 * Math.pow(1 - b.q / 0.55, 2)})`; c.lineWidth = 5; c.filter = 'blur(1.2px)'; c.stroke(); c.restore(); });
};

// ④ 吉卜力 → 蒸汽波：VHS 磁带故障。前半旧画面被横向撕裂＋RGB 分离，中段一下「场同步丢失」整幅上滚＋黑条，
//    后半新画面带着逐渐收敛的撕裂稳定下来。
T.vhs = function (c, A, B, p) {
  const f = Math.floor(p * 18), r = rng(900 + f), amp = Math.sin(Math.PI * p);
  const src = p < 0.5 ? A : B;
  const roll = p > 0.38 && p < 0.62 ? (seg(p, 0.38, 0.62) * H * 0.8) | 0 : 0;
  c.fillStyle = '#000'; c.fillRect(0, 0, W, H);
  if (roll) { c.drawImage(src, 0, roll); c.drawImage(src, 0, roll - H - 40); c.fillStyle = '#05010a'; c.fillRect(0, roll - 40, W, 40); }
  else c.drawImage(src, 0, 0);
  // 撕裂带（从 A 或 B 里取，横向错位）
  let y = 0; while (y < H) { const h = 6 + r() * 48, use = r() < p ? B : A;
    if (r() < 0.55 * amp + 0.08) { const dx = (r() - 0.5) * 260 * amp; c.drawImage(use, 0, y, W, h, dx, y, W, h); }
    y += h; }
  // RGB 分离：洋红/青两份半透明错位
  c.save(); c.globalCompositeOperation = 'screen'; c.globalAlpha = 0.45 * amp;
  const T2 = PAINT.scratch('vhsT'), tg = T2.getContext('2d');
  [['#ff00ff', 14 * amp], ['#00ffff', -14 * amp]].forEach(([col, dx]) => { tg.globalCompositeOperation = 'source-over'; tg.clearRect(0, 0, W, H); tg.drawImage(src, 0, 0); tg.globalCompositeOperation = 'multiply'; tg.fillStyle = col; tg.fillRect(0, 0, W, H); c.drawImage(T2, dx, 0); });
  c.restore();
  // 雪花线
  c.save(); c.globalAlpha = 0.7 * amp; for (let i = 0; i < 160; i++) { c.fillStyle = r() < 0.5 ? '#fff' : '#9a9a9a'; c.fillRect(r() * W, r() * H, 30 + r() * 200, 2); } c.restore();
};


// ---- 样片补的 4 个：A–D 每组第一段在片头没有进入转场，这里按「进入段的签名语言」补上 ----
Object.assign(T, {
  // 进入水墨：旧画先被「洗」成宣纸（去色、提亮、减对比），几团墨点从落笔处先后洇开，边缘带一圈墨晕，新画在墨里出现
  inkBloom(c, A, B, p, o) {
    const cx = o.cx || 560, cy = o.cy || 740;
    c.save(); c.filter = `grayscale(${seg(p, 0, 0.5)}) brightness(${1 + 0.35 * seg(p, 0, 0.6)}) contrast(${1 - 0.3 * seg(p, 0, 0.6)})`; c.drawImage(A, 0, 0); c.restore();
    const blobs = once('inkBloom', () => { const r = rng(17), out = [[cx, cy, 0, 1.0]]; for (let i = 0; i < 6; i++) out.push([200 + r() * 1520, 120 + r() * 840, 0.08 + r() * 0.3, 0.45 + r() * 0.4]); return out; });
    const outline = (g, x, y, R) => { g.beginPath(); for (let j = 0; j <= 72; j++) { const a = j / 72 * TAU, n = PAINT.fbm(Math.cos(a) * 1.8 + x * 0.01, Math.sin(a) * 1.8 + y * 0.01, 3), rr = R * (1 + 0.35 * n); j ? g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : g.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); };
    const st = blobs.map(([x, y, t0, k]) => { const q = ease.out(seg(p, t0, t0 + 0.7)); return [x, y, q, q * 1500 * k]; });
    // 遮罩与墨边都在 1/4 分辨率上画再放大（边缘本来就是软的；全分辨率 blur 要 ~170ms）
    const sm = once('inkBloomSm', () => [mkc(W / 4, H / 4), mkc(W / 4, H / 4)]), [mk, rim] = sm, mg = mk.getContext('2d'), rg = rim.getContext('2d');
    mg.reset(); mg.scale(0.25, 0.25); mg.filter = 'blur(3px)'; mg.fillStyle = '#000';
    st.forEach(([x, y, q, R]) => { if (q > 0) { outline(mg, x, y, R); mg.fill(); } });
    rg.reset(); rg.scale(0.25, 0.25); rg.filter = 'blur(2.5px)'; rg.lineWidth = 34;                  // 墨晕边：刚洇开时浓，长大后淡出（否则残圈横穿新画面）
    st.forEach(([x, y, q, R]) => { if (q <= 0 || q >= 1) return; rg.strokeStyle = `rgba(30,26,22,${0.55 * Math.pow(1 - q, 1.5)})`; outline(rg, x, y, R); rg.stroke(); });
    c.save(); c.globalCompositeOperation = 'multiply'; c.drawImage(rim, 0, 0, W, H); c.restore();
    const T2 = o.tmp, g = T2.getContext('2d'); g.reset(); g.drawImage(B, 0, 0); g.globalCompositeOperation = 'destination-in'; g.drawImage(mk, 0, 0, W, H);
    c.drawImage(T2, 0, 0);
    if (p > 0.8) { c.globalAlpha = seg(p, 0.8, 1); c.drawImage(B, 0, 0); c.globalAlpha = 1; }
  },
  // 进入构成主义：李西茨基「红楔打白圈」——一枚红楔从左下斜刺过画面，楔尖后面是新画面；三根黑排版条跟着楔子冲进来
  redWedge(c, A, B, p, o) {
    const e = ease.inOut(p), ang = -0.32, ca = Math.cos(ang), sa = Math.sin(ang);
    const X = lerp(-700, W + 900, e);                                           // 楔尖沿斜轴的位置
    const tf = (u, v) => [960 + (u - 960) * ca - (v - 540) * sa, 540 + (u - 960) * sa + (v - 540) * ca];
    c.drawImage(A, 0, 0);
    c.save(); c.beginPath(); [tf(-2000, -2000), tf(X - 420, -2000), tf(X - 420, 3000), tf(-2000, 3000)].forEach((q, i) => i ? c.lineTo(...q) : c.moveTo(...q)); c.closePath(); c.clip(); c.drawImage(B, 0, 0); c.restore();
    c.save(); c.fillStyle = '#c8231c'; c.beginPath(); [tf(X, 540), tf(X - 520, 540 - 330), tf(X - 520, 540 + 330)].forEach((q, i) => i ? c.lineTo(...q) : c.moveTo(...q)); c.closePath(); c.fill();
    c.fillStyle = '#151311'; [[-150, 26, 0], [120, 18, 0.12], [260, 34, 0.2]].forEach(([dv, h, lag]) => { const x1 = lerp(-700, W + 900, ease.inOut(clamp(p - lag))) - 560;
      c.beginPath(); [tf(-2000, 540 + dv), tf(x1, 540 + dv), tf(x1, 540 + dv + h), tf(-2000, 540 + dv + h)].forEach((q, i) => i ? c.lineTo(...q) : c.moveTo(...q)); c.closePath(); c.fill(); });
    c.restore();
  },
  // 进入 Kirby 漫画：新画面按漫画分格一格格「砸」进来（从 1.18 倍落位、黑格线），没换到的旧画面先被盖上一层本戴网点
  comicPanels(c, A, B, p, o) {
    const cells = once('comicPanels', () => [[0, 0, 820, 520, 0], [820, 0, 1100, 520, 0.12], [0, 520, 640, 560, 0.24], [640, 520, 700, 560, 0.34], [1340, 520, 580, 560, 0.44]]);
    c.drawImage(A, 0, 0);
    c.save(); c.globalAlpha = Math.min(1, p * 2.5) * 0.85; c.fillStyle = PAINT.dotPattern(c, 'comicTr', 12, 3.4, '#e0287a', null, 75); c.fillRect(0, 0, W, H); c.restore();
    for (const [x, y, w, h, t0] of cells) {
      const q = seg(p, t0, t0 + 0.32); if (q <= 0) continue; const s = 1.18 - 0.18 * ease.outBack(q);
      c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip();
      c.translate(x + w / 2, y + h / 2); c.scale(s, s); c.translate(-x - w / 2, -y - h / 2); c.drawImage(B, 0, 0); c.restore();
      c.save(); c.strokeStyle = '#141212'; c.lineWidth = 14 * (1 - seg(p, 0.8, 1)); if (c.lineWidth > 0.5) c.strokeRect(x, y, w, h); c.restore();
    }
  },
  // 进入伦勃朗：旧画沉进暗褐（暗角从四周合拢），然后一道从窗口斜下来的光柱把新画面照出来，最后暗部也慢慢显影
  chiaroscuro(c, A, B, p, o) {
    const sx = o.cx || 580, sy = o.cy || 300;
    c.drawImage(A, 0, 0);
    c.save(); c.globalCompositeOperation = 'multiply'; const d = seg(p, 0, 0.45);
    const vg = c.createRadialGradient(960, 540, lerp(1100, 80, d), 960, 540, lerp(1400, 700, d)); vg.addColorStop(0, 'rgba(255,255,255,1)'); vg.addColorStop(1, `rgba(28,18,10,${0.9 * d + 0.1})`);
    c.fillStyle = vg; c.fillRect(0, 0, W, H); c.fillStyle = `rgba(40,26,14,${0.85 * d})`; c.fillRect(0, 0, W, H); c.restore();
    const q = ease.inOut(seg(p, 0.25, 0.9)); if (q <= 0) return;
    const T2 = o.tmp, g = T2.getContext('2d'); g.reset(); g.drawImage(B, 0, 0); g.globalCompositeOperation = 'destination-in'; g.filter = 'blur(40px)'; g.fillStyle = '#000';
    const spread = lerp(60, 1400, q); g.beginPath(); g.moveTo(sx - 180, sy - 200); g.lineTo(sx + 180, sy - 200); g.lineTo(sx + 500 + spread, sy + 900); g.lineTo(sx - 200 - spread * 0.6, sy + 900); g.closePath(); g.fill();
    g.beginPath(); g.arc(sx + 420, sy + 260, lerp(40, 1500, q), 0, TAU); g.fill(); g.filter = 'none';
    c.drawImage(T2, 0, 0);
    c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.35 * Math.sin(Math.PI * q); c.fillStyle = 'rgba(255,214,150,1)'; c.beginPath(); c.moveTo(sx - 140, sy - 160); c.lineTo(sx + 140, sy - 160); c.lineTo(sx + 420 + spread * 0.5, sy + 900); c.lineTo(sx - 120 - spread * 0.3, sy + 900); c.closePath(); c.filter = 'blur(30px)'; c.fill(); c.restore();
    if (p > 0.8) { c.globalAlpha = seg(p, 0.8, 1); c.drawImage(B, 0, 0); c.globalAlpha = 1; }
  },
});

// ================= YouTube 解说语法的转场（references/09-视频动画语法.md） =================
// 解说片的转场原则和艺术速通相反：不抢戏、保持空间连续（观众知道「镜头去了哪」）——多数是相机运动和共享元素。
// 相机运动在场景里按时间算好（CAM），转场只负责「A、B 怎么合」。这些段一般写 punch: 0 或片级 window.PUNCH = 0（关掉拍点冲击）。
Object.assign(T, {
  // 【同一世界】same：A、B 本来是同一幅画（同一世界画布、相机连续运动），直接用 B。Vox 桌面快摇、白板平移都走它。
  same(c, A, B) { c.drawImage(B, 0, 0); },
  // 【Kurzgesagt】lensReveal 钻进镜头：A 里相机正指数推进某个圆（眼睛/镜头），B 只露在这个圆里，圆随推进长大到盖满屏，圆边一圈光环。
  //   o.lens(t) → {x, y, r} 屏幕上的圆（由上一镜的相机算，必须和 A 的推进同步）；o.ring 光环色。圆要盖满屏：推进倍数 ≥ CAM.coverZoom(r)。
  lensReveal(c, A, B, p, o) {
    const L = o.lens(o.t);
    c.drawImage(A, 0, 0);
    if (L.r < 1) return;
    c.save(); c.beginPath(); c.arc(L.x, L.y, L.r, 0, TAU); c.clip(); c.drawImage(B, 0, 0); c.restore();
    const ring = Math.max(3, L.r * 0.06), col = o.ring || [120, 240, 255], col2 = o.ring2 || [70, 230, 255];
    c.save(); c.strokeStyle = `rgba(${col},.85)`; c.lineWidth = ring; c.beginPath(); c.arc(L.x, L.y, L.r + ring / 2, 0, TAU); c.stroke();
    c.strokeStyle = `rgba(${col2},.25)`; c.lineWidth = ring * 3; c.beginPath(); c.arc(L.x, L.y, L.r + ring * 2, 0, TAU); c.stroke(); c.restore();
  },
  // 【Kurzgesagt】matchCut 填满再拉出：A 推进到某个色块满屏，B 从同色的东西里拉出；只在 o.at（默认中点）±o.width/2 内交叉溶解（±3 帧），两边颜色本来一样，剪点看不见。
  matchCut(c, A, B, p, o) {
    const w = o.width || 0.06, q = clamp((p - (o.at ?? 0.5) + w / 2) / w);
    if (q <= 0) { c.drawImage(A, 0, 0); return; }
    if (q >= 1) { c.drawImage(B, 0, 0); return; }
    c.drawImage(A, 0, 0); c.globalAlpha = q; c.drawImage(B, 0, 0); c.globalAlpha = 1;
  },
  // 【storytime】whip 甩镜：旧画面加速甩出、新画面减速甩入，中段整屏横向运动模糊（采样 ≤8px 一张，少了读成残影）。o.dir=1 往左甩
  whip(c, A, B, p, o) {
    const e = MO.expoInOut(p), dir = o.dir || 1, off = e * W * dir;
    const v = Math.max(0, 1 - Math.abs(p - 0.5) * 2.2);
    const n = 1 + Math.round(v * 40), spread = v * 320;
    for (let k = 0; k < n; k++) {
      const d = n === 1 ? 0 : (k / (n - 1) - 0.5) * spread * dir;
      c.globalAlpha = 1 / (k + 1) > 0.999 ? 1 : 1 / (k + 1);
      c.drawImage(A, -off + d, 0); c.drawImage(B, W * dir - off + d, 0);
    }
    c.globalAlpha = 1;
  },
  // 【storytime】smash 砸镜：第一帧就是新画面，带 1.22 倍放大从猛到停（弹簧，夹在 ≥1 防黑边），首两帧白闪。反应特写用
  smash(c, A, B, p, o) {
    const lt = p * o.dur, s = Math.max(1, 1 + 0.22 * (1 - MO.springHz(lt, o.freq || 3, o.decay || 11)));
    c.save(); c.translate(W / 2, H / 2); c.scale(s, s); c.translate(-W / 2, -H / 2); c.drawImage(B, 0, 0); c.restore();
    if (lt < 2 / 60) { c.fillStyle = 'rgba(255,255,255,0.55)'; c.fillRect(0, 0, W, H); }
  },
  // 【动态文字】fillZoom 冲进色块：镜头冲进旧画面里某个形（o.cx,o.cy；形的颜色 o.fill = 新画面底色），冲满屏后新画面从 1.25 落回 1。
  //   揭开点 = o.k（默认 .55）：卡拍时段起点 = 小节线 − k×dur（MO.onBeat）。o.maxZoom 冲进倍数（指数缩放本身就是加速，别再套 expoIn）
  fillZoom(c, A, B, p, o) {
    const k = o.k || 0.55;
    if (p < k) { const q = Math.pow(p / k, 2.2), s = Math.pow(o.maxZoom || 40, q);
      c.save(); c.translate(o.cx, o.cy); c.scale(s, s); c.translate(-o.cx, -o.cy); c.drawImage(A, 0, 0); c.restore(); }
    else { const q = MO.expoOut((p - k) / (1 - k)), s = lerp(1.25, 1, q);
      c.fillStyle = o.fill || '#000'; c.fillRect(0, 0, W, H);
      c.save(); c.globalAlpha = clamp(q * 3); c.translate(W / 2, H / 2); c.scale(s, s); c.translate(-W / 2, -H / 2); c.drawImage(B, 0, 0); c.restore(); }
  },
  // 【动态文字】bands 色带擦除：o.colors 几条斜切色带接力扫过（间隔 o.gap），最后一条后面是新画面。揭开点 ≈ .6
  bands(c, A, B, p, o) {
    const cols = o.colors || ['#FFD23F', '#FF5A36', '#14213D'], n = cols.length, sk = H * 0.35, gap = o.gap || 0.13;
    const edge = q => lerp(-sk - 40, W + sk + 40, MO.expoInOut(clamp(q)));
    c.drawImage(A, 0, 0);
    const clipTo = x => { c.beginPath(); c.moveTo(-sk - 60, 0); c.lineTo(x + sk, 0); c.lineTo(x, H); c.lineTo(-sk - 60, H); c.closePath(); };
    for (let i = 0; i < n; i++) { const x = edge((p - i * gap) / (1 - (n - 1) * gap)); c.save(); clipTo(x); c.clip(); c.fillStyle = cols[i]; c.fillRect(0, 0, W, H); c.restore(); }
    const xb = edge((p - n * gap) / (1 - (n - 1) * gap));
    c.save(); clipTo(xb); c.clip(); c.drawImage(B, 0, 0); c.restore();
  },
  // 【动态文字】push 推页：新旧一起平移（expoInOut），像镜头在长画布上滑到下一块。o.dir: 'left'（默认）| 'up'。到 90% 位移在 p≈.58
  push(c, A, B, p, o) {
    const e = MO.expoInOut(p);
    if (o.dir === 'up') { c.drawImage(A, 0, -e * H); c.drawImage(B, 0, H - e * H); }
    else { c.drawImage(A, -e * W, 0); c.drawImage(B, W - e * W, 0); }
  },
  // 【3b1b / 财经】zoomThrough 镜头穿越：相机推向 (cx,cy)，新画面从该物体「里面」长出来。
  //   o: {cx, cy, zoom, r0=物体半径（圆形开口；0=不裁）, live, bg, focus:[x,y] 新画面主体位置, bScale0, ease}
  //   live:true = 旧镜头自己在转场里继续推相机（矢量重画，线条不糊；推荐）；否则把 A 当位图放大（10× 以上会糊）。
  //   有 r0 时 zoom 要 ≥ CAM.coverZoom(r0, cx, cy)（≈1100/r0），否则开口到结束都盖不满屏，最后一帧会跳。
  zoomThrough(c, A, B, p, o) {
    const cx = o.cx, cy = o.cy, Z = o.zoom || 7, e = (o.ease || MO.smooth)(p);
    const sA = Math.pow(Z, e);
    c.fillStyle = o.bg || '#000'; c.fillRect(0, 0, W, H);
    c.save(); if (!o.live) { c.translate(cx, cy); c.scale(sA, sA); c.translate(-cx, -cy); }
    c.globalAlpha = 1 - (o.bScale0 ? seg(p, 0.5, 0.8) : o.r0 ? seg(p, 0.45, 0.8) : seg(p, 0.6, 0.95));   // 开口外的旧画面早点退，新镜头标题出来时不挂残影
    c.drawImage(A, 0, 0); c.restore();
    c.save();
    if (o.r0) {
      const R = o.r0 * sA; c.beginPath(); c.arc(cx, cy, R, 0, TAU); c.clip();
      c.fillStyle = o.bg || '#000'; c.globalAlpha = seg(p, 0.18, 0.45); c.fillRect(0, 0, W, H);   // 穿过物体表面：亮面渐暗成内部
    }
    // 新画面从「1/Z 大小、主体 focus 对准 (cx,cy)」走到原位全屏；没有圆形开口时用 bScale0（如 0.6）从较大尺寸起、晚一点溶进来，免得像浮着的小卡片
    const [fx, fy] = o.focus || [W / 2, H / 2], sB = o.bScale0 ? Math.pow(o.bScale0, 1 - e) : Math.pow(Z, e - 1);
    c.globalAlpha = o.r0 ? seg(p, 0.22, 0.55) : o.bScale0 ? seg(p, 0.45, 0.85) : seg(p, 0.25, 0.7);
    const m = MO.smooth(seg(e, 0.55, 1));                // 开口没盖满屏前，主体一直待在开口正中；最后才归位
    c.translate(lerp(cx, fx, m), lerp(cy, fy, m)); c.scale(sB, sB); c.translate(-fx, -fy); c.drawImage(B, 0, 0);
    c.restore();
  },
  // 【发布会】blurPush 模糊推进：旧画面后退（0.92）＋模糊＋变暗，新画面从 1.06 带模糊落到 1.0 清晰；底下垫一张放大重模糊的旧画面防黑边
  blurPush(c, A, B, p) {
    const e = MO.appleOut(p);
    c.save(); c.filter = 'blur(30px)'; c.translate(W / 2, H / 2); c.scale(1.08, 1.08); c.translate(-W / 2, -H / 2); c.drawImage(A, 0, 0); c.restore();
    const draw = (img, s, blur, a) => { if (a <= 0) return; c.save(); c.globalAlpha = a; if (blur > 0.3) c.filter = `blur(${blur.toFixed(1)}px)`;
      c.translate(W / 2, H / 2); c.scale(s, s); c.translate(-W / 2, -H / 2); c.drawImage(img, 0, 0); c.restore(); };
    draw(A, lerp(1, 0.92, e), 24 * e, 1 - seg(p, 0.2, 0.75));
    draw(B, lerp(1.06, 1, e), 24 * (1 - e), seg(p, 0.15, 0.7));
  },
  // 【发布会】expandRect 卡片展开成全屏（共享元素）：o.rect={x,y,w,h} 是卡片在上一镜末帧的屏幕矩形、o.r 圆角；弹簧展开，里面装新画面，旧画面后退变暗。
  //   新画面第一帧就不透明地装进卡片（卡内硬切被展开运动盖住）：卡片半透明时任何溶接都会看到新旧两层字叠在一起。
  expandRect(c, A, B, p, o) {
    const e = MO.spring(p * (o.dur || 0.6), { duration: 0.55, bounce: 0 });
    const R = o.rect, x = lerp(R.x, 0, e), y = lerp(R.y, 0, e), w = lerp(R.w, W, e), h = lerp(R.h, H, e), r = lerp(o.r || 28, 0, e);
    c.save(); c.filter = 'blur(30px)'; c.translate(W / 2, H / 2); c.scale(1.08, 1.08); c.translate(-W / 2, -H / 2); c.drawImage(A, 0, 0); c.restore();
    c.save(); c.globalAlpha = 1 - 0.6 * e;
    const s = lerp(1, 0.94, e); c.translate(W / 2, H / 2); c.scale(s, s); c.translate(-W / 2, -H / 2); c.drawImage(A, 0, 0); c.restore();
    c.save(); c.beginPath(); c.roundRect(x, y, w, h, r); c.clip();
    const k = Math.max(w / W, h / H); c.translate(x + w / 2, y + h / 2); c.scale(k, k); c.translate(-W / 2, -H / 2);
    c.drawImage(B, 0, 0); c.restore();
  },
  // 【财经】slidePush 面板横推：新面板从右推入、旧面板向左推出（bezier .7,0,.2,1），一道品牌色竖条 o.bar 领路
  slidePush(c, A, B, p, o) {
    const e = MO.bezier(0.7, 0, 0.2, 1)(p), dx = -W * e;
    c.drawImage(A, dx, 0); c.drawImage(B, dx + W, 0);
    if (o.bar) { c.fillStyle = o.bar; c.fillRect(dx + W - 14, 0, 14, H); }
  },
  // 【3b1b】fadeShift 淡出上移 / 淡入上移（manim FadeOut(shift=UP) + FadeIn(shift=UP)），o.shift 位移像素
  fadeShift(c, A, B, p, o) {
    const d = o.shift || 60, a = MO.smooth(seg(p, 0, 0.6)), b = MO.smooth(seg(p, 0.4, 1));
    c.fillStyle = o.bg || '#000'; c.fillRect(0, 0, W, H);
    c.save(); c.globalAlpha = 1 - a; c.drawImage(A, 0, -d * a); c.restore();
    c.save(); c.globalAlpha = b; c.drawImage(B, 0, d * (1 - b)); c.restore();
  },
});

// 项目自己的转场（transitions/<名>.js）可以复用这几个工具
TR_UTIL = { once, seg, mkc };
})();
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
return {look, post, trans, seq, snap, buf, on, LOOKS, TR, P, MO, CAM, DG, TY, CH, UI, CL, TOON, KIT, U, RIG};
})();
