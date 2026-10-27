# Third-party notices

This journal is a new Three.js implementation. Earlier ASCII experiments remain in Git history.

- **Three.js** provides the WebGL renderer, geometry, lighting, materials, and CSS3DRenderer. MIT license, copyright three.js authors. Full notice: `public/licenses/three-MIT.txt`.
- **DM Sans** is bundled locally through `@fontsource/dm-sans`. SIL Open Font License: `public/licenses/DM-Sans-OFL.txt`.
- **Cormorant Garamond** is bundled locally through `@fontsource/cormorant-garamond`. SIL Open Font License: `public/licenses/Cormorant-Garamond-OFL.txt`.
- **html-to-image** captures the local React page layout and embedded fonts into a shared print texture. MIT license: `public/licenses/html-to-image-MIT.txt`.
- **React**, **React DOM**, **Vite**, **TypeScript**, and **Playwright** retain their licenses in their distributed packages.

The spellbook geometry, generated leather and parchment albedo/normal/roughness textures, studio reflection environment, sewn binding, ASCII portal, impact dust, curved page simulation, pickup/drop physics, and opening choreography are implemented in this repository. No external model, photograph, or runtime asset service is required.

## Page-turn animation reference

[Animated Book Slider Three.js](https://github.com/pakagronglb/animated-book-slider-threejs), revision `3dd1a49855e7f74f4a2b86c705910d7284cc5c52`, was inspected as the page-motion reference. Its README declares MIT licensing and credits [Wawa Sensei’s book tutorial](https://www.youtube.com/watch?v=b7a_Y1Ja6js).

The local implementation uses independently written vertex articulation inspired by its 30-section skeletal page, separate inside/outside curves, damped hinge, and outer-edge fold. The reference’s source files, photographs, cover artwork, and audio are not included.
