"""时间轴：配音时长、逐字时间、字幕分块、节拍网格、字幕文件；竖版短片的时间轴。"""

import json
import re
import sys
import math
from pathlib import Path
import numpy as np
import soundfile as sf
from .base import BRIEF, END, GAP, LEAD, P, SPLIT, VERT, sha, silent
from .sound import SR


# ---------- 时间轴 ----------
def chunks_for(text, t, lead, voiced, dur, gap, maxlen=None, minlen=7, ct=None):
    maxlen = maxlen or (14 if VERT else 24)  # 竖版字幕一行最多 14 个字
    parts = [p for p in re.split(SPLIT, text) if p]
    ch = []
    for p in parts:
        if ch and not ch[-1].endswith(END) and (len(ch[-1]) < minlen or len(p) < 5) and len(ch[-1]) + len(p) <= maxlen:
            ch[-1] += p
        else:
            ch.append(p)
    out = []
    pos = 0
    tot = sum(len(c) for c in ch)
    c0 = t + lead
    for c in ch:
        if ct:
            start = t + max(0, ct[pos] - 0.08)
        else:
            start = c0
            c0 += (voiced - lead) * len(c) / tot
        out.append({'text': c.rstrip('，。：；、？！'), 't0': round(start, 3)})
        pos += len(c)
    for a, b in zip(out, out[1:]):
        a['t1'] = b['t0']
    out[-1]['t1'] = round(t + dur + gap, 3)
    return out


def measure(path):
    x, sr = sf.read(path)
    x = x if x.ndim == 1 else x.mean(1)
    nz = np.where(np.abs(x) > 0.01)[0]
    return x, sr, len(x) / sr, (nz[0] / sr if len(nz) else 0), (nz[-1] / sr + 0.12 if len(nz) else len(x) / sr)


def words():
    f = P / 'audio' / 'words.json'
    return json.load(open(f)) if f.exists() else {}


def wav_sha(i):
    f = P / 'audio' / f'{i}.wav'
    return sha(f) if f.is_file() else None


def char_times(line, W):
    """这一句显示文本每个字的发音时间；回听结果过期（稿子改了）就不用。"""
    w = W.get(line['id'])
    spoken = line.get('tts') or line['vo']
    if not w or w.get('text') != spoken or w.get('wav') != wav_sha(line['id']):
        return None  # 音频换过：逐字时间是旧音频的，不能用
    ct = w['ct']
    n = len(line['vo'])
    return ct if spoken == line['vo'] else [ct[round(i * (len(ct) - 1) / max(1, n - 1))] for i in range(n)]


def beat_grid():
    """节拍网格：brief.json 写了 bpm 才有。t0 是正片第一句开始的那一拍（一个小节的第一拍）。"""
    bpm = float(BRIEF.get('bpm') or 0)
    if bpm <= 0:
        return None
    if not 30 <= bpm <= 300:
        print(f'✗ brief.json 的 bpm={bpm:g} 不像一个速度（常见 60–180）')
        sys.exit(1)
    spb = 60 / bpm
    meter = int(BRIEF.get('meter', 4))
    o = BRIEF.get('beat_offset')
    bar = spb * meter
    t0 = (
        LEAD if o is None else float(o) + math.ceil((0.3 - float(o)) / bar - 1e-6) * bar
    )  # 自己的音乐：从片头 0.3 秒之后的第一条小节线开始
    return {'bpm': bpm, 'spb': round(spb, 6), 'meter': meter, 't0': round(t0, 4)}


def timeline():
    S = json.load(open(P / 'script.json'))
    W = words()
    BG = beat_grid()
    t = BG['t0'] if BG else LEAD
    out = []
    mix = []
    snap = (
        (lambda x: BG['t0'] + math.ceil((x - BG['t0']) / BG['spb'] - 1e-4) * BG['spb']) if BG else (lambda x: x)
    )  # 有节拍网格时，每一句的结束（下一句的开始）往后靠到最近的拍点上
    sr = SR
    for s in S:
        if silent(
            s
        ):  # 无旁白段落：{"id","ch","silent":true,"dur":秒数}，只有画面和配乐；有 bpm 时可写 "beats":拍数 或 "bars":小节数
            s = {**s, 'vo': s.get('vo', '')}
            if BG and ('beats' in s or 'bars' in s):
                d = round((float(s['beats']) if 'beats' in s else float(s['bars']) * BG['meter']) * BG['spb'], 4)
            elif 'beats' in s or 'bars' in s:
                print(f"✗ {s['id']} 写了 beats/bars，但 brief.json 没写 bpm")
                sys.exit(1)
            else:
                d = round(snap(t + float(s['dur'])) - t, 4) if BG else float(s['dur'])
            out.append({**s, 't0': round(t, 3), 'dur': d, 'lead': 0, 'voiced': d, 't1': round(t + d, 3), 'chunks': []})
            t += d
            continue
        x, sr, dur, lead, voiced = measure(P / 'audio' / f"{s['id']}.wav")
        ct = char_times(s, W)
        gap = GAP + s.get('hold', 0)  # hold：这句说完后多留几秒给观众看画面
        if BG:
            gap = snap(t + dur + gap) - t - dur
        row = {
            **s,
            't0': round(t, 3),
            'dur': round(dur, 3),
            'lead': round(lead, 3),
            'voiced': round(voiced, 3),
            't1': round(t + dur + gap, 3),
            'chunks': chunks_for(s['vo'], t, lead, voiced, dur, GAP, ct=ct),
        }
        if ct:
            row['ct'] = ct
        out.append(row)
        mix.append((t, x))
        t += dur + gap
    if BG and out:
        out[0]['_grid'] = BG  # 页面从第一句上读网格
    total = out[-1]['t1'] + 3
    buf = np.zeros(int(total * sr) + sr)
    for t0, x in mix:
        buf[int(t0 * sr) : int(t0 * sr) + len(x)] += x
    sf.write(P / 'vo.wav', buf[: int(total * sr)], sr)
    js = json.dumps(out, ensure_ascii=False, indent=1)
    f = P / 'timeline.json'
    if not f.exists() or f.read_text(encoding='utf-8') != js:
        f.write_text(js, encoding='utf-8')  # 没变就不重写，免得整片扫描的缓存每次都作废
    return out, total


def srt(chunks, path, offset=0.0):
    f = lambda s: '%02d:%02d:%02d,%03d' % (s // 3600, s % 3600 // 60, s % 60, round(s % 1 * 1000) % 1000)
    Path(path).write_text(
        ''.join(
            f"{i}\n{f(c['t0'] + offset)} --> {f(c['t1'] + offset)}\n{c['text']}\n\n" for i, c in enumerate(chunks, 1)
        ),
        encoding='utf-8',
    )


# ---------- 竖版 ----------
def short_plan(tl):
    B = {s['id']: s for s in tl}
    pos = lambda r: B[r[0]]['t0'] + B[r[0]]['dur'] * r[1]
    SL = 0.35
    SG = 0.3
    W = words()
    t = SL
    segs = []
    mix = []
    for l in json.load(open(P / 'short.json')):
        x, sr, dur, lead, voiced = measure(P / 'audio' / f"{l['id']}.wav")
        segs.append(
            {
                't0': t,
                't1': t + dur + SG,
                'src': (pos(l['src'][0]), pos(l['src'][1])),
                'chunks': chunks_for(l['vo'], t, lead, voiced, dur, SG, maxlen=14, minlen=0, ct=char_times(l, W)),
            }
        )
        mix.append((t, x))
        t += dur + SG
    total = t + 0.2
    buf = np.zeros(int(total * sr) + sr)
    for t0, x in mix:
        buf[int(t0 * sr) : int(t0 * sr) + len(x)] += x
    sf.write(P / 'short_vo.wav', buf[: int(total * sr)], sr)
    return segs, total


def short_at(segs, t):
    for s in segs:
        if s['t0'] <= t < s['t1']:
            k = (t - s['t0']) / (s['t1'] - s['t0'])
            return s['src'][0] + (s['src'][1] - s['src'][0]) * k, next(
                (c['text'] for c in s['chunks'] if c['t0'] <= t < c['t1']), ''
            )
    return (segs[0]['src'][0] if t < segs[0]['t0'] else segs[-1]['src'][1]), ''
