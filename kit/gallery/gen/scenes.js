(() => {
// 《一个点 A POINT》——没有旁白。七万个点从头用到尾：一个点 → 炸开 → 星系 → 向日葵 → 双螺旋 → 神经网络 → 晶格 → 一个问号 → 噪声 → 一个点。
// 每一场是一条规则；换场时点不换，只换规则。字是问题自己，一场一句。
const { stage, buf, F, mix, begin, draw, frame, end, CAM, say, code, eqn, ss, LANG } = PACK.gen;
const S = stage(70000, 7), A = buf(S), B = buf(S), P = buf(S), V = H > W;
const lerp3 = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
// 关键帧：[[时刻, 值], …]，两帧之间平滑过渡
const kf = (K, t) => { if (t <= K[0][0]) return K[0][1]; for (let i = 1; i < K.length; i++) if (t < K[i][0]) return K[i - 1][1] + (K[i][1] - K[i - 1][1]) * ss((t - K[i - 1][0]) / (K[i][0] - K[i - 1][0])); return K[K.length - 1][1]; };

window.FILM = { theme: 'void', chrome: 'none', chapters: ['VOID', 'BANG', 'GRAVITY', 'PATTERN', 'MIND', 'MACHINE', 'END', 'RETURN', 'TITLE'],
  cover: { pill: 'A SHORT FILM IN CODE', title: LANG === 'en' ? 'A POINT' : '一个点', line1: LANG === 'en' ? 'Before there was anything,' : '在有任何东西之前', line2: LANG === 'en' ? 'was there a question?' : '有过一个问题吗', tagline: LANG === 'zh' ? '七万个点 · 一条条规则' : '70,000 points · a few rules', shortSub: 'A POINT', name: '', credit: '',
    art(c, cx, cy, R) { const r = c.createRadialGradient(cx, cy, 0, cx, cy, R * .9); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.06, 'rgba(190,220,255,.9)'); r.addColorStop(.3, 'rgba(90,140,255,.18)'); r.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = r; c.beginPath(); c.arc(cx, cy, R * .9, 0, 7); c.fill(); } },
  scenes(t) {
    const Tv = T('v'), Tb = T('b'), Tg = T('g'), Tp = T('p'), Tm = T('m'), Tx = T('x'), Te = T('e'), Tr = T('r'), Tz = T('z'), END = N('z');
    // 各个状态（一条规则一个），和它们之间的过渡 [从哪个状态, 开始时刻, 时长, 散开多少]
    const ST = [
      (o, q) => F.point(S, o, q, { r: .006 + .004 * Math.sin(q * 1.7) }),
      (o, q) => F.burst(S, o, q, { k: 1.75 * (1 - Math.exp(-Math.max(0, q - Tb) * .8)) + .035 * Math.max(0, q - Tb), twist: 1.3, shell: 1.45 }),
      (o, q) => F.galaxy(S, o, q, { arms: 2, spin: .2, R: V ? .8 : 1.12 }),
      (o, q) => F.phyllo(S, o, q, { R: V ? .82 : 1.0, grow: 1, spin: .05, seeds: 1500 }),
      (o, q) => F.helix(S, o, q, { L: V ? .95 : 1.55, turns: V ? 3 : 4.5, rad: .27, spin: .55 }),
      (o, q) => F.net(S, o, q, { layers: [5, 8, 9, 8, 5, 2], w: V ? .86 : 1.35, h: V ? .6 : .8, speed: .42 }),
      (o, q) => F.lattice(S, o, q, { n: 8, size: .72 }),
      (o, q) => F.glyph(S, o, q, { text: '?', font: '700 420px GenSerif', w: .62 }),
      (o, q) => F.static(S, o, q, { a: .9, sy: V ? 1.12 : 1, oy: V ? -.2 : 0 }),
      (o, q) => F.point(S, o, q, { r: .005 }),
    ];
    const TR = [[0, Tb, .01, 0], [1, Tg - .6, 7.5, .3], [2, Tp - .8, 5.5, .22], [3, Tp + (Tm - Tp) * .56, 4.6, .14], [4, Tm - .4, 5, .12], [5, Tx - .4, 4.2, .12], [6, Tx + (Te - Tx) * .44, 3.8, .16], [7, Te - .3, 6.5, .1], [8, Tr + .4, (Tz - Tr) * .86, 0, 5.5]];
    // 每个状态的两种颜色（点按自己的随机数在两色之间取）
    const COL = [[[1, 1, 1], [1, 1, 1]], [[1, .62, .28], [1, .9, .7]], [[.32, .55, 1], [1, .72, .42]], [[1, .8, .3], [1, .45, .16]], [[.15, .95, .85], [1, .35, .65]], [[.3, .6, 1], [.9, .95, 1]], [[.7, .82, 1], [.4, .5, .9]], [[1, 1, 1], [.75, .88, 1]], [[.62, .64, .72], [.45, .48, .58]], [[1, 1, 1], [1, 1, 1]]];
    const BR = [.5, 1.15, .5, .42, .5, .55, .5, .6, 1.0, .5];   // 每个状态的亮度：点摊得越开，要的亮度越高
    function where(q) { let i = -1; for (let k = 0; k < TR.length; k++) if (q >= TR[k][1]) i = k; if (i < 0) return [0, 0, 0, 0]; const k = Math.min(1, (q - TR[i][1]) / TR[i][2]); return [TR[i][0], TR[i][0] + 1, k, TR[i][3], TR[i][4] || 0]; }
    function pose(q) { const [a, b, k, sc, sw] = where(q); if (k <= 0 || a === b) { ST[a](P, q); return; } if (k >= 1) { ST[b](P, q); return; } ST[a](A, q); ST[b](B, q); mix(S, P, A, B, sw ? k * k : k, { stagger: sw ? 1.1 : .5, scatter: sc, swirl: sw }); }
    // 相机：贴在平面上的构型（向日葵、网络、问号、噪声）要正对着看；立体的（炸开、星系、螺旋、晶格）可以转
    const cam = q => CAM({
      yaw: kf([[Tv, 0], [Tb, 0], [Tg, .9], [Tp - 1, 1.5], [Tp + 4, 0], [Tm - 2, 0], [Tm + 1, .25], [Tm + 6, 0], [Tx - .5, 0], [Tx + 3.5, .95], [Tx + 8, 0], [END, 0]], q) + (q > Tb && q < Tp ? 0 : 0),
      pitch: kf([[Tv, 0], [Tb + 2, .12], [Tg + 5, .7], [Tp - 1, .78], [Tp + 4, 0], [Tm - 2, 0], [Tm + 1, .12], [Tm + 6, 0], [Tx + 3.5, .42], [Tx + 8, 0], [END, 0]], q),
      zoom: kf([[Tv, 1.6], [Tb, 1.6], [Tb + 3, 1], [Tg + 6, .92], [Tp + 4, .95], [Tp + 9, 1], [Tm + 5, 1], [Tx + 3, 1.08], [Tx + 9, 1.35], [Te + 2, 1], [Tr, 1], [Tz, 1.5], [END, 1.7]], q) * (V ? .92 : 1),
      dist: 3.2, y: (V ? .5 : 0) + kf([[Tv, 0], [Tb, 0], [Tg + 5, .16], [Tp - 1, .16], [Tp + 4, .1], [Tx + 8, .12], [Te, .05], [Tr, 0], [END, 0]], q) });
    const [sa, sb, sk] = where(t), c1 = lerp3(COL[sa][0], COL[sb][0], ss(sk)), c2 = lerp3(COL[sa][1], COL[sb][1], ss(sk)), bright = BR[sa] + (BR[sb] - BR[sa]) * ss(sk);
    // 亮度：开头一个点慢慢亮起；终结时一路暗下去；回到一个点时再亮
    const fade = kf([[Tv, 0], [Tv + 2.5, 1], [Te + 2, 1], [Tr - .5, .5], [Tr + 4, .8], [Tz, 1], [END + 2, .85], [END + 3, 0]], t);
    const moving = sa !== sb && sk < 1, K = t < Tb ? 2 : (moving ? 5 : 6);
    begin(t);
    frame(t, { trail: K, shutter: t < Tb ? .02 : .075 }, (q, w) => { pose(q); draw(S, P, { cam: cam(q), color: c1, color2: c2, bright, gain: w * fade, size: (sa >= 8 || t < Tb) ? 2 : 1 }); });
    end(t, { bloom: kf([[Tv, .95], [Tb + 1, .7], [Tg, .55], [Te, .5], [Tr + 4, .8], [END, .95]], t), grain: .05, vignette: .5 });
    // 只有一个点的时候：给它一圈会呼吸的光（开头，和结尾收回来以后）
    const halo = (t < Tb ? ss((t - Tv - .6) / 3) : ss((t - (Tz - 1.5)) / 3)) * fade * (t < Tb || t > Tz - 1.5 ? 1 : 0);
    if (halo > 0) { const hr = Math.min(W, H) * (.11 + .012 * Math.sin(t * 1.6)) * (t < Tb ? 1 + 1.5 * ss((t - (Tb - 1.2)) / 1.2) : 1), hy = H / 2 - cam(t).y * Math.min(W, H) * .42 * cam(t).zoom, hg = g.createRadialGradient(W / 2, hy, 0, W / 2, hy, hr); hg.addColorStop(0, `rgba(255,255,255,${(.95 * halo).toFixed(3)})`); hg.addColorStop(.035, `rgba(225,238,255,${(.8 * halo).toFixed(3)})`); hg.addColorStop(.14, `rgba(150,190,255,${(.2 * halo).toFixed(3)})`); hg.addColorStop(.45, `rgba(90,130,255,${(.05 * halo).toFixed(3)})`); hg.addColorStop(1, 'rgba(0,0,0,0)'); g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = hg; g.fillRect(W / 2 - hr, hy - hr, hr * 2, hr * 2); g.restore(); }
    // 炸开的那一瞬间：整屏闪一下白
    const fl = Math.max(0, 1 - (t - Tb) / .5); if (t >= Tb && fl > 0) { g.fillStyle = `rgba(255,244,230,${(fl * fl * .85).toFixed(3)})`; g.fillRect(0, 0, W, H); }

    /* ---------- 字：一场一句；左上角是“画这一场的那一行” ---------- */
    const sbx = safeBox(V ? 30 : 90), cx0 = sbx.x, cy0 = sbx.y + (V ? 40 : 30), ty = V ? H - SAFE.b - 300 : H * .83, CS = { size: V ? 40 : 32 };
    say(t, Tv + 3.2, Tb - .6, '在有任何东西之前，有过一个问题吗？', 'Before there was anything, was there a question?', { y: ty });
    code(t, Tb + 1.2, ['p.x += p.vx * dt'], cx0, cy0, { ...CS, t1: Tg - .4 });
    say(t, Tb + 4, Tg - .8, '于是，有了“有”。', 'And then, there was.', { y: ty });
    code(t, Tg + 1, ['a = G * m / (r * r)'], cx0, cy0, { ...CS, t1: Tp - .8 });
    say(t, Tg + 5.5, Tp - 1.2, '规则很少。时间很多。', 'Few rules. A great deal of time.', { y: ty });
    eqn(t, Tp + 3.5, Tp + (Tm - Tp) * .56, 'θ = n · 137.5°', cx0, cy0 + 6, 44);
    say(t, Tp + 8.2, Tm - 1, '后来，规则学会了复制自己。', 'Then the rules learned to copy themselves.', { y: ty });
    code(t, Tm + 3.5, ['y = σ(W · x + b)'], cx0, cy0, { ...CS, t1: Tx - .8 });
    say(t, Tm + 7, Tx - 1, '被复制的东西，开始提问。', 'What was copied began to ask.', { y: ty });
    code(t, Tx + 2, ['while (true) ask("why?")'], cx0, cy0, { ...CS, t1: Te - 1.2 });
    say(t, Tx + 6.5, Te - 1.4, '它造出另一个会提问的东西。', 'It built another thing that could ask.', { y: ty });
    code(t, Te + 2, ['dS >= 0'], cx0, cy0, { ...CS, t1: Tr - .4, color: 'rgba(200,204,214,.7)' });
    say(t, Te + 3.4, Tr - .4, '而熵，从不回答。', 'And entropy never answers.', { y: ty });
    say(t, Tr + 2.6, Tz - .5, '也许终点，只是问题回到它自己。', 'Perhaps the end is only the question, returning to itself.', { y: ty, size: V ? 52 : 56 });
    // 片名和片尾
    say(t, Tz + .8, END + 2.6, '一个点', 'A POINT', { y: V ? H - SAFE.b - 470 : H * .7, size: V ? 110 : 120, fade: 1.4 });
    const kc = ss((t - (Tz + 2.6)) / 1.2) * (1 - ss((t - (END + 1.8)) / 1)); if (kc > 0) { const zh = ['全片由代码逐帧画出，', '是数学规则的示意，不是物理模拟'], en = ['Drawn frame by frame in code.', 'Sketches of rules, not simulations.'], L = [];
      if (LANG !== 'en') (V ? zh : [zh.join('')]).forEach(x => L.push([x, 'H5'])); if (LANG !== 'zh') (V ? en : [en.join(' ')]).forEach(x => L.push([x, 'GenSerifI']));
      const step = V ? 52 : 48, y0 = V ? H - SAFE.b - 110 - (L.length - 1) * step : H - 150; L.forEach(([x, f], i) => txt(x, W / 2, y0 + i * step, 32, 'rgba(242,244,248,.62)', f, 'center', kc)); }
  } };
})();
