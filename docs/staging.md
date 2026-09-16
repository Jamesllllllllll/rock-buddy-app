# Backend migration testing

Current priority (September 16): complete acceptance and cut over the TypeScript
backend while keeping the existing public desktop working at `rock-buddy.com`.
Multiplayer is on hold. New profile-observer integration, automatic updates, and
desktop polish are separate improvements, not prerequisites for a compatible
backend launch. The public 1.11.0 behavior still needs compatibility acceptance using the
CSP-only test copy below; beta13 acceptance alone does not establish that result.

Download the **Setup.exe** from a staging prerelease in
[the fork’s releases](https://github.com/Jamesllllllllll/rock-buddy-app/releases).
Install it and open **Rock Buddy Staging**. No command-line flags or developer tools
are required; RockSniffer and its .NET runtime are bundled. The preview is unsigned.

The staging installer has a separate app identity, installation, settings, and browser
session. It always connects to `https://rock-buddy-site-staging.rock-buddy.workers.dev`
and rejects overrides to production/local. It does not offer production updates.
Close regular Rock Buddy before testing so only one app monitors Rocksmith.

Sniffer initializes missing account settings automatically when exactly one valid
Rocksmith save is found in the default Steam userdata folder or a previously browsed
folder. Existing account selections are preserved. Multiple eligible profiles or
missing saved files require a choice in Config; visiting Config does not choose an
arbitrary first profile. A nonstandard Steam folder may need Browse once.

On first use, confirm the original Rocksmith profile linked to the account. The
backend remembers its Steam/profile identity across PCs. The original profile
imports automatically; a different selected save requires confirmation per login.
“Import this session” never replaces the original link. “Skip import” blocks saved
mastery, streaks, play counts, and Score Attack history while allowing new verified
gameplay and catalog/leaderboard use. Logging out or restarting clears that decision.
This checks the selected import save; RockSniffer does not report the active in-game
profile. Importing Learn A Song history stays **unverified** and cannot replace a
verified result. Separate players should use separate Rocksmith profiles.

Pending the next installer: RockSniffer pins the combined library from upstream
[multiplayer PR #1](https://github.com/tnt-coders/RockSnifferLib/pull/1) and
[profile-observation PR #2](https://github.com/tnt-coders/RockSnifferLib/pull/2),
through our RockSniffer and RockSnifferLib forks' `buddy/experimental-readers`
branches. The app's `prep/experimental-readers` branch carries this dependency
update for Windows CI without publishing an installer. CI runs both sets of library
tests. Both features remain disabled by default and the app does not yet supply a
profile catalog or consume the new snapshots; account matching and upload behavior
are unchanged. Profile integration
must observe selection before game login and handle unknown identity (including
late attachment), duplicate names, and interrupted observations. This experimental
inference is not a persistent active-profile pointer. See the library's
[integration notes](../RockSniffer/RockSnifferLib/RSHelpers/Profiles/README.md).
Multiplayer snapshots provide separate player counters/results, not player account
ownership; do not route them through existing single-player submissions. See the
[multiplayer notes](../RockSniffer/RockSnifferLib/RSHelpers/Multiplayer/README.md).

Acceptance: confirm the original once, restart/login and check it needs no new
confirmation. Select another profile in Config: decline and verify no saved history
imports, then play a verified run. Log out/in, approve the alternate for this login,
and confirm history imports. Returning to the original must not prompt. Repeat on
another PC if available; changing computers must retain the server-side original.

1. Log in with `FixtureLead` / `Synthetic Rock Buddy password!`, or create a staging
   account using an inbox you control. Production accounts are not imported.
2. In Config, select Steam data/profile and Rocksmith profile; turn Lurk Mode off.
3. Open Sniffer before a song. Confirm detection, finish a normal verified run,
   and compare mastery/streak with the leaderboard. Avoid charts versioned `test`.
4. Replay with a lower result, refresh, and restart: the best verified score should
   persist without duplication. Allow a few minutes for overall rankings.
5. Test another arrangement/custom chart, Score Attack, search, and profile views.
   Record the build, song/arrangement, result, error, and time/timezone for failures.

The verified-score path has no durable replay queue. Test connection failures and
plan a gameplay/submission pause during backend cutover. The
[site migration plan](https://github.com/Jamesllllllllll/rock-buddy-site/blob/feat/typescript-foundation/docs/migration-plan.md)
tracks backend acceptance; Windows gameplay remains a manual gate.

## Windows acceptance

Confirmed through September 16:

- Lead/Rhythm verified gameplay, lower-score preservation, unverified-to-verified
  replacement, restart retrieval, Hard/Master Score Attack, profile totals and rankings.
- James confirms signup/activation, username change, password change, email change,
  password reset, and profile/settings/search all work. These are user-reported
  workflow passes; a build/account and individual negative-case results were not
  recorded in that confirmation.

James has no bass; real Bass gameplay still needs another tester. The new username
countdown's companion backend was deployed September 16 (site a662906); it still
requires a new app build. Successful
username-change testing does not establish acceptance of that pending enhancement.

Reinstallation and a subsequent verified upload passed on the Windows test PC.
Bury Me's Unknown history fields reflect absent save data, as confirmed below. Use the published
[staging build 13](https://github.com/Jamesllllllllll/rock-buddy-app/releases/tag/staging-35028296732-1)
installer, not a source-development launch. If that PC has no staging installation,
install it, sign in, configure the correct save, and establish the baseline first.
Close regular Rock Buddy and any other staging instance using the same test account.
Keep test-account changes separate from production accounts.

### 1. Connection loss while idle

September 16 observation from James on `1.11.0-beta13`: Account shows
`TypeError: Failed to fetch`, then `Failed to get account info`, with blank account
fields. Profile remains at Loading with blank Twitch input; Rank has empty podiums;
Search gives no visible result/error. Config remains usable. Selecting a song in
Sniffer produces repeated failed `sniffer_sync.php` requests, hides the song behind
Failed to fetch, and leaves Snorting data displayed. Offline error handling fails
acceptance. James subsequently confirmed all pages recovered after reconnection
without restarting the app. Recovery passes; offline feedback/retry handling does
not. Online submission recovery and reinstall persistence are confirmed below;
the post-reinstall verified upload also passed.

Source comparison with public v1.11.0 confirms the same defects: the TypeScript
POST helper lets fetch rejection escape, leaving page loads unfinished. Account's
separate JavaScript helper reports one error and its caller adds another. Sniffer
resets its sync state only after the awaited request returns, so a rejection can
retry on its 100 ms refresh loop. These are existing desktop issues, not established
backend regressions. Track a shared connection-error state, bounded retries, and
preserved local gameplay display as a separate desktop fix. Do not claim server
data was erased because its offline fields are blank. Revisit the migration impact
if later testing produces wrong/duplicate writes or another recovery failure.

1. While online, confirm Search works and note the account/build.
2. Turn off Wi-Fi and unplug Ethernet as applicable, keeping Rock Buddy open.
   Search for a different song and note the exact error or behavior. An already
   displayed/cached leaderboard is not proof of connectivity.
3. Restore connectivity and repeat Search. Check Sniffer reconnects with the same
   account and settings. Record whether recovery was automatic, needed a refresh,
   or required an app restart. A crash, indefinite spinner, or unexpected logout
   needs investigation.

### 2. Connection loss during score submission

September 16, approximately 12:38 EDT (16:38 UTC), beta13: James disconnected
during Road Train by King Gizzard & The Lizard Wizard. The local live feed continued
through completion, with no connection warning; the stats area showed `*snort*`
and an unverified badge. He closed Rock Buddy offline, then reconnected while
leaving it closed. Read-only staging inspection before reopening found song 379
with no Learn A Song scores on any of its four arrangements. User 10478
(`jimmy_pants`) has four stats rows with null play counts and last-played values.
James confirmed Rock Buddy account `jimmy_pants`, Rhythm (arrangement 1996),
Rocksmith profile "james"; "crystal cat" is his Steam account. There is no persisted
LAS result for this test at this checkpoint.

After reopening and selecting the arrangement, James reported no visible score.
A subsequent read-only D1 check confirmed Rhythm now has an unverified score:
mastery 84.7185%, streak 103, play count 1, raw last-played value
`2026-09-16 12:41:04` (the stored value has no timezone). This is consistent with
saved-history import after reconnecting, not recovery of a verified upload. The
score display is also confirmed: James had been viewing Lead and saw the
unverified score after switching to Rhythm. James then completed a fully online
replay and saw a verified result. Read-only D1 inspection confirmed mastery
88.2931%, streak 89, verified 1, play count 2. Normal online uploads recovered;
James subsequently confirmed the result remained visible after reinstallation.
Do not infer why the original local badge was unverified.

1. Choose a disposable Lead/Rhythm Learn A Song test, with no existing verified
   score for this account/arrangement. Record its current leaderboard state.
2. Start online with Sniffer running and Lurk Mode off. Disconnect Windows networking
   midway through the song, well before it finishes; finish without pausing or
   changing speed. Leave networking off through results and note the app's message.
3. Close Rock Buddy while still offline, then reconnect. Before reopening it, inspect
   staging D1 (or ask James's assistant to check) for the exact account/song/path.
   This preserves evidence before another local-history sync can change the row.
4. Reopen, check the leaderboard, and play a fully online run. Confirm that run
   uploads and remains after restarting.

There is no durable verified-score retry queue. The offline run may be absent or
later appear as an unverified save import; do not report it as a recovered verified
upload without server evidence. A local verified badge describes the performance,
not upload success. Log this limitation for the cutover write-pause instructions.
An online baseline followed by a successful online run demonstrates recovery, not
protection against losing the offline verified result.

### 3. Reinstall and isolation

September 16, beta13: James confirmed the reinstall checks look good, including
retained login/configuration and the existing verified score. The subsequent
Bury Me by Smashing Pumpkins, Rhythm play uploaded successfully: D1 confirms user
10478, song 394, arrangement 2045, mastery 56.4835%, streak 47, verified 1.
Play count and last played show Unknown because the saved entry lacks both
`PlayedCount` and `DateLAS`. James supplied the full entry from a fresh read of
profile James after exiting Rocksmith normally: the exact Rhythm ID matches and
AccuracyGlobal is 0.564835 with streak 47, but neither history field exists. Road
Train in the same save has PlayedCount 2 and DateLAS. The desktop omits the absent
fields, and staging accepts the sync (lurk_mode false, HTTP 200, success true),
preserving nulls as the PHP implementation does. This is a source-data limitation,
not evidence of a failed backend write. Why Rocksmith omitted those fields remains
unknown; no migration fix is indicated by this case. Do not invent a play count
or timestamp from verified submissions. Reinstall and subsequent upload passed.
Upstream [issue #5](https://github.com/tnt-coders/rock-buddy-app/issues/5) reports
the same absent fields for other charts; it was closed May 11, 2023, citing the
verified-score merge 03b5bce. Missing history is a known historical scenario.

Chart repair is deferred at James's request; it is not a backend migration gate.
Bury Me's saved MasteryLast/MasteryPeak are both 1 despite
AccuracyGlobal 0.564835. This suggests chart compatibility issues, but does not
prove the cause. The [official CFSM guide](https://customsforge.com/topic/51771-customsforge-song-manager-official-guide-2019/)
documents incorrect play counts without Dynamic Difficulty and repairs for DD and
the 100% mastery bug. The cause remains unconfirmed for this chart. No repair or
independent Rock Buddy play tracking is planned as part of this migration.
Whether production Rock Buddy is installed and
its settings isolation was checked has not been explicitly confirmed.

1. On this same Windows PC, record the staging username, Steam/Rocksmith selections,
   a harmless preference (such as preferred path), and one persisted score.
2. Fully close staging and run the exact same Setup.exe over the existing install.
   Do not uninstall or delete its settings. This tests an in-place reinstall, not
   migration of settings from another PC or an automatic updater.
3. Open staging. Confirm the login, configuration and preference remain, and the
   score is retrievable from the server. Complete one online score submission.
4. If regular Rock Buddy is already installed on this PC, close staging and open
   regular Rock Buddy: its login/configuration must be unchanged. Close it and
   reopen staging to confirm separation. If it is not installed, mark this isolation
   check not tested; do not count it as a pass.

Report each result, account/build, song/arrangement, exact error, and local time with
its timezone. Never share passwords or API keys. Backend load/security checks,
backup restoration, imported-account acceptance, and actual public-installer
compatibility are separate engineering gates. After these Windows checks, continue
with the five backend preparation/cutover steps in the site migration plan.

## Public desktop compatibility before cutover

Use the **Public 1.11.0 — staging compatibility** ZIP from
[the tested release](https://github.com/Jamesllllllllll/rock-buddy-app/releases/tag/public-staging-35131499202-1).
The separate `test/public-1.11.0-staging` branch starts at the owner's `v1.11.0`;
its only application change adds the staging origin to the startup Content
Security Policy. It includes none of beta13's behavior changes or experimental
RockSniffer readers. The local checkout is `../rock-buddy-app-public-staging`.

Packaging preserves the released executable, RockSniffer, and dependencies.
It checks the original installer SHA-256 and compares every file in the repacked
archive: only `src/index.html` may differ. Windows CI must pass startup, backend
selection, and a staging API request under the revised policy before publishing.
This is a minimally modified compatibility build, not an unmodified-installer
acceptance result. Real gameplay and restart acceptance remain pending.
Windows packaging and the startup/CSP/API smoke check passed on September 16
([CI run](https://github.com/Jamesllllllllll/rock-buddy-app/actions/runs/35131499202)).

1. Extract the entire ZIP into a new folder. Close all other Rock Buddy/RockSniffer
   instances. The ZIP does not install over either existing app.
2. Run **Start-Staging.cmd** inside the extracted folder. Use it for every launch;
   opening `rock-buddy.exe` directly still selects production.
3. Before signing in, run `await window.api.getHost()` in DevTools. It must return
   `https://rock-buddy-site-staging.rock-buddy.workers.dev`. The title stays 1.11.0.
4. Sign in with the staging account, configure the intended Steam/Rocksmith save,
   and check Profile, Search, Rank, loaded-song history, verified Lead/Rhythm,
   Score Attack, and score retrieval after restarting through **Start-Staging.cmd**.
5. Report version, confirmed host, account, song/path, and results.

The public app's settings behavior is preserved: this copy shares regular Rock
Buddy settings, whereas beta13 has separate staging settings. Use a Windows user
without production Rock Buddy settings, or back up `%APPDATA%\rock-buddy` while
closed. The public app has no profile-import confirmation and retains its original
RockSniffer runtime requirements.

The unmodified public startup policy blocks workers.dev even when `getHost()`
returns that URL, causing “Failed to fetch.” The CSP-only copy replaces the
previous local-relay test approach. No relay, hosts-file change, or disabled
browser security is needed. This hostname restriction does not apply at the
existing `rock-buddy.com` after cutover.

## Building and publishing

The Windows Build workflow tests and compiles every branch/PR. In James’s fork,
pushes or manual runs on `feat/staging-backend` additionally publish RockSniffer
self-contained, build NSIS, install/launch the packaged app, check staging routing
and production-settings isolation, and upload installer/checksum artifacts. Only
successful builds publish a uniquely tagged prerelease; PRs cannot publish.

`electron-builder.staging.cjs` supplies the separate identity and embedded backend;
`npm run package:staging` packages already-built assets and `.generated/rocksniffer-staging`.
The existing production release command/configuration remains the owner's workflow.

For source development: `npm run start:staging` selects staging and `npm run start:local`
selects a local Worker. `npm start` still selects production. Named development modes
use separate stores/sessions. Custom origins require matching CSP entries. See the
site's [fixture configuration](https://github.com/Jamesllllllllll/rock-buddy-site/blob/feat/typescript-foundation/docs/development.md#local-account-testing).

## Desktop updates

### Implemented

[src/main.js](../src/main.js) checks `tnt-coders/rock-buddy-app` releases on window
creation, respects the user's beta preference, and shows **Update Available**.
**Proceed to download page** opens GitHub; users download/run the installer manually.
Production has no automatic download/install/restart, progress, periodic check, or manual
Check for Updates control. `electron-updater` is not installed. Release metadata
files alone do not enable an updater.

### Planned, not implemented

Retain the requested updater work as a separate desktop improvement:

1. Add `electron-updater` for the existing per-user NSIS installer, preserving app
   identity/settings. Offer download/progress, install-and-restart, and Later;
   startup/periodic/manual checks must fail gracefully and never interrupt a song.
2. Use explicit official stable/beta feeds, validated versions, and no downgrades.
   Keep staging/local launches isolated from production updates/restarts. Preserve
   `on-latest-beta-version`, which currently affects RockSniffer polling behavior.
3. Agree publication/signing access with the owner and add gated Windows release CI
   that publishes installers and matching update metadata together. Never embed
   publication credentials in the app. Staging has its own CI prerelease workflow;
   production `npm run release` is a local packaging
   command that cleans ignored files; it is not a CI publication pipeline.
4. Test installed version A updating to B on Windows: Later, interrupted download,
   retry, install/restart, retained login/settings/addons, gameplay, and score submission.

Existing installations discover only the owner's release repository. Ship the first
updater-capable installer there as a newer owner-approved stable release; users
install that one manually. Later updates can use the new flow. Test both PHP and
Workers compatibility before distributing it ahead of backend cutover.

For the backend-first migration, keep existing public installs working and defer
the optional updater release. If an advance update is later chosen, test it against
both backends and allow adoption time. The current beta13 installer is staging-only;
its Sniffer startup also requires `/api/account/rocksmith_profile.php`, which the PHP
backend does not provide. It cannot be promoted unchanged into an early production
release. Resolve that dependency or defer the new-backend-only feature until after
cutover. Existing installed versions should remain supported at `rock-buddy.com`
while users adopt the update; prove this with the actual public installer.

The production hostname and minimum API version (`1.10.3`) remain unchanged. Prove
current-client compatibility before requiring a desktop update; the updater need
not block a compatible backend migration. Installer settings preservation is separate
from the decision to bridge legacy server sessions or require a new sign-in.
