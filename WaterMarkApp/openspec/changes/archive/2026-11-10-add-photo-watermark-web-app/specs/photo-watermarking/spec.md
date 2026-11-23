# Spec Delta

## Purpose

Lets a user pick a photo on their device, add a configurable text watermark to it, preview the result, and save the watermarked image. Everything happens locally on the device.

## ADDED Requirements

### Requirement: Select a single photo
The system SHALL let the user select exactly one image file (JPEG, PNG, or WebP) from the device gallery or file picker, and SHALL display it in a preview area.

#### Scenario: User selects a photo
- **WHEN** the user taps the "Choose photo" control and picks a JPEG image
- **THEN** the image is shown in the preview area, scaled to fit the screen width

#### Scenario: User selects a non-image file
- **WHEN** the user picks a file that cannot be decoded as an image
- **THEN** the system shows an error message and keeps the previous state unchanged

#### Scenario: User replaces the photo
- **GIVEN** a photo is already loaded
- **WHEN** the user picks a different photo
- **THEN** the new photo replaces the old one and the current watermark settings are kept

### Requirement: Configure text watermark
The system SHALL let the user enter watermark text and adjust font size, color, opacity (0–100%), and position. Position is one of: top-left, top-right, center, bottom-left, bottom-right, or tiled.

#### Scenario: Default settings
- **WHEN** a photo is loaded for the first time
- **THEN** the watermark settings default to empty text, white color, 50% opacity, and bottom-right position

#### Scenario: Tiled position
- **WHEN** the user selects the "tiled" position with non-empty text
- **THEN** the text repeats diagonally across the whole image

### Requirement: Live preview
The system SHALL update the preview whenever the photo or any watermark setting changes, without requiring an extra "apply" action.

#### Scenario: Text changes update the preview
- **GIVEN** a photo is loaded
- **WHEN** the user types "© Alice" into the watermark text field
- **THEN** the preview shows "© Alice" in the selected position within about 200 ms

### Requirement: Resolution-independent watermark sizing
The system SHALL scale the watermark relative to the image dimensions, so the preview and the exported image look the same regardless of screen size.

#### Scenario: Export matches preview proportions
- **GIVEN** a 4000×3000 photo is previewed on a 400 px wide screen
- **WHEN** the user exports the image
- **THEN** the watermark in the exported image takes up the same relative size and position as in the preview

### Requirement: Export watermarked image
The system SHALL export the watermarked image at the original photo's full pixel dimensions and SHALL save it to the device as a new file. The original file is never modified.

#### Scenario: Save image
- **GIVEN** a photo is loaded and the watermark text is non-empty
- **WHEN** the user taps "Save"
- **THEN** the browser downloads an image file named `<original-name>-watermarked.<ext>` with the same width and height as the original

#### Scenario: Export disabled without a photo
- **WHEN** no photo is loaded
- **THEN** the "Save" control is disabled

#### Scenario: Share when supported
- **GIVEN** the browser supports sharing files
- **WHEN** the user taps "Share"
- **THEN** the system opens the device share sheet with the watermarked image attached

### Requirement: Local-only processing
The system SHALL process images entirely on the device and SHALL NOT send image data or watermark text over the network.

#### Scenario: No network use during processing
- **WHEN** the user loads, watermarks, and saves a photo
- **THEN** no network requests containing image data are made
