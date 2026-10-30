# Flyer originals

These five JPEG files are the user's supplied designs, copied without re-encoding or retouching, in upload order: Wavform, Metronome, Ghosts ’n’ Stuff, Jornada Coffee Pop-up, and Kiteclub.fm Picnic.

The active `/after-hours/` zine uses 1110×1280 page textures and physical pages with the same aspect ratio. Three originals fit edge to edge. The narrower Jornada flyer is centered at its original aspect with matching green extensions; Picnic receives matching pale-pink extensions above and below. Background grain is drawn only behind the original images. All lettering and artwork remain intact, without cropping or nonuniform scaling. Each flyer occupies one interior page, followed by an unprinted inside-back page.

The fitting logic and page order live in `src/after-hours/flyers.js`. The archived `/zine/` portfolio retains its original page dimensions and content.

The active edition is **Zine of Extracurriculars**. Its original covers live in `src/after-hours/covers.js`: warm cream paper, cobalt sliced lettering in self-hosted Staatliches from Google Fonts, rust outlines, and a back-cover index. “EXTRACURRICULARS” fits as one word at the font's natural proportions, with a smaller “ZINE OF” above it; there is no volume badge. The cover animation uses the existing Three.js clock, redraws at most 12 times per second while exposed, pauses offscreen with the scene, and holds static under reduced motion. The surrounding page shares the home background, header alignment, and 700ms blur/fade reveal. Left/right keys turn pages without requiring book focus; editable fields and modified shortcuts retain their normal behavior. Click pages to turn, drag to rotate, and press R to restart. These covers do not modify the archived edition or the flyer originals.
