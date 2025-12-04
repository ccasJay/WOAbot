/**
 * 主题管理页面
 * Requirements: 1.1
 */

'use client';

import { useState, useEffect } from 'react';
import { Topic } from '@/types';
import TopicList from '@/components/TopicList';
import TopicForm from '@/components/TopicForm';

export default function TopicsPage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);

  // 加载主题列表
  const loadTopics = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/topics');
      if (!response.ok) {
        throw new Error('Failed to fetch topics');
      }
      const data = await response.json();
      setTopics(data.topics || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTopics();
  }, []);

  // 添加或更新主题
  const handleSubmit = async (data: { name: string; keywords: string; enabled: boolean }) => {
    try {
      if (editingTopic) {
        // 更新主题
        const response = await fetch(`/api/topics/${editingTopic.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (!response.ok) {
          throw new Error('Failed to update topic');
        }
      } else {
        // 添加主题
        const response = await fetch('/api/topics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (!response.ok) {
          throw new Error('Failed to create topic');
        }
      }
      
      // 重新加载列表
      await loadTopics();
      setShowForm(false);
      setEditingTopic(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  // 删除主题
  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/topics/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete topic');
      }
      
      // 重新加载列表
      await loadTopics();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  // 编辑主题
  const handleEdit = (topic: Topic) => {
    setEditingTopic(topic);
    setShowForm(true);
  };

  // 取消表单
  const handleCancel = () => {
    setShowForm(false);
    setEditingTopic(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">主题管理</h1>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-md"
          >
            添加主题
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
          {error}
        </div>
      )}

      {showForm && (
        <div className="mb-6 p-6 bg-white border rounded-lg shadow-sm">
          <h2 className="text-lg font-semibold mb-4">
            {editingTopic ? '编辑主题' : '添加新主题'}
          </h2>
          <TopicForm
            topic={editingTopic}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
          />
        </div>
      )}

      <TopicList
        topics={topics}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </div>
  );
}
