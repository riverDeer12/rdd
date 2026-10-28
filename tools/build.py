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
becomes plain links between the versions. sitemap.xml and the blog's RSS
feeds (feed.xml, en/feed.xml, ...) are rebuilt as well.

GitHub Pages serves the repository as it is, so the generated files are
committed too. The "Build pages" workflow (.github/workflows/build.yml)
runs this script on every push to master that touches src/ or tools/ and
commits the result; to see the result before pushing, run it locally:

    python3 tools/build.py

Page conventions in src/:
  * data-lang="xx" on an element      -> kept only in language xx
  * <html data-title-xx data-description-xx>  -> <title> and meta description
  * data-ph-xx on inputs              -> placeholder in language xx
  * data-alt-xx on images             -> alt text in language xx
  * data-aria-label-xx, data-title-xx -> aria-label / title in language xx
  * data-content-xx on <meta>         -> content in language xx (og:image per language)
  * data-label-xx on <option>         -> option text in language xx
  * buttons .lang-switch__btn[data-set-lang] -> links to the other versions

Every page except the home page also gets a breadcrumb trail (Home > Blog >
article) above its title, with the same trail as BreadcrumbList structured
data for search engines; see breadcrumbs() below.
Every blog article's "read next" list also starts with the newest other
article (read_next() below), so older articles keep leading to new ones,
and project pages get structured data about the project (project_data()).
"""

import datetime
import email.utils
import html
import json
import os
import re
import sys
from html.parser import HTMLParser
from xml.sax.saxutils import escape as xml_escape

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
    'services.html': '0.8',
    'blog.html': '0.7',
    'privacy.html': '0.3',
    'terms.html': '0.3',
}

VOID = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link',
        'meta', 'source', 'track', 'wbr'}
URL_ATTRS = ('href', 'src', 'action', 'poster')
LANG_ATTRS = r'(?:hr|en|it|de)'
COPYRIGHT_SCRIPT = '<script>document.write(/\\d{4}/.exec(Date())[0] + ".")</script>'


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

        # data-<name>-xx="..." -> <attribute>="..." in language xx
        # (data-title-xx on <html> is the page title, handled above)
        for name, attribute in (('ph', 'placeholder'), ('alt', 'alt'),
                                ('aria-label', 'aria-label'), ('title', 'title'),
                                ('content', 'content')):
            if name == 'title' and el.tag == 'html':
                continue
            value = raw_attr(tag, 'data-%s-%s' % (name, lang))
            if value is not None:
                new = set_attr(drop_attrs(new, name), attribute, value)

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
        '\n    <link rel="alternate" type="application/rss+xml" title="RDD Software blog" href="%s">'
    ) % (description, page_url(page, lang), alternates, page_url(page, X_DEFAULT),
         OG_LOCALE[lang], title, description, page_url(page, lang), feed_url(lang))
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
# breadcrumbs: Home > section > this page, visible and for search engines
# --------------------------------------------------------------------
CRUMB_HOME = {'hr': 'Početna', 'en': 'Home', 'it': 'Home', 'de': 'Startseite'}
CRUMB_LABEL = {'hr': 'Putanja', 'en': 'Breadcrumb', 'it': 'Percorso', 'de': 'Navigationspfad'}
SERVICES = {'web-development.html', 'mobile-apps.html', 'custom-software.html'}
CRUMB_SECTION = {
    'blog': ('blog.html', {'hr': 'Blog', 'en': 'Blog', 'it': 'Blog', 'de': 'Blog'}),
    'services': ('services.html', {'hr': 'Usluge', 'en': 'Services', 'it': 'Servizi', 'de': 'Leistungen'}),
    'projects': ('index.html#works', {'hr': 'Projekti', 'en': 'Projects', 'it': 'Progetti', 'de': 'Projekte'}),
}


def crumb_section(page):
    if page.startswith('blog-'):
        return 'blog'
    if page in SERVICES:
        return 'services'
    if page.endswith('-details.html'):
        return 'projects'
    return None


def breadcrumbs(out, page, lang):
    """Add the trail above the page's <h1>: before the small label over
    the title on the main pages, at the top of <main> on project pages."""
    if page == 'index.html':
        return out
    h1 = re.search(r'<h1[^>]*>(.*?)</h1>', out, re.S)
    if not h1:
        raise ValueError('%s: no <h1> for the breadcrumb' % page)
    # the title as one line: "Website-<br>Erstellung. <br>" -> "Website-Erstellung"
    raw = re.sub(r'(-|&shy;)\s*<br\s*/?>\s*', lambda m: '-' if m.group(1) == '-' else '', h1.group(1))
    name = re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', raw))).strip()
    name = re.sub(r'\s+([.,:;!?])', r'\1', name).rstrip('.').replace('\xad', '')
    if page == 'blog.html':
        name = 'Blog'

    # links stay inside the language folder, so a page name is enough
    trail = [(CRUMB_HOME[lang], './', page_url('index.html', lang))]
    section = crumb_section(page)
    if section:
        href, labels = CRUMB_SECTION[section]
        target, _, anchor = href.partition('#')
        anchor = '#' + anchor if anchor else ''
        trail.append((labels[lang], ('./' if target == 'index.html' else target) + anchor,
                      page_url(target, lang) + anchor))
    trail.append((name, None, page_url(page, lang)))

    items = ''.join(
        '<li><a href="%s">%s</a></li>' % (href, html.escape(label)) if href else
        '<li aria-current="page">%s</li>' % html.escape(name)
        for label, href, _ in trail)
    nav = '<nav class="breadcrumb" aria-label="%s"><ol>%s</ol></nav>' % (CRUMB_LABEL[lang], items)

    pretitle = out.rfind('<div class="text-pretitle with-line">', 0, h1.start())
    main = out.rfind('<main', 0, h1.start())
    if pretitle > main:
        at = out.rfind('\n', 0, pretitle) + 1
        indent = out[at:pretitle]
    elif main != -1:
        at = out.index('>', main) + 2
        indent = ' ' * 8
    else:
        raise ValueError('%s: no place for the breadcrumb' % page)
    out = out[:at] + indent + nav + '\n\n' + out[at:]

    data = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        'itemListElement': [
            {'@type': 'ListItem', 'position': i + 1, 'name': label, 'item': url}
            for i, (label, _, url) in enumerate(trail)],
    }
    ld = '    <script type="application/ld+json">%s</script>\n' % json.dumps(data, ensure_ascii=False)
    head_end = out.index('</head>')
    return out[:head_end] + ld + out[head_end:]


# --------------------------------------------------------------------
# project pages (*-details.html): structured data describing the project
# --------------------------------------------------------------------
def project_data(out, page, lang):
    if not page.endswith('-details.html'):
        return out
    h1 = re.search(r'<h1[^>]*>(.*?)</h1>', out, re.S)
    found = lambda pattern: (re.search(pattern, out, re.S) or [None, None])[1]
    data = {
        '@context': 'https://schema.org',
        '@type': 'CreativeWork',
        'name': html.unescape(re.sub(r'<[^>]+>', '', h1.group(1))).strip(),
        'description': html.unescape(found(r'<meta name="description" content="([^"]*)"') or ''),
        'url': page_url(page, lang),
        'inLanguage': lang,
        'creator': {'@type': 'ProfessionalService', 'name': 'RDD Software', 'url': SITE},
    }
    image = found(r'<meta property="og:image" content="([^"]*)"')
    year = found(r'project-year">\s*(\d{4})')
    live = found(r'class="flex gap-4 project-links">\s*<a\s+href="(https?://[^"]+)"')
    if image:
        data['image'] = image
    if year:
        data['dateCreated'] = year
    if live:
        data['sameAs'] = live
    ld = '    <script type="application/ld+json">%s</script>\n' % json.dumps(data, ensure_ascii=False)
    head_end = out.index('</head>')
    return out[:head_end] + ld + out[head_end:]


# --------------------------------------------------------------------
# blog: every article's "read next" list starts with the newest other
# article, so older articles keep leading to new ones
# --------------------------------------------------------------------
def blog_articles(lang):
    """[(slug, title)] newest first, from the list in src/blog.html."""
    path = os.path.join(SRC, 'blog.html')
    if not os.path.exists(path):
        return []
    blog = open(path, encoding='utf-8').read()
    start = blog.index('<div class="page-body" data-lang="%s">' % lang)
    block = blog[start:blog.index('</ul>', start)]
    return [(slug, title.strip()) for _, slug, title, _ in ITEM.findall(block)]


def read_next(out, page, lang):
    if not page.startswith('blog-'):
        return out
    slug = page[:-len('.html')]
    newest = next(((s, title) for s, title in blog_articles(lang) if s != slug), None)
    ul = out.find('<ul class="page-related">', out.find('<article class="article'))
    if not newest or ul == -1:
        return out
    end = out.index('</ul>', ul)
    if 'href="%s.html"' % newest[0] in out[ul:end]:
        return out
    first = out.index('<li>', ul)
    indent = out[out.rfind('\n', 0, first) + 1:first]
    item = '<li><a href="%s.html">%s &rarr;</a></li>\n' % newest
    return out[:first] + item + indent + out[first:]


# --------------------------------------------------------------------
# sitemap
# --------------------------------------------------------------------
def feed_url(lang):
    return SITE + ('' if lang == DEFAULT_LANG else lang + '/') + 'feed.xml'


# --------------------------------------------------------------------
# RSS feed of the blog, one per language (from the list in src/blog.html)
# --------------------------------------------------------------------
FEED_LANGUAGE = {'hr': 'hr-HR', 'en': 'en', 'it': 'it', 'de': 'de'}
ITEM = re.compile(r'<time datetime="(\d{4}-\d{2}-\d{2})">.*?<h2 class="blog-list__title"><a href="([^"]+)\.html">(.*?)</a></h2>'
                  r'\s*<p class="blog-list__excerpt">(.*?)</p>', re.S)


def write_feeds():
    blog = open(os.path.join(SRC, 'blog.html'), encoding='utf-8').read()
    for lang in LANGS:
        start = blog.index('<div class="page-body" data-lang="%s">' % lang)
        block = blog[start:blog.index('</ul>', start)]
        description = raw_attr(blog[:blog.index('>', blog.index('<html'))], 'data-description-' + lang)
        text = lambda s: xml_escape(html.unescape(re.sub(r'<[^>]+>', '', s)).strip())
        items = []
        for date, slug, title, excerpt in ITEM.findall(block):
            day = datetime.datetime.strptime(date, '%Y-%m-%d').replace(hour=7, tzinfo=datetime.timezone.utc)
            link = page_url(slug + '.html', lang)
            items.append(
                '    <item>\n'
                '      <title>%s</title>\n'
                '      <link>%s</link>\n'
                '      <guid isPermaLink="true">%s</guid>\n'
                '      <pubDate>%s</pubDate>\n'
                '      <description>%s</description>\n'
                '    </item>' % (text(title), link, link, email.utils.format_datetime(day), text(excerpt)))
        feed = (
            '<?xml version="1.0" encoding="UTF-8"?>\n'
            '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n'
            '  <channel>\n'
            '    <title>RDD Software blog</title>\n'
            '    <link>%s</link>\n'
            '    <description>%s</description>\n'
            '    <language>%s</language>\n'
            '    <atom:link href="%s" rel="self" type="application/rss+xml"/>\n'
            '%s\n'
            '  </channel>\n'
            '</rss>\n') % (page_url('blog.html', lang), text(description), FEED_LANGUAGE[lang],
                            feed_url(lang), '\n'.join(items))
        folder = ROOT if lang == DEFAULT_LANG else os.path.join(ROOT, lang)
        path = os.path.join(folder, 'feed.xml')
        if not os.path.exists(path) or open(path, encoding='utf-8').read() != feed:
            open(path, 'w', encoding='utf-8').write(feed)


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
            # the copyright year, written at build time instead of with document.write
            out = out.replace(COPYRIGHT_SCRIPT, '%d.' % datetime.date.today().year)
            out = project_data(read_next(breadcrumbs(out, page, lang), page, lang), page, lang)
            folder = ROOT if lang == DEFAULT_LANG else os.path.join(ROOT, lang)
            os.makedirs(folder, exist_ok=True)
            target = os.path.join(folder, page)
            old = open(target, encoding='utf-8').read() if os.path.exists(target) else None
            if old != out:
                open(target, 'w', encoding='utf-8').write(out)
                changed.add((page, lang))
    write_sitemap(pages, changed)
    if 'blog.html' in pages:
        write_feeds()
    print('built %d pages x %d languages, %d files changed' % (len(pages), len(LANGS), len(changed)))


if __name__ == '__main__':
    sys.exit(main())
