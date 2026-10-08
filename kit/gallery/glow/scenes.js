(() => {
const { blob, dot, swarm, stream, zoomInto, bubble, scaleBar, withCtx, PAL } = PACK.glow;
const TAU = Math.PI * 2, R = 300, STOPS = ['水滴', '一小团水', '小水分子'];
// 镜头：z 是层号（0 水滴 → 1 一小团水 → 2 小水分子），kc 是水滴从右边挪到正中的进度，heat 是加热程度
const zOf = t => { const a = T('a1'), e = T('a4'); return t < e ? eio(seg(t, a + .2, a + 2)) + eio(seg(t, a + 4.5, a + 6.3)) : 2 - 2 * eio(seg(t, e + .4, e + 3.4)); };
const kcOf = t => { const a = T('a1'), e = T('a4'); return t < e ? eio(seg(t, a - .3, a + 1.1)) : 1 - eio(seg(t, e + 1.6, e + 3.6)); };
const heatOf = t => eo(seg(t, T('a3') + .8, T('a3') + 3)) * (1 - seg(t, T('a4'), T('a4') + 1.2));
// 一个小水分子（示意）：一颗大的带两颗小的，各自慢慢转
function mol(t, heat) { return (x, y, r, i, col) => { const an = rnd(i + 5) * TAU + t * (.35 + .5 * rnd(i + 9)) * (i % 2 ? 1 : -1) + heat * .5 * Math.sin(t * 9 + i);
  for (const s of [-1, 1]) dot(x + Math.cos(an + s * .92) * r * .98, y + Math.sin(an + s * .92) * r * .98, r * .52, '#dbe8ff'); dot(x, y, r, col); }; }
function world(t) {
  const z = zOf(t), kc = kcOf(t), heat = heatOf(t), a0 = T('a0');
  const look = eio(seg(t, a0 + 2, a0 + 2.6)) * (1 - seg(t, T('a4'), T('a4') + .1));
  zoomInto(t, z, [
    { px: -.26, py: .42, rho: .13, draw(R) {
        blob(t, 0, R * .8, R * .7, { col: '#2a6bd8', sy: .12, seed: 4, wob: .03, glow: .5, hi: 0 });                                   // 水滴下面的一小片水面
        stream(t, [[0, -R * 2.1], [R * .03, -R * 1.5], [0, -R * .86]], { n: 4, r: R * .03, col: PAL.teal, speed: .3, band: false, a: 1 - seg(t, T('a1') - .4, T('a1')) + seg(t, T('a4') + 3.8, T('a4') + 4.4) });
        blob(t, 0, R * .12, R * .62, { col: PAL.blue, tip: .52, seed: 1, wob: .028, t0: .15, face: { smile: true, look: [-.7 * look, .8 * look] } });
        blob(t, -.26 * R, .42 * R, R * .04 * (1 + .25 * Math.sin(t * 5)), { col: PAL.white, seed: 2, idle: 0, wob: 0, t0: a0 + 2.1, t1: T('a1') + 3, glow: 1.6 });   // 从这里钻进去
      } },
    { px: .12, py: .06, rho: .15, draw(R) { blob(t, 0, 0, R * .98, { col: PAL.blue, seed: 6, wob: .045, a: .3, hi: .5 }); swarm(t, { x: 0, y: 0, rx: R * .85, ry: R * .85, n: 150, r: R * .021, cols: [PAL.blue, '#62a8ff', PAL.teal], seed: 3, calm: .9, energy: .04, glow: .7 }); } },
    { draw(R) { swarm(t, { x: 0, y: R * .2, rx: R * 2.9, ry: R * 1.02, n: 36, r: R * .112, cols: [PAL.blue, '#5aa2ff', PAL.teal], seed: 7, calm: .6, energy: .04 + .5 * heat, heat: heat * .85, draw: mol(t, heat) }); } },
  ], { x: lerp(1330, 960, kc), y: lerp(570, 585, kc), R });
  return { z, heat };
}
window.FILM = { theme: 'glow', chrome: 'none', chapters: ['一滴水', '钻进去', '小水分子', '加热', '回到水滴'],
  cover: { pill: '样片', title: '扁平发光世界', line1: '一滴水里面', line2: '是什么', tagline: '风格包样片 · 示意图',
    art(c, cx, cy, R) { withCtx(c, () => { blob(2, cx, cy + R * .1, R * .66, { col: PAL.blue, tip: .52, seed: 1, face: { smile: true } });
      swarm(2, { x: cx, y: cy + R * .1, rx: R * 1.25, ry: R * 1.2, n: 14, r: R * .07, cols: [PAL.teal, PAL.warm, PAL.violet], seed: 5, glow: 0, draw: (x, y, r, i, col) => { if (Math.hypot(x - cx, y - cy - R * .1) > R * .9) mol(2, 0)(x, y, r, i, col); } }); }); } },
  scenes(t) {
    const a0 = T('a0'), a1 = T('a1'), a2 = T('a2'), a3 = T('a3'), a4 = T('a4');
    // 加热：底下一条暖色的热源，热点往上冒
    const hk = eo(seg(t, a3 + .3, a3 + 1.5)) * (1 - seg(t, a4, a4 + 1));
    if (hk > 0) { glow(W / 2, H + 160, 900, 'rgba(255,122,74,.55)', hk * (.85 + .15 * Math.sin(t * 3)));
      stream(t, [[60, 1010], [520, 985], [960, 1014], [1400, 985], [1860, 1010]], { n: 26, r: 11, col: PAL.hot, speed: .12, wave: 12, k: hk, a: hk, seed: 2 });
      for (let i = 0; i < 5; i++) stream(t, [[250 + i * 355, 1000], [230 + i * 355 + 40 * Math.sin(i), 930], [260 + i * 355, 860]], { n: 3, r: 8, col: PAL.warm, speed: .45, band: false, a: hk, seed: 10 + i }); }
    const { z, heat } = world(t);
    // 尺度条：钻进去时滑块一档一档往右走；加热时换成温度条
    scaleBar(t, a1 + .2, z, STOPS, 700, 84, 600, { cap: '尺度（示意）', t1: a3 + .3 });
    scaleBar(t, a3 + .5, heat * 2, ['凉', '温', '热'], 800, 84, 400, { col: PAL.hot, cap: '温度（示意）', t1: a4 + .2 });
    scaleBar(t, a4 + .3, z, STOPS, 700, 84, 600, { cap: '尺度（示意）', t1: a4 + 3.7 });
    scn(t, 0, N('a0'), () => {
      rise(t, .45, '一滴水里面', 130, 450, 120, TH.ink, TH.f.t); rise(t, .8, '是什么？', 130, 590, 120, TH.a1, TH.f.t); rise(t, 1.5, '示意图，未按比例', 136, 672, 36, TH.note, TH.f.s);
      bubble(t, a0 + 1.6, '一滴水', 1660, 420, { tail: 'left', sz: 44 }); bubble(t, a0 + 2.2, '往里看', 1010, 700, { tail: 'right', sz: 40, col: PAL.teal });
    });
    scn(t, a1, N('a1'), () => { bubble(t, a1 + .4, '一层一层钻进去', 960, 235, { tail: 'none', sz: 40 }); bubble(t, a1 + 1.8, '一小团水', 1400, 470, { tail: 'left', t1: a1 + 4.8 }); });
    scn(t, a2, N('a2'), () => { bubble(t, a2 + .4, '一群小水分子', 650, 235, { sz: 40 }); bubble(t, a2 + 1.6, '一直在轻轻地动', 1260, 235, { tail: 'none', sz: 40, col: PAL.teal }); });
    scn(t, a3, N('a3'), () => { bubble(t, a3 + .5, '给它加热', 650, 235, { tail: 'none', sz: 40, col: PAL.warm }); bubble(t, a3 + 2.4, '动得更快了', 1260, 235, { sz: 40 }); });
    rise(t, a4 + 3.3, '原来一滴水里', 130, 450, 96, TH.ink, TH.f.t); rise(t, a4 + 3.7, '有一群一直在动的', 130, 570, 72, TH.note, TH.f.b); rise(t, a4 + 4.1, '小水分子', 130, 680, 96, TH.a1, TH.f.t);
  } };
})();
