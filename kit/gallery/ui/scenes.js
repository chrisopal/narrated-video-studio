(() => {
const { shot, win, tabBar, field, button, listRow, toggle, panel, cursor, clicks, stateOf, typeIn, typed, spotlight, badge, loading, progress, on, U } = PACK.ui;
// 虚构应用“灯芯清单”：界面坐标 = 镜头 z=1 时的画面坐标
const WX = 260, WY = 110, WW = 1400, WH = 830, LX = 320, LW = 1280, RH = 100, NEW = '给阳台的花浇水';
const FX = 320, FY = 276, FW = 990, FH = 84, BX = 1340, BW = 260, TGX = 1514, TGY = 838;
const ITEMS = [{ s: '晾衣服', done: 1 }, { s: '给自行车打气' }, { s: '整理书桌' }, { s: NEW, add: 1 }];
function miniWin() {   // 封面用：一扇小窗，三行清单
  win(0, 0, 800, 600, { title: '灯芯清单' }, () => {
    field(40, 96, 520, 78, { placeholder: '写下一件事' }); button(580, 96, 180, 78, '添加', {});
    listRow(40, 200, 720, 96, '晾衣服', { checked: 1 }); listRow(40, 296, 720, 96, '整理书桌', {}); listRow(40, 392, 720, 96, NEW, { flash: .8 });
    progress(66, 536, 420, 16, .34); });
  cursor(9, [{ x: 640, y: 470 }], { size: 1.5 });
}
window.FILM = { theme: 'ui', chrome: 'none', chapters: ['打开', '输入', '添加', '勾掉', '全貌'],
  cover: { pill: '风格包样片', title: '活体录屏', line1: '指针、打字、点击', line2: '一镜到底，推近再拉回', tagline: '演示画面 · 应用为虚构',
    art(c, cx, cy, R) { on(c, () => { const s = R * 2 / 800; c.save(); c.translate(cx - R, cy - 300 * s); c.scale(s, s); miniWin(); c.restore(); }); } },
  scenes(t) {
    const A = T('a0'), B = T('a1'), C = T('a2'), D = T('a3'), E = T('a4'), R4 = 388 + 3 * RH;
    const path = [{ x: 1430, y: 800 },
      { t: B + .3, x: 640, y: FY + 46, d: .9, click: true },          // 点进输入框
      { t: C + .2, x: BX + 150, y: FY + 48, d: .8, click: true },     // 点“添加”
      { t: C + 3.3, x: LX + 47, y: R4 + 54, d: 1.0 },                 // 移到新行的勾选框，停住
      { t: D + .5, d: 0, click: true },                               // 再点
      { t: D + 3.1, x: 1010, y: 800, d: .9 },
      { t: E + 2.5, x: TGX + 44, y: TGY + 26, d: .9, click: true },   // 点开关
      { t: E + 4.6, x: 1400, y: 690, d: .9 }];
    const [cF, cAdd, cChk, cTog] = clicks(path), addT = cAdd + .12;
    const cam = [{ x: 760, y: 330, z: 1.4 },
      { t: A + .1, x: 960, y: 540, z: 1, d: 2.4 },
      { t: B + 1.0, x: 960, y: 540, z: 1.24, d: 1.6 },                // 推近输入框
      { t: addT + .3, x: 960, y: 620, z: 1.35, d: 1.5 },               // 平移到列表
      { t: cChk + .2, x: 760, y: 740, z: 2, d: 1.6 },                 // 推近新行
      { t: E + .3, x: 960, y: 540, z: 1, d: 1.6 },                    // 拉回全貌
      { t: E + 4.4, x: 960, y: 535, z: 1.035, d: 4.6 }];
    shot(t, cam, () => {
      win(WX, WY, WW, WH, { title: '灯芯清单', k: eo(seg(t, .15, .85)) }, () => {
        loading(t, WX, WY + 64, WW, { k: seg(t, A - .3, A) * (1 - seg(t, A + 2.3, A + 2.6)) });
        tabBar(LX, 192, ['今天', '本周', '全部'], 0);
        // 输入框和按钮
        const typing = t < addT, ty = { n: typed(t, cF + .9, NEW) };
        const f = field(FX, FY, FW, FH, { placeholder: '写下一件要做的事', focus: eo(seg(t, cF, cF + .2)) * (1 - seg(t, addT, addT + .25)), filled: typing && ty.n > 0 });
        if (typing && t >= cF) typeIn(t, cF + .9, NEW, f.tx, f.ty, { caretFrom: cF });
        button(BX, FY, BW, FH, '添加', { state: typing && ty.n > 0 ? stateOf(t, path, BX, FY, BW, FH) : 'off' });
        // 列表：前三行逐行加载；新行撑开；打开开关后已完成的行收起
        const hide = eio(seg(t, cTog + .1, cTog + .65)); let y = 388;
        ITEMS.forEach((it, i) => {
          const grow = it.add ? eo(seg(t, addT, addT + .4)) : 1, done = it.done || (it.add && t >= cChk), h = RH * grow * (done ? 1 - hide : 1);
          if (h > 4) { g.save(); g.beginPath(); g.rect(LX - 8, y, LW + 16, h); g.clip();
            listRow(LX, y, LW, RH, it.s, { t, k: it.add ? 1 : seg(t, A + .7 + i * .45, A + 1.5 + i * .45), checked: it.done ? 1 : it.add ? seg(t, cChk, cChk + .75) : 0,
              hover: it.add && t < cTog && stateOf(t, path, LX, R4, LW, RH) !== 'idle', flash: it.add ? 1 - seg(t, addT + .5, addT + 1.7) : 0 });
            g.restore(); }
          y += h; });
        // 底栏：进度（示意）和开关
        const fa = eo(seg(t, A + 1.9, A + 2.4)); g.save(); g.globalAlpha *= fa;   // 底栏等列表加载完再出现
        g.fillStyle = U.line; g.fillRect(LX, 808, LW, 2);
        txt('今日进度（示意）', LX, 873, 34, U.dim, 'H5');
        progress(LX + 300, 852, 380, 18, lerp(lerp(1 / 3, 1 / 4, eio(seg(t, addT + .4, addT + 1.2))), 1 / 2, eio(seg(t, cChk + 2.3, cChk + 3.1))));
        toggle(TGX, TGY, eo(seg(t, cTog, cTog + .28)), { label: '隐藏已完成', state: stateOf(t, path, TGX - 200, TGY - 10, 300, 66) });
        g.restore();
        // 提示面板从窗口右沿滑出
        panel(1262, 190, 420, 68, { k: back(seg(t, E + 1.7, E + 2.15)) * (1 - eio(seg(t, E + 5.0, E + 5.5))), from: 'right' }, (x, y) => {
          g.fillStyle = U.a3; g.beginPath(); g.arc(x + 38, y + 34, 9, 0, 7); g.fill(); txt('勾掉了一项', x + 64, y + 46, 34, U.surf, 'H5'); });
      });
      spotlight(t, cF + .3, addT + .5, FX, FY, BX + BW - FX, FH, { pad: 16 });
      spotlight(t, cChk + .6, E + .7, LX, R4, LW, RH, { pad: 6, a: .42 });
      cursor(t, path);
      if (t >= addT) sfx('pop', addT);
    });
    badge('演示画面');
  } };
})();
