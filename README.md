# Meadow — light through the grass

A full-screen top-down grass field inspired by the uploaded clip's soft, grainy light and star-like sun reflections. The visible ASCII grid has been replaced with a painterly, organic rendering. The scene remains grass, with no on-screen text, controls, horizon, or overlays.

The native WebGL shader renders curved fine fibers, irregular tufts, broad moving light, film grain, and small dew glints. Cursor/touch pressure bends the surface; a short history of decaying impulses leaves a wake that relaxes after the pointer leaves. Wind, grain, and glints are generated live, not played from a video. A local Canvas 2D fallback provides grainy grass, light bands, highlights, and pointer response if WebGL is unavailable.

## Run

Use Node.js 20.19+ or 22.12+ (validated with Node 24).

```sh
npm ci
npm run dev -- --port 3000
```

No external assets, services, credentials, or runtime network requests are required.

## Interaction

- Move the cursor or drag a finger through the grass.
- Space pauses or resumes the entire scene without displaying an interface.
- Reduced-motion preferences start still; Space explicitly resumes.
- The canvas has a nonvisual screen-reader description and keyboard focus support.

## Edit and verify

- `src/meadow.js`: grass shader, flowing light, grain, dew glints, cursor wake, rendering lifecycle, and 2D fallback.
- `src/main.jsx`: canvas lifecycle and keyboard pause.
- `src/style.css`: full-viewport scene without an interface.

```sh
npm run build
npm test
```

Browser tests use Chromium with software WebGL in the cloud environment and cover real image changes, no visible UI, pointer effects, wake recovery, pause, reduced motion, touch, resize, and the 2D fallback. Rendering resolution is capped and updates pause when the document is hidden.

Vercel: build command `npm run build`, output directory `dist`.
