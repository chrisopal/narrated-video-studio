/* 风格包 · 宋式水墨（引擎）—— 出自《东坡》，《河海昆仑录》《王钟儿》共用
   画法出自本项目的旧片《东坡》；这个文件就是源码，直接在这里改。 */
window.PACK=window.PACK||{};window.PACK_INIT=window.PACK_INIT||[];
PACK.ink=(function(){

const TAU = Math.PI * 2;
const INK = [29, 27, 24], TQ = [78, 108, 104], ZHE = [120, 88, 58];
const INKS = 'rgb(29,27,24)', PAPERS = 'rgb(236,228,210)';
const SEAL = '#a8322b', ROUGE = 'rgb(186,72,78)', LYCHEE = '#b3372a';
const F = {
  brush: '"Brush", KT, serif',
  cao: '"Cao", "Brush", KT, cursive',
  song: 'Song, "Noto Serif CJK SC", "Songti SC", serif',
  songb: 'SongB, "Noto Serif CJK SC", "Songti SC", serif'
};

/* ---------- 数学与噪声 ---------- */
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const ss = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const env = (t, a, b, fi = 1.5, fo = 1.5) => ss(a, a + fi, t) * (1 - ss(b - fo, b, t));
const easeOut = x => 1 - Math.pow(1 - clamp(x), 3);
function rng(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function hash2(x, y, s) { let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 1442695041)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
function vn(x, y, s) { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi; const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf); const a = hash2(xi, yi, s), b = hash2(xi + 1, yi, s), c = hash2(xi, yi + 1, s), d = hash2(xi + 1, yi + 1, s); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }
function fbm(x, y, s, o = 4) { let v = 0, a = .5, f = 1, n = 0; for (let i = 0; i < o; i++) { v += a * vn(x * f, y * f, s + i * 31); n += a; f *= 2.03; a *= .5; } return v / n; }
function mk(w, h) { const c = document.createElement('canvas'); c.width = Math.ceil(w); c.height = Math.ceil(h); return c; }
const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

/* ---------- 宣绢底 ---------- */
function makePaper() {
  const c = mk(W, H), g = c.getContext('2d'), img = g.createImageData(W, H), d = img.data;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const low = fbm(x / 520, y / 520, 7, 3), mid = vn(x / 38, y / 38, 9), fine = hash2(x, y, 3);
    const weave = Math.sin(x * 1.7) * Math.sin(y * 1.9);
    const fiber = vn(x / 90, y / 2.2, 5);
    let k = 1 - .055 * low - .022 * mid - .02 * fine + .008 * weave - .018 * Math.max(0, fiber - .6);
    const i = (y * W + x) * 4;
    d[i] = 238 * k; d[i + 1] = 229 * k; d[i + 2] = 209 * k * (1 - .02 * low); d[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  // 旧绢斑痕
  const r = rng(77);
  for (let i = 0; i < 14; i++) {
    const x = r() * W, y = r() * H, R = 60 + r() * 260;
    const gr = g.createRadialGradient(x, y, 0, x, y, R);
    gr.addColorStop(0, 'rgba(160,120,70,0.035)'); gr.addColorStop(1, 'rgba(160,120,70,0)');
    g.fillStyle = gr; g.fillRect(x - R, y - R, 2 * R, 2 * R);
  }
  return c;
}
function makeVignette() {
  const c = mk(W, H), g = c.getContext('2d');
  const gr = g.createRadialGradient(W / 2, H / 2, H * .35, W / 2, H / 2, H * 1.05);
  gr.addColorStop(0, 'rgba(80,58,30,0)'); gr.addColorStop(1, 'rgba(80,58,30,0.26)');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  return c;
}

/* ---------- 山：墨分五色、米点、远山青 ---------- */
function mountain(o) {
  const w = o.w || W + 400, h = H, c = mk(w, h), g = c.getContext('2d');
  const img = g.createImageData(w, h), d = img.data, ridge = new Float32Array(w);
  let top = h;
  for (let x = 0; x < w; x++) {
    let p = 0; for (const k of o.peaks || []) p += k.h * Math.exp(-Math.pow((x - k.x) / k.w, 2));
    const n = fbm(x / o.scale, .5, o.seed, 5), j = fbm(x / 22, 3.3, o.seed + 5, 3);
    ridge[x] = o.base - o.amp * n - p - (j - .5) * (o.jag ?? 14);
    top = Math.min(top, ridge[x]);
  }
  const col = o.col, fade = o.fade, al = o.alpha, edge = o.edge ?? .4, fold = o.fold ?? 30;
  for (let y = Math.max(0, Math.floor(top)); y < h; y++) for (let x = 0; x < w; x++) {
    const dy = y - ridge[x]; if (dy < 0) continue;
    let a = al * (Math.exp(-dy / fade) * .82 + .18 * Math.exp(-dy / (fade * 4)));
    a += edge * al * Math.exp(-dy / 2.6);
    for (let k = 1; k <= 3; k++) {
      const rk = ridge[x] + k * fold + (fbm(x / (o.scale * .35), k * 7.1, o.seed + 40, 3) - .5) * fold * 1.6;
      const dd = Math.abs(y - rk);
      if (dd < 10) a += edge * al * .55 * Math.exp(-dd / 2.2) * Math.exp(-(k - 1) * .35) * vn(x / 40, k * 3, o.seed + 60);
    }
    a *= .5 + .5 * fbm(x / 70, y / 55, o.seed + 9, 3) + .3 * (vn(x / 4, y / 26, o.seed + 19) - .5) + .25 * (vn(x / 30, y / 9, o.seed + 29) - .5);
    const i = (y * w + x) * 4;
    d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = clamp(a) * 255;
  }
  g.putImageData(img, 0, 0);
  const r = rng(o.seed * 13 + 1);
  // 米点皴
  for (let i = 0; i < (o.dots || 0); i++) {
    const x = r() * w, rx = ridge[Math.floor(x)], y = rx + Math.pow(r(), 1.8) * fade * .9 + 3;
    const aa = (.12 + r() * .3) * al * 1.4, ww = 3 + r() * 7;
    for (let k = 0; k < 3; k++) { g.fillStyle = rgba(col, aa * (1 - k * .25)); g.beginPath(); g.ellipse(x + (r() - .5) * ww, y + (r() - .5) * 3, ww * (.5 + r() * .6), 1.4 + r() * 2.2, (r() - .5) * .25, 0, TAU); g.fill(); }
  }
  // 山顶松林
  for (let i = 0; i < (o.trees || 0); i++) {
    const x = r() * w, y = ridge[Math.floor(x)] + 3, th = 7 + r() * 13;
    dotTree(g, x, y, th, col, .5 * al + .3, r);
  }
  if (o.blur) { const c2 = mk(w, h), g2 = c2.getContext('2d'); g2.filter = `blur(${o.blur}px)`; g2.drawImage(c, 0, 0); return { c: c2, ridge }; }
  return { c, ridge };
}

function dotTree(g, x, y, th, col, a, r) {
  g.strokeStyle = rgba(col, a); g.lineWidth = 1.1; const tx = x + (r() - .5) * 4;
  g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + (r() - .5) * 3, y - th * .5, tx, y - th); g.stroke();
  const n = 7 + Math.floor(r() * 6), R = th * .42;
  for (let k = 0; k < n; k++) { const an = r() * TAU, d = Math.sqrt(r()) * R; g.fillStyle = rgba(col, a * (.45 + r() * .55)); g.beginPath(); g.ellipse(tx + Math.cos(an) * d * 1.3, y - th + Math.sin(an) * d * .8, 1.6 + r() * 2.2, 1 + r() * 1.3, (r() - .5) * .6, 0, TAU); g.fill(); }
}
/* ---------- 缓冲区 ---------- */
let CTX, PAPER, VIGN, MASK, BUF = [];
function revealDraw(g, img, dx, dy, p, seed, dw, dh) {
  if (p <= 0) return;
  const w = dw ?? img.width, h = dh ?? img.height;
  if (p >= 1) { g.drawImage(img, dx, dy, w, h); return; }
  const mg = MASK.getContext('2d'), T = g.getTransform();
  mg.setTransform(1, 0, 0, 1, 0, 0); mg.globalCompositeOperation = 'source-over'; mg.globalAlpha = 1; mg.clearRect(0, 0, W, H);
  mg.setTransform(T);
  const r = rng(seed);
  for (let i = 0; i < 11; i++) {
    const cx = dx + r() * w, cy = dy + (.35 + .65 * r()) * h, st = r() * .4;
    const q = easeOut((p - st) / (1 - st)); if (q <= 0) continue;
    const R = q * (.3 + .45 * r()) * Math.max(w, h);
    const gr = mg.createRadialGradient(cx, cy, 0, cx, cy, R);
    gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(.62, 'rgba(0,0,0,.95)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    mg.fillStyle = gr; mg.fillRect(cx - R, cy - R, 2 * R, 2 * R);
  }
  mg.fillStyle = `rgba(0,0,0,${Math.pow(p, 3)})`; mg.fillRect(dx, dy, w, h);
  mg.globalCompositeOperation = 'source-in'; mg.drawImage(img, dx, dy, w, h);
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(MASK, 0, 0); g.restore();
}
function cam(g, u, L, o = {}) {
  const k = u / L;
  const z = lerp(o.z0 ?? 1, o.z1 ?? 1.05, k), x = lerp(o.x0 ?? 0, o.x1 ?? 0, k), y = lerp(o.y0 ?? 0, o.y1 ?? 0, k);
  g.setTransform(z, 0, 0, z, W / 2 - W / 2 * z + x, H / 2 - H / 2 * z + y);
}
function mist(g, u, bands) {
  g.save(); g.globalCompositeOperation = 'destination-out';
  for (const b of bands) {
    const x = b.x + u * (b.v || 0);
    g.save(); g.translate(x, b.y); g.scale(1, b.sy || .18);
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, b.r);
    gr.addColorStop(0, `rgba(0,0,0,${b.a})`); gr.addColorStop(.55, `rgba(0,0,0,${b.a * .6})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(-b.r, -b.r, 2 * b.r, 2 * b.r); g.restore();
  }
  g.restore();
}

/* ---------- 书写：竖排、右起 ---------- */
const GLYPH = new Map();
function glyph(ch, font, size, col, wet) {
  const key = ch + '|' + font + '|' + col + '|' + !!wet; let c = GLYPH.get(key); if (c) return c;
  const pad = Math.ceil(size * .3), S = Math.ceil(size * 1.3) + pad * 2; c = mk(S, S);
  const g = c.getContext('2d'); g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = col;
  if (wet) { g.save(); g.globalAlpha = .24; g.filter = `blur(${Math.max(2, size / 28)}px)`; g.fillText(ch, S / 2, S / 2); g.restore(); }
  g.fillText(ch, S / 2, S / 2); GLYPH.set(key, c); return c;
}
function vtext(g, t, o) {
  const size = o.size, lead = size * (o.lead ?? 1.12), gap = o.gap ?? size * 1.5;
  const rate = o.rate ?? .09, fd = o.fd ?? .9, col = o.color || INKS;
  const out = o.t1 != null ? 1 - ss(o.t1 - (o.fo ?? 1.2), o.t1, t) : 1;
  if (t < o.t0 || out <= 0) return;
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
  g.font = `${o.weight || ''} ${size}px ${o.font || F.song}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  let k = 0;
  o.cols.forEach((colText, ci) => {
    const chars = [...colText]; let y = o.y;
    const cc = (o.colColors && o.colColors[ci]) || col;
    chars.forEach(ch => {
      const tc = o.t0 + k * rate; k++;
      if (ch === ' ') { y += lead * .45; return; }
      const a = ss(tc, tc + fd, t) * out * (o.alpha ?? 1);
      if (a > .003) {
        const x = o.x - ci * gap, cy = y + size / 2;
        g.globalAlpha = a; g.fillStyle = cc; g.strokeStyle = cc;
        if (ch === '—') { g.lineWidth = Math.max(1, size * .06); g.beginPath(); g.moveTo(x, cy - lead * .42); g.lineTo(x, cy + lead * .42); g.stroke(); }
        else if (ch === '·') { g.beginPath(); g.arc(x, cy, size * .07, 0, TAU); g.fill(); }
        else {
          const grow = 1 - ss(tc, tc + fd, t), gc = glyph(ch, g.font, size, cc, o.wet);
          if (grow > .02) { g.save(); g.filter = `blur(${(grow * 5).toFixed(2)}px)`; g.translate(x, cy); g.scale(1 + grow * .07, 1 + grow * .07); g.drawImage(gc, -gc.width / 2, -gc.height / 2); g.restore(); }
          else g.drawImage(gc, x - gc.width / 2, cy - gc.height / 2);
        }
      }
      y += ch === '·' ? lead * .6 : lead;
    });
    k += o.colPause ?? 3;
  });
  g.restore();
}
// 宋版书乌丝栏
function rules(g, t, o) {
  const a = env(t, o.t0, o.t1 ?? 1e9, 1.2, 1.2) * (o.alpha ?? .16); if (a <= 0) return;
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.strokeStyle = o.color || SEAL; g.globalAlpha = a; g.lineWidth = 1;
  for (let i = 0; i <= o.n; i++) { const x = o.x + o.gap / 2 - i * o.gap; g.beginPath(); g.moveTo(x, o.y); g.lineTo(x, o.y + o.h * ss(o.t0, o.t0 + 1.4, t)); g.stroke(); }
  g.restore();
}

/* ---------- 印章 ---------- */
function makeSeal(chars, cw, ch, seed, yin = true) {
  const pad = 10, c = mk(cw + pad * 2, ch + pad * 2), g = c.getContext('2d'), r = rng(seed);
  g.translate(pad, pad);
  g.fillStyle = SEAL; g.beginPath();
  const pts = [], n = 60;
  for (let i = 0; i < n; i++) {
    const s = i / n * 4, side = Math.floor(s), f = s - side, j = () => (r() - .5) * 2.2;
    let x, y; if (side === 0) { x = f * cw; y = 0; } else if (side === 1) { x = cw; y = f * ch; } else if (side === 2) { x = cw - f * cw; y = ch; } else { x = 0; y = ch - f * ch; }
    pts.push([x + j(), y + j()]);
  }
  pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); g.fill();
  const cells = [...chars], m = cw * .1;
  g.fillStyle = yin ? '#000' : PAPERS;
  if (yin) g.globalCompositeOperation = 'destination-out';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  if (cells.length === 4) {
    const s = (cw - m * 2) / 2; g.font = `${s * .96}px ${F.songb}`;
    const pos = [[1, 0], [1, 1], [0, 0], [0, 1]];
    cells.forEach((k, i) => g.fillText(k, m + s * (pos[i][0] + .5), m + s * (pos[i][1] + .5) + s * .02));
  } else if (cells.length === 2) {
    const s = (ch - m * 2) / 2; g.font = `${Math.min(s, cw - m * 2) * .98}px ${F.songb}`;
    cells.forEach((k, i) => g.fillText(k, cw / 2, m + s * (i + .5)));
  } else { g.font = `${(cw - m * 2) * .9}px ${F.songb}`; g.fillText(cells[0], cw / 2, ch / 2); }
  // 石章残损
  g.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < cw * 2.4; i++) {
    const edge = r() < .55, x = edge ? (r() < .5 ? r() * 5 : cw - r() * 5) : r() * cw, y = edge ? r() * ch : r() * ch;
    const xx = edge && r() < .5 ? x : (edge ? r() * cw : x), yy = edge && r() < .5 ? (r() < .5 ? r() * 5 : ch - r() * 5) : y;
    g.globalAlpha = .25 + r() * .6; g.beginPath(); g.arc(xx, yy, .5 + r() * 1.8, 0, TAU); g.fill();
  }
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  return c;
}
function stamp(g, t, seal, x, y, t0, scale = 1, alpha = .92) {
  if (t < t0) return; const k = clamp((t - t0) / .35);
  const s = scale * (1 + (1 - easeOut(k)) * .25);
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = alpha * ss(0, .6, k);
  g.globalCompositeOperation = 'multiply';
  g.translate(x, y); g.rotate(-.012); g.scale(s, s); g.drawImage(seal, -seal.width / 2, -seal.height / 2); g.restore();
}

/* ---------- 飞白笔触 ---------- */
function makeStroke(len, wd, seed, col, curve = 0) {
  const c = mk(len + wd * 2, wd * 3 + Math.abs(curve) * 2), g = c.getContext('2d'), r = rng(seed);
  const cy = c.height / 2, nb = Math.floor(wd * (col[0] > 100 ? 2.6 : 1.3));
  for (let b = 0; b < nb; b++) {
    const off = (b / nb - .5), end = .62 + .38 * r(), ab = .35 + .65 * r(), st = r() * .05;
    for (let x = len * st; x < len * end; x += 1.6) {
      const k = x / len, prs = Math.pow(Math.sin(Math.PI * clamp(k * .9 + .08)), .35);
      const y = cy + off * wd * (.5 + .5 * prs) * (1 + .2 * Math.sin(k * 7 + b)) + Math.sin(k * Math.PI) * curve;
      const dry = vn(x / 18, b * .7, seed) > (.28 + .5 * k * k) ? 1 : .12;
      g.fillStyle = rgba(col, ab * dry * (1 - ss(end - .08, end, k)) * .9);
      g.fillRect(x + wd, y, 2.2, 1.7);
    }
  }
  return c;
}

/* ---------- 点景：人物、舟、雁 ---------- */
function drawWalker(g, x, y, s, t, a = 1) {
  const step = t * 2.6, bob = Math.abs(Math.sin(step)) * 1.6;
  g.save(); g.translate(x, y - bob * s); g.scale(-s, s); g.globalAlpha *= a;
  g.fillStyle = INKS; g.strokeStyle = INKS; g.lineCap = 'round';
  // 腿
  g.lineWidth = 2.4; const sw = Math.sin(step) * 5;
  g.beginPath(); g.moveTo(-3, -12); g.lineTo(-3 + sw, 0); g.moveTo(3, -12); g.lineTo(3 - sw, 0); g.stroke();
  // 蓑衣
  g.beginPath(); g.moveTo(-6, -50); g.quadraticCurveTo(-15, -30, -19, -10); g.lineTo(18, -10); g.quadraticCurveTo(13, -30, 6, -50); g.closePath();
  g.globalAlpha *= .92; g.fill();
  g.lineWidth = 1; for (let i = -18; i <= 17; i += 2.4) { g.beginPath(); g.moveTo(i, -12); g.lineTo(i + 1.2, -6 + (i % 3)); g.stroke(); }
  // 头、斗笠
  g.beginPath(); g.arc(0, -55, 5.2, 0, TAU); g.fill();
  g.beginPath(); g.moveTo(-21, -57); g.quadraticCurveTo(0, -74, 21, -57); g.quadraticCurveTo(0, -61, -21, -57); g.fill();
  // 竹杖
  g.lineWidth = 1.8; g.beginPath(); g.moveTo(10, -40); g.lineTo(21 + Math.sin(step) * 3, 1); g.stroke();
  g.restore();
}
function drawBoat(g, x, y, s, t, two = false, a = 1, ref = true, su = null) {
  const bob = Math.sin(t * 1.1) * 1.5;
  g.save(); g.translate(x, y + bob); g.scale(s, s); g.globalAlpha *= a;
  g.fillStyle = INKS; g.strokeStyle = INKS; g.lineCap = 'round';
  g.beginPath(); g.moveTo(-64, -9); g.quadraticCurveTo(-50, 5, -10, 6); g.lineTo(34, 6); g.quadraticCurveTo(58, 3, 70, -12); g.quadraticCurveTo(52, -3, 30, -3); g.lineTo(-40, -3); g.quadraticCurveTo(-54, -4, -64, -9); g.fill();
  // 篷
  g.globalAlpha *= .8; g.beginPath(); g.moveTo(-26, -3); g.quadraticCurveTo(-18, -24, 6, -24); g.quadraticCurveTo(22, -22, 24, -3); g.closePath(); g.fill();
  g.globalAlpha /= .8;
  // 人
  const fig = (fx, hat) => { g.beginPath(); g.moveTo(fx - 7, -3); g.quadraticCurveTo(fx - 7, -20, fx, -22); g.quadraticCurveTo(fx + 7, -20, fx + 7, -3); g.fill(); g.beginPath(); g.arc(fx, -26, 3.6, 0, TAU); g.fill(); if (hat) { g.fillRect(fx - 3, -35, 6, 7); } };
  if (su) suDraw(g, 36, -3, .36, t, { pose: 'seat', age: su.age, face: 1, wind: .2 }); else fig(36, true); if (two) fig(-38, false);
  // 篙
  g.lineWidth = 1.3; g.beginPath(); g.moveTo(44, -16); g.lineTo(84, 22); g.stroke();
  g.restore();
  if (ref) {
    g.save(); g.translate(x, y + 10); g.scale(s, s); g.strokeStyle = INKS;
    for (let i = 0; i < 6; i++) { g.globalAlpha = a * .22 * (1 - i / 6); g.lineWidth = 2.2 - i * .25; const w = 60 - i * 6, o = Math.sin(t * 1.7 + i) * 4; g.beginPath(); g.moveTo(-w + o, i * 4); g.lineTo(w + o, i * 4); g.stroke(); }
    g.restore();
  }
}
function drawGeese(g, t, t0, t1, x0, y0, x1, y1, n, sc = 1) {
  if (t < t0 || t > t1) return; const k = (t - t0) / (t1 - t0);
  const a = env(t, t0, t1, 1.5, 1.5);
  const lx = lerp(x0, x1, k), ly = lerp(y0, y1, k), dir = Math.sign(x1 - x0) || 1;
  g.save(); g.strokeStyle = INKS; g.lineCap = 'round'; g.lineWidth = 1.8 * sc;
  for (let i = 0; i < n; i++) {
    const row = Math.ceil(i / 2), side = i % 2 ? 1 : -1;
    const bx = lx - dir * row * 34 * sc, by = ly + side * row * 16 * sc + Math.sin(t * .8 + i) * 3;
    const f = Math.sin(t * 7 + i * 1.3) * 4 * sc;
    g.globalAlpha = a * .8;
    g.beginPath(); g.moveTo(bx - 9 * sc, by - f); g.quadraticCurveTo(bx - 4 * sc, by - 3 * sc, bx, by); g.quadraticCurveTo(bx + 4 * sc, by - 3 * sc, bx + 9 * sc, by - f); g.stroke();
  }
  g.restore();
}
function makeRipples(seed, n, x0, x1, y0, y1) {
  const r = rng(seed), a = [];
  for (let i = 0; i < n; i++) { const k = Math.pow(r(), 1.5); a.push({ x: lerp(x0, x1, r()), y: lerp(y0, y1, k), k, len: lerp(18, 170, k) * (.4 + r()), ph: r() * TAU, sp: .4 + r() * .8 }); }
  return a;
}
function drawRipples(g, arr, t, alpha, col = INK, drift = 0) {
  g.save(); g.lineCap = 'round';
  for (const p of arr) {
    const o = Math.sin(t * p.sp + p.ph) * 7 * (p.k + .2) + drift * t * (p.k + .3);
    g.globalAlpha = alpha * (.25 + .75 * p.k) * (.45 + .55 * Math.sin(t * .6 + p.ph * 3) ** 2);
    g.strokeStyle = rgba(col, 1); g.lineWidth = .6 + 1.7 * p.k;
    g.beginPath(); g.moveTo(p.x + o, p.y); g.quadraticCurveTo(p.x + o + p.len / 2, p.y - 2.5 * p.k * Math.sin(p.ph + t), p.x + o + p.len, p.y); g.stroke();
  }
  g.restore();
}
function rain(g, t, alpha, seed, n = 260, ang = .2, sp = 1400) {
  if (alpha <= 0) return; const r = rng(seed);
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.strokeStyle = INKS; g.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const x0 = r() * (W + 400) - 200, y0 = r() * H, len = 30 + r() * 60, v = sp * (.7 + r() * .6);
    const y = (y0 + t * v) % (H + 120) - 60, x = x0 - (y) * ang;
    g.globalAlpha = alpha * (.12 + r() * .22); g.lineWidth = .7 + r() * .8;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x - len * ang, y + len); g.stroke();
  }
  g.restore();
}

/* ---------- 梅 ---------- */
function makePlum(seed) {
  const r = rng(seed), segs = [], fl = [];
  function limb(x, y, ang, len, w0, w1, b0, b1, zig = .32) {
    const n = Math.max(2, Math.round(len / 55)), pts = [[x, y, b0]]; let turn = r() < .5 ? 1 : -1;
    for (let i = 0; i < n; i++) {
      turn = -turn; const a = ang + turn * zig * (.5 + r() * .7), L = len / n * (.75 + r() * .5);
      const nx = x + Math.cos(a) * L, ny = y + Math.sin(a) * L;
      segs.push({ x1: x, y1: y, x2: nx, y2: ny, w0: lerp(w0, w1, i / n), w1: lerp(w0, w1, (i + 1) / n), b: lerp(b0, b1, i / n), e: lerp(b0, b1, (i + 1) / n) });
      x = nx; y = ny; pts.push([x, y, lerp(b0, b1, (i + 1) / n)]);
    }
    return pts;
  }
  const T = limb(-50, 1130, -1.0, 560, 46, 22, 0, .2, .26);
  const [tx, ty] = T[T.length - 1];
  const A = limb(tx, ty, -.42, 700, 22, 3, .2, .55, .3);
  const B = limb(tx, ty, -1.3, 460, 17, 3, .2, .5, .34);
  const C = limb(T[4][0], T[4][1], -.12, 420, 12, 2.5, .14, .42, .3);
  for (const L of [A, B, C]) for (let j = 1; j < L.length - 1; j++) {
    if (r() < .35) continue; const [px, py, pb] = L[j];
    const tw = limb(px, py, (r() < .55 ? -1.45 : -.15) + (r() - .5) * .4, 50 + r() * 100, 4, 2, pb, pb + .12, .25);
    const [ex, ey] = tw[tw.length - 1]; fl.push({ x: ex, y: ey, r: 13 + r() * 5, b: pb + .12 + r() * .3, rot: r() * TAU, bud: r() < .35 });
    if (r() < .5) fl.push({ x: px + (r() - .5) * 16, y: py + (r() - .5) * 16, r: 12 + r() * 5, b: pb + r() * .3, rot: r() * TAU, bud: r() < .3 });
  }
  for (const L of [A, B, C]) { const [ex, ey, eb] = L[L.length - 1]; fl.push({ x: ex, y: ey, r: 9, b: eb, rot: 0, bud: true }); }
  return { segs, fl: fl.filter(f => f.x < 1150 && f.y > 20) };
}
function drawPlum(g, P, p, t) {
  g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
  for (const s of P.segs) {
    if (p <= s.b) continue; const q = clamp((p - s.b) / (s.e - s.b));
    const x2 = lerp(s.x1, s.x2, q), y2 = lerp(s.y1, s.y2, q), w = lerp(s.w0, s.w1, q);
    g.strokeStyle = w > 4 ? 'rgb(58,53,46)' : 'rgba(58,53,46,.85)'; g.lineWidth = Math.max(w, 2.2); g.beginPath(); g.moveTo(s.x1, s.y1); g.lineTo(x2, y2); g.stroke();
    if (w > 5) { // 枯笔飞白
      const dx = x2 - s.x1, dy = y2 - s.y1, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, n = Math.floor(L / 5), si = Math.floor(s.x1 * 7 + s.y1);
      g.strokeStyle = 'rgba(236,228,210,.42)'; g.lineWidth = 1.3;
      for (let k = 0; k < n; k++) { if (hash2(si, k, 4) < .45) continue; const o = (hash2(si, k, 5) - .5) * w * .7, px = s.x1 + ux * k * 5 - uy * o, py = s.y1 + uy * k * 5 + ux * o, ln = 4 + hash2(si, k, 6) * 10; g.beginPath(); g.moveTo(px, py); g.lineTo(px + ux * ln, py + uy * ln); g.stroke(); }
    }
  }
  for (const f of P.fl) {
    const o = easeOut((p - f.b) / .12); if (o <= 0) continue;
    g.save(); g.translate(f.x, f.y); g.rotate(f.rot + Math.sin(t * .6 + f.x) * .03);
    if (f.bud) { g.fillStyle = 'rgba(150,40,50,.85)'; g.beginPath(); g.arc(0, 0, f.r * .38 * o, 0, TAU); g.fill(); }
    else {
      for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; g.fillStyle = 'rgba(192,78,86,.55)'; g.beginPath(); g.arc(Math.cos(a) * f.r * .5 * o, Math.sin(a) * f.r * .5 * o, f.r * .52 * o, 0, TAU); g.fill(); }
      g.strokeStyle = 'rgba(70,20,20,.8)'; g.lineWidth = 1;
      for (let i = 0; i < 7; i++) { const a = i / 7 * TAU; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * f.r * .45 * o, Math.sin(a) * f.r * .45 * o); g.stroke(); g.fillStyle = 'rgba(60,40,10,.9)'; g.beginPath(); g.arc(Math.cos(a) * f.r * .48 * o, Math.sin(a) * f.r * .48 * o, 1.3, 0, TAU); g.fill(); }
    }
    g.restore();
  }
  g.restore();
}

/* ---------- 竹 ---------- */
function makeBamboo(seed) {
  const r = rng(seed), stalks = [], leaves = [];
  const xs = [70, 170, 250, 380, 470, 590];
  xs.forEach((x, i) => {
    const w = 16 + r() * 12, lean = (r() - .45) * .12, tone = i % 2 ? .55 : .85;
    const nodes = []; let y = H + 20; while (y > -60) { nodes.push(y); y -= 120 + r() * 70; }
    stalks.push({ x, w, lean, tone, nodes });
    for (let k = 0; k < 4; k++) {
      const by = 80 + r() * 700, bx = x + lean * (H - by);
      const dir = r() < .5 ? -1 : 1, n = 3 + Math.floor(r() * 3);
      for (let j = 0; j < n; j++) leaves.push({ x: bx + dir * (10 + r() * 50), y: by + r() * 40, a: Math.PI / 2 + dir * (.25 + j * .28 + r() * .15), len: 70 + r() * 70, w: 11 + r() * 8, tone: tone * (.7 + r() * .35), ph: r() * TAU });
    }
  });
  for (let k = 0; k < 7; k++) { // 前景大叶
    const bx = -20 + r() * 520, by = r() * 260, n = 4 + Math.floor(r() * 3);
    for (let j = 0; j < n; j++) leaves.push({ x: bx, y: by, a: .2 + j * .35 + r() * .2, len: 140 + r() * 90, w: 20 + r() * 10, tone: .95, ph: r() * TAU });
  }
  return { stalks, leaves };
}
function drawBamboo(g, B, t, wind) {
  g.save();
  for (const s of B.stalks) {
    for (let i = 0; i < s.nodes.length - 1; i++) {
      const y0 = s.nodes[i] - 3, y1 = s.nodes[i + 1] + 3;
      const sway = Math.sin(t * 1.1 + s.x) * wind * 3 * (1 - y1 / H);
      const x0 = s.x + s.lean * (H - y0), x1 = s.x + s.lean * (H - y1) + sway;
      g.fillStyle = rgba(INK, s.tone * .8);
      g.beginPath(); g.moveTo(x0 - s.w / 2, y0); g.lineTo(x1 - s.w / 2, y1); g.lineTo(x1 + s.w / 2, y1); g.lineTo(x0 + s.w / 2, y0); g.fill();
      g.fillStyle = rgba(INK, s.tone * .9); g.fillRect(x1 - s.w * .7, y1 - 2.5, s.w * 1.4, 3.5);
    }
  }
  for (const l of B.leaves) {
    const a = l.a + Math.sin(t * 1.9 + l.ph) * .06 * wind + wind * .08;
    g.save(); g.translate(l.x, l.y); g.rotate(a); g.fillStyle = rgba(INK, l.tone * .88);
    g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(l.len * .28, -l.w * .9, l.len, 0); g.quadraticCurveTo(l.len * .3, l.w * .55, 0, 0); g.fill();
    g.restore();
  }
  g.restore();
}

/* ---------- 月、云、崖、柳、浪、荔枝 ---------- */
function makeClouds(seed, w, h, al) {
  const c = mk(w, h), g = c.getContext('2d'), img = g.createImageData(w, h), d = img.data;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const v = fbm(x / 420, y / 70, seed, 5), band = Math.exp(-Math.pow((y - h / 2) / (h * .32), 2)) * ss(0, 60, y) * (1 - ss(h - 60, h, y)) * ss(0, 400, x) * (1 - ss(w - 400, w, x));
    const a = ss(.5, .78, v) * band * al * (.6 + .6 * vn(x / 30, y / 6, seed + 3));
    const i = (y * w + x) * 4; d[i] = INK[0]; d[i + 1] = INK[1]; d[i + 2] = INK[2]; d[i + 3] = clamp(a) * 255;
  }
  g.putImageData(img, 0, 0); const c2 = mk(w, h), g2 = c2.getContext('2d'); g2.filter = 'blur(2px)'; g2.drawImage(c, 0, 0); return c2;
}
function nightWash(g, a0, a1) {
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, rgba(INK, a0)); gr.addColorStop(1, rgba(INK, a1));
  g.fillStyle = gr; g.fillRect(-300, -300, W + 600, H + 600);
}
function moon(g, x, y, R, glow = .5) {
  g.save(); g.globalCompositeOperation = 'destination-out';
  const gr = g.createRadialGradient(x, y, R * .9, x, y, R * 3.4); gr.addColorStop(0, `rgba(0,0,0,${glow})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(x - R * 3.5, y - R * 3.5, R * 7, R * 7);
  g.fillStyle = '#000'; g.beginPath(); g.arc(x, y, R, 0, TAU); g.fill(); g.restore();
  g.save(); const g2 = g.createRadialGradient(x - R * .2, y - R * .2, 0, x, y, R); g2.addColorStop(0, 'rgba(252,249,238,.75)'); g2.addColorStop(1, 'rgba(246,240,222,.35)');
  g.fillStyle = g2; g.beginPath(); g.arc(x, y, R, 0, TAU); g.fill(); g.restore();
}
function makeCliff(seed) {
  const c = mk(820, H), g = c.getContext('2d'), r = rng(seed);
  const top = [[0, 120], [120, 90], [210, 150], [330, 130], [420, 230], [520, 260], [560, 420], [610, 470], [640, 640], [700, 700], [760, 860], [820, 1000], [820, H], [0, H]];
  g.beginPath(); top.forEach((p, i) => i ? g.lineTo(p[0] + (r() - .5) * 10, p[1]) : g.moveTo(p[0], p[1])); g.closePath();
  const gr = g.createLinearGradient(0, 0, 820, 0); gr.addColorStop(0, rgba(INK, .9)); gr.addColorStop(.7, rgba(INK, .55)); gr.addColorStop(1, rgba(INK, .25));
  g.fillStyle = gr; g.fill(); g.save(); g.clip();
  for (let i = 0; i < 1600; i++) { // 斧劈皴：侧锋短刮
    const fam = r() < .6, x = r() * 820, y = 80 + Math.pow(r(), .8) * 1000, l = fam ? 30 + r() * 90 : 20 + r() * 60, w = fam ? 6 + r() * 18 : 3 + r() * 8, a = fam ? -1.45 + (r() - .5) * .5 : -.25 + (r() - .5) * .5;
    const light = r() < .28;
    g.save(); g.translate(x, y); g.rotate(a);
    g.fillStyle = light ? `rgba(236,228,210,${.04 + r() * .1})` : rgba(INK, (.06 + r() * .26) * (1 - y / 1500));
    g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(l * .5, -w * .8, l, -w * .2); g.lineTo(l * .85, w * .5); g.quadraticCurveTo(l * .4, w, 0, w * .4); g.fill(); g.restore();
  }
  for (let i = 0; i < 9; i++) { // 石脉轮廓
    let x = 40 + r() * 600, y = 150 + r() * 700; g.strokeStyle = rgba(INK, .35 + r() * .3); g.lineWidth = 1.5 + r() * 2.5; g.beginPath(); g.moveTo(x, y);
    for (let k = 0; k < 6; k++) { x += 10 + r() * 30; y += 30 + r() * 60; g.lineTo(x, y); } g.stroke();
  }
  const fog = g.createLinearGradient(0, 700, 0, H); fog.addColorStop(0, 'rgba(0,0,0,0)'); fog.addColorStop(1, 'rgba(0,0,0,.75)');
  g.globalCompositeOperation = 'destination-out'; g.fillStyle = fog; g.fillRect(0, 700, 820, H - 700); g.globalCompositeOperation = 'source-over';
  g.restore();
  for (let i = 0; i < 14; i++) { // 崖顶杂树
    const x = 20 + r() * 440, y = top.reduce((m, p, j) => j && p[0] >= x && top[j - 1][0] <= x ? lerp(top[j - 1][1], p[1], (x - top[j - 1][0]) / (p[0] - top[j - 1][0])) : m, 150);
    dotTree(g, x, y + 4, 22 + r() * 36, INK, .8, r);
  }
  const c2 = mk(820, H), g2 = c2.getContext('2d'); g2.filter = 'blur(1.3px)'; g2.drawImage(c, 0, 0); return c2;
}
function brushCurve(g, p0, p1, p2, w0, w1, a, n = 90) {
  n = Math.ceil((Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) + Math.hypot(p2[0] - p1[0], p2[1] - p1[1])) / 1.3);
  for (let i = 0; i <= n; i++) {
    const k = i / n, x = (1 - k) ** 2 * p0[0] + 2 * k * (1 - k) * p1[0] + k * k * p2[0], y = (1 - k) ** 2 * p0[1] + 2 * k * (1 - k) * p1[1] + k * k * p2[1];
    const w = lerp(w0, w1, k) * (.85 + .3 * vn(i * .3, 1, 5));
    g.fillStyle = rgba(INK, a * (.75 + .25 * vn(i * .2, 2, 7))); g.beginPath(); g.ellipse(x, y, w / 2, w / 2 * .8, 0, 0, TAU); g.fill();
  }
}
function makeWillow(seed) {
  const r = rng(seed), th = [];
  const branches = [[[-30, 330], [180, 60], [620, 40], 24, 4], [[60, 170], [330, 110], [860, 150], 10, 2.5], [[-30, 120], [120, -20], [420, -10], 14, 3]];
  const c = mk(W, 500), g = c.getContext('2d');
  branches.forEach(b => {
    brushCurve(g, b[0], b[1], b[2], b[3], b[4], .82, 140);
    for (let i = 0; i < 30; i++) { const k = .15 + r() * .85, x = (1 - k) ** 2 * b[0][0] + 2 * k * (1 - k) * b[1][0] + k * k * b[2][0], y = (1 - k) ** 2 * b[0][1] + 2 * k * (1 - k) * b[1][1] + k * k * b[2][1]; th.push({ x, y, L: 140 + r() * 460, ph: r() * TAU, a: .18 + r() * .5, w: .7 + r() * .9 }); }
  });
  return { img: c, th };
}
function drawWillow(g, Wl, t) {
  g.save(); g.lineCap = 'round';
  for (const s of Wl.th) {
    g.strokeStyle = rgba(INK, s.a); g.lineWidth = s.w; g.beginPath(); g.moveTo(s.x, s.y);
    const pts = [];
    for (let j = 1; j <= 22; j++) { const k = j / 22, sw = Math.sin(t * .9 + s.ph + k * 1.5) * 24 * Math.pow(k, 1.6); pts.push([s.x + sw + k * 12, s.y + k * s.L]); g.lineTo(pts[j - 1][0], pts[j - 1][1]); }
    g.stroke();
    g.fillStyle = rgba(INK, s.a * .9);
    for (let j = 2; j < 22; j += 2) { const [x, y] = pts[j]; g.beginPath(); g.ellipse(x + 3, y, 5, 1.3, 1.15 + (j % 4 ? .3 : -.2), 0, TAU); g.fill(); }
  }
  g.drawImage(Wl.img, 0, 0);
  g.restore();
}
function drawWaves(g, t, y0, a) {
  g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
  const N = 40;
  for (let i = 0; i < N; i++) {
    const k = i / (N - 1), y = y0 + Math.pow(k, 1.6) * (H - y0 + 40), gap = (H - y0) * 1.6 * Math.pow(k, .6) / N;
    const A = Math.min(1.5 + 18 * Math.pow(k, 1.3), gap * 1.25), f = .02 - .011 * k, sp = .45 + .5 * k, ph0 = i * 1.37;
    g.strokeStyle = rgba(INK, a * (.2 + .55 * k)); g.lineWidth = .5 + 1.9 * k; g.beginPath();
    for (let x = -40; x <= W + 40; x += 10) {
      const ph = x * f + t * sp + ph0, c = Math.pow((Math.sin(ph) + 1) / 2, 2.4);
      const yy = y - A * 2 * c + A * .3 * Math.sin(x * f * 2.7 - t * sp * .6 + ph0);
      x === -40 ? g.moveTo(x, yy) : g.lineTo(x, yy);
    }
    g.stroke();
    if (k > .4) { // 浪头卷舌
      g.lineWidth = .6 + 1.4 * k; g.strokeStyle = rgba(INK, a * .55 * k);
      const period = TAU / f;
      for (let m = -1; m < W / period + 1; m++) {
        const x = (Math.PI / 2 - t * sp - ph0) / f + m * period; if (x < -20 || x > W + 20) continue;
        if (hash2(m + 99, i, 3) < .45) continue;
        const yy = y - A * 2 + A * .3 * Math.sin(x * f * 2.7 - t * sp * .6 + ph0), s = .6 + A / 14;
        g.beginPath(); g.moveTo(x - 14 * s, yy + 4 * s); g.quadraticCurveTo(x + 2 * s, yy - 9 * s, x + 12 * s, yy - 2 * s); g.quadraticCurveTo(x + 9 * s, yy + 4 * s, x + 3 * s, yy + 1 * s); g.stroke();
      }
    }
  }
  g.restore();
}
function makeLychee(seed) {
  const c = mk(640, 520), g = c.getContext('2d'), r = rng(seed);
  g.strokeStyle = rgba(INK, .85); g.lineCap = 'round'; g.lineWidth = 7;
  g.beginPath(); g.moveTo(-10, 20); g.quadraticCurveTo(220, 60, 330, 250); g.stroke();
  g.lineWidth = 3; g.beginPath(); g.moveTo(250, 130); g.quadraticCurveTo(360, 150, 420, 110); g.stroke();
  for (let i = 0; i < 11; i++) { // 叶
    const x = 40 + r() * 360, y = 20 + r() * 140, a = r() * TAU, L = 90 + r() * 60;
    g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = rgba(r() < .6 ? INK : [40, 56, 44], .7 + r() * .25);
    g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(L * .45, -18, L, 0); g.quadraticCurveTo(L * .45, 18, 0, 0); g.fill();
    g.strokeStyle = 'rgba(240,232,214,.25)'; g.lineWidth = 1; g.beginPath(); g.moveTo(4, 0); g.lineTo(L - 6, 0); g.stroke(); g.restore();
  }
  const fr = [[330, 280], [292, 318], [368, 318], [330, 356], [398, 272], [262, 270], [300, 392]];
  g.strokeStyle = rgba(INK, .7); g.lineWidth = 1.5; fr.forEach(p => { g.beginPath(); g.moveTo(330, 250); g.lineTo(p[0], p[1] - 22); g.stroke(); });
  fr.forEach(([x, y]) => {
    const R = 24 + r() * 5, gr = g.createRadialGradient(x - 7, y - 8, 2, x, y, R);
    gr.addColorStop(0, '#c9533d'); gr.addColorStop(.6, '#a52e22'); gr.addColorStop(1, '#5a170f');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, R, 0, TAU); g.fill();
    g.fillStyle = 'rgba(80,20,15,.55)'; for (let k = 0; k < 40; k++) { const a = r() * TAU, d = Math.sqrt(r()) * R * .92; g.beginPath(); g.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, 1.3, 0, TAU); g.fill(); }
    g.strokeStyle = 'rgba(50,14,8,.55)'; g.lineWidth = 1.6; g.beginPath(); g.arc(x, y, R, 0, TAU); g.stroke();
  });
  return c;
}
function makeFlood(seed) {
  const h = Math.floor(H * 1.35), c = mk(W, h), g = c.getContext('2d'), img = g.createImageData(W, h), d = img.data;
  const edge = new Float32Array(W);
  for (let x = 0; x < W; x++) edge[x] = h - 90 - fbm(x / 160, 0, seed, 5) * 150 + (hash2(Math.floor(x / 23), 1, seed) > .86 ? hash2(Math.floor(x / 23), 2, seed) * 120 * Math.sin(Math.PI * ((x % 23) / 23)) : 0);
  for (let y = 0; y < h; y++) for (let x = 0; x < W; x++) {
    const e = edge[x]; if (y > e + 30) continue;
    let a = (.8 + .16 * fbm(x / 140, y / 140, seed + 2, 4)) * (1 - ss(e - 40, e + 30, y));
    a *= (.93 + .1 * vn(x / 9, y / 70, seed + 4)) * (.86 + .22 * fbm(x / 260, y / 260, seed + 8, 3));
    const i = (y * W + x) * 4; d[i] = 21; d[i + 1] = 19; d[i + 2] = 16; d[i + 3] = clamp(a) * 255;
  }
  g.putImageData(img, 0, 0); return c;
}

/* ---------- 章节题签 ---------- */
function chapter(g, t, t0, num, place, year, dark = false) {
  const col = dark ? PAPERS : INKS;
  if (num) vtext(g, t, { t0, cols: [num], x: 1800, y: 96, size: 104, font: F.brush, color: col, fd: 1.3, wet: !dark });
  vtext(g, t, { t0: t0 + .5, cols: [place], x: 1800, y: num ? 238 : 110, size: 44, lead: 1.3, font: F.songb, color: col, rate: .16, fd: 1 });
  vtext(g, t, { t0: t0 + 1.1, cols: [year], x: 1742, y: num ? 244 : 116, size: 21, lead: 1.25, font: F.song, color: dark ? '#d4796b' : SEAL, rate: .05, fd: .7 });
}

/* ====== 接合：把旧片画法接到工坊（手写） ====== */
// 字体：毛笔体和草书只带了旧片用过的字（COVER），缺的字会回落成楷体，检查时会报出来
const COVER = {"Brush": "、。《》「」一七万丈三上下不与且世丘丙业东丝两个中丰临丹为主举久么之乌乐九也书买乱乾了争事二于云五些交亦京亲人什仆今介仍从仑他仗仙代令以仪件任份仿伊伍会伤伯伸似但位住体何余作使侄例侍依侧俗俘保修候倚做停偶像儋儿元兄先光免入全八公六兰共关兴兵其具兹养兼内再写军农冠冤冬冯冰冲冷冻凉几凤出函凿分切刍划列刚初判别刮到制刺刻剂剃前剑剪副劈力功加动劾勒勾包匏化北区十千半华卑卒卖南博卡印即却卷厂历压原厢厨去县叁参又及双反发取变叙叛口古句另只叫可台史右叶号司叹各合吉同名后向君吟听吾命和哈哪唐唤唱啖啸嘉嘲器噪囊四回因团国图土圣在地场均坐块坡垂型埋城基堆堤塔塘塞境墓墙墨壁士壬声壹处复夏夕外多夜大天太夫夭夯失头奇奉套奚女奴她好如妃妇妨妹始姑姓姿娘娟婢婪婴婵嫁子孕字存孝学孩宁它宅守安宋宏宗官定实客宣宦宫家容宽寄密寺寻导封将小少尔尖尚就尼尽尾局层居屏山岁岑岭岷岸峡峪峰崇崖崩川州巡工左己已巾布师帐帝带帧席常帽幕干平年并幼广庆床序底府度座康廉廊廓延廷建开弃式引弟弦弱归当录形彩影役往征律徐得御循徽心必志快怀怕总恨恩恪悉悬悼情惟惠想意愿慈戈戌戍成我或战戚戴所扇手才打执扬批把折抚报披抬抱抵抹押拐持按捌损换据排掠探接推描插握揭搔摆播撰擎支收改放政故数整文斋斑斗料斛斜斧断斯新方施旁旅族无既日旦旧早旬时昆昌明星映春昭是显晚景晴暂暮暴曰更替最月有服望朝期木未末本朱杂李杖条来杨杭松林果枝枯柒染柳标栏树样桃框案桐桥梅检棚植楼榜檐次欢欧款歌止正此武死残段殿母每比毡氏民气水永汉汝江汤汲汴汽沉没沤河沿法泛注泰泾洋洛洞洵活派流浚浪海涯淘淡淮清渡渭渲游湖湘溯滟滩漆漫潋潮潼澳瀑瀚火灰灼点烈烟热然煊煎煤照熙父片版牙牛物犁状犹独狱献玉王环珍理琴琼瑟瑶瓜瓠甘生用由申画留番疆疏病痕登白百的皆皇皖皮皱皴盏监盖目眉看真眼着睡督睫睹瞻知矩短石研破碎碑祁祈神祷福禹禺离秋秒积移程穆空穿突窄窗立竖站章童端竹笔笠符第等筑筒签算箫篇篙篷簿米类粤系素索紧纂红约纯纳纷纸纹线练绅细终绍经结绘给绝统绢绦继绪绵缓编缠缴罗罪羊美群翔翻老考者而耕耳聊肃肆肯胜胡能脉脊脚脸腰腹腿膏臂臣自至舌舟舰船色节芒花芽苍苏若英草荒荔荣药莫萧落葬蒙蒸蓑蔽薄薪虏虔蛋蜀融行衙衣补表衩袋袍袖被袱裂装裙裤裳裴褂褒西要见观规触言计认讪记许论设访证词诏诗话详诩说请诸读谁谤谦豫贪贬贰贵贼赃赋赐赠赣赤赦赭走赴起超越趺跟路蹄身躬车转轮轻轼载辕辙辞辩辫辰边达迁过近还这进远连迟迪述迹追送逃逆选逐途逗通逝造逮逾遇道遣避邙那邱郑郡部都配酒酷醉里重量金钞钟钱钿铁铜铭锋错锚锡锦长门闭问间闻阅阙队阳阴阶陆陈降陕院陵随难雁雄雨雪零雷霍霜霞青靖靛非靠面鞋韶页顶须顾领颈颍颗题颠风飘飞食饮首马驱驻驼骑骡骨高髭髯髹魏鱼鲜鲠鲫鹅麻黄黑鼓鼻龄龙龟（），：；", "Cao": "、。《》「」一七万丈三上下不与且世丘丙业东丝两个中丰临丹为主举久么之乌乐九也书买乱乾了争事二于云五些交亦京亲人什仆今介仍从仑他仗仙代令以仪件任份仿伊伍会伤伯伸似但位住体何余作使侄例侍依侧俗俘保修候倚做停偶像儋儿元兄先光免入全八公六兰共关兴兵其具兹养兼内再写军农冠冤冬冯冰冲冷冻凉几凤出函凿分切刍划列刚初判别刮到制刺刻剂剃前剑剪副劈力功加动劾勒勾包匏化北区十千半华卑卒卖南博卡印即却卷厂历压原厢厨去县叁参又及双反发取变叙叛口古句另只叫可台史右叶号司叹各合吉同名后向君吟听吾命和哈哪唐唤唱啖啸嘉嘲器噪囊四回因团国图土圣在地场均坐块坡垂型埋城基堆堤塔塘塞境墓墙墨壁士壬声壹处复夏夕外多夜大天太夫夭夯失头奇奉套奚女奴她好如妃妇妨妹始姑姓姿娘娟婢婪婴婵嫁子孕字存孝学孩宁它宅守安宋宏宗官定实客宣宦宫家容宽寄密寺寻导封将小少尔尖尚就尼尽尾局层居屏山岁岑岭岷岸峡峪峰崇崖崩川州巡工左己已巾布师帐帝带帧席常帽幕干平年并幼广庆床序底府度座康廉廊廓延廷建开弃式引弟弦弱归当录形彩影役往征律徐得御循徽心必志快怀怕总恨恩恪悉悬悼情惟惠想意愿慈戈戌戍成我或战戚戴所扇手才打执扬批把折抚报披抬抱抵抹押拐持按捌损换据排掠探接推描插握揭搔摆播撰擎支收改放政故数整文斋斑斗料斛斜斧断斯新方施旁旅族无既日旦旧早旬时昆昌明星映春昭是显晚景晴暂暮暴曰更替最月有服望朝期木未末本朱杂李杖条来杨杭松林果枝枯柒染柳标栏树样桃框案桐桥梅检棚植楼榜檐次欢欧款歌止正此武死残段殿母每比毡氏民气水永汉汝江汤汲汴汽沉没沤河沿法泛注泰泾洋洛洞洵活派流浚浪海涯淘淡淮清渡渭渲游湖湘溯滟滩漆漫潋潮潼澳瀑瀚火灰灼点烈烟热然煊煎煤照熙父片版牙牛物犁状犹独狱献玉王环珍理琴琼瑟瑶瓜瓠甘生用由申画留番疆疏病痕登白百的皆皇皖皮皱皴盏监盖目眉看真眼着睡督睫睹瞻知矩短石研破碎碑祁祈神祷福禹禺离秋秒积移程穆空穿突窄窗立竖站章童端竹笔笠符第等筑筒签算箫篇篙篷簿米类粤系素索紧纂红约纯纳纷纸纹线练绅细终绍经结绘给绝统绢绦继绪绵缓编缠缴罗罪羊美群翔翻老考者而耕耳聊肃肆肯胜胡能脉脊脚脸腰腹腿膏臂臣自至舌舟舰船色节芒花芽苍苏若英草荒荔荣药莫萧落葬蒙蒸蓑蔽薄薪虏虔蛋蜀融行衙衣补表衩袋袍袖被袱裂装裙裤裳裴褂褒西要见观规触言计认讪记许论设访证词诏诗话详诩说请诸读谁谤谦豫贪贬贰贵贼赃赋赐赠赣赤赦赭走赴起超越趺跟路蹄身躬车转轮轻轼载辕辙辞辩辫辰边达迁过近还这进远连迟迪述迹追送逃逆选逐途逗通逝造逮逾遇道遣避邙那邱郑郡部都配酒酷醉里重量金钞钟钱钿铁铜铭锋错锚锡锦长门闭问间闻阅阙队阳阴阶陆陈降陕院陵随难雁雄雨雪零雷霍霜霞青靖靛非靠面鞋韶页顶须顾领颈颍颗题颠风飘飞食饮首马驱驻驼骑骡骨高髭髯髹魏鱼鲜鲠鲫鹅麻黄黑鼓鼻龄龙龟（），：；"};
const _vtext = vtext;
vtext = function (G, t, o) {
  _vtext(G, t, o);
  if (typeof REC === 'undefined' || !REC || !REC.tx) return;
  const size = o.size, lead = size * (o.lead ?? 1.12), gap = o.gap ?? size * 1.5, rate = o.rate ?? .09, fd = o.fd ?? .9;
  const out = o.t1 != null ? 1 - ss(o.t1 - (o.fo ?? 1.2), o.t1, t) : 1; if (t < o.t0 || out <= 0) return;
  const fam = /Cao/.test(o.font || '') ? 'Cao' : /Brush/.test(o.font || '') ? 'Brush' : null;
  let k = 0;
  o.cols.forEach((c, ci) => {
    const chars = [...c], tc = o.t0 + k * rate, a = ss(tc, tc + fd, t) * out * (o.alpha ?? 1); k += chars.length + (o.colPause ?? 3);
    let len = 0; for (const ch of chars) len += ch === ' ' ? .45 : ch === '·' ? .6 : 1;
    if (a > .02 && c.trim()) REC.tx.push([c, Math.round(o.x - ci * gap - size / 2), Math.round(o.y), Math.round(o.x - ci * gap + size / 2), Math.round(o.y + len * lead), +a.toFixed(2)]);
    if (fam && REC.miss) for (const ch of chars) if (ch.charCodeAt(0) > 0x2e7f && !COVER[fam].includes(ch)) REC.miss[fam + '|' + ch] = 1;
  });
};
// 分场：先画在一张透明的"绢"上，再整张淡入淡出叠到纸上（旧片的合成办法）。draw(G, u, t)：G 是这张绢的画笔，u 是进场后的秒数
let BUFG = null;
function boot() { if (PAPER) return; PAPER = makePaper(); VIGN = makeVignette(); MASK = mk(W, H); BUF = [mk(W, H)]; BUFG = BUF[0].getContext('2d'); }
function layer(t, a, b, draw, o = {}) {
  const al = o.alpha ?? (o.hard ? (t >= a && t < b ? 1 : 0) : env(t, a, b, o.fi ?? 1.6, o.fo ?? 1.6)); if (al <= .001) return;
  boot(); const G = BUFG;
  G.setTransform(1, 0, 0, 1, 0, 0); G.globalAlpha = 1; G.globalCompositeOperation = 'source-over'; G.filter = 'none'; G.clearRect(0, 0, W, H);
  G.save(); draw(G, t - a, t); G.restore();
  if (o.fx) o.fx(BUF[0]);
  if (o.text) { G.save(); G.setTransform(1, 0, 0, 1, 0, 0); G.globalAlpha = 1; o.text(G, t - a, t); G.restore(); }
  if (o.out) { o.out(BUF[0], al); return; }
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha *= al; g.drawImage(BUF[0], 0, 0); g.restore();
}
// 费时的东西（山、印、树）只做一次：once('远山', () => mountain({...}))
const CACHE = new Map();
function once(key, make) { if (!CACHE.has(key)) { boot(); CACHE.set(key, make()); } return CACHE.get(key); }
const paper = () => { boot(); return PAPER; }, vignette = () => { boot(); return VIGN; };
// 主题：宣绢底 + 四角压暗
addTheme('songink', { light: true, ink: INKS, dim: 'rgba(29,27,24,.62)', note: 'rgba(29,27,24,.8)', a1: SEAL, a2: INKS, a3: 'rgb(78,108,104)', chip: 'rgba(29,27,24,.06)',
  sub: 'rgba(236,228,210,.88)', subInk: INKS, top: '#eee5d1', bot: '#e4d8bd', card: 'rgba(240,232,214,.95)', cardInk: INKS, pillInk: '#f3ead6', hl: 'rgba(168,50,43,.25)',
  f: { t: 'SongB', b: 'SongB', s: 'Song', h: 'Brush', n: 'RC' },
  bg(t) { g.drawImage(paper(), 0, 0); }, post(t) { g.drawImage(vignette(), 0, 0); } });
// 毛笔体和草书是按字分成很多小文件的：必须在开画之前全部装好。不然某个字第一次出现的那一帧会先用楷体画，而且会被字形缓存一直留着（经验库 L-015）
PACK_INIT.push(async () => {
  await Promise.all([...document.fonts].filter(f => /Brush|Cao/.test(f.family)).map(f => f.load().catch(() => 0)));
  await Promise.all([['Song', '宋'], ['SongB', '宋']].map(([f, s]) => document.fonts.load(`40px ${f}`, s).catch(() => 0))); GLYPH.clear();
});
// 舟上的人物由人物包来画（没装人物包就只画舟）；印章盖印另起一个名字，免得和通用组件的 stamp 撞名
var suDraw = (...a) => PACK.figures && PACK.figures.suDraw(...a);
const sealStamp = stamp;
// 章题：旧片里年号只有 21 像素，手机上读不清，这里加大（经验库 L-014）
chapter = function (g, t, t0, num, place, year, dark = false) {
  const col = dark ? PAPERS : INKS;
  if (num) vtext(g, t, { t0, cols: [num], x: 1800, y: 96, size: 104, font: F.brush, color: col, fd: 1.3, wet: !dark });
  vtext(g, t, { t0: t0 + .5, cols: [place], x: 1800, y: num ? 238 : 110, size: 46, lead: 1.3, font: F.songb, color: col, rate: .16, fd: 1 });
  vtext(g, t, { t0: t0 + 1.1, cols: [year], x: 1736, y: num ? 244 : 116, size: 32, lead: 1.16, font: F.song, color: dark ? '#d4796b' : SEAL, rate: .05, fd: .7 });
};

return {TAU, INK, TQ, ZHE, INKS, PAPERS, SEAL, ROUGE, LYCHEE, F, clamp, lerp, ss, env, easeOut, rng, hash2, vn, fbm, mk, rgba, makePaper, makeVignette, mountain, dotTree, CTX, PAPER, VIGN, MASK, BUF, revealDraw, cam, mist, GLYPH, glyph, vtext, rules, makeSeal, stamp, makeStroke, drawWalker, drawBoat, drawGeese, makeRipples, drawRipples, rain, makePlum, drawPlum, makeBamboo, drawBamboo, makeClouds, nightWash, moon, makeCliff, brushCurve, makeWillow, drawWillow, drawWaves, makeLychee, makeFlood, chapter, COVER, _vtext, BUFG, boot, layer, CACHE, once, paper, vignette, suDraw, sealStamp};
})();
