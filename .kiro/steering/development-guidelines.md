# 开发规范

本文档定义了 AI 助手在开发本项目时需要遵循的规范和约定。

## 技术栈

- **运行时**: Node.js 20+
- **语言**: TypeScript 5.x（严格模式）
- **Web 框架**: Next.js 14+（App Router）
- **前端**: React + Tailwind CSS
- **部署平台**: Vercel（Serverless）
- **定时任务**: GitHub Actions（cron schedule）
- **HTTP 客户端**: 原生 fetch
- **测试框架**: Vitest
- **属性测试**: fast-check

## 项目结构

```text
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/                # API Routes (Serverless Functions)
│   │   │   ├── auth/
│   │   │   ├── topics/
│   │   │   ├── settings/
│   │   │   ├── history/
│   │   │   └── trigger/
│   │   ├── login/
│   │   ├── dashboard/
│   │   └── layout.tsx
│   ├── components/             # React 组件
│   ├── lib/                    # 核心业务逻辑
│   │   ├── perplexity.ts       # Perplexity API 客户端
│   │   ├── wechat.ts           # 微信公众号 API 客户端
│   │   ├── content.ts          # 内容生成和格式化
│   │   ├── github.ts           # GitHub API 客户端
│   │   └── auth.ts             # JWT 认证
│   └── types/                  # TypeScript 类型定义
│       └── index.ts
├── scripts/                    # GitHub Actions 执行脚本
│   └── daily-publish.ts        # 每日发布脚本
├── config/                     # 配置文件（存储在 GitHub 仓库）
│   ├── topics.json
│   └── settings.json
├── data/                       # 数据文件（存储在 GitHub 仓库）
│   └── history.json
├── .github/
│   └── workflows/
│       └── daily-publish.yml   # 定时发布 workflow
├── tests/                      # 测试文件
├── .env.example                # 环境变量示例
├── package.json
├── next.config.js
└── tsconfig.json
```

## 编码规范

### TypeScript

- 使用 `strict: true` 模式
- 所有函数必须有明确的返回类型
- 使用 `interface` 定义数据结构，`type` 用于联合类型
- 避免使用 `any`，必要时使用 `unknown`
- 使用 `async/await` 而非回调

### 命名约定

- 文件名：kebab-case（如 `github-client.ts`）
- React 组件文件：PascalCase（如 `TopicList.tsx`）
- 类名：PascalCase（如 `ContentService`）
- 函数/变量：camelCase（如 `generateContent`）
- 常量：UPPER_SNAKE_CASE（如 `MAX_RETRY_COUNT`）
- 接口：直接使用名词（如 `Topic`、`Article`）

### 错误处理

- 使用自定义错误类区分错误类型
- API 调用必须有 try-catch 包裹
- 记录错误日志时包含上下文信息
- 对外部 API 调用实现重试机制

```typescript
// 示例：自定义错误
class PerplexityApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public retryable: boolean
  ) {
    super(message);
    this.name = 'PerplexityApiError';
  }
}
```

## API 调用规范

### Perplexity API

- 端点：`https://api.perplexity.ai/chat/completions`
- 方法：POST
- 认证：`Authorization: Bearer {API_KEY}`
- 模型：默认使用 `sonar`（成本较低）
- 必须记录 token 使用量

```typescript
// 请求示例
const response = await fetch('https://api.perplexity.ai/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'sonar',
    messages: [{ role: 'user', content: prompt }]
  })
});
```

### 微信公众号 API

- 获取 access_token：`https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=APPID&secret=APPSECRET`
- 创建草稿：`https://api.weixin.qq.com/cgi-bin/draft/add?access_token=ACCESS_TOKEN`
- 上传永久素材（封面图）：`https://api.weixin.qq.com/cgi-bin/material/add_material?access_token=ACCESS_TOKEN&type=image`
- 上传图文消息内图片：`https://api.weixin.qq.com/cgi-bin/media/uploadimg?access_token=ACCESS_TOKEN`
- access_token 有效期 7200 秒（2 小时），每次 workflow 执行时重新获取

### GitHub API

- 读取文件：`GET /repos/{owner}/{repo}/contents/{path}`
- 更新文件：`PUT /repos/{owner}/{repo}/contents/{path}`
- 触发 workflow：`POST /repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches`
- 认证：`Authorization: Bearer {GITHUB_TOKEN}`

## 数据存储规范

### config/topics.json 结构

```json
{
  "topics": [
    {
      "id": "uuid",
      "name": "主题名",
      "keywords": "搜索关键词",
      "enabled": true
    }
  ]
}
```

### config/settings.json 结构

```json
{
  "schedule": {
    "timezone": "Asia/Shanghai",
    "preferredTime": "08:00"
  },
  "content": {
    "language": "zh-CN",
    "minLength": 1500,
    "maxLength": 2500
  }
}
```

### data/history.json 结构

```json
{
  "articles": [
    {
      "id": "uuid",
      "title": "文章标题",
      "content": "文章内容",
      "status": "generated|pushed|failed",
      "mediaId": "微信草稿ID",
      "tokensUsed": 1500,
      "createdAt": "ISO时间",
      "pushedAt": "ISO时间",
      "error": "错误信息"
    }
  ],
  "usage": {
    "totalTokens": 0,
    "totalCost": 0,
    "lastReset": "2024-01-01"
  }
}
```

## 环境变量规范

### Vercel 环境变量

```text
GITHUB_TOKEN=ghp_xxx          # GitHub Personal Access Token（需要 repo 权限）
ADMIN_PASSWORD=xxx            # 管理面板登录密码
JWT_SECRET=xxx                # JWT 签名密钥
GITHUB_OWNER=xxx              # GitHub 用户名
GITHUB_REPO=xxx               # 仓库名
```

### GitHub Secrets

```text
PERPLEXITY_API_KEY=pplx-xxx   # Perplexity API 密钥
WECHAT_APP_ID=wx_xxx          # 微信公众号 AppID
WECHAT_APP_SECRET=xxx         # 微信公众号 AppSecret
```

## GitHub Actions 规范

### Workflow 文件示例

```yaml
name: Daily Publish

on:
  schedule:
    - cron: '0 0 * * *'  # UTC 时间，北京时间 08:00
  workflow_dispatch:      # 支持手动触发

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npx tsx scripts/daily-publish.ts
        env:
          PERPLEXITY_API_KEY: ${{ secrets.PERPLEXITY_API_KEY }}
          WECHAT_APP_ID: ${{ secrets.WECHAT_APP_ID }}
          WECHAT_APP_SECRET: ${{ secrets.WECHAT_APP_SECRET }}
      - uses: stefanzweifel/git-auto-commit-action@v5
        with:
          commit_message: 'chore: update history'
          file_pattern: 'data/*.json'
```

## 安全规范

- API 密钥存储在 GitHub Secrets 或 Vercel 环境变量中
- 敏感信息在日志中必须脱敏
- 管理面板使用 JWT + httpOnly cookie 认证
- GitHub Token 使用最小权限原则（仅 repo 权限）

## 测试规范

- 核心业务逻辑必须有单元测试
- 使用 Vitest 作为测试框架
- 使用 fast-check 进行属性测试
- Mock 外部 API 调用
- 测试文件放在 `tests/` 目录，命名为 `*.test.ts`

## 日志规范

- GitHub Actions 中使用 console.log 输出
- Vercel Functions 中使用 console.log（自动收集到 Vercel Logs）
- 日志级别：error, warn, info, debug
- 包含时间戳和上下文信息

```typescript
// 日志示例
console.log(JSON.stringify({
  level: 'info',
  message: 'Content generated',
  articleId: 'xxx',
  tokensUsed: 1500,
  duration: 2500,
  timestamp: new Date().toISOString()
}));
```

## Git 提交规范

- 使用 Conventional Commits 格式
- 类型：feat, fix, docs, style, refactor, test, chore
- 示例：`feat: 添加 Perplexity API 调用功能`
- GitHub Actions 自动提交使用：`chore: update history`
