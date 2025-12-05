'use client';

/**
 * 顶部导航栏组件
 * Requirements: 11.1
 */

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function Header(): React.ReactElement {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async (): Promise<void> => {
    try {
      setLoggingOut(true);
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-500">
            {new Date().toLocaleDateString('zh-CN', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              weekday: 'long',
            })}
          </span>
        </div>

        <div className="flex items-center space-x-4">
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className={`px-4 py-2 text-sm rounded-lg transition-colors ${
              loggingOut
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            {loggingOut ? '退出中...' : '退出登录'}
          </button>
        </div>
      </div>
    </header>
  );
}
