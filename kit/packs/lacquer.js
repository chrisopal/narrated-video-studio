/* 风格包 · 漆屏风 —— 出自《王钟儿》：朱漆底、平涂勾线人物、上下两栏并行叙事、屏风六扇翻转
   由 legacy/tools/mkpacks.py 生成，不要手改这个文件：旧片画法在 legacy/*.html，接合代码在 legacy/tools/glue/lacquer.js */
window.PACK=window.PACK||{};window.PACK_INIT=window.PACK_INIT||[];
PACK.lacquer=(function(){
const {TAU, F, clamp, lerp, ss, rng, hash2, vn, fbm, mk, rgba, vtext, chapter} = PACK.ink;
const LQ = { BK: 'rgb(26,17,13)', YE: 'rgb(224,180,86)', WH: 'rgb(238,228,202)', GR: 'rgb(62,106,98)', RD: 'rgb(150,36,28)', BR: 'rgb(122,78,44)', SK: 'rgb(242,230,206)', GY: 'rgb(170,164,150)', OC: 'rgb(196,150,70)' };
function P2(d) { return new Path2D(d); }
function lqShape(g, d, fill, lw = 2.6, line = LQ.BK) { const p = P2(d); if (fill) { g.fillStyle = fill; g.fill(p); } if (lw) { g.strokeStyle = line; g.lineWidth = lw; g.stroke(p); } }
function lqLine(g, d, lw = 1.3, col = LQ.BK) { g.strokeStyle = col; g.lineWidth = lw; g.stroke(P2(d)); }
function ribbon(g, x0, y0, len, t, seed, col, w = 9, dir = 1, droop = .25) { // 飘带：随风的正弦带
  const n = 26, pts = [];
  for (let i = 0; i <= n; i++) { const k = i / n, x = x0 + dir * len * k, y = y0 + len * droop * k * k + Math.sin(k * 5.2 + seed - t * 2.2) * (6 + 26 * k) * (.5 + .5 * k); pts.push([x, y]); }
  const path = () => { g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); };
  g.lineCap = 'round'; g.lineJoin = 'round'; path(); g.strokeStyle = LQ.BK; g.lineWidth = w + 4; g.stroke(); path(); g.strokeStyle = col; g.lineWidth = w; g.stroke();
  // 末端收尖
}
function spline(P) { // 闭合 Catmull-Rom → Path2D
  const n = P.length, p = new Path2D();
  for (let i = 0; i < n; i++) { const p0 = P[(i - 1 + n) % n], p1 = P[i], p2 = P[(i + 1) % n], p3 = P[(i + 2) % n];
    if (!i) p.moveTo(p1[0], p1[1]);
    p.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6, p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]); }
  p.closePath(); return p;
}
/* 脸：f = {fw 宽, len 长, jaw 0鹅蛋…1方, eye, brow, mouth, beard, wr 皱纹0-3, skin, mole, dian 花钿, blush, grey 发色} */
const FACE = {
  wz24: { fw: .92, len: 1.0, jaw: .1, eye: 'open', brow: 'arch', mouth: 'red', mole: true, dian: true, blush: .5 },
  wz30: { fw: .9, len: 1.02, jaw: .15, eye: 'low', brow: 'sad', mouth: 'thin', mole: true },
  wz45: { fw: 1.04, len: 1.0, jaw: .45, eye: 'open', brow: 'soft', mouth: 'red', mole: true, wr: 1 },
  wz71: { fw: 1.0, len: 1.06, jaw: .35, eye: 'old', brow: 'grey', mouth: 'thin', mole: true, wr: 2, skin: 'rgb(232,216,188)' },
  wz86: { fw: .94, len: 1.1, jaw: .2, eye: 'old', brow: 'grey', mouth: 'thin', mole: true, wr: 3, skin: 'rgb(226,208,180)', gaunt: true },
  gao: { fw: 1.08, len: .94, jaw: .3, eye: 'open', brow: 'arch', mouth: 'red', dian: true, blush: .7 },
  feng: { fw: 1.12, len: 1.02, jaw: .8, eye: 'phoenix', brow: 'thick', mouth: 'frown', wr: 1 },
  hu: { fw: .9, len: 1.04, jaw: 0, eye: 'phoenix', brow: 'arch', mouth: 'red', blush: .3 },
  fengz: { fw: .98, len: 1.0, jaw: .5, eye: 'phoenix', brow: 'flat', mouth: 'frown' },
  xiaowen: { fw: 1.12, len: 1.08, jaw: .9, eye: 'man', brow: 'thick', mouth: 'man', beard: 'goatee', skin: 'rgb(230,204,166)', man: true },
  xuanwu: { fw: 1.22, len: 1.0, jaw: .6, eye: 'man', brow: 'thick', mouth: 'man', beard: 'mustache', skin: 'rgb(232,208,172)', man: true },
  xianwen: { fw: 1.04, len: .98, jaw: .5, eye: 'man', brow: 'flat', mouth: 'man', skin: 'rgb(236,214,180)', man: true },
  yang: { fw: 1.04, len: 1.1, jaw: .7, eye: 'man', brow: 'flat', mouth: 'man', beard: 'short', skin: 'rgb(232,208,172)', man: true },
  xiaoming: { fw: 1.06, len: .96, jaw: .3, eye: 'man', brow: 'flat', mouth: 'man', skin: 'rgb(238,220,190)', man: true },
  soldier: { fw: 1.14, len: 1.02, jaw: 1, eye: 'man', brow: 'thick', mouth: 'man', beard: 'full', skin: 'rgb(214,180,140)', man: true }
};
function lqHead(g, o, t) {
  const f = typeof o.f === 'string' ? FACE[o.f] : (o.f || FACE.wz45), hairC = (f.wr >= 3 || o.grey || f.grey) ? LQ.GY : LQ.BK, skin = f.skin || LQ.SK, ink = LQ.BK;
  g.save(); g.translate(0, -300); g.scale(1.24, 1.24); g.translate(0, 300);
  lqShape(g, 'M-4,-306 L-6,-290 L10,-290 L9,-306 Z', skin, 2);
  const cx = -6, W = 19.5 * f.fw, Hh = 47 * f.len, top = -299 - Hh, j = f.jaw, ga = f.gaunt ? .9 : 1;
  const face = spline([[cx + 1, top], [cx - W * .82, top + Hh * .1], [cx - W * 1.06, top + Hh * .42], [cx - W * (1.0 * ga), top + Hh * .66], [cx - W * (.52 + .4 * j), top + Hh * .9], [cx - 3, top + Hh * (1.0 - .03 * j)], [cx + W * (.5 + .36 * j), top + Hh * .9], [cx + W * .98 * ga, top + Hh * .62], [cx + W * 1.0, top + Hh * .36], [cx + W * .8, top + Hh * .08]]);
  // —— 发 / 冠（在脸后）
  const hy = top;
  if (o.nun) { /* 剃发 */ }
  else if (o.xb) lqShape(g, `M${cx - W * 1.2},${hy + 16} C${cx - W * 1.3},${hy - 22} ${cx + W * 1.4},${hy - 26} ${cx + W * 1.36},${hy + 14} L${cx + W * 1.7},${hy + 66} Q${cx + W * 1.2},${hy + 74} ${cx + W * .8},${hy + 64} L${cx + W * .9},${hy + 24} C${cx + W * .4},${hy + 4} ${cx - W * .6},${hy + 2} ${cx - W * 1.2},${hy + 16} Z`, o.pal.hat || LQ.BK, 2.2);
  else if (o.hair === 'mian' || o.hair === 'guan' || o.hair === 'helm') { g.fillStyle = hairC; g.fill(P2(`M${cx - W * 1.1},${hy + 16} C${cx - W * 1.1},${hy - 10} ${cx + W * 1.2},${hy - 12} ${cx + W * 1.16},${hy + 18} L${cx + W * 1.1},${hy + 34} L${cx + W * .9},${hy + 10} L${cx - W * 1.0},${hy + 12} Z`)); }
  else {
    lqShape(g, `M${cx - W * 1.14},${hy + 18} C${cx - W * 1.2},${hy - 14} ${cx + W * 1.24},${hy - 18} ${cx + W * 1.2},${hy + 16} C${cx + W * 1.36},${hy + 34} ${cx + W * 1.2},${hy + 46} ${cx + W * .96},${hy + 52} L${cx + W * .9},${hy + 10} L${cx - W * 1.0},${hy + 10} Z`, hairC, 2);
    if (o.hair === 'loops') { g.lineCap = 'round'; for (const [ox, oy] of [[-12, -30], [13, -27]]) { g.beginPath(); g.ellipse(cx + ox, hy + oy, 10, 15, ox < 0 ? -.25 : .25, 0, TAU); g.strokeStyle = hairC; g.lineWidth = 7.5; g.stroke(); } }
    else if (o.hair === 'crown') { lqShape(g, `M${cx - 12},${hy + 2} C${cx - 26},${hy - 22} ${cx - 18},${hy - 52} ${cx + 4},${hy - 52} C${cx + 26},${hy - 52} ${cx + 30},${hy - 24} ${cx + 16},${hy + 2} Z`, hairC, 2); lqShape(g, `M${cx - 22},${hy - 10} L${cx - 16},${hy - 46} L${cx - 5},${hy - 24} L${cx + 3},${hy - 58} L${cx + 11},${hy - 24} L${cx + 22},${hy - 46} L${cx + 26},${hy - 10} Z`, LQ.YE, 2); for (const [x, y] of [[-16, -46], [3, -58], [22, -46]]) { g.fillStyle = LQ.RD; g.beginPath(); g.arc(cx + x, hy + y, 3.2, 0, TAU); g.fill(); } }
    else if (o.hair === 'high') { lqShape(g, `M${cx - 10},${hy + 2} C${cx - 28},${hy - 30} ${cx - 10},${hy - 62} ${cx + 8},${hy - 56} C${cx + 30},${hy - 48} ${cx + 26},${hy - 18} ${cx + 14},${hy + 2} Z`, hairC, 2); lqLine(g, `M${cx - 22},${hy - 24} L${cx + 26},${hy - 34}`, 2.4, LQ.YE); for (const dx of [-22, 26]) { g.fillStyle = LQ.YE; g.beginPath(); g.arc(cx + dx, hy - (dx < 0 ? 24 : 34), 3.4, 0, TAU); g.fill(); } }
    else if (o.hair === 'low') { lqShape(g, `M${cx + W * .5},${hy + 6} C${cx + W * 1.9},${hy - 6} ${cx + W * 2.2},${hy + 30} ${cx + W * 1.1},${hy + 36} Z`, hairC, 2); }
    else { lqShape(g, `M${cx - 9},${hy + 2} C${cx - 22},${hy - 16} ${cx - 14},${hy - 40} ${cx + 4},${hy - 40} C${cx + 22},${hy - 40} ${cx + 26},${hy - 18} ${cx + 14},${hy + 2} Z`, hairC, 2); lqLine(g, `M${cx - 20},${hy - 16} L${cx + 24},${hy - 24}`, 2.2, LQ.YE); }
  }
  // —— 脸
  g.fillStyle = skin; g.fill(face); g.strokeStyle = ink; g.lineWidth = 2; g.stroke(face);
  if (o.nun) { g.strokeStyle = 'rgba(26,17,13,.35)'; g.lineWidth = 1; g.beginPath(); g.arc(cx + 2, top + Hh * .2, W * .9, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
  if (!o.nun && !o.xb && o.hair !== 'mian' && o.hair !== 'guan' && o.hair !== 'helm') { g.fillStyle = hairC; g.fill(P2(`M${cx - W * .86},${top + Hh * .16} C${cx - W * .5},${top - 2} ${cx + W * .6},${top - 2} ${cx + W * .92},${top + Hh * .2} C${cx + W * .5},${top + Hh * .1} ${cx - W * .3},${top + Hh * .08} ${cx - W * .86},${top + Hh * .16} Z`)); }
  const ey = top + Hh * .5, exL = cx - W * .5, exR = cx + W * .36, by = ey - 7.5;
  if (f.blush) { for (const x of [cx - W * .62, cx + W * .56]) { const gr = g.createRadialGradient(x, ey + 9, 0, x, ey + 9, 8); gr.addColorStop(0, `rgba(196,70,60,${.5 * f.blush})`); gr.addColorStop(1, 'rgba(196,70,60,0)'); g.fillStyle = gr; g.fillRect(x - 9, ey, 18, 18); } }
  // 眉
  const brow = (x, w, dir) => { const b = f.brow;
    if (b === 'arch') lqLine(g, `M${x - w},${by + 1} Q${x},${by - 4.5} ${x + w},${by + .5}`, 1.3);
    else if (b === 'soft') lqLine(g, `M${x - w},${by} Q${x},${by - 3} ${x + w},${by + .5}`, 1.6);
    else if (b === 'sad') lqLine(g, `M${x - w},${by + (dir < 0 ? 2 : -2.4)} Q${x},${by - 1.5} ${x + w},${by + (dir < 0 ? -2.4 : 2)}`, 1.5);
    else if (b === 'flat') lqLine(g, `M${x - w},${by} L${x + w},${by - .6}`, 2.2);
    else if (b === 'thick') lqLine(g, `M${x - w},${by + (dir < 0 ? -1.6 : 1.4)} L${x + w},${by + (dir < 0 ? 1.4 : -1.6)}`, 3);
    else if (b === 'grey') lqLine(g, `M${x - w},${by + 1} Q${x},${by - 2} ${x + w},${by + 2}`, 1.6, 'rgb(150,144,132)'); };
  brow(exL, 5.6, -1); brow(exR, 6.4, 1);
  // 眼
  const eye = (x, w, dir) => { const e = f.eye;
    if (e === 'open') { lqLine(g, `M${x - w},${ey} Q${x},${ey - 3.4} ${x + w},${ey}`, 1.7); g.fillStyle = ink; g.beginPath(); g.arc(x, ey - .2, 1.7, 0, TAU); g.fill(); }
    else if (e === 'low') { lqLine(g, `M${x - w},${ey - .5} Q${x},${ey - 2.6} ${x + w},${ey + .8}`, 1.7); g.fillStyle = ink; g.beginPath(); g.arc(x - .6, ey + .8, 1.5, 0, TAU); g.fill(); }
    else if (e === 'phoenix') { lqLine(g, `M${x - w},${ey + (dir < 0 ? -2.2 : 1.2)} Q${x},${ey - 2.6} ${x + w * 1.25},${ey + (dir < 0 ? 1.2 : -2.6)}`, 1.9); g.fillStyle = ink; g.beginPath(); g.arc(x, ey - .2, 1.6, 0, TAU); g.fill(); }
    else if (e === 'man') { lqLine(g, `M${x - w},${ey} Q${x},${ey - 3} ${x + w},${ey}`, 2); lqLine(g, `M${x - w * .8},${ey + 2.2} L${x + w * .8},${ey + 2.2}`, .9); g.fillStyle = ink; g.beginPath(); g.arc(x, ey + .2, 1.9, 0, TAU); g.fill(); }
    else if (e === 'old') { lqLine(g, `M${x - w},${ey - 1} Q${x},${ey + 1.6} ${x + w},${ey - .4}`, 1.6); g.fillStyle = ink; g.beginPath(); g.arc(x, ey + 1.4, 1.2, 0, TAU); g.fill(); lqLine(g, `M${x - w * .9},${ey + 4.5} Q${x},${ey + 6.5} ${x + w * .9},${ey + 4.5}`, .8, 'rgba(26,17,13,.6)'); } };
  eye(exL, 4.6, -1); eye(exR, 5.4, 1);
  // 鼻
  const nx = cx - W * .14, ny = top + Hh * .5;
  if (f.man) { lqLine(g, `M${nx + 1},${ny - 2} L${nx - 4},${ny + 11} Q${nx - 1},${ny + 14} ${nx + 3},${ny + 12}`, 1.5); }
  else lqLine(g, `M${nx},${ny} L${nx - 2.6},${ny + 9} L${nx + .8},${ny + 10}`, 1.05);
  // 口
  const mx = cx - W * .12, my = top + Hh * .82;
  if (f.mouth === 'red') { g.fillStyle = LQ.RD; g.fill(P2(`M${mx - 4.6},${my} Q${mx - 2},${my - 2.6} ${mx},${my - 1.2} Q${mx + 2},${my - 2.6} ${mx + 4.6},${my} Q${mx},${my + 3.6} ${mx - 4.6},${my} Z`)); }
  else if (f.mouth === 'thin') lqLine(g, `M${mx - 4.4},${my + .4} Q${mx},${my - .8} ${mx + 4.4},${my + .6}`, 1.5, 'rgb(120,50,40)');
  else if (f.mouth === 'frown') { lqLine(g, `M${mx - 5},${my + 1.6} Q${mx},${my - 1.8} ${mx + 5},${my + 1.6}`, 2.2, LQ.RD); }
  else lqLine(g, `M${mx - 5},${my} L${mx + 5},${my}`, 1.7, 'rgb(110,44,34)');
  // 细节
  if (f.dian) { g.fillStyle = LQ.RD; g.fill(P2(`M${cx - 2},${top + Hh * .22} l3,4 l-3,4 l-3,-4 Z`)); }
  if (f.mole) { g.fillStyle = ink; g.beginPath(); g.arc(exL - 1, ey + 8.5, 1.25, 0, TAU); g.fill(); }
  const wr = f.wr || 0, wc = 'rgba(26,17,13,.55)';
  if (wr >= 1) { lqLine(g, `M${nx - 6},${ny + 9} Q${nx - 10},${my - 3} ${mx - 8},${my + 2}`, .9, wc); lqLine(g, `M${nx + 6},${ny + 9} Q${nx + 10},${my - 3} ${mx + 8},${my + 2}`, .9, wc); }
  if (wr >= 2) { lqLine(g, `M${cx - W * .5},${top + Hh * .24} Q${cx},${top + Hh * .2} ${cx + W * .5},${top + Hh * .25}`, .9, wc); lqLine(g, `M${exR + 7},${ey - 2} l5,-2 M${exR + 7},${ey + 1} l5,1.5`, .8, wc); }
  if (wr >= 3) { lqLine(g, `M${cx - W * .4},${top + Hh * .31} Q${cx},${top + Hh * .28} ${cx + W * .44},${top + Hh * .32}`, .9, wc); lqLine(g, `M${cx - W * .86},${top + Hh * .62} Q${cx - W * .66},${top + Hh * .74} ${cx - W * .7},${top + Hh * .86}`, 1, wc); lqLine(g, `M${cx + W * .8},${top + Hh * .6} Q${cx + W * .62},${top + Hh * .74} ${cx + W * .62},${top + Hh * .86}`, 1, wc); }
  // 须
  const bd = f.beard;
  if (bd) { lqLine(g, `M${mx - 8},${my - 2.6} Q${mx - 3},${my - 5} ${mx},${my - 3} Q${mx + 3},${my - 5} ${mx + 9},${my - 2.2}`, bd === 'full' ? 3 : 2.2);
    if (bd === 'goatee' || bd === 'short') for (let i = 0; i < 5; i++) lqLine(g, `M${mx - 4 + i * 2},${my + 4} Q${mx - 5 + i * 2},${my + (bd === 'short' ? 10 : 16)} ${mx - 3 + i * 2 + Math.sin(t * 1.4 + i) * .7},${my + (bd === 'short' ? 13 : 24)}`, 1.2);
    if (bd === 'full') g.fillStyle = ink, g.fill(P2(`M${cx - W * .9},${my - 6} Q${cx - W * .8},${my + 14} ${mx},${my + 20} Q${cx + W * .8},${my + 14} ${cx + W * .9},${my - 8} Q${mx},${my + 6} ${cx - W * .9},${my - 6} Z`)); }
  // —— 冠（在脸前）
  if (o.hair === 'mian') {
    lqShape(g, `M${cx - 22},${top + 8} L${cx - 18},${top - 22} L${cx + 22},${top - 24} L${cx + 26},${top + 8} C${cx + 10},${top + 1} ${cx - 10},${top + 1} ${cx - 22},${top + 8} Z`, LQ.BK, 2);
    lqShape(g, `M${cx - 50},${top - 30} L${cx + 54},${top - 38} L${cx + 54},${top - 28} L${cx - 50},${top - 20} Z`, LQ.BK, 2); lqLine(g, `M${cx - 48},${top - 26} L${cx + 52},${top - 34}`, 2, LQ.YE);
    for (let i = 0; i < 5; i++) { const sw = Math.sin(t * 2 + i) * 1.2; for (const [bx, byy] of [[cx - 48 + i * 4, top - 22], [cx + 36 + i * 4, top - 30]]) { lqLine(g, `M${bx},${byy} l${sw},26`, 1.1, LQ.YE); g.fillStyle = i % 2 ? LQ.RD : LQ.WH; g.beginPath(); g.arc(bx + sw, byy + 28, 2.2, 0, TAU); g.fill(); } }
  } else if (o.hair === 'guan') { lqShape(g, `M${cx - 12},${top + 6} L${cx - 10},${top - 16} L${cx + 14},${top - 18} L${cx + 16},${top + 6} Z`, LQ.BK, 2); lqLine(g, `M${cx - 18},${top - 6} L${cx + 22},${top - 8}`, 2.4, LQ.YE); }
  else if (o.hair === 'helm') { lqShape(g, `M${cx - W * 1.2},${top + Hh * .34} C${cx - W * 1.3},${top - 22} ${cx + W * 1.4},${top - 24} ${cx + W * 1.3},${top + Hh * .5} L${cx + W * .9},${top + Hh * .3} L${cx - W * .9},${top + Hh * .26} Z`, 'rgb(96,84,70)', 2.2); lqShape(g, `M${cx - 3},${top - 18} l3,-20 l4,20 Z`, LQ.RD, 1.5); }
  g.restore();
}
function lqWoman(g, x, y, s, t, o = {}) {
  const pal = o.pal || { robe: LQ.WH, skirt: LQ.GR, sleeve: LQ.YE, sash: LQ.RD, rib: LQ.RD }; o.pal = pal; o.age = o.age || 0;
  g.save(); g.translate(x, y); g.scale(s * (o.face || 1), s); g.lineJoin = 'round'; g.lineCap = 'round';
  const sway = Math.sin(t * 1.1 + (o.ph || 0)) * 1.2;
  if (o.age > 2) g.rotate(-.045);
  if (o.staff) lqLine(g, 'M-98,-250 L-86,0', 5, LQ.BR);
  // 后飘带
  if (!o.nun && !o.xb) { ribbon(g, 24, -206, 150, t, 1.3 + (o.ph || 0), pal.rib, 9, 1, .5); ribbon(g, 20, -214, 118, t, 3.1 + (o.ph || 0), pal.sleeve, 7, 1, .62); }
  // 后袖
  if (!o.xb) lqShape(g, `M20,-294 C52,-272 64,-232 58,-198 C72,-162 ${68 + sway},-120 ${52 + sway},-98 C38,-130 28,-180 22,-232 Z`, pal.sleeve);
  // 裙
  if (o.xb || o.nun) lqShape(g, 'M-32,-208 C-42,-150 -52,-70 -60,-6 Q0,8 62,-6 C56,-70 44,-150 30,-208 Z', pal.skirt);
  else lqShape(g, `M-34,-208 C-46,-150 -58,-70 -72,-6 Q-40,6 10,2 C60,0 ${112 + sway * 2},8 ${156 + sway * 3},-4 C112,-40 60,-120 30,-208 Z`, pal.skirt);
  for (const d of ['M-20,-190 C-28,-130 -36,-70 -48,-8', 'M0,-196 C0,-130 -2,-70 -8,-2', 'M18,-196 C30,-130 50,-60 84,-8']) lqLine(g, d, 1.1, 'rgba(26,17,13,.55)');
  if (!o.xb && !o.nun) { lqShape(g, 'M-76,-14 Q-40,-2 10,-6 C60,-8 110,-2 152,-12 L156,-4 C112,8 60,0 10,2 Q-40,6 -72,-6 Z', pal.sash, 1.6); }
  // 上身
  lqShape(g, 'M-31,-206 C-42,-242 -36,-282 -18,-302 L14,-304 C36,-286 40,-242 31,-206 Z', pal.robe);
  // 腰带与垂绅
  lqShape(g, 'M-35,-214 L31,-214 L32,-200 L-36,-200 Z', pal.sash, 2);
  lqShape(g, `M-14,-200 C-18,-150 -22,-100 ${-30 + sway},-52 L${-20 + sway},-50 C-12,-100 -8,-150 -4,-200 Z`, pal.sash, 1.8);
  // 领
  lqShape(g, 'M-18,-302 L-2,-256 L14,-304 L8,-304 L-2,-272 L-12,-302 Z', pal.collar || LQ.BK, 1.2);
  // 前袖 / 抱婴 / 持物
  if (o.nun) { lqShape(g, 'M-20,-300 C-10,-250 10,-214 34,-204 L32,-190 C4,-200 -22,-240 -34,-292 Z', pal.kasaya || LQ.OC, 2.2); }
  if (o.xb) lqShape(g, `M-24,-292 C-52,-282 -68,-256 -72,-232 L-58,-224 C-52,-212 -40,-206 -24,-208 C-14,-224 -10,-250 -8,-272 Z`, pal.sleeve);
  else lqShape(g, `M-22,-292 C-52,-284 -72,-262 -80,-238 L-72,-230 C-82,-196 ${-76 + sway},-150 ${-60 + sway},-122 C-44,-140 -24,-180 -8,-236 Z`, pal.sleeve);
  if (!o.xb) lqLine(g, `M-68,-214 C-72,-184 -68,-156 -60,-136`, 1.1, 'rgba(26,17,13,.55)');
  if (o.baby) { lqShape(g, 'M-106,-250 C-108,-272 -56,-282 -42,-262 C-34,-246 -56,-226 -88,-230 C-100,-232 -106,-240 -106,-250 Z', pal.baby || LQ.YE, 2.2); lqShape(g, 'M-113,-266 a12,12 0 1,0 24,0 a12,12 0 1,0 -24,0 Z', LQ.SK, 2); lqLine(g, 'M-106,-267 q2.5,-2 5,0 M-98,-267 q2.5,-2 5,0', 1.2); lqLine(g, 'M-86,-274 C-70,-266 -56,-254 -48,-240', 1.1, 'rgba(26,17,13,.6)'); }
  if (o.beads) { for (let i = 0; i < 9; i++) { const a = i / 9 * TAU; g.fillStyle = LQ.BR; g.beginPath(); g.arc(-80 + Math.cos(a) * 12, -200 + Math.sin(a) * 16, 3.2, 0, TAU); g.fill(); } }
  lqHead(g, o, t);
  g.restore();
}
function lqEmperor(g, x, y, s, t, o = {}) {
  const pal = o.pal || { robe: LQ.BK, sleeve: LQ.RD, panel: LQ.YE, trim: LQ.YE }; o.pal = pal;
  g.save(); g.translate(x, y); g.scale(s * (o.face || 1), s); g.lineJoin = 'round'; g.lineCap = 'round'; g.translate(0, 0); g.scale(o.wide || .86, 1);
  const sway = Math.sin(t * 1.0 + (o.ph || 0)) * 1.4;
  lqShape(g, `M38,-288 C86,-270 116,-228 122,-188 C132,-142 ${118 + sway},-96 ${96 + sway},-74 C78,-110 58,-170 36,-234 Z`, pal.sleeve);
  lqShape(g, 'M-62,-8 C-60,-120 -52,-220 -38,-292 L40,-294 C62,-220 76,-120 84,-8 Q10,8 -62,-8 Z', pal.robe);
  lqShape(g, 'M-66,-20 Q10,-4 88,-20 L84,-8 Q10,8 -62,-8 Z', pal.trim, 1.6);
  lqShape(g, 'M-22,-206 L-28,-44 L20,-44 L18,-206 Z', pal.panel, 2.2);
  for (let i = 0; i < 3; i++) lqLine(g, `M-14,${-170 + i * 44} q10,-12 20,0 q-10,12 -20,0`, 1.6, LQ.RD);
  lqShape(g, 'M-42,-222 L42,-224 L43,-206 L-43,-204 Z', pal.trim, 2);
  lqShape(g, `M-40,-286 C-94,-272 -126,-232 -136,-192 L-128,-182 C-140,-142 ${-130 + sway},-92 ${-104 + sway},-70 C-84,-100 -58,-160 -30,-232 Z`, pal.sleeve);
  lqShape(g, `M-134,-186 C-140,-150 -130,-110 -108,-82 L-104,-70 C-130,-92 -140,-142 -128,-182 Z`, pal.trim, 1.4);
  lqShape(g, 'M-20,-294 L-2,-246 L16,-296 L9,-296 L-2,-264 L-13,-294 Z', LQ.WH, 1.2);
  lqHead(g, Object.assign({ hair: 'mian', f: 'xiaowen' }, o, { xb: false, nun: false }), t);
  g.restore();
}
function lqChild(g, x, y, s, t, o = {}) { // 童子（幼帝）
  const pal = o.pal || { robe: LQ.YE, sleeve: LQ.RD }; g.save(); g.translate(x, y); g.scale(s * (o.face || 1), s); g.lineJoin = 'round'; g.lineCap = 'round';
  lqShape(g, 'M-40,-4 C-40,-70 -34,-120 -24,-150 L24,-150 C36,-120 44,-70 46,-4 Q4,8 -40,-4 Z', pal.robe);
  lqShape(g, 'M-24,-146 C-56,-136 -70,-110 -70,-86 C-58,-74 -40,-80 -30,-100 Z', pal.sleeve); lqShape(g, 'M24,-146 C54,-136 66,-110 66,-88 C54,-76 38,-82 30,-100 Z', pal.sleeve);
  lqShape(g, 'M-12,-150 L0,-120 L12,-150 L7,-150 L0,-132 L-7,-150 Z', LQ.BK, 1);
  lqShape(g, 'M0,-212 C-24,-212 -30,-192 -28,-178 C-26,-164 -14,-154 0,-154 C14,-154 26,-164 28,-178 C30,-192 24,-212 0,-212 Z', LQ.SK, 2.2);
  lqShape(g, 'M-26,-196 C-24,-218 24,-218 26,-196 C14,-206 -14,-206 -26,-196 Z', LQ.BK, 1.6);
  for (const cx of [-22, 22]) { g.fillStyle = LQ.BK; g.beginPath(); g.arc(cx, -214, 9, 0, TAU); g.fill(); }
  lqLine(g, 'M-14,-186 Q-9,-189 -4,-186', 1.6); lqLine(g, 'M4,-186 Q9,-189 14,-186', 1.6); lqLine(g, 'M-4,-170 Q0,-167 4,-170', 2, LQ.RD);
  g.restore();
}
/* 漆地 */
function lacquer(w, h, seed = 3) {
  const c = mk(w, h), g = c.getContext('2d'), im = g.createImageData(w, h), d = im.data;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const n = fbm(x / 160, y / 160, seed, 4), f = vn(x / 2.2, y / 7, 9), wr = fbm(x / 60, y / 60, 31, 3); let r = 164 + n * 30 - f * 10, gg = 36 + n * 12, b = 27 + n * 8; if (wr > .72) { const k = (wr - .72) / .28 * .45; r = r * (1 - k) + 60 * k; gg = gg * (1 - k) + 26 * k; b = b * (1 - k) + 20 * k; } const i = (y * w + x) * 4; d[i] = r; d[i + 1] = gg; d[i + 2] = b; d[i + 3] = 255; }
  g.putImageData(im, 0, 0); const r = rng(5); g.strokeStyle = 'rgba(30,10,8,.3)'; g.lineWidth = .8; for (let i = 0; i < 260; i++) { let x = r() * w, y = r() * h; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 5; k++) { x += (r() - .5) * 60; y += (r() - .3) * 40; g.lineTo(x, y); } g.stroke(); }
  return c;
}
function lqTag(g, cols, x, y, size = 30) { const h = Math.max(...cols.map(c => [...c].length)) * size * 1.14 + 18, w = (cols.length - 1) * size * 1.5 + size * 1.5; g.save(); g.fillStyle = LQ.YE; g.fillRect(x - w + size * .75, y - 9, w, h); g.strokeStyle = LQ.BK; g.lineWidth = 2.4; g.strokeRect(x - w + size * .75, y - 9, w, h); g.restore(); vtext(g, 99, { t0: 0, cols, x, y, size, color: LQ.BK, font: F.songb, gap: size * 1.5, lead: 1.14, fd: .01 }); }


/* ============================================================
   漆屏风道具：城、山、树、殿、帐、马、车、塔、碑、床、浪
   ============================================================ */
function lqHill(g, x, y, s, col = LQ.GR, a = 1) { g.save(); g.translate(x, y); g.scale(s, s); g.globalAlpha *= a; g.lineJoin = 'round';
  for (const [ox, h, w, c] of [[-70, 90, 70, LQ.OC], [60, 110, 80, col], [0, 150, 90, col]]) { lqShape(g, `M${ox - w},0 C${ox - w * .7},${-h * .5} ${ox - w * .4},${-h} ${ox},${-h} C${ox + w * .4},${-h} ${ox + w * .7},${-h * .5} ${ox + w},0 Z`, c, 2.4); lqLine(g, `M${ox - w * .3},${-h * .7} Q${ox - w * .1},${-h * .4} ${ox - w * .4},${-h * .1}`, 1.2, 'rgba(26,17,13,.6)'); lqLine(g, `M${ox + w * .2},${-h * .8} Q${ox + w * .4},${-h * .4} ${ox + w * .3},${-h * .1}`, 1.2, 'rgba(26,17,13,.6)'); }
  g.restore(); }
function lqTree(g, x, y, s, t, kind = 0, a = 1) { g.save(); g.translate(x, y); g.scale(s, s); g.globalAlpha *= a; g.lineCap = 'round'; const sw = Math.sin(t * 1.3 + x * .01) * 3;
  lqLine(g, `M0,0 C-4,-40 6,-80 ${sw * .5},-120`, 7, LQ.BK);
  if (kind === 0) for (const [ox, oy, r] of [[-34, -120, 30], [30, -128, 32], [0, -160, 36], [-20, -96, 22], [24, -98, 22]]) { g.beginPath(); g.arc(ox + sw, oy, r, Math.PI, 0); g.closePath(); g.fillStyle = LQ.GR; g.fill(); g.strokeStyle = LQ.BK; g.lineWidth = 2.2; g.stroke(); }
  else for (let i = -3; i <= 3; i++) { lqLine(g, `M${sw * .5},-118 C${i * 18},-150 ${i * 30 + sw},-100 ${i * 26 + sw * 2},${-40 + Math.abs(i) * 6}`, 2.2, LQ.YE); }
  g.restore(); }
function lqWall(g, x, y, w, h, a = 1, gate = .5) { g.save(); g.globalAlpha *= a; g.fillStyle = LQ.OC; g.strokeStyle = LQ.BK; g.lineWidth = 2.6; g.fillRect(x, y - h, w, h); g.strokeRect(x, y - h, w, h);
  for (let i = 0; i < w / 34; i++) { g.fillStyle = LQ.OC; g.fillRect(x + i * 34 + 4, y - h - 16, 20, 16); g.strokeRect(x + i * 34 + 4, y - h - 16, 20, 16); }
  g.strokeStyle = 'rgba(26,17,13,.4)'; g.lineWidth = 1; for (let j = 1; j < 4; j++) { g.beginPath(); g.moveTo(x, y - h * j / 4); g.lineTo(x + w, y - h * j / 4); g.stroke(); }
  if (gate != null) { const gx = x + w * gate; g.fillStyle = LQ.BK; g.beginPath(); g.moveTo(gx - 30, y); g.lineTo(gx - 30, y - h * .5); g.arc(gx, y - h * .5, 30, Math.PI, 0); g.lineTo(gx + 30, y); g.fill();
    lqShape(g, `M${gx - 70},${y - h - 16} L${gx - 54},${y - h - 70} L${gx + 54},${y - h - 70} L${gx + 70},${y - h - 16} Z`, LQ.YE, 2.4); lqShape(g, `M${gx - 90},${y - h - 70} Q${gx},${y - h - 110} ${gx + 90},${y - h - 70} L${gx + 76},${y - h - 62} L${gx - 76},${y - h - 62} Z`, LQ.BK, 2); }
  g.restore(); }
function lqHall(g, x, y, w, h, a = 1, o = {}) { g.save(); g.globalAlpha *= a; const n = o.n || 4, rc = o.roof || LQ.BK;
  lqShape(g, `M${x - 30},${y} L${x + w + 30},${y} L${x + w + 30},${y - 14} L${x - 30},${y - 14} Z`, LQ.OC, 2.2);
  for (let i = 0; i <= n; i++) { const px = x + w * i / n; g.fillStyle = LQ.BK; g.fillRect(px - 8, y - 14 - h, 16, h); g.fillStyle = LQ.YE; g.fillRect(px - 10, y - 14 - h, 20, 8); }
  lqShape(g, `M${x - 70},${y - 14 - h} Q${x + w / 2},${y - 44 - h} ${x + w + 70},${y - 14 - h} L${x + w + 30},${y - 60 - h} Q${x + w / 2},${y - 84 - h} ${x - 30},${y - 60 - h} Z`, rc, 2.6); lqLine(g, `M${x - 30},${y - 60 - h} Q${x + w / 2},${y - 84 - h} ${x + w + 30},${y - 60 - h}`, 4, LQ.YE);
  if (o.curtain) for (let i = 0; i < n; i++) { const a0 = x + w * i / n + 8, a1 = x + w * (i + 1) / n - 8; lqShape(g, `M${a0},${y - 14 - h + 8} Q${(a0 + a1) / 2},${y - 14 - h + 54} ${a1},${y - 14 - h + 8} Z`, o.curtain, 2); }
  g.restore(); }
function lqCanopy(g, x, y, s, t, a = 1) { g.save(); g.translate(x, y); g.scale(s, s); g.globalAlpha *= a; const sw = Math.sin(t * 1.2) * 2;
  lqLine(g, 'M0,0 L0,-470', 5, LQ.BK); lqShape(g, 'M-110,-440 Q0,-520 110,-440 L96,-430 Q0,-470 -96,-430 Z', LQ.YE, 2.4);
  for (let i = -4; i <= 4; i++) lqLine(g, `M${i * 24},${-434 + Math.abs(i) * 2} l${sw},26`, 3, i % 2 ? LQ.GR : LQ.WH); g.restore(); }
function lqHorse(g, x, y, s, t, o = {}) { g.save(); g.translate(x, y); g.scale(s * (o.face || 1), s); g.globalAlpha *= o.alpha ?? 1; g.lineJoin = 'round'; g.lineCap = 'round';
  const ph = t * 9 + (o.ph || 0), bob = Math.sin(ph) * 5, col = o.col || LQ.WH; g.translate(0, bob * .4);
  for (const [lx, p] of [[-70, 0], [-48, 1.6], [54, 3.1], [74, 4.7]]) { const a = Math.sin(ph + p) * .7; lqLine(g, `M${lx},-96 L${lx - Math.sin(a) * 40},${-52 + Math.cos(a) * 4} L${lx - Math.sin(a) * 40 - Math.sin(a + .6) * 36},${-8}`, 9, LQ.BK); }
  lqShape(g, 'M-96,-112 C-100,-152 -40,-160 0,-150 C40,-160 96,-156 98,-116 C98,-88 60,-84 0,-90 C-50,-84 -92,-86 -96,-112 Z', col, 2.6);
  lqShape(g, 'M-84,-132 C-110,-170 -122,-196 -128,-222 L-156,-214 C-176,-204 -182,-186 -168,-182 L-140,-190 C-128,-166 -110,-140 -92,-112 Z', col, 2.6);
  lqLine(g, 'M-128,-224 l-4,-18 l12,10', 3, LQ.BK); g.fillStyle = LQ.BK; g.beginPath(); g.arc(-150, -206, 3, 0, TAU); g.fill();
  lqLine(g, `M-118,-214 C-100,-190 -90,-160 -84,-140`, 7, LQ.BK);
  lqLine(g, `M96,-136 C${130 + Math.sin(ph) * 8},-140 ${138 + Math.sin(ph) * 10},-110 ${126 + Math.sin(ph) * 12},-84`, 8, LQ.BK);
  if (o.rider !== false) { lqShape(g, 'M-30,-150 C-34,-200 -20,-232 0,-238 C20,-232 30,-200 26,-150 Z', o.rc || LQ.BR, 2.4); lqShape(g, 'M-26,-150 L-34,-96 L-10,-92 L-4,-150 Z', LQ.BK, 2);
    g.save(); g.translate(0, 52); g.scale(.86, .86); lqHead(g, { f: 'soldier', hair: 'helm', pal: {} }, t); g.restore();
    lqLine(g, 'M-60,-286 L30,-120', 4, LQ.BK); lqShape(g, 'M-60,-286 l-10,-24 l18,10 Z', LQ.WH, 1.6); lqShape(g, 'M-52,-272 l34,-10 l-6,22 Z', o.flag || LQ.YE, 1.6); }
  g.restore(); }
function lqCart(g, x, y, s, t, o = {}) { g.save(); g.translate(x, y); g.scale(s * (o.face || 1), s); g.globalAlpha *= o.alpha ?? 1; g.lineJoin = 'round'; g.lineCap = 'round'; const ph = t * 3, jo = Math.sin(t * 5) * 1.5;
  // 牛
  for (const [lx, p] of [[-216, 0], [-196, 1.6], [-140, 3.1], [-122, 4.7]]) lqLine(g, `M${lx},-60 L${lx + Math.sin(ph + p) * 12},-4`, 8, LQ.BK);
  lqShape(g, 'M-230,-70 C-234,-104 -190,-112 -160,-106 C-130,-112 -108,-100 -108,-72 C-108,-52 -150,-52 -170,-56 C-200,-50 -228,-54 -230,-70 Z', LQ.OC, 2.6);
  lqShape(g, 'M-226,-92 C-246,-104 -262,-104 -268,-90 C-270,-76 -252,-70 -232,-72 Z', LQ.OC, 2.4); lqLine(g, 'M-256,-104 q-10,-14 4,-22', 3, LQ.BK);
  lqLine(g, 'M-120,-84 L-40,-74', 4, LQ.BK);
  // 车
  g.translate(0, jo); lqShape(g, 'M-50,-150 Q30,-200 110,-150 L110,-60 L-50,-60 Z', o.col || LQ.BK, 2.6); lqShape(g, 'M-50,-150 Q30,-200 110,-150 L104,-140 Q30,-184 -44,-140 Z', LQ.YE, 2);
  lqShape(g, 'M-30,-136 L10,-146 L10,-70 L-30,-70 Z', o.win || LQ.GR, 2);
  g.translate(40, -40 - jo); g.rotate(t * 2); g.strokeStyle = LQ.BK; g.lineWidth = 6; g.beginPath(); g.arc(0, 0, 40, 0, TAU); g.stroke(); g.fillStyle = LQ.YE; g.beginPath(); g.arc(0, 0, 8, 0, TAU); g.fill(); g.lineWidth = 3; for (let i = 0; i < 8; i++) { g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(i * TAU / 8) * 40, Math.sin(i * TAU / 8) * 40); g.stroke(); }
  g.restore(); }
function lqTent(g, x, y, s, a = 1) { g.save(); g.translate(x, y); g.scale(s, s); g.globalAlpha *= a; lqShape(g, 'M-170,0 L-120,-150 Q0,-250 120,-150 L170,0 Z', LQ.WH, 2.8); lqShape(g, 'M-120,-150 Q0,-250 120,-150 Q0,-190 -120,-150 Z', LQ.OC, 2.4); lqShape(g, 'M-40,0 L-30,-120 Q0,-140 30,-120 L40,0 Z', LQ.BK, 2); lqLine(g, 'M0,-208 l0,-40', 4, LQ.BK); lqShape(g, 'M0,-248 l40,10 l-40,12 Z', LQ.YE, 1.6); g.restore(); }
function lqPagoda(g, x, y, s, a = 1, n = 5) { g.save(); g.translate(x, y); g.scale(s, s); g.globalAlpha *= a; let w = 150, yy = 0;
  for (let i = 0; i < n; i++) { const h = 56 - i * 4; lqShape(g, `M${-w / 2 + 12},${yy} L${-w / 2 + 12},${yy - h} L${w / 2 - 12},${yy - h} L${w / 2 - 12},${yy} Z`, i % 2 ? LQ.WH : LQ.OC, 2.2); g.fillStyle = LQ.BK; g.fillRect(-9, yy - h + 12, 18, h - 12);
    lqShape(g, `M${-w / 2 - 14},${yy - h + 4} Q0,${yy - h - 12} ${w / 2 + 14},${yy - h + 4} L${w / 2 - 6},${yy - h - 14} L${-w / 2 + 6},${yy - h - 14} Z`, LQ.BK, 2); yy -= h + 14; w *= .82; }
  lqLine(g, `M0,${yy} l0,-60`, 5, LQ.YE); for (let k = 0; k < 4; k++) { g.fillStyle = LQ.YE; g.beginPath(); g.ellipse(0, yy - 10 - k * 12, 10 - k * 2, 4, 0, 0, TAU); g.fill(); } g.restore(); }
let STELE = null;
function makeStele() { // 墓志：志题为真字，其余以刻痕代字
  const n = 26, cw = 16, pad = 22, S2 = n * cw + pad * 2, c = mk(S2, S2), g = c.getContext('2d'), r = rng(77);
  g.fillStyle = 'rgb(44,40,36)'; g.fillRect(0, 0, S2, S2); const im = g.getImageData(0, 0, S2, S2), d = im.data;
  for (let i = 0; i < S2 * S2; i++) { const v = 34 + fbm((i % S2) / 40, Math.floor(i / S2) / 40, 5, 3) * 30 + (hash2(i % S2, Math.floor(i / S2), 3) - .5) * 14; d[i * 4] = v; d[i * 4 + 1] = v * .97; d[i * 4 + 2] = v * .92; } g.putImageData(im, 0, 0);
  g.strokeStyle = 'rgba(230,222,200,.14)'; g.lineWidth = 1; for (let i = 0; i <= n; i++) { g.beginPath(); g.moveTo(pad + i * cw, pad); g.lineTo(pad + i * cw, S2 - pad); g.stroke(); g.beginPath(); g.moveTo(pad, pad + i * cw); g.lineTo(S2 - pad, pad + i * cw); g.stroke(); }
  const cells = []; const title = [...'魏故比丘尼统慈庆墓志铭'];
  for (let col = 0; col < n; col++) for (let row = 0; row < n; row++) { if (col === 0 && row >= title.length) continue; if (col === n - 1 && row > 8) continue; cells.push([col, row, col === 0 ? title[row] : null, r()]); }
  return { c, n, cw, pad, S2, cells }; }
function lqStele(g, x, y, size, lit, t, a = 1) { // lit 0..1：已读到的比例
  if (!STELE) STELE = makeStele(); const S = STELE, k = size / S.S2; g.save(); g.globalAlpha *= a; g.translate(x - size / 2, y - size); g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(10, 12, size, size); g.drawImage(S.c, 0, 0, size, size); g.strokeStyle = LQ.BK; g.lineWidth = 3; g.strokeRect(0, 0, size, size);
  g.scale(k, k); const N = S.cells.length, upto = lit * N; g.lineCap = 'round';
  for (let i = 0; i < N; i++) { const [col, row, ch, rv] = S.cells[i], cx = S.S2 - S.pad - col * S.cw - S.cw / 2, cy = S.pad + row * S.cw + S.cw / 2, on = clamp(upto - i), br = .22 + .7 * on;
    if (ch) { g.font = `${S.cw * .9}px ${F.songb}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = `rgba(236,228,206,${br})`; g.fillText(ch, cx, cy + .5); }
    else { g.strokeStyle = `rgba(236,228,206,${br})`; g.lineWidth = 1.5; const r2 = rng(Math.floor(rv * 1e6)); g.beginPath(); for (let s = 0; s < 3; s++) { const ax = cx + (r2() - .5) * 9, ay = cy + (r2() - .5) * 9; g.moveTo(ax, ay); g.lineTo(ax + (r2() - .5) * 8, ay + (r2() - .5) * 8); } g.stroke(); } }
  g.restore(); }
function lqBed(g, x, y, s, a = 1) { g.save(); g.translate(x, y); g.scale(s, s); g.globalAlpha *= a; lqShape(g, 'M-170,0 L-170,-44 L170,-44 L170,0 Z', LQ.BK, 2.4); lqShape(g, 'M-176,-44 L-176,-56 L176,-56 L176,-44 Z', LQ.YE, 2); for (const lx of [-150, 150]) { g.fillStyle = LQ.BK; g.fillRect(lx - 8, 0, 16, 16); } g.restore(); }
function lqWaves(g, x0, x1, y, h, t, a = 1) { g.save(); g.globalAlpha *= a; g.beginPath(); g.moveTo(x0, y + 40);
  for (let x = x0; x <= x1; x += 8) g.lineTo(x, y - h + Math.sin(x * .02 + t * 2) * 14 + Math.sin(x * .047 - t * 1.4) * 8); g.lineTo(x1, y + 40); g.closePath(); g.fillStyle = LQ.OC; g.fill(); g.strokeStyle = LQ.BK; g.lineWidth = 2.6; g.stroke();
  g.strokeStyle = LQ.BK; g.lineWidth = 2; for (let k = 0; k < 14; k++) { const cx = x0 + ((k * 151 + t * 60) % (x1 - x0)), cy = y - h * .45 + (k % 3) * 22; g.beginPath(); g.arc(cx, cy, 16, Math.PI * .1, Math.PI * 1.5); g.stroke(); g.beginPath(); g.arc(cx + 5, cy + 2, 8, Math.PI * .2, Math.PI * 1.6); g.stroke(); }
  g.restore(); }
function lqMound(g, x, y, s, a = 1) { g.save(); g.translate(x, y); g.scale(s, s); g.globalAlpha *= a; lqShape(g, 'M-160,0 C-140,-110 -60,-150 0,-150 C60,-150 140,-110 160,0 Z', LQ.GR, 2.6); lqShape(g, 'M-30,0 L-30,-60 Q0,-84 30,-60 L30,0 Z', LQ.BK, 2); g.restore(); }
function lqPot(g, x, y, s, t, a = 1) { g.save(); g.translate(x, y); g.scale(s, s); g.globalAlpha *= a; lqShape(g, 'M-26,0 C-40,-20 -34,-50 -14,-54 L14,-54 C34,-50 40,-20 26,0 Z', LQ.BK, 2); lqLine(g, 'M-20,-54 L20,-54', 5, LQ.YE); for (const lx of [-18, 0, 18]) lqLine(g, `M${lx},0 l${lx * .2},18`, 4, LQ.BK);
  for (let i = 0; i < 3; i++) { const p = (t * .5 + i / 3) % 1; g.globalAlpha = a * (1 - p) * .9; lqLine(g, `M${-8 + i * 8},${-60 - p * 60} q10,-12 0,-24 q-10,-12 0,-24`, 2.4, LQ.WH); } g.restore(); }
function lqLying(g, x, y, s, t, o = {}) { g.save(); g.translate(x, y); g.scale(s, s); g.globalAlpha *= o.alpha ?? 1; const br = Math.sin(t * 1.6) * 2;
  lqShape(g, `M-110,-56 C-110,${-96 + br} 60,${-100 + br} 150,-70 L150,-56 Z`, LQ.GY, 2.4); lqShape(g, 'M-166,-56 C-166,-80 -120,-84 -112,-60 Z', LQ.WH, 2);
  g.save(); g.translate(-134, -62); g.rotate(-Math.PI / 2 + .12); g.scale(.86, .86); g.translate(0, 300); lqHead(g, { f: 'wz86', nun: true, pal: {} }, t); g.restore(); g.restore(); }

/* ============ 环境：云气、日月、宫殿陈设、战场、寺院 ============ */
function lqCloud(g, x, y, s, a = 1, col = LQ.YE) { g.save(); g.translate(x, y); g.scale(s, s); g.globalAlpha *= a; g.lineCap = 'round'; g.strokeStyle = col; g.lineWidth = 3.2;
  for (const [ox, oy, r] of [[0, 0, 22], [38, -8, 16], [-36, 6, 15]]) { g.beginPath(); g.arc(ox, oy, r, Math.PI * .9, Math.PI * 2.6); g.stroke(); g.beginPath(); g.arc(ox + r * .25, oy + r * .1, r * .5, Math.PI * 1.1, Math.PI * 2.7); g.stroke(); }
  g.beginPath(); g.moveTo(-60, 16); g.bezierCurveTo(-110, 20, -130, 6, -170, 14); g.stroke(); g.beginPath(); g.moveTo(54, 4); g.bezierCurveTo(90, 12, 110, -2, 150, 6); g.stroke(); g.restore(); }
function lqClouds(g, reg, t, a = 1, n = 4, col = LQ.YE) { const y0 = reg === 1 ? 110 : 530; for (let k = 0; k < n; k++) { const x = ((k * 520 + 300 + t * (9 + k * 3)) % 1900) + 150; lqCloud(g, x, y0 + (k % 2) * 46 + Math.sin(t * .3 + k) * 4, .8 + (k % 3) * .2, a * .75, col); } }
function lqDisc(g, x, y, r, col = LQ.YE, a = 1) { g.save(); g.globalAlpha *= a; g.fillStyle = col; g.strokeStyle = LQ.BK; g.lineWidth = 2.4; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.stroke(); g.restore(); }
function lqFloor(g, G, kind, a = 1, x0 = 196, x1 = 1864) { g.save(); g.globalAlpha *= a;
  if (kind === 'tile') { g.fillStyle = LQ.BK; g.fillRect(x0, G + 2, x1 - x0, 20); g.fillStyle = LQ.YE; for (let x = x0 + 14; x < x1; x += 40) { g.beginPath(); g.moveTo(x, G + 12); g.lineTo(x + 10, G + 5); g.lineTo(x + 20, G + 12); g.lineTo(x + 10, G + 19); g.closePath(); g.fill(); } g.fillRect(x0, G + 2, x1 - x0, 2); }
  else if (kind === 'earth') { g.strokeStyle = 'rgba(26,17,13,.7)'; g.lineWidth = 2; g.lineCap = 'round'; const r = rng(G * 7 + 3); for (let i = 0; i < 70; i++) { const x = x0 + r() * (x1 - x0), y = G + 6 + r() * 12; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 10 + r() * 30, y); g.stroke(); } }
  else if (kind === 'grass') { g.strokeStyle = LQ.GR; g.lineWidth = 2.6; g.lineCap = 'round'; const r = rng(G * 5 + 1); for (let i = 0; i < 60; i++) { const x = x0 + r() * (x1 - x0); for (let k = -1; k <= 1; k++) { g.beginPath(); g.moveTo(x, G + 4); g.lineTo(x + k * 6, G - 8 - r() * 8); g.stroke(); } } }
  g.restore(); }
function lqThrone(g, x, y, s, a = 1) { g.save(); g.translate(x, y); g.scale(s, s); g.globalAlpha *= a; g.lineJoin = 'round';
  // 身后屏风
  for (let i = -1; i <= 1; i++) { lqShape(g, `M${i * 150 - 72},-60 L${i * 150 - 72},-420 L${i * 150 + 72},-420 L${i * 150 + 72},-60 Z`, i ? LQ.BK : LQ.BR, 2.6); lqShape(g, `M${i * 150 - 58},-80 L${i * 150 - 58},-400 L${i * 150 + 58},-400 L${i * 150 + 58},-80 Z`, null, 2, LQ.YE);
    for (let k = 0; k < 3; k++) { g.strokeStyle = LQ.YE; g.lineWidth = 2.4; g.beginPath(); g.arc(i * 150, -330 + k * 90, 22, Math.PI * .9, Math.PI * 2.5); g.stroke(); g.beginPath(); g.arc(i * 150 + 6, -326 + k * 90, 10, Math.PI * 1.1, Math.PI * 2.6); g.stroke(); } }
  // 台基与阶
  lqShape(g, 'M-260,0 L-240,-60 L240,-60 L260,0 Z', LQ.OC, 2.6); lqShape(g, 'M-240,-60 L240,-60 L240,-72 L-240,-72 Z', LQ.YE, 2);
  for (let k = 1; k < 3; k++) lqLine(g, `M${-260 + k * 7},${-k * 20} L${260 - k * 7},${-k * 20}`, 1.6, 'rgba(26,17,13,.6)');
  g.restore(); }
function lqLamp(g, x, y, s, t, a = 1) { g.save(); g.translate(x, y); g.scale(s, s); g.globalAlpha *= a; lqLine(g, 'M0,0 L0,-200', 6, LQ.BK); lqShape(g, 'M-26,0 L26,0 L16,-14 L-16,-14 Z', LQ.BK, 2); lqShape(g, 'M-24,-200 L24,-200 L14,-186 L-14,-186 Z', LQ.YE, 2);
  const f = Math.sin(t * 9 + x) * 3; lqShape(g, `M-9,-202 Q${-12 + f},-226 ${f * .6},-246 Q${12 + f},-226 9,-202 Z`, LQ.YE, 1.6); lqShape(g, `M-4,-204 Q${f * .4},-220 ${f * .3},-230 Q4,-218 4,-204 Z`, LQ.WH, 0); g.restore(); }
function lqBanner(g, x, y, s, t, col = LQ.YE, a = 1, face = 1) { g.save(); g.translate(x, y); g.scale(s * face, s); g.globalAlpha *= a; lqLine(g, 'M0,0 L0,-330', 6, LQ.BK);
  g.beginPath(); g.moveTo(0, -326); for (let i = 0; i <= 10; i++) g.lineTo(i * 12, -326 + Math.sin(i * .9 - t * 5) * (2 + i)); for (let i = 10; i >= 0; i--) g.lineTo(i * 12, -236 + Math.sin(i * .9 - t * 5 + .6) * (2 + i)); g.closePath(); g.fillStyle = col; g.fill(); g.strokeStyle = LQ.BK; g.lineWidth = 2.4; g.stroke();
  lqShape(g, 'M-8,-330 l8,-22 l8,22 Z', LQ.WH, 1.6); g.restore(); }
function lqFire(g, x, y, s, t, a = 1) { g.save(); g.translate(x, y); g.scale(s, s); g.globalAlpha *= a;
  for (let k = 0; k < 5; k++) { const f = Math.sin(t * 7 + k * 1.7) * 10, h = 90 + (k % 3) * 40 + Math.sin(t * 5 + k) * 14, ox = (k - 2) * 26; lqShape(g, `M${ox - 22},0 Q${ox - 26 + f},${-h * .5} ${ox + f * .8},${-h} Q${ox + 26 + f},${-h * .5} ${ox + 22},0 Z`, k % 2 ? LQ.YE : LQ.OC, 2); lqShape(g, `M${ox - 9},0 Q${ox + f * .4},${-h * .4} ${ox + f * .4},${-h * .6} Q${ox + 10},${-h * .3} ${ox + 9},0 Z`, LQ.WH, 0); }
  for (let k = 0; k < 4; k++) { const p = (t * .35 + k / 4) % 1; g.globalAlpha = a * (1 - p) * .8; g.strokeStyle = LQ.BK; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); const sx = (k - 1.5) * 30 + Math.sin(p * 6 + k) * 20, sy = -150 - p * 220; g.arc(sx, sy, 18 + p * 16, Math.PI * .2, Math.PI * 1.7); g.stroke(); }
  g.restore(); }
function lqArrows(g, x0, x1, y0, y1, t, n = 14, a = 1) { g.save(); g.globalAlpha *= a; g.lineCap = 'round';
  for (let k = 0; k < n; k++) { const p = ((t * .9 + k / n + hash2(k, 3, 5) * .3) % 1), x = lerp(x0, x1, p) + (hash2(k, 1, 9) - .5) * 300, y = lerp(y0, y1, p) - Math.sin(p * Math.PI) * 120 + (hash2(k, 2, 9) - .5) * 90, an = Math.atan2(y1 - y0 + Math.cos(p * Math.PI) * -120 * Math.PI, x1 - x0);
    g.save(); g.translate(x, y); g.rotate(an); g.strokeStyle = LQ.BK; g.lineWidth = 3; g.beginPath(); g.moveTo(-34, 0); g.lineTo(0, 0); g.stroke(); g.fillStyle = LQ.WH; g.beginPath(); g.moveTo(0, 0); g.lineTo(-10, -4); g.lineTo(-10, 4); g.fill(); g.strokeStyle = LQ.YE; g.lineWidth = 2; g.beginPath(); g.moveTo(-34, 0); g.lineTo(-42, -5); g.moveTo(-34, 0); g.lineTo(-42, 5); g.stroke(); g.restore(); }
  g.restore(); }
function lqSoldier(g, x, y, s, t, o = {}) { g.save(); g.translate(x, y); g.scale(s * (o.face || 1), s); g.globalAlpha *= o.alpha ?? 1; g.lineJoin = 'round'; g.lineCap = 'round';
  if (o.fallen) { g.rotate(Math.PI / 2 * .92); g.translate(-10, -40); }
  lqLine(g, 'M-58,10 L-40,-420', 5, LQ.BK); lqShape(g, 'M-40,-420 l-9,-34 l18,6 Z', LQ.WH, 1.8); if (o.flag) lqShape(g, 'M-42,-400 l48,-10 l-8,34 Z', o.flag, 1.8);
  for (const lx of [-20, 14]) lqShape(g, `M${lx},-130 L${lx - 4},0 L${lx + 22},0 L${lx + 20},-130 Z`, LQ.BK, 2);
  lqShape(g, 'M-40,-120 C-46,-200 -40,-270 -22,-300 L22,-300 C40,-270 46,-200 40,-120 Z', o.col || LQ.OC, 2.6);
  for (let r = 0; r < 5; r++) for (let c = -2; c <= 2; c++) { g.strokeStyle = 'rgba(26,17,13,.7)'; g.lineWidth = 1.4; g.beginPath(); g.arc(c * 14 + (r % 2) * 7, -270 + r * 30, 8, 0, Math.PI); g.stroke(); }
  lqShape(g, 'M-44,-130 L44,-130 L44,-116 L-44,-116 Z', LQ.BK, 2); lqShape(g, 'M-24,-296 C-50,-286 -60,-256 -62,-232 L-48,-226 C-44,-250 -34,-270 -18,-280 Z', o.col || LQ.OC, 2.2);
  lqHead(g, { f: 'soldier', hair: 'helm', pal: {} }, t); g.restore(); }
function lqQue(g, x, y, s, a = 1) { // 宫阙
  g.save(); g.translate(x, y); g.scale(s, s); g.globalAlpha *= a; for (const ox of [-150, 150]) { lqShape(g, `M${ox - 46},0 L${ox - 36},-300 L${ox + 36},-300 L${ox + 46},0 Z`, LQ.OC, 2.6); lqShape(g, `M${ox - 70},-300 Q${ox},-336 ${ox + 70},-300 L${ox + 54},-330 Q${ox},-356 ${ox - 54},-330 Z`, LQ.BK, 2.2); lqLine(g, `M${ox - 54},-330 Q${ox},-356 ${ox + 54},-330`, 4, LQ.YE); for (let k = 1; k < 5; k++) lqLine(g, `M${ox - 44 + k * 1.6},${-k * 60} L${ox + 44 - k * 1.6},${-k * 60}`, 1.2, 'rgba(26,17,13,.5)'); }
  lqShape(g, 'M-104,0 L-104,-190 L104,-190 L104,0 Z', LQ.BK, 2.6); lqShape(g, 'M-70,0 L-70,-130 Q0,-176 70,-130 L70,0 Z', LQ.RD, 2.4); lqLine(g, 'M0,0 L0,-152', 3, LQ.BK); for (const [dx, dy] of [[-36, -60], [-36, -100], [36, -60], [36, -100]]) { g.fillStyle = LQ.YE; g.beginPath(); g.arc(dx, dy, 6, 0, TAU); g.fill(); }
  lqShape(g, 'M-130,-190 Q0,-236 130,-190 L110,-226 Q0,-262 -110,-226 Z', LQ.BK, 2.2); lqLine(g, 'M-110,-226 Q0,-262 110,-226', 4, LQ.YE); g.restore(); }
function lqIncense(g, x, y, s, t, a = 1) { g.save(); g.translate(x, y); g.scale(s, s); g.globalAlpha *= a; lqShape(g, 'M-40,-40 C-56,-70 -40,-104 0,-104 C40,-104 56,-70 40,-40 Z', LQ.OC, 2.4); lqShape(g, 'M-46,-40 L46,-40 L34,-26 L-34,-26 Z', LQ.BK, 2); for (const lx of [-28, 0, 28]) lqLine(g, `M${lx},-26 l${lx * .2},26`, 5, LQ.BK); lqShape(g, 'M-18,-104 Q0,-136 18,-104 Z', LQ.YE, 2);
  g.lineCap = 'round'; for (let i = 0; i < 2; i++) { g.strokeStyle = LQ.WH; g.lineWidth = 3; g.globalAlpha = a * .8; g.beginPath(); for (let k = 0; k <= 30; k++) { const u = k / 30, px = (i ? 8 : -8) + Math.sin(u * 7 + t * 1.6 + i * 2) * (6 + u * 26), py = -134 - u * 220; k ? g.lineTo(px, py) : g.moveTo(px, py); } g.stroke(); } g.restore(); }
function lqBuddha(g, x, y, s, a = 1) { g.save(); g.translate(x, y); g.scale(s, s); g.globalAlpha *= a; lqShape(g, 'M-120,0 L-120,-190 C-120,-300 120,-300 120,-190 L120,0 Z', LQ.BK, 2.6); lqShape(g, 'M-104,0 L-104,-186 C-104,-280 104,-280 104,-186 L104,0 Z', LQ.BR, 2);
  g.fillStyle = LQ.YE; g.beginPath(); g.arc(0, -196, 54, 0, TAU); g.fill(); g.strokeStyle = LQ.BK; g.lineWidth = 2; g.stroke();
  lqShape(g, 'M-70,-20 C-80,-70 -50,-150 -26,-160 L26,-160 C50,-150 80,-70 70,-20 Q0,-4 -70,-20 Z', LQ.OC, 2.4); lqShape(g, 'M-86,-18 Q0,10 86,-18 L78,-4 Q0,22 -78,-4 Z', LQ.YE, 2);
  lqShape(g, 'M0,-232 C-24,-232 -28,-208 -24,-190 C-20,-172 20,-172 24,-190 C28,-208 24,-232 0,-232 Z', LQ.SK, 2.2); lqShape(g, 'M-12,-232 Q0,-252 12,-232 Z', LQ.BK, 1.6); lqLine(g, 'M-12,-204 q5,3 10,0 M2,-204 q5,3 10,0', 1.6); lqLine(g, 'M-5,-188 q5,3 10,0', 1.8, LQ.RD); lqLine(g, 'M-20,-110 Q0,-90 20,-110', 2); g.restore(); }
function lqHouse(g, x, y, w, h, a = 1) { g.save(); g.globalAlpha *= a; lqShape(g, `M${x},${y} L${x},${y - h} L${x + w},${y - h} L${x + w},${y} Z`, LQ.WH, 2.6); lqShape(g, `M${x - 40},${y - h} L${x + w * .5},${y - h - 90} L${x + w + 40},${y - h} Z`, LQ.BK, 2.6); lqLine(g, `M${x - 40},${y - h} L${x + w + 40},${y - h}`, 5, LQ.YE);
  lqShape(g, `M${x + w * .36},${y} L${x + w * .36},${y - h * .72} L${x + w * .64},${y - h * .72} L${x + w * .64},${y} Z`, LQ.BK, 2); for (const k of [.12, .76]) { lqShape(g, `M${x + w * k},${y - h * .3} L${x + w * k},${y - h * .7} L${x + w * (k + .12)},${y - h * .7} L${x + w * (k + .12)},${y - h * .3} Z`, LQ.GR, 2); } g.restore(); }

const G1 = 430, G2 = 908, X0 = 210, X1 = 1850, S1 = .76, S2 = .92;
let YEARTXT = '', CHTXT = '';
let TT = 0, BG = null, WEAR = null, TMP = null, TMPG = null, VIG2 = null;
const A_ = i => beat(i).a, B_ = i => beat(i).b;
const vis = (i, j = i, fi = .6, fo = .6) => ss(A_(i) - .15, A_(i) - .15 + fi, TT) * (1 - ss(B_(j) + .25, B_(j) + .25 + fo, TT));
const from = (i, d = .6, off = 0) => ss(A_(i) + off, A_(i) + off + d, TT);
const upto = (i, d = .6, off = 0) => 1 - ss(B_(i) + off, B_(i) + off + d, TT);
const pr = i => clamp((TT - A_(i)) / (B_(i) - A_(i)));
const eio = x => { x = clamp(x); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const mv = (a, b, t0, d) => lerp(a, b, eio((TT - t0) / d));
function AL(g, a, fn) { if (a <= .004) return; if (a >= .995) { fn(g); return; } TMPG.setTransform(1, 0, 0, 1, 0, 0); TMPG.clearRect(0, 0, W, H); fn(TMPG); g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = a; g.drawImage(TMP, 0, 0); g.restore(); }
const wom = (g, x, G, s, o, a = 1) => AL(g, a, q => lqWoman(q, x, G, s, TT, o));
const emp = (g, x, G, s, o, a = 1) => AL(g, a, q => lqEmperor(q, x, G, s, TT, o));
const kid = (g, x, G, s, o, a = 1) => AL(g, a, q => lqChild(q, x, G, s, TT, o));
function tag(g, cols, x, y, size, a, src) { if (a <= .004) return; if (src) y += 34; AL(g, a, q => { lqTag(q, cols, x, y, size); if (src) { const w = (cols.length - 1) * size * 1.5 + size * 1.5; q.save(); q.fillStyle = LQ.BK; q.fillRect(x - w + size * .75, y - 9 - 30, w, 28); q.font = `20px ${F.songb}`; q.fillStyle = LQ.YE; q.textAlign = 'center'; q.textBaseline = 'middle'; q.fillText(src, x - w / 2 + size * .75, y - 9 - 15); q.restore(); } }); }
function veil(g, reg, a) { if (a <= 0) return; g.save(); g.fillStyle = `rgba(22,10,8,${a})`; if (reg === 1) g.fillRect(X0 - 14, 58, X1 - X0 + 28, 388); else g.fillRect(X0 - 14, 472, X1 - X0 + 28, 456); g.restore(); }
function clipReg(g, reg) { g.beginPath(); if (reg === 1) g.rect(X0 - 14, 58, X1 - X0 + 28, 388); else g.rect(X0 - 14, 472, X1 - X0 + 28, 456); g.clip(); }
function groundLine(g, G) { g.save(); g.strokeStyle = 'rgba(26,17,13,.55)'; g.lineWidth = 2; g.beginPath(); g.moveTo(X0, G + 4); g.lineTo(X1, G + 4); g.stroke(); g.restore(); }

const PAL = {
  wzY: { robe: LQ.WH, skirt: LQ.GR, sleeve: LQ.YE, sash: LQ.BK, rib: LQ.WH }, maid: { robe: LQ.BR, skirt: LQ.BR, sleeve: LQ.OC, sash: LQ.BK, hat: LQ.BK },
  nurse: { robe: LQ.GR, skirt: LQ.WH, sleeve: LQ.WH, sash: LQ.YE, rib: LQ.YE }, nun: { robe: LQ.GY, skirt: LQ.GY, sleeve: LQ.GY, sash: LQ.BR, kasaya: LQ.OC },
  gao: { robe: LQ.YE, skirt: LQ.WH, sleeve: LQ.GR, sash: LQ.GR, rib: LQ.GR }, gaoX: { robe: LQ.YE, skirt: LQ.YE, sleeve: LQ.GR, sash: LQ.BK, hat: LQ.GR },
  feng: { robe: LQ.BK, skirt: LQ.BK, sleeve: LQ.BR, sash: LQ.YE, rib: LQ.YE, collar: LQ.YE }, hu: { robe: LQ.WH, skirt: LQ.OC, sleeve: LQ.GR, sash: LQ.YE, rib: LQ.WH },
  fz: { robe: LQ.BK, skirt: LQ.OC, sleeve: LQ.WH, sash: LQ.YE, rib: LQ.YE, collar: LQ.YE }, gy: { robe: LQ.OC, skirt: LQ.BK, sleeve: LQ.YE, sash: LQ.WH, rib: LQ.WH },
  white: { robe: LQ.WH, skirt: LQ.WH, sleeve: LQ.WH, sash: LQ.GY, rib: LQ.WH }, old: { robe: LQ.GY, skirt: LQ.BR, sleeve: LQ.WH, sash: LQ.BK, hat: LQ.BK },
  eXW: { robe: LQ.BK, sleeve: LQ.BR, panel: LQ.YE, trim: LQ.YE }, eXU: { robe: LQ.OC, sleeve: LQ.BK, panel: LQ.WH, trim: LQ.BK }, eXM: { robe: LQ.YE, sleeve: LQ.GR, panel: LQ.WH, trim: LQ.BK },
  eXN: { robe: LQ.GR, sleeve: LQ.BK, panel: LQ.YE, trim: LQ.YE }, sch: { robe: LQ.GR, sleeve: LQ.WH, panel: LQ.GR, trim: LQ.BK }, kidY: { robe: LQ.YE, sleeve: LQ.GR }
};
FACE.wz58 = Object.assign({}, FACE.wz45, { wr: 2, brow: 'sad' }); FACE.gaoying = { fw: 1.0, len: 1.0, jaw: .55, eye: 'phoenix', brow: 'flat', mouth: 'frown', blush: .2 };
FACE.hulv = { fw: 1.08, len: 1.02, jaw: .5, eye: 'old', brow: 'grey', mouth: 'thin', wr: 2, grey: true };
PAL.hulv = { robe: LQ.BK, skirt: LQ.BK, sleeve: LQ.OC, sash: LQ.YE, hat: LQ.OC }; PAL.bm = { robe: LQ.GR, skirt: LQ.GR, sleeve: LQ.WH, sash: LQ.BK, hat: LQ.WH }; FACE.plain = { fw: 1.0, len: 1.0, jaw: .4, eye: 'open', brow: 'soft', mouth: 'thin' };
FACE.li = { fw: .96, len: 1.0, jaw: .2, eye: 'low', brow: 'sad', mouth: 'red' };


function frame(g) {
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
  for (const y of [36, 446, 928]) { g.fillStyle = LQ.BK; g.fillRect(40, y, 1840, 24); g.fillStyle = LQ.YE; g.fillRect(40, y + 10, 1840, 3); }
  g.fillStyle = LQ.BK; g.fillRect(40, 36, 20, 916); g.fillRect(1860, 36, 20, 916); g.fillRect(186, 60, 8, 386); g.fillRect(186, 470, 8, 458);
  g.restore();
}
/* ====== 接合：把旧片画法接到工坊（手写） ====== */
/* 用法（两条线并行：上栏大人物/大时代，下栏小人物）：
   screen(t, [ {at:0, draw:G=>{...}}, {at:换屏时刻, draw:G=>{...}} ], { side:{ top:{badge:'帝', a:'孝文帝', b:'太和七年'}, bottom:{badge:'婢', a:'王钟儿', b:'四十五岁'} }, year:'公元 四八三 年', chapter:'叁 保母' })
   每一屏的 draw 里：G.save(); clipReg(G,1); …上栏（地面 G1）…; G.restore();  G.save(); clipReg(G,2); groundLine(G,G2); …下栏（地面 G2）…; G.restore();
   定时按旁白句子走：from('a3') 这句开始后淡入；upto('a5') 这句结束后淡出；vis('a3','a5') 从 a3 显到 a5；pr('a3') 这句念到哪了 0..1；mv(起,止,时刻,时长) 平移
   人物：wom / emp / kid(G, x, 地面, 大小, {f:脸, pal:PAL.xx, age, …}, 透明度)；标签 tag(G, ['孝文帝'], x, y, 字号, 透明度)；字幕由工坊的字幕落在底栏里 */
let BEATS = [];
function beat(i) { const v = typeof i === 'number' ? BEATS[i] : BEATS.find(x => x.id === i); if (!v) throw new Error('漆屏风：找不到句子 ' + i); return v; }
PACK_INIT.push(async tl => { BEATS = tl.map(s => ({ id: s.id, a: s.t0 + (s.lead || 0), b: s.t0 + (s.voiced || s.dur), ch: s.ch })); });
let LBUF = null;
function lqBoot() {
  if (BG) return; BG = lacquer(W, H); LBUF = [mk(W, H), mk(W, H)]; TMP = mk(W, H); TMPG = TMP.getContext('2d');
  WEAR = mk(W, H); { const g = WEAR.getContext('2d'), r = rng(91); for (let i = 0; i < 900; i++) { const x = 200 + r() * 1660, y = 60 + r() * 870, s = 1 + r() * r() * 9; g.fillStyle = r() < .55 ? `rgba(150,36,28,${.35 + r() * .5})` : `rgba(26,14,10,${.2 + r() * .4})`; g.beginPath(); g.ellipse(x, y, s, s * (.4 + r() * .6), r() * 3, 0, TAU); g.fill(); }
    g.strokeStyle = 'rgba(26,12,8,.28)'; g.lineWidth = .9; for (let i = 0; i < 200; i++) { let x = 200 + r() * 1660, y = 60 + r() * 870; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (r() - .5) * 70; y += (r() - .4) * 46; g.lineTo(x, y); } g.stroke(); } }
  VIG2 = mk(W, H); { const g = VIG2.getContext('2d'), vg = g.createRadialGradient(W / 2, H / 2, 520, W / 2, H / 2, 1150); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(10,4,2,.5)'); g.fillStyle = vg; g.fillRect(0, 0, W, H); }
}
function drawPanel(G, fn) { G.setTransform(1, 0, 0, 1, 0, 0); G.globalAlpha = 1; G.drawImage(BG, 0, 0); G.save(); fn(G); G.restore(); G.setTransform(1, 0, 0, 1, 0, 0); G.globalAlpha = 1; G.drawImage(WEAR, 0, 0); }
function side(c, o) { // 左侧锚点：上栏是谁的时代，下栏是谁、几岁
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
  c.fillStyle = 'rgba(20,12,9,.8)'; c.fillRect(60, 60, 126, 386); c.fillRect(60, 470, 126, 458);
  const col = (y, s, bg) => { if (!s) return; c.fillStyle = bg; c.fillRect(70, y, 106, 60); c.font = `44px ${F.brush}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = LQ.BK; c.fillText(s.badge || '', 123, y + 32);
    if (s.a) vtext(c, 99, { t0: 0, cols: [s.a], x: 152, y: y + 82, size: 36, lead: 1.12, font: F.songb, fd: .01, color: LQ.YE }); if (s.b) vtext(c, 99, { t0: 0, cols: [s.b], x: 98, y: y + 82, size: 32, lead: 1.1, font: F.song, fd: .01, color: LQ.WH }); };
  col(70, o.top, LQ.YE); col(482, o.bottom, LQ.WH); c.restore();
}
function bar(c, left, right) { // 底栏：左边纪年，右边章名，中间留给字幕
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = 'rgb(20,12,9)'; c.fillRect(40, 962, 1840, 84); c.fillStyle = LQ.YE; c.fillRect(40, 962, 1840, 3);
  c.font = `32px ${F.songb}`; c.textBaseline = 'middle'; c.fillStyle = LQ.YE; c.textAlign = 'left'; c.fillText(left || '', 70, 1006); c.textAlign = 'right'; c.fillText(right || '', 1850, 1006); c.restore();
}
function screen(t, panels, o = {}) {
  lqBoot(); TT = t; const c = g, HALF = .62; c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
  let ch = 0; for (let i = 0; i < panels.length; i++) if (t >= panels[i].at) ch = i;
  const nx = ch + 1 < panels.length ? panels[ch + 1].at : 1e9;
  drawPanel(LBUF[0].getContext('2d'), panels[ch].draw);
  if (t > nx - HALF || (ch > 0 && t < panels[ch].at + HALF)) { // 屏风六扇依次翻转
    const other = t > nx - HALF ? ch + 1 : ch - 1, mid = t > nx - HALF ? nx : panels[ch].at; drawPanel(LBUF[1].getContext('2d'), panels[other].draw);
    const oldB = other > ch ? LBUF[0] : LBUF[1], newB = other > ch ? LBUF[1] : LBUF[0];
    c.drawImage(newB, 0, 0); c.save(); c.beginPath(); c.rect(X0 - 14, 58, X1 - X0 + 28, 872); c.clip(); c.fillStyle = 'rgb(20,12,9)'; c.fillRect(0, 0, W, H); const n = 6, pw = (X1 + 14 - (X0 - 14)) / n;
    for (let i = 0; i < n; i++) { const ph = clamp((t - (mid - HALF) - (n - 1 - i) * .09) / (2 * HALF - (n - 1) * .09)), k = Math.cos(ph * Math.PI), src = k > 0 ? oldB : newB, sx = X0 - 14 + i * pw, w = Math.max(.02, Math.abs(k));
      c.save(); c.translate(sx + pw / 2, 0); c.scale(w, 1); c.drawImage(src, sx, 0, pw, 952, -pw / 2, 0, pw, 952); c.fillStyle = `rgba(10,5,4,${(1 - w) * .7})`; c.fillRect(-pw / 2, 36, pw, 916); c.restore(); }
    c.restore();
  } else c.drawImage(LBUF[0], 0, 0);
  frame(c); if (o.side) side(c, o.side); bar(c, o.year, o.chapter); c.restore();
}
addTheme('lacquer', { ink: 'rgb(240,226,190)', dim: 'rgba(240,226,190,.66)', note: 'rgba(240,226,190,.84)', a1: LQ.YE, a2: LQ.WH, a3: LQ.GR, chip: 'rgba(224,180,86,.14)',
  sub: 'rgba(0,0,0,0)', subInk: 'rgb(240,226,190)', top: '#3a1410', bot: '#1c0c08', card: 'rgba(20,10,8,.9)', cardInk: 'rgb(240,226,190)', pillInk: '#1a110d', hl: LQ.YE,
  f: { t: 'SongB', b: 'SongB', s: 'Song', h: 'Brush', n: 'RC' },
  bg(t) { g.fillStyle = 'rgb(20,12,9)'; g.fillRect(0, 0, W, H); }, post(t) { lqBoot(); g.drawImage(VIG2, 0, 0); } });

return {LQ, P2, lqShape, lqLine, ribbon, spline, FACE, lqHead, lqWoman, lqEmperor, lqChild, lacquer, lqTag, lqHill, lqTree, lqWall, lqHall, lqCanopy, lqHorse, lqCart, lqTent, lqPagoda, STELE, makeStele, lqStele, lqBed, lqWaves, lqMound, lqPot, lqLying, lqCloud, lqClouds, lqDisc, lqFloor, lqThrone, lqLamp, lqBanner, lqFire, lqArrows, lqSoldier, lqQue, lqIncense, lqBuddha, lqHouse, G1, G2, X0, X1, S1, S2, YEARTXT, CHTXT, TT, BG, WEAR, TMP, TMPG, VIG2, A_, B_, vis, from, upto, pr, eio, mv, AL, wom, emp, kid, tag, veil, clipReg, groundLine, PAL, frame, BEATS, beat, LBUF, lqBoot, drawPanel, side, bar, screen};
})();
