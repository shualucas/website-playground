# Field Notes — RISO Zine

An interactive portfolio presented as a thin, saddle-stitched RISO zine. Blue and fluorescent-pink inks, halftone cover art, slight registration offsets, and visible grain sit on warm uncoated stock. All cover art, paper detail, lighting, and animated two-ink ASCII artwork are generated locally.

The floating, angled composition, page highlights, and flexible turns follow the [Animated Book Slider Three.js reference](https://github.com/pakagronglb/animated-book-slider-threejs), adapted to the existing project scaffolding.

## Run

Node.js 20.19+ or 22.12+ (validated with Node 24).

```sh
npm ci
npm run dev -- --port 3000
```

## Interaction

- Drag a page, control, or closed cover to rotate the zine around its fixed center. Screen-relative quaternion rotation supports full revolutions without Euler pole locking. Mouse/touch keep a six-pixel click threshold, cancellation, and pointer capture.
- Hover a physical leaf for a subtle pink glow. Click right to advance or left to go back; the covers open on click. Page-wide pointer actions raycast the deformed meshes instead of depending on flat HTML page hit areas. Explicit reading controls and keyboard leaf actions remain accessible.
- Use Cover / Page 1–3 / Back Cover pills, on-page arrows, or Left/Right keys. Every relative click advances the requested destination. Up to three leaves animate concurrently, with starts spaced 100–180 ms apart. Direction changes retarget existing leaves while preserving their motion.
- Choose **Read the case study** to open the reading dialog; Escape closes it. Project/URL state commits only when the requested spread settles, avoiding mismatched reading content during a riffle.
- **R** resets rotation and replays the opening on the first project. Space/Escape completes the requested transition immediately.
- The opening uses the same printed leaves as regular navigation: a light arrival, overlapping riffle, and return to the chosen project. Its minimum choreography lasts 3.4 seconds, followed by any remaining joint settling. No anonymous blank sheets or moving/resting texture swaps are used.
- A fixed 24° camera uses a conservative spherical envelope for every page pose and orientation. Its framing stays unchanged during navigation. A studio light projects the actual skinned-page silhouettes onto the ground.
- Reduced motion opens immediately, freezes the ASCII artwork and scrolling type, and makes page changes and explicit rotation immediate. HTML navigation/reading access remains available without WebGL.
- Rendering pauses offscreen and when hidden. Software WebGL uses simpler materials; the physical material path keeps matte paper, grain, and studio reflections. This is articulated paper animation, not a cloth/contact simulation.

## Persistent leaf model

Each physical leaf owns one mesh, one 31-bone skeleton, and permanent front/back textures. The front cover's reverse is the first project's metadata; each following leaf pairs a project preview with the next project's metadata, ending at the back cover. Three projects therefore use four physical leaves/eight printed faces.

Paper and covers share two bind-pose geometries. GPU skinning deforms positions, normals, and shadow depth consistently. Hinge, bend, and fold states ease independently; covers have restrained bending. Vertex buffers are not rewritten during animation. Conservative per-leaf bounds support culling/raycasting, and skeleton matrices are synchronized before pointer queries. No new runtime dependency or React Three Fiber migration is required.

## Add projects

The three entries currently contain labeled sample content. Edit `src/book/projects.js`:

1. Replace the title, subtitle, description, role, team, year, disciplines, and chapters. Set `sample: false`.
2. Add `previewImage` and `imageAlt` for project imagery in the reading dialog. Images can live in `public/projects/`.
3. Set `caseStudyUrl` if the complete study lives elsewhere. Add or remove entries as needed.

Project URLs are shareable as `?project=first-project` or another entry ID. Reloading regenerates the printed pages from the same React layout and locally embedded fonts.

## Implementation

- `src/book/BookScene.ts`: scene lifecycle, leaf/content registry, fixed framing, quaternion input, mesh picking, printed accessibility overlays, lighting, artwork, and commit callbacks.
- `src/book/leaf.ts`: shared weighted geometry, persistent skinned leaf, independent joint damping, thickness, bounds, and skeleton lifecycle.
- `src/book/turn-scheduler.ts`: requested/launched/committed spread states, overlapping turns, bounded concurrency, and reversals.
- `src/book/binding.ts`: folded paper saddle and two staples.
- `src/book/paper-flex.ts`: damped motion response feeding the leaf joints.
- `src/book/materials.ts` and `ascii.ts`: original RISO cover/colophon, captured layouts, paper grain, and animated two-ink artwork.
- `src/book/surfaces.ts` and `effects.ts`: generated studio environment, surface detail, and contact shadow.
- `src/main.jsx`: React content, shared print capture, navigation, reader, keyboard input, and HTML fallback.

## Validate and deploy

```sh
npm run typecheck
npm run build
npm test
```

Browser checks use `/usr/bin/chromium` with software WebGL. They cover physical page identity/artwork, unchanged bind-pose vertices, overlapping and interrupted turns, requested versus settled state, full fixed-center rotation, hover/focus, raycast page clicks, cover continuity, intro framing, reduced motion, touch, and the HTML fallback.

Vercel: build `npm run build`, output `dist`. See `THIRD_PARTY_NOTICES.md` for licenses. Fonts and assets are local; no external model, font CDN, API key, or image service is required.
