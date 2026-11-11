# Lyrics and credits coverage

The current no-key implementation uses LRCLIB for available lyrics, MusicBrainz recording/work/release relationships for contributors, and linked Discogs edition credits. These are complementary sources with incomplete coverage, especially for Greek releases; no complete catalogue is promised.

Greek lyric matching searches native and romanized metadata while checking the artist identity. Small article variants such as “τη” / “την” are tolerated. Confirmed live lookups include “Μέρες αργίας” and “Ζωή σαν τη δικιά μου” by Διάφανα Κρίνα; no lyrics are bundled in this repository.

For professional combined coverage, Music Story offers separate Basic, Lyrics, Credit and Picture datasets. Its Lyrics integration uses licensed LyricFind content, and its API exposes album and recording credits. Production access requires provider credentials and appropriate licences. Greek coverage, exact repertoire, territories and pricing must be confirmed with the provider before choosing a plan. No subscription has been purchased and no paid provider is claimed active in Toneary.

- https://music-story.com/en/our-offer
- https://doc.music-story.com/dataset
- https://doc.music-story.com/api/reference
- https://music-story.com/en/for-labels-distributors
- https://github.com/musixmatch/musixmatch-sdk

For artist images, TheAudioDB's documented free API can look up the exact MusicBrainz artist ID. Wikipedia images are checked against Wikidata artist IDs when available. A photo is not inferred from a vaguely similar name. Known catalogue coverage is not universal.

- https://www.theaudiodb.com/free_music_api
- https://www.theaudiodb.com/artist/136538
