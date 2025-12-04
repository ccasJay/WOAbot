# 实现计划

> **注意**: 所有项目文件直接放在仓库根目录下，不使用 `perplexity-wechat-publisher` 子文件夹。

## 1. 项目初始化与基础设施

- [x] 1.0 迁移项目到根目录
  - 将 `perplexity-wechat-publisher/` 下的所有文件移动到仓库根目录
  - 删除空的 `perplexity-wechat-publisher/` 文件夹
  - 更新 `.gitignore` 确保 `node_modules/` 等被忽略
  - _Requirements: 项目结构_

- [x] 1.1 初始化 Next.js 项目结构
  - 在仓库根目录初始化 Next.js 14 项目（App Router）
  - 配置 TypeScript 严格模式
  - 安装依赖：tailwindcss, jose (JWT), uuid
  - 创建目录结构：`src/lib/`, `src/types/`, `src/components/`, `scripts/`, `config/`, `data/`
  - _Requirements: 11.1_

- [x] 1.2 配置测试框架
  - 安装 vitest 和 fast-check
  - 创建 `vitest.config.ts`
  - 创建 `tests/` 目录
  - _Requirements: 测试策略_

- [x] 1.3 定义核心类型
  - 创建 `src/types/index.ts`
  - 定义 Topic, Article, Settings, History 接口
  - 定义错误类型层次
  - _Requirements: 数据模型_

## 2. 认证模块

- [x] 2.1 实现 JWT 认证服务
  - 创建 `src/lib/auth.ts`
  - 实现 `verifyPassword`, `generateToken`, `verifyToken` 函数
  - 使用 jose 库处理 JWT
  - _Requirements: 10.2, 10.3, 10.4_

- [ ]* 2.2 编写认证模块属性测试
  - **Property 15: JWT 认证正确性**
  - 测试正确/错误密码验证
  - 测试 token 生成和过期验证
  - **Validates: Requirements 10.2, 10.3, 10.4**

- [x] 2.3 实现登录 API 路由
  - 创建 `src/app/api/auth/login/route.ts`
  - 创建 `src/app/api/auth/logout/route.ts`
  - 设置 httpOnly cookie
  - _Requirements: 10.1, 10.5_

- [x] 2.4 实现认证中间件
  - 创建 `src/middleware.ts`
  - 保护 `/dashboard` 路由
  - 未认证重定向到 `/login`
  - _Requirements: 10.1_

## 3. GitHub API 客户端

- [ ] 3.1 实现 GitHub API 客户端
  - 创建 `src/lib/github.ts`
  - 实现 `getFile`, `updateFile`, `triggerWorkflow` 方法
  - 处理文件不存在时返回默认配置
  - _Requirements: 9.1, 9.4_

- [ ]* 3.2 编写默认配置初始化属性测试
  - **Property 14: 默认配置初始化**
  - 测试不存在的文件返回默认配置
  - **Validates: Requirements 9.4**

## 4. 主题管理功能

- [ ] 4.1 实现主题 CRUD API
  - 创建 `src/app/api/topics/route.ts` (GET, POST)
  - 创建 `src/app/api/topics/[id]/route.ts` (PUT, DELETE)
  - 通过 GitHub API 读写 `config/topics.json`
  - _Requirements: 1.2, 1.3, 1.4, 1.5_

- [ ]* 4.2 编写主题 CRUD 属性测试
  - **Property 1: 主题 CRUD 往返一致性**
  - 测试添加、读取、更新、删除操作的一致性
  - **Validates: Requirements 1.2, 1.3, 1.4, 1.5**

- [ ] 4.3 实现主题管理页面
  - 创建 `src/app/dashboard/topics/page.tsx`
  - 创建 `src/components/TopicList.tsx`
  - 创建 `src/components/TopicForm.tsx`
  - _Requirements: 1.1_

## 5. Checkpoint - 确保所有测试通过

- [ ] 5. Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

## 6. Perplexity API 客户端

- [ ] 6.1 实现 Perplexity API 客户端
  - 创建 `src/lib/perplexity.ts`
  - 实现 `search` 方法，使用 sonar 模型
  - 实现指数退避重试逻辑（最多 3 次）
  - 提取 content, citations, usage
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ]* 6.2 编写 Perplexity 响应解析属性测试
  - **Property 2: Perplexity API 响应解析正确性**
  - 测试从响应中正确提取 content, citations, usage
  - **Validates: Requirements 3.4**

- [ ]* 6.3 编写重试策略属性测试
  - **Property 3: 指数退避重试策略**
  - 测试重试次数和间隔
  - **Validates: Requirements 3.5**

## 7. 内容生成模块

- [ ] 7.1 实现内容生成器
  - 创建 `src/lib/content.ts`
  - 实现 `buildPrompt` - 合并多主题为单次查询
  - 实现 `generateDailySummary` - 调用 Perplexity 生成内容
  - 实现 `formatToHtml` - Markdown 转 HTML
  - _Requirements: 3.1.1, 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ]* 7.2 编写多主题合并属性测试
  - **Property 4: 多主题合并为单次 API 调用**
  - 测试 1-10 个主题合并到单个 prompt
  - **Validates: Requirements 3.1.1**

- [ ]* 7.3 编写内容格式验证属性测试
  - **Property 7: 内容格式验证**
  - 测试标题、章节数、引用、字数、引言
  - **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**

## 8. 用量统计功能

- [ ] 8.1 实现用量统计模块
  - 在 `src/lib/content.ts` 中添加 token 记录逻辑
  - 实现 `calculateRemainingDays` 函数
  - 实现 `shouldShowWarning` 函数（80% 阈值）
  - _Requirements: 3.1.3, 3.1.4, 3.1.5_

- [ ]* 8.2 编写用量记录属性测试
  - **Property 5: Token 用量记录完整性**
  - 测试累计值等于所有单次调用总和
  - **Validates: Requirements 3.1.3**

- [ ]* 8.3 编写预算警告属性测试
  - **Property 6: 预算警告阈值判断**
  - 测试 80% 阈值判断逻辑
  - **Validates: Requirements 3.1.5**

- [ ] 8.4 实现用量统计 API
  - 创建 `src/app/api/usage/route.ts`
  - 返回累计用量和预估剩余天数
  - _Requirements: 3.1.4_

## 9. Checkpoint - 确保所有测试通过

- [ ] 9. Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

## 10. 微信公众号 API 客户端

- [ ] 10.1 实现微信 API 客户端
  - 创建 `src/lib/wechat.ts`
  - 实现 `getAccessToken` - 获取临时令牌
  - 实现 `uploadImage` - 上传永久素材
  - 实现 `uploadArticleImage` - 上传图文消息内图片
  - 实现 `createDraft` - 创建草稿
  - 实现 40001 错误自动重试
  - _Requirements: 5.1, 5.2, 5.3, 6.3, 6.5_

- [ ]* 10.2 编写微信错误码映射属性测试
  - **Property 11: 微信错误码映射**
  - 测试 40013, 40125, 40001 错误码映射
  - **Validates: Requirements 6.4**

- [ ]* 10.3 编写 access_token 重试属性测试
  - **Property 12: access_token 失效重试**
  - 测试 40001 错误触发重新获取 token
  - **Validates: Requirements 6.5**

- [ ] 10.4 实现文章格式转换
  - 在 `src/lib/wechat.ts` 中实现 `formatForWeChat`
  - 构建符合微信规范的 articles 数组
  - 实现外部图片 URL 替换
  - _Requirements: 5.2, 5.6_

- [ ]* 10.5 编写微信文章格式属性测试
  - **Property 8: 微信文章数据结构完整性**
  - 测试必需字段完整性
  - **Validates: Requirements 5.2**

- [ ]* 10.6 编写图片 URL 替换属性测试
  - **Property 10: 外部图片 URL 替换**
  - 测试所有外部图片替换为微信域名
  - **Validates: Requirements 5.6**

## 11. 文章状态管理

- [ ] 11.1 实现文章状态管理
  - 在 `src/lib/content.ts` 中实现状态转换逻辑
  - 实现 `updateArticleStatus` 函数
  - 处理 generated → pushed/failed 转换
  - _Requirements: 5.4, 5.5_

- [ ]* 11.2 编写文章状态转换属性测试
  - **Property 9: 文章状态转换正确性**
  - 测试状态机转换逻辑
  - **Validates: Requirements 5.4, 5.5**

## 12. 历史记录功能

- [ ] 12.1 实现历史记录 API
  - 创建 `src/app/api/history/route.ts`
  - 从 `data/history.json` 读取历史
  - 支持按状态筛选
  - _Requirements: 7.1, 7.2_

- [ ]* 12.2 编写历史记录持久化属性测试
  - **Property 13: 历史记录持久化一致性**
  - 测试写入后读取返回相同数据
  - **Validates: Requirements 7.1, 7.2, 7.5**

- [ ] 12.3 实现历史记录页面
  - 创建 `src/app/dashboard/history/page.tsx`
  - 创建 `src/components/HistoryList.tsx`
  - 创建 `src/components/ArticlePreview.tsx`
  - 实现重试按钮
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

## 13. Checkpoint - 确保所有测试通过

- [ ] 13. Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

## 14. 设置管理功能

- [ ] 14.1 实现设置 API
  - 创建 `src/app/api/settings/route.ts` (GET, PUT)
  - 读写 `config/settings.json`
  - _Requirements: 2.2_

- [ ] 14.2 实现设置页面
  - 创建 `src/app/dashboard/settings/page.tsx`
  - 显示定时配置
  - 显示 API 密钥配置状态
  - 显示微信凭证配置状态
  - _Requirements: 2.2, 6.2, 8.2_

## 15. 触发功能

- [ ] 15.1 实现 workflow 触发 API
  - 创建 `src/app/api/trigger/route.ts`
  - 通过 GitHub API 触发 workflow_dispatch
  - _Requirements: 2.3_

## 16. 登录页面与仪表盘

- [ ] 16.1 实现登录页面
  - 创建 `src/app/login/page.tsx`
  - 创建 `src/components/LoginForm.tsx`
  - _Requirements: 10.1, 10.3_

- [ ] 16.2 实现仪表盘首页
  - 创建 `src/app/dashboard/page.tsx`
  - 显示概览信息（用量、最近文章）
  - 显示"立即生成"按钮
  - 显示预算警告（如适用）
  - _Requirements: 2.3, 3.1.4, 3.1.5_

- [ ] 16.3 实现布局组件
  - 创建 `src/app/dashboard/layout.tsx`
  - 创建 `src/components/Sidebar.tsx`
  - 创建 `src/components/Header.tsx`
  - _Requirements: 11.1_

## 17. GitHub Actions 脚本

- [ ] 17.1 实现每日发布脚本
  - 创建 `scripts/daily-publish.ts`
  - 读取配置和主题
  - 调用 Perplexity 生成内容
  - 推送到微信草稿箱
  - 更新历史记录
  - _Requirements: 2.1, 3.1, 5.1, 7.5, 9.2_

- [ ] 17.2 创建 GitHub Actions workflow
  - 创建 `.github/workflows/daily-publish.yml`
  - 配置 cron schedule 和 workflow_dispatch
  - 配置环境变量和 secrets
  - 配置自动提交历史更新
  - _Requirements: 2.1, 2.4, 2.5, 2.6_

## 18. 配置文件初始化

- [ ] 18.1 创建默认配置文件
  - 创建 `config/topics.json` 默认结构
  - 创建 `config/settings.json` 默认结构
  - 创建 `data/history.json` 默认结构
  - _Requirements: 9.4_

- [ ] 18.2 创建环境变量示例
  - 创建 `.env.example`
  - 创建 `.env.local.example`
  - 更新 README 部署说明
  - _Requirements: 6.1, 8.1, 11.2_

## 19. Final Checkpoint - 确保所有测试通过

- [ ] 19. Final Checkpoint
  - Ensure all tests pass, ask the user if questions arise.
