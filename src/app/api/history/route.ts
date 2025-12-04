/**
 * 历史记录 API
 * 
 * GET /api/history - 获取历史记录列表
 * Requirements: 7.1, 7.2
 */

import { NextRequest, NextResponse } from 'next/server';
import { getHistory } from '@/lib/github';
import { Article } from '@/types';

/**
 * 历史记录查询参数
 */
interface HistoryQueryParams {
  status?: 'generated' | 'pushed' | 'failed';
  limit?: number;
  offset?: number;
}

/**
 * 解析查询参数
 */
function parseQueryParams(request: NextRequest): HistoryQueryParams {
  const searchParams = request.nextUrl.searchParams;
  
  return {
    status: searchParams.get('status') as HistoryQueryParams['status'] || undefined,
    limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : undefined,
    offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!, 10) : undefined,
  };
}

/**
 * 按状态筛选文章
 */
function filterByStatus(articles: Article[], status?: string): Article[] {
  if (!status) {
    return articles;
  }
  return articles.filter(article => article.status === status);
}

/**
 * 分页处理
 */
function paginate<T>(items: T[], limit?: number, offset?: number): T[] {
  const start = offset || 0;
  const end = limit ? start + limit : undefined;
  return items.slice(start, end);
}

/**
 * GET /api/history
 * 获取历史记录列表
 * 
 * Query Parameters:
 * - status: 按状态筛选 (generated | pushed | failed)
 * - limit: 返回数量限制
 * - offset: 偏移量
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const params = parseQueryParams(request);
    const history = await getHistory();

    // 按时间倒序排列（最新的在前）
    let articles = [...history.articles].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // 按状态筛选
    articles = filterByStatus(articles, params.status);

    // 获取总数（分页前）
    const total = articles.length;

    // 分页
    articles = paginate(articles, params.limit, params.offset);

    return NextResponse.json({
      success: true,
      data: {
        articles,
        total,
        usage: history.usage,
      },
    });
  } catch (error) {
    console.error(JSON.stringify({
      level: 'error',
      message: 'Failed to get history',
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    }));

    return NextResponse.json(
      {
        success: false,
        error: '获取历史记录失败',
      },
      { status: 500 }
    );
  }
}
