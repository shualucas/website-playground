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

- Drag either page, a page control, or a closed cover to rotate the zine around a fixed center. Mouse and touch use a six-pixel threshold and pointer capture. Releasing a drag preserves its angle and never clicks a page; it does not translate or pick up the zine.
- Hover a page for a subtle pink emissive glow. Click the right leaf to move forward, or the left leaf to go back. The first/last spread also leads to the corresponding cover. Clicking a closed cover opens it.
- Use the bottom Cover / Page 1–3 / Back Cover pills, on-page arrows, or Left/Right keys as alternatives. Distant projects turn through intermediate pages; rapid choices safely replace the queued destination.
- Choose **Read the case study** on the left page to open the reading dialog; Escape closes it. The printed artwork is a page-turn target.
- **R** resets rotation and replays the opening on the first project. Space or Escape skips an opening/turn.
- The lightweight arrival and eight-leaf opening run for 3.4 seconds of animation time. Project turns retain the slower, roughly two-second segmented bend. Front and back paper covers close in 1.65 seconds.
- Turning/resting pages share the same captured artwork. The fixed camera fits the opening, turning leaves, and the supported rotation range without changing zoom during interaction.
- Reduced motion opens immediately, freezes the ASCII print and background type, and makes hover/rotation/page selection immediate. Explicit drag rotation remains available.
- Rendering pauses offscreen and while the document is hidden. Software WebGL uses simpler lighting; GPU rendering uses physical paper materials and filtered studio reflections.
- Without WebGL, an HTML zine retains print artwork, page clicks, navigation, and reading access.

## Add projects

The three entries currently contain labeled sample content. Edit `src/book/projects.js`:

1. Replace the title, subtitle, description, role, team, year, disciplines, and chapters. Set `sample: false`.
2. Add `previewImage` and `imageAlt` for project imagery in the reading dialog. Images can live in `public/projects/`.
3. Set `caseStudyUrl` if the complete study lives elsewhere. Add or remove entries as needed.

Project URLs are shareable as `?project=first-project` or another entry ID. Reloading regenerates the printed pages from the same React layout and locally embedded fonts.

## Implementation

- `src/book/BookScene.ts`: physical zine, fixed framing, rotation pivot, hover lighting, page/cover turns, raycasting, shared printing, and cleanup.
- `src/book/binding.ts`: folded paper saddle, shallow gutter, and two staples.
- `src/book/page-turn.ts`: reference-informed 30-section articulation, trailing edge, corner fold, frame-rate independent damping, and opening timing.
- `src/book/ascii.ts`: animated two-ink ASCII artwork.
- `src/book/materials.ts`: original RISO cover/colophon, halftones, grain, uncoated stock, thin page edges, and captured page artwork.
- `src/book/surfaces.ts`: normal/roughness detail, generated studio environment, and rounded slabs.
- `src/book/effects.ts`: soft studio contact shadow.
- `src/main.jsx`: React layouts, shared print capture, accessible leaf controls, navigation, reading dialog, keyboard input, and HTML fallback.

## Validate and deploy

```sh
npm run typecheck
npm run build
npm test
```

Browser checks use `/usr/bin/chromium` with software WebGL. They cover fixed-center mouse/touch rotation, drag/click separation, page hover and keyboard focus, click-to-turn leaves/covers, shared artwork, fixed framing, opening/reset, reduced motion, queued page selection, and the HTML fallback.

Vercel: build `npm run build`, output `dist`. See `THIRD_PARTY_NOTICES.md` for licenses. Fonts and assets are local; no external model, font CDN, API key, or image service is required.
