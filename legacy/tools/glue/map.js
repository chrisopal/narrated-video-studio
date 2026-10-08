/* 用法：
   const M = makeMap({ view:[西经, 南纬, 东经, 北纬], title:'苏子行迹图', start:'眉山', main:['眉山','汴京',...], places:{新地名:[经,纬]},
                       wall:false, canal:true, tone:'ink' | 'litho', labels:[['东海',123.8,30.6,44,.32], ...] });
   M.leg([{p:'眉山'}, {p:[105,31.5]}, {p:'汴京', lab:'汴京 · 一〇五七', side:-1 标在左边}, {p:'儋州', sea:true}], ['出蜀 赴京', '一门三进士'], '一〇五六');   // 一段行程；sea 走水路，arrest 押解
   画：在一个分场里 M.draw(G, u, 时长, { leg:0 })   第 0 段：旧路变淡、朱线生长、小人沿线走、到了落地名
                    M.draw(G, u, 时长, { intro:'眉山', cap:[...], year:'...' })   开场：从全图推到出生地
                    M.draw(G, u, 时长, { all:true, cap:[...] })                   收尾：全部行程依次画出
   可选：traveler(G, x, y, {face, alpha, mode, t}) 自己画行者；seal:true 到达时在终点旁盖一方地名印（终点地名本来就会自动落字，两样挨着，嫌挤就不要印）；
         capX 题记的横向位置（缺省 1790，压到海岸线时往别处挪）；caption(G,u,cap,year,t0) 自己排题记
   自带地名：M.places 里有的可以直接写名字，没有的在 places 里补；写了不认识的名字会报错并告诉你缺哪个 */
const GAZ = Object.assign({}, PL_E, PL_W);
const RIV = [...RIVERS_W, ...RIVERS_E.filter(r => !RIVERS_W.some(w => w.n === r.n))];
const LAKES_ALL = [...LAKES_W, ...LAKES_E.filter(e => !LAKES_W.some(w => w[0] === e[0] && w[1] === e[1]))];
const MTNS_ALL = [...MTNS_W, ...MTNS_E.filter(e => !MTNS_W.some(w => Math.abs(w[0] - e[0]) < .7 && Math.abs(w[1] - e[1]) < .7))];
const LABELS = [['大江', 111.0, 30.2, 24, .5], ['黄河', 106.0, 39.6, 22, .5], ['黄河', 116.6, 37.7, 24, .5], ['淮水', 116.3, 32.3, 20, .42], ['汴河', 116.6, 34.3, 18, .38], ['东海', 123.8, 30.6, 44, .32], ['南海', 115.6, 20.6, 44, .32],
  ['岷江', 103.2, 31.0, 18, .4], ['汉水', 110.2, 33.2, 18, .4], ['赣水', 115.5, 27.4, 17, .42], ['渭水', 107.3, 34.05, 16, .4], ['祁连山', 99.3, 38.2, 20, .5], ['天山', 89.4, 42.6, 24, .5], ['瀚海', 96.3, 41.3, 22, .34], ['青海', 100.2, 36.5, 15, .4], ['昆仑', 90.0, 35.3, 26, .4]];
let PL = GAZ, mp = null;   // 当前这张图的地名表和投影（makeLeg 用）
const easeInOut = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;

function mapBase(M) {
  const { MW, MH, KX, KY, view: [lo0, la0, lo1, la1], cfg } = M, mp = M.mp;
  const LAND = (lo0 >= 94 && lo1 <= 130 && la0 >= 12 && la1 <= 46) ? LAND_E : LAND_W;
  const inView = (lo, la, m = 0) => lo > lo0 - m && lo < lo1 + m && la > la0 - m && la < la1 + m;
  const c = mk(MW, MH), g = c.getContext('2d'), r = rng(909);
  const land = new Path2D();
  for (const ring of LAND) { ring.forEach(([lo, la], i) => { const [x, y] = mp(lo, la); i ? land.lineTo(x, y) : land.moveTo(x, y); }); land.closePath(); }
  // 海：天青淡染 + 水纹
  g.fillStyle = rgba(TQ, .13); g.fillRect(0, 0, MW, MH);
  g.save(); g.globalCompositeOperation = 'destination-out'; g.fill(land); g.restore();
  const sm = 6, mc = mk(MW / sm, MH / sm), mg = mc.getContext('2d'); mg.scale(1 / sm, 1 / sm); mg.fill(land);
  const md = mg.getImageData(0, 0, mc.width, mc.height).data;
  const isLand = (x, y) => { const xi = Math.floor(x / sm), yi = Math.floor(y / sm); if (xi < 0 || yi < 0 || xi >= mc.width || yi >= mc.height) return false; return md[(yi * mc.width + xi) * 4 + 3] > 20; };
  const nearLand = (x, y, d) => isLand(x + d, y) || isLand(x - d, y) || isLand(x, y + d) || isLand(x, y - d);
  g.strokeStyle = rgba(INK, .2); g.lineWidth = 1.3; g.lineCap = 'round';
  for (let y = 12, row = 0; y < MH; y += 30, row++) for (let x = (row % 2) * 24; x < MW; x += 48) {
    const jx = x + (r() - .5) * 8, jy = y + (r() - .5) * 5;
    if (isLand(jx, jy) || nearLand(jx, jy, 14)) continue;
    g.beginPath(); g.arc(jx - 7, jy, 7, Math.PI * 1.08, Math.PI * 1.92); g.stroke();
    g.beginPath(); g.arc(jx + 7, jy, 7, Math.PI * 1.08, Math.PI * 1.92); g.stroke();
  }
  // 陆地淡赭
  g.fillStyle = 'rgba(150,118,76,.07)'; g.fill(land);
  // 计里画方
  if (cfg.grid !== false) { g.strokeStyle = rgba([168, 50, 43], .1); g.lineWidth = 1;
    for (let lo = Math.ceil(lo0); lo <= lo1; lo++) { const [x] = mp(lo, 0); g.beginPath(); g.moveTo(x, 0); g.lineTo(x, MH); g.stroke(); }
    for (let la = Math.ceil(la0); la <= la1; la++) { const [, y] = mp(0, la); g.beginPath(); g.moveTo(0, y); g.lineTo(MW, y); g.stroke(); } }
  // 海岸
  g.lineJoin = 'round';
  g.strokeStyle = rgba(INK, .08); g.lineWidth = 9; g.stroke(land);
  g.strokeStyle = rgba(INK, .72); g.lineWidth = 2.2; g.stroke(land);
  // 湖
  for (const [lo, la, rx, ry] of (cfg.lakes || LAKES_ALL)) { if (!inView(lo, la)) continue; const [x, y] = mp(lo, la); g.beginPath(); g.ellipse(x, y, rx * KX, ry * KY, 0, 0, TAU); g.fillStyle = rgba(TQ, .17); g.fill(); g.strokeStyle = rgba(INK, .5); g.lineWidth = 1.3; g.stroke(); }
  // 江河
  const riverLine = (P, w, a, dash) => {
    const S2 = smoothPts(P.map(p => mp(p[0], p[1])), 8);
    g.setLineDash(dash || []); g.strokeStyle = rgba(INK, a); g.lineWidth = w; g.beginPath(); S2.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke();
    return S2;
  };
  for (const R of (cfg.rivers || RIV)) {
    const S2 = riverLine(R.p, R.w, R.w > 3 ? .72 : .55);
    if (R.w > 3) { g.strokeStyle = rgba(INK, .22); g.lineWidth = 1; g.beginPath(); S2.forEach(([x, y], i) => i ? g.lineTo(x + 3, y + 4) : g.moveTo(x + 3, y + 4)); g.stroke(); }
  }
  if (cfg.canal !== false) riverLine(CANAL_E, 1.6, .45, [7, 5]); g.setLineDash([]);
  // 长城（河西一段）
  if (cfg.wall) { const Wl = smoothPts(WALL_W.map(p => mp(p[0], p[1])), 10); g.strokeStyle = rgba(INK, .75); g.lineWidth = 2; g.beginPath(); Wl.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke();
    g.fillStyle = rgba(INK, .75); for (let i = 0; i < Wl.length - 1; i += 2) { const [x, y] = Wl[i], [x2, y2] = Wl[i + 1], an = Math.atan2(y2 - y, x2 - x); g.save(); g.translate(x, y); g.rotate(an); g.fillRect(-2, -6, 4, 5); g.restore(); } }
  // 山：小峰符号
  const peaks = [];
  for (const [lo, la, sx, sy, n, sz] of (cfg.mountains || MTNS_ALL)) for (let i = 0; i < n; i++) {
    const [x, y] = mp(lo + (r() - .5) * 2 * sx, la + (r() - .5) * 2 * sy); if (!isLand(x, y)) continue;
    if (r() < .42) continue; peaks.push([x, y, sz * (.6 + r() * .4)]);
  }
  peaks.sort((a, b) => a[1] - b[1]);
  for (const [x, y, s] of peaks) {
    const h = 30 * s, w = 17 * s;
    const gr = g.createLinearGradient(0, y - h, 0, y); gr.addColorStop(0, rgba(TQ, .6)); gr.addColorStop(1, 'rgba(236,228,210,0)');
    g.beginPath(); g.moveTo(x - w, y); g.quadraticCurveTo(x - w * .35, y - h * .55, x, y - h); g.quadraticCurveTo(x + w * .35, y - h * .55, x + w, y); g.closePath();
    g.fillStyle = gr; g.fill(); g.strokeStyle = rgba(INK, .5); g.lineWidth = 1.2; g.beginPath(); g.moveTo(x - w, y); g.quadraticCurveTo(x - w * .35, y - h * .55, x, y - h); g.quadraticCurveTo(x + w * .35, y - h * .55, x + w, y); g.stroke();
    g.strokeStyle = rgba(INK, .35); g.lineWidth = 1; g.beginPath(); g.moveTo(x - w * .1, y - h * .8); g.quadraticCurveTo(x - w * .2, y - h * .4, x - w * .45, y - 2); g.stroke();
  }
  // 注记
  const lab = (txt, lo, la, size, a) => { const [x, y] = mp(lo, la); g.save(); g.font = `${size}px ${F.song}`; g.fillStyle = rgba(INK, a); g.textAlign = 'center'; g.textBaseline = 'middle'; [...txt].forEach((ch, i) => g.fillText(ch, x, y + i * size * 1.15)); g.restore(); };
  const done = new Set();
  for (const [txt, lo, la, size, a] of (cfg.labels || LABELS)) { if (!inView(lo, la, -1) || done.has(txt)) continue; if (txt === '长城' && !cfg.wall) continue; done.add(txt); lab(txt, lo, la, size, a); }
  if (cfg.wall && inView(101.5, 39.2)) lab('长城', 101.5, 39.2, 16, .5);
  // 四边淡出
  g.save(); g.globalCompositeOperation = 'destination-out';
  const fe = 260; [[0, 0, fe, 0, 0, 0, fe, MH], [MW, 0, MW - fe, 0, MW - fe, 0, fe, MH], [0, 0, 0, fe, 0, 0, MW, fe], [0, MH, 0, MH - fe, 0, MH - fe, MW, fe]].forEach(([x0, y0, x1, y1, rx, ry, rw, rh]) => {
    const gr = g.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(rx, ry, rw, rh);
  });
  g.restore();
  if (cfg.tone === 'litho') { const c2 = mk(MW, MH), g2 = c2.getContext('2d'); g2.filter = 'contrast(1.7) saturate(.5)'; g2.drawImage(c, 0, 0); g2.filter = 'none'; g2.globalAlpha = .5; g2.drawImage(c, 0, 0); return c2; }
  return c;
}
// 地名：朱红小方块 + 竖排地名。'黄州 · 一〇八〇' 这样带年份的分成两列（地名靠点，年份在外），底下垫纸条；side=-1 放到点的左边
function drawPlace(g, x, y, name, a, big = false, dark = false, slip = false, side = 1) {
  if (a <= 0) return;
  g.save(); g.globalAlpha *= a;
  g.fillStyle = SEAL; g.strokeStyle = 'rgba(60,20,15,.8)'; g.lineWidth = 1;
  const s = big ? 12 : 8; g.fillRect(x - s / 2, y - s / 2, s, s); g.strokeRect(x - s / 2, y - s / 2, s, s);
  if (name) {
    const fs = big ? 36 : 32, cols = name.split(' · '), lead = fs * 1.1, cw = fs * 1.12;   // 旧片是 30/21，手机上读不清（经验库 L-009）
    const colX = i => x + side * (s / 2 + fs * .72 + i * cw), len = c => { let L = 0; for (const ch of c) L += ch === ' ' ? .4 : 1; return L; }, hmax = Math.max(...cols.map(len)) * lead;
    const xa = Math.min(colX(0), colX(cols.length - 1)) - fs * .6, xb = Math.max(colX(0), colX(cols.length - 1)) + fs * .6, y0 = y - fs * .6;
    if (slip || cols.length > 1) { g.fillStyle = 'rgba(236,226,202,.9)'; g.fillRect(xa, y0, xb - xa, hmax + fs * .25); g.strokeStyle = 'rgba(29,27,24,.35)'; g.strokeRect(xa, y0, xb - xa, hmax + fs * .25); }
    g.textAlign = 'center'; g.textBaseline = 'middle';
    cols.forEach((c, i) => { g.font = `${fs}px ${big ? F.songb : F.song}`; g.fillStyle = i ? SEAL : dark ? SEAL : 'rgba(29,27,24,.9)'; let yy = y - fs * .05;
      for (const ch of c) { if (ch === ' ') { yy += lead * .4; continue; } g.fillText(ch, colX(i), yy); yy += lead; } });
    if (typeof REC !== 'undefined' && REC && REC.tx && a > .5) REC.tx.push([name, Math.round(xa), Math.round(y0), Math.round(xb), Math.round(y0 + hmax + fs * .25), +a.toFixed(2), fs]);
  }
  g.restore();
}
function mapTitle(g, a, title) {
  if (a <= 0 || !title) return; const n = [...title].length, h = n * 44 + 30;
  g.save(); g.globalAlpha = a; g.strokeStyle = 'rgba(29,27,24,.7)'; g.lineWidth = 1.2; g.strokeRect(70, 70, 68, h); g.strokeRect(76, 76, 56, h - 12);
  g.fillStyle = 'rgba(236,228,210,.6)'; g.fillRect(77, 77, 54, h - 14);
  g.font = `32px ${F.songb}`; g.fillStyle = INKS; g.textAlign = 'center'; g.textBaseline = 'middle';
  [...title].forEach((ch, i) => g.fillText(ch, 104, 112 + i * 44)); g.restore();
}
function mapCaption(g, u, cap, year, t0 = .8, X = 1790) {
  if (!cap || !cap.length) return;
  { const w = (cap.length + (year ? 1 : 0)) * 58 + 30, n = Math.max(...cap.map(c => [...c].length), [...(year || '')].length), a = ss(t0 - .3, t0 + .5, u); g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = a * .82; g.fillStyle = 'rgb(236,228,210)'; g.fillRect(X + 44 - w, 104, w, n * 43 + 60); g.restore(); }   // 垫一块纸色，题记压在海岸线上也读得清
  rules(g, u, { t0, x: X, gap: 58, n: cap.length, y: 120, h: 640 });
  vtext(g, u, { t0, cols: cap, x: X, y: 130, size: 38, gap: 58, rate: .07, fd: .8, font: F.song });
  if (year) vtext(g, u, { t0: t0 + .6, cols: [year], x: X - cap.length * 58, y: 136, size: 32, lead: 1.2, rate: .04, color: SEAL });
}
function makeMap(cfg = {}) {
  const view = cfg.view || [96, 16, 126.5, 42.5], [lo0, la0, lo1, la1] = view;
  const KX = cfg.kx || clamp(2900 / (lo1 - lo0), 40, 110), KY = KX * 1.155, MW = Math.round((lo1 - lo0) * KX), MH = Math.round((la1 - la0) * KY);
  const M = { cfg, view, KX, KY, MW, MH, legs: [], places: Object.assign({}, GAZ, cfg.places || {}), base: null, seals: {} };
  M.mp = (lon, lat) => [(lon - lo0) * KX, (la1 - lat) * KY];
  M.xy = p => { const ll = typeof p === 'string' ? M.places[p] : p; if (!ll) throw new Error('地图上没有这个地名，在 places 里补上经纬度：' + p); return M.mp(ll[0], ll[1]); };
  M.leg = (stops, cap, year) => { stops.forEach(s => M.xy(s.p)); PL = M.places; mp = M.mp; const L = makeLeg(stops); L.cap = cap || []; L.year = year || ''; M.legs.push(L); return L; };
  const main = new Set(cfg.main || []);
  // u：进场后的秒数；D：这段地图的时长
  M.draw = (g, u, D, opt = {}) => {
    if (!M.base) M.base = mapBase(M);
    const LEGS = M.legs, leg = opt.leg != null ? LEGS[opt.leg] : null, hist = opt.leg != null ? LEGS.slice(0, opt.leg) : [];
    const CX = opt.cx ?? 880, CY = opt.cy ?? 560, slip = cfg.tone === 'litho', caption = opt.caption || cfg.caption || mapCaption;
    let cx, cy, s;
    if (opt.intro) {
      const k = ss(1.2, D - 1.2, u), [mx, my] = M.xy(opt.intro);
      const s0 = 1920 / MW * .95, s1 = opt.zoom ?? 1.15; s = s0 * Math.pow(s1 / s0, k); cx = lerp(MW * .52, mx, k); cy = lerp(MH * .5, my, k);
    } else {
      const P = opt.all ? LEGS.flatMap(l => l.pts) : leg.pts;
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const [x, y] of P) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
      const fit = Math.min(1400 / Math.max(200, x1 - x0 + 260), 860 / Math.max(200, y1 - y0 + 240)), k = ss(0, D, u), dest = P[P.length - 1];
      s = clamp(fit, .3, 1.4) * lerp(.95, 1.04, k); cx = lerp((x0 + x1) / 2, dest[0], opt.all ? 0 : .17 * k); cy = lerp((y0 + y1) / 2, dest[1], opt.all ? 0 : .17 * k);
    }
    const ox = CX - cx * s, oy = CY - cy * s, T = ([x, y]) => [x * s + ox, y * s + oy];
    g.save(); g.setTransform(s, 0, 0, s, ox, oy); g.globalAlpha = opt.intro ? ss(0, 1.2, u) : 1; g.drawImage(M.base, 0, 0); g.restore();
    g.setTransform(1, 0, 0, 1, 0, 0);
    mapTitle(g, ss(.3, 1.3, u), opt.title ?? cfg.title);
    const visited = new Set(cfg.start ? [cfg.start] : []);
    for (const L of hist) { if (!opt.all) drawRoute(g, L, 1, T, 'ghost'); L.stops.forEach(st => { if (typeof st.p === 'string') visited.add(st.p); }); }
    if (!opt.all && !opt.intro) for (const nm of visited) { const [x, y] = T(M.xy(nm)); drawPlace(g, x, y, main.has(nm) ? nm : '', .75, false, false, slip); }
    if (opt.intro) {
      const [x, y] = T(M.xy(opt.intro)), a = ss(D - 2.4, D - 1.8, u);
      drawPlace(g, x, y, '', ss(.8, 1.6, u) * (1 - a), true);   // 一开始就有个红点，题记说的地方有着落
      drawPlace(g, x, y, opt.intro, a, true, false, slip);
      if (opt.traveler) opt.traveler(g, x - 4, y - 8, { face: 1, alpha: ss(D - 2.2, D - 1.4, u), mode: 'stand', t: u });
      caption(g, u, opt.cap || [], opt.year || '', 1.4, opt.capX); return;
    }
    if (opt.all) {
      const per = (D - (opt.tail ?? 3)) / LEGS.length;
      LEGS.forEach((L, i) => {
        const p = ss(.8 + i * per, .8 + (i + 1) * per, u);
        drawRoute(g, L, p, T, 'main');
        L.stops.forEach((st, j) => { if (typeof st.p === 'string' && p >= L.stopAt[j] - .001) { const [x, y] = T(M.xy(st.p)); drawPlace(g, x, y, main.has(st.p) ? st.p : '', 1, false, false, slip); } });
      });
      if (cfg.start) { const [x, y] = T(M.xy(cfg.start)); drawPlace(g, x, y, cfg.start, 1, false, false, slip); }
      caption(g, u, opt.cap || [], opt.year || '', .9, opt.capX); return;
    }
    const p = easeInOut(clamp((u - 1.0) / (D - 3.2)));
    const hp = drawRoute(g, leg, p, T, 'main');
    leg.stops.forEach((st, j) => { if (!st.lab || p < leg.stopAt[j]) return; const [x, y] = T(M.xy(st.p)); drawPlace(g, x, y, st.lab, ss(0, .12, p - leg.stopAt[j]), false, false, slip, st.side || 1); });
    const last = leg.stops[leg.stops.length - 1].p, [dx, dy] = T(M.xy(last)), arr = ss(D - 2.3, D - 1.8, u);
    if (typeof last === 'string') {
      drawPlace(g, dx, dy, last, arr, true, true, slip);
      if (opt.seal && [1, 2, 4].includes([...last].length)) { if (!M.seals[last]) M.seals[last] = makeSeal(last, 40, [...last].length === 2 ? 76 : 40, 300 + opt.leg, true); stamp(g, u, M.seals[last], dx - 34, dy - 30, D - 2.0, 1, .9); }
    }
    if (hp && p < 1.02) {
      const hx = hp.x * s + ox, hy = hp.y * s + oy, face = hp.dx > 0 ? -1 : 1, fa = ss(.9, 1.3, u) * (1 - ss(D - 1.9, D - 1.3, u));
      if (opt.traveler) opt.traveler(g, hx, hy, { face, alpha: fa, mode: hp.mode, t: u });
      else if (hp.mode === 'sea') drawBoat(g, hx, hy + 4, .42, u, false, fa, false);
      else { g.save(); g.translate(hx, hy); g.scale(face, 1); drawWalker(g, 0, 0, .9, u, fa); g.restore(); }
    }
    caption(g, u, opt.cap || leg.cap, opt.year ?? leg.year, .9, opt.capX);
  };
  return M;
}
