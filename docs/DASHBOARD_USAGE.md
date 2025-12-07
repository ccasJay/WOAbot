# Dashboard 调度设置使用指南

## ✅ 功能已完全实现！

你现在可以通过 Dashboard 界面完整地管理定时发布任务。

## 🚀 快速开始

### 1. 启动应用
```bash
npm run dev
```

### 2. 访问 Dashboard
打开浏览器访问: http://localhost:3000/dashboard/settings

### 3. 配置调度

## 📅 支持的调度模式

### 1️⃣ 每日模式 (Daily)
- 可设置多个执行时间点（最多3个）
- 示例：8:00, 12:00, 18:00
- **注意**：分钟最好设置为5的倍数（0, 5, 10, 15...）

### 2️⃣ 每周模式 (Weekly) 
- 选择一周中的特定日期
- 设置统一执行时间
- 示例：每周一、三、五的 9:00

### 3️⃣ 间隔模式 (Interval)
- 设置间隔天数（1-30天）
- 设置执行时间点
- 示例：每3天的 10:00 执行

### 4️⃣ 自定义模式 (Custom)
- 直接输入 cron 表达式
- 完全控制执行时间
- 示例：`*/30 9-18 * * 1-5`（工作日9-18点每30分钟）

## ⚙️ Dashboard 功能特性

### 自动更新
- ✅ 保存设置时自动更新 `settings.json`
- ✅ 自动更新 GitHub Actions workflow 的 cron 表达式
- ✅ 实时预览下次执行时间

### 验证功能
- ✅ 时间格式验证
- ✅ 调度配置合法性检查
- ✅ 执行时间预览

## ⚠️ 重要注意事项

### 1. GitHub Token 权限
确保你的 Token 包含以下权限：
- `repo`：访问仓库
- `workflow`：更新 GitHub Actions（**重要**）

在 `.env.local` 中配置：
```env
GITHUB_TOKEN=你的token（需要workflow权限）
```

### 2. 时间精度限制
- GitHub Actions cron **必须使用5分钟的倍数**
- 有效分钟值：0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55
- 其他分钟值可能不会执行

### 3. 生效延迟
- 新的 cron 调度可能需要**最多1小时**才能生效
- 首次设置可能需要更长时间
- 建议手动触发一次测试

### 4. 分支要求
- Cron 调度只在**默认分支**（main/master）上运行
- 确保更改已推送到主分支

## 🔧 测试流程

### 步骤 1：在 Dashboard 设置调度
1. 选择调度模式
2. 设置执行时间（建议使用5的倍数分钟）
3. 点击"保存设置"
4. 查看"下次执行时间"预览

### 步骤 2：验证配置
```bash
# 查看更新后的设置
cat config/settings.json

# 查看 workflow cron
cat .github/workflows/daily-publish.yml | grep cron
```

### 步骤 3：手动测试
```bash
# 本地完整测试
npx tsx scripts/test-full-publish.ts

# 或在 GitHub Actions 页面手动触发
```

## 📊 监控执行

### GitHub Actions 页面
https://github.com/你的用户名/你的仓库/actions

### 查看执行历史
Dashboard 会显示：
- 上次执行时间
- 执行状态
- Token 使用情况

## 🛠️ 故障排查

### 问题：设置后没有自动执行
1. 检查分钟是否为5的倍数
2. 等待1小时让 cron 生效
3. 检查 GitHub Actions 页面是否有错误
4. 手动触发测试

### 问题：更新 workflow 失败
1. 检查 Token 是否有 `workflow` 权限
2. 在 GitHub Settings → Developer settings → Personal access tokens 更新权限

### 问题：执行失败
1. 检查 GitHub Secrets 是否正确配置：
   - `PERPLEXITY_API_KEY`
   - `WECHAT_APP_ID`
   - `WECHAT_APP_SECRET`

## 🎯 推荐设置

### 日常使用
- 模式：每日模式
- 时间：8:00（早上推送）
- 或：8:00, 18:00（早晚各一次）

### 测试阶段
- 模式：自定义模式
- Cron：`*/5 * * * *`（每5分钟，仅测试用）

### 生产环境
- 模式：每日模式
- 时间：8:00
- 内容长度：1500-2500字

## 💡 使用技巧

1. **首次设置**：建议先手动触发一次，确保流程正常
2. **时间选择**：选择整点或5的倍数分钟
3. **监控运行**：定期查看 GitHub Actions 确保正常执行
4. **成本控制**：注意 API 调用次数和 Token 消耗

## 📝 示例操作

### 设置每天早上8点执行
1. Dashboard → 调度模式 → 每日
2. 执行时间 → 08:00
3. 保存设置
4. 等待自动执行或手动测试

### 设置工作日多次执行
1. Dashboard → 调度模式 → 自定义
2. Cron 表达式 → `0 9,12,18 * * 1-5`
3. 保存设置
4. 查看预览确认时间正确

## ✨ 完整功能列表

- ✅ 图形化调度配置
- ✅ 多种调度模式
- ✅ 自动更新 GitHub workflow
- ✅ 实时预览执行时间
- ✅ 调度验证和错误提示
- ✅ 执行历史查看
- ✅ Token 使用统计
- ✅ 内容长度设置

---

**现在你可以开始使用 Dashboard 来管理你的自动发布任务了！** 🎉
