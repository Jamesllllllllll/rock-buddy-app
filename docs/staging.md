# Backend migration testing

`npm start` continues to use https://rock-buddy.com with the existing credentials and settings.
`npm run start:staging` selects https://rock-buddy-site-staging.rock-buddy.workers.dev.
`npm run start:local` selects http://localhost:8787 (run the website's `npm run dev` first).
Packaged builds accept `--backend=staging` or `--backend=local` too.

Staging and local use separate electron-store files and Chromium sessions. They start
with no production login or settings; sign in with synthetic development accounts
once authentication is implemented. Never copy production API keys into them.
Staging serves the unchanged homepage, health checks, three catalog read APIs, and
two score-write APIs with synthetic tokens. Login and the remaining APIs are still
unported, so normal desktop sign-in and end-to-end gameplay testing remain pending.
See the site's [migration plan](https://github.com/Jamesllllllllll/rock-buddy-site/blob/feat/typescript-foundation/docs/migration-plan.md) and
[synthetic credentials](https://github.com/Jamesllllllllll/rock-buddy-site/blob/feat/typescript-foundation/docs/catalog-api.md#local-and-staging-use)
in the site fork.

The legacy positional URL argument still works, with a separate store per origin.
Custom origins must also be permitted in `src/index.html`'s `connect-src` policy.
Existing Raspberry Pi development remains permitted. Production auto-update links
still target the upstream app releases; this branch does not publish an installer.

Run `npm test` for backend selection, credential isolation, and CSP checks.
CI uses Node 24, .NET 8, `npm ci`, tests, and a Windows build with recursive submodules.
RockSniffer build failures now fail CI instead of being swallowed. Actual Rocksmith
sync, account forms, and Windows installer testing remain migration acceptance gates.
