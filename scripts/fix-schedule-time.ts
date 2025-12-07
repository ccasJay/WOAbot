#!/usr/bin/env tsx

/**
 * 修复调度时间 - 设置为5分钟的倍数
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

async function fixScheduleTime(): Promise<void> {
  console.log('╔════════════════════════════════════════════╗');
  console.log('║     修复调度时间（5分钟间隔）              ║');
  console.log('╚════════════════════════════════════════════╝\n');

  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;

  if (!token || !owner || !repo) {
    throw new Error('GitHub 配置缺失');
  }

  // 计算下一个5分钟间隔
  const now = new Date();
  const beijingTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Shanghai' }));
  
  // 获取当前分钟
  let targetMinutes = beijingTime.getMinutes();
  let targetHours = beijingTime.getHours();
  
  // 调整为下一个5分钟间隔 (至少5分钟后)
  targetMinutes = Math.ceil((targetMinutes + 5) / 5) * 5;
  
  if (targetMinutes >= 60) {
    targetMinutes = targetMinutes % 60;
    targetHours = (targetHours + 1) % 24;
  }

  // 转换为UTC时间（北京时间-8小时）
  let utcHours = targetHours - 8;
  if (utcHours < 0) utcHours += 24;

  // 生成cron表达式（UTC时间）
  const cronExpression = `${targetMinutes} ${utcHours} * * *`;

  console.log('⏰ 时间设置:');
  console.log(`   当前北京时间: ${beijingTime.toLocaleString('zh-CN')}`);
  console.log(`   目标执行时间: ${targetHours.toString().padStart(2, '0')}:${targetMinutes.toString().padStart(2, '0')} (北京时间)`);
  console.log(`   UTC执行时间: ${utcHours.toString().padStart(2, '0')}:${targetMinutes.toString().padStart(2, '0')}`);
  console.log(`   Cron表达式: ${cronExpression}\n`);

  console.log('⚠️  重要说明:');
  console.log('   GitHub Actions cron 必须使用5分钟的倍数');
  console.log('   有效分钟值: 0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55\n');

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
  if (getResponse.ok) {
    const fileData = await getResponse.json();
    sha = fileData.sha;
  }

  // 更新设置
  const newSettings = {
    schedule: {
      enabled: true,
      timezone: 'Asia/Shanghai',
      mode: 'custom',
      cron: cronExpression,
      times: [`${targetHours.toString().padStart(2, '0')}:${targetMinutes.toString().padStart(2, '0')}`],
      _comment: `修复调度时间 - ${now.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`
    },
    content: {
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
      message: `fix: set schedule to valid 5-minute interval (${targetHours}:${targetMinutes.toString().padStart(2, '0')})`,
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
  const newWorkflow = workflowContent.replace(
    /schedule:\s*\n\s*#.*\n\s*- cron:.*\n/,
    `schedule:\n    # 定时执行 - ${targetHours}:${targetMinutes.toString().padStart(2, '0')} (北京时间) = UTC ${utcHours}:${targetMinutes.toString().padStart(2, '0')}\n    - cron: '${cronExpression}'\n`
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
      message: `fix: set workflow cron to valid 5-minute interval`,
      content: Buffer.from(newWorkflow).toString('base64'),
      sha: workflowData.sha,
    }),
  });

  if (!updateWorkflowResponse.ok) {
    const error = await updateWorkflowResponse.text();
    console.error('❌ 更新 workflow 失败:', error);
    console.log('\n请手动更新 workflow 文件');
  } else {
    console.log('✅ Workflow 已更新\n');
  }

  console.log('╔════════════════════════════════════════════╗');
  console.log('║              ✅ 修复完成！                  ║');
  console.log('╚════════════════════════════════════════════╝\n');
  
  console.log(`⏱️  预计执行时间: ${targetHours}:${targetMinutes.toString().padStart(2, '0')} (北京时间)`);
  console.log('📊 查看执行状态: https://github.com/' + owner + '/' + repo + '/actions\n');
  
  console.log('💡 立即测试:');
  console.log('   1. 访问 Actions 页面手动触发');
  console.log('   2. 或运行: npx tsx scripts/test-full-publish.ts\n');
}

fixScheduleTime().catch((error) => {
  console.error('❌ 修复失败:', error);
  process.exit(1);
});
