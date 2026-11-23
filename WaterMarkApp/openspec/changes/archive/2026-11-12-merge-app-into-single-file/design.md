# Design

## Context

For motivation, see proposal.md; for requirements, see the `web-app-delivery` delta. Current state:

- The app is `web/index.html` (about 3.4 KB), `web/styles.css` (about 3.4 KB), and `web/app.js` (about 21 KB). The HTML loads the other two with `<link rel="stylesheet" href="styles.css">` and `<script src="app.js">`.
- `app.js` is one classic-script IIFE. When it is loaded without the app DOM (no `#app`), it skips UI wiring and only exposes `window.WatermarkCore` and `window.WatermarkI18n`. Both test pages rely on that by loading `../web/app.js` directly.
- The favicon is already inline (`data:,`). There are no other assets.
- The Pages workflow uploads `web/` as-is.

## Goals / Non-Goals

**Goals:**
- One file that is still pleasant to edit by hand. CSS and JS keep their current formatting and structure inside the HTML.
- No behavior change: every existing spec scenario still passes.
- The test pages keep testing the real shipped file.

**Non-Goals:**
- Generating the single file from separate sources (the user chose a single source file).
- Minifying or inlining fonts.

## Decisions

1. **Inline order matches the current file:**
   - `<style>` (the full former `styles.css`) goes in `<head>`, where the `<link>` was.
   - `<script>` (the full former `app.js`) goes at the end of `<body>`, where `<script src>` was.
   - Because the DOM already exists when the script runs, the existing start-up code needs no `DOMContentLoaded` change.
   - Edge case: the script must not contain the literal `</script>`. It does not today.

2. **Tests: same-origin iframe over HTTP.**
   - Each test page creates `<iframe src="../web/index.html">` (hidden, 360×640), waits for `load`, and takes `WatermarkCore` / `WatermarkI18n` from `iframe.contentWindow`. The assertions themselves stay the same.
   - Run the tests with `python -m http.server 8000` from the repo root and open `http://localhost:8000/tests/…`.
   - On `file://`, Chrome treats each file as its own origin, so accessing the iframe throws. The page catches that and shows "Open via a local server: python -m http.server 8000", marked as not run rather than as passed.
   - Side benefit: the tests now also catch start-up errors in the real app page.
   - *Alternative:* a self-test mode built into the app. Rejected because it ships test code to users.

3. **Opening local files on Android.**
   - Copying via USB or the Files app, or saving a WeChat, QQ, or email attachment, leaves the file on the device. "Open with → Chrome" then loads it through a `content://` or `file://` URL.
   - Everything the app needs works in that context:
     - inline script and style
     - `<input type=file>`
     - Canvas
     - `createImageBitmap`
     - blob-URL downloads
   - `localStorage` may be unavailable there. It is already wrapped in try/catch (`ui-localization`, "Storage blocked" scenario), so the language switch still works for the session.
   - The README tells WeChat and QQ users to save the file and then choose "Open with another app → Chrome". The in-app viewers are out of scope.

4. **Pages deployment is unchanged.** `web/` now holds just `index.html`. The workflow trigger `web/**` and the upload path still apply.

## Risks / Trade-offs

- [One file of about 28 KB is harder to navigate than three files] → Keep clear section comments in the file (`/* ===== Styles ===== */`, `// ===== Watermark core =====`, `// ===== Localization =====`, `// ===== UI =====`). This keeps it hand-editable.
- [Behavior on real Android devices with a `content://` URL can't be fully reproduced in desktop CI] → Automated check: open the file via `file://` from a temp folder containing only `index.html`, in a mobile-emulated Chrome with `localStorage` blocked. A manual check on a real phone is listed as a task.
- [Some vendor default browsers (for example MIUI or HarmonyOS) may handle local HTML differently] → Chrome for Android remains the supported target. Other browsers are best-effort, as before.
- [Tests no longer run when opened from disk] → The page says so clearly, and the README documents the one-line server command.

## Migration Plan

This is a repo-only change. Anyone with the old three files can replace them with the new `index.html`. For hosted users nothing changes after the Pages deploy. To roll back, revert the commit, which restores the three files.
