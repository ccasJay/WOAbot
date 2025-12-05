'use client';

/**
 * 历史记录列表组件
 * 
 * 显示文章列表，包含标题、时间、状态和操作按钮
 * Requirements: 7.1, 7.2, 7.4
 */

import { Article } from '@/types';

interface HistoryListProps {
  articles: Article[];
  onPreview: (article: Article) => void;
  onRetry: (articleId: string) => void;
  retrying: string | null;
}

/**
 * 格式化日期时间
 */
function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * 获取状态标签样式
 */
function getStatusStyle(status: Article['status']): string {
  switch (status) {
    case 'generated':
      return 'bg-yellow-100 text-yellow-800';
    case 'pushed':
      return 'bg-green-100 text-green-800';
    case 'failed':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

/**
 * 获取状态文本
 */
function getStatusText(status: Article['status']): string {
  switch (status) {
    case 'generated':
      return '已生成';
    case 'pushed':
      return '已推送';
    case 'failed':
      return '失败';
    default:
      return '未知';
  }
}

export default function HistoryList({
  articles,
  onPreview,
  onRetry,
  retrying,
}: HistoryListProps): React.ReactElement {
  if (articles.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <p className="text-gray-500">暂无历史记录</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {articles.map((article) => (
        <div
          key={article.id}
          className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              {/* 标题 */}
              <h3 className="text-lg font-medium text-gray-900 truncate">
                {article.title}
              </h3>
              
              {/* 元信息 */}
              <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                <span>生成时间: {formatDateTime(article.createdAt)}</span>
                {article.pushedAt && (
                  <span>推送时间: {formatDateTime(article.pushedAt)}</span>
                )}
                <span>Token: {article.tokensUsed.toLocaleString()}</span>
              </div>

              {/* 错误信息 */}
              {article.error && (
                <p className="mt-2 text-sm text-red-600">
                  错误: {article.error}
                </p>
              )}
            </div>

            {/* 状态和操作 */}
            <div className="flex items-center space-x-3 ml-4">
              {/* 状态标签 */}
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusStyle(
                  article.status
                )}`}
              >
                {getStatusText(article.status)}
              </span>

              {/* 预览按钮 */}
              <button
                onClick={() => onPreview(article)}
                className="px-3 py-1.5 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
              >
                预览
              </button>

              {/* 重试按钮（仅失败状态显示） */}
              {article.status === 'failed' && (
                <button
                  onClick={() => onRetry(article.id)}
                  disabled={retrying === article.id}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                    retrying === article.id
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-red-50 text-red-600 hover:bg-red-100'
                  }`}
                >
                  {retrying === article.id ? '重试中...' : '重试'}
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
