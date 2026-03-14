# THE ARCHIVE — ARG Wiki

A cryptic, unsettling wiki-style website inspired by ARG (Alternate Reality Game) aesthetics. Dark themed, glitchy, and full of hidden clues.

## Project Structure

```
arg-wiki/
├── index.html          # Main entry (single-page app)
├── README.md
├── css/
│   └── styles.css      # Dark theme, glitch effects
├── js/
│   └── app.js          # Routing, search, puzzles
├── data/
│   ├── articles.json   # Main article content
│   └── clues.json      # Puzzle metadata (optional)
├── pages/
│   └── 404.html        # Standalone error page
└── assets/             # Images for articles
```

## Running Locally

**Important:** Fetching JSON requires a web server (browsers block `file://` fetch). Options:

1. **Python:** `python -m http.server 8000` → http://localhost:8000
2. **Node:** `npx serve .` or `npx http-server`
3. **VS Code:** Live Server extension

## Puzzle Flow (for players)

1. **Index** — Browse articles. Some contain clues.
2. **Final Transmission** — Hints at "the source" (secret clickable word).
3. **Source** — Password-protected. Clue in page source (HTML comment): "sourcing".
4. **Corrupted** — Link from Source. Click the escape button 3 times.
5. **Beyond** — Final page, unlocked after corrupted escape.

## Adding New Pages

### New Public Article

Edit `data/articles.json`:

```json
{
  "id": "my-article",
  "title": "My Article Title",
  "date": "2025-03-14",
  "category": "category",
  "visible": true,
  "content": "HTML content. Use <span class=\"redacted\">████</span> for redacted text. Use <span class=\"secret-link\" data-href=\"#hidden/page-id\">hidden</span> for secret links.",
  "clue": "optional clue text"
}
```

### New Hidden Page

Add to `hiddenArticles` in `data/articles.json`:

```json
{
  "id": "page-id",
  "title": "Secret Page",
  "content": "HTML content",
  "requiresPassword": false,
  "password": "optional",
  "requiresUnlock": false,
  "unlockKey": "puzzle_step_name"
}
```

### Special CSS Classes (for articles)

| Class | Effect |
|-------|--------|
| `redacted` | Black bar; reveals on hover |
| `invisible` | Invisible until hover |
| `reversed` | Reversed text (decode by reading RTL) |
| `glitch-text` | Glitch effect on hover (use `data-text` for glitch variant) |
| `flicker` | Flickering text |
| `base64-hint` | Click to decode base64 |
| `secret-link` | Hidden link; use `data-href="#hidden/id"` |

## Adding Hidden Clues

- **HTML comments** — Add clues in `index.html` source.
- **Console** — Use `console.log()` in `app.js` for debug hints.
- **Base64** — Put encoded text in `<span class="base64-hint">U0VBUklORw==</span>`.
- **Reversed** — Use `<span class="reversed">.txet desrever</span>`.

## Admin Panel

- **Konami code:** ↑ ↑ ↓ ↓ ← → ← → B A
- **Or:** Double-click the "?" button (bottom-right)

Create articles via the admin form. New articles are stored in `localStorage` for testing. For persistence, copy the JSON output into `data/articles.json`.

## Routes (Hash-based)

| Hash | Page |
|------|------|
| `#index` or `` | Home / index |
| `#article/incident-1997` | Article view |
| `#hidden/source` | Password page |
| `#hidden/corrupted` | Corrupted page |
| `#hidden/beyond` | Final (requires unlock) |
| `#admin` | Admin panel |
| `#error` | Fake error page |

## Customization

- **Colors:** Edit CSS variables in `:root` in `css/styles.css`.
- **Puzzle logic:** Modify `puzzleState` and `savePuzzleState()` in `app.js`.
- **Eerie effects:** Triple-click bottom-left corner triggers a glitch.
