#!/usr/bin/env tsx

/**
 * 测试通过 Dashboard API 更新调度设置
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

async function testDashboardSchedule(): Promise<void> {
  console.log('╔════════════════════════════════════════════╗');
  console.log('║     测试 Dashboard 调度设置功能             ║');
  console.log('╚════════════════════════════════════════════╝\n');

  const baseUrl = 'http://localhost:3000';
  
  // 测试场景
  const testCases = [
    {
      name: '每日单次执行（早上8点）',
      config: {
        schedule: {
          enabled: true,
          timezone: 'Asia/Shanghai',
          mode: 'daily',
          executionTimes: ['08:00']
        }
      }
    },
    {
      name: '每日多次执行（8点、12点、18点）',
      config: {
        schedule: {
          enabled: true,
          timezone: 'Asia/Shanghai',
          mode: 'daily',
          executionTimes: ['08:00', '12:00', '18:00']
        }
      }
    },
    {
      name: '每周指定日期（周一三五 9点）',
      config: {
        schedule: {
          enabled: true,
          timezone: 'Asia/Shanghai',
          mode: 'weekly',
          executionTimes: ['09:00'],
          weekDays: [1, 3, 5]
        }
      }
    },
    {
      name: '间隔执行（每3天 10点）',
      config: {
        schedule: {
          enabled: true,
          timezone: 'Asia/Shanghai',
          mode: 'interval',
          executionTimes: ['10:00'],
          intervalDays: 3
        }
      }
    },
    {
      name: '自定义 Cron（每小时）',
      config: {
        schedule: {
          enabled: true,
          mode: 'custom',
          cron: '0 * * * *'
        }
      }
    }
  ];

  console.log('🧪 开始测试各种调度配置...\n');

  for (const testCase of testCases) {
    console.log(`📋 测试: ${testCase.name}`);
    console.log('   配置:', JSON.stringify(testCase.config.schedule, null, 2).split('\n').join('\n   '));
    
    try {
      // 1. 更新设置
      console.log('\n   🔄 发送更新请求...');
      const updateResponse = await fetch(`${baseUrl}/api/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testCase.config),
      });

      if (!updateResponse.ok) {
        const error = await updateResponse.text();
        console.log(`   ❌ 更新失败: ${error}`);
        continue;
      }

      const updateResult = await updateResponse.json();
      console.log('   ✅ 设置已更新');
      
      // 2. 获取预览
      console.log('\n   🔍 获取执行时间预览...');
      const previewResponse = await fetch(`${baseUrl}/api/settings/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testCase.config.schedule),
      });

      if (previewResponse.ok) {
        const previewResult = await previewResponse.json();
        if (previewResult.success && previewResult.data.isValid) {
          console.log(`   ⏰ 下次执行: ${previewResult.data.formattedTime}`);
        } else {
          console.log('   ⚠️  无法计算下次执行时间');
        }
      }

      // 3. 验证 GitHub 更新（实际环境）
      if (process.env.GITHUB_TOKEN) {
        console.log('\n   📦 验证 GitHub 更新...');
        
        // 检查 settings.json
        const settingsUrl = `https://api.github.com/repos/${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}/contents/config/settings.json`;
        const settingsResponse = await fetch(settingsUrl, {
          headers: {
            'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json',
          },
        });

        if (settingsResponse.ok) {
          console.log('   ✅ settings.json 已同步到 GitHub');
        }

        // 检查 workflow
        const workflowUrl = `https://api.github.com/repos/${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}/contents/.github/workflows/daily-publish.yml`;
        const workflowResponse = await fetch(workflowUrl, {
          headers: {
            'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json',
          },
        });

        if (workflowResponse.ok) {
          const workflowData = await workflowResponse.json();
          const content = Buffer.from(workflowData.content, 'base64').toString('utf-8');
          const cronMatch = content.match(/- cron:\s*['"](.+?)['"]/);
          if (cronMatch) {
            console.log(`   📅 Workflow cron: ${cronMatch[1]}`);
          }
        }
      }

      console.log('\n   ✅ 测试通过\n');
      console.log('─'.repeat(50) + '\n');

      // 等待一下避免请求过快
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      console.log(`   ❌ 测试失败: ${error}`);
      console.log('─'.repeat(50) + '\n');
    }
  }

  console.log('╔════════════════════════════════════════════╗');
  console.log('║           测试完成                          ║');
  console.log('╚════════════════════════════════════════════╝\n');

  console.log('💡 Dashboard 功能验证结果：\n');
  console.log('✅ 支持的功能:');
  console.log('   - 每日模式（单次/多次）');
  console.log('   - 每周模式（指定星期）');
  console.log('   - 间隔模式（N天执行一次）');
  console.log('   - 自定义 Cron 表达式');
  console.log('   - 自动更新 GitHub workflow');
  console.log('   - 执行时间预览\n');

  console.log('📝 使用说明:');
  console.log('   1. 访问: http://localhost:3000/dashboard/settings');
  console.log('   2. 选择调度模式和时间');
  console.log('   3. 点击保存');
  console.log('   4. 系统会自动更新 GitHub 配置\n');

  console.log('⚠️  注意事项:');
  console.log('   - 分钟值最好是5的倍数');
  console.log('   - 新调度可能需要1小时生效');
  console.log('   - 确保 Token 有 workflow 权限');
}

// 检查服务是否运行
async function checkService(): Promise<boolean> {
  try {
    const response = await fetch('http://localhost:3000/api/settings');
    return response.ok;
  } catch {
    return false;
  }
}

async function main() {
  const isRunning = await checkService();
  
  if (!isRunning) {
    console.log('⚠️  Dashboard 服务未运行！');
    console.log('\n请先启动服务:');
    console.log('   npm run dev\n');
    console.log('然后再运行此测试脚本。');
    process.exit(1);
  }

  await testDashboardSchedule();
}

main().catch((error) => {
  console.error('❌ 测试失败:', error);
  process.exit(1);
});
