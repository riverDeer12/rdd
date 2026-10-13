/* ===================================================================
 * RDD Software - consultation booking (Cal.com inline embed)
 *
 * The Cal.com calendar shows only free slots (it checks the connected
 * Apple calendar) and puts confirmed bookings straight into it.
 * Nothing is loaded from Cal.com until the visitor clicks the button.
 * The calendar follows the site's light/dark theme and language (one
 * Cal.com event per language) and is prefilled with the name and email
 * already typed into the contact form.
 * ------------------------------------------------------------------- */

(function (html) {

    'use strict';

    // one Cal.com event per site language, each with its own title and description
    const CAL_LINKS = {
        hr: 'rdd-software/konzultacije',
        en: 'rdd-software/consultation',
        it: 'rdd-software/consulenza',
        de: 'rdd-software/beratung'
    };
    const CAL_ORIGIN = 'https://cal.com';
    const CAL_SCRIPT = 'https://app.cal.com/embed/embed.js';
    const NAMESPACE = 'rdd';           // + '-' + language
    const BRAND = { light: '#007373', dark: '#23967f' };

    const button = document.getElementById('cal-open');
    const container = document.getElementById('cal-inline');
    if (!button || !container) return;

    function theme() {
        return html.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    }

    function formValue(name) {
        const form = document.getElementById('contact-form');
        const field = form && form.elements.namedItem(name);
        return field ? field.value.trim() : '';
    }

    /* Cal.com's official loader snippet: queues calls until embed.js has loaded */
    function loadCal() {
        (function (C, A, L) {
            const p = function (a, ar) { a.q.push(ar); };
            const d = C.document;
            C.Cal = C.Cal || function () {
                const cal = C.Cal;
                const ar = arguments;
                if (!cal.loaded) {
                    cal.ns = {};
                    cal.q = cal.q || [];
                    d.head.appendChild(d.createElement('script')).src = A;
                    cal.loaded = true;
                }
                if (ar[0] === L) {
                    const api = function () { p(api, arguments); };
                    const namespace = ar[1];
                    api.q = api.q || [];
                    if (typeof namespace === 'string') {
                        cal.ns[namespace] = cal.ns[namespace] || api;
                        p(cal.ns[namespace], ar);
                        p(cal, ['initNamespace', namespace]);
                    } else {
                        p(cal, ar);
                    }
                    return;
                }
                p(cal, ar);
            };
        })(window, CAL_SCRIPT, 'init');
    }

    function uiOptions() {
        return {
            theme: theme(),
            layout: 'month_view',
            hideEventTypeDetails: false,
            cssVarsPerTheme: {
                light: { 'cal-brand': BRAND.light },
                dark: { 'cal-brand': BRAND.dark }
            }
        };
    }

    const initialised = [];

    function lang() {
        const l = html.getAttribute('lang');
        return CAL_LINKS[l] ? l : 'en';
    }

    function api(ns) {
        return window.Cal.ns[ns];
    }

    function open() {
        const l = lang();
        const ns = NAMESPACE + '-' + l;

        container.innerHTML = '';
        const target = document.createElement('div');
        target.id = 'cal-inline-' + l;
        container.appendChild(target);
        container.hidden = false;
        button.hidden = true;

        loadCal();
        if (initialised.indexOf(ns) === -1) {
            window.Cal('init', ns, { origin: CAL_ORIGIN });
            api(ns)('on', {
                action: 'bookingSuccessful',
                callback: function () {
                    if (typeof window.gtag === 'function') {
                        window.gtag('event', 'generate_lead', { method: 'consultation' });
                    }
                }
            });
            initialised.push(ns);
        }

        const config = { layout: 'month_view', theme: theme() };
        const name = formValue('name');
        const email = formValue('email');
        if (name) config.name = name;
        if (email) config.email = email;

        api(ns)('inline', {
            elementOrSelector: '#' + target.id,
            calLink: CAL_LINKS[l],
            config: config
        });
        api(ns)('ui', uiOptions());
    }

    button.addEventListener('click', open);

    // keep an open calendar in step with the site's theme toggle
    new MutationObserver(function () {
        initialised.forEach(function (ns) {
            api(ns)('ui', uiOptions());
        });
    }).observe(html, { attributes: true, attributeFilter: ['data-theme'] });

    // language switched: close the calendar so it reopens on that language's event
    document.addEventListener('rdd:langchange', function () {
        if (container.hidden) return;
        container.innerHTML = '';
        container.hidden = true;
        button.hidden = false;
    });

})(document.documentElement);
