/**
 * 设置管理 API - GET 和 PUT
 * Requirements: 2.2
 */

import { NextRequest, NextResponse } from 'next/server';
import { createGitHubClient, getDefaultSettings } from '@/lib/github';
import { Settings } from '@/types';

const SETTINGS_FILE_PATH = 'config/settings.json';

/**
 * GET /api/settings - 获取系统设置
 * Requirements: 2.2
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
 * Requirements: 2.2
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

    // 更新设置
    const updatedSettings: Settings = {
      schedule: {
        ...settings.schedule,
        ...(schedule && {
          ...(schedule.timezone !== undefined && { timezone: schedule.timezone }),
          ...(schedule.preferredTime !== undefined && { preferredTime: schedule.preferredTime }),
        }),
      },
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
