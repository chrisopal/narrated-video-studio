"""浏览器：本地文件服务（只许读工坊和项目）、打开放映页、整片扫描和动效扫描（按内容指纹缓存）。"""

import json
import sys
import os
import subprocess
import threading
import http.server
import socketserver
from .base import BRIEF, CH, CW, FPS, KIT, P, SAFE
from .state import fingerprint
from .footage import assets


# ---------- 浏览器 ----------
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def translate_path(self, path):
        # 只许读工坊 kit/ 和项目目录里的文件：挡住 /kit//绝对路径、../ 越界，也不给密钥和隐藏文件（2026-10-09 评审 P1）
        from urllib.parse import unquote

        path = unquote(path.split('?')[0].split('#')[0])
        root, rel = (
            (KIT, path[5:])
            if path.startswith('/kit/')
            else (P, path[9:]) if path.startswith('/project/') else (P, path)
        )
        root = os.path.normpath(str(root))
        f = os.path.normpath(os.path.join(root, rel.lstrip('/\\')))
        parts = os.path.relpath(f, root).split(os.sep)
        if (
            not f.startswith(root + os.sep)
            or any(x.startswith('.') for x in parts)
            or os.path.basename(f) in ('openrouter_key.txt',)
            or f.endswith('.key')
        ):
            return os.path.join(root, '__forbidden__')
        return f


def browser(p, tl):
    srv = socketserver.TCPServer(('127.0.0.1', 0), Q)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    b = p.chromium.launch(
        args=['--enable-gpu-rasterization', '--ignore-gpu-blocklist'] + os.environ.get('NVS_CHROMIUM_ARGS', '').split()
    )
    pg = b.new_page(viewport={'width': CW, 'height': CH})
    errs = []  # NVS_CHROMIUM_ARGS：额外的浏览器参数，只在排查跨环境差异时用
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('console', lambda m: m.type == 'error' and errs.append(m.text))
    pg.goto(
        f'http://127.0.0.1:{srv.server_address[1]}/kit/film.html?packs='
        + ','.join(BRIEF.get('packs', []))
        + f'&w={CW}&h={CH}&lang={BRIEF.get("lang", "zh")}&look={BRIEF.get("look", "")}&safe='
        + ','.join(map(str, SAFE))
    )  # lang：画面上的字出哪种语言（zh / en / bi），目前 gen 包的 say() 认它
    try:
        total = pg.evaluate('([tl,a])=>window.init(tl,a)', [tl, assets()])
    except Exception as e:
        print('页面没能启动：', '；'.join(errs[:5]) or str(e).split('\n')[0])
        b.close()
        sys.exit(1)
    return b, pg, total, errs


def pipe(out, crf=None):
    crf = BRIEF.get('crf', 18) if crf is None else crf  # 满屏细点的画面（gen 包）码率吃紧，brief.json 里 "crf":15
    return subprocess.Popen(
        [
            'ffmpeg',
            '-y',
            '-loglevel',
            'error',
            '-f',
            'image2pipe',
            '-framerate',
            str(FPS),
            '-c:v',
            'mjpeg',
            '-i',
            '-',
            '-c:v',
            'libx264',
            '-crf',
            str(crf),
            '-preset',
            'medium',
            '-pix_fmt',
            'yuv420p',
            str(out),
        ],
        stdin=subprocess.PIPE,
    )


def page_pass(tl, name, expr, cache=True):
    """在页面里跑一遍整片的量测（expr），结果存成 <name>；场景、时间轴、素材、引擎都没动过就直接用上次的。"""
    f = P / name
    fp = fingerprint('pic')[0]  # 缓存按画面输入的内容指纹认，不按修改时间（时间会被拷贝、checkout 弄乱）
    if cache and f.exists():
        try:
            old = json.load(open(f))
        except Exception:
            old = None
        if isinstance(old, dict) and old.get('_fp') == fp:
            return old
    from playwright.sync_api import sync_playwright

    with sync_playwright() as p:
        b, pg, total, errs = browser(p, tl)
        sc = pg.evaluate(expr)
        b.close()
        if errs:
            print('页面报错', errs[:5])
            sys.exit(1)
    if isinstance(sc, dict):
        sc['_fp'] = fp
    json.dump(sc, open(f, 'w'), ensure_ascii=False)
    return sc


def get_scan(tl, cache=True):
    return page_pass(tl, '_scan.json', '()=>window.scan(0.1)', cache)


def get_motion(tl, cache=True):
    return page_pass(tl, '_motion.json', '()=>window.motionScan(%d)' % FPS, cache)
