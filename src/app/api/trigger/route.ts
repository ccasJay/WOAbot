/**
 * Workflow 触发 API
 * 
 * POST /api/trigger - 触发 GitHub Actions workflow
 * Requirements: 2.3
 */

import { NextRequest, NextResponse } from 'next/server';
import { createGitHubClient } from '@/lib/github';

const WORKFLOW_FILE = 'daily-publish.yml';

/**
 * POST /api/trigger - 触发每日发布 workflow
 * Requirements: 2.3
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // 可选：从请求体获取 articleId（用于重试特定文章）
    let articleId: string | undefined;
    try {
      const body = await request.json();
      articleId = body.articleId;
    } catch {
      // 没有请求体也是允许的
    }

    const github = createGitHubClient();
    
    // 触发 workflow
    await github.triggerWorkflow(WORKFLOW_FILE);

    console.log(JSON.stringify({
      level: 'info',
      message: 'Workflow triggered successfully',
      workflow: WORKFLOW_FILE,
      articleId: articleId || 'none',
      timestamp: new Date().toISOString(),
    }));

    return NextResponse.json({
      success: true,
      message: 'Workflow 已触发',
      workflow: WORKFLOW_FILE,
    });
  } catch (error) {
    console.error(JSON.stringify({
      level: 'error',
      message: 'Failed to trigger workflow',
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    }));

    return NextResponse.json(
      {
        success: false,
        error: '触发 workflow 失败',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
