# Josh Lucas — portfolio

Production: https://website-playground-eta.vercel.app/

React 19, Vite, and imperative Three.js. The home page has four career cartridges, a rotating bio, recent projects with dither/3D hover previews, and server-backed Last.fm listening. Current pages:

| Route | Entry and main files |
| --- | --- |
| `/` | `src/cartridge/main.jsx`; `Intro.jsx`, `RecentProjects.jsx`, `CartridgeScene.ts` |
| Case studies | `src/CaseStudy.jsx`, `src/CaseStudyNarrative.jsx`, `src/content/*-case-study.js` |
| `/after-hours/` | `src/after-hours/main.jsx`, `flyers.js`, `covers.js`, `src/book/BookScene.ts`, `leaf.ts` |
| `/resume/` | `src/resume/main.jsx`, `FloatingPaper.ts`, `PaperSurface.ts`, `profile.js` |
| `/photos/` | `src/photos/main.jsx`, `src/content/film-photos.js` |
| `/zine/` | Archived portfolio: `src/main.jsx`, `src/style.css`. Preserve it. |

Shared theme/controls/page shell live in `src/site.css`; each page has its own stylesheet. Shared entrances and exits live in `src/useContentReveal.js`, `src/reveal.css`, and `src/usePageExit.js`. The book has one owned clock; preview rotation is isolated in `src/book/preview-spin.ts`. Paper tuning is available at `/after-hours/?tune=1`.

## Start

Node 24 is the verified cloud runtime. Dependencies use the committed npm lockfile.

```sh
npm run setup                       # reuses a matching install; npm ci only when needed
npm run dev -- --port 3000 --strictPort
```

Setup does not build the app. Reuse an existing healthy Vite server. Live processes are not retained when restoring an environment snapshot. Last.fm uses `api/listening.js`, proxied by Vite locally; configure `LASTFM_API_KEY` on the server only. It is optional for development and mocked in browser checks. Never put credentials in browser code, scripts, or documentation.

## Choose checks by the change

| Change | Start here |
| --- | --- |
| Copy, layout, entrances, project index | `npm run test:home -- --project=ui` or `npm run test:projects -- --project=ui` |
| Cartridges, hit testing, materials | `npm run test:cartridges` |
| Listening widget | `npm run test:listening` and `npm run test:listening:ui` |
| Résumé | `npm run test:resume` |
| Camera/photos | `npm run test:camera` |
| Current flyer zine | `npm run test:flyers` |
| Archived portfolio | `npm run test:zine` |
| Shared helpers/API/math | `npm run test:unit` |

Append `-- --grep 'test name'` to a named command for a localized regression. UI files disable WebGL through `tests/support/portfolio.js`; real 3D checks remain separate. `npm run test:ui` runs all UI checks with two workers; `npm run test:3d` runs real renderer checks sequentially. `npm test` retains all current-portfolio checks; the archived suite stays separate. No assertions were removed during the split.

Run `npm run typecheck` for TypeScript changes. Run one final `npm run build` for application/entry/style changes; it also validates the canonical résumé PDF and preview dimensions. Expand coverage when changing shared behavior. Do not repeat successful checks without subsequent changes or unresolved failures. Do not substitute WebGL-disabled checks for visual verification of a 3D change.

## Visual review

One command starts or reuses Vite, shares the test browser configuration, waits for scene/entrance readiness, and saves a screenshot. Remote API responses are mocked, so captures need no credentials.

```sh
npm run review -- --page home
npm run review -- --page home --control '.footer-links a:first-child'
npm run review -- --page home --hover rave-flyer-zine --phase dither --theme dark
npm run review -- --page zine --phase turn
npm run review -- --page resume --width 390 --height 844
npm run review -- --page photos --motion reduce
```

Use `--help` for a custom local path, viewport, output, or port. Output defaults to ignored `test-results/review/`. The script stops only servers it owns. Software WebGL is the cloud default; keep 3D captures sequential. `CHROMIUM_EXECUTABLE_PATH` overrides the system browser; `BROWSER_RENDERER=hardware` opts into an available local GPU. The harness bypasses proxies only for loopback traffic.

## Authored assets and archived details

- Keep uploaded labels, covers, flyers, and the original résumé artwork intact.
- `public/resume/josh-lucas-resume.pdf` is canonical. Replacing it also requires matching 1200px/2400px PNG exports and link regions in `src/resume/paper.js`; `npm run build:resume` validates them and adds missing contact annotations without re-typesetting.
- [Historical edition notes](docs/archive/portfolio-history.md) preserve previous implementation details, not current specifications.
- [Third-party notices](THIRD_PARTY_NOTICES.md) and model/license files must remain intact.
