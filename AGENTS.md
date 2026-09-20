# Rock Buddy desktop development

Preserve existing desktop behavior while testing the TypeScript backend migration.
Multiplayer work is on hold; experimental reader support is not a request to add
multiplayer UI or score submission. Read `docs/staging.md` for acceptance status.

## System requirements

- Use **native Windows x64** for the desktop/RockSniffer build and gameplay.
  Backend-only development can run separately on Linux/macOS; do not promise
  gameplay detection from a Linux/macOS or WSL Electron process.
- Install Git, **Node.js 24** with npm, **Python 3**, and the **.NET SDK 8**
  (the runtime alone cannot build RockSniffer).
- Verify `git --version`, `node --version`, `npm --version`, `python --version`,
  and `dotnet --list-sdks`. `pre_build.py` is invoked with `python`; ensure that
  name resolves to Python 3. The backend's checks additionally use `python3`.
- Real gameplay needs Steam/Rocksmith 2014 and the intended local Rocksmith save.
  Account/search/profile testing can be done without playing a song.

## Get the code

Use a separate development checkout, preserving existing repositories and installs:

```sh
git clone --branch prep/experimental-readers --recurse-submodules https://github.com/Jamesllllllllll/rock-buddy-app.git rock-buddy-app-local
cd rock-buddy-app-local
git submodule update --init --recursive
npm ci
npm test
```

Use existing GitHub authentication if access is required. Keep submodules at the
recorded commits; do not use `git submodule update --remote`. The published
`prep/experimental-readers` branch includes work beyond `feat/staging-backend`.

## Run with a local backend

1. Clone `https://github.com/Jamesllllllllll/rock-buddy-site`, branch
   `feat/typescript-foundation`, into a sibling directory. Follow its `AGENTS.md`
   and `docs/development.md`: install dependencies, migrate/seed local D1, enable
   local auth/search/rankings, and initialize the ranking baseline.
2. Start the backend with `npm run dev` in that repository. Check the homepage
   and `/healthz` at `http://127.0.0.1:8787`. Keep the backend process running.
3. In this desktop repository, run `npm run start:local`. This builds RockSniffer,
   TypeScript, and Electron assets, then launches against `http://localhost:8787`.
4. Log in as `FixtureLead` with `Synthetic Rock Buddy password!`.
   `FixtureBass` and `FixtureRhythm` use the same password. These are public
   synthetic accounts; no production secrets or Cloudflare credentials are needed.
5. Confirm API requests target localhost. Local mode uses a separate configuration
   store and browser session. Configure the intended Steam folder and Rocksmith
   profile; do not overwrite production settings or modify game save files.
6. Close other Rock Buddy/RockSniffer instances before gameplay to avoid process
   and port conflicts. Verify a score reaches **local** D1 and survives restarting
   both applications; allow a few minutes for ranking updates.

If localhost selects IPv6 but the backend only listens on IPv4, align the local
address/binding while retaining CSP and browser security. The current CSP permits
both `localhost:8787` and `127.0.0.1:8787`.

Local backend data persists in the site's `.wrangler/` directory. Do not delete or
reseed existing data without an explicit reset request. Local email is disabled
by default; activation/reset email delivery is not covered by this setup.

## Command and change boundaries

- `npm run start:local`: local backend; use this for the setup above.
- `npm run start:staging`: hosted shared staging, not local D1.
- `npm start`: production backend. `npm run dev`: legacy Pi backend.
- Do not run `npm run release` for setup: it cleans ignored files and packages a
  release. A packaged staging installer is locked to hosted staging and cannot
  replace this local source launch.
- Run `npm test` and `npm run build` for desktop code changes. Report Windows or
  gameplay checks that were not actually performed.
- Keep this task local: no deployments, releases, pushes, Cloudflare changes, or
  Pi changes unless separately requested. Protect unrelated local work and keep
  credentials, database dumps, and real account data out of Git.
