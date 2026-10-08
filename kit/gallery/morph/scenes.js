(() => {
const { C, frame, gridWarp, axes, drawOn, plot, morphPath, dotOn, label, brace, formula, cap, sample, steps, shape, along } = PACK.morph;
// 颜色的分工（全片不变）：蓝 = 要贴近的那条线；黄 = 方块；红 = 台阶的轮廓；灰白 = 网格、坐标轴、说明
const F = frame({ x: 160, y: 150, w: 720, h: 720 }, { xr: [0, 8], yr: [0, 8] });
const lin = x => x, cur = x => x * x / 8, TX = 1200;
const blocks = []; for (let i = 0; i < 4; i++) for (let j = 0; j <= i; j++) blocks.push(shape.rect(i * 2, j * 2, 2, 2));
const cols = (fn, n) => Array.from({ length: n }, (_, i) => shape.rect(i * 8 / n, 0, 8 / n, fn((i + 1) * 8 / n)));
window.FILM = { theme: 'morph', chrome: 'none', chapters: ['斜线', '台阶', '更细', '轮廓', '曲线'],
  cover: { pill: '样片', title: '概念形变', line1: '很多小台阶', line2: '变成一条斜线', tagline: '黑底 · 彩线 · 一个变成另一个',
    art(c, cx, cy, R) { const P = (x, y) => [cx - R + x * 2 * R, cy + R - y * 2 * R], L = (pts, col, lw) => { c.strokeStyle = col; c.lineWidth = lw; c.lineJoin = c.lineCap = 'round'; c.beginPath(); pts.forEach((q, i) => { const p = P(q[0], q[1]); i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]); }); c.stroke(); };
      for (let i = 0; i <= 8; i++) { L([[i / 8, 0], [i / 8, 1]], C.grid, 2); L([[0, i / 8], [1, i / 8]], C.grid, 2); }
      L([[0, 1], [0, 0], [1, 0]], C.axis, 3); L([[0, 0], [1, 1]], C.blue, 9); L(steps(lin, 0, 1, 6), C.coral, 9); } },
  scenes(t) {
    const a0 = T('a0'), a1 = T('a1'), a2 = T('a2'), a3 = T('a3'), a4 = T('a4');
    const m1 = a2 + .6, m2 = a2 + 2.5, m3 = a2 + 4.4, MD = 1.2, m4 = a3 + .5, c0 = a4 + .5, c1 = a4 + 3.5, tW = a4 + 7;
    // 网格和坐标轴：全片只有这一张，最后整张一起变形
    const Wp = gridWarp(t, tW, 2, F, [1, .25, 0, .8], { in: a0 - .5, ghost: .35 });
    axes(t, a0 - .3, F, { warp: Wp, labels: ['x', 'y'] });
    const L = Wp.pts(sample(lin, 0, 8, 2)), Cv = Wp.pts(sample(cur, 0, 8, 120)), S = n => Wp.pts(steps(lin, 0, 8, n));
    // 一级的宽（数据单位）：随着每次细分平滑地缩小
    const gw = lerp(lerp(lerp(lerp(2, 1, eio(seg(t, m1, m1 + MD))), .5, eio(seg(t, m2, m2 + MD))), .25, eio(seg(t, m3, m3 + MD))), 0, eio(seg(t, m4, m4 + 1.6)));
    const nNow = t < m1 + MD / 2 ? 4 : t < m2 + MD / 2 ? 8 : t < m3 + MD / 2 ? 16 : 32;

    // 黄：方块一块一块垒起来；细分时换成一列一列的细条
    const bA = 1 - seg(t, m1, m1 + .7);
    if (bA > 0) blocks.forEach((b, i) => drawOn(t, a1 + .3 + i * .14, .5, F.pts(b), { col: C.amber, lw: 3, close: true, a: bA }));
    [[8, m1, m2], [16, m2, m3], [32, m3, m4]].forEach(([n, ta, tb]) => { const a = seg(t, ta + .4, ta + 1.1) * (1 - seg(t, tb, tb + (n === 32 ? 1.2 : .7))); if (a > 0) cols(lin, n).forEach(r => drawOn(t, 0, .1, F.pts(r), { col: C.amber, lw: 2, close: true, a: a * .8 })); });
    const cA = seg(t, c1 + .9, c1 + 1.6); if (cA > 0) cols(cur, 16).forEach(r => drawOn(t, 0, .1, Wp.pts(r), { col: C.amber, lw: 2, close: true, a: cA * .8 }));

    // 蓝：斜线写出来，后来弯成曲线
    if (t < c0) plot(t, a0 + 1.2, 1.5, lin, F, { col: C.blue, lw: 7, dot: true });
    else morphPath(t, c0, 1.6, L, Cv, { col: C.blue, lw: 7 });

    // 红：台阶的轮廓，4 级 → 8 → 16 → 32 → 贴到斜线上
    let SP = S(4);
    if (t < m1) drawOn(t, a1 + 2.6, 1.6, SP, { col: C.coral, lw: 6, dot: true });
    else if (t < m2) SP = morphPath(t, m1, MD, S(4), S(8), { col: C.coral, lw: 6, n: 480 });
    else if (t < m3) SP = morphPath(t, m2, MD, S(8), S(16), { col: C.coral, lw: 6, n: 480 });
    else if (t < m4) SP = morphPath(t, m3, MD, S(16), S(32), { col: C.coral, lw: 6, n: 640 });
    else if (t < c1) SP = morphPath(t, m4, 1.6, S(32), L, { col: C.coral, lw: 6, n: 640, a: 1 - seg(t, m4 + 2.2, m4 + 2.9) });
    else morphPath(t, c1, 1.4, Cv, Wp.pts(steps(cur, 0, 8, 16)), { col: C.coral, lw: 6, n: 480, a: seg(t, c1, c1 + .3) });
    if (t > m4 + 2.1 && t < a4) dotOn(t, m4 + 2.3, 1.2, L, { col: C.blue, t1: a4 });

    // 贴着图形的标签
    const top = Wp.p(8, 8);
    label(t, a0 + 2.5, '斜线', top[0], top[1], top[0], top[1] - 48, { col: C.blue, al: 'center', sz: 44, t1: c0 + .2 });
    label(t, c0 + 1.6, '曲线', top[0], top[1], top[0], top[1] - 48, { col: C.blue, al: 'center', sz: 44 });
    const k1 = along(SP, (8 + gw) / 16), k1t = F.p(.35, 7.1);
    label(t, a1 + 3.6, '台阶的轮廓', k1[0], k1[1], k1t[0], k1t[1], { col: C.coral, sz: 40, t1: m4 + 1.2 });
    const k2 = Wp.p(5.5, cur(6)), k2t = Wp.p(1.5, 6.4);
    label(t, c1 + 1.2, '台阶的轮廓', k2[0], k2[1], k2t[0], k2t[1], { col: C.coral, sz: 40 });
    const o = F.p(0, 0), e = F.p(Math.max(gw, .02), 0);
    brace(t, a1 + 4.2, o[0], o[1], e[0], e[1], '一级的宽', { t1: m4 + .6, tx: Math.max(e[0] / 2 + o[0] / 2, 240) });

    // 右栏：一句话 + 式子
    const HY = 310, heads = [[a0 + .15, a1, '先画一条斜线'], [a1, a2, '方块堆成台阶'], [a2, a3, '台阶越分越细'], [a3, a4, '轮廓贴上斜线'], [a4, c1, '斜线换成曲线'], [c1, tW, '台阶照样贴上'], [tW, null, '整张网格一起变形']];
    heads.forEach(([s, e2, w]) => cap(t, s, e2, w, TX, HY, 64, TH.ink, 'H7'));
    cap(t, a1 + .9, a2, '每一列多放一块', TX, HY + 78, 40, C.amber);
    cap(t, a3 + .3, a4, '缺口越来越小', TX, HY + 78, 40, TH.note);
    cap(t, tW + .1, null, '线和台阶跟着走', TX, HY + 78, 40, TH.note);
    formula(t, a1 + 3.6, ['级数 ', { s: 'n', col: C.coral }, ' = ', { s: String(nNow), w: 'RC' }], TX, 590, 76, { t1: m4 + .1 });
    cap(t, a1 + 4, m4 + .1, '（数字是示意）', TX, 652, 36, TH.dim);
    formula(t, m4 + .1, ['级数 ', { s: 'n', col: C.coral }, ' 越来越大'], TX, 590, 76, { t1: a4 });
    formula(t, a2 + .3, [{ s: '宽', sub: 'n' }, ' = 总宽 ÷ ', { s: 'n', col: C.coral }], TX, 770, 68, { t1: a4 });
    formula(t, c0 + 1.9, ['y = ', { s: 'x', sup: '2' }, ' ÷ 8'], TX, 590, 76, { col: C.blue, t1: tW });
    cap(t, c0 + 2.3, tW, '（示意）', TX, 652, 36, TH.dim);
  } };
})();
