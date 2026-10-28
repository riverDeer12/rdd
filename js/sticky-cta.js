/* ===================================================================
 * RDD Software - "Send an enquiry" button on phones
 *
 * On service pages, the price list and the blog, a button at the bottom
 * of the screen leads to the contact form once the visitor has scrolled
 * a little. It hides again near the footer and while the cookie notice
 * is open. Styles: css/i18n.css (.sticky-cta); shown on narrow screens only.
 * ------------------------------------------------------------------- */

(function (html) {

    'use strict';

    const TEXT = {
        hr: 'Pošaljite upit',
        en: 'Send an enquiry',
        it: 'Invia una richiesta',
        de: 'Anfrage senden'
    };
    const SHOW_AFTER = 500;    // px scrolled

    const lang = TEXT[html.getAttribute('lang')] ? html.getAttribute('lang') : 'en';
    const footer = document.querySelector('footer');

    const button = document.createElement('a');
    button.className = 'sticky-cta';
    button.href = 'index.html#contact';
    button.setAttribute('data-cta', 'sticky');
    button.textContent = TEXT[lang];
    document.body.appendChild(button);

    function update() {
        const consent = document.querySelector('.consent-banner');
        const consentOpen = consent && !consent.hidden;
        const nearFooter = footer && footer.getBoundingClientRect().top < window.innerHeight;
        button.classList.toggle('is-visible', window.scrollY > SHOW_AFTER && !nearFooter && !consentOpen);
    }

    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    document.addEventListener('click', function () { setTimeout(update, 0); });   // cookie notice closed
    update();

})(document.documentElement);
