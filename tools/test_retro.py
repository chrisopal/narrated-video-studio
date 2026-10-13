#!/usr/bin/env python3
"""复盘分档的回归测试（几秒）：在一份临时拷贝的工坊里连着交付几条假片子，看轻复盘和完整复盘是不是按规矩轮换、待整理是不是攒起来又清掉。
不碰仓库里真的台账。selftest.py 会调它。"""
import json, shutil, subprocess, sys, tempfile
from pathlib import Path
R = Path(__file__).resolve().parent.parent; bad = []
def ok(name, cond, why=''): print(('✓' if cond else '✗'), name, '' if cond else why); cond or bad.append(name)

with tempfile.TemporaryDirectory() as td:
    T = Path(td); (T / 'kit').mkdir(); shutil.copy(R / 'kit/workshop.py', T / 'kit'); shutil.copy(R / 'kit/VERSION', T / 'kit'); shutil.copytree(R / 'templates', T / 'templates')
    reg = T / 'templates/registry.json'; D = json.loads(reg.read_text(encoding='utf-8')); D['retros'] = [{'date': '2026-10-13', 'film': None, 'kind': 'full'}]; D['pending'] = []
    reg.write_text(json.dumps(D, ensure_ascii=False), encoding='utf-8')
    cand = next(i for i in D['items'] if i['status'] == 'candidate' and i['kind'] == 'component' and i.get('symbols'))
    def film(n, extra=()):
        P = T / f'片{n}'; P.mkdir(exist_ok=True)
        (P / 'brief.json').write_text(json.dumps({'title': f'测试片{n}', 'genre': '测试'}, ensure_ascii=False), encoding='utf-8')
        (P / 'scenes.js').write_text(f"function drawGear{n}(c){{}}\nwindow.FILM={{theme:'space',scenes(t){{ drawGear{n}(1); {cand['symbols'][0]}(t); }}}};\n", encoding='utf-8')
        r = subprocess.run([sys.executable, str(T / 'kit/workshop.py'), 'retro', '--delivered', *extra], cwd=P, capture_output=True, text=True)
        return r, (P / '复盘.md').read_text(encoding='utf-8') if (P / '复盘.md').exists() else '', json.loads(reg.read_text(encoding='utf-8'))
    r, md, D = film(1); ok('第一条片做轻复盘', md.startswith('# 轻复盘') and D['retros'][-1]['kind'] == 'light', r.stdout + r.stderr)
    ok('轻复盘把新写的函数和试用的候选记进待整理', any(x.get('name') == 'drawGear1' for x in D['pending']) and any(x['type'] == 'trial' for x in D['pending']), str(D['pending']))
    ok('轻复盘不要求当场给函数定去向（没有“去向和理由”表）', '去向和理由' not in md and '## 三、检查没拦下' in md)
    t = subprocess.run([sys.executable, str(T / 'kit/workshop.py'), 'todo', '题材卡第三拍每次都要删', '--from', '测试片1'], capture_output=True, text=True)
    r, md, D = film(2); ok('第二条片还是轻复盘', md.startswith('# 轻复盘') and len([x for x in D['pending'] if x['type'] == 'func']) == 2, str(D['pending']))
    r, md, D = film(3); ok('第三条片换成完整复盘', md.startswith('# 完整复盘') and D['retros'][-1]['kind'] == 'full', md[:200])
    ok('完整复盘列出前两条片攒下的函数和这条片的', all(f'drawGear{n}' in md for n in (1, 2, 3)) and '测试片1' in md, md[:600])
    ok('完整复盘带上 todo 记的别扭处', '题材卡第三拍每次都要删' in md)
    ok('完整复盘有台账体检', '## 七、台账体检' in md)
    ok('完整复盘交付后待整理清空', D['pending'] == [], str(D['pending']))
    r, md, D = film(4); ok('完整复盘之后重新从轻复盘数起', md.startswith('# 轻复盘'))
    r, md, D = film(5, ['--full']); ok('--full 可以随时要求完整复盘', md.startswith('# 完整复盘'))
    D['pending'] = [{'type': 'note', 'film': 'x', 'text': f'事{k}'} for k in range(10)]; reg.write_text(json.dumps(D, ensure_ascii=False), encoding='utf-8')
    r, md, D = film(6); ok('待整理攒到十项，提前做完整复盘', md.startswith('# 完整复盘') and '攒了' in md, md[:200])
    r, md, D = film(6); ok('同一条片重复跑 --delivered 不重复记', sum(1 for x in D['retros'] if x.get('film') == '测试片6') == 1)
print(f'\n{len(bad)} 项不通过' if bad else '\n复盘分档测试全部通过'); sys.exit(1 if bad else 0)
