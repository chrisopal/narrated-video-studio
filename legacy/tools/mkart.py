#!/usr/bin/env python3
"""把 alchaincyf/huashu-art-motion（MIT）的绘画库、动效库和转场库收进工坊，生成 kit/packs/art.js。

上游源码原样放在 legacy/huashu/（哪个提交、取了什么、没取什么，见 legacy/huashu/UPSTREAM.md）。
这里只做四件机械的事，每一处都核对过替换次数，上游一改就会报错而不是悄悄走样：
  1. 命名空间：上游每个库都往 window 上挂一个全局（U、PAINT、MO…）。收进来以后它们只活在 PACK.art 这一个闭包里，不占全局名。
  2. 画幅：上游的绘画库写死 1920×1080。去掉那几行，让 W、H 落到工坊画布的真实尺寸上，竖版也能用。
  3. 几处写死的画面中心（960,540）改成按画幅算。
  4. 不收角色：toon.js 里作者本人的卡通形象（TOON.bean）整段去掉；转场 radiant（模仿一位在世时间不远的画家的招牌小人）不导出。
手写的接合代码在 legacy/tools/glue/art.js（重绘、转场、后期、文字登记）。

重新生成（在仓库根目录）：python3 legacy/tools/mkart.py        只核对不写文件：python3 legacy/tools/mkart.py --check
"""
import re, sys, hashlib
from pathlib import Path
L = Path(__file__).resolve().parent.parent; SRC = L / 'huashu'; KIT = L.parent / 'kit'; GLUE = Path(__file__).resolve().parent / 'glue'
ORDER = ['util', 'motion', 'rig_excerpt', 'paint', 'brush', 'render', 'post', 'kit', 'camera', 'diagram', 'typo', 'chart', 'ui', 'collage', 'toon']   # motion 提前：它定义 U.onStage，后面的库要用
NS = ['U', 'PAINT', 'KIT', 'RIG', 'MO', 'CAM', 'DG', 'TY', 'CH', 'UI', 'CL', 'TOON', 'STAGE', 'TRANSITIONS', 'TR_UTIL']

def sub(text, old, new, n, where):
    """替换并核对次数；old 以 're:' 开头时按正则。"""
    if old.startswith('re:'): out, k = re.subn(old[3:], new, text, flags=re.S)
    else: k = text.count(old); out = text.replace(old, new)
    if k != n: sys.exit(f'✗ {where}：「{old[:50]}」应替换 {n} 处，实际 {k} 处。上游源码变了，先核对再改这里的规则。')
    return out

# 每个文件的改动：(旧, 新, 次数)
PATCH = {
    # 画幅跟工坊画布走：删掉写死的 W、H，库里的 W、H 就是 kit.js 的全局
    'paint': [('const W = 1920, H = 1080;\n', '', 1)],
    'brush': [('const W = 1920, H = 1080;\n', '', 1)],
    'kit': [('const W = 1920, H = 1080;\n', '', 1)],
    'toon': [('const W = 1920, H = 1080;\n', '', 1),
             # 作者本人的卡通形象不收：从 TOON.bean 到它结束（下一节 pose-to-pose 的注释之前）
             ('re:TOON\\.bean = \\(c, o\\) => \\{.*?\\n\\};\\n(?=\\n// ---------- pose-to-pose)', '// （TOON.bean：上游作者本人的卡通形象，没有收进工坊）\n', 1),
             ('re:// ---------- 豆子花叔（故事型极简角色） ----------\\n(?://[^\\n]*\\n)+', '// ---------- 手臂姿势表（上游配它的角色用；角色本身没有收进来，姿势表和换姿势的算法是通用的） ----------\n', 1)],
    'render': [('const W = 1920, H = 1080, TAU = Math.PI * 2;', 'const TAU = Math.PI * 2;', 1)],
    'post': [('const W = 1920, H = 1080;\n', '', 1),
             ('g.createRadialGradient(960, 540, 420, 960, 540, 1150)', 'g.createRadialGradient(W / 2, H / 2, Math.hypot(W, H) * 0.19, W / 2, H / 2, Math.hypot(W, H) * 0.522)', 1),
             ('const cxp = 960 + Math.sin(t * 0.7) * 20, cyp = 540;', 'const cxp = W / 2 + Math.sin(t * 0.7) * 20, cyp = H / 2;', 1),
             ('P.vignette = (c, { cx = 960, cy = 540, inner = 520, outer = 1150,', 'P.vignette = (c, { cx = W / 2, cy = H / 2, inner = Math.hypot(W, H) * 0.236, outer = Math.hypot(W, H) * 0.522,', 1)],
    'transitions': [('const W = 1920, H = 1080;\n', '', 1)],
}

def namespace(text, where):
    names = '|'.join(NS)
    # const X = window.X = …  →  X = …（闭包里已经声明过 X）；const P = window.PAINT = …  →  const P = PAINT = …
    text = re.sub(rf'const (\w+) = window\.({names}) = ', lambda m: f'{m.group(2)} = ' if m.group(1) == m.group(2) else f'const {m.group(1)} = {m.group(2)} = ', text)
    text = re.sub(rf'\bwindow\.({names})\b', r'\1', text)
    left = sorted(set(re.findall(r'window\.(\w+)', text)) - {'VO_ENV', 'FONT_FACES', 'PUNCH'})
    if left: sys.exit(f'✗ {where}：还在用没处理过的全局 window.{left}，先决定它该不该收进闭包。')
    return text

def build():
    parts = []
    for name in ORDER + ['transitions']:
        f = SRC / ('transitions.js' if name == 'transitions' else f'lib/{name}.js'); t = f.read_text(encoding='utf-8')
        for old, new, n in PATCH.get(name, []): t = sub(t, old, new, n, f.name)
        t = namespace(t, f.name)
        if re.search(r'\b(1920|1080)\b', re.sub(r'//[^\n]*', '', t)) and name not in ('motion', 'camera', 'chart', 'collage', 'diagram', 'ui'):   # 这几个库自己带 U.onStage，默认值之后会被 setStage 改掉
            sys.exit(f'✗ {f.name}：还有写死的 1920/1080。')
        parts.append(f'/* ---------- 上游 {f.relative_to(SRC)}（原样，仅做文件头说明的四类机械改动） ---------- */\n{t.rstrip()}\n')
    glue = (GLUE / 'art.js').read_text(encoding='utf-8')
    head = glue[:glue.index('/* ====== 接合')]          # 接合文件开头那段就是包的用法说明，放在生成文件最前面
    body = glue[glue.index('/* ====== 接合'):]
    exports = re.search(r'/\* 导出：(.*?) \*/', glue).group(1)
    js = (head.rstrip() + '\n'
          + '/* 由 legacy/tools/mkart.py 生成，不要手改这个文件：上游源码在 legacy/huashu/，接合代码在 legacy/tools/glue/art.js。\n'
          + '   上游：alchaincyf/huashu-art-motion，MIT License，Copyright (c) 2026 alchaincyf（花叔 · 花生）。许可全文见 legacy/huashu/LICENSE。 */\n'
          + 'window.PACK=window.PACK||{};window.PACK_INIT=window.PACK_INIT||[];\nPACK.art=(function(){\n'
          + 'let ' + ', '.join(NS) + ';\n'
          + '\n'.join(parts)
          + body.rstrip() + f'\nreturn {{{exports}}};\n}})();\n')
    return js

if __name__ == '__main__':
    js = build(); out = KIT / 'packs' / 'art.js'
    if '--check' in sys.argv:
        ok = out.exists() and out.read_text(encoding='utf-8') == js
        print('✓ kit/packs/art.js 和上游源码 + 接合代码一致' if ok else '✗ kit/packs/art.js 不是当前源码生成的：运行 python3 legacy/tools/mkart.py'); sys.exit(0 if ok else 1)
    out.write_text(js, encoding='utf-8'); print('art', len(js) // 1024, 'KB', hashlib.sha256(js.encode()).hexdigest()[:12])
