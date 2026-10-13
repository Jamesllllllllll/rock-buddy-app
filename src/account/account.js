'use strict';

async function main() {
    const version = await getVersion();
    document.title = 'Rock Buddy v' + version;

    const authData = JSON.parse(sessionStorage.getItem('auth_data'));

    const accountInfo = await getAccountInfo(authData);
    if (!accountInfo) {
        return;
    }

    document.getElementById('username').innerText = accountInfo['username'];
    document.getElementById('email').innerText = accountInfo['email'];
}

main();