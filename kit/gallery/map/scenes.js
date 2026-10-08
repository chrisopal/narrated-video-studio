(() => {
const { layer, ss } = PACK.ink, { scholar } = PACK.figures, { makeMap } = PACK.map;
const M = makeMap({ title: '苏子行迹图', start: '眉山', main: ['眉山', '汴京', '黄州', '惠州', '儋州'] });
M.leg([{ p: '眉山' }, { p: '成都', lab: '成都' }, { p: [105.0, 31.5] }, { p: [106.4, 32.95] }, { p: '长安', lab: '长安' }, { p: [111.5, 34.7] }, { p: '汴京' }], ['嘉祐元年 出蜀赴京', '次年 兄弟同榜进士'], '一〇五六');
M.leg([{ p: '汴京' }, { p: [114.7, 33.4] }, { p: '黄州', lab: '黄州 · 一〇八〇' }, { p: [115.5, 28.5] }, { p: '虔州', lab: '虔州' }, { p: '惠州', lab: '惠州 · 一〇九四' }, { p: '雷州' }, { p: '儋州', sea: true }], ['乌台之后 一路向南', '六十二岁 渡海到儋州'], '一〇九七');
const who = (G, x, y, o) => o.mode === 'sea' ? PACK.ink.drawBoat(G, x, y + 4, .42, o.t, false, o.alpha, false) : scholar(G, x, y - 2, .27, o.t, { pose: o.mode === 'stand' ? 'stand' : 'walk', age: 1, face: o.face, alpha: o.alpha, staff: o.mode !== 'stand', pace: 3.2 });
window.FILM = { theme: 'songink', chrome: 'none', chapters: ['引', '出蜀', '南迁', '终'], cover: { pill: '样片', title: '行迹地图', line1: '', line2: '', tagline: '', art() {} },
  scenes(t) {
    layer(t, T('i0') - 1, N('i0') + .8, (G, u) => M.draw(G, u, 7.8, { intro: '眉山', cap: ['北宋 眉州眉山', '苏轼 生于斯'], year: '一〇三七', traveler: who }));
    layer(t, T('l0') - .8, N('l0') + .8, (G, u) => M.draw(G, u, 10.6, { leg: 0, traveler: who, seal: true }));
    layer(t, T('l1') - .8, N('l1') + .8, (G, u) => M.draw(G, u, 11.6, { leg: 1, traveler: who, seal: true }));
    layer(t, T('z0') - .8, N('z0') + 3, (G, u) => M.draw(G, u, 12, { all: true, cap: ['身行万里半天下'], year: '苏轼' }));
  } };
})();
