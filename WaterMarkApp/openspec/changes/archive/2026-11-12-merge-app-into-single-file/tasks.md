# Tasks

## 1. Merge into one file

- [x] 1.1 In `web/index.html`, replace `<link rel="stylesheet" href="styles.css">` with a `<style>` holding the full current `web/styles.css`, and replace `<script src="app.js"></script>` with a `<script>` holding the full current `web/app.js`. Add section comments (Styles / Watermark core / Localization / UI) and confirm the script has no literal `</script>`. Verify that `web/index.html` contains no `src=` or `href=` pointing at a file (only `data:` is allowed), and that every check of the previous localization and branding e2e flows passes against the new file.
- [x] 1.2 Delete `web/app.js` and `web/styles.css`. Verify that `web/` contains only `index.html` and that the served app has no 404s or console errors.

## 2. Tests

- [x] 2.1 Change `tests/layout.test.html` and `tests/i18n.test.html` to load `../web/index.html` in a hidden 360×640 same-origin iframe and read `WatermarkCore` / `WatermarkI18n` from `contentWindow` after `load`, keeping all existing assertions. On `file://`, catch the cross-origin error and show "Open via a local server: python -m http.server 8000" without reporting a pass. Verify that, served with `python -m http.server 8000` from the repo root, both pages report ALL PASSED (layout 41, i18n 18), and that opening one from disk shows the server message and not ALL PASSED.

## 3. Phone delivery checks

- [x] 3.1 Automated check for the "File copied on its own" scenario: copy only `web/index.html` into an empty temp folder, open it via `file://` in mobile-emulated Chrome (360×640) with `localStorage` blocked, and run the full flow: Chinese UI auto-detected, switch language, choose a photo, add a watermark, save, and confirm the download is at the original resolution. Verify that it makes no requests besides the page itself and produces no console errors.
- [x] 3.2 Manual check on a real Android phone (requires the user): send `web/index.html` via WeChat or QQ (or copy it via USB), save it, open it with "Open with → Chrome", and run choose photo → watermark → save. Verify that the saved image appears in the Gallery.

## 4. Documentation

- [x] 4.1 Update `README.md`: project layout (only `web/index.html`), a new "Open on your phone without hosting" section (USB/Files, WeChat/QQ/email → save → "Open with → Chrome"; in-app previews are not supported), and the Tests section (`python -m http.server 8000` from the repo root, then open `http://localhost:8000/tests/layout.test.html` and `…/i18n.test.html`). Verify that the commands work as written and that `.github/workflows/deploy-pages.yml` still uploads `web/` with no change needed.
