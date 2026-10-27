# The Spellbook

A white, full-screen portfolio centered on a thick, rounded Three.js spellbook. There is no surrounding site header, footer, toolbar, or project list. Navigation and case-study links live on the pages.

On entry, the closed book drops onto the surface, rebounds, opens, and riffles from right to left. A final slower leaf lands on the first project. The left page carries its metadata; the right page holds a stone-framed, animated green portal.

## Run

Node.js 20.19+ or 22.12+ (validated with Node 24).

```sh
npm ci
npm run dev -- --port 3000
```

The book, pebbled leather, parchment fibers, normal/roughness maps, stonework, studio reflection environment, and swirling portal are generated locally. Fonts are bundled. No external model, image service, API key, or font CDN is required.

## Interaction

- Drag the right page toward the left to advance. Drag the left page toward the right to return.
- The segmented leaf bends along its width, twists with the vertical drag, and follows the pointer continuously. Release past the midpoint or flick to finish; a short drag falls back with a damped spring.
- Mouse and touch use pointer capture, including release outside the book and cancelled gestures.
- Page-corner buttons and Left/Right keys also change projects.
- Click/tap the portal or the case-study link to open the reading dialog. Escape closes it.
- **R** restarts the opening from the first chapter, including after navigating to another project. Space or Escape skips an opening/turn.
- The camera is fitted against sampled geometry from the complete drop, raised cover, page fan, and corner drags. One fixed lens/framing is then used throughout; it only reframes on viewport resize.
- Reduced motion bypasses the ambient opening and freezes the portal. Direct dragging is still available; button navigation changes immediately.
- Rendering suspends off-screen and while the document is hidden. Static shadows are cached. Software WebGL uses normal-mapped lighting and cube reflections, with reduced resolution during movement; GPU rendering retains physical materials and filtered studio reflections. Shaders are warmed before animation, and the portal light remains in the light set to avoid shader recompilation during turns.
- Without WebGL, an HTML book layout retains the pages, navigation, portal illustration, and reading dialog.

## Add projects

The three current chapters contain explicitly labeled sample content. Edit `src/book/projects.js` to replace it.

1. Update title, subtitle, description, role, team, year, disciplines, and case-study chapters. Set `sample: false`.
2. To replace the portal’s placeholder content with an image, put a file in `public/projects/`, set `previewImage: '/projects/your-image.webp'`, and write its `imageAlt`. External image URLs also work.
3. Add a `caseStudyUrl` when the complete case study lives elsewhere. Add/remove entries as needed.

Project URLs can be shared as `?project=first-project` or another entry ID.

## Implementation

- `src/book/BookScene.ts`: fixed camera, rounded binding and page blocks, drop/rebound choreography, forward riffles, raycast dragging, curved leaf geometry, two-sided printed pages, spring settling, visibility and cleanup.
- `src/book/materials.ts`: procedural leather, parchment fibers, fine page edges, printed leaf textures, textured stone arch, runes, and the seamless portal shader.
- `src/book/surfaces.ts`: albedo/normal/roughness detail, a generated HDR studio environment, and rounded slabs whose corner radius is independent of their thickness.
- `src/book/effects.ts`: a short-lived ring of impact dust and a soft contact shadow. Dust starts at the table impact, disperses, fades, and resets with R; reduced motion suppresses it.
- `src/main.jsx`: React content, CSS3D printing, independent underlying page content during turns, on-page controls, keyboard interaction, reading dialog, and HTML fallback.
- `src/style.css`: book-page typography and reading layout. No surrounding site UI.

Three.js supplies the physical geometry, lighting, depth and shadows. Crisp HTML text sits on matching CSS3D surfaces; the portion covered by a turning leaf is clipped while the leaf carries its own two-sided printed texture. The book has approximately 220 implied paper leaves, fine edge lines and uneven signatures, plus 22 animated sheets in the opening.

## Validate and deploy

```sh
npm run typecheck
npm run build
npm test
```

Browser checks use `/usr/bin/chromium` with software WebGL. They cover the book-only composition, actual mouse/touch dragging and cancellation, page-corner controls, fixed camera, projected bounds through the whole opening, R restart, forward riffles, actual dust draw calls and lifecycle, live/frozen portal pixels, reading dialog, and HTML fallback.

Vercel: build `npm run build`, output `dist`. See `THIRD_PARTY_NOTICES.md` for licenses.
