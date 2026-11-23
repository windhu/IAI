# Proposal

## Why

The app is three files (`index.html`, `styles.css`, `app.js`). Getting it onto a phone without hosting means copying all three and keeping them in the same folder. That is error-prone over USB and impossible through WeChat, QQ, or email, which send one attachment at a time and drop the folder structure. A single self-contained HTML file can be sent, copied, and opened like any other document.

## What Changes

- **BREAKING (repo layout):** merge `web/styles.css` into an inline `<style>` and `web/app.js` into an inline `<script>`, both inside `web/index.html`, then delete the two separate files. `web/index.html` becomes the only app file and the only file developers edit. There is still no build step and nothing is generated.
- The single file references no other local or remote resources: no external stylesheet, script, font, or image. Copying `index.html` alone is enough to run the app.
- Support opening that one file on an Android phone. The file can be copied over USB or the Files app, or received via WeChat, QQ, or email, and then opened with Chrome for Android (for example "Open with → Chrome"). The full workflow must work: choose photo, watermark, save, share where supported, and switch language.
- Hosting on GitHub Pages keeps working unchanged. The workflow still publishes `web/`, which now contains just `index.html`.
- The test pages (`tests/layout.test.html`, `tests/i18n.test.html`) load `../web/index.html` in a same-origin iframe instead of `../web/app.js`, and are run through a local static server. When they are opened directly from disk, they show a clear "run via local server" message.
- Update the README with the new layout, the "send the file to your phone" instructions, and the new way to run tests.

Out of scope: opening the file inside a messaging app's own built-in viewer (for example WeChat's in-app document preview, which may not run scripts), iOS, browsers other than those already listed in the specs, offline install/PWA, and minification.

## Capabilities

### New Capabilities
<!-- None -->

### Modified Capabilities
- `web-app-delivery`:
  - "No build step" now requires a single self-contained HTML file with inline CSS and JavaScript and no other file references.
  - "No installation required" gains the scenario of opening the single file on an Android phone after copying or receiving it.

## Impact

- `web/index.html`: absorbs all CSS and JavaScript. The behavior and the exposed `window.WatermarkCore` / `window.WatermarkI18n` hooks are unchanged.
- `web/app.js` and `web/styles.css`: deleted.
- `tests/layout.test.html` and `tests/i18n.test.html`: switch to iframe loading; they must be served over HTTP.
- `README.md`: project layout, phone instructions, test instructions.
- `.github/workflows/deploy-pages.yml`: no change needed; verify it still publishes `web/`.
- No new dependencies. File size is about 28 KB, so the file stays easy to send.
