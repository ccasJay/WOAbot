/**
 * 用量统计 API
 * 
 * GET /api/usage - 获取累计用量和预估剩余天数
 */

import { NextResponse } from 'next/server';
import { getHistory } from '@/lib/github';
import {
  calculateRemainingDays,
  shouldShowWarning,
  getBudgetUsagePercentage,
} from '@/lib/content';

export async function GET(): Promise<NextResponse> {
  try {
    const history = await getHistory();
    const usage = history.usage;

    const remainingDays = calculateRemainingDays(usage);
    const showWarning = shouldShowWarning(usage);
    const usagePercentage = getBudgetUsagePercentage(usage);

    return NextResponse.json({
      totalTokens: usage.totalTokens,
      totalCost: usage.totalCost,
      lastReset: usage.lastReset,
      remainingDays,
      showWarning,
      usagePercentage,
    });
  } catch (error) {
    console.error('Failed to get usage stats:', error);
    return NextResponse.json(
      { error: '获取用量统计失败' },
      { status: 500 }
    );
  }
}
