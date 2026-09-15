# Backend migration testing

Download the **Setup.exe** from a staging prerelease in
[the fork’s releases](https://github.com/Jamesllllllllll/rock-buddy-app/releases).
Install it and open **Rock Buddy Staging**. No command-line flags or developer tools
are required; RockSniffer and its .NET runtime are bundled. The preview is unsigned.

The staging installer has a separate app identity, installation, settings, and browser
session. It always connects to `https://rock-buddy-site-staging.rock-buddy.workers.dev`
and rejects overrides to production/local. It does not offer production updates.
Close regular Rock Buddy before testing so only one app monitors Rocksmith.

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
