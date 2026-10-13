"""命令入口：build.py 的每个子命令。"""

import json
import re
import sys
import os
import base64
import subprocess
import numpy as np
from .base import BRIEF, CH, COVER, COVER_NAME, CW, FPS, P, PROMO, TALK, VERT, jload, show, silent
from .sound import MU_DB, cmd_beats, mixdown, music, orig_track, sfx_track
from .voice import short_at, short_plan, srt, timeline
from .state import fingerprint, fp_diff, remember, stale, verify_out
from .footage import cmd_clips, cmd_pick, cmd_probe, cmd_study, cmd_transcribe, credits_file
from .talk import cmd_talk, talk_check
from .page import browser, get_motion, get_scan, pipe
from .checks import voice_rate_check
from .checks import (
    STILL_MV,
    article_check,
    asr_check,
    assets_check,
    cmd_look,
    facts_check,
    motion_check,
    pace_check,
    pace_line,
    pace_stats,
    scan_check,
    story_check,
)
from .short import short_check, short_lint


def main(doc):
    """doc 是 build.py 的用法说明（不带参数或 --help 时打印）。"""
    if len(sys.argv) < 2 or sys.argv[1] in ('-h', '--help', 'help'):
        print(doc)
        sys.exit()
    cmd = sys.argv[1]
    if cmd == 'probe':
        cmd_probe()
        sys.exit()
    if cmd == 'beats':
        cmd_beats(sys.argv[2])
        sys.exit()
    if cmd == 'clips':
        cmd_clips()
        sys.exit()
    if cmd == 'transcribe':
        cmd_transcribe(sys.argv[2])
        sys.exit()
    if cmd == 'look':
        cmd_look()
        sys.exit()
    if cmd == 'talk':
        cmd_talk(sys.argv[2] if len(sys.argv) > 2 else None)
        sys.exit()
    if cmd == 'pick':
        cmd_pick(sys.argv[2], int(sys.argv[3]) if len(sys.argv) > 3 else 8)
        sys.exit()
    if cmd == 'study':
        cmd_study(sys.argv[2], float(sys.argv[3]) if len(sys.argv) > 3 else 0.3)
        sys.exit()
    if cmd == 'lines':
        L = [
            l
            for l in json.load(open(P / 'script.json'))
            + (json.load(open(P / 'short.json')) if (P / 'short.json').exists() else [])
            if not silent(l)
        ]
        VO = BRIEF.get('voice', {}) or {}
        sty = lambda l: (l.get('tone') or VO.get('style') or '').replace('|', '／').strip()
        (P / 'lines.txt').write_text(
            ''.join(f"{l['id']}|{l.get('tts') or l['vo']}" + (f"|{sty(l)}" if sty(l) else '') + "\n" for l in L),
            encoding='utf-8',
        )
        print(
            'lines.txt',
            len(L),
            '句，',
            sum(len(l.get('tts') or l['vo']) for l in L),
            '字',
            f'（{sum(1 for l in L if sty(l))} 句带语气提示）',
        )
        if VO:
            print(
                '配音命令（在用户电脑的项目文件夹里，前台分批跑）：python3 <工坊>/kit/tts_openrouter.py run lines.txt',
                VO.get('model', 'google/gemini-3.8-flash-tts'),
                VO.get('voice', 'Charon'),
                VO.get('speed', ''),
            )
        sys.exit()
    tl, total = timeline()
    print('正片时长', round(total, 2), '（逐字时间：%d/%d 句）' % (sum('ct' in s for s in tl), len(tl)))
    if cmd == 'timeline':
        sys.exit()
    if cmd == 'facts':
        f, w = facts_check(tl)
        show('断言台账', f, w)
        sys.exit(1 if f else 0)
    if cmd == 'check':
        rep = {}
        f, w = facts_check(tl)
        rep['断言台账'] = (f, w)
        rep['叙事线'] = story_check(tl)
        f, w = asr_check(tl)
        rep['配音回听'] = (f, w)
        rep['配音语速'] = voice_rate_check(tl)
        if TALK:
            rep['口播校对'] = talk_check(tl)
        sc = get_scan(tl, cache='--fresh' not in sys.argv)
        F, Wn = scan_check(sc)
        if (P / 'assets.json').exists():
            rep['素材授权'] = assets_check(set(sc.get('used', {})))
        rep['阅读时长'] = (F['read'], [])
        rep['文字出画'] = (F['frame'], [])
        rep['平台遮挡区'] = (F['unsafe'], []) if VERT else ([], [])
        rep['字幕带'] = ([], Wn['subzone'])
        rep['文字重叠'] = ([], Wn['overlap'])
        rep['画面空档'] = ([], Wn['dead'])
        rep['开场'] = ([], Wn['hook'])
        rep['小字'] = ([], Wn['small'])
        miss = {}
        [miss.setdefault(m.split('|')[0], []).append(m.split('|')[1]) for m in sc.get('miss', [])]
        need = BRIEF.get('must_show', [])
        shown = {}
        for fr in sc['frames']:
            for r in fr['tx']:
                for m in need:
                    if m in r[0] and r[5] >= 0.8:
                        shown[m] = shown.get(m, 0) + 1
        rep['必须出现的声明'] = (
            [
                f'画面上没有出现「{m}」，或停留不到 2 秒（brief.json 的 must_show 要求）'
                for m in need
                if shown.get(m, 0) * (sc['frames'][1]['t'] - sc['frames'][0]['t']) < 2
            ],
            [],
        )
        if BRIEF.get('source_article'):
            rep['原文依据'] = article_check(tl)
        rep['字体缺字'] = (
            [],
            [
                f"{'毛笔体' if k == 'Brush' else '草书'}没有这些字，会回落成楷体：{''.join(sorted(v))}（换字、换成宋体，或装全字库）"
                for k, v in miss.items()
            ],
        )
        if (
            '--no-motion' not in sys.argv
        ):  # 动效：相邻帧量出来的运动、跳变、耗时，和“同一时刻画两遍是否一样”。都是提醒：数字是线索，要看帧才能下结论
            mo = get_motion(tl, cache='--fresh' not in sys.argv)
            rows, Mw = motion_check(mo, tl)
            rep['确定性'] = ([], Mw['det'])
            rep['跳变'] = ([], Mw['jump'])
            rep['逐帧不动'] = ([], Mw['still'])
            rep['渲染耗时'] = ([], Mw['slow'])
            if PROMO:
                st, pf, pw = pace_check(mo, tl, sc)
                rep['镜头节奏'] = (pf, pw)
                print('  ', pace_line(st))
        elif PROMO:
            rep['镜头节奏'] = ([], ['加了 --no-motion：镜头节奏没有查，宣传片出片前要查一遍'])
        for k, (f, w) in rep.items():
            show(k, f, w)
        nf = sum(len(f) for f, _ in rep.values())
        nw = sum(len(w) for _, w in rep.values())
        fp, fm = fingerprint(
            'all'
        )  # 这份报告认的是哪一版输入：稿子、台账、配音、画面、引擎任何一样改了，final 都不认它
        json.dump(
            {
                'fails': nf,
                'warns': nw,
                'fp': fp,
                'files': fm,
                'detail': {k: {'fails': f, 'warns': w} for k, (f, w) in rep.items()},
            },
            open(P / 'check_report.json', 'w'),
            ensure_ascii=False,
            indent=1,
        )
        import datetime

        with open(P / 'check_history.jsonl', 'a', encoding='utf-8') as fh:
            fh.write(
                json.dumps(
                    {
                        'time': datetime.datetime.now().isoformat(timespec='seconds'),
                        'fails': nf,
                        'warns': nw,
                        'by': {k: len(f) + len(w) for k, (f, w) in rep.items()},
                    },
                    ensure_ascii=False,
                )
                + '\n'
            )  # 复盘时统计“检查拦下了什么”
        print(f'总计：{nf} 项不通过，{nw} 项提醒（提醒要逐条看帧确认，不能直接忽略）')
        sys.exit(1 if nf else 0)
    if cmd == 'motion':  # 动效数字：每句的运动面积、静止帧对、跳变、每帧耗时；最后是确定性
        mo = get_motion(tl, cache='--fresh' not in sys.argv)
        rows, Mw = motion_check(mo, tl)
        print('句子      起点    时长   运动面积(中位)  静止帧对   跳变   每帧毫秒')
        for r in rows:
            print(
                f"{r['id']:8s}{r['t0']:6.1f}s {r['dur']:5.1f}s {r['med'] * 100:10.2f}%   {r['still'] * 100:7.0f}%  {len(r['jumps']):5d}  {r['ms']:8.0f}"
                + (f"   步进，约 {r['step']} 步/秒" if r['step'] else '')
                + (f"   卡点硬切 {r['onbeat']} 处" if r['onbeat'] else '')
            )
        mv = sorted(f['mv'] for f in mo['frames'])
        n = len(mv)
        print(
            f"全片：运动面积中位数 {mv[n // 2] * 100:.2f}%，静止帧对 {sum(v < STILL_MV for v in mv) / n * 100:.0f}%，确定性 {sum(d['same'] for d in mo['det'])}/{len(mo['det'])} 处一致"
        )
        print(
            '读法：运动面积多数好看的段落在 0.5%–8%；静止帧对超过四成读起来是“一卡一卡”；跳变先看帧再判断。数字是线索，不是结论。'
        )
        for k, title in (('det', '确定性'), ('jump', '跳变'), ('still', '逐帧不动'), ('slow', '渲染耗时')):
            show(title, [], Mw[k])
        sc_ = get_scan(tl)
        print(pace_line(pace_stats(mo, tl, sc_)))
        if PROMO:
            st, pf, pw = pace_check(mo, tl, sc_)
            show('镜头节奏', pf, [w for w in pw if 'slogan' not in w])
        sys.exit()
    if cmd == 'mix':
        sc = get_scan(tl)
        ev = list(sc['events'])
        seen = set()
        for s in tl:  # 每换一章加一声转场
            if s['ch'] not in seen and seen:
                ev.append({'type': 'whoosh', 't': s['t0'] - 0.25})
            seen.add(s['ch'])
        clipev = [e for e in ev if e['type'].startswith('clip:')]
        ev = (
            [e for e in ev if not e['type'].startswith('clip:')] if BRIEF.get('sfx', True) else []
        )  # brief.json 写 "sfx":false 就不加音效（水墨一类安静的片子）
        duck = BRIEF.get('duck', 12)
        orig = None
        if duck is False or not clipev:
            n = sfx_track(ev, total, clips=clipev)
            print(
                '音效', n, '个', f'素材原声 {sum(1 for e in clipev if e["gain"] > 0)} 段' if clipev else ''
            )  # 没有原声或 duck:false：和旧做法一样，原声混在音效轨里
        else:
            n = sfx_track(ev, total)
            no, sec = orig_track(clipev, total, tl, duck=duck)
            print('音效', n, '个', f'素材原声 {no} 段（单独一轨，旁白下压低 {duck} dB，共 {sec:.1f} 秒）')
            if no:
                orig = 'orig.wav'
        music(total, tl=tl)
        mixdown(
            'vo.wav',
            'music.wav',
            'mix.wav',
            'sfx.wav',
            mu_db=MU_DB() + 15 * sum(s['dur'] for s in tl if silent(s)) / max(1, sum(s['dur'] for s in tl)),
            orig=orig,
        )
        remember('mix.wav', 'snd')
        sys.exit()
    if cmd == 'final':
        name = sys.argv[2]
        r = jload('check_report.json')
        why = []
        if not r:
            why.append('还没跑 check')
        elif r['fails']:
            why.append(f"check 有 {r['fails']} 项不通过")
        elif 'fp' not in r:
            why.append('check 报告没有版本指纹（旧版引擎写的），重跑 check')
        else:
            fp, fm = fingerprint('all')
            if fp != r['fp']:
                why.append('check 之后输入改过：' + fp_diff(r.get('files', {}), fm) + '，重跑 check')
        lead = BRIEF.get('cover_lead', not (PROMO or TALK)) is not False
        for out, how in [('silent.mp4', 'render'), ('mix.wav', 'mix')] + ([(COVER_NAME, 'cover')] if lead else []):
            s = stale(out)
            if s:
                why.append(f'{s}（重跑 {how}）')
        if why:
            print('不能出片：')
            [print('    ✗', w) for w in why]
            if '--force' not in sys.argv:
                print('都处理完再 final；确实要出片就加 --force（交付时要说明哪一项没过）')
                sys.exit(1)
            print('    加了 --force，照样出片：交付说明里要写明上面这几项')
        if (
            BRIEF.get('cover_lead', not (PROMO or TALK)) is False
        ):  # 不在片头垫封面（无旁白的短片从黑场开始）。silent.mp4 是母版（crf 低、很大），这里压成能上传的大小：码率封顶 12M
            subprocess.run(
                [
                    'ffmpeg',
                    '-y',
                    '-loglevel',
                    'error',
                    '-i',
                    'silent.mp4',
                    '-i',
                    'mix.wav',
                    '-map',
                    '0:v',
                    '-map',
                    '1:a',
                    '-c:v',
                    'libx264',
                    '-crf',
                    str(BRIEF.get('final_crf', 20)),
                    '-maxrate',
                    '12M',
                    '-bufsize',
                    '24M',
                    '-preset',
                    'medium',
                    '-pix_fmt',
                    'yuv420p',
                    '-c:a',
                    'aac',
                    '-b:a',
                    '256k',
                    '-shortest',
                    '-movflags',
                    '+faststart',
                    name + '.mp4',
                ],
                check=True,
            )
            verify_out(name + '.mp4', total)
            srt([c for s in tl for c in s['chunks']], P / (name + '.srt'), 0)
            credits_file(name)
            print('已出', name + '.mp4', name + '.srt')
            sys.exit()
        subprocess.run(
            [
                'ffmpeg',
                '-y',
                '-loglevel',
                'error',
                '-loop',
                '1',
                '-framerate',
                '30',
                '-t',
                str(COVER),
                '-i',
                COVER_NAME,
                '-f',
                'lavfi',
                '-t',
                str(COVER),
                '-i',
                'anullsrc=r=44100:cl=stereo',
                '-i',
                'silent.mp4',
                '-i',
                'mix.wav',
                '-filter_complex',
                f"[0:v]scale={CW}:{CH},format=yuv420p,fade=t=out:st=1.6:d=0.4,setsar=1[c];[2:v]fps=30,format=yuv420p,setsar=1[m];[3:a]aresample=44100[ma];[c][1:a][m][ma]concat=n=2:v=1:a=1[v][a]",
                '-map',
                '[v]',
                '-map',
                '[a]',
                '-c:v',
                'libx264',
                '-crf',
                '24',
                '-preset',
                'medium',
                '-pix_fmt',
                'yuv420p',
                '-c:a',
                'aac',
                '-b:a',
                '192k',
                '-movflags',
                '+faststart',
                name + '.mp4',
            ],
            check=True,
        )
        verify_out(name + '.mp4', COVER + total)
        srt([c for s in tl for c in s['chunks']], P / (name + '.srt'), COVER)
        credits_file(name)
        print('已出', name + '.mp4', name + '.srt')
        print('交付后做复盘，把这条片记进模板台账：python3 ../kit/workshop.py retro --delivered')
        sys.exit()
    if cmd == 'short':
        if VERT:
            print('这条片本身就是竖版，不需要 short；横版片才用 short 另出竖版')
            sys.exit(1)
        sub_ = sys.argv[2] if len(sys.argv) > 2 else ''
        if sub_ not in ('check', 'stills', 'render') or (sub_ == 'render' and len(sys.argv) < 4):
            print('用法：short check | short stills | short render 名字')
            sys.exit(1)
        lf, lw = short_lint(tl)
        if lf:
            show('竖版短片稿', lf, lw)
            sys.exit(1)
        if sub_ == 'check':  # 竖版短片自己的检查：它是单独发布的，横版的 check 只查过横版画布
            segs, stot = short_plan(tl)
            print('竖版短片时长', round(stot, 2))
            rep = {'竖版短片稿': (lf, lw), **short_check(tl, get_scan(tl, cache='--fresh' not in sys.argv), segs, stot)}
            for k, (f, w) in rep.items():
                show(k, f, w)
            nf = sum(len(f) for f, _ in rep.values())
            nw = sum(len(w) for _, w in rep.values())
            fp, fm = fingerprint('all')
            json.dump(
                {
                    'fails': nf,
                    'warns': nw,
                    'fp': fp,
                    'files': fm,
                    'detail': {k: {'fails': f, 'warns': w} for k, (f, w) in rep.items()},
                },
                open(P / 'short_check_report.json', 'w'),
                ensure_ascii=False,
                indent=1,
            )
            print(f'竖版短片：{nf} 项不通过，{nw} 项提醒（提醒要看 short stills 的定格确认）')
            sys.exit(1 if nf else 0)
        if sub_ == 'render':  # 和 final 一样：检查报告、竖版封面都要是当前这一版
            r = jload('short_check_report.json')
            why = []
            if not r:
                why.append('还没跑 short check')
            elif r['fails']:
                why.append(f"short check 有 {r['fails']} 项不通过")
            else:
                fp, fm = fingerprint('all')
                if fp != r.get('fp'):
                    why.append('short check 之后输入改过：' + fp_diff(r.get('files', {}), fm) + '，重跑 short check')
            s_ = stale('封面_竖版.png')
            if s_:
                why.append(f'{s_}（重跑 cover）')
            if why:
                print('不能出竖版短片：')
                [print('    ✗', w) for w in why]
                if '--force' not in sys.argv:
                    print('都处理完再 short render；确实要出就加 --force（交付时要说明哪一项没过）')
                    sys.exit(1)
                print('    加了 --force，照样出片：交付说明里要写明上面这几项')
    from playwright.sync_api import sync_playwright

    with sync_playwright() as p:
        b, pg, total, errs = browser(p, tl)
        grab = lambda t: base64.b64decode(
            pg.evaluate(
                "async t=>{await window.renderFrameA(t);return document.getElementById('c').toDataURL('image/jpeg',.93)}",
                t,
            ).split(',')[1]
        )
        if cmd == 'stills':
            od = P / (sys.argv[3] if len(sys.argv) > 3 else 'stills')
            od.mkdir(exist_ok=True)
            if len(sys.argv) > 3 and re.fullmatch(r'[\d.]+', sys.argv[3]):
                print('时刻用逗号隔开写成一个参数：stills 3,10,20 [目录]')
                sys.exit(1)
            for t in sys.argv[2].split(','):
                (od / f't{float(t):06.2f}.jpg').write_bytes(grab(float(t)))
        elif cmd == 'sheet':  # 总览图：每 N 秒一帧，9 帧一张，存到 sheets/
            from PIL import Image
            import io

            step = float(sys.argv[2]) if len(sys.argv) > 2 else 5
            od = P / 'sheets'
            od.mkdir(exist_ok=True)
            ts = list(np.arange(step / 2, total - 1, step))
            for n in range(0, len(ts), 9):
                im = Image.new('RGB', (CW, CH))
                tw_, th_ = CW // 3, CH // 3
                for i, t in enumerate(ts[n : n + 9]):
                    im.paste(Image.open(io.BytesIO(grab(float(t)))).resize((tw_, th_)), ((i % 3) * tw_, (i // 3) * th_))
                im.save(od / f'sheet{n // 9:02d}_{ts[n]:.0f}s.jpg', quality=86)
            print('总览图', -(-len(ts) // 9), '张，在 sheets/')
        elif cmd == 'render':
            (P / 'render.pid').write_text(
                str(os.getpid())
            )  # 要停后台渲染：kill $(cat render.pid)；别用 pkill/pgrep -f，会匹配到发命令的那个 shell 自己
            ff = pipe(P / (sys.argv[2] if len(sys.argv) > 2 else 'silent.mp4'))
            n = round(total * FPS)
            for i in range(n):
                ff.stdin.write(grab(i / FPS))
                if i % 600 == 0:
                    print(i, n, flush=True)
            ff.stdin.close()
            rc = ff.wait()
            out = P / (sys.argv[2] if len(sys.argv) > 2 else 'silent.mp4')
            if rc:
                print(f'编码失败：ffmpeg 退出码 {rc}，{out.name} 不能用', flush=True)
                sys.exit(1)
            pr = (
                subprocess.run(
                    [
                        'ffprobe',
                        '-v',
                        'error',
                        '-select_streams',
                        'v:0',
                        '-count_packets',
                        '-show_entries',
                        'stream=width,height,nb_read_packets',
                        '-of',
                        'csv=p=0',
                        str(out),
                    ],
                    capture_output=True,
                    text=True,
                )
                .stdout.strip()
                .split(',')
            )
            if len(pr) < 3 or (int(pr[0]), int(pr[1])) != (CW, CH) or abs(int(pr[2]) - n) > 2:
                print(f'输出不对：{out.name} 是 {pr}，应为 {CW}x{CH}、{n} 帧', flush=True)
                sys.exit(1)
            if errs:
                print('页面报错，', out.name, '不能用：', errs[:5], flush=True)
                sys.exit(1)
            remember(out.name, 'pic')
            print('done', n, flush=True)
        elif cmd == 'cover':
            for v, name in (
                [('wide', '封面_横版.png'), ('tall', '封面_竖版.png')]
                if not VERT
                else [('vert', '封面_9x16.png'), ('tall', '封面_3x4.png')]
            ):
                (P / name).write_bytes(base64.b64decode(pg.evaluate('v=>window.coverFrame(v)', v).split(',')[1]))
                if not errs:
                    remember(name, 'pic')  # 页面报错时画出来的封面不算数，final 会拦
        elif cmd == 'short':
            segs, stot = short_plan(tl)
            print('短片时长', round(stot, 2))
            vf = lambda t: base64.b64decode(
                pg.evaluate('([t,s,p])=>window.vertFrameA(t,s,p)', [*short_at(segs, t), t / stot]).split(',')[1]
            )
            if sys.argv[2] == 'stills':
                for k, s in enumerate(segs):
                    (P / f'short_still_{k}.jpg').write_bytes(vf(s['t0'] + (s['t1'] - s['t0']) * 0.8))
            else:
                ff = pipe(P / 'short_silent.mp4', 20)
                for i in range(round(stot * FPS)):
                    ff.stdin.write(vf(i / FPS))
                ff.stdin.close()
                rc = ff.wait()
                nf = round(stot * FPS)
                if rc or errs:
                    print(f'✗ 竖版短片画面没出好：' + (f'ffmpeg 退出码 {rc}' if rc else f'页面报错 {errs[:3]}'))
                    sys.exit(1)
                music(stot, 'short_music.wav')
                mixdown('short_vo.wav', 'short_music.wav', 'short_mix.wav', mu_db=MU_DB())
                subprocess.run(
                    [
                        'ffmpeg',
                        '-y',
                        '-loglevel',
                        'error',
                        '-i',
                        'short_silent.mp4',
                        '-i',
                        'short_mix.wav',
                        '-loop',
                        '1',
                        '-framerate',
                        '30',
                        '-t',
                        '2.5',
                        '-i',
                        '封面_竖版.png',
                        '-f',
                        'lavfi',
                        '-t',
                        '2.5',
                        '-i',
                        'anullsrc=r=44100:cl=stereo',
                        '-filter_complex',
                        "[0:v]fps=30,format=yuv420p,setsar=1[m];[1:a]aresample=44100[ma];[2:v]scale=1080:1440,pad=1080:1920:0:240:color=0x061230,format=yuv420p,fade=t=in:st=0:d=0.3,setsar=1[e];[m][ma][e][3:a]concat=n=2:v=1:a=1[v][a]",
                        '-map',
                        '[v]',
                        '-map',
                        '[a]',
                        '-c:v',
                        'libx264',
                        '-crf',
                        '22',
                        '-preset',
                        'medium',
                        '-pix_fmt',
                        'yuv420p',
                        '-c:a',
                        'aac',
                        '-b:a',
                        '192k',
                        '-movflags',
                        '+faststart',
                        sys.argv[3] + '.mp4',
                    ],
                    check=True,
                )
                verify_out(sys.argv[3] + '.mp4', stot + 2.5, 1080, 1920)  # 片尾垫 2.5 秒竖版封面
                srt([c for s in segs for c in s['chunks']], P / (sys.argv[3] + '.srt'))
                print('已出', sys.argv[3] + '.mp4')
        if errs:
            print('页面报错', errs[:5])
            sys.exit(1)
        b.close()
