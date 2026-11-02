# Working in this repository

- Use the existing checkout. Tasks are isolated; create a worktree only if requested.
- Read the root README for the current route/file map and focused check commands.
- Inspect the affected component and its imports first. Expand searches only when necessary; avoid reading historical docs or archived source for current-page fixes.
- `/` is the cartridge portfolio, `/after-hours/` the current flyer zine, `/resume/` the floating résumé, and `/photos/` film. `/zine/` and `src/main.jsx` preserve the old portfolio; do not rewrite or remove them for current-site changes.
- Make the smallest clean change. Keep existing design, authored assets, navigation, reduced motion, touch/keyboard behavior, and drag-versus-click handling.
- Keep one owned animation clock per Three.js scene. Preserve fixed camera framing and shader/material quality; do not lower visual fidelity to make tests pass.
- Use `npm run setup` only when dependencies need checking; it reuses a lockfile-matching install. Do not reinstall dependencies or add packages for routine edits.
- Reuse a healthy dev server. Use `npm run review` for screenshots rather than duplicating Chromium, proxy, readiness, or capture scripts.
- Select tests by area and UI versus 3D as documented. Real GPU tests/captures run sequentially; lightweight UI checks can run together. Keep original assertions when reorganizing tests.
- Run the checks appropriate to changed behavior, then stop once they pass. Recheck after new changes/failures; use a final build for app changes rather than rebuilding after every edit.
- Live Last.fm configuration belongs on the server. Browser checks mock API responses; never print or embed keys. A gateway rejection does not establish that an upstream API is broken.
- Keep startup instructions brief and defer to this file/README instead of duplicating specifications. Preserve license notices and original PDF/label/flyer artwork.
