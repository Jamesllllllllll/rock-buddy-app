# Next desktop release

Work on `feat/desktop-release-prep`. The public desktop remains 1.11.0.
This branch combines profile discovery/linking, username cooldown, current-year
footers, connection handling, automatic updates, and a Support button.
Experimental multiplayer/profile readers are excluded; RockSniffer retains the
public release's recorded submodule commits.

## Builds and storage

Pushes and pull requests run tests and the Windows compile only. They do not
package an installer, upload an artifact, create a tag, or publish a release.
The Build workflow has read-only repository permissions.

An installer requires a manual **Build → Run workflow** with `installer=beta`
and a version such as `1.12.0-beta1`. The next update test must use a higher version,
such as `1.12.0-beta2`. The job installs and checks the beta on a disposable Windows
runner, validates update-file checksums, and uploads one artifact retained for
seven days. Production packaging is also manual and requires a stable version.
Nothing publishes automatically, even after a merge.

Old branches still contain their original workflows: pushing `feat/community-beta`
or `feat/staging-backend` can still package installers. Use this branch for new work.
Do not remove existing releases or overwrite other branches during preparation.

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

The Support button opens checkout in the default browser. Beta and staging open
`https://rock-buddy-site-staging.tntmusicstudios-c64.workers.dev/support`, whose
PayPal sandbox mode was checked on October 13. Production opens
`https://rock-buddy.com/support`. The website retains all PayPal credentials and
handles one-time/monthly USD support with its existing $5 minimum. No additional
PayPal secrets belong in the desktop app. Use sandbox buyer accounts for testing.

## Automatic updates

Installed Windows builds check at startup, every four hours, and on request.
A newer permitted version downloads in the background with visible progress.
The user chooses **Install and restart** or **Later**. Ordinary app exit never
installs an update. Installation is blocked during detected gameplay or an API
request, with an additional local RockSniffer check before restarting.

Production uses `tnt-coders/rock-buddy-app` releases and respects the user's beta
preference. No downgrade is allowed. The test installer uses a separate generic
feed at the fork's `desktop-beta` release and never installs production builds.
Source/local/custom-server launches cannot update themselves.

For an actual updater test, a maintainer must deliberately publish the chosen beta
installer, its `.blockmap`, and `beta.yml` to a **prerelease** tagged `desktop-beta`
in `Jamesllllllllll/rock-buddy-app`. This is not done by CI. Keep older installer
assets available while updating the feed; upload the new files first and replace
`beta.yml` last. No credentials are embedded in this public feed. An unpublished
or missing feed produces a retryable update message, not a working update test.

Test A → B on Windows before public release: install A manually, retain login and
settings, publish the chosen higher B to the test feed, check/download B, choose
Later, restart normally without installation, then choose Install and restart.
Verify B, retained configuration, and a new score upload. Also test interrupted
download/retry, no newer version, no downgrade, and clicking install during a song.

For public release, manually create a draft release in TNT's repo, upload the
production installer, `.blockmap`, `latest.yml` and checksums from the same build,
and publish only after acceptance. Existing 1.11.0 users see their existing download
notification and must install the first updater-capable version manually. Later
versions can download/install/restart inside the app. Signing is not configured;
Windows installer/publisher prompts still need acceptance testing.

## Acceptance before public release

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
- Verify profile editing stays disabled if its original data could not load.
- Complete updater A → B and PayPal sandbox one-time/monthly/cancel flows.
- Record version, account, arrangement, observed result and time for gameplay tests.
  Never put private SQL, passwords, email addresses or tokens in release artifacts.

Automated checks do not replace these Windows gameplay/update/payment checks.
No installer or public release is created merely by preparing this branch.
