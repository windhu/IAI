# offline-pwa Specification

## Purpose

通过 HTTPS 链接将汽车记录工具分发给 Android 手机用户，让用户无需原生安装包即可访问或添加桌面入口，并在必要资源完成缓存后继续离线记录。明确展示缓存限制，避免误导用户认为首次访问也无需联网。

## Requirements

### Requirement: Mobile access and installation guidance
系统 SHALL 在当前稳定版 Android Chrome 上通过 HTTPS 链接提供中文、适配手机的界面；SHALL 提供桌面安装引导，浏览器不提供安装提示时仍可作为网页使用，安装后可独立窗口启动。

#### Scenario: Use without installation
- **WHEN** 用户在 Android Chrome 打开 HTTPS 应用链接且未安装桌面入口
- **THEN** 用户可以直接使用记保养、记加油、历史记录和备份功能

#### Scenario: Launch from the home screen
- **WHEN** 支持安装的浏览器完成添加桌面入口，用户点击应用图标
- **THEN** 应用以独立窗口打开，不要求安装 APK 或注册账号

### Requirement: Offline basic operation
系统 SHALL 缓存基础界面和必要运行资源，完成缓存后支持断网重新打开、查看、新增、编辑、删除记录和导出恢复备份；基础离线运行不得依赖 OCR 资源是否下载完成。

#### Scenario: Reopen and save offline
- **WHEN** 基础资源已缓存，用户断网重新打开应用并手工填写加油记录
- **THEN** 系统显示已有历史并成功保存记录，再次打开时记录仍存在

#### Scenario: Offline backup round trip
- **WHEN** 基础资源已缓存，用户断网导出备份后选择该文件并确认恢复
- **THEN** 系统在本机完成导出与恢复，不要求联网

### Requirement: Honest readiness and update behavior
系统 MUST 区分基础离线就绪和识别资源就绪；缓存失败 SHALL 明确告知未就绪。新版本可用时 SHALL 提示用户在适当时机刷新，不自动中断正在填写的表单，也不得清理用户记录。

#### Scenario: Incomplete initial cache
- **WHEN** 首次联网访问时必要基础资源缓存失败
- **THEN** 系统不显示离线就绪，并说明联网情况下仍可使用以及可重试准备

#### Scenario: Update while editing
- **WHEN** 用户正在填写保养记录且新版本已下载
- **THEN** 系统提示有更新但不自动刷新、不丢弃正在填写的字段

### Requirement: Local-only data boundary
系统 MUST 不发送记录、照片或备份内容到服务器，不使用远端识别、第三方分析或云同步；仅允许下载静态应用及本机识别运行资源。

#### Scenario: Observe network during recording
- **WHEN** 用户新增记录或执行图片识别，并检查浏览器网络请求
- **THEN** 请求中不包含记录字段、图片内容或备份内容，识别计算在设备上执行
