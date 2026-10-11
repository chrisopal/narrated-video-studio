(() => {
// 样片《青梧》：宣传线的骨架。无旁白，120 拍/分，17 小节 34 秒，虚构产品。演示四件事：
//   ① 所有换镜头都用 beatT / barT 取时刻（检查的“镜头节奏”会数有几次不在拍点上）；
//   ② 快慢对比：开头一拍一屏连切七次，亮相前空两拍蓄力，卖点一小节一屏，片尾停两小节；
//   ③ 一拍一屏最多三个字，半小节一屏不超过八个字（宣传线的阅读时长按扫一眼算）；
//   ④ 界面是重画的示意，角上一直标“演示画面”；数字标“示意数据”；口号在最后三成里留够时间。
const { screens, slam, sub, countBig, bar, on, RATIO, ACC, BLK, WHT } = PACK.kinetic;
const { shot, win, button, listRow, badge, progress, U } = PACK.ui;
const B = n => beatT(n), BIG = 380, SM = Math.round(BIG / RATIO), CX = W / 2;
const word = (t, t0, s, o = {}) => slam(t, t0, s, { x: CX, y: 640, sz: BIG, al: 'center', d: .1, ...o });
// 卖点题卡：序号 + 四个字
function point(t, t0, n, s) { countBig(t, t0, n, { x: 140, y: 370, sz: 250, pad: 2, from: 'down' }); slam(t, t0 + .12, s, { x: 132, y: 730, sz: 340, from: 'left' }); bar(t, t0 + .5, { x: 140, y: 800, w: 900, h: 26 }); }
// 演示画面：虚构应用的一扇窗。rows 一行一拍地出来；close 时镜头推在列表上
const WX = 260, WY = 120, WW = 1400, WH = 800, LX = 330, LW = 1260, RH = 104;
function demo(t, t0, title, rows, o = {}) {
  const k0 = o.close ? { x: 820, y: 520, z: 1.5 } : { x: 960, y: 540, z: 1 };
  shot(t, [k0, { t: t0, x: k0.x + (o.close ? 60 : 0), y: k0.y, z: k0.z + .07, d: 2.2 }], () => {
    win(WX, WY, WW, WH, { title: '青梧', k: 1 }, () => {
      txt(title, LX, WY + 150, 50, U.ink, 'H9');
      rows.forEach((r, i) => { const at = t0 + (r.at ?? i) * .5 - (o.close ? 9 : 0);
        listRow(LX, WY + 200 + i * RH, LW, RH, r.s, { t, k: seg(t, at, at + .18), checked: r.done != null ? seg(t, t0 + r.done * .5, t0 + r.done * .5 + .2) : 0, flash: 1 - seg(t, at + .1, at + .6) }); });
      if (o.send != null) { const dn = t >= t0 + o.send * .5; button(LX, WY + 640, 300, 86, dn ? '已发出' : '发给参会人', { state: dn && t < t0 + o.send * .5 + .18 ? 'down' : dn ? 'off' : 'idle' });
        if (dn) { sfx('ding', t0 + o.send * .5); txt('6 人已收到', LX + 340, WY + 698, 44, U.a2, 'H9', 'left', eo(seg(t, t0 + o.send * .5, t0 + o.send * .5 + .2))); } }
      if (o.bar) progress(LX, WY + 700, LW, 14, eo(seg(t, t0, t0 + 3.4)));
    }); });
  badge('演示画面');
}
const NOTES = [{ s: '结论：十月十五日上线' }, { s: '分歧：先做导出，还是先做搜索' }, { s: '决定：先做导出' }, { s: '下次会：周四上午十点' }];
const TODOS = [{ s: '导出功能 · 负责人甲 · 周三前', done: 5 }, { s: '搜索方案 · 负责人乙 · 周五前', done: 6 }, { s: '通知客户 · 负责人丙 · 今天', done: 7 }];
window.FILM = { theme: 'kinetic', chrome: 'none', chapters: ['痛点', '亮相', '卖点一', '卖点二', '卖点三', '证明', '口号'],
  cover: { pill: '样片 · 宣传线', title: '青梧', line1: '开完会', line2: '就下班', tagline: '虚构产品 · 34 秒 · 卡点',
    art(c, cx, cy, R) { R *= .84; c.fillStyle = ACC; c.fillRect(cx - R, cy - R, 2 * R, 2 * R); on(c, () => { bar(9, 0, { x: cx - R * .6, y: cy - R * .34, w: R * 1.2, h: R * .12, col: BLK }); bar(9, 0, { x: cx - R * .6, y: cy - R * .06, w: R * .9, h: R * .12, col: BLK }); bar(9, 0, { x: cx - R * .6, y: cy + R * .22, w: R * .5, h: R * .12, col: WHT }); }); } },
  scenes(t) {
    const tag = (pal) => txt('示意数据 · 产品为虚构', CX, 930, 34, pal.dim, 'H7', 'center');
    screens(t, [
      // 痛点（2 小节）：一拍一屏连切六次，最后半小节停在一个问题上
      { at: 0, bg: 'black', fn: () => word(t, B(0), '开会') },
      { at: B(1), bg: 'paper', fn: () => word(t, B(1), '一小时') },
      { at: B(2), bg: 'black', fn: () => word(t, B(2), '整理') },
      { at: B(3), bg: 'paper', fn: () => word(t, B(3), '两小时') },
      { at: B(4), bg: 'accent', fn: () => word(t, B(4), '还漏了') },
      { at: B(5), bg: 'black', fn: () => word(t, B(5), '三件事') },
      { at: B(6), bg: 'paper', fn: () => word(t, B(6), '谁来记？', { sz: 420 }) },
      // 亮相（2 小节）：先空一小节蓄力，只有一个点跟着拍子跳；小节线上砸出名字
      { at: B(8), bg: 'black', fn: () => { const p = pulse(t, { decay: .22 }); g.fillStyle = ACC; g.beginPath(); g.arc(CX, 540, 16 + 26 * p, 0, 7); g.fill(); } },
      { at: B(12), bg: 'accent', fn: () => { slam(t, B(12), '青梧', { x: CX, y: 610, sz: 480, al: 'center', hit: true }); sub(t, B(13), '散会那一刻，纪要就到', { x: CX, y: 830, sz: 110, al: 'center' }); } },
      // 卖点一（3 小节）：题卡一小节，演示两小节（第二小节切近景）
      { at: B(16), bg: 'paper', fn: () => point(t, B(16), 1, '自动成稿') },
      { at: B(20), bg: 'black', fn: () => demo(t, B(20), '周会纪要', NOTES, { bar: true }) },
      { at: B(24), bg: 'black', fn: () => demo(t, B(24), '周会纪要', NOTES, { close: true }) },
      // 卖点二（3 小节）
      { at: B(28), bg: 'black', fn: () => point(t, B(28), 2, '待办到人') },
      { at: B(32), bg: 'black', fn: () => demo(t, B(32), '待办 3 项', TODOS.map(r => ({ s: r.s }))) },
      { at: B(36), bg: 'black', fn: () => demo(t, B(32), '待办 3 项', TODOS, { close: false }) },
      // 卖点三（2 小节）：题卡一小节，按下去一小节
      { at: B(40), bg: 'accent', fn: () => point(t, B(40), 3, '一键发出') },
      { at: B(44), bg: 'black', fn: () => demo(t, B(44), '待办 3 项', TODOS.map(r => ({ s: r.s, at: -9, done: -9 })), { send: 2 }) },
      // 证明（2 小节）：三个数，前两个各半小节，第三个停一小节；数字是示意，角标一直在
      { at: B(48), bg: 'paper', fn: p => { countBig(t, B(48), 3, { x: CX - 60, y: 700, sz: 560, pad: 1, al: 'right' }); sub(t, B(48) + .1, '分钟出纪要', { x: CX, y: 690, sz: 120 }); tag(p); } },
      { at: B(50), bg: 'black', fn: p => { countBig(t, B(50), 0, { x: CX - 60, y: 700, sz: 560, pad: 1, al: 'right' }); sub(t, B(50) + .1, '条遗漏', { x: CX, y: 690, sz: 120 }); tag(p); } },
      { at: B(52), bg: 'paper', fn: p => { countBig(t, B(52), 6, { x: CX - 60, y: 700, sz: 560, pad: 1, al: 'right' }); sub(t, B(52) + .1, '人同时收到', { x: CX, y: 690, sz: 120 }); tag(p); } },
      // 口号（3 小节）：口号砸一小节，品牌和口号一起停两小节
      { at: B(56), bg: 'accent', fn: () => { slam(t, B(56), '开完会，就下班', { x: CX, y: 620, sz: 250, al: 'center', hit: true }); bar(t, B(57), { x: CX - 620, y: 690, w: 1240, h: 30, from: 'center', col: BLK }); } },
      { at: B(60), bg: 'black', fn: p => { slam(t, B(60), '青梧', { x: CX, y: 580, sz: 360, al: 'center', hit: true }); sub(t, B(61), '开完会，就下班', { x: CX, y: 730, sz: 100, al: 'center', col: ACC });
        txt('会议纪要助手', CX, 830, 52, p.dim, 'H7', 'center', eo(seg(t, B(62), B(62) + .3))); txt('虚构产品 · 仅作样片', CX, 930, 34, p.dim, 'H7', 'center');
        const q = pulse(t, { decay: .22 }), r = (beatAt(t) / 2) % 1; g.fillStyle = ACC; g.beginPath(); g.arc(CX, 170, 10 + 12 * q, 0, 7); g.fill();
        g.strokeStyle = ACC; g.lineWidth = 10 * (1 - r); g.globalAlpha = .7 * (1 - r); g.beginPath(); g.arc(CX, 170, 30 + 900 * eo(r), 0, 7); g.stroke(); g.globalAlpha = 1; } },   // 亮相前那个点回来了：每拍跳一下，每两拍荡开一圈，一直到片尾
    ]);
  } };
})();
