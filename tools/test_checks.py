#!/usr/bin/env python3
"""check 各项判断的回归测试（不开浏览器，二十秒左右）：断言台账、叙事线、素材授权、整片扫描的几项、宣传线的镜头节奏、竖版短片。
每一项至少一条“该拦的拦住了”和一条“好的放过了”。整片扫描、动效扫描用手写的假数据喂进去，所以不用渲染。
改了 build.py 里任何一项检查的判断，先跑这个：python3 tools/test_checks.py（selftest.py 也会调它）。
需要 ffmpeg、numpy、soundfile。"""
import json, subprocess, sys, tempfile, textwrap
from pathlib import Path
R = Path(__file__).resolve().parent.parent; KIT = R / 'kit'; bad = []; TD = Path(tempfile.mkdtemp()); N = [0]
def ok(name, cond, why=''): print(('✓' if cond else '✗'), name, '' if cond else why); cond or bad.append(name)

SCRIPT = [{'id': 'a0', 'ch': '一', 'vo': '轴承为什么能省力？', 'beat': '钩子', 'ask': '省力'},
          {'id': 'a1', 'ch': '一', 'vo': '先看一个滚动的轮子。', 'beat': '铺垫'},
          {'id': 'a2', 'ch': '二', 'vo': '原来滚动比滑动省下九成的力。', 'beat': '揭示'},
          {'id': 'a3', 'ch': '二', 'vo': '这就是轴承省力的秘密。', 'beat': '回扣', 'answer': '省力'}]
DIRECTION = {'logline': '一个轮子讲清轴承为什么省力', 'structure': '拆解', 'angle': '讲解员', 'hook_type': '反常', 'callback': '省力', 'alternatives': ['B', 'C']}

def project(brief=None, script=None, facts=None, short=None, assets=None, files=None):
    """一个最小项目：每句旁白配一段 1.6 秒的音频（时间轴要量时长），回听记录都填好，不让“配音回听”干扰别的检查。"""
    import numpy as np, soundfile as sf
    N[0] += 1; P = TD / f'p{N[0]}'; (P / 'audio').mkdir(parents=True)
    script = SCRIPT if script is None else script
    (P / 'brief.json').write_text(json.dumps({'title': f'测试{N[0]}', **(brief or {})}, ensure_ascii=False), encoding='utf-8')
    (P / 'script.json').write_text(json.dumps(script, ensure_ascii=False), encoding='utf-8')
    if facts is not None: (P / 'facts.json').write_text(json.dumps(facts, ensure_ascii=False), encoding='utf-8')
    if short is not None: (P / 'short.json').write_text(json.dumps(short, ensure_ascii=False), encoding='utf-8')
    if assets is not None: (P / 'assets.json').write_text(json.dumps(assets, ensure_ascii=False), encoding='utf-8')
    for k, v in (files or {}).items(): (P / k).parent.mkdir(parents=True, exist_ok=True); (P / k).write_bytes(v)
    t = np.arange(int(44100 * 1.6)) / 44100; y = .3 * np.sin(2 * np.pi * 330 * t) * (t > .1) * (t < 1.4)
    for l in script + (short or []):
        if not l.get('silent') and l.get('id'): sf.write(P / 'audio' / f"{l['id']}.wav", y, 44100)
    return P

def run(P, code):
    """在项目目录里 import build，跑一段代码，代码最后用 out(...) 交回结果。"""
    pre = f"import sys, json; sys.argv = ['build.py']; sys.path.insert(0, {str(KIT)!r}); import build as B\nout = lambda x: print('@@' + json.dumps(x, ensure_ascii=False))\n"
    r = subprocess.run([sys.executable, '-c', pre + textwrap.dedent(code)], cwd=P, capture_output=True, text=True)
    line = next((l for l in r.stdout.splitlines() if l.startswith('@@')), None)
    if not line: return {'error': (r.stdout + r.stderr)[-600:]}
    return json.loads(line[2:])
def has(lst, s): return any(s in x for x in lst)
def check(P, fn, arg='tl'):
    return run(P, f"tl, total = B.timeline(); f, w = B.{fn}({arg}); out({{'f': f, 'w': w}})")

# ---------- 断言台账 ----------
V = lambda **k: {'claim': '滚动比滑动省力', 'status': 'verified', 'source': 'https://example.org/a', 'where': ['a2'], **k}
r = check(project(), 'facts_check'); ok('台账：没有 facts.json 不通过', has(r.get('f', []), '没有 facts.json'), r)
r = check(project(facts=[V(status='todo')]), 'facts_check'); ok('台账：还是 todo 的说法不通过', has(r.get('f', []), 'todo'), r)
r = check(project(facts=[V(source='《机械原理》第三章')]), 'facts_check'); ok('台账：标了已核实但来源不是网址，不通过', has(r.get('f', []), '不是网址'), r)
r = check(project(facts=[V(tier='公司自述')]), 'facts_check'); ok('台账：公司自述标成已核实，不通过', has(r.get('f', []), '公司自述'), r)
r = check(project(facts=[V(tier='第三方报告', status='inferred', note='')]), 'facts_check'); ok('台账：第三方报告没写机构和口径，不通过', has(r.get('f', []), '第三方报告'), r)
r = check(project(facts=[V(where=['a9'])]), 'facts_check'); ok('台账：指向不存在的句子，不通过', has(r.get('f', []), 'a9'), r)
r = check(project(brief={'tiers_required': True}, facts=[V()]), 'facts_check'); ok('台账：企业题材要求填 tier，没填不通过', has(r.get('f', []), 'tier'), r)
r = check(project(facts=[V(where=['a1'])]), 'facts_check'); ok('台账：带数字的句子没有事实指向，提醒', has(r.get('w', []), 'a2 里有数字'), r)
r = check(project(script=SCRIPT[:3] + [{**SCRIPT[3], 'vo': '它是最省力的办法。'}], facts=[V()]), 'facts_check'); ok('台账：“最”字没有已核实的事实支撑，提醒', has(r.get('w', []), '最'), r)
r = check(project(facts=[V()]), 'facts_check'); ok('台账：齐全的台账通过，不报提醒', r.get('f') == [] and r.get('w') == [], r)

# ---------- 叙事线 ----------
r = check(project(), 'story_check'); ok('叙事线：没写 direction，提醒', has(r.get('w', []), 'direction'), r)
r = check(project(brief={'direction': {**DIRECTION, 'logline': ''}}), 'story_check'); ok('叙事线：logline 空着，不通过', has(r.get('f', []), 'logline'), r)
r = check(project(brief={'direction': DIRECTION}, script=SCRIPT[:3] + [{k: v for k, v in SCRIPT[3].items() if k != 'answer'}]), 'story_check'); ok('叙事线：开头问了结尾没答，不通过', has(r.get('f', []), '没有回答'), r)
S2 = [{**SCRIPT[0], 'ask': None, 'answer': '省力'}] + SCRIPT[1:3] + [{**SCRIPT[3], 'answer': None, 'ask': '省力'}]
r = check(project(brief={'direction': DIRECTION}, script=S2), 'story_check'); ok('叙事线：先答后问，不通过', has(r.get('f', []), '顺序反了'), r)
r = check(project(brief={'direction': {**DIRECTION, 'callback': '为什么'}}), 'story_check'); ok('叙事线：回扣词结尾没出现，提醒', has(r.get('w', []), '回扣词'), r)
r = check(project(brief={'direction': DIRECTION}, script=[{**s, 'beat': '推进'} if s['id'] == 'a2' else s for s in SCRIPT]), 'story_check'); ok('叙事线：中段没有转折揭示，提醒', has(r.get('w', []), '中段'), r)
r = check(project(brief={'direction': DIRECTION}), 'story_check'); ok('叙事线：问答成对、有揭示、结尾回扣，通过', r.get('f') == [] and not has(r.get('w', []), '回扣') and not has(r.get('w', []), '中段'), r)

# ---------- 素材授权 ----------
IMG = {'img.png': b'\x89PNG'}
A = lambda **k: {'id': 'p1', 'type': 'image', 'file': 'img.png', 'usage_basis': 'own', 'source': '自己拍的，2026-10', 'creator': '本人', **k}
r = check(project(assets=[A(usage_basis='网上找的')], files=IMG), 'assets_check', 'set()'); ok('素材：依据不在允许范围，不通过', has(r.get('f', []), 'usage_basis'), r)
r = check(project(assets=[A(usage_basis='cc-by')], files=IMG), 'assets_check', 'set()'); ok('素材：CC BY 没写署名，不通过', has(r.get('f', []), 'credit'), r)
r = check(project(assets=[A(usage_basis='licensed', credit='某公司')], files=IMG), 'assets_check', 'set()'); ok('素材：已获授权但没写凭据，不通过', has(r.get('f', []), 'proof'), r)
r = check(project(assets=[A(usage_basis='excerpt', credit='某台', source='某台节目')], files=IMG), 'assets_check', 'set()'); ok('素材：引用片段没写下载网址，不通过', has(r.get('f', []), '网页地址'), r)
r = check(project(assets=[A()], files=IMG), 'assets_check', "{'p1', 'x9'}"); ok('素材：画面用了台账外的片段，不通过', has(r.get('f', []), 'x9'), r)
r = check(project(assets=[A(file='nope.png')]), 'assets_check', 'set()'); ok('素材：文件不存在，不通过', has(r.get('f', []), '不存在'), r)
r = check(project(assets=[A()], files=IMG), 'assets_check', "{'p1'}"); ok('素材：自有图片、台账齐全，通过', r.get('f') == [], r)

# ---------- 整片扫描（假数据：每 0.1 秒一帧，tx 是 [字, x0, y0, x1, y1, 透明度, 字号]） ----------
def scan(texts, total=12, still=False, W=1920, H=1080):
    """texts：[(字, t0, t1, 框, 字号)]。还原 window.scan 的返回格式。"""
    fr = []
    for i in range(int(total * 10)):
        t = round(i * .1, 2); tx = [[s, *b, 1.0, px] for s, a, z, b, px in texts if a <= t < z]
        fr.append({'t': t, 'tx': tx, 'df': 0.0 if still else (.5 if i % 3 else .3)})
    return {'frames': fr, 'events': [], 'used': {}, 'miss': [], 'W': W, 'H': H, 'total': total}
def scan_case(texts, **k):
    P = project(); (P / 'sc.json').write_text(json.dumps(scan(texts, **k), ensure_ascii=False), encoding='utf-8')
    return run(P, "F, W = B.scan_check(json.load(open('sc.json'))); out({'f': F, 'w': W})")
BOX = [200, 300, 900, 360]
r = scan_case([('滚动比滑动省力得多', .2, .7, BOX, 56)]); ok('扫描：一行字只停 0.5 秒，阅读时长不通过', has(r.get('f', {}).get('read', []), '滚动比滑动'), r)
r = scan_case([('滚动比滑动省力得多', .2, 8, [1700, 300, 2300, 360], 56)]); ok('扫描：字一直被裁在画面外，出画不通过', has(r.get('f', {}).get('frame', []), '滚动比滑动'), r)
r = scan_case([('注：示意图', .2, 8, BOX, 22)]); ok('扫描：22 像素的小字，提醒', has(r.get('w', {}).get('small', []), '示意图'), r)
r = scan_case([('字幕带里的说明', .2, 8, [700, 980, 1200, 1030], 40)]); ok('扫描：别的字进了底部字幕带，提醒', has(r.get('w', {}).get('subzone', []), '字幕带里'), r)
r = scan_case([('甲乙丙丁', .2, 8, BOX, 56), ('戊己庚辛', .2, 8, [400, 310, 1000, 370], 56)]); ok('扫描：两段字压在一起，提醒', has(r.get('w', {}).get('overlap', []), '甲乙丙丁'), r)
r = scan_case([('滚动比滑动省力得多', .2, 11, BOX, 56)], still=True); ok('扫描：画面 4 秒以上不动，提醒', len(r.get('w', {}).get('dead', [])) > 0, r)
r = scan_case([('滚动比滑动省力得多', 3, 11, BOX, 56)]); ok('扫描：3 秒才出第一个内容，开场提醒', len(r.get('w', {}).get('hook', [])) > 0, r)
r = scan_case([('滚动比滑动省力得多', .2, 8, BOX, 56)]); ok('扫描：大字、停够、在画面里，通过', not any(r.get('f', {'x': 1}).values()) and not any(r.get('w', {}).get(k) for k in ('small', 'subzone', 'overlap', 'hook')), r)

# ---------- 宣传线的镜头节奏（假的逐帧运动量：mv 是相邻两帧变了多少） ----------
def pace_case(cuts, total, brief):
    P = project(brief={'mode': 'promo', 'packs': ['promo'], 'look': 'bold', 'product': {'kind': 'virtual'}, **brief}, script=[{'id': 'p0', 'ch': '一', 'silent': True, 'dur': total}])
    # 网格从 0.9 秒（第一句开始的那一拍）起；shot_cuts 把“变了的那一帧的下一帧”记成切点，所以突变放在切点前一帧
    cuts = [.9 + c for c in cuts]; fr = [{'t': round(i / 30, 4), 'mv': .5 if any(abs(i / 30 - (c - 1 / 30)) < .5 / 30 for c in cuts) else .01, 'ms': 10} for i in range(int((total + 1) * 30))]
    (P / 'mo.json').write_text(json.dumps({'frames': fr, 'det': []}), encoding='utf-8')
    return run(P, "tl, total = B.timeline(); st, f, w = B.pace_check(json.load(open('mo.json')), tl); out({'f': f, 'w': w, 'n': st['n'], 'off': st['off']})")
r = pace_case([3, 9], 12, {'slogan': '一句话'}); ok('镜头节奏：12 秒只有三个镜头、最长 6 秒，提醒', has(r.get('w', []), '平均一个镜头') and has(r.get('w', []), '超过'), r)
r = pace_case([1, 2, 3.37, 4, 5.12, 6, 7, 8.4, 9, 10, 11], 12, {'bpm': 120, 'slogan': '一句话'}); ok('镜头节奏：三成的刀没切在拍点上，提醒（一两刀不报，阈值 15%）', has(r.get('w', []), '不在拍点上'), r)
r = pace_case([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], 12, {'bpm': 120}); ok('镜头节奏：没写口号，提醒', has(r.get('w', []), 'slogan'), r)
r = pace_case([1, 1.5, 3, 3.5, 4, 6, 6.5, 7, 9, 9.5, 10, 11], 12, {'bpm': 120, 'slogan': '一句话'}); ok('镜头节奏：短而有快慢、都在拍点上，不报节奏问题', not has(r.get('w', []), '平均') and not has(r.get('w', []), '拍点') and not has(r.get('w', []), '差不多'), r)

# ---------- 竖版短片 ----------
SH = [{'id': f'v{i}', 'vo': '这一段讲轴承的原理。', 'src': [[s, 0], [s, 1]], 'asr_ok': True} for i, s in enumerate(['a0', 'a1', 'a2', 'a3', 'a0', 'a1'])]
lint = lambda P: run(P, "tl, total = B.timeline(); f, w = B.short_lint(tl); out({'f': f, 'w': w})")
r = lint(project(short=[{**SH[0], 'src': [['a9', 0], ['a9', 1]]}] + SH[1:])); ok('竖版稿：src 指向不存在的句子，不通过（以前直接崩）', has(r.get('f', []), 'a9'), r)
r = lint(project(short=[{**SH[0], 'id': 'a1'}] + SH[1:])); ok('竖版稿：和正片句子同名（配音会互相覆盖），不通过', has(r.get('f', []), '同名'), r)
r = lint(project(short=[{**SH[0], 'src': [['a2', .8], ['a2', .1]]}] + SH[1:])); ok('竖版稿：src 窗口是倒的，不通过', has(r.get('f', []), '倒的'), r)
r = lint(project(short=SH[:3])); ok('竖版稿：只有三句，提醒', has(r.get('w', []), '3 句'), r)
r = lint(project(short=SH)); ok('竖版稿：六句、窗口都对、配音都在，通过', r.get('f') == [] and r.get('w') == [], r)
def short_case(short, texts, brief=None, facts=None):
    P = project(brief=brief, short=short, facts=facts); (P / 'sc.json').write_text(json.dumps(scan(texts, total=20), ensure_ascii=False), encoding='utf-8')
    return run(P, """
        import json; tl, total = B.timeline()
        W = json.load(open('audio/words.json')) if (B.P / 'audio/words.json').exists() else {}
        for l in tl + json.load(open('short.json')): W[l['id']] = {'text': l.get('tts') or l['vo'], 'ct': [], 'ok': True, 'score': 1, 'diffs': [], 'wav': B.wav_sha(l['id'])}
        json.dump(W, open('audio/words.json', 'w'), ensure_ascii=False)
        segs, stot = B.short_plan(tl); rep = B.short_check(tl, json.load(open('sc.json')), segs, stot); out({k: {'f': f, 'w': w} for k, (f, w) in rep.items()})""")
r = short_case([{**SH[0], 'vo': '滚动轴承里的滚珠把滑动摩擦变成滚动摩擦所以转起来省力得多这就是它的原理也是工程师把它装进每一台机器的理由'}] + SH[1:], [])
ok('竖版：一块字幕超过三行放不下，不通过', has(r.get('竖版字幕', {}).get('f', []), '最多 39 字'), r)
r = short_case(SH, [], brief={'must_show': ['AI 合成配音']}); ok('竖版：必须出现的声明不在竖版里，不通过', has(r.get('竖版必须出现的声明', {}).get('f', []), 'AI 合成配音'), r)
r = short_case(SH, [('AI 合成配音', 0, 20, [100, 900, 700, 960], 48)], brief={'must_show': ['AI 合成配音']}); ok('竖版：声明一直在画面上且缩小后够大，通过', r.get('竖版必须出现的声明', {}).get('f') == [], r)
r = short_case(SH, [('注：示意图，未按比例', 0, 20, BOX, 32)]); ok('竖版：正片 32 像素的字缩进竖框只剩 18 像素，提醒', has(r.get('竖版小字', {}).get('w', []), '18 像素'), r)
r = short_case([{**SH[0], 'src': [['a0', 0], ['a3', 1]]}] + SH[1:], []); ok('竖版：一句配了整条正片，画面快进，提醒', has(r.get('竖版画面窗口', {}).get('w', []), '倍快进'), r)
r = short_case([{**SH[0], 'vo': '滚动摩擦只有滑动的十分之一，省下九成的力。'}] + SH[1:], []); ok('竖版：旁白里的数字没有出处，提醒', has(r.get('竖版断言', {}).get('w', []), 'v0'), r)

# short render 的门禁（拦下时还没开浏览器）
def short_render(P): r = subprocess.run([sys.executable, str(KIT / 'build.py'), 'short', 'render', 'x'], cwd=P, capture_output=True, text=True); return r.returncode, r.stdout + r.stderr
P = project(short=SH); rc, o = short_render(P); ok('竖版出片：没跑 short check 不出', rc == 1 and '还没跑 short check' in o, o[-300:])
run(P, "fp, m = B.fingerprint('all'); json.dump({'fails': 0, 'warns': 0, 'fp': fp, 'files': m}, open('short_check_report.json', 'w'))")
(P / 'short.json').write_text(json.dumps([{**SH[0], 'vo': '改过的一句。'}] + SH[1:], ensure_ascii=False), encoding='utf-8')
rc, o = short_render(P); ok('竖版出片：short check 之后改了 short.json，不出并说出是哪个文件', rc == 1 and 'short.json' in o, o[-300:])
P = project(short=[{**SH[0], 'src': [['a9', 0], ['a9', 1]]}] + SH[1:]); rc, o = short_render(P); ok('竖版出片：稿子里的 src 指错了，先拦下', rc == 1 and 'a9' in o, o[-300:])

print(f'\n{len(bad)} 项不通过' if bad else '\n检查逻辑测试全部通过')
import shutil; shutil.rmtree(TD, ignore_errors=True); sys.exit(1 if bad else 0)
