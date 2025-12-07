/**
 * 执行时间预览 API
 * Requirements: 5.1, 5.2, 5.3
 */

import { NextRequest, NextResponse } from 'next/server';
import { ScheduleConfig } from '@/types';
import { 
  validateScheduleConfig, 
  getNextExecutionTime, 
  formatNextExecutionTime 
} from '@/lib/scheduler';
import { createGitHubClient } from '@/lib/github';

const HISTORY_FILE_PATH = 'data/history.json';

interface HistoryData {
  lastExecutionTime?: string;
}

/**
 * POST /api/settings/preview - 预览下次执行时间
 * Requirements: 5.1, 5.2, 5.3
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const schedule: ScheduleConfig = body.schedule;

    if (!schedule) {
      return NextResponse.json(
        { success: false, error: '缺少调度配置' },
        { status: 400 }
      );
    }

    // 验证配置
    const validation = validateScheduleConfig(schedule);
    if (!validation.valid) {
      return NextResponse.json({
        success: true,
        data: {
          isValid: false,
          errors: validation.errors,
          nextTime: null,
          nextTimeUtc: null,
        },
      });
    }

    // 获取上次执行时间
    let lastExecutionTime: string | undefined;
    try {
      const github = createGitHubClient();
      const history = await github.getFile<HistoryData>(HISTORY_FILE_PATH);
      lastExecutionTime = history?.lastExecutionTime;
    } catch {
      // 忽略错误，使用 undefined
    }

    // 计算下次执行时间
    const result = getNextExecutionTime(schedule, new Date(), lastExecutionTime);

    if (!result) {
      return NextResponse.json({
        success: true,
        data: {
          isValid: false,
          errors: ['无法计算下次执行时间'],
          nextTime: null,
          nextTimeUtc: null,
        },
      });
    }

    const formatted = formatNextExecutionTime(result, schedule.timezone || 'Asia/Shanghai');

    return NextResponse.json({
      success: true,
      data: {
        isValid: true,
        errors: [],
        nextTime: formatted.userTime,
        nextTimeUtc: formatted.utcTime,
        nextTimeRaw: result.nextTime.toISOString(),
        nextTimeUtcRaw: result.nextTimeUtc.toISOString(),
      },
    });
  } catch (error) {
    console.error('Error calculating preview:', error);
    return NextResponse.json(
      { success: false, error: '计算预览失败' },
      { status: 500 }
    );
  }
}
