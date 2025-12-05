'use client';

/**
 * 历史记录页面
 * 
 * 显示所有已生成文章的列表，支持按状态筛选和预览
 * Requirements: 7.1, 7.2, 7.3, 7.4
 */

import { useState, useEffect, useCallback } from 'react';
import HistoryList from '@/components/HistoryList';
import ArticlePreview from '@/components/ArticlePreview';
import { Article } from '@/types';

interface HistoryData {
  articles: Article[];
  total: number;
  usage: {
    totalTokens: number;
    totalCost: number;
    lastReset: string;
  };
}

type StatusFilter = 'all' | 'generated' | 'pushed' | 'failed';

export default function HistoryPage(): React.ReactElement {
  const [data, setData] = useState<HistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [retrying, setRetrying] = useState<string | null>(null);

  const fetchHistory = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (statusFilter !== 'all') {
        params.set('status', statusFilter);
      }

      const response = await fetch(`/api/history?${params.toString()}`);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || '获取历史记录失败');
      }

      setData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取历史记录失败');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleRetry = async (articleId: string): Promise<void> => {
    try {
      setRetrying(articleId);
      
      // 触发 workflow 重新推送
      const response = await fetch('/api/trigger', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ articleId }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || '触发重试失败');
      }

      // 刷新列表
      await fetchHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : '重试失败');
    } finally {
      setRetrying(null);
    }
  };

  const handlePreview = (article: Article): void => {
    setSelectedArticle(article);
  };

  const handleClosePreview = (): void => {
    setSelectedArticle(null);
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">推送历史</h1>
        <p className="mt-1 text-sm text-gray-500">
          查看所有已生成文章的状态和内容
        </p>
      </div>

      {/* 状态筛选 */}
      <div className="mb-6">
        <div className="flex space-x-2">
          {(['all', 'generated', 'pushed', 'failed'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {status === 'all' && '全部'}
              {status === 'generated' && '已生成'}
              {status === 'pushed' && '已推送'}
              {status === 'failed' && '失败'}
            </button>
          ))}
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700">{error}</p>
          <button
            onClick={fetchHistory}
            className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
          >
            重试
          </button>
        </div>
      )}

      {/* 加载状态 */}
      {loading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* 历史列表 */}
      {!loading && data && (
        <>
          <div className="mb-4 text-sm text-gray-500">
            共 {data.total} 条记录
          </div>
          <HistoryList
            articles={data.articles}
            onPreview={handlePreview}
            onRetry={handleRetry}
            retrying={retrying}
          />
        </>
      )}

      {/* 文章预览弹窗 */}
      {selectedArticle && (
        <ArticlePreview
          article={selectedArticle}
          onClose={handleClosePreview}
        />
      )}
    </div>
  );
}
