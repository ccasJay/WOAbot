#!/usr/bin/env tsx

/**
 * 设置测试调度 - 15分钟后执行一次完整工作流
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

async function setupTestSchedule(): Promise<void> {
  console.log('╔════════════════════════════════════════════╗');
  console.log('║     设置测试调度 - 15分钟后执行            ║');
  console.log('╚════════════════════════════════════════════╝\n');

  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;

  if (!token || !owner || !repo) {
    throw new Error('GitHub 配置缺失');
  }

  // 计算15分钟后的时间
  const now = new Date();
  const targetTime = new Date(now.getTime() + 15 * 60 * 1000);
  
  // 获取北京时间
  const beijingTime = new Date(targetTime.toLocaleString('en-US', { timeZone: 'Asia/Shanghai' }));
  const hours = beijingTime.getHours();
  const minutes = beijingTime.getMinutes();

  // 转换为UTC时间（北京时间-8小时）
  let utcHours = hours - 8;
  if (utcHours < 0) utcHours += 24;

  // 生成cron表达式（UTC时间）
  const cronExpression = `${minutes} ${utcHours} * * *`;

  console.log(`📅 当前时间: ${now.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`);
  console.log(`🎯 目标时间: ${targetTime.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`);
  console.log(`⏰ 执行时间: ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} (北京时间)`);
  console.log(`🌍 UTC时间: ${utcHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`);
  console.log(`📝 Cron表达式: ${cronExpression}\n`);

  // 1. 更新 settings.json
  console.log('🔄 更新 settings.json...');
  
  const settingsUrl = `https://api.github.com/repos/${owner}/${repo}/contents/config/settings.json`;
  
  // 获取当前文件
  const getResponse = await fetch(settingsUrl, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json',
    },
  });

  let sha: string | undefined;
  let existingSettings: any = {};

  if (getResponse.ok) {
    const fileData = await getResponse.json();
    sha = fileData.sha;
    const content = Buffer.from(fileData.content, 'base64').toString('utf-8');
    existingSettings = JSON.parse(content);
  }

  // 更新设置
  const newSettings = {
    ...existingSettings,
    schedule: {
      enabled: true,
      timezone: 'Asia/Shanghai',
      mode: 'custom',
      cron: cronExpression,
      times: [`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`],
      _comment: `测试调度 - 设置于 ${now.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`
    },
    content: existingSettings.content || {
      language: 'zh-CN',
      minLength: 1500,
      maxLength: 2500
    }
  };

  const updateSettingsResponse = await fetch(settingsUrl, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: `test: setup schedule for ${targetTime.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`,
      content: Buffer.from(JSON.stringify(newSettings, null, 2)).toString('base64'),
      ...(sha && { sha }),
    }),
  });

  if (!updateSettingsResponse.ok) {
    const error = await updateSettingsResponse.text();
    throw new Error(`更新 settings.json 失败: ${error}`);
  }

  console.log('✅ settings.json 已更新\n');

  // 2. 更新 workflow
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
  const scheduleLines = `    - cron: '${cronExpression}'  # 测试调度 - ${targetTime.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`;
  const scheduleBlockRegex = /schedule:\s*\n(    - cron:.*\n)+/;
  const newScheduleBlock = `schedule:\n${scheduleLines}\n`;
  
  const updatedWorkflow = workflowContent.replace(scheduleBlockRegex, newScheduleBlock);

  // 更新 workflow 文件
  const updateWorkflowResponse = await fetch(workflowUrl, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: `test: update workflow cron for test at ${targetTime.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`,
      content: Buffer.from(updatedWorkflow).toString('base64'),
      sha: workflowData.sha,
    }),
  });

  if (!updateWorkflowResponse.ok) {
    const error = await updateWorkflowResponse.text();
    throw new Error(`更新 workflow 失败: ${error}`);
  }

  console.log('✅ Workflow 已更新\n');

  // 3. 手动触发一次（可选）
  console.log('💡 提示：你也可以手动触发 workflow 进行测试');
  console.log(`   访问: https://github.com/${owner}/${repo}/actions/workflows/daily-publish.yml`);
  console.log('   点击 "Run workflow" 按钮\n');

  console.log('╔════════════════════════════════════════════╗');
  console.log('║              ✅ 设置完成！                  ║');
  console.log('╚════════════════════════════════════════════╝\n');
  console.log(`⏱️  预计执行时间: ${targetTime.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`);
  console.log(`📊 查看执行状态: https://github.com/${owner}/${repo}/actions`);
  console.log('\n⚠️  注意事项:');
  console.log('1. GitHub Actions 的 cron 有最小精度限制（通常5分钟）');
  console.log('2. 实际执行时间可能有几分钟延迟');
  console.log('3. 请确保 GitHub Secrets 已正确配置');
  console.log('4. 建议手动触发一次测试功能是否正常\n');
}

setupTestSchedule().catch((error) => {
  console.error('❌ 设置失败:', error);
  process.exit(1);
});
