# Proposal

## Why

The app has no visible author identity. The owner wants it branded as a "峰哥出品" (a Feng Ge production), so people who open the app know who made it. The mark must not alter anyone's photos.

## What Changes

- Add a text-based brand mark to the app header, shown as a small styled badge directly under the "Photo Watermark / 照片水印" title. Its text is **"峰哥出品"**.
- Localize the brand mark like other interface text. Simplified Chinese shows "峰哥出品", and English shows **"Made by Feng Ge"**. The mark switches together with the rest of the UI.
- The brand mark is interface-only. It is never drawn onto the preview canvas or into saved or shared images.
- Keep the header within the 360 px mobile layout in both languages.

Out of scope: image or SVG logo files, a favicon or app icon, stamping the brand onto photos, and making the brand configurable by users.

## Capabilities

### New Capabilities
- `app-branding`: The app's visible author identity. Covers the brand mark's text, where it appears, its localization, and the guarantee that branding never appears in user output.

### Modified Capabilities
<!-- None. The new brand string is covered automatically by the existing ui-localization requirement that every user-visible text has a translation in both languages. -->

## Impact

- `web/index.html`: header markup gains a title-plus-brand group containing a `data-i18n="brand"` element.
- `web/app.js`: one new `brand` key in both `MESSAGES` dictionaries. No logic changes, because the existing `applyLanguage` already translates `data-i18n` elements.
- `web/styles.css`: brand badge styling and the header grouping.
- `tests/`: the existing `i18n.test.html` key-parity check covers the new key; browser e2e verifies placement, localization, and that exports are unaffected.
- `README.md`: a short mention of the brand mark.
- No new dependencies, assets, or network requests.
