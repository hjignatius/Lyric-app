# ChordSheet

A browser-based chord sheet editor. Type a song in ChordPro format, see a
live preview with chords aligned over lyrics, and export a clean one-page
PDF lead sheet.

Everything runs client-side — no accounts, no server. Songs save to your
browser automatically.

## Features

- **ChordPro editor** with live split-pane preview
- **Inline chords** rendered above the correct syllable
- **Section labels** (`# Verse 1`, `# Chorus`) shown in the page margin so
  they don't consume a vertical line — useful when fitting to one page
- **Transpose** up/down by semitone with a sharps/flats toggle
- **Tap tempo** — tap a button in rhythm to detect BPM
- **Fit to one page** — automatically shrinks the chord sheet to fit on a
  single A4 page when it just barely overflows
- **Page break preview** — see exactly where the PDF will break pages
- **Autosave** to `localStorage` — never lose work on reload
- **Song library** — save multiple songs, load them back, delete the ones
  you don't need
- **PDF export** via `@react-pdf/renderer` — formatted A4 chord sheet,
  printable and shareable

## Quick start

```bash
git clone https://github.com/mwazl/Lyric-app.git
cd Lyric-app
npm install --legacy-peer-deps
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

To test on an iPad or phone over Wi-Fi:

```bash
npm run dev -- --host
```

Then open the **Network** URL Vite prints on the device.

## ChordPro syntax

Chords go in square brackets, inline with the lyrics where they fall:

```
# Verse 1
[G]Amazing [D]grace, how [G]sweet the sound
That [G]saved a [C]wretch like [G]me

# Chorus
[G]Through many [C]dangers, [G]toils and snares
I have [D]already [G]come
```

What each piece does:

| Syntax | Meaning |
|---|---|
| `[G]`, `[Dm7]`, `[Cmaj7]` | inline chord — appears above the next syllable |
| `[G/B]` | slash chord — both root and bass transpose |
| `# Verse 1`, `# Chorus` | section label — appears in the left margin |
| *(blank line)* | section spacer |
| `Plain text line` | lyric line with no chords |

## How it looks

Header on each PDF:

```
                       Sensitive Kind
                          J. J. Cale
                       Key: Dm · 80 BPM
─────────────────────────────────────────────────
Verse 1   [Dm]Don't take her for granted
          She's had a hard time
          Don't misunder[G]stand her
          Don't play with her mind

Chorus    [F]She's a sensitive [C]kind
          [Bb]Don't mess with her [Dm]mind
```

The section labels (`Verse 1`, `Chorus`) sit in the left margin so they
take zero vertical space — handy for fitting longer songs on one page.

## Tech stack

- React 19 + Vite 8
- Tailwind CSS v4
- `@react-pdf/renderer` for PDF export
- `localStorage` for persistence (no backend)

## Contributing

See [AGENTS.md](./AGENTS.md) for architecture notes, the tunable
constants, and the most important invariant: `Preview.jsx` (HTML) and
`SongDocument.jsx` (PDF) are two parallel renderings that must stay
visually in sync.

## License

No license specified — all rights reserved by the author.
