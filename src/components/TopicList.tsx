/**
 * 主题列表组件
 * Requirements: 1.1
 */

'use client';

import { Topic } from '@/types';

interface TopicListProps {
  topics: Topic[];
  onEdit: (topic: Topic) => void;
  onDelete: (id: string) => void;
}

export default function TopicList({ topics, onEdit, onDelete }: TopicListProps) {
  if (topics.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        暂无主题，点击&ldquo;添加主题&rdquo;创建第一个主题
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {topics.map((topic) => (
        <div
          key={topic.id}
          className="border rounded-lg p-4 hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold">{topic.name}</h3>
                <span
                  className={`px-2 py-1 text-xs rounded ${
                    topic.enabled
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {topic.enabled ? '已启用' : '已禁用'}
                </span>
              </div>
              <p className="text-gray-600 mt-1">关键词: {topic.keywords}</p>
              <p className="text-xs text-gray-400 mt-2">
                创建于: {new Date(topic.createdAt).toLocaleString('zh-CN')}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onEdit(topic)}
                className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded"
              >
                编辑
              </button>
              <button
                onClick={() => {
                  if (confirm(`确定要删除主题"${topic.name}"吗？`)) {
                    onDelete(topic.id);
                  }
                }}
                className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
