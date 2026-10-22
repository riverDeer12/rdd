#!/usr/bin/env python3
"""
RDD Software - a free photo for the middle of a blog article.

Photos come from Wikimedia Commons, which has many Unsplash photos under
CC0 (no conditions) and other freely licensed photos. Only licences that
allow commercial use are accepted: CC0, public domain, CC BY and CC BY-SA.

    python3 tools/blog_photo.py search "<english words>"
        landscape JPEG photos at least 1600 px wide, with their licence and
        author; adding "Unsplash" to the words finds the CC0 Unsplash photos

    python3 tools/blog_photo.py get "File:<title>.jpg" <slug>
        saves images/blog/<slug>.jpg (1200 px wide) and prints the author,
        licence and page to put in the caption, see docs/blog-guide.md

Commons limits how fast it may be called, so the script waits and retries
when it is told to slow down; a search can take a minute.
"""

import io
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request

from PIL import Image

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
API = 'https://commons.wikimedia.org/w/api.php'
UA = 'RDDSoftwareBlog/1.0 (https://rdd.software; info@rdd.software)'
FREE = re.compile(r'^(CC0|Public domain|PD|CC BY(-SA)? [0-9.]+)', re.I)
WIDTH = 1200


def fetch(url, tries=8):
    for attempt in range(tries):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': UA})
            body = urllib.request.urlopen(req, timeout=60).read()
            if not url.startswith(API) or body.startswith(b'{'):
                return body
        except Exception as e:
            print('waiting, Commons said: %s' % e, file=sys.stderr)
        time.sleep(15 * (attempt + 1))
    sys.exit('Commons did not answer, try again later')


def info(params):
    params.update({'action': 'query', 'format': 'json', 'prop': 'imageinfo',
                   'iiprop': 'url|extmetadata|size|mime', 'iiurlwidth': 1280})
    data = json.loads(fetch(API + '?' + urllib.parse.urlencode(params)))
    for page in data.get('query', {}).get('pages', {}).values():
        if 'imageinfo' not in page:
            continue
        ii = page['imageinfo'][0]
        meta = ii.get('extmetadata', {})
        text = lambda key: re.sub(r'<[^>]+>', '', meta.get(key, {}).get('value', '')).strip()
        yield {'title': page['title'], 'licence': text('LicenseShortName'), 'author': text('Artist'),
               'page': ii['descriptionurl'], 'width': ii['width'], 'height': ii['height'],
               'mime': ii['mime'], 'thumb': ii.get('thumburl', '')}


def usable(p):
    return p['mime'] == 'image/jpeg' and p['width'] >= 1600 and p['width'] > p['height'] and FREE.match(p['licence'])


def search(words):
    found = [p for p in info({'generator': 'search', 'gsrnamespace': 6, 'gsrlimit': 20,
                              'gsrsearch': words + ' filetype:bitmap'}) if usable(p)]
    for p in found:
        print('%-14s %-28s %s' % (p['licence'], p['author'][:28], p['title']))
    if not found:
        print('nothing usable, try other words')


def get(title, slug):
    photos = list(info({'titles': title}))
    if not photos or not usable(photos[0]):
        sys.exit('%s: not found or not a free landscape JPEG' % title)
    p = photos[0]
    # thumbnails are served from upload.wikimedia.org in fixed sizes (1280 px here)
    url = re.sub(r'/\d+px-', '/1280px-', p['thumb'].split('?')[0]).replace('thumb.wikimedia.org', 'upload.wikimedia.org')
    img = Image.open(io.BytesIO(fetch(url))).convert('RGB')
    if img.width > WIDTH:
        img = img.resize((WIDTH, round(img.height * WIDTH / img.width)), Image.LANCZOS)
    os.makedirs(os.path.join(ROOT, 'images', 'blog'), exist_ok=True)
    path = os.path.join('images', 'blog', slug + '.jpg')
    img.save(os.path.join(ROOT, path), quality=80, optimize=True, progressive=True)
    author = re.sub(r'\s+', ' ', p['author']).strip() or 'unknown author'
    print('saved %s (%dx%d)' % (path, img.width, img.height))
    print('author:  %s' % author)
    print('licence: %s' % p['licence'])
    print('page:    %s' % p['page'])


def main():
    if len(sys.argv) == 3 and sys.argv[1] == 'search':
        search(sys.argv[2])
    elif len(sys.argv) == 4 and sys.argv[1] == 'get':
        get(sys.argv[2], sys.argv[3])
    else:
        sys.exit(__doc__)


if __name__ == '__main__':
    main()
