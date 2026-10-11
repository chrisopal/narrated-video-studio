/* 风格包 · 生成艺术（gen）—— 用数学规则画的影像：一批点从头用到尾，每一场是一条规则，场与场之间是同一批点换了规则
   适合：无旁白或极少字的短片（宇宙、生命、智能、时间这类大题目），片头片尾，讲数学和算法时的“看它自己长出来”。
   brief.json："style":"void","packs":["gen"]（主题 void：近黑的底）      scenes.js：const {stage, F, mix, frame, draw, begin, end, say, code, eqn, CAM} = PACK.gen;

   核心只有四步，每一帧都这样走：
     begin(t)                                   清空累加缓冲
     frame(t, {trail:6, shutter:.05}, (tt, w) => {   拖尾：把过去一小段时间里的样子叠起来（不存状态，同一时刻画两遍一样）
       F.galaxy(S, A, tt, {...}); F.helix(S, B, tt, {...});   两个构型各算一遍位置
       mix(S, P, A, B, k, {stagger:.5, scatter:.3});          同一批点从 A 走到 B（k 0..1）
       draw(S, P, {cam, color:[.6,.8,1], color2:[1,.7,.4], gain:w});   加色累加：点叠得越多越亮
     })
     end(t, {bloom:.6, grain:.05})              色调映射、泛光、颗粒，合到画面上；之后再画字

   一批点    S = stage(60000, 种子)          全片只建一次（放在 scenes.js 顶层）；buf(S) 给一块放位置的数组（x,y,z,亮度 四个一组）
   构型 F.名字(S, 数组, t, {参数})：
     point 一个点 · burst 向外炸开（k 半径进度）· dust 均匀的尘 · galaxy 旋臂星系（arms, wind, spin）· sphere 球壳（R）· ring 环
     phyllo 向日葵排布（seeds 多少颗种子，grow 0..1 长出来，θ = n × 137.5°）· helix 双螺旋（turns, spin）· lattice 晶格 · grid 起伏的网（amp, freq）
     net 神经网络（layers:[6,9,9,6,3]，点在节点上和连线上跑）· glyph 排成字（text, font, w）· lorenz 洛伦兹吸引子 · static 满屏的噪点
   相机 CAM({yaw, pitch, dist, zoom, x, y})：绕 y 轴转 yaw、俯仰 pitch；zoom 放大；世界坐标 1 ≈ 画面短边的 0.42
   字：
     say(t, t0, t1, '中文', 'English', {x, y, size, align})   按 brief.json 的 lang 出字：zh 只出中文，en 只出英文，bi 中文大、英文小排在下面；一行放不下自己折成两行
     code(t, t0, ['一行代码', '第二行'], x, y, {size, t1})      等宽字逐字敲出来——把“画这幅画的那一行”亮给观众看
     eqn(t, t0, t1, 'θ = n × 137.5°', x, y, size)              斜体公式
   规矩：
     - 一场一条规则，说得出口（“每个点朝大家的重心落”“每个点比前一个多转 137.5°”）。说不出规则的画面只是屏保。
     - 点的数目全片不变，换场只换规则：观众看到的是“同一批东西变成了另一种东西”，这是这类片子的叙事。
     - 字极少，一场最多一句，问句比陈述句好；公式和代码只在它正好是画面的成因时出现。
     - 所有随机走种子；不要用 Math.random 和跨帧累积的画布（拖尾用 frame 的 trail）。
   性能：六万点、拖尾 6 层，一帧约 60–90 毫秒。点数和拖尾层数相乘别超过五十万。 */
window.PACK=window.PACK||{};window.PACK_INIT=window.PACK_INIT||[];
PACK.gen=(function(){
const TAU = Math.PI * 2, GOLD = Math.PI * (3 - Math.sqrt(5));
const LANG = new URLSearchParams(location.search).get('lang') || 'zh';
function rng(seed) { let s = (seed * 2654435761) >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
const h2 = (a, b) => { let x = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263)) | 0; x = Math.imul(x ^ (x >>> 13), 1274126177); return ((x ^ (x >>> 16)) >>> 0) / 4294967296; };
const ss = x => { x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); };

addTheme('void', { ink: '#f2f4f8', dim: 'rgba(242,244,248,.6)', note: 'rgba(242,244,248,.82)', a1: '#9fd0ff', a2: '#ffd9a0', a3: '#ff8a5c', chip: 'rgba(255,255,255,.08)', sub: 'rgba(0,0,0,.55)', subInk: '#f2f4f8', top: '#020308', bot: '#05070f', card: 'rgba(12,16,28,.86)', cardInk: '#f2f4f8', pillInk: '#05070f',
  bg(t) { g.fillStyle = '#020308'; g.fillRect(0, 0, W, H); const r = g.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.hypot(W, H) * .6); r.addColorStop(0, 'rgba(16,22,44,.55)'); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.fillRect(0, 0, W, H); } });

/* ---------- 一批点 ---------- */
function stage(N, seed = 1) { const r = rng(seed), R = new Float32Array(N * 4); for (let i = 0; i < N * 4; i++) R[i] = r(); return { N, R, seed }; }
const buf = S => new Float32Array(S.N * 4);
const ASP = () => W / H;

/* ---------- 构型：往 out 里写每个点的 x,y,z,亮度 ---------- */
const F = {
  point(S, o, t, p = {}) { const { N, R } = S, r = p.r ?? .003; for (let i = 0, j = 0; i < N; i++, j += 4) { o[j] = (R[j] - .5) * r; o[j + 1] = (R[j + 1] - .5) * r; o[j + 2] = (R[j + 2] - .5) * r; o[j + 3] = p.a ?? 1; } },
  // 向外炸开：k 是膨胀的进度（世界单位），每个点速度不同，带一点旋
  burst(S, o, t, p = {}) { const { N, R } = S, k = p.k ?? 1, tw = p.twist ?? .8;
    for (let i = 0, j = 0; i < N; i++, j += 4) { const u = R[j] * 2 - 1, ph0 = R[j + 1] * TAU, ph = ph0 + k * tw * (R[j + 3] - .5), s = Math.sqrt(1 - u * u), v = (.02 + Math.pow(R[j + 2], 1.7) * 1.9) * k;
      const fil = Math.sin(u * 9 + ph0 * 3) * Math.sin(ph0 * 5 - u * 6) * .5 + .5;   // 方向上的疏密：炸开以后是一丝一丝的，不是均匀的球
      if (i % 6 === 0) { const vs = k * (p.shell ?? 1.5) * (.97 + .06 * R[j + 2] * R[j + 3]); o[j] = s * Math.cos(ph0) * vs; o[j + 1] = s * Math.sin(ph0) * vs; o[j + 2] = u * vs; o[j + 3] = (.5 + 1.6 * fil) / (1 + k * k * 1.5); continue; }   // 六分之一的点跑在最前面：一层薄壳，越胀越淡
      const f3 = Math.pow(fil, 3), vv = v * (.45 + .9 * f3);   // 密的方向跑得远：拉成丝
      o[j] = s * Math.cos(ph) * vv; o[j + 1] = s * Math.sin(ph) * vv; o[j + 2] = u * vv; o[j + 3] = .2 + 2.2 * f3; } },
  dust(S, o, t, p = {}) { const { N, R } = S, a = p.size ?? 1.5, ax = a * Math.max(1, ASP()), d = p.drift ?? .05;
    for (let i = 0, j = 0; i < N; i++, j += 4) { o[j] = (R[j] * 2 - 1) * ax + d * Math.sin(t * .31 + R[j + 3] * TAU); o[j + 1] = (R[j + 1] * 2 - 1) * a + d * Math.cos(t * .27 + R[j] * TAU); o[j + 2] = (R[j + 2] * 2 - 1) * a; o[j + 3] = p.a ?? .8; } },
  // 旋臂星系：对数螺线，里圈转得快
  galaxy(S, o, t, p = {}) { const { N, R } = S, m = p.arms ?? 2, Rg = p.R ?? 1.1, wind = p.wind ?? 2.9, spin = p.spin ?? .22, sp = p.spread ?? 1.5;
    for (let i = 0, j = 0; i < N; i++, j += 4) { const bulge = (i % 5) === 0, halo = (i % 11) === 3, u = R[j], r = bulge ? Rg * .2 * Math.pow(u, 1.8) + .003 : Rg * (.05 + .95 * Math.pow(u, halo ? .5 : .78));
      const g2 = (R[j + 2] - .5) * (R[j + 3] + h2(i, 9)) * .9;   // 两个随机数相乘：旋臂中间密、两边稀，没有硬边
      const th = Math.floor(R[j + 1] * m) * TAU / m + wind * Math.log(1 + r * 3) + (halo ? R[j + 2] * TAU : g2 * sp * (bulge ? 8 : 1)) + t * spin / (.22 + r);
      o[j] = r * Math.cos(th); o[j + 2] = r * Math.sin(th); o[j + 1] = (h2(i, 5) - .5) * (bulge ? .16 : .05) * Math.exp(-r * 1.2); o[j + 3] = bulge ? 1.1 : halo ? .28 : .95 * (1 - .5 * u); } },
  sphere(S, o, t, p = {}) { const { N, R } = S, r0 = p.R ?? .8, fill = p.fill ?? 0, br = p.breathe ?? .03;
    for (let i = 0, j = 0; i < N; i++, j += 4) { const y = 1 - 2 * (i + .5) / N, s = Math.sqrt(1 - y * y), th = i * GOLD, r = r0 * (fill ? Math.cbrt(R[j] * fill + 1 - fill) : 1) * (1 + br * Math.sin(t * 1.3 + y * 5 + th)); o[j] = s * Math.cos(th) * r; o[j + 1] = y * r; o[j + 2] = s * Math.sin(th) * r; o[j + 3] = 1; } },
  ring(S, o, t, p = {}) { const { N, R } = S, r0 = p.R ?? .9, w = p.width ?? .04, spin = p.spin ?? .2;
    for (let i = 0, j = 0; i < N; i++, j += 4) { const th = R[j] * TAU + t * spin * (.6 + R[j + 3] * .8), r = r0 + (R[j + 1] - .5) * w * (1 + 3 * R[j + 2] * R[j + 2]); o[j] = r * Math.cos(th); o[j + 1] = r * Math.sin(th); o[j + 2] = (R[j + 2] - .5) * w; o[j + 3] = 1; } },
  // 向日葵：第 n 个点比前一个多转 137.5°，离中心 √n。grow 0..1：从里往外长
  phyllo(S, o, t, p = {}) { const { N, R } = S, Rm = p.R ?? 1.05, gr = p.grow ?? 1, spin = p.spin ?? .05, M = p.seeds ?? 1400, n1 = gr * M, dot = p.dot ?? .011;
    for (let i = 0, j = 0; i < N; i++, j += 4) { const n = i % M, on = n < n1, r = Rm * Math.sqrt((on ? n + .5 : n1) / M), th = n * GOLD + t * spin, a = R[j] * TAU, d = dot * Math.sqrt(R[j + 1]) * (.5 + r / Rm);   // 每颗“种子”是一小团点，越靠外越大
      o[j] = r * Math.cos(th) + Math.cos(a) * d; o[j + 1] = r * Math.sin(th) + Math.sin(a) * d; o[j + 2] = (R[j + 2] - .5) * .01; o[j + 3] = on ? 1 : 0; } },
  // 双螺旋：八成的点在两条链上，两成在横档上
  helix(S, o, t, p = {}) { const { N, R } = S, L = p.L ?? 1.5, turns = p.turns ?? 4, rad = p.rad ?? .26, spin = p.spin ?? .5, rungs = turns * 10;
    for (let i = 0, j = 0; i < N; i++, j += 4) { const rung = R[j + 1] < .22, s0 = R[j], s = rung ? (Math.floor(s0 * rungs) + .5) / rungs : s0, ph = s * turns * TAU + t * spin, st = (i & 1) ? Math.PI : 0;
      const q = rung ? R[j + 2] * 2 - 1 : 1, jit = rung ? .003 : .007; o[j] = (s - .5) * 2 * L + (R[j + 3] - .5) * jit; o[j + 1] = Math.cos(ph + st) * rad * q + (R[j + 2] - .5) * jit; o[j + 2] = Math.sin(ph + st) * rad * q + (R[j + 1] - .5) * jit; o[j + 3] = rung ? .55 : 1; } },
  lattice(S, o, t, p = {}) { const { N, R } = S, n = p.n ?? 9, a = p.size ?? .9, jit = p.jitter ?? .006;
    for (let i = 0, j = 0; i < N; i++, j += 4) { const q = v => (Math.floor(v * n) / (n - 1) * 2 - 1) * a; o[j] = q(R[j]) + (R[j + 3] - .5) * jit; o[j + 1] = q(R[j + 1]) + (R[j] - .5) * jit; o[j + 2] = q(R[j + 2]) + (R[j + 1] - .5) * jit; o[j + 3] = .9; } },
  // 起伏的网：一张布，被看不见的东西压弯
  grid(S, o, t, p = {}) { const { N, R } = S, a = p.size ?? 1.6, amp = p.amp ?? .12, fr = p.freq ?? 3, n = p.lines ?? 28, well = p.well ?? 0;
    for (let i = 0, j = 0; i < N; i++, j += 4) { const along = R[j] * 2 - 1, q = (Math.floor(R[j + 1] * n) + .5) / n * 2 - 1, x = (i & 1) ? along * a : q * a, z = (i & 1) ? q * a : along * a, d = Math.hypot(x, z);
      o[j] = x; o[j + 2] = z; o[j + 1] = amp * Math.sin(d * fr - t * 1.4) * Math.exp(-d * .6) - well / (.25 + d * d * 2.2); o[j + 3] = .7; } },
  // 神经网络：一部分点聚在节点上，其余沿连线跑（信号）
  net(S, o, t, p = {}) { const { N, R } = S, Ls = p.layers || [5, 8, 8, 6, 3], w = p.w ?? 1.25, h = p.h ?? .78, speed = p.speed ?? .35, key = Ls.join(',') + '|' + w + '|' + h;
    let C = S._net && S._net.key === key ? S._net : null;
    if (!C) { const nodes = [], edges = [], off = []; Ls.forEach((n, l) => { off.push(nodes.length); for (let k = 0; k < n; k++) nodes.push([(Ls.length === 1 ? 0 : l / (Ls.length - 1) * 2 - 1) * w, (n === 1 ? 0 : k / (n - 1) * 2 - 1) * h * (.55 + .45 * n / Math.max(...Ls)), (h2(l, k) - .5) * .3]); });
      for (let l = 0; l + 1 < Ls.length; l++) for (let a = 0; a < Ls[l]; a++) for (let b = 0; b < Ls[l + 1]; b++) edges.push([off[l] + a, off[l + 1] + b]); C = S._net = { key, nodes, edges }; }
    const { nodes, edges } = C, nn = nodes.length, ne = edges.length;
    for (let i = 0, j = 0; i < N; i++, j += 4) {
      if (R[j] < .3) { const n = nodes[Math.floor(R[j + 1] * nn)], a = R[j + 2] * TAU, r = .028 * Math.sqrt(R[j + 3]); o[j] = n[0] + Math.cos(a) * r; o[j + 1] = n[1] + Math.sin(a) * r; o[j + 2] = n[2]; o[j + 3] = 1.1; }
      else { const e = edges[Math.floor(R[j + 1] * ne)], A = nodes[e[0]], B = nodes[e[1]], sig = R[j + 2] < .38, q = sig ? (R[j + 3] + t * speed * (.6 + R[j] * 1.2)) % 1 : R[j + 3]; o[j] = A[0] + (B[0] - A[0]) * q; o[j + 1] = A[1] + (B[1] - A[1]) * q; o[j + 2] = A[2] + (B[2] - A[2]) * q; o[j + 3] = sig ? 1.5 : .22; } } },
  // 排成字：把字画进一张小画布，在有墨的地方撒点
  glyph(S, o, t, p = {}) { const { N, R } = S, text = p.text ?? '?', font = p.font || '700 300px H9', w = p.w ?? 1.6, key = text + '|' + font;
    S._gl = S._gl || {}; let G = S._gl[key];
    if (!G) { const c = document.createElement('canvas'), x = c.getContext('2d', { willReadFrequently: true }); x.font = font; const m = x.measureText(text), cw = Math.ceil(m.width) + 40, chh = Math.ceil((m.actualBoundingBoxAscent || 240) + (m.actualBoundingBoxDescent || 60)) + 40; c.width = cw; c.height = chh; x.font = font; x.fillStyle = '#fff'; x.textBaseline = 'alphabetic'; x.fillText(text, 20, 20 + (m.actualBoundingBoxAscent || 240));
      const d = x.getImageData(0, 0, cw, chh).data, pts = []; for (let yy = 0; yy < chh; yy++) for (let xx = 0; xx < cw; xx++) if (d[(yy * cw + xx) * 4 + 3] > 120) pts.push(xx, yy); G = S._gl[key] = { pts: new Float32Array(pts), cw, chh }; }
    const M = G.pts.length / 2, sc = w / G.cw; if (!M) return F.point(S, o, t, p);
    for (let i = 0, j = 0; i < N; i++, j += 4) { const k = Math.floor(R[j] * M) * 2; o[j] = (G.pts[k] + R[j + 1] - G.cw / 2) * sc; o[j + 1] = -(G.pts[k + 1] + R[j + 2] - G.chh / 2) * sc; o[j + 2] = (R[j + 3] - .5) * (p.depth ?? .04); o[j + 3] = 1; } },
  // 洛伦兹吸引子：轨迹先算好一条，点排在上面往前流
  lorenz(S, o, t, p = {}) { const { N, R } = S, M = 24000, sp = p.speed ?? 60, sc = p.scale ?? .034;
    if (!S._lz) { const T = new Float32Array(M * 3); let x = .1, y = 0, z = 0; for (let k = -2000; k < M; k++) { const dx = 10 * (y - x), dy = x * (28 - z) - y, dz = x * y - 8 / 3 * z; x += dx * .006; y += dy * .006; z += dz * .006; if (k >= 0) { T[k * 3] = x; T[k * 3 + 1] = z - 25; T[k * 3 + 2] = y; } } S._lz = T; }
    const T = S._lz; for (let i = 0, j = 0; i < N; i++, j += 4) { const f = (R[j] * M + t * sp * (.8 + R[j + 3] * .4)) % M, k = Math.floor(f) * 3; o[j] = T[k] * sc + (R[j + 1] - .5) * .006; o[j + 1] = T[k + 1] * sc + (R[j + 2] - .5) * .006; o[j + 2] = T[k + 2] * sc; o[j + 3] = 1; } },
  // 满屏的噪点：每个点原地闪。什么结构都没有了
  static(S, o, t, p = {}) { const { N, R } = S, a = p.size ?? 1.25, ax = a * Math.max(1, ASP()) * 1.05, f = Math.floor(t * (p.fps ?? 10));
    for (let i = 0, j = 0; i < N; i++, j += 4) { o[j] = (R[j] * 2 - 1) * ax; o[j + 1] = (R[j + 1] * 2 - 1) * a / Math.min(1, ASP()) * (p.sy ?? 1) + (p.oy ?? 0); o[j + 2] = 0; o[j + 3] = (p.a ?? .8) * (.25 + .75 * h2(i, f)); } },
};

/* ---------- 从一个构型走到另一个：每个点出发的时刻不同（stagger），路上散开一下（scatter），收成一个点时可以旋进去（swirl） ---------- */
function mix(S, out, A, B, k, p = {}) { const { N, R } = S, sg = p.stagger ?? .45, sc = p.scatter ?? .2, sw = p.swirl ?? 0;
  if (k <= 0) { out.set(A); return out; } if (k >= 1) { out.set(B); return out; }
  for (let i = 0, j = 0; i < N; i++, j += 4) { const q = ss((k * (1 + sg) - R[j + 3] * sg)), b = Math.sin(q * Math.PI) * sc;
    let x = A[j] + (B[j] - A[j]) * q, y = A[j + 1] + (B[j + 1] - A[j + 1]) * q; if (sw) { const a = sw * q * (.4 + 1.2 * R[j]), c = Math.cos(a), s2 = Math.sin(a), x2 = x * c - y * s2; y = x * s2 + y * c; x = x2; }   // swirl：一边走一边绕着画面中心转（终点是一个点时用：旋进去）
    out[j] = x + (R[j + 1] - .5) * b; out[j + 1] = y + (R[j + 2] - .5) * b; out[j + 2] = A[j + 2] + (B[j + 2] - A[j + 2]) * q + (R[j] - .5) * b; out[j + 3] = A[j + 3] + (B[j + 3] - A[j + 3]) * q; }
  return out; }

/* ---------- 画：加色累加 → 色调映射 → 泛光、颗粒 ---------- */
let ACC = null, IMG = null, OFF = null, OX = null, SM = null, SX = null, GR = null;
const LUT = new Uint8ClampedArray(2048); for (let i = 0; i < 2048; i++) LUT[i] = 255 * (1 - Math.exp(-i / 2048 * 8 * 1.35));
function ensure() { if (ACC && ACC.length === W * H * 3) return; ACC = new Float32Array(W * H * 3); OFF = document.createElement('canvas'); OFF.width = W; OFF.height = H; OX = OFF.getContext('2d'); IMG = OX.createImageData(W, H); for (let i = 3; i < IMG.data.length; i += 4) IMG.data[i] = 255;
  SM = document.createElement('canvas'); SM.width = Math.ceil(W / 4); SM.height = Math.ceil(H / 4); SX = SM.getContext('2d');
  GR = document.createElement('canvas'); GR.width = GR.height = 256; const x = GR.getContext('2d'), im = x.createImageData(256, 256), r = rng(77); for (let i = 0; i < im.data.length; i += 4) { const v = 255 * r(); im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; } x.putImageData(im, 0, 0); }
function begin(t) { ensure(); ACC.fill(0); }
const CAM = (c = {}) => ({ yaw: 0, pitch: 0, dist: 3.2, zoom: 1, x: 0, y: 0, roll: 0, ...c });
function draw(S, P, o = {}) { ensure(); const { N, R } = S, c = o.cam || CAM(), cy = Math.cos(c.yaw), sy = Math.sin(c.yaw), cp = Math.cos(c.pitch), sp = Math.sin(c.pitch), cr = Math.cos(c.roll), sr = Math.sin(c.roll), U = Math.min(W, H) * .42 * c.zoom, cx = W / 2 + c.x * U, cyy = H / 2 - c.y * U;
  const c1 = o.color || [.75, .86, 1], c2 = o.color2 || c1, gain = (o.gain ?? 1) * (o.bright ?? .5), big = o.size === 2, a0 = o.alpha ?? 1, w1 = W - 1, h1 = H - 1, A = ACC;
  for (let i = 0, j = 0; i < N; i++, j += 4) { const a = P[j + 3]; if (a <= 0) continue; let x = P[j], y = P[j + 1], z = P[j + 2];
    const x1 = x * cy + z * sy, z1 = -x * sy + z * cy, y1 = y * cp - z1 * sp, z2 = y * sp + z1 * cp + c.dist; if (z2 < .15) continue;
    const s = c.dist / z2, xr = x1 * cr - y1 * sr, yr = x1 * sr + y1 * cr, px = cx + xr * s * U, py = cyy - yr * s * U; if (px < 0 || py < 0 || px >= w1 || py >= h1) continue;
    const m = R[j + 1], v = gain * a * a0 * (s > 1.6 ? 1.6 : s), r = (c1[0] + (c2[0] - c1[0]) * m) * v, gg = (c1[1] + (c2[1] - c1[1]) * m) * v, b = (c1[2] + (c2[2] - c1[2]) * m) * v;
    const x0 = px | 0, y0 = py | 0, fx = px - x0, fy = py - y0; let k = (y0 * W + x0) * 3, w;
    w = (1 - fx) * (1 - fy); A[k] += r * w; A[k + 1] += gg * w; A[k + 2] += b * w; w = fx * (1 - fy); A[k + 3] += r * w; A[k + 4] += gg * w; A[k + 5] += b * w; k += W * 3;
    w = (1 - fx) * fy; A[k] += r * w; A[k + 1] += gg * w; A[k + 2] += b * w; w = fx * fy; A[k + 3] += r * w; A[k + 4] += gg * w; A[k + 5] += b * w;
    if (big && x0 > 0 && y0 > 1) { k = ((y0 - 1) * W + x0) * 3; const h = .5; A[k] += r * h; A[k + 1] += gg * h; A[k + 2] += b * h; A[k - 3 + W * 3] += r * h; A[k - 2 + W * 3] += gg * h; A[k - 1 + W * 3] += b * h; A[k + 6 + W * 3] += r * h; A[k + 7 + W * 3] += gg * h; A[k + 8 + W * 3] += b * h; } } }
// 拖尾：过去 shutter 秒里取 trail 个时刻，越早的越淡。fn(tt, 权重) 里算位置并 draw
function frame(t, o, fn) { const K = Math.max(1, o.trail ?? 6), sh = o.shutter ?? .05; let tot = 0; for (let k = 0; k < K; k++) tot += Math.pow(1 - k / K, 1.4); for (let k = K - 1; k >= 0; k--) fn(t - sh * k / K, Math.pow(1 - k / K, 1.4) / tot * (o.gain ?? 1) * 1.6); }
function end(t, o = {}) { ensure(); const d = IMG.data, A = ACC, n = W * H, ex = (o.exposure ?? 1) * 256; for (let i = 0, k = 0, q = 0; i < n; i++, k += 3, q += 4) { const r = A[k] * ex, gg = A[k + 1] * ex, b = A[k + 2] * ex; d[q] = LUT[r > 2047 ? 2047 : r | 0]; d[q + 1] = LUT[gg > 2047 ? 2047 : gg | 0]; d[q + 2] = LUT[b > 2047 ? 2047 : b | 0]; }
  OX.putImageData(IMG, 0, 0); g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'lighter'; g.globalAlpha = o.alpha ?? 1; g.drawImage(OFF, 0, 0);
  const bl = o.bloom ?? .55; if (bl > 0) { SX.globalCompositeOperation = 'copy'; SX.filter = 'blur(3px)'; SX.drawImage(OFF, 0, 0, SM.width, SM.height); SX.filter = 'none'; g.globalAlpha = bl * (o.alpha ?? 1); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.drawImage(SM, 0, 0, W, H); g.filter = 'blur(18px)'; g.globalAlpha = bl * .6 * (o.alpha ?? 1); g.drawImage(SM, 0, 0, W, H); g.filter = 'none'; }
  const gr = o.grain ?? .045; if (gr > 0) { const f = Math.floor(t * 24), ox = Math.floor(h2(f, 1) * 256), oy = Math.floor(h2(f, 2) * 256); g.globalCompositeOperation = 'overlay'; g.globalAlpha = gr * 4; g.fillStyle = g.createPattern(GR, 'repeat'); g.translate(-ox, -oy); g.fillRect(ox, oy, W, H); g.setTransform(1, 0, 0, 1, 0, 0); }
  const vg = o.vignette ?? .55; if (vg > 0) { g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; const r = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .35, W / 2, H / 2, Math.hypot(W, H) * .62); r.addColorStop(0, 'rgba(0,0,0,0)'); r.addColorStop(1, `rgba(0,0,0,${vg})`); g.fillStyle = r; g.fillRect(0, 0, W, H); }
  g.restore(); }

/* ---------- 字 ---------- */
const FACES = [['GenSerif', '/kit/fonts/art/cmunrm.woff', {}], ['GenSerifI', '/kit/fonts/art/cmunti.woff', {}], ['GenMono', '/kit/fonts/gen/JetBrainsMono-Regular.woff2', {}]];
PACK_INIT.push(async () => { for (const [fam, url, desc] of FACES) { try { const ff = new FontFace(fam, `url(${url})`, desc); await ff.load(); document.fonts.add(ff); } catch (e) { console.error('生成艺术包的字体没加载上：' + fam); } } await document.fonts.load('40px Song', '起初终结').catch(() => 0); ensure(); });
const fio = (t, a, b, d = .9) => ss((t - a) / d) * (1 - ss((t - (b - d)) / d));
// 一句话。lang：zh 只出中文；en 只出英文；bi 中文大、英文小
function wrap2(s, maxW, zh) { if (g.measureText(s).width <= maxW) return [s]; const mid = s.length / 2; let best = -1, bd = 1e9; for (let i = 1; i < s.length - 1; i++) { const ok = zh ? '，。？！、；：'.includes(s[i - 1]) : s[i] === ' '; if (ok && Math.abs(i - mid) < bd) { bd = Math.abs(i - mid); best = i; } } if (best < 0) return [s]; return [s.slice(0, best).trim(), s.slice(best).trim()]; }
function say(t, t0, t1, zh, en, o = {}) { const k = fio(t, t0, t1, o.fade ?? 1.1); if (k <= 0) return; const sz = o.size ?? (VERT ? 60 : 58), x = o.x ?? W / 2, y = o.y ?? H * .82, al = o.align || 'center', col = o.color || '#f2f4f8', lift = (1 - ss((t - t0) / 1.6)) * 14, v = vsz(sz), maxW = o.maxW ?? (W - SAFE.l - SAFE.r - 80);
  g.save(); const sp = px => { try { g.letterSpacing = px + 'px'; } catch (e) {} }, esz = LANG === 'en' ? sz * .92 : Math.max(32, sz * .56), ev = vsz(esz);
  // 一行放不下就在标点（英文在空格）处折成两行
  let zl = [], el = []; if (LANG !== 'en') { sp(v * .14); g.font = `${v}px ${o.font || 'Song'}, H7`; zl = wrap2(zh, maxW, true); } if (LANG !== 'zh' && en) { sp(ev * .03); g.font = `${ev}px GenSerif, H7`; el = wrap2(en, maxW, false); }
  const zh0 = y, zstep = v * 1.3, en0 = zl.length ? y + (zl.length - 1) * zstep + v * .86 : y, estep = ev * 1.32, bot = el.length ? en0 + (el.length - 1) * estep : zh0 + (zl.length - 1) * zstep;
  if (o.shade !== 0) { const y0 = y - v * 1.7, y1 = bot + v * 1.1, gr = g.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, 'rgba(2,3,8,0)'); gr.addColorStop(.5, `rgba(2,3,8,${(.62 * k * (o.shade ?? 1)).toFixed(3)})`); gr.addColorStop(1, 'rgba(2,3,8,0)'); g.fillStyle = gr; g.fillRect(0, y0, W, y1 - y0); }   // 字后面压一条暗带：画面再亮，字也读得清
  sp(v * .14); zl.forEach((ln, i) => { g.font = `${v}px ${o.font || 'Song'}, H7`; const wd = g.measureText(ln).width; txt(ln, x, zh0 + i * zstep + lift, wd > maxW ? Math.max(40, sz * maxW / wd) : sz, col, o.font || 'Song', al, k); });   // 没有标点可折的长句：缩一点字号
  sp(ev * (LANG === 'en' ? .02 : .03)); el.forEach((ln, i) => txt(ln, x, en0 + i * estep + lift, esz, LANG === 'en' ? col : 'rgba(242,244,248,.72)', LANG === 'en' ? 'GenSerif' : 'GenSerifI', al, k));
  sp(0); g.restore(); }
// 等宽代码，逐字敲出来
function code(t, t0, lines, x, y, o = {}) { const sz = o.size ?? 32, cps = o.cps ?? 26, fo = o.t1 != null ? 1 - ss((t - (o.t1 - .8)) / .8) : 1, col = o.color || 'rgba(159,208,255,.86)'; if (t < t0 || fo <= 0) return; let n = Math.floor((t - t0) * cps);
  lines.forEach((ln, i) => { if (n <= 0) return; const s = ln.slice(0, n), done = n >= ln.length; n -= ln.length + 4; g.save(); g.globalAlpha *= fo; g.font = `${sz}px GenMono, monospace`; g.fillStyle = col; g.textAlign = o.align || 'left'; g.textBaseline = 'alphabetic'; g.fillText(s + (!done && Math.floor(t * 3) % 2 ? '▌' : ''), x, y + i * sz * 1.5); if (REC && done && fo > .8) recText(ln, x, y + i * sz * 1.5, sz, o.align || 'left'); g.restore(); }); }
function eqn(t, t0, t1, s, x, y, sz = 40, o = {}) { txt(s, x, y, sz, o.color || 'rgba(255,217,160,.9)', 'GenSerifI', o.align || 'left', fio(t, t0, t1, .8)); }
return { stage, buf, F, mix, begin, draw, frame, end, CAM, say, code, eqn, rng, h2, ss, LANG };
})();
