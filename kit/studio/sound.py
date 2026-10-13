"""声音：五种合成配乐、音效、素材原声和旁白下的压低、混音和响度、量音乐的速度。"""

import json
import sys
import subprocess
from pathlib import Path
import numpy as np
import soundfile as sf
from .base import BRIEF, CH, LUFS, P, jload, silent

# ---------- 声音：配乐、音效、混音 ----------
SR = 44100


def pluck(f, dur, bright=0.5, seed=0):
    """拨弦（Karplus-Strong）：古琴/筝一类的音色"""
    n = int(SR * dur)
    N = max(2, int(SR / f))
    r = np.random.default_rng(seed)
    buf = r.uniform(-1, 1, N)
    k = np.arange(N)
    buf *= np.hanning(N) ** 0.2
    out = np.empty(n)
    a = 0.5 - 0.12 * bright
    for i in range(0, n, N):
        m = min(N, n - i)
        out[i : i + m] = buf[:m]
        buf = 0.996 * (a * buf + (1 - a) * np.roll(buf, 1))
    return out * np.exp(-np.arange(n) / SR * 1.1)


def music_guqin(total, tl, name):
    """五声音阶的拨弦配乐：每章换一个调和疏密；底下一条很轻的长音。"""
    BG = (tl or [{}])[0].get('_grid')
    out = np.zeros(int(SR * total) + SR * 6)
    r = np.random.default_rng(11)
    penta = [0, 2, 4, 7, 9]
    roots = [146.83, 130.81, 164.81, 110.0, 196.0, 123.47]  # D C E A G B
    chs = []
    [chs.append((s['ch'], s['t0'])) for s in (tl or []) if not chs or chs[-1][0] != s['ch']]
    chs = chs or [('', 0)]
    bounds = [c[1] for c in chs[1:]] + [total]
    for ci, ((ch, a), b) in enumerate(zip(chs, bounds)):
        root = roots[ci % len(roots)]
        gap = [2.6, 1.9, 3.2, 1.5, 2.2][ci % 5]
        t = a + 0.6
        prev = 2
        if BG:
            hb = BG['spb'] / 2
            q = lambda x: BG['t0'] + max(1, round((x - BG['t0']) / hb)) * hb if x > BG['t0'] else BG['t0']
            t = q(a) if a >= BG['t0'] else q(t)  # 有节拍网格：拨弦落在半拍上，每章第一声落在章的第一拍
        tt = np.arange(int((b - a + 3) * SR)) / SR
        drone = (
            (np.sin(2 * np.pi * root / 2 * tt) + 0.4 * np.sin(2 * np.pi * root * 0.75 * tt))
            * np.clip(tt / 3, 0, 1)
            * np.clip((b - a + 3 - tt) / 3, 0, 1)
            * 0.05
        )
        i0 = int(a * SR)
        out[i0 : i0 + len(drone)] += drone[: len(out) - i0]
        while t < b - 1.5:
            step = int(np.clip(prev + r.choice([-2, -1, -1, 1, 1, 2]), 0, 9))
            prev = step
            f = root * 2 ** ((penta[step % 5] + 12 * (step // 5)) / 12)
            x = pluck(f, 5.0, r.uniform(0.2, 0.8), int(t * 100)) * r.uniform(0.5, 1)
            i = int(t * SR)
            out[i : i + len(x)] += x[: len(out) - i]
            if r.random() < 0.28:
                x2 = pluck(f / 2, 5.0, 0.3, int(t * 100) + 1) * 0.6
                out[i : i + len(x2)] += x2[: len(out) - i]
            t += gap * r.choice([0.5, 1, 1, 1.5, 2])
            if BG:
                t = max(q(t), q(i / SR + hb))
    out = out[: int(SR * total)]
    t = np.arange(len(out)) / SR
    out *= np.clip(t / 1.5, 0, 1) * np.clip((total - t) / 3, 0, 1)
    out = np.tanh(out / (np.abs(out).max() + 1e-9) * 3.0) / np.tanh(3.0)
    d = int(0.031 * SR)
    sf.write(P / name, np.stack([out + 0.25 * np.roll(out, d * 7), out + 0.25 * np.roll(out, d * 11)], 1) * 0.7, SR)


def music_keys(total, tl, name):
    """轻的键盘铺底：中音区的电钢琴分解和弦 + 一层很淡的长音。手机和笔记本的小喇叭放得出来（老的 pad 几乎全在 200 Hz 以下，小喇叭上等于没有）。
    四小节一轮（C–Am–F–G 的柔和版本），每换一章换一种弹法；有节拍网格就跟网格走，没有就按每分钟 84 拍。"""
    BG = (tl or [{}])[0].get('_grid')
    spb = BG['spb'] if BG else 60 / 84
    t0 = (BG['t0'] % (spb * 4)) if BG else 0.5
    n = int(SR * total)
    out = np.zeros(n + SR * 4)
    r = np.random.default_rng(7)
    N = lambda m: 440 * 2 ** ((m - 69) / 12)  # MIDI 音高 → 频率
    CH = [[60, 64, 67, 74], [57, 60, 64, 67], [53, 57, 60, 64], [55, 59, 62, 64]]  # Cadd9  Am7  Fmaj7  G6
    PAT = [[0, 2, 1, 3, 2, 1, 3, 2], [0, 1, 2, 3, 2, 3, 1, 2], [0, 2, 3, 2, 1, 2, 3, 1], [0, 3, 2, 1, 3, 2, 1, 2]]

    def ep(f, dur, vel):  # 电钢琴：一个正弦被自己的二倍频轻轻调制，敲一下就衰减
        t = np.arange(int(SR * dur)) / SR
        return (
            vel
            * np.sin(2 * np.pi * f * t + 1.1 * np.exp(-t * 9) * np.sin(2 * np.pi * 2 * f * t))
            * np.exp(-t * 3.2)
            * np.clip(t / 0.004, 0, 1)
        )

    starts = []
    last = None
    for s_ in tl or []:
        if s_['ch'] != last:
            starts.append(s_['t0'])
            last = s_['ch']
    bar = spb * 4
    nb = int((total - t0) / bar) + 1
    for b in range(nb):
        tb = t0 + b * bar
        ch = CH[b % 4]
        ci = max(0, sum(1 for x in starts if x <= tb) - 1)
        pat = PAT[ci % 4]
        dense = ci % 2 == 0
        # 长音：和弦的三个音，慢起慢收，两小节交叠
        tt = np.arange(int(SR * bar * 1.6)) / SR
        env = np.clip(tt / (bar * 0.45), 0, 1) * np.clip((bar * 1.6 - tt) / (bar * 0.6), 0, 1)
        pad = (
            sum(
                np.sin(2 * np.pi * N(m) * (1 + 0.0012 * k) * tt) + 0.18 * np.sin(2 * np.pi * 2 * N(m) * tt)
                for k, m in enumerate(ch[:3])
            )
            * env
            * 0.035
        )
        i = int(tb * SR)
        out[i : i + len(pad)] += pad[: len(out) - i]
        if b == 0:
            continue  # 第一小节只有长音，让开头的旁白先出来
        for k in range(8):
            if not dense and k % 2:
                continue  # 隔一章弹得疏一点
            if dense and k in (3, 7) and r.random() < 0.35:
                continue
            m = ch[pat[k]] + (12 if k in (4, 6) and r.random() < 0.5 else 0)
            x = ep(N(m), 2.4, (0.20 if k == 0 else 0.12) * r.uniform(0.8, 1.1))
            i = int((tb + k * spb / 2 + r.uniform(-0.006, 0.006)) * SR)
            out[i : i + len(x)] += x[: len(out) - i]
        x = ep(N(ch[0] - 12), 3.0, 0.16)
        i = int(tb * SR)
        out[i : i + len(x)] += x[: len(out) - i]  # 每小节一个低八度的根音，托一下
    out = out[:n]
    t = np.arange(n) / SR
    out *= np.clip(t / 1.2, 0, 1) * np.clip((total - t) / 3.5, 0, 1)
    out = out / (np.sqrt((out**2).mean()) + 1e-9) * 10 ** (-20 / 20)
    out = np.tanh(out * 1.5) / 1.5  # 平均音量定在 -20 dB，混音时再按比例压到旁白下面
    d = int(0.017 * SR)
    sf.write(P / name, np.stack([out + 0.22 * np.roll(out, d), out + 0.22 * np.roll(out, d * 2)], 1), SR)


def music_cosmos(total, tl, name):
    """太空感的配乐：一条缓慢起伏的长音（带中音区的泛音，小喇叭听得见）、稀疏的钟声、小节线上的低鼓、换章前的气流声。
    每一章的强弱照 brief.json 的 music_energy（每章一个 0..1 的数）走，不写就是“起—涨—最高—落—静”。第二章开头有一声低沉的爆响。"""
    BG = (tl or [{}])[0].get('_grid')
    spb = BG['spb'] if BG else 60 / 64
    g0 = BG['t0'] if BG else 0.9
    n = int(SR * total)
    t = np.arange(n) / SR
    out = np.zeros(n + SR * 8)
    r = np.random.default_rng(23)
    starts = []
    last = None
    for s_ in tl or []:
        if s_['ch'] != last:
            starts.append(s_['t0'])
            last = s_['ch']
    starts = starts or [0]
    K = len(starts)
    E = BRIEF.get('music_energy') or [
        (0.22 + 0.78 * np.sin(np.pi * min(1, (i + 0.6) / max(1, K - 1.6))) ** 1.3) if i < K - 1 else 0.25
        for i in range(K)
    ]
    E = (list(E) + [E[-1]] * K)[:K]
    en = np.interp(
        t, [0] + [s_ + 1.5 for s_ in starts[1:]] + [total], [E[0]] + E[1:] + [E[-1] * 0.6]
    )  # 每章的强弱，换章后一秒半过渡完
    N = lambda m: 440 * 2 ** ((m - 69) / 12)
    # 长音：D 上的空五度，叠到中音区；几条慢 LFO 让它一直在动
    drone = np.zeros(n)
    for k, (m, a) in enumerate(
        [(38, 0.3), (45, 0.34), (50, 0.5), (57, 0.5), (62, 0.46), (69, 0.34), (74, 0.24), (66, 0.16), (81, 0.1)]
    ):
        drone += (
            a
            * np.sin(2 * np.pi * N(m) * (1 + 0.0009 * k) * t + 0.6 * np.sin(2 * np.pi * (0.05 + 0.013 * k) * t))
            * (0.6 + 0.4 * np.sin(2 * np.pi * (0.031 + 0.011 * k) * t + k))
        )
    out[:n] += drone * (0.07 + 0.93 * en**1.5) * 0.16  # 低的两条压着放：能量主要在 200 Hz 以上，小喇叭才听得见

    def put(x, at_, gain=1.0):
        i = int(at_ * SR)
        if 0 <= i < len(out):
            out[i : i + len(x)] += x[: len(out) - i] * gain

    def bell(f, dur=5.0):
        tt = np.arange(int(SR * dur)) / SR
        return (
            (
                np.sin(2 * np.pi * f * tt)
                + 0.35 * np.sin(2 * np.pi * f * 2.76 * tt) * np.exp(-tt * 3)
                + 0.15 * np.sin(2 * np.pi * f * 5.4 * tt) * np.exp(-tt * 6)
            )
            * np.exp(-tt * 1.1)
            * np.clip(tt / 0.006, 0, 1)
        )

    def boom(dur=3.2, f0=95, f1=34):
        tt = np.arange(int(SR * dur)) / SR
        f = f1 + (f0 - f1) * np.exp(-tt * 5)
        return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 1.5) + 0.25 * np.sin(
            2 * np.pi * np.cumsum(f * 3) / SR
        ) * np.exp(-tt * 4)

    def air(dur):  # 气流声：噪声过两次滑动平均，音量越来越大
        m = int(SR * dur)
        x = r.standard_normal(m + 400)
        x = np.convolve(x, np.ones(24) / 24, 'same')
        x = x - np.convolve(x, np.ones(400) / 400, 'same')
        return x[:m] * (np.arange(m) / m) ** 2.2

    scale = [62, 64, 66, 69, 71, 74, 76, 78, 81]  # D 大调五声
    tb = g0
    b = 0
    while tb < total - 2:
        e = float(np.interp(tb, t[::SR], en[::SR]))
        ci = max(0, sum(1 for x in starts if x <= tb + 0.01) - 1)
        if b % 4 == 0 and e > 0.3:
            put(boom(1.6, 70, 40), tb, 0.22 * e)  # 每小节一声低鼓
        if e > 0.55 and b % 2 == 0:
            put(bell(N(50 + [0, 7, 5, 7][(b // 2) % 4]), 2.5), tb, 0.07 * e)  # 中音区的拨动，托住节奏
        if r.random() < 0.16 + 0.5 * e:
            put(
                bell(N(scale[int(r.integers(0, len(scale)))] + (12 if r.random() < 0.25 else 0)), 6.0),
                tb + (spb / 2 if r.random() < 0.3 else 0),
                (0.07 + 0.13 * e) * r.uniform(0.6, 1),
            )
        tb += spb
        b += 1
    for i, s_ in enumerate(starts[1:], 1):
        d = spb * 2
        put(air(d), s_ - d, 0.05 + 0.12 * E[i])
        put(bell(N(86), 7.0), s_, 0.05)  # 换章：气流涌上来，一声高钟
    if K > 1:
        put(boom(), starts[1], 0.6)
    # 一个四个音的动机：每章开头响一次，一章比一章多一个音；倒数第二章慢下来完整地再响一遍（问题回到它自己）
    motif = [62, 69, 66, 64]
    for i, s_ in enumerate(starts[1:], 1):
        slow = i == K - 2
        nn = 4 if slow or i >= 4 else i
        for j in range(nn):
            put(
                bell(N(motif[j] + (0 if slow else 12)), 7.0),
                s_ + spb * (4 if slow else 2) * (j + (1 if slow else 0.5)),
                (0.2 if slow else 0.1 + 0.08 * E[i]),
            )
    put(bell(N(74), 8.0), starts[-1], 0.16)
    out = out[:n]
    out *= np.clip(t / 2.0, 0, 1) * np.clip((total - t) / 4.0, 0, 1)
    wet = out.copy()
    for dly, gdb in ((0.137, 0.32), (0.251, 0.26), (0.389, 0.2), (0.613, 0.15), (0.977, 0.1)):
        k = int(dly * SR)
        wet[k:] += out[:-k] * gdb  # 几道延迟当混响
    out = wet / (np.sqrt((wet**2).mean()) + 1e-9) * 10 ** (-20 / 20)
    out = np.tanh(out * 1.3) / 1.3
    d = int(0.019 * SR)
    sf.write(P / name, np.stack([out + 0.3 * np.roll(out, d), out + 0.3 * np.roll(out, d * 3)], 1), SR)


BAND = {  # 宣传线的四种合成配乐：有鼓、有低音、有和弦，按每章的强弱起落。都是合成的，够定节奏和气质，替不了真音乐
    'drive': dict(
        bpm=122,
        prog=[[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]],
        kick='four',
        hat='off',
        clap='clap',
        bass='eighth',
        lead='stab',
    ),  # 利落的电子：四拍底鼓、八分低音、反拍和弦
    'pulse': dict(
        bpm=104,
        prog=[[50, 57, 60, 64], [46, 53, 57, 62], [53, 57, 60, 65], [48, 55, 60, 64]],
        kick='one3',
        hat='six',
        clap='',
        bass='sub',
        lead='arp',
    ),  # 冷静的科技感：十六分琶音、长低音，鼓很少
    'warm': dict(
        bpm=92,
        prog=[[60, 64, 67, 71], [57, 60, 64, 67], [53, 57, 60, 64], [55, 59, 62, 64]],
        kick='one3',
        hat='shaker',
        clap='rim',
        bass='half',
        lead='ep',
    ),  # 温和的原声感：电钢琴和弦、沙锤、边击
    'bright': dict(
        bpm=116,
        prog=[[60, 64, 67], [55, 59, 62], [57, 60, 64], [53, 57, 60]],
        kick='bounce',
        hat='off',
        clap='clap',
        bass='bounce',
        lead='mallet',
    ),  # 轻快：木琴拨动、拍手、跳着走的低音
}
BEAT_E = {'钩子': 0.6, '铺垫': 0.45, '推进': 0.75, '转折': 0.3, '揭示': 0.9, '高潮': 1.0, '回扣': 0.6, '收束': 0.5}


def music_band(total, tl, name, style):
    """有鼓有低音的配乐。强弱一章一个数（brief.music_energy，不写就按每章第一句的 beat 定）：弱的章只留和弦（蓄力），变强之前的一小节有一道上扬的气流，强的章开头砸一下。"""
    S = BAND[style]
    BG = (tl or [{}])[0].get('_grid')
    spb = BG['spb'] if BG else 60 / S['bpm']
    g0 = BG['t0'] if BG else 0.5
    bar = spb * 4
    n = int(SR * total)
    out = np.zeros(n + SR * 6)
    r = np.random.default_rng(11)
    N = lambda m: 440 * 2 ** ((m - 69) / 12)
    T = lambda d: np.arange(int(SR * d)) / SR
    starts = []
    first = []
    last = None
    for s_ in tl or []:
        if s_['ch'] != last:
            starts.append(s_['t0'])
            first.append(s_.get('beat'))
            last = s_['ch']
    starts = starts or [0]
    first = first or [None]
    E = BRIEF.get('music_energy') or [BEAT_E.get(b, 0.6) for b in first]
    E = (list(E) + [E[-1]] * len(starts))[: len(starts)]

    def put(x, at_, gain=1.0):
        i = int(at_ * SR)
        if 0 <= i < len(out):
            out[i : i + len(x)] += x[: len(out) - i] * gain

    def noise(d, lo, hi):  # 一段只留 lo–hi 赫兹的噪声
        m = int(SR * d)
        F = np.fft.rfft(r.standard_normal(m))
        k = np.fft.rfftfreq(m, 1 / SR)
        F *= (k > lo) * (k < hi)
        x = np.fft.irfft(F, m)
        return x / (np.abs(x).max() + 1e-9)

    t_ = T(0.34)
    KICK = np.sin(2 * np.pi * np.cumsum(46 + 120 * np.exp(-t_ * 36)) / SR) * np.exp(-t_ * 9) * np.clip(t_ / 0.002, 0, 1)
    HAT = noise(0.06, 6500, 14000) * np.exp(-T(0.06) * 85)
    SHK = noise(0.1, 4000, 10000) * np.sin(np.pi * T(0.1) / 0.1) ** 2
    tc_ = T(0.2)
    CLAP = noise(0.2, 900, 4200) * (
        np.exp(-tc_ * 22) + 0.7 * np.exp(-np.abs(tc_ - 0.012) * 300) + 0.7 * np.exp(-np.abs(tc_ - 0.024) * 300)
    )
    RIM = (np.sin(2 * np.pi * 1750 * T(0.05)) + 0.5 * noise(0.05, 2000, 6000)) * np.exp(-T(0.05) * 110)

    def bass(f, d):
        t = T(d)
        return (
            sum(np.sin(2 * np.pi * k * f * t) / k * np.exp(-t * k * 2.2) for k in range(1, 6))
            * np.clip(t / 0.006, 0, 1)
            * np.clip((d - t) / 0.03, 0, 1)
        )

    def ep(f, d, bright=1.1):
        t = T(d)
        return (
            np.sin(2 * np.pi * f * t + bright * np.exp(-t * 9) * np.sin(2 * np.pi * 2 * f * t))
            * np.exp(-t * 3.2)
            * np.clip(t / 0.004, 0, 1)
        )

    def mallet(f, d=0.9):
        t = T(d)
        return (
            np.sin(2 * np.pi * f * t) * np.exp(-t * 7) + 0.35 * np.sin(2 * np.pi * 4 * f * t) * np.exp(-t * 22)
        ) * np.clip(t / 0.002, 0, 1)

    def padc(ms, d):
        t = T(d)
        env = np.clip(t / (d * 0.3), 0, 1) * np.clip((d - t) / (d * 0.35), 0, 1)
        return (
            sum(
                np.sin(2 * np.pi * N(m) * (1 + 0.0015 * k) * t) + 0.2 * np.sin(2 * np.pi * 2 * N(m) * t)
                for k, m in enumerate(ms)
            )
            * env
        )

    def riser(d):
        m = int(SR * d)
        x = noise(d, 1500, 9000) * (np.arange(m) / m) ** 2.4
        return x + 0.25 * np.sin(2 * np.pi * np.cumsum(np.linspace(240, 1300, m)) / SR) * (np.arange(m) / m) ** 2

    IMPACT = np.concatenate([KICK * 1.2, np.zeros(int(SR * 0.9))])[: int(SR * 1.2)]
    IMPACT = IMPACT + 0.5 * noise(1.2, 300, 6000) * np.exp(-T(1.2) * 5)
    eat = lambda tt: E[max(0, sum(1 for x in starts if x <= tt + 0.01) - 1)]
    nb = int((total - 3 - g0) / bar) + 1
    for b in range(nb):
        tb = g0 + b * bar
        e = eat(tb)
        en = eat(tb + bar)
        ch = S['prog'][b % 4]
        root = N(ch[0] - 24)
        put(padc([m + 12 for m in ch], bar * 1.25), tb, 0.04 + 0.04 * e)  # 和弦长音一直在
        if en - e >= 0.2:
            put(riser(bar), tb, 0.16)  # 变强之前：一小节上扬的气流
        if e - eat(tb - bar) >= 0.2 and b:
            put(IMPACT, tb, 0.5)  # 变强的那一下
        for k in range(16):  # 一小节十六个十六分
            tk = tb + k * spb / 4
            q, on8, on4 = k % 4, k % 2 == 0, k % 4 == 0
            if e >= 0.5 and (
                (S['kick'] == 'four' and on4)
                or (S['kick'] == 'one3' and k in (0, 8))
                or (S['kick'] == 'bounce' and k in (0, 6, 8))
            ):
                put(KICK, tk, 0.3 if S['kick'] != 'one3' else 0.22)
            if e >= 0.4:
                if S['hat'] == 'off' and k % 4 == 2:
                    put(HAT, tk, 0.22)
                if S['hat'] == 'off' and e >= 0.9 and k % 2 == 1:
                    put(HAT, tk, 0.07)
                if S['hat'] == 'six' and (on8 or e >= 0.8):
                    put(HAT, tk, 0.05 + 0.05 * (k % 4 == 2))
                if S['hat'] == 'shaker' and on8:
                    put(SHK, tk, 0.05 + 0.04 * (k % 4 == 2))
            if e >= 0.65 and k in (4, 12):
                if S['clap'] == 'clap':
                    put(CLAP, tk, 0.3)
                if S['clap'] == 'rim':
                    put(RIM, tk, 0.16)
            if e >= 0.45:
                if S['bass'] == 'eighth' and on8:
                    put(bass(root * (4 if k in (6, 14) else 2), spb * 0.45), tk, 0.13)
                if S['bass'] == 'sub' and k == 0:
                    put(bass(root * 2, bar * 0.95), tk, 0.12)
                if S['bass'] == 'half' and k in (0, 8):
                    put(bass(root * (3 if k == 8 else 2), spb * 1.8), tk, 0.11)
                if S['bass'] == 'bounce' and k in (0, 6, 10):
                    put(bass(root * (4 if k == 10 else 2), spb * 0.6), tk, 0.13)
            if e >= 0.3:
                if S['lead'] == 'stab' and k in (2, 6, 10, 14) and e >= 0.6:
                    put(sum(ep(N(m + 12), 0.35, 2.2) for m in ch), tk, 0.12)
                if S['lead'] == 'arp' and (on8 or e >= 0.7):
                    put(mallet(N(ch[(k * 3) % len(ch)] + (24 if k % 8 >= 4 else 12)), 0.5), tk, 0.05 + 0.03 * e)
                if S['lead'] == 'ep' and k in (0, 6, 10):
                    put(sum(ep(N(m), 2.6) for m in ch), tk, 0.055 if k else 0.08)
                if S['lead'] == 'mallet' and on8 and not (k == 14 and r.random() < 0.5):
                    put(mallet(N(ch[[0, 2, 1, 2, 0, 1, 2, 1][k // 2]] + 12)), tk, 0.2 if on4 else 0.14)
    out = out[:n]
    t = np.arange(n) / SR
    out *= np.clip(t / 0.6, 0, 1) * np.clip((total - t) / 3.0, 0, 1)
    wet = out.copy()
    for dly, gd in ((0.119, 0.16), (0.233, 0.11), (0.371, 0.07)):
        k = int(dly * SR)
        wet[k:] += out[:-k] * gd
    out = wet / (np.sqrt((wet**2).mean()) + 1e-9) * 10 ** (-20 / 20)
    out = np.tanh(out * 1.4) / 1.4
    d = int(0.013 * SR)
    sf.write(P / name, np.stack([out + 0.18 * np.roll(out, d), out + 0.18 * np.roll(out, d * 2)], 1), SR)


def music(total, name='music.wav', tl=None):
    """brief.json 的 music：缺省 'keys' 是合成的键盘铺底（中音区，小喇叭听得见）；'pad' 是低沉的长音；'guqin' 是五声拨弦（每章换调）；写成文件路径就用那条音乐（要进素材台账）。"""
    kind = BRIEF.get('music', 'keys')
    if kind == 'keys':
        return music_keys(total, tl, name)
    if kind == 'cosmos':
        return music_cosmos(total, tl, name)
    if kind in BAND:
        return music_band(total, tl, name, kind)
    if kind == 'guqin':
        return music_guqin(total, tl, name)
    if kind not in ('pad', '') and (P / kind).exists():
        subprocess.run(
            [
                'ffmpeg',
                '-y',
                '-loglevel',
                'error',
                '-stream_loop',
                '-1',
                '-i',
                str(P / kind),
                '-t',
                f'{total:.2f}',
                '-af',
                f'afade=t=in:d=1.5,afade=t=out:st={total - 3:.2f}:d=3',
                '-ar',
                str(SR),
                '-ac',
                '2',
                str(P / name),
            ],
            check=True,
        )
        return
    t = np.arange(int(SR * total)) / SR
    tone = (
        lambda f: np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * 2 * f * t) + 0.1 * np.sin(2 * np.pi * 3 * f * t)
    )
    chords = [
        [73.42, 110, 146.83, 174.61],
        [58.27, 116.54, 146.83, 174.61],
        [65.41, 98, 130.81, 196],
        [55, 110, 138.59, 164.81],
    ]
    out = np.zeros_like(t)
    L = 9.0
    BG0 = (tl or [{}])[0].get('_grid')
    o0 = 0.0
    if BG0:
        bl = BG0['spb'] * BG0['meter']
        L = bl * max(1, round(9.0 / bl))
        o0 = BG0['t0'] % L - L  # 和弦按整小节换
    for i in range(int(total / L) + 2 if BG0 else int(total / L) + 1):
        env = np.clip((t - o0 - i * L) / 3, 0, 1) * np.clip((o0 + i * L + L + 3 - t) / 3, 0, 1)
        for k, f in enumerate(chords[i % 4]):
            out += (
                env
                * tone(f * (1 + 0.0015 * k))
                * (0.5 if k == 0 else 0.2)
                * (1 + 0.15 * np.sin(2 * np.pi * 0.17 * t + k))
            )
    BG = (tl or [{}])[0].get(
        '_grid'
    )  # 有节拍网格：轻点落在每一拍，重音落在每小节第一拍；没有就是原来的每半秒一点、每两秒一重
    for b in (np.arange(BG['t0'], total - 4, BG['spb']) if BG else np.arange(1.0, total - 4, 0.5)):
        i = int(b * SR)
        n = int(0.12 * SR)
        tt = np.arange(n) / SR
        out[i : i + n] += 0.14 * np.sin(2 * np.pi * 146.83 * tt) * np.exp(-tt * 38)
    for b in (np.arange(BG['t0'], total - 4, BG['spb'] * BG['meter']) if BG else np.arange(1.0, total - 4, 2.0)):
        i = int(b * SR)
        n = int(0.4 * SR)
        tt = np.arange(n) / SR
        out[i : i + n] += 0.35 * np.sin(2 * np.pi * (48 + 38 * np.exp(-tt * 28)) * tt) * np.exp(-tt * 11)
    out *= np.clip(t / 1.5, 0, 1) * np.clip((total - t) / 3, 0, 1)
    out = out / np.abs(out).max()
    sf.write(P / name, np.stack([out, np.roll(out, 200)], 1) * 0.9, SR)


def synth(kind):
    """程序合成的小音效，全部是柔和的短音，不抢配音。"""
    rng = np.random.default_rng(7)
    T = lambda d: np.arange(int(d * SR)) / SR
    chirp = lambda f0, f1, d: np.sin(2 * np.pi * np.cumsum(np.linspace(f0, f1, int(d * SR))) / SR)
    if kind == 'pop':
        t = T(0.11)
        x = chirp(480, 820, 0.11) * np.exp(-t * 34)
    elif kind == 'tick':
        t = T(0.03)
        x = np.sin(2 * np.pi * 1700 * t) * np.exp(-t * 150) * 0.6
    elif kind == 'ding':
        t = T(0.9)
        x = sum(
            a * np.sin(2 * np.pi * f * t) * np.exp(-t * d)
            for f, a, d in [(1318, 0.6, 5), (1976, 0.3, 7), (2637, 0.15, 9)]
        )
    elif kind == 'rise':
        t = T(0.5)
        x = chirp(300, 900, 0.5) * np.sin(np.pi * t / 0.5) ** 2 * 0.6
    elif kind == 'thud':
        t = T(0.28)
        x = np.sin(2 * np.pi * (60 + 50 * np.exp(-t * 30)) * t) * np.exp(-t * 16)
    else:  # whoosh
        t = T(0.55)
        n = rng.standard_normal(len(t))
        k = np.fft.rfftfreq(len(t), 1 / SR)
        F = np.fft.rfft(n)
        F *= np.exp(-(((k - 1400) / 900) ** 2))
        x = np.fft.irfft(F, len(t))
        x = x / np.abs(x).max() * np.sin(np.pi * t / 0.55) ** 2 * 0.7
    return x.astype('float32')


GAIN = {'pop': 0.5, 'tick': 0.35, 'ding': 0.45, 'rise': 0.4, 'thud': 0.6, 'whoosh': 0.5}


def sfx_track(events, total, name='sfx.wav', clips=()):
    buf = np.zeros(int(total * SR) + SR, dtype='float32')
    last = {}
    n = 0
    meta = jload('clips/meta.json', {}) or {}
    for e in clips:  # 素材原声：按 clip(..., {sound}) 给的音量叠进去
        cid, frm = e['type'][5:].split('|')
        m = meta.get(cid, {})
        if e['gain'] <= 0 or not m.get('audio'):
            continue
        x, sr = sf.read(P / m['audio'], dtype='float32')
        x = x[int(float(frm) * sr) :] * e['gain'] * 2.2
        i = int(e['t'] * SR)
        x = x[: max(0, len(buf) - i)]
        buf[i : i + len(x)] += x
    for e in sorted(events, key=lambda e: e['t']):
        if e['type'].startswith('_'):
            continue  # 下划线开头的是给检查看的记号（如 _cut 换屏），不出声
        if e['t'] < 0 or e['t'] > total or e['t'] - last.get(e['type'], -9) < 0.18:
            continue  # 同类音效太密就丢掉
        x = synth(e['type']) * GAIN.get(e['type'], 0.5) * e.get('gain', 1)
        i = int(e['t'] * SR)
        buf[i : i + len(x)] += x
        last[e['type']] = e['t']
        n += 1
    sf.write(P / name, buf[: int(total * SR)], SR)
    return n


def clip_event(e):
    """scenes.js 里 clip()/clipSound() 登记的原声：'clip:id|from[|t1=..|fi=..|fo=..]' → {id, from, t, gain, t1, fi, fo}"""
    p = e['type'][5:].split('|')
    d = {'id': p[0], 'from': float(p[1]), 't': e['t'], 'gain': e['gain'], 't1': None, 'fi': 0.0, 'fo': 0.0}
    for kv in p[2:]:
        k, v = kv.split('=')
        d[k] = float(v)
    return d


def duck_env(tl, n, db=12, ramp=0.3):
    """旁白包络：每句 t0+lead 到 t0+voiced 压低 db 分贝，进出各 ramp 秒（在分贝上线性过渡）。返回 n 个采样的增益。"""
    rate = 1000
    m = int(n / SR * rate) + 2
    tt = np.arange(m) / rate
    d = np.zeros(m)
    for s in tl or []:
        if silent(s):
            continue
        a, b = s['t0'] + s['lead'], s['t0'] + s['voiced']
        d = np.maximum(d, np.clip(np.minimum((tt - (a - ramp)) / ramp, (b + ramp - tt) / ramp), 0, 1))
    return np.interp(np.arange(n) / SR, tt, 10 ** (-db * d / 20)).astype('float32'), float((d > 0.999).sum() / rate)


def orig_track(clips, total, tl=None, name='orig.wav', duck=12):
    """素材原声单独一条轨：按 clip()/clipSound() 登记的起点、from、t1、淡入淡出叠进去；有旁白的地方压低 duck 分贝。"""
    buf = np.zeros(int(total * SR) + SR, dtype='float32')
    meta = jload('clips/meta.json', {}) or {}
    n = 0
    for e in clips:
        c = clip_event(e)
        m = meta.get(c['id'], {})
        if c['gain'] <= 0 or not m.get('audio'):
            continue
        x, sr = sf.read(P / m['audio'], dtype='float32')
        x = x if x.ndim == 1 else x.mean(1)
        x = x[int(c['from'] * sr) :]
        if c['t1'] is not None:
            x = x[: max(0, int((c['t1'] - c['t']) * sr))]
        x = x * c['gain'] * 2.2
        L = len(x)
        if c['fi'] > 0 and L:
            k = min(L, int(c['fi'] * sr))
            x[:k] *= np.linspace(0, 1, k, endpoint=False, dtype='float32')
        if c['fo'] > 0 and L:
            k = min(L, int(c['fo'] * sr))
            x[L - k :] *= np.linspace(1, 0, k, dtype='float32')
        i = int(c['t'] * SR)
        x = x[: max(0, len(buf) - i)]
        buf[i : i + len(x)] += x
        n += 1
    sec = 0.0
    if duck and n:
        env, sec = duck_env(tl, len(buf), float(duck))
        buf *= env
    sf.write(P / name, buf[: int(total * SR)], SR, subtype='FLOAT')
    return n, sec


def loudness(path):
    r = subprocess.run(
        [
            'ffmpeg',
            '-hide_banner',
            '-i',
            str(path),
            '-af',
            f'loudnorm=I={LUFS}:TP=-1.5:LRA=11:print_format=json',
            '-f',
            'null',
            '-',
        ],
        capture_output=True,
        text=True,
    )
    return json.loads(r.stderr[r.stderr.rindex('{') : r.stderr.rindex('}') + 1])


# 配乐压到旁白下面多少：键盘铺底的平均音量是定好的（-20 dB），再压 17 dB，大约比旁白低 14 dB；别的配乐沿用 -21。brief.json 的 music_gain 可以整体加减几分贝
MU_DB = lambda: (
    -17 if BRIEF.get('music', 'keys') in ('keys', 'cosmos', 'drive', 'pulse', 'warm', 'bright') else -21
) + float(BRIEF.get('music_gain', 0))


def mixdown(vo, mu, out, sfx=None, mu_db=-21, orig=None):
    """配音压缩后和配乐、音效（、素材原声轨）相加，再两遍响度归一到 -14 LUFS，限幅保证真峰值不过 -1.5 dBTP。"""
    ins = ['-i', vo, '-i', mu] + (['-i', sfx] if sfx else []) + (['-i', orig] if orig else [])
    fc = (
        "[0]aresample=44100,highpass=f=70,acompressor=threshold=-18dB:ratio=2.5:attack=5:release=120,volume=4dB,pan=stereo|c0=c0|c1=c0[v];[1]volume="
        + str(mu_db)
        + "dB[m];"
        + (
            "[2]aresample=44100,volume=-9dB,pan=stereo|c0=c0|c1=c0[s];[v][m][s]amix=inputs=3:normalize=0[a]"
            if sfx
            else "[v][m]amix=inputs=2:normalize=0[a]"
        )
    )
    if orig:  # 原声轨和音效同样 -9 dB（旧做法里原声就混在音效轨里），单独一路才能按旁白压低
        oi = 3 if sfx else 2
        fc = (
            fc.rsplit(';', 1)[0]
            + f";[{oi}]aresample=44100,volume=-9dB,pan=stereo|c0=c0|c1=c0[o];[v][m]"
            + ("[s]" if sfx else "")
            + f"[o]amix=inputs={oi + 1}:normalize=0[a]"
        )
    subprocess.run(
        ['ffmpeg', '-y', '-loglevel', 'error', *ins, '-filter_complex', fc, '-map', '[a]', '_pre.wav'], check=True
    )
    m = loudness('_pre.wav')
    af = f"loudnorm=I={LUFS}:TP=-1.5:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true,aresample=44100,alimiter=limit=0.68:level=false:attack=2:release=60"
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', '_pre.wav', '-af', af, out], check=True)
    r = loudness(out)
    if (
        float(r['input_i']) < LUFS - 0.6
    ):  # 峰值先到顶、响度还差一截（旁白动态大时常见）：把差的那几分贝补在限幅器前面，让限幅器吃掉个别尖峰
        up = min(4.0, LUFS - float(r['input_i']))
        af2 = af.replace(',aresample=44100,alimiter', f',volume={up:.1f}dB,aresample=44100,alimiter')
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', '_pre.wav', '-af', af2, out], check=True)
        r = loudness(out)
    Path('_pre.wav').unlink()
    print(f"响度 {r['input_i']} LUFS，真峰值 {r['input_tp']} dBTP（目标 {LUFS} / -1.5）")


# ---------- 节拍 ----------
def detect_beats(x, sr):
    """量速度和第一拍：短时能量的上升沿做成“起音曲线”，自相关找周期（60–180 拍/分），再找让拍点落在起音上的相位。返回 (bpm, 第一拍秒数, 可信度 0..1)。"""
    hop = 256
    n = 1024
    fr = 1 + (len(x) - n) // hop
    if fr < 200:
        return 0, 0, 0
    idx = np.arange(n)[None, :] + hop * np.arange(fr)[:, None]
    mag = np.abs(np.fft.rfft(x[idx] * np.hanning(n), axis=1))
    mag = np.log1p(40 * mag)
    on = np.maximum(0, np.diff(mag, axis=0)).sum(1)
    on = on - np.convolve(on, np.ones(43) / 43, 'same')
    on = np.maximum(on, 0)
    f = sr / hop
    ac = np.correlate(on, on, 'full')[len(on) - 1 :]
    lo, hi = int(f * 60 / 200), int(f * 60 / 50)
    sc = np.array(
        [ac[l] + 0.5 * ac[min(len(ac) - 1, 2 * l)] + 0.25 * ac[min(len(ac) - 1, 4 * l)] for l in range(lo, hi + 1)]
    )
    l0 = lo + int(sc.argmax())
    comb = lambda L, ph: on[
        np.clip(np.round(ph + L * np.arange(int((len(on) - ph) / L))).astype(int), 0, len(on) - 1)
    ].mean()
    cand = np.arange(l0 - 1.5, l0 + 1.501, 0.02)  # 在整数周期附近细搜，拍点才不会越走越偏
    best = max(((comb(L, ph), L, ph) for L in cand for ph in np.arange(0, L, max(1, L / 24))), key=lambda z: z[0])
    hit, L, ph = best
    conf = float(np.clip(1 - comb(L, ph + L / 2) / (hit + 1e-9), 0, 1)) * float(
        np.clip(hit / (on.mean() * 3 + 1e-9), 0, 1)
    )  # 拍点上比两拍中间响多少 × 拍点上比平均响多少
    bpm = 60 * f / L
    while bpm > 160:
        bpm /= 2
        L *= 2  # 折进 80–160：量出来的常是半拍或两拍
    while bpm < 80:
        bpm *= 2
        L /= 2
        ph = ph % L
    return bpm, ph / f + n / 2 / sr, conf


def cmd_beats(path):
    src = Path(path) if Path(path).exists() else P / path
    if not src.exists():
        print('找不到', path)
        sys.exit(1)
    raw = subprocess.run(
        ['ffmpeg', '-v', 'error', '-i', str(src), '-t', '90', '-ac', '1', '-ar', '22050', '-f', 'f32le', '-'],
        capture_output=True,
    ).stdout
    bpm, off, conf = detect_beats(np.frombuffer(raw, dtype=np.float32).astype(np.float64), 22050)
    if not bpm:
        print('音乐太短（不到 3 秒），量不出速度')
        sys.exit(1)
    print(
        f'速度约 {bpm:.1f} 拍/分，第一拍在 {off:.2f} 秒，可信度 {conf:.2f}'
        + ('（偏低：没有明显鼓点的音乐量不准，自己数一下）' if conf < 0.5 else '')
    )
    print(f'写进 brief.json：  "music": "{path}", "bpm": {bpm:.1f}, "beat_offset": {off:.2f}')
    print(
        '程序分不清快一倍还是慢一倍、也分不清哪一拍是小节的第一拍：听着不对就把 bpm 乘 2 或除以 2，beat_offset 加减几拍（一拍 = 60÷bpm 秒）。'
    )
