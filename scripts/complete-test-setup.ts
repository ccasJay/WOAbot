#!/usr/bin/env tsx

/**
 * 完成测试设置 - 更新workflow并触发执行
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

async function completeTestSetup(): Promise<void> {
  console.log('╔════════════════════════════════════════════╗');
  console.log('║       完成测试设置并触发 Workflow          ║');
  console.log('╚════════════════════════════════════════════╝\n');

  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;

  if (!token || !owner || !repo) {
    throw new Error('GitHub 配置缺失');
  }

  // 1. 验证 Token 权限
  console.log('🔍 验证 Token 权限...');
  
  const userResponse = await fetch('https://api.github.com/user', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json',
    },
  });

  if (!userResponse.ok) {
    throw new Error('Token 无效');
  }

  // 检查 workflow 权限
  const scopesHeader = userResponse.headers.get('x-oauth-scopes');
  console.log(`   权限范围: ${scopesHeader || '未知'}`);
  
  if (scopesHeader && scopesHeader.includes('workflow')) {
    console.log('✅ Token 包含 workflow 权限\n');
  } else {
    console.log('⚠️  警告: Token 可能缺少 workflow 权限\n');
  }

  // 2. 获取当前分支
  console.log('🔍 获取当前分支...');
  
  const repoResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json',
    },
  });

  const repoData = await repoResponse.json();
  const defaultBranch = repoData.default_branch || 'main';
  console.log(`   默认分支: ${defaultBranch}\n`);

  // 3. 更新 workflow 文件
  console.log('🔄 更新 GitHub Actions workflow...');

  const workflowPath = '.github/workflows/daily-publish.yml';
  const workflowUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${workflowPath}`;
  
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
  
  // 读取本地的更新版本
  const localWorkflowPath = resolve(process.cwd(), workflowPath);
  const updatedWorkflow = readFileSync(localWorkflowPath, 'utf-8');

  // 更新 workflow 文件
  const updateWorkflowResponse = await fetch(workflowUrl, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: `test: update workflow for immediate test execution`,
      content: Buffer.from(updatedWorkflow).toString('base64'),
      sha: workflowData.sha,
      branch: defaultBranch,
    }),
  });

  if (!updateWorkflowResponse.ok) {
    const error = await updateWorkflowResponse.text();
    console.error('❌ 更新 workflow 失败:', error);
    
    if (updateWorkflowResponse.status === 403) {
      console.log('\n💡 提示: 请确保 Token 有 workflow 权限');
      console.log('   访问: https://github.com/settings/tokens');
      console.log('   编辑 Token 并勾选 "workflow" 权限\n');
    }
    
    throw new Error('更新 workflow 失败');
  }

  console.log('✅ Workflow 已更新\n');

  // 等待一下让 GitHub 处理更新
  console.log('⏳ 等待 GitHub 处理更新...');
  await new Promise(resolve => setTimeout(resolve, 3000));

  // 4. 触发 workflow
  console.log('\n🚀 触发 workflow 执行...');
  
  const dispatchUrl = `https://api.github.com/repos/${owner}/${repo}/actions/workflows/daily-publish.yml/dispatches`;

  const dispatchResponse = await fetch(dispatchUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ref: defaultBranch
    }),
  });

  if (dispatchResponse.status === 204) {
    console.log('✅ Workflow 已成功触发！\n');
  } else {
    const errorText = await dispatchResponse.text();
    console.error('⚠️  触发可能失败:', dispatchResponse.status, errorText);
    console.log('\n你可以手动在 GitHub Actions 页面触发\n');
  }

  console.log('╔════════════════════════════════════════════╗');
  console.log('║            🎉 设置完成！                    ║');
  console.log('╚════════════════════════════════════════════╝\n');

  console.log('📊 查看执行状态:');
  console.log(`   https://github.com/${owner}/${repo}/actions`);
  console.log('\n💡 说明:');
  console.log('   1. Workflow 已立即触发执行（手动触发）');
  console.log('   2. 同时设置了定时任务（22:29 执行）');
  console.log('   3. Settings.json 已配置为 custom 模式');
  console.log('\n⏱️  预计执行时间:');
  console.log('   - 立即: 手动触发的执行');
  console.log('   - 22:29: 自动定时执行（如果手动触发失败）');
}

completeTestSetup().catch((error) => {
  console.error('❌ 设置失败:', error);
  process.exit(1);
});
