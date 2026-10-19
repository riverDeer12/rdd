# RDD Software blog: how articles are written

One article a week, on a day picked by `tools/blog_day.py`. Each article is
prepared on its own branch and opened as a pull request; it goes live only
when Milan merges it. This file is the brief for whoever writes the next one,
person or Claude.

## Steps

1. Take the first topic under **Topics** that is not ticked. Before writing,
   read the titles and lead paragraphs of every published article (the
   blog-*.html files in src/) and make sure the new one answers a different
   question. If it would repeat one of them, skip it and take the next topic.
   See **No repeats, always tied to a service** below.
2. Pick a short English slug starting with `blog-`, e.g. `blog-website-maintenance`.
3. Write two draft files in a scratch directory outside the repository:
   `<slug>.meta.json` and `<slug>.main.html` (formats below).
4. Create the page and list it on the blog:
   `python3 tools/new_page.py <slug> --parts <dir> --blog`
5. Link to the new article from one or two related published articles or
   service pages (their "Pročitajte i / Read next / Leggi anche / Weiterlesen"
   list, all four languages), if it fits naturally.
6. Tick the topic below and add the slug next to it.
7. `python3 tools/build.py` and `python3 tools/check_links.py` (must report 0 problems).
8. Read the Croatian text once more as a client would. Fix anything that
   sounds translated, salesy or invented.
9. Commit on a branch `blog/<slug>`, push it and open a pull request into
   `master` titled `Blog: <Croatian title>`, with the Croatian lead paragraph
   and the list of languages in the description. Never push to `master`.

## Facts you may use

Use only these. Never invent clients, results, statistics, market figures,
competitor prices, testimonials, awards, certifications or technologies.

- RDD Software is R.D.D., obrt za računalno programiranje, owned by Milan
  Trbojević, Rijeka, Croatia. A team building websites, online shops, web and
  mobile apps and custom software since 2021, for clients across Europe;
  meetings are online; languages hr, en, it, de.
- Not registered for VAT, so all prices are final.
- Prices ("from" = starting price, final price depends on scope):
  presentation website from 1.000 € (2 to 4 weeks), online shop from 2.000 €
  (4 to 8 weeks), custom web application from 3.500 € (2 to 4 months), mobile
  app iOS/Android from 5.000 € (2 to 4 months), UX/UI design and prototype from
  700 €, process analysis and digitalisation plan from 600 €, logo from 300 €,
  visual identity package from 800 €, programming 45 € per hour, system
  integration and automation 45 € per hour, IT consulting 50 € per hour,
  website maintenance from 50 € per month, app maintenance from 150 € per
  month, technical support call-out 40 € per hour.
  Timelines start once materials and the advance payment arrive.
- Terms: 50 % advance and the rest on delivery unless the offer says
  otherwise; bugs reported within 3 months of handover are fixed free; after
  payment all rights to code and design pass to the client; domain and
  hosting are registered in the client's name; maintenance can be cancelled
  with 30 days' notice. Free 30-minute consultation (index.html#booking),
  enquiry form (index.html#contact), price list (pricing.html), terms (terms.html).
- Projects (describe them only like this):
  Paapica, public collection of healthy home recipes with search by
  ingredients, serving scaling, nutrition per serving and an admin side that
  imports recipes from Excel, photos or video links (paapica-details.html);
  Rimap, regional digital innovation platform connecting academia, businesses
  and public institutions in Primorje-Gorski Kotar County (rimap-details.html);
  YUFE, innovation platform for cross-border collaboration between academia
  and the economy across Europe (yufe-details.html);
  Apex Performance Fit, web and iOS app connecting personal trainers and
  athletes: scheduling, session credits, progress tracking
  (apex-performance-details.html);
  ReViv Plus, online shop for a dietary supplement with card payments and
  Box Now parcel locker delivery (reviv-plus-details.html);
  Petro&Bulk Solutions, website for petroleum and biofuel trading
  (petro-bulk-details.html);
  Snow Festival Sljeme, event website with programme and tickets
  (snow-festival-details.html).
- Service pages: web-development.html, mobile-apps.html, custom-software.html.

## No repeats, always tied to a service

Every article exists to bring a reader closer to one of RDD's services, so:

- Each topic below names the service page it leads to. The article must link
  to that page in the body (where the reader naturally needs it, not only at
  the end) and to pricing.html or the price estimate (pricing.html#estimate)
  when prices come up. Where it fits, mention a real project from the list
  above as an example and link to it.
- One question per article. Do not repeat what a published article already
  explains (prices, choosing between website and app, preparing a brief, and
  each topic you tick from now on); link to that article instead.
- Do not reuse a published title, slug, lead paragraph or the same outline.
  A topic about something RDD does not offer (e.g. general marketing, social
  media management, hardware) is out of scope.
- When the list runs out, add 10 new topics in the same format, each tied
  to a service on the price list, check them against the published list, and
  continue.

## Writing rules

- Croatian first, then English, Italian and German. Each language must read
  as if written in it, not translated word for word.
- Practical and honest, not salesy. Short paragraphs, concrete examples.
  Address the reader as "vi" / "you" / "tu" (Italian is informal on this
  site) / "Sie".
- No dashes as punctuation (no —, no – between words, no &mdash;): use a
  comma, a colon or a new sentence. Number ranges like 2&ndash;4 are fine.
- Prices: hr `od 1.000&nbsp;€`, en `from €1,000`, it `da 1.000&nbsp;€`,
  de `ab 1.000&nbsp;€`. `&nbsp;` before € and %, `&amp;` for &.
- Croatian body about 900 to 1,300 words; other languages similar.
- Link naturally to at least one service page and to pricing.html or another
  article. End with a short invitation to the free consultation.
- Title (meta) up to about 65 characters ending in ` - RDD Software`;
  description up to 160 characters.

## meta.json

```json
{
  "title":       {"hr": "… - RDD Software", "en": "…", "it": "…", "de": "…"},
  "description": {"hr": "…", "en": "…", "it": "…", "de": "…"},
  "headline":    {"hr": "<h1 text>", "en": "…", "it": "…", "de": "…"},
  "excerpt":     {"hr": "<one or two sentences for the blog list>", "en": "…", "it": "…", "de": "…"},
  "date": "YYYY-MM-DD",
  "nav": "blog",
  "og_type": "article",
  "jsonld": {
    "hr": {"@context": "https://schema.org", "@type": "BlogPosting",
           "headline": "…", "description": "…", "inLanguage": "hr",
           "datePublished": "YYYY-MM-DD", "dateModified": "YYYY-MM-DD",
           "author": {"@type": "Person", "name": "Milan Trbojević"},
           "publisher": {"@type": "Organization", "name": "RDD Software",
                         "logo": {"@type": "ImageObject", "url": "https://rdd.software/android-chrome-512x512.png"}},
           "image": "https://rdd.software/images/about-photo.jpg",
           "mainEntityOfPage": "https://rdd.software/<slug>.html"},
    "en": {"…": "same, inLanguage en, https://rdd.software/en/<slug>.html"},
    "it": {"…": "same, inLanguage it, https://rdd.software/it/<slug>.html"},
    "de": {"…": "same, inLanguage de, https://rdd.software/de/<slug>.html"}
  }
}
```

## main.html

Copy the structure of an existing article exactly, for example the
`<main>` content of `src/blog-website-cost.html` without its
`<section class="project-cta">` (new_page.py adds the call to action):

- intro section: pretitle `Blog`, one `<h1 class="article-title" data-lang="xx">`
  per language, one `<p class="article-meta" data-lang="xx">` per language with
  `<time datetime="YYYY-MM-DD">` (hr `19. listopada 2026.`, en `19 October 2026`,
  it `19 ottobre 2026`, de `19. Oktober 2026`), `Milan Trbojević` and the
  reading time (`N min čitanja`, `N min read`, `N min di lettura`, `N Min. Lesezeit`);
- article section: one `<article class="article page-body" data-lang="xx">` per
  language with `<p class="page-lead">`, `<h2>`, `<p>`, lists, optionally one
  `table.price-table` and one `div.article-tip`, then `<p class="article-author">`
  and the "read next" list (`<h2>Pročitajte i</h2><ul class="page-related">…`);
- the file ends with the closing lines
  `                </div>\n            </div>\n\n        </section> <!-- end s-page -->`.

## Topics

Published:
- [x] Koliko košta izrada web stranice u 2026.? (blog-website-cost)
- [x] Web stranica, web trgovina ili web aplikacija: što vam zapravo treba? (blog-website-or-web-app)
- [x] Kako pripremiti upit za izradu softvera i dobiti točnu ponudu (blog-project-brief)

Next, in this order (→ service page the article leads to):
- [ ] Održavanje web stranice: što uključuje i kada se isplati → web-development.html (održavanje od 50 €/mj.)
- [ ] Domena i hosting: kako ih odabrati i zašto moraju biti na vaše ime → web-development.html
- [ ] GDPR i kolačići: što web stranica male tvrtke mora imati → web-development.html
- [ ] Web trgovina za mali biznis: plaćanje, dostava i pravila prije prve prodaje → web-development.html (web trgovina), primjer ReViv Plus
- [ ] Zašto krenuti s manjom prvom verzijom aplikacije (MVP) → custom-software.html
- [ ] Mobilna aplikacija ili web stranica prilagođena mobitelima? → mobile-apps.html, primjer Apex Performance Fit
- [ ] Kako pripremiti tekstove i fotografije za novu web stranicu → web-development.html
- [ ] Lokalni SEO: kako da vas pronađu kupci iz vašeg grada → web-development.html
- [ ] Brzina web stranice: zašto je važna i kako je provjeriti → web-development.html (održavanje)
- [ ] Višejezična web stranica: kada se isplati i kako je napraviti dobro → web-development.html
- [ ] Digitalizacija malog poduzeća: od Excel tablica do vlastite aplikacije → custom-software.html (analiza procesa od 600 €)
- [ ] Softver po mjeri ili gotovo rješenje: kako odlučiti → custom-software.html
- [ ] UX/UI dizajn i klikabilni prototip: zašto štede novac → mobile-apps.html i custom-software.html (UX/UI od 700 €)
- [ ] Logo i vizualni identitet: što dobivate i zašto prije web stranice → pricing.html#branding (logo od 300 €, identitet od 800 €)
- [ ] Od upita do objave: kako izgleda suradnja s malim timom → index.html#booking (besplatne konzultacije)
- [ ] Tko je vlasnik koda i dizajna: na što pripaziti u ugovoru → terms.html i custom-software.html
- [ ] Online rezervacije i kalendar na web stranici → web-development.html, primjer Apex Performance Fit
- [ ] Automatizacija ponavljajućih poslova u malom poduzeću → custom-software.html (integracija i automatizacija 45 €/sat)
- [ ] Kako mjeriti uspjeh web stranice: Analytics i Search Console → web-development.html
- [ ] Sigurnost web stranice: osnovne mjere koje svaka stranica treba → web-development.html (održavanje)
- [ ] Održavanje aplikacije nakon objave: ažuriranja, nove verzije iOS-a i Androida → mobile-apps.html (od 150 €/mj.)
- [ ] Povezivanje sustava: kad web trgovina, knjigovodstvo i CRM razgovaraju → custom-software.html
