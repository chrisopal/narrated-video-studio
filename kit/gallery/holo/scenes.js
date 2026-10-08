(() => {
const { wire, partFrame, readout, leader, scan, compareBar, tag, shape: S, on, COL } = PACK.holo;

// 一只虚构的手电筒，侧视线框。局部坐标：尾端在 x=0，中心线 y=0；Lb 是筒身长度
function torch(Lb) {
  const r = 90, R = 150, x1 = 200, x2 = x1 + Lb, x3 = x2 + 120, x4 = x3 + 130;
  return {
    cap: [S.rrect(0, -95, 200, 190, 18), S.arc(0, 0, 22, Math.PI / 2, Math.PI * 1.5, 46), S.circle(32, 66, 9),
      ...[52, 78, 104, 130].flatMap(x => [S.line(x, -95, x, -68), S.line(x, 68, x, 95)])],
    stub: [S.line(140, -78, 140, 78), ...S.thread(140, -78, 60, 156, 5, 7)],
    body: [S.rrect(x1, -r, Lb, 2 * r, 6), S.line(x1 + 36, -r, x1 + 36, r), S.line(x1 + 52, -r, x1 + 52, r), S.line(x2 - 52, -r, x2 - 52, r), S.line(x2 - 36, -r, x2 - 36, r),
      S.line(x1 + 110, -r, x1 + 110, r), S.line(x2 - 150, -r, x2 - 150, r), ...S.hatch(x1 + 110, -r, Lb - 260, 2 * r, 36, 1), ...S.hatch(x1 + 110, -r, Lb - 260, 2 * r, 36, -1),
      S.rrect(x2 - 120, -r - 16, 64, 16, 5)],
    head: [S.line(x2, -r, x2, r), S.poly([[x2, -r], [x3, -R]]), S.poly([[x2, r], [x3, R]]), S.rrect(x3, -R, x4 - x3, 2 * R, 10),
      ...[22, 40, 58].flatMap(d => [S.line(x3 + d, -R, x3 + d, -R + 26), S.line(x3 + d, R - 26, x3 + d, R)]),
      S.curve(u => { const y = (u * 2 - 1) * (R - 22); return [x2 + 30 + (x4 - 52 - x2) * (y / (R - 22)) ** 2, y]; }),
      S.rrect(x2 + 12, -14, 18, 28, 3), S.line(x4 - 16, -(R - 14), x4 - 16, R - 14), S.arc(x4 - 16, 0, 12, -Math.PI / 2, Math.PI / 2, R - 14)],
    len: x4,
  };
}
const OX = 300, CY = 540, MAIN = torch(630), OLD = torch(760);
const win = (t, a, b) => eio(seg(t, a, a + .5)) * (1 - eio(seg(t, b - .5, b)));
// 画整只手电：o 里给每个部件的 dim / lit，explode 是尾盖往左挪多少
function drawTorch(t, P, ox, cy, o) {
  const d = o.draw || [0, 0, 0, 0, 0, 0], s = o.s || 1;
  g.save(); g.translate(ox, cy); g.scale(s, s);
  const lw = 2.4 / s, ex = o.explode || 0;
  g.save(); g.translate(-ex, 0); wire(t, d[0], d[1], [P.cap, S.spring(118, 0, 196 + ex * .5, 30, 5)], { lw, dim: o.dim.tail, lit: o.lit.tail }); g.restore();   // 弹簧随拧开伸长
  wire(t, d[0] + .3, d[1], P.stub, { lw, dim: o.dim.tail, lit: o.lit.tail });
  wire(t, d[2], d[3], P.body, { lw, dim: o.dim.body, lit: o.lit.body });
  wire(t, d[4], d[5], P.head, { lw, dim: o.dim.head, lit: o.lit.head });
  g.restore();
}

window.FILM = {
  theme: 'holo', chrome: 'none', chapters: ['整体', '灯头', '筒身', '尾盖', '对比'],
  cover: { pill: '风格包样片', title: '全息界面', line1: '线框拆解 · 参数读数', line2: '', tagline: '一只虚构的手电筒（数值示意）',
    art(c, cx, cy, R) { on(c, () => {
      wire(9, 0, 1, [S.rings(cx, cy, [R * .96, R * .78, R * .5, R * .2]), S.teeth(cx, cy, R * 1.02, R * 1.1, 28)], { lw: 2.5, lit: 1 });
      wire(9, 0, 1, [S.circle(cx, cy, R * .08), S.line(cx - R * 1.25, cy, cx - R * 1.12, cy), S.line(cx + R * 1.12, cy, cx + R * 1.25, cy)], { lw: 2 });
      partFrame(9, 0, cx - R * .55, cy - R * .55, R * 1.1, R * 1.1, {});
    }); } },
  scenes(t) {
    const T0 = T('a0'), T1 = T('a1'), T2 = T('a2'), T3 = T('a3'), T4 = T('a4');
    const lit = { head: win(t, T1 - .2, N('a1')), body: win(t, T2 - .2, N('a2')), tail: win(t, T3 - .2, N('a3')) };
    const any = Math.max(lit.head, lit.body, lit.tail), dim = {}; for (const k in lit) dim[k] = cl(any - lit[k]);
    const ex = 90 * eio(seg(t, T3 + .05, T3 + .65));   // 拧开后保持，主线框在 a4 前整体退场

    // 常驻注释
    tag(t, .3, '数值均为示意', 1840, 104, { sz: 32, col: TH.note, al: 'right' });

    // 主线框：a0 描出，a1–a3 轮流点亮一个部件，a4 前退场
    g.save(); g.globalAlpha = 1 - seg(t, T4 - .45, T4);
    if (g.globalAlpha > 0) drawTorch(t, MAIN, OX, CY, { draw: [.3, 1.4, 1.1, 1.6, 2.3, 1.3], dim, lit, explode: ex });
    g.restore();

    // a0 整体：线框描出，扫描一遍
    scn(t, T0 - .5, N('a0'), () => {
      tag(t, .5, '一只手电筒 · 线框拆解', 80, 104, { sz: 40 });
      scan(t, T0 + 2.7, { x: OX - 40, y: CY - 175, w: MAIN.len + 80, h: 350 }, { dur: 1.2 });
    });

    // a1 灯头
    scn(t, T1, N('a1'), () => {
      tag(t, T1 + .1, '灯头：透镜和反光杯', 80, 104, { sz: 40 });
      partFrame(t, T1 + .3, 1102, 362, 306, 356, { idx: '01', label: '灯头' });
      leader(t, T1 + .7, [1366, 400], [1470, 336]);
      readout(t, T1 + .9, { label: '口径 · 示意', value: 36, unit: 'mm', dur: 1.2 }, 1440, 160);
      leader(t, T1 + 2.0, [1376, 600], [1470, 750]);
      readout(t, T1 + 2.2, { label: '透镜厚 · 示意', value: 2.5, unit: 'mm', decimals: 1, dur: 1.2 }, 1440, 750);
      scan(t, T1 + 4.5, { x: 1102, y: 362, w: 306, h: 356 }, { dur: 1 });
    });

    // a2 筒身
    scn(t, T2, N('a2'), () => {
      tag(t, T2 + .1, '筒身：握持段带滚花', 80, 104, { sz: 40 });
      partFrame(t, T2 + .3, 472, 422, 686, 236, { idx: '02', label: '筒身' });
      leader(t, T2 + .7, [830, 450], [830, 336]);
      readout(t, T2 + .9, { label: '筒长 · 示意', value: 96, unit: 'mm', dur: 1.2 }, 640, 160);
      leader(t, T2 + 2.0, [720, 630], [800, 750]);
      readout(t, T2 + 2.2, { label: '壁厚 · 示意', value: 1.8, unit: 'mm', decimals: 1, dur: 1.2 }, 760, 750);
      scan(t, T2 + 4.5, { x: 472, y: 422, w: 686, h: 236 }, { dur: 1.1 });
    });

    // a3 尾盖：先拧开（往左挪），再框住
    scn(t, T3, N('a3'), () => {
      tag(t, T3 + .1, '尾盖：拧开，看螺纹和弹簧', 80, 104, { sz: 40 });
      partFrame(t, T3 + .6, 160, 417, 368, 246, { idx: '03', label: '尾盖' });
      leader(t, T3 + .9, [470, 462], [470, 336]);
      readout(t, T3 + 1.1, { label: '螺纹 · 示意', value: 6, unit: '圈', dur: 1.1 }, 400, 160);
      leader(t, T3 + 2.3, [192, 560], [250, 750]);
      readout(t, T3 + 2.5, { label: '按键行程 · 示意', value: 1.2, unit: 'mm', decimals: 1, dur: 1.2 }, 220, 750);
      scan(t, T3 + 4.9, { x: 160, y: 417, w: 368, h: 246 }, { dur: 1 });
    });

    // a4 旧款 / 新款
    scn(t, T4, N('a4') + 3, () => {
      tag(t, T4 + .1, '旧款 / 新款 对比', 80, 104, { sz: 40 });
      tag(t, T4 + .3, '旧款（示意）', 110, 282, { sz: 32, col: TH.dim });
      drawTorch(t, OLD, 132, 390, { s: .5, draw: [T4 + .2, .9, T4 + .4, 1, T4 + .7, .9], dim: { tail: .45, body: .45, head: .45 }, lit: { tail: 0, body: 0, head: 0 } });
      tag(t, T4 + .5, '新款（示意）', 110, 612, { sz: 32 });
      drawTorch(t, MAIN, 132, 720, { s: .5, draw: [T4 + .4, .9, T4 + .6, 1, T4 + .9, .9], dim: { tail: 0, body: 0, head: 0 }, lit: { tail: .7, body: .7, head: .7 } });
      compareBar(t, T4 + .6, { a: 152, b: 134, unit: 'mm', title: '全长 · 示意' }, 820, 230, 1020);
      compareBar(t, T4 + 3.0, { a: 118, b: 96, unit: 'g', title: '重量 · 示意' }, 820, 560, 1020);
      scan(t, T4 + 5.2, { x: 100, y: 630, w: 600, h: 180 }, { dur: 1.1 });
    });
  },
};
})();
