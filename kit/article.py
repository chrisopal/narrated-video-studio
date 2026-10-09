#!/usr/bin/env python3
"""文章转视频的第一步：把一篇文章（公众号、网页、纯文本）读进来，拆成结构，做内容分析，给出题材和风格的建议。
在项目目录里运行（和 build.py 一样）：

  python3 ../kit/article.py fetch 网址或文件      取文：公众号网址、另存的 .html、.txt / .md 都行 → article/source.*、article/article.json、article/article.md
  python3 ../kit/article.py analyze               分析：篇幅、结构、题材信号、画面机会、要核实的说法 → article/analysis.json、brief.suggest.json、facts.json（没有时才写）
  python3 ../kit/article.py images                列出原文配图；加 --download 下载到 article/img/（配图的版权在原作者，先告诉用户并得到同意）

fetch 之后会自动跑一遍 analyze。分析给的是清单和建议，不是结论：题材、结构、哪句话值得讲，要人（或 agent）读完文章再定。
规矩见 templates/文章转视频.md。"""
import json, re, sys, html, hashlib, datetime, urllib.request, urllib.parse
from html.parser import HTMLParser
from pathlib import Path
from collections import Counter

P = Path.cwd(); A = P / 'article'; KIT = Path(__file__).resolve().parent
UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'
CJK = re.compile(r'[一-鿿]')
BLOCK = {'p', 'section', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'li', 'pre', 'tr', 'table', 'ul', 'ol', 'figure', 'figcaption', 'article', 'header', 'footer', 'hr'}
VOID = {'br', 'img', 'hr', 'input', 'meta', 'link', 'source', 'wbr', 'area', 'base', 'col', 'embed', 'track', 'param'}
SKIP = {'script', 'style', 'noscript', 'svg', 'iframe', 'mp-common-profile', 'mpprofile', 'mp-style-type', 'button', 'select', 'textarea'}
# 文末和文首的套话：关注、往期、在看……出现之后的内容一般不是正文
TAIL = re.compile(r'往期(推荐|回顾|精彩|文章)|推荐阅读|延伸阅读|相关阅读|点(个|击)?(在看|赞)|长按(识别|关注|二维码)|扫码(关注|加|进群)|关注(我们|公众号)|点击(上方|下方|阅读原文|蓝字)|阅读原文|— ?E ?N ?D ?—|^-+ ?END ?-+$|转载请(联系|注明)|版权(声明|归原作者)|免责声明|商务合作|投稿邮箱|加入(社群|星球|读者群)|设为星标|微信搜索|感谢关注|欢迎关注')

def die(msg): print('✗', msg); sys.exit(1)

# ---------- 取文 ----------
def fetch_url(url):
    req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept-Language': 'zh-CN,zh;q=0.9'})
    try:
        with urllib.request.urlopen(req, timeout=40) as r: raw = r.read()
    except Exception as e: die(f'取不到这个网址（{e}）。换一条路：在浏览器里打开文章，另存为 .html，或把正文贴进一个 .txt，再运行 article.py fetch 那个文件')
    return raw.decode('utf-8', errors='replace')

def style_of(attrs):
    st = {}
    for part in (attrs.get('style') or '').split(';'):
        if ':' in part: k, v = part.split(':', 1); st[k.strip().lower()] = v.strip().lower()
    return st
def px(v):
    m = re.match(r'([\d.]+)\s*(px|pt|em|rem)?', v or '')
    if not m: return 0
    n = float(m.group(1)); u = m.group(2) or 'px'
    return n if u == 'px' else n * 4 / 3 if u == 'pt' else n * 16
def color_of(v):
    """CSS 颜色 → (r,g,b)；认不出返回 None"""
    v = (v or '').strip()
    m = re.match(r'rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)', v)
    if m: return tuple(int(x) for x in m.groups())
    m = re.match(r'#([0-9a-f]{6})\b', v)
    if m: h = m.group(1); return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))
    m = re.match(r'#([0-9a-f]{3})\b', v)
    if m: return tuple(int(c * 2, 16) for c in m.group(1))
    return None

class Body(HTMLParser):
    """把正文容器里的东西压成一串“块”：段落、标题、引文、列表项、代码、图片。同时记下字号、加粗、居中和用过的颜色。"""
    def __init__(self, root_id=None, root_tags=()):
        super().__init__(convert_charrefs=True)
        self.root_id = root_id; self.root_tags = root_tags; self.depth = 0; self.inside = False; self.skip = 0
        self.blocks = []; self.cur = None; self.stack = []; self.colors = Counter(); self.done = False
    def new(self):
        self.flush(); self.cur = {'t': '', 'bold': 0, 'size': 0, 'center': False, 'h': 0, 'quote': False, 'li': False, 'code': False, 'links': []}
    def flush(self):
        c = self.cur; self.cur = None
        if not c: return
        txt = re.sub(r'[ \t ​﻿]+', ' ', c['t']).strip() if not c['code'] else c['t'].strip('\n')
        if not txt: return
        n = len(txt); b = {'type': 'code' if c['code'] else 'h' if c['h'] else 'quote' if c['quote'] else 'li' if c['li'] else 'p', 'text': txt}
        if c['h']: b['level'] = c['h']
        b['_bold'] = c['bold'] / max(1, n); b['_size'] = c['size']; b['_center'] = c['center']
        if c['links']: b['links'] = c['links']
        self.blocks.append(b)
    def ctx(self, key): return any(s.get(key) for s in self.stack)
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if self.done: return
        if not self.inside:
            if (self.root_id and a.get('id') == self.root_id) or (not self.root_id and tag in self.root_tags): self.inside = True; self.depth = 1; self.new()
            return
        if tag not in VOID: self.depth += 1
        if self.skip or tag in SKIP:
            if tag not in VOID: self.skip += 1
            return
        st = style_of(a); fr = {'tag': tag}
        if tag in ('strong', 'b') or st.get('font-weight', '') in ('bold', '600', '700', '800', '900'): fr['bold'] = True
        if tag in ('h1', 'h2', 'h3', 'h4'): fr['h'] = int(tag[1])
        if tag == 'blockquote': fr['quote'] = True
        if tag == 'li': fr['li'] = True
        if tag in ('pre', 'code') and (tag == 'pre' or self.ctx('code')): fr['code'] = True
        if 'font-size' in st: fr['size'] = px(st['font-size'])
        if st.get('text-align') == 'center': fr['center'] = True
        if tag == 'a' and a.get('href', '').startswith('http'): fr['href'] = a['href']
        for k in ('color', 'background-color', 'background', 'border-color', 'border-left-color', 'border-bottom-color', 'border-left', 'border-bottom', 'border'):
            if k in st:
                m = re.search(r'rgba?\([^)]*\)|#[0-9a-f]{3,6}\b', st[k]); c = color_of(m.group(0)) if m else None
                if c: fr.setdefault('colors', []).append(c)
        if tag not in VOID: self.stack.append(fr)
        if tag == 'br':
            if self.cur and self.ctx('code'): self.cur['t'] += '\n'
            elif self.cur and self.cur['t'].strip(): self.new()
            return
        if tag == 'img':
            src = a.get('data-src') or a.get('src') or ''
            if src.startswith('//'): src = 'https:' + src
            if src.startswith('http') and 'data:image' not in src:
                self.flush(); w = int(float(a.get('data-w') or 0) or 0)
                self.blocks.append({'type': 'img', 'src': src, 'alt': (a.get('alt') or '').strip(), 'w': w, 'ratio': float(a.get('data-ratio') or 0) or 0}); self.new()
            return
        if tag in BLOCK and not self.ctx('code') or tag == 'pre': self.new()
        if self.cur is None: self.new()
        for k in ('h', 'quote', 'li', 'code'):
            if self.ctx(k): self.cur[k] = max(self.cur[k], next(s[k] for s in reversed(self.stack) if s.get(k))) if k == 'h' else True
        if self.ctx('center'): self.cur['center'] = True
    def handle_endtag(self, tag):
        if not self.inside or self.done or tag in VOID: return
        self.depth -= 1
        if self.skip: self.skip -= 1
        elif self.stack:
            for i in range(len(self.stack) - 1, -1, -1):          # 容错：标签没配对时往回找最近的同名标签
                if self.stack[i]['tag'] == tag: del self.stack[i:]; break
            if tag in BLOCK and not self.ctx('code'): self.new()
        if self.depth <= 0: self.flush(); self.inside = False; self.done = True
    def handle_data(self, data):
        if not self.inside or self.skip or self.done: return
        if self.cur is None: self.new()
        c = self.cur; n = len(data.strip())
        if self.ctx('code'): c['t'] += data; c['code'] = True; return
        c['t'] += data
        if not n: return
        if self.ctx('bold'): c['bold'] += n
        sz = next((s['size'] for s in reversed(self.stack) if s.get('size')), 0); c['size'] = max(c['size'], sz)
        if self.ctx('center'): c['center'] = True
        for k in ('h', 'quote', 'li'):
            if self.ctx(k): c[k] = next(s[k] for s in reversed(self.stack) if s.get(k)) if k == 'h' else True
        href = next((s['href'] for s in reversed(self.stack) if s.get('href')), None)
        if href and href not in c['links']: c['links'].append(href)
        for s in self.stack:
            for col in s.get('colors', []): self.colors[col] += n

HEAD_NUM = re.compile(r'^(第[一二三四五六七八九十\d]+[部分章节篇步]|[一二三四五六七八九十]+[、.．]|\(?\d{1,2}\)?[、.．)]\s?|0?\d\s|[Pp]art\s?\d|#\d)')
def tidy(blocks):
    """认标题、认图注、去套话。标题除了 h1–h4，还有“短、加粗或大字、不以句号结尾”的段落。"""
    sizes = Counter(round(b['_size']) for b in blocks if b['type'] == 'p' and b.get('_size') and len(b['text']) > 40); base = sizes.most_common(1)[0][0] if sizes else 16
    out = []
    for i, b in enumerate(blocks):
        if b['type'] == 'p':
            t = b['text']; short = len(t) <= 32 and not re.search(r'[。；，,;：:]$', t)
            if short and len(CJK.findall(t)) >= 2 and (b['_bold'] >= .8 or b['_size'] >= base + 2 or (HEAD_NUM.match(t) and (b['_bold'] >= .5 or b['_center']))):
                b['type'] = 'h'; b['level'] = 2 if b['_size'] >= base + 4 or HEAD_NUM.match(t) else 3
            elif out and out[-1]['type'] == 'img' and len(t) <= 40 and (b['_center'] or (b['_size'] and b['_size'] < base)) and not out[-1].get('caption'):
                out[-1]['caption'] = t; continue
        out.append(b)
    # 文末套话：从第一个命中的地方起（只在后 40% 里找），后面的都标成 boiler
    n = len(out); cut = None
    for i, b in enumerate(out):
        if b['type'] != 'img' and i > n * .6 and TAIL.search(b['text']) and len(b['text']) < 80: cut = i; break
    for i, b in enumerate(out):
        if cut is not None and i >= cut: b['boiler'] = True
        elif b['type'] != 'img' and i < 4 and TAIL.search(b['text']) and len(b['text']) < 60: b['boiler'] = True
        for k in ('_bold', '_size', '_center'): b.pop(k, None)
    return out

def meta_wx(s, url):
    g = lambda pat: (lambda m: html.unescape(m.group(1)).strip() if m else '')(re.search(pat, s, re.S))
    ct = g(r'var ct = "(\d+)"'); pub = ''
    if ct: pub = (datetime.datetime.fromtimestamp(int(ct), datetime.timezone.utc) + datetime.timedelta(hours=8)).strftime('%Y-%m-%d %H:%M')
    return {'kind': 'wechat', 'url': g(r'<meta property="og:url" content="([^"]*)"') or url, 'title': g(r'<meta property="og:title" content="([^"]*)"') or g(r'id="activity-name"[^>]*>\s*(?:<span[^>]*>)?\s*([^<]+)'),
            'account': g(r'var nickname = htmlDecode\("([^"]*)"\)') or g(r'id="js_name"[^>]*>\s*([^<]+)'), 'author': g(r'<meta name="author" content="([^"]*)"'), 'published': pub or g(r"createTime\s*=\s*'([^']*)'"),
            'desc': g(r'<meta name="description" content="([^"]*)"') or g(r'var msg_desc = htmlDecode\("([^"]*)"\)'), 'cover': g(r'var msg_cdn_url = "([^"]*)"'), 'original': g(r'copyright_stat\s*=\s*"?(\d+)') == '1'}
def meta_web(s, url):
    g = lambda pat: (lambda m: html.unescape(m.group(1)).strip() if m else '')(re.search(pat, s, re.S | re.I))
    return {'kind': 'web', 'url': g(r'<meta property="og:url" content="([^"]*)"') or url, 'title': g(r'<meta property="og:title" content="([^"]*)"') or g(r'<title[^>]*>([^<]*)</title>'), 'account': g(r'<meta property="og:site_name" content="([^"]*)"'),
            'author': g(r'<meta name="author" content="([^"]*)"'), 'published': g(r'<meta property="article:published_time" content="([^"]*)"'), 'desc': g(r'<meta name="description" content="([^"]*)"'), 'cover': g(r'<meta property="og:image" content="([^"]*)"'), 'original': False}

def parse_html(s, url=''):
    for pat, why in ((r'环境异常|完成验证后即可继续访问', '微信要求先做人机验证'), (r'该内容已被发布者删除', '文章已被作者删除'), (r'此内容因违规无法查看', '文章已不可查看'), (r'请在微信客户端打开链接', '这篇只能在微信里打开')):
        if re.search(pat, s) and 'id="js_content"' not in s: die(f'取到的不是文章正文：{why}。换一条路：在浏览器或微信里打开文章，另存为 .html，或把正文贴进 .txt，再运行 article.py fetch 那个文件')
    if 'id="js_content"' in s: p = Body(root_id='js_content'); meta = meta_wx(s, url)
    else:
        tag = 'article' if re.search(r'<article[\s>]', s, re.I) else 'main' if re.search(r'<main[\s>]', s, re.I) else 'body'; p = Body(root_tags=(tag,)); meta = meta_web(s, url)
    p.feed(s); p.flush()
    return meta, tidy(p.blocks), p.colors

def parse_text(s, name):
    blocks = []; title = ''
    for para in re.split(r'\n\s*\n|\r\n\s*\r\n', s.replace('\r\n', '\n')):
        for line in ([para] if not re.match(r'\s*#', para) else para.split('\n')):
            t = line.strip()
            if not t: continue
            m = re.match(r'(#{1,4})\s+(.*)', t)
            if m:
                if len(m.group(1)) == 1 and not title: title = m.group(2); continue
                blocks.append({'type': 'h', 'level': max(2, len(m.group(1))), 'text': m.group(2)})
            elif t.startswith('>'): blocks.append({'type': 'quote', 'text': t.lstrip('> ').strip()})
            elif re.match(r'[-*•]\s+', t): blocks += [{'type': 'li', 'text': re.sub(r'^[-*•]\s+', '', x.strip())} for x in t.split('\n') if x.strip()]
            else: blocks.append({'type': 'p', 'text': re.sub(r'\s*\n\s*', '', t)})
    for b in blocks:
        b.update({'_bold': 0, '_size': 0, '_center': False})
    blocks = tidy(blocks)
    if not title and blocks and len(blocks[0]['text']) <= 40: title = blocks.pop(0)['text']
    return {'kind': 'text', 'url': '', 'title': title or name, 'account': '', 'author': '', 'published': '', 'desc': '', 'cover': '', 'original': False}, blocks, Counter()

def to_md(meta, blocks):
    L = [f"# {meta['title']}", '', ' · '.join(x for x in (meta.get('account'), meta.get('author'), meta.get('published')) if x), meta.get('url', ''), '']
    prev = None
    for b in blocks:
        if b.get('boiler'): continue
        if prev == 'li' and b['type'] != 'li': L.append('')
        prev = b['type']
        if b['type'] == 'h': L += ['#' * (b.get('level', 2)) + ' ' + b['text'], '']
        elif b['type'] == 'quote': L += ['> ' + b['text'], '']
        elif b['type'] == 'li': L += ['- ' + b['text']]
        elif b['type'] == 'code': L += ['```', b['text'], '```', '']
        elif b['type'] == 'img': L += [f"![{b.get('caption') or b.get('alt') or '配图'}]({b['src']})", '']
        else: L += [b['text'], '']
    return '\n'.join(L).rstrip() + '\n'

def cmd_fetch(src):
    A.mkdir(exist_ok=True)
    if re.match(r'https?://', src):
        s = fetch_url(src); (A / 'source.html').write_text(s, encoding='utf-8'); meta, blocks, colors = parse_html(s, src)
    else:
        f = Path(src) if Path(src).exists() else P / src
        if not f.exists(): die(f'找不到 {src}')
        s = f.read_text(encoding='utf-8', errors='replace')
        if f.suffix.lower() in ('.html', '.htm') or re.search(r'<html[\s>]|id="js_content"', s[:200000], re.I): meta, blocks, colors = parse_html(s)
        else: meta, blocks, colors = parse_text(s, f.stem)
        (A / ('source' + (f.suffix.lower() or '.txt'))).write_text(s, encoding='utf-8')
    body = [b for b in blocks if not b.get('boiler') and b['type'] != 'img']
    n = sum(len(CJK.findall(b['text'])) for b in body if b['type'] != 'code')
    if n < 80: die(f'只读到 {n} 个汉字，不像一篇完整的文章（可能是图片文章、被折叠，或页面结构没认出来）。把正文贴进 .txt 再试；全是图片的文章要先人工转成文字')
    meta['fetched'] = datetime.datetime.now().isoformat(timespec='seconds'); meta['sha'] = hashlib.sha256(''.join(b.get('text', '') for b in blocks).encode()).hexdigest()[:16]
    meta['colors'] = [[list(c), k] for c, k in colors.most_common(12)]
    json.dump({'meta': meta, 'blocks': blocks}, open(A / 'article.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    (A / 'article.md').write_text(to_md(meta, blocks), encoding='utf-8')
    print(f"✓ 《{meta['title']}》" + (f" · {meta['account']}" if meta['account'] else '') + (f" · {meta['published']}" if meta['published'] else '') + ('（标了原创）' if meta['original'] else ''))
    print(f"  正文 {n} 字，{sum(b['type'] == 'h' for b in body)} 个小标题，{sum(b['type'] == 'img' for b in blocks if not b.get('boiler'))} 张配图 → article/article.md（先通读一遍）")

# ---------- 分析 ----------
SENT = re.compile(r'[^。！？!?\n]+[。！？!?]?')
NUM = re.compile(r'(?<![A-Za-z\d.])(\d[\d,]*(?:\.\d+)?)\s*(%|％|亿|万|千|百|倍|元|美元|块|人|年|月|天|小时|分钟|秒|米|公里|千米|厘米|毫米|吨|克|千克|公斤|度|℃|个|家|次|条|台|辆|岁|成|GB|MB|TB|ms|Hz|kW|W|V|nm|μm)')
YEAR = re.compile(r'(?<!\d)(1[5-9]\d\d|20\d\d)\s*年')
SUPER = re.compile(r'最(大|高|早|快|强|多|好|先进|重要|著名|畅销)(?!化)|(全球|世界|国内|全国|行业|业内|排名|位列|位居)第一|第一(名|家|款|位|大)|唯一(一|的)|首(次|个|家|款|创|发)|领先|颠覆|史上|遥遥|垄断|无人能|前所未有|100%|百分之百|彻底(解决|改变)')
CAUSE = re.compile(r'因为|所以|导致|因此|于是|原因是|之所以|使得|造成|归功于|得益于')
# 题材信号：名字要和 templates/registry.json 的 genres 对得上
SIGNALS = {
    '科普原理': r'原理|为什么|是因为|其实是|机制|现象|实验|科学家|分子|原子|能量|细胞|基因|引力|光线|波长|温度|压力|进化|大脑|神经',
    '历史事件': r'年间|王朝|朝廷|皇帝|战争|战役|起义|条约|革命|公元|世纪|史料|史书|记载|遗址|考古|古代|民国|清朝|明朝|宋朝|唐朝',
    '人物传记': r'出生于|生于|毕业于|去世|逝世|一生|晚年|早年|童年|他的父亲|她的父亲|获得.{0,6}奖|回忆录|传记|生平',
    'AI与科技': r'模型|算法|大模型|AI|人工智能|芯片|开源|代码|接口|API|版本|发布|功能|产品|用户|App|应用|系统|架构|数据库|服务器|框架|训练|推理|智能体',
    '小说与文学': r'小说|诗|词|散文|作者|作品|主人公|写道|文学|这本书|书中|读到|故事里|叙事|隐喻|译本|章回',
    '工业零部件': r'轴承|齿轮|电机|减速器|传感器|阀|泵|密封|材料|精度|公差|扭矩|转速|润滑|磨损|零件|零部件|结构|装配|车规|可靠性|失效',
    '企业介绍': r'公司|企业|创始人|成立于|总部|员工|团队|客户|业务|愿景|使命|融资|营收|我们的|品牌',
    '生产流程': r'工艺|工序|生产线|产线|加工|流程|车间|良率|原料|成型|烧结|切削|焊接|检测|出厂|第[一二三四五六七八九十]步',
    '数据解读': r'数据显示|同比|环比|增长|下降|占比|百分点|统计|调查|报告显示|均值|中位数|样本|趋势|图表|排名',
    '新闻解读': r'近日|日前|昨日|今日|记者|通报|宣布|发布会|回应|据.{0,8}报道|消息称|谣言|辟谣|网传|真相|是真的吗|核实|截图',
    '制造业隐形冠军': r'单项冠军|专精特新|小巨人|隐形冠军|国产替代|打破垄断|招股书|年报|市占率|市场份额|产业链|上游|下游|龙头',
}
STEP = re.compile(r'首先|其次|然后|接着|最后|第[一二三四五六七八九十]步|步骤')
CMP = re.compile(r'相比|对比|相较|而不是|不同于|区别在于|vs\.?|VS|优于|不如|一个是.{0,20}另一个是')
CASUAL = re.compile(r'[！!]{1,}|哈哈|啊|呢|吧|嘛|咱们|你猜|划重点|敲黑板|没错|说白了|其实吧|真的|太.{1,3}了')

def load_article():
    f = A / 'article.json'
    if not f.exists(): die('还没有 article/article.json：先运行 article.py fetch 网址或文件')
    return json.load(open(f, encoding='utf-8'))
def sentences(text): return [x.strip() for x in SENT.findall(text) if len(CJK.findall(x)) >= 6]
def lum(c): return (.299 * c[0] + .587 * c[1] + .114 * c[2]) / 255
def sat(c): mx, mn = max(c), min(c); return 0 if mx == 0 else (mx - mn) / mx
def hexc(c): return '#%02x%02x%02x' % tuple(c)

def analyze():
    D = load_article(); meta = D['meta']; B = [b for b in D['blocks'] if not b.get('boiler')]
    body = [b for b in B if b['type'] in ('p', 'quote', 'li', 'h')]; text = '\n'.join(b['text'] for b in body if b['type'] != 'h'); n = len(CJK.findall(text))
    S = [s for b in body if b['type'] != 'h' for s in sentences(b['text'])]
    # 结构：按小标题分节
    secs = [{'title': '（开头）', 'chars': 0, 'imgs': 0, 'nums': 0}]
    for b in B:
        if b['type'] == 'h': secs.append({'title': b['text'], 'chars': 0, 'imgs': 0, 'nums': 0})
        elif b['type'] == 'img': secs[-1]['imgs'] += 1
        elif b['type'] != 'code': secs[-1]['chars'] += len(CJK.findall(b['text'])); secs[-1]['nums'] += len(NUM.findall(b['text']))
    secs = [s for s in secs if s['chars'] or s['imgs']]
    # 信号
    cnt = {'数字': len(NUM.findall(text)), '年份': len(set(YEAR.findall(text))), '引语': len(re.findall(r'[“「][^”」]{10,120}[”」]', text)), '书名号': len(re.findall(r'《[^》]{1,30}》', text)), '问句': len(re.findall(r'[？?]', text)),
           '步骤词': len(STEP.findall(text)), '比较词': len(CMP.findall(text)), '极限词': len(SUPER.findall(text)), '因果词': len(CAUSE.findall(text)), '列表项': sum(b['type'] == 'li' for b in body),
           '代码块': sum(b['type'] == 'code' for b in B), '配图': sum(b['type'] == 'img' for b in B), '英文词': len(re.findall(r'[A-Za-z]{3,}', text))}
    per = lambda k: cnt[k] / max(1, n) * 1000   # 每千字
    # 题材打分：关键词密度为主，结构信号加权
    reg = {}
    try: reg = json.load(open(KIT.parent / 'templates' / 'registry.json', encoding='utf-8')).get('genres', {})
    except Exception: pass
    score = {}; ev = {}
    for g, pat in SIGNALS.items():
        hits = Counter(re.findall(pat, meta['title'] * 3 + text)); k = sum(hits.values()) / max(1, n) * 1000 * (1 + .25 * min(4, len(hits)))
        score[g] = k if len(hits) >= 2 else 0; ev[g] = [w for w, _ in hits.most_common(6)]   # 只撞上一个词不算数
    score['历史事件'] *= 1 + min(1, cnt['年份'] / 6); score['数据解读'] *= 1 + min(1.5, per('数字') / 12); score['生产流程'] *= 1 + min(1, cnt['步骤词'] / 5)
    score['小说与文学'] *= 1 + min(1, per('书名号') / 3 + per('引语') / 4); score['AI与科技'] *= 1 + min(1, per('英文词') / 25 + cnt['代码块'] / 3); score['新闻解读'] *= 1.3 if meta.get('published', '')[:4] == str(datetime.date.today().year) else 1
    rank = [g for g in sorted(score, key=score.get, reverse=True) if score[g] > 0][:3]
    if not rank: rank = ['科普原理']
    # 语气
    casual = len(CASUAL.findall(text)) / max(1, n) * 1000; tone = '口语、轻快' if casual > 12 else '平实' if casual > 4 else '书面、克制'
    # 强调色：文章自己用得最多的有彩色（太灰、太暗、太亮的不要）
    cols = [(tuple(c), k) for c, k in meta.get('colors', []) if sat(tuple(c)) > .35 and .18 < lum(tuple(c)) < .85]; accent = hexc(cols[0][0]) if cols else None
    # 画面机会
    def pick(pat, lim, f=lambda s: True): return [s for s in S if pat.search(s) and f(s)][:lim]
    opp = {
        '大数字 bigNumber（一句里只有一个关键数）': [s for s in S if len(NUM.findall(s)) == 1 and len(s) <= 60][:8],
        '柱图或折线 barChart / lineChart（一句里几个同类的数，或几年的数）': [s for s in S if len(NUM.findall(s)) >= 3 or (len(YEAR.findall(s)) >= 2 and NUM.search(s))][:6],
        '时间轴 timeline（带年份的事）': [s for s in S if YEAR.search(s)][:8] if cnt['年份'] >= 3 else [],
        '对比 compare2（两样东西放在一起比）': pick(CMP, 6),
        '流程 flowSteps（先后步骤）': pick(STEP, 6),
        '引文卡 quoteCard（原话，必须标出处）': [m for s in S for m in re.findall(r'[“「][^”」]{12,90}[”」]', s)][:6],
        '因果链（先原因后结果，用箭头或形变讲）': pick(CAUSE, 6, lambda s: len(s) <= 70),
    }
    lists = []; run = []
    for b in body + [{'type': 'x'}]:
        if b['type'] == 'li': run.append(b['text'])
        else:
            if len(run) >= 3: lists.append(run[:8])
            run = []
    if lists: opp['三张卡 / 清单 threeCards（并列的几条）'] = ['；'.join(x[:28] for x in l) for l in lists[:4]]
    opp = {k: v for k, v in opp.items() if v}
    # 要核实的说法：带数字、年份、极限词、引语的句子。文章这么写，不等于是事实
    claims = []; seen = set()
    def add(s, why):
        k = s[:24]
        if k in seen or len(s) > 140: return
        seen.add(k); claims.append({'claim': s, 'why': why})
    for s in S:
        if SUPER.search(s): add(s, '极限词')
    for s in S:
        if NUM.search(s) and len(NUM.findall(s)) <= 4: add(s, '数字')
    for s in S:
        if YEAR.search(s): add(s, '年份')
    for s in S:
        if re.search(r'[“「][^”」]{12,}[”」]', s): add(s, '引语')
    claims = claims[:40]
    refs = []; [refs.append({'text': b['text'][:60], 'url': u}) for b in B for u in b.get('links', []) if 'mp.weixin.qq.com/mp/' not in u and u not in [r['url'] for r in refs]]
    # 篇幅建议：旁白每秒 4–4.5 字
    full = n / 4.3
    plan = [{'name': '精华版', 'sec': 75, 'chars': 320, 'how': '只讲一个结论和支撑它的两三个理由，竖版合适'}, {'name': '标准版', 'sec': min(240, max(120, round(n / 4.3 * .28 / 10) * 10)), 'chars': 0, 'how': '保留文章的主线和每一节最有力的一个证据'}]
    plan[1]['chars'] = round(plan[1]['sec'] * 4.3 / 10) * 10
    if full < 150: plan = [{'name': '照原文的意思重讲', 'sec': max(30, round(full / 10) * 10), 'chars': n, 'how': '文章本来就短，不用删，换成讲给人听的说法'}]
    if n > 6000: plan.append({'name': f'分 {min(8, max(2, round(n / 3500)))} 集', 'sec': 180, 'chars': 780, 'how': '按小标题分集，每集一个问题；第一集先讲全文的结论'})
    g0 = rank[0]; G = reg.get(g0, {}); styles = G.get('styles', []) or ['sky']
    an = {'title': meta['title'], 'chars': n, 'read_aloud_min': round(full / 60, 1), 'sections': secs, 'counts': cnt, 'tone': tone, 'accent': accent,
          'genres': [{'genre': g, 'score': round(score[g], 2), 'evidence': ev.get(g, []), 'styles': reg.get(g, {}).get('styles', []), 'packs': reg.get(g, {}).get('packs', reg.get(g, {}).get('packs_optional', [])), 'chrome': reg.get(g, {}).get('chrome', 'label'), 'components': reg.get(g, {}).get('components', [])} for g in rank],
          'plan': plan, 'opportunities': opp, 'claims': claims, 'refs': refs[:40], 'images': [{'src': b['src'], 'caption': b.get('caption') or b.get('alt') or ''} for b in B if b['type'] == 'img']}
    json.dump(an, open(A / 'analysis.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    # brief 的建议稿
    credit = '原文：《' + meta['title'][:28] + ('…' if len(meta['title']) > 28 else '') + '》' + (' · ' + meta['account'] if meta.get('account') else '')
    sug = {'title': meta['title'], 'genre': g0, 'style': styles[0], 'audience': '（读完文章再填：给谁看）', 'target_sec': plan[min(1, len(plan) - 1)]['sec'],
           'source_article': {'title': meta['title'], 'account': meta.get('account', ''), 'author': meta.get('author', ''), 'published': meta.get('published', ''), 'url': meta.get('url', ''), 'original': meta.get('original', False), 'sha': meta.get('sha', ''),
                              'basis': '?', 'credit': credit}, 'must_show': [credit]}
    if G.get('packs'): sug['packs'] = G['packs']
    if accent: sug['themePatch'] = {'a1': accent}
    json.dump(sug, open(P / 'brief.suggest.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    seeded = False
    if not (P / 'facts.json').exists():
        json.dump([{'claim': c['claim'], 'status': 'todo', 'source': '', 'note': f"原文的说法（{c['why']}），还没核实", 'where': []} for c in claims], open(P / 'facts.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1); seeded = True
    # 报告
    print(f"\n《{meta['title']}》　{n} 字，照着念要 {full / 60:.1f} 分钟　语气：{tone}")
    print('结构：' + ('　'.join(f"{s['title'][:14]}（{s['chars']}字" + (f"·{s['imgs']}图" if s['imgs'] else '') + '）' for s in secs[:12]) + (' …' if len(secs) > 12 else '')))
    print('信号：' + '　'.join(f'{k} {v}' for k, v in cnt.items() if v))
    print('题材建议（按信号排，读完文章再定）：')
    for x in an['genres']: print(f"  {x['genre']:8s} 依据：{'、'.join(x['evidence']) or '—'}　风格 {' / '.join(x['styles'][:4]) or '—'}" + (f"　包 {' '.join(x['packs'])}" if x['packs'] else '') + f"　章节条 {x['chrome']}")
    print('强调色：' + (f"{accent}（文章自己用得最多的颜色，已写进 brief.suggest.json 的 themePatch.a1）" if accent else '文章没有明显的主色，用风格自带的'))
    print('篇幅：' + '　'.join(f"{p['name']} {p['sec']} 秒≈{p['chars']} 字" for p in plan))
    print('画面机会：' + ('　'.join(f"{k.split(' ')[0]} {len(v)}" for k, v in opp.items()) or '没有扫到明显的'))
    print(f"要核实的说法 {len(claims)} 条" + ('，已写进 facts.json（status 都是 todo，逐条查证后改成 verified / inferred / opinion / quote，或删掉不用的）' if seeded else '（facts.json 已经有了，没有覆盖；清单在 article/analysis.json 的 claims）'))
    if refs: print(f'原文给了 {len(refs)} 个链接（analysis.json 的 refs）：查证时先看它们，是不是一手来源要自己判断')
    if an['images']: print(f"原文配图 {len(an['images'])} 张：版权在原作者，默认不用；要用先确认授权，再进素材台账（article.py images 看清单）")
    print('→ 下一步：读 article/article.md，按 templates/文章转视频.md 拆论点；把 brief.suggest.json 改成 brief.json（source_article.basis 必须填）')

def cmd_images():
    D = load_article(); I = [b for b in D['blocks'] if b['type'] == 'img' and not b.get('boiler')]
    if '--download' not in sys.argv:
        for i, b in enumerate(I): print(f"{i + 1:3d}  {b.get('caption') or b.get('alt') or '（无图注）':30s}  {b['w'] or '?'}px  {b['src'][:90]}")
        print(f'共 {len(I)} 张。版权在原作者：自己的文章或已获授权才下载（--download），下载后在 assets.json 里登记来源和依据'); return
    (A / 'img').mkdir(exist_ok=True); ok = 0
    for i, b in enumerate(I):
        ext = (re.search(r'wx_fmt=(\w+)', b['src']) or re.search(r'\.(jpe?g|png|gif|webp)\b', b['src']) or [None, 'jpg'])[1]
        try:
            req = urllib.request.Request(b['src'], headers={'User-Agent': UA, 'Referer': D['meta'].get('url') or 'https://mp.weixin.qq.com/'})
            with urllib.request.urlopen(req, timeout=40) as r: (A / 'img' / f'{i + 1:02d}.{ext}').write_bytes(r.read()); ok += 1
        except Exception as e: print(f'  第 {i + 1} 张没取到：{e}')
    print(f'已下载 {ok}/{len(I)} 张到 article/img/。要用进成片的，在 assets.json 里逐张登记 usage_basis、source、credit')

if __name__ == '__main__':
    if len(sys.argv) < 2 or sys.argv[1] in ('-h', '--help', 'help'): print(__doc__); sys.exit()
    c = sys.argv[1]
    if c == 'fetch':
        if len(sys.argv) < 3: die('用法：article.py fetch 网址或文件')
        cmd_fetch(sys.argv[2]); analyze()
    elif c == 'analyze': analyze()
    elif c == 'images': cmd_images()
    else: print(__doc__)
