# Selected Things — Portfolio Zine

An interactive portfolio presented as a saddle-stitched independent edition. A monochrome contour cover, small typography and neutral controls sit on a white or charcoal background. Left pages use black editorial type on white paper. Right pages retain full-bleed, high-contrast ASCII vortices: neutral for About, orange/magenta for Stadia, Google colors for AI Mode. All artwork, textures and miniatures are generated locally.

The floating, angled composition, page highlights, and flexible turns follow the [Animated Book Slider Three.js reference](https://github.com/pakagronglb/animated-book-slider-threejs), adapted to the existing project scaffolding.

## Run

Node.js 20.19+ or 22.12+ (validated with Node 24).

```sh
npm ci
npm run dev -- --port 3000
```

## Interaction

- The loader waits until at least 1.5 seconds after navigation starts, and until fonts, page capture, framing preparation and the first WebGL render are ready. A 0.85-second spring reveal brings in the **closed cover**; navigation fades in independently. The zine does not open automatically on the home URL.
- The cover gently bobs and rocks on a roughly 13-second cycle inspired by Drei's Float. Dragging eases down ambient motion; releasing restores it. **R** and the top-right restart button share one routine that resets orientation and returns to the closed-cover arrival, without reloading assets.
- Drag either leaf, its pop-ups, a reading control or the cover to rotate around a fixed center through full revolutions. Mouse/touch retain six-pixel click discrimination, pointer capture and cancellation.
- Hover or keyboard-focus a page for a neutral glow at intensity 0.264. Stage focus highlights the book; it never outlines the viewport. Click the right page to advance or the left to go back.
- Navigation is **Cover / About / Stadia / AI Mode / Back cover**. Arrow keys and printed page arrows also work. Every relative input accumulates into the requested destination; up to four leaves overlap. The final cover can launch with the other leaves still moving, avoiding an intermediate stop before closure. Direction changes retarget moving leaves. The requested navigation pill highlights immediately; reading content and the URL continue to commit only after the final spread settles.
- Each right page retains its own project-colored, full-page ASCII vortex beneath three 3D objects. About contains a detailed film camera, strung racket with coral grip tape and a purple GameCube-style controller. Other project objects use thicker forms. Pop-ups inherit their leaf's bone transforms. They unfold in 110 ms staggers and tuck away within 180 ms before a turn; input continues to queue while they retract. Only the final settled spread reveals its objects.
- About has its own introduction layout and reading link. Stadia and AI Mode expose **Read the case study**. Escape closes the reading dialog. The project URL and reading content commit when the selected spread settles.
- Framing measures independent skinned leaves through forward, reverse and interrupted turns once at startup. A compact convex hull plus all miniature bounds provides the turn envelope. The camera solves for the largest fully visible zine and optical center at each viewport size. It remains fixed throughout navigation. Dragging can adjust model fit for an extreme orientation; that fit remains unchanged during subsequent turns at the same orientation.
- A neutral key light is above the zine, with restrained fill, matte paper and local object shadows. The ground stays below every rotated leaf, close enough that the overhead shadow remains visible inside the canvas. A shadow-only edge fade prevents the canvas boundary from reading as a divider.
- The top-right light/dark toggle remembers the chosen background mode. Paper and black left-page typography remain consistent in both modes; toggling does not regenerate artwork or reset orientation.
- Reduced motion uses a simple reveal, frozen portals and idle pose, immediately revealed pop-ups and immediate page/rotation input. Space/Escape finishes an in-progress arrival or turn. The HTML fallback preserves cover navigation, themed print artwork and reading access without WebGL.
- Rendering pauses offscreen/when hidden. Software WebGL uses simpler materials; the physical path retains matte paper, grain and studio reflections. Leaves and pop-ups are procedural articulation, not a cloth/contact simulation.

## Persistent leaf model

Each physical leaf owns one mesh, one 31-bone skeleton, and permanent front/back textures. The front cover's reverse is About; subsequent leaves pair each spread's portal with the next spread's metadata, ending at the back cover. Three spreads use four physical leaves/eight printed faces. Each portal has a permanent canvas/texture, so a turn cannot recolor another physical page.

Paper and covers share two bind-pose geometries. GPU skinning deforms positions, normals, and shadow depth consistently. Hinge, bend, and fold states ease independently; covers have restrained bending. Vertex buffers are not rewritten during animation. Left-page layouts are captured at 1200×1694 with larger, stronger body type and no grain veil over text. Conservative per-leaf bounds support culling/raycasting, and skeleton matrices are synchronized before pointer queries. No new runtime dependency or React Three Fiber migration is required.

## Add projects

The About, Stadia and AI Mode entries contain labeled placeholders. Edit `src/book/projects.js`:

1. Replace the title, subtitle, description, role, team, year, disciplines, and chapters. Set `sample: false`.
2. Add `previewImage` and `imageAlt` for project imagery in the reading dialog. Images can live in `public/projects/`.
3. Set `caseStudyUrl` if the complete study lives elsewhere. Use `kind: "about"` for the biography layout and `theme: "about" | "stadia" | "ai"` for shared print/object palettes.

Project URLs are shareable as `?project=stadia` or `?project=ai-mode` or another entry ID. An explicit project URL opens that spread after arrival. The home URL remains on the cover. Reloading regenerates printed pages from the same React layout and locally embedded fonts.

## Implementation

- `src/book/BookScene.ts`: scene lifecycle, leaf/content registry, fixed framing, quaternion input, mesh picking, printed accessibility overlays, lighting, artwork, and commit callbacks.
- `src/book/popups.ts`: bone-anchored, project-specific dioramas, staggered emergence, turn-safe retraction and object hit testing.
- `src/book/themes.ts`: right-page portal and object palettes; the left-page typography is always neutral.
- `src/book/miniatures.ts`: original film camera, tennis racket and GameCube-style controller geometry and materials.
- `src/book/framing.ts`: one-time turn measurement, compact convex envelope and maximum fixed-camera frustum fit.
- `src/book/leaf.ts`: shared weighted geometry, persistent skinned leaf, independent joint damping, thickness, bounds, and skeleton lifecycle.
- `src/book/turn-scheduler.ts`: requested/launched/committed spread states, overlapping turns, bounded concurrency, and reversals.
- `src/book/binding.ts`: folded paper saddle and two staples.
- `src/book/paper-flex.ts`: damped motion response feeding the leaf joints.
- `src/book/materials.ts` and `ascii.ts`: original monochrome cover/colophon, captured layouts, paper grain, and project-colored ASCII artwork.
- `src/book/surfaces.ts` and `effects.ts`: generated studio environment, surface detail, and contact shadow.
- `src/main.jsx`: React content, shared print capture, navigation, reader, keyboard input, and HTML fallback.

## Validate and deploy

```sh
npm run typecheck
npm run build
npm test
```

Browser checks use `/usr/bin/chromium` with software WebGL. They cover physical page identity/artwork, unchanged bind-pose vertices, overlapping and interrupted turns, requested versus settled state, full fixed-center rotation, hover/focus, raycast page clicks, cover continuity, loading/arrival, closed-cover idle/reset, themed artwork, pop-up lifecycle, turn framing, reduced motion, touch, dark-mode persistence, immediate selection, cover timing, restart parity and the HTML fallback.

Vercel: build `npm run build`, output `dist`. See `THIRD_PARTY_NOTICES.md` for licenses. Fonts and assets are local; no external model, font CDN, API key, or image service is required.
