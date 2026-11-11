# Toneary

Greek-language music discovery PWA for GitHub Pages. Vanilla JavaScript, CSS and HTML, with no paid API, build step, account, tracking or backend.

## Features

- Search artists, release groups and recordings through MusicBrainz.
- Artist discographies, album metadata, tracklists, genres, labels and available credits.
- Actual MusicBrainz community ratings with vote counts. Discogs edition ratings are loaded opportunistically from MusicBrainz links; missing ratings are never fabricated.
- Full available lyrics through LRCLIB, with external Genius search when absent.
- Direct Spotify links where MusicBrainz provides an exact link. Otherwise the button explicitly opens Spotify search.
- Local favourites, listening queue, personal ratings and notes, with JSON export/import.
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

No API credentials are embedded. User data remains in browser localStorage, is not synced, and should be exported before clearing browser data. The service worker caches only same-origin app resources, not third-party lyrics or images. Previously loaded metadata can be available through local cache while offline. Live searches and unavailable pages require connectivity.

The featured records are a starting selection from MusicBrainz, not a chart or personalized algorithm. Refresh with `node scripts/seed.mjs`.
