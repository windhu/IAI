# Proposal

## Why

用户在小米浏览器中选择仪表盘 JPEG 照片后，裁剪区显示灰色背景和“仪表盘照片”，无法框选。现有实现分别解码图片和加载原图预览；后者失败时没有明确提示，具体设备原因尚未确认。

## What Changes

- 使用已解码的图像提供裁剪预览，减少预览与识别对同一照片采用不同解码路径造成的不一致。
- 预览未准备好或失败时不允许执行识别，并明确提示重新选择照片或手动输入。
- 保持照片仅在本机处理、裁剪对应关系、取消和资源释放行为。
- 增加图片实际显示、失败处理和重新选图的回归测试，并在小米浏览器真机复验。
- 不调整 OCR 识别算法、数据模型、其他应用的布局或浏览器设置。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `odometer-recognition`: 明确裁剪预览的可用性、方向一致性和失败时的用户操作。

## Impact

- 可能调整 `src/ui/OdometerCapture.tsx`、`src/ui/CropSelector.tsx` 和 `src/ocr/image.ts`，以及相关浏览器测试和使用说明。
- 不增加网络请求、照片上传、外部依赖或数据迁移。
