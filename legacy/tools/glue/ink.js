// 字体：毛笔体和草书只带了旧片用过的字（COVER），缺的字会回落成楷体，检查时会报出来
const COVER = __COVER__;
const _vtext = vtext;
vtext = function (G, t, o) {
  _vtext(G, t, o);
  if (typeof REC === 'undefined' || !REC || !REC.tx) return;
  const size = o.size, lead = size * (o.lead ?? 1.12), gap = o.gap ?? size * 1.5, rate = o.rate ?? .09, fd = o.fd ?? .9;
  const out = o.t1 != null ? 1 - ss(o.t1 - (o.fo ?? 1.2), o.t1, t) : 1; if (t < o.t0 || out <= 0) return;
  const fam = /Cao/.test(o.font || '') ? 'Cao' : /Brush/.test(o.font || '') ? 'Brush' : null;
  let k = 0;
  o.cols.forEach((c, ci) => {
    const chars = [...c], tc = o.t0 + k * rate, a = ss(tc, tc + fd, t) * out * (o.alpha ?? 1); k += chars.length + (o.colPause ?? 3);
    let len = 0; for (const ch of chars) len += ch === ' ' ? .45 : ch === '·' ? .6 : 1;
    if (a > .02 && c.trim()) REC.tx.push([c, Math.round(o.x - ci * gap - size / 2), Math.round(o.y), Math.round(o.x - ci * gap + size / 2), Math.round(o.y + len * lead), +a.toFixed(2)]);
    if (fam && REC.miss) for (const ch of chars) if (ch.charCodeAt(0) > 0x2e7f && !COVER[fam].includes(ch)) REC.miss[fam + '|' + ch] = 1;
  });
};
// 分场：先画在一张透明的"绢"上，再整张淡入淡出叠到纸上（旧片的合成办法）。draw(G, u, t)：G 是这张绢的画笔，u 是进场后的秒数
let BUFG = null;
function boot() { if (PAPER) return; PAPER = makePaper(); VIGN = makeVignette(); MASK = mk(W, H); BUF = [mk(W, H)]; BUFG = BUF[0].getContext('2d'); }
function layer(t, a, b, draw, o = {}) {
  const al = o.alpha ?? (o.hard ? (t >= a && t < b ? 1 : 0) : env(t, a, b, o.fi ?? 1.6, o.fo ?? 1.6)); if (al <= .001) return;
  boot(); const G = BUFG;
  G.setTransform(1, 0, 0, 1, 0, 0); G.globalAlpha = 1; G.globalCompositeOperation = 'source-over'; G.filter = 'none'; G.clearRect(0, 0, W, H);
  G.save(); draw(G, t - a, t); G.restore();
  if (o.fx) o.fx(BUF[0]);
  if (o.text) { G.save(); G.setTransform(1, 0, 0, 1, 0, 0); G.globalAlpha = 1; o.text(G, t - a, t); G.restore(); }
  if (o.out) { o.out(BUF[0], al); return; }
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha *= al; g.drawImage(BUF[0], 0, 0); g.restore();
}
// 费时的东西（山、印、树）只做一次：once('远山', () => mountain({...}))
const CACHE = new Map();
function once(key, make) { if (!CACHE.has(key)) { boot(); CACHE.set(key, make()); } return CACHE.get(key); }
const paper = () => { boot(); return PAPER; }, vignette = () => { boot(); return VIGN; };
// 主题：宣绢底 + 四角压暗
addTheme('songink', { light: true, ink: INKS, dim: 'rgba(29,27,24,.62)', note: 'rgba(29,27,24,.8)', a1: SEAL, a2: INKS, a3: 'rgb(78,108,104)', chip: 'rgba(29,27,24,.06)',
  sub: 'rgba(236,228,210,.88)', subInk: INKS, top: '#eee5d1', bot: '#e4d8bd', card: 'rgba(240,232,214,.95)', cardInk: INKS, pillInk: '#f3ead6', hl: 'rgba(168,50,43,.25)',
  f: { t: 'SongB', b: 'SongB', s: 'Song', h: 'Brush', n: 'RC' },
  bg(t) { g.drawImage(paper(), 0, 0); }, post(t) { g.drawImage(vignette(), 0, 0); } });
// 毛笔体和草书是按字分成很多小文件的：必须在开画之前全部装好。不然某个字第一次出现的那一帧会先用楷体画，而且会被字形缓存一直留着（经验库 L-015）
PACK_INIT.push(async () => {
  await Promise.all([...document.fonts].filter(f => /Brush|Cao/.test(f.family)).map(f => f.load().catch(() => 0)));
  await Promise.all([['Song', '宋'], ['SongB', '宋']].map(([f, s]) => document.fonts.load(`40px ${f}`, s).catch(() => 0))); GLYPH.clear();
});
// 舟上的人物由人物包来画（没装人物包就只画舟）；印章盖印另起一个名字，免得和通用组件的 stamp 撞名
var suDraw = (...a) => PACK.figures && PACK.figures.suDraw(...a);
const sealStamp = stamp;
// 章题：旧片里年号只有 21 像素，手机上读不清，这里加大（经验库 L-014）
chapter = function (g, t, t0, num, place, year, dark = false) {
  const col = dark ? PAPERS : INKS;
  if (num) vtext(g, t, { t0, cols: [num], x: 1800, y: 96, size: 104, font: F.brush, color: col, fd: 1.3, wet: !dark });
  vtext(g, t, { t0: t0 + .5, cols: [place], x: 1800, y: num ? 238 : 110, size: 46, lead: 1.3, font: F.songb, color: col, rate: .16, fd: 1 });
  vtext(g, t, { t0: t0 + 1.1, cols: [year], x: 1736, y: num ? 244 : 116, size: 32, lead: 1.16, font: F.song, color: dark ? '#d4796b' : SEAL, rate: .05, fd: .7 });
};
