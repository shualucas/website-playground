# Cartridge assets

The active model is the Famicom cartridge used by mamuso.dev, copied unchanged from its public repository at the user's request. See `models/SOURCE.md` for its exact source, revision and undeclared license status. No reference label artwork is included. Draco decoding uses locally hosted WASM, without a runtime CDN.

`src/cartridge/config.ts` selects the GLB, its orientation and the label node. The loader centers it, normalizes the width to 2.4 units, tints only shell materials, adds local green circuit-board artwork and metallic gold contacts to the original PCB meshes, and maps each local label onto the artwork primitive. The overlapping paper primitive is suppressed. The original procedural Game Boy shell remains in `src/cartridge/model.ts`; clear `cartridgeModel.url` to restore it.

Each entry also defines its shell finish. Stadia, Gmail and Blizzard use strong physical transmission; Search uses a subtler transmission with colored absorption, rather than lowering opacity; their labels stay opaque. Early work uses opaque matte charcoal plastic. Transmissive shells do not cast an opaque silhouette shadow, while their internal PCB still can.

The five active `labels/*-label.svg` files are self-contained editable vector stickers at 1260×600, matching the inspected artwork primitive’s 2.003×0.954 world-unit aspect and full 0–1 UV range. Each includes its own original layout and subtle static print grain. The flat print material preserves the authored ink colors/contrast instead of adding the shell’s studio glare; physical lighting and transmission remain on the housing. Blizzard and Search embed the existing local Blizzard wordmark and gradient Google G. Gmail uses the actual red Gmail mark and vector wordmark lettering in an original red postal routing label with a perforated stamp, SFO cancellation and year barcode; Stadia uses its actual symbol and vector wordmark on an original arcade instruction plate with brushed metal, fasteners and a controls diagram. Logo and wordmark sources, revisions and collection-specific license details are recorded in `/models/BRAND-SOURCES.md`. Other motifs are original vector drawings. Search uses only a centered gradient Google G on a clean white background; its metadata remains in the cartridge caption and reader. No mamuso sticker art is used. The old `*-tonal.svg` panels and earlier Game Boy artwork remain unused, preserved assets.

- Blizzard: Summer 2017, UX Designer internship, Team 1, Heroes of the Storm and Starcraft II, Irvine.
- Gmail & Chat: Summer 2019, Product Designer internship, San Francisco.
- Stadia: 2020–2022, Product Designer, San Francisco.
- Search: 2022–Now, Senior Product Designer, San Francisco.
- Early work: Before 2017, student projects and experiments in design/games. No birth year or inferred starting year.

`src/cartridge/projects.js` uses the same supplied role/location/period information for reader metadata. The labels are fixed print artwork and retain their colors in either page theme.

The earlier linked Sketchfab model is not included. The environment gateway returned HTTP 403 before its page/API could be retrieved; its availability and license remain unverified.
