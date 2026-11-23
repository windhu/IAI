# Spec Delta

## Purpose

Gives the app a visible author identity. The interface shows a "峰哥出品" brand mark, which never alters the user's photos.

## ADDED Requirements

### Requirement: Brand mark in the header
The app SHALL display a text brand mark directly beneath the app title in the header. It SHALL be visible on load without a photo, and SHALL fit a 360 CSS px wide screen without horizontal scrolling.

#### Scenario: Brand visible on load
- **WHEN** the app is opened with no photo loaded
- **THEN** the brand mark is visible under the app title

#### Scenario: Fits on a phone
- **WHEN** the app is opened on a 360×640 portrait viewport in either language
- **THEN** the header shows the title, brand mark, and language switcher without horizontal scrolling

### Requirement: Localized brand text
The brand mark SHALL read "峰哥出品" when the interface language is Simplified Chinese, and "Made by Feng Ge" when it is English. It SHALL change together with the rest of the interface when the language is switched.

#### Scenario: Chinese brand
- **GIVEN** the interface language is `zh-CN`
- **WHEN** the app is displayed
- **THEN** the brand mark reads "峰哥出品"

#### Scenario: English brand after switching
- **GIVEN** the interface is in Simplified Chinese
- **WHEN** the user switches the language to English
- **THEN** the brand mark immediately reads "Made by Feng Ge"

### Requirement: Branding excluded from photos
The brand mark SHALL be part of the interface only. It SHALL NOT be drawn on the preview or included in any saved or shared image.

#### Scenario: Export without user watermark
- **GIVEN** a photo is loaded and the watermark text is empty
- **WHEN** the user saves the image
- **THEN** the saved image contains only the photo, with no brand text added
