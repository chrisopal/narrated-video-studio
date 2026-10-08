# ---- 漆屏风（《王钟儿》）：人物、道具、上下两栏、屏风翻扇 ----
lq='\n'.join([block('wz','LQ','lqHouse'), re.sub(r'/\* 每句的锚点.*','',block('wz','G1','PAL'),flags=re.S), re.sub(r'function curSent.*','',block('wz','frame','frame'),flags=re.S)])
lq=re.sub(r'/\* =+\n   《王钟儿》.*?=+ \*/\s*DUR = FILMDUR;','',lq,flags=re.S)
lq=lq.replace("const A_ = i => VO[i].a, B_ = i => VO[i].b;","const A_ = i => beat(i).a, B_ = i => beat(i).b;")
pack('lacquer','风格包 · 漆屏风 —— 出自《王钟儿》：朱漆底、平涂勾线人物、上下两栏并行叙事、屏风六扇翻转',lq,G('lacquer'),deps=['ink'])
