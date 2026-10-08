(() => {
const { screens, slam, sub, listUp, countBig, bar, on, RATIO, ACC, BLK } = PACK.kinetic;
const BIG = 400, SM = Math.round(BIG / RATIO);   // 主词和辅句 3.4:1
window.FILM = { theme: 'kinetic', chrome: 'none', chapters: ['开场', '先做', '再改', '别等', '清单'],
  cover: { pill: '样片', title: '三句话', line1: '先做　再改', line2: '别等', tagline: '风格包样片 · 动态文字',
    art(c, cx, cy, R) { R *= .84; c.fillStyle = ACC; c.fillRect(cx - R, cy - R, 2 * R, 2 * R); c.fillStyle = BLK; c.font = `800 ${R * 1.7}px RC, H9`; c.textAlign = 'center'; c.textBaseline = 'alphabetic'; c.fillText('3', cx, cy + R * .42);
      on(c, () => bar(9, 0, { x: cx - R * .62, y: cy + R * .62, w: R * 1.24, h: R * .12, col: BLK })); } },
  scenes(t) {
    const A = T('a1'), B = T('a2'), C = T('a3'), D = T('a4');
    screens(t, [
      // 开场：黑底，题目砸下来
      { at: 0, bg: 'black', fn: () => {
        slam(t, .3, '三句话', { x: W / 2, y: 600, sz: BIG, al: 'center' });
        sub(t, .75, '把事做成，够用了', { x: W / 2, y: 800, sz: SM, al: 'center' });
        bar(t, 2.4, { x: W / 2 - 600, y: 650, w: 1200, h: 30, from: 'center' }); } },
      // 第一句：底色屏，靠左；色块从左擦进来
      { at: A, bg: 'paper', wipe: 'right', fn: () => {
        countBig(t, A + .35, 1, { x: W - 130, y: 720, sz: 560, al: 'right', from: 'down' });
        slam(t, A + .75, '先做', { x: 120, y: 620, sz: BIG, from: 'left' });
        sub(t, A + 1.05, '想不清楚，就先动手', { x: 130, y: 850, sz: SM });
        bar(t, A + 2.6, { x: 130, y: 676, w: 790, h: 30 }); } },
      // 第二句：强调色屏，居中；硬切
      { at: B, bg: 'accent', fn: () => {
        countBig(t, B + .1, 2, { x: W / 2, y: 240, sz: 190, al: 'center', from: 'up' });
        slam(t, B + .5, '再改', { x: W / 2, y: 640, sz: BIG, al: 'center', from: 'scale' });
        sub(t, B + .8, '错了不怕，改就是了', { x: W / 2, y: 860, sz: SM, al: 'center' });
        bar(t, B + 2.6, { x: W / 2 - 400, y: 694, w: 800, h: 30, from: 'center', col: BLK }); } },
      // 第三句：黑屏，靠右；色块从下往上擦
      { at: C, bg: 'black', wipe: 'up', fn: () => {
        countBig(t, C + .35, 3, { x: 130, y: 720, sz: 560, from: 'left' });
        slam(t, C + .75, '别等', { x: W - 120, y: 620, sz: BIG, al: 'right', from: 'right' });
        sub(t, C + 1.05, '没有哪天算准备好', { x: W - 130, y: 850, sz: SM, al: 'right' });
        bar(t, C + 2.6, { x: W - 130 - 790, y: 676, w: 790, h: 30, from: 'right' }); } },
      // 清单：三句排在一起，新的一条到了旧的退灰，最后全部点亮
      { at: D, bg: 'paper', fn: () => {
        listUp(t, [{ at: D + .3, text: '先做' }, { at: D + 1.0, text: '再改' }, { at: D + 1.7, text: '别等' }], { x: 190, y: 330, sz: 220, gap: 255, allOn: D + 2.4 });
        bar(t, D + 2.4, { x: 1060, y: 130, w: 30, h: 760, from: 'top' });
        countBig(t, D + 2.6, 3, { x: 1200, y: 700, sz: 600, pad: 1 });
        sub(t, D + 2.85, '就这三句', { x: 1215, y: 850, sz: 72 }); } },
      // 收尾：硬切到强调色
      { at: D + 5.6, bg: 'accent', fn: () => {
        slam(t, D + 5.7, '开工', { x: W / 2, y: 600, sz: 480, al: 'center', from: 'scale' });
        sub(t, D + 6.05, '就是现在', { x: W / 2, y: 830, sz: Math.round(480 / RATIO), al: 'center' });
        bar(t, D + 6.6, { x: W / 2 - 480, y: 660, w: 960, h: 34, from: 'center', col: BLK }); } },
    ]);
  } };
})();
