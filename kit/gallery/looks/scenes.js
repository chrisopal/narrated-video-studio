(() => {
// 样片：宣传片的五种样子。同一副骨架（痛点 2 小节、亮相 1、两个卖点各 2、证明 1、口号 2），五个虚构产品各配一种样子。
// brief.json 的 "look" 定出哪一种；gallery.json 里用同一份场景换 look、bpm、music 出五套样张。真片子只留自己那一套内容。
const { use, scenes, say, hero, feature, media, stat, end, note, hexA, sp } = PACK.promo;
const LOOK = window.LOOK_ || 'bold', L = use(LOOK), B = n => beatT(n), U = Math.min(W, H) / 1080;
const line = (x, y, w, h, col, r = 8) => { g.fillStyle = col; rr(x, y, w, h, r); g.fill(); };
// 画框里的内容：都是示意的简笔，p 是这一屏的配色
const D = {
  table(merge) { return (x, y, w, h, u) => { const p = PACK.promo.p, rows = 6, rh = h / (rows + 1.2), k = eo(seg(u, .6, 1.4)); for (let i = 0; i < rows; i++) { const off = (1 - k) * [40, -30, 70, 10, -50, 25][i] * U, dup = merge && (i === 2 || i === 4), a = dup ? 1 - eo(seg(u, 1.4, 2)) : 1, yy = y + rh * (.7 + i - (merge && i > 2 ? eo(seg(u, 1.6, 2.2)) * (i > 4 ? 2 : 1) : 0)); g.globalAlpha = a; line(x + w * .06 + off, yy, w * .2, rh * .5, dup ? p.acc : '#1d1d1d'); line(x + w * .3 + off * .6, yy, w * .34, rh * .5, '#c9c4b8'); line(x + w * .68 + off * .3, yy, w * .24, rh * .5, '#c9c4b8'); g.globalAlpha = 1; } }; },
  chat(x, y, w, h, u) { const p = PACK.promo.p, b = (i, me, t0, s) => { const k = sp(seg(u, t0, t0 + .5)); if (u < t0) return; const bw = w * .56, bh = h * .2, bx = me ? x + w - bw - w * .05 : x + w * .05, by = y + h * (.08 + i * .29); g.save(); g.globalAlpha = cl(seg(u, t0, t0 + .15)); g.translate(0, (1 - k) * 30); g.fillStyle = me ? hexA('#ffffff', .12) : hexA(p.acc, .2); rr(bx, by, bw, bh, 22 * U); g.fill(); txt(s, bx + 28 * U, by + bh * .62, 40 * U, '#eef3ff', 'H7'); g.restore(); }; b(0, 1, .4, '怎么改收货地址？'); if (u > 1 && u < 1.7) { [0, 1, 2].forEach(i => { g.fillStyle = hexA(p.acc, .4 + .6 * Math.abs(Math.sin(u * 9 + i))); g.beginPath(); g.arc(x + w * .1 + i * 26 * U, y + h * .46, 8 * U, 0, 7); g.fill(); }); } b(1, 0, 1.7, '订单页点“修改地址”'); b(2, 0, 2.4, '发货前都能改'); },
  curve(x, y, w, h, u) { const p = PACK.promo.p, k = eo(seg(u, .5, 2.4)); g.strokeStyle = hexA('#ffffff', .14); g.lineWidth = 2; for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(x + w * .08, y + h * i / 4); g.lineTo(x + w * .92, y + h * i / 4); g.stroke(); } g.strokeStyle = p.acc; g.lineWidth = 7 * U; g.lineCap = 'round'; g.shadowColor = p.acc; g.shadowBlur = 24; g.beginPath(); for (let i = 0; i <= 40 * k; i++) { const q = i / 40, px = x + w * (.08 + .84 * q), py = y + h * (.82 - .6 * (1 - Math.exp(-q * 3.2))); i ? g.lineTo(px, py) : g.moveTo(px, py); } g.stroke(); g.shadowBlur = 0; },
  bottle(open) { return (x, y, w, h, u) => { const cx = x + w / 2, bw = w * .34, top = y + h * .16, bot = y + h * .9, gr = g.createLinearGradient(cx - bw / 2, 0, cx + bw / 2, 0); gr.addColorStop(0, '#3d4a4f'); gr.addColorStop(.35, '#7d8f93'); gr.addColorStop(.6, '#56666b'); gr.addColorStop(1, '#2b3539'); g.fillStyle = gr; rr(cx - bw / 2, top + h * .1, bw, bot - top - h * .1, bw * .16); g.fill();
      const lift = open ? eo(seg(u, .8, 1.6)) * h * .12 : 0; g.fillStyle = '#a8793a'; rr(cx - bw * .46, top - lift, bw * .92, h * .1, bw * .12); g.fill(); g.fillStyle = 'rgba(255,255,255,.22)'; rr(cx - bw * .36, top + h * .16, bw * .1, (bot - top) * .6, 6); g.fill();
      if (!open) { const k = eo(seg(u, .8, 1.5)); g.strokeStyle = '#1b1a18'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(cx + bw * .5, y + h * .5); g.lineTo(cx + bw * .5 + w * .2 * k, y + h * .5); g.stroke(); g.beginPath(); g.arc(cx + bw * .5, y + h * .5, 6, 0, 7); g.fillStyle = '#1b1a18'; g.fill(); txt('内外两层', cx + bw * .5 + w * .2 + 14, y + h * .5 + 14, 40 * U, '#1b1a18', 'Song', 'left', k); } }; },
  term(lines) { return (x, y, w, h, u) => { const p = PACK.promo.p, sz = 36 * U, lh = sz * 1.7; lines.forEach(([t0, s, c], i) => { if (u < t0) return; const n = Math.floor((u - t0) / .03), str = c === 'cmd' ? s.slice(0, n) : s; g.font = `${sz}px 'DejaVu Sans Mono', monospace`; g.fillStyle = c === 'err' ? '#ff6b6b' : c === 'ok' ? p.acc : c === 'cmd' ? '#ffffff' : p.dim; g.textBaseline = 'alphabetic'; g.fillText((c === 'cmd' ? '$ ' : '  ') + str, x + 40 * U, y + lh * (i + 1.2)); }); }; },
  days(x, y, w, h, u) { const p = PACK.promo.p, n = 21, cols = 7, s = w * .1, gx = (w - cols * s * 1.25) / 2; txt('第 21 天', x + w / 2, y + h * .14, 44 * U, '#1d1d2c', 'H9', 'center'); for (let i = 0; i < n; i++) { const k = sp(seg(u, .4 + i * .07, .8 + i * .07)), cx = x + gx + (i % cols + .5) * s * 1.25, cy = y + h * .28 + Math.floor(i / cols) * s * 1.3; g.fillStyle = '#ece8df'; g.beginPath(); g.arc(cx, cy, s * .46, 0, 7); g.fill(); g.fillStyle = p.acc; g.beginPath(); g.arc(cx, cy, s * .46 * k, 0, 7); g.fill(); } line(x + w * .12, y + h * .7, w * .76, h * .05, '#ece8df'); line(x + w * .12, y + h * .7, w * .76 * eo(seg(u, .4, 2)), h * .05, '#1d1d2c'); },
  notes(x, y, w, h, u) { const p = PACK.promo.p; line(x + w * .1, y + h * .1, w * .8, h * .03, '#d9d4c8'); line(x + w * .1, y + h * .17, w * .62, h * .03, '#d9d4c8'); [[.4, .28, '这句我划了三遍'], [1.0, .48, '原来不止我卡在这'], [1.6, .68, '明天继续']].forEach(([t0, fy, s], i) => { if (u < t0) return; const k = sp(seg(u, t0, t0 + .5)), bw = w * .8, bh = h * .14; g.save(); g.translate(x + w * .1 + bw / 2, y + h * fy + bh / 2); g.scale(k, k); g.fillStyle = i % 2 ? '#ffd84d' : p.acc; rr(-bw / 2, -bh / 2, bw, bh, 20 * U); g.fill(); g.restore(); txt(s, x + w * .16, y + h * fy + bh * .64, 40 * U, i % 2 ? '#1d1d2c' : '#fff', 'H7', 'left', cl(seg(u, t0 + .1, t0 + .3))); }); },
};
const C = {
  bold:   { hook: ['表格', '又乱了'], name: '快格', pos: '一键理顺你的表', f1: ['自动对齐', '错位的行列，各回各位', 'window', D.table(false), '表格清理'], f2: ['查重合并', '重复的行，合成一行', 'window', D.table(true), '表格清理'], st: [3, '秒', '理顺一张表'], slogan: '乱表，三秒理顺' },
  glass:  { hook: ['同一个问题', '答了一百遍'], name: '知微', pos: '把重复的回答交给它', f1: ['自动应答', '常见问题，马上回', 'window', D.chat, '在线客服'], f2: ['越用越准', '答不上的转人工，下次就会', 'window', D.curve, '自动解决的比例'], st: [73, '%', '的咨询不用人回'], slogan: '你只答新问题' },
  studio: { hook: ['早上灌的热水', '下午还烫吗'], name: '山岚', pos: '一只保温杯', f1: ['双层真空', '内外两层不锈钢', 'plinth', D.bottle(false)], f2: ['一手开合', '单手按开，拧紧不漏', 'plinth', D.bottle(true)], st: [12, '小时', '还是热的'], slogan: '热的，一直热着' },
  grid:   { hook: ['上线前', '又要手敲二十条命令'], name: '榫卯', pos: '一条命令上线', f1: ['一条命令', '构建、检查、发布，连着跑', 'window', D.term([[.4, 'sunmao deploy', 'cmd'], [1.1, '构建 …… 完成', 'dim'], [1.5, '检查 …… 完成', 'dim'], [1.9, '发布 …… 完成', 'ok']]), 'terminal'], f2: ['出错就回滚', '自动回到上一个能用的版本', 'window', D.term([[.4, 'sunmao deploy', 'cmd'], [1.1, '检查 …… 失败', 'err'], [1.6, '回滚到 v41 …… 完成', 'ok']]), 'terminal'], st: [1, '条', '命令，原来要二十条'], slogan: '敲一次，就上线' },
  pop:    { hook: ['书买了', '一直没读完？'], name: '小满读书会', pos: '每天十分钟，读完一本', f1: ['每天十分钟', '一本书拆成二十一天', 'phone', D.days], f2: ['有人一起读', '同一页，大家的批注', 'phone', D.notes], st: [21, '天', '读完一本'], slogan: '这次，读完它' },
}[LOOK];
window.FILM = { theme: 'promo', chrome: 'none', chapters: ['痛点', '亮相', '卖点一', '卖点二', '证明', '口号'],
  cover: { pill: '样片 · ' + L.name, title: C.name, line1: C.pos, line2: '', tagline: '虚构产品 · 宣传片的五种样子',
    art(c, cx, cy, R) { const p = L.pals[L.pals.length > 2 ? 2 : 0]; c.fillStyle = p.bg; c.fillRect(cx - R * .84, cy - R * .84, R * 1.68, R * 1.68); c.fillStyle = p.acc; c.beginPath(); c.arc(cx, cy, R * .34, 0, 7); c.fill(); } },
  scenes(t) {
    const N = '虚构产品 · 演示画面', pre = L.pre, hold = (t0) => t0 - pre;   // 字提前 pre 秒起动，正好落在拍点上；角标全片同一句
    const f = (i, F) => [
      { at: B(12 + i * 8), fn: () => { feature(t, hold(B(12 + i * 8)) + pre, i + 1, F[0]); note(N); } },                                          // 题卡：两拍
      { at: B(14 + i * 8), fn: () => { media(t, B(14 + i * 8), F[2], F[3], { cap: [F[0], F[1]], title: F[4] }); note(N); } }];                    // 画框：六拍
    scenes(t, [
      { at: 0, fn: () => hero(t, hold(B(0)), C.hook[0], { y: H * .56 }) },                                         // 痛点：前半句两拍，后半句六拍
      { at: B(2), fn: () => hero(t, B(2), C.hook[1], { y: H * .56, mark: B(5) }) },
      { at: B(8), fn: () => { hero(t, B(8), C.name, { sub: C.pos, subAt: B(9) }); note(N); } },                    // 亮相：一小节
      ...f(0, C.f1), ...f(1, C.f2),
      { at: B(28), fn: () => { stat(t, B(28), C.st[0], C.st[1], C.st[2], { note: '示意数据 · 产品为虚构' }); note(N); } },   // 证明：一小节
      { at: B(32), fn: () => { end(t, B(32), { name: C.name, slogan: C.slogan, note: '虚构产品 · 仅作样片' }); note(N); } }, // 口号：两小节
    ]);
  } };
})();
