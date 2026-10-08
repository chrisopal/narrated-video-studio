#!/usr/bin/env python3
"""配音回听：离线语音识别把每句配音转成文字，按拼音和稿子比对，并写出逐字时间。
在项目目录运行：python3 ../kit/asr.py [--threshold 0.92]
读 script.json / short.json（朗读文本取 tts 字段，没有就取 vo），音频在 audio/<id>.wav
写 audio/words.json：{id:{heard, score, diffs, ct}}   ct = 朗读文本每个字开始发音的秒数（相对该句音频开头）
某句听起来没问题但识别总是差一点：在稿子那一句加 "asr_ok": true（表示人已经听过确认）。
退出码：0 全部通过；1 有句子没通过；2 没法检查（模型或依赖缺失）。
模型：<kit>/models/sherpa-onnx-paraformer-zh-2023-09-14（没有就按 SKILL.md 里的命令下载）。"""
import json, sys, re, difflib
from pathlib import Path
KIT = Path(__file__).parent; P = Path.cwd()
MODEL = KIT / 'models' / 'sherpa-onnx-paraformer-zh-2023-09-14'
try:
    import numpy as np, soundfile as sf, sherpa_onnx
    from pypinyin import lazy_pinyin
    assert (MODEL / 'model.int8.onnx').exists(), f'缺少识别模型 {MODEL}'
except Exception as e:
    print('回听没法运行：', e); sys.exit(2)
KEEP = re.compile(r'[0-9A-Za-z一-鿿]')
FOLD = {'zh': 'z', 'ch': 'c', 'sh': 's'}   # 平翘舌、前后鼻音识别常混，不算读错

def key(ch):
    p = lazy_pinyin(ch)[0].lower()
    for a, b in FOLD.items():
        if p.startswith(a): p = b + p[2:]
    return re.sub(r'ng$', 'n', p)

def check(rec, text, wav):
    x, sr = sf.read(wav, dtype='float32'); x = x if x.ndim == 1 else x.mean(1)
    pad = np.zeros(int(sr * .5), dtype='float32'); st = rec.create_stream(); st.accept_waveform(sr, np.concatenate([pad, x, pad])); rec.decode_stream(st)
    toks = [(t.replace('@@', ''), ts - .5) for t, ts in zip(st.result.tokens, st.result.timestamps) if KEEP.search(t)]
    idx = [i for i, c in enumerate(text) if KEEP.match(c)]; exp = [key(text[i]) for i in idx]; got = [key(t) for t, _ in toks]
    sm = difflib.SequenceMatcher(None, exp, got, autojunk=False); score = sm.ratio(); diffs = []; known = {}
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == 'equal':
            for k in range(i2 - i1): known[idx[i1 + k]] = max(0, toks[j1 + k][1])
        else: diffs.append({'稿子': ''.join(text[idx[i]] for i in range(i1, i2)), '听到': ''.join(toks[j][0] for j in range(j1, j2))})
    dur = len(x) / sr; pts = sorted(known.items()); ct = []
    xs = [-1] + [p[0] for p in pts] + [len(text)]; ys = [pts[0][1] if pts else 0] + [p[1] for p in pts] + [dur]
    for i in range(len(text)): ct.append(round(float(np.interp(i, xs, ys)), 3))
    return {'heard': ''.join(t for t, _ in toks), 'score': round(score, 3), 'diffs': diffs, 'ct': ct, 'matched': round(len(known) / max(1, len(idx)), 3)}

if __name__ == '__main__':
    th = float(sys.argv[sys.argv.index('--threshold') + 1]) if '--threshold' in sys.argv else .92
    rec = sherpa_onnx.OfflineRecognizer.from_paraformer(paraformer=str(MODEL / 'model.int8.onnx'), tokens=str(MODEL / 'tokens.txt'), num_threads=4)
    lines = json.load(open(P / 'script.json')) + (json.load(open(P / 'short.json')) if (P / 'short.json').exists() else [])
    lines = [l for l in lines if not l.get('silent') and (l.get('tts') or l.get('vo'))]   # 无旁白段落不用回听
    out = {}; bad = 0
    for l in lines:
        text = l.get('tts') or l['vo']; r = check(rec, text, P / 'audio' / f"{l['id']}.wav"); r['text'] = text
        ok = r['score'] >= th or l.get('asr_ok'); r['ok'] = bool(ok); bad += not ok; out[l['id']] = r
        print(('通过 ' if r['score'] >= th else '人工确认 ' if ok else '不通过 ') + f"{l['id']:4} {r['score']:.2f}", '' if not r['diffs'] else '差异：' + '；'.join(f"{d['稿子'] or '∅'}→{d['听到'] or '∅'}" for d in r['diffs']))
    json.dump(out, open(P / 'audio' / 'words.json', 'w'), ensure_ascii=False, indent=1)
    print(f'回听：{len(lines) - bad}/{len(lines)} 句通过'); sys.exit(1 if bad else 0)
