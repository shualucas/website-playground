# Cartridge assets

The active model is the Famicom cartridge used by mamuso.dev, copied unchanged from its public repository at the user's request. See `models/SOURCE.md` for its exact source, revision and undeclared license status. No reference label artwork is included. Draco decoding uses locally hosted WASM, without a runtime CDN.

`src/cartridge/config.ts` selects the GLB, its orientation and the label node. The loader centers it, normalizes the width to 2.4 units, tints only shell materials, adds local green circuit-board artwork and metallic gold contacts to the original PCB meshes, and maps each local label onto the artwork primitive. The overlapping paper primitive is suppressed. The original procedural Game Boy shell remains in `src/cartridge/model.ts`; clear `cartridgeModel.url` to restore it.

Each entry also defines its shell finish. Stadia, Gmail and Blizzard use strong physical transmission; Search uses a subtler transmission with colored absorption, rather than lowering opacity; their labels stay opaque. Early work uses opaque matte charcoal plastic. Transmissive shells do not cast an opaque silhouette shadow, while their internal PCB still can.

The five active `labels/*-label.svg` files are self-contained vector stickers at 1260×600, matching the inspected artwork primitive’s 2.003×0.954 world-unit aspect and full 0–1 UV range. They form an original Famicase-inspired collection of printed labels on the existing Famicom geometry. No reference label artwork is included, and this change does not swap the shell to Game Boy Advance geometry.

Each background has a different static print finish, rasterized once with its SVG texture rather than running a per-frame shader:

- Blizzard: icy RTS box art with an original faceted crystal and tactical landscape, the official wordmark and Team 1, plus typewriter metadata. The logo retains even-odd letter openings.
- Gmail: red-and-cream screenprint with diagonal halftone, a layered inbox illustration and a geometric @ supergraphic. Official Gmail lettering and the single Chat mention remain; the small print is arranged in two loose rows.
- Stadia: an illustrated controller floating on a cloud against a magenta and orange sky, with the official symbol/wordmark, condensed display lettering and a dark metadata rail.
- Search: contemporary Material-inspired rounded geometry cropped at the edges of warm-white stock, muted Google colors, a centered gradient G and DM Sans small print. The role, period and location share one type size and weight.
- Early work: lime-and-green student fanzine treatment with an italic Nimbus Roman headline, original 5×7 pixel WORK lettering, an original browser-game spaceship scene and red pencil doodles.

The user's Famicase collection image informs the variety of composition, illustration and typography. All illustration is newly drawn SVG geometry; no individual cartridge label from that image is reproduced. Physical shells, model interactions and navigation are unchanged. Each label retains a different static grain/print pattern, and role/location/period details remain secondary to the artwork.

Display lettering and selected metadata are outlined to preserve each typeface in browser image textures without adding runtime font downloads. Outlined groups retain their wording in `aria-label` and their typeface/size in `data-typeface` / `data-type-size`; the SVG title/description and HTML reader metadata also retain accessible career details. DM Sans comes from the existing Fontsource dependency; Nimbus and URW lettering is rendered from the installed URW Base35 fonts. The block WORK glyphs are original rectangles on a 5×7 grid. No font binaries are added. Other text remains editable SVG text.

The flat print material preserves authored ink colors/contrast instead of adding the shell’s studio glare; physical lighting and transmission remain on the housing. Blizzard and Search embed the existing local Blizzard wordmark and gradient Google G. The Blizzard drawing inherits even-odd filling to preserve its letter openings. Logo and wordmark sources, revisions and collection-specific license details are recorded in `/models/BRAND-SOURCES.md`. Other motifs are original vector drawings. Every label prints each visible fact once; no field headings or redundant company names are added. The old `*-tonal.svg` panels and earlier Game Boy artwork remain unused, preserved assets.

- Blizzard: Summer 2017, UX Designer internship, Team 1, Heroes of the Storm and Starcraft II, Irvine.
- Gmail & Chat: Summer 2019, Product Designer internship, San Francisco.
- Stadia: 2020–2022, Product Designer, San Francisco.
- Search: 2022–Now, Senior Product Designer, San Francisco.
- Early work: Before 2017, student projects and experiments in design/games. No birth year or inferred starting year.

`src/cartridge/projects.js` uses the same supplied role/location/period information for reader metadata. The labels are fixed print artwork and retain their colors in either page theme.

The earlier linked Sketchfab model is not included. The environment gateway returned HTTP 403 before its page/API could be retrieved; its availability and license remain unverified.

The requested GoogleDesign X feed and design.google site were blocked by the environment gateway during this revision. The accessible fallback was Google's official `material-components/material-web` source at commit `46092cc3fd459743e2e3fb19d6a9fa80aa3ac637`: [shape tokens](https://github.com/material-components/material-web/blob/46092cc3fd459743e2e3fb19d6a9fa80aa3ac637/tokens/versions/v0_192/_md-sys-shape.scss), [tonal surface/color tokens](https://github.com/material-components/material-web/blob/46092cc3fd459743e2e3fb19d6a9fa80aa3ac637/tokens/versions/v0_192/_md-sys-color.scss) and [typeface/weight tokens](https://github.com/material-components/material-web/blob/46092cc3fd459743e2e3fb19d6a9fa80aa3ac637/tokens/versions/v0_192/_md-ref-typeface.scss). The Search composition and warm palette are original adaptations; no social-media artwork or component code was copied.
