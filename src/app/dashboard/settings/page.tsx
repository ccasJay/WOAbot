'use client';

/**
 * 设置页面
 * 
 * 显示定时配置、API 密钥状态和微信凭证状态
 * Requirements: 2.2, 6.2, 8.2
 */

import { useState, useEffect, useCallback } from 'react';

interface Settings {
  schedule: {
    timezone: string;
    preferredTime: string;
  };
  content: {
    language: string;
    minLength: number;
    maxLength: number;
  };
}

export default function SettingsPage(): React.ReactElement {
  const [, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // 表单状态
  const [timezone, setTimezone] = useState('Asia/Shanghai');
  const [preferredTime, setPreferredTime] = useState('08:00');
  const [minLength, setMinLength] = useState(1500);
  const [maxLength, setMaxLength] = useState(2500);

  const fetchSettings = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/settings');
      const result = await response.json();

      if (result.success) {
        setSettings(result.data);
        setTimezone(result.data.schedule.timezone);
        setPreferredTime(result.data.schedule.preferredTime);
        setMinLength(result.data.content.minLength);
        setMaxLength(result.data.content.maxLength);
      } else {
        throw new Error(result.error || '获取设置失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取设置失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async (): Promise<void> => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schedule: { timezone, preferredTime },
          content: { minLength, maxLength },
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSettings(result.data);
        setSuccess('设置已保存');
      } else {
        throw new Error(result.error || '保存失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
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
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">系统设置</h1>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-700">{success}</p>
        </div>
      )}

      {/* 定时配置 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">定时配置</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              时区
            </label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Asia/Shanghai">Asia/Shanghai (北京时间)</option>
              <option value="Asia/Tokyo">Asia/Tokyo (东京时间)</option>
              <option value="America/New_York">America/New_York (纽约时间)</option>
              <option value="Europe/London">Europe/London (伦敦时间)</option>
              <option value="UTC">UTC</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              首选发布时间
            </label>
            <input
              type="time"
              value={preferredTime}
              onChange={(e) => setPreferredTime(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              注意：实际 cron 时间需要在 GitHub Actions workflow 文件中手动配置
            </p>
          </div>
        </div>
      </div>

      {/* 内容配置 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">内容配置</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              最小字数
            </label>
            <input
              type="number"
              value={minLength}
              onChange={(e) => setMinLength(parseInt(e.target.value) || 1500)}
              min={500}
              max={5000}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              最大字数
            </label>
            <input
              type="number"
              value={maxLength}
              onChange={(e) => setMaxLength(parseInt(e.target.value) || 2500)}
              min={500}
              max={10000}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* API 密钥状态 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">API 配置状态</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h3 className="font-medium text-gray-900">Perplexity API 密钥</h3>
              <p className="text-sm text-gray-500">在 GitHub Secrets 中配置</p>
            </div>
            <div className="flex items-center">
              <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm rounded-full">
                需在 GitHub 配置
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h3 className="font-medium text-gray-900">微信公众号凭证</h3>
              <p className="text-sm text-gray-500">AppID 和 AppSecret</p>
            </div>
            <div className="flex items-center">
              <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm rounded-full">
                需在 GitHub 配置
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h3 className="font-medium text-gray-900">GitHub Token</h3>
              <p className="text-sm text-gray-500">在 Vercel 环境变量中配置</p>
            </div>
            <div className="flex items-center">
              <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm rounded-full">
                需在 Vercel 配置
              </span>
            </div>
          </div>
        </div>
        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-700">
            <strong>配置指南：</strong>
            <br />
            1. Perplexity API 密钥：访问{' '}
            <a
              href="https://www.perplexity.ai/settings/api"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              Perplexity API 设置
            </a>
            <br />
            2. 微信公众号凭证：在微信公众平台获取 AppID 和 AppSecret
            <br />
            3. 在 GitHub 仓库 Settings → Secrets 中添加以上密钥
          </p>
        </div>
      </div>

      {/* 保存按钮 */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className={`px-6 py-2 rounded-lg font-medium transition-colors ${
            saving
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {saving ? '保存中...' : '保存设置'}
        </button>
      </div>
    </div>
  );
}
