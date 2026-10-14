#!/usr/bin/env python3
"""古代人物库 · 图片版：用 GPT Image 出全身定妆图，抠图后放进 kit/packs/renwu_img/，renwu.portrait() 直接用。

两种画风（同一预设两种都可以有）：
  mu  木刻平涂（白底出图，泛洪抠白），和 liubai 纸面最搭，默认用它
  3d  软陶/手办质感 3D（绿幕出图，色度键 + 去溢色），适合封面、开场、人物特写

流程（每张约 $0.16、70 秒；先出一两张看图，再批量）：
  python3 renwu_img.py jobs mu [预设 ...] > jobs.json        不写预设就是全部 33 个
  python3 img_openrouter.py run jobs.json raw/ --jobs 4        出原图（raw/<预设>@<画风>.png）
  python3 renwu_img.py cut raw/                                 抠图 → packs/renwu_img/<画风>/<预设>.webp，更新 manifest.json
  python3 renwu_img.py sheet out.png                            把库里所有图排成一张对照表，看风格齐不齐

想换某个人的样子：改 DESC 里那一行（或命令里 --extra "……" 追加描述），删掉 raw/ 里那张，重跑 run 和 cut。
画面上要标“示意人物”：这些是常见服饰的示意，不是考据复原（同 renwu.person）。
"""
import json, os, sys
from pathlib import Path

KIT = Path(__file__).resolve().parent
LIB = KIT / 'packs' / 'renwu_img'
MAX_H = 1100  # 竖屏 1920 高里人物最多占一半多一点，再大就是浪费仓库体积

FRAME = ('Full-body single character, standing, front view, centered, whole figure from head to shoes visible with margin, '
         'only one person in the image, ')
STYLE = {
    'mu': FRAME + ('isolated on a plain pure white background, no ground, no floor line, no shadow, no scenery, no frame. '
                   'Style: Chinese woodcut print illustration with flat muted colors, crisp black ink outlines of even weight, '
                   'subtle hatching on the robe, limited palette of ink black, indigo blue, vermilion red, warm ochre and aged paper beige; '
                   'calm dignified expression; adult proportions about 7 heads tall. '),
    '3d': FRAME + ('isolated on a solid flat chroma green background (#00b140), no ground, no shadow on the background, no scenery. '
                   'No green color anywhere on the character. '
                   'Style: stylized 3D render, soft clay / vinyl figurine look, gentle studio lighting, slightly simplified features, '
                   'muted historical colors (ink black, indigo, vermilion, ochre), calm dignified expression, about 6 heads tall. '),
}

# 每个预设一行描述：朝代、身份、年龄、服饰、手里的东西。和 renwu.js 的 PRESETS 同名。
DESC = {
    'han.official': 'A Western Han dynasty court official, man about 45, neat beard, black jinxian cap, dark red crossed-collar deep robe (shenyi) with wide sleeves and black trim, black sash with a hanging seal cord, holding a wooden hu tablet in both hands.',
    'han.clerk': 'A Western Han dynasty low-ranking commandery clerk, man about 40, short beard, black Han jinxian cap, indigo crossed-collar long deep robe (shenyi) with wide sleeves and a red sash, hands clasped in his sleeves holding a small bundle of bamboo slips.',
    'han.scholar': 'A Han dynasty Confucian scholar, man about 30, thin moustache, simple black cloth cap over a topknot, plain beige crossed-collar robe with wide sleeves and dark trim, holding a rolled bamboo-slip book against his chest.',
    'han.woman': 'A Han dynasty woman about 30, hair in a low chignon at the nape, wearing a wrapped curved-hem quju robe in deep red and ochre with black borders spiraling around the body, wide sleeves, hands folded in front.',
    'han.soldier': 'A Han dynasty foot soldier, man about 25, red headscarf, short red tunic under dark lamellar leather armour vest, trousers and leg wraps, holding a long ji halberd upright.',
    'wei.official': 'A Northern Wei dynasty official, man about 45, black gauze longguan lacquer cage cap, wide-sleeved dark robe over a white inner robe, red sash, holding a hu tablet.',
    'wei.palace': 'A Northern Wei palace woman, about 25, high double-loop hairstyle, long high-waisted skirt in vermilion with a short ochre jacket with wide sleeves, a long ribbon, hands folded.',
    'wei.nun': 'A Northern Wei Buddhist nun, woman about 40, shaved head, grey robe with wide sleeves under a patchwork reddish-brown kasaya draped over the left shoulder, holding prayer beads in front.',
    'tang.official': 'A Tang dynasty official, man about 40, black futou cap with soft hanging tails, round-collar crimson robe (yuanlingpao) with a black leather belt, black boots, holding a hu tablet.',
    'tang.lady': 'A Tang dynasty court lady about 25, high chignon with gold hairpins, red high-waisted ruqun skirt, short ochre jacket, long translucent yellow pibo shawl, holding a round silk fan.',
    'tang.poet': 'A Tang dynasty literatus, man about 35, black futou cap, light ochre round-collar robe, black belt, holding a scroll in one hand.',
    'song.official': 'A Song dynasty official, man about 50, black futou hat with very long straight horizontal wings, crimson round-collar robe, holding a hu tablet.',
    'song.scholar': 'A Song dynasty scholar, man about 40, tall square black Dongpo hat, plain beige daopao robe with dark collar trim, holding a folded book.',
    'song.woman': 'A Song dynasty woman about 30, hair in a simple bun, long straight indigo beizi coat open at the front over a pale long skirt, slim proportions, hands folded.',
    'ming.official': 'A Ming dynasty civil official, man about 50, black gauze wusha hat with two short side wings, crimson round-collar robe with a square embroidered rank badge on the chest, jade belt, holding a hu tablet.',
    'ming.scholar': 'A Ming dynasty scholar, man about 35, square black fangjin scholar cap, indigo daopao robe with white collar, holding a folded paper fan.',
    'ming.woman': 'A Ming dynasty woman about 30, hair in a bun with a small ornament, ochre ao jacket with a white standing collar over a long red pleated mamian skirt, hands folded.',
    'qing.official': 'A Qing dynasty official, man about 55, summer conical hat with red tassels and a rank button, long queue braid, dark blue-black court surcoat with a square crane rank badge, horse-hoof cuffs, court beads (chaozhu) necklace.',
    'qing.commoner': 'A Qing dynasty commoner, man about 40, small black skullcap, long queue, long grey-blue changshan gown with a short black magua jacket over it, cloth shoes.',
    'qing.woman': 'A Qing dynasty Manchu woman about 30, black liangbatou flat headdress with flowers, long straight qipao gown in indigo with wide trim borders, flowerpot-sole shoes.',
    'farmer': 'A Chinese peasant farmer, man about 40, conical straw hat, short brown hemp tunic with trousers rolled up, straw sandals, holding a hoe over his shoulder.',
    'peasant_woman': 'A Chinese peasant woman about 35, indigo headscarf, short brown hemp jacket and skirt with an apron, holding a woven bamboo basket.',
    'merchant': 'A Chinese traveling merchant, man about 45, round black cap, ochre long robe with a money pouch at the belt, carrying an abacus.',
    'monk': 'A Chinese Buddhist monk, man about 50, shaved head, grey robe under a reddish-brown patchwork kasaya, holding prayer beads, calm expression.',
    'daoist': 'A Chinese Daoist priest, man about 55, long grey beard, black hair in a topknot with a wooden pin, dark blue Daoist robe with wide sleeves, holding a horsehair whisk.',
    'general': 'A Chinese military general, man about 45, full beard, helmet with red plume, lamellar armour with shoulder guards over a red battle robe, holding a sword at his side.',
    'child': 'A Chinese child about 8 years old, hair in two small zongjiao tufts, short red jacket and trousers, cloth shoes, cheerful.',
    'elder': 'A Chinese old man about 70, white hair in a topknot, long white beard, plain grey robe, leaning on a wooden walking staff.',
    'old_woman': 'A Chinese old woman about 70, grey hair in a bun with a dark headband, plain dark blue jacket and skirt, slightly stooped, hands folded.',
    'emperor': 'A Chinese emperor (generic, not a specific person), man about 40, mianguan crown with a flat board and hanging bead strings, black and red ceremonial robe with embroidered symbols, holding a jade gui tablet.',
    'eunuch': 'A Ming dynasty palace eunuch, man about 40, clean shaven, black hat, plain dark red robe with a narrow belt, hands clasped, deferential posture.',
    'prisoner': 'A Chinese prisoner, man about 35, disheveled hair, coarse grey-white prison clothes, wearing a heavy square wooden cangue (jia) around the neck, barefoot, tired expression.',
    'servant': 'A Chinese household servant, man about 25, small black cap, short indigo tunic and trousers, carrying a cloth bundle on his back.',
}


def jobs(style, ids, extra=''):
    ids = ids or list(DESC)
    bad = [i for i in ids if i not in DESC]
    if bad: sys.exit('没有这些预设：' + ' '.join(bad))
    return [{'id': f'{i}@{style}', 'prompt': STYLE[style] + DESC[i] + (' ' + extra if extra else ''), 'aspect': '2:3'} for i in ids]


# ---------- 抠图 ----------
def _alpha_white(a, np, ndimage, tol=28):
    d = (255 - a.astype(np.int16)).max(axis=2)
    lab, _ = ndimage.label(d < tol)
    edge = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
    bg = np.isin(lab, edge[edge > 0])
    plab, pn = ndimage.label((d < 10) & ~bg)  # 袖子、辫子围住的纯白空隙；小块高光不动
    if pn:
        sizes = ndimage.sum(np.ones_like(plab), plab, range(1, pn + 1))
        bg |= np.isin(plab, np.where(sizes > 600)[0] + 1)
    bg = ndimage.binary_dilation(bg, iterations=1)  # 收一像素，去白晕
    alpha = np.where(bg, 0, 255).astype(np.float32)
    ring = ndimage.binary_dilation(bg, iterations=2) & ~bg
    soft = np.clip((d - 6) / (tol + 14), 0, 1) * 255
    alpha[ring] = np.minimum(alpha[ring], soft[ring])
    return alpha, a


def _alpha_green(a, np, ndimage):
    f = a.astype(np.float32)
    r, g, b = f[..., 0], f[..., 1], f[..., 2]
    k = g - np.maximum(r, b)
    border = np.concatenate([k[:4].ravel(), k[-4:].ravel(), k[:, :4].ravel(), k[:, -4:].ravel()])
    kb = float(np.median(border))  # 模型给的绿常常不是 #00b140，按实际背景定阈值
    if kb < 30: sys.exit('背景不像绿幕（绿色优势 %.0f），这张重出' % kb)
    hi, lo = kb * .75, kb * .25
    alpha = np.clip((hi - k) / (hi - lo), 0, 1) * 255
    lab, _ = ndimage.label(k > kb * .5)  # 只去和画边连通的绿，衣服上的绿不动
    edge = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
    grow = ndimage.binary_dilation(np.isin(lab, edge[edge > 0]), iterations=3)
    alpha = np.where(grow, alpha, 255)
    lim = (r + b) / 2 + 6  # 去溢色：边缘的绿反光压回去
    f[..., 1] = np.minimum(g, np.maximum(lim, np.minimum(r, b)))
    return alpha, f.clip(0, 255).astype(np.uint8)


def cut_one(src, style):
    import numpy as np
    from PIL import Image, ImageFilter
    from scipy import ndimage
    a = np.asarray(Image.open(src).convert('RGB'))
    alpha, rgb = (_alpha_green if style == '3d' else _alpha_white)(a, np, ndimage)
    al = Image.fromarray(alpha.astype(np.uint8)).filter(ImageFilter.GaussianBlur(.6))
    im = Image.fromarray(rgb).convert('RGBA'); im.putalpha(al)
    m = np.asarray(al) > 24
    # 去掉离主体很远的小碎块（模型偶尔留的污点）
    lab, n = ndimage.label(m)
    if n > 1:
        sizes = ndimage.sum(m, lab, range(1, n + 1)); keep = np.isin(lab, np.where(sizes >= sizes.max() * .02)[0] + 1)
        im.putalpha(Image.fromarray((np.asarray(al) * keep).astype(np.uint8))); m = keep
    ys, xs = np.where(m)
    pad = 6
    box = (max(0, xs.min() - pad), max(0, ys.min() - pad), min(im.width, xs.max() + pad + 1), min(im.height, ys.max() + pad + 1))
    im = im.crop(box)
    # 脚底中心：最下面 4% 高度里不透明像素的水平中点
    mm = np.asarray(im)[..., 3] > 24; h = mm.shape[0]
    fy = np.where(mm.any(axis=1))[0].max(); band = mm[max(0, fy - int(h * .04)):fy + 1]
    fx = float(np.where(band.any(axis=0))[0].mean())
    if im.height > MAX_H:
        s = MAX_H / im.height; im = im.resize((round(im.width * s), MAX_H), Image.LANCZOS); fx *= s; fy *= s
    return im, round(fx), round(fy)


def cut(raw_dir, only=None):
    man_p = LIB / 'manifest.json'
    man = json.loads(man_p.read_text()) if man_p.exists() else {}
    n = 0
    for f in sorted(Path(raw_dir).glob('*@*.png')):
        pid, style = f.stem.rsplit('@', 1)
        if pid not in DESC or style not in STYLE or (only and pid not in only): continue
        im, fx, fy = cut_one(f, style)
        out = LIB / style / f'{pid}.webp'; out.parent.mkdir(parents=True, exist_ok=True)
        im.save(out, 'WEBP', quality=86, method=6)
        man.setdefault(style, {})[pid] = {'w': im.width, 'h': im.height, 'foot': [fx, fy]}
        print(f'{pid}@{style} → {out.relative_to(KIT)}  {im.width}×{im.height}  {out.stat().st_size // 1024} KB'); n += 1
    man = {s: dict(sorted(v.items())) for s, v in sorted(man.items())}
    man_p.write_text(json.dumps(man, ensure_ascii=False, indent=1) + '\n')
    print(f'抠好 {n} 张；库里现在：' + '，'.join(f'{s} {len(v)} 张' for s, v in man.items()))


def sheet(out):
    from PIL import Image
    man = json.loads((LIB / 'manifest.json').read_text())
    cw, ch, per = 220, 340, 9
    blocks = [(s, sorted(man[s], key=list(DESC).index)) for s in sorted(man, key=lambda s: list(STYLE).index(s))]
    rows = [-(-len(ids) // per) for _, ids in blocks]
    S = Image.new('RGB', (cw * per, ch * sum(rows) + 30 * (len(blocks) - 1)), (236, 226, 204))
    y0 = 0
    for (style, ids), nr in zip(blocks, rows):  # 每种画风一块，按预设顺序排
        for k, pid in enumerate(ids):
            im = Image.open(LIB / style / f'{pid}.webp'); im.thumbnail((cw - 12, ch - 12))
            S.paste(im, ((k % per) * cw + (cw - im.width) // 2, y0 + (k // per) * ch + (ch - im.height) // 2), im)
        y0 += nr * ch + 30
    S.save(out); print('对照表：', out)


if __name__ == '__main__':
    a = sys.argv[1:]
    if not a: sys.exit(__doc__)
    if a[0] == 'jobs':
        extra = ''
        if '--extra' in a: i = a.index('--extra'); extra = a[i + 1]; a = a[:i] + a[i + 2:]
        print(json.dumps(jobs(a[1], a[2:], extra), ensure_ascii=False, indent=1))
    elif a[0] == 'cut': cut(a[1], set(a[2:]) or None)
    elif a[0] == 'sheet': sheet(a[1] if len(a) > 1 else 'renwu_sheet.png')
    else: sys.exit(__doc__)
