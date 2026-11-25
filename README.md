# IAI

应用导航：

- [爱车记录](CarKeeper/README.md)：记录汽车保养与加油信息，支持离线使用。
- [照片水印](WaterMarkApp/README.md)：在设备上为照片添加文字水印。

## 共享 GitHub 配置

两个应用共用仓库根目录的 [GitHub 配置](.github/)。各应用的 OpenSpec 配置和规格仍保存在各自目录中；运行 OpenSpec 命令时，请以对应应用目录为工作目录。

## GitHub Pages

站点首页为 <https://windhu.github.io/IAI/>，两个应用分别位于 `CarKeeper/` 和 `WaterMarkApp/` 子目录。

在仓库的 **Settings → Pages** 中将 **Source** 设为 **GitHub Actions**。推送到 `main` 后，根目录的 [部署工作流](.github/workflows/deploy-pages.yml) 会构建 CarKeeper，组装导航页及两个应用并发布；也可以在 Actions 页面手动运行工作流。

工作流使用仓库名生成 CarKeeper 的子路径，适用于 `https://<user>.github.io/<repo>/` 形式的项目站点。如果改为用户站点或自定义域名根路径，需要相应调整 `BASE_PATH`。首次发布后应检查两个链接、CarKeeper 的离线功能和识别资源，以及水印图片的保存。

CarKeeper 数据保存在浏览器本地。迁移到不同域名或浏览器前请先导出备份，再在新站点恢复；详细说明见 [部署与安装](CarKeeper/docs/deploy.md)。
