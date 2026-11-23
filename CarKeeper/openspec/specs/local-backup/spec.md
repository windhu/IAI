# local-backup Specification

## Purpose

让用户把当前设备上的全部保养和加油记录导出为可恢复的文件，在更换手机或浏览器数据丢失前自行保管。恢复流程校验格式和内容、说明覆盖影响，并以全有或全无的方式更新记录，避免部分导入造成数据损坏。

## Requirements

### Requirement: Complete versioned export
系统 SHALL 导出包含格式标识、版本、导出时间、单位及全部持久化记录的 JSON 备份，保留记录标识和所有业务字段，不包含照片；读取或生成失败 MUST 明确提示，不得导出看似成功的空备份。

#### Scenario: Export populated history
- **WHEN** 用户导出包含保养和加油记录的历史
- **THEN** 文件保留全部记录、项目、费用、升数及备注，并包含可校验的格式版本

#### Scenario: Export empty history
- **WHEN** 本机确实没有记录且读取成功，用户导出备份
- **THEN** 系统生成合法的零记录备份，并明确显示零条记录

### Requirement: Validate before mutation
系统 MUST 在恢复前校验格式标识、支持的版本和单位、必需结构、全部记录字段及唯一标识；不合法或不支持的文件 MUST 显示具体错误，不修改本机记录。

#### Scenario: Invalid or unsupported backup
- **WHEN** 用户选择损坏 JSON、未知版本、重复标识、错误单位或含非法记录字段的文件
- **THEN** 系统拒绝恢复并说明原因，原有记录保持不变

### Requirement: Preview and explicit replacement
系统 SHALL 对有效备份显示保养与加油条数、当前本机条数及覆盖提示；恢复采用整库替换，MUST 经用户明确确认，不自动合并或覆盖，取消时不修改记录。

#### Scenario: Cancel a valid restore
- **WHEN** 用户查看有效备份的恢复预览后取消
- **THEN** 本机记录保持不变

#### Scenario: Confirm an empty replacement
- **WHEN** 用户选择零记录有效备份
- **THEN** 系统明确提示恢复会清空当前记录，只有确认后才执行

### Requirement: Atomic restore and round trip
系统 MUST 以全有或全无方式恢复；成功后本机记录 SHALL 与备份一致，失败时 MUST 保留恢复前记录并显示错误。备份导出再恢复 SHALL 保留全部业务字段与记录标识。

#### Scenario: Restore fails during writing
- **WHEN** 用户确认恢复后本机写入因空间不足或事务失败而中断
- **THEN** 系统回退全部变更，保留原记录，不显示恢复成功

#### Scenario: Restore a previously exported backup
- **WHEN** 用户导出备份后修改本机历史，再确认恢复该备份
- **THEN** 系统恢复导出时的全部业务字段和标识，删除备份之外的记录，不产生重复条目

### Requirement: Backup safety guidance
系统 SHALL 在备份入口说明记录只存当前设备、清理浏览器数据可能导致丢失、文件包含未加密记录及需要用户自行保管，并建议覆盖恢复前先导出当前数据。

#### Scenario: Review local storage limitations
- **WHEN** 用户打开备份入口
- **THEN** 系统显示本地数据丢失风险、备份文件未加密说明以及导出和恢复入口
