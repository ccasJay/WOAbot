#!/usr/bin/env tsx

/**
 * 深度诊断 GitHub Actions 调度问题
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

async function deepDiagnose(): Promise<void> {
  console.log('╔════════════════════════════════════════════╗');
  console.log('║     深度诊断 GitHub Actions 调度问题        ║');
  console.log('╚════════════════════════════════════════════╝\n');

  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;

  if (!token || !owner || !repo) {
    throw new Error('GitHub 配置缺失');
  }

  // 1. 检查当前时间和 cron 匹配
  console.log('⏰ 时间检查:');
  const now = new Date();
  const nowUTC = new Date(now.toISOString());
  const nowBeijing = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Shanghai' }));
  
  console.log(`   当前UTC时间: ${nowUTC.toISOString()}`);
  console.log(`   当前北京时间: ${nowBeijing.toLocaleString('zh-CN')}`);
  console.log(`   UTC小时:分钟 = ${nowUTC.getUTCHours()}:${nowUTC.getUTCMinutes()}\n`);

  // 2. 检查 workflow 在 main 分支的实际内容
  console.log('📄 检查 main 分支的 workflow 内容...');
  const workflowUrl = `https://api.github.com/repos/${owner}/${repo}/contents/.github/workflows/daily-publish.yml?ref=main`;
  
  const workflowResponse = await fetch(workflowUrl, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json',
    },
  });

  if (workflowResponse.ok) {
    const workflowData = await workflowResponse.json();
    const content = Buffer.from(workflowData.content, 'base64').toString('utf-8');
    
    // 提取 schedule 部分
    const scheduleMatch = content.match(/schedule:[\s\S]*?(?=\n\w|\n$)/);
    if (scheduleMatch) {
      console.log('   Schedule 配置:');
      console.log(scheduleMatch[0].split('\n').map(line => '   ' + line).join('\n'));
    }
    
    // 检查 workflow_dispatch
    if (content.includes('workflow_dispatch:')) {
      console.log('   ✅ workflow_dispatch 已启用（支持手动触发）');
    } else {
      console.log('   ❌ workflow_dispatch 未启用');
    }
    
    console.log(`   最后更新: ${workflowData.sha.substring(0, 7)}`);
    console.log(`   文件大小: ${workflowData.size} bytes\n`);
  } else {
    console.log('   ❌ 无法获取 workflow 文件\n');
  }

  // 3. 检查 workflow 运行历史和状态
  console.log('📊 检查 workflow 状态和历史...');
  const workflowsUrl = `https://api.github.com/repos/${owner}/${repo}/actions/workflows`;
  
  const workflowsResponse = await fetch(workflowsUrl, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json',
    },
  });

  if (workflowsResponse.ok) {
    const workflowsData = await workflowsResponse.json();
    const dailyPublish = workflowsData.workflows.find((w: any) => w.name === 'Daily Publish');
    
    if (dailyPublish) {
      console.log(`   Workflow ID: ${dailyPublish.id}`);
      console.log(`   状态: ${dailyPublish.state}`);
      console.log(`   Badge URL: ${dailyPublish.badge_url}\n`);
      
      // 获取更多运行记录
      const runsUrl = `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${dailyPublish.id}/runs?per_page=10`;
      const runsResponse = await fetch(runsUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      });

      if (runsResponse.ok) {
        const runsData = await runsResponse.json();
        
        console.log('   最近10次运行:');
        if (runsData.workflow_runs.length === 0) {
          console.log('   没有运行记录');
        } else {
          // 统计触发类型
          const triggerTypes: { [key: string]: number } = {};
          
          runsData.workflow_runs.forEach((run: any, index: number) => {
            const runTime = new Date(run.created_at);
            const beijingTime = runTime.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
            const status = run.conclusion || run.status;
            const emoji = status === 'success' ? '✅' : status === 'failure' ? '❌' : '⏳';
            
            console.log(`   ${index + 1}. ${beijingTime} ${emoji} ${run.event}`);
            
            triggerTypes[run.event] = (triggerTypes[run.event] || 0) + 1;
          });
          
          console.log('\n   触发类型统计:');
          Object.entries(triggerTypes).forEach(([type, count]) => {
            console.log(`   - ${type}: ${count}次`);
          });
        }
      }
    }
  }

  // 4. 检查仓库的 Actions 设置
  console.log('\n🔧 检查仓库 Actions 权限...');
  const repoUrl = `https://api.github.com/repos/${owner}/${repo}`;
  const repoResponse = await fetch(repoUrl, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json',
    },
  });

  if (repoResponse.ok) {
    const repoData = await repoResponse.json();
    console.log(`   仓库类型: ${repoData.private ? '私有' : '公开'}`);
    console.log(`   默认分支: ${repoData.default_branch}`);
    console.log(`   分叉自: ${repoData.fork ? repoData.parent?.full_name : '原始仓库'}`);
    
    // 检查 Actions 权限
    const actionsPermUrl = `https://api.github.com/repos/${owner}/${repo}/actions/permissions`;
    const actionsPermResponse = await fetch(actionsPermUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });
    
    if (actionsPermResponse.ok) {
      const permData = await actionsPermResponse.json();
      console.log(`   Actions 启用: ${permData.enabled ? '是' : '否'}`);
      if (permData.allowed_actions) {
        console.log(`   允许的 Actions: ${permData.allowed_actions}`);
      }
    }
  }

  // 5. 检查账户的 Actions 使用情况
  console.log('\n📈 检查 Actions 使用限制...');
  const billingUrl = `https://api.github.com/users/${owner}/settings/billing/actions`;
  const billingResponse = await fetch(billingUrl, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json',
    },
  });

  if (billingResponse.ok) {
    const billingData = await billingResponse.json();
    console.log(`   已使用分钟数: ${billingData.total_minutes_used}`);
    console.log(`   付费分钟数: ${billingData.total_paid_minutes_used}`);
    console.log(`   包含的分钟数: ${billingData.included_minutes}`);
  } else {
    console.log('   无法获取使用情况（可能需要更高权限）');
  }

  // 诊断结果
  console.log('\n\n╔════════════════════════════════════════════╗');
  console.log('║           诊断结果和建议                    ║');
  console.log('╚════════════════════════════════════════════╝\n');

  console.log('🔍 可能的问题:\n');
  
  console.log('1. ⏱️  GitHub Actions Cron 调度延迟');
  console.log('   - 新的 cron 调度可能需要等待最多 1 小时才能生效');
  console.log('   - GitHub 不保证精确的执行时间\n');
  
  console.log('2. 🌿 分支同步问题');
  console.log('   - 确保 workflow 文件已推送到 main 分支');
  console.log('   - 本地修改可能未同步到远程\n');
  
  console.log('3. 📦 Actions 队列延迟');
  console.log('   - GitHub Actions 可能有执行队列');
  console.log('   - 高峰期可能延迟几分钟\n');
  
  console.log('4. 🔒 权限或配额问题');
  console.log('   - 免费账户每月 2000 分钟限制');
  console.log('   - 私有仓库消耗分钟数更快\n');

  console.log('💡 推荐的解决方案:\n');
  console.log('✅ 立即手动测试（最可靠）:');
  console.log('   npx tsx scripts/test-full-publish.ts\n');
  
  console.log('✅ GitHub 网页手动触发:');
  console.log(`   1. 访问: https://github.com/${owner}/${repo}/actions`);
  console.log('   2. 选择 "Daily Publish" workflow');
  console.log('   3. 点击 "Run workflow"\n');
  
  console.log('✅ 等待下一个整点:');
  console.log('   设置 cron 为 "0 */1 * * *" (每小时整点执行)');
  console.log('   或 "*/5 * * * *" (每5分钟执行，用于测试)\n');
  
  console.log('✅ 检查 Actions 日志:');
  console.log(`   https://github.com/${owner}/${repo}/actions/workflows/daily-publish.yml`);
}

deepDiagnose().catch((error) => {
  console.error('❌ 诊断失败:', error);
  process.exit(1);
});
