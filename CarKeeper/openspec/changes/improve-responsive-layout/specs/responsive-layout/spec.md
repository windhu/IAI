# Spec Delta

## Purpose

使爱车记录在手机、平板和桌面浏览器中合理利用可用屏幕空间，同时保证文字、导航和记录表单易读且易操作。

## ADDED Requirements

### Requirement: Responsive content width

系统 SHALL 根据视口调整内容宽度，在手机上减少不必要的侧边留白，在桌面上扩大主要内容区，同时限制表单宽度以便阅读。

#### Scenario: Phone content width
- **WHEN** 浏览器视口宽度为 360 或 390 CSS px，且文字缩放为默认值
- **THEN** 页面主要内容区左右内边距均不超过 12 CSS px，并且没有横向页面滚动

#### Scenario: Desktop content width
- **WHEN** 浏览器视口宽度为 1440 CSS px，且文字缩放为默认值
- **THEN** 首页主要内容区宽度至少为 900 CSS px，记录表单内容宽度不超过 720 CSS px

### Requirement: Readable and operable interface

系统 SHALL 提高默认正文的可读性，尊重浏览器文字缩放，并保持所有页面的导航、字段和按钮可见且可操作。

#### Scenario: Default text and touch targets
- **WHEN** 浏览器使用 16 CSS px 的默认字体大小，并以 360 CSS px 宽视口打开应用
- **THEN** 正文计算字号至少为 17 CSS px，主要按钮和表单控件的可点击高度至少为 44 CSS px

#### Scenario: Enlarged text
- **WHEN** 用户将浏览器默认字体增大至 200%，并访问首页、表单、历史和备份页面
- **THEN** 文本和控件不被截断或遮挡，所有功能仍可操作，页面不产生横向滚动
