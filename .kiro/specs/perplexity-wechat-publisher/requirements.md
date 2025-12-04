# 需求文档

## 简介

本系统是一个自动化内容聚合与发布平台，利用 Perplexity API 定时搜索并总结目标主题的文章，生成类似 Perplexity 每日推送风格的内容，然后推送到微信公众号草稿箱，由用户手动审核后发布。系统采用 Vercel + GitHub Actions 混合架构：Web 管理面板托管在 Vercel（Serverless），定时任务由 GitHub Actions 执行，配置和历史数据存储在 GitHub 仓库中，实现零服务器成本。

## 术语表

- **Perplexity API**: Perplexity AI 提供的搜索和总结 API 服务
- **内容聚合器**: 负责收集、整理搜索结果并生成文章的核心模块
- **微信公众号平台**: 微信官方的公众号管理平台
- **草稿**: 微信公众号草稿，待用户审核发布的内容
- **access_token**: 微信公众号 API 调用凭证，有效期 7200 秒（2 小时）
- **media_id**: 微信素材的唯一标识符
- **搜索主题**: 用户配置的搜索主题关键词
- **每日摘要**: 类似 Perplexity 风格的内容汇总格式
- **GitHub Actions**: GitHub 提供的 CI/CD 自动化服务，用于定时触发任务
- **Vercel**: Serverless 部署平台，用于托管 Web 管理面板
- **GitHub API**: GitHub 提供的 REST API，用于读写仓库文件

## 需求列表

### 需求 1

**用户故事:** 作为公众号运营者，我希望通过 Web 面板配置搜索主题，以便系统能按我的需求自动搜索相关内容。

#### 验收标准 1

1. 当用户访问管理面板时，系统应显示主题配置界面，包含主题名称和搜索关键词字段
2. 当用户添加新搜索主题时，管理面板应通过 GitHub API 将主题追加到仓库的 `config/topics.json` 文件
3. 当用户修改现有主题时，管理面板应通过 GitHub API 更新配置文件
4. 当用户删除搜索主题时，管理面板应通过 GitHub API 从配置文件中移除该主题
5. 当用户查看主题列表时，管理面板应从 GitHub 仓库读取并显示所有已配置的主题

### 需求 2

**用户故事:** 作为公众号运营者，我希望通过 GitHub Actions 定时执行推送任务，以便系统能在指定时间自动执行搜索和推送。

#### 验收标准 2

1. 当 GitHub Actions workflow 配置了 cron schedule 时，系统应在每天指定时间（UTC）自动触发
2. 当用户在管理面板修改定时时间时，系统应通过 GitHub API 更新 `config/settings.json` 中的 schedule 字段
3. 当用户在管理面板点击"立即生成"按钮时，系统应通过 GitHub API 触发 workflow_dispatch 事件
4. 当 workflow 执行完成时，系统应在 Actions 日志中记录执行结果
5. 当 workflow 执行失败时，GitHub 应发送邮件通知到仓库所有者
6. 当用户需要修改 cron 表达式时，应手动编辑 `.github/workflows/daily-publish.yml` 文件

### 需求 3

**用户故事:** 作为公众号运营者，我希望系统调用 Perplexity API 搜索并生成内容，以便我能获取高质量的文章摘要。

#### 验收标准 3

1. 当 GitHub Actions 触发任务时，内容聚合器应通过 Perplexity Sonar API（`https://api.perplexity.ai/chat/completions`）使用所有已配置的搜索主题进行查询
2. 当调用 Perplexity API 时，内容聚合器应使用 POST 请求，请求头包含 `Authorization: Bearer {API_KEY}` 和 `Content-Type: application/json`
3. 当构建 API 请求时，内容聚合器应默认使用 sonar 模型，并在 messages 数组中传递用户查询
4. 当 Perplexity API 返回结果时，内容聚合器应从 `choices[0].message.content` 提取生成的内容，从 citations 数组提取来源链接
5. 如果 Perplexity API 调用失败，内容聚合器应使用指数退避策略重试最多 3 次

### 需求 3.1

**用户故事:** 作为公众号运营者，我希望系统合理控制 API 用量，以便在 $5 预算内支持每天发布一篇文章（30 天周期）。

#### 验收标准 3.1

1. 当生成每日内容时，内容聚合器应将所有搜索主题合并为单次 API 调用
2. 当构建 API 请求时，内容聚合器应控制每日 API 成本约 $0.16（$5/30天）
3. 当系统运行时，内容聚合器应记录每次 API 调用的 token 使用量（从响应的 usage 字段获取）
4. 当用户查看管理面板时，系统应显示累计 API 用量和预估剩余天数
5. 当累计用量超过预算的 80% 时，管理面板应显示警告提示

### 需求 4

**用户故事:** 作为公众号运营者，我希望生成的内容采用 Perplexity 每日推送风格，以便文章格式清晰易读。

#### 验收标准 4

1. 当格式化每日摘要时，内容聚合器应包含一个总结主要主题的标题
2. 当格式化每日摘要时，内容聚合器应将内容组织成带有清晰标题的编号章节（3-5 个章节）
3. 当格式化每日摘要时，内容聚合器应在每个章节末尾包含带有可点击链接的来源引用
4. 当格式化每日摘要时，内容聚合器应生成 1500 到 2500 个中文字符的内容
5. 当格式化每日摘要时，内容聚合器应在开头添加简短的引言段落（50-100 字）

### 需求 5

**用户故事:** 作为公众号运营者，我希望将生成的内容推送到微信公众号草稿箱，以便我能在发布前审核内容。

#### 验收标准 5

1. 当内容准备就绪时，内容聚合器应调用微信草稿接口（POST `https://api.weixin.qq.com/cgi-bin/draft/add?access_token=ACCESS_TOKEN`）创建草稿文章
2. 当创建草稿时，内容聚合器应构建符合微信规范的 articles 数组，包含 title（标题）、content（HTML 格式正文）、digest（摘要）、thumb_media_id（封面图素材 ID）字段
3. 当需要封面图时，内容聚合器应先调用上传永久素材接口（POST `https://api.weixin.qq.com/cgi-bin/material/add_material?access_token=ACCESS_TOKEN&type=image`）获取 thumb_media_id
4. 当草稿成功创建时（返回 media_id），系统应将文章状态更新为"已推送"并记录到历史文件
5. 如果微信 API 返回错误码（errcode 非 0），内容聚合器应记录具体错误码和 errmsg，并将文章标记为"推送失败"
6. 当文章正文包含外部图片时，内容聚合器应先调用上传图文消息内图片接口（POST `https://api.weixin.qq.com/cgi-bin/media/uploadimg`）获取微信图片 URL 并替换

### 需求 6

**用户故事:** 作为公众号运营者，我希望配置微信公众号凭证，以便系统能正确连接我的公众号。

#### 验收标准 6

1. 当用户首次部署时，应在 GitHub 仓库 Settings → Secrets 中手动配置 `WECHAT_APP_ID` 和 `WECHAT_APP_SECRET`
2. 当用户访问管理面板微信设置页面时，系统应显示凭证配置状态（已配置/未配置）和配置指引链接
3. 当 workflow 执行时，系统应从 GitHub Secrets 读取凭证，并调用获取 access_token 接口（GET `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=APPID&secret=APPSECRET`）获取临时令牌
4. 如果凭证验证失败（返回 errcode），系统应在 Actions 日志中输出具体错误信息（如 40013 表示 AppID 无效，40125 表示 AppSecret 无效）
5. 当微信 API 返回错误码 40001（access_token 无效或过期）时，系统应重新获取令牌并重试原请求

### 需求 7

**用户故事:** 作为公众号运营者，我希望在管理面板中查看推送历史，以便我能了解系统的运行情况。

#### 验收标准 7

1. 当用户查看历史页面时，管理面板应从仓库的 `data/history.json` 文件读取并显示所有已生成文章的列表
2. 当显示历史记录时，管理面板应显示文章标题、生成时间和当前状态（已生成/已推送/失败）
3. 当用户点击历史记录项时，管理面板应显示完整的文章内容以供预览
4. 当推送失败时，管理面板应提供重试按钮，通过触发 workflow 再次尝试推送
5. 当 workflow 执行完成时，系统应通过 Git 提交将历史更新推送到仓库

### 需求 8

**用户故事:** 作为公众号运营者，我希望配置 Perplexity API 密钥，以便系统能调用 Perplexity 服务。

#### 验收标准 8

1. 当用户首次部署时，应在 GitHub 仓库 Settings → Secrets 中手动配置 `PERPLEXITY_API_KEY`
2. 当用户访问管理面板 API 设置页面时，系统应显示密钥配置状态（已配置/未配置）和获取密钥的链接（`https://www.perplexity.ai/settings/api`）
3. 当 workflow 首次执行时，系统应通过发起测试请求验证密钥有效性
4. 如果 API 密钥验证失败（返回 HTTP 401），系统应在 Actions 日志中输出错误信息并终止执行

### 需求 9

**用户故事:** 作为开发者，我希望系统使用 GitHub 仓库存储配置和历史，以便无需外部数据库依赖。

#### 验收标准 9

1. 当管理面板读写配置时，系统应通过 GitHub REST API 操作仓库文件
2. 当 workflow 执行完成时，系统应将历史记录写入 `data/history.json` 并提交到仓库
3. 当 Git 提交更新时，系统应使用 GitHub Actions bot 或配置的 token 身份提交
4. 当仓库中不存在配置文件时，系统应自动创建默认配置

### 需求 10

**用户故事:** 作为公众号运营者，我希望管理面板有登录保护，以便防止未授权访问。

#### 验收标准 10

1. 当用户首次访问管理面板时，系统应显示登录页面要求输入密码
2. 当用户输入正确密码时，系统应创建 JWT token 并存储在 cookie 中
3. 当用户输入错误密码时，系统应显示错误提示并保持在登录页面
4. 当 JWT token 过期时（24 小时），系统应要求用户重新登录
5. 当用户点击退出时，系统应清除 cookie 并跳转到登录页面
6. 管理员密码应存储在 Vercel 环境变量中

### 需求 11

**用户故事:** 作为公众号运营者，我希望管理面板部署在 Vercel 上，以便零成本托管且无需维护服务器。

#### 验收标准 11

1. 当用户访问 Vercel 分配的域名时，系统应显示管理面板首页
2. 当用户首次部署到 Vercel 时，应在 Vercel 项目设置中配置以下环境变量：`GITHUB_TOKEN`（用于读写仓库）、`ADMIN_PASSWORD`（管理面板登录密码）、`JWT_SECRET`（JWT 签名密钥）
3. 当管理面板调用 GitHub API 时，系统应使用 Vercel 环境变量中配置的 GitHub Token
4. 当 Vercel 函数执行时，系统应在 10 秒内完成响应（Serverless 函数限制）
5. 当部署更新时，Vercel 应自动从 GitHub 仓库拉取最新代码并部署
