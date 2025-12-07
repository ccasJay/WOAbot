#!/usr/bin/env tsx

/**
 * 手动触发 GitHub Actions Workflow
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

async function triggerWorkflow(): Promise<void> {
  console.log('╔════════════════════════════════════════════╗');
  console.log('║     手动触发 GitHub Actions Workflow       ║');
  console.log('╚════════════════════════════════════════════╝\n');

  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;

  if (!token || !owner || !repo) {
    throw new Error('GitHub 配置缺失');
  }

  const url = `https://api.github.com/repos/${owner}/${repo}/actions/workflows/daily-publish.yml/dispatches`;

  console.log('🔄 正在触发 workflow...');
  console.log(`📦 仓库: ${owner}/${repo}`);
  console.log(`🌿 分支: main\n`);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ref: 'main'  // 或 'dev'，根据你的默认分支
    }),
  });

  if (response.status === 204) {
    console.log('✅ Workflow 已成功触发！\n');
    console.log('📊 查看执行状态:');
    console.log(`   https://github.com/${owner}/${repo}/actions`);
    console.log('\n💡 提示:');
    console.log('   - Workflow 可能需要几秒钟才会出现在 Actions 页面');
    console.log('   - 点击最新的运行记录查看详细日志');
  } else {
    const errorText = await response.text();
    console.error('❌ 触发失败:', response.status, errorText);
    
    if (response.status === 403) {
      console.log('\n⚠️  可能的原因:');
      console.log('1. GitHub Token 缺少 workflow 权限');
      console.log('2. 仓库的 Actions 被禁用');
      console.log('3. workflow_dispatch 事件未在 workflow 中配置');
    }
  }
}

triggerWorkflow().catch((error) => {
  console.error('❌ 错误:', error);
  process.exit(1);
});
