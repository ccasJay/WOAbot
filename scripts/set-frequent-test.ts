#!/usr/bin/env tsx

/**
 * 设置频繁测试调度 - 每5分钟执行一次（用于测试）
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

async function setFrequentTest(): Promise<void> {
  console.log('╔════════════════════════════════════════════╗');
  console.log('║     设置频繁测试调度（每5分钟）            ║');
  console.log('╚════════════════════════════════════════════╝\n');

  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;

  if (!token || !owner || !repo) {
    throw new Error('GitHub 配置缺失');
  }

  console.log('⚠️  注意: 这会设置每5分钟执行一次，仅用于测试！\n');

  // 更新 workflow 为每5分钟执行
  const cronExpression = '*/5 * * * *';  // 每5分钟

  console.log('🔄 更新 GitHub Actions workflow...');

  const workflowUrl = `https://api.github.com/repos/${owner}/${repo}/contents/.github/workflows/daily-publish.yml`;
  
  // 获取当前 workflow
  const getWorkflowResponse = await fetch(workflowUrl, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json',
    },
  });

  if (!getWorkflowResponse.ok) {
    throw new Error('获取 workflow 文件失败');
  }

  const workflowData = await getWorkflowResponse.json();
  const workflowContent = Buffer.from(workflowData.content, 'base64').toString('utf-8');

  // 更新 cron 表达式
  const newWorkflow = workflowContent.replace(
    /schedule:\s*\n\s*#.*\n\s*- cron:.*\n/,
    `schedule:\n    # 测试调度 - 每5分钟执行一次\n    - cron: '${cronExpression}'\n`
  );

  // 更新 workflow 文件
  const updateWorkflowResponse = await fetch(workflowUrl, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: `test: set frequent schedule for testing (every 5 minutes)`,
      content: Buffer.from(newWorkflow).toString('base64'),
      sha: workflowData.sha,
    }),
  });

  if (!updateWorkflowResponse.ok) {
    const error = await updateWorkflowResponse.text();
    throw new Error(`更新 workflow 失败: ${error}`);
  }

  console.log('✅ Workflow 已更新为每5分钟执行\n');

  // 显示预期执行时间
  const now = new Date();
  const nextRuns = [];
  for (let i = 1; i <= 5; i++) {
    const nextTime = new Date(now.getTime() + i * 5 * 60 * 1000);
    const beijingTime = nextTime.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
    nextRuns.push(beijingTime.split(' ')[1]);  // 只取时间部分
  }

  console.log('╔════════════════════════════════════════════╗');
  console.log('║              ✅ 设置完成！                  ║');
  console.log('╚════════════════════════════════════════════╝\n');
  
  console.log('⏱️  预期执行时间（北京时间）:');
  nextRuns.forEach((time, index) => {
    console.log(`   ${index + 1}. ${time}`);
  });
  
  console.log('\n📊 监控执行:');
  console.log(`   https://github.com/${owner}/${repo}/actions`);
  
  console.log('\n⚠️  重要提示:');
  console.log('   1. GitHub Actions cron 可能需要最多1小时才能识别新的调度');
  console.log('   2. 首次执行可能会延迟');
  console.log('   3. 测试完成后记得改回正常调度！');
  
  console.log('\n💡 如果10分钟后还没执行，请:');
  console.log('   1. 手动触发: 在 Actions 页面点击 "Run workflow"');
  console.log('   2. 本地测试: npx tsx scripts/test-full-publish.ts');
}

setFrequentTest().catch((error) => {
  console.error('❌ 设置失败:', error);
  process.exit(1);
});
