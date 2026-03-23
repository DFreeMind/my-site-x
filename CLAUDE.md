# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 在本仓库中工作时提供指导。

## 概述

这是一个个人静态网站，托管多个项目。根目录的 `index.html` 是主入口页面，链接到所有子项目。没有构建系统 —— 所有文件均为静态 HTML/CSS/JS。

## 项目结构

```
├── index.html          # 主落地页（工具导航）
├── botw/               # 塞尔达传说：荒野之息 互动地图
├── hdmap/              # 路网监测高清地图平台
├── tools/              # 开发者工具（ULID、TSID、MyBatis 格式化等）
├── sandbox/            # 3D / Cesium.js 实验
├── study/opencv/       # OpenCV 教程（中文）
└── aitools/            # AI 工具面板
```

## 子项目说明

### `botw/` — 塞尔达传说：荒野之息 互动地图
- **技术栈**: Leaflet.js + jQuery，瓦片地图（Content/Map/{z}_{x}_{y}.png）
- **主要文件**: Main.js（地图逻辑）、Marker.js（标记数据）、Catalog.js（分类）、ShrinesJapanese.js（神庙数据）
- **入口**: `botw/index.html`

### `hdmap/` — 路网监测平台
- **技术栈**: Mapbox GL JS + ABCEarth（基于 Cesium 的 3D 地球）、类 Vue 单页应用结构
- **配置**: `hdmap/config.js` 包含 `webConfig.quanjingUrl` 用于 360° 全景路景
- **入口**: `hdmap/index.html` — 从 `js/` 目录加载带 hash 的 bundle 文件（如 `index-5bu1l_KH.js`）
- **注意**: 使用外部 3D 地图服务 `http://121.36.99.212:35002/ABCEarth/`

### `tools/` — 开发者工具
- 纯原生 HTML/CSS/JS
- `multi-tools.html` — 多种工具合集
- `js-ulid.html`、`js-tsid.html` — ID 生成工具
- `mybatis-format.html` — XML 格式化工具
- `https-test.html` — HTTPS 测试工具

### `sandbox/` — 3D 实验
- 基于 Cesium.js 的演示，使用 GLB 模型
- `city.html`、`drag.html`、`click.html`

## 重要提示

- 无 npm/node 构建系统
- 无测试
- `hdmap/` 使用带 hash 的资源文件名 —— 修改后需重新打包
- 部分项目依赖外部服务（hdmap 的 ABCEarth、360° 路景服务器）
- 网站已备案：京ICP备2023018941号-1
