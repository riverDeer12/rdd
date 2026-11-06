/* ===================================================================
 * RDD Software - price calculator demo (price-calculator.html)
 *
 * An example of the calculator we build into websites of service
 * businesses: the visitor enters the floor area and the kind of
 * cleaning and sees a price range straight away. The prices below are
 * made-up examples; on a client's website they come from the client.
 *
 * "Ask about a calculator" carries the example over to the contact form
 * on the home page (js/contact.js reads it from sessionStorage), the
 * same way as the quick estimate on the price list.
 * ------------------------------------------------------------------- */

(function (html) {

    'use strict';

    const form = document.getElementById('calc-form');
    if (!form) return;

    // example prices per m2: [low, high]
    const RATES = {
        regular: [1.2, 1.5],
        deep: [2.5, 3.2],
        renovation: [3.5, 4.5]
    };
    const WINDOWS = [0.6, 0.8];     // extra per m2 of floor area
    const MINIMUM = 50;             // smallest order
    const MIN_AREA = 10, MAX_AREA = 500;

    const TEXT = {
        hr: { locale: 'hr-HR', perm2: 'oko %s € / m²', minimum: 'Uključen je minimalni iznos narudžbe od %s €.',
              summary: 'Zanima me web stranica s kalkulatorom cijene. Isprobao/la sam demo: %s m², %s, okvirno %s.',
              kinds: { regular: 'redovno čišćenje', deep: 'generalno čišćenje', renovation: 'čišćenje nakon radova' }, windows: 'pranje prozora' },
        en: { locale: 'en-GB', perm2: 'about €%s / m²', minimum: 'The minimum order of €%s is applied.',
              summary: 'I am interested in a website with a price calculator. I tried the demo: %s m², %s, roughly %s.',
              kinds: { regular: 'regular cleaning', deep: 'deep cleaning', renovation: 'after-renovation cleaning' }, windows: 'window cleaning' },
        it: { locale: 'it-IT', perm2: 'circa %s € / m²', minimum: 'Si applica l’ordine minimo di %s €.',
              summary: 'Mi interessa un sito con calcolatore dei prezzi. Ho provato la demo: %s m², %s, circa %s.',
              kinds: { regular: 'pulizia ordinaria', deep: 'pulizia generale', renovation: 'pulizia dopo i lavori' }, windows: 'lavaggio finestre' },
        de: { locale: 'de-DE', perm2: 'ca. %s € / m²', minimum: 'Der Mindestbetrag von %s € wird angewendet.',
              summary: 'Ich interessiere mich für eine Website mit Preisrechner. Ich habe die Demo ausprobiert: %s m², %s, ca. %s.',
              kinds: { regular: 'Unterhaltsreinigung', deep: 'Grundreinigung', renovation: 'Reinigung nach Renovierung' }, windows: 'Fensterreinigung' }
    };

    const areaEl = document.getElementById('calc-area');
    const rangeEl = document.getElementById('calc-area-range');
    const priceEl = document.getElementById('calc-price');
    const metaEl = document.getElementById('calc-meta');
    const sendEl = document.getElementById('calc-send');

    function text() {
        return TEXT[html.lang] || TEXT.hr;
    }

    function euro(value, t) {
        return new Intl.NumberFormat(t.locale, { maximumFractionDigits: 0 }).format(value);
    }

    function area() {
        const value = parseInt(areaEl.value, 10);
        if (isNaN(value)) return MIN_AREA;
        return Math.min(MAX_AREA, Math.max(MIN_AREA, value));
    }

    function calculate() {
        const kind = form.elements.namedItem('kind').value;
        const windows = form.elements.namedItem('windows').checked;
        const m2 = area();
        let low = RATES[kind][0], high = RATES[kind][1];
        if (windows) { low += WINDOWS[0]; high += WINDOWS[1]; }
        const total = [m2 * low, m2 * high].map(function (v) { return Math.max(MINIMUM, Math.round(v / 5) * 5); });
        return { kind: kind, windows: windows, m2: m2, perm2: [low, high], low: total[0], high: total[1] };
    }

    function render() {
        const t = text();
        const r = calculate();
        const amount = function (v) { return t.locale === 'en-GB' ? '€' + euro(v, t) : euro(v, t) + ' €'; };
        priceEl.textContent = r.low === r.high
            ? amount(r.low)
            : t.locale === 'en-GB'
                ? amount(r.low) + ' – ' + amount(r.high)
                : euro(r.low, t) + ' – ' + amount(r.high);
        const perm2 = new Intl.NumberFormat(t.locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        let meta = t.perm2.replace('%s', perm2.format(r.perm2[0]) + ' – ' + perm2.format(r.perm2[1]));
        if (r.low === MINIMUM) meta += '. ' + t.minimum.replace('%s', euro(MINIMUM, t));
        metaEl.textContent = meta;
    }

    // number field and slider move together
    areaEl.addEventListener('input', function () {
        if (areaEl.value !== '') rangeEl.value = area();
        render();
    });
    areaEl.addEventListener('change', function () {
        areaEl.value = area();
        rangeEl.value = area();
        render();
    });
    rangeEl.addEventListener('input', function () {
        areaEl.value = rangeEl.value;
        render();
    });
    form.addEventListener('change', render);
    form.addEventListener('submit', function (e) { e.preventDefault(); });
    document.addEventListener('rdd:langchange', render);

    sendEl.addEventListener('click', function () {
        const t = text();
        const r = calculate();
        const kind = t.kinds[r.kind] + (r.windows ? ' + ' + t.windows : '');
        try {
            sessionStorage.setItem('rdd-estimate', JSON.stringify({
                type: 'Web stranica',
                budget: '1.000 – 3.000 €',
                summary: t.summary.replace('%s', r.m2).replace('%s', kind).replace('%s', priceEl.textContent)
            }));
        } catch (err) {
            // storage unavailable - the visitor still lands on the form
        }
        if (window.rddTrack) {
            window.rddTrack('cta_click', { cta: 'calculator_demo' });
        }
    });

    render();

})(document.documentElement);
