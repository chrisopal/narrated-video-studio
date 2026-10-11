(() => {
// 样片：口播版式。没有带真实口播（仓库里不放视频素材），角上是占位的人像框，句子是无旁白段落，所以也没有字幕。
// 真片子里把 brief 写成 "mode":"talk"，运行 build.py talk，时刻换成 T('句id')、at('句id','词')，stage 的 clip 用缺省的 'talk'，FILM 里的 subs 就会画出跟着原话走的大字幕。
// 同一份场景出竖版（talk）和横版（talk_wide）。
const { stage, swap, label, tiles, big, steps3, rows, verdict, caption, hexA } = PACK.talk;
const OPT = { side: 'left', clip: null };
window.FILM = { theme: 'talk', chrome: 'none', subs: t => caption(t, OPT), chapters: ['观点', '及格', '三层', '结论'],
  cover: { pill: '风格包样片', title: '口播版式', line1: '人在角上', line2: '画面跟着话走', tagline: '横版竖版共用一份场景', name: '示意', credit: '',
    art(c, cx, cy, R) { c.fillStyle = '#0b7a6e'; [0, 1, 2].forEach(i => { c.globalAlpha = .35 + .3 * i; c.fillRect(cx - R * (.8 - i * .2), cy + R * (.35 - i * .4), R * (1.6 - i * .4), R * .3); }); c.globalAlpha = 1; } },
  scenes(t) {
    const A = T('a1'), B = T('a2'), C = T('a3'), D = T('a4'), E = T('a5');
    stage(t, { ...OPT, name: '样片', topic: 'AI 与设计 · 判断力', tag: '出镜人',
      title: ['AI 能不能替代审美', '它替代的是最便宜的那部分'],
      steps: [{ label: '观点', at: 0 }, { label: '及格', at: A }, { label: '三层', at: C }, { label: '结论', at: E }],
      points: [{ at: 4.2, text: '替代的是最便宜的部分' }, { at: B + 3, text: '挑不出毛病只是及格' }, { at: C + 7, text: '审美有三层' }, { at: E + 3.4, text: '稀缺的是敢拍板' }] },
    R => swap(t, R, [
      { at: 0, fn: R => big(t, R, 1, ['AI 能不能', '替代审美？'], { hl: ['审美'], gap: .5 }) },
      { at: 3.2, fn: R => big(t, R, 3.3, ['它能替代的', '是最便宜的那部分'], { hl: ['最便宜'], gap: .9 }) },
      { at: A, fn: R => tiles(t, R, [
          { at: A + 2, title: '构图工整', draw(x, y, w, h, k) { g.strokeStyle = TH.a1; g.lineWidth = 4; const s = Math.min(w, h) * .7, x0 = x + (w - s) / 2, y0 = y + (h - s) / 2; g.strokeRect(x0, y0, s, s); g.globalAlpha = k; g.beginPath(); [1, 2].forEach(i => { g.moveTo(x0 + s * i / 3, y0); g.lineTo(x0 + s * i / 3, y0 + s); g.moveTo(x0, y0 + s * i / 3); g.lineTo(x0 + s, y0 + s * i / 3); }); g.stroke(); } },
          { at: A + 3.2, title: '配色舒服', draw(x, y, w, h, k) { const s = Math.min(w / 3.4, h * .5); ['#0b7a6e', '#e9c46a', '#d9512c'].forEach((c, i) => { g.globalAlpha = cl(k * 3 - i); g.fillStyle = c; g.beginPath(); g.arc(x + w / 2 + (i - 1) * s * .8, y + h / 2, s / 2, 0, 7); g.fill(); }); } },
          { at: A + 4.4, title: '挑不出毛病', icon: 'check' }],
          { label: '它为什么看起来很厉害', head: '一张海报，十秒钟', headAt: A + .8 }) },
      { at: B, fn: R => verdict(t, R, { label: '但是，问题在这里', bad: [{ at: B + .8, text: '挑不出毛病', icon: 'check' }, { at: B + 1.8, text: '不等于好看', icon: 'eye' }], good: { at: B + 3, text: ['挑不出毛病', '只是及格'], icon: 'bulb' } }) },
      { at: C, fn: R => steps3(t, R, [
          { at: C + 1, title: '规矩', sub: '对齐、留白、配色不打架' },
          { at: C + 3.6, title: '选择', sub: '十个方案，敢删掉哪九个' },
          { at: C + 6.2, title: '判断', sub: '放在此时此地，对不对' }], { label: '审美其实是三层' }) },
      { at: D, fn: R => rows(t, R, [
          { at: D + .6, title: '规矩', sub: 'AI 最擅长', icon: 'check', tags: [{ at: D + 1.1, text: '对齐' }, { at: D + 1.4, text: '留白' }, { at: D + 1.7, text: '配色' }] },
          { at: D + 2.4, title: '选择', sub: '能帮你出选项', icon: 'layers', tags: [{ at: D + 2.9, text: '十个方案' }, { at: D + 3.3, text: '删哪九个' }] },
          { at: D + 4.2, title: '判断', sub: '没法替你负责', icon: 'person', tags: [{ at: D + 4.8, text: '此时此地' }, { at: D + 5.2, text: '对不对' }] }], { label: 'AI 能做到哪一层' }) },
      { at: E, fn: R => { const R2 = label(t, E, R, '我的结论'); big(t, R2, E + .8, ['及格线抬高了', '稀缺的是敢拍板'], { hl: ['拍板'], gap: 2 }); } },
    ]));
  } };
})();
