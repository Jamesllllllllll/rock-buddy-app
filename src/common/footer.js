'use strict';

function updateCopyrightYear() {
    const year = String(new Date().getFullYear());
    document.querySelectorAll('[data-copyright-year]').forEach(element => {
        element.textContent = year;
    });
}

updateCopyrightYear();
window.addEventListener('focus', updateCopyrightYear);
// Keep a window left open across New Year's midnight current too.
setInterval(updateCopyrightYear, 60_000);
