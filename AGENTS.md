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
    └── storage.js               localStorage helpers
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

## Persistence keys (localStorage)

```
chordsheet:current   → { text, metadata, currentId }   active draft, autosaved every change
chordsheet:library   → [{ id, metadata, text, savedAt }, ...]   named songs
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

## What this app intentionally does NOT do

- No backend, no accounts, no cross-device sync — songs are per-browser.
- No chord diagrams / fretboard visualisation.
- No audio playback, no metronome (the tap-tempo button just fills the BPM field).
- No multi-page layout controls beyond shrink-to-fit one page.
- No setlist or multi-song export.

Add any of these only with a clear user request — none of them are
implied by the current UX.
