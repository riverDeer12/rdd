#!/usr/bin/env python3
"""
RDD Software - build the language versions of the site.

Every page in src/ is written once, with all four languages side by side
(<span data-lang="hr">...</span><span data-lang="en">...</span>...).
This script turns each of them into one static page per language:

    src/pricing.html  ->  pricing.html       Croatian (the default, no prefix)
                          en/pricing.html    English
                          it/pricing.html    Italian
                          de/pricing.html    German

so search engines see a separate, single-language URL for every version.
Each generated page keeps only its own language and gets its own <title>,
meta description, canonical URL and hreflang links; the language switcher
becomes plain links between the versions. sitemap.xml is rebuilt as well.

GitHub Pages serves the repository as it is, so the generated files are
committed too. The "Build pages" workflow (.github/workflows/build.yml)
runs this script on every push to master that touches src/ or tools/ and
commits the result; to see the result before pushing, run it locally:

    python3 tools/build.py

Page conventions in src/:
  * data-lang="xx" on an element      -> kept only in language xx
  * <html data-title-xx data-description-xx>  -> <title> and meta description
  * data-ph-xx on inputs              -> placeholder in language xx
  * data-label-xx on <option>         -> option text in language xx
  * buttons .lang-switch__btn[data-set-lang] -> links to the other versions
"""

import datetime
import os
import re
import sys
from html.parser import HTMLParser

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
SRC = os.path.join(ROOT, 'src')

SITE = 'https://rdd.software/'
LANGS = ['hr', 'en', 'it', 'de']
DEFAULT_LANG = 'hr'      # served without a prefix
X_DEFAULT = 'en'         # for visitors whose language the site does not have
OG_LOCALE = {'hr': 'hr_HR', 'en': 'en_GB', 'it': 'it_IT', 'de': 'de_DE'}

# sitemap priority by page; anything not listed gets 0.6
PRIORITY = {
    'index.html': '1.0',
    'pricing.html': '0.8',
    'web-development.html': '0.8',
    'mobile-apps.html': '0.8',
    'custom-software.html': '0.8',
    'blog.html': '0.7',
    'privacy.html': '0.3',
    'terms.html': '0.3',
}

VOID = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link',
        'meta', 'source', 'track', 'wbr'}
URL_ATTRS = ('href', 'src', 'action', 'poster')
LANG_ATTRS = r'(?:hr|en|it|de)'


# --------------------------------------------------------------------
# locating elements in the source, with their exact character offsets
# --------------------------------------------------------------------
class Element:
    __slots__ = ('tag', 'attrs', 'start', 'open_end', 'close_start', 'end')

    def __init__(self, tag, attrs, start, open_end):
        self.tag = tag
        self.attrs = dict(attrs)
        self.start = start            # '<' of the start tag
        self.open_end = open_end      # just after the start tag
        self.close_start = open_end   # '<' of the end tag (void: = open_end)
        self.end = open_end           # just after the end tag


class Scanner(HTMLParser):
    def __init__(self, text):
        super().__init__(convert_charrefs=False)
        self.text = text
        self.line_starts = [0] + [m.end() for m in re.finditer('\n', text)]
        self.stack = []
        self.elements = []
        self.feed(text)
        self.close()

    def _offset(self):
        line, col = self.getpos()
        return self.line_starts[line - 1] + col

    def handle_starttag(self, tag, attrs):
        start = self._offset()
        el = Element(tag, attrs, start, start + len(self.get_starttag_text()))
        self.elements.append(el)
        if tag not in VOID:
            self.stack.append(el)

    def handle_startendtag(self, tag, attrs):
        start = self._offset()
        self.elements.append(Element(tag, attrs, start, start + len(self.get_starttag_text())))

    def handle_endtag(self, tag):
        start = self._offset()
        end = self.text.index('>', start) + 1
        for i in range(len(self.stack) - 1, -1, -1):
            if self.stack[i].tag == tag:
                for unclosed in self.stack[i + 1:]:
                    if 'data-lang' in unclosed.attrs:
                        raise ValueError('<%s data-lang> at offset %d is never closed' % (unclosed.tag, unclosed.start))
                el = self.stack[i]
                el.close_start, el.end = start, end
                del self.stack[i:]
                return


# --------------------------------------------------------------------
# helpers
# --------------------------------------------------------------------
def page_url(page, lang):
    prefix = '' if lang == DEFAULT_LANG else lang + '/'
    return SITE + prefix + ('' if page == 'index.html' else page)


def relative_url(page, from_lang, to_lang):
    up = '' if from_lang == DEFAULT_LANG else '../'
    folder = '' if to_lang == DEFAULT_LANG else to_lang + '/'
    return (up + folder + ('' if page == 'index.html' else page)) or './'


def raw_attr(tag_text, name):
    m = re.search(r'\s%s="([^"]*)"' % re.escape(name), tag_text)
    return m.group(1) if m else None


def set_attr(tag_text, name, value):
    pattern = r'(\s%s=")[^"]*(")' % re.escape(name)
    if re.search(pattern, tag_text):
        return re.sub(pattern, lambda m: m.group(1) + value + m.group(2), tag_text, count=1)
    close = '/>' if tag_text.endswith('/>') else '>'
    return tag_text[:-len(close)].rstrip() + ' %s="%s"' % (name, value) + close


def drop_attrs(tag_text, prefix):
    return re.sub(r'\s+data-%s-%s="[^"]*"' % (prefix, LANG_ATTRS), '', tag_text)


def whole_lines(text, start, end):
    """Widen [start, end) to whole lines when nothing else is on them."""
    line_start = text.rfind('\n', 0, start) + 1
    line_end = text.find('\n', end)
    line_end = len(text) if line_end == -1 else line_end
    if text[line_start:start].strip() == '' and text[end:line_end].strip() == '':
        return line_start, min(line_end + 1, len(text))
    return start, end


# --------------------------------------------------------------------
# one page in one language
# --------------------------------------------------------------------
def render(text, page, lang, pages):
    scanner = Scanner(text)
    edits = []      # (start, end, replacement)
    removed = []    # (start, end)

    def inside_removed(pos):
        return any(s <= pos < e for s, e in removed)

    def rewrite_url(url):
        if lang == DEFAULT_LANG or not url:
            return url
        if re.match(r'^(#|[a-z][a-z0-9+.-]*:|/)', url, re.I):
            return url                  # anchor, absolute URL, mailto:, tel:, /path
        if re.split(r'[#?]', url, 1)[0] in pages:
            return url                  # another page: the same language folder has it
        return '../' + url              # css, js, images, downloads live in the root

    title = description = title_el = None

    # 1. drop the other languages
    for el in scanner.elements:
        value = el.attrs.get('data-lang')
        if value in LANGS and value != lang and not inside_removed(el.start):
            start, end = whole_lines(text, el.start, el.end)
            removed.append((start, end))
            edits.append((start, end, ''))

    # 2. rewrite what is left
    for el in scanner.elements:
        if inside_removed(el.start):
            continue
        tag = text[el.start:el.open_end]
        new = tag

        if el.tag == 'html':
            title = raw_attr(tag, 'data-title-' + lang)
            description = raw_attr(tag, 'data-description-' + lang)
            if not title or not description:
                raise ValueError('%s: <html> needs data-title-%s and data-description-%s' % (page, lang, lang))
            new = drop_attrs(drop_attrs(new, 'title'), 'description')
            new = set_attr(new, 'lang', lang)

        if el.tag == 'title':
            title_el = el

        label = raw_attr(tag, 'data-label-' + lang)
        if label is not None:
            edits.append((el.open_end, el.close_start, label))
            new = drop_attrs(new, 'label')

        placeholder = raw_attr(tag, 'data-ph-' + lang)
        if placeholder is not None:
            new = set_attr(drop_attrs(new, 'ph'), 'placeholder', placeholder)

        if lang != DEFAULT_LANG:
            new = re.sub(r'(\s(?:%s)=")([^"]*)(")' % '|'.join(URL_ATTRS),
                         lambda m: m.group(1) + rewrite_url(m.group(2)) + m.group(3), new)
            new = re.sub(r'(\ssrcset=")([^"]*)(")',
                         lambda m: m.group(1) + ', '.join(
                             ' '.join([rewrite_url(part.split()[0])] + part.split()[1:])
                             for part in m.group(2).split(',') if part.strip()) + m.group(3), new)

        # language switcher: buttons become links to the other versions
        target = el.attrs.get('data-set-lang')
        if el.tag == 'button' and target in LANGS:
            classes = el.attrs.get('class', '')
            if target == lang:
                classes += ' is-active'
            new = '<a class="%s" href="%s" hreflang="%s" lang="%s" data-set-lang="%s"%s>' % (
                classes, relative_url(page, lang, target), target, target, target,
                ' aria-current="page"' if target == lang else '')
            edits.append((el.close_start, el.end, '</a>'))

        if new != tag:
            edits.append((el.start, el.open_end, new))

    # 3. <title>, then the per-language head block right after it
    #    (before js/i18n.js, which reads the hreflang links)
    edits.append((title_el.open_end, title_el.close_start, title))
    alternates = ''.join(
        '\n    <link rel="alternate" hreflang="%s" href="%s">' % (l, page_url(page, l)) for l in LANGS)
    head = (
        '\n    <meta name="description" content="%s">'
        '\n    <link rel="canonical" href="%s">%s'
        '\n    <link rel="alternate" hreflang="x-default" href="%s">'
        '\n    <meta property="og:locale" content="%s">'
        '\n    <meta property="og:title" content="%s">'
        '\n    <meta property="og:description" content="%s">'
        '\n    <meta property="og:url" content="%s">'
    ) % (description, page_url(page, lang), alternates, page_url(page, X_DEFAULT),
         OG_LOCALE[lang], title, description, page_url(page, lang))
    edits.append((title_el.end, title_el.end, head))

    # apply from the end so earlier offsets stay valid
    edits.sort(key=lambda e: (e[0], e[1]), reverse=True)
    out = text
    last_start = len(text) + 1
    for start, end, replacement in edits:
        if end > last_start:
            raise ValueError('%s: overlapping edits at %d' % (page, start))
        out = out[:start] + replacement + out[end:]
        last_start = start

    notice = '<!-- Generated by tools/build.py from src/%s - edit the source, not this file. -->\n' % page
    return re.sub(r'^(<!DOCTYPE html>\n)', lambda m: m.group(1) + notice, out, count=1, flags=re.I)


# --------------------------------------------------------------------
# sitemap
# --------------------------------------------------------------------
def write_sitemap(pages, changed):
    path = os.path.join(ROOT, 'sitemap.xml')
    previous = {}
    if os.path.exists(path):
        old = open(path, encoding='utf-8').read()
        for m in re.finditer(r'<loc>([^<]+)</loc>\s*(?:<xhtml:link[^>]*>\s*)*<lastmod>([^<]+)</lastmod>', old):
            previous[m.group(1)] = m.group(2)
    today = datetime.date.today().isoformat()

    order = ['index.html'] + sorted(p for p in pages if p != 'index.html')
    lines = ['<?xml version="1.0" encoding="UTF-8"?>',
             '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
             '        xmlns:xhtml="http://www.w3.org/1999/xhtml">']
    for page in order:
        for lang in LANGS:
            loc = page_url(page, lang)
            lastmod = today if (page, lang) in changed or loc not in previous else previous[loc]
            lines.append('    <url>')
            lines.append('        <loc>%s</loc>' % loc)
            for l in LANGS:
                lines.append('        <xhtml:link rel="alternate" hreflang="%s" href="%s"/>' % (l, page_url(page, l)))
            lines.append('        <xhtml:link rel="alternate" hreflang="x-default" href="%s"/>' % page_url(page, X_DEFAULT))
            lines.append('        <lastmod>%s</lastmod>' % lastmod)
            lines.append('        <priority>%s</priority>' % PRIORITY.get(page, '0.6'))
            lines.append('    </url>')
    lines.append('</urlset>')
    open(path, 'w', encoding='utf-8').write('\n'.join(lines) + '\n')


def main():
    pages = sorted(f for f in os.listdir(SRC) if f.endswith('.html'))
    changed = set()
    for page in pages:
        text = open(os.path.join(SRC, page), encoding='utf-8').read().replace('\r\n', '\n')
        for lang in LANGS:
            out = render(text, page, lang, pages)
            folder = ROOT if lang == DEFAULT_LANG else os.path.join(ROOT, lang)
            os.makedirs(folder, exist_ok=True)
            target = os.path.join(folder, page)
            old = open(target, encoding='utf-8').read() if os.path.exists(target) else None
            if old != out:
                open(target, 'w', encoding='utf-8').write(out)
                changed.add((page, lang))
    write_sitemap(pages, changed)
    print('built %d pages x %d languages, %d files changed' % (len(pages), len(LANGS), len(changed)))


if __name__ == '__main__':
    sys.exit(main())
