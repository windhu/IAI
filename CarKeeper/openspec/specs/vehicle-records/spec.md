# vehicle-records Specification

## Purpose

让单车用户在手机上以统一的日期、总里程和费用信息管理保养与加油历史，支持快速录入和后续修正，并在应用关闭后保留本机记录。第一版使用中文界面、公里和人民币。

## Requirements

### Requirement: Maintenance entry
系统 SHALL 提供保养快捷入口，默认日期为设备本地今天，要求有效日期、非负整数总里程和至少一个保养项目，支持机油、机滤、刹车片及自定义项目，并允许填写非负费用和备注。

#### Scenario: Save multiple maintenance items
- **WHEN** 用户填写有效日期、总里程，同时选择换机油和换刹车片后保存
- **THEN** 系统保存一条包含两个项目的保养记录，允许费用和备注留空

#### Scenario: Invalid maintenance fields
- **WHEN** 用户使用不存在的日期、负数或小数里程、空项目列表或非法费用提交
- **THEN** 系统显示对应字段错误，不保存记录，并保留已填内容

### Requirement: Fuel entry
系统 SHALL 提供加油快捷入口，默认日期为设备本地今天，要求有效日期、非负整数总里程及正数金额，支持可选正数升数和备注；人民币金额至多两位小数，升数至多三位小数。

#### Scenario: Record fuel without volume
- **WHEN** 用户填写日期、总里程和 300 元金额，未填写升数后保存
- **THEN** 系统保存加油记录，不要求补填升数，不生成油耗估算

#### Scenario: Reject invalid fuel values
- **WHEN** 用户提交空金额、零或负金额、超过两位小数的金额，或非正数升数
- **THEN** 系统显示字段错误，不保存记录，并保留已填内容

### Requirement: History management
系统 SHALL 按事件日期降序展示两类记录，提供详情和编辑，删除前要求明确确认；同一天的记录顺序 SHALL 保持稳定。

#### Scenario: Edit and cancel deletion
- **WHEN** 用户修改一条记录并保存，随后打开删除确认但取消
- **THEN** 历史显示修改后的内容，记录仍然存在

#### Scenario: Confirm deletion
- **WHEN** 用户明确确认删除一条记录
- **THEN** 系统持久化删除该记录，其他记录不受影响

### Requirement: Durable local records
系统 MUST 无需账号将记录保存在当前设备；只有本机持久化成功后 SHALL 显示保存或删除成功，读写失败时 MUST 显示错误，不得将读取失败伪装成空历史。

#### Scenario: Reopen persisted history
- **WHEN** 用户成功保存记录，关闭应用后在同一浏览器或安装环境重新打开
- **THEN** 系统显示之前保存的记录

#### Scenario: Storage failure
- **WHEN** 保存因存储不可用或空间不足而失败
- **THEN** 系统明确提示未保存，保留表单内容，不显示成功消息

### Requirement: Historical mileage correction
系统 SHALL 允许补录早期日期和修正里程；若日期与已有记录的里程走势矛盾，SHALL 提示用户核对，但不得仅因低于历史最大里程而拒绝保存。

#### Scenario: Backfill an older event
- **WHEN** 已有 60000 公里的近期记录，用户补录更早日期的 50000 公里保养
- **THEN** 系统允许保存，并按事件日期排列

#### Scenario: Inconsistent chronology
- **WHEN** 用户填写的近期总里程低于较早记录的总里程
- **THEN** 系统显示核对提示，用户仍可确认保存该有效记录
