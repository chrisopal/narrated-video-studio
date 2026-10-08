(() => {
const { stick, beats, say, emote, prop, hold, on } = PACK.stick;
const FL = 900, SX = 1080, MX = 860, SC = 1.1;            // 地面、灶台、“我”的站位、人物大小
// 厨房：灶台 + 锅 + 墙上的钟；返回锅沿高度
function kitchen(t, pot, clock) {
  prop('floor', W / 2, FL, { w: 1700 });
  if (clock != null) prop('clock', 1500, 300, { r: 64, time: clock, t });
  const st = prop('stove', SX, FL, { w: 340, h: 120, fire: true, t });
  return prop('pot', SX, st.top, { w: 230, h: 110, t, ...pot }).rim;
}
window.FILM = { theme: 'stick', chrome: 'none', chapters: ['信心满满', '先下了再说', '糊成一团', '愣住', '学会等水开'],
  cover: { pill: '样片', title: '简笔角色故事', line1: '我第一次自己煮面', line2: '水没开，面先下了', tagline: '风格包 stick · 一句一镜，姿势到姿势',
    art(c, cx, cy, R) { on(c, () => {
      const st = prop('stove', cx + R * .42, cy + R * 1.1, { w: 300, h: 120, fire: true, t: 0, s: 1.25 });
      prop('pot', cx + R * .42, st.top, { w: 210, h: 100, noodles: 'clump', hot: true, s: 1.25 });
      const me = stick(99, cx - R * .62, cy + R * 1.1, { pose: 'shrug', face: 'blank', scale: 1.35 });
      emote(99, 0, 'dots', me.head[0], me.head[1] - 120, { s: 1.2 });
      emote(99, 0, 'sweat', me.head[0] - 100, me.head[1] - 10, { s: 1.4 });
    }); } },
  scenes(t) {
    const a0 = T('a0'), a1 = T('a1'), a2 = T('a2'), a3 = T('a3'), a4 = T('a4');
    beats(t, [
      // a0 信心满满：全景。举起一把面，“这有什么难的”
      { at: 0, fn: () => {
        const show = a0 + 1.5, aim = a0 + 3.7;
        kitchen(t, {}, 3);
        const me = stick(t, MX - 60, FL, { scale: SC, pose: [[0, 'stand'], [show, 'raise'], [aim, 'point']], face: [[0, 'smug'], [aim, 'smile']], talk: [[show + .1, show + 1]] });
        if (t < show) prop('noodles', me.hand[0] + 6, me.hand[1] + 4, { rot: 1.25, s: .8, hot: true });
        else if (t < aim) { const nx = me.hand[0] + 16, ny = me.hand[1] - 84; prop('noodles', nx, ny, { rot: -1.3, s: .9, hot: true }); emote(t, show, 'spark', nx, ny, { s: 1.15 }); }
        else prop('noodles', me.hand[0] + 50, me.hand[1], { s: .8, hot: true });
        say(t, a0 + .2, '我第一次自己煮面', 760, 200, { mode: 'line', sz: 72 });
        say(t, show + .1, '这有什么难的', 430, 400, { to: me });
      } },
      // a1 先下了再说：中景。水面平静，面直接下锅；抱着胳膊等，墙上的钟一格一格跳
      { at: a1, cam: { x: 1010, y: 540, z: 1.3 }, fn: () => {
        const down = a1 + 1.3;
        kitchen(t, { noodles: t >= down ? 'stick' : null }, [[0, 3], [a1 + 3.3, 3.25], [a1 + 4.4, 3.5]]);
        const me = stick(t, MX + 70, FL, { scale: SC, pose: [[0, 'drop'], [down, 'stand'], [a1 + 2.6, 'fold']], face: [[0, 'plain'], [down, 'smug']], talk: [[down + .1, down + .9]] });
        if (t < down) prop('noodles', me.hand[0] + 4, me.hand[1] + 58, { rot: Math.PI / 2, s: .7, hot: true });
        say(t, a1 + .25, '水还没开，我就下了面', 1010, 230, { mode: 'line', sz: 56 });
        say(t, down + .1, '差不多吧', 600, 440, { to: me, sz: 46 });
      } },
      // a2 糊成一团：近景。水开了，面已经粘成一整坨（强调色）；探头一看，慌了
      { at: a2, cam: { x: 1010, y: 560, z: 1.6 }, fn: () => {
        const see = a2 + 1.2;
        kitchen(t, { noodles: 'clump', hot: true, boil: .6 });
        const me = stick(t, MX + 10, FL, { scale: SC, pose: [[0, 'peek'], [see, 'panic']], face: [[0, 'plain'], [see, 'shock']], talk: [[see + .1, see + 1.1]] });
        emote(t, see, 'sweat', me.head[0] - 100, me.head[1] - 40, { s: 1.1 });
        say(t, see + .1, '怎么粘成一坨了！', 1180, 330, { mode: 'shout', sz: 42 });
      } },
      // a3 愣住：包袱。一双筷子把整坨面提了起来；三个点出完，啪地切近、定住 1.6 秒
      { at: a3, cam: { x: 1000, y: 540, z: 1.45 }, fn: () => {
        const up = a3 + .9, punch = up + .6;
        const thaw = hold(t, punch, 1.6, tt => {
          kitchen(tt, { noodles: tt >= up ? null : 'clump', hot: true, boil: tt >= up ? 0 : .6 });
          const me = stick(tt, MX + 20, FL, { scale: SC, pose: [[0, 'drop'], [up, 'lift']], face: [[0, 'plain'], [up, 'blank']] });
          const tip = tt >= up ? [me.hand[0] + 100, me.hand[1] - 120] : [SX - 10, 620];
          prop('chopsticks', me.hand[0], me.hand[1], { to: tip });
          if (tt >= up) prop('noodles', tip[0] + 20, tip[1] + 62, { kind: 'clump', w: 190, h: 130, hot: true });
          emote(tt, up, 'dots', me.head[0] - 6, me.head[1] - 112);
          emote(tt, up + 2.7, 'sweat', me.head[0] - 76, me.head[1] - 24);
        }, { x: 1100, y: 545, z: .1, lines: true, r: 110, span: [-2.5, .35] });
        say(t, punch, '……它是一整块。', 1000, 250, { mode: 'line', sz: 56, cps: 40 });
      } },
      // a4 学会等水开：全景，回到第一镜的取景。坐着等，水开了才下面，端出一碗
      { at: a4, fn: () => {
        const stand = a4 + 2.7, bowl = a4 + 4.0;
        kitchen(t, { boil: t < a4 + 1.2 ? 0 : t < a4 + 2.0 ? .5 : 1, noodles: t >= stand + .5 && t < bowl ? 'stick' : null }, [[0, 4], [a4 + 1.0, 4.25], [a4 + 2.0, 4.5]]);
        let me;
        if (t < stand) { const sl = prop('stool', 640, FL, { h: 80 }); me = stick(t, 640, sl.top, { seat: true, scale: SC, pose: [[0, 'sit'], [a4 + 1.2, 'sitthink']], face: 'plain' }); }
        else if (t < bowl) me = stick(t, MX + 70, FL, { scale: SC, pose: [[0, 'drop'], [stand + .5, 'stand']], face: 'plain' });
        else me = stick(t, 660, FL, { scale: SC, pose: 'lift', face: 'smile', talk: [[bowl + .2, bowl + 1.2]] });
        if (t >= stand && t < stand + .5) prop('noodles', me.hand[0] + 4, me.hand[1] + 58, { rot: Math.PI / 2, s: .7, hot: true });
        if (t >= bowl) { prop('bowl', me.hand[0] + 30, me.hand[1] + 40, { w: 170, full: true, hot: true, steam: true, t }); emote(t, bowl + .3, 'heart', me.head[0] + 10, me.head[1] - 112, { s: 1.1 }); }
        say(t, a4 + .3, '后来我学会了：先等水开', 760, 200, { mode: 'line', sz: 72 });
        say(t, bowl + .2, '这回对了', 330, 420, { to: me });
      } },
    ]);
  } };
})();
