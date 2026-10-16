# Next desktop release

Work on `feat/desktop-release-prep`. The public desktop remains 1.11.0.
This branch prepares the next public release; it is not release-approved yet.
Experimental multiplayer/profile readers are excluded; RockSniffer retains the
public release's recorded submodule commits.

## Overview for TNT

- Replaces the separate HTML screens with one React app while preserving the
  familiar layout. Sniffing continues while browsing other screens; Config still
  pauses it while settings or profiles change.
- Keeps recent page data visible during refreshes and remembers Search between
  visits. Adds loading states, bounded connection retries, and protection against
  saving account/profile forms whose data did not load.
- Adds automatic update downloads with **Restart now** and **Restart later**.
  Users on 1.11.0 must manually install this first update; later releases can be
  installed from inside the app. Restarting to install is blocked during gameplay
  and pending API requests.
- Adds a native Support page for one-time/monthly PayPal support, using the
  website's checkout. PayPal approval still opens in the browser.
- Remembers window size/position, adds Sniffer column controls, profile discovery
  and history-import confirmation, username-change countdowns, and updated Team
  and copyright information.
- Shows verified 100% arrangement counts only when the backend supplies them.
  That backend change is separate and is not required to release this desktop.

This is a substantial renderer change, so earlier tests of the old Beta UI do not
replace testing this candidate. Profile confirmation protects history imports; it
does not identify the active player inside Rocksmith. Failed verified uploads are
reported but are not saved in a durable retry queue. Neither limitation should be
advertised as fixed by this release.

## Release sequence

1. Review the draft PR and pass its Windows tests/build. Keep it draft until the
   acceptance checks below are recorded against the actual candidate. A merge or
   push does not publish a release or build an installer.
2. Manually build a Beta installer from the reviewed branch with a version higher
   than the existing Beta. Test it against rehearsal using the checklist below,
   including gameplay on other tabs, account switching, connection loss, window
   restoration, and PayPal sandbox. Rehearsal scores do not reach production.
3. Build and deliberately publish a higher Beta to the separate test update feed.
   Prove A → B download, Restart later, install/restart, settings retention and a fresh
   score upload on Windows. Automated updater tests alone do not prove this.
4. Resolve failures, record results, then mark the PR ready and merge after TNT's
   review. Manually build the stable production candidate, for example 1.12.0,
   from the merged commit. Create an unpublished draft release in TNT's repo.
5. Before publishing, test that production candidate over an existing 1.11.0
   install on a Windows test machine. Check retained login/settings/addons,
   production routing and a real verified score. This is separate from Beta
   testing because Beta has its own installation and data. Record installer
   prompts; code signing is not configured. If fixes are needed, rebuild and
   repeat the affected checks before publishing.
6. Upload the installer, blockmap, latest.yml and checksums from that same build to
   the draft. Verify the version and feed assets, then publish as the latest
   stable release. Confirm 1.11.0 shows its download notification and an installed
   new version can check the official feed. Keep previous release assets available.
7. Post the announcement below with the official release page. Monitor reported
   startup, login, gameplay/upload and updater failures. Pause further releases
   if a regression appears; publish a tested higher patch version for recovery.
   The updater intentionally does not downgrade users.

The public backend is already live. This release needs no database import, domain
change, or coordinated backend downtime. Existing desktop versions can continue
using it. Do not advertise the optional verified 100% count until its backend
change is deployed and tested.

### Community announcement (publish only after release)

> A new Rock Buddy update is available! Download and run the Windows installer
> from [the release page](https://github.com/tnt-coders/rock-buddy-app/releases/latest)
> to update your existing installation. This is a one-time manual update: the new
> version downloads future updates automatically and lets you choose **Restart now**
> when you're ready, or **Restart later** to keep playing. It also keeps
> tracking while you browse other tabs (except Config), remembers your window size and position,
> and adds configurable Sniffer columns and PayPal support.

Do not promise silent installation or automatic restarts.

## Builds and storage

Pull requests and pushes to `main`/`develop` run tests and the Windows compile only.
Feature-branch pushes do not also run checks in the fork. These checks do not
package an installer, upload an artifact, create a tag, or publish a release.
The Build workflow has read-only repository permissions.

An installer requires a manual **Build → Run workflow** with `installer=beta`
and a version such as `1.12.0-beta1`. The next update test must use a higher version,
such as `1.12.0-beta2`. The job installs and checks the beta on a disposable Windows
runner, validates update-file checksums, and uploads one artifact retained for
seven days. Production packaging is also manual and requires a stable version.
Nothing publishes automatically, even after a merge.

The fork's old `feat/community-beta`, `feat/staging-backend`, and `prep/*` branches
retain manual checks only. The two `test/public-1.11.0-*` compatibility branches
retain their source, but their workflows only explain where to build the maintained
Beta. Their old automatic packaging/publication jobs are retired. Existing releases
and update-feed assets are retained. Use this branch for new desktop builds.

Upstream fork PR runs may need a maintainer's approval. TNT can open the PR's
Conversation tab and choose **Approve and run workflows** for the current commit.
Approval runs checks; it does not merge the PR or publish an installer. Until that
run is approved, explicitly run checks in the fork with:

```sh
gh workflow run build.yml --repo Jamesllllllllll/rock-buddy-app \\
  --ref feat/desktop-release-prep -f installer=none
```

Do not run that fallback when the upstream check is already running. The fork's
default branch still lacks the manual trigger, so use the CLI when GitHub does not
show Run workflow. For ongoing approvals, TNT can keep approving outside-contributor
runs or grant the contributor Write access if appropriate; no broader workflow
token permissions or access to secrets is needed for these checks.

GitHub Release assets and Actions artifacts are different storage categories.
Temporary Actions downloads expire; files deliberately attached to a release stay
until removed. Keep installers out of Git and publish only builds chosen for testing
or release. See [GitHub Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions)
and [release limits](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases#storage-and-bandwidth-quotas).

## Test environment

The Beta installer connects only to
`https://rock-buddy-site-rehearsal.tntmusicstudios-c64.workers.dev`.
It reuses the existing July database import, separate from production. On October 13,
the database had 476 accounts and 394,614 Learn a Song score rows. This is real imported
history plus beta testing, not a fresh production snapshot. No new import was performed.
Use the password valid in that snapshot, reset it in Beta, or create a test account.
Test scores/account changes will not transfer to production.

The existing Beta app identity, installation directory, settings and session are
preserved. Close normal Rock Buddy before gameplay. A source launch can use
`npm run start:beta`; building/running RockSniffer requires native Windows x64.
Local mode is available separately and does not contain the imported database.
The navigation header has no Beta badge. Test builds still use the separate Beta
installation, rehearsal backend and test update feed; test changes are discarded.

The Support header link opens a bundled desktop page with one-time/monthly choices and
an amount in USD. Values below $5 disable checkout. No iframe or remote page is
embedded. The main process retrieves the existing website form's signed state and
submits its checkout request; HTML is never rendered in the app. This preserves
current server validation and PayPal idempotency without new backend endpoints.
Retries reuse the same state. The `name="state"` input is part of this integration;
a website change that removes it will fail closed until the desktop is updated.

Beta/staging use the staging support backend and allow only sandbox PayPal approval
URLs. Production uses rock-buddy.com and allows only live PayPal approval URLs.
Only PayPal approval and subscription management open in the default browser.
Payment confirmation remains on the website's return page; opening PayPal never
marks a payment successful in the desktop. All PayPal credentials stay on the
website. Use sandbox buyer accounts for testing.

## React renderer

All screens now run inside `src/index.html`, with one React root in
`src/ui/main.tsx` and hash routes in `src/ui/App.tsx`. The header, footer, themes,
status notices, account forms, Config, Search, rankings, profiles, Sniffer, Team,
and Support are React components. Old HTML pages and DOM controllers are removed.

`SessionProvider` owns authentication. `GameplayProvider` starts one engine per
signed-in session and keeps it across page navigation. Config stops the engine
before profile/settings changes; leaving Config starts it with the new settings.
Logout stops future submissions. A request already accepted by the server cannot
be recalled. `Sniffer` preserves the verification rules and publishes immutable
snapshots through `useSyncExternalStore`; it never edits the DOM.

Remote reads ignore replies for an old screen or selection. Account writes and
checkout use explicit actions with duplicate-submit guards. Support shares the
same header and opens only PayPal approval/subscription management externally.
The preload bridge owns Electron access; backend credentials are sent by the main
process. The renderer permits HTTP connections for configured RockSniffer readers.

The profile also shows **Verified 100% scores** when the backend supplies
`verified_perfect_scores`. Counts use stored verified mastery exactly equal to 1,
exclude unverified history, and deduplicate matching note data and arrangement
names across chart versions. They count arrangements, not repeated perfect runs.
This is not a separately recorded full-combo event. The matching backend change
is local in `rock-buddy-site-admin/src/api/data.ts`; it needs release separately.
Older backends omit the field and the desktop hides this section.

`npm run build:renderer` checks TypeScript and bundles the UI on Linux without
building the Windows reader. Production packaging rebuilds with
`build:renderer:production`. Both commands clear generated `dist/` first so old
page bundles cannot ship. Ordinary pushes still do not create installers.

Automated coverage includes real React navigation, Strict Mode cleanup, stale
responses, account cooldown, score ties, support validation, updater notices,
stopping in-flight reader work, and history-import/verified-score separation.
A local Electron smoke run covers Search dialogs, Rank, Profile, Config, Support,
and cooldown using synthetic bridge responses. This does not replace real Windows
gameplay, upgrade, or PayPal sandbox acceptance below.

## Beta5 candidate

The published test build is `1.12.0-beta5`. It restores exact Width/Height controls in
Config, sets a 640 × 480 minimum window, and makes ranking cards adapt to two
columns in smaller windows. It fixes stray zeroes beside uncrowned/unverified
players and adds a Sniffer header indicator: green for tracking, orange for
waiting/paused/Lurk mode, and red for reader/setup errors. Hover or keyboard-focus
Sniffer for the explanation. Green does not confirm verification or upload success.

Keep an older Beta installed to test the automatic upgrade. Confirm Restart later,
Restart now, retained login/settings/theme, and a verified score after upgrading.
Test exact sizing and restart persistence on Windows, rankings at narrow widths,
and Sniffer status while playing, waiting, changing tabs and opening Config.
The rehearsal backend and sandbox PayPal are unchanged. This candidate is not
approval to merge or publish the production release.

## Automatic updates

Installed Windows builds check at startup and every four hours. A manual
**Check for updates** button is available inside the changelog only, using the same
guarded updater. The current version appears at the bottom left. Checks stay quiet;
downloads show a compact progress indicator in the header. Background updater
errors are recorded in the local log.
The shared header stays visible while scrolling, including when its links wrap
in a narrow window. Each theme has an opaque header background.

Clicking the installed version opens a local changelog with a 24px screen-edge
gap. Only its notes scroll; the title, close button and update check stay visible,
and the page behind it is locked until the dialog closes. `src/ui/Changelog.tsx`
contains the current build's changes and selected official release summaries.
Update the current notes when preparing a release; archive them under the released
version when starting the next release. Missing historical notes are omitted.

Once an update is downloaded, a focused in-app dialog offers **Restart now** or
**Restart later**. Escape and clicking outside do not dismiss it: choose a button.
The dialog does not pause gameplay tracking, timers or uploads. Restart later
leaves a purple **Update ready** control in the header to reopen the dialog, and
suppresses repeated prompts for that version during the current app session.
Ordinary app exit never installs an update. Restart now remains subject to the
main process's gameplay/upload checks; a blocked or failed restart leaves the
choice available with an explanation.

Production uses `tnt-coders/rock-buddy-app` releases and respects the user's beta
preference. No downgrade is allowed. The test installer uses a separate generic
feed at the fork's `desktop-beta` release and never installs production builds.
Source/local/custom-server launches cannot update themselves.

For an actual updater test, a maintainer must deliberately publish the chosen beta
installer, its `.blockmap`, and `beta.yml` to a **prerelease** tagged `desktop-beta`
in `Jamesllllllllll/rock-buddy-app`. This is not done by CI. Keep older installer
assets available while updating the feed; upload the new files first and replace
`beta.yml` last. No credentials are embedded in this public feed. An unpublished
or missing feed is logged and retried by automatic checks; it is not a working update test.

The feed now offers `1.12.0-beta5`; the older beta1 through beta4 installers
remain available. The [beta5 build](https://github.com/Jamesllllllllll/rock-buddy-app/actions/runs/38849571476)
(source `3f88dc7`) passed all 103 tests, the Windows native build, packaging,
installed startup/rehearsal routing and settings-isolation checks, and update-file
validation. The installer and blockmap digests match GitHub's uploaded assets,
and the published update manifest matches the checked build. Actions artifacts
alone are not an updater feed.

Beta5 remains connected to rehearsal, with sandbox PayPal, and preserves the
existing beta installation and settings. Precise resizing still needs Windows
acceptance; a tiled Linux window can have its dimensions controlled by Hyprland.

Leave an older Beta installed so its updater performs the upgrade. Restart the
app to check immediately; beta3 also has Check for updates in the changelog.
Windows upgrade and gameplay acceptance are still pending. The upstream PR
remains draft, and no production installer has been published.

Test A → B on Windows before public release: install A manually, retain login and
settings, publish the chosen higher B to the test feed, check/download B, choose
Restart later, restart normally without installation, then choose Restart now.
Beta1 still uses its older Check for updates / Install and restart / Later controls.
Beta2 introduces the dialog; proving that new dialog completes a real upgrade
requires a higher test version afterward, selected deliberately rather than built
on every push. Relaunch beta2 to check immediately; beta3 also offers a manual
check inside the changelog.
Verify B, retained configuration, and a new score upload. Also test interrupted
download/retry, no newer version, no downgrade, and clicking install during a song.

For public release, manually create a draft release in TNT's repo, upload the
production installer, `.blockmap`, `latest.yml` and checksums from the same build,
and publish only after acceptance. Existing 1.11.0 users see their existing download
notification and must install the first updater-capable version manually. Later
versions can download/install/restart inside the app. Signing is not configured;
Windows installer/publisher prompts still need acceptance testing.

The official release comes from `tnt-coders/rock-buddy-app`, not the fork: merge
PR #89 after acceptance, then run its manual workflow with `installer=production`
and the selected stable version. Publish the checked artifacts in that repository.
The production package already points at TNT's GitHub update feed and the live
backend. Merging runs checks only; it does not build or publish an installer.

## Acceptance before public release

- Quickly switch between Search, Profile, Rank, and Account. Initial reads show a
  placeholder; cached pages stay visible during background refreshes. Recent reads
  are reused for 15 seconds; inactive results expire after 10 minutes. Search text
  and its last submitted results survive navigation. Logout clears the in-memory
  cache and search state. New selections must never show the previous song/account.
  Test a failed refresh, retry, an account/profile edit, and a successful score
  upload. Config always rereads local settings/profile discovery; PayPal still
  checks its environment before enabling checkout.
- On Sniffer, use Columns to hide/show table fields and restore them with Show all.
  Confirm choices survive navigation/restart, stay separate between accounts,
  and leave Search's leaderboard unchanged. Check both Learn a Song and Score Attack.
- Move and resize on any page, then close immediately and reopen. Confirm exact
  size and position, including monitors left of or above the primary display.
  Repeat after logout, with maximized/minimized windows, different Windows display
  scaling, and after disconnecting a monitor. The main process saves normal bounds
  and maximized state per installation/backend; resize the window directly or enter exact Width/Height in Config and click
  Apply size. The minimum is 640 × 480. Rankings use four columns on wide windows
  and two below 960px. Card text and spacing follow the column's width, so wider
  two-column cards regain larger text. Check all themes
  at the minimum size. These are outer dimensions in display-scaled pixels; applying them
  restores a maximized window and keeps its position. Test persistence after an
  immediate close and reopen.
  Existing account dimensions are used as a fallback on the first launch. Native
  Wayland positioning is controlled by the compositor and is not a Windows test.
- Upgrade existing regular 1.11.0 to the production candidate on Windows, preserving
  login, settings, addons and install identity. This is separate from Beta upgrades.
- Confirm linking once, restart, switch accounts/profiles, decline alternate history,
  approve it, and return to the original. History is still imported per song.
  This does not establish active in-game player identity or prevent all wrong-account
  live submissions. No bulk profile upload is added.
- Verify Learn a Song Lead/Rhythm/Bass, lower-score preservation, a competing user,
  Score Attack Hard/Master, search, rankings, account edits and restart persistence.
- Disconnect while idle and during a song. The connection banner must appear when a
  request fails, retries must be bounded, and local gameplay must continue. Reconnect
  and revisit/reload pages; song sync retries after its cooldown. Failed verified
  uploads show an explicit warning and are **not durably queued or replayed**.
- Navigate between screens during a song and verify there is one reader loop,
  the live run continues, and the final score belongs to the original account.
  Enter Config, change profiles, then return to Sniffer; verify import approval
  and the new selection. Log out during a pending sync and sign in as another user.
- Verify profile editing stays unavailable if its original data could not load.
- With the new backend, verify a genuine verified 100% increases the count once;
  repeating it, importing unverified 100%, and replaying an identical chart version
  must not inflate it. Check your own profile and another player's profile.
- Complete updater A → B and PayPal sandbox one-time/monthly/cancel flows.
- Record version, account, arrangement, observed result and time for gameplay tests.
  Never put private SQL, passwords, email addresses or tokens in release artifacts.

Automated checks do not replace these Windows gameplay/update/payment checks.
No installer or public release is created merely by preparing this branch.
