# Backend migration testing

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

Acceptance: confirm the original once, restart/login and check it needs no new
confirmation. Select another profile in Config: decline and verify no saved history
imports, then play a verified run. Log out/in, approve the alternate for this login,
and confirm history imports. Returning to the original must not prompt. Repeat on
another PC if available; changing computers must retain the server-side original.

1. Log in with `FixtureLead` / `Synthetic Rock Buddy password!`, or create a staging
   account using an approved test inbox. Production accounts are not imported.
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

## Remaining Windows walkthrough

Lead/Rhythm, lower-score preservation, unverified-to-verified replacement, restart
retrieval, Hard Score Attack, profile totals, and competitive ranking updates have
passed. James has no bass; real Bass gameplay needs another tester and remains open.

1. **Master Score Attack:** use a Lead/Rhythm chart with Master available. Finish
   the run, then select Game Mode → Score Attack, the played Path, and Difficulty →
   Master in Sniffer/Search. Compare the numeric score, restart, and retrieve it
   again. Hard must retain its separate result. If Master is unavailable, record
   that prerequisite rather than counting the test as passed.
2. **Fresh account/activation:** Account → Logout → Sign Up. Use an unused test
   username and an approved inbox, keeping gameplay fixtures unchanged. Choose a
   unique password with uppercase/lowercase letters, a number, and a symbol; the
   desktop requires at least eight characters and no spaces. Sign in after signup,
   activate using the staging email link within ten minutes, then use the activation
   page's homepage link. If the email address is already registered, stop and
   identify that account instead of creating duplicates.
3. **Profile/settings:** configure the new account's Steam/Rocksmith profiles,
   play one full Learn A Song run with Sniffer already open, and record its verified
   result. Save a Twitch username on Profile, restart, and verify the field, score,
   and Config selections persist. Search by artist/title and check the chart/path;
   an unrelated query should give an empty result without an error.
4. **Username change:** Account → Username → Change. First submit a wrong current
   password once: it must reject. Then change to an unused username with the correct
   password. Log out/in with the new name and confirm the same scores/settings.
   Attempt a second unused name: the 30-day cooldown should reject it. Keep the
   renamed test account; do not rename a shared fixture.
5. **Password change:** Account → Password → Change. Test mismatched confirmation,
   then submit matching new values with the correct current password. Log out;
   the old password must fail and the new password must work, retaining scores.
   The original form's heading incorrectly says Change Username; use its password
   fields. Record this existing copy issue separately from backend failures.
6. **Password reset:** log out, enter the current username/email on Login, then
   click Forgot Password. Open the staging link in the received message within
   ten minutes, choose a new password, and log in. Check the previous password
   fails and the new one works. Reusing the consumed reset link must be rejected.
7. **Email change:** only after a second inbox is approved for staging delivery,
   use Account → Email → Change, enter that address and the current password, and
   reactivate through the new message. Log in with the new email and confirm scores
   remain; the old email must no longer authenticate. Do not change to an unapproved
   inbox: staging mail is intentionally restricted.
8. **Connection loss:** while idle, disconnect Windows networking and try Search;
   record any error or stuck UI. Reconnect, search again, and restart if necessary.
   Separately, on a disposable staging run, disconnect before the song finishes and
   reconnect after the result. Record the behavior: a local verified indicator does
   not prove upload, and this client does not automatically retry verified scores.
   Use a chart with no prior verified score for that account. Stop the app after the
   result to keep the observation stable; check persistence after reconnecting, then
   verify a subsequent fully online run saves. Do not treat the offline run as a
   guaranteed recoverable score.
9. **Installer isolation:** close staging, open regular Rock Buddy, and confirm its
   original login/settings remain. Close it before reopening staging. Reinstall the
   same staging Setup.exe over the existing installation (no uninstall) and confirm
   staging login/settings/scores survive. This checks reinstall, not an automatic
   updater or compatibility of the released desktop with the new backend.

Report the step, account name, chart/path/mode, displayed result or exact error,
and time/timezone. Backend load/security checks, backup restoration, imported-account
acceptance, and released-client compatibility are separate engineering work. The
desktop auto-updater is not implemented and cannot yet be acceptance-tested.

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

The production hostname and minimum API version (`1.10.3`) remain unchanged. Prove
current-client compatibility before requiring a desktop update; the updater need
not block a compatible backend migration. Installer settings preservation is separate
from the decision to bridge legacy server sessions or require a new sign-in.
