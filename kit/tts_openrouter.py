#!/usr/bin/env python3
"""用 OpenRouter 的配音接口合成解说。密钥从文件读取，不写在命令里。

密钥放在：<工具箱>/openrouter_key.txt（只放一行密钥），或环境变量 OPENROUTER_API_KEY。

试音（同一句话，用候选声音各合成一遍，存到 ./试音/）：
  python3 tts_openrouter.py audition "每一秒，都有六百五十亿个看不见的小粒子，穿过你的指甲盖。"
指定模型试几个声音：
  python3 tts_openrouter.py voices google/gemini-3.8-flash-tts Charon,Kore "一句话"
整期配音（lines.txt 每行 id|文字，输出 <id>.mp3 到当前目录）：
  python3 tts_openrouter.py run lines.txt microsoft/mai-voice-2.1 zh-CN-Wei:MAI-Voice-2.1 [语速]
"""
import json, os, sys, urllib.request, urllib.error
from pathlib import Path
KIT = Path(__file__).resolve().parent
URL = 'https://openrouter.ai/api/v1/audio/speech'
# 候选：(模型, 声音, 每百万字符美元)。一期约 1000 字，按 20 美元/百万字符算约 0.02 美元。
CANDIDATES = [
    ('microsoft/mai-voice-2.1', 'zh-CN-Wei:MAI-Voice-2.1', 22),
    ('microsoft/mai-voice-2.1', 'zh-CN-Bo:MAI-Voice-2.1', 22),
    ('microsoft/mai-voice-2.1', 'zh-CN-Lan:MAI-Voice-2.1', 22),
    ('microsoft/mai-voice-2.1', 'zh-CN-Mei:MAI-Voice-2.1', 22),
    ('qwen/qwen-audio-3.0-tts-plus', 'longanlingxin', 20),
    ('qwen/qwen-audio-3.0-tts-plus', 'longanlufeng', 20),
    ('qwen/qwen-audio-3.0-tts-flash', 'loongjohn', 15),
    ('qwen/qwen-audio-3.0-tts-flash', 'longanhuan_v3.6', 15),
    ('fish-audio/s2.1-pro', None, 15),
]
def key():
    k = os.environ.get('OPENROUTER_API_KEY', '').strip()
    for p in (KIT.parent / 'openrouter_key.txt', KIT / 'openrouter_key.txt'):
        if not k and p.exists(): k = p.read_text().strip()
    if not k: sys.exit('没找到密钥：请把密钥存成 ' + str(KIT.parent / 'openrouter_key.txt'))
    return k
def _post(k, body):
    req = urllib.request.Request(URL, data=json.dumps(body).encode(), headers={'Content-Type': 'application/json', 'Authorization': 'Bearer ' + k})
    try:
        with urllib.request.urlopen(req, timeout=180) as r: return r.read(), r.headers.get('Content-Type', ''), None
    except urllib.error.HTTPError as e:
        return None, '', f'HTTP {e.code} ' + e.read().decode('utf-8', 'ignore')[:200]
    except Exception as e:
        return None, '', str(e)[:200]
def speak(k, model, voice, text, out, speed=None):
    """先要 mp3；模型只出 PCM 时（如 Gemini，24kHz 16 位单声道）自动转成 mp3。"""
    import subprocess
    body = {'model': model, 'input': text, 'response_format': 'mp3'}
    if voice: body['voice'] = voice
    if speed: body['speed'] = float(speed)
    data, ctype, err = _post(k, body)
    if err or not data or len(data) < 2000:
        body['response_format'] = 'pcm'; data, ctype, err2 = _post(k, body)
        if err2 or not data or len(data) < 2000: return False, (err or '') + ' | ' + (err2 or '返回内容过短')
    if 'pcm' in ctype or body['response_format'] == 'pcm':
        p = subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 's16le', '-ar', '24000', '-ac', '1', '-i', '-', '-b:a', '160k', str(out)], input=data)
        if p.returncode: return False, 'PCM 转 mp3 失败'
        return True, f'{len(data)//1024} KB PCM'
    Path(out).write_bytes(data); return True, f'{len(data)//1024} KB'
if __name__ == '__main__':
    if len(sys.argv) < 3: sys.exit(__doc__)
    k = key()
    if sys.argv[1] == 'audition':
        text = sys.argv[2]; od = Path('试音'); od.mkdir(exist_ok=True)
        for model, voice, price in CANDIDATES:
            name = (model.split('/')[1] + '__' + (voice or 'default').split(':')[0]).replace('.', '_') + '.mp3'
            ok, msg = speak(k, model, voice, text, od / name); print(('成功 ' if ok else '失败 ') + name, '|', msg, f'| 约 {price} 美元/百万字符', flush=True)
    elif sys.argv[1] == 'voices':  # voices <模型> <声音1,声音2,...> "一句话"
        model, vs, text = sys.argv[2], sys.argv[3].split(','), sys.argv[4]; od = Path('试音'); od.mkdir(exist_ok=True)
        for v in vs:
            name = (model.split('/')[1] + '__' + v).replace('.', '_') + '.mp3'; ok, msg = speak(k, model, v, text, od / name); print(('成功 ' if ok else '失败 ') + name, '|', msg, flush=True)
    elif sys.argv[1] == 'run':
        lines, model, voice = sys.argv[2], sys.argv[3], (sys.argv[4] if len(sys.argv) > 4 and sys.argv[4] != '-' else None); speed = sys.argv[5] if len(sys.argv) > 5 else None; n = 0
        for line in Path(lines).read_text().splitlines():
            if '|' not in line: continue
            i, text = line.split('|', 1); ok, msg = speak(k, model, voice, text, i + '.mp3', speed); n += len(text); print(('成功 ' if ok else '失败 ') + i, '|', msg, flush=True)
        print('合计字符数', n)
