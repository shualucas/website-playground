# Cartridge assets

The active model is the Famicom cartridge used by mamuso.dev, copied unchanged from its public repository at the user's request. See `models/SOURCE.md` for its exact source, revision and undeclared license status. No reference label artwork is included. Draco decoding uses locally hosted WASM, without a runtime CDN.

`src/cartridge/config.ts` selects the GLB, its orientation and the label node. The loader centers it, normalizes the width to 2.4 units, tints only shell materials, adds local green circuit-board artwork and metallic gold contacts to the original PCB meshes, and maps each local label onto the artwork primitive. The overlapping paper primitive is suppressed. The original procedural Game Boy shell remains in `src/cartridge/model.ts`; clear `cartridgeModel.url` to restore it.

Each entry also defines its shell finish. Stadia, Gmail and Blizzard use strong physical transmission; Search uses a subtler transmission with colored absorption, rather than lowering opacity; their labels stay opaque. Early work uses opaque matte charcoal plastic. Transmissive shells do not cast an opaque silhouette shadow, while their internal PCB still can.

The five active `labels/*-label.svg` files are self-contained vector stickers at 1260×600, matching the inspected artwork primitive’s 2.003×0.954 world-unit aspect and full 0–1 UV range. They form an original Famicase-inspired collection of printed labels on the existing Famicom geometry. No reference label artwork is included, and this change does not swap the shell to Game Boy Advance geometry.

Each background has a different static print finish, rasterized once with its SVG texture rather than running a per-frame shader:

- Blizzard: satin blue crosshatch, paper tooth, RTS-manual details and monospaced Nimbus Mono PS metadata. The original logo and Team 1 artwork remain; the role shares the period/location type size and weight.
- Gmail: ruby halftone screenprint with warm cream ink, official Gmail wordmark, one Chat mention and geometric URW Gothic metadata in a single small rail.
- Stadia: graphite brushed-metal arcade plate, perforated halftone, slotted fasteners and controls, with the official logo/wordmark and condensed Nimbus Sans Narrow metadata.
- Search: warm-white micro-embossed stock and a faint rounded Search capsule, with a centered gradient G. Senior Product Designer, 2022–Now and SFO all use the same DM Sans size and weight.
- Early work: flecked recycled notebook stock, two-ink details, italic Nimbus Roman headline and monospaced small print.

Display lettering and selected metadata are outlined to preserve each typeface in browser image textures without adding runtime font downloads. Outlined groups retain their wording in `aria-label` and their typeface/size in `data-typeface` / `data-type-size`; the SVG title/description and HTML reader metadata also retain accessible career details. DM Sans comes from the existing Fontsource dependency; Nimbus and URW lettering is rendered from the installed URW Base35 fonts. No font binaries are added. Other text remains editable SVG text.

The flat print material preserves authored ink colors/contrast instead of adding the shell’s studio glare; physical lighting and transmission remain on the housing. Blizzard and Search embed the existing local Blizzard wordmark and gradient Google G. The Blizzard drawing inherits even-odd filling to preserve its letter openings. Logo and wordmark sources, revisions and collection-specific license details are recorded in `/models/BRAND-SOURCES.md`. Other motifs are original vector drawings. Every label prints each visible fact once; no field headings or redundant company names are added. The old `*-tonal.svg` panels and earlier Game Boy artwork remain unused, preserved assets.

- Blizzard: Summer 2017, UX Designer internship, Team 1, Heroes of the Storm and Starcraft II, Irvine.
- Gmail & Chat: Summer 2019, Product Designer internship, San Francisco.
- Stadia: 2020–2022, Product Designer, San Francisco.
- Search: 2022–Now, Senior Product Designer, San Francisco.
- Early work: Before 2017, student projects and experiments in design/games. No birth year or inferred starting year.

`src/cartridge/projects.js` uses the same supplied role/location/period information for reader metadata. The labels are fixed print artwork and retain their colors in either page theme.

The earlier linked Sketchfab model is not included. The environment gateway returned HTTP 403 before its page/API could be retrieved; its availability and license remain unverified.

The requested GoogleDesign X feed and design.google site were blocked by the environment gateway during this revision. The accessible fallback was Google's official `material-components/material-web` source at commit `46092cc3fd459743e2e3fb19d6a9fa80aa3ac637`: [shape tokens](https://github.com/material-components/material-web/blob/46092cc3fd459743e2e3fb19d6a9fa80aa3ac637/tokens/versions/v0_192/_md-sys-shape.scss), [tonal surface/color tokens](https://github.com/material-components/material-web/blob/46092cc3fd459743e2e3fb19d6a9fa80aa3ac637/tokens/versions/v0_192/_md-sys-color.scss) and [typeface/weight tokens](https://github.com/material-components/material-web/blob/46092cc3fd459743e2e3fb19d6a9fa80aa3ac637/tokens/versions/v0_192/_md-ref-typeface.scss). The Search composition and warm palette are original adaptations; no social-media artwork or component code was copied.
