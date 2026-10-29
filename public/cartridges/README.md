# Cartridge assets

The active model is the Famicom cartridge used by mamuso.dev, copied unchanged from its public repository at the user's request. See `models/SOURCE.md` for its exact source, revision and undeclared license status. No reference label artwork is included. Draco decoding uses locally hosted WASM, without a runtime CDN.

`src/cartridge/config.ts` selects the GLB, its orientation and the label node. The loader centers it, normalizes the width to 2.4 units, tints only shell materials, adds local green circuit-board artwork and metallic gold contacts to the original PCB meshes, and maps each local label onto the artwork primitive. The overlapping paper primitive is suppressed. The original procedural Game Boy shell remains in `src/cartridge/model.ts`; clear `cartridgeModel.url` to restore it.

Each entry also defines its shell finish. Gmail and Blizzard use physical transmission with colored absorption, rather than lowering opacity; their labels stay opaque. Search, Stadia and Early work use opaque matte plastic. Transmissive shells do not cast an opaque silhouette shadow, while their internal PCB still can.

The five active `labels/*-tonal.svg` files are original blank tonal panels. Replace their configured paths with SVG/PNG/JPG artwork when ready. The Famicom label is wider than the old Game Boy label; prepare artwork at roughly a 2:1 aspect and visually check its UV mapping. Earlier printed label designs remain unused.

The earlier linked Sketchfab model is not included. The environment gateway returned HTTP 403 before its page/API could be retrieved; its availability and license remain unverified.
