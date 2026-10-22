#!/usr/bin/env python3
"""
RDD Software - check the live site (run every week by .github/workflows/site-check.yml).

    python3 tools/site_check.py [--site https://rdd.software/] [--report report.md]

  * every page in sitemap.xml opens (all four languages)
  * every link, image, stylesheet and script on those pages works,
    including links to other websites (client projects, LinkedIn...)
    and #anchors on our own pages
  * the contact form's service (FormSubmit) answers
  * the booking calendar's event pages on Cal.com exist

Writes a short report in Croatian (Markdown) and exits with 1 when
something is broken, so the workflow can open an issue.
"""

import argparse
import concurrent.futures
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from html.parser import HTMLParser

UA = ('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) '
      'Chrome/130.0 Safari/537.36 rdd-site-check')
TIMEOUT = 20

# sites that refuse automated requests although the link works in a browser
# (LinkedIn answers 999, some others 403/429 to anything that is not a browser)
BOT_WALLS = ('linkedin.com', 'formsubmit.co')
SKIP = re.compile(r'^(mailto:|tel:|javascript:|data:)', re.I)


class Links(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.urls = set()
        self.ids = set()

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if a.get('id'):
            self.ids.add(a['id'])
        if tag == 'a' and a.get('name'):
            self.ids.add(a['name'])
        for name in ('href', 'src', 'poster'):
            if a.get(name) and not (tag == 'link' and a.get('rel') in ('preconnect', 'dns-prefetch')):
                self.urls.add(a[name].strip())
        for part in (a.get('srcset') or '').split(','):
            if part.strip():
                self.urls.add(part.split()[0])


def fetch(url, method='GET'):
    """(status, body or None, final url); status 0 when there was no answer."""
    req = urllib.request.Request(url, method=method, headers={
        'User-Agent': UA, 'Accept': 'text/html,application/xhtml+xml,*/*;q=0.8',
        'Accept-Language': 'hr,en;q=0.8'})
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
            body = r.read() if method == 'GET' else None
            return r.status, body, r.geturl()
    except urllib.error.HTTPError as e:
        return e.code, None, url
    except Exception as e:           # DNS, TLS, timeout, refused...
        return 0, str(e), url


def check_url(url):
    status, body, _ = fetch(url, 'HEAD')
    if status in (0, 403, 404, 405, 429, 501) or status >= 500:
        status, body, _ = fetch(url)    # some servers do not do HEAD properly
    return status, (body if status == 0 else None)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--site', default='https://rdd.software/')
    parser.add_argument('--report', help='write the Markdown report here too')
    args = parser.parse_args()
    site = args.site.rstrip('/') + '/'
    host = urllib.parse.urlparse(site).netloc

    problems = []      # (where, what)
    warnings = []

    # 1. the pages
    status, body, _ = fetch(site + 'sitemap.xml')
    if status != 200 or not body:
        problems.append(('sitemap.xml', 'ne otvara se (%s)' % (status or body)))
        pages = [site]
    else:
        xml = body.decode('utf-8', 'replace')
        pages = sorted(set(re.findall(r'<loc>([^<]+)</loc>', xml)) |
                       set(re.findall(r'<xhtml:link[^>]*href="([^"]+)"', xml)))
    pages.append(site + 'js/booking.js')    # read below for the calendar links
    pages.append(site + 'js/contact.js')

    found = {}         # page -> (ids, urls)
    sources = {}       # page -> text, for js files

    def load(page):
        return page, fetch(page)

    with concurrent.futures.ThreadPoolExecutor(8) as pool:
        for page, (status, body, final) in pool.map(load, pages):
            if status != 200 or body is None:
                problems.append((page, 'stranica se ne otvara (%s)' % (status or body)))
                continue
            text = body.decode('utf-8', 'replace')
            if page.endswith('.js'):
                sources[page] = text
                continue
            p = Links()
            p.feed(text)
            found[page] = (p.ids, p.urls)

    # 2. everything the pages link to
    targets = {}       # absolute url without #anchor -> set of pages using it
    anchors = []       # (page, absolute url with anchor)
    for page, (_, urls) in found.items():
        for raw in urls:
            if not raw or SKIP.match(raw):
                continue
            url = urllib.parse.urljoin(page, raw)
            if not url.startswith(('http://', 'https://')):
                continue
            base, _, frag = url.partition('#')
            if frag not in ('', '0') and urllib.parse.urlparse(url).netloc == host:   # #0: menu buttons
                anchors.append((page, url))
            if base and base not in found:
                targets.setdefault(base, set()).add(page)

    with concurrent.futures.ThreadPoolExecutor(8) as pool:
        results = dict(zip(targets, pool.map(check_url, targets)))
    for url, (status, error) in sorted(results.items()):
        if 200 <= status < 400:
            continue
        where = ', '.join(sorted(targets[url])[:3]) + (' …' if len(targets[url]) > 3 else '')
        what = '%s → %s (na: %s)' % (url, status or error, where)
        netloc = urllib.parse.urlparse(url).netloc
        if any(netloc == d or netloc.endswith('.' + d) for d in BOT_WALLS) and status in (403, 429, 999):
            continue
        if netloc != host and status in (403, 429):
            warnings.append(('vanjska poveznica', what + ', možda samo blokira automatske provjere'))
        else:
            problems.append(('poveznica', what))

    # #anchors on our own pages
    for page, url in anchors:
        base, _, frag = url.partition('#')
        target = found.get(base) or found.get(base + 'index.html') or found.get(base.rsplit('index.html', 1)[0])
        if target and frag not in target[0]:
            problems.append(('sidro', '%s: nema #%s (na: %s)' % (base, frag, page)))

    # 3. contact form: FormSubmit answers (a real test message would land in the inbox)
    contact = sources.get(site + 'js/contact.js', '')
    m = re.search(r'https://formsubmit\.co/ajax/[0-9a-f]+', contact)
    if not m:
        problems.append(('kontakt obrazac', 'u js/contact.js nema adrese FormSubmit servisa'))
    else:
        status, error, _ = fetch('https://formsubmit.co/')
        if status == 0 or status >= 500:
            problems.append(('kontakt obrazac', 'FormSubmit ne odgovara (%s)' % (status or error)))

    # 4. booking: the Cal.com event of every language exists
    booking = sources.get(site + 'js/booking.js', '')
    events = re.findall(r"'(rdd-software/[a-z0-9-]+)'", booking)
    if not events:
        problems.append(('rezervacija termina', 'u js/booking.js nema Cal.com događaja'))
    for event in events:
        status, error, _ = fetch('https://cal.com/' + event)
        if status != 200:
            problems.append(('rezervacija termina', 'https://cal.com/%s → %s' % (event, status or error)))
    status, error = check_url('https://app.cal.com/embed/embed.js')
    if status != 200:
        problems.append(('rezervacija termina', 'Cal.com embed.js → %s' % (status or error)))

    # report
    lines = ['Provjereno: %d stranica, %d poveznica i datoteka, kontakt obrazac i %d kalendara za rezervaciju.'
             % (len(found), len(targets), len(events)), '']
    if problems:
        lines += ['### Ne radi', ''] + ['- **%s**: %s' % p for p in problems] + ['']
    if warnings:
        lines += ['### Provjeriti ručno', ''] + ['- **%s**: %s' % w for w in warnings] + ['']
    if not problems and not warnings:
        lines += ['Sve radi.']
    report = '\n'.join(lines)
    print(report)
    if args.report:
        open(args.report, 'w', encoding='utf-8').write(report + '\n')
    return 1 if problems else 0


if __name__ == '__main__':
    sys.exit(main())
