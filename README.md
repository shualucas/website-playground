# ASCII Sky

A full-screen interactive sky of striped hot-air balloons and puffy clouds, drawn entirely as shaded monospace glyph tiles. The rendering style and lifecycle adapt the MIT-licensed [stackedlol/ascii-sharks](https://github.com/stackedlol/ascii-sharks) source; [Dao-Ho/portfolio](https://github.com/Dao-Ho/portfolio) informed the single-screen composition.

## Run

Node.js 20.19+ or 22.12+ (validated with Node 24).

```sh
npm ci
npm run dev -- --port 3000
```

Geist Mono 600 is bundled locally. No API keys, external runtime requests, image assets, font CDN, or WebGL are needed.

## Interaction

- Balloons drift slowly across the sky; clouds drift more slowly.
- Click/tap a balloon's envelope, ropes, or basket to give it upward lift. Further clicks add lift; a brief burner glow provides feedback.
- Click/tap a cloud to push its puffs apart. They separate and fade, then reform off-screen to drift back into the scene.
- Objects wrap around the sky to keep the scene populated.
- Arrow keys select an object, Enter activates it, and Escape clears the subtle corner markers.
- Space pauses/resumes. Reduced-motion preferences start with a populated still frame.
- Animation suspends off-screen and while the document is hidden.

The scene has no visible text or controls. Its canvas has a screen-reader description of the interactions.

## Edit and source attribution

- `src/sky/renderer.ts`: shaded ASCII cloud puffs, curved balloon stripes, ropes, and baskets.
- `src/sky/world.ts`: cloud dispersal, balloon lift, shared hit geometry, drift, and responsive sizing.
- `src/sky/engine.ts`: fixed timestep, pointer/keyboard interaction, lifecycle, and diagnostics.
- `src/sky/math.ts`: upstream math helpers.
- `src/main.jsx`: React lifecycle, keyboard handling, and local font loading.
- `src/style.css`: full-screen composition.

Licenses and pinned upstream revisions are recorded in `THIRD_PARTY_NOTICES.md`, `src/sky/LICENSE`, and `public/licenses/`.

## Validate and deploy

```sh
npm run typecheck
npm run build
npm test
```

Browser checks cover actual glyph drawing, local fonts, drift speeds, balloon lift, cloud dispersal/reformation, pause, reduced motion, keyboard activation, touch, and responsive sizing.

Vercel: build command `npm run build`, output `dist`. Earlier experiments remain in Git history.
