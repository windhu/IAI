# Spec Delta

## ADDED Requirements

### Requirement: Usable photo preview

系统 SHALL 在照片成功解码后显示可见的裁剪预览，并确保预览方向和裁剪坐标与用于识别的图像一致；预览准备完成前 MUST 不允许识别。

#### Scenario: Display a mobile camera photo
- **WHEN** 用户在手机上通过拍照或相册选择可解码的 JPEG 仪表盘照片
- **THEN** 系统显示该照片的实际图像内容和可拖动裁剪框，用户可以框选并识别所选区域

#### Scenario: Rotated photo
- **WHEN** 用户选择包含 EXIF 方向信息的照片并框选一个区域
- **THEN** 预览以正确方向显示，识别使用的图像区域与用户框选的可见区域一致

### Requirement: Preview failure recovery

系统 MUST 在无法生成或显示预览时明确提示，并允许重新选择照片或返回手动输入；不得在预览不可用时继续识别。

#### Scenario: Preview fails after decoding
- **WHEN** 照片解码成功但裁剪预览无法生成或显示
- **THEN** 系统显示失败提示，不显示可用的识别操作，用户仍可换图或手动输入且已填表单内容不丢失

#### Scenario: Retry with another photo
- **WHEN** 预览失败后用户选择另一张可用照片
- **THEN** 系统显示新照片的裁剪预览并允许识别，不再显示上一次的失败状态

#### Scenario: Photo replaced during preparation
- **WHEN** 第一张照片的预览仍在准备时用户更换照片或关闭识别界面
- **THEN** 旧照片的异步结果不覆盖新状态，也不会留下未释放的临时图片资源
