# Spec Delta

## Purpose

Lets users use the app in their own language: it supports English and Simplified Chinese, picks a sensible language automatically, and lets the user switch at any time.

## ADDED Requirements

### Requirement: Supported interface languages
The app SHALL provide its complete user interface in English (`en`) and Simplified Chinese (`zh-CN`). Every user-visible text SHALL have a translation in both languages, including labels, buttons, options, placeholders, the page title, and error and notice messages.

#### Scenario: Chinese interface
- **GIVEN** the active language is `zh-CN`
- **WHEN** the app is displayed
- **THEN** all interface text, including the "Choose photo", "Save", and "Share" buttons and the position options, is shown in Simplified Chinese with no English left over

#### Scenario: Localized error message
- **GIVEN** the active language is `zh-CN`
- **WHEN** the user picks a file that cannot be decoded as an image
- **THEN** the error message is shown in Simplified Chinese

### Requirement: Automatic initial language
When no saved preference exists, the app SHALL choose the initial language from the browser's preferred languages, in order. Any language starting with `zh` SHALL map to `zh-CN`, and any language starting with `en` SHALL map to `en`. If none match, the app SHALL use English.

#### Scenario: Chinese browser
- **GIVEN** no saved language preference and browser languages `["zh-CN", "en-US"]`
- **WHEN** the app loads
- **THEN** the interface is shown in Simplified Chinese

#### Scenario: Other Chinese region
- **GIVEN** no saved language preference and browser languages `["zh-TW"]`
- **WHEN** the app loads
- **THEN** the interface is shown in Simplified Chinese

#### Scenario: Unsupported browser language
- **GIVEN** no saved language preference and browser languages `["fr-FR", "de-DE"]`
- **WHEN** the app loads
- **THEN** the interface is shown in English

### Requirement: Manual language switcher
The app SHALL show a language switcher, visible on a 360 CSS px wide screen, that toggles between English and Simplified Chinese. Switching SHALL update all interface text immediately, without reloading the page and without losing the loaded photo, watermark settings, or preview.

#### Scenario: Switch while editing
- **GIVEN** a photo is loaded, the watermark text is "© 张三", and the interface is in English
- **WHEN** the user selects 中文 in the switcher
- **THEN** the interface text changes to Simplified Chinese, while the photo, watermark settings, and preview stay unchanged

### Requirement: Remembered language preference
The app SHALL store the user's manually chosen language on the device only, and SHALL use it instead of automatic detection on later visits. If storage is unavailable, the app SHALL keep working with automatic detection.

#### Scenario: Preference survives reload
- **GIVEN** the browser language is English and the user switched to 中文
- **WHEN** the page is reloaded
- **THEN** the interface is shown in Simplified Chinese

#### Scenario: Storage blocked
- **GIVEN** the browser blocks local storage
- **WHEN** the app loads and the user switches language
- **THEN** the switch still takes effect for the current session and no error is shown

### Requirement: Document language attribute
The app SHALL keep the document's `lang` attribute equal to the active language (`en` or `zh-CN`).

#### Scenario: Lang attribute follows switch
- **WHEN** the active language changes to Simplified Chinese
- **THEN** the root element's `lang` attribute is `zh-CN`
