# Josh Lucas — portfolio realm

A React portfolio with a full-screen charcoal ASCII sky, six copper-and-ivory dragons rendered as shaded character tiles, a compact monospaced introduction, generated ambient sound, and reusable case study scaffolds below the scene. The original frog pond is preserved at `/pond.html`.

## Develop

Use Node.js 20.19+ or 22.12+ (validated with Node 24).

```sh
npm ci
npm run dev -- --port 3000
```

No external services, fonts, image requests, or credentials are required. All landscape art is drawn from characters on Canvas; project visuals are CSS and SVG. Sound is synthesized locally and is off by default.

## Edit the portfolio

- `src/portfolio/main.jsx`: React layout, navigation, project cards, dialogs, sound.
- `src/portfolio/Realm.jsx`: procedural dragon model, low-resolution color sampling, screen-aligned character tiles, wing animation, and cursor effects.
- `src/portfolio/portfolio.css`: colors, typography, responsive layouts, visual styling.
- `src/portfolio/projects.js`: placeholder project content and five reusable story chapters.

Project content is intentionally labeled as a scaffold. Replace it with verified details and actual project imagery. The contact section currently links to the existing portfolio instead of inventing contact information. Nothing has been published to the live domain.

## Validate and build

```sh
npm run build
npm test
```

Browser tests use the environment's Chromium at `/usr/bin/chromium`; the Playwright configuration starts a development server when needed. Checks cover animation and pause, case study navigation, modal close behavior, sound controls, mobile scene layout, light/dark mode, reduced-motion startup, and the original pond interactions. Production output is in `dist`, including both portfolio and pond pages.

## Interactions

- Explore work: scroll to project cards; select any card to explore the five-chapter case study scaffold.
- About: open the designer introduction and a link to the frog pond.
- Light/dark: switch the entire page and sky palette, including when animation is paused.
- Sound: enable quiet wind and click-to-chime effects. Audio only starts after explicit interaction.
- Pause: stop the dragons and ambient visual effects; Space also toggles pause when the page background has focus.
- Reduced motion: the scene starts still, with an explicit Resume option.

The current Framer site and domain settings are unchanged. A separate hosting deployment is needed for a public preview.
