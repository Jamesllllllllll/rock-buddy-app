# Multiplayer support plan

Status: on hold as of September 16, 2026 while backend migration takes priority.
Planning only; no multiplayer UI, account
assignment, or score submission is implemented. The combined library is pinned
at `067414025c24861fafe332a8696ecfc12740a2eb` (upstream PRs
[#1](https://github.com/tnt-coders/RockSnifferLib/pull/1) and
[#2](https://github.com/tnt-coders/RockSnifferLib/pull/2)). Windows library/app builds
and all 81 library tests passed. Both readers default off. Live multiplayer
acceptance in the Rock Buddy executable remains outstanding.

Goal: two people on one PC can explicitly assign their own Rock Buddy accounts to
the correct game slots and record only their own eligible performances. Preserve
single-player behavior. Develop behind an opt-in staging feature; this is not a
new requirement for completing the PHP-to-Cloudflare migration.

## Product decisions

Confirmed: users determine which Rock Buddy account belongs to each player slot.
Defaults proposed below are awaiting James's answers:

- Eligible multiplayer scores eventually use existing leaderboards and rankings,
  but only after verification parity is demonstrated. Until then, display-only.
- Either player may be an unrecorded guest. The other can still record an eligible
  result. Do not require a guest to create an account just to play.
- Confirm assignments once per multiplayer session, not on every song. Keep them
  visible; changes apply only before the next run. Guest sign-in is temporary.
- Initial scope: two-player local multiplayer live accuracy/streaks and, after
  validation, individual competitive scores. No team rankings, Score Attack
  expansion, remote multiplayer, or bulk save import in this feature.

## What detection establishes

| Signal | Useful for | Does not establish |
| --- | --- | --- |
| Multiplayer slot 1/2, arrangement GUID, hits/misses/streaks | Separate live displays and candidate results, even with identical arrangements | Which person or Rock Buddy account owns a slot |
| Run ID, shared timer, pause state, retained result | Track a run through menus/teardown and detect interruptions | Full verification or guaranteed completion |
| Observed initial Rocksmith profile login | Show context and warn about a known conflict with the selected save | Player 1/2 ownership or a persistent active-profile identity |

Never assign accounts from instrument path, memory address, matching accuracy,
profile name alone, or save modification time. Profile names can be duplicated.
Unknown profile identity is explicit; user-confirmed multiplayer assignments can
still work without it. The two-player workflow does not require importing either
person's local Rocksmith history or changing their original profile links.

## User flow and account isolation

1. Enable multiplayer testing and start Rock Buddy before playing. Show a setup
   panel with **Player 1** and **Player 2**, the detected paths when available, and
   an account or **Guest — not recording** for each slot. Game slots, not presumed
   screen-left/right positions, are authoritative until Windows testing confirms
   the visual mapping.
2. Offer the already logged-in account for either slot. The other player signs in
   separately or remains a guest. Require valid credentials and activation for
   each recording account; selecting an arbitrary username is insufficient.
   Prevent one account occupying both slots in the same run.
3. Provide a Swap action, then require explicit assignment confirmation before
   recording starts. Display usernames next to the live player counters throughout
   play. A missed setup or late sign-in allows display, not retroactive attribution.
4. Freeze account, slot, arrangement and assignment revision for the run. A player
   or account change during a song cancels recording for the affected run; never
   transfer already captured notes to a newly selected account. Other songs may
   use the new assignment after confirmation.
5. Show each player's final accuracy/streak and individual recording outcome.
   Distinguish guest, incomplete/unverified, pending upload, and saved. Reader
   completion alone must never display a successful upload.
6. End session, host logout, app restart, or game-process replacement clears guest
   authentication and assignments. Returning to single player restores the host
   workflow without carrying guest history, credentials, or slot data into it.

Suspend saved-history uploads during multiplayer, including Score Attack imports;
catalog-only sync is allowed. Live multiplayer results must never be reconstructed
from the Config-selected save. A session-level pause-recording control applies to
both players; an unrecorded guest affects only that slot.

## Implementation slices and acceptance gates

### 1. Reader integration and live display

- Configure the bundled sniffer before starting it. Enable experimental multiplayer
  explicitly; enable profile observation with a host-supplied, unambiguous catalog
  where available. Recreate readers when their configuration/catalog changes.
- Consume experimental snapshots even when legacy song metadata `success` is
  false. Dispatch multiplayer before the legacy snort/verification loop. Never
  run both submission paths for one performance, including mode transitions.
- Keep continuous reader observation independent of page navigation. Preserve
  polling/read-failure semantics; distinguish live slots from retained LastResult.
- Display both slots without sending scores. Validate swapped and identical paths,
  two guitar players, guest mode, missing metadata, and return to single player.

Gate: Windows evidence that each slot follows the correct physical player and
that multiplayer cannot import history or submit through the old single-player
path. Remastered has synthetic reader coverage, not live validation in this port;
test each edition we intend to support. Bass needs another tester with a bass.

### 2. Account assignment and temporary authentication

- Implement the session flow above with guest credentials held in Electron's main
  process, scoped to the selected backend and session. Keep the host's existing
  account/settings separate; do not use the normal login page's global auth setter.
- Backend: issue an expiring, revocable multiplayer submission grant after guest
  password verification and activation checks. Scope it to the account, host,
  session and allowed operation; hash stored tokens and never log credentials.
- Do not reuse normal login unchanged: `api_tokens` currently has one token per
  user, and logging in replaces it. A guest grant must not invalidate that user's
  normal installation. Reuse existing password verification and rate limits.
- Persist confirmed session assignments server-side for later submission checks.
  Primary account authorization and guest grants must not permit arbitrary user IDs.
  Revoke grants at session end and bound their lifetime after a crash.

Gate: two distinct authenticated accounts or one account plus guest; swapping
works before a run, mid-run changes cannot misattribute it, and the guest's own
desktop session remains valid. No recording without confirmed assignments.

### 3. Verification and submission

Do not feed experimental LastResult directly to `record_verified_score.php`.
The reader explicitly treats completion as inferred; `Supported` only indicates
an edition layout. Its accuracy is hits / counted notes, not mastery, and it does
not supply chart-wide note totals or prove full difficulty/speed compliance.

- Track evidence per slot/run from before gameplay starts. Resolve each GUID to
  the exact song/chart and trusted full-difficulty note total. Validate counts,
  streaks, timing, speed, pause/restart behavior and existing anti-cheat prerequisites
  against the current single-player rules. Audit which checks can be established
  in multiplayer; missing proof means no verified score, not a relaxed rule.
- Reject competitive submission for late attachment, unknown/abandoned outcomes,
  unresolved charts, discontinuities, invalidated assignments, process loss, or
  observations too incomplete to establish verification. A problem isolated to one
  slot need not reject the other when its own and shared evidence remain complete.
- Introduce an additive multiplayer submission endpoint. It validates the bound
  account/slot authorization and evidence, then reuses existing best-score and
  ranking logic only for eligible results. Do not mark all multiplayer results
  verified or create a second ranking implementation by default.
- Proposed D1 additions: session/slot assignments, guest grants, and compact
  submission receipts with source/evidence version. Final schema belongs to this
  slice. Index by session/account/run; avoid table scans and raw gameplay storage.
- Use a session ID plus reader-instance/run ID and slot as the idempotency key.
  Freeze target account and payload; conflicting retries are rejected. Receipt
  insertion and the corresponding score update must be atomic, including concurrent
  retries. Report each player's outcome independently.
- Handle network retries with a bounded queue while the session remains authorized.
  A timeout may follow a successful commit: retry the same receipt, never create a
  second play. Revoked/expired sessions must not fall back to the host account.
- Derive multiplayer play counts from accepted unique runs, not local save totals.
  Decide how they coexist with legacy save-derived `stats_las.play_count` before
  changing displayed totals; replaying a lower score still counts as one play.

Gate: cross-account attempts rejected; retries do not duplicate plays or points;
one player's auth failure cannot redirect the other's score; lower verified scores
preserve personal bests; no competitive writes until verification is proven.
These remain client-observed scores, not tamper-proof server game attestation.

### 4. Staging acceptance and release

Test two accounts and account-plus-guest, swapped/identical arrangements, same-song
replay, restart, pause/tuner, early exit, song transition, missing player data,
late attachment, game/app restart, profile changes, token expiry, timeout after a
committed write, logout, and return to single player. Include full and reduced
difficulty/speed cases; compare counters with the game's results on both slots.
Automate state/auth/idempotency cases and use Windows gameplay for memory evidence.

Only after these gates: enable competitive writes in staging, confirm the exact
account/arrangement rows and ranking effects in D1, measure request/row costs, then
publish an opt-in installer. Live polling stays local; Cloudflare sees setup,
bounded catalog work and at most two result submissions per run, plus retries.
Keep an immediate multiplayer-disable path and existing single-player clients
compatible. Coordinate production availability with the TypeScript backend;
the old PHP deployment does not implement these new session/grant endpoints.

## Code pointers

- [Reader contract](../RockSniffer/RockSnifferLib/RSHelpers/Multiplayer/README.md)
  and [profile-observation limits](../RockSniffer/RockSnifferLib/RSHelpers/Profiles/README.md).
- Desktop: `src/main.js` (sniffer lifecycle/auth), `src/sniffer/rocksniffer.ts`
  (HTTP readout), `src/sniffer/sniffer.ts` (legacy sync/verification),
  `src/profile-import.js` (selected-save confirmation).
- Site: `src/api/accounts.ts` (login/token replacement), `src/api/score-writes.ts`
  and `src/db/score-writes.ts` (authenticated score writes), D1 ranking triggers.
