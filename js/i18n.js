/* ===================================================================
 * RDD Software - languages (hr / en / it / de)
 *
 * Every page exists once per language (built by tools/build.py from
 * src/): Croatian without a prefix, the others under /en/, /it/, /de/.
 * The versions are listed in <head> as <link rel="alternate" hreflang>,
 * and the language switcher is a set of plain links between them.
 *
 * This script only decides whether to send the visitor to another
 * version:
 *   1. the language they picked in the switcher (remembered), else
 *   2. on the Croatian (unprefixed) pages, where new visitors land: the
 *      language of the country their IP address is in (looked up once,
 *      then remembered), otherwise English.
 * Search engine crawlers are never redirected, so they index every version.
 *
 * Pages that still carry all languages side by side (404.html, which
 * GitHub Pages serves for any missing URL) switch in place instead:
 * css/i18n.css hides the languages that do not match <html lang>.
 *
 * Load it in <head> without defer, after the hreflang links, so the
 * redirect happens before the page is painted.
 * ------------------------------------------------------------------- */

(function (html) {

    'use strict';

    const STORAGE_KEY = 'rdd-lang';          // language the visitor picked
    const GEO_STORAGE_KEY = 'rdd-lang-geo';  // language detected from the IP address
    const SUPPORTED = ['hr', 'en', 'it', 'de'];
    const DEFAULT_LANG = 'en';               // when the country has no language of its own
    const UNPREFIXED_LANG = 'hr';            // language of the pages without /xx/

    // country code (ISO 3166-1) -> site language; every other country gets DEFAULT_LANG
    const COUNTRY_LANG = {
        HR: 'hr', BA: 'hr',
        IT: 'it', SM: 'it', VA: 'it',
        DE: 'de', AT: 'de', CH: 'de', LI: 'de'
    };

    // free IP geolocation service, answers with a two-letter country code
    const GEO_URL = 'https://get.geojs.io/v1/ip/country';
    const GEO_TIMEOUT = 1500;

    const CRAWLER = /bot|crawl|spider|slurp|lighthouse|facebookexternalhit|preview/i;

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
        if (!window.fetch || !window.AbortController) return Promise.resolve(null);

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

    // language -> path of this page in that language, from the hreflang links
    const versions = {};
    document.querySelectorAll('link[rel="alternate"][hreflang]').forEach(function (link) {
        const lang = link.getAttribute('hreflang');
        if (isSupported(lang)) versions[lang] = new URL(link.href).pathname;
    });

    if (Object.keys(versions).length) {
        perLanguagePage();
    } else {
        allLanguagesPage();
    }

    document.addEventListener('DOMContentLoaded', setUpMenus);


    /* ----------------------------------------------------------------
     * pages with one URL per language
     * ---------------------------------------------------------------- */
    function perLanguagePage() {
        const pageLang = html.getAttribute('lang');

        // true when the visitor is on their way to another version
        function goTo(lang) {
            if (!isSupported(lang) || lang === pageLang || !versions[lang]) return false;
            location.replace(versions[lang] + location.search + location.hash);
            return true;
        }

        // picking a language in the switcher: remember it, the link does the rest
        document.addEventListener('click', function (event) {
            const link = event.target.closest('a[data-set-lang]');
            if (link) store(STORAGE_KEY, link.getAttribute('data-set-lang'));
        });

        if (CRAWLER.test(navigator.userAgent)) return;

        const chosen = readStored(STORAGE_KEY);
        if (isSupported(chosen)) {
            goTo(chosen);
            return;
        }

        // someone who opened an /en/, /it/ or /de/ link wants that language
        if (pageLang !== UNPREFIXED_LANG) return;

        const detected = readStored(GEO_STORAGE_KEY);
        if (isSupported(detected)) {
            goTo(detected);
            return;
        }

        // first visit: keep the page hidden (css/i18n.css) until the country is known,
        // so the visitor does not see it change right after it appears
        html.classList.add('i18n-pending');
        detectFromIp().then(function (lang) {
            if (lang) store(GEO_STORAGE_KEY, lang);
            if (!goTo(lang || DEFAULT_LANG)) html.classList.remove('i18n-pending');
        });
    }


    /* ----------------------------------------------------------------
     * pages with every language side by side (404.html)
     * ---------------------------------------------------------------- */
    function allLanguagesPage() {
        function applyLang(lang) {
            html.setAttribute('lang', lang);

            const title = html.getAttribute('data-title-' + lang);
            if (title) document.title = title;

            document.querySelectorAll('[data-set-lang]').forEach(function (button) {
                const isActive = button.getAttribute('data-set-lang') === lang;
                button.classList.toggle('is-active', isActive);
                button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
            });

            document.dispatchEvent(new CustomEvent('rdd:langchange', { detail: lang }));
        }

        let domReady = false;
        let userChose = false;
        let lang = readStored(STORAGE_KEY);

        if (!isSupported(lang)) lang = readStored(GEO_STORAGE_KEY);

        if (!isSupported(lang)) {
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
        });

        document.addEventListener('click', function (event) {
            const button = event.target.closest('button[data-set-lang]');
            if (!button) return;

            event.preventDefault();
            lang = button.getAttribute('data-set-lang');
            userChose = true;
            store(STORAGE_KEY, lang);
            html.classList.remove('i18n-pending');
            applyLang(lang);
        });
    }


    /* ----------------------------------------------------------------
     * phone dropdown (.lang-menu): open/close the list under the toggle
     * ---------------------------------------------------------------- */
    function setUpMenus() {
        function closeMenus(except) {
            document.querySelectorAll('.lang-menu.is-open').forEach(function (menu) {
                if (menu === except) return;
                menu.classList.remove('is-open');
                menu.querySelector('.lang-menu__toggle').setAttribute('aria-expanded', 'false');
            });
        }

        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape') closeMenus(null);
        });

        document.addEventListener('click', function (event) {
            const toggle = event.target.closest('.lang-menu__toggle');
            if (!toggle) {
                closeMenus(null);
                return;
            }
            const menu = toggle.closest('.lang-menu');
            const open = !menu.classList.contains('is-open');
            closeMenus(menu);
            menu.classList.toggle('is-open', open);
            toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        });
    }

})(document.documentElement);
