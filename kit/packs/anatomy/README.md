# 器物解剖的几何库：来历和改动

这个目录是风格包 `anatomy` 的实现。`index.js` 是本项目自己写的接合层；`isokit.js`、`lathe.js`、`tube.js` 改自 **wheresryan22/anatomy**，按 MIT 许可使用，许可全文在同目录 `LICENSE`。

- 上游仓库：https://github.com/wheresryan22/anatomy
- 取用的提交：`bc943e40c59998be5da61f9d39c6a983b1116099`（2026-10-15 取）
- 现在这些文件就是工坊自己维护的源码，直接在这里改；不保留上游原件，也没有生成脚本。
- 函数名和参数和上游一样，所以上游的 `references/kit.md`（API）和 `references/craft.md`（零件菜谱、色阶、画家顺序、管线走法）可以直接对照着用。

## 每个文件从哪来

| 本目录 | 上游路径 | 是什么 |
|---|---|---|
| `isokit.js` | `kit/iso-kit.mjs` 第 1–409 行 | 相机与投影、深度、圆角平面、拉伸体（四档侧面 + 顶面 + 折线 + 倒角）、圆柱、滚花、弹簧、三种刻度、贴面矩阵、按画框取景 |
| `lathe.js` | `kit/lathe.mjs` 全部 | 回转体（任意轴，曲面平滑明暗）、法兰、环、球、鞍座、棱柱、分段长曲面、曲面上的缝/肋/螺栓圈、伸缩杆、管路圆角和取段 |
| `tube.js` | `kit/tube.mjs` 第 1–292 行 | 管子和电缆切段（可按深度排序）、高光暗带、端盖、编织环、卡箍处的缺口 |
| `index.js` | —（本项目） | 主题 `anatomy` `anatomy_light`、用 Path2D 把路径画到画布上、视频镜头（`view` `fit` `camLerp`）、按时间算的动作（`follow` `spring` `env` `drop`）、招牌零件、画框 `plate` |

## 相对上游改了什么

1. **模块方式**：上游是 ES 模块（`export` / `import`）。这里去掉了导入导出，每个文件包一层，挂到 `PACK.anatomy.K`（核心）、`.G`（回转体）、`.TB`（管线）上，不占全局名。名字没改。
2. **只留几何**：上游把路径拼成 SVG 标记、配一套 CSS 上色（`solidSvg` `lineSvg` `dotsSvg` `fadedSvg` `fadeLineSvg` `wireSvg` `faceTextSvg` `groupSvg` `figureSvg` `plateHtml` `pageHtml` `ISO_CSS`，`tube.js` 的 `ringsSvg` `tubeSvg`），还有一个改网页元素的 `holdStill`。工坊画在 canvas 上，这些都删了，换成 `index.js` 里的 `solid` `line` `dots` `faded` `fadeLine` `wire` `tubePiece` `plate`，色阶照上游的 CSS 令牌重写成主题里的 `an`。
3. **线宽**：上游在约 650 像素宽的网页上用 0.6 像素的细线（不随缩放）。视频要在手机上看，缺省 1.5 像素，可用 `look({lw})` 调；上游以像素写的小尺寸（螺丝点、端点、软影）按同样的比例放大。
4. **色阶**：暗色的四档侧面和 lo、faint 两档线比上游各提亮了一点，压缩成视频后还分得开。浅色基本照搬。
5. **动作**：上游在浏览器里一帧帧积分（`dt`）。视频必须是时间的确定函数，所以指数跟随和弹簧都改写成按关键帧叠加的解析解（`follow` `spring`），同一个 t 画两遍一模一样。

改造后用样片 `kit/gallery/anatomy/` 跑过：拉伸体、圆柱、滚花、弹簧、刻度、车削零件、管子都画得出来，`build.py check` 通过。只做了目测，没有和上游逐像素对比（上游出 SVG，这里画 canvas，线宽也不同）。

## 上游有、这里没取的

- **几何审计** `kit/audit.mjs`：在 Node 里证明管线不穿模、前后顺序对、线头都有着落。它要每件东西登记真实形状，和工坊“逐帧画”的写法接不上；思路收进了 `templates/风格包.md` 的规矩和审片清单（推近看、线不能悬空、先排好顺序再调）。
- **WebGL 着色器层** `kit/gl.mjs` `kit/gl-shared.mjs`（火焰、喷流、水面焦散、灯光）和 **3D 转动模式** `kit/turn*.mjs`、`kit/canvas-painter.mjs`：体量大、依赖 DOM 和 WebGL，先记在收件箱。
- **React 组件** `kit/react/`、网页卡片和页面生成、发布到社区画廊的脚本、截图和线头检查脚本（`scripts/`）：网页专用。
- 八个示例（拨号盘、街机、火箭发动机、水波槽……）：那是上游作者的作品内容，不是引擎。样片是自己画的一台虚构的弹簧测力台。

想对照上游的新版本：按上表找到对应文件看差异，手工合进来，再跑 `python3 kit/workshop.py gallery anatomy`。
