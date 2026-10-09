/* 组件包 · 固定人物 —— 宋人文士（《东坡》）、清末官员与仆从（《河海昆仑录》）
   人物出自本项目的旧片《东坡》《河海昆仑录》；这个文件就是源码，直接在这里改。 */
window.PACK=window.PACK||{};window.PACK_INIT=window.PACK_INIT||[];
PACK.figures=(function(){
const {TAU, lerp} = PACK.ink;
const SU = {
  line: 'rgb(34,30,26)', robe: 'rgb(241,235,220)', robeShade: 'rgb(222,213,194)', skin: 'rgb(238,219,190)',
  sash: 'rgb(160,62,48)', hat: 'rgb(30,27,24)', staff: 'rgb(96,78,50)'
};
function suPath(g, pts) { // pts: ['M',x,y,'C',...]
  g.beginPath(); let i = 0;
  while (i < pts.length) {
    const c = pts[i++];
    if (c === 'M') { g.moveTo(pts[i], pts[i + 1]); i += 2; }
    else if (c === 'L') { g.lineTo(pts[i], pts[i + 1]); i += 2; }
    else if (c === 'Q') { g.quadraticCurveTo(pts[i], pts[i + 1], pts[i + 2], pts[i + 3]); i += 4; }
    else if (c === 'C') { g.bezierCurveTo(pts[i], pts[i + 1], pts[i + 2], pts[i + 3], pts[i + 4], pts[i + 5]); i += 6; }
    else if (c === 'Z') g.closePath();
  }
}
function suFillStroke(g, pts, fill, w = 1.6, stroke = SU.line) {
  suPath(g, pts); if (fill) { g.fillStyle = fill; g.fill(); } if (w) { g.lineWidth = w; g.strokeStyle = stroke; g.stroke(); }
}
function suStroke(g, pts, w = 1.2, col = SU.line) { suPath(g, pts); g.lineWidth = w; g.strokeStyle = col; g.stroke(); }

function suHead(g, o, t) {
  const age = o.age ?? 1, wind = o.wind ?? 0, ws = Math.sin(t * 2.1) * 1.2 * (0.4 + wind);
  // 颈
  suFillStroke(g, ['M', -6, 2, 'L', -5, -8, 'L', 5, -9, 'L', 5, 2, 'Z'], SU.skin, 1.1);
  // 巾脚（帽后垂带）
  if (!o.rain) {
    suStroke(g, ['M', 9, -34, 'C', 16 + ws, -28, 20 + ws * 1.5 + wind * 6, -18, 25 + ws * 2 + wind * 10, -4], 2.2, SU.hat);
    suStroke(g, ['M', 8, -32, 'C', 13 + ws, -24, 15 + ws * 1.2 + wind * 5, -14, 18 + ws * 1.6 + wind * 8, -1], 1.8, SU.hat);
  }
  // 面（侧面向左）
  suFillStroke(g, ['M', 5, -6, 'Q', -3, -4, -8, -6, 'Q', -11.5, -8, -11, -11.5, 'Q', -12.2, -13, -10.6, -14.2, 'L', -12.3, -16, 'Q', -11.4, -17.6, -12.4, -19,
    'L', -15.4, -21.4, 'Q', -12.6, -24.6, -11.4, -28, 'L', -11.6, -31, 'L', 9.5, -31, 'Q', 12.5, -21, 8.5, -11, 'Q', 7.5, -7, 5, -6, 'Z'], SU.skin, 1.2);
  suStroke(g, ['M', -8.6, -24.2, 'L', -5.2, -24.4], 1.3);                 // 目
  suStroke(g, ['M', -10, -27.2, 'Q', -6.5, -28.6, -3.2, -27.4], 1.0);     // 眉
  suStroke(g, ['M', 2, -22.5, 'Q', 5.6, -24.2, 5.4, -19, 'Q', 4.6, -15.8, 2, -17], 1.0); // 耳
  if (age >= 0.5) { // 须髯
    const L = 10 + Math.min(age, 2) * 15, col = age > 1.5 ? 'rgb(128,124,116)' : SU.line, bw = wind * 5;
    g.save(); g.globalAlpha *= age > 1.5 ? 1 : .92;
    suStroke(g, ['M', -12.4, -15.6, 'Q', -9.6, -13.8, -6.4, -15], 1.4, col); // 髭
    const strands = [[-10.6, -11], [-8.6, -8.4], [-6, -7.2], [-3.2, -6.6], [0, -7], [3, -8.2]];
    strands.forEach(([x, y], i) => {
      const len = L * (1 - Math.abs(i - 1.5) * .12), sw = Math.sin(t * 1.7 + i) * (0.6 + wind) + bw;
      suStroke(g, ['M', x, y, 'C', x - 2, y + len * .35, x - 1 + sw * .5, y + len * .7, x + 1 + sw, y + len], i === 1 || i === 2 ? 1.7 : 1.1, col);
    });
    if (age > 1.5) { g.globalAlpha *= .6; strands.forEach(([x, y], i) => suStroke(g, ['M', x + 1, y, 'Q', x, y + L * .5, x + 2 + bw, y + L * .9], .7, 'rgb(90,86,78)')); }
    g.restore();
  }
  if (o.rain) { // 斗笠
    suFillStroke(g, ['M', -33, -30, 'Q', -2, -54, 29, -30, 'Q', -2, -35, -33, -30, 'Z'], 'rgb(88,74,52)', 1.3);
    g.save(); g.globalAlpha *= .55; for (let i = -26; i <= 22; i += 6) suStroke(g, ['M', i, -31.5 - (1 - Math.abs(i + 2) / 32) * 3, 'L', -2 + i * .15, -48], .7, 'rgb(40,32,20)'); g.restore();
    suStroke(g, ['M', -9, -31, 'Q', -9, -18, -4, -8, 'M', 7, -31, 'Q', 7, -18, 2, -7], .8);
  } else { // 东坡巾：高筒方顶，前加一层短檐
    suFillStroke(g, ['M', -12.4, -30, 'L', -12.2, -51, 'Q', -11.6, -54.5, -7, -54.5, 'L', 7.5, -54, 'Q', 11.6, -53.4, 11.6, -49.5, 'L', 10.8, -30, 'Z'], SU.hat, 1.2);
    suFillStroke(g, ['M', -13.6, -29.5, 'L', -13.9, -42, 'Q', -6, -46.5, 2.5, -45, 'L', 3.5, -29.5, 'Z'], 'rgb(58,52,45)', 1.2);
    g.save(); g.globalAlpha *= .35; suStroke(g, ['M', -10.5, -50, 'L', 9.5, -49.5], 1, 'rgb(200,190,170)'); g.restore();
  }
}

function suDraw(g, x, y, s, t, o = {}) {
  const pose = o.pose || 'stand', face = o.face ?? 1, wind = o.wind ?? 0, walk = pose === 'walk';
  const ph = t * (o.pace ?? 2.3), bob = walk ? Math.abs(Math.sin(ph)) * 1.8 : 0;
  g.save(); g.translate(x, y); g.scale(s * face, s); if (o.alpha != null) g.globalAlpha *= o.alpha;
  g.lineJoin = 'round'; g.lineCap = 'round';
  const seated = pose === 'seat' || pose === 'seatBow';
  const NY = seated ? -90 : -150 - bob;              // 颈点
  const lean = pose === 'bow' ? -.06 : pose === 'toast' ? .03 : 0;
  g.rotate(lean);
  const hs = walk ? Math.sin(ph) * 4 : 0, wf = wind * (5 + Math.sin(t * 1.8) * 2);

  // —— 竹杖（身后一侧先画）——
  const staff = (o.staff ?? (pose === 'walk' || pose === 'stand')) && !seated;
  // —— 后袖 ——
  if (!seated) suFillStroke(g, ['M', 9, NY + 4, 'C', 22, NY + 20, 30 + wf * .4, NY + 46, 31 + wf * .6, NY + 64, 'C', 30 + wf * .6, NY + 78, 20, NY + 80, 14, NY + 70, 'Z'], SU.robeShade, 1.3);

  if (!seated) {
    // 鞋
    const f1 = walk ? Math.sin(ph) * 9 : 0, l1 = walk ? Math.max(0, Math.cos(ph)) * 2.6 : 0, l2 = walk ? Math.max(0, -Math.cos(ph)) * 2.6 : 0;
    suFillStroke(g, ['M', -20 + f1, -l1, 'Q', -24 + f1, -5 - l1, -14 + f1, -6 - l1, 'L', -6 + f1, -5 - l1, 'L', -6 + f1, -l1, 'Z'], SU.hat, .8);
    suFillStroke(g, ['M', 4 - f1, -l2, 'Q', 0 - f1, -5 - l2, 10 - f1, -6 - l2, 'L', 16 - f1, -5 - l2, 'L', 16 - f1, -l2, 'Z'], SU.hat, .8);
    // 袍
    const hb = wf * .6 - hs * .5;
    const robe = ['M', -9, NY, 'C', -18, NY + 10, -22, NY + 40, -20, NY + 54, 'C', -24, NY + 80, -30 + hs, -34, -33 + hs, -7,
      'Q', -18, -3 + Math.sin(t * 3) * .6, -2, -6, 'Q', 16, -2, 35 + hb, -9, 'C', 30 + hb * .5, -40, 26, NY + 70, 22, NY + 52,
      'C', 24, NY + 30, 20, NY + 10, 12, NY - 2, 'Q', 2, NY - 6, -9, NY, 'Z'];
    suFillStroke(g, robe, SU.robe, 1.7);
    // 下摆内裳
    suStroke(g, ['M', -30 + hs, -11, 'Q', -16, -8, -3, -10], .9);
    // 衣纹
    g.save(); g.globalAlpha *= .75;
    suStroke(g, ['M', -6, NY + 60, 'C', -10, NY + 90, -14 + hs * .6, -40, -16 + hs, -10], 1.0);
    suStroke(g, ['M', 8, NY + 60, 'C', 10, NY + 90, 14 + hb * .3, -40, 18 + hb * .5, -10], 1.0);
    suStroke(g, ['M', 2, NY + 64, 'C', 1, NY + 96, 2, -30, 4, -7], .8);
    g.restore();
    // 腰带与朱绦
    suStroke(g, ['M', -20, NY + 54, 'Q', 0, NY + 58, 22, NY + 52], 2.4);
    const rw = wf + Math.sin(t * 2.3) * 2 + hs * .4;
    suStroke(g, ['M', -15, NY + 56, 'C', -20 + rw * .3, NY + 80, -16 + rw * .6, NY + 96, -22 + rw, NY + 118], 2, SU.sash);
    suStroke(g, ['M', -11, NY + 57, 'C', -13 + rw * .3, NY + 78, -9 + rw * .6, NY + 92, -13 + rw * .9, NY + 110], 1.6, SU.sash);
  } else {
    // 坐姿：趺坐袍身
    suFillStroke(g, ['M', -11, NY, 'C', -20, NY + 14, -24, NY + 34, -26, NY + 46, 'C', -44, NY + 50, -52, NY + 78, -46, 0,
      'L', 40, 0, 'C', 40, -22, 32, NY + 36, 22, NY + 28, 'C', 22, NY + 16, 20, NY + 4, 12, NY - 2, 'Q', 2, NY - 6, -11, NY, 'Z'], SU.robe, 1.7);
    g.save(); g.globalAlpha *= .7;
    suStroke(g, ['M', -44, -12, 'Q', -10, -20, 30, -8], 1); suStroke(g, ['M', -30, -26, 'Q', 0, -30, 26, -22], .9); g.restore();
    suStroke(g, ['M', -22, NY + 44, 'Q', 0, NY + 48, 20, NY + 40], 2.2);
    suStroke(g, ['M', -16, NY + 46, 'C', -24, NY + 60, -30 + wf, NY + 70, -36 + wf * 1.4, NY + 78], 1.8, SU.sash);
  }
  // 交领
  suStroke(g, ['M', -9, NY, 'L', 3, NY + 24], 1.5); suStroke(g, ['M', -4, NY - 1, 'L', 6, NY + 18], 1.0);
  suStroke(g, ['M', 12, NY - 2, 'L', 3, NY + 24], 1.0);

  // —— 头 ——
  g.save(); g.translate(0, NY);
  const tilt = pose === 'toast' ? -.16 : pose === 'seatBow' ? .32 : pose === 'bow' ? .08 : pose === 'read' ? .12 : 0;
  g.rotate(tilt); suHead(g, o, t); g.restore();

  // —— 蓑衣 ——
  if (o.rain && !seated) {
    suFillStroke(g, ['M', -12, NY + 2, 'Q', -26, NY + 34, -31, NY + 70, 'L', 33, NY + 70, 'Q', 28, NY + 32, 13, NY - 1, 'Z'], 'rgba(92,80,58,.94)', 1.2);
    g.save(); g.globalAlpha *= .6; for (let i = -28; i <= 30; i += 3.2) suStroke(g, ['M', i * .4, NY + 18, 'L', i + Math.sin(i + t * 2) * .8 + wf * .2, NY + 72 + (i % 2) * 3], .7, 'rgb(40,32,20)'); g.restore();
  }

  // —— 前臂与大袖 ——
  const hand = (hx, hy) => { suFillStroke(g, ['M', hx - 3.5, hy - 2, 'Q', hx - 5, hy + 3, hx, hy + 4, 'Q', hx + 3.5, hy + 2, hx + 2, hy - 3, 'Z'], SU.skin, .9); };
  if (pose === 'toast') {
    suFillStroke(g, ['M', 6, NY + 4, 'C', -8, NY, -24, NY - 12, -38, NY - 26, 'L', -43, NY - 20, 'C', -38, NY - 2, -26 + wf * .3, NY + 18, -12 + wf * .5, NY + 28,
      'C', -2, NY + 32, 7, NY + 28, 11, NY + 14, 'Z'], SU.robe, 1.6);
    hand(-42, NY - 27);
    suFillStroke(g, ['M', -50, NY - 38, 'L', -36, NY - 38, 'Q', -38, NY - 30, -43, NY - 30, 'Q', -48, NY - 30, -50, NY - 38, 'Z'], 'rgb(120,96,60)', 1); // 酒盏
  } else if (seated) {
    const bowd = pose === 'seatBow';
    suFillStroke(g, ['M', 6, NY + 6, 'C', -6, NY + 16, -20, NY + 34, bowd ? -26 : -32, NY + 48, 'C', bowd ? -30 : -38, NY + 58, -34, NY + 74, -22, NY + 76,
      'C', -8, NY + 76, 4, NY + 62, 10, NY + 40, 'C', 12, NY + 26, 12, NY + 14, 10, NY + 4, 'Z'], SU.robe, 1.6);
    hand(bowd ? -24 : -32, NY + 48);
  } else if (pose === 'bow' || pose === 'read') {
    suFillStroke(g, ['M', 6, NY + 4, 'C', -6, NY + 10, -20, NY + 24, -30, NY + 34, 'L', -34, NY + 42, 'C', -36, NY + 56, -31 + wf * .3, NY + 72, -24 + wf * .6, NY + 86,
      'C', -19, NY + 92, -11, NY + 86, -7, NY + 72, 'C', -1, NY + 52, 8, NY + 28, 12, NY + 10, 'Z'], SU.robe, 1.6);
    suStroke(g, ['M', -29, NY + 40, 'C', -25, NY + 54, -19, NY + 70, -17, NY + 82], .8);
    if (pose === 'read') {
      g.save(); g.translate(-38, NY + 36); g.rotate(-.35);
      suFillStroke(g, ['M', -13, -9, 'L', 13, -9, 'L', 13, 9, 'L', -13, 9, 'Z'], 'rgb(232,222,196)', 1);
      suFillStroke(g, ['M', -15, -10, 'L', -11, -10, 'L', -11, 10, 'L', -15, 10, 'Z'], 'rgb(140,110,70)', .8);
      suFillStroke(g, ['M', 11, -10, 'L', 15, -10, 'L', 15, 10, 'L', 11, 10, 'Z'], 'rgb(140,110,70)', .8);
      g.globalAlpha *= .5; for (let k = -8; k <= 8; k += 3.2) suStroke(g, ['M', k, -6, 'L', k, 6], .7); g.restore();
      hand(-30, NY + 42);
    } else hand(-33, NY + 36);
  } else {
    // 持杖 / 垂手
    suFillStroke(g, ['M', 6, NY + 4, 'C', -6, NY + 12, -20, NY + 30, -30, NY + 44, 'L', -37, NY + 49, 'C', -38, NY + 60, -33 + wf * .3, NY + 74, -25 + wf * .6, NY + 88,
      'C', -20 + wf * .5, NY + 93, -12, NY + 86, -8, NY + 74, 'C', -2, NY + 56, 6, NY + 30, 12, NY + 10, 'Z'], SU.robe, 1.6);
    suStroke(g, ['M', -30, NY + 46, 'C', -26, NY + 58, -20, NY + 70, -18, NY + 84], .8);
    if (staff) {
      const sb = walk ? Math.sin(ph) * 7 : 0;
      suStroke(g, ['M', -36, NY - 16, 'L', -44 + sb, -1], 2.6, SU.staff);
      g.save(); g.globalAlpha *= .8; for (let k = 1; k < 6; k++) { const q = k / 6, sx = lerp(-36, -44 + sb, q), sy = lerp(NY - 16, -1, q); suStroke(g, ['M', sx - 2.5, sy, 'L', sx + 2.5, sy + .6], 1, SU.line); } g.restore();
    }
    hand(staff ? -39 : -34, NY + 47);
  }
  g.restore();
}

const PEI = { line: 'rgb(34,30,26)', robe: 'rgb(96,108,114)', robeShade: 'rgb(78,88,94)', jacket: 'rgb(120,114,106)', skin: 'rgb(236,216,188)',
  cuff: 'rgb(150,160,160)', fur: 'rgb(132,104,72)', cloth: 'rgb(132,118,98)', trouser: 'rgb(74,72,70)' };

function peiHead(g, o, t) {
  const wind = o.wind ?? 0, sw = Math.sin(t * 1.9) * 2 * (0.4 + wind) + wind * 5;
  suFillStroke(g, ['M', -6, 2, 'L', -5, -8, 'L', 5, -9, 'L', 5, 2, 'Z'], PEI.skin, 1.1);
  // 辫
  suStroke(g, ['M', 8, -22, 'C', 15, -8, 15 + sw * .4, 26, 13 + sw, 68], 3.4, PEI.line);
  suStroke(g, ['M', 13 + sw, 68, 'L', 12 + sw * 1.2, 80], 1.6, PEI.line);
  // 面
  suFillStroke(g, ['M', 5, -6, 'Q', -3, -4, -8, -6, 'Q', -11.5, -8, -11, -11.5, 'Q', -12.2, -13, -10.6, -14.2, 'L', -12.3, -16, 'Q', -11.4, -17.6, -12.4, -19,
    'L', -15.4, -21.4, 'Q', -12.6, -24.6, -11.4, -28, 'L', -11.6, -31, 'L', 9.5, -31, 'Q', 12.5, -21, 8.5, -11, 'Q', 7.5, -7, 5, -6, 'Z'], PEI.skin, 1.2);
  suStroke(g, ['M', -8.6, -24.2, 'L', -5.2, -24.4], 1.3);
  suStroke(g, ['M', -10, -27.2, 'Q', -6.5, -28.6, -3.2, -27.4], 1.0);
  suStroke(g, ['M', 2, -22.5, 'Q', 5.6, -24.2, 5.4, -19, 'Q', 4.6, -15.8, 2, -17], 1.0);
  if (!o.servant) { // 八字须、短髯（花白）
    const col = 'rgb(96,92,86)';
    suStroke(g, ['M', -12.6, -15.8, 'Q', -9.5, -13.2, -6, -12.4], 1.5, col);
    [[-10.4, -11], [-8.2, -8.6], [-5.6, -7.4], [-3, -7]].forEach(([x, y], i) => suStroke(g, ['M', x, y, 'Q', x - 1.5, y + 6, x + .5 + Math.sin(t * 1.6 + i) * .5, y + 11 - i], 1.2, col));
  }
  if (o.winter) { // 皮风帽
    suFillStroke(g, ['M', -13.5, -27, 'Q', -14, -45, -1, -46, 'Q', 13, -45, 13, -28, 'L', 12, -9, 'Q', 8, -6, 6, -10, 'L', 6.5, -24, 'L', -13.5, -27, 'Z'], PEI.jacket, 1.2);
    suFillStroke(g, ['M', -15, -26, 'Q', -4, -31, 8, -27, 'L', 8, -21.5, 'Q', -4, -25, -15, -20.5, 'Z'], PEI.fur, 1);
  } else if (o.servant) { // 毡帽
    suFillStroke(g, ['M', -12.6, -29.5, 'Q', -12, -41, -1, -41.5, 'Q', 10.5, -41, 10.8, -29.5, 'Z'], 'rgb(92,84,72)', 1.1);
  } else { // 瓜皮帽
    suFillStroke(g, ['M', -12.6, -29.5, 'Q', -12.4, -42.5, -1, -43, 'Q', 10.6, -42.5, 10.8, -29.5, 'Z'], PEI.jacket, 1.2);
    suStroke(g, ['M', -12.4, -31.5, 'L', 10.6, -31.5], 1, 'rgb(120,116,110)');
    g.fillStyle = 'rgb(168,50,43)'; g.beginPath(); g.arc(-1, -44.4, 2.3, 0, TAU); g.fill();
  }
}

function peiDraw(g, x, y, s, t, o = {}) {
  const pose = o.pose || 'stand', face = o.face ?? 1, wind = o.wind ?? 0, walk = pose === 'walk', sv = !!o.servant;
  const ph = t * (o.pace ?? 2.3) + (sv ? 1.3 : 0), bob = walk ? Math.abs(Math.sin(ph)) * 1.8 : 0;
  g.save(); g.translate(x, y); g.scale(s * face, s); if (o.alpha != null) g.globalAlpha *= o.alpha;
  g.lineJoin = 'round'; g.lineCap = 'round';
  const seated = pose === 'seat';
  const NY = seated ? -90 : -150 - bob;
  g.rotate(pose === 'mourn' ? .05 : pose === 'bow' ? -.05 : 0);
  const hs = walk ? Math.sin(ph) * 4 : 0, wf = wind * (5 + Math.sin(t * 1.8) * 2);
  const f1 = walk ? Math.sin(ph) * 9 : 0, l1 = walk ? Math.max(0, Math.cos(ph)) * 2.6 : 0, l2 = walk ? Math.max(0, -Math.cos(ph)) * 2.6 : 0;
  const shoe = (dx, l) => { suFillStroke(g, ['M', -20 + dx, -l, 'Q', -24 + dx, -5 - l, -14 + dx, -6 - l, 'L', -6 + dx, -5 - l, 'L', -6 + dx, -l, 'Z'], PEI.line, .8); suStroke(g, ['M', -20 + dx, -l + .4, 'L', -6 + dx, -l + .4], 1.2, 'rgb(230,222,204)'); };

  if (sv) {
    // 包袱
    suFillStroke(g, ['M', 12, NY + 8, 'Q', 34, NY - 2, 36, NY + 26, 'Q', 34, NY + 50, 14, NY + 44, 'Z'], 'rgb(112,96,120)', 1.3);
    suStroke(g, ['M', 16, NY + 10, 'L', -12, NY + 36], 2, 'rgb(112,96,120)');
    // 裤
    suFillStroke(g, ['M', -12, NY + 78, 'L', -16 + f1 * .9, -6 - l1, 'L', -6 + f1 * .9, -6 - l1, 'L', 0, NY + 80, 'Z'], PEI.trouser, 1.2);
    suFillStroke(g, ['M', 2, NY + 80, 'L', 6 - f1 * .9, -6 - l2, 'L', 16 - f1 * .9, -6 - l2, 'L', 14, NY + 78, 'Z'], PEI.trouser, 1.2);
    shoe(f1, l1); shoe(24 - f1, l2);
    // 短褂
    suFillStroke(g, ['M', -9, NY, 'C', -17, NY + 12, -20, NY + 44, -19, NY + 84, 'Q', 0, NY + 90, 20, NY + 84, 'C', 22, NY + 44, 20, NY + 12, 12, NY - 2, 'Q', 2, NY - 6, -9, NY, 'Z'], PEI.cloth, 1.6);
    suStroke(g, ['M', -19, NY + 58, 'Q', 0, NY + 62, 20, NY + 56], 2.2);
  } else if (!seated) {
    suFillStroke(g, ['M', 12, NY + 6, 'C', 21, NY + 24, 24, NY + 46, 22, NY + 66, 'L', 14, NY + 66, 'C', 16, NY + 46, 13, NY + 26, 8, NY + 12, 'Z'], PEI.jacket, 1.2);
    shoe(f1, l1); shoe(24 - f1, l2);
    const hb = wf * .6 - hs * .5;
    suFillStroke(g, ['M', -9, NY, 'C', -18, NY + 10, -21, NY + 40, -19, NY + 54, 'C', -22, NY + 80, -26 + hs, -34, -28 + hs, -7,
      'Q', -14, -3, -2, -6, 'Q', 14, -2, 30 + hb, -9, 'C', 27 + hb * .5, -40, 24, NY + 70, 21, NY + 52, 'C', 23, NY + 30, 20, NY + 10, 12, NY - 2, 'Q', 2, NY - 6, -9, NY, 'Z'], o.winter ? PEI.robeShade : PEI.robe, 1.7);
    g.save(); g.globalAlpha *= .55; suStroke(g, ['M', -5, NY + 62, 'C', -9, NY + 92, -12 + hs * .6, -40, -13 + hs, -10], 1); suStroke(g, ['M', 8, NY + 62, 'C', 10, NY + 92, 13, -40, 16 + hb * .5, -10], 1); g.restore();
    // 开衩
    suStroke(g, ['M', -27 + hs, -30, 'L', -24 + hs * .6, -60], 1);
    // 马褂
    suFillStroke(g, ['M', -9, NY, 'C', -17, NY + 10, -20, NY + 34, -19, NY + 64, 'Q', 0, NY + 69, 21, NY + 62, 'C', 23, NY + 34, 20, NY + 10, 12, NY - 2, 'Q', 2, NY - 6, -9, NY, 'Z'], PEI.jacket, 1.5);
    g.fillStyle = 'rgb(150,146,138)'; for (let k = 0; k < 5; k++) { g.beginPath(); g.arc(-9.5 - k * .6, NY + 12 + k * 11, 1.3, 0, TAU); g.fill(); }
  } else {
    suFillStroke(g, ['M', -11, NY, 'C', -20, NY + 14, -24, NY + 34, -26, NY + 46, 'C', -42, NY + 50, -48, NY + 78, -43, 0, 'L', 38, 0, 'C', 38, -22, 31, NY + 36, 22, NY + 28, 'C', 22, NY + 16, 20, NY + 4, 12, NY - 2, 'Q', 2, NY - 6, -11, NY, 'Z'], PEI.robe, 1.7);
    suFillStroke(g, ['M', -11, NY, 'C', -19, NY + 12, -22, NY + 30, -23, NY + 50, 'Q', 0, NY + 56, 22, NY + 46, 'C', 23, NY + 24, 20, NY + 6, 12, NY - 2, 'Q', 2, NY - 6, -11, NY, 'Z'], PEI.jacket, 1.5);
  }
  if (o.winter && !sv) suFillStroke(g, ['M', -12, NY + 3, 'Q', 0, NY + 10, 14, NY + 1, 'Q', 15, NY - 6, 8, NY - 7, 'Q', 0, NY - 2, -9, NY - 5, 'Z'], PEI.fur, 1.1);
  else suStroke(g, ['M', -9, NY, 'Q', 0, NY + 5, 12, NY - 2], 1.6, 'rgb(150,146,138)');
  // 头
  g.save(); g.translate(0, NY); g.rotate(pose === 'mourn' ? .34 : pose === 'bow' ? .1 : pose === 'look' ? -.14 : 0); peiHead(g, o, t); g.restore();
  // 前臂（窄袖、马蹄袖）
  const hand = (hx, hy) => suFillStroke(g, ['M', hx - 3.5, hy - 2, 'Q', hx - 5, hy + 3, hx, hy + 4, 'Q', hx + 3.5, hy + 2, hx + 2, hy - 3, 'Z'], PEI.skin, .9);
  const sleeveCol = sv ? PEI.cloth : PEI.jacket;
  if (pose === 'mourn' || pose === 'bow' || seated) {
    const hx = seated ? -26 : -14, hy = seated ? NY + 46 : NY + 72;
    suFillStroke(g, ['M', 7, NY + 4, 'C', -2, NY + 16, -10, NY + 40, hx - 4, hy - 6, 'L', hx + 6, hy - 2, 'C', 4, NY + 46, 10, NY + 26, 12, NY + 12, 'Z'], sleeveCol, 1.5);
    suFillStroke(g, ['M', hx - 5, hy - 8, 'L', hx + 7, hy - 4, 'L', hx + 5, hy + 2, 'L', hx - 7, hy - 2, 'Z'], sv ? PEI.cloth : PEI.cuff, 1);
    hand(hx - 2, hy + 3);
  } else {
    const sb = walk ? Math.sin(ph) * 6 : 0, stick = o.stick ?? !sv;
    if (stick) { suStroke(g, ['M', -34, NY + 6, 'L', -41 + sb, -1], 2.6, 'rgb(86,66,44)'); }
    const hx = stick ? -36 : -24 + (walk ? Math.sin(ph) * 6 : 0), hy = stick ? NY + 46 : NY + 62;
    suFillStroke(g, ['M', 7, NY + 4, 'C', -4, NY + 12, -16, NY + 28, hx + 6, hy - 8, 'L', hx + 3, hy + 3, 'C', -14, NY + 44, 0, NY + 30, 12, NY + 14, 'Z'], sleeveCol, 1.5);
    suFillStroke(g, ['M', hx + 8, hy - 10, 'L', hx - 1, hy - 5, 'L', hx + 1, hy + 4, 'L', hx + 9, hy, 'Z'], sv ? PEI.cloth : PEI.cuff, 1);
    hand(hx - 2, hy);
  }
  g.restore();
}

/* 骡车（大车）：面左 */
/* ====== 接合：把旧片画法接到工坊（手写） ====== */
// 用法：scholar(G, x, y, 大小, t, {pose:'stand|walk|read|seat|seatBow|bow|toast', age:0..2, face:±1, wind, staff, alpha, pace})
//       official(G, x, y, 大小, t, {pose:'stand|walk|seat|bow|mourn', servant:true 画随从, face, wind, alpha})
const scholar = suDraw, official = peiDraw;

return {SU, suPath, suFillStroke, suStroke, suHead, suDraw, PEI, peiHead, peiDraw, scholar, official};
})();
