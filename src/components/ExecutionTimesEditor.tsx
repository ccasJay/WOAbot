'use client';

/**
 * 执行时间点编辑器组件
 * Requirements: 3.1, 3.3, 3.4
 */

import { useState } from 'react';

interface ExecutionTimesEditorProps {
  times: string[];
  maxTimes?: number;
  onChange: (times: string[]) => void;
}

const MAX_TIMES_DEFAULT = 3;

export default function ExecutionTimesEditor({
  times,
  maxTimes = MAX_TIMES_DEFAULT,
  onChange,
}: ExecutionTimesEditorProps): React.ReactElement {
  const [newTime, setNewTime] = useState('08:00');
  const [error, setError] = useState<string | null>(null);

  const handleAdd = (): void => {
    setError(null);

    if (times.length >= maxTimes) {
      setError(`最多只能添加 ${maxTimes} 个时间点`);
      return;
    }

    if (times.includes(newTime)) {
      setError('该时间点已存在');
      return;
    }

    const updatedTimes = [...times, newTime].sort();
    onChange(updatedTimes);
  };

  const handleRemove = (index: number): void => {
    setError(null);
    const updatedTimes = times.filter((_, i) => i !== index);
    onChange(updatedTimes);
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">
        执行时间点
        <span className="ml-2 text-gray-400">（最多 {maxTimes} 个）</span>
      </label>

      {/* 已添加的时间点 */}
      <div className="flex flex-wrap gap-2">
        {times.map((time, index) => (
          <div
            key={time}
            className="flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-800"
          >
            <span>{time}</span>
            <button
              type="button"
              onClick={() => handleRemove(index)}
              className="text-blue-600 hover:text-blue-800"
              aria-label={`删除 ${time}`}
            >
              ×
            </button>
          </div>
        ))}
        {times.length === 0 && (
          <span className="text-sm text-gray-400">暂无时间点</span>
        )}
      </div>

      {/* 添加新时间点 */}
      {times.length < maxTimes && (
        <div className="flex items-center gap-2">
          <input
            type="time"
            value={newTime}
            onChange={(e) => setNewTime(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={handleAdd}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            添加
          </button>
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
