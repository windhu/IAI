# Tasks

## 1. Scaffold static app

- [x] 1.1 Create `web/index.html` (viewport meta, file input `accept="image/jpeg,image/png,image/webp"`, preview `<canvas>`, controls for text/size/color/opacity/position, Save and Share buttons, error area) and `web/styles.css` (mobile-first, ≥44 px tap targets, no horizontal scroll at 360 px). Verify by opening `index.html` in a browser: the page renders with no console errors, and in DevTools device mode at 360×640 there is no horizontal scrollbar.
- [x] 1.2 Create `web/app.js` as a single classic-script IIFE (no ES modules) holding the settings object with defaults (empty text, white, 50% opacity, bottom-right). Verify that opening `web/index.html` through `file://` loads the script with no errors.

## 2. Photo loading

- [x] 2.1 Decode the selected file with `createImageBitmap(file, { imageOrientation: 'from-image' })`, falling back to `<img>` + object URL. Show an error and keep the previous state when decoding fails. Keep the current settings when the photo is replaced. Verify manually: load a JPEG, then a renamed `.txt`, then a second photo, and confirm the behavior in each spec scenario.
- [x] 2.2 Keep Save and Share disabled until a photo is loaded. Verify that the buttons are disabled on first load and enabled after a photo is picked.

## 3. Watermark rendering

- [x] 3.1 Implement a pure `computeLayout(settings, width, height, textMetrics)` that returns text positions for the five anchor positions and the tiled grid. Font size and margins come from a percentage of the shorter side. Expose it as `window.WatermarkCore` for testing. Add `tests/layout.test.html`, a dependency-free page that loads `../web/app.js` and asserts that layouts at 400×300 and 4000×3000 have proportional coordinates for every position. Verify that the test page reports all assertions passing.
- [x] 3.2 Implement `renderWatermark(ctx, image, settings, width, height)` using `computeLayout`, handling color, opacity, and the system font stack, plus tiled mode (rotated -30°, covering the corners). Verify visually that every position and tiled mode render correctly on a sample photo.
- [x] 3.3 Wire the live preview: size the canvas to displayed width × `devicePixelRatio`, and re-render through `requestAnimationFrame` on every `input` event and photo change. Verify that typing into the text field and moving the sliders update the preview right away with no "apply" step.

## 4. Export and share

- [x] 4.1 Export at natural size on an offscreen canvas. The output format follows the input format (JPEG quality 0.92, PNG, or WebP with a PNG fallback), and the filename is `<base>-watermarked.<ext>`. Save through `<a download>` with a blob URL. If `toBlob` returns null, retry downscaled to ≤16.7 MP and notify the user. Verify that saving a 4000×3000 JPEG produces a 4000×3000 file with the expected name, and that the watermark proportions match the preview.
- [x] 4.2 Add Share through `navigator.share({ files })`, shown only when `navigator.canShare({ files })` is true. Verify that the share sheet opens on Chrome for Android and that the button is hidden in desktop Firefox.
- [x] 4.3 Confirm local-only processing. Verify that the DevTools Network tab shows no requests after the initial page load during a full load → watermark → save flow.

## 5. Deployment and documentation

- [x] 5.1 Add `.github/workflows/deploy-pages.yml` that uploads `web/` with `actions/upload-pages-artifact` and deploys it with `actions/deploy-pages` on pushes to the default branch and on `workflow_dispatch`. Verify that the workflow YAML is valid (for example with `actionlint`, if available) and, once pushed, that the Pages URL serves the app.
- [x] 5.2 Write `README.md` covering: what the app does; running locally (open `web/index.html`, or `python -m http.server -d web`); deploying (enable Pages with source "GitHub Actions", then push); using it on Android (open the Pages URL in Chrome); the EXIF-stripping note; and how to run `tests/layout.test.html`. Verify that each documented command works as written.

## 6. Integration check

- [x] 6.1 End-to-end on a real Android phone (or Chrome DevTools device emulation if no phone is available) using the hosted URL: choose a gallery photo, set the text, try each position and tiled mode, then save and share. Verify that the saved image appears in the Gallery with the watermark and at the original resolution.
