# 🔧 修复 GitHub Actions 运行失败

## ❌ 当前问题
GitHub Actions 在执行 "Run daily publish script" 步骤时失败

## ✅ 本地测试结果
- **Perplexity API**: ✅ 正常
- **微信 API**: ✅ 正常
- **完整流程**: ✅ 正常

这说明你的 API Keys 都是有效的，问题在于 **GitHub Secrets 未配置**！

## 🚀 立即修复（5分钟搞定）

### 步骤 1: 访问 GitHub Secrets 设置
打开链接：https://github.com/ccasJay/WOAbot/settings/secrets/actions

### 步骤 2: 添加以下 Secrets

点击 "New repository secret" 按钮，逐个添加：

#### 1️⃣ PERPLEXITY_API_KEY
- **Name**: `PERPLEXITY_API_KEY`
- **Value**: 你的 Perplexity API Key（从 .env.local 复制）
```bash
# 查看本地配置的值
grep PERPLEXITY_API_KEY .env.local
```

#### 2️⃣ WECHAT_APP_ID
- **Name**: `WECHAT_APP_ID`
- **Value**: 你的微信公众号 App ID
```bash
# 查看本地配置的值
grep WECHAT_APP_ID .env.local
```

#### 3️⃣ WECHAT_APP_SECRET
- **Name**: `WECHAT_APP_SECRET`
- **Value**: 你的微信公众号 App Secret
```bash
# 查看本地配置的值
grep WECHAT_APP_SECRET .env.local
```

### 步骤 3: 验证 Secrets 已添加
刷新页面，应该看到 3 个 Secrets：
- PERPLEXITY_API_KEY
- WECHAT_APP_ID
- WECHAT_APP_SECRET

### 步骤 4: 重新运行失败的 Workflow
1. 访问：https://github.com/ccasJay/WOAbot/actions
2. 点击最新失败的运行
3. 点击右上角 "Re-run all jobs" 按钮

## 📝 完整的 Secrets 配置示例

```yaml
# 这些是需要在 GitHub 仓库设置中添加的 Secrets
PERPLEXITY_API_KEY: pplx-xxxxxxxxxxxxxxxx
WECHAT_APP_ID: wx_xxxxxxxxxxxxxxxx
WECHAT_APP_SECRET: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## 🎯 快速验证命令

### 查看本地环境变量（获取要填写的值）
```bash
# 一次性显示所有需要的值
cat .env.local | grep -E "(PERPLEXITY_API_KEY|WECHAT_APP_ID|WECHAT_APP_SECRET)"
```

### 验证 GitHub Actions 配置
```bash
# 查看 workflow 文件确认需要哪些 secrets
cat .github/workflows/daily-publish.yml | grep secrets
```

## ⚡ 立即手动触发测试

配置完 Secrets 后，立即测试：

### 方法 1: GitHub 网页触发
1. 访问：https://github.com/ccasJay/WOAbot/actions/workflows/daily-publish.yml
2. 点击 "Run workflow"
3. 选择 main 分支
4. 点击绿色 "Run workflow" 按钮

### 方法 2: 等待自动执行
根据你的设置，下次执行时间是配置的时间点

## 🔍 如何确认修复成功

### 成功的标志：
1. GitHub Actions 显示绿色 ✅
2. 微信公众号草稿箱有新文章
3. data/history.json 文件更新

### 查看运行日志：
1. 访问：https://github.com/ccasJay/WOAbot/actions
2. 点击最新的运行
3. 查看每个步骤的日志

## ❓ 常见问题

### Q: 添加 Secrets 后还是失败？
A: 检查以下几点：
1. Secret 名称必须完全一致（区分大小写）
2. 值不要包含引号
3. 确保没有多余的空格

### Q: 如何获取 Perplexity API Key？
A: 访问 https://www.perplexity.ai/settings/api

### Q: 如何获取微信公众号配置？
A: 登录微信公众平台 → 开发 → 基本配置

### Q: Secrets 安全吗？
A: 是的！GitHub Secrets 是加密存储的，只有在 Actions 运行时才能访问，不会在日志中显示。

## 📊 完整检查清单

- [ ] 本地 .env.local 文件配置正确
- [ ] 本地测试全部通过
- [ ] GitHub Secrets 已添加（3个）
- [ ] Secret 名称完全正确
- [ ] Secret 值没有引号和空格
- [ ] 重新运行 Workflow

## 🎉 修复后的效果

一旦配置正确，你将实现：
- ✅ 自动定时执行（根据你的调度设置）
- ✅ AI 生成文章
- ✅ 自动推送到微信草稿箱
- ✅ 记录执行历史
- ✅ 邮件通知（成功/失败）

## 💡 专业提示

1. **保存 API Keys 备份**：将 Keys 安全地保存在密码管理器中

2. **定期检查运行状态**：设置 GitHub 通知，及时了解运行状态

3. **优化调度时间**：选择用户活跃时间发布，提高阅读率

---

**立即行动：** 
1. 打开 https://github.com/ccasJay/WOAbot/settings/secrets/actions
2. 添加 3 个 Secrets
3. 重新运行 Workflow

5分钟后，你就能看到成功的绿色 ✅ 了！
