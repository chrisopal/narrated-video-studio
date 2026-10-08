# 从三条旧片的放映页里取出内嵌的毛笔体/草书子集，写成字体文件和一份 css；统计覆盖的字
import re,base64,hashlib,json
from pathlib import Path
OUT=Path('/home/claude/kit/fonts/legacy');OUT.mkdir(parents=True,exist_ok=True)
css=[];cover={'Brush':set(),'Cao':set()};seen=set()
def chars(rng):
    s=set()
    for part in rng.split(','):
        part=part.strip().replace('U+','')
        if not part:continue
        if '-' in part:
            a,b=part.split('-');s.update(range(int(a,16),int(b,16)+1))
        else:s.add(int(part,16))
    return s
for f in ['dongpo','hehai','wz']:
    s=open(f+'.html',encoding='utf8').read()
    for fam,b64,rest in re.findall(r"@font-face\{font-family:'(\w+)';src:url\(data:font/woff2;base64,([A-Za-z0-9+/=]+)\)([^}]*)\}",s):
        if fam not in cover:continue
        data=base64.b64decode(b64);h=hashlib.md5(data).hexdigest()[:10]
        m=re.search(r'unicode-range:([^;]+)',rest);ur=m.group(1) if m else ''
        if ur: cover[fam]|=chars(ur)
        if (fam,h) in seen:continue
        seen.add((fam,h));(OUT/f'{fam}-{h}.woff2').write_bytes(data)
        css.append(f"@font-face{{font-family:'{fam}';src:url(/kit/fonts/legacy/{fam}-{h}.woff2) format('woff2');font-display:block;"+(f"unicode-range:{ur};" if ur else '')+"}")
(OUT/'legacy.css').write_text('\n'.join(css))
cov={k:''.join(sorted(chr(c) for c in v if c>0x2e7f)) for k,v in cover.items()}
json.dump(cov,open(OUT/'cover.json','w'),ensure_ascii=False)
print(len(css),{k:len(v) for k,v in cov.items()}, sum(p.stat().st_size for p in OUT.iterdir())//1024,'KB')
print(cov['Brush'][:120])
