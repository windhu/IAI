# Spec Delta

## Purpose

Defines how the watermark app is delivered and run: as static web files with no build step and no installation, usable in mobile browsers on Android.

## ADDED Requirements

### Requirement: No build step
The app SHALL consist only of static HTML, CSS, and JavaScript files that run as-is. It SHALL NOT need a compiler, bundler, package manager, or third-party runtime dependencies.

#### Scenario: Run from a fresh checkout
- **GIVEN** a fresh copy of the repository
- **WHEN** the app folder is served by any static file server
- **THEN** the app loads and works without running any install or build command

### Requirement: No installation required
The app SHALL work by opening its URL (or local `index.html`) in a browser. It SHALL NOT require installing an APK or any browser extension.

#### Scenario: Open in Android browser
- **WHEN** a user opens the hosted app URL in Chrome for Android
- **THEN** the full watermark workflow is available without any install prompt being required

#### Scenario: Open local file
- **WHEN** a user opens `index.html` directly from local storage on a desktop browser
- **THEN** the app loads and the watermark workflow works

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
