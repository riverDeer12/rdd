/* ===================================================================
 * RDD Software - language switcher (hr / en)
 *
 * Content is written in both languages side by side, marked with
 * data-lang="hr" / data-lang="en". css/i18n.css hides the language that
 * does not match <html lang>. This script picks the language (saved
 * choice, otherwise Croatian) and wires up the [data-set-lang] buttons.
 *
 * Load it in <head> without defer so the language is set before paint.
 * ------------------------------------------------------------------- */

(function (html) {

    'use strict';

    const STORAGE_KEY = 'rdd-lang';
    const SUPPORTED = ['hr', 'en'];
    const DEFAULT_LANG = 'hr';

    function readStored() {
        try {
            return localStorage.getItem(STORAGE_KEY);
        } catch (e) {
            return null;
        }
    }

    function store(lang) {
        try {
            localStorage.setItem(STORAGE_KEY, lang);
        } catch (e) {
            // storage unavailable (private mode etc.) - choice lasts for this page only
        }
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

    let lang = readStored();
    if (SUPPORTED.indexOf(lang) === -1) lang = DEFAULT_LANG;
    html.setAttribute('lang', lang);

    document.addEventListener('DOMContentLoaded', function () {
        applyLang(lang);

        document.addEventListener('click', function (event) {
            const button = event.target.closest('[data-set-lang]');
            if (!button) return;

            event.preventDefault();
            lang = button.getAttribute('data-set-lang');
            store(lang);
            applyLang(lang);
        });
    });

})(document.documentElement);
