# Proposal

## Why

The app's interface is English only, and Chinese users are a key audience. Chinese text typed as a watermark already renders through the browser's font fallback, but the font list in the app doesn't include any Chinese font. Whether a watermark like "© 张三" looks right, or the same in preview and export, therefore depends on the device.

## What Changes

- Add Simplified Chinese (zh-CN) translations for all interface text, alongside the existing English. This covers labels, buttons, position options, the placeholder, the footnote, the page title, and error/notice messages.
- Choose the language automatically from the browser's preferred languages: any `zh*` language shows Chinese, and everything else shows English.
- Add a visible EN / 中文 switcher. The choice applies immediately, without reloading or losing the loaded photo or settings. It is remembered on the device and overrides auto-detection on later visits.
- Keep the page's `lang` attribute in sync with the active language, so the browser picks correct Chinese glyphs and accessibility tools work properly.
- Make Chinese watermark text render reliably by adding common Simplified Chinese system fonts to both the watermark and UI font stacks. Mixed Chinese and Latin text keeps preview/export parity.
- Saved files keep the existing `<original-name>-watermarked.<ext>` naming in both languages.

Out of scope: Traditional Chinese, languages other than English and Chinese, bundled web fonts, right-to-left layouts, and translating the README.

## Capabilities

### New Capabilities
- `ui-localization`: Interface language support. Covers the available languages, how the initial language is chosen, the manual switcher and its remembered preference, and a complete translation for each supported language.

### Modified Capabilities
- `photo-watermarking`: Adds a requirement that Chinese (CJK) watermark text, including text mixed with Latin characters, renders correctly. The preview and the saved image must match, as they already do for Latin text. Existing requirements are unchanged.

## Impact

- `web/index.html`: language switcher control, and translatable text marked for lookup.
- `web/app.js`: message dictionaries (en, zh-CN), language resolution and persistence, re-rendering text on switch, localized error/notice messages, and a CJK-capable watermark font stack.
- `web/styles.css`: CJK-capable UI font stack and switcher styling.
- `tests/`: new browser test page for language resolution and dictionary completeness; layout tests still pass.
- `README.md`: mention Chinese support and the language switcher.
- No new dependencies, build step, or network requests. The language preference is stored only in the browser's local storage.
