# Spec Delta

## MODIFIED Requirements

### Requirement: No build step
The app SHALL be a single self-contained HTML file (`web/index.html`) with all CSS and JavaScript inline, and that file SHALL run as-is. It SHALL NOT reference any other local or remote file (stylesheets, scripts, fonts, or images), and it SHALL NOT need a compiler, bundler, package manager, or third-party runtime dependencies.

#### Scenario: Run from a fresh checkout
- **GIVEN** a fresh copy of the repository
- **WHEN** the app folder is served by any static file server
- **THEN** the app loads and works without running any install or build command

#### Scenario: File copied on its own
- **GIVEN** only `index.html` is copied into an otherwise empty folder
- **WHEN** it is opened in a supported browser
- **THEN** the app loads with full styling and the watermark workflow works, without requesting any other file

### Requirement: No installation required
The app SHALL work by opening its URL (or local `index.html`) in a browser. It SHALL NOT require installing an APK or any browser extension.

#### Scenario: Open in Android browser
- **WHEN** a user opens the hosted app URL in Chrome for Android
- **THEN** the full watermark workflow is available without any install prompt being required

#### Scenario: Open local file
- **WHEN** a user opens `index.html` directly from local storage on a desktop browser
- **THEN** the app loads and the watermark workflow works

#### Scenario: Open the file on an Android phone
- **GIVEN** `index.html` was copied to the phone via USB or the Files app, or received as an attachment via WeChat, QQ, or email
- **WHEN** the user opens it with Chrome for Android (for example "Open with → Chrome")
- **THEN** the app loads and the user can choose a photo, add a watermark, switch language, and save the result
