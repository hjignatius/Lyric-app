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
- **Cross-device sync** (optional) — connect a pCloud account and your songs
  live as `.json` files in a `/ChordSheet` folder, available on every device.
  Works offline from a local cache once synced. No pCloud? It falls back to
  per-browser `localStorage` automatically.
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

## Sync across devices (pCloud + Vercel)

By default songs live in the browser they were created in. To use the same
library on your Mac, iPad, and phone, connect a pCloud account. The app stays
100% static — it talks to pCloud directly from the browser, so there's still
no backend to run.

**1. Register a pCloud app** at <https://docs.pcloud.com/my_apps/> to get a
**client id** (app key). Add these redirect URIs to the app:

- `http://localhost:5173/` (local dev)
- your deployed URL, e.g. `https://your-app.vercel.app/`

**2. Set the client id.** Locally, copy `.env.example` → `.env.local` and fill
in `VITE_PCLOUD_CLIENT_ID`. On Vercel, add the same as an environment variable.

**3. Deploy to Vercel.** Import the GitHub repo at <https://vercel.com/new>.
Vercel auto-detects Vite; the included `vercel.json` handles SPA routing. It
redeploys on every push.

**4. Connect.** Open the app, click **Connect pCloud**, approve access. Your
songs now save to a `/ChordSheet` folder in pCloud and appear on any device
where you connect. EU and US accounts both work — the region is detected at
login.

Notes:

- Songs are cached locally, so a synced device can still browse and open them
  offline.
- EU privacy: EU accounts talk only to `eapi.pcloud.com`.
- If pCloud's file-download hosts ever block browser fetches with CORS, song
  *loading* would need a small Vercel serverless proxy (saving/listing are
  unaffected). Not needed in the common case — flagged here as a fallback.

## Tech stack

- React 19 + Vite 8
- Tailwind CSS v4
- `@react-pdf/renderer` for PDF export
- `localStorage` for persistence + offline cache
- pCloud REST API (optional) for cross-device sync — no backend
- Vercel for static hosting (optional)

## Contributing

See [AGENTS.md](./AGENTS.md) for architecture notes, the tunable
constants, and the most important invariant: `Preview.jsx` (HTML) and
`SongDocument.jsx` (PDF) are two parallel renderings that must stay
visually in sync.

## License

No license specified — all rights reserved by the author.
