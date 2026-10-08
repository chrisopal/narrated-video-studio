(() => {
const { screen, clipReg, groundLine, veil, tag, wom, emp, from, upto, vis, pr, mv, G1, G2, S1, S2, LQ, PAL, lqClouds, lqDisc, lqHill, lqTree, lqFloor, lqStele, lqThrone, lqBanner, lqHorse, lqWall, lqHall } = PACK.lacquer;
window.FILM = { theme: 'lacquer', chrome: 'none', chapters: ['序', '壹 平城'], cover: { pill: '样片', title: '漆屏风', line1: '', line2: '', tagline: '', art() {} },
  scenes(t) {
    const cur = TL.filter(s => s.t0 - .2 <= t).pop() || TL[0];
    screen(t, [
      { at: 0, draw: G => {
        G.save(); clipReg(G, 1);
        lqClouds(G, 1, t, from('a0', 1.2, -1)); lqDisc(G, 1660, 130, 32, LQ.WH, 1);
        for (const [x, s] of [[420, 1.5], [820, 1.9], [1260, 1.6], [1640, 1.3]]) lqHill(G, x, G1, s, LQ.GR, 1 - .7 * from('a1', 1));
        const rulers = [['xianwen', '献文帝', PAL.eXN], ['xiaowen', '孝文帝', PAL.eXW], ['xuanwu', '宣武帝', PAL.eXU], ['xiaoming', '孝明帝', PAL.eXM]];
        rulers.forEach(([f, nm, p], k) => { const a = from('a1', .6, .4 + k * .7); emp(G, 520 + k * 330, G1, S1 * .92, { f, pal: p, ph: k }, a); tag(G, [nm], 520 + k * 330 + 118, 80, 32, a); });
        G.restore(); veil(G, 1, .5 * (1 - from('a1', 1)));
        G.save(); clipReg(G, 2); groundLine(G, G2);
        lqFloor(G, G2, 'earth'); lqClouds(G, 2, t, .6, 3); lqHill(G, 1660, G2, 1.0, LQ.OC, .9); lqTree(G, 330, G2, 1.1, t, 1);
        lqStele(G, 800, G2 - 6, 400, pr('a0') * .55 + from('a1', 4) * .45, t, from('a0', 1.2, .6));
        wom(G, 1230, G2, S2, { f: 'wz86', nun: true, beads: true, pal: PAL.nun, age: 3 }, from('a0', 1.2, 1.5));
        tag(G, ['王钟儿'], 1420, 500, 36, from('a0', .6, 2)); tag(G, ['七百余字', '八十六年'], 500, 500, 32, vis('a0', 'a1'));
        G.restore();
      } },
      { at: T('b0') - .3, draw: G => {
        G.save(); clipReg(G, 1); groundLine(G, G1);
        lqClouds(G, 1, t, 1); lqFloor(G, G1, 'grass'); for (let k = 0; k < 2; k++) lqBanner(G, 1040 + k * 300, G1, .66, t, LQ.BK, 1);
        lqThrone(G, 880, G1, .72, 1); emp(G, 880, G1, S1, { f: 'xuanwu', pal: PAL.eXU }, 1); tag(G, ['文成帝', '平城'], 640, 80, 32, from('b0'));
        for (let k = 0; k < 3; k++) lqHorse(G, mv(1900 + k * 220, 300 + k * 200, T('b1'), 4), G1, .62, t, { ph: k, col: k % 2 ? LQ.WH : LQ.OC, alpha: from('b1') });
        G.restore();
        G.save(); clipReg(G, 2); groundLine(G, G2); lqFloor(G, G2, 'earth');
        wom(G, mv(600, 1100, T('b0'), 5), G2, S2, { f: 'wz24', pal: PAL.wzY }, 1); wom(G, 1400, G2, S2, { f: 'plain', pal: PAL.maid, ph: 2 }, from('b1'));
        tag(G, ['王钟儿', '二十四岁'], 1640, 500, 32, from('b0', .6, 1));
        G.restore();
      } } ],
      { side: { top: { badge: '帝', a: cur.ch === '序' ? '北魏' : '文成帝', b: cur.ch === '序' ? '五十年' : '和平三年' }, bottom: { badge: cur.ch === '序' ? '尼' : '婢', a: cur.ch === '序' ? '慈庆' : '王钟儿', b: cur.ch === '序' ? '八十六岁' : '二十四岁' } },
        year: cur.ch === '序' ? '一九二〇年代' : '公元 四六二 年', chapter: cur.ch });
  } };
})();
