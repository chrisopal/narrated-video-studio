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
  sheet [间隔秒]           整片总览图（每 5 秒一帧，9 帧一张）→ sheets/
  （文章转视频：先用 python3 ../kit/article.py fetch 网址，见 templates/文章转视频.md）
  check [--no-motion]      交付前总检查：断言、素材授权、回听、口播校对（口播线）、阅读时长、出画、字幕带、重叠、小字、空档、动效、镜头节奏（宣传线） → check_report.json
  beats 音乐文件            量一条音乐的速度和第一拍的位置，给出要写进 brief.json 的 bpm、beat_offset（卡点的片子用）
  motion                   动效数字：每句的运动面积、静止帧对、跳变、每帧耗时，全片的确定性（同一时刻画两遍是否一样）
  render [out.mp4]         横版无声视频
  mix                      配乐 + 音效 + 素材原声（有旁白处自动压低）+ 配音 → mix.wav（响度 -14 LUFS）
  final 名字 [--force]     封面 2 秒 + 正片 + 音轨 → <名字>.mp4、<名字>.srt、素材来源与授权.txt
  cover                    封面_横版.png / 封面_竖版.png
  short stills|render 名字 竖版短片（short.json：[{id,vo,src:[[句id,比例],[句id,比例]]}]）
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
import json, re, sys, os, math, base64, subprocess, threading, http.server, socketserver, hashlib, shutil
from pathlib import Path
import numpy as np, soundfile as sf
KIT = Path(__file__).resolve().parent; P = Path.cwd(); FPS = 30; LEAD = 0.9; GAP = 0.55; COVER = 2.0
SPLIT = r'(?<=[，。：；？！])'; END = ('。', '？', '；', '！'); LUFS = -14
def jload(name, default=None):
    f = P / name; return json.load(open(f, encoding='utf-8')) if f.exists() else default
BRIEF = jload('brief.json', {}) or {}
# 画幅和平台：brief 写 "platform":"douyin|channels|xhs|bilibili|youtube"，或直接写 "aspect":"9:16|3:4|16:9"（可再写 "safe":[上,右,下,左]）
# 竖版安全区是保守值（上约 15%、下约 30%、左 10%、右 15%）：平台的标题、文案、点赞评论按钮会盖住这些地方，发布前在 App 里预览一遍
PLATFORMS = {'douyin': {'name': '抖音', 'aspect': '9:16', 'safe': [288, 162, 576, 108]},
             'channels': {'name': '视频号', 'aspect': '9:16', 'safe': [288, 162, 576, 108]},
             'xhs': {'name': '小红书', 'aspect': '3:4', 'safe': [144, 108, 288, 86]},
             'bilibili': {'name': 'B 站', 'aspect': '16:9', 'safe': [0, 0, 0, 0]},
             'youtube': {'name': 'YouTube', 'aspect': '16:9', 'safe': [0, 0, 0, 0]}}
SIZES = {'16:9': (1920, 1080), '9:16': (1080, 1920), '3:4': (1080, 1440)}
_PL = PLATFORMS.get(BRIEF.get('platform', ''), {}); ASPECT = BRIEF.get('aspect') or _PL.get('aspect') or '16:9'
if ASPECT not in SIZES: sys.exit(f'brief 的 aspect 只能是 {" / ".join(SIZES)}')
CW, CH = SIZES[ASPECT]; VERT = CH > CW
SAFE = BRIEF.get('safe') or _PL.get('safe') or ([round(CH * .15), round(CW * .15), round(CH * .3), round(CW * .1)] if VERT else [0, 0, 0, 0])
COVER_NAME = {'16:9': '封面_横版.png', '9:16': '封面_9x16.png', '3:4': '封面_3x4.png'}[ASPECT]
# 两条线：explain 讲解线（缺省，旁白定节奏，字要读得完）；promo 宣传线（音乐拍点定节奏，字是几个字的大词，镜头短、有快有慢）。做法见 templates/宣传片.md
MODE = BRIEF.get('mode', 'explain')
if MODE not in ('explain', 'promo', 'talk'): sys.exit('brief 的 mode 只能是 explain（讲解线，缺省）、promo（宣传线）或 talk（口播线）')
PROMO = MODE == 'promo'; TALK = MODE == 'talk'
# 宣传片的样子（brief.json 的 "look"，风格包 promo）：配乐、拍速、镜头节奏的缺省值跟着样子走，brief 里写了的以 brief 为准
try: LOOKS = json.load(open(KIT.parent / 'templates' / 'promo_looks.json', encoding='utf-8'))
except Exception: LOOKS = {'looks': {}, 'kinds': {}}
LOOK = LOOKS['looks'].get(BRIEF.get('look') or '', {}) if PROMO else {}
if BRIEF.get('look') and PROMO and not LOOK: sys.exit(f"brief 的 look 只能是 {' / '.join(LOOKS['looks'])}")
for _k in ('music', 'bpm'):
    if LOOK and _k not in BRIEF: BRIEF[_k] = LOOK[_k]
if TALK: LEAD = 0.0; GAP = 0.0   # 口播线：声音是录好的原声，时间轴就是剪好的那条口播，句子之间不另加停顿（做法见 templates/口播片.md）
READ_CPS = BRIEF.get('read_cps', 10 if PROMO else 6 if TALK else 4.5); READ_PAD = BRIEF.get('read_pad', .1 if PROMO else .2 if TALK else 1.5)   # 阅读速度：给孩子看用 4.5 字/秒；成年观众可以调到 6；宣传线是扫一眼的大字，10 字/秒（120 拍时一拍一屏最多三个字）
READ_MIN = .4 if PROMO else .8 if TALK else 1.5; DEAD_SEC = float(BRIEF.get('dead_sec', LOOK.get('dead_sec', 2))) if PROMO else 8 if TALK else 4;   # 口播线：字是边听边看的，人像一直在动，阈值都放宽
HOOK_SEC = 1.0 if PROMO else 2.0
SUPERLATIVE = re.compile(r'最[大小高低强快早好先多新佳优]|国家级|世界级|第一(?![步层次个件项章节条点种类阶段轮批期天年])|唯一|领先|顶级|顶尖|首[个家创]|独家|全球[首最]|国内[首最]|100%|百分之百|绝对|完美')
# 允许进成片的素材依据。授权不明的素材只能进参考片单（study），不能进 assets.json
BASIS = {'own': '自有素材', 'licensed': '已获授权', 'public-domain': '公有领域', 'cc0': 'CC0', 'cc-by': 'CC BY', 'cc-by-sa': 'CC BY-SA', 'stock-free': '免费图库许可', 'excerpt': '引用片段（注明来源）'}
NEED_CREDIT = {'cc-by', 'cc-by-sa', 'licensed', 'excerpt'}
# excerpt：网上下载的企业宣传片、发布会、报道里的片段，为介绍和评论而引用。只用短片段、画面上标来源；注明来源不等于获得授权，用户自己决定承担这个风险
EXCERPT_MAX = BRIEF.get('excerpt_max', 15); EXCERPT_SHARE = BRIEF.get('excerpt_share', .3)
TIERS = ('政府名单', '官方记录', '公司披露', '公司自述', '第三方报告', '媒体')   # 官方记录：专利、标准、法规这类政府或标准机构的文件
CJK = re.compile(r'[一-鿿]'); NUMISH = re.compile(r'\d|[一二两三四五六七八九十百千万亿]+(年|倍|万|亿|公里|千米|米|度|吨|岁|天|小时|分钟|秒|种|颗|层)')

# ---------- 时间轴 ----------
def chunks_for(text, t, lead, voiced, dur, gap, maxlen=None, minlen=7, ct=None):
    maxlen = maxlen or (14 if VERT else 24)   # 竖版字幕一行最多 14 个字
    parts = [p for p in re.split(SPLIT, text) if p]; ch = []
    for p in parts:
        if ch and not ch[-1].endswith(END) and (len(ch[-1]) < minlen or len(p) < 5) and len(ch[-1]) + len(p) <= maxlen: ch[-1] += p
        else: ch.append(p)
    out = []; pos = 0; tot = sum(len(c) for c in ch); c0 = t + lead
    for c in ch:
        if ct: start = t + max(0, ct[pos] - 0.08)
        else: start = c0; c0 += (voiced - lead) * len(c) / tot
        out.append({'text': c.rstrip('，。：；、？！'), 't0': round(start, 3)}); pos += len(c)
    for a, b in zip(out, out[1:]): a['t1'] = b['t0']
    out[-1]['t1'] = round(t + dur + gap, 3); return out

def measure(path):
    x, sr = sf.read(path); x = x if x.ndim == 1 else x.mean(1); nz = np.where(np.abs(x) > 0.01)[0]
    return x, sr, len(x) / sr, (nz[0] / sr if len(nz) else 0), (nz[-1] / sr + 0.12 if len(nz) else len(x) / sr)

def words():
    f = P / 'audio' / 'words.json'; return json.load(open(f)) if f.exists() else {}
def wav_sha(i):
    f = P / 'audio' / f'{i}.wav'; return sha(f) if f.is_file() else None

def char_times(line, W):
    """这一句显示文本每个字的发音时间；回听结果过期（稿子改了）就不用。"""
    w = W.get(line['id']); spoken = line.get('tts') or line['vo']
    if not w or w.get('text') != spoken or w.get('wav') != wav_sha(line['id']): return None   # 音频换过：逐字时间是旧音频的，不能用
    ct = w['ct']; n = len(line['vo'])
    return ct if spoken == line['vo'] else [ct[round(i * (len(ct) - 1) / max(1, n - 1))] for i in range(n)]

silent = lambda l: bool(l.get('silent')) or not (l.get('tts') or l.get('vo'))
def beat_grid():
    """节拍网格：brief.json 写了 bpm 才有。t0 是正片第一句开始的那一拍（一个小节的第一拍）。"""
    bpm = float(BRIEF.get('bpm') or 0)
    if bpm <= 0: return None
    if not 30 <= bpm <= 300: print(f'✗ brief.json 的 bpm={bpm:g} 不像一个速度（常见 60–180）'); sys.exit(1)
    spb = 60 / bpm; meter = int(BRIEF.get('meter', 4)); o = BRIEF.get('beat_offset'); bar = spb * meter
    t0 = LEAD if o is None else float(o) + math.ceil((.3 - float(o)) / bar - 1e-6) * bar   # 自己的音乐：从片头 0.3 秒之后的第一条小节线开始
    return {'bpm': bpm, 'spb': round(spb, 6), 'meter': meter, 't0': round(t0, 4)}
def timeline():
    S = json.load(open(P / 'script.json')); W = words(); BG = beat_grid(); t = BG['t0'] if BG else LEAD; out = []; mix = []
    snap = (lambda x: BG['t0'] + math.ceil((x - BG['t0']) / BG['spb'] - 1e-4) * BG['spb']) if BG else (lambda x: x)   # 有节拍网格时，每一句的结束（下一句的开始）往后靠到最近的拍点上
    sr = SR
    for s in S:
        if silent(s):   # 无旁白段落：{"id","ch","silent":true,"dur":秒数}，只有画面和配乐；有 bpm 时可写 "beats":拍数 或 "bars":小节数
            s = {**s, 'vo': s.get('vo', '')}
            if BG and ('beats' in s or 'bars' in s): d = round((float(s['beats']) if 'beats' in s else float(s['bars']) * BG['meter']) * BG['spb'], 4)
            elif 'beats' in s or 'bars' in s: print(f"✗ {s['id']} 写了 beats/bars，但 brief.json 没写 bpm"); sys.exit(1)
            else: d = round(snap(t + float(s['dur'])) - t, 4) if BG else float(s['dur'])
            out.append({**s, 't0': round(t, 3), 'dur': d, 'lead': 0, 'voiced': d, 't1': round(t + d, 3), 'chunks': []}); t += d; continue
        x, sr, dur, lead, voiced = measure(P / 'audio' / f"{s['id']}.wav"); ct = char_times(s, W)
        gap = GAP + s.get('hold', 0)   # hold：这句说完后多留几秒给观众看画面
        if BG: gap = snap(t + dur + gap) - t - dur
        row = {**s, 't0': round(t, 3), 'dur': round(dur, 3), 'lead': round(lead, 3), 'voiced': round(voiced, 3), 't1': round(t + dur + gap, 3),
               'chunks': chunks_for(s['vo'], t, lead, voiced, dur, GAP, ct=ct)}
        if ct: row['ct'] = ct
        out.append(row); mix.append((t, x)); t += dur + gap
    if BG and out: out[0]['_grid'] = BG   # 页面从第一句上读网格
    total = out[-1]['t1'] + 3; buf = np.zeros(int(total * sr) + sr)
    for t0, x in mix: buf[int(t0 * sr):int(t0 * sr) + len(x)] += x
    sf.write(P / 'vo.wav', buf[:int(total * sr)], sr); js = json.dumps(out, ensure_ascii=False, indent=1); f = P / 'timeline.json'
    if not f.exists() or f.read_text(encoding='utf-8') != js: f.write_text(js, encoding='utf-8')   # 没变就不重写，免得整片扫描的缓存每次都作废
    return out, total

# ---------- 声音：配乐、音效、混音 ----------
SR = 44100
def pluck(f, dur, bright=.5, seed=0):
    """拨弦（Karplus-Strong）：古琴/筝一类的音色"""
    n = int(SR * dur); N = max(2, int(SR / f)); r = np.random.default_rng(seed); buf = r.uniform(-1, 1, N); k = np.arange(N); buf *= np.hanning(N) ** .2; out = np.empty(n); a = .5 - .12 * bright
    for i in range(0, n, N):
        m = min(N, n - i); out[i:i + m] = buf[:m]; buf = .996 * (a * buf + (1 - a) * np.roll(buf, 1))
    return out * np.exp(-np.arange(n) / SR * 1.1)
def music_guqin(total, tl, name):
    """五声音阶的拨弦配乐：每章换一个调和疏密；底下一条很轻的长音。"""
    BG = (tl or [{}])[0].get('_grid'); out = np.zeros(int(SR * total) + SR * 6); r = np.random.default_rng(11); penta = [0, 2, 4, 7, 9]; roots = [146.83, 130.81, 164.81, 110.0, 196.0, 123.47]   # D C E A G B
    chs = []; [chs.append((s['ch'], s['t0'])) for s in (tl or []) if not chs or chs[-1][0] != s['ch']]; chs = chs or [('', 0)]; bounds = [c[1] for c in chs[1:]] + [total]
    for ci, ((ch, a), b) in enumerate(zip(chs, bounds)):
        root = roots[ci % len(roots)]; gap = [2.6, 1.9, 3.2, 1.5, 2.2][ci % 5]; t = a + .6; prev = 2
        if BG: hb = BG['spb'] / 2; q = lambda x: BG['t0'] + max(1, round((x - BG['t0']) / hb)) * hb if x > BG['t0'] else BG['t0']; t = q(a) if a >= BG['t0'] else q(t)   # 有节拍网格：拨弦落在半拍上，每章第一声落在章的第一拍
        tt = np.arange(int((b - a + 3) * SR)) / SR; drone = (np.sin(2 * np.pi * root / 2 * tt) + .4 * np.sin(2 * np.pi * root * .75 * tt)) * np.clip(tt / 3, 0, 1) * np.clip((b - a + 3 - tt) / 3, 0, 1) * .05
        i0 = int(a * SR); out[i0:i0 + len(drone)] += drone[:len(out) - i0]
        while t < b - 1.5:
            step = int(np.clip(prev + r.choice([-2, -1, -1, 1, 1, 2]), 0, 9)); prev = step; f = root * 2 ** ((penta[step % 5] + 12 * (step // 5)) / 12)
            x = pluck(f, 5.0, r.uniform(.2, .8), int(t * 100)) * r.uniform(.5, 1); i = int(t * SR); out[i:i + len(x)] += x[:len(out) - i]
            if r.random() < .28: x2 = pluck(f / 2, 5.0, .3, int(t * 100) + 1) * .6; out[i:i + len(x2)] += x2[:len(out) - i]
            t += gap * r.choice([.5, 1, 1, 1.5, 2])
            if BG: t = max(q(t), q(i / SR + hb))
    out = out[:int(SR * total)]; t = np.arange(len(out)) / SR; out *= np.clip(t / 1.5, 0, 1) * np.clip((total - t) / 3, 0, 1); out = np.tanh(out / (np.abs(out).max() + 1e-9) * 3.0) / np.tanh(3.0)
    d = int(.031 * SR); sf.write(P / name, np.stack([out + .25 * np.roll(out, d * 7), out + .25 * np.roll(out, d * 11)], 1) * .7, SR)
def music_keys(total, tl, name):
    """轻的键盘铺底：中音区的电钢琴分解和弦 + 一层很淡的长音。手机和笔记本的小喇叭放得出来（老的 pad 几乎全在 200 Hz 以下，小喇叭上等于没有）。
    四小节一轮（C–Am–F–G 的柔和版本），每换一章换一种弹法；有节拍网格就跟网格走，没有就按每分钟 84 拍。"""
    BG = (tl or [{}])[0].get('_grid'); spb = BG['spb'] if BG else 60 / 84; t0 = (BG['t0'] % (spb * 4)) if BG else .5; n = int(SR * total); out = np.zeros(n + SR * 4); r = np.random.default_rng(7)
    N = lambda m: 440 * 2 ** ((m - 69) / 12)   # MIDI 音高 → 频率
    CH = [[60, 64, 67, 74], [57, 60, 64, 67], [53, 57, 60, 64], [55, 59, 62, 64]]   # Cadd9  Am7  Fmaj7  G6
    PAT = [[0, 2, 1, 3, 2, 1, 3, 2], [0, 1, 2, 3, 2, 3, 1, 2], [0, 2, 3, 2, 1, 2, 3, 1], [0, 3, 2, 1, 3, 2, 1, 2]]
    def ep(f, dur, vel):   # 电钢琴：一个正弦被自己的二倍频轻轻调制，敲一下就衰减
        t = np.arange(int(SR * dur)) / SR; return vel * np.sin(2 * np.pi * f * t + 1.1 * np.exp(-t * 9) * np.sin(2 * np.pi * 2 * f * t)) * np.exp(-t * 3.2) * np.clip(t / .004, 0, 1)
    starts = []; last = None
    for s_ in (tl or []):
        if s_['ch'] != last: starts.append(s_['t0']); last = s_['ch']
    bar = spb * 4; nb = int((total - t0) / bar) + 1
    for b in range(nb):
        tb = t0 + b * bar; ch = CH[b % 4]; ci = max(0, sum(1 for x in starts if x <= tb) - 1); pat = PAT[ci % 4]; dense = ci % 2 == 0
        # 长音：和弦的三个音，慢起慢收，两小节交叠
        tt = np.arange(int(SR * bar * 1.6)) / SR; env = np.clip(tt / (bar * .45), 0, 1) * np.clip((bar * 1.6 - tt) / (bar * .6), 0, 1)
        pad = sum(np.sin(2 * np.pi * N(m) * (1 + .0012 * k) * tt) + .18 * np.sin(2 * np.pi * 2 * N(m) * tt) for k, m in enumerate(ch[:3])) * env * .035
        i = int(tb * SR); out[i:i + len(pad)] += pad[:len(out) - i]
        if b == 0: continue   # 第一小节只有长音，让开头的旁白先出来
        for k in range(8):
            if not dense and k % 2: continue   # 隔一章弹得疏一点
            if dense and k in (3, 7) and r.random() < .35: continue
            m = ch[pat[k]] + (12 if k in (4, 6) and r.random() < .5 else 0); x = ep(N(m), 2.4, (.20 if k == 0 else .12) * r.uniform(.8, 1.1))
            i = int((tb + k * spb / 2 + r.uniform(-.006, .006)) * SR); out[i:i + len(x)] += x[:len(out) - i]
        x = ep(N(ch[0] - 12), 3.0, .16); i = int(tb * SR); out[i:i + len(x)] += x[:len(out) - i]   # 每小节一个低八度的根音，托一下
    out = out[:n]; t = np.arange(n) / SR; out *= np.clip(t / 1.2, 0, 1) * np.clip((total - t) / 3.5, 0, 1)
    out = out / (np.sqrt((out ** 2).mean()) + 1e-9) * 10 ** (-20 / 20); out = np.tanh(out * 1.5) / 1.5   # 平均音量定在 -20 dB，混音时再按比例压到旁白下面
    d = int(.017 * SR); sf.write(P / name, np.stack([out + .22 * np.roll(out, d), out + .22 * np.roll(out, d * 2)], 1), SR)
def music_cosmos(total, tl, name):
    """太空感的配乐：一条缓慢起伏的长音（带中音区的泛音，小喇叭听得见）、稀疏的钟声、小节线上的低鼓、换章前的气流声。
    每一章的强弱照 brief.json 的 music_energy（每章一个 0..1 的数）走，不写就是“起—涨—最高—落—静”。第二章开头有一声低沉的爆响。"""
    BG = (tl or [{}])[0].get('_grid'); spb = BG['spb'] if BG else 60 / 64; g0 = BG['t0'] if BG else .9; n = int(SR * total); t = np.arange(n) / SR; out = np.zeros(n + SR * 8); r = np.random.default_rng(23)
    starts = []; last = None
    for s_ in (tl or []):
        if s_['ch'] != last: starts.append(s_['t0']); last = s_['ch']
    starts = starts or [0]; K = len(starts); E = BRIEF.get('music_energy') or [(.22 + .78 * np.sin(np.pi * min(1, (i + .6) / max(1, K - 1.6))) ** 1.3) if i < K - 1 else .25 for i in range(K)]; E = (list(E) + [E[-1]] * K)[:K]
    en = np.interp(t, [0] + [s_ + 1.5 for s_ in starts[1:]] + [total], [E[0]] + E[1:] + [E[-1] * .6])   # 每章的强弱，换章后一秒半过渡完
    N = lambda m: 440 * 2 ** ((m - 69) / 12)
    # 长音：D 上的空五度，叠到中音区；几条慢 LFO 让它一直在动
    drone = np.zeros(n)
    for k, (m, a) in enumerate([(38, .3), (45, .34), (50, .5), (57, .5), (62, .46), (69, .34), (74, .24), (66, .16), (81, .1)]):
        drone += a * np.sin(2 * np.pi * N(m) * (1 + .0009 * k) * t + .6 * np.sin(2 * np.pi * (.05 + .013 * k) * t)) * (.6 + .4 * np.sin(2 * np.pi * (.031 + .011 * k) * t + k))
    out[:n] += drone * (.07 + .93 * en ** 1.5) * .16   # 低的两条压着放：能量主要在 200 Hz 以上，小喇叭才听得见
    def put(x, at_, gain=1.0):
        i = int(at_ * SR)
        if 0 <= i < len(out): out[i:i + len(x)] += x[:len(out) - i] * gain
    def bell(f, dur=5.0):
        tt = np.arange(int(SR * dur)) / SR; return (np.sin(2 * np.pi * f * tt) + .35 * np.sin(2 * np.pi * f * 2.76 * tt) * np.exp(-tt * 3) + .15 * np.sin(2 * np.pi * f * 5.4 * tt) * np.exp(-tt * 6)) * np.exp(-tt * 1.1) * np.clip(tt / .006, 0, 1)
    def boom(dur=3.2, f0=95, f1=34):
        tt = np.arange(int(SR * dur)) / SR; f = f1 + (f0 - f1) * np.exp(-tt * 5); return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 1.5) + .25 * np.sin(2 * np.pi * np.cumsum(f * 3) / SR) * np.exp(-tt * 4)
    def air(dur):   # 气流声：噪声过两次滑动平均，音量越来越大
        m = int(SR * dur); x = r.standard_normal(m + 400); x = np.convolve(x, np.ones(24) / 24, 'same'); x = x - np.convolve(x, np.ones(400) / 400, 'same'); return x[:m] * (np.arange(m) / m) ** 2.2
    scale = [62, 64, 66, 69, 71, 74, 76, 78, 81]   # D 大调五声
    tb = g0; b = 0
    while tb < total - 2:
        e = float(np.interp(tb, t[::SR], en[::SR])); ci = max(0, sum(1 for x in starts if x <= tb + .01) - 1)
        if b % 4 == 0 and e > .3: put(boom(1.6, 70, 40), tb, .22 * e)                   # 每小节一声低鼓
        if e > .55 and b % 2 == 0: put(bell(N(50 + [0, 7, 5, 7][(b // 2) % 4]), 2.5), tb, .07 * e)   # 中音区的拨动，托住节奏
        if r.random() < .16 + .5 * e: put(bell(N(scale[int(r.integers(0, len(scale)))] + (12 if r.random() < .25 else 0)), 6.0), tb + (spb / 2 if r.random() < .3 else 0), (.07 + .13 * e) * r.uniform(.6, 1))
        tb += spb; b += 1
    for i, s_ in enumerate(starts[1:], 1):
        d = spb * 2; put(air(d), s_ - d, .05 + .12 * E[i]); put(bell(N(86), 7.0), s_, .05)   # 换章：气流涌上来，一声高钟
    if K > 1: put(boom(), starts[1], .6)
    # 一个四个音的动机：每章开头响一次，一章比一章多一个音；倒数第二章慢下来完整地再响一遍（问题回到它自己）
    motif = [62, 69, 66, 64]
    for i, s_ in enumerate(starts[1:], 1):
        slow = i == K - 2; nn = 4 if slow or i >= 4 else i
        for j in range(nn): put(bell(N(motif[j] + (0 if slow else 12)), 7.0), s_ + spb * (4 if slow else 2) * (j + (1 if slow else .5)), (.2 if slow else .1 + .08 * E[i]))
    put(bell(N(74), 8.0), starts[-1], .16)
    out = out[:n]; out *= np.clip(t / 2.0, 0, 1) * np.clip((total - t) / 4.0, 0, 1)
    wet = out.copy()
    for dly, gdb in ((.137, .32), (.251, .26), (.389, .2), (.613, .15), (.977, .1)): k = int(dly * SR); wet[k:] += out[:-k] * gdb   # 几道延迟当混响
    out = wet / (np.sqrt((wet ** 2).mean()) + 1e-9) * 10 ** (-20 / 20); out = np.tanh(out * 1.3) / 1.3
    d = int(.019 * SR); sf.write(P / name, np.stack([out + .3 * np.roll(out, d), out + .3 * np.roll(out, d * 3)], 1), SR)
BAND = {   # 宣传线的四种合成配乐：有鼓、有低音、有和弦，按每章的强弱起落。都是合成的，够定节奏和气质，替不了真音乐
    'drive':  dict(bpm=122, prog=[[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]], kick='four', hat='off', clap='clap', bass='eighth', lead='stab'),      # 利落的电子：四拍底鼓、八分低音、反拍和弦
    'pulse':  dict(bpm=104, prog=[[50, 57, 60, 64], [46, 53, 57, 62], [53, 57, 60, 65], [48, 55, 60, 64]], kick='one3', hat='six', clap='', bass='sub', lead='arp'),  # 冷静的科技感：十六分琶音、长低音，鼓很少
    'warm':   dict(bpm=92,  prog=[[60, 64, 67, 71], [57, 60, 64, 67], [53, 57, 60, 64], [55, 59, 62, 64]], kick='one3', hat='shaker', clap='rim', bass='half', lead='ep'),  # 温和的原声感：电钢琴和弦、沙锤、边击
    'bright': dict(bpm=116, prog=[[60, 64, 67], [55, 59, 62], [57, 60, 64], [53, 57, 60]], kick='bounce', hat='off', clap='clap', bass='bounce', lead='mallet'),   # 轻快：木琴拨动、拍手、跳着走的低音
}
BEAT_E = {'钩子': .6, '铺垫': .45, '推进': .75, '转折': .3, '揭示': .9, '高潮': 1.0, '回扣': .6, '收束': .5}
def music_band(total, tl, name, style):
    """有鼓有低音的配乐。强弱一章一个数（brief.music_energy，不写就按每章第一句的 beat 定）：弱的章只留和弦（蓄力），变强之前的一小节有一道上扬的气流，强的章开头砸一下。"""
    S = BAND[style]; BG = (tl or [{}])[0].get('_grid'); spb = BG['spb'] if BG else 60 / S['bpm']; g0 = BG['t0'] if BG else .5; bar = spb * 4; n = int(SR * total); out = np.zeros(n + SR * 6); r = np.random.default_rng(11)
    N = lambda m: 440 * 2 ** ((m - 69) / 12); T = lambda d: np.arange(int(SR * d)) / SR
    starts = []; first = []; last = None
    for s_ in (tl or []):
        if s_['ch'] != last: starts.append(s_['t0']); first.append(s_.get('beat')); last = s_['ch']
    starts = starts or [0]; first = first or [None]; E = BRIEF.get('music_energy') or [BEAT_E.get(b, .6) for b in first]; E = (list(E) + [E[-1]] * len(starts))[:len(starts)]
    def put(x, at_, gain=1.0):
        i = int(at_ * SR)
        if 0 <= i < len(out): out[i:i + len(x)] += x[:len(out) - i] * gain
    def noise(d, lo, hi):   # 一段只留 lo–hi 赫兹的噪声
        m = int(SR * d); F = np.fft.rfft(r.standard_normal(m)); k = np.fft.rfftfreq(m, 1 / SR); F *= (k > lo) * (k < hi); x = np.fft.irfft(F, m); return x / (np.abs(x).max() + 1e-9)
    t_ = T(.34); KICK = np.sin(2 * np.pi * np.cumsum(46 + 120 * np.exp(-t_ * 36)) / SR) * np.exp(-t_ * 9) * np.clip(t_ / .002, 0, 1)
    HAT = noise(.06, 6500, 14000) * np.exp(-T(.06) * 85); SHK = noise(.1, 4000, 10000) * np.sin(np.pi * T(.1) / .1) ** 2
    tc_ = T(.2); CLAP = noise(.2, 900, 4200) * (np.exp(-tc_ * 22) + .7 * np.exp(-np.abs(tc_ - .012) * 300) + .7 * np.exp(-np.abs(tc_ - .024) * 300)); RIM = (np.sin(2 * np.pi * 1750 * T(.05)) + .5 * noise(.05, 2000, 6000)) * np.exp(-T(.05) * 110)
    def bass(f, d):
        t = T(d); return sum(np.sin(2 * np.pi * k * f * t) / k * np.exp(-t * k * 2.2) for k in range(1, 6)) * np.clip(t / .006, 0, 1) * np.clip((d - t) / .03, 0, 1)
    def ep(f, d, bright=1.1):
        t = T(d); return np.sin(2 * np.pi * f * t + bright * np.exp(-t * 9) * np.sin(2 * np.pi * 2 * f * t)) * np.exp(-t * 3.2) * np.clip(t / .004, 0, 1)
    def mallet(f, d=.9):
        t = T(d); return (np.sin(2 * np.pi * f * t) * np.exp(-t * 7) + .35 * np.sin(2 * np.pi * 4 * f * t) * np.exp(-t * 22)) * np.clip(t / .002, 0, 1)
    def padc(ms, d):
        t = T(d); env = np.clip(t / (d * .3), 0, 1) * np.clip((d - t) / (d * .35), 0, 1); return sum(np.sin(2 * np.pi * N(m) * (1 + .0015 * k) * t) + .2 * np.sin(2 * np.pi * 2 * N(m) * t) for k, m in enumerate(ms)) * env
    def riser(d):
        m = int(SR * d); x = noise(d, 1500, 9000) * (np.arange(m) / m) ** 2.4; return x + .25 * np.sin(2 * np.pi * np.cumsum(np.linspace(240, 1300, m)) / SR) * (np.arange(m) / m) ** 2
    IMPACT = np.concatenate([KICK * 1.2, np.zeros(int(SR * .9))])[:int(SR * 1.2)]; IMPACT = IMPACT + .5 * noise(1.2, 300, 6000) * np.exp(-T(1.2) * 5)
    eat = lambda tt: E[max(0, sum(1 for x in starts if x <= tt + .01) - 1)]
    nb = int((total - 3 - g0) / bar) + 1
    for b in range(nb):
        tb = g0 + b * bar; e = eat(tb); en = eat(tb + bar); ch = S['prog'][b % 4]; root = N(ch[0] - 24)
        put(padc([m + 12 for m in ch], bar * 1.25), tb, .04 + .04 * e)                                   # 和弦长音一直在
        if en - e >= .2: put(riser(bar), tb, .16)                                       # 变强之前：一小节上扬的气流
        if e - eat(tb - bar) >= .2 and b: put(IMPACT, tb, .5)                           # 变强的那一下
        for k in range(16):                                                            # 一小节十六个十六分
            tk = tb + k * spb / 4; q, on8, on4 = k % 4, k % 2 == 0, k % 4 == 0
            if e >= .5 and ((S['kick'] == 'four' and on4) or (S['kick'] == 'one3' and k in (0, 8)) or (S['kick'] == 'bounce' and k in (0, 6, 8))): put(KICK, tk, .3 if S['kick'] != 'one3' else .22)
            if e >= .4:
                if S['hat'] == 'off' and k % 4 == 2: put(HAT, tk, .22)
                if S['hat'] == 'off' and e >= .9 and k % 2 == 1: put(HAT, tk, .07)
                if S['hat'] == 'six' and (on8 or e >= .8): put(HAT, tk, .05 + .05 * (k % 4 == 2))
                if S['hat'] == 'shaker' and on8: put(SHK, tk, .05 + .04 * (k % 4 == 2))
            if e >= .65 and k in (4, 12):
                if S['clap'] == 'clap': put(CLAP, tk, .3)
                if S['clap'] == 'rim': put(RIM, tk, .16)
            if e >= .45:
                if S['bass'] == 'eighth' and on8: put(bass(root * (4 if k in (6, 14) else 2), spb * .45), tk, .13)
                if S['bass'] == 'sub' and k == 0: put(bass(root * 2, bar * .95), tk, .12)
                if S['bass'] == 'half' and k in (0, 8): put(bass(root * (3 if k == 8 else 2), spb * 1.8), tk, .11)
                if S['bass'] == 'bounce' and k in (0, 6, 10): put(bass(root * (4 if k == 10 else 2), spb * .6), tk, .13)
            if e >= .3:
                if S['lead'] == 'stab' and k in (2, 6, 10, 14) and e >= .6: put(sum(ep(N(m + 12), .35, 2.2) for m in ch), tk, .12)
                if S['lead'] == 'arp' and (on8 or e >= .7): put(mallet(N(ch[(k * 3) % len(ch)] + (24 if k % 8 >= 4 else 12)), .5), tk, .05 + .03 * e)
                if S['lead'] == 'ep' and k in (0, 6, 10): put(sum(ep(N(m), 2.6) for m in ch), tk, .055 if k else .08)
                if S['lead'] == 'mallet' and on8 and not (k == 14 and r.random() < .5): put(mallet(N(ch[[0, 2, 1, 2, 0, 1, 2, 1][k // 2]] + 12)), tk, .2 if on4 else .14)
    out = out[:n]; t = np.arange(n) / SR; out *= np.clip(t / .6, 0, 1) * np.clip((total - t) / 3.0, 0, 1)
    wet = out.copy()
    for dly, gd in ((.119, .16), (.233, .11), (.371, .07)): k = int(dly * SR); wet[k:] += out[:-k] * gd
    out = wet / (np.sqrt((wet ** 2).mean()) + 1e-9) * 10 ** (-20 / 20); out = np.tanh(out * 1.4) / 1.4
    d = int(.013 * SR); sf.write(P / name, np.stack([out + .18 * np.roll(out, d), out + .18 * np.roll(out, d * 2)], 1), SR)
def music(total, name='music.wav', tl=None):
    """brief.json 的 music：缺省 'keys' 是合成的键盘铺底（中音区，小喇叭听得见）；'pad' 是低沉的长音；'guqin' 是五声拨弦（每章换调）；写成文件路径就用那条音乐（要进素材台账）。"""
    kind = BRIEF.get('music', 'keys')
    if kind == 'keys': return music_keys(total, tl, name)
    if kind == 'cosmos': return music_cosmos(total, tl, name)
    if kind in BAND: return music_band(total, tl, name, kind)
    if kind == 'guqin': return music_guqin(total, tl, name)
    if kind not in ('pad', '') and (P / kind).exists():
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-stream_loop', '-1', '-i', str(P / kind), '-t', f'{total:.2f}', '-af', f'afade=t=in:d=1.5,afade=t=out:st={total - 3:.2f}:d=3', '-ar', str(SR), '-ac', '2', str(P / name)], check=True); return
    t = np.arange(int(SR * total)) / SR
    tone = lambda f: np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * 2 * f * t) + 0.1 * np.sin(2 * np.pi * 3 * f * t)
    chords = [[73.42, 110, 146.83, 174.61], [58.27, 116.54, 146.83, 174.61], [65.41, 98, 130.81, 196], [55, 110, 138.59, 164.81]]; out = np.zeros_like(t); L = 9.0; BG0 = (tl or [{}])[0].get('_grid'); o0 = 0.0
    if BG0: bl = BG0['spb'] * BG0['meter']; L = bl * max(1, round(9.0 / bl)); o0 = BG0['t0'] % L - L   # 和弦按整小节换
    for i in range(int(total / L) + 2 if BG0 else int(total / L) + 1):
        env = np.clip((t - o0 - i * L) / 3, 0, 1) * np.clip((o0 + i * L + L + 3 - t) / 3, 0, 1)
        for k, f in enumerate(chords[i % 4]): out += env * tone(f * (1 + 0.0015 * k)) * (0.5 if k == 0 else 0.2) * (1 + 0.15 * np.sin(2 * np.pi * 0.17 * t + k))
    BG = (tl or [{}])[0].get('_grid')   # 有节拍网格：轻点落在每一拍，重音落在每小节第一拍；没有就是原来的每半秒一点、每两秒一重
    for b in (np.arange(BG['t0'], total - 4, BG['spb']) if BG else np.arange(1.0, total - 4, 0.5)):
        i = int(b * SR); n = int(.12 * SR); tt = np.arange(n) / SR; out[i:i + n] += 0.14 * np.sin(2 * np.pi * 146.83 * tt) * np.exp(-tt * 38)
    for b in (np.arange(BG['t0'], total - 4, BG['spb'] * BG['meter']) if BG else np.arange(1.0, total - 4, 2.0)):
        i = int(b * SR); n = int(.4 * SR); tt = np.arange(n) / SR; out[i:i + n] += 0.35 * np.sin(2 * np.pi * (48 + 38 * np.exp(-tt * 28)) * tt) * np.exp(-tt * 11)
    out *= np.clip(t / 1.5, 0, 1) * np.clip((total - t) / 3, 0, 1); out = out / np.abs(out).max(); sf.write(P / name, np.stack([out, np.roll(out, 200)], 1) * 0.9, SR)

def synth(kind):
    """程序合成的小音效，全部是柔和的短音，不抢配音。"""
    rng = np.random.default_rng(7); T = lambda d: np.arange(int(d * SR)) / SR
    chirp = lambda f0, f1, d: np.sin(2 * np.pi * np.cumsum(np.linspace(f0, f1, int(d * SR))) / SR)
    if kind == 'pop': t = T(.11); x = chirp(480, 820, .11) * np.exp(-t * 34)
    elif kind == 'tick': t = T(.03); x = np.sin(2 * np.pi * 1700 * t) * np.exp(-t * 150) * .6
    elif kind == 'ding': t = T(.9); x = sum(a * np.sin(2 * np.pi * f * t) * np.exp(-t * d) for f, a, d in [(1318, .6, 5), (1976, .3, 7), (2637, .15, 9)])
    elif kind == 'rise': t = T(.5); x = chirp(300, 900, .5) * np.sin(np.pi * t / .5) ** 2 * .6
    elif kind == 'thud': t = T(.28); x = np.sin(2 * np.pi * (60 + 50 * np.exp(-t * 30)) * t) * np.exp(-t * 16)
    else:  # whoosh
        t = T(.55); n = rng.standard_normal(len(t)); k = np.fft.rfftfreq(len(t), 1 / SR); F = np.fft.rfft(n); F *= np.exp(-((k - 1400) / 900) ** 2); x = np.fft.irfft(F, len(t)); x = x / np.abs(x).max() * np.sin(np.pi * t / .55) ** 2 * .7
    return x.astype('float32')

GAIN = {'pop': .5, 'tick': .35, 'ding': .45, 'rise': .4, 'thud': .6, 'whoosh': .5}
def sfx_track(events, total, name='sfx.wav', clips=()):
    buf = np.zeros(int(total * SR) + SR, dtype='float32'); last = {}; n = 0; meta = jload('clips/meta.json', {}) or {}
    for e in clips:   # 素材原声：按 clip(..., {sound}) 给的音量叠进去
        cid, frm = e['type'][5:].split('|'); m = meta.get(cid, {})
        if e['gain'] <= 0 or not m.get('audio'): continue
        x, sr = sf.read(P / m['audio'], dtype='float32'); x = x[int(float(frm) * sr):] * e['gain'] * 2.2; i = int(e['t'] * SR); x = x[:max(0, len(buf) - i)]; buf[i:i + len(x)] += x
    for e in sorted(events, key=lambda e: e['t']):
        if e['type'].startswith('_'): continue   # 下划线开头的是给检查看的记号（如 _cut 换屏），不出声
        if e['t'] < 0 or e['t'] > total or e['t'] - last.get(e['type'], -9) < .18: continue   # 同类音效太密就丢掉
        x = synth(e['type']) * GAIN.get(e['type'], .5) * e.get('gain', 1); i = int(e['t'] * SR); buf[i:i + len(x)] += x; last[e['type']] = e['t']; n += 1
    sf.write(P / name, buf[:int(total * SR)], SR); return n

def clip_event(e):
    """scenes.js 里 clip()/clipSound() 登记的原声：'clip:id|from[|t1=..|fi=..|fo=..]' → {id, from, t, gain, t1, fi, fo}"""
    p = e['type'][5:].split('|'); d = {'id': p[0], 'from': float(p[1]), 't': e['t'], 'gain': e['gain'], 't1': None, 'fi': 0.0, 'fo': 0.0}
    for kv in p[2:]: k, v = kv.split('='); d[k] = float(v)
    return d
def duck_env(tl, n, db=12, ramp=.3):
    """旁白包络：每句 t0+lead 到 t0+voiced 压低 db 分贝，进出各 ramp 秒（在分贝上线性过渡）。返回 n 个采样的增益。"""
    rate = 1000; m = int(n / SR * rate) + 2; tt = np.arange(m) / rate; d = np.zeros(m)
    for s in tl or []:
        if silent(s): continue
        a, b = s['t0'] + s['lead'], s['t0'] + s['voiced']; d = np.maximum(d, np.clip(np.minimum((tt - (a - ramp)) / ramp, (b + ramp - tt) / ramp), 0, 1))
    return np.interp(np.arange(n) / SR, tt, 10 ** (-db * d / 20)).astype('float32'), float((d > .999).sum() / rate)
def orig_track(clips, total, tl=None, name='orig.wav', duck=12):
    """素材原声单独一条轨：按 clip()/clipSound() 登记的起点、from、t1、淡入淡出叠进去；有旁白的地方压低 duck 分贝。"""
    buf = np.zeros(int(total * SR) + SR, dtype='float32'); meta = jload('clips/meta.json', {}) or {}; n = 0
    for e in clips:
        c = clip_event(e); m = meta.get(c['id'], {})
        if c['gain'] <= 0 or not m.get('audio'): continue
        x, sr = sf.read(P / m['audio'], dtype='float32'); x = x if x.ndim == 1 else x.mean(1); x = x[int(c['from'] * sr):]
        if c['t1'] is not None: x = x[:max(0, int((c['t1'] - c['t']) * sr))]
        x = x * c['gain'] * 2.2; L = len(x)
        if c['fi'] > 0 and L: k = min(L, int(c['fi'] * sr)); x[:k] *= np.linspace(0, 1, k, endpoint=False, dtype='float32')
        if c['fo'] > 0 and L: k = min(L, int(c['fo'] * sr)); x[L - k:] *= np.linspace(1, 0, k, dtype='float32')
        i = int(c['t'] * SR); x = x[:max(0, len(buf) - i)]; buf[i:i + len(x)] += x; n += 1
    sec = 0.0
    if duck and n: env, sec = duck_env(tl, len(buf), float(duck)); buf *= env
    sf.write(P / name, buf[:int(total * SR)], SR, subtype='FLOAT'); return n, sec

def loudness(path):
    r = subprocess.run(['ffmpeg', '-hide_banner', '-i', str(path), '-af', f'loudnorm=I={LUFS}:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-'], capture_output=True, text=True)
    return json.loads(r.stderr[r.stderr.rindex('{'):r.stderr.rindex('}') + 1])

# 配乐压到旁白下面多少：键盘铺底的平均音量是定好的（-20 dB），再压 17 dB，大约比旁白低 14 dB；别的配乐沿用 -21。brief.json 的 music_gain 可以整体加减几分贝
MU_DB = lambda: (-17 if BRIEF.get('music', 'keys') in ('keys', 'cosmos', 'drive', 'pulse', 'warm', 'bright') else -21) + float(BRIEF.get('music_gain', 0))
def mixdown(vo, mu, out, sfx=None, mu_db=-21, orig=None):
    """配音压缩后和配乐、音效（、素材原声轨）相加，再两遍响度归一到 -14 LUFS，限幅保证真峰值不过 -1.5 dBTP。"""
    ins = ['-i', vo, '-i', mu] + (['-i', sfx] if sfx else []) + (['-i', orig] if orig else [])
    fc = "[0]aresample=44100,highpass=f=70,acompressor=threshold=-18dB:ratio=2.5:attack=5:release=120,volume=4dB,pan=stereo|c0=c0|c1=c0[v];[1]volume=" + str(mu_db) + "dB[m];" + \
         ("[2]aresample=44100,volume=-9dB,pan=stereo|c0=c0|c1=c0[s];[v][m][s]amix=inputs=3:normalize=0[a]" if sfx else "[v][m]amix=inputs=2:normalize=0[a]")
    if orig:   # 原声轨和音效同样 -9 dB（旧做法里原声就混在音效轨里），单独一路才能按旁白压低
        oi = 3 if sfx else 2; fc = fc.rsplit(';', 1)[0] + f";[{oi}]aresample=44100,volume=-9dB,pan=stereo|c0=c0|c1=c0[o];[v][m]" + ("[s]" if sfx else "") + f"[o]amix=inputs={oi + 1}:normalize=0[a]"
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', *ins, '-filter_complex', fc, '-map', '[a]', '_pre.wav'], check=True)
    m = loudness('_pre.wav')
    af = f"loudnorm=I={LUFS}:TP=-1.5:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true,aresample=44100,alimiter=limit=0.68:level=false:attack=2:release=60"
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', '_pre.wav', '-af', af, out], check=True)
    r = loudness(out)
    if float(r['input_i']) < LUFS - .6:   # 峰值先到顶、响度还差一截（旁白动态大时常见）：把差的那几分贝补在限幅器前面，让限幅器吃掉个别尖峰
        up = min(4.0, LUFS - float(r['input_i'])); af2 = af.replace(',aresample=44100,alimiter', f',volume={up:.1f}dB,aresample=44100,alimiter')
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', '_pre.wav', '-af', af2, out], check=True); r = loudness(out)
    Path('_pre.wav').unlink(); print(f"响度 {r['input_i']} LUFS，真峰值 {r['input_tp']} dBTP（目标 {LUFS} / -1.5）")

def srt(chunks, path, offset=0.0):
    f = lambda s: '%02d:%02d:%02d,%03d' % (s // 3600, s % 3600 // 60, s % 60, round(s % 1 * 1000) % 1000)
    Path(path).write_text(''.join(f"{i}\n{f(c['t0'] + offset)} --> {f(c['t1'] + offset)}\n{c['text']}\n\n" for i, c in enumerate(chunks, 1)), encoding='utf-8')

# ---------- 检查 ----------
def facts_check(tl):
    """facts.json：[{claim, status: verified|inferred|conceptual, source, where:[句id]}]"""
    f = P / 'facts.json'; fails = []; warns = []
    if not f.exists(): return ['没有 facts.json：每个数字、年份、人名、因果都要进事实台账'], []
    F = json.load(open(f)); covered = set()
    for i, x in enumerate(F):
        tag = f"第{i + 1}条「{x.get('claim', '')[:16]}」"
        if x.get('status') == 'todo': fails.append(tag + ' 还是 todo：这是从文章里扫出来的说法，查证后改成 verified / inferred / opinion / quote，稿子里不用它就删掉这条'); continue
        if x.get('status') not in ('verified', 'inferred', 'conceptual', 'opinion', 'quote'): fails.append(tag + ' 的 status 要填 verified / inferred / conceptual / opinion / quote')
        if x.get('status') == 'quote' and not x.get('source'): fails.append(tag + ' 是引文，source 要写出处（书名章节页码、讲话场合日期或网址）')
        if x.get('status') == 'opinion' and not x.get('note'): warns.append(tag + ' 是观点，note 里写清是谁的观点，稿子里不能说成事实')
        if x.get('status') == 'verified' and not str(x.get('source', '')).startswith('http'): fails.append(tag + ' 标了已核实，但 source 不是网址')
        if x.get('status') == 'inferred' and not x.get('note'): warns.append(tag + ' 是推断，请在 note 里写依据，稿子里用“大约/可能”这类说法')
        # 来源层级（企业类题材必填）：政府名单 / 公司披露 / 公司自述 / 第三方报告 / 媒体
        tier = x.get('tier')
        if tier is not None and tier not in TIERS: fails.append(tag + ' 的 tier 要填 ' + ' / '.join(TIERS))
        if tier == '公司自述' and x.get('status') == 'verified': fails.append(tag + ' 是公司自述，不能标成已核实：status 写 opinion，稿子里写“公司称”')
        if tier == '第三方报告' and not x.get('note'): fails.append(tag + ' 是第三方报告：note 里写清是哪家机构、谁委托、按什么口径统计')
        if tier == '媒体' and x.get('status') == 'verified': warns.append(tag + ' 只有媒体报道：关键事实要找到政府名单或公司公告原件再标已核实')
        if BRIEF.get('tiers_required') and tier is None: fails.append(tag + ' 没有填 tier（来源层级）：这个题材要求每条都填')
        covered |= set(x.get('where', []))
    ids = {s['id'] for s in tl} | ({l['id'] for l in json.load(open(P / 'short.json'))} if (P / 'short.json').exists() else set())
    for w in covered - ids: fails.append(f'台账引用了不存在的句子 {w}')
    for s in tl:
        if NUMISH.search(s['vo']) and s['id'] not in covered: warns.append(f"{s['id']} 里有数字或量词，但没有任何一条事实指向它：{s['vo'][:22]}…")
        if SUPERLATIVE.search(s['vo']) and not any(s['id'] in x.get('where', []) and x.get('status') == 'verified' for x in F):
            warns.append(f"{s['id']} 有“最/第一/领先”这类说法，但没有已核实的事实支撑：{SUPERLATIVE.search(s['vo']).group(0)}")
    return fails, warns

BEATS = ('钩子', '铺垫', '推进', '转折', '揭示', '高潮', '回扣', '收束')
def story_check(tl):
    """叙事线：创意方向写清了没有、开头抛出的问题结尾有没有回答、有没有转折、结尾回不回扣开头、和以前的片子是不是太像。规矩见 templates/叙事与创意.md"""
    D = BRIEF.get('direction'); fails = []; warns = []; S = [s for s in tl if not silent(s)] or tl
    if not D:
        return [], ['brief.json 没有 direction（创意方向）：先按 templates/叙事与创意.md 拆提示词、比较三个方向，把选中的写进 brief']
    if not D.get('logline'): fails.append('direction.logline 没写：用一句话说清“这条片讲什么、为什么值得看”')
    elif len(D['logline']) > 50: warns.append(f"direction.logline 有 {len(D['logline'])} 字：一句话说不清，说明方向还没想清楚（50 字以内）")
    mute = all(silent(s) for s in tl)   # 整条无旁白：没有“问与答”，也谈不上钩子句式；结构、转折、收束照样要有
    for k, why in (('structure', '叙事结构（从手法库里选，或写明自创的）'), ('angle', '视角：谁在讲、离事件多远'), ('hook_type', '开场钩子用哪一种')):
        if not D.get(k) and not (mute and k == 'hook_type'): warns.append(f'direction.{k} 没写：{why}')
    if len(D.get('alternatives', [])) < 2: warns.append('direction.alternatives 少于两个：没和别的方向比过，容易做成上一条的样子')
    ids = [s['id'] for s in S]; asks = {}; answers = {}
    for i, s in enumerate(S):
        for q in ([s['ask']] if isinstance(s.get('ask'), str) else s.get('ask', [])): asks.setdefault(q, i)
        for q in ([s['answer']] if isinstance(s.get('answer'), str) else s.get('answer', [])): answers.setdefault(q, i)
        if s.get('beat') and s['beat'] not in BEATS: warns.append(f"{s['id']} 的 beat「{s['beat']}」不在 {'/'.join(BEATS)} 里")
    for q, i in asks.items():
        if q not in answers: fails.append(f'{ids[i]} 抛出的问题「{q}」到结尾都没有回答（在回答它的那句写 "answer":"{q}"）')
        elif answers[q] < i: fails.append(f'问题「{q}」在 {ids[answers[q]]} 先回答、{ids[i]} 才抛出：顺序反了')
    for q, i in answers.items():
        if q not in asks: warns.append(f'{ids[i]} 回答了「{q}」，但前面没有哪句把它问出来（在提问的那句写 "ask":"{q}"）')
    if not asks and not mute: warns.append('全片没有一句 ask：开头没抛出观众想知道答案的问题，后面就没有“为什么要看下去”')
    beats = [s.get('beat') for s in S]
    if any(beats):
        if beats[0] not in ('钩子', None) and S[0]['t0'] < 4: warns.append(f'第一句的 beat 是「{beats[0]}」：开头 3 秒要是钩子')
        mid = beats[len(beats) // 5: len(beats) * 9 // 10]
        if not any(b in ('转折', '揭示', '高潮') for b in mid): warns.append('中段没有转折、揭示或高潮：整条片是平的，观众没有“原来如此”的时刻')
        if beats[-1] not in ('回扣', '收束') and beats[-2:] .count('回扣') == 0: warns.append('最后一两句不是回扣或收束：结尾没有回到开头')
    else: warns.append('script.json 没有标 beat（钩子/铺垫/推进/转折/揭示/高潮/回扣/收束）：标上才能检查叙事线')
    cb = D.get('callback')
    if cb and not mute:   # 无旁白的片子回扣在画面上，这里查不了
        head = ''.join(s['vo'] for s in S[:3]); tail = ''.join(s['vo'] for s in S[-3:])
        if cb not in head or cb not in tail: warns.append(f'回扣词「{cb}」要在前三句和后三句的旁白里都出现（现在：开头{"有" if cb in head else "没有"}，结尾{"有" if cb in tail else "没有"}）')
    # 和以前的片子太像：结构、钩子、视角、声音、风格五样里有三样一样
    try: films = json.load(open(KIT.parent / 'templates' / 'registry.json', encoding='utf-8')).get('films', [])
    except Exception: films = []
    me = {'structure': D.get('structure'), 'hook': D.get('hook_type'), 'angle': D.get('angle'), 'voice': (BRIEF.get('voice') or {}).get('voice'), 'style': BRIEF.get('style')}
    for f in films[-6:]:
        if f.get('title') == BRIEF.get('title'): continue
        same = [k for k, v in me.items() if v and f.get(k) == v]
        if len(same) >= 3: warns.append(f"和《{f['title']}》太像：{'、'.join(same)} 都一样。换掉其中两样（见 叙事与创意.md「不千篇一律」）")
    return fails, warns

# ---------- 素材层 ----------
def ffprobe(path):
    r = subprocess.run(['ffprobe', '-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', str(path)], capture_output=True, text=True); d = json.loads(r.stdout or '{}')
    v = next((s for s in d.get('streams', []) if s['codec_type'] == 'video'), None); a = next((s for s in d.get('streams', []) if s['codec_type'] == 'audio'), None)
    if not v: return None
    num, den = (v.get('avg_frame_rate') or '0/1').split('/'); rot = int(float(v.get('tags', {}).get('rotate', 0) or next((sd.get('rotation', 0) for sd in v.get('side_data_list', []) if 'rotation' in sd), 0)))
    w, h = (v['height'], v['width']) if abs(rot) in (90, 270) else (v['width'], v['height'])
    return {'duration': round(float(d['format'].get('duration', 0)), 3), 'width': w, 'height': h, 'fps': round(float(num) / max(1, float(den)), 3), 'has_audio': bool(a), 'orientation': 'landscape' if w > h else 'portrait' if h > w else 'square'}
def sha(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for blk in iter(lambda: f.read(1 << 20), b''): h.update(blk)
    return h.hexdigest()

# ---------- 版本指纹：check、render、mix、cover 各记下用的是哪一版输入，final 核对是同一版（2026-10-09 评审 P1） ----------
# 只比文件内容，不比修改时间：拷贝、git checkout、同步盘都会改时间而内容不变；反过来，换掉一个同名文件时间可能还更早
STATE = P / '_build_state.json'
def _engine():
    fs = [KIT / x for x in ('kit.js', 'components.js', 'film.html')]
    for k in BRIEF.get('packs', []): fs += [KIT / 'packs' / f'{k}.js'] + sorted((KIT / 'packs' / k).glob('*.js'))
    return fs
def fp_files(kind):
    """kind：pic 画面（render、cover、整片扫描）/ snd 声音（mix）/ all 检查（全部输入，含稿子、台账、配音、引擎和检查脚本本身）。"""
    A = jload('assets.json', []) or []; meta = jload('clips/meta.json', {}) or {}
    pic = [P / x for x in ('brief.json', 'scenes.js', 'timeline.json', 'assets.json', 'clips/meta.json')] + _engine() + [P / a['file'] for a in A if a.get('type') != 'video' and a.get('file')]
    mu = BRIEF.get('music'); snd = [P / x for x in ('brief.json', 'scenes.js', 'timeline.json', 'vo.wav', 'assets.json', 'clips/meta.json')] + [P / m['audio'] for m in meta.values() if m.get('audio')] + ([P / mu] if isinstance(mu, str) and ('/' in mu or '.' in mu) else [])
    if kind == 'pic': return pic
    if kind == 'snd': return snd
    return list(dict.fromkeys(pic + snd + [P / x for x in ('script.json', 'short.json', 'facts.json', 'audio/words.json', 'article/article.md', '校对单.md')] + sorted((P / 'audio').glob('*.wav')) + [KIT / 'build.py']))
def fingerprint(kind):
    """返回 (总指纹, {文件: 内容哈希})；不存在的文件记成 '-'，所以“删掉一个文件”也算改动。"""
    m = {}
    for f in fp_files(kind):
        k = ('kit/' + str(f.relative_to(KIT))) if f.is_relative_to(KIT) else str(f.relative_to(P)) if f.is_relative_to(P) else str(f)
        m[k] = sha(f) if f.is_file() else '-'
    return hashlib.sha256(json.dumps(m, sort_keys=True).encode()).hexdigest()[:16], m
def fp_diff(old, new):
    """两份文件哈希表之间改了哪些，给人看的短名单。"""
    ch = sorted(k for k in set(old) | set(new) if old.get(k) != new.get(k))
    return '、'.join(ch[:6]) + (f' 等 {len(ch)} 个文件' if len(ch) > 6 else '') if ch else '（文件表一样，指纹算法变了）'
def state(): return jload('_build_state.json', {}) or {}
def remember(out, kind):
    """记下一个产物（silent.mp4、mix.wav、封面）是用哪一版输入做出来的，以及它自己的内容哈希。"""
    S = state(); fp, m = fingerprint(kind); S[Path(out).name] = {'kind': kind, 'fp': fp, 'files': m, 'sha': sha(P / out)}
    STATE.write_text(json.dumps(S, ensure_ascii=False, indent=1), encoding='utf-8')
def stale(out):
    """产物还能不能用：没记录、文件被换过、或输入改过，都返回一句原因；能用返回 None。"""
    e = state().get(Path(out).name); f = P / out
    if not f.is_file(): return f'没有 {out}'
    if not e: return f'{out} 没有版本记录（旧版引擎做的，或不是 build.py 做的），重新生成'
    if sha(f) != e['sha']: return f'{out} 在生成之后被换过或改过'
    fp, m = fingerprint(e['kind'])
    return None if fp == e['fp'] else f'{out} 生成之后输入改过：{fp_diff(e["files"], m)}'
def verify_out(out, dur, w=None, h=None, tol=.6):
    """出完的成片回读一遍：有画面有声音、尺寸对、画面和声音各自的时长都对；不对就退出码 1，不报“已出”。
    按流量时长，不按容器时长：容器时长取最长的那条流，画面短了一截时它照样是对的。"""
    w = w or CW; h = h or CH; d = {}
    r = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'stream=codec_type,width,height,duration', '-of', 'json', str(P / out)], capture_output=True, text=True)
    for st in json.loads(r.stdout or '{}').get('streams', []): d.setdefault(st['codec_type'], st)
    v, a = d.get('video'), d.get('audio'); vd = float(v.get('duration') or 0) if v else 0; ad = float(a.get('duration') or 0) if a else 0
    bad = '读不出画面' if not v else '没有声音' if not a else f"尺寸是 {v['width']}x{v['height']}，应为 {w}x{h}" if (v['width'], v['height']) != (w, h) else f"画面 {vd:.2f}s，应约 {dur:.2f}s" if abs(vd - dur) > tol else f"声音 {ad:.2f}s，应约 {dur:.2f}s" if abs(ad - dur) > tol else None
    if bad: print(f'✗ {out} 回读不对：{bad}，不能交付'); sys.exit(1)
def scene_cuts(path, th=0.3):
    r = subprocess.run(['ffmpeg', '-hide_banner', '-i', str(path), '-an', '-vf', f"scale=320:-2,select='gt(scene,{th})',showinfo", '-f', 'null', '-'], capture_output=True, text=True)
    return [round(float(x), 2) for x in re.findall(r'pts_time:([\d.]+)', r.stderr)]
def silences(path):
    r = subprocess.run(['ffmpeg', '-hide_banner', '-i', str(path), '-vn', '-af', 'silencedetect=noise=-35dB:d=0.5', '-f', 'null', '-'], capture_output=True, text=True)
    s = re.findall(r'silence_start: ([\d.]+)', r.stderr); e = re.findall(r'silence_end: ([\d.]+)', r.stderr); return [[round(float(a), 2), round(float(b), 2)] for a, b in zip(s, e)]
def grab_at(path, t, w=480):
    from PIL import Image; import io
    r = subprocess.run(['ffmpeg', '-v', 'error', '-ss', f'{max(0, t):.3f}', '-i', str(path), '-frames:v', '1', '-vf', f'scale={w}:-2', '-f', 'image2pipe', '-c:v', 'mjpeg', '-'], capture_output=True)
    return Image.open(io.BytesIO(r.stdout)).convert('RGB') if r.stdout else None
def contact_sheet(path, times, out, cols=4, w=480, labels=None):
    """带时间码的联系表：一眼看完一条素材，选入出点时直接读图上的秒数。"""
    from PIL import Image, ImageDraw
    ims = [(t, grab_at(path, t, w)) for t in times]; ims = [(t, im) for t, im in ims if im]
    if not ims: return
    h = ims[0][1].height; rows = -(-len(ims) // cols); sheet = Image.new('RGB', (cols * w, rows * h), (20, 20, 20)); d = ImageDraw.Draw(sheet)
    for i, (t, im) in enumerate(ims):
        x, y = (i % cols) * w, (i // cols) * h; sheet.paste(im.resize((w, h)), (x, y)); lab = (labels[i] + ' ' if labels else '') + f'{t:.1f}s'; d.rectangle([x, y, x + 12 + 9 * len(lab), y + 26], fill=(0, 0, 0)); d.text((x + 6, y + 6), lab, fill=(255, 230, 80))
    sheet.save(out, quality=85)
def assets():
    A = jload('assets.json', []) or []; meta = jload('clips/meta.json', {}) or {}
    for a in A:
        if a.get('type') == 'video' and a['id'] in meta: a['clip'] = meta[a['id']]
        a['license_name'] = BASIS.get(a.get('usage_basis'), '')
    return A
def cmd_probe():
    src = P / 'footage'; out = {}; (src / '_sheets').mkdir(parents=True, exist_ok=True)
    for f in sorted(src.iterdir()):
        if f.suffix.lower() not in ('.mp4', '.mov', '.m4v', '.mkv', '.webm', '.avi', '.ogv'): continue
        m = ffprobe(f)
        if not m: print('读不了', f.name); continue
        m['cuts'] = scene_cuts(f); m['silences'] = silences(f) if m['has_audio'] else []; m['sha256'] = sha(f); out[f.name] = m
        n = min(24, max(8, int(m['duration'] // 2))); contact_sheet(f, [m['duration'] * (i + .5) / n for i in range(n)], src / '_sheets' / (f.stem + '.jpg'))
        print(f"{f.name}: {m['duration']}s {m['width']}x{m['height']} {m['fps']}fps {m['orientation']} 声音{'有' if m['has_audio'] else '无'} 切点{len(m['cuts'])}个 → footage/_sheets/{f.stem}.jpg")
    json.dump(out, open(src / '_index.json', 'w'), ensure_ascii=False, indent=1)
SENT_PAD = 0.12; PAUSE = 0.35   # "@s3" 写法：句子边界外留的余量（秒）；转写时多长的停顿算断句
def transcript_of(src):
    for f in (P / 'footage' / (src.stem + '.transcript.json'), src.parent / (src.stem + '.transcript.json')):
        if f.exists(): return f, json.load(open(f, encoding='utf-8'))
    return None, None
def in_out(a, src, m, hs=None):
    """入出点：数字是秒；"@s3" 是 transcribe 出来的第 3 句（in 取句首、out 取句尾，各往外留 0.12 秒，不越过相邻句子的中点）。"""
    def one(v, edge):
        if v is None: return 0.0 if edge == 'in' else m['duration']
        if not (isinstance(v, str) and re.fullmatch(r'@s\d+', v.strip())): return float(v)
        f, T = transcript_of(src)
        if not T: print(f"✗ {a['id']} 的 {edge} 写了 {v}，但还没有转写：python3 ../kit/build.py transcribe {a['id']}"); sys.exit(1)
        if hs and T.get('sha256') and T['sha256'] != hs: print(f"✗ {f.name} 是旧素材的转写（文件改过），重新运行 transcribe {a['id']}"); sys.exit(1)
        S = T['sentences']; k = int(v.strip()[2:])
        if not 1 <= k <= len(S): print(f"✗ {a['id']} 的 {edge} 写了 {v}，转写只有 {len(S)} 句"); sys.exit(1)
        x = S[k - 1]
        if edge == 'in': t = x['start'] - SENT_PAD; t = max(t, (S[k - 2]['end'] + x['start']) / 2) if k > 1 else t; return round(max(0.0, t), 3)
        t = x['end'] + SENT_PAD; t = min(t, (x['end'] + S[k]['start']) / 2) if k < len(S) else t; return round(min(m['duration'], t), 3)
    return one(a.get('in'), 'in'), one(a.get('out'), 'out')
def footage_file(arg):
    """命令行参数：素材 id（assets.json）或文件名（项目目录或 footage/ 里）。"""
    a = next((a for a in (jload('assets.json', []) or []) if a.get('id') == arg), None)
    for c in ([P / a['file']] if a else []) + [P / arg, P / 'footage' / arg]:
        if c.is_file(): return c
    print('✗ 找不到素材：', arg, '（写 assets.json 里的 id，或 footage/ 里的文件名）'); sys.exit(1)
def cmd_clips():
    """按台账切片。帧精确（重编码 + trim），统一到 30 帧；fit: cover 裁满 / contain 留边 / blur 模糊垫底。"""
    A = jload('assets.json', []) or []; cd = P / 'clips'; cd.mkdir(exist_ok=True); meta = jload('clips/meta.json', {}) or {}; plan = []
    for a in A:   # 先把所有入出点算出来、查一遍，有错就一条都不切
        if a.get('type') != 'video': continue
        src = P / a['file']; m = ffprobe(src)
        if not m: print('✗ 找不到或读不了', a['file']); sys.exit(1)
        hs = sha(src); t0, t1 = in_out(a, src, m, hs)
        if not (0 <= t0 < t1 <= m['duration'] + .05): print(f"✗ {a['id']} 入出点 {t0}–{t1} 超出素材时长 {m['duration']}"); sys.exit(1)
        plan.append((a, src, m, hs, t0, t1))
    for a, src, m, hs, t0, t1 in plan:
        w, h = (a.get('size') or [1280, 720]); fit = a.get('fit', 'cover'); sig = [hs, t0, t1, w, h, fit]
        if meta.get(a['id'], {}).get('sig') == sig and (cd / a['id']).exists(): print('· 已切好', a['id']); continue
        vf = {'cover': f'scale={w}:{h}:force_original_aspect_ratio=increase,crop={w}:{h}', 'contain': f'scale={w}:{h}:force_original_aspect_ratio=decrease,pad={w}:{h}:(ow-iw)/2:(oh-ih)/2',
              'blur': f'split[a][b];[a]scale={w}:{h}:force_original_aspect_ratio=increase,crop={w}:{h},boxblur=24:2[bg];[b]scale={w}:{h}:force_original_aspect_ratio=decrease[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2'}[fit]
        fd = cd / a['id']; shutil.rmtree(fd, ignore_errors=True); fd.mkdir()
        subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', str(src), '-an', '-vf', f'trim=start={t0}:end={t1},setpts=PTS-STARTPTS,fps={FPS},{vf},setsar=1', '-q:v', '3', str(fd / 'f%05d.jpg')], check=True)
        n = len(list(fd.glob('f*.jpg'))); wav = None
        if m['has_audio']:
            wav = f"clips/{a['id']}.wav"; subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', str(src), '-vn', '-af', f'atrim=start={t0}:end={t1},asetpts=PTS-STARTPTS,afade=t=in:d=0.06,afade=t=out:st={max(0, t1 - t0 - .08)}:d=0.08', '-ar', '44100', '-ac', '1', str(P / wav)], check=True)
        meta[a['id']] = {'n': n, 'fps': FPS, 'w': w, 'h': h, 'dur': round(n / FPS, 3), 'audio': wav, 'sig': sig}; print(f"✓ {a['id']}: {t0}–{t1}s → {n} 帧（{n / FPS:.2f}s）{'带原声' if wav else '无声'}" + (f"（{a.get('in', '')}–{a.get('out', '')}）" if isinstance(a.get('in'), str) or isinstance(a.get('out'), str) else ''))
    json.dump(meta, open(cd / 'meta.json', 'w'), ensure_ascii=False, indent=1)
# ---------- 转写：按讲话内容选入出点 ----------
ASR_MODEL = KIT / 'models' / 'sherpa-onnx-paraformer-zh-2023-09-14'   # 和 asr.py 同一个识别模型
def tc(x): return f"{int(x // 60):02d}:{x % 60:05.2f}"
def load_pcm(path, sr=16000):
    r = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(path), '-vn', '-ac', '1', '-ar', str(sr), '-f', 'f32le', '-'], capture_output=True)
    return np.frombuffer(r.stdout, dtype='float32').copy()
def cmd_transcribe(arg):
    """离线识别素材里的讲话，按停顿（和标点，模型给的话）切成句子：footage/<名字>.transcript.json，并打印“编号 起–止 文字”。"""
    src = footage_file(arg)
    try:
        import sherpa_onnx
        if not (ASR_MODEL / 'model.int8.onnx').exists(): raise FileNotFoundError(f'缺少识别模型 {ASR_MODEL}')
    except Exception as e:
        print('转写没法运行：', e); print('需要 pip install sherpa-onnx（云端加 --break-system-packages）和识别模型，下载命令见 SKILL.md「工坊在哪」一节，模型解压到 kit/models/。'); sys.exit(2)
    m = ffprobe(src)
    if not m or not m['has_audio']: print('✗ 这条素材没有声音：', src.name); sys.exit(1)
    SRA = 16000; x = load_pcm(src, SRA); hop = int(.02 * SRA); nf = len(x) // hop
    if nf < 5: print('✗ 声音太短'); sys.exit(1)
    db = 10 * np.log10(np.mean(x[:nf * hop].reshape(nf, hop) ** 2, 1) + 1e-10); thr = max(np.percentile(db, 95) - 30, -55); quiet = db < thr
    def pause(a, b, need=PAUSE):   # a–b 之间有没有一段至少 need 秒的静音
        run = 0
        for q in quiet[max(0, int(a / .02)):min(nf, int(b / .02))]:
            run = run + 1 if q else 0
            if run * .02 >= need: return True
        return False
    # 分段识别：在静音处切开，每段不超过 20 秒
    cuts = [0]; i = 0; best = None
    while i < nf:
        if quiet[i]:
            j = i
            while j < nf and quiet[j]: j += 1
            if (j - i) * .02 >= .3: best = (i + j) // 2
            i = j
        else: i += 1
        if (i - cuts[-1]) * .02 > 20:
            c = best if best and best > cuts[-1] + 50 else cuts[-1] + int(np.argmin(db[cuts[-1] + 250:cuts[-1] + 1000])) + 250; cuts.append(c); best = None; i = max(i, c)
    cuts.append(nf)
    rec = sherpa_onnx.OfflineRecognizer.from_paraformer(paraformer=str(ASR_MODEL / 'model.int8.onnx'), tokens=str(ASR_MODEL / 'tokens.txt'), num_threads=4)
    toks = []; pad = np.zeros(SRA // 2, dtype='float32')
    for a, b in zip(cuts, cuts[1:]):
        seg_ = x[a * hop:b * hop]
        if quiet[a:b].all(): continue
        st = rec.create_stream(); st.accept_waveform(SRA, np.concatenate([pad, seg_, pad])); rec.decode_stream(st)
        toks += [(tk, round(a * .02 + ts - .5, 3)) for tk, ts in zip(st.result.tokens, st.result.timestamps) if tk.strip()]
    if not toks: print('没有识别出讲话'); sys.exit(1)
    PUNCT = '，。！？；、,.!?;'; sents = []; cur = []
    for k, (tk, t) in enumerate(toks):
        if tk in PUNCT:
            if cur: cur[-1] = (cur[-1][0], cur[-1][1], True)
            continue
        if cur and (cur[-1][2] or t - cur[-1][1] > .8 or pause(cur[-1][1] + .08, t)): sents.append(cur); cur = []
        cur.append((tk, t, False))
    sents.append(cur); sents = [c for c in sents if c]
    out = []   # 太长的句子在最大的停顿处再切一刀
    while sents:
        c = sents.pop(0)
        if len(c) > 30:
            gaps = [c[i + 1][1] - c[i][1] for i in range(8, len(c) - 8)]; i = 8 + int(np.argmax(gaps)) + 1; sents[:0] = [c[:i], c[i:]]; continue
        out.append(c)
    def text(c, times=False):
        s = ''; ct = []
        for tk, t_, _ in c:
            w = tk.replace('@@', '')
            if s and re.match(r'[A-Za-z0-9]', w) and re.search(r'[A-Za-z0-9]$', s) and not prev.endswith('@@'): s += ' '; ct.append(t_)
            s += w; ct += [t_] * len(w); prev = tk
        return ct if times else s
    S = []
    for k, c in enumerate(out):
        a = c[0][1]; b = c[-1][1]; nxt = out[k + 1][0][1] if k + 1 < len(out) else len(x) / SRA; prv = S[-1]['end'] if S else 0
        i = int(a / .02)
        while i > 0 and not quiet[i - 1] and a - (i - 1) * .02 < .3 and (i - 1) * .02 > prv: i -= 1   # 句首往前找到声音真正起来的地方
        st = max(prv, min(a, i * .02)); j = int((b + .1) / .02)
        while j < nf and not quiet[j] and (j + 1) * .02 < min(nxt, b + .8): j += 1   # 句尾往后找到声音落下去的地方
        S.append({'n': k + 1, 'start': round(st, 2), 'end': round(max(b + .2, min(j * .02, nxt - .02)), 2), 'text': text(c), 'ct': [round(v, 3) for v in text(c, True)]})   # ct：每个字在素材里的发音时刻（口播线用它把画面挂在词上）
    f = P / 'footage' / (src.stem + '.transcript.json'); f.parent.mkdir(exist_ok=True)
    json.dump({'source': str(src.relative_to(P)) if src.is_relative_to(P) else str(src), 'sha256': sha(src), 'model': ASR_MODEL.name, 'duration': m['duration'], 'sentences': S}, open(f, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    for x_ in S: print(f"s{x_['n']:<3} {tc(x_['start'])}–{tc(x_['end'])}  {x_['text']}")
    print(f'{len(S)} 句 → footage/{f.name}。assets.json 里写 "in":"@s3","out":"@s5" 就是第 3 句开头到第 5 句结尾（各留 {SENT_PAD} 秒余量）。识别会有错字，选点前对照联系表和原声核一下。')

# ---------- 口播线：把一条录好的口播变成时间轴 ----------
_strip = lambda z: re.sub(r'[\s，。！？；：、,.!?;:“”"《》（）()·\-—…]', '', z or '')
def talk_doubts(src, T):
    """复核识别：每一句换两种切法各再识别一遍，和第一遍逐字比。三遍里有不一样的地方，记成这一句的存疑（doubt），要人对着原声听。
    它只抓得到“识别不稳”的字；三遍都错成同一个字的（专有名词常这样）抓不到，那要靠查证和通读。"""
    import sherpa_onnx, difflib
    x = load_pcm(src, 16000); rec = sherpa_onnx.OfflineRecognizer.from_paraformer(paraformer=str(ASR_MODEL / 'model.int8.onnx'), tokens=str(ASR_MODEL / 'tokens.txt'), num_threads=4); pad = np.zeros(8000, dtype='float32'); n = 0
    def hear(a, b):
        st = rec.create_stream(); st.accept_waveform(16000, np.concatenate([pad, x[max(0, int(a * 16000)):int(b * 16000)], pad])); rec.decode_stream(st); return _strip(st.result.text)
    for q in T['sentences']:
        base = _strip(q['text']); found = []
        for pre, post in ((.12, .15), (.45, .5)):
            alt = hear(q['start'] - pre, q['end'] + post)
            for tag, i1, i2, j1, j2 in difflib.SequenceMatcher(None, base, alt, autojunk=False).get_opcodes():
                if tag == 'equal' or (tag in ('insert', 'delete') and (i1 == 0 or i2 == len(base))): continue   # 句子两头多出来或少掉的字是旁边那一句的
                if tag == 'replace' and (i1 == 0 or i2 == len(base)) and abs((i2 - i1) - (j2 - j1)) > 1: continue
                d = {'a': base[i1:i2], 'b': alt[j1:j2], 'at': i1}
                if not any(f['a'] == d['a'] and f['b'] == d['b'] for f in found): found.append(d)
        q['doubt'] = found; n += bool(found)
    return n
def talk_sheet(S, SS, name='校对单.md'):
    """校对单：一句一行，识别原文、字幕、改了哪里、哪里存疑。出片前给出镜人或用户过一遍。"""
    rows = []; fixed = 0; open_ = 0
    for l in S:
        if 'src' not in l: continue
        q = SS[l['src']]; raw = _strip(q['text']); now = _strip(l['vo']); chg = '' if raw == now else '改了字'; fixed += bool(chg)
        db = '；'.join(f"{d['a'] or '∅'}／{d['b'] or '∅'}" for d in q.get('doubt', [])); ok = (l['asr_ok'] if isinstance(l.get('asr_ok'), str) else '已听过') if l.get('asr_ok') else ''; open_ += bool(db and not ok)
        rows.append(f"| {l['id']} | {tc(q['start'])} | {q['text']} | {l['vo']} | {chg} | {db} | {ok} |")
    (P / name).write_text('# 校对单\n\n识别会错字，尤其是人名、地名、书名、术语和同音字。“改了字”是校对时改过的，“存疑”是换个切法再识别结果不一样的地方：这两类请对着原声听一遍。\n'
        '三遍识别都一样的错字这张表标不出来，所以每一句的字幕都请扫一眼。确认后在 brief.json 的 talk 里写 "proofread":"谁在哪天看过"。\n\n| 句 | 素材里的时间 | 识别原文 | 字幕 | 改动 | 存疑（第一遍／再识别） | 确认 |\n|---|---|---|---|---|---|---|\n' + '\n'.join(rows) + '\n', encoding='utf-8')
    return fixed, open_
def talk_check(tl):
    """口播校对：识别不稳的字有没有人听过、专有名词查了没有、校对单给人看过没有。"""
    TK = BRIEF.get('talk') or {}; fails = []; warns = []; src = P / TK.get('file', ''); f, T = transcript_of(src) if src.is_file() else (None, None)
    if not T: return ['找不到口播的转写：先运行 build.py talk'], []
    SS = {x['n']: x for x in T['sentences']}; L = [l for l in tl if 'src' in l]
    if any('doubt' not in SS.get(l['src'], {}) for l in L): return ['转写还没做复核识别：重新运行 build.py talk'], []
    for l in L:
        q = SS[l['src']]
        if q['doubt'] and not l.get('asr_ok'): fails.append(f"{l['id']}（素材 {tc(q['start'])}）识别不稳：" + '；'.join(f"{d['a'] or '∅'}／{d['b'] or '∅'}" for d in q['doubt']) + f"。字幕现在是「{l['vo']}」：对着原声听过、改对之后，在这一句写 \"asr_ok\": true（听不了原声、只是按上下文定的，写成一句理由，如 \"asr_ok\":\"上下文只能是红纸\"，校对单里会照样列出来）")
    terms = TK.get('terms')
    if terms is None: warns.append('brief.json 的 talk 里没有 terms：把人名、地名、书名、术语这些专有名词列出来逐个查证（[{"term":"神荼","basis":"查证的来源，或“出镜人确认”"}]），确实没有就写 []。识别对专有名词常常稳定地错成同音字，复核抓不到')
    else:
        allvo = ''.join(l['vo'] for l in L)
        for x in terms:
            if not x.get('basis'): fails.append(f"专有名词「{x.get('term')}」没写 basis：查证的来源，或“出镜人确认”")
            if x.get('term') and x['term'] not in allvo: warns.append(f"专有名词「{x['term']}」不在字幕里：是不是又被改了")
    fixed = sum(_strip(SS[l['src']]['text']) != _strip(l['vo']) for l in L)
    if not TK.get('proofread'): warns.append(f'校对单还没有人确认（改了字的 {fixed} 句，都在 校对单.md 里）：给出镜人或用户看过之后，在 brief.json 的 talk 里写 "proofread":"谁在哪天看过"')
    return fails, warns
def cmd_talk(arg=None):
    """口播线的准备：转写 → script.json 草稿（一句一行，src 是转写的第几句）→ 按 script.json 留下的句子剪出口播（长停顿收紧、删掉的句子剪掉）
    → footage/_talk.mp4、audio/<句id>.wav、audio/words.json（逐字时间，来自原声）、assets.json 里的 talk 片段并切片。
    改了 script.json（删句子、调顺序以外的改动：校对错字只改 vo，不动 tts）之后重新运行一遍。"""
    TK = BRIEF.get('talk') or {}; arg = arg or TK.get('file')
    if not arg: print('用法：build.py talk 口播视频文件（放在 footage/ 里），或在 brief.json 写 "talk":{"file":"footage/x.mp4","speaker":"名字"}'); sys.exit(1)
    if not TALK: print('✗ brief.json 要写 "mode":"talk"（口播线：时间轴跟原声走）'); sys.exit(1)
    src = footage_file(arg); f, T = transcript_of(src)
    if not T or T.get('sha256') != sha(src) or 'ct' not in (T.get('sentences') or [{}])[0]: cmd_transcribe(arg); f, T = transcript_of(src)
    if any('doubt' not in x for x in T['sentences']):   # 复核识别：换两种切法各再识别一遍，不一样的地方记成存疑
        nd = talk_doubts(src, T); json.dump(T, open(f, 'w', encoding='utf-8'), ensure_ascii=False, indent=1); print(f'复核识别：{nd} 句里有识别不稳的字' if nd else '复核识别：三遍结果一致（不等于没有错字，专有名词照样要查）')
    SS = {x['n']: x for x in T['sentences']}; m = ffprobe(src); sp = P / 'script.json'
    if not m: print('✗ 这条素材没有画面（口播线要的是带人像的视频）：', src.name); sys.exit(1)
    if not sp.exists():
        sp.write_text('[\n' + ',\n'.join(' ' + json.dumps({'id': f"s{x['n']}", 'ch': '', 'vo': x['text'], 'tts': x['text'], 'src': x['n']}, ensure_ascii=False) for x in T['sentences']) + '\n]\n', encoding='utf-8')
        print(f'已写 script.json 草稿（{len(SS)} 句）。接下来：对着原声校对错字（只改 vo，tts 留着识别原文）；口误、重复的句子整行删掉；填 ch 分章；标 beat、hl（字幕里要变色的词）。改完再运行一遍 talk。')
    S = json.load(open(sp, encoding='utf-8')); L = [l for l in S if 'src' in l]
    if not L: print('✗ script.json 里没有带 src 的句子'); sys.exit(1)
    for l in L:
        if l['src'] not in SS: print(f"✗ {l['id']} 的 src={l['src']}，转写里没有这一句"); sys.exit(1)
    PRE = .1; POST = float(TK.get('post', .25)); MAXP = float(TK.get('max_pause', .7)); q = lambda v: round(v * FPS) / FPS
    rng = []   # 每句在素材里取哪一段。下一句紧接着、中间停顿不长：连着取（不出剪辑点）；否则在句尾留一点气口就切
    for i, l in enumerate(L):
        x = SS[l['src']]; a = rng[-1][1] if rng and rng[-1][2] else max(0, x['start'] - PRE); nx = L[i + 1] if i + 1 < len(L) else None
        joined = bool(nx and nx['src'] == l['src'] + 1 and SS[nx['src']]['start'] - x['end'] <= MAXP)
        b = SS[nx['src']]['start'] - PRE if joined else min(x['end'] + POST, m['duration'], SS[l['src'] + 1]['start'] - .02 if l['src'] + 1 in SS else 1e9)
        rng.append([a, max(b, a + .2), joined])
    runs = []   # 连着的句子并成一段；每段的长度凑成整帧，声音和画面才不会越剪越错位
    for i, (a, b, j) in enumerate(rng):
        if runs and rng[i - 1][2]: runs[-1][1] = b; runs[-1][2].append(i)
        else: runs.append([a, b, [i]])
    for r in runs:
        d = q(r[1] - r[0]); r[1] = r[0] + d; rng[r[2][-1]][1] = r[1]
    kept = sum(r[1] - r[0] for r in runs); out = P / 'footage' / '_talk.mp4'; (P / 'audio').mkdir(exist_ok=True)
    fc = ''.join(f"[0:v]trim=start={a:.4f}:end={b:.4f},setpts=PTS-STARTPTS,fps={FPS}[v{k}];[0:a]atrim=start={a:.4f}:end={b:.4f},asetpts=PTS-STARTPTS[a{k}];" for k, (a, b, _) in enumerate(runs))
    fc += ''.join(f'[v{k}][a{k}]' for k in range(len(runs))) + f"concat=n={len(runs)}:v=1:a=1[v][a];[v]scale='min(1280,iw)':-2,setsar=1[vo]"
    ff = P / 'footage' / '_talk.filter'; ff.write_text(fc)
    r = subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', str(src), '-filter_complex_script', str(ff), '-map', '[vo]', '-map', '[a]', '-c:v', 'libx264', '-crf', '16', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', str(out)]); ff.unlink()
    if r.returncode: print('✗ 剪口播失败'); sys.exit(1)
    x = load_pcm(src, SR); W = {}; fade = int(.008 * SR)
    for i, (l, (a, b, j)) in enumerate(zip(L, rng)):
        y = x[int(round(a * SR)):int(round(b * SR))].astype('float64')
        if not (i and rng[i - 1][2]) and len(y) > 2 * fade: y[:fade] *= np.linspace(0, 1, fade)   # 剪辑点上淡入淡出几毫秒，不出“啪”的一声
        if not j and len(y) > 2 * fade: y[-fade:] *= np.linspace(1, 0, fade)
        sf.write(P / 'audio' / f"{l['id']}.wav", y, SR); s_ = SS[l['src']]; spoken = l.get('tts') or l['vo']
        if len(s_['ct']) != len(spoken): print(f"△ {l['id']} 的 tts 被改过（{len(spoken)} 字，识别原文 {len(s_['ct'])} 字）：逐字时间按比例估。校对错字请只改 vo")
        ct = [round(max(0, s_['ct'][min(len(s_['ct']) - 1, round(k * (len(s_['ct']) - 1) / max(1, len(spoken) - 1)))] - a), 3) for k in range(len(spoken))]
        W[l['id']] = {'text': spoken, 'ct': ct, 'ok': True, 'score': 1.0, 'diffs': [], 'talk': True, 'wav': wav_sha(l['id'])}   # 原声剪出来的音频，记下指纹，之后被换掉会被查出来
    json.dump(W, open(P / 'audio' / 'words.json', 'w', encoding='utf-8'), ensure_ascii=False)
    A = jload('assets.json', []) or []; A = [a for a in A if a.get('id') != 'talk']; k = min(1, 960 / max(m['width'], m['height'])); size = [int(m['width'] * k) // 2 * 2, int(m['height'] * k) // 2 * 2]
    A.insert(0, {'id': 'talk', 'type': 'video', 'file': 'footage/_talk.mp4', 'usage_basis': 'own', 'creator': TK.get('speaker') or '出镜人本人', 'source': f"自己录制的口播：{src.name}", 'in': 0, 'out': round(kept, 3), 'size': size, 'fit': 'cover'})
    (P / 'assets.json').write_text(json.dumps(A, ensure_ascii=False, indent=1), encoding='utf-8'); cmd_clips()
    fixed, open_ = talk_sheet(S, SS); print(f'校对单.md：改了字的 {fixed} 句，存疑还没听过的 {open_} 句')
    cuts = len(runs) - 1; drop = len(SS) - len(L)
    print(f"口播：素材 {m['duration']:.1f} 秒 → 剪成 {kept:.1f} 秒，{len(L)} 句（删掉 {drop} 句），{cuts} 个剪辑点，收紧停顿和删句共去掉 {m['duration'] - kept:.1f} 秒")
    print('下一步：build.py timeline，然后写 scenes.js（风格包 talk，见 templates/口播片.md）')

# ---------- 挑镜头 ----------
def frame_stats(path, m, fps, w=320):
    """抽样逐帧统计：清晰度（拉普拉斯方差）、平均亮度、过暗/过亮像素比例、和上一帧的平均差。"""
    h = max(2, round(w * m['height'] / m['width'] / 2) * 2); n = w * h; out = []; prev = None
    pr = subprocess.Popen(['ffmpeg', '-v', 'error', '-i', str(path), '-an', '-vf', f'fps={fps},scale={w}:{h},format=gray', '-f', 'rawvideo', '-'], stdout=subprocess.PIPE)
    k = 0
    while True:
        b = pr.stdout.read(n)
        if len(b) < n: break
        f = np.frombuffer(b, dtype=np.uint8).reshape(h, w).astype('float32'); lap = 4 * f[1:-1, 1:-1] - f[:-2, 1:-1] - f[2:, 1:-1] - f[1:-1, :-2] - f[1:-1, 2:]
        out.append((k / fps, float(lap.var()), float(f.mean()), float(((f < 10) | (f > 245)).mean()), float(np.abs(f - prev).mean()) if prev is not None else 0.0)); prev = f; k += 1
    pr.wait(); return np.array(out) if out else np.zeros((0, 5))
def cmd_pick(arg, top=8):
    """挑镜头：切点把素材分成镜头（长于 6 秒的镜头按约 4 秒分段），每段按清晰度、亮度、运动量、时长打分，列出前 top 个，出一张带时间码的联系表。只是建议。"""
    src = footage_file(arg); m = ffprobe(src)
    if not m: print('✗ 读不了', src); sys.exit(1)
    dur = m['duration']; sfps = 5 if dur <= 600 else 2; st = frame_stats(src, m, sfps); vfps = m['fps'] or 30; mg = 4 / vfps
    cuts = [c for c in scene_cuts(src) if .2 < c < dur - .2]; shots = []
    for i, (a, b) in enumerate(zip([0.0] + cuts, cuts + [dur])):
        a2, b2 = a + (mg if i else 0), b - (mg if b < dur else 0); k = max(1, round((b2 - a2) / 4)) if b2 - a2 > 6 else 1
        for j in range(k): shots.append((f'S{i + 1:02d}' + (f'.{j + 1}' if k > 1 else ''), a2 + (b2 - a2) * j / k, a2 + (b2 - a2) * (j + 1) / k))
    rows = []
    for sid, a, b in shots:
        sel = st[(st[:, 0] >= a) & (st[:, 0] <= b)] if len(st) else st
        if len(sel) == 0: continue
        sharp = float(np.median(sel[:, 1])); lum = float(np.median(sel[:, 2])); clip_ = float(np.median(sel[:, 3])); mot = sel[1:, 4] if len(sel) > 1 else sel[:, 4]; mv = float(np.median(mot)) if len(mot) else 0.0; spike = float(mot.max()) if len(mot) else 0.0
        s_sharp = float(np.clip((np.log10(sharp + 1) - 1.3) / 1.4, 0, 1))   # 绝对清晰度：方差 20 以下算糊，500 以上算清楚（320 像素宽）；后面再和同一条素材里的排名平均
        s_lum = float(np.clip(min((lum - 15) / 35, (240 - lum) / 40, 1), 0, 1)) * (1 - float(np.clip((clip_ - .3) / .4, 0, 1)))
        s_mot = (.4 + .6 * mv / 1.5 if mv < 1.5 else 1.0 if mv <= 12 else float(np.clip(1 - (mv - 12) / 28, 0, 1))) * (.7 if spike > 60 else 1)   # 几乎不动给一半分（可以推拉）；晃得厉害、中间闪一下要扣分
        d = b - a; s_dur = min(1.0, d / 2); sc = (.35 * s_sharp + .25 * s_lum + .25 * s_mot + .15 * s_dur) * (1 if d >= 2 else .5)
        rows.append({'shot': sid, 'in': round(a, 2), 'out': round(b, 2), 'seconds': round(d, 2), 'score': round(sc, 3), 'sharp': round(s_sharp, 2), 'light': round(s_lum, 2), 'motion': round(s_mot, 2), 'length': round(s_dur, 2), 'raw': {'laplacian_var': round(sharp, 1), 'luma': round(lum, 1), 'clipped': round(clip_, 3), 'diff': round(mv, 2)}})
    if len(rows) > 1:   # 清晰度一半看绝对值、一半看在这条素材里的排名，同一种画质的素材之间也能分出先后
        order = np.argsort(np.argsort([r['raw']['laplacian_var'] for r in rows])) / (len(rows) - 1)
        for r, q in zip(rows, order): ns = .6 * r['sharp'] + .4 * float(q); r['score'] = round(r['score'] + .35 * (ns - r['sharp']) * (1 if r['seconds'] >= 2 else .5), 3); r['sharp'] = round(ns, 2)
    rows.sort(key=lambda r: -r['score']); best = rows[:top]; od = P / 'footage' / '_sheets'; od.mkdir(parents=True, exist_ok=True)
    print(f'{src.name}：{dur}s，切点 {len(cuts)} 个，分成 {len(shots)} 段，列出前 {len(best)} 个候选（分数：清晰 .35 + 亮度 .25 + 运动 .25 + 时长 .15；不足 2 秒减半）')
    for k, r in enumerate(best, 1): print(f"#{k:<2} {r['shot']:7} {tc(r['in'])}–{tc(r['out'])}  {r['seconds']:5.1f}s  分 {r['score']:.2f}（清晰 {r['sharp']:.2f} 亮度 {r['light']:.2f} 运动 {r['motion']:.2f} 时长 {r['length']:.2f}）  \"in\":{r['in']},\"out\":{r['out']}")
    times = []; labels = []
    for k, r in enumerate(best, 1):
        for lab, t in (('in', r['in'] + .1), ('mid', (r['in'] + r['out']) / 2), ('out', r['out'] - .1)): times.append(t); labels.append(f'#{k} {lab}')
    contact_sheet(src, times, od / f'{src.stem}_pick.jpg', cols=3, w=400, labels=labels)
    json.dump({'source': src.name, 'candidates': best}, open(od / f'{src.stem}_pick.json', 'w'), ensure_ascii=False, indent=1)
    print(f'联系表 footage/_sheets/{src.stem}_pick.jpg（每行一个候选：入点、中间、出点）。这是机器打分，选哪段还要看内容；台账没有改动。')

def assets_check(used):
    """素材授权：每条素材要有依据、来源、作者；需要署名的要有 credit；用到的视频要已切片；画面里用了台账外的图片也算不通过。"""
    A = assets(); fails = []; warns = []; ids = set(); ex_total = [0.0]
    for a in A:
        tag = f"素材 {a.get('id', '?')}"; ids.add(a.get('id'))
        if a.get('type') not in ('video', 'image'): fails.append(tag + ' 的 type 要填 video 或 image')
        if not (P / a.get('file', '')).is_file(): fails.append(tag + ' 的文件不存在：' + str(a.get('file')))
        if a.get('usage_basis') not in BASIS: fails.append(tag + f" 的 usage_basis 是「{a.get('usage_basis')}」。只能是 {' / '.join(BASIS)}；授权不明的素材不能进成片")
        if not a.get('source'): fails.append(tag + ' 没写 source（网址；自有素材写拍摄人和日期）')
        if not a.get('creator'): fails.append(tag + ' 没写 creator（作者或机构）')
        if a.get('usage_basis') in NEED_CREDIT and not a.get('credit'): fails.append(tag + ' 需要署名，但没写 credit（画面上显示的署名文字）')
        if a.get('usage_basis') == 'licensed' and not a.get('proof'): fails.append(tag + ' 标了已获授权，proof 里要写授权凭据（谁、何时、什么范围）')
        if a.get('usage_basis') == 'licensed' and a.get('proof_file') and not (P / a['proof_file']).is_file(): fails.append(tag + ' 的授权凭证文件不存在：' + a['proof_file'])
        if a.get('usage_basis') == 'licensed' and not a.get('proof_file'): warns.append(tag + ' 是授权素材：把书面授权（邮件、授权书扫描件）放进项目，proof_file 写它的路径')
        if a.get('usage_basis') == 'cc-by-sa': warns.append(tag + ' 是 CC BY-SA：成片里用到它的部分要以相同方式共享')
        if a.get('usage_basis') == 'excerpt':
            if not str(a.get('source', '')).startswith('http'): fails.append(tag + ' 是引用片段：source 要写下载它的网页地址')
            if not a.get('owner') and not a.get('creator'): fails.append(tag + ' 是引用片段：owner 写版权方（哪家公司、哪个媒体）')
            if 'clip' in a:
                d = a['clip'].get('dur', 0); ex_total[0] += d
                if d > EXCERPT_MAX: fails.append(tag + f' 是引用片段，切了 {d:.1f} 秒，超过 {EXCERPT_MAX} 秒：只取最能说明问题的一段（brief 的 excerpt_max 可调）')
        if a.get('type') == 'video' and 'clip' not in a: fails.append(tag + ' 还没切片：python3 ../kit/build.py clips')
        if a.get('type') == 'video' and a['id'] not in used: warns.append(tag + ' 在台账里但成片没用到')
    for u in used:
        if u not in ids: fails.append(f'画面用了台账里没有的片段 {u}')
    tl = jload('timeline.json', []) or []; total = max([x.get('t1', 0) + x.get('hold', 0) for x in tl] + [0])
    if ex_total[0] and total and ex_total[0] > EXCERPT_SHARE * total: warns.append(f'引用片段合计 {ex_total[0]:.0f} 秒，超过全片的 {EXCERPT_SHARE:.0%}：引用要为讲解服务，不能变成搬运')
    return fails, warns
def credits_file(name):
    A = assets()
    if not A: return
    L = ['素材来源与授权（由 assets.json 生成）', '成片：' + name, '']
    for a in A: L += [f"[{a['id']}] {'视频' if a['type'] == 'video' else '图片'}  {a.get('title', '')}", f"  文件：{a['file']}" + (f"  用到的片段：{a['clip']['sig'][1] if 'clip' in a and isinstance(a.get('in'), str) else a.get('in', 0)}–{a['clip']['sig'][2] if 'clip' in a and isinstance(a.get('out'), str) else a.get('out', '')} 秒" if a['type'] == 'video' else ''), f"  作者：{a.get('creator', '')}", f"  来源：{a.get('source', '')}", f"  依据：{BASIS.get(a.get('usage_basis'), a.get('usage_basis'))}" + (f"（{a['proof']}）" if a.get('proof') else ''), f"  署名：{a.get('credit', '不需要')}", '']
    (P / '素材来源与授权.txt').write_text('\n'.join(L), encoding='utf-8')
def cmd_study(path, th=0.3):
    """拉片：机器量切点和时长，输出镜头表骨架和联系表。只用来学结构和节奏，原片不进成片。"""
    src = Path(path); m = ffprobe(src)
    if not m: print('读不了', path); sys.exit(1)
    od = P / 'study' / src.stem; od.mkdir(parents=True, exist_ok=True); cuts = [0.0] + [c for c in scene_cuts(src, th) if c > .2] + [m['duration']]; shots = []
    for i, (a, b) in enumerate(zip(cuts, cuts[1:])):
        if b - a < .08: continue
        shots.append({'id': f'S{len(shots) + 1:02d}', 'start': round(a, 2), 'end': round(b, 2), 'seconds': round(b - a, 2), 'size': '', 'category': '', 'camera': '', 'frame': '', 'onscreen_text': '', 'audio': '', 'rhythm': '', 'note': ''})
    d = [s['seconds'] for s in shots]; prof = {'duration': m['duration'], 'shots': len(shots), 'avg_shot_seconds': round(sum(d) / len(d), 2), 'median_shot_seconds': round(sorted(d)[len(d) // 2], 2), 'cuts_per_minute': round(60 * (len(shots) - 1) / m['duration'], 1), 'first_cut_at': shots[0]['end'], 'shots_under_2s': sum(x < 2 for x in d), 'shots_over_8s': sum(x > 8 for x in d)}
    for n in range(0, len(shots), 20):
        part = shots[n:n + 20]; contact_sheet(src, [s['start'] + s['seconds'] * .5 for s in part], od / f'shots_{n // 20:02d}.jpg', cols=5, w=384, labels=[s['id'] for s in part])
    json.dump({'source': src.name, 'profile': prof, 'fields': {'size': '远/全/中/近/特', 'category': '定场/主体/访谈/反应/插入/字卡/图表/资料', 'camera': '固定/推/拉/摇/移/跟/手持', 'rhythm': '钩子/铺垫/推进/转折/兑现/喘息/收束'}, 'shots': shots}, open(od / 'shots.json', 'w'), ensure_ascii=False, indent=1)
    print(json.dumps(prof, ensure_ascii=False)); print(f'镜头表骨架和联系表在 {od}/：start/end/seconds 是量出来的不要改；其余字段看联系表填，只写看得见的')

def asr_check(tl):
    W = words(); fails = []; warns = []
    lines = [l for l in list(tl) + (json.load(open(P / 'short.json')) if (P / 'short.json').exists() else []) if not silent(l)]
    if not lines: return [], []
    if not W: return ['还没做配音回听：python3 ../kit/asr.py'], []
    for l in lines:
        w = W.get(l['id'])
        if not w or w.get('text') != (l.get('tts') or l['vo']): fails.append(f"{l['id']} 的稿子或配音改过，要重新回听"); continue
        if not w.get('wav'): fails.append(f"{l['id']} 的回听记录没有音频指纹（旧版 asr.py 写的），重跑 python3 ../kit/asr.py"); continue
        if w['wav'] != wav_sha(l['id']): fails.append(f"{l['id']} 的音频在回听之后换过（audio/{l['id']}.wav 和听过的那份不是同一个文件），重跑 python3 ../kit/asr.py"); continue
        d = '；'.join(f"{x['稿子'] or '∅'}→{x['听到'] or '∅'}" for x in w['diffs'])
        if not (w['ok'] or l.get('asr_ok')): fails.append(f"{l['id']} 回听不符（{w['score']}）：{d}")
        elif d and not l.get('asr_ok'): warns.append(f"{l['id']} 有个别字识别不同，请人听一下：{d}")
    return fails, warns

def need_seconds(s, pad=1.5):
    c = len(CJK.findall(s)); o = len(re.sub(r'\s', '', s)) - c; return max(READ_MIN, c / READ_CPS + o / 15 + READ_PAD)

def scan_check(sc):
    """用整片扫描结果查：文字停留、出画、压字幕带、文字互相重叠、画面空档、开场。"""
    W, H, step = sc['W'], sc['H'], sc['frames'][1]['t'] - sc['frames'][0]['t']; fails = {k: [] for k in ('read', 'frame')}; warns = {k: [] for k in ('subzone', 'overlap', 'dead', 'hook', 'small')}; small = {}; fails['unsafe'] = []; urun = {}
    key = lambda s: re.sub(r'[\d.,]+', '#', s); runs = {}; inside = set(); seen = {}; zone = (W / 2 - 520, H - 118, W / 2 + 520, H - 40) if not VERT else (SAFE[3], H - SAFE[2] - 130, W - SAFE[1], H - SAFE[2]);
    st, sr, sb, sl = SAFE; safe_ok = lambda b: b[0] >= sl - 2 and b[1] >= st - 2 and b[2] <= W - sr + 2 and b[3] <= H - sb + 2
    zrun = {}; orun = {}
    hit = lambda a, b: min(a[2], b[2]) - max(a[0], b[0]) > 0 and min(a[3], b[3]) - max(a[1], b[1]) > 0
    for fr in sc['frames']:
        t = fr['t']; vis = set(); allb = [(key(s), (x0, y0, x1, y1), a) for s, x0, y0, x1, y1, a, *_ in fr['tx'] if s.strip()]; fsz = {key(r[0]): r[6] for r in fr['tx'] if len(r) > 6}; vert = {key(s) for s, x0, y0, x1, y1, a, *_ in fr['tx'] if len(CJK.findall(s)) > 1 and (y1 - y0) > 1.6 * (x1 - x0)}; boxes = [x for x in allb if re.search(r'[A-Za-z一-鿿]', x[0])]
        for k, b, a in boxes:
            if a >= .8:
                seen.setdefault(k, t)
                px = fsz[k] if k in fsz else (b[2] - b[0]) if k in vert else (b[3] - b[1]) / 1.02
                if px < MIN_PX - 1.5: small.setdefault(k, (t, px))
                if b[0] >= -2 and b[1] >= -2 and b[2] <= W + 2 and b[3] <= H + 2: vis.add(k); inside.add(k)
            if a >= .6 and hit(b, zone): zrun.setdefault(k, []).append(t)
            if VERT and a >= .6 and not safe_ok(b): urun.setdefault(k, []).append(t)
        for i in range(len(allb)):   # 重叠检查把纯数字也算上
            for j in range(i + 1, len(allb)):
                (k1, b1, a1), (k2, b2, a2) = allb[i], allb[j]
                if k1 != k2 and a1 >= .6 and a2 >= .6 and hit(b1, b2):
                    ov = (min(b1[2], b2[2]) - max(b1[0], b2[0])) * (min(b1[3], b2[3]) - max(b1[1], b2[1])); sm = min((b[2] - b[0]) * (b[3] - b[1]) for b in (b1, b2))
                    if ov > .15 * max(1, sm): orun.setdefault(tuple(sorted((k1, k2))), []).append(t)
        for k in vis:
            r = runs.setdefault(k, [])
            if r and abs(r[-1][1] - (t - step)) < step / 2: r[-1][1] = t
            else: r.append([t, t])
    for k, rs in runs.items():
        n = need_seconds(k)
        for a, b in rs:
            got = b - a + step
            if got < n - 1e-6: fails['read'].append(f"{a:6.1f}s 「{k[:18]}」停留 {got:.1f}s，至少要 {n:.1f}s")
    for k, t in seen.items():
        if k not in inside: fails['frame'].append(f"{t:6.1f}s 「{k[:18]}」从没完整出现在画面里（被裁边）")
    for k, ts in zrun.items():
        if len(ts) * step >= .3: warns['subzone'].append(f"{ts[0]:6.1f}s 「{k[:18]}」进入字幕带 {len(ts) * step:.1f}s")
    for k, ts in urun.items():
        if len(ts) * step >= .5: fails['unsafe'].append(f"{ts[0]:6.1f}s 「{k[:18]}」在平台遮挡区里 {len(ts) * step:.1f}s：会被标题、文案或按钮盖住，挪进 safeBox()")
    for (a, b), ts in orun.items():
        if len(ts) * step >= .5: warns['overlap'].append(f"{ts[0]:6.1f}s 「{a[:12]}」和「{b[:12]}」重叠 {len(ts) * step:.1f}s")
    for k, (t, px) in small.items(): warns['small'].append(f"{t:6.1f}s 「{k[:18]}」只有 {px:.0f} 像素，手机上读不清（至少 {MIN_PX}）")
    # 画面空档：连续 4 秒以上几乎不动
    quiet = None
    for fr in sc['frames'][5:-30] + [{'t': sc['frames'][-30]['t'] if PROMO else sc['total'], 'df': 9}]:   # 宣传线：片尾定格的那三秒不算空档
        if fr['df'] < DEAD_DF: quiet = fr['t'] if quiet is None else quiet
        else:
            if quiet is not None and fr['t'] - quiet >= DEAD_SEC: warns['dead'].append(f"{quiet:6.1f}s 起 {fr['t'] - quiet:.1f}s 画面几乎不动：" + ('宣传片里两秒不动就是掉拍，换镜头或让主体动起来' if PROMO else '给这一段加一个和旁白对应的动作'))
            quiet = None
    first = min([t for t in seen.values()] + [e['t'] for e in sc['events']] + [99])
    if first > HOOK_SEC: warns['hook'].append(f"开场 {first:.1f}s 才出现第一个内容：前 1 秒就该有东西落地")
    return fails, warns
DEAD_DF = 0.12; MIN_PX = 32 if not VERT else 40   # 竖版在手机上整屏看，字再大一点

# ---------- 浏览器 ----------
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
    def translate_path(self, path):
        # 只许读工坊 kit/ 和项目目录里的文件：挡住 /kit//绝对路径、../ 越界，也不给密钥和隐藏文件（2026-10-09 评审 P1）
        from urllib.parse import unquote
        path = unquote(path.split('?')[0].split('#')[0])
        root, rel = (KIT, path[5:]) if path.startswith('/kit/') else (P, path[9:]) if path.startswith('/project/') else (P, path)
        root = os.path.normpath(str(root)); f = os.path.normpath(os.path.join(root, rel.lstrip('/\\')))
        parts = os.path.relpath(f, root).split(os.sep)
        if not f.startswith(root + os.sep) or any(x.startswith('.') for x in parts) or os.path.basename(f) in ('openrouter_key.txt',) or f.endswith('.key'): return os.path.join(root, '__forbidden__')
        return f
def browser(p, tl):
    srv = socketserver.TCPServer(('127.0.0.1', 0), Q); threading.Thread(target=srv.serve_forever, daemon=True).start()
    b = p.chromium.launch(args=['--enable-gpu-rasterization', '--ignore-gpu-blocklist']); pg = b.new_page(viewport={'width': CW, 'height': CH}); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: m.type == 'error' and errs.append(m.text))
    pg.goto(f'http://127.0.0.1:{srv.server_address[1]}/kit/film.html?packs=' + ','.join(BRIEF.get('packs', [])) + f'&w={CW}&h={CH}&lang={BRIEF.get("lang", "zh")}&look={BRIEF.get("look", "")}&safe=' + ','.join(map(str, SAFE)))   # lang：画面上的字出哪种语言（zh / en / bi），目前 gen 包的 say() 认它
    try: total = pg.evaluate('([tl,a])=>window.init(tl,a)', [tl, assets()])
    except Exception as e: print('页面没能启动：', '；'.join(errs[:5]) or str(e).split('\n')[0]); b.close(); sys.exit(1)
    return b, pg, total, errs
def pipe(out, crf=None):
    crf = BRIEF.get('crf', 18) if crf is None else crf   # 满屏细点的画面（gen 包）码率吃紧，brief.json 里 "crf":15
    return subprocess.Popen(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', str(FPS), '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-crf', str(crf), '-preset', 'medium', '-pix_fmt', 'yuv420p', str(out)], stdin=subprocess.PIPE)
def page_pass(tl, name, expr, cache=True):
    """在页面里跑一遍整片的量测（expr），结果存成 <name>；场景、时间轴、素材、引擎都没动过就直接用上次的。"""
    f = P / name; fp = fingerprint('pic')[0]   # 缓存按画面输入的内容指纹认，不按修改时间（时间会被拷贝、checkout 弄乱）
    if cache and f.exists():
        try: old = json.load(open(f))
        except Exception: old = None
        if isinstance(old, dict) and old.get('_fp') == fp: return old
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        b, pg, total, errs = browser(p, tl); sc = pg.evaluate(expr); b.close()
        if errs: print('页面报错', errs[:5]); sys.exit(1)
    if isinstance(sc, dict): sc['_fp'] = fp
    json.dump(sc, open(f, 'w'), ensure_ascii=False); return sc
def get_scan(tl, cache=True): return page_pass(tl, '_scan.json', '()=>window.scan(0.1)', cache)
def get_motion(tl, cache=True): return page_pass(tl, '_motion.json', '()=>window.motionScan(%d)' % FPS, cache)

# ---------- 文章转视频：原文依据 ----------
ARTICLE_BASIS = {'own': '自己的文章', 'licensed': '已获原作者书面授权', 'commentary': '介绍和评论别人的文章'}
def article_check(tl):
    """brief.json 有 source_article（这条片是从一篇文章来的）时查：凭什么用这篇文章、画面上有没有注明出处、视频稿是不是在照念原文。规矩见 templates/文章转视频.md"""
    SA = BRIEF.get('source_article') or {}; fails = []; warns = []; basis = SA.get('basis')
    if basis not in ARTICLE_BASIS: fails.append("source_article.basis 要填：own（" + ARTICLE_BASIS['own'] + "）/ licensed（" + ARTICLE_BASIS['licensed'] + "）/ commentary（" + ARTICLE_BASIS['commentary'] + "，只能用自己的话讲、少量引用）。这一项要问用户，不能替他猜")
    if basis == 'licensed' and not SA.get('proof'): fails.append('source_article 标了已获授权：proof 里写授权人、范围、日期（凭证文件放进项目，写在 proof_file）')
    credit = SA.get('credit')
    if basis != 'own' and (not credit or credit not in BRIEF.get('must_show', [])): fails.append('别人的文章要在画面上注明出处：把 source_article.credit 这一句原样写进 brief.json 的 must_show（检查会确认它清楚显示 ≥2 秒）')
    f = P / 'article' / 'article.json'
    if not f.exists(): warns.append('没有 article/article.json，没法比对视频稿和原文（python3 ../kit/article.py fetch 网址）'); return fails, warns
    D = json.load(open(f, encoding='utf-8')); norm = lambda x: re.sub(r'[^\u4e00-\u9fffA-Za-z0-9]', '', x)
    if SA.get('sha') and D['meta'].get('sha') and SA['sha'] != D['meta']['sha']: warns.append('article/ 里的文章和 brief.json 记的不是同一版（重新取过文？）：确认用的是哪一版，把 source_article.sha 改过来')
    art = norm(''.join(b.get('text', '') for b in D['blocks'] if not b.get('boiler') and b['type'] in ('p', 'quote', 'li', 'h'))); vo = norm(''.join(s.get('vo', '') for s in tl if not silent(s))); K = 12
    if len(vo) < K or len(art) < K: return fails, warns
    grams = {art[i:i + K] for i in range(len(art) - K + 1)}; hit = [False] * len(vo)
    for i in range(len(vo) - K + 1):
        if vo[i:i + K] in grams: hit[i:i + K] = [True] * K
    ratio = sum(hit) / len(vo); run = best = 0
    for h in hit: run = run + 1 if h else 0; best = max(best, run)
    if basis == 'commentary':
        if ratio > .25: fails.append(f'旁白有 {ratio * 100:.0f}% 和原文连续十几个字一模一样：这是在照念别人的文章。用自己的话重讲；要引原话就短引，并进断言台账标 quote')
        elif ratio > .12: warns.append(f'旁白有 {ratio * 100:.0f}% 和原文一模一样：介绍别人的文章要用自己的话，原话只留非引不可的')
        if best >= 60: warns.append(f'有一处连着 {best} 个字和原文相同：这么长的原话要当引文处理（画面上打引号、标出处，断言台账标 quote），或者改写')
    elif ratio > .6: warns.append(f'旁白有 {ratio * 100:.0f}% 是原文照搬：文章是给眼睛看的，视频稿要重讲——开头换成钩子、长句拆短、每句对一个画面（templates/文章转视频.md 第三节）')
    return fails, warns

# ---------- 节拍 ----------
def detect_beats(x, sr):
    """量速度和第一拍：短时能量的上升沿做成“起音曲线”，自相关找周期（60–180 拍/分），再找让拍点落在起音上的相位。返回 (bpm, 第一拍秒数, 可信度 0..1)。"""
    hop = 256; n = 1024; fr = 1 + (len(x) - n) // hop
    if fr < 200: return 0, 0, 0
    idx = np.arange(n)[None, :] + hop * np.arange(fr)[:, None]; mag = np.abs(np.fft.rfft(x[idx] * np.hanning(n), axis=1)); mag = np.log1p(40 * mag)
    on = np.maximum(0, np.diff(mag, axis=0)).sum(1); on = on - np.convolve(on, np.ones(43) / 43, 'same'); on = np.maximum(on, 0); f = sr / hop
    ac = np.correlate(on, on, 'full')[len(on) - 1:]; lo, hi = int(f * 60 / 200), int(f * 60 / 50)
    sc = np.array([ac[l] + .5 * ac[min(len(ac) - 1, 2 * l)] + .25 * ac[min(len(ac) - 1, 4 * l)] for l in range(lo, hi + 1)]); l0 = lo + int(sc.argmax())
    comb = lambda L, ph: on[np.clip(np.round(ph + L * np.arange(int((len(on) - ph) / L))).astype(int), 0, len(on) - 1)].mean()
    cand = np.arange(l0 - 1.5, l0 + 1.501, .02)   # 在整数周期附近细搜，拍点才不会越走越偏
    best = max(((comb(L, ph), L, ph) for L in cand for ph in np.arange(0, L, max(1, L / 24))), key=lambda z: z[0]); hit, L, ph = best
    conf = float(np.clip(1 - comb(L, ph + L / 2) / (hit + 1e-9), 0, 1)) * float(np.clip(hit / (on.mean() * 3 + 1e-9), 0, 1))   # 拍点上比两拍中间响多少 × 拍点上比平均响多少
    bpm = 60 * f / L
    while bpm > 160: bpm /= 2; L *= 2      # 折进 80–160：量出来的常是半拍或两拍
    while bpm < 80: bpm *= 2; L /= 2; ph = ph % L
    return bpm, ph / f + n / 2 / sr, conf
def cmd_beats(path):
    src = Path(path) if Path(path).exists() else P / path
    if not src.exists(): print('找不到', path); sys.exit(1)
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(src), '-t', '90', '-ac', '1', '-ar', '22050', '-f', 'f32le', '-'], capture_output=True).stdout
    bpm, off, conf = detect_beats(np.frombuffer(raw, dtype=np.float32).astype(np.float64), 22050)
    if not bpm: print('音乐太短（不到 3 秒），量不出速度'); sys.exit(1)
    print(f'速度约 {bpm:.1f} 拍/分，第一拍在 {off:.2f} 秒，可信度 {conf:.2f}' + ('（偏低：没有明显鼓点的音乐量不准，自己数一下）' if conf < .5 else ''))
    print(f'写进 brief.json：  "music": "{path}", "bpm": {bpm:.1f}, "beat_offset": {off:.2f}')
    print('程序分不清快一倍还是慢一倍、也分不清哪一拍是小节的第一拍：听着不对就把 bpm 乘 2 或除以 2，beat_offset 加减几拍（一拍 = 60÷bpm 秒）。')

# ---------- 动效 ----------
STILL_MV = 0.0005; JUMP_MV = 0.10 if PROMO else 0.03; JUMP_X = 6; SLOW_MS = 250   # 相邻两帧变了的像素不到万分之五算“没动”；超过 3%（宣传线 10%：大字砸下来本来就是一下）且是这一句平常的 6 倍算“跳变”；一帧画超过 250 毫秒算慢
def motion_stats(mo, tl):
    """按句子汇总：运动面积中位数、静止帧对占比、跳变。量法照 huashu-art-motion 的 qa.py：整片每一对相邻帧都量，不抽样。"""
    rows = []; fr = mo['frames']; BG = tl[0].get('_grid') if tl else None
    for s in tl:
        xs = [f for f in fr if s['t0'] <= f['t'] < s['t1']]
        if not xs: continue
        mv = sorted(f['mv'] for f in xs); med = mv[len(mv) // 2]; still = sum(v < STILL_MV for v in mv) / len(mv)
        edge = lambda f: f['t'] - s['t0'] < .6 or s['t1'] - f['t'] < .6   # 句子两头是分场淡入淡出和转场，本来就整屏在变
        # 跳变是“孤立的一下”：比这一句平常大得多，而且只持续一两对相邻帧（一对 = 硬切，连着两对 = 闪了一帧）；连着三对以上都大的是运镜或转场，不算
        thr = max(JUMP_MV, JUMP_X * max(med, STILL_MV)); jumps = []; onbeat = []; i = 0
        while i < len(xs):
            j = i
            while j < len(xs) and xs[j]['mv'] > thr: j += 1
            if 1 <= j - i <= 2 and not edge(xs[i]):
                bt = (xs[i]['t'] + 1 / FPS - BG['t0']) / BG['spb'] if BG else .5   # 卡在拍点上的硬切是有意的：不报，另计数
                (onbeat if BG and abs(bt - round(bt)) * BG['spb'] <= 1.01 / FPS else jumps).append(xs[i])
            i = max(j, i + 1)
        # 步进动画（一秒画几步，手绘动画的做法；art 包 look 的步进形式就是）：画面多数帧不动、隔一小会儿整屏换一下、反复出现，那是有意的节奏，不报
        gaps = [b['t'] - a['t'] for a, b in zip(jumps, jumps[1:])]; step = 0
        if len(jumps) >= 4 and still >= .4 and max(gaps) <= .5: step = max(1, round(len(gaps) / sum(gaps))); jumps = []   # 大半时间相邻帧不动，隔不到半秒整屏换一下，反复出现
        rows.append({'id': s['id'], 't0': s['t0'], 'dur': s['t1'] - s['t0'], 'med': med, 'still': still, 'jumps': jumps, 'step': step, 'onbeat': len(onbeat), 'ms': sorted(f['ms'] for f in xs)[len(xs) // 2]})
    return rows
def motion_check(mo, tl):
    rows = motion_stats(mo, tl); warns = {'jump': [], 'still': [], 'slow': [], 'det': []}
    for r in rows:
        for f in r['jumps']: warns['jump'].append(f"{f['t']:6.1f}s 相邻两帧有 {f['mv'] * 100:.0f}% 的画面变了（{r['id']} 这一句平常是 {r['med'] * 100:.1f}%）：硬切、闪烁或穿帮，看这一帧；有意的拍点可以保留")
        if r['dur'] >= 4 and r['still'] > .85 and not r['step']: warns['still'].append(f"{r['t0']:6.1f}s {r['id']} 这一句有 {r['still'] * 100:.0f}% 的时间相邻帧完全不动：画是静的，只是偶尔换一下。给主体一个持续的小动作")
    ms = sorted(f['ms'] for f in mo['frames']); med = ms[len(ms) // 2] if ms else 0
    if med > SLOW_MS: warns['slow'].append(f"画一帧的中位耗时 {med:.0f} 毫秒，整片渲染大约 {med * mo['total'] * FPS / 60000:.0f} 分钟：整屏重绘改用步进形式 look(名字, t, {{draw, fps}})，或只在几句里用")
    for d in mo['det']:
        if not d['same']: warns['det'].append(f"{d['t']:6.1f}s 同一时刻画两遍，结果不一样：用了 Math.random、Date，或有跨帧累积的状态（比如画进一张不清空的离屏）。重渲、抽帧和回归样张都会和成片对不上")
    return rows, warns

# ---------- 宣传片：按产品的特性选样子 ----------
def cmd_look():
    """按 brief.json 的 product（kind 产品类型，traits 特性词）给宣传片的样子排个序，并说出每种样子的动效、配乐、拍速、要准备的真东西。只建议，不改 brief。"""
    PR = BRIEF.get('product') or {}; K = LOOKS['kinds']; kind = PR.get('kind'); tr = PR.get('traits') or []
    if kind not in K: print('brief.json 里先写 "product":{"kind":"…","traits":["…"]}。kind 四选一：'); [print(f'  {k:9s}{v["name"]}') for k, v in K.items()]; print('traits 写这个产品的三五个特性词（如：效率、质感、智能、亲切），用来在同一类里挑样子'); return
    rows = []
    for i, (lid, L_) in enumerate(LOOKS['looks'].items()):
        base = (len(K[kind]['order']) - K[kind]['order'].index(lid)) * 2 if lid in K[kind]['order'] else 0; hit = [w for w in tr if any(w in x or x in w for x in L_['traits'])]; rows.append((base + 1.5 * len(hit), -i, lid, L_, hit))
    rows.sort(reverse=True); print(f"产品类型：{K[kind]['name']}　特性：{'、'.join(tr) or '（没写）'}"); print(f"这一类片子：钩子用{K[kind]['hook']}；画框用 {K[kind]['frame']}；证明放{K[kind]['prove']}\n")
    for n, (sc_, _, lid, L_, hit) in enumerate(rows):
        print(f"{'推荐' if n == 0 else '备选' if sc_ > 0 else '不配'}  {lid:7s}{L_['name']}" + (f"（对上的特性：{'、'.join(hit)}）" if hit else '')); print(f"        动效：{L_['motion']}"); print(f"        配乐 {L_['music']}，{L_['bpm_range'][0]}–{L_['bpm_range'][1]} 拍；平均镜头 {L_['pace_avg']:g} 秒以内，单个不超过 {L_['shot_max']:g} 秒"); print(f"        要准备：{L_['needs']}"); print(f"        别用在：{L_['avoid']}")
    b = rows[0]; print(f'\n选定后在 brief.json 写："look":"{b[2]}","packs":["promo"]（配乐和拍速不写就用这套样子的缺省：{b[3]["music"]}、{b[3]["bpm"]} 拍）。用户有授权的音乐时 music 写文件路径，bpm 用 build.py beats 量。')

# ---------- 镜头节奏（宣传线） ----------
CUT_MV = 0.25   # 相邻两帧有四分之一以上的画面变了，算一次换镜头
def shot_cuts(mo):
    """从逐帧运动量里找换镜头的时刻：大面积变化只持续半秒以内的算一次（硬切、闪切、很短的擦切）；持续更久的是运镜或慢转场，不算。"""
    fr = mo['frames']; cuts = []; i = 0
    while i < len(fr):
        j = i
        while j < len(fr) and fr[j]['mv'] > CUT_MV: j += 1
        if j > i and j - i <= FPS * .5 and (not cuts or fr[i]['t'] + 1 / FPS - cuts[-1] >= .2): cuts.append(round(fr[i]['t'] + 1 / FPS, 3))   # 一道擦切中途画面变化会落一下，隔不到 0.2 秒的算同一次
        i = max(j, i + 1)
    return cuts
def pace_stats(mo, tl, sc=None):
    BG = tl[0].get('_grid') if tl else None; a, b = tl[0]['t0'], tl[-1]['t1']; cuts = [c for c in shot_cuts(mo) if a + .1 < c < b - .1]
    told = sorted(e['t'] for e in (sc or {}).get('events', []) if e['type'] == '_cut' and a + .1 < e['t'] < b - .1)   # 场景自己声明的换屏时刻（叠化、暗底上的擦切，量画面量不出来）
    cuts = sorted(told + [c for c in cuts if not any(-.1 <= c - x <= .7 for x in told)])
    edges = [a] + cuts + [b]; shots = sorted(((y - x, x) for x, y in zip(edges, edges[1:])), reverse=True); ls = sorted(d for d, _ in shots); n = len(ls)
    off = []
    if BG:
        for c in cuts:
            k = (c - BG['t0']) / (BG['spb'] / 2)   # 半拍也算在点上
            if abs(k - round(k)) * BG['spb'] / 2 > 1.6 / FPS: off.append(c)
    return {'n': n, 'dur': b - a, 'avg': (b - a) / n, 'longest': shots[:3], 'p10': ls[int(n * .1)], 'p90': ls[min(n - 1, int(n * .9))], 'cuts': cuts, 'off': off, 'grid': bool(BG)}
def pace_line(st): return f"镜头 {st['n']} 个，平均 {st['avg']:.1f} 秒，最长 {st['longest'][0][0]:.1f} 秒（{st['longest'][0][1]:.1f}s 起），短的约 {st['p10']:.1f} 秒、长的约 {st['p90']:.1f} 秒" + (f"；换镜头 {len(st['cuts'])} 次，{len(st['cuts']) - len(st['off'])} 次在拍点上" if st['grid'] and st['cuts'] else '')
def pace_check(mo, tl, sc=None):
    """宣传线才查：镜头够不够短、有没有快慢对比、换镜头在不在拍点上、口号最后有没有落在画面上。阈值是经验值，brief 里可改：shot_max、pace_avg。"""
    st = pace_stats(mo, tl, sc); fails = []; warns = []; smax = float(BRIEF.get('shot_max', LOOK.get('shot_max', 4))); pavg = float(BRIEF.get('pace_avg', LOOK.get('pace_avg', 2.5)))
    if not st['grid']: warns.append('宣传片没写 bpm：先定音乐和拍点，再按拍子排镜头（用自己的音乐先跑 build.py beats 音乐文件）')
    if st['avg'] > pavg: warns.append(f"平均一个镜头 {st['avg']:.1f} 秒（{st['dur']:.0f} 秒里只有 {st['n']} 个镜头）：宣传片读起来会拖，目标是平均 {pavg:g} 秒以内。检查只认得硬切和半秒内的擦切，慢叠化不算换镜头")
    for d, t0 in st['longest']:
        if d > smax: warns.append(f"{t0:6.1f}s 起一个镜头 {d:.1f} 秒，超过 {smax:g} 秒：切开，或者确认它是全片要“停下来”的那一拍（全片最多留一两处）")
    if st['n'] >= 6 and st['p90'] < 2 * st['p10']: warns.append(f"镜头长短都差不多（短的 {st['p10']:.1f} 秒，长的 {st['p90']:.1f} 秒）：没有快慢对比，像节拍器。蓄力的地方放慢，爆点后连切")
    if st['off'] and len(st['off']) > .15 * len(st['cuts']): warns.append(f"{len(st['off'])} 次换镜头不在拍点上（{'、'.join(f'{c:.2f}s' for c in st['off'][:6])}{'…' if len(st['off']) > 6 else ''}）：差几帧比不卡点还难受，时刻用 beatT / barT 取")
    slogan = BRIEF.get('slogan')
    PR = BRIEF.get('product') or {}
    if PR.get('kind') not in LOOKS['kinds']: warns.append(f"brief.json 没写 product.kind（{' / '.join(LOOKS['kinds'])}）：先分清是哪一类产品，再选样子、动效和配乐（build.py look 会给建议）")
    elif 'promo' in BRIEF.get('packs', []) and not LOOK: warns.append('用了风格包 promo 但没写 look：build.py look 看建议')
    elif LOOK and PR['kind'] not in LOOK['kinds']: warns.append(f"样子「{LOOK['name']}」一般不配{LOOKS['kinds'][PR['kind']]['name'].split('（')[0]}（它适合：{'、'.join(LOOKS['kinds'][k]['name'].split('（')[0] for k in LOOK['kinds'])}）。确认是有意的，在导演阐述里写理由")
    if not slogan: warns.append('brief.json 没写 slogan：宣传片要有一句观众带得走的话，写进 brief，检查会看它最后有没有落在画面上')
    elif sc:
        step = sc['frames'][1]['t'] - sc['frames'][0]['t']; tail = st['dur'] * .7 + tl[0]['t0']; key = re.sub(r'[\s，。！？、,.!?]', '', slogan)
        n = sum(1 for fr in sc['frames'] if fr['t'] >= tail and key in re.sub(r'[\s，。！？、,.!?]', '', ''.join(r[0] for r in fr['tx'] if r[5] >= .8)))
        if n * step < 1.2: fails.append(f'口号「{slogan}」没有在片尾三成里清楚停留 1.2 秒以上：最后一个画面要把它和品牌名一起留住')
    return st, fails, warns

# ---------- 竖版 ----------
def short_plan(tl):
    B = {s['id']: s for s in tl}; pos = lambda r: B[r[0]]['t0'] + B[r[0]]['dur'] * r[1]; SL = 0.35; SG = 0.3; W = words()
    t = SL; segs = []; mix = []
    for l in json.load(open(P / 'short.json')):
        x, sr, dur, lead, voiced = measure(P / 'audio' / f"{l['id']}.wav")
        segs.append({'t0': t, 't1': t + dur + SG, 'src': (pos(l['src'][0]), pos(l['src'][1])), 'chunks': chunks_for(l['vo'], t, lead, voiced, dur, SG, maxlen=14, minlen=0, ct=char_times(l, W))}); mix.append((t, x)); t += dur + SG
    total = t + 0.2; buf = np.zeros(int(total * sr) + sr)
    for t0, x in mix: buf[int(t0 * sr):int(t0 * sr) + len(x)] += x
    sf.write(P / 'short_vo.wav', buf[:int(total * sr)], sr); return segs, total
def short_at(segs, t):
    for s in segs:
        if s['t0'] <= t < s['t1']:
            k = (t - s['t0']) / (s['t1'] - s['t0']); return s['src'][0] + (s['src'][1] - s['src'][0]) * k, next((c['text'] for c in s['chunks'] if c['t0'] <= t < c['t1']), '')
    return (segs[0]['src'][0] if t < segs[0]['t0'] else segs[-1]['src'][1]), ''

def show(title, fails, warns):
    print(('✗ ' if fails else '△ ' if warns else '✓ ') + title + (f'：{len(fails)} 项不通过' if fails else '') + (f'，{len(warns)} 项提醒' if warns else ''))
    for x in fails: print('    ✗', x)
    for x in warns: print('    △', x)

if __name__ == '__main__':
    if len(sys.argv) < 2 or sys.argv[1] in ('-h', '--help', 'help'): print(__doc__); sys.exit()
    cmd = sys.argv[1]
    if cmd == 'probe': cmd_probe(); sys.exit()
    if cmd == 'beats': cmd_beats(sys.argv[2]); sys.exit()
    if cmd == 'clips': cmd_clips(); sys.exit()
    if cmd == 'transcribe': cmd_transcribe(sys.argv[2]); sys.exit()
    if cmd == 'look': cmd_look(); sys.exit()
    if cmd == 'talk': cmd_talk(sys.argv[2] if len(sys.argv) > 2 else None); sys.exit()
    if cmd == 'pick': cmd_pick(sys.argv[2], int(sys.argv[3]) if len(sys.argv) > 3 else 8); sys.exit()
    if cmd == 'study': cmd_study(sys.argv[2], float(sys.argv[3]) if len(sys.argv) > 3 else 0.3); sys.exit()
    if cmd == 'lines':
        L = [l for l in json.load(open(P / 'script.json')) + (json.load(open(P / 'short.json')) if (P / 'short.json').exists() else []) if not silent(l)]
        VO = BRIEF.get('voice', {}) or {}; sty = lambda l: (l.get('tone') or VO.get('style') or '').replace('|', '／').strip()
        (P / 'lines.txt').write_text(''.join(f"{l['id']}|{l.get('tts') or l['vo']}" + (f"|{sty(l)}" if sty(l) else '') + "\n" for l in L), encoding='utf-8'); print('lines.txt', len(L), '句，', sum(len(l.get('tts') or l['vo']) for l in L), '字', f'（{sum(1 for l in L if sty(l))} 句带语气提示）')
        if VO: print('配音命令（在用户电脑的项目文件夹里，前台分批跑）：python3 <工坊>/kit/tts_openrouter.py run lines.txt', VO.get('model', 'google/gemini-3.8-flash-tts'), VO.get('voice', 'Charon'), VO.get('speed', ''))
        sys.exit()
    tl, total = timeline(); print('正片时长', round(total, 2), '（逐字时间：%d/%d 句）' % (sum('ct' in s for s in tl), len(tl)))
    if cmd == 'timeline': sys.exit()
    if cmd == 'facts': f, w = facts_check(tl); show('断言台账', f, w); sys.exit(1 if f else 0)
    if cmd == 'check':
        rep = {}; f, w = facts_check(tl); rep['断言台账'] = (f, w); rep['叙事线'] = story_check(tl); f, w = asr_check(tl); rep['配音回听'] = (f, w)
        if TALK: rep['口播校对'] = talk_check(tl)
        sc = get_scan(tl, cache='--fresh' not in sys.argv); F, Wn = scan_check(sc)
        if (P / 'assets.json').exists(): rep['素材授权'] = assets_check(set(sc.get('used', {})))
        rep['阅读时长'] = (F['read'], []); rep['文字出画'] = (F['frame'], []); rep['平台遮挡区'] = (F['unsafe'], []) if VERT else ([], []); rep['字幕带'] = ([], Wn['subzone']); rep['文字重叠'] = ([], Wn['overlap']); rep['画面空档'] = ([], Wn['dead']); rep['开场'] = ([], Wn['hook']); rep['小字'] = ([], Wn['small'])
        miss = {}; [miss.setdefault(m.split('|')[0], []).append(m.split('|')[1]) for m in sc.get('miss', [])]
        need = BRIEF.get('must_show', []); shown = {}
        for fr in sc['frames']:
            for r in fr['tx']:
                for m in need:
                    if m in r[0] and r[5] >= .8: shown[m] = shown.get(m, 0) + 1
        rep['必须出现的声明'] = ([f'画面上没有出现「{m}」，或停留不到 2 秒（brief.json 的 must_show 要求）' for m in need if shown.get(m, 0) * (sc['frames'][1]['t'] - sc['frames'][0]['t']) < 2], [])
        if BRIEF.get('source_article'): rep['原文依据'] = article_check(tl)
        rep['字体缺字'] = ([], [f"{'毛笔体' if k == 'Brush' else '草书'}没有这些字，会回落成楷体：{''.join(sorted(v))}（换字、换成宋体，或装全字库）" for k, v in miss.items()])
        if '--no-motion' not in sys.argv:   # 动效：相邻帧量出来的运动、跳变、耗时，和“同一时刻画两遍是否一样”。都是提醒：数字是线索，要看帧才能下结论
            mo = get_motion(tl, cache='--fresh' not in sys.argv); rows, Mw = motion_check(mo, tl)
            rep['确定性'] = ([], Mw['det']); rep['跳变'] = ([], Mw['jump']); rep['逐帧不动'] = ([], Mw['still']); rep['渲染耗时'] = ([], Mw['slow'])
            if PROMO: st, pf, pw = pace_check(mo, tl, sc); rep['镜头节奏'] = (pf, pw); print('  ', pace_line(st))
        elif PROMO: rep['镜头节奏'] = ([], ['加了 --no-motion：镜头节奏没有查，宣传片出片前要查一遍'])
        for k, (f, w) in rep.items(): show(k, f, w)
        nf = sum(len(f) for f, _ in rep.values()); nw = sum(len(w) for _, w in rep.values())
        fp, fm = fingerprint('all')   # 这份报告认的是哪一版输入：稿子、台账、配音、画面、引擎任何一样改了，final 都不认它
        json.dump({'fails': nf, 'warns': nw, 'fp': fp, 'files': fm, 'detail':{k: {'fails': f, 'warns': w} for k, (f, w) in rep.items()}}, open(P / 'check_report.json', 'w'), ensure_ascii=False, indent=1)
        import datetime
        with open(P / 'check_history.jsonl', 'a', encoding='utf-8') as fh: fh.write(json.dumps({'time': datetime.datetime.now().isoformat(timespec='seconds'), 'fails': nf, 'warns': nw, 'by': {k: len(f) + len(w) for k, (f, w) in rep.items()}}, ensure_ascii=False) + '\n')   # 复盘时统计“检查拦下了什么”
        print(f'总计：{nf} 项不通过，{nw} 项提醒（提醒要逐条看帧确认，不能直接忽略）'); sys.exit(1 if nf else 0)
    if cmd == 'motion':   # 动效数字：每句的运动面积、静止帧对、跳变、每帧耗时；最后是确定性
        mo = get_motion(tl, cache='--fresh' not in sys.argv); rows, Mw = motion_check(mo, tl)
        print('句子      起点    时长   运动面积(中位)  静止帧对   跳变   每帧毫秒')
        for r in rows: print(f"{r['id']:8s}{r['t0']:6.1f}s {r['dur']:5.1f}s {r['med'] * 100:10.2f}%   {r['still'] * 100:7.0f}%  {len(r['jumps']):5d}  {r['ms']:8.0f}" + (f"   步进，约 {r['step']} 步/秒" if r['step'] else '') + (f"   卡点硬切 {r['onbeat']} 处" if r['onbeat'] else ''))
        mv = sorted(f['mv'] for f in mo['frames']); n = len(mv)
        print(f"全片：运动面积中位数 {mv[n // 2] * 100:.2f}%，静止帧对 {sum(v < STILL_MV for v in mv) / n * 100:.0f}%，确定性 {sum(d['same'] for d in mo['det'])}/{len(mo['det'])} 处一致")
        print('读法：运动面积多数好看的段落在 0.5%–8%；静止帧对超过四成读起来是“一卡一卡”；跳变先看帧再判断。数字是线索，不是结论。')
        for k, title in (('det', '确定性'), ('jump', '跳变'), ('still', '逐帧不动'), ('slow', '渲染耗时')): show(title, [], Mw[k])
        sc_ = get_scan(tl); print(pace_line(pace_stats(mo, tl, sc_)))
        if PROMO: st, pf, pw = pace_check(mo, tl, sc_); show('镜头节奏', pf, [w for w in pw if 'slogan' not in w])
        sys.exit()
    if cmd == 'mix':
        sc = get_scan(tl); ev = list(sc['events']); seen = set()
        for s in tl:   # 每换一章加一声转场
            if s['ch'] not in seen and seen: ev.append({'type': 'whoosh', 't': s['t0'] - .25})
            seen.add(s['ch'])
        clipev = [e for e in ev if e['type'].startswith('clip:')]; ev = [e for e in ev if not e['type'].startswith('clip:')] if BRIEF.get('sfx', True) else []   # brief.json 写 "sfx":false 就不加音效（水墨一类安静的片子）
        duck = BRIEF.get('duck', 12); orig = None
        if duck is False or not clipev: n = sfx_track(ev, total, clips=clipev); print('音效', n, '个', f'素材原声 {sum(1 for e in clipev if e["gain"] > 0)} 段' if clipev else '')   # 没有原声或 duck:false：和旧做法一样，原声混在音效轨里
        else:
            n = sfx_track(ev, total); no, sec = orig_track(clipev, total, tl, duck=duck); print('音效', n, '个', f'素材原声 {no} 段（单独一轨，旁白下压低 {duck} dB，共 {sec:.1f} 秒）')
            if no: orig = 'orig.wav'
        music(total, tl=tl); mixdown('vo.wav', 'music.wav', 'mix.wav', 'sfx.wav', mu_db=MU_DB() + 15 * sum(s['dur'] for s in tl if silent(s)) / max(1, sum(s['dur'] for s in tl)), orig=orig); remember('mix.wav', 'snd'); sys.exit()
    if cmd == 'final':
        name = sys.argv[2]; r = jload('check_report.json'); why = []
        if not r: why.append('还没跑 check')
        elif r['fails']: why.append(f"check 有 {r['fails']} 项不通过")
        elif 'fp' not in r: why.append('check 报告没有版本指纹（旧版引擎写的），重跑 check')
        else:
            fp, fm = fingerprint('all')
            if fp != r['fp']: why.append('check 之后输入改过：' + fp_diff(r.get('files', {}), fm) + '，重跑 check')
        lead = BRIEF.get('cover_lead', not (PROMO or TALK)) is not False
        for out, how in [('silent.mp4', 'render'), ('mix.wav', 'mix')] + ([(COVER_NAME, 'cover')] if lead else []):
            s = stale(out)
            if s: why.append(f'{s}（重跑 {how}）')
        if why:
            print('不能出片：'); [print('    ✗', w) for w in why]
            if '--force' not in sys.argv: print('都处理完再 final；确实要出片就加 --force（交付时要说明哪一项没过）'); sys.exit(1)
            print('    加了 --force，照样出片：交付说明里要写明上面这几项')
        if BRIEF.get('cover_lead', not (PROMO or TALK)) is False:   # 不在片头垫封面（无旁白的短片从黑场开始）。silent.mp4 是母版（crf 低、很大），这里压成能上传的大小：码率封顶 12M
            subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', 'silent.mp4', '-i', 'mix.wav', '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-crf', str(BRIEF.get('final_crf', 20)), '-maxrate', '12M', '-bufsize', '24M', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '256k', '-shortest', '-movflags', '+faststart', name + '.mp4'], check=True); verify_out(name + '.mp4', total)
            srt([c for s in tl for c in s['chunks']], P / (name + '.srt'), 0); credits_file(name); print('已出', name + '.mp4', name + '.srt'); sys.exit()
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-loop', '1', '-framerate', '30', '-t', str(COVER), '-i', COVER_NAME, '-f', 'lavfi', '-t', str(COVER), '-i', 'anullsrc=r=44100:cl=stereo', '-i', 'silent.mp4', '-i', 'mix.wav', '-filter_complex', f"[0:v]scale={CW}:{CH},format=yuv420p,fade=t=out:st=1.6:d=0.4,setsar=1[c];[2:v]fps=30,format=yuv420p,setsar=1[m];[3:a]aresample=44100[ma];[c][1:a][m][ma]concat=n=2:v=1:a=1[v][a]", '-map', '[v]', '-map', '[a]', '-c:v', 'libx264', '-crf', '24', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', name + '.mp4'], check=True); verify_out(name + '.mp4', COVER + total)
        srt([c for s in tl for c in s['chunks']], P / (name + '.srt'), COVER); credits_file(name); print('已出', name + '.mp4', name + '.srt'); print('交付后做复盘，把这条片记进模板台账：python3 ../kit/workshop.py retro --delivered'); sys.exit()
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        b, pg, total, errs = browser(p, tl)
        grab = lambda t: base64.b64decode(pg.evaluate("async t=>{await window.renderFrameA(t);return document.getElementById('c').toDataURL('image/jpeg',.93)}", t).split(',')[1])
        if cmd == 'stills':
            od = P / (sys.argv[3] if len(sys.argv) > 3 else 'stills'); od.mkdir(exist_ok=True)
            if len(sys.argv) > 3 and re.fullmatch(r'[\d.]+', sys.argv[3]): print('时刻用逗号隔开写成一个参数：stills 3,10,20 [目录]'); sys.exit(1)
            for t in sys.argv[2].split(','): (od / f't{float(t):06.2f}.jpg').write_bytes(grab(float(t)))
        elif cmd == 'sheet':   # 总览图：每 N 秒一帧，9 帧一张，存到 sheets/
            from PIL import Image; import io
            step = float(sys.argv[2]) if len(sys.argv) > 2 else 5; od = P / 'sheets'; od.mkdir(exist_ok=True); ts = list(np.arange(step / 2, total - 1, step))
            for n in range(0, len(ts), 9):
                im = Image.new('RGB', (CW, CH)); tw_, th_ = CW // 3, CH // 3
                for i, t in enumerate(ts[n:n + 9]): im.paste(Image.open(io.BytesIO(grab(float(t)))).resize((tw_, th_)), ((i % 3) * tw_, (i // 3) * th_))
                im.save(od / f'sheet{n // 9:02d}_{ts[n]:.0f}s.jpg', quality=86)
            print('总览图', -(-len(ts) // 9), '张，在 sheets/')
        elif cmd == 'render':
            (P / 'render.pid').write_text(str(os.getpid()))   # 要停后台渲染：kill $(cat render.pid)；别用 pkill/pgrep -f，会匹配到发命令的那个 shell 自己
            ff = pipe(P / (sys.argv[2] if len(sys.argv) > 2 else 'silent.mp4')); n = round(total * FPS)
            for i in range(n):
                ff.stdin.write(grab(i / FPS))
                if i % 600 == 0: print(i, n, flush=True)
            ff.stdin.close(); rc = ff.wait()
            out = P / (sys.argv[2] if len(sys.argv) > 2 else 'silent.mp4')
            if rc: print(f'编码失败：ffmpeg 退出码 {rc}，{out.name} 不能用', flush=True); sys.exit(1)
            pr = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-count_packets', '-show_entries', 'stream=width,height,nb_read_packets', '-of', 'csv=p=0', str(out)], capture_output=True, text=True).stdout.strip().split(',')
            if len(pr) < 3 or (int(pr[0]), int(pr[1])) != (CW, CH) or abs(int(pr[2]) - n) > 2: print(f'输出不对：{out.name} 是 {pr}，应为 {CW}x{CH}、{n} 帧', flush=True); sys.exit(1)
            if errs: print('页面报错，', out.name, '不能用：', errs[:5], flush=True); sys.exit(1)
            remember(out.name, 'pic'); print('done', n, flush=True)
        elif cmd == 'cover':
            for v, name in ([('wide', '封面_横版.png'), ('tall', '封面_竖版.png')] if not VERT else [('vert', '封面_9x16.png'), ('tall', '封面_3x4.png')]):
                (P / name).write_bytes(base64.b64decode(pg.evaluate('v=>window.coverFrame(v)', v).split(',')[1]))
                if not errs: remember(name, 'pic')   # 页面报错时画出来的封面不算数，final 会拦
        elif cmd == 'short' and VERT: print('这条片本身就是竖版，不需要 short；横版片才用 short 另出竖版'); sys.exit(1)
        elif cmd == 'short':
            segs, stot = short_plan(tl); print('短片时长', round(stot, 2)); vf = lambda t: base64.b64decode(pg.evaluate('([t,s,p])=>window.vertFrameA(t,s,p)', [*short_at(segs, t), t / stot]).split(',')[1])
            if sys.argv[2] == 'stills':
                for k, s in enumerate(segs): (P / f'short_still_{k}.jpg').write_bytes(vf(s['t0'] + (s['t1'] - s['t0']) * .8))
            else:
                ff = pipe(P / 'short_silent.mp4', 20)
                for i in range(round(stot * FPS)): ff.stdin.write(vf(i / FPS))
                ff.stdin.close(); rc = ff.wait(); nf = round(stot * FPS)
                if rc or errs: print(f'✗ 竖版短片画面没出好：' + (f'ffmpeg 退出码 {rc}' if rc else f'页面报错 {errs[:3]}')); sys.exit(1)
                music(stot, 'short_music.wav'); mixdown('short_vo.wav', 'short_music.wav', 'short_mix.wav', mu_db=MU_DB())
                subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', 'short_silent.mp4', '-i', 'short_mix.wav', '-loop', '1', '-framerate', '30', '-t', '2.5', '-i', '封面_竖版.png', '-f', 'lavfi', '-t', '2.5', '-i', 'anullsrc=r=44100:cl=stereo', '-filter_complex', "[0:v]fps=30,format=yuv420p,setsar=1[m];[1:a]aresample=44100[ma];[2:v]scale=1080:1440,pad=1080:1920:0:240:color=0x061230,format=yuv420p,fade=t=in:st=0:d=0.3,setsar=1[e];[m][ma][e][3:a]concat=n=2:v=1:a=1[v][a]", '-map', '[v]', '-map', '[a]', '-c:v', 'libx264', '-crf', '22', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', sys.argv[3] + '.mp4'], check=True)
                verify_out(sys.argv[3] + '.mp4', stot + 2.5, 1080, 1920)   # 片尾垫 2.5 秒竖版封面
                srt([c for s in segs for c in s['chunks']], P / (sys.argv[3] + '.srt')); print('已出', sys.argv[3] + '.mp4')
        if errs: print('页面报错', errs[:5]); sys.exit(1)
        b.close()
