(() => {
// 全量演练：把艺术引擎的每个转场、每种重绘、每种后期各跑一遍。不是给人看的片子，是回归用的——哪个名字报错、哪个画法变了，这里先知道。
// 转场每 1.2 秒一个，顺序就是 Object.keys(TR)；之后是重绘、后期。
const { look, post, trans, TR, LOOKS } = PACK.art; const TAU = Math.PI * 2;
// 两幅对比分明的画：A 暖色圆，B 冷色方；各有一点持续的动
function A(t) { g.fillStyle = '#f2c14e'; g.fillRect(0, 0, W, H); g.fillStyle = '#c1121f'; g.beginPath(); g.arc(W * .35 + Math.sin(t) * 40, H * .5, H * .28, 0, TAU); g.fill(); g.fillStyle = '#1d3557'; g.fillRect(W * .6, H * .2, W * .25, H * .6); }
function B(t) { g.fillStyle = '#1b3a5c'; g.fillRect(0, 0, W, H); g.fillStyle = '#8fd3c1'; g.fillRect(W * .15, H * .25 + Math.cos(t) * 30, W * .3, H * .5); g.fillStyle = '#f6f1e3'; g.beginPath(); g.arc(W * .7, H * .45, H * .22, 0, TAU); g.fill(); }
const NAMES = Object.keys(TR), LK = Object.keys(LOOKS), PS = ['film', 'vhs', 'bloom', 'vignette', 'fade', 'scan', 'rgb', 'flare', 'light'];
window.FILM = { theme: 'sky', chrome: 'none', chapters: ['转场', '重绘', '后期'], cover: { pill: '', title: '演练', line1: '', line2: '', tagline: '', name: '', credit: '', art() {} },
  scenes(t) {
    const t0 = T('a0'), t1 = T('a1'), t2 = T('a2');
    if (t < t1) { const i = Math.min(NAMES.length - 1, Math.max(0, Math.floor((t - t0) / 1.2))), cut = t0 + i * 1.2 + .6; trans(NAMES[i], t, cut, .8, () => (i % 2 ? B : A)(t), () => (i % 2 ? A : B)(t)); return; }
    if (t < t2) { const i = Math.min(LK.length - 1, Math.floor((t - t1) / 1.2)); A(t); look(LK[i], t, {}); return; }
    const i = Math.min(PS.length - 1, Math.floor((t - t2) / 1.2)); B(t); post(PS[i], t, PS[i] === 'flare' ? { sun: [W * .7, H * .3] } : {});
  } };
})();
