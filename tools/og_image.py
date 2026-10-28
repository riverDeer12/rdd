#!/usr/bin/env python3
"""
RDD Software - share image for a blog article (LinkedIn, Facebook, WhatsApp...).

    python3 tools/og_image.py <slug> [<slug> ...]

For each language it draws a 1200x630 image with the article's title on
the site's dark background next to the RDD deer, saves it as
images/og/<slug>-<lang>.jpg, and points the page's og:image at it
(per language, via data-content-xx, which tools/build.py resolves).
The title is the article's <h1 class="article-title"> in src/<slug>.html.

Fonts in tools/fonts/ are the site's own (DM Serif Display, Public Sans,
SIL Open Font License), converted so Pillow can read them.
"""

import html
import os
import re
import sys

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
FONTS = os.path.join(ROOT, 'tools', 'fonts')
LANGS = ['hr', 'en', 'it', 'de']
SITE = 'https://rdd.software/'

W, H = 1200, 630
BG = (20, 21, 22)              # --color-gray-10
TEAL = (106, 174, 174)         # --color-1-light
WHITE = (255, 255, 255)
GREY = (161, 161, 162)         # --color-gray-4
PANEL = 430                    # width of the deer panel on the right
PAD = 72


def font(name, size):
    return ImageFont.truetype(os.path.join(FONTS, name + '.ttf'), size)


def wrap(draw, text, fnt, width):
    lines, line = [], ''
    for word in text.split():
        trial = (line + ' ' + word).strip()
        if draw.textlength(trial, font=fnt) <= width or not line:
            line = trial
        else:
            lines.append(line)
            line = word
    lines.append(line)
    return lines


def draw_image(title, path):
    img = Image.new('RGB', (W, H), BG)
    draw = ImageDraw.Draw(img)

    # the deer from the About section, cropped to a tall panel on the right
    deer = Image.open(os.path.join(ROOT, 'images', 'about-photo.webp')).convert('RGB')
    deer = deer.resize((H, H), Image.LANCZOS)
    left = (H - PANEL) // 2
    img.paste(deer.crop((left, 0, left + PANEL, H)), (W - PANEL, 0))

    text_w = W - PANEL - 2 * PAD

    # small label with a line, like the section labels on the site
    label = font('public-sans-600', 22)
    draw.line((PAD, PAD + 13, PAD + 48, PAD + 13), fill=TEAL, width=2)
    x = PAD + 64
    for ch in 'BLOG':
        draw.text((x, PAD), ch, font=label, fill=TEAL)
        x += draw.textlength(ch, font=label) + 7

    # title: as large as fits in five lines
    for size in (66, 60, 54, 48, 44, 40):
        title_font = font('dm-serif-display-normal', size)
        lines = wrap(draw, title, title_font, text_w)
        if len(lines) <= 5:
            break
    line_h = int(size * 1.18)
    top = PAD + 70
    available = H - top - 120
    y = top + max(0, (available - line_h * len(lines)) // 2)
    for line in lines:
        draw.text((PAD, y), line, font=title_font, fill=WHITE)
        y += line_h

    footer = font('public-sans-400', 26)
    draw.text((PAD, H - PAD - 26), 'RDD Software  ·  rdd.software', font=footer, fill=GREY)

    img.save(path, 'JPEG', quality=88, optimize=True)
    # the same image, lighter, for the article page and the blog list (the .jpg is for social networks)
    img.save(path[:-len('.jpg')] + '.webp', 'WEBP', quality=82, method=6)


def titles(page):
    found = {}
    for lang, raw in re.findall(r'<h1 class="article-title" data-lang="(hr|en|it|de)">(.*?)</h1>', page, re.S):
        found[lang] = html.unescape(re.sub(r'<[^>]+>', '', raw)).strip()
    return found


def set_og_image(page, slug):
    urls = {l: '%simages/og/%s-%s.jpg' % (SITE, slug, l) for l in LANGS}
    tag = '<meta property="og:image" content="%s" %s/>' % (
        urls['hr'], ' '.join('data-content-%s="%s"' % (l, urls[l]) for l in LANGS))
    page, n = re.subn(r'<meta property="og:image"[^>]*>', lambda m: tag, page, count=1)
    if not n:
        sys.exit('no og:image meta tag to update')
    # the BlogPosting structured data of each language uses the same image
    for l in LANGS:
        page = re.sub(r'(<script type="application/ld\+json" data-lang="%s">.*?"image": )"[^"]*"' % l,
                      lambda m: m.group(1) + '"%s"' % urls[l], page, count=1, flags=re.S)
    return page


def main(slugs):
    for slug in slugs:
        path = os.path.join(ROOT, 'src', slug + '.html')
        page = open(path, encoding='utf-8').read()
        found = titles(page)
        if set(found) != set(LANGS):
            sys.exit('%s: need <h1 class="article-title" data-lang="xx"> for %s' % (slug, ', '.join(LANGS)))
        for lang in LANGS:
            draw_image(found[lang], os.path.join(ROOT, 'images', 'og', '%s-%s.jpg' % (slug, lang)))
        open(path, 'w', encoding='utf-8').write(set_og_image(page, slug))
        print('images/og/%s-{%s}.jpg' % (slug, ','.join(LANGS)))


if __name__ == '__main__':
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    main(sys.argv[1:])
