/* ===================================================================
 * RDD Software - guide with ready-made answers
 *
 * A small "How can we help?" helper in the corner of the main pages.
 * Visitors cannot type: they pick one of the prepared answers, get a
 * short reply with links to the right page, and can always go back or
 * say they did not find what they were looking for. That last option
 * opens the contact form on the home page with their choices already
 * in the message (sessionStorage 'rdd-estimate', read by js/contact.js,
 * the same hand-over the price estimate uses).
 *
 * Nothing is sent anywhere except, with analytics consent, the clicks
 * as Google Analytics events (window.rddTrack in js/consent.js):
 * guide_open, guide_choice (choice) and guide_contact (path).
 *
 * The answers live in FLOW and TEXT below; the prices come from the
 * price list (pricing.html) and must change together with it.
 * Styles: css/guide.css.
 * ------------------------------------------------------------------- */

(function (html) {

    'use strict';

    if (!document.body || document.querySelector('.guide')) return;

    /* ---------------------------------------------------------------
     * the conversation: every node has a reply, optional links and
     * optional follow-up choices. "contact" is the project type the
     * contact form gets preselected with.
     * ------------------------------------------------------------- */
    const FLOW = {
        start:    { choices: ['website', 'shop', 'app', 'existing', 'price', 'talk', 'other'] },
        website:  { contact: 'Web stranica', links: ['web-development.html', 'pricing.html#estimate', 'price-calculator.html'], choices: ['talk'] },
        shop:     { contact: 'Web trgovina', links: ['web-development.html', 'reviv-plus-details.html', 'blog-online-shop-launch.html'], choices: ['talk'] },
        app:      { choices: ['mobile', 'webapp', 'unsure'] },
        mobile:   { contact: 'Mobilna aplikacija', links: ['mobile-apps.html', 'apex-performance-details.html', 'topple-details.html'], choices: ['talk'] },
        webapp:   { contact: 'Softver po mjeri', links: ['custom-software.html', 'blog-mvp-first-version.html', 'blog-project-brief.html'], choices: ['talk'] },
        unsure:   { contact: 'Još ne znam', links: ['blog-website-or-web-app.html', 'index.html#booking'] },
        existing: { choices: ['maint', 'upgrade', 'takeover'] },
        maint:    { contact: 'Održavanje i podrška', links: ['maintenance.html', 'blog-website-maintenance.html'] },
        upgrade:  { contact: 'Održavanje i podrška', links: ['price-calculator.html', 'services.html'] },
        takeover: { contact: 'Održavanje i podrška', links: ['maintenance.html', 'index.html#booking'] },
        price:    { links: ['pricing.html', 'pricing.html#estimate', 'blog-website-cost.html'], choices: ['talk'] },
        talk:     { links: ['index.html#booking'] },
        other:    { contact: 'Nešto drugo', direct: true }
    };

    const TEXT = {
        hr: {
            open: 'Kako vam možemo pomoći?', launcher: 'Pomoć', close: 'Zatvori', title: 'Kako vam možemo pomoći?',
            subtitle: 'Odaberite odgovor, a mi vas vodimo dalje.',
            back: '← Na početak', notFound: 'Nisam pronašao/la što tražim',
            contactReply: 'Pošaljite nam upit ili pitanje. Vaš odabir već je upisan u poruku, samo dodajte detalje.',
            contactLink: 'Otvori kontakt obrazac', contactSummary: 'Odabrano u vodiču na stranici',
            choice: {
                website: 'Treba mi web stranica', shop: 'Treba mi web trgovina', app: 'Treba mi aplikacija ili softver',
                existing: 'Već imam web stranicu', price: 'Koliko košta?', talk: 'Želim razgovarati s vama', other: 'Nešto drugo',
                mobile: 'Mobilna aplikacija (iOS, Android)', webapp: 'Web aplikacija ili softver po mjeri', unsure: 'Još ne znam što mi treba',
                maint: 'Održavanje', upgrade: 'Dorada ili nova funkcija', takeover: 'Stranicu je izradio netko drugi'
            },
            reply: {
                start: 'Bok! 👋 Odaberite što vas zanima.',
                website: 'Izrađujemo brze web stranice prilagođene mobitelima, s kontakt obrascem, osnovnom optimizacijom za Google i analitikom. Cijena je od 1.000 €, a izrada traje 2–4 tjedna. Domena i hosting registriraju se na vaše ime.',
                shop: 'Web trgovina s kartičnim plaćanjem, dostavom (npr. paketomati) i jednostavnim upravljanjem proizvodima i narudžbama. Cijena je od 2.000 €, a izrada traje 4–8 tjedana.',
                app: 'Kakva vam aplikacija treba?',
                mobile: 'Izrađujemo aplikacije za iOS i Android, od prototipa do objave u App Storeu i na Google Playu. Cijena je od 5.000 €, a izrada traje 2–4 mjeseca.',
                webapp: 'Softver po mjeri od 3.500 €: interne aplikacije, portali i povezivanje sustava koje već koristite. Često se isplati krenuti s manjom prvom verzijom.',
                unsure: 'Nema problema. Članak ispod pomaže odlučiti, a na besplatnim konzultacijama predložit ćemo najjednostavnije rješenje.',
                existing: 'Što vam treba za postojeću stranicu?',
                maint: 'Održavanje web stranice od 50 € mjesečno: hosting, sigurnosne kopije, ažuriranja i do 3 manja zahvata mjesečno. Održavanje aplikacija je od 150 € mjesečno.',
                upgrade: 'Postojećoj stranici možemo dodati nove dijelove, npr. kalkulator cijene, rezervacije ili web trgovinu. Cijenu navodimo u ponudi nakon što pregledamo stranicu.',
                takeover: 'Možemo preuzeti i stranicu koju nismo izradili mi. Najprije pregledamo kod i hosting, a zatim predložimo održavanje ili doradu.',
                price: 'Cijene su konačne jer nismo u sustavu PDV-a: web stranica od 1.000 €, web trgovina od 2.000 €, softver po mjeri od 3.500 € i mobilna aplikacija od 5.000 €.',
                talk: 'Rado! Rezervirajte besplatne konzultacije od 30 minuta (online) ili nam pošaljite upit.'
            },
            link: {
                'web-development.html': 'Izrada web stranica', 'pricing.html#estimate': 'Okvirni izračun cijene', 'price-calculator.html': 'Demo: kalkulator cijene',
                'reviv-plus-details.html': 'Primjer: ReViv Plus', 'blog-online-shop-launch.html': 'Članak: prije prve prodaje',
                'mobile-apps.html': 'Mobilne aplikacije', 'apex-performance-details.html': 'Primjer: Apex Performance Fit', 'topple-details.html': 'Primjer: Topple',
                'custom-software.html': 'Softver po mjeri', 'blog-mvp-first-version.html': 'Članak: manja prva verzija', 'blog-project-brief.html': 'Članak: kako pripremiti upit',
                'blog-website-or-web-app.html': 'Članak: što vam zapravo treba', 'index.html#booking': 'Rezervirajte konzultacije',
                'maintenance.html': 'Paketi održavanja', 'blog-website-maintenance.html': 'Članak: kada se održavanje isplati',
                'services.html': 'Sve usluge', 'pricing.html': 'Cjenik', 'blog-website-cost.html': 'Članak: koliko košta web stranica'
            }
        },
        en: {
            open: 'How can we help?', launcher: 'Help', close: 'Close', title: 'How can we help?',
            subtitle: 'Pick an answer and we will point you the right way.',
            back: '← Start again', notFound: "I didn't find what I'm looking for",
            contactReply: 'Send us an enquiry or a question. Your choices are already in the message, just add the details.',
            contactLink: 'Open the contact form', contactSummary: 'Chosen in the guide on the website',
            choice: {
                website: 'I need a website', shop: 'I need an online shop', app: 'I need an app or software',
                existing: 'I already have a website', price: 'How much does it cost?', talk: 'I want to talk to you', other: 'Something else',
                mobile: 'Mobile app (iOS, Android)', webapp: 'Web app or custom software', unsure: "I'm not sure yet",
                maint: 'Maintenance', upgrade: 'Changes or a new feature', takeover: 'Someone else built it'
            },
            reply: {
                start: 'Hi! 👋 Choose what you are interested in.',
                website: 'We build fast, mobile-friendly websites with a contact form, basic search engine optimisation and analytics. Prices start from €1,000 and a website takes 2–4 weeks. The domain and hosting are registered in your name.',
                shop: 'An online shop with card payments, delivery (e.g. parcel lockers) and simple management of products and orders. Prices start from €2,000 and it takes 4–8 weeks.',
                app: 'What kind of app do you need?',
                mobile: 'We build apps for iOS and Android, from the prototype to publishing on the App Store and Google Play. Prices start from €5,000 and it takes 2–4 months.',
                webapp: 'Custom software from €3,500: internal apps, portals and connecting the systems you already use. Starting with a smaller first version often pays off.',
                unsure: 'No problem. The article below helps you decide, and in a free consultation we will suggest the simplest solution.',
                existing: 'What do you need for your existing website?',
                maint: 'Website maintenance from €50 a month: hosting, backups, updates and up to 3 small changes a month. App maintenance starts from €150 a month.',
                upgrade: 'We can add new parts to your existing website, such as a price calculator, bookings or an online shop. The price is in an offer once we have reviewed the site.',
                takeover: "We can also take over a website we didn't build. First we review the code and hosting, then we suggest maintenance or improvements.",
                price: 'Prices are final because we are not registered for VAT: a website from €1,000, an online shop from €2,000, custom software from €3,500 and a mobile app from €5,000.',
                talk: 'Gladly! Book a free 30-minute consultation (online) or send us an enquiry.'
            },
            link: {
                'web-development.html': 'Website development', 'pricing.html#estimate': 'Quick price estimate', 'price-calculator.html': 'Demo: price calculator',
                'reviv-plus-details.html': 'Example: ReViv Plus', 'blog-online-shop-launch.html': 'Article: before the first sale',
                'mobile-apps.html': 'Mobile apps', 'apex-performance-details.html': 'Example: Apex Performance Fit', 'topple-details.html': 'Example: Topple',
                'custom-software.html': 'Custom software', 'blog-mvp-first-version.html': 'Article: a smaller first version', 'blog-project-brief.html': 'Article: preparing an enquiry',
                'blog-website-or-web-app.html': 'Article: what you actually need', 'index.html#booking': 'Book a consultation',
                'maintenance.html': 'Maintenance packages', 'blog-website-maintenance.html': 'Article: when maintenance pays off',
                'services.html': 'All services', 'pricing.html': 'Price list', 'blog-website-cost.html': 'Article: what a website costs'
            }
        },
        it: {
            open: 'Come possiamo aiutarti?', launcher: 'Aiuto', close: 'Chiudi', title: 'Come possiamo aiutarti?',
            subtitle: 'Scegli una risposta e ti indichiamo la strada.',
            back: '← Ricomincia', notFound: 'Non ho trovato quello che cerco',
            contactReply: 'Mandaci una richiesta o una domanda. Le tue scelte sono già nel messaggio, aggiungi solo i dettagli.',
            contactLink: 'Apri il modulo di contatto', contactSummary: 'Scelto nella guida del sito',
            choice: {
                website: 'Mi serve un sito web', shop: 'Mi serve un negozio online', app: "Mi serve un'app o un software",
                existing: 'Ho già un sito', price: 'Quanto costa?', talk: 'Voglio parlare con voi', other: "Altro",
                mobile: 'App mobile (iOS, Android)', webapp: 'App web o software su misura', unsure: 'Non so ancora cosa mi serve',
                maint: 'Manutenzione', upgrade: 'Modifiche o nuova funzione', takeover: "L'ha realizzato qualcun altro"
            },
            reply: {
                start: 'Ciao! 👋 Scegli cosa ti interessa.',
                website: 'Realizziamo siti veloci e adatti agli smartphone, con modulo di contatto, ottimizzazione di base per Google e statistiche. Il prezzo parte da 1.000 € e la realizzazione richiede 2–4 settimane. Dominio e hosting sono intestati a te.',
                shop: 'Un negozio online con pagamento con carta, spedizioni (ad es. armadietti per pacchi) e gestione semplice di prodotti e ordini. Il prezzo parte da 2.000 € e richiede 4–8 settimane.',
                app: 'Che tipo di app ti serve?',
                mobile: "Realizziamo app per iOS e Android, dal prototipo alla pubblicazione sull'App Store e su Google Play. Il prezzo parte da 5.000 € e richiede 2–4 mesi.",
                webapp: 'Software su misura da 3.500 €: app interne, portali e collegamento dei sistemi che usi già. Spesso conviene partire da una prima versione più piccola.',
                unsure: "Nessun problema. L'articolo qui sotto aiuta a decidere, e in una consulenza gratuita ti proporremo la soluzione più semplice.",
                existing: 'Cosa ti serve per il sito che hai già?',
                maint: 'Manutenzione del sito da 50 € al mese: hosting, backup, aggiornamenti e fino a 3 piccoli interventi al mese. La manutenzione delle app parte da 150 € al mese.',
                upgrade: "Possiamo aggiungere nuove parti al tuo sito, ad esempio un calcolatore dei prezzi, prenotazioni o un negozio online. Il prezzo è nell'offerta dopo aver esaminato il sito.",
                takeover: 'Possiamo prendere in carico anche un sito che non abbiamo realizzato noi. Prima esaminiamo codice e hosting, poi proponiamo manutenzione o miglioramenti.',
                price: "I prezzi sono finali perché non siamo soggetti a IVA: sito web da 1.000 €, negozio online da 2.000 €, software su misura da 3.500 € e app mobile da 5.000 €.",
                talk: 'Volentieri! Prenota una consulenza gratuita di 30 minuti (online) o mandaci una richiesta.'
            },
            link: {
                'web-development.html': 'Realizzazione siti web', 'pricing.html#estimate': 'Stima rapida del prezzo', 'price-calculator.html': 'Demo: calcolatore dei prezzi',
                'reviv-plus-details.html': 'Esempio: ReViv Plus', 'blog-online-shop-launch.html': 'Articolo: prima della prima vendita',
                'mobile-apps.html': 'App mobile', 'apex-performance-details.html': 'Esempio: Apex Performance Fit', 'topple-details.html': 'Esempio: Topple',
                'custom-software.html': 'Software su misura', 'blog-mvp-first-version.html': 'Articolo: una prima versione più piccola', 'blog-project-brief.html': 'Articolo: preparare una richiesta',
                'blog-website-or-web-app.html': 'Articolo: di cosa hai bisogno', 'index.html#booking': 'Prenota una consulenza',
                'maintenance.html': 'Pacchetti di manutenzione', 'blog-website-maintenance.html': 'Articolo: quando conviene la manutenzione',
                'services.html': 'Tutti i servizi', 'pricing.html': 'Listino prezzi', 'blog-website-cost.html': 'Articolo: quanto costa un sito'
            }
        },
        de: {
            open: 'Wie können wir helfen?', launcher: 'Hilfe', close: 'Schließen', title: 'Wie können wir helfen?',
            subtitle: 'Wählen Sie eine Antwort, wir zeigen Ihnen den Weg.',
            back: '← Von vorne', notFound: 'Ich habe nicht gefunden, was ich suche',
            contactReply: 'Schicken Sie uns eine Anfrage oder Frage. Ihre Auswahl steht schon in der Nachricht, ergänzen Sie nur die Details.',
            contactLink: 'Kontaktformular öffnen', contactSummary: 'Im Wegweiser auf der Website gewählt',
            choice: {
                website: 'Ich brauche eine Website', shop: 'Ich brauche einen Onlineshop', app: 'Ich brauche eine App oder Software',
                existing: 'Ich habe schon eine Website', price: 'Was kostet das?', talk: 'Ich möchte mit Ihnen sprechen', other: 'Etwas anderes',
                mobile: 'Mobile App (iOS, Android)', webapp: 'Web-App oder individuelle Software', unsure: 'Ich weiß es noch nicht',
                maint: 'Wartung', upgrade: 'Änderungen oder neue Funktion', takeover: 'Jemand anderes hat sie erstellt'
            },
            reply: {
                start: 'Hallo! 👋 Wählen Sie, was Sie interessiert.',
                website: 'Wir erstellen schnelle, handyfreundliche Websites mit Kontaktformular, grundlegender Suchmaschinenoptimierung und Statistik. Preise ab 1.000 €, die Umsetzung dauert 2–4 Wochen. Domain und Hosting laufen auf Ihren Namen.',
                shop: 'Ein Onlineshop mit Kartenzahlung, Versand (z. B. Paketstationen) und einfacher Verwaltung von Produkten und Bestellungen. Preise ab 2.000 €, Dauer 4–8 Wochen.',
                app: 'Welche Art von App brauchen Sie?',
                mobile: 'Wir entwickeln Apps für iOS und Android, vom Prototyp bis zur Veröffentlichung im App Store und bei Google Play. Preise ab 5.000 €, Dauer 2–4 Monate.',
                webapp: 'Individuelle Software ab 3.500 €: interne Anwendungen, Portale und die Anbindung Ihrer bestehenden Systeme. Oft lohnt es sich, mit einer kleineren ersten Version zu starten.',
                unsure: 'Kein Problem. Der Artikel unten hilft bei der Entscheidung, und in einer kostenlosen Beratung schlagen wir die einfachste Lösung vor.',
                existing: 'Was brauchen Sie für Ihre bestehende Website?',
                maint: 'Website-Wartung ab 50 € im Monat: Hosting, Sicherungskopien, Updates und bis zu 3 kleine Änderungen pro Monat. App-Wartung ab 150 € im Monat.',
                upgrade: 'Wir können Ihre Website erweitern, etwa um einen Preisrechner, Buchungen oder einen Onlineshop. Den Preis nennen wir im Angebot, nachdem wir die Website geprüft haben.',
                takeover: 'Wir übernehmen auch Websites, die nicht von uns stammen. Zuerst prüfen wir Code und Hosting, dann schlagen wir Wartung oder Verbesserungen vor.',
                price: 'Die Preise sind Endpreise, da wir nicht umsatzsteuerpflichtig sind: Website ab 1.000 €, Onlineshop ab 2.000 €, individuelle Software ab 3.500 € und mobile App ab 5.000 €.',
                talk: 'Gern! Buchen Sie eine kostenlose Beratung von 30 Minuten (online) oder schicken Sie uns eine Anfrage.'
            },
            link: {
                'web-development.html': 'Website-Erstellung', 'pricing.html#estimate': 'Schnelle Kostenschätzung', 'price-calculator.html': 'Demo: Preisrechner',
                'reviv-plus-details.html': 'Beispiel: ReViv Plus', 'blog-online-shop-launch.html': 'Artikel: vor dem ersten Verkauf',
                'mobile-apps.html': 'Mobile Apps', 'apex-performance-details.html': 'Beispiel: Apex Performance Fit', 'topple-details.html': 'Beispiel: Topple',
                'custom-software.html': 'Individuelle Software', 'blog-mvp-first-version.html': 'Artikel: eine kleinere erste Version', 'blog-project-brief.html': 'Artikel: Anfrage vorbereiten',
                'blog-website-or-web-app.html': 'Artikel: was Sie wirklich brauchen', 'index.html#booking': 'Beratung buchen',
                'maintenance.html': 'Wartungspakete', 'blog-website-maintenance.html': 'Artikel: wann sich Wartung lohnt',
                'services.html': 'Alle Leistungen', 'pricing.html': 'Preisliste', 'blog-website-cost.html': 'Artikel: was eine Website kostet'
            }
        }
    };

    function t() {
        return TEXT[html.getAttribute('lang')] || TEXT.en;
    }

    function track(name, params) {
        if (window.rddTrack) window.rddTrack(name, params || {});
    }

    /* ---------------------------------------------------------------
     * markup
     * ------------------------------------------------------------- */
    const root = document.createElement('div');
    root.className = 'guide';

    const launcher = document.createElement('button');
    launcher.type = 'button';
    launcher.className = 'guide__launcher';
    launcher.setAttribute('aria-expanded', 'false');
    launcher.setAttribute('aria-controls', 'guide-panel');
    launcher.innerHTML =
        '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
        '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>' +
        '<span class="guide__launcher-text"></span>';

    const panel = document.createElement('section');
    panel.className = 'guide__panel';
    panel.id = 'guide-panel';
    panel.hidden = true;
    panel.setAttribute('role', 'dialog');
    panel.innerHTML =
        '<header class="guide__head">' +
            '<div><p class="guide__title" id="guide-title"></p><p class="guide__subtitle"></p></div>' +
            '<button type="button" class="guide__close"><span aria-hidden="true">&times;</span></button>' +
        '</header>' +
        '<div class="guide__log" aria-live="polite"></div>';
    panel.setAttribute('aria-labelledby', 'guide-title');

    root.appendChild(panel);
    root.appendChild(launcher);
    document.body.appendChild(root);

    const log = panel.querySelector('.guide__log');
    const closeButton = panel.querySelector('.guide__close');

    let path = [];      // choices made so far, e.g. ['app', 'mobile']

    function labels() {
        const tx = t();
        launcher.querySelector('.guide__launcher-text').textContent = tx.launcher;
        launcher.setAttribute('aria-label', tx.open);
        panel.querySelector('.guide__title').textContent = tx.title;
        panel.querySelector('.guide__subtitle').textContent = tx.subtitle;
        closeButton.setAttribute('aria-label', tx.close);
    }

    function bubble(text, who) {
        const p = document.createElement('p');
        p.className = 'guide__msg guide__msg--' + who;
        p.textContent = text;
        log.appendChild(p);
        return p;
    }

    function clearOptions() {
        log.querySelectorAll('.guide__options').forEach(function (el) { el.remove(); });
    }

    function scrollDown() {
        log.scrollTop = log.scrollHeight;
    }

    function optionButton(label, onClick, extraClass) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'guide__option' + (extraClass ? ' ' + extraClass : '');
        b.textContent = label;
        b.addEventListener('click', onClick);
        return b;
    }

    function show(id) {
        const tx = t();
        const node = FLOW[id];
        clearOptions();

        if (node.direct) {
            contact();
            return;
        }
        bubble(tx.reply[id], 'bot');

        const options = document.createElement('div');
        options.className = 'guide__options';

        (node.links || []).forEach(function (href) {
            const a = document.createElement('a');
            a.className = 'guide__link';
            a.href = href;
            a.textContent = tx.link[href] + ' →';
            a.addEventListener('click', function () {
                track('guide_choice', { choice: 'link:' + href });
                // same-page anchors (e.g. booking on the home page): close the guide
                close(false);
            });
            options.appendChild(a);
        });

        (node.choices || []).forEach(function (next) {
            options.appendChild(optionButton(tx.choice[next], function () { choose(next); }));
        });

        if (id !== 'start') {
            options.appendChild(optionButton(tx.notFound, contact, 'guide__option--contact'));
            options.appendChild(optionButton(tx.back, restart, 'guide__option--back'));
        }

        log.appendChild(options);
        scrollDown();
        const first = options.querySelector('a, button');
        if (first && !panel.hidden && id !== 'start') first.focus({ preventScroll: true });
    }

    function choose(id) {
        path.push(id);
        bubble(t().choice[id], 'user');
        track('guide_choice', { choice: id });
        show(id);
    }

    function restart() {
        path = [];
        log.innerHTML = '';
        show('start');
    }

    /* "I didn't find it": hand the choices over to the contact form */
    function contact() {
        const tx = t();
        const steps = path.map(function (id) { return tx.choice[id]; });
        const summary = tx.contactSummary + (steps.length ? ': ' + steps.join(' → ') : '') + '.';
        let type = '';
        for (let i = path.length - 1; i >= 0 && !type; i--) type = FLOW[path[i]].contact || '';

        clearOptions();
        bubble(tx.contactReply, 'bot');
        track('guide_contact', { path: path.join('>') || 'start' });

        const options = document.createElement('div');
        options.className = 'guide__options';
        const a = document.createElement('a');
        a.className = 'guide__link guide__link--primary';
        a.href = 'index.html#contact';
        a.textContent = tx.contactLink + ' →';
        a.addEventListener('click', function (e) {
            const form = document.getElementById('contact-form');
            if (form) {
                // already on the home page: fill the form here
                e.preventDefault();
                fill(form, type, summary);
                log.innerHTML = '';          // next time the guide starts from the beginning
                close(false);
                document.getElementById('contact').scrollIntoView({ behavior: 'smooth' });
                const message = form.elements.namedItem('message');
                if (message) setTimeout(function () { message.focus({ preventScroll: true }); }, 600);
                return;
            }
            try {
                sessionStorage.setItem('rdd-estimate', JSON.stringify({ type: type, budget: '', summary: summary }));
            } catch (err) {
                // storage unavailable - the visitor still lands on the form
            }
        });
        options.appendChild(a);
        options.appendChild(optionButton(tx.back, restart, 'guide__option--back'));
        log.appendChild(options);
        scrollDown();
        a.focus({ preventScroll: true });
    }

    function fill(form, type, summary) {
        const select = form.elements.namedItem('cf-type');
        if (select && type && select.querySelector('option[value="' + type + '"]')) select.value = type;
        const message = form.elements.namedItem('message');
        if (message && !message.value.trim()) message.value = summary + '\n\n';
    }

    /* ---------------------------------------------------------------
     * open / close
     * ------------------------------------------------------------- */
    function open() {
        if (!log.childNodes.length) restart();
        panel.hidden = false;
        root.classList.add('is-open');
        launcher.setAttribute('aria-expanded', 'true');
        track('guide_open');
        const first = log.querySelector('.guide__options a, .guide__options button');
        (first || closeButton).focus({ preventScroll: true });
    }

    function close(returnFocus) {
        panel.hidden = true;
        root.classList.remove('is-open');
        launcher.setAttribute('aria-expanded', 'false');
        if (returnFocus !== false) launcher.focus({ preventScroll: true });
    }

    launcher.addEventListener('click', function () {
        if (panel.hidden) open(); else close();
    });
    closeButton.addEventListener('click', function () { close(); });
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && !panel.hidden) close();
    });

    /* the "Send an enquiry" bar on phones (js/sticky-cta.js): sit above it */
    const sticky = document.querySelector('.sticky-cta');
    if (sticky && window.MutationObserver) {
        const update = function () { root.classList.toggle('is-raised', sticky.classList.contains('is-visible')); };
        new MutationObserver(update).observe(sticky, { attributes: true, attributeFilter: ['class'] });
        update();
    }

    /* language switched on the page (js/i18n.js): start again in the new language */
    document.addEventListener('rdd:langchange', function () {
        labels();
        if (log.childNodes.length) restart();
    });

    labels();

})(document.documentElement);
