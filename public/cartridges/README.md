# Cartridge assets

The shipped shell is original procedural geometry (`src/cartridge/model.ts`), **not** a downloaded Sketchfab model or the mamuso.dev asset. The build environment’s connection gateway rejected the tunnel with HTTP 403 before the Sketchfab page or API could be retrieved, so its download availability and license could not be verified:
https://sketchfab.com/3d-models/game-cartridge-gameboy-aa19e18342014d01a026770d32200a7f

## Labels

The five active `*-tonal.svg` files under `labels/` are blank tonal panels for Blizzard, Gmail, Stadia, Search, and Early work. Earlier printed label artwork is retained but unused. Change them directly or replace their paths in `src/cartridge/config.ts`. Artwork is mapped to a roughly 1.11:1 paper label. Export SVGs with explicit width/height and embedded assets; for exact typography across devices, outline text. PNG/JPG also work. Refresh the site to reload replaced assets.

## Optional authored model

If you download the linked model with its permitted usage/license, retain its attribution and any accompanying files. Prefer a GLB with embedded textures. Put it under `public/cartridges/models/` and set `cartridgeModel.url` in `src/cartridge/config.ts`. Set `labelMesh` to its artwork mesh name. Adjust `rotation` to put the front toward +Z and top toward +Y. The importer centers it and normalizes its width to 2.4 units.

The label mesh must have usable UVs. Non-label material colors receive the per-project shell tint; adapt the importer if the model has separate connector or hardware materials you want to keep. It may also need its label aspect ratio adjusted. Model replacement requires a visual check; arbitrary assets are not guaranteed to share the procedural shell's orientation or proportions.
