# SCOPE compatibility checks

These development-only dependencies are not loaded by the GitHub Pages site.
Use Node.js 24 and install from the lockfile:

```sh
npm ci --prefix tests
npx --prefix tests playwright install chromium
npm test --prefix tests
```

On Linux, use `playwright install --with-deps chromium` if browser system libraries
are missing. The GitHub Actions workflow runs the same tests on pushes and pull
requests. Browser tests start their own local server on port 8765; set
`SCOPE_TEST_PORT` or `SCOPE_BASE_URL` if needed.

The suite checks:

- Local storage, previous DNA data, simultaneous saves, workshop isolation,
  validation and the remote request contract.
- The real PostgreSQL schema and `pgcrypto` in disposable PGlite databases:
  fresh installation, repeat installation, and upgrade from the original
  prototype commit `1240cdc7f20ef4aaa6b43de71ba5845e7ed446ce`.
- Existing DNA records, tokens, completion and organizer access survive upgrade;
  all five workshop catalogs match their database configuration.
- Public RPC permissions, invalid tokens/PINs, closed sessions and group counts,
  plus JavaScript adapter calls executed against the SQL functions.
- Complete student and organizer flows for every lab at 320 px, saved measurements,
  refresh/resume, CSV/JSON downloads, retry after save failure and restart.

The migration test reads the original schema through Git, so use a full clone
(or fetch that commit when starting from a shallow checkout). Tests use synthetic
data and never connect to a live Supabase project. PGlite verifies PostgreSQL
behavior; it does not verify a deployed project's PostgREST, CORS, credentials,
network availability or production configuration. Follow the backend README's
live rehearsal before using multiple classroom devices.
