/* ===================================================================
 * RDD Software - consultation booking (Cal.com inline embed)
 *
 * The Cal.com calendar shows only free slots (it checks the connected
 * Apple calendar) and puts confirmed bookings straight into it.
 * Nothing is loaded from Cal.com until the visitor clicks the button.
 * The calendar follows the site's light/dark theme and is prefilled
 * with the name and email already typed into the contact form.
 * ------------------------------------------------------------------- */

(function (html) {

    'use strict';

    const CAL_LINK = 'rdd-software';           // cal.com/<CAL_LINK>
    const CAL_ORIGIN = 'https://cal.com';
    const CAL_SCRIPT = 'https://app.cal.com/embed/embed.js';
    const NAMESPACE = 'rdd';
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

    button.addEventListener('click', function () {
        container.hidden = false;
        button.hidden = true;

        loadCal();
        window.Cal('init', NAMESPACE, { origin: CAL_ORIGIN });

        const config = { layout: 'month_view', theme: theme() };
        const name = formValue('name');
        const email = formValue('email');
        if (name) config.name = name;
        if (email) config.email = email;

        window.Cal.ns[NAMESPACE]('inline', {
            elementOrSelector: '#cal-inline',
            calLink: CAL_LINK,
            config: config
        });
        window.Cal.ns[NAMESPACE]('ui', uiOptions());

        window.Cal.ns[NAMESPACE]('on', {
            action: 'bookingSuccessful',
            callback: function () {
                if (typeof window.gtag === 'function') {
                    window.gtag('event', 'generate_lead', { method: 'consultation' });
                }
            }
        });

        // keep the calendar in step with the site's theme toggle
        new MutationObserver(function () {
            window.Cal.ns[NAMESPACE]('ui', uiOptions());
        }).observe(html, { attributes: true, attributeFilter: ['data-theme'] });
    });

})(document.documentElement);
