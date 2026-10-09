---
name: narrated-video-studio
description: 做讲解类和叙事类视频：科普、历史、人物传记与行迹、行旅日记、小人物与大时代、AI 与科技、小说文学、工业零部件、制造业隐形冠军、企业介绍、生产流程、数据、新闻与谣言核查。从一句提示词出发拆出受众和情绪，比较三个不同的叙事方向（视角、结构、钩子、声音、画面母题）再动手，配音按方向定声音和语气；横版长片之外，能原生做抖音、小红书、视频号的竖版（9:16、3:4，带平台安全区检查）。十九套风格包，可把自有或授权的视频素材转写、挑镜头、重新剪辑；工具箱在 GitHub 仓库 chrisopal/narrated-video-studio，每条片做完把好用的东西沉淀回仓库。用户说“做一条视频”“讲清楚某某”“讲一个故事”“发抖音/小红书/视频号”“讲一家隐形冠军企业”“把这些素材剪一条”“像东坡那条那样做”时使用。
---

# 讲解视频工坊

一套引擎，几层可换的东西：

| 层 | 是什么 | 在哪 |
|---|---|---|
| 叙事与创意 | 这一条从哪个角度讲、按什么顺序讲、用什么声音讲：拆提示词、三个方向、叙事手法库、逻辑线 | `templates/叙事与创意.md` |
| 题材模板 | 这类内容怎么讲：节拍、占比、常见错 | `templates/题材模板.md` |
| 风格模板 | 画面长什么样：配色、字体、背景、画面语法 | `templates/风格模板.md`，预设在 `kit/kit.js` 的 `THEMES` |
| 组件 | 时间轴、人名条、引文、大数字、图表、流程、对比、标注、视频片段 | `kit/components.js` |
| 风格包 | 一整套画法：从旧片收的五套（水墨、固定人物、行迹地图、石印画报、漆屏风），自己实现的十四套（发光、形变、白板、拼贴、动态文字、等距、全息、录屏、简笔角色、讲解员、铜版画、木刻、案卷、产业图谱） | `kit/packs/*.js`，用法在 `templates/风格包.md` |
| 素材 | 照片和视频片段，带授权台账；收集来的视频可以转写、挑镜头、重新剪辑 | 项目的 `assets.json`、`footage/` |
| 画幅与平台 | 横版 16:9；抖音、视频号 9:16；小红书 3:4；各带安全区 | `templates/竖版与平台.md` |

模板库是活的：每一项都在台账 `templates/registry.json` 里，有状态（收件箱 → 候选 → 稳定 → 退役）、出处、用在过哪些片子。开工先看台账，收工做复盘，把这条片里好用的东西沉淀回去（第 14 步）。

流程和检查对所有题材都一样。两条硬规矩：

- 断言不靠记忆。数字、年份、人名、引语、荣誉、因果，查到来源再写进稿子。
- 不凭感觉交付。`check` 有不通过项不出片；提醒项逐条看帧后处理，或写明为什么保留。

每期交付：成片（封面 2 秒 + 正片；横版或原生竖版，看平台）、横版片另出的竖版短片（重写旁白，不是硬裁；用户不要可以不做）、封面、`.srt` 字幕、断言台账、`导演阐述.md`、`素材来源与授权.txt`；发短视频平台的再加 `发布文案.md`。

## 工坊在哪

**唯一的源头是 Git 仓库** `https://github.com/chrisopal/narrated-video-studio`（下文叫“工坊”）。这个 skill 的目录就是工坊：`SKILL.md`、`kit/`（引擎、风格包 `packs/`、回归样张 `gallery/`）、`templates/`（模板库和台账）、`legacy/`（收编的旧片源码和生成风格包的脚本）。不要在别处另存一份 `kit/` 或 `templates/`；任何改动都提交回仓库。

开工先拿到工坊：

- **本机（Claude Code）**：工坊就是 skill 所在目录 `${CLAUDE_SKILL_DIR}`（通常是 `~/.claude/skills/narrated-video-studio`），先 `git -C <工坊> pull`。
- **云端工作区**（每次是新的）：`git clone https://github.com/chrisopal/narrated-video-studio`；仓库不公开时先把它接入会话再克隆。要把改动推回去，需要有这个仓库的写权限。
- 只有一份上传的 `SKILL.md`、身边没有 `kit/`：按上一条克隆。

项目不放进仓库。找一个工作目录，在里面给引擎做个链接，项目建在同级，下文所有命令都在项目目录里运行：

```sh
mkdir -p ~/video-work && cd ~/video-work && ln -sfn <工坊绝对路径>/kit kit    # 云端：/home/claude/work；链接用绝对路径
mkdir 我的项目 && cd 我的项目 && python3 ../kit/build.py              # 不带参数看全部命令
```

依赖：Python 3 的 playwright（要有 Chromium；云端浏览器已在 `/opt/pw-browsers`，不要再装）、ffmpeg、numpy、soundfile、Pillow。水墨等风格的宋体用本机的思源宋体（Noto Serif CJK SC）。回听另需 `pip install sherpa-onnx pypinyin`（云端加 `--break-system-packages`）和识别模型（约 240 MB，不在仓库里）：

```sh
mkdir -p ../kit/models && cd ../kit/models && curl -sL -o m.tar.bz2 https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-paraformer-zh-2023-09-14.tar.bz2 && tar xjf m.tar.bz2 && rm m.tar.bz2
```

配音密钥：OpenRouter 的密钥存成工坊根目录的 `openrouter_key.txt`（一行，已在 `.gitignore` 里），或环境变量 `OPENROUTER_API_KEY`。不要读出来、不要写进任何别的地方、不要提交。没有密钥就用 `kit/tts.sh`（edge-tts，免费）。

云端和用户电脑怎么分工：查资料、画面、渲染、回听、切片可以在云端；配音要联网调接口，云端出不去时在用户电脑上的那份工坊里跑（先找 `~/Development/narrated-video-studio`、`~/.claude/skills/narrated-video-studio`，找不到就问用户克隆在哪）；用户的原始视频在他电脑上，取到项目的 `footage/` 再处理。成片和项目文件最后存到用户指定的位置（没说就是 `~/Movies/<项目名>/`）。

## 流程

### 1. 立项：读提示词、比方向、定题材风格 → `brief.json`

**先想“这一条为什么要这样讲”，再套题材卡和风格。** 照 `templates/叙事与创意.md` 做：

1. **拆提示词**：讲什么、给谁看、要观众带走的一句话、情绪、平台和长度、参考、禁区、必须有；再看“隐含信号”（提到具体人名年份 → 要故事；“讲清楚” → 问题链或拆解；“温情” → 慢、留白；发抖音 → 竖版、前 2 秒有钩子）。空着的格子：用户在场就问一到三个带选项的问题，不在场就按最可能的补并标“推断”。
2. **写三个方向**：每个四五行（logline、视角、结构、钩子、情绪曲线、声音、画面母题、结尾回扣、风格包、风险）。三个方向在视角、结构、钩子、声音、画面母题五样里**至少三样不同**。结构从手法库里选：一物一史、问题链、拆解、旅程、日记书信体、双线对照、悬念倒叙、器物视角、对质、倒计时、数字串、你以为其实、清单体、问答体，或者写明自创的。
3. **选一个**：用户在场时把三个方向摆给他挑（比改片便宜得多）；不在场就自己选并写明理由。选中的写进 `brief.direction`，另外两个写进 `direction.alternatives`；声音写进 `brief.voice`。
4. **写 `导演阐述.md`**（一页）：提示词拆解、三个方向和选择、逻辑线、声音、画面母题和招牌镜头、平台。审稿审片都照它判断。
5. 要发短视频平台：`brief.platform` 写 `douyin` / `channels` / `xhs`，画幅、安全区、字幕跟着变（`templates/竖版与平台.md`）。

再运行 `python3 ../kit/workshop.py status`（在项目目录里；在工作区根目录就是 `python3 kit/workshop.py status`）看台账：哪些是稳定的，哪些候选“再用一条就能晋级”，收件箱里有什么待试。选模板的规矩：

- 主体用稳定项；每条片子最多带一两个候选或收件箱条目来试，不要整片都是没验证过的东西。
- 两个都合适时，优先给“还没在成片里用过”的候选机会。
- 用户说“像某某那条那样做”：在台账的 `films` 里找到那条片的题材、风格、风格包，照着起步。

读 `templates/题材模板.md` 里对应的那张卡，再从 `templates/风格模板.md` 选一套风格。速查：

| 题材 | 风格预设 | 章节条 | 常用组件 |
|---|---|---|---|
| 科普原理 | space / sky / lab | question | threeCards callout bigNumber compare2 |
| 历史事件 | archive（古代史可用 ink） | date | dateStamp timeline lowerThird quoteCard clip sourceTag |
| 人物传记 | archive / space / ink | date | timeline photoCircle quoteCard lowerThird |
| AI 与科技 | keynote（讲机制用 lab、space） | label | clip callout highlight compare2 bigNumber specTable |
| 小说与文学 | ink | label | quoteCard chapterCard timeline compare2 |
| 工业零部件 | blueprint | question | callout specTable compare2 bigNumber flowSteps clip |
| 企业介绍 | swiss / keynote | label | bigNumber timeline clip lowerThird quoteCard barChart |
| 生产流程 | blueprint / swiss | step | flowSteps clip callout bigNumber compare2 |
| 数据解读 | chart | label | bigNumber barChart lineChart sourceTag |
| 新闻解读 | archive | date | dateStamp timeline quoteCard highlight sourceTag stamp |
| 人物行迹（一张地图讲一个人的一生） | songink + 包 ink figures map | none | makeMap layer chapter vtext sealStamp scholar |
| 行旅日记（跟着一本日记走一条路） | litho + 包 ink figures map litho | none | page plate counter narr poem makeMap official |
| 双线叙事（小人物与大时代） | lacquer + 包 ink lacquer | none | screen side from/vis/upto wom emp tag |
| 制造业隐形冠军（减速器、新材料、人形机器人零部件） | industry + 包 industry（讲构造加 holo，讲厂区加 iso，要人串场加 host） | label / none | chainMap robotBody exploded shareRing vsLocal iconWall specTable clipFull lowerThird sourceTag |
| 第一人称经历、带笑点的讲述 | stick + 包 stick | none | beats stick say emote prop hold |
| 器物、工艺、零件构造的图版 | engrave + 包 engrave | label | plate etch hatch callNo loupe tint |
| 厚重的历史与文学 | woodcut + 包 woodcut | none | print carve gouge spot title rain |
| 谣言核查、“几条说法哪条是真的” | dossier + 包 dossier | none | folder card verdict tally halftone redact |

```json
{"title":"…","genre":"工业零部件","style":"blueprint","audience":"…","target_sec":60,"read_cps":4.5,"read_pad":1.5,
 "direction":{"logline":"一句话：讲什么 + 为什么值得看","angle":"谁在讲、离事件多远","structure":"拆解","hook_type":"日常物件的反常","emotion":"好奇→意外→明白","motif":"轮子","callback":"轮子","alternatives":["方向 B 一句话","方向 C 一句话"]},
 "voice":{"model":"google/gemini-3.8-flash-tts","voice":"Charon","style":"清楚、平稳，像耐心的老师","persona":"讲解员"}}
```

可选字段：`"platform":"douyin|channels|xhs|bilibili|youtube"` 发布平台（定画幅和安全区）；`"aspect":"9:16|3:4|16:9"` 和 `"safe":[上,右,下,左]` 直接指定；`"packs":["ink","figures","map"]` 要加载的风格包；`"music":"guqin"` 五声拨弦配乐、每章换调（缺省是合成铺底；写成文件路径就用那条音乐，文件要进素材台账）；`"sfx":false` 不加音效（水墨一类安静的片子）；`"duck":12` 旁白时素材原声压低多少分贝（缺省 12，`false` 不压低）；`"tiers_required":true` 断言台账每条都要填来源层级 `tier`（企业、产业类必开）；`"must_show":["不构成投资建议"]` 片中必须出现的声明（检查要求整句至少清楚显示 2 秒）。

`read_cps` 是屏幕文字的阅读速度：给孩子看 4.5 字/秒，成年观众可到 6。

题材不在表里：选最接近的一张卡改，做完把新卡写进模板库（第 14 步）。用户没说风格就按方向选，方向也没指向就按表选第一个；企业片把信号色换成企业色（`themePatch:{a1:'#…'}`）。

题材卡的节拍是兜底的骨架，用来查有没有漏掉该讲的东西；**顺序和讲法以 `direction` 为准**。`check` 会拿这条片的视角、结构、钩子、声音、风格和台账里最近六条比，有三样一样就提醒“太像了”。

### 2. 拉片（有参考片或进入新题材时）

`python3 ../kit/build.py study 参考片.mp4`，按 `templates/拉片.md` 填镜头表，把骨架（顺序、占比、镜头时长、钩子做法）和皮肤（配色、角色、标志画面、原话、音乐）分开。只学骨架；原片不进成片。

### 3. 查证，建断言台账 `facts.json`

```json
[{"claim":"…","status":"verified","source":"https://…","note":"…","where":["c1","v2"]}]
```

| status | 用在 | 要求 |
|---|---|---|
| verified | 有权威来源的事实 | `source` 是网址 |
| inferred | 由证据推出 | `note` 写依据，稿子用“大约、可能” |
| conceptual | 教学简化、示意图 | 画面或旁白让观众知道 |
| quote | 原话、原文 | `source` 写出处：书名章节页码，或讲话的场合和日期 |
| opinion | 观点、解读、评价 | `note` 写是谁的观点，稿子里不说成事实 |

优先一手来源。自己算出来的数在 `note` 里写算法和适用条件。常见的说过头：把一组条件下的数字说成普遍数字；把“最早提出”说成“彻底弄清”；把次要原因和主要原因并列；拿最差的对照组做对比；一个定义把同类的另一种东西排除在外（说“轴承就是滚动的”，可滑动轴承也是轴承）。企业片里的“最、第一、领先、唯一”必须有已核实的事实支撑，否则检查会提醒。

讲企业、产业的片子，每条断言再填来源层级 `tier`：`政府名单`（工信部单项冠军、专精特新“小巨人”名单等）、`官方记录`（专利、标准、法规）、`公司披露`（招股书、年报、交易所公告）、`公司自述`（官网、宣传册、采访里公司自己说的）、`第三方报告`（研究机构、券商的统计）、`媒体`。检查会拦：公司自述标成 verified（要写 opinion，稿子里说“公司称”）；第三方报告的 `note` 没写是哪家机构、谁委托、按什么口径；媒体报道标成 verified 会提醒。份额、排名、“打破垄断”这类话最容易说过头，同一个数要写清年份和口径，以最新一份招股书或年报的说法为准。选题和找企业的路子见 `templates/选题库_制造业隐形冠军.md`。

### 4. 收集素材 → `assets.json`

按 `templates/素材与剪辑.md` 做。要点：

- 能进成片的有八种依据：`own` 自有、`licensed` 已获授权、`public-domain`、`cc0`、`cc-by`、`cc-by-sa`、`stock-free`、`excerpt` 引用片段。电影、电视剧、综艺只拉片，不进成片。
- “收集到的视频”要重新剪，先分清是谁的：用户自己拍的（展会、工厂参观，`own`，出镜的人要同意）、企业书面授权的（请求函模板 `templates/素材授权请求函.md`）、图库按许可可用的（Pexels、Pixabay、Wikimedia 各按自己的条款）。
- 企业宣传片、发布会视频、媒体报道、平台上别人的视频，版权在对方。有书面授权最好（`licensed`，台账写授权人、范围、日期，`proof_file` 放凭证，见 `templates/来源与许可.md`「企业素材授权」）；用户决定直接引用时标 `excerpt`：`source` 写下载页面网址、`owner` 写版权方、`credit` 写画面上的来源，每段不超过 15 秒、合计不超过全片 30%（检查会拦），旁白要在讲它。注明来源不等于获得授权，交付时列出引用了哪些、来自哪里。工具箱不带批量抓取视频网站的功能，下载的视频由用户放进 `footage/`。
- 下载任何文件之前，把文件名、来源、大小告诉用户并得到同意。用户自己的素材从他电脑上的文件夹取。
- 原始视频放 `footage/`，`build.py probe` 出时间码联系表、切点、静音段；看图选入出点，写进台账；`build.py clips` 切片。
- 素材多时 `build.py pick 文件名 [个数]` 按清晰度、亮度、运动量、时长列出候选镜头和联系表（只建议）；有人讲话的素材 `build.py transcribe 文件名或素材id` 转成带时间的句子，台账 `in`/`out` 写 `"@s3"`/`"@s5"` 按句子切。
- 先写这一拍“观众要看到什么”，再找画面。用一条素材里最好的几秒；动作和一句话保持完整；入出点避开切点。
- 默认画面全部用代码画。照片和视频是给“必须看到真东西”的那几拍用的：真人、真设备、真现场、真界面、真档案。

### 5. 写稿 `script.json`

```json
[{"id":"a0","ch":"它在哪里","vo":"字幕文本","tts":"朗读文本（可选）","hold":1.2}]
```

- 按 `direction` 的结构写，题材卡的节拍拿来查漏。每句标 `"beat"`：钩子 / 铺垫 / 推进 / 转折 / 揭示 / 高潮 / 回扣 / 收束。开头抛出的问题标 `"ask":"问题名"`，回答它的那句标 `"answer":"问题名"`；`direction.callback` 那个词在前三句和后三句里都要出现。`check` 的“叙事线”会查：问了没答、先答后问、中段没有转折揭示、结尾不回扣。
- 要特别语气的句子写 `"tone"`（如转折那句“放慢、放轻，带一点意外”）；全片语气写在 `brief.voice.style`。
- `ch` 是章节：question 样式写成观众会问的问题；date 样式写成“1969｜登月”；step 样式写工序名。
- `tts`：字幕和朗读写法不同时用（字幕“1871 年”，朗读“一八七一年”）。
- `hold`：这句说完多留几秒看画面。结论、数字、列表、片段之后都要留。原声拥有的那一拍靠前一句的 `hold` 留时间。
- 一句超过 60 字就拆；一句里有两组数字加一次比较也要拆。新词第一次出现用半句话解释，全片只用一个说法。
- 开头 3 秒内有钩子；结尾回答开头（片名问的是轮子，结尾就回到轮子）；结尾提到的东西前面必须讲过。先原因后结果。
- 旁白只说画面上看得见或马上要出现的东西。
- 竖版短片另写 `short.json`（6–9 句，40–70 秒，一条完整的线）：`[{"id":"v0","vo":"…","src":[["a0",0.35],["a0",1.0]]}]`，`src` 是配哪一段正片画面。

### 6. 渲染前审稿

让一个没参与写稿的 agent 审 `script.json`、`facts.json` 和 `导演阐述.md`：稿子有没有做到导演阐述里选的那个方向（还是又写回了老样子）；逻辑线五条（`叙事与创意.md` 第四节：一问一答成对、每章回答一个问题、因果不跳步、中段有转折、结尾回扣）；断言有没有说过头、对比公不公平、因果有没有缺口、目标观众有没有听不懂的词、开头结尾是否呼应、观点有没有被说成事实。先改稿再配音。这一步不能跳。

### 7. 配音

`python3 ../kit/build.py lines` 写出 `lines.txt`，放到用户电脑的项目文件夹，在那一侧运行：

```sh
python3 <工坊>/kit/tts_openrouter.py run lines.txt google/gemini-3.8-flash-tts Charon   # 声音按 brief.voice；lines 命令会把完整命令打出来
python3 <工坊>/kit/tts_openrouter.py voices google/gemini-3.8-flash-tts Charon,Kore,Puck,Sulafat "最有情绪的那一句" "语气提示"   # 试音
```

**声音跟着方向走，不要每条都一个声音一个速度。** 先定人设（`brief.voice.persona`），再试几个声音，用户听过再定；Charon、Kore、Puck、Sulafat 2026-10 实测都能用。`lines.txt` 第三栏是语气提示（来自句子的 `tone` 或 `brief.voice.style`），配音脚本走接口的 `instructions` 字段：实测 Gemini 会照提示变低、变慢，提示本身不会被读出来。**不要把语气提示写进朗读文本前面**，那样会被原样念出来。已经有 mp3 的句子自动跳过，要全部重配加 `--redo`。

用户另有选定的声音就用他的。没有密钥用 `tts.sh`（edge-tts）。在用户电脑上跑时要在前台按批跑（每次调用 170 秒以内，大约二十句），不要放后台：命令一结束后台进程就会被收掉；每批开始前把已经有 mp3 的句子跳过。音频取回后转成 `audio/<id>.wav`（`ffmpeg -i x.mp3 -ar 44100 -ac 1`）；给成年观众时 Charon 偏慢，可以加 `-af atempo=1.1`，转完照样跑回听。只改了几句就只重配那几句。新闻、企业这类题材如果用户想换声音，先用 `voices` 模式试音。

### 8. 回听 `python3 ../kit/asr.py`

把配音转回文字，按拼音和稿子比对，并写出每个字的发音时间。不通过的句子重配或改写；只差个别字的，把具体的字告诉用户请他听，确认后在那一句加 `"asr_ok": true`。它查读错、漏读、多读，查不了语气。

### 9. 分场 `scenes.js`

用风格包的片子先读 `templates/风格包.md`（每个包的函数、参数、一段能跑的例子），并且把整份 `scenes.js` 包在 `(() => { const {…} = PACK.ink; window.FILM = {…}; })();` 里——包里的名字和通用组件有重名（`stamp`、`lerp`），不包会报重复声明。无旁白的段落在 `script.json` 里写 `{"id":"p0","ch":"序","silent":true,"dur":13}`：没有配音和字幕，只有画面和配乐；整条片都可以是无旁白的（《东坡》《河海昆仑录》就是）。

**竖版**（`platform` 是抖音、视频号、小红书时）：画布是 1080×1920 或 1080×1440，`W` `H` 跟着变。坐标一律从 `const B = safeBox();` 取（平台按钮、文案、字幕都盖不到的那块），纵向位置按 `B.y + B.h * 比例` 写，同一份 `scenes.js` 换 9:16 和 3:4 都不出界；一屏只讲一件事；样片是 `kit/gallery/vertical/`（一封没寄出的信）。

`python3 ../kit/build.py timeline` 后，`at(句id,'关键词')` 返回这个词实际读出的时刻。画面上每样东西都挂在关键词上，不写死秒数。

```js
window.FILM={theme:'blueprint', chrome:'question',   // 章节条：question | label | step | date | none
 chapters:[…], questions:5, themePatch:{…},
 cover:{pill,title,line1,line2,tagline,shortSub,name,credit,art(c,cx,cy,R){…}},
 scenes(t){ scn(t,T('a0'),N('a0'),()=>{ … }); … }};
```

取时：`T(id)` `N(id)` `at(id,'词',偏移)`。缓动：`seg eo eio expo back lerp cl rnd`。颜色和字体从主题取：`TH.ink TH.dim TH.note TH.a1 TH.a2 TH.a3 TH.card`，`TH.f.t`（标题字体）`TH.f.b`（正文）。这样换风格不用改场景。

| 组件 | 调用 | 用在 |
|---|---|---|
| 基础 | `txt rise pop pill card arrow dash wave glow person photo photoCircle` | 随处 |
| 文字 | `wrap(s,宽,字号)` `para(…)` `numtxt(s,x,y,字号,色,对齐)` | 折行、粗体数字 |
| 人名条 | `lowerThird(t,t0,'姓名','身份',x,y,t1)` | 谁在说话、这是哪里 |
| 年代戳 | `dateStamp(t,t0,'1969','一行说明',x,y)` | 历史、新闻 |
| 时间轴 | `timeline(t,t0,[{tag,label,at}],{y,x0,x1})` | 历程、人生、事件线 |
| 引文 | `quoteCard(t,t0,'原话','出处',x,y,w)` | 必须有出处 |
| 大数字 | `bigNumber(t,t0,{value,unit,label,note,prefix,decimals},x,y,字号)` | 念到 t0 时落定 |
| 柱图 | `barChart(t,t0,[{label,value,hi}],x,y,w,h,{title,unit,source,decimals})` | 一根主角，其余退灰 |
| 折线 | `lineChart(t,t0,[{label,v}],x,y,w,h,{title,unit,dur,marks:[{i,label}],source})` | 线头经过时出标注 |
| 参数表 | `specTable(t,t0,[['项','值']],x,y,w,{title})` | 规格、口径 |
| 流程 | `flowSteps(t,[{label,sub,at}],x,y,w)` | 工序，当前步高亮 |
| 对比 | `compare2(t,t0,{title,lines},{title,lines},{y,h,tR})` | 前后、新旧、两种方案 |
| 标注 | `callout(t,t0,px,py,lx,ly,'名称','说明',色)` | 指着零件、界面、照片讲 |
| 来源 | `sourceTag(t,t0,'来源：…')` | 数字、截图旁边 |
| 荧光笔 | `highlight(t,t0,x,y,w,h)`（写在被划的文字之前） | 截图、引文里正在念的那句 |
| 图章 | `stamp(t,t0,'已核实',x,y)` | 定论、合格 |
| 章节卡 | `chapterCard(t,t0,t1,序号,'标题','一句话')` | 长片分章 |
| 三张卡 | `threeCards(t,id,'标题',[{tag,title,sub,at,subAt,titleAt,icon}])` | 收尾总结，先原因后结论 |
| 视频片段 | `clip('素材id',t,t0,x,y,w,h,{from,speed,sound,credit,fit,kb,fade,t1})` `clipFull(id,t,t0,t1,{…})` `clipSound(id,t,t0,{from,gain,t1,fadeIn,fadeOut})`；转场 `xfade(t,tCut,d,画A,画B)` `dipTo(t,tCut,d,色,画A,画B)` `wipe(t,tCut,d,方向,画A,画B)`（详见 `templates/素材与剪辑.md`） | 真设备、真现场、真界面；fit 铺法 cover/contain/blur，kb 推拉摇，clipSound 做 J/L-cut，原声在旁白下自动压低 |
| 片尾 | `credits(t,t0,[…])` `creditLines()` | 依据、素材署名 |
| 声音 | `sfx('ding',时刻)`：`pop tick whoosh ding rise thud` | 结论落地用 ding，展开用 rise |

题材特有的图（零件、地图、界面、人物关系）在 scenes.js 里自己画成函数，用主题色；画得好、别的片子也用得上，就在复盘时收进 `components.js`（第 14 步）。

分场的规矩：

- 旁白提到什么，那一刻画面就有反应。任何一段不能 4 秒以上完全不动；补的动作必须是内容，不是装饰。
- 重点文字 40 像素以上，任何文字不小于 32 像素（竖版不小于 40，引擎会把小字自动放大到 40）；说明文字用主题的 `TH.note`。
- 画面底部 120 像素是字幕带，别的文字不进去（竖版的字幕带在安全区底边上方，`safeBox()` 已经把它让出来了）。
- 文字不压在图形和别的文字上；文字退场后新东西再占那块地方。一块面板盖住旧内容时，旧内容要真的停画，不能只是被挡住。
- 示意图标“示意图，未按比例”；模拟界面标“演示画面”；剪影代替真人标“示意头像，非本人照片”；片段默认显示署名。
- 数据作图：坐标从零开始；区间就画成区间，不要用一根柱子代表；示意数据要写“示意”；图上的数和旁白一致。
- 会动的机构按真实的运动关系画（谁带着谁转、转多快），画不准就别让它动。
- 同一种图形符号全片只表示一个意思（放射短线不能一会儿是摩擦、一会儿是固定）。

### 10. 检查 `python3 ../kit/build.py check`

先抽帧自己看：`python3 ../kit/build.py stills 3,10,20 [目录]`（时刻用逗号连成一个参数），或 `sheet 5` 出整片总览图。

| 项 | 查什么 | 不过怎么办 |
|---|---|---|
| 断言台账 | 状态和来源齐全；带数字的句子有事实指向；极限词有依据 | 补查证或改稿 |
| 素材授权 | 依据在允许范围内、来源作者齐全、该署名的有署名、用到的片段都在台账里 | 补台账、换素材或撤下 |
| 配音回听 | 稿子和配音一致、回听没过期 | 重配或重跑 `asr.py` |
| 阅读时长 | 每段文字停留 ≥ 字数÷read_cps + read_pad 秒 | 让文字早出现、加 `hold`、缩短文字 |
| 文字出画 | 没有被裁边的文字 | 挪位置或缩字 |
| 字幕带、重叠、小字 | 提醒 | 看那一帧再决定 |
| 画面空档 | 4 秒以上几乎不动 | 加一个和旁白对应的动作 |
| 开场 | 2 秒内有内容出现 | 把第一个画面提前 |
| 字体缺字 | 毛笔体、草书里没有的字（会变成楷体） | 换字、换成宋体，或征得同意后装全字库 |
| 来源层级 | `tier` 合法；公司自述没被标成已核实；第三方报告写了机构和口径；`tiers_required` 时每条都填 | 改台账，稿子里改成“公司称”“据某机构统计” |
| 必须出现的声明 | `must_show` 里每一句都在画面上清楚停留 ≥2 秒 | 在片头或片尾加上 |
| 叙事线 | `direction` 写了没有、logline 一句话说得清、比过别的方向；问了要答、先问后答；中段有转折或揭示；结尾回扣；和最近六条片子不太像 | 回到第 1、5 步改方向或改稿 |
| 平台遮挡区（竖版） | 字在安全区外面停留超过 0.5 秒（会被平台的标题、文案、按钮盖住） | 坐标从 `safeBox()` 取 |

检查只认识文字框，看不出文字被图形盖住、图画错了、画面和旁白对不上、片段选得好不好。所以还要 `python3 ../kit/build.py sheet` 生成总览图，自己逐张看一遍。

### 11. 独立审片

把 `sheets/`、`script.json`、`facts.json`、`assets.json`、`timeline.json`、`导演阐述.md` 交给一个没参与制作的 agent，按六项审：创意（导演阐述里的方向、招牌镜头、声音有没有兑现）、断言、结构、语言、画面、版权与隐私。只报问题，每条带时间码和改法，最后给“通过 / 改后通过 / 不能发”。改完重跑 `check`。它没看到的时间段自己补看。如果没能做到独立审片，或改完后没有再审一轮，交付时要说明。

### 12. 出片

```sh
python3 ../kit/build.py mix                 # 配乐 + 音效 + 素材原声 + 配音，-14 LUFS
python3 ../kit/build.py cover               # 横版：封面_横版.png / 封面_竖版.png（3:4）；竖版：封面_9x16.png / 封面_3x4.png
python3 ../kit/build.py render              # silent.mp4；后台跑，日志出现 done 即完成
python3 ../kit/build.py final 名字           # 名字.mp4 + 名字.srt + 素材来源与授权.txt
python3 ../kit/build.py short stills        # 横版片另出竖版摘要：先看每句配的画面（原生竖版片不用）
python3 ../kit/build.py short render 名字_竖版短片
```

后台渲染用日志判断结束（`grep -q '^done' render.log`）。要中途停掉：`kill $(cat render.pid)`。不要用 `pkill -f`、`pgrep -f` 或 `ps | grep` 找 `build.py`，会匹配到发命令的那个 shell 自己。

### 13. 交付

- 超过 30 MB 发不出去，用 `ffmpeg -crf 25` 重压一份发，原片存回电脑。
- 存回 `~/Movies/<项目名>/`：成片、封面、`.srt`、`brief.json` `script.json` `scenes.js` `facts.json` `assets.json` `素材来源与授权.txt`、`配音/`、`复盘.md`。
- 发短视频平台的片子写 `发布文案.md`：每个平台一段标题、正文第一句、三到五个话题（规矩见 `竖版与平台.md`）。
- 告诉用户：选了哪个创意方向、为什么；时长；检查结果；回听里请他听的具体字；哪些是简化或示意；用了哪些外部素材和依据；我听不到声音，语气要他确认。

### 14. 复盘和沉淀（每条片都做，不做不算交付完）

工坊靠这一步越做越好。四样东西，都在 `templates/` 里，用 `python3 kit/workshop.py` 维护：

| 东西 | 文件 | 记什么 |
|---|---|---|
| 模板台账 | `registry.json` | 每张题材卡、每套风格、每个组件、每个风格包、每项检查：状态、出处、用在过哪些片子 |
| 回归样张 | `kit/gallery/` | 每个组件在每套风格下、每个风格包的样片定格；基线图在 `baseline/` |
| 经验库 | `经验库.md` | 踩过的坑，以及它现在落在哪：检查 / 模板默认值 / 流程 / 只是提醒 |
| 更新记录 | `更新记录.md` | 每次改了什么、因为哪条片 |

状态阶梯：**收件箱**（一个点子、别的 skill 或参考片里看到的做法）→ **候选**（已经写成代码、有样张，在一条片里试过）→ **稳定**（两条成片用过，且回归样张里有它）→ **退役**（最近六条片都没用上，或被更好的替代）。

收工时按这个顺序做：

1. 在项目目录运行 `python3 ../kit/workshop.py retro --delivered`。它自动统计这条片用了哪些现成的、自己新写了哪些函数、检查拦下了什么，写出 `复盘.md`，并把这条片记进台账（用过的条目 `used_in` 加一；还记下这条片的视角、结构、钩子、声音、平台，下次立项时“太像”的提醒就靠它）。
2. 把 `复盘.md` 里要手写的四段写完，每一条都要有去向，不留“以后再说”：
   - **新写的函数**逐个决定：沉淀（改成通用的，写死的内容变成参数，放进 `components.js` 或风格包，`workshop.py add comp.名字 --name … --from 片名 --symbols 函数名 --demo 样张名` 登记为候选，并在 `kit/gallery/` 加一张样张）／留在本片（写明为什么不通用）／并入已有组件。
   - **检查没拦下、靠审片或用户指出的问题**：`workshop.py lesson "教训" --from 片名 --state …`。先翻经验库有没有同类的：**同一类问题第二次出现，就不能再只记提醒，必须变成一项检查、一个模板默认值，或流程里的一步**。
   - **模板哪里别扭**：题材卡哪一拍没用上、哪个默认值每次都要改 → 直接改卡片和默认值，在更新记录里记一行。
   - **试用的候选和收件箱条目**：留（`promote`）、改、还是丢。
3. 用户改了我的稿子或画面：对比他的终版和我的提案，把差异记进经验库；同一类差异出现三次升级成模板默认值。
4. 从参考片（`study`）或别的 skill 看到想试的做法：`workshop.py inbox "做法" --source 出处`。用自己的话写，在 `来源与许可.md` 记来源和许可；AGPL、非商用、保留所有权利的项目只借思路，不搬代码和文字。
5. 只要动过 `kit/` 或风格包，运行 `python3 kit/workshop.py gallery`。它把所有样张重渲一遍和基线比，哪张变了会列出来。**先看图**：是想要的变化才 `--accept`；不是，说明这次改动弄坏了别的模板，回去修。
6. 该晋级的晋级：`workshop.py promote 编号`（条件不够会拒绝）。`kit/VERSION` 加一，更新记录写一行。
7. 把改动提交回仓库：在工坊里 `git add -A && git commit`（提交说明写清因为哪条片改了什么）`&& git push`。没有写权限就把补丁（`git format-patch`）交给用户。推完告诉用户在他电脑上的那份工坊里 `git pull`。仓库是唯一的源头：不要用拷文件的办法在两处各改各的。

给用户的交付说明里加一段“这条片给工坊留下了什么”：新增或晋级了哪些模板、新增了哪项检查、收件箱里记了什么。

把一条旧片收进工坊（像《东坡》那样）：取回它的源码放进 `legacy/`，画法原样留着，只在外面包一层命名空间，接合代码单独写（`legacy/tools/glue/`），用 `legacy/tools/mkpacks.py` 生成风格包；再做一条能跑的小样片放进回归样张。不要凭印象重画一遍。收完让一个没看过源码的 agent 只凭 `风格包.md` 做一条小样片，它卡住的地方就是文档要补的地方。

## 版权和安全

- 引用别人的视频只取短片段、标来源（`excerpt`），不整段搬运；影视剧不引用；不画已有的角色、标志、作品封面。
- 真人：公众人物用授权清楚的照片并署名；没有照片用通用剪影并标注。企业片里的员工、客户出镜，素材要来自企业并写明已获本人同意。
- 客户标志、客户评价、资质证书只用企业提供并确认可公开的。
- 配乐和音效由 `build.py` 合成，没有第三方素材。
- 密钥只在用户电脑的文件里，脚本自己读；不要让用户把密钥贴进对话。

## 已知的限制和坑

- 云端 shell 访问不了多数网站，也不支持 WebSocket；查资料用搜索和网页读取工具。
- 剪辑组件（`clipFull`、转场、`clipSound`、`transcribe`、`pick`）是用自己拍的样片验证的，还没剪过一条真实的长素材；`pick` 只按清晰度、亮度、运动量打分，看不懂内容，入出点要人看图定。
- 制造业隐形冠军题材卡和产业图谱包做过一条真实企业的成片（《一圈会弯的齿》，绿的谐波）；选题库里的企业资料按检索日期记录，用之前要重新核对最新的年报和公告。
- 行迹地图的海岸线、江河、山是旧片带来的数据，只覆盖中国及周边；地名表里没有的地方要在 `places` 里补经纬度，古今地名和位置要查证后进断言台账。
- 毛笔体和草书只带了旧片用过的一千一百多个字，缺的字会回落成楷体，`check` 的“字体缺字”会列出来：换字、换成宋体，或征得用户同意后装全字库。
- 原生竖版（9:16、3:4）已经支持：画布、安全区、字幕、封面、检查。竖版里实测过的组件列在 `竖版与平台.md`；横版专用的版式（`threeCards`、左右两栏对比、漆屏风两栏、讲解员 `layout`、行迹地图全景）在竖版里要自己重排，其他风格包第一次用先出几帧看。平台安全区是保守值，发布前在 App 里预览。
- 横版片的 `short` 竖版摘要仍然是把横版画面放进竖框，不是重排版。
- 语气提示（`instructions`）只在 Gemini 的 TTS 上实测过；别的模型可能忽略它，回听照样跑。
- 回归样张的基线是云端环境渲染的；换了机器或字体，第一次会全部报不同，看过图再 `--accept`。
- 五声拨弦配乐是程序合成的，够做底，不是真乐器；用户有授权的配乐就用他的。
- 视频片段的流程用自制片段验证过切片、取帧、署名、授权检查和原声混入；还没有用真实拍摄素材做过整片。
- 固定人物只有宋人文士和清末官员两个，没有女性、孩童、僧道、武人；主角不是这两类时要新画，不要硬套。
- 新做的风格包里，产业图谱用在过一条成片；简笔、讲解员、铜版画、木刻、案卷还只有样片和回归样张。
- 第 6 步审稿不能跳。跳过它直接配音，审片时发现的稿子问题就得整句重配。
- 往用户电脑传文件（如 `lines.txt`）时，刚写完马上传可能传的是旧版本：写完等几秒，传过去后在电脑那一侧核对一下内容（行数、关键字）。回听也能兜底：配音和稿子对不上会报不通过。
- 工坊有两处克隆（云端一份、用户电脑一份）时，开工先 `git pull`，收工必须 `git push`，否则下一次开工拿到的是旧模板。
- edge-tts 偶尔对个别短语返回空音频，换个说法即可。
- 封面 `tagline` 不会自动缩字，控制在 16 字内。
- 改了 `hold` 或句子顺序后，`short.json` 的 `src` 窗口要重看。
- 改了 `scenes.js` 之后 `check` 结果过期，`final` 会拒绝出片，重跑即可。
