/* 用法（两条线并行：上栏大人物/大时代，下栏小人物）：
   screen(t, [ {at:0, draw:G=>{...}}, {at:换屏时刻, draw:G=>{...}} ], { side:{ top:{badge:'帝', a:'孝文帝', b:'太和七年'}, bottom:{badge:'婢', a:'王钟儿', b:'四十五岁'} }, year:'公元 四八三 年', chapter:'叁 保母' })
   每一屏的 draw 里：G.save(); clipReg(G,1); …上栏（地面 G1）…; G.restore();  G.save(); clipReg(G,2); groundLine(G,G2); …下栏（地面 G2）…; G.restore();
   定时按旁白句子走：from('a3') 这句开始后淡入；upto('a5') 这句结束后淡出；vis('a3','a5') 从 a3 显到 a5；pr('a3') 这句念到哪了 0..1；mv(起,止,时刻,时长) 平移
   人物：wom / emp / kid(G, x, 地面, 大小, {f:脸, pal:PAL.xx, age, …}, 透明度)；标签 tag(G, ['孝文帝'], x, y, 字号, 透明度)；字幕由工坊的字幕落在底栏里 */
let BEATS = [];
function beat(i) { const v = typeof i === 'number' ? BEATS[i] : BEATS.find(x => x.id === i); if (!v) throw new Error('漆屏风：找不到句子 ' + i); return v; }
PACK_INIT.push(async tl => { BEATS = tl.map(s => ({ id: s.id, a: s.t0 + (s.lead || 0), b: s.t0 + (s.voiced || s.dur), ch: s.ch })); });
let LBUF = null;
function lqBoot() {
  if (BG) return; BG = lacquer(W, H); LBUF = [mk(W, H), mk(W, H)]; TMP = mk(W, H); TMPG = TMP.getContext('2d');
  WEAR = mk(W, H); { const g = WEAR.getContext('2d'), r = rng(91); for (let i = 0; i < 900; i++) { const x = 200 + r() * 1660, y = 60 + r() * 870, s = 1 + r() * r() * 9; g.fillStyle = r() < .55 ? `rgba(150,36,28,${.35 + r() * .5})` : `rgba(26,14,10,${.2 + r() * .4})`; g.beginPath(); g.ellipse(x, y, s, s * (.4 + r() * .6), r() * 3, 0, TAU); g.fill(); }
    g.strokeStyle = 'rgba(26,12,8,.28)'; g.lineWidth = .9; for (let i = 0; i < 200; i++) { let x = 200 + r() * 1660, y = 60 + r() * 870; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (r() - .5) * 70; y += (r() - .4) * 46; g.lineTo(x, y); } g.stroke(); } }
  VIG2 = mk(W, H); { const g = VIG2.getContext('2d'), vg = g.createRadialGradient(W / 2, H / 2, 520, W / 2, H / 2, 1150); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(10,4,2,.5)'); g.fillStyle = vg; g.fillRect(0, 0, W, H); }
}
function drawPanel(G, fn) { G.setTransform(1, 0, 0, 1, 0, 0); G.globalAlpha = 1; G.drawImage(BG, 0, 0); G.save(); fn(G); G.restore(); G.setTransform(1, 0, 0, 1, 0, 0); G.globalAlpha = 1; G.drawImage(WEAR, 0, 0); }
function side(c, o) { // 左侧锚点：上栏是谁的时代，下栏是谁、几岁
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
  c.fillStyle = 'rgba(20,12,9,.8)'; c.fillRect(60, 60, 126, 386); c.fillRect(60, 470, 126, 458);
  const col = (y, s, bg) => { if (!s) return; c.fillStyle = bg; c.fillRect(70, y, 106, 60); c.font = `44px ${F.brush}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = LQ.BK; c.fillText(s.badge || '', 123, y + 32);
    if (s.a) vtext(c, 99, { t0: 0, cols: [s.a], x: 152, y: y + 82, size: 36, lead: 1.12, font: F.songb, fd: .01, color: LQ.YE }); if (s.b) vtext(c, 99, { t0: 0, cols: [s.b], x: 98, y: y + 82, size: 32, lead: 1.1, font: F.song, fd: .01, color: LQ.WH }); };
  col(70, o.top, LQ.YE); col(482, o.bottom, LQ.WH); c.restore();
}
function bar(c, left, right) { // 底栏：左边纪年，右边章名，中间留给字幕
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = 'rgb(20,12,9)'; c.fillRect(40, 962, 1840, 84); c.fillStyle = LQ.YE; c.fillRect(40, 962, 1840, 3);
  c.font = `32px ${F.songb}`; c.textBaseline = 'middle'; c.fillStyle = LQ.YE; c.textAlign = 'left'; c.fillText(left || '', 70, 1006); c.textAlign = 'right'; c.fillText(right || '', 1850, 1006); c.restore();
}
function screen(t, panels, o = {}) {
  lqBoot(); TT = t; const c = g, HALF = .62; c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
  let ch = 0; for (let i = 0; i < panels.length; i++) if (t >= panels[i].at) ch = i;
  const nx = ch + 1 < panels.length ? panels[ch + 1].at : 1e9;
  drawPanel(LBUF[0].getContext('2d'), panels[ch].draw);
  if (t > nx - HALF || (ch > 0 && t < panels[ch].at + HALF)) { // 屏风六扇依次翻转
    const other = t > nx - HALF ? ch + 1 : ch - 1, mid = t > nx - HALF ? nx : panels[ch].at; drawPanel(LBUF[1].getContext('2d'), panels[other].draw);
    const oldB = other > ch ? LBUF[0] : LBUF[1], newB = other > ch ? LBUF[1] : LBUF[0];
    c.drawImage(newB, 0, 0); c.save(); c.beginPath(); c.rect(X0 - 14, 58, X1 - X0 + 28, 872); c.clip(); c.fillStyle = 'rgb(20,12,9)'; c.fillRect(0, 0, W, H); const n = 6, pw = (X1 + 14 - (X0 - 14)) / n;
    for (let i = 0; i < n; i++) { const ph = clamp((t - (mid - HALF) - (n - 1 - i) * .09) / (2 * HALF - (n - 1) * .09)), k = Math.cos(ph * Math.PI), src = k > 0 ? oldB : newB, sx = X0 - 14 + i * pw, w = Math.max(.02, Math.abs(k));
      c.save(); c.translate(sx + pw / 2, 0); c.scale(w, 1); c.drawImage(src, sx, 0, pw, 952, -pw / 2, 0, pw, 952); c.fillStyle = `rgba(10,5,4,${(1 - w) * .7})`; c.fillRect(-pw / 2, 36, pw, 916); c.restore(); }
    c.restore();
  } else c.drawImage(LBUF[0], 0, 0);
  frame(c); if (o.side) side(c, o.side); bar(c, o.year, o.chapter); c.restore();
}
addTheme('lacquer', { ink: 'rgb(240,226,190)', dim: 'rgba(240,226,190,.66)', note: 'rgba(240,226,190,.84)', a1: LQ.YE, a2: LQ.WH, a3: LQ.GR, chip: 'rgba(224,180,86,.14)',
  sub: 'rgba(0,0,0,0)', subInk: 'rgb(240,226,190)', top: '#3a1410', bot: '#1c0c08', card: 'rgba(20,10,8,.9)', cardInk: 'rgb(240,226,190)', pillInk: '#1a110d', hl: LQ.YE,
  f: { t: 'SongB', b: 'SongB', s: 'Song', h: 'Brush', n: 'RC' },
  bg(t) { g.fillStyle = 'rgb(20,12,9)'; g.fillRect(0, 0, W, H); }, post(t) { lqBoot(); g.drawImage(VIG2, 0, 0); } });
