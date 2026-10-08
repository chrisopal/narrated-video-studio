(() => {
const { stage, cam, P, scene, ground, block, house, tree, crate, route, road, mover, truck, slot, belt, stack, tag, on, PAL } = PACK.iso;
// 题目（虚构）：一个包裹从仓库到门口。沙盘坐标 x 朝右下、y 朝左下，单位是格。
const A = id => T(id);
const WIDE = { x: 7.75, y: 4.8, z: 0, s: 58, sx: 960, sy: 560 };          // 全景
const NEAR = { x: 8.9, y: 3.3, z: 1.3, s: 88, sx: 1100, sy: 650 };     // 推到分拣站
const ROAD = route([[0, 5.75], [15.5, 5.75]]);                         // 主路：从沙盘左边进来，一直通到右边
const PATH = route([[14.1, 5.3], [14.1, 4.2]]);                        // 住家门前的小路
const CR = [PAL.coral, PAL.kraft, '#c99358'];                           // 三只货箱：第 0 只是主角
const TK = { stopW: 3.5, stopS1: 8.3, stopS2: 10.1, stopH: 14.39 };     // 车（中心）停在主路上的距离
const tkPos = d => ROAD.at(d);
// 车的关键帧
const truckKeys = () => [[A('a1') + .2, .8], [A('a1') + 1.4, TK.stopW], [A('a1') + 3.6, TK.stopW], [A('a2') - .3, TK.stopS1], [A('a2') + 3.0, TK.stopS1], [A('a2') + 3.9, TK.stopS2],
  [A('a3') + .8, TK.stopS2], [A('a3') + 2.8, TK.stopH], [A('a4') + 1.0, TK.stopH], [A('a4') + 8.6, .8]];
// 时刻表：装车（仓库）→ 卸下过分拣站再装回 → 主角送到门口
const tLoad = i => A('a1') + 1.3 + i * .5, dLoad = .9;
const UNLOAD = [2, 1, 0], tUn = j => A('a2') + 1.7 + j * .55, dUn = 2.6;     // 第 j 个下车的是 UNLOAD[j]，回来坐到车斗第 j 个位置
const tDel = () => A('a3') + 3.0, dDel = .9;
const openK = t => seg(t, A('a2') + 1.0, A('a2') + 2.4) - seg(t, A('a2') + 5.6, A('a2') + 6.8);
const zoomK = t => eio(seg(t, A('a2'), A('a2') + 1.3)) * (1 - eio(seg(t, A('a3') - .3, A('a3') + 1.0)));
function loadAt(t) {   // 车斗三个位置上各是什么颜色
  const L = [null, null, null];
  for (let i = 0; i < 3; i++) if (t >= tLoad(i) + dLoad) L[i] = CR[i];
  for (let j = 0; j < 3; j++) { const c = UNLOAD[j]; if (t >= tUn(j)) L[c] = null; }
  for (let j = 0; j < 3; j++) if (t >= tUn(j) + dUn) L[j] = CR[UNLOAD[j]];
  if (t >= tDel()) L[2] = null;
  return L;
}
function title(t, t0, t1, a, b) {
  const k = eo(seg(t, t0, t0 + .5)) * (1 - seg(t, t1 - .4, t1)); if (k <= 0) return;
  txt(a, 96, 156 + (1 - k) * 24, 60, TH.ink, 'H9', 'left', k);
  if (b) txt(b, 98, 216 + (1 - k) * 24, 36, TH.dim, 'H7', 'left', k);
}
function world(t) {
  const a0 = A('a0'), a1 = A('a1'), a2 = A('a2'), a3 = A('a3'), a4 = A('a4'), op = openK(t);
  const L = [];
  L.push(ground(0, 0, 15.5, 9.6, { t0: a0 - .9 }));
  L.push(road(t, ROAD, { t0: a0 - .3, dur: 1.6 }), road(t, PATH, { t0: a0 + 3.4, dur: .5, wid: .5, col: '#c9bfa9', dash: false }));
  // 三座房子依次升起
  L.push(house(1.4, 1.2, 3.6, 2.8, 2.2, { col: PAL.blue, t0: a0 + .7, door: { face: 'l', u: .5, w: .7, h: 1.0 }, wins: { r: 3 } }));
  const inner = [];
  L.push(house(13.3, 2.6, 1.6, 1.6, 1.4, { col: PAL.mustard, roofCol: PAL.coral, roof: 'gable', ridge: 'y', t0: a0 + 1.5, door: { face: 'l', u: .5, w: .45, h: .85 }, wins: { r: 2 } }));
  // 传送带：仓库门口一段；分拣站门外两段，里面一个 U 形
  L.push(belt(t, 3.2, 4.0, 0, 1.3, { axis: 'y', speed: .8, k: eo(seg(t, a0 + 2.4, a0 + 3.0)) }));
  L.push(belt(t, 8.0, 4.3, 0, 1.0, { axis: 'y', speed: -.8, k: eo(seg(t, a0 + 2.6, a0 + 3.2)) }), belt(t, 9.8, 4.3, 0, 1.0, { axis: 'y', speed: .8, k: eo(seg(t, a0 + 2.8, a0 + 3.4)) }));
  if (op > 0) {
    inner.push(belt(t, 8.0, 2.75, 0, 1.55, { axis: 'y', speed: -.8 }), belt(t, 8.25, 3.0, 0, 1.3, { axis: 'x', speed: .8 }), belt(t, 9.8, 2.75, 0, 1.55, { axis: 'y', speed: .8 }));
    // 扫描门：货箱经过时顶上的灯变红
    let lit = 0;
    const gate = [block(8.84, 2.6, 0, .12, .1, 1.15, { col: '#6b7a86' }), block(8.84, 3.3, 0, .12, .1, 1.15, { col: '#6b7a86' })];
    inner.push(gate, { gateBeam: true });
    for (const [x, y] of [[7.42, 2.0], [7.42, 2.46], [10.42, 2.0], [10.42, 2.46]]) inner.push(crate(x, y, 0, .4, { col: PAL.kraft }), crate(x, y, .4, .4, { col: '#c99358' }));
    inner.lit = () => lit; inner.setLit = v => { lit = Math.max(lit, v); };
  }
  // 车
  const tk = mover(t, ROAD, truckKeys(), p => truck(p, { col: PAL.coral, load: loadAt(t), k: seg(t, a0 + 3.0, a0 + 3.6) }), {});
  if (t >= a0 + 3.0) L.push(tk);
  // 装车：货箱从仓库门口出来，沿传送带上车
  for (let i = 0; i < 3; i++) {
    const s0 = tLoad(i), dst = slot(tkPos(TK.stopW), i, 1), R = route([[3.2, 4.2, .45], [3.2, 5.3, .45], dst]);
    L.push(mover(t, R, [[s0, 0], [s0 + dLoad, R.len]], p => crate(p.x, p.y, p.z, .27 * cl((t - s0) / .2), { col: CR[i] }), { enter: true, exit: true, ease: 'lin' }));
  }
  // 分拣站：下车 → 进门 → 过扫描门 → 出门 → 回到车上
  for (let j = 0; j < 3; j++) {
    const c = UNLOAD[j], s0 = tUn(j), a = slot(tkPos(TK.stopS1), c, 1), b = slot(tkPos(TK.stopS2), j, 1);
    const R = route([a, [8.0, 5.3, .45], [8.0, 3.0, .45], [9.8, 3.0, .45], [9.8, 5.3, .45], b]);
    const it = mover(t, R, [[s0, 0], [s0 + dUn, R.len]], p => crate(p.x, p.y, p.z, .27, { col: CR[c] }), { enter: true, exit: true, ease: 'lin' });
    if (it) { if (it.pos.y < 4.3 && op > 0) { inner.push(it); if (Math.abs(it.pos.x - 8.9) < .35 && Math.abs(it.pos.y - 3) < .1) inner.setLit(1 - Math.abs(it.pos.x - 8.9) / .35); } else if (it.pos.y >= 4.3) L.push(it); }
  }
  // 扫描门的横梁（要知道灯亮不亮，所以最后才做）
  const gi = inner.findIndex(x => x && x.gateBeam);
  if (gi >= 0) inner[gi] = block(8.84, 2.6, 1.05, .12, .8, .14, { col: inner.lit() > 0 ? PACK.iso.mix('#6b7a86', PAL.coral, inner.lit()) : '#6b7a86' });
  L.push(house(7, 1.6, 3.8, 2.7, 2.0, { col: PAL.teal, t0: a0 + 1.1, open: op, lift: 2.7, inside: inner, wins: { l: 0, r: 2 } }));
  // 主角送到门口
  { const s0 = tDel(), R = route([slot(tkPos(TK.stopH), 2, 1), [14.1, 5.05, 0], [14.1, 4.37, 0]]);
    L.push(mover(t, R, [[s0, 0], [s0 + dDel, R.len]], p => crate(p.x, p.y, p.z, .27, { col: PAL.coral }), { enter: true })); }
  // 树
  [[.6, .7], [.7, 2.7], [6.0, .9], [6.2, 2.5], [12.0, 1.0], [11.8, 3.6], [14.7, 1.2], [.8, 7.7], [7.3, 8.6], [8.6, 7.4], [14.2, 7.6], [6.6, 7.1], [11.4, 8.1], [12.7, 7.1]]
    .forEach(([x, y], i) => L.push(tree(x, y, { s: .9 + rnd(i + 3) * .3, t0: a0 + 1.9 + i * .08, col: i % 3 ? PAL.leaf : '#6fb36a' })));
  // 一天的量：小箱子一个个堆在货场上
  L.push(block(2.0, 6.9, 0, 2.9, 2.3, .06, { col: '#e9dfc8', t0: a4 + .2, shadow: false }));
  const st = stack(t, a4 + .8, 24, 2.3, 7.2, { cols: 4, rows: 3, size: .5, gap: .1, rate: .15, palette: [PAL.kraft, '#c99358', '#e0b07a'] });
  L.push(st);
  scene(L);
  // 标签
  tag(t, a0 + 1.4, '仓库', 3.2, 2.6, 2.36, { up: 64, col: PAL.blue, t1: a2 });
  tag(t, a0 + 1.9, '分拣站', 8.9, 2.95, 2.16, { up: 64, col: PAL.teal, t1: a2 });
  tag(t, a0 + 2.4, '住家', 14.1, 3.4, 2.0, { up: 64, col: PAL.mustard, t1: a2 + .2 });
  tag(t, a1 + 1.0, '传送带', 3.2, 4.75, .45, { up: 128, col: PAL.coral, t1: a1 + 4.8 });
  const zk = zoomK(t);
  if (zk > .98) {
    tag(t, a2 + 2.3, '扫描门', 8.9, 2.6, 1.2, { up: 70, col: PAL.coral, t1: a3 - .4 });
    tag(t, a2 + 2.8, '里面的传送带', 8.0, 3.75, .45, { up: 80, col: PAL.teal, t1: a3 - .4 });
  }
  tag(t, a3 + 3.6, '门口', 14.1, 4.37, .27, { up: 120, col: PAL.coral });
  const sk = seg(t, a4 + .7, a4 + 1.0);
  if (sk > 0) tag(t, a4 + .7, `一天送出 ${st.count} 件（示意）`, 3.45, 8.05, 1.0, { up: 150, col: PAL.mustard });
}
window.FILM = { theme: 'iso', chrome: 'none', chapters: ['搭沙盘', '装车出发', '剖开分拣站', '送到门口', '一天多少'],
  cover: { pill: '风格包样片', title: '等距沙盘', line1: '一个包裹', line2: '从仓库到门口', tagline: '虚构场景 · 示意图',
    art(c, cx, cy, R) { on(c, () => stage(0, { x: 3.2, y: 2.4, z: .6, s: R * .3, sx: cx, sy: cy + R * .1 }, () => {
      const p = { x: 3.8, y: 3.75, z: 0, dx: 1, dy: 0 };
      scene([ground(0, 0, 6.4, 5, {}), road(9, route([[0, 3.75], [6.4, 3.75]]), {}),
        house(.6, .6, 2.4, 2, 1.8, { col: PAL.blue, door: { face: 'l', u: .5, w: .6, h: .9 }, wins: { r: 2 } }),
        house(3.6, .7, 2.1, 1.7, 1.4, { col: PAL.mustard, roofCol: PAL.coral, roof: 'gable', wins: { l: 2 }, door: { face: 'r', u: .5, w: .4, h: .8 } }),
        truck(p, { col: PAL.coral, load: [PAL.coral, PAL.kraft, '#c99358'] }), stack(9, 0, 10, .5, 4.2, { cols: 5, rows: 2, size: .38, gap: .08, rate: .01, palette: [PAL.kraft, '#c99358'] }),
        tree(5.9, 4.6, { s: .9 }), tree(.4, 2.9, { s: 1 })]);
    })); } },
  scenes(t) {
    const zk = zoomK(t);
    stage(t, cam(WIDE, NEAR, zk), () => world(t));
    title(t, A('a0') - .5, A('a1') - .1, '一个包裹的路', '从仓库，到门口');
    title(t, A('a1') + .1, A('a2') - .1, '装车，沿路线出发', '货箱顺着传送带上车');
    title(t, A('a2') + .1, A('a3') - .1, '剖开看里面', '屋顶升起，露出传送带');
    title(t, A('a3') + .1, A('a4') - .1, '送到门口', '车沿着路开到住家门前');
    title(t, A('a4') + .1, A('a4') + 9, '一天送了多少', '一只箱子代表一件（示意）');
    const nk = (1 - zk);
    const na = seg(nk, .85, 1); if (na > 0) txt('示意图，未按比例', 1850, 940, 32, TH.dim, 'H5', 'right', na);
  } };
})();
