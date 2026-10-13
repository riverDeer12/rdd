/* ===================================================================
 * RDD Software - contact form with optional consultation booking
 *
 * Sends the enquiry to info@rdd.software through FormSubmit, using the
 * random alias FormSubmit issued for that address
 * (https://formsubmit.co, no account needed; the very first submission
 * sends an activation email to that address). Field names are Croatian
 * because the email is read by us, whatever language the visitor uses.
 *
 * When a consultation is requested, the email also carries a link to
 * calendar.html, which turns the requested slot into an .ics file for
 * Apple Calendar (or any other calendar app).
 * ------------------------------------------------------------------- */

(function (html) {

    'use strict';

    const form = document.getElementById('contact-form');
    if (!form) return;

    // random alias from FormSubmit instead of the address, so it is not in the page source
    const ENDPOINT = 'https://formsubmit.co/ajax/202370d6dcbdf3b48b293269997a54ce';
    const CALENDAR_PAGE = 'https://rdd.software/calendar.html';
    const MEETING_MINUTES = 30;
    const FIRST_SLOT = 9 * 60;   // 09:00
    const LAST_SLOT = 15 * 60 + 30; // 15:30 (ends 16:00)
    const DAYS_AHEAD = 60;

    const TEXT = {
        hr: {
            sending: 'Šaljem…',
            success: 'Hvala! Upit je poslan, javit ćemo vam se što prije.',
            successMeeting: 'Hvala! Upit je poslan. Termin konzultacija potvrdit ćemo vam e-poštom.',
            error: 'Upit nije poslan zbog tehničke greške. Pokušajte ponovno ili nam pišite na info@rdd.software.',
            required: 'Ispunite ime, ispravnu e-mail adresu i poruku.',
            pickSlot: 'Odaberite datum i vrijeme konzultacija.',
            weekday: 'Konzultacije su moguće samo radnim danom. Odaberite drugi datum.',
            autoresponse: 'Hvala na upitu! Primili smo vašu poruku i javit ćemo vam se što prije. Ako ste zatražili konzultacije, termin ćemo potvrditi e-poštom. — RDD Software'
        },
        en: {
            sending: 'Sending…',
            success: 'Thank you! Your enquiry has been sent and we will get back to you soon.',
            successMeeting: 'Thank you! Your enquiry has been sent. We will confirm the consultation time by email.',
            error: 'Your enquiry could not be sent because of a technical error. Please try again or write to info@rdd.software.',
            required: 'Please fill in your name, a valid email address and a message.',
            pickSlot: 'Please choose a date and time for the consultation.',
            weekday: 'Consultations are only available on working days. Please choose another date.',
            autoresponse: 'Thank you for your enquiry! We have received your message and will get back to you soon. If you requested a consultation, we will confirm the time by email. — RDD Software'
        },
        it: {
            sending: 'Invio in corso…',
            success: 'Grazie! La richiesta è stata inviata, ti risponderemo al più presto.',
            successMeeting: 'Grazie! La richiesta è stata inviata. Confermeremo l\'orario della consulenza via e-mail.',
            error: 'Non è stato possibile inviare la richiesta per un errore tecnico. Riprova o scrivi a info@rdd.software.',
            required: 'Inserisci nome, un indirizzo e-mail valido e un messaggio.',
            pickSlot: 'Scegli data e orario della consulenza.',
            weekday: 'Le consulenze sono possibili solo nei giorni feriali. Scegli un\'altra data.',
            autoresponse: 'Grazie per la richiesta! Abbiamo ricevuto il tuo messaggio e ti risponderemo al più presto. Se hai richiesto una consulenza, confermeremo l\'orario via e-mail. — RDD Software'
        },
        de: {
            sending: 'Wird gesendet…',
            success: 'Vielen Dank! Ihre Anfrage wurde gesendet, wir melden uns in Kürze.',
            successMeeting: 'Vielen Dank! Ihre Anfrage wurde gesendet. Den Beratungstermin bestätigen wir per E-Mail.',
            error: 'Die Anfrage konnte wegen eines technischen Fehlers nicht gesendet werden. Bitte versuchen Sie es erneut oder schreiben Sie an info@rdd.software.',
            required: 'Bitte geben Sie Ihren Namen, eine gültige E-Mail-Adresse und eine Nachricht ein.',
            pickSlot: 'Bitte wählen Sie Datum und Uhrzeit für das Gespräch.',
            weekday: 'Beratungsgespräche sind nur werktags möglich. Bitte wählen Sie ein anderes Datum.',
            autoresponse: 'Vielen Dank für Ihre Anfrage! Wir haben Ihre Nachricht erhalten und melden uns in Kürze. Falls Sie ein Beratungsgespräch angefragt haben, bestätigen wir den Termin per E-Mail. — RDD Software'
        }
    };

    const meetingBox = document.getElementById('cf-meeting');
    const meetingFields = document.getElementById('cf-meeting-fields');
    const dateInput = document.getElementById('cf-date');
    const timeSelect = document.getElementById('cf-time');
    const status = document.getElementById('cf-status');
    const submit = form.querySelector('button[type="submit"]');

    function lang() {
        const l = html.getAttribute('lang');
        return TEXT[l] ? l : 'en';
    }

    function t(key) {
        return TEXT[lang()][key];
    }

    function pad(n) {
        return String(n).padStart(2, '0');
    }

    function isoDate(d) {
        return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
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

    /* consultation slots: working days, 09:00-16:00, 30 minutes */
    for (let m = FIRST_SLOT; m <= LAST_SLOT; m += MEETING_MINUTES) {
        const value = pad(Math.floor(m / 60)) + ':' + pad(m % 60);
        const option = document.createElement('option');
        option.value = value;
        option.textContent = value;
        timeSelect.appendChild(option);
    }

    const today = new Date();
    const min = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    const max = new Date(today.getFullYear(), today.getMonth(), today.getDate() + DAYS_AHEAD);
    dateInput.min = isoDate(min);
    dateInput.max = isoDate(max);

    meetingBox.addEventListener('change', function () {
        meetingFields.hidden = !meetingBox.checked;
    });

    function showStatus(message, isError) {
        status.textContent = message;
        status.classList.toggle('is-error', !!isError);
        status.hidden = false;
    }

    function isWeekend(value) {
        const parts = value.split('-').map(Number);
        const day = new Date(parts[0], parts[1] - 1, parts[2]).getDay();
        return day === 0 || day === 6;
    }

    function calendarLink(data) {
        const params = new URLSearchParams({
            s: data.date + 'T' + data.time,
            d: String(MEETING_MINUTES),
            n: data.name,
            e: data.email,
            c: data.company,
            p: data.type
        });
        // in the fragment, so the details never reach a web server's logs
        return CALENDAR_PAGE + '#' + params.toString();
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
            message: fields.namedItem('message').value.trim(),
            meeting: meetingBox.checked,
            date: dateInput.value,
            time: timeSelect.value
        };

        if (!data.name || !data.message || !emailInput.checkValidity() || !data.email) {
            showStatus(t('required'), true);
            return;
        }

        if (data.meeting) {
            if (!data.date || !data.time || data.date < dateInput.min || data.date > dateInput.max) {
                showStatus(t('pickSlot'), true);
                dateInput.focus();
                return;
            }
            if (isWeekend(data.date)) {
                showStatus(t('weekday'), true);
                dateInput.focus();
                return;
            }
        }

        let slot = 'Ne';
        let subject = 'Novi upit s rdd.software: ' + data.name;
        if (data.meeting) {
            const parts = data.date.split('-');
            slot = parts[2] + '.' + parts[1] + '.' + parts[0] + '. u ' + data.time + ' (' + MEETING_MINUTES + ' min, hrvatsko vrijeme)';
            subject = 'Konzultacije ' + parts[2] + '.' + parts[1] + '. u ' + data.time + ': ' + data.name;
        }

        const payload = {
            _subject: subject,
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
            'Konzultacije': slot,
            'Dodaj u kalendar': data.meeting ? calendarLink(data) : '-',
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
                meetingFields.hidden = true;
                showStatus(data.meeting ? t('successMeeting') : t('success'), false);
                if (typeof window.gtag === 'function') {
                    window.gtag('event', 'generate_lead', { method: data.meeting ? 'consultation' : 'contact_form' });
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

    translate();
    document.addEventListener('rdd:langchange', translate);

})(document.documentElement);
