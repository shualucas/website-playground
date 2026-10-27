# Meadow

A fresh React + Canvas experiment: a sunlit, pixel-rendered field of grass. The previous portfolio, maps, case studies, and pond have been removed from the current codebase. Earlier versions remain in Git history.

The landscape is generated locally; it is not a video, image, or external map. Thousands of depth-sorted blades receive coherent moving wind waves. Cursor proximity and movement velocity apply separate pressure forces. Damped springs retain a wake and let the blades settle naturally after the cursor leaves. A low-resolution rendering buffer and nearest-neighbor scaling produce the pixel treatment.

## Run

Use Node.js 20.19+ or 22.12+ (validated with Node 24).

```sh
npm ci
npm run dev -- --port 3000
```

No external assets, services, API keys, or network access are required at runtime.

## Controls

- Move the mouse through the field or drag a finger to part the grass.
- Gentle / steady / gusty changes the ambient wind strength.
- Pause / resume freezes or restarts the simulation. Space is the keyboard shortcut when a control is not focused.
- Just the field hides the interface; Show interface restores it. H also toggles this view.
- Reduced-motion preferences start the field paused; it can be explicitly resumed.

## Edit

- `src/meadow.js`: seeded landscape, grass blades, wind, cursor forces, damped recovery, and pixel rendering.
- `src/main.jsx`: React controls, state, and keyboard interaction.
- `src/style.css`: responsive, unobtrusive interface.

The simulation targets 30 frames per second, caps the internal pixel resolution, skips updates while the document is hidden, and releases its animation frame and listeners on cleanup.

## Verify and deploy

```sh
npm run build
npm test
```

Browser checks cover actual canvas changes under ambient wind, pause, wind strength, cursor-only interaction and spring recovery, touch, responsive sizing, keyboard controls, immersive mode, and reduced motion. Tests use the environment's Chromium at `/usr/bin/chromium`.

Vercel: build command `npm run build`, output directory `dist`. Domain/DNS settings remain separate from repository deployment.
