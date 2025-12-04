'use client';

/**
 * 文章预览组件
 * 
 * 以弹窗形式显示文章完整内容
 * Requirements: 7.3
 */

import { useEffect } from 'react';
import { Article } from '@/types';

interface ArticlePreviewProps {
  article: Article;
  onClose: () => void;
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

export default function ArticlePreview({
  article,
  onClose,
}: ArticlePreviewProps): JSX.Element {
  // ESC 键关闭
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // 阻止背景滚动
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* 背景遮罩 */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* 弹窗内容 */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          {/* 头部 */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{article.title}</h2>
              <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                <span>状态: {getStatusText(article.status)}</span>
                <span>生成时间: {formatDateTime(article.createdAt)}</span>
                {article.pushedAt && (
                  <span>推送时间: {formatDateTime(article.pushedAt)}</span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* 内容区域 */}
          <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-180px)]">
            {/* 摘要 */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-medium text-gray-700 mb-2">摘要</h3>
              <p className="text-gray-600">{article.digest}</p>
            </div>

            {/* 正文（HTML 渲染） */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">正文预览</h3>
              <div
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: article.htmlContent }}
              />
            </div>

            {/* 引用来源 */}
            {article.citations.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  引用来源 ({article.citations.length})
                </h3>
                <ul className="space-y-1">
                  {article.citations.map((citation, index) => (
                    <li key={index}>
                      <a
                        href={citation}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800 hover:underline break-all"
                      >
                        {citation}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 错误信息 */}
            {article.error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <h3 className="text-sm font-medium text-red-700 mb-1">错误信息</h3>
                <p className="text-sm text-red-600">{article.error}</p>
              </div>
            )}
          </div>

          {/* 底部信息 */}
          <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-3">
            <div className="flex items-center justify-between text-sm text-gray-500">
              <div className="flex items-center space-x-4">
                <span>Token 用量: {article.tokensUsed.toLocaleString()}</span>
                {article.mediaId && (
                  <span>微信 Media ID: {article.mediaId}</span>
                )}
              </div>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
