# ---- 石印画报（《河海昆仑录》）：刻版滤镜、题签纸条、版框、行程计数、戍途道具 ----
lit='\n'.join([block('hehai','drawCart','dateHead'),
  '\n'.join(D['hehai'][idx('hehai','AX0')]['lines'][:1]+D['hehai'][idx('hehai','HX0')]['lines'][:1]+D['hehai'][idx('hehai','SLIP')]['lines'][:1]),
  block('hehai','FXC','engrave'), block('hehai','say','cn'), block('hehai','drawBags','tufts')])
lit=re.sub(r'/\* -+ 分场：画 / 字 两层 -+ \*/\s*','',lit); lit=re.sub(r'\n/\* =+\n   戍途图.*?=+ \*/','',lit,flags=re.S)
lit=re.sub(r"/\* 人物车马放大.*?\*/\n\{ const _p = peiDraw;.*?\n.*?drawCart = function.*?\}; \}\n","",lit,flags=re.S)
lit=re.sub(r"/\* 开场更快显形.*?\*/\n\{ const _rd = revealDraw;.*?\}; \}\n","",lit,flags=re.S)
assert 'peiDraw = function' not in lit and 'revealDraw = function' not in lit
pack('litho','风格包 · 石印画报 —— 出自《河海昆仑录》：水墨画面过一遍刻版，版框、题签栏、日数里数',lit,G('litho'),deps=['ink','figures'])
