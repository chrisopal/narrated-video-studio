(() => {
const { cam, paper, photoCard, sticky, thread, ring, marker, redArrow, scrawl, strip, spot, RED } = PACK.collage;
// 桌面坐标：全景就是 1920×1080；四样材料顺时针摆一圈，镜头挨个看过去，最后拉开
const E = [100, 150, 600, 340, -4], S = [1200, 140, 600, 380, 3], NT = [1290, 600, 400, 330, -3], P = [200, 585, 470, 360, 3], F = [735, 455, 450, 225, -2];
const sp = (c, u, v) => spot(c[0], c[1], c[2], c[3], c[4], u, v);
// 信封上的邮票位和邮戳（都是空白示意，没有字）
function envArt(w, h) {
  g.save(); g.strokeStyle = 'rgba(80,60,30,.22)'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, 0); g.lineTo(w * .5, h * .34); g.lineTo(w, 0); g.stroke();
  g.strokeStyle = 'rgba(60,50,40,.6)'; g.lineWidth = 3; g.setLineDash([9, 7]); g.strokeRect(w - 132, 34, 92, 112); g.setLineDash([]);
  g.strokeStyle = 'rgba(60,50,40,.42)'; g.lineWidth = 3; g.beginPath(); g.arc(w - 190, 150, 52, 0, 7); g.stroke(); g.beginPath(); g.arc(w - 190, 150, 38, 0, 7); g.stroke();
  for (let i = 0; i < 4; i++) { g.beginPath(); for (let x = 0; x <= 110; x += 10) { const px = w - 150 + x, py = 120 + i * 18 + Math.sin(x / 14) * 4; x ? g.lineTo(px, py) : g.moveTo(px, py); } g.stroke(); }
  g.restore();
}
// 照片占位里的灰色简图：路边一只信箱
function boxArt(w, h) {
  g.fillRect(0, h * .82, w, h * .18); g.fillRect(w * .5 - 9, h * .5, 18, h * .34);
  g.beginPath(); g.roundRect(w * .5 - 78, h * .2, 156, 112, [50, 50, 8, 8]); g.fill(); g.stroke();
  g.fillStyle = '#5f594f'; g.fillRect(w * .5 - 46, h * .2 + 50, 92, 12);
}
window.FILM = { theme: 'collage', chrome: 'none', chapters: ['信封', '分拣单', '便签', '照片', '串起来'],
  cover: { pill: '样片', title: '桌面拼贴', line1: '一封寄错的信', line2: '是怎么找回来的', tagline: '示意材料，非真实档案',
    art(c, cx, cy, R) {
      const card = (x, y, w, h, r, col) => { c.save(); c.translate(x, y); c.rotate(r); c.shadowColor = 'rgba(0,0,0,.55)'; c.shadowBlur = 24; c.shadowOffsetY = 10; c.fillStyle = col; c.fillRect(-w / 2, -h / 2, w, h); c.shadowColor = 'transparent'; c.fillStyle = 'rgba(31,27,23,.55)'; for (let i = 0; i < 3; i++) c.fillRect(-w / 2 + 26, -h / 2 + 40 + i * 34, w * (i == 2 ? .4 : .7), 10); c.restore(); };
      card(cx - R * .45, cy - R * .5, R * 1.05, R * .66, -.09, '#dccdb0'); card(cx + R * .5, cy - R * .1, R * .9, R * .7, .07, '#f3eee2'); card(cx - R * .2, cy + R * .62, R * .8, R * .6, .05, '#cdd8d6');
      c.strokeStyle = RED; c.lineWidth = 7; c.lineCap = 'round'; c.beginPath(); c.moveTo(cx - R * .45, cy - R * .8); c.quadraticCurveTo(cx + R * .1, cy - R * .5, cx + R * .5, cy - R * .42); c.quadraticCurveTo(cx + R * .2, cy + R * .2, cx - R * .2, cy + R * .36); c.stroke();
      [[cx - R * .45, cy - R * .8], [cx + R * .5, cy - R * .42], [cx - R * .2, cy + R * .36]].forEach(([x, y]) => { c.fillStyle = '#d8d1c3'; c.beginPath(); c.arc(x, y, 14, 0, 7); c.fill(); c.strokeStyle = 'rgba(30,25,20,.6)'; c.lineWidth = 2; c.stroke(); c.strokeStyle = RED; c.lineWidth = 7; });
    } },
  scenes(t) {
    const a0 = T('a0'), a1 = T('a1'), a2 = T('a2'), a3 = T('a3'), a4 = T('a4');
    cam(t, [{ t: 0, x: 520, y: 330, z: 1.5 }, { t: a1 - .5, x: 1400, y: 335, z: 1.5, d: 1.3 }, { t: a2 - .5, x: 1480, y: 850, z: 1.5, d: 1.3 }, { t: a3 - .5, x: 480, y: 850, z: 1.5, d: 1.3 }, { t: a4 - .5, x: 960, y: 540, z: 1, d: 1.8 }], () => {
      // 一 信封：写的是甲街
      paper(t, .3, ...E.slice(0, 4), { rot: E[4], col: '#dccdb0', tape: 'none', bf: 'KT', sz: 46, top: 150, pad: 60, lines: ['收件：甲街 7 号', '小禾 收'], marks: [{ i: 0, at: a0 + 1.6, a: 3 }] }, envArt);
      scrawl(t, a0 + 3.2, '寄出去，没送到', 735, 262, { under: true });
      redArrow(t, a0 + 4.3, 728, 290, 610, 330, { bend: -.25 });
      // 二 分拣单：登成了乙街
      paper(t, a1 + .5, ...S.slice(0, 4), { rot: S[4], tear: 'bottom', kicker: '分拣单', sz: 40, lines: ['收件格口：乙街 7 号', '状态：已投递'], rings: [{ i: 0, at: a1 + 2.2, a: 5, b: 6 }] });
      const s1 = sp(S, .5, .8); scrawl(t, a1 + 3.1, '一字之差', s1[0], s1[1], { rot: S[4] - 4, sz: 50 });
      // 三 便签：邻居留的话
      sticky(t, a2 + .5, ...NT.slice(0, 4), { rot: NT[4], col: '#cdd8d6', title: '邻居留言', sz: 40, lines: ['这封不是我的，', '放回信箱了。'], marks: [{ i: 1, at: a2 + 2.3, a: 0, b: 4 }] });
      // 四 照片位：没有真照片，画占位
      photoCard(t, a3 + .5, ...P.slice(0, 4), { rot: P[4], cap: '乙街口的信箱', art: boxArt });
      const p1 = sp(P, .5, .36); ring(t, a3 + 2.2, p1[0], p1[1], 120, 92, { dur: .6 });
      scrawl(t, a3 + 3, '信在这儿', 715, 895, { sz: 46 });
      redArrow(t, a3 + 3.7, 705, 862, 572, 770, { bend: .2 });
      // 五 红线串起来，结果落在中间
      thread(t, a4 + 1.3, [sp(E, .95, .76), sp(S, .05, .72)], { dur: .6 });
      thread(t, a4 + 2, [sp(S, .78, .9), sp(NT, .8, .07)], { dur: .5, sag: 0 });
      thread(t, a4 + 2.6, [sp(NT, .08, .9), sp(P, .95, .42)], { dur: .6 });
      paper(t, a4 + 3.4, ...F.slice(0, 4), { rot: F[4], pin: [.5, 0], kicker: '结果', sz: 40, lines: ['原信退回甲街 7 号'], marks: [{ i: 0, at: a4 + 4.2, a: 2 }] });
    });
    strip(t, .2, '示意材料，非真实档案', 56, 36);
  } };
})();
