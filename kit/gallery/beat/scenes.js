(() => {
// 样片《四时》：无旁白，90 拍/分，四个季节各两小节，末尾一小节。演示节拍网格的三种用法：
//   ① 换季卡在小节线上（硬切）；② 每个季节的第二小节切到近景（beatN 在拍点上换机位）；③ 太阳、落下来的东西跟着拍子跳（pulse）。
// 坐标都按画幅算，横竖版共用。
const TAU = Math.PI * 2, V = H > W;
const SEASON = [
  { sky: ['#bfe3f2', '#f6e9d8'], hill: '#8cc084', far: '#b9dcae', leaf: '#f4a7c0', trunk: '#6b4a35', sun: '#ffd27a', fall: '#f7b6cf', line: '风一来，枝头就亮了' },
  { sky: ['#2f7fd0', '#a8dcf5'], hill: '#2f8f5b', far: '#58b07a', leaf: '#1f7a4d', trunk: '#5b3a22', sun: '#fff1a8', fall: '#e9ff9a', line: '蝉声把午后拉得很长' },
  { sky: ['#e58a4a', '#f7d9a4'], hill: '#b9853f', far: '#d2a65a', leaf: '#d9572b', trunk: '#5b3a22', sun: '#fbe3b0', fall: '#e0762f', line: '叶子一片一片地认路' },
  { sky: ['#52607a', '#c9d3e0'], hill: '#e9eef3', far: '#cfd8e2', leaf: '#f4f7fa', trunk: '#3d3632', sun: '#f2f4f8', fall: '#ffffff', line: '雪落下来，什么都慢了' },
];
function scene(t, k, zoom, t0, bare) {
  const s = SEASON[k], gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, s.sky[0]); gr.addColorStop(1, s.sky[1]); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  const base = H * (V ? .72 : .76), tx = W * (V ? .5 : .56), p1 = pulse(t), p4 = pulse(t, { every: 4, decay: .5 });
  g.save(); if (zoom) { g.translate(tx, base - 200); g.scale(1.7, 1.7); g.translate(-tx, -(base - 200)); }   // 近景：对着树推近
  const sx = W * (V ? .72 : .78), sy = H * (V ? .26 : .24); g.fillStyle = s.sun; g.globalAlpha = .28 + .3 * p4; g.beginPath(); g.arc(sx, sy, 150 + 60 * p4, 0, TAU); g.fill(); g.globalAlpha = 1; g.beginPath(); g.arc(sx, sy, 84 + 10 * p1, 0, TAU); g.fill();   // 太阳：每拍胀一下，每小节亮一圈
  g.fillStyle = s.far; g.beginPath(); g.moveTo(0, H); g.lineTo(0, base - 70); g.quadraticCurveTo(W * .3, base - 230, W * .62, base - 60); g.quadraticCurveTo(W * .82, base - 190, W, base - 100); g.lineTo(W, H); g.fill();
  g.fillStyle = s.hill; g.beginPath(); g.moveTo(0, H); g.lineTo(0, base + 30); g.quadraticCurveTo(W * .4, base - 90, W, base + 40); g.lineTo(W, H); g.fill();
  const sw = Math.sin(t * 1.3) * .04 + .03 * p1;   // 树：一直轻轻摆，拍点上多晃一下
  g.save(); g.translate(tx, base - 20); g.fillStyle = s.trunk; g.beginPath(); g.moveTo(-16, 0); g.lineTo(-9, -230); g.lineTo(9, -230); g.lineTo(16, 0); g.fill(); g.rotate(sw);
  g.strokeStyle = s.trunk; g.lineWidth = 9; g.lineCap = 'round'; for (const [x, y] of [[-110, -330], [100, -350], [-40, -400], [50, -300]]) { g.beginPath(); g.moveTo(0, -220); g.quadraticCurveTo(x * .4, -260, x, y); g.stroke(); }
  g.fillStyle = s.leaf; const full = k === 3 ? .55 : 1; for (const [x, y, r] of [[0, -360, 120], [-105, -310, 86], [105, -320, 90], [-40, -430, 78], [56, -428, 74]]) { g.globalAlpha = k === 2 ? .9 : 1; g.beginPath(); g.arc(x, y, r * full * (1 + .04 * p1), 0, TAU); g.fill(); } g.globalAlpha = 1;
  g.restore();
  // 落下来的东西：每一拍放出一小簇（花瓣、萤光、叶子、雪），各自往下飘。第几拍、第几个都是定数，同一时刻画两遍一样
  const b = beatAt(t); g.fillStyle = s.fall;
  for (let n = Math.max(0, Math.floor(b) - 7); n <= Math.floor(b); n++) for (let j = 0; j < 7; j++) {
    const age = (b - n) * 60 / 90, r1 = rnd(n * 13 + j * 7 + k), r2 = rnd(n * 5 + j * 11 + 3), x = tx + (r1 - .5) * 620 + Math.sin(age * 2 + j) * 30 + age * (k === 2 ? 60 : 12), y = base - 470 + r2 * 160 + age * (k === 1 ? -26 : k === 3 ? 70 : 105);
    g.globalAlpha = cl(age * 6) * cl(1 - age / 4.6) * (k === 1 ? .6 + .4 * Math.sin(age * 9 + j) : 1); g.beginPath(); k === 2 ? g.ellipse(x, y, 13, 7, age * 2 + j, 0, TAU) : g.arc(x, y, k === 1 ? 6 : k === 3 ? 7 : 9, 0, TAU); g.fill();
  }
  g.globalAlpha = 1; g.restore();
  // 一句话：写在画上，换季后第一拍出，跟到下一次换季
  if (bare) return;
  const sb = safeBox(V ? 40 : 70), a = eo(seg(t, t0 + .1, t0 + .7)), dark = k === 3 || k === 0 ? '#2a3140' : '#fff';
  txt(s.line, V ? W / 2 : sb.x, V ? sb.y + 120 : sb.y + 96, V ? 60 : 56, dark, 'KT', V ? 'center' : 'left', a);
  txt('春夏秋冬'[k], V ? W / 2 : sb.x, V ? sb.y + 220 : sb.y + 190, 44, k === 2 ? '#7a2c12' : k === 1 ? '#e9ff9a' : k === 3 ? '#2a3140' : '#a83a66', 'H9', V ? 'center' : 'left', a);
}
window.FILM = { theme: 'sky', chrome: 'none', chapters: ['春', '夏', '秋', '冬', '尾'],
  cover: { pill: '样片', title: '四时', line1: '一棵树', line2: '过完一年', tagline: '无旁白 · 卡点', name: '示意', credit: '',
    art(c, cx, cy, R) { c.fillStyle = '#ffd27a'; c.beginPath(); c.arc(cx + R * .4, cy - R * .4, R * .26, 0, TAU); c.fill(); c.fillStyle = '#6b4a35'; c.fillRect(cx - R * .05, cy, R * .1, R * .7); c.fillStyle = '#f4a7c0'; c.beginPath(); c.arc(cx, cy - R * .1, R * .42, 0, TAU); c.fill(); } },
  scenes(t) {
    if (t < barT(8)) { const k = cl(Math.floor(beatAt(t) / 8), 0, 3) | 0, bar = beatN(t, 4);   // 每两小节一个季节：硬切，正卡在小节线上
      scene(t, Math.max(0, k), bar % 2 === 1, barT(k * 2)); return; }                          // 每个季节的第二小节切近景
    // 尾：回到春天的远景，慢慢暗下去
    scene(t, 0, false, barT(8), true); g.fillStyle = `rgba(10,14,24,${(.85 * eio(seg(t, barT(8) + .4, barT(9)))).toFixed(3)})`; g.fillRect(0, 0, W, H);
  } };
})();
