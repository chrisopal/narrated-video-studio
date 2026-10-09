// 节选自 lib/rig.js（上游第 8–28 行，原样）：只取与角色无关的两个几何函数——二骨 IK 和粗细变化的圆头胶囊。
// 上游 rig.js 的其余部分是那支短片的少女和猫的骨架，属于片子内容，没有收进工坊。转场 cutouts 用到 RIG.limb。
(() => {
const { clamp, lerp } = U;
const R = window.RIG = {};

// 二骨 IK：肩 S，目标 T，上臂 a，前臂 b，bendSign 决定肘向
R.ik2 = (S, T, a, b, bendSign = 1) => {
  let dx = T[0] - S[0], dy = T[1] - S[1], d = Math.hypot(dx, dy);
  d = Math.min(d, a + b - 0.01);
  const ang = Math.atan2(dy, dx), cosA = clamp((a * a + d * d - b * b) / (2 * a * d), -1, 1);
  const e = ang + bendSign * Math.acos(cosA);
  const E = [S[0] + Math.cos(e) * a, S[1] + Math.sin(e) * a];
  const H = [S[0] + Math.cos(ang) * d, S[1] + Math.sin(ang) * d];
  return { E, H };
};
// 粗细变化的肢体：沿 A→B 画一个圆头胶囊。两端半圆帽朝外（逆时针从 n 走到 n-π）。
// 旧版 arc 方向反了，帽子凹进胶囊、路径自交，粗描边/平涂时关节处露洞（迁移测试 C：哈林小人被画成奶牛）。
R.limb = (A, B, wA, wB) => {
  const p = new Path2D(), a = Math.atan2(B[1] - A[1], B[0] - A[0]), n = a + Math.PI / 2;
  p.moveTo(A[0] + Math.cos(n) * wA / 2, A[1] + Math.sin(n) * wA / 2);
  p.lineTo(B[0] + Math.cos(n) * wB / 2, B[1] + Math.sin(n) * wB / 2);
  p.arc(B[0], B[1], wB / 2, n, n - Math.PI, true);
  p.lineTo(A[0] - Math.cos(n) * wA / 2, A[1] - Math.sin(n) * wA / 2);
  p.arc(A[0], A[1], wA / 2, n - Math.PI, n - 2 * Math.PI, true);
  p.closePath(); return p;
};
})();
