(() => {
const { cam, revealDraw, mist, makeRipples, drawRipples, once, ss, INK, TQ, SEAL } = PACK.ink, { official } = PACK.figures, { makeMap } = PACK.map;
const { page, plate, counter, cn, narr, poem, mountainLined, clouds, ground, drawCart, drawCamels, sunDisc, FIG } = PACK.litho;
const M = makeMap({ view: [80, 19, 124, 48], title: '戍途图', start: '广州', main: ['广州', '九江', '兰州'], wall: true, tone: 'litho' });
M.leg([{ p: '广州' }, { p: [113.3, 24.0] }, { p: '韶州' }, { p: '梅关', lab: '梅关 · 四月十七' }, { p: '赣州' }, { p: '吉安', lab: '吉安' }, { p: '南昌' }, { p: '九江' }], ['三月末 出广州', '溯北江 度梅关'], '一九〇五');
M.leg([{ p: '九江' }, { p: '桐城' }, { p: [114.2, 33.8] }, { p: '郑州', lab: '郑州 · 八月十三' }, { p: '洛阳' }, { p: '潼关' }, { p: '西安', lab: '西安' }, { p: '平凉' }, { p: '兰州' }], ['过皖 入豫 经陕', '十一月 抵兰州'], '一九〇五');
const NX = 1634, PX = 1440;
const CH = { '辩': ['辩', '梅关 吉安', '光绪三十一年四五月'], '看': ['看', '黄河 平凉', '八月至十月'] };
window.FILM = { theme: 'litho', chrome: 'none', chapters: ['辩', '看'], cover: { pill: '样片', title: '石印画报', line1: '', line2: '', tagline: '', art() {} },
  scenes(t) {
    const KF = [[T('a0'), 1, 0], [N('a0'), 34, 1700], [N('m0'), 134, 4200], [N('b0'), 190, 6000]];
    page(t, T('a0') - .9, N('a0'), (G, u) => {
      const far = once('a.far', () => mountainLined({ seed: 221, base: 700, amp: 150, scale: 300, peaks: [{ x: 380, h: 260, w: 170 }, { x: 1060, h: 300, w: 190 }, { x: 1700, h: 160, w: 200 }], col: TQ, alpha: .45, fade: 170, blur: 3, dots: 120 }));
      const mid = once('a.mid', () => mountainLined({ seed: 222, base: 900, amp: 110, scale: 200, peaks: [{ x: 250, h: 330, w: 150 }, { x: 470, h: 440, w: 120 }, { x: 640, h: 250, w: 90 }], col: INK, alpha: .5, fade: 150, edge: .55, blur: .8, dots: 380, trees: 90, jag: 26 }));
      cam(G, u, 14, { z0: 1.05, z1: 1.0, x0: 20, x1: -10 });
      clouds(G, u, 300, ss(0, 3, u), 225, 3);
      revealDraw(G, far.c, -200 - u * 2, 0, ss(0, 4, u), 2201);
      revealDraw(G, mid.c, -200 - u * 4, 0, ss(.6, 4.8, u), 2202);
      mist(G, u, [{ x: 700, y: 880, r: 1000, a: .65, v: 12, sy: .12 }]);
      ground(G, 1010, ss(1, 3, u), 203);
      official(G, 1050, 1012, FIG, u, { pose: 'walk', face: -1, wind: .3, alpha: ss(2, 4, u) });
      official(G, 1190, 1014, FIG * .95, u, { pose: 'walk', face: -1, servant: true, alpha: ss(2.4, 4.4, u) });
    }, { first: true, text: (G, u) => {
      narr(G, u, { t0: 1.4, cols: ['四月十七 度梅关', '岭上梅花早已落尽'], x: NX, y: 120 });
      poem(G, u, { t0: 5.2, cols: ['一岭分南北', '从此是他乡'], x: PX, y: 140 });
    } });
    page(t, T('m0'), N('m0'), (G, u) => M.draw(G, u, 10, { leg: 1, cx: 840, traveler: (g2, x, y, o) => drawCart(g2, x, y, .3, o.t, { face: o.face, alpha: o.alpha }), caption: (g2, u2, cap, year, t0) => narr(g2, u2, { t0, cols: cap, x: 1620, y: 120, size: 34, gap: 54 }) }), { fx: false });
    page(t, T('b0'), N('b0') + 2, (G, u) => {
      const dune = once('b.far', () => mountainLined({ seed: 301, base: 820, amp: 60, scale: 420, peaks: [{ x: 600, h: 120, w: 300 }, { x: 1500, h: 90, w: 320 }], col: TQ, alpha: .4, fade: 120, blur: 2.5, dots: 60, jag: 6 }));
      cam(G, u, 14, { z0: 1.0, z1: 1.04 });
      sunDisc(G, 420, 300, 46, 1);
      revealDraw(G, dune.c, -200 - u * 2, 0, ss(0, 3, u), 3001);
      ground(G, 1010, ss(.5, 2.5, u), 303);
      drawCamels(G, 1500 - u * 22, 1004, 1.1, u, ss(1, 3, u));
      drawCart(G, 900 - u * 16, 1008, 1.15, u, { face: -1, alpha: ss(1.5, 3.5, u) });
    }, { last: true, text: (G, u) => {
      narr(G, u, { t0: 1.2, cols: ['出潼关 西行', '日行六七十里'], x: NX, y: 120 });
    } });
    const k = counter(t, KF), cur = TL.filter(s => s.t0 - .2 <= t).pop() || TL[0], c = CH[cur.ch];
    plate(t, { chapter: { glyph: c[0], place: c[1], date: c[2], t0: TL.find(s => s.ch === cur.ch).t0 }, title: '河海昆仑录',
      count: k && { a: '第' + cn(Math.max(1, k.day)) + '日', b: k.li < 10 ? '出广州' : '行约' + cn(Math.round(k.li / 10) * 10) + '里', p: k.li / 11720, marks: [0, 6800 / 11720, 8270 / 11720, 1] } });
  } };
})();
