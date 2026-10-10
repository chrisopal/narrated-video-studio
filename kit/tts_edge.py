#!/usr/bin/env python3
"""免费配音（edge-tts，不要密钥）。lines.txt 每行 id|要念的文字[|语气提示，这里用不上]，输出 <id>.mp3 到当前目录。
  python3 <工坊>/kit/tts_edge.py lines.txt [声音] [语速]      声音缺省 zh-CN-YunxiNeural，语速缺省 +5%；已有的句子跳过，--redo 全部重配
常用声音：zh-CN-YunxiNeural（年轻男声，轻快）、zh-CN-YunyangNeural（男声，新闻播报）、zh-CN-XiaoxiaoNeural（女声，温和）、zh-CN-YunjianNeural（男声，厚重）
走代理、证书是自签的环境（云端工作区）：设了 SSL_CERT_FILE 或有 /root/.ccr/ca-bundle.crt 时自动用它。
它没有语气控制，声音也不如 tts_openrouter.py 的自然；有密钥时优先用那个。"""
import sys, os, asyncio
from pathlib import Path
ca = os.environ.get('SSL_CERT_FILE') or ('/root/.ccr/ca-bundle.crt' if Path('/root/.ccr/ca-bundle.crt').exists() else None)
if ca:
    import certifi; certifi.where = lambda: ca
try: import edge_tts
except Exception: print('没有 edge-tts：pip install edge-tts'); sys.exit(2)
args = [a for a in sys.argv[1:] if not a.startswith('--')]; redo = '--redo' in sys.argv
if not args: print(__doc__); sys.exit()
voice = args[1] if len(args) > 1 else 'zh-CN-YunxiNeural'; rate = args[2] if len(args) > 2 else '+5%'
async def one(i, t):
    for k in range(3):                       # 偶尔返回空音频：重试，还不行就报出来
        try:
            await edge_tts.Communicate(t, voice, rate=rate).save(f'{i}.mp3')
            if Path(f'{i}.mp3').stat().st_size > 2000: return True
        except Exception as e: err = e
        await asyncio.sleep(1 + k)
    return False
async def main():
    bad = []
    for line in Path(args[0]).read_text(encoding='utf-8').splitlines():
        if '|' not in line: continue
        i, t = line.split('|')[:2]; i = i.strip(); t = t.strip()
        if not i or not t: continue
        if Path(f'{i}.mp3').exists() and Path(f'{i}.mp3').stat().st_size > 2000 and not redo: print('·', i, '已有，跳过'); continue
        ok = await one(i, t); print('✓' if ok else '✗', i, t[:24]); ok or bad.append(i)
    if bad: print('没配上：', ' '.join(bad), '（换个说法再试）'); sys.exit(1)
asyncio.run(main())
