(() => {
// 组件包样片：古代人物库 · 图片版（renwu_img.py 生成的示意人物，不是考据复原）
const { RED, INK, DIM, layout, masthead, timebar, place, slogan, stage, slip, hills, birds, lamp, seal } = PACK.liubai;
const { portrait, has, PRESETS } = PACK.renwu;
const sg = (t, a, d) => cl((t - a) / d);
const IDS = ['han.clerk', 'wei.nun', 'tang.lady', 'qing.official'];
const short = id => PRESETS[id].label.replace(/（.*）/, '');
function row(t, A, style, t0) {
  IDS.forEach((id, i) => { const x = A.x + A.w * (i + .5) / 4, y = A.y + A.h - 170;
    portrait(t, { id, style, x, y, h: 600, t0: t0 + i * .25, enter: 'rise' });
    txt(short(id), x, y + 60, 40, INK, 'SongB', 'center', eo(sg(t, t0 + i * .25 + .3, .4))); });
  txt('示意人物', A.cx, A.y + A.h - 30, 40, DIM, 'SongB', 'center');
}
window.FILM = {
  theme: 'liubai', chrome: 'none', chapters: [],
  scenes(t) {
    masthead(t, { rightKeys: [{ at: 0, text: '人物库 · 图片版' }] });
    timebar(t, [
      { at: 0, lo: 0, hi: 1, mark: .5, cap: '汉' },
      { at: T('p0') + 1.6, lo: 1, hi: 2, mark: 1.5, cap: '北魏' },
      { at: T('p0') + 3.2, lo: 2, hi: 3, mark: 2.5, cap: '唐' },
      { at: T('p0') + 4.6, lo: 4, hi: 5, mark: 4.5, cap: '清' },
    ], { n: 5, ends: ['汉', '清'] });
    place(t, TL.map(s => ({ at: s.t0 - .2, text: s.ch })));
    stage(t, [
      { a: 0, b: T('p1') + .3, tr: 'fade', draw(t, A) { row(t, A, 'mu', .3); } },
      { a: T('p1') - .1, b: T('p2') + .3, tr: 'ink', draw(t, A) { row(t, A, '3d', T('p1') + .2); } },
      { a: T('p2') - .1, b: T('p3') + .3, tr: 'scroll', cam: t => [lerp(1, 1.06, eio(sg(t, T('p2'), 6))), layout().art.cx, layout().art.y + 500], draw(t, A) {
        hills(t, A, { seed: 4, y: A.y + A.h * .8, amp: 90, a: .55 }); birds(t, A, { n: 3, y: A.y + 260 });
        portrait(t, { id: 'han.clerk', x: A.x + A.w * .36, y: A.y + A.h - 80, h: A.h - 120, t0: T('p2') + .2, enter: 'ink', tone: .15 });
        slip(t, T('p2') + 1.2, { x: A.x + A.w * .78, y: A.y + 150, w: 120, h: 470, text: '奉檄', size: 96, rate: 1.6 });
        txt('示意人物', A.x + A.w * .36, A.y + A.h - 30, 40, DIM, 'SongB', 'center');
      } },
      { a: T('p3') - .1, b: total() + 1, tr: 'fade', draw(t, A) {
        lamp(t, A.x + A.w * .5, A.y + A.h - 260, 1.1);
        const y = A.y + A.h - 170;
        portrait(t, { id: 'tang.lady', style: '3d', x: A.x + A.w * .24, y, h: Math.min(720, A.h - 230), t0: T('p3') + .2 });
        portrait(t, { id: 'song.scholar', x: A.x + A.w * .76, y, h: Math.min(720, A.h - 230), t0: T('p3') + .7 });
        txt('有图', A.x + A.w * .24, y + 60, 40, INK, 'SongB', 'center', eo(sg(t, T('p3') + .5, .4)));
        txt(has('song.scholar') ? '有图' : '没图 · 用线描', A.x + A.w * .76, y + 60, 40, RED, 'SongB', 'center', eo(sg(t, T('p3') + 1, .4)));
        seal(t, T('p3') + 1.6, { x: A.cx, y: A.y + 110, size: 120, text: '示意' });
      } },
    ]);
    slogan(t);
  }
};
})();
