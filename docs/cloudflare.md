# Cloudflare: sigurnosna zaglavlja i predmemorija za rdd.software

Sve se radi na dash.cloudflare.com → domena **rdd.software**. Ništa od ovoga
ne mijenja izgled stranice. Nazivi izbornika u Cloudflareu povremeno se
mijenjaju; ako nešto ne pronađete točno ovako, potražite naziv postavke u
tražilici na vrhu nadzorne ploče.

## 1. HTTPS (2 minute)

**SSL/TLS → Edge Certificates**

- **Always Use HTTPS**: uključeno
- **Automatic HTTPS Rewrites**: uključeno
- **Minimum TLS Version**: TLS 1.2
- **HTTP Strict Transport Security (HSTS)** → Enable HSTS:
  - Max Age: **6 months** (kasnije možete na 12)
  - Include subdomains: **uključeno** samo ako svi poddomeni (npr. mail
    poslužitelji s webom) rade preko HTTPS-a; ako niste sigurni, ostavite isključeno
  - Preload: isključeno
  - No-Sniff header: uključeno

HSTS pregledniku kaže da stranicu uvijek otvara preko HTTPS-a. Uključite ga
tek kad ste sigurni da HTTPS radi (radi), jer se ne može odmah poništiti.

## 2. Sigurnosna zaglavlja (5 minuta)

**Rules → Transform Rules → Modify Response Header → Create rule**

- Ime: `Sigurnosna zaglavlja`
- When incoming requests match: **All incoming requests**
- Then: **Set static** za svako od ovih zaglavlja (Add → Set static):

| Header name | Value |
| --- | --- |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `X-Frame-Options` | `SAMEORIGIN` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=(), usb=()` |
| `Content-Security-Policy` | `frame-ancestors 'self'; upgrade-insecure-requests` |

Deploy. Što koje radi:

- **X-Content-Type-Options**: preglednik ne pogađa vrstu datoteke (zaštita od podmetnutih skripti).
- **Referrer-Policy**: drugim stranicama šalje samo domenu, ne cijelu adresu s koje posjetitelj dolazi.
- **X-Frame-Options** i **frame-ancestors**: nitko ne može vašu stranicu ugraditi u svoju (zaštita od „clickjackinga”).
- **Permissions-Policy**: stranica ne može tražiti kameru, mikrofon, lokaciju i slično, jer ih ne treba.
- **upgrade-insecure-requests**: ako negdje ostane `http://` poveznica na sliku ili skriptu, učita se preko HTTPS-a.

Puni Content-Security-Policy (popis dopuštenih skripti) namjerno nije uključen:
stranica koristi Google Analytics, Cal.com i FormSubmit, pa bi preuski popis
mogao pokvariti kontakt obrazac ili rezervacije. Može se dodati kasnije, uz testiranje.

## 3. Predmemorija (5 minuta)

GitHub Pages pregledniku kaže da datoteke čuva samo 10 minuta, pa se slike
i fontovi pri svakom povratku ponovno preuzimaju.

**Caching → Cache Rules → Create rule**

Pravilo 1, ime `Slike i fontovi`:
- When: **Custom filter expression** → *URI Path* → *ends with* → dodajte redom
  (spojeno s **Or**): `.webp`, `.jpg`, `.png`, `.svg`, `.ico`, `.woff2`
- Then: **Eligible for cache**
  - Edge TTL: **Override origin** → 1 month
  - Browser TTL: **Override origin** → 1 month

Pravilo 2, ime `CSS i JS`:
- When: *URI Path* → *ends with* → `.css` **Or** `.js`
- Then: **Eligible for cache**
  - Edge TTL: **Override origin** → 1 day
  - Browser TTL: **Override origin** → 1 day

HTML stranice ne dirajte: Cloudflare ih po zadanom ne sprema, pa je nova
verzija vidljiva odmah nakon objave.

Ako nakon promjene slike na stranici i dalje vidite staru: **Caching →
Configuration → Purge Cache → Custom Purge** i upišite adresu slike (ili
Purge Everything). Kod promjena koje radim ja, adresa datoteke dobiva novu
verziju (`?v=2`), pa to obično nije potrebno.

## 4. Brzina (1 minuta)

**Speed → Optimization**

- **Brotli**: uključeno
- **Early Hints**: uključeno
- **HTTP/3** (Network → HTTP/3 (with QUIC)): uključeno
- **Rocket Loader**: **isključeno** (mijenja redoslijed skripti i zna pokvariti
  izbor jezika, temu i obavijest o kolačićima)

## 5. Provjera

1. Otvorite https://securityheaders.com/?q=rdd.software i kliknite Scan.
   Prije promjena ocjena je D ili F, nakon njih trebala bi biti **A**.
2. Otvorite https://rdd.software, pošaljite testni upit kroz kontakt obrazac i
   otvorite kalendar za rezervaciju, da potvrdite da sve radi.
3. Tjedna automatska provjera (GitHub → Actions → Site check) javit će ako
   nešto prestane raditi.
