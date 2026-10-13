"""素材层：看素材、切片、按讲话转写选入出点、挑镜头、拉片、素材署名清单。"""

import json
import re
import sys
import subprocess
import shutil
from pathlib import Path
import numpy as np
from .base import BASIS, FPS, KIT, P, ffprobe, jload, load_pcm, sha, tc


def scene_cuts(path, th=0.3):
    r = subprocess.run(
        [
            'ffmpeg',
            '-hide_banner',
            '-i',
            str(path),
            '-an',
            '-vf',
            f"scale=320:-2,select='gt(scene,{th})',showinfo",
            '-f',
            'null',
            '-',
        ],
        capture_output=True,
        text=True,
    )
    return [round(float(x), 2) for x in re.findall(r'pts_time:([\d.]+)', r.stderr)]


def silences(path):
    r = subprocess.run(
        ['ffmpeg', '-hide_banner', '-i', str(path), '-vn', '-af', 'silencedetect=noise=-35dB:d=0.5', '-f', 'null', '-'],
        capture_output=True,
        text=True,
    )
    s = re.findall(r'silence_start: ([\d.]+)', r.stderr)
    e = re.findall(r'silence_end: ([\d.]+)', r.stderr)
    return [[round(float(a), 2), round(float(b), 2)] for a, b in zip(s, e)]


def grab_at(path, t, w=480):
    from PIL import Image
    import io

    r = subprocess.run(
        [
            'ffmpeg',
            '-v',
            'error',
            '-ss',
            f'{max(0, t):.3f}',
            '-i',
            str(path),
            '-frames:v',
            '1',
            '-vf',
            f'scale={w}:-2',
            '-f',
            'image2pipe',
            '-c:v',
            'mjpeg',
            '-',
        ],
        capture_output=True,
    )
    return Image.open(io.BytesIO(r.stdout)).convert('RGB') if r.stdout else None


def contact_sheet(path, times, out, cols=4, w=480, labels=None):
    """带时间码的联系表：一眼看完一条素材，选入出点时直接读图上的秒数。"""
    from PIL import Image, ImageDraw

    ims = [(t, grab_at(path, t, w)) for t in times]
    ims = [(t, im) for t, im in ims if im]
    if not ims:
        return
    h = ims[0][1].height
    rows = -(-len(ims) // cols)
    sheet = Image.new('RGB', (cols * w, rows * h), (20, 20, 20))
    d = ImageDraw.Draw(sheet)
    for i, (t, im) in enumerate(ims):
        x, y = (i % cols) * w, (i // cols) * h
        sheet.paste(im.resize((w, h)), (x, y))
        lab = (labels[i] + ' ' if labels else '') + f'{t:.1f}s'
        d.rectangle([x, y, x + 12 + 9 * len(lab), y + 26], fill=(0, 0, 0))
        d.text((x + 6, y + 6), lab, fill=(255, 230, 80))
    sheet.save(out, quality=85)


def assets():
    A = jload('assets.json', []) or []
    meta = jload('clips/meta.json', {}) or {}
    for a in A:
        if a.get('type') == 'video' and a['id'] in meta:
            a['clip'] = meta[a['id']]
        a['license_name'] = BASIS.get(a.get('usage_basis'), '')
    return A


def cmd_probe():
    src = P / 'footage'
    out = {}
    (src / '_sheets').mkdir(parents=True, exist_ok=True)
    for f in sorted(src.iterdir()):
        if f.suffix.lower() not in ('.mp4', '.mov', '.m4v', '.mkv', '.webm', '.avi', '.ogv'):
            continue
        m = ffprobe(f)
        if not m:
            print('读不了', f.name)
            continue
        m['cuts'] = scene_cuts(f)
        m['silences'] = silences(f) if m['has_audio'] else []
        m['sha256'] = sha(f)
        out[f.name] = m
        n = min(24, max(8, int(m['duration'] // 2)))
        contact_sheet(f, [m['duration'] * (i + 0.5) / n for i in range(n)], src / '_sheets' / (f.stem + '.jpg'))
        print(
            f"{f.name}: {m['duration']}s {m['width']}x{m['height']} {m['fps']}fps {m['orientation']} 声音{'有' if m['has_audio'] else '无'} 切点{len(m['cuts'])}个 → footage/_sheets/{f.stem}.jpg"
        )
    json.dump(out, open(src / '_index.json', 'w'), ensure_ascii=False, indent=1)


SENT_PAD = 0.12
PAUSE = 0.35  # "@s3" 写法：句子边界外留的余量（秒）；转写时多长的停顿算断句


def transcript_of(src):
    for f in (P / 'footage' / (src.stem + '.transcript.json'), src.parent / (src.stem + '.transcript.json')):
        if f.exists():
            return f, json.load(open(f, encoding='utf-8'))
    return None, None


def in_out(a, src, m, hs=None):
    """入出点：数字是秒；"@s3" 是 transcribe 出来的第 3 句（in 取句首、out 取句尾，各往外留 0.12 秒，不越过相邻句子的中点）。"""

    def one(v, edge):
        if v is None:
            return 0.0 if edge == 'in' else m['duration']
        if not (isinstance(v, str) and re.fullmatch(r'@s\d+', v.strip())):
            return float(v)
        f, T = transcript_of(src)
        if not T:
            print(f"✗ {a['id']} 的 {edge} 写了 {v}，但还没有转写：python3 ../kit/build.py transcribe {a['id']}")
            sys.exit(1)
        if hs and T.get('sha256') and T['sha256'] != hs:
            print(f"✗ {f.name} 是旧素材的转写（文件改过），重新运行 transcribe {a['id']}")
            sys.exit(1)
        S = T['sentences']
        k = int(v.strip()[2:])
        if not 1 <= k <= len(S):
            print(f"✗ {a['id']} 的 {edge} 写了 {v}，转写只有 {len(S)} 句")
            sys.exit(1)
        x = S[k - 1]
        if edge == 'in':
            t = x['start'] - SENT_PAD
            t = max(t, (S[k - 2]['end'] + x['start']) / 2) if k > 1 else t
            return round(max(0.0, t), 3)
        t = x['end'] + SENT_PAD
        t = min(t, (x['end'] + S[k]['start']) / 2) if k < len(S) else t
        return round(min(m['duration'], t), 3)

    return one(a.get('in'), 'in'), one(a.get('out'), 'out')


def footage_file(arg):
    """命令行参数：素材 id（assets.json）或文件名（项目目录或 footage/ 里）。"""
    a = next((a for a in (jload('assets.json', []) or []) if a.get('id') == arg), None)
    for c in ([P / a['file']] if a else []) + [P / arg, P / 'footage' / arg]:
        if c.is_file():
            return c
    print('✗ 找不到素材：', arg, '（写 assets.json 里的 id，或 footage/ 里的文件名）')
    sys.exit(1)


def cmd_clips():
    """按台账切片。帧精确（重编码 + trim），统一到 30 帧；fit: cover 裁满 / contain 留边 / blur 模糊垫底。"""
    A = jload('assets.json', []) or []
    cd = P / 'clips'
    cd.mkdir(exist_ok=True)
    meta = jload('clips/meta.json', {}) or {}
    plan = []
    for a in A:  # 先把所有入出点算出来、查一遍，有错就一条都不切
        if a.get('type') != 'video':
            continue
        src = P / a['file']
        m = ffprobe(src)
        if not m:
            print('✗ 找不到或读不了', a['file'])
            sys.exit(1)
        hs = sha(src)
        t0, t1 = in_out(a, src, m, hs)
        if not (0 <= t0 < t1 <= m['duration'] + 0.05):
            print(f"✗ {a['id']} 入出点 {t0}–{t1} 超出素材时长 {m['duration']}")
            sys.exit(1)
        plan.append((a, src, m, hs, t0, t1))
    for a, src, m, hs, t0, t1 in plan:
        w, h = a.get('size') or [1280, 720]
        fit = a.get('fit', 'cover')
        sig = [hs, t0, t1, w, h, fit]
        if meta.get(a['id'], {}).get('sig') == sig and (cd / a['id']).exists():
            print('· 已切好', a['id'])
            continue
        vf = {
            'cover': f'scale={w}:{h}:force_original_aspect_ratio=increase,crop={w}:{h}',
            'contain': f'scale={w}:{h}:force_original_aspect_ratio=decrease,pad={w}:{h}:(ow-iw)/2:(oh-ih)/2',
            'blur': f'split[a][b];[a]scale={w}:{h}:force_original_aspect_ratio=increase,crop={w}:{h},boxblur=24:2[bg];[b]scale={w}:{h}:force_original_aspect_ratio=decrease[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2',
        }[fit]
        fd = cd / a['id']
        shutil.rmtree(fd, ignore_errors=True)
        fd.mkdir()
        subprocess.run(
            [
                'ffmpeg',
                '-y',
                '-v',
                'error',
                '-i',
                str(src),
                '-an',
                '-vf',
                f'trim=start={t0}:end={t1},setpts=PTS-STARTPTS,fps={FPS},{vf},setsar=1',
                '-q:v',
                '3',
                str(fd / 'f%05d.jpg'),
            ],
            check=True,
        )
        n = len(list(fd.glob('f*.jpg')))
        wav = None
        if m['has_audio']:
            wav = f"clips/{a['id']}.wav"
            subprocess.run(
                [
                    'ffmpeg',
                    '-y',
                    '-v',
                    'error',
                    '-i',
                    str(src),
                    '-vn',
                    '-af',
                    f'atrim=start={t0}:end={t1},asetpts=PTS-STARTPTS,afade=t=in:d=0.06,afade=t=out:st={max(0, t1 - t0 - .08)}:d=0.08',
                    '-ar',
                    '44100',
                    '-ac',
                    '1',
                    str(P / wav),
                ],
                check=True,
            )
        meta[a['id']] = {'n': n, 'fps': FPS, 'w': w, 'h': h, 'dur': round(n / FPS, 3), 'audio': wav, 'sig': sig}
        print(
            f"✓ {a['id']}: {t0}–{t1}s → {n} 帧（{n / FPS:.2f}s）{'带原声' if wav else '无声'}"
            + (
                f"（{a.get('in', '')}–{a.get('out', '')}）"
                if isinstance(a.get('in'), str) or isinstance(a.get('out'), str)
                else ''
            )
        )
    json.dump(meta, open(cd / 'meta.json', 'w'), ensure_ascii=False, indent=1)


# ---------- 转写：按讲话内容选入出点 ----------
ASR_MODEL = KIT / 'models' / 'sherpa-onnx-paraformer-zh-2023-09-14'  # 和 asr.py 同一个识别模型


def cmd_transcribe(arg):
    """离线识别素材里的讲话，按停顿（和标点，模型给的话）切成句子：footage/<名字>.transcript.json，并打印“编号 起–止 文字”。"""
    src = footage_file(arg)
    try:
        import sherpa_onnx

        if not (ASR_MODEL / 'model.int8.onnx').exists():
            raise FileNotFoundError(f'缺少识别模型 {ASR_MODEL}')
    except Exception as e:
        print('转写没法运行：', e)
        print(
            '需要 pip install sherpa-onnx（云端加 --break-system-packages）和识别模型，下载命令见 流程.md「环境、依赖、密钥」一节，模型解压到 kit/models/。'
        )
        sys.exit(2)
    m = ffprobe(src)
    if not m or not m['has_audio']:
        print('✗ 这条素材没有声音：', src.name)
        sys.exit(1)
    SRA = 16000
    x = load_pcm(src, SRA)
    hop = int(0.02 * SRA)
    nf = len(x) // hop
    if nf < 5:
        print('✗ 声音太短')
        sys.exit(1)
    db = 10 * np.log10(np.mean(x[: nf * hop].reshape(nf, hop) ** 2, 1) + 1e-10)
    thr = max(np.percentile(db, 95) - 30, -55)
    quiet = db < thr

    def pause(a, b, need=PAUSE):  # a–b 之间有没有一段至少 need 秒的静音
        run = 0
        for q in quiet[max(0, int(a / 0.02)) : min(nf, int(b / 0.02))]:
            run = run + 1 if q else 0
            if run * 0.02 >= need:
                return True
        return False

    # 分段识别：在静音处切开，每段不超过 20 秒
    cuts = [0]
    i = 0
    best = None
    while i < nf:
        if quiet[i]:
            j = i
            while j < nf and quiet[j]:
                j += 1
            if (j - i) * 0.02 >= 0.3:
                best = (i + j) // 2
            i = j
        else:
            i += 1
        if (i - cuts[-1]) * 0.02 > 20:
            c = (
                best
                if best and best > cuts[-1] + 50
                else cuts[-1] + int(np.argmin(db[cuts[-1] + 250 : cuts[-1] + 1000])) + 250
            )
            cuts.append(c)
            best = None
            i = max(i, c)
    cuts.append(nf)
    rec = sherpa_onnx.OfflineRecognizer.from_paraformer(
        paraformer=str(ASR_MODEL / 'model.int8.onnx'), tokens=str(ASR_MODEL / 'tokens.txt'), num_threads=4
    )
    toks = []
    pad = np.zeros(SRA // 2, dtype='float32')
    for a, b in zip(cuts, cuts[1:]):
        seg_ = x[a * hop : b * hop]
        if quiet[a:b].all():
            continue
        st = rec.create_stream()
        st.accept_waveform(SRA, np.concatenate([pad, seg_, pad]))
        rec.decode_stream(st)
        toks += [
            (tk, round(a * 0.02 + ts - 0.5, 3)) for tk, ts in zip(st.result.tokens, st.result.timestamps) if tk.strip()
        ]
    if not toks:
        print('没有识别出讲话')
        sys.exit(1)
    PUNCT = '，。！？；、,.!?;'
    sents = []
    cur = []
    for k, (tk, t) in enumerate(toks):
        if tk in PUNCT:
            if cur:
                cur[-1] = (cur[-1][0], cur[-1][1], True)
            continue
        if cur and (cur[-1][2] or t - cur[-1][1] > 0.8 or pause(cur[-1][1] + 0.08, t)):
            sents.append(cur)
            cur = []
        cur.append((tk, t, False))
    sents.append(cur)
    sents = [c for c in sents if c]
    out = []  # 太长的句子在最大的停顿处再切一刀
    while sents:
        c = sents.pop(0)
        if len(c) > 30:
            gaps = [c[i + 1][1] - c[i][1] for i in range(8, len(c) - 8)]
            i = 8 + int(np.argmax(gaps)) + 1
            sents[:0] = [c[:i], c[i:]]
            continue
        out.append(c)

    def text(c, times=False):
        s = ''
        ct = []
        for tk, t_, _ in c:
            w = tk.replace('@@', '')
            if s and re.match(r'[A-Za-z0-9]', w) and re.search(r'[A-Za-z0-9]$', s) and not prev.endswith('@@'):
                s += ' '
                ct.append(t_)
            s += w
            ct += [t_] * len(w)
            prev = tk
        return ct if times else s

    S = []
    for k, c in enumerate(out):
        a = c[0][1]
        b = c[-1][1]
        nxt = out[k + 1][0][1] if k + 1 < len(out) else len(x) / SRA
        prv = S[-1]['end'] if S else 0
        i = int(a / 0.02)
        while i > 0 and not quiet[i - 1] and a - (i - 1) * 0.02 < 0.3 and (i - 1) * 0.02 > prv:
            i -= 1  # 句首往前找到声音真正起来的地方
        st = max(prv, min(a, i * 0.02))
        j = int((b + 0.1) / 0.02)
        while j < nf and not quiet[j] and (j + 1) * 0.02 < min(nxt, b + 0.8):
            j += 1  # 句尾往后找到声音落下去的地方
        S.append(
            {
                'n': k + 1,
                'start': round(st, 2),
                'end': round(max(b + 0.2, min(j * 0.02, nxt - 0.02)), 2),
                'text': text(c),
                'ct': [round(v, 3) for v in text(c, True)],
            }
        )  # ct：每个字在素材里的发音时刻（口播线用它把画面挂在词上）
    f = P / 'footage' / (src.stem + '.transcript.json')
    f.parent.mkdir(exist_ok=True)
    json.dump(
        {
            'source': str(src.relative_to(P)) if src.is_relative_to(P) else str(src),
            'sha256': sha(src),
            'model': ASR_MODEL.name,
            'duration': m['duration'],
            'sentences': S,
        },
        open(f, 'w', encoding='utf-8'),
        ensure_ascii=False,
        indent=1,
    )
    for x_ in S:
        print(f"s{x_['n']:<3} {tc(x_['start'])}–{tc(x_['end'])}  {x_['text']}")
    print(
        f'{len(S)} 句 → footage/{f.name}。assets.json 里写 "in":"@s3","out":"@s5" 就是第 3 句开头到第 5 句结尾（各留 {SENT_PAD} 秒余量）。识别会有错字，选点前对照联系表和原声核一下。'
    )


# ---------- 挑镜头 ----------
def frame_stats(path, m, fps, w=320):
    """抽样逐帧统计：清晰度（拉普拉斯方差）、平均亮度、过暗/过亮像素比例、和上一帧的平均差。"""
    h = max(2, round(w * m['height'] / m['width'] / 2) * 2)
    n = w * h
    out = []
    prev = None
    pr = subprocess.Popen(
        [
            'ffmpeg',
            '-v',
            'error',
            '-i',
            str(path),
            '-an',
            '-vf',
            f'fps={fps},scale={w}:{h},format=gray',
            '-f',
            'rawvideo',
            '-',
        ],
        stdout=subprocess.PIPE,
    )
    k = 0
    while True:
        b = pr.stdout.read(n)
        if len(b) < n:
            break
        f = np.frombuffer(b, dtype=np.uint8).reshape(h, w).astype('float32')
        lap = 4 * f[1:-1, 1:-1] - f[:-2, 1:-1] - f[2:, 1:-1] - f[1:-1, :-2] - f[1:-1, 2:]
        out.append(
            (
                k / fps,
                float(lap.var()),
                float(f.mean()),
                float(((f < 10) | (f > 245)).mean()),
                float(np.abs(f - prev).mean()) if prev is not None else 0.0,
            )
        )
        prev = f
        k += 1
    pr.wait()
    return np.array(out) if out else np.zeros((0, 5))


def cmd_pick(arg, top=8):
    """挑镜头：切点把素材分成镜头（长于 6 秒的镜头按约 4 秒分段），每段按清晰度、亮度、运动量、时长打分，列出前 top 个，出一张带时间码的联系表。只是建议。"""
    src = footage_file(arg)
    m = ffprobe(src)
    if not m:
        print('✗ 读不了', src)
        sys.exit(1)
    dur = m['duration']
    sfps = 5 if dur <= 600 else 2
    st = frame_stats(src, m, sfps)
    vfps = m['fps'] or 30
    mg = 4 / vfps
    cuts = [c for c in scene_cuts(src) if 0.2 < c < dur - 0.2]
    shots = []
    for i, (a, b) in enumerate(zip([0.0] + cuts, cuts + [dur])):
        a2, b2 = a + (mg if i else 0), b - (mg if b < dur else 0)
        k = max(1, round((b2 - a2) / 4)) if b2 - a2 > 6 else 1
        for j in range(k):
            shots.append(
                (f'S{i + 1:02d}' + (f'.{j + 1}' if k > 1 else ''), a2 + (b2 - a2) * j / k, a2 + (b2 - a2) * (j + 1) / k)
            )
    rows = []
    for sid, a, b in shots:
        sel = st[(st[:, 0] >= a) & (st[:, 0] <= b)] if len(st) else st
        if len(sel) == 0:
            continue
        sharp = float(np.median(sel[:, 1]))
        lum = float(np.median(sel[:, 2]))
        clip_ = float(np.median(sel[:, 3]))
        mot = sel[1:, 4] if len(sel) > 1 else sel[:, 4]
        mv = float(np.median(mot)) if len(mot) else 0.0
        spike = float(mot.max()) if len(mot) else 0.0
        s_sharp = float(
            np.clip((np.log10(sharp + 1) - 1.3) / 1.4, 0, 1)
        )  # 绝对清晰度：方差 20 以下算糊，500 以上算清楚（320 像素宽）；后面再和同一条素材里的排名平均
        s_lum = float(np.clip(min((lum - 15) / 35, (240 - lum) / 40, 1), 0, 1)) * (
            1 - float(np.clip((clip_ - 0.3) / 0.4, 0, 1))
        )
        s_mot = (
            0.4 + 0.6 * mv / 1.5 if mv < 1.5 else 1.0 if mv <= 12 else float(np.clip(1 - (mv - 12) / 28, 0, 1))
        ) * (
            0.7 if spike > 60 else 1
        )  # 几乎不动给一半分（可以推拉）；晃得厉害、中间闪一下要扣分
        d = b - a
        s_dur = min(1.0, d / 2)
        sc = (0.35 * s_sharp + 0.25 * s_lum + 0.25 * s_mot + 0.15 * s_dur) * (1 if d >= 2 else 0.5)
        rows.append(
            {
                'shot': sid,
                'in': round(a, 2),
                'out': round(b, 2),
                'seconds': round(d, 2),
                'score': round(sc, 3),
                'sharp': round(s_sharp, 2),
                'light': round(s_lum, 2),
                'motion': round(s_mot, 2),
                'length': round(s_dur, 2),
                'raw': {
                    'laplacian_var': round(sharp, 1),
                    'luma': round(lum, 1),
                    'clipped': round(clip_, 3),
                    'diff': round(mv, 2),
                },
            }
        )
    if len(rows) > 1:  # 清晰度一半看绝对值、一半看在这条素材里的排名，同一种画质的素材之间也能分出先后
        order = np.argsort(np.argsort([r['raw']['laplacian_var'] for r in rows])) / (len(rows) - 1)
        for r, q in zip(rows, order):
            ns = 0.6 * r['sharp'] + 0.4 * float(q)
            r['score'] = round(r['score'] + 0.35 * (ns - r['sharp']) * (1 if r['seconds'] >= 2 else 0.5), 3)
            r['sharp'] = round(ns, 2)
    rows.sort(key=lambda r: -r['score'])
    best = rows[:top]
    od = P / 'footage' / '_sheets'
    od.mkdir(parents=True, exist_ok=True)
    print(
        f'{src.name}：{dur}s，切点 {len(cuts)} 个，分成 {len(shots)} 段，列出前 {len(best)} 个候选（分数：清晰 .35 + 亮度 .25 + 运动 .25 + 时长 .15；不足 2 秒减半）'
    )
    for k, r in enumerate(best, 1):
        print(
            f"#{k:<2} {r['shot']:7} {tc(r['in'])}–{tc(r['out'])}  {r['seconds']:5.1f}s  分 {r['score']:.2f}（清晰 {r['sharp']:.2f} 亮度 {r['light']:.2f} 运动 {r['motion']:.2f} 时长 {r['length']:.2f}）  \"in\":{r['in']},\"out\":{r['out']}"
        )
    times = []
    labels = []
    for k, r in enumerate(best, 1):
        for lab, t in (('in', r['in'] + 0.1), ('mid', (r['in'] + r['out']) / 2), ('out', r['out'] - 0.1)):
            times.append(t)
            labels.append(f'#{k} {lab}')
    contact_sheet(src, times, od / f'{src.stem}_pick.jpg', cols=3, w=400, labels=labels)
    json.dump(
        {'source': src.name, 'candidates': best}, open(od / f'{src.stem}_pick.json', 'w'), ensure_ascii=False, indent=1
    )
    print(
        f'联系表 footage/_sheets/{src.stem}_pick.jpg（每行一个候选：入点、中间、出点）。这是机器打分，选哪段还要看内容；台账没有改动。'
    )


def credits_file(name):
    A = assets()
    if not A:
        return
    L = ['素材来源与授权（由 assets.json 生成）', '成片：' + name, '']
    for a in A:
        L += [
            f"[{a['id']}] {'视频' if a['type'] == 'video' else '图片'}  {a.get('title', '')}",
            f"  文件：{a['file']}"
            + (
                f"  用到的片段：{a['clip']['sig'][1] if 'clip' in a and isinstance(a.get('in'), str) else a.get('in', 0)}–{a['clip']['sig'][2] if 'clip' in a and isinstance(a.get('out'), str) else a.get('out', '')} 秒"
                if a['type'] == 'video'
                else ''
            ),
            f"  作者：{a.get('creator', '')}",
            f"  来源：{a.get('source', '')}",
            f"  依据：{BASIS.get(a.get('usage_basis'), a.get('usage_basis'))}"
            + (f"（{a['proof']}）" if a.get('proof') else ''),
            f"  署名：{a.get('credit', '不需要')}",
            '',
        ]
    (P / '素材来源与授权.txt').write_text('\n'.join(L), encoding='utf-8')


def cmd_study(path, th=0.3):
    """拉片：机器量切点和时长，输出镜头表骨架和联系表。只用来学结构和节奏，原片不进成片。"""
    src = Path(path)
    m = ffprobe(src)
    if not m:
        print('读不了', path)
        sys.exit(1)
    od = P / 'study' / src.stem
    od.mkdir(parents=True, exist_ok=True)
    cuts = [0.0] + [c for c in scene_cuts(src, th) if c > 0.2] + [m['duration']]
    shots = []
    for i, (a, b) in enumerate(zip(cuts, cuts[1:])):
        if b - a < 0.08:
            continue
        shots.append(
            {
                'id': f'S{len(shots) + 1:02d}',
                'start': round(a, 2),
                'end': round(b, 2),
                'seconds': round(b - a, 2),
                'size': '',
                'category': '',
                'camera': '',
                'frame': '',
                'onscreen_text': '',
                'audio': '',
                'rhythm': '',
                'note': '',
            }
        )
    d = [s['seconds'] for s in shots]
    prof = {
        'duration': m['duration'],
        'shots': len(shots),
        'avg_shot_seconds': round(sum(d) / len(d), 2),
        'median_shot_seconds': round(sorted(d)[len(d) // 2], 2),
        'cuts_per_minute': round(60 * (len(shots) - 1) / m['duration'], 1),
        'first_cut_at': shots[0]['end'],
        'shots_under_2s': sum(x < 2 for x in d),
        'shots_over_8s': sum(x > 8 for x in d),
    }
    for n in range(0, len(shots), 20):
        part = shots[n : n + 20]
        contact_sheet(
            src,
            [s['start'] + s['seconds'] * 0.5 for s in part],
            od / f'shots_{n // 20:02d}.jpg',
            cols=5,
            w=384,
            labels=[s['id'] for s in part],
        )
    json.dump(
        {
            'source': src.name,
            'profile': prof,
            'fields': {
                'size': '远/全/中/近/特',
                'category': '定场/主体/访谈/反应/插入/字卡/图表/资料',
                'camera': '固定/推/拉/摇/移/跟/手持',
                'rhythm': '钩子/铺垫/推进/转折/兑现/喘息/收束',
            },
            'shots': shots,
        },
        open(od / 'shots.json', 'w'),
        ensure_ascii=False,
        indent=1,
    )
    print(json.dumps(prof, ensure_ascii=False))
    print(f'镜头表骨架和联系表在 {od}/：start/end/seconds 是量出来的不要改；其余字段看联系表填，只写看得见的')
