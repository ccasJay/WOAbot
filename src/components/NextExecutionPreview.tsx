'use client';

/**
 * 下次执行预览组件
 * Requirements: 5.1, 5.2, 5.3
 */

import { useEffect, useState } from 'react';
import { ScheduleConfig } from '@/types';

interface NextExecutionPreviewProps {
  schedule: ScheduleConfig;
}

interface PreviewData {
  isValid: boolean;
  errors: string[];
  nextTime: string | null;
  nextTimeUtc: string | null;
}

export default function NextExecutionPreview({
  schedule,
}: NextExecutionPreviewProps): React.ReactElement {
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchPreview = async (): Promise<void> => {
      setLoading(true);
      try {
        const response = await fetch('/api/settings/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ schedule }),
        });
        const result = await response.json();
        if (result.success) {
          setPreview(result.data);
        } else {
          setPreview({
            isValid: false,
            errors: [result.error || '获取预览失败'],
            nextTime: null,
            nextTimeUtc: null,
          });
        }
      } catch {
        setPreview({
          isValid: false,
          errors: ['网络错误'],
          nextTime: null,
          nextTimeUtc: null,
        });
      } finally {
        setLoading(false);
      }
    };

    // 防抖：延迟 500ms 后请求
    const timer = setTimeout(fetchPreview, 500);
    return () => clearTimeout(timer);
  }, [schedule]);

  if (loading) {
    return (
      <div className="rounded-lg bg-gray-50 p-4">
        <div className="flex items-center gap-2 text-gray-500">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"></div>
          <span>计算中...</span>
        </div>
      </div>
    );
  }

  if (!preview) {
    return (
      <div className="rounded-lg bg-gray-50 p-4">
        <span className="text-gray-500">等待配置...</span>
      </div>
    );
  }

  if (!preview.isValid) {
    return (
      <div className="rounded-lg bg-red-50 p-4">
        <div className="font-medium text-red-800">无法计算下次执行时间</div>
        {preview.errors.length > 0 && (
          <ul className="mt-2 list-inside list-disc text-sm text-red-600">
            {preview.errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-green-50 p-4">
      <div className="font-medium text-green-800">下次执行时间</div>
      <div className="mt-2 space-y-1 text-sm">
        <div className="text-green-700">
          <span className="font-medium">本地时间：</span>
          {preview.nextTime}
        </div>
        <div className="text-green-600">
          <span className="font-medium">UTC 时间：</span>
          {preview.nextTimeUtc}
        </div>
      </div>
    </div>
  );
}
