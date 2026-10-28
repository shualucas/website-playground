# Josh Lucas — Portfolio editions

The default site is now an interactive **Game Boy-style cartridge collection**: About, Stadia, AI Mode, and After-hours. Each cartridge has original editable label artwork, a beveled molded-plastic shell, grip grooves, a recessed paper label, connector details, and a finished back. A single Three.js scene supplies studio reflections, overhead shadows, hover lift, and drag rotation. Click a cartridge or its corresponding HTML link to read. Dragging never opens a project. Reset returns inspected cartridges to their original positions. Theme switching, keyboard access, reduced motion, deep links, browser Back/Forward, photography gallery, and a WebGL-free illustrated fallback are included.

**The exact linked Sketchfab model is not included:** Sketchfab returned HTTP 403 here. This implementation uses original procedural geometry, with an optional GLB import path ready in `src/cartridge/config.ts`. Upload/download the licensed model and check its label mesh and orientation to substitute it. See `public/cartridges/README.md`.

## Keep or switch editions

- `/` — new cartridge edition.
- `/zine/` — runnable zine edition, retaining the original scene and interactions.
- `/versions/portfolio-zine-v1-source.zip` — complete standalone source snapshot of the zine at `22a93bd`, before cartridge work. Unzip, run `npm ci`, then `npm run dev`. No new cartridge code is required.
- Git tag `portfolio-zine-v1` records that same original commit.

`npm run build` produces both website entries in `dist/`. Deploy the whole folder; both versions work without server-side routing. The source archive is also available through the cartridge footer.

## Cartridge content and artwork

- `src/cartridge/config.ts` — cartridge names, shell colors, label image URLs, optional external GLB configuration.
- `public/cartridges/labels/*.svg` — original custom artwork for all four labels. Replace with SVG, PNG, or JPG to redesign them.
- `src/book/projects.js` — existing biography, case-study text, and project media, shared between editions. Unverified project details remain explicit placeholders.
- `src/content/film-photos.js` and `public/photos/` — After-hours photograph collection.
- `src/cartridge/CartridgeScene.ts` — renderer, lighting, framing, input, animation, lifecycle.
- `src/cartridge/model.ts` — original shell geometry and optional GLB adapter.

No new dependencies were added. The zine's GPU scene is only loaded on `/zine/`; the cartridge entry has its own scene and stylesheet. The shared case-study component accepts an optional back label and otherwise preserves its old behavior.

```sh
npm ci
npm run dev
npm run typecheck
npm run build
npm test                 # cartridge browser checks
npm run test:zine        # preserved zine regression suite, isolated entry/port
```

Quincy CF remains ready for a licensed font file; the bundled Cormorant Garamond italic is still the active fallback.

---

## Preserved zine documentation

### Selected Things — Portfolio Zine

An interactive, saddle-stitched portfolio on a white or charcoal canvas. The closed editorial cover arrives after a monochrome CRT logo loader with “JOSHUA” stacked above “LUCAS”. Open it into **About → Stadia → AI Mode → After-hours**. About contains the supplied professional biography and a gradient Google G, the Blizzard Entertainment logo and Golden Gate Bridge. After-hours contains the black point-and-shoot film camera with wrist strap, EZONE-inspired blue racket with lime tape and purple GameCube-style controller. Project spreads contain original rigid Pro-style handsets instead of miniatures, with restrained device frames and full-page animated ASCII contour fields.

## Run

```sh
npm install
npm run dev
```

Drag the zine to rotate it in place through all axes. Clay miniatures, ASCII and phone previews stay visible throughout rotation; navigation stays opaque and queues requests until release. Desktop uses a fixed 1.2× optical magnification. The camera and model scale remain fixed throughout a drag, even if the zine clips the viewport. Click page edges or use the navigation/arrow keys to turn. Requests accumulate during animation; selected navigation reflects intent immediately. Click a phone to dive into its full HTML case-study page from the current viewing angle, with no camera straightening or lens change. Browser Back or Back to zine restores the same spread, rotation, and camera. Left pages contain only useful metadata; the bottom pills and page clicks handle navigation. R or the restart icon returns to the closed cover without reloading assets. The sound button mutes/unmutes recorded paper rustle, which starts on real leaf turns after the first user gesture. The theme button changes the scene, paper, ink, covers and ASCII; preview media keeps its original colors.

Reduced motion removes ambient movement, jiggle, animated previews and arrival/page transitions. Keyboard controls, accessible case-study pages and a WebGL-free HTML reading fallback are retained. Portrait screens retain the whole resting spread; reading view provides larger text.

## Content and preview media

Edit `src/book/projects.js`. The About spread uses Josh’s supplied biography. Project responsibilities and outcomes remain explicit placeholders. Replace labeled placeholders and set `sample: false` as real case studies become available.

For Stadia and AI Mode, place assets in `public/projects/` and set:

```js
previewVideo: "/projects/stadia-preview.mp4", // preferred; muted, looping, plays inline
previewGif: "",                             // fallback when no MP4 is supplied
previewPoster: "/projects/stadia-poster.jpg",// optional static image / reduced motion
```

Blank fields show a solid black phone screen with a rounded 20px-style corner and a neutral clay frame. MP4/GIF playback runs only for the visible, settled project; it pauses when pages turn, the scene leaves the viewport, the tab is hidden, or reduced motion is enabled. GIFs use disposal-aware frame compositing. In the reading view, MP4 has playback controls. Keep clips compact and portrait-shaped (approximately 540×1024); media is mapped into a 1.87:3.55 window. Prefer MP4 over large GIFs for download/memory efficiency. `previewImage` remains available for non-project reading imagery. `caseStudyUrl` can link to a full study elsewhere.

Case-study destinations are shareable as `?project=stadia&view=case-study` or `?project=ai-mode&view=case-study`, including direct refresh. Project spread links are shareable: `?project=stadia`, `?project=ai-mode`, `?project=about`, or `?project=after-hours`. The home URL stays closed.

## Film photos, miniature descriptions, and titles

Click the camera on After-hours to open the photo gallery. Put photographs in `public/photos/` and list their `src`, descriptive `alt`, optional `caption`, and optional `film` in `src/content/film-photos.js`. The gallery supports a contact sheet, full photograph view, keyboard arrows, and Escape. No photographs are included until supplied.

Edit After-hours tooltip titles and descriptions in `src/content/miniatures.js`. Hover over a miniature for its card; tap other miniatures to pin the description. Keyboard users can tab directly to the invisible controls over the three miniatures; there is no extra navigation row. About miniatures have no tooltips or description controls. Camera activation opens the gallery; dragging rotates the zine. The scene pauses while the modal is open.

Titles are prepared for **Quincy CF Regular Italic**, but its licensed font file has not been supplied. Cormorant Garamond Regular Italic is bundled as the current fallback. Add the licensed webfont to `public/fonts/` and set `quincyFontUrl` in `src/content/typography.ts` to apply Quincy to both HTML and captured page headings. Front and back covers retain only the abstract artwork and paper texture.

## Architecture

Native Three.js owns one scene animation loop; React owns content, navigation and the reader. No React Three Fiber migration is required. `CaseStudy.jsx` owns the scrollable, themed HTML destination and explicit image/motion placeholders; no achievements or outcomes are invented.

- `BookScene.ts` owns lifecycle, a fixed book-view camera/pivot, a reversible 900ms camera dolly along the current camera-to-phone ray, lighting, theme repainting, picking, and accessible print overlays.
- `leaf.ts` uses two shared 30-segment bind-pose geometries and a persistent 31-bone skeleton per leaf. Five physical leaves carry ten permanent face textures. GPU skinning updates geometry, normals and shadows together. Shared hinge timing, ordered leaves, thickness clearance and offsets along the rotating page normal prevent covers overtaking adjacent pages.
- `turn-scheduler.ts` separates requested, launched and committed boundaries, with staggered overlapping turns and interruptible requests.
- `framing.ts` measures a turn envelope once and fits the camera on viewport resize; dragging never adjusts scale or zoom. Desktop rendering extends into the former top/bottom stage margins with a fixed view offset, preserving the larger composition and raised-page clearance.
- `materials.ts` captures the same React metadata layout at 1200×1694 and repaints existing canvas textures for each mode, preserving face identities. `ascii.ts` prints a flowing contour field across the entire right page. Only exposed/currently turning artwork animates, avoiding needless redraws of hidden pages.
- `phones.ts` builds a raised rigid handset with a 0.14-unit body attached to the right leaf’s middle bone. Its black screen and neutral thin outline share the same corner geometry. The handset bounces into view with the miniature-style ease-back overshoot, retracts before turns, and remains visible while rotating. It has no glow or halo. It owns local video/GIF playback without full-screen bloom. This is an original Pro-style approximation, not a dimension-certified iPhone 17 Pro asset.
- `popups.ts` creates only career and After-hours miniatures, anchors them to leaf bones, and retracts them before turning. `career.ts` and `miniatures.ts` own their procedural geometry. Removed project props are preserved in `src/book/miniatures/library/` with restoration notes.
- `jelly.ts` applies a bounded, volume-preserving scale/shear/twist cage to surfaces, normals, colored silhouette shells and shadow depth. Physical materials use matte pigmented clay, shared micrograin normal/roughness maps, saturated colors, and no clearcoat or metallic reflection; software WebGL uses a low-shine opaque Phong finish. Transmission is zero and opacity is one. All miniatures are two-thirds of their previous size. The remaining squash is restrained and settles quickly. This is controlled deformation, **not** the reference's tetrahedral XPBD, arbitrary stretching, cutting or remeshing.
- `CRTLoader.jsx` reveals the stacked Joshua Lucas wordmark from actual preparation progress, with monochrome phosphor bloom, scan lines, and a slow beam sweep. Completion waits for real assets and a brief signal-lock pause. Reduced motion removes the sweep and distortion; the initial zine reveal still waits at least 2 seconds.
- `surfaces.ts`, `effects.ts` and `binding.ts` provide the local studio environment, paper detail, shadow-edge fade and folded/stapled saddle. Pages and covers use textured satin roughness with restrained clearcoat; hover emission is pale orange. Miniatures recline toward the page with small, phase-offset ambient hovering. A single overhead key casts a soft filtered shadow; no duplicate painted ground shadow is used.

All runtime fonts and logo assets are local. The physical material path is more expensive than the compatibility renderer. Resting miniatures bypass cage deformation in the shader; the software path uses a smaller, proportionally blurred shadow map. This environment's software GPU validates correctness but cannot establish real mobile-GPU performance. Higher-fidelity authored GLB miniatures with smooth closed volumes would be the next improvement over the procedural stylized geometry. See `THIRD_PARTY_NOTICES.md` for credits and licenses.

## Validate and deploy

```sh
npm run typecheck
npm run build
npm test
```

Browser checks use `/usr/bin/chromium` with software WebGL and cover permanent page identity, interrupted/rapid turns, cover timing, fixed-scale rotation, hover/click/drag separation, touch, loader progress, theme persistence, media preview lifecycle, reduced motion, reading access and the HTML fallback.

Vercel: build command `npm run build`, output directory `dist`. No external API key or runtime asset service is required.
