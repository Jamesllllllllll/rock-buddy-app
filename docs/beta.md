# Rock Buddy Beta

This temporary community test uses the migrated backend at
`https://rock-buddy-site-rehearsal.tntmusicstudios-c64.workers.dev` and the
July 11, 2026 database snapshot. Test scores and account changes will be discarded;
they will not be merged into the live service.

Download the Setup.exe from the community beta prerelease in
[the app fork](https://github.com/Jamesllllllllll/rock-buddy-app/releases).
Run it normally, then launch **Rock Buddy Beta** from the Start menu or desktop.
Close regular Rock Buddy and other RockSniffer instances before gameplay.
Use the account credentials from the snapshot, or sign up inside Beta.
Password resets and account edits affect only the beta copy.

The installer has its own app identity, settings, browser session, and shortcuts.
It cannot select the live backend. RockSniffer and its .NET runtime are bundled.
The window title and an in-app notice identify Beta on every page. Automatic
updates are disabled. The installer is unsigned.

Try account flows, search, profiles, rankings, Learn a Song, Score Attack, and
restarting after an upload. Report the version, song, arrangement, approximate
play time, and expected/actual result to TNT or Jimmy. Keep credentials and tokens
private. Rocksmith game saves still work normally, but verified beta scores do
not transfer to production.

Close Beta and open normal Rock Buddy to resume live use. Uninstall **Rock Buddy
Beta** when testing ends; the normal installation and its settings are separate.

## Building and publishing

`feat/community-beta` starts from tested staging build 13 (`c0e6720`) and retains
that build's RockSniffer pins. Experimental multiplayer is not included.
Windows CI builds the self-contained helper, packages NSIS, installs the actual
Setup.exe, and tests startup, the beta label, server selection, settings isolation,
and profile discovery. The result is a draft GitHub prerelease with checksums.

Publish the draft only after the rehearsal import is verified, encryption and
SMTP secrets are configured, and account/search/score checks pass. The smoke check
permits maintenance while building a draft; that does not mean it is ready to play.
Do not publish synthetic account credentials or the database in release assets.
