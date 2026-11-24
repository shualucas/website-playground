# Search Labs motion exports

The supplied comps are HTML, not MP4s. Latest source archive: [Google Drive ZIP](https://drive.google.com/file/d/17xhjV4_y409pc4nxR9nu7HIflJW7gmNq/view). Archive SHA-256: `13ae41b9eadcbafa8e2e8c2376a6a6ddf1f1cd8727a000bcf48ab4856c9e0d14`.

The hero (`search-labs-v0-sizzle.html`) and kit (`search-labs-v5-kit-sizzle.html`) embed the same 114-frame animated beaker GIF. Its native period is 4.17 seconds, with variable frame delays. The original exports stepped the scene's `__setTime` while the GIF continued playing on wall-clock time. A slow render therefore recorded skipping, accelerated GIF motion.

The corrected renderer decodes the GIF into composited PNG frames using FFmpeg and selects a frame from the original timestamps at each export time. It replaces every animated beaker image before rendering. The GIF, camera, and scene now use one logical timeline.

```sh
node scripts/render-search-labs.mjs --source /path/to/extracted/latest-zip --output /tmp/labs-render
```

Requires the existing Playwright Chromium installation, FFmpeg, and FFprobe. Outputs native 1600×1000, 30 fps H.264 videos, 1280×800 variants, posters, and JSON provenance manifests. Keep the manifests here; publish the six media files under `public/videos/search-labs/`.

The scene timing is preserved. The final bare-beaker outro holds briefly until a complete GIF cycle finishes, rather than speeding up the beaker or cutting between different GIF phases at the loop boundary. The 19.6-second hero exports to 20.867 seconds (five GIF cycles); the 27.3-second kit exports to 29.2 seconds (seven cycles). The frame-grid rounding is at most half a video frame.

The corrected media uses `-sync-` filenames so browsers request fresh files. The other three supplied comps do not contain an animated GIF and retain their existing exports.
