#!/usr/bin/env python3
"""讲解视频工坊 · 模板台账与迭代（工坊级的命令；每条片子自己的构建在 build.py）
台账在 templates/registry.json：每个题材卡、风格、组件、风格包都是一条，带状态、出处、用在过哪些片子里。
状态阶梯：inbox 收件箱（只是点子或别人的做法） → candidate 候选（已经写成代码、有样张，在一条片里试过） → stable 稳定（两条成片用过 + 回归样张在） → retired 退役

  python3 kit/workshop.py status                      台账总览：谁该晋级、谁在收件箱里放久了、哪些经验还只是提醒
  python3 kit/workshop.py gallery [名字…] [--accept]  回归样张：改了 kit 或风格包之后必须跑；--accept 表示看过图、确认是有意的改动，更新基线
  python3 kit/workshop.py retro [--delivered]         在项目目录里运行：自动收集这条片用了什么、新写了什么、检查拦下了什么 → 复盘.md；
                                                      --delivered 表示已交付：把这条片记进台账（used_in），并给出晋级建议
  python3 kit/workshop.py inbox "点子" --source 出处 [--kind component|style|genre|check]      记一条待试的做法
  python3 kit/workshop.py add 编号 --kind … --name … --from 片名 [--symbols a,b] [--pack 包]   登记一条候选（已经有代码）
  python3 kit/workshop.py promote 编号 [stable|candidate|retired] [--force] [--why 理由]        改状态（晋级 stable 会检查条件）
  python3 kit/workshop.py lesson "教训" --from 片名 [--state check|template|flow|note] [--where 落在哪]   记一条经验
"""
import json, re, sys, subprocess, shutil, datetime
from pathlib import Path
KIT = Path(__file__).resolve().parent; TPL = KIT.parent / 'templates'; REG = TPL / 'registry.json'; LOG = TPL / '更新记录.md'; LES = TPL / '经验库.md'
GAL = KIT / 'gallery'; TODAY = datetime.date.today().isoformat()
STATES = ['inbox', 'candidate', 'stable', 'retired']; CN = {'inbox': '收件箱', 'candidate': '候选', 'stable': '稳定', 'retired': '退役'}
KINDS = {'genre': '题材卡', 'style': '风格', 'component': '组件', 'pack': '风格包', 'check': '检查', 'flow': '流程'}

def load(): return json.load(open(REG, encoding='utf-8'))
def save(R): REG.write_text(json.dumps(R, ensure_ascii=False, indent=1), encoding='utf-8')
def arg(name, default=None): return sys.argv[sys.argv.index(name) + 1] if name in sys.argv else default
def log(line):
    s = LOG.read_text(encoding='utf-8') if LOG.exists() else '# 更新记录\n\n每次改模板、组件、检查或流程，在这里记一行：改了什么、因为哪条片子、谁受影响。\n'
    head = f'\n## {TODAY}\n'
    if head not in s: s += head
    LOG.write_text(s + f'- {line}\n', encoding='utf-8')
def find(R, iid):
    x = next((i for i in R['items'] if i['id'] == iid), None)
    if not x: print('台账里没有', iid, '。相近的：', [i['id'] for i in R['items'] if iid.split('.')[-1] in i['id']][:8]); sys.exit(1)
    return x
def baselines(): return {p.name for p in (GAL / 'baseline').iterdir()} if (GAL / 'baseline').exists() else set()
def has_demo(x): return bool(x.get('demo')) and any(b == x['demo'] or b.startswith(x['demo'] + '_') for b in baselines())
def ready(x): return len(x.get('used_in', [])) >= 2 and (x['kind'] in ('genre', 'check', 'flow') or has_demo(x))

def lessons():
    if not LES.exists(): return []
    return [dict(zip(('id', 'lesson', 'from', 'state', 'where'), [c.strip() for c in l.strip().strip('|').split('|')])) for l in LES.read_text(encoding='utf-8').split('\n') if re.match(r'\|\s*L-\d+', l)]

def cmd_status():
    R = load(); I = R['items']; print(f"工坊版本 {(KIT / 'VERSION').read_text().strip() if (KIT / 'VERSION').exists() else '?'}　成片 {len(R.get('films', []))} 条：{'、'.join(f['title'] for f in R.get('films', []))}")
    for k, name in KINDS.items():
        xs = [i for i in I if i['kind'] == k]
        if xs: print(f"{name}：" + '，'.join(f"{CN[s]} {sum(i['status'] == s for i in xs)}" for s in STATES if any(i['status'] == s for i in xs)))
    up = [i for i in I if i['status'] == 'candidate' and ready(i)]
    if up: print('\n可以晋级为稳定（两条成片用过、样张在）：'); [print(f"  {i['id']}　{i['name']}　用在：{'、'.join(i['used_in'])}") for i in up]
    near = [i for i in I if i['status'] == 'candidate' and not ready(i)]
    close = [i for i in near if i.get('used_in')]; cold0 = [i for i in near if not i.get('used_in')]
    if close: print('\n候选，已在一条成片里用过（再用一条就能晋级）：'); [print(f"  {i['id']}　{i['name']}　用在：{'、'.join(i['used_in'])}" + ('' if i['kind'] in ('genre', 'check', 'flow') or has_demo(i) else '　缺回归样张')) for i in close]
    if cold0: print(f'\n候选，还没在成片里用过（{len(cold0)} 项，选题时优先给它们机会）：' + '、'.join(i['name'] for i in cold0))
    ib = [i for i in I if i['status'] == 'inbox']
    if ib: print('\n收件箱（下一条片挑一两条来试，试完要么升候选要么删）：'); [print(f"  {i['id']}　{i['name']}　来自 {i.get('from', '?')}　{i.get('since', '')}") for i in ib]
    films = [f['title'] for f in R.get('films', [])]; recent = set(films[-6:])
    cold = [i for i in I if i['status'] == 'stable' and len(films) >= 6 and not (set(i.get('used_in', [])) & recent)]
    if cold: print('\n最近六条片都没用到的稳定项（考虑合并或退役）：'); [print(f"  {i['id']}　{i['name']}") for i in cold]
    L = lessons(); note = [l for l in L if l['state'] == 'note']
    print(f"\n经验库 {len(L)} 条：已变成检查 {sum(l['state'] == 'check' for l in L)}，写进模板 {sum(l['state'] == 'template' for l in L)}，写进流程 {sum(l['state'] == 'flow' for l in L)}，只是提醒 {len(note)}")
    if note: print('只是提醒的（同一类问题再出现一次，就必须变成检查或模板默认值）：'); [print(f"  {l['id']} {l['lesson'][:40]}") for l in note]

def diff(a, b):
    """局部差异：把两张图的差分成 32×18 块，取差得最多的那一块（整张平均会把小改动抹掉）。"""
    from PIL import Image, ImageChops
    A = Image.open(a).convert('L').resize((960, 540)); B = Image.open(b).convert('L').resize((960, 540))
    return max(ImageChops.difference(A, B).resize((32, 18), Image.BOX).tobytes())

def cmd_gallery():
    """每个条目渲染几张定格，和基线逐张比；差得多的列出来，人看过图再决定 --accept。"""
    from PIL import Image
    cfg = json.load(open(GAL / 'gallery.json', encoding='utf-8')); want = [a for a in sys.argv[2:] if not a.startswith('--')]; accept = '--accept' in sys.argv; run = GAL / '_run'; out = GAL / '_out'; base = GAL / 'baseline'; bad = []; new = []; n = 0
    if not base.is_dir(): print('没有基线图：这份工坊是按 SKILL.md 省掉基线克隆的（sparse）。先在工坊里运行 git sparse-checkout disable 补全，再跑 gallery'); sys.exit(2)
    for e in cfg['entries']:
        for th in e.get('themes', [None]):
            name = e['name'] + (f'_{th}' if th else '')
            if want and e['name'] not in want and name not in want: continue
            d = run / name; shutil.rmtree(d, ignore_errors=True); shutil.copytree(GAL / e.get('src', e['name']), d)
            if e.get('brief'): bj = json.load(open(d / 'brief.json', encoding='utf-8')); bj.update(e['brief']); (d / 'brief.json').write_text(json.dumps(bj, ensure_ascii=False), encoding='utf-8')   # 同一条样片换平台、画幅再出一组
            if th:
                (d / 'scenes.js').write_text((d / 'scenes.tpl.js').read_text(encoding='utf-8').replace('__THEME__', th).replace('__CHROME__', e.get('chrome', 'label')), encoding='utf-8')
                (d / 'brief.json').write_text((d / 'brief.json').read_text(encoding='utf-8').replace('__THEME__', th), encoding='utf-8')
            od = out / name; shutil.rmtree(od, ignore_errors=True); od.mkdir(parents=True)
            r = subprocess.run([sys.executable, str(KIT / 'build.py'), 'stills', ','.join(map(str, e['shots'])), str(od)], cwd=d, capture_output=True, text=True)
            shots = sorted(od.glob('*.jpg'))
            if r.returncode or len(shots) != len(e['shots']): bad.append(f'{name}：渲染失败　' + (r.stdout + r.stderr).strip().split('\n')[-1][:160]); continue
            w0, h0 = Image.open(shots[0]).size; sw, sh = (480, 270) if w0 >= h0 else (270, round(270 * h0 / w0)); sheet = Image.new('RGB', (sw * len(shots), sh)); [sheet.paste(Image.open(s).resize((sw, sh)), (sw * i, 0)) for i, s in enumerate(shots)]; sheet.save(out / f'{name}.jpg', quality=85)
            for s in shots:
                n += 1; b = base / name / s.name
                if not b.exists(): new.append(f'{name}/{s.name}')
                else:
                    v = diff(s, b)
                    if v > 8: bad.append(f'{name}/{s.name}：有一块和基线差 {v:.0f}/255（看 gallery/_out/{name}.jpg 对比 gallery/baseline/{name}/）')
            if accept: shutil.rmtree(base / name, ignore_errors=True); shutil.copytree(od, base / name); shutil.copy(out / f'{name}.jpg', base / f'{name}.jpg')
            print(('·' if not accept else '✓'), name, flush=True)
    shutil.rmtree(run, ignore_errors=True)
    print(f'样张 {n} 张；' + (f'已更新基线' if accept else f'和基线不同 {len(bad)} 处，新样张（没有基线）{len(new)} 张'))
    for x in bad: print('  ✗', x)
    for x in new[:12]: print('  ＋', x)
    if (bad or new) and not accept: print('先看图：是这次改动想要的变化就加 --accept；不是就说明改坏了别的模板，回去修。'); sys.exit(1)

def scan_project(R, P):
    """这条片的 scenes.js 里用到了台账里的哪些条目；自己新写了哪些函数。"""
    src = (P / 'scenes.js').read_text(encoding='utf-8'); brief = json.load(open(P / 'brief.json', encoding='utf-8')) if (P / 'brief.json').exists() else {}
    DEF = r'(?:^|\n)\s*(?:function\s+([A-Za-z_$][\w$]*)\s*\(|(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>)'
    mine = {m.group(1) or m.group(2) for m in re.finditer(DEF, src)}   # 本片自己定义的名字：和台账组件同名时是本片的函数，不算用了组件（经验库 L-047）
    used = []
    for i in R['items']:
        if i['status'] in ('inbox', 'retired') or i['id'].startswith('inbox-'): continue
        hit = False
        if i['kind'] == 'genre': hit = brief.get('genre') == i['name']
        elif i['kind'] == 'style': hit = bool(re.search(r"theme:\s*['\"]" + re.escape(i['id'].split('.', 1)[1]) + r"['\"]", src))
        elif i['kind'] == 'pack': hit = bool(re.search(r'PACK\.' + re.escape(i['id'].split('.', 1)[1]) + r'\b', src))   # 真的取用了才算，光写在 brief 里不算
        else: hit = any(s not in mine and re.search(r'(?<![\w$.])' + re.escape(s) + r'\s*\(', src) for s in i.get('symbols', []))
        if hit: used.append(i['id'])
    known = {s for i in R['items'] for s in i.get('symbols', [])}; local = []
    for m in re.finditer(DEF, src):
        nm = m.group(1) or m.group(2)
        if len(nm) < 3: continue
        body = src[m.start():]; end = body.find('\n', 1); calls = len(re.findall(r'(?<![\w$])' + re.escape(nm) + r'\s*\(', src)) - 1
        local.append((nm, calls, body[:end if end > 0 else 120].strip()[:110]))
    return brief, used, local

def cmd_retro():
    P = Path.cwd(); R = load(); brief, used, local = scan_project(R, P); title = brief.get('title') or P.name; by = {i['id']: i for i in R['items']}
    H = [json.loads(l) for l in (P / 'check_history.jsonl').read_text(encoding='utf-8').split('\n') if l.strip()] if (P / 'check_history.jsonl').exists() else []
    caught = {}
    for h in H:
        for k, v in h.get('by', {}).items(): caught[k] = max(caught.get(k, 0), v)
    L = [f'# 复盘 ·《{title}》', '', f'日期 {TODAY}　题材 {brief.get("genre", "?")}　风格 {brief.get("style", "?")}　风格包 {"、".join(brief.get("packs", [])) or "无"}', '',
         '## 一、用了哪些现成的（自动统计）', '']
    for k, name in KINDS.items():
        xs = [by[u] for u in used if by[u]['kind'] == k]
        if xs: L.append(f"- {name}：" + '、'.join(f"{x['name']}（{CN[x['status']]}）" for x in xs))
    L += ['', '## 二、这条片自己新写的（自动列出，逐条决定去向）', '', '去向只有三种：沉淀（写成通用组件，登记为候选）／留在本片（说明为什么不通用）／并入已有组件（说明并到哪个）。', '', '| 函数 | 本片调用次数 | 开头 | 去向和理由 |', '|---|---|---|---|']
    L += [f'| {n} | {c} | `{h.replace("|", "¦")}` |  |' for n, c, h in local] or ['| （没有新写的函数） | | | |']
    L += ['', '## 三、检查拦下了什么（自动统计：每项检查历次运行里报过的最多条数）', '']
    L += [f'- {k}：{v}' for k, v in caught.items() if v] or ['- 没有检查记录（check 没跑过，或一次就全过）']
    L += [f'- check 共运行 {len(H)} 次，最后一次：{H[-1]["fails"]} 项不通过，{H[-1]["warns"]} 项提醒'] if H else []
    L += ['', '## 四、检查没拦下、靠审片或用户指出来的问题（手写；每条都要有去向）', '', '| 问题 | 谁发现的 | 去向：新检查／改模板默认值／改流程／只记提醒 |', '|---|---|---|', '|  |  |  |',
          '', '## 五、模板本身哪里别扭（手写）', '', '- 题材卡的结构哪一段没用上、哪一段是临时加的：', '- 风格和组件的默认值哪些每次都要改：', '- 从参考片或别的 skill 看到、想试但这次没试的做法（记进收件箱）：',
          '', '## 六、这次试用的候选和收件箱条目（手写：留、改、还是丢）', '']
    L += [f"- {by[u]['name']}（{CN[by[u]['status']]}）：" for u in used if by[u]['status'] != 'stable'] or ['- 这条片没有试用新东西：下一条片从收件箱里挑一两条试']
    f = P / '复盘.md'
    if f.exists() and '--overwrite' not in sys.argv: f = P / '复盘_自动统计.md'
    f.write_text('\n'.join(L) + '\n', encoding='utf-8'); print('已写', f.name, '：二、四、五、六要手写完，再把结论落进台账（add / inbox / lesson / promote）')
    if '--delivered' in sys.argv:
        films = R.setdefault('films', [])
        if not any(x['title'] == title for x in films): films.append({'title': title, 'date': TODAY, 'genre': brief.get('genre'), 'style': brief.get('style'), 'packs': brief.get('packs', []),
            'structure': (brief.get('direction') or {}).get('structure'), 'hook': (brief.get('direction') or {}).get('hook_type'), 'angle': (brief.get('direction') or {}).get('angle'),
            'voice': (brief.get('voice') or {}).get('voice'), 'platform': brief.get('platform'), 'aspect': brief.get('aspect') or {'douyin': '9:16', 'channels': '9:16', 'xhs': '3:4'}.get(brief.get('platform', ''), '16:9')})
        for u in used:
            if title not in by[u].setdefault('used_in', []): by[u]['used_in'].append(title)
        save(R); log(f'成片《{title}》记入台账：用到 {len(used)} 项（' + '、'.join(by[u]['name'] for u in used[:10]) + ('…' if len(used) > 10 else '') + '）')
        up = [by[u] for u in used if by[u]['status'] == 'candidate' and ready(by[u])]
        if up: print('这条片交付后可以晋级的候选：'); [print(f"  python3 kit/workshop.py promote {x['id']}　（{x['name']}）") for x in up]

def cmd_add(status):
    R = load()
    if status == 'inbox':
        name = sys.argv[2]; kind = arg('--kind', 'component'); n = 1 + max([int(i['id'].split('-')[-1]) for i in R['items'] if i['id'].startswith('inbox-')] + [0]); iid = f'inbox-{n:03d}'
        R['items'].append({'id': iid, 'kind': kind, 'name': name, 'status': 'inbox', 'from': arg('--source', '?'), 'since': TODAY, 'used_in': []})
    else:
        iid = sys.argv[2]; kind = arg('--kind', 'component')
        if any(i['id'] == iid for i in R['items']): print('已经有', iid); sys.exit(1)
        x = {'id': iid, 'kind': kind, 'name': arg('--name', iid), 'status': 'candidate', 'from': arg('--from', '?'), 'since': TODAY, 'used_in': [arg('--from')] if arg('--from') else []}
        if arg('--symbols'): x['symbols'] = arg('--symbols').split(',')
        if arg('--pack'): x['pack'] = arg('--pack')
        if arg('--demo'): x['demo'] = arg('--demo')
        R['items'].append(x)
    save(R); log(f"{'收件箱' if status == 'inbox' else '新候选'}：{iid} {R['items'][-1]['name']}（来自 {R['items'][-1]['from']}）"); print('已登记', iid)

def cmd_promote():
    R = load(); x = find(R, sys.argv[2]); to = sys.argv[3] if len(sys.argv) > 3 and sys.argv[3] in STATES else STATES[min(3, STATES.index(x['status']) + 1)] if x['status'] != 'stable' else 'retired'
    if to == 'stable' and not ready(x) and '--force' not in sys.argv:
        print(f"{x['id']} 还不能晋级稳定：用过 {len(x.get('used_in', []))} 条成片（要 2 条）" + ('' if x['kind'] in ('genre', 'check', 'flow') or has_demo(x) else '，回归样张里没有它（在 gallery.json 加一条并 --accept）')); sys.exit(1)
    if to == 'candidate' and x['status'] == 'inbox' and not (x.get('symbols') or x.get('pack') or x['kind'] in ('genre', 'flow')):
        print('从收件箱升候选前，先把它写成代码，并给这条补上 symbols 或 pack（直接改 registry.json 这一条）'); sys.exit(1)
    old = x['status']; x['status'] = to; x['changed'] = TODAY; save(R); log(f"{x['id']} {x['name']}：{CN[old]} → {CN[to]}" + (f"（{arg('--why')}）" if arg('--why') else '')); print(x['id'], CN[old], '→', CN[to])

def cmd_lesson():
    text = sys.argv[2]; L = lessons(); n = 1 + max([int(l['id'][2:]) for l in L] + [0]); state = arg('--state', 'note')
    s = LES.read_text(encoding='utf-8'); LES.write_text(s.rstrip('\n') + f"\n| L-{n:03d} | {text} | {arg('--from', '?')} | {state} | {arg('--where', '')} |\n", encoding='utf-8'); print(f'已记 L-{n:03d}（{state}）')
    same = [l for l in L if l['state'] == 'note']
    if state == 'note' and same: print('提醒：经验库里还有', len(same), '条只是提醒。写之前看一眼有没有同类的——同类问题第二次出现，就要变成检查或模板默认值。')

if __name__ == '__main__':
    c = sys.argv[1] if len(sys.argv) > 1 else 'status'
    {'status': cmd_status, 'gallery': cmd_gallery, 'retro': cmd_retro, 'inbox': lambda: cmd_add('inbox'), 'add': lambda: cmd_add('candidate'), 'promote': cmd_promote, 'lesson': cmd_lesson}.get(c, lambda: print(__doc__))()
