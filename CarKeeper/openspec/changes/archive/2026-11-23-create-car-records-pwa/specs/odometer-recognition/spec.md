# Spec Delta

## Purpose

利用用户拍摄或选择的仪表盘照片辅助填写总里程，减少手机录入负担。照片只在本机处理，用户通过裁剪与确认区分总里程、小计里程和续航数字，识别失败时仍能完成记录。

## ADDED Requirements

### Requirement: Local photo processing
系统 MUST 允许为两类记录拍摄或选择照片并调整总里程裁剪区域，照片及裁剪内容 MUST 只在本机处理，不上传或写入记录、备份；退出识别后 SHALL 释放临时图片资源。

#### Scenario: Select and crop a dashboard photo
- **WHEN** 用户选择包含总里程、小计里程及续航数字的照片
- **THEN** 系统提供裁剪预览，让用户框选总里程区域，并只对该区域执行识别

#### Scenario: Camera unavailable
- **WHEN** 拍照权限被拒绝或浏览器不支持拍照入口
- **THEN** 系统明确提示限制，仍提供选择已有照片和手工输入方式

### Requirement: Candidate confirmation
系统 SHALL 将可解析的非负整数公里数作为待确认候选展示，并说明用户需要核对其是否为总里程；MUST 允许修正、采用或取消，未经确认不得覆盖已有里程，不得自动保存业务记录。

#### Scenario: Accept a candidate
- **WHEN** 系统识别得到候选 58320，用户核对后选择采用
- **THEN** 当前表单里程更新为 58320，其他字段保留，记录尚未保存

#### Scenario: Cancel recognition
- **WHEN** 表单已有里程，用户识别照片后取消
- **THEN** 原里程及其他已填字段保持不变

### Requirement: Ambiguity and error handling
系统 MUST 将无法解析、低可信度、多数字歧义、图片解码失败、处理失败或资源未就绪显示为明确状态；不得将错误当作零公里或随意选择最大数字，SHALL 允许重裁剪、重试或手工输入。

#### Scenario: Multiple plausible readings
- **WHEN** 裁剪区域仍包含多个无法可靠区分的数字
- **THEN** 系统提示缩小裁剪范围或手输，不自动选取一个数值填入表单

#### Scenario: Unreadable image
- **WHEN** 反光或模糊使识别没有可靠结果
- **THEN** 系统提示识别失败并保留当前表单，用户可直接手输和保存

### Requirement: Offline OCR readiness
系统 SHALL 显示本机识别资源的加载进度及就绪状态，只有资源已完整缓存时才声明可离线识别；资源缺失时 MUST 保留手输能力，不请求远端识别。

#### Scenario: Recognition without network after preparation
- **WHEN** 识别资源已经完整缓存，用户断网后选择清晰的总里程裁剪图片
- **THEN** 系统在本机执行识别并展示待确认结果，无需上传图片

#### Scenario: Offline before resources are ready
- **WHEN** 识别资源尚未完整缓存且设备处于离线状态
- **THEN** 系统说明识别暂不可用，允许手输完成记录

### Requirement: Recognition cancellation
系统 SHALL 提供正在识别的进度状态和取消入口；取消、离开表单或更换图片后，旧识别结果 MUST 不再影响当前表单。

#### Scenario: Ignore an obsolete result
- **WHEN** 用户取消处理中的图片并开始处理另一张图片，旧识别任务随后返回结果
- **THEN** 系统不显示旧结果、不覆盖当前输入，用户仍可继续操作
