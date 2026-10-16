// 器物解剖 · turn3d.js —— 本项目自己写：把上游的 3D 转动（turn-build.js 构建、turn-canvas.js 运行时和画布画家，改自 wheresryan22/anatomy，MIT）接到工坊的逐帧画法上
//
// 3D 转动是给“零件在深度里动就是要讲的东西”用的：转盘、旋钮转一圈、手指弯下去、一块零件掉下来翻滚。别的零件照旧用二维画法。
//   const S = turn3d(P, (T, h) => { …分组和零件… }, { pose: t => ({dial: 40 * t}) });
//   分场里：S.draw(t, P现在, 'live')   —— 在这一笔上把活动层画出来（之前画的二维零件在它下面，之后画的在它上面）
// 规矩（上游 references/3d.md）：只有凸零件（圆台 round、棱柱 prism、球 ball、管 tube…）；零件之间的接触是贴平、相切或边落在平面上；
//   一根管线不跨两个会动的组；pose(t) 是时间的确定函数，构建和审计都用它（构建按它采样所有会出现的姿态，求每对零件的分离平面）。
// 镜头：活动层是按构建时的镜头 P 画的；分场里的镜头只许推拉平移（同样的方位角和仰角），要转着看就把整台机器放进一个 turn 组里转。
(() => {
const A = PACK.anatomy, K = A.K, G = A.G;
const UNIT = Math.sqrt(1.6);
A.TURNS = [];
// spans：这台 3D 机器在片子里出现的时段 [[t0, t1], …]（可以写成函数，构建时才取，那时 T()/at() 已经能用）；缺省是整片。
//   构建只采样这些时段里的姿态，轨道审计也只审这些时段里姿态在变的帧（不动的一段每帧都一样，审一帧就够）。
function turn3d(P, build, { pose, follow = (v) => v, layers = ['live'], name = '3d', step = .1, spans = null } = {}) {
  // 要写在 scenes() 外面（脚本顶层），只建一次；写进了 scenes() 会每帧都调到：这里认出同名的就直接用原来那个
  const old = A.TURNS.find(x => x.name === name);
  if (old) { if (!old.warnedTwice) console.error(`anatomy.turn3d：“${name}”建了不止一次。turn3d 要写在 scenes() 外面；两台不同的 3D 机器要起不同的 name`); old.warnedTwice = true; return old }
  if (typeof pose !== 'function') console.error('anatomy.turn3d：要给 pose: t => ({组名: 值…})，构建和审计都靠它');
  const S = { name, P, pose, follow, layers, built: null };
  const filmEnd = () => typeof total === 'function' && TL.length ? total() : 10;
  S.spans = () => { const s = typeof spans === 'function' ? spans() : spans; return (s && s.length ? s : [[0, filmEnd()]]).map(([a, b]) => [Math.max(0, a), Math.min(filmEnd(), b)]).filter(([a, b]) => b >= a) };
  // 构建在第一次画的时候做（那时时间轴已经有了，才知道整片有多长、要采样哪些姿态）
  S.build = () => {
    if (S.built) return S.built;
    const t0 = performance.now(), R = A.AU.recorder(P), T = A.TBLD.turning(P, { recorder: R });
    const h = { VERT: (x, y) => G.frameOf([x, y, 0], [0, 0, 1], [1, 0, 0], [0, 1, 0]), frameOf: G.frameOf, frameAlong: G.frameAlong, layer: {}, AU: A.AU };
    // 二维画的、不动的零件（底座、支架）也要登记给 3D 构建：它证明每个静止零件和活动层的前后关系不变，审计也才知道活动零件立在什么上。
    // h.fixed(名字, 形状, 'back'|'front')：形状用 AU.slab / AU.cylinder / AU.solid…；ground:true 表示它就是地（底座）
    h.fixed = (nm, shape, layer = 'back', meta = {}) => R.put({ name: nm, layer, shapes: [R.solid(Object.assign(shape, { name: nm }, meta))], svg: '' });
    for (const L of layers) h.layer[L] = T.layer(L);
    T.stack(['back', ...layers, 'front']);   // 二维零件分两层：活动层之前画的 back、之后画的 front
    const extra = build(T, h) || {};
    const poses = () => S.spans().flatMap(([a, b]) => Array.from({ length: Math.ceil((b - a) / step) + 1 }, (_, i) => follow(pose(Math.min(b, a + i * step))))).concat(extra.poses ? extra.poses() : []);
    const out = T.build({ statics: R.items, poses, strict: true });
    S.built = { T, R, out, h, ms: Math.round(performance.now() - t0) };
    return S.built;
  };
  // 离屏舞台：活动层的 SVG（运行时每帧改它）+ 画布画家把它画到一张和主画布一样大的画布上
  S.mount = () => {
    if (S.ctl) return;
    const { out } = S.build(), T0 = A.tokens(), stage = document.createElement('div');
    stage.className = 'iso iso-stage iso-turn'; stage.dataset.theme = TH && TH.light ? 'light' : 'dark';
    const v = { paper: T0.paper, face: T0.face, top: T0.top, 'shade-0': T0.shade[0], 'shade-1': T0.shade[1], 'shade-2': T0.shade[2], 'shade-3': T0.shade[3], 'lit-top': T0.litTop, 'lit-shade': T0.litShade, hi: T0.hi, mid: T0.mid, lo: T0.lo, faint: T0.faint, lit: T0.lit, halo: T0.halo, dot: T0.dot, card: T0.paper };
    stage.style.cssText = `position:fixed;left:-40000px;top:0;width:${W}px;height:${H}px;--anatomy-weight:${A.lineWidth()}px;` + Object.entries(v).map(([k, c]) => `--anatomy-${k}:${c}`).join(';');
    stage.innerHTML = `<style>${K.ISO_CSS}${out.css}</style>` + layers.map(L => out.layerSvg(L, { width: W, height: H })).join('');
    document.body.appendChild(stage);
    S.stage = stage;
    S.ctl = A.TF.TURN.mount(stage, out.data, { follow });
    S.painter = A.TF.CANVAS2D.mount(stage, S.ctl, { keepSvg: true, only: layers });
    S.canvas = Object.fromEntries(layers.map(L => [L, stage.querySelector(`canvas[data-canvas-live="${L}"]`)]));
  };
  // 设好 t 时刻的姿态（同一个 t 只设一次）
  S.at = (t) => { S.mount(); if (S.t !== t) { S.ctl.set(pose(t)); S.t = t; S.zoomKey = null } return S };
  // 把活动层画到当前画笔上：Pnow 必须和构建时同一个方位角和仰角（只能推拉平移）
  S.draw = (t, Pnow = P, layer = layers[0]) => {
    S.at(t);
    const X = A.brush(), M = X.getTransform();
    if (Math.abs((Pnow.azimuth ?? 45) - (P.azimuth ?? 45)) > 1e-6 || Math.abs((Pnow.elevation ?? 30) - (P.elevation ?? 30)) > 1e-6) { if (!S.warned) console.error(`anatomy.turn3d ${name}：分场里的镜头换了方位角或仰角，3D 部分只能推拉平移；要转着看，把整台机器放进一个 turn 组`); S.warned = true }
    const s = Pnow.scale / P.scale, a = M.a, o = [Pnow.origin[0] - s * P.origin[0], Pnow.origin[1] - s * P.origin[1]];
    const z = a * s, off = [a * o[0] + M.e, M.d * o[1] + M.f], key = [z, off[0], off[1]].map(x => x.toFixed(4)).join(',');
    if (S.zoomKey !== key) { S.painter.zoom(z, (W / 2 - off[0]) / z, (H / 2 - off[1]) / z); S.zoomKey = key } else S.painter.paint();
    const c = S.canvas[layer], dpr = window.devicePixelRatio || 1;
    X.save(); X.setTransform(1, 0, 0, 1, 0, 0); X.drawImage(c, 0, 0, c.width / dpr, c.height / dpr); X.restore();
  };
  // 光效跟着零件走：组里一个静止时的点（和方向）现在在哪 —— {world, screen, direction}；screen 是构建镜头下的，要换成现在的镜头用 at(world, Pnow)
  // 返回 {world, screen, direction}；交给 fx 时直接给整个结果或它的 .world 都行
  S.anchor = (t, group, restPoint, restDir) => { S.at(t); return S.ctl.anchor(group, restPoint, restDir) };
  // 轨道审计：拿这条片子自己的每一帧（pose(t)）当动作片段，查穿模、遮挡环、跳变、连续性……（慢：按零件数和帧数，几十秒到几分钟）
  // 只审 spans 里姿态在变的帧：不动的一段每帧都一样，留一帧就够。上游对“根上的转台组”缺省还要扫一整圈 360°（给网页上能拖着转的器物用），
  // 片子里只出现 pose(t) 给的角度，所以这里把那一圈换成一个静止姿态，实际的角度全在片段里。
  S.moving = ({ from = 0, to = null, fps = 30 } = {}) => {
    const dt = 1 / fps, key = t => JSON.stringify(follow(pose(t)), (k, v) => typeof v === 'number' ? Math.round(v * 1e4) / 1e4 : v), out = [];
    for (const [a0, b0] of S.spans()) {
      const a = Math.max(a0, from), b = Math.min(b0, to ?? b0);
      if (b < a) continue;
      let prev = key(a), run = null;
      out.push([a, a]);                                               // 每一段至少审开头那一帧
      for (let t = a + dt; t <= b + 1e-9; t += dt) {
        const k = key(t);
        if (k !== prev) { if (run && run[1] >= t - dt - 1e-9) run[1] = t; else { run = [t - dt, t]; out.push(run) } }
        prev = k;
      }
    }
    return out;
  };
  S.audit = ({ quick = false, from = 0, to = null, fps = 30, only = null, log = null } = {}) => {
    const { T, R } = S.build(), at = (t) => follow(pose(t)), frame = 1 / (quick ? Math.min(fps, 10) : fps);
    const runs = S.moving({ from, to, fps });
    const clips = runs.map(([a, b], i) => ({ name: `film${runs.length > 1 ? i + 1 : ''}`, at, from: a, to: b, frame }));
    // 每个组在片子里走到的范围：连续性和转台扫掠只扫这一段（上游缺省扫整圈、整个行程）
    const ranges = {};
    for (const [a, b] of S.spans()) for (let t = a; t <= b + 1e-9; t += 1 / fps) for (const [g, v] of Object.entries(at(t))) if (typeof v === 'number') { const r = ranges[g] || (ranges[g] = [v, v]); r[0] = Math.min(r[0], v); r[1] = Math.max(r[1], v) }
    const stages = [], t0 = performance.now(), say = (s) => { stages.push([s, performance.now()]); if (log) log(s) };
    const res = A.TA.orbit(T, R, P, { sweep: { name: 'rest', at: () => at(runs.length ? runs[0][0] : 0), from: 0, to: 0, frame: 1, periodic: false, unit: '' }, clips, quick, only, log: say, ranges, groupSweeps: false });
    res.stats.filmSeconds = runs.reduce((s, [a, b]) => s + b - a, 0);
    const slow = stages.map(([s, at0], i) => [s, ((stages[i + 1] ? stages[i + 1][1] : performance.now()) - at0) / 1000]).filter(([, d]) => d > 5).map(([s, d]) => `${s.split(':')[0]} ${d.toFixed(0)} 秒`).join(' · ');
    return { res, report: A.TA.orbitReport(res) + `\n片子里审了 ${runs.length} 段、合计 ${res.stats.filmSeconds.toFixed(1)} 秒（姿态不变的时段每段只审一帧）；各组的范围 ${Object.entries(ranges).map(([g, [lo, hi]]) => `${g} ${lo.toFixed(1)}–${hi.toFixed(1)}`).join('，')}` + (slow ? `\n慢的几步：${slow}` : ''), failures: A.TA.orbitFailures(res), ms: performance.now() - t0 };
  };
  A.TURNS.push(S);
  return S;
}
// 整片的 3D 轨道审计（build.py anatomy --turn 调它；check 只读它留下的结果）
window.anatomyTurnAudit = async (o = {}) => {
  await window.renderFrameA(0);   // 先画一帧：turn3d 写在 scenes() 里的也能登记上
  const out = [];
  for (const S of A.TURNS) { const t0 = performance.now(), r = S.audit(o); out.push({ name: S.name, report: r.report, failures: r.failures, parts: S.built.out.report.parts, ms: Math.round(performance.now() - t0) }) }
  return out;
};
Object.assign(A, { turn3d });
})();
