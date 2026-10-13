"""公共的配置和小工具：项目目录、brief.json、画幅和平台、三条线的阈值、断言和素材的词表；读 JSON、算哈希、读视频信息。所有模块都从这里取。"""

import json
import re
import sys
import os
import math
import base64
import subprocess
import threading
import http.server
import socketserver
import hashlib
import shutil
from pathlib import Path
import numpy as np
import soundfile as sf

# KIT 是工坊的 kit/ 目录（这个文件在 kit/studio/ 里，所以往上两级）
KIT = Path(__file__).resolve().parent.parent
P = Path.cwd()
FPS = 30
LEAD = 0.9
GAP = 0.55
COVER = 2.0
SPLIT = r'(?<=[，。：；？！])'
END = ('。', '？', '；', '！')
LUFS = -14


def jload(name, default=None):
    f = P / name
    return json.load(open(f, encoding='utf-8')) if f.exists() else default


BRIEF = jload('brief.json', {}) or {}
# 画幅和平台：brief 写 "platform":"douyin|channels|xhs|bilibili|youtube"，或直接写 "aspect":"9:16|3:4|16:9"（可再写 "safe":[上,右,下,左]）
# 竖版安全区是保守值（上约 15%、下约 30%、左 10%、右 15%）：平台的标题、文案、点赞评论按钮会盖住这些地方，发布前在 App 里预览一遍
PLATFORMS = {
    'douyin': {'name': '抖音', 'aspect': '9:16', 'safe': [288, 162, 576, 108]},
    'channels': {'name': '视频号', 'aspect': '9:16', 'safe': [288, 162, 576, 108]},
    'xhs': {'name': '小红书', 'aspect': '3:4', 'safe': [144, 108, 288, 86]},
    'bilibili': {'name': 'B 站', 'aspect': '16:9', 'safe': [0, 0, 0, 0]},
    'youtube': {'name': 'YouTube', 'aspect': '16:9', 'safe': [0, 0, 0, 0]},
}
SIZES = {'16:9': (1920, 1080), '9:16': (1080, 1920), '3:4': (1080, 1440)}
_PL = PLATFORMS.get(BRIEF.get('platform', ''), {})
ASPECT = BRIEF.get('aspect') or _PL.get('aspect') or '16:9'
if ASPECT not in SIZES:
    sys.exit(f'brief 的 aspect 只能是 {" / ".join(SIZES)}')
CW, CH = SIZES[ASPECT]
VERT = CH > CW
SAFE = (
    BRIEF.get('safe')
    or _PL.get('safe')
    or ([round(CH * 0.15), round(CW * 0.15), round(CH * 0.3), round(CW * 0.1)] if VERT else [0, 0, 0, 0])
)
COVER_NAME = {'16:9': '封面_横版.png', '9:16': '封面_9x16.png', '3:4': '封面_3x4.png'}[ASPECT]
# 两条线：explain 讲解线（缺省，旁白定节奏，字要读得完）；promo 宣传线（音乐拍点定节奏，字是几个字的大词，镜头短、有快有慢）。做法见 templates/宣传片.md
MODE = BRIEF.get('mode', 'explain')
if MODE not in ('explain', 'promo', 'talk'):
    sys.exit('brief 的 mode 只能是 explain（讲解线，缺省）、promo（宣传线）或 talk（口播线）')
PROMO = MODE == 'promo'
TALK = MODE == 'talk'
# 宣传片的样子（brief.json 的 "look"，风格包 promo）：配乐、拍速、镜头节奏的缺省值跟着样子走，brief 里写了的以 brief 为准
try:
    LOOKS = json.load(open(KIT.parent / 'templates' / 'promo_looks.json', encoding='utf-8'))
except Exception:
    LOOKS = {'looks': {}, 'kinds': {}}
LOOK = LOOKS['looks'].get(BRIEF.get('look') or '', {}) if PROMO else {}
if BRIEF.get('look') and PROMO and not LOOK:
    sys.exit(f"brief 的 look 只能是 {' / '.join(LOOKS['looks'])}")
for _k in ('music', 'bpm'):
    if LOOK and _k not in BRIEF:
        BRIEF[_k] = LOOK[_k]
if TALK:
    LEAD = 0.0
    GAP = 0.0  # 口播线：声音是录好的原声，时间轴就是剪好的那条口播，句子之间不另加停顿（做法见 templates/口播片.md）
READ_CPS = BRIEF.get('read_cps', 10 if PROMO else 6 if TALK else 4.5)
READ_PAD = BRIEF.get(
    'read_pad', 0.1 if PROMO else 0.2 if TALK else 1.5
)  # 阅读速度：给孩子看用 4.5 字/秒；成年观众可以调到 6；宣传线是扫一眼的大字，10 字/秒（120 拍时一拍一屏最多三个字）
READ_MIN = 0.4 if PROMO else 0.8 if TALK else 1.5
DEAD_SEC = float(BRIEF.get('dead_sec', LOOK.get('dead_sec', 2))) if PROMO else 8 if TALK else 4
# 口播线：字是边听边看的，人像一直在动，阈值都放宽
HOOK_SEC = 1.0 if PROMO else 2.0
SUPERLATIVE = re.compile(
    r'最[大小高低强快早好先多新佳优省贵长短远重轻深广全准稳难]|国家级|世界级|第一(?![步层次个件项章节条点种类阶段轮批期天年句])|唯一|领先|顶级|顶尖|首[个家创]|独家|全球[首最]|国内[首最]|100%|百分之百|绝对|完美'
)
# 允许进成片的素材依据。授权不明的素材只能进参考片单（study），不能进 assets.json
BASIS = {
    'own': '自有素材',
    'licensed': '已获授权',
    'public-domain': '公有领域',
    'cc0': 'CC0',
    'cc-by': 'CC BY',
    'cc-by-sa': 'CC BY-SA',
    'stock-free': '免费图库许可',
    'excerpt': '引用片段（注明来源）',
}
NEED_CREDIT = {'cc-by', 'cc-by-sa', 'licensed', 'excerpt'}
# excerpt：网上下载的企业宣传片、发布会、报道里的片段，为介绍和评论而引用。只用短片段、画面上标来源；注明来源不等于获得授权，用户自己决定承担这个风险
EXCERPT_MAX = BRIEF.get('excerpt_max', 15)
EXCERPT_SHARE = BRIEF.get('excerpt_share', 0.3)
TIERS = (
    '政府名单',
    '官方记录',
    '公司披露',
    '公司自述',
    '第三方报告',
    '媒体',
)  # 官方记录：专利、标准、法规这类政府或标准机构的文件
CJK = re.compile(r'[一-鿿]')
NUMISH = re.compile(
    r'\d|[一二两三四五六七八九十百千万亿]+(年|倍|万|亿|公里|千米|米|度|吨|岁|天|小时|分钟|秒|种|颗|层|成|分之)'
)  # 成、分之：“九成”“三分之一”也是要有出处的数

silent = lambda l: bool(l.get('silent')) or not (l.get('tts') or l.get('vo'))


# ---------- 素材层 ----------
def ffprobe(path):
    r = subprocess.run(
        ['ffprobe', '-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', str(path)],
        capture_output=True,
        text=True,
    )
    d = json.loads(r.stdout or '{}')
    v = next((s for s in d.get('streams', []) if s['codec_type'] == 'video'), None)
    a = next((s for s in d.get('streams', []) if s['codec_type'] == 'audio'), None)
    if not v:
        return None
    num, den = (v.get('avg_frame_rate') or '0/1').split('/')
    rot = int(
        float(
            v.get('tags', {}).get('rotate', 0)
            or next((sd.get('rotation', 0) for sd in v.get('side_data_list', []) if 'rotation' in sd), 0)
        )
    )
    w, h = (v['height'], v['width']) if abs(rot) in (90, 270) else (v['width'], v['height'])
    return {
        'duration': round(float(d['format'].get('duration', 0)), 3),
        'width': w,
        'height': h,
        'fps': round(float(num) / max(1, float(den)), 3),
        'has_audio': bool(a),
        'orientation': 'landscape' if w > h else 'portrait' if h > w else 'square',
    }


def sha(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for blk in iter(lambda: f.read(1 << 20), b''):
            h.update(blk)
    return h.hexdigest()


def tc(x):
    return f"{int(x // 60):02d}:{x % 60:05.2f}"


def load_pcm(path, sr=16000):
    r = subprocess.run(
        ['ffmpeg', '-v', 'error', '-i', str(path), '-vn', '-ac', '1', '-ar', str(sr), '-f', 'f32le', '-'],
        capture_output=True,
    )
    return np.frombuffer(r.stdout, dtype='float32').copy()


def need_seconds(s, pad=1.5):
    c = len(CJK.findall(s))
    o = len(re.sub(r'\s', '', s)) - c
    return max(READ_MIN, c / READ_CPS + o / 15 + READ_PAD)


def show(title, fails, warns):
    print(
        ('✗ ' if fails else '△ ' if warns else '✓ ')
        + title
        + (f'：{len(fails)} 项不通过' if fails else '')
        + (f'，{len(warns)} 项提醒' if warns else '')
    )
    for x in fails:
        print('    ✗', x)
    for x in warns:
        print('    △', x)
