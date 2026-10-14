(() => {
// 组件包样片：古代人物库（示意人物，不是考据复原）
const { person, PRESETS } = PACK.renwu;
const sg = (t, a, d) => cl((t - a) / d);
const PAGES = [
  ['han.official', 'han.clerk', 'han.scholar', 'han.woman', 'han.soldier', 'wei.official', 'wei.palace', 'wei.nun', 'tang.official', 'tang.lady', 'tang.poet'],
  ['song.official', 'song.scholar', 'song.woman', 'ming.official', 'ming.scholar', 'ming.woman', 'qing.official', 'qing.commoner', 'qing.woman'],
  ['farmer', 'peasant_woman', 'merchant', 'monk', 'daoist', 'general'],
  ['child', 'elder', 'old_woman', 'emperor', 'eunuch', 'prisoner', 'servant'],
];
const POSES = [['stand', '站'], ['hu', '执笏'], ['bow', '作揖'], ['walk', '走'], ['point', '指'], ['kneel', '跪坐'], ['write', '跪坐书写'], ['sit', '坐凳'], ['carry', '挑担']];
function grid(t, items, t0) {
  const per = 6, rows = Math.ceil(items.length / per);
  items.forEach((it, i) => { const r = Math.floor(i / per), cIdx = i % per, n = Math.min(per, items.length - r * per);
    const x = W / 2 + (cIdx - (n - 1) / 2) * 300, y = rows === 1 ? 760 : 470 + r * 470, a = eo(sg(t, t0 + i * .08, .4));
    g.save(); g.globalAlpha *= a; person(t, { x, y, s: .78, ...it }); g.restore();
    txt((it.label || PRESETS[it.preset].label).replace(/（.*）/, ''), x, y + 46, 32, TH.ink, 'SongB', 'center', a); });
}
window.FILM = {
  theme: 'liubai', chrome: 'label', chapters: ['汉、北魏、唐', '宋、明、清', '平民、僧道、武人', '老少、帝王、犯人', '动作', '表情与卧病'],
  cover: { pill: '组件包样片', title: '古代人物库', line1: '六个朝代', line2: '三十个身份', tagline: '示意人物 · 演示用', art(c, cx, cy, R) { PACK.renwu.on(c, () => PACK.renwu.person(0, { x: cx, y: cy + R * .9, s: R / 260, preset: 'tang.lady' })); } },
  scenes(t) {
    PAGES.forEach((pg, i) => scn(t, T('p' + i), N('p' + i), () => grid(t, pg.map(p => ({ preset: p })), T('p' + i))));
    scn(t, T('p4'), N('p4'), () => grid(t, POSES.map(([p, l]) => ({ preset: p === 'carry' ? 'farmer' : 'han.clerk', pose: p, t0: T('p4') + .5, facing: p === 'walk' ? 1 : 1, label: l, props: p === 'write' ? [] : undefined })), T('p4')));
    scn(t, T('p5'), N('p5'), () => grid(t, [
      { preset: 'song.scholar', face: 'calm', label: '平静' }, { preset: 'song.scholar', face: 'smile', label: '笑' }, { preset: 'song.scholar', face: 'sad', label: '愁' },
      { preset: 'song.scholar', face: 'tired', label: '倦' }, { preset: 'song.scholar', face: 'closed', label: '闭眼' }, { preset: 'han.clerk', pose: 'lie', label: '卧病', s: .6 }], T('p5')));
    txt('示意人物，不是考据复原', W - 64, 120, 32, TH.dim, 'SongB', 'right');
  }
};
})();
