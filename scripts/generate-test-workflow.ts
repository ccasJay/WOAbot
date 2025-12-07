#!/usr/bin/env tsx

/**
 * 生成测试用的 workflow 配置
 * 由于权限限制，需要手动更新 workflow 文件
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

function generateTestWorkflow(): void {
  console.log('╔════════════════════════════════════════════╗');
  console.log('║     生成测试 Workflow 配置                 ║');
  console.log('╚════════════════════════════════════════════╝\n');

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

  // 读取现有的 workflow 文件
  const workflowPath = resolve(process.cwd(), '.github/workflows/daily-publish.yml');
  const workflowContent = readFileSync(workflowPath, 'utf-8');

  // 更新 cron 表达式
  const scheduleLines = `    - cron: '${cronExpression}'  # 测试调度 - ${targetTime.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`;
  const scheduleBlockRegex = /schedule:\s*\n(    - cron:.*\n)+/;
  const newScheduleBlock = `schedule:\n${scheduleLines}\n`;
  
  const updatedWorkflow = workflowContent.replace(scheduleBlockRegex, newScheduleBlock);

  // 保存到临时文件
  const tempPath = resolve(process.cwd(), '.github/workflows/daily-publish-test.yml');
  writeFileSync(tempPath, updatedWorkflow);

  console.log('✅ 测试 workflow 配置已生成\n');
  console.log('📄 文件位置: .github/workflows/daily-publish-test.yml\n');
  
  console.log('⚠️  由于 GitHub Token 权限限制，无法自动更新 workflow');
  console.log('\n请手动执行以下步骤：\n');
  
  console.log('方法 1: 使用命令行（推荐）');
  console.log('─────────────────────────');
  console.log('cp .github/workflows/daily-publish-test.yml .github/workflows/daily-publish.yml');
  console.log('git add .github/workflows/daily-publish.yml');
  console.log(`git commit -m "test: update workflow cron for ${targetTime.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}"`)
  console.log('git push\n');
  
  console.log('方法 2: 直接在 GitHub 网页编辑');
  console.log('─────────────────────────────');
  console.log('1. 访问你的仓库的 Actions 页面');
  console.log('2. 找到 .github/workflows/daily-publish.yml 文件');
  console.log('3. 点击编辑按钮');
  console.log('4. 将 schedule 部分的 cron 替换为:');
  console.log(`   - cron: '${cronExpression}'`);
  console.log('5. 提交更改\n');

  console.log('方法 3: 立即手动触发（最快）');
  console.log('───────────────────────');
  console.log('运行: npx tsx scripts/trigger-workflow.ts');
  console.log('或者在 GitHub Actions 页面点击 "Run workflow" 按钮\n');

  console.log('💡 Settings.json 已经更新，包含了测试配置');
  console.log(`   调度时间: ${targetTime.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`);
  console.log('   如果选择手动触发，将立即执行一次完整流程\n');
}

generateTestWorkflow();
