#!/usr/bin/env python3
"""不开浏览器的自检：改完 kit、风格包、台账之后先跑这个，几秒钟。它查不了画面，画面看 `python3 kit/workshop.py gallery`。
    python3 tools/selftest.py
"""
import json, py_compile, shutil, subprocess, sys
from pathlib import Path
R = Path(__file__).resolve().parent.parent; bad = []
def ok(name, cond, why=''): print(('✓' if cond else '✗'), name, '' if cond else why); cond or bad.append(name)
for f in list((R / 'kit').glob('*.py')) + list((R / 'tools').glob('*.py')):
    try: py_compile.compile(str(f), doraise=True); e = ''
    except Exception as x: e = str(x)
    ok(f'Python 语法 {f.relative_to(R)}', not e, e)
if shutil.which('node'):
    for f in [R / 'kit/kit.js', R / 'kit/components.js'] + sorted((R / 'kit/packs').glob('*.js')):
        r = subprocess.run(['node', '--check', str(f)], capture_output=True, text=True); ok(f'JS 语法 {f.relative_to(R)}', r.returncode == 0, r.stderr.strip().split('\n')[0] if r.stderr else '')
else: print('· 没有 node，跳过 JS 语法')
reg = json.load(open(R / 'templates/registry.json', encoding='utf-8')); gal = json.load(open(R / 'kit/gallery/gallery.json', encoding='utf-8'))
ids = [i['id'] for i in reg['items']]; ok('台账编号不重复', len(ids) == len(set(ids)))
ok('台账里的包都有文件', all((R / f'kit/packs/{p}.js').exists() for p in reg['packs']), str([p for p in reg['packs'] if not (R / f'kit/packs/{p}.js').exists()]))
ok('包文件都进了台账', all(f.stem in reg['packs'] for f in (R / 'kit/packs').glob('*.js')))
for e in gal['entries']:
    src = R / 'kit/gallery' / e.get('src', e['name'])
    ok(f"样张 {e['name']} 的项目在", src.is_dir() and ((src / 'scenes.js').exists() or (src / 'scenes.tpl.js').exists()))
    for th in e.get('themes', [None]):
        n = e['name'] + (f'_{th}' if th else ''); have = len(list((R / 'kit/gallery/baseline' / n).glob('*.jpg')))
        ok(f'样张 {n} 的基线齐全', have == len(e['shots']), f"基线 {have} 张，清单 {len(e['shots'])} 张")
# 入口文件里列的模块都在（art 这样分成多个文件的包）
import re
for f in sorted((R / 'kit/packs').glob('*.js')):
    src = f.read_text(encoding='utf-8'); m = re.search(r"\[([^\]]*)\]\s*\.forEach\(m=>document\.write\('<script src=\"/kit/packs/(\w+)/'", src)
    if m:
        mods = re.findall(r"'(\w+)'", m.group(1)); d = R / 'kit/packs' / m.group(2); miss = [x for x in mods if not (d / f'{x}.js').exists()]; extra = [x.stem for x in d.glob('*.js') if x.stem not in mods]
        ok(f'{f.name} 的模块齐全', not miss and not extra, f'缺 {miss}，目录里多出 {extra}')
        if shutil.which('node'):
            for x in mods:
                r = subprocess.run(['node', '--check', str(d / f'{x}.js')], capture_output=True, text=True); ok(f'JS 语法 kit/packs/{m.group(2)}/{x}.js', r.returncode == 0, r.stderr.strip().split('\n')[0] if r.stderr else '')
# 改自别人项目的代码，许可全文要跟着走
ok('艺术引擎的许可和来历说明在', (R / 'kit/packs/art/LICENSE').exists() and (R / 'kit/packs/art/README.md').exists())
gone = [str(p.relative_to(R)) for p in list(R.glob('*.md')) + list((R / 'templates').glob('*.md')) + list((R / 'kit').rglob('*.js')) + list((R / 'kit').glob('*.py')) + list((R / 'kit').glob('*.html')) if p.name not in ('更新记录.md', 'STATUS.md') and re.search(r'legacy/|mkpacks|mkart', p.read_text(encoding='utf-8'))]
ok('没有指向已删除的 legacy 目录的说明', not gone, str(gone))
print(f'\n{len(bad)} 项不通过' if bad else '\n全部通过'); sys.exit(1 if bad else 0)
