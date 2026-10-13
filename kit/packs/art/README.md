# 艺术引擎的库：来历和改动

这个目录是风格包 `art` 的实现。`index.js` 是本项目自己写的接合层；其余文件改自 **alchaincyf/huashu-art-motion**（花叔），按 MIT 许可使用，许可全文在同目录 `LICENSE`。

- 上游仓库：https://github.com/alchaincyf/huashu-art-motion
- 取用的提交：`57d67608ab458f57d9b153b1a2831b921e22498b`（2026-10-09 取）
- 现在这些文件就是工坊自己维护的源码，直接在这里改；不再保留上游原件，也没有生成脚本。

## 每个文件从哪来

| 本目录 | 上游路径 | 是什么 |
|---|---|---|
| `util.js` | `scripts/engine/lib/util.js` | 种子随机、缓动、字形检查 |
| `motion.js` | `lib/motion.js` | 动效时间：缓动、弹簧、步进、错开 |
| `ik.js` | `lib/rig.js` 第 8–29 行 | 只取两个几何函数：二骨 IK、圆头胶囊（转场 cutouts 用） |
| `paint.js` `brush.js` `render.js` `post.js` | `lib/` 同名 | 绘画：噪声纹理、风格渲染器、毛笔与水彩、光影、后期媒介层 |
| `geom.js` | `lib/kit.js` | 点列、可变线宽、整幅扭曲等小工具（改名是为了不和工坊的 `kit/` 混） |
| `camera.js` `diagram.js` `typo.js` `chart.js` `ui.js` `collage.js` `toon.js` | `lib/` 同名 | 相机、图解、文字动效、图表、界面、拼贴、扁平插画 |
| `transitions.js` | `scripts/engine/transitions.js` | 45 个转场 |
| `index.js` | —（本项目） | 接合层：`look` `post` `trans` `seq`，字体接到工坊字体，库里画的字登记进检查 |

## 相对上游改了什么

1. **模块方式**：上游每个库往 `window` 上挂一个全局（`U`、`PAINT`、`MO`……）。这里都挂在 `PACK.art` 上，每个文件开头从它取自己要用的库，不占全局名。
2. **画幅**：上游写死 1920×1080。这里删掉了各文件里的 `const W = 1920, H = 1080`，`W`、`H` 用工坊画布的真实尺寸；`post.js` 里三处写死的画面中心和半径改成按画幅算。所以竖版能用。
3. **去掉了那支短片的内容**：角色编舞（`KIT.girlOrder` `KIT.choreo` `KIT.nearArm`、`PAINT.choreo` `PAINT.cupCycle`）、作者本人的卡通形象 `TOON.bean` 和它的配色、模仿一位画家招牌小人的转场 `radiant`。
4. **清理**：删掉没用到的局部变量；`motion.js` 里没人读的 `STAGE` 去掉，只留登记和通知。
5. **缺省参数**（在 `index.js` 里）：`expandRect`、`lensReveal` 不给参数也能用。

改造前后用一条把全部转场、重绘、后期各跑一遍的演练片对过：118 帧里 114 帧逐像素相同，另外 4 帧是第 5 条那两个转场（原来不给参数会报错）。

## 上游有、这里没取的

- 35 个风格场景和少女与猫的骨架：那是上游那支短片的内容和构图，不是引擎。
- 作者的卡通形象、角色帧、总览图：上游声明不随 MIT 授权。
- 示范片、口播整片参考代码、笔顺数据（后者是 Arphic 许可）。
- 上游自己的时间轴引擎和参数化片段：工坊有自己的时间轴。
- 验收脚本 `qa.py`：没有搬代码，照它的量法在 `kit/studio/checks.py`（`build.py check` 的动效几项）里重写成了动效检查。
- 字体：只取了工坊没有的四个（Inter、CMU 正体和斜体、Press Start 2P，SIL OFL 1.1，在 `kit/fonts/art/`）。

想对照上游的新版本：按上表找到对应文件看差异，手工合进来，再跑 `python3 kit/workshop.py gallery art art_vertical art_all`。
