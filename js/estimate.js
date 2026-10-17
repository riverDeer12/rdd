/* ===================================================================
 * RDD Software - quick price estimate (price list page)
 *
 * The visitor picks the kind of project, its size and extras and sees a
 * rough price range and timeline. "Request a quote" carries the choice
 * over to the contact form on the home page (js/contact.js reads it from
 * sessionStorage), so the enquiry arrives with the estimate in it.
 *
 * All prices come from the price list (pricing.html). SCOPE is the only
 * assumption: how far above the starting price a medium or large
 * project usually lands. Change it here if that turns out differently.
 * ------------------------------------------------------------------- */

(function (html) {

    'use strict';

    const form = document.getElementById('estimate-form');
    if (!form) return;

    const PROJECTS = {
        // contact: the matching "project type" option of the contact form
        website: { from: 1000, maintenance: 50,  timeline: 'weeks24',  contact: 'Web stranica' },
        shop:    { from: 2000, maintenance: 50,  timeline: 'weeks48',  contact: 'Web trgovina' },
        webapp:  { from: 3500, maintenance: 150, timeline: 'months24', contact: 'Web aplikacija' },
        mobile:  { from: 5000, maintenance: 150, timeline: 'months24', contact: 'Mobilna aplikacija' }
    };

    // multiples of the starting price: [low, high]
    const SCOPE = {
        small:  [1, 1.3],
        medium: [1.3, 2],
        large:  [2, 3]
    };

    const IDENTITY = {
        none: 0,
        logo: 300,
        identity: 800
    };

    const EXTRAS = {
        prototype: 700,
        analysis: 600,
        maintenance: 0      // monthly, shown separately
    };

    // budget options of the contact form (values are Croatian, like the form)
    const BUDGETS = [
        { max: 1000, value: 'Do 1.000 €' },
        { max: 3000, value: '1.000 – 3.000 €' },
        { max: 10000, value: '3.000 – 10.000 €' },
        { max: Infinity, value: 'Više od 10.000 €' }
    ];

    const TEXT = {
        hr: { locale: 'hr-HR', summary: 'Okvirni izračun s cjenika', timeline: 'Okvirni rok', longer: 'ili više', maintenance: 'održavanje od %s mjesečno',
              weeks24: '2–4 tjedna', weeks48: '4–8 tjedana', months24: '2–4 mjeseca' },
        en: { locale: 'en-GB', summary: 'Estimate from the price list', timeline: 'Typical timeline', longer: 'or more', maintenance: 'maintenance from %s a month',
              weeks24: '2–4 weeks', weeks48: '4–8 weeks', months24: '2–4 months' },
        it: { locale: 'it-IT', summary: 'Stima dal listino', timeline: 'Tempi indicativi', longer: 'o più', maintenance: 'manutenzione da %s al mese',
              weeks24: '2–4 settimane', weeks48: '4–8 settimane', months24: '2–4 mesi' },
        de: { locale: 'de-DE', summary: 'Schätzung aus der Preisliste', timeline: 'Richtwert Dauer', longer: 'oder länger', maintenance: 'Wartung ab %s pro Monat',
              weeks24: '2–4 Wochen', weeks48: '4–8 Wochen', months24: '2–4 Monate' }
    };

    const priceEl = document.getElementById('estimate-price');
    const metaEl = document.getElementById('estimate-meta');
    const sendEl = document.getElementById('estimate-send');
    const text = TEXT[html.getAttribute('lang')] || TEXT.en;

    function money(amount) {
        return new Intl.NumberFormat(text.locale, {
            style: 'currency', currency: 'EUR', maximumFractionDigits: 0
        }).format(amount);
    }

    function roundTo100(amount) {
        return Math.round(amount / 100) * 100;
    }

    function checked(name) {
        return form.querySelector('input[name="' + name + '"]:checked');
    }

    // visible label of a choice, in the page's language
    function label(input) {
        return input.closest('label').querySelector('.estimate__option-name').textContent.trim();
    }

    function estimate() {
        const type = checked('type');
        const scope = checked('scope');
        const identity = checked('identity');
        const extras = Array.prototype.slice.call(form.querySelectorAll('input[name="extra"]:checked'));
        const project = PROJECTS[type.value];

        let addons = IDENTITY[identity.value];
        extras.forEach(function (input) { addons += EXTRAS[input.value]; });

        const choices = [type, scope].concat(identity.value === 'none' ? [] : [identity], extras);
        return {
            project: project,
            longer: scope.value !== 'small',
            maintenance: extras.some(function (input) { return input.value === 'maintenance'; }),
            labels: choices.map(label),
            low: roundTo100(project.from * SCOPE[scope.value][0] + addons),
            high: roundTo100(project.from * SCOPE[scope.value][1] + addons)
        };
    }

    function render() {
        const e = estimate();
        priceEl.textContent = money(e.low) + ' – ' + money(e.high);

        let meta = text.timeline + ': ' + text[e.project.timeline];
        if (e.longer) meta += ' ' + text.longer;
        if (e.maintenance) meta += ' · ' + text.maintenance.replace('%s', money(e.project.maintenance));
        metaEl.textContent = meta;
    }

    // hand the estimate over to the contact form (read by js/contact.js)
    sendEl.addEventListener('click', function () {
        const e = estimate();
        const middle = (e.low + e.high) / 2;
        const budget = BUDGETS.filter(function (b) { return middle <= b.max; })[0].value;

        try {
            sessionStorage.setItem('rdd-estimate', JSON.stringify({
                type: e.project.contact,
                budget: budget,
                summary: text.summary + ': ' + e.labels.join(', ') + ' (' + priceEl.textContent + ').'
            }));
        } catch (err) {
            // storage unavailable - the visitor still lands on the form
        }
    });

    form.addEventListener('change', render);
    render();

})(document.documentElement);
