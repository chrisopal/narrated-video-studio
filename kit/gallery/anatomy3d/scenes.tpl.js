(() => {
const A = PACK.anatomy, { K, G, AU, fit, view, camLerp, plate, basePlate, post, solid, line, dots, turned, turn3d, fx, env, follow, settle, labelPlate, ruler } = A;
// 题目（虚构的器械，数字都是示意）：焊接转台。工件在转台上匀速转，焊枪不动；火焰、热斑、火花都画在同一个镜头里。
// 世界坐标：x、y 在底座上，z 朝上；一个单位约 1 毫米。
const T_ = id => T(id);
const BASE = { x: -130, y: -140, w: 260, d: 250, r: 8 };
const PED = { r: 30, z1: 14 }, TABLE = { r: 70, z0: 14, z1: 20 }, WORK = { r: 34, z0: 20, z1: 44 };
const COL = [-24, -122], ARM = { x: -30, y: -128, w: 12, d: 152, r: 2 }, ARM_Z = 76;
const TIP = [-24, 18, 60];                                    // 喷嘴口：正对工件上沿（工件半径 34，喷嘴在 y=18 的上方，焰落在上沿边上）
const SPOT = [-24, 18, WORK.z1];
const RPM = 5;                                                // 示意：每分钟 5 转
const angle = t => 360 * RPM / 60 * follow(t, [[0, 0], [.3, 1]], .6) * Math.max(0, t - .3) + 0;   // 起步时慢慢加速（跟随 0→1 的转速）
// 火：点火、熄火都骑在包络上；热斑跟着火慢慢升温、慢慢冷下去（临界阻尼，不突变）
const fire = t => env(t, T_('a1') + .8, T_('a3') + .6, { a: .5, d: .6 });
const heat = t => settle(t, [[0, 0], [T_('a1') + .8, 1], [T_('a3') + .6, 0]], .9);
const P = fit([...K.boxCorners(BASE, -20, 0), ...K.boxCorners(ARM, ARM_Z, ARM_Z + 8)], { x: 220, y: 150, w: W - 440, h: H - 380 }, { az: 45, el: 31 });
const NEAR = view({ at: [-14, 20, 44], sx: W * .5, sy: H * .55, s: P.v.s * 2.3, az: 45, el: 31 });
const S = turn3d(P, (T, h) => {
  h.fixed('stand.base', AU.slab(BASE, -12, 12, {}, 8), 'back', { ground: true });
  h.fixed('stand.pedestal', AU.cylinder(0, 0, PED.r, 0, PED.z1), 'back');
  const table = T.group('table', { turn: { pivot: [0, 0] } }), L = h.layer.live;
  T.round({ name: 'table.disc', group: table, layer: L, F: h.VERT(0, 0), s0: TABLE.z0, s1: TABLE.z1, r: TABLE.r, tone: 'mid', material: 'steel', details: { ribs: { s0: TABLE.z0 + .5, s1: TABLE.z1 - .5, count: 160, seams: true, tone: 'lo' }, bolts: [{ s: TABLE.z1, r: 58, count: 12, size: .55, tone: 'mid' }] } });
  T.round({ name: 'work.body', group: table, layer: L, F: h.VERT(0, 0), s0: WORK.z0, s1: WORK.z1, r: WORK.r, tone: 'hi', material: 'gunmetal', details: { seams: [WORK.z0 + 6, WORK.z1 - 3] } });
  for (let i = 0; i < 3; i++) { const a = i * 2 * Math.PI / 3 + .4, cx = 50 * Math.cos(a), cy = 50 * Math.sin(a), u = [Math.cos(a), Math.sin(a), 0], v = [-Math.sin(a), Math.cos(a), 0];
    T.prism({ name: `clamp.${i}`, group: table, layer: L, F: { o: [cx, cy, 0], a: [0, 0, 1], u, v }, polygon: [[-7, -6], [7, -6], [7, 6], [-7, 6]], s0: TABLE.z1, s1: TABLE.z1 + 8, round: 1.2, bevel: .5, material: 'brass', details: { dots: [{ at: [TABLE.z1 + 8, 3, 0], normal: [0, 0, 1], size: .55 }] } }) }
}, { pose: t => ({ table: angle(t) }) });
function machine(t, P2) {
  basePlate(P2, BASE);
  labelPlate(P2, { x: 70, y: -128, w: 46, d: 18, r: 2 }, 0);
  ruler(P2, { x: -110, y: 92, w: 120, z: 0 });
  solid(K.cylinder(0, 0, PED.r, 0, PED.z1, P2, 64, .8), { tone: 'lo', name: 'stand.pedestal' });
  // 立柱在转台后面：先画
  post(P2, COL[0], COL[1], 0, ARM_Z, { r: 6 });
  // 热斑：焊枪对着的那一小块被烧红（画在工件上沿，热斑在活动层之上）
  S.draw(t, P2, 'live');
  fx('glow', t, P2, { at: SPOT, r: 7, heat: heat(t), plan: { x: -40, y: -40, w: 80, d: 80, r: 34 } });
  // 焰和火花在喷嘴下面：先画；焊枪从下往上画（喷嘴 → 枪身 → 横臂），上面的东西挡住下面的
  fx('flame', t, P2, { base: TIP, dir: -1, r: 2.6, len: TIP[2] - SPOT[2] + 2, power: fire(t) });
  fx('sparks', t, P2, { at: SPOT, t0: T_('a1') + 1.2, t1: T_('a3') + .4, rate: 26, life: .7, speed: 110, dir: [-.5, .9, .8], spread: .55, floor: 0, seed: 7 });
  turned(P2, [[0, 0], [0, 4.6], [4, 2.2], [4, 0]], G.frameAlong([TIP[0], TIP[1], 64], [0, 0, -1]), {}, { tone: 'hi', name: 'torch.nozzle', lit: fire(t) > .05 });
  solid(K.cylinder(TIP[0], TIP[1], 6, 64, ARM_Z - 64, P2, 32, .6), { tone: 'mid', name: 'torch.body', inner: () => line(K.sideArc(TIP[0], TIP[1], 6, 70, P2, 24), { tone: 'faint' }) });
  solid(K.slabOf(ARM, ARM_Z, 8, P2, 4, .8), { tone: 'mid', name: 'arm' });
}
const HINT = [['a0', '工件在转台上匀速转'], ['a1', '点火：火焰、热斑、火花'], ['a2', '凑近看落点'], ['a3', '熄火：热斑慢慢冷下去']];
window.FILM = { theme: '__THEME__', chrome: 'none', chapters: ['转台', '点火', '凑近', '熄火'],
  cover: { pill: '风格包样片', title: '器物解剖', line1: '3D 转动和光效', line2: '一台焊接转台', tagline: '虚构器械 · 示意数据',
    art(c, cx, cy, R) { A.on(c, () => { const Pc = view({ ...P.v, sx: cx, sy: cy + R * .15, s: P.v.s * R / 330 }); machine(T_('a2') + 1, Pc) }) } },
  scenes(t) {
    const k = eio(seg(t, T_('a2') + .2, T_('a2') + 2)) * (1 - eio(seg(t, T_('a3') - .2, T_('a3') + 1.6)));
    const P2 = k > 0 ? camLerp(P, NEAR, k) : P;
    const i = HINT.reduce((n, h, j) => t >= T_(h[0]) - .1 ? j : n, 0), ang = angle(t) % 360;
    plate(t, T_('a0') - .4, { fig: '图 2', title: '焊接转台（示意）', hint: HINT[i][1], readout: `转台 ${RPM} 转/分 · ${ang.toFixed(0)}°`, draw: () => machine(t, P2) });
  } };
})();
