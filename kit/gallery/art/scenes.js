(() => {
const { look, post, seq, MO, TY } = PACK.art;
const TAU = Math.PI * 2, V = H > W;
// 一幅小画：天、太阳、云、两道山、一间屋、炊烟、树、几只鸟。全用通用画笔画——后面换的只是“画法”，这幅画本身一笔没改。
// 坐标都按画幅算，横版竖版共用（竖版样张 art_vertical 用的就是这一份）。
function scene(t, o = {}) {
  const sky = o.sky || ['#1f5fb0', '#8ec5f2'], gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, sky[0]); gr.addColorStop(1, sky[1]); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  const sx = W * (V ? .7 : .76) + Math.sin(t * .4) * 24, sy = H * (V ? .3 : .24) + Math.cos(t * .3) * 10 + (o.sunDrop || 0), sr = V ? 130 : 120;
  g.fillStyle = o.sun || '#f6c945'; g.beginPath(); g.arc(sx, sy, sr, 0, TAU); g.fill();
  for (let i = 0; i < 3; i++) {                           // 云：一直往右飘
    const x = ((i * 700 + t * 40 * (1 + i * .3)) % (W + 500)) - 250, y = H * (V ? .36 : .16) + i * 90; g.fillStyle = o.cloud || 'rgba(255,255,255,.88)';
    for (const [dx, dy, r] of [[0, 0, 46], [50, -18, 58], [110, 0, 48], [58, 14, 52]]) { g.beginPath(); g.arc(x + dx, y + dy, r, 0, TAU); g.fill(); }
  }
  const base = H * (V ? .74 : .78);
  g.fillStyle = o.far || '#3f8f6a'; g.beginPath(); g.moveTo(0, H); g.lineTo(0, base - 90); g.quadraticCurveTo(W * .3, base - 300, W * .58, base - 80); g.quadraticCurveTo(W * .8, base - 250, W, base - 130); g.lineTo(W, H); g.fill();
  g.fillStyle = o.near || '#2d6a4f'; g.beginPath(); g.moveTo(0, H); g.lineTo(0, base + 20); g.quadraticCurveTo(W * .25, base - 120, W * .5, base + 10); g.quadraticCurveTo(W * .78, base + 110, W, base - 10); g.lineTo(W, H); g.fill();
  const hx = W * (V ? .3 : .27), hy = base - 44, hs = V ? 1.15 : 1;   // 屋
  g.save(); g.translate(hx, hy); g.scale(hs, hs);
  for (let k = 0; k < 6; k++) { const p = (t * .3 + k / 6) % 1; g.fillStyle = `rgba(245,245,245,${(.75 * (1 - p)).toFixed(3)})`; g.beginPath(); g.arc(78 + Math.sin(p * 5 + k) * 26 * p, -250 - p * 230, 14 + p * 34, 0, TAU); g.fill(); }   // 炊烟
  g.fillStyle = '#7a4a2b'; g.fillRect(62, -250, 32, 70);
  g.fillStyle = o.wall || '#c1121f'; g.fillRect(-110, -170, 220, 170);
  g.fillStyle = o.roof || '#1d3557'; g.beginPath(); g.moveTo(-140, -170); g.lineTo(0, -280); g.lineTo(140, -170); g.fill();
  g.fillStyle = o.win || '#ffe9a8'; g.fillRect(-70, -120, 56, 62); g.fillStyle = '#5b3a22'; g.fillRect(24, -100, 50, 100);
  g.restore();
  const tx = W * (V ? .78 : .56), ty = base + 6, sw = Math.sin(t * 1.1) * .05;   // 树：一直轻轻摆
  g.save(); g.translate(tx, ty); g.fillStyle = '#5b3a22'; g.fillRect(-12, -150, 24, 150); g.rotate(sw); g.fillStyle = o.tree || '#1f7a4d';
  for (const [dx, dy, r] of [[0, -210, 86], [-60, -160, 62], [62, -165, 64]]) { g.beginPath(); g.arc(dx, dy, r, 0, TAU); g.fill(); }
  g.restore();
  g.strokeStyle = o.bird || '#17263d'; g.lineWidth = 7; g.lineCap = 'round';   // 鸟：扇翅膀，飞过去
  for (let i = 0; i < 4; i++) { const x = ((t * 90 + i * 330) % (W + 300)) - 150, y = H * (V ? .43 : .34) + Math.sin(t * .8 + i * 2) * 26 + i * 22, f = 16 + Math.sin(t * 9 + i) * 12; g.beginPath(); g.moveTo(x - 26, y - f); g.lineTo(x, y); g.lineTo(x + 26, y - f); g.stroke(); }
}
const NIGHT = { sky: ['#0e1a3a', '#34406b'], sun: '#e9e4c9', cloud: 'rgba(160,170,200,.5)', far: '#274a47', near: '#1b3a33', wall: '#8f2a2a', roof: '#101c33', win: '#ffd76a', tree: '#17513a', bird: '#0a1224' };
// 一块说明牌：大字是这种画法的名字，小字是一句怎么认它。画在重绘之后，所以字是清楚的
function cap(t, t0, t1, big, small) {
  const sb = safeBox(V ? 30 : 56), k = eo(seg(t, t0, t0 + .5)) * (1 - seg(t, t1 - .4, t1)); if (k <= 0) return;
  const w = Math.max(tw(big, 64, 'H9'), tw(small, 40, 'H7')) + 80, x = sb.x, y = sb.y + (V ? 0 : 60);
  g.save(); g.globalAlpha *= k; g.fillStyle = 'rgba(12,18,34,.78)'; rr(x, y + (1 - k) * 20, w, 178, 26); g.fill(); g.restore();
  txt(big, x + 40, y + 82 + (1 - k) * 20, 64, '#fff', 'H9', 'left', k); txt(small, x + 40, y + 142 + (1 - k) * 20, 40, '#ffd76a', 'H7', 'left', k);
}
window.FILM = { theme: 'sky', chrome: 'none', chapters: ['原画', '点彩', '马赛克', '老胶片', '明暗'],
  cover: { pill: '风格包样片', title: '艺术引擎', line1: '同一幅小画', line2: '换几种画法', tagline: '重绘 · 后期 · 转场', name: '示意', credit: '',
    art(c, cx, cy, R) { c.fillStyle = '#f6c945'; c.beginPath(); c.arc(cx + R * .3, cy - R * .3, R * .34, 0, TAU); c.fill(); c.fillStyle = '#2d6a4f'; c.beginPath(); c.moveTo(cx - R, cy + R * .7); c.quadraticCurveTo(cx - R * .3, cy - R * .1, cx + R * .2, cy + R * .5); c.quadraticCurveTo(cx + R * .7, cy + R * .2, cx + R, cy + R * .6); c.lineTo(cx + R, cy + R); c.lineTo(cx - R, cy + R); c.fill();
      c.fillStyle = '#c1121f'; c.fillRect(cx - R * .5, cy + R * .1, R * .4, R * .32); c.fillStyle = '#1d3557'; c.beginPath(); c.moveTo(cx - R * .58, cy + R * .1); c.lineTo(cx - R * .3, cy - R * .12); c.lineTo(cx - R * .02, cy + R * .1); c.fill(); } },
  scenes(t) {
    const A = ['a0', 'a1', 'a2', 'a3', 'a4'].map(T), E = N('a4');
    // 第一场：先是原画，然后“变成一幅画”——mix 从 0 推到 1
    const s0 = () => { scene(t); look('vangogh', t, { mix: eio(seg(t, A[0] + 1.8, A[0] + 3.4)) }); cap(t, A[0] + .3, A[1] - .2, '同一幅小画', '先看旋动的短笔触'); };
    // 第二场：点彩，步进重绘（一秒八步），只重绘 draw 里的画
    const s1 = () => { look('pointill', t, { fps: 8, bg: false, draw: q => scene(q, { sky: ['#3f6fc0', '#b9d6f2'] }) }); cap(t, A[1] + .5, A[2] - .2, '点彩', '等大的纯色点，眼睛来混色'); };
    // 第三场：马赛克
    const s2 = () => { scene(t, { sky: ['#274b8f', '#9fc3e8'] }); look('mosaic', t, { tile: 16 }); cap(t, A[2] + .5, A[3] - .2, '马赛克', '带缝的小石块'); };
    // 第四场：画面不重绘，只叠一层老胶片；太阳用弹簧落下来
    const s3 = () => { scene(t, { sunDrop: -260 * (1 - MO.spring(t - A[3] - .4, { duration: .9, bounce: .35 })) }); post('fade', t, { sat: .75, tint: '#f2e3c4' }); post('film', t); cap(t, A[3] + .5, A[4] - .2, '老胶片', '闪烁、划痕和片门'); };
    // 第五场：夜里，整幅乘一张光照图，窗口那团光在晃
    const s4 = () => { scene(t, NIGHT); const fl = 1 + .06 * Math.sin(t * 9) + .04 * Math.sin(t * 23), hx = W * (V ? .3 : .27), hy = H * (V ? .74 : .78) - 130;
      post('light', t, { ambient: 'rgb(60,66,96)', pools: [[hx, hy, 520 * fl, '255,214,150', .95], [W * (V ? .7 : .76), H * (V ? .3 : .24), 420, '200,210,255', .5]] });
      cap(t, A[4] + .5, E - .1, '明暗', '整幅画乘一张光照图'); };
    seq(t, s0, ['inkBloom', A[1], .9, s1, { cx: W * .3, cy: H * .6 }], ['mosaic', A[2], .8, s2], ['push', A[3], .7, s3], ['pageTurn', A[4], .8, s4]);
  } };
})();
