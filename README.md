# Josh Lucas — a journey through design

A React + Three.js portfolio inspired by the uploaded cinematic map reference. A fixed 3D coastal landscape moves beneath a restrained narrative as visitors scroll through chapters. The bottom timeline supports direct navigation, and case study chapters open a five-part story scaffold.

The scene is an original, locally generated landscape, not the reference's exact geographic map. Text, colors, positioning, camera travel, and navigation follow the reference's direction. Employer histories, dates, outcomes, and locations have not been invented. Replace the clearly labeled project placeholders with verified details.

## Develop

Use Node.js 20.19+ or 22.12+ (validated with Node 24).

```sh
npm ci
npm run dev -- --port 3000
```

No external services, map tokens, remote tiles, fonts, or runtime credentials are required. The original frog pond remains accessible at `/pond.html`.

## Edit

- `src/journey/chapters.js`: chapter labels, copy, notes, and case study prompts.
- `src/journey/main.jsx`: React navigation, scrolling, dialogs, index, and accessibility controls.
- `src/journey/MapScene.jsx`: Three.js coastal terrain, streets, buildings, contours, camera paths, and non-WebGL fallback.
- `src/journey/journey.css`: warm brown palette, centered text, fading treatment, timeline, and responsive layout.

Scroll or swipe to move through the journey. Click a timeline label, use the index, or press arrow keys to jump chapters. Home/End work when the page background is focused. The motion control turns off camera smoothing and pointer parallax; system reduced-motion preferences are respected. The reveal-text control removes the decorative paragraph fade. Case study dialogs close with Escape and contain placeholders for real project evidence.

The WebGL scene is lazy-loaded and stops redrawing when idle. A local 2D illustration keeps the narrative and case study flow usable if WebGL is unavailable. Viewport resizing and touch scrolling are supported.

## Validate

```sh
npm run build
npm test
```

Tests use Chromium at `/usr/bin/chromium` with software WebGL for this cloud environment. Playwright starts or reuses a development server. Tests exercise actual map rendering, scroll-driven camera changes, timeline and keyboard navigation, case study chapters, the index, readable text, mobile sizing, reduced motion, the no-WebGL fallback, and the original pond interactions.

Production output is in `dist`. Vercel can deploy this Vite project using `npm run build` and output directory `dist`. This repository does not change the live Framer domain or DNS.
