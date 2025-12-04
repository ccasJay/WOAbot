/**
 * 主题表单组件
 * Requirements: 1.1
 */

'use client';

import { useState, useEffect } from 'react';
import { Topic } from '@/types';

interface TopicFormProps {
  topic?: Topic | null;
  onSubmit: (data: { name: string; keywords: string; enabled: boolean }) => void;
  onCancel: () => void;
}

export default function TopicForm({ topic, onSubmit, onCancel }: TopicFormProps) {
  const [name, setName] = useState('');
  const [keywords, setKeywords] = useState('');
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    if (topic) {
      setName(topic.name);
      setKeywords(topic.keywords);
      setEnabled(topic.enabled);
    } else {
      setName('');
      setKeywords('');
      setEnabled(true);
    }
  }, [topic]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ name, keywords, enabled });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
          主题名称
        </label>
        <input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="例如：AI 技术动态"
        />
      </div>

      <div>
        <label htmlFor="keywords" className="block text-sm font-medium text-gray-700 mb-1">
          搜索关键词
        </label>
        <input
          type="text"
          id="keywords"
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="例如：人工智能 机器学习 深度学习"
        />
        <p className="text-xs text-gray-500 mt-1">
          多个关键词用空格分隔
        </p>
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          id="enabled"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label htmlFor="enabled" className="ml-2 block text-sm text-gray-700">
          启用此主题
        </label>
      </div>

      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
        >
          取消
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md"
        >
          {topic ? '更新' : '添加'}
        </button>
      </div>
    </form>
  );
}
