# 第三方内容

本仓库自己写的代码、模板和文档按 MIT 许可（见 `LICENSE`）。下面这些不是本项目的作品，各按自己的许可使用，MIT 许可不覆盖它们：

| 内容 | 位置 | 来源和许可 |
|---|---|---|
| 思源黑体 Noto Sans SC | `kit/fonts/NotoSansSC-*.woff` | Google / Adobe，SIL Open Font License 1.1 |
| 霞鹜文楷 LXGW WenKai | `kit/fonts/LXGWWenKai-500.woff` | LXGW，SIL Open Font License 1.1 |
| Roboto Condensed | `kit/fonts/RobotoCondensed-var.woff` | Google，随字体发布的开源许可（Apache 2.0 或 OFL，视版本） |
| 毛笔体、草书子集 | `kit/fonts/brush/*.woff2` | 本项目旧片制作时取用的 Ma Shan Zheng、Zhi Mang Xing 的子集，均为 SIL Open Font License 1.1 |
| 东部细海岸线（`LAND_E`） | `kit/packs/map.js` | 取自 GSHHG 海岸线数据（经 basemap 数据文件），GNU LGPL |
| 全图粗海岸线（`LAND_W`） | `kit/packs/map.js` | 旧片带来的数据，**原始来源这次没有核对到**；介意的话换成自己确认过来源的数据 |
| 江河、湖、山、地名的经纬度 | `kit/packs/map.js` | 本项目手工录入的示意数据，不是测绘成果，不可作为地理依据 |
| 艺术引擎的各个库 | `kit/packs/art/`（`index.js` 除外，那是本项目写的接合层） | 改自 alchaincyf/huashu-art-motion，MIT License，Copyright (c) 2026 alchaincyf。许可全文在 `kit/packs/art/LICENSE`，取用的提交、改动和没取的部分在 `kit/packs/art/README.md`。上游作者的卡通形象不在 MIT 范围内，没有收进来 |
| Inter、Computer Modern Unicode、Press Start 2P | `kit/fonts/art/` | 各自作者，SIL Open Font License 1.1（`kit/fonts/art/OFL.txt`） |
| JetBrains Mono | `kit/fonts/gen/` | JetBrains，SIL Open Font License 1.1（`kit/fonts/gen/OFL.txt`） |

宋体不随仓库分发，渲染时用本机的思源宋体（Noto Serif CJK SC）或系统宋体。

做成片时用到的照片、视频、配乐不在本仓库里；每条片子自己的素材台账（`assets.json`）管它们的授权。
