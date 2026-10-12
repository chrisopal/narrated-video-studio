#!/usr/bin/env python3
"""出片门禁的回归测试（不开浏览器，十几秒）：check 报告、silent.mp4、mix.wav、封面都要和当前输入是同一版，final 才放行；
回听要绑定音频；配音缓存按内容认。2026-10-09 评审里复现过的几个漏洞，每个都在这里有一条用例。
    python3 tools/test_gates.py          selftest.py 也会调它
需要 ffmpeg、numpy、soundfile。"""
import json, shutil, subprocess, sys, tempfile, textwrap
from pathlib import Path
R = Path(__file__).resolve().parent.parent; KIT = R / 'kit'; bad = []
def ok(name, cond, why=''): print(('✓' if cond else '✗'), name, '' if cond else why); cond or bad.append(name)

def run(proj, *a):
    r = subprocess.run([sys.executable, str(KIT / 'build.py'), *a], cwd=proj, capture_output=True, text=True); return r.returncode, r.stdout + r.stderr
def py(proj, code):
    """在项目目录里 import build，跑一小段代码，返回它 print 的东西。"""
    r = subprocess.run([sys.executable, '-c', f"import sys; sys.argv=['build.py']; sys.path.insert(0, {str(KIT)!r}); import build as B\n" + textwrap.dedent(code)], cwd=proj, capture_output=True, text=True)
    if r.returncode: raise RuntimeError(r.stderr[-800:])
    return r.stdout
def ff(*a): subprocess.run(['ffmpeg', '-y', '-v', 'error', *a], check=True)
def tone(path, f, d=1.6):
    import numpy as np, soundfile as sf
    t = np.arange(int(44100 * d)) / 44100; sf.write(path, .3 * np.sin(2 * np.pi * f * t) * (t > .1) * (t < d - .2), 44100)

def make(T):
    """一个能 final 的最小项目：一句旁白、一段音频、回听记录、check 报告、母版、混音、封面都对得上。"""
    P = T / 'good'; (P / 'audio').mkdir(parents=True)
    (P / 'brief.json').write_text(json.dumps({'title': '门禁测试', 'sfx': False}), encoding='utf-8')
    (P / 'script.json').write_text(json.dumps([{'id': 'a0', 'ch': '一', 'vo': '这是一句测试。'}], ensure_ascii=False), encoding='utf-8')
    (P / 'scenes.js').write_text("window.FILM={theme:'space',chrome:'none',scenes(t){}};\n", encoding='utf-8')
    (P / 'facts.json').write_text('[]', encoding='utf-8')
    tone(P / 'audio/a0.wav', 440)
    py(P, """
        import json; w = B.wav_sha('a0')
        json.dump({'a0': {'text': '这是一句测试。', 'ct': [.1 * i for i in range(7)], 'ok': True, 'score': 1.0, 'diffs': [], 'wav': w}}, open(B.P / 'audio/words.json', 'w'), ensure_ascii=False)""")
    rc, out = run(P, 'timeline'); total = float(out.split('正片时长')[1].split()[0])
    py(P, """
        import json; fp, m = B.fingerprint('all'); json.dump({'fails': 0, 'warns': 0, 'fp': fp, 'files': m, 'detail': {}}, open(B.P / 'check_report.json', 'w'))""")
    ff('-f', 'lavfi', '-i', f'color=c=navy:s=1920x1080:r=30:d={total}', '-pix_fmt', 'yuv420p', str(P / 'silent.mp4'))
    ff('-f', 'lavfi', '-i', f'sine=f=220:d={total}', '-ar', '44100', str(P / 'mix.wav'))
    ff('-f', 'lavfi', '-i', 'color=c=white:s=1920x1080:d=0.04', '-frames:v', '1', str(P / '封面_横版.png'))
    py(P, "B.remember('silent.mp4', 'pic'); B.remember('mix.wav', 'snd'); B.remember('封面_横版.png', 'pic')")
    return P, total

def case(T, name, mutate):
    P = T / name; shutil.copytree(T / 'good', P); mutate(P); return P

with tempfile.TemporaryDirectory() as td:
    T = Path(td); G, total = make(T)
    rc, out = run(G, 'final', '成片'); ok('输入都对得上时 final 放行，并回读成片', rc == 0 and (G / '成片.mp4').exists(), out[-300:])

    P = case(T, 'facts', lambda P: (P / 'facts.json').write_text('[{"claim":"新加的一条","status":"todo"}]', encoding='utf-8'))
    rc, out = run(P, 'final', 'x'); ok('check 之后改了断言台账，final 拦下并说出是哪个文件', rc == 1 and 'facts.json' in out, out[-300:])

    P = case(T, 'script', lambda P: (P / 'script.json').write_text(json.dumps([{'id': 'a0', 'ch': '一', 'vo': '这是一句测试。', 'hold': 2}], ensure_ascii=False), encoding='utf-8'))
    rc, out = run(P, 'final', 'x'); ok('check 之后改了稿子（只改 hold，scenes.js 没动），final 拦下', rc == 1 and 'script.json' in out, out[-300:])

    P = case(T, 'wav', lambda P: tone(P / 'audio/a0.wav', 660))
    rc, out = run(P, 'final', 'x'); ok('换掉同名配音文件，final 拦下', rc == 1 and 'a0.wav' in out, out[-300:])
    out = py(P, "tl, _ = B.timeline(); print(B.asr_check(tl)[0]); print('ct' in tl[0])")
    ok('换掉同名配音文件，回听记录作废', '换过' in out, out[-300:])
    ok('换掉同名配音文件，旧的逐字时间不再用', out.strip().endswith('False'), out[-200:])

    def legacy(P):
        W = json.load(open(P / 'audio/words.json')); W['a0'].pop('wav'); json.dump(W, open(P / 'audio/words.json', 'w'), ensure_ascii=False)
    P = case(T, 'legacy_asr', legacy); out = py(P, "tl, _ = B.timeline(); print(B.asr_check(tl)[0])")
    ok('旧版回听记录（没有音频指纹）要求重跑回听', '没有音频指纹' in out, out[-300:])

    P = case(T, 'scenes', lambda P: (P / 'scenes.js').write_text("window.FILM={theme:'lab',chrome:'none',scenes(t){}};\n", encoding='utf-8'))
    rc, out = run(P, 'final', 'x'); ok('改了 scenes.js：check 报告、母版、封面都过期', rc == 1 and 'silent.mp4 生成之后输入改过' in out and '封面' in out, out[-400:])

    P = case(T, 'swap', lambda P: ff('-f', 'lavfi', '-i', f'color=c=red:s=1920x1080:r=30:d={total}', '-pix_fmt', 'yuv420p', str(P / 'silent.mp4')))
    rc, out = run(P, 'final', 'x'); ok('母版在 render 之后被换过，final 拦下', rc == 1 and '被换过' in out, out[-300:])

    P = case(T, 'nofp', lambda P: (P / 'check_report.json').write_text('{"fails":0,"warns":0}'))
    rc, out = run(P, 'final', 'x'); ok('旧格式的 check 报告（没有指纹）不认', rc == 1 and '没有版本指纹' in out, out[-300:])

    P = case(T, 'nostate', lambda P: (P / '_build_state.json').unlink())
    rc, out = run(P, 'final', 'x'); ok('母版和混音没有版本记录，不认', rc == 1 and '没有版本记录' in out, out[-300:])

    def short_master(P):
        ff('-f', 'lavfi', '-i', f'color=c=navy:s=1920x1080:r=30:d={max(.5, total - 2)}', '-pix_fmt', 'yuv420p', str(P / 'silent.mp4')); py(P, "B.remember('silent.mp4', 'pic')")
    P = case(T, 'short', short_master)
    rc, out = run(P, 'final', 'x'); ok('母版比正片短两秒：门禁过了，成片回读时拦下', rc == 1 and '回读不对' in out and '已出' not in out, out[-300:])

    P = case(T, 'force', lambda P: (P / 'facts.json').write_text('[{"claim":"x","status":"todo"}]', encoding='utf-8'))
    rc, out = run(P, 'final', 'x', '--force'); ok('--force 照样出片，但把没过的项列出来', rc == 0 and 'facts.json' in out and '--force' in out, out[-300:])

# 配音缓存：按文字、模型、声音、语速、语气认，不按 mp3 在不在
with tempfile.TemporaryDirectory() as td:
    r = subprocess.run([sys.executable, '-c', textwrap.dedent(f"""
        import sys, os; sys.path.insert(0, {str(KIT)!r}); import tts_cache as C
        from pathlib import Path
        c = C.load(); k1 = C.key('openrouter', 'm', 'Charon', '', '平稳', '第一句'); k2 = C.key('openrouter', 'm', 'Charon', '', '平稳', '第一句改了')
        out = []
        out.append(C.decide(c, 'a0', k1)[0])                                    # 没有 mp3：要配
        C.part('a0').write_bytes(b'x' * 3000); C.commit(c, 'a0', k1)
        out.append(C.decide(C.load(), 'a0', k1)[0])                             # 一样：跳过
        out.append(C.decide(C.load(), 'a0', k2)[0])                             # 文字改了：要配
        out.append(C.decide(C.load(), 'a0', C.key('openrouter', 'm', 'Kore', '', '平稳', '第一句'))[0])   # 声音改了：要配
        Path('a0.mp3').write_bytes(b'y' * 3000); out.append(C.decide(C.load(), 'a0', k1)[0])   # mp3 被换过：要配
        Path('b0.mp3').write_bytes(b'z' * 3000); need, why = C.decide(C.load(), 'b0', k1); out.append(need); out.append('旧版' in why)   # 旧脚本配的：跳过但说明
        out.append(not C.part('a0').exists())
        print(out)""")], cwd=td, capture_output=True, text=True)
    ok('配音缓存：没有→配、一样→跳过、文字/声音改了→重配、mp3 被换→重配、旧记录→跳过并说明', r.stdout.strip() == '[True, False, True, True, True, False, True, True]', (r.stdout + r.stderr)[-300:])

print(f'\n{len(bad)} 项不通过' if bad else '\n门禁测试全部通过'); sys.exit(1 if bad else 0)
