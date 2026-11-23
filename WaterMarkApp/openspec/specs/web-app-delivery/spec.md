# web-app-delivery Specification

## Purpose

Defines how the watermark app is delivered and run: as static web files with no build step and no installation, usable in mobile browsers on Android.

## Requirements
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

### Requirement: Mobile-friendly layout
The app SHALL provide a responsive, touch-friendly layout that fits a phone screen 360 CSS px wide or wider without horizontal scrolling.

#### Scenario: Portrait phone
- **WHEN** the app is opened on a 360×640 portrait viewport
- **THEN** all controls are visible by scrolling vertically only, and tap targets are at least 44 CSS px tall

### Requirement: Browser support
The app SHALL support current Chrome for Android and SHALL also work in current desktop Chrome, Edge, and Firefox.

#### Scenario: Unsupported share API
- **WHEN** the browser lacks file-sharing support
- **THEN** the "Share" control is hidden and "Save" still works

### Requirement: Static hosting deployment
The project SHALL document how to deploy the app to a static host. It SHALL also include an automated GitHub Pages deployment that publishes the app folder unchanged.

#### Scenario: Deploy to GitHub Pages
- **WHEN** changes are pushed to the default branch
- **THEN** the GitHub Pages workflow publishes the static files and the app becomes reachable at the Pages URL
