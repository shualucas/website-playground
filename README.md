# A Designer’s Field Journal

A white portfolio website centered on a Three.js leather journal. On entry, the book appears, its cover opens, pages riffle quickly, and the final sheet turns more slowly before revealing the first project. The left page contains project metadata; the right page contains its preview.

The current three chapters contain explicitly labeled sample content, ready for real UX case studies.

## Run

Node.js 20.19+ or 22.12+ (validated with Node 24).

```sh
npm ci
npm run dev -- --port 3000
```

All fonts, material textures, and illustrations are local or generated in code. No API keys or external runtime service is required.

## Interaction

- Skip the opening with the visible intro button.
- Use the previous/next arrows or Left/Right keyboard keys to turn project pages.
- Open a case study to read its scaffold in an accessible dialog; Escape closes it.
- Replay the opening from the footer.
- Project selection is shareable through `?project=first-project` (or another project ID).
- Reduced motion opens directly to the first spread and changes projects without page animations.
- Phones show the 3D spread plus a readable project section underneath.
- Without WebGL, both pages appear in a usable HTML reading layout.
- Rendering stops while idle, off-screen, and while the document is hidden.

## Add your projects

Edit `src/book/projects.js`. Each entry controls the title, subtitle, description, role, year, team, disciplines, preview, and case-study chapters.

1. Replace the sample text and set `sample: false`.
2. Put images in `public/projects/` and set `previewImage: '/projects/your-image.webp'`. Supply descriptive `imageAlt` text. An external image URL also works.
3. Fill the `chapters` array with your story. Add a `caseStudyUrl` if your full case study lives elsewhere.
4. Add or remove project entries; the chapter controls and page numbers update automatically.

`src/book/BookScene.ts` contains the physical book, generated textures, lighting, curved-page geometry, animation, responsive camera, and cleanup. React renders selectable HTML into matching CSS3D page surfaces, keeping the typography crisp. `src/main.jsx` handles the portfolio UI, dialogs, content, and keyboard interaction. `src/style.css` contains the visual system and mobile reading layout.

## Validate and deploy

```sh
npm run typecheck
npm run build
npm test
```

Browser tests use `/usr/bin/chromium` with software WebGL enabled. They cover the opening sequence, actual WebGL draw calls, page navigation, keyboard interaction, dialogs, reduced motion, mobile touch/layout, and the HTML fallback.

Vercel: build command `npm run build`, output `dist`. See `THIRD_PARTY_NOTICES.md` for licenses.
