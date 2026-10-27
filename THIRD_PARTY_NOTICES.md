# Third-party notices

This RISO zine is an independent Three.js implementation. Earlier ASCII experiments remain in Git history.

- **Three.js** provides the WebGL renderer, geometry, lighting, materials, and CSS3DRenderer. MIT license, copyright three.js authors. Full notice: `public/licenses/three-MIT.txt`.
- **DM Sans** is bundled locally through `@fontsource/dm-sans`. SIL Open Font License: `public/licenses/DM-Sans-OFL.txt`.
- **Cormorant Garamond** is bundled locally through `@fontsource/cormorant-garamond`. SIL Open Font License: `public/licenses/Cormorant-Garamond-OFL.txt`.
- **html-to-image** captures the local React page layout and embedded fonts into a shared print texture. MIT license: `public/licenses/html-to-image-MIT.txt`.
- **React**, **React DOM**, **Vite**, **TypeScript**, and **Playwright** retain their licenses in their distributed packages.

The thin paper geometry, original two-ink cover art, halftone/registration/grain effects, paper textures, studio environment, folded saddle and staples, duotone ASCII artwork, articulated page simulation, spring-driven flex, printed inside covers, projected ground shadows, fixed-center 360° rotation, and opening choreography are implemented in this repository. No external model, photograph, or runtime asset service is required.

## Page-turn animation reference

[Animated Book Slider Three.js](https://github.com/pakagronglb/animated-book-slider-threejs), revision `3dd1a49855e7f74f4a2b86c705910d7284cc5c52`, was inspected as the page-motion and presentation reference. Its README declares MIT licensing and credits [Wawa Sensei’s book tutorial](https://www.youtube.com/watch?v=b7a_Y1Ja6js).

The local implementation uses independently written vertex articulation inspired by its 30-section skeletal page, separate inside/outside curves, damped hinge, and outer-edge fold. The angled composition, oversized scrolling typography, bottom pill navigation, independently eased emissive hover highlight (target intensity 0.22), click-to-turn leaves, and rotation gesture also follow the reference, adapted to Josh Lucas’s RISO zine. Rotation is applied to a fixed model pivot rather than panning the book or moving its camera. The reference’s source files, photographs, cover artwork, and audio are not included.
