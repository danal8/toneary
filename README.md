# Toneary

Greek-language music discovery PWA for GitHub Pages. Vanilla JavaScript, CSS and HTML, with free data APIs, optional Supabase email/password accounts, private cross-device libraries and no analytics.

## Features

- Debounced live suggestions while typing, with grouped artists, albums and songs. Full search for artists, albums and songs, combining title relevance, aliases and ListenBrainz audience counts. Artist search includes available Wikipedia portraits and snapshots.
- Album filters for genre, original release year and minimum community rating. Rating checks apply to the loaded result batch and show progress; unavailable ratings are not treated as zero.
- Artist discographies, album metadata, tracklists, genres, labels and available credits.
- Actual MusicBrainz community ratings with vote counts. Discogs edition ratings are loaded opportunistically from MusicBrainz links; missing ratings are never fabricated.
- Available Greek and international lyrics through LRCLIB. Lookup queries Greek and romanized metadata, validates both artist and title, and selects the closest duration; missing lyrics retain an external search link.
- Spotify app URI links for exact artist/album/track matches, or in-app search when no exact match exists. Spotify buttons open only the installed-app protocol. Opening the installed app depends on the browser’s external-protocol permission.
- Local favourites, listening queue, personal ratings and notes, with JSON export/import. An optional account synchronizes them across devices using row-level ownership policies. Existing guest records are merged after sign-in.
- Daily recommendations based on favourite artists and genres. The day boundary uses Europe/Athens. Saved albums are excluded, selections are deterministic within a day, and multiple artists are represented.
- Generated logo, PNG install icons, maskable icon, web manifest, install prompt and offline shell.

## Run

Node 22 or later:

```sh
npm start
npm run check
npm test
```

Open `http://127.0.0.1:4173/toneary/`. The app also works at the domain root. All assets are relative and routes use URL hashes.

## GitHub Pages

The workflow `.github/workflows/pages.yml` validates the source and deploys a static Pages artifact on pushes to `main`. The repository's Pages source must be GitHub Actions; the setup action attempts to enable Pages when allowed by GitHub. No secrets are required for the app. The default Actions token handles publication to the same repository.

## Data & limits

MusicBrainz requests use a serial queue with at least 1.15 seconds between requests, request deduplication, retries for 429/503 and local caching. Public APIs can be unavailable and metadata coverage varies, particularly for Greek releases. This app is for non-commercial use. MusicBrainz data licensing: https://musicbrainz.org/doc/About/Data_License. Cover Art Archive images retain their respective copyright. Wikipedia text is linked and attributed; images link to their source article. LRCLIB lyrics belong to their respective rights holders. The app does not scrape lyrics or reviews.

Only public Supabase publishable/anonymous gateway keys are embedded. No service-role or management token is included. A JWT-verified, read-only Edge function fetches public audience counts, portraits, genre discovery and Deezer catalogue metadata from fixed upstream hosts; it never queries private user data. `db/schema.sql` defines the Toneary-only table, four ownership policies and a security-invoker synchronization function. Only authenticated users can access their own rows. Personal writes evict only disposable Toneary metadata/image caches when browser storage is full, preserving login sessions, libraries and pending edits. Sync failures distinguish network, authentication, storage and other errors. Outgoing changes are persisted to a per-account outbox before network upload, and updates patch individual fields instead of replacing the complete library. Pending writes retry on reconnect, focus and periodic refresh. Cross-device edits to the same field use the last accepted server write.

Accounts share the existing authentication project with the other apps. Duplicate registration attempts sign in only if the submitted password is valid; otherwise the UI preserves the email and switches to login. Password recovery is available and explains that a changed password also applies to the other apps. Recovery emails use a dedicated callback at the shared project’s existing allowed origin. That isolated page forwards only recovery fragments or errors to the fixed Toneary URL, without loading MediPrice, external resources or accepting a user-provided destination. Old reset emails must be replaced with a newly requested email. No password is changed without a valid recovery session.

Signed-in data is cached under a separate key for each account. Signing out switches the visible app to its guest library; it does not copy private account data into guest storage. Export important data before clearing browser storage. Offline changes cannot reach another device until this device reconnects.

The service worker caches only same-origin app resources. Search, authentication and cloud synchronization require connectivity. The Supabase browser SDK is vendored at the exact version and SHA-256 recorded in `vendor/versions.json`.

Lyrics lookup searches both Greek and transliterated titles and artists. Missing Greek lyrics link to the Greek lyrics archive; other missing lyrics link to a general lyrics search. Lyrics and image attribution remain available in collapsed details and About.

Daily recommendations are cached by Athens date, account and favourite profile. A fresh grid is displayed once after cover validation; unavailable images try an exact catalogue match, then the album is excluded from the daily grid. Local featured covers fill gaps. Refresh uses the same cached list without briefly displaying the seed catalogue. ListenBrainz counts represent its community, not worldwide streaming totals. Popularity ordering is applied to the candidate results returned by the catalogue. Refresh the starting selection with `node scripts/seed.mjs`.

Ratings are community votes rather than critic scores. Cards show vote counts and flag fewer than 10 votes as a small sample (a display rule, not a statistical confidence measure). Rating lookups first reuse a 24-hour per-album cache populated by album and artist pages. Repeated artists are browsed once for up to 100 album ratings. First-time lookups for unrelated artists still respect the upstream rate limit; lookup failures are not cached as zero votes.

Greek live search preserves the original query and resolves MusicBrainz artist identities before fetching that artist’s albums and tracks. It does not substitute generic romanized catalogue matches. Artist photos also use exact MusicBrainz IDs through TheAudioDB and validate Wikipedia identities via Wikidata. Album/track suggestions have direct IDs and audience-based ranking.

Disposable public metadata caches are capped at approximately 750,000 characters, with individual entries over 300,000 characters skipped. A one-time startup migration removes only Toneary public caches before authentication code runs; personal libraries, login sessions and pending edits are preserved. The service worker revalidates resources and refreshes an already-controlled page after an update.

See [LYRICS-SOURCES.md](LYRICS-SOURCES.md) for verified examples and professional lyrics/credits options; no paid provider is currently active.

Personal sessions, guest/account libraries and durable outboxes now use IndexedDB, separate from localStorage’s small per-origin limit. Existing Toneary personal keys are copied transactionally before their legacy values are removed. Auth writes await commit, sync waits for queued personal storage writes before upload and before reporting saved. Public metadata caches remain disposable and bounded in localStorage.
