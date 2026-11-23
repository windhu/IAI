# 爱车记录（CarKeeper）

记录汽车保养与加油信息的手机网页应用（PWA）。通过链接在 Android Chrome 中打开即可使用，也可以添加到桌面；数据只保存在手机本机，支持拍照识别总里程（在本机完成，不上传照片）。

- 使用说明：[docs/usage.md](docs/usage.md)
- 部署与安装：[docs/deploy.md](docs/deploy.md)

## 开发

开发和发布**不需要 Android Studio、Android SDK 或任何原生工具链**，只需要 Node.js。

### 准备依赖

需要 Node.js 22.12 或更高版本（含 npm）。

```powershell
npm install
```

### 启动开发服务器

```powershell
npm run dev
```

终端会显示本地地址（默认 `http://localhost:5173/`）。`predev` 会先把本机识别资源（Tesseract worker、WASM 核心、英文数字模型）复制到 `public/ocr/`，因此识别不依赖任何外部 CDN。

开发模式下不会启用 service worker；离线能力请用生产构建验证（见下文）。

### 类型检查

```powershell
npm run typecheck
```

### 生产构建

```powershell
npm run build
```

输出在 `dist/`，是纯静态文件，可部署到任意 HTTPS 静态托管。部署到子目录时设置 `BASE_PATH`，例如：

```powershell
$env:BASE_PATH = '/carkeeper/'; npm run build
```

本地预览生产构建（含 service worker 和离线缓存）：

```powershell
npm run preview
```

### 测试

```powershell
npm test            # 单元测试（Vitest）：记录校验、本地存储、备份、识别结果解析
npm run test:e2e    # 浏览器测试（Playwright），会自动构建根路径和 /carkeeper/ 子目录两个版本
```

浏览器测试默认使用本机安装的 Google Chrome（`channel: 'chrome'`）。如需使用 Edge，设置 `$env:PW_CHANNEL = 'msedge'`；也可运行 `npx playwright install chromium` 后设置 `$env:PW_CHANNEL = ''` 使用 Playwright 自带浏览器。

### 目录结构

| 路径 | 内容 |
| --- | --- |
| `src/domain/` | 记录模型、校验、备份格式 |
| `src/storage/` | IndexedDB 存储 |
| `src/ocr/` | 图片裁剪、本机识别引擎、识别结果解析 |
| `src/pwa/` | service worker 注册、离线状态、安装与更新 |
| `src/ui/` | 界面 |
| `scripts/` | 识别资源复制、图标生成、测试服务器 |
| `tests/` | 单元测试 |
| `e2e/` | 浏览器测试 |
