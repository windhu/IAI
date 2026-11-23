# Proposal

## Why

Users want to add a text watermark to a photo on an Android phone. They don't want to install an APK or set up an Android build toolchain. A plain HTML/CSS/JavaScript page runs in the phone's browser, has no compile step, and can be hosted anywhere as static files, so it is easy to build and deploy.

## What Changes

- Add a new static web app (plain HTML, CSS, and vanilla JavaScript, with no framework, bundler, or build step) that targets mobile browsers on Android (Chrome for Android first).
- Let the user pick one photo from the device gallery or file picker.
- Let the user type watermark text and adjust its basic look: font size, color, opacity, and position. The user sees a live preview.
- Draw the watermark onto the photo at the photo's full resolution using the browser Canvas API. The photo stays on the device and is never uploaded.
- Let the user save or download the watermarked image to the device. Where the browser supports it, the user can also share it.
- Make the app usable by opening `index.html` or by serving the folder from any static host (for example GitHub Pages). It needs no installation and no server-side code.

Out of scope for v1: image/logo watermarks, date stamps, batch processing, camera capture, native Android (APK) packaging, and Play Store distribution.

## Capabilities

### New Capabilities
- `photo-watermarking`: Selecting a photo, configuring a text watermark, previewing it, and exporting the watermarked image entirely on the device.
- `web-app-delivery`: How the app is delivered and run: static files, no build step, no install, and support for Android mobile browsers.

### Modified Capabilities
<!-- None: no existing specs in this project. -->

## Impact

- New `web/` folder containing `index.html`, `styles.css`, and `app.js`, plus a root `README.md` with run and deploy instructions.
- No runtime dependencies, package manager, or build tooling.
- New GitHub Pages workflow under `.github/workflows/` that publishes `web/` as-is.
- Privacy: all image processing happens in the browser, and the app makes no network requests.
