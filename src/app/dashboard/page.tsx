'use client';

/**
 * 仪表盘首页
 * 
 * 显示概览信息、用量统计、最近文章和快捷操作
 * Requirements: 2.3, 3.1.4, 3.1.5
 */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface UsageData {
  totalTokens: number;
  totalCost: number;
  lastReset: string;
  remainingDays: number;
  showWarning: boolean;
  usagePercentage: number;
}

interface Article {
  id: string;
  title: string;
  status: 'generated' | 'pushed' | 'failed';
  createdAt: string;
}

interface HistoryData {
  articles: Article[];
  total: number;
}

export default function DashboardPage(): React.ReactElement {
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [recentArticles, setRecentArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [triggerMessage, setTriggerMessage] = useState<string | null>(null);

  const fetchData = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      // 并行获取用量和历史数据
      const [usageRes, historyRes] = await Promise.all([
        fetch('/api/usage'),
        fetch('/api/history?limit=5'),
      ]);

      if (usageRes.ok) {
        const usageData = await usageRes.json();
        setUsage(usageData);
      }

      if (historyRes.ok) {
        const historyData: { success: boolean; data: HistoryData } = await historyRes.json();
        if (historyData.success) {
          setRecentArticles(historyData.data.articles);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载数据失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleTrigger = async (): Promise<void> => {
    try {
      setTriggering(true);
      setTriggerMessage(null);

      const response = await fetch('/api/trigger', { method: 'POST' });
      const result = await response.json();

      if (result.success) {
        setTriggerMessage('已触发内容生成任务，请稍后查看历史记录');
      } else {
        throw new Error(result.error || '触发失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '触发失败');
    } finally {
      setTriggering(false);
    }
  };

  const getStatusText = (status: Article['status']): string => {
    switch (status) {
      case 'generated': return '已生成';
      case 'pushed': return '已推送';
      case 'failed': return '失败';
      default: return '未知';
    }
  };

  const getStatusColor = (status: Article['status']): string => {
    switch (status) {
      case 'generated': return 'bg-yellow-100 text-yellow-800';
      case 'pushed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">概览</h1>
        <button
          onClick={handleTrigger}
          disabled={triggering}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            triggering
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {triggering ? '触发中...' : '立即生成'}
        </button>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* 触发成功提示 */}
      {triggerMessage && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-700">{triggerMessage}</p>
        </div>
      )}

      {/* 预算警告 */}
      {usage?.showWarning && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-yellow-700 font-medium">
              预算警告：已使用 {usage.usagePercentage.toFixed(1)}% 的月度预算
            </p>
          </div>
        </div>
      )}

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 用量统计 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">API 用量</h3>
          <p className="text-2xl font-bold text-gray-900">
            {usage ? usage.totalTokens.toLocaleString() : '-'} tokens
          </p>
          <p className="text-sm text-gray-500 mt-1">
            约 ${usage?.totalCost.toFixed(4) || '0.0000'}
          </p>
        </div>

        {/* 预估剩余天数 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">预估剩余天数</h3>
          <p className="text-2xl font-bold text-gray-900">
            {usage?.remainingDays ?? '-'} 天
          </p>
          <p className="text-sm text-gray-500 mt-1">
            基于当前使用速率
          </p>
        </div>

        {/* 文章总数 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">已生成文章</h3>
          <p className="text-2xl font-bold text-gray-900">
            {recentArticles.length > 0 ? recentArticles.length : '-'} 篇
          </p>
          <Link href="/dashboard/history" className="text-sm text-blue-600 hover:text-blue-800 mt-1 inline-block">
            查看全部 →
          </Link>
        </div>
      </div>

      {/* 最近文章 */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">最近文章</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {recentArticles.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">
              暂无文章，点击&ldquo;立即生成&rdquo;创建第一篇
            </div>
          ) : (
            recentArticles.map((article) => (
              <div key={article.id} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">{article.title}</h3>
                  <p className="text-sm text-gray-500">
                    {new Date(article.createdAt).toLocaleString('zh-CN')}
                  </p>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(article.status)}`}>
                  {getStatusText(article.status)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 快捷链接 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link
          href="/dashboard/topics"
          className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
        >
          <h3 className="font-semibold text-gray-900 mb-2">主题管理</h3>
          <p className="text-sm text-gray-500">配置搜索主题和关键词</p>
        </Link>
        <Link
          href="/dashboard/settings"
          className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
        >
          <h3 className="font-semibold text-gray-900 mb-2">系统设置</h3>
          <p className="text-sm text-gray-500">配置定时任务和 API 密钥</p>
        </Link>
      </div>
    </div>
  );
}
