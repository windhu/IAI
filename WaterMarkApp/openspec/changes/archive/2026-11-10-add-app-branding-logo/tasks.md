# Tasks

## 1. Brand mark

- [x] 1.1 Add `brand` to both `MESSAGES` dictionaries in `web/app.js` (`en`: "Made by Feng Ge", `zh-CN`: "峰哥出品"). Verify that `tests/i18n.test.html` opened through `file://` reports ALL PASSED, which covers key parity and that the value is translated.
- [x] 1.2 In `web/index.html`, wrap the `<h1>` in a `.brand-group` element in the header and add `<p class="brand" data-i18n="brand">Made by Feng Ge</p>` under it. Style `.brand` in `web/styles.css` as a small badge (accent color, small font, no extra tap target), and keep the title/brand group shrinkable next to the language switcher. Verify in browser e2e at 360×640 in both `en-US` and `zh-CN`: the brand is visible under the title with no photo loaded, shows the correct text, and there is no horizontal scroll.
- [x] 1.3 Verify in browser e2e: switching 中文 → English updates the brand to "Made by Feng Ge" immediately, and saving a solid-color 4000×3000 photo with empty watermark text produces a file whose pixels are all the original color (no brand text). Also verify that the existing checks still pass: `tests/layout.test.html`, no console errors, no network requests.

## 2. Documentation

- [x] 2.1 Mention the "峰哥出品 / Made by Feng Ge" brand mark in `README.md` (shown in the app header only, never on saved photos). Verify that the README renders correctly as Markdown.
