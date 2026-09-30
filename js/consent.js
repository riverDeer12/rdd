/* ===================================================================
 * RDD Software - cookie consent for Google Analytics
 *
 * Google Analytics is loaded only after the visitor clicks "Accept" in
 * the banner. The choice is kept in localStorage; [data-consent-open]
 * links (footer "Cookie settings") show the banner again so it can be
 * changed. Banner texts use data-lang, like the rest of the site.
 *
 * Load it at the end of <body>, after js/i18n.js has run in <head>.
 * ------------------------------------------------------------------- */

(function (html) {

    'use strict';

    const STORAGE_KEY = 'rdd-consent';
    const GA_ID = 'G-LM7LK5FY5W';

    const TEXT = {
        hr: {
            message: 'Koristimo kolačiće Google Analyticsa kako bismo vidjeli koliko posjetitelja imamo. Postavljamo ih samo uz vaš pristanak.',
            more: 'Izjava o privatnosti',
            accept: 'Prihvati',
            decline: 'Odbij'
        },
        en: {
            message: 'We use Google Analytics cookies to see how many visitors we have. They are only set if you agree.',
            more: 'Privacy Policy',
            accept: 'Accept',
            decline: 'Decline'
        },
        it: {
            message: 'Utilizziamo i cookie di Google Analytics per sapere quanti visitatori abbiamo. Vengono impostati solo con il tuo consenso.',
            more: 'Informativa sulla privacy',
            accept: 'Accetta',
            decline: 'Rifiuta'
        },
        de: {
            message: 'Wir verwenden Cookies von Google Analytics, um zu sehen, wie viele Besucher wir haben. Sie werden nur mit Ihrer Einwilligung gesetzt.',
            more: 'Datenschutzerklärung',
            accept: 'Akzeptieren',
            decline: 'Ablehnen'
        }
    };

    let banner = null;
    let analyticsLoaded = false;

    function readStored() {
        try {
            return localStorage.getItem(STORAGE_KEY);
        } catch (e) {
            return null;
        }
    }

    function store(choice) {
        try {
            localStorage.setItem(STORAGE_KEY, choice);
        } catch (e) {
            // storage unavailable - the banner will simply ask again on the next page
        }
    }

    function loadAnalytics() {
        window['ga-disable-' + GA_ID] = false;
        if (analyticsLoaded) return;
        analyticsLoaded = true;

        window.dataLayer = window.dataLayer || [];
        window.gtag = function () {
            window.dataLayer.push(arguments);
        };
        window.gtag('js', new Date());
        window.gtag('config', GA_ID);

        const script = document.createElement('script');
        script.async = true;
        script.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
        document.head.appendChild(script);
    }

    function removeAnalytics() {
        window['ga-disable-' + GA_ID] = true;

        // delete the _ga cookies Google Analytics may already have set
        const parts = location.hostname.split('.');
        const domains = [''];
        for (let i = 0; i < parts.length - 1; i++) {
            domains.push('; domain=.' + parts.slice(i).join('.'));
        }
        document.cookie.split(';').forEach(function (cookie) {
            const name = cookie.split('=')[0].trim();
            if (name.indexOf('_ga') !== 0) return;
            domains.forEach(function (domain) {
                document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/' + domain;
            });
        });
    }

    function langSpans(key) {
        return Object.keys(TEXT).map(function (lang) {
            return '<span data-lang="' + lang + '">' + TEXT[lang][key] + '</span>';
        }).join('');
    }

    function buildBanner() {
        banner = document.createElement('div');
        banner.className = 'consent-banner';
        banner.setAttribute('role', 'region');
        banner.setAttribute('aria-label', 'Kolačići / Cookies');
        banner.innerHTML =
            '<p class="consent-banner__text">' + langSpans('message') +
            ' <a href="privacy.html">' + langSpans('more') + '</a></p>' +
            '<div class="consent-banner__actions">' +
            '<button type="button" class="consent-banner__btn" data-consent="denied">' + langSpans('decline') + '</button>' +
            '<button type="button" class="consent-banner__btn" data-consent="granted">' + langSpans('accept') + '</button>' +
            '</div>';
        document.body.appendChild(banner);
    }

    function showBanner() {
        if (!banner) buildBanner();
        banner.hidden = false;
    }

    function hideBanner() {
        if (banner) banner.hidden = true;
    }

    function choose(choice) {
        store(choice);
        hideBanner();
        if (choice === 'granted') loadAnalytics();
        else removeAnalytics();
    }

    const stored = readStored();
    if (stored === 'granted') loadAnalytics();
    else if (stored !== 'denied') showBanner();

    document.addEventListener('click', function (event) {
        const button = event.target.closest('[data-consent]');
        if (button) {
            choose(button.getAttribute('data-consent'));
            return;
        }

        const opener = event.target.closest('[data-consent-open]');
        if (opener) {
            event.preventDefault();
            showBanner();
        }
    });

})(document.documentElement);
