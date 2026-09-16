# Upstream issue backlog

Reviewed September 15, 2026: all 67 issues (17 open, 50 closed), including comments,
in [tnt-coders/rock-buddy-app](https://github.com/tnt-coders/rock-buddy-app/issues).
This is a candidate backlog, not a commitment to implement every request or a list
of production migration blockers. Issue states below are a snapshot. Reproduce
reported bugs against our current build before treating them as confirmed defects.

Keep the migration focused on preserving behavior. Suggested order: profile
reliability, verification failures, automatic updates, then challenge search and
leaderboard views. Larger social and streaming features can follow the migration.
Use [staging acceptance](staging.md) for work already under test.
The separate [multiplayer plan](multiplayer-plan.md) covers the two newly integrated
reader PRs, explicit player/account assignment, and the gates before recording scores.

## Reliability candidates

Additional finding from our September 16 staging test (no upstream issue filed):
offline requests leave Search/Rank/Profile blank or loading, Account shows duplicate
errors, and Sniffer can retry sync on its 100 ms loop while losing its local song
display. The same request/retry code exists in public v1.11.0. Plan shared error
handling, bounded retry, protection against saving unloaded profile fields, and
separation of local gameplay from backend availability. James confirmed all pages
recover after reconnection without restarting `1.11.0-beta13`; see
[the test record](staging.md#1-connection-loss-while-idle).

| Issues | Work to investigate | Current assessment / next step |
| --- | --- | --- |
| [#87](https://github.com/tnt-coders/rock-buddy-app/issues/87) | Failed Rocksmith profile reads, especially nonstandard Steam folders | Automatic profile discovery helps, but does not establish that this report is fixed. Reproduce its path/configuration failure and improve recovery instructions. |
| [#63](https://github.com/tnt-coders/rock-buddy-app/issues/63) | Legitimate performances fail verification | Investigate remaining note-count mismatches and abrupt chart endings. The discussion includes Nyan Cat, BTBAM examples, Badfish, and Programmers of Decline. Confirm exact chart versions; do not weaken verification to hide failures. |
| [#82](https://github.com/tnt-coders/rock-buddy-app/issues/82) | Equivalent charts have separate leaderboards | Reproduce with Judas Priest's Painkiller. Establish whether notes differ before changing chart identity or merging scores. |
| [#25](https://github.com/tnt-coders/rock-buddy-app/issues/25), [#88](https://github.com/tnt-coders/rock-buddy-app/issues/88) | Nonstop-play arrangement tracking and overlay transitions | RockSniffer dependencies: [#41](https://github.com/kokolihapihvi/RockSniffer/issues/41) and [#53](https://github.com/kokolihapihvi/RockSniffer/issues/53), both open at review. App #88 was closed as a duplicate, not fixed. Reproduce against the bundled RockSniffer before planning changes. |

## Feature candidates

All issues in this table were open at review. These are separate product choices;
their presence here does not change existing score or ranking rules.

| Issues | Feature | Scope / decisions needed |
| --- | --- | --- |
| [#37](https://github.com/tnt-coders/rock-buddy-app/issues/37), also [#87](https://github.com/tnt-coders/rock-buddy-app/issues/87) | Friends-only leaderboards | Choose whose scores appear. Filtering by current Twitch chat participants is a separate extension. |
| [#70](https://github.com/tnt-coders/rock-buddy-app/issues/70) | Find songs to challenge | Artist/title/album search exists. Add discovery by instrument path, verified-score counts, or competitive opportunities. |
| [#86](https://github.com/tnt-coders/rock-buddy-app/issues/86) | Compact, detachable live-stats window | Useful on one monitor. Existing browser addons are a workaround; consider an integrated resizable pop-out. |
| [#84](https://github.com/tnt-coders/rock-buddy-app/issues/84) | Minimum accuracy for publishing a verified score | Optional per-user threshold. Specify interaction with imported unverified scores and existing personal bests. |
| [#80](https://github.com/tnt-coders/rock-buddy-app/issues/80) | Verified full-combo counter | Define a full combo using hit/miss evidence, not a percentage rounded to 100%. Establish what existing data can support. |
| [#38](https://github.com/tnt-coders/rock-buddy-app/issues/38) | Leaderboard views around the user or at the top | Optional automatic rotation for streaming overlays. Existing “Near Me” controls are commented out, not active functionality. |
| [#62](https://github.com/tnt-coders/rock-buddy-app/issues/62) | Choose verified or unverified score views | Decide whether to store both personal bests separately. This may require storage/API changes, not just filtering the current leaderboard. |
| [#81](https://github.com/tnt-coders/rock-buddy-app/issues/81) | Accuracy percentage in Score Attack | Maintainer says saved Score Attack data lacks accuracy. Requires live measurement and storage. Current app disables its verification path for Score Attack; saving Score Attack results already works. |
| [#85](https://github.com/tnt-coders/rock-buddy-app/issues/85) | Song of the Week tab | Rules, selection input, raffle dates, history, and separate rankings. Larger post-migration feature. |
| [#41](https://github.com/tnt-coders/rock-buddy-app/issues/41) | Chart quality ratings | Needs chart-version identity, voting rules, and moderation decisions. |
| [#35](https://github.com/tnt-coders/rock-buddy-app/issues/35) | OBS source/scene control from game state | Optional OBS integration when entering or leaving a song. |
| [#46](https://github.com/tnt-coders/rock-buddy-app/issues/46) | “Rock Bully” commentary | Opt-in humorous feedback. Lower priority than reliability and migration. |

## Already covered or remaining follow-ups

| Issue | Assessment |
| --- | --- |
| [#19 — Profile changes](https://github.com/tnt-coders/rock-buddy-app/issues/19), open | Original-profile linking asks before importing a different Config-selected save. It does not establish who is playing live or prevent wrong-account live submissions. Keep that limitation explicit; do not implement the original proposal to erase account scores. See the multiplayer plan for explicit slot assignment. |
| [#21 — Automatic updates](https://github.com/tnt-coders/rock-buddy-app/issues/21), closed | Current production update check opens the owner's release download page. In-app download/install/restart remains planned. Coordinate the owner's release channel and compatibility with both backends before an advance production release; staging installers are separate. |
| [#77 — Lurk mode](https://github.com/tnt-coders/rock-buddy-app/issues/77), closed | Mode and visible warning exist. A keyboard toggle remains a useful follow-up. Minimum-score threshold is tracked by #84. |
| [#2 — Bulk history import](https://github.com/tnt-coders/rock-buddy-app/issues/2), closed | Maintainer deferred it because verified scores reduced its value. Optional, low priority; preserve profile confirmation, unverified status, and bounded database usage if revisited. |

## Closed issues to retain as regression scenarios

These are historical fixes to protect, not newly confirmed bugs.

| Scenarios | Issues |
| --- | --- |
| Missing PlayedCount/DateLAS in chart save entries; score uploads must still work and absent history stays Unknown. Same missing fields confirmed for Bury Me Rhythm on September 16; #5 names Mikasa and Laser Cannon Deth Sentence and was closed May 11, 2023 citing the verified-score merge 03b5bce. Chart repair is deferred at James's request; see [staging evidence](staging.md#3-reinstall-and-isolation). This does not gate backend migration. | [#5](https://github.com/tnt-coders/rock-buddy-app/issues/5) |
| Restarting a song, pausing near its end, and verification on slower PCs | [#79](https://github.com/tnt-coders/rock-buddy-app/issues/79), [#59](https://github.com/tnt-coders/rock-buddy-app/issues/59), [#66](https://github.com/tnt-coders/rock-buddy-app/issues/66) |
| Tied ranks, streak tie-breakers, and Score Attack strikes taking precedence over score | [#52](https://github.com/tnt-coders/rock-buddy-app/issues/52), [#64](https://github.com/tnt-coders/rock-buddy-app/issues/64), [#49](https://github.com/tnt-coders/rock-buddy-app/issues/49) |
| Switching Steam profiles and selecting multiple arrangements of the same path | [#4](https://github.com/tnt-coders/rock-buddy-app/issues/4), [#28](https://github.com/tnt-coders/rock-buddy-app/issues/28) |
| Equivalent charts remain merged after CustomsForge Song Manager repairs | [#73](https://github.com/tnt-coders/rock-buddy-app/issues/73) |

The other closed issues describe existing features or historical fixes without a
clear additional task from this review. Revisit them if a matching symptom returns.
When taking an item on, refresh its upstream discussion, record reproduction and
acceptance criteria, and update its status here rather than creating another backlog.
