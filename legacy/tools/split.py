import re,sys,json,hashlib
def split(path):
    L=open(path,encoding='utf8').read().split('\n')
    # only the first <script> with engine: find range
    out=[];cur=None
    for i,l in enumerate(L):
        m=re.match(r'(?:async )?function\s+([A-Za-z_$][\w$]*)|(?:const|let|var)\s+\{?\s*([A-Za-z_$][\w$]*)',l)
        if m:
            cur={'name':m.group(1) or m.group(2),'kind':'function' if m.group(1) else 'var','a':i,'lines':[l]};out.append(cur)
        elif l.startswith('</script>'): cur=None
        elif re.match(r'(scene\(|S\.|\{|/\* =====|<)',l):
            cur={'name':'@stmt%d'%i,'kind':'stmt','a':i,'lines':[l]};out.append(cur)
        elif cur is not None: cur['lines'].append(l)
    return out
if __name__=='__main__':
    D={f:split(f+'.short.txt') for f in ['dongpo','hehai','wz']}
    names={}
    for f,ds in D.items():
        for d in ds:
            if d['kind']=='stmt':continue
            body='\n'.join(x.rstrip() for x in d['lines']).strip()
            names.setdefault(d['name'],{})[f]=(hashlib.md5(body.encode()).hexdigest()[:6],len(body),d['a']+1)
    for n,v in names.items():
        hs={x[0] for x in v.values()}
        print(n.ljust(14),'SAME' if len(hs)==1 else 'DIFF',' '.join(f'{f}:{x[1]}@{x[2]}' for f,x in v.items()))
