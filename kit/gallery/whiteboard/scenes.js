(() => {
const { board, fit, write, sketchPath, sketchLine, sketchArrow, sketchBox, sketchCircle, underline, on } = PACK.whiteboard;
const BW = 3680, BH = 1700;                       // 白板比画面大好几倍（白板坐标）
const R2 = 750, R3 = 1260;                        // 第二排、第三排的中线
// 一个带字的框：先画框，再写字；返回写完的时刻
function box(t, t0, cx, cy, w, h, s, sz = 116) { const e = sketchBox(t, t0, cx - w / 2, cy - h / 2, w, h, { d: .8 }); return write(t, e + .1, s, cx, cy + sz * .36, sz, { al: 'center' }); }
window.FILM = { theme: 'whiteboard', chrome: 'none', chapters: ['提问', '原因', '拆开', '第一步', '全图'],
  cover: { pill: '样片', title: '白板手写', line1: '说一句，写一句', line2: '最后拉远看全图', tagline: '风格包 whiteboard',
    art(c, cx, cy, R) { on(c, () => { const t = 99;
      sketchBox(t, 0, cx - R, cy - R * .75, R * .9, R * .5, { lw: 9 }); sketchArrow(t, 0, cx - R * .55, cy - R * .2, cx - R * .1, cy + R * .3, { lw: 9, bow: 10 });
      sketchBox(t, 0, cx - R * .1, cy + R * .1, R * 1.0, R * .55, { lw: 9 }); sketchCircle(t, 0, cx + R * .4, cy + R * .38, R * .7, R * .45, { lw: 10 });
      underline(t, 0, cx - R * .9, cy - R * .92, R * .8, { lw: 9 }); sketchPath(t, 0, [[cx + R * .5, cy - R * .5], [cx + R * .62, cy - R * .36], [cx + R * .9, cy - R * .74]], { lw: 10, col: PACK.whiteboard.ACC }); }); } },
  scenes(t) {
    const a0 = T('a0'), a1 = T('a1'), a2 = T('a2'), a3 = T('a3'), a4 = T('a4');
    board(t, [
      { t: 0, x: 1060, y: 560, z: 1 },
      { t: a1 + .5, x: 1540 },                    // 每次只移四分之一个画宽，跟着笔走
      { t: a1 + 3.6, x: 2020 },
      { t: a2 + .1, y: 1040 },
      { t: a2 + 2.3, x: 2500 },
      { t: a3 + .5, x: 2020 },
      { t: a3 + 1.5, x: 1540 },
      { t: a3 + 4.3, x: 1160 },
      fit(-40, -40, BW + 40, BH + 80, { t: a4 + .9, d: 1.8 }),   // 最后拉远：整块白板是一张完整的图
    ], () => {
      let e;
      // a0 提问：写题目，强调色划线，第一个框
      e = write(t, .35, '一件大事，怎么开始？', 220, 400, 150, { rate: .15 });
      underline(t, e + .15, 975, 446, 740, { double: true, d: .7 });
      box(t, a0 + 1.7, 560, R2, 600, 260, '事情太大');
      // a1 原因：箭头带着镜头走，一环扣一环
      e = sketchArrow(t, a1 + .4, 892, R2, 1188, R2);
      e = box(t, a1 + 1.3, 1520, R2, 600, 260, '无从下手');
      sketchPath(t, e + .15, [[1560, 560], [1600, 520], [1650, 560], [1600, 592], [1640, 520], [1710, 548], [1670, 596], [1730, 540], [1790, 560]], { smooth: true, lw: 6, d: .7 });   // 一团乱线
      e = sketchArrow(t, a1 + 3.6, 1852, R2, 2148, R2);
      e = box(t, a1 + 4.4, 2480, R2, 600, 260, '拆成小块');
      // a2 拆开：往下分出三小块
      [2200, 2510, 2820].forEach((x, i) => {
        const a = sketchArrow(t, a2 + .15 + i * .95, 2480 + (i - 1) * 120, 902, x, 1128, { d: .3, lw: 6 });
        const b = sketchBox(t, a + .03, x - 120, R3 - 110, 240, 220, { d: .36 });
        write(t, b + .02, '甲乙丙'[i], x, R3 + 42, 116, { al: 'center', rate: .2 });
      });
      write(t, a2 + 3.25, '每块都很小', 3000, R3 + 30, 84, { rate: .12 });
      // a3 第一步：回头只拿第一块，强调色圈出
      sketchArrow(t, a3 + .5, 2060, R3, 1762, R3, { d: .6 });
      e = box(t, a3 + 1.7, 1380, R3, 700, 260, '先做甲这块');
      e = sketchCircle(t, e + .2, 1380, R3, 430, 196, { d: .8 });
      e = write(t, a3 + 4.8, '这就开始了', 330, R3 + 36, 100, { col: TH.a1, rate: .13 });
      sketchArrow(t, a3 + 4.4, 950, R3 + 20, 852, R3 + 10, { col: TH.a1, d: .25 });
      // a4 全图：拉远之后，用强调色把答案连回问题
      e = sketchArrow(t, a4 + 3.0, 300, 1150, 232, 470, { col: TH.a1, via: [[150, 1000], [130, 700]], dash: [34, 26], d: 1.3, lw: 9, head: 70 });
      e = sketchPath(t, e + .2, [[1800, 350], [1840, 400], [1930, 280]], { col: TH.a1, lw: 11, d: .35 });
      underline(t, a4 + 5.1, 334, R3 + 62, 500, { lw: 9, d: .6 });
    }, { w: BW, h: BH });
  } };
})();
