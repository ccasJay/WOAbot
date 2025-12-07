'use client';

/**
 * 调度模式选择器组件
 * Requirements: 1.1, 2.1
 */

import { ScheduleMode } from '@/types';

interface ScheduleModeSelectorProps {
  value: ScheduleMode;
  onChange: (mode: ScheduleMode) => void;
}

const MODE_OPTIONS: Array<{ value: ScheduleMode; label: string; description: string }> = [
  { value: 'daily', label: '每日执行', description: '每天在指定时间执行' },
  { value: 'interval', label: '间隔天数', description: '每隔 N 天执行一次' },
  { value: 'weekly', label: '每周指定日期', description: '每周在指定的星期几执行' },
];

export default function ScheduleModeSelector({
  value,
  onChange,
}: ScheduleModeSelectorProps): React.ReactElement {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        调度模式
      </label>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {MODE_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`relative rounded-lg border p-4 text-left transition-colors ${
              value === option.value
                ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500'
                : 'border-gray-300 bg-white hover:border-gray-400'
            }`}
          >
            <div className="font-medium text-gray-900">{option.label}</div>
            <div className="mt-1 text-sm text-gray-500">{option.description}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
