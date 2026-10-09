(() => {
const { screens, slam, sub, bar, countBig } = PACK.kinetic;
// 竖版样片：一封没寄出的信（虚构）。所有位置都从 safeBox() 取，换成 3:4 或别的平台也不出界、不被按钮挡
function envelope(t, t0, cx, cy, w, o = {}) {
  const k = eo(seg(t, t0, t0 + .5)); if (k <= 0) return; const h = w * .62, flip = o.flip || 0;
  g.save(); g.globalAlpha *= k; g.translate(cx, cy + (1 - k) * 40); g.scale(1, Math.cos(flip * Math.PI) || .001);
  const back = flip > .5; g.fillStyle = back ? '#e9dfc8' : '#f4ecd8'; g.strokeStyle = '#3b3227'; g.lineWidth = 4; rr(-w / 2, -h / 2, w, h, 10); g.fill(); g.stroke();
  if (!back) { g.beginPath(); g.moveTo(-w / 2, -h / 2); g.lineTo(0, h * .08); g.lineTo(w / 2, -h / 2); g.stroke();
    g.fillStyle = TH.a1; g.fillRect(w / 2 - w * .2, -h / 2 + w * .05, w * .14, w * .17); g.strokeStyle = '#fff'; g.lineWidth = 3; g.strokeRect(w / 2 - w * .2 + 6, -h / 2 + w * .05 + 6, w * .14 - 12, w * .17 - 12); }
  g.restore();
}
window.FILM = {
  theme: 'kinetic', chrome: 'none', chapters: [],
  cover: { pill: '竖版样片', title: '一封没寄出的信', line1: '二十年', line2: '背面早有回信', tagline: '虚构故事 · 演示用',
    art(c, cx, cy, R) { c.save(); c.translate(cx, cy); c.fillStyle = '#f4ecd8'; c.strokeStyle = '#3b3227'; c.lineWidth = 6; c.beginPath(); c.roundRect(-R, -R * .62, R * 2, R * 1.24, 14); c.fill(); c.stroke(); c.beginPath(); c.moveTo(-R, -R * .62); c.lineTo(0, R * .1); c.lineTo(R, -R * .62); c.stroke(); c.restore(); } },
  scenes(t) {
    const B = safeBox(), cx = B.cx;
    screens(t, [
      { at: 0, bg: 'black', fn: (pal, u) => {
        slam(t, at('v0', '1998') - .1, '1998', { x: cx, y: B.y + B.h * .32, sz: 230, al: 'center', col: pal.acc });
        sub(t, at('v0', '冬天'), '冬天', { x: cx, y: B.y + B.h * .44, sz: 72, al: 'center', col: pal.ink });
        envelope(t, at('v0', '信'), cx, B.y + B.h * .76 + Math.sin(t * 1.3) * 10, 420 + 30 * seg(t, at('v0', '信'), N('v0')));
        txt('虚构故事', B.x + B.w, B.y + 40, 40, pal.dim, 'H7', 'right');
      } },
      { at: T('v1'), bg: 'paper', fn: (pal, u) => {
        g.save(); g.fillStyle = '#fffaf0'; g.strokeStyle = '#3b3227'; g.lineWidth = 3; rr(B.x + 40, B.y + 120, B.w - 80, 540, 8); g.fill(); g.stroke(); g.restore();
        g.save(); const zz = 1 + .04 * seg(t, T('v1'), N('v1')); g.translate(cx, B.y + 400); g.scale(zz, zz); g.translate(-cx, -(B.y + 400));
        txt('爸：', B.x + 90, B.y + 240, 56, pal.ink, 'KT');
        for (let i = 0; i < 3; i++) { const k = eo(seg(t, at('v1', '三行') + i * .45, at('v1', '三行') + i * .45 + .5)); g.save(); g.strokeStyle = pal.dim; g.lineWidth = 8; g.lineCap = 'round'; g.beginPath(); g.moveTo(B.x + 90, B.y + 360 + i * 120); g.lineTo(B.x + 90 + (B.w - 260) * k * (i === 2 ? .55 : 1), B.y + 360 + i * 120); g.stroke(); g.restore(); }
        g.restore();
        slam(t, at('v1', '三行'), '三行字', { x: cx, y: B.y + B.h - 10, sz: 150, al: 'center', col: pal.acc });
      } },
      { at: T('v2'), bg: 'black', fn: (pal, u) => {
        countBig(t, at('v2', '七次') - .1, '7', { x: cx - 40, y: B.y + B.h * .3, sz: 300, al: 'right', col: pal.acc });
        sub(t, at('v2', '七次') + .2, '次搬家', { x: cx - 20, y: B.y + B.h * .27, sz: 90, al: 'left', col: pal.ink });
        for (let i = 0; i < 7; i++) { const t0 = at('v2', '搬了') + i * .28, k = eo(seg(t, t0, t0 + .3)); if (k <= 0) continue; g.save(); g.globalAlpha *= k; g.fillStyle = i === 6 ? '#3a3a3a' : '#262626'; g.strokeStyle = pal.dim; g.lineWidth = 3; const w = 420 - i * 6, x = cx - w / 2, y = B.y + B.h - 60 - i * 46 - (1 - k) * 60; rr(x, y, w, 40, 6); g.fill(); g.stroke(); g.restore(); continue; rr(x, y, w, 64, 6); g.fill(); g.stroke(); g.restore(); }
        envelope(t, at('v2', '最上面') - .2, cx, B.y + B.h - 60 - 6 * 46 - 60, 200);
      } },
      { at: T('v3'), bg: 'paper', fn: (pal, u) => {
        const f = eio(seg(t, at('v3', '背面') - .4, at('v3', '背面') + .5));
        envelope(t, T('v3') - 1, cx, B.y + B.h * .5, 700 + 60 * seg(t, T('v3'), at('v3', '背面')), { flip: f });
        if (f > .5) txt('……', cx, B.y + B.h * .5 + 20, 80, pal.dim, 'KT', 'center', seg(t, at('v3', '一行字') - .3, at('v3', '一行字') + .2));
        sub(t, at('v3', '背面'), '信封背面', { x: cx, y: B.y + 70, sz: 80, al: 'center', col: pal.ink });
      } },
      { at: T('v4'), bg: 'paper', fn: (pal, u) => {
        const cy4 = B.y + B.h * .4; envelope(t, -9, cx, cy4, 680 + 40 * seg(t, T('v4'), N('v4')), { flip: 1 });
        txt('我知道，', cx, cy4 - 20, 110, pal.ink, 'KT', 'center', eo(seg(t, at('v4', '我知道'), at('v4', '我知道') + .5)));
        txt('不用寄。', cx, cy4 + 120, 110, pal.acc, 'KT', 'center', eo(seg(t, at('v4', '不用寄'), at('v4', '不用寄') + .5)));
        lowerThird(t, at('v4', '父亲'), '父亲的字', '写在信封背面', B.x, B.y + B.h - 90, N('v4'));
      } },
      { at: T('v5'), bg: 'black', fn: (pal, u) => {
        slam(t, at('v5', '没有寄出去') - .1, '没有寄出去', { x: cx, y: B.y + 420, sz: 130, al: 'center', col: pal.ink, maxW: B.w });
        slam(t, at('v5', '也已经') , '也已经送到了', { x: cx, y: B.y + 640, sz: 130, al: 'center', col: pal.acc, maxW: B.w });
        bar(t, at('v5', '送到') + .3, { x: cx - 200, y: B.y + 700, w: 400, h: 16 });
        envelope(t, at('v5', '送到') + 1, cx, B.y + 1000 - 160 * seg(t, at('v5', '送到') + 1, N('v5') + 3), 300 - 120 * seg(t, at('v5', '送到') + 1, N('v5') + 3));
        txt('虚构故事 · 竖版样片', cx, B.y + B.h - 60, 40, pal.dim, 'H7', 'center', seg(t, T('v5') + 1, T('v5') + 1.4));
      } },
    ]);
  },
};
})();
