# Spec Delta

## MODIFIED Requirements

### Requirement: Ambiguity and error handling
系统 MUST 将无法解析、低可信度、多数字歧义、图片解码失败、处理失败或资源未就绪显示为明确状态；不得将错误当作零公里或随意选择最大数字，SHALL 允许重裁剪、重试或手工输入。多数字歧义时 SHALL 展示可供用户选择的有效整数读数，并标记低可信度读数；小数及无效读数不得直接作为总里程采用。

#### Scenario: Multiple plausible readings
- **WHEN** 裁剪区域仍包含多个无法可靠区分的数字
- **THEN** 系统提示用户核对总里程，展示有效整数供用户选择，不自动选取或填写，并保留缩小裁剪范围、重新识别及手输方式

#### Scenario: Select and confirm a reading
- **WHEN** 用户从多个数字中选择一个整数读数
- **THEN** 系统将读数放入可编辑的确认框，提示核对是否为总里程，只有用户主动采用后才更新当前表单，且不自动保存记录

#### Scenario: Low-confidence reading among multiple numbers
- **WHEN** 多数字结果中包含可信度低于现有阈值的有效整数
- **THEN** 系统标记该读数可信度低，仍允许用户选择、修改并主动确认

#### Scenario: Decimal or invalid reading among multiple numbers
- **WHEN** 多数字结果包含小数或无法表示为安全非负整数的读数
- **THEN** 系统保留原始读数供用户查看，但不允许直接将其作为总里程采用

#### Scenario: Cancel or replace the recognition result
- **WHEN** 用户取消、重新识别或选择另一张照片而未采用当前读数
- **THEN** 当前表单中的原有里程和其他内容保持不变，旧选择不会影响新的识别结果

#### Scenario: Unreadable image
- **WHEN** 反光或模糊使识别没有可靠结果
- **THEN** 系统提示识别失败并保留当前表单，用户可直接手输和保存
