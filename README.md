# Selected Things — Portfolio Zine

An interactive, saddle-stitched portfolio on a white or charcoal canvas. The closed editorial cover arrives after a numbered, monochrome card loader. Open it into **About → Stadia → AI Mode → After-hours**. About contains the supplied professional biography and a gradient Google G, the Blizzard Entertainment logo and Golden Gate Bridge. After-hours contains the black point-and-shoot film camera with wrist strap, EZONE-inspired blue racket with lime tape and purple GameCube-style controller. Project spreads contain original rigid Pro-style handsets instead of miniatures, with project-colored rising rims and animated ASCII borders.

## Run

```sh
npm install
npm run dev
```

Drag the zine to rotate it in place through all axes. Miniatures, ASCII and spell glows stay visible throughout rotation; navigation stays opaque and queues requests until release. Desktop uses a fixed 1.2× optical magnification. The camera and model scale remain fixed throughout a drag, even if the zine clips the viewport. Click page edges or use the navigation/arrow keys to turn. Requests accumulate during animation; selected navigation reflects intent immediately. Click a phone to dive into its full HTML case-study page from the current viewing angle, with no camera straightening or lens change. Browser Back or Back to zine restores the same spread, rotation, and camera. Left pages contain only useful metadata; the bottom pills and page clicks handle navigation. R or the restart icon returns to the closed cover without reloading assets. The sound button mutes/unmutes recorded paper rustle, which starts on real leaf turns after the first user gesture. The theme button changes the scene, paper, ink, covers and ASCII; preview media keeps its original colors.

Reduced motion removes ambient movement, jiggle, animated previews and arrival/page transitions. Keyboard controls, accessible case-study pages and a WebGL-free HTML reading fallback are retained. Portrait screens retain the whole resting spread; reading view provides larger text.

## Content and preview media

Edit `src/book/projects.js`. The About spread uses Josh’s supplied biography. Project responsibilities and outcomes remain explicit placeholders. Replace labeled placeholders and set `sample: false` as real case studies become available.

For Stadia and AI Mode, place assets in `public/projects/` and set:

```js
previewVideo: "/projects/stadia-preview.mp4", // preferred; muted, looping, plays inline
previewGif: "",                             // fallback when no MP4 is supplied
previewPoster: "/projects/stadia-poster.jpg",// optional static image / reduced motion
```

Blank fields show a solid black phone screen with a rounded 20px-style corner and a project-gradient rim. MP4/GIF playback runs only for the visible, settled project; it pauses when pages turn, the scene leaves the viewport, the tab is hidden, or reduced motion is enabled. GIFs use disposal-aware frame compositing. In the reading view, MP4 has playback controls. Keep clips compact and portrait-shaped (approximately 540×1024); media is mapped into a 1.87:3.55 window. Prefer MP4 over large GIFs for download/memory efficiency. `previewImage` remains available for non-project reading imagery. `caseStudyUrl` can link to a full study elsewhere.

Case-study destinations are shareable as `?project=stadia&view=case-study` or `?project=ai-mode&view=case-study`, including direct refresh. Project spread links are shareable: `?project=stadia`, `?project=ai-mode`, `?project=about`, or `?project=after-hours`. The home URL stays closed.

## Architecture

Native Three.js owns one scene animation loop; React owns content, navigation and the reader. No React Three Fiber migration is required. `CaseStudy.jsx` owns the scrollable, themed HTML destination and explicit image/motion placeholders; no achievements or outcomes are invented.

- `BookScene.ts` owns lifecycle, a fixed book-view camera/pivot, a reversible 900ms camera dolly along the current camera-to-phone ray, lighting, theme repainting, picking, and accessible print overlays.
- `leaf.ts` uses two shared 30-segment bind-pose geometries and a persistent 31-bone skeleton per leaf. Five physical leaves carry ten permanent face textures. GPU skinning updates geometry, normals and shadows together. Shared hinge timing, ordered leaves, thickness clearance and offsets along the rotating page normal prevent covers overtaking adjacent pages.
- `turn-scheduler.ts` separates requested, launched and committed boundaries, with staggered overlapping turns and interruptible requests.
- `framing.ts` measures a turn envelope once and fits the camera on viewport resize; dragging never adjusts scale or zoom. Desktop rendering extends into the former top/bottom stage margins with a fixed view offset, preserving the larger composition and raised-page clearance.
- `materials.ts` captures the same React metadata layout at 1200×1694 and repaints existing canvas textures for each mode, preserving face identities. `ascii.ts` confines the moving glyph field to a border.
- `phones.ts` builds a raised rigid handset with a 0.14-unit body attached to the right leaf’s middle bone. Its screen, thin outline, colored halo, and rising rounded veil share the same corner geometry. The handset retracts during turns and remains visible while rotating. It owns local video/GIF playback without full-screen bloom. This is an original Pro-style approximation, not a dimension-certified iPhone 17 Pro asset.
- `popups.ts` creates only career and After-hours miniatures, anchors them to leaf bones, and retracts them before turning. `career.ts` and `miniatures.ts` own their procedural geometry. Removed project props are preserved in `src/book/miniatures/library/` with restoration notes.
- `jelly.ts` applies a bounded, volume-preserving scale/shear/twist cage to surfaces, normals, colored silhouette shells and shadow depth. Physical materials use an opaque glossy gummy finish with saturated colors and studio reflections; software WebGL uses an opaque Phong finish. Transmission is zero and opacity is one. All miniatures are two-thirds of their previous size. This is controlled jiggle, **not** the reference's tetrahedral XPBD, arbitrary stretching, cutting or remeshing.
- `CardLoader.jsx` renders a small monochrome stack, all four suits, and rank-appropriate pip layouts. Transform/opacity animations deal each new rank from the deck, with reduced-motion alternatives. Ranks 1–10 follow completed font, import, print-capture, logo and renderer preparation stages. Ten appears only after preparation completes. The initial reveal waits at least 2 seconds; slow devices can take longer.
- `surfaces.ts`, `effects.ts` and `binding.ts` provide the local studio environment, paper detail, shadow-edge fade and folded/stapled saddle. Pages and covers use textured satin roughness with restrained clearcoat; hover emission is pale orange. Miniatures recline toward the page with small, phase-offset ambient hovering. A single overhead key casts a soft filtered shadow; no duplicate painted ground shadow is used.

All runtime fonts and logo assets are local. The physical glossy material path is more expensive than the compatibility renderer. Resting miniatures bypass cage deformation in the shader; the software path uses a smaller, proportionally blurred shadow map. This environment's software GPU validates correctness but cannot establish real mobile-GPU performance. Higher-fidelity authored GLB miniatures with smooth closed volumes would be the next improvement over the procedural stylized geometry. See `THIRD_PARTY_NOTICES.md` for credits and licenses.

## Validate and deploy

```sh
npm run typecheck
npm run build
npm test
```

Browser checks use `/usr/bin/chromium` with software WebGL and cover permanent page identity, interrupted/rapid turns, cover timing, fixed-scale rotation, hover/click/drag separation, touch, loader progress, theme persistence, media preview lifecycle, reduced motion, reading access and the HTML fallback.

Vercel: build command `npm run build`, output directory `dist`. No external API key or runtime asset service is required.
