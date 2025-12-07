# Vercel Dashboard 使用指南

## ✅ 是的，你可以通过 Vercel 上的 Dashboard 完全管理调度设置！

## 🚀 快速开始

### 1. 访问你的 Dashboard
访问你的 Vercel 应用 URL：
```
https://你的应用名.vercel.app/dashboard/settings
```

### 2. 确保 Vercel 环境变量已配置

在 Vercel 项目设置中配置以下环境变量：

#### 必需的环境变量
```env
# GitHub 配置（需要 workflow 权限）
GITHUB_TOKEN=ghp_xxxxxxxxxxxx
GITHUB_OWNER=你的GitHub用户名
GITHUB_REPO=你的仓库名

# API Keys
PERPLEXITY_API_KEY=pplx-xxxxxxxxxx
WECHAT_APP_ID=wx_xxxxxxxxxx
WECHAT_APP_SECRET=xxxxxxxxxx
```

#### 设置步骤
1. 登录 [Vercel Dashboard](https://vercel.com/dashboard)
2. 选择你的项目
3. 进入 Settings → Environment Variables
4. 添加上述环境变量
5. 重新部署以使变量生效

## 📅 使用 Dashboard 设置调度

### 步骤 1：访问设置页面
```
https://你的应用名.vercel.app/dashboard/settings
```

### 步骤 2：选择调度模式

#### 每日模式（推荐）
- 设置时间：**08:00**（早上8点）
- 或多个时间：**08:00, 12:00, 18:00**
- ⚠️ **重要**：分钟必须是5的倍数（00, 05, 10, 15...）

#### 每周模式
- 选择星期几
- 设置执行时间

#### 自定义模式
- 直接输入 cron 表达式
- 示例：`0 8 * * *`（每天8点）

### 步骤 3：保存设置
点击"保存设置"按钮，系统会自动：
1. 更新 GitHub 上的 `settings.json`
2. 更新 workflow 的 cron 表达式
3. 显示下次执行时间

## 🔧 验证配置是否成功

### 方法 1：通过 API 验证
```bash
# 获取当前设置
curl https://你的应用名.vercel.app/api/settings

# 测试预览（替换为你的配置）
curl -X POST https://你的应用名.vercel.app/api/settings/preview \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": true,
    "timezone": "Asia/Shanghai",
    "mode": "daily",
    "executionTimes": ["08:00"]
  }'
```

### 方法 2：检查 GitHub 更新
1. 访问你的 GitHub 仓库
2. 查看 `config/settings.json` 是否更新
3. 查看 `.github/workflows/daily-publish.yml` 的 cron 是否更新

### 方法 3：查看 GitHub Actions
访问：`https://github.com/你的用户名/你的仓库/actions`

## ⚠️ 重要注意事项

### 1. GitHub Token 权限
Token 必须包含以下权限：
- ✅ `repo`（读写仓库）
- ✅ `workflow`（更新 GitHub Actions）

如果没有 workflow 权限：
1. 访问 https://github.com/settings/tokens
2. 生成新 Token 或编辑现有 Token
3. 勾选 `workflow` 权限
4. 在 Vercel 更新 `GITHUB_TOKEN` 环境变量

### 2. 时间精度要求
GitHub Actions cron **必须使用5分钟的倍数**：
- ✅ 正确：08:00, 08:05, 08:10, 08:15...
- ❌ 错误：08:03, 08:27, 08:49...

### 3. 生效延迟
- 新的 cron 调度可能需要 **最多1小时** 才能生效
- 首次设置可能需要更长时间
- 建议手动触发一次测试

## 🎯 推荐的测试流程

### 1. 在 Dashboard 设置调度
```
https://你的应用名.vercel.app/dashboard/settings
```
选择"每日模式" → 设置时间（如 23:00）→ 保存

### 2. 立即手动测试
访问 GitHub Actions 页面：
```
https://github.com/你的用户名/你的仓库/actions/workflows/daily-publish.yml
```
点击 "Run workflow" → 选择 main 分支 → 运行

### 3. 查看执行结果
- GitHub Actions 查看日志
- 微信公众号查看草稿箱

## 📊 监控和管理

### Dashboard 功能
- ✅ 查看当前调度设置
- ✅ 预览下次执行时间
- ✅ 查看执行历史
- ✅ 监控 Token 使用

### GitHub Actions
- 查看执行历史
- 手动触发执行
- 查看错误日志

## 🛠️ 故障排查

### 问题 1：保存设置失败
**原因**：Token 权限不足
**解决**：
1. 确保 Token 有 `workflow` 权限
2. 在 Vercel 更新环境变量
3. 重新部署

### 问题 2：设置后没有自动执行
**原因**：时间不是5的倍数或需要等待生效
**解决**：
1. 使用5的倍数分钟（00, 05, 10...）
2. 等待最多1小时
3. 手动触发测试

### 问题 3：Vercel 函数超时
**原因**：API 响应太慢
**解决**：
1. 检查网络连接
2. 确保 GitHub Token 有效
3. 查看 Vercel 函数日志

## 💡 最佳实践

### 日常使用配置
```json
{
  "schedule": {
    "enabled": true,
    "timezone": "Asia/Shanghai",
    "mode": "daily",
    "executionTimes": ["08:00"]
  },
  "content": {
    "language": "zh-CN",
    "minLength": 1500,
    "maxLength": 2500
  }
}
```

### 测试配置（每5分钟）
```json
{
  "schedule": {
    "enabled": true,
    "mode": "custom",
    "cron": "*/5 * * * *"
  }
}
```

## ✨ 完整功能清单

**Dashboard 支持的功能：**
- ✅ 图形化调度配置
- ✅ 多种调度模式（每日/每周/间隔/自定义）
- ✅ 自动更新 GitHub workflow
- ✅ 实时预览执行时间
- ✅ 输入验证和错误提示
- ✅ 响应式设计（支持手机访问）

**自动化功能：**
- ✅ 定时生成 AI 文章
- ✅ 自动推送到微信草稿箱
- ✅ 历史记录和统计
- ✅ Token 使用追踪

## 🎉 开始使用

现在就访问你的 Dashboard：
```
https://你的应用名.vercel.app/dashboard/settings
```

设置你想要的调度时间，系统会自动处理其余的事情！

---

**有问题？**
1. 检查 Vercel 环境变量
2. 确保 GitHub Token 有正确权限
3. 查看 Vercel 函数日志
4. 查看 GitHub Actions 日志
