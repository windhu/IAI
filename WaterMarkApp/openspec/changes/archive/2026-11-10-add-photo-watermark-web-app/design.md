# Design

## Context

This is a greenfield repository: it contains only OpenSpec scaffolding and a Copilot setup workflow. For motivation, see proposal.md (Why). For required behavior, see the `photo-watermarking` and `web-app-delivery` specs. The main constraint is "easy to compile and deploy". This design reads that as no toolchain at all: the files in the repository are the files that run.

## Goals / Non-Goals

**Goals:**
- Three hand-written files (`web/index.html`, `web/styles.css`, `web/app.js`) that work when served statically **and** when opened through `file://`.
- Rendering code that does the same thing at preview size and at full export resolution.
- Deployment by push, via GitHub Pages.

**Non-Goals:**
- Offline install or PWA manifest and service worker (this can be added later without changing the specs).
- Image editing beyond the watermark (crop, filters, resize).
- Keeping EXIF metadata in the exported file.

## Decisions

1. **Plain classic `<script>` instead of ES modules or a framework.**
   Browsers block ES modules loaded over `file://` (CORS), which would break the "open `index.html` directly" scenario. A single IIFE in `app.js` avoids that.
   *Alternatives:* React or Vue via CDN (needs network access and adds weight); Vite or webpack (adds a build step).

2. **One `renderWatermark(ctx, image, settings, width, height)` function used for both preview and export.**
   - The preview canvas is sized to the displayed width multiplied by `devicePixelRatio`.
   - The export uses an offscreen canvas at the image's natural size.
   - Font size and margins are stored as a **percentage of the image's shorter side**, so the watermark proportions are the same in both outputs (resolution-independence requirement).
   *Alternative:* draw on a CSS overlay over an `<img>`. The preview is simpler, but the export then needs a second code path that can drift from it.

3. **Image decoding via `createImageBitmap(file, { imageOrientation: 'from-image' })`, falling back to `<img>` with an object URL.**
   This applies EXIF rotation, so phone photos appear upright. A decode failure triggers the spec's error scenario.

4. **Tiled mode.** Rotate the context by -30° and repeat the text on a grid. The grid spacing is the text width/height plus a gap. Tiles are drawn over the rotated bounding box so the corners are covered.

5. **Export format follows the input format.**
   - JPEG input exports as `image/jpeg` at quality 0.92.
   - PNG input exports as `image/png`.
   - WebP input exports as `image/webp`, and falls back to PNG if the browser cannot encode WebP.
   The export uses `canvas.toBlob`. The filename is `<base>-watermarked.<ext>`.

6. **Saving with `<a download>` and a blob URL. Sharing with `navigator.share({ files })`, gated by `navigator.canShare`.**
   On Chrome for Android, a download lands in Downloads and appears in the Gallery. The Share control is hidden when sharing is unsupported.

7. **Settings live in one plain object.** Every `input` event on a control updates the object and schedules a render with `requestAnimationFrame`. This coalesces rapid slider changes, which keeps the live preview fast.

8. **Deployment: GitHub Pages workflow** (`actions/upload-pages-artifact` + `actions/deploy-pages`) that uploads `web/` on pushes to the default branch.
   *Alternative:* a `gh-pages` branch, which needs manual branch management.

## Risks / Trade-offs

- [Large photos (for example 50 MP or more) can go over the browser's canvas size or memory limits on low-end phones, so the export comes out blank or fails] → Check that `toBlob` returns non-null. If it does not, retry at a scaled-down size that fits within about 16.7 MP and tell the user the image was resized.
- [EXIF metadata such as GPS and date is lost on export] → Accepted for v1. For privacy, this is arguably a benefit. Mention it in the README.
- [Fonts differ across devices] → Use a system font stack (`system-ui, sans-serif`). The watermark looks the same in preview and export on any one device.
- [`file://` downloads behave differently on some mobile browsers] → The README recommends the hosted URL for phones and treats `file://` as a desktop/dev option.

## Migration Plan

There is nothing to migrate. To deploy, enable GitHub Pages with source "GitHub Actions" in the repository settings and push. To roll back, revert the commit or disable Pages.

## Open Questions

- The final default font size percentage and the tiled spacing may need tuning by eye on real devices. This does not affect the specs or tasks.
