(() => {
const { host, pointTo, layout, stagePanel, speechTag, on, PAL } = PACK.host;
// 题目（虚构）：一家做小零件的工厂怎么长大的。公司、数字都是虚构的，图上标“示意”。
// 四个镜头四种版式：人左图右（开场）→ 人右图左指柱状图 → 人小在角落、主画面是时间轴 → 大半身特写说结论。

// 主角零件：一颗六角螺母，按 30° 一格“棘轮式”转（硬切，不补间）
function nut(t, t0, x, y, r) {
  if (t < t0) return;
  const rot = Math.floor((t - t0) / .5) * Math.PI / 6;
  g.save(); g.translate(x, y);
  g.fillStyle = 'rgba(28,36,48,.12)'; g.beginPath(); g.ellipse(10, r * 1.02, r * .95, r * .16, 0, 0, 7); g.fill();
  g.rotate(rot); g.fillStyle = '#9fb3c6'; g.strokeStyle = PAL.line; g.lineWidth = 5; g.lineJoin = 'round';
  g.beginPath(); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#c4d2df'; g.beginPath(); g.arc(0, 0, r * .8, 0, 7); g.fill();
  g.strokeStyle = 'rgba(27,33,43,.35)'; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, r * .8, 0, 7); g.stroke();
  g.fillStyle = '#ffffff'; g.strokeStyle = PAL.line; g.lineWidth = 5; g.beginPath(); g.arc(0, 0, r * .42, 0, 7); g.fill(); g.stroke();
  g.strokeStyle = 'rgba(27,33,43,.45)'; g.lineWidth = 3; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(0, 0, r * (.3 - i * .07), .3 + i, 2.6 + i); g.stroke(); }
  g.restore();
}
// 柱状图里第 i 根柱子的几何（和 kit 的 barChart 同一套算法），用来让讲解员指准
function barGeo(data, i, x, y, w, h) {
  const max = Math.max(...data.map(d => d.value)) * 1.15, n = data.length, bw = Math.min(180, w / n * .56), step = w / n, ph = h - 70, base = y + ph, bh = ph * data[i].value / max;
  return { x: x + step * i + (step - bw) / 2, w: bw, top: base - bh, base, bh };
}
const BARS = [{ label: '起步', value: 5 }, { label: '第3年', value: 16 }, { label: '第6年', value: 38 }, { label: '第10年', value: 90, hi: true }];
const TLY = 500;

window.FILM = { theme: 'host', chrome: 'none', chapters: ['开场', '产量', '历程', '结论'],
  cover: { pill: '样片', title: '讲解员串场', line1: '一家做小零件的厂', line2: '是怎么长大的', tagline: '风格包样片 · 虚构案例，数字均为示意',
    art(c, cx, cy, R) {
      c.fillStyle = 'rgba(44,91,132,.12)'; c.beginPath(); c.arc(cx, cy, R, 0, 7); c.fill();
      const bx = cx + R * .2, by = cy + R * .2; [.25, .45, .7, 1].forEach((v, i) => { c.fillStyle = i === 3 ? PAL.a1 : 'rgba(28,36,48,.25)'; c.fillRect(bx + i * R * .15, by - R * .75 * v, R * .1, R * .75 * v); });
      c.fillStyle = PAL.ink; c.fillRect(bx - 10, by, R * .6, 5);
      on(c, () => host(2, cx - R * .42, cy + R * .9, { scale: R / 440, pose: 'present', blink: false }));
    } },
  scenes(t) {
    const A0 = T('a0'), A1 = T('a1'), B = T('a2'), C = T('a3');
    layout(t, [
      // 一、人左图右：讲解员挥手开场，板上是主角零件和三行概况
      { at: 0, mode: 'left', fn: (R, L) => {
        const P0 = stagePanel(t, 0, R, { title: '这期讲一家小厂', tag: '虚构' });
        const NX = P0.x + 250, NY = P0.y + 330;
        nut(t, A0 + .2, NX, NY, 150);
        txt('示意图，未按比例', NX, P0.y + 640, 32, TH.note, TH.f.s, 'center');
        specTable(t, A0 + 1.0, [['产品', '一种小零件'], ['客户', '整机工厂'], ['人数', '几十人（示意）']], P0.x + 530, P0.y + 120, 500);
        const h = L.host({ pose: [[0, 'wave'], [A0 + 1.2, 'present'], [A0 + 2.6, 'point', { at: [NX, NY] }], [A0 + 4.2, 'count', { n: 1 }], [A0 + 5.3, 'stand']],
          talk: [[A0 + .2, A0 + 2.3], [A0 + 2.7, A0 + 5.6]] });
        pointTo(t, A0 + 2.6, h, [NX, NY], { t1: A0 + 4.2, r: 178 });
        speechTag(t, A0 + .1, '一家做小零件的厂', h);
      } },
      // 二、人右图左：讲解员指着柱子讲产量，先指最矮的、再指最高的
      { at: A1, mode: 'right', fn: (R, L) => {
        const P1 = stagePanel(t, A1, R, { title: '年产量', tag: '示意' });
        const bx = P1.x + 10, by = P1.y + 10, bw = P1.w - 20, bh = P1.h - 40;
        barChart(t, A1 + .15, BARS, bx, by, bw, bh, { unit: '万件' });
        const g0 = barGeo(BARS, 0, bx, by, bw, bh), g3 = barGeo(BARS, 3, bx, by, bw, bh);
        const p0 = [g0.x + g0.w + 30, g0.base - 30], p3 = [g3.x + g3.w + 30, g3.top + 90];
        const h = L.host({ pose: [[A1, 'think'], [A1 + 1.5, 'point', { at: p0 }], [A1 + 2.9, 'point', { at: p3 }], [A1 + 4.6, 'open'], [A1 + 6.0, 'present']],
          talk: [[A1 + .3, A1 + 2.6], [A1 + 3.0, A1 + 6.8]] });
        pointTo(t, A1 + 1.5, h, p0, { t1: A1 + 2.9, line: false, r: 20 });
        pointTo(t, A1 + 2.9, h, p3, { t1: A1 + 4.6, r: 20 });
        speechTag(t, A1 + 2.9, '越做越大', h);
      } },
      // 三、人小在角落：主画面是时间轴，角落里的讲解员一项一项指过去
      { at: B, mode: 'corner', fn: (R, L) => {
        const P2 = stagePanel(t, B, R, { title: '它是怎么长大的', tag: '虚构 · 示意' });
        const at = [B + .5, B + 1.7, B + 2.9, B + 4.1], x0 = P2.x + 60, x1 = P2.x + P2.w - 60, X = i => lerp(x0 + 60, x1 - 60, i / 3);
        const items = [['起步', '一间小作坊'], ['第3年', '添了自动机床'], ['第6年', '只做一种零件'], ['第10年', '卖到很多地方']];
        const cur = at.filter(a => a <= t).length - 1;
        timeline(t, B + .2, items.map(([tag, label], i) => ({ tag, label, at: at[i] })), { y: TLY, x0, x1 });
        const pose = [[B, 'present']].concat(at.map((a, i) => [a, 'point', { at: [X(i), TLY] }]), [[B + 5.6, 'count', { n: 4 }], [B + 6.7, 'stand']]);
        const h = L.host({ pose, talk: [[B + .2, B + 7.0]] });
        at.forEach((a, i) => pointTo(t, a, h, [X(i), TLY], { t1: i < 3 ? at[i + 1] : B + 5.6, r: 34, line: false }));
      } },
      // 四、大半身特写：抱臂、竖一根手指、摊手指向结论，最后挥手
      { at: C, mode: 'close', fn: (R, L) => {
        const P3 = stagePanel(t, C, R, {});
        bigNumber(t, C + 1.2, { value: 1, unit: '种零件', label: '从头到尾只做', note: '虚构案例 · 示意' }, P3.x + P3.w / 2, P3.y + 340, 220);
        nut(t, C + 2.4, P3.x + P3.w / 2, P3.y + 590, 80);
        const h = L.host({ pose: [[C, 'cross'], [C + 1.5, 'count', { n: 1 }], [C + 3.0, 'present'], [C + 4.5, 'open'], [C + 6.0, 'wave']],
          talk: [[C + .2, C + 5.9]] });
        speechTag(t, C + 2.0, '小而专，也能长大', h);
      } },
    ]);
  } };
})();
