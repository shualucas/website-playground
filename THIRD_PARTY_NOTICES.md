# Source references and licenses

## ASCII Sharks

The ASCII tile renderer, shading approach, fixed-step lifecycle, and math helpers in `src/sky/` are adapted from:

- Repository: https://github.com/stackedlol/ascii-sharks
- Revision: `a0074c16a106f0abc665fe9712ca445f8f98ad8e`
- License: MIT, Copyright (c) 2026 drewdi
- Full license: `src/sky/LICENSE` and `public/licenses/ascii-sharks-MIT.txt`

Local changes replace the aquatic simulation with drifting hot-air balloons and clouds. The screen-aligned cell rasterization, glyph shading, math helpers, and fixed-step lifecycle are adapted from upstream. New balloon envelope geometry, striped gores, baskets, cloud-puff geometry, shared hit testing, upward lift, cloud dispersal, keyboard interaction, and responsive resizing are included.

## Dao Ho portfolio

Visual and architectural reference: https://github.com/Dao-Ho/portfolio at revision `7fe372a1bd1308b8683e2e97bc6fe51522e2912f`.

The single-screen composition, local monospace typography, pointer handling, reduced-motion behavior, and lifecycle were inspected. No portfolio source, biography, employer claims, analytics, photographs, or nested Git archive is copied into this project.

## Geist Mono

Geist Mono 600 is distributed locally through `@fontsource/geist-mono`. Its OFL license is included in `public/licenses/Geist-Mono-OFL.txt`. There are no Google Fonts or other external runtime requests.
