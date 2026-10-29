# Josh Lucas — Portfolio editions

The default site is a **five-cartridge career collection**, ordered top to bottom: Search (2022–now), Stadia (2020–2022), Gmail (2019), Blizzard Entertainment (2017), and Early work. Early work holds high-school/college projects; its dates are intentionally blank until supplied. Search uses sapphire-blue translucent plastic, Blizzard a darker muted blue with restrained transmission, Gmail muted beige, and Stadia dark gray. Labels remain opaque, blank tonal placeholder panels. Earlier printed label designs remain as unused assets for future reference.

The collection uses a top-edge-first, steeply tilted stack: each rigid shell rests at 80° pitch with a narrow visible strip of its front. Selecting a cartridge tilts it forward and makes space between its original neighbors, with clearance for full 360° drag inspection. The active model is the wider Famicom GLB from mamuso.dev; the original procedural Game Boy shell remains available as a fallback by clearing the model URL. A 14° long-lens camera uses 4× desktop zoom (double the previous size), capped by available width on smaller displays. Selection centers the inspected shell while neighbors yield above/below and may leave the canvas; selection and rotation never change the zoom. Keyboard proxies remain within the canvas. Entry combines staggered downward movement with a slightly delayed turn; position and rotation springs retain velocity through interrupted selections. A bounded oriented-box separation guard keeps the shells disjoint; it is not a rigid-body physics simulation. Rendering stops when motion settles or the scene is hidden.

The heading reads “Josh Lucas” followed by Brand developer, Merch maker, Product designer, and Visionary. Each role has a separate entrance (staggered letters, stamp, masked slide, or focus/tracking) and a shared short exit. Only the first word animates; the second word changes without an effect. Click the role to pause/resume; reduced-motion readers get a static role and can click through manually. The tweet could not be retrieved through this environment's gateway, so these effects interpret the requested direction rather than replicate its video. The supplied body and randomly selected fun fact retain the word reveal and matching 23px typography. Facts change only on page load, avoiding immediate repeats when session storage is available.

Soft silhouette shadows use a shared receiving plane and blurred VSM shadow map. The frosted shells share a half-resolution transmission buffer. Springs catch up elapsed time in small integration steps so slow rendering does not excessively stretch transitions. Captions contain only team/date information and open the existing readers. Drag the selected cartridge, use R to reset its orientation, and Escape or a second cartridge click to close it. Selection preserves stack order; a narrow camera depth range keeps thin label layers stable.

A full-screen miniature loader cycles the film camera, a CDJ-3000-inspired deck, a small RISO zine and a lightbulb, with a small Loading label and no progress dots. It displays a complete visual cycle lasting at least three seconds, then waits for actual scene readiness before fading away. The cartridge entrance and rotating heading start after the loader, and the background stays inert while loading. The loader uses real clay models where WebGL is available and local SVG counterparts otherwise; reduced motion removes its scale/rotation movement while retaining the sequence. The CDJ, zine and bulb are original stylized geometry, not downloaded product models.

The original clay point-and-shoot camera is centered in the footer with “say cheese,” between the X profile link and “Now-ish playing.” It floats and sways with increased amplitude while in view, and stops offscreen, in hidden tabs, or for reduced-motion users. On phones it sits above the two links. Its scene is created lazily near the viewport and hides while a case study is open. No book renderer or other miniature models are instantiated for it. “Zine edition” is in the top-right header; the source download is on the zine's own controls.

`src/content/music.js` holds the five supplied Spotify playlist URLs and a catalog for verified tracks and album artwork. The intended playlists are trance, worship, orange county dancefloor, pac heights and anjuna. One pick stays stable through theme/reader interactions and changes on reload. Playlist membership cannot currently be read through this environment's gateway (HTTP 403), and the tagged Spotify app does not expose tools in this cloud session. Until track data is supplied, the footer links to one of the actual playlists with a neutral record graphic. This is a curated rotation, not live Spotify playback; it needs no account credentials.

Career content lives in `src/cartridge/projects.js`, separately from the preserved zine spreads. Existing Stadia and AI Mode media/scaffolding are reused for the Stadia and Search readers; the old `ai-mode` URL resolves to Search. Blizzard, Gmail, and Early work have explicit content scaffolding, without invented project results. Theme switching, keyboard access, deep links, browser Back/Forward, and the WebGL-free fallback are retained. The zine remains unchanged; no photo-zine/sketchbook redesign has been implemented.

The active cartridge asset is `public/cartridges/models/mamuso-famicom.glb`, copied unchanged from mamuso.dev at the user's request. Its source revision, SHA-256 and undeclared license status are recorded in `public/cartridges/models/SOURCE.md`. The repository and GLB do not declare asset reuse terms; no permissive license is asserted. The existing tonal placeholder artwork remains original. The Draco WASM decoder is served locally, and the model is decoded once before creating independently colored instances. PCB materials are retained; the artwork primitive receives the project label and the overlapping paper primitive is hidden.

The earlier linked Sketchfab model remains unused: this environment's connection gateway returned HTTP 403 before retrieving its page. See `public/cartridges/README.md` for asset configuration.

## Keep or switch editions

- `/` — new cartridge edition.
- `/zine/` — runnable zine edition, retaining the original scene and interactions.
- `/versions/portfolio-zine-v1-source.zip` — complete standalone source snapshot of the zine at `22a93bd`, before cartridge work. Unzip, run `npm ci`, then `npm run dev`. No new cartridge code is required.
- Git tag `portfolio-zine-v1` records that same original commit.

`npm run build` produces both website entries in `dist/`. Deploy the whole folder; both versions work without server-side routing. The source archive is also available through the zine's top-right controls.

## Cartridge content and artwork

- `src/cartridge/config.ts` — cartridge names, shell colors, label image URLs, optional external GLB configuration.
- `public/cartridges/labels/*-tonal.svg` — five blank, tonal placeholder panels. Earlier printed labels are retained but unused. Replace configured URLs with SVG, PNG, or JPG as needed.
- `src/cartridge/projects.js` — career readers, supplied dates, and scaffolding. `src/book/projects.js` retains the zine content and supplies existing Stadia/AI Mode media. Unverified project details remain explicit placeholders.
- `src/content/film-photos.js` and `public/photos/` — After-hours photograph collection.
- `src/cartridge/CartridgeScene.ts` — renderer, lighting, framing, input, animation, lifecycle.
- `src/cartridge/Intro.jsx` — word reveal and rotating role heading.
- `src/cartridge/fun-facts.js` — supplied fun facts and per-load selection.
- `src/cartridge/LoadingScreen.jsx`, `LoadingScene.ts`, `loading-models.ts` — miniature sequence, timing/readiness gate, fallback and original loader props.
- `src/cartridge/FilmCameraScene.ts` — the reused clay camera's visibility-aware float.
- `src/cartridge/model.ts` — original shell geometry and optional GLB adapter.

No new package dependencies were added; the local Draco runtime comes from Three.js. The zine's GPU scene is only loaded on `/zine/`; the cartridge entry has its own scene and stylesheet. The shared case-study component accepts optional back-label and identity props; the gallery accepts optional empty-state copy. Their defaults preserve the zine presentation.

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
