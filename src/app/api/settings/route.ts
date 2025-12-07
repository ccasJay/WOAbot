/**
 * 设置管理 API - GET 和 PUT
 * Requirements: 1.2, 2.2, 3.2
 */

import { NextRequest, NextResponse } from 'next/server';
import { createGitHubClient, getDefaultSettings } from '@/lib/github';
import { Settings, ScheduleConfig } from '@/types';
import { validateScheduleConfig, generateCronExpression } from '@/lib/scheduler';

const SETTINGS_FILE_PATH = 'config/settings.json';

/**
 * GET /api/settings - 获取系统设置
 * Requirements: 1.2, 2.2, 3.2
 */
export async function GET(): Promise<NextResponse> {
  try {
    const github = createGitHubClient();
    
    // 从 GitHub 读取设置
    let settings = await github.getFile<Settings>(SETTINGS_FILE_PATH);
    
    // 如果文件不存在，返回默认设置
    if (!settings) {
      settings = getDefaultSettings();
    }

    return NextResponse.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { success: false, error: '获取设置失败' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/settings - 更新系统设置
 * Requirements: 1.2, 2.2, 3.2
 */
export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { schedule, content } = body;

    const github = createGitHubClient();
    
    // 读取现有设置
    let settings = await github.getFile<Settings>(SETTINGS_FILE_PATH);
    if (!settings) {
      settings = getDefaultSettings();
    }

    // 构建新的调度配置
    const newSchedule: ScheduleConfig = {
      enabled: schedule?.enabled ?? settings.schedule.enabled,
      timezone: schedule?.timezone ?? settings.schedule.timezone,
      mode: schedule?.mode ?? settings.schedule.mode,
      executionTimes: schedule?.executionTimes ?? settings.schedule.executionTimes,
      ...(schedule?.intervalDays !== undefined && { intervalDays: schedule.intervalDays }),
      ...(schedule?.weekDays !== undefined && { weekDays: schedule.weekDays }),
    };

    // 验证调度配置
    const validation = validateScheduleConfig(newSchedule);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: '配置验证失败', errors: validation.errors },
        { status: 400 }
      );
    }

    // 更新设置
    const updatedSettings: Settings = {
      schedule: newSchedule,
      content: {
        ...settings.content,
        ...(content && {
          ...(content.language !== undefined && { language: content.language }),
          ...(content.minLength !== undefined && { minLength: content.minLength }),
          ...(content.maxLength !== undefined && { maxLength: content.maxLength }),
        }),
      },
    };

    // 保存到 GitHub
    await github.updateFile(
      SETTINGS_FILE_PATH,
      updatedSettings,
      'chore: update settings'
    );

    // 更新 GitHub Actions workflow 的 cron 表达式
    try {
      const workflowPath = '.github/workflows/daily-publish.yml';
      const workflowContent = await github.getTextFile(workflowPath);
      
      if (workflowContent) {
        // 生成新的 cron 表达式
        const cronExpressions = generateCronExpression(newSchedule);
        
        if (cronExpressions.length > 0) {
          // 构建新的 schedule 部分
          const scheduleLines = cronExpressions.map(cron => `    - cron: '${cron}'`).join('\n');
          
          // 替换 workflow 文件中的 schedule 部分
          // 使用正则表达式匹配整个 schedule 块
          const scheduleBlockRegex = /schedule:\s*\n(    - cron:.*\n)+/;
          const newScheduleBlock = `schedule:\n${scheduleLines}\n`;
          
          const updatedWorkflow = workflowContent.replace(scheduleBlockRegex, newScheduleBlock);
          
          // 如果 workflow 内容有变化，更新文件
          if (updatedWorkflow !== workflowContent) {
            await github.updateTextFile(
              workflowPath,
              updatedWorkflow,
              `chore: update workflow cron schedule from dashboard settings`
            );
            console.log('Workflow cron schedule updated successfully');
          }
        }
      }
    } catch (error) {
      // 记录错误但不影响设置保存
      console.error('Failed to update workflow cron schedule:', error);
      // 可以选择返回一个警告信息给用户
    }

    return NextResponse.json({
      success: true,
      data: updatedSettings,
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { success: false, error: '更新设置失败' },
      { status: 500 }
    );
  }
}
