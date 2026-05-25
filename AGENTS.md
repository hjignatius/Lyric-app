# AGENTS.md

Notes for AI agents (and future humans) working on this repo.

## What this app is

**ChordSheet** — a small React + Vite app for entering songs in ChordPro
format and exporting them as one-page PDF chord sheets. Designed for
guitarists to type a song once and print a clean, single-page lead sheet.

Everything runs client-side. No backend, no server, no auth. Songs are
persisted to `localStorage`.

## Run / build

```bash
npm install --legacy-peer-deps   # peer-deps flag required (Vite 8 + tailwind 4)
npm run dev                      # local dev server
npm run dev -- --host            # expose on LAN (for iPad testing)
npm run build                    # production build → dist/
```

## Tech stack

- React 19 + Vite 8 (rolldown bundler)
- Tailwind CSS v4 (no `tailwind.config.js` — imported via `@import "tailwindcss"` in `src/index.css`)
- `@react-pdf/renderer` for client-side PDF generation
- `localStorage` for persistence (no backend)

## Architecture at a glance

```
src/
├── App.jsx                      orchestrator: state, autosave, layout
├── components/
│   ├── Editor.jsx               raw ChordPro <textarea>
│   ├── Preview.jsx              live HTML preview of the parsed song
│   ├── Toolbar.jsx              transpose, notation, fit-to-page, library, export
│   ├── MetadataForm.jsx         title/artist/key/tempo + tap-tempo button
│   └── SongLibrary.jsx          save/load/delete dropdown (Songs button)
└── utils/
    ├── chordPro.js              parser + attachSectionLabels()
    ├── transpose.js             semitone transposition incl. slash chords
    ├── pageBreaks.js            estimate where PDF pages break, compute fit scale
    ├── pdfExport.js             trigger blob download
    ├── SongDocument.jsx         @react-pdf document tree
    ├── storage.js               localStorage helpers (draft + local library)
    ├── pcloud.js                pCloud OAuth + REST client (optional sync)
    └── library.js               song-library facade: pCloud OR localStorage
```

## The single most important invariant

`Preview.jsx` (HTML) and `SongDocument.jsx` (PDF) are **two parallel
renderings of the same parsed song**. They must produce the same visual
result. Any change to one almost always needs a matching change to the
other:

- font sizes (`BASE_CHORD_PX`, `BASE_LYRIC_PX` in preview vs `chordText.fontSize`, `lyricText.fontSize` in PDF)
- label column width (`LABEL_COL_PX` in preview vs `LABEL_COL` in PDF)
- header alignment (`text-center` in preview vs `textAlign: 'center'` in PDF)
- scale handling — both must accept `scale` and multiply *all* dimensional values by it
- per-line vertical structure — chord row + lyric row stacked as a column per segment, never as two separate flex rows (this was the root cause of the chord-misalignment bug)

If you change one without the other, the preview will lie about what the
PDF looks like.

## Data flow

1. Editor produces raw ChordPro text → stored as `text` state in `App.jsx`.
2. `parseChordPro(text)` returns an array of `{ type, segments | text }` lines.
   Types: `'chords'`, `'lyrics'`, `'comment'`, `'empty'`, `'directive'`.
3. `attachSectionLabels(parsedLines)` collapses each `comment` (`# Verse 1`)
   onto the next non-empty content line as a `.label` property, and discards
   empty lines that immediately followed a label. **Both renderers call this
   before iterating.**
4. Preview and PDF independently render the annotated lines.

## ChordPro syntax supported

```
{title: ...}           directive — currently ignored at render time
# Verse 1              section label — appears in left margin
[G]Amazing [D]grace    inline chords in brackets
[G/B]slash chords      bass note transposes too
Plain lyric            line without brackets renders as lyric-only
                       (blank line) section spacer
```

## Tunable constants (where to look)

| What | File | Constant |
|---|---|---|
| Min readable shrink-to-fit scale | `utils/pageBreaks.js` | `MIN_FIT_SCALE` (0.55) |
| Per-line height estimates | `utils/pageBreaks.js` | `HEIGHTS` |
| A4 content area | `utils/pageBreaks.js` | `A4_HEIGHT_PT`, `PAGE_PADDING_PT` |
| Label column width (PDF) | `utils/SongDocument.jsx` | `LABEL_COL` (56pt) |
| Label column width (preview) | `components/Preview.jsx` | `LABEL_COL_PX` (72px) |
| Tap tempo reset timeout | `components/MetadataForm.jsx` | `RESET_AFTER_MS` (3000) |

**Whenever you tune a height constant in `pageBreaks.js`, double-check it
matches the actual style in `SongDocument.jsx`.** They drift easily.

## Song storage: two modes behind one facade

`components/SongLibrary.jsx` never touches storage directly — it calls
`utils/library.js`, which picks the backend at runtime:

- **pCloud connected** → songs are individual `.json` files in a `/ChordSheet`
  folder (`utils/pcloud.js`). This is the source of truth; results are mirrored
  into a localStorage cache so a synced device can read songs offline. Every
  read (`listSongs`, `loadSong`) falls back to that cache on network failure.
- **Not configured / not connected** → the original localStorage library in
  `utils/storage.js`. The app is fully functional with no pCloud at all.

`isCloudConfigured()` is true only when `VITE_PCLOUD_CLIENT_ID` is set. Auth is
the OAuth2 implicit (`response_type=token`) flow: `connect()` redirects the
whole page to pCloud; `handleRedirect()` (called once on App mount) reads the
`access_token` + `locationid` back off the URL, stores them, and scrubs the
URL. `locationid` 1 = US (`api.pcloud.com`), 2 = EU (`eapi.pcloud.com`).

A song's `id` in cloud mode **is its pCloud path** (`/ChordSheet/<title>.json`).
Renaming the title writes a new file and deletes the old one. The library list
is cheap (filenames + modified dates from `listfolder`); full content
(artist/key/tempo) loads on demand in `loadSong()` via `getfilelink` + fetch.

**The Preview/PDF invariant does not involve storage** — `library.js` only
moves song records around; it never changes how a parsed song renders.

## Persistence keys (localStorage)

```
chordsheet:current       → { text, metadata, currentId }   active draft, autosaved every change
chordsheet:library       → [{ id, metadata, text, savedAt }, ...]   local-mode named songs
chordsheet:pcloud-auth   → { access_token, host }          pCloud token + region host
chordsheet:pcloud-cache  → { list: [...], songs: {...} }   offline mirror of pCloud songs
```

Autosave is keyed off any change in `text`, `metadata`, or `currentId` —
see the `useEffect` in `App.jsx`. Hydration on mount runs once via the
`hydrated` ref guard to avoid clobbering empty state.

## Common gotchas

- **JSX in `.js` files breaks the rolldown bundler.** PDF components live
  in `SongDocument.jsx` (not `.js`) for this reason.
- **`@tailwindcss/postcss` is required** alongside `tailwindcss` in
  `postcss.config.js` for Tailwind v4 to work — not the same as v3 setup.
- **`npm install` requires `--legacy-peer-deps`** because Vite 8's optional
  peers conflict with some plugins.
- **`onPointerDown` (not `onClick`)** on the tap-tempo button so it
  registers immediately on iPad touch — `onClick` has a delay.
- **Page break estimates are approximations.** They match @react-pdf's
  actual paginator within a few points; if a break consistently lands
  on the wrong side of the actual PDF break, the heights in
  `pageBreaks.js` need re-tuning.
- **pCloud redirect URIs must be registered verbatim.** The OAuth flow uses
  `window.location.origin + pathname` as the redirect; add both the localhost
  dev URL and the Vercel URL in the pCloud app settings or auth fails.
- **pCloud file *downloads* may hit CORS.** `getfilelink` returns a content
  host we fetch directly; if those hosts ever omit CORS headers, song loading
  breaks (listing/saving don't). Fallback is a tiny Vercel serverless proxy.
  Not implemented — `library.js` falls back to the offline cache meanwhile.
- **The pCloud token lives in `localStorage`.** Normal for a public SPA OAuth
  client; it's scrubbed from the URL on redirect so refresh/bookmark can't leak
  it.

## What this app intentionally does NOT do

- No chord diagrams / fretboard visualisation.
- No audio playback, no metronome (the tap-tempo button just fills the BPM field).
- No multi-page layout controls beyond shrink-to-fit one page.
- No setlist or multi-song export (yet — cross-device sync via pCloud is the
  groundwork for setlists + a performance mode).

Add any of these only with a clear user request — none of them are
implied by the current UX.
