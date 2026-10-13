"""版本指纹：check、render、mix、cover 各记下用的是哪一版输入，final 核对是同一版；出完回读成片。"""

import json
import sys
import subprocess
import hashlib
from pathlib import Path
from .base import BRIEF, CH, CW, KIT, P, jload, sha

# ---------- 版本指纹：check、render、mix、cover 各记下用的是哪一版输入，final 核对是同一版（2026-10-09 评审 P1） ----------
# 只比文件内容，不比修改时间：拷贝、git checkout、同步盘都会改时间而内容不变；反过来，换掉一个同名文件时间可能还更早
STATE = P / '_build_state.json'


def _engine():
    fs = [KIT / x for x in ('kit.js', 'components.js', 'film.html')]
    for k in BRIEF.get('packs', []):
        fs += [KIT / 'packs' / f'{k}.js'] + sorted((KIT / 'packs' / k).glob('*.js'))
    return fs


def fp_files(kind):
    """kind：pic 画面（render、cover、整片扫描）/ snd 声音（mix）/ all 检查（全部输入，含稿子、台账、配音、引擎和检查脚本本身）。"""
    A = jload('assets.json', []) or []
    meta = jload('clips/meta.json', {}) or {}
    pic = (
        [P / x for x in ('brief.json', 'scenes.js', 'timeline.json', 'assets.json', 'clips/meta.json')]
        + _engine()
        + [P / a['file'] for a in A if a.get('type') != 'video' and a.get('file')]
    )
    mu = BRIEF.get('music')
    snd = (
        [P / x for x in ('brief.json', 'scenes.js', 'timeline.json', 'vo.wav', 'assets.json', 'clips/meta.json')]
        + [P / m['audio'] for m in meta.values() if m.get('audio')]
        + ([P / mu] if isinstance(mu, str) and ('/' in mu or '.' in mu) else [])
    )
    if kind == 'pic':
        return pic
    if kind == 'snd':
        return snd
    return list(
        dict.fromkeys(
            pic
            + snd
            + [
                P / x
                for x in (
                    'script.json',
                    'short.json',
                    'facts.json',
                    'audio/words.json',
                    'article/article.md',
                    '校对单.md',
                )
            ]
            + sorted((P / 'audio').glob('*.wav'))
            + [KIT / 'build.py']
            + sorted((KIT / 'studio').glob('*.py'))
        )
    )


def fingerprint(kind):
    """返回 (总指纹, {文件: 内容哈希})；不存在的文件记成 '-'，所以“删掉一个文件”也算改动。"""
    m = {}
    for f in fp_files(kind):
        k = (
            ('kit/' + str(f.relative_to(KIT)))
            if f.is_relative_to(KIT)
            else str(f.relative_to(P)) if f.is_relative_to(P) else str(f)
        )
        m[k] = sha(f) if f.is_file() else '-'
    return hashlib.sha256(json.dumps(m, sort_keys=True).encode()).hexdigest()[:16], m


def fp_diff(old, new):
    """两份文件哈希表之间改了哪些，给人看的短名单。"""
    ch = sorted(k for k in set(old) | set(new) if old.get(k) != new.get(k))
    return (
        '、'.join(ch[:6]) + (f' 等 {len(ch)} 个文件' if len(ch) > 6 else '') if ch else '（文件表一样，指纹算法变了）'
    )


def state():
    return jload('_build_state.json', {}) or {}


def remember(out, kind):
    """记下一个产物（silent.mp4、mix.wav、封面）是用哪一版输入做出来的，以及它自己的内容哈希。"""
    S = state()
    fp, m = fingerprint(kind)
    S[Path(out).name] = {'kind': kind, 'fp': fp, 'files': m, 'sha': sha(P / out)}
    STATE.write_text(json.dumps(S, ensure_ascii=False, indent=1), encoding='utf-8')


def stale(out):
    """产物还能不能用：没记录、文件被换过、或输入改过，都返回一句原因；能用返回 None。"""
    e = state().get(Path(out).name)
    f = P / out
    if not f.is_file():
        return f'没有 {out}'
    if not e:
        return f'{out} 没有版本记录（旧版引擎做的，或不是 build.py 做的），重新生成'
    if sha(f) != e['sha']:
        return f'{out} 在生成之后被换过或改过'
    fp, m = fingerprint(e['kind'])
    return None if fp == e['fp'] else f'{out} 生成之后输入改过：{fp_diff(e["files"], m)}'


def verify_out(out, dur, w=None, h=None, tol=0.6):
    """出完的成片回读一遍：有画面有声音、尺寸对、画面和声音各自的时长都对；不对就退出码 1，不报“已出”。
    按流量时长，不按容器时长：容器时长取最长的那条流，画面短了一截时它照样是对的。"""
    w = w or CW
    h = h or CH
    d = {}
    r = subprocess.run(
        [
            'ffprobe',
            '-v',
            'error',
            '-show_entries',
            'stream=codec_type,width,height,duration',
            '-of',
            'json',
            str(P / out),
        ],
        capture_output=True,
        text=True,
    )
    for st in json.loads(r.stdout or '{}').get('streams', []):
        d.setdefault(st['codec_type'], st)
    v, a = d.get('video'), d.get('audio')
    vd = float(v.get('duration') or 0) if v else 0
    ad = float(a.get('duration') or 0) if a else 0
    bad = (
        '读不出画面'
        if not v
        else (
            '没有声音'
            if not a
            else (
                f"尺寸是 {v['width']}x{v['height']}，应为 {w}x{h}"
                if (v['width'], v['height']) != (w, h)
                else (
                    f"画面 {vd:.2f}s，应约 {dur:.2f}s"
                    if abs(vd - dur) > tol
                    else f"声音 {ad:.2f}s，应约 {dur:.2f}s" if abs(ad - dur) > tol else None
                )
            )
        )
    )
    if bad:
        print(f'✗ {out} 回读不对：{bad}，不能交付')
        sys.exit(1)
