# Design

## Context

For motivation and scope, see proposal.md; for requirements, see the `ui-localization` and `photo-watermarking` deltas. Current state:

- The interface text is hard-coded in English in `web/index.html`. This covers the title, heading, labels, the six position `<option>`s, buttons, the placeholder and the footnote.
- `web/app.js` has three English runtime strings: the decode error, the export error, and the resized-image notice.
- `web/app.js` sets `FONT_FAMILY = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'`, which names no CJK font.
- Constraints from `web-app-delivery` still apply: a classic script, no modules, no build step, no network requests, and the app must work over `file://`.

## Goals / Non-Goals

**Goals:**
- One small in-file translation mechanism for both static markup and runtime messages.
- Switching language costs nothing: no reload, no lost state.
- Chinese watermark text is reliable on Android, Windows, macOS and Linux, without shipping fonts.

**Non-Goals:**
- A general internationalization framework: plural rules, ICU message format, or lazy-loaded locale files.
- Localizing number formats. Percentages read the same in both languages.

## Decisions

1. **Dictionaries live inside `app.js`** as `MESSAGES = { en: {...}, 'zh-CN': {...} }`.
   - Loading separate JSON files with `fetch` fails over `file://`, and a separate `<script>` per locale adds files for no benefit when there are only about 25 strings.
   - Interpolation is a tiny `{name}` replace, used by the error message (file name) and the resize notice (dimensions).
   - *Alternative:* `i18n/*.json` files loaded at runtime. Rejected because they break `file://`.

2. **Markup uses `data-i18n` attributes.**
   - Elements carry `data-i18n="key"` for their text, or `data-i18n-placeholder="key"` for a placeholder attribute.
   - `applyLanguage(lang)` walks these elements, sets `textContent` or the attribute, and also updates `document.title` and `document.documentElement.lang`.
   - The `<output>` value spans inside labels are kept separate from the translated label text. Each label text gets its own `<span data-i18n>`, so translating it doesn't wipe the live value.
   - The English text stays in the HTML as the fallback before the script runs.

3. **Language resolution is a pure function**: `resolveLanguage(saved, browserLanguages)`.
   - It returns `saved` if that is a supported language.
   - Otherwise it returns the first browser language matching `/^zh/i` (giving `zh-CN`) or `/^en/i` (giving `en`).
   - If nothing matches, it returns `en`.
   - It reads `navigator.languages`, falling back to `[navigator.language]`.
   - It is exposed on `window.WatermarkI18n` along with `MESSAGES`, so a test page can check it.

4. **Persistence** uses `localStorage` under the key `watermark.lang`, wrapped in try/catch. Some browsers throw for `file://` or in privacy modes; in that case the choice applies only to the current session, as the spec requires. The preference is stored only when the user switches manually; auto-detection never writes it.

5. **Switcher** is a two-option `<select>` (`English` / `中文`) in the header row, next to the `<h1>`.
   - A `<select>` is native, accessible, and reaches the 44 px tap height with the existing styles.
   - Each option label is written in its own language, so it never needs translating.
   - *Alternative:* a toggle button. It is less explicit about which language is current.

6. **Runtime messages are stored as keys plus parameters** (for example `{ key: 'errorDecode', params: { name } }`), not as rendered text. Switching language re-renders any error or notice that is currently showing in the new language.

7. **CJK font stacks.** The watermark and the UI share one font stack:
   ```
   system-ui, -apple-system, "Segoe UI", Roboto, "PingFang SC", "Hiragino Sans GB",
   "Microsoft YaHei", "Noto Sans CJK SC", "Noto Sans SC", "Source Han Sans SC", sans-serif
   ```
   - Latin fonts come first, so English text looks the same as before. The browser falls back character by character to the CJK fonts for Chinese glyphs.
   - Layout already scales from measured text width at 100 px (`MEASURE_FONT_SIZE`), so mixed-script text and tiled spacing need no layout changes.
   - Chrome for Android always has Noto CJK, so this mainly protects desktop browsers.

8. **The file name stays `<base>-watermarked.<ext>`** in both languages. Keeping it ASCII avoids encoding issues in download managers and matches the existing Export requirement.

## Risks / Trade-offs

- [A new string is added in one language but not the other] → The i18n test page checks that both dictionaries have the same keys and no empty values. The browser e2e check switches to Chinese and confirms that every `data-i18n*` element resolves to a `zh-CN` entry.
- [Font fallback for mixed scripts differs slightly between preview and export] → Both are drawn on the same device with the same font string through `renderWatermark`, so they match. The e2e check compares the relative position and size of the watermark.
- [Chinese labels are longer or shorter than English and could break the 360 px layout] → Verify there is no horizontal scroll at 360 px in both languages.

## Migration Plan

No data migration is needed. Existing users with no saved preference get auto-detection, so Chinese-locale browsers switch to Chinese on their next visit. To roll back, revert the commit.
