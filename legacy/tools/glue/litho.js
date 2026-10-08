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
