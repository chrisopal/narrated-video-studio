(() => {
const { print, gouge, carve, spot, title, rain, solid, on, shape, BLK } = PACK.woodcut;
const SNOW = { n: 150, angle: 158, speed: 230, seed: 7 };
const D = 180 / Math.PI;

/* 小屋：剪影是没刻的黑，积雪、木板、窗框是刀痕；lit 时刻窗里亮起那唯一的颜色 */
function hut(t, t0, x, y, s, o = {}) {
  const Rc = (a, b, c, d) => shape.rect(x + a * s, y + b * s, c * s, d * s);
  const wall = Rc(-.5, -.62, 1, .62), win = Rc(.1, -.47, .24, .2), door = Rc(-.36, -.5, .2, .5), chim = Rc(.2, -1.0, .11, .3);
  const eL = [x - .66 * s, y - .57 * s], ap = [x, y - 1.08 * s], eR = [x + .66 * s, y - .57 * s], wx = x + .22 * s, wy = y - .37 * s;
  solid(chim); solid(wall); solid([eL, ap, eR]);
  // 屋顶积雪：沿两坡的一条厚带
  const edge = [], top = [], th = .075 * s;
  for (let i = 0; i <= 8; i++) edge.push([lerp(eL[0], ap[0], i / 8), lerp(eL[1], ap[1], i / 8)]);
  for (let i = 1; i <= 8; i++) edge.push([lerp(ap[0], eR[0], i / 8), lerp(ap[1], eR[1], i / 8)]);
  edge.forEach((p, i) => { const n = i < 8 ? [-.61, -.79] : i === 8 ? [0, -1] : [.61, -.79], k = th * (1 + .3 * Math.sin(i * 1.9)); top.push([p[0] + n[0] * k, p[1] + n[1] * k]) });
  const cap = [...edge, ...top.reverse()], sl = Math.atan2(ap[1] - eL[1], ap[0] - eL[0]) * D;
  if (o.small) {
    gouge(t, t0, .4, [top[top.length - 1], top[8], top[0]], { w0: s * .07, w1: s * .05, smooth: false });
    gouge(t, t0 + .3, .3, [[x - .9 * s, y + 2], [x + .9 * s, y + 1]], { w0: s * .05, w1: s * .03 });
    if (o.lit != null) spot(t, o.lit, win, { shift: [1, -1] });
    return;
  }
  carve(t, t0, .8, cap, { gap: Math.max(5, s * .013), w: s * .022, flow: (px) => px < x ? sl : -sl, jit: .3, key: 'cap' + x + s, seed: 9 });
  carve(t, t0 + .5, .9, [eL, ap, eR], { gap: s * .05, w: s * .01, flow: (px) => px < x ? sl : -sl, jit: .4, seed: 12, key: 'rf' + x + s });
  carve(t, t0 + .3, 1.1, [wall, win, door], { angle: 90, gap: s * .07, w: s * .012, jit: .25, seed: 5, tone: (px, py) => cl((Math.hypot(px - wx, py - wy) / s - .17) / .16), key: 'pl' + x + s });
  win.forEach((p, i) => { const q = win[(i + 1) % 4], ex = (q[0] - p[0]) * .06, ey = (q[1] - p[1]) * .06; gouge(t, t0 + .9 + i * .1, .25, [[p[0] - ex, p[1] - ey], [q[0] + ex, q[1] + ey]], { w0: s * .016, w1: s * .012 }); });
  gouge(t, t0 + 1.1, .5, [door[3], door[0], door[1], door[2]], { w0: s * .012, w1: s * .009 });
  gouge(t, t0 + .2, .7, [[x - .8 * s, y + 3], [x, y - 4], [x + .82 * s, y + 2]], { w0: s * .03, w1: s * .018 });
  if (o.lit != null && t >= o.lit) {
    spot(t, o.lit, win, { d: .35 });
    solid(shape.rect(wx - .008 * s, wy - .1 * s, .016 * s, .2 * s)); solid(shape.rect(x + .1 * s, wy - .008 * s, .24 * s, .016 * s));
    for (let i = 0; i < 14; i++) { const a = i / 14 * 2 * Math.PI + .12, r1 = .19 * s, r2 = r1 + .075 * s * (.7 + .6 * rnd(i + 3));
      gouge(t, o.lit + .35 + i * .05, .25, [[wx + Math.cos(a) * r1, wy + Math.sin(a) * r1], [wx + Math.cos(a) * r2, wy + Math.sin(a) * r2]], { w0: s * .02, w1: s * .007 }); }
  }
  return { wx, wy };
}
// 窗光落在雪地上的扇形
const fanOf = (x, y, s) => [[x + .06 * s, y + 2], [x + .44 * s, y + 2], [x + 1.15 * s, H], [x - .15 * s, H]];
function spill(t, t0, x, y, s, key) {
  const wx = x + .22 * s, wy = y - .37 * s;
  carve(t, t0, 1.6, fanOf(x, y, s), { angle: 75, gap: s * .024, w: s * .026, flow: (px, py) => Math.atan2(py - wy, px - wx) * D, tone: (px, py) => cl(1.15 - Math.hypot(px - wx, py - wy) / (1.5 * s)), order: [wx, wy], key, seed: 8 });
}

/* 行人：自己设计的兜帽行者，背包、拄杖，迎着风前倾。轮廓是没刻的黑，迎光的一边刻出亮边 */
const HOOD = [[-20, -800], [-34, -900], [30, -990], [120, -1004], [196, -944], [206, -862], [164, -800]];
function walker(t, t0, x, y, s, face, ph) {
  const sw = Math.sin(ph * 2 * Math.PI), fl = .5 + .5 * Math.sin(ph * 4 * Math.PI + 1);
  g.save(); g.translate(x, y); g.scale(s / 1000 * face, s / 1000); g.transform(1, 0, -.12, 1, 0, 0);
  const limb = (a, b, w) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy), nx = -dy / l * w / 2, ny = dx / l * w / 2; solid([[a[0] + nx, a[1] + ny], [b[0] + nx, b[1] + ny], [b[0] - nx, b[1] - ny], [a[0] - nx, a[1] - ny]]) };
  const f1 = [100 + sw * 120, 0], f2 = [-60 - sw * 120, 0];
  limb([40, -300], f1, 62); limb([-40, -300], f2, 62);
  solid(shape.ellipse(f1[0] + 22, -10, 48, 18, 16)); solid(shape.ellipse(f2[0] + 22, -10, 48, 18, 16));
  limb([300, -700], [430 + sw * 25, 0], 30);                                     // 杖
  solid([[-40, -810], [170, -810], [246, -660], [226, -470], [168, -290], [104, -250], [-110, -250], [-170, -350], [-300 - fl * 70, -430 + fl * 20], [-210, -520], [-130, -680]]);
  solid(shape.ellipse(-150, -610, 92, 112, 24));                                 // 背包
  limb([150, -700], [300, -560], 66); solid(shape.ellipse(300, -560, 40, 40, 12)); // 手臂
  solid(HOOD);
  // 亮边和衣褶：迎光一侧的刀痕
  gouge(t, t0, .4, [[128, -980], [190, -936], [198, -866]], { w0: 18, w1: 12 });
  gouge(t, t0 + .15, .5, [[200, -790], [234, -660], [214, -480], [160, -305]], { w0: 20, w1: 10 });
  gouge(t, t0 + .3, .4, [[110, -720], [56, -520], [20, -300]], { w0: 14, w1: 8 });
  gouge(t, t0 + .4, .4, [[-60, -700], [-120, -500], [-140, -360]], { w0: 12, w1: 7 });
  gouge(t, t0 + .5, .3, [[-170, -690], [-200, -600], [-180, -520]], { w0: 10, w1: 6 });
  g.restore();
}
function steps(t, x0, x, y, face) { for (let i = 1; ; i++) { const fx = x0 + face * i * 64; if ((fx - x) * face > -70) break; solid(shape.ellipse(fx, y + 8 + (i % 2 ? -7 : 7), 17, 5, 10)); } }

window.FILM = { theme: 'woodcut', chrome: 'none', chapters: ['刻版', '路', '屋', '人', '灯'],
  cover: { pill: '样片', title: '木刻版画', line1: '风雪里的一盏灯', line2: '刀刻出来的光', tagline: '风格包样片 · 木刻版画',
    art(c, cx, cy, R) { on(c, () => { const x0 = cx - R, y0 = cy - R, hz = cy + R * .5;
      solid(shape.rect(x0, y0, 2 * R, 2 * R));
      carve(99, 0, 1, shape.rect(x0 + 8, cy - R * .2, 2 * R - 16, hz - cy + R * .2), { gap: 12, w: 4, jit: .6, tone: (px, py) => Math.pow((py - cy + R * .2) / (R * .7), 1.3), key: 'cs', seed: 6 });
      carve(99, 0, 1, shape.rect(x0 + 8, hz, 2 * R - 16, cy + R - hz - 8), { gap: 11, w: 10, jit: .5, key: 'cg', seed: 4 });
      hut(99, 0, cx + R * .08, hz, R * .95, { lit: 0 });
      rain(99, 0, { n: 70, angle: 158, area: { x: x0 + 10, y: y0 + 10, w: 2 * R - 20, h: 2 * R - 20 }, seed: 5, len: [8, 26] }); }); } },
  scenes(t) {
    const t1 = T('a1'), t2 = T('a2'), t3 = T('a3'), t4 = T('a4');

    // 0 刻版：木版本身，边框、题目、雪地一刀刀刻出来
    print(t, 0, () => {
      gouge(t, .15, .9, [[96, 74], [1824, 74]], { w0: 10, w1: 7 });
      gouge(t, .4, .6, [[1846, 96], [1846, 984]], { w0: 10, w1: 7 });
      gouge(t, .6, .9, [[1824, 1006], [96, 1006]], { w0: 10, w1: 7 });
      gouge(t, .8, .6, [[74, 984], [74, 96]], { w0: 10, w1: 7 });
      [[[112, 104], [1808, 104]], [[1816, 112], [1816, 968]], [[1808, 976], [112, 976]], [[104, 968], [104, 112]]].forEach((p, i) => gouge(t, 1.0 + i * .2, .5, p, { w0: 3.5, w1: 3 }));
      title(t, .5, '风雪里的一盏灯', W / 2, 520, 150, { al: 'center' });
      gouge(t, 1.5, .5, [[600, 588], [960, 584], [1320, 590]], { w0: 13, w1: 6 });
      title(t, 1.9, '木刻版画 · 样片', W / 2, 690, 52, { al: 'center', font: 'SongB' });
      carve(t, 2.4, 2.2, shape.rect(112, 800, 1696, 168), { gap: 15, w: 9, jit: .6, flow: -14, tone: (px, py) => Math.pow((py - 800) / 168, .9), key: 'a0g', seed: 3 });
      [[112, 112, 1, 1], [1808, 112, -1, 1], [1808, 968, -1, -1], [112, 968, 1, -1]].forEach(([cx, cy, sx, sy], k) => { for (let i = 0; i < 3; i++) { const d = 34 + i * 24;
        gouge(t, 2.6 + k * .35 + i * .08, .3, [[cx + sx * d, cy + sy * 10], [cx + sx * 10, cy + sy * d]], { w0: 7, w1: 4 }); } });
      rain(t, 1.0, { ...SNOW, keep: [[420, 330, 1080, 390]], area: { x: 112, y: 112, w: 1696, h: 856 } });
    }, { t1, mode: 'block' });

    // 1 路：印在纸上；雪地横刀，路留黑，尽头一点灯
    print(t, t1, () => {
      const HZ = 612, L = [[640, 1080], [780, 930], [980, 800], [1230, 690], [1384, 616]], Rr = [[1380, 1080], [1320, 930], [1350, 800], [1430, 690], [1398, 616]], road = [...L, ...Rr.slice().reverse()];
      carve(t, t1, 1.8, shape.rect(0, HZ, W, H - HZ), { gap: 13, w: 12, jit: .5, tone: (px, py) => shape.inside([px, py], road) ? 0 : .18 + .82 * Math.pow((py - HZ) / (H - HZ), .7), key: 's1g', seed: 4 });
      gouge(t, t1 + .3, .8, [[60, HZ], [700, HZ - 2], [1340, HZ]], { w0: 3, w1: 5 }); gouge(t, t1 + .5, .5, [[1450, HZ], [1860, HZ - 1]], { w0: 5, w1: 3 });
      gouge(t, t1 + .9, 1.0, L, { w0: 10, w1: 2 }); gouge(t, t1 + 1.1, 1.0, Rr, { w0: 10, w1: 2 });
      gouge(t, t1 + 1.6, .7, [[720, 430], [1000, 418], [1300, 432], [1580, 420]], { w0: 6, w1: 4 });
      gouge(t, t1 + 1.9, .7, [[900, 512], [1200, 503], [1500, 515], [1800, 506]], { w0: 5, w1: 3 });
      gouge(t, t1 + 2.2, .5, [[1180, 360], [1420, 354], [1640, 362]], { w0: 4, w1: 3 });
      hut(t, t1 + 2.3, 1392, HZ + 2, 70, { small: true, lit: t1 + 2.9 });
      title(t, t1 + .3, '一条路', 120, 210, 110);
      title(t, t1 + 1.0, '雪把来路盖住了', 124, 300, 50, { font: 'SongB' });
      rain(t, t1, { ...SNOW, seed: 11, keep: [[100, 90, 600, 240]] });
    }, { t1: t2, mode: 'paper' });

    // 2 屋：小屋的剪影从夜色里刻出来，窗里亮起那一处颜色，光在雪上刻出一片
    print(t, t2, () => {
      const HZ = 820, x = 1240, s = 520, lit = t2 + 2.2, fan = fanOf(x, HZ, s);
      carve(t, t2, 1.2, shape.rect(0, 400, W, HZ - 400), { gap: 16, w: 4.5, jit: .6, tone: (px, py) => Math.pow((py - 400) / (HZ - 400), 1.3), key: 's2s', seed: 6 });
      carve(t, t2 + .2, 1.4, shape.rect(0, HZ, W, H - HZ), { gap: 13, w: 12, jit: .5, tone: (px, py) => shape.inside([px, py], fan) ? 0 : .25 + .75 * (py - HZ) / (H - HZ), key: 's2g', seed: 2 });
      hut(t, t2 + .5, x, HZ, s, { lit });
      spill(t, lit + .6, x, HZ, s, 's2f');
      title(t, t2 + .4, '一座小屋', 120, 220, 110);
      title(t, lit + .1, '窗里亮着一盏灯', 124, 310, 50, { font: 'SongB' });
      rain(t, t2, { ...SNOW, seed: 19, keep: [[100, 100, 640, 240]] });
    }, { t1: t3, mode: 'paper' });

    // 3 人：迎风的行人，远处一点灯；风雪更紧
    print(t, t3, () => {
      const HZ = 700, tq = Math.floor(t * 8) / 8, wx = 600 + 34 * (tq - t3);
      carve(t, t3, .9, shape.rect(0, 340, W, HZ - 340), { gap: 13, w: 7, jit: .5, tone: (px, py) => Math.pow((py - 340) / (HZ - 340), .9), key: 's3s', seed: 13 });
      carve(t, t3 + .1, 1.0, shape.rect(0, HZ, W, H - HZ), { gap: 12, w: 11, jit: .5, flow: 10, tone: (px, py) => .55 + .45 * (py - HZ) / (H - HZ), key: 's3g', seed: 17 });
      hut(t, t3 + .6, 1650, HZ + 2, 100, { small: true, lit: t3 + 1.0 });
      steps(t, 420, wx, 880, 1);
      walker(t, t3 + .8, wx, 880, 400, 1, tq * .9);
      title(t, t3 + .3, '一个行人', W - 120, 215, 110, { al: 'right' });
      title(t, t3 + .9, '顶着风，一步一步', W - 124, 305, 50, { al: 'right', font: 'SongB' });
      rain(t, t3, { n: 230, angle: 162, speed: 430, len: [14, 46], w: [2, 6], seed: 23, keep: [[1180, 90, 650, 240]] });
    }, { t1: t4, mode: 'paper' });

    // 4 灯：全景，行人顺着路走向亮灯的小屋
    print(t, t4, () => {
      const HZ = 760, x = 520, s = 380, tq = Math.floor(t * 8) / 8, wx = 1080 - 11 * (tq - t4), fan = fanOf(x, HZ, s);
      const L = [[400, 762], [520, 820], [800, 930], [1150, 1080]], Rr = [[470, 762], [640, 815], [1000, 920], [1500, 1080]], road = [...L, ...Rr.slice().reverse()];
      carve(t, t4, 1.0, shape.rect(0, 420, W, HZ - 420), { gap: 16, w: 4.5, jit: .6, tone: (px, py) => Math.pow((py - 420) / (HZ - 420), 1.3), key: 's4s', seed: 21 });
      carve(t, t4 + .1, 1.3, shape.rect(0, HZ, W, H - HZ), { gap: 13, w: 12, jit: .5, tone: (px, py) => shape.inside([px, py], road) || shape.inside([px, py], fan) ? 0 : .25 + .75 * (py - HZ) / (H - HZ), key: 's4g', seed: 25 });
      carve(t, t4 + .5, 1.2, road, { angle: 30, gap: 11, w: 7, jit: .4, flow: (px, py) => Math.atan2(py - 800, px - 420) * D, tone: (px, py) => shape.inside([px, py], fan) ? 0 : .4 + .6 * (py - HZ) / (H - HZ), key: 's4r', seed: 27 });
      gouge(t, t4 + .7, .9, L, { w0: 3, w1: 9 }); gouge(t, t4 + .8, .9, Rr, { w0: 3, w1: 9 });
      hut(t, t4 + .2, x, HZ, s, { lit: t4 + .5 });
      spill(t, t4 + 1.0, x, HZ, s, 's4f');
      steps(t, 1180, wx, 962, -1);
      walker(t, t4 + 1.2, wx, 968, 260, -1, tq * .8);
      title(t, t4 + .3, '风雪里的一盏灯', W - 120, 230, 110, { al: 'right' });
      title(t, t4 + 1.0, '照着回来的路', W - 124, 320, 50, { al: 'right', font: 'SongB' });
      rain(t, t4, { ...SNOW, seed: 29, keep: [[1000, 90, 830, 250]] });
    }, { mode: 'paper' });
  } };
})();
