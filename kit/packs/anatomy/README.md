# 器物解剖：来历和改动

这个目录是风格包 `anatomy` 的实现。`index.js`、`fx.js`、`turn3d.js`、`check.js` 是本项目自己写的；其余文件改自 **wheresryan22/anatomy**（Ryan），按 MIT 许可使用，许可全文在同目录 `LICENSE`。

- 上游仓库：https://github.com/wheresryan22/anatomy
- 取用的提交：`e9488296a44211c42701ff71705b7901470ec78f`（2026-10-16 取）。`isokit.js`、`lathe.js`、`tube.js` 最早是 2026-10-15 从 `bc943e4` 取的，这两个提交之间这三个文件没有变。
- 现在这些文件就是工坊自己维护的源码，直接在这里改；不保留上游原件，也没有生成脚本。
- 函数名和参数和上游一样，所以上游的 `references/kit.md`（API）、`references/craft.md`（零件菜谱、色阶、画家顺序、管线走法）、`references/webgl.md`（光效的规矩）、`references/3d.md`（3D 转动）可以直接对照着用。

## 每个文件从哪来

| 本目录 | 上游路径 | 是什么 |
|---|---|---|
| `isokit.js` | `kit/iso-kit.mjs` | 相机与投影、深度、圆角平面、拉伸体（四档侧面 + 顶面 + 折线 + 倒角）、圆柱、滚花、弹簧、刻度、贴面矩阵、按画框取景；后半是 SVG 标记和 `ISO_CSS`（3D 转动的离屏舞台要用） |
| `lathe.js` | `kit/lathe.mjs` | 回转体（任意轴，曲面平滑明暗）、法兰、环、球、鞍座、棱柱、分段长曲面、曲面上的缝/肋/螺栓圈、伸缩杆、管路圆角和取段 |
| `tube.js` | `kit/tube.mjs` | 管子和电缆切段（可按深度排序）、高光暗带、端盖、编织环、卡箍处的缺口 |
| `audit.js` | `kit/audit.mjs` | 几何审计：记录每件东西的真实形状，量重叠处谁在前、管子穿没穿过东西、端头落没落在接口上、零件有没有支撑、互相陷没陷进去 |
| `gl.js` | `kit/gl-shared.mjs`（`kit/gl.mjs` 的超集） | WebGL 层：和等距相机一致的 GLSL（射线、地面和墙面上的点、噪声、tonemap）、全屏三角形的着色器层、起落包络 |
| `turn.js` | `kit/turn.mjs` | 3D 转动的运行时（构建和审计用） |
| `turn-canvas.js` | `kit/turn-fixed.mjs` + `kit/canvas-painter.mjs` | 3D 转动的画布版运行时和画布画家（上游标着“实验中、还没写进文档”）：工坊逐帧渲染用的是这一份 |
| `turn-build.js` | `kit/turn-build.mjs` | 3D 转动的构建：组（转、滑、铰、自由）、凸零件、材质、每对零件的分离平面、静止零件和活动层的前后关系证明 |
| `turn-audit.js` | `kit/turn-audit.mjs` | 3D 转动的轨道审计 |
| `index.js` | —（本项目） | 主题 `anatomy` `anatomy_light`、用 Path2D 把路径画到画布上、视频镜头（`view` `fit` `camLerp`）、按时间算的动作（`follow` `spring` `env` `drop`）、招牌零件、画框 `plate`；审计时给每个画法挂上登记（形状、第几笔、线头） |
| `check.js` | —（本项目；线头的量法照上游 `scripts/line-ends.mjs` 重写） | 把审计接到逐帧画法上：量一帧就再画一遍这一帧、边画边记，然后查线头和几何；`window.anatomyScan` 给 `build.py check` 和 `build.py anatomy` 用 |
| `fx.js` | —（本项目；GLSL 的相机和噪声来自 `gl.js`，做法照上游 `references/webgl.md`） | 六种光效：发热、火焰、蒸汽、灯光、水面、火花，深色和浅色主题各一套画法；离屏 WebGL 画布按光效在屏幕上的范围定大小，画完贴回主画布 |
| `turn3d.js` | —（本项目） | 把 3D 转动接到逐帧画法上：页面里构建、离屏舞台挂上画布版运行时、每帧按 `pose(t)` 设好姿态、按这一帧的镜头推拉后贴回主画布；轨道审计用这条片子自己的每一帧 |

## 相对上游改了什么

1. **模块方式**：上游是 ES 模块。这里去掉了 `import` / `export`，每个文件包一层，挂到 `PACK.anatomy` 的命名空间上：`K`（核心）、`G`（回转体）、`TB`（管线）、`AU`（审计）、`GL`（WebGL）、`T3`（3D 运行时）、`TF`（画布版 3D 运行时和画家）、`TBLD`（3D 构建）、`TA`（3D 审计）。名字没改。
2. **在浏览器里跑**：上游的构建和审计在 Node 里跑。这里都在出片用的那个页面里跑，所以去掉了三处只在 Node 里有的东西：`turn-build.js` 打包时的 `Buffer`（浏览器里换成 `btoa`），`audit.js`、`turn-audit.js` 里 `auditOrExit` / `orbitOrExit` 读的 `process.argv` 和设的 `process.exitCode`。
3. **`audit.js` 的 `supports`**：加了两个参数。`spacing` 是表面取样间距，原来写死 0.6。`cache` 跨帧缓存成对的结果，因为视频里大多数零件帧与帧之间不动，只需重算动了的。原来量一帧要 1.9 秒，现在第一帧 0.7 秒，之后 0.1 秒左右。
4. **`gl.js` 的 `glLayer`**：加了两个参数。`sized`：画布尺寸由调用方管，离屏画布没有 CSS 盒子可量。`preserve`：保留绘图缓冲，画完以后还要贴到主画布上。
5. **画法**：上游把路径拼成 SVG、配一套 CSS 上色；工坊画在 canvas 上，所以 `index.js` 重写了画实体、线、点、管子的方法，色阶照上游的 CSS 令牌写成主题里的 `an`。3D 部分仍然走上游的 SVG → 画布画家这条路，离屏舞台的 CSS 变量取同一套色阶和线宽，所以 3D 零件和二维零件看起来是一套。
6. **线宽**：上游在约 650 像素宽的网页上用 0.6 像素的细线。视频要在手机上看，缺省 1.5 像素（`look({lw})` 可调）；上游以像素写的小尺寸（螺丝点、端点、软影）和审计、线头检查的容差都按同样的比例放大。
7. **动作**：上游在浏览器里一帧帧积分（`dt`）。视频必须是时间的确定函数，所以跟随、弹簧、`settle` 都改写成按关键帧叠加的解析解，同一个 t 画两遍一模一样（工坊的“确定性”检查在 WebGL 和 3D 都开着的样片上通过）。
8. **审计用“第几笔”当前后顺序**：上游的审计会解出每件零件该排在哪（`settle` 改写 key）。工坊的零件是作者在分场里一笔笔画的，所以这里不改顺序，只用实际画的先后去和几何比：真实在前面的那件先画了，就报“遮挡顺序画反”。

改造后用三条样片跑过：`kit/gallery/anatomy`（二维，弹簧测力台）、`kit/gallery/anatomy3d`（3D 转台 + 火焰、热斑、火花）、以及埋了三个错的对照（悬空的线、穿过零件的管子、画反的遮挡顺序，三个都被拦下）。样片的两条审计都通过，`build.py check` 通过。

## 上游有、这里没取的

- React 组件 `kit/react/`、网页卡片和页面生成（`figureSvg` 之外的 `plateHtml`、`pageHtml` 留在 `isokit.js` 里但工坊不用）、发布到社区画廊的脚本、截图和驱动浏览器的脚本（`scripts/` 下的 `capture`、`drive`、`turn-check` 等）：网页专用。工坊有自己的抽帧、推近（`build.py zoom`）和检查。
- 八个示例（拨号盘、街机、火箭发动机、水波槽……）：那是上游作者的作品内容，不是引擎。工坊的样片是自己画的虚构器械，光效的着色器也是照上游的规矩自己写的，没有搬示例里的。

想对照上游的新版本：按上表找到对应文件看差异，手工合进来，再跑 `python3 kit/workshop.py gallery anatomy anatomy3d` 和两条样片的 `build.py anatomy`、`build.py anatomy --turn`。
