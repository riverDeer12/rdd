/* ===================================================================
 * RDD Software - light / dark theme
 *
 * Sets <html data-theme="dark|light">; css/theme.css holds the light
 * palette. The theme is the saved choice, otherwise the visitor's
 * system preference. [data-toggle-theme] buttons switch it.
 *
 * Load it in <head> without defer so the theme is set before paint.
 * ------------------------------------------------------------------- */

(function (html) {

    'use strict';

    const STORAGE_KEY = 'rdd-theme';
    const THEMES = ['dark', 'light'];
    const lightQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: light)') : null;

    function readStored() {
        try {
            return localStorage.getItem(STORAGE_KEY);
        } catch (e) {
            return null;
        }
    }

    function store(theme) {
        try {
            localStorage.setItem(STORAGE_KEY, theme);
        } catch (e) {
            // storage unavailable (private mode etc.) - choice lasts for this page only
        }
    }

    function systemTheme() {
        return lightQuery && lightQuery.matches ? 'light' : 'dark';
    }

    function applyTheme(theme) {
        html.setAttribute('data-theme', theme);

        document.querySelectorAll('[data-toggle-theme]').forEach(function (button) {
            button.setAttribute('aria-pressed', theme === 'light' ? 'true' : 'false');
        });
    }

    let stored = readStored();
    let theme = THEMES.indexOf(stored) !== -1 ? stored : systemTheme();
    html.setAttribute('data-theme', theme);

    // follow the system setting until the visitor picks a theme themselves
    if (lightQuery && lightQuery.addEventListener) {
        lightQuery.addEventListener('change', function () {
            if (THEMES.indexOf(readStored()) !== -1) return;
            theme = systemTheme();
            applyTheme(theme);
        });
    }

    document.addEventListener('DOMContentLoaded', function () {
        applyTheme(theme);

        document.addEventListener('click', function (event) {
            const button = event.target.closest('[data-toggle-theme]');
            if (!button) return;

            event.preventDefault();
            theme = theme === 'light' ? 'dark' : 'light';
            store(theme);
            applyTheme(theme);
        });
    });

})(document.documentElement);
