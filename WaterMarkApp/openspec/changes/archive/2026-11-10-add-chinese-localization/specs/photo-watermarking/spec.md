# Spec Delta

## ADDED Requirements

### Requirement: Chinese watermark text
The system SHALL render watermark text containing Simplified Chinese characters, alone or mixed with Latin characters, using a font that has the required glyphs. No missing-glyph boxes may appear. The watermark SHALL keep the same relative size and position in the preview and the exported image.

#### Scenario: Chinese text in preview and export
- **GIVEN** a photo is loaded and the watermark text is "© 张三 摄影"
- **WHEN** the user views the preview and then saves the image
- **THEN** both show the full text with correctly rendered Chinese characters, at the same relative size and position

#### Scenario: Tiled Chinese text
- **GIVEN** the watermark text is "版权所有" and the position is tiled
- **WHEN** the preview is rendered
- **THEN** the Chinese text repeats diagonally across the whole image, with spacing based on its measured width
