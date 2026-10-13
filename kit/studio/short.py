"""竖版短片（横版片另出的 short）的检查：稿子、字幕、声明、小字、停留、画面窗口、断言、回听。"""

import json
import re
from .base import BRIEF, NUMISH, P, SUPERLATIVE, jload, need_seconds
from .voice import short_at
from .checks import asr_check

# ---------- 竖版短片的检查（横版片另出的 short）：画面是横版缩进竖框，字只剩 0.56 倍，要单独查 ----------
SHORT_K = 1080 / 1920
SHORT_Y = 560
SHORT_MIN = 24
SHORT_SUB = 39  # 缩放比例、画面在竖框里的上沿、缩小后至少几像素、字幕一屏最多几个字（三行×13，kit.js vertFrame）


def short_lint(tl):
    """short.json 本身对不对：句子 id、src 窗口、配音在不在。不开浏览器，short 的每个子命令都先过它（以前 src 写错句子 id 会直接崩）。"""
    f = P / 'short.json'
    if not f.exists():
        return ['没有 short.json：竖版短片要另写 6–9 句旁白，见 流程.md 第 5 步'], []
    try:
        S = json.load(open(f, encoding='utf-8'))
    except Exception as e:
        return [f'short.json 读不了：{e}'], []
    if not isinstance(S, list) or not S:
        return ['short.json 要写成一个非空的列表'], []
    ids = {s['id']: s for s in tl}
    fails = []
    warns = []
    seen = set()
    for k, l in enumerate(S):
        tag = str(l.get('id') or f'第{k + 1}句')
        if not l.get('id'):
            fails.append(f'{tag} 没有 id')
            continue
        if l['id'] in seen:
            fails.append(f'{tag} 的 id 重复')
        if l['id'] in ids:
            fails.append(
                f'{tag} 和正片的句子同名：两边的配音都叫 audio/{tag}.wav，会互相覆盖。换个 id（习惯用 v0、v1…）'
            )
        seen.add(l['id'])
        if not (l.get('tts') or l.get('vo') or '').strip():
            fails.append(f'{tag} 没有 vo')
        src = l.get('src')
        if not (isinstance(src, list) and len(src) == 2 and all(isinstance(r, list) and len(r) == 2 for r in src)):
            fails.append(f'{tag} 的 src 要写成 [[句id,比例],[句id,比例]]')
            continue
        bad = [str(r[0]) for r in src if r[0] not in ids]
        if bad:
            fails.append(f"{tag} 的 src 指向正片里不存在的句子 {'、'.join(bad)}（正片改过句子 id？）")
            continue
        if not all(isinstance(r[1], (int, float)) and 0 <= r[1] <= 1 for r in src):
            fails.append(f'{tag} 的 src 比例要在 0 到 1 之间')
            continue
        a, b = (ids[r[0]]['t0'] + ids[r[0]]['dur'] * r[1] for r in src)
        if b - a < 0.2:
            fails.append(f'{tag} 的 src 窗口是倒的或几乎为零（{a:.2f}s → {b:.2f}s）')
        if not (P / 'audio' / f"{l['id']}.wav").is_file():
            fails.append(f"{tag} 还没有配音 audio/{l['id']}.wav")
    if not 5 <= len(S) <= 10:
        warns.append(f'竖版短片 {len(S)} 句：一条完整的线通常 6–9 句')
    return fails, warns


def short_check(tl, sc, segs, stot):
    """竖版短片成片里看得见的东西：字幕放不放得下、正片画面缩小后的字还读不读得清、停得够不够、必须出现的声明有没有、画面窗口快进或定格得厉害不厉害、旁白里的数字有没有出处。
    sc 是正片的整片扫描：竖版画面就是正片画面按 SHORT_K 缩进竖框，所以不用再开浏览器，按每个时刻对应的正片时刻取文字框换算。"""
    S = json.load(open(P / 'short.json', encoding='utf-8'))
    rep = {}
    fr = sc['frames']
    step = fr[1]['t'] - fr[0]['t']
    at = lambda t: fr[min(len(fr) - 1, max(0, round(t / step)))]
    key = lambda s: re.sub(r'[\d.,]+', '#', s)
    sub = []
    speed = []
    for l, s in zip(S, segs):
        for c in s['chunks']:
            if len(c['text']) > SHORT_SUB:
                sub.append(
                    f"{l['id']} 的字幕「{c['text'][:12]}…」{len(c['text'])} 字：竖版一屏最多 {SHORT_SUB} 字（三行），多出来的不显示。在 vo 里多加标点断开"
                )
        k = (s['src'][1] - s['src'][0]) / max(0.01, s['t1'] - s['t0'])
        if k > 1.8:
            speed.append(f"{l['id']}（{s['t0']:.1f}s）配的正片画面按 {k:.1f} 倍快进：动作会显得慌，窗口缩短或换一段")
        elif k < 0.3:
            speed.append(
                f"{l['id']}（{s['t0']:.1f}s）配的正片画面只走了 {k:.2f} 倍速，接近定格：窗口放长或换一段会动的"
            )
    rep['竖版字幕'] = (sub, [])
    if not 30 <= stot <= 90:
        rep['竖版时长'] = ([], [f'竖版短片 {stot:.1f} 秒：平台上的摘要通常 40–70 秒'])
    rep['竖版画面窗口'] = ([], speed)
    # 逐 step 走一遍竖版时间轴，把正片那一刻的文字框换算到竖框里
    small = {}
    runs = {}
    need = BRIEF.get('must_show', [])
    shown = {m: 0 for m in need}
    t = 0.0
    seg_of = lambda t: next((i for i, s in enumerate(segs) if s['t0'] <= t < s['t1']), len(segs) - 1)
    while t < stot:
        src, _ = short_at(segs, t)
        i = seg_of(t)
        vis = set()
        for r in at(src)['tx']:
            s_, a = r[0], r[5]
            if a < 0.8 or not s_.strip():
                continue
            px = (r[6] if len(r) > 6 else (r[4] - r[2]) / 1.02) * SHORT_K
            if not (r[1] >= -2 and r[3] <= sc['W'] + 2):
                continue  # 正片里就在画外的不算
            k = key(s_)
            vis.add(k)
            if px < SHORT_MIN:
                small.setdefault(i, {}).setdefault(k, px)
            for m in need:
                if m in s_ and px >= 16:
                    shown[m] += step
        for k in vis:
            rr = runs.setdefault(k, [])
            if rr and abs(rr[-1][1] - (t - step)) < step / 2:
                rr[-1][1] = t
            else:
                rr.append([t, t])
        t = round(t + step, 6)
    rep['竖版必须出现的声明'] = (
        [
            f'竖版短片里没有清楚出现「{m}」（{shown[m]:.1f}s，要 ≥2 秒）：它是单独发布的，声明也要有。让 src 窗口覆盖到出现声明的那一段，或在正片那一段把声明放大'
            for m in need
            if shown[m] < 2
        ],
        [],
    )
    rep['竖版小字'] = (
        [],
        [
            f"{S[i]['id']}（{segs[i]['t0']:.1f}s）缩进竖框后只有 {min(v.values()):.0f} 像素的字 {len(v)} 处，如「{min(v, key=v.get)[:12]}」：手机上读不清，这一句的意思要靠旁白和字幕讲到"
            for i, v in sorted(small.items())
        ],
    )
    short_read = []
    for k, rs in runs.items():
        n = need_seconds(k)
        for a, b in rs:
            if b - a + step < n - 1e-6 and b < stot - step:
                short_read.append(f"{a:6.1f}s 「{k[:16]}」在竖版里只停 {b - a + step:.1f}s，读完要 {n:.1f}s")
    rep['竖版阅读时长'] = (
        [],
        short_read[:12] + ([f'……另有 {len(short_read) - 12} 处'] if len(short_read) > 12 else []),
    )
    F = jload('facts.json', []) or []
    fw = []
    for l in S:
        if NUMISH.search(l['vo']) and not any(l['id'] in x.get('where', []) for x in F):
            fw.append(
                f"{l['id']} 里有数字或量词，但断言台账里没有一条指向它（where 里加上 {l['id']}）：{l['vo'][:22]}…"
            )
        if SUPERLATIVE.search(l['vo']) and not any(
            l['id'] in x.get('where', []) and x.get('status') == 'verified' for x in F
        ):
            fw.append(f"{l['id']} 有“{SUPERLATIVE.search(l['vo']).group(0)}”这类说法，但没有已核实的事实支撑")
    rep['竖版断言'] = ([], fw)
    ids = {l['id'] for l in S}
    af, aw = asr_check(tl)
    rep['竖版配音回听'] = (
        [x for x in af if x.split(' ')[0] in ids or x.startswith('还没做')],
        [x for x in aw if x.split(' ')[0] in ids],
    )
    return rep
