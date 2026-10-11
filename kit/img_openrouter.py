#!/usr/bin/env python3
"""用 OpenRouter 的图像模型生成画面（人物定妆图、逐场插画）。密钥读法同 tts_openrouter.py，不写在命令里。

模型：用户指定用 GPT Image（OpenRouter 上是 openai/gpt-5.4-image-2，2026-10 列表里有，本工具还没用它实测过，第一张先看图）；
  不要用 google/gemini-3-pro-image（《浮生六记｜烟火神仙》用过：多画出不该有的人、把四十岁画成七十岁，用户不再用它）。
单张：
  python3 img_openrouter.py one openai/gpt-5.4-image-2 "提示词" 输出.png [--aspect 16:9] [--ref 参考图.png ...]
批量（jobs.json 是列表，每项 {"id","prompt","refs":[...],"aspect":"16:9","model":可选}）：
  python3 img_openrouter.py run jobs.json 输出目录 [--model 模型] [--jobs 3] [--budget 150] [--redo]
  已经有 <id>.png 的跳过；--budget 秒数到了就不再开新任务（在用户电脑上单次调用有时限，分批跑）。
  每张的提示词、参考图、模型、花费记进 输出目录/_log.jsonl；有失败时退出码 1。
人物一致：先出定妆图，之后每场都把定妆图当 --ref / refs 传进去，并在提示词里写“与参考图同一人”。
年龄要写死：每场写清几岁，并写“不是老人、没有白发和深皱纹”这类反面描述；生病、悲伤会被模型画老。
人数要写死：“画面里只有两个人”；多出来的人用取景避开，不要指望每次重画。
画面里不要字：模型写的汉字常常是错的，字幕和原文卡由引擎画。
"""
import base64, concurrent.futures as cf, json, os, sys, time, urllib.request, urllib.error
from pathlib import Path
KIT = Path(__file__).resolve().parent
URL = 'https://openrouter.ai/api/v1/chat/completions'
NO_TEXT = ' Absolutely no text, no letters, no calligraphy, no seals, no signatures, no watermark anywhere in the image.'

def key():
    k = os.environ.get('OPENROUTER_API_KEY', '').strip()
    for p in (KIT.parent / 'openrouter_key.txt', KIT / 'openrouter_key.txt'):
        if not k and p.exists(): k = p.read_text().strip()
    if not k: sys.exit('没找到密钥：请把密钥存成 ' + str(KIT.parent / 'openrouter_key.txt'))
    return k

def _data_url(p):
    p = Path(p); ext = p.suffix.lower().lstrip('.') or 'png'
    return f'data:image/{"jpeg" if ext in ("jpg","jpeg") else ext};base64,' + base64.b64encode(p.read_bytes()).decode()

def gen(k, model, prompt, out, refs=(), aspect='16:9', size=None):
    content = [{'type': 'text', 'text': prompt + NO_TEXT}] + [{'type': 'image_url', 'image_url': {'url': _data_url(r)}} for r in refs]
    body = {'model': model, 'messages': [{'role': 'user', 'content': content}], 'modalities': ['image', 'text'],
            'image_config': {'aspect_ratio': aspect}, 'usage': {'include': True}}
    if size: body['image_config']['image_size'] = size
    req = urllib.request.Request(URL, data=json.dumps(body).encode(), headers={'Content-Type': 'application/json', 'Authorization': 'Bearer ' + k})
    t0 = time.time()
    try:
        with urllib.request.urlopen(req, timeout=170) as r: d = json.loads(r.read())
    except urllib.error.HTTPError as e:
        return False, f'HTTP {e.code} ' + e.read().decode('utf-8', 'ignore')[:300], 0
    except Exception as e:
        return False, str(e)[:300], 0
    cost = (d.get('usage') or {}).get('cost') or 0
    try:
        msg = d['choices'][0]['message']; url = msg['images'][0]['image_url']['url']
    except Exception:
        return False, '没有返回图片：' + json.dumps(d, ensure_ascii=False)[:300], cost
    raw = base64.b64decode(url.split(',', 1)[1])
    tmp = Path(str(out) + '.part'); tmp.write_bytes(raw); os.replace(tmp, out)
    return True, f'{len(raw)//1024} KB {time.time()-t0:.0f}s ${cost:.3f}', cost

def _opts(argv, name, default=None, many=False):
    vals = [argv[i + 1] for i, a in enumerate(argv[:-1]) if a == name]
    return vals if many else (vals[-1] if vals else default)

def main():
    a = sys.argv[1:]
    if not a or a[0] not in ('one', 'run'): print(__doc__); return
    k = key()
    if a[0] == 'one':
        model, prompt, out = a[1], a[2], a[3]
        ok, info, _ = gen(k, model, prompt, out, _opts(a, '--ref', many=True), _opts(a, '--aspect', '16:9'), _opts(a, '--size'))
        print(('ok ' if ok else 'FAIL ') + out + ' ' + info); sys.exit(0 if ok else 1)
    jobs = json.loads(Path(a[1]).read_text()); outdir = Path(a[2]); outdir.mkdir(parents=True, exist_ok=True)
    model = _opts(a, '--model', 'openai/gpt-5.4-image-2'); n = int(_opts(a, '--jobs', 3)); budget = float(_opts(a, '--budget', 150))
    redo = '--redo' in a; only = set(filter(None, (_opts(a, '--only', '') or '').split(',')))
    base = Path(a[1]).resolve().parent
    todo = [j for j in jobs if (not only or j['id'] in only) and (redo or not (outdir / f"{j['id']}.png").exists())]
    print(f'待生成 {len(todo)} 张（共 {len(jobs)}）', flush=True)
    t0 = time.time(); fails = []; spent = 0; log = open(outdir / '_log.jsonl', 'a')
    def one(j):
        refs = [str((base / r) if not Path(r).is_absolute() else r) for r in j.get('refs', [])]
        return j, gen(k, j.get('model', model), j['prompt'], outdir / f"{j['id']}.png", refs, j.get('aspect', '16:9'), j.get('size'))
    with cf.ThreadPoolExecutor(n) as ex:
        futs = set(); it = iter(todo)
        while True:
            while len(futs) < n and time.time() - t0 < budget:
                j = next(it, None)
                if j is None: break
                futs.add(ex.submit(one, j))
            if not futs: break
            done, futs = cf.wait(futs, return_when=cf.FIRST_COMPLETED)
            for f in done:
                j, (ok, info, cost) = f.result(); spent += cost or 0
                print(('ok   ' if ok else 'FAIL ') + j['id'] + ' ' + info, flush=True)
                log.write(json.dumps({'id': j['id'], 'ok': ok, 'info': info, 'model': j.get('model', model), 'prompt': j['prompt'], 'refs': j.get('refs', []), 'cost': cost, 'at': time.strftime('%F %T')}, ensure_ascii=False) + '\n')
                if not ok: fails.append(j['id'])
    left = len([j for j in jobs if not (outdir / f"{j['id']}.png").exists()])
    print(f'本批花费 ${spent:.3f}；失败 {len(fails)} {",".join(fails)}；还剩 {left} 张未生成', flush=True)
    sys.exit(1 if fails else 0)

if __name__ == '__main__': main()
