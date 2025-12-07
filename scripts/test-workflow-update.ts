/**
 * 测试 Workflow Cron 更新功能
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { generateCronExpression } from '../src/lib/scheduler';
import type { ScheduleConfig } from '../src/types';

// 手动加载 .env.local
const envPath = resolve(process.cwd(), '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    process.env[match[1].trim()] = match[2].trim();
  }
});

async function testWorkflowUpdate(): Promise<void> {
  console.log('========== Workflow Cron 更新测试 ==========\n');

  // 测试不同的调度配置
  const testConfigs: Array<{ name: string; config: ScheduleConfig }> = [
    {
      name: '每日发布 (8:00 AM)',
      config: {
        mode: 'daily',
        enabled: true,
        times: ['08:00']
      }
    },
    {
      name: '多次每日发布 (8:00 AM, 12:00 PM, 6:00 PM)',
      config: {
        mode: 'daily',
        enabled: true,
        times: ['08:00', '12:00', '18:00']
      }
    },
    {
      name: '每周发布 (周一、周三、周五 9:00 AM)',
      config: {
        mode: 'weekly',
        enabled: true,
        weekdays: [1, 3, 5],
        time: '09:00'
      }
    },
    {
      name: '自定义 Cron',
      config: {
        mode: 'custom',
        enabled: true,
        cron: '*/30 8-18 * * 1-5'
      }
    }
  ];

  for (const test of testConfigs) {
    console.log(`\n测试配置: ${test.name}`);
    console.log('配置内容:', JSON.stringify(test.config, null, 2));
    
    try {
      const cronExpressions = generateCronExpression(test.config);
      console.log('生成的 Cron 表达式:');
      cronExpressions.forEach(cron => console.log(`  - ${cron}`));
      
      // 测试 workflow 文件更新逻辑
      const workflowPath = '.github/workflows/daily-publish.yml';
      const workflowContent = readFileSync(workflowPath, 'utf-8');
      
      if (cronExpressions.length > 0) {
        // 构建新的 schedule 部分
        const scheduleLines = cronExpressions.map(cron => `    - cron: '${cron}'`).join('\n');
        
        // 替换 workflow 文件中的 schedule 部分
        const scheduleBlockRegex = /schedule:\s*\n(    - cron:.*\n)+/;
        const newScheduleBlock = `schedule:\n${scheduleLines}\n`;
        
        const updatedWorkflow = workflowContent.replace(scheduleBlockRegex, newScheduleBlock);
        
        if (updatedWorkflow !== workflowContent) {
          console.log('✅ Workflow 更新模拟成功');
          
          // 显示更新后的 schedule 部分
          const scheduleMatch = updatedWorkflow.match(/schedule:[\s\S]*?(?=\n[a-z]|\n$)/);
          if (scheduleMatch) {
            console.log('更新后的 schedule 部分:');
            console.log(scheduleMatch[0]);
          }
        } else {
          console.log('⚠️ Workflow 内容无变化');
        }
      }
    } catch (error) {
      console.error(`❌ 错误: ${error instanceof Error ? error.message : error}`);
    }
  }

  console.log('\n========== 测试完成 ==========');
}

testWorkflowUpdate();
