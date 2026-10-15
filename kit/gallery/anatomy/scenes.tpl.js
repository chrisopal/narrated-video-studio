(() => {
const { K, G, view, fit, camLerp, at, solid, line, dots, wire, pipe, turned, softShadow, follow, spring, env, drop,
  basePlate, ruler, labelPlate, rail, post, knob, coil, dial, plate, on, look } = PACK.anatomy;
// 题目（虚构的小器械，数字都是示意）：一台弹簧测力台。拧旋钮，丝杠推着滑台压弹簧；表盘和读数都读同一个模型。
// 世界坐标：x 朝右下、y 朝左下、z 朝上；单位约等于真东西的 1 毫米。
const A = id => T(id);
const PLATE = { x: -130, y: -60, w: 270, d: 120, r: 8 };
const ROD_Y = [-18, 18], ROD_Z = 12, ANCHOR = -90, STOP = 70, BLOCK = 94;   // 两根导杆、左边固定座的右面、右边挡块、丝杠座
const DIAL = [50, 42];                            // 表在前沿，立在立柱上
const KSP = 2, PITCH = 6, FULL = 40;             // 示意：弹簧 2 N/mm（两根合起来），丝杠导程 6 mm/圈，表盘一圈 40 mm
// —— 模型：丝杠给出目标位移，松开时弹簧把滑台推回去（回弹一次）。零件、表针、读数都读 disp(t) 这一个数 ——
function disp(t) {
  const a1 = A('a1'), a2 = A('a2'), a4 = A('a4');
  const screw = follow(t, [[0, 0], [a1 + .6, 24], [a2 + .3, 24], [a4 + .8, 12]], .7);     // 丝杠拧进去（慢、平滑）
  if (t < a2 + .3) return screw;
  if (t < a4 + .8) return spring(t, [[0, 24], [a2 + .3, 0]], { f: .9, z: 1 });             // 松开：弹簧推回（有阻尼，不过冲：视频里的读数不能正负来回闪）
  return follow(t, [[0, 0], [a4 + .8, 12]], .7);
}
const force = d => KSP * d;
// —— 机器：按画家顺序（远的先画）——
function machine(t, P, d) {
  const a0 = A('a0'), cx = -d;                          // 滑台中心在 x = cx（往左推是正位移）
  const lit = t < A('a2') ? 'knob' : 'carriage';
  const dz = t0 => drop(t, a0 + t0, { h: 36 });
  // 底座、铭牌、刻度尺
  const zB = dz(0); if (zB === Infinity) return;
  { const P0 = zB ? view({ ...P.v, sy: P.v.sy - zB * P.v.s * .3 }) : P; basePlate(P0, PLATE, { z: 0 }); }
  if (zB > 2) return;
  if (t > a0 + .5) { labelPlate(P, { x: 76, y: -52, w: 42, d: 16, r: 2 }, 0); ruler(P, { x: -116, y: 44, w: 136, z: 0, zero: -90 }) }
  // 左固定座（拉力传感器座）
  const zA = dz(.6); if (zA !== Infinity) {
    solid(K.slabOf({ x: -104, y: -30, w: 14, d: 60, r: 2 }, zA, 24, P, 4, .8), { tone: 'mid', halo: zA > 0 });
    dots([[-100, -24], [-100, 24], [-94, -24], [-94, 24]].map(([x, y]) => at([x, y, zA + 24], P)), { size: .5 });
  }
  const zR = dz(1.1), rodsIn = zR !== Infinity;
  const rodSlab = (x0, x1, y) => K.slabOf({ x: x0, y: y - 2, w: x1 - x0, d: 4, r: 1.8 }, ROD_Z - 2 + (rodsIn ? zR : 0), 4, P, 3);
  const carIn = drop(t, a0 + 1.6) !== Infinity, springsIn = t > a0 + 2.1, sk = eo(seg(t, a0 + 2.1, a0 + 2.9));
  // 远的那根导杆：左段 + 弹簧（背面半圈 → 杆 → 正面半圈）
  for (const y of ROD_Y) {
    if (!rodsIn) break;
    const left = () => solid(rodSlab(ANCHOR, carIn ? cx - 14 : STOP, y), { tone: 'mid', crease: 'none' });   // 滑台还没装上时是一整根
    if (springsIn) coil(P, { from: ANCHOR, to: ANCHOR + (cx - 14 - ANCHOR) * sk, center: [y, ROD_Z], r: 4.4, turns: 7, axis: 'x', tone: 'hi' }, left); else left();
  }
  // 滑台：底板、四个衬套、前沿铆钉、一块接触块
  const zC = dz(1.6); if (zC !== Infinity) {
    const z0 = 4 + zC, body = { x: cx - 14, y: -26, w: 28, d: 52, r: 3 };
    solid(K.slabOf(body, z0, 16, P, 5, .6), { tone: 'hi', lit: lit === 'carriage' && t > A('a2') + .2, halo: zC > 0 });
    for (const [bx, by] of K.corners(body, 5)) { line(K.ring(bx, by, 2.4, z0 + 16, P, 18), { tone: 'lo' }); dots([at([bx, by, z0 + 16], P)], { size: .5 }) }
    dots([-9, -3, 3, 9].map(k => at([cx + 14, k * 2, z0 + 3], P)), { size: .4, tone: 'lo' });
    line(K.planOutline(K.insetPlan(body, 7), z0 + 16, P), { tone: 'faint' });
  }
  // 右边：远的导杆右段 → 远的挡柱 → 推杆（车削出来的球头，从两根挡柱中间穿过）→ 近的导杆右段 → 近的挡柱 → 丝杠座和旋钮
  const zS = dz(.9), zK = dz(2.4), pillar = y => { if (zS !== Infinity) solid(K.slabOf({ x: STOP, y: y - 7, w: 10, d: 14, r: 2 }, zS, 22, P, 4, .8), { tone: 'mid' }) };
  if (rodsIn && carIn) solid(rodSlab(cx + 14, STOP, ROD_Y[0]), { tone: 'mid', crease: 'none' });
  pillar(ROD_Y[0]);
  if (zK !== Infinity) { const tip = cx + 14;
    turned(P, [[0, 0], [0, 1.4], [.6, 2.4, 1], [1.6, 3, 1], [3, 3.1], [3, 2.2], [BLOCK - tip, 2.2]], G.frameAlong([tip, 0, ROD_Z + zK], [1, 0, 0]), {}, { tone: 'hi' }) }
  if (rodsIn && carIn) solid(rodSlab(cx + 14, STOP, ROD_Y[1]), { tone: 'mid', crease: 'none' });
  pillar(ROD_Y[1]);
  if (zK !== Infinity) {
    const B = { x: BLOCK, y: -14, w: 18, d: 28, r: 2.5 };
    solid(K.slabOf(B, zK, 24, P, 4, .8), { tone: 'mid', halo: zK > 0, inner: () => line(K.sideSeam(B, zK + 8, P, 4), { tone: 'faint' }) });
    knob(P, BLOCK + 9, 0, zK + 24, { r: 8, h: 6, angle: -d / PITCH * Math.PI * 2, lit: lit === 'knob' && t > A('a1') - .2 && t < A('a2') + .2 });
  }
  // 信号线：从左座前面的接口沿板面走到表的立柱脚（画在立柱和表之前：它在表的后下方）
  if (t > a0 + 3.2) {
    const k = eo(seg(t, a0 + 3.2, a0 + 4.4)), end = [DIAL[0] - 4.6, DIAL[1] - 2, 2.5], route = G.fillet([[-97, 30, 6], [-97, 35, 1.4], [DIAL[0] - 12, 35, 1.4], end], 3.2);
    const L = G.pathLength(route), part = G.cut(route, 0, Math.max(.5, L * k));
    pipe(P, part, 1.1, { tone: 'mid', caps: true });
    if (k >= 1) dots([at([-97, 30, 6], P)], { size: 1, tone: 'hi' });
  }
  // 表：立柱上的表盘
  const zD = dz(2.8); if (zD !== Infinity) {
    post(P, DIAL[0], DIAL[1], zD, 22, { r: 3 });
    dial(P, DIAL[0], DIAL[1], zD + 22, { R: 16, h: 8, value: d / FULL, mark: 24 / FULL });
  }
}
// —— 镜头 ——
const PTS = K.boxCorners(PLATE, -20, 56);
let WIDE = null;
const CLOSE = () => ({ at: [52, 24, 22], sx: W * .5, sy: H * .5, s: WIDE.v.s * 2.6, az: 57, el: 30 });
function camAt(t) {
  if (!WIDE) WIDE = fit(PTS, { x: 140, y: 150, w: W - 280, h: H - 410 }, { pad: 0, az: 57 });
  const k = eio(seg(t, A('a3') + .2, A('a3') + 2.2)) * (1 - eio(seg(t, A('a4') - .4, A('a4') + 1.2)));
  const near = view({ ...CLOSE(), s: CLOSE().s * (1 + .08 * seg(t, A('a3') + 2.2, A('a4'))) });   // 推到位后继续极慢地推，画面不死
  const wide = view({ ...WIDE.v, s: WIDE.v.s * (1 + .06 * eio(seg(t, A('a4') + 1.2, A('a4') + 9))) });   // 收尾时慢慢再推一点，片尾不定格
  return k > 0 ? camLerp(wide, near, k) : wide;
}
const HINT = [['a0', '零件一件件装上去'], ['a1', '拧旋钮，滑台压弹簧'], ['a2', '松开，弹簧把它推回'], ['a3', '推近看，处处是真零件'], ['a4', '读数和指针同一个模型']];
window.FILM = { theme: '__THEME__', chrome: 'none', chapters: ['装起来', '拧旋钮', '松开', '凑近看', '同一个模型'],
  cover: { pill: '风格包样片', title: '器物解剖', line1: '一台弹簧测力台', line2: '原理就是这台机器', tagline: '虚构器械 · 示意数据',
    art(c, cx, cy, R) { on(c, () => { const P = fit(PTS, { x: cx - R * 1.1, y: cy - R * .8, w: R * 2.2, h: R * 1.6 }, { pad: 10, az: 57 }); machine(99, P, 14) }) } },
  scenes(t) {
    look({ lw: 1.5 });
    const d = disp(t), P = camAt(t);
    const i = HINT.reduce((k, h, j) => t >= A(h[0]) - .1 ? j : k, 0);
    plate(t, A('a0') - .4, { fig: '图 1', title: '弹簧测力台（示意）', hint: HINT[i][1], readout: `位移 ${d.toFixed(1)} mm · 力 ${force(d).toFixed(1)} N`,
      draw: () => machine(t, P, d) });
  } };
})();
