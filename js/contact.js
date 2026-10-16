/* ===================================================================
 * RDD Software - contact form
 *
 * Sends the enquiry to info@rdd.software through FormSubmit, using the
 * random alias FormSubmit issued for that address
 * (https://formsubmit.co, no account needed; the very first submission
 * sends an activation email to that address). Field names are Croatian
 * because the email is read by us, whatever language the visitor uses.
 *
 * Consultations are booked separately through Cal.com (js/booking.js).
 * ------------------------------------------------------------------- */

(function (html) {

    'use strict';

    const form = document.getElementById('contact-form');
    if (!form) return;

    // random alias from FormSubmit instead of the address, so it is not in the page source
    const ENDPOINT = 'https://formsubmit.co/ajax/202370d6dcbdf3b48b293269997a54ce';

    const TEXT = {
        hr: {
            sending: 'Šaljem…',
            success: 'Hvala! Upit je poslan, javit ćemo vam se što prije.',
            error: 'Upit nije poslan zbog tehničke greške. Pokušajte ponovno ili nam pišite na info@rdd.software.',
            required: 'Ispunite ime, ispravnu e-mail adresu i poruku.',
            autoresponse: 'Hvala na upitu! Primili smo vašu poruku i javit ćemo vam se što prije. — RDD Software'
        },
        en: {
            sending: 'Sending…',
            success: 'Thank you! Your enquiry has been sent and we will get back to you soon.',
            error: 'Your enquiry could not be sent because of a technical error. Please try again or write to info@rdd.software.',
            required: 'Please fill in your name, a valid email address and a message.',
            autoresponse: 'Thank you for your enquiry! We have received your message and will get back to you soon. — RDD Software'
        },
        it: {
            sending: 'Invio in corso…',
            success: 'Grazie! La richiesta è stata inviata, ti risponderemo al più presto.',
            error: 'Non è stato possibile inviare la richiesta per un errore tecnico. Riprova o scrivi a info@rdd.software.',
            required: 'Inserisci nome, un indirizzo e-mail valido e un messaggio.',
            autoresponse: 'Grazie per la richiesta! Abbiamo ricevuto il tuo messaggio e ti risponderemo al più presto. — RDD Software'
        },
        de: {
            sending: 'Wird gesendet…',
            success: 'Vielen Dank! Ihre Anfrage wurde gesendet, wir melden uns in Kürze.',
            error: 'Die Anfrage konnte wegen eines technischen Fehlers nicht gesendet werden. Bitte versuchen Sie es erneut oder schreiben Sie an info@rdd.software.',
            required: 'Bitte geben Sie Ihren Namen, eine gültige E-Mail-Adresse und eine Nachricht ein.',
            autoresponse: 'Vielen Dank für Ihre Anfrage! Wir haben Ihre Nachricht erhalten und melden uns in Kürze. — RDD Software'
        }
    };

    const status = document.getElementById('cf-status');
    const submit = form.querySelector('button[type="submit"]');

    function lang() {
        const l = html.getAttribute('lang');
        return TEXT[l] ? l : 'en';
    }

    function t(key) {
        return TEXT[lang()][key];
    }

    /* translate placeholders and <option> texts (labels use data-lang spans) */
    function translate() {
        const l = lang();
        form.querySelectorAll('[data-ph-' + l + ']').forEach(function (el) {
            el.setAttribute('placeholder', el.getAttribute('data-ph-' + l));
        });
        form.querySelectorAll('option[data-label-' + l + ']').forEach(function (el) {
            el.textContent = el.getAttribute('data-label-' + l);
        });
    }

    function showStatus(message, isError) {
        status.textContent = message;
        status.classList.toggle('is-error', !!isError);
        status.hidden = false;
    }

    form.addEventListener('submit', function (event) {
        event.preventDefault();
        status.hidden = true;

        const fields = form.elements;
        const emailInput = fields.namedItem('email');
        const data = {
            name: fields.namedItem('name').value.trim(),
            email: emailInput.value.trim(),
            company: fields.namedItem('company').value.trim(),
            type: fields.namedItem('cf-type').value,
            budget: fields.namedItem('cf-budget').value,
            message: fields.namedItem('message').value.trim()
        };

        if (!data.name || !data.message || !emailInput.checkValidity() || !data.email) {
            showStatus(t('required'), true);
            return;
        }

        const payload = {
            _subject: 'Novi upit s rdd.software: ' + data.name,
            _template: 'table',
            _captcha: 'false',
            _honey: fields.namedItem('_honey').value,
            _autoresponse: t('autoresponse'),
            'Ime i prezime': data.name,
            email: data.email,
            'Tvrtka': data.company || '-',
            'Vrsta projekta': data.type || '-',
            'Okvirni budžet': data.budget || '-',
            'Poruka': data.message,
            'Jezik posjetitelja': lang().toUpperCase()
        };

        submit.disabled = true;
        const label = submit.innerHTML;
        submit.textContent = t('sending');

        fetch(ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify(payload)
        })
            .then(function (response) {
                return response.json().then(function (json) {
                    if (!response.ok || String(json.success) !== 'true') throw new Error(json.message || 'send failed');
                });
            })
            .then(function () {
                form.reset();
                showStatus(t('success'), false);
                if (typeof window.gtag === 'function') {
                    window.gtag('event', 'generate_lead', { method: 'contact_form' });
                }
            })
            .catch(function () {
                showStatus(t('error'), true);
            })
            .finally(function () {
                submit.disabled = false;
                submit.innerHTML = label;
            });
    });

    /* coming from the price estimate (js/estimate.js): preselect the project
     * type and budget and start the message with the estimate */
    function applyEstimate() {
        let estimate = null;
        try {
            estimate = JSON.parse(sessionStorage.getItem('rdd-estimate'));
            sessionStorage.removeItem('rdd-estimate');
        } catch (e) {
            return;
        }
        if (!estimate) return;

        const fields = form.elements;
        [['cf-type', estimate.type], ['cf-budget', estimate.budget]].forEach(function (pair) {
            const select = fields.namedItem(pair[0]);
            if (select && select.querySelector('option[value="' + pair[1] + '"]')) select.value = pair[1];
        });

        const message = fields.namedItem('message');
        if (estimate.summary && !message.value.trim()) message.value = estimate.summary + '\n\n';
    }

    translate();
    applyEstimate();
    document.addEventListener('rdd:langchange', translate);

})(document.documentElement);
