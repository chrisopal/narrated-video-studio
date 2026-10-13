#!/usr/bin/env python3
"""不开浏览器的自检：改完 kit、风格包、台账之后先跑这个，半分钟内。它查不了画面，画面看 `python3 kit/workshop.py gallery`。
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
sparse = not (R / 'kit/gallery/baseline').is_dir()   # 按 SKILL.md 省掉基线的克隆：基线不查，要查先 git sparse-checkout disable
if sparse: print('· 没有基线图（sparse 克隆），跳过“基线齐全”')
for e in gal['entries']:
    src = R / 'kit/gallery' / e.get('src', e['name'])
    ok(f"样张 {e['name']} 的项目在", src.is_dir() and ((src / 'scenes.js').exists() or (src / 'scenes.tpl.js').exists()))
    for th in ([] if sparse else e.get('themes', [None])):
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
# 文章转视频：用一份仿公众号页面的样例跑取文和分析
import tempfile
with tempfile.TemporaryDirectory() as td:
    r = subprocess.run([sys.executable, str(R / 'kit/article.py'), 'fetch', str(R / 'tools/fixtures/wx_article.html')], cwd=td, capture_output=True, text=True); T = Path(td)
    ok('article.py 取文和分析跑得通', r.returncode == 0 and (T / 'article/article.json').exists(), (r.stdout + r.stderr).strip().split('\n')[-1][:160])
    if (T / 'article/article.json').exists():
        D = json.load(open(T / 'article/article.json', encoding='utf-8')); M = D['meta']; B = D['blocks']; AN = json.load(open(T / 'article/analysis.json', encoding='utf-8')); SG = json.load(open(T / 'brief.suggest.json', encoding='utf-8')); FA = json.load(open(T / 'facts.json', encoding='utf-8'))
        ok('  标题、公众号、作者、时间、原创标记', M['title'] == '高原上为什么煮不熟饭' and M['account'] == '工坊自检号' and M['author'] == '自检样例' and M['published'].startswith('2025-10-09') and M['original'], str(M))
        ok('  两个小标题、一处引文、三条列表、一段代码', [b['type'] for b in B if not b.get('boiler')].count('h') == 2 and sum(b['type'] == 'quote' for b in B) == 1 and sum(b['type'] == 'li' for b in B) == 3 and sum(b['type'] == 'code' for b in B) == 1)
        ok('  配图带图注，文首文末套话不算正文', any(b['type'] == 'img' and b.get('caption') for b in B) and B[0].get('boiler') and B[-1].get('boiler') and not any('往期' in b.get('text', '') for b in B if not b.get('boiler')))
        ok('  题材、强调色、出处署名、待核实清单', AN['genres'][0]['genre'] == '科普原理' and SG.get('themePatch', {}).get('a1') == '#d65a28' and SG['source_article']['basis'] == '?' and SG['must_show'] == [SG['source_article']['credit']] and len(FA) >= 3 and all(x['status'] == 'todo' for x in FA), json.dumps(SG, ensure_ascii=False)[:200])
# SKILL.md 是启动器：要短、描述不超长、不写会变的数字；它和流程.md 里提到的仓库文件都要在
sk = (R / 'SKILL.md').read_text(encoding='utf-8'); desc = re.search(r'^description: (.*)$', sk, re.M).group(1)
ok('SKILL.md 是启动器：不超过 12 KB', len(sk.encode()) <= 12 * 1024, f'{len(sk.encode())} 字节：流程和速查放进 流程.md、templates/，别塞回 SKILL.md')
ok('SKILL.md 的描述不超过 1024 字', len(desc) <= 1024, f'{len(desc)} 字')
ok('SKILL.md 的描述里没有会过期的数目', not re.search(r'[一二三四五六七八九十百\d]+\s*(套|张|个|种)(风格|题材|组件|转场|包)', desc), desc[:80])
ok('SKILL.md 让人去读 流程.md', '流程.md' in sk)
for doc in ('SKILL.md', '流程.md', 'templates/速查.md', 'templates/已知限制.md'):
    t = (R / doc).read_text(encoding='utf-8'); refs = set(re.findall(r'`((?:templates|kit|tools)/[^`*<>{}\s]+?\.(?:md|json|js|py|sh))`', t)) | ({'流程.md'} if '`流程.md`' in t else set())
    miss = sorted(x for x in refs if not (R / x).exists()); ok(f'{doc} 提到的仓库文件都在', not miss, str(miss))
# 出片门禁、回听指纹、配音缓存（test_gates），每项检查该拦的拦、该放的放（test_checks）：要 ffmpeg，共半分钟
if shutil.which('ffmpeg'):
    for t, name in (('test_gates.py', '出片门禁回归测试'), ('test_checks.py', '检查逻辑回归测试')):
        r = subprocess.run([sys.executable, str(R / 'tools' / t)], capture_output=True, text=True)
        ok(f'{name}（tools/{t}）', r.returncode == 0, '\n'.join(l for l in r.stdout.split('\n') if l.startswith('✗'))[:600] or r.stderr[-300:])
else: print('· 没有 ffmpeg，跳过出片门禁测试')
print(f'\n{len(bad)} 项不通过' if bad else '\n全部通过'); sys.exit(1 if bad else 0)
