#!/usr/bin/env python3
"""Check that every relative link, image, script and stylesheet on the
generated pages points to a file that exists (and every #anchor to an id)."""
import os, re, sys
from urllib.parse import urldefrag, unquote

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
pages = [f for f in os.listdir(ROOT) if f.endswith('.html')]
for lang in ('en', 'it', 'de'):
    pages += [lang + '/' + f for f in os.listdir(os.path.join(ROOT, lang)) if f.endswith('.html')]

ids = {}
def ids_of(path):
    if path not in ids:
        ids[path] = set(re.findall(r'\sid="([^"]+)"', open(path, encoding='utf-8').read()))
    return ids[path]

problems = 0
for page in sorted(pages):
    path = os.path.join(ROOT, page)
    text = open(path, encoding='utf-8').read()
    urls = re.findall(r'\s(?:href|src)="([^"]*)"', text)
    urls += [u.split()[0] for s in re.findall(r'\ssrcset="([^"]*)"', text) for u in s.split(',') if u.strip()]
    for url in urls:
        if re.match(r'^([a-z][a-z0-9+.-]*:|//)', url, re.I) or url in ('', '#0', '#'):
            continue
        target, anchor = urldefrag(url)
        if target.startswith('/'):
            file = os.path.join(ROOT, unquote(target.lstrip('/')))
        else:
            file = os.path.normpath(os.path.join(os.path.dirname(path), unquote(target))) if target else path
        if os.path.isdir(file):
            file = os.path.join(file, 'index.html')
        if not os.path.exists(file):
            print('%s: missing %s' % (page, url)); problems += 1
        elif anchor and file.endswith('.html') and anchor not in ids_of(file):
            print('%s: no #%s in %s' % (page, anchor, os.path.relpath(file, ROOT))); problems += 1
print('%d pages checked, %d problems' % (len(pages), problems))
sys.exit(1 if problems else 0)
