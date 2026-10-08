(() => {
const { plate, etch, hatch, callNo, loupe, tint, S, on, COPPER, STEEL } = PACK.engrave;

/* 一把虚构的老式挂锁（示意图，不对应任何真实型号）。坐标：锁体 520–880 × 450–770，锁梁中心线圆心 (700,330) */
const SHK = S.poly([...S.curve(u => [580, lerp(450, 330, u)], 20), ...S.arc(700, 330, 120, Math.PI, 2 * Math.PI, 48).slice(1), ...S.curve(u => [820, lerp(330, 450, u)], 20).slice(1)], false);
const SHK_R = S.band(SHK, 22);
const BODY = S.rrect(520, 450, 360, 320, 34);
const TOPCAP = S.poly([...S.arc(554, 484, 34, Math.PI, 1.5 * Math.PI, 10), ...S.arc(846, 484, 34, 1.5 * Math.PI, 2 * Math.PI, 10), [880, 486], [520, 486]]);
const BOTCAP = S.poly([[520, 734], [880, 734], ...S.arc(846, 736, 34, 0, .5 * Math.PI, 10), ...S.arc(554, 736, 34, .5 * Math.PI, Math.PI, 10)]);
const MID = S.rect(520, 486, 360, 248);
const CAPL = [S.line(520, 486, 880, 486), S.line(526, 494, 874, 494), S.line(526, 726, 874, 726), S.line(520, 734, 880, 734)];
const RIV = [[550, 468], [850, 468], [550, 752], [850, 752]].map(([x, y]) => S.circle(x, y, 8, 20));
const PLUG = S.circle(700, 612, 46, 48);
const KH = S.poly([...S.arc(700, 600, 13, Math.PI * 2 / 3, Math.PI * 7 / 3, 24), [709, 638], [691, 638]]);
const SH = S.ellipse(772, 796, 215, 17);
const HALO = S.ellipse(778, 797, 262, 30);

// 明暗：左上来光。锁体像一块微鼓的厚板，亮带在左边三成处
const bodyShade = (x, y) => { const xr = (x - 520) / 360, s = xr < .28 ? .12 + .5 * (.28 - xr) / .28 : .12 + .95 * Math.pow((xr - .28) / .72, 1.25); return cl(s + .14 * (y - 450) / 320); };
// 锁梁是一根圆钢：v 是横截面上的位置（-1 外侧，+1 内侧），按表面法向和光的夹角算暗度
const shkShade = (x, y, v) => { let nx = 700 - x, ny = y < 330 ? 330 - y : 0; const m = Math.hypot(nx, ny) || 1; nx /= m; ny /= m; const d = v * (nx * -.707 + ny * -.707); return cl(.42 - .5 * d + .12 * Math.abs(v)); };
const haloShade = (x, y) => cl(1.1 * (1 - Math.hypot((x - 778) / 262, (y - 797) / 30)) - .05);

function lock(t, T0, T1, T4) {
  // 刻：外形
  etch(t, T0 + .6, 1.5, SHK_R, { lw: 2.8 });
  etch(t, T0 + 2.0, 1.2, BODY, { lw: 3 });
  etch(t, T0 + 3.1, .7, CAPL, { lw: 1.6 });
  etch(t, T0 + 3.6, .5, RIV, { lw: 1.6 });
  etch(t, T0 + 4.0, .8, [PLUG, KH], { lw: 2 });
  // 排线：一组一组出明暗
  hatch(t, T1 + .1, 1.6, MID, { angle: 90, gap: 7, lw: 2.3, shade: bodyShade, cross: true, crossFrom: .66 });
  hatch(t, T1 + 1.7, .8, [TOPCAP, BOTCAP], { angle: 0, gap: 6, lw: 2, shade: (x, y) => cl(bodyShade(x, y) + .12) });
  hatch(t, T1 + 2.5, 1.2, SHK_R, { along: SHK, width: 22, gap: 5.5, lw: 2.1, shade: shkShade });
  hatch(t, T1 + 3.7, .7, SH, { angle: -18, gap: 5, lw: 2, cross: 64, crossFrom: 0, tone: .85, contrast: .35 });
  hatch(t, T1 + 4.4, .5, HALO, { dots: true, gap: 5, dotR: 1.5, shade: haloShade });
  hatch(t, T1 + 4.9, .5, [PLUG, KH], { rings: [700, 612], gap: 5, lw: 1.8, tone: .5, contrast: .9 });
  hatch(t, T1 + 5.4, .3, KH, { angle: 45, gap: 3.2, lw: 2, cross: true, crossFrom: 0, tone: 1, contrast: 0 });
  hatch(t, T1 + 5.7, .3, RIV, { dots: true, gap: 3.2, dotR: 1.4, tone: .55, contrast: 1.2 });
  // 上色：一次刷进去，锁梁铁灰、锁体淡铜（放大框里的弹子和钥匙夹在中间上）
  tint(t, T4 + .3, 1.4, SHK_R, STEEL, { alpha: .36, angle: 4 });
  tint(t, T4 + 3.6, 1.9, BODY, COPPER, { alpha: .46, angle: -8 });
}

/* 放大框里：锁芯剖视（示意）。插对的钥匙把每粒弹子顶到同一条分界线上 */
const PX = [652, 676, 700, 724, 748], CUT = [648, 640, 652, 644, 650], SHEAR = 616, REST = 660, DRV = 16;
const KP = [[560, 637], ...PX.flatMap((x, i) => [[x - 4, CUT[i]], [x + 4, CUT[i]], [x + 12, 637]]), [774, 660]];
function keyTop(xr) { if (xr < KP[0][0] || xr > KP[KP.length - 1][0]) return null; for (let i = 1; i < KP.length; i++) if (xr <= KP[i][0]) { const a = KP[i - 1], b = KP[i]; return lerp(a[1], b[1], (xr - a[0]) / Math.max(1e-6, b[0] - a[0])); } return null; }
const DISC = S.circle(700, 612, 82, 64), PLUGB = S.rect(600, SHEAR, 200, 50), CH = PX.map(x => S.rect(x - 7, 560, 14, SHEAR - 560));
function detail(t, T3, T4) {
  const off = -150 * (1 - eio(seg(t, T3 + 3.0, T3 + 4.6)));
  const pins = PX.map((x, i) => { const kt = keyTop(x - off), yb = Math.min(REST, kt == null ? REST : kt), top = yb - (CUT[i] - SHEAR);
    return { x, yb, top, kp: S.poly([[x - 6, top], [x + 6, top], [x + 6, yb - 5], [x, yb], [x - 6, yb - 5]]), dp: S.rect(x - 6, top - DRV, 12, DRV), sp: S.zigzag(x, 562, top - DRV, 10, 7) }; });
  const key = S.poly([...KP.map(([x, y]) => [x + off, y]), [774 + off, 662], [560 + off, 662]]);
  // 外壳剖面：45° 剖面线；锁芯：反方向剖面线
  hatch(t, T3 + .7, 1.0, [DISC, PLUGB, ...CH], { angle: 45, gap: 7, lw: 1.7, tone: .5, contrast: .5 });
  etch(t, T3 + 1.0, .7, [S.line(600, SHEAR, 800, SHEAR), S.line(600, 666, 800, 666), ...CH], { lw: 2 });
  hatch(t, T3 + 1.3, .8, [S.rect(600, SHEAR, 200, 18), ...PX.map(x => S.rect(x - 7, SHEAR, 14, 18))], { angle: -45, gap: 7, lw: 1.5, tone: .35, contrast: .3 });
  hatch(t, T3 + 1.3, .8, [S.rect(600, 662, 200, 4)], { angle: -45, gap: 7, lw: 1.5, tone: .35, contrast: .3 });
  // 钥匙从左边插进来（插进来之前在框外）
  hatch(t, T3 + 2.9, .01, key, { angle: 0, gap: 4.5, lw: 1.5, tone: .45, contrast: .7, light: [0, -1] });
  etch(t, T3 + 2.9, .01, key, { lw: 2.2 });
  // 弹子：下面一粒随钥匙齿起落，上面一粒加弹簧压着
  pins.forEach((p, i) => {
    etch(t, T3 + 1.6 + i * .15, .5, [p.kp, p.dp], { lw: 2 });
    hatch(t, T3 + 2.1 + i * .08, .5, p.kp, { angle: 90, gap: 4.5, lw: 1.6, shade: (x) => cl(.12 + .8 * (x - p.x + 6) / 12) });
    hatch(t, T3 + 2.1 + i * .08, .5, p.dp, { angle: 0, gap: 4, lw: 1.6, shade: (x) => cl(.3 + .7 * (x - p.x + 6) / 12) });
    etch(t, T3 + 2.4 + i * .08, .5, p.sp, { lw: 1.5 });
  });
  // 分界线：弹子全部对齐时刻出来
  etch(t, T3 + 4.8, .8, Array.from({ length: 12 }, (_, i) => S.line(606 + i * 16, SHEAR, 614 + i * 16, SHEAR)), { lw: 1.6 });
  // 上色：弹子淡铜，钥匙铁灰
  tint(t, T4 + 1.9, 1.0, pins.flatMap(p => [p.kp, p.dp]), COPPER, { alpha: .52, angle: 90, edge: 4 });
  tint(t, T4 + 2.7, 1.1, key, STEEL, { alpha: .42, angle: 0, edge: 4 });
}

window.FILM = {
  theme: 'engrave', chrome: 'none', chapters: ['刻形', '排线', '标注', '放大', '上色'],
  cover: { pill: '风格包样片', title: '铜版画', line1: '刻线 · 排线 · 编号 · 放大', line2: '最后淡淡上一层色', tagline: '一把虚构的老式挂锁（示意）',
    art(c, cx, cy, R) { on(c, () => { c.save(); c.translate(cx, cy); c.scale(R / 300, R / 300); c.translate(-720, -500); lock(99, 0, 0, 0); c.restore(); }); } },
  scenes(t) {
    const A0 = T('a0'), A1 = T('a1'), A2 = T('a2'), A3 = T('a3'), A4 = T('a4');
    plate(t, .15, { x: 240, y: 110, w: 1440, h: 760, no: '图版 壹', head: '器物图谱', title: '挂锁 · 外形与锁芯', note: '示意图，未按比例' });
    lock(t, A0, A1, A4);
    callNo(t, A2 + .3, 1, [606, 236], [430, 250], '锁梁');
    callNo(t, A2 + 1.6, 2, [657, 596], [430, 560], '锁芯');
    callNo(t, A2 + 2.9, 3, [700, 634], [430, 690], '钥匙孔');
    loupe(t, A3 + .1, [1340, 400], 230, 3, tt => detail(tt, A3, A4), { src: [700, 612], label: '锁芯剖视 · 放大示意', labelDy: 68, dur: 1.1 });
  }
};
})();
