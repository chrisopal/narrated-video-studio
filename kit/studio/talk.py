"""口播线：把一条录好的口播转写、剪好、做成时间轴，校对单和“口播校对”检查。"""

import json
import re
import sys
import subprocess
import numpy as np
import soundfile as sf
from .base import BRIEF, FPS, P, TALK, ffprobe, jload, load_pcm, sha, tc
from .sound import SR
from .voice import wav_sha
from .footage import ASR_MODEL, cmd_clips, cmd_transcribe, footage_file, transcript_of

# ---------- 口播线：把一条录好的口播变成时间轴 ----------
_strip = lambda z: re.sub(r'[\s，。！？；：、,.!?;:“”"《》（）()·\-—…]', '', z or '')


def talk_doubts(src, T):
    """复核识别：每一句换两种切法各再识别一遍，和第一遍逐字比。三遍里有不一样的地方，记成这一句的存疑（doubt），要人对着原声听。
    它只抓得到“识别不稳”的字；三遍都错成同一个字的（专有名词常这样）抓不到，那要靠查证和通读。"""
    import sherpa_onnx, difflib

    x = load_pcm(src, 16000)
    rec = sherpa_onnx.OfflineRecognizer.from_paraformer(
        paraformer=str(ASR_MODEL / 'model.int8.onnx'), tokens=str(ASR_MODEL / 'tokens.txt'), num_threads=4
    )
    pad = np.zeros(8000, dtype='float32')
    n = 0

    def hear(a, b):
        st = rec.create_stream()
        st.accept_waveform(16000, np.concatenate([pad, x[max(0, int(a * 16000)) : int(b * 16000)], pad]))
        rec.decode_stream(st)
        return _strip(st.result.text)

    for q in T['sentences']:
        base = _strip(q['text'])
        found = []
        for pre, post in ((0.12, 0.15), (0.45, 0.5)):
            alt = hear(q['start'] - pre, q['end'] + post)
            for tag, i1, i2, j1, j2 in difflib.SequenceMatcher(None, base, alt, autojunk=False).get_opcodes():
                if tag == 'equal' or (tag in ('insert', 'delete') and (i1 == 0 or i2 == len(base))):
                    continue  # 句子两头多出来或少掉的字是旁边那一句的
                if tag == 'replace' and (i1 == 0 or i2 == len(base)) and abs((i2 - i1) - (j2 - j1)) > 1:
                    continue
                d = {'a': base[i1:i2], 'b': alt[j1:j2], 'at': i1}
                if not any(f['a'] == d['a'] and f['b'] == d['b'] for f in found):
                    found.append(d)
        q['doubt'] = found
        n += bool(found)
    return n


def talk_sheet(S, SS, name='校对单.md'):
    """校对单：一句一行，识别原文、字幕、改了哪里、哪里存疑。出片前给出镜人或用户过一遍。"""
    rows = []
    fixed = 0
    open_ = 0
    for l in S:
        if 'src' not in l:
            continue
        q = SS[l['src']]
        raw = _strip(q['text'])
        now = _strip(l['vo'])
        chg = '' if raw == now else '改了字'
        fixed += bool(chg)
        db = '；'.join(f"{d['a'] or '∅'}／{d['b'] or '∅'}" for d in q.get('doubt', []))
        ok = (l['asr_ok'] if isinstance(l.get('asr_ok'), str) else '已听过') if l.get('asr_ok') else ''
        open_ += bool(db and not ok)
        rows.append(f"| {l['id']} | {tc(q['start'])} | {q['text']} | {l['vo']} | {chg} | {db} | {ok} |")
    (P / name).write_text(
        '# 校对单\n\n识别会错字，尤其是人名、地名、书名、术语和同音字。“改了字”是校对时改过的，“存疑”是换个切法再识别结果不一样的地方：这两类请对着原声听一遍。\n'
        '三遍识别都一样的错字这张表标不出来，所以每一句的字幕都请扫一眼。确认后在 brief.json 的 talk 里写 "proofread":"谁在哪天看过"。\n\n| 句 | 素材里的时间 | 识别原文 | 字幕 | 改动 | 存疑（第一遍／再识别） | 确认 |\n|---|---|---|---|---|---|---|\n'
        + '\n'.join(rows)
        + '\n',
        encoding='utf-8',
    )
    return fixed, open_


def talk_check(tl):
    """口播校对：识别不稳的字有没有人听过、专有名词查了没有、校对单给人看过没有。"""
    TK = BRIEF.get('talk') or {}
    fails = []
    warns = []
    src = P / TK.get('file', '')
    f, T = transcript_of(src) if src.is_file() else (None, None)
    if not T:
        return ['找不到口播的转写：先运行 build.py talk'], []
    SS = {x['n']: x for x in T['sentences']}
    L = [l for l in tl if 'src' in l]
    if any('doubt' not in SS.get(l['src'], {}) for l in L):
        return ['转写还没做复核识别：重新运行 build.py talk'], []
    for l in L:
        q = SS[l['src']]
        if q['doubt'] and not l.get('asr_ok'):
            fails.append(
                f"{l['id']}（素材 {tc(q['start'])}）识别不稳："
                + '；'.join(f"{d['a'] or '∅'}／{d['b'] or '∅'}" for d in q['doubt'])
                + f"。字幕现在是「{l['vo']}」：对着原声听过、改对之后，在这一句写 \"asr_ok\": true（听不了原声、只是按上下文定的，写成一句理由，如 \"asr_ok\":\"上下文只能是红纸\"，校对单里会照样列出来）"
            )
    terms = TK.get('terms')
    if terms is None:
        warns.append(
            'brief.json 的 talk 里没有 terms：把人名、地名、书名、术语这些专有名词列出来逐个查证（[{"term":"神荼","basis":"查证的来源，或“出镜人确认”"}]），确实没有就写 []。识别对专有名词常常稳定地错成同音字，复核抓不到'
        )
    else:
        allvo = ''.join(l['vo'] for l in L)
        for x in terms:
            if not x.get('basis'):
                fails.append(f"专有名词「{x.get('term')}」没写 basis：查证的来源，或“出镜人确认”")
            if x.get('term') and x['term'] not in allvo:
                warns.append(f"专有名词「{x['term']}」不在字幕里：是不是又被改了")
    fixed = sum(_strip(SS[l['src']]['text']) != _strip(l['vo']) for l in L)
    if not TK.get('proofread'):
        warns.append(
            f'校对单还没有人确认（改了字的 {fixed} 句，都在 校对单.md 里）：给出镜人或用户看过之后，在 brief.json 的 talk 里写 "proofread":"谁在哪天看过"'
        )
    return fails, warns


def cmd_talk(arg=None):
    """口播线的准备：转写 → script.json 草稿（一句一行，src 是转写的第几句）→ 按 script.json 留下的句子剪出口播（长停顿收紧、删掉的句子剪掉）
    → footage/_talk.mp4、audio/<句id>.wav、audio/words.json（逐字时间，来自原声）、assets.json 里的 talk 片段并切片。
    改了 script.json（删句子、调顺序以外的改动：校对错字只改 vo，不动 tts）之后重新运行一遍。"""
    TK = BRIEF.get('talk') or {}
    arg = arg or TK.get('file')
    if not arg:
        print(
            '用法：build.py talk 口播视频文件（放在 footage/ 里），或在 brief.json 写 "talk":{"file":"footage/x.mp4","speaker":"名字"}'
        )
        sys.exit(1)
    if not TALK:
        print('✗ brief.json 要写 "mode":"talk"（口播线：时间轴跟原声走）')
        sys.exit(1)
    src = footage_file(arg)
    f, T = transcript_of(src)
    if not T or T.get('sha256') != sha(src) or 'ct' not in (T.get('sentences') or [{}])[0]:
        cmd_transcribe(arg)
        f, T = transcript_of(src)
    if any('doubt' not in x for x in T['sentences']):  # 复核识别：换两种切法各再识别一遍，不一样的地方记成存疑
        nd = talk_doubts(src, T)
        json.dump(T, open(f, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        print(
            f'复核识别：{nd} 句里有识别不稳的字' if nd else '复核识别：三遍结果一致（不等于没有错字，专有名词照样要查）'
        )
    SS = {x['n']: x for x in T['sentences']}
    m = ffprobe(src)
    sp = P / 'script.json'
    if not m:
        print('✗ 这条素材没有画面（口播线要的是带人像的视频）：', src.name)
        sys.exit(1)
    if not sp.exists():
        sp.write_text(
            '[\n'
            + ',\n'.join(
                ' '
                + json.dumps(
                    {'id': f"s{x['n']}", 'ch': '', 'vo': x['text'], 'tts': x['text'], 'src': x['n']}, ensure_ascii=False
                )
                for x in T['sentences']
            )
            + '\n]\n',
            encoding='utf-8',
        )
        print(
            f'已写 script.json 草稿（{len(SS)} 句）。接下来：对着原声校对错字（只改 vo，tts 留着识别原文）；口误、重复的句子整行删掉；填 ch 分章；标 beat、hl（字幕里要变色的词）。改完再运行一遍 talk。'
        )
    S = json.load(open(sp, encoding='utf-8'))
    L = [l for l in S if 'src' in l]
    if not L:
        print('✗ script.json 里没有带 src 的句子')
        sys.exit(1)
    for l in L:
        if l['src'] not in SS:
            print(f"✗ {l['id']} 的 src={l['src']}，转写里没有这一句")
            sys.exit(1)
    PRE = 0.1
    POST = float(TK.get('post', 0.25))
    MAXP = float(TK.get('max_pause', 0.7))
    q = lambda v: round(v * FPS) / FPS
    rng = []  # 每句在素材里取哪一段。下一句紧接着、中间停顿不长：连着取（不出剪辑点）；否则在句尾留一点气口就切
    for i, l in enumerate(L):
        x = SS[l['src']]
        a = rng[-1][1] if rng and rng[-1][2] else max(0, x['start'] - PRE)
        nx = L[i + 1] if i + 1 < len(L) else None
        joined = bool(nx and nx['src'] == l['src'] + 1 and SS[nx['src']]['start'] - x['end'] <= MAXP)
        b = (
            SS[nx['src']]['start'] - PRE
            if joined
            else min(x['end'] + POST, m['duration'], SS[l['src'] + 1]['start'] - 0.02 if l['src'] + 1 in SS else 1e9)
        )
        rng.append([a, max(b, a + 0.2), joined])
    runs = []  # 连着的句子并成一段；每段的长度凑成整帧，声音和画面才不会越剪越错位
    for i, (a, b, j) in enumerate(rng):
        if runs and rng[i - 1][2]:
            runs[-1][1] = b
            runs[-1][2].append(i)
        else:
            runs.append([a, b, [i]])
    for r in runs:
        d = q(r[1] - r[0])
        r[1] = r[0] + d
        rng[r[2][-1]][1] = r[1]
    kept = sum(r[1] - r[0] for r in runs)
    out = P / 'footage' / '_talk.mp4'
    (P / 'audio').mkdir(exist_ok=True)
    fc = ''.join(
        f"[0:v]trim=start={a:.4f}:end={b:.4f},setpts=PTS-STARTPTS,fps={FPS}[v{k}];[0:a]atrim=start={a:.4f}:end={b:.4f},asetpts=PTS-STARTPTS[a{k}];"
        for k, (a, b, _) in enumerate(runs)
    )
    fc += (
        ''.join(f'[v{k}][a{k}]' for k in range(len(runs)))
        + f"concat=n={len(runs)}:v=1:a=1[v][a];[v]scale='min(1280,iw)':-2,setsar=1[vo]"
    )
    ff = P / 'footage' / '_talk.filter'
    ff.write_text(fc)
    r = subprocess.run(
        [
            'ffmpeg',
            '-y',
            '-v',
            'error',
            '-i',
            str(src),
            '-filter_complex_script',
            str(ff),
            '-map',
            '[vo]',
            '-map',
            '[a]',
            '-c:v',
            'libx264',
            '-crf',
            '16',
            '-pix_fmt',
            'yuv420p',
            '-c:a',
            'aac',
            '-b:a',
            '192k',
            str(out),
        ]
    )
    ff.unlink()
    if r.returncode:
        print('✗ 剪口播失败')
        sys.exit(1)
    x = load_pcm(src, SR)
    W = {}
    fade = int(0.008 * SR)
    for i, (l, (a, b, j)) in enumerate(zip(L, rng)):
        y = x[int(round(a * SR)) : int(round(b * SR))].astype('float64')
        if not (i and rng[i - 1][2]) and len(y) > 2 * fade:
            y[:fade] *= np.linspace(0, 1, fade)  # 剪辑点上淡入淡出几毫秒，不出“啪”的一声
        if not j and len(y) > 2 * fade:
            y[-fade:] *= np.linspace(1, 0, fade)
        sf.write(P / 'audio' / f"{l['id']}.wav", y, SR)
        s_ = SS[l['src']]
        spoken = l.get('tts') or l['vo']
        if len(s_['ct']) != len(spoken):
            print(
                f"△ {l['id']} 的 tts 被改过（{len(spoken)} 字，识别原文 {len(s_['ct'])} 字）：逐字时间按比例估。校对错字请只改 vo"
            )
        ct = [
            round(
                max(0, s_['ct'][min(len(s_['ct']) - 1, round(k * (len(s_['ct']) - 1) / max(1, len(spoken) - 1)))] - a),
                3,
            )
            for k in range(len(spoken))
        ]
        W[l['id']] = {
            'text': spoken,
            'ct': ct,
            'ok': True,
            'score': 1.0,
            'diffs': [],
            'talk': True,
            'wav': wav_sha(l['id']),
        }  # 原声剪出来的音频，记下指纹，之后被换掉会被查出来
    json.dump(W, open(P / 'audio' / 'words.json', 'w', encoding='utf-8'), ensure_ascii=False)
    A = jload('assets.json', []) or []
    A = [a for a in A if a.get('id') != 'talk']
    k = min(1, 960 / max(m['width'], m['height']))
    size = [int(m['width'] * k) // 2 * 2, int(m['height'] * k) // 2 * 2]
    A.insert(
        0,
        {
            'id': 'talk',
            'type': 'video',
            'file': 'footage/_talk.mp4',
            'usage_basis': 'own',
            'creator': TK.get('speaker') or '出镜人本人',
            'source': f"自己录制的口播：{src.name}",
            'in': 0,
            'out': round(kept, 3),
            'size': size,
            'fit': 'cover',
        },
    )
    (P / 'assets.json').write_text(json.dumps(A, ensure_ascii=False, indent=1), encoding='utf-8')
    cmd_clips()
    fixed, open_ = talk_sheet(S, SS)
    print(f'校对单.md：改了字的 {fixed} 句，存疑还没听过的 {open_} 句')
    cuts = len(runs) - 1
    drop = len(SS) - len(L)
    print(
        f"口播：素材 {m['duration']:.1f} 秒 → 剪成 {kept:.1f} 秒，{len(L)} 句（删掉 {drop} 句），{cuts} 个剪辑点，收紧停顿和删句共去掉 {m['duration'] - kept:.1f} 秒"
    )
    print('下一步：build.py timeline，然后写 scenes.js（风格包 talk，见 templates/口播片.md）')
