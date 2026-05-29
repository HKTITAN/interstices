# Interstices

An interactive **photography wall**. A dense, gently drifting field of frames —
each sized to its image's own aspect ratio — that **parts** around your cursor:
nearby frames are pushed aside into a clearing while the nearest one rises into a
preview. Click to open it.

Live: **[interstices.vercel.app](https://interstices.vercel.app)**

No framework, no build step — three files (`index.html`, `app.js`, `style.css`)
and a tiny static server. At runtime it loads only fonts, the demo photos, and
Vercel's cookieless Web Analytics ping.

## Features

- **Cursor-parting wall** — an endlessly wrapping, slowly drifting canvas driven
  by one `requestAnimationFrame` loop (transforms mutated imperatively, 60fps).
- **Bring your own media** — drag-and-drop images **or video** anywhere, or use
  the Upload button. Frames adapt to each file's true aspect ratio (no cropping).
  Reset restores the demo set.
- **Roam & zoom** — hold the **middle mouse button** and drag to traverse the
  canvas; **scroll to zoom** (it stays edge-to-edge at any zoom — no blank space).
- **Click to open** — a click opens the centred (nearest) frame **in place**:
  the photo glides to the middle and grows while the wall dims and blurs behind
  it (no separate overlay), showing the full media uncropped with file name +
  metadata. `←/→` navigate, `Esc` closes.
- **Light / dark** — a theme toggle (top-right), remembered across visits.
- **Particle wordmark** — the "Interstices" logo is set in Instrument Serif and
  rendered as a field of particles that assemble into the letterforms.

## Run

```bash
node serve.mjs     # → http://localhost:8123
# or
npm start
```

`serve.mjs` is a ~60-line zero-dependency static server.

## Deploy

It's a static site — no build. On Vercel it serves the repo root as-is (see
`vercel.json`); any static host works.

## Structure

| file          | what it is                                                    |
| ------------- | ------------------------------------------------------------- |
| `index.html`  | page shell — wall, intro, controls, focus view, credits       |
| `app.js`      | the wall engine: layout, drift, wrap, parting, upload, zoom   |
| `logo.js`     | the particle wordmark                                         |
| `style.css`   | the entire design system (light/dark tokens)                  |
| `serve.mjs`   | local static server                                           |
| `icon.svg`    | favicon                                                       |

## Make it yours

Swap `DEFAULT_PHOTOS` in `app.js` for your own images, or just drag your photos
onto the page. All design tokens (colours, type, spacing) live at the top of
`style.css`.

## Credits

- Demo imagery from [Unsplash](https://unsplash.com) (Unsplash License).
- Type: [Instrument Serif](https://fonts.google.com/specimen/Instrument+Serif)
  and [Geist](https://fonts.google.com/specimen/Geist).
- The particle wordmark is inspired by the PARTICLES effect at
  [shaders.evilrabbit.com](https://shaders.evilrabbit.com).

## License

[GNU AGPL-3.0-or-later](./LICENSE) © 2026 Harshit Khemani ·
[khe.money](https://www.khe.money)
