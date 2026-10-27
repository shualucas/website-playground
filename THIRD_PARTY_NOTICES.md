# Source references and licenses

## ASCII Sharks

The ASCII renderer, artificial-life world, shark shapes, species, and math helpers in `src/pond/` are adapted directly from:

- Repository: https://github.com/stackedlol/ascii-sharks
- Revision: `a0074c16a106f0abc665fe9712ca445f8f98ad8e`
- License: MIT, Copyright (c) 2026 drewdi
- Full license: `src/pond/LICENSE` and `public/licenses/ascii-sharks-MIT.txt`

Local changes replace the shark silhouettes, species, fish schools, and hunting with a tadpole-only pond simulation. The upstream cell rasterization, body shading, glyph ramps, wake diffusion, math helpers, fixed-step loop, and follow-the-leader tail technique are adapted. New lily-pad geometry, directional tadpole tails, pond avoidance, keyboard pause, diagnostics, touch cleanup, visibility handling, and resize adaptation are included.

## Dao Ho portfolio

Visual and architectural reference: https://github.com/Dao-Ho/portfolio at revision `7fe372a1bd1308b8683e2e97bc6fe51522e2912f`.

The single-screen composition, local monospace typography, pointer handling, reduced-motion behavior, and lifecycle were inspected. No portfolio source, biography, employer claims, analytics, photographs, or nested Git archive is copied into this project.

## Geist Mono

Geist Mono 600 is distributed locally through `@fontsource/geist-mono`. Its OFL license is included in `public/licenses/Geist-Mono-OFL.txt`. There are no Google Fonts or other external runtime requests.
