# 讲解视频工坊（narrated-video-studio）

一个给 Claude 用的 skill 和它配套的工具箱：用代码画面 + 旁白（或无旁白 + 配乐）做讲解类、叙事类视频，出横版成片、竖版短片、封面和字幕。按题材选模板、按风格选画面，每条片子做完把好用的东西沉淀回模板库。

## 目录

| 路径 | 是什么 |
|---|---|
| `SKILL.md` | skill 正文：十四步流程、组件速查、规矩和已知的坑 |
| `kit/` | 引擎：`build.py`（每条片子的构建和检查）、`workshop.py`（模板台账、回归样张、复盘）、`kit.js` `components.js`（画面）、`asr.py`（配音回听）、配音脚本、字体 |
| `kit/packs/` | 风格包：水墨引擎、固定人物、行迹地图、石印画报、漆屏风（由 `legacy/tools/mkpacks.py` 生成，不要手改） |
| `kit/gallery/` | 回归样张：每个组件在每套风格下、每个风格包的样片定格和基线图 |
| `templates/` | 模板库：题材模板、风格模板、风格包用法、素材与剪辑、拉片、台账 `registry.json`、经验库、更新记录 |
| `legacy/` | 收编的三条旧片源码（《东坡》《河海昆仑录》《王钟儿》）和生成风格包的脚本 |

## 怎么用

把仓库放到 `~/Movies/视频工坊/`（或任何位置，`kit/`、`templates/`、`legacy/` 保持同级），项目建在 `kit/` 的同级目录里，在项目目录运行：

```sh
python3 ../kit/build.py            # 不带参数看全部命令
python3 ../kit/workshop.py status  # 模板台账总览
python3 ../kit/workshop.py gallery # 改了 kit 之后跑回归样张
```

依赖：Python 3、playwright（Chromium）、ffmpeg、numpy、soundfile、Pillow；配音回听另需 sherpa-onnx、pypinyin 和识别模型（见 `SKILL.md`）。

配音密钥放在工坊根目录的 `openrouter_key.txt`（一行），已在 `.gitignore` 里，不要提交。

## 版本

见 `kit/VERSION` 和 `templates/更新记录.md`。

## 第三方内容

- 字体：`kit/fonts/` 里的思源黑体（Noto Sans SC）、霞鹜文楷（LXGW WenKai）、Roboto Condensed，以及 `kit/fonts/legacy/` 里旧片内嵌的毛笔体、草书子集，版权归各自作者，按各自的开源字体许可使用。
- `kit/packs/map.js` 里的海岸线、江河、山的坐标是旧片带来的数据，原始来源尚未核对；公开发布前需要先查清。
- 其余代码、模板和文档是本项目自己写的。仓库目前没有附许可证。
