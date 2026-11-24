# app-branding Specification

## Purpose
在应用中统一展示“峰哥出品”徽标，体现出品方并增强辨识度。徽标出现在首页顶部、首页底部署名和应用内启动画面中，且不得妨碍快速记录、离线使用和无障碍访问。

## Requirements

### Requirement: Home header logo
系统 SHALL 在首页顶部的“爱车记录”标题旁显示“峰哥出品”徽标；在手机宽度下，标题和徽标都 SHALL 完整可见，不得造成横向溢出，也不得遮挡记保养、记加油入口。

#### Scenario: View the home page
- **WHEN** 用户在手机宽度下打开首页
- **THEN** 标题旁显示“峰哥出品”徽标，页面没有横向滚动，两个记录入口仍然完整可见

### Requirement: Home footer attribution
系统 SHALL 在首页底部显示“峰哥出品”署名。

#### Scenario: Scroll to the bottom of the home page
- **WHEN** 用户滚动到首页底部
- **THEN** 页面显示“峰哥出品”署名

### Requirement: Launch screen
系统 SHALL 在每次冷启动时显示包含应用名和“峰哥出品”徽标的启动画面。应用就绪后，启动画面 SHALL 在 1.5 秒内自动消失；用户轻点时 MUST 立即关闭。启动画面不得在页面内导航时重复出现，也不得清除或延迟已填写的内容。

#### Scenario: Cold start
- **WHEN** 用户从链接或桌面图标打开应用
- **THEN** 先显示带有“峰哥出品”徽标的启动画面，并在 1.5 秒内自动显示首页

#### Scenario: Skip by tapping
- **WHEN** 启动画面显示时用户轻点屏幕
- **THEN** 启动画面立即关闭，用户可以开始操作

#### Scenario: Navigate within the app
- **WHEN** 启动画面关闭后，用户在首页、记录表单和历史记录之间切换
- **THEN** 启动画面不会再次出现

### Requirement: Offline and accessible logo
徽标 MUST 随应用一同缓存，离线时与在线时显示一致，且不得请求外部图片或字体。徽标 SHALL 提供文字替代“峰哥出品”；装饰性的重复出现不得被读屏软件重复朗读。

#### Scenario: Open offline
- **WHEN** 离线资源已就绪，用户断网后重新打开应用
- **THEN** 启动画面、首页顶部和底部的徽标均正常显示，没有加载失败

#### Scenario: Screen reader
- **WHEN** 读屏软件读取首页
- **THEN** 用户可以听到“峰哥出品”，且同一页面不会因装饰性徽标而重复朗读
