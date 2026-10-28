# Third-party notices

This portfolio zine is an independent Three.js implementation. Earlier ASCII experiments remain in Git history.

- **Three.js** provides the WebGL renderer, geometry, lighting, materials, and CSS3DRenderer. MIT license, copyright three.js authors. Full notice: `public/licenses/three-MIT.txt`.
- **DM Sans** is bundled locally through `@fontsource/dm-sans`. SIL Open Font License: `public/licenses/DM-Sans-OFL.txt`.
- **Cormorant Garamond** remains in the dependency manifest from earlier editions but is not loaded by the current presentation. Its retained SIL Open Font License is `public/licenses/Cormorant-Garamond-OFL.txt`.
- **html-to-image** captures the local React page layout and embedded fonts into a shared print texture. MIT license: `public/licenses/html-to-image-MIT.txt`.
- **React**, **React DOM**, **Vite**, **TypeScript**, and **Playwright** retain their licenses in their distributed packages.

The thin paper geometry, original monochrome contour cover art, halftone/registration/grain effects, paper textures, studio environment, folded saddle and staples, full-page ASCII artwork, articulated page simulation, spring-driven flex, printed inside covers, projected ground shadows, fixed-center 360° rotation, and opening choreography are implemented in this repository. No external model, photograph, or runtime asset service is required.

## Page-turn animation reference

[Animated Book Slider Three.js](https://github.com/pakagronglb/animated-book-slider-threejs), revision `3dd1a49855e7f74f4a2b86c705910d7284cc5c52`, was inspected as the page-motion and presentation reference. Its README declares MIT licensing and credits [Wawa Sensei’s book tutorial](https://www.youtube.com/watch?v=b7a_Y1Ja6js).

The local implementation uses independently written native Three.js GPU skinning with shared 30-segment bind-pose geometries, per-leaf 31-bone skeletons, independently damped hinge/bend/fold states, and permanent front/back artwork. Persistent physical leaves and staggered overlapping starts adapt the reference’s underlying techniques; the local scheduler separately tracks requested, launched, and committed spreads. The angled composition, bottom pill navigation, independently eased emissive hover highlight (now 0.264), click-to-turn leaves, and rotation gesture also follow the reference, adapted to Josh Lucas’s portfolio zine. The wordmark and scrolling background text have been removed. Rotation is applied to a fixed model pivot rather than panning the book or moving its camera. The reference’s source files, photographs, cover artwork, and audio are not included.

## Ambient movement, loading and pop-up references

The slider's `Experience.jsx` wraps the book in Drei `Float` (`speed={2}`, `floatIntensity={1}`, `rotationIntensity={2}`). Drei 9.108.1's Float implementation was inspected: independently oscillating rotations and vertical movement. The local implementation independently adapts the time-based motion to native Three.js, with smaller rocking angles, separate drag orientation, reduced-motion support and interaction damping. The slider's `App.jsx` uses Drei `Loader` plus React Suspense; the local loader instead tracks the fonts, HTML page capture and renderer that this architecture actually owns. No Drei or R3F dependency was added.

[The Book of Leaks](https://github.com/HeyAIpenguin/book-of-leaks), copyright 2026 HeyAIpenguin (MIT), was inspected through its public `index.html` and preview image. Its grouped primitive objects, staggered scale/rotation emergence, ease-back overshoot and pre-turn retraction informed the local dioramas. The local objects, bone anchors, project palettes, artwork and scheduler integration are independently written; no upstream source files, models, page textures, audio or preview assets are shipped.

## Current editorial edition

The neutral editorial cover, film camera, racket (including its strings and coral grip wrap), GameCube-style controller and revised loading/theme controls are original procedural work. The controller is a stylized reference to the Nintendo GameCube controller; no Nintendo logo, model or texture is included. Three.js also provides RoundedBoxGeometry, ExtrudeGeometry, BufferGeometryUtils and ConvexHull under its existing MIT notice. The convex-hull fit samples off-scene copies of local leaves; no physics or animation package is added.
