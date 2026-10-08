# ---- 行迹地图：两条片各自的地理数据都留着（_E 东部细海岸，_W 全图粗海岸），画法取《河海昆仑录》那版再放开参数 ----
def decl(f,name,suffix):
    d=D[f][idx(f,name)]; t='\n'.join(d['lines']).rstrip()
    return re.sub(r'^const '+name+r'\b','const '+name+suffix,t)
geo='\n'.join([land('dongpo').replace('const LAND','const LAND_E'),land('hehai').replace('const LAND','const LAND_W')]+
    [decl('dongpo',n,'_E') for n in ['PL','RIVERS','CANAL','LAKES','MTNS']]+[decl('hehai',n,'_W') for n in ['PL','RIVERS','WALL','LAKES','MTNS']])
geo=re.sub(r'\n/\*.*?\*/\s*$','',geo,flags=re.S)
core='\n'.join(block('hehai',a,b) for a,b in [('smoothPts','smoothPts'),('makeLeg','legAt'),('drawRoute','drawRoute')])
core=re.sub(r'/\* 行程：.*?\*/','',core)
pack('map','组件包 · 行迹地图 —— 出自《东坡》（苏子行迹图）和《河海昆仑录》（戍途图）',geo+'\n'+core,G('map'),deps=['ink'])
