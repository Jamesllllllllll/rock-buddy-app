# Public 1.11.0 rehearsal compatibility test

This temporary test package connects to:
`https://rock-buddy-site-rehearsal.tntmusicstudios-c64.workers.dev`

The rehearsal backend starts in maintenance with an empty database. A maintenance
message is expected until the fresh database import is verified and testing opens.
It does not connect to the existing synthetic staging database.

1. Download and extract the whole ZIP into a new folder on Windows.
2. Close other Rock Buddy and RockSniffer instances.
3. Back up `%APPDATA%\rock-buddy` while the app is closed. This public release uses
   the regular app's settings; the ZIP does not install over the app, but it can
   change saved credentials/settings. Keep the backup outside the extracted folder.
4. Run `Start-Rehearsal.cmd` every time. Opening `rock-buddy.exe` directly still
   selects production. In DevTools, `await window.api.getHost()` must return the
   rehearsal URL above; the version remains 1.11.0.
5. Once the import is ready, check the existing session before signing in again.
   Then check profile, search, rankings, a verified gameplay score, and restart.
   Record account, song/arrangement, and results without sharing API tokens.
6. After testing, close the app before restoring the saved production settings.
   Keep the original backup until the normal production app works again.

The ZIP uses the checksum-verified original Windows release, including its original
RockSniffer. Packaging verifies every file in `app.asar`: only the startup page's
Content Security Policy changes to allow the rehearsal address. There are no
security-disabling flags, relay, hosts-file changes, or IP restrictions.

Windows CI checks startup, version, selected backend, and the maintenance response
under the updated policy. Login sessions, gameplay, and imported-data correctness
still require manual rehearsal. This is a minimally modified compatibility build,
not a new production release. The rehearsal backend and database will be removed
after acceptance; test writes are not copied to production.
