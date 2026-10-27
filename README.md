# Meadow — a living ASCII field

An edge-to-edge, top-down field of vibrant green ASCII grass. There is no visible text, interface, landscape horizon, sky, or overlay. All marks in the scene are literal ASCII glyphs, drawn over colored square tiles inspired by the koi reference.

A locally generated, top-down physical grass field is sampled into a screen-aligned character grid. Coherent wind waves move continuously across the field. Cursor movement and touch apply radial pressure and movement impulses; damped springs retain a wake and let the blades recover. The top-down view uses the same scale throughout the screen.

## Run

Use Node.js 20.19+ or 22.12+ (validated with Node 24).

```sh
npm ci
npm run dev -- --port 3000
```

No external assets, services, credentials, or network requests are required at runtime.

## Interaction

- Move the cursor or drag a finger through the grass.
- Space pauses or resumes without showing any interface.
- Reduced-motion preferences start the scene still; Space explicitly resumes it.
- The canvas has a nonvisual screen-reader description and keyboard focus support.

## Edit and verify

- `src/meadow.js`: top-down tufts, wind, springs, palette, ASCII sampling, and rendering.
- `src/main.jsx`: canvas lifecycle and keyboard pause.
- `src/style.css`: full-viewport coverage; no visible interface.

```sh
npm run build
npm test
```

Browser tests verify actual ASCII draw calls, no visible DOM text or controls, continuous wind, pointer pressure and recovery, keyboard pause, reduced motion, touch, and resize. Chromium is provided at `/usr/bin/chromium` in this workspace.

Vercel: build command `npm run build`, output directory `dist`.
