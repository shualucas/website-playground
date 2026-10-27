# The Spellbook

A white, full-screen portfolio centered on a textured, rounded Three.js journal. The left page holds project metadata; the right contains only a swirling ASCII portal. Navigation arrows live in the left page’s folio.

The leather binding, curved parchment gutter, compressed inner page edges, and sewn threads form one connected book. The cover has no central emblem or lettering.

## Run

Node.js 20.19+ or 22.12+ (validated with Node 24).

```sh
npm ci
npm run dev -- --port 3000
```

Fonts and assets are local. Leather, parchment, surface detail, window reflections, and the portal are generated in code; no external model, API key, image service, or font CDN is required.

## Interaction

- Drag anywhere on the opened book—including a page, the binding, or a page control—to pick up the whole book. Release to drop it onto the table. The current project and open spread stay intact.
- A small movement threshold keeps ordinary button clicks working. Mouse and touch use pointer capture, including cancellation and release outside the original target.
- Click the arrows on the left page, or use Left/Right keys, to turn projects. Dragging is reserved for moving the book.
- Click/tap the ASCII portal or case-study link to open the reading dialog. Escape closes it.
- **R** resets the book’s placement and replays the opening from the first project. Space or Escape skips an opening/turn.
- The opening runs for 7.4 seconds of animation time, keeping its 64 blank leaves but spacing their turns more calmly. Individual project turns take roughly two seconds, with a slower outer-edge follow-through. Riffled faces are blank; the final leaf reveals the first project.
- Turning and resting pages share the exact same captured artwork, matching geometry/material settings, and render resolution. The right-page ASCII animation is part of that same page texture, so it moves with the paper.
- The camera stays fixed through the opening, page turns, and pickup; it only reframes on viewport resize. Pickup is constrained to keep the book visible.
- Window-like daylight, cool room fill, and contact shadows anchor the book to the table. A small dust puff appears on impact, including after dropping a moved book.
- Reduced motion starts directly on the first spread and freezes the portal. Explicit pickup/drop remains available; page-button navigation changes immediately.
- Rendering pauses off-screen and while the document is hidden. Software WebGL uses simpler normal-mapped lighting; GPU rendering retains physical materials and filtered reflections.
- Without WebGL, a usable HTML spread retains the metadata, ASCII portal, navigation, and reading view.

## Add projects

The three chapters currently contain labeled sample content. Edit `src/book/projects.js`:

1. Replace the title, subtitle, description, role, team, year, disciplines, and chapters. Set `sample: false`.
2. Add `previewImage` and `imageAlt` to show project imagery in the reading dialog. Images can live in `public/projects/`.
3. Set `caseStudyUrl` if the complete study lives elsewhere. Add or remove entries as needed.

Project URLs are shareable as `?project=first-project` or another entry ID. Reloading regenerates the printed pages from the same React layout and locally embedded fonts.

## Implementation

- `src/book/BookScene.ts`: physical book, fixed framing, opening/turn choreography, shared printed surfaces, pickup, raycasting, contact/dust placement, lifecycle and cleanup.
- `src/book/binding.ts`: curved leather spine, continuous parchment saddle, sewn threads, and compressed inner paper edges.
- `src/book/page-turn.ts`: reference-informed 30-section articulation, separately shaped inner/outer curves and corner fold, and slower frame-rate-independent damping.
- `src/book/motion.ts`: damped pickup, gravity, friction, and a small landing rebound.
- `src/book/ascii.ts`: animated arched portal made from real monospace characters and shaded cells.
- `src/book/materials.ts`: leather, parchment, page edges, and captured page artwork.
- `src/book/surfaces.ts`: normal/roughness detail, a generated window-light environment, and rounded slabs.
- `src/book/effects.ts`: impact dust and the tabletop contact shadow.
- `src/main.jsx`: React content, `html-to-image` page capture, invisible accessible hit surfaces, on-page navigation, reading dialog, keyboard controls, and HTML fallback.

## Validate and deploy

```sh
npm run typecheck
npm run build
npm test
```

Browser checks use `/usr/bin/chromium` with software WebGL. They cover ASCII drawing, captured layouts, object pickup from pages and controls, placement persistence, shared turning/resting textures, fixed framing, the denser opening, R reset, reduced motion, touch, and the HTML fallback.

Vercel: build `npm run build`, output `dist`. See `THIRD_PARTY_NOTICES.md` for licenses.
