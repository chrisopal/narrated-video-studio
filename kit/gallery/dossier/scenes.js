(() => {
const { folder, card, verdict, halftone, tally, sheet, on } = PACK.dossier;
// 网点证物的灰度简图（自己画的示意，不是照片）：雨里的小镇钟楼
function clockArt(c, w, h) {
  const sky = c.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#a8a8a8'); sky.addColorStop(1, '#f2f2f2'); c.fillStyle = sky; c.fillRect(0, 0, w, h);
  c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = Math.max(2, w / 300); c.beginPath();
  for (let i = 0; i < 46; i++) { const x = rnd(i + 3) * w * 1.1, y = rnd(i + 70) * h * .8; c.moveTo(x, y); c.lineTo(x - w * .015, y + h * .1); } c.stroke();
  const tx = w * .64, bw = w * .17, top = h * .3;
  c.fillStyle = '#8c8c8c'; [[.05, .72, .2, .3], [.24, .66, .16, .36], [.84, .7, .2, .32]].forEach(([x, y, ww, hh]) => { c.fillRect(w * x, h * y, w * ww, h * hh); c.beginPath(); c.moveTo(w * x - 8, h * y); c.lineTo(w * (x + ww / 2), h * (y - .1)); c.lineTo(w * (x + ww) + 8, h * y); c.fill(); });
  c.fillStyle = '#454545'; c.fillRect(tx - bw / 2, top, bw, h - top);
  c.fillStyle = '#1c1c1c'; c.beginPath(); c.moveTo(tx - bw / 2 - w * .025, top); c.lineTo(tx, h * .04); c.lineTo(tx + bw / 2 + w * .025, top); c.fill();
  const cr = bw * .36, cy = top + h * .17; c.fillStyle = '#f2f2f2'; c.beginPath(); c.arc(tx, cy, cr, 0, 7); c.fill();
  c.strokeStyle = '#111'; c.lineWidth = cr * .14; c.lineCap = 'round'; c.beginPath(); c.moveTo(tx, cy); c.lineTo(tx, cy - cr * .75); c.moveTo(tx, cy); c.lineTo(tx + cr * .55, cy + cr * .3); c.stroke();
  c.fillStyle = '#6a6a6a'; c.fillRect(0, h * .93, w, h * .07);
}
const TABS = ['老钟', '面包店', '桥头猫', '清单'];
window.FILM = { theme: 'dossier', chrome: 'none', chapters: ['开卷', '老钟', '面包店', '桥头猫', '清单'],
  cover: { pill: '虚构示例', title: '三条小镇传言', line1: '哪一条属实？', line2: '一条一条核', tagline: '风格包样片 · 案卷',
    art(c, cx, cy, R) {
      on(c, () => {
        c.save(); c.translate(cx, cy); c.rotate(-.05);
        sheet(-R * 1.15, -R * .8, R * 2.3, R * 1.6, { rules: { from: R * .45, step: R * .16 } });
        halftone(99, 0, { x: -R * 1.02, y: -R * .62, w: R * 1.3, h: R * 1.1 }, { art: clockArt, id: 'clock', cell: 9, label: '' });
        verdict(99, 0, '存疑', { x: R * .68, y: R * .05, sz: R * .34, rot: -.16 });
        c.restore();
      });
    } },
  scenes(t) {
    const A = T('a1'), B = T('a2'), C = T('a3'), D = T('a4'), E = N('a4') - 3, FL = .32;
    const tabs = TABS.map((label, i) => ({ label, at: [A, B, C, D][i] }));
    // 后出的卡先画：翻走上一张时，下一张已经垫在底下
    tally(t, D, [
      { label: '老钟一下雨就走慢', verdict: '存疑' },
      { label: '面包店用的是井水', verdict: '不实' },
      { label: '桥头的猫傍晚准到', verdict: '属实' },
    ], { title: '核查清单', tag: '虚构示例', pre: FL + .04, out: E - 1.5 + .56 });
    card(t, C, { no: 3, total: 3, tag: '虚构示例', title: '桥头的猫傍晚准到', pre: FL + .04, out: D - FL, stack: 0,
      evidence: { kind: 'text', head: '观察记录（虚构）', lines: ['周一　傍晚　来了', '周二　傍晚　来了', '周三　傍晚　来了', '周四　傍晚　来了'], ticks: true, sign: '记录人：', cap: '证物：邻居记的观察单' },
      at: { ev: .55, line: 1.6, cap: 1.35 }, line: '记录天天对得上', verdict: { text: '属实', at: C + 2.3, rot: -.1 } });
    card(t, B, { no: 2, total: 3, tag: '虚构示例', title: '面包店用的是井水', pre: FL + .04, out: C - FL, stack: 1,
      evidence: { kind: 'quote', lines: ['本店和面用水', '一律是自来水'], src: '店门口告示（虚构）', redact: { line: 1, a: 3, b: 6, at: B + 1.5 }, cap: '证物：店门口贴的告示' },
      at: { ev: .45, line: 1.9, cap: 1.15 }, line: '告示写明用自来水', verdict: { text: '不实', at: B + 2.5, rot: -.14 } });
    card(t, A, { no: 1, total: 3, tag: '虚构示例', title: '老钟一下雨就走慢', pre: .8, out: B - FL, stack: 2,
      evidence: { kind: 'image', art: clockArt, id: 'clock', cap: '证物：镇口老钟（示意图）' },
      at: { ev: .55, line: 1.15 }, line: '记录太少，还说不准', verdict: { text: '存疑', at: A + 1.85, rot: -.12 } });
    folder(t, 0, { label: '小镇传言核查', sub: '虚构示例 · 共 3 条', tabs, openAt: A - .62, closeAt: E - 1.5,
      seal: { text: '归档', at: E - .85 } });
  } };
})();
