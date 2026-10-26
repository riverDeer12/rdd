#!/usr/bin/env python3
"""
RDD Software - create a new page in src/ from two draft files.

    python3 tools/new_page.py <slug> --parts <dir> [--blog]

<dir>/<slug>.meta.json   titles, descriptions, structured data (see below)
<dir>/<slug>.main.html   what goes inside <main>, every language side by
                         side (data-lang="hr|en|it|de"), ending with the
                         closing lines of the last .column

The header, footer, scripts and styles are taken from src/pricing.html,
so the new page looks like the rest of the site; a call to action is
added at the end of the content. With --blog the article is also listed
at the top of src/blog.html in all four languages and gets its share
images (tools/og_image.py), shown under the title and in the blog list.

meta.json:
    {
      "title":       {"hr": "...", "en": "...", "it": "...", "de": "..."},
      "description": {"hr": "...", ...},
      "nav": "blog",                 (optional: highlights Blog in the menu)
      "og_type": "article",          (optional)
      "jsonld": {"hr": {...}, ...},  (optional: schema.org, one per language)
      "date": "2026-10-19",          (--blog: publication date)
      "headline": {"hr": "...", ...},(--blog: article title in the list)
      "excerpt":  {"hr": "...", ...} (--blog: one or two sentences)
    }

Then run python3 tools/build.py and python3 tools/check_links.py.
See docs/blog-guide.md for how articles are written.
"""

import argparse
import datetime
import html
import json
import os
import re
import sys

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
LANGS = ['hr', 'en', 'it', 'de']

MONTHS = {
    'hr': ['siječnja', 'veljače', 'ožujka', 'travnja', 'svibnja', 'lipnja',
           'srpnja', 'kolovoza', 'rujna', 'listopada', 'studenoga', 'prosinca'],
    'en': ['January', 'February', 'March', 'April', 'May', 'June', 'July',
           'August', 'September', 'October', 'November', 'December'],
    'it': ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio',
           'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'],
    'de': ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli',
           'August', 'September', 'Oktober', 'November', 'Dezember'],
}
READ_MORE = {'hr': 'Pročitajte članak', 'en': 'Read the article',
             'it': "Leggi l'articolo", 'de': 'Artikel lesen'}

CTA = '''
                    <section class="project-cta">
                        <h2 class="project-cta__title"><span data-lang="hr">Imate projekt na umu?</span><span data-lang="en">Have a project in mind?</span><span data-lang="it">Hai un progetto in mente?</span><span data-lang="de">Haben Sie ein Projekt geplant?</span></h2>
                        <p class="project-cta__text"><span data-lang="hr">Javite nam se i besplatno ćemo procijeniti opseg i cijenu vašeg projekta.</span><span data-lang="en">Get in touch and we will estimate the scope and price of your project free of charge.</span><span data-lang="it">Contattaci e stimeremo gratuitamente portata e prezzo del tuo progetto.</span><span data-lang="de">Melden Sie sich, und wir schätzen Umfang und Preis Ihres Projekts kostenlos ein.</span></p>
                        <div class="project-cta__actions">
                            <a class="project-cta__btn project-cta__btn--primary" href="index.html#contact"><span data-lang="hr">Pošaljite upit</span><span data-lang="en">Send an enquiry</span><span data-lang="it">Invia una richiesta</span><span data-lang="de">Anfrage senden</span></a>
                            <a class="project-cta__btn" href="index.html#booking"><span data-lang="hr">Rezervirajte konzultacije</span><span data-lang="en">Book a consultation</span><span data-lang="it">Prenota una consulenza</span><span data-lang="de">Beratung buchen</span></a>
                        </div>
                    </section>
'''


def long_date(day, lang):
    month = MONTHS[lang][day.month - 1]
    if lang == 'hr':
        return '%d. %s %d.' % (day.day, month, day.year)
    if lang == 'de':
        return '%d. %s %d' % (day.day, month, day.year)
    return '%d %s %d' % (day.day, month, day.year)


def create_page(slug, meta, body):
    t = open(os.path.join(ROOT, 'src', 'pricing.html'), encoding='utf-8').read()
    esc = lambda s: html.escape(s, quote=True)

    attrs = ''.join('\n      data-title-%s="%s"' % (l, esc(meta['title'][l])) for l in LANGS)
    attrs += ''.join('\n      data-description-%s="%s"' % (l, esc(meta['description'][l])) for l in LANGS)
    t = re.sub(r'<html[^>]*>', lambda m: '<html class="no-js" lang="hr"' + attrs + '>', t, count=1)
    t = re.sub(r'<title>.*?</title>', lambda m: '<title>%s</title>' % esc(meta['title']['hr']), t, count=1)
    t = re.sub(r'\n    <style>.*?</style>\n', '\n', t, count=1, flags=re.S)       # price list styles
    t = re.sub(r'\n<script src="js/estimate.js"></script>', '', t)               # price estimate
    t = re.sub(r'(<link rel="stylesheet" href="css/cta.css[^"]*">)',
               lambda m: m.group(1) + '\n    <link rel="stylesheet" href="css/home.css?v=3">'
                                      '\n    <link rel="stylesheet" href="css/pages.css?v=6">', t, count=1)
    if meta.get('og_type'):
        t = t.replace('<meta property="og:type" content="website"/>',
                      '<meta property="og:type" content="%s"/>' % meta['og_type'], 1)

    ld = ''
    for l in LANGS:
        if meta.get('jsonld', {}).get(l):
            data = json.dumps(meta['jsonld'][l], ensure_ascii=False, indent=4).replace('\n', '\n    ')
            ld += '    <script type="application/ld+json" data-lang="%s">\n    %s\n    </script>\n' % (l, data)
    if ld:
        t = t.replace('    <!-- language (hr / en / it / de)',
                      '    <!-- structured data for search engines, one per language -->\n' + ld +
                      '\n    <!-- language (hr / en / it / de)', 1)

    t = t.replace('<li class="current"><a href="pricing.html">', '<li><a href="pricing.html">', 1)
    if meta.get('nav') == 'blog':
        t = t.replace('<li><a href="blog.html">Blog</a></li>', '<li class="current"><a href="blog.html">Blog</a></li>', 1)

    main = '<main class="s-content">\n\n' + body.rstrip() + '\n\n    </main>'
    end = main.rfind('                </div>\n            </div>')
    if end == -1:
        sys.exit('main.html must end with the closing lines of the last .column (see docs/blog-guide.md)')
    main = main[:end] + CTA.lstrip('\n') + main[end:]
    t = re.sub(r'<main class="s-content">.*?</main>', lambda m: main, t, count=1, flags=re.S)

    path = os.path.join(ROOT, 'src', slug + '.html')
    open(path, 'w', encoding='utf-8').write(t)
    print('wrote src/%s.html' % slug)


def add_cover(slug):
    """The share image under the article's title and date, one per language."""
    path = os.path.join(ROOT, 'src', slug + '.html')
    t = open(path, encoding='utf-8').read()
    if 'class="article-cover"' in t:
        return
    meta = list(re.finditer(r'\n( *)<p class="article-meta" data-lang="de">.*?</p>', t))
    if not meta:
        sys.exit('main.html needs the <p class="article-meta" data-lang="xx"> lines (see docs/blog-guide.md)')
    indent = meta[-1].group(1)
    imgs = ''.join('\n%s<img class="article-cover" data-lang="%s" src="images/og/%s-%s.jpg" width="1200" height="630" decoding="async" alt="">'
                   % (indent, l, slug, l) for l in LANGS)
    t = t[:meta[-1].end()] + '\n' + imgs + t[meta[-1].end():]
    open(path, 'w', encoding='utf-8').write(t)


def list_on_blog(slug, meta):
    path = os.path.join(ROOT, 'src', 'blog.html')
    t = open(path, encoding='utf-8').read()
    if 'href="%s.html"' % slug in t:
        print('src/blog.html already lists %s' % slug)
        return
    day = datetime.date.fromisoformat(meta['date'])
    for l in LANGS:
        block = t.index('<div class="page-body" data-lang="%s">' % l)
        ul = t.index('<ul class="blog-list">', block) + len('<ul class="blog-list">')
        item = '''
                            <li class="blog-list__item">
                                <a class="blog-list__thumb" href="%s.html" tabindex="-1" aria-hidden="true"><img src="images/og/%s-%s.jpg" width="1200" height="630" loading="lazy" decoding="async" alt=""></a>
                                <div class="blog-list__text">
                                    <p class="article-meta"><time datetime="%s">%s</time><span>Milan Trbojević</span></p>
                                    <h2 class="blog-list__title"><a href="%s.html">%s</a></h2>
                                    <p class="blog-list__excerpt">%s</p>
                                    <a class="blog-list__more" href="%s.html">%s &rarr;</a>
                                </div>
                            </li>''' % (slug, slug, l, meta['date'], long_date(day, l), slug, meta['headline'][l],
                                        meta['excerpt'][l], slug, READ_MORE[l])
        t = t[:ul] + item + t[ul:]
    open(path, 'w', encoding='utf-8').write(t)
    print('listed %s at the top of src/blog.html' % slug)


def main():
    parser = argparse.ArgumentParser(description='Create a page in src/ from draft files.')
    parser.add_argument('slug', help='file name without .html, e.g. blog-website-maintenance')
    parser.add_argument('--parts', required=True, help='directory with <slug>.meta.json and <slug>.main.html')
    parser.add_argument('--blog', action='store_true', help='also list the article on the blog page')
    args = parser.parse_args()

    if not re.fullmatch(r'[a-z0-9]+(-[a-z0-9]+)*', args.slug):
        sys.exit('slug: lowercase letters, digits and single hyphens only')
    meta = json.load(open(os.path.join(args.parts, args.slug + '.meta.json'), encoding='utf-8'))
    body = open(os.path.join(args.parts, args.slug + '.main.html'), encoding='utf-8').read()
    for key in ['title', 'description'] + (['date', 'headline', 'excerpt'] if args.blog else []):
        if key not in meta:
            sys.exit('meta.json is missing "%s"' % key)

    create_page(args.slug, meta, body)
    if args.blog:
        add_cover(args.slug)
        list_on_blog(args.slug, meta)
        # share image per language (LinkedIn, link previews), see tools/og_image.py
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        import og_image
        og_image.main([args.slug])


if __name__ == '__main__':
    main()
