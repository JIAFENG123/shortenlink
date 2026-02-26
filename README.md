# shortenlink

一个可部署到 Netlify 的长链接转短链接项目。

## 功能

- 输入长链接（仅支持 `http/https`），生成 6 位随机短码
- 访问短链接后自动 302 跳转到原始链接
- 自动统计访问次数
- 短链数据存储在 Netlify Blobs（无需额外数据库）
- 一键复制短链接

## 技术栈

- **前端**：纯 HTML / CSS / JS（无框架依赖）
- **后端**：Netlify Functions v2（标准 Web API）
- **存储**：`@netlify/blobs`

## 项目结构

```
shortenlink/
├── public/
│   └── index.html          # 前端页面
├── netlify/
│   └── functions/
│       ├── shorten.mjs      # POST /api/shorten — 创建短链
│       └── redirect.mjs     # GET /:code — 短链跳转
├── netlify.toml             # Netlify 配置
└── package.json
```

## 本地开发

```bash
# 安装依赖
npm install

# 登录 Netlify（首次需要）
npx netlify login

# 关联站点（首次需要）
npx netlify link

# 启动本地开发服务器
npm run dev
```

打开 `http://localhost:8888` 即可测试。

## 部署到 Netlify

1. 将项目推送到 GitHub / GitLab / Bitbucket
2. 在 Netlify 控制台新建站点并连接仓库
3. 构建设置：
   - **Build command**：`npm run build`
   - **Publish directory**：`public`
4. 部署完成后即可使用

## API

### `POST /api/shorten`

创建短链接。

**请求体：**
```json
{ "longUrl": "https://example.com/very-long-path" }
```

**响应：**
```json
{
  "code": "Ab3xYz",
  "longUrl": "https://example.com/very-long-path",
  "shortUrl": "https://your-site.netlify.app/Ab3xYz"
}
```

### `GET /:code`

302 重定向到对应的长链接。
