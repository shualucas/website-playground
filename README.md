# ASCII Pond

A full-screen interactive pond with tadpoles and lily pads. The ASCII cell rasterization, glyph shading, fixed-step lifecycle, and wake diffusion are adapted from the actual [stackedlol/ascii-sharks](https://github.com/stackedlol/ascii-sharks) source. [Dao-Ho/portfolio](https://github.com/Dao-Ho/portfolio) was inspected for its single-screen composition and interaction/lifecycle patterns.

There are no sharks, fish schools, predators, portfolio text, or visible controls. Tadpoles have rounded heads and long undulating tails. They wander calmly, give one another space, avoid the lily pads, and flee pointer/tap disturbances. The green leaves float gently and are rendered with the same shaded ASCII tiles as the animals.

## Run

Node.js 20.19+ or 22.12+ (validated with Node 24).

```sh
npm ci
npm run dev -- --port 3000
```

Geist Mono 600 is bundled locally, matching the shark reference. No font CDN, analytics, images, external runtime requests, API keys, or WebGL are needed.

## Interaction

- Move the pointer or drag a finger to disturb the pond.
- Click/tap to splash and scatter nearby tadpoles.
- Space pauses/resumes without displaying an interface.
- Reduced-motion preferences start at a populated still frame.
- Animation suspends off-screen and while the document is hidden.

The app intentionally ignores the shark demo's species query parameters: all animals remain tadpoles.

## Edit and source attribution

- `src/pond/renderer.ts`: adapted upstream glyph rasterization and wake diffusion; new tadpole silhouette, directional tails, and lily-pad rasterization.
- `src/pond/world.ts`: pond movement, flexible tails, leaf avoidance, splash response, and responsive resizing.
- `src/pond/engine.ts`: adapted fixed timestep, input and lifecycle; keyboard pause and diagnostics.
- `src/pond/math.ts`: upstream math and current helpers.
- `src/main.jsx`: React lifecycle and local font loading.
- `src/style.css`: full-screen composition.

Licenses and pinned upstream revisions are recorded in `THIRD_PARTY_NOTICES.md`, `src/pond/LICENSE`, and `public/licenses/`. Original attribution is preserved; the font's OFL license is included.

## Validate and deploy

```sh
npm run typecheck
npm run build
npm test
```

Type checking covers the TypeScript pond engine. Browser checks cover actual glyphs, tadpole-only population, pads, local fonts, animation, pointer/splash behavior, keyboard pause, reduced motion, touch, and responsive resizing.

Vercel: build command `npm run build`, output `dist`. Earlier experiments remain in Git history. Domain and DNS settings are unchanged.
