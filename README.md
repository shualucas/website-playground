# Josh Lucas — a geographic journey through design

A React + MapLibre portfolio with a white map, quiet typography, selective color accents, and a scroll-driven geographic story:

1. San Francisco — today
2. Cumming, Georgia — the beginning
3. Irvine, California — Blizzard
4. San Francisco — Google

These locations and employers were supplied by Josh. Dates, roles, project details, and outcomes remain unspecified. Pins are city centers, not office or home addresses.

## Map data

The landscape is no longer procedural. MapLibre renders real geographic data:

- **Regional map:** bundled Natural Earth coastlines, state boundaries, and actual roads. This remains usable when external services are blocked.
- **Detailed live map:** OpenFreeMap's OpenStreetMap-based Positron style, restyled in white. It needs access to `https://tiles.openfreemap.org`, but no API key. Where available, building heights come from the source data; missing heights are not invented.
- **Without WebGL:** a local SVG view uses the same geographic coordinates and datasets.

Attribution remains visible. See `public/data/SOURCES.md` for provenance, licenses, city coordinates, and limitations. Natural Earth is regional data, not a detailed street map. The connection arcs link story locations; they do not claim actual flight or driving routes. This version does not use real elevation tiles or claim measured 3D terrain.

The workspace currently cannot connect successfully to the live tile host. Regional data rendering is verified here. The live-style transition has a controlled fixture test; that is not verification of the external provider. A deployed browser with normal Internet access can load the detailed tiles. A failed live upgrade falls back to the real regional dataset.

## Develop

Use Node.js 20.19+ or 22.12+ (validated with Node 24).

```sh
npm ci
npm run dev -- --port 3000
```

The MapLibre worker is bundled locally; it does not depend on a CDN. The original frog pond remains at `/pond.html`.

## Edit

- `src/journey/chapters.js`: journey order, city coordinates, camera settings, employer accents, copy, and case study prompts.
- `src/journey/main.jsx`: React story, timeline, index, dialogs, keyboard support, and motion controls.
- `src/journey/MapScene.jsx`: MapLibre, local data layers, live style, routes, markers, flights, attribution, and no-WebGL fallback.
- `src/journey/journey.css`: white palette, typography, responsive layout, and selective color.
- `public/data/*.geojson`: the real regional datasets shipped with the site.

Scroll/swipe, use timeline labels or the index, or use the arrow keys to move between chapters. Reduced motion disables camera flights. Reveal text removes the decorative paragraph fade. Case study dialogs use five chapters and close with Escape.

## Validate and deploy

```sh
npm run build
npm test
```

Browser tests use Chromium at `/usr/bin/chromium` with software WebGL. They verify real local road rendering, city camera coordinates, the requested order, white styling, attribution, company accents, case studies, keyboard/mobile navigation, reduced motion, SVG fallback, live-style loader behavior with a fixture, and the preserved pond.

Vercel settings: build command `npm run build`, output `dist`. Domain and DNS changes are separate from deploying this repository.
