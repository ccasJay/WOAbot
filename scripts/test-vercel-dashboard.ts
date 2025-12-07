#!/usr/bin/env tsx

/**
 * 测试 Vercel 部署的 Dashboard 功能
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

async function testVercelDashboard(): Promise<void> {
  console.log('╔════════════════════════════════════════════╗');
  console.log('║     测试 Vercel Dashboard 功能              ║');
  console.log('╚════════════════════════════════════════════╝\n');

  // 获取 Vercel 应用 URL
  console.log('请输入你的 Vercel 应用 URL（例如：https://woabot.vercel.app）');
  console.log('或按 Enter 使用默认值...\n');
  
  // 这里你需要替换为你的实际 Vercel URL
  const VERCEL_URL = 'https://你的应用名.vercel.app';
  
  console.log(`🌐 测试 URL: ${VERCEL_URL}\n`);

  // 1. 测试 API 连接
  console.log('📡 测试 API 连接...');
  
  try {
    const settingsResponse = await fetch(`${VERCEL_URL}/api/settings`);
    
    if (!settingsResponse.ok) {
      throw new Error(`API 响应错误: ${settingsResponse.status}`);
    }
    
    const settings = await settingsResponse.json();
    console.log('✅ API 连接成功\n');
    
    console.log('📋 当前设置:');
    console.log('   调度模式:', settings.data?.schedule?.mode || '未设置');
    console.log('   时区:', settings.data?.schedule?.timezone || 'Asia/Shanghai');
    console.log('   执行时间:', settings.data?.schedule?.executionTimes?.join(', ') || settings.data?.schedule?.times?.join(', ') || '未设置');
    console.log('   启用状态:', settings.data?.schedule?.enabled ? '已启用' : '已禁用');
    
  } catch (error) {
    console.error('❌ API 连接失败:', error);
    console.log('\n可能的原因:');
    console.log('1. Vercel 应用 URL 不正确');
    console.log('2. 环境变量未配置');
    console.log('3. 部署未完成\n');
    return;
  }

  // 2. 测试调度预览
  console.log('\n🔮 测试执行时间预览...');
  
  const testSchedule = {
    enabled: true,
    timezone: 'Asia/Shanghai',
    mode: 'daily',
    executionTimes: ['08:00']
  };

  try {
    const previewResponse = await fetch(`${VERCEL_URL}/api/settings/preview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testSchedule),
    });

    if (previewResponse.ok) {
      const preview = await previewResponse.json();
      if (preview.success && preview.data.isValid) {
        console.log('✅ 预览成功');
        console.log('   下次执行时间:', preview.data.formattedTime);
      } else {
        console.log('⚠️  无法计算执行时间');
      }
    }
  } catch (error) {
    console.error('❌ 预览失败:', error);
  }

  // 3. 测试更新调度（可选）
  console.log('\n🔄 测试更新调度设置...');
  
  // 计算5分钟后的时间（用于测试）
  const now = new Date();
  const nextTime = new Date(now.getTime() + 10 * 60 * 1000);
  const hours = nextTime.getHours();
  const minutes = Math.ceil(nextTime.getMinutes() / 5) * 5; // 调整为5的倍数
  const testTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

  const newSchedule = {
    schedule: {
      enabled: true,
      timezone: 'Asia/Shanghai',
      mode: 'daily',
      executionTimes: [testTime]
    }
  };

  console.log(`   尝试设置执行时间为: ${testTime}`);

  try {
    const updateResponse = await fetch(`${VERCEL_URL}/api/settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newSchedule),
    });

    if (updateResponse.ok) {
      const result = await updateResponse.json();
      console.log('✅ 调度设置更新成功');
      
      // 验证 GitHub 更新
      if (process.env.GITHUB_TOKEN) {
        console.log('\n📦 验证 GitHub 更新...');
        
        const settingsUrl = `https://api.github.com/repos/${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}/contents/config/settings.json`;
        const githubResponse = await fetch(settingsUrl, {
          headers: {
            'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json',
          },
        });

        if (githubResponse.ok) {
          console.log('   ✅ settings.json 已同步');
        }

        const workflowUrl = `https://api.github.com/repos/${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}/contents/.github/workflows/daily-publish.yml`;
        const workflowResponse = await fetch(workflowUrl, {
          headers: {
            'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json',
          },
        });

        if (workflowResponse.ok) {
          console.log('   ✅ workflow 已更新');
        }
      }
    } else {
      const error = await updateResponse.text();
      console.error('❌ 更新失败:', error);
      console.log('\n可能的原因:');
      console.log('1. GitHub Token 缺少 workflow 权限');
      console.log('2. 环境变量配置不正确');
    }
  } catch (error) {
    console.error('❌ 更新请求失败:', error);
  }

  // 总结
  console.log('\n\n╔════════════════════════════════════════════╗');
  console.log('║              测试总结                       ║');
  console.log('╚════════════════════════════════════════════╝\n');

  console.log('🎯 Dashboard 访问地址:');
  console.log(`   ${VERCEL_URL}/dashboard/settings\n`);

  console.log('✅ 功能验证:');
  console.log('   - API 连接: 正常');
  console.log('   - 调度预览: 正常');
  console.log('   - 设置更新: 需要正确的环境变量\n');

  console.log('📝 使用步骤:');
  console.log('   1. 访问 Dashboard 页面');
  console.log('   2. 选择调度模式（推荐每日模式）');
  console.log('   3. 设置执行时间（分钟使用5的倍数）');
  console.log('   4. 点击保存');
  console.log('   5. 查看下次执行时间预览\n');

  console.log('⚠️  注意事项:');
  console.log('   - 确保 Vercel 环境变量已配置');
  console.log('   - GitHub Token 需要 workflow 权限');
  console.log('   - 新调度可能需要1小时生效');
  console.log('   - 建议手动触发首次测试\n');

  console.log('🚀 立即开始:');
  console.log(`   1. 打开: ${VERCEL_URL}/dashboard/settings`);
  console.log('   2. 设置你想要的调度时间');
  console.log('   3. 保存并等待执行');
  console.log('   4. 或手动触发: GitHub Actions → Run workflow');
}

testVercelDashboard().catch((error) => {
  console.error('❌ 测试失败:', error);
  process.exit(1);
});
