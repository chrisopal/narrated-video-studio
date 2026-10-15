// 器物解剖 · index.js —— 本项目自己写的接合层（几何来自同目录 isokit.js / lathe.js / tube.js，改自 wheresryan22/anatomy，MIT）
// 管四件事：主题和色阶、把几何路径画到画布上（Path2D）、视频里的镜头和“按时间算”的动作、招牌零件和画框。
(() => {
const A = PACK.anatomy, K = A.K, G = A.G, TB = A.TB;
let X = g;   // 当前画笔：平时是主画布 g，on(ctx, fn) 里临时换成封面的画布

/* ---------- 主题：一套灰阶 + 唯一的高亮 ----------
   色阶 an：paper 零件的底色（等于画框的底色，零件互相遮挡时不露补丁）、face/top 受光面、shade[0..3] 侧面四档（0 背光最暗）、
   litTop/litShade 高亮零件的顶面和侧面；线的五档 hi mid lo faint lit；halo 底座下的软影；dot 螺丝点；red green blue 只在“颜色就是主题”时用。 */
const DARK = { paper: '#141415', face: '#1c1c1d', top: '#232324', shade: ['#0f0f10', '#141415', '#19191a', '#1f1f20'], litTop: '#2f2f30', litShade: '#232324',
  hi: '#dadada', mid: '#77777a', lo: '#4a4a4d', faint: '#323234', lit: '#ffffff', halo: '#000000', haloA: .9, dot: '#e6e6e6',
  red: '#ff6b6b', green: '#6be0a0', blue: '#6b9bff' };
const LIGHT = { paper: '#fbfbfa', face: '#ffffff', top: '#ffffff', shade: ['#d9d9d6', '#e3e3e0', '#ececea', '#f4f4f1'], litTop: '#ffffff', litShade: '#eeeeeb',
  hi: '#26262a', mid: '#86868b', lo: '#adadb2', faint: '#d0d0d3', lit: '#000000', halo: '#8a8a80', haloA: .34, dot: '#3a3a3e',
  red: '#e5484d', green: '#30a46c', blue: '#3e63dd' };
addTheme('anatomy', { an: DARK, ink: '#ececec', dim: 'rgba(236,236,236,.62)', note: 'rgba(236,236,236,.8)', a1: '#ffffff', a2: '#ff6b6b', a3: '#6b9bff',
  chip: 'rgba(255,255,255,.08)', sub: 'rgba(8,8,9,.8)', subInk: '#f2f2f2', top: '#0d0d0e', bot: '#0b0b0c', card: '#141415', cardInk: '#ececec', pillInk: '#0b0b0c', hl: '#ffffff',
  f: { t: 'H9', b: 'H7', s: 'H5', h: 'KT', n: 'RC' },
  bg(t) { X.fillStyle = '#0c0c0d'; X.fillRect(0, 0, W, H) } });
addTheme('anatomy_light', { light: true, an: LIGHT, ink: '#18181a', dim: 'rgba(24,24,26,.6)', note: 'rgba(24,24,26,.78)', a1: '#000000', a2: '#e5484d', a3: '#3e63dd',
  chip: 'rgba(0,0,0,.05)', sub: 'rgba(24,24,26,.86)', subInk: '#ffffff', top: '#f2f2ef', bot: '#ecece8', card: '#fbfbfa', cardInk: '#18181a', pillInk: '#ffffff', hl: '#000000',
  f: { t: 'H9', b: 'H7', s: 'H5', h: 'KT', n: 'RC' },
  bg(t) { X.fillStyle = '#f2f2ef'; X.fillRect(0, 0, W, H) } });
// 别的主题下也能画：没有 an 就按深浅取一套
const tok = () => (TH && TH.an) || (TH && TH.light ? LIGHT : DARK);

/* ---------- 线宽：原项目在 650 像素宽的网页上用 0.6 像素细线；视频要在手机上看得见，缺省 1.5 像素 ----------
   原项目里以像素写的小尺寸（螺丝点 0.5、端点 1.2、软影 9）都乘 U = 线宽/0.6，保持和线的比例。 */
const LOOK = { lw: 1.5 };
const U = () => LOOK.lw / .6;
function look(o) { Object.assign(LOOK, o) }

/* ---------- 路径缓存：静止零件每帧算出来的字符串一样，Path2D 只解析一次 ---------- */
const PC = new Map();
function P2(d) { if (!d) return null; let p = PC.get(d); if (!p) { if (PC.size > 6000) PC.clear(); p = new Path2D(d); PC.set(d, p) } return p }
function fillD(d, col) { const p = P2(d); if (!p) return; X.fillStyle = col; X.fill(p, 'nonzero') }
function strokeD(d, col, w = LOOK.lw, dashArr) { const p = P2(d); if (!p) return; X.strokeStyle = col; X.lineWidth = w; X.lineCap = 'round'; X.lineJoin = 'round'; if (dashArr) X.setLineDash(dashArr); X.stroke(p); if (dashArr) X.setLineDash([]) }
const toneCol = (tone) => { const T = tok(); return tone in T && typeof T[tone] === 'string' ? T[tone] : tone };

/* ---------- 画实体：K.slabOf / K.cylinder / K.extrude / G.lathe / G.solidOf 等返回的 {fill, shades, top, crease, bevel, outline} ----------
   solid(paths, {tone 轮廓档, crease 折线档('none' 不画), lit 高亮（全片同一时刻只给一个）, flat 薄片不分面, halo 底下软影, inner 画在轮廓下面的细节(函数或路径), a 透明度}) */
function solid(paths, o = {}) {
  if (!paths) return;
  const T = tok(), { tone = 'hi', crease = 'faint', lit = false, flat = false, halo = false, inner = null, a = 1 } = o;
  if (a <= 0) return;
  X.save(); X.globalAlpha *= a;
  if (halo) softShadow(paths.fill, o.blur);
  fillD(paths.fill, lit ? T.face : T.paper);
  if (!flat) {
    (paths.shades || []).forEach((d, i) => { if (!d) return; const c = lit ? T.litShade : T.shade[i]; fillD(d, c); if (paths.seamless) strokeD(d, c, .9) });
    if (paths.top) { const c = lit ? T.litTop : T.top; fillD(paths.top, c); if (paths.seamless) strokeD(paths.top, c, .9) }
  }
  if (crease !== 'none') { strokeD(paths.crease, toneCol(crease)); strokeD(paths.bevel, toneCol(crease)) }
  if (inner) typeof inner === 'function' ? inner() : strokeD(inner, T.faint);
  strokeD(paths.outline, lit ? T.lit : toneCol(tone));
  X.restore();
}
// 软影：一块模糊的暗色，垫在底座和抬起来的东西下面（d 是填充路径，比如 slabOf(...).fill 或 K.haloOf(...)）
function softShadow(d, blur) {
  const T = tok(), p = P2(d); if (!p) return;
  X.save(); X.filter = `blur(${(blur ?? 9) * U()}px)`; X.translate(0, 3 * U()); X.globalAlpha *= T.haloA; X.fillStyle = T.halo; X.fill(p); X.restore();
}
/* 线：line(d, {tone, dotted, dashed, flow: t（虚线沿线流动，传当前时间）, w 线宽倍数, a}) —— 刻线、槽、导线都用它 */
function line(d, o = {}) {
  if (!d) return; const { tone = 'lo', dotted, dashed, flow, w = 1, a = 1 } = o; if (a <= 0) return;
  const u = U(); X.save(); X.globalAlpha *= a;
  let dsh = null; if (dotted) dsh = [.01, 3.5 * u]; else if (dashed) dsh = [3 * u, 3 * u]; else if (flow !== undefined && flow !== false) dsh = [2 * u, 6 * u];
  if (flow !== undefined && flow !== false) X.lineDashOffset = -(+flow || 0) * 20 * u;
  strokeD(d, toneCol(tone), LOOK.lw * w * (dotted ? 1.6 : 1), dsh); X.restore();
}
// 一组透明度不同的线：[[d, alpha], …]（G.ribsOf(…,{fade}) 这类会淡出的纹理）
function faded(list, o = {}) { for (const e of list || []) { const [d, al] = Array.isArray(e) ? e : [e.d, e.alpha]; if (d && al > .02) line(d, { ...o, a: (o.a ?? 1) * Math.min(1, al) }) } }
// 螺丝、铆钉、通气孔：dots(屏幕点[[x,y,透明度?]…], {size 0.4–0.55, tone, pulse: t})
function dots(points, o = {}) {
  const { size = .5, tone = 'mid', pulse } = o, T = tok(), OP = { hi: .85, mid: .45, lo: .22, faint: .12 }, op = OP[tone] ?? 1;
  X.save(); X.fillStyle = tone in OP ? T.dot : toneCol(tone);
  (points || []).forEach(([x, y, al], i) => {
    let k = op * (al === undefined ? 1 : Math.max(0, al));
    if (pulse !== undefined) { const ph = ((pulse * 1000 + (i * 137) % 1600) % 1600) / 1600; k = ph < .12 ? 1 : ph < .4 ? lerp(1, .18, (ph - .12) / .28) : .18 }
    X.globalAlpha = k; X.beginPath(); X.arc(x, y, size * U(), 0, 7); X.fill();
  });
  X.restore();
}
// 连线：两端落在零件上的小圆点，中间可以拐（屏幕坐标）。线不能悬空，这是原项目最硬的一条规矩
function wire(from, to, o = {}) {
  const { via = [], tone = 'lo', ends = 'both', size = 1.2 } = o, T = tok();
  line(K.pathOf([from, ...via, to]), o);
  const end = ([x, y]) => { X.beginPath(); X.arc(x, y, size * U(), 0, 7); X.fillStyle = T.paper; X.fill(); X.strokeStyle = toneCol(tone); X.lineWidth = LOOK.lw; X.stroke() };
  if (ends === 'both' || ends === 'from') end(from); if (ends === 'both' || ends === 'to') end(to);
}
// 必须停在面中间的单根线：两头用渐变淡出，不许硬断。fade=[起头淡出长度, 结尾淡出长度]（像素）
function fadeLine(points, o = {}) {
  if (!points || points.length < 2) return; const { fade = [0, 0], tone = 'lo', a = 1 } = o, col = toneCol(tone);
  let L = 0; for (let i = 1; i < points.length; i++) L += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
  if (L < 1e-6) return; const [s, e] = Array.isArray(fade) ? fade : [fade, fade], p0 = points[0], p1 = points[points.length - 1];
  const gr = X.createLinearGradient(p0[0], p0[1], p1[0], p1[1]), tr = c => { const m = c.match(/^#(..)(..)(..)$/); return m ? [1, 2, 3].map(i => parseInt(m[i], 16)) : [128, 128, 128] }, [r, gg, b] = tr(col);
  const st = (k, al) => gr.addColorStop(cl(k), `rgba(${r},${gg},${b},${al})`); st(0, s > 0 ? 0 : 1); if (s > 0) st(s / L, 1); if (e > 0) st(1 - e / L, 1); st(1, e > 0 ? 0 : 1);
  X.save(); X.globalAlpha *= a; X.strokeStyle = gr; X.lineWidth = LOOK.lw; X.lineCap = 'round'; X.lineJoin = 'round'; X.stroke(P2(K.pathOf(points))); X.restore();
}
// 管子和电缆的一段（TB.tubePieces 的每一项）：身体、高光、暗带、编织环、两条边
function tubePiece(pc, o = {}) {
  const T = tok(), { tone = 'hi', a = 1, lit = false } = o; if (a <= 0) return;
  X.save(); X.globalAlpha *= a;
  fillD(pc.body, lit ? T.litShade : T.shade[2]);
  if (pc.wide) { fillD(pc.shine, lit ? T.litTop : T.top); fillD(pc.shade, T.shade[0]) }
  for (const { d, alpha } of pc.rings || []) if (alpha > .02) { X.save(); X.globalAlpha *= Math.min(1, alpha); strokeD(d, toneCol(pc.ringTone || 'lo'), LOOK.lw * .75); X.restore() }
  strokeD(pc.edges, lit ? T.lit : toneCol(tone)); X.restore();
}
// 整根管子：切段、按深度排好、画出来。route 是三维点列（先用 G.fillet 倒圆角），r 是半径（世界单位）
function pipe(P, route, r, o = {}) {
  const pcs = TB.tubePieces(route, r, P, o).map(pc => [K.depthOf(pc.mid, P), pc]).sort((x, y) => x[0] - y[0]);
  pcs.forEach(([, pc]) => tubePiece(pc, o)); return pcs.map(x => x[1]);
}
// 回转体：profile 是半剖面 [[s, r], …]（第三项写 1 表示这一段是光滑曲面），F 是 G.frameAlong(原点, 轴向)
function turned(P, profile, F, o = {}, style = {}) { const pth = G.solidOf(profile, F, P, o); solid(pth, style); return pth }

/* ---------- 贴面：在零件的某个面上画东西（屏幕、刻度盘上的字以外的图形） ----------
   onFace(K.topMatrix([x,y], z, P) 或 K.sideMatrix([x,y], z, P, 'left'|'right'), fn)：fn 里用那个面的本地坐标画（单位 = 世界单位） */
function onFace(m, fn) { const v = String(m).match(/-?[\d.]+(e-?\d+)?/g).map(Number); X.save(); X.transform(v[0], v[1], v[2], v[3], v[4], v[5]); fn(); X.restore() }

/* ---------- 镜头 ----------
   view({at:[x,y,z], sx, sy, s, az, el})  世界点 at 落在屏幕 (sx,sy)，每世界单位约 s 像素，方位角 az（缺省 45）、仰角 el（缺省 30）
   fit(三维点列, {x,y,w,h}, {pad, az, el, headroom})  让这些点刚好装进画面里的那个框（原项目的 fitProjection，多了框的位置）
   camLerp(A, B, k)  两个 view 之间插值：位置线性、比例按对数；k 自己套缓动。镜头只推拉平移，方位角动不过 ±8°（零件的前后顺序是按一个角度排的） */
function view({ at = [0, 0, 0], sx = W / 2, sy = H / 2, s = 3, az = 45, el = 30 } = {}) {
  const P = { origin: [0, 0], scale: s / Math.sqrt(1.6), azimuth: az, elevation: el }, p = K.iso(at, P);
  P.origin = [sx - p[0], sy - p[1]]; P.v = { at, sx, sy, s, az, el }; return P;
}
function fit(points, box = { x: 0, y: 0, w: W, h: H }, o = {}) {
  const P = K.fitProjection(points, box.w, box.h, { pad: o.pad ?? 40, headroom: o.headroom ?? 0, azimuth: o.az ?? 45, elevation: o.el ?? 30 });
  P.origin = [P.origin[0] + box.x, P.origin[1] + box.y];
  const c = [0, 1, 2].map(i => (Math.min(...points.map(p => p[i])) + Math.max(...points.map(p => p[i]))) / 2), q = K.iso(c, P);
  P.v = { at: c, sx: q[0], sy: q[1], s: P.scale * Math.sqrt(1.6), az: P.azimuth, el: P.elevation }; return P;
}
function camLerp(a, b, k) {
  const A1 = a.v || a, B1 = b.v || b, L = (x, y) => x + (y - x) * k;
  return view({ at: [0, 1, 2].map(i => L(A1.at[i], B1.at[i])), sx: L(A1.sx, B1.sx), sy: L(A1.sy, B1.sy), s: Math.exp(L(Math.log(A1.s), Math.log(B1.s))), az: L(A1.az, B1.az), el: L(A1.el, B1.el) });
}
const at = (p, P) => K.iso(p, P);
// 按深度排：远的先画。items 里每项用 key(item) 取一个世界点
function byDepth(items, P, key = x => x) { return [...items].sort((a, b) => { const p = key(a), q = key(b); return K.depthOf([p[0], p[1], p[2] || 0], P) - K.depthOf([q[0], q[1], q[2] || 0], P) }) }

/* ---------- 动作：全是“时间 → 数值”的确定函数（同一个 t 画两遍一模一样） ----------
   keys = [[时刻, 目标值], …]：目标在这些时刻跳变，零件不跳，而是跟过去。第一项是初值。
   follow(t, keys, tau)        指数跟随（τ 0.1–0.3 秒）：滑块、旋钮、镜头跟目标
   spring(t, keys, {f, z})     弹簧：f 每秒振几次（缺省 1.6），z 阻尼比（缺省 0.45，回弹一次；≥1 不回弹）。东西本身有弹性时用它，指针和读数也跟着它
   env(t, t0, t1, {a, d})      包络：t0 起用 a 秒升到 1，t1 起用 d 秒落回 0（光、高亮、流动的强弱，绝不突然出现或消失）
   drop(t, t0, {h, f, z})      零件“装上去”：从 h 高处落到 0 的弹簧偏移，加在 z 上（装配时用它代替淡入） */
function follow(t, keys, tau = .28) { let v = keys[0][1]; for (let i = 1; i < keys.length; i++) { const [ti, vi] = keys[i]; if (t <= ti) break; v += (vi - keys[i - 1][1]) * (1 - Math.exp(-(t - ti) / tau)) } return v }
function stepResp(x, f, z) { if (x <= 0) return 0; const w = 2 * Math.PI * f; if (z >= 1) return 1 - Math.exp(-w * x) * (1 + w * x); const wd = w * Math.sqrt(1 - z * z); return 1 - Math.exp(-z * w * x) * (Math.cos(wd * x) + z / Math.sqrt(1 - z * z) * Math.sin(wd * x)) }
function spring(t, keys, { f = 1.6, z = .45 } = {}) { let v = keys[0][1]; for (let i = 1; i < keys.length; i++) { const [ti, vi] = keys[i]; if (t <= ti) break; v += (vi - keys[i - 1][1]) * stepResp(t - ti, f, z) } return v }
function env(t, t0, t1 = Infinity, { a = .3, d = .4 } = {}) { const s = x => x * x * (3 - 2 * x); return s(cl((t - t0) / a)) * (1 - s(cl((t - t1) / d))) }
function drop(t, t0, { h = 40, f = 1.8, z = .55 } = {}) { return t < t0 ? Infinity : h * (1 - stepResp(t - t0, f, z)) }
// 还没装上的零件不画：const dz = drop(t, t0); if (dz === Infinity) return; 画的时候 z 加 dz

/* ---------- 招牌零件（菜谱来自原项目 craft.md 的零件词汇；坐标是世界单位，z 朝上）----------
   色阶的规矩：底座和脚 lo，结构（立柱、导轨、滑台）mid，主角 hi，此刻要看的那一件 lit（只一件）；槽 faint，小刻度 lo，大刻度 mid，零点 hi */
const corners4 = (plan, inset) => K.corners(plan, inset);
// 底座：脚（法兰 + 脚）、带倒角的板、内槽、四角螺丝。plan={x,y,w,d,r}，板顶在 z
function basePlate(P, plan, { z = 0, h = 12, feet = true, groove = true, screws = true, halo = true, tone = 'mid' } = {}) {
  const zb = z - h;
  if (halo) softShadow(K.haloOf(plan, zb - 5, h, P), 12);
  if (feet) byDepth(corners4(plan, 22), P).forEach(([x, y]) => { solid(K.cylinder(x, y, 7, zb - 5, 1.6, P, 28), { tone: 'lo' }); solid(K.cylinder(x, y, 5.4, zb - 3.4, 3.4, P, 28), { tone: 'mid' }) });
  solid(K.slabOf(plan, zb, h, P, 8, 1.6), { tone });
  if (groove) line(K.planOutline(K.insetPlan(plan, 5), z, P), { tone: 'faint' });
  if (screws) corners4(plan, 10).forEach(([x, y]) => { line(K.ring(x, y, 2.2, z, P, 16), { tone: 'lo' }); dots([K.iso([x, y, z], P)], { size: .55, tone: 'mid' }) });
}
// 刻度尺：一条薄尺，刻度从尺的边上长出来（不许悬空在板上）。axis 'x' 沿 x 方向；zero 在哪个读数画零点
function ruler(P, { x, y, w, d = 7, z = 0, step = 4, every = 5, axis = 'x', zero } = {}) {
  const plan = axis === 'x' ? { x, y, w, d, r: 1 } : { x, y, w: d, d: w, r: 1 };
  solid(K.slabOf(plan, z, .6, P, 3), { tone: 'lo', crease: 'none' });
  const tk = axis === 'x' ? K.topTicks(x + 4, x + w - 4, step, every, y + .8, z + .6, [2, 3.6], P, 'x') : K.topTicks(y + 4, y + w - 4, step, every, x + .8, z + .6, [2, 3.6], P, 'y');
  line(tk.minor, { tone: 'lo' }); line(tk.major, { tone: 'mid' });
  if (zero !== undefined) line(axis === 'x' ? K.lineOnTop([zero, y + .8], [zero, y + d - .8], z + .6, P) : K.lineOnTop([x + .8, zero], [x + d - .8, zero], z + .6, P), { tone: 'hi', w: 1.3 });
}
// 铭牌：薄板 + 内框 + 三条长短不一的“字行”（代表印刷字，不写真字）+ 两颗螺丝
function labelPlate(P, plan, z = 0) {
  solid(K.slabOf(plan, z, .8, P, 4), { tone: 'lo' }); line(K.planOutline(K.insetPlan(plan, 1.6), z + .8, P), { tone: 'faint' });
  const x0 = plan.x + 4.5, y0 = plan.y + 3.6, gap = (plan.d - 7.2) / 2;
  [.72, .5, .62].forEach((k, i) => line(K.lineOnTop([x0, y0 + i * gap], [x0 + (plan.w - 12) * k, y0 + i * gap], z + .8, P), { tone: 'lo' }));
  dots([[plan.x + plan.w - 3, plan.y + 3], [plan.x + plan.w - 3, plan.y + plan.d - 3]].map(([a, b]) => K.iso([a, b, z + .8], P)), { size: .45 });
}
// 导轨：一条带倒角的长条，两头螺丝
function rail(P, plan, { z = 0, h = 3, tone = 'mid' } = {}) {
  solid(K.slabOf(plan, z, h, P, 3, .4), { tone });
  const long = plan.w >= plan.d, pts = long ? [[plan.x + 3, plan.y + plan.d / 2], [plan.x + plan.w - 3, plan.y + plan.d / 2]] : [[plan.x + plan.w / 2, plan.y + 3], [plan.x + plan.w / 2, plan.y + plan.d - 3]];
  dots(pts.map(([a, b]) => K.iso([a, b, z + h], P)), { size: .45 });
}
// 立柱：底下一圈套环，柱身上两道淡缝
function post(P, x, y, z0, h, { r = 3.2, tone = 'mid' } = {}) {
  solid(K.cylinder(x, y, r + 1.8, z0, 4, P, 28), { tone: 'lo' });
  solid(K.cylinder(x, y, r, z0 + 4, h - 4, P, 28), { tone, crease: 'none', inner: () => [.35, .7].forEach(k => line(K.sideArc(x, y, r, z0 + 4 + (h - 4) * k, P, 16), { tone: 'faint' })) });
}
// 滚花旋钮：圆柱 + 滚花 + 顶上的指针（angle 弧度，0 指向 +x）
function knob(P, cx, cy, z, { r = 6, h = 4, angle = 0, tone = 'mid', lit = false } = {}) {
  solid(K.cylinder(cx, cy, r, z, h, P, 32, .4), { tone, lit, inner: () => line(K.knurl(cx, cy, r, z, z + h, 36, P), { tone: 'lo' }) });
  const c = Math.cos(angle), s = Math.sin(angle);
  line(K.lineOnTop([cx - c * r * .45, cy - s * r * .45], [cx + c * r * .78, cy + s * r * .78], z + h, P), { tone: lit ? 'lit' : 'hi', w: 1.2 });
}
// 弹簧绕在杆上：先画背面那半圈圈，再画 inner()（杆或别的被它绕住的东西），最后画正面那半。压缩就改 from/to，每帧重算
function coil(P, { from, to, center, r = 4.2, turns = 6, axis = 'x', tone = 'mid' }, inner) {
  const c = K.coil(from, to, center, r, turns, axis, P);
  line(c.back, { tone: 'lo' }); if (inner) inner(); line(c.front, { tone, w: 1.15 });
}
// 表盘（朝上放）：表壳、滚花表圈、刻度（小 lo 大 mid）、零点、指针（lit）、表心。value 是 0..1 转一整圈的比例；mark 在哪个比例画一道提示刻度
function dial(P, x, y, z, { R = 18, h = 9, value = 0, ticks = 50, every = 5, mark, lit = true, tone = 'hi' } = {}) {
  const top = z + h;
  solid(K.cylinder(x, y, R, z, h, P, 64, .8), { tone, crease: 'lo', inner: () => { line(K.knurl(x, y, R, top - 3.4, top, 84, P, .3), { tone: 'lo' }); line(K.sideArc(x, y, R, top - 3.4, P, 40), { tone: 'faint' }) } });
  line(K.ring(x, y, R - 2.2, top, P, 64), { tone: 'lo' });
  const tk = K.radialTicks(x, y, R - 3, ticks, every, top, [1.3, 2.8], P); line(tk.minor, { tone: 'lo' }); line(tk.major, { tone: 'mid' });
  line(K.lineOnTop([x, y - (R - 3)], [x, y - (R - 7)], top, P), { tone: 'hi', w: 1.3 });
  if (mark !== undefined) { const m = mark * Math.PI * 2; line(K.lineOnTop([x + Math.sin(m) * (R - 7), y - Math.cos(m) * (R - 7)], [x + Math.sin(m) * (R - 3), y - Math.cos(m) * (R - 3)], top, P), { tone: 'red', w: 1.3 }) }
  const an = value * Math.PI * 2, sx = Math.sin(an), sy = -Math.cos(an);
  line(K.lineOnTop([x - sx * 3.5, y - sy * 3.5], [x + sx * (R - 4.5), y + sy * (R - 4.5)], top + .2, P), { tone: lit ? 'lit' : 'hi', w: 1.6 });
  line(K.ring(x, y, 1.6, top + .2, P, 16), { tone: 'hi' });
}

/* ---------- 画框（原项目的 card）：左上“图 n”、右上短标题、左下提示、右下读数；字都在框角，画里不写字 ----------
   plate(t, t0, {x, y, w, h, fig, title, hint, readout, t1, draw(box)})
     先铺框（底色就是零件的 paper），再在两条字带之间裁一块画图区，调用 draw(box) 画机器（镜头推近也不会压到框角的字），最后写四角的字。
     读数随模型实时变（数字变化不影响阅读时长检查）。字号 32；框的下沿缺省在字幕带（底部 120 像素）之上。返回画图区 {x,y,w,h}。 */
function plate(t, t0, o = {}) {
  const { x = 96, y = 64, w = W - 192, h = H - 64 - 156, fig = '', title = '', hint = '', readout = '', t1 = Infinity, sz = 32, draw } = o;
  const pad = 28, band = pad + sz * 1.35, box = { x: x + 1, y: y + band, w: w - 2, h: h - 2 * band };
  const k = env(t, t0, t1, { a: .5, d: .5 }); if (k <= 0) return box;
  const T = tok(); X.save(); X.globalAlpha *= k;
  X.fillStyle = TH.card; X.fillRect(x, y, w, h);
  if (draw) { X.save(); X.beginPath(); X.rect(box.x, box.y, box.w, box.h); X.clip(); draw(box); X.restore() }
  X.strokeStyle = T.mid; X.lineWidth = 1.2; X.strokeRect(x + .5, y + .5, w - 1, h - 1);
  const fs = TH.f;
  if (fig) txt(fig, x + pad, y + pad + sz * .8, sz, TH.ink, fs.s, 'left');
  if (title) txt(title, x + w - pad, y + pad + sz * .8, sz, TH.dim, fs.s, 'right');
  if (hint) txt(hint, x + pad, y + h - pad, sz, TH.dim, fs.s, 'left');
  if (readout) txt(readout, x + w - pad, y + h - pad, sz, TH.ink, fs.s, 'right');
  X.restore(); return box;
}
// 封面里用：on(ctx, fn) 把画笔临时换成封面的画布（只适合不写字的零件）
function on(ctx, fn) { const old = X; X = ctx; try { fn() } finally { X = old } }

Object.assign(A, { DARK, LIGHT, look, P2, solid, softShadow, line, faded, dots, wire, fadeLine, tubePiece, pipe, turned, onFace,
  view, fit, camLerp, at, byDepth, follow, spring, env, drop, basePlate, ruler, labelPlate, rail, post, knob, coil, dial, plate, on });
})();
