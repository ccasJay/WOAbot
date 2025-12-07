#!/usr/bin/env tsx

/**
 * 诊断 GitHub Actions 运行失败
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

// 加载环境变量
const envPath = resolve(process.cwd(), '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
envContent.split('\n').forEach((line) => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    process.env[match[1].trim()] = match[2].trim();
  }
});

async function diagnoseFailure(): Promise<void> {
  console.log('╔════════════════════════════════════════════╗');
  console.log('║     诊断 GitHub Actions 运行失败            ║');
  console.log('╚════════════════════════════════════════════╝\n');

  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;

  if (!token || !owner || !repo) {
    throw new Error('GitHub 配置缺失');
  }

  // 1. 获取最新的运行记录
  console.log('📊 获取最新运行记录...\n');
  
  const runsUrl = `https://api.github.com/repos/${owner}/${repo}/actions/runs?per_page=5`;
  const runsResponse = await fetch(runsUrl, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json',
    },
  });

  if (!runsResponse.ok) {
    throw new Error('无法获取运行记录');
  }

  const runsData = await runsResponse.json();
  
  if (runsData.workflow_runs.length === 0) {
    console.log('没有找到运行记录');
    return;
  }

  // 找到最新的失败运行
  const latestRun = runsData.workflow_runs[0];
  const failedRuns = runsData.workflow_runs.filter((run: any) => run.conclusion === 'failure');
  
  console.log('📝 最近的运行记录:');
  runsData.workflow_runs.forEach((run: any, index: number) => {
    const time = new Date(run.created_at).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
    const status = run.conclusion || run.status;
    const emoji = status === 'success' ? '✅' : status === 'failure' ? '❌' : '⏳';
    console.log(`${index + 1}. ${time} ${emoji} ${status} (${run.event})`);
  });

  if (failedRuns.length === 0) {
    console.log('\n✅ 没有失败的运行');
    return;
  }

  const failedRun = failedRuns[0];
  console.log(`\n❌ 分析失败的运行: #${failedRun.run_number}`);
  console.log(`   时间: ${new Date(failedRun.created_at).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`);
  console.log(`   触发: ${failedRun.event}`);
  console.log(`   分支: ${failedRun.head_branch}\n`);

  // 2. 获取运行的 jobs
  console.log('🔍 获取任务详情...\n');
  
  const jobsUrl = `https://api.github.com/repos/${owner}/${repo}/actions/runs/${failedRun.id}/jobs`;
  const jobsResponse = await fetch(jobsUrl, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json',
    },
  });

  if (jobsResponse.ok) {
    const jobsData = await jobsResponse.json();
    
    jobsData.jobs.forEach((job: any) => {
      const status = job.conclusion || job.status;
      const emoji = status === 'success' ? '✅' : status === 'failure' ? '❌' : '⏳';
      console.log(`任务: ${job.name} ${emoji}`);
      
      // 找出失败的步骤
      if (job.conclusion === 'failure' && job.steps) {
        console.log('   失败的步骤:');
        job.steps.forEach((step: any) => {
          if (step.conclusion === 'failure') {
            console.log(`   ❌ ${step.name}`);
          }
        });
      }
    });
  }

  // 3. 获取日志（如果可能）
  console.log('\n📄 尝试获取错误日志...\n');
  
  // 获取 workflow 文件检查配置
  const workflowUrl = `https://api.github.com/repos/${owner}/${repo}/contents/.github/workflows/daily-publish.yml`;
  const workflowResponse = await fetch(workflowUrl, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json',
    },
  });

  if (workflowResponse.ok) {
    const workflowData = await workflowResponse.json();
    const content = Buffer.from(workflowData.content, 'base64').toString('utf-8');
    
    // 检查环境变量配置
    const envVars = content.match(/\$\{\{\s*secrets\.(\w+)\s*\}\}/g);
    if (envVars) {
      console.log('📋 Workflow 需要的 Secrets:');
      const uniqueSecrets = [...new Set(envVars.map(v => v.match(/secrets\.(\w+)/)?.[1]))];
      uniqueSecrets.forEach(secret => {
        if (secret) {
          console.log(`   - ${secret}`);
        }
      });
    }
  }

  // 4. 检查 Secrets 配置（通过测试 API）
  console.log('\n🔐 验证配置...\n');

  // 检查 settings.json
  const settingsUrl = `https://api.github.com/repos/${owner}/${repo}/contents/config/settings.json`;
  const settingsResponse = await fetch(settingsUrl, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json',
    },
  });

  if (settingsResponse.ok) {
    const settingsData = await settingsResponse.json();
    const settings = JSON.parse(Buffer.from(settingsData.content, 'base64').toString('utf-8'));
    console.log('✅ settings.json 存在');
    console.log(`   调度模式: ${settings.schedule?.mode}`);
    console.log(`   执行时间: ${settings.schedule?.times?.join(', ') || settings.schedule?.executionTimes?.join(', ')}`);
  } else {
    console.log('❌ settings.json 不存在或无法访问');
  }

  // 5. 分析常见问题
  console.log('\n\n╔════════════════════════════════════════════╗');
  console.log('║           可能的失败原因                    ║');
  console.log('╚════════════════════════════════════════════╝\n');

  console.log('🔍 常见问题和解决方案:\n');

  console.log('1️⃣ **GitHub Secrets 未配置**');
  console.log('   需要在仓库设置中配置:');
  console.log('   - PERPLEXITY_API_KEY');
  console.log('   - WECHAT_APP_ID');
  console.log('   - WECHAT_APP_SECRET\n');
  console.log('   配置路径:');
  console.log(`   https://github.com/${owner}/${repo}/settings/secrets/actions\n`);

  console.log('2️⃣ **API Key 无效或过期**');
  console.log('   - 检查 Perplexity API Key 是否有效');
  console.log('   - 检查微信公众号配置是否正确');
  console.log('   - 测试: npx tsx scripts/test-perplexity.ts\n');

  console.log('3️⃣ **依赖安装失败**');
  console.log('   - package-lock.json 可能需要更新');
  console.log('   - 运行: npm ci 重新安装依赖\n');

  console.log('4️⃣ **文件路径或配置问题**');
  console.log('   - config/settings.json 格式错误');
  console.log('   - data 目录不存在\n');

  console.log('5️⃣ **Node.js 版本问题**');
  console.log('   - workflow 使用 Node.js 20');
  console.log('   - 确保代码兼容\n');

  // 6. 建议的操作
  console.log('╔════════════════════════════════════════════╗');
  console.log('║           建议的解决步骤                    ║');
  console.log('╚════════════════════════════════════════════╝\n');

  console.log('📝 步骤 1: 检查 GitHub Secrets');
  console.log(`   访问: https://github.com/${owner}/${repo}/settings/secrets/actions`);
  console.log('   确保已添加所有必需的 Secrets\n');

  console.log('📝 步骤 2: 本地测试');
  console.log('   运行以下命令验证功能:');
  console.log('   npx tsx scripts/test-perplexity.ts  # 测试 Perplexity API');
  console.log('   npx tsx scripts/test-wechat.ts      # 测试微信 API');
  console.log('   npx tsx scripts/test-full-publish.ts # 完整流程测试\n');

  console.log('📝 步骤 3: 查看详细日志');
  console.log(`   访问: https://github.com/${owner}/${repo}/actions`);
  console.log('   点击失败的运行查看详细错误信息\n');

  console.log('📝 步骤 4: 手动重试');
  console.log('   在 Actions 页面点击 "Re-run all jobs"\n');

  console.log('💡 快速修复命令:');
  console.log('   # 更新依赖');
  console.log('   npm ci');
  console.log('   ');
  console.log('   # 测试所有 API');
  console.log('   npm run test');
  console.log('   ');
  console.log('   # 提交更新');
  console.log('   git add .');
  console.log('   git commit -m "fix: update dependencies"');
  console.log('   git push');
}

diagnoseFailure().catch((error) => {
  console.error('❌ 诊断失败:', error);
  process.exit(1);
});
