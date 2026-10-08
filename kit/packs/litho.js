/* 风格包 · 石印画报 —— 出自《河海昆仑录》：水墨画面过一遍刻版，版框、题签栏、日数里数
   由 legacy/tools/mkpacks.py 生成，不要手改这个文件：旧片画法在 legacy/*.html，接合代码在 legacy/tools/glue/litho.js */
window.PACK=window.PACK||{};window.PACK_INIT=window.PACK_INIT||[];
PACK.litho=(function(){
const {TAU, INK, INKS, PAPERS, SEAL, F, clamp, lerp, ss, easeOut, rng, hash2, vn, mk, rgba, makePaper, mountain, glyph, vtext, chapter, layer, vignette} = PACK.ink;
const {suFillStroke, suStroke, peiDraw} = PACK.figures;
function drawCart(g, x, y, s, t, o = {}) {
  const face = o.face ?? 1, ph = t * 3.2;
  g.save(); g.translate(x, y); g.scale(s * face, s); if (o.alpha != null) g.globalAlpha *= o.alpha; g.lineCap = 'round'; g.lineJoin = 'round';
  const jolt = Math.sin(t * 5.3) * 1.2;
  // 骡
  g.save(); g.translate(-118, 0);
  const leg = (lx, p) => { const k = Math.sin(ph + p) * 12; suStroke(g, ['M', lx, -52, 'L', lx + k * .4, -28, 'L', lx + k, -2], 5, 'rgb(48,43,38)'); };
  leg(-22, 0); leg(-12, Math.PI); leg(24, Math.PI * .5); leg(34, Math.PI * 1.5);
  suFillStroke(g, ['M', -34, -70, 'C', -20, -84, 30, -84, 44, -68, 'C', 50, -54, 40, -46, 20, -46, 'L', -18, -46, 'C', -34, -46, -42, -56, -34, -70, 'Z'], 'rgb(58,52,46)', 1.4);
  suFillStroke(g, ['M', -32, -66, 'C', -44, -84, -56, -100, -64, -106, 'L', -84, -92, 'Q', -88, -84, -80, -82, 'L', -62, -86, 'C', -52, -70, -42, -56, -30, -52, 'Z'], 'rgb(58,52,46)', 1.4);
  suFillStroke(g, ['M', -66, -106, 'L', -70, -124, 'L', -62, -110, 'Z'], 'rgb(58,52,46)', 1.2); suFillStroke(g, ['M', -60, -104, 'L', -60, -122, 'L', -55, -106, 'Z'], 'rgb(58,52,46)', 1.2);
  suStroke(g, ['M', 44, -68, 'Q', 56, -60, 52 + Math.sin(t * 3) * 4, -38], 3, 'rgb(48,43,38)');
  suStroke(g, ['M', -52, -84, 'L', -38, -62], 1.4, 'rgb(168,50,43)');
  g.restore();
  // 辕
  suStroke(g, ['M', -146, -62, 'L', -6, -58 + jolt], 3, 'rgb(86,66,44)');
  // 车厢与席棚
  g.save(); g.translate(0, jolt);
  suFillStroke(g, ['M', -10, -58, 'L', 92, -58, 'L', 92, -48, 'L', -10, -48, 'Z'], 'rgb(96,76,52)', 1.4);
  suFillStroke(g, ['M', 2, -58, 'C', 2, -116, 20, -128, 44, -128, 'C', 68, -128, 86, -116, 86, -58, 'Z'], 'rgb(196,182,152)', 1.6);
  g.save(); g.globalAlpha *= .5; for (let k = 0; k < 6; k++) suStroke(g, ['M', 10 + k * 13, -60, 'Q', 12 + k * 12.4, -110, 22 + k * 9, -126], .9); g.restore();
  suFillStroke(g, ['M', 2, -58, 'C', 2, -100, 10, -116, 22, -124, 'C', 16, -104, 16, -80, 18, -58, 'Z'], 'rgb(60,56,52)', 1.2);
  if (o.rider) peiDraw(g, -2, -60, .52, t, { pose: 'seat', winter: o.winter, wind: .2 });
  g.restore();
  // 轮
  for (const wx of [44]) {
    g.save(); g.translate(wx, -34); g.strokeStyle = 'rgb(48,40,30)'; g.lineWidth = 5; g.beginPath(); g.arc(0, 0, 34, 0, TAU); g.stroke();
    g.lineWidth = 2; for (let k = 0; k < 10; k++) { const a = k / 10 * TAU - t * 2.2; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * 33, Math.sin(a) * 33); g.stroke(); }
    g.fillStyle = 'rgb(48,40,30)'; g.beginPath(); g.arc(0, 0, 6, 0, TAU); g.fill(); g.restore();
  }
  g.restore();
}

/* 兵舰（蒸汽巡洋舰剪影） */
function drawGunboat(g, x, y, s, t, a = 1) {
  g.save(); g.translate(x, y + Math.sin(t * .9) * 2); g.scale(s, s); g.globalAlpha *= a; g.fillStyle = 'rgb(30,28,26)'; g.strokeStyle = 'rgb(30,28,26)'; g.lineCap = 'round';
  g.beginPath(); g.moveTo(-170, -6); g.lineTo(-150, 16); g.lineTo(150, 16); g.quadraticCurveTo(172, 6, 178, -10); g.lineTo(120, -8); g.lineTo(118, -22); g.lineTo(-96, -22); g.lineTo(-100, -8); g.closePath(); g.fill();
  g.fillRect(-60, -40, 110, 18); g.fillRect(-30, -52, 44, 12);
  for (const fx of [-12, 26]) { g.fillRect(fx, -86, 16, 46); }
  g.lineWidth = 3; g.beginPath(); g.moveTo(-84, -22); g.lineTo(-84, -120); g.moveTo(92, -22); g.lineTo(92, -112); g.stroke();
  g.lineWidth = 1.2; g.beginPath(); g.moveTo(-84, -116); g.lineTo(-160, -8); g.moveTo(-84, -116); g.lineTo(-4, -86); g.moveTo(92, -108); g.lineTo(170, -10); g.moveTo(92, -108); g.lineTo(40, -86); g.stroke();
  g.fillRect(-130, -30, 30, 6); g.fillRect(104, -30, 30, 6);
  g.fillStyle = 'rgb(196,160,60)'; g.beginPath(); g.moveTo(92, -112); g.lineTo(120 + Math.sin(t * 4) * 2, -106); g.lineTo(92, -98); g.fill();
  // 煤烟
  for (let k = 0; k < 9; k++) { const q = ((t * .22 + k / 9) % 1), px = (k % 2 ? 34 : -4) + q * 260, py = -92 - q * 70 - Math.sin(q * 5 + k) * 10, r = 12 + q * 46;
    const gr = g.createRadialGradient(px, py, 0, px, py, r); gr.addColorStop(0, `rgba(30,28,26,${.42 * (1 - q)})`); gr.addColorStop(1, 'rgba(30,28,26,0)'); g.fillStyle = gr; g.fillRect(px - r, py - r, 2 * r, 2 * r); }
  g.restore();
}

/* 嘉峪关：城墙、门洞、三层关楼 */
function makeFort(seed) {
  const c = mk(1500, 700), g = c.getContext('2d'), r = rng(seed);
  const wallTop = 430, wall = 'rgb(150,124,88)';
  // 城墙（夯土）
  const gr = g.createLinearGradient(0, wallTop, 0, 700); gr.addColorStop(0, 'rgba(120,96,64,.92)'); gr.addColorStop(1, 'rgba(120,96,64,.25)');
  g.fillStyle = gr; g.beginPath(); g.moveTo(0, wallTop + 20); g.lineTo(380, wallTop); g.lineTo(1120, wallTop); g.lineTo(1500, wallTop + 26); g.lineTo(1500, 700); g.lineTo(0, 700); g.fill();
  g.fillStyle = 'rgba(96,74,48,.95)'; for (let x = 6; x < 1500; x += 34) { const y = x < 380 ? lerp(wallTop + 20, wallTop, x / 380) : x > 1120 ? lerp(wallTop, wallTop + 26, (x - 1120) / 380) : wallTop; g.fillRect(x, y - 16, 20, 17); }
  g.strokeStyle = 'rgba(50,38,24,.35)'; g.lineWidth = 1; for (let i = 0; i < 260; i++) { const x = r() * 1500, y = wallTop + 14 + r() * 250; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 20 + r() * 80, y + (r() - .5) * 3); g.stroke(); }
  // 门洞
  g.fillStyle = 'rgb(28,24,20)'; g.beginPath(); g.moveTo(700, 700); g.lineTo(700, 590); g.arc(750, 590, 50, Math.PI, 0); g.lineTo(800, 700); g.fill();
  // 关楼三层
  const tier = (cx, y, w, h, ew) => {
    g.fillStyle = 'rgb(120,44,36)'; g.fillRect(cx - w / 2, y, w, h);
    g.fillStyle = 'rgb(40,34,30)'; for (let k = 0; k < Math.floor(w / 26); k++) g.fillRect(cx - w / 2 + 8 + k * 26, y + 6, 4, h - 6);
    g.fillStyle = 'rgb(46,44,42)'; g.beginPath(); g.moveTo(cx - ew / 2 - 26, y - 6); g.quadraticCurveTo(cx - ew / 2, y - 2, cx - ew / 2 + 30, y - 22); g.lineTo(cx + ew / 2 - 30, y - 22); g.quadraticCurveTo(cx + ew / 2, y - 2, cx + ew / 2 + 26, y - 6);
    g.quadraticCurveTo(cx + ew / 2 - 6, y + 8, cx + ew / 2 - 20, y + 4); g.lineTo(cx - ew / 2 + 20, y + 4); g.quadraticCurveTo(cx - ew / 2 + 6, y + 8, cx - ew / 2 - 26, y - 6); g.fill();
  };
  tier(750, 360, 250, 70, 310); tier(750, 290, 190, 52, 250); tier(750, 232, 130, 42, 190);
  g.fillStyle = 'rgb(46,44,42)'; g.beginPath(); g.moveTo(668, 214); g.quadraticCurveTo(700, 214, 728, 186); g.lineTo(772, 186); g.quadraticCurveTo(800, 214, 832, 214); g.quadraticCurveTo(790, 226, 750, 226); g.quadraticCurveTo(710, 226, 668, 214); g.fill();
  g.fillRect(746, 168, 8, 20);
  const c2 = mk(1500, 700), g2 = c2.getContext('2d'); g2.filter = 'blur(.6px)'; g2.drawImage(c, 0, 0); return c2;
}

/* 柳（左公柳 / 哈密杨柳）：冬枯夏荣 */
function drawBigWillow(g, x, y, s, t, seed, green = 1) {
  const r = rng(seed); g.save(); g.translate(x, y); g.scale(s, s); g.lineCap = 'round';
  suStroke(g, ['M', 0, 0, 'C', -6, -60, 8, -110, 2, -170], 13, 'rgb(52,46,40)');
  for (let b = 0; b < 5; b++) {
    const a = -1.9 + b * .55 + (r() - .5) * .2, L = 70 + r() * 50, bx = 2 + Math.cos(a) * L, by = -170 + Math.sin(a) * L * .7;
    suStroke(g, ['M', 2, -168, 'Q', (2 + bx) / 2, by - 24, bx, by], 5 - b * .3, 'rgb(52,46,40)');
    for (let k = 0; k < 7; k++) {
      const ax = lerp(2, bx, .3 + k * .1), ay = lerp(-168, by, .3 + k * .1) - 8, Lh = 90 + r() * 80, sw = Math.sin(t * .9 + b + k) * 10;
      g.strokeStyle = green > 0 ? `rgba(74,104,84,${.25 + .35 * green})` : 'rgba(52,46,40,.4)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(ax, ay);
      g.quadraticCurveTo(ax + sw * .4 + 4, ay + Lh * .5, ax + sw + 6, ay + Lh); g.stroke();
    }
  }
  g.restore();
}
function dateHead(g, u, t0, place, date, dark = false, num = '') {
  const col = dark ? PAPERS : INKS;
  if (num) vtext(g, u, { t0, cols: [num], x: 1800, y: 92, size: 96, font: F.brush, color: col, fd: 1.2, wet: !dark });
  vtext(g, u, { t0: t0 + (num ? .5 : 0), cols: [place], x: 1800, y: num ? 226 : 100, size: num ? 46 : 72, lead: num ? 1.3 : 1.12, font: num ? F.songb : F.brush, color: col, rate: .2, fd: 1.1, wet: !num && !dark });
  vtext(g, u, { t0: t0 + .9, cols: [date], x: 1740, y: num ? 232 : 106, size: 22, lead: 1.25, font: F.song, color: dark ? '#d4796b' : SEAL, rate: .05, fd: .7 });
}

const AX0 = 58, AX1 = 1700, AY0 = 58, AY1 = H - 58;          // 画心
const HX0 = 1700, HX1 = 1862, HCX = 1781;                     // 题签栏
const SLIP = 'rgba(233,216,174,.95)', LINE = 'rgba(30,26,22,.9)';
let FXC = null, FXG = null, WOB = null; const ARTDY = -34, FIG = 1.22;
function engraveInit() {
  FXC = mk(W, H); FXG = FXC.getContext('2d', { willReadFrequently: true });
  WOB = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) WOB[y * W + x] = (vn(x / 130, y / 130, 5) - .5) * 2.4;
}
const _D = new Float32Array(W * H), _K = new Uint8Array(W * H);
function engrave(buf) {
  FXG.clearRect(0, 0, W, H); FXG.drawImage(buf, 0, 0);
  const im = FXG.getImageData(0, 0, W, H), d = im.data, D = _D, K = _K;
  for (let i = 0, j = 0; i < W * H; i++, j += 4) {
    const a = d[j + 3]; if (!a) { D[i] = 0; K[i] = 0; continue; }
    const r = d[j], g = d[j + 1], b = d[j + 2], al = a / 255;
    D[i] = al * (1 - (r * .3 + g * .59 + b * .11) / 255);
    K[i] = al > .5 ? (r > 95 && r > g * 1.45 && r > b * 1.35 ? 1 : (al > .6 && b > r * 1.15 && b >= g * 1.02 && b > 70 ? 2 : 0)) : 0;
  }
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1, i = y * W + 1; x < W - 1; x++, i++) {
      const j = i * 4, v = D[i];
      if (v < .012 && D[i + 1] < .012 && D[i - 1] < .012 && D[i + W] < .012 && D[i - W] < .012) { d[j + 3] = 0; continue; }
      const gx = D[i + 1] - D[i - 1] + .5 * (D[i + 1 - W] - D[i - 1 - W] + D[i + 1 + W] - D[i - 1 + W]);
      const gy = D[i + W] - D[i - W] + .5 * (D[i + W - 1] - D[i - W - 1] + D[i + W + 1] - D[i - W + 1]);
      let e = Math.sqrt(gx * gx + gy * gy) * 3.2; e = e > .34 ? Math.min(1, (e - .34) * 4) : 0;
      const kd = K[i];
      if (kd === 1) { const m = 1 - e * .8; d[j] = 178 * m; d[j + 1] = 54 * m; d[j + 2] = 42 * m; d[j + 3] = 238; continue; }
      const wb = WOB[i]; let k = 0, m, dd, c;
      if (v > .15) { c = x + y + wb; m = ((c % 7) + 7) % 7; dd = Math.abs(m - 3.5); c = (2.1 * Math.min(1, (v - .15) / .5) - dd + .6) * Math.min(1, (v - .15) / .1); if (c > k) k = c; }
      if (v > .48) { c = x - y + wb; m = ((c % 7) + 7) % 7; dd = Math.abs(m - 3.5); c = (2 * Math.min(1, (v - .48) / .36) - dd + .6) * Math.min(1, (v - .48) / .08); if (c > k) k = c; }
      if (v > .74) { c = (v - .74) / .1; if (c > k) k = c; }
      if (k > 1) k = 1; if (e > k) k = e;
      if (kd === 2) { const q = 1 - k * .75; d[j] = 62 * q; d[j + 1] = 88 * q; d[j + 2] = 118 * q; d[j + 3] = 232; continue; }
      d[j] = 30; d[j + 1] = 26; d[j + 2] = 22; d[j + 3] = 255 * k * .93;
    }
  }
  const g = buf.getContext('2d'); g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.filter = 'none';
  FXG.putImageData(im, 0, 0); g.clearRect(0, 0, W, H); g.drawImage(FXC, 0, ARTDY); g.restore();
}

scene = function (a, b, build, draw, text) { S.push({ a, b, build, draw, text }); };

/* ---------- 题签纸条上的字 ---------- */
function say(g, u, o) {
  const size = o.size, lead = size * (o.lead ?? 1.12), gap = o.gap ?? size * 1.5, rate = o.rate ?? .09;
  const out = o.t1 != null ? 1 - ss(o.t1 - (o.fo ?? 1.0), o.t1, u) : 1, a = ss(o.t0 - .2, o.t0 + .15, u) * out;
  if (a <= 0) return;
  let ml = 0, kk = 0, shown = 0;
  o.cols.forEach((c, ci) => { let L = 0; for (const ch of c) L += ch === ' ' ? .45 : ch === '·' ? .6 : 1; ml = Math.max(ml, L);
    const tc = o.t0 + kk * rate; shown = Math.max(shown, ci + ss(tc - .5, tc - .05, u) - 1 + (ci === 0 ? 1 - ss(tc - .5, tc - .05, u) : 0)); kk += [...c].length + (o.colPause ?? 3); });
  const px = size * .34, x1 = o.x + size * .5 + px, x0 = o.x - Math.max(0, shown) * gap - size * .5 - px, y0 = o.y - size * .3, n0 = [...o.cols[0]].length, roll = easeOut(clamp((u - o.t0 + .25) / (n0 * rate * .8 + .5))), h = (ml * lead) * (.12 + .88 * roll) + size * .5;
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = a;
  g.fillStyle = 'rgba(30,26,22,.16)'; g.fillRect(x0 + 5, y0 + 6, x1 - x0, h);
  g.fillStyle = SLIP; g.fillRect(x0, y0, x1 - x0, h);
  g.strokeStyle = LINE; g.lineWidth = o.big ? 2 : 1.2; g.strokeRect(x0, y0, x1 - x0, h);
  if (o.big) { g.lineWidth = 1; g.strokeRect(x0 + 5, y0 + 5, x1 - x0 - 10, h - 10); }
  g.restore();
  vtext(g, u, o);
}
const poem = (g, u, o) => say(g, u, Object.assign({ font: F.brush, size: 62, gap: 96, rate: .2, fd: .9, big: true }, o));
const narr = (g, u, o) => say(g, u, Object.assign({ font: F.song, size: 33, gap: 50, rate: .065, fd: .7 }, o));

/* ---------- 数目字 ---------- */
function cn(n) {
  n = Math.round(n); if (n <= 0) return '〇';
  const d = '零一二三四五六七八九', u = ['', '十', '百', '千', '万'];
  let s = '', str = String(n), zero = false;
  for (let i = 0; i < str.length; i++) { const k = +str[i], p = str.length - 1 - i; if (k === 0) { zero = true; continue; } if (zero && s) s += '零'; zero = false; s += d[k] + u[p]; }
  if (n >= 10 && n < 20) s = s.slice(1);
  return s;
}

/* ---------- 新道具 ---------- */
function drawBags(g, x, y, s, fill, a = 1) { // 两只布囊；fill 0..1 鼓起来
  g.save(); g.translate(x, y); g.scale(s, s); g.globalAlpha *= a; g.lineJoin = 'round';
  for (const [ox, k] of [[-58, 1], [58, .94]]) {
    const f = .35 + .65 * fill, bw = 46 * k * (.8 + .3 * f), bh = 96 * k * (.62 + .38 * f);
    suFillStroke(g, ['M', ox - bw, 0, 'Q', ox - bw * 1.25, -bh * .55, ox - bw * .42, -bh, 'L', ox + bw * .42, -bh, 'Q', ox + bw * 1.25, -bh * .55, ox + bw, 0, 'Z'], 'rgb(214,198,160)', 2.2);
    suFillStroke(g, ['M', ox - bw * .5, -bh, 'Q', ox, -bh - 26, ox + bw * .5, -bh, 'Q', ox, -bh + 8, ox - bw * .5, -bh, 'Z'], 'rgb(196,178,140)', 1.8);
    suStroke(g, ['M', ox - bw * .44, -bh + 2, 'L', ox + bw * .44, -bh + 2], 3.4, 'rgb(60,50,40)');
    for (let i = 0; i < 4; i++) suStroke(g, ['M', ox - bw * (.6 - i * .35), -bh * .82, 'Q', ox - bw * (.75 - i * .42), -bh * .4, ox - bw * (.62 - i * .36), -6], 1.1, 'rgba(60,50,40,.6)');
  }
  g.restore();
}
function drawSheets(g, x, y, s, u, n, a = 1) { // 一页页日记落进囊中
  g.save(); g.globalAlpha *= a;
  for (let i = 0; i < n; i++) {
    const ph = ((u * .42 + i / n) % 1), fx = x + (hash2(i, 1, 9) - .5) * 150 * s + Math.sin(ph * 6 + i) * 16 * s, fy = y - 330 * s + ph * 250 * s, rot = (hash2(i, 2, 9) - .5) * 1.2 + ph * 1.4;
    g.save(); g.translate(fx, fy); g.rotate(rot); g.globalAlpha = a * Math.sin(ph * Math.PI);
    g.fillStyle = 'rgb(236,226,200)'; g.strokeStyle = 'rgb(40,34,28)'; g.lineWidth = 1.6; g.fillRect(-17 * s, -24 * s, 34 * s, 48 * s); g.strokeRect(-17 * s, -24 * s, 34 * s, 48 * s);
    g.lineWidth = 1; for (let k = -1; k <= 1; k++) { g.beginPath(); g.moveTo(k * 9 * s, -17 * s); g.lineTo(k * 9 * s, 14 * s); g.stroke(); }
    g.restore();
  }
  g.restore();
}
function drawDossier(g, x, y, s, a = 1) { // 案卷
  g.save(); g.translate(x, y); g.scale(s, s); g.globalAlpha *= a;
  g.fillStyle = 'rgba(30,26,22,.25)'; g.fillRect(-146, -206, 300, 420);
  for (let i = 3; i >= 0; i--) { g.fillStyle = i ? 'rgb(208,192,152)' : 'rgb(226,212,176)'; g.strokeStyle = 'rgb(34,30,26)'; g.lineWidth = 2.4; g.fillRect(-150 - i * 5, -210 - i * 5, 300, 420); g.strokeRect(-150 - i * 5, -210 - i * 5, 300, 420); }
  g.lineWidth = 1.2; g.strokeRect(-132, -192, 264, 384);
  for (let k = 1; k < 5; k++) { g.beginPath(); g.moveTo(-132 + k * 52.8, -192); g.lineTo(-132 + k * 52.8, 192); g.stroke(); }
  g.fillStyle = 'rgb(34,30,26)'; for (let k = 0; k < 4; k++) g.fillRect(-152, -150 + k * 96, 10, 4);
  g.restore();
}
function drawCamels(g, x, y, s, t, n, a = 1) { // 驼队剪影
  g.save(); g.globalAlpha *= a;
  for (let i = 0; i < n; i++) {
    const cx = x + i * 150 * s, bob = Math.sin(t * 2.2 + i * 1.3) * 2 * s, sw = Math.sin(t * 2.2 + i * 1.3);
    g.save(); g.translate(cx, y + bob); g.scale(s, s);
    for (const [lx, ph] of [[-34, 0], [-22, 1.6], [26, 3.1], [38, 4.7]]) suStroke(g, ['M', lx, -52, 'L', lx + Math.sin(t * 2.2 + ph + i) * 7, -26, 'L', lx + Math.sin(t * 2.2 + ph + i) * 10 - 2, 0], 6, 'rgb(72,58,42)');
    suFillStroke(g, ['M', -46, -56, 'Q', -50, -84, -30, -88, 'Q', -22, -112, -10, -90, 'Q', 4, -84, 12, -92, 'Q', 22, -114, 34, -88, 'Q', 50, -82, 48, -56, 'Q', 0, -44, -46, -56, 'Z'], 'rgb(132,104,72)', 2);
    suFillStroke(g, ['M', -42, -72, 'Q', -62, -78, -66, -112, 'Q', -68, -128, -84, -126, 'L', -92, -118, 'L', -78, -112, 'Q', -72, -84, -50, -60, 'Z'], 'rgb(132,104,72)', 2);
    suFillStroke(g, ['M', -16, -96, 'L', 20, -96, 'L', 26, -70, 'L', -22, -70, 'Z'], 'rgb(196,178,140)', 1.8);
    suStroke(g, ['M', 48, -66, 'Q', 58, -56 + sw * 3, 54, -40], 2.2, 'rgb(72,58,42)');
    g.restore();
    if (i < n - 1) { g.strokeStyle = 'rgba(40,34,28,.8)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(cx + 48 * s, y - 64 * s); g.quadraticCurveTo(cx + 60 * s, y - 80 * s, cx + (150 - 86) * s, y - 122 * s); g.stroke(); }
  }
  g.restore();
}
function sunDisc(g, x, y, R, a = 1) { g.save(); g.globalAlpha *= a; g.strokeStyle = rgba(INK, .85); g.lineWidth = 2.4; g.beginPath(); g.arc(x, y, R, 0, TAU); g.stroke(); g.fillStyle = 'rgba(178,54,42,.9)'; g.beginPath(); g.arc(x, y, R - 5, 0, TAU); g.fill(); g.restore(); }
function ground(g, y, a, seed, n = 90) { // 地面排线
  const r = rng(seed); g.save(); g.globalAlpha *= a; g.strokeStyle = rgba(INK, .7); g.lineCap = 'round';
  g.lineWidth = 2.2; g.beginPath(); g.moveTo(-300, y); g.lineTo(W + 300, y); g.stroke();
  for (let i = 0; i < n; i++) { const x = -200 + r() * (W + 400), yy = y + 8 + r() * r() * 70, L = 20 + r() * 110; g.lineWidth = .9 + r() * 1.2; g.globalAlpha = a * (.3 + r() * .5); g.beginPath(); g.moveTo(x, yy); g.lineTo(x + L, yy + (r() - .5) * 2); g.stroke(); }
  g.restore();
}
function clouds(g, u, y, a, seed, n = 4) { // 勾云
  const r = rng(seed); g.save(); g.globalAlpha *= a; g.strokeStyle = rgba(INK, .6); g.lineWidth = 1.6; g.lineCap = 'round';
  for (let i = 0; i < n; i++) { const x = ((r() * (W + 600) + u * (6 + r() * 6)) % (W + 600)) - 300, yy = y + (r() - .5) * 150, sc = .8 + r() * .9;
    for (let k = 0; k < 3; k++) { const ox = x + (k - 1) * 70 * sc, oy = yy + (k % 2) * 16 * sc; g.beginPath(); g.moveTo(ox - 70 * sc, oy); g.bezierCurveTo(ox - 60 * sc, oy - 34 * sc, ox - 14 * sc, oy - 40 * sc, ox, oy - 14 * sc); g.bezierCurveTo(ox + 10 * sc, oy - 36 * sc, ox + 56 * sc, oy - 30 * sc, ox + 64 * sc, oy); g.stroke(); }
    g.beginPath(); g.moveTo(x - 150 * sc, yy + 6 * sc); g.lineTo(x + 150 * sc, yy + 6 * sc); g.stroke(); }
  g.restore();
}

function snowLine(m) { const g = m.c.getContext('2d'); if (m.ov) { g.save(); g.globalAlpha = .5; g.drawImage(m.ov, 0, 0); g.restore(); } return m; }
function paperSnow(g, t, alpha, seed, n = 260, wind = 60) {
  if (alpha <= 0) return; const r = rng(seed); g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.beginPath(); g.rect(AX0, AY0, AX1 - AX0, AY1 - AY0); g.clip(); g.fillStyle = 'rgb(240,228,196)';
  for (let i = 0; i < n; i++) { const x0 = r() * (W + 300) - 150, y0 = r() * H, v = 60 + r() * 110, sz = 1.6 + r() * 3, ph = r() * TAU;
    const y = (y0 + t * v) % (H + 20) - 10, x = x0 - t * wind * (.6 + r() * .8) % (W + 300) + Math.sin(t * 1.3 + ph) * 14;
    g.globalAlpha = alpha * (.6 + r() * .4); g.beginPath(); g.arc(((x % (W + 300)) + W + 300) % (W + 300) - 150, y, sz, 0, TAU); g.fill(); }
  g.restore();
}


/* ============================================================
   《河海昆仑》分场 —— 裴景福戍途
   ============================================================ */
const OCHRE = [150, 118, 76];
function snowCap(m, depth, a = .9) { // 给山脊加雪（逐像素，避免延迟绘制堆积）
  const g = m.c.getContext('2d'), w = m.c.width, h = m.c.height, img = g.getImageData(0, 0, w, h), d = img.data;
  for (let x = 0; x < w; x++) {
    const y0 = Math.max(0, Math.floor(m.ridge[x]) - 3), dep = depth * .62 * (.45 + 1.1 * vn(x / 26, 1, 77));
    for (let y = y0; y < Math.min(h, y0 + dep + 3); y++) {
      const i = (y * w + x) * 4; if (!d[i + 3]) continue;
      const k = a * (1 - (y - y0) / (dep + 3)) * (.75 + .25 * vn(x / 9, y / 9, 78));
      d[i] = d[i] + (250 - d[i]) * k; d[i + 1] = d[i + 1] + (247 - d[i + 1]) * k; d[i + 2] = d[i + 2] + (238 - d[i + 2]) * k; d[i + 3] = Math.min(255, d[i + 3] + 40 * k);
    }
  }
  g.putImageData(img, 0, 0); return m;
}
function snow(g, t, alpha, seed, n = 260, wind = 60) {
  if (alpha <= 0) return; const r = rng(seed); g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = 'rgb(250,247,238)';
  for (let i = 0; i < n; i++) { const x0 = r() * (W + 300) - 150, y0 = r() * H, v = 60 + r() * 110, sz = 1.2 + r() * 2.6, ph = r() * TAU;
    const y = (y0 + t * v) % (H + 20) - 10, x = x0 - t * wind * (.6 + r() * .8) % (W + 300) + Math.sin(t * 1.3 + ph) * 14;
    g.globalAlpha = alpha * (.45 + r() * .5); g.beginPath(); g.arc(((x % (W + 300)) + W + 300) % (W + 300) - 150, y, sz, 0, TAU); g.fill(); }
  g.restore();
}
function stars(g, t, alpha, seed, n = 150, ymax = 560) {
  if (alpha <= 0) return; const r = rng(seed); g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < n; i++) { const x = r() * W, y = r() * ymax, sz = .8 + r() * r() * 2.4, tw = .6 + .4 * Math.sin(t * (1 + r() * 2) + r() * 9);
    g.globalAlpha = alpha * tw * (1 - y / ymax * .6); g.beginPath(); g.arc(x, y, sz, 0, TAU); g.fill(); }
  g.restore();
}
function earthWall(g, x0, y0, x1, y1, h, a = 1, towers = []) { // 夯土长城
  g.save(); g.globalAlpha *= a;
  const gr = g.createLinearGradient(0, Math.min(y0, y1), 0, Math.max(y0, y1) + h); gr.addColorStop(0, 'rgba(128,102,68,.95)'); gr.addColorStop(1, 'rgba(128,102,68,.35)');
  g.fillStyle = gr; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.lineTo(x1, y1 + h); g.lineTo(x0, y0 + h); g.fill();
  g.fillStyle = 'rgba(96,74,48,.95)'; const n = Math.floor(Math.abs(x1 - x0) / 30);
  for (let i = 0; i < n; i++) { if (hash2(i, 3, 5) < .25) continue; const k = i / n; g.fillRect(lerp(x0, x1, k), lerp(y0, y1, k) - 9, 17, 10); }
  for (const k of towers) { const x = lerp(x0, x1, k), y = lerp(y0, y1, k); g.fillStyle = 'rgba(112,88,58,.98)'; g.beginPath(); g.moveTo(x - 34, y + h); g.lineTo(x - 24, y - 46); g.lineTo(x + 24, y - 46); g.lineTo(x + 34, y + h); g.fill(); g.fillStyle = 'rgba(80,60,38,.95)'; g.fillRect(x - 26, y - 54, 12, 9); g.fillRect(x - 6, y - 54, 12, 9); g.fillRect(x + 14, y - 54, 12, 9); }
  g.restore();
}
function drawPeach(g, x, y, s, p, seed, t) {
  const r = rng(seed); g.save(); g.translate(x, y); g.scale(s, s); g.lineCap = 'round';
  suStroke(g, ['M', 0, 0, 'C', -4, -30, 6, -50, 0, -78], 7, 'rgb(60,50,42)');
  for (let b = 0; b < 5; b++) { const a = -2.4 + b * .42 + (r() - .5) * .2, L = 46 + r() * 36, bx = Math.cos(a) * L, by = -78 + Math.sin(a) * L; suStroke(g, ['M', 0, -76, 'Q', bx * .5, by - 8, bx, by], 3, 'rgb(60,50,42)');
    for (let k = 0; k < 12; k++) { const q = r(), fx = bx * (.3 + q * .8) + (r() - .5) * 26, fy = lerp(-76, by, .3 + q * .8) + (r() - .5) * 22, o = easeOut((p - r() * .7) / .3); if (o <= 0) continue; g.fillStyle = `rgba(214,112,128,${.5 + r() * .35})`; g.beginPath(); g.arc(fx, fy, (3 + r() * 3.5) * o, 0, TAU); g.fill(); } }
  g.restore();
}
function tufts(g, arr, a) { g.save(); g.strokeStyle = rgba(INK, .5 * a); g.lineWidth = 1.2; g.lineCap = 'round'; for (const [x, y, s] of arr) for (let k = -3; k <= 3; k++) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + k * 3.2 * s, y - (10 - Math.abs(k) * 1.6) * s); g.stroke(); } g.restore(); }

/* ====== 接合：把旧片画法接到工坊（手写） ====== */
/* 用法（画心在左，题签栏在右）：
   page(t, a, b, (G,u)=>{ 画面：用水墨包的山、人、道具，画完自动过刻版 }, { text:(G,u)=>{ 题签纸条：narr / poem / say }, fx:true, first, last })
     —— 相邻两页不用自己留重叠，新的一页从右向左揭开
   plate(t, { chapter:{glyph:'辩', place:'梅关 吉安', date:'光绪三十一年四五月', t0}, count:{a:'第十九日', b:'行约九百里', p:0.08, marks:[0,.58,.7,1]}, title:'河海昆仑录' })
     —— 版框和右侧题签栏，放在所有 page 之后
   counter(t, [[时刻, 日数, 里数], ...]) → {day, li, done}；cn(1234) → 一千二百三十四
   画面里的山用 mountainLined()（带轮廓线和皴，刻版才有线可依）；人物放大 FIG 倍更合适 */
const easeInOut = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
let NEWS = null;
function paperNews() { // 旧报纸底
  if (NEWS) return NEWS; const c = makePaper(), g = c.getContext('2d');
  g.fillStyle = 'rgba(214,190,138,.42)'; g.fillRect(0, 0, W, H);
  const r = rng(31);
  for (let i = 0; i < 80; i++) { const x = r() * W, y = r() * H, R2 = 6 + r() * 44; const gr = g.createRadialGradient(x, y, 0, x, y, R2); gr.addColorStop(0, 'rgba(150,104,52,.10)'); gr.addColorStop(1, 'rgba(150,104,52,0)'); g.fillStyle = gr; g.fillRect(x - R2, y - R2, 2 * R2, 2 * R2); }
  return NEWS = c;
}
function mountainLined(o) { // 山：补轮廓线与披麻皴
  const m = mountain(o), w = m.c.width, ov = mk(w, m.c.height), g = ov.getContext('2d'), r = rng(o.seed * 7 + 3), rd = m.ridge;
  const strong = o.col === INK ? .95 : .8;
  g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
  g.strokeStyle = rgba(INK, strong); g.lineWidth = o.col === INK ? 2.6 : 2;
  g.beginPath(); for (let x = 0; x < w; x += 2) x ? g.lineTo(x, rd[x]) : g.moveTo(x, rd[x]); g.stroke();
  const n = Math.round(w / (o.col === INK ? 9 : 15)), fade = o.fade;
  for (let i = 0; i < n; i++) {
    const x = 4 + r() * (w - 8), xi = Math.floor(x), sl = (rd[Math.min(w - 1, xi + 6)] - rd[Math.max(0, xi - 6)]) / 12;
    const y0 = rd[xi] + 3 + Math.pow(r(), 1.6) * fade * .7, L = 14 + r() * fade * .32, dir = sl > 0 ? 1 : -1, lean = .25 + Math.min(1.1, Math.abs(sl)) * .6;
    g.strokeStyle = rgba(INK, (.35 + r() * .45) * strong * Math.max(.15, 1 - (y0 - rd[xi]) / (fade * 1.1))); g.lineWidth = .9 + r() * .9;
    g.beginPath(); g.moveTo(x, y0); g.quadraticCurveTo(x + dir * L * lean * .5, y0 + L * .5, x + dir * L * lean, y0 + L); g.stroke();
  }
  g.restore(); m.c.getContext('2d').drawImage(ov, 0, 0); m.ov = ov; return m;
}
function page(t, a, b, draw, o = {}) {
  const b2 = o.last ? b : b + 1; if (t < a || t >= b2) return;
  if (!FXC) engraveInit();
  layer(t, a, b2, draw, { alpha: 1, fx: o.fx === false ? null : engrave, text: o.text, out: buf => {
    const p = o.first ? 1 : easeInOut(clamp((t - a) / 1.0)), edge = lerp(AX1, AX0, p);
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.beginPath(); g.rect(edge, AY0, AX1 - edge, AY1 - AY0); g.clip();
    if (p < 1) g.drawImage(paperNews(), 0, 0);
    g.globalAlpha = o.first ? ss(0, .8, t - a) : o.last ? 1 - ss(b - 2.5, b - .2, t) : 1;
    g.drawImage(buf, 0, 0); g.restore();
    if (p < 1 && p > 0) { g.save(); const gr = g.createLinearGradient(edge - 70, 0, edge, 0); gr.addColorStop(0, 'rgba(30,26,22,0)'); gr.addColorStop(1, 'rgba(30,26,22,.34)'); g.fillStyle = gr; g.fillRect(edge - 70, AY0, 70, AY1 - AY0); g.fillStyle = LINE; g.fillRect(edge - 1.5, AY0, 3, AY1 - AY0); g.restore(); }
  } });
}
function counter(t, KF) {
  if (!KF.length || t < KF[0][0]) return null;
  const L = KF[KF.length - 1]; if (t >= L[0]) return { day: L[1], li: L[2], done: true };
  let i = 1; while (KF[i][0] < t) i++;
  const a = KF[i - 1], b = KF[i], k = (t - a[0]) / (b[0] - a[0]);
  return { day: lerp(a[1], b[1], k), li: lerp(a[2], b[2], k), done: false };
}
function plate(t, o = {}) {
  const c = g; c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
  c.fillStyle = SLIP; c.fillRect(HX0, AY0, HX1 - HX0, AY1 - AY0);
  c.strokeStyle = LINE; c.lineWidth = 5; c.strokeRect(46, 46, W - 92, H - 92); c.lineWidth = 1.4; c.strokeRect(AX0, AY0, HX1 - AX0, AY1 - AY0);
  c.beginPath(); c.moveTo(HX0, AY0); c.lineTo(HX0, AY1); c.stroke();
  const M = o.chapter;
  if (M) { const u = t - (M.t0 ?? 0);
    if (M.glyph) vtext(c, u, { t0: 0, cols: [M.glyph], x: HCX, y: 88, size: 112, font: F.brush, rate: .1, fd: .7 });
    c.strokeStyle = LINE; c.lineWidth = 1.2; c.beginPath(); c.moveTo(HX0 + 22, 232); c.lineTo(HX1 - 22, 232); c.stroke();
    if (M.place) vtext(c, u, { t0: .4, cols: [M.place], x: HCX + 26, y: 256, size: 38, lead: 1.18, font: F.songb, rate: .12, fd: .6 });
    if (M.date) vtext(c, u, { t0: .7, cols: [M.date], x: M.place ? HCX - 32 : HCX, y: 260, size: 32, lead: 1.14, font: F.song, rate: .04, fd: .5, color: SEAL }); }
  c.strokeStyle = LINE; c.lineWidth = 1.2; c.beginPath(); c.moveTo(HX0 + 22, 600); c.lineTo(HX1 - 22, 600); c.stroke();
  const k = o.count;
  if (k) {
    const a = k.alpha ?? 1;
    if (k.a) vtext(c, 9, { t0: 0, cols: [k.a], x: HCX + 30, y: 620, size: 32, lead: 1.12, font: F.song, fd: .01, color: SEAL, alpha: a });
    if (k.b) vtext(c, 9, { t0: 0, cols: [k.b], x: HCX - 30, y: 620, size: 32, lead: 1.12, font: F.song, fd: .01, color: k.done ? SEAL : INKS, alpha: a });
    if (k.p != null) { const x0 = HX1 - 26, x1 = HX0 + 26, y = 990, p = clamp(k.p);   // 行程线：右起左止
      c.globalAlpha = a; c.strokeStyle = LINE; c.lineWidth = 1.4; c.beginPath(); c.moveTo(x0, y); c.lineTo(x1, y); c.stroke();
      for (const q of (k.marks || [0, 1])) { const x = lerp(x0, x1, q); c.beginPath(); c.moveTo(x, y - 5); c.lineTo(x, y + 5); c.stroke(); }
      c.strokeStyle = SEAL; c.lineWidth = 3.2; c.beginPath(); c.moveTo(x0, y); c.lineTo(lerp(x0, x1, p), y); c.stroke();
      c.fillStyle = SEAL; c.beginPath(); c.arc(lerp(x0, x1, p), y, 5.5, 0, TAU); c.fill(); c.globalAlpha = 1; }
  } else if (o.title) vtext(c, 9, { t0: 0, cols: [o.title], x: HCX, y: 630, size: 32, lead: 1.3, font: F.song, fd: .01, alpha: .8 });
  c.restore();
}
addTheme('litho', { light: true, ink: INKS, dim: 'rgba(29,27,24,.62)', note: 'rgba(29,27,24,.8)', a1: SEAL, a2: INKS, a3: 'rgb(62,88,118)', chip: 'rgba(29,27,24,.06)',
  sub: 'rgba(233,216,174,.95)', subInk: INKS, top: '#e6d6ae', bot: '#d9c595', card: 'rgba(233,216,174,.95)', cardInk: INKS, pillInk: '#f3ead6', hl: 'rgba(168,50,43,.25)',
  f: { t: 'SongB', b: 'SongB', s: 'Song', h: 'Brush', n: 'RC' },
  bg(t) { g.drawImage(paperNews(), 0, 0); }, post(t) { g.drawImage(vignette(), 0, 0); } });
// 日期题：日期小字加大到 32
dateHead = function (g, u, t0, place, date, dark = false, num = '') {
  const col = dark ? PAPERS : INKS;
  if (num) vtext(g, u, { t0, cols: [num], x: 1800, y: 92, size: 96, font: F.brush, color: col, fd: 1.2, wet: !dark });
  vtext(g, u, { t0: t0 + (num ? .5 : 0), cols: [place], x: 1800, y: num ? 226 : 100, size: num ? 46 : 72, lead: num ? 1.3 : 1.12, font: num ? F.songb : F.brush, color: col, rate: .2, fd: 1.1, wet: !num && !dark });
  vtext(g, u, { t0: t0 + .9, cols: [date], x: 1734, y: num ? 232 : 106, size: 32, lead: 1.16, font: F.song, color: dark ? '#d4796b' : SEAL, rate: .05, fd: .7 });
};

return {drawCart, drawGunboat, makeFort, drawBigWillow, dateHead, AX0, AX1, AY0, AY1, HX0, HX1, HCX, SLIP, LINE, FXC, FXG, WOB, FIG, engraveInit, _D, _K, engrave, say, poem, narr, cn, drawBags, drawSheets, drawDossier, drawCamels, sunDisc, ground, clouds, snowLine, paperSnow, OCHRE, snowCap, snow, stars, earthWall, drawPeach, tufts, easeInOut, NEWS, paperNews, mountainLined, page, counter, plate};
})();
