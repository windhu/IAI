# Photo Watermark

A small web app that adds a text watermark to a photo, made for phones (Chrome for Android first).
The whole app is **one self-contained file, `web/index.html`**, with its CSS and JavaScript inline:
**no build step, no dependencies, nothing to install.** Copy or send that single file anywhere and it works.

- Pick one photo (JPEG, PNG or WebP) from your gallery
- Type the watermark text and adjust font size, color, opacity and position
  (corners, center, or tiled diagonally across the photo)
- See a live preview, then **Save** the result at the photo's original resolution,
  or **Share** it directly (on browsers that support sharing files)

Photos are processed entirely on your device and are never uploaded.

The app header carries the brand mark **峰哥出品** (shown as *Made by Feng Ge* in the English interface).
It is part of the interface only and is never added to your photos.

### Languages

The interface is available in **English** and **Simplified Chinese (简体中文)**.
On first visit the language follows your browser: any Chinese locale (zh-CN, zh-TW, zh-HK…)
shows Chinese, and everything else shows English. Use the **English / 中文** switcher next to the title
to change it at any time. Your photo and settings are kept, and the choice is remembered on
this device. Chinese watermark text (for example `© 张三 摄影`) is fully supported, including tiled mode.
Saved files are always named `<photo>-watermarked.<ext>`.

> **Note:** saved images do not keep the original EXIF metadata (location, date, camera info).

## Project layout

```
web/
  index.html         The entire app (HTML + inline CSS + inline JS) – the only file to edit and deploy
tests/
  load-app.js        Test helper: loads web/index.html in an iframe
  layout.test.html   Browser test page for the watermark layout logic
  i18n.test.html     Browser test page for language detection and translations
.github/workflows/
  deploy-pages.yml   Publishes web/ to GitHub Pages
```

Inside `index.html`, the code is split into sections marked `Styles`, `Watermark core`,
`Localization` and `UI`.

## Run locally

Either open `web/index.html` directly in a desktop browser, or serve the folder with any static server:

```
python -m http.server 8000 -d web
```

Then open <http://localhost:8000>. To try it on your phone, use your computer's LAN IP
(for example `http://192.168.1.20:8000`) while both devices are on the same network.

## Deploy (GitHub Pages)

Within the IAI repository, the root [deployment workflow](../.github/workflows/deploy-pages.yml)
publishes this app together with CarKeeper at
<https://windhu.github.io/IAI/WaterMarkApp/>. Set **Settings → Pages → Source** to
**GitHub Actions**, then push to `main` or run the workflow manually.

The nested `.github/workflows/deploy-pages.yml` is only active if WaterMarkApp itself is
the repository root; GitHub does not run nested workflows in IAI. Any other static host (Netlify, Cloudflare Pages,
an S3 bucket, nginx…) works too – just publish `web/index.html`.

## Use on Android

**Hosted:** open the Pages URL in Chrome, tap **Choose photo**, set your watermark, then tap **Save**
(the image goes to *Downloads* and shows up in your Gallery) or **Share**.

### Open on your phone without hosting

Because the app is a single file, you can simply send it to your phone:

1. Get `web/index.html` onto the phone, in any of these ways:
   - **USB / Files app:** copy it to the phone, for example into *Download*.
   - **WeChat / QQ:** send it to yourself (e.g. *File Transfer* / *我的电脑*), open the file message and
     **save it to the phone**, or tap **⋯ → Open with another app (用其他应用打开)**.
   - **Email:** download the attachment.
2. Open it with **Chrome**. In the Files app, tap the file and choose **Open with → Chrome**
   (or your browser) if asked.
3. Use the app as usual. Saved photos go to *Downloads* and show up in your Gallery.

Notes:
- The built-in previews of WeChat, QQ and mail apps are **not supported**, because they may not run the app.
  Always open the file in a browser.
- When opened as a local file, some phones don't keep the language choice between visits;
  switching language still works each time.

## Tests

The test pages load the real `web/index.html` in an iframe, so they must be **served over HTTP**
(opened directly from disk they show *NOT RUN* with this hint). From the repo root:

```
python -m http.server 8000
```

Then open each page; each should show **ALL PASSED**:

- <http://localhost:8000/tests/layout.test.html> checks that watermark positions and sizes scale
  proportionally with image size, so the saved image matches the preview.
- <http://localhost:8000/tests/i18n.test.html> checks browser-language detection, and that the English
  and Chinese translations have the same set of strings and none is empty.
- <http://localhost:8000/tests/responsive.test.html> checks responsive layout, enlarged text, preview
  resizing, and watermark positioning in the exported image.
