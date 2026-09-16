# Public 1.11.0 staging compatibility test

This branch starts at the owner's `v1.11.0` release. The only application change is
allowing `https://rock-buddy-site-staging.rock-buddy.workers.dev` in the startup
page's Content Security Policy. Gameplay, account behavior, RockSniffer, version,
and dependencies remain those of the public release. Multiplayer and the newer
staging app's changes are not included.

The Windows ZIP is assembled from the checksum-verified original release.
Packaging checks every file inside `app.asar`; only `src/index.html` may differ.
The executable and bundled RockSniffer are copied from that release unchanged.
CI checks Windows startup, backend selection, and a staging API request under
the revised policy. Gameplay and real-account acceptance remain manual checks.

1. Download the ZIP from this fork's **Public 1.11.0 — staging compatibility**
   prerelease and extract the whole ZIP into a new folder.
2. Close every other Rock Buddy/RockSniffer instance, including the newer staging app.
3. Run **Start-Staging.cmd** inside the extracted folder. Use this launcher every
   time; opening `rock-buddy.exe` directly still selects production.
4. In DevTools, `await window.api.getHost()` must return
   `https://rock-buddy-site-staging.rock-buddy.workers.dev`. The title remains 1.11.0.
5. Sign in with a staging account. Check Profile, Search, Rank, loaded-song history,
   one verified Lead/Rhythm play, Score Attack, and restart retrieval.

This ZIP does not install over either existing app. However, the public app's
settings behavior is unchanged: it uses the regular Rock Buddy settings, rather
than the newer staging app's separate settings. Use a Windows user with no
production Rock Buddy settings, or back up `%APPDATA%\rock-buddy` while the app is
closed before testing. There is no profile-import confirmation in this version.
The original RockSniffer runtime requirements also remain unchanged.

No relay, hosts-file change, or security-disabling flags are needed. This is a
minimally modified compatibility build, not an unmodified-installer test. Report
the confirmed host, account, song/arrangement, and results. Full cutover acceptance
also requires imported owner data, load checks, backups and domain coordination.
