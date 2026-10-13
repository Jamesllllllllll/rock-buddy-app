'use strict';

function usernameWaitMessage(seconds) {
    if (seconds >= 86400) {
        const days = Math.ceil(seconds / 86400);
        return `You can change your username in ${days} ${days === 1 ? 'day' : 'days'}.`;
    }
    const minutes = Math.ceil(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const remaining = minutes % 60;
    return `You can change your username in ${hours} ${hours === 1 ? 'hour' : 'hours'} ${remaining} ${remaining === 1 ? 'minute' : 'minutes'}.`;
}

async function refreshUsernameWait() {
    const authData = JSON.parse(sessionStorage.getItem('auth_data'));
    const info = await getAccountInfo(authData);
    const seconds = info?.username_change_wait_seconds;
    // Older PHP backends do not expose the cooldown; keep their existing form behavior.
    if (!Number.isFinite(seconds) || seconds <= 0) return;
    const deadline = performance.now() + seconds * 1000;
    const message = document.getElementById('username_wait');
    const submit = document.getElementById('submit_username');
    const update = () => {
        const remaining = Math.max(0, (deadline - performance.now()) / 1000);
        submit.disabled = remaining > 0;
        message.textContent = remaining > 0 ? usernameWaitMessage(remaining)
            : 'Warning: You can only change your username once every 30 days.';
        return remaining;
    };
    update();
    const timer = setInterval(() => { if (update() === 0) clearInterval(timer); }, 1000);
    window.addEventListener('pagehide', () => clearInterval(timer), { once: true });
}

async function requestUsernameChange(newUsername, password) {
    const authData = JSON.parse(sessionStorage.getItem('auth_data'));

    const host = await api.getHost();
    const response = await post(host + '/api/account/change_username.php', {
        auth_data: authData,
        new_username: newUsername,
        password: password
    });

    if ('error' in response) {
        api.error(response['error']);
        return false;
    }

    return response['success'];
}

async function changeUsername(event) {
    // Prevents the form from being immediately cleared
    event.preventDefault();

    const newUsername = document.getElementById('new_username').value;
    const password = document.getElementById('password').value;

    // Make sure the new username is valid
    if (!validateUsername(newUsername)) {
        document.getElementById('new_username').value = '';
        document.getElementById('password').value = '';
        return;
    }

    const status = await requestUsernameChange(newUsername, password);
    if (!status) {
        document.getElementById('password').value = '';
        return;
    }

    api.info('Username changed successfully.');
    history.back();
    return;
}

async function main() {
    const version = await getVersion();
    document.title = 'Rock Buddy v' + version;
    await refreshUsernameWait();
}

main();
