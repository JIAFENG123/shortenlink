# shortenlink

一个可部署到 Netlify 的长链接转短链接项目。

## 功能

- 输入长链接（仅支持 `http/https`）
- 生成短链接（例如 `https://your-site.netlify.app/Ab3xYz`）
- 访问短链接后自动 302 跳转到原始链接
- 短链数据存储在 Netlify Blobs

## 项目结构

- `public/index.html`：前端页面
- `netlify/functions/shorten.js`：创建短链 API
- `netlify/functions/redirect.js`：短链跳转逻辑
- `netlify.toml`：Netlify 构建与路由规则

## 本地运行

1. 安装依赖

```bash
npm install
```

2. 登录 Netlify（首次需要）

```bash
npx netlify login
```

3. 启动本地开发

```bash
npm run dev
```

打开 `http://localhost:8888` 即可测试。

## 部署到 Netlify

1. 将 `shortenlink` 目录推到你的 Git 仓库（GitHub/GitLab/Bitbucket）
2. 在 Netlify 新建站点并连接仓库
3. 构建配置使用：
   - Build command: `npm run build`
   - Publish directory: `public`
4. 部署完成后，直接打开站点使用

## 说明

- 本项目使用 `@netlify/blobs` 做短链数据存储，不需要额外数据库
- 如需防刷、过期时间、自定义短码，可在函数中扩展
