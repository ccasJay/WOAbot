#!/usr/bin/env tsx

/**
 * 诊断调度问题
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

async function diagnoseSchedule(): Promise<void> {
  console.log('╔════════════════════════════════════════════╗');
  console.log('║        诊断 GitHub Actions 调度问题         ║');
  console.log('╚════════════════════════════════════════════╝\n');

  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;

  if (!token || !owner || !repo) {
    throw new Error('GitHub 配置缺失');
  }

  // 1. 检查当前时间
  const now = new Date();
  const beijingTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Shanghai' }));
  const utcTime = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
  
  console.log('⏰ 当前时间:');
  console.log(`   北京时间: ${beijingTime.toLocaleString('zh-CN')}`);
  console.log(`   UTC时间: ${utcTime.toISOString()}`);
  console.log(`   本地时间: ${now.toLocaleString('zh-CN')}\n`);

  // 2. 检查仓库信息
  console.log('📦 检查仓库信息...');
  const repoResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json',
    },
  });

  const repoData = await repoResponse.json();
  console.log(`   仓库: ${owner}/${repo}`);
  console.log(`   默认分支: ${repoData.default_branch}`);
  console.log(`   私有仓库: ${repoData.private ? '是' : '否'}\n`);

  // 3. 检查 main 分支上的 workflow 文件
  console.log('📄 检查 main 分支的 workflow 文件...');
  const mainWorkflowUrl = `https://api.github.com/repos/${owner}/${repo}/contents/.github/workflows/daily-publish.yml?ref=${repoData.default_branch}`;
  
  const mainWorkflowResponse = await fetch(mainWorkflowUrl, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json',
    },
  });

  if (mainWorkflowResponse.ok) {
    const mainWorkflowData = await mainWorkflowResponse.json();
    const content = Buffer.from(mainWorkflowData.content, 'base64').toString('utf-8');
    
    // 提取 cron 表达式
    const cronMatch = content.match(/- cron:\s*['"](.+?)['"]/);
    if (cronMatch) {
      console.log(`   Cron 表达式: ${cronMatch[1]}`);
      
      // 解析 cron 表达式
      const [minute, hour] = cronMatch[1].split(' ');
      console.log(`   UTC 执行时间: ${hour}:${minute}`);
      
      // 转换为北京时间
      const beijingHour = (parseInt(hour) + 8) % 24;
      console.log(`   北京执行时间: ${beijingHour}:${minute}\n`);
    }
  } else {
    console.log('   ❌ 无法获取 main 分支的 workflow 文件\n');
  }

  // 4. 检查 Actions 是否启用
  console.log('🚀 检查 GitHub Actions 状态...');
  const actionsUrl = `https://api.github.com/repos/${owner}/${repo}/actions/workflows`;
  
  const actionsResponse = await fetch(actionsUrl, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json',
    },
  });

  if (actionsResponse.ok) {
    const actionsData = await actionsResponse.json();
    const workflow = actionsData.workflows.find((w: any) => w.name === 'Daily Publish');
    
    if (workflow) {
      console.log(`   Workflow ID: ${workflow.id}`);
      console.log(`   状态: ${workflow.state}`);
      console.log(`   路径: ${workflow.path}\n`);
      
      // 5. 检查最近的运行记录
      console.log('📊 最近的运行记录...');
      const runsUrl = `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflow.id}/runs?per_page=5`;
      
      const runsResponse = await fetch(runsUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      });

      if (runsResponse.ok) {
        const runsData = await runsResponse.json();
        
        if (runsData.workflow_runs.length > 0) {
          runsData.workflow_runs.forEach((run: any, index: number) => {
            const runTime = new Date(run.created_at);
            console.log(`   ${index + 1}. ${runTime.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`);
            console.log(`      状态: ${run.status} / ${run.conclusion || '进行中'}`);
            console.log(`      触发: ${run.event}`);
            console.log(`      分支: ${run.head_branch}`);
          });
        } else {
          console.log('   没有运行记录');
        }
      }
    } else {
      console.log('   ❌ 未找到 Daily Publish workflow');
    }
  } else {
    console.log('   ❌ 无法获取 Actions 信息');
  }

  // 6. 检查 settings.json
  console.log('\n📋 检查 settings.json...');
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
    
    console.log('   调度配置:');
    console.log(`   - 启用: ${settings.schedule.enabled}`);
    console.log(`   - 模式: ${settings.schedule.mode}`);
    if (settings.schedule.cron) {
      console.log(`   - Cron: ${settings.schedule.cron}`);
    }
    if (settings.schedule.times) {
      console.log(`   - 时间: ${settings.schedule.times.join(', ')}`);
    }
  }

  // 诊断结果
  console.log('\n\n╔════════════════════════════════════════════╗');
  console.log('║              诊断结果                       ║');
  console.log('╚════════════════════════════════════════════╝\n');

  console.log('⚠️  GitHub Actions cron 调度的常见问题:\n');
  
  console.log('1. 🌿 分支问题');
  console.log('   - Cron 只在默认分支(main/master)上运行');
  console.log('   - 确保 workflow 文件已合并到 main 分支\n');
  
  console.log('2. ⏱️  时间精度');
  console.log('   - GitHub Actions cron 最小精度是5分钟');
  console.log('   - 实际执行可能有0-59秒的延迟\n');
  
  console.log('3. 🔒 权限问题');
  console.log('   - 私有仓库需要付费账户才能使用 Actions');
  console.log('   - 免费账户每月有2000分钟限制\n');
  
  console.log('4. 📝 Cron 格式');
  console.log('   - 使用 UTC 时间');
  console.log('   - 格式: 分 时 日 月 星期\n');

  console.log('💡 建议的解决方案:');
  console.log('   1. 立即手动触发测试: https://github.com/' + owner + '/' + repo + '/actions');
  console.log('   2. 确保 workflow 文件在 main 分支');
  console.log('   3. 等待下一个5分钟间隔（如 22:30, 22:35）');
  console.log('   4. 检查 Actions 标签页是否有错误信息');
}

diagnoseSchedule().catch((error) => {
  console.error('❌ 诊断失败:', error);
  process.exit(1);
});
