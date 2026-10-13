(() => {
// 风格包样片：史书留白（虚构内容，演示版面和画法；不涉及任何史实）
const { RED, INK, DIM, layout, masthead, timebar, place, slogan, stage, slip, calendar, counter, figure, hills, birds, motes, lamp, route, night, moon, torches, seal, coverArt } = PACK.liubai;
const sg = (t, a, d) => cl((t - a) / d);
const LENS = [30, 29, 30, 29, 30, 29, 30, 29, 30, 29, 30, 29], DAYS = [];
[[1, 5, 1, 12], [3, 1, 3, 20], [6, 10, 7, 8], [9, 2, 9, 9], [11, 15, 11, 30]].forEach(([m0, d0, m1, d1]) => { for (let m = m0; m <= m1; m++) for (let d = m === m0 ? d0 : 1; d <= (m === m1 ? d1 : LENS[m - 1]); d++) DAYS.push([m, d]); });
window.FILM = {
  theme: 'liubai', chrome: 'none', chapters: [],
  cover: { pill: '风格包样片', title: '史书留白', line1: '竖屏人物小传', line2: '纸、竹简、朱印', tagline: '虚构内容 · 演示用', art(c, cx, cy, R) { coverArt(c, cx, cy, R, { text: '示意' }); } },
  scenes(t) {
    masthead(t, { rightKeys: [{ at: 0, text: '某年 · 示意' }, { at: T('p4'), text: '次年 · 示意' }] });
    timebar(t, [
      { at: 0, lo: 0, hi: 1, mark: .5, cap: '正月' },
      { at: T('p1') + .3, d: 3.5, lo: 0, hi: 0, fill: 12, mark: 12, cap: '一整年' },
      { at: T('p2'), lo: 5.3, hi: 7.3, mark: 6.3, cap: '六月—七月' },
      { at: T('p3'), lo: 8, hi: 9, mark: 8.5, cap: '九月' },
      { at: T('p4'), lo: 0, hi: 12, mark: 6, cap: '这一年', dim: .3 },
    ], { n: 12, ends: ['正月', '十二月'] });
    place(t, TL.map(s => ({ at: s.t0 - .2, text: s.ch })));
    stage(t, [
      { a: 0, b: T('p1') + .3, tr: 'fade', cam: t => [lerp(1, 1.08, eio(sg(t, 1, 5))), layout().art.cx, layout().art.y + 420], draw(t, A) {
        hills(t, A, { seed: 2, y: A.y + A.h * .86, amp: 80, a: .5 }); birds(t, A, { n: 4, y: A.y + 300 });
        txt('风格包样片', A.cx, A.y + 90, 58, INK, 'SongB', 'center'); txt('虚构内容', A.cx, A.y + 170, 46, RED, 'SongB', 'center');
        slip(t, .4, { x: A.cx, y: A.y + 230, w: 128, h: 480, text: '今日晴', size: 96, rate: 1.4 }); lamp(t, A.x + 170, A.y + A.h - 40, 1.1);
      } },
      { a: T('p1') - .1, b: T('p2') + .3, tr: 'ink', at: [layout().art.x + 60, layout().art.y + 60], draw(t, A) {
        calendar(t, { box: { x: A.x, y: A.y, w: A.w, h: A.h - 70 }, lens: LENS, days: DAYS, t0: T('p1') + .3, dur: 3.5, home: [2, 2, '家'] });
        counter(t, T('p1') + .3, { x: A.x + A.w * .73, y: A.y + A.h - 250, lines: [['在外', DAYS.length, '天']], dur: 3.5 });
        txt('格子示意', A.x + 24, A.y + A.h - 22, 40, DIM, 'SongB', 'left');
      } },
      { a: T('p2') - .1, b: T('p3') + .3, tr: 'scroll', draw(t, A) {
        route(t, T('p2') + .2, { box: A, A: { x: A.x + A.w * .76, y: A.y + 330, name: '甲城', sub: '虚构地名' }, B: { x: A.x + A.w * .24, y: A.y + 540, name: '乙城', sub: '虚构地名' }, trips: 2, dur: 4.6, label: n => `往返 第 ${n} 次 / 共 2 次` });
      } },
      { a: T('p3') - .1, b: T('p4') + .3, tr: 'ink', at: [layout().art.x + 700, layout().art.y + 120], draw(t, A) {
        hills(t, A, { seed: 3, y: A.y + A.h * .7, amp: 110, a: .9 }); night(t, { box: A, a: .92 });
        [0, 1, 2].forEach(i => moon(A.x + A.w * .55 + i * 130, A.y + 110, 34, eo(sg(t, T('p3') + .6 + i * .4, .3))));
        torches(t, T('p3'), { box: A, n: 3 }); slip(t, T('p3') + .2, { x: A.x + 130, y: A.y + 50, w: 118, h: 400, text: '夜行', size: 100, rate: 3 });
      } },
      { a: T('p4') - .1, b: total() + 1, tr: 'fade', draw(t, A) {
        lamp(t, A.x + 560, A.y + A.h - 220, 1.2); figure(t, { x: A.x + 260, y: A.y + A.h - 70, s: 1.3, pose: 'sit' });
        seal(t, T('p4') + 1.2, { x: A.x + A.w - 170, y: A.y + 200, size: 170, text: '留白', big: true });
        txt('示意人物', A.x + 260, A.y + A.h - 22, 40, DIM, 'SongB', 'center');
      } },
    ]);
    slogan(t);
  }
};
})();
