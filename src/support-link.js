// Test installations always use the website's sandbox checkout, never real payments.
function supportUrl(host, hosts) {
    if (host === hosts.production) return 'https://rock-buddy.com/support';
    if (host === hosts.beta || host === hosts.staging) return hosts.staging + '/support';
    return hosts.local + '/support';
}

module.exports = { supportUrl };
