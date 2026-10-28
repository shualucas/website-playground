# Field Notes — RISO Zine

An interactive portfolio presented as a thin, saddle-stitched RISO zine. Blue and pink cover inks, halftones, registration offsets and grain sit on warm uncoated stock. About uses blue/pink, Stadia orange/magenta, and AI Mode Google colors. Cover art, paper detail, lighting, animated ASCII portals and paper-like pop-up objects are generated locally.

The floating, angled composition, page highlights, and flexible turns follow the [Animated Book Slider Three.js reference](https://github.com/pakagronglb/animated-book-slider-threejs), adapted to the existing project scaffolding.

## Run

Node.js 20.19+ or 22.12+ (validated with Node 24).

```sh
npm ci
npm run dev -- --port 3000
```

## Interaction

- A brief loader waits for local fonts, page capture and the first WebGL render. A 0.85-second spring reveal brings in the **closed cover**; navigation fades in independently. The zine does not open automatically on the home URL.
- The cover gently bobs and rocks on a roughly 13-second cycle inspired by Drei's Float. Dragging eases down ambient motion; releasing restores it. **R** resets orientation and returns to the closed-cover arrival, without reloading assets.
- Drag either leaf, its pop-ups, a reading control or the cover to rotate around a fixed center through full revolutions. Mouse/touch retain six-pixel click discrimination, pointer capture and cancellation.
- Hover or keyboard-focus a page for a glow at intensity 0.264 (20% above the previous 0.22). Click the right page to advance or the left to go back.
- Navigation is **Cover / About / Stadia / AI Mode / Back cover**. Arrow keys and printed page arrows also work. Every relative input accumulates into the requested destination; up to three leaves overlap. Direction changes retarget moving leaves.
- Each right page retains its own project-colored ASCII portal, printed beneath three 3D objects. Pop-ups inherit their leaf's bone transforms. They unfold in 110 ms staggers and tuck away within 180 ms before a turn; input continues to queue while they retract. Only the final settled spread reveals its objects.
- About has its own introduction layout and reading link. Stadia and AI Mode expose **Read the case study**. Escape closes the reading dialog. The project URL and reading content commit when the selected spread settles.
- Camera sizing targets 1.6× the previous desktop size, capped by a complete hinge-sweep fit. Narrow screens prioritize full-page framing. Camera fitting runs on resize; page navigation cannot change the camera. Extreme drag orientations get a model fit adjustment based on the complete turn envelope; it remains constant during navigation at that orientation. The ground receiver is three times farther below the zine, with an expanded light frustum for its projected shadow.
- Reduced motion uses a simple reveal, frozen portals and idle pose, immediately revealed pop-ups and immediate page/rotation input. Space/Escape finishes an in-progress arrival or turn. The HTML fallback preserves cover navigation, themed print artwork and reading access without WebGL.
- Rendering pauses offscreen/when hidden. Software WebGL uses simpler materials; the physical path retains matte paper, grain and studio reflections. Leaves and pop-ups are procedural articulation, not a cloth/contact simulation.

## Persistent leaf model

Each physical leaf owns one mesh, one 31-bone skeleton, and permanent front/back textures. The front cover's reverse is About; subsequent leaves pair each spread's portal with the next spread's metadata, ending at the back cover. Three spreads use four physical leaves/eight printed faces. Each portal has a permanent canvas/texture, so a turn cannot recolor another physical page.

Paper and covers share two bind-pose geometries. GPU skinning deforms positions, normals, and shadow depth consistently. Hinge, bend, and fold states ease independently; covers have restrained bending. Vertex buffers are not rewritten during animation. Conservative per-leaf bounds support culling/raycasting, and skeleton matrices are synchronized before pointer queries. No new runtime dependency or React Three Fiber migration is required.

## Add projects

The About, Stadia and AI Mode entries contain labeled placeholders. Edit `src/book/projects.js`:

1. Replace the title, subtitle, description, role, team, year, disciplines, and chapters. Set `sample: false`.
2. Add `previewImage` and `imageAlt` for project imagery in the reading dialog. Images can live in `public/projects/`.
3. Set `caseStudyUrl` if the complete study lives elsewhere. Use `kind: "about"` for the biography layout and `theme: "about" | "stadia" | "ai"` for shared print/object palettes.

Project URLs are shareable as `?project=stadia` or `?project=ai-mode` or another entry ID. An explicit project URL opens that spread after arrival. The home URL remains on the cover. Reloading regenerates printed pages from the same React layout and locally embedded fonts.

## Implementation

- `src/book/BookScene.ts`: scene lifecycle, leaf/content registry, fixed framing, quaternion input, mesh picking, printed accessibility overlays, lighting, artwork, and commit callbacks.
- `src/book/popups.ts`: bone-anchored, project-specific dioramas, staggered emergence, turn-safe retraction and object hit testing.
- `src/book/themes.ts`: shared typography, ink, gradient, portal and object palettes.
- `src/book/leaf.ts`: shared weighted geometry, persistent skinned leaf, independent joint damping, thickness, bounds, and skeleton lifecycle.
- `src/book/turn-scheduler.ts`: requested/launched/committed spread states, overlapping turns, bounded concurrency, and reversals.
- `src/book/binding.ts`: folded paper saddle and two staples.
- `src/book/paper-flex.ts`: damped motion response feeding the leaf joints.
- `src/book/materials.ts` and `ascii.ts`: original RISO cover/colophon, captured layouts, paper grain, and project-colored ASCII artwork.
- `src/book/surfaces.ts` and `effects.ts`: generated studio environment, surface detail, and contact shadow.
- `src/main.jsx`: React content, shared print capture, navigation, reader, keyboard input, and HTML fallback.

## Validate and deploy

```sh
npm run typecheck
npm run build
npm test
```

Browser checks use `/usr/bin/chromium` with software WebGL. They cover physical page identity/artwork, unchanged bind-pose vertices, overlapping and interrupted turns, requested versus settled state, full fixed-center rotation, hover/focus, raycast page clicks, cover continuity, loading/arrival, closed-cover idle/reset, themed artwork, pop-up lifecycle, turn framing, reduced motion, touch and the HTML fallback.

Vercel: build `npm run build`, output `dist`. See `THIRD_PARTY_NOTICES.md` for licenses. Fonts and assets are local; no external model, font CDN, API key, or image service is required.
