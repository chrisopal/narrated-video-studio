// 器物解剖 · check.js —— 本项目自己写：把上游的几何审计（audit.js）和线头检查接到工坊的逐帧画法上
// 线头检查照上游 scripts/line-ends.mjs 的量法在 canvas 上重写（MIT，提交见 README.md）；几何审计直接调用改过来的 audit.js。
//
// 做法：量一帧时把 A.rec 设成一个记录本 Rec，再画一遍这一帧。包里的每个画法顺手登记：
//   画了哪些线（哪些要查线头）、哪些圆点、哪些填色（在第几笔、用什么变换）、哪些零件（真实形状、名字、第几笔）、哪些管线（路线、半径、接谁）。
// 画完以后：
//   线头：每根纹理线的两头要落在别的线、轮廓、圆点上，或者被之后画的零件盖住；短刻度至少一头生根。
//   几何：零件按“第几笔”当作前后顺序（key），交给上游的 audit：遮挡顺序和真实前后一致吗、管子穿过零件了吗、管子的头落在接口上吗、
//         零件互相陷进去了吗、有没有悬空的零件、屏幕上折成尖角的弯、压在别的线上的弯头……
// 入口：window.anatomyScan({times, step}) —— build.py check 和 build.py anatomy 调它；window.anatomyMarks(问题) 在画面上圈出问题。
(() => {
const A = PACK.anatomy, K = A.K, AU = A.AU;
const camKey = (P) => [P.origin[0], P.origin[1], P.scale, P.azimuth ?? 45, P.elevation ?? 30].map(v => Math.round(v * 1000) / 1000).join(',');
const mOf = (X) => X.getTransform();
const mapPt = (m, [x, y]) => [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f];
const mScale = (m) => Math.sqrt(Math.abs(m.a * m.d - m.b * m.c)) || 1;
// pathOf 只出 M、L、Z：拆成子路径（点列）
function subpaths(d) {
  const out = []; let cur = null;
  for (const [, c, args] of d.matchAll(/([MLZ])([^MLZ]*)/g)) {
    const v = (args.match(/-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi) || []).map(Number);
    if (c === 'Z') { if (cur) { cur.closed = true; cur.points.push(cur.points[0]) } cur = null; continue }
    for (let i = 0; i + 1 < v.length; i += 2) {
      if (c === 'M' && i === 0) { cur = { points: [[v[0], v[1]]], closed: false }; out.push(cur) }
      else (cur || (cur = { points: [], closed: false }, out.push(cur), cur)).points.push([v[i], v[i + 1]]);
    }
  }
  return out;
}

class Rec {
  constructor(t) { this.t = t; this.n = 0; this.strokes = []; this.checked = []; this.dots = []; this.fills = []; this.cams = new Map(); this.untagged = new Set(); this.pending = new Map() }
  cam(P) {
    const k = camKey(P); let c = this.cams.get(k);
    if (!c) { c = { P, R: AU.recorder(P) }; this.cams.set(k, c) }
    return c;
  }
  stroke(d, X, entry = {}) { if (!d) return; const m = mOf(X); for (const sp of subpaths(d)) this.strokes.push({ ...entry, flat: sp.points.map(p => mapPt(m, p)) }) }
  fill(d, X, alpha) { if (d && alpha >= .5) this.fills.push({ path: A.P2(d), m: mOf(X), order: this.n }) }
  solid(paths, o, X, a) {
    const order = this.n++;
    this.fill(paths.fill, X, a * X.globalAlpha);
    if (!paths.shape || !paths.P) { this.untagged.add(o.name || '没起名的零件'); return }
    const c = this.cam(paths.P), name = c.R.nameFor(o.name || 'part');
    const meta = { name }; for (const k of ['ground', 'owner', 'touch', 'seated', 'bundle', 'limp', 'cut']) if (o[k] !== undefined) meta[k] = o[k];
    const shape = c.R.solid({ ...paths.shape, ...meta });
    c.R.put({ name, key: order, shapes: [shape], svg: `<path d="${paths.fill}"/>` });
  }
  edges(paths, X) { for (const k of ['outline', 'crease', 'bevel']) this.stroke(paths[k], X, { edge: true }) }
  line(d, o, X, a) {
    const order = this.n++, m = mOf(X), alpha = a * X.globalAlpha;
    for (const sp of subpaths(d)) {
      const flat = sp.points.map(p => mapPt(m, p)), id = this.strokes.length;
      this.strokes.push({ flat, id, own: true });
      if (alpha >= .3 && !o.edge) this.checked.push({ id, flat, closed: sp.closed, free: o.free === true ? 'both' : o.free || '', order, s: A.lookScale() * mScale(m), what: o.name || o.tone || 'lo', mark: !!o.mark, clip: this.clip || [0, 0, W, H] });
    }
  }
  // 画框里裁掉的地方看不见：线头在框外的不查（推近镜头时很多线伸出框外）
  clipTo(box, X) { if (!box) { this.clip = null; return } const m = mOf(X), a = mapPt(m, [box.x, box.y]), b = mapPt(m, [box.x + box.w, box.y + box.h]); this.clip = [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0], b[0]), Math.max(a[1], b[1])] }
  dot(x, y, r, X) { const m = mOf(X), [cx, cy] = mapPt(m, [x, y]); this.dots.push({ cx, cy, r: r * mScale(m) }) }
  route(P, route, r, o, pcs) {
    const c = this.cam(P), name = c.R.nameFor(o.name || 'pipe');
    c.R.route(name, route, r, { owner: o.owner || name, touch: o.touch, bundle: o.bundle, limp: o.limp, gaps: o.gaps || [], free: o.free || [false, false], ends: o.ends, rims: o.rims, closed: o.closed });
    pcs.forEach((pc, i) => this.pending.set(pc, { c, name, chunk: i }));
  }
  tubePiece(pc, o, X, a) {
    const order = this.n++, info = this.pending.get(pc);
    this.fill(pc.body, X, a * X.globalAlpha); this.stroke(pc.edges, X, { edge: true });
    if (!info) return;
    info.c.R.put({ name: `${info.name}:${info.chunk}`, key: order, route: info.name, chunk: info.chunk, shapes: [AU.tube(pc.points, pc.radii, { name: info.name })], svg: `<path d="${pc.body}"/>` });
  }
}

/* ---------- 线头（照上游 line-ends.mjs 的量法） ----------
   容差都按线宽缩放：s = 线宽/0.6 × 当前变换的倍数（上游是 0.6 像素的线、viewBox 单位）。 */
const scratch = document.createElement('canvas').getContext('2d');
function lineEnds(rec, { tolerance = 1, root = 2, mark = 7, least = .2 } = {}) {
  const cell = 12, grid = new Map(), add = (gx, gy, e) => { const id = gx + ',' + gy; (grid.get(id) || grid.set(id, []).get(id)).push(e) };
  rec.strokes.forEach((st, si) => { for (let i = 0; i + 1 < st.flat.length; i++) { const a = st.flat[i], b = st.flat[i + 1]; for (let gx = Math.floor(Math.min(a[0], b[0]) / cell); gx <= Math.floor(Math.max(a[0], b[0]) / cell); gx++) for (let gy = Math.floor(Math.min(a[1], b[1]) / cell); gy <= Math.floor(Math.max(a[1], b[1]) / cell); gy++) add(gx, gy, { kind: 's', si, i, a, b }) } });
  rec.dots.forEach(d => { for (let gx = Math.floor((d.cx - d.r) / cell); gx <= Math.floor((d.cx + d.r) / cell); gx++) for (let gy = Math.floor((d.cy - d.r) / cell); gy <= Math.floor((d.cy + d.r) / cell); gy++) add(gx, gy, { kind: 'd', d }) });
  const near = (p, reach) => { const out = new Set(); for (let gx = Math.floor((p[0] - reach) / cell); gx <= Math.floor((p[0] + reach) / cell); gx++) for (let gy = Math.floor((p[1] - reach) / cell); gy <= Math.floor((p[1] + reach) / cell); gy++) for (const e of grid.get(gx + ',' + gy) || []) out.add(e); return out };
  const segD = (p, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy, t = L > 0 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L)) : 0; return Math.hypot(p[0] - a[0] - dx * t, p[1] - a[1] - dy * t) };
  const hidden = (order, p) => rec.fills.some(f => f.order > order && (scratch.setTransform(f.m), scratch.isPointInPath(f.path, p[0], p[1])));
  const problems = []; let ends = 0;
  for (const ln of rec.checked) {
    const f = ln.flat; if (ln.closed || f.length < 2) continue;
    const s = ln.s, first = f[0], last = f[f.length - 1];
    if (Math.hypot(first[0] - last[0], first[1] - last[1]) < .05 * s) continue;
    const along = [0]; for (let i = 1; i < f.length; i++) along.push(along[i - 1] + Math.hypot(f[i][0] - f[i - 1][0], f[i][1] - f[i - 1][1]));
    const total = along[along.length - 1]; if (total < least * s) continue;
    const slack = tolerance * s, rooted = root * s, reach = Math.max(slack, rooted), res = {};
    for (const [end, p] of [['start', first], ['end', last]]) {
      if (ln.free === 'both' || ln.free === end) { res[end] = 0; continue }
      const c = ln.clip; if (p[0] < c[0] - 2 || p[1] < c[1] - 2 || p[0] > c[2] + 2 || p[1] > c[3] + 2) { res[end] = 0; continue }   // 裁在框外，看不见
      ends++;
      if (hidden(ln.order, p)) { res[end] = 0; continue }
      let best = Infinity;
      for (const e of near(p, reach * 4)) {
        if (e.kind === 'd') { const dd = Math.hypot(p[0] - e.d.cx, p[1] - e.d.cy); best = Math.min(best, Math.max(0, dd - e.d.r)); continue }
        if (e.si === ln.id) { const gap = end === 'start' ? along[e.i] : total - along[e.i + 1]; if (gap < 2 * reach) continue }
        best = Math.min(best, segD(p, e.a, e.b));
      }
      res[end] = best;
    }
    const straight = f.length === 2 || f.every(q => segD(q, first, last) < .15 * s), isMark = ln.mark || (straight && total <= mark * s);   // 刻度自己声明 mark（推近以后它在屏幕上变长，按长度猜会猜错）
    let bad = [];
    if (isMark) { const b = Math.min(res.start ?? Infinity, res.end ?? Infinity); if (!(b <= rooted)) bad = ['start', 'end'].filter(e => res[e] !== undefined && res[e] > 0) }
    else bad = ['start', 'end'].filter(e => res[e] !== undefined && res[e] > slack);
    for (const end of bad) { const p = end === 'start' ? first : last; problems.push({ at: [Math.round(p[0]), Math.round(p[1])], gap: Math.round(res[end] / s * 10) / 10, what: ln.what, mark: isMark, len: Math.round(total) }) }
  }
  return { ends, lines: rec.checked.length, problems };
}

/* ---------- 几何：每个镜头一个记录本，用“第几笔”当前后顺序，交给上游的 audit ---------- */
// 取样密度按世界单位定：重叠的光线投射每 0.2 单位一格（推近时屏幕上的格子跟着变大，不会慢十倍），接触图的表面每 1 单位取一点
const CACHE = {};
function geometry(rec, { grid = .2, spacing = 1 } = {}) {
  const out = [];
  for (const { P, R } of rec.cams.values()) {
    if (!R.items.length && !R.tubes.length) continue;
    const items = R.items.slice(), k = K.cameraOf(P).k, step = Math.max(.5, grid * k), least = 4 * step * step;
    const t0 = performance.now(), overlaps = AU.overlapsOf(items, P, { states: [0], skip: AU.sameRun, step, least });
    R.settled = { items, overlaps, solved: { dropped: [], rules: 0, keys: items.map(i => i.key) }, states: [0] };
    const t1 = performance.now(), res = AU.audit(R, P, { frames: [], apart: false, supportSpacing: spacing, supportCache: CACHE });
    if (window.ANATOMY_PROFILE) console.log('overlaps', Math.round(t1 - t0), 'audit', Math.round(performance.now() - t1), 'items', items.length, 'pairs', overlaps.pairs.length);
    out.push({ P, R, res });
  }
  return out;
}
const f1 = v => (Math.round(v * 10) / 10).toFixed(1), p3 = p => p ? `(${p.map(v => Math.round(v)).join(', ')})` : '';
const scr = (P, p) => p && p.length === 3 ? K.iso(p, P).map(Math.round) : p;
// 把一帧的结果翻成中文条目：{kind, key（去重用）, msg, at（画面坐标）}
function itemsOf(t, ln, geo, rec) {
  const out = [], T = t.toFixed(1) + 's';
  for (const p of ln.problems) out.push({ kind: 'line', key: `line|${p.what}|${Math.round(p.at[0] / 8)}|${Math.round(p.at[1] / 8)}`, msg: `${T} 线头悬空：一根 ${p.what} 线${p.mark ? '（短刻度，两头都没生根）' : ''}的头离最近的线或零件还有 ${p.gap} 个线宽，在画面 (${p.at.join(', ')})`, at: p.at });
  for (const { P, R, res } of geo) {
    const freeEnd = (e) => R.tubes.some(tb => tb.name === e.tube && tb.free && tb.free[e.end === 'end' ? 1 : 0]);   // 标了 free 的头（比如还在画出来的电缆的头）本来就不接东西
    for (const d of res.depth.problems) out.push({ kind: 'order', key: `order|${d.front}|${d.back}`, msg: `${T} 遮挡顺序画反：${d.front} 在 ${d.back} 前面，却先画了（重叠 ${f1(d.area)} px²，深度差 ${f1(d.depth)}）${d.cycle ? '；两件互相穿插，要把其中一件切开' : ''}`, at: d.at });
    for (const c of [...res.clearance, ...(res.flight || [])]) out.push({ kind: 'through', key: `through|${c.tube}|${c.other}`, msg: c.solid ? `${T} 穿模：${c.tube} 陷进 ${c.other} ${f1(-c.clearance)}` : `${T} 管线贴得太近或穿过：${c.tube} × ${c.other} 间隙 ${f1(c.clearance)}（要 ≥ ${f1(c.need)}）`, at: scr(P, c.at) });
    for (const sk of res.supports.sunk) out.push({ kind: 'through', key: `sunk|${sk.a}|${sk.b}`, msg: `${T} 穿模：${sk.a} 和 ${sk.b} 互相陷进去 ${f1(sk.depth)}`, at: null });
    for (const e of res.terminals.filter(e => !freeEnd(e))) out.push({ kind: 'terminal', key: `term|${e.tube}|${e.end}`, msg: `${T} 管线的头没落在接口上：${e.tube} 的${e.end === 'start' || e.end === 0 ? '起点' : '终点'}离最近的零件 ${e.nearest || '—'} 还有 ${Number.isFinite(e.d) ? f1(e.d) : '∞'}`, at: scr(P, e.at) });
    for (const n of res.supports.loose) out.push({ kind: 'support', key: `loose|${n}`, msg: `${T} 零件悬空：${n} 没有通过接触连到底座（stand.*）上——装配动画的中途是正常的，停稳以后不该有`, at: null });
    for (const n of res.supports.hanging || []) out.push({ kind: 'support', key: `hang|${n}`, msg: `${T} 管子悬空：${n} 不接任何有支撑的东西`, at: null });
    for (const b of res.folds) out.push({ kind: 'fold', key: `fold|${b.name}`, msg: `${T} 管线在屏幕上折成尖角：${b.name}（屏幕上转 ${Math.round(b.flatTurn)}°）`, at: scr(P, b.at) });
    for (const c of res.crowding) out.push({ kind: 'crowd', key: `crowd|${c.a}|${c.b}`, msg: `${T} 管线的${c.where === 'end' ? '端头' : '弯头'}压在别的线上：${c.a} × ${c.b}（看起来像接在一起）`, at: c.screen && c.screen.map(Math.round) });
    for (const c of res.self) out.push({ kind: 'fold', key: `self|${c.name}`, msg: `${T} 管子的轮廓在屏幕上自己打结：${c.name}`, at: c.screen && c.screen.map(Math.round) });
    for (const c of res.cover) out.push({ kind: 'cover', key: `cover|${c.name}`, msg: `${T} 登记的形状只盖住画出来的 ${Math.round(c.share * 100)}%：${c.name}（审计看不全它）`, at: null });
    for (const w of res.wobble) out.push({ kind: 'fold', key: `wobble|${w.name}`, msg: `${T} 曲面轮廓的斜率来回摆：${w.name}`, at: null });
  }
  for (const n of rec.untagged) out.push({ kind: 'untagged', key: `untagged|${n}`, msg: `${T} 这件零件没有登记形状，几何审计看不见它：${n}（用包里的几何函数造，或在 solid 里给 shape）`, at: null });
  return out;
}

// 量一帧：再画一遍这一帧，边画边记
function recordFrame(t) {
  const rec = new Rec(t); A.rec = rec;
  try { window.renderFrame(t) } finally { A.rec = null }
  return rec;
}
// 整片或指定时刻：{times:[…]} 或 {step:秒}；只量画了器物零件的帧
window.anatomyScan = async (o = {}) => {
  const t0 = performance.now(), T = total(), times = o.times || Array.from({ length: Math.floor(T / (o.step || .5)) + 1 }, (_, i) => +(i * (o.step || .5)).toFixed(2)).filter(t => t < T);
  const seen = new Map(); let frames = 0, ends = 0, nlines = 0, parts = 0;
  for (const t of times) {
    await window.renderFrameA(t);
    const rec = recordFrame(t);
    if (!rec.n) continue;
    frames++;
    const ln = lineEnds(rec), geo = o.geometry === false ? [] : geometry(rec, o);
    ends += ln.ends; nlines += ln.lines; parts += [...rec.cams.values()].reduce((s, c) => s + c.R.items.length, 0);
    for (const it of itemsOf(t, ln, geo, rec)) { const e = seen.get(it.key); if (e) { e.n++; e.last = t } else seen.set(it.key, { ...it, t, last: t, n: 1 }) }
  }
  // 悬空的零件：装配动画里零件从上面落下来，中途悬空是正常的；悬空超过 1 秒才算
  const dt = o.step || .5;
  for (const [k, e] of seen) if (e.kind === 'support' && (o.times ? false : e.n * dt <= 1)) seen.delete(k);
  const list = [...seen.values()].map(e => ({ kind: e.kind, msg: e.msg + (e.n > 1 ? `（${e.t.toFixed(1)}–${e.last.toFixed(1)}s 共 ${e.n} 帧）` : ''), t: e.t, at: e.at }));
  return { frames, ends, lines: nlines, parts, turns: (A.TURNS || []).length, ms: Math.round(performance.now() - t0), list };
};
// 在画面上圈出问题（build.py anatomy --out 用）：画完这一帧以后调
window.anatomyMarks = (marks) => {
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
  for (const m of marks) if (m.at) { g.strokeStyle = m.kind === 'line' ? '#ff0050' : '#ff7a00'; g.lineWidth = 3; g.beginPath(); g.arc(m.at[0], m.at[1], 14, 0, 7); g.stroke() }
  g.restore();
};
A.lookScale = A.lookScale || (() => 2.5);
Object.assign(A, { Rec, lineEnds, geometry, recordFrame });
})();
