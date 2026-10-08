#!/usr/bin/env python3
"""把三条旧片（东坡 / 河海昆仑录 / 王钟儿）的画法收进工坊，生成 kit/packs/*.js。
旧片源码原样取用（verbatim），只在外面包一层命名空间；手写的接合代码在 tools/glue/*.js。
重新生成：python3 tools/mkpacks.py"""
import re,json,sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).parent))
from split import split
L=Path(__file__).parent.parent; KIT=Path('/home/claude/kit'); GLUE=Path(__file__).parent/'glue'
(KIT/'packs').mkdir(exist_ok=True)
D={f:split(str(L/(f+'.short.txt'))) for f in ['dongpo','hehai','wz']}
def idx(f,name): return next(i for i,d in enumerate(D[f]) if d['name']==name)
def block(f,first,last,drop=()):
    a,b=idx(f,first),idx(f,last); out=[]
    for d in D[f][a:b+1]:
        if d['kind']=='stmt' and d['lines'][0].startswith(('scene(','<')): continue
        if d['name'] in drop: continue
        out+=d['lines']
    return '\n'.join(out)
def names(src):
    """顶层声明的名字（函数、const/let 的每个变量）"""
    out=[]
    for line in src.split('\n'):
        m=re.match(r'(?:async )?function\s+([A-Za-z_$][\w$]*)',line)
        if m: out.append(m.group(1)); continue
        m=re.match(r'(const|let|var)\s+',line)
        if not m: continue
        depth=0;i=m.end();expect=True;s=line
        while i<len(s):
            c=s[i]
            if c in '([{': depth+=1
            elif c in ')]}': depth-=1
            elif c in '"\'`':
                j=i+1
                while j<len(s) and s[j]!=c: j+= 2 if s[j]=='\\' else 1
                i=j
            elif c=='/' and s[i:i+2]=='//': break
            elif depth==0 and c==',': expect=True
            elif depth==0 and c==';': expect=False
            elif depth==0 and expect and (c.isalpha() or c in '_$'):
                mm=re.match(r'[A-Za-z_$][\w$]*',s[i:]); out.append(mm.group(0)); i+=len(mm.group(0))-1; expect=False
            i+=1
    seen=[];[seen.append(n) for n in out if n not in seen]; return seen
def pack(name,title,src,glue,deps=(),extra=()):
    own=names(src)+names(glue)+list(extra); own=[n for i,n in enumerate(own) if n not in own[:i]]
    imp=[]
    for d in deps:
        ex=EXPORTS[d]; use=[n for n in ex if n not in own and n not in sum((list(x) for x in imp),[]) and re.search(r'(?<![\w$.])'+re.escape(n)+r'(?![\w$])',src+glue)]
        imp.append(use)
    head=''.join(f"const {{{', '.join(u)}}} = PACK.{d};\n" for d,u in zip(deps,imp) if u)
    EXPORTS[name]=own
    js=f"/* {title}\n   由 legacy/tools/mkpacks.py 生成，不要手改这个文件：旧片画法在 legacy/*.html，接合代码在 legacy/tools/glue/{name}.js */\nwindow.PACK=window.PACK||{{}};window.PACK_INIT=window.PACK_INIT||[];\nPACK.{name}=(function(){{\n{head}{src}\n/* ====== 接合：把旧片画法接到工坊（手写） ====== */\n{glue}\nreturn {{{', '.join(own)}}};\n}})();\n"
    (KIT/'packs'/f'{name}.js').write_text(js,encoding='utf-8'); print(name,len(js)//1024,'KB',len(own),'个导出')
EXPORTS={}
G=lambda n:(GLUE/f'{n}.js').read_text(encoding='utf-8')
html={f:(L/(f+'.html')).read_text(encoding='utf-8') for f in ['dongpo','hehai']}
def land(f):
    s=html[f];i=s.index('const LAND');return s[i:s.index('\n',i)]

# ---- 宋式水墨：三条片共用的引擎 ----
ink=block('dongpo','W','chapter').replace('const W = 1920, H = 1080; let DUR = 204;','')
ink=re.sub(r"const F = \{.*?\};","const F = {\n  brush: '\"Brush\", KT, serif',\n  cao: '\"Cao\", \"Brush\", KT, cursive',\n  song: 'Song, \"Noto Serif CJK SC\", \"Songti SC\", serif',\n  songb: 'SongB, \"Noto Serif CJK SC\", \"Songti SC\", serif'\n};",ink,flags=re.S)
cover=json.load(open(KIT/'fonts/legacy/cover.json'))
pack('ink','风格包 · 宋式水墨（引擎）—— 出自《东坡》，《河海昆仑录》《王钟儿》共用',ink,G('ink').replace('__COVER__',json.dumps(cover,ensure_ascii=False)))
# ---- 固定人物 ----
fig=block('dongpo','SU','suDraw')+'\n'+block('hehai','PEI','peiDraw')
pack('figures','组件包 · 固定人物 —— 宋人文士（《东坡》）、清末官员与仆从（《河海昆仑录》）',fig,G('figures'),deps=['ink'])
if '--all' in sys.argv or True:
    for extra in ['map','litho','lacquer']:
        if (GLUE/f'{extra}.py').exists(): exec((GLUE/f'{extra}.py').read_text(encoding='utf-8'))
