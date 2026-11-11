# Toneary

Greek-language music discovery PWA for GitHub Pages. Vanilla JavaScript, CSS and HTML, with free data APIs, optional Supabase email/password accounts, private cross-device libraries and no analytics.

## Features

- Unified search for artists, albums and songs, combining title relevance, aliases and ListenBrainz audience counts. Artist search includes available Wikipedia portraits and snapshots.
- Album filters for genre, original release year and minimum community rating. Rating checks apply to the loaded result batch and show progress; unavailable ratings are not treated as zero.
- Artist discographies, album metadata, tracklists, genres, labels and available credits.
- Actual MusicBrainz community ratings with vote counts. Discogs edition ratings are loaded opportunistically from MusicBrainz links; missing ratings are never fabricated.
- Full available lyrics through LRCLIB, with external Genius search when absent.
- Direct Spotify links where MusicBrainz provides an exact link. Otherwise the button explicitly opens Spotify search.
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

Only public Supabase publishable/anonymous gateway keys are embedded. No service-role or management token is included. A JWT-verified, read-only Edge function fetches public audience counts and portraits from fixed upstream hosts; it never queries private user data. `db/schema.sql` defines the Toneary-only table, four ownership policies and a security-invoker synchronization function. Only authenticated users can access their own rows. Outgoing changes are persisted to a per-account outbox before network upload, and updates patch individual fields instead of replacing the complete library. Pending writes retry on reconnect, focus and periodic refresh. Cross-device edits to the same field use the last accepted server write.

Signed-in data is cached under a separate key for each account. Signing out switches the visible app to its guest library; it does not copy private account data into guest storage. Export important data before clearing browser storage. Offline changes cannot reach another device until this device reconnects.

The service worker caches only same-origin app resources. Search, authentication and cloud synchronization require connectivity. The Supabase browser SDK is vendored at the exact version and SHA-256 recorded in `vendor/versions.json`.

Lyrics lookup handles Greek accents, case and transliterated artist names. Missing Greek lyrics link to the Greek lyrics archive; other missing lyrics link to a general lyrics search. Lyrics and image attribution remain available in collapsed details and About.

The featured records provide an immediate fallback while fresh daily suggestions load. ListenBrainz counts represent its community, not worldwide streaming totals. Popularity ordering is applied to the candidate results returned by the catalogue. Refresh the starting selection with `node scripts/seed.mjs`.
