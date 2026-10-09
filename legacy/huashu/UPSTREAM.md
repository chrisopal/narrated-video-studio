# 上游：alchaincyf/huashu-art-motion

- 仓库：https://github.com/alchaincyf/huashu-art-motion
- 许可：MIT，Copyright (c) 2026 alchaincyf（花叔 · 花生）。全文见同目录 `LICENSE`。
- 取用的提交：`57d67608ab458f57d9b153b1a2831b921e22498b`（2026-10-09 取）
- 取用方式：下面这些文件**原样**拷进来，一个字没改；工坊用的版本由 `legacy/tools/mkart.py` 从它们生成（`kit/packs/art.js`），生成时做的改动都写在那个脚本开头。

## 取了什么

| 本目录 | 上游路径 | 是什么 |
|---|---|---|
| `lib/util.js` | `scripts/engine/lib/util.js` | 种子随机、缓动、字形检查 |
| `lib/motion.js` | `scripts/engine/lib/motion.js` | 动效时间：缓动、弹簧、步进、错开 |
| `lib/paint.js` `brush.js` `render.js` `post.js` | 同名 | 绘画：噪声纹理、风格渲染器、毛笔与水彩、光影、后期媒介层 |
| `lib/kit.js` | 同名 | 点列、可变线宽、整幅扭曲等小工具 |
| `lib/camera.js` `diagram.js` `typo.js` `chart.js` `ui.js` `collage.js` `toon.js` | 同名 | 解说动画用的相机、图解、文字动效、图表、界面、拼贴、扁平插画 |
| `transitions.js` | `scripts/engine/transitions.js` | 46 个转场 |
| `lib/rig_excerpt.js` | `scripts/engine/lib/rig.js` 的第 8–29 行 | 只节选两个几何函数（二骨 IK、圆头胶囊），文件头是本项目加的说明 |

## 没取什么，为什么

- **35 个风格场景**（`scripts/engine/scenes/`）、**少女与猫的骨架**（`lib/rig.js` 其余部分）：那是上游那支短片的内容和构图（上游说明其构图和设定沿用了 Tak 的《Art History Speedrun》），不是引擎。工坊要的是场景背后的渲染器，渲染器在 `lib/` 里，已经全取了。
- **作者本人的卡通形象**：`lib/rig_huashu.js`、角色帧、总览图不取（上游声明这些不随 MIT 授权）；`lib/toon.js` 里代码画的同一形象 `TOON.bean` 在生成时去掉。
- **示范片、口播整片参考代码、笔顺数据**（`demos/`、`reference_films/`）：内容不是引擎；笔顺数据是另一种许可（Arphic）。
- **上游自己的时间轴引擎和参数化片段**（`engine.js`、`clip.js`、`clips/`）：工坊有自己的时间轴（按句子和关键词对时），不需要第二套；八种解说语法工坊已有各自的风格包。
- **字体**：只取了四个工坊没有的（Inter、CMU 正体和斜体、Press Start 2P，均为 SIL OFL 1.1，放在 `kit/fonts/art/`）。其余中文字体工坊已有同款。
- **验收脚本** `scripts/qa.py`：没有搬代码，照它的量法（同一时刻渲两次比对、相邻帧运动面积、跳变）在 `kit/build.py` 里重写成了工坊检查的一部分。

## 跟上游更新

1. 把上表的文件从新提交原样覆盖过来，改上面的提交号。
2. `python3 legacy/tools/mkart.py`：哪条替换规则对不上会直接报错，照着核对。
3. `python3 kit/workshop.py gallery art art_vertical`，看图，确认后 `--accept`。
