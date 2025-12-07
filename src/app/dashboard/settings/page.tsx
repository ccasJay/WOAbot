'use client';

/**
 * 设置页面
 * 
 * 显示定时配置、API 密钥状态和微信凭证状态
 * Requirements: 1.1, 2.1, 3.1, 6.2, 8.2
 */

import { useState, useEffect, useCallback } from 'react';
import { ScheduleMode, ScheduleConfig } from '@/types';
import ScheduleModeSelector from '@/components/ScheduleModeSelector';
import ExecutionTimesEditor from '@/components/ExecutionTimesEditor';
import WeekDaySelector from '@/components/WeekDaySelector';
import NextExecutionPreview from '@/components/NextExecutionPreview';

interface Settings {
  schedule: ScheduleConfig;
  content: {
    language: string;
    minLength: number;
    maxLength: number;
  };
}

const TIMEZONE_OPTIONS = [
  { value: 'Asia/Shanghai', label: 'Asia/Shanghai (北京时间)' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo (东京时间)' },
  { value: 'America/New_York', label: 'America/New_York (纽约时间)' },
  { value: 'Europe/London', label: 'Europe/London (伦敦时间)' },
  { value: 'UTC', label: 'UTC' },
];

export default function SettingsPage(): React.ReactElement {
  const [, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // 调度配置状态
  const [timezone, setTimezone] = useState('Asia/Shanghai');
  const [mode, setMode] = useState<ScheduleMode>('daily');
  const [executionTimes, setExecutionTimes] = useState<string[]>(['08:00']);
  const [intervalDays, setIntervalDays] = useState(1);
  const [weekDays, setWeekDays] = useState<number[]>([1, 3, 5]);

  // 内容配置状态
  const [minLength, setMinLength] = useState(1500);
  const [maxLength, setMaxLength] = useState(2500);

  // 构建当前调度配置
  const currentSchedule: ScheduleConfig = {
    enabled: true,
    timezone,
    mode,
    executionTimes,
    ...(mode === 'interval' && { intervalDays }),
    ...(mode === 'weekly' && { weekDays }),
  };

  const fetchSettings = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/settings');
      const result = await response.json();

      if (result.success) {
        const data = result.data as Settings;
        setSettings(data);
        setTimezone(data.schedule.timezone || 'Asia/Shanghai');
        setMode(data.schedule.mode || 'daily');
        setExecutionTimes(data.schedule.executionTimes || ['08:00']);
        setIntervalDays(data.schedule.intervalDays || 1);
        setWeekDays(data.schedule.weekDays || [1, 3, 5]);
        setMinLength(data.content.minLength);
        setMaxLength(data.content.maxLength);
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
          schedule: currentSchedule,
          content: { minLength, maxLength },
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSettings(result.data);
        setSuccess('设置已保存');
      } else {
        const errorMsg = result.errors?.join(', ') || result.error || '保存失败';
        throw new Error(errorMsg);
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
      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        <h2 className="text-lg font-semibold text-gray-900">定时配置</h2>
        
        {/* 时区选择 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            时区
          </label>
          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {TIMEZONE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* 调度模式选择 */}
        <ScheduleModeSelector value={mode} onChange={setMode} />

        {/* 间隔天数（仅 interval 模式） */}
        {mode === 'interval' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              间隔天数
              <span className="ml-2 text-gray-400">（1-30 天）</span>
            </label>
            <input
              type="number"
              value={intervalDays}
              onChange={(e) => setIntervalDays(Math.max(1, Math.min(30, parseInt(e.target.value) || 1)))}
              min={1}
              max={30}
              className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        {/* 周执行日选择（仅 weekly 模式） */}
        {mode === 'weekly' && (
          <WeekDaySelector selectedDays={weekDays} onChange={setWeekDays} />
        )}

        {/* 执行时间点 */}
        <ExecutionTimesEditor
          times={executionTimes}
          onChange={setExecutionTimes}
        />

        {/* 下次执行预览 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            执行预览
          </label>
          <NextExecutionPreview schedule={currentSchedule} />
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
            <a
              href="/api/config/github-secrets-url"
              onClick={async (e) => {
                e.preventDefault();
                const res = await fetch('/api/config/github-secrets-url');
                const data = await res.json();
                if (data.url) window.open(data.url, '_blank');
              }}
              className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm rounded-full hover:bg-yellow-200 transition-colors cursor-pointer"
            >
              需在 GitHub 配置 →
            </a>
          </div>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h3 className="font-medium text-gray-900">微信公众号凭证</h3>
              <p className="text-sm text-gray-500">AppID 和 AppSecret</p>
            </div>
            <a
              href="/api/config/github-secrets-url"
              onClick={async (e) => {
                e.preventDefault();
                const res = await fetch('/api/config/github-secrets-url');
                const data = await res.json();
                if (data.url) window.open(data.url, '_blank');
              }}
              className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm rounded-full hover:bg-yellow-200 transition-colors cursor-pointer"
            >
              需在 GitHub 配置 →
            </a>
          </div>
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
