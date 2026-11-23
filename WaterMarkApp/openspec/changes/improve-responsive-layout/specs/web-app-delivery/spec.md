# Spec Delta

## MODIFIED Requirements

### Requirement: Mobile-friendly layout

The app SHALL provide a responsive, touch-friendly layout that fits a phone screen 360 CSS px wide or wider without horizontal scrolling. It SHALL make better use of wider screens while keeping text and controls readable and operable.

#### Scenario: Portrait phone
- **WHEN** the app is opened on a 360×640 portrait viewport
- **THEN** all controls are visible by scrolling vertically only, and tap targets are at least 44 CSS px tall

#### Scenario: Phone content and text
- **WHEN** the viewport is 360 or 390 CSS px wide and the browser default font is 16 CSS px
- **THEN** the main content has at most 12 CSS px of padding on each side and the body text is at least 17 CSS px

#### Scenario: Desktop workspace
- **WHEN** the viewport is 1440 CSS px wide at default text size
- **THEN** the workspace is at least 1000 CSS px wide and the photo preview and controls are displayed side by side

#### Scenario: Narrow workspace
- **WHEN** the viewport is 360 or 390 CSS px wide
- **THEN** the photo preview and controls are stacked vertically and remain usable in both supported languages

#### Scenario: Enlarged text
- **WHEN** the browser default font size is increased to 200% at a viewport of at least 360 CSS px
- **THEN** labels and controls remain visible and operable without horizontal page scrolling
