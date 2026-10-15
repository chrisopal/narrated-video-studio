"""检查：断言台账、叙事线、素材授权、回听、整片扫描（阅读时长、出画、字幕带、重叠、小字、空档、开场）、原文依据、动效、宣传线的样子和镜头节奏。"""

import json
import re
from .base import (
    BASIS,
    BRIEF,
    CJK,
    DEAD_SEC,
    EXCERPT_MAX,
    EXCERPT_SHARE,
    FPS,
    HOOK_SEC,
    KIT,
    LOOK,
    LOOKS,
    NEED_CREDIT,
    NUMISH,
    P,
    PROMO,
    SAFE,
    SUPERLATIVE,
    TALK,
    TIERS,
    VERT,
    jload,
    need_seconds,
    silent,
)
from .voice import wav_sha, words
from .footage import assets


# ---------- 检查 ----------
def facts_check(tl):
    """facts.json：[{claim, status: verified|inferred|conceptual, source, where:[句id]}]"""
    f = P / 'facts.json'
    fails = []
    warns = []
    if not f.exists():
        return ['没有 facts.json：每个数字、年份、人名、因果都要进事实台账'], []
    F = json.load(open(f))
    covered = set()
    for i, x in enumerate(F):
        tag = f"第{i + 1}条「{x.get('claim', '')[:16]}」"
        if x.get('status') == 'todo':
            fails.append(
                tag
                + ' 还是 todo：这是从文章里扫出来的说法，查证后改成 verified / inferred / opinion / quote，稿子里不用它就删掉这条'
            )
            continue
        if x.get('status') not in ('verified', 'inferred', 'conceptual', 'opinion', 'quote'):
            fails.append(tag + ' 的 status 要填 verified / inferred / conceptual / opinion / quote')
        if x.get('status') == 'quote' and not x.get('source'):
            fails.append(tag + ' 是引文，source 要写出处（书名章节页码、讲话场合日期或网址）')
        if x.get('status') == 'opinion' and not x.get('note'):
            warns.append(tag + ' 是观点，note 里写清是谁的观点，稿子里不能说成事实')
        if x.get('status') == 'verified' and not str(x.get('source', '')).startswith('http'):
            fails.append(tag + ' 标了已核实，但 source 不是网址')
        if x.get('status') == 'inferred' and not x.get('note'):
            warns.append(tag + ' 是推断，请在 note 里写依据，稿子里用“大约/可能”这类说法')
        # 来源层级（企业类题材必填）：政府名单 / 公司披露 / 公司自述 / 第三方报告 / 媒体
        tier = x.get('tier')
        if tier is not None and tier not in TIERS:
            fails.append(tag + ' 的 tier 要填 ' + ' / '.join(TIERS))
        if tier == '公司自述' and x.get('status') == 'verified':
            fails.append(tag + ' 是公司自述，不能标成已核实：status 写 opinion，稿子里写“公司称”')
        if tier == '第三方报告' and not x.get('note'):
            fails.append(tag + ' 是第三方报告：note 里写清是哪家机构、谁委托、按什么口径统计')
        if tier == '媒体' and x.get('status') == 'verified':
            warns.append(tag + ' 只有媒体报道：关键事实要找到政府名单或公司公告原件再标已核实')
        if BRIEF.get('tiers_required') and tier is None:
            fails.append(tag + ' 没有填 tier（来源层级）：这个题材要求每条都填')
        covered |= set(x.get('where', []))
    ids = {s['id'] for s in tl} | (
        {l['id'] for l in json.load(open(P / 'short.json'))} if (P / 'short.json').exists() else set()
    )
    for w in covered - ids:
        fails.append(f'台账引用了不存在的句子 {w}')
    for s in tl:
        if NUMISH.search(s['vo']) and s['id'] not in covered:
            warns.append(f"{s['id']} 里有数字或量词，但没有任何一条事实指向它：{s['vo'][:22]}…")
        if SUPERLATIVE.search(s['vo']) and not any(
            s['id'] in x.get('where', []) and x.get('status') == 'verified' for x in F
        ):
            warns.append(
                f"{s['id']} 有“最/第一/领先”这类说法，但没有已核实的事实支撑：{SUPERLATIVE.search(s['vo']).group(0)}"
            )
    return fails, warns


BEATS = ('钩子', '铺垫', '推进', '转折', '揭示', '高潮', '回扣', '收束')


def story_check(tl):
    """叙事线：创意方向写清了没有、开头抛出的问题结尾有没有回答、有没有转折、结尾回不回扣开头、和以前的片子是不是太像。规矩见 templates/叙事与创意.md"""
    D = BRIEF.get('direction')
    fails = []
    warns = []
    S = [s for s in tl if not silent(s)] or tl
    if not D:
        return [], [
            'brief.json 没有 direction（创意方向）：先按 templates/叙事与创意.md 拆提示词、比较三个方向，把选中的写进 brief'
        ]
    if not D.get('logline'):
        fails.append('direction.logline 没写：用一句话说清“这条片讲什么、为什么值得看”')
    elif len(D['logline']) > 50:
        warns.append(f"direction.logline 有 {len(D['logline'])} 字：一句话说不清，说明方向还没想清楚（50 字以内）")
    mute = all(silent(s) for s in tl)  # 整条无旁白：没有“问与答”，也谈不上钩子句式；结构、转折、收束照样要有
    for k, why in (
        ('structure', '叙事结构（从手法库里选，或写明自创的）'),
        ('angle', '视角：谁在讲、离事件多远'),
        ('hook_type', '开场钩子用哪一种'),
    ):
        if not D.get(k) and not (mute and k == 'hook_type'):
            warns.append(f'direction.{k} 没写：{why}')
    if len(D.get('alternatives', [])) < 2:
        warns.append('direction.alternatives 少于两个：没和别的方向比过，容易做成上一条的样子')
    ids = [s['id'] for s in S]
    asks = {}
    answers = {}
    for i, s in enumerate(S):
        for q in ([s['ask']] if isinstance(s.get('ask'), str) else s.get('ask') or []):
            asks.setdefault(q, i)  # 写成 null 也不崩
        for q in ([s['answer']] if isinstance(s.get('answer'), str) else s.get('answer') or []):
            answers.setdefault(q, i)
        if s.get('beat') and s['beat'] not in BEATS:
            warns.append(f"{s['id']} 的 beat「{s['beat']}」不在 {'/'.join(BEATS)} 里")
    for q, i in asks.items():
        if q not in answers:
            fails.append(f'{ids[i]} 抛出的问题「{q}」到结尾都没有回答（在回答它的那句写 "answer":"{q}"）')
        elif answers[q] < i:
            fails.append(f'问题「{q}」在 {ids[answers[q]]} 先回答、{ids[i]} 才抛出：顺序反了')
    for q, i in answers.items():
        if q not in asks:
            warns.append(f'{ids[i]} 回答了「{q}」，但前面没有哪句把它问出来（在提问的那句写 "ask":"{q}"）')
    if not asks and not mute:
        warns.append('全片没有一句 ask：开头没抛出观众想知道答案的问题，后面就没有“为什么要看下去”')
    beats = [s.get('beat') for s in S]
    if any(beats):
        if beats[0] not in ('钩子', None) and S[0]['t0'] < 4:
            warns.append(f'第一句的 beat 是「{beats[0]}」：开头 3 秒要是钩子')
        mid = beats[len(beats) // 5 : len(beats) * 9 // 10]
        if not any(b in ('转折', '揭示', '高潮') for b in mid):
            warns.append('中段没有转折、揭示或高潮：整条片是平的，观众没有“原来如此”的时刻')
        if beats[-1] not in ('回扣', '收束') and beats[-2:].count('回扣') == 0:
            warns.append('最后一两句不是回扣或收束：结尾没有回到开头')
    else:
        warns.append('script.json 没有标 beat（钩子/铺垫/推进/转折/揭示/高潮/回扣/收束）：标上才能检查叙事线')
    cb = D.get('callback')
    if cb and not mute:  # 无旁白的片子回扣在画面上，这里查不了
        head = ''.join(s['vo'] for s in S[:3])
        tail = ''.join(s['vo'] for s in S[-3:])
        if cb not in head or cb not in tail:
            warns.append(
                f'回扣词「{cb}」要在前三句和后三句的旁白里都出现（现在：开头{"有" if cb in head else "没有"}，结尾{"有" if cb in tail else "没有"}）'
            )
    # 和以前的片子太像：结构、钩子、视角、声音、风格五样里有三样一样
    try:
        films = json.load(open(KIT.parent / 'templates' / 'registry.json', encoding='utf-8')).get('films', [])
    except Exception:
        films = []
    me = {
        'structure': D.get('structure'),
        'hook': D.get('hook_type'),
        'angle': D.get('angle'),
        'voice': (BRIEF.get('voice') or {}).get('voice'),
        'style': BRIEF.get('style'),
    }
    for f in films[-6:]:
        if f.get('title') == BRIEF.get('title'):
            continue
        same = [k for k, v in me.items() if v and f.get(k) == v]
        if len(same) >= 3:
            warns.append(
                f"和《{f['title']}》太像：{'、'.join(same)} 都一样。换掉其中两样（见 叙事与创意.md「不千篇一律」）"
            )
    return fails, warns


def assets_check(used):
    """素材授权：每条素材要有依据、来源、作者；需要署名的要有 credit；用到的视频要已切片；画面里用了台账外的图片也算不通过。"""
    A = assets()
    fails = []
    warns = []
    ids = set()
    ex_total = [0.0]
    for a in A:
        tag = f"素材 {a.get('id', '?')}"
        ids.add(a.get('id'))
        if a.get('type') not in ('video', 'image'):
            fails.append(tag + ' 的 type 要填 video 或 image')
        if not (P / a.get('file', '')).is_file():
            fails.append(tag + ' 的文件不存在：' + str(a.get('file')))
        if a.get('usage_basis') not in BASIS:
            fails.append(
                tag
                + f" 的 usage_basis 是「{a.get('usage_basis')}」。只能是 {' / '.join(BASIS)}；授权不明的素材不能进成片"
            )
        if not a.get('source'):
            fails.append(tag + ' 没写 source（网址；自有素材写拍摄人和日期）')
        if not a.get('creator'):
            fails.append(tag + ' 没写 creator（作者或机构）')
        if a.get('usage_basis') in NEED_CREDIT and not a.get('credit'):
            fails.append(tag + ' 需要署名，但没写 credit（画面上显示的署名文字）')
        if a.get('usage_basis') == 'licensed' and not a.get('proof'):
            fails.append(tag + ' 标了已获授权，proof 里要写授权凭据（谁、何时、什么范围）')
        if a.get('usage_basis') == 'licensed' and a.get('proof_file') and not (P / a['proof_file']).is_file():
            fails.append(tag + ' 的授权凭证文件不存在：' + a['proof_file'])
        if a.get('usage_basis') == 'licensed' and not a.get('proof_file'):
            warns.append(tag + ' 是授权素材：把书面授权（邮件、授权书扫描件）放进项目，proof_file 写它的路径')
        if a.get('usage_basis') == 'cc-by-sa':
            warns.append(tag + ' 是 CC BY-SA：成片里用到它的部分要以相同方式共享')
        if a.get('usage_basis') == 'excerpt':
            if not str(a.get('source', '')).startswith('http'):
                fails.append(tag + ' 是引用片段：source 要写下载它的网页地址')
            if not a.get('owner') and not a.get('creator'):
                fails.append(tag + ' 是引用片段：owner 写版权方（哪家公司、哪个媒体）')
            if 'clip' in a:
                d = a['clip'].get('dur', 0)
                ex_total[0] += d
                if d > EXCERPT_MAX:
                    fails.append(
                        tag
                        + f' 是引用片段，切了 {d:.1f} 秒，超过 {EXCERPT_MAX} 秒：只取最能说明问题的一段（brief 的 excerpt_max 可调）'
                    )
        if a.get('type') == 'video' and 'clip' not in a:
            fails.append(tag + ' 还没切片：python3 ../kit/build.py clips')
        if a.get('type') == 'video' and a['id'] not in used:
            warns.append(tag + ' 在台账里但成片没用到')
    for u in used:
        if u not in ids:
            fails.append(f'画面用了台账里没有的片段 {u}')
    tl = jload('timeline.json', []) or []
    total = max([x.get('t1', 0) + x.get('hold', 0) for x in tl] + [0])
    if ex_total[0] and total and ex_total[0] > EXCERPT_SHARE * total:
        warns.append(
            f'引用片段合计 {ex_total[0]:.0f} 秒，超过全片的 {EXCERPT_SHARE:.0%}：引用要为讲解服务，不能变成搬运'
        )
    return fails, warns


def asr_check(tl):
    W = words()
    fails = []
    warns = []
    lines = [
        l
        for l in list(tl) + (json.load(open(P / 'short.json')) if (P / 'short.json').exists() else [])
        if not silent(l)
    ]
    if not lines:
        return [], []
    if not W:
        return ['还没做配音回听：python3 ../kit/asr.py'], []
    for l in lines:
        w = W.get(l['id'])
        if not w or w.get('text') != (l.get('tts') or l['vo']):
            fails.append(f"{l['id']} 的稿子或配音改过，要重新回听")
            continue
        if not w.get('wav'):
            fails.append(f"{l['id']} 的回听记录没有音频指纹（旧版 asr.py 写的），重跑 python3 ../kit/asr.py")
            continue
        if w['wav'] != wav_sha(l['id']):
            fails.append(
                f"{l['id']} 的音频在回听之后换过（audio/{l['id']}.wav 和听过的那份不是同一个文件），重跑 python3 ../kit/asr.py"
            )
            continue
        d = '；'.join(f"{x['稿子'] or '∅'}→{x['听到'] or '∅'}" for x in w['diffs'])
        if not (w['ok'] or l.get('asr_ok')):
            fails.append(f"{l['id']} 回听不符（{w['score']}）：{d}")
        elif d and not l.get('asr_ok'):
            warns.append(f"{l['id']} 有个别字识别不同，请人听一下：{d}")
    return fails, warns


def scan_check(sc):
    """用整片扫描结果查：文字停留、出画、压字幕带、文字互相重叠、画面空档、开场。"""
    W, H, step = sc['W'], sc['H'], sc['frames'][1]['t'] - sc['frames'][0]['t']
    fails = {k: [] for k in ('read', 'frame', 'clip')}
    crun = {}
    warns = {k: [] for k in ('subzone', 'overlap', 'dead', 'hook', 'small')}
    small = {}
    fails['unsafe'] = []
    urun = {}
    key = lambda s: re.sub(r'[\d.,]+', '#', s)
    runs = {}
    inside = set()
    seen = {}
    zone = (
        (W / 2 - 520, H - 118, W / 2 + 520, H - 40)
        if not VERT
        else (SAFE[3], H - SAFE[2] - 130, W - SAFE[1], H - SAFE[2])
    )
    st, sr, sb, sl = SAFE
    safe_ok = lambda b: b[0] >= sl - 2 and b[1] >= st - 2 and b[2] <= W - sr + 2 and b[3] <= H - sb + 2
    zrun = {}
    orun = {}
    hit = lambda a, b: min(a[2], b[2]) - max(a[0], b[0]) > 0 and min(a[3], b[3]) - max(a[1], b[1]) > 0
    for fr in sc['frames']:
        t = fr['t']
        vis = set()
        allb = [(key(s), (x0, y0, x1, y1), a) for s, x0, y0, x1, y1, a, *_ in fr['tx'] if s.strip()]
        fsz = {key(r[0]): r[6] for r in fr['tx'] if len(r) > 6}
        vert = {
            key(s) for s, x0, y0, x1, y1, a, *_ in fr['tx'] if len(CJK.findall(s)) > 1 and (y1 - y0) > 1.6 * (x1 - x0)
        }
        boxes = [x for x in allb if re.search(r'[A-Za-z一-鿿]', x[0])]
        # brand() 里画的品牌字（账号名、口号）：不算阅读时长、允许在平台遮挡区和字幕带以外的边角；小字、出画、重叠照查
        brandk = {key(r[0]) for r in fr['tx'] if len(r) > 7 and r[7] == 'brand'}
        for r in fr['tx']:  # 画在会裁切的画框里的字：逐条比（同一句话框外也可能出现，比如章节题签，不能按文字合并）
            if len(r) > 8 and r[8] and r[5] >= 0.8 and r[0].strip():
                c = r[8]
                if r[1] < c[0] - 3 or r[2] < c[1] - 3 or r[3] > c[2] + 3 or r[4] > c[3] + 3:
                    crun.setdefault(key(r[0]), []).append(t)
        for k, b, a in boxes:
            if a >= 0.8:
                seen.setdefault(k, t)
                px = fsz[k] if k in fsz else (b[2] - b[0]) if k in vert else (b[3] - b[1]) / 1.02
                if px < MIN_PX - 1.5:
                    small.setdefault(k, (t, px))
                if b[0] >= -2 and b[1] >= -2 and b[2] <= W + 2 and b[3] <= H + 2:
                    if k not in brandk:
                        vis.add(k)
                    inside.add(k)
            if a >= 0.6 and hit(b, zone):
                zrun.setdefault(k, []).append(t)
            if VERT and a >= 0.6 and not safe_ok(b) and k not in brandk:
                urun.setdefault(k, []).append(t)
        for i in range(len(allb)):  # 重叠检查把纯数字也算上
            for j in range(i + 1, len(allb)):
                (k1, b1, a1), (k2, b2, a2) = allb[i], allb[j]
                if k1 != k2 and a1 >= 0.6 and a2 >= 0.6 and hit(b1, b2):
                    ov = (min(b1[2], b2[2]) - max(b1[0], b2[0])) * (min(b1[3], b2[3]) - max(b1[1], b2[1]))
                    sm = min((b[2] - b[0]) * (b[3] - b[1]) for b in (b1, b2))
                    if ov > 0.15 * max(1, sm):
                        orun.setdefault(tuple(sorted((k1, k2))), []).append(t)
        for k in vis:
            r = runs.setdefault(k, [])
            if r and abs(r[-1][1] - (t - step)) < step / 2:
                r[-1][1] = t
            else:
                r.append([t, t])
    for k, rs in runs.items():
        n = need_seconds(k)
        for a, b in rs:
            got = b - a + step
            if got < n - 1e-6:
                fails['read'].append(f"{a:6.1f}s 「{k[:18]}」停留 {got:.1f}s，至少要 {n:.1f}s")
    for k, t in seen.items():
        if k not in inside:
            fails['frame'].append(f"{t:6.1f}s 「{k[:18]}」从没完整出现在画面里（被裁边）")
    for k, ts in crun.items():
        if len(ts) * step >= 0.3:
            fails['clip'].append(
                f"{ts[0]:6.1f}s 「{k[:18]}」被画框裁掉一截 {len(ts) * step:.1f}s（常见原因：镜头推近把贴边的字推出框）"
            )
    for k, ts in zrun.items():
        if len(ts) * step >= 0.3:
            warns['subzone'].append(f"{ts[0]:6.1f}s 「{k[:18]}」进入字幕带 {len(ts) * step:.1f}s")
    for k, ts in urun.items():
        if len(ts) * step >= 0.5:
            fails['unsafe'].append(
                f"{ts[0]:6.1f}s 「{k[:18]}」在平台遮挡区里 {len(ts) * step:.1f}s：会被标题、文案或按钮盖住，挪进 safeBox()"
            )
    for (a, b), ts in orun.items():
        if len(ts) * step >= 0.5:
            warns['overlap'].append(f"{ts[0]:6.1f}s 「{a[:12]}」和「{b[:12]}」重叠 {len(ts) * step:.1f}s")
    for k, (t, px) in small.items():
        warns['small'].append(f"{t:6.1f}s 「{k[:18]}」只有 {px:.0f} 像素，手机上读不清（至少 {MIN_PX}）")
    # 画面空档：连续 4 秒以上几乎不动
    quiet = None
    for fr in sc['frames'][5:-30] + [
        {'t': sc['frames'][-30]['t'] if PROMO else sc['total'], 'df': 9}
    ]:  # 宣传线：片尾定格的那三秒不算空档
        if fr['df'] < DEAD_DF:
            quiet = fr['t'] if quiet is None else quiet
        else:
            if quiet is not None and fr['t'] - quiet >= DEAD_SEC:
                warns['dead'].append(
                    f"{quiet:6.1f}s 起 {fr['t'] - quiet:.1f}s 画面几乎不动："
                    + ('宣传片里两秒不动就是掉拍，换镜头或让主体动起来' if PROMO else '给这一段加一个和旁白对应的动作')
                )
            quiet = None
    first = min([t for t in seen.values()] + [e['t'] for e in sc['events']] + [99])
    S = jload('script.json', []) or []
    if S and all(silent(x) for x in S):
        # 整条无旁白的片子：开场的内容可以就是画面本身（点、粒子、镜头在走），画面明显在变就算落地。有旁白的片子还是只认字和音效
        first = min([first] + [f['t'] for f in sc['frames'][1:] if f['df'] > MOVING_DF][:1])
    if first > HOOK_SEC:
        warns['hook'].append(f"开场 {first:.1f}s 才出现第一个内容：前 1 秒就该有东西落地")
    return fails, warns


DEAD_DF = 0.12
MOVING_DF = 1.0  # 相邻两张缩略图平均每个通道差 1 以上：画面明显在动（开场检查对无旁白的片子用）
MIN_PX = 32 if not VERT else 40  # 竖版在手机上整屏看，字再大一点

# ---------- 文章转视频：原文依据 ----------
ARTICLE_BASIS = {'own': '自己的文章', 'licensed': '已获原作者书面授权', 'commentary': '介绍和评论别人的文章'}


def article_check(tl):
    """brief.json 有 source_article（这条片是从一篇文章来的）时查：凭什么用这篇文章、画面上有没有注明出处、视频稿是不是在照念原文。规矩见 templates/文章转视频.md"""
    SA = BRIEF.get('source_article') or {}
    fails = []
    warns = []
    basis = SA.get('basis')
    if basis not in ARTICLE_BASIS:
        fails.append(
            "source_article.basis 要填：own（"
            + ARTICLE_BASIS['own']
            + "）/ licensed（"
            + ARTICLE_BASIS['licensed']
            + "）/ commentary（"
            + ARTICLE_BASIS['commentary']
            + "，只能用自己的话讲、少量引用）。这一项要问用户，不能替他猜"
        )
    if basis == 'licensed' and not SA.get('proof'):
        fails.append('source_article 标了已获授权：proof 里写授权人、范围、日期（凭证文件放进项目，写在 proof_file）')
    credit = SA.get('credit')
    if basis != 'own' and (not credit or credit not in BRIEF.get('must_show', [])):
        fails.append(
            '别人的文章要在画面上注明出处：把 source_article.credit 这一句原样写进 brief.json 的 must_show（检查会确认它清楚显示 ≥2 秒）'
        )
    f = P / 'article' / 'article.json'
    if not f.exists():
        warns.append('没有 article/article.json，没法比对视频稿和原文（python3 ../kit/article.py fetch 网址）')
        return fails, warns
    D = json.load(open(f, encoding='utf-8'))
    norm = lambda x: re.sub(r'[^\u4e00-\u9fffA-Za-z0-9]', '', x)
    if SA.get('sha') and D['meta'].get('sha') and SA['sha'] != D['meta']['sha']:
        warns.append(
            'article/ 里的文章和 brief.json 记的不是同一版（重新取过文？）：确认用的是哪一版，把 source_article.sha 改过来'
        )
    art = norm(
        ''.join(
            b.get('text', '') for b in D['blocks'] if not b.get('boiler') and b['type'] in ('p', 'quote', 'li', 'h')
        )
    )
    vo = norm(''.join(s.get('vo', '') for s in tl if not silent(s)))
    K = 12
    if len(vo) < K or len(art) < K:
        return fails, warns
    grams = {art[i : i + K] for i in range(len(art) - K + 1)}
    hit = [False] * len(vo)
    for i in range(len(vo) - K + 1):
        if vo[i : i + K] in grams:
            hit[i : i + K] = [True] * K
    ratio = sum(hit) / len(vo)
    run = best = 0
    for h in hit:
        run = run + 1 if h else 0
        best = max(best, run)
    if basis == 'commentary':
        if ratio > 0.25:
            fails.append(
                f'旁白有 {ratio * 100:.0f}% 和原文连续十几个字一模一样：这是在照念别人的文章。用自己的话重讲；要引原话就短引，并进断言台账标 quote'
            )
        elif ratio > 0.12:
            warns.append(f'旁白有 {ratio * 100:.0f}% 和原文一模一样：介绍别人的文章要用自己的话，原话只留非引不可的')
        if best >= 60:
            warns.append(
                f'有一处连着 {best} 个字和原文相同：这么长的原话要当引文处理（画面上打引号、标出处，断言台账标 quote），或者改写'
            )
    elif ratio > 0.6:
        warns.append(
            f'旁白有 {ratio * 100:.0f}% 是原文照搬：文章是给眼睛看的，视频稿要重讲——开头换成钩子、长句拆短、每句对一个画面（templates/文章转视频.md 第三节）'
        )
    return fails, warns


# ---------- 动效 ----------
STILL_MV = 0.0005
JUMP_MV = 0.10 if PROMO else 0.03
JUMP_X = 6
SLOW_MS = 250  # 相邻两帧变了的像素不到万分之五算“没动”；超过 3%（宣传线 10%：大字砸下来本来就是一下）且是这一句平常的 6 倍算“跳变”；一帧画超过 250 毫秒算慢


ANATOMY_FAIL = {'line', 'order', 'through', 'terminal'}


def anatomy_check(r):
    """器物解剖包的两项：线头（每根纹理线落在别的线、轮廓、圆点上）和几何（遮挡顺序和真实前后一致、不穿模、管线的头落在接口上）。
    不通过：线头悬空、遮挡顺序画反、穿模、管线端头悬空。提醒：零件悬空超过 1 秒、管线折成尖角、弯头压在别的线上、形状登记不全。"""
    lf = [i['msg'] for i in r['list'] if i['kind'] == 'line']
    gf = [i['msg'] for i in r['list'] if i['kind'] in ANATOMY_FAIL - {'line'}]
    gw = [i['msg'] for i in r['list'] if i['kind'] not in ANATOMY_FAIL]
    return (lf, []), (gf, gw)


def motion_stats(mo, tl):
    """按句子汇总：运动面积中位数、静止帧对占比、跳变。量法照 huashu-art-motion 的 qa.py：整片每一对相邻帧都量，不抽样。"""
    rows = []
    fr = mo['frames']
    BG = tl[0].get('_grid') if tl else None
    for s in tl:
        xs = [f for f in fr if s['t0'] <= f['t'] < s['t1']]
        if not xs:
            continue
        mv = sorted(f['mv'] for f in xs)
        med = mv[len(mv) // 2]
        still = sum(v < STILL_MV for v in mv) / len(mv)
        edge = (
            lambda f: f['t'] - s['t0'] < 0.6 or s['t1'] - f['t'] < 0.6
        )  # 句子两头是分场淡入淡出和转场，本来就整屏在变
        # 跳变是“孤立的一下”：比这一句平常大得多，而且只持续一两对相邻帧（一对 = 硬切，连着两对 = 闪了一帧）；连着三对以上都大的是运镜或转场，不算
        thr = max(JUMP_MV, JUMP_X * max(med, STILL_MV))
        jumps = []
        onbeat = []
        i = 0
        while i < len(xs):
            j = i
            while j < len(xs) and xs[j]['mv'] > thr:
                j += 1
            if 1 <= j - i <= 2 and not edge(xs[i]):
                bt = (
                    (xs[i]['t'] + 1 / FPS - BG['t0']) / BG['spb'] if BG else 0.5
                )  # 卡在拍点上的硬切是有意的：不报，另计数
                (onbeat if BG and abs(bt - round(bt)) * BG['spb'] <= 1.01 / FPS else jumps).append(xs[i])
            i = max(j, i + 1)
        # 步进动画（一秒画几步，手绘动画的做法；art 包 look 的步进形式就是）：画面多数帧不动、隔一小会儿整屏换一下、反复出现，那是有意的节奏，不报
        gaps = [b['t'] - a['t'] for a, b in zip(jumps, jumps[1:])]
        step = 0
        if len(jumps) >= 4 and still >= 0.4 and max(gaps) <= 0.5:
            step = max(1, round(len(gaps) / sum(gaps)))
            jumps = []  # 大半时间相邻帧不动，隔不到半秒整屏换一下，反复出现
        rows.append(
            {
                'id': s['id'],
                't0': s['t0'],
                'dur': s['t1'] - s['t0'],
                'med': med,
                'still': still,
                'jumps': jumps,
                'step': step,
                'onbeat': len(onbeat),
                'ms': sorted(f['ms'] for f in xs)[len(xs) // 2],
            }
        )
    return rows


def motion_check(mo, tl):
    rows = motion_stats(mo, tl)
    warns = {'jump': [], 'still': [], 'slow': [], 'det': []}
    for r in rows:
        for f in r['jumps']:
            warns['jump'].append(
                f"{f['t']:6.1f}s 相邻两帧有 {f['mv'] * 100:.0f}% 的画面变了（{r['id']} 这一句平常是 {r['med'] * 100:.1f}%）：硬切、闪烁或穿帮，看这一帧；有意的拍点可以保留"
            )
        if r['dur'] >= 4 and r['still'] > 0.85 and not r['step']:
            warns['still'].append(
                f"{r['t0']:6.1f}s {r['id']} 这一句有 {r['still'] * 100:.0f}% 的时间相邻帧完全不动：画是静的，只是偶尔换一下。给主体一个持续的小动作"
            )
    ms = sorted(f['ms'] for f in mo['frames'])
    med = ms[len(ms) // 2] if ms else 0
    if med > SLOW_MS:
        warns['slow'].append(
            f"画一帧的中位耗时 {med:.0f} 毫秒，整片渲染大约 {med * mo['total'] * FPS / 60000:.0f} 分钟：整屏重绘改用步进形式 look(名字, t, {{draw, fps}})，或只在几句里用"
        )
    for d in mo['det']:
        if not d['same']:
            warns['det'].append(
                f"{d['t']:6.1f}s 同一时刻画两遍，结果不一样：用了 Math.random、Date，或有跨帧累积的状态（比如画进一张不清空的离屏）。重渲、抽帧和回归样张都会和成片对不上"
            )
    return rows, warns


# ---------- 宣传片：按产品的特性选样子 ----------
def cmd_look():
    """按 brief.json 的 product（kind 产品类型，traits 特性词）给宣传片的样子排个序，并说出每种样子的动效、配乐、拍速、要准备的真东西。只建议，不改 brief。"""
    PR = BRIEF.get('product') or {}
    K = LOOKS['kinds']
    kind = PR.get('kind')
    tr = PR.get('traits') or []
    if kind not in K:
        print('brief.json 里先写 "product":{"kind":"…","traits":["…"]}。kind 四选一：')
        [print(f'  {k:9s}{v["name"]}') for k, v in K.items()]
        print('traits 写这个产品的三五个特性词（如：效率、质感、智能、亲切），用来在同一类里挑样子')
        return
    rows = []
    for i, (lid, L_) in enumerate(LOOKS['looks'].items()):
        base = (len(K[kind]['order']) - K[kind]['order'].index(lid)) * 2 if lid in K[kind]['order'] else 0
        hit = [w for w in tr if any(w in x or x in w for x in L_['traits'])]
        rows.append((base + 1.5 * len(hit), -i, lid, L_, hit))
    rows.sort(reverse=True)
    print(f"产品类型：{K[kind]['name']}　特性：{'、'.join(tr) or '（没写）'}")
    print(f"这一类片子：钩子用{K[kind]['hook']}；画框用 {K[kind]['frame']}；证明放{K[kind]['prove']}\n")
    for n, (sc_, _, lid, L_, hit) in enumerate(rows):
        print(
            f"{'推荐' if n == 0 else '备选' if sc_ > 0 else '不配'}  {lid:7s}{L_['name']}"
            + (f"（对上的特性：{'、'.join(hit)}）" if hit else '')
        )
        print(f"        动效：{L_['motion']}")
        print(
            f"        配乐 {L_['music']}，{L_['bpm_range'][0]}–{L_['bpm_range'][1]} 拍；平均镜头 {L_['pace_avg']:g} 秒以内，单个不超过 {L_['shot_max']:g} 秒"
        )
        print(f"        要准备：{L_['needs']}")
        print(f"        别用在：{L_['avoid']}")
    b = rows[0]
    print(
        f'\n选定后在 brief.json 写："look":"{b[2]}","packs":["promo"]（配乐和拍速不写就用这套样子的缺省：{b[3]["music"]}、{b[3]["bpm"]} 拍）。用户有授权的音乐时 music 写文件路径，bpm 用 build.py beats 量。'
    )


# ---------- 镜头节奏（宣传线） ----------
CUT_MV = 0.25  # 相邻两帧有四分之一以上的画面变了，算一次换镜头


def shot_cuts(mo):
    """从逐帧运动量里找换镜头的时刻：大面积变化只持续半秒以内的算一次（硬切、闪切、很短的擦切）；持续更久的是运镜或慢转场，不算。"""
    fr = mo['frames']
    cuts = []
    i = 0
    while i < len(fr):
        j = i
        while j < len(fr) and fr[j]['mv'] > CUT_MV:
            j += 1
        if j > i and j - i <= FPS * 0.5 and (not cuts or fr[i]['t'] + 1 / FPS - cuts[-1] >= 0.2):
            cuts.append(round(fr[i]['t'] + 1 / FPS, 3))  # 一道擦切中途画面变化会落一下，隔不到 0.2 秒的算同一次
        i = max(j, i + 1)
    return cuts


def pace_stats(mo, tl, sc=None):
    BG = tl[0].get('_grid') if tl else None
    a, b = tl[0]['t0'], tl[-1]['t1']
    cuts = [c for c in shot_cuts(mo) if a + 0.1 < c < b - 0.1]
    told = sorted(
        e['t'] for e in (sc or {}).get('events', []) if e['type'] == '_cut' and a + 0.1 < e['t'] < b - 0.1
    )  # 场景自己声明的换屏时刻（叠化、暗底上的擦切，量画面量不出来）
    cuts = sorted(told + [c for c in cuts if not any(-0.1 <= c - x <= 0.7 for x in told)])
    edges = [a] + cuts + [b]
    shots = sorted(((y - x, x) for x, y in zip(edges, edges[1:])), reverse=True)
    ls = sorted(d for d, _ in shots)
    n = len(ls)
    off = []
    if BG:
        for c in cuts:
            k = (c - BG['t0']) / (BG['spb'] / 2)  # 半拍也算在点上
            if abs(k - round(k)) * BG['spb'] / 2 > 1.6 / FPS:
                off.append(c)
    return {
        'n': n,
        'dur': b - a,
        'avg': (b - a) / n,
        'longest': shots[:3],
        'p10': ls[int(n * 0.1)],
        'p90': ls[min(n - 1, int(n * 0.9))],
        'cuts': cuts,
        'off': off,
        'grid': bool(BG),
    }


def pace_line(st):
    return (
        f"镜头 {st['n']} 个，平均 {st['avg']:.1f} 秒，最长 {st['longest'][0][0]:.1f} 秒（{st['longest'][0][1]:.1f}s 起），短的约 {st['p10']:.1f} 秒、长的约 {st['p90']:.1f} 秒"
        + (
            f"；换镜头 {len(st['cuts'])} 次，{len(st['cuts']) - len(st['off'])} 次在拍点上"
            if st['grid'] and st['cuts']
            else ''
        )
    )


def pace_check(mo, tl, sc=None):
    """宣传线才查：镜头够不够短、有没有快慢对比、换镜头在不在拍点上、口号最后有没有落在画面上。阈值是经验值，brief 里可改：shot_max、pace_avg。"""
    st = pace_stats(mo, tl, sc)
    fails = []
    warns = []
    smax = float(BRIEF.get('shot_max', LOOK.get('shot_max', 4)))
    pavg = float(BRIEF.get('pace_avg', LOOK.get('pace_avg', 2.5)))
    if not st['grid']:
        warns.append('宣传片没写 bpm：先定音乐和拍点，再按拍子排镜头（用自己的音乐先跑 build.py beats 音乐文件）')
    if st['avg'] > pavg:
        warns.append(
            f"平均一个镜头 {st['avg']:.1f} 秒（{st['dur']:.0f} 秒里只有 {st['n']} 个镜头）：宣传片读起来会拖，目标是平均 {pavg:g} 秒以内。检查只认得硬切和半秒内的擦切，慢叠化不算换镜头"
        )
    for d, t0 in st['longest']:
        if d > smax:
            warns.append(
                f"{t0:6.1f}s 起一个镜头 {d:.1f} 秒，超过 {smax:g} 秒：切开，或者确认它是全片要“停下来”的那一拍（全片最多留一两处）"
            )
    if st['n'] >= 6 and st['p90'] < 2 * st['p10']:
        warns.append(
            f"镜头长短都差不多（短的 {st['p10']:.1f} 秒，长的 {st['p90']:.1f} 秒）：没有快慢对比，像节拍器。蓄力的地方放慢，爆点后连切"
        )
    if st['off'] and len(st['off']) > 0.15 * len(st['cuts']):
        warns.append(
            f"{len(st['off'])} 次换镜头不在拍点上（{'、'.join(f'{c:.2f}s' for c in st['off'][:6])}{'…' if len(st['off']) > 6 else ''}）：差几帧比不卡点还难受，时刻用 beatT / barT 取"
        )
    slogan = BRIEF.get('slogan')
    PR = BRIEF.get('product') or {}
    if PR.get('kind') not in LOOKS['kinds']:
        warns.append(
            f"brief.json 没写 product.kind（{' / '.join(LOOKS['kinds'])}）：先分清是哪一类产品，再选样子、动效和配乐（build.py look 会给建议）"
        )
    elif 'promo' in BRIEF.get('packs', []) and not LOOK:
        warns.append('用了风格包 promo 但没写 look：build.py look 看建议')
    elif LOOK and PR['kind'] not in LOOK['kinds']:
        warns.append(
            f"样子「{LOOK['name']}」一般不配{LOOKS['kinds'][PR['kind']]['name'].split('（')[0]}（它适合：{'、'.join(LOOKS['kinds'][k]['name'].split('（')[0] for k in LOOK['kinds'])}）。确认是有意的，在导演阐述里写理由"
        )
    if not slogan:
        warns.append('brief.json 没写 slogan：宣传片要有一句观众带得走的话，写进 brief，检查会看它最后有没有落在画面上')
    elif sc:
        step = sc['frames'][1]['t'] - sc['frames'][0]['t']
        tail = st['dur'] * 0.7 + tl[0]['t0']
        key = re.sub(r'[\s，。！？、,.!?]', '', slogan)
        n = sum(
            1
            for fr in sc['frames']
            if fr['t'] >= tail
            and key in re.sub(r'[\s，。！？、,.!?]', '', ''.join(r[0] for r in fr['tx'] if r[5] >= 0.8))
        )
        if n * step < 1.2:
            fails.append(f'口号「{slogan}」没有在片尾三成里清楚停留 1.2 秒以上：最后一个画面要把它和品牌名一起留住')
    return st, fails, warns


VO_CPS = (3.6, 5.0)  # 旁白每秒几个字算正常（L-049、L-070：Gemini 带“温和”“偏慢”的语气提示会读到 2.6–3.6 字/秒）


def voice_rate_check(tl):
    """配音语速：全片旁白每秒几个字（按真正出声的那段算，不算句首句尾的静音）。太慢片长会失控，太快观众跟不上。口播线是原声，不查。"""
    if TALK:
        return [], []
    rows = []
    for s in tl:
        if silent(s):
            continue
        n = len(CJK.findall(s.get('tts') or s['vo'])) + len(re.findall(r'[A-Za-z0-9]+', s.get('tts') or s['vo']))
        sec = s['voiced'] - s['lead']
        if n >= 4 and sec > 0.3:
            rows.append((n / sec, s['id'], n, sec))
    if not rows:
        return [], []
    cps = sum(r[2] for r in rows) / sum(r[3] for r in rows)
    lo, hi = VO_CPS
    if cps < lo:
        slow = '、'.join(f'{i}（{c:.1f}）' for c, i, _, _ in sorted(rows)[:3])
        return [], [
            f'全片旁白每秒 {cps:.1f} 字，偏慢（正常 {lo}–{hi}）：片长会比预计长很多。最慢的几句：{slow}。语气提示里写明语速，'
            '或用 ffmpeg 的 silenceremove 压停顿再 atempo 提速，改完重跑回听（L-049、L-070）'
        ]
    if cps > hi:
        return [], [
            f'全片旁白每秒 {cps:.1f} 字，偏快（正常 {lo}–{hi}）：观众跟不上，字幕也来不及读。换慢一点的声音或在语气里写“放慢”'
        ]
    return [], []
