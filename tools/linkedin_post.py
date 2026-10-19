#!/usr/bin/env python3
"""
RDD Software - share a newly published blog article on the company's
LinkedIn page. Run by .github/workflows/linkedin.yml when an article is
merged into master.

    python3 tools/linkedin_post.py <slug> [<slug> ...]

With the repository secrets LINKEDIN_ACCESS_TOKEN (a token with the
w_organization_social scope) and LINKEDIN_ORG_ID (the number in the
page's admin URL, linkedin.com/company/<id>/admin) it posts the Croatian
title, description and link with the article's image (images/og/<slug>-hr.jpg)
through LinkedIn's Posts API.

Without them, or if LinkedIn refuses the post (an expired token, for
instance), it opens a GitHub issue with the ready-made text and image and
mentions the repository owner, so the post can be published by hand in a
minute; GitHub e-mails the mention.
"""

import datetime
import html
import json
import os
import re
import sys
import urllib.error
import urllib.request

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
SITE = 'https://rdd.software/'
API = 'https://api.linkedin.com/rest'


def article(slug):
    page = open(os.path.join(ROOT, 'src', slug + '.html'), encoding='utf-8').read()
    title = re.search(r'<h1 class="article-title" data-lang="hr">(.*?)</h1>', page, re.S)
    description = re.search(r'data-description-hr="([^"]*)"', page)
    if not title or not description:
        sys.exit('%s: no Croatian title or description' % slug)
    clean = lambda s: html.unescape(re.sub(r'<[^>]+>', '', s)).strip()
    # the short summary from the blog list reads better than the meta description
    blog = open(os.path.join(ROOT, 'src', 'blog.html'), encoding='utf-8').read()
    hr = blog[blog.index('<div class="page-body" data-lang="hr">'):]
    excerpt = re.search(r'href="%s\.html">.*?<p class="blog-list__excerpt">(.*?)</p>' % re.escape(slug), hr, re.S)
    return {
        'title': clean(title.group(1)),
        'description': clean(excerpt.group(1) if excerpt else description.group(1)),
        'url': SITE + slug + '.html',
        'image': os.path.join(ROOT, 'images', 'og', slug + '-hr.jpg'),
        'image_url': 'https://github.com/%s/blob/master/images/og/%s-hr.jpg?raw=true'
                     % (os.environ.get('GITHUB_REPOSITORY', 'riverDeer12/rdd'), slug),
    }


def post_text(a):
    return '%s\n\n%s\n\nPročitajte cijeli članak: %s' % (a['title'], a['description'], a['url'])


def little_text(text):
    """LinkedIn's post format treats these characters as markup."""
    return re.sub(r'([\\|{}@\[\]()<>#*_~])', r'\\\1', text)


def api_version():
    # LinkedIn's versioned API is named YYYYMM and each version lives about a year;
    # the version from two months back is always released and still supported
    day = datetime.date.today().replace(day=1) - datetime.timedelta(days=45)
    return os.environ.get('LINKEDIN_VERSION') or day.strftime('%Y%m')


def call(method, url, token, data=None, raw=None, extra=None):
    headers = {'Authorization': 'Bearer ' + token}
    if raw is None:
        headers.update({'LinkedIn-Version': api_version(), 'X-Restli-Protocol-Version': '2.0.0',
                        'Content-Type': 'application/json'})
        body = json.dumps(data).encode() if data is not None else None
    else:
        headers['Content-Type'] = 'application/octet-stream'
        body = raw
    headers.update(extra or {})
    request = urllib.request.Request(url, data=body, method=method, headers=headers)
    with urllib.request.urlopen(request, timeout=60) as response:
        text = response.read().decode() or '{}'
        return response.headers, json.loads(text) if text.strip().startswith('{') else {}


def post_to_linkedin(a, token, org):
    owner = 'urn:li:organization:%s' % org
    _, init = call('POST', API + '/images?action=initializeUpload', token,
                   {'initializeUploadRequest': {'owner': owner}})
    upload_url, image_urn = init['value']['uploadUrl'], init['value']['image']
    call('PUT', upload_url, token, raw=open(a['image'], 'rb').read())
    headers, _ = call('POST', API + '/posts', token, {
        'author': owner,
        'commentary': little_text(post_text(a)),
        'visibility': 'PUBLIC',
        'distribution': {'feedDistribution': 'MAIN_FEED', 'targetEntities': [],
                         'thirdPartyDistributionChannels': []},
        'content': {'article': {'source': a['url'], 'title': a['title'],
                                'description': a['description'], 'thumbnail': image_urn}},
        'lifecycleState': 'PUBLISHED',
        'isReshareDisabledByAuthor': False,
    })
    return headers.get('x-restli-id', '')


def open_issue(a, reason):
    repo, token = os.environ['GITHUB_REPOSITORY'], os.environ['GITHUB_TOKEN']
    owner = os.environ.get('GITHUB_REPOSITORY_OWNER', repo.split('/')[0])
    body = (
        '@%s članak **%s** je objavljen na stranici. %s\n\n'
        '**Objava za LinkedIn** (kopirajte tekst, dodajte sliku i objavite na stranici tvrtke):\n\n'
        '```\n%s\n```\n\n'
        '**Slika:** [preuzmite je ovdje](%s)\n\n![%s](%s)\n\n'
        'Kad objavite, zatvorite ovaj zadatak.'
    ) % (owner, a['title'], reason, post_text(a), a['image_url'], a['title'], a['image_url'])
    request = urllib.request.Request(
        'https://api.github.com/repos/%s/issues' % repo, method='POST',
        data=json.dumps({'title': 'LinkedIn: ' + a['title'], 'body': body}).encode(),
        headers={'Authorization': 'Bearer ' + token, 'Accept': 'application/vnd.github+json'})
    with urllib.request.urlopen(request, timeout=60) as response:
        print('opened issue', json.loads(response.read())['html_url'])


def main(slugs):
    token = os.environ.get('LINKEDIN_ACCESS_TOKEN', '').strip()
    org = os.environ.get('LINKEDIN_ORG_ID', '').strip()
    for slug in slugs:
        a = article(slug)
        if not (token and org):
            open_issue(a, 'Automatska objava na LinkedIn još nije uključena (nema pristupnih podataka), pa je ovdje sve spremno za ručnu objavu.')
            continue
        try:
            post = post_to_linkedin(a, token, org)
            print('posted to LinkedIn:', a['title'], post)
        except urllib.error.HTTPError as error:
            detail = error.read().decode(errors='replace')[:300]
            print('LinkedIn refused the post: %s %s' % (error.code, detail))
            reason = ('LinkedIn je odbio automatsku objavu (greška %d%s), pa je ovdje sve spremno za ručnu objavu.'
                      % (error.code, ', pristup je vjerojatno istekao: obnovite LINKEDIN_ACCESS_TOKEN' if error.code == 401 else ''))
            open_issue(a, reason)


if __name__ == '__main__':
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    main(sys.argv[1:])
