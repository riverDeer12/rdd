/* ===================================================================
 * RDD Software - language switcher (hr / en / it / de)
 *
 * Content is written in all languages side by side, marked with
 * data-lang="hr" / "en" / "it" / "de". css/i18n.css hides the language that
 * does not match <html lang>. This script picks the language and wires up
 * the [data-set-lang] buttons.
 *
 * Language order: the visitor's own choice, otherwise the language of the
 * country their IP address is in (looked up once, then remembered),
 * otherwise English.
 *
 * Load it in <head> without defer so the language is set before paint.
 * ------------------------------------------------------------------- */

(function (html) {

    'use strict';

    const STORAGE_KEY = 'rdd-lang';          // language the visitor picked
    const GEO_STORAGE_KEY = 'rdd-lang-geo';  // language detected from the IP address
    const SUPPORTED = ['hr', 'en', 'it', 'de'];
    const DEFAULT_LANG = 'en';

    // country code (ISO 3166-1) -> site language; every other country gets DEFAULT_LANG
    const COUNTRY_LANG = {
        HR: 'hr', BA: 'hr',
        IT: 'it', SM: 'it', VA: 'it',
        DE: 'de', AT: 'de', CH: 'de', LI: 'de'
    };

    // free IP geolocation service, answers with a two-letter country code
    const GEO_URL = 'https://get.geojs.io/v1/ip/country';
    const GEO_TIMEOUT = 1500;

    function readStored(key) {
        try {
            return localStorage.getItem(key);
        } catch (e) {
            return null;
        }
    }

    function store(key, lang) {
        try {
            localStorage.setItem(key, lang);
        } catch (e) {
            // storage unavailable (private mode etc.) - choice lasts for this page only
        }
    }

    function isSupported(lang) {
        return SUPPORTED.indexOf(lang) !== -1;
    }

    function detectFromIp() {
        if (!window.fetch || !window.AbortController) return Promise.resolve(DEFAULT_LANG);

        const controller = new AbortController();
        const timer = setTimeout(function () { controller.abort(); }, GEO_TIMEOUT);

        return fetch(GEO_URL, { signal: controller.signal, credentials: 'omit' })
            .then(function (response) {
                if (!response.ok) throw new Error('geo lookup failed');
                return response.text();
            })
            .then(function (country) {
                return COUNTRY_LANG[country.trim().toUpperCase()] || DEFAULT_LANG;
            })
            .catch(function () {
                return null; // unknown - use the default, but try again on the next visit
            })
            .finally(function () {
                clearTimeout(timer);
            });
    }

    function applyLang(lang) {
        html.setAttribute('lang', lang);

        const title = html.getAttribute('data-title-' + lang);
        if (title) document.title = title;

        document.querySelectorAll('[data-set-lang]').forEach(function (button) {
            const isActive = button.getAttribute('data-set-lang') === lang;
            button.classList.toggle('is-active', isActive);
            button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        });
    }

    let domReady = false;
    let userChose = false;
    let lang = readStored(STORAGE_KEY);

    if (!isSupported(lang)) lang = readStored(GEO_STORAGE_KEY);

    if (!isSupported(lang)) {
        // first visit: keep the page hidden (css/i18n.css) until the country is known,
        // so the visitor does not see it switch language right after it appears
        lang = DEFAULT_LANG;
        html.classList.add('i18n-pending');

        detectFromIp().then(function (detected) {
            if (detected) store(GEO_STORAGE_KEY, detected);
            if (!userChose) {
                lang = detected || DEFAULT_LANG;
                if (domReady) applyLang(lang);
                else html.setAttribute('lang', lang);
            }
            html.classList.remove('i18n-pending');
        });
    }

    html.setAttribute('lang', lang);

    document.addEventListener('DOMContentLoaded', function () {
        domReady = true;
        applyLang(lang);

        document.addEventListener('click', function (event) {
            const button = event.target.closest('[data-set-lang]');
            if (!button) return;

            event.preventDefault();
            lang = button.getAttribute('data-set-lang');
            userChose = true;
            store(STORAGE_KEY, lang);
            html.classList.remove('i18n-pending');
            applyLang(lang);
        });
    });

})(document.documentElement);
