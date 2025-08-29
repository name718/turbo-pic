# 极速图界 / TurboPic

一个简洁美观的免费壁纸与短视频分享网站。

## 技术栈
- Vue 3 + Vite
- 纯 JavaScript
- 数据源：Pexels API (`https://www.pexels.com/zh-cn/`)

## 本地运行
1. 克隆或下载本项目
2. 安装依赖：
   ```bash
   npm install
   ```
3. 配置环境变量：在项目根目录新建 `.env` 文件，添加：
   ```bash
   VITE_PEXELS_API_KEY=你的Pexels_API_Key
   ```
   在 Pexels 申请 API Key 后填入。
4. 启动开发服务器：
   ```bash
   npm run dev
   ```

## 功能
- 首页展示精选照片与热门短视频
- 搜索关键字自动切换照片与视频搜索结果
- 常用类别快捷筛选（热门、风景、城市、极简、科技）
- 无限滚动加载更多

## 目录结构
- `src/services/pexels.js`：Pexels API 封装
- `src/App.vue`：页面布局与网格展示
- `src/style.css`：全局样式与主题

## 版权说明
所有媒体内容来自 Pexels，遵循其授权条款。
