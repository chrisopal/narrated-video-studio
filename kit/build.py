#!/usr/bin/env python3
"""讲解视频工坊 · 构建脚本（在项目目录里运行：python3 ../kit/build.py <命令>）
项目目录：brief.json（题材、风格、受众）  script.json（[{id,ch,vo,tts?,hold?}]）  scenes.js（window.FILM）
          facts.json（断言台账）  assets.json（素材台账：图片和视频）  footage/（原始视频）  audio/<id>.wav  short.json（竖版，可选）
命令（按制作顺序）：
  study 参考片.mp4 [阈值]   拉片：切点、镜头时长、节奏数据、联系表 → study/<名字>/（只学结构，不进成片）
  probe                    看素材：footage/ 里每条视频的时长/尺寸/切点/静音段 + 带时间码的联系表 → footage/_index.json
  transcribe 文件名或素材id  把素材里的讲话转成带时间的句子 → footage/<名字>.transcript.json；assets.json 的 in/out 可写 "@s3"/"@s5"
  look                     宣传片：按 brief.json 的 product（产品类型和特性词）给样子、动效、配乐、拍速的建议
  talk [口播视频]          口播线：转写一条录好的口播，写出 script.json 草稿，按留下的句子剪好（收紧长停顿），生成逐字时间和 talk 片段；brief 要写 "mode":"talk"
  pick 文件名 [个数]        挑镜头：按清晰度、亮度、运动量、时长给镜头打分，列出候选入出点 + 联系表 footage/_sheets/<名字>_pick.jpg（只建议，不改台账）
  clips                    按 assets.json 里的入出点切片、统一成 30 帧、拆帧 → clips/<id>/
  facts                    检查断言台账 facts.json
  lines                    写出 lines.txt（id|朗读文本[|语气提示]），交给配音脚本；语气来自句子的 tone 或 brief.voice.style
  timeline                 配音时长（有 audio/words.json 就用逐字时间）→ timeline.json + vo.wav
  stills 3,10,20 [目录]    抽帧检查
  anatomy [时刻,…] [--step 秒] [--out 目录]  器物解剖包：几何审计（遮挡顺序、穿模、管线端头、悬空）和线头检查，逐条列出并圈在画面上（check 里每秒量一帧）
  zoom 时刻 x,y,宽 [目录]  推近审看：以 1 倍画面的坐标框一块（高按画幅比例），按矢量重画放大到整幅 → zoom/（宽 480 就是四倍）
  sheet [间隔秒]           整片总览图（每 5 秒一帧，9 帧一张）→ sheets/
  （文章转视频：先用 python3 ../kit/article.py fetch 网址，见 templates/文章转视频.md）
  check [--no-motion]      交付前总检查：断言、素材授权、回听、口播校对（口播线）、阅读时长、出画、字幕带、重叠、小字、空档、动效、镜头节奏（宣传线） → check_report.json
  beats 音乐文件            量一条音乐的速度和第一拍的位置，给出要写进 brief.json 的 bpm、beat_offset（卡点的片子用）
  motion                   动效数字：每句的运动面积、静止帧对、跳变、每帧耗时，全片的确定性（同一时刻画两遍是否一样）
  render [out.mp4]         横版无声视频
  mix                      配乐 + 音效 + 素材原声（有旁白处自动压低）+ 配音 → mix.wav（响度 -14 LUFS）
  final 名字 [--force]     封面 2 秒 + 正片 + 音轨 → <名字>.mp4、<名字>.srt、素材来源与授权.txt
  cover                    封面_横版.png / 封面_竖版.png
  short check|stills|render 名字  横版片另出的竖版短片（short.json：[{id,vo,src:[[句id,比例],[句id,比例]]}]）：先 check（竖版自己的检查），render 要求它通过且是当前这一版
配音回听是单独的脚本：python3 ../kit/asr.py
模板台账、回归样张、复盘是工坊级的脚本：python3 ../kit/workshop.py
brief.json 里和构建有关的字段：packs 风格包列表；music 配乐（keys 缺省，键盘铺底 / cosmos 太空感的长音和钟声 / pad 低沉长音 / guqin 五声拨弦 / 文件路径）；lang 画面上的字用哪种语言（zh / en / bi）；music_gain 配乐整体加减几分贝；sfx:false 不加音效；read_cps、read_pad 阅读速度；
          duck 旁白下素材原声压低的分贝数（缺省 12；false 不压低，原声和音效同轨，即旧做法）
          tiers_required:true 断言台账每条都要填 tier（来源层级）；must_show:[…] 画面上必须清楚出现 ≥2 秒的声明
          mode 三条线：explain 讲解线（缺省）/ talk 口播线（声音是录好的原声，时间轴跟原声走；talk:{file, speaker, max_pause 停顿超过几秒就收紧（缺省 0.7）}）/ promo 宣传线（字按扫一眼算、两秒不动就提醒、多查一项“镜头节奏”、片头缺省不垫封面）；宣传线另有 slogan 口号、shot_max 单个镜头上限秒数（缺省 4）、pace_avg 平均镜头上限（缺省 2.5）
          bpm 节拍网格（每分钟几拍；写了它，每一句都从拍点上开始，分场里可以用 beatT、barT、pulse 卡点）；meter 一小节几拍（缺省 4）；
          beat_offset 网格上某个小节第一拍在片中的秒数（用自己的音乐时写，build.py beats 会量出来；合成配乐不用写）
script.json 里一句可以写 "silent":true,"dur":秒数 表示无旁白段落（只有画面和配乐）；有 bpm 时可以写 "beats":拍数 或 "bars":小节数 代替 dur
"""
# 代码按用途分在 kit/studio/ 下：base 配置和小工具、sound 声音、voice 时间轴和字幕、state 版本指纹、footage 素材层、
# talk 口播线、page 浏览器和整片扫描、checks 检查、short 竖版短片的检查、cli 每个子命令。这里把它们的名字都导出来，
# 测试和别的脚本照旧 import build 就能用 build.timeline、build.fingerprint 这些。
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from studio.base import *
from studio.sound import *
from studio.voice import *
from studio.state import *
from studio.footage import *
from studio.talk import *
from studio.page import *
from studio.checks import *
from studio.short import *
from studio.cli import main

if __name__ == '__main__': main(__doc__)
