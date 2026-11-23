# Tasks

## 1. Translation core

- [x] 1.1 In `web/app.js`, add `MESSAGES` with `en` and `zh-CN` entries for every interface string: title, heading, choose photo, no photo, watermark text label and placeholder, font size, color, opacity, position label and its 6 options, save, share, footnote, decode error (`{name}`), export error, and resize notice (`{width}`, `{height}`). Add a `t(key, params)` helper and a pure `resolveLanguage(saved, browserLanguages)` (saved, then first `zh*` → `zh-CN` / `en*` → `en`, otherwise `en`), and expose both on `window.WatermarkI18n`. Verify with 1.2.
- [x] 1.2 Add `tests/i18n.test.html` (no dependencies, loads `../web/app.js`). It asserts: `resolveLanguage` gives the right result for `["zh-CN","en-US"]`, `["zh-TW"]`, `["fr-FR","de-DE"]`, `["en-GB","zh-CN"]`, a saved `"zh-CN"` with `["en-US"]`, and an invalid saved value; both dictionaries have identical key sets; and no value is empty. Verify that opening it through `file://` in headless Chrome reports ALL PASSED, and that `tests/layout.test.html` still passes.

## 2. Localized interface

- [x] 2.1 Update `web/index.html`: add `data-i18n` / `data-i18n-placeholder` to every translatable element, and wrap each label's text in its own `<span data-i18n>` so the value `<output>`s are untouched. Add the language `<select id="lang">` (`English` / `中文`) to a header row next to the `<h1>`, and style it in `web/styles.css` (≥44 px tall, no overflow at 360 px). Verify that the page renders unchanged in English before and after the script runs.
- [x] 2.2 Implement `applyLanguage(lang)`: translate the `data-i18n*` elements, set `document.title` and `document.documentElement.lang`, sync the switcher value, and re-render any error/notice currently shown. Do this by storing runtime messages as `{key, params}` and moving the three runtime strings to `t()`. Verify in the browser e2e check that after switching to 中文 every `data-i18n*` element shows its `zh-CN` text, `lang` is `zh-CN`, and a decode error appears in Chinese.
- [x] 2.3 Wire start-up and switching. At start-up, `resolveLanguage(storedPref, navigator.languages || [navigator.language])`. On switcher change, call `applyLanguage` and save `watermark.lang` to `localStorage`, all in try/catch. Verify in browser e2e: a `zh-CN` browser locale shows Chinese, `fr-FR` shows English, a manual switch survives reload, and switching with a photo loaded keeps the photo, settings and preview pixels unchanged.

## 3. Chinese watermark rendering

- [x] 3.1 Extend `FONT_FAMILY` in `web/app.js` and the `body` font in `web/styles.css` with the CJK stack from design.md. Verify in browser e2e that the watermark "© 张三 摄影" exports with watermark proportions matching the preview (comparable via the layout scaling), and check the tiled "版权所有" preview screenshot for correct glyphs with no missing-glyph boxes.
- [x] 3.2 Re-run the existing layout tests and the full previous e2e flow in English: no horizontal scroll at 360 px in either language, ≥44 px tap targets including the switcher, `holiday-watermarked.jpg` at 4000×3000 with the UI in Chinese, and no network requests or console errors. Verify that all checks pass.

## 4. Documentation

- [x] 4.1 Update `README.md`: mention Simplified Chinese support, automatic detection, the switcher and its remembered preference, and add `tests/i18n.test.html` to the Tests section and project layout. Verify that the README's test instructions work as written.
