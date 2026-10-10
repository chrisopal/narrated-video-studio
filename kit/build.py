#!/usr/bin/env python3
"""讲解视频工坊 · 构建脚本（在项目目录里运行：python3 ../kit/build.py <命令>）
项目目录：brief.json（题材、风格、受众）  script.json（[{id,ch,vo,tts?,hold?}]）  scenes.js（window.FILM）
          facts.json（断言台账）  assets.json（素材台账：图片和视频）  footage/（原始视频）  audio/<id>.wav  short.json（竖版，可选）
命令（按制作顺序）：
  study 参考片.mp4 [阈值]   拉片：切点、镜头时长、节奏数据、联系表 → study/<名字>/（只学结构，不进成片）
  probe                    看素材：footage/ 里每条视频的时长/尺寸/切点/静音段 + 带时间码的联系表 → footage/_index.json
  transcribe 文件名或素材id  把素材里的讲话转成带时间的句子 → footage/<名字>.transcript.json；assets.json 的 in/out 可写 "@s3"/"@s5"
  pick 文件名 [个数]        挑镜头：按清晰度、亮度、运动量、时长给镜头打分，列出候选入出点 + 联系表 footage/_sheets/<名字>_pick.jpg（只建议，不改台账）
  clips                    按 assets.json 里的入出点切片、统一成 30 帧、拆帧 → clips/<id>/
  facts                    检查断言台账 facts.json
  lines                    写出 lines.txt（id|朗读文本[|语气提示]），交给配音脚本；语气来自句子的 tone 或 brief.voice.style
  timeline                 配音时长（有 audio/words.json 就用逐字时间）→ timeline.json + vo.wav
  stills 3,10,20 [目录]    抽帧检查
  sheet [间隔秒]           整片总览图（每 5 秒一帧，9 帧一张）→ sheets/
  （文章转视频：先用 python3 ../kit/article.py fetch 网址，见 templates/文章转视频.md）
  check [--no-motion]      交付前总检查：断言、素材授权、回听、阅读时长、出画、字幕带、重叠、小字、空档、动效 → check_report.json
  beats 音乐文件            量一条音乐的速度和第一拍的位置，给出要写进 brief.json 的 bpm、beat_offset（卡点的片子用）
  motion                   动效数字：每句的运动面积、静止帧对、跳变、每帧耗时，全片的确定性（同一时刻画两遍是否一样）
  render [out.mp4]         横版无声视频
  mix                      配乐 + 音效 + 素材原声（有旁白处自动压低）+ 配音 → mix.wav（响度 -14 LUFS）
  final 名字 [--force]     封面 2 秒 + 正片 + 音轨 → <名字>.mp4、<名字>.srt、素材来源与授权.txt
  cover                    封面_横版.png / 封面_竖版.png
  short stills|render 名字 竖版短片（short.json：[{id,vo,src:[[句id,比例],[句id,比例]]}]）
配音回听是单独的脚本：python3 ../kit/asr.py
模板台账、回归样张、复盘是工坊级的脚本：python3 ../kit/workshop.py
brief.json 里和构建有关的字段：packs 风格包列表；music 配乐（pad 缺省 / guqin 五声拨弦 / 文件路径）；sfx:false 不加音效；read_cps、read_pad 阅读速度；
          duck 旁白下素材原声压低的分贝数（缺省 12；false 不压低，原声和音效同轨，即旧做法）
          tiers_required:true 断言台账每条都要填 tier（来源层级）；must_show:[…] 画面上必须清楚出现 ≥2 秒的声明
          bpm 节拍网格（每分钟几拍；写了它，每一句都从拍点上开始，分场里可以用 beatT、barT、pulse 卡点）；meter 一小节几拍（缺省 4）；
          beat_offset 网格上某个小节第一拍在片中的秒数（用自己的音乐时写，build.py beats 会量出来；合成配乐不用写）
script.json 里一句可以写 "silent":true,"dur":秒数 表示无旁白段落（只有画面和配乐）；有 bpm 时可以写 "beats":拍数 或 "bars":小节数 代替 dur
"""
import json, re, sys, os, math, base64, subprocess, threading, http.server, socketserver, hashlib, shutil
from pathlib import Path
import numpy as np, soundfile as sf
KIT = Path(__file__).parent; P = Path.cwd(); FPS = 30; LEAD = 0.9; GAP = 0.55; COVER = 2.0
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
READ_CPS = BRIEF.get('read_cps', 4.5); READ_PAD = BRIEF.get('read_pad', 1.5)   # 阅读速度：给孩子看用 4.5 字/秒；成年观众可以调到 6
SUPERLATIVE = re.compile(r'最[大小高低强快早好先多新]|第一(?![步层次个件项章节条点种类阶段轮批期天年])|唯一|领先|顶级|顶尖|首[个家创]|独家|全球[首最]|国内[首最]|100%|百分之百|绝对|完美')
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

def char_times(line, W):
    """这一句显示文本每个字的发音时间；回听结果过期（稿子改了）就不用。"""
    w = W.get(line['id']); spoken = line.get('tts') or line['vo']
    if not w or w.get('text') != spoken: return None
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
def music(total, name='music.wav', tl=None):
    """brief.json 的 music：缺省是合成的铺底；'guqin' 是五声拨弦（每章换调）；写成文件路径就用那条音乐（要进素材台账）。"""
    kind = BRIEF.get('music', 'pad')
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
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', '_pre.wav', '-af', af, out], check=True); Path('_pre.wav').unlink()
    r = loudness(out); print(f"响度 {r['input_i']} LUFS，真峰值 {r['input_tp']} dBTP（目标 {LUFS} / -1.5）")

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
    if cb:
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
    def text(c):
        s = ''
        for tk, _, _ in c:
            w = tk.replace('@@', '')
            if s and re.match(r'[A-Za-z0-9]', w) and re.search(r'[A-Za-z0-9]$', s) and not prev.endswith('@@'): s += ' '
            s += w; prev = tk
        return s
    S = []
    for k, c in enumerate(out):
        a = c[0][1]; b = c[-1][1]; nxt = out[k + 1][0][1] if k + 1 < len(out) else len(x) / SRA; prv = S[-1]['end'] if S else 0
        i = int(a / .02)
        while i > 0 and not quiet[i - 1] and a - (i - 1) * .02 < .3 and (i - 1) * .02 > prv: i -= 1   # 句首往前找到声音真正起来的地方
        st = max(prv, min(a, i * .02)); j = int((b + .1) / .02)
        while j < nf and not quiet[j] and (j + 1) * .02 < min(nxt, b + .8): j += 1   # 句尾往后找到声音落下去的地方
        S.append({'n': k + 1, 'start': round(st, 2), 'end': round(max(b + .2, min(j * .02, nxt - .02)), 2), 'text': text(c)})
    f = P / 'footage' / (src.stem + '.transcript.json'); f.parent.mkdir(exist_ok=True)
    json.dump({'source': str(src.relative_to(P)) if src.is_relative_to(P) else str(src), 'sha256': sha(src), 'model': ASR_MODEL.name, 'duration': m['duration'], 'sentences': S}, open(f, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    for x_ in S: print(f"s{x_['n']:<3} {tc(x_['start'])}–{tc(x_['end'])}  {x_['text']}")
    print(f'{len(S)} 句 → footage/{f.name}。assets.json 里写 "in":"@s3","out":"@s5" 就是第 3 句开头到第 5 句结尾（各留 {SENT_PAD} 秒余量）。识别会有错字，选点前对照联系表和原声核一下。')

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
        d = '；'.join(f"{x['稿子'] or '∅'}→{x['听到'] or '∅'}" for x in w['diffs'])
        if not (w['ok'] or l.get('asr_ok')): fails.append(f"{l['id']} 回听不符（{w['score']}）：{d}")
        elif d and not l.get('asr_ok'): warns.append(f"{l['id']} 有个别字识别不同，请人听一下：{d}")
    return fails, warns

def need_seconds(s, pad=1.5):
    c = len(CJK.findall(s)); o = len(re.sub(r'\s', '', s)) - c; return max(1.5, c / READ_CPS + o / 15 + READ_PAD)

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
    for fr in sc['frames'][5:-30] + [{'t': sc['total'], 'df': 9}]:
        if fr['df'] < DEAD_DF: quiet = fr['t'] if quiet is None else quiet
        else:
            if quiet is not None and fr['t'] - quiet >= 4: warns['dead'].append(f"{quiet:6.1f}s 起 {fr['t'] - quiet:.1f}s 画面几乎不动：给这一段加一个和旁白对应的动作")
            quiet = None
    first = min([t for t in seen.values()] + [e['t'] for e in sc['events']] + [99])
    if first > 2.0: warns['hook'].append(f"开场 {first:.1f}s 才出现第一个内容：前 1 秒就该有东西落地")
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
    pg.goto(f'http://127.0.0.1:{srv.server_address[1]}/kit/film.html?packs=' + ','.join(BRIEF.get('packs', [])) + f'&w={CW}&h={CH}&safe=' + ','.join(map(str, SAFE))); 
    try: total = pg.evaluate('([tl,a])=>window.init(tl,a)', [tl, assets()])
    except Exception as e: print('页面没能启动：', '；'.join(errs[:5]) or str(e).split('\n')[0]); b.close(); sys.exit(1)
    return b, pg, total, errs
def pipe(out, crf=18):
    return subprocess.Popen(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', str(FPS), '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-crf', str(crf), '-preset', 'medium', '-pix_fmt', 'yuv420p', str(out)], stdin=subprocess.PIPE)
def page_pass(tl, name, expr, cache=True):
    """在页面里跑一遍整片的量测（expr），结果存成 <name>；场景、时间轴、素材、引擎都没动过就直接用上次的。"""
    f = P / name
    if cache and f.exists() and f.stat().st_mtime > max((P / x).stat().st_mtime for x in ('scenes.js', 'timeline.json', 'assets.json', 'clips/meta.json') if (P / x).exists()) and f.stat().st_mtime > max((KIT / x).stat().st_mtime for x in ['kit.js', 'components.js'] + [f'packs/{k}.js' for k in BRIEF.get('packs', [])] + [str(x.relative_to(KIT)) for k in BRIEF.get('packs', []) for x in (KIT / 'packs' / k).glob('*.js')]): return json.load(open(f))
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        b, pg, total, errs = browser(p, tl); sc = pg.evaluate(expr); b.close()
        if errs: print('页面报错', errs[:5]); sys.exit(1)
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
STILL_MV = 0.0005; JUMP_MV = 0.03; JUMP_X = 6; SLOW_MS = 250   # 相邻两帧变了的像素不到万分之五算“没动”；超过 3% 且是这一句平常的 6 倍算“跳变”；一帧画超过 250 毫秒算慢
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
        for k, (f, w) in rep.items(): show(k, f, w)
        nf = sum(len(f) for f, _ in rep.values()); nw = sum(len(w) for _, w in rep.values())
        json.dump({'fails': nf, 'warns': nw, 'detail': {k: {'fails': f, 'warns': w} for k, (f, w) in rep.items()}}, open(P / 'check_report.json', 'w'), ensure_ascii=False, indent=1)
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
        music(total, tl=tl); mixdown('vo.wav', 'music.wav', 'mix.wav', 'sfx.wav', mu_db=-21 + 15 * sum(s['dur'] for s in tl if silent(s)) / max(1, sum(s['dur'] for s in tl)), orig=orig); sys.exit()
    if cmd == 'final':
        name = sys.argv[2]; r = P / 'check_report.json'
        ok = r.exists() and json.load(open(r))['fails'] == 0 and r.stat().st_mtime >= (P / 'scenes.js').stat().st_mtime
        if not ok and '--force' not in sys.argv: print('check 没通过或已过期：先运行 check；确实要出片就加 --force'); sys.exit(1)
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-loop', '1', '-framerate', '30', '-t', str(COVER), '-i', COVER_NAME, '-f', 'lavfi', '-t', str(COVER), '-i', 'anullsrc=r=44100:cl=stereo', '-i', 'silent.mp4', '-i', 'mix.wav', '-filter_complex', f"[0:v]scale={CW}:{CH},format=yuv420p,fade=t=out:st=1.6:d=0.4,setsar=1[c];[2:v]fps=30,format=yuv420p,setsar=1[m];[3:a]aresample=44100[ma];[c][1:a][m][ma]concat=n=2:v=1:a=1[v][a]", '-map', '[v]', '-map', '[a]', '-c:v', 'libx264', '-crf', '24', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', name + '.mp4'], check=True)
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
            print('done', n, flush=True)
        elif cmd == 'cover':
            for v, name in ([('wide', '封面_横版.png'), ('tall', '封面_竖版.png')] if not VERT else [('vert', '封面_9x16.png'), ('tall', '封面_3x4.png')]):
                (P / name).write_bytes(base64.b64decode(pg.evaluate('v=>window.coverFrame(v)', v).split(',')[1]))
        elif cmd == 'short' and VERT: print('这条片本身就是竖版，不需要 short；横版片才用 short 另出竖版'); sys.exit(1)
        elif cmd == 'short':
            segs, stot = short_plan(tl); print('短片时长', round(stot, 2)); vf = lambda t: base64.b64decode(pg.evaluate('([t,s,p])=>window.vertFrameA(t,s,p)', [*short_at(segs, t), t / stot]).split(',')[1])
            if sys.argv[2] == 'stills':
                for k, s in enumerate(segs): (P / f'short_still_{k}.jpg').write_bytes(vf(s['t0'] + (s['t1'] - s['t0']) * .8))
            else:
                ff = pipe(P / 'short_silent.mp4', 20)
                for i in range(round(stot * FPS)): ff.stdin.write(vf(i / FPS))
                ff.stdin.close(); ff.wait(); music(stot, 'short_music.wav'); mixdown('short_vo.wav', 'short_music.wav', 'short_mix.wav')
                subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', 'short_silent.mp4', '-i', 'short_mix.wav', '-loop', '1', '-framerate', '30', '-t', '2.5', '-i', '封面_竖版.png', '-f', 'lavfi', '-t', '2.5', '-i', 'anullsrc=r=44100:cl=stereo', '-filter_complex', "[0:v]fps=30,format=yuv420p,setsar=1[m];[1:a]aresample=44100[ma];[2:v]scale=1080:1440,pad=1080:1920:0:240:color=0x061230,format=yuv420p,fade=t=in:st=0:d=0.3,setsar=1[e];[m][ma][e][3:a]concat=n=2:v=1:a=1[v][a]", '-map', '[v]', '-map', '[a]', '-c:v', 'libx264', '-crf', '22', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', sys.argv[3] + '.mp4'], check=True)
                srt([c for s in segs for c in s['chunks']], P / (sys.argv[3] + '.srt')); print('已出', sys.argv[3] + '.mp4')
        if errs: print('页面报错', errs[:5]); sys.exit(1)
        b.close()
