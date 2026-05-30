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
- **Setlists** — group songs into ordered, named sets (reorder, add, remove);
  they sync through pCloud just like songs
- **Performance mode** — a full-screen, distraction-free player for the stage:
  large chords-over-lyrics, next/previous song navigation, on-the-fly transpose,
  adjustable text size, hands-free auto-scroll, a dark/light toggle, and a
  screen wake-lock so your device won't sleep mid-song
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

## Setlists & performance mode

Click **Setlists** in the toolbar to build a named, ordered set: add songs from
your library, reorder them with the ▲/▼ arrows, and remove what you don't need.
Setlists save wherever your songs do — in pCloud when connected (so you can
build a set on your laptop and perform from an iPad), or in `localStorage`
otherwise.

Hit **▶ Perform** on a setlist — or the **Perform** button for the song you're
editing — to enter full-screen performance mode:

- **Big chords-over-lyrics** with section headers, sized for reading at a
  distance
- **Navigate** between songs with the on-screen buttons or the **←/→** arrow
  keys
- **Transpose on the fly** per song (resets when you move to the next)
- **Adjustable text size** (the `A−` / `A+` buttons or **+/−** keys)
- **Auto-scroll** hands-free at four speeds (toggle with the button or
  **spacebar**)
- **Dark/light toggle** — dark by default for dim stages
- **Screen stays awake** via the Wake Lock API where supported
- **Esc** exits

## Sync across devices (pCloud + Vercel)

By default songs live in the browser they were created in. To use the same
library on your Mac, iPad, and phone, connect a pCloud account. The app stays
100% static — it talks to pCloud directly from the browser, so there's still
no backend to run.

**1. Deploy to Vercel.** Import the GitHub repo at <https://vercel.com/new>.
Vercel auto-detects Vite; the included `vercel.json` handles SPA routing. It
redeploys on every push.

**2. Register a pCloud app (recommended).** At
<https://docs.pcloud.com/my_apps/> create an app, give it write access to a
private app folder, and add your redirect URIs — your Vercel URL (e.g.
`https://your-app.vercel.app/`) and `http://localhost:5173/` for local dev.
Copy the **Client ID** and set it as the `VITE_PCLOUD_CLIENT_ID` environment
variable (on Vercel under Settings → Environment Variables, locally in
`.env.local`), then redeploy.

**3. Connect.** Open the app and click **Connect pCloud**. With a client id
configured you're sent to pCloud's own login page (which handles two-factor
authentication natively); approve access and you're returned to the app with a
token. Your songs now save to a `/ChordSheet` folder in pCloud and appear on
any device where you connect. EU and US accounts both work — the region comes
back from pCloud.

How sign-in works: the app uses pCloud's OAuth2 implicit flow. pCloud handles
the password and any 2FA in its own UI; the app only ever receives an access
token, which it keeps in `localStorage`.

Notes:

- Songs are cached locally, so a synced device can still browse and open them
  offline.
- EU privacy: EU accounts talk only to `eapi.pcloud.com`.
- If pCloud's file-download hosts ever block browser fetches with CORS, song
  *loading* would need a small Vercel serverless proxy (saving/listing are
  unaffected). Not needed in the common case — flagged here as a fallback.

### Password sign-in (fallback)

If `VITE_PCLOUD_CLIENT_ID` is not set, **Connect pCloud** falls back to a
password form that uses pCloud's digest authentication: your password is hashed
against a one-time server challenge and **never sent in clear or stored** —
only the returned token is kept. (Two-factor accounts are best served by the
OAuth path above.)

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
