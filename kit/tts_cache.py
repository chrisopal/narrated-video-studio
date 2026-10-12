"""配音缓存：一句配音能不能跳过，看“这句的文字、模型、声音、语速、语气”和上次配它时是否完全一样，而不是看 mp3 在不在。
记录存在当前目录的 tts_cache.json：{id: {key, sha}}。key 是那几样东西的指纹，sha 是配出来的 mp3 的内容哈希。
tts_openrouter.py 和 tts_edge.py 共用。新文件先写到临时名，配成功才改成 <id>.mp3，半路失败不会留下一个坏的 mp3 冒充配好的。"""
import hashlib, json, os
from pathlib import Path

F = Path('tts_cache.json')

def _sha(p):
    return hashlib.sha256(Path(p).read_bytes()).hexdigest()

def key(engine, model, voice, speed, style, text):
    return hashlib.sha256(json.dumps([engine, model, voice, speed or '', style or '', text], ensure_ascii=False).encode()).hexdigest()[:16]

def load():
    try: return json.loads(F.read_text(encoding='utf-8'))
    except Exception: return {}

def save(c):
    tmp = F.with_suffix('.json.part'); tmp.write_text(json.dumps(c, ensure_ascii=False, indent=1), encoding='utf-8'); os.replace(tmp, F)

def decide(c, i, k):
    """返回 (要不要配, 原因)。"""
    mp3 = Path(f'{i}.mp3')
    if not mp3.exists() or mp3.stat().st_size <= 2000: return True, ''
    e = c.get(i)
    if not e: return False, '已有，但没有缓存记录（旧版脚本配的）：不确定是不是当前这句，回听会核对；要重配加 --redo'
    if e.get('key') != k: return True, '文字、声音、语速或语气改过，重配'
    if e.get('sha') != _sha(mp3): return True, 'mp3 在配好之后被换过，重配'
    return False, '已有，和当前这句一致'

def part(i):
    """临时文件名：扩展名留 .mp3，ffmpeg 才知道写什么格式。"""
    return Path(f'.{i}.part.mp3')

def commit(c, i, k):
    """临时文件转正，记下缓存。"""
    os.replace(part(i), f'{i}.mp3'); c[i] = {'key': k, 'sha': _sha(f'{i}.mp3')}; save(c)

def drop(i):
    try: part(i).unlink()
    except FileNotFoundError: pass
