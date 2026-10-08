(() => {
const { mountain, cam, revealDraw, mist, vtext, rules, makeSeal, sealStamp, drawGeese, makeRipples, drawRipples, chapter, layer, once, ss, INK, TQ, F } = PACK.ink;
const { scholar } = PACK.figures;
window.FILM = { theme: 'songink', chrome: 'none', chapters: ['序', '壹 眉山'],
  cover: { pill: '样片', title: '东坡', line1: '宋式水墨', line2: '风格包', tagline: '', art() {} },
  scenes(t) {
    layer(t, T('p0') - 1, N('p0') + .8, (G, u) => {
      const far = once('p.far', () => mountain({ seed: 11, base: 900, amp: 150, scale: 380, peaks: [{ x: 620, h: 190, w: 150 }, { x: 1560, h: 140, w: 190 }, { x: 980, h: 90, w: 120 }], col: TQ, alpha: .42, fade: 130, edge: .3, fold: 40, blur: 3, dots: 140 }));
      const near = once('p.near', () => mountain({ seed: 12, base: 1030, amp: 110, scale: 260, peaks: [{ x: 200, h: 300, w: 170 }, { x: 2150, h: 250, w: 150 }], col: INK, alpha: .72, fade: 90, edge: .6, fold: 28, blur: .6, dots: 260, trees: 46 }));
      const seal = once('p.seal', () => makeSeal('东坡', 62, 118, 5));
      cam(G, u, 14, { z0: 1, z1: 1.06, y1: -10 });
      revealDraw(G, far.c, -200 - u * 4, 0, ss(.3, 5, u), 101);
      revealDraw(G, near.c, -200 - u * 9, 0, ss(1.4, 6, u), 102);
      mist(G, u, [{ x: 300, y: 960, r: 700, a: .75, v: 14 }, { x: 1500, y: 900, r: 800, a: .6, v: -10 }, { x: 900, y: 1040, r: 900, a: .5, v: 6 }]);
      scholar(G, 1470, 1045, .62, u, { pose: 'stand', age: 1, alpha: ss(7.2, 9.2, u), wind: .3 });
      G.setTransform(1, 0, 0, 1, 0, 0);
      drawGeese(G, u, 1.5, 12.5, 1950, 330, 1250, 190, 7, 1);
      vtext(G, u, { t0: 3, cols: ['东坡'], x: 960, y: 170, size: 270, lead: 1.02, font: F.cao, rate: 1, fd: 1.8, wet: true });
      vtext(G, u, { t0: 6.2, cols: ['苏轼 字子瞻 号东坡居士', '一〇三七 — 一一〇一'], x: 780, y: 250, size: 34, gap: 56, lead: 1.35, rate: .07, fd: .8 });
      sealStamp(G, u, seal, 1098, 760, 8.2);
    });
    layer(t, T('m0') - .8, N('m0'), (G, u) => {
      const far = once('m.far', () => mountain({ seed: 21, base: 760, amp: 140, scale: 360, peaks: [{ x: 560, h: 330, w: 120 }, { x: 900, h: 250, w: 140 }, { x: 300, h: 160, w: 150 }, { x: 1300, h: 120, w: 160 }], col: TQ, alpha: .38, fade: 170, edge: .3, blur: 3.5, dots: 120 }));
      const mid = once('m.mid', () => mountain({ seed: 22, base: 890, amp: 90, scale: 300, peaks: [{ x: 900, h: 480, w: 150 }, { x: 1180, h: 220, w: 130 }, { x: 640, h: 180, w: 120 }], col: INK, alpha: .6, fade: 160, edge: .55, fold: 34, blur: .9, dots: 420, trees: 70 }));
      const near = once('m.near', () => mountain({ seed: 23, base: 1010, amp: 60, scale: 260, peaks: [{ x: 160, h: 170, w: 220 }, { x: 1500, h: 60, w: 300 }], col: INK, alpha: .8, fade: 70, edge: .8, blur: .4, dots: 200, trees: 34 }));
      const rip = once('m.rip', () => makeRipples(24, 140, 300, 1900, 990, 1080));
      cam(G, u, 19, { z0: 1.03, z1: 1.1, x1: 30 });
      revealDraw(G, far.c, -200 - u * 3, 0, ss(0, 4, u), 201);
      G.save(); G.translate(-200 - u * 6, 0); revealDraw(G, mid.c, 0, 0, ss(.6, 5, u), 202); G.restore();
      mist(G, u, [{ x: 500, y: 800, r: 900, a: .7, v: 16, sy: .12 }, { x: 1300, y: 900, r: 700, a: .6, v: -12, sy: .15 }]);
      revealDraw(G, near.c, -200 - u * 12, 0, ss(1.2, 5.5, u), 203);
      drawRipples(G, rip, u, .45 * ss(2, 5, u), INK, -3);
      scholar(G, 1250, 1040, .95, u, { pose: 'read', age: 0, alpha: ss(1.5, 3.5, u), wind: .15 });
      G.setTransform(1, 0, 0, 1, 0, 0);
      chapter(G, u, 1.2, '壹', '眉山', '景祐三年 · 一〇三七');
      rules(G, u, { t0: 2.6, x: 1640, gap: 56, n: 4, y: 120, h: 560 });
      vtext(G, u, { t0: 3.2, cols: ['北宋景祐三年', '苏轼生于眉州眉山'], x: 1640, y: 130, size: 36, gap: 56, rate: .1 });
      vtext(G, u, { t0: 8.2, cols: ['父苏洵 弟苏辙', '父子三人同列唐宋八大家'], x: 1528, y: 130, size: 36, gap: 56, rate: .1 });
    });
  } };
})();
